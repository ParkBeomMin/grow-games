/* 📨 ⚽ 더 윙어 II — **조기 제안 · 🤝 예비 계약** (O-1 ~ O-8)
 *
 * 🔴 **이 파일이 생기기 전까지 이 자리를 지키는 검사가 0건이었습니다.**
 *    engineer가 새 계약 여덟에 변이를 넣어 증상까지 다 봐 두고(98번 §6-3) **검사는 안 썼어요**
 *    — 변이 검증 없는 검사를 남기면 그게 다음 초록불 함정이라서요. 자리와 문장을 받아 씁니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-09-01 · designer 93번 §6 · engineer 98번)
 *
 *   · 📨 **초등·중등이 끝날 때마다 조기 제안이 한 번씩** 섭니다. 🔑 화면은 새로 안 만들었어요 —
 *     `screen-agency` **하나가 두 몫**을 합니다(조기 · 최종)
 *   · 🎯 **`fit`은 「누가」만 정합니다.** 등급은 그 시점 편차 `tierOfD(d)`가 정해요 —
 *     두 축(`FIT_EDGE` ↔ `BAND_EDGE`)이 **다른 표**에 있습니다
 *   · 🎲 **조기 제안은 난수를 한 톨도 안 씁니다.** 흔들면 소비량이 `fit` 결과를 타서
 *     **뒤에 오는 카드 순서가 통째로 어긋나요**(`youth-moment` B-0이 실제로 갈렸습니다)
 *   · 🤝 **승낙 = 예비 계약.** 남은 대항전 **8장을 다 뛰고**, 등급은 **최종 편차**가 정합니다
 *   · 🙅 거절하면 🏟️ 최종에 **5곳 전부**. 승낙하면 **최종 화면 자체가 안 오고** 🧬 조립대로 갑니다
 *   · ♻️ **한 번 정한 판은 다시 안 물어요** — 되감아 와도요
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들 — 값을 고치기 전에 이 파일을 먼저 여세요**
 *   · 「승낙이 순수 이득이어야 한다」는 판정이 나오면 **O-2가 옛 계약**입니다
 *     (지금은 폐기된 승-3이에요 — 순수 이득이면 **항상 승낙**이 정답이라 결정이 아니게 됩니다)
 *   · 「조기 등급도 흔들자」는 판정이 나오면 **O-8이 옛 계약**이고, 그때는 **`youth-moment`
 *     B-0/B-2를 같이 다시 보세요** — 난수 소비량이 카드 순서를 밀어냅니다
 *   · 「승낙하면 남은 대항전을 건너뛴다」는 판정이 나오면 **O-3이 옛 계약**입니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(8장 · 5곳 · 1곳 · ±1칸 · {0,+1})은 여기 박습니다.** `_t.SIGN_SHAKE`나
 *      `MARKETS.length`를 읽어 오면 **표를 갈아도 검사가 따라가서 아무것도 안 잡혀요**
 *   ③ **게임 입구를 통해** — 타이틀부터 실제 버튼을 눌러 갑니다 (🤝 승낙도 진짜 버튼으로)
 *   ④ **시드 하나로 안 잽니다** — 시드 여덟으로 재고, 시드마다 따로 찍습니다
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인하고, **변이 전에 기준선이 초록불인지** 찍습니다
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가로 넘겼습니다:
 *     「예비 계약」이라는 말이 이해되는지 · 조기 화면이 최종과 헷갈리지 않는지 ·
 *     `.offer-early`/`.offer-note`의 CSS · 손 든 곳이 없을 때의 허전함.
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
const ARC_CARDS = 8;                 // 🏫 승낙하든 거절하든 여덟 판을 다 뜁니다
const STAGE_SEQ = "eemmmhhh";
const EARLY_STAGES = ["e", "m"];     // 📨 조기 제안이 서는 단계 (고등 뒤는 최종)
const OFFER_COUNT = 5;               // 🙅 거절하면 최종에 5곳 전부
const SIGNED_COUNT = 1;              // 🤝 승낙하면 그 한 곳만
/* 🧬 🤝 계약 판 착지점의 제목 — **「제안」이 아니라 「확정」**입니다 (designer §19 ⑥).
 * 🔒 `$("agency-title")`의 삼항에서 읽어 오지 않습니다 — 갈아도 검사가 따라가요. */
const SIGNED_TITLE = "🤝 입단 확정";
/* 📨 그 화면에 「언제 도장을 찍었는지」가 사람 말로 적혀야 합니다 (`S.signedAt` 노출).
 * 🔒 `SIGN_STAGE` 표를 읽지 않고 **여기 박습니다** — 표를 비워도 검사가 따라가면 안 돼요. */
const SIGN_LABEL = ["초등부", "중등부"];
/* 🇬🇧 **총점을 보는 유스는 🏫 초등에 안 옵니다** (designer 93번 §18 수정 ① · 2026-09-01).
 * 🔑 초등은 2장이고 종류마다 카드가 0~1장이라 「총점 편차 ≥ +2」가 **두 장 다 perfect일 때만**
 *    서는데, 그건 총점 문턱이 아니라 **만점 문턱**이에요 — 그러면 🇬🇧이 종류 문턱과 **함께만**
 *    오는 팀이 되고, 실제로 곳 수 분포에 **「3곳」이라는 구멍**이 생겼습니다.
 * 🔒 `_t.FIT`/`_t.FIT_ALL_FROM`에서 읽지 않고 **여기 박습니다** — 표를 갈아도 검사가 따라가면 안 돼요. */
const ALL_KIND_ID = "af";            // 🇬🇧 잉글랜드 아카데미 — 종류가 아니라 총점을 봅니다
const TIER_SHAKE = 1;                // 🎲 최종 등급이 기준 칸에서 흔들리는 폭 (±1칸)
/* 🤝 **승낙 등급 − `tierOfD(최종 편차)`가 가질 수 있는 값.** `SIGN_SHAKE`는 「위로만」이에요.
 * 🔴 **`_t.SIGN_SHAKE`에서 읽어 오지 않습니다** — 표를 `[[0,0],[2,1]]`로 갈아도
 *    검사가 따라가서 아무것도 안 잡힙니다. 폐기된 「승-3(순수 이득)」이 정확히 그 형태예요. */
