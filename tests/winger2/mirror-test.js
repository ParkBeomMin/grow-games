/* ⚽ 더 윙어 II 1막 — 🧱 = 🥅 **수비 판은 슛 판의 거울** (20번 §4-1 R4 · 12번 §4-4 「엔진은 0줄 · 🧱는 🥅와 같은 함수」 · 26번 §2)
 *
 * 🧱 슈팅 코스 막기는 🥅 일대일 슈팅과 **같은 `runShotGrid`**를 부릅니다(25번 §2 — 산식 0줄 · 새 `Math.random` 소비 0).
 * 「보통 조작자의 E[s]가 🥅와 같다」(설계 §4-1 g)가 **구성으로** 서는 자리라, 모델로 재지 않고 **구성 자체**를 봅니다:
 *   M-1  같은 판 무대(같은 `Math.random` 흐름) · 같은 탭 시각 · 같은 칸이면 🧱의 `s`가 🥅와 **비트 단위로 같다**
 *   M-2  🧱 경로의 `Math.random` 호출 수 == 🥅 (판 모양 굴림이 안 늘었다 — 🏃 슈터는 이미 굴린 `side`에서)
 *   M-3  밝기(칸의 `opacity`)도 프레임마다 같다 — 「밝기 = 판정」이 두 배역에서 같은 한 줄을 지난다
 *   + 변이: 🧱만 `ONE_WIN` 22(20번 §4-1이 지정한 변이) → M-1 빨간불 · 🧱만 굴림 하나 더 → M-2 빨간불
 * 🔒 조작자 모델이 한 명도 안 들어갑니다 — 칸 6 × 시각 7 × 무대 24를 **전수로** 눌러요(겨냥 전략이 없음).
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const { momentDom, pressDom, momentMutsOK, mulberry32, wait } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const MUT = {
  /* 20번 §4-1 — 🧱만 난이도 손잡이를 22로(🥅는 23 그대로) */
  ONE_WIN_DEF22: [[/const cellS = \(c, a\) => sOne\(oneErr\(c\.x, a\.best\), a\.tight \* c\.mul\);/,
    'const cellS = (c, a) => sBar(oneErr(c.x, a.best), (ctx.kind === "defend" ? 22 : ONE_WIN) * a.tight * c.mul);']],
  /* 🧱만 판 모양 굴림 하나를 더 — 🏃 슈터 자리를 새로 굴림 */
  DEF_EXTRA_ROLL: [[/const shooterX = 50 \+ board\.side \* 30;/, "const shooterX = 50 + board.side * (defend ? 25 + Math.random() * 10 : 30);"]],
};
{
  const bad = momentMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식 ${Object.values(MUT).reduce((a, m) => a + m.length, 0)}개가 지금 beta/winger-moment.js에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}

