/* 🏘️ ⚽ 더 윙어 II — 동네가 **닿는 곳과 안 닿는 곳** · 화면 배선 (T-2 · T-3 · T-5 · T-6 · T-7)
 *
 * 🔴 **이 파일이 생기기 전까지 이 자리를 지키는 검사가 0건이었습니다.**
 *    engineer가 동네를 하나씩 되돌린 여섯 변이가 **전부 안 잡혔어요**
 *    (`91_engineer_hometown.md` §5). 그중 둘은 designer가 못 박은 금지 사항입니다:
 *      · **M-D** `growth`(36턴 복리)에 동네를 걸기 → *"복리 축에 조작 3장을 걸면 그게 처벌"*
 *      · **M-E** 제안 목록을 3곳으로 줄이기 → *"못한 사람에게 🇰🇷만 주면 데뷔가 오히려
 *        쉬워지고 잘한 사람은 험한 🇮🇹를 받습니다. **축이 뒤집혀요.**"*
 *    둘 다 **나중에 누가 좋은 뜻으로 넣을** 변경이라 검사가 막아야 합니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-08-31 · designer 85번 「순-B」 · engineer 91번)
 *
 *   · 흐름은 **타이틀 → 🪪 이름 → 📍 자리 → 🏘️ 동네(3장) → 🏟️ 제안 → 🧬 조립대**
 *   · 📣 제안이 닿는 축은 **`spot` 하나뿐**입니다. `growth`·`debut`은 **비트 단위 불변**
 *   · 🏟️ **5곳이 전부 옵니다.** 바뀌는 건 카드에 붙는 제안 등급 한 줄뿐이에요
 *   · ♻️ **동네는 한 번만 굴러요.** 뒤로 갔다 와도 점수·제안이 그대로 —
 *     다시 굴리는 길이 곧 **재도전 버튼의 뒷문**입니다 (설계 §5-3)
 *   · ⏱️ **첫 순간 카드까지 탭 3번.** 🏘️ 동네에 건너뛰기·난이도·재도전 버튼이 없습니다
 *   · 🏘️ 옛 세이브는 **중립 3점 · 배수 ×1**로 삽니다 (마이그레이션 없음)
 *
 * ⚠️ **「뒤로 가면 동네도 다시 굴린다」는 판정이 나오면 T-6이 옛 계약이 됩니다**
 *    (engineer 91번 §7 ①이 designer에게 되물어 둔 자리예요).
 * ⚠️ **「동네를 growth에도 태우자」는 판정이 나오면 T-2가 통째로 뒤집힙니다.**
 *    그때는 값을 고치지 말고 이 파일을 먼저 여세요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(탭 3 · 5곳 · 중립 3점 · 36턴)은 여기 박습니다.** `MARKETS.length`나
 *      `scoreOf`의 기본값을 소스에서 읽어 오면 **바꿔도 검사가 따라갑니다**
 *   ③ **게임 입구를 통해** — 타이틀부터 실제 버튼을 눌러 갑니다
 *      (pointerdown → pointerup → click, 실기기 순서 그대로)
 *   ④ **시드 하나로 안 잽니다** — T-2는 시드 둘의 36턴 궤적을 각각 봅니다
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인합니다 (안 걸리면 ❌ 한 줄, 죽지 않아요)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔬 T-2를 재는 법 — **값이 아니라 관계로**, 그리고 자기 자신과 비교하지 않습니다
 * ─────────────────────────────────────────────────────────────────────────
 * 게임 입구로 커리어를 하나 만든 뒤 **`S.spotMul` 한 칸만** 0.90 ↔ 1.10으로 갈라
 * 같은 시드로 36턴을 똑같이 훈련시킵니다. 소스는 **무변이**예요.
 *
 *   T-2a  36턴 능력치·컨디션 궤적이 **비트 단위로 같다**   → `growth`가 안 움직였다
 *   T-2b  🎲 **강제로 연** 📣 명성 사건의 보상이 **다르다** → `spot`에는 실제로 닿는다
 *         (운을 안 재려고 사건을 직접 겨눕니다 — 아래 `FORCE_EVENT_C` 주석)
 *
 * 🔑 **T-2b가 없으면 T-2a는 "아무 데도 안 닿아서 통과"입니다.** M-A(동네가 아무 데도
 *    안 닿음)가 정확히 그 모양이라, 두 술어를 **같이** 걸어야 잡힙니다.
 *    화면은 `📣 주목 ×1.10 → ×1.21`이라고 약속하는데 명성이 안 움직이면
 *    그건 배선이 죽은 거예요 — **화면의 약속과 실제가 같은 말을 하는지**를 봅니다.
 *
 * ⏱️ 약 60초 걸려요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, pageMutsOK, townAuto, passTown, PAGE_DIR } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const TAPS_TO_FIRST_CARD = 3;   // ⏱️ 타이틀 → 첫 🏘️ 순간 카드까지 (설계 85번 · 결정 탭 4)
const OFFER_COUNT = 5;          // 🏟️ 유스 5곳이 **전부** 옵니다 (줄이면 축이 뒤집혀요)
const OLD_SAVE_SCORE = 3;       // 🏘️ 옛 세이브의 중립 점수 (0이면 진행 중 커리어가 조용히 ×0.95)
const OLD_SAVE_MUL = 1;         // 📣 옛 세이브의 중립 배수
const MUL_LO = 0.90, MUL_HI = 1.10;   // 📣 배수 양 끝 — T-2의 흔드는 폭
const TURNS = 36;               // 🌱 36턴 = 성장 곡선 전체 길이
/* 🎲 **📣 명성 사건을 강제로 엽니다** — 운을 재지 않으려고요.
 *
 * 🔴 처음엔 36턴 안에 `📱 연습 경기 하이라이트`(명성 +8×주목)가 저절로 뜨기를 기다렸는데,
 *    실측해 보니 **시드 10개 중 3개에서 한 번도 안 떴습니다.** 그 시드를 고르면
 *    T-2b가 "배수가 안 닿는다"고 **헛빨간불**을 냅니다 — 배선은 멀쩡한데요.
 *    (고정 시드에서만 통과하는 검사 — 이 저장소가 이미 두 번 데인 모양이에요)
 *
 * 🔧 그래서 **한 번의 클릭 동안만** `Math.random`을 상수로 고정합니다.
 *    `maybeEvent()`가 `Math.random() > 0.3`으로 열고 `pick(events)`로 고르는데,
 *    `pick`은 `arr[floor(Math.random() * len)]`이라 상수 c에서는
 *    **몇 번째 난수든** 같은 칸을 집어요 (D-2와 같은 기법).
 *      · c ≤ 0.3    → 사건이 열립니다
 *      · floor(c×7) → 📣 명성 사건 칸
 *    🔑 **난수 소비량에도 시드에도 안 흔들립니다.** 실측: 시드 10개 전부 +7 / +9.
 * ⚠️ 사건 목록의 **순서나 개수가 바뀌면** 다른 사건이 열립니다 — 그때는 T-2b가
 *    "명성 사건이 안 열렸어요"라고 말합니다(조용히 통과하지 않아요). c를 다시 잡으세요. */
