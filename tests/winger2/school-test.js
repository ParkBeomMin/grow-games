/* 🏫 ⚽ 더 윙어 II — **초·중·고 3단계 아크의 구조** (S-6 · S-7 · S-8 · S-9)
 *
 * 🔴 **이 파일이 생기기 전까지 이 자리를 지키는 검사가 0건이었습니다.**
 *    engineer가 새 계약을 하나씩 되돌린 **여덟 변이 중 「이번 계약을 지켜서」 잡힌 것이
 *    0개**였어요 (`96_engineer_school-stages.md` §6-1). 곁불로 빨개진 둘(M-6·M-7)도
 *    *"카드 수가 8이다"*를 지켜서가 아니라 픽스처 생성기의 흐름이 끊겨서였습니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-09-01 · designer 93번 §5 · engineer 96번 §1·§2-2·§6-2 S-6~S-8)
 *
 *   · 🏫 **한 화면(`#screen-town`)이 세 번** 열립니다 — `data-stage`가 `e`/`m`/`h`
 *   · 🃏 카드는 **초등 2 · 중등 3 · 고등 3 = 여덟 장**
 *   · 🔴 **초등부에는 포지션이 없습니다.** 🎯 자리는 초등부 **뒤 · 중등부 앞**이에요
 *   · 🎮 그래서 초등은 `MINI[kind].mf`(각 종류의 대표 하나 = 3종)를 읽고, `cutin`이
 *     **안 열립니다.** 중등부터 내 자리의 배정표(4종)가 열려요
 *   · 🃏 초등 2장은 3종 중 **둘을 균등하게** 뽑습니다 — 한 종류로 쏠리면 §7의 `fit`이
 *     한 나라로 기웁니다 (설계 93번 §8-2)
 *   · 📏 등급을 정하는 것은 **편차 `d = 점수 − 뛴 카드 수`**이지 절대 점수가 아니에요
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들 — 값을 고치기 전에 이 파일을 먼저 여세요**
 *   · 🔴 **카드 수 2/3/3은 designer가 아직 만질 수 있습니다** (93번이 *"길어지면 2/2/2로
 *     내리세요"*라고 적어 뒀어요). 그때 고칠 곳은 **S-6의 `STAGE_PLAN` 한 줄**입니다 —
 *     나머지(단계 셋 · 화면 순서 · 초등에 자리 없음 · 편차)는 그대로 살아요
 *   · 「초등에도 자리를 주자」는 판정이 나오면 **S-8이 통째로 옛 계약**이 됩니다
 *   · 「절대 점수로 돌아가자」는 판정이 나오면 **S-9가 옛 계약**이에요
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(2/3/3 · 8 · ⅓ · ±3% · "cutin")은 여기 박습니다.** `_t.STAGES`나 `_t.TOTAL_CARDS`를
 *      읽어 오면 **표를 갈아도 검사가 따라가서 아무것도 안 잡혀요**
 *   ③ **게임 입구를 통해** — 타이틀부터 실제 버튼을 눌러 갑니다
 *      (pointerdown → pointerup → click · 🦶 주발의 320ms도 실제로 기다립니다)
 *   ④ **시드 하나로 안 잽니다** — S-6·S-9는 시드 여럿을 각각 찍습니다
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인하고, **변이 전에 기준선이 초록불인지** 찍습니다
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가로 넘겼습니다:
 *     단계마다 무대가 커져 보이는지(공터 → 운동장 → 관중석) · `data-stage`에 붙을 CSS ·
 *     여덟 판이 실기기에서 몇 분인지 · 초등 미니게임 3종이 「쉬워 보이는지」.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 */
"use strict";
const { bootPage, pageMutsOK, townAuto, passStage, passEarly, tapFoot, pickOrigin }
  = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const STAGE_PLAN = [["e", 2], ["m", 3], ["h", 3]];   // 🏫 초등 2 · 중등 3 · 고등 3 (카-A)
const STAGE_SEQ = "eemmmhhh";                        // 🏫 카드마다 읽히는 단계
const ARC_CARDS = 8;
/* 🧭 **카-B(2/2/2)** — S-6b가 *"`n`을 바꾸면 덱이 따라 움직이는가"*를 잴 때 쓰는 다음 배치예요.
 *    🔒 **여기도 검사에 박습니다.** `_t.STAGES`에서 읽어 오면 배선이 끊겨도 검사가 따라갑니다. */
const STAGE_PLAN_B = [["e", 2], ["m", 2], ["h", 2]];
const STAGE_SEQ_B = "eemmhh";
const ARC_CARDS_B = 6;
/* 🎯 화면 순서 — 🔑 **자리가 초등부 「뒤」**라는 것이 이 배열의 핵심입니다.
 * 📨 2026-09-01: 단계마다 **조기 제안(`screen-agency`)이 한 번씩** 끼었습니다 (98번).
 *    🔑 최종도 `screen-agency`예요 — 화면을 새로 안 만들었거든요(*"제안 화면에 서는 길은
 *    전부 `showOffers`를 지난다"*를 한 군데에서 지키려고). 그래서 이 배열에
 *    `screen-agency`가 **세 번** 나옵니다: 조기(e) · 조기(m) · 최종. */
const SCREEN_SEQ = ["screen-title", "screen-name", "screen-foot", "screen-origin",
  "screen-town", "screen-agency", "screen-position",
  "screen-town", "screen-agency", "screen-town", "screen-agency"];
