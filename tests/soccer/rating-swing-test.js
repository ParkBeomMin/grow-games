/* 그 경기에 한 일이 평점을 실제로 움직이는지 본다.
 *
 * 제보: **5:2로 이긴 경기에서 2골 2도움을 넣었는데 평점 7.4에 7위.**
 * 재 보니 두 가지가 겹쳐 있었다.
 *   ① 눈금이 달랐다 — 내 점수는 능력치×10 + 활약(평균 59), 라이벌은 명성 그대로(평균 70).
 *      같은 표에 다른 자로 잰 숫자를 나란히 놓았다.
 *   ② 활약이 평점을 움직이는 폭이 작았다 — 2골 2도움이 +1.1점뿐.
 *
 * 그래서 여기서 지키는 건 "잘한 경기와 조용한 경기가 화면에서 갈리는가"다.
 * 절대값 하나를 고정하지 않는다 — 산식이 조금 움직여도 되지만 **차이는 남아야** 한다.
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 실행한다. 직접 eval은 쓰지 않는다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  posAxisTbl: grab(SRC, /const POS_AXIS = \{[\s\S]*?\n  \};/),
  posAxisFn: grab(SRC, /function posAxis\(act, pos\) \{[\s\S]*?\n  \}/),
  perfNow: grab(SRC, /const perfNow = clamp\([^;]+;/),
  axisNow: grab(SRC, /const axisNow = posAxis\([^;]+;/),
  axisK: grab(SRC, /const AXIS_UP = [^;]+;/),
  axisGap: grab(SRC, /const axisGap = [^;]+;/),
  done: grab(SRC, /const doneBonus = axisGap[^;]+;/),
  result: grab(SRC, /const resultBonus = [^;]+;/),
  score: grab(SRC, /const myRankScore = [^;]+;/),
  pull: grab(SRC, /const RIVAL_POP_PULL = [^;]+;/),
  adj: grab(SRC, /const rivalResAdj = [^;]+;/),
  rows: grab(SRC, /const rows = \[\s*\{ name: S\.name[\s\S]*?\]\.sort\([^;]*\);/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

/* 표시 평점 하나를 뽑는다. 흔들림(rand(-4,4))이 섞이므로 여러 번 돌려 평균을 본다. */
const showRating = new Function(
  "S", "info", "rating", "momAdj", "clamp", "rand",
  `${parts.posAxisTbl}
   ${parts.posAxisFn}
   ${parts.perfNow}
   ${parts.axisNow}
   ${parts.axisK}
   ${parts.axisGap}
   ${parts.done}
   ${parts.result}
   ${parts.score}
   return clamp(myRankScore / 10, 1, 10);`
);
const N = 20000;
const avgRating = (info, rating, pos) => {
  let s = 0;
  for (let i = 0; i < N; i++) s += showRating({ pos }, info, rating, 0, clamp, rand);
  return s / N;
};

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ① 제보 그 경기 — 능력치 평점 6.0 공격수가 2골 2도움을 넣고 이겼다
const big = avgRating({ myGoals: 2, assists: 2, defense: 1, res: "W" }, 6.0, "fw");
const quiet = avgRating({ myGoals: 0, assists: 0, defense: 0, res: "W" }, 6.0, "fw");
const one = avgRating({ myGoals: 1, assists: 0, defense: 0, res: "W" }, 6.0, "fw");
console.log(`   능력치 평점 6.0 공격수 — 0골 ${quiet.toFixed(2)} · 1골 ${one.toFixed(2)} · 2골2도움 ${big.toFixed(2)}`);
check(big >= 7.8, `2골 2도움 승리는 8점 가까이 나온다 (${big.toFixed(2)}) — 제보 당시엔 7.4였어요`);
check(big - quiet >= 2.6, `잘한 경기와 조용한 경기가 2.6점 넘게 벌어진다 (${(big - quiet).toFixed(2)}점)`);
check(one > quiet, `1골이라도 넣으면 조용한 경기보다는 높다 (${one.toFixed(2)} > ${quiet.toFixed(2)})`);

/* 제보의 핵심은 숫자가 아니라 **순위**였다("2골 2도움인데 7위").
 * 평점 하나만 보면 라이벌 쪽이 어떻게 움직였는지가 안 보이므로, 실제 표를 만들어
 * 그 경기가 몇 위에 앉는지 센다. 예전 산식으로는 평균 4.2위 · 3위 안 33%였다. */