const FORCE_EVENT_C = 0.20;
const SEEDS = [9, 27];          // 🎲 시드 하나로 안 잽니다
const STAT_KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 *    (engineer 91번 §5의 여섯 중 다섯. 나머지 M-C는 `town-neutral-test.js`)
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **M-A — 동네가 아무 데도 안 닿습니다.** 화면은 `📣 주목 ×1.10 → ×1.21`이라고
   *    계속 약속하는데(그 줄은 `renderMarkets`가 직접 계산해요) 실제 명성은 안 움직여요.
   *    **오류도 경고도 하나 안 납니다.** 동네가 통째로 컷신이 됩니다. */
  M_A_DEAD: { "game.js": [[/const spotOf = \(m\) => \(\(m && m\.spot\) \|\| 1\) \* \(\(S && S\.spotMul\) \|\| 1\);/,
    "const spotOf = (m) => ((m && m.spot) || 1);"]] },
  /* 🔴 **M-B — 옛 세이브 기본값을 3 → 0으로.** 진행 중인 커리어가 전부
   *    *"동네에서 못한 선수"* 가 됩니다. 새 게임에서는 아무 증상이 없어요. */
  M_B_ZERO: { "town.js": [[/st\.townScore != null \? st\.townScore : 3/, "st.townScore != null ? st.townScore : 0"]] },
  /* 🔴 **M-D — `growth`(36턴 복리)에 동네를 겁니다.** designer가 절대 금지한 축이에요.
   *    *"0.98 vs 1.18은 36턴 복리입니다. 복리 축에 조작 3장을 걸면 그게 처벌이에요."* */
  M_D_GROWTH: { "game.js": [[/\* m\.growth \* condMod/, "* m.growth * ((S && S.spotMul) || 1) * condMod"]] },
  /* 🔴 **M-E — 제안 목록을 3곳으로.** *"못한 사람에게 🇰🇷(데뷔 0.66 · 가장 쉬움)만 주면
   *    데뷔가 오히려 쉬워지고 잘한 사람은 험한 🇮🇹를 받습니다. 축이 뒤집혀요."* */
  M_E_SHORT: { "game.js": [[/for \(const m of MARKETS\) \{/, "for (const m of MARKETS.slice(0, 3)) {"]] },
  /* 🔴 **M-F — 재도전 뒷문.** 자리를 다시 고를 때마다 동네가 다시 굴러
   *    *"최고가 나올 때까지 돌리는 화면"* 이 됩니다. 버튼은 하나도 안 늘어나요. */
  M_F_REROLL: { "game.js": [[/ {4}if \(WingerTown\.played\(\)\) \{ showOffers\(\); return; \}\n/, ""]] },
  /* 🔴 **M-G — 🏘️ 동네에 건너뛰기 버튼을 답니다.** 결정 탭 4를 넘기는 자리예요.
   *    *"길어지면 길이를 줄이지 버튼을 붙이지 마세요."* */
  M_G_SKIP: { "index.html": [[/<button class="btn btn-primary hidden" id="btn-town-next"><\/button>/,
    '<button class="btn btn-ghost" id="btn-town-skip">건너뛰기</button>\n      <button class="btn btn-primary hidden" id="btn-town-next"></button>']] },
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
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 동네에 닿습니다
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

/* 🚪 타이틀 → 🪪 이름 → 📍 자리. **여기까지가 3탭**이고, 마지막 탭에서
 *    🏘️ 동네 첫 순간 카드가 바로 열립니다 (`WingerTown.open`). */
function toTown(h, pos) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  h.press(h.D.querySelector(`#position-list .card[data-pos="${pos}"]`), `📍 ${pos}`);
  return h;
}
/* 🤖 자동 진행(중립 s = 0.5)으로 동네를 지나 🏟️ 제안 화면까지. */
function toOffers(h, pos) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  const back = townAuto(h.W);        // ⚠️ 📍 자리를 누르기 **전**에 켜야 해요
  h.press(h.D.querySelector(`#position-list .card[data-pos="${pos}"]`), `📍 ${pos}`);
  const n = passTown(h.W, h.press, back);
  return n;
}
const offerCards = (h) => Array.from(h.D.querySelectorAll("#agency-list button"));
const tiersOf = (h) => offerCards(h).map((c) => (c.className.match(/offer-t(\d)/) || [])[1] || "?").join("");