const EARLY_STAGES = ["e", "m"];        // 📨 조기 제안이 서는 단계 (고등 뒤는 최종입니다)
const KINDS = ["g", "a", "d"];       // ⚽ 결정 · 🅰️ 전개 · 🧱 수비
const DEAL_P = 2 / 3;                // 🃏 초등 2장이 3종 중 둘 → 종류마다 ⅔
const FIRST_P = 1 / 3;               // 🃏 첫 장이 각 종류일 확률
const DEAL_EPS = 0.03;              // ±3% (아래 「왜 ±3%인가」 참고)
const DEAL_N = 60000;
const LOCKED_MOMENT = "cutin";       // 🎮 중등부터 열리는 미니게임 — 초등엔 **없어야** 합니다
const ELEM_KINDS_MAX = 3;            // 🎮 초등이 쓰는 미니게임 종류 수 (각 종류의 대표 하나)
const TIER_SHAKE = 1;                // 🎲 등급이 기준 칸에서 흔들리는 폭 (±1칸)
const SEEDS = [3, 9, 17, 27, 41];    // 🎲 시드 하나로 안 잽니다
/* 🎲 **프로브 시드 — 왜 스무 개인가.**
 *    초등 2장이 3종 중 둘이라 ⚽ 결정이 낄 확률이 ⅔이고, `MINI.goal.fw`가
 *    `["oneone","cutin"]`이라 자리가 갈라지는 건 **판마다 ⅓**입니다.
 *    🔴 시드 3개로 재면 M-POS를 **30% 확률로 놓쳐요** (실제로 놓쳤습니다).
 *    스무 개면 놓칠 확률이 (⅔)²⁰ ≈ **0.03%**입니다. 🚨 줄이지 마세요. */
const PROBE_SEEDS = [5, 13, 29, 37, 44, 51, 66, 73, 88, 95,
  101, 112, 127, 138, 145, 156, 163, 174, 181, 199];

