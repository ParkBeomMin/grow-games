/* ⚽ 더 윙어 II — ⏱️ **시계가 0'부터 90'까지 쭉 흐르는가** (`beta/winger2/town.js`)
 *
 * 계기: 범민 님 — *"아니 0분부터 90분까지 **쭉 흘러가고** 중계텍스트가 나와야한다구..
 *      **첫 카드까지 걸리는 시간이 느는건 상관없어**"*
 *      (설계 `153_designer_clock.md` · 구현 `155_engineer_clock.md`)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **이 파일이 생긴 이유** — engineer가 155번 §6에서 시계를 통째로 건너뛰게 만드는 변이를
 *    넣고 검사 10종을 돌렸는데 **다섯 판이 무변이와 한 글자도 안 달랐습니다.**
 *    시계를 지키는 문장이 **하나도 없었어요.**
 *
 *   | 변이 | 무엇이 사라지나 | 잡은 검사 |
 *   |---|---|---|
 *   | `clockMin += 1` → `clockMin = target` | 「0분부터 90분까지 쭉」이 **통째로** | 🔴 0건 |
 *   | ⏩ 갈래에서만 틱 건너뜀 | **검사가 보는 세계에서만** 시계가 사라짐 | 🔴 0건 |
 *   | `draw()`가 프라미스를 안 돌려줌 | 시계가 줄을 **추월** | 🔴 0건 |
 *   | 결과·[다음]을 `land()`로 되돌림 | 결과가 **경기보다 먼저** | 🔴 0건 |
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 🔒 지키는 것
 *   ① **벽시계를 한 번도 안 잽니다.** 네 문장이 전부 **개수·관계·순서**예요 —
 *      느린 기기에서 우연히 빨간불이 나면 그 검사가 신호를 잃습니다(`raf-test`가 그 자리).
 *   ② **게임 입구(타이틀)에서 진짜 버튼을 눌러** 학교 아크를 지납니다.
 *   ③ **산식은 소스에서**(`MIN_MS`·`minMs`·`FLOW_MS`·`delayOf`·`GRID`·`flowMins`·`minAt`),
 *      **계약은 검사에 박습니다**(틱 90칸 · 계약 B 15초).
 *   ④ 💥 **계측·산식을 못 뜯으면 종료 코드 2**로 죽습니다 — 「0건 위반」을 초록불로 읽지 않아요.
 *
 * 🌍 **이 파일의 계약이 서 있는 세계**
 *   「⏱️ 시계가 `town.js`의 `await` 루프 **하나**로 돌고, `1'`부터 `90'`까지 **한 칸씩** 오르며,
 *    ⏩·🤖는 **간격만** 0으로 만드는 세계」입니다 (설계 153번 §3-2 · §5-3).
 *   · 🔴 **`setInterval`로 되돌리면** 시간축이 둘이 되어 C-1의 수열이 순서를 잃습니다.
 *   · 🔴 **`match-scene.js` 안에서 시계를 돌리면** 그 파일의 「`dt`도 `rAF`도 안 쓴다」가
 *     사라지고 `raf-test`가 지키던 자리가 통째로 열려요 — 그때는 여기가 아니라 거기부터 보세요.
 *   · ⏩ **틱을 건너뛰기로 판정이 바뀌면** C-1이 먼저 빨간불입니다. 그건 정상 신호예요.
 *
 * ⏱️ 약 60초 걸립니다 (아크 2벌).
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, pageMutsOK, townAuto, tapFoot, tapChildArc, pickOrigin, passEarly, seedBoth, stageIdle, wait, PAGE_DIR }
  = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const die = (why, detail) => {
  console.log(`\n💥 **${why} — 이건 초록불도 빨간불도 아닙니다** (안 돈 겁니다)`);
  (detail || []).forEach((d) => console.log(`   · ${d}`));
  process.exit(2);
};

/* ══════════════════════════════════════════════════════════════
 * 📐 산식은 **소스에서** — 값을 베껴 적으면 표가 갈라져요
 * ══════════════════════════════════════════════════════════════ */
