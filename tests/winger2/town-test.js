/* 🏫 ⚽ 더 윙어 II — 학교 아크가 **닿는 곳과 안 닿는 곳** · 화면 배선 (T-2 · T-3 · T-4s · T-5 · T-6 · T-7)
 *
 * 🔴 **2026-09-01에 계약이 바뀌어 두 줄이 옛말이 됐습니다** (96번 §5-2):
 *      · T-5가 *"🏘️ 동네 3장"*을 재고 있었는데 아크가 **8장**이 됐어요
 *      · M-F(재도전 뒷문) 변이가 **아무것도 안 잡는 변이**가 됐습니다 (아래 T-6a 주석)
 *    designer 93번 §10 「버려지는 것」이 *"`CARDS` 3장 배열이 죽습니다"*라고 미리 적었던 자리예요.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-09-01 · designer 93번 §2-2·§5·§9 · engineer 96번)
 *
 *   · 흐름은 **타이틀 → ✏️ 이름 → 🦶 주발 → 🗺️ 동네 → 🏫 초등부(2) → 🎯 자리
 *     → 🏫 중등부(3) → 🏫 고등부(3) → 🏟️ 제안 → 🧬 조립대**
 *   · ⏱️ **첫 순간 카드 「앞」의 결정이 3을 안 넘습니다** (✏️ 이름 · 🦶 주발 · 🗺️ 동네).
 *     🔑 옛 기준(*"생성 화면의 결정 탭이 4를 안 넘는다"*)이 **아니에요** — 🎯 자리는
 *     카드와 카드 **사이**라 첫 카드를 1초도 안 밉니다
 *   · 📣 제안이 닿는 축은 **`spot` 하나뿐**입니다. `growth`·`debut`은 **비트 단위 불변**
 *   · 🏟️ **5곳이 전부 옵니다.** 바뀌는 건 카드에 붙는 제안 등급 한 줄뿐이에요
 *   · ♻️ **한 번 구른 단계는 다시 안 굴러요.** 뒤로 갔다 와도 점수·카드 수가 그대로
 *   · 📨 **초등·중등이 끝날 때마다 조기 제안이 한 번씩** `screen-agency`에 섭니다 (98번).
 *     🔑 **한 화면이 두 몫**을 해요 — 그래서 「켜는 줄마다 끄는 줄」이 필요하고,
 *     그 「끄는 줄」의 감도를 **T-6d**가 지킵니다. 조기 화면 자체의 계약은 `offer-test.js`가 봐요
 *   · 🎯 **뛴 뒤에는 「뛸 때 쓴 값」을 못 바꿉니다** (2026-09-01 · designer 판정 · 96번 ⓑ).
 *     🏫 중등부를 뛰면 「← 자리 다시 고르기」가 **감춰집니다** — 자리는 「출력」이 아니라
 *     `MINI[kind][pos]`·`blendOf`가 **이미 그 값으로 굴린 입력**이거든요.
 *     🔑 **굴림을 막는 것만으로는 부족합니다** — 그게 T-6a와 T-6b가 따로 있는 이유예요
 *   · 📀 옛 세이브는 **점수 3 · 카드 3 → 편차 0 → ×1.00**으로 삽니다 (마이그레이션 없음).
 *     🔑 **두 칸이 짝으로** 기본값을 가져야 해요 — 한쪽만 주면 `d = 3 − 8 = −5`로
 *     진행 중인 커리어가 **조용히 전부 ×0.90**이 됩니다 (설계 93번 §9)
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들 — 값을 고치기 전에 이 파일을 먼저 여세요**
 *   · 「뒤로 가면 학교도 다시 굴린다」는 판정이 나오면 **T-6·T-6a가 옛 계약**입니다
 *   · 「학교를 growth에도 태우자」는 판정이 나오면 **T-2가 통째로 뒤집힙니다**
 *   · 🔴 **카드 수(2/3/3)는 designer가 아직 만질 수 있습니다** — 그래서 이 파일은
 *     8이라는 값을 T-5 한 줄에서만 쓰고, 단계 구조 자체는 `school-test.js`가 봅니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(결정 3 · 8장 · 5곳 · 3점/3장/편차 0 · 36턴)은 여기 박습니다.**
 *      `MARKETS.length`나 `scoreOf`의 기본값을 소스에서 읽어 오면 **바꿔도 검사가 따라갑니다**
 *   ③ **게임 입구를 통해** — 타이틀부터 실제 버튼을 눌러 갑니다
 *      (pointerdown → pointerup → click, 실기기 순서 그대로 · 🦶 주발의 320ms도 실제로 기다려요)
 *   ④ **시드 하나로 안 잽니다** — T-2는 시드 둘의 36턴 궤적을 각각 봅니다
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인하고, **변이 전에 기준선이 초록불인지** 찍습니다
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가로 넘겼습니다:
 *     단계마다 무대가 커져 보이는지 · `.town-place`/`.town-dev`의 CSS · 8장이 실기기에서
 *     지루하지 않은지 · 320ms가 적당한지.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, pageMutsOK, townAuto, passArc, passStage, tapFoot, pickOrigin, PAGE_DIR }
  = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const DECISIONS_BEFORE_CARD = 3;   // ⏱️ ✏️ 이름 · 🦶 주발 · 🗺️ 동네 (설계 93번 §2-2)
const PRE_CARD_SCREENS = ["screen-name", "screen-foot", "screen-origin"];
const ARC_CARDS = 8;               // 🏫 초등 2 + 중등 3 + 고등 3
const OFFER_COUNT = 5;             // 🏟️ 유스 5곳이 **전부** 옵니다 (줄이면 축이 뒤집혀요)
const OLD_SAVE_SCORE = 3;          // 📀 옛 세이브의 중립 점수
const OLD_SAVE_CARDS = 3;          // 📀 옛 세이브의 중립 카드 수 — 🔑 **짝입니다**
const OLD_SAVE_DEV = 0;            // 📏 그래서 편차가 정확히 0
const OLD_SAVE_MUL = 1;            // 📣 옛 세이브의 중립 배수
const MUL_LO = 0.90, MUL_HI = 1.10;   // 📣 배수 양 끝 — T-2의 흔드는 폭
const TURNS = 36;                  // 🌱 36턴 = 성장 곡선 전체 길이
/* 🎲 **📣 명성 사건을 강제로 엽니다** — 운을 재지 않으려고요. (자세한 근거는 예전 그대로) */
const FORCE_EVENT_C = 0.20;
const SEEDS = [9, 27];             // 🎲 시드 하나로 안 잽니다
const STAT_KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **M-A — 학교가 아무 데도 안 닿습니다.** 화면은 `📣 주목 ×1.10 → ×1.21`이라고
   *    계속 약속하는데 실제 명성은 안 움직여요. **오류도 경고도 하나 안 납니다.** */
  M_A_DEAD: { "game.js": [[/const spotOf = \(m\) => \(\(m && m\.spot\) \|\| 1\) \* \(\(S && S\.spotMul\) \|\| 1\);/,
    "const spotOf = (m) => ((m && m.spot) || 1);"]] },
  /* 🔴 **M-B — 옛 세이브 점수 기본값을 3 → 0으로.** 진행 중인 커리어가 전부
   *    *"학교에서 못한 선수"* 가 됩니다. 새 게임에서는 아무 증상이 없어요. */
  M_B_ZERO: { "town.js": [[/st\.townScore != null \? st\.townScore : 3/, "st.townScore != null ? st.townScore : 0"]] },
  /* 🔴🔑 **M-B8 — 옛 세이브 「카드 수」 기본값을 3 → 8로.** 설계 93번 §9가 콕 집어 경고한
   *    사고예요 — `d = 3 − 8 = −5`가 되어 **진행 중인 커리어가 조용히 전부 ×0.90**이 됩니다.
   *    🔴 **`scoreOf`만 보는 검사로는 절대 안 잡힙니다**(engineer의 M-3이 그래서 통과했어요).
   *    `cardsOf`와 `deviationOf` 두 자리에 같은 기본값이 있어 `/g`로 함께 갑니다. */
  M_B8_CARDS: { "town.js": [[/st\.schoolN != null \? st\.schoolN : 3/g, "st.schoolN != null ? st.schoolN : 8"]] },
  /* 🔴 **M-N1 — `startCareer`에서 `S.schoolN`을 안 남깁니다.** 점수만 남기면
   *    카드 수가 바뀐 날 옛 카운터 이어받기가 통째로 죽어요 (engineer M-1). */
  M_N1_NOSAVE: { "game.js": [[/ {2}S\.schoolN = window\.WingerTown \? WingerTown\.cards\(\) : 3;\n/, ""]] },
  /* 🔴 **M-D — `growth`(36턴 복리)에 학교를 겁니다.** designer가 절대 금지한 축이에요. */
  M_D_GROWTH: { "game.js": [[/\* m\.growth \* condMod/, "* m.growth * ((S && S.spotMul) || 1) * condMod"]] },
  /* 🔴 **M-E — 제안 목록을 3곳으로.** 못한 사람에게 🇰🇷(데뷔 0.66 · 가장 쉬움)만 주면
   *    데뷔가 오히려 쉬워지고 잘한 사람은 험한 🇮🇹를 받습니다. **축이 뒤집혀요.** */
  M_E_SHORT: { "game.js": [[/for \(const m of MARKETS\) \{/, "for (const m of MARKETS.slice(0, 3)) {"]] },
  /* 🔴🔑 **M-R — 재도전 뒷문. `goSchool`의 「유일한」 가드 한 줄을 뺍니다.**
   *
   *    ✅ **2026-09-01에 이 변이가 「한 줄」로 줄었습니다.** 예전엔 가드가 셋이라
   *    (여기 · `town.js`의 `openStage` · 자리 핸들러의 `played()`) **하나만 빼면 증상이 0장**,
   *    즉 「재도전 뒷문」 검사가 통째로 아무것도 못 지켰어요. 제가 그걸 보고했고
   *    engineer가 나머지 둘을 지웠습니다 (96번 ⓔ · 자평: *"방어를 겹쳤다고 적은 줄이
   *    검사를 무력화하고 있었어요"*).
   *    🔒 **가드를 다시 늘리면 이 변이가 또 죽습니다.** 새 호출자가 생기면 `goSchool`을 지나게 하세요. */
  M_R_GUARD: {
    "game.js": [[/ {2}if \(WingerTown\.playedStage\(id\)\) \{ after\(\); return; \}\n/, ""]],
  },
  /* 🔴🔑 **M-BACK — 뛴 뒤에도 「← 자리 다시 고르기」가 보입니다.**
   *    🎯 자리는 **「출력」이 아니라 「굴림에 들어간 입력」**이에요 — `MINI[kind][pos]`와
   *    `blendOf`가 그 값으로 **이미 굴렀습니다.** 굴림만 막고 입력을 열어 두면
   *    *"차단이 쉬우니 df로 뛰고 커리어는 fw로"*가 **탭 두 번**입니다. **재도전보다 나빠요.**
   *    ⚠️ designer 지시 — 이 변이(자리가 **뒤**로 새는 것)를 M-H(자리가 **앞**으로 새는 것)와
   *       **한 검사에 묶지 않습니다.** 한 벌이지만 별개예요. */
  M_BACK_SHOW: { "game.js": [[/ {2}if \(back\) back\.classList\.toggle\("hidden", !!\(window\.WingerTown && WingerTown\.playedStage\("m"\)\)\);\n/, ""]] },
  /* 🚨🔑 **M-RESET — 「끄는 줄」을 지웁니다.** 이 변이는 **혼자서는 증상이 0장**이에요.
   *
   *    `showOffers`가 `btn-back-first`를 세 줄로 정합니다:
   *      ① `remove("hidden")`  ← 먼저 되돌리기 (이 변이가 지우는 줄)
   *      ② `toggle("hidden", playedStage("m"))`  ← 🏟️ 최종의 계약 (M-BACK이 지우는 줄)
   *      ③ `if (early) add("hidden")`            ← 📨 조기의 계약 (M-EARLYBACK이 지우는 줄)
   *    ②가 이미 `toggle(x, false)`로 되돌려 주니 **①은 무변이 코드에서 하는 일이 없습니다.**
   *    🔑 ①이 하는 일은 **②의 감도를 떠받치는 것**이에요 — ①이 없으면 ③이 감춰 둔 상태가
   *    최종까지 남아서, **②를 통째로 지워도 화면이 이미 감춰져 있어 증상이 0장**입니다.
   *    (engineer의 첫 구현이 실제로 그 상태였고, M-BACK이 초록불로 통과했습니다 · 98번 §5)
   *
   * 🔴 **그래서 이 변이는 「계약을 깨는 변이」가 아니라 「검사를 가리는 변이」입니다.**
   *    단독 판정이 안 돼요 — 아래 T-6d가 **M-BACK과 한 벌로** 넣어서 잽니다. */
  M_RESET: { "game.js": [[/ {2}if \(back\) back\.classList\.remove\("hidden"\);\n/, ""]] },
  /* 🔴 **M-BENCH — 🧬 조립대의 「취소」가 `show("screen-agency")`를 직접 부릅니다.**
   *    그러면 「← 자리 다시 고르기」를 감추는 판단(`showOffers`)을 **건너뜁니다** —
   *    되돌리기 뒷문이 조립대 쪽에 생겨요. engineer가 막은 자리입니다 (96번 ⓑ). */
  M_BENCH_BACK: { "game.js": [[/ {4}showOffers\);\n\}/, '    () => show("screen-agency"));\n}']] },
  /* 🔴 **M-G — 🏫 학교에 건너뛰기 버튼을 답니다.** *"길어지면 카드 수를 줄이지
   *    화면(버튼)을 붙이지 마세요."* */
  M_G_SKIP: { "index.html": [[/<button class="btn btn-primary hidden" id="btn-town-next"><\/button>/,
    '<button class="btn btn-ghost" id="btn-town-skip">건너뛰기</button>\n      <button class="btn btn-primary hidden" id="btn-town-next"></button>']] },
  /* 🔴 **M-H — 🎯 자리를 첫 카드 「앞」으로 되돌립니다.** 옛 순서로 가는 변이예요.
   *    결정이 4가 되고, 그 순간 *"첫 순간 카드 앞의 결정이 3을 안 넘는다"*가 깨집니다. */
  M_H_POSFIRST: { "game.js": [[/WingerIntro\.openOrigin\(chosenOrigin, \(id\) => \{ chosenOrigin = id; goElementary\(\); \}\);/,
    "WingerIntro.openOrigin(chosenOrigin, (id) => { chosenOrigin = id; goPosition(); });"]] },
};