/* ─────────────────────────────────────────────────────────────────────────
 * 📏 왜 ±3%인가 — 기준선과 변이 사이의 여유를 먼저 쟀습니다 (S-7)
 * ─────────────────────────────────────────────────────────────────────────
 *   기준선(60,000판)  종류마다 66.7% ± 0.2%     → 1σ ≈ 0.19%p, ±3%는 약 **16σ**
 *   🧪 M-DEAL 늘 ⚽🅰️  ⚽ 100% · 🅰️ 100% · 🧱 0%  → 벗어남 **33%p** (문턱의 11배)
 *   문턱이 양쪽 어디에도 안 붙어 있습니다. 🚨 0.5%로 조이면 잡음이 검사를 흔들어요.
 * ───────────────────────────────────────────────────────────────────────── */

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🧭 **탐침(변이가 아닙니다) — 카-B 배치(2/2/2).**
   *    S-6b가 *"`n`을 바꾸면 덱이 **따라 움직이는가**"*를 재려면 `n`이 다른 판이 하나 필요해요.
   *    🔑 **2/2/2는 실제 운영 손잡이입니다** — 설계가 *"아크가 길어지면 여기를 2/2/2로"*라고
   *    적어 뒀고, engineer가 `E[spotMul]`까지 미리 재 뒀어요(초/중/고 1.00020·1.00043·1.00070).
   *    그래서 이건 「고장을 심는 변이」가 아니라 **「다음 배치가 진짜로 도는지」 보는 탐침**입니다. */
  P_NB_222: { "town.js": [
    [/\{ id: "m", n: 3, title: "🏫 중등부 대항전"/, '{ id: "m", n: 2, title: "🏫 중등부 대항전"'],
    [/\{ id: "h", n: 3, title: "🏫 고등부 대항전"/, '{ id: "h", n: 2, title: "🏫 고등부 대항전"'],
  ] },
  /* 🔴🔑 **M-DECK — `n`이 덱을 정하는 배선을 끊습니다** (`const n = CARDS.length`).
   *
   *    🕳️ **여기가 2026-09-01에 「구멍을 막으니 구멍을 재던 변이가 무의미해진」 자리입니다.**
   *    직전 판에서 저는 `STAGES[].n`이 **아무 데도 안 닿는다**는 걸 찾았고(변이를 넣어도
   *    아크가 그대로 8장), 그때 S-6b는 *"선언 ↔ 실제가 **어긋나지 않는다**"*를 쟀어요.
   *    engineer가 `deal()`이 `n`을 읽게 배선하자 **둘이 한 소스가 되어 어긋날 수가 없어졌습니다**
   *    — 즉 옛 변이 M-N(`n`만 1/1/1로)은 이제 **원리적으로 못 뜹니다.** 폐기했어요.
   *    🔑 그래서 S-6b를 **한 단계 위 계약**으로 올렸습니다 — *"`n`을 바꾸면 덱이 따라 움직인다"*
   *    (CLAUDE.md의 세 번째 축 「종속값은 관계식으로」). **그 계약을 깨는 건 배선 끊기**이고,
   *    그게 이 변이입니다. 배선이 다시 끊기면 M-N도 되살아나요 —
   *    **「배선이 끊겨 있을 때만 유효한 변이」**라 지금 두면 초록불로 죽어 있습니다. */
  M_DECK_WIRE: { "town.js": [[/const n = Math\.max\(1, Math\.min\(CARDS\.length, stage\.n\)\);/,
    "const n = CARDS.length;"]] },
  /* 🔴 **M-NOPOS — 🎯 자리 화면을 건너뜁니다.** 초등 다음이 바로 중등이 되고,
   *    자리를 한 번도 안 고른 채 여덟 판이 끝나요. **오류는 하나도 안 납니다**
   *    (`o.pos`가 없으면 `ELEM_POS`로 조용히 떨어지거든요). */
  M_NOPOS_SKIP: { "game.js": [[/goSchool\("e", \(\) => goEarly\("e", goPosition\)\)/,
    'goSchool("e", () => goEarly("e", goMiddle))']] },
  /* 🔴 **M-DEAL — 초등이 늘 같은 짝(⚽🅰️)을 뽑습니다.** 🧱 수비가 초등에 안 나와요.
   *    §7의 `fit`이 한 나라로 쏠립니다 (설계 93번 §8-2 ⚠️). */
  M_DEAL_FIX: { "town.js": [[/const j = i \+ Math\.floor\(Math\.random\(\) \* \(idx\.length - i\)\);/,
    "const j = i;"]] },
  /* 🔴🔑 **M-POS — 초등이 🎯 자리를 봅니다.** 「추천」의 뒷문이 열리고 `cutin`이 초등에
   *    나옵니다. 🔴 **지금 흐름에서는 `chosenPos`가 아직 없어서 게임 입구로는 증상이
   *    안 나와요** — 그래서 S-8이 `openStage(id, {pos}, done)`라는 **문서화된 창구 계약**을
   *    직접 겨눕니다 (그 계약이 죽으면 순서를 한 번만 바꿔도 뒷문이 열립니다). */
  M_POS_ELEM: { "town.js": [[/const pos = stage\.id === "e" \? ELEM_POS : \(o\.pos \|\| ELEM_POS\);/,
    "const pos = o.pos || ELEM_POS;"]] },
  /* 🔴🔑 **M-ABS — 등급을 편차가 아니라 절대 점수로 정합니다.** 설계 93번 §9가
   *    *"진행 중인 커리어가 전부 ×0.90으로 조용히 내려갑니다"*라고 적은 그 자리예요. */
  M_ABS_SCORE: { "town.js": [[/rollOffers\(deviation\(\)\)/, "rollOffers(state.score)"]] },
};

{
  const bad = pageMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `0. 변이·탐침 정규식 ${n}개가 지금 beta/winger2/에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}
const mutOK = (name) => pageMutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

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
  if (opt.seed != null) {
    W.Math.random = mulberry32(opt.seed);
    if (W.WingerEngine && W.WingerEngine._t) W.WingerEngine._t.seed(opt.seed);
  }
  const D = W.document;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  return { W, D, press,
    active: () => (D.querySelector(".screen.active") || {}).id,
    close: () => W.close() };
}

/* 🚪 **게임 입구를 통해** 아크 전체를 지나며, 카드마다 단계와 화면을 기록합니다. */
async function runArc(muts, seed, pos) {
  const h = boot({ muts, seed });
  const seen = [];
  const mark = () => { const id = h.active(); if (seen[seen.length - 1] !== id) seen.push(id); };
  mark();
  h.press(h.D.getElementById("btn-new"), "btn-new");
  mark();
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  mark();
  await tapFoot(h.W, h.press, "R");
  mark();
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, "seoul");
  mark();
  const stages = passStage(h.W, h.press);                    // 🏫 초등부
  mark();
  const early = [];
  /* 📨 조기 제안은 **늘 거절**합니다 — 승낙하면 최종에 한 곳만 와서 아크 계약이 어긋나요.
   *    🤝 승낙 갈래는 `offer-test.js`가 따로 몰고 갑니다. */
  if (passEarly(h.W, h.press)) early.push("e");
  mark();
  if (h.active() === "screen-position")
    h.press(h.D.querySelector(`#position-list .card[data-pos="${pos || "wg"}"]`), `🎯 ${pos || "wg"}`);
  mark();
  stages.push(...passStage(h.W, h.press));                   // 🏫 중등부
  mark();
  if (passEarly(h.W, h.press)) early.push("m");
  mark();
  stages.push(...passStage(h.W, h.press));                   // 🏫 고등부
  mark();
  back();
  const T = h.W.WingerTown;
  const r = {
    seed, seen, stages, early, cards: stages.length, screen: h.active(),
    score: T.score(), n: T.cards(), dev: T.deviation(),
    base: T._t.tierOfD(T.deviation()),
    tiers: h.W.__get("MARKETS").map((m) => T.offerFor(m.id).tier),
  };
  h.close();
  return r;
}

/* 🔴 **여기부터는 `async`입니다** — 🦶 주발이 320ms 뒤에 넘어가서 실제로 기다려야 하거든요.
 * CommonJS라 최상위 `await`을 못 씁니다(쓰면 node가 파일을 ESM으로 읽어 `require`가 죽어요). */
async function main() {

/* ══════════════════════════════════════════════════════════════════════
 * S-6. 🏫 **아크가 여덟 장 · 단계가 셋 · 자리가 초등부 뒤**
 * ══════════════════════════════════════════════════════════════════════ */
console.log("── 🏫 S-6. 아크 구조 (게임 입구로) ──");
async function s6(muts) {
  const rows = [];
  for (const s of SEEDS.slice(0, 3)) rows.push(await runArc(muts, s, "wg"));
  return rows;
}
{
  const rows = await s6(null);
  const seqOK = rows.every((r) => r.stages.join("") === STAGE_SEQ);
  const perStage = STAGE_PLAN.map(([id, n]) =>
    [id, n, rows.map((r) => r.stages.filter((x) => x === id).length)]);
  const countOK = perStage.every(([, n, got]) => got.every((v) => v === n));
  check(seqOK && countOK && rows.every((r) => r.cards === ARC_CARDS && r.screen === "screen-agency"),
    `S-6. 🏫 **아크가 \`${STAGE_SEQ}\` 여덟 장**이다 — 초등 ${STAGE_PLAN[0][1]} · 중등 ${STAGE_PLAN[1][1]} · 고등 ${STAGE_PLAN[2][1]}`
    + `\n     ${rows.map((r) => `시드 ${r.seed}: [${r.stages.join("")}] ${r.cards}장 → ${r.screen}`).join("\n     ")}`
    + `\n     단계별: ${perStage.map(([id, n, got]) => `${id} ${got.join("/")}장(계약 ${n})`).join(" · ")}`
    + (seqOK && countOK ? "" : `\n     🔴 단계 열이 계약과 달라요 — 카드 수를 바꿨다면 \`STAGE_PLAN\`·\`STAGE_SEQ\` 두 줄을 같이 고치세요`));

  const seqScreens = rows.map((r) => r.seen.join(" → "));
  const same = seqScreens.every((x) => x === SCREEN_SEQ.join(" → "));
  check(same,
    `S-6a. 🎯 **화면 순서 — 🎯 자리가 🏫 초등부 「뒤」, 🏫 중등부 「앞」**에 온다`
    + `\n     계약: ${SCREEN_SEQ.join(" → ")}`
    + `\n     ${rows.map((r) => `시드 ${r.seed}: ${r.seen.join(" → ")}`).join("\n     ")}`
    + (same
      ? `\n     🔑 초등부가 자리보다 앞이라 **초등에는 자리가 없습니다** — S-8이 그걸 지켜요`
        + `\n     📨 조기 제안이 단계마다 한 번씩 낍니다 — 지난 단계 [${rows[0].early.join(" · ")}] (계약 ${EARLY_STAGES.join(" · ")})`
      : `\n     🔴 순서가 달라요 — 자리가 앞으로 가면 「추천」의 뒷문이 열리고, 뒤로 가면 자리를 못 고릅니다`));

  /* ══════════════════════════════════════════════════════════════════
   * 🔑 S-6b. **`n`을 바꾸면 덱이 따라 움직인다** (종속값을 관계로)
   * ══════════════════════════════════════════════════════════════════
   * 🕳️ **이 줄은 2026-09-01에 한 단계 「위」로 올라왔습니다.**
   *    직전 판에서 저는 `STAGES[].n`이 **아무 데도 안 닿는다**는 걸 찾았어요 — `deal()`이
   *    `n`을 안 읽어서, 주석이 *"아크가 길면 여기 `n`을 2/2/2로 내리세요"*라고 적어 뒀는데
   *    **아무 일도 안 났습니다.** 그때 S-6b는 *"선언 ↔ 실제가 어긋나지 않는다"*를 쟀죠.
   *    engineer가 배선을 붙이자 **둘이 한 소스가 되어 어긋날 수가 없어졌고**, 그 순간
   *    옛 변이(M-N · `n`만 1/1/1로)는 **원리적으로 못 뜨는 변이**가 됐습니다.
   *
   * 🔴 **구멍을 막으면, 그 구멍을 재던 검사는 지우는 게 아니라 올려야 합니다.**
   *    「어긋나지 않는다」(정적 일치)는 배선이 끊겨 있을 때만 의미가 있었고,
   *    이제 진짜 계약은 **「따라 움직인다」**(응답)예요 — 그리고 그게 **실제 운영 손잡이**입니다.
   *    🧭 그래서 카-B(2/2/2)로 한 판 더 띄워 **덱과 아크가 같이 줄어드는지** 봅니다.
   *    🔒 두 배치(2/3/3 · 2/2/2)를 **검사에 박아** 뒀어요 — 소스에서 읽으면 안 잡힙니다. */
  const declOf = (h) => h.W.WingerTown._t.STAGES.map((x) => [x.id, x.n]);
  const hA = boot({ seed: SEEDS[0] });
  const declA = declOf(hA);
  hA.close();
  const actualA = STAGE_PLAN.map(([id]) => [id, rows[0].stages.filter((x) => x === id).length]);
  const rowsB = await s6(MUT.P_NB_222);
  const hB = boot({ seed: SEEDS[0], muts: MUT.P_NB_222 });
  const declB = declOf(hB);
  hB.close();
  const actualB = STAGE_PLAN_B.map(([id]) => [id, rowsB[0].stages.filter((x) => x === id).length]);

  const eq = (got, want) => got.length === want.length
    && got.every(([id, n], i) => id === want[i][0] && n === want[i][1]);
  const aOK = eq(declA, STAGE_PLAN) && eq(actualA, STAGE_PLAN)
    && rows.every((r) => r.cards === ARC_CARDS);
  const bOK = eq(declB, STAGE_PLAN_B) && eq(actualB, STAGE_PLAN_B)
    && rowsB.every((r) => r.cards === ARC_CARDS_B && r.stages.join("") === STAGE_SEQ_B);
  const fmt = (x) => x.map(([id, n]) => `${id}:${n}`).join(" · ");
  check(aOK && bOK,
    `S-6b. 🔑 **\`n\`을 바꾸면 덱이 따라 움직인다** — 선언이 곧 덱이다 (종속값을 관계로)`
    + `\n     카-A 선언 ${fmt(declA)} → 실제 ${fmt(actualA)} · 아크 ${rows[0].cards}장 ${aOK ? "✔" : "🔴"}`
    + `\n     카-B 선언 ${fmt(declB)} → 실제 ${fmt(actualB)} · 아크 ${rowsB[0].cards}장 [${rowsB[0].stages.join("")}] ${bOK ? "✔" : "🔴"}`
    + (aOK && bOK
      ? `\n     🔑 **\`n\`이 진짜 손잡이입니다** — 아크가 길어지면 여기를 내리면 됩니다 (설계 93번)`
        + `\n     ⚠️ 옛 S-6b(*"선언 ↔ 실제가 어긋나지 않는다"*)는 배선이 붙은 뒤 **깨질 수가 없어져** 폐기했어요`
      : `\n     🔴 \`n\`을 내렸는데 덱이 안 따라와요 — 손잡이가 아무 데도 안 닿습니다`));
}

/* ══════════════════════════════════════════════════════════════════════
 * S-7. 🃏 **초등 2장이 3종 중 둘을 「균등하게」 뽑는다**
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 🃏 S-7. 초등 뽑기가 균등 ──");
function dealStats(muts, seed) {
  const h = boot({ muts, seed });
  const T = h.W.WingerTown;
  const stage = T._t.STAGES[0];
  const cnt = {}, first = {}, pairCnt = {};
  for (const k of KINDS) { cnt[k] = 0; first[k] = 0; }
  for (let i = 0; i < DEAL_N; i++) {
    const deck = T._t.deal(stage);
    const keys = deck.map((c) => c.key);
    for (const k of keys) cnt[k] = (cnt[k] || 0) + 1;
    first[keys[0]] = (first[keys[0]] || 0) + 1;
    const p = keys.slice().sort().join("");
    pairCnt[p] = (pairCnt[p] || 0) + 1;
    if (keys.length !== 2) { cnt.__bad = (cnt.__bad || 0) + 1; }
  }
  h.close();
  return { cnt, first, pairCnt, n: DEAL_N };
}
{
  const r = dealStats(null, SEEDS[0]);
  const rate = (k) => (r.cnt[k] || 0) / r.n;
  const okKind = KINDS.every((k) => Math.abs(rate(k) - DEAL_P) <= DEAL_EPS);
  const okFirst = KINDS.every((k) => Math.abs((r.first[k] || 0) / r.n - FIRST_P) <= DEAL_EPS);
  check(okKind && okFirst && !r.cnt.__bad,
    `S-7. 🃏 초등 2장이 **3종을 균등하게** 뽑는다 — 종류마다 ${(DEAL_P * 100).toFixed(1)}% ± ${(DEAL_EPS * 100).toFixed(0)}% (${r.n.toLocaleString()}판)`
    + `\n     등장률 ${KINDS.map((k) => `${k}:${(rate(k) * 100).toFixed(2)}%`).join(" · ")}`
    + `\n     첫 장 ${KINDS.map((k) => `${k}:${((r.first[k] || 0) / r.n * 100).toFixed(2)}%`).join(" · ")} (계약 ${(FIRST_P * 100).toFixed(1)}% ± ${(DEAL_EPS * 100).toFixed(0)}%)`
    + `\n     짝 ${Object.keys(r.pairCnt).sort().map((p) => `${p}:${(r.pairCnt[p] / r.n * 100).toFixed(1)}%`).join(" · ")}`
    + (okKind && okFirst
      ? `\n     🔑 한 종류로 쏠리면 §7의 \`fit\`이 **한 나라만 자주 오게** 됩니다 (설계 93번 §8-2)`
      : `\n     🔴 균등이 깨졌어요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * S-8. 🔴 **초등에 🎯 자리가 안 닿는다** — `cutin`이 안 열리고, 자리를 바꿔도 그대로
 *
 * 🔑 **왜 게임 입구가 아니라 `openStage` 창구를 겨누는가**
 *    지금 흐름에서는 초등부가 🎯 자리 **앞**이라 `chosenPos`가 아직 `null`입니다.
 *    그래서 「초등이 자리를 본다」는 버그를 심어도 **게임 입구로는 증상이 안 나와요**
 *    (`o.pos`가 없으면 `ELEM_POS`로 조용히 떨어지거든요).
 *    🔒 그런데 그 안전은 **순서 하나에만** 기대고 있습니다 — 순서가 한 번 바뀌면
 *       그날 바로 뒷문이 열려요. 그래서 `town.js` 머리말이 계약으로 적어 둔
 *       *"초등부는 `opts.pos`를 안 봅니다"*를 **그 창구에 직접** 겁니다.
 *       순서 쪽은 S-6a가 따로 지킵니다 — **둘이 짝**이에요.
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 🎮 S-8. 초등에 자리가 안 닿는다 ──");
/* 🎮 `W2Moment.play`를 **기록기로 바꿔** 게임이 건네는 미니게임 이름을 그대로 받습니다.
 *    판정은 게임이 자동 진행에서 쓰는 그 갈래(`ctx.judge(0.5)`)를 그대로 불러요 —
 *    산식을 우회하지 않습니다. 🔴 자동 진행은 **끕니다**(켜면 `play`가 아예 안 불려요). */
/* 🔑 **한 시드 = 창 하나.** 네 벌(초등 fw/df · 중등 fw/df)을 **같은 창에서** 굴리고
 *    매번 난수를 같은 자리로 되감아요 — 그래야 fw와 df가 **똑같은 난수 열**을 보고,
 *    차이가 나면 그건 오직 **자리 때문**입니다. */
function probeSeed(muts, seed) {
  const h = boot({ muts, seed });
  const T = h.W.WingerTown;
  const one = (stageId, pos) => {
    h.W.Math.random = mulberry32(seed);
    if (h.W.WingerEngine && h.W.WingerEngine._t) h.W.WingerEngine._t.seed(seed);
    const rec = [];
    h.W.W2Moment = { play: (el, ctx, cb) => { rec.push({ kind: ctx.kind, moment: ctx.moment }); cb(ctx.judge(0.5)); } };
    T.reset();
    let done = false;
    T.openStage(stageId, { pos, foot: "R" }, () => { done = true; });
    for (let g = 0; g < 12 && !done; g++) {
      const b = h.D.getElementById("btn-town-next");
      if (!b || b.disabled || b.classList.contains("hidden")) break;
      h.press(b, "🏫 다음");
    }
    return rec;
  };
  const r = { seed, fw: one("e", "fw"), df: one("e", "df"), mFw: one("m", "fw"), mDf: one("m", "df") };
  h.close();
  return r;
}
const sig = (r) => r.map((x) => `${x.kind}/${x.moment}`).join(",");
{
  const rows = PROBE_SEEDS.map((s) => probeSeed(null, s));
  const elemDiff = rows.filter((r) => sig(r.fw) !== sig(r.df));
  const midDiff = rows.filter((r) => sig(r.mFw) !== sig(r.mDf));
  const elemSame = elemDiff.length === 0 && rows.every((r) => r.fw.length > 0);
  check(elemSame,
    `S-8. 🔴 **초등부는 \`opts.pos\`를 안 본다** — 자리를 fw ↔ df로 바꿔도 미니게임 열이 **정확히 같다**`
    + ` (시드 ${rows.length}개 · 같은 난수 열)`
    + `\n     갈라진 시드 ${elemDiff.length}개${elemDiff.length ? ": " + elemDiff.slice(0, 3).map((r) => `${r.seed} fw[${sig(r.fw)}] ≠ df[${sig(r.df)}]`).join(" · ") : ""}`
    + `\n     보기 — 시드 ${rows[0].seed}: fw[${sig(rows[0].fw)}]`
    + (elemSame ? "" : `\n     🔴 자리가 초등 미니게임을 정하고 있어요 — 「추천」의 뒷문입니다`));
  check(midDiff.length > 0,
    `S-8-조건. 📊 **같은 비교를 🏫 중등부에 하면 달라야** 한다 — 안 그러면 위 줄은 "자리가 원래 아무 데도 안 닿아서 통과"예요`
    + `\n     갈라진 시드 ${midDiff.length}/${rows.length}개 — 보기: ${midDiff.length ? `${midDiff[0].seed} fw[${sig(midDiff[0].mFw)}] ≠ df[${sig(midDiff[0].mDf)}]` : "(없음)"}`
    + (midDiff.length ? `\n     🔑 중등부터는 자리가 배정표를 정합니다 — 그래서 S-8이 공허하지 않아요` : ""));

  const elemMoments = new Set();
  const midMoments = new Set();
  for (const r of rows) {
    for (const x of r.fw.concat(r.df)) elemMoments.add(x.moment);
    for (const x of r.mFw.concat(r.mDf)) midMoments.add(x.moment);
  }
  const noLock = !elemMoments.has(LOCKED_MOMENT);
  const midHas = midMoments.has(LOCKED_MOMENT);
  check(noLock && elemMoments.size <= ELEM_KINDS_MAX,
    `S-8a. 🎮 초등 미니게임에 **\`${LOCKED_MOMENT}\`이 안 열린다** — 대표 ${ELEM_KINDS_MAX}종뿐이다`
    + `\n     초등: ${Array.from(elemMoments).sort().join(" · ")} (${elemMoments.size}종)`
    + `\n     중등: ${Array.from(midMoments).sort().join(" · ")} ${midHas ? `— \`${LOCKED_MOMENT}\`이 실제로 열려요 ✔` : `🔴 \`${LOCKED_MOMENT}\`이 중등에도 안 열려요 (측정 조건이 안 섰습니다)`}`
    + (noLock ? "" : `\n     🔴 초등에 \`${LOCKED_MOMENT}\`이 열렸어요 — 설계가 말한 「초등 3종 → 중등부터 4종 해금」이 깨졌습니다`));
  check(midHas,
    `S-8a-조건. 📊 \`${LOCKED_MOMENT}\`이 🏫 중등부에서는 **실제로 열린다** (안 열리면 S-8a는 "원래 아무 데도 없어서 통과")`);
}

