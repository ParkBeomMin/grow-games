/* 🏔️ ⚽ 더 윙어 II — **「완벽」이 절대 문턱인가, 판 천장의 종속값인가**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 이 파일이 생긴 이유 — **되돌렸는데 8종이 전부 초록불이었습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 2026-09-02, engineer가 핵심 변경(`perfect ⟺ s ≥ boardCeil × PERFECT_OF_CEIL`)을
 * **옛 절대 문턱 `0.75`로 통째로 되돌려** 봤습니다. 결과:
 *
 *     검사 8종 → **전부 초록불** · 빨간불 2종은 **무변이일 때와 실패 항목이 같음**
 *
 * 그런데 되돌린 쪽 수치는 **범민 님이 지금 보고 계신 증상 그대로**였어요 —
 * ◎ 47.9% · 🦶 약발 완벽 **0** · `" 🦶 약발로!"` 축하 문구 **0**.
 *
 * 🔴 **저장소에 「완벽 문턱이 절대값인지 판 천장의 종속값인지」를 보는 검사가 0개**였습니다.
 *   · `one-grid-test.js`  — 밝기(`opacity`)와 판정이 같은가만 봅니다. 둘 다 같이 움직여요
 *   · `tier-in-test.js`   — `hot`·`in`이 **배타인가**를 봅니다. 문턱의 정체는 안 봐요
 *   · `moment-test.js`    — 소스 상수 지문(D-1)인데 `PERFECT_OF_CEIL`은 **지문 밖**입니다
 *      🔴 engineer가 못 박았어요: *"`K`에 넣어 메우지 마시고 「종속 관계 검사」로 메워 주세요."*
 *
 * 👉 **세 번째 축입니다** — 산식은 소스에서 · **문턱은 검사에 박고** · **종속값은 관계식으로**.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 값을 고치기 전에 여기부터 여세요
 * ═════════════════════════════════════════════════════════════════════════
 *
 * 「🏔️ **「완벽」이 «그 판에서 손이 낼 수 있는 최선을 냈나»인 세계**」입니다.
 *
 *   · `boardCeil`은 **판 시작(t = 0)에 한 번** 잰 여섯 칸의 최대 `s`예요
 *   · `perfect ⟺ s ≥ boardCeil × PERFECT_OF_CEIL` — 문턱이 **판마다 다릅니다**
 *   · 🦶 약발 쪽으로 열린 판은 천장이 낮고, 그래서 문턱도 같이 낮아져요.
 *     **절벽이 아니라 창 길이의 차이**가 됩니다(🦶 태그의 「－25%」가 그제야 참말)
 *   · `PERFECT_OF_CEIL`은 🔗 **종속값**이에요 — 🎚️ 손잡이가 아닙니다.
 *     🦶 주발 · 🫀 `COND_REF`(80) · ♿ 꺼짐에서 **옛 절대 문턱 0.75를 그대로 재현**하는 값이고,
 *     `CELL_FLOOR`·`ONE_WIN`·`ONE.cells`·`STRONG` 넷의 함수입니다
 *
 * ⚠️ **뒤집히면 이 파일이 옛 계약이 되는 판정**
 *   · *"절대 문턱으로 되돌리자"*(`s >= 0.75`) → **C-2가 통째로** 옛 계약입니다.
 *     🚨 되돌리면 **약발 판에서 「완벽」이 0**이 되고 `" 🦶 약발로!"`가 다시 죽습니다(C-4).
 *     그게 **이 파일이 생긴 바로 그 사고**예요 — 되돌리기 전에 이 주석을 여세요
 *   · *"매 프레임 천장을 다시 재자"* → **C-1**이 옛 계약입니다. 🚨 그러면 가장 밝은 칸을
 *     고르기만 해도 늘 「완벽」이라 **「빨리 차라」라는 시간 축이 통째로 죽습니다**
 *   · *"`CELL_FLOOR` 0.36 · `ONE_WIN` 23 「한 벌」을 다시 잡자"*(balancer) →
 *     🟢 **C-3은 그대로 삽니다.** 닫힌 식 천장을 소스에서 다시 부르니까요 —
 *     🔑 **값이 아니라 관계**로 적어 둔 자리입니다. 소스도 같은 식으로 `PERFECT_OF_CEIL`을
 *     다시 계산해야 해요(`winger-moment.js`의 `PERFECT_OF_CEIL` 주석에 식이 있습니다)
 *   · *"중립화 기준을 옛 0.75가 아닌 다른 값으로 옮기자"* → **C-3의 `OLD_ABS`를 먼저 고치세요.**
 *     🔴 그건 값을 고치는 게 아니라 **난이도를 옮기는 판정**입니다 — designer/balancer 몫이에요
 *   · *"🧱 수비에도 판을 열자"*(117번 §6-4) → 여기는 안 건드립니다(판 종류는 `goal`·`assist`뿐)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `momentDom`이 창에 실어요
 *   ② **문턱은 여기 박습니다** — `OLD_ABS`(0.75) · `COND_REF`(80) · 폭 상한/하한.
 *      🔒 `PERFECT_OF_CEIL`(0.9478)은 **한 번도 안 적습니다.** 적으면 `CELL_FLOOR`가
 *         움직이는 날 고장이 아니라 **한 벌 재계산 때문에** 빨간불이 나요
 *      🔑 **산식은 소스에서** — 닫힌 식 천장은 `_t.oneErr`·`_t.sOne`·`_t.winMul`을
 *         **그대로 부르고**, 축하 문구는 소스에서 **정규식으로 뜯어옵니다**
 *   ③ **화면을 통해** — 진짜 판을 띄우고 ▶️ 시작을 눌러 들어가, 실기기 순서
 *      (pointerdown → pointerup → click)로 칸을 누릅니다
 *   ④ **시드 하나로 안 잽니다** — 판 24벌 × 종류 2 × 주발 2 × 컨디션 3
 *   ⑤ **기준선이 초록불인 것을 먼저 찍고** 변이를 겁니다. 표본 바닥도 박아 뒀어요
 *
 * 📐 **문턱을 어디에 뒀나 — 두 줄을 먼저 적었습니다**
 *
 *   C-1 ① 무엇과 견주는가: 「t ≥ 2.0s에 ◎가 한 칸이라도 뜨는가」 — **박아 둔 0개**
 *       ② 격자의 어느 칸에서: 판 24벌 × 늦은 시각 5점. 실측 **0 / 120**
 *          🔑 밑에 깔린 연속량은 여유가 큽니다 — t ≥ 2.0s의 `최대 밝기 ÷ 천장`이 **0.850**이고
 *             문턱은 비 **0.9478**이에요(11% 여유). 이진 문장이지만 기준선 옆이 아닙니다
 *
 *   C-2 ① 무엇과 견주는가: **판마다 잰 문턱**의 ㉠ 천장 대비 비와 ㉡ 절대값.
 *          🔑 종속이면 ㉠이 일정하고 ㉡이 흩어져요. 절대 문턱이면 **정확히 반대**입니다
 *       ② 격자의 어느 칸에서: 판 24벌 × 시각 0~1600ms를 20ms로 쓸어 문턱을 **브래킷**으로 잡음
 *          실측 — ㉠ 폭 **0.0015**(상한 0.02 · 여유 13배) · ㉡ 폭 **0.168**(하한 0.08 · 여유 2.1배)
 *
 *   C-3 ① 무엇과 견주는가: **박아 둔 옛 절대 문턱 0.75**
 *       ② 격자의 어느 칸에서: 🦶 주발 · 🫀 `COND_REF`(80) · ♿ 꺼짐 — **중립화가 정의된 칸**
 *          실측 **0.750025** (허용 ±0.005 · 여유 72배). 변이(비를 −1.9%만 밀면)는 **0.736**
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가:
 *     ◎가 «지금 눌러» 로 읽히는지 · 판마다 문턱이 다른 게 **불공평하게 느껴지는지** ·
 *     🦶 약발 판의 0.47초가 실기기에서 **누를 수 있는 길이**인지 ·
 *     축하 문구가 «약발로 넣었다»는 성취로 읽히는지. 전부 사람 몫입니다.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 */
