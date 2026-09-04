/* 🏫 ⚽ 더 윙어 II — 학교 아크가 **닿는 곳과 안 닿는 곳** · 화면 배선 (T-2 · T-3 · T-4s · T-5 · T-6a · T-7)
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
 *     조기 화면 자체의 계약은 `offer-test.js`가 봐요
 *   · 🎯 **뛴 뒤에는 「뛸 때 쓴 값」을 못 바꿉니다** (designer 판정 · 96번 ⓑ → 93번 §17-2).
 *     ✅ **2026-09-01 — 「← 자리 다시 고르기」 버튼이 삭제됐습니다** (designer §19 판정 ⒝).
 *     §17-2가 그 계약을 정한 순간 **버튼이 보일 수 있는 상태가 구조적으로 0**이 됐거든요.
 *     🗑️ 그래서 **T-6b · T-6c · T-6d와 변이 M-BACK · M-RESET · M-BENCH를 지웠습니다** —
 *     **대상이 사라지면 검사도 같이 사라져야 합니다.** 남기면 그게 「검사가 옛 계약을 지킴」이에요.
 *     🔑 T-6d의 **「감도 검사」 형태는 `.claude/skills/grow-test-writing`에 올려 뒀습니다** —
 *     인스턴스가 사라졌다고 도구까지 잃으면 같은 사고가 세 번째 납니다
 *   · ♻️ **되감는 길이 하나 남았습니다** — 🎯 자리 화면의 `btn-back-position` → 🗺️ 동네.
 *     🏟️ 제안 화면에는 이제 되돌아가는 버튼이 **아예 없습니다**
 *   · 📀 옛 세이브는 **점수 3 · 카드 3 → 편차 0 → ×1.00**으로 삽니다 (마이그레이션 없음).
 *     🔑 **두 칸이 짝으로** 기본값을 가져야 해요 — 한쪽만 주면 `d = 3 − 8 = −5`로
 *     진행 중인 커리어가 **조용히 전부 ×0.90**이 됩니다 (설계 93번 §9)
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들 — 값을 고치기 전에 이 파일을 먼저 여세요**
 *   · 「뒤로 가면 학교도 다시 굴린다」는 판정이 나오면 **T-6a가 옛 계약**입니다
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
const { bootPage, pageMutsOK, townAuto, passArc, passStage, passEarly, tapFoot, tapChild, tapChildArc, pickOrigin, PAGE_DIR,
  seedBoth } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
/* ⏱️ ✏️ 이름 · 🦶 주발 · 🗺️ 동네 · 🧒 초1~초4 · 🎯 자리 (설계 93번 §2-2 → 117번 → 133번)
 * 🔄 **2026-09-02: 3 → 4** (🧒 초1이 🗺️ 지도와 🏫 초등부 사이에 들어옴).
 * 🔄 **2026-09-03: 4 → 8** (커밋 fde6688). 둘이 한꺼번에 바뀌었습니다 —
 *    ① 🧒 어린 시절이 **한 해 → 네 해** ② 🎯 자리가 🏫 초등부 뒤 → 🧒 초4 **뒤**.
 *
 * 🔑 **이 문장이 지키는 건 「몇 개냐」가 아니라 「무엇이 오냐」예요.**
 *    🚨 2026-09-03에 **옛 목록이 이 검사를 옛 계약으로 만들었습니다** — 🎯 자리가
 *      카드 앞으로 「진짜로」 왔는데, 옛 주석은 *"자리가 여기로 앞당겨지면 「추천」의
 *      뒷문이 열립니다"*라고 적혀 있었어요.
 *    🔴 **뒷문의 정체는 「자리가 카드 앞이냐」가 아니었습니다.** 그건 값이었어요.
 *      진짜 계약은 **「초등부 미니게임 결과가 🎯 자리를 추천하지 않는다」**이고,
 *      그건 `school-test`의 **S-8**(초등부가 `opts.pos`를 안 본다)이 지킵니다.
 *      🔑 자리가 카드 앞으로 온 지금, S-8이 **더 중요해졌습니다** — 거기부터 보세요.
 *
 * 🔴 화면이 또 늘면 값만 고치지 말고 `_load.js`의 `CHILD_SCREENS`와
 *    `school-test.js`의 `SCREEN_SEQ`·S-6d를 **같이** 보세요. */