/* ══════════════════════════════════════════════════════════════════════
 * S-9. 📏 **등급의 기준 칸이 `tierOfD(편차)`다** — 절대 점수가 아니다
 *
 * 🔑 **관계로 봅니다.** 등급은 ±1칸 흔들리니 값 하나를 못 박을 수 없어요 —
 *    대신 *"5곳이 전부 `tierOfD(d)` ±1 안에 있다"*가 계약입니다.
 *    카드 수가 2/3/3에서 바뀌어도, 밴드 경계가 옮겨져도 이 문장은 그대로 살아요.
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 📏 S-9. 등급이 편차를 따라간다 ──");
async function s9(muts) {
  const rows = [];
  for (const s of SEEDS) rows.push(await runArc(muts, s, "wg"));
  return rows;
}
{
  const rows = await s9(null);
  const inWin = (r) => r.tiers.every((t) => t >= r.base - TIER_SHAKE && t <= r.base + TIER_SHAKE);
  const devOK = rows.every((r) => r.dev === r.score - r.n);
  check(rows.every(inWin) && devOK,
    `S-9. 📏 5곳의 제안 등급이 전부 **\`tierOfD(편차)\` ±${TIER_SHAKE}칸** 안에 있다 (시드 ${rows.length}개)`
    + `\n     ${rows.map((r) => `시드 ${r.seed}: ${r.score}점/${r.n}판 → 편차 ${r.dev > 0 ? "+" : ""}${r.dev} · 기준 칸 ${r.base} · 등급 [${r.tiers.join("")}] ${inWin(r) ? "✔" : "🔴"}`).join("\n     ")}`
    + `\n     그리고 \`deviation() === score() − cards()\` ${devOK ? "✔" : "🔴"}`
    + (rows.every(inWin) && devOK ? "" : `\n     🔴 등급이 편차를 안 따라가요`));
  /* 📊 측정 조건 — 편차가 낮은 판(기준 칸 ≤ 1)이 실제로 있어야 M-ABS가 **반드시** 잡힙니다.
   *    절대 점수(= 편차 + 8)를 쓰면 기준 칸이 4로 튀는데, 기준 칸이 3~4인 판에서는
   *    ±1 창이 그걸 덮어 버려요. 그래서 **어느 판에서 잡히는지를 검사가 스스로 찍습니다.** */
  const low = rows.filter((r) => r.base <= 1);
  check(low.length > 0,
    `S-9-조건. 📊 기준 칸이 ${1} 이하인 판이 시드 ${rows.length}개 중 **${low.length}개** 있다`
    + ` (${rows.map((r) => `${r.seed}:칸${r.base}`).join(" · ")})`
    + `\n     🔑 아래 M-ABS 판정은 **그 판들에서만** 확정적이에요 — 없으면 변이 검증이 운에 걸립니다`);
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — 고치기 전에 **빨간불이 뜨는지** 반드시 확인합니다
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
if (fail) {
  console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);
}