/* ══════════════════════════════════════════════════════════════
 * T-7. ⏱️ **첫 순간 카드까지 탭 3번** · 🏘️ 동네에 건너뛰기·재도전 버튼이 없다
 * ══════════════════════════════════════════════════════════════ */
console.log("── ⏱️ T-7. 결정 탭과 버튼 ──");
function runT7(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  toTown(h, "wg");
  const card = h.D.getElementById("town-card");
  /* 🏘️ 화면 **직속** 조작 — `#town-card` 안쪽은 순간 카드 자신의 버튼이라 뺍니다 */
  const own = Array.from(h.D.querySelectorAll("#screen-town button, #screen-town input, #screen-town select"))
    .filter((el) => !card.contains(el));
  const r = {
    taps: h.taps(), screen: h.active(),
    cardCls: card ? card.className : "(#town-card 없음)",
    hasMoment: !!(card && card.querySelector('[class*="w2m-"]')),
    own: own.map((el) => el.id || el.className),
  };
  h.close();
  return r;
}
{
  const r = runT7(null);
  check(r.taps === TAPS_TO_FIRST_CARD && r.screen === "screen-town" && r.hasMoment,
    `T-7. ⏱️ 타이틀에서 **탭 ${TAPS_TO_FIRST_CARD}번**이면 🏘️ 첫 순간 카드가 열린다`
    + ` (잰 값 ${r.taps}탭 · 화면 ${r.screen})`
    + `\n     #town-card 클래스 "${r.cardCls}" · 순간 카드 ${r.hasMoment ? "떴어요" : "🔴 안 떴어요"}`);
  check(r.own.length === 1 && r.own[0] === "btn-town-next",
    `T-7a. 🔒 🏘️ 동네 화면의 조작은 **진행 버튼 하나뿐**이다 — 건너뛰기·난이도·재도전이 없다`
    + `\n     화면 직속 조작: ${r.own.length ? r.own.join(" · ") : "(없음)"}`
    + (r.own.length === 1 ? "" : `\n     🔴 결정 탭 4를 넘기는 버튼이 붙었어요 — 그건 v2의 정체(내가 개입하는 순간)를 건너뛰는 버튼입니다`));
}