const SIGN_GAIN = [0, 1];
const SEEDS = [3, 9, 17, 27, 41, 55, 63, 71];
/* 🇬🇧 O-1b 전용 시드 — **백스물**입니다. 🔑 개수가 아니라 **판정 방식**이 요점이에요:
 *
 *    🔴 처음엔 *"변이를 넣으면 초등에 🇬🇧이 온 판이 하나라도 있다"*로 셌는데,
 *       8판 중 **1판**만 잡혀서 **놓칠 확률이 27%**였습니다. 시드를 늘려도 확률 게임이에요.
 *    ✅ 그래서 **조건을 고정했습니다** — 🇬🇧은 「총점 편차 ≥ +2」에서만 손을 듭니다.
 *       그러니 **편차 ≥ +2인 판만 골라** 그 판들에서 **전부** 안 오는지(무변이) /
 *       **전부** 오는지(변이) 봅니다 — **확률이 아니라 정의**가 됩니다.
 * 🔑 그리고 이 검사만 **아크 전체가 아니라 🏫 초등 한 단계만** 굴려요 — 그래야 쌉니다.
 *
 * 🚨 **2026-09-02에 마흔에서 백스물로 늘렸습니다** (117번 §6 c안 뒤).
 *    🧱 수비가 `PLAYABLE`에서 빠지면서 **초등 덱이 늘 {⚽ 결정, 🅰️ 전개} 한 짝으로 확정**됐어요
 *    (n=2 · 종류 2 → 각 정확히 1장). 그래서 「편차 ≥ +2」가 **두 장 다 perfect일 때만** 섭니다.
 *    🔬 실측 — 시드 **200**개에서 편차 ≥ +2가 **16개(8.0%)**. 그런데 **앞 40개에는 2개**뿐이라
 *       바닥 3을 못 넘겼습니다.
 *    🔑 **문턱(바닥 3)을 내리지 않고 표본을 키웠습니다** — 문턱을 내리면 문장이 약해지고,
 *       표본을 키우면 안 약해져요 (이 저장소가 여러 번 고른 쪽입니다).
 *       백스물이면 기대 **9.6개**라 바닥 3에 세 배 여유가 있어요. */
const FIT_SEEDS = (() => { const a = []; for (let i = 1; i <= 120; i++) a.push(i * 7 + 2); return a; })();
const FIT_ALL_EDGE = 2;              // 🇬🇧 총점 편차 문턱 (검사에 박습니다)
const FIT_MIN_CASES = 3;             // 📊 그 문턱을 넘은 판이 최소 이만큼은 나와야 잽니다

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴🔑 **M-EARLYFIT — 🎯 손 든 곳 수가 조기 등급에 스밉니다.**
   *    `fit`(누가)과 `d`(몇 등급)는 **다른 축**인데 한쪽이 다른 쪽에 새는 자리예요.
   *    🔑 **값으로는 못 잡습니다** — 밴드가 넓어 1~2칸 누출이 「기준 칸 ±1」을 그대로 통과해요
   *    (engineer가 직접 해 봤습니다 · 98번 §6-4). **관계로** 잡습니다. */
  M_EARLYFIT: { "town.js": [[/offers\[m\.id\] = offerOf\(m, base, 0\);/,
    "offers[m.id] = offerOf(m, base + (list.length > 1 ? 1 : 0), 0);"]] },
  /* 🔴 **M-EARLYABS — 📨 조기 등급이 편차가 아니라 절대 점수를 봅니다.** */
  M_EARLYABS: { "town.js": [[/const base = tierOfD\(devOf\(rowsUpTo\(stageId\)\)\);/,
    "const base = tierOfD(rowsUpTo(stageId).reduce((a, r) => a + r.pts, 0));"]] },
  /* 🔴🔑 **M-EARLYSHAKE — 📨 조기 제안도 흔듭니다.** engineer의 첫 구현이 이랬어요.
   *    🚨 **등급이 틀려지는 것보다 「난수 소비량이 `fit`을 타는」 게 더 큰 사고**입니다 —
   *    손 든 곳 수만큼 난수를 더 쓰니 **뒤에 오는 카드 순서가 통째로 밀립니다.**
   *    `youth-moment` B-0(*"🦶만 뒤집으면 카드 순서가 같다"*)이 실제로 갈렸어요. */
  M_EARLYSHAKE: { "town.js": [[/offers\[m\.id\] = offerOf\(m, base, 0\);/,
    "offers[m.id] = offerOf(m, base, shakeBy(SHAKE));"]] },
  /* 🔴🔑 **M-SIGNFLOOR — 🤝 승낙을 「순수 이득」으로.** 설계가 폐기한 승-3이에요.
   *    순수 이득이면 **항상 승낙이 정답**이라 그건 결정이 아니라 더미 버튼입니다. */
  M_SIGNFLOOR: { "town.js": [[/out\[m\.id\] = offerOf\(m, tierOfD\(d\), shakeBy\(SIGN_SHAKE\)\);/,
    "out[m.id] = offerOf(m, tierOfD(d) + 2, shakeBy(SIGN_SHAKE));"]] },
  /* 🔴🔑 **M-SKIPCARD — 🤝 승낙하면 남은 대항전을 건너뜁니다.**
   *    그러면 「승낙 뒤에는 조작이 아무 일도 안 하는」 구간이 생겨요 — 원칙 ③ 위반입니다. */
  /* ⚠️ 이 변이를 넣으면 화면에 `rollTalents` 스택이 몇 줄 찍힙니다 — `finishArc`가
   *    🎯 자리를 고르기도 전에 불려서요. **그건 변이가 부순 상태의 증상**이지
   *    검사가 죽은 게 아니에요(`window.onerror`가 삼키고 판정은 그대로 돕니다). */
  M_SKIPCARD: { "game.js": [[/ {2}\(after \|\| \(id === "e" \? goPosition : goHigh\)\)\(\);/,
    '  (marketId ? finishArc : (after || (id === "e" ? goPosition : goHigh)))();']] },
  /* 🔴 **M-SWITCH — 계약해 놓고 다음 단계에서 갈아탑니다.** 계약이 계약이 아니게 돼요. */
  M_SWITCH: { "game.js": [[/ {2}if \(WingerTown\.signed\(\)\) \{ after\(\); return; \}\n/, ""]] },
  /* 🔴🔑 **M-REDECIDE — 이미 정한 판을 다시 묻습니다.** 뒤 판 결과를 보고 앞 판 결정을
   *    바꾸는 건 *"이미 나온 걸 버리고 앞으로"*가 아니라 **「이미 나온 걸 다시 고르기」**예요. */
  M_REDECIDE: { "game.js": [[/ {2}if \(WingerTown\.decidedEarly\(id\)\) \{ after\(\); return; \}\n/, ""]] },
  /* 🔴 **M-SIGNONLY — 🤝 계약했는데 최종 화면에 5곳이 다 옵니다.**
   *    *"다른 팀은 못 봐요"*가 계약의 대가인데 그게 사라지면 승낙이 **순수 이득**이 돼요. */
  M_SIGNONLY: { "game.js": [[/ {4}if \(signed && m\.id !== signed\.market\) continue;\n/, ""]] },
  /* 🔴🔑 **M-BENCH — 🧬 조립대의 「취소」가 `show("screen-agency")`를 직접 부릅니다.**
   *    🤝 승낙 판에서는 🏟️ 최종 화면이 **한 번도 안 그려진 채** 조립대로 갑니다 —
   *    그래서 되돌아올 때 `showOffers`를 안 지나면 **📨 조기 제안의 잔재**(제목 · 🙅 거절 버튼 ·
   *    조기 카드)가 그대로 서 있고, 정작 **누를 카드는 0장**이에요. **막다른 길**입니다.
   *    🔑 *"제안 화면에 서는 길은 전부 `showOffers`를 지난다"*가 이걸 막는 계약이고,
   *    승낙 판이 그 계약을 **실제로 재는 유일한 경로**입니다. */
  M_BENCH_BACK: { "game.js": [[/ {4}showOffers\);\n\}/, '    () => show("screen-agency"));\n}']] },
  /* 🔴 **M-TITLE — 고를 게 없는 화면에 「🏟️ 입단 제안」이라고 적습니다.**
   *    🤝 계약 판의 착지점은 **고르는 화면이 아니라 확인 화면**이에요 —
   *    「제안」이라고 적으면 *"아무도 안 고른 제안 화면"*으로 읽힙니다 (designer §19 ⑥). */
  M_TITLE: { "game.js": [[/if \(title\) title\.textContent = signed \? "🤝 입단 확정" : "🏟️ 입단 제안";/,
    'if (title) title.textContent = "🏟️ 입단 제안";']] },
  /* 🔴 **M-ALLEARLY — 🇬🇧(총점)이 🏫 초등에도 옵니다.** 그러면 총점 문턱이 초등에서
   *    **만점 문턱**이 되어 🇬🇧이 종류 문턱과 함께만 오고, 곳 수 분포에 구멍이 생깁니다. */
  M_ALLEARLY: { "town.js": [[/ {6}if \(key === FIT_ALL && at < FIT_ALL_FROM\) continue;\n/, ""]] },
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
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 닿습니다
 * ══════════════════════════════════════════════════════════════ */
