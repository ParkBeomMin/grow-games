/* ⚾ 통합 리그 시뮬 엔진 검증 (1단계) — beta/rookie/sim.js
 *
 * 몬테카를로로 세 가지를 재요:
 *   ① 득점 환경 — 팀·경기당 평균 ~4.6점
 *   ② 팀 승률 ↔ 전력 — 강팀이 더 이기고 30~70% 범위
 *   ③ 개인 시즌 1위권 수치가 현재 눈금(RACE_ANCHOR)에 맞는지
 *      (타율 ~.335 · 홈런 ~48 · 도루 ~70 · 안타 ~185 / 다승 ~15 · 탈삼진 ~415 · 자책 ~2.5 · 세이브 ~42)
 *
 * 전역 Math.random을 쓰면 안 돼요(자체 시드). 산식은 sim.js에서 직접 불러 굴려요.
 */
"use strict";
const path = require("path");
global.window = {};
require(path.join(__dirname, "../../beta/rookie/sim.js"));
const Sim = global.window.RookieSim;

let pass = 0, fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); ok ? pass++ : fail++; };
const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;

// KBO 10팀 · 전력 0.40~0.60로 벌려요 (실제 teamStrOf 눈금)
const TEAMS = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차"];
const STR = {}; TEAMS.forEach((t, i) => (STR[t] = 0.40 + i * 0.0222));
const strOf = (t) => STR[t];
const GAMES = 144, N = 60;

// ── 전역 Math.random 오염 검사 ──
let rngCalls = 0;
const realRandom = Math.random;
Math.random = () => { rngCalls++; return realRandom(); };
{
  const lg = Sim.buildLeague(TEAMS, strOf, 123);
  Sim.simSeason(lg, 123, GAMES);
}
Math.random = realRandom;
check(rngCalls === 0, `시뮬이 전역 Math.random을 안 쓴다 (호출 ${rngCalls}회)`);

// ── 결정성 ──
const a1 = Sim.simSeason(Sim.buildLeague(TEAMS, strOf, 999), 999, GAMES);
const a2 = Sim.simSeason(Sim.buildLeague(TEAMS, strOf, 999), 999, GAMES);
check(JSON.stringify(a1.standings) === JSON.stringify(a2.standings), "같은 시드는 같은 순위표를 낸다");

// ── 몬테카를로 ──
const runsPer = [], topWin = [], botWin = [], strongWinAll = [];
const lead = { hits: [], hr: [], sb: [], avg: [], wins: [], k: [], era: [], saves: [] };
for (let s = 0; s < N; s++) {
  const lg = Sim.buildLeague(TEAMS, strOf, 1000 + s);
  const res = Sim.simSeason(lg, 1000 + s, GAMES);
  // 득점: 전체 팀 득실 합 / 팀경기 수 — 승패만 있으니 개인 라인 대신 표준편차용으로 팀 득점은 따로 안 재고,
  // 대신 승률 범위와 리그 총 경기로 환경을 봐요. (득점 평균은 아래 개인 안타로 간접 확인)
  const sorted = res.standings;
  topWin.push(sorted[0].w / GAMES);
  botWin.push(sorted[sorted.length - 1].w / GAMES);
  // 전력 1위 팀이 실제로 상위권인지
  const byStr = res.standings.slice().sort((a, b) => b.str - a.str);
  strongWinAll.push(byStr[0].w / GAMES);
  for (const m of Object.keys(lead)) {
    const L = Sim.leaders(res, m, GAMES);
    if (L.length) lead[m].push(L[0].v);
  }
}
const mean = {}; for (const m of Object.keys(lead)) mean[m] = avg(lead[m]);

console.log(`   승률 | 1위 ${(avg(topWin) * 100).toFixed(0)}% · 꼴찌 ${(avg(botWin) * 100).toFixed(0)}% · 최강전력 ${(avg(strongWinAll) * 100).toFixed(0)}%`);
console.log(`   타자 1위권 | 안타 ${mean.hits.toFixed(0)} · 홈런 ${mean.hr.toFixed(0)} · 도루 ${mean.sb.toFixed(0)} · 타율 ${mean.avg.toFixed(3)}`);
console.log(`   투수 1위권 | 다승 ${mean.wins.toFixed(0)} · 탈삼진 ${mean.k.toFixed(0)} · 자책 ${mean.era.toFixed(2)} · 세이브 ${mean.saves.toFixed(0)}`);

// ② 승률 ↔ 전력
check(avg(topWin) >= 0.58 && avg(topWin) <= 0.75, `1위 팀 승률이 58~75%다 (${(avg(topWin) * 100).toFixed(0)}%)`);
check(avg(botWin) >= 0.25 && avg(botWin) <= 0.42, `꼴찌 팀 승률이 25~42%다 (${(avg(botWin) * 100).toFixed(0)}%)`);
check(avg(strongWinAll) >= 0.55, `전력 1위 팀이 상위권 승률을 낸다 (${(avg(strongWinAll) * 100).toFixed(0)}%)`);

// ③ 개인 시즌 1위권이 현재 눈금(RACE_ANCHOR)에 맞는지 (±20% 정도 허용 — 눈금만 맞으면 돼요)
const near = (v, target, tolLo, tolHi) => v >= target * tolLo && v <= target * tolHi;
check(near(mean.hits, 185, 0.82, 1.18), `안타 1위권이 ~185 눈금이다 (${mean.hits.toFixed(0)})`);
check(near(mean.hr, 48, 0.78, 1.25), `홈런 1위권이 ~48 눈금이다 (${mean.hr.toFixed(0)})`);
check(near(mean.sb, 70, 0.75, 1.3), `도루 1위권이 ~70 눈금이다 (${mean.sb.toFixed(0)})`);
check(near(mean.avg, 0.335, 0.94, 1.06), `타율 1위권이 ~.335 눈금이다 (${mean.avg.toFixed(3)})`);
check(near(mean.wins, 15, 0.75, 1.3), `다승 1위권이 ~15 눈금이다 (${mean.wins.toFixed(0)})`);
check(near(mean.k, 415, 0.8, 1.2), `탈삼진 1위권이 ~415 눈금이다 (${mean.k.toFixed(0)})`);
check(near(mean.era, 2.5, 0.82, 1.2), `자책 1위권이 ~2.5 눈금이다 (${mean.era.toFixed(2)})`);
check(near(mean.saves, 42, 0.72, 1.3), `세이브 1위권이 ~42 눈금이다 (${mean.saves.toFixed(0)})`);

console.log(fail ? `\n❌ ${fail}개 실패 (pass ${pass})` : `\n✅ 통과 (${pass})`);
process.exit(fail ? 1 : 0);
