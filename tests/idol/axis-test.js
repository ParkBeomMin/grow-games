/* 축(초동 판매량)이 능력치에서 직접 자라는지 본다.
 * 지금은 hype에서 파생돼서, 능력치를 올려도 hype가 천장에 붙으면 같이 멈춘다.
 *
 * 컴백 컨셉(Task 1)이 들어오면서 cbSales는 더는 단일 식이 아니라
 * CONCEPTS/conceptOf/trendMul/expectedSales를 조합한 결과다. act에 concept이
 * 없으면 conceptOf가 청량(cool)으로 기본값을 주므로, 아래 mk()는 옛 세이브와
 * 같은 조건(컨셉 미지정)에서 능력치만 다르게 두고 잰다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");

// 산식만 떼어내 실행한다 (원본과 어긋나면 의미가 없으니 복사가 아니라 추출)
// cbSales가 conceptOf/trendMul/expectedSales와 CONCEPTS 표에 기대므로 다 같이 뽑아요.
const grab = (re) => { const mm = SRC.match(re); return mm ? mm[0] : null; };
const parts = {
  concepts: grab(/const CONCEPTS = \[[\s\S]*?\n  \];/),
  salesK: grab(/const SALES_K = [^;]+;/),
  trendHot: grab(/const TREND_HOT = [^;]+;/),
  trendCold: grab(/const TREND_COLD = [^;]+;/),
  conceptOf: grab(/function conceptOf\(act\) \{[\s\S]*?\n  \}/),
  trendMul: grab(/function trendMul\(concept, act\) \{[\s\S]*?\n  \}/),
  expectedSales: grab(/function expectedSales\(stats, concept, fandom, cbWins\) \{[\s\S]*?\n  \}/),
  sales: grab(/const concept = conceptOf\(act\);\s*const cbSales = [^;]+;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }
const m = { 0: parts.sales };   // 아래 cbHype 검사가 쓰는 원본 텍스트

const rand = (a, b) => a + Math.random() * (b - a);
// `let cbSales; eval(m[0]);`로는 안 돼요 — 직접 eval은 const/let 선언에 자기만의
// 렉시컬 스코프를 주기 때문에, eval 안에서 만든 cbSales가 바깥 let으로 새지 않아요
// (실제로 해보면 산식 내용과 무관하게 항상 undefined가 나와요). 그래서 진짜 함수로
// 감싸서 리턴해요 — 이래도 산식은 여전히 정규식으로 추출한 원본 그대로예요.
const calc = (S, act) => {
  const fn = new Function("S", "act", "rand",
    `${parts.concepts} ${parts.salesK} ${parts.trendHot} ${parts.trendCold}
     ${parts.conceptOf} ${parts.trendMul} ${parts.expectedSales} ${parts.sales} return cbSales;`);
  return fn(S, act, rand);
};

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// 능력치만 다르고 나머지가 같은 두 상황
const mk = (stat) => ({
  S: { fandom: 1000, stats: { vocal: stat, dance: stat, rap: stat, charm: stat, stamina: stat } },
  act: { cbWins: 6, cbHype: 8 },
});
const avg = (stat, n = 400) => {
  let s = 0;
  for (let i = 0; i < n; i++) { const x = mk(stat); s += calc(x.S, x.act); }
  return s / n;
};

const lo = avg(70), hi = avg(130);
check(hi > lo * 1.3, `능력치 130이 70보다 판매량이 30% 넘게 많다 (${lo.toFixed(0)} → ${hi.toFixed(0)})`);
check(!/cbHype/.test(m[0]), `판매량이 hype에 의존하지 않는다 — "${m[0]}"`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
