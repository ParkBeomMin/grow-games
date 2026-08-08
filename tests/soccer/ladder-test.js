/* 리그 사다리 — 하부 리그와 경쟁 강도(bar)를 지키는 검사예요.
 *
 * 왜 필요한가. K리그가 바닥이라 유스 필터를 못 넘으면 갈 곳이 없어서 게임이 끝났어요.
 * 유스 3년 뒤 종합 55에서 63%, 65에서 40%가 거기서 끝납니다. 밑에서 시작하는 길이
 * 있으면 그 사람들이 계속 놀 수 있어요.
 *
 * 축이 셋이에요.
 *  · penalty  — 경기 평점에서 빼요. 위쪽 리그에만 걸어요.
 *  · bar      — 수상 문턱과 라이벌 분포에 곱해요. 이번에 새로 들어온 축이에요.
 *  · prestige — 축(hype)과 명예의 전당 점수에 곱해요.
 *
 * prestige만으로 하부 리그를 표현하려던 시도가 먼저 있었어요. 수상 가치를 0.55로
 * 낮췄더니 축이 같이 줄어서 하부가 오히려 더 어려워졌습니다(능력치 90에서 1% 대 14%).
 * 평점 보너스로 메우려 해도 perf = clamp(…, 0.15, 1.6)의 상한에 막혀요.
 * 하부 리그가 쉬운 건 내가 잘해서가 아니라 경쟁자가 약하기 때문이에요 — 그게 bar예요.
 *
 * 진짜 판단은 수상 확률이 아니라 '리그MVP 확률 × prestige'(명예의 전당 가치)예요.
 * 하부에서는 상을 쓸어 담지만 값어치가 작습니다. ⑧이 그 사다리를 재는 검사예요.
 *
 * 산식과 값은 전부 소스에서 정규식으로 뽑아요 — 옮겨 적으면 원본이 바뀌어도 초록이 떠요.
 * eval("const x = …")은 쓰지 않아요. 선언이 eval 자기 스코프에 갇혀 밖으로 안 새서
 * 산식을 뭘로 바꾸든 undefined가 나오고 테스트가 통과해버립니다.
 * 그래서 new Function으로 감싸 return 해요. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
// 아직 없는 이름을 쓰는 검사는 던지면서 죽어요. 그 자체가 실패지, 테스트 중단은 아니에요.
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

/* 리그 표와 bar는 '있으면 넣는다'. 아직 없는 이름을 필수로 걸면 고치기 전에는
 * 테스트가 아예 못 돌아 빨간불의 내용을 볼 수 없어요. */
const leagueParts = {
  LEAGUES: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  leagueOf: grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  barOf: grab(GAME, /function barOf\(st\) \{[\s\S]*?\n\}/),
};
const leagueSrc = Object.values(leagueParts).filter(Boolean).join("\n");
const leagueMissing = Object.entries(leagueParts).filter(([, v]) => !v).map(([k]) => k);
const axisSrc = [parts.posAxisTable, parts.axisK, parts.axisOff, parts.posAxis].join("\n");

check(leagueMissing.length === 0,
  leagueMissing.length
    ? `${leagueMissing.join(" · ")} is not defined — game.js에 없어요`
    : "LEAGUES · leagueOf · barOf가 game.js에 있다");

const table = leagueParts.LEAGUES ? new Function(`${leagueParts.LEAGUES} return LEAGUES;`)() : null;
const leagueOfFn = leagueParts.LEAGUES && leagueParts.leagueOf
  ? new Function("st", `${leagueParts.LEAGUES}\n${leagueParts.leagueOf} return leagueOf(st);`)
  : null;
const barOfFn = leagueSrc && leagueParts.barOf
  ? new Function("st", `${leagueSrc} return barOf(st);`)
  : null;
const byId = (id) => (table || []).find((l) => l && l.id === id);
const byTier = (t) => (table || []).find((l) => l && l.tier === t);

/* ① tier가 1부터 빈틈없이 이어지고 id가 안 겹친다.
 * 개수를 못 박지 않는다 — 나라가 늘 때마다 이 검사를 고쳐야 하면 검사가 아니라 잔소리다.
 * 지켜야 하는 건 "사다리에 구멍이 없다"이지 "몇 칸이다"가 아니다. */