{
  const bad = pageMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 beta/winger2/에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}
const mutOK = (name) => pageMutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 학교에 닿습니다
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boot(o) {
  const opt = o || {};
  const W = bootPage({ keys: opt.keys, muts: opt.muts });
  /* 🎲 시드를 둘 다 박습니다 — 엔진은 로드 시점에 `Math.random`을 잡아 두므로
   *    (`let _rng = Math.random;`) 페이지의 Math만 갈면 **판정에는 안 걸려요.** */
  if (opt.seed != null) {
    W.Math.random = mulberry32(opt.seed);
    if (W.WingerEngine && W.WingerEngine._t) W.WingerEngine._t.seed(opt.seed);
  }
  const D = W.document;
  let taps = 0;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    taps += 1;
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  return { W, D, press,
    taps: () => taps,
    S: () => W.__get("S"),
    active: () => (D.querySelector(".screen.active") || {}).id,
    close: () => W.close() };
}

const offerCards = (h) => Array.from(h.D.querySelectorAll("#agency-list button"));
const tiersOf = (h) => offerCards(h).map((c) => (c.className.match(/offer-t(\d)/) || [])[1] || "?").join("");

/* 🤖 자동 진행(중립 s = 0.5)으로 아크 여덟 판을 지나 🏟️ 제안 화면까지. */
async function toOffers(h, pos) {
  return passArc(h.W, h.press, { pos: pos || "wg", origin: "seoul" });
}

