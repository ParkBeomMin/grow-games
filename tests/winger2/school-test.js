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
 *   · 🎮 그래서 초등은 `MINI[kind].mf`(각 종류의 대표 하나)를 읽고, `cutin`이
 *     **안 열립니다.** 중등부터 내 자리의 배정표(4종)가 열려요
 *   · 🃏 **학교 덱에 서는 종류는 ⚽ 결정 · 🅰️ 전개 둘입니다** (2026-09-02 · 117번 §6 c안) —
 *     🧱 수비는 판이 없어서 `PLAYABLE`에서 빠졌어요. `CARDS`는 3종 그대로입니다
 *   · 🃏 뽑기는 **종류를 되풀이해 깔고 섞어** `stage.n`장을 씁니다 — 한 종류로 쏠리면
 *     §7의 `fit`이 한 나라로 기웁니다 (설계 93번 §8-2)
 *   · 📏 등급을 정하는 것은 **편차 `d = 점수 − 뛴 카드 수`**이지 절대 점수가 아니에요
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들 — 값을 고치기 전에 이 파일을 먼저 여세요**
 *   · 🔴 **카드 수 2/3/3은 designer가 아직 만질 수 있습니다** (93번이 *"길어지면 2/2/2로
 *     내리세요"*라고 적어 뒀어요). 그때 고칠 곳은 **S-6의 `STAGE_PLAN` 한 줄**입니다 —
 *     나머지(단계 셋 · 화면 순서 · 초등에 자리 없음 · 편차)는 그대로 살아요
 *   · 「초등에도 자리를 주자」는 판정이 나오면 **S-8이 통째로 옛 계약**이 됩니다
 *   · 「절대 점수로 돌아가자」는 판정이 나오면 **S-9가 옛 계약**이에요
 *   · 🔓 **🧱 수비용 격자가 돌아오면**(117번 §6-4) `PLAYABLE`이 다시 3종이 됩니다 —
 *     그때 고칠 곳은 **`DECK_KINDS` 한 줄**이에요. S-7이 «관측 종류 ≠ 선언 종류»로
 *     먼저 빨간불을 냅니다 (옛 계약이 조용히 서 있지 않게)
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
const { bootPage, pageMutsOK, townAuto, passStage, passEarly, tapFoot, pickOrigin, seedBoth }
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
const KINDS = ["g", "a", "d"];       // ⚽ 결정 · 🅰️ 전개 · 🧱 수비 — `CARDS`의 3종
/* 🃏 **학교 덱에 실제로 서는 종류** (2026-09-02 · 117번 §6 c안 · 116번 §2).
 * 🧱 수비는 판이 없어서 `PLAYABLE`에서 빠졌습니다 — `CARDS`는 3종 그대로예요.
 * 🔒 **`_t`에서 읽어 오지 않고 여기 박습니다.** `PLAYABLE`을 읽으면 종류가 조용히
 *    사라진 날 검사가 따라가서 **아무것도 안 잡아요** — 그게 이 줄이 여기 있는 이유입니다.
 * 🔓 수비용 격자가 돌아오면(117번 §6-4) 이 줄에 `"d"`를 되돌리세요. */
const DECK_KINDS = ["g", "a"];
/* 🃏 첫 장이 각 종류일 확률 — 종류가 K개면 1/K입니다. **섞기가 죽으면 여기가 100%로 튑니다.** */
const FIRST_P = 1 / DECK_KINDS.length;
const DEAL_EPS = 0.03;              // ±3% (아래 「왜 ±3%인가」 참고)
const DEAL_N = 60000;
const LOCKED_MOMENT = "cutin";       // 🎮 중등부터 열리는 미니게임 — 초등엔 **없어야** 합니다
/* 🎮 초등이 쓰는 미니게임 종류 수 — **덱 종류마다 대표 하나씩**입니다(`MINI[kind].mf`).
 * 🌍 🧱이 `PLAYABLE`에서 빠진 지금은 **2종**(`oneone` · `killpass`)이에요.
 *    수비용 격자가 돌아오면 `DECK_KINDS`에 `"d"`가 붙고 여기가 저절로 3이 됩니다. */
const ELEM_KINDS_MAX = DECK_KINDS.length;
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
 * 2026-09-02 재측정 (60,000판 · 종류 2개 세계):
 *
 *   | 단계 | 뽑은 장수 | 종류마다 기대 장수 | 실측 |
 *   |---|---|---|---|
 *   | 초등 n=2 | **2.000** | 1.0 | ⚽ 1.0000 · 🅰️ 1.0000 (**구조로 정확** — 흔들림 0) |
 *   | 중·고 n=3 | **3.000** | 1.5 | ⚽ 1.4966 · 🅰️ 1.5034 |
 *   첫 장  ⚽ 50.19% · 🅰️ 49.81%   (계약 50% ± 3%)
 *
 *   🧪 M-DEAL 섞기 없앰 → 첫 장 ⚽ **100%** · 중·고 ⚽ 2.0 / 🅰️ 1.0  (문턱의 16배)
 *   🧪 M-DECK 배선 끊음 → 중·고가 3장이 아니라 **2장**  (아래 S-7a가 그걸 잡습니다)
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
   *    **「배선이 끊겨 있을 때만 유효한 변이」**라 지금 두면 초록불로 죽어 있습니다.
   *
   *    🆕 2026-09-02 — 정규식을 **`Math.min(CARDS.length, …)`이 빠진 새 줄**로 다시 겨눴습니다.
   *       증상이 하나 더 늘었어요: `n`을 안 읽으면 중·고가 **3장이 아니라 2장**이 됩니다
   *       (실측 60,000판 전부 2장). 🔑 **그게 정확히 engineer가 `Math.min`을 뺀 이유**예요 —
   *       종류가 줄어든 날 `n`이 **터지지 않고 조용히 깎이는** 자리라서요. **S-7a가 그걸 잽니다.** */
  /* 🧭 **탐침(변이가 아닙니다) — 🧱 수비가 학교 덱으로 돌아온 판.**
   *    designer 117번 §6-4가 *"🥅가 「바로 알겠다」를 받으면 같은 격자를 우리 골문으로 돌린다"*고
   *    적어 뒀어요. 그날 `PLAYABLE`이 다시 3종이 됩니다.
   *    🔑 이건 「고장을 심는 변이」가 아니라 **「그날 S-7b가 먼저 말을 거는지」 보는 탐침**입니다 —
   *       옛 계약(2종)이 조용히 서 있으면 그게 「설계가 뒤집혔는데 검사가 옛 계약을 지키는」
   *       상태예요. `DECK_KINDS` 한 줄을 고치라고 **검사가 직접 말해야** 합니다. */
  P_BLK_BACK: { "town.js": [[/const PLAYABLE = CARDS\.filter\(\(c\) => c\.key !== "d"\);/,
    "const PLAYABLE = CARDS;"]] },
  M_DECK_WIRE: { "town.js": [[/const n = Math\.max\(1, stage\.n\);/,
    "const n = PLAYABLE.length;"]] },
  /* 🔴 **M-NOPOS — 🎯 자리 화면을 건너뜁니다.** 초등 다음이 바로 중등이 되고,
   *    자리를 한 번도 안 고른 채 여덟 판이 끝나요. **오류는 하나도 안 납니다**
   *    (`o.pos`가 없으면 `ELEM_POS`로 조용히 떨어지거든요). */
  M_NOPOS_SKIP: { "game.js": [[/goSchool\("e", \(\) => goEarly\("e", goPosition\)\)/,
    'goSchool("e", () => goEarly("e", goMiddle))']] },
  /* 🔴 **M-DEAL — 섞기를 없앱니다.** 가방에 깐 순서가 그대로 나와요.
   *    🆕 2026-09-02 — 종류가 둘이 되면서 증상이 **첫 장**으로 옮겨 갔습니다:
   *       초등은 여전히 «각 1장»이지만 **첫 장이 늘 ⚽(100%)**이고,
   *       중·고는 **⚽ 2.0 / 🅰️ 1.0**으로 고정됩니다. §7의 `fit`이 한 나라로 쏠려요
   *       (설계 93번 §8-2 ⚠️). 🔑 **「등장률」만 봤으면 초등에서 못 잡습니다** —
   *       그래서 S-7b가 **첫 장**과 **단계별 장수**를 같이 봅니다. */
  M_DEAL_FIX: { "town.js": [[/const j = i \+ Math\.floor\(Math\.random\(\) \* \(bag\.length - i\)\);/,
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

/* 🎲 시드는 `_load.js`의 `seedBoth`가 **갈라서** 겁니다 — 두 난수원(`Math.random` ·
 * `WingerEngine._t`)에 같은 시드를 걸면 앞 1,000개가 **1000/1000 일치**해서 보폭이
 * 맞아 lockstep이 나요 (109번 §4 · `seed-split-test.js`가 지킵니다). */

function boot(o) {
  const opt = o || {};
  const W = bootPage({ keys: opt.keys, muts: opt.muts });
  if (opt.seed != null) seedBoth(W, opt.seed);
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
 * S-7. 🃏 **뽑기 — ① 장수가 `stage.n`과 정확히 같고 ② 종류가 균등하다**
 * ══════════════════════════════════════════════════════════════════════
 * 🔄 **2026-09-02에 다시 겨눴습니다.** 옛 문장은 *"초등 2장이 **3종**을 균등하게"*였는데
 *    🧱 수비가 판을 잃으면서(117번 §6 c안) 학교 덱이 **2종**이 됐어요.
 *    🔑 **잡으려던 것은 그대로입니다** — *"한 종류로 쏠리면 §7의 `fit`이 한 나라로 기운다"*.
 *    바뀐 것은 **종류 수뿐**이라 값이 아니라 **관계**로 다시 썼습니다.
 *
 * 🔴 **그런데 성질이 다른 계약 하나가 새로 생겼습니다 — 갈라서 잽니다.**
 *
 *   S-7a **장수 계약** — 뽑은 장수가 `stage.n`과 **정확히** 같다
 *        engineer가 `Math.min(CARDS.length, stage.n)`을 **일부러 뺐어요**(116번 §2-3).
 *        그게 있으면 종류가 3 → 2로 줄어든 날 `n:3`인 중·고가 **터지지 않고 조용히 2장**이
 *        됩니다. 🔑 화면도 검사도 정상으로 보이는 **가장 나쁜 모양**이에요.
 *        🚨 이건 **알려진 이월이 아니라 진짜 계약**입니다 — 깨지면 ❌입니다.
 *
 *   S-7b **균등 계약** — 종류마다 기대 장수가 `n ÷ 종류 수`로 같고, 첫 장이 `1/종류 수`
 *        🔑 **초등(n=2·종류 2)은 「각 1장」이 구조로 확정**이라 등장률로는 아무것도 못 봅니다
 *           (섞기를 없애도 1.0000/1.0000이에요). 그래서 **첫 장**을 같이 봐요.
 *
 * 🌍 **이 문장이 서 있는 세계**: 「🧱이 `PLAYABLE`에서 빠져 학교 덱이 ⚽🅰️ 둘인 세계」.
 *    수비용 격자가 돌아오면(117번 §6-4) `DECK_KINDS`에 `"d"`를 되돌리세요 —
 *    그 전까지는 S-7b가 «관측 종류 ≠ 선언 종류»로 **먼저 빨간불**을 냅니다.
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 🃏 S-7. 뽑기 — 장수와 균등 ──");
/* 🔎 **덱을 실제로 굴려서** 봅니다 — 소스에서 `PLAYABLE`을 읽어 오지 않아요.
 *    (읽어 오면 종류가 조용히 사라진 날 검사가 따라가서 아무것도 안 잡습니다) */
function dealStats(muts, seed) {
  const h = boot({ muts, seed });
  const T = h.W.WingerTown;
  const per = {};
  for (const st of T._t.STAGES) {
    const cnt = {}, first = {}, lens = {};
    for (let i = 0; i < DEAL_N; i++) {
      const keys = T._t.deal(st).map((c) => c.key);
      lens[keys.length] = (lens[keys.length] || 0) + 1;
      first[keys[0]] = (first[keys[0]] || 0) + 1;
      for (const k of keys) cnt[k] = (cnt[k] || 0) + 1;
    }
    per[st.id] = { cnt, first, lens, n: DEAL_N };
  }
  h.close();
  return per;
}
{
  const per = dealStats(null, SEEDS[0]);
  /* 📊 **관측된 종류** — 어느 단계에서든 한 번이라도 나온 열쇠를 모읍니다 */
  const seen = new Set();
  for (const id of Object.keys(per)) for (const k of Object.keys(per[id].cnt)) seen.add(k);
  const seenSorted = Array.from(seen).sort();
  const declSorted = DECK_KINDS.slice().sort();

  /* ── S-7a. 장수가 `stage.n`과 **정확히** 같다 ─────────────────────────── */
  const lenBad = STAGE_PLAN.filter(([id, n]) => {
    const L = per[id].lens;
    return Object.keys(L).length !== 1 || Number(Object.keys(L)[0]) !== n;
  });
  check(lenBad.length === 0,
    `S-7a. 🃏 **뽑은 장수가 \`stage.n\`과 정확히 같다** — 초등 ${STAGE_PLAN[0][1]} · 중등 ${STAGE_PLAN[1][1]} · 고등 ${STAGE_PLAN[2][1]}`
    + ` (단계마다 ${DEAL_N.toLocaleString()}판)`
    + `\n     ${STAGE_PLAN.map(([id, n]) => `${id}(선언 ${n}): ${Object.entries(per[id].lens).map(([L, c]) => `${L}장 ${(c / DEAL_N * 100).toFixed(1)}%`).join(" ")}`).join(" · ")}`
    + `\n     🔑 종류 수(**${seenSorted.length}**)보다 많이 뽑아도 **안 깎여야** 합니다 —`
    + ` \`Math.min(CARDS.length, …)\`을 engineer가 일부러 뺀 자리예요 (116번 §2-3)`
    + (lenBad.length
      ? `\n     🔴 ${lenBad.map(([id, n]) => `${id}는 ${n}장이어야 하는데 ${JSON.stringify(per[id].lens)}`).join(" · ")}`
        + `\n     🚨 **종류가 줄어든 날 \`n\`이 터지지 않고 조용히 깎이는** 그 모양입니다`
      : ""));

  /* ── S-7b. 종류가 균등하다 ──────────────────────────────────────────── */
  const kindOK = seenSorted.join(",") === declSorted.join(",");
  const rateBad = [];
  for (const [id, n] of STAGE_PLAN) {
    const want = n / DECK_KINDS.length;                 // 🔑 값이 아니라 **관계**입니다
    for (const k of DECK_KINDS) {
      const got = (per[id].cnt[k] || 0) / DEAL_N;
      if (Math.abs(got - want) > DEAL_EPS * n) rateBad.push(`${id}/${k} ${got.toFixed(4)} (기대 ${want})`);
    }
    for (const k of DECK_KINDS) {
      const f = (per[id].first[k] || 0) / DEAL_N;
      if (Math.abs(f - FIRST_P) > DEAL_EPS) rateBad.push(`${id}/${k} 첫 장 ${(f * 100).toFixed(2)}% (기대 ${(FIRST_P * 100).toFixed(1)}%)`);
    }
  }
  check(kindOK && rateBad.length === 0,
    `S-7b. 🃏 **종류가 균등하다** — 종류마다 기대 장수 \`n ÷ ${DECK_KINDS.length}\` · 첫 장 ${(FIRST_P * 100).toFixed(1)}% ± ${(DEAL_EPS * 100).toFixed(0)}%`
    + ` (단계마다 ${DEAL_N.toLocaleString()}판)`
    + `\n     📊 **관측된 덱 종류 [${seenSorted.join(" ")}]** (선언 [${declSorted.join(" ")}])`
    + ` — \`CARDS\`는 3종인데 🧱은 \`PLAYABLE\`에서 빠져 있어요 (117번 §6 c안)`
    + `\n     ${STAGE_PLAN.map(([id, n]) => `${id}(n=${n}): ${DECK_KINDS.map((k) => `${k} ${((per[id].cnt[k] || 0) / DEAL_N).toFixed(4)}`).join(" · ")}`
      + ` | 첫 장 ${DECK_KINDS.map((k) => `${k} ${((per[id].first[k] || 0) / DEAL_N * 100).toFixed(2)}%`).join(" · ")}`).join("\n     ")}`
    + `\n     🔑 **초등은 「각 1장」이 구조로 확정**이라 등장률로는 섞기가 죽어도 안 보여요 — 그래서 첫 장을 같이 봅니다`
    + (kindOK
      ? (rateBad.length ? `\n     🔴 어긋남: ${rateBad.join(" · ")}\n     🔴 한 종류로 쏠리면 §7의 \`fit\`이 **한 나라만 자주 오게** 됩니다 (설계 93번 §8-2)` : "")
      : `\n     🔴 **덱 종류가 선언과 다릅니다** — 관측 [${seenSorted.join(" ")}] ≠ 선언 [${declSorted.join(" ")}]`
        + `\n     👉 종류가 바뀌었으면 \`DECK_KINDS\` 한 줄을 고치세요. 🔓 🧱 수비용 격자가 돌아온 거라면 \`"d"\`를 되돌립니다 (117번 §6-4)`));
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
    seedBoth(h.W, seed);
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
    `S-8a. 🎮 초등 미니게임에 **\`${LOCKED_MOMENT}\`이 안 열린다** — 덱 종류마다 대표 하나씩 **${ELEM_KINDS_MAX}종**뿐이다`
    + `\n     초등: ${Array.from(elemMoments).sort().join(" · ")} (${elemMoments.size}종)`
    + `\n     중등: ${Array.from(midMoments).sort().join(" · ")} ${midHas ? `— \`${LOCKED_MOMENT}\`이 실제로 열려요 ✔` : `🔴 \`${LOCKED_MOMENT}\`이 중등에도 안 열려요 (측정 조건이 안 섰습니다)`}`
    + (noLock ? "" : `\n     🔴 초등에 \`${LOCKED_MOMENT}\`이 열렸어요 — 설계가 말한 「초등은 대표 하나씩 → 중등부터 4종 해금」이 깨졌습니다`));
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
  /* 🔑 **S-7a와 같은 술어**를 그대로 겁니다 — 장수가 `stage.n`과 어긋나야 해요 */
  const lenBroke = STAGE_PLAN.some(([id, n]) => {
    const L = st[id].lens;
    return Object.keys(L).length !== 1 || Number(Object.keys(L)[0]) !== n;
  });
  check(arcBroke && lenBroke,
    `🧪🔑 **변이 M-DECK — \`const n = PLAYABLE.length\`로 \`n\` 배선을 끊음** → S-6 · S-6b · S-7a가 빨간불`
    + `\n     선언 ${decl} · 실제 ${rows.map((r) => `[${r.stages.join("")}] ${r.cards}장`).join(" · ")}`
    + `\n     단계별 장수 ${STAGE_PLAN.map(([id, n]) => `${id}(선언 ${n}): ${Object.keys(st[id].lens).join("/")}장`).join(" · ")}`
    + (arcBroke && lenBroke
      ? `\n     ✔ 중·고가 **3장이 아니라 2장**이 되어 아크가 8장이 아니게 됩니다`
        + `\n     🚨 **터지지 않고 조용히 깎여요** — 화면도 옛 검사도 정상으로 보이던 그 모양입니다 (116번 §2-3)`
        + `\n     🔑 배선이 끊기면 옛 M-N도 되살아나요 — **「배선이 끊겨 있을 때만 유효한 변이」**였습니다`
      : `\n     🔴 배선을 끊었는데 초록불이에요`));
}

/* 🧭 P-BLK — 🧱이 학교 덱으로 돌아온 판. **S-7b가 「선언을 고치라」고 말해야** 합니다.
 *    🔑 여기가 초록불이면 **설계가 뒤집혔는데 검사가 옛 계약(2종)을 지키는** 상태예요. */
if (!mutOK("P_BLK_BACK")) check(false, `🧭 **탐침 P-BLK — 🧱이 학교 덱으로 돌아옴**${MUT_DEAD}`);
else {
  const per = dealStats(MUT.P_BLK_BACK, SEEDS[0]);
  const seen = new Set();
  for (const id of Object.keys(per)) for (const k of Object.keys(per[id].cnt)) seen.add(k);
  const seenSorted = Array.from(seen).sort();
  const kindBroke = seenSorted.join(",") !== DECK_KINDS.slice().sort().join(",");
  /* 🔒 그런데 **장수 계약(S-7a)은 그대로 서야** 합니다 — 종류가 늘어도 n장은 n장이에요.
   *    (옛 `Math.min(CARDS.length, …)`이 있었다면 여기서도 안 깎였겠지만, 그건 종류가
   *     **줄어들** 때 터지는 함정이라 이 탐침으로는 안 보입니다) */
  const lenOK = STAGE_PLAN.every(([id, n]) => {
    const L = per[id].lens;
    return Object.keys(L).length === 1 && Number(Object.keys(L)[0]) === n;
  });
  check(kindBroke && lenOK,
    `🧭 **탐침 P-BLK — 🧱이 \`PLAYABLE\`로 돌아옴** → S-7b가 «선언을 고치라»고 빨간불`
    + `\n     관측 종류 [${seenSorted.join(" ")}] vs 선언 [${DECK_KINDS.slice().sort().join(" ")}]`
    + `\n     ${STAGE_PLAN.map(([id, n]) => `${id}(n=${n}): ${Object.keys(per[id].lens).join("/")}장 · ${seenSorted.map((k) => `${k} ${((per[id].cnt[k] || 0) / per[id].n).toFixed(3)}`).join(" · ")}`).join("\n     ")}`
    + (kindBroke && lenOK
      ? `\n     ✔ 그날 고칠 곳은 **\`DECK_KINDS\` 한 줄**이에요 (117번 §6-4) — 장수 계약(S-7a)은 그대로 섭니다`
      : !kindBroke
        ? `\n     🔴 종류가 늘었는데 S-7b가 조용합니다 — **옛 계약이 그대로 서 있어요**`
        : `\n     🔴 종류가 늘자 장수까지 흔들렸어요 — S-7a를 보세요`));
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
  /* 🔑 **S-7b와 같은 술어** — 첫 장 쏠림과 중·고 등장률 둘 다 봅니다.
   *    🔴 **초등 등장률만 봤으면 못 잡습니다** — n=2·종류 2는 섞기를 없애도 「각 1장」이에요. */
  const firstBroke = STAGE_PLAN.some(([id]) =>
    DECK_KINDS.some((k) => Math.abs((r[id].first[k] || 0) / r[id].n - FIRST_P) > DEAL_EPS));
  const rateBroke = STAGE_PLAN.some(([id, n]) =>
    DECK_KINDS.some((k) => Math.abs((r[id].cnt[k] || 0) / r[id].n - n / DECK_KINDS.length) > DEAL_EPS * n));
  check(firstBroke && rateBroke,
    `🧪 **변이 M-DEAL — 🃏 뽑기의 섞기를 없앰(\`j = i\`)** → S-7b가 빨간불`
    + `\n     ${STAGE_PLAN.map(([id, n]) => `${id}(n=${n}): 등장 ${DECK_KINDS.map((k) => `${k} ${((r[id].cnt[k] || 0) / r[id].n).toFixed(4)}`).join(" · ")}`
      + ` | 첫 장 ${DECK_KINDS.map((k) => `${k} ${((r[id].first[k] || 0) / r[id].n * 100).toFixed(1)}%`).join(" · ")}`).join("\n     ")}`
    + (firstBroke && rateBroke
      ? `\n     ✔ **첫 장이 늘 ⚽**가 되고 중·고가 ⚽ 2.0 / 🅰️ 1.0으로 고정됩니다 — §7의 \`fit\`이 한 나라로 쏠려요`
        + `\n     🔑 **초등 등장률은 안 흔들립니다**(각 1장이 구조로 확정) — 첫 장을 같이 안 봤으면 놓쳤어요`
      : `\n     🔴 섞기를 없앴는데 초록불이에요 (첫 장 ${firstBroke ? "✔" : "🔴"} · 등장률 ${rateBroke ? "✔" : "🔴"})`));
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