const DECISIONS_BEFORE_CARD = 8;
const PRE_CARD_SCREENS = ["screen-name", "screen-foot", "screen-origin",
  "screen-child", "screen-child2", "screen-child3", "screen-child4", "screen-position"];
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
  /* 🔴 **M-G — 🏫 학교에 건너뛰기 버튼을 답니다.** *"길어지면 카드 수를 줄이지
   *    화면(버튼)을 붙이지 마세요."* */
  M_G_SKIP: { "index.html": [[/<button class="btn btn-primary hidden" id="btn-town-next"><\/button>/,
    '<button class="btn btn-ghost" id="btn-town-skip">건너뛰기</button>\n      <button class="btn btn-primary hidden" id="btn-town-next"></button>']] },
  /* 🔴 **M-H — 🎯 자리를 첫 카드 「앞」으로 되돌립니다.** 옛 순서로 가는 변이예요.
   *    결정이 4가 되고, 그 순간 *"첫 순간 카드 앞의 결정이 3을 안 넘는다"*가 깨집니다. */
  /* 🔒 **다음에 가는 곳의 이름을 정규식에 안 박습니다.** 🗺️ 지도 뒤가 🏫 초등부에서
   *    🧒 초1로 바뀌자 `goElementary\(\)`가 **안 걸려 M-H가 「안 도는」 상태**가 됐어요. */
  M_H_POSFIRST: { "game.js": [[/WingerIntro\.openOrigin\(chosenOrigin, \(id\) => \{ chosenOrigin = id; \w+\(\); \}\);/,
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
function boot(o) {
  const opt = o || {};
  const W = bootPage({ keys: opt.keys, muts: opt.muts });
  /* 🎲 시드를 둘 다 박습니다 — 엔진은 로드 시점에 `Math.random`을 잡아 두므로
   *    (`let _rng = Math.random;`) 페이지의 Math만 갈면 **판정에는 안 걸려요.**
   * 🔴 다만 **같은 시드를 둘 다에 걸면 안 됩니다** — 앞 1,000개가 완전히 일치해
   *    보폭이 맞아 lockstep이 나요. `seedBoth`가 갈라서 겁니다 (109번 §4). */
  if (opt.seed != null) seedBoth(W, opt.seed);
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
 * T-7. ⏱️ **첫 순간 카드 앞에 무엇이 오는가** · 🏫 화면에 버튼이 하나뿐
 * ══════════════════════════════════════════════════════════════ */
console.log("── ⏱️ T-7. 첫 카드 앞의 결정과 버튼 ──");
/* 🚪 첫 순간 카드가 열릴 때까지 **실제 버튼으로** 갑니다.
 *    ⚠️ 🤖 자동 진행을 **안 켭니다** — 진짜 순간 카드가 떠야 T-7이 잴 게 있어요.
 *    🔑 화면을 지나가며 전부 기록합니다. 🎯 자리가 카드 앞으로 오면 여기 찍혀요. */
const CHILD_PICKS_T7 = ["ball", "fin", "gn", "h1"];
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
  /* 🧒 **네 해** — `_load.js`의 한 벌(`tapChildArc`)입니다. 🔴 초1만 누르면 여기서
   *    `screen-child2`에 멈추는데 흐름은 안 던지고, 아래 셈이 통째로 **덜 센 값**이 돼요. */
  const kid = [];
  for (let y = 1; y <= 4; y++) {
    kid.push(await tapChild(h.W, h.press, CHILD_PICKS_T7[y - 1], y));
    mark();   /* 🔒 **해마다** 찍습니다 — 다 걷고 나서 한 번에 찍으면 연달아 같은 화면으로
               *    보여 네 해가 **한 칸으로 뭉갭니다**(자국이 3개 사라져요) */
  }
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
    seen, pre, kid, taps: h.taps(), screen: h.active(),
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
    + `\n     🧒 해마다 누른 것 [${r.kid.map((k) => k == null ? "🔴안누름" : k).join(" ")}]`
    + (sameList
      ? `\n     🔑 목록에 🎯 자리가 **있습니다** — 2026-09-03에 자리가 🧒 초4 뒤로 왔거든요.`
        + ` 🔴 그게 「추천」의 뒷문은 **아닙니다** — 초등부가 \`opts.pos\`를 안 보는지는`
        + ` \`school-test\`의 **S-8**이 지켜요. 자리가 앞으로 온 지금 그 문장이 더 중요합니다`
      : `\n     🔴 목록이 계약과 달라요 (계약: ${PRE_CARD_SCREENS.join(" · ")})`
        + `\n        🔒 값만 고치지 마세요 — \`_load.js\`의 \`CHILD_SCREENS\`와 \`school-test\`의 S-6a·S-6d를 같이 보세요`));
  check(r.own.length === 1 && r.own[0] === "btn-town-next",
    `T-7a. 🔒 🏫 학교 화면의 조작은 **진행 버튼 하나뿐**이다 — 건너뛰기·난이도·재도전이 없다`
    + `\n     화면 직속 조작: ${r.own.length ? r.own.join(" · ") : "(없음)"}`
    + (r.own.length === 1 ? "" : `\n     🔴 결정을 늘리는 버튼이 붙었어요 — v2의 정체(내가 개입하는 순간)를 건너뛰는 버튼입니다`));
}

/* ══════════════════════════════════════════════════════════════
 * T-5. 🏫 **여덟 판을 지나면 🏟️ 제안** · T-6a. ♻️ 학교는 한 번만 굴러요
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🏟️ T-5·T-6a. 아크 · 제안 목록 · 재도전 뒷문 ──");
async function runOffers(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  const arc = await toOffers(h, "wg");
  const names = new Set(offerCards(h).map((c) => (c.querySelector(".card-title") || {}).textContent));
  const all = h.W.__get("MARKETS").map((m) => m.name);
  const T = h.W.WingerTown;
  const r = {
    arc, screen: h.active(), n: offerCards(h).length,
    titles: Array.from(names), missing: all.filter((n) => !names.has(n)),
    score: T.score(), cards: T.cards(), dev: T.deviation(), tiers: tiersOf(h),
    spots: offerCards(h).map((c) => (c.querySelector(".tag.offer-spot") || {}).textContent || ""),
  };
  h.close();
  return r;
}

/* ══════════════════════════════════════════════════════════════
 * ♻️ **되감는 길 — 🎯 자리 화면의 `btn-back-position` 하나뿐입니다**
 * ══════════════════════════════════════════════════════════════
 * ✅ 2026-09-01에 🏟️ 제안 화면의 「← 자리 다시 고르기」가 **삭제**됐습니다(designer §19 ⒝).
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🚨 **2026-09-03 — 이 검사의 세계가 바뀌었습니다** (설계 133번 · 커밋 fde6688)
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 옛 문장은 **「🎯 자리 화면이 🏫 초등부 「뒤」인 세계」**의 것이었어요:
 *      🏫 초등 2장 + 📨 조기 제안을 지나면 **🎯 자리 화면에 서 있었고**, 거기 `btn-back-position`이
 *      있어서 🗺️ 동네까지 되감아 `goElementary()`를 **다시 부를 수 있었습니다.**
 * 🔴 **그 세계가 끝났습니다.** 🎯 자리가 🧒 초4 **뒤**로 오면서, 🏫 카드를 한 장이라도 뛴 뒤에
 *    `btn-back-position`이 「보이는」 화면에 설 길이 **하나도 안 남았어요**:
 *      · 🏫 `screen-town`은 `BACK_SAFE`가 아니라 브라우저 뒤로 가기가 막힙니다
 *      · 📨/🏟️ `screen-agency`에서 뒤로 가면 **바로 앞이 `screen-town`**이라 거기서 막혀요
 *      · 🧒 `screen-child2·3·4`도 일부러 `BACK_SAFE`에서 뺐습니다 (`game.js:844`)
 *    ✅ **되감기 뒷문이 구조로 닫혔습니다.** 설계가 원한 상태예요.
 *
 * 🔑 **그래서 문장을 둘로 가릅니다** — 성질이 달라졌거든요:
 *   · **T-6a** — 사람이 실제로 갈 수 있는 길. 🎯 자리에서 되감아 돌아와도 🏫이 **한 번만** 굴러요.
 *   · **T-6a-가드** — `playedStage` 한 줄의 회귀. 🔴 지금은 그 줄을 빼도 **사람이 갈 수 있는 길에서는
 *     증상이 0장**이라(「방어의 유일한 호출자가 사라진」 자리), **화면에 안 보이는 버튼**을 눌러
 *     탐침합니다. ⚠️ 그건 사람의 길이 **아닙니다** — 「`goElementary`를 두 번 부르는 길이 다시
 *     생기는 날」을 위한 회귀 그물이에요. 보고서 §검증 불가가 아니라 **§알려진 상태**입니다.
 *   🔒 두 문장을 **묶지 마세요** — 묶으면 뒷문이 닫힌 지금도 빨간불이라 아무도 안 봅니다. */

/* ♻️ 사람이 갈 수 있는 길 — 🎯 자리에서 **누르기 전에** 되감습니다. */
async function runRewind(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  const T = h.W.WingerTown;
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(h.W, h.press, "R");
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, "seoul");
  await tapChildArc(h.W, h.press, ["ball", "fin", "gn", "h1"]);
  const r = { atPos: h.active(), cards: T.cards(), score: T.score() };
  h.press(h.D.getElementById("btn-back-position"), "← 뒤로");
  r.originScreen = h.active();
  pickOrigin(h.W, h.press, "busan");
  r.afterOrigin = h.active();
  /* 🧒 **되감은 뒤에도 네 해를 다시 지납니다** — 🔴 여기서 안 누르면 화면이
   *    `screen-child2`에 멈추고 뒤 문장이 **공짜로 참**이 됩니다(자가 복구가 실패를 삼킴). */
  const again = await tapChildArc(h.W, h.press, ["eye", "steal", "gl", "h3"]);
  r.childTaps2 = again.filter((k) => k != null).length;
  r.afterChild = h.active();
  /* 🎯 자리를 다시 눌러야 `goElementary()`가 불립니다 — 🔴 안 누르면 카드가 0장이라
   *    「🏫이 두 번 안 굴렀다」가 **아무것도 안 눌러서** 참이 돼요. */
  r.posTapped = r.afterChild === "screen-position";
  if (r.posTapped) h.press(h.D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg");
  r.stages = passStage(h.W, h.press);
  back();
  r.cards2 = T.cards(); r.score2 = T.score();
  h.close();
  return r;
}

/* 🧪 **탐침 — 사람의 길이 아닙니다.** 🏫 초5를 뛴 뒤에 **화면에 안 보이는**
 * `btn-back-position`을 눌러 `goElementary()`를 두 번 부릅니다.
 * 🔴 이걸 T-6a에 섞지 마세요 — 섞으면 「사람이 못 가는 길」의 판정이 사람의 길 판정을 덮습니다. */
async function runGuardProbe(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  const T = h.W.WingerTown;
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(h.W, h.press, "R");
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, "seoul");
  await tapChildArc(h.W, h.press, ["ball", "fin", "gn", "h1"]);
  h.press(h.D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg");
  const first = passStage(h.W, h.press);          // 🏫 초5 — 여기서 `e`가 굴렀습니다
  passEarly(h.W, h.press);                        // 📨 조기 제안 — 🙅 거절
  const r = { first, cards: T.cards(), score: T.score(), at: h.active() };
  /* 🙈 **안 보이는 버튼** — 실기기라면 여기 없습니다. 가드의 회귀만 봅니다. */
  h.press(h.D.getElementById("btn-back-position"), "🙈 (안 보이는) ← 뒤로");
  pickOrigin(h.W, h.press, "busan");
  await tapChildArc(h.W, h.press, ["eye", "steal", "gl", "h3"]);
  r.afterChild = h.active();
  if (r.afterChild === "screen-position")
    h.press(h.D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg 다시");
  r.extra = passStage(h.W, h.press);
  back();
  r.cards2 = T.cards(); r.score2 = T.score();
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
{
  const R = await runRewind(null);
  /* 🔒 **「눌렀는가」를 먼저 봅니다** — 되감은 뒤 화면이 🧒 어느 해에 멈춰 있으면
   *    「🏫이 두 번 안 굴렀다」가 **공짜로 참**이에요(자가 복구가 실패를 삼키는 자리). */
  const walked = R.childTaps2 === 4 && R.posTapped;
  const ok = walked && R.atPos === "screen-position" && R.originScreen === "screen-origin"
    && R.cards === 0 && R.stages.join("") === "ee" && R.cards2 === 2;
  check(ok,
    `T-6a. ♻️ **🎯 자리에서 되감아 다시 골라도 🏫 초5는 「한 번만」 굴러요**`
    + `\n     🎯 자리(${R.atPos}) 카드 ${R.cards}장 → 뒤로(${R.originScreen}) → 지역 다시 → ${R.afterOrigin}`
    + ` → 🧒 네 해 다시(${R.childTaps2}/4) → ${R.afterChild} → 🎯 다시 누름 ${R.posTapped ? "✔" : "🔴"}`
    + `\n     그 뒤 굴린 카드 [${R.stages.join("")}] · 카드 ${R.cards} → ${R.cards2} · 점수 ${R.score} → ${R.score2}`
    + (ok
      ? `\n     🔑 🎯 자리가 🧒 초4 뒤로 오면서 **되감기가 아직 아무것도 안 굴린 지점**이 됐어요 —`
        + ` 되감아도 잃을 게 없고, 그래서 이건 재도전 버튼이 아닙니다`
      : !walked
        ? `\n     🔴 되감은 뒤 흐름을 **끝까지 안 걸었습니다** — 이 상태의 초록불은 아무것도 안 지켜요`
        : `\n     🔴 🏫이 두 번 굴렀거나 한 번도 안 굴렀어요`));
}

/* 🚧 **T-6a-가드 — 알려진 상태입니다** (빨간불 아님 · 종료 코드에 안 셉니다)
 * `playedStage` 한 줄은 아직 소스에 있는데, **사람이 갈 수 있는 길에서는 두 번 불릴 수가
 * 없습니다.** 위 주석의 세 갈래가 전부 막혀서예요. 그래서 여기서는 **안 보이는 버튼**으로
 * 탐침만 합니다 — 🔴 이 줄이 초록불이라고 「뒷문이 막혔다」가 되는 게 아니라,
 * **「막는 줄이 아직 살아 있다」**는 뜻입니다.
 * 🔑 `goElementary`를 두 번 부르는 길이 다시 생기는 날, 이 줄이 먼저 말을 겁니다. */
{
  const G = await runGuardProbe(null);
  /* 🔑 **「카드가 늘었나」가 아니라 「`e`가 다시 굴렀나」를 봅니다.** 되감고 돌아오면
   *    흐름은 **앞으로** 갑니다(🏫 중등부 `m`이 열려요) — 그건 뒷문이 아니라 정상 진행이에요.
   *    🔴 카드 수만 세면 정상 진행이 뒷문으로 읽혀 이 줄이 늘 🚧가 됩니다. */
  const held = G.first.join("") === "ee" && G.extra.indexOf("e") < 0;
  console.log(`${held ? "✅" : "🚧"} T-6a-가드(탐침). ♻️ **안 보이는 \`btn-back-position\`으로 \`goElementary\`를 두 번 불러도 🏫 초5가 다시 안 굴러요**`
    + `\n     처음 [${G.first.join("")}] → 🙈 되감기 → ${G.afterChild} → 다시 [${G.extra.join("")}] (🔎 여기 \`e\`가 또 있으면 뒷문) · 카드 ${G.cards} → ${G.cards2}`
    + `\n     ⚠️ **사람의 길이 아닙니다** — 🏫 카드를 뛴 뒤에 이 버튼이 「보이는」 화면에 설 길은 지금 없습니다`
    + (held ? `\n     ✔ \`playedStage\` 한 줄이 아직 살아 있습니다` : `\n     🚧 가드가 안 걸립니다 — 길이 다시 생기면 그날 이게 뒷문이에요`));
}

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

/* ═══════════════════════════════════════════════════════════════════════
 * 📀 **옛 세이브 표본은 이 검사가 스스로 만듭니다** (2026-09-04 · 139번 판정)
 * ═══════════════════════════════════════════════════════════════════════
 * 🔴 **그전에는 `beta/_fixtures.js`를 그대로 「옛 세이브」로 썼습니다** — 그 파일이
 *    지금 디스크에 **우연히 낡아 있어서** 통했던 거예요. 픽스처를 다시 뽑는 날
 *    T-3a가 빨간불이 되고 T-3b·T-3c·T-3d는 **최신 세이브를 재게** 됩니다.
 *    👉 **「낡아야 초록불」인 검사는 언젠가 반드시 깨집니다.**
 *
 * ⚠️ 게다가 그 파일의 계약은 「**최신**」이에요 — `_check.html`과 `check-page-test`가
 *    **지금 화면을 그리는 데** 씁니다. 한 파일이 「최신」과 「낡음」을 동시에 질 수 없습니다.
 *
 * 🔧 그래서 **읽어 온 세이브에서 새 칸 셋을 지워** 표본을 만듭니다. 「무엇이 없으면
 *    옛 세이브인가」가 이 파일에 적히고, 픽스처가 최신이 돼도 안 죽어요.
 *    🔒 세이브는 `{ 슬롯id: 상태 }` 모양이라 **슬롯 안쪽까지** 들어가서 지웁니다.
 * 🔒 **이름이 소스와 맞는지 T-3-0이 먼저 봅니다** — 칸 이름이 바뀌면 지울 게 없어져서
 *    이 검사가 조용히 「최신 세이브를 옛 세이브라고 부르는」 상태가 되거든요. */
const OLD_FIELDS = ["townScore", "schoolN", "spotMul"];   // 🔒 문턱은 여기 박습니다

/* 세이브 문자열에서 위 칸들을 지운 사본을 돌려줘요. 지운 개수도 같이 셉니다. */
function stripNew(keys) {
  const out = {};
  let removed = 0;
  for (const [k, v] of Object.entries(keys || {})) {
    let o = null;
    try { o = JSON.parse(v); } catch (e) { o = null; }
    if (!o || typeof o !== "object") { out[k] = v; continue; }
    /* 슬롯 컨테이너({ 슬롯id: 상태 })든 상태 하나든 **양쪽 다** 훑습니다 */
    const targets = [o].concat(Object.values(o).filter((x) => x && typeof x === "object" && !Array.isArray(x)));
    for (const t of targets) {
      for (const f of OLD_FIELDS) if (t[f] !== undefined) { delete t[f]; removed += 1; }
    }
    out[k] = JSON.stringify(o);
  }
  return { keys: out, removed };
}

function runT3(muts) {
  const rows = [];
  for (const it of FX) {
    const h = boot({ keys: stripNew(it.keys).keys, muts, seed: SEEDS[0] });
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
  /* 🔒 **T-3-0 — 지우는 칸 이름이 지금 소스에 실제로 있나.** 이름이 바뀌면 `stripNew`가
   *    아무것도 안 지워서, 이 절이 **최신 세이브를 옛 세이브라고 부르게** 됩니다. */
  const GSRC = fs.readFileSync(path.join(PAGE_DIR, "game.js"), "utf8");
  const missing = OLD_FIELDS.filter((f) => !new RegExp(`S\\.${f}\\s*=`).test(GSRC));
  check(missing.length === 0,
    `T-3-0. 🔒 지우는 칸 ${OLD_FIELDS.length}개가 \`game.js\`에 **쓰는 줄로 실제 있다** (${OLD_FIELDS.join(" · ")})`
    + (missing.length ? `\n     🔴 소스에 없는 칸: ${missing.join(" · ")} — 이름이 바뀌었어요.`
      + ` \`OLD_FIELDS\`를 고치기 전까지 T-3a~d는 **아무것도 안 지킵니다**` : ""));

  const rows = runT3(null);
  const strip = FX.map((it) => stripNew(it.keys).removed);
  check(rows.length > 0 && rows.every((r) => r.ok),
    `T-3. 📀 옛 세이브 ${rows.length}종을 **이어하기 버튼으로** 열었다 (${rows.map((r) => r.id).join(" · ")})`
    + `\n     🔧 표본은 **이 검사가 만듭니다** — 픽스처에서 지운 칸 ${strip.join("+")}개`
    + ` (${strip.every((n) => n === 0) ? "0이면 픽스처가 아직 낡은 상태예요 — 그래도 계약은 그대로 섭니다" : "픽스처가 이미 최신이라 지워서 옛 세이브를 만들었어요"})`);
  const noField = rows.every((r) => r.hadTown === false && r.hadN === false && r.hadMul === false);
  check(noField,
    `T-3a. 📀 표본에 \`townScore\`·\`schoolN\`·\`spotMul\` 칸이 **없다** (= 옛 세이브 모양이다)`
    + (noField ? "" : `\n     🔴 지웠는데도 칸이 남아 있어요 — \`stripNew\`가 세이브 모양을 못 따라갑니다`
      + `\n     👉 세이브가 \`{ 슬롯id: 상태 }\`가 아닌 모양으로 바뀌었는지 보세요. T-3b·T-3c가 아무것도 안 지킵니다`));
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

/* 🧪🔑 M-R — `goSchool`의 가드 한 줄 제거. **T-6a-가드(탐침)**가 갈려야 합니다.
 * 🔴 **T-6a(사람의 길)는 안 갈립니다** — 그 길에서는 🏫이 되감기 전에 한 장도 안 굴렀거든요.
 *    성질이 다른 둘을 갈라 뒀기 때문에 여기서 그게 **눈에 보입니다.** */
if (!mutOK("M_R_GUARD")) check(false, `🧪 **변이 M-R — \`goSchool\`의 가드 한 줄 제거**${MUT_DEAD}`);
else {
  const G = await runGuardProbe(MUT.M_R_GUARD);
  const caught = G.extra.indexOf("e") >= 0;
  check(caught,
    `🧪🔑 **변이 M-R — ♻️ \`goSchool\`의 가드 한 줄을 뺌** → T-6a-가드(탐침)가 빨간불`
    + `\n     처음 [${G.first.join("")}] → 🙈 되감기 → ${G.afterChild} → 다시 [${G.extra.join("")}] (🔎 \`e\`가 또 있으면 뒷문) · 카드 ${G.cards} → ${G.cards2}`
    + (caught ? `\n     ✔ 🏫 초5가 다시 굴렀어요 — 가드가 **아직 무언가를 막고 있습니다**`
      : `\n     🔴 가드를 뺐는데 초록불이에요 — 탐침이 아무것도 안 지킵니다`)
    + `\n     ✅ **한 줄로 잡힙니다.** 가드가 셋이던 때는 하나를 빼도 증상이 0장이었어요 (96번 ⓔ)`);
  /* 🔒 **반대 방향** — 성질이 다른 것을 안 묶었다는 증거입니다. */
  const R = await runRewind(MUT.M_R_GUARD);
  const stillOK = R.childTaps2 === 4 && R.posTapped && R.stages.join("") === "ee" && R.cards2 === 2;
  check(stillOK,
    `🧪 **변이 M-R → T-6a(사람의 길)는 초록불로 남아야** 한다 — 그 길에는 되감기 전에 굴린 카드가 없어요`
    + `\n     되감은 뒤 [${R.stages.join("")}] · 카드 ${R.cards} → ${R.cards2}`
    + (stillOK ? `\n     🔑 이게 둘을 안 묶은 값어치예요 — 묶었으면 «가드가 죽었다»가 «사람 길이 깨졌다»로 읽힙니다` : ""));
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
