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
 *   ④ **시드 하나로 안 잽니다** — D절은 시드 여럿의 평가전을 모아 봅니다
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인합니다 (안 걸리면 ❌ 한 줄,
 *      죽지 않아요)
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 * ⏱️ 약 60초.
 */
"use strict";
const { bootPage, pageMutsOK } = require("./_load.js");

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
/* v2 순간 카드 4종의 상자 클래스 — 이 넷이 아니면 v2가 아니에요 */
const V2_BOX = ["w2m-cutin", "w2m-oneone", "w2m-killpass", "w2m-block"];

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
};

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

/* 🚪 타이틀 → ✏️ 이름·🦶 주발 → 🏟️ 유스 → 🎯 포지션 → 🧬 조립대 → 🏠 훈련장 */
function toHome(h, o) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  if (o.foot === "L") h.press(h.D.querySelector('#screen-name .foot-opt[data-foot="L"]'), "🦶 왼발");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  h.press(h.D.querySelector("#agency-list button"), "🏟️ 유스");
  h.press(h.D.querySelector(`#position-list .card[data-pos="${o.pos}"]`), `🎯 ${o.pos}`);
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
async function playEval(h) {
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
      const btn = sm() && sm().querySelector(
        ".w2m-side:not([disabled]), .w2m-run-btn:not([disabled]), .w2m-dir:not([disabled]), .w2m-goal, .tm-btn:not(.w2m-go)");
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
const A_PRED = [
  ["A-2 #stage-moment에 .w2m-youth", (r) => r.cards.every((c) => /\bw2m-youth\b/.test(c.hostCls))],
  ["A-3 v2 준비 화면 .w2m-ready", (r) => r.cards.every((c) => c.ready)],
  ["A-4 v1 timing.js 상자 없음", (r) => r.cards.every((c) => c.v1Boxes.length === 0)],
  ["A-5 v2 4종 상자", (r) => r.cards.every((c) => V2_BOX.indexOf(c.box) >= 0)],
];

async function runA() {
  const h = toHome(boot({ seed: SEEDS[0] }), { pos: "wg", foot: "R" });
  const ok = await restUntilStage(h);
  check(ok && h.active() === "screen-main",
    `A-1. 🚪 게임 입구 → 🏠 훈련장 6턴 → 🏆 **1년차 6월 평가전 버튼이 열린다** (${h.active()})`
    + (ok ? "" : " — .go-game이 안 떴어요"));
  const r = await playEval(h);
  base.r = r;
  base.errs = h.W.__errs.slice();

  check(A_PRED[0][1](r),
    `A-2. ⚔️ 세 경기 모두 #stage-moment에 **.w2m-youth**가 붙는다 (유스 맥락 — playYouthMoment만 붙여요)`
    + `\n     ${r.cards.map((c) => c.hostCls).join(" | ")}`);
  check(A_PRED[1][1](r),
    `A-3. ⚔️ 세 경기 모두 v2 **준비 화면(.w2m-ready)**이 뜬다`
    + `\n     ${r.cards.map((c) => (c.ready ? "✔" : "✘") + " " + c.round).join(" | ")}`);
  const v1 = r.cards.filter((c) => c.v1Boxes.length);
  check(A_PRED[2][1](r),
    `A-4. 🔴 v1 승부처(**timing.js 8종**) 상자가 **한 장도 없다**`
    + (v1.length
      ? `\n     🔴 v1으로 되돌아갔어요: ${v1.map((c) => `${c.round} → ${c.v1Boxes.join(",")}`).join(" | ")}`
        + `\n     playMoment를 안 넘기면 MatchSim이 playRandomMini로 떨어집니다`
      : ""));
  check(A_PRED[3][1](r),
    `A-5. ⚔️ ▶️ 시작을 누르면 **v2 4종 중 하나**가 열린다 (${r.cards.map((c) => c.box).join(" · ")})`
    + `\n     허용: ${V2_BOX.join(" · ")}`);
  check(base.errs.length === 0,
    `A-6. 평가전 3경기 동안 자바스크립트 오류가 없다${base.errs.length ? ` — ${base.errs[0]}` : ""}`);
  h.close();
}

async function runA_M1() {
  if (!mutOK("M1_NO_MOMENT")) { check(false, `A-M1. 🧪 변이(v1 승부처로 복귀)${MUT_DEAD}`); return; }
  const h = toHome(boot({ seed: SEEDS[0], muts: MUT.M1_NO_MOMENT }), { pos: "wg", foot: "R" });
  await restUntilStage(h);
  const r = await playEval(h);
  const flip = A_PRED.map(([n, f]) => [n, f(r)]);
  const still = flip.filter(([, v]) => v);
  check(still.length === 0,
    `A-M1. 🧪 **변이 — playMoment: playYouthMoment 제거(= v1 승부처로 복귀)** → A절 술어 ${flip.length}개가 전부 빨간불`
    + `\n     ${flip.map(([n, v]) => `${v ? "🟢" : "🔴"} ${n}`).join(" · ")}`
    + (still.length
      ? `\n     🔴 되돌렸는데 **아직 초록불인 술어가 ${still.length}개** — 그건 아무것도 안 지키고 있어요`
      : ""));
  h.close();
}

/* ══════════════════════════════════════════════════════════════
 * B. 🦶 **주발이 유스에서 판정 창을 바꾼다** · ♿ 판정 확대  🔴 M2가 겨누는 자리
 *
 * 🔴 2026-08-30 전에는 **죽은 스위치**였어요 — 입단 전에 고르게 해놓고
 *    36턴 내내 효과가 0이었습니다(designer 원칙 ③ 위반). 그래서 검사가 아예 없었어요.
 *
 * 🔒 **값이 아니라 관계로 봅니다.**
 *    · B-1 같은 시드에서 🦶만 뒤집으면 `w2m-strong` 레인이 **반대로 간다**
 *    · B-2 강/약 판정 창의 **비**가 1.25 / 0.75  (🫀 컨디션은 양쪽에 똑같이 걸려 약분돼요)
 *    · B-3 ♿를 켜면 창이 **×1.30**  (같은 카드끼리의 비라 다른 게 다 약분됩니다)
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
  const R = await (async () => { const h = toHome(boot({ seed: SEEDS[0] }), { pos: "wg", foot: "R" });
    await restUntilStage(h); const r = await playEval(h); h.close(); return r; })();
  const L = await (async () => { const h = toHome(boot({ seed: SEEDS[0] }), { pos: "wg", foot: "L" });
    await restUntilStage(h); const r = await playEval(h); h.close(); return r; })();

  /* 같은 시드면 **같은 카드가 같은 순서로** 와야 해요 — 안 그러면 A/B가 성립 안 합니다 */
  const sameCards = R.cards.map((c) => c.box).join(",") === L.cards.map((c) => c.box).join(",");
  check(sameCards,
    `B-0. 🎲 같은 시드에서 🦶만 뒤집으면 **카드 순서가 같다** (A/B가 성립하는 조건)`
    + `\n     R: ${R.cards.map((c) => c.box).join(",")}   L: ${L.cards.map((c) => c.box).join(",")}`);

  const ff = footFlip(R, L);
  check(ff.fr.length > 0,
    `B-1a. 🦶 주발이 걸리는 카드(💨 컷인 · ⚡ 1:1)가 평가전에 나온다 (${ff.fr.length}/${R.cards.length}장)`);
  /* 🦶 뒤집으면 강한 쪽 레인이 반대로 — `w2m-strong`이 붙은 자리가 정확히 뒤바뀝니다 */
  check(ff.alive,
    `B-1. 🦶 **주발을 뒤집으면 w2m-strong 레인이 반대로 간다** (뒤집힘 ${ff.flipped} · 그대로 ${ff.same})`
    + (ff.alive ? "" :
      `\n     🔴 유스에서 🦶가 **죽은 스위치**입니다 — 고르게 해놓고 효과가 0이에요 (원칙 ③)`
      + `\n     R: ${ff.fr.map(footKey).join(" | ")}`
      + `\n     L: ${ff.fl.map(footKey).join(" | ")}`));

  /* B-2 — 강/약 판정 창의 비. 🫀 컨디션은 양쪽에 똑같이 곱해져 약분됩니다 */
  const gated = R.cards.filter((c) => c.gates.length === 2);
  const ratios = gated.map((c) => {
    const s = c.gates.find((g) => g.strong), w = c.gates.find((g) => !g.strong);
    return s && w ? s.w / w.w : NaN;
  });
  const WANT = (1 + FOOT_WIN) / (1 - FOOT_WIN);
  check(ratios.length > 0 && ratios.every((v) => Math.abs(v - WANT) <= EPS_RATIO * WANT),
    `B-2. 🦶 화면에 그려진 **강/약 판정 창의 비 = ${WANT.toFixed(4)}** (±25%)`
    + ` — 잰 값 ${ratios.map((v) => v.toFixed(4)).join(", ") || "(컷인 카드가 안 나왔어요)"}`);

  /* B-3 — ♿ 판정 확대. 같은 시드·같은 카드끼리 폭의 비만 봅니다 */
  const Wd = await (async () => { const h = toHome(boot({ seed: SEEDS[0], keys: { "grow-wide-judge": "1" } }),
    { pos: "wg", foot: "R" }); await restUntilStage(h); const r = await playEval(h); h.close(); return r; })();
  const wg0 = R.cards.filter((c) => c.gates.length === 2);
  const wg1 = Wd.cards.filter((c) => c.gates.length === 2);
  const wr = [];
  for (let i = 0; i < Math.min(wg0.length, wg1.length); i++) {
    for (let k = 0; k < 2; k++) wr.push(wg1[i].gates[k].w / wg0[i].gates[k].w);
  }
  check(wr.length > 0 && wr.every((v) => Math.abs(v - WIDE) <= EPS_RATIO * WIDE),
    `B-3. ♿ **판정 창 확대를 켜면 유스에서도 ×${WIDE}** — 잰 값 ${wr.map((v) => v.toFixed(4)).join(", ") || "(컷인 카드가 안 나왔어요)"}`);
  base.B = { R, L };
}