/* 🔴 **여기부터는 `async`입니다** — 🦶 주발이 320ms 뒤에 넘어가서 실제로 기다려야 하거든요.
 * CommonJS라 최상위 `await`을 못 써요(쓰면 node가 파일을 ESM으로 읽어 `require`가 죽습니다). */
async function main() {

/* ══════════════════════════════════════════════════════════════
 * T-7. ⏱️ **첫 순간 카드 앞의 결정이 3을 안 넘는다** · 🏫 화면에 버튼이 하나뿐
 * ══════════════════════════════════════════════════════════════ */
console.log("── ⏱️ T-7. 첫 카드 앞의 결정과 버튼 ──");
/* 🚪 첫 순간 카드가 열릴 때까지 **실제 버튼으로** 갑니다.
 *    ⚠️ 🤖 자동 진행을 **안 켭니다** — 진짜 순간 카드가 떠야 T-7이 잴 게 있어요.
 *    🔑 화면을 지나가며 전부 기록합니다. 🎯 자리가 카드 앞으로 오면 여기 찍혀요. */
async function runT7(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  const seen = [];
  const mark = () => { const id = h.active(); if (seen[seen.length - 1] !== id) seen.push(id); };
  mark();
  h.press(h.D.getElementById("btn-new"), "btn-new");
  mark();
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  mark();
  await tapFoot(h.W, h.press, "R");
  mark();
  pickOrigin(h.W, h.press, "seoul");
  mark();
  /* 🔴 여기서 🏫이 아니라 🎯 자리가 서 있으면 **그게 결정 하나가 더 낀 것**입니다.
   *    검사가 멈추지 않고 지나가서, 카드 앞에 뭐가 몇 개 왔는지 그대로 셉니다. */
  for (let g = 0; g < 3 && h.active() !== "screen-town"; g++) {
    const card = h.D.querySelector('#position-list .card[data-pos="wg"]');
    if (h.active() === "screen-position" && card) { h.press(card, "🎯 wg"); mark(); continue; }
    break;
  }
  const cardBox = h.D.getElementById("town-card");
  const own = Array.from(h.D.querySelectorAll("#screen-town button, #screen-town input, #screen-town select"))
    .filter((el) => !cardBox || !cardBox.contains(el));
  const pre = seen.slice(0, seen.indexOf("screen-town") < 0 ? seen.length : seen.indexOf("screen-town"))
    .filter((id) => id !== "screen-title");
  const r = {
    seen, pre, taps: h.taps(), screen: h.active(),
    stage: (h.D.getElementById("screen-town") || { dataset: {} }).dataset.stage,
    hasMoment: !!(cardBox && cardBox.querySelector('[class*="w2m-"]')),
    own: own.map((el) => el.id || el.className),
  };
  h.close();
  return r;
}
{
  const r = await runT7(null);
  const sameList = r.pre.length === PRE_CARD_SCREENS.length
    && r.pre.every((id, i) => id === PRE_CARD_SCREENS[i]);
  check(r.pre.length === DECISIONS_BEFORE_CARD && sameList
    && r.screen === "screen-town" && r.stage === "e" && r.hasMoment,
    `T-7. ⏱️ **첫 순간 카드 「앞」의 결정이 ${DECISIONS_BEFORE_CARD}개다** — ✏️ 이름 · 🦶 주발 · 🗺️ 동네`
    + `\n     지나온 화면: ${r.seen.join(" → ")}`
    + `\n     카드 앞의 결정 ${r.pre.length}개 (${r.pre.join(" · ")}) · 탭 ${r.taps}회`
    + `\n     도착 화면 ${r.screen}[data-stage="${r.stage}"] · 순간 카드 ${r.hasMoment ? "떴어요" : "🔴 안 떴어요"}`
    + (sameList ? `\n     🔑 🎯 자리가 목록에 **없습니다** — 카드와 카드 사이라 첫 카드를 안 밀어요`
      : `\n     🔴 목록이 계약과 달라요 (계약: ${PRE_CARD_SCREENS.join(" · ")})`
        + `\n        🎯 자리가 카드 앞으로 오면 결정이 4가 되어 검산이 무너집니다`));
  check(r.own.length === 1 && r.own[0] === "btn-town-next",
    `T-7a. 🔒 🏫 학교 화면의 조작은 **진행 버튼 하나뿐**이다 — 건너뛰기·난이도·재도전이 없다`
    + `\n     화면 직속 조작: ${r.own.length ? r.own.join(" · ") : "(없음)"}`
    + (r.own.length === 1 ? "" : `\n     🔴 결정을 늘리는 버튼이 붙었어요 — v2의 정체(내가 개입하는 순간)를 건너뛰는 버튼입니다`));
}

/* ══════════════════════════════════════════════════════════════
 * T-5. 🏫 **여덟 판을 지나면 🏟️ 제안** · T-6. ♻️ 학교는 한 번만 굴러요
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🏟️ T-5·T-6. 아크 · 제안 목록 · 재도전 뒷문 ──");
async function runOffers(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  const arc = await toOffers(h, "wg");
  const names = new Set(offerCards(h).map((c) => (c.querySelector(".card-title") || {}).textContent));
  const all = h.W.__get("MARKETS").map((m) => m.name);
  const T = h.W.WingerTown;
  const backBtn = () => h.D.getElementById("btn-back-first");
  const r = {
    arc, screen: h.active(), n: offerCards(h).length,
    titles: Array.from(names), missing: all.filter((n) => !names.has(n)),
    score: T.score(), cards: T.cards(), dev: T.deviation(), tiers: tiersOf(h),
    spots: offerCards(h).map((c) => (c.querySelector(".tag.offer-spot") || {}).textContent || ""),
    /* 🎯 **뛴 뒤에는 자리를 못 바꿉니다** — 버튼이 서 있는지부터 봅니다 (T-6b) */
    backExists: !!backBtn(),
    backHidden: backBtn() ? backBtn().classList.contains("hidden") : null,
    playedM: T.playedStage("m"),
  };
  /* 🧬 조립대를 다녀오는 길이 `showOffers`를 지나는가 (T-6c).
   * 🔑 **버튼을 손으로 다시 보이게 해 놓고** 갑니다 — 지금 흐름에서는 먼저 지나간
   *    `showOffers`가 이미 감춰 놔서, 그대로 가면 **변이를 넣어도 증상이 없어요**(실측 확인).
   *
   * 📨 **2026-09-01 갱신 — 예전 주석의 예고는 「절반만」 맞았습니다** (engineer 98번 §2):
   *    ✅ 경로는 생겼어요 — 🏫 초등 뒤 조기 제안이 정확히 *"`playedStage("m")`이 false인데
   *       `screen-agency`"* 입니다.
   *    🔴 **그래도 「버튼이 보이는 상태」는 안 생깁니다** — 조기 화면은 `btn-back-first`를
   *       **일부러 감추거든요**(카드는 이미 굴렀고 🎯 자리는 아직 고르지도 않았어요 ·
   *       `offer-test`의 O-6이 그걸 지킵니다).
   *    🔑 그리고 🧬 조립대는 **최종 화면에서만** 열리는데 그때는 늘 `playedStage("m") === true`라,
   *       **T-6c는 앞으로도 상태를 손으로 만들어 놓고 재야 합니다.** 예고가 아니라 항구적인 조건이에요.
   * 🚨 그리고 그 「겹치는 화면 상태」가 이번에 실제로 **검사 하나를 가렸습니다** — 아래 T-6d를 보세요. */
  if (backBtn()) backBtn().classList.remove("hidden");
  h.press(offerCards(h)[0], "🏟️ 입단 제안");
  r.benchScreen = h.active();
  h.press(h.D.getElementById("btn-back-prospect"), "🧬 조립대 취소");
  r.afterBench = h.active();
  r.backHiddenAfterBench = backBtn() ? backBtn().classList.contains("hidden") : null;
  /* ♻️ 뒷문 ① — 뒤로 → 🎯 자리 다시 고르기 */
  h.press(h.D.getElementById("btn-back-first"), "← 자리 다시 고르기");
  r.backScreen = h.active();
  h.press(h.D.querySelector('#position-list .card[data-pos="df"]'), "🎯 df (다시)");
  r.afterScreen = h.active();
  /* ♻️ 뒷문 ② — 🎯 자리 → 뒤로 → 🗺️ 동네 → 지역 다시 고르고 [다음]
   *    🔑 **이 길이 진짜 뒷문입니다** — `goOrigin`의 done이 `goElementary()`를 다시 부르거든요. */
  h.press(h.D.getElementById("btn-back-first"), "← 자리 다시 고르기");
  h.press(h.D.getElementById("btn-back-position"), "← 동네로");
  r.originScreen = h.active();
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, "busan");
  r.afterOrigin = h.active();
  r.extra = passStage(h.W, h.press);      // 🏫 다시 열렸다면 여기서 카드가 더 굴러요
  back();
  r.score2 = T.score(); r.cards2 = T.cards(); r.tiers2 = tiersOf(h);
  h.close();
  return r;
}
const O = await runOffers(null);
check(O.arc.cards === ARC_CARDS && O.screen === "screen-agency",
  `T-5. 🏫 **여덟 판**(${ARC_CARDS}장)을 지나면 🏟️ 제안 화면에 선다`
  + ` — 지나간 카드 ${O.arc.cards}장 [${O.arc.stages.join("")}] · 화면 ${O.screen}`
  + `\n     🔑 단계 구조(e·e·m·m·m·h·h·h) 자체는 \`school-test.js\` S-6이 지킵니다`);
