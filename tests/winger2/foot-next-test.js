/* 🦶🆕 ⚽ 더 윙어 II — **주발은 「고르기 + [다음]」 두 걸음이다**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 이 파일이 생긴 이유 — **요청 그 자체를 지키는 검사가 0건이었습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 범민 님 요청(2026-09-02):
 *   *"주발 선택하면 바로 다음으로 넘어가는데, 주발 고르고 다음 버튼 눌러야 넘어가게 해줘."*
 *
 * engineer가 그대로 구현했고(111번), `tapFoot`을 고치자 검사 26종이 다시 초록불이 됐어요.
 * 🔴 **그런데 그 초록불이 지키는 것 중에 「요청」은 한 줄도 없었습니다.**
 *   · `tests/` 전체에서 `btn-foot-next`를 **읽는 자리가 0곳**
 *   · `.foot-card`의 `aria-pressed`·`.on`·`.picked`를 **읽는 자리도 0곳**
 *   → 즉 **셋 다 되돌려도 26종이 전부 초록불**입니다:
 *       ① 고르기 전에 [다음]이 열려 있음   ② 발을 안 골라도 넘어감
 *       ③ `.on`/`.picked`가 **두 장에 다** 남음
 *   이 파일이 그 자리를 지킵니다. (`foot-map-test.js`는 **좌우가 판정과 같은 쪽인가**를
 *   봐요 — 「어떻게 넘어가는가」는 안 봅니다. 둘을 섞지 않았습니다.)
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 값을 고치기 전에 여기부터 여세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-09-02 · engineer 111번 · 범민 님 요청)
 *
 *   · 🦶 주발은 **자기 화면(`#screen-foot`)**을 가집니다
 *   · **탭은 「고르기」까지**입니다 — 눌러도 화면이 안 바뀌어요
 *   · **`#btn-foot-next`를 눌러야** 넘어갑니다 (✏️ 이름 화면 `btn-name-next`와 같은 문법)
 *   · **고르기 전에는 [다음]이 `disabled`**입니다
 *   · **들어올 때는 늘 「안 고름」**에서 시작합니다 — `openFoot(cur, done)`의 `cur`을 안 써요.
 *     `game.js`의 `chosenFoot` 기본값이 `"R"`이라 그대로 쓰면 **아무것도 안 골랐는데
 *     오른발이 켜진 채 [다음]이 열립니다.**
 *   · 선택 표시는 **한 장에만** 남습니다 (`.on` · `.picked` · `aria-pressed="true"`)
 *   · 🎨 **안 고른 쪽을 흐리게 하는 `.chosen`은 고르기 「전」에는 안 걸립니다** —
 *     두 장 다 멀쩡해야 *"아직 안 골랐다"*가 읽혀요
 *
 * ⚠️ **뒤집히면 이 파일이 통째로 옛 계약이 되는 판정**
 *   · *"탭이 곧 답으로 되돌리자"* → N-2·N-3·N-4가 전부 옛 계약입니다.
 *     그때는 **여기와 `foot-map-test.js`의 F-0a, `_load.js`의 `tapFoot`을 같이** 여세요.
 *     🔑 2026-09-02 이전에 F-0a가 정확히 그 반대편(*"「다음」이 없다"*)을 지키고 있었고,
 *        요청대로 고치자 **고친 코드 쪽이 빨간불**이 났습니다. 같은 일을 또 만들지 않으려고
 *        여기 세 자리를 한 줄에 적어 둡니다.
 *   · *"뒤로 갔다 오면 고름이 풀려야 한다"* → 지금은 `show()`만 불려 **고름이 남습니다**.
 *     N-1은 **첫 진입**만 봅니다. N-7은 그 대신 *"[다음]의 잠김 = 고른 카드가 없음"*이라는
 *     **관계**를 보니, 뒤로 갈 때 풀리든 남든 **양쪽 세계에서 다 삽니다.**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱은 여기 박습니다**(탭 6 · 대기 600ms · 카드 2). 소스에서 읽어 오면
 *      상수를 바꿔도 검사가 따라가서 아무것도 안 잡혀요.
 *      **종속값은 관계식으로** — [다음]의 잠김(N-7)과 글자(N-6a)는 **카드 상태에서 파생**되고,
 *      고른 발(N-4)은 **누른 카드의 `data-foot`과 대조**합니다(값을 베끼지 않았어요)
 *   ③ **게임 입구를 통해** — 타이틀부터 실제 버튼을 눌러 갑니다
 *      (pointerdown → pointerup → click, 실기기 순서 그대로)
 *   ④ **시드 하나로 안 잽니다** — 핵심 흐름을 시드 둘로 각각 돌려 견줍니다
 *      (난수원 둘은 `seedBoth`가 `seed ^ 0x9E3779B9`로 **갈라서** 겁니다)
 *   ⑤ **변이 검증 전에 기준선이 초록불인지** 먼저 찍습니다. 그리고 **기준선도 뭔가를 봐야
 *      합니다** — 변이가 잡히는 것만으로는 부족해요(0번이 정규식부터 대조합니다)
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가로 넘겼습니다:
 *     앰버 글로우가 **눈에 띄는지** · `✓ 이 발` 배지가 카드를 안 흔드는지 ·
 *     흐려짐(`opacity`)이 *"안 고른 쪽"*으로 읽히는지 · [다음]의 탭 칸 px ·
 *     6번째 탭이 **한 번 더 누를 만한가**(체감). jsdom에 레이아웃도 색도 없습니다.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, pageMutsOK, seedBoth, townAuto, tapFoot } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const SEEDS = [9, 27];       // 🎲 시드 하나로 안 잽니다
const N_CARDS = 2;           // 🦶 발 두 짝
/* ⏳ 「탭해도 안 넘어간다」를 얼마나 지켜보나.
 *   기준선은 **영영 안 넘어감**(무한대)이고, 되살아날 수 있는 옛 전환은 **320ms**였어요.
 *   600ms면 그 1.9배라 옛 전환이 돌아오면 확실히 걸리고, 기준선 쪽으로는 여유가 무한입니다
 *   — 기준선 옆에 붙은 문턱이 아니에요. */
