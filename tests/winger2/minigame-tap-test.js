/* ⚽ 더 윙어 II — 🖱️ **미니게임 공통 이중 탭** (`beta/winger-moment.js` · 넷 다)
 *
 * `gate`는 미니게임 **넷이 다 쓰는 자리**입니다. 그래서 🧱 차단 검사에 끼우지 않고
 * 여기 따로 세웠어요 — **묶으면 차단을 고쳤을 때 나머지 셋의 신호가 같이 사라집니다.**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚨 **이 검사가 재현하는 것 — 브라우저의 `click` 재타겟**
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 실기기는 한 번 누르면 `pointerdown` → `pointerup` → `click` **셋**이 옵니다.
 * 🔴 그런데 **개수만 맞추면 안 잡히는 자리**가 있어요:
 *
 *   `pointerdown`이 화면을 갈아치우면, 손 뗄 때 오는 `click`은 **옛 버튼이 아니라
 *   「그 지점에 지금 있는 새 버튼」**에게 갑니다. 그 새 버튼의 `lastPointer`는
 *   초기값이라 `TAP_ECHO`(같은 요소 안의 메아리 차단)에 **안 걸려요.**
 *   → **한 번 눌렀는데 두 판이 먹힙니다.**
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
 *   ① 재타겟할 새 버튼이 **실제로 생겼는가** (없으면 던집니다 — 조용히 넘어가지 않아요)
 *   ② 그 재타겟 `click`이 **안 먹혔는가**
 *   ③ 🔑 **그 다음 진짜 탭은 먹히는가** — ③이 없으면 ②는 아무것도 안 지킵니다
 *
 * ⏱️ 1초 안에 끝나요.
 */
