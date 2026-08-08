/* 클럽 전력 — 팀 성적에만 작용하고 개인 수상에는 절대 안 닿는지 본다.
 *
 * 이적에는 축이 둘이다. 리그 티어(Task 1)는 경기 평점을 깎고 수상 가치를 키운다 —
 * 개인 커리어의 축이다. 클럽 전력(이 파일)은 동료 득점과 실점에만 작용한다 —
 * 팀 성적의 축이다. 같은 리그 안에서 전력 좋은 팀으로 가면 팀은 더 이기지만
 * 내 수상 확률은 그대로여야 한다. 두 축이 겹치면 "같은 리그 이적"과
 * "상위 리그 이적"이 같은 질문이 되어 선택이 사라진다.
 *
 * ⑥⑦이 그 분리를 증명하는 검사다. 절대 느슨하게 만들지 않는다.
 *
 * 산식은 전부 소스에서 정규식으로 뽑는다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
 * 직접 eval(`const x = …`)은 쓰지 않는다. 선언이 eval 자기 스코프에 갇혀서 바깥으로
 * 새지 않고, 산식을 뭘로 바꾸든 undefined가 나와 테스트가 통과해버린다.
 * 그래서 new Function으로 감싸 return 한다.
 *
 * CLUBS·clubStrOf는 game.js에 둔다. career.js는 IIFE라 그 안의 선언이 밖으로 안 새는데,
 * teammateGoals·deriveOppGoals가 game.js에 있어서 전력을 거기서 읽어야 하기 때문이다. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const grab = (src, re) => { const mm = src.match(re); return mm ? mm[0] : null; };

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
// 아직 없는 이름을 쓰는 검사는 던지면서 죽는다. 그 자체가 실패지, 테스트 중단은 아니다.
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

const parts = {
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  poissonish: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  /* 🎖️ 시즌 칭호 — matchContribution·ratingOf·autoRes가 buffMul/buffSum을 봐요.
   * 같이 안 떼어 오면 ReferenceError로 죽습니다(조용히 통과하지는 않아요).
   * 이 검사들은 칭호가 없는 상태(S.buffs 없음)를 보니 배수는 전부 1이 나와요 —
   * 칭호가 붙었을 때의 동작은 tests/soccer/buff-test.js가 봅니다. */
  /* 🔥 승부처 성공이 무엇으로 남는지는 포지션이 정해요(극장골/도움/차단).
   * info 블록이 momentKind()를 부르니 같이 떼어 와야 굴러가요. */
  momentKind: grab(GAME, /const MOMENT_KIND = \{[^}]*\};\nconst momentKind = [^;]+;/),
  goalScale: grab(GAME, /const GOAL_SCALE = [^;]+;/),
  buffFns: grab(GAME, /const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/),
  matchContribution: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  deriveOppGoals: grab(GAME, /const CONC_BASE = [\s\S]*?function deriveOppGoals\(rating, defStat, oppStr, teamGoals\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  teammateGoalsTable: grab(GAME, /const TEAMMATE_GOALS = \{[^}]*\};/),
  teammateGoals: grab(GAME, /const MATE_SCALE = [\s\S]*?function teammateGoals\(rating, oppStr\) \{[\s\S]*?\n\}/),
  // MatchSim.run — cfg 구조 분해 · 이벤트(evs) 생성부 · 결과 res · info 블록
  cfgPick: grab(GAME, /const \{ home, away[^;]*\} = cfg;/),
  evsBlock: grab(GAME, /const evs = \[\];[\s\S]*?evs\.sort\([^;]*\);/),
  resLine: grab(GAME, /const res = h > a \? [^;]+;/),
  /* info 블록은 mateGoals를 보는데, 이 파일은 evsBlock을 함께 넣어서 거기서 선언돼요. */
  infoBlock: grab(GAME, /const info = \{[\s\S]*?\n {6}\};/),
  fanCap: grab(SRC, /const FAN_CAP = [^;]+;/),
  ratingDiv: grab(SRC, /const RATING_DIV = [^;]+;/),
  ratingOf: grab(SRC, /function ratingOf\(stats, pos, condition, fandom\) \{[\s\S]*?\n {2}\}/),
  posAxisTable: grab(SRC, /const POS_AXIS = \{[\s\S]*?\n {2}\};/),
  axisK: grab(SRC, /const AXIS_K = [^;]+;/),
  axisOff: grab(SRC, /const AXIS_OFF = [^;]+;/),
  posAxis: grab(SRC, /function posAxis\(act, pos\) \{[\s\S]*?\n {2}\}/),
  cbPerYear: grab(SRC, /const CB_PER_YEAR = [^;]+;/),
  weeksPerCb: grab(SRC, /const WEEKS_PER_CB = [^;]+;/),
  /* agePen은 노쇠 시작 시즌(DECLINE_FROM)을 읽어요 — 상수까지 같이 떼어 와야 굴러가요.
   * 따로 안 떼면 ReferenceError로 죽습니다(조용히 통과하지는 않아요). */
  ageConst: grab(SRC, /const DECLINE_FROM = [^;]+;/),
  agePen: grab(SRC, /const agePen = [^;]+;/),
  hype: grab(SRC, /const hype = clamp\([^;]+;/),
  // 수상 판정 — 신인왕 · 리그MVP · 베스트11 세 블록을 통째로 떼어 와요
  awards: grab(SRC, /const awards = \[\];[\s\S]*?"베스트11"[^\n]*\n {4}\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

/* 리그·클럽은 '있으면 넣는다'. 아직 없는 이름을 필수로 걸면 고치기 전에는 테스트가
 * 아예 못 돌아 빨간불의 내용을 볼 수 없다. 없으면 그 이름을 쓰는 검사가
 * ReferenceError로 떨어지고, 그게 우리가 보고 싶은 빨간불이다.
 * 값은 절대 여기 옮겨 적지 않는다 — 소스에 적힌 그대로 실행한다. */
const leagueSrc = [
  grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  // barOf — 수상 판정이 리그의 경쟁 강도(bar)를 이걸로 읽어요
  grab(GAME, /function barOf\(st\) \{[\s\S]*?\n\}/),
].filter(Boolean).join("\n");
const clubParts = {
  CLUBS: grab(GAME, /const CLUBS = \{[\s\S]*?\n\};/),
  clubStrOf: grab(GAME, /function clubStrOf\(st\) \{[\s\S]*?\n\}/),
};
const clubSrc = Object.values(clubParts).filter(Boolean).join("\n");
const clubMissing = Object.entries(clubParts).filter(([, v]) => !v).map(([k]) => k);
const axisSrc = [parts.posAxisTable, parts.axisK, parts.axisOff, parts.posAxis].join("\n");
const mateSrc = [parts.teammateGoalsTable, parts.teammateGoals].join("\n");

/* 리그는 소스에서 뽑아 tier 순으로 훑어요. [1, 2, 3]처럼 id를 박아 두면 하부 리그가
 * 생겨도 검사가 그걸 못 봐요 — 실제로 K리그3·K리그2가 들어온 뒤에도 이 파일은
 * 위쪽 세 리그만 재고 있었어요. id는 옛 세이브가 가리키는 값이라 순서와 무관해요. */
const rawLeagues = grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/);
const ALL_LEAGUES = rawLeagues ? new Function(`${rawLeagues} return LEAGUES;`)() : [];
const BY_TIER = ALL_LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const LEAGUE_IDS = BY_TIER.map((l) => l.id);
const nameOf = (id) => (ALL_LEAGUES.find((l) => l.id === id) || {}).name || `id ${id}`;
const POS = ["fw", "wg", "mf", "df"];
const POS_NAME = { fw: "공격수", wg: "윙어", mf: "미드필더", df: "수비수" };

// ① 클럽 표가 game.js에 있고, 리그마다 6개 이상이며 이름과 전력을 갖는다
check(clubMissing.length === 0,
  clubMissing.length
    ? `${clubMissing.join(" · ")} is not defined — game.js에 클럽 표가 없어요`
    : "CLUBS · clubStrOf가 game.js에 있다");

const table = clubParts.CLUBS ? new Function(`${clubParts.CLUBS} return CLUBS;`)() : null;
const clubStrFn = clubSrc && clubParts.clubStrOf
  ? new Function("st", "clamp", `${clubSrc} return clubStrOf(st);`)
  : null;

guard("클럽 표", () => {
  check(BY_TIER.length >= 5, `리그가 5단 이상이다 (${BY_TIER.map((l) => l.name).join(" < ")})`);
  check(LEAGUE_IDS.every((id) => Array.isArray(table[id]) && table[id].length >= 6),
    `CLUBS에 리그 전부가 있고 각각 6개 이상이다 (${LEAGUE_IDS.map((id) => `${nameOf(id)} ${(table[id] || []).length}개`).join(" · ")})`);
  const all = LEAGUE_IDS.flatMap((id) => table[id] || []);
  check(all.every((c) => c && typeof c.name === "string" && c.name.length > 0),
    `모든 클럽에 name이 있다 (${all.length}개)`);
  const bad = all.filter((c) => !(typeof c.str === "number" && c.str >= 40 && c.str <= 95));
  check(bad.length === 0,
    `모든 클럽의 str이 40~95다 (벗어난 클럽 ${bad.length}개${bad.length ? `: ${bad.map((c) => `${c.name} ${c.str}`).join(", ")}` : ""})`);
});

// ② tier가 높을수록 평균 전력이 높다 — 위로 갈수록 강팀이어야 이적이 사다리가 돼요
guard("리그별 평균 전력", () => {
  const avg = LEAGUE_IDS.map((id) => {
    const l = table[id] || [];
    return l.reduce((a, c) => a + c.str, 0) / l.length;
  });
  const rising = avg.every((v, i) => i === 0 || avg[i - 1] < v);
  check(rising,
    `평균 전력이 tier 순으로 올라간다 (${avg.map((v, i) => `${nameOf(LEAGUE_IDS[i])} ${v.toFixed(1)}`).join(" < ")})`);
});

// ③ 옛 세이브 방어 — S.clubStr이 없으면 70이다 (마이그레이션을 하지 않아요)
guard("기본 전력", () => {
  check(clubStrFn({}, clamp) === 70, `clubStrOf({})가 70이다 (${clubStrFn({}, clamp)})`);
  check(clubStrFn(undefined, clamp) === 70, `clubStrOf(undefined)가 70이다 (${clubStrFn(undefined, clamp)})`);
});

/* 동료 득점 · 실점 — 전력이 실제로 작용하는 두 곳이에요.
 * 전역 S를 읽는 산식이라 new Function이 S를 파라미터로 받고 떼어 온 선언들이
 * 그 S를 클로저로 잡게 감쌌어요. */
const mateFn = new Function("S", "rating", "clamp", "oppStr", `
  ${parts.momentKind}
  ${parts.goalScale}
  ${parts.poissonish}
  ${leagueSrc}
  ${clubSrc}
  ${mateSrc}
  return teammateGoals(rating, oppStr);
`);
/* 실점은 이제 **상대 전력**과 **우리 팀 골**을 함께 봐요. 우리 팀 골을 안 넘기면
 * 늘 0으로 읽혀서 전력 차만 남습니다 — 여기서는 전력의 작용을 보는 게 목적이라
 * 팀 골을 고정값으로 두고 전력만 움직입니다. */
const oppFn = new Function("S", "rating", "defStat", "clamp", "rand", "oppStr", "teamGoals", `
  ${parts.momentKind}
  ${parts.goalScale}
  ${parts.poissonish}
  ${leagueSrc}
  ${clubSrc}
  ${parts.deriveOppGoals}
  return deriveOppGoals(rating, defStat, oppStr, teamGoals == null ? 3 : teamGoals);
`);

function stateOf(pos, stat, over = {}) {
  const stats = { shoot: stat, pass: stat, dribble: stat, defense: stat, stamina: stat };
  const talents = { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 };
  return { name: "나", pos, stats, talents, trans: {}, condition: 80, fandom: 900, proYear: 5, ...over };
}

const N_MATCH = 5000;
const mean = (n, fn) => { let s = 0; for (let i = 0; i < n; i++) s += fn(i); return s / n; };

// ④ 전력이 동료 득점에 작용한다 — 좋은 팀은 동료가 더 넣어요
guard("동료 득점", () => {
  /* ⚠️ 상대 전력을 **고정**해야 우리 전력의 작용이 보여요. 안 넘기면 "대등한 경기"로
   * 읽혀서(상대 = 우리 전력) 전력을 뭘로 바꿔도 결과가 같습니다. */
  const m = (str) => mean(N_MATCH, () => mateFn(stateOf("mf", 90, { clubStr: str }), 7, clamp, 70));
  const lo = m(50), hi = m(90);
  console.log(`=== ④ 미드필더 동료 골 평균 (${N_MATCH}경기) ===`);
  console.log(`  전력 50 ${lo.toFixed(3)} · 전력 90 ${hi.toFixed(3)}`);
  check(hi > lo * 1.15, `전력 90 팀이 전력 50 팀보다 동료 골이 많다 (${lo.toFixed(3)} → ${hi.toFixed(3)})`);
});

// ⑤ 전력이 실점에 작용한다 — 좋은 팀은 덜 먹어요
guard("실점", () => {
  const m = (str) => mean(N_MATCH, () => oppFn(stateOf("mf", 90, { clubStr: str }), 7, 70, clamp, rand, 70, 3));
  const lo = m(50), hi = m(90);
  console.log(`=== ⑤ 실점 평균 (평점 7 · 수비 70, ${N_MATCH}경기) ===`);
  console.log(`  전력 50 ${lo.toFixed(3)} · 전력 90 ${hi.toFixed(3)}`);
  check(hi < lo - 0.15, `전력 90 팀이 전력 50 팀보다 실점이 적다 (${lo.toFixed(3)} → ${hi.toFixed(3)})`);
});

/* ⑥ 전력은 내 골·도움·수비에 안 닿는다 — 이 태스크의 핵심 검사예요.
 *
 * 두 갈래로 봐요.
 * (a) 씨앗 고정 난수를 두 전력에 똑같은 순서로 먹여서 한 톨까지 같은지 봐요.
 *     Math를 파라미터로 받아 global Math를 가리고 random만 갈아끼웠어요.
 *     poissonish가 Math.exp도 쓰니 Object.create(Math)로 나머지는 그대로 물려받아요.
 * (b) 평균을 ±3%로 대조해요 — 사람이 읽을 수 있는 눈금이에요. */
const contribFn = new Function("S", "clamp", "Math", `
  ${parts.momentKind}
  ${parts.goalScale}
  ${parts.buffFns}
  ${parts.poissonish}
  ${leagueSrc}
  ${clubSrc}
  ${parts.matchContribution}
  return matchContribution(7);
`);

guard("전력이 내 기록에 안 닿는다", () => {
  let seed = 0;
  const seeded = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const M = Object.create(Math);
  M.random = seeded;

  let bad = 0;
  const N_SEED = 5000;
  for (const pos of POS) {
    const lo = stateOf(pos, 90, { clubStr: 50 }), hi = stateOf(pos, 90, { clubStr: 90 });
    for (let i = 0; i < N_SEED; i++) {
      seed = i + 1; const a = contribFn(lo, clamp, M);
      seed = i + 1; const b = contribFn(hi, clamp, M);
      if (a.g !== b.g || a.a !== b.a || a.def !== b.def) bad++;
    }
  }
  check(bad === 0,
    `전력 50과 90의 matchContribution이 한 톨까지 같다 (${POS.length}포지션 × ${N_SEED}회, 어긋난 경기 ${bad}건)`);

  const N_C = 20000;
  const avg = (pos, str) => {
    const S = stateOf(pos, 90, { clubStr: str });
    let g = 0, a = 0, d = 0;
    for (let i = 0; i < N_C; i++) { const c = contribFn(S, clamp, Math); g += c.g; a += c.a; d += c.def; }
    return { g: g / N_C, a: a / N_C, def: d / N_C, all: (g + a + d) / N_C };
  };
  console.log(`=== ⑥ 능력치 90 · 평점 7의 내 기록 (${N_C}경기) ===`);
  console.log("  포지션 |    전력 50 (⚽ · 🅰️ · 🛡️) |    전력 90 (⚽ · 🅰️ · 🛡️) |   합계 차이");
  let gapBad = 0;
  for (const pos of POS) {
    const lo = avg(pos, 50), hi = avg(pos, 90);
    const gap = Math.abs(hi.all - lo.all) / lo.all;
    if (gap > 0.03) gapBad++;
    const fmt = (v) => `${v.g.toFixed(3)} · ${v.a.toFixed(3)} · ${v.def.toFixed(3)}`;
    console.log(`  ${POS_NAME[pos].padStart(5)} | ${fmt(lo).padStart(23)} | ${fmt(hi).padStart(23)} | ${(gap * 100).toFixed(2)}%`);
  }
  check(gapBad === 0, `네 포지션 모두 전력 50과 90의 공격포인트+수비 합계가 ±3% 안이다 (벗어난 포지션 ${gapBad}개)`);
});

/* 한 시즌 — 평점(career.js) → 경기 기여(game.js) → 동료 골 → 실점 → 승부처 극장골까지
 * 한 사슬로 굴려요. 팀 스코어(h·a)를 MatchSim.run의 evs 생성부로 그대로 쌓아서
 * 팀 승률도 같이 뽑아요. 이 저장소에는 테스트 헬퍼 모듈 관례가 없어서
 * league-test·team-test와 같은 방식을 여기에도 한 벌 둬요. */
const seasonFn = new Function("S", "clamp", "rand", "randInt", "pick", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.momentKind}
  ${parts.goalScale}
  ${parts.buffFns}
  ${parts.poissonish} ${parts.matchContribution} ${parts.autoRes}
  ${leagueSrc}
  ${clubSrc}
  ${mateSrc}
  ${parts.deriveOppGoals}
  ${parts.fanCap} ${parts.ratingDiv} ${parts.ratingOf}
  ${parts.cbPerYear} ${parts.weeksPerCb}
  const posStat = POS_INFO[S.pos].stat;
  const act = { goals: 0, assists: 0, defense: 0, apps: 0, hypeSum: 0, wins: 0, sales: 0, teamW: 0 };
  const games = CB_PER_YEAR * WEEKS_PER_CB;
  for (let i = 0; i < games; i++) {
    const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom);
    const c = matchContribution(rating);
    /* career.js playShow와 같은 순서 — 동료 골을 먼저 굴려 우리 팀 골을 알고,
     * 그 값을 실점에 물려줍니다. */
    const mateCount = teammateGoals(rating, S.oppStr);
    const cfg = {
      home: "우리", away: "상대", myName: S.name,
      goals: c.g, assists: c.a, defense: c.def,
      oppGoals: deriveOppGoals(rating, S.stats.defense, S.oppStr, c.g + c.a + mateCount),
      rating, mateCount,
    };
    ${parts.cfgPick}
    ${parts.evsBlock}
    let h = 0, a = 0;
    for (const e of evs) { if (e.h) h += e.h; if (e.a) a += e.a; }
    const momentRes = autoRes(S.stats[posStat]);
    if (momentRes === "perfect") h += 1;
    else if (momentRes === "miss") a += 1;
    ${parts.resLine}
    ${parts.infoBlock}
    act.goals += info.myGoals;
    act.assists += info.assists;
    act.defense += info.defense;
    act.apps += 1;
    if (info.res === "W") act.teamW += 1;
  }
  return act;
`);

const yearFn = new Function("S", "act", "clamp", "rand", `
  ${leagueSrc}
  ${axisSrc}
  ${parts.ageConst}
  ${parts.agePen}
  ${parts.hype}
  ${parts.awards}
  return { hype, awards };
`);

/* ⑦ 전력은 리그MVP 확률에 안 닿는다 — 두 축이 안 겹친다는 증명이에요.
 *
 * 같은 리그 안에서 전력만 바꿔요. 팀은 더 이기지만 내 수상 확률은 그대로여야 해요.
 * 그렇지 않으면 "어느 리그에서 뛸까"와 "어느 팀에서 뛸까"가 같은 질문이 돼요.
 *
 * 두 눈금을 다른 능력치에서 재요. 수상은 능력치 90에서 봐요 — MVP 확률이 중간대라
 * 전력이 새면 곧바로 튀는 구간이에요. 팀 승률은 능력치 70에서 봐요 —
 * 110쯤 되면 1부 승률이 98%로 천장에 붙어서 전력을 올려도 더 오를 자리가 없어요. */
const N_SEASON = Number(process.env.CLUB_N || 3000);
/* oppStr — 상대 클럽 전력. 안 주면 **대등한 경기**(상대 = 우리 전력)로 굴러요.
 * 우리 전력의 작용을 보려면 상대를 고정해야 합니다 — 둘이 같이 오르면 차이가 안 생겨요. */
function seasonRates(pos, stat, league, str, oppStr) {
  let mvp = 0, w = 0, g = 0;
  for (let i = 0; i < N_SEASON; i++) {
    const S = stateOf(pos, stat, { league, clubStr: str, oppStr,
      career: { rookie: 0, daesang: 0, bonsang: 0 } });
    const act = seasonFn(S, clamp, rand, randInt, pick);
    if (yearFn(S, act, clamp, rand).awards.includes("리그MVP")) mvp++;
    w += act.teamW;
    g += act.apps;
  }
  return { mvp: mvp / N_SEASON, win: w / g };
}

guard("전력이 수상에 안 닿는다", () => {
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const t0 = Date.now();
  console.log(`=== ⑦ 같은 리그(${nameOf(1)}) 안에서 전력만 바꿨을 때 (칸당 ${N_SEASON}시즌) ===`);
  console.log("  포지션 | 전력 | 리그MVP(능력치 90) | 팀 승률(능력치 70)");
  let bad = 0;
  for (const pos of POS) {
    const aLo = seasonRates(pos, 90, 1, 50, 70), aHi = seasonRates(pos, 90, 1, 90, 70);
    const wLo = seasonRates(pos, 70, 1, 50, 70), wHi = seasonRates(pos, 70, 1, 90, 70);
    if (Math.abs(aHi.mvp - aLo.mvp) > 0.05) bad++;
    console.log(`  ${POS_NAME[pos].padStart(5)} |   50 | ${pct(aLo.mvp).padStart(17)} | ${pct(wLo.win).padStart(17)}`);
    console.log(`  ${"".padStart(5)} |   90 | ${pct(aHi.mvp).padStart(17)} | ${pct(wHi.win).padStart(17)}`);
    // 전력을 올렸으면 팀은 더 이겨야 해요 — ④⑤가 실제 경기까지 이어지는지 봐요
    check(wHi.win > wLo.win + 0.02,
      `${POS_NAME[pos]}: 전력 90 팀이 전력 50 팀보다 많이 이긴다 (${pct(wLo.win)} → ${pct(wHi.win)})`);
  }
  check(bad === 0, `네 포지션 모두 전력 50·90의 리그MVP 확률 차이가 5%p 이내다 (벗어난 포지션 ${bad}개)`);
  console.log(`  ⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
});

