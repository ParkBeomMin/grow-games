/* 목표 곡선(스펙 4.5)과 대조한다. 아래 TARGET에 박힌 범위가 실제 기준이다:
 *   능력치 70 → 대상 0~15% / 90 → 12~40% / 110 → 45~75% / 130 → 70~95% / 150 → 계속 오름
 * 핵심은 마지막 줄(150) 검사다 — hype가 앞 능력치보다 반드시 더 올라야 한다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const salesM = SRC.match(/const stage = [^;]+;\s*const cbSales = [^;]+;/);
const hypeM = SRC.match(/const hype = clamp\([^;]+;/);
if (!salesM || !hypeM) { console.log("❌ 산식을 못 찾았어요"); process.exit(1); }

function year(stat, fandom) {
  const S = { fandom, stats: { vocal: stat, dance: stat, rap: stat, charm: stat, stamina: stat }, proYear: 5 };
  let total = 0;
  for (let cb = 0; cb < 2; cb++) {
    const act = { cbWins: Math.round(rand(2, 6)) };
    const fn = new Function("S", "act", "rand", `${salesM[0]} return cbSales;`);
    total += fn(S, act, rand);
  }
  const act = { sales: total };
  const agePen = 0;
  const fn2 = new Function("act", "agePen", "clamp", `${hypeM[0]} return hype;`);
  return fn2(act, agePen, clamp);
}
const dae = (h) => { const lb = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8))); return h >= 5.5 && h >= lb; };

const TARGET = { 70: [0, 15], 90: [12, 40], 110: [45, 75], 130: [70, 95] };
let fail = 0, prev = -1;
console.log("능력치  대상%   목표      hype");
for (const stat of [70, 90, 110, 130, 150]) {
  const fandom = stat * 25;
  let d = 0, hs = 0; const N = 3000;
  for (let i = 0; i < N; i++) { const h = year(stat, fandom); hs += h; if (dae(h)) d++; }
  const pct = Math.round(d / N * 100), hy = hs / N;
  const t = TARGET[stat];
  const ok = !t || (pct >= t[0] && pct <= t[1]);
  if (!ok) fail++;
  console.log(`${String(stat).padStart(5)}  ${String(pct).padStart(4)}%  ${t ? `${t[0]}~${t[1]}%` : "  오름  "}  ${hy.toFixed(1)}  ${ok ? "✅" : "❌"}`);
  if (hy <= prev) { console.log(`   ❌ 능력치 ${stat}에서 hype가 안 올랐어요 (${prev.toFixed(1)} → ${hy.toFixed(1)})`); fail++; }
  prev = hy;
}
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 목표 곡선에 맞아요");
process.exit(fail ? 1 : 0);