/* 🎲 시드는 `_load.js`의 `seedBoth`가 **갈라서** 겁니다 — 두 난수원(`Math.random` ·
 * `WingerEngine._t`)에 같은 시드를 걸면 앞 1,000개가 **1000/1000 일치**해서 보폭이
 * 맞아 lockstep이 나요 (109번 §4 · `seed-split-test.js`가 지킵니다). */

function boot(o) {
  const opt = o || {};
  const W = bootPage({ muts: opt.muts });
  /* 🎲 시드를 둘 다 박습니다 — 엔진은 로드 시점에 `Math.random`을 잡아 둬요.
   * 🔢 그리고 **몇 번 굴렀는지 셉니다** — O-8이 그걸 봅니다. */
  const rnd = seedBoth(W, opt.seed == null ? 7 : opt.seed).fn;
  const cnt = { n: 0 };
  /* 🔢 굴림 수를 세는 겹을 `seedBoth`가 심은 흐름 **위에** 덧씌웁니다 (흐름은 그대로예요) */
  W.Math.random = () => { cnt.n += 1; return rnd(); };
  const D = W.document;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  return { W, D, press, cnt,
    T: () => W.WingerTown,
    active: () => (D.querySelector(".screen.active") || {}).id,
    takes: () => Array.from(D.querySelectorAll("#agency-list .offer-take")),
    finalCards: () => Array.from(D.querySelectorAll("#agency-list button:not(.offer-take)")),
    earlyOn: () => {
      const b = D.getElementById("btn-early-next");
      return !!(b && !b.classList.contains("hidden"));
    },
    close: () => W.close() };
}

/* 🚪 아크 전체를 지납니다. `sign`이 `"e"`/`"m"`이면 그 단계에서 **🤝 승낙**,
 *    아니면 **🙅 거절**이에요.
 * 🔑 조기 화면마다 그 시점의 편차·명단·등급·난수 소비량을 그대로 받아 둡니다. */
async function runArc(o) {
  const opt = o || {};
  const h = boot(opt);
  const T = h.T();
  const snap = [];
  const seen = [];
  const mark = () => { const id = h.active(); if (seen[seen.length - 1] !== id) seen.push(id); };
  mark();
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(h.W, h.press, "R");
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, opt.origin || "seoul");
  mark();
  const stages = passStage(h.W, h.press);                    // 🏫 초등부
  mark();
  /* 📨 조기 화면에 선 그 자리에서 잽니다 — 화면이 바뀌기 **전**에요. */
  const grab = (id) => {
    const E = T.earlyOffers(id);
    snap.push({ id, screen: h.active(), earlyOn: h.earlyOn(), takes: h.takes().length,
      list: E.list.slice(), dev: T.deviation(), cards: T.cards(),
      band: T._t.tierOfD(T.deviation()),
      tiers: E.list.map((k) => (E.offers[k] || {}).tier) });
    return E;
  };
  const decide = (id) => {
    grab(id);
    if (opt.sign === id && h.takes().length) { h.press(h.takes()[0], `🤝 예비 계약 @${id}`); return true; }
    passEarly(h.W, h.press);
    return false;
  };
  if (h.active() === "screen-agency") decide("e");
  mark();
  if (h.active() === "screen-position")
    h.press(h.D.querySelector(`#position-list .card[data-pos="${opt.pos || "wg"}"]`), `🎯 ${opt.pos || "wg"}`);
  stages.push(...passStage(h.W, h.press));                   // 🏫 중등부
  mark();
  if (h.active() === "screen-agency") decide("m");
  mark();
  stages.push(...passStage(h.W, h.press));                   // 🏫 고등부
  mark();
  back();
  const sg = T.signed();
  const r = {
    seed: opt.seed, h, T, seen, snap, stages, cards: stages.length,
    screen: h.active(), signed: sg,
    score: T.score(), n: T.cards(), dev: T.deviation(),
    band: T._t.tierOfD(T.deviation()),
    finalN: h.finalCards().length,
    finalTiers: h.finalCards().map((c) => Number((c.className.match(/offer-t(\d)/) || [])[1])),
    signedTier: sg ? T.offerFor(sg.market).tier : null,
    rng: h.cnt.n,
  };
  return r;
}

/* 🏫 **초등 한 단계만** 굴려 그때 손 든 명단을 받아옵니다 (O-1b 전용 · 가볍습니다).
 * 🔑 `W2Moment.play`를 기록기로 바꾸고 판정은 게임이 자동 진행에서 쓰는 그 갈래
 *    (`ctx.judge(0.5)`)를 그대로 불러요 — 산식을 우회하지 않습니다. */