/* ══════════════════════════════════════════════════════════════
 * T-5. 🏟️ **5곳이 전부 온다** · T-6. ♻️ 동네는 한 번만 굴러요
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🏟️ T-5·T-6. 제안 목록과 재도전 뒷문 ──");
function runOffers(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  const passed = toOffers(h, "wg");
  const names = new Set(offerCards(h).map((c) => (c.querySelector(".card-title") || {}).textContent));
  const all = h.W.__get("MARKETS").map((m) => m.name);
  const r = {
    passed, screen: h.active(), n: offerCards(h).length,
    titles: Array.from(names), missing: all.filter((n) => !names.has(n)),
    score: h.W.WingerTown.score(), tiers: tiersOf(h),
    spots: offerCards(h).map((c) => (c.querySelector(".tag.offer-spot") || {}).textContent || ""),
  };
  /* ♻️ 뒤로 → 📍 자리 다시 고르기 → 동네가 또 구르나 */
  h.press(h.D.getElementById("btn-back-first"), "← 자리 다시 고르기");
  r.backScreen = h.active();
  h.press(h.D.querySelector('#position-list .card[data-pos="df"]'), "📍 df (다시)");
  r.afterScreen = h.active();
  r.score2 = h.W.WingerTown.score();
  r.tiers2 = tiersOf(h);
  h.close();
  return r;
}
const O = runOffers(null);
check(O.passed === 3 && O.screen === "screen-agency",
  `T-5. 🏘️ 동네 3장을 지나면 🏟️ 제안 화면에 선다 (지나간 카드 ${O.passed}장 · 화면 ${O.screen})`);
check(O.n === OFFER_COUNT && O.missing.length === 0,
  `T-5a. 🏟️ **유스 ${OFFER_COUNT}곳이 전부 온다** — 못했든 잘했든 목록은 안 줄어요 (동네 ${O.score}점)`
  + `\n     ${O.titles.join(" · ")}`
  + (O.missing.length ? `\n     🔴 화면에 없는 유스: ${O.missing.join(", ")} — **축이 뒤집힙니다**` : "")
  + (O.n === OFFER_COUNT ? "" : `\n     🔴 카드가 ${O.n}장이에요 (계약은 ${OFFER_COUNT}장)`));
check(O.spots.every((s) => /×[\d.]+ → ×[\d.]+/.test(s)),
  `T-5b. 📣 카드마다 **주목 배수가 숫자로** 적혀 있다 (원칙 ③ — 효과가 있으면 손잡이도)`
  + `\n     ${O.spots.map((s) => s.replace(/📣 주목 /, "")).join(" · ")}`);
check(O.backScreen === "screen-position" && O.afterScreen === "screen-agency"
  && O.score === O.score2 && O.tiers === O.tiers2,
  `T-6. ♻️ **동네는 한 번만 굴러요** — 뒤로 갔다 자리를 다시 골라도 점수·제안이 그대로`
  + `\n     뒤로 → ${O.backScreen} · 자리 다시 → ${O.afterScreen}`
  + `\n     점수 ${O.score} → ${O.score2} · 제안 등급 ${O.tiers} → ${O.tiers2}`
  + (O.afterScreen === "screen-agency" ? "" : `\n     🔴 동네가 다시 열렸어요 — **뒤로 가기가 곧 재도전 버튼**이 됐습니다`));

