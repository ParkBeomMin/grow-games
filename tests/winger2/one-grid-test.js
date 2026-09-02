/* 🥅🔲 ⚽ 더 윙어 II — **1대1 격자: 밝기가 곧 판정인가**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 이 파일이 생긴 이유 — **판정이 옮겨 갔는데 검사는 옛 마크업만 봤습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 2026-09-02, 🥅 1대1이 **자유 좌표 → 5칸 격자**가 됐습니다(113번).
 * 판정은 이제 `.w2m-cell` 다섯 칸이 하고, `.w2m-half`(색으로 갈린 절반)는 **장식**이에요.
 * 그런데 `tests/` 전체에서:
 *   · `w2m-cell` · `oneAt` · `oneRoll`을 읽는 자리가 **0곳**
 *   · `foot-map-test.js` F절은 **`.w2m-half`만** 읽습니다 — 장식끼리 대조하고 있었어요
 * 🔴 그래서 **🦶 주발을 「칸 쪽」에서 뒤집으면 아무도 안 봅니다.**
 *    화면(반쪽 색·칸 클래스)끼리는 여전히 일관되고, **판정만 반대**가 됩니다 —
 *    **2026-08-29 사고와 정확히 같은 형태**예요(그때는 화면이 판정과 반대를 가리켰습니다).
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 값을 고치기 전에 여기부터 여세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-09-02 · engineer 113번 · designer 112번 §11)
 *
 *   · 🥅는 **골문 5칸**이고 `onTap`은 **`.w2m-goal` 하나**에만 달립니다(탭 자리 6 유지)
 *   · 🔑 **밝기(`opacity`)가 곧 그 칸의 `s`**입니다 — 그려진 것과 판정하는 것이 같은 값
 *   · 🦶 주발 쪽 절반의 칸이 **더 넓게** 밝습니다 (판정 창 ±25%가 그대로 밝기)
 *   · 🧤 키퍼가 각을 좁힙니다 — **「좋은 지점」은 거의 안 움직이고 창만 좁아져요**
 *   · `.w2m-half` · `.w2m-keeper-body` · `.w2m-stake`는 **일부러 살렸습니다**(다른 검사가 봐요)
 *
 * ⚠️ **뒤집히면 이 파일이 옛 계약이 되는 판정**
 *   · *"자유 좌표로 되돌리자"* → G-1·G-2·G-3·G-4가 통째로 옛 계약입니다
 *   · *"밝기에 보정 곡선을 얹자"* → **G-2가 그 판정을 막는 유일한 자리**예요.
 *     얹기로 정했다면 값을 고치지 말고 **먼저 여기를 여세요**
 *   · 🥅 판정 줄(`cellS`)의 구조 계약(`sBar` 한 함수 · `상수 × mul`)은 여기가 아니라
 *     **`moment-test.js` E절**이 봅니다. 둘을 섞지 않았습니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `momentDom`이 `new Function` 없이 창에 실어요(직접 eval 아님)
 *   ② **산식은 소스에서** — 「좋은 지점」은 소스가 내보낸 `_t.oneAt`을 **그대로 부릅니다**.
 *      **문턱은 여기 박고**(EPS · 최소 표본 · 시각 4점), **종속값은 관계로**
 *      (판정 창은 **화면에서 역산**하고, 🦶는 **좌우 부등호**로 봅니다 — 값을 안 베꼈어요)
 *   ③ **화면을 통해** — 실제로 판을 띄우고 실기기 순서(pointerdown→pointerup→click)로 칸을 누릅니다
 *   ④ **시드 하나로 안 잽니다** — 판 16벌(🦶는 R·L 두 벌씩 = 32창)
 *   ⑤ **기준선이 초록불인 것을 먼저 찍고** 변이를 겁니다. 그리고 **기준선도 뭔가를 봅니다** —
 *      「쓸 만한 표본 수」에 바닥을 박아 뒀어요(0개여서 조용히 통과하는 길을 막습니다)
 *
 * ⏱️ **시계를 얼립니다.** `performance.now()`와 rAF에 **같은 값**을 물려서,
 *    그려진 밝기와 눌렀을 때의 판정이 **정확히 같은 순간**을 보게 합니다.
 *    (안 얼리면 그 사이에 창이 좁아져 「밝기 = 판정」을 잴 수가 없어요)
 *
 * ⏱️ **약 90초 걸립니다** — 판을 여러 시각에서 32~64창씩 열고, 변이 9종을 각각 다시 돌려요.
 *    멈춘 게 아닙니다(`raf-test.js`가 70초인 것과 같은 이유예요).
 *
 * 📐 **문턱을 어디에 뒀나 — 손잡이를 흔들어 보고 정했습니다**
 *    G-2의 「예고와 갈리는 표본」 바닥 10은 난이도 손잡이를 쓸어 보고 잡았어요:
 *      `ONE_WIN` 17 → 22/64 · 23 → 18/64 · 30 → 16/64   (바닥 10 · 여유 1.6~2.2배)
 *    🔴 처음엔 바닥 8에 실측 13이었는데, `ONE_WIN`이 한 번 움직이자 10으로 내려왔습니다
 *       (여유 1.25배). **기준선 옆에 붙은 문턱**이라 계수가 한 번만 더 움직이면
 *       고장이 아니라 **우연으로 빨간불**이 났을 거예요. 그래서 재는 순간을 둘로 늘렸습니다 —
 *       🔑 **문턱을 낮추는 것보다 표본을 키우는 쪽이 낫습니다**(문장이 안 약해져요).
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가:
 *     칸 경계선이 눈에 보이는지 · 밝은 칸이 «누를 곳»으로 읽히는지 · 손가락에 맞는 칸 폭 ·
 *     키퍼가 «각을 좁힌다»로 읽히는지 · 격자가 자유 좌표보다 재미있는지.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 */
"use strict";
const { momentDom, pressDom, momentMutsOK } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const SEEDS = [];
for (let i = 1; i <= 16; i++) SEEDS.push(i * 7 + 1);        // 🎲 판 16벌
/* ⏱️ G-3만 **판을 더 많이 봅니다.** 역산이 되려면 조건이 셋(둘 다 밝음 · 「좋은 지점」이 사이 ·
 *    🏔️ 바닥이 안 걸림) 다 맞아야 해서 **수확이 적어요** — 16벌에서는 4벌뿐이었습니다.
 * 🔒 표본이 문턱 바로 옆에 서면 **고장이 아니라 우연으로 빨간불**이 납니다. 그래서 늘렸어요. */
const WIN_SEEDS = [];
for (let i = 1; i <= 48; i++) WIN_SEEDS.push(i * 13 + 5);
/* 🔑 `opacity`는 `toFixed(3)`으로 찍힙니다 — 그 **반올림 폭의 절반**이 허용치예요.
 *    잡음에 준 여유가 아니라 **자릿수**입니다. 변이(×0.5)는 이보다 200배 넘게 벌어져요. */