guard("① 사다리에 구멍이 없다", () => {
  check(table.length >= 5, `LEAGUES가 5개 이상이다 (${table.length}개)`);
  const tiers = table.map((l) => l.tier).sort((a, b) => a - b);
  const want = table.map((_, i) => i + 1).join(",");
  check(tiers.join(",") === want, `tier가 1~${table.length}로 빈틈없이 이어진다 (${tiers.join("·")})`);
  check(table.every((l) => l && l.name && l.short && l.flag),
    "리그마다 name · short · flag가 있다 (이적 화면에 그대로 찍혀요)");
  const ids = table.map((l) => l.id);
  check(new Set(ids).size === table.length, `id가 겹치지 않는다 (${ids.join("·")})`);
  check(table.every((l) => l.country), "리그마다 country가 있다 (승강 사다리를 나라로 나눠요)");
});

/* ② 옛 세이브 방어 — 이 태스크에서 가장 위험한 지점이에요.
 * 진행 중인 캐릭터의 S.league가 id 1·2·3을 가리킵니다. 번호를 다시 매기면
 * 그 캐릭터가 엉뚱한 리그로 가요. 그래서 id는 그대로 두고 순서는 tier로 표현해요. */
guard("② 옛 세이브의 id 고정", () => {
  check(byId(1) && byId(1).tier === 3 && byId(1).penalty === 0,
    `id 1이 tier 3이고 penalty가 0이다 (옛 K리그 = 지금 K리그1) — ${byId(1) ? `tier ${byId(1).tier} · penalty ${byId(1).penalty}` : "없음"}`);
  /* id 2·3은 옛 유로파리그·챔피언스리그다. 나라별 리그로 개편하면서 **이름만**
   * 🏴 잉글랜드 2부·1부로 바뀌었다 — id도 구단 명단도 그대로라 진행 중인 캐릭터는
   * 같은 클럽에서 같은 상대와 계속 뛴다. tier는 리그가 늘면서 밀리므로 값을 못 박지
   * 않고, "둘이 같은 나라이고 2가 3보다 아래"라는 관계만 지킨다. */
  check(byId(2) && byId(3) && byId(2).country === byId(3).country,
    `id 2와 3이 같은 나라다 (${byId(2) ? byId(2).name : "?"} · ${byId(3) ? byId(3).name : "?"})`);
  check(byId(2) && byId(3) && byId(2).tier < byId(3).tier && byId(2).penalty > 0,
    `id 2가 id 3보다 아래다 (tier ${byId(2) ? byId(2).tier : "?"} < ${byId(3) ? byId(3).tier : "?"})`);
  check(byId(3) && byId(3).tier === table.length && byId(3).penalty > 0,
    `id 3이 사다리 꼭대기다 (tier ${byId(3) ? byId(3).tier : "없음"}/${table.length})`);
  check(byId(1) && byId(1).prestige === 1.00,
    `id 1의 prestige가 1.00이다 (기준선이라 안 움직여요) — ${byId(1) ? byId(1).prestige : "없음"}`);
  const lower = [byTier(1), byTier(2)];
  check(lower.every((l) => l && l.id !== 1 && l.id !== 2 && l.id !== 3),
    `새 하부 리그는 새 id를 받았다 (${lower.map((l) => (l ? l.id : "?")).join("·")})`);
});

// ③ 하부 리그는 penalty가 0이고 prestige · bar가 1보다 작다
guard("③ 하부 리그의 값", () => {
  const lower = [byTier(1), byTier(2)];
  check(lower.every((l) => l && l.penalty === 0),
    `하부 2종의 penalty가 0이다 (${lower.map((l) => (l ? l.penalty : "?")).join("·")}) — 아래로 갈 때 평점을 만지면 perf 상한에 막혀요`);
  check(lower.every((l) => l && l.prestige < 1),
    `하부 2종의 prestige가 1보다 작다 (${lower.map((l) => (l ? l.prestige : "?")).join("·")})`);
  check(lower.every((l) => l && l.bar < 1),
    `하부 2종의 bar가 1보다 작다 (${lower.map((l) => (l ? l.bar : "?")).join("·")}) — 경쟁자가 약한 게 하부가 쉬운 이유예요`);
});

