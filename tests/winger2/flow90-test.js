/* ⚽ 더 윙어 II — ⏱️ **90분 흐름 중계 대본이 실제로 그려지는가** (`beta/winger2/town.js`)
 *
 * 계기: 범민 님 — *"축구판 각 선수들이 실제로 경기하는것처럼 움직여야하고
 *      **90분동안 흐름으로 중계**를 해줘야지"* (설계 `144_designer_flow90.md`)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **이 파일이 생긴 이유** — engineer가 146번 §4-1에서 자기 작업을 **통째로 되돌려**
 *    (`runTo(i)` · `if (last) runTo(null)` · 🏁 킥오프 `draw` 세 배선을 지워서
 *     90분 대본이 **한 줄도 안 그려지는 상태**로) 검사를 돌렸습니다:
 *
 *   | 검사 | 되돌린 뒤 |
 *   |---|---|
 *   | `town-test` (T-1~T-7c · 변이 M-K 포함) | 🟢 초록불 |
 *   | `school-test` | 🟢 초록불 |
 *   | `school-scene-test` (A · B · C 전부) | 🟢 초록불 |
 *   | `town-neutral-test` | 🟢 초록불 |
 *
 *   **90분 대본을 지키는 검사가 0건이었어요.** 이 파일이 그 자리입니다.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 🔒 지키는 것
 *   ① **게임 입구(타이틀)에서 진짜 버튼을 눌러** 학교 아크를 지납니다 — 산식만 떼어
 *      재구성하면 배선이 끊긴 날에도 통과해요(`town-neutral-test`가 그래서 못 봅니다).
 *   ② 셀렉터마다 **「탭 횟수 > 0」**을 단언합니다(F-3) — 아무것도 안 눌러도 타임아웃이
 *      흐름을 끝까지 미는 「자가 복구가 실패를 삼킴」을 막아요.
 *   ③ **산식은 소스에서**(`minAt` · `FILL_MIN` · `FLOW_LINE` · `KICK_LINE` · `END_LINE`),
 *      **분 목록은 검사에 박고**(설계 §3-5의 계약), **F[j]는 관계로**(F-1b) 봅니다.
 *   ④ **꼬리 흐름은 값이 아니라 관계**로 잽니다 — `GOAL_BY`를 뒤집으면 꼬리도 뒤집혀야
 *      해요(F-6). 값을 박으면 시드 하나의 우연을 재게 됩니다.
 *
 * 🌍 **이 파일의 계약이 서 있는 세계**
 *   「🏫 한 단계가 **한 경기(90분)**이고, 순간 카드 `n`장이 `minAt(k, n)`에 놓이며,
 *    그 사이를 ⏱️ 필러가 메우고 🥅 하프타임이 45'에 한 장 서는 세계」입니다.
 *   · **단계가 90분 경기가 아니게 되면**(예: 「전반만 뛴다」) F-2·F-4부터 다시 보세요.
 *   · **카드 수 n이 단계마다 같아지면** F-5의 «중등과 고등이 뒤집혀 있다»는 여전히
 *     성립하지만(`sIdx`가 가르니까요), `school-scene-test` B-1의 분 집합 자는 눈이 멉니다.
 *   · **필러를 `deck`에 넣기로 판정이 바뀌면** F-7이 곧바로 빨간불입니다 — 그때는
 *     `_load.js`의 `passStage`(굴러간 카드 세기)와 `progHTML`을 **같이** 보세요.
 *
 * ⏱️ 약 125초 걸려요 (아크 18벌 × 약 7초).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, pageMutsOK, townAuto, tapFoot, tapChildArc, pickOrigin, passEarly, seedBoth, PAGE_DIR }
  = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════════════════════════
 * 📐 산식·문구는 **소스에서 뽑습니다** — 값을 베껴 적으면 표가 갈라져요
 * ══════════════════════════════════════════════════════════════ */
const TOWN_SRC = fs.readFileSync(path.join(PAGE_DIR, "town.js"), "utf8");
const grab = (re, wrap) => {
  const m = TOWN_SRC.match(re);
  if (!m) return null;
  /* 🔒 직접 eval을 안 씁니다 — `const`가 eval 스코프에 갇혀 값이 늘 undefined가 돼요. */
  try { return new Function(`return ${wrap ? wrap(m[1]) : m[1]};`)(); } catch (e) { return null; }
};
const FLOW_LINE = grab(/const FLOW_LINE = (\{[\s\S]*?\n  \});/);
/* 🔑 `{opp}` 자리표가 안에 있어 `[^}]*`로는 못 잡습니다 — 한 줄이라 `.*`로 돕니다. */
const KICK_LINE = grab(/const KICK_LINE = (\{.*\});/);
const END_LINE = (TOWN_SRC.match(/const END_LINE = "([^"]*)";/) || [])[1] || null;
const minAt = grab(/(const minAt = \([^)]*\) => [^;]*);/, (s) => `(() => { ${s}; return minAt; })()`);
/* ⏱️ 구간 필러의 분 — **소스의 그 식 그대로**입니다. F-1b가 이걸로 관계를 봅니다. */
const fillMin = grab(/const FILL_MIN = CARD_MIN\.map\(\(m, j\) =>\s*([\s\S]*?)\);\n/,
  (s) => `((CARD_MIN) => CARD_MIN.map((m, j) => ${s}))`);

/* ══════════════════════════════════════════════════════════════
 * 🔒 **문턱·계약은 검사에 박습니다** (설계 144번 §3-5의 완성된 타임라인)
 * ══════════════════════════════════════════════════════════════
 * 🔴 소스에서 읽어 오면 `minAt`을 바꿔도 검사가 따라가서 **아무것도 안 잡혀요.**
 *    산식은 소스에서 뜯어오고, 계약은 박는다 — 방향이 반대입니다.
 *
 * 🔥 순간 카드는 피드에 **두 줄**(무엇이 걸렸나 → 결과)이라 분이 두 번 나옵니다.
 * 🥅 하프타임은 `.w2-min` span이 **없어서**(`match-scene.js`의 half 갈래) 이 목록에 안 들어와요 —
 *    그 자리는 F-2가 따로 봅니다. */