const EPS = 5e-4;
const TIMES = [0, 800, 1600, 2400];                        // ⏱️ 재는 시각(ms)
const FLIP_T = 600;                                        // 🦶 좌우를 견주는 시각
/* 🔒 **표본 바닥** — 이만큼은 「쓸 만한」 자료가 나와야 문장이 성립합니다.
 *    실측(판 16벌)은 G-1 28쌍 · G-3 9판이었어요. 바닥은 그 절반쯤에 뒀습니다 —
 *    기준선 옆에 붙이면 판 하나가 흔들릴 때 **고장이 아니라 우연으로** 빨간불이 나요. */
const MIN_FLIP = 14;
const MIN_WIN = 4;
/* 🔮 **예고 띠와 지금 밝기가 실제로 갈리는 표본**이 이만큼은 있어야 G-2가 뜻을 가집니다.
 *    둘이 늘 같으면 «판정이 지금 밝기와 같다»가 «예고와 같다»와 구분이 안 돼요 —
 *    그 상태의 초록불은 아무것도 안 지킵니다. 갈림의 문턱 0.05도 여기 박습니다. */
/* 🔒 **문턱을 기준선 옆에 붙이지 않습니다.** 처음에 바닥 8을 잡았더니 실측이 13이었는데,
 *    `ONE_WIN`이 17 → 23으로 한 번 움직이자 **10으로 내려왔습니다**(여유 1.25배).
 *    계수가 한 번만 더 움직이면 **고장이 아니라 우연으로 빨간불**이 나는 자리예요.
 *    ✅ 그래서 **재는 순간을 둘로 늘리고**(아래 `PRESS_T`) 바닥을 낮췄습니다 —
 *       표본을 키우는 쪽이 문턱을 낮추는 쪽보다 낫습니다(문장이 안 약해져요). */
const MIN_GAP = 10;
const GAP_MIN = 0.05;
/* 👆 G-2가 칸을 누르는 순간들. **둘 이상**이라야 「밝기 = 판정」이 한 순간의 우연이 아니에요 */
const PRESS_T = [300, 1200];

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 — **0번이 먼저 소스와 대조합니다**
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 M1 — **밝기에 보정을 얹습니다.** 화면이 판정보다 어두워요.
   *    «보이는 것이 곧 판정»(원칙 ③)이 깨지는데 **판정 자체는 멀쩡**해서 조용히 지나갑니다. */
  M1_DIM: [[/ {8}c\.lit\.style\.opacity = v\.toFixed\(3\);/,
    "        c.lit.style.opacity = (v * 0.5).toFixed(3);"]],
  /* 🔴 M2 — 🦶 **판정만 좌우를 뒤집습니다.** `.w2m-half`도 칸의 `w2m-strong` 클래스도
   *    그대로라 **화면끼리는 완벽히 일관**됩니다 — 2026-08-29 사고와 같은 형태예요. */
  M2_FOOT_FLIP: [[/const cellMul = \(cx\) => winMul\(ctx\.condition, cx === 50 \? 1 : \(\(cx > 50\) === right \? STRONG : WEAK\)\);/,
    "const cellMul = (cx) => winMul(ctx.condition, cx === 50 ? 1 : ((cx > 50) === right ? WEAK : STRONG));"]],
  /* 🔴 M2b — 그 반대. **화면(칸 클래스)만** 뒤집고 판정은 그대로. */
  M2B_CLASS_FLIP: [[/cells\.push\(\{ i, x: cx, mul: cellMul\(cx\), strong: cx !== 50 && \(cx > 50\) === right \}\);/,
    "cells.push({ i, x: cx, mul: cellMul(cx), strong: cx !== 50 && (cx > 50) !== right });"]],
  /* 🔴 M3 — ⏱️ **각이 안 좁아집니다.** 기다려도 손해가 없어져요(판이 통째로 장식이 됩니다). */
  M3_TIGHT1: [[/ {6}tight: 1 - ONE_CLOSE \* p \};/, "      tight: 1 };"]],
  /* 🔴 M4 — 👆 **어디를 눌러도 같은 칸.** 화면은 다섯 칸인데 판정은 한 칸이에요. */
  M4_SAME_CELL: [[/ {6}if \(hit && hit\.dataset && hit\.dataset\.i != null\) return clamp\(Number\(hit\.dataset\.i\), 0, ONE\.cells - 1\);/,
    "      if (hit && hit.dataset && hit.dataset.i != null) return 2;"]],
  /* 🔴 M5 — 🦶🫀♿ **칸의 배수를 판정에서 뺍니다.** 주발도 컨디션도 확대도 🥅에서만 사라져요. */
  M5_NO_MUL: [[/const cellS = \(c, a\) => sOne\(oneErr\(c\.x, a\.best\), a\.tight \* c\.mul\);/,
    "const cellS = (c, a) => sOne(oneErr(c.x, a.best), a.tight);"]],
  /* 🔴 M6 — 🧤 **「좋은 지점」이 늘 한가운데.** 키퍼가 어디 서 있든 상관이 없어집니다
   *    (무대가 있는 척하는 무대 — 판이 신호 하나짜리가 돼요). */
  M6_BEST50: [[/ {6}best: left \? \(near \+ 100\) \/ 2 : near \/ 2,/, "      best: 50,"]],
  /* 🔴 M8 — 🔮 **예고 띠를 판정에 씁니다.** 소스가 *"⛔ 예고 띠를 판정에 쓰지 마세요 —
   *    그 순간 규칙이 둘이 되고, 화면이 결과를 만드는 자리가 됩니다"*라고 못 박은 자리예요.
   *    🔑 눈으로는 **아무것도 안 달라 보입니다** — 밝기도 예고도 그대로 그려지니까요. */
  M8_NEXT_JUDGES: [[/ {6}const s = cellS\(c, a\);/,
    "      const s = cellS(c, oneAt(board, (nowMs() - t0) \/ 1000 + ONE.look \/ 1000));"]],
  /* 🔮 M9 — **미래 흘리기의 손잡이만** 흔듭니다(0.45초 → 1.5초). 변이가 아니라 **자**예요:
   *    화면은 달라지고 **`s`는 한 톨도 안 달라져야** 합니다(G-7). 아래 M9_0은 반대쪽 끝. */
  M9_LOOK_LONG: [[/look: 450,/, "look: 1500,"]],
  M9_LOOK_ZERO: [[/look: 450,/, "look: 0,"]],
  /* 🔴 M7 — 🗣️ **폐기한 낱말을 되살립니다.** 「판정 창」은 만든 사람의 말이에요. */
  M7_WORD: [[/head\(ctx\.stake, ctx\.title, "키퍼가 지운 반대쪽 — 가장 밝은 칸을 누르세요"\)/,
    'head(ctx.stake, ctx.title, "판정 창이 가장 넓은 코스 칸을 누르세요")']],
};