const HOLD_MS = 600;
/* 🚪 첫 순간 카드 앞의 탭 수. **5 → 6**입니다 (2026-09-02 · 111번 §2에서 재서 확인).
 *   새로 시작 · 이름 다음 · 🦶 발 · 🆕 🦶 다음 · 🗺️ 지역 · 🗺️ 다음
 *   ⚠️ designer의 초1 아크에서 이 검산을 다시 잡습니다. **여기서 조용히 되돌리지 마세요** —
 *      값을 바꿔야 하면 근거를 남기고 바꾸라는 뜻이지, 지우라는 뜻이 아니에요. */
const TAPS_TO_TOWN = 6;

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — **0번이 먼저 소스와 대조합니다**
 *    (안 걸리면 죽지 않고 ❌ 한 줄이에요)
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 M1 — **고르기 전에도 [다음]이 열려 있습니다.** engineer가 짚은 구멍 ①. */
  M1_ALWAYS_OPEN: { "intro.js": [[/next\.disabled = !pick;/, "next.disabled = false;"]] },
  /* 🔴 M2 — **탭이 곧 답으로 되돌아갑니다.** 범민 님이 없애 달라고 한 바로 그 동작이에요.
   *    🔑 `done`을 그 자리에서 부르니 [다음]을 누를 새도 없이 화면이 바뀝니다. */
  M2_TAP_ADVANCES: {
    "intro.js": [[/b\.addEventListener\("click", \(\) => \{ pick = b\.dataset\.foot; paint\(\); \}\)/,
      'b.addEventListener("click", () => { pick = b.dataset.foot; paint(); done(pick); })']],
  },
  /* 🔴 M3 — **[다음]에서 「골랐나」 확인이 사라집니다.** engineer가 짚은 구멍 ②.
   *    `disabled`는 그대로라 **눈으로는 똑같아요** — 코드 쪽 빗장만 빠집니다. */
  M3_NEXT_NO_GUARD: { "intro.js": [[/if \(next\) next\.onclick = \(\) => \{ if \(pick\) done\(pick\); \};/,
    'if (next) next.onclick = () => { done(pick || "R"); };']] },
  /* 🔴 M4 — **`.picked`가 두 장에 다 남습니다.** engineer가 짚은 구멍 ③.
   *    소스 주석이 *"add만 하면 둘 다 떠 있는 채로 굳는다"*고 적어 둔 그 상태예요. */
  M4_PICKED_ADD: { "intro.js": [[/x\.classList\.toggle\("picked", on\);/, 'if (on) x.classList.add("picked");']] },
  /* 🔴 M5 — 같은 구멍의 다른 클래스. **`.on`이 두 장에 다 남습니다.**
   *    M4만 두면 「`.picked`만 보는 검사」여도 통과하니, `.on`도 따로 겨눕니다. */
  M5_ON_ADD: { "intro.js": [[/x\.classList\.toggle\("on", on\);/, 'if (on) x.classList.add("on");']] },
  /* 🔴 M6 — **들어오자마자 오른발이 켜져 있습니다.** `cur`을 그대로 쓰면 나는 상태예요
   *    (`chosenFoot` 기본값이 `"R"`이라 **아무것도 안 골랐는데** 골라진 것처럼 보입니다). */
  M6_CUR_PRESELECT: { "intro.js": [[/let pick = null;/, 'let pick = cur === "L" || cur === "R" ? cur : null;']] },
  /* 🔴 M7 — ♿ **`aria-pressed`가 늘 false.** 화면이 안 바뀌니, 낭독 사용자에게는
   *    **아무 일도 안 일어난 화면**이 됩니다. 눈으로는 멀쩡해서 조용히 실패해요. */
  M7_ARIA_STUCK: { "intro.js": [[/x\.setAttribute\("aria-pressed", on \? "true" : "false"\);/,
    'x.setAttribute("aria-pressed", "false");']] },
  /* 🔴 M8 — **누른 발과 다른 발이 넘어갑니다.** 왼발을 눌러도 `chosenFoot`이 R이에요.
   *    🔑 `chosenFoot` 기본값이 `"R"`이라 **오른발만 재는 검사는 이걸 절대 못 잡습니다** —
   *       그래서 N-4가 L·R **둘 다** 갑니다. */
  M8_WRONG_FOOT: { "intro.js": [[/pick = b\.dataset\.foot;/, 'pick = "R";']] },
  /* 🔴 M9 — **[다음] 글자가 안 바뀝니다.** 고른 뒤에도 「발을 골라 주세요」예요.
   *    화면이 *"아직 안 골랐다"*고 말하는데 버튼은 열려 있는 어긋난 상태입니다. */
  M9_LABEL_STUCK: {
    "intro.js": [[/next\.textContent = pick \? `\$\{pick === "L" \? "왼발" : "오른발"\}로 갈게요` : "발을 골라 주세요";/,
      'next.textContent = "발을 골라 주세요";']],
  },
  /* 🔴 M10 — 🎨 **고르기 「전」부터 한쪽이 흐려집니다.** `.chosen`이 늘 붙어 있어요.
   *    두 장 다 멀쩡해야 *"아직 안 골랐다"*가 읽히는데, 그게 깨집니다. */
  M10_ALWAYS_CHOSEN: { "intro.js": [[/box\.classList\.toggle\("chosen", !!pick\);/, 'box.classList.add("chosen");']] },
};

