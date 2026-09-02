/* ⚽ 더 윙어 II — ⚔️ 유스 평가전의 승부처가 **v2 순간 카드**인지
 *
 * 🔴 **이 파일이 생기기 전까지 이 자리를 지키는 검사가 0건이었습니다.**
 *    engineer가 원칙 ⑩으로 `playMoment: playYouthMoment`를 **지웠는데**
 *    (= v1 `timing.js` 8종 승부처로 복귀) **검사 10종이 전부 초록불**이었어요.
 *    되돌린 상태로 실기기를 돌리면 `🎯 슛 찬스! 초록 존에서 슈팅!`이 **눈에 보이는데도요.**
 *    (`80_engineer_youth-moments.md` §6-4 변이 A · §7)
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-08-30 · designer 79번 로드맵 ① · engineer 80번)
 *
 *   · ⚔️ 유스 평가전(그리고 🔥 프로 도전)의 승부처는 **v2 순간 카드 4종**입니다
 *     — 💨 컷인 · ⚡ 1:1 · ✨ 킬패스 · 🧱 차단 (`beta/winger-moment.js`)
 *   · 🏆 컵 · 🌍 월드컵은 **v1 승부처(`timing.js` 8종) 그대로**예요.
 *     `MatchSim.run`에 `playMoment`를 **안 넘기면 예전 그대로**라는 게 그 계약입니다 (F절)
 *   · 🦶 주발과 ♿ 판정 확대는 **유스에서 살아 있습니다.** 2026-08-30 전에는
 *     입단 전에 고르게 해놓고 36턴 내내 효과가 0인 **죽은 스위치**였어요 (designer 원칙 ③ 위반)
 *   · ⚔️ 평가전은 **턴을 안 먹습니다.** 이게 "36턴 성장 곡선을 안 건드렸다"의 근거예요
 *
 * ⚠️ **v1으로 되돌리는 판정이 다시 나오면 A·B·D절이 통째로 뒤집힙니다.**
 *    그때는 값을 고치지 말고 **이 파일을 먼저 여세요** — 지켜야 할 것 자체가 바뀐 거예요.
 *
 * ⚠️ **"유스도 프로와 같은 중심(`pFinish`/`pConcede`)을 써야 한다"고 우기지 않습니다.**
 *    유스는 `stageScore`가 이미 능력치로 등급을 정해서, 중심에 또 능력치를 얹으면
 *    §2-6이 폐기한 **이중 계상**이에요 (engineer 80번 §2). 중심의 중립성은
 *    `youth-card-test.js`가 **관계식**으로 봅니다 — 여기서는 안 봐요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(−5 컨디션 · ×1.30 · ±25%)은 여기 박습니다.** 소스에서 읽어 오면
 *      상수를 바꿔도 검사가 따라가서 아무것도 안 잡혀요
 *   ③ **게임 입구를 통해** — 타이틀 → ✏️ 이름·🦶 주발 → 🏟️ 유스 → 🎯 포지션 →
 *      🧬 조립대 → 🏠 훈련장 6턴 → 🏆 평가전. 실기기 순서 그대로
 *      (pointerdown → pointerup → click)
 *   ④ **시드 하나로 안 잽니다** — D절은 시드 여럿의 평가전을 모아 봅니다.
 *      그리고 **커버리지는 운으로 안 잽니다** — D-2는 🎲 뽑기를 직접 겨눕니다(아래 D-2 주석)
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인합니다 (안 걸리면 ❌ 한 줄,
 *      죽지 않아요)
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 * ⏱️ 약 60초.
 */
"use strict";
const { bootPage, pageMutsOK, townAuto, passTown, tapFoot } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 **정답은 여기 있습니다** — 소스에서 안 읽어요
 * ══════════════════════════════════════════════════════════════ */
const COND_PER_GAME = 5;        // ⚔️ 평가전 한 경기가 먹는 🫀 컨디션
const GAMES_PER_EVAL = 3;       // 한 평가전의 경기 수
const FOOT_WIN = 0.25;          // 🦶 주발 ±25% → 강/약 판정 창 비 = 1.25 / 0.75
const WIDE = 1.30;              // ♿ 판정 창 전역 확대
const EPS_RATIO = 0.005;        // 화면 폭이 toFixed(2)라 반올림 여유만 둡니다

/* ⚔️ 그 경기의 성격 ↔ 순간 카드 종류. **화면 글자와 손이 같은 말을 해야** 해요. */
const STAGE_KIND = { "공격 전개": "g", "중원 장악": "a", "수비 조직": "d", "포지션 자유": null };
const POS_KIND = { fw: "g", wg: "g", mf: "a", df: "d" };   // "포지션 자유"는 내 포지션이 정해요
const STAKE_EMOJI = { g: "⚽", a: "🅰️", d: "🧱" };          // `.w2m-stake` 첫 글자
/* v2 순간 카드의 상자 클래스.
 * 🔴 2026-09-02 — 판이 **하나**가 됐습니다(116번). `w2m-cutin`·`w2m-killpass`·`w2m-block`
 *    셋을 지웠어요 — 🏃 컷인 · 🎯 킬패스 · 🧱 차단이 **형태째** 없어졌습니다.
 *    🚨 목록에 남겨 두면 「넷 중 하나면 통과」라서 **판이 셋 죽어도 초록불**이 됩니다. */
const V2_BOX = ["w2m-oneone"];
/* 🧱 **수비는 판을 안 엽니다** (designer 117번 §6 c안 · `game.js playYouthMoment`).
 *    `cardP(autoP, a, 0.5) = autoP`라 결과가 🤖 자동 갈래와 **정의상 같아요** —
 *    육성은 그대로 살고 조작만 빠집니다.
 * 🔒 그래서 수비 경기에서는 화면이 **한 조각도** 안 떠야 해요:
 *    `.w2m-youth`도 `.w2m-ready`도 상자도 `.w2m-stake`도 없습니다.
 * 🚨 **그런데 v1 상자(timing.js)로 떨어져도 안 됩니다** — 그건 «판이 없다»가 아니라
 *    «옛 판으로 되돌아갔다»예요. A-4가 그 갈래를 따로 막습니다.
 * 🌍 이 계약이 서 있는 세계: 「🧱 수비가 **c안**인 세계」. 117번 §6-4가 조건을 못 박아 뒀어요 —
 *    🥅가 *"바로 알겠다"*를 받으면 **같은 격자를 우리 골문으로** 돌립니다. 그때 이 절을 여세요.
 *    🚨 그때도 🧱 차단의 **형태**(칩 둘 읽기 · 2단 국면 · 띠)는 되살리지 마세요. */
const DEFEND_KIND = "d";