/* ══════════════════════════════════════════════════════════════
 * 🎬 판 하나를 띄웁니다 — **시계를 얼린 채**
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BASE = 1e5;                                   // ⏱️ 얼린 시계의 출발점
async function open(o) {
  const W = momentDom(o.muts);
  /* 🎲 무대(`oneRoll`)는 `Math.random()`을 **직접** 부릅니다(엔진의 `_rng`를 안 지나요) */
  W.Math.random = mulberry32(o.seed);
  let clk = BASE;
  W.performance.now = () => clk;
  /* 🔒 rAF에 **`nowMs()`와 같은 값**을 물립니다 — 그래야 그림과 판정이 같은 순간이에요 */
  W.requestAnimationFrame = (cb) => W.setTimeout(() => cb(clk), 0);
  const st = W.setTimeout;
  W.setTimeout = (fn) => st(fn, 0);                 // ⏳ `ender`의 620ms 지연만 뭉갭니다
  const host = W.document.getElementById("host");
  let info = null;
  W.W2Moment.play(host, { moment: "oneone", kind: "goal", condition: 80, foot: o.foot || "R" },
    (j, i2) => { info = i2; });
  await wait(6);
  /* ▶️ 준비 화면을 실기기 순서로 지납니다 — **게임이 여는 문으로** 들어가요 */
  const go = host.querySelector(".w2m-go");
  if (go) { pressDom(W, go); await wait(6); }
  return {
    W, host, T: W.W2Moment._t,
    s: () => (info ? info.s : null),
    at: async (ms) => { clk = BASE + ms; await wait(6); },
    close: () => { try { W.close(); } catch (e) { /* 이미 닫힘 */ } },
  };
}
/* 🔎 화면이 지금 말하는 것 — **밝기 · 칸의 강/약 · 키퍼 자리**를 전부 화면에서 읽습니다 */
const cellsOf = (h) => Array.from(h.host.querySelectorAll(".w2m-cell")).map((c) => ({
  i: Number(c.dataset.i),
  x: (Number(c.dataset.i) + 0.5) * (100 / h.host.querySelectorAll(".w2m-cell").length),
  strong: c.classList.contains("w2m-strong"),
  op: Number(c.querySelector(".w2m-cell-lit").style.opacity),
  /* 🔮 **예고 띠** — `ONE.look` 뒤의 밝기예요. **판정이 아닙니다**(소스: "⛔ 예고 띠를
   *    판정에 쓰지 마세요 — 그 순간 규칙이 둘이 되고, 화면이 결과를 만드는 자리가 됩니다").
   *    G-2가 「판정 = 지금 밝기」를 지키려면 **이 둘이 실제로 달라야** 해요 — 아래 `gap`. */
  next: Number(((c.querySelector(".w2m-cell-next") || {}).style || {}).opacity || 0),
  el: c,
}));
const kcOf = (h) => {
  const m = (h.host.querySelector(".w2m-keeper") || { style: {} }).style.transform || "";
  const g = m.match(/translateX\(([-\d.]+)%\)/);
  return g ? Number(g[1]) : NaN;
};
/* 🦶 **반쪽 색이 어느 쪽을 강하다고 말하나** — 장식이지만, 판정과 대조할 값이에요 */
const halfStrongRight = (h) => {
  const hs = Array.from(h.host.querySelectorAll(".w2m-half"));
  const r = hs.find((x) => (x.style.left || "") === "50%");
  return !!(r && r.classList.contains("w2m-strong"));
};