/* ══════════════════════════════════════════════════════════════
 * T-3. 🏘️ **옛 세이브가 중립이다** — 마이그레이션 없이 읽는 쪽 기본값으로
 *
 * `beta/_fixtures.js`의 winger2 3종이 딱 그 옛 세이브예요
 * (`townScore`·`spotMul`이 없는 3년차 커리어).
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🏘️ T-3. 옛 세이브가 중립 ──");
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
    const m = S ? h.W.__get("marketOf")() : null;
    rows.push({
      id: it.id, ok: !!S,
      hadTown: S ? S.townScore !== undefined : null,
      hadMul: S ? S.spotMul !== undefined : null,
      score: S ? h.W.WingerTown.scoreOf(S) : null,
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
  const noField = rows.every((r) => r.hadTown === false && r.hadMul === false);
  check(noField,
    `T-3a. 📀 그 세이브들에 \`townScore\`·\`spotMul\` 칸이 **없다** (= 진짜 옛 세이브다)`
    + (noField ? "" : `\n     🔴 픽스처가 이미 새 칸을 갖고 있어요 — T-3b가 아무것도 안 지킵니다. 픽스처를 다시 뽑았나요?`));
  check(rows.every((r) => r.score === OLD_SAVE_SCORE),
    `T-3b. 🏘️ 칸이 없는 세이브가 \`scoreOf\` **${OLD_SAVE_SCORE}점(중립)**으로 읽힌다`
    + `\n     ${rows.map((r) => `${r.id}:${r.score}점`).join(" · ")}`
    + `\n     🔴 여기가 0이면 진행 중인 커리어가 전부 조용히 "동네에서 못한 선수"가 됩니다`);
  check(rows.every((r) => r.spotOf === r.spot),
    `T-3c. 📣 칸이 없는 세이브의 \`spotOf\`가 **유스의 spot 그대로**다 (배수 ×${OLD_SAVE_MUL})`
    + `\n     ${rows.map((r) => `${r.id}: spot ${r.spot} → spotOf ${r.spotOf}`).join(" · ")}`);
}

/* ══════════════════════════════════════════════════════════════
 * T-2. 🔒 **제안은 `spot`에만 닿는다** — `growth`는 비트 단위 불변
 *
 * 게임 입구로 커리어를 만든 뒤 **`S.spotMul` 한 칸만** 갈라 36턴을 같이 굴립니다.
 * 🔧 소스는 **무변이**예요 — 흔드는 건 세이브 값 하나뿐입니다.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🔒 T-2. growth 무변 · spot에는 닿는다 ──");
function career(seed, mul, muts) {
  const h = boot({ seed, muts });
  toOffers(h, "wg");
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
    h.press(b, `🏋️ ${k}`);
    traj.push(STAT_KEYS.map((x) => S.stats[x]).join(",") + "|" + S.condition);
    fan.push(S.fandom);
  }
  /* 📣 **여기서 「명성 사건」을 강제로 한 번 엽니다** (위 FORCE_EVENT_C 주석).
   *    36턴 궤적을 다 잰 **뒤**라서 T-2a가 재는 값에는 손을 안 댑니다. */
  const before = S.fandom;
  const real = h.W.Math.random;
  h.W.Math.random = () => FORCE_EVENT_C;
  h.press(h.D.querySelector('.screen.active .action-btn[data-key="__rest"]')
    || h.D.querySelector('.action-btn[data-key="__rest"]'), "🛌 휴식(명성 사건)");
  h.W.Math.random = real;
  const out = { turns: traj.length, traj: traj.join(";"), fandom: S.fandom, fan,
    gain: S.fandom - before, log0: (S.log || [])[0] || "", spotMul: S.spotMul };
  h.close();
  return out;
}
function pair(seed, muts) {
  const lo = career(seed, MUL_LO, muts), hi = career(seed, MUL_HI, muts);
  return { seed, lo, hi, same: lo.traj === hi.traj, gainDiff: hi.gain - lo.gain,
    fired: lo.gain > 0 && hi.gain > 0, turns: lo.turns };
}
const P = SEEDS.map((s) => pair(s, null));
check(P.every((p) => p.turns === TURNS),
  `T-2. 🏋️ 두 짝 모두 **${TURNS}턴**을 굴렸다 (${P.map((p) => `시드 ${p.seed}:${p.turns}턴`).join(" · ")})`);