const TOWN = fs.readFileSync(path.join(PAGE_DIR, "town.js"), "utf8");
const SCENE = fs.readFileSync(path.join(PAGE_DIR, "match-scene.js"), "utf8");
const one = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
const num = (src, re) => { const m = src.match(re); return m ? parseInt(m[1], 10) : NaN; };

const S_MIN_MS = one(TOWN, /const MIN_MS = \d+;/);
const S_MINMS_FN = one(TOWN, /const minMs = \(\) => [^;]+;/);
const S_HALF = one(TOWN, /const HALF_MIN = \d+;/);
const S_GRID = one(TOWN, /const GRID = \d+;/);
const S_NEAR = one(TOWN, /const GRID_NEAR = [^;]+;/);
const S_FLOWMINS = one(TOWN, /const flowMins = \(cardMins\) => \{[\s\S]*?\n  \};/);
const S_MINAT = one(TOWN, /const minAt = \([^)]*\) => [^;]*;/);
const MIN_MS = num(TOWN, /const MIN_MS = (\d+);/);
const FLOW_MS = num(SCENE, /const FLOW_MS = (\d+);/);
const DECIDE_MS = num(SCENE, /const base = d <= 1 \? (\d+) :/);

const build = (body, ret) => { try { return new Function(`${body}\nreturn ${ret};`)(); } catch (e) { return null; } };
const minAt = build(S_MINAT || "", "minAt");
const flowMins = (S_HALF && S_GRID && S_NEAR && S_FLOWMINS)
  ? build(`${S_HALF}\n${S_GRID}\n${S_NEAR}\n${S_FLOWMINS}`, "flowMins") : null;
/* 🔒 `minMs`는 **자유 변수 두 개**(`Scene`·`MIN_MS`)를 인자로 받아 굴립니다 —
 *    직접 `eval`을 안 쓰고, 소스의 그 줄을 **글자 그대로** 씁니다. */
const minMsOf = S_MINMS_FN
  ? (() => { try { return new Function("Scene", "MIN_MS", `${S_MINMS_FN}\nreturn minMs();`); } catch (e) { return null; } })()
  : null;
const HALF_AT = num(TOWN, /const HALF_MIN = (\d+);/);

/* ══════════════════════════════════════════════════════════════
 * 🔒 계약은 **검사에 박습니다**
 * ══════════════════════════════════════════════════════════════ */
const TICKS = 90;                       // ⏱️ 0' → 90'을 한 칸씩. 🔒 경기의 길이지 손잡이가 아니에요
const DECK_N = { e: 2, m: 3, h: 3 };
const IDS = ["e", "m", "h"];
/* 🔒 **계약 B — 결정 사이 15초** (설계 130번 §5-2). 🆕 값이 아니라 **이미 있던 계약**입니다.
 * 🔎 문턱 두 줄:
 *   ① 무엇과 견주나 — 계약 B의 15초. 🔴 실측이 아니라 **소스 상수로 다시 한 산수**와 견줍니다
 *   ② 어느 칸에서 재나 — 🏫 **세 단계 × 결정 사이 전부**. 최악이 초5 카드0→1이라
 *      **초5를 빼면 눈이 멉니다** (설계 §6-2 C-3) */
const CONTRACT_B_MS = 15000;
const SEEDS = [7, 42];

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 학교 경기에 닿습니다
 * ══════════════════════════════════════════════════════════════ */