const SEEDS = [11, 23, 37];     // 🎲 시드 하나로 안 잽니다

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **M1 — engineer가 넣었을 때 검사 10종이 전부 초록불이었던 그 변이입니다.**
   *    `playMoment`를 안 넘기면 `MatchSim.run`이 `playRandomMini`(v1 `timing.js` 8종)로
   *    떨어져요. 화면은 멀쩡히 돌고 **승부처만 조용히 v1으로 되돌아갑니다.** */
  M1_NO_MOMENT: { "game.js": [[/ {4}playMoment: playYouthMoment,\n/, ""]] },
  /* 🔴 **M2 — 🦶 주발이 유스에서 다시 죽은 스위치가 됩니다.**
   *    `foot`을 안 넘기면 `W2Moment`가 늘 "R"로 읽어요(`o.foot === "L" ? "L" : "R"`).
   *    왼발잡이로 골라도 컷인의 주발 코스가 오른쪽에 그려집니다 — 오류는 하나도 없어요. */
  M2_NO_FOOT: { "game.js": [[/ {4}foot: mainFoot\(\),/, '    foot: "R",']] },
  /* 🔴 **M3 — 평가전이 턴을 먹습니다.**
   *    36턴 성장 곡선이 조용히 움직이는 자리예요. 화면에는 아무 증상이 없습니다. */
  M3_EAT_TURN: { "game.js": [[/ {4}ev\.totalPts \+= pts;/, "    ev.totalPts += pts; advanceMonth();"]] },
  /* 🔴 **M4 — 경기 성격 뽑기 풀을 한 칸으로.** 화면은 멀쩡히 돌고 **성격만 하나로 굳습니다.**
   *    D-1(화면과 손이 같은 말)은 그대로 초록불이에요 — 나오는 한 종류는 여전히 맞으니까요.
   *    **D-2만** 갈립니다. */
  M4_ONE_TYPE: { "game.js": [[/STAGE_TYPES\[pick\(\[0, 1, 2\]\)\]/, "STAGE_TYPES[pick([0])]"]] },
  /* 🔴 **M5 — 🧱 수비에도 판을 엽니다** (designer 117번 §6-1 a안으로 되돌리는 형태).
   *    *"한 명만 지나가면 실점이에요"*인데 화면이 **상대 골문**이 됩니다 —
   *    화면이 만드는 기대(**골을 넣는다**)와 상황의 핵심(**막는다**)이 정면으로 싸워요.
   * 🔄 **2026-09-02 — 판단의 주인이 하나로 모였습니다** (engineer 120번 §3-2).
   *    그전에는 `kind === "defend"`를 `game.js`와 `winger-moment.js` **두 곳에 따로** 적었어요.
   *    🔴 같은 결과를 내는 줄이 둘이면 **하나를 지워도 증상이 0장**이라, 변이가 아무것도
   *       안 잡습니다 — 가리는 줄은 **단독으로는 증상이 없어** 존재 자체가 안 보여요.
   *    ✅ 지금은 `winger-moment.js`의 **`opens(kind)` 하나**가 주인이고, `game.js`는 그걸
   *       **물어봅니다**(`M.opens && !M.opens(kind)`).
   * 🔑 **그래도 둘 다 빼야 증상이 납니다** — `game.js` 쪽은 「상자를 비우기 전에 묻는」
   *    자리이고 `winger-moment.js` 쪽은 「화면을 한 조각도 안 그리는」 자리라, 서로 다른
   *    단계를 막고 있어요. 🔒 그래서 M5_NET이 여전히 필요합니다.
   * 🔒 낱말을 정규식에 안 박습니다 — 안쪽 문장이 바뀌어도 삽니다. */
  M5_DEFEND_OPENS: { "game.js": [[/if \(autoMiniOn\(\) \|\| \(M\.opens && !M\.opens\(kind\)\)\) \{ cb\(judge\(0\.5\), T\); return; \}/,
    'if (autoMiniOn()) { cb(judge(0.5), T); return; }']] },
};
/* 🧱 안전망 쪽(`winger-moment.js`)도 같이 빼야 해서 파일이 달라 따로 둡니다.
 * 🔒 **주인이 `opens`로 옮겨 갔습니다** — 옛 정규식(`o.kind === "defend"`)은 안 걸려요. */
const M5_NET = [[/ {4}if \(!opens\(o\.kind\)\) \{[^\n]*\}/, ""]];

/* ══════════════════════════════════════════════════════════════
 * 🔎 0. 변이 정규식이 지금 소스에 걸리나 — 다른 무엇보다 먼저
 * ══════════════════════════════════════════════════════════════ */
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
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 평가전에 닿습니다
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function boot(o) {
  const W = bootPage({ keys: o.keys, muts: o.muts });
  /* 🎲 시드를 박아 재현합니다 — 🦶 주발 A/B는 **같은 시드**여야 카드가 같아요.
   *    (주발 고르기는 난수를 하나도 안 씁니다 — `rollFoot()`은 고르든 말든 굴러요) */
  W.Math.random = mulberry32(o.seed);
  /* ⏩ 중계 이벤트가 780ms 간격이라 그대로 두면 한 경기에 8초가 걸려요.
   *    **간격만 줄입니다** — 순서·개수는 그대로예요. */
  const si = W.setInterval;
  W.setInterval = (fn) => si(fn, 1);
  const D = W.document;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  return { W, D, press, S: () => W.__get("S"),
    active: () => (D.querySelector(".screen.active") || {}).id,
    close: () => W.close() };
}

/* 🚪 타이틀 → ✏️ 이름 → 🦶 주발 → 🗺️ 동네(지나감) → 📍 자리 → 🏘️ 동네 3장 → 🏟️ 입단 제안
 *    → 🧬 조립대 → 🏠 훈련장
 * ⚠️ 2026-08-31에 **🏘️ 동네가 들어오면서 순서가 바뀌었습니다** (85번 「순-B」) —
 *    유스가 「고르는 화면」에서 「제안받는 화면」이 되어 **자리 뒤로** 갔어요.
 *    `#agency-list`는 동네를 지나야 채워집니다(`showOffers` → `renderMarkets`).
 * ⚠️ 2026-09-01에 **🦶 주발이 `#screen-name`에서 나가 자기 화면이 됐습니다** (94번 §6-1).
 *    이 드라이버가 그때 죽었어요 — 종료 코드 2였습니다.
 * ⚠️ 2026-09-02에 **그 화면에 [다음]이 붙어 또 죽었습니다** (111번). 같은 자리에서 두 번이에요.
 *    🔒 그래서 🦶는 이제 **`_load.js`의 `tapFoot` 한 벌**을 부릅니다 — 여기서 손으로 안 눌러요. */
async function toHome(h, o) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  /* 🦶 **주발 화면을 지납니다 — `_load.js`의 `tapFoot` 한 벌을 씁니다.**
   * 🔴 **여기 인라인 사본이 있었습니다.** 2026-09-02에 주발 화면에 [다음]이 붙자
   *    이 사본이 그대로 죽어 이 파일이 종료 코드 2가 됐어요(사본이 셋이었습니다 —
   *    `_load.js` · `foot-map-test.js` · 여기). rAF preamble 네 벌과 **같은 형태**입니다.
   *    ⚠️ 다시 인라인으로 풀지 마세요 — `foot-next-test.js`의 N-9가 빨간불을 냅니다.
   * 🗺️ 동네 화면(`#screen-origin`)은 **지나갑니다** — 자리 카드 핸들러가 살아 있어서
   *    `S.origin`은 설계 93번 §4-3이 뚫어 둔 기본값 `""`(🌍 미상)으로 삽니다.
   *    ⚠️ 이 파일은 🦶만 봐요. 🗺️ 지역 계약은 `foot-map-test.js`가 맡습니다. */
  await tapFoot(h.W, h.press, o.foot === "L" ? "L" : "R");
  const back = townAuto(h.W);
  h.press(h.D.querySelector(`#position-list .card[data-pos="${o.pos}"]`), `📍 ${o.pos}`);
  passTown(h.W, h.press, back);      // ♻️ 되돌립니다 — 이 파일은 진짜 미니게임을 잽니다
  h.press(h.D.querySelector("#agency-list button"), "🏟️ 입단 제안");
  h.press(h.D.getElementById("btn-prospect-start"), "btn-prospect-start");
  return h;
}

/* 🏠 훈련장에서 🛌 휴식으로 턴을 써서 **다음 대회 버튼이 열릴 때까지** 갑니다.
 * (🛌 휴식은 언제나 턴 하나를 그대로 소모해요 — 훈련은 상한에서 다르게 굴러요) */
async function restUntilStage(h) {
  for (let i = 0; i < 14 && !h.D.querySelector(".go-game"); i++) {
    h.press(h.D.querySelector('.action-btn[data-key="__rest"]'), "🛌 휴식");
    await wait(2);
  }
  return !!h.D.querySelector(".go-game");
}

/* ⚔️ 평가전 한 번(3경기)을 **손으로 눌러** 끝까지 갑니다.
 * 카드마다 화면이 무엇을 그렸는지 그대로 모아 와요. */