function elemFit(muts, seeds) {
  const out = [];
  for (const seed of seeds) {
    const h = boot({ muts, seed });
    h.W.W2Moment = { play: (el, ctx, cb) => cb(ctx.judge(0.5)) };
    const T = h.T();
    T.reset();
    let done = false;
    T.openStage("e", { pos: "mf", foot: "R" }, () => { done = true; });
    for (let g = 0; g < 12 && !done; g++) {
      const b = h.D.getElementById("btn-town-next");
      if (!b || b.disabled || b.classList.contains("hidden")) break;
      h.press(b, "🏫 다음");
    }
    /* 🔎 `keys`는 **덱을 관측한 값**이에요 — 소스에서 `PLAYABLE`을 읽지 않습니다.
     *    O-1b-조건이 «왜 편차 ≥ +2가 드문가»를 스스로 말하는 데 씁니다. */
    out.push({ seed, list: T.earlyOffers("e").list.slice(), dev: T.deviation(),
      keys: T.rows().map((r) => r.key) });
    h.close();
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════
 * O-1. 🎯 **`fit`은 「누가」만 정한다** — 조기 등급은 편차 하나로 정해집니다
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 **관계로 잡습니다.** 한 단계의 조기 제안은 **전부 같은 칸**이고, 그 칸이
 *    `tierOfD(그 시점 편차)`와 **정확히 같아야** 해요.
 * 🔴 값(±1칸 창)으로는 못 잡습니다 — 밴드가 넓어 1~2칸 누출이 그대로 통과합니다.
 * ══════════════════════════════════════════════════════════════════════ */
async function main() {
console.log("── 🎯 O-1. fit이 조기 등급에 안 스민다 ──");
const BASE = [];
for (const s of SEEDS) BASE.push(await runArc({ seed: s }));

function o1(rows) {
  const bad = [];
  for (const r of rows) for (const e of r.snap) {
    const same = e.tiers.every((t) => t === e.tiers[0]);
    if (e.tiers.length && (!same || e.tiers[0] !== e.band)) bad.push(`${r.seed}/${e.id}: 칸 ${e.band} ↔ 등급 [${e.tiers.join("")}]`);
  }
  return bad;
}
{
  const bad = o1(BASE);
  check(bad.length === 0,
    `O-1. 🎯 한 단계의 조기 제안이 **전부 같은 칸**이고 그 칸이 \`tierOfD(그 시점 편차)\`와 **같다**`
    + `\n     ${BASE.slice(0, 4).map((r) => `시드 ${r.seed}: ` + r.snap.map((e) => `${e.id}(편차 ${e.dev > 0 ? "+" : ""}${e.dev}·칸 ${e.band}) 명단 ${e.list.length}곳 등급[${e.tiers.join("")}]`).join(" · ")).join("\n     ")}`
    + (bad.length ? `\n     🔴 어긋난 자리 ${bad.length}개: ${bad.slice(0, 4).join(" · ")}`
      : `\n     🔑 등급이 **먼저** 정해지고 명단은 **고르기만** 해요 — 그래서 「fit은 등급에 안 닿는다」가 구조입니다`));

  /* 📊 측정 조건 — 🔴 **명단 길이와 칸이 실제로 시드마다 달라야** 위 줄이 무언가를 잽니다.
   *    둘 다 늘 같으면 O-1은 "잴 게 없어서 통과"예요. */
  const lens = new Set(), bands = new Set();
  for (const r of BASE) for (const e of r.snap) { lens.add(e.list.length); bands.add(e.band); }
  check(lens.size >= 2 && bands.size >= 2,
    `O-1-조건. 📊 명단 길이와 기준 칸이 **시드마다 다르다** — 명단 {${Array.from(lens).sort().join(",")}}곳 · 칸 {${Array.from(bands).sort().join(",")}}`
    + `\n     🔑 둘 다 하나뿐이면 O-1은 "잴 게 없어서 통과"입니다`);

}

/* 🇬🇧 **총점을 보는 유스는 🏫 초등에 안 옵니다** — 이름과 하는 일을 맞추는 자리 */
function fitCases(E) {
  const hot = E.filter((r) => r.dev >= FIT_ALL_EDGE);          // 🇬🇧이 「손을 들 만한」 판
  return { hot, came: hot.filter((r) => r.list.indexOf(ALL_KIND_ID) >= 0) };
}
{
  const E = elemFit(null, FIT_SEEDS);
  const F = fitCases(E);
  const atM = BASE.flatMap((r) => r.snap.filter((e) => e.id === "m")).filter((e) => e.list.indexOf(ALL_KIND_ID) >= 0);
  const dist = {};
  for (const r of E) dist[r.dev] = (dist[r.dev] || 0) + 1;
  check(F.came.length === 0 && atM.length > 0,
    `O-1b. 🇬🇧 **총점을 보는 유스(\`${ALL_KIND_ID}\`)는 🏫 초등에 안 오고 중등부터 옵니다**`
    + `\n     🔑 **편차 ≥ +${FIT_ALL_EDGE}인 판만** 봅니다 — 그게 🇬🇧이 손을 들 조건이라 거기서 «안 왔다»가 뜻이 있어요`
    + `\n     초등 편차 분포 {${Object.keys(dist).map(Number).sort((x, y) => x - y).map((k) => `${k}:${dist[k]}`).join(" ")}} (${E.length}판)`
    + `\n     편차 ≥ +${FIT_ALL_EDGE}인 판 **${F.hot.length}개** 중 🇬🇧이 온 판 **${F.came.length}개** · 중등에 온 판 ${atM.length}개`
    + (F.came.length === 0
      ? (atM.length > 0
        ? `\n     🔑 초등은 종류마다 카드가 0~1장이라 「총점 문턱」이 **만점 문턱**이 됩니다 —`
          + `\n        그러면 🇬🇧이 종류 문턱과 **함께만** 오고 곳 수 분포에 구멍이 생겨요`
        : `\n     🔴 중등에도 한 번도 안 왔어요 — 위 줄은 "안 재서 통과"입니다 (측정 조건 불만족)`)
      : `\n     🔴 초등에 왔어요 — 총점 축이 만점 축으로 변질됩니다`));
  check(F.hot.length >= FIT_MIN_CASES,
    `O-1b-조건. 📊 편차 ≥ +${FIT_ALL_EDGE}인 판이 **${F.hot.length}개**(시드 ${E.length}개 · 최소 ${FIT_MIN_CASES}) 나왔다`
    + `\n     🔑 이 판이 없으면 O-1b도 아래 M-ALLEARLY도 **확률 게임**이 됩니다 — 시드를 늘리세요`
    + `\n     🔎 관측 — 🏫 초등 덱 종류 [${Array.from(new Set(E.flatMap((x) => x.keys || []))).sort().join(" ")}]`
    + ` · 편차 분포 ${Object.entries(E.reduce((a, x) => { a[x.dev] = (a[x.dev] || 0) + 1; return a; }, {}))
      .sort((a, b) => Number(a[0]) - Number(b[0])).map(([d, c]) => `${d}:${c}`).join(" ")}`
    + `\n     🌍 🧱이 \`PLAYABLE\`에서 빠진 세계라 **초등 덱이 {⚽,🅰️} 한 짝으로 확정**입니다 —`
    + ` 편차 ≥ +${FIT_ALL_EDGE}는 **두 장 다 perfect**일 때만 서요 (실측 8.0%)`);
}

/* ══════════════════════════════════════════════════════════════════════
 * O-8. 🎲 **조기 제안이 난수 소비량을 안 바꾼다** — `fit` 결과를 안 탑니다
 * ══════════════════════════════════════════════════════════════════════
 * 🚨 이게 이번 라운드에서 **가장 조용한 사고의 자리**입니다.
 *    손 든 곳만 흔들면 **몇 번 굴리는지가 카드 성적에 따라 달라져서**, 뒤에 오는 카드
 *    순서가 통째로 밀려요 — 등급이 아니라 **아크 전체**가 어긋납니다.
 *    engineer의 첫 구현에서 `youth-moment` B-0/B-2가 실제로 갈렸습니다.
 * 🔑 **관계로 잽니다** — 명단 길이가 0곳이든 4곳이든 **소비량이 같아야** 해요.
 *    🔒 소비량의 «값»은 안 박습니다(구현이 바뀌면 따라 움직이는 종속값이라서요).
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 🎲 O-8. 조기 제안이 난수 소비량을 안 바꾼다 ──");
function o8(rows) {
  const used = rows.map((r) => r.rng);
  const lens = rows.map((r) => r.snap.reduce((a, e) => a + e.list.length, 0));
  return { used, lens, same: used.every((v) => v === used[0]), span: Math.max(...lens) - Math.min(...lens) };
}
{
  const r = o8(BASE);
  check(r.same && r.span >= 2,
    `O-8. 🎲 **손 든 곳이 몇이든 난수 소비량이 같다** — 아크 한 판의 \`Math.random\` 호출 수`
    + `\n     ${BASE.map((x, i) => `시드 ${x.seed}: 명단 합 ${r.lens[i]}곳 → ${r.used[i]}회`).join(" · ")}`
    + (r.same
      ? `\n     🔑 소비량이 \`fit\`을 타면 **뒤 카드 순서가 통째로 밀립니다** — 등급이 아니라 아크가 어긋나요`
      : `\n     🔴 소비량이 시드마다 다릅니다 — 조기 제안이 난수를 쓰고 있어요`)
    + `\n     📊 측정 조건: 명단 길이 폭 ${r.span}곳 ${r.span >= 2 ? "✔" : "🔴 (폭이 없으면 잴 게 없습니다)"}`);
}

/* ══════════════════════════════════════════════════════════════════════
 * O-7 · O-3 · O-2. 🤝 **예비 계약** — 목록 · 아크 · 등급
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 🤝 O-7·O-3·O-2. 예비 계약 ──");
const SIGNED = [];
for (const s of SEEDS) SIGNED.push(await runArc({ seed: s, sign: "e" }));

{
  const okRefuse = BASE.every((r) => r.screen === "screen-agency" && r.finalN === OFFER_COUNT && !r.signed);
  const okSign = SIGNED.every((r) => !!r.signed && r.screen === "screen-prospect");
  check(okRefuse && okSign,
    `O-7. 🏟️ **🙅 거절하면 최종에 ${OFFER_COUNT}곳 전부** · **🤝 승낙하면 최종 화면이 아예 안 오고 🧬 조립대로** 갑니다`
    + `\n     거절: ${BASE.map((r) => `${r.finalN}장`).join(" · ")} → ${BASE[0].screen}`
    + `\n     승낙: ${SIGNED.map((r) => (r.signed ? r.signed.market + "@" + r.signed.stage : "🔴 없음")).join(" · ")} → ${SIGNED[0].screen}`
    + (okRefuse && okSign ? "" : `\n     🔴 목록이 계약과 다릅니다`));

  const okArc = SIGNED.every((r) => r.cards === ARC_CARDS && r.stages.join("") === STAGE_SEQ);
  check(okArc,
    `O-3. 🏫 **🤝 승낙해도 여덟 판을 다 뜁니다** — 예비 계약이지 졸업이 아니에요`
    + `\n     ${SIGNED.map((r) => `시드 ${r.seed}: [${r.stages.join("")}] ${r.cards}장`).join(" · ")}`
    + (okArc ? `\n     🔑 안 그러면 「승낙 뒤에는 조작이 아무 일도 안 하는」 구간이 생깁니다 (원칙 ③)`
      : `\n     🔴 승낙하고 나서 아크가 줄었어요`));

  const gains = SIGNED.map((r) => ({ seed: r.seed, d: r.signedTier - r.band, tier: r.signedTier, band: r.band }));
  const okGain = gains.every((g) => SIGN_GAIN.indexOf(g.d) >= 0);
  check(okGain,
    `O-2. 🤝 **승낙 등급 − \`tierOfD(최종 편차)\` ∈ {${SIGN_GAIN.join(", ")}}** — 「위로만」이지 「순수 이득」이 아닙니다`
    + `\n     ${gains.map((g) => `시드 ${g.seed}: 칸 ${g.band} → 등급 ${g.tier} (${g.d >= 0 ? "+" : ""}${g.d})`).join(" · ")}`
    + (okGain ? `\n     🔑 **최종 편차**가 등급을 정합니다 — 승낙 시점 등급을 하한으로 굳히면 그건 폐기된 승-3이에요`
      : `\n     🔴 승낙이 순수 이득이 됐습니다 — 그러면 **항상 승낙**이 정답이라 결정이 아니게 돼요`));
  /* 📊 측정 조건 — 이득이 **0인 판과 +1인 판이 둘 다** 나와야 O-2가 무언가를 잽니다. */
  const kinds = new Set(gains.map((g) => g.d));
  check(kinds.size >= 2,
    `O-2-조건. 📊 이득이 **${Array.from(kinds).sort().join(" · ")}** 두 갈래로 나왔다 — 한 값만 나오면 O-2는 그 값을 정답으로 단언하는 줄이 됩니다`);
}

/* ══════════════════════════════════════════════════════════════════════
 * O-4. 🤝 **계약 뒤에는 다음 단계 조기 화면이 안 온다** (갈아타기 금지)
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 🤝 O-4. 계약 뒤에는 안 물어요 ──");
{
  const okOne = SIGNED.every((r) => r.snap.length === 1 && r.snap[0].id === "e");
  check(okOne,
    `O-4. 🤝 초등에서 계약하면 **중등 조기 화면이 안 옵니다** — 갈아탈 수 없어요`
    + `\n     ${SIGNED.map((r) => `시드 ${r.seed}: 조기 화면 [${r.snap.map((e) => e.id).join(",")}]`).join(" · ")}`
    + `\n     (거절 판은 [${BASE[0].snap.map((e) => e.id).join(",")}] 둘 다 옵니다 — 그게 대조군이에요)`
    + (okOne ? "" : `\n     🔴 계약해 놓고 다음 단계에서 갈아탈 수 있어요 — 계약이 계약이 아니게 됩니다`));
}

/* ══════════════════════════════════════════════════════════════════════
 * O-5. ♻️ **되감아 와도 이미 정한 판을 다시 묻지 않는다**
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 `town-test`의 T-6a와 **같은 길**입니다 — 🎯 자리 화면 → 🗺️ 동네 → 지역 다시.
 *    그 끝에서 🏫이 다시 안 굴러야 하고(T-6a), **📨도 다시 안 떠야** 합니다(여기).
 * ✅ 2026-09-01 — 🏟️ 제안 화면의 「← 자리 다시 고르기」가 삭제돼서(designer §19 ⒝)
 *    되감는 길이 **아크 중간의 `btn-back-position` 하나**로 줄었습니다. 그 길로 재요.
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── ♻️ O-5. 되감아도 다시 안 물어요 ──");
async function rewind(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  const T = h.T();
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(h.W, h.press, "R");
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, "seoul");
  passStage(h.W, h.press);                    // 🏫 초등부
  passEarly(h.W, h.press);                    // 📨 조기 제안 — 🙅 거절
  const atPos = h.active(), cards0 = T.cards();
  h.press(h.D.getElementById("btn-back-position"), "← 뒤로");
  const originScreen = h.active();
  pickOrigin(h.W, h.press, "busan");
  const out = { atPos, originScreen, screen: h.active(), earlyOn: h.earlyOn(),
    takes: h.takes().length, extra: passStage(h.W, h.press).length,
    cards0, cards: T.cards() };
  back();
  h.close();
  return out;
}
{
  const r = await rewind(null);
  const ok = r.atPos === "screen-position" && r.screen === "screen-position"
    && r.extra === 0 && r.cards === r.cards0;
  check(ok,
    `O-5. ♻️ 🗺️ 동네까지 되감아 지역을 다시 골라도 **📨 조기 제안이 다시 안 뜬다**`
    + `\n     🎯 자리(${r.atPos}) → 뒤로(${r.originScreen}) → 지역 다시 → **${r.screen}**`
    + `\n     그 뒤 더 지나간 카드 ${r.extra}장 · 카드 ${r.cards0} → ${r.cards}`
    + (ok ? `\n     🔑 뒤 판 결과를 보고 앞 판 결정을 바꾸는 건 **「이미 나온 걸 다시 고르기」**예요`
      : `\n     🔴 \`screen-agency\`로 돌아갔어요 — 이미 정한 판을 다시 묻습니다`));
}

/* ══════════════════════════════════════════════════════════════════════
 * O-9. 🧬🔑 **🤝 계약 판의 착지점이 막다른 길이 아니다**
 * ══════════════════════════════════════════════════════════════════════
 * 🚨 **승낙 판에서는 🏟️ 최종 화면이 한 번도 안 그려집니다** — `finishArc`가 곧장 🧬 조립대로
 *    가거든요. 그래서 조립대에서 **되돌아오는 순간**이 그 화면이 처음 그려지는 자리예요.
 *    🔴 그때 `showOffers`를 안 지나면 **📨 조기 제안의 잔재**가 그대로 서 있고
 *    **누를 카드는 0장**입니다 — 아무 데도 못 가는 화면이 됩니다.
 * 🔑 *"제안 화면에 서는 길은 전부 `showOffers`를 지난다"*는 계약을 **실제로 재는 유일한 경로**가
 *    여기예요 (거절 판에서는 최종 화면이 이미 그려져 있어 **변이를 넣어도 증상이 0장**입니다).
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 🧬 O-9. 계약 판의 착지점 ──");
async function landing(muts, opt) {
  const o = opt || {};
  const r = await runArc({ seed: SEEDS[0], sign: o.sign === undefined ? "e" : o.sign, muts });
  const h = r.h;
  h.press(h.D.getElementById("btn-back-prospect"), "🧬 조립대 취소");
  const t = h.D.getElementById("agency-title");
  const hint = h.D.getElementById("agency-hint");
  const out = { screen: h.active(), title: t ? t.textContent : null,
    earlyOn: h.earlyOn(), takes: h.takes().length, n: h.finalCards().length,
    hint: (hint ? hint.textContent : "").replace(/\s+/g, " "),
    signedAt: r.signed ? r.signed.stage : null };
  h.close();
  return out;
}
{
  const L = await landing(null);
  const okLand = L.screen === "screen-agency" && L.n === SIGNED_COUNT
    && L.earlyOn === false && L.takes === 0;
  const okTitle = L.title === SIGNED_TITLE;
  const okStamp = SIGN_LABEL.some((w) => L.hint.indexOf(w) >= 0);
  check(okLand && okTitle,
    `O-9. 🧬 🤝 계약 판에서 조립대를 취소하면 **누를 수 있는 화면**에 선다 — 막다른 길이 아니에요`
    + `\n     → ${L.screen} · 제목 "${L.title}" (계약 "${SIGNED_TITLE}") · 카드 **${L.n}장** · 📨 잔재(거절 버튼 ${L.earlyOn} · 조기 카드 ${L.takes}장)`
    + (okLand && okTitle
      ? `\n     🔑 승낙 판은 🏟️ 최종 화면이 **한 번도 안 그려진 채** 조립대로 가요 — 이 길이 그 화면의 첫 렌더입니다`
      : `\n     🔴 조기 제안 잔재가 남았거나 카드가 없어요 — **아무 데도 못 가는 화면**입니다`));
  check(okStamp,
    `O-9a. 📨 그 화면에 **언제 도장을 찍었는지**(\`S.signedAt\` = ${L.signedAt})가 사람 말로 적혀 있다`
    + `\n     "${L.hint.slice(0, 100)}"`
    + (okStamp ? `\n     🔑 승낙이 📣 주목을 +0.166%p밖에 안 움직이니, **그 결정이 화면에 안 남으면 정말로 0.166%p짜리 결정**이 됩니다`
      : `\n     🔴 계약 시점이 화면 어디에도 없어요 (찾은 말: ${SIGN_LABEL.join(" · ")})`));
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — 고치기 전에 **빨간불이 뜨는지** 반드시 확인합니다
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
if (fail) {
  console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);
}
const closeAll = (rows) => { for (const r of rows) { try { r.h.close(); } catch (e) { /* 이미 닫힘 */ } } };