/* ══════════════════════════════════════════════════════════════════════ */
async function main() {
  console.log("── 🥅🔲 G. 1대1 격자 — 밝기가 곧 판정인가 ──");

  const bad = momentMutsOK(MUT);
  check(bad.length === 0,
    `G-0. 🧪 변이 정규식 ${Object.keys(MUT).length}종이 지금 \`beta/winger-moment.js\`에 전부 걸린다`
    + (bad.length ? `\n     🔴 안 걸리는 것: ${bad.join("\n        ")}`
      + `\n     🔑 구현이 바뀐 거예요 — 정규식을 고치기 전에 **계약이 아직 맞는지** 먼저 보세요` : ""));

  /* ══════ 판이 실제로 떴는가 — 아래 문장들이 **빈 화면 위에서** 통과하지 못하게 ══════ */
  {
    const h = await open({ seed: SEEDS[0] });
    await h.at(0);
    const cs = cellsOf(h);
    const kc = kcOf(h);
    /* 🔮 예고 띠가 **없어도** G-2의 「갈리는 표본」이 부풀어 통과합니다(없으면 0으로 읽히니까요).
     *    그 구멍을 여기서 막아요 — 칸마다 하나씩 있어야 합니다. */
    const nexts = h.host.querySelectorAll(".w2m-cell-next").length;
    const lits = h.host.querySelectorAll(".w2m-cell-lit").length;
    const ghost = h.host.querySelectorAll(".w2m-keeper-ghost").length;   // 🔮 0.45초 뒤 키퍼
    check(cs.length === 5 && h.host.querySelectorAll(".w2m-goal").length === 1
      && h.host.querySelectorAll(".w2m-half").length === 2 && isFinite(kc)
      && lits === cs.length && nexts === cs.length && ghost === 1
      && cs.some((c) => c.op > 0),
      `G-0a. 🚪 판이 실제로 떴다 — 골문 1 · 칸 ${cs.length} · 반쪽 2 · 🧤 ${isFinite(kc) ? kc.toFixed(1) : "??"}%`
      + ` · 밝기 ${lits} · 🔮 예고 띠 ${nexts} · 🔮 키퍼 자취 ${ghost} · 불 켜진 칸 ${cs.filter((c) => c.op > 0).length}`
      + `\n     🔎 측정 조건 — 이게 빨간불이면 아래 문장들은 **빈 화면 위에서 조용히 통과**합니다`
      + `\n     🔑 🔮 예고 띠가 **없어도** G-2의 「갈리는 표본」이 부풀어 통과해요 — 그래서 여기서 셉니다`);
    h.close();
  }

  /* ══════════════════════════════════════════════════════════════════════
   * G-1. 🦶 **주발을 뒤집으면 판정이 그 쪽으로 넓어진다** — 화면 셋과 같은 쪽인가
   * ══════════════════════════════════════════════════════════════════════
   * 🔑 **값이 아니라 관계**입니다. 같은 판·같은 순간을 🦶 R과 L로 두 번 열어,
   *    한 칸의 밝기가 **어느 쪽 발일 때 더 밝은가**를 봅니다.
   *      · 오른쪽 칸(x > 50)은 **R일 때** 더 밝아야 하고
   *      · 왼쪽 칸(x < 50)은 **L일 때** 더 밝아야 하고
   *      · 한가운데 칸(x = 50)은 **둘이 같아야** 합니다(중립)
   * 🔴 **양끝이 눌린 칸은 뺍니다** — 둘 다 0이거나 둘 다 1이면 아무것도 말 안 해요.
   *    그런 칸을 세면 «다 통과»가 되어 **아무것도 안 지키는 검사**가 됩니다. */
  async function flip(muts) {
    const rows = [];
    for (const seed of SEEDS) {
      const R = await open({ seed, foot: "R", muts });
      const L = await open({ seed, foot: "L", muts });
      await R.at(FLIP_T); await L.at(FLIP_T);
      const a = cellsOf(R), b = cellsOf(L);
      const pairs = [];
      for (let i = 0; i < a.length; i++) {
        const hi = Math.max(a[i].op, b[i].op), lo = Math.min(a[i].op, b[i].op);
        if (hi <= 0 || lo >= 1) continue;                       // 🔒 양끝이 눌린 칸은 뺍니다
        const ok = a[i].x > 50 ? a[i].op > b[i].op
          : a[i].x < 50 ? b[i].op > a[i].op : Math.abs(a[i].op - b[i].op) <= EPS;
        pairs.push({ i, x: a[i].x, R: a[i].op, L: b[i].op, ok });
      }
      /* 🖼️ 화면 둘 — 반쪽 색 · 칸의 강/약 클래스. **판정과 같은 쪽을 가리켜야** 합니다.
       * 🔑 **칸 번호를 박지 않습니다**(`"3,4"` 같은 것). 칸 수가 바뀌면 그 문장은
       *    계약이 아니라 잡음이 돼요 — *"강한 칸 = 그 발 쪽 절반"*이라는 **관계**로 씁니다. */
      const scr = {
        halfR: halfStrongRight(R), halfL: halfStrongRight(L),
        cellR: a.every((c) => c.strong === (c.x > 50)),
        cellL: b.every((c) => c.strong === (c.x < 50)),
      };
      rows.push({ seed, kc: kcOf(R), pairs, scr });
      R.close(); L.close();
    }
    return rows;
  }
  const P1 = (rows) => {
    const pairs = rows.reduce((n, r) => n + r.pairs.length, 0);
    const wrong = rows.reduce((n, r) => n + r.pairs.filter((p) => !p.ok).length, 0);
    /* 🖼️ 화면도 판정과 같은 쪽인가 — R이면 오른쪽 반쪽이 강하고 칸 3·4가 강해야 합니다 */
    const scrBad = rows.filter((r) => !(r.scr.halfR && !r.scr.halfL
      && r.scr.cellR && r.scr.cellL)).length;
    return { pairs, wrong, scrBad, ok: pairs >= MIN_FLIP && wrong === 0 && scrBad === 0 };
  };
  const baseFlip = await flip(null);
  const f1 = P1(baseFlip);
  check(f1.ok,
    `G-1. 🦶 **주발 쪽 칸이 더 밝다 — 판정 쪽에서 쟀습니다** (쓸 만한 쌍 ${f1.pairs} · 어긋남 ${f1.wrong})`
    + `\n     🔎 측정 조건 — 같은 판을 🦶 R·L로 두 번 열어 **같은 순간(${FLIP_T}ms)**의 밝기를 견줍니다.`
    + ` 양끝(0·1)이 눌린 칸은 뺐어요 — 그런 칸은 아무것도 말 안 하니까요`
    + `\n     🖼️ 화면 둘도 같은 쪽인가 — 반쪽 색 · 칸의 \`w2m-strong\`: 어긋난 판 ${f1.scrBad}`
    + `\n     🔒 표본 바닥 ${MIN_FLIP}쌍 — 0쌍이어서 조용히 통과하는 길을 막습니다`
    + (f1.ok ? "" : `\n     🔴 ${baseFlip.flatMap((r) => r.pairs.filter((p) => !p.ok)
      .map((p) => `seed${r.seed} 칸${p.i}(x${p.x}) R${p.R.toFixed(3)} L${p.L.toFixed(3)}`)).slice(0, 4).join(" · ")}`));

  /* ══════════════════════════════════════════════════════════════════════
   * G-2. 🔑 **밝기 = 판정** — 칸을 눌러 나온 `s`가 그 칸이 보이던 밝기와 같다
   * ══════════════════════════════════════════════════════════════════════
   * ⛔ 이게 깨지면 **화면이 거짓말을 시작합니다.** 원칙 ③(보이는 폭이 그대로 판정)을
   *    지키는 **유일한 자리**예요 — 다른 검사는 전부 «판정끼리» 또는 «화면끼리»만 봅니다.
   * 🔑 **가장 밝은 칸과 어두운 칸을 둘 다** 누릅니다. 밝은 칸만 누르면
   *    「어디를 눌러도 같은 칸」(M4) 같은 결함이 **운으로 통과**할 수 있어요. */
  async function litVsJudge(muts) {
    const rows = [];
    for (const seed of SEEDS) {
      for (const ms of PRESS_T) for (const pick of ["max", "min"]) {
        const h = await open({ seed, muts });
        await h.at(ms);
        const cs = cellsOf(h);
        const lit = cs.filter((c) => c.op > 0);
        /* 🔒 「어두운 칸」도 **실제로 존재하는 칸**을 고릅니다(누를 수 있는 것만) */
        const target = pick === "max"
          ? cs.reduce((a, b) => (b.op > a.op ? b : a))
          : cs.reduce((a, b) => (b.op < a.op ? b : a));
        pressDom(h.W, target.el);
        await wait(20);
        rows.push({ seed, ms, pick, i: target.i, op: target.op, next: target.next, s: h.s(), lit: lit.length });
        h.close();
      }
    }
    return rows;
  }
  const P2 = (rows) => {
    const bad2 = rows.filter((r) => r.s == null || Math.abs(r.s - r.op) > EPS);
    /* 🔒 **누른 것이 판이 되긴 했나** — 전부 s = null이면 위 비교가 통째로 헛돕니다 */
    /* 🔮 **예고 띠와 갈리는 표본이 있어야** «지금 밝기»와 «예고»가 구분됩니다 */
    const gap = rows.filter((r) => Math.abs(r.op - r.next) > GAP_MIN).length;
    return { bad: bad2, gap, got: rows.filter((r) => r.s != null).length,
      ok: bad2.length === 0 && rows.length > 0 && gap >= MIN_GAP };
  };
  const baseLit = await litVsJudge(null);
  const g2 = P2(baseLit);
  check(g2.ok,
    `G-2. 🔑 **밝기 = 판정** — 칸을 눌러 나온 \`s\`가 그 칸의 \`opacity\`와 같다 (${baseLit.length}회 · 판정이 온 것 ${g2.got})`
    + `\n     🔎 측정 조건 — ⏱️ **시계를 얼려서** 그림과 판정이 같은 순간을 봅니다.`
    + ` 허용치 ${EPS}는 \`toFixed(3)\`의 **반올림 폭**이에요(잡음에 준 여유가 아닙니다)`
    + `\n     🔑 **가장 밝은 칸과 가장 어두운 칸을 둘 다** · **${PRESS_T.join("·")}ms 두 순간**에 눌렀습니다`
    + `\n     🔮 **예고 띠(\`.w2m-cell-next\`)와 갈리는 표본 ${g2.gap}회** (바닥 ${MIN_GAP} · 갈림 ${GAP_MIN} 초과)`
    + ` — 둘이 늘 같으면 「판정 = 지금 밝기」가 「판정 = 예고」와 **구분이 안 돼** 초록불이 뜻을 잃어요`
    + (g2.ok ? "" : `\n     🔴 ${g2.bad.slice(0, 4).map((r) => `seed${r.seed} 칸${r.i} 밝기 ${r.op} vs s ${r.s}`).join(" · ")}`
      + (g2.gap < MIN_GAP ? `\n     🔴 예고와 갈리는 표본이 ${g2.gap}회뿐이라 문장이 안 섭니다` : "")));

  /* ══════════════════════════════════════════════════════════════════════
   * G-3. ⏱️ **판정 창이 시간이 갈수록 좁아진다 — 화면에서 「역산」해서**
   * ══════════════════════════════════════════════════════════════════════
   * 🚨 **「늦게 누르면 s가 나빠진다」는 참이 아닙니다.** 실측했어요(판 60벌):
   *    칸 단위로 **12번 올라갔고**, 판 합계도 7번 올라갔습니다. 「좋은 지점」이 칸 중심에
   *    다가가는 판이 있어서예요 — **단조가 아닌 값을 문턱 하나로 자르면 안 됩니다.**
   *    그 문장을 그대로 검사로 굳혔으면 **고장이 아니라 우연으로 빨간불**이 났을 거예요.
   *
   * ✅ 대신 **정말로 단조인 것**을 봅니다 — **판정 창의 폭**이에요.
   *    같은 절반의 이웃한 두 칸(중심 간격 = 한 칸 폭)에 「좋은 지점」이 **사이에** 들면
   *      오차 합 = 칸 간격 이고, `s = 1 − 오차 ÷ 창` 이므로
   *      **창 = 칸 간격 ÷ ((1 − s₁) + (1 − s₂))**
   *    — 화면의 밝기 둘만으로 **판정 창을 되돌려 계산**할 수 있습니다.
   * 🔑 **소스에서 창을 읽어 오지 않습니다.** 「좋은 지점」만 소스가 내보낸 `_t.oneAt`에서
   *    받고(어느 쌍이 쓸 만한지 고르는 데만 씁니다), **비교는 화면 값끼리** 합니다.
   * 🌍 이 문장이 서 있는 세계: 「밝기 = 1 − 오차 ÷ 창」인 세계. 곡선을 바꾸는 판정이
   *    나오면 역산식부터 다시 보세요(그때는 `moment-test.js` E-2도 같이 뒤집힙니다). */
  async function winCurve(muts) {
    const rows = [];
    for (const seed of WIN_SEEDS) {
      const h = await open({ seed, muts });
      const kc = kcOf(h);
      const n = h.host.querySelectorAll(".w2m-cell").length;
      const gap = 100 / n;                                   // 칸 중심 간격 = 한 칸 폭
      const ws = [];
      for (const ms of TIMES) {
        await h.at(ms);
        const cs = cellsOf(h);
        const best = h.T.oneAt({ kc }, ms / 1000).best;       // 🔒 소스가 내보낸 닫힌 식
        for (const [i, j] of [[0, 1], [3, 4]]) {              // 같은 절반의 이웃 쌍
          if (cs[i].op <= 0 || cs[j].op <= 0) continue;
          if (!(best > cs[i].x && best < cs[j].x)) continue;  // 「좋은 지점」이 사이에 들어야
          /* 🏔️ **`CELL_FLOOR` 바닥이 걸린 칸은 뺍니다** — 바닥이 걸리면 오차 합이
           *    칸 간격이 아니게 되어 역산이 틀려요. 바닥이 걸렸는지는 **소스가 내보낸
           *    `oneErr`**에게 물어봅니다(상수를 베껴 오지 않았어요). */
          if (h.T.oneErr(cs[i].x, best) !== Math.abs(cs[i].x - best)) continue;
          if (h.T.oneErr(cs[j].x, best) !== Math.abs(cs[j].x - best)) continue;
          ws.push({ ms, w: gap / ((1 - cs[i].op) + (1 - cs[j].op)) });
          break;
        }
      }
      /* 🔒 한 판에서 **두 시각 이상** 잴 수 있어야 「좁아진다」를 말할 수 있어요 */
      if (ws.length >= 2) rows.push({ seed, kc, ws });
      h.close();
    }
    return rows;
  }
  const P3 = (rows) => {
    const bad3 = rows.filter((r) => !r.ws.every((x, k) => k === 0 || x.w < r.ws[k - 1].w - 1e-9));
    return { n: rows.length, bad: bad3, ok: rows.length >= MIN_WIN && bad3.length === 0 };
  };
  const baseWin = await winCurve(null);
  const g3 = P3(baseWin);
  check(g3.ok,
    `G-3. ⏱️ **화면에서 역산한 판정 창이 갈수록 좁아진다** — 쓸 만한 판 ${g3.n}벌 · 어긋남 ${g3.bad.length}`
    + `\n     🔎 측정 조건 — 시각 ${TIMES.join("·")}ms · 창 = 칸 간격 ÷ ((1−s₁)+(1−s₂))`
    + ` (같은 절반의 이웃 두 칸 사이에 「좋은 지점」이 들 때만)`
    + `\n     🚨 «늦으면 s가 나빠진다»는 **참이 아닙니다**(판 60벌에서 칸 12번·합계 7번 올라감).`
    + ` 그래서 **단조인 것**(창 폭)으로 바꿔 잡았어요`
    + `\n     ${baseWin.slice(0, 3).map((r) => `seed${r.seed}: ${r.ws.map((x) => `${x.ms}ms ${x.w.toFixed(2)}`).join(" → ")}`).join("\n     ")}`
    + (g3.ok ? "" : `\n     🔴 ${g3.bad.slice(0, 3).map((r) => `seed${r.seed}: ${r.ws.map((x) => `${x.ms}ms ${x.w.toFixed(2)}`).join(" → ")}`).join(" · ")}`
      + (g3.n < MIN_WIN ? `\n     🔴 쓸 만한 판이 ${g3.n}벌뿐이라 문장이 안 섭니다(바닥 ${MIN_WIN})` : "")));

  /* ══════════════════════════════════════════════════════════════════════
   * G-4. 🧤 **가장 밝은 칸은 키퍼 반대쪽에 있다** — 무대가 진짜로 판을 정하는가
   * ══════════════════════════════════════════════════════════════════════
   * 🔑 키퍼 자리(`kc`)는 **화면에서** 읽습니다(`translateX(%)`). 숨은 정보가 없다는 계약이에요.
   *    「좋은 지점」이 무대를 안 타면(M6) 이 문장이 곧바로 무너집니다 —
   *    **무대가 있는 척하는 무대**는 판을 신호 하나짜리로 만듭니다. */
  async function opp(muts) {
    const rows = [];
    for (const seed of SEEDS) {
      const h = await open({ seed, muts });
      await h.at(0);
      const cs = cellsOf(h), kc = kcOf(h);
      const top = cs.reduce((a, b) => (b.op > a.op ? b : a));
      rows.push({ seed, kc, i: top.i, x: top.x, op: top.op,
        ok: top.op > 0 && (top.x - 50) * (kc - 50) < 0 });
      h.close();
    }
    return rows;
  }
  const P4 = (rows) => ({ bad: rows.filter((r) => !r.ok), ok: rows.length > 0 && rows.every((r) => r.ok) });
  const baseOpp = await opp(null);
  const g4 = P4(baseOpp);
  check(g4.ok,
    `G-4. 🧤 **가장 밝은 칸은 키퍼 반대쪽** — 판 ${baseOpp.length}벌 전부 (어긋남 ${g4.bad.length})`
    + `\n     🔎 측정 조건 — 키퍼 자리는 **화면의 \`translateX(%)\`**에서 읽습니다(숨은 정보 없음)`
    + (g4.ok ? "" : `\n     🔴 ${g4.bad.slice(0, 4).map((r) => `seed${r.seed} 🧤${r.kc.toFixed(1)}% → 최댓칸 x${r.x}(${r.op.toFixed(3)})`).join(" · ")}`));

  /* ══════════════════════════════════════════════════════════════════════
   * G-5. 🗣️ **폐기한 낱말이 렌더된 화면에 없다** · 세 줄 위계가 넷 다 선다
   * ══════════════════════════════════════════════════════════════════════
   * 🔑 이 저장소는 **문자열 매칭에 여러 번 데었지만**, 금지 낱말은 그 예외예요 —
   *    *"화면에 이 말이 안 나온다"*는 **문자열이 곧 계약**입니다.
   * 🔴 **소스가 아니라 렌더된 `textContent`**에서 봅니다. 주석에는 남아 있어야 해요
   *    (왜 버렸는지가 주석에 없으면 다음 사람이 같은 말을 다시 씁니다). */
  {
    const BAN = ["갭", "코스 칸", "판정 창", "초록 존", "결정적인 순간"];
    async function words(muts) {
      const out = [];
      for (const moment of ["cutin", "oneone", "killpass", "block"]) {
        const W = momentDom(muts);
        W.Math.random = mulberry32(SEEDS[0]);
        const st = W.setTimeout; W.setTimeout = (fn) => st(fn, 0);
        const host = W.document.getElementById("host");
        W.W2Moment.play(host, { moment, kind: "goal", condition: 80, foot: "R" }, () => {});
        await wait(6);
        const go = host.querySelector(".w2m-go");
        const ready = host.textContent || "";
        if (go) { pressDom(W, go); await wait(6); }
        const live = host.textContent || "";
        out.push({ moment, text: ready + " " + live,
          stake: !!host.querySelector(".w2m-stake"),
          what: !!host.querySelector(".w2m-what"), why: !!host.querySelector(".w2m-why") });
        try { W.close(); } catch (e) { /* 이미 닫힘 */ }
      }
      return out;
    }
    const P5 = (rows) => {
      const hits = rows.flatMap((r) => BAN.filter((b) => r.text.indexOf(b) >= 0).map((b) => `${r.moment}: "${b}"`));
      const noHead = rows.filter((r) => !(r.stake && r.what && r.why)).map((r) => r.moment);
      return { hits, noHead, ok: hits.length === 0 && noHead.length === 0 && rows.length === 4 };
    };
    const baseW = await words(null);
    const g5 = P5(baseW);
    check(g5.ok,
      `G-5. 🗣️ **렌더된 화면에 폐기한 낱말이 없다** (${BAN.map((b) => `「${b}」`).join(" · ")}) · 세 줄 위계가 넷 다 선다`
      + `\n     🔎 측정 조건 — 준비 화면 + 본 게임의 \`textContent\`를 넷 다 봅니다(소스가 아니에요 — 주석에는 남아야 합니다)`
      + (g5.ok ? "" : `\n     🔴 걸린 말: ${g5.hits.join(" · ") || "없음"}`
        + (g5.noHead.length ? `\n     🔴 세 줄이 안 서는 판: ${g5.noHead.join(" · ")}` : "")));
    /* 변이 검증에서 다시 쓰려고 밖으로 뺍니다 */
    main.words = words; main.P5 = P5;
  }

  /* ══════════════════════════════════════════════════════════════════════
   * G-2a. 🎨 **`style.css`가 밝기를 덮어쓰지 않는다** — director가 곧 이 파일을 만집니다
   * ══════════════════════════════════════════════════════════════════════
   * 🔑 **G-2는 인라인 `style.opacity`를 읽습니다** — JS가 매 프레임 쓰는 그 값이에요.
   *    브라우저에서도 인라인이 보통 이깁니다. **딱 하나 예외가 `!important`**예요.
   *    `.w2m-cell-lit { opacity: … !important }`가 붙는 순간
   *    **화면은 그 값으로 그려지고 판정은 인라인으로 나서** 둘이 갈립니다 —
   *    그런데 **G-2는 여전히 초록불**입니다(둘 다 인라인만 보니까요).
   *
   * 🔴 그래서 여기서 **소스로** 막습니다. 지금은 `beta/winger2/style.css`에
   *    `.w2m-cell-lit`의 `opacity` 규칙이 **한 줄도 없습니다**(있으면 안 돼요).
   * ⚠️ **director에게**: 칸을 꾸미실 때 `background`·`border-radius`·`box-shadow`는 마음껏,
   *    **`opacity`만은 JS 몫**입니다. 그게 «보이는 폭이 그대로 판정»(원칙 ③)의 마지막 자물쇠예요.
   * 🌍 이 문장이 서 있는 세계: 「밝기를 **JS가 인라인으로만** 쓰는 세계」.
   *    밝기를 CSS 변수로 넘기는 판정이 나오면 여기와 G-2를 **같이** 다시 보세요. */
  {
    const fs3 = require("fs");
    const CSS = "/workspace/grow-games/beta/winger2/style.css";
    /* 🔎 `.w2m-cell-lit` 또는 `.w2m-cell`을 겨눈 규칙 블록에서 `opacity`를 정하는가 */
    const hasOpacity = (css) => {
      const out = [];
      const re = /([^{}]*\.w2m-cell(?:-lit)?[^{}]*)\{([^}]*)\}/g;
      let m;
      while ((m = re.exec(css))) {
        if (/(^|[;\s])opacity\s*:/.test(m[2])) out.push(`${m[1].trim().slice(0, 60)} { … opacity … }`);
      }
      return out;
    };
    const raw = fs3.readFileSync(CSS, "utf8");
    const hits = hasOpacity(raw);
    check(hits.length === 0,
      `G-2a. 🎨 **\`style.css\`가 칸의 밝기를 안 정한다** — \`opacity\`는 JS 몫입니다`
      + `\n     🔎 측정 조건 — G-2는 **인라인** \`style.opacity\`를 읽어요. CSS가 \`!important\`로 덮으면`
      + ` **화면과 판정이 갈리는데 G-2는 초록불**입니다 — 그 구멍을 여기서 막습니다`
      + `\n     ⚠️ director께: 칸의 \`background\`·\`border\`·\`box-shadow\`는 마음껏, **\`opacity\`만은 JS 몫**이에요`
      + (hits.length ? `\n     🔴 ${hits.join(" · ")}` : ""));
    /* 🧪 변이 — CSS **문자열에만** 규칙을 끼워 넣어 봅니다(디스크는 안 건드려요) */
    const spiked = raw + "\n.w2m-cell-lit { opacity: .5 !important; }\n";
    check(hasOpacity(spiked).length > 0,
      `G-2a변이. 🎨 \`.w2m-cell-lit { opacity: … !important }\`를 끼워 넣으면 → 빨간불`
      + ` (디스크는 안 건드리고 **읽어 온 문자열에만** 넣었습니다)`);
  }

  /* ══════════════════════════════════════════════════════════════════════
   * G-7. 🔮 **미래 흘리기는 `s`에 한 톨도 안 들어간다** — 새 계약(2026-09-02 · 113번)
   * ══════════════════════════════════════════════════════════════════════
   * 🔮 화면에 넷이 붙었습니다 — `.w2m-keeper-ghost`(0.45초 뒤 키퍼) · `.w2m-cell-next`(예고 띠) ·
   *    `.w2m-cell-soon` · `.w2m-cell-rise`. 소스가 못 박은 계약:
   *      *"🔒 `s`에는 한 톨도 안 들어갑니다. 바뀌는 건 «미리 알 수 있느냐»뿐이에요.
   *        ⛔ 예고 띠를 판정에 쓰지 마세요 — 그 순간 규칙이 둘이 되고,
   *           화면이 결과를 만드는 자리가 됩니다."*
   *
   * 🔑 **손잡이를 흔들어 재는 방식입니다.** `ONE.look`(내다보는 시간)을 0 · 450 · 1500으로
   *    바꿔 같은 판·같은 순간·같은 칸을 누르고, 나온 `s`가 **비트 단위로 같은지** 봅니다.
   *    🔒 허용치가 없습니다 — `===`예요. 「한 톨도」가 계약이니까요.
   * 🔎 그리고 **화면은 실제로 달라져야** 합니다(예고 띠가 갈려야 이 문장이 뜻을 가져요) —
   *    안 달라지면 «안 닿는다»가 «아무 일도 안 한다»와 구분이 안 됩니다.
   * 🌍 이 문장이 서 있는 세계: 「미래를 **화면이 대신 내다봐 주는** 세계」.
   *    *"내다보기를 다시 숨기자"*는 판정이 나오면 이 문장이 통째로 옛 계약이 됩니다. */
  async function lookProbe(muts, extra) {
    const rows = [];
    for (const seed of SEEDS) {
      /* 🔒 `momentDom`의 변이는 **`[정규식, 바꿀말]` 배열**입니다 — 파일별 객체가 아니에요.
       *    (`bootPage`는 객체, `momentDom`은 배열 — 둘을 헷갈리면 **💥로 죽습니다.**
       *     실제로 한 번 죽었어요: `TypeError: (muts || []) is not iterable`) */
      const h = await open({ seed, muts: [].concat(muts || [], extra || []) });
      await h.at(PRESS_T[0]);
      const cs = cellsOf(h);
      const t = cs.reduce((a, b) => (b.op > a.op ? b : a));
      pressDom(h.W, t.el);
      await wait(20);
      rows.push({ seed, i: t.i, s: h.s(), op: t.op, next: t.next });
      h.close();
    }
    return rows;
  }
  const P7 = (a, b, c) => {
    /* 🔒 판정은 **비트 단위로** 같아야 합니다 */
    const bad7 = a.map((r, k) => ({ r, b: b[k], c: c[k] }))
      .filter((x) => !(x.r.s === x.b.s && x.r.s === x.c.s));
    /* 🔎 화면은 **실제로 달라져야** 문장이 뜻을 가집니다 (예고 띠가 갈리는 판) */
    const moved = a.filter((r, k) => Math.abs(r.next - c[k].next) > GAP_MIN).length;
    return { bad: bad7, moved, ok: bad7.length === 0 && moved >= MIN_GAP / 2 && a.length > 0 };
  };
  {
    const A = await lookProbe(null, null);                      // look 450 (그대로)
    const B = await lookProbe(null, MUT.M9_LOOK_ZERO);          // look 0
    const C = await lookProbe(null, MUT.M9_LOOK_LONG);          // look 1500
    const g7 = P7(A, B, C);
    main.P7 = P7; main.lookProbe = lookProbe;
    check(g7.ok,
      `G-7. 🔮 **미래 흘리기는 \`s\`에 한 톨도 안 들어간다** — \`look\` 0·450·1500에서 판정이 **비트 단위로 같다**`
      + `\n     🔎 측정 조건 — 같은 판·같은 순간(${PRESS_T[0]}ms)·같은 칸. 허용치 **없음**(\`===\`)`
      + `\n     🖼️ 그런데 **화면은 달라져야** 합니다 — 예고 띠가 갈린 판 ${g7.moved}벌`
      + ` (안 갈리면 「안 닿는다」가 「아무 일도 안 한다」와 구분이 안 돼요)`
      + `\n     ${A.slice(0, 3).map((r, k) => `seed${r.seed} 칸${r.i}: s ${r.s.toFixed(6)} · 예고 ${r.next.toFixed(3)}→${C[k].next.toFixed(3)}`).join("\n     ")}`
      + (g7.ok ? "" : `\n     🔴 ${g7.bad.slice(0, 3).map((x) => `seed${x.r.seed}: ${x.r.s} / ${x.b.s} / ${x.c.s}`).join(" · ")}`
        + `\n     🔴 **화면이 판정에 닿았습니다** — 규칙이 둘이 되고, 화면이 결과를 만드는 자리가 됩니다`));
  }

  /* ══════════════════════════════════════════════════════════════════════
   * 🚧 G-6. **알려진 미달** — JS가 켜는 상태 클래스에 CSS 규칙이 없습니다
   * ══════════════════════════════════════════════════════════════════════
   * 🔑 **CSS는 기계가 못 봅니다 — 하지만 「이름이 맞는지」는 볼 수 있어요.**
   *    색·레이아웃은 사람 몫이고, **한쪽이 켜는 이름을 다른 쪽이 아는가**는 경계면입니다.
   *
   * 🔴 `winger-moment.js`가 `classList.toggle(...)`로 켜는 클래스 중 **`style.css`에
   *    규칙이 하나도 없는 것**들이에요. 인라인으로는 못 쓰는 것들입니다 —
   *    상태 클래스는 켜지고 꺼지는 게 전부라 **CSS가 없으면 아무 일도 안 일어나요.**
   *    특히 `w2m-cell-soon` · `w2m-cell-rise`는 소스 주석이
   *    *"「곧 어두워짐 / 곧 밝아짐」을 클래스로도 — 색으로만 알리면 색약에서 안 읽혀요"*
   *    라고 적어 둔 ♿ 자리인데, **규칙이 없어서 지금은 색으로만 알리고 있습니다.**
   *
   * 🚧 **지금 크기를 상한으로 박고, 늘면 빨간불**로 둡니다. 여기서 소리내어 빨간불을 내면
   *    "저건 원래 빨간불이야"가 되어 이 파일 전체가 신호를 잃어요.
   * 📌 **CSS가 붙어 0이 되면 ❌ 종료 1로 「승격하세요」가 뜹니다** — 그때 상한을 지우고
   *    이 문장을 평범한 검사로 올리세요(`tests/soccer/curve-test.js`와 같은 방식이에요). */
  {
    const CAP = 4;                                    // 🚧 2026-09-02 실측치
    const fs2 = require("fs");
    const js = fs2.readFileSync("/workspace/grow-games/beta/winger-moment.js", "utf8");
    const css = fs2.readFileSync("/workspace/grow-games/beta/winger2/style.css", "utf8");
    const names = Array.from(new Set(
      (js.match(/classList\.(?:toggle|add)\("([^"]+)"/g) || [])
        .map((m) => m.replace(/.*\("/, "").replace(/"$/, ""))
        .filter((n) => n.indexOf("w2m-") === 0)));       // 🔒 w2m 것만 봅니다
    const orphan = names.filter((n) => !new RegExp(`\\.${n}(?![\\w-])`).test(css));
    if (orphan.length > CAP) {
      check(false, `G-6. 🔴 CSS 규칙 없는 상태 클래스가 **늘었습니다** — ${orphan.length}개 > 상한 ${CAP}`
        + `\n     ${orphan.join(", ")}`);
    } else if (orphan.length === 0) {
      check(false, `G-6. 🎉 상태 클래스에 CSS가 다 붙었어요 — **이 🚧 문장을 평범한 검사로 승격하세요**`
        + `\n     (상한을 지우고 \`orphan.length === 0\`을 그냥 단언하면 됩니다)`);
    } else {
      console.log(`🚧 G-6. JS가 켜는데 \`style.css\`에 규칙이 없는 상태 클래스 ${orphan.length}개 (상한 ${CAP} — 늘면 빨간불)`);
      console.log(`     ${orphan.join(", ")}`);
      console.log(`     ♿ \`w2m-cell-soon\`·\`w2m-cell-rise\`는 **색으로만 알리지 않으려고** 단 클래스예요 —`);
      console.log(`        규칙이 없으면 그 의도가 죽습니다. director/engineer에게 넘겼습니다(115번 §6).`);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
   * 🧪 변이 — **기준선이 초록불인 걸 위에서 먼저 찍고** 시작합니다
   * ══════════════════════════════════════════════════════════════════════ */
  console.log(`\n── 🧪 변이 — 되돌리면 정말 빨간불이 뜨는가 (기준선 ${fail === 0 ? "🟢 초록불" : `🔴 빨간불 ${fail}건`}) ──`);
  if (fail > 0) {
    console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다 — 위를 먼저 고치세요.");
  } else {
    const CASES = [
      ["M1_DIM", "G-2", async (m) => !P2(await litVsJudge(m)).ok],
      ["M2_FOOT_FLIP", "G-1", async (m) => !P1(await flip(m)).ok],
      ["M2B_CLASS_FLIP", "G-1", async (m) => !P1(await flip(m)).ok],
      ["M3_TIGHT1", "G-3", async (m) => !P3(await winCurve(m)).ok],
      ["M4_SAME_CELL", "G-2", async (m) => !P2(await litVsJudge(m)).ok],
      ["M5_NO_MUL", "G-1", async (m) => !P1(await flip(m)).ok],
      ["M6_BEST50", "G-4", async (m) => !P4(await opp(m)).ok],
      ["M8_NEXT_JUDGES", "G-2", async (m) => !P2(await litVsJudge(m)).ok],
      /* 🔮 같은 변이가 **G-7도** 물어야 합니다 — 예고로 판정하면 `look`이 `s`에 닿거든요.
       *    🔑 한 변이를 두 문장에 거는 건 **겹쳐 보기**예요(둘 중 하나가 죽어도 다른 하나가 잡습니다). */
      ["M8_NEXT_JUDGES", "G-7", async (m) => !main.P7(
        await main.lookProbe(m, null),
        await main.lookProbe(m, MUT.M9_LOOK_ZERO),
        await main.lookProbe(m, MUT.M9_LOOK_LONG)).ok],
      ["M7_WORD", "G-5", async (m) => !main.P5(await main.words(m)).ok],
    ];
    for (const [name, guard, bites] of CASES) {
      let hit = null, err = null;
      try { hit = await bites(MUT[name]); } catch (e) { err = e; }
      check(hit === true,
        `변이-${name} → **${guard}가 빨간불**이어야 한다`
        + (err ? `\n     💥 변이를 걸었더니 검사가 죽었습니다: ${err.message}`
          + `\n     🔑 죽는 건 초록불도 빨간불도 아니에요 — 문장이 아니라 드라이버가 걸린 겁니다`
          : hit ? "" : `\n     🔴 **안 잡혔습니다 — ${guard}는 아무것도 안 지키고 있어요.** 검사를 고치세요`));
    }
  }

  console.log(`\n${fail ? `❌ 빨간불 ${fail}건` : "✅ 전부 통과"} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  process.exit(fail ? 1 : 0);
}
main();