async function playEval(h, pos) {
  const D = h.D;
  const sm = () => D.getElementById("stage-moment");
  const rec = { before: snap(h), cards: [], mid: [] };
  h.press(D.querySelector(".go-game"), "🏆 대회 출전");
  await wait(5);
  h.press(D.getElementById("btn-stage-next"), "첫 경기 출전");
  for (let g = 0; g < GAMES_PER_EVAL; g++) {
    // 승부처가 열릴 때까지 (v1이든 v2든 상자가 하나 뜹니다)
    for (let i = 0; i < 900 && !(sm() && sm().querySelector(".tm-box")); i++) await wait(3);
    const c = { round: (D.getElementById("stage-round") || {}).textContent || "",
      hostCls: sm() ? sm().className : "(#stage-moment 없음)",
      stake: ((sm() && sm().querySelector(".w2m-stake")) || {}).textContent || "",
      v1Boxes: sm() ? Array.from(sm().querySelectorAll(".tm-box"))
        .filter((b) => !/\bw2m-/.test(b.className)).map((b) => b.className) : [],
      ready: !!(sm() && sm().querySelector(".w2m-ready")) };
    /* ⚔️ 이 경기의 **성격 → 카드 종류**. 표는 검사에 박혀 있어요(`STAGE_KIND`·`POS_KIND`).
     * 🔑 이걸 알아야 «화면이 안 뜨는 게 맞는 경기인가»를 가릅니다 — 🧱 수비는 안 뜨는 게 계약이에요. */
    const nm = (c.round.split("·")[1] || "").trim();
    c.kind = STAGE_KIND[nm] === null ? POS_KIND[pos || "wg"] : STAGE_KIND[nm];
    const goEl = sm() && sm().querySelector(".w2m-go");
    if (goEl) h.press(goEl, "▶️ 시작");
    await wait(5);
    const box = sm() && sm().querySelector(".w2m-box");
    c.box = box ? V2_BOX.filter((k) => box.classList.contains(k)).join("/") || box.className : "";
    /* 🦶 화면에 **그려진 폭이 곧 판정 창**이에요 (설계 §4-5) — 그걸 그대로 읽습니다 */
    c.gates = sm() ? Array.from(sm().querySelectorAll(".w2m-gate"))
      .map((x) => ({ strong: x.classList.contains("w2m-strong"), w: parseFloat(x.style.width) })) : [];
    c.halves = sm() ? Array.from(sm().querySelectorAll(".w2m-half"))
      .map((x) => ({ strong: x.classList.contains("w2m-strong"), left: x.style.left })) : [];
    c.sides = sm() ? Array.from(sm().querySelectorAll(".w2m-side"))
      .map((x) => `${x.dataset.i}${x.classList.contains("w2m-strong") ? "S" : "W"}`) : [];
    rec.cards.push(c);
    // 판을 끝냅니다 — 누를 수 있는 것을 누르고, 다음 버튼이 열릴 때까지 기다려요
    const nx = () => D.getElementById("btn-stage-next");
    for (let i = 0; i < 900; i++) {
      if (nx() && !nx().disabled) break;
      /* 🔴 2026-09-02 — `.w2m-side`·`.w2m-run-btn`·`.w2m-dir`을 지웠습니다(판이 없어졌어요).
       * 🔒 남은 것은 `.w2m-goal`(🥅 골문 — 탭을 받는 자리 하나)과 공통 버튼입니다. */
      const btn = sm() && sm().querySelector(".w2m-goal, .tm-btn:not(.w2m-go)");
      if (btn) h.press(btn, "판 조작");
      await wait(3);
    }
    rec.mid.push(snap(h));
    h.press(nx(), "다음");
    await wait(5);
  }
  rec.afterGames = snap(h);
  /* 🏁 세 번째 「다음」이 이미 `종합 순위 발표`였어요 — 지금 화면이 종합 순위입니다.
   * ⚠️ 여기서 한 번 더 누르면 `ev`가 이미 null이라 그 자리에서 죽어요.
   *    **한 번만** 눌러 훈련장으로 돌아갑니다. */
  const back = D.getElementById("btn-stage-next");
  rec.finLabel = back ? back.textContent : "";
  h.press(back, "훈련장으로 돌아가기");
  await wait(10);
  rec.afterEval = snap(h);
  return rec;
}
const snap = (h) => {
  const S = h.S();
  return { y: S.year, m: S.month, cond: S.condition, stats: JSON.stringify(S.stats),
    stages: S.stages, cards: S.youthCards || 0, screen: h.active() };
};

/* ══════════════════════════════════════════════════════════════
 * A. ⚔️ **유스 평가전의 승부처가 v2 순간 카드다**  🔴 M1이 겨누는 자리
 *
 * v1으로 되돌아가면 `#stage-moment` 안에 `w2m-` 없는 `tm-box`가 뜨고
 * `.w2m-ready`도 `.w2m-youth`도 사라집니다.
 * ══════════════════════════════════════════════════════════════ */
const base = {};
/* 🔒 **A절의 계약을 술어로 떼어 둡니다.** 기준선에는 `check()`로 걸고, 변이에는
 *    **같은 술어**를 그대로 다시 걸어요 — "기준선 ✅ / 변이 ❌"가 같은 자를 쓴다는 뜻입니다.
 *    (변이 검사가 기준선과 다른 문장을 지키면, 둘 다 초록불인 상태가 생깁니다) */
/* 🔒 **kind로 갈라 봅니다.** 공격(⚽🅰️)은 판이 뜨고, 🧱 수비는 **안 뜨는 게 계약**이에요.
 *    🚨 «전부 뜬다»로 두면 수비가 빨간불이고, «전부 안 떠도 된다»로 두면
 *       판이 통째로 죽어도 초록불입니다. **둘 다 재야** 문장이 섭니다. */
const ATK = (r) => r.cards.filter((c) => c.kind !== DEFEND_KIND);
const DEF = (r) => r.cards.filter((c) => c.kind === DEFEND_KIND);
const A_PRED = [
  ["A-2 공격 카드에 .w2m-youth", (r) => ATK(r).every((c) => /\bw2m-youth\b/.test(c.hostCls))],
  ["A-3 공격 카드에 v2 준비 화면 .w2m-ready", (r) => ATK(r).every((c) => c.ready)],
  ["A-4 v1 timing.js 상자 없음", (r) => r.cards.every((c) => c.v1Boxes.length === 0)],
  ["A-5 공격 카드가 🥅 상자를 연다", (r) => ATK(r).every((c) => V2_BOX.indexOf(c.box) >= 0)],
  /* 🧱 수비 — 화면을 **한 조각도** 안 엽니다 */
  ["A-7 🧱 수비는 판을 안 연다", (r) => DEF(r).every((c) =>
    !/\bw2m-youth\b/.test(c.hostCls) && !c.ready && !c.box && !c.stake)],
];