async function underArc(name, opt) {
  const rows = [];
  for (const s of (opt && opt.seeds) || SEEDS) rows.push(await runArc({ seed: s, muts: MUT[name], sign: opt && opt.sign }));
  return rows;
}

/* 🧪🔑 M-EARLYFIT · M-EARLYABS — O-1이 갈려야 합니다. */
for (const [name, label] of [
  ["M_EARLYFIT", "🧪🔑 **변이 M-EARLYFIT — 🎯 손 든 곳 수가 조기 등급에 스밈**"],
  ["M_EARLYABS", "🧪 **변이 M-EARLYABS — 📨 조기 등급이 절대 점수를 봄**"],
]) {
  if (!mutOK(name)) { check(false, `${label}${MUT_DEAD}`); continue; }
  const rows = await underArc(name);
  const bad = o1(rows);
  check(bad.length > 0,
    `${label} → O-1이 빨간불 (어긋난 자리 ${bad.length}개)`
    + `\n     ${rows.slice(0, 3).map((r) => `시드 ${r.seed}: ` + r.snap.map((e) => `${e.id} 칸 ${e.band} ↔ 등급[${e.tiers.join("")}]`).join(" · ")).join("\n     ")}`
    + (bad.length ? `\n     ✔ 등급이 편차 말고 **다른 것**을 보기 시작했어요` : `\n     🔴 스몄는데 초록불이에요 — O-1이 아무것도 안 지킵니다`));
  closeAll(rows);
}