/* 🧪🔑 M-DECK — `n`이 덱을 정하는 배선을 끊음. **S-6 · S-6b · S-7**이 갈려야 합니다.
 *    🔑 옛 변이 M-N(`n`만 1/1/1로)은 배선이 붙으면서 **원리적으로 못 뜨게** 되어 폐기했어요 —
 *       표와 덱이 한 소스라 같이 움직입니다. 초록불이 **맞습니다**(§S-6b 주석). */
if (!mutOK("M_DECK_WIRE")) check(false, `🧪 **변이 M-DECK — \`n\` 배선 끊기**${MUT_DEAD}`);
else {
  const rows = await s6(MUT.M_DECK_WIRE);
  const st = dealStats(MUT.M_DECK_WIRE, SEEDS[0]);
  const h = boot({ muts: MUT.M_DECK_WIRE, seed: SEEDS[0] });
  const decl = h.W.WingerTown._t.STAGES.map((x) => `${x.id}:${x.n}`).join(" · ");
  h.close();
  const arcBroke = rows.every((r) => r.stages.join("") !== STAGE_SEQ || r.cards !== ARC_CARDS);
  const elemBroke = KINDS.some((k) => Math.abs((st.cnt[k] || 0) / st.n - DEAL_P) > DEAL_EPS);
  check(arcBroke && elemBroke,
    `🧪🔑 **변이 M-DECK — \`const n = CARDS.length\`로 \`n\` 배선을 끊음** → S-6 · S-6b · S-7이 빨간불`
    + `\n     선언 ${decl} · 실제 ${rows.map((r) => `[${r.stages.join("")}] ${r.cards}장`).join(" · ")}`
    + `\n     초등 등장률 ${KINDS.map((k) => `${k}:${((st.cnt[k] || 0) / st.n * 100).toFixed(1)}%`).join(" · ")}`
    + (arcBroke && elemBroke
      ? `\n     ✔ 초등이 3장이 되어 아크가 9장이 되고, 3종이 **매판 전부** 나옵니다`
        + `\n     🔑 배선이 끊기면 옛 M-N도 되살아나요 — **「배선이 끊겨 있을 때만 유효한 변이」**였습니다`
      : `\n     🔴 배선을 끊었는데 초록불이에요`));
}