"use strict";
const { momentDom, pressDom, momentMutsOK, MSRC } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const spread = (a) => Math.max.apply(null, a) - Math.min.apply(null, a);

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
/* ⚖️ **옛 절대 문턱** — 중립화의 기준점이에요. `PERFECT_OF_CEIL`은 «🦶 주발 · 🫀 80 · ♿ 꺼짐에서
 *    이 값을 그대로 재현하라»로 정의된 종속값이라, **여기가 그 정의의 왼쪽 항**입니다. */
const OLD_ABS = 0.75;
/* 📏 실측 오차는 0.00007이고, 비를 **−1.9%만 밀어도** 0.0141 벗어납니다(변이 C-M2) —
 *    허용치를 그 둘 사이에 뒀어요. 어느 쪽에도 안 붙였습니다(실측 대비 72배 · 변이 대비 1/2.8). */
const ANCHOR_TOL = 0.005;
/* 🫀 중립화가 정의된 컨디션. `winger-moment.js`의 `PERFECT_OF_CEIL` 주석이 `COND_REF`(80)이라고 적어 뒀어요. */
const COND_REF = 80;
/* 🔗 **「일정하다」와 「흩어진다」의 문턱** — 어느 쪽도 기준선 옆에 안 붙였습니다.
 *      비 폭   실측 0.0015 → 상한 0.02  (여유 13배)
 *      절대 폭 실측 0.168  → 하한 0.08  (여유 2.1배)
 *    🔴 변이(절대 문턱 되돌리기)에서는 이 둘이 **자리를 바꿉니다** — 그게 이 문장의 전부예요. */
