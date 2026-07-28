/* 라이벌이 해마다 강해지는지. 멈춰 있으면 뒤처져야 후반에도 키울 이유가 남는다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");
const m = SRC.match(/function rollRivals\(\)[\s\S]*?\n  \}/);
if (!m) { console.log("❌ rollRivals를 못 찾았어요"); process.exit(1); }

const rand = (a, b) => a + Math.random() * (b - a);
const RIVAL_GROUPS = ["A", "B", "C", "D", "E"];
let S;
const rollRivals = new Function("rand", "RIVAL_GROUPS", "getS", `${m[0]}; return () => { S = getS(); return rollRivals(); };`)(rand, RIVAL_GROUPS, () => S);

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const avgPop = (yr) => {
  S = { proYear: yr };
  let s = 0, n = 2000;
  for (let i = 0; i < n; i++) s += rollRivals().reduce((a, r) => a + r.pop, 0) / RIVAL_GROUPS.length;
  return s / n;
};

const y1 = avgPop(1), y5 = avgPop(5), y9 = avgPop(9);
/* 1년차는 성장 배수가 정확히 1이라 rand(52,88)의 평균 70이 그대로 나와야 한다.
 * n=2000이면 표준오차가 0.1 안쪽이라, 허용폭 0.5는 약 5σ다 — 우연히 깨지진 않으면서
 * 기준선이 1%만 밀려도 잡힌다. 예전 허용폭 3은 30σ라 몇 %가 밀려도 초록이었다. */
check(Math.abs(y1 - 70) < 0.5, `1년차 기준선이 정확히 70이다 (${y1.toFixed(2)})`);
check(y5 > y1 * 1.08, `5년차가 1년차보다 8% 넘게 강하다 (${y1.toFixed(1)} → ${y5.toFixed(1)})`);
check(y9 > y5, `9년차가 5년차보다 강하다 (${y5.toFixed(1)} → ${y9.toFixed(1)})`);
check(y9 < y1 * 1.4, `9년차가 1년차의 1.4배를 넘지 않는다 — 너무 가파르면 중위권이 무너져요 (${(y9 / y1).toFixed(2)}배)`);

/* ---------- 배선 검사 ----------
 * 위 검사는 rollRivals를 떼어내 직접 부른다. 그것만으로는 "게임이 실제로 컴백마다
 * 지금 연차로 다시 뽑는지"를 하나도 보장하지 못한다. 누군가 S.activity.rivals를
 * 데뷔 때 한 번만 만들도록 바꿔놓아도 위 검사는 전부 초록으로 남는다 — 게임 안에서는
 * 라이벌 성장이 죽어 있는데도. 그래서 initActivity/afterPrep까지 같이 뽑아서
 * 실제 흐름(연차 시작 → 1차 컴백 → 2차 컴백)을 굴려본다. */
const parts = {
  CB: /const CB_PER_YEAR = [^;]+;/,
  WK: /const WEEKS_PER_CB = [^;]+;/,
  roll: /function rollRivals\(\)[\s\S]*?\n  \}/,
  init: /function initActivity\(\)[\s\S]*?\n  \}/,
  after: /function afterPrep\(\)[\s\S]*?\n  \}/,
};
const got = {};
for (const [k, re] of Object.entries(parts)) {
  const mm = SRC.match(re);
  if (!mm) { console.log(`❌ ${k}를 못 찾았어요`); process.exit(1); }
  got[k] = mm[0];
}
// save/renderPrep/show는 화면·저장이라 여기선 무의미하다. 빈 함수로 세운다.
const wire = new Function("rand", "RIVAL_GROUPS", `
  let S;
  const save = () => {}, renderPrep = () => {}, show = () => {};
  ${got.CB}
  ${got.WK}
  ${got.roll}
  ${got.init}
  ${got.after}
  return { set: (x) => { S = x; }, get: () => S, afterPrep };
`)(rand, RIVAL_GROUPS);

const meanPop = (rs) => rs.reduce((a, r) => a + r.pop, 0) / rs.length;
// startPrep()이 하는 일: 연차를 올리고 camp를 채우고 activity를 비운다.
const runYear = (yr) => {
  const S2 = { proYear: yr, camp: 0, activity: null, pendingShow: false };
  wire.set(S2);
  wire.afterPrep();                       // 컴백 준비 끝 → 1차 컴백 시작
  const cb1 = S2.activity.rivals;
  S2.activity.week = S2.activity.weekTotal;   // 1차 컴백 6주 소진
  S2.camp = 0;
  wire.afterPrep();                       // → 2차 컴백 시작
  return { cb1, cb2: S2.activity.rivals, cbNo: S2.activity.cb };
};

const r1 = runYear(1);
check(Array.isArray(r1.cb1) && r1.cb1.length === RIVAL_GROUPS.length,
  `활동을 시작하면 라이벌이 채워진다 (${r1.cb1 && r1.cb1.length}팀)`);
check(r1.cbNo === 2, `6주가 끝나면 다음 컴백으로 넘어간다 (${r1.cbNo}차)`);
check(r1.cb2 !== r1.cb1, "컴백마다 라이벌을 새로 뽑는다 (같은 배열을 재사용하지 않는다)");

// 배선의 핵심: 다시 뽑을 때 '지금 연차'를 읽어야 한다. 데뷔 때 한 번만 만들어두면
// 아래 두 검사가 무너진다.
const yrMean = (yr, n = 300) => {
  let s = 0;
  for (let i = 0; i < n; i++) { const r = runYear(yr); s += (meanPop(r.cb1) + meanPop(r.cb2)) / 2; }
  return s / n;
};
const g1 = yrMean(1), g9 = yrMean(9);
check(g9 > g1 * 1.15,
  `게임 흐름에서도 9년차 라이벌이 1년차보다 15% 넘게 강하다 (${g1.toFixed(1)} → ${g9.toFixed(1)})`);
// 연차를 바꿔 넣었을 때 값이 따라 움직이는지 — 캐시된 라이벌이면 여기서 걸린다
const mid = yrMean(5);
check(mid > g1 && mid < g9, `연차를 올릴수록 단조롭게 강해진다 (${g1.toFixed(1)} < ${mid.toFixed(1)} < ${g9.toFixed(1)})`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
