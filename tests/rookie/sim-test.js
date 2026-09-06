/* ⚾ 통합 리그 시뮬 엔진 검증 — beta/rookie/sim.js
 *
 * 증상(2026-09-05): 안타 1위권이 눈금 185보다 **+17.3%** 높은데, 밴드 상단이 +18%라
 * 여유 0.6%p로 초록불이었어요. 시드를 갈아도 안 움직이니 잡음이 아니라 계통이었고,
 * **162경기(대륙 리그)에서는 이미 밴드 밖**이었는데 검사가 144경기 한 칸에서만 재서
 * 아무도 못 봤습니다. 게다가 살아 있는 손잡이를 28% 흔들어도 안 잡혔어요.
 *
 * 지키는 것:
 *   ⓿ 변이 정규식이 소스에 실제로 걸린다 (안 걸리면 아래 감도 검사가 죽은 채 초록불)
 *   ① 전역 Math.random 오염 없음 · ② 같은 시드는 같은 순위표
 *   ③ 팀 승률 ↔ 전력
 *   ④ 눈금 — **경기 수로 정규화**해서 두 칸(144·162)에서 잰다 (느슨한 안전망)
 *   ⑤ 🔑 사람과의 간격 — 라이벌 1위 ÷ 사람(스탯 150)의 **비율**. 진짜 계약은 여기다
 *   ⑥ 감도 — 살아 있는 손잡이를 흔들면 ⑤가 **정말 빨간불이 되는가**
 *
 * 🔒 왜 ④가 느슨하고 ⑤가 촘촘한가 —
 *   눈금 185·48·.335는 **모델로 잰 절대값**이라 계약으로 삼으면 모델을 고치는 순간
 *   난이도를 모델 쪽으로 끌고 갑니다. 같은 모델로 잰 **차이(비율)**만 계약이 돼요.
 *   ⑤의 사람 값은 **조작자 모델을 지어낸 게 아니라** 게임의 자동 진행 경로(autoRes)
 *   그대로입니다 — game.js에서 정규식으로 뜯어 new Function으로 굴려요.
 *
 * 🔒 누적 지표(안타·홈런·도루·다승·탈삼진·세이브)는 경기 수에 비례하는 **종속값**이라
 *   값이 아니라 관계로 봅니다: 문턱 = 눈금 × games / 144.
 *   비율 지표(타율·자책)는 경기 수를 안 탑니다 — 그래서 안 곱해요.
 *
 * 측정 기록: docs/superpowers/_workspace/rookie/20_balancer_hits-anchor.md
 *
 * 종료 코드 — 0 통과 · 1 빨간불 · 2 💥 검사가 아예 안 돌았음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = "/workspace/grow-games";
const SIM_PATH = path.join(ROOT, "beta/rookie/sim.js");
const SIM_SRC = fs.readFileSync(SIM_PATH, "utf8");
const GAME_SRC = fs.readFileSync(path.join(ROOT, "beta/rookie/game.js"), "utf8");
const CAREER_SRC = fs.readFileSync(path.join(ROOT, "beta/rookie/career.js"), "utf8");

let pass = 0, fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); ok ? pass++ : fail++; };
const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ── ⓿ 변이 등록 검사 ────────────────────────────────────────────────
 * ⑥ 감도 검사는 소스 문자열을 정규식으로 바꿔 굴립니다. 구현이 그 문자열을 바꾸면
 * 변이가 조용히 죽고, 그러면 ⑥은 "흔들어도 안 잡힌다"를 못 보고 초록불이 돼요.
 * 그래서 무엇보다 먼저 대조합니다. 안 걸려도 죽지 않고 ❌ 한 줄만 찍어요. */
