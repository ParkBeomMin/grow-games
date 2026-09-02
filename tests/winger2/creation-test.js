/* 🔢🧬 ⚽ 더 윙어 II — **선수를 만드는 두 화면이 거짓말하지 않는다**
 *
 * 🔴 **이 파일은 「검사가 없던 자리 둘」을 메우려고 생겼습니다** (2026-09-01 · engineer 102번 §5).
 *    engineer가 말로 하지 않고 **실제로 되돌려 20종을 돌렸는데 전부 초록불**이었어요:
 *
 *      A. 🔢 `STEPS`를 5칸 → **3칸**으로 (= 🗺️ 동네가 다시 「3 / 3」)   → 🔴 20종 전부 초록불
 *      B. 🧬 2택 → **1택**으로 (`rollPair`가 한 벌만 · 고르기 死)      → 🔴 20종 전부 초록불
 *
 * 🔑 **A는 특히 아픈 자리입니다.** `foot-map-test.js`가
 *    *"⏳ 곧 죽을 것에는 일부러 검사를 안 걸었습니다 … `WingerIntro.STEPS`의 「2 / 4」"*
 *    라고 적어 뒀어요. **그때는 맞는 판단이었는데 그게 안 죽었습니다.**
 *    「비어 있는 채로 살아남아서」, 아무도 안 보는 사이에 화면이 거짓말을 하고 있었어요 —
 *    범민 님이 *"능력치 고르는 게 없어졌네…?"*로 겪은 그 자리입니다.
 *    ⚠️ **「곧 죽을 것」이라 검사를 미룰 때는, 죽었는지 확인하는 사람을 정해 두세요.**
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 *   · 🔢 선수를 만드는 화면은 **다섯**입니다 — ✏️ 이름 · 🦶 주발 · 🗺️ 동네 · 🎯 자리 · 🧬 조립대.
 *     세는 것은 **「선수가 완성되기까지 남은 결정」**이에요 (첫 카드 뒤의 결정도 셉니다)
 *   · 🧬 조립대는 **두 벌을 나란히 내고 하나를 고르는** 화면이고, 두 벌 다 총합이 `POOL`입니다
 *   · 🧬 조립대는 🏫 학교 아크 **뒤**예요 — 앞으로 오면 `town-neutral-test`의 등식이 깨집니다
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들**
 *   · 📏 키 고르기 화면이 들어오면 **다섯이 여섯**이 됩니다 → C-2·C-4가 빨간불이에요.
 *     🔑 그건 고장이 아니라 **이 파일을 읽으라는 신호**입니다. `SCREENS`에 한 줄 더하세요
 *   · 「2택을 3택으로」라는 판정이 나오면 B-1이 옛 계약입니다 (지금은 74번이 3택을 폐기했어요)
 *   · 🔴 **미니게임·초중고 경기 진행에는 아직 검사를 안 겁니다** — 범민 님 답을 기다리는 중이라
 *     여기 걸면 판정이 오는 날 「옛 계약을 지키는 검사」가 됩니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(화면 5개 · 총합 194 · 등급 6줄 · 2택)은 여기 박습니다.** `WingerIntro.STEPS`나
 *      `WingerProspect.POOL`에서 읽어 오면 **그 상수를 바꿔도 검사가 따라가요**
 *   ③ **게임 입구를 통해** — 타이틀부터 실제 버튼을 눌러 조립대까지 갑니다
 *      (실기기 순서 그대로 `pointerdown` → `pointerup` → `click`)
 *   ④ **시드 하나로 안 잽니다**
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인하고, **기준선이 초록불인지** 먼저 찍습니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🎲 **난수는 「값」이 아니라 「소비량」으로 잽니다** (engineer 102번 §5 ⓓ)
 * ─────────────────────────────────────────────────────────────────────────
 * *"한쪽이 마음에 들 때 한 벌만 굴린다"* 는 분기가 들어오면 **값만 봐서는 안 잡힙니다** —
 * 두 벌 다 총합 194이고 화면도 멀쩡해요. 그런데 그 순간 굴림 횟수가 조건을 타서
 * **같은 시드에서도 뒤쪽 전부가 어긋납니다.**
 *
 * 🔧 그래서 **되감을 수 있는 난수 흐름**을 깝니다. 같은 자리(`s.i`)에서 두 갈래를 견줘요:
 *     🎲 한 번의 소비량   ===   `rollShape` 두 번의 소비량        ← B-4
 *     🅰️를 고른 뒤 🎲     ===   🅱️를 고른 뒤 🎲 (같은 자리에서)   ← B-4b
 * 🔑 **횟수 「2」를 검사에 적지 않습니다.** `rollShape` 한 번이 쓰는 난수 개수는
 *    자리마다 달라요(14~16개를 봤습니다). 그래서 **관계**로 봅니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **드라이버가 결정적이어야 합니다 — `Math.random`만 갈면 안 돼요**
 * ─────────────────────────────────────────────────────────────────────────
 * `engine.js`는 로드 시점에 `let _rng = Math.random;`으로 **함수를 잡아 둡니다.**
 * 그래서 `W.Math.random`을 나중에 갈아도 **판정은 안 걸려요.**
 * 실측(같은 시드로 아크를 3번):
 *     `Math.random`만        → 점수 10 / 9 / 7  🔴 **매번 다릅니다**
 *     `+ WingerEngine._t.seed()` → 점수 8 / 8 / 8  ✅
 * 🔑 engineer가 102번 §2에서 *"제 드라이버가 결정적이지 않습니다"*라고 신고한 것이
 *    정확히 이 한 줄입니다. **D-0이 매번 그걸 확인합니다.**
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 */
"use strict";
const { bootPage, pageMutsOK, townAuto, tapFoot, tapChild, pickOrigin, passStage, passEarly,
  seedBoth } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
