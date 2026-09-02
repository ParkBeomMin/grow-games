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
 * 🔄 **2026-09-02 갱신** — 미니게임이 **넷 → 하나**가 됐습니다(116번). 🏃 컷인 · 🎯 킬패스 ·
 *    🧱 차단은 **형태째** 사라졌고, 판은 🥅 **골문 6칸** 하나예요.
 *
 *   · 🥅는 **골문 6칸**이고 `onTap`은 **`.w2m-goal` 하나**에만 달립니다
 *   · 🔑 **밝기(`opacity`)가 곧 그 칸의 `s`**입니다 — 그려진 것과 판정하는 것이 같은 값
 *   · 🦶 주발 쪽 절반의 칸이 **더 넓게** 밝습니다. 🔒 **6칸은 50에 앉는 칸이 없어 3 : 3**이에요
 *   · 🧤 키퍼가 **가운데(50)에서 출발해 한쪽으로 미끄러지며** 각을 좁힙니다
 *     🔒 **계약 ①** 가운데를 안 넘어요 (넘으면 좌우 대칭인데 한쪽만 골 = 절벽) → **G-8**
 *     🔒 **계약 ②** 빈 곳이 늘 줄어요 (넓어지면 «빨리 차라»가 죽음) → **G-9**
 *     🔑 여기는 **화면에서 재는 쪽**이에요. 같은 계약의 **구조 쪽**(소스 상수의 부등호)은
 *        `moment-test.js` **D-2b**가 봅니다 — 한 계약에 주인은 하나입니다
 *   · 🧱 **수비는 판을 안 엽니다** — `s = 0.5`만 돌려줘요(designer 117번 §6 c안) → **G-10**
 *   · 🏔️ `CELL_FLOOR`가 `s`의 **천장**을 잡습니다 → **G-11·G-11b·G-11c**
 *   · `.w2m-half` · `.w2m-keeper-body` · `.w2m-stake`는 **일부러 살렸습니다**(다른 검사가 봐요)
 *
 * ⚠️ **뒤집히면 이 파일이 옛 계약이 되는 판정**
 *   · *"자유 좌표로 되돌리자"* → G-1·G-2·G-3·G-4가 통째로 옛 계약입니다
 *   · *"밝기에 보정 곡선을 얹자"* → **G-2가 그 판정을 막는 유일한 자리**예요.
 *     얹기로 정했다면 값을 고치지 말고 **먼저 여기를 여세요**
 *   · *"키퍼를 다시 한 자리에 세우자"* · *"양쪽에서 협공하자"* → **G-8**을 먼저 여세요.
 *     🔑 옛 세계에서 계약 ①은 `|kc − 50| ≥ 4`라는 **거리**였습니다. 출발이 가운데로 오면서
 *     거리로는 못 막게 됐고 **부호 고정**으로 형태가 바뀌었어요 — 관계도 뒤집힙니다
 *   · *"🥅를 우리 골문으로 돌려 수비용을 만들자"*(117번 §6-4) → **G-10**이 옛 계약이 됩니다.
 *     🚨 그때도 🧱 차단의 **형태**(칩 둘 읽기 · 2단 국면 · 띠)는 되살리지 마세요
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
const a_w = (r) => r.floors.map((f) => f.w);

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
  M6_BEST50: [[/ {6}best: openLeft \? near \/ 2 : \(near \+ 100\) \/ 2,/, "      best: 50,"]],
  /* 🔴 M8 — 🔮 **예고 띠를 판정에 씁니다.** 소스가 *"⛔ 예고 띠를 판정에 쓰지 마세요 —
   *    그 순간 규칙이 둘이 되고, 화면이 결과를 만드는 자리가 됩니다"*라고 못 박은 자리예요.
   *    🔑 눈으로는 **아무것도 안 달라 보입니다** — 밝기도 예고도 그대로 그려지니까요. */
  M8_NEXT_JUDGES: [[/ {6}const s = cellS\(c, a\);/,
    "      const s = cellS(c, oneAt(board, (nowMs() - t0) \/ 1000 + ONE.look \/ 1000));"]],
  /* 🔮 M9 — **미래 흘리기의 손잡이만** 흔듭니다(0.45초 → 1.5초). 변이가 아니라 **자**예요:
   *    화면은 달라지고 **`s`는 한 톨도 안 달라져야** 합니다(G-7). 아래 M9_0은 반대쪽 끝. */
  /* 🔴 **쉼표를 정규식에 넣지 마세요.** `ONE.post`가 지워지며 `look`이 표의 **마지막 키**가
   *    되어 뒤의 쉼표가 사라졌고, `/look: \d+,/`가 **안 걸려 검사가 통째로 죽었습니다**
   *    (2026-09-02 · 💥 종료 코드 2). 🔑 **키 하나만** 겨눕니다 — 이웃한 문장부호는 안 겨눠요. */
  M9_LOOK_LONG: [[/look: \d+/, "look: 1500"]],
  M9_LOOK_ZERO: [[/look: \d+/, "look: 0"]],
  /* 🔴 M7 — 🗣️ **폐기한 낱말을 되살립니다.** 「판정 창」은 만든 사람의 말이에요. */
  /* 🔴 M7 — 🗣️ **폐기한 낱말을 되살립니다.** 「판정 창」·「코스 칸」은 만든 사람의 말이에요.
   *    🔑 옛 정규식은 `head(ctx.stake, ctx.title, "…")`를 겨눴는데, 낱말이 `WORDS`로
   *       옮겨 가면서 **안 걸리게 됐습니다** — 그 상태의 변이 검사는 「안 도는」 겁니다. */
  /* 🔒 **문장을 통째로 겨누지 않습니다.** 122번에서 `why`에 «테두리가 있는 칸»이 끼어들자
   *    통문장 정규식이 **안 걸려 G-0이 빨간불**이 됐어요(그 사이 M7_WORD는 안 도는 상태). */
  M7_WORD: [[/ {6}why: "🧤 키퍼가[^"]*",/,
    '      why: "판정 창이 가장 넓은 코스 칸을 누르세요",']],

  /* ══════════════════════════════════════════════════════════════
   * 🚨 여기부터 다섯은 **2026-09-02에 새로 겨눈 자리**입니다
   *    engineer가 116번 §6에서 흠 여덟을 내 봤더니 **아무도 안 잡았어요.**
   *    격자를 보던 검사가 전부 죽거나 빨간불이라 그랬습니다.
   * ══════════════════════════════════════════════════════════════ */

  /* 🔴 E-M5 — 🎚️ **판정 창을 두 배로.** 난이도가 통째로 반이 됩니다.
   *    🔑 밝기도 판정도 **같이** 커지니 G-1·G-2·G-3은 전부 초록불이에요 —
   *       「그림과 판정이 같은가」만 보는 문장은 **난이도를 못 봅니다.**
   *       보이는 자리는 둘: **`s`의 천장**(G-11b)과 **6칸이 다 밝아지는 것**(G-11c). */
  /* 🔒 **값을 정규식에 박지 않습니다** — `ONE_WIN`이 23으로 움직이는 날
   *    `/= 22;/`는 **안 걸리고**, 그 변이 검사는 조용히 «안 도는» 상태가 돼요
   *    (G-0이 잡아 주긴 하지만, 고칠 자리가 하나 더 느는 건 그 자체로 빚입니다). */
  E_WIN2: [[/const ONE_WIN = [\d.]+;/, "const ONE_WIN = 44;"]],

  /* 🔴 E-M6 — 🧤 **키퍼가 가운데를 넘게** 합니다(계약 ①의 정확한 반대).
   *    출발 거리의 부호를 뒤집으면 `-off0` → `slide-off0`으로 가운데를 지나가요.
   *    그 순간 좌우 빈 곳이 같아지는 프레임이 생기고 — **대칭으로 보이는 화면인데
   *    한쪽만 정답**인 절벽이 납니다(거울 칸이 0점). */
  E_KEEPER_CROSS: [[/ {4}const kc = 50 \+ b\.side \* \(b\.off0 \+ b\.slide \* p\);/,
    "    const kc = 50 + b.side * (-b.off0 + b.slide * p);"]],

  /* 🔴 E-M7 — 🧱 **수비 가드를 뺍니다.** 수비 상황에 **상대 골문**이 뜹니다 —
   *    화면이 만드는 기대(넣는다)와 상황의 핵심(막는다)이 정면으로 싸워요. */
  /* 🔄 **2026-09-02 — 가드의 주인이 옮겨 갔습니다.** 예전에는 `o.kind === "defend"`를
   *    이 자리와 `game.js` 두 곳에 적었는데(방어 겹침 — 한쪽을 지워도 증상이 0장),
   *    engineer가 **`opens(kind)` 하나**로 모았어요(120번 §3-2).
   * 🔒 그래서 정규식도 **`opens` 쪽**을 겨눕니다. 낱말을 안 박아요 — 안쪽 문장이 바뀌어도 삽니다. */
  E_NO_DEFEND_GUARD: [[/ {4}if \(!opens\(o\.kind\)\) \{[^\n]*\}/,
    "    /* 🧪 가드 제거 */"]],

  /* 🔴 E-M8 — 🏔️ **`CELL_FLOOR`를 0으로.** `s`의 천장이 사라져 능숙이 만점을 굽습니다.
   *    🔑 **판정도 밝기도 여전히 같은 한 줄을 지나서** G-2는 초록불이에요. */
  E_FLOOR0: [[/const CELL_FLOOR = [\d.]+;/, "const CELL_FLOOR = 0;"]],

  /* 🔴 K2 — 🧤 **미끄러지는 거리를 몸이 벌어지는 폭보다 크게.** 계약 ②의 반대예요 —
   *    빈 곳이 **넓어지는** 판이 생겨 «기다릴수록 유리»가 되고 «빨리 차라»가 죽습니다.
   *    (`slide` 최대 16 < `cov1 − cov0` = 24 라는 구조가 이걸 막고 있어요) */
  K_SLIDE_FAST: [[/slide: \[[\d.]+, [\d.]+\]/, "slide: [5, 40]"]],
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
  /* ♿ **판정 창 확대는 `localStorage`로만 켜집니다.** `momentDom`이 url 없이 jsdom을 띄우면
   *    origin이 opaque라 `getItem`이 던지고, `wideOn()`의 try/catch가 그걸 삼켜
   *    **확대가 검사에서 한 번도 안 걸립니다** — 「환경이 우연히 막아 줌」의 형태예요.
   *    `_load.js`의 `momentDom`에 url을 넣어 고쳤고, 여기서 실제로 켜 봅니다. */
  if (o.wide) W.localStorage.setItem("grow-wide-judge", "1");
  const host = W.document.getElementById("host");
  let info = null, calls = 0;
  W.W2Moment.play(host, { moment: "oneone", kind: o.kind || "goal",
    condition: o.cond == null ? 80 : o.cond, foot: o.foot || "R" },
  (j, i2) => { info = i2; calls += 1; });
  await wait(6);
  /* ▶️ 준비 화면을 실기기 순서로 지납니다 — **게임이 여는 문으로** 들어가요 */
  const go = host.querySelector(".w2m-go");
  if (go) { pressDom(W, go); await wait(6); }
  return {
    W, host, T: W.W2Moment._t,
    s: () => (info ? info.s : null),
    info: () => info, calls: () => calls,
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
/* 🧤 **몸통의 반폭** — `.w2m-keeper-body`의 `scaleX`가 곧 `cov / 50`입니다(몸통 폭이 골문 폭).
 *    🔒 소스에서 상수를 읽어 오지 않고 **그려진 transform을 되읽습니다.** */
const covOf = (h) => {
  const m = (h.host.querySelector(".w2m-keeper-body") || { style: {} }).style.transform || "";
  const g = m.match(/scaleX\(([-\d.]+)\)/);
  return g ? Number(g[1]) * 50 : NaN;
};
/* 🥅 **화면만으로 읽는 판의 기하** — 숨은 정보가 없다는 계약을 그대로 씁니다.
 *
 *   빈 곳  = 골문 끝(0 또는 100) ↔ 🧤 몸의 가까운 끝 사이
 *   좋은 지점 = 그 빈 곳의 **한가운데**
 *
 * 🌍 **이 문장이 서 있는 세계**: 「좋은 지점 = 빈 곳의 한가운데」인 세계입니다.
 *    🔴 *"좋은 지점을 구석으로 밀자"* 같은 판정이 나오면 **여기부터 여세요** —
 *       G-3·G-8·G-9·G-11이 전부 이 한 줄 위에 서 있습니다.
 * 🔑 소스의 `_t.oneAt`을 안 부릅니다. 옛 G-3이 `oneAt({ kc }, …)`로 불렀는데
 *    무대의 **모양이 바뀌어**(`{side, off0, slide}`) 늘 `NaN`이 나왔고,
 *    조건이 한 번도 안 맞아 **「쓸 만한 판 0벌」로 조용히 아무것도 안 지켰습니다.** */
const geomOf = (h) => {
  const kc = kcOf(h), cov = covOf(h);
  if (!isFinite(kc) || !isFinite(cov)) return null;
  const openLeft = kc > 50;                       // 키퍼가 오른쪽에 있으면 빈 곳은 왼쪽
  const near = openLeft ? kc - cov : kc + cov;    // 빈 곳을 향한 몸 끝
  return { kc, cov, openLeft, near,
    openW: openLeft ? near : 100 - near,
    best: openLeft ? near / 2 : (near + 100) / 2 };
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
    /* 🔒 **6칸**입니다(2026-09-02 · 116번). 5칸을 단언하던 문장이 그대로 남아 있었어요 —
     *    판이 정상인데 검사가 빨간불이면 **그 빨간불이 남의 변이 신호까지 먹습니다.**
     *    🔑 6은 「50에 앉는 칸이 없다 = 🦶가 3:3으로 갈린다」는 계약이 걸린 수예요. */
    check(cs.length === 6 && h.host.querySelectorAll(".w2m-goal").length === 1
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
      const n = h.host.querySelectorAll(".w2m-cell").length;
      const gap = 100 / n;                                   // 칸 중심 간격 = 한 칸 폭
      const ws = [];
      let kc0 = NaN;
      for (const ms of TIMES) {
        await h.at(ms);
        const cs = cellsOf(h);
        /* 🔒 「좋은 지점」을 **화면에서** 읽습니다(🧤 자리 + 몸통 폭).
         * 🔴 옛 줄은 `h.T.oneAt({ kc }, …)`였어요 — 무대의 **모양이 바뀌어**
         *    (`{ kc }` → `{ side, off0, slide }`) `best`가 늘 `NaN`이 됐고,
         *    아래 조건이 한 번도 안 맞아 **「쓸 만한 판 0벌」**이 됐습니다.
         *    「픽스처가 다른 모양」의 정확한 형태예요 — 빨간불이 났지만 **아무것도 안 쟀습니다.** */
        const g = geomOf(h);
        if (!g) break;
        if (!isFinite(kc0)) kc0 = g.kc;
        /* 🔒 **같은 절반의 이웃 쌍 전부**를 봅니다 — 옛 줄은 `[[0,1],[3,4]]`로 칸 번호를
         *    박아 뒀는데, 6칸에서는 `[1,2]`·`[4,5]`도 같은 절반이에요.
         *    🔑 칸 번호를 박으면 칸 수가 바뀔 때 **수확만 줄고 아무 말도 안 합니다.** */
        const pairs = [];
        for (let i = 0; i + 1 < cs.length; i++) {
          if (cs[i].strong === cs[i + 1].strong) pairs.push([i, i + 1]);
        }
        for (const [i, j] of pairs) {
          /* 🔒 양끝이 눌린 칸(0 또는 1)은 역산이 안 됩니다 */
          if (cs[i].op <= 0 || cs[j].op <= 0 || cs[i].op >= 1 || cs[j].op >= 1) continue;
          if (!(g.best > cs[i].x && g.best < cs[j].x)) continue;  // 「좋은 지점」이 사이에 들어야
          /* 🏔️ **`CELL_FLOOR` 바닥이 걸린 칸은 뺍니다** — 바닥이 걸리면 오차 합이
           *    칸 간격이 아니게 되어 역산이 틀려요. 바닥이 걸렸는지는 **소스가 내보낸
           *    `oneErr`**에게 물어봅니다(상수를 베껴 오지 않았어요). */
          if (h.T.oneErr(cs[i].x, g.best) !== Math.abs(cs[i].x - g.best)) continue;
          if (h.T.oneErr(cs[j].x, g.best) !== Math.abs(cs[j].x - g.best)) continue;
          ws.push({ ms, w: gap / ((1 - cs[i].op) + (1 - cs[j].op)) });
          break;
        }
      }
      /* 🔒 한 판에서 **두 시각 이상** 잴 수 있어야 「좁아진다」를 말할 수 있어요 */
      if (ws.length >= 2) rows.push({ seed, kc: kc0, ws });
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
      /* 🔴 옛 줄은 `["cutin", "oneone", "killpass", "block"]` **moment 네 가지**를 돌았어요 —
       *    판이 넷이던 시절입니다. 지금은 `moment`가 **화면을 고르는 데 안 쓰입니다**
       *    (엔진이 준 이름을 그대로 되돌려 줄 뿐이에요). 그대로 두면 **같은 판을 네 번**
       *    열면서 «넷을 봤다»고 말하는 검사가 됩니다.
       * ✅ 갈리는 것은 **카드 종류(낱말)**뿐이라 `kind`로 돕니다.
       *    🧱 `defend`는 화면이 아예 안 떠서 여기 없는 게 맞아요 — **G-10이 봅니다.** */
      for (const kind of ["goal", "assist"]) {
        const W = momentDom(muts);
        W.Math.random = mulberry32(SEEDS[0]);
        const st = W.setTimeout; W.setTimeout = (fn) => st(fn, 0);
        const host = W.document.getElementById("host");
        W.W2Moment.play(host, { moment: "oneone", kind, condition: 80, foot: "R" }, () => {});
        await wait(6);
        const go = host.querySelector(".w2m-go");
        const ready = host.textContent || "";
        if (go) { pressDom(W, go); await wait(6); }
        const live = host.textContent || "";
        out.push({ moment: kind, text: ready + " " + live,
          stake: !!host.querySelector(".w2m-stake"),
          what: !!host.querySelector(".w2m-what"), why: !!host.querySelector(".w2m-why") });
        try { W.close(); } catch (e) { /* 이미 닫힘 */ }
      }
      return out;
    }
    const P5 = (rows) => {
      const hits = rows.flatMap((r) => BAN.filter((b) => r.text.indexOf(b) >= 0).map((b) => `${r.moment}: "${b}"`));
      const noHead = rows.filter((r) => !(r.stake && r.what && r.why)).map((r) => r.moment);
      return { hits, noHead, ok: hits.length === 0 && noHead.length === 0 && rows.length === 2 };
    };
    const baseW = await words(null);
    const g5 = P5(baseW);
    check(g5.ok,
      `G-5. 🗣️ **렌더된 화면에 폐기한 낱말이 없다** (${BAN.map((b) => `「${b}」`).join(" · ")}) · 세 줄 위계가 ⚽🅰️ 둘 다 선다`
      + `\n     🔎 측정 조건 — 준비 화면 + 본 게임의 \`textContent\`를 **카드 종류 둘 다** 봅니다`
      + ` (소스가 아니에요 — 주석에는 남아야 합니다). 🧱 수비는 화면이 없어 G-10이 봐요`
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
   *    `.w2m-cell-soon` · `.w2m-cell-in`. 🪦 `.w2m-cell-rise`는 **지워졌습니다**(2026-09-02 · 122번) —
   *    `tier-in-test.js` **T-1b**가 되살아나면 빨간불을 냅니다. 소스가 못 박은 계약:
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
   * 🧤 G-8·G-9·🏔️ G-11 — **한 번 쓸어서 넷을 같이 잽니다**
   * ══════════════════════════════════════════════════════════════════════
   * 🚨 **왜 새로 생겼나** — engineer가 116번 §6에서 새 코드에 흠 여덟을 냈는데
   *    **아무도 안 잡았습니다.** 격자를 보던 검사가 전부 죽거나 빨간불이었어요.
   *    아래 넷이 그 중 넷을 맡습니다(나머지 넷은 G-1·G-2·G-3이 이미 봐요).
   *
   * 🌍 **이 문장들이 서 있는 세계** (2026-09-02 · 116번 §1-2)
   *    🥅 판은 하나 · 🧤 키퍼가 **가운데(50)에서 출발해 한쪽으로 미끄러지는** 세계입니다.
   *    🔴 옛 세계는 *"키퍼가 한 자리에 서 있고 몸만 벌어진다"*(`ONE.kc = [18, 82]`)였고,
   *       그 세계에서는 계약 ①이 `|kc − 50| ≥ 4`라는 **거리**로 서 있었어요.
   *       출발이 가운데로 오면서 거리로는 못 막게 됐고 **부호 고정**으로 형태가 바뀌었습니다.
   *    ⚠️ *"키퍼를 다시 세우자"* 또는 *"양쪽에서 협공하자"*는 판정이 나오면
   *       **G-8을 먼저 여세요** — 그때는 이 문장이 통째로 옛 계약이 됩니다.
   */
  const SWEEP_SEEDS = [];
  for (let i = 1; i <= 20; i++) SWEEP_SEEDS.push(i * 11 + 3);      // 🎲 판 20벌 × ♿ 2 = 40벌
  const SWEEP_T = [];
  for (let i = 0; i <= 12; i++) SWEEP_T.push(i * 280);             // ⏱️ 0 ~ 3360ms (`life` 안쪽)
  /* 🔒 **문턱은 전부 여기 박습니다** — 소스에서 읽어 오면 상수를 바꿔도 안 잡혀요.
   * 🏔️ `CELL_FLOOR`의 **비**(0.30)는 지금 확정값이고, balancer가 0.36을 재고 있습니다.
   *    바뀌면 이 줄이 빨간불로 알려 줍니다 — 그때 **여기 하나만** 고치세요. */
  const FLOOR_R = 0.36;
  /* 🔑 역산의 잡음 폭: `opacity`가 `toFixed(3)`이라 `s`에 ±0.0005가 실립니다.
   *    실측 흔들림은 바닥값 5.000에서 **±0.023**이었어요. 문턱은 그 **4배**에 뒀습니다 —
   *    변이(`CELL_FLOOR = 0`)는 **1.0 이상** 벌어지니 사이가 넉넉합니다. */
  const FLOOR_EPS = 0.10;
  const MIN_FLOOR_N = 60;                                          // 🔒 표본 바닥 (실측 ~150)
  /* 🎚️ **`s`의 천장** — 만점(1.0)과 견줍니다. `CELL_FLOOR`가 만드는 바닥이 천장을 잡아요.
   * 🔎 **격자의 어느 칸에서 재나** — 천장이 가장 높이 서는 칸입니다:
   *    🫀 컨디션 100 · ♿ 확대 켬 · 🦶 주발 쪽. 여기서도 안 닿으면 어디서도 안 닿아요.
   * 📏 실측 0.866. 계획된 움직임을 다 넣어 봐도 안전합니다 —
   *    `CELL_FLOOR` 0.36 → 0.839(내려감) · `ONE_WIN` 23.7 → 0.876.
   *    변이(창 ×2)는 **0.933**, (바닥 0)은 **0.986**입니다. */
  const S_CEIL = 0.90;
  /* 🔦 **6칸이 전부 밝은 프레임의 비율.** 격자가 «고를 것»을 보여 주려면 어두운 칸이 남아야 해요.
   *    실측 **0 / 520**. 창을 두 배로 하면 **3.7%**가 됩니다. 문턱은 1%. */
  const ALL_LIT_R = 0.01;

  async function sweep(muts) {
    const boards = [];
    const floors = [];
    let sMax = 0, allLit = 0, frames = 0;
    for (const seed of SWEEP_SEEDS) {
      for (const wide of [false, true]) {
        /* 🫀 100 · ♿ 켬 — **천장이 가장 높이 서는 칸**에서 잽니다 */
        const h = await open({ seed, wide, cond: 100, muts });
        const sides = new Set();
        let grew = 0, prev = Infinity, minAbs = Infinity, seen = 0;
        for (const ms of SWEEP_T) {
          await h.at(ms);
          const g = geomOf(h);
          const cs = cellsOf(h);
          if (!g || !cs.length) break;
          seen += 1;
          /* 🧤 계약 ① — **가운데를 넘지 않는다.** 부호가 판 내내 하나여야 해요 */
          sides.add(Math.sign(g.kc - 50));
          minAbs = Math.min(minAbs, Math.abs(g.kc - 50));
          /* 🧤 계약 ② — **빈 곳이 늘 줄어든다.** 넓어진 프레임이 하나라도 있으면 빨간불 */
          if (prev !== Infinity && g.openW > prev + 1e-9) grew += 1;
          prev = g.openW;
          for (const c of cs) sMax = Math.max(sMax, c.op);
          if (cs.every((c) => c.op > 0)) allLit += 1;
          /* 🏔️ **바닥을 두 칸으로 역산합니다 — 창(`ONE_WIN`)이 약분돼 사라져요**
           *
           *    A = 「좋은 지점」이 **바닥 안**에 든 칸   → 1 − sA = 바닥 ÷ 창
           *    B = 같은 절반의 **바닥 밖**에 있는 칸    → 1 − sB = dB  ÷ 창
           *    ⇒ 바닥 = dB × (1 − sA) ÷ (1 − sB)      ← 창이 약분됩니다
           *
           * 🔑 그래서 **`ONE_WIN`이 움직여도 이 문장은 안 흔들립니다** — 종속값을 관계로
           *    잡은 자리예요. 잡히는 건 **바닥 자체가 바뀌는 것**뿐입니다.
           * 🔒 A·B는 **같은 절반**이라야 해요 — 🦶 배수가 다르면 창이 달라서 약분이 안 됩니다. */
          const cellW = 100 / cs.length;
          const fw = cellW * FLOOR_R;
          const A = cs.filter((c) => Math.abs(c.x - g.best) < fw - 1.0 && c.op > 0 && c.op < 1)
            .sort((a, b) => Math.abs(a.x - g.best) - Math.abs(b.x - g.best))[0];
          if (A) {
            const B = cs.filter((c) => c.strong === A.strong && c !== A
              && Math.abs(c.x - g.best) > fw + 2 && c.op > 0.02 && c.op < 0.98)
              .sort((a, b) => Math.abs(a.x - g.best) - Math.abs(b.x - g.best))[0];
            if (B) floors.push({ seed, ms, w: Math.abs(B.x - g.best) * (1 - A.op) / (1 - B.op), want: fw });
          }
          frames += 1;
        }
        boards.push({ seed, wide, sides: sides.size, grew, minAbs, seen });
        h.close();
      }
    }
    return { boards, floors, sMax, allLit, frames };
  }

  const P8 = (r) => {
    const bad = r.boards.filter((b) => b.seen < 2 || b.sides !== 1 || !(b.minAbs > 0));
    return { bad, ok: r.boards.length > 0 && bad.length === 0 };
  };
  const P9 = (r) => {
    const bad = r.boards.filter((b) => b.grew > 0);
    return { bad, n: r.boards.reduce((n, b) => n + b.grew, 0), ok: r.boards.length > 0 && bad.length === 0 };
  };
  const P11a = (r) => {
    const bad = r.floors.filter((f) => Math.abs(f.w - f.want) > FLOOR_EPS);
    return { bad, n: r.floors.length,
      ok: r.floors.length >= MIN_FLOOR_N && bad.length === 0 };
  };
  const P11b = (r) => ({ sMax: r.sMax, ok: r.frames > 0 && r.sMax <= S_CEIL });
  const P11c = (r) => ({ rate: r.frames ? r.allLit / r.frames : 1,
    ok: r.frames > 0 && r.allLit / r.frames <= ALL_LIT_R });

  const base8 = await sweep(null);
  {
    const g8 = P8(base8), g9 = P9(base8);
    const a = P11a(base8), b = P11b(base8), c = P11c(base8);
    const minAbs = Math.min(...base8.boards.map((x) => x.minAbs));
    check(g8.ok,
      `G-8. 🧤 **계약 ① — 키퍼가 가운데를 안 넘는다** (판 ${base8.boards.length}벌 · 프레임 ${base8.frames} · 어긋난 판 ${g8.bad.length})`
      + `\n     🔎 측정 조건 — 화면의 \`translateX(%)\` 부호가 **판 내내 하나**인가. 가장 가까이 온 거리 ${isFinite(minAbs) ? minAbs.toFixed(2) : "??"}%`
      + `\n     🚨 넘으면 **좌우 빈 곳이 같아지는 프레임**이 생깁니다 — 화면은 대칭인데 한쪽만 정답인 절벽이에요(거울 칸이 0점)`
      + (g8.ok ? "" : `\n     🔴 ${g8.bad.slice(0, 4).map((x) => `seed${x.seed}(wide:${x.wide}) 부호 ${x.sides}가지 · 최소거리 ${x.minAbs.toFixed(2)}`).join(" · ")}`));
    check(g9.ok,
      `G-9. 🧤 **계약 ② — 빈 곳이 늘 줄어든다** (넓어진 프레임 ${g9.n} · 어긋난 판 ${g9.bad.length})`
      + `\n     🔎 측정 조건 — 빈 곳 = 골문 끝 ↔ 🧤 몸의 가까운 끝. \`translateX\`와 \`scaleX\` **둘 다 화면에서** 읽어요`
      + `\n     🚨 넓어지면 «기다릴수록 유리»가 되어 **«빨리 차라»가 통째로 죽습니다**`
      + (g9.ok ? "" : `\n     🔴 ${g9.bad.slice(0, 4).map((x) => `seed${x.seed}(wide:${x.wide}) ${x.grew}프레임`).join(" · ")}`));
    check(a.ok,
      `G-11. 🏔️ **\`CELL_FLOOR\`가 아직 바닥을 깐다 — 두 칸으로 역산** (표본 ${a.n} · 어긋남 ${a.bad.length})`
      + `\n     🔎 측정 조건 — 바닥 = dB × (1−sA) ÷ (1−sB). **창이 약분돼 사라집니다** —`
      + ` \`ONE_WIN\`이 움직여도 안 흔들려요(종속값을 관계로 잡은 자리)`
      + `\n     🔒 기대값은 **칸 폭 × ${FLOOR_R}** (비는 검사에 박았습니다) · 허용 ±${FLOOR_EPS} (실측 흔들림 ±0.023의 4배)`
      + `\n     📮 balancer(119번 §1-6)가 **\`CELL_FLOOR\` 0.36 + \`ONE_WIN\` 23을 「한 벌」**로 재 뒀습니다`
      + ` — 🚨 **따로 넣을 수 없어요.** 확정되면 여기 \`FLOOR_R\`과 \`moment-test.js\`의 **D-1**을 **같이** 고치세요`
      + (a.n ? `\n     실측 ${Math.min(...a_w(base8)).toFixed(3)} ~ ${Math.max(...a_w(base8)).toFixed(3)} (기대 ${(100 / 6 * FLOOR_R).toFixed(3)})` : "")
      + (a.ok ? "" : (a.n < MIN_FLOOR_N ? `\n     🔴 표본이 ${a.n}개뿐이라 문장이 안 섭니다(바닥 ${MIN_FLOOR_N})` : "")
        + (a.bad.length ? `\n     🔴 ${a.bad.slice(0, 4).map((f) => `seed${f.seed}@${f.ms}ms 바닥 ${f.w.toFixed(3)} (기대 ${f.want.toFixed(3)})`).join(" · ")}` : "")));
    check(b.ok,
      `G-11b. 🎚️ **\`s\`의 천장이 만점에 안 닿는다** — 실측 ${b.sMax.toFixed(4)} ≤ ${S_CEIL}`
      + `\n     🔎 측정 조건 — 🫀 컨디션 100 · ♿ 확대 켬 · 🦶 주발 쪽. **천장이 가장 높이 서는 칸**이에요`
      + `\n     🔑 **견주는 것은 만점(1.0)**입니다. 여기가 1에 닿으면 능숙이 만점을 굽고 조작 축이 포화해요`
      + (b.ok ? "" : `\n     🔴 천장이 ${b.sMax.toFixed(4)}까지 올라왔습니다 — \`CELL_FLOOR\`가 죽었거나 \`ONE_WIN\`이 크게 움직였어요`));
    check(c.ok,
      `G-11c. 🔦 **6칸이 전부 밝은 프레임이 거의 없다** — ${(c.rate * 100).toFixed(2)}% ≤ ${(ALL_LIT_R * 100).toFixed(0)}%`
      + `\n     🔎 측정 조건 — 같은 쓸기(${base8.frames}프레임). 어두운 칸이 남아야 **격자가 «고를 것»을 보여 줍니다**`
      + `\n     🔑 G-11b와 **겹쳐 보는 자리**예요 — 판정 창이 커지면 둘 다 움직입니다(하나가 죽어도 다른 하나가 잡아요)`
      + (c.ok ? "" : `\n     🔴 ${base8.allLit}프레임에서 6칸이 전부 밝습니다 — 격자가 아무것도 안 가릅니다`));
  }

  /* 🔒 **구조 쪽(소스 상수 사이의 부등호)은 여기가 아니라 `moment-test.js`가 봅니다** —
   *    `D-2b`가 `slide 최대 < cov1 − cov0` · `off 최소 > 0`을 그대로 지키고 있어요.
   *    🔑 **한 계약에 주인은 하나**입니다. 같은 부등호를 두 파일에 두면
   *       계수가 움직이는 날 **고칠 자리가 넷**이 되고, 그 중 하나가 남으면
   *       *"저건 원래 빨간불이야"*가 됩니다. 여기는 **화면에서 재는 쪽**(G-8·G-9)만 맡아요.

  /* ══════════════════════════════════════════════════════════════════════
   * 🧱 G-10. **수비는 판이 없다** — 화면을 한 조각도 안 그린다
   * ══════════════════════════════════════════════════════════════════════
   * 🌍 **이 문장이 서 있는 세계**: designer 117번 §6의 **c안**입니다 —
   *    `cardP(autoP, a, 0.5) = autoP`가 **모든 능력치에 대해 정의상** 성립해서,
   *    육성은 그대로 살고 **조작만 빠지는** 세계예요.
   * 🚨 가드가 빠지면 **수비 상황에 상대 골문이 뜹니다** — 화면이 만드는 기대(넣는다)와
   *    상황의 핵심(막는다)이 정면으로 싸워요.
   * 🔴 입구는 넷입니다(`career.js` · `game.js` · `town.js` · 여기 `play()`).
   *    여기는 **마지막 안전망**이라, 앞의 셋이 다 빠져도 골문이 안 뜨는지를 봅니다.
   * ⚠️ 범민 님이 *"**일단** 공격 상황에서"*라고 하셨어요 — 🥅를 **우리 골문으로 돌려**
   *    수비용을 만드는 판정이 나오면 **이 문장이 통째로 옛 계약**이 됩니다(117번 §6-4).
   *    🚨 그때도 🧱 차단의 **형태**(칩 둘 읽기 · 세기로 정답이 뒤집힘 · 2단 국면 · 띠)는
   *       되살리지 마세요 — 폐기된 건 이름이 아니라 형태입니다. */
  async function defendProbe(muts) {
    const rows = [];
    for (const seed of SEEDS.slice(0, 6)) {
      const h = await open({ seed, kind: "defend", muts });
      await h.at(400);
      rows.push({ seed,
        html: (h.host.innerHTML || "").length,
        goal: h.host.querySelectorAll(".w2m-goal").length,
        cell: h.host.querySelectorAll(".w2m-cell").length,
        go: h.host.querySelectorAll(".w2m-go").length,
        calls: h.calls(), s: h.info() ? h.info().s : null });
      h.close();
    }
    return rows;
  }
  const P10 = (rows) => {
    const bad = rows.filter((r) => !(r.html === 0 && r.goal === 0 && r.cell === 0
      && r.go === 0 && r.calls === 1 && r.s === 0.5));
    return { bad, ok: rows.length > 0 && bad.length === 0 };
  };
  {
    const rows = await defendProbe(null);
    const g10 = P10(rows);
    check(g10.ok,
      `G-10. 🧱 **수비는 판이 없다** — 화면 0조각 · 준비 화면도 없음 · \`s = 0.5\`가 **한 번** 온다 (판 ${rows.length}벌)`
      + `\n     🔎 측정 조건 — \`play(host, { kind: "defend" }, cb)\`를 부르고 400ms 뒤 \`innerHTML\` 길이를 봅니다`
      + `\n     🔑 «안 그렸는가»가 아니라 «**한 조각도** 안 그렸는가»예요 — 손잡이처럼 보이는 게 떠 있으면 그게 노이즈입니다`
      + (g10.ok ? "" : `\n     🔴 ${g10.bad.slice(0, 3).map((r) => `seed${r.seed} html ${r.html}자 · 골문 ${r.goal} · 칸 ${r.cell} · cb ${r.calls}회 · s=${r.s}`).join(" · ")}`
        + `\n     🚨 **수비 상황에 상대 골문이 떴습니다**`));
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
   *    특히 `w2m-cell-soon` · `w2m-cell-in`은 소스 주석이
   *    *"「곧 어두워짐」을 클래스로도 — 색으로만 알리면 색약에서 안 읽혀요"* ·
   *    *"초보자에게 필요한 건 정답이 아니라 「이 칸은 0점」"* 이라고 적어 둔 ♿ 자리예요.
   *
   * 🔄 **2026-09-02 갱신 — 이름이 갈렸는데 CSS가 안 따라왔습니다.** 📈 `rise` → `in` 개편(122번)
   *    뒤에 재 보니 **양쪽에 고아가 하나씩** 남았어요:
   *      · JS가 켜는 `w2m-cell-in` → `style.css`에 **규칙 없음**  (G-6)  → 화면에 `·` 표시가 **안 뜹니다**
   *      · `style.css`의 `.w2m-cell-rise` → JS가 **안 켬**        (G-6b) → 죽은 규칙(▲·`w2mRise`)
   *    🔑 **한 결함의 두 얼굴**이라 director가 이름을 갈아 주면 **둘이 같이 0**이 됩니다.
   *
   * 🚧 **지금 크기를 상한으로 박고, 늘면 빨간불**로 둡니다. 여기서 소리내어 빨간불을 내면
   *    "저건 원래 빨간불이야"가 되어 이 파일 전체가 신호를 잃어요.
   *    🔴 **상한은 실측치까지 조입니다** — 4로 남겨 두면 새 고아가 셋 더 들어와도 조용해요.
   * 📌 **CSS가 붙어 0이 되면 ❌ 종료 1로 「승격하세요」가 뜹니다** — 그때 상한을 지우고
   *    이 문장을 평범한 검사로 올리세요(`tests/soccer/curve-test.js`와 같은 방식이에요). */
  {
    const CAP = 1;                                    // 🚧 2026-09-02 실측치 (4 → 1로 조였습니다)
    const CAP_B = 1;                                  // 🚧 반대 방향 실측치
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
      console.log(`     🔴 \`w2m-cell-in\`은 «이 칸은 0점이 아니에요»를 말하는 **테두리**예요 —`);
      console.log(`        규칙이 없으면 화면에 아무것도 안 뜹니다(판정은 멀쩡한데 **표시만** 조용히 없어요).`);
    }
    /* 🔁 **반대 방향 — CSS가 꾸미는데 JS가 안 켜는 것.**
     * 🔑 이 방향이 없으면 «이름이 갈렸다»를 **한쪽에서만** 봅니다. 📈 `rise` → `in` 개편에서
     *    실제로 그랬어요 — G-6은 `in`이 고아라고 말했지만, `.w2m-cell-rise` 규칙이
     *    ▲와 `w2mRise` 애니메이션까지 통째로 남아 있는 건 **아무도 안 봤습니다.**
     * 🔒 `.w2m-cell` 같은 뼈대 클래스는 JS가 인라인으로 심으니 여기서 뺍니다 —
     *    보는 것은 **상태 클래스**(`-hot`·`-in`·`-soon`·`-rise` 꼴)뿐이에요.
     * 📮 **⬇️ `soon`을 지우는 판정이 나와 있습니다**(2026-09-02 · designer 125번 §2).
     *    🔴 **JS에서만 빼면 여기가 1 → 2가 되어 빨간불**입니다 — `style.css`의
     *    `.w2m-cell-soon::after` · `@keyframes w2mSoon` · reduced-motion 줄도 **같이** 지우세요.
     *    🔑 그게 이 문장이 있는 이유예요: 한쪽만 지우는 것을 **여기서** 잡습니다. */
    const cssState = Array.from(new Set(
      (css.match(/\.w2m-cell-[a-z]+/g) || []).map((m) => m.slice(1))))
      .filter((n) => n !== "w2m-cell-lit" && n !== "w2m-cell-next");
    const dead = cssState.filter((n) => names.indexOf(n) < 0);
    if (dead.length > CAP_B) {
      check(false, `G-6b. 🔴 JS가 안 켜는데 \`style.css\`가 꾸미는 상태 클래스가 **늘었습니다** — ${dead.length}개 > 상한 ${CAP_B}`
        + `\n     ${dead.join(", ")}`);
    } else if (dead.length === 0) {
      check(false, `G-6b. 🎉 죽은 규칙이 없어요 — **이 🚧 문장을 평범한 검사로 승격하세요**`
        + `\n     (상한을 지우고 \`dead.length === 0\`을 그냥 단언하면 됩니다)`);
    } else {
      console.log(`🚧 G-6b. \`style.css\`가 꾸미는데 JS가 안 켜는 상태 클래스 ${dead.length}개 (상한 ${CAP_B} — 늘면 빨간불)`);
      console.log(`     ${dead.join(", ")}`);
      console.log(`     🔑 G-6과 **한 결함의 두 얼굴**입니다 — 이름을 갈아 주면 둘이 같이 0이 돼요.`);
    }
  }

  /* 🎚️ **난이도 계수 지문도 여기가 아닙니다** — `moment-test.js` `D-1`이 판정 창·속도 상수
   *    **11개**를, `D-2`가 🧤 무대 상수를 박아 두고 «어느 축이 움직였는지»까지 말합니다.
   *    🔴 **여기에 같은 표를 또 두지 마세요.** balancer가 `CELL_FLOOR` 0.36 + `ONE_WIN` 23을
   *       「한 벌」로 넣는 날(119번 §1-6), 고칠 자리는 **둘이면 충분**해요 —
   *       `moment-test` D-1(상수가 움직였다) · 여기 `FLOOR_R`(바닥 관계의 기대값).

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
      /* 🚨 여기부터 다섯이 **116번 §6에서 「아무도 안 잡던」 흠**입니다.
       * 🔑 한 쓸기로 넷을 재니, 변이 하나가 **어느 문장을 물어야 하는지**를 이름에 적었어요 —
       *    엉뚱한 문장이 물면 그건 잡은 게 아니라 **다른 것이 깨진** 겁니다. */
      ["E_KEEPER_CROSS", "G-8", async (m) => !P8(await sweep(m)).ok],
      ["K_SLIDE_FAST", "G-9", async (m) => !P9(await sweep(m)).ok],
      ["E_FLOOR0", "G-11", async (m) => !P11a(await sweep(m)).ok],
      ["E_WIN2", "G-11b", async (m) => !P11b(await sweep(m)).ok],
      ["E_WIN2", "G-11c", async (m) => !P11c(await sweep(m)).ok],
      ["E_NO_DEFEND_GUARD", "G-10", async (m) => !P10(await defendProbe(m)).ok],
      /* 🔑 **밝기 변이(M1)는 🏔️ 역산도 물어야** 합니다 — 화면이 어두워지면 역산한 바닥이
       *    5.0에서 9~13으로 벌어져요. G-2가 죽어도 여기가 잡습니다(겹쳐 보기). */
      ["M1_DIM", "G-11", async (m) => !P11a(await sweep(m)).ok],
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