const FEED_MIN = {
  e: [0, 30, 30, 60, 60, 75, 90],                       // n=2 · 🔥 30·60 · ⏱️ 75 · 🏁 0 · 🔚 90
  m: [0, 23, 23, 34, 45, 45, 57, 68, 68, 79, 90],       // n=3
  h: [0, 23, 23, 34, 45, 45, 57, 68, 68, 79, 90],
};
const DECK_N = { e: 2, m: 3, h: 3 };                    // 🔘 진행 띠의 점 = 순간 카드 수
const TOTAL_CARDS = 8;                                  // 🔒 아크 전체 (2 + 3 + 3)
const HALF_AT = 45;                                     // 🥅 축구의 값이지 손잡이가 아니에요
/* 🎲 시드 — **하나로 재지 않습니다.** F-6(꼬리 흐름이 스코어를 탄다)은 스코어가 갈려야
 *    뜻이 있어서, 이기는 판·지는 판·비기는 판이 섞여야 해요. */
const SEEDS = [7, 42, 1201, 5];
/* 🔒 F-6의 바닥 — 꼬리 흐름이 `mid`가 **아닌**(= 승부가 갈린) 단계가 이만큼은 나와야
 *    「뒤집기」를 잴 것이 있습니다. 실측 10 / 12(시드 4벌 × 단계 셋). 실측의 절반에 뒀어요. */
const MIN_DECIDED = 5;

/* ══════════════════════════════════════════════════════════════
 * 🔬 계측 도구 · 🔴 변이
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔬 **계측입니다 — 변이가 아니에요.** `town.js`가 화면으로 내보내는 카드를 그대로 적습니다.
   *    🔑 DOM만으로는 `flow` **필드**가 실렸는지 못 봅니다(문구는 `fillerText`가 따로 고르니까요).
   *       F-9가 그 자리예요 — 「문구는 맞는데 `flow`를 안 실어 보내는」 상태를 잡습니다. */
  "LOG": { "town.js": [[/    const draw = \(c, done\) => \{\n      if \(!Scene\) return;/,
    '    const draw = (c, done) => {\n      if (!Scene) return;\n'
    + '      (window.__drawLog = window.__drawLog || []).push({ stage: stage.id, kind: c.kind,'
    + ' min: c.min, flow: c.flow, text: c.text, score: (c.score || []).join(":") });']] },
  /* ⓐ ⏱️ 카드 앞 대본(필러 · 하프타임)을 통째로 끕니다 */
  "M-NOFILL": { "town.js": [[/^      runTo\(i\);$/m, "      ;"]] },
  /* ⓑ 🔚 마지막 카드 뒤(꼬리 필러 · 종료 휘슬)를 끕니다 */
  "M-NOEND": { "town.js": [[/^      if \(last\) runTo\(null\);$/m, "      ;"]] },
  /* ⓒ 🏁 0' 줄을 **[경기 시작]을 누른 뒤**로 옮깁니다.
   *    🔴 「존재한다」로만 재면 이 변이가 안 잡혀요 — F-3이 **누르기 전 상태**에서 잽니다. */
  "M-LATEKICK": { "town.js": [
    [/      draw\(\{ kind: "kick", min: 0, score: \[hg, ag\],\n        text: \(KICK_LINE\[stage\.id\] \|\| KICK_LINE\.m\)\.replace\("\{opp\}", away\) \}\);/,
      '      const __kick = () => draw({ kind: "kick", min: 0, score: [hg, ag],\n'
      + '        text: (KICK_LINE[stage.id] || KICK_LINE.m).replace("{opp}", away) });'],
    [/      btn\.onclick = \(\) => \{ btn\.disabled = true; playCard\(\); \};/,
      "      btn.onclick = () => { btn.disabled = true; __kick(); playCard(); };"]] },
  /* ⓓ 🥅 하프타임을 아예 안 놓습니다 */
  "M-NOHALF": { "town.js": [[/^    script\.splice\(hi, 0, \{ t: "half", min: HALF_MIN \}\);$/m, "    ;"]] },
  /* ⓔ 🥅 하프타임 **자리**를 한 칸 앞으로 (`분 ≤ 45` → `분 < 45`).
   *    🔑 장수는 그대로 1장이라 **「1장인가」로만 재면 안 잡힙니다** — F-2가 앞뒤를 봅니다. */
  "M-HALFPOS": { "town.js": [[/^    while \(hi < script\.length && script\[hi\]\.min <= HALF_MIN\) hi \+= 1;$/m,
    "    while (hi < script.length && script[hi].min < HALF_MIN) hi += 1;"]] },
  /* ⓕ 🔁 단계 번호를 뺍니다 — 중등과 고등의 흐름이 **같아집니다**.
   *    🔴 한 단계만 재면 못 잡아요(중등 하나만 보면 `h → a`로 멀쩡합니다). */
  "M-NOSIDX": { "town.js": [[/\? \(\(j \+ sIdx\) % 2 === 0 \? "a" : "h"\)/, '? ((j) % 2 === 0 ? "a" : "h")']] },
  /* ⓖ 🎯 꼬리 흐름을 상수로 — 스코어를 안 탑니다 */
  "M-TAILCONST": { "town.js": [[/: hg < ag \? "a" : hg > ag \? "h" : "mid"\);/, ': "mid");']] },
  /* ⓗ 🔘 필러가 `deck`으로 샙니다 — 진행 띠의 점과 `state.cards`가 늘어요 */
  "M-DECKLEAK": { "town.js": [[/^    const CARD_MIN = deck\.map\(\(_, k\) => minAt\(k, deck\.length\)\);$/m,
    "    deck.push(deck[0]);\n    const CARD_MIN = deck.map((_, k) => minAt(k, deck.length));"]] },
  /* ⓘ ⏱️ **45'인 필러 슬롯을 안 건너뜁니다** — 🥅 하프타임이 쓰는 자리를 필러가 같이 씁니다.
   *    🔑 n=2(초5)에서만 보이는 갈래예요 — 중고등의 F는 34·57·79라 45가 없습니다.
   *    🔒 **F-1b(관계)를 무는 유일한 변이**입니다: 그려진 필러 분과 소스 산식이 갈라져요. */
  "M-KEEP45": { "town.js": [[/if \(k > 0 && FILL_MIN\[k - 1\] !== HALF_MIN\) script\.push\(/,
    "if (k > 0) script.push("]] },
  /* 🔩 F-6 전용 — **판정은 그대로 두고 승패만 뒤집습니다.** 꼬리 흐름이 따라 뒤집혀야 해요.
   *    🔒 표를 베껴 적지 않고 소스에서 뜯어 `"us"` ↔ `"them"`만 바꿉니다 (칸이 늘어도 삽니다). */
  "FLIP": { "town.js": [[/const GOAL_BY = \{.*\};/,
    (TOWN_SRC.match(/const GOAL_BY = \{.*\};/) || [""])[0]
      .replace(/"us"/g, "\u0000").replace(/"them"/g, '"us"').replace(/\u0000/g, '"them"')]] },
};
const withLog = (name) => ({ "town.js": [...MUT.LOG["town.js"], ...(name ? MUT[name]["town.js"] : [])] });