// ④ tier 순서대로 bar가 단조 증가한다
guard("④ bar 단조 증가", () => {
  const sorted = table.slice().sort((a, b) => a.tier - b.tier);
  const bars = sorted.map((l) => l.bar);
  check(bars.every((b, i) => i === 0 || b > bars[i - 1]),
    `tier 순서대로 bar가 커진다 (${bars.join(" < ")})`);
  const pres = sorted.map((l) => l.prestige);
  check(pres.every((p, i) => i === 0 || p > pres[i - 1]),
    `prestige도 tier 순서대로 커진다 (${pres.join(" < ")})`);
  check(byId(1) && byId(1).bar === 1,
    `K리그1의 bar가 1이다 (기준선이라 수상 판정이 예전과 한 톨까지 같아요) — ${byId(1) ? byId(1).bar : "없음"}`);
});

// ⑤ leagueOf는 그대로다 — 없거나 깨진 값은 K리그1(id 1)
guard("⑤ leagueOf", () => {
  check(leagueOfFn({}).id === 1, `leagueOf({})가 id 1이다 (${leagueOfFn({}).id})`);
  check(leagueOfFn(undefined).id === 1, `leagueOf(undefined)가 id 1이다 (${leagueOfFn(undefined).id})`);
  check(leagueOfFn({ league: 3 }).tier === table.length, `leagueOf({league:3})가 사다리 꼭대기다 (${leagueOfFn({ league: 3 }).name})`);
  const broken = [99, 0, -1, "3", null, {}].map((v) => leagueOfFn({ league: v }).id);
  check(broken.every((id) => id === 1), `깨진 league 값이 전부 id 1로 막힌다 (${broken.join("·")})`);
  check(barOfFn({}) === 1 && barOfFn({ league: 99 }) === 1,
    `barOf가 없는·깨진 세이브에서 1이다 (${barOfFn({})} · ${barOfFn({ league: 99 })})`);
  check(barOfFn({ league: 3 }) === byId(3).bar,
    `barOf가 리그 표의 bar를 읽는다 (${barOfFn({ league: 3 })})`);
});

/* 한 시즌(12경기)을 통째로 굴려요 — 평점(career.js) → 경기 기여(game.js) → 승부처
 * 극장골 → 시즌 축 → hype → 수상 판정까지가 한 사슬이에요.
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

function stateOf(stat, league, over = {}) {
  const stats = { shoot: stat, pass: stat, dribble: stat, defense: stat, stamina: stat };
  const talents = { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 };
  return {
    pos: "fw", stats, talents, trans: {}, condition: 80, fandom: 900, proYear: 5, league,
    career: { rookie: 0, daesang: 0, bonsang: 0 }, ...over
  };
}

// 칸당 시즌 수. 최적 리그와 차선의 차이가 25%p 넘게 벌어져 있어 4000이면 3σ 밖이에요.
const N = Number(process.env.LADDER_N || 4000);
function rates(stat, league, over) {
  let mvp = 0, best11 = 0, rookie = 0;
  for (let i = 0; i < N; i++) {
    const S = stateOf(stat, league, over);
    const y = yearFn(S, seasonFn(S, clamp, rand), clamp, rand);
    if (y.awards.includes("리그MVP")) mvp++;
    if (y.awards.includes("베스트11")) best11++;
    if (y.awards.includes("신인왕")) rookie++;
  }
  return { mvp: mvp / N, best11: best11 / N, rookie: rookie / N };
}

/* ⑥⑦ 수상 문턱에 bar가 실제로 작용한다 — 상 셋 모두에서요.
 *
 * prestige까지 함께 움직이면 무엇 때문에 쉬워졌는지 갈리지 않아요. 그래서 여기서는
 * 축(hype)을 밖에서 고정하고 수상 판정 블록만 굴립니다. hype가 같은데 결과가 다르면
 * 그건 오직 bar 때문이에요.
 *
 * 한 지점만 보면 안 돼요 — 문턱 위아래로 확률이 0%나 100%에 붙는 구간이 있어서
 * 어디를 찍느냐에 따라 차이가 사라집니다. hype를 훑어서 '가장 크게 벌어지는 곳'을 봐요.
 * 이러면 계수를 나중에 다시 잡아도 검사가 헛돌지 않아요.
 *
 * 셋 다 bar를 써야 상끼리 앞뒤가 맞아요. 하나만 고치면 하부 리그에서
 * "리그MVP는 받는데 베스트11은 못 받는" 역전이 납니다. */