/* ══════════════════════════════════════════════════════════════
 * 🚪 게임 입구 — 실제 창을 띄우고 실제 버튼을 누릅니다
 * ══════════════════════════════════════════════════════════════ */
function boot(o) {
  const W = bootPage({ keys: {}, muts: (o || {}).muts });
  seedBoth(W, (o || {}).seed || SEEDS[0]);
  /* ☁️ 클라우드 왕복을 막습니다 — 창을 닫은 뒤 `.catch`가 돌면 💥가 나요.
   *    세이브 내용에는 손대지 않습니다. */
  if (W.Cloud) W.Cloud.touch = () => {};
  W.fetch = () => new Promise(() => {});
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
  return {
    W, D, press, taps: () => taps,
    active: () => (D.querySelector(".screen.active") || {}).id,
    next: () => D.getElementById("btn-foot-next"),
    pair: () => D.getElementById("foot-pair"),
    card: (f) => D.querySelector(`#screen-foot .foot-card[data-foot="${f}"]`),
    foot: () => W.__get("chosenFoot"),
    close: () => W.close(),
  };
}
/* 🚪 타이틀 → ✏️ 이름 다음 → 🦶 주발 화면 */
function toFoot(h) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  return h;
}
/* 🔎 **화면이 지금 말하고 있는 것**을 한 벌로 읽습니다 — 기준선과 변이가 **같은 자**를 씁니다.
 *    (다른 자로 재면 둘 다 초록불인 상태가 생겨요) */