// ⑧ 깨진 전력 값이 던지지 않는다 — 옛 세이브·손상된 세이브가 게임을 죽이면 안 돼요
guard("깨진 값 방어", () => {
  const broken = [undefined, null, NaN, Infinity, -Infinity, "90", 0, -50, 9999, {}, []];
  const got = broken.map((v) => clubStrFn({ clubStr: v }, clamp));
  check(got.every((v) => typeof v === "number" && isFinite(v) && v >= 40 && v <= 95),
    `깨진 clubStr이 던지지 않고 40~95로 막힌다 (${got.join("·")})`);
  // 산식이 그 값을 실제로 써도 죽지 않아야 해요
  const S = stateOf("fw", 90, { clubStr: "이상한값" });
  const m = mateFn(S, 7, clamp, 70), o = oppFn(S, 7, 70, clamp, rand, 70, 3);
  check(Number.isFinite(m) && Number.isFinite(o) && m >= 0 && o >= 0,
    `깨진 전력으로도 동료 득점·실점이 정상 범위다 (동료 ${m} · 실점 ${o})`);
});

/* ⑨ 리그 × 포지션 팀 승률 — 계획서의 위험 항목이에요.
 *
 * 리그 페널티(Task 1)가 평점을 깎으면 deriveOppGoals의 실점이 늘어서 상위 리그에서
 * 팀 승률이 무너질 수 있어요. 상위 리그 클럽의 전력이 높은 게 그걸 되받아 줘요.
 * 각 리그에서 그 리그 평균 전력의 팀을 잡고 승률이 30~85%인지 봐요.
 *
 * 재보니 리그마다 '팀이 굴러가기 시작하는 능력치'가 달라요. K리그3부터 유로파까지는
 * 능력치 70이면 되는데 챔피언스리그는 90은 돼야 해요 — 능력치 70으로 챔피언스리그에
 * 가면 팀 승률이 15~25%로 주저앉아요. 그건 고장이 아니라 리그 페널티가 설계한
 * 도박의 대가예요(같은 칸에서 리그MVP 확률도 0%예요).
 * 그래서 범위 검사는 리그별 권장 능력치 칸에만 걸고, 나머지는 표로 남겨요.
 * 전체 격자를 눈으로 볼 수 있어야 다음에 밸런스를 만질 때 근거가 돼요.
 *
 * 하부 리그(K리그3·K리그2)는 클럽 전력이 40~51로 낮아서 승률이 무너질 위험이 컸어요.
 * 실측해 보니 리그 평균 전력(43·46)에 능력치 70이면 50%·53%로 한가운데예요 —
 * 상대도 같은 리그의 약팀이라 전력이 낮은 게 곧 패배가 되지는 않아요. */