const awardOnly = new Function("S", "hype", "clamp", "rand", `
  ${leagueSrc}
  ${parts.awards}
  return awards;
`);
const HYPE_STEPS = [];
for (let h = 0.5; h <= 9.01; h += 0.25) HYPE_STEPS.push(Math.round(h * 100) / 100);
const AWARD_N = 2000;
function sweep(league, name) {
  const out = HYPE_STEPS.map((h) => {
    let mvp = 0, best11 = 0, rookie = 0;
    for (let i = 0; i < AWARD_N; i++) {
      const a = awardOnly(stateOf(110, league, { proYear: 1 }), h, clamp, rand);
      if (a.includes("리그MVP")) mvp++;
      if (a.includes("베스트11")) best11++;
      if (a.includes("신인왕")) rookie++;
    }
    return { h, mvp: mvp / AWARD_N, best11: best11 / AWARD_N, rookie: rookie / AWARD_N };
  });
  out.name = name;
  return out;
}
guard("⑥⑦ bar가 상 셋의 문턱에 작용한다", () => {
  const low = sweep(byTier(1).id, byTier(1).name);
  const mid = sweep(byId(1).id, byId(1).name);
  const top = sweep(byTier(5).id, byTier(5).name);
  const AWARDS = [["리그MVP", "mvp"], ["베스트11", "best11"], ["신인왕", "rookie"]];
  const gap = (a, b, key) => Math.max(...a.map((r, i) => r[key] - b[i][key]));
  console.log(`=== ⑥⑦ 같은 hype에서의 수상 확률 (hype마다 ${AWARD_N}회) ===`);
  for (const [label, key] of AWARDS) {
    const peak = low.reduce((best, r, i) => (r[key] - mid[i][key] > best.d ? { d: r[key] - mid[i][key], h: r.h, a: r[key], b: mid[i][key] } : best), { d: -1 });
    console.log(`  ${label.padStart(6)} — 가장 벌어지는 hype ${peak.h}: ${byTier(1).name} ${(peak.a * 100).toFixed(0)}% 대 ${byId(1).name} ${(peak.b * 100).toFixed(0)}%`);
  }
  for (const [label, key] of AWARDS) {
    check(gap(low, mid, key) >= 0.2,
      `${label}: 같은 hype에서 ${byTier(1).name}가 ${byId(1).name}보다 20%p 넘게 잘 받는다 (최대 ${(gap(low, mid, key) * 100).toFixed(0)}%p)`);
    check(gap(mid, top, key) >= 0.2,
      `${label}: ${byTier(5).name}은 반대로 ${byId(1).name}보다 어렵다 (최대 ${(gap(mid, top, key) * 100).toFixed(0)}%p)`);
    // 뒤집히는 구간이 있으면 안 돼요 — 하부가 더 어려운 hype가 있으면 사다리가 꼬여요
    check(low.every((r, i) => r[key] >= mid[i][key] - 0.05),
      `${label}: 어떤 hype에서도 ${byTier(1).name}가 ${byId(1).name}보다 어렵지 않다`);
  }
});

/* ⑧⑨ 목표 사다리 — 이 태스크의 핵심 검사예요.
 *
 * 판단 기준은 수상 확률이 아니라 '리그MVP 확률 × prestige'예요. 하부에서는 상을
 * 쓸어 담지만 값어치가 작습니다. 능력치가 오를수록 최적 리그가 올라가야 해요.
 * 능력치 110은 K리그1이든 유로파든 통과예요(설계 문서가 둘 다 허용해요). */