/* 🧪 M-NOPOS — 🎯 자리 화면을 건너뜀. S-6a가 갈려야 합니다. */
if (!mutOK("M_NOPOS_SKIP")) check(false, `🧪 **변이 M-NOPOS — 🎯 자리 화면을 건너뜀**${MUT_DEAD}`);
else {
  const rows = await s6(MUT.M_NOPOS_SKIP);
  const broke = rows.every((r) => !r.seen.includes("screen-position"));
  check(broke,
    `🧪 **변이 M-NOPOS — 🎯 자리 화면을 건너뜀** → S-6a가 빨간불`
    + `\n     ${rows.map((r) => `시드 ${r.seed}: ${r.seen.join(" → ")}`).join("\n     ")}`
    + (broke
      ? `\n     ✔ 자리를 한 번도 안 고르는데 **오류가 하나도 안 납니다** — 조용히 실패하는 자리예요`
      : `\n     🔴 화면을 건너뛰었는데 초록불이에요 — S-6a가 아무것도 안 지킵니다`));
}

/* 🧪 M-DEAL — 부분 Fisher-Yates의 **섞기를 없앰**(`j = i`). S-7이 갈려야 합니다. */
if (!mutOK("M_DEAL_FIX")) check(false, `🧪 **변이 M-DEAL — 초등 뽑기의 섞기를 없앰**${MUT_DEAD}`);
else {
  const r = dealStats(MUT.M_DEAL_FIX, SEEDS[0]);
  const rate = (k) => (r.cnt[k] || 0) / r.n;
  const broke = KINDS.some((k) => Math.abs(rate(k) - DEAL_P) > DEAL_EPS);
  check(broke,
    `🧪 **변이 M-DEAL — 🃏 초등 뽑기의 섞기를 없앰(\`j = i\`)** → S-7이 빨간불`
    + `\n     등장률 ${KINDS.map((k) => `${k}:${(rate(k) * 100).toFixed(1)}%`).join(" · ")} (계약 ${(DEAL_P * 100).toFixed(1)}% ± ${(DEAL_EPS * 100).toFixed(0)}%)`
    + (broke ? `\n     ✔ 🧱 수비가 초등에서 사라졌어요 — 벗어난 폭이 문턱의 11배입니다` : `\n     🔴 고정했는데 초록불이에요`));
}

