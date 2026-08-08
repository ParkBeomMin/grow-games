/* 리그 티어 — 상위 리그로 갈수록 경기 평점이 깎이고 수상 가치가 커지는지 본다.
 *
 * 축구 커리어의 핵심 서사는 리그를 옮기는 것이다. 국내에서 뛰다 유럽으로 가고,
 * 거기서 빅클럽으로 간다. 지금 게임에는 그 축이 아예 없었다.
 *
 * 난이도를 곱셈이 아니라 **평점에서 빼는** 게 이 설계의 전부다.
 * perf = clamp((rating - 5) / 4 + 0.6, 0.15, 1.6)이 평점의 비선형 함수라,
 * 평점을 깎으면 약한 선수가 훨씬 크게 무너지고 강한 선수는 상한 근처라 덜 다친다.
 * perf에 난이도를 곱해봤더니 순효과가 균일해서, 능력치와 무관하게 올라갈수록
 * 유리했다 — 도박이 아니라 그냥 정답이었다. ⑦이 그 차이를 재는 검사다.
 *
 * 산식은 전부 소스에서 정규식으로 뽑는다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
 * 직접 eval(`const x = …`)은 쓰지 않는다. 선언이 eval 자기 스코프에 갇혀서 바깥으로
 * 새지 않고, 산식을 뭘로 바꾸든 undefined가 나와 테스트가 통과해버린다.
 * 그래서 new Function으로 감싸 return 한다.
 *
 * LEAGUES·leagueOf는 game.js에 둔다. career.js는 IIFE라 그 안의 선언이 밖으로 안 새는데,
 * 다음 단계에서 game.js(클럽 전력·동료 득점)가 리그를 읽어야 하기 때문이다. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
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
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  // MatchSim.finish의 info 블록 — 승부처 극장골이 내 골에 얹히는 규칙이 여기 있어요
  /* ⚠️ info 블록은 바깥 스코프의 mateGoals(중계에서 골 넣은 우리 팀 선수 이름)를 봐요.
   * 여기서는 경기 화면을 안 그리니 빈 배열을 미리 깔아 둡니다. */
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

/* 리그는 '있으면 넣는다'. 아직 없는 이름을 필수로 걸면 고치기 전에는 테스트가 아예
 * 못 돌아 빨간불의 내용을 볼 수 없다. 없으면 그 이름을 쓰는 검사가 ReferenceError로
 * 떨어지고, 그게 우리가 보고 싶은 빨간불이다.
 * 값은 절대 여기 옮겨 적지 않는다 — 소스에 적힌 그대로 실행한다. */
const leagueParts = {
  LEAGUES: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  leagueOf: grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  // barOf — 수상 판정이 리그의 경쟁 강도(bar)를 이걸로 읽어요
  barOf: grab(GAME, /function barOf\(st\) \{[\s\S]*?\n\}/),
};
const leagueSrc = Object.values(leagueParts).filter(Boolean).join("\n");
const leagueMissing = Object.entries(leagueParts).filter(([, v]) => !v).map(([k]) => k);
const axisSrc = [parts.posAxisTable, parts.axisK, parts.axisOff, parts.posAxis].join("\n");

// ① 리그 표가 game.js에 있고 값이 설계 문서와 같다
check(leagueMissing.length === 0,
  leagueMissing.length
    ? `${leagueMissing.join(" · ")} is not defined — game.js에 리그가 없어요`
    : "LEAGUES · leagueOf · barOf가 game.js에 있다");

/* 설계 문서(docs/superpowers/specs/2026-07-29-soccer-lower-leagues.md)의 리그 표예요.
 * 여기만 소스에서 뽑지 않고 손으로 적어요 — "소스가 문서와 같은가"를 보는 검사라
 * 소스에서 뽑아 오면 자기 자신과 비교하는 꼴이 돼요. 세 값 다 시뮬레이션으로 잡은
 * 측정값이라, 소스를 고쳤으면 문서와 이 표를 같이 고쳐야 해요.
 *
 * tier가 순서고 id는 옛 세이브가 가리키는 값이에요. 하부 리그(tier 1·2)가 나중에
 * 붙으면서 id 4·5를 새로 받았어요 — 사다리는 tests/soccer/ladder-test.js가 봐요. */
