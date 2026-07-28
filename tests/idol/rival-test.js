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
  let s = 0, n = 400;
  for (let i = 0; i < n; i++) s += rollRivals().reduce((a, r) => a + r.pop, 0) / RIVAL_GROUPS.length;
  return s / n;
};

const y1 = avgPop(1), y5 = avgPop(5), y9 = avgPop(9);
check(Math.abs(y1 - 70) < 3, `1년차는 지금과 같다 (${y1.toFixed(1)})`);
check(y5 > y1 * 1.08, `5년차가 1년차보다 8% 넘게 강하다 (${y1.toFixed(1)} → ${y5.toFixed(1)})`);
check(y9 > y5, `9년차가 5년차보다 강하다 (${y5.toFixed(1)} → ${y9.toFixed(1)})`);
check(y9 < y1 * 1.4, `9년차가 1년차의 1.4배를 넘지 않는다 — 너무 가파르면 중위권이 무너져요 (${(y9 / y1).toFixed(2)}배)`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