check(O.n === OFFER_COUNT && O.missing.length === 0,
  `T-5a. 🏟️ **유스 ${OFFER_COUNT}곳이 전부 온다** — 못했든 잘했든 목록은 안 줄어요`
  + ` (학교 ${O.score}점 / ${O.cards}판 · 편차 ${O.dev > 0 ? "+" : ""}${O.dev})`
  + `\n     ${O.titles.join(" · ")}`
  + (O.missing.length ? `\n     🔴 화면에 없는 유스: ${O.missing.join(", ")} — **축이 뒤집힙니다**` : "")
  + (O.n === OFFER_COUNT ? "" : `\n     🔴 카드가 ${O.n}장이에요 (계약은 ${OFFER_COUNT}장)`));
check(O.spots.every((s) => /×[\d.]+ → ×[\d.]+/.test(s)),
  `T-5b. 📣 카드마다 **주목 배수가 숫자로** 적혀 있다 (원칙 ③ — 효과가 있으면 손잡이도)`
  + `\n     ${O.spots.map((s) => s.replace(/📣 주목 /, "")).join(" · ")}`);
check(O.backScreen === "screen-position" && O.afterScreen === "screen-agency",
  `T-6. ♻️ 뒤로 갔다 🎯 자리를 다시 골라도 **학교가 안 열린다**`
  + `\n     뒤로 → ${O.backScreen} · 자리 다시 → ${O.afterScreen}`);
check(O.originScreen === "screen-origin" && O.afterOrigin !== "screen-town"
  && O.extra.length === 0 && O.score === O.score2 && O.cards === O.cards2 && O.tiers === O.tiers2,
  `T-6a. ♻️🔑 **🗺️ 동네까지 되돌아가 지역을 다시 골라도 학교가 안 굴러요** — 여기가 진짜 뒷문입니다`
  + `\n     자리 → 뒤로 → ${O.originScreen} · 지역 다시 → **${O.afterOrigin}** · 그 뒤 더 지나간 카드 ${O.extra.length}장`
  + `\n     점수 ${O.score} → ${O.score2} · 카드 ${O.cards} → ${O.cards2} · 제안 등급 ${O.tiers} → ${O.tiers2}`
  + (O.afterOrigin !== "screen-town" && O.extra.length === 0 ? ""
    : `\n     🔴 🏫이 다시 열렸어요 — **되돌아가기가 곧 재도전 버튼**이 됐습니다`));
check(O.backExists && O.backHidden === true && O.playedM === true,
  `T-6b. 🎯🔑 **뛴 뒤에는 「← 자리 다시 고르기」가 안 보인다** — 자리는 「출력」이 아니라 **굴림에 들어간 입력**이에요`
  + `\n     \`playedStage("m")\` ${O.playedM} · 버튼 존재 ${O.backExists} · hidden ${O.backHidden}`
  + (O.backExists && O.backHidden === true
    ? `\n     🔑 굴림만 막고 입력을 열어 두면 *"df로 뛰고 커리어는 fw로"*가 **탭 두 번**입니다 — 재도전보다 나빠요`
      + `\n     🔒 버튼을 **지우지는** 않았습니다(📨 조기 제안의 「되돌리기」가 그 자리를 씁니다) — 감춘 것만 봅니다`
    : `\n     🔴 되돌아가는 길이 열려 있어요`)
  + `\n     ⚠️ 이건 자리가 **뒤로** 새는 자리예요 — **앞으로** 새는 것(T-7 · M-H)과 **별개 검사**입니다 (designer 지시)`);