/* 🧪 M-ALLEARLY — 🇬🇧이 초등에도 옴. O-1b가 갈려야 합니다. */
if (!mutOK("M_ALLEARLY")) check(false, `🧪 **변이 M-ALLEARLY — 🇬🇧이 초등에도 옴**${MUT_DEAD}`);
else {
  const E = elemFit(MUT.M_ALLEARLY, FIT_SEEDS);
  const F = fitCases(E);
  const all = F.hot.length > 0 && F.came.length === F.hot.length;
  check(all,
    `🧪 **변이 M-ALLEARLY — 🇬🇧(총점)이 🏫 초등에도 옴** → O-1b가 빨간불`
    + `\n     편차 ≥ +${FIT_ALL_EDGE}인 판 **${F.hot.length}개** 중 🇬🇧이 온 판 **${F.came.length}개**`
    + `\n     보기 ${F.came.slice(0, 3).map((e) => `[${e.list.join(",")}](편차 ${e.dev})`).join(" · ") || "(없음)"}`
    + (all
      ? `\n     ✔ **그 판 전부**에서 왔습니다 — 확률이 아니라 **정의**로 갈려요`
      : `\n     🔴 일부만 왔거나 하나도 안 왔어요 — 문턱(\`FIT_ALL_EDGE\`)이 바뀌었는지 보세요`));
}