async function arc(seed, muts) {
  const W = bootPage(muts ? { muts } : {});
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
  const cur = () => (D.querySelector(".screen.active") || {}).id;
  const rows = () => Array.from(D.querySelectorAll("#town-scene .w2-feed > *")).map((n) => {
    const m = n.querySelector(".w2-min");
    return { cls: String(n.className),
      min: m ? parseInt(String(m.textContent).replace(/\D/g, ""), 10) : null };
  });
  const stages = {};

  async function stage(id) {
    await stageIdle(D);
    let presses = 0;
    const snap = { clocks: [], atButton: null, resultBefore: null, resultAfter: null };
    for (let g = 0; g < 8; g++) {
      if (cur() !== "screen-town") break;
      const b = D.getElementById("btn-town-next");
      if (!b || b.disabled || b.classList.contains("hidden")) break;
      /* 🔬 **누르기 「전」의 결과 칸** — 경기 중에는 비어 있어야 합니다 (C-4) */
      if (presses === 0) snap.resultBefore = String((D.getElementById("town-result") || {}).textContent || "");
      press(b, `🏫 ${id} 진행`);
      presses += 1;
      await stageIdle(D);
      /* 🔬 **이 단계의 틱 수열** — `mount()`가 단계마다 비우므로 **다음 단계로 넘어가기 전에** 읽습니다 */
      if (presses === 1) {
        const T = W.W2Scene && W.W2Scene._t;
        snap.clocks = (T && T.clocks) ? T.clocks() : null;
        /* 🔬 **버튼이 보이는 그 시점의 피드 마지막 줄**과 결과 칸 (C-4) */
        snap.atButton = rows();
        snap.resultAfter = String((D.getElementById("town-result") || {}).textContent || "");
      }
    }
    stages[id] = { presses, ...snap };
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
  const out = { seed, stages, taps };
  W.close();
  return out;
}

/* ══════════════════════════════════════════════════════════════
 * 🔴 변이 — engineer 155번 §6이 「검사 0건」으로 적은 다섯 자리
 * ══════════════════════════════════════════════════════════════
 * 🔒 **디스크를 안 고칩니다** — `bootPage({muts})`가 읽어 온 소스 문자열에 얹어요.
 *    그래서 `git archive` 격리가 필요 없고, `_load.js`의 절대 경로 함정에도 안 걸립니다. */
const MUT = {
  /* ⓐ ⏱️ **시계가 90칸을 대본 줄 수만큼으로 건너뜁니다** — 「0분부터 90분까지 쭉」이 통째로 사라져요 */
  "M-SKIP": { "town.js": [[/        clockMin \+= 1;/, "        clockMin = target;"]] },
  /* ⓑ ⏩ **갈래에서만** 건너뜁니다 — 🔴 검사가 🤖 자동 진행으로 도니까
   *    **검사가 보는 세계에서만** 시계가 사라집니다. 사람 눈에는 멀쩡해 보여요 */
  "M-FASTSKIP": { "town.js": [[/      while \(clockMin < target\) \{/,
    "      if (minMs() === 0 && clockMin < target) { clockMin = target; return Scene && Scene.clock ? Scene.clock(clockMin, myGen) : true; }\n      while (clockMin < target) {"]] },
  /* ⓒ 🔴 `draw()`가 **프라미스를 안 돌려줍니다** — 시계가 줄을 추월해서
   *    `finishMatch()`가 90' 줄보다 먼저 붙어요 */
  "M-NOPROMISE": { "town.js": [[/      return queue;\n    \};/, "      return;\n    };"]] },
  /* ⓓ 🔴 결과·[다음]을 **`land()`로 되돌립니다** — *"🏁 1:1 — 비겼어요"*가 경기보다 먼저 */
  "M-EARLYRESULT": { "town.js": [[/^      runClock\(\);\n    \}$/m,
    "      if (i >= deck.length) { finishMatch(); return; }\n      runClock();\n    }"]] },
  /* ⓔ ⏩ **가 판정에 닿습니다** — 「연출만 · 세이브에 0」이 깨져요 (engineer 155번 §6 M3).
   *    🔴 `Scene.fast()` **앞**에 넣습니다 — 사람이 실제로 누르는 그 자리예요 */
  "M-FASTJUDGE": { "town.js": [[/      btn\.onclick = \(\) => \{\n        Scene\.fast\(\);/,
    "      btn.onclick = () => {\n        state.score += 1;\n        Scene.fast();"]] },
  /* ⓕ ⏩ **손잡이를 통째로 없앱니다** — 길이의 손잡이가 사라져요 (원칙 ③) */
  "M-NOFAST": { "town.js": [[/^      showFast\(\);/m, "      ;"]] },
};

/* ⏩ **[빨리감기]를 실제로 눌러 보는 탐침** — 🔴 `townAuto`를 **안 켭니다**.
 * 🔑 `showFast()`가 *"이미 빨리감기 중이면 스스로 물러난다"*라, 🤖 자동 진행을 켠 검사는
 *    **⏩ 클릭 경로를 한 번도 안 지납니다.** 그래서 이 탐침이 따로 있어요.
 * 🔒 🔥 첫 카드「전」에 끝냅니다 — 미니게임을 사람이 쳐야 하는 자리에 안 갑니다. */
async function fastProbe(muts) {
  const W = bootPage(muts ? { muts } : {});
  seedBoth(W, SEEDS[0]);
  const D = W.document;
  let taps = 0;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what})`);
    for (const t of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true }));
    }
    taps += 1;
  };
  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(W, press, "R");
  /* 🔴 `townAuto`를 **안 켭니다** — ⏩가 붙는 유일한 세계예요 */
  pickOrigin(W, press, "seoul");
  await tapChildArc(W, press, ["ball", "fin", "gn", "h1"]);
  press(D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg");
  const T = W.WingerTown;
  const btn = () => D.getElementById("btn-town-next");
  press(btn(), "🏁 경기 시작");
  /* ⏩ 버튼은 0' 두 줄의 큐가 빈 「뒤」에 붙습니다 (engineer 155번 §4-2) */
  for (let i = 0; i < 400 && !(btn() && btn().classList.contains("town-fast")); i++) await wait(15);
  const b = btn();
  const showed = !!(b && b.classList.contains("town-fast") && !b.disabled && !b.classList.contains("hidden"));
  const before = { score: T.score(), cards: T.cards(), dev: T.deviation() };
  if (showed) press(b, "⏩ 빨리감기");
  await wait(60);
  const after = { score: T.score(), cards: T.cards(), dev: T.deviation() };
  const Sc = W.W2Scene;
  const out = { showed, pressed: showed, before, after, taps,
    isFast: !!(Sc && Sc.isFast && Sc.isFast()),
    gone: !!(b && (b.classList.contains("hidden") || b.disabled) && !b.classList.contains("town-fast")) };
  W.close();
  return out;
}

(async () => {
  /* ══════════ 0. 산식을 지금 소스에서 뽑았는가 ══════════ */
  {
    const got = {
      MIN_MS: Number.isFinite(MIN_MS), minMs: typeof minMsOf === "function",
      FLOW_MS: Number.isFinite(FLOW_MS), delayOf: Number.isFinite(DECIDE_MS),
      minAt: typeof minAt === "function", flowMins: typeof flowMins === "function",
      HALF_MIN: Number.isFinite(HALF_AT),
    };
    const bad = Object.keys(got).filter((k) => !got[k]);
    if (bad.length) die("산식·상수를 소스에서 못 뜯었습니다", bad.map((k) => `${k} 🔴`));
    console.log(`✅ 0-1. 📐 소스에서 뽑았다 — ${Object.keys(got).map((k) => `${k} ✔`).join(" · ")}`);
    console.log(`     MIN_MS ${MIN_MS}ms · FLOW_MS ${FLOW_MS}ms · 결정 줄 ${DECIDE_MS}ms · HALF ${HALF_AT}'`);
  }

  const base = {};
  for (const s of SEEDS) base[s] = await arc(s);

  /* ══════════ C-1. ⏱️ 시계가 1'부터 90'까지 한 칸도 안 건너뛴다 ══════════
   * 🔒 **개수와 관계만 봅니다 — 벽시계 0회.**
   * 🔑 이 검사는 🤖 자동 진행으로 도니까 **`minMs()`가 0인 세계**에서 재는 것이고,
   *    그래서 C-2와 **한 벌**입니다: ⏩ 갈래에서만 틱을 건너뛰는 변이도 여기서 잡혀요.
   * 🔒 `0'`은 `mount()`가 그린 초기값이라 로그에 안 들어옵니다 — 틱만 기록해요. */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const c = base[s].stages[id].clocks;
      if (!c) { bad.push(`시드${s}/${id}: \`W2Scene._t.clocks()\`가 없어요 — 화면이 시계를 기록 안 합니다`); continue; }
      if (c.length !== TICKS) { bad.push(`시드${s}/${id}: 틱 ${c.length}칸 (계약 ${TICKS}칸) — ${c.slice(0, 12).join("·")}${c.length > 12 ? "…" : ""}`); continue; }
      if (c[0] !== 1) bad.push(`시드${s}/${id}: 첫 틱이 ${c[0]}' (계약 1')`);
      if (c[c.length - 1] !== TICKS) bad.push(`시드${s}/${id}: 끝 틱이 ${c[c.length - 1]}' (계약 ${TICKS}')`);
      const jump = c.findIndex((v, k) => k > 0 && v - c[k - 1] !== 1);
      if (jump > 0) bad.push(`시드${s}/${id}: ${c[jump - 1]}' → ${c[jump]}'로 **건너뜁니다**`);
    }
    check(bad.length === 0,
      `C-1. ⏱️ **시계가 \`1'\`부터 \`${TICKS}'\`까지 한 칸도 안 건너뛴다** — 범민 님의 *"0분부터 90분까지 쭉"*`
      + `\n     🔎 재는 것 — 틱 **개수 ${TICKS}칸** · 첫 \`1'\` · 끝 \`${TICKS}'\` · **이웃 차가 전부 +1**. 벽시계 **0회**`
      + `\n     🔑 🤖 자동 진행(= \`minMs()\`가 0)으로 돕니다 — **⏩ 갈래에서만 건너뛰는 변이도 여기서** 잡혀요 (C-2와 한 벌)`
      + `\n     시드${SEEDS[0]}: ${IDS.map((id) => { const c = base[SEEDS[0]].stages[id].clocks; return `${id} ${c ? c.length : "🔴"}칸`; }).join(" · ")}`
      + (bad.length ? bad.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ C-2. ⏱️ ⏩·🤖는 「간격」만 0이지 틱을 안 건너뛴다 ══════════
   * 🔒 **관계입니다** — 소스의 `minMs` 한 줄을 그대로 굴려 **두 갈래**를 봅니다. */
  {
    const fast = minMsOf({ isFast: () => true }, MIN_MS);
    const slow = minMsOf({ isFast: () => false }, MIN_MS);
    const none = minMsOf(null, MIN_MS);
    const ok = fast === 0 && slow === MIN_MS && MIN_MS > 0 && none === MIN_MS;
    check(ok,
      `C-2. ⏱️ **\`minMs()\`가 두 갈래다** — ⏩·🤖면 **${fast}ms**, 아니면 **${slow}ms** (그리고 \`MIN_MS > 0\`)`
      + `\n     🔒 소스의 \`minMs\` 한 줄을 \`new Function\`으로 **그대로** 굴립니다 (직접 \`eval\` 안 씀)`
      + `\n     🔑 **C-1과 한 벌입니다** — 여기서 «간격이 0»을 확인하고, C-1이 «그래도 틱은 ${TICKS}칸»을 확인해요.`
      + ` 한쪽만 두면 ⏩ 세계(= 검사가 실제로 도는 세계)가 통째로 안 지켜집니다`
      + `\n     🌍 화면이 없을 때(\`Scene\`이 null)도 ${none}ms — 옛 동작 그대로예요`
      + (ok ? "" : `\n     🔴 ⏩ ${fast} · 보통 ${slow} · MIN_MS ${MIN_MS} — 「간격만 0」이 안 지켜집니다`));
  }

  /* ══════════ C-3. ⏱️ 최장 무조작 구간이 계약 B(15초) 안 ══════════
   * 🔒 **검사가 소스 상수로 산수를 다시 합니다** — 벽시계 **0회**.
   *    `MIN_MS`·`FLOW_MS`·`delayOf`의 결정 줄·`GRID`·`flowMins`·`minAt`을 뜯어 §5-1 표를 재계산해요.
   * 🌍 이 문장이 서 있는 세계: 「🥅 하프타임만 결정 줄 딜레이(${DECIDE_MS}ms)를 쓰고
   *    🌊 흐름·🏁 킥오프·🔚 종료는 `FLOW_MS`를 쓰는 세계」(설계 149번 §4-1). */
  {
    const rows = [];
    for (const id of IDS) {
      const n = DECK_N[id];
      const M = Array.from({ length: n }, (_, k) => minAt(k, n));
      const F = flowMins(M);
      /* 🥅 하프타임은 `분 ≤ 45`인 줄 뒤에 한 장 — `town.js`의 삽입 규칙 그대로 */
      const lineMs = (min) => (min === HALF_AT ? DECIDE_MS : FLOW_MS);
      const between = (a, b) => F.filter((m) => m > a && m <= b).reduce((x, m) => x + FLOW_MS, 0)
        + (a < HALF_AT && HALF_AT <= b ? DECIDE_MS : 0);
      /* 🏁 [시작] → 카드0 : 시계 + 그 사이 줄 + open */
      rows.push({ id, what: "🏁 시작 → 카드0", ms: M[0] * MIN_MS + between(0, M[0]) + DECIDE_MS });
      /* 🔥 카드k → 카드k+1 : close + 시계 + 사이 줄 + open */
      for (let k = 0; k + 1 < n; k++) {
        rows.push({ id, what: `🔥 카드${k} → 카드${k + 1}`,
          ms: DECIDE_MS + (M[k + 1] - M[k]) * MIN_MS + between(M[k], M[k + 1]) + DECIDE_MS });
      }
      /* 🔚 마지막 카드 → [다음] : close + 시계 + 꼬리 줄 + 90' 종료 */
      rows.push({ id, what: "🔥 마지막 → 🔚 [다음]",
        ms: DECIDE_MS + (90 - M[n - 1]) * MIN_MS + between(M[n - 1], 90) + FLOW_MS });
      void lineMs;
    }
    const worst = rows.reduce((a, b) => (b.ms > a.ms ? b : a));
    const ok = worst.ms < CONTRACT_B_MS;
    check(ok,
      `C-3. ⏱️ **최장 무조작 구간이 계약 B(${CONTRACT_B_MS / 1000}초) 안** — 최악 **${(worst.ms / 1000).toFixed(2)}초** (🏫 ${worst.id} · ${worst.what})`
      + `\n     🔎 문턱 두 줄 — ① 견주는 상대: **계약 B**(결정 간격 ≤ ${CONTRACT_B_MS / 1000}초 · 이미 있던 계약)`
      + `\n                    ② 재는 칸: 🏫 **세 단계 × 결정 사이 전부**. 최악이 초5 카드0→1이라 **초5를 빼면 눈이 멉니다**`
      + `\n     🔒 벽시계를 **한 번도 안 잽니다** — \`MIN_MS\`·\`FLOW_MS\`·\`delayOf\`를 소스에서 뜯어 **다시 한 산수**예요`
      + `\n     ${rows.map((r) => `${r.id}/${r.what} ${(r.ms / 1000).toFixed(2)}s`).join(" · ")}`
      + (ok ? `\n     🟢 여유 ${((CONTRACT_B_MS - worst.ms) / 1000).toFixed(2)}초` :
        `\n     🔴 계약 B를 넘었습니다 — 🔒 손대는 곳은 **\`MIN_MS\` 하나**예요 (줄을 빼거나 \`FLOW_MS\`를 만지지 마세요)`));
  }

  /* ══════════ C-4. 🔚 90' 종료 줄이 [다음] 버튼보다 먼저 ══════════
   * 🔴 시계가 도는 채로 *"🏁 1:1 — 비겼어요"*가 먼저 뜨면 **결과가 경기보다 먼저**입니다.
   * 🔒 순서를 봅니다 — 절대값도 벽시계도 없습니다. */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const st = base[s].stages[id];
      const f = st.atButton;
      if (!f || !f.length) { bad.push(`시드${s}/${id}: 버튼이 보일 때 피드가 비었어요`); continue; }
      const last = f[f.length - 1];
      if (last.min !== 90) bad.push(`시드${s}/${id}: 버튼이 보일 때 마지막 줄이 ${last.min}' — 🔚 90'이 아직 안 왔습니다`);
      if (String(st.resultBefore || "").trim() !== "")
        bad.push(`시드${s}/${id}: 경기 「전」에 결과 칸이 차 있어요 — "${String(st.resultBefore).slice(0, 24)}"`);
      if (String(st.resultAfter || "").trim() === "")
        bad.push(`시드${s}/${id}: 🔚 뒤에 결과 칸이 비었어요 — \`finishMatch()\`가 안 썼습니다`);
    }
    check(bad.length === 0,
      `C-4. 🔚 **\`90'\` 종료 줄이 [다음] 버튼보다 「먼저」** 온다 — 결과가 경기보다 먼저 안 나옵니다`
      + `\n     🔎 재는 것 — 버튼이 보이는 **그 시점**의 피드 마지막 줄이 \`90'\`인가 · \`#town-result\`가 경기 전엔 비고 뒤엔 차는가`
      + `\n     🔑 **양쪽을 같이 봅니다** — 「90'이 있다」만 재면 결과를 \`land()\`로 되돌려도 통과해요`
      + `\n     시드${SEEDS[0]}: ${IDS.map((id) => { const f = base[SEEDS[0]].stages[id].atButton; return `${id} 마지막 ${f && f.length ? f[f.length - 1].min + "'" : "🔴"}`; }).join(" · ")}`
      + (bad.length ? bad.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ C-6. ⏩ [빨리감기]가 **판정에 한 톨도 안 닿는다** ══════════
   * 🆕 engineer 155번 §6의 **M3**입니다 — 설계에도 짝이 없던 자리예요.
   * 🔴 **왜 아무도 안 보고 있었나**: `showFast()`가 *"이미 빨리감기 중이면 스스로 물러난다"*라
   *    🤖 자동 진행을 켠 검사(= 학교를 지나는 검사 **전부**)는 **⏩ 클릭 경로를 한 번도 안 지납니다.**
   *    그래서 「⏩는 연출만」이라는 계약이 **원리적으로** 안 지켜지고 있었습니다.
   * 🔒 그래서 이 문장만 🤖 자동 진행을 **끄고** 재요.
   * 🔑 **넷을 같이 봅니다** — ① ⏩가 실제로 뜨는가 ② 눌렀더니 `isFast()`가 참이 되는가
   *    ③ `state`가 한 톨도 안 움직이는가 ④ 한 번짜리라 사라지는가.
   *    ①③만 재면 **버튼이 아무 일도 안 해도** 초록불이고(「환경이 우연히 막아 줌」),
   *    ②만 재면 **점수가 새도** 통과합니다. */
  {
    const f = await fastProbe(null);
    const same = f.before.score === f.after.score && f.before.cards === f.after.cards
      && f.before.dev === f.after.dev;
    const ok = f.showed && f.isFast && same && f.gone;
    check(ok,
      `C-6. ⏩ **[빨리감기]가 판정에 한 톨도 안 닿는다** — 🔒 연출만 짧아지고 세이브·점수는 그대로`
      + `\n     🔎 측정 조건 — 🤖 자동 진행을 **끄고** 잽니다 (\`showFast()\`가 ⏩ 중이면 스스로 물러나서, 켜면 이 경로를 **한 번도 안 지나요**)`
      + `\n     ⏩가 떴나 ${f.showed ? "✔" : "🔴"} · 누르니 \`isFast()\` ${f.isFast ? "✔" : "🔴"}`
      + ` · 점수 ${f.before.score}→${f.after.score} · 판 ${f.before.cards}→${f.after.cards} · 편차 ${f.before.dev}→${f.after.dev}`
      + ` · 한 번짜리로 사라졌나 ${f.gone ? "✔" : "🔴"}`
      + (ok ? `\n     🔑 넷을 같이 봅니다 — 「뜬다」만 재면 버튼이 아무 일도 안 해도 통과하고, 「빨라진다」만 재면 점수가 새도 통과해요` : "")
      + (f.showed ? "" : `\n     🔴 ⏩가 안 떠요 — \`showFast()\`가 사라졌거나 🤖 자동 진행이 켜져 있습니다`)
      + (same ? "" : `\n     🔴 **⏩가 판정에 닿았습니다** — 「연출만 · 세이브에 0」이 깨졌어요`));
  }

  /* ══════════════════════════════════════════════════════════════
   * 🔴 변이 검증 — **무엇을 망가뜨리면 어느 문장이 빨간불인가**
   * ══════════════════════════════════════════════════════════════
   * 🔒 「빨간불이 뜬다」로 끝내지 않고 **어느 문장이** 뜨는지 봅니다. */
  {
    const bad = pageMutsOK(MUT);
    const n = Object.values(MUT).reduce((a, t) => a + Object.values(t).reduce((b, m) => b + m.length, 0), 0);
    check(bad.length === 0, `0-2. 🔴 변이 정규식 ${n}개가 지금 \`beta/winger2/town.js\`에 전부 걸린다`
      + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 "안 도는" 상태예요**`
        + bad.map((b) => `\n       · ${b}`).join("") : ""));
    if (bad.length) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }

    const probe = async (name) => {
      const r = await arc(SEEDS[0], MUT[name]);
      const c1 = IDS.every((id) => {
        const c = r.stages[id].clocks;
        return !!c && c.length === TICKS && c[0] === 1 && c[c.length - 1] === TICKS
          && c.every((v, k) => k === 0 || v - c[k - 1] === 1);
      });
      const c4 = IDS.every((id) => {
        const f = r.stages[id].atButton;
        return !!f && !!f.length && f[f.length - 1].min === 90
          && String(r.stages[id].resultAfter || "").trim() !== "";
      });
      return { "C-1": c1, "C-4": c4 };
    };
    const WANT = {
      "M-SKIP": ["C-1"],
      "M-FASTSKIP": ["C-1"],
      "M-NOPROMISE": ["C-4"],
      "M-EARLYRESULT": ["C-4"],
    };
    for (const [name, red] of Object.entries(WANT)) {
      const got = await probe(name);
      const gotRed = Object.keys(got).filter((k) => !got[k]);
      const miss = red.filter((k) => !gotRed.includes(k));
      check(miss.length === 0,
        `변이-${name} → **${red.join(" · ")}**이 빨간불`
        + `\n     실제로 빨간불: ${gotRed.length ? gotRed.join(" · ") : "🔴 없음 — 이 변이가 아무 데도 안 걸립니다"}`
        + (miss.length ? `\n     🔴 **안 잡힌 것: ${miss.join(" · ")}** — 그 문장은 지금 아무것도 안 지킵니다` : ""));
    }
    /* ⏩ 두 변이는 C-6 전용이라 탐침으로 따로 잽니다 */
    for (const [name, why] of [["M-FASTJUDGE", "⏩가 판정에 닿음"], ["M-NOFAST", "⏩ 손잡이 제거"]]) {
      const f = await fastProbe(MUT[name]);
      const same = f.before.score === f.after.score && f.before.cards === f.after.cards
        && f.before.dev === f.after.dev;
      const red = !(f.showed && f.isFast && same && f.gone);
      check(red, `변이-${name}(${why}) → **C-6이 빨간불**`
        + `\n     ⏩ ${f.showed ? "뜸" : "🔴 안 뜸"} · isFast ${f.isFast ? "✔" : "🔴"} · 점수 ${f.before.score}→${f.after.score} · 사라짐 ${f.gone ? "✔" : "🔴"}`
        + (red ? "" : `\n     🔴 C-6이 이 변이를 안 뭅니다 — 「⏩는 연출만」이 지금 안 지켜져요`));
    }
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => die("검사가 죽었어요", [String(e && e.stack ? e.stack : e)]));