async function runA() {
  const h = await toHome(boot({ seed: SEEDS[0] }), { pos: "wg", foot: "R" });
  const ok = await restUntilStage(h);
  check(ok && h.active() === "screen-main",
    `A-1. 🚪 게임 입구 → 🏠 훈련장 6턴 → 🏆 **1년차 6월 평가전 버튼이 열린다** (${h.active()})`
    + (ok ? "" : " — .go-game이 안 떴어요"));
  const r = await playEval(h, "wg");
  base.r = r;
  base.errs = h.W.__errs.slice();

  const kinds = r.cards.map((c) => `${c.round.trim()}→${c.kind}`).join(" | ");
  check(A_PRED[0][1](r),
    `A-2. ⚔️ **공격 카드(⚽🅰️)**는 #stage-moment에 **.w2m-youth**가 붙는다 (유스 맥락 — playYouthMoment만 붙여요)`
    + `\n     ${r.cards.map((c) => `${c.kind}:${c.hostCls || "(빈칸)"}`).join(" | ")}`);
  check(A_PRED[1][1](r),
    `A-3. ⚔️ **공격 카드**는 v2 **준비 화면(.w2m-ready)**이 뜬다`
    + `\n     ${r.cards.map((c) => (c.ready ? "✔" : "✘") + " " + c.round).join(" | ")}`);
  const v1 = r.cards.filter((c) => c.v1Boxes.length);
  check(A_PRED[2][1](r),
    `A-4. 🔴 v1 승부처(**timing.js 8종**) 상자가 **한 장도 없다**`
    + (v1.length
      ? `\n     🔴 v1으로 되돌아갔어요: ${v1.map((c) => `${c.round} → ${c.v1Boxes.join(",")}`).join(" | ")}`
        + `\n     playMoment를 안 넘기면 MatchSim이 playRandomMini로 떨어집니다`
      : ""));
  check(A_PRED[3][1](r),
    `A-5. ⚔️ **공격 카드**에서 ▶️ 시작을 누르면 **🥅 골문**이 열린다 (${r.cards.map((c) => c.box || "(빈칸)").join(" · ")})`
    + `\n     허용: ${V2_BOX.join(" · ")} — 🔴 판이 하나예요(옛 4종 목록은 지웠습니다)`);
  /* 🧱 c안 — 수비는 판을 안 엽니다. **🔎 측정 조건을 같이 찍습니다**:
   *    이번 판에 수비 경기가 하나도 안 나왔으면 A-7은 «지켜졌다»가 아니라 «안 재졌다»예요. */
  const nDef = DEF(r).length;
  check(A_PRED[4][1](r) && nDef > 0,
    `A-7. 🧱 **수비 경기는 판을 한 조각도 안 연다** (c안 — \`s = 0.5\`로 자동 갈래와 정의상 같아요)`
    + `\n     🔎 측정 조건 — 이번 평가전의 성격: ${kinds} (수비 ${nDef}경기)`
    + (nDef > 0 ? "" : `\n     🚧 **수비 경기가 안 나와서 못 쟀습니다** — 시드가 안 뽑았어요.`
      + ` D절이 시드 셋으로 다시 봅니다`)
    + (A_PRED[4][1](r) ? "" : `\n     🔴 수비인데 화면이 떴어요: `
      + DEF(r).map((c) => `${c.round.trim()} → 상자 ${c.box || "없음"} · stake "${c.stake.slice(0, 10)}"`).join(" | ")
      + `\n     👉 «한 명만 지나가면 실점»인데 화면이 **상대 골문**이면 화면과 상황이 정면으로 싸웁니다`));
  check(base.errs.length === 0,
    `A-6. 평가전 3경기 동안 자바스크립트 오류가 없다${base.errs.length ? ` — ${base.errs[0]}` : ""}`);
  h.close();
}

async function runA_M1() {
  if (!mutOK("M1_NO_MOMENT")) { check(false, `A-M1. 🧪 변이(v1 승부처로 복귀)${MUT_DEAD}`); return; }
  const h = await toHome(boot({ seed: SEEDS[0], muts: MUT.M1_NO_MOMENT }), { pos: "wg", foot: "R" });
  await restUntilStage(h);
  const r = await playEval(h, "wg");
  /* 🔒 **M1이 겨누는 것은 「판이 v1으로 되돌아갔나」**입니다.
   * 🚨 A-7(🧱 수비는 판을 **안 연다**)은 **음의 문장**이라 M1이 안 겨눠요 —
   *    v1으로 되돌아가도 `.w2m-*`는 여전히 안 뜨니 A-7은 초록불로 남습니다.
   *    그건 **A-7이 아무것도 안 지킨다는 뜻이 아니에요**: A-7을 깨는 것은
   *    「수비에 판을 여는」 변이(M5)이고, 그건 아래에서 따로 겁니다.
   * 🔴 여기에 A-7까지 넣으면 «변이가 안 잡혔다»는 **틀린 신호**가 떠서,
   *    다음 사람이 멀쩡한 A-7을 고치러 갑니다. 그래서 **갈라 놓습니다.** */
  const AIMED = A_PRED.filter(([n]) => !/A-7/.test(n));
  const flip = AIMED.map(([n, f]) => [n, f(r)]);
  const still = flip.filter(([, v]) => v);
  check(still.length === 0,
    `A-M1. 🧪 **변이 — playMoment: playYouthMoment 제거(= v1 승부처로 복귀)** → M1이 겨누는 술어 ${flip.length}개가 전부 빨간불`
    + `\n     ${flip.map(([n, v]) => `${v ? "🟢" : "🔴"} ${n}`).join(" · ")}`
    + `\n     🔒 A-7(🧱 수비는 판을 **안 연다**)은 **음의 문장**이라 M1이 안 겨눕니다 — 아래 A-M5가 겨눠요`
    + (still.length
      ? `\n     🔴 되돌렸는데 **아직 초록불인 술어가 ${still.length}개** — 그건 아무것도 안 지키고 있어요`
      : ""));
  h.close();
}

/* 🧪 **M5 — 🧱 수비에도 판을 엽니다.** A-7이 겨누는 자리예요.
 *
 * 🔬 **방어가 둘 있는데 「겹치는 자리」가 다릅니다** — 실측해서 알았어요:
 *      ① `game.js`의 c안 가드   `if (autoMiniOn() || kind === "defend") { … return; }`
 *      ② `winger-moment.js`의 안전망  `if (o.kind === "defend") { … return; }`
 *    ①만 빼면 → `.w2m-youth`가 **붙고** 준비 화면·골문·stake는 ②가 막습니다.
 *    둘 다 빼면 → 골문이 통째로 뜨고 stake가 *"⚽ 골 찬스"*라고 적혀요.
 * 🔑 **①만 빼도 A-7이 빨간불입니다** — `container.classList.add("w2m-youth")`가
 *    `M.play()`보다 **먼저** 실행되거든요. ②는 그걸 되돌릴 수 없어요.
 *    그래서 「가리는 줄이 남의 변이를 먹는」 상태가 **아닙니다** — 둘 다 증상이 납니다.
 * 📮 다만 ①이 깨진 채로 나가면 화면에 **빈 유스 상자**가 뜹니다(보고서에 적었어요). */
async function runA_M5() {
  if (!mutOK("M5_DEFEND_OPENS")) { check(false, `A-M5. 🧪 변이(수비에 판을 엶)${MUT_DEAD}`); return; }
  const opened = async (extra) => {
    const muts = Object.assign({}, MUT.M5_DEFEND_OPENS);
    if (extra) muts["winger-moment.js"] = extra;
    const h = await toHome(boot({ seed: SEEDS[0], muts }), { pos: "wg", foot: "R" });
    await restUntilStage(h);
    const r = await playEval(h, "wg");
    h.close();
    return { r, def: DEF(r) };
  };
  const one = await opened(null);                 // game.js만
  const both = await opened(M5_NET);              // 둘 다
  const dbg = (x) => x.def.map((c) => `youth ${/\bw2m-youth\b/.test(c.hostCls) ? "붙음" : "없음"}`
    + ` · ready ${c.ready ? "뜸" : "없음"} · 상자 ${c.box || "없음"} · stake "${c.stake.slice(0, 8)}"`).join(" | ");
  console.log(`     🔬 ① game.js만: ${dbg(one)}`);
  console.log(`     🔬 ② 둘 다:     ${dbg(both)}`);
  /* 🔒 **두 단계 다** A-7을 빨간불로 만들어야 합니다 — 어느 한 줄만 지워도 증상이 나야
   *    「가리는 줄」이 없는 거예요. 그리고 ②에서는 **골문까지** 떠야 합니다(증상이 더 커짐). */
  const brokeOne = !A_PRED[4][1](one.r);
  const brokeBoth = !A_PRED[4][1](both.r);
  const gridUp = both.def.some((c) => c.box === "w2m-oneone");
  check(one.def.length > 0 && brokeOne && brokeBoth && gridUp,
    `A-M5. 🧪 **변이 — 🧱 수비에도 판을 열면 A-7이 빨간불** (수비 ${one.def.length}경기)`
    + `\n     ① \`game.js\` 가드만 빼면 → ${brokeOne ? "🔴 A-7 빨간불" : "🟢 **안 잡힘**"}`
    + ` (\`.w2m-youth\`가 붙어요 — 클래스는 \`M.play()\`보다 먼저 달립니다)`
    + `\n     ② \`winger-moment.js\` 안전망까지 빼면 → ${brokeBoth ? "🔴 A-7 빨간불" : "🟢 **안 잡힘**"}`
    + ` · 🥅 골문이 뜸 ${gridUp ? "✔" : "✘"} — 수비 상황에 **상대 골문**이에요`
    + (one.def.length ? "" : `\n     🚧 이 시드가 수비 경기를 안 뽑아서 **못 쟀습니다**`)
    + (brokeOne && brokeBoth && gridUp ? "" : `\n     🔴 어느 한 줄을 지웠는데 증상이 0장이에요 —`
      + ` 「가리는 줄」이 있으면 그 줄이 남의 변이를 먹습니다`));
}