function readFoot(h) {
  const all = Array.from(h.D.querySelectorAll("#screen-foot .foot-card"));
  const nx = h.next();
  return {
    screen: h.active(),
    cards: all.map((c) => c.dataset.foot),
    on: all.filter((c) => c.classList.contains("on")).map((c) => c.dataset.foot),
    picked: all.filter((c) => c.classList.contains("picked")).map((c) => c.dataset.foot),
    aria: all.filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.foot),
    chosen: !!(h.pair() && h.pair().classList.contains("chosen")),
    disabled: !!(nx && nx.disabled),
    label: (nx && nx.textContent) || "",
    /* 🔗 **관계로 씁니다** — 카드가 스스로 말하는 이름이에요(글자를 베끼지 않았습니다) */
    names: all.reduce((m, c) => {
      m[c.dataset.foot] = ((c.querySelector(".foot-name") || {}).textContent || "").trim();
      return m;
    }, {}),
  };
}
const show = (r) => `화면 ${r.screen} · [다음] ${r.disabled ? "🔒잠김" : "열림"} "${r.label}"`
  + ` · .on [${r.on.join(",") || "없음"}] · .picked [${r.picked.join(",") || "없음"}]`
  + ` · aria [${r.aria.join(",") || "없음"}] · 흐림(.chosen) ${r.chosen ? "걸림" : "안 걸림"}`;

/* ══════════════════════════════════════════════════════════════════════
 * 📏 한 판 재기 — **게임 입구에서 출발해 🦶 화면을 실제로 조작합니다**
 * ══════════════════════════════════════════════════════════════════════
 *   want   이 발을 고릅니다. 🔑 **먼저 반대쪽을 한 번 눌렀다가** 옮겨 와요 —
 *          「번갈아 눌러도 표시가 한 장에만 남는가」(구멍 ③)를 그 김에 재려고요.
 * 돌려주는 것:
 *   entry   들어온 직후 (아무것도 안 누른 상태)
 *   gate    고르기 전에 [다음]을 **눌러 본** 직후 — 안 넘어가야 합니다
 *   tapped  발을 탭하고 HOLD_MS 기다린 직후 — 화면이 그대로여야 합니다
 *   after   [다음]을 누른 뒤 (화면 · chosenFoot) */
async function run(seed, want, muts) {
  const h = boot({ seed, muts });
  toFoot(h);
  const entry = readFoot(h);

  /* 🚪 ② 안 골랐는데 [다음]을 눌러 봅니다. `disabled`는 진짜 브라우저가 막아 주는 빗장이고,
   *    이건 **코드 쪽 빗장(`if (pick)`)**을 재는 자리예요 — jsdom은 `disabled`여도
   *    리스너를 부르니(실측 확인) 두 빗장을 따로 볼 수 있습니다. */
  h.press(h.next(), "🆕 [다음] (안 고른 채)");
  await wait(HOLD_MS);
  const gate = readFoot(h);

  /* 🔁 반대쪽 → 원하는 쪽. 두 번 눌러도 표시는 한 장에만 남아야 해요. */
  const other = want === "L" ? "R" : "L";
  h.press(h.card(other), `🦶 ${other} (먼저)`);
  const mid = readFoot(h);
  h.press(h.card(want), `🦶 ${want}`);
  await wait(HOLD_MS);                                   // ⏳ 늦게 넘어가는 것도 잡습니다
  const tapped = readFoot(h);

  h.press(h.next(), "🦶 [다음]");
  await wait(20);
  const after = { screen: h.active(), foot: h.foot() };
  h.close();
  return { entry, gate, mid, tapped, after, want };
}