/* 🧪🔑 M-POS — 초등이 자리를 봄. S-8·S-8a가 갈려야 합니다. */
if (!mutOK("M_POS_ELEM")) check(false, `🧪 **변이 M-POS — 초등이 🎯 자리를 봄**${MUT_DEAD}`);
else {
  const rows = PROBE_SEEDS.map((s) => probeSeed(MUT.M_POS_ELEM, s));
  const diff = rows.filter((r) => sig(r.fw) !== sig(r.df));
  const lock = rows.filter((r) => r.fw.concat(r.df).some((x) => x.moment === LOCKED_MOMENT));
  check(diff.length > 0 && lock.length > 0,
    `🧪🔑 **변이 M-POS — 초등이 \`opts.pos\`를 봄** → S-8·S-8a가 빨간불 (시드 ${rows.length}개)`
    + `\n     자리에 따라 갈라진 시드 **${diff.length}개** — 보기: ${diff.length ? `${diff[0].seed} fw[${sig(diff[0].fw)}] ≠ df[${sig(diff[0].df)}]` : "(없음)"}`
    + `\n     초등에 \`${LOCKED_MOMENT}\`이 열린 시드 **${lock.length}개**`
    + (diff.length && lock.length
      ? `\n     ✔ 자리가 초등 미니게임을 정하기 시작했어요 — 「추천」의 뒷문이 열립니다`
      : `\n     🔴 되돌렸는데 초록불이에요 — S-8이 아무것도 안 지킵니다 (프로브 시드를 더 늘려 보세요)`));
}