const SPEC = [
  { id: 5,  tier: 1,  penalty: 0,    prestige: 0.55, bar: 0.50 },   // 🇰🇷 한국 3부
  { id: 4,  tier: 2,  penalty: 0,    prestige: 0.85, bar: 0.75 },   // 🇰🇷 한국 2부
  { id: 1,  tier: 3,  penalty: 0,    prestige: 1.00, bar: 1.00 },   // 🇰🇷 한국 1부 — 기준선
  { id: 6,  tier: 4,  penalty: 0.35, prestige: 1.08, bar: 1.03 },   // 🇯🇵 일본 2부
  { id: 8,  tier: 5,  penalty: 0.6,  prestige: 1.18, bar: 1.06 },   // 🇧🇷 브라질 2부
  { id: 7,  tier: 6,  penalty: 0.85, prestige: 1.32, bar: 1.08 },   // 🇯🇵 일본 1부
  { id: 9,  tier: 7,  penalty: 1.1,  prestige: 1.48, bar: 1.10 },   // 🇧🇷 브라질 1부
  { id: 10, tier: 8,  penalty: 1.35, prestige: 1.60, bar: 1.11 },   // 🇮🇹 이탈리아 2부
  { id: 2,  tier: 9,  penalty: 1.6,  prestige: 1.75, bar: 1.12 },   // 🏴 잉글랜드 2부 (옛 유로파리그)
  { id: 11, tier: 10, penalty: 2.1,  prestige: 2.05, bar: 1.22 },   // 🇮🇹 이탈리아 1부
  { id: 3,  tier: 11, penalty: 2.8,  prestige: 2.40, bar: 1.30 },   // 🏴 잉글랜드 1부 (옛 챔피언스리그)
];
/* ④⑤⑦은 옛 리그 셋(id 1·2·3 = 지금 한국 1부 · 잉글랜드 2부 · 잉글랜드 1부)을 봐요. 이 파일이 지키는 건
 * '위로 갈수록 평점이 깎이고 수상 가치가 커지는가'라, 하부 리그가 붙어도 그대로예요. */
const UP = SPEC.filter((s) => s.id <= 3).sort((a, b) => a.tier - b.tier);

const table = leagueParts.LEAGUES ? new Function(`${leagueParts.LEAGUES} return LEAGUES;`)() : null;
// 화면 문구는 소스의 리그 이름을 그대로 써요 — 여기 옮겨 적으면 이름이 바뀌어도 안 들켜요
const NAME = (id) => { const l = (table || []).find((x) => x && x.id === id); return l ? l.name : `id ${id}`; };
const PRESTIGE = (id) => { const l = (table || []).find((x) => x && x.id === id); return l ? l.prestige : 1; };
const leagueOfFn = leagueSrc && leagueParts.leagueOf
  ? new Function("st", `${leagueSrc} return leagueOf(st);`)
  : null;

if (!table) {
  check(false, "LEAGUES 표를 읽지 못했어요 (①이 먼저 통과해야 해요)");
} else {
  check(table.length === SPEC.length, `LEAGUES가 ${SPEC.length}개다 (${table.length}개)`);
  let valOk = true;
  const shown = SPEC.map((want) => {
    const got = table.find((l) => l && l.id === want.id);
    if (!got || got.tier !== want.tier || Math.abs(got.penalty - want.penalty) > 1e-9
      || Math.abs(got.prestige - want.prestige) > 1e-9 || Math.abs(got.bar - want.bar) > 1e-9) valOk = false;
    return got ? `${got.name} -${got.penalty}·×${got.prestige}·bar ${got.bar}` : `id ${want.id} 없음`;
  }).join(" · ");
  check(valOk, `리그마다 tier · penalty · prestige · bar가 설계 문서와 같다 (${shown})`);
  // 이름·약칭·깃발은 화면에 그대로 찍혀요. 하나라도 비면 이적 목록이 깨져요.
  check(table.every((l) => l && l.name && l.short && l.flag),
    "리그마다 name · short · flag가 있다 (이적 화면에 그대로 찍혀요)");
}

// ② 옛 세이브 방어 — S.league가 없으면 1부다 (마이그레이션을 하지 않아요)
guard("기본 리그", () => {
  check(leagueOfFn({}).id === 1, `leagueOf({})가 1부다 (${leagueOfFn({}).id}부)`);
  check(leagueOfFn(undefined).id === 1, `leagueOf(undefined)가 1부다 (${leagueOfFn(undefined).id}부)`);
});