check(O.afterBench === "screen-agency" && O.backHiddenAfterBench === true,
  `T-6c. 🧬 **🏟️ 제안 화면에 서는 길은 전부 \`showOffers\`를 지난다** — 조립대에서 되돌아와도 감추기 판단을 다시 한다`
  + `\n     제안 → ${O.benchScreen} → 취소 → ${O.afterBench} · 돌아온 뒤 hidden ${O.backHiddenAfterBench}`
  + `\n     🔑 검사가 가기 전에 버튼을 **일부러 보이게** 해 뒀어요 — 안 그러면 이미 감춰져 있어서 아무것도 안 잽니다`
  + (O.backHiddenAfterBench === true ? "" : `\n     🔴 \`show("screen-agency")\`를 직접 불러 판단을 건너뛰었습니다 — 뒷문이 조립대 쪽에 생겼어요`));

/* ══════════════════════════════════════════════════════════════
 * T-3. 📀 **옛 세이브가 정확히 중립이다** — 점수 3 **· 카드 3 · 편차 0** · ×1.00
 *
 * 🔑 **네 줄이 다 필요합니다.** `scoreOf`만 보면 engineer의 M-3(카드 기본값 3 → 8)이
 *    그대로 통과해요 — 그러면 진행 중인 커리어가 **조용히 전부 ×0.90**이 됩니다.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 📀 T-3. 옛 세이브가 정확히 중립 ──");
const FX = (() => {
  const s = fs.readFileSync(path.join(PAGE_DIR, "..", "_fixtures.js"), "utf8");
  const win = {};
  new Function("window", s)(win);          // 🔒 직접 eval 안 씁니다
  return (win.CHECK_FIXTURES || { items: [] }).items.filter((x) => x.game === "winger2");
})();

function runT3(muts) {
  const rows = [];
  for (const it of FX) {
    const h = boot({ keys: it.keys, muts, seed: SEEDS[0] });
    h.press(h.D.getElementById("btn-continue"), "이어하기");
    const go = h.D.querySelector(".slot-modal .slot-go");
    h.press(go, "슬롯 열기");
    const S = h.S();
    const T = h.W.WingerTown;
    const m = S ? h.W.__get("marketOf")() : null;
    rows.push({
      id: it.id, ok: !!S,
      hadTown: S ? S.townScore !== undefined : null,
      hadN: S ? S.schoolN !== undefined : null,
      hadMul: S ? S.spotMul !== undefined : null,
      score: S ? T.scoreOf(S) : null,
      cards: S ? T.cardsOf(S) : null,
      dev: S ? T.deviationOf(S) : null,
      spot: m ? m.spot : null,
      spotOf: m ? h.W.__get("spotOf")(m) : null,
    });
    h.close();
  }
  return rows;
}
{
  const rows = runT3(null);
  check(rows.length > 0 && rows.every((r) => r.ok),
    `T-3. 📀 옛 세이브 ${rows.length}종을 **이어하기 버튼으로** 열었다 (${rows.map((r) => r.id).join(" · ")})`);
  const noField = rows.every((r) => r.hadTown === false && r.hadN === false && r.hadMul === false);
  check(noField,
    `T-3a. 📀 그 세이브들에 \`townScore\`·\`schoolN\`·\`spotMul\` 칸이 **없다** (= 진짜 옛 세이브다)`
    + (noField ? "" : `\n     🔴 픽스처가 이미 새 칸을 갖고 있어요 — T-3b·T-3c가 아무것도 안 지킵니다`));
  check(rows.every((r) => r.score === OLD_SAVE_SCORE),
    `T-3b. 📀 칸이 없는 세이브가 \`scoreOf\` **${OLD_SAVE_SCORE}점**으로 읽힌다`
    + `\n     ${rows.map((r) => `${r.id}:${r.score}점`).join(" · ")}`);
  check(rows.every((r) => r.cards === OLD_SAVE_CARDS && r.dev === OLD_SAVE_DEV),
    `T-3c. 📏🔑 그리고 \`cardsOf\` **${OLD_SAVE_CARDS}장** · \`deviationOf\` **${OLD_SAVE_DEV}** — 두 칸이 **짝**이라 정확히 중립이다`
    + `\n     ${rows.map((r) => `${r.id}: ${r.score}점/${r.cards}장 → 편차 ${r.dev}`).join(" · ")}`
    + `\n     🔴 여기가 \`3 − 8 = −5\`면 진행 중인 커리어가 **조용히 전부 ×0.90**이 됩니다 (설계 93번 §9)`);
  check(rows.every((r) => r.spotOf === r.spot),
    `T-3d. 📣 칸이 없는 세이브의 \`spotOf\`가 **유스의 spot 그대로**다 (배수 ×${OLD_SAVE_MUL})`
    + `\n     ${rows.map((r) => `${r.id}: spot ${r.spot} → spotOf ${r.spotOf}`).join(" · ")}`);
}

/* ══════════════════════════════════════════════════════════════
 * T-4s. 💾 **새 세이브는 점수와 카드 수를 「짝으로」 남긴다**
 *
 * 🔑 값을 베끼지 않고 **관계**로 봅니다 — `S.townScore === 지금 점수` ·
 *    `S.schoolN === 지금 카드 수` · `deviationOf(S) === deviation()`.
 *    카드 수가 2/3/3에서 바뀌어도 이 세 줄은 그대로 살아요.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 💾 T-4s. 새 세이브가 짝으로 남는다 ──");
async function runSave(muts, seed) {
  const h = boot({ seed: seed == null ? SEEDS[0] : seed, muts });
  await toOffers(h, "wg");
  const T = h.W.WingerTown;
  const live = { score: T.score(), cards: T.cards(), dev: T.deviation() };
  h.press(offerCards(h)[0], "🏟️ 입단 제안");
  h.press(h.D.getElementById("btn-prospect-start"), "🧬 이 선수로 시작");
  const S = h.S();
  const r = S
    ? { ok: true, live, townScore: S.townScore, schoolN: S.schoolN, spotMul: S.spotMul,
        devOf: T.deviationOf(S) }
    : { ok: false, live };
  h.close();
  return r;
}
{
  const rows = [];
  for (const s of SEEDS) rows.push(await runSave(null, s));
  const okPair = rows.every((r) => r.ok && r.townScore === r.live.score && r.schoolN === r.live.cards);
  const okDev = rows.every((r) => r.ok && r.devOf === r.live.dev);
  check(okPair,
    `T-4s. 💾 \`S.townScore\`·\`S.schoolN\`이 **지금 점수·카드 수 그대로** 남는다 (시드 ${SEEDS.length}개)`
    + `\n     ${rows.map((r) => `${r.live.score}점/${r.live.cards}장 → 세이브 ${r.townScore}/${r.schoolN}`).join(" · ")}`);
  check(okDev && rows.every((r) => r.live.cards === ARC_CARDS),
    `T-4s-a. 📏🔑 그래서 \`deviationOf(S) === deviation()\`이다 — **값이 아니라 관계로** 봅니다`
    + `\n     ${rows.map((r) => `편차 ${r.live.dev} → 세이브에서 ${r.devOf} (카드 ${r.live.cards}장)`).join(" · ")}`
    + (okDev ? `\n     🔑 카드 수 2/3/3이 바뀌어도 이 줄은 그대로 살아요 — 8을 안 베꼈거든요`
      : `\n     🔴 세이브에서 읽은 편차가 달라요 — 두 칸 중 하나가 안 남았습니다 (옛 카운터 이어받기가 죽었어요)`));
}

/* ══════════════════════════════════════════════════════════════
 * T-2. 🔒 **제안은 `spot`에만 닿는다** — `growth`는 비트 단위 불변
 *
 * ⚠️ **훈련을 실제로 돌립니다.** 🛌 쉬는 턴은 `m.growth`에 안 닿아서, 휴식으로만 재면
 *    통과해도 **아무것도 안 지킵니다**(O-2에서 찾은 함정).
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🔒 T-2. growth 무변 · spot에는 닿는다 ──");
async function career(seed, mul, muts) {
  const h = boot({ seed, muts });
  await toOffers(h, "wg");
  h.press(offerCards(h)[0], "🏟️ 입단 제안");
  h.press(h.D.getElementById("btn-prospect-start"), "🧬 이 선수로 시작");
  const S = h.S();
  if (!S) { h.close(); throw new Error("커리어가 안 만들어졌어요 — 흐름이 바뀌었나요?"); }
  S.spotMul = mul;                      // 🔧 여기 한 칸만 흔듭니다
  const traj = [];
  const fan = [];
  for (let i = 0; i < TURNS; i++) {
    const k = STAT_KEYS[i % STAT_KEYS.length];
    const b = h.D.querySelector(`.screen.active .action-btn[data-key="${k}"]`)
      || h.D.querySelector(`.action-btn[data-key="${k}"]`);
    if (!b) break;
    h.press(b, `🏋️ ${k}`);              // 🏋️ **훈련**입니다 — 휴식이 아니에요
    traj.push(STAT_KEYS.map((x) => S.stats[x]).join(",") + "|" + S.condition);
    fan.push(S.fandom);
  }
  const before = S.fandom;
  const real = h.W.Math.random;
  h.W.Math.random = () => FORCE_EVENT_C;
  h.press(h.D.querySelector('.screen.active .action-btn[data-key="__rest"]')
    || h.D.querySelector('.action-btn[data-key="__rest"]'), "🛌 휴식(명성 사건)");
  h.W.Math.random = real;
  const out = { turns: traj.length, traj: traj.join(";"), fandom: S.fandom, fan,
    gain: S.fandom - before, log0: (S.log || [])[0] || "", spotMul: S.spotMul,
    grew: traj.length > 1 && traj[0] !== traj[traj.length - 1] };
  h.close();
  return out;
}
async function pair(seed, muts) {
  const lo = await career(seed, MUL_LO, muts), hi = await career(seed, MUL_HI, muts);
  return { seed, lo, hi, same: lo.traj === hi.traj, gainDiff: hi.gain - lo.gain,
    fired: lo.gain > 0 && hi.gain > 0, turns: lo.turns, grew: lo.grew && hi.grew };
}
const P = [];
for (const s of SEEDS) P.push(await pair(s, null));
check(P.every((p) => p.turns === TURNS && p.grew),
  `T-2. 🏋️ 두 짝 모두 **${TURNS}턴 훈련**을 굴렸고 능력치가 실제로 움직였다`
  + ` (${P.map((p) => `시드 ${p.seed}:${p.turns}턴 ${p.grew ? "자랐어요" : "🔴 안 자랐어요"}`).join(" · ")})`
  + `\n     🔑 🛌 휴식만 돌리면 \`m.growth\` 줄을 아예 안 지나 **T-2a가 아무것도 안 지킵니다**`);
check(P.every((p) => p.same),
  `T-2a. 🔒 📣 배수를 ×${MUL_LO} ↔ ×${MUL_HI}로 흔들어도 **${TURNS}턴 능력치·컨디션 궤적이 비트 단위로 같다**`
  + `\n     ${P.map((p) => `시드 ${p.seed}: ${p.same ? "같음" : "🔴 다름"}`).join(" · ")}`
  + (P.every((p) => p.same) ? `\n     (= \`growth\`에 한 톨도 안 닿았어요 — 36턴 복리 축은 학교와 무관합니다)`
    : `\n     🔴 **학교가 36턴 복리에 걸렸습니다.** designer가 절대 금지한 축이에요`));
check(P.every((p) => p.fired),
  `T-2b-조건. 📊 강제로 연 **📣 명성 사건**이 두 짝 모두에서 실제로 열렸다`
  + `\n     ${P.map((p) => `시드 ${p.seed}: ×${MUL_LO} +${p.lo.gain} · ×${MUL_HI} +${p.hi.gain}`).join(" · ")}`
  + `\n     ${P[0].lo.log0 || "(로그 없음)"}`
  + (P.every((p) => p.fired) ? "" : `\n     🔴 명성 사건이 안 열렸어요 — \`maybeEvent\`의 사건 목록이 바뀌었나요? FORCE_EVENT_C를 다시 잡으세요`));
check(P.every((p) => p.gainDiff > 0),
  `T-2b. 📣 같은 사건에서 ⭐ 명성이 **다르다** — 배수가 높은 쪽이 더 많다 (= \`spot\`에는 실제로 닿아요)`
  + `\n     ${P.map((p) => `시드 ${p.seed}: ×${MUL_LO} → +${p.lo.gain} · ×${MUL_HI} → +${p.hi.gain} (차이 ${p.gainDiff})`).join("\n     ")}`
  + (P.every((p) => p.gainDiff > 0)
    ? `\n     🔑 **이 술어가 없으면 T-2a는 "아무 데도 안 닿아서 통과"입니다**`
    : `\n     🔴 배수를 흔들었는데 명성이 안 움직여요 — 화면은 \`📣 주목 ×…\`을 약속하는데 **배선이 죽었습니다**`));

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — 고치기 전에 **빨간불이 뜨는지** 반드시 확인합니다
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
if (fail) {
  console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);
}

/* 🧪 M-A — 학교가 아무 데도 안 닿음. T-2b가 갈려야 합니다. */
if (!mutOK("M_A_DEAD")) check(false, `🧪 **변이 M-A — 학교가 아무 데도 안 닿음**${MUT_DEAD}`);
else {
  const p = await pair(SEEDS[0], MUT.M_A_DEAD);
  check(p.gainDiff === 0 && p.same && p.fired,
    `🧪 **변이 M-A — \`spotOf\`가 \`spotMul\`을 안 봄** → T-2b가 빨간불`
    + `\n     ×${MUL_LO} → +${p.lo.gain} · ×${MUL_HI} → +${p.hi.gain} (차이 ${p.gainDiff})`
    + `\n     ${p.same ? "✔ 궤적은 그대로 같아요(T-2a는 초록불) — **T-2b 하나만** 갈립니다" : "🔴 궤적까지 달라졌어요"}`
    + `\n     ${p.fired ? "✔ 명성 사건은 그대로 열렸어요 — 「안 재서 통과」가 아닙니다" : "🔴 사건이 안 열렸어요"}`);
}