"use strict";
const { momentMutsOK, momentDom, pressDom, pressRetarget } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const MUT = {
  /* ⓐ 준비 화면 → 본 게임의 gate 제거 — **넷 다** 이중 탭이 납니다 */
  READYGATE: [[/      gate\.shut = !!viaPointer;\n      wrap\.remove\(\);/,
    "      gate.shut = false;\n      wrap.remove();"]],
  /* ⓑ 🧱 1단계 → 2단계의 gate2 제거 — 차단에만 있는 둘째 자리 */
  GATE2: [[/      gate2\.shut = !!viaPointer;/, "      gate2.shut = false;"]],
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

/* 🎮 네 종과 **본 게임에서 처음 눌리는 자리**.
 * 🔴 이 표가 곧 「준비 화면 버튼이 사라지고 그 자리에 생기는 것」이에요. */
const GAMES = [
  { m: "cutin", n: "🏃 컷인", sel: ".w2m-side", kind: "goal" },
  { m: "oneone", n: "🥅 1대1", sel: ".w2m-goal", kind: "goal" },
  { m: "killpass", n: "🎯 킬패스", sel: ".w2m-run-btn", kind: "assist" },
  { m: "block", n: "🧱 차단", sel: '.w2m-dir[data-i="1"]', kind: "defend" },
];

/* 🧱 차단만 「먹혔나」의 증상이 다릅니다 — 1단계 방향 버튼은 판정을 내지 않고
 *    **2단계로 넘어가요.** 그래서 새어 나감의 증상이 `.w2m-hit`이 아니라 `.w2m-block2`입니다. */
const leaked = (host, moment) => (moment === "block"
  ? !!host.querySelector(".w2m-block2")
  : !!host.querySelector(".w2m-hit"));

function open(W, moment, kind) {
  const D = W.document;
  const host = D.createElement("div");
  D.body.appendChild(host);
  const seen = { cb: 0 };
  W.W2Moment.play(host, { moment, kind, condition: 80, foot: "R" }, () => { seen.cb += 1; });
  return { host, seen };
}

(async () => {
  /* ══════════════════════════════════════════════════════════════
   * A. 🖱️ 준비 화면 ▶️ 시작 → 본 게임 — **넷 다**
   * ══════════════════════════════════════════════════════════════ */
  {
    const W = momentDom();
    const rows = [];
    /* 📊 **셀렉터마다 탭 횟수를 셉니다.** 0이면 그 자리는 통째로 안 재진 거예요 —
     *    "도달했다"만 재는 검사가 **아무것도 안 눌러도 통과**하던 자리입니다. */
    const taps = {};
    for (const g of GAMES) {
      const { host, seen } = open(W, g.m, g.kind);
      const go = host.querySelector(".w2m-go");
      if (!go) { rows.push(`${g.n}: 준비 화면 없음`); continue; }
      /* ① 재타겟할 새 버튼이 실제로 생기나 — 없으면 pressRetarget이 던집니다 */
      pressRetarget(W, go, host, g.sel);
      taps[g.sel] = (taps[g.sel] || 0) + 1;
      await wait(40);
      /* ② 그 click이 안 먹혔나 */
      const bad = leaked(host, g.m);
      /* ③ 🔑 그 다음 진짜 탭은 먹히나 — 이게 없으면 ②는 아무것도 안 지킵니다 */
      const live0 = host.querySelector(g.sel);
      let live = false;
      if (live0) {
        pressDom(W, live0);
        taps[g.sel] += 1;
        await wait(40);
        live = leaked(host, g.m);
      }
      rows.push({ g, bad, live, cb: seen.cb });
    }
    const nBad = rows.filter((r) => r.bad).map((r) => r.g.n);
    const nDead = rows.filter((r) => !r.live).map((r) => r.g.n);
    check(nBad.length === 0,
      `A-1. 🖱️ **▶️ 시작에서 손 뗀 click이 새 버튼으로 가도 안 먹힌다** — 넷 다`
      + (nBad.length ? `\n     🔴 새어 나간 것: ${nBad.join(" · ")} — 한 번 눌렀는데 두 판이 먹힙니다` : ""));
    check(nDead.length === 0,
      `A-2. 🔑 **그 다음 진짜 탭은 먹힌다** — 넷 다 (이게 없으면 A-1은 "게임이 죽어 있어도 통과"예요)`
      + (nDead.length ? `\n     🔴 안 먹힌 것: ${nDead.join(" · ")}` : ""));
    const zero = Object.entries(taps).filter(([, n]) => !(n > 0)).map(([s]) => s);
    check(Object.keys(taps).length === GAMES.length && zero.length === 0,
      `A-3. 📊 **셀렉터마다 탭 횟수 > 0** — `
      + Object.entries(taps).map(([s, n]) => `${s} ${n}회`).join(" · ")
      + (zero.length ? `\n     🔴 한 번도 안 눌린 것: ${zero.join(" · ")}` : ""));
  }

  /* 🧪 변이 ⓐ — 준비 화면 gate를 없애면 **넷 다** 새어 나가야 합니다 */
  {
    const W = momentDom(MUT.READYGATE);
    const out = [];
    for (const g of GAMES) {
      const { host } = open(W, g.m, g.kind);
      pressRetarget(W, host.querySelector(".w2m-go"), host, g.sel);
      await wait(40);
      out.push([g.n, leaked(host, g.m)]);
    }
    const caught = out.filter(([, b]) => b).map(([n]) => n);
    check(caught.length === GAMES.length,
      `A-변이. 🔴 준비 화면 gate를 없애면 → 빨간불 · **넷 다** (${caught.length}/${GAMES.length}종)`
      + (caught.length === GAMES.length ? ` — ${caught.join(" · ")}`
        : `\n     🔴 **안 잡힌 것: ${out.filter(([, b]) => !b).map(([n]) => n).join(" · ")}**`
          + ` — 그 종은 지금 이 검사가 안 지키고 있습니다`));
  }

  /* ══════════════════════════════════════════════════════════════
   * B. 🧱 차단의 **둘째 자리** — 1단계 방향 버튼 → 2단계 🛡️ 막기
   *    버튼 셋 → 버튼 하나라 **가운데가 정확히 겹칩니다.**
   * ══════════════════════════════════════════════════════════════ */
  {
    const W = momentDom();
    const { host, seen } = open(W, "block", "defend");
    pressDom(W, host.querySelector(".w2m-go"));
    await wait(25);
    let taps = 0;
    const dir = host.querySelector('.w2m-dir[data-i="1"]');
    check(!!dir, `B-1. 1단계 가운데 버튼이 있다 — 2단계 🛡️ 막기와 **같은 자리**예요`);
    const go = pressRetarget(W, dir, host, ".w2m-blk-go");
    taps += 1;
    await wait(40);
    check(!host.querySelector(".w2m-hit") && seen.cb === 0,
      `B-2. 🖱️ **1단계에서 손 뗀 click이 🛡️ 막기로 가도 안 먹힌다**`
      + ` (.w2m-hit ${host.querySelector(".w2m-hit") ? "붙음" : "없음"} · cb ${seen.cb}회)`
      + `\n     👉 여기가 새면 방향을 고른 **그 순간** 2단계가 s ≈ 0으로 끝납니다`);
    check(!go.disabled, `B-3. 🛡️ 막기가 아직 살아 있다 (판정이 안 났으니 버튼이 안 잠겼어요)`);
    await wait(120);
    pressDom(W, host.querySelector(".w2m-blk-go"));
    taps += 1;
    await wait(40);
    check(host.querySelector(".w2m-hit") && taps > 0,
      `B-4. 🔑 **그 다음 진짜 탭은 먹힌다** (.w2m-blk-go 탭 ${taps}회 · 판정 남)`);
  }

  /* 🧪 변이 ⓑ — gate2를 없애면 방향을 고르는 순간 2단계가 끝나 버립니다 */
  {
    const W = momentDom(MUT.GATE2);
    const { host } = open(W, "block", "defend");
    pressDom(W, host.querySelector(".w2m-go"));
    await wait(25);
    pressRetarget(W, host.querySelector('.w2m-dir[data-i="1"]'), host, ".w2m-blk-go");
    await wait(40);
    check(!!host.querySelector(".w2m-hit"),
      `B-변이. 🔴 gate2를 없애면 → 빨간불 (방향을 고른 **그 순간** 2단계가 s ≈ 0으로 끝나요)`);
  }

  /* ══════════════════════════════════════════════════════════════
   * C. 🖱️ **같은 요소에 세 이벤트가 다 와도 한 번만** 먹힌다
   *
   * ⚠️ **이건 `TAP_ECHO`를 재는 검사가 아닙니다.** 재 봤더니 `TAP_ECHO = 0`으로 바꿔도
   *    아무 증상이 안 났어요 — 네 종이 각자 **자기 멱등 깃발**(`went` · `picked` ·
   *    `ctx.done`)을 들고 있어서 그쪽이 먼저 막습니다. 그래서 `TAP_ECHO` 변이는
   *    **표에 안 넣었습니다** — 안 잡히는 변이를 표에 두면 "돌고 있다"고 착각하게 돼요.
   * 🔑 여기서 지키는 건 **겹쳐 쌓인 결과**입니다: 어느 층이 막든 **한 번만** 먹혀야 한다.
   *    (`TAP_ECHO` 자체의 값어치는 지금 이 경로로는 **검증 불가**입니다 — 보고서에 적었어요.)
   * ══════════════════════════════════════════════════════════════ */
  {
    const W = momentDom();
    const { host, seen } = open(W, "block", "defend");
    pressDom(W, host.querySelector(".w2m-go"));            // pointerdown + up + click 셋
    await wait(25);
    check(host.querySelectorAll(".w2m-block").length === 1 && seen.cb === 0,
      `C-1. 🖱️ ▶️ 시작에 세 이벤트를 다 보내도 판이 **한 번만** 열린다 (상자 ${host.querySelectorAll(".w2m-block").length}개)`);
    /* 2단계 버튼에 세 이벤트를 다 보내도 판정은 한 번 */
    pressDom(W, host.querySelector('.w2m-dir[data-i="1"]'));
    await wait(30);
    await wait(100);
    pressDom(W, host.querySelector(".w2m-blk-go"));
    await wait(700);
    check(seen.cb === 1,
      `C-2. 🖱️ 🛡️ 막기에 세 이벤트를 다 보내도 판정은 **한 번** (cb ${seen.cb}회)`);
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