const R_SPREAD_MAX = 0.02;
const A_SPREAD_MIN = 0.08;
/* ⏱️ 「빨리 차라」가 사는지 재는 늦은 시각. `ONE.grow`(2400ms) 전후를 걸칩니다. */
const LATE_T = [2000, 2200, 2400, 2700, 3000];
/* ⏱️ 문턱을 브래킷으로 잡는 쓸기. 실측 ◎가 꺼지는 시각은 **440~940ms**라 1600ms면 넉넉해요. */
const SWEEP_END = 1600;
const SWEEP_DT = 20;
/* 👆 C-4가 ◎를 눌러 보는 순간들. ◎는 판의 앞 1/4에만 떠요. */
const PRESS_T = [0, 100, 200, 300, 400];
/* 🔒 **표본 바닥** — 이만큼은 나와야 문장이 뭔가를 지킵니다(실측의 절반~2/3).
 *    🔴 바닥이 없으면 «브래킷이 0개라 폭도 0» 같은 길로 **조용히 초록불**이 납니다. */
const MIN_BRACKET = 16;        // 실측 24 / 24
const MIN_WEAK_PERFECT = 20;   // 실측 50 (판 24벌 × 시각 5점 = 120판 중)
const MIN_STRONG_PERFECT = 20; // 실측 70 — 🦶 한쪽만 재면 100%나 0%가 나와요

const SEEDS = [];
for (let i = 1; i <= 24; i++) SEEDS.push(i * 7 + 1);
const KINDS = ["goal", "assist"], FEET = ["R", "L"], CONDS = [55, COND_REF, 95];
const caseOf = (s, i) => ({ seed: s, kind: KINDS[i % 2], foot: FEET[(i >> 1) % 2], cond: CONDS[i % 3] });

/* 🗣️ **축하 문구는 소스에서 뜯어옵니다** — 베껴 적으면 문구를 다듬는 날 조용히 안 걸려요.
 * 🔒 **따옴표 종류에 안 기댑니다** — 2026-09-03에 문구가 `<b class="w2m-win-weak">`를 품으면서
 *    홑따옴표로 바뀌었고, `"([^"]*)"`로 적어 둔 옛 정규식이 **그 자리에서 죽었습니다**
 *    (커밋 fde6688 · director의 CSS가 **먼저** 있었고 JS가 뒤에 왔어요).
 * 🔒 **태그를 벗겨 「보이는 글자」만 바늘로 씁니다** — 그래야 화면이 그 줄을 날 HTML로
 *    담든 `textContent`로 담든 **둘 다에서 걸립니다**. 태그째 찾으면 한쪽에서만 걸려요. */