/* 🔢 선수를 만드는 화면 **다섯**과 그 라벨 칸. 순서가 곧 차례예요.
 *    🔴 `WingerIntro.STEPS`에서 읽어 오면 **5칸을 3칸으로 줄여도 검사가 따라갑니다** —
 *       그게 이 파일이 생긴 이유입니다. */
/* 🧒 2026-09-02: 🗺️ 동네와 🎯 자리 **사이**에 `screen-child`(초1)가 들어왔습니다 (117번 §2-3).
 *    🔴 화면이 하나 늘면 **분모도 같이** 늘어야 해요 — 안 그러면 «끝났다»는 거짓말이 다시 납니다. */
const SCREENS = [
  { id: "screen-name", what: "✏️ 이름" },
  { id: "screen-foot", what: "🦶 주발" },
  { id: "screen-origin", what: "🗺️ 동네" },
  { id: "screen-child", what: "🧒 초1" },
  { id: "screen-position", what: "🎯 자리" },
  { id: "screen-prospect", what: "🧬 조립대" },
];
const N_STEP = 6;           // 🔢 차례 수 (= SCREENS.length). 분모로도 씁니다
const OPTS = 2;             // 🧬 2택 — 🔒 3택은 74번이 폐기했어요
const POOL_WANT = 194;      // 📊 한 벌의 총합. **양쪽 다** 정확히 이 값
const SLOTS = 6;            // 🌱 등급 줄 수 (조립대 아래 여섯 줄)
const SEEDS = [11, 23, 37];
const ROLLS = 6;            // 🎲를 시드마다 이만큼 눌러 봅니다

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **M-STEPS3 — `STEPS`를 3칸으로 되돌립니다** (= 🗺️ 동네가 다시 「3 / 3」).
   *    engineer가 실제로 되돌려 본 그 변경이고, 그때 검사 20종이 **전부 초록불**이었어요. */
  /* 🔒 **목록을 통째로 베끼지 않습니다.** 🧒 초1이 끼며 `STEPS`가 **두 줄**이 되자
   *    통문장 정규식이 안 걸려 이 변이가 「안 도는」 상태가 됐어요 (2026-09-02). */
  M_STEPS3: { "intro.js": [[
    /const STEPS = \[[\s\S]*?\];/,
    'const STEPS = ["screen-name", "screen-foot", "screen-origin"];']] },
  /* 🔴 **M-NOSTAMP — 마지막 화면이 차례를 안 찍습니다.** `STEPS`는 5칸 그대로라
   *    **목록만 보는 검사는 통과합니다** — 🎯 자리·🧬 조립대에 칸 자체가 없어서
   *    아무 데도 안 찍히던 게 정확히 이 모양이었어요. */
  M_NOSTAMP: { "game.js": [[/stampStep\("screen-prospect"\);/, "void 0;"]] },
  /* 🔴 **M-PICK1 — 2택을 1택으로.** `open()`과 `rollPair` **양쪽**을 되돌립니다 —
   *    한쪽만 되돌리면 첫 화면과 🎲가 서로 다른 세계가 돼요. */
  M_PICK1: { "prospect.js": [
    /* 🔒 **인자 목록을 통째로 안 겨눕니다.** 🧒 초1이 `rollShape(marketId, pos, childPicks)`로
     *    셋째 인자를 더하면서 옛 정규식이 셋 다 안 걸렸어요 (2026-09-02). */
    [/    draw\.picks = \[\{ shapeKey: draw\.build\.shapeKey, stats: draw\.build\.stats \},[\s\S]*?\];/,
      "    draw.picks = [{ shapeKey: draw.build.shapeKey, stats: draw.build.stats }];"],
    [/    const b = rollShape\([^;]*\);\n    return \[a, b\];/, "    return [a];"],
  ] },
  /* 🔴🔑 **M-PICKCOND — 굴림 횟수가 「지금 고른 쪽」을 탑니다.**
   *    두 벌은 그대로 나오고 총합도 194라 **값으로는 아무것도 안 보입니다.**
   *    B-4b(소비량)만 잡아요 — 이 변이가 이 파일의 §🎲 절이 있는 이유입니다. */
  M_PICKCOND: { "prospect.js": [[
    /    draw\.picks = rollPair\([^;]*\);/,
    "    draw.picks = draw.pick === 1 ? [rollShape(draw.market.id, draw.pos, []), draw.picks[1]] : rollPair(draw.market.id, draw.pos, []);"]] },
  /* 🔴 **M-PICKBIG — 한쪽 벌의 총합을 키웁니다.** 그 순간 「고르기」가 모양이 아니라
   *    **세지는 손잡이**가 돼요 (102번 §5 ⓑ). */
  M_PICKBIG: { "prospect.js": [[
    /    const b = rollShape\([^;]*\);\n    return \[a, b\];/,
    "    const b = rollShape(marketId, pos, childPicks);\n    b.stats[Object.keys(b.stats)[0]] += 6;\n    return [a, b];"]] },
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
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 조립대에 닿습니다
 * ══════════════════════════════════════════════════════════════ */