check(P.every((p) => p.same),
  `T-2a. 🔒 📣 배수를 ×${MUL_LO} ↔ ×${MUL_HI}로 흔들어도 **${TURNS}턴 능력치·컨디션 궤적이 비트 단위로 같다**`
  + `\n     ${P.map((p) => `시드 ${p.seed}: ${p.same ? "같음" : "🔴 다름"}`).join(" · ")}`
  + (P.every((p) => p.same) ? `\n     (= \`growth\`에 한 톨도 안 닿았어요 — 36턴 복리 축은 동네와 무관합니다)`
    : `\n     🔴 **동네가 36턴 복리에 걸렸습니다.** designer가 절대 금지한 축이에요 —`
      + `\n        "복리 축에 조작 3장을 걸면 그게 처벌"입니다`));
/* 📊 **측정 조건 먼저.** 사건이 안 열렸으면 T-2b는 아무것도 안 재는 겁니다 —
 *    그건 "계약이 깨졌다"와 **다른 종류의 실패**라 따로 찍습니다. */
check(P.every((p) => p.fired),
  `T-2b-조건. 📊 강제로 연 **📣 명성 사건**이 두 짝 모두에서 실제로 열렸다`
  + `\n     ${P.map((p) => `시드 ${p.seed}: ×${MUL_LO} +${p.lo.gain} · ×${MUL_HI} +${p.hi.gain}`).join(" · ")}`
  + `\n     ${P[0].lo.log0 || "(로그 없음)"}`
  + (P.every((p) => p.fired) ? "" : `\n     🔴 명성 사건이 안 열렸어요 — \`maybeEvent\`의 사건 목록 순서·개수가 바뀌었나요? FORCE_EVENT_C를 다시 잡으세요`));
check(P.every((p) => p.gainDiff > 0),
  `T-2b. 📣 같은 사건에서 ⭐ 명성이 **다르다** — 배수가 높은 쪽이 더 많다 (= \`spot\`에는 실제로 닿아요)`
  + `\n     ${P.map((p) => `시드 ${p.seed}: ×${MUL_LO} → +${p.lo.gain} · ×${MUL_HI} → +${p.hi.gain} (차이 ${p.gainDiff})`).join("\n     ")}`
  + (P.every((p) => p.gainDiff > 0)
    ? `\n     🔑 **이 술어가 없으면 T-2a는 "아무 데도 안 닿아서 통과"입니다** — 측정 조건을 스스로 찍는 자리예요`
    : `\n     🔴 배수를 흔들었는데 명성이 안 움직여요 — 화면은 \`📣 주목 ×…\`을 약속하는데 **배선이 죽었습니다**`));

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — 고치기 전에 **빨간불이 뜨는지** 반드시 확인합니다
 *
 * 🔴 **기준선이 초록불인 걸 위에서 먼저 확인했습니다.** 이미 빨간불인 검사는
 *    남의 변이 신호까지 통째로 먹어요 — engineer 91번 §5가 그 함정에 걸렸습니다
 *    (여섯 변이가 전부 `youth-moment-test`를 빨간불로 만들었는데,
 *     그 검사는 **변이 없이도** 빨간불이었어요).
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
if (fail) {
  console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);
}

/* 🧪 M-A — 동네가 아무 데도 안 닿음. T-2b가 갈려야 합니다(T-2a는 그대로 초록불이에요). */
if (!mutOK("M_A_DEAD")) check(false, `🧪 **변이 M-A — 동네가 아무 데도 안 닿음**${MUT_DEAD}`);
else {
  const p = pair(SEEDS[0], MUT.M_A_DEAD);
  check(p.gainDiff === 0 && p.same && p.fired,
    `🧪 **변이 M-A — \`spotOf\`가 \`spotMul\`을 안 봄** → T-2b가 빨간불`
    + `\n     ×${MUL_LO} → +${p.lo.gain} · ×${MUL_HI} → +${p.hi.gain} (차이 ${p.gainDiff})`
    + `\n     ${p.same ? "✔ 궤적은 그대로 같아요(T-2a는 초록불) — **T-2b 하나만** 갈립니다" : "🔴 궤적까지 달라졌어요 — 변이가 다른 데도 닿았습니다"}`
    + `\n     ${p.fired ? "✔ 명성 사건은 그대로 열렸어요 — 「안 재서 통과」가 아닙니다" : "🔴 사건이 안 열렸어요 — 이 변이 판정은 무효입니다"}`
    + (p.gainDiff === 0 ? "" : `\n     🔴 되돌렸는데 명성이 아직 움직여요 — T-2b가 다른 걸 재고 있습니다`));
}