/* 🔒 술어를 **함수로** 둡니다 — 변이 검사가 기준선과 **같은 문장**을 지키게요. */
const P = {
  /* N-1. 들어올 때 아무것도 안 골라져 있다 (`chosenFoot` 기본값이 "R"인데도) */
  entryClean: (r) => r.entry.on.length === 0 && r.entry.picked.length === 0
    && r.entry.aria.length === 0 && r.entry.disabled === true && r.entry.chosen === false
    && r.entry.cards.length === N_CARDS,
  /* N-2/N-2a. 안 골랐으면 못 넘어간다 — 빗장 둘 */
  gateLocked: (r) => r.entry.disabled === true,
  gateHeld: (r) => r.gate.screen === "screen-foot",
  /* N-3. 발을 탭해도 화면이 안 바뀐다 (범민 님 요청의 본문) */
  tapHolds: (r) => r.tapped.screen === "screen-foot",
  /* N-4. [다음]을 눌러야 넘어가고, **누른 그 발**이 간다 */
  nextAdvances: (r) => r.after.screen === "screen-origin" && r.after.foot === r.want,
  /* N-5. 표시는 한 장에만 — 번갈아 눌러도 */
  onlyOne: (r) => [r.mid, r.tapped].every((s) =>
    s.on.length === 1 && s.picked.length === 1 && s.aria.length === 1)
    && r.tapped.on[0] === r.want && r.tapped.picked[0] === r.want && r.tapped.aria[0] === r.want
    && r.mid.on[0] === (r.want === "L" ? "R" : "L"),
  /* N-6. ♿ aria-pressed가 고른 상태를 말한다 */
  ariaSpeaks: (r) => r.entry.aria.length === 0 && r.tapped.aria.join("") === r.want,
  /* N-6a. 🔗 [다음] 글자는 **카드가 말하는 이름**에서 나온다 (글자를 베끼지 않았어요) */
  labelFollows: (r) => {
    const mine = r.tapped.names[r.want], other = r.tapped.names[r.want === "L" ? "R" : "L"];
    return !!mine && !!other && mine !== other
      && r.entry.label.indexOf(mine) < 0 && r.entry.label.indexOf(other) < 0
      && r.tapped.label.indexOf(mine) >= 0 && r.tapped.label.indexOf(other) < 0;
  },
  /* N-7. 🔗 **관계** — [다음]의 잠김은 언제나 「고른 카드가 없음」과 같다 */
  lockMatchesPick: (r) => [r.entry, r.gate, r.mid, r.tapped]
    .every((s) => s.disabled === (s.on.length === 0)),
  /* 🎨 고르기 「전」에는 흐려지지 않는다 / 고른 뒤에는 흐려진다 */
  dimTiming: (r) => r.entry.chosen === false && r.mid.chosen === true && r.tapped.chosen === true,
};

