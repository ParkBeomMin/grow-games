/* 목표 곡선(스펙 4.5)과 대조한다. 아래 TARGET에 박힌 범위가 실제 기준이다:
 *   능력치 70 → 대상 0~15% / 90 → 12~40% / 110 → 45~75% / 130 → 70~95% / 150 → 계속 오름
 * 핵심은 마지막 줄(150) 검사다 — hype가 앞 능력치보다 반드시 더 올라야 한다.
 *
 * 두 세계를 각각 잰다.
 *   ① 옛 세이브 — act에 concept도 hot/cold도 없다. conceptOf가 청량을, trendMul이 1배를 준다.
 *   ② 소문 2종 — 스펙 "곡선 검증" 절이 잰 방식이다. 컴백마다 유행·식상을 굴리고,
 *      소문 후보 2종(하나는 반드시 진짜 유행) 중 기댓값이 가장 높은 컨셉을 고른다.
 *      스펙 표: 70 → 11% / 90 → 30% / 110 → 58% / 130 → 84% / 150 → 94%.
 *
 * ①만 재던 시절에는 유행 배수와 컨셉 편차가 곡선에 전혀 안 걸려 있었다. TREND_HOT을
 * 1.18 → 3.00, TREND_COLD를 0.85 → 0.10, 강렬의 v를 0.28 → 0.90으로 한꺼번에 바꿔도
 * 이 파일이 초록이었다 — act에 hot/cold가 없어서 배수 경로를 아예 안 탔기 때문이다.
 * ②가 그 구멍을 막는다. 밸런스 상수를 만질 때는 반드시 이 파일을 다시 돌린다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// 산식은 전부 소스에서 뽑는다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
const grab = (re) => { const mm = SRC.match(re); return mm ? mm[0] : null; };
const conceptsM = grab(/const CONCEPTS = \[[\s\S]*?\n  \];/);
const salesKM = grab(/const SALES_K = [^;]+;/);
const trendHotM = grab(/const TREND_HOT = [^;]+;/);
const trendColdM = grab(/const TREND_COLD = [^;]+;/);
const conceptOfM = grab(/function conceptOf\(act\) \{[\s\S]*?\n  \}/);
const trendMulM = grab(/function trendMul\(concept, act\) \{[\s\S]*?\n  \}/);
const expectedSalesM = grab(/function expectedSales\(stats, concept, fandom, cbWins\) \{[\s\S]*?\n  \}/);
const rollTrendM = grab(/function rollTrend\(\) \{[\s\S]*?\n  \}/);
const salesM = grab(/const concept = conceptOf\(act\);\s*const cbSales = [^;]+;/);
const hypeM = SRC.match(/const hype = clamp\([^;]+;/);
if (!salesM || !hypeM || !conceptsM || !conceptOfM || !trendMulM || !expectedSalesM || !rollTrendM) {
  console.log("❌ 산식을 못 찾았어요"); process.exit(1);
}

// 직접 eval은 선언이 eval 자기 스코프에 갇히니 new Function으로 감싸 return 한다
const api = new Function("rand", "randInt", `
  ${conceptsM} ${salesKM} ${trendHotM} ${trendColdM}
  ${conceptOfM} ${trendMulM} ${expectedSalesM} ${rollTrendM}
  return {
    CONCEPTS, expectedSales, trendMul, rollTrend,
    cbSales: (S, act) => { ${salesM} return cbSales; },
  };
`)(rand, randInt);
const hypeOf = new Function("act", "agePen", "clamp", `${hypeM[0]} return hype;`);

// 컴백 한 번의 초동 판매량
function comeback(S, mode) {
  const cbWins = Math.round(rand(2, 6));
  if (mode === "old") return api.cbSales(S, { cbWins });   // 옛 세이브 — 컨셉도 유행도 없다
  const tr = api.rollTrend();
  /* 소문 2종 중 기댓값이 최대인 컨셉을 고른다. 유행 배수는 아직 확정이 아니라
   * 화면에도 안 얹히므로, 플레이어가 볼 수 있는 정보만으로 고르는 셈이다. */
  let best = null, bestVal = -Infinity;
  for (const id of tr.rumor) {
    const c = api.CONCEPTS.find((x) => x.id === id);
    if (!c) continue;
    const v = api.expectedSales(S.stats, c, S.fandom, cbWins);
    if (v > bestVal) { bestVal = v; best = c; }
  }
  return api.cbSales(S, { cbWins, concept: best.id, hot: tr.hot, cold: tr.cold });
}