/* 🧪🔑 M-EARLYSHAKE — O-8(그리고 O-1)이 갈려야 합니다. */
if (!mutOK("M_EARLYSHAKE")) check(false, `🧪 **변이 M-EARLYSHAKE — 📨 조기 제안도 흔듦**${MUT_DEAD}`);
else {
  const rows = await underArc("M_EARLYSHAKE");
  const r = o8(rows);
  const alsoO1 = o1(rows).length;
  check(!r.same,
    `🧪🔑 **변이 M-EARLYSHAKE — 📨 조기 제안도 흔듦** → O-8이 빨간불`
    + `\n     ${rows.map((x, i) => `${r.lens[i]}곳 → ${r.used[i]}회`).join(" · ")}`
    + (r.same ? `\n     🔴 흔들었는데 소비량이 같아요 — O-8이 아무것도 안 지킵니다`
      : `\n     ✔ **소비량이 명단 길이를 그대로 따라갑니다** — 이게 뒤 카드 순서를 밀어내는 자리예요`
        + `\n     🟡 O-1도 같이 갈립니다(어긋난 자리 ${alsoO1}개) — 다만 **그건 우연**이에요.`
        + `\n        O-1은 «흔들림이 명단 안에서 갈릴 때만» 봅니다. 명단이 1곳이거나 다 같은 칸으로`
        + `\n        흔들리면 O-1은 통과하는데 **난수는 그래도 밀립니다** — 그 자리를 O-8만 봅니다`));
  closeAll(rows);
}

/* 🧪🔑 M-SIGNFLOOR — O-2가 갈려야 합니다. */
if (!mutOK("M_SIGNFLOOR")) check(false, `🧪 **변이 M-SIGNFLOOR — 🤝 승낙을 순수 이득으로**${MUT_DEAD}`);
else {
  const rows = await underArc("M_SIGNFLOOR", { sign: "e" });
  const gains = rows.map((r) => r.signedTier - r.band);
  const broke = gains.some((d) => SIGN_GAIN.indexOf(d) < 0);
  check(broke,
    `🧪🔑 **변이 M-SIGNFLOOR — 🤝 승낙을 「순수 이득」으로(폐기된 승-3)** → O-2가 빨간불`
    + `\n     ${rows.map((r) => `시드 ${r.seed}: 칸 ${r.band} → 등급 ${r.signedTier} (+${r.signedTier - r.band})`).join(" · ")}`
    + (broke ? `\n     ✔ 이득이 {${SIGN_GAIN.join(", ")}}를 벗어났어요 — **항상 승낙**이 정답이 됩니다`
      : `\n     🔴 순수 이득으로 만들었는데 초록불이에요`));
  closeAll(rows);
}