/* 🧪 M-D — `growth`에 걸기. T-2a가 갈려야 합니다. */
if (!mutOK("M_D_GROWTH")) check(false, `🧪 **변이 M-D — \`growth\`(36턴 복리)에 학교를 걺**${MUT_DEAD}`);
else {
  const p = await pair(SEEDS[0], MUT.M_D_GROWTH);
  check(!p.same && p.grew,
    `🧪 **변이 M-D — \`growth\`(36턴 복리)에 학교를 걺** → T-2a가 빨간불`
    + `\n     36턴 궤적 ${p.same ? "🔴 아직 같음" : "달라졌어요 ✔"} · 훈련이 실제로 돌았나 ${p.grew ? "✔" : "🔴"}`
    + (p.same ? `\n     🔴 designer가 금지한 축에 걸었는데 초록불이에요 — T-2a가 아무것도 안 지킵니다` : ""));
}

/* 🧪 M-E — 제안 목록을 3곳으로. T-5a가 갈려야 합니다. */
if (!mutOK("M_E_SHORT")) check(false, `🧪 **변이 M-E — 제안 목록을 3곳으로**${MUT_DEAD}`);
else {
  const r = await runOffers(MUT.M_E_SHORT);
  check(r.n !== OFFER_COUNT || r.missing.length > 0,
    `🧪 **변이 M-E — 🏟️ 제안 목록을 3곳으로** → T-5a가 빨간불 (카드 ${r.n}장 · 빠진 유스 ${r.missing.length}곳)`
    + `\n     화면: ${r.titles.join(" · ")}`);
}