const WEAK_RAW = (MSRC.match(/W\.great \+ \(ctx\.weak \? (['"])([\s\S]*?)\1 : ""\)/) || [])[2];
const WEAK_WORD = WEAK_RAW ? WEAK_RAW.replace(/<[^>]*>/g, "").trim() : undefined;

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 — **0번이 먼저 소스와 대조합니다**
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 C-M1 — 🚨 **engineer가 실제로 되돌려 본 흠.** 절대 문턱 `0.75`로 통째 복귀.
   *    이걸 8종이 아무도 못 잡아서 이 파일이 생겼습니다. */
  ABS75: [[/const TIER = \(s, ceil\) => \(s >= ceil \* PERFECT_OF_CEIL \?/,
    "const TIER = (s, ceil) => (s >= 0.75 ?"]],
  /* 🔴 C-M2 — 🔗 **비를 −1.9%만 살짝 밉니다**(0.9478 → 0.93). 종속 구조는 그대로예요.
   *    🔑 **작게 미는 게 핵심**입니다 — 크게 내리면(0.60) ◎가 2초 뒤에도 켜져 있어서
   *       C-1·C-2까지 같이 물어요. 그러면 «C-3이 수준을 지킨다»가 증명이 안 됩니다.
   *    🟢 그래서 이 변이는 **C-3만 물고 C-1·C-2는 초록불로 남아야** 맞아요 — 아래 `KEEP`이 그걸 봅니다.
   *    🔒 값(0.9478)을 정규식에 안 박습니다. */
  RATIO_NUDGE: [[/const PERFECT_OF_CEIL = [\d.]+;/, "const PERFECT_OF_CEIL = 0.93;"]],
  /* 🔴 C-M3 — ⏱️ **화면이 천장을 매 프레임 다시 잽니다.** 가장 밝은 칸이 늘 ◎가 돼요. */
  LIVE_PAINT: [[/const hot = TIER\(v, boardCeil\) === "perfect";/,
    'const hot = TIER(v, Math.max.apply(null, cells.map((cc) => cellS(cc, a)))) === "perfect";']],
  /* 🔴 C-M4 — ⏱️ **판 끝 문구가 천장을 매 프레임 다시 잽니다.** 화면은 그대로예요 —
   *    C-1(화면)이 아니라 **C-1b(누름)만** 물어야 합니다. */
  LIVE_TAP: [[/end\(s, TIER\(s, boardCeil\) === "perfect" \?/,
    'end(s, TIER(s, Math.max.apply(null, cells.map((cc) => cellS(cc, a)))) === "perfect" ?']],
  /* 🔴 C-M5 — 🎨 **`ender`만 옛 절대 문턱을 씁니다**(상자 판정색 · ⚡ 파티클).
   *    🚨 engineer가 «설계에 없던 것»이라고 적은 자리예요 — `ender`도 `TIER`를 부르는데
   *    `boardCeil`을 안 넘기면 **화면 등급은 상대 문턱, 상자색은 절대 0.75**로 갈립니다.
   *    🔑 문구는 `onTap`이 만드니 **안 갈려요** — C-4의 「상자」 쪽만 물어야 합니다. */
  ENDER_ABS: [[/const end = ender\(wrap, ctx, boardCeil\);/,
    "const end = ender(wrap, ctx, 0.75 / PERFECT_OF_CEIL);"]],
  /* 🔴 C-M6 — 🗣️ **축하 문구만 지웁니다.** 판정은 한 톨도 안 바뀌어요 —
   *    C-4가 «완벽이 열렸는가»만 보고 «말했는가»를 안 보면 여기서 안 잡힙니다. */
  /* 🔒 **따옴표 종류에 안 기댑니다** — 문구가 `<b class="w2m-win-weak">`를 품으면서
   *    홑따옴표로 바뀌었고, `"[^"]*"`로 적어 둔 옛 정규식이 그 자리에서 죽었습니다
   *    (2026-09-03 · 커밋 fde6688). 🔴 문구를 손댈 때마다 여기가 또 죽지 않게
   *    **양쪽 따옴표를 다 받고 안쪽은 안 봅니다.** */
  WEAK_WORD_OFF: [[/W\.great \+ \(ctx\.weak \? ['"][\s\S]*?['"] : ""\)/, "W.great"]],
};

/* ══════════════════════════════════════════════════════════════
 * 🎬 판 하나 — **시계를 얼린 채** (one-grid-test · tier-in-test와 같은 방식)
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BASE = 1e5;
async function open(o) {
  const W = momentDom(o.muts);
  W.Math.random = mulberry32(o.seed);
  let clk = BASE;
  W.performance.now = () => clk;
  /* 🔒 rAF에 **`nowMs()`와 같은 값**을 물립니다 — 그림과 판정이 같은 순간이에요.
   *    🚨 `cb(0)`을 넘기면 `dt`가 늘 0이라 판이 얼어붙고 판정이 늘 `s = 0`이 됩니다(가짜 rAF). */
  W.requestAnimationFrame = (cb) => W.setTimeout(() => cb(clk), 0);
  const st = W.setTimeout;
  W.setTimeout = (fn) => st(fn, 0);
  const host = W.document.getElementById("host");
  W.W2Moment.play(host, { moment: "oneone", kind: o.kind || "goal",
    condition: o.cond == null ? COND_REF : o.cond, foot: o.foot || "R" }, () => {});
  await wait(6);
  /* ▶️ 준비 화면을 **게임이 여는 문으로** 지납니다 */
  const go = host.querySelector(".w2m-go");
  if (go) { pressDom(W, go); await wait(6); }
  return { W, host,
    words: () => W.W2Moment.WORDS[o.kind || "goal"],
    at: async (ms) => { clk = BASE + ms; await wait(6); },
    close: () => { try { W.close(); } catch (e) { /* 이미 닫힘 */ } } };
}
/* 🔎 화면이 지금 말하는 것 — 밝기와 등급 클래스를 **전부 화면에서** 읽습니다 */
const cellsOf = (h) => Array.from(h.host.querySelectorAll(".w2m-cell")).map((c) => ({
  i: Number(c.dataset.i),
  op: Number(c.querySelector(".w2m-cell-lit").style.opacity),
  strong: c.classList.contains("w2m-strong"),
  hot: c.classList.contains("w2m-cell-hot"),
  el: c,
}));
const brightest = (cs) => cs.reduce((a, b) => (b.op > a.op ? b : a), cs[0]);

/* ══════════════════════════════════════════════════════════════════════
 * 🔬 A. 판마다 **문턱을 브래킷으로** 잡습니다 — 화면만 보고
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 `opacity`가 곧 그 칸의 `s`예요(`one-grid-test` G-2가 그 계약을 지킵니다).
 *    그래서 «◎가 꺼지는 순간의 밝기»가 곧 **그 판의 완벽 문턱**입니다 —
 *    소스에서 값을 읽어 오지 않고 **화면에서 잽니다.**
 *
 *      lastHot   ◎가 켜져 있던 마지막 프레임의 (◎ 칸 중) 최소 밝기   → 문턱 **이상**
 *      firstCold 그 다음 프레임의 최대 밝기                          → 문턱 **미만**
 *      threshold 두 값의 가운데                                      → 점추정
 *
 * 🌫️ `opacity`는 `toFixed(3)`이라 ±0.0005의 자릿수 오차가 깔립니다. 그래서 **점추정을
 *    판마다 따로 단언하지 않고**, 24벌의 **폭**과 **평균**만 씁니다(오차가 평균에서 줄어요). */
async function bracket(muts) {
  const rows = [];
  const late = { hotFrames: 0, n: 0, maxRatio: 0 };
  for (let i = 0; i < SEEDS.length; i++) {
    const c = caseOf(SEEDS[i], i);
    const h = await open({ ...c, muts });
    await h.at(0);
    const cs0 = cellsOf(h);
    const ceil = brightest(cs0).op;                 // 🏔️ 판 시작의 천장 — 화면에서 잰 값
    const ceilStrong = brightest(cs0).strong;
    let lastHot = null, firstCold = null, offAt = null;
    for (let t = 0; t <= SWEEP_END; t += SWEEP_DT) {
      await h.at(t);
      const cs = cellsOf(h);
      const hot = cs.filter((x) => x.hot);
      if (hot.length) lastHot = Math.min.apply(null, hot.map((x) => x.op));
      else if (lastHot != null && firstCold == null) {
        firstCold = Math.max.apply(null, cs.map((x) => x.op));
        offAt = t;
      }
    }
    /* ⏱️ 늦은 시각 — 「빨리 차라」가 살아 있는가 */
    for (const t of LATE_T) {
      await h.at(t);
      const cs = cellsOf(h);
      late.n += 1;
      if (cs.some((x) => x.hot)) late.hotFrames += 1;
      if (ceil > 0) late.maxRatio = Math.max(late.maxRatio, brightest(cs).op / ceil);
    }
    rows.push({ ...c, ceil, ceilStrong, lastHot, firstCold, offAt,
      thr: (lastHot != null && firstCold != null) ? (lastHot + firstCold) / 2 : null });
    h.close();
  }
  const got = rows.filter((r) => r.thr != null && r.ceil > 0);
  return { rows, late, n: got.length,
    R: got.map((r) => r.thr / r.ceil),          // ㉠ 천장 대비 비  — 종속이면 **일정**
    A: got.map((r) => r.thr),                   // ㉡ 절대값       — 종속이면 **흩어짐**
    ceils: got.map((r) => r.ceil),
    offAt: got.map((r) => r.offAt) };
}

/* ══════════════════════════════════════════════════════════════════════
 * 🔬 B. **눌러 봅니다** — ◎ 칸을 실기기 순서로
 * ══════════════════════════════════════════════════════════════════════ */
async function pressProbe(muts, times, pickHot) {
  const acc = { n: 0, strongPerfect: 0, weakPerfect: 0, weakWord: 0, boxBad: 0,
    latePerfectWord: 0, latePerfectBox: 0, lateN: 0, ex: [] };
  for (let i = 0; i < SEEDS.length; i++) {
    const c = caseOf(SEEDS[i], i);
    for (const t of times) {
      const h = await open({ ...c, muts });
      await h.at(t);
      const cs = cellsOf(h);
      const cell = pickHot ? cs.find((x) => x.hot) : brightest(cs);
      if (!cell) { h.close(); continue; }
      const wrap = h.host.querySelector(".w2m-oneone");
      const W = h.words();
      pressDom(h.W, cell.el);
      /* 🔒 **동기로 읽습니다** — `ender`의 620ms가 0으로 뭉개져 있어 상자가 곧 사라져요 */
      const cls = wrap ? String(wrap.className) : "";
      const line = wrap && wrap.querySelector(".w2m-res")
        ? String(wrap.querySelector(".w2m-res").textContent || "") : "";
      const boxPerfect = cls.indexOf("w2m-t-perfect") >= 0;
      const wordPerfect = line.indexOf(W.great) === 0;
      acc.n += 1;
      if (pickHot) {
        if (!boxPerfect) {
          acc.boxBad += 1;
          if (acc.ex.length < 6) acc.ex.push(`◎를 눌렀는데 상자가 «완벽»이 아님 시드${c.seed} ${t}ms 칸${cell.i} op=${cell.op} cls="${cls.slice(-14)}"`);
        }
        if (cell.strong) acc.strongPerfect += 1;
        else {
          acc.weakPerfect += 1;
          if (WEAK_WORD && line.indexOf(WEAK_WORD) >= 0) acc.weakWord += 1;
          else if (acc.ex.length < 6) acc.ex.push(`약발 완벽인데 축하 문구가 없음 시드${c.seed} ${t}ms 문구="${line.slice(0, 26)}"`);
        }
      } else {
        acc.lateN += 1;
        if (wordPerfect) {
          acc.latePerfectWord += 1;
          if (acc.ex.length < 6) acc.ex.push(`늦게 눌렀는데 «완벽» 문구 시드${c.seed} ${t}ms 칸${cell.i} op=${cell.op}`);
        }
        if (boxPerfect) {
          acc.latePerfectBox += 1;
          if (acc.ex.length < 6) acc.ex.push(`늦게 눌렀는데 «완벽» 상자 시드${c.seed} ${t}ms 칸${cell.i} op=${cell.op}`);
        }
      }
      h.close();
    }
  }
  return acc;
}

/* 📐 문장들 — **변이 검증이 같은 함수를 씁니다**(기준선과 다른 자를 대면 안 잡혀요) */
const C1 = (b) => ({ ok: b.late.hotFrames === 0 && b.late.n >= SEEDS.length * LATE_T.length });
const C1b = (p) => ({ ok: p.latePerfectWord === 0 && p.latePerfectBox === 0
  && p.lateN >= SEEDS.length * LATE_T.length });
const C2 = (b) => ({ ok: b.n >= MIN_BRACKET
  && spread(b.R) <= R_SPREAD_MAX && spread(b.A) >= A_SPREAD_MIN });
const C3 = (b, ceilRef) => {
  if (b.n < MIN_BRACKET) return { ok: false, got: null };
  const got = mean(b.R) * ceilRef;
  return { ok: Math.abs(got - OLD_ABS) <= ANCHOR_TOL, got };
};
const C4 = (p) => ({ ok: p.boxBad === 0
  && p.weakPerfect >= MIN_WEAK_PERFECT && p.strongPerfect >= MIN_STRONG_PERFECT
  && p.weakWord === p.weakPerfect });

/* ══════════════════════════════════════════════════════════════════════ */
async function main() {
  console.log("── 🏔️ C. 「완벽」이 판 천장의 종속값인가 ──");

  /* ══════════ 0. 변이 정규식이 지금 소스에 걸리는가 ══════════ */
  const bad = momentMutsOK(MUT);
  const nMut = Object.values(MUT).reduce((a, m) => a + m.length, 0);
  check(bad.length === 0 && !!WEAK_WORD,
    `C-0. 🔴 변이 정규식 ${nMut}개가 지금 \`beta/winger-moment.js\`에 전부 걸린다`
    + ` · 🗣️ 축하 문구도 소스에서 뜯었다 (${WEAK_WORD ? JSON.stringify(WEAK_WORD) : "🔴 못 뜯음"})`
    + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 "안 도는" 상태예요**`
      + bad.map((x) => `\n       · ${x}`).join("") : "")
    + (WEAK_WORD ? "" : `\n     🔴 \`W.great + (ctx.weak ? "…" : "")\` 모양이 바뀌었습니다 — C-4가 아무것도 안 지켜요`));
  if (bad.length || !WEAK_WORD) { console.log(`\n❌ 빨간불 ${fail}건`); process.exit(1); }

  /* 🏔️ **닫힌 식 천장 — 산식은 소스에서 그대로 부릅니다**(값을 베껴 적지 않아요).
   *    `oneErr(x, x)`는 오차가 **바닥(`CELL_FLOOR`)에 걸린** 자리예요 — 「이 칸 어딘가」의 바닥이고,
   *    그게 `s`의 천장을 만듭니다. 🦶 주발(`K.STRONG`) · 🫀 `COND_REF` · ♿ 꺼짐. */
  const T = momentDom(null).W2Moment._t;
  const floorErr = T.oneErr(50, 50);
  const ceilRef = T.sOne(floorErr, T.winMul(COND_REF, T.K.STRONG));

  const b = await bracket(null);
  const p = await pressProbe(null, PRESS_T, true);
  const q = await pressProbe(null, LATE_T, false);
  const r1 = C1(b), r1b = C1b(q), r2 = C2(b), r3 = C3(b, ceilRef), r4 = C4(p);

  check(r1.ok,
    `C-1. ⏱️ **「빨리 차라」가 산다** — t ≥ ${LATE_T[0] / 1000}s에 ◎가 **한 칸도 안 뜬다**`
    + ` (${b.late.hotFrames} / ${b.late.n} 프레임)`
    + `\n     🔎 측정 조건 — 판 ${SEEDS.length}벌 × 늦은 시각 ${LATE_T.length}점(${LATE_T.join("·")}ms) · 종류 2 · 주발 2 · 컨디션 3`
    + `\n     📏 여유 — 그 시각의 \`최대 밝기 ÷ 천장\`이 **${b.late.maxRatio.toFixed(4)}**입니다.`
    + ` 이진 문장이지만 밑에 깔린 연속량은 문턱에서 멀어요`
    + `\n     🌍 이 문장은 **\`boardCeil\`을 판 시작에 한 번만 잰다**는 전제 위에 섭니다 —`
    + ` 매 프레임 다시 재면 가장 밝은 칸이 늘 ◎라 시간 축이 통째로 죽어요`
    + (r1.ok ? "" : `\n     🔴 **늦게 눌러도 「완벽」이 나옵니다 — 「빨리 차라」가 죽었어요**`));

  check(r1b.ok,
    `C-1b. ⏱️ **늦게 누르면 「완벽」이 안 나온다** — 가장 밝은 칸을 실제로 눌러 봄 (${q.lateN}판)`
    + `\n     «완벽» 문구 ${q.latePerfectWord}회 · «완벽» 상자 ${q.latePerfectBox}회 (둘 다 박아 둔 0)`
    + `\n     🔑 C-1이 **화면**을, 여기가 **판 끝**을 봅니다 — 한쪽만 매 프레임 재계산해도 잡혀요`
    + (q.ex.length ? `\n     ${q.ex.slice(0, 3).join("\n     ")}` : ""));

  check(r2.ok,
    `C-2. 🏔️ **완벽 문턱이 「판 천장의 종속값」이다** — 판마다 화면에서 문턱을 재서 견줍니다`
    + `\n     ㉠ 천장 대비 비  폭 **${b.n ? spread(b.R).toFixed(5) : "—"}** ≤ ${R_SPREAD_MAX}`
    + `   (평균 ${b.n ? mean(b.R).toFixed(5) : "—"} · 판마다 **같아야** 종속)`
    + `\n     ㉡ 문턱 절대값  폭 **${b.n ? spread(b.A).toFixed(5) : "—"}** ≥ ${A_SPREAD_MIN}`
    + `   (판마다 **달라야** 절대 문턱이 아님)`
    + `\n     🔎 측정 조건 — 브래킷이 잡힌 판 ${b.n} / ${b.rows.length}(바닥 ${MIN_BRACKET}) ·`
    + ` 0~${SWEEP_END}ms를 ${SWEEP_DT}ms로 쓸어 ◎가 꺼지는 순간의 밝기로 문턱을 집습니다`
    + `\n     🏔️ 그 판들의 천장 ${b.n ? Math.min.apply(null, b.ceils).toFixed(3) : "—"} ~ ${b.n ? Math.max.apply(null, b.ceils).toFixed(3) : "—"}`
    + ` · ◎가 꺼진 시각 ${b.n ? Math.min.apply(null, b.offAt) : "—"}~${b.n ? Math.max.apply(null, b.offAt) : "—"}ms`
    + `\n     🔒 \`PERFECT_OF_CEIL\`을 **한 번도 안 읽습니다** — 읽어 오면 상수를 바꿔도 안 잡혀요.`
    + ` 「값」이 아니라 **㉠은 일정 · ㉡은 흩어짐이라는 관계**를 봅니다`
    + (b.n < MIN_BRACKET ? `\n     🔴 **문턱을 못 잡은 판이 많습니다** — ◎가 아예 안 뜨는 판이 늘었다는 뜻이에요`
      + ` (절대 문턱으로 되돌리면 천장 < 문턱인 판에서 ◎가 통째로 사라집니다)` : "")
    + (b.n >= MIN_BRACKET && spread(b.R) > R_SPREAD_MAX
      ? `\n     🔴 **비가 판마다 다릅니다 — 문턱이 천장을 안 따라가요**(절대 문턱의 지문입니다)` : "")
    + (b.n >= MIN_BRACKET && spread(b.A) < A_SPREAD_MIN
      ? `\n     🔴 **절대값이 판마다 같습니다 — 그게 곧 절대 문턱**이에요` : ""));

  check(r3.ok,
    `C-3. ⚖️ **중립화 앵커** — 🦶 주발 · 🫀 컨디션 ${COND_REF} · ♿ 꺼짐에서 완벽 문턱이`
    + ` **옛 절대 문턱 ${OLD_ABS}**와 같다`
    + `\n     실측 — 비 평균 ${b.n ? mean(b.R).toFixed(6) : "—"} × 닫힌 식 천장 ${ceilRef.toFixed(6)}`
    + ` = **${r3.got == null ? "—" : r3.got.toFixed(6)}** (허용 ±${ANCHOR_TOL})`
    + `\n     🔑 **산식은 소스에서** — 천장은 \`_t.oneErr(x, x)\`(오차가 바닥에 걸린 자리) ·`
    + ` \`_t.sOne\` · \`_t.winMul(${COND_REF}, K.STRONG)\`을 **그대로 불러** 얻습니다`
    + `\n     🔒 **박아 둔 건 ${OLD_ABS} 하나**예요. \`PERFECT_OF_CEIL\`(종속값)을 안 적었으니,`
    + ` balancer가 \`CELL_FLOOR\`·\`ONE_WIN\` 한 벌을 다시 잡아도 **이 문장은 그대로 삽니다**`
    + `\n     🌍 뒤집히는 자리 — 「중립화 기준을 ${OLD_ABS}가 아닌 값으로 옮기자」는 **난이도를 옮기는 판정**입니다.`
    + ` 그날은 \`OLD_ABS\`를 먼저 고치고 designer/balancer 문서를 여세요`
    + (r3.ok ? "" : `\n     🔴 **중립화가 깨졌습니다** — 옛 판과 난이도가 달라진 거예요`));

  check(r4.ok,
    `C-4. 🦶 **약발 판에서도 「완벽」이 열린다** — ◎를 실제로 눌러 봄 (${p.n}판)`
    + `\n     실측 — 🦶 주발 완벽 ${p.strongPerfect}(바닥 ${MIN_STRONG_PERFECT}) ·`
    + ` **약발 완벽 ${p.weakPerfect}**(바닥 ${MIN_WEAK_PERFECT}) · 그중 축하 문구 ${p.weakWord}`
    + `\n     🎨 ◎를 눌렀는데 상자가 «완벽»이 아닌 판 ${p.boxBad}회 (박아 둔 0)`
    + `\n     🗣️ 축하 문구는 소스에서 뜯었습니다 — ${JSON.stringify(WEAK_WORD)}`
    + `\n     🚨 **이 줄이 범민 님이 보고 계신 증상 자리**예요. 옛 절대 문턱 ${OLD_ABS}는 약발 판의`
    + ` 천장(0.652)보다 **위**라, 「약발 완벽」도 축하 문구도 **한 번도 안 떴습니다**`
    + `\n     🔒 🦶 **양쪽을 다 셉니다** — 한쪽만 재면 100%나 0%가 나와요`
    + (p.weakPerfect < MIN_WEAK_PERFECT
      ? `\n     🔴 **약발 판에서 「완벽」이 안 열립니다 — 문턱이 천장 위에 있어요**` : "")
    + (p.weakWord !== p.weakPerfect
      ? `\n     🔴 **약발로 완벽을 냈는데 축하 문구가 안 떴습니다** (${p.weakPerfect - p.weakWord}회)` : "")
    + (p.boxBad ? `\n     🔴 **화면은 ◎인데 상자색이 다릅니다 — \`ender\`가 다른 천장을 씁니다**` : "")
    + (p.ex.length ? `\n     ${p.ex.join("\n     ")}` : ""));

  /* ══════════════════════════════════════════════════════════════════════
   * 🧪 변이 — **기준선이 초록불인 걸 위에서 먼저 찍고** 시작합니다
   * ══════════════════════════════════════════════════════════════════════ */
  console.log(`\n── 🧪 변이 — 되돌리면 정말 빨간불이 뜨는가 (기준선 ${fail === 0 ? "🟢 초록불" : `🔴 빨간불 ${fail}건`}) ──`);
  if (fail > 0) {
    console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다 — 위를 먼저 고치세요.");
  } else {
    const CASES = [
      /* 🚨 **engineer가 되돌려 본 그 흠** — 두 문장이 겹쳐 봅니다(하나가 죽어도 남아요) */
      ["ABS75", "C-2", async (m) => !C2(await bracket(m)).ok],
      ["ABS75", "C-4", async (m) => !C4(await pressProbe(m, PRESS_T, true)).ok],
      ["LIVE_PAINT", "C-1", async (m) => !C1(await bracket(m)).ok],
      ["LIVE_TAP", "C-1b", async (m) => !C1b(await pressProbe(m, LATE_T, false)).ok],
      ["RATIO_NUDGE", "C-3", async (m) => !C3(await bracket(m), ceilRef).ok],
      ["ENDER_ABS", "C-4", async (m) => !C4(await pressProbe(m, PRESS_T, true)).ok],
      ["WEAK_WORD_OFF", "C-4", async (m) => !C4(await pressProbe(m, PRESS_T, true)).ok],
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
    /* ══════════════════════════════════════════════════════════════════
     * 🔒 **반대 방향** — 물면 안 되는 것도 확인합니다
     * ══════════════════════════════════════════════════════════════════
     * 🔑 성질이 다른 것을 한 문장에 묶지 않았다는 증거예요. 이게 없으면
     *    «아무거나 물면 초록불»인 문장이 섞여 있어도 못 알아챕니다. */
    const KEEP = [
      /* 🔗 비를 살짝 민 변이는 **종속 구조도 시간 축도 안 건드립니다** —
       *    C-2·C-1은 초록불로 남아야 해요(잡는 건 앵커 C-3뿐 · 한 계약에 주인은 하나). */
      ["RATIO_NUDGE", "C-2", async (m) => C2(await bracket(m)).ok],
      ["RATIO_NUDGE", "C-1", async (m) => C1(await bracket(m)).ok],
      /* 🗣️ 문구만 지운 변이는 **판정을 한 톨도 안 바꿉니다** — C-1은 초록불로 남아야 해요 */
      ["WEAK_WORD_OFF", "C-1", async (m) => C1(await bracket(m)).ok],
    ];
    for (const [name, guard, stays] of KEEP) {
      let ok = null, err = null;
      try { ok = await stays(MUT[name]); } catch (e) { err = e; }
      check(ok === true,
        `변이-${name} → **${guard}는 초록불로 남아야** 한다 (문장끼리 성질이 안 섞였다는 증거)`
        + (err ? `\n     💥 ${err.message}`
          : ok ? "" : `\n     🔴 **엉뚱한 문장이 물었습니다** — ${guard}가 제 몫 밖의 것까지 보고 있어요`));
    }
  }

  console.log(`\n${fail ? `❌ 빨간불 ${fail}건` : "✅ 전부 통과"} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  process.exit(fail ? 1 : 0);
}
main();