function year(stat, fandom, mode) {
  const S = { fandom, stats: { vocal: stat, dance: stat, rap: stat, charm: stat, stamina: stat }, proYear: 5 };
  let total = 0;
  for (let cb = 0; cb < 2; cb++) total += comeback(S, mode);
  return hypeOf({ sales: total }, 0, clamp);
}
const dae = (h) => { const lb = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8))); return h >= 5.5 && h >= lb; };

const TARGET = { 70: [0, 15], 90: [12, 40], 110: [45, 75], 130: [70, 95] };
const STATS = [70, 90, 110, 130, 150];
const N = 3000;
let fail = 0;

function runCurve(mode, label) {
  console.log(`\n=== ${label} ===`);
  console.log("능력치  대상%   목표      hype");
  let prev = -1;
  const hypes = [];
  for (const stat of STATS) {
    const fandom = stat * 25;
    let d = 0, hs = 0;
    for (let i = 0; i < N; i++) { const h = year(stat, fandom, mode); hs += h; if (dae(h)) d++; }
    const pct = Math.round(d / N * 100), hy = hs / N;
    hypes.push(hy);
    const t = TARGET[stat];
    const ok = !t || (pct >= t[0] && pct <= t[1]);
    if (!ok) fail++;
    console.log(`${String(stat).padStart(5)}  ${String(pct).padStart(4)}%  ${t ? `${t[0]}~${t[1]}%` : "  오름  "}  ${hy.toFixed(2)}  ${ok ? "✅" : "❌"}`);
    if (hy <= prev) { console.log(`   ❌ 능력치 ${stat}에서 hype가 안 올랐어요 (${prev.toFixed(2)} → ${hy.toFixed(2)})`); fail++; }
    prev = hy;
  }
  return hypes;
}

const oldHypes = runCurve("old", "① 옛 세이브 (컨셉·유행 없음 — conceptOf 기본값 청량, 배수 1)");
const rumorHypes = runCurve("rumor", "② 소문 2종 (유행·식상이 실제로 붙는 세계 — 스펙 '곡선 검증' 방식)");

/* ①과 ②의 거리 — 컨셉 선택이 값을 만들되, 육성을 덮어쓰지는 않아야 한다.
 * 스펙 "이 설계가 노리는 것"의 측정 표가 그 방향이다: 정보를 조금 주면 모든 유형이
 * 나아지되, 덜 키운 쪽은 +0이라 "선택이 육성을 대체하지 않는다".
 * 아래가 없으면 TREND_COLD를 0.85 → 0.10으로 만들어도 대상% 밴드 안에 머물러
 * 아무도 못 잡는다 — 곡선 전체가 옛 세계보다 아래로 내려가는데도. */
const GAP = [0, 1.0];
console.log(`\n=== ①→② 거리 (소문 2종이 만드는 hype 이득) — 허용 ${GAP[0]}~${GAP[1]} ===`);
for (let i = 0; i < STATS.length; i++) {
  const gap = rumorHypes[i] - oldHypes[i];
  const ok = gap >= GAP[0] && gap <= GAP[1];
  if (!ok) fail++;
  console.log(`${String(STATS[i]).padStart(5)}  ${gap >= 0 ? "+" : ""}${gap.toFixed(2)}  ${ok ? "✅" : "❌"}`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 목표 곡선에 맞아요");
process.exit(fail ? 1 : 0);