const WIN_SEASONS = Number(process.env.CLUB_WIN_N || 400);
guard("리그별 팀 승률", () => {
  const avgStr = {};
  for (const id of LEAGUE_IDS) {
    const l = table[id] || [];
    avgStr[id] = Math.round(l.reduce((a, c) => a + c.str, 0) / l.length);
  }
  const winRate = (pos, id, stat) => {
    let w = 0, g = 0;
    for (let i = 0; i < WIN_SEASONS; i++) {
      const act = seasonFn(stateOf(pos, stat, { league: id, clubStr: avgStr[id] }), clamp, rand, randInt, pick);
      w += act.teamW; g += act.apps;
    }
    return w / g;
  };
  /* 리그별 권장 능력치 — 그 리그에서 팀이 굴러가기 시작하는 선이에요.
   * tier로 적어요. id를 키로 쓰면 순서가 안 보여서 다음 사람이 또 헷갈려요. */
  const FIT_BY_TIER = { 1: 70, 2: 70, 3: 70, 4: 70, 5: 90 };
  const fitLine = BY_TIER.map((l) => `${l.name} ${FIT_BY_TIER[l.tier]}`).join(" · ");
  console.log(`=== ⑨ 리그 × 포지션 팀 승률 (리그 평균 전력 · 시즌 ${WIN_SEASONS}회) ===`);
  console.log(`  능력치 | 리그(전력)      | ${POS.map((p) => POS_NAME[p].padStart(6)).join(" | ")} | 권장`);
  let out = 0;
  const bad = [];
  for (const stat of [70, 90, 110]) {
    for (const lg of BY_TIER) {
      const row = POS.map((pos) => winRate(pos, lg.id, stat));
      const fit = FIT_BY_TIER[lg.tier] === stat;
      if (fit) row.forEach((v, i) => {
        if (v < 0.30 || v > 0.85) { out++; bad.push(`${lg.name} ${POS_NAME[POS[i]]} ${(v * 100).toFixed(0)}%`); }
      });
      console.log(`  ${String(stat).padStart(6)} | ${`${lg.name}(${avgStr[lg.id]})`.padStart(15)} | ${row.map((v) => `${(v * 100).toFixed(0)}%`.padStart(6)).join(" | ")} | ${fit ? "◀" : ""}`);
    }
  }
  check(out === 0,
    `리그별 권장 능력치(${fitLine}) 칸의 팀 승률이 30~85%다 (벗어난 칸 ${out}개${bad.length ? `: ${bad.join(", ")}` : ""})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