/* ══════════════════════════════════════════════════════════════
 * ⏳ 정착 — 🔴 **창이 카드 간격보다 「길어야」 합니다**
 * ══════════════════════════════════════════════════════════════
 * engineer 146번 §4-4가 짚은 자리예요. `school-scene-test`의 `settle()`은 3회 연속
 * 같으면(15ms × 3 ≈ **45ms**) 안정으로 보는데, `delayOf()`는 🤖 자동 진행에서도 **90ms**입니다.
 * **정착 창이 카드 간격보다 짧아서 큐 한가운데서 돌아와요** — 그러면 검사가 「끝났다」고
 * 믿는 시점이 실제 끝보다 앞서고, 🔚 90' 종료 휘슬이 **통째로 사라집니다.**
 *
 * 🧪 여기서 실측했습니다 (아크 1벌 · 진짜 타이머):
 *
 *   | 정착 창 | 🔚 90' 줄 | ⏱️ 필러 | 🥅 하프타임 |
 *   |---|---|---|---|
 *   | `hold 3`  (45ms)  | **0 / 3** | **0장** | **0장** |
 *   | `hold 8`  (120ms) | 3 / 3 | 7장 | 3장 |
 *   | `hold 16` (240ms) | 3 / 3 | 7장 | 3장 |
 *   | `hold 24` (360ms) | 3 / 3 | 7장 | 3장 |
 *
 * 📐 문턱 두 줄:
 *   ① **무엇과 견주는가** — `match-scene.js`의 `delayOf()`가 내는 카드 간격. 🤖 자동 진행 **90ms**
 *      (사람이 볼 때는 350~900ms). 정착 창은 그보다 **길어야** 합니다.
 *   ② **어느 칸에서 재는가** — 🏫 학교 아크 전체(초5·중등·고등), 진짜 타이머, `townAuto` 켬.
 * 🔒 **240ms를 박습니다 — 90ms의 2.7배.** 실패 경계(45~120ms) 바로 옆에 붙이지 않았어요.
 *    소스에서 `delayOf()`를 읽어 오면 그 값을 바꿔도 검사가 따라가서 안 잡힙니다. */
const HOLD = 16;                 // × 15ms = 240ms
const GRACE = 120;               // 큐가 첫 줄을 그릴 틈
async function settle(D) {
  const n = () => D.querySelectorAll("#town-scene .w2-feed > *").length;
  await wait(GRACE);
  let prev = -1, hold = 0;
  /* 🔒 상한 400회 × 15ms = 6초 — 한 단계의 최악 큐(12줄 × 900ms ≈ 10.8초)는 못 담지만
   *    이 드라이버는 `townAuto`(90ms)로 몰아서 최악이 ~1.1초입니다. 사람 속도로 재는
   *    검사를 여기 두면 이 상한부터 다시 보세요. */
  for (let i = 0; i < 400; i++) {
    const c = n();
    hold = c === prev ? hold + 1 : 0;
    if (hold >= HOLD) return c;
    prev = c;
    await wait(15);
  }
  return prev;
}

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 학교 경기에 닿습니다
 * ══════════════════════════════════════════════════════════════ */