/* 🧪 M-D — `growth`에 걸기. T-2a가 갈려야 합니다. */
if (!mutOK("M_D_GROWTH")) check(false, `🧪 **변이 M-D — \`growth\`(36턴 복리)에 동네를 걺**${MUT_DEAD}`);
else {
  const p = pair(SEEDS[0], MUT.M_D_GROWTH);
  check(!p.same,
    `🧪 **변이 M-D — \`growth\`(36턴 복리)에 동네를 걺** → T-2a가 빨간불`
    + `\n     36턴 궤적 ${p.same ? "🔴 아직 같음" : "달라졌어요 ✔"}`
    + (p.same ? `\n     🔴 designer가 금지한 축에 걸었는데 초록불이에요 — T-2a가 아무것도 안 지킵니다` : ""));
}

/* 🧪 M-E — 제안 목록을 3곳으로. T-5a가 갈려야 합니다. */
if (!mutOK("M_E_SHORT")) check(false, `🧪 **변이 M-E — 제안 목록을 3곳으로**${MUT_DEAD}`);
else {
  const r = runOffers(MUT.M_E_SHORT);
  check(r.n !== OFFER_COUNT || r.missing.length > 0,
    `🧪 **변이 M-E — 🏟️ 제안 목록을 3곳으로** → T-5a가 빨간불 (카드 ${r.n}장 · 빠진 유스 ${r.missing.length}곳)`
    + `\n     화면: ${r.titles.join(" · ")}`
    + (r.n !== OFFER_COUNT || r.missing.length ? "" : `\n     🔴 줄였는데 초록불이에요 — T-5a가 아무것도 안 지킵니다`));
}

/* 🧪 M-F — 재도전 뒷문. T-6이 갈려야 합니다. */
if (!mutOK("M_F_REROLL")) check(false, `🧪 **변이 M-F — 재도전 뒷문**${MUT_DEAD}`);
else {
  const r = runOffers(MUT.M_F_REROLL);
  check(r.afterScreen !== "screen-agency",
    `🧪 **변이 M-F — 자리를 다시 고르면 동네를 다시 굴림** → T-6이 빨간불`
    + `\n     뒤로 → ${r.backScreen} · 자리 다시 → **${r.afterScreen}**`
    + (r.afterScreen !== "screen-agency" ? `\n     ✔ 🏘️ 동네가 다시 열렸어요 — 이게 곧 재도전 버튼입니다`
      : `\n     🔴 되돌렸는데 아직 제안 화면이에요 — T-6이 아무것도 안 지킵니다`));
}

/* 🧪 M-B — 옛 세이브 기본값 0. T-3b가 갈려야 합니다. */
if (!mutOK("M_B_ZERO")) check(false, `🧪 **변이 M-B — 옛 세이브 기본값 3 → 0**${MUT_DEAD}`);
else {
  const rows = runT3(MUT.M_B_ZERO);
  check(rows.every((r) => r.score !== OLD_SAVE_SCORE),
    `🧪 **변이 M-B — 옛 세이브 \`townScore\` 기본값 3 → 0** → T-3b가 빨간불`
    + `\n     ${rows.map((r) => `${r.id}:${r.score}점`).join(" · ")}`
    + (rows.every((r) => r.score !== OLD_SAVE_SCORE) ? "" : `\n     🔴 기본값을 바꿨는데 초록불인 세이브가 있어요`));
}

/* 🧪 M-G — 🏘️ 동네에 건너뛰기 버튼. T-7a가 갈려야 합니다. */
if (!mutOK("M_G_SKIP")) check(false, `🧪 **변이 M-G — 🏘️ 동네에 건너뛰기 버튼**${MUT_DEAD}`);
else {
  const r = runT7(MUT.M_G_SKIP);
  check(r.own.length !== 1,
    `🧪 **변이 M-G — 🏘️ 동네에 \`btn-town-skip\`을 붙임** → T-7a가 빨간불`
    + `\n     화면 직속 조작: ${r.own.join(" · ")}`
    + (r.own.length !== 1 ? "" : `\n     🔴 버튼을 붙였는데 초록불이에요 — T-7a가 아무것도 안 지킵니다`));
}

/* ---------- 마무리 ---------- */
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
console.log("\n✅ 통과");
process.exit(0);