/* ══════════════════════════════════════════════════════════════
 * B. 🦶 **주발이 유스에서 판정 창을 바꾼다** · ♿ 판정 확대  🔴 M2가 겨누는 자리
 *
 * 🔴 2026-08-30 전에는 **죽은 스위치**였어요 — 입단 전에 고르게 해놓고
 *    36턴 내내 효과가 0이었습니다(designer 원칙 ③ 위반). 그래서 검사가 아예 없었어요.
 *
 * 🔒 **값이 아니라 관계로 봅니다.**
 *    · B-1 같은 시드에서 🦶만 뒤집으면 `w2m-strong` 자리가 **반대로 간다**
 *    · B-2 🦶·🫀가 **유스 입구를 통해 판에 실제로 넘어간다**
 *    · B-3 ♿를 켜면 **그 페이지의 판정 창이 ×1.30**이 된다
 *
 * ─────────────────────────────────────────────────────────────────────
 * 🔴 **2026-09-02 — B-2·B-3을 다시 겨눴습니다** (116번)
 * ─────────────────────────────────────────────────────────────────────
 * 옛 B-2·B-3은 💨 컷인 카드가 그린 **`.w2m-gate`의 폭**을 읽었어요. 컷인이 형태째
 * 없어지면서 `.w2m-gate`가 사라졌고, 둘은 *"컷인 카드가 안 나왔어요"*라는
 * **빈 표본 위에서 빨간불**이 됐습니다.
 *
 * 🔑 **폭을 읽을 화면이 이제 없습니다.** 🥅 골문의 `.w2m-half`는 좌우가 늘 50%예요 —
 *    주발은 **폭이 아니라 밝기**로 나옵니다. 그 밝기 ↔ 판정 대조는
 *    **`one-grid-test.js` G-1**이 이미 지켜요(같은 판을 R·L로 두 번 열어 견줍니다).
 *    ⚠️ 여기서 밝기를 또 읽으면 **같은 문장이 두 파일에** 생겨 한쪽만 고쳐진 채 얼어붙습니다.
 *
 * ✅ 그래서 이 파일은 **유스 입구만** 지킵니다 — *"`playYouthMoment`가 🦶·🫀·♿를
 *    판에 넘기나"*. 창이 그 값에 **실제로 반응하는지**는 `moment-test.js` B-3·B-4의 몫이고,
 *    화면과 판정이 같은 쪽인지는 `one-grid-test.js` G-1의 몫이에요. **셋이 안 겹칩니다.**
 * ══════════════════════════════════════════════════════════════ */
const footy = (r) => r.cards.filter((c) => c.sides.length || c.halves.length);
/* 🔒 **B절의 계약을 술어로 떼어 둡니다** — 기준선과 변이가 같은 자를 씁니다.
 *   `key`  그 카드에 그려진 강/약 자리
 *   `mirror` 🦶를 뒤집었을 때 **그려져야 하는** 자리
 * 뒤집힘 > 0 이고 그대로 = 0 이어야 "🦶가 살아 있다"입니다. */
const footKey = (c) => c.sides.map((x) => x.slice(-1)).join(",")
  + "‖" + c.halves.map((h2) => (h2.strong ? "S" : "W") + h2.left).join(",");
const footMirror = (c) => c.sides.map((x) => (x.slice(-1) === "S" ? "W" : "S")).join(",")
  + "‖" + c.halves.map((h2) => (h2.strong ? "W" : "S") + h2.left).join(",");
function footFlip(R, L) {
  const fr = footy(R), fl = footy(L);
  let flipped = 0, same = 0;
  for (let i = 0; i < Math.min(fr.length, fl.length); i++) {
    if (footKey(fr[i]) === footMirror(fl[i])) flipped += 1;
    else if (footKey(fr[i]) === footKey(fl[i])) same += 1;
  }
  return { fr, fl, flipped, same, alive: fr.length > 0 && flipped > 0 && same === 0 };
}

async function runB() {
  const R = await (async () => { const h = await toHome(boot({ seed: SEEDS[0] }), { pos: "wg", foot: "R" });
    await restUntilStage(h); const r = await playEval(h, "wg"); h.close(); return r; })();
  const L = await (async () => { const h = await toHome(boot({ seed: SEEDS[0] }), { pos: "wg", foot: "L" });
    await restUntilStage(h); const r = await playEval(h, "wg"); h.close(); return r; })();

  /* 같은 시드면 **같은 카드가 같은 순서로** 와야 해요 — 안 그러면 A/B가 성립 안 합니다 */
  const sameCards = R.cards.map((c) => c.box).join(",") === L.cards.map((c) => c.box).join(",");
  check(sameCards,
    `B-0. 🎲 같은 시드에서 🦶만 뒤집으면 **카드 순서가 같다** (A/B가 성립하는 조건)`
    + `\n     R: ${R.cards.map((c) => c.box).join(",")}   L: ${L.cards.map((c) => c.box).join(",")}`);

  const ff = footFlip(R, L);
  check(ff.fr.length > 0,
    `B-1a. 🦶 주발이 걸리는 카드(🥅 골문)가 평가전에 나온다 (${ff.fr.length}/${R.cards.length}장)`
    + `\n     🔒 0장이면 아래 B-1이 **빈 표본 위에서 조용히 통과**합니다 — 그래서 여기서 셉니다`);
  /* 🦶 뒤집으면 강한 쪽 레인이 반대로 — `w2m-strong`이 붙은 자리가 정확히 뒤바뀝니다 */
  check(ff.alive,
    `B-1. 🦶 **주발을 뒤집으면 w2m-strong 레인이 반대로 간다** (뒤집힘 ${ff.flipped} · 그대로 ${ff.same})`
    + (ff.alive ? "" :
      `\n     🔴 유스에서 🦶가 **죽은 스위치**입니다 — 고르게 해놓고 효과가 0이에요 (원칙 ③)`
      + `\n     R: ${ff.fr.map(footKey).join(" | ")}`
      + `\n     L: ${ff.fl.map(footKey).join(" | ")}`));

  /* B-2 — 🦶·🫀가 **유스 입구를 통해 판에 실제로 넘어가나.**
   * 🔒 `W2Moment.play`를 **그 페이지 안에서** 감싸 `opts`를 그대로 받아 적습니다 —
   *    `playYouthMoment`가 `window.W2Moment`를 부를 때 읽으니 감싼 것이 걸려요.
   * 🔑 **화면을 안 읽습니다.** 화면 쪽은 B-1이 이미 보고 있고, 여기서 겨누는 것은
   *    *"입구가 값을 넘기나"*예요 — `foot`을 안 넘기면 판은 늘 "R"로 읽습니다. */
  const optsOf = async (o) => {
    const h = await toHome(boot({ seed: SEEDS[0], keys: o.keys }), { pos: "wg", foot: o.foot });
    await restUntilStage(h);
    const seenOpts = [];
    const M = h.W.W2Moment;
    const orig = M.play;
    M.play = function (container, opts, cb) { seenOpts.push(opts); return orig.call(M, container, opts, cb); };
    await playEval(h, "wg");
    const wide = M._t.wideOn();
    const mul = { one: M._t.winMul(80, 1), strong: M._t.winMul(80, M._t.K.STRONG) };
    h.close();
    return { seenOpts, wide, mul };
  };
  const oR = await optsOf({ foot: "R" });
  const oL = await optsOf({ foot: "L" });
  const gotFoot = oR.seenOpts.length > 0 && oL.seenOpts.length > 0
    && oR.seenOpts.every((x) => x.foot === "R") && oL.seenOpts.every((x) => x.foot === "L");
  const gotCond = oR.seenOpts.length > 0 && oR.seenOpts.every((x) => typeof x.condition === "number");
  const gotJudge = oR.seenOpts.length > 0 && oR.seenOpts.every((x) => typeof x.judge === "function");
  check(gotFoot && gotCond && gotJudge,
    `B-2. 🚪 **유스 입구가 🦶 주발 · 🫀 컨디션 · 판정을 판에 넘긴다** (판이 열린 횟수 R ${oR.seenOpts.length} · L ${oL.seenOpts.length})`
    + `\n     🦶 ${gotFoot ? "✔" : "✘"} (R판 ${oR.seenOpts.map((x) => x.foot).join(",")} · L판 ${oL.seenOpts.map((x) => x.foot).join(",")})`
    + ` · 🫀 ${gotCond ? `✔ ${oR.seenOpts.map((x) => x.condition).join(",")}` : "✘"} · ⚖️ judge ${gotJudge ? "✔" : "✘"}`
    + `\n     🔒 판이 **0번 열렸으면** 이 문장은 아무것도 안 지킵니다 — 그래서 횟수를 같이 찍어요`
    + `\n     👉 창이 그 값에 **실제로 반응하는지**는 \`moment-test.js\` B-1~B-5가 봅니다`);

  /* B-3 — ♿ 판정 확대가 **그 페이지 안에서** 켜지고 창이 ×1.30이 되나.
   * 🔒 `localStorage` 열쇠를 심고, 그 페이지가 실은 `W2Moment._t`에게 직접 물어봅니다 —
   *    다시 `loadMoment`로 부르면 **페이지가 아니라 새 인스턴스**를 재게 돼요. */
  const oW = await optsOf({ foot: "R", keys: { "grow-wide-judge": "1" } });
  const wr = oW.mul.one / oR.mul.one;
  const footRatio = oR.mul.strong / oR.mul.one;
  const WANT = 1 + FOOT_WIN;
  check(oR.wide === false && oW.wide === true && Math.abs(wr - WIDE) <= EPS_RATIO * WIDE
    && Math.abs(footRatio - WANT) <= EPS_RATIO * WANT,
    `B-3. ♿ **판정 창 확대를 켜면 유스 페이지에서도 ×${WIDE}** — 잰 값 ${wr.toFixed(4)}`
    + ` (wideOn 꺼짐 ${oR.wide === false ? "✔" : "✘"} · 켜짐 ${oW.wide === true ? "✔" : "✘"})`
    + `\n     🦶 같은 페이지에서 주발 배수 ×${footRatio.toFixed(4)} (기대 ${WANT})`
    + `\n     🔎 측정 조건 — **그 페이지의 \`W2Moment._t\`**에게 물었습니다`
    + ` (다시 불러오면 페이지가 아니라 새 인스턴스를 재게 돼요)`);
  base.B = { R, L };
}