/* ══════════════════════════════════════════════════════════════════════ */
async function main() {
  console.log("── 🦶🆕 N. 주발은 「고르기 + [다음]」 두 걸음인가 ──");

  /* ── 0. 변이가 지금 소스에 걸리는지부터 ── */
  const bad = pageMutsOK(MUT);
  check(bad.length === 0,
    `N-0. 🧪 변이 정규식 ${Object.keys(MUT).length}종이 지금 \`beta/winger2/\`에 전부 걸린다`
    + (bad.length ? `\n     🔴 안 걸리는 것: ${bad.join("\n        ")}`
      + `\n     🔑 구현이 바뀐 거예요 — 정규식을 고치기 전에 **계약이 아직 맞는지** 먼저 보세요` : ""));

  /* ── 기준선 — 🎲 시드 둘 × 🦶 발 둘 ── */
  const base = {};
  for (const seed of SEEDS) {
    for (const f of ["L", "R"]) base[`${seed}:${f}`] = await run(seed, f, null);
  }
  const rows = Object.entries(base);
  const all = (pred) => rows.every(([, r]) => pred(r));
  const bad1 = (pred) => rows.filter(([, r]) => !pred(r)).map(([k, r]) => `${k} → ${show(r.tapped)}`);

  check(all(P.entryClean),
    `N-1. 🚪 🦶 화면에 들어오면 **아무것도 안 골라져 있다** — [다음]은 🔒잠김`
    + `\n     🔎 측정 조건 — \`chosenFoot\` 기본값은 \`"R"\`입니다. 그걸 그대로 쓰면 여기서 잡혀요`
    + `\n     ${rows.map(([k, r]) => `${k}: ${show(r.entry)}`).join("\n     ")}`);

  check(all(P.gateLocked),
    `N-2. 🔒 **고르기 전에는 [다음]이 \`disabled\`** — 진짜 브라우저가 막아 주는 빗장`
    + (all(P.gateLocked) ? "" : `\n     🔴 ${bad1(P.gateLocked).join("\n        ")}`));

  check(all(P.gateHeld),
    `N-2a. 🔒 그 상태에서 **눌러 봐도 안 넘어간다** — 코드 쪽 빗장(\`if (pick)\`)`
    + `\n     🔎 측정 조건 — 실기기 순서(pointerdown→pointerup→click)로 실제로 눌렀고,`
    + ` ${HOLD_MS}ms 지켜봤습니다 (jsdom은 \`disabled\`여도 리스너를 불러서 두 빗장이 갈라져요)`
    + (all(P.gateHeld) ? "" : `\n     🔴 ${rows.filter(([, r]) => !P.gateHeld(r)).map(([k, r]) => `${k} → ${r.gate.screen}`).join(" · ")}`));

  check(all(P.tapHolds),
    `N-3. 🦶 **발을 탭해도 화면이 그대로다** — 범민 님 요청의 본문이에요`
    + `\n     🔎 측정 조건 — 탭한 뒤 **${HOLD_MS}ms** 지켜봅니다 (없어진 옛 전환이 320ms였어요 — 1.9배)`
    + (all(P.tapHolds) ? "" : `\n     🔴 탭이 곧 답으로 되돌아갔습니다: ${bad1(P.tapHolds).join(" · ")}`));

  check(all(P.nextAdvances),
    `N-4. ➡️ **[다음]을 눌러야 넘어가고, 누른 그 발이 간다** (🦶 L·R 둘 다 · 🎲 시드 ${SEEDS.join("·")})`
    + `\n     🔎 측정 조건 — 정답은 **누른 카드의 \`data-foot\`**입니다(값을 안 베꼈어요).`
    + ` \`chosenFoot\` 기본값이 \`"R"\`이라 **오른발만 재면 절대 안 잡힙니다**`
    + `\n     ${rows.map(([k, r]) => `${k}: → ${r.after.screen} · chosenFoot ${r.after.foot}`).join("   ")}`);

  check(all(P.onlyOne),
    `N-5. 🔴 선택 표시는 **한 장에만** 남는다 — \`.on\`·\`.picked\`·\`aria-pressed\` 셋 다`
    + `\n     🔎 측정 조건 — **반대쪽을 먼저 누르고 옮겨 왔습니다.** 한 번만 누르면`
    + ` add-only 버그가 **안 잡혀요**(둘 다 켜지려면 두 번 눌러야 하니까요)`
    + (all(P.onlyOne) ? "" : `\n     🔴 ${bad1(P.onlyOne).join("\n        ")}`));

  check(all(P.ariaSpeaks),
    `N-6. ♿ **\`aria-pressed\`가 고른 상태를 말한다** — 화면이 안 바뀌니 이게 유일한 신호예요`
    + (all(P.ariaSpeaks) ? "" : `\n     🔴 ${bad1(P.ariaSpeaks).join("\n        ")}`));

  check(all(P.labelFollows),
    `N-6a. 🔗 **[다음] 글자가 카드의 이름을 따라간다** — 고르기 전엔 발 이름이 없고, 고르면 그 발 이름만`
    + `\n     🔎 측정 조건 — 정답은 카드의 \`.foot-name\`에서 읽어 옵니다(글자를 안 베꼈어요)`
    + `\n     ${rows.map(([k, r]) => `${k}: "${r.entry.label}" → "${r.tapped.label}"`).join("   ")}`);

  check(all(P.lockMatchesPick),
    `N-7. 🔗 **관계 — [다음]의 잠김 = 「고른 카드가 없음」**. 흐름 네 지점에서 매번 같다`
    + `\n     🌍 이 문장은 *"뒤로 갔다 오면 고름이 풀리는가"*와 **무관하게** 삽니다 —`
    + ` 풀리면 잠기고, 남으면 열려 있으면 돼요`
    + (all(P.lockMatchesPick) ? "" : `\n     🔴 ${bad1(P.lockMatchesPick).join("\n        ")}`));

  check(all(P.dimTiming),
    `N-7a. 🎨 **흐려짐(\`.chosen\`)은 고르기 「전」에는 안 걸린다** — 두 장 다 멀쩡해야 "아직 안 골랐다"가 읽혀요`
    + (all(P.dimTiming) ? "" : `\n     🔴 ${bad1(P.dimTiming).join("\n        ")}`));

  /* ── N-8. 🔢 탭 수 ──
   * ⚠️ **이 문장에는 짝이 되는 변이가 없습니다.** 아래 10종 중 어느 것을 걸어도 탭 수는
   *    그대로 6이에요(걸음이 늘거나 주는 변이가 아니니까요). 이건 **회귀 감시 카운터**입니다 —
   *    흐름에 걸음이 붙거나 빠지는 날 빨간불이 되라고 둔 것이고, 실제로 111번에서
   *    5 → 6으로 움직인 값이에요. 🔑 **다른 N 문장들과 성질이 다르다는 걸 적어 둡니다** —
   *    변이로 검증된 문장인 척하지 않으려고요. */
  {
    const h = boot({ seed: SEEDS[0] });
    toFoot(h);
    await tapFoot(h.W, h.press, "R");                    // 🦶 발 + 🆕 [다음] = 2탭
    const back = townAuto(h.W);                          // 🏘️ 첫 카드가 진짜로 열리기 전에
    h.press(h.D.querySelector('#origin-map .om-do[data-id="gyeonggi"]')
      || h.D.querySelector('#origin-cities .om-city[data-id="seoul"]'), "🗺️ 지역");
    h.press(h.D.getElementById("btn-origin-next"), "🗺️ 다음");
    const n = h.taps();
    const at = h.active();
    back();
    h.close();
    check(n === TAPS_TO_TOWN && at === "screen-town",
      `N-8. 🔢 첫 순간 카드까지 **탭 ${TAPS_TO_TOWN}번** — 새로 시작 · 이름 다음 · 🦶 발 · 🆕 🦶 다음 · 🗺️ 지역 · 🗺️ 다음`
      + `\n     쟀더니 ${n}번 · 도착 ${at}`
      + `\n     🔒 111번에서 **5 → 6**이 됐습니다(요청대로 [다음]이 붙어서요).`
      + ` ⚠️ **designer의 초1 아크가 이 검산을 다시 잡습니다** — 여기서 조용히 되돌리지 마세요`);
  }

  /* ── N-9. 🔒 `tapFoot` 복붙본이 없는가 ── */
  {
    const dir = "/workspace/grow-games/tests/winger2";
    /* 🔑 **주석은 안 셉니다** — 이 파일도 `_load.js`도 머리말에 이름을 적어 두거든요.
     * 🔑 **「누르는 자리」만** 셉니다. `foot-map-test.js`는 화면 직속 버튼 목록에서
     *    문자열로 `btn-foot-next`를 **읽기만** 하는데(F-0a), 그건 계약 확인이지 드라이버가 아니에요. */
    const code = (s) => s.split("\n").filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).join("\n");
    const RE = /(getElementById|querySelector(All)?)\s*\(\s*["'`][^"'`]*btn-foot-next/;
    const bad2 = fs.readdirSync(dir)
      .filter((f) => f.endsWith(".js") && f !== "_load.js" && f !== path.basename(__filename))
      .filter((f) => RE.test(code(fs.readFileSync(path.join(dir, f), "utf8"))));
    check(bad2.length === 0,
      `N-9. 🔒 winger2 검사에 🦶 드라이버 **복붙본이 없다** — \`_load.js\`의 \`tapFoot\` 한 벌`
      + `\n     🔴 2026-09-02에 사본이 **셋**이었고([_load] · [foot-map] · [youth-moment]의 인라인),`
      + ` [다음]이 붙자 **셋이 한꺼번에** 죽어 검사 7종이 종료 코드 2가 됐습니다`
      + ` — rAF preamble 네 벌과 같은 형태예요`
      + (bad2.length ? `\n     🔴 복붙본: ${bad2.join(", ")} — \`tapFoot(W, press, foot)\`으로 바꾸세요` : ""));
    const n = (code(fs.readFileSync(path.join(dir, "_load.js"), "utf8"))
      .match(/getElementById\("btn-foot-next"\)/g) || []).length;
    check(n === 1, `N-9a. 🔒 \`_load.js\` 안에도 🦶 [다음]을 누르는 자리가 한 군데뿐이다 (${n}군데 · 주석 제외)`);
  }

  /* ══════════════════════════════════════════════════════════════════════
   * 🧪 변이 — **기준선이 초록불인 걸 위에서 먼저 찍고** 시작합니다
   * ══════════════════════════════════════════════════════════════════════
   * 🔴 기준선이 이미 빨간불이면 변이는 아무것도 증명하지 못해요 (둘 다 빨간불일 뿐입니다). */
  console.log(`\n── 🧪 변이 — 되돌리면 정말 빨간불이 뜨는가 (기준선 ${fail === 0 ? "🟢 초록불" : `🔴 빨간불 ${fail}건`}) ──`);
  if (fail > 0) {
    console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다 — 위를 먼저 고치세요.");
  } else {
    /* 변이마다 **어느 문장이 빨간불이 되어야 하는지**를 같이 적습니다.
     * 🔑 안 잡히면 그 검사는 **아무것도 안 지키는 것**이라 여기서 빨간불을 냅니다. */
    const CASES = [
      ["M1_ALWAYS_OPEN", "N-2", (r) => !P.gateLocked(r)],
      ["M2_TAP_ADVANCES", "N-3", (r) => !P.tapHolds(r)],
      ["M3_NEXT_NO_GUARD", "N-2a", (r) => !P.gateHeld(r)],
      ["M4_PICKED_ADD", "N-5", (r) => !P.onlyOne(r)],
      ["M5_ON_ADD", "N-5", (r) => !P.onlyOne(r)],
      ["M6_CUR_PRESELECT", "N-1", (r) => !P.entryClean(r)],
      ["M7_ARIA_STUCK", "N-6", (r) => !P.ariaSpeaks(r)],
      ["M8_WRONG_FOOT", "N-4", (r) => !P.nextAdvances(r)],
      ["M9_LABEL_STUCK", "N-6a", (r) => !P.labelFollows(r)],
      ["M10_ALWAYS_CHOSEN", "N-7a", (r) => !P.dimTiming(r)],
    ];
    for (const [name, guard, bites] of CASES) {
      /* 🦶 **왼발로 겁니다** — `chosenFoot` 기본값이 `"R"`이라 오른발로는 M8이 안 잡혀요. */
      let r = null, err = null;
      try { r = await run(SEEDS[0], "L", MUT[name]); } catch (e) { err = e; }
      check(!!r && bites(r),
        `변이-${name} → **${guard}가 빨간불**이어야 한다`
        + (err ? `\n     💥 변이를 걸었더니 검사가 죽었습니다: ${err.message}`
          + `\n     🔑 죽는 건 초록불도 빨간불도 아니에요 — 문장이 아니라 드라이버가 걸린 겁니다`
          : `\n     ${show(r.tapped)}`
            + `\n     → 넘어감 ${r.after.screen} · chosenFoot ${r.after.foot}`
            + (bites(r) ? "" : `\n     🔴 **안 잡혔습니다 — ${guard}는 아무것도 안 지키고 있어요.** 검사를 고치세요`)));
    }
  }

  console.log(`\n${fail ? `❌ 빨간불 ${fail}건` : "✅ 전부 통과"} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  process.exit(fail ? 1 : 0);
}
main();