// ③ 지정한 리그를 주고, 깨진 값은 1부로 막는다
guard("리그 조회", () => {
  const got = SPEC.map((s) => leagueOfFn({ league: s.id }).id);
  check(got.every((id, i) => id === SPEC[i].id), `leagueOf가 id를 그대로 돌려준다 (${got.join("·")})`);
  const broken = [99, 0, -1, "3", null].map((v) => leagueOfFn({ league: v }).id);
  check(broken.every((id) => id === 1 || id === 3),
    `깨진 league 값이 던지지 않는다 (${broken.join("·")})`);
  check(leagueOfFn({ league: 99 }).id === 1, `leagueOf({league:99})가 1부로 막힌다 (${leagueOfFn({ league: 99 }).id}부)`);
});

/* 평점 — ratingOf를 통째로 떼어 와 돌려요. clutch가 전역 S를 읽으니 S를 파라미터로
 * 받고 떼어 온 선언들이 그 S를 클로저로 잡게 감쌌어요. */
const ratingFn = new Function("S", "clamp", "rand", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${leagueSrc}
  ${parts.momentKind}
  ${parts.goalScale}
  ${parts.buffFns}
  ${parts.fanCap} ${parts.ratingDiv} ${parts.ratingOf}
  return ratingOf(S.stats, S.pos, S.condition, S.fandom);
`);

function stateOf(pos, stat, league, over = {}) {
  const stats = { shoot: stat, pass: stat, dribble: stat, defense: stat, stamina: stat };
  const talents = { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 };
  return { pos, stats, talents, trans: {}, condition: 80, fandom: 900, proYear: 5, league, ...over };
}
const meanRating = (stat, league, n = 4000) => {
  let s = 0;
  for (let i = 0; i < n; i++) s += ratingFn(stateOf("fw", stat, league), clamp, rand);
  return s / n;
};

// ④ 평점 페널티가 실제로 작용한다 — 상위 리그에서는 같은 능력치로 같은 평점이 안 나와요
guard("평점 페널티", () => {
  const m = UP.map((s) => meanRating(110, s.id));
  console.log(`=== ④ 능력치 110 공격수의 평균 평점 (리그별 4000경기) ===`);
  console.log(`  ${m.map((v, i) => `${NAME(UP[i].id)} ${v.toFixed(2)}`).join(" · ")}`);
  check(m[0] - m[2] >= 2.5, `${NAME(3)} 평균 평점이 ${NAME(1)}보다 2.5 이상 낮다 (${m[0].toFixed(2)} → ${m[2].toFixed(2)}, 차이 ${(m[0] - m[2]).toFixed(2)})`);
  check(m[0] > m[1] && m[1] > m[2], `평점이 ${NAME(1)} > ${NAME(2)} > ${NAME(3)}다 (${m.map((v) => v.toFixed(2)).join(" > ")})`);
});

// 연말 평가(hype) — 축 → 리그격 → 로그. act와 S를 받아 그대로 돌려요.
const hypeFn = new Function("S", "act", "clamp", `
  ${leagueSrc}
  ${axisSrc}
  ${parts.ageConst}
  ${parts.agePen}
  ${parts.hype}
  return hype;
`);

// ⑤ 리그격이 hype에 작용한다 — 같은 성적이라도 위 리그에서 낸 게 더 값어치가 있어요
guard("리그격", () => {
  const act = { goals: 18, assists: 10, defense: 12 };
  const h = UP.map((s) => hypeFn(stateOf("fw", 110, s.id), act, clamp));
  console.log(`=== ⑤ 같은 시즌 기록(⚽18 · 🅰️10 · 🛡️12)의 리그별 hype ===`);
  console.log(`  ${h.map((v, i) => `${NAME(UP[i].id)} ${v.toFixed(2)}`).join(" · ")}`);
  check(h[2] > h[0] + 0.2, `${NAME(3)} hype가 ${NAME(1)}보다 높다 (${h[0].toFixed(2)} → ${h[2].toFixed(2)})`);
  check(h[0] < h[1] && h[1] < h[2], `hype가 ${NAME(1)} < ${NAME(2)} < ${NAME(3)}다 (${h.map((v) => v.toFixed(2)).join(" < ")})`);
});

/* ⑥ 1부에서는 아무것도 안 바뀐다 — penalty 0 · prestige 1이라 항등이어야 해요.
 * 리그 항을 산식에서 문자열로 걷어낸 '리그 도입 전' 산식과 값을 대조해요.
 * 난수는 씨앗을 고정해 두 쪽에 똑같이 흘려보내요 — 평균이 아니라 한 톨까지 같아야 해요.
 * 기존 5종 테스트(rating·position·team·axis·curve)가 전부 1부 기준이라,
 * 여기가 깨지면 그쪽도 같이 무너져요. */
{
  const baseRatingOf = parts.ratingOf.replace(/\s*-\s*leagueOf\([^)]*\)\.penalty/, "");
  const baseHype = parts.hype.replace(/\s*\*\s*leagueOf\([^)]*\)\.prestige/, "");
  check(baseRatingOf !== parts.ratingOf, "평점 산식에 리그 페널티 항이 들어 있다 (clamp 안쪽에서 빼요)");
  check(baseHype !== parts.hype, "hype 산식에 리그격 항이 들어 있다");
  // clamp 바깥에서 빼면 하한 1이 안 지켜져요 — 페널티가 clamp 인자 안에 있는지 봐요
  check(/clamp\([^;]*leagueOf\([^;]*\)\.penalty[^;]*,\s*1,\s*10\)/.test(parts.ratingOf),
    "페널티를 clamp 안쪽에서 뺀다 (밖에서 빼면 평점 하한 1이 안 지켜져요)");

  const baseRatingFn = new Function("S", "clamp", "rand", `
    ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
    ${parts.fanCap} ${parts.ratingDiv} ${baseRatingOf}
    return ratingOf(S.stats, S.pos, S.condition, S.fandom);
  `);
  const baseHypeFn = new Function("S", "act", "clamp", `
    ${axisSrc}
    ${parts.ageConst}
  ${parts.agePen}
    ${baseHype}
    return hype;
  `);

  // 씨앗 고정 난수(LCG) — 두 산식에 똑같은 난수를 똑같은 순서로 먹여요
  let seed = 0;
  const seeded = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const fixedRand = (a, b) => a + seeded() * (b - a);

  let rBad = 0, hBad = 0;
  for (let i = 0; i < 3000; i++) {
    const stat = 30 + (i % 170);
    const S1 = stateOf("fw", stat, 1), S0 = stateOf("fw", stat, undefined);
    seed = i + 1; const withL = ratingFn(S1, clamp, fixedRand);
    seed = i + 1; const noL = baseRatingFn(S0, clamp, fixedRand);
    if (withL !== noL) rBad++;
    const act = { goals: i % 40, assists: (i * 3) % 30, defense: (i * 7) % 90 };
    for (const pos of ["fw", "wg", "mf", "df"]) {
      if (hypeFn(stateOf(pos, stat, 1), act, clamp) !== baseHypeFn(stateOf(pos, stat, undefined), act, clamp)) hBad++;
    }
  }
  check(rBad === 0, `1부 평점이 리그 도입 전과 한 톨까지 같다 (3000회, 어긋난 값 ${rBad}건)`);
  check(hBad === 0, `1부 hype가 리그 도입 전과 한 톨까지 같다 (12000회, 어긋난 값 ${hBad}건)`);
}

/* ⑦ 도박 구조 — 이 태스크의 핵심 검사예요.
 *
 * 약할 때 올라가면 손해, 강해지고 올라가면 이득. 능력치 100 언저리가 분기점이에요.
 * 이게 안 지켜지면 이적은 도박이 아니라 그냥 "빨리 갈수록 좋은 것"이 돼요.
 *
 * 한 시즌(12경기)을 통째로 굴려요 — 평점(career.js) → 경기 기여(game.js) → 승부처
 * 극장골 → 시즌 축 → hype → 수상 판정까지가 한 사슬이에요. curve-test.js와 같은
 * 방식으로 굴려요(이 저장소에는 테스트 헬퍼 모듈 관례가 없어서 두 벌로 둬요).
 * 팀 스코어(h·a·res)는 이 검사가 안 보는 값이라 자리만 채워요. */
const seasonFn = new Function("S", "clamp", "rand", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.momentKind}
  ${parts.goalScale}
  ${parts.buffFns}
  ${parts.poissonish} ${parts.matchContribution} ${parts.autoRes}
  ${leagueSrc}
  ${parts.fanCap} ${parts.ratingDiv} ${parts.ratingOf}
  ${parts.cbPerYear} ${parts.weeksPerCb}
  const home = "우리", away = "상대", h = 0, a = 0, res = "D";
  const posStat = POS_INFO[S.pos].stat;
  const act = { goals: 0, assists: 0, defense: 0, apps: 0, hypeSum: 0, wins: 0, sales: 0 };
  const games = CB_PER_YEAR * WEEKS_PER_CB;
  for (let i = 0; i < games; i++) {
    const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom);
    const c = matchContribution(rating);
    const goals = c.g, assists = c.a, defense = c.def;
    const momentRes = autoRes(S.stats[posStat]);
    const mateGoals = [];
    ${parts.infoBlock}
    act.goals += info.myGoals;
    act.assists += info.assists;
    act.defense += info.defense;
    act.apps += 1;
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

/* 칸당 시즌 수. 능력치 90의 1부 ↔ 3부 격차가 1%p 남짓(17.4% vs 16.2%)이라
 * 3000시즌으로는 난수에 뒤집혀요(10회 중 1회쯤 빨간불이 떴어요).
 * 20000시즌이면 차이의 표준오차가 0.38%p라 3σ 밖이에요. 전체 15칸에 1.5초쯤 걸려요. */
const N = Number(process.env.LEAGUE_N || 20000);
function mvpRate(stat, league) {
  let mvp = 0;
  for (let i = 0; i < N; i++) {
    const S = stateOf("fw", stat, league, { career: { rookie: 0, daesang: 0, bonsang: 0 } });
    if (yearFn(S, seasonFn(S, clamp, rand), clamp, rand).awards.includes("리그MVP")) mvp++;
  }
  return mvp / N;
}

guard("도박 구조", () => {
  const pct = (v) => `${(v * 100).toFixed(0)}%`;
  const STATS = [70, 90, 110, 130, 150];
  const t0 = Date.now();
  const grid = {};
  for (const stat of STATS) grid[stat] = UP.map((s) => mvpRate(stat, s.id));
  console.log(`=== ⑦ 5년차 공격수 리그MVP 확률과 가치 (칸당 ${N}시즌) ===`);
  console.log(`  능력치 | ${UP.map((s) => NAME(s.id).padStart(12)).join(" | ")} | 가치가 최선인 곳`);
  for (const stat of STATS) {
    const row = grid[stat];
    const val = row.map((v, i) => v * PRESTIGE(UP[i].id));
    const best = val.indexOf(Math.max(...val));
    console.log(`  ${String(stat).padStart(6)} | ${row.map((v, i) => `${pct(v)} ×${val[i].toFixed(2)}`.padStart(12)).join(" | ")} | ${NAME(UP[best].id)}`);
  }
  console.log(`  ⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);

  /* 약할 때 올라가면 손해다 — 능력치 70·90에서는 K리그1이 챔피언스리그 이상이어야 해요. */
  check(grid[90][0] >= grid[90][2],
    `능력치 90: ${NAME(1)} 리그MVP 확률이 ${NAME(3)} 이상이다 (${pct(grid[90][0])} ≥ ${pct(grid[90][2])})`);
  check(grid[70][0] >= grid[70][2],
    `능력치 70: ${NAME(1)} 리그MVP 확률이 ${NAME(3)} 이상이다 (${pct(grid[70][0])} ≥ ${pct(grid[70][2])})`);
  /* 강해지면 올라가는 게 이득이다 — 능력치 150에서는 챔피언스리그가 확실히 나아야 해요.
   *
   * 여기는 '확률'이 아니라 '확률 × prestige'로 본다. 경쟁 강도(bar)가 들어오면서
   * 상위 리그는 확률로는 절대 K리그1을 못 이기게 됐다 — K리그1은 능력치 150이면
   * 이미 96%라 천장이고, 위 리그는 문턱과 라이벌이 bar만큼 세다. 확률로 재면
   * "위로 갈수록 손해"라는 잘못된 결론이 나온다. 플레이어가 실제로 저울질하는 값은
   * 명예의 전당에 쌓이는 가치이고, 사다리 전체는 tests/soccer/ladder-test.js가 본다. */
  const v150 = grid[150].map((v, i) => v * PRESTIGE(UP[i].id));
  check(v150[2] > v150[0] * 1.1,
    `능력치 150: ${NAME(3)}의 수상 가치가 ${NAME(1)}보다 10% 넘게 높다 (${v150[2].toFixed(2)} > ${v150[0].toFixed(2)})`);
  const v70 = grid[70].map((v, i) => v * PRESTIGE(UP[i].id));
  check(v70[0] > v70[2],
    `능력치 70: 반대로 ${NAME(1)}의 수상 가치가 ${NAME(3)}보다 높다 (${v70[0].toFixed(2)} > ${v70[2].toFixed(2)})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