/* 🧪🔑 M-R — 재도전 뒷문. T-6a가 갈려야 합니다. */
if (!mutOK("M_R_GUARD")) check(false, `🧪 **변이 M-R — \`goSchool\`의 가드 한 줄 제거**${MUT_DEAD}`);
else {
  const r = await runOffers(MUT.M_R_GUARD);
  check(r.afterOrigin === "screen-town" || r.extra.length > 0 || r.cards2 !== r.cards,
    `🧪🔑 **변이 M-R — ♻️ \`goSchool\`의 가드 한 줄을 빼서 재도전 뒷문을 엶** → T-6a가 빨간불`
    + `\n     지역 다시 → **${r.afterOrigin}** · 더 지나간 카드 ${r.extra.length}장(${r.extra.join("")})`
    + `\n     점수 ${r.score} → ${r.score2} · 카드 ${r.cards} → ${r.cards2}`
    + (r.afterOrigin === "screen-town" || r.extra.length > 0
      ? `\n     ✔ 🏫이 다시 열렸어요 — 이게 곧 재도전 버튼입니다`
      : `\n     🔴 가드를 뺐는데 초록불이에요 — T-6a가 아무것도 안 지킵니다`)
    + `\n     ✅ **한 줄로 잡힙니다.** 가드가 셋이던 때는 하나를 빼도 증상이 0장이었어요 (96번 ⓔ)`);
}

/* 🧪🔑 M-BACK — 뛴 뒤에도 되돌아가기가 보임. T-6b가 갈려야 합니다. */
if (!mutOK("M_BACK_SHOW")) check(false, `🧪 **변이 M-BACK — 되돌아가기를 안 감춤**${MUT_DEAD}`);
else {
  const r = await runOffers(MUT.M_BACK_SHOW);
  check(r.backExists && r.backHidden === false,
    `🧪🔑 **변이 M-BACK — 🎯 뛴 뒤에도 「← 자리 다시 고르기」를 안 감춤** → T-6b가 빨간불`
    + `\n     \`playedStage("m")\` ${r.playedM} · 버튼 hidden **${r.backHidden}**`
    + (r.backHidden === false
      ? `\n     ✔ 굴림에 들어간 입력을 다시 바꿀 수 있게 됐어요 — 탭 두 번짜리 뒷문입니다`
      : `\n     🔴 감추기를 뺐는데 초록불이에요 — T-6b가 아무것도 안 지킵니다`));
}

/* ══════════════════════════════════════════════════════════════════════
 * 🚨🔑 T-6d. **감도 검사 — 📨 조기 화면이 🏟️ 최종의 계약을 「가리지」 않는다**
 * ══════════════════════════════════════════════════════════════════════
 * 🔴 **이 검사가 재는 것은 게임 동작이 아니라 「다른 검사의 감도」입니다.**
 *    그래서 **기준선이 무변이 소스가 아니라 「M-BACK을 넣은 소스」**예요 — 그 점이 특이합니다.
 *
 * 이 저장소가 **같은 형태에 두 번** 걸렸습니다:
 *   · 96번 ⓔ — 재도전 **가드가 셋**이라 하나를 빼도 증상이 0장 (검사가 통째로 죽음)
 *   · 98번 §5 — 📨 조기 화면이 감춰 둔 **화면 상태**가 남아 M-BACK이 초록불로 통과
 *   🔑 **형태가 같아요: 여러 자리가 같은 상태를 쓰는데, 뒤 자리가 앞 자리의 흔적을 못 지우면
 *      앞 자리가 뒤 자리의 검사를 가립니다.** 방어는 「켜는 줄마다 끄는 줄」 + 이 감도 검사.
 *
 * 🔒 **`remove("hidden")` 줄이 사라지면 무엇이 잡나요 — 세 겹입니다:**
 *   ① **0번 검사** — `M_RESET` 정규식이 소스에 안 걸려 ❌ 한 줄이 뜹니다 (가장 먼저)
 *   ② **T-6d** — 아래 ⒜⒝가 뒤집힙니다
 *   ③ 사람 — 이 주석
 * ⚠️ **⒝(가려짐)를 단언하는 건 「결함을 정답으로 단언」하는 게 아닙니다** — *"①이 ②를
 *    떠받치고 있다"*는 **참인 성질**을 못 박는 거예요. 구조를 바꿔 «①이 없어도 ②가 잡히게»
 *    만들면 이 줄이 빨간불이 되고, **그때 사람이 이 파일을 봅니다.** 그게 노리는 마찰이에요.
 * 🔴 그리고 ②③을 **한 줄로 합치지 마세요**(`toggle("hidden", !!early || playedStage("m"))`) —
 *    최종의 계약과 조기의 계약이 **다른 문장**이라, 합치면 한쪽 신호가 사라집니다.
 *    designer도 「앞으로 새는 것 ↔ 뒤로 새는 것」을 별개 검사로 두라고 했어요.
 * ══════════════════════════════════════════════════════════════════════ */
if (!mutOK("M_RESET") || !mutOK("M_BACK_SHOW")) {
  check(false, `🚨 **T-6d 감도 검사 — \`remove("hidden")\` 또는 \`toggle\` 줄이 소스에 없습니다**${MUT_DEAD}`
    + `\n     🔑 「끄는 줄」이 사라졌다면 그것만으로 **M-BACK이 안 잡히게** 됩니다 — 소스를 보세요`);
} else {
  const solo = await runOffers(MUT.M_BACK_SHOW);
  const combo = await runOffers({ "game.js": MUT.M_RESET["game.js"].concat(MUT.M_BACK_SHOW["game.js"]) });
  check(solo.backHidden === false && combo.backHidden === true,
    `T-6d. 🚨🔑 **감도 검사 — 「끄는 줄」이 T-6b를 떠받치고 있다**`
    + `\n     ⒜ M-BACK 단독            → hidden **${solo.backHidden}** ${solo.backHidden === false ? "(T-6b 빨간불 ✔ 감도 있음)" : "🔴 안 잡힘"}`
    + `\n     ⒝ M-RESET + M-BACK 한 벌 → hidden **${combo.backHidden}** ${combo.backHidden === true ? "(🔴 가려짐 — 그래서 ①이 필요합니다)" : "가려지지 않음"}`
    + (solo.backHidden === false && combo.backHidden === true
      ? `\n     🔑 ⒝가 «M-RESET은 단독으로 증상이 0장인데 M-BACK을 죽인다»의 증거예요`
        + `\n     🔒 \`remove("hidden")\` 줄이 사라지면 **0번 검사**가 먼저 ❌를 냅니다`
      : `\n     🔴 감도 구조가 바뀌었습니다 — \`showOffers\`의 세 줄을 열어 보고 이 검사를 다시 쓰세요`));
}