const MUT_SINGLE = /single: [\d.]+/;                    // ⑥이 흔들 손잡이
const NEEDLES = {
  "sim.js — PA_BASE.single (⑥이 흔드는 손잡이)": [SIM_SRC, MUT_SINGLE],
  "sim.js — LG_RUNS":                            [SIM_SRC, /const LG_RUNS = [\d.]+;/],
  "game.js — hitP (사람의 타석 판정)":            [GAME_SRC, /const hitP = clamp\([\s\S]*?\* clutch\("contact"\);/],
  "game.js — autoRes (자동 진행 판정 분포)":      [GAME_SRC, /const pPerfect = clamp\([^;]+;/],
  "game.js — 홈런 비율":                          [GAME_SRC, /clamp\(S\.stats\.power \/ 600, [\d.]+, [\d.]+\)/],
  "career.js — 사람의 경기당 타수":               [CAREER_SRC, /const abs = randInt\(\d, \d\);/],
};
let deadNeedle = 0;
for (const [name, [src, re]] of Object.entries(NEEDLES)) {
  const ok = re.test(src);
  if (!ok) deadNeedle++;
  check(ok, `⓿ 변이 등록 — ${name}`);
}
if (deadNeedle) console.log("   🔴 위가 ❌면 아래 ⑤⑥은 **아무것도 안 지키고 있을 수 있어요.**\n");

/* ── 사람 쪽 산식을 소스에서 뜯어옵니다 (값을 옮겨 적지 않아요) ── */
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
const HITP_SRC = grab(GAME_SRC, /const hitP = clamp\([\s\S]*?\* clutch\("contact"\);/);
const MULT_SRC = grab(GAME_SRC, /const mult = res === "perfect"[^;]+;/);
const AUTO_SRC = grab(GAME_SRC, /const pPerfect = clamp\([^;]+;\s*const pMiss = clamp\([^;]+;/);
const ABS_SRC = grab(CAREER_SRC, /const abs = randInt\((\d), (\d)\);/);
if (!HITP_SRC || !MULT_SRC || !AUTO_SRC || !ABS_SRC) {
  console.log("💥 사람 쪽 산식을 소스에서 못 뜯었어요 — 검사가 안 돌았습니다");
  process.exit(2);
}
// 사람의 경기당 타수: randInt(a, b)의 기대값 (career.js proBatterGame)
const [, AB_LO, AB_HI] = ABS_SRC.match(/randInt\((\d), (\d)\)/).map(Number);
const AB_PER_GAME = (AB_LO + AB_HI) / 2;

/* 한 타석 안타 확률 — 게임의 자동 진행(autoRes) 판정 분포를 그대로 씁니다 */
const humanHitRate = new Function("contact", "oppStr", "cond", "clamp", `
  ${AUTO_SRC.replace(/stat/g, "contact").replace(/S\.condition/g, "cond")}
  const dist = { perfect: pPerfect, miss: pMiss, good: 1 - pPerfect - pMiss };
  const S = { stats: { contact } };
  const clutch = () => 1;
  const oppStrF = () => oppStr;
  ${HITP_SRC.replace("oppStr()", "oppStrF()")}
  let e = 0;
  for (const res of ["perfect", "good", "miss"]) {
    ${MULT_SRC}
    e += dist[res] * clamp(hitP * mult, 0, 0.95);
  }
  return e;
`);
const humanHrShare = new Function("power", "clamp",
  `const S = { stats: { power } }; return ${grab(GAME_SRC, /clamp\(S\.stats\.power \/ 600, [\d.]+, [\d.]+\)/)};`);

/* ── 시뮬을 굴리는 하네스 ── */
const TEAMS = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차"];
const STR = {}; TEAMS.forEach((t, i) => (STR[t] = 0.40 + i * 0.0222));   // 실제 teamStrOf 눈금
const strOf = (t) => STR[t];
const KEYS = ["hits", "hr", "sb", "avg", "wins", "k", "era", "saves"];

let tmpSeq = 0;
function loadSim(mutate) {
  if (!mutate) { global.window = {}; delete require.cache[SIM_PATH]; require(SIM_PATH); return global.window.RookieSim; }
  const f = path.join(os.tmpdir(), `rookie-sim-mut-${process.pid}-${tmpSeq++}.js`);
  fs.writeFileSync(f, mutate(SIM_SRC));
  global.window = {}; delete require.cache[f];
  require(f);
  const S = global.window.RookieSim;
  fs.unlinkSync(f);
  return S;
}
function measure(Sim, games, seed0, N) {
  const lead = {}; KEYS.forEach((k) => (lead[k] = []));
  const topWin = [], botWin = [], strongWin = [];
  for (let s = 0; s < N; s++) {
    const seed = seed0 + s;
    const res = Sim.simSeason(Sim.buildLeague(TEAMS, strOf, seed), seed, games);
    const st = res.standings;
    topWin.push(st[0].w / games);
    botWin.push(st[st.length - 1].w / games);
    strongWin.push(res.standings.slice().sort((a, b) => b.str - a.str)[0].w / games);
    for (const m of KEYS) { const L = Sim.leaders(res, m, games); if (L.length) lead[m].push(L[0].v); }
  }
  const out = { topWin: avg(topWin), botWin: avg(botWin), strongWin: avg(strongWin) };
  for (const m of KEYS) out[m] = avg(lead[m]);
  return out;
}

const Sim = loadSim(null);

// ── ① 전역 Math.random 오염
let rngCalls = 0;
const realRandom = Math.random;
Math.random = () => { rngCalls++; return realRandom(); };
Sim.simSeason(Sim.buildLeague(TEAMS, strOf, 123), 123, 144);
Math.random = realRandom;
check(rngCalls === 0, `① 시뮬이 전역 Math.random을 안 쓴다 (호출 ${rngCalls}회)`);

// ── ② 결정성
const a1 = Sim.simSeason(Sim.buildLeague(TEAMS, strOf, 999), 999, 144);
const a2 = Sim.simSeason(Sim.buildLeague(TEAMS, strOf, 999), 999, 144);
check(JSON.stringify(a1.standings) === JSON.stringify(a2.standings), "② 같은 시드는 같은 순위표를 낸다");

/* ── 문턱은 검사에 상수로 박습니다 (소스에서 읽어오면 상수를 바꿔도 따라가서 안 잡혀요) ──
 * 눈금은 **144경기 기준**. `scale: true`면 경기 수에 비례하는 누적 지표예요. */
const N = 60;
const GRIDS = [{ games: 144, seed0: 1000 }, { games: 162, seed0: 5000 }];  // 🔒 한 칸으로 재지 않아요
const ANCHOR = {
  hits:  { target: 185,   scale: true,  lo: 0.82, hi: 1.25 },
  hr:    { target: 48,    scale: true,  lo: 0.78, hi: 1.22 },
  sb:    { target: 70,    scale: true,  lo: 0.75, hi: 1.25 },
  avg:   { target: 0.335, scale: false, lo: 0.94, hi: 1.12 },
  wins:  { target: 15,    scale: true,  lo: 0.75, hi: 1.32 },
  k:     { target: 415,   scale: true,  lo: 0.82, hi: 1.20 },
  era:   { target: 2.5,   scale: false, lo: 0.82, hi: 1.25 },
  saves: { target: 42,    scale: true,  lo: 0.72, hi: 1.25 },
};
/* 🚧 안타 상단이 1.25로 넉넉한 건 **지금 실측이 1.17이기 때문**입니다 — 좁히면 계수 한 번에
 * 우연히 빨간불이 떠요. 그 간격 자체는 ⑤가 촘촘하게 지킵니다. 여기는 안전망이에요. */

const HUMAN_STAT = 150;   // 초월 구간까지 올린 사람 (STAT_CAP 130 + 한계 돌파)
const humanRate = humanHitRate(HUMAN_STAT, 0.49, 50, clamp);

for (const { games, seed0 } of GRIDS) {
  const m = measure(Sim, games, seed0, N);
  const humanHits = humanRate * AB_PER_GAME * games;
  const humanHr = humanHits * humanHrShare(HUMAN_STAT, clamp);
  console.log(`\n■ ${games}경기 · 시드 ${seed0}~${seed0 + N - 1} · N=${N} · 10팀 전력 0.40~0.60`);
  console.log(`   측정 조건: 사람은 **스탯 ${HUMAN_STAT} · 자동 진행 · 상대 0.49 · 컨디션 50 · 경기당 ${AB_PER_GAME}타수** (조작자 모델을 지어내지 않았어요)`);
  console.log(`   승률 | 1위 ${(m.topWin * 100).toFixed(0)}% · 꼴찌 ${(m.botWin * 100).toFixed(0)}%`);
  console.log(`   라이벌 1위권 | 안타 ${m.hits.toFixed(0)} · 홈런 ${m.hr.toFixed(0)} · 타율 ${m.avg.toFixed(3)} · 다승 ${m.wins.toFixed(0)} · 탈삼진 ${m.k.toFixed(0)} · 자책 ${m.era.toFixed(2)}`);
  console.log(`   사람          | 안타 ${humanHits.toFixed(0)} · 홈런 ${humanHr.toFixed(0)} · 타율 ${humanRate.toFixed(3)}`);

  // ③ 승률 ↔ 전력
  check(m.topWin >= 0.58 && m.topWin <= 0.75, `③ ${games}경기 — 1위 팀 승률이 58~75%다 (${(m.topWin * 100).toFixed(0)}%)`);
  check(m.botWin >= 0.25 && m.botWin <= 0.42, `③ ${games}경기 — 꼴찌 팀 승률이 25~42%다 (${(m.botWin * 100).toFixed(0)}%)`);
  check(m.strongWin >= 0.55, `③ ${games}경기 — 전력 1위 팀이 상위권 승률을 낸다 (${(m.strongWin * 100).toFixed(0)}%)`);

  // ④ 눈금 — 누적 지표는 경기 수로 정규화한 문턱과 견줍니다
  for (const [key, a] of Object.entries(ANCHOR)) {
    const t = a.scale ? a.target * (games / 144) : a.target;
    const r = m[key] / t;
    check(r >= a.lo && r <= a.hi,
      `④ ${games}경기 — ${key} 1위권이 눈금 ${t.toFixed(t < 10 ? 3 : 0)}의 ${a.lo}~${a.hi}배다 (${r.toFixed(2)}배)`);
  }

  /* ⑤ 🔑 사람과의 간격 — 같은 모델로 잰 **비율**만 계약입니다.
   * 이게 상단을 넘으면 라이벌이 사람보다 너무 앞서서 **그 부문 타이틀을 못 땁니다**
   * (타이틀은 career.js의 titlesWon()이 raceTop()으로 줍니다).
   * 하단을 밑돌면 반대로 리그 1위가 시시해져요. */
  const rHits = m.hits / humanHits;
  const rHr = m.hr / humanHr;
  const rAvg = m.avg / humanRate;
  check(rHits >= 1.04 && rHits <= 1.16, `⑤ ${games}경기 — 라이벌 안타 1위가 사람의 1.04~1.16배다 (${rHits.toFixed(3)}배)`);
  check(rHr >= 0.85 && rHr <= 1.20, `⑤ ${games}경기 — 라이벌 홈런 1위가 사람의 0.85~1.20배다 (${rHr.toFixed(3)}배)`);
  check(rAvg >= 0.94 && rAvg <= 1.12, `⑤ ${games}경기 — 라이벌 타율 1위가 사람의 0.94~1.12배다 (${rAvg.toFixed(3)}배)`);
}

/* ── ⑥ 감도 검사 ─────────────────────────────────────────────────────
 * 🔑 이 검사만 기준선이 **무변이 소스가 아니라 「변이를 넣은 소스」**입니다 —
 * 재는 것이 게임 동작이 아니라 **⑤의 감도**라서요.
 * 예전 검사는 살아 있는 손잡이(PA_BASE.single)를 28% 흔들어도 13/13 초록불이었습니다.
 * 🔴 되살리라는 뜻이 아닙니다. 변이는 사본에서만 돌고 원본은 안 건드려요. */
const SENS_N = 40;
const cur = +SIM_SRC.match(/single: ([\d.]+)/)[1];
const humanHits144 = humanRate * AB_PER_GAME * 144;
const shook = [];
for (const f of [0.8, 1.2]) {
  const v = +(cur * f).toFixed(4);
  const mut = loadSim((s) => s.replace(MUT_SINGLE, `single: ${v}`));
  const m = measure(mut, 144, 1000, SENS_N);
  const r = m.hits / humanHits144;
  const red = !(r >= 1.04 && r <= 1.16);
  shook.push({ f, v, r, red });
  console.log(`\n   감도 — PA_BASE.single ${cur} → ${v} (×${f}) : 안타 ${m.hits.toFixed(0)} · 사람 대비 ${r.toFixed(3)}배 ${red ? "→ ⑤ 빨간불 ✔" : "→ ⑤ 그대로 초록불"}`);
}
check(shook.every((s) => s.red),
  `⑥ 감도 — 살아 있는 손잡이를 ±20% 흔들면 ⑤가 빨간불이 된다 (${shook.map((s) => `×${s.f}:${s.r.toFixed(2)}`).join(" · ")})`);

console.log(fail ? `\n❌ ${fail}개 실패 (pass ${pass})` : `\n✅ 통과 (${pass})`);
process.exit(fail ? 1 : 0);