/* 🔒 **되감을 수 있는 난수 흐름** + 🎲 **갈린 엔진 시드** — 둘 다 `seedBoth`가 합니다.
 *    뽑은 값을 쌓아 두고 `i`만 옮기면 같은 자리로 돌아가요 — 소비량을 「짝지어」 견주려면
 *    두 갈래가 **같은 값을 같은 순서로** 봐야 합니다.
🎲 시드는 `_load.js`의 `seedBoth`가 **갈라서** 겁니다 — 두 난수원(`Math.random` ·
 * `WingerEngine._t`)에 같은 시드를 걸면 앞 1,000개가 **1000/1000 일치**해서 보폭이
 * 맞아 lockstep이 나요 (109번 §4 · `seed-split-test.js`가 지킵니다). */
function boot(seed, muts) {
  const W = bootPage(muts ? { muts } : undefined);
  /* 🔴 엔진 씨를 안 뿌리면 드라이버가 **결정적이지 않습니다** (위 머리말 · D-0이 확인해요) */
  const s = seedBoth(W, seed);
  const D = W.document;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click. */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  const active = () => (D.querySelector(".screen.active") || {}).id;
  return { W, D, press, s, active, close: () => W.close() };
}

/* 🚪 타이틀 → ✏️ 이름 → 🦶 주발 → 🗺️ 동네 → 🏫 초등 → 🎯 자리 → 🏫 중·고 → 🏟️ 제안 → 🧬 조립대
 *
 * 🔑 **`passArc`를 그대로 안 쓰는 까닭**: 차례 표시는 **그 화면이 떠 있는 동안에만** 읽을 수
 *    있어요. 지나간 뒤에 읽으면 다음 화면의 칸을 보게 됩니다. 그래서 `_load.js`의
 *    조각(`tapFoot`·`pickOrigin`·`passStage`·`passEarly`)을 쓰되 **한 화면씩** 몰고 갑니다.
 *
 * 돌려주는 것: { steps: [{ screen, label }], … } — **화면이 실제로 찍고 있는 글자**입니다. */
async function toBench(h, opt) {
  const o = opt || {};
  const D = h.D;
  const steps = [];
  /* 📊 지금 떠 있는 화면의 차례 칸을 **화면에서** 읽습니다 — 로직에 다시 안 물어봐요.
   *    🔑 `.screen.active` 안에서 찾습니다. 안 그러면 안 보이는 화면의 칸을 읽어요. */
  const stamp = () => {
    const cur = D.querySelector(".screen.active");
    if (!cur) return;
    const el = cur.querySelector(".step-no");
    steps.push({ screen: cur.id, has: !!el, label: el ? el.textContent.trim() : null });
  };
  h.press(D.getElementById("btn-new"), "btn-new");
  stamp();                                                  // ✏️ 이름
  h.press(D.getElementById("btn-name-next"), "btn-name-next");
  stamp();                                                  // 🦶 주발
  await tapFoot(h.W, h.press, o.foot || "R");
  stamp();                                                  // 🗺️ 동네
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, o.origin || "seoul");
  stamp();                                                  // 🧒 초1
  await tapChild(h.W, h.press, o.child || "ball");
  passStage(h.W, h.press);                                  // 🏫 초등부
  passEarly(h.W, h.press);                                  // 📨 조기 제안 — **거절**
  stamp();                                                  // 🎯 자리
  h.press(D.querySelector(`#position-list .card[data-pos="${o.pos || "wg"}"]`), `🎯 ${o.pos || "wg"}`);
  passStage(h.W, h.press);                                  // 🏫 중등부
  passEarly(h.W, h.press);                                  // 📨 — **거절**
  passStage(h.W, h.press);                                  // 🏫 고등부
  if (back) back();
  h.press(D.querySelector("#agency-list button"), "🏟️ 입단 제안");
  stamp();                                                  // 🧬 조립대
  return { steps };
}

const sumOf = (o) => Object.keys(o).reduce((a, k) => a + o[k], 0);
const meanOf = (o) => sumOf(o) / Object.keys(o).length;
const optsOf = (h) => Array.from(h.D.querySelectorAll("#prospect-body .pb-opt"));
const stateOf = (h) => h.W.WingerProspect._t.state();