/* 🧪🔑 M-SKIPCARD — O-3이 갈려야 합니다. */
if (!mutOK("M_SKIPCARD")) check(false, `🧪 **변이 M-SKIPCARD — 승낙하면 남은 대항전 건너뜀**${MUT_DEAD}`);
else {
  const rows = await underArc("M_SKIPCARD", { sign: "e", seeds: SEEDS.slice(0, 3) });
  const broke = rows.every((r) => r.cards !== ARC_CARDS || r.stages.join("") !== STAGE_SEQ);
  check(broke,
    `🧪🔑 **변이 M-SKIPCARD — 🤝 승낙하면 남은 대항전을 건너뜀** → O-3이 빨간불`
    + `\n     ${rows.map((r) => `시드 ${r.seed}: [${r.stages.join("")}] ${r.cards}장`).join(" · ")}`
    + (broke ? `\n     ✔ 아크가 ${ARC_CARDS}장이 아니게 됐어요 — 승낙 뒤 조작이 아무 일도 안 합니다`
      : `\n     🔴 건너뛰게 했는데 초록불이에요`));
  closeAll(rows);
}

/* 🧪 M-SWITCH — O-4가 갈려야 합니다. */
if (!mutOK("M_SWITCH")) check(false, `🧪 **변이 M-SWITCH — 계약 뒤 갈아타기**${MUT_DEAD}`);
else {
  const rows = await underArc("M_SWITCH", { sign: "e", seeds: SEEDS.slice(0, 3) });
  const broke = rows.some((r) => r.snap.length > 1);
  check(broke,
    `🧪 **변이 M-SWITCH — 🤝 계약해 놓고 다음 단계에서 갈아탐** → O-4가 빨간불`
    + `\n     ${rows.map((r) => `시드 ${r.seed}: 조기 화면 [${r.snap.map((e) => e.id).join(",")}]`).join(" · ")}`
    + (broke ? `\n     ✔ 계약 뒤에도 중등 조기 화면이 다시 떴어요` : `\n     🔴 되돌렸는데 초록불이에요`));
  closeAll(rows);
}

/* 🧪🔑 M-REDECIDE — O-5가 갈려야 합니다. */
if (!mutOK("M_REDECIDE")) check(false, `🧪 **변이 M-REDECIDE — 이미 정한 판을 다시 물음**${MUT_DEAD}`);
else {
  const r = await rewind(MUT.M_REDECIDE);
  check(r.earlyOn || r.screen === "screen-town",
    `🧪🔑 **변이 M-REDECIDE — ♻️ 이미 정한 판을 다시 물음** → O-5가 빨간불`
    + `\n     지역 다시 → **${r.screen}** · 🙅 거절 버튼 ${r.earlyOn ? "되살아남 ✔" : "🔴 안 뜸"} · 손든곳 ${r.takes}`
    + (r.earlyOn || r.screen === "screen-town"
      ? `\n     ✔ 뒤 판 결과를 보고 앞 판 결정을 다시 고를 수 있게 됐어요`
      : `\n     🔴 가드를 뺐는데 초록불이에요 — O-5가 아무것도 안 지킵니다`));
}

/* 🧪 M-SIGNONLY — O-7이 갈려야 합니다.
 * 🔑 승낙하면 최종 화면이 **안 오므로**, 🧬 조립대에서 **취소**해 최종 화면에 세워서 봅니다. */
if (!mutOK("M_SIGNONLY")) check(false, `🧪 **변이 M-SIGNONLY — 계약했는데 5곳이 다 옴**${MUT_DEAD}`);
else {
  async function backFromBench(muts) {
    const r = await runArc({ seed: SEEDS[0], sign: "e", muts });
    r.h.press(r.h.D.getElementById("btn-back-prospect"), "🧬 조립대 취소");
    const out = { screen: r.h.active(), n: r.h.finalCards().length, signed: r.signed };
    r.h.close();
    return out;
  }
  const base = await backFromBench(null);
  const mut = await backFromBench(MUT.M_SIGNONLY);
  check(base.n === SIGNED_COUNT && mut.n !== SIGNED_COUNT,
    `🧪 **변이 M-SIGNONLY — 🤝 계약했는데 최종 목록이 안 줄어듦** → O-7이 빨간불`
    + `\n     🧬 조립대에서 취소 → ${base.screen} · 무변이 **${base.n}장**(계약 ${SIGNED_COUNT}) · 변이 **${mut.n}장**`
    + (base.n === SIGNED_COUNT && mut.n !== SIGNED_COUNT
      ? `\n     ✔ *"다른 팀은 못 봐요"*가 계약의 대가입니다 — 사라지면 승낙이 순수 이득이 돼요`
      : `\n     🔴 목록이 계약과 달라요`));
}

/* 🧪🔑 M-BENCH — 조립대 취소가 `showOffers`를 건너뜀. O-9가 갈려야 합니다. */
if (!mutOK("M_BENCH_BACK")) check(false, `🧪 **변이 M-BENCH — 조립대 취소가 판단을 건너뜀**${MUT_DEAD}`);
else {
  const L = await landing(MUT.M_BENCH_BACK);
  const caught = L.n !== SIGNED_COUNT || L.earlyOn || L.title !== SIGNED_TITLE;
  check(caught,
    `🧪🔑 **변이 M-BENCH — 🧬 조립대 취소가 \`show("screen-agency")\`를 직접 부름** → O-9가 빨간불`
    + `\n     → ${L.screen} · 제목 "${L.title}" · 카드 **${L.n}장** · 📨 잔재(거절 버튼 ${L.earlyOn} · 조기 카드 ${L.takes}장)`
    + (caught
      ? `\n     ✔ **📨 조기 제안 화면이 그대로 서 있고 누를 카드가 ${L.n}장**입니다 — 막다른 길이에요`
        + `\n     🔑 거절 판에서는 최종 화면이 이미 그려져 있어 **이 변이가 증상 0장**입니다 — 승낙 판만 잡아요`
      : `\n     🔴 건너뛰게 했는데 초록불이에요 — O-9가 아무것도 안 지킵니다`));
}

/* 🧪 M-TITLE — 고를 게 없는 화면에 「제안」이라고 적음. O-9가 갈려야 합니다. */
if (!mutOK("M_TITLE")) check(false, `🧪 **변이 M-TITLE — 계약 판에도 「입단 제안」**${MUT_DEAD}`);
else {
  const L = await landing(MUT.M_TITLE);
  check(L.title !== SIGNED_TITLE && L.n === SIGNED_COUNT,
    `🧪 **변이 M-TITLE — 🤝 계약 판에도 「🏟️ 입단 제안」이라고 적음** → O-9가 빨간불`
    + `\n     제목 "${L.title}" · 카드 ${L.n}장`
    + (L.title !== SIGNED_TITLE
      ? `\n     ✔ 고를 게 ${L.n}장뿐인데 「제안」이라고 적혀요 — *"아무도 안 고른 제안 화면"*으로 읽힙니다`
      : `\n     🔴 바꿨는데 초록불이에요`));
}

closeAll(BASE); closeAll(SIGNED);

/* ---------- 마무리 ---------- */
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
console.log("\n✅ 통과");
process.exit(0);
}

main();