async function runB_M2() {
  if (!mutOK("M2_NO_FOOT")) { check(false, `B-M2. 🧪 변이(🦶가 유스에 안 닿음)${MUT_DEAD}`); return; }
  const mk = async (foot) => { const h = await toHome(boot({ seed: SEEDS[0], foot, muts: MUT.M2_NO_FOOT }),
    { pos: "wg", foot }); await restUntilStage(h); const r = await playEval(h, "wg"); h.close(); return r; };
  const R = await mk("R"), L = await mk("L");
  const ff = footFlip(R, L);           // 🔒 B-1과 **같은 술어**
  check(!ff.alive && ff.fr.length > 0,
    `B-M2. 🧪 **변이 — 🦶 주발이 유스 판정 창에 안 닿게 하면 B-1이 갈린다**`
    + ` (뒤집힘 ${ff.flipped} · 그대로 ${ff.same} / ${ff.fr.length}장)`
    + (ff.alive
      ? `\n     🔴 변이를 넣었는데 B-1이 **아직 초록불** — B-1이 아무것도 안 지키고 있어요` : ""));
}

/* ══════════════════════════════════════════════════════════════
 * C. ⏳ **평가전이 턴을 안 먹는다**  🔴 M3이 겨누는 자리
 *
 * 이게 "36턴 성장 곡선(🇰🇷 32.3 → 48.5)을 구조적으로 안 건드렸다"의 근거예요
 * (engineer 80번 §5). 깨지면 **화면에 아무 증상 없이** 곡선이 움직입니다.
 *
 * 🔒 값이 아니라 관계로 씁니다 —
 *    · 3경기 내내 `S.year`·`S.month`·`S.stats`가 **한 글자도 안 바뀐다**
 *    · 🫀 컨디션은 **정확히 −5 × 경기 수**
 *    · 종합 순위 발표(`finishEval`)가 **딱 한 달**을 넘긴다
 * ══════════════════════════════════════════════════════════════ */
/* 🔒 C절의 계약도 술어로 떼어 둡니다 — 변이 검사가 **같은 자**를 쓰도록 */
const C_FROZEN = (r) => r.mid.concat([r.afterGames])
  .every((s) => s.y === r.before.y && s.m === r.before.m);
const C_ONE_MONTH = (r) => r.afterEval.y === r.before.y && r.afterEval.m === r.before.m + 1;

function checkC(r, tag) {
  const b = r.before, a = r.afterGames;
  const frozen = r.mid.concat([a]);
  const moved = frozen.filter((s) => s.y !== b.y || s.m !== b.m);
  check(C_FROZEN(r),
    `${tag}-1. ⏳ 평가전 ${GAMES_PER_EVAL}경기 내내 **턴이 안 흐른다** (${b.y}년차 ${b.m}월 고정)`
    + (moved.length ? `\n     🔴 흐른 자리: ${moved.map((s) => `${s.y}년차 ${s.m}월`).join(" → ")}`
      + `\n     평가전이 턴을 먹으면 36턴 성장 곡선이 조용히 움직입니다` : ""));
  const statMoved = frozen.filter((s) => s.stats !== b.stats);
  check(statMoved.length === 0,
    `${tag}-2. ⏳ 평가전이 **능력치를 한 글자도 안 건드린다** (평가전은 능력치를 안 씁니다)`
    + (statMoved.length ? `\n     🔴 ${b.stats}\n     → ${statMoved[0].stats}` : ""));
  check(a.cond === b.cond - COND_PER_GAME * GAMES_PER_EVAL,
    `${tag}-3. 🫀 컨디션이 **정확히 −${COND_PER_GAME} × ${GAMES_PER_EVAL}경기 = −${COND_PER_GAME * GAMES_PER_EVAL}**`
    + ` (${b.cond} → ${a.cond})`);
  check(a.stages === b.stages + GAMES_PER_EVAL && a.cards === b.cards + GAMES_PER_EVAL,
    `${tag}-4. ⚔️ 경기 수(${b.stages}→${a.stages}) · 순간 카드 수(${b.cards}→${a.cards})가 +${GAMES_PER_EVAL}`);
  const f = r.afterEval;
  check(C_ONE_MONTH(r),
    `${tag}-5. ⏳ 종합 순위 발표가 **딱 한 달**을 넘긴다 (${b.y}년차 ${b.m}월 → ${f.y}년차 ${f.m}월)`);
  check(f.screen === "screen-main",
    `${tag}-6. 🏠 훈련장으로 막다른 길 없이 돌아온다 (${f.screen})`);
}

