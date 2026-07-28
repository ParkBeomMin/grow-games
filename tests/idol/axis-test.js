/* 축(초동 판매량)이 능력치에서 직접 자라는지 본다.
 * 지금은 hype에서 파생돼서, 능력치를 올려도 hype가 천장에 붙으면 같이 멈춘다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");

// 산식만 떼어내 실행한다 (원본과 어긋나면 의미가 없으니 복사가 아니라 추출)
// cbSales가 직전의 `const stage = ...;` 줄에 기대므로 그 줄도 같이 뽑아요.
const m = SRC.match(/(?:const stage = [^;]+;\s*)?const cbSales = [^;]+;/);
if (!m) { console.log("❌ cbSales 산식을 못 찾았어요"); process.exit(1); }

const rand = (a, b) => a + Math.random() * (b - a);
// `let cbSales; eval(m[0]);`로는 안 돼요 — 직접 eval은 const/let 선언에 자기만의
// 렉시컬 스코프를 주기 때문에, eval 안에서 만든 cbSales가 바깥 let으로 새지 않아요
// (실제로 해보면 산식 내용과 무관하게 항상 undefined가 나와요). 그래서 진짜 함수로
// 감싸서 리턴해요 — 이래도 산식은 여전히 정규식으로 추출한 원본 그대로예요.
const calc = (S, act) => {
  const fn = new Function("S", "act", "rand", `${m[0]} return cbSales;`);
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