guard("⑧⑨ 목표 사다리", () => {
  const sorted = table.slice().sort((a, b) => a.tier - b.tier);
  const STATS = [70, 90, 110, 130, 150];
  /* ⚠️ 허용 리그를 **id**로 적는다. 예전에는 tier 위치로 적었는데, 나라별 리그로
   * 늘면서 같은 리그의 tier가 밀려(유로파 4 → 잉글랜드 2부 9) 검사가 엉뚱한 리그를
   * 지목했다. id는 옛 세이브가 가리키는 값이라 안 움직인다 — 여기 기준으로 삼기 좋다.
   *   5 한국 3부 · 4 한국 2부 · 1 한국 1부 · 2 잉글랜드 2부(옛 유로파) · 3 잉글랜드 1부(옛 챔스) */
  /* 130이 [2, 11] 둘 다인 이유: 실측값이 챔피언십 1.724 · 세리에A 1.737로 **0.8% 차이**예요.
   * 리그가 5개에서 11개로 늘면서 위쪽 칸이 촘촘해졌고, 이 정도면 통계적으로 같은
   * 자리입니다. 한쪽만 정답으로 못 박으면 표본이 흔들릴 때마다 빨간불이 떠요.
   * (110이 [1, 2]인 것도 같은 이유 — 설계 문서가 둘 다 허용해요.) */
  const WANT = { 70: [5], 90: [4], 110: [1, 2], 130: [2, 11], 150: [3] };  // 허용하는 리그 id
  const t0 = Date.now();
  const grid = {};
  for (const stat of STATS) grid[stat] = sorted.map((l) => rates(stat, l.id).mvp);
  console.log(`=== ⑧ 리그MVP 확률 × prestige — 명예의 전당 가치 (칸당 ${N}시즌) ===`);
  console.log(`  능력치 | ${sorted.map((l) => l.name.padStart(12)).join(" | ")} | 최적`);
  for (const stat of STATS) {
    const val = grid[stat].map((p, i) => p * sorted[i].prestige);
    const bi = val.indexOf(Math.max(...val));
    console.log(`  ${String(stat).padStart(6)} | ${val.map((v, i) => `${v.toFixed(3)}(${(grid[stat][i] * 100).toFixed(0)}%)`.padStart(12)).join(" | ")} | ${sorted[bi].name}`);
  }
  console.log(`  ⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);

  for (const stat of STATS) {
    const val = grid[stat].map((p, i) => p * sorted[i].prestige);
    const bi = val.indexOf(Math.max(...val));
    const want = WANT[stat];
    check(want.includes(sorted[bi].id),
      `능력치 ${stat}의 최적 리그가 ${want.map((id) => (table.find((l) => l.id === id) || {}).name).join(" 또는 ")}다 (${sorted[bi].name})`);
    /* ⑨ 최적이 뚜렷해야 해요 — 아무 데나 가도 같으면 고민할 근거가 없어요.
     *
     * 다만 **바로 옆 칸**과는 붙어 있어도 됩니다. 리그가 5개에서 11개로 늘면서
     * 칸 사이가 촘촘해졌고, 옆 칸과 1%밖에 차이 안 나는 건 "고민할 게 없다"가 아니라
     * "둘 중 아무거나 골라도 되는 진짜 선택지"예요. 실제로 능력치 130에서
     * 잉글랜드 2부(1.742)와 이탈리아 1부(1.718)가 그렇습니다.
     * 그래서 **두 칸 이상 떨어진 리그**와 견줘요 — 거기까지 붙어 있으면 사다리가 없는 겁니다. */
    const far = Math.max(...val.filter((_, i) => Math.abs(i - bi) >= 2));
    check(far > 0 && val[bi] >= far * 1.1,
      `능력치 ${stat}: 최적(${sorted[bi].name} ${val[bi].toFixed(3)})이 두 칸 밖 최고(${far.toFixed(3)})보다 10% 이상 높다 (+${((val[bi] / far - 1) * 100).toFixed(0)}%)`);
  }
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