async function runC_M3() {
  if (!mutOK("M3_EAT_TURN")) { check(false, `C-M3. 🧪 변이(평가전이 턴을 먹음)${MUT_DEAD}`); return; }
  const h = await toHome(boot({ seed: SEEDS[0], muts: MUT.M3_EAT_TURN }), { pos: "wg", foot: "R" });
  await restUntilStage(h);
  const r = await playEval(h, "wg");
  /* 🔒 기준선 C-1·C-5와 **같은 술어**를 그대로 다시 겁니다 */
  const frozen = C_FROZEN(r), oneMonth = C_ONE_MONTH(r);
  check(!frozen || !oneMonth,
    `C-M3. 🧪 **변이 — 평가전이 턴을 먹게 하면 갈린다**`
    + `\n     ${frozen ? "🟢" : "🔴"} C-1 3경기 내내 턴 고정 · ${oneMonth ? "🟢" : "🔴"} C-5 finishEval이 딱 한 달`
    + `\n     ${r.before.y}년차 ${r.before.m}월 → ${r.afterGames.y}년차 ${r.afterGames.m}월 → ${r.afterEval.y}년차 ${r.afterEval.m}월`
    + (frozen && oneMonth
      ? `\n     🔴 턴을 먹였는데 C절이 안 갈립니다 — **C절이 아무것도 안 지키고 있어요**` : ""));
  h.close();
}

/* ══════════════════════════════════════════════════════════════
 * D. 🗣️ **경기 성격과 카드 종류가 같은 말을 한다**
 *
 * 화면에 "2번째 경기 · 수비 조직"이라 적혀 있고 점수도 `defense`로 재는데
 * 손에 오는 게 ⚽ 슛이면 **화면이 스스로 어긋납니다.**
 *
 * 🔒 표는 **여기 박습니다**(STAGE_KIND · POS_KIND). `STAGE_TYPES`에서 읽어 오면
 *    kind를 통째로 뒤섞어도 검사가 따라가서 아무것도 안 잡혀요.
 * 🎲 시드 하나로 안 잽니다 — 시드 셋의 평가전을 모아 세 성격이 다 나오는지 봅니다.
 * ══════════════════════════════════════════════════════════════ */
async function runD() {
  const seen = new Map();
  const bad = [];
  const recs = [];
  let atkOK = 0, defOK = 0;      // 🔒 «몇 장을 실제로 쟀나» — 0이면 문장이 안 섭니다
  for (const seed of SEEDS) {
    const pos = { 11: "wg", 23: "mf", 37: "df" }[seed] || "wg";
    const h = await toHome(boot({ seed }), { pos, foot: "R" });
    await restUntilStage(h);
    const r = await playEval(h, pos);
    recs.push({ seed, pos, r });
    for (const c of r.cards) {
      const name = (c.round.split("·")[1] || "").trim();
      const want = STAGE_KIND[name] === null ? POS_KIND[pos] : STAGE_KIND[name];
      seen.set(name, (seen.get(name) || 0) + 1);
      if (want == null) { bad.push(`${c.round} — 표에 없는 경기 성격`); continue; }
      /* 🧱 **수비는 판을 안 엽니다**(c안) — `.w2m-stake`가 **비어 있는 게 계약**이에요.
       * 🚨 여기를 «모든 경기가 stake를 그린다»로 두면 c안이 빨간불이 됩니다 —
       *    「설계가 뒤집히면 검사가 옛 계약을 지킨다」의 그 자리예요.
       * 🔒 그래도 **조용히 넘기지 않습니다**: 비어 있어야 한다고 **단언**해요.
       *    안 그러면 판이 통째로 안 떠도 D-1이 초록불입니다. */
      if (want === DEFEND_KIND) {
        if (c.stake) bad.push(`${c.round} → 🧱 수비인데 화면이 열렸어요 "${c.stake.slice(0, 14)}"`);
        else defOK += 1;
        continue;
      }
      const emo = STAKE_EMOJI[want];
      if (!c.stake.startsWith(emo)) bad.push(`${c.round} → 기대 ${emo}, 화면 "${c.stake.slice(0, 14)}"`);
      else atkOK += 1;
    }
    h.close();
  }
  /* 🔒 **표본 바닥** — 공격 카드도 수비 카드도 **실제로 나와야** 이 문장이 뜻을 가집니다.
   *    시드 셋 × 3경기 = 9장에서 성격 넷이 다 나오니 각 1장은 넉넉한 바닥이에요. */
  check(bad.length === 0 && atkOK > 0 && defOK > 0,
    `D-1. 🗣️ 화면의 경기 성격과 .w2m-stake가 **같은 말을 한다** (${recs.length}판 × ${GAMES_PER_EVAL}경기)`
    + `\n     🔎 측정 조건 — 공격 ${atkOK}장(stake가 그 종류) · 🧱 수비 ${defOK}장(**판이 안 열림**) · 바닥 각 1`
    + (bad.length ? `\n     🔴 어긋난 것 ${bad.length}건: ${bad.slice(0, 4).join(" | ")}` : "")
    + (atkOK && defOK ? "" : `\n     🔴 한쪽 종류가 **한 장도 안 나왔습니다** — 그러면 이 문장은 아무것도 안 지켜요`));
  /* 📊 시드가 실제로 뭘 뽑았는지는 **정보로만** 남깁니다 — 판정은 D-2가 합니다.
   *    (여기서 판정하면 난수 흐름이 한 칸만 밀려도 빨간불이 돼요. 아래 D-2 주석 참고) */
  console.log(`     📊 이 시드들이 뽑은 성격: ${Array.from(seen.entries()).map(([k, v]) => `${k}×${v}`).join(" · ")}`);
  base.D = recs;
  base.Dseen = seen;
}

/* ══════════════════════════════════════════════════════════════
 * D-2. ⚔️ **경기 성격 셋이 전부 뽑힌다** — 🎲 뽑기를 검사가 직접 겨눕니다
 *
 * 🔴 **2026-08-31에 다시 겨눴습니다. 그 전에는 "운"을 재고 있었어요.**
 *
 * 옛 D-2는 시드 3판(자유 추첨 **6번**)에서 셋이 다 나오는지를 셌습니다.
 * `3·(2/3)⁶ − 3·(1/3)⁶ ≈ 26%` — **네 번에 한 번은 그냥 빨간불**입니다.
 * 실제로 🏘️ 동네가 들어오면서 `rollOffers`가 유스마다 `Math.random()`을 5회 쓰자
 * 난수 흐름이 밀렸고, **경기 성격 코드는 한 글자도 안 바뀌었는데** 빨간불이 됐어요.
 *
 * 🚨 그리고 그게 **남의 변이 신호까지 먹었습니다.** engineer가 동네를 되돌린
 *    여섯 변이가 전부 「잡힘」으로 보였는데, 사실은 전부 이 D-2 하나를 다시 빨간불로
 *    만들고 있었을 뿐이었어요 (`91_engineer_hometown.md` §5).
 *    **이미 빨간불인 검사는 그 옆의 진짜 실패를 안 보이게 만듭니다.**
 *
 * 🔧 그래서 **운을 재지 않고 뽑기를 직접 겨눕니다.**
 *    `pick(arr)`은 `arr[Math.floor(Math.random() * arr.length)]`이에요. 그러니
 *    **클릭 핸들러가 도는 동안만** `Math.random`을 상수 c로 고정하면,
 *    그게 **몇 번째 난수든** `pick([0,1,2])`는 언제나 `floor(c·3)`번 칸을 집습니다.
 *    → c = 0.10 / 0.50 / 0.90 이 각각 0 / 1 / 2번 칸이에요.
 *    🔑 **난수 소비량에 안 흔들립니다.** 앞으로 누가 난수를 몇 개 더 쓰든 그대로예요.
 *
 * 🔒 지키는 것
 *   · **게임 입구를 통해** 갑니다 — 타이틀부터 눌러 🏆 대회 출전까지 걸어가요
 *   · 고정은 **그 한 번의 클릭 동안만**입니다. 누른 직후 원래 난수로 되돌려요
 *   · 기대하는 성격 셋(`공격 전개 · 중원 장악 · 수비 조직`)은 **여기 박습니다**
 *     — `STAGE_TYPES`에서 읽어 오면 표를 통째로 갈아도 검사가 따라갑니다
 *   · c와 칸의 **짝은 안 박습니다.** 표 순서가 바뀌어도 계약은 "셋이 다 나온다"예요
 * ══════════════════════════════════════════════════════════════ */
const DRAW_C = [0.10, 0.50, 0.90];              // 🎲 pick([0,1,2])의 0 / 1 / 2번 칸
const NEED_TYPES = ["공격 전개", "중원 장악", "수비 조직"];   // 🔒 여기 박습니다

