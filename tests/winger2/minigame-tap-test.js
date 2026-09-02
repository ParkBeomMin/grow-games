/* ⚽ 더 윙어 II — 🖱️ **미니게임 이중 탭** (`beta/winger-moment.js`)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **2026-09-02 — 판이 넷에서 하나가 됐습니다**(116번). 이 파일도 따라 줄었어요
 * ─────────────────────────────────────────────────────────────────────────
 * 🏃 컷인 · 🎯 킬패스 · 🧱 차단이 **형태째** 사라졌습니다. 그래서 지웠어요:
 *   · **B절 통째로** — 🧱 1단계 방향 버튼 → 2단계 🛡️ 막기의 `gate2`.
 *     2단 국면이 없으니 **둘째 gate 자리 자체가 없습니다.** `MUT.GATE2`도 같이 지웠어요
 *   · `GAMES` 표의 🏃 `.w2m-side` · 🎯 `.w2m-run-btn` · 🧱 `.w2m-dir` 세 줄
 *   · `leaked()`의 🧱 갈래(`.w2m-block2`) — 이제 증상은 `.w2m-hit` 하나예요
 * 🚨 **되살리지 마세요.** 같은 2단 국면을 다른 이름으로 되살리면 이 검사가 옛 계약을
 *    지키게 됩니다 — 「폐기는 이름이 아니라 형태」의 그 자리예요.
 *
 * ✅ **살아남은 것 — `ready()`의 `gate`.** 여기가 이 파일의 존재 이유입니다.
 *    판이 하나가 돼도 **준비 화면 ▶️ 시작 → 본 게임**이라는 두 층은 그대로예요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚨 **이 검사가 재현하는 것 — 브라우저의 `click` 재타겟**
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 실기기는 한 번 누르면 `pointerdown` → `pointerup` → `click` **셋**이 옵니다.
 * 🔴 그런데 **개수만 맞추면 안 잡히는 자리**가 있어요:
 *
 *   `pointerdown`이 화면을 갈아치우면, 손 뗄 때 오는 `click`은 **옛 버튼이 아니라
 *   「그 지점에 지금 있는 새 요소」**에게 갑니다. 그 새 요소의 `lastPointer`는
 *   초기값이라 `TAP_ECHO`(같은 요소 안의 메아리 차단)에 **안 걸려요.**
 *   → **한 번 눌렀는데 판이 열리자마자 s ≈ 0으로 끝납니다.**
 *
 * 🔴 이 저장소의 기존 `press()`들은 세 이벤트를 **같은 요소**에 보내서
 *    이 경로를 **아예 재현 못 합니다.** 개수는 맞는데 **자리**가 틀린 거예요.
 *    (engineer가 106번 §4에서 두 번 걸린 자리입니다.)
 *
 * 🔒 그리고 **판정 여부를 `cb`로 재면 안 됩니다** — `ender`가 **620ms 뒤에** 부르니
 *    그 시점엔 **변이해도 언제나 0회**라 초록불이에요. `.w2m-hit`으로 봅니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 **「아무 일도 안 일어났다」를 통과로 세지 않습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 이중 탭 검사는 *"안 먹혀야 한다"*를 재는 검사라, **게임이 통째로 죽어 있어도 통과**해요.
 * 그래서 판마다 셋을 나란히 확인합니다:
 *   ① 재타겟할 새 요소가 **실제로 생겼는가** (없으면 던집니다 — 조용히 넘어가지 않아요)
 *   ② 그 재타겟 `click`이 **안 먹혔는가**
 *   ③ 🔑 **그 다음 진짜 탭은 먹히는가** — ③이 없으면 ②는 아무것도 안 지킵니다
 *
 * ┌ 「이 검사가 서 있는 세계」 ─────────────────────────────────────────
 * │ **판이 `ready()` 준비 화면을 지나 열리는 세계**의 계약입니다.
 * │ 🔴 준비 화면을 없애는 판정이 나오면 이 파일이 통째로 옛 계약이 돼요 —
 * │    그때는 값을 고치지 말고 **여기부터 여세요.**
 * │ 🧱 수비는 **판을 아예 안 엽니다**(`play()`가 `s = 0.5`로 되돌려요) — 준비 화면도
 * │    본 게임도 없으니 **이중 탭이라는 개념이 없습니다.** 그래서 `GAMES`에 없어요.
 * │    그 가드 자체는 `one-grid-test.js`가 지킵니다.
 * └────────────────────────────────────────────────────────────────
 *
 * ⏱️ 1초 안에 끝나요.
 */