async function arc(seed, muts) {
  const W = bootPage({ muts });
  seedBoth(W, seed);
  const D = W.document;
  let taps = 0;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what})`);
    /* 🖱️ 실기기 순서 그대로 — pointerdown → pointerup → click 셋 다 */
    for (const t of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true }));
    }
    taps += 1;
  };
  /* 피드의 줄을 **순서 그대로** 읽습니다 — [클래스, 분(없으면 null), 본문] */
  const feed = () => Array.from(D.querySelectorAll("#town-scene .w2-feed > *")).map((n) => {
    const m = n.querySelector(".w2-min");
    const b = n.querySelector(".w2-body");
    return { cls: String(n.className), min: m ? parseInt(String(m.textContent).replace(/\D/g, ""), 10) : null,
      text: String((b || n).textContent) };
  });
  const cur = () => (D.querySelector(".screen.active") || {}).id;
  const stages = {};

  async function stage(id) {
    await settle(D);
    /* 🏁 **누르기 「전」** — 0' 대진 줄이 이미 큐를 지나 피드에 서 있어야 합니다.
     *    🔴 「존재한다」로만 재면 `btn.onclick` 안으로 옮긴 변이가 안 잡혀요. */
    const before = { presses: 0, feed: feed(), dots: D.querySelectorAll("#town-prog .town-dot").length };
    let presses = 0;
    for (let g = 0; g < 16; g++) {
      if (cur() !== "screen-town") break;
      const b = D.getElementById("btn-town-next");
      if (!b || b.disabled || b.classList.contains("hidden")) break;
      press(b, `🏫 ${id} 진행`);
      presses += 1;
    }
    await settle(D);
    stages[id] = { before, presses, feed: feed(),
      dots: D.querySelectorAll("#town-prog .town-dot").length };
  }

  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(W, press, "R");
  const back = townAuto(W);
  pickOrigin(W, press, "seoul");
  await tapChildArc(W, press, ["ball", "fin", "gn", "h1"]);
  press(D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg");
  await stage("e");
  passEarly(W, press);
  await stage("m");
  passEarly(W, press);
  await stage("h");
  if (back) back();
  const T = W.WingerTown;
  const out = { seed, stages, taps, cards: T.cards(), dev: T.deviation(),
    draws: (W.__drawLog || []).slice() };
  W.close();
  return out;
}

/* 필러 문구 → `flow` 되짚기. 🔒 `FLOW_LINE`은 **소스에서 뽑은** 표예요. */
function flowOfText(stageId, text) {
  const tab = FLOW_LINE[stageId];
  if (!tab) return null;
  for (const fl of ["a", "h", "mid"]) if ((tab[fl] || []).indexOf(text) >= 0) return fl;
  return null;
}
/* 그 단계가 그린 ⏱️ 필러들을 순서대로 — `{ min, flow, text }` */
const fillersOf = (r, id) => r.stages[id].feed
  .filter((x) => x.cls.indexOf("filler") >= 0 && x.min != null)
  .map((x) => ({ min: x.min, text: x.text, flow: flowOfText(id, x.text) }));
/* 🔁 **꼬리가 아닌** 필러들 — 꼬리를 「마지막 자리」가 아니라 **구조**로 골라요:
 *    꼬리 필러는 **마지막 순간 카드 뒤**에 오니, 그보다 앞인 것이 선두 필러입니다.
 * 🔴 `slice(0, -1)`로 재면 🔚 종료 배선을 지우는 변이(M-NOEND)가 F-5까지 물어서
 *    「어느 문장이 무엇을 지키는가」가 흐려집니다. */
const leadFillersOf = (r, id) => {
  const lastCard = minAt(DECK_N[id] - 1, DECK_N[id]);      // 🔒 산식은 소스에서
  return fillersOf(r, id).filter((x) => x.min < lastCard);
};
const minsOf = (r, id) => r.stages[id].feed.filter((x) => x.min != null).map((x) => x.min);
const IDS = ["e", "m", "h"];

(async () => {
  /* ══════════ 0. 산식과 변이 정규식이 지금 소스에 걸리는가 ══════════ */
  {
    const got = { FLOW_LINE: !!FLOW_LINE, KICK_LINE: !!KICK_LINE, END_LINE: !!END_LINE,
      minAt: typeof minAt === "function", fillMin: typeof fillMin === "function" };
    const okAll = Object.values(got).every(Boolean);
    check(okAll, `0-1. 📐 \`town.js\`에서 산식·문구를 뽑았다 — ${Object.entries(got).map(([k, v]) => `${k} ${v ? "✔" : "🔴"}`).join(" · ")}`
      + (okAll ? `\n     END_LINE "${END_LINE}" · KICK_LINE ${JSON.stringify(KICK_LINE)}`
        : `\n     🔴 정규식이 안 걸려요 — 아래는 전부 "안 도는" 상태입니다`));
    /* 🔴🔴 **계측(LOG) 정규식이 안 걸리면 💥(종료 코드 2)로 죽습니다 — 빨간불이 아니에요.**
     *    `window.__drawLog`가 빈 배열이 되면 F-9가 «0건 위반»으로 **공짜 초록불**입니다.
     *    🔒 0건을 「어긋남 없음」으로 읽지 않습니다 — 계측이 죽으면 검사가 죽어야 해요. */
    const insBad = pageMutsOK({ LOG: MUT.LOG });
    if (insBad.length) {
      console.log(`\n💥 **계측 정규식이 \`town.js\`에 안 걸립니다 — 이건 초록불도 빨간불도 아닙니다**`);
      insBad.forEach((b) => console.log(`   · ${b}`));
      console.log(`   🔑 \`draw()\`가 갈렸어요. 계측을 못 심으면 F-9가 **빈 배열을 보고 초록불**이 납니다.`);
      process.exit(2);
    }
    const bad = pageMutsOK(MUT);
    const n = Object.values(MUT).reduce((a, t) => a + Object.values(t).reduce((b, m) => b + m.length, 0), 0);
    check(bad.length === 0, `0-2. 🔴 계측·변이 정규식 ${n}개가 지금 \`beta/winger2/town.js\`에 전부 걸린다`
      + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 검사는 "안 도는" 상태예요**`
        + bad.map((b) => `\n       · ${b}`).join("") : ""));
    if (!okAll || bad.length) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
  }

  const base = {};
  for (const s of SEEDS) base[s] = await arc(s, withLog(null));

  /* ══════════ ⓐ F-1. ⏱️ 단계마다 분이 계약대로 놓인다 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const got = minsOf(base[s], id);
      if (got.join(",") !== FEED_MIN[id].join(",")) bad.push(`시드${s}/${id}: ${got.join("·")} ≠ 계약 ${FEED_MIN[id].join("·")}`);
    }
    check(bad.length === 0,
      `F-1. ⏱️ **90분 대본이 그려진다** — 단계마다 피드의 분이 설계 §3-5와 한 칸도 안 어긋난다`
      + `\n     🔎 계약(검사에 박음) — e ${FEED_MIN.e.join("·")} · m/h ${FEED_MIN.m.join("·")}`
      + `\n     🔑 🔥 순간 카드는 두 줄(무엇이 걸렸나 → 결과)이라 분이 두 번 나옵니다. 🥅 하프타임은 \`.w2-min\`이 없어 여기 안 들어와요`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));

    /* 🔒 **종속값은 관계로.** 위 계약은 「지금 `minAt`」의 값이라, 산식이 정당하게 바뀌면
     *    F-1은 빨간불이 되는 게 맞습니다. 그때 **어디를 봐야 하는지**를 이 줄이 알려 줘요:
     *    필러 분 `F[j]`는 언제나 「카드 j와 다음 카드(없으면 90') 사이의 한가운데」입니다. */
    const rel = [];
    for (const id of IDS) {
      const n = DECK_N[id];
      const M = Array.from({ length: n }, (_, k) => minAt(k, n));
      const F = fillMin(M);
      const want = F.filter((v) => v !== HALF_AT);                 // 45'는 🥅 하프타임이 씁니다
      const got = fillersOf(base[SEEDS[0]], id).map((x) => x.min);
      if (got.join(",") !== want.join(",")) rel.push(`${id}: 화면 ${got.join("·")} ≠ 소스 산식 ${want.join("·")}`);
    }
    check(rel.length === 0,
      `F-1b. 🔗 **필러 분이 소스의 산식과 일치**한다 — \`minAt\`·\`FILL_MIN\`을 \`town.js\`에서 뜯어 대조`
      + `\n     🌍 F-1은 「지금 \`minAt\`」의 **값**이고, 이 줄은 구조가 바뀌어도 사는 **관계**예요 — 둘이 같이 빨간불이면 산식이 바뀐 겁니다`
      + (rel.length ? rel.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓑ F-2. 🥅 하프타임이 45'에 정확히 한 장 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const f = base[s].stages[id].feed;
      const at = f.map((x, i) => (x.cls.indexOf("w2-half") >= 0 ? i : -1)).filter((i) => i >= 0);
      if (at.length !== 1) { bad.push(`시드${s}/${id}: 🥅 하프타임 ${at.length}장 (계약 1장)`); continue; }
      const before = f.slice(0, at[0]).filter((x) => x.min != null).map((x) => x.min);
      const after = f.slice(at[0] + 1).filter((x) => x.min != null).map((x) => x.min);
      if (before.some((v) => v > HALF_AT)) bad.push(`시드${s}/${id}: 🥅 앞에 ${HALF_AT}' 넘는 줄 (${before.join("·")})`);
      if (after.some((v) => v <= HALF_AT)) bad.push(`시드${s}/${id}: 🥅 뒤에 ${HALF_AT}' 이하 줄 (${after.join("·")})`);
    }
    check(bad.length === 0,
      `F-2. 🥅 **하프타임이 단계마다 정확히 1장**이고, 앞은 전부 ≤ ${HALF_AT}' · 뒤는 전부 > ${HALF_AT}'`
      + `\n     🔑 **「1장인가」로만 재면 안 됩니다** — 자리를 한 칸 옮겨도 장수는 그대로 1장이에요 (변이 M-HALFPOS)`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓒ F-3. 🏁 0' 줄이 [경기 시작]을 **누르기 전**에 이미 있다 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const b4 = base[s].stages[id].before.feed;
      const want = String(KICK_LINE[id] || KICK_LINE.m).replace(/\{opp\}/, "");
      const kick = b4.filter((x) => x.min === 0);
      if (kick.length !== 1) { bad.push(`시드${s}/${id}: 누르기 전 \`0'\` 줄 ${kick.length}장 (계약 1장)`); continue; }
      /* 🔒 **그 단계의 대진 줄인가** — `{opp}`를 뺀 꼬리로 봅니다(상대 이름은 난수예요) */
      if (kick[0].text.indexOf(want) < 0) bad.push(`시드${s}/${id}: \`0'\` 문구가 그 단계의 것이 아니에요 — "${kick[0].text}"`);
      if (base[s].stages[id].before.presses !== 0) bad.push(`시드${s}/${id}: 🔴 재기 전에 이미 눌렀어요`);
    }
    /* 🔒 **셀렉터마다 「탭 횟수 > 0」** — 아무것도 안 눌렀는데 타임아웃이 흐름을 끝까지
     *    미는 「자가 복구가 실패를 삼킴」을 막습니다. 계약은 **카드 수 + 1**(🏁 시작 한 번). */
    const taps = [];
    for (const s of SEEDS) for (const id of IDS) {
      const got = base[s].stages[id].presses;
      if (got !== DECK_N[id] + 1) taps.push(`시드${s}/${id}: 누름 ${got} ≠ 카드 ${DECK_N[id]} + 🏁 1`);
    }
    check(bad.length === 0 && taps.length === 0,
      `F-3. 🏁 **\`0'\` 대진 줄이 [경기 시작]을 누르기 「전」에 이미 큐를 지났다** (계약 D — 900ms가 무료인 자리)`
      + `\n     🔎 측정 조건 — 단계에 들어서서 **한 번도 안 누른 상태**에서 잽니다. 「존재한다」로만 재면 \`btn.onclick\` 안으로 옮겨도 통과해요`
      + `\n     🔒 그 단계의 누름 = 카드 수 + 🏁 1 — ${IDS.map((id) => `${id} ${base[SEEDS[0]].stages[id].presses}`).join(" · ")}`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : "")
      + (taps.length ? taps.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓓ F-4. 🔚 90' 종료 휘슬이 **마지막 줄** ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const f = base[s].stages[id].feed;
      const last = f[f.length - 1];
      if (!last) { bad.push(`시드${s}/${id}: 피드가 비었어요`); continue; }
      if (last.min !== 90) bad.push(`시드${s}/${id}: 마지막 줄이 ${last.min}' ("${last.text}")`);
      else if (last.text !== END_LINE) bad.push(`시드${s}/${id}: 90' 문구가 "${last.text}" ≠ \`END_LINE\``);
    }
    check(bad.length === 0,
      `F-4. 🔚 **\`90'\` 종료 휘슬이 마지막 카드 뒤에 온다** — 문구는 \`town.js\`의 \`END_LINE\`("${END_LINE}")`
      + `\n     ⏳ 정착 창 ${HOLD * 15}ms — \`delayOf()\`의 자동 진행 ${90}ms의 ${((HOLD * 15) / 90).toFixed(1)}배 (45ms면 큐 한가운데서 돌아와 이 줄이 통째로 사라집니다)`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓔ F-5. 🔁 흐름이 교대하고, 중등과 고등이 **서로 뒤집혀** 있다 ══════════
   * 🔴 **한 단계만 재면 안 됩니다** — `(j + sIdx) % 2`를 `j % 2`로 바꿔도 중등 하나만
   *    보면 `h → a`로 멀쩡해요. 두 단계를 **나란히** 놓아야 보입니다. */
  {
    const bad = [];
    for (const s of SEEDS) {
      const head = {};
      for (const id of ["m", "h"]) {
        const lead = leadFillersOf(base[s], id).map((x) => x.flow);
        head[id] = lead;
        if (lead.length !== DECK_N[id] - 1) bad.push(`시드${s}/${id}: 비-꼬리 필러 ${lead.length}장 (계약 ${DECK_N[id] - 1}장)`);
        else if (lead.slice().sort().join(",") !== "a,h") bad.push(`시드${s}/${id}: 흐름 ${lead.join("→")} — \`a\`와 \`h\`가 한 번씩이 아니에요`);
      }
      if (head.m && head.h && head.m.join() === head.h.join())
        bad.push(`시드${s}: 🔴 중등과 고등의 흐름이 **같습니다** (${head.m.join("→")}) — \`sIdx\`가 안 걸려요`);
    }
    check(bad.length === 0,
      `F-5. 🔁 **한 경기 안에서 \`a\`와 \`h\`가 한 번씩** 나오고, **중등과 고등이 서로 뒤집혀** 있다 (n=3)`
      + `\n     🔎 측정 조건 — 문구를 \`town.js\`의 \`FLOW_LINE\`으로 되짚어 흐름을 읽습니다 (표를 베껴 적지 않아요)`
      + `\n     시드${SEEDS[0]}: 중등 ${leadFillersOf(base[SEEDS[0]], "m").map((x) => x.flow).join("→")}`
      + ` · 고등 ${leadFillersOf(base[SEEDS[0]], "h").map((x) => x.flow).join("→")}`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓕ F-6. 🎯 꼬리 흐름이 **스코어를 탄다** — 값이 아니라 관계 ══════════
   * 🔒 「지는 판이면 `a`」를 값으로 박으면 시드 하나의 우연을 재게 됩니다.
   *    `GOAL_BY`를 뒤집으면 **꼬리 흐름도 반대로 뒤집혀야** 한다 — 그게 관계예요.
   * 🌍 이 문장이 서 있는 세계: 「꼬리 필러가 **그 단계의 최종 스코어만** 읽는 세계」입니다.
   *    꼬리가 스코어 말고 다른 것(예: 편차 `d`)을 읽기로 바뀌면 여기부터 다시 보세요. */
  {
    const flip = {};
    for (const s of SEEDS) flip[s] = await arc(s, withLog("FLIP"));
    const OPP = { a: "h", h: "a", mid: "mid" };
    const bad = [], pairs = [];
    let decided = 0;
    for (const s of SEEDS) for (const id of IDS) {
      const b = fillersOf(base[s], id).slice(-1)[0];
      const f = fillersOf(flip[s], id).slice(-1)[0];
      if (!b || !f) { bad.push(`시드${s}/${id}: 꼬리 필러를 못 찾았어요`); continue; }
      pairs.push(`${s}/${id} ${b.flow}→${f.flow}`);
      if (b.flow !== "mid") decided += 1;
      if (OPP[b.flow] !== f.flow) bad.push(`시드${s}/${id}: 꼬리 ${b.flow} → 뒤집으면 ${f.flow} (계약 ${OPP[b.flow]})`);
    }
    /* 🔑 **「아무 일도 안 일어났다」를 통과로 세지 않습니다** — 전부 무승부면 `mid → mid`라
     *    상수로 바꿔도 통과해요. 승부가 갈린 단계가 충분히 나왔는지 같이 봅니다. */
    const enough = decided >= MIN_DECIDED;
    check(bad.length === 0 && enough,
      `F-6. 🎯 **꼬리 필러의 흐름이 그 단계의 스코어를 탄다** — \`GOAL_BY\`를 뒤집으면 꼬리도 뒤집힌다`
      + `\n     🔎 측정 조건 — 승부가 갈린 단계 **${decided} / ${SEEDS.length * IDS.length}** (바닥 ${MIN_DECIDED}). 비긴 판은 \`mid → mid\`라 **잴 것이 없어서** 세지 않습니다`
      + `\n     ${pairs.join(" · ")}`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : "")
      + (enough ? "" : `\n     🔴 승부가 갈린 단계가 ${decided}벌뿐이라 이 문장이 "원래 같은 값"을 재고 있을 수 있어요 — **시드를 늘리세요**`));
  }

  /* ══════════ ⓖ F-7. 🔘 필러가 `deck`에 안 샌다 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) {
      for (const id of IDS) {
        const got = base[s].stages[id].dots;
        if (got !== DECK_N[id]) bad.push(`시드${s}/${id}: 진행 띠 점 ${got} ≠ ${DECK_N[id]}`);
      }
      if (base[s].cards !== TOTAL_CARDS) bad.push(`시드${s}: \`state.cards\` ${base[s].cards} ≠ ${TOTAL_CARDS}`);
    }
    check(bad.length === 0,
      `F-7. 🔘 **필러가 \`deck\`에 안 샌다** — 진행 띠의 점이 ${IDS.map((id) => DECK_N[id]).join("·")} 그대로이고 \`state.cards\`가 ${TOTAL_CARDS}`
      + `\n     🌍 필러를 \`deck\`에 넣기로 판정이 바뀌면 이 줄이 먼저 빨간불입니다 — 그때 \`_load.js\`의 \`passStage\`와 \`progHTML\`을 **같이** 보세요`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓗ F-8·F-9. 🗣️ 문구가 그 단계의 것이고, `flow` **필드**가 실린다 ══════════ */
  {
    const bad = [], noFlow = [];
    for (const s of SEEDS) for (const id of IDS) {
      for (const f of fillersOf(base[s], id)) {
        if (f.flow == null) bad.push(`시드${s}/${id} ${f.min}': 문구가 \`FLOW_LINE.${id}\`에 없어요 — "${f.text}"`);
      }
      /* 🔬 계측 로그 — 화면으로 나간 필러 카드에 `flow` 필드가 실렸는가.
       *    🔴 DOM만 보면 못 잡습니다: 문구는 `fillerText`가 따로 고르니 `flow: fl`을
       *       빼도 글자는 그대로예요. 그런데 그러면 🟩 판이 안 밀립니다(pitch-test P-7). */
      for (const d of base[s].draws.filter((x) => x.stage === id && x.kind === "filler")) {
        if (d.flow !== "a" && d.flow !== "h" && d.flow !== "mid")
          noFlow.push(`시드${s}/${id} ${d.min}': flow=${JSON.stringify(d.flow)}`);
      }
    }
    check(bad.length === 0,
      `F-8. 🗣️ **필러 문구가 그 단계의 \`FLOW_LINE\`에서 나온다** — 무대가 커지면 중계의 목소리도 자랍니다`
      + `\n     🔑 이 줄은 🎬 **세대 누수의 보조 자**이기도 해요 — 초등의 필러가 중등 피드에 뜨면 문구가 \`FLOW_LINE.m\`에 없습니다`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
    check(noFlow.length === 0,
      `F-9. 🌊 **필러 카드가 \`flow\`를 실어 화면에 간다** — \`town.js\`의 \`draw()\`를 계측해서 봅니다`
      + `\n     🔑 DOM만 보면 못 잡아요: \`flow: fl\`을 빼도 **문구는 그대로**입니다. 그런데 그러면 🟩 판이 안 밀려요 (\`pitch-test\` P-7과 한 쌍)`
      + (noFlow.length ? noFlow.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════════════════════════════════════════════════════════
   * 🔴 변이 검증 — **무엇을 망가뜨리면 어느 문장이 빨간불인가**
   * ══════════════════════════════════════════════════════════════
   * 🔒 「빨간불이 뜬다」로 끝내지 않고 **어느 문장이** 뜨는지 봅니다.
   *    변이 하나가 전부를 무너뜨리면 어느 계약이 무엇을 지키는지 알 수 없어요. */
  {
    const SEED = SEEDS[0];
    /* 각 변이가 무엇을 깨야 하는가 — `probe`가 재는 문장들의 이름 */
    const probe = async (name) => {
      const r = await arc(SEED, withLog(name));
      const f1 = IDS.every((id) => minsOf(r, id).join(",") === FEED_MIN[id].join(","));
      const f2 = IDS.every((id) => {
        const f = r.stages[id].feed;
        const at = f.map((x, i) => (x.cls.indexOf("w2-half") >= 0 ? i : -1)).filter((i) => i >= 0);
        if (at.length !== 1) return false;
        return !f.slice(0, at[0]).some((x) => x.min != null && x.min > HALF_AT)
          && !f.slice(at[0] + 1).some((x) => x.min != null && x.min <= HALF_AT);
      });
      const f3 = IDS.every((id) => r.stages[id].before.feed.filter((x) => x.min === 0).length === 1);
      const f4 = IDS.every((id) => {
        const last = r.stages[id].feed.slice(-1)[0];
        return !!last && last.min === 90 && last.text === END_LINE;
      });
      const f5 = (() => {
        const m = leadFillersOf(r, "m").map((x) => x.flow).join();
        const h = leadFillersOf(r, "h").map((x) => x.flow).join();
        return m !== h && m.split(",").slice().sort().join() === "a,h";
      })();
      const f1b = IDS.every((id) => {
        const n = DECK_N[id];
        const M = Array.from({ length: n }, (_, k) => minAt(k, n));
        return fillersOf(r, id).map((x) => x.min).join(",") === fillMin(M).filter((v) => v !== HALF_AT).join(",");
      });
      const f7 = IDS.every((id) => r.stages[id].dots === DECK_N[id]) && r.cards === TOTAL_CARDS;
      const f9 = r.draws.filter((x) => x.kind === "filler")
        .every((d) => d.flow === "a" || d.flow === "h" || d.flow === "mid");
      return { "F-1": f1, "F-1b": f1b, "F-2": f2, "F-3": f3, "F-4": f4, "F-5": f5, "F-7": f7, "F-9": f9 };
    };
    /* `red` = **반드시** 빨간불이어야 하는 문장 · `also` = **딸려 오는 것이 정상**인 문장.
     * 🔴 `also`를 빈칸으로 두는 것이 기본입니다 — 여기에 이름을 적을 때는 **왜 딸려 오는지**를
     *    옆에 적으세요. 안 적으면 다음 사람이 「원래 저 검사는 같이 빨간불이야」로 배웁니다.
     * 🔒 `red`도 `also`도 아닌 문장이 빨간불이면 **그건 계약 위반**이에요 — 성질이 다른 것이
     *    한 검사에 묶여 있다는 뜻이라, 고친 뒤에도 빨간불이 남아 신호를 잃습니다. */
    const WANT = {
      "M-NOFILL": { red: ["F-1", "F-2"], also: [] },   // 카드 앞 대본이 통째로 사라져요 (필러 + 하프타임)
      "M-NOEND": { red: ["F-1", "F-1b", "F-4"], also: [] },   // 꼬리 필러 + 🔚 종료 휘슬
      "M-LATEKICK": { red: ["F-3"], also: [] },        // 🏁 0'이 누른 「뒤」로
      "M-NOHALF": { red: ["F-2"], also: [] },          // 🥅 0장
      "M-HALFPOS": { red: ["F-2"], also: [] },         // 🥅 자리가 한 칸 앞 (장수는 그대로 1장)
      "M-NOSIDX": { red: ["F-5"], also: [] },          // 중등과 고등이 같아짐
      /* 🔑 `deck`이 한 장 늘면 `minAt`이 통째로 옮겨져서 필러 **슬롯 번호**도 같이 밀립니다 —
       *    그래서 F-5(흐름 교대)가 딸려 옵니다. 「필러가 deck에 새면 대본 전체가 흔들린다」가
       *    사실이라 이건 정상 신호예요. F-7이 그 뿌리를 가리킵니다. */
      "M-DECKLEAK": { red: ["F-1", "F-7"], also: ["F-5", "F-1b"] },
      /* 🔑 **F-1b(관계)를 무는 자리** — 그려진 필러 분이 소스 산식과 갈라집니다.
       *    🏫 초5(n=2)에서만 보여요: 중고등의 F는 34·57·79라 45가 없습니다. */
      "M-KEEP45": { red: ["F-1", "F-1b"], also: [] },
    };
    for (const [name, w] of Object.entries(WANT)) {
      const got = await probe(name);
      const red = Object.keys(got).filter((k) => !got[k]);
      const miss = w.red.filter((k) => !red.includes(k));
      const extra = red.filter((k) => !w.red.includes(k) && !w.also.includes(k));
      const ok = miss.length === 0 && extra.length === 0;
      check(ok, `변이-${name} → **${w.red.join(" · ")}**이 빨간불`
        + (w.also.length ? ` (딸려 오는 것이 정상: ${w.also.join(" · ")})` : "")
        + `\n     실제로 빨간불: ${red.length ? red.join(" · ") : "🔴 없음 — 이 변이가 아무 데도 안 걸립니다"}`
        + (miss.length ? `\n     🔴 **안 잡힌 것: ${miss.join(" · ")}** — 그 문장은 지금 아무것도 안 지킵니다` : "")
        + (extra.length ? `\n     🔴 **뜻밖에 같이 무너진 것: ${extra.join(" · ")}** — 성질이 다른 것이 한 문장에 묶였는지 보세요`
          + ` (딸려 오는 게 맞으면 \`also\`에 **이유와 함께** 적으세요)` : ""));
    }
    /* 🎯 M-TAILCONST는 **관계**를 깨는 변이라 base 하나로는 안 보입니다 — FLIP과 짝지어야 해요 */
    {
      const b = await arc(SEED, withLog("M-TAILCONST"));
      const f = await arc(SEED, { "town.js": [...MUT.LOG["town.js"], ...MUT["M-TAILCONST"]["town.js"],
        ...MUT.FLIP["town.js"]] });
      const OPP = { a: "h", h: "a", mid: "mid" };
      const kept = IDS.filter((id) => {
        const x = fillersOf(b, id).slice(-1)[0], y = fillersOf(f, id).slice(-1)[0];
        return x && y && OPP[x.flow] === y.flow;
      });
      /* 🔒 꼬리를 상수로 바꾸면 **뒤집어도 안 뒤집힙니다** — 세 단계 전부 어긋나야 합니다.
       *    (상수가 `mid`라 `mid → mid`는 관계상 「뒤집힘」과 구분이 안 돼요. 그래서
       *     ① base의 꼬리가 전부 상수 하나인가 ② 승부가 갈린 단계가 있는가를 같이 봅니다.) */
      const tails = IDS.map((id) => (fillersOf(b, id).slice(-1)[0] || {}).flow);
      const allSame = tails.every((t) => t === tails[0]);
      check(allSame && kept.length === IDS.length,
        `변이-M-TAILCONST → **F-6이 빨간불**이어야 한다 — 꼬리 흐름 ${tails.join(" · ")} (전부 같은 값 ${allSame ? "✔" : "🔴"})`
        + `\n     🔑 base 하나로는 안 보입니다 — 상수도 「어떤 값」이라 F-1~F-5·F-7은 전부 초록불이에요. **FLIP과 짝지어야** 보입니다`
        + (allSame && kept.length === IDS.length ? "" :
          `\n     🔴 뒤집어도 안 뒤집히는 단계가 ${IDS.length - kept.length}개뿐이에요 — 변이가 덜 걸렸는지 보세요`));
    }
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