const SEEDS = Array.from({ length: 24 }, (_, i) => 1009 + i * 7919);
const TIMES = [0, 120, 400, 800, 1300, 2000, 2900];
const CELLS = [0, 1, 2, 3, 4, 5];
/* 판 하나를 열고 정한 시각에 정한 칸을 누릅니다 — 시계는 검사가 쥡니다(`performance.now` · rAF에 같은 값) */
async function tapOnce(muts, kind, seed, ms, cell, cond, foot) {
  const W = momentDom(muts);
  let calls = 0;
  const rnd = mulberry32(seed);
  W.Math.random = () => { calls += 1; return rnd(); };
  let clk = 50000;
  W.performance.now = () => clk;
  W.requestAnimationFrame = (cb) => W.setTimeout(() => cb(clk), 0);
  const st = W.setTimeout; W.setTimeout = (fn) => st(fn, 0);
  const host = W.document.getElementById("host");
  let got = null;
  W.W2Moment.play(host, { kind, moment: "oneone", condition: cond, foot, keeper: "태오" }, (j, d) => { got = d; });
  await wait(4);
  const go = host.querySelector(".w2m-go");
  if (go) pressDom(W, go);
  await wait(4);
  const t0 = clk;
  clk = t0 + ms;
  await wait(4);
  const lit = [...host.querySelectorAll(".w2m-cell-lit")].map((x) => x.style.opacity).join(",");
  const el = host.querySelector(`.w2m-cell[data-i="${cell}"]`);
  const shooter = host.querySelectorAll(".w2m-shooter").length;
  if (el) pressDom(W, el);
  for (let i = 0; i < 50 && !got; i++) await wait(2);
  W.close();
  return { s: got ? got.s : null, calls, lit, shooter, opened: !!el };
}
async function sweep(muts) {
  const diffS = [], diffLit = [], diffCalls = [];
  let n = 0, nonzero = 0, opened = 0, shooters = 0;
  for (const seed of SEEDS) {
    const cond = [30, 51, 80][seed % 3], foot = seed % 2 ? "R" : "L";
    for (const ms of TIMES) {
      for (const cell of CELLS) {
        if ((seed + ms + cell) % 3 !== 0) continue;                // 🎲 격자를 고르게 솎습니다(전수의 1/3 · 무대마다 시각 · 칸이 돌아감)
        const g = await tapOnce(muts, "goal", seed, ms, cell, cond, foot);
        const d = await tapOnce(muts, "defend", seed, ms, cell, cond, foot);
        n += 1; if (g.s > 0) nonzero += 1; if (g.opened && d.opened) opened += 1; shooters += d.shooter;
        if (g.s !== d.s) diffS.push(`seed ${seed} · ${ms}ms · 칸 ${cell}: 🥅 ${g.s} ↔ 🧱 ${d.s}`);
        if (g.lit !== d.lit) diffLit.push(`seed ${seed} · ${ms}ms`);
        if (g.calls !== d.calls) diffCalls.push(`seed ${seed}: 🥅 ${g.calls} ↔ 🧱 ${d.calls}`);
      }
    }
  }
  return { n, nonzero, opened, shooters, diffS, diffLit, diffCalls };
}

(async () => {
  const b = await sweep(null);
  console.log(`   🔎 측정 조건 — 무대 ${SEEDS.length}벌 × 시각 ${TIMES.join("·")}ms × 칸 6의 1/3 = ${b.n}탭씩(🥅 · 🧱) · 컨디션 30/51/80 · 주발 L/R 돌림 · s > 0인 탭 ${b.nonzero} · 🏃 슈터 ${b.shooters}개(🧱에만)`);
  check(b.n > 100 && b.opened === b.n && b.nonzero > 20, `M-0. 🔎 판이 실제로 열리고 눌렸다 — ${b.opened}/${b.n} · 0이 아닌 s ${b.nonzero}번(전부 0이면 「같다」가 공짜예요)`);
  check(b.diffS.length === 0, `M-1. 🧱 = 🥅 — 같은 무대 · 같은 시각 · 같은 칸이면 \`s\`가 **비트 단위로 같다** (${b.n}탭 · 어긋남 ${b.diffS.length})`
    + (b.diffS.length ? `\n     🔴 ${b.diffS.slice(0, 3).join(" · ")}` : ""));
  check(b.diffCalls.length === 0, `M-2. 🎲 🧱 경로의 \`Math.random\` 호출 수 == 🥅 — 어긋난 무대 ${b.diffCalls.length}` + (b.diffCalls.length ? `\n     🔴 ${b.diffCalls.slice(0, 3).join(" · ")}` : ""));
  check(b.diffLit.length === 0, `M-3. 🔦 같은 순간 여섯 칸의 밝기(=판정)가 두 배역에서 같다 — 어긋난 프레임 ${b.diffLit.length}`);
  if (b.diffS.length === 0 && b.diffCalls.length === 0) {
    const m1 = await sweep(MUT.ONE_WIN_DEF22);
    check(m1.diffS.length > 0, `변이 — 🧱만 \`ONE_WIN\` 22 → M-1이 빨간불 (어긋난 탭 ${m1.diffS.length}/${m1.n})`);
    const m2 = await sweep(MUT.DEF_EXTRA_ROLL);
    check(m2.diffCalls.length > 0, `변이 — 🧱만 굴림 하나 더 → M-2가 빨간불 (어긋난 무대 ${m2.diffCalls.length})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