/* 🧪 M-BENCH — 조립대 취소가 `showOffers`를 건너뜀. T-6c가 갈려야 합니다. */
if (!mutOK("M_BENCH_BACK")) check(false, `🧪 **변이 M-BENCH — 조립대 취소가 판단을 건너뜀**${MUT_DEAD}`);
else {
  const r = await runOffers(MUT.M_BENCH_BACK);
  check(r.backHiddenAfterBench === false,
    `🧪 **변이 M-BENCH — 🧬 조립대 취소가 \`show("screen-agency")\`를 직접 부름** → T-6c가 빨간불`
    + `\n     제안 → ${r.benchScreen} → 취소 → ${r.afterBench} · 돌아온 뒤 hidden **${r.backHiddenAfterBench}**`
    + (r.backHiddenAfterBench === false
      ? `\n     ✔ 감추기 판단을 건너뛰었어요 — 되돌리기 뒷문이 조립대 쪽에 생깁니다`
      : `\n     🔴 건너뛰게 했는데 초록불이에요 — T-6c가 아무것도 안 지킵니다`));
}

/* 🧪 M-B — 옛 세이브 점수 기본값 0. T-3b가 갈려야 합니다. */
if (!mutOK("M_B_ZERO")) check(false, `🧪 **변이 M-B — 옛 세이브 점수 기본값 3 → 0**${MUT_DEAD}`);
else {
  const rows = runT3(MUT.M_B_ZERO);
  check(rows.every((r) => r.score !== OLD_SAVE_SCORE),
    `🧪 **변이 M-B — 옛 세이브 \`townScore\` 기본값 3 → 0** → T-3b가 빨간불`
    + `\n     ${rows.map((r) => `${r.id}: ${r.score}점/${r.cards}장 → 편차 ${r.dev}`).join(" · ")}`);
}

/* 🧪🔑 M-B8 — 옛 세이브 카드 기본값 8. T-3c가 갈려야 합니다.
 *    🔴 **T-3b(`scoreOf`)는 그대로 초록불입니다** — 그래서 T-3c가 따로 있어야 해요. */
if (!mutOK("M_B8_CARDS")) check(false, `🧪 **변이 M-B8 — 옛 세이브 카드 기본값 3 → 8**${MUT_DEAD}`);
else {
  const rows = runT3(MUT.M_B8_CARDS);
  const devBad = rows.every((r) => r.dev !== OLD_SAVE_DEV);
  const scoreStill = rows.every((r) => r.score === OLD_SAVE_SCORE);
  check(devBad,
    `🧪🔑 **변이 M-B8 — 옛 세이브 \`schoolN\` 기본값 3 → 8** → T-3c가 빨간불`
    + `\n     ${rows.map((r) => `${r.id}: ${r.score}점/${r.cards}장 → 편차 **${r.dev}**`).join(" · ")}`
    + `\n     ${scoreStill
      ? `🔑 **T-3b(\`scoreOf\`)는 그대로 초록불입니다** — 점수만 보는 검사로는 이 사고를 못 잡아요`
      : `🟡 T-3b도 같이 갈렸어요`}`
    + (devBad ? `\n     ✔ 편차가 ${OLD_SAVE_DEV}이 아니게 됐어요 — 진행 중인 커리어가 조용히 ×0.90으로 내려가는 자리입니다`
      : `\n     🔴 카드 기본값을 바꿨는데 편차가 그대로예요 — T-3c가 아무것도 안 지킵니다`));
}

/* 🧪 M-N1 — `startCareer`에서 `S.schoolN`을 안 남김. T-4s가 갈려야 합니다. */
if (!mutOK("M_N1_NOSAVE")) check(false, `🧪 **변이 M-N1 — \`S.schoolN\`을 안 남김**${MUT_DEAD}`);
else {
  const r = await runSave(MUT.M_N1_NOSAVE, SEEDS[0]);
  check(r.ok && (r.schoolN === undefined || r.devOf !== r.live.dev),
    `🧪 **변이 M-N1 — \`startCareer\`가 \`S.schoolN\`을 안 남김** → T-4s·T-4s-a가 빨간불`
    + `\n     세이브 ${r.townScore}점 / \`schoolN\`=${r.schoolN} · 편차 ${r.live.dev} → 세이브에서 **${r.devOf}**`
    + (r.schoolN === undefined || r.devOf !== r.live.dev
      ? `\n     ✔ 칸이 안 남아 \`cardsOf\`가 기본값 3으로 읽혔어요 — 8판 뛴 사람이 대부분 ×1.10이 됩니다`
      : `\n     🔴 줄을 뺐는데 초록불이에요`));
}

/* 🧪 M-G — 🏫 학교에 건너뛰기 버튼. T-7a가 갈려야 합니다. */
if (!mutOK("M_G_SKIP")) check(false, `🧪 **변이 M-G — 🏫 학교에 건너뛰기 버튼**${MUT_DEAD}`);
else {
  const r = await runT7(MUT.M_G_SKIP);
  check(r.own.length !== 1,
    `🧪 **변이 M-G — 🏫 학교에 \`btn-town-skip\`을 붙임** → T-7a가 빨간불`
    + `\n     화면 직속 조작: ${r.own.join(" · ")}`);
}

/* 🧪 M-H — 🎯 자리를 첫 카드 앞으로. T-7이 갈려야 합니다. */
if (!mutOK("M_H_POSFIRST")) check(false, `🧪 **변이 M-H — 🎯 자리를 첫 카드 앞으로**${MUT_DEAD}`);
else {
  const r = await runT7(MUT.M_H_POSFIRST);
  check(r.pre.length > DECISIONS_BEFORE_CARD || r.pre.includes("screen-position"),
    `🧪 **변이 M-H — 🎯 자리를 첫 순간 카드 「앞」으로 되돌림** → T-7이 빨간불`
    + `\n     지나온 화면: ${r.seen.join(" → ")}`
    + `\n     카드 앞의 결정 **${r.pre.length}개** (${r.pre.join(" · ")})`
    + (r.pre.length > DECISIONS_BEFORE_CARD || r.pre.includes("screen-position")
      ? `\n     ✔ 결정이 ${DECISIONS_BEFORE_CARD}을 넘었어요 — 첫 카드가 그만큼 밀립니다`
      : `\n     🔴 자리를 앞으로 옮겼는데 초록불이에요 — T-7이 아무것도 안 지킵니다`));
}

/* ---------- 마무리 ---------- */
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
console.log("\n✅ 통과");
process.exit(0);
}

/* 💥 `main()`이 던지면 `_load.js`의 `unhandledRejection` 핸들러가 받아 **종료 코드 2**를 냅니다
 * — 초록불도 빨간불도 아닌 「안 돌았음」이 그대로 보여요. */
main();