/* 🧪🔑 M-ABS — 절대 점수로. S-9가 갈려야 합니다.
 *    🔑 **기준 칸이 낮은 판에서만 확정적**이라, 그 판을 골라 봅니다 (위 S-9-조건). */
if (!mutOK("M_ABS_SCORE")) check(false, `🧪 **변이 M-ABS — 등급을 절대 점수로**${MUT_DEAD}`);
else {
  const rows = await s9(MUT.M_ABS_SCORE);
  const inWin = (r) => r.tiers.every((t) => t >= r.base - TIER_SHAKE && t <= r.base + TIER_SHAKE);
  const low = rows.filter((r) => r.base <= 1);
  const caught = low.length > 0 && low.every((r) => !inWin(r));
  check(caught,
    `🧪🔑 **변이 M-ABS — 📏 등급을 편차가 아니라 절대 점수로** → S-9가 빨간불`
    + `\n     ${rows.map((r) => `시드 ${r.seed}: ${r.score}점/${r.n}판 편차 ${r.dev > 0 ? "+" : ""}${r.dev} · 기준 칸 ${r.base} · 등급 [${r.tiers.join("")}] ${inWin(r) ? "창 안(못 잡음)" : "🔴 창 밖"}`).join("\n     ")}`
    + `\n     기준 칸 ≤ 1인 판 ${low.length}개 — 그 판들에서 ${low.every((r) => !inWin(r)) ? "**전부** 창 밖 ✔" : "🔴 아직 창 안인 게 있어요"}`
    + (caught
      ? `\n     ✔ 절대 점수(= 편차 + ${ARC_CARDS})가 기준 칸을 위로 밀어 올려요 — 설계 93번 §9의 그 사고입니다`
      : `\n     🔴 절대 점수로 바꿨는데 안 잡혀요`));
}

/* ---------- 마무리 ---------- */
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
console.log("\n✅ 통과");
process.exit(0);
}

main();