"use strict";
const { momentMutsOK, momentDom, pressDom, pressRetarget } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const MUT = {
  /* ⓐ 준비 화면 → 본 게임의 gate 제거 — **배역 둘 다** 이중 탭이 납니다 */
  READYGATE: [[/      gate\.shut = !!viaPointer;\n      wrap\.remove\(\);/,
    "      gate.shut = false;\n      wrap.remove();"]],
};

{
  const bad = momentMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, m) => a + m.length, 0);
  check(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 beta/winger-moment.js에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다**`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}

/* 🎮 **판은 하나(`runShotGrid`), 배역은 둘**이에요 — 낱말만 갈리고 화면 문법은 같습니다.
 * 🔴 이 표가 곧 「준비 화면 버튼이 사라지고 그 자리에 생기는 것」이에요.
 *    🔑 탭을 받는 자리는 `.w2m-goal` **하나**입니다(칸마다 달면 여섯 군데가 돼요) —
 *       그래서 재타겟 `click`이 가는 곳도 `.w2m-goal`입니다. */
const GAMES = [
  { n: "⚽ 결정 — 🥅 골문 6칸", sel: ".w2m-goal", kind: "goal" },
  { n: "🅰️ 전개 — ⚡ 컷백 연결", sel: ".w2m-goal", kind: "assist" },
];

/* 🔒 「먹혔다」의 증상은 **`.w2m-hit`** 하나예요 (`cb`는 620ms 뒤라 못 봅니다) */
const leaked = (host) => !!host.querySelector(".w2m-hit");

function open(W, kind) {
  const D = W.document;
  const host = D.createElement("div");
  D.body.appendChild(host);
  const seen = { cb: 0 };
  W.W2Moment.play(host, { moment: "oneone", kind, condition: 80, foot: "R" }, () => { seen.cb += 1; });
  return { host, seen };
}

(async () => {
  /* ══════════════════════════════════════════════════════════════
   * A. 🖱️ 준비 화면 ▶️ 시작 → 본 게임 — **배역 둘 다**
   * ══════════════════════════════════════════════════════════════ */
  {
    const W = momentDom();
    const rows = [];
    /* 📊 **셀렉터마다 탭 횟수를 셉니다.** 0이면 그 자리는 통째로 안 재진 거예요 —
     *    "도달했다"만 재는 검사가 **아무것도 안 눌러도 통과**하던 자리입니다. */
    const taps = {};
    for (const g of GAMES) {
      const { host, seen } = open(W, g.kind);
      const go = host.querySelector(".w2m-go");
      if (!go) { rows.push({ g, bad: true, live: false, cb: 0, why: "준비 화면 없음" }); continue; }
      /* ① 재타겟할 새 요소가 실제로 생기나 — 없으면 pressRetarget이 던집니다 */
      pressRetarget(W, go, host, g.sel);
      taps[g.kind] = (taps[g.kind] || 0) + 1;
      await wait(40);
      /* ② 그 click이 안 먹혔나 */
      const bad = leaked(host);
      /* ③ 🔑 그 다음 진짜 탭은 먹히나 — 이게 없으면 ②는 아무것도 안 지킵니다.
       *    🔑 **사람이 실제로 누르는 것은 칸**이에요 — 골문이 아니라 `.w2m-cell`을 누릅니다
       *       (칸에서 올라온 이벤트가 `.w2m-goal`의 손잡이에 닿아야 배선이 산 거예요). */
      const cell = host.querySelector(".w2m-cell");
      let live = false;
      if (cell) {
        pressDom(W, cell);
        taps[g.kind] += 1;
        await wait(40);
        live = leaked(host);
      }
      rows.push({ g, bad, live, cb: seen.cb, cells: host.querySelectorAll(".w2m-cell").length });
    }
    const nBad = rows.filter((r) => r.bad).map((r) => r.g.n);
    const nDead = rows.filter((r) => !r.live).map((r) => r.g.n);
    check(nBad.length === 0,
      `A-1. 🖱️ **▶️ 시작에서 손 뗀 click이 골문으로 가도 안 먹힌다** — 배역 둘 다`
      + (nBad.length ? `\n     🔴 새어 나간 것: ${nBad.join(" · ")} — 판이 열리자마자 s ≈ 0으로 끝납니다` : ""));
    check(nDead.length === 0,
      `A-2. 🔑 **그 다음 진짜 탭(칸)은 먹힌다** — 배역 둘 다 (이게 없으면 A-1은 "게임이 죽어 있어도 통과"예요)`
      + (nDead.length ? `\n     🔴 안 먹힌 것: ${nDead.join(" · ")}` : ""));
    /* 🔒 **판이 진짜로 떴는지**도 같이 셉니다 — 칸이 0개인 빈 화면 위에서 A-1이
     *    조용히 통과하는 길을 막아요(«아무 일도 안 일어났다»가 통과가 되는 자리). */
    const noCells = rows.filter((r) => !(r.cells === 6)).map((r) => `${r.g.n}: ${r.cells}칸`);
    check(noCells.length === 0,
      `A-2a. 🔎 측정 조건 — 판이 실제로 떴다 (배역마다 골문 **6칸**)`
      + (noCells.length ? `\n     🔴 ${noCells.join(" · ")} — 빈 화면 위에서는 A-1이 아무것도 안 지켜요` : ""));
    const zero = Object.entries(taps).filter(([, n]) => !(n > 0)).map(([s]) => s);
    check(Object.keys(taps).length === GAMES.length && zero.length === 0,
      `A-3. 📊 **배역마다 탭 횟수 > 0** — `
      + Object.entries(taps).map(([s, n]) => `${s} ${n}회`).join(" · ")
      + (zero.length ? `\n     🔴 한 번도 안 눌린 것: ${zero.join(" · ")}` : ""));
  }

  /* 🧪 변이 ⓐ — 준비 화면 gate를 없애면 **배역 둘 다** 새어 나가야 합니다 */
  {
    const W = momentDom(MUT.READYGATE);
    const out = [];
    for (const g of GAMES) {
      const { host } = open(W, g.kind);
      pressRetarget(W, host.querySelector(".w2m-go"), host, g.sel);
      await wait(40);
      out.push([g.n, leaked(host)]);
    }
    const caught = out.filter(([, b]) => b).map(([n]) => n);
    check(caught.length === GAMES.length,
      `A-변이. 🔴 준비 화면 gate를 없애면 → 빨간불 · **배역 둘 다** (${caught.length}/${GAMES.length})`
      + (caught.length === GAMES.length ? ` — ${caught.join(" · ")}`
        : `\n     🔴 **안 잡힌 것: ${out.filter(([, b]) => !b).map(([n]) => n).join(" · ")}**`
          + ` — 그 배역은 지금 이 검사가 안 지키고 있습니다`));
  }

  /* ══════════════════════════════════════════════════════════════
   * B. 🖱️ **같은 요소에 세 이벤트가 다 와도 한 번만** 먹힌다
   *
   * ⚠️ **이건 `TAP_ECHO`를 재는 검사가 아닙니다.** 재 봤더니 `TAP_ECHO = 0`으로 바꿔도
   *    아무 증상이 안 났어요 — 판이 **자기 멱등 깃발**(`ctx.done`)을 들고 있어서
   *    그쪽이 먼저 막습니다. 그래서 `TAP_ECHO` 변이는 **표에 안 넣었습니다** —
   *    안 잡히는 변이를 표에 두면 "돌고 있다"고 착각하게 돼요.
   * 🔑 여기서 지키는 건 **겹쳐 쌓인 결과**입니다: 어느 층이 막든 **한 번만** 먹혀야 한다.
   *    (`TAP_ECHO` 자체의 값어치는 지금 이 경로로는 **검증 불가**입니다 — 보고서에 적었어요.)
   *
   * 🔴 옛 B절(🧱 1단계 → 2단계 `gate2`)은 **2단 국면과 함께 지웠습니다.**
   * ══════════════════════════════════════════════════════════════ */
  {
    const W = momentDom();
    const { host, seen } = open(W, "goal");
    pressDom(W, host.querySelector(".w2m-go"));            // pointerdown + up + click 셋
    await wait(25);
    check(host.querySelectorAll(".w2m-goal").length === 1 && seen.cb === 0,
      `B-1. 🖱️ ▶️ 시작에 세 이벤트를 다 보내도 판이 **한 번만** 열린다`
      + ` (골문 ${host.querySelectorAll(".w2m-goal").length}개 · 판정 ${seen.cb}회)`);
    /* 칸에 세 이벤트를 다 보내도 판정은 한 번 */
    pressDom(W, host.querySelector('.w2m-cell[data-i="2"]'));
    await wait(700);
    check(seen.cb === 1,
      `B-2. 🖱️ 칸에 세 이벤트를 다 보내도 판정은 **한 번** (cb ${seen.cb}회)`);
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