async function runB_M2() {
  if (!mutOK("M2_NO_FOOT")) { check(false, `B-M2. 🧪 변이(🦶가 유스에 안 닿음)${MUT_DEAD}`); return; }
  const mk = async (foot) => { const h = toHome(boot({ seed: SEEDS[0], foot, muts: MUT.M2_NO_FOOT }),
    { pos: "wg", foot }); await restUntilStage(h); const r = await playEval(h); h.close(); return r; };
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
  const h = toHome(boot({ seed: SEEDS[0], muts: MUT.M3_EAT_TURN }), { pos: "wg", foot: "R" });
  await restUntilStage(h);
  const r = await playEval(h);
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
  for (const seed of SEEDS) {
    const pos = { 11: "wg", 23: "mf", 37: "df" }[seed] || "wg";
    const h = toHome(boot({ seed }), { pos, foot: "R" });
    await restUntilStage(h);
    const r = await playEval(h);
    recs.push({ seed, pos, r });
    for (const c of r.cards) {
      const name = (c.round.split("·")[1] || "").trim();
      const want = STAGE_KIND[name] === null ? POS_KIND[pos] : STAGE_KIND[name];
      seen.set(name, (seen.get(name) || 0) + 1);
      if (want == null) { bad.push(`${c.round} — 표에 없는 경기 성격`); continue; }
      const emo = STAKE_EMOJI[want];
      if (!c.stake.startsWith(emo)) bad.push(`${c.round} → 기대 ${emo}, 화면 "${c.stake.slice(0, 14)}"`);
    }
    h.close();
  }
  check(bad.length === 0,
    `D-1. 🗣️ 화면의 경기 성격과 .w2m-stake가 **같은 말을 한다** (${recs.length}판 × ${GAMES_PER_EVAL}경기)`
    + (bad.length ? `\n     🔴 어긋난 것 ${bad.length}건: ${bad.slice(0, 4).join(" | ")}` : ""));
  /* ⚔️ "포지션과 무관하게 4종이 전부 유스에 나온다"의 앞자리 — 성격 셋이 다 나오나 */
  const kinds = new Set(Array.from(seen.keys()));
  const need = ["공격 전개", "중원 장악", "수비 조직"];
  const miss = need.filter((k) => !kinds.has(k));
  check(miss.length === 0,
    `D-2. ⚔️ 시드 ${SEEDS.length}판에서 경기 성격 셋이 다 나온다`
    + `\n     ${Array.from(seen.entries()).map(([k, v]) => `${k}×${v}`).join(" · ")}`
    + (miss.length ? `\n     🚧 안 나온 것: ${miss.join(", ")} — 시드를 늘려 다시 보세요` : ""));
  base.D = recs;
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
  const h = toHome(boot({ seed: SEEDS[0] }), { pos: "wg", foot: "R" });
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
  await runB();
  await runF();
  console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
  await runA_M1();
  await runB_M2();
  await runC_M3();
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