const rivalScoreFor = new Function(
  "r", "roundRes", "rand",
  `${parts.pull}
   ${parts.adj}
   return 70 + (r.pop - 70) * RIVAL_POP_PULL + rand(-6, 6) + rivalResAdj(roundRes[r.club]);`
);
let rankSum = 0, top3 = 0;
for (let i = 0; i < N; i++) {
  const my = showRating({ pos: "fw" }, { myGoals: 2, assists: 2, defense: 1, res: "W" }, 6.0, 0, clamp, rand) * 10;
  let above = 0;
  for (let k = 0; k < 8; k++) {
    const res = Math.random() < 0.4 ? "W" : Math.random() < 0.6 ? "D" : "L";
    if (rivalScoreFor({ pop: rand(52, 88), club: "X" }, { X: res }, rand) > my) above++;
  }
  rankSum += above + 1;
  if (above < 3) top3++;
}
const avgRank = rankSum / N, top3Pct = top3 / N * 100;
console.log(`   그 경기의 순위 — 평균 ${avgRank.toFixed(2)}위 · 3위 안 ${top3Pct.toFixed(1)}%`);
check(avgRank < 3.6, `2골 2도움 경기가 평균 3위권에 앉는다 (${avgRank.toFixed(2)}위) — 예전엔 4.2위`);
check(top3Pct > 55, `3위 안에 드는 경우가 절반을 넘는다 (${top3Pct.toFixed(1)}%) — 예전엔 33%`);

/* ② 조용한 경기가 지나치게 깎이면 안 된다. 배수를 그냥 올리면 여기가 무너진다 —
 * 실제로 대칭 배수(×12)로 재 보니 0골이 4.73 → 4.07까지 떨어졌다. */
check(quiet >= 4.6, `조용한 경기가 재앙처럼 보이지 않는다 (${quiet.toFixed(2)} ≥ 4.6)`);

// ── ③ 승패도 평점에 남는다
const won = avgRating({ myGoals: 1, assists: 1, defense: 0, res: "W" }, 6.0, "fw");
const lost = avgRating({ myGoals: 1, assists: 1, defense: 0, res: "L" }, 6.0, "fw");
check(won > lost, `같은 활약이면 이긴 경기가 높다 (${won.toFixed(2)} > ${lost.toFixed(2)})`);

// ── ④ 포지션이 손해 보지 않는다 — 수비수의 수비 4회가 공격수의 1골에 밀리지 않아야
const dfWork = avgRating({ myGoals: 0, assists: 0, defense: 5, res: "W" }, 6.0, "df");
console.log(`   수비수 5수비 ${dfWork.toFixed(2)} · 공격수 1골 ${one.toFixed(2)}`);
check(dfWork > one, `수비수가 몸으로 막은 경기도 제대로 쳐준다 (${dfWork.toFixed(2)} > ${one.toFixed(2)})`);

// ── ⑤ 내 눈금과 라이벌 눈금이 같은 자리에 있다
const rivalScore = new Function(
  "r", "roundRes", "rand",
  `${parts.pull}
   ${parts.adj}
   return 70 + (r.pop - 70) * RIVAL_POP_PULL + rand(-6, 6) + rivalResAdj(roundRes[r.club]);`
);
let rvSum = 0, rvTop = 0;
for (let i = 0; i < N; i++) {
  let best = -1e9;
  for (let k = 0; k < 8; k++) {
    const res = Math.random() < 0.4 ? "W" : Math.random() < 0.6 ? "D" : "L";
    const s = rivalScore({ pop: rand(52, 88), club: "X" }, { X: res }, rand);
    rvSum += s; if (s > best) best = s;
  }
  rvTop += best;
}
const rvAvg = rvSum / N / 8 / 10, rvMax = rvTop / N / 10;
const myAvgOk = avgRating({ myGoals: 1, assists: 1, defense: 1, res: "D" }, 6.0, "fw");
console.log(`   라이벌 8명 평균 ${rvAvg.toFixed(2)} · 최고 ${rvMax.toFixed(2)} · 내 평범한 경기 ${myAvgOk.toFixed(2)}`);
check(Math.abs(rvAvg - 7.0) < 0.6, `라이벌 평균이 7점 언저리다 (${rvAvg.toFixed(2)}) — 명성을 평균 쪽으로 당겨요`);
check(big > rvAvg, `2골 2도움이면 라이벌 평균은 넘는다 (${big.toFixed(2)} > ${rvAvg.toFixed(2)})`);
check(big < rvMax + 1.0, `그래도 라이벌 최고를 항상 이기지는 않는다 (${big.toFixed(2)} vs 최고 ${rvMax.toFixed(2)})`);

/* ── 변이 검증 — 배수를 옛 대칭(×8)으로 되돌리면 ①이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const brokenDone = "const doneBonus = axisGap * 8;";
const brokenRating = new Function(
  "S", "info", "rating", "momAdj", "clamp", "rand",
  `${parts.posAxisTbl}\n${parts.posAxisFn}\n${parts.perfNow}\n${parts.axisNow}\n${parts.axisGap}\n` +
  `${brokenDone}\n${parts.result}\n${parts.score}\n return clamp(myRankScore / 10, 1, 10);`
);
let bs = 0;
for (let i = 0; i < N; i++) bs += brokenRating({ pos: "fw" }, { myGoals: 2, assists: 2, defense: 1, res: "W" }, 6.0, 0, clamp, rand);
const brokenBig = bs / N;
check(brokenBig < 8.0, `변이 검증 — 옛 배수(×8)로 되돌리면 2골 2도움이 ${brokenBig.toFixed(2)}로 떨어진다`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