/* ══════════════════════════════════════════════════════════════
 * D-0. 🎲 **드라이버가 결정적이다** — 측정 조건을 검사가 스스로 찍습니다
 * ══════════════════════════════════════════════════════════════
 * 🔴 이게 없으면 아래 B-4·B-4b는 **잡음을 재게 됩니다.**
 *    engineer가 102번 §2에서 신고한 자리예요 — 같은 시드인데 아크 점수가 판마다 달랐습니다.
 * 🔧 **양방향으로 찍습니다**: 씨를 다 뿌리면 같아야 하고, 엔진 씨를 빼면 달라야 해요.
 *    ⚠️ 뒤쪽만 보면 "원래 같은 값"이라 초록불인 검사가 됩니다. */
async function arcOf(seed, engineSeed) {
  const W = bootPage();
  const s = seedBoth(W, seed, { engine: !!engineSeed });
  const D = W.document;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what})`);
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(W, press, "R");
  const back = townAuto(W);
  pickOrigin(W, press, "seoul");
  await tapChild(W, press, "ball");                         // 🧒 초1
  passStage(W, press); passEarly(W, press);
  press(D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg");
  passStage(W, press); passEarly(W, press); passStage(W, press);
  if (back) back();
  const T = W.WingerTown;
  const out = `${T.score()}/${T.cards()} ${T.rows().map((r) => r.res[0]).join("")}`;
  W.close();
  return out;
}

(async () => {
  console.log("── 🎲 D-0. 드라이버가 결정적인가 ──");
  {
    const on = [await arcOf(7, true), await arcOf(7, true), await arcOf(7, true)];
    const off = [await arcOf(7, false), await arcOf(7, false), await arcOf(7, false)];
    const sameOn = on.every((v) => v === on[0]);
    const sameOff = off.every((v) => v === off[0]);
    check(sameOn,
      `D-0. 🎲 **씨를 다 뿌리면 아크가 판마다 똑같다** — \`Math.random\` + \`WingerEngine._t.seed()\``
      + `\n     ${on.join(" · ")}`
      + (sameOn ? "" : `\n     🔴 같은 시드인데 다릅니다 — 아래 B-4·B-4b는 **잡음을 재고 있어요**`));
    check(!sameOff,
      `D-0a. 📊 **\`_t.seed()\`를 빼면 달라진다** — \`engine.js\`가 로드 때 \`let _rng = Math.random\`으로 잡아 둬서요`
      + `\n     ${off.join(" · ")}`
      + (sameOff
        ? `\n     🔴 빼도 같습니다 — D-0이 "원래 같은 값"을 재고 있어요. 이 줄이 없으면 D-0이 껍데기입니다`
        : `\n     🔑 이 한 줄이 없으면 드라이버가 **결정적이지 않습니다** (engineer 102번 §2가 겪은 자리)`));
  }

  /* ══════════════════════════════════════════════════════════════
   * 🔢 C. **차례 표시가 거짓말하지 않는다**
   * ══════════════════════════════════════════════════════════════
   * 🚨 옛 판은 「첫 순간 카드 **앞**의 결정」만 셌습니다. 뒤에 🎯 자리·🧬 조립대가 더 있는데
   *    🗺️ 동네에서 **「3 / 3」**이 떠서 *"만들기가 끝났다"*고 약속했어요.
   *    🔑 그게 원칙 ①(화면이 거짓말하지 않는다)의 **가장 싼 형태**입니다. */
  console.log("\n── 🔢 C. 차례 표시가 거짓말하지 않는다 ──");
  let BASE_STEPS = null;
  {
    const h = boot(11);
    const r = await toBench(h, {});
    BASE_STEPS = r.steps;
    const errs = h.W.__errs.slice();
    h.close();

    const want = SCREENS.map((s) => s.id);
    const got = r.steps.map((s) => s.screen);
    check(errs.length === 0 && got.join(",") === want.join(","),
      `C-0. 🚪 **게임 입구를 통해** 만들기 화면 ${N_STEP}개를 순서대로 지난다`
      + `\n     ${r.steps.map((s, i) => `${SCREENS[i] ? SCREENS[i].what : "?"}(${s.screen})`).join(" → ")}`
      + (errs.length ? `\n     🔴 페이지 오류: ${errs[0]}` : "")
      + (got.join(",") === want.join(",") ? "" : `\n     🔴 지나온 화면이 계약과 다릅니다 — 기대 ${want.join(" → ")}`));

    const noBox = r.steps.filter((s) => !s.has);
    check(noBox.length === 0,
      `C-1. 🔢 다섯 화면 **전부**에 차례 칸(\`.step-no\`)이 있다`
      + (noBox.length
        ? `\n     🔴 칸이 없는 화면: ${noBox.map((s) => s.screen).join(", ")}`
          + `\n        🔑 칸이 없으면 \`stampStep\`이 불려도 **아무 데도 안 찍힙니다** — 실제로 그 상태였어요`
        : ""));

    const blank = r.steps.filter((s) => !s.label);
    check(blank.length === 0,
      `C-2. 🔢 다섯 화면 **전부**가 차례를 찍는다 (빈 칸 0개)`
      + `\n     ${r.steps.map((s, i) => `${SCREENS[i] ? SCREENS[i].what : "?"} "${s.label == null ? "" : s.label}"`).join(" · ")}`
      + (blank.length
        ? `\n     🔴 안 찍힌 화면: ${blank.map((s) => s.screen).join(", ")}`
          + `\n        🔑 \`STEPS\`에 그 화면 id가 없으면 \`step()\`이 **빈 문자열**을 돌려줘요 — 조용히 사라집니다`
        : ""));

    /* 🔑 **여기가 「3 / 3」을 잡는 줄입니다.** 분모가 전부 같고 분자가 1..N_STEP 순서대로예요. */
    const parsed = r.steps.map((s) => {
      const m = s.label && s.label.match(/^(\d+)\s*\/\s*(\d+)$/);
      return m ? { a: Number(m[1]), b: Number(m[2]) } : null;
    });
    const shapeOK = parsed.every((p) => !!p);
    const denoms = shapeOK ? Array.from(new Set(parsed.map((p) => p.b))) : [];
    const seqOK = shapeOK && parsed.every((p, i) => p.a === i + 1);
    check(shapeOK && denoms.length === 1 && denoms[0] === N_STEP && seqOK,
      `C-3. 🔢 분모가 **전부 ${N_STEP}**이고 분자가 **1 → ${N_STEP} 순서대로**다`
      + `\n     ${r.steps.map((s) => s.label == null ? "(없음)" : s.label).join(" · ")}`
      + (shapeOK ? "" : `\n     🔴 「k / n」 모양이 아닌 칸이 있어요`)
      + (denoms.length === 1 ? "" : `\n     🔴 분모가 여럿입니다: ${denoms.join(", ")}`)
      + (denoms.length === 1 && denoms[0] !== N_STEP
        ? `\n     🔴 분모가 ${denoms[0]}인데 실제로 지나는 만들기 화면은 **${N_STEP}개**예요`
          + `\n        🔑 이게 「3 / 3」의 정체입니다 — 화면이 "끝났다"고 약속하고 실제로는 안 끝나요`
        : "")
      + (seqOK ? "" : `\n     🔴 분자가 등장 순서와 어긋납니다`));

    /* 🔑 **관계로 씁니다** — 「N / N」은 **마지막 화면 하나만** 찍어야 해요.
     *    숫자를 안 세고 *"끝났다고 말하는 화면이 정말 끝인가"*만 봅니다.
     *    🔒 분모가 바뀌어도(키 화면이 들어와 여섯이 돼도) 이 문장은 **그대로 살아 있습니다.** */
    const last = r.steps.length - 1;
    const fullAt = r.steps.map((s, i) => ({ i, s }))
      .filter(({ s }) => { const m = s.label && s.label.match(/^(\d+)\s*\/\s*(\d+)$/); return m && m[1] === m[2]; })
      .map(({ i }) => i);
    check(fullAt.length === 1 && fullAt[0] === last,
      `C-4. 🔑 **「끝」을 말하는 화면은 마지막 하나뿐**이다 — \`N / N\`을 찍는 화면 = ${SCREENS[last].what}`
      + `\n     찍은 화면 ${fullAt.length ? fullAt.map((i) => `${SCREENS[i] ? SCREENS[i].what : "?"}(${r.steps[i].label})`).join(", ") : "없음"}`
      + (fullAt.length === 1 && fullAt[0] === last
        ? `\n     🔑 값이 아니라 **관계**예요 — 화면이 여섯이 돼도 이 문장은 살아 있습니다`
        : fullAt.length === 0
          ? `\n     🔴 아무 화면도 "끝"을 안 말합니다 — 마지막 화면이 차례를 안 찍고 있어요`
          : `\n     🔴 **끝이 아닌 화면이 "끝났다"고 말합니다** — 사람은 그걸 "만들기가 끝났다"로 읽어요`
            + `\n        (범민 님이 *"능력치 고르는 게 없어졌네…?"*로 겪은 그 자리입니다)`));
  }

  /* ══════════════════════════════════════════════════════════════
   * 🧬 B. **조립대가 두 벌을 내고 하나를 고른다**
   * ══════════════════════════════════════════════════════════════ */
  console.log("\n── 🧬 B. 조립대 2택 ──");
  let BASE_B = null;
  {
    const acc = { runs: 0, optN: new Set(), onN: new Set(), sums: new Set(), rows: new Set(),
      pboRows: new Set(), pickCost: 0, meanDrift: 0, buildMismatch: 0, ariaFlip: 0, errs: [] };
    for (const seed of SEEDS) {
      const h = boot(seed);
      await toBench(h, {});
      acc.runs += 1;
      const rb = h.D.getElementById("btn-prospect-reroll");
      for (let r = 0; r <= ROLLS; r++) {
        if (r > 0) h.press(rb, "🎲 다시 뽑기");
        const st = stateOf(h);
        const o = optsOf(h);
        acc.optN.add(o.length);
        acc.onN.add(o.filter((b) => b.getAttribute("aria-pressed") === "true").length);
        acc.rows.add(h.D.querySelectorAll("#prospect-body .pcg-row").length);
        acc.pboRows.add(h.D.querySelectorAll("#prospect-body .pbo-row").length);
        for (const p of st.picks || []) acc.sums.add(sumOf(p.stats));
        /* 🅱️를 눌러 봅니다 — 고르기는 **난수를 안 쓰고**, **종합을 안 바꿔야** 해요 */
        if (o.length >= OPTS) {
          const before = meanOf(st.build.stats);
          const i0 = h.s.i;
          h.press(o[1], "🅱️");
          if (h.s.i !== i0) acc.pickCost += 1;
          const o2 = optsOf(h);
          if (!(o2[1] && o2[1].getAttribute("aria-pressed") === "true")) acc.ariaFlip += 1;
          const st2 = stateOf(h);
          if (meanOf(st2.build.stats) !== before) acc.meanDrift += 1;
          if (JSON.stringify(st2.build.stats) !== JSON.stringify(st2.picks[st2.pick].stats)) acc.buildMismatch += 1;
          h.press(optsOf(h)[0], "🅰️");     // 되돌려 둡니다
        }
      }
      for (const e of h.W.__errs) acc.errs.push(e);
      h.close();
    }
    BASE_B = acc;
    const one = (s) => Array.from(s).sort((a, b) => a - b);
    check(acc.errs.length === 0 && one(acc.optN).join(",") === String(OPTS),
      `B-1. 🧬 \`.pb-opt\`가 **언제나 정확히 ${OPTS}개**다 (시드 ${SEEDS.length} × 🎲 ${ROLLS}번 · 잰 값 ${one(acc.optN).join("/")})`
      + (acc.errs.length ? `\n     🔴 페이지 오류: ${acc.errs[0]}` : "")
      + (one(acc.optN).join(",") === String(OPTS) ? "" : `\n     🔴 1개면 「고르기」가 죽은 것이고, 3개면 74번이 폐기한 3택이에요`));
    check(one(acc.onN).join(",") === "1",
      `B-1a. ♿ 고른 쪽이 **\`aria-pressed="true"\` 하나**로 말한다 (잰 값 ${one(acc.onN).join("/")})`
      + `\n     🔑 색으로만 말하면 낭독·고대비 사용자에게는 "안 고른 화면"입니다`);
    check(one(acc.sums).join(",") === String(POOL_WANT),
      `B-2. 📊 **두 벌 다** 총합이 정확히 ${POOL_WANT}이다 (나온 총합 ${one(acc.sums).join(" · ")})`
      + (one(acc.sums).join(",") === String(POOL_WANT)
        ? `\n     🔑 한쪽이 크면 「고르기」가 모양이 아니라 **세지는 손잡이**가 됩니다`
        : `\n     🔴 총합이 갈라졌어요 — 고르는 게 「모양」이 아니라 「크기」입니다`));
    check(one(acc.rows).join(",") === String(SLOTS) && acc.pboRows.size === 1,
      `B-3. 🌱 아래 등급 줄이 **${SLOTS}줄** 그대로다 (잰 값 ${one(acc.rows).join("/")}) · 2택 줄(\`.pbo-row\`)은 ${one(acc.pboRows).join("/")}줄로 **따로**`
      + `\n     🔑 두 이름이 같으면 *"조립대에 능력치 여섯 줄"*을 세는 검사가 ${SLOTS * (OPTS + 1)}줄을 봅니다`);
    check(acc.ariaFlip === 0 && acc.pickCost === 0 && acc.meanDrift === 0 && acc.buildMismatch === 0,
      `B-3a. 🔒 🅱️를 누르면 **표시만 뒤집히고 축은 안 움직인다**`
      + `\n     aria 안 뒤집힘 ${acc.ariaFlip}건 · 🎲 난수 소비 ${acc.pickCost}건 · 6칸 평균 바뀜 ${acc.meanDrift}건 · build↔picks 어긋남 ${acc.buildMismatch}건`
      + (acc.pickCost === 0 ? "" : `\n     🔴 고르기가 난수를 씁니다 — 고르는 건 굴리는 게 아니에요`)
      + (acc.meanDrift === 0 ? "" : `\n     🔴 고르면 6칸 평균이 바뀝니다 — ⚔️ 평가전 카드 중심(\`overall()\`)이 따라 움직여요`));
  }

  /* ══════════════════════════════════════════════════════════════
   * 🎲 B-4. **난수 소비량** — 값으로는 절대 안 보이는 자리
   * ══════════════════════════════════════════════════════════════ */
  console.log("\n── 🎲 B-4. 난수 소비량 (값이 아니라 관계로) ──");
  /* 같은 시드로 세 판을 띄워, **같은 자리에서** 세 갈래의 소비량을 견줍니다.
   *   ① 🎲 한 번 (🅰️를 고른 채)
   *   ② `rollShape` 두 번 (직접)
   *   ③ 🎲 한 번 (🅱️를 고른 채 — 고르기는 난수 0이라 자리가 같아요) */
  const COST = [];
  for (const seed of SEEDS) {
    const A = boot(seed); await toBench(A, {});
    const stA = stateOf(A);
    const mkt = stA.market.id, pos = stA.pos;
    const pA = A.s.i; A.press(A.D.getElementById("btn-prospect-reroll"), "🎲"); const cA = A.s.i - pA;
    A.close();
    /* 🧒 **게임이 부르는 그대로 부릅니다** — `childPicks`를 빼면 `focus` 배열이 짧아져
     *    `spread()`의 소비량이 **한 개 어긋납니다**(실측 15 ↔ 14). 그건 고장이 아니라
     *    **검사가 다른 모양으로 불러서** 나는 값이에요 — 「픽스처가 다른 모양」의 형태입니다.
     * 🔒 값을 박지 않고 **그 판의 세이브에서** 가져옵니다. */
    const kid = (stA.who && Array.isArray(stA.who.child)) ? stA.who.child : [];
    const B = boot(seed); await toBench(B, {});
    const pB = B.s.i;
    B.W.WingerProspect.rollShape(mkt, pos, kid); B.W.WingerProspect.rollShape(mkt, pos, kid);
    const cB = B.s.i - pB;
    B.close();
    const C = boot(seed); await toBench(C, {});
    const pC = C.s.i; C.press(optsOf(C)[1], "🅱️");
    C.press(C.D.getElementById("btn-prospect-reroll"), "🎲"); const cC = C.s.i - pC;
    C.close();
    COST.push({ seed, at: [pA, pB, pC], roll: cA, two: cB, rollB: cC });
  }
  {
    const sameAt = COST.every((c) => c.at[0] === c.at[1] && c.at[1] === c.at[2]);
    check(sameAt,
      `B-4-조건. 📊 세 갈래가 **같은 자리**에서 출발했다 (${COST.map((c) => `${c.seed}:${c.at.join("/")}`).join(" · ")})`
      + (sameAt ? "" : `\n     🔴 출발 자리가 다르면 아래 B-4는 **다른 것을 견주는** 셈입니다`));
    const ok = COST.every((c) => c.roll === c.two);
    check(ok,
      `B-4. 🔑 🎲 한 번의 난수 소비량이 **\`rollShape\` 두 번과 정확히 같다** (같은 자리에서 짝지어)`
      + `\n     ${COST.map((c) => `시드 ${c.seed}: 🎲 ${c.roll} ↔ rollShape×2 ${c.two}`).join(" · ")}`
      + (ok
        ? `\n     🔑 **횟수 「2」를 검사에 안 적었습니다** — \`rollShape\` 한 번이 쓰는 개수는 자리마다 달라요(14~16개)`
        : `\n     🔴 🎲가 \`rollShape\`를 두 번 안 부릅니다 — 굴림 횟수가 바뀌면 **뒤쪽 전부가 시드마다 어긋납니다**`));
    const okB = COST.every((c) => c.roll === c.rollB);
    check(okB,
      `B-4b. 🔑 🎲 소비량이 **「지금 어느 쪽을 고르고 있었는지」를 안 탄다**`
      + `\n     ${COST.map((c) => `시드 ${c.seed}: 🅰️뒤 ${c.roll} ↔ 🅱️뒤 ${c.rollB}`).join(" · ")}`
      + (okB
        ? `\n     🔑 이게 §18-5의 「조건과 무관하게 항상 2회」예요 — **값으로는 안 보이는 계약**입니다`
        : `\n     🔴 고른 쪽에 따라 굴림 횟수가 다릅니다 — *"한쪽이 마음에 들면 한 벌만"* 분기가 들어왔어요`));
  }

  /* ══════════════════════════════════════════════════════════════
   * 🧪 변이 검증 — 고치기 전에 **빨간불이 뜨는지** 반드시 확인합니다
   * ══════════════════════════════════════════════════════════════ */
  console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
  if (fail) {
    console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);
  }

  /* 🔢 STEPS 계열 — 라벨을 다시 걷어 와서 C-2·C-3·C-4가 어떻게 되는지 **셋 다** 잽니다. */
  async function stepsUnder(name) {
    const h = boot(11, MUT[name]);
    const r = await toBench(h, {});
    h.close();
    const labels = r.steps.map((s) => s.label);
    const parsed = labels.map((l) => { const m = l && l.match(/^(\d+)\s*\/\s*(\d+)$/); return m ? { a: +m[1], b: +m[2] } : null; });
    const blank = labels.filter((l) => !l).length;
    const denomBad = !parsed.every((p) => p && p.b === N_STEP);
    const fullAt = parsed.map((p, i) => (p && p.a === p.b ? i : -1)).filter((i) => i >= 0);
    const endLie = !(fullAt.length === 1 && fullAt[0] === labels.length - 1);
    return { labels, blank, denomBad, endLie };
  }
  for (const [name, what] of [["M_STEPS3", "🔢 `STEPS`를 3칸으로 되돌림 (= 🗺️ 동네가 다시 「3 / 3」)"],
                              ["M_NOSTAMP", "🔢 마지막 화면이 차례를 안 찍음 (`stampStep` 한 줄 삭제)"]]) {
    if (!mutOK(name)) { check(false, `🧪 **변이 ${name} — ${what}**${MUT_DEAD}`); continue; }
    const r = await stepsUnder(name);
    const caught = [["C-2 빈 칸", r.blank > 0], ["C-3 분모", r.denomBad], ["C-4 끝 거짓말", r.endLie]];
    const n = caught.filter((c) => c[1]).length;
    check(n >= 2,
      `🧪 **변이 ${name} — ${what}** → 빨간불 ${n}줄 / ${caught.length}`
      + `\n     ${caught.map(([nm, ok]) => `${ok ? "✔" : "🔴"} ${nm}`).join(" · ")}`
      + `\n     화면이 찍은 것: ${r.labels.map((l) => `"${l == null ? "" : l}"`).join(" · ")}`
      + (n >= 2 ? "" : `\n     🔴 이 되돌림이 ${caught.length - n}줄에서 안 잡힙니다 — 그 줄은 아무것도 안 지켜요`));
  }

  /* 🧬 2택 계열 */
  async function benchUnder(name, seed) {
    const h = boot(seed, MUT[name]);
    await toBench(h, {});
    const rb = h.D.getElementById("btn-prospect-reroll");
    const before = optsOf(h).length;
    const pA = h.s.i; h.press(rb, "🎲"); const cA = h.s.i - pA;
    const st = stateOf(h);
    const sums = (st.picks || []).map((p) => sumOf(p.stats));
    const after = optsOf(h).length;
    let cB = null;
    if (optsOf(h).length >= OPTS) {
      const pB = h.s.i; h.press(optsOf(h)[1], "🅱️"); h.press(rb, "🎲"); cB = h.s.i - pB;
    }
    h.close();
    return { before, after, sums, cA, cB };
  }
  {
    const name = "M_PICK1";
    if (!mutOK(name)) check(false, `🧪 **변이 M-PICK1 — 🧬 2택을 1택으로**${MUT_DEAD}`);
    else {
      const r = await benchUnder(name, 11);
      const caught = [["B-1 두 벌", r.before !== OPTS || r.after !== OPTS]];
      check(caught.every((c) => c[1]),
        `🧪 **변이 M-PICK1 — 🧬 2택을 1택으로** (\`open()\`·\`rollPair\` 양쪽) → B-1이 빨간불`
        + `\n     \`.pb-opt\` 처음 ${r.before}개 · 🎲 뒤 ${r.after}개 (계약 ${OPTS}개)`
        + (caught.every((c) => c[1])
          ? `\n     ✔ engineer가 되돌려 본 그 변경입니다 — 그때는 검사 20종이 **전부 초록불**이었어요`
          : `\n     🔴 1택으로 되돌렸는데 안 잡힙니다`));
    }
  }
  {
    const name = "M_PICKBIG";
    if (!mutOK(name)) check(false, `🧪 **변이 M-PICKBIG — 한쪽 벌의 총합을 키움**${MUT_DEAD}`);
    else {
      const r = await benchUnder(name, 11);
      const bad = r.sums.some((v) => v !== POOL_WANT);
      check(bad,
        `🧪 **변이 M-PICKBIG — 한쪽 벌의 총합을 ${POOL_WANT + 6}으로** → B-2가 빨간불`
        + `\n     🎲 뒤 두 벌의 총합 ${r.sums.join(" / ")} (계약 ${POOL_WANT} / ${POOL_WANT})`
        + (bad ? `\n     ✔ 「고르기」가 세지는 손잡이가 되는 순간을 잡습니다` : `\n     🔴 총합이 갈라졌는데 안 잡혀요`));
    }
  }
  {
    const name = "M_PICKCOND";
    if (!mutOK(name)) check(false, `🧪 **변이 M-PICKCOND — 굴림 횟수가 고른 쪽을 탐**${MUT_DEAD}`);
    else {
      const r = await benchUnder(name, 11);
      /* 🔑 **값 쪽이 멀쩡한지도 같이 찍습니다** — 그게 이 변이의 요점이에요.
       *    두 벌 다 나오고 총합도 194인데 소비량만 갈립니다. */
      const valueLooksFine = r.before === OPTS && r.after === OPTS && r.sums.every((v) => v === POOL_WANT);
      const costCaught = r.cB != null && r.cA !== r.cB;
      check(costCaught && valueLooksFine,
        `🧪🔑 **변이 M-PICKCOND — 🅱️를 고른 채로는 한 벌만 굴림** → **B-4b만** 빨간불`
        + `\n     🅰️뒤 소비 ${r.cA} ↔ 🅱️뒤 소비 ${r.cB} (달라야 잡힙니다)`
        + `\n     값 쪽: \`.pb-opt\` ${r.after}개 · 총합 ${r.sums.join("/")} — ${valueLooksFine ? "🟢 **멀쩡해 보입니다**" : "🔴 값도 갈렸어요"}`
        + (costCaught
          ? `\n     ✔ **값만 보는 검사는 이걸 절대 못 잡습니다** — 그래서 소비량을 잽니다 (102번 §5 ⓓ)`
          : `\n     🔴 소비량이 안 갈립니다 — B-4b가 아무것도 안 지켜요`)
        + (valueLooksFine ? "" : `\n     🟡 값 쪽도 갈렸어요 — 이 변이가 재려던 것보다 넓게 흔들고 있습니다`));
    }
  }

  /* ---------- 마무리 ---------- */
  console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
  console.log("\n✅ 통과");
  process.exit(0);
})();