/* 🎲 그 경기의 성격을 **강제로** 한 번 뽑아 화면에서 읽어 옵니다.
 * ⚠️ 경기는 안 칩니다 — `stage-round`는 `playEvalStage`가 그 자리에서 적어요.
 *    (미니게임을 굴리지 않으니 판마다 1초도 안 걸립니다) */
async function drawStageType(seed, pos, c, muts) {
  const h = await toHome(boot({ seed, muts }), { pos, foot: "R" });
  const ok = await restUntilStage(h);
  if (!ok) { h.close(); return { name: "(대회 버튼이 안 열렸어요)", ok: false }; }
  h.press(h.D.querySelector(".go-game"), "🏆 대회 출전");
  await wait(5);
  const real = h.W.Math.random;
  h.W.Math.random = () => c;                    // 🔒 이 한 번의 클릭 동안만
  h.press(h.D.getElementById("btn-stage-next"), "첫 경기 출전");
  h.W.Math.random = real;
  const round = (h.D.getElementById("stage-round") || {}).textContent || "";
  h.close();
  return { name: (round.split("·")[1] || "").trim(), round, ok: true };
}

async function runD2(muts) {
  const out = [];
  for (const c of DRAW_C) out.push({ c, ...(await drawStageType(SEEDS[0], "wg", c, muts)) });
  return out;
}

async function runD2Base() {
  const got = await runD2(null);
  const names = got.map((g) => g.name);
  const uniq = new Set(names);
  const miss = NEED_TYPES.filter((n) => !uniq.has(n));
  check(miss.length === 0 && uniq.size === NEED_TYPES.length,
    `D-2. ⚔️ 🎲 뽑기를 0/1/2번 칸으로 **강제**하면 경기 성격 **셋이 다** 나온다`
    + `\n     ${got.map((g) => `c=${g.c.toFixed(2)} → ${g.name || "(빈칸)"}`).join(" · ")}`
    + `\n     🔑 난수 소비량에 안 흔들려요 — 옛 D-2는 자유 추첨 6번의 운을 재느라 26% 확률로 헛빨간불이었습니다`
    + (miss.length ? `\n     🔴 안 나온 것: ${miss.join(", ")} — 뽑기 풀이 좁아졌나요?` : "")
    + (uniq.size === NEED_TYPES.length ? "" : `\n     🔴 서로 다른 성격이 ${uniq.size}종뿐이에요 (계약은 ${NEED_TYPES.length}종)`));
}

/* 🧪 M4 — 뽑기 풀을 한 칸으로 줄입니다. 세 c가 전부 같은 성격을 내야 해요. */
async function runD_M4() {
  if (!mutOK("M4_ONE_TYPE")) { check(false, `D-M4. 🧪 변이(경기 성격 뽑기 풀을 1종으로)${MUT_DEAD}`); return; }
  const got = await runD2(MUT.M4_ONE_TYPE);
  const uniq = new Set(got.map((g) => g.name));
  check(uniq.size < NEED_TYPES.length,
    `D-M4. 🧪 **변이 — 경기 성격 뽑기 풀을 \`pick([0])\` 한 칸으로** → D-2가 빨간불`
    + `\n     ${got.map((g) => `c=${g.c.toFixed(2)} → ${g.name}`).join(" · ")} (서로 다른 성격 ${uniq.size}종)`
    + (uniq.size < NEED_TYPES.length ? "" : `\n     🔴 풀을 줄였는데 아직 ${uniq.size}종이 나와요 — D-2가 뽑기를 안 겨누고 있습니다`));
}

/* ══════════════════════════════════════════════════════════════
 * F. 🏆 **컵 · 🌍 월드컵은 안 바뀌었다** (회귀 방지)
 *
 * `MatchSim.run`에 `playMoment`를 **안 넘기면 v1 승부처 그대로**라는 게 계약이에요
 * (engineer 80번 §1 ④). 여기가 깨지면 컵·월드컵 승부처가 조용히 갈아 끼워집니다.
 *
 * ⚠️ 컵·월드컵을 게임 입구로 걸어가려면 프로 커리어까지 가야 해서,
 *    **모듈 경계(`MatchSim.run`)에서 재는 것**을 명시적으로 고릅니다 — 계약이 거기 있어요.
 * ══════════════════════════════════════════════════════════════ */
async function runF() {
  const fs = require("fs");
  const path = require("path");
  const DIR = "/workspace/grow-games/beta/winger2";
  /* ① 부르는 쪽 — 유스(game.js)만 넘기고 career.js·worldcup.js는 안 넘겨야 합니다 */
  const callers = ["career.js", "worldcup.js", "cup.js"].filter((f) => fs.existsSync(path.join(DIR, f)));
  const leaked = callers.filter((f) => /playMoment\s*:/.test(fs.readFileSync(path.join(DIR, f), "utf8")));
  check(leaked.length === 0,
    `F-1. 🏆 컵·🌍 월드컵 쪽(${callers.join(", ")})이 playMoment를 **안 넘긴다**`
    + (leaked.length ? `\n     🔴 넘기는 파일: ${leaked.join(", ")} — 그쪽 승부처가 조용히 갈아 끼워졌어요` : ""));

  /* ② 안 넘겼을 때 실제로 v1이 뜨는가 — 진짜 MatchSim을 부릅니다 */
  const h = await toHome(boot({ seed: SEEDS[0] }), { pos: "wg", foot: "R" });
  const D = h.D;
  const MS = h.W.__get("MatchSim");
  await new Promise((res) => {
    MS.run({ home: "우리", away: "상대", myName: "나", goals: 1, assists: 0, defense: 2,
      oppGoals: 1, rating: 6.5, mateCount: 1,
      finalize: () => { res(); return { resultHTML: "", nextLabel: "확인", nextFn: () => {} }; } });
    (async () => {
      const sm = () => D.getElementById("stage-moment");
      for (let i = 0; i < 900; i++) {
        await wait(3);
        if (sm() && sm().querySelector(".tm-box")) break;
      }
      res();
    })();
  });
  const sm = D.getElementById("stage-moment");
  const boxes = sm ? Array.from(sm.querySelectorAll(".tm-box")).map((b) => b.className) : [];
  const v2 = boxes.filter((c) => /\bw2m-/.test(c));
  check(boxes.length > 0 && v2.length === 0,
    `F-2. 🏆 MatchSim.run에 playMoment를 **안 넘기면 v1 승부처(timing.js)가 뜬다**`
    + `\n     상자: ${boxes.join(" | ") || "(하나도 안 떴어요)"}`
    + (v2.length ? `\n     🔴 v2가 떴어요 — 컵·월드컵이 같이 갈아 끼워집니다` : ""));
  check(!(sm && sm.classList.contains("w2m-youth")),
    `F-3. 🏆 그 자리에 **.w2m-youth가 안 붙는다** (유스 맥락 전용 클래스예요)`);
  h.close();
}

/* ══════════════════════════════════════════════════════════════ */
(async () => {
  await runA();
  checkC(base.r, "C");
  await runD();
  await runD2Base();
  await runB();
  await runF();
  /* 🔴 **변이 검증 전에 기준선이 초록불인지 먼저 봅니다.**
   *    이미 빨간불인 검사는 **남의 변이 신호까지 통째로 먹어요** — 실제로
   *    engineer의 동네 여섯 변이가 전부 「잡힘」으로 보였는데, 사실은 전부
   *    D-2 하나를 다시 빨간불로 만들고 있었을 뿐이었습니다 (91번 §5). */
  console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
  if (fail) {
    console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);
    console.log(`      먼저 위 ❌를 없앤 다음 변이 결과를 믿으세요.`);
  } else {
    console.log(`   ✔ 기준선(무변이) 전부 초록불 — 아래 빨간불은 **변이가 만든 것**이 맞습니다.`);
  }
  await runA_M1();
  await runA_M5();
  await runB_M2();
  await runC_M3();
  await runD_M4();
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
