/* 🧒👦🌙🔑 ⚽ 더 윙어 II — **어린 시절 네 해** (화면 넷 · `CHILD_TALENT` · `GROW_TILT` · 굳히기)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 이 파일이 생긴 이유 — **초2·초3·초4를 보는 검사가 0곳이었습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 2026-09-03(커밋 fde6688), 🧒 어린 시절이 **한 해에서 네 해**가 됐습니다.
 * `child-test.js`가 🧸 초1(`CHILD_FOCUS`)을 지키고 있었지만, 나머지 세 해와
 * 👦 `CHILD_TALENT` · 🌙 `GROW_TILT` · 🔑 굳히기를 보는 검사는 **하나도 없었어요.**
 * 그 상태로는
 *   · 👦 초2의 짝이 🧸 초1의 짝과 **겹쳐도** (= 「완전 정렬 몰빵」이 열려도)
 *   · 🌙 초3이 `hint.w`의 **0을 없애도** (= 정보 장치가 통째로 상해도)
 *   · 🔑 초4가 **아무 해도 안 굳혀도** (= 네 번째 화면이 장식이 되어도)
 *   · 🔑 초4의 설명 줄이 앞 해의 문장을 **베껴 적어도** (= 짝을 간 날 화면만 옛말을 해도)
 *   · 🧸 굳히기가 **유스가 미는 칸까지 들어올려도** (= 굳힌 것이 어린 시절이 아니게 되어도)
 * 아무도 안 웁니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 값을 고치기 전에 여기부터 여세요
 * ═════════════════════════════════════════════════════════════════════════
 *
 * 「🧒 **네 해가 「네 개의 다른 표」를 보는 세계**」.
 *
 *   | 해 | 질문 | 표 | 층 |
 *   |---|---|---|---|
 *   | 🧸 초1 | 뭘 하고 놀았나 | `CHILD_FOCUS`  | **모양** — 6칸 배분 가중 |
 *   | 👦 초2 | 누구와 붙었나  | `CHILD_TALENT` | **속도** — ⭐ 재능 |
 *   | 🌙 초3 | 몸이 어땠나    | `GROW_TILT`    | **시점** — 나이곡선 |
 *   | 🔑 초4 | 뭐가 남았나    | 굳히기          | **세기** — 앞 셋 중 하나 |
 *
 *   🔑 **그 「층이 다름」이 `⚽×1 ≡ ⚽×3` 문제를 구조적으로 막습니다** (실측 119번 §2 —
 *     `spread()`가 `indexOf`로 봐서 같은 층에 네 번 부으면 **완전히 같은 stats**였어요).
 *   🔒 `CHILD_TALENT` 세 짝이 여섯 칸을 **2 + 2 + 2로 정확히** 나누고, `CHILD_FOCUS`의
 *     어느 짝과도 **같은 짝이 아닙니다**(직교 매칭). 같은 짝이 하나라도 생기면
 *     초1·초2를 둘 다 몰아 **「완전 정렬 몰빵」**이 열려요.
 *   🔒 🌙 초3은 `hint.w`에 **곱합니다** — 그래서 스카우트가 이미 확신한 자리(`w`에 0)는
 *     **0으로 남습니다.** 🔴 «0을 없애려고 더하기로 바꾸지 마세요.**
 *
 * ⚠️ **뒤집히면 이 파일이 옛 계약이 되는 판정**
 *   · *"해를 다섯으로 늘리자"* → **A-1·A-2**의 「넷」이 전부 옛 계약입니다.
 *     🔒 `_load.js`의 `CHILD_SCREENS`와 `school-test`의 `SCREEN_SEQ`·S-6d를 **같이** 보세요.
 *   · *"👦 초2의 짝을 다시 갈자"* → **A-7**은 살지만 `intro.js`의 `CHILD_PICKS2` **문구**가
 *     조용히 어긋납니다. 🔴 짝과 문구는 **두 파일**에 있어요 (`prospect.js` · `intro.js`).
 *   · *"🌙 초3도 천장을 밀자"* → `child-cap-test`의 **K-5**가 먼저 뒤집힙니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 페이지를 통째로 싣습니다
 *   ② **표는 소스에서 뜯고**(`childPush`로 짝을 되짚어요 — 베껴 적지 않습니다),
 *      **확정 계수(`TAL_SHIFT` 0.10 / `TAL_SHIFT_HELD` 0.20 / `GROW_TILT` 2.0 / 4.0)는 여기 박습니다**
 *   ③ **게임 입구를 통해** — 화면 넷은 타이틀에서 출발해 실제 카드를 누릅니다.
 *      🔴 실기기 순서(`pointerdown`→`pointerup`→`click`) 그대로예요
 *   ④ **「도달했는가」가 아니라 「눌렀는가」**를 셉니다 — 해마다 탭 수를 봅니다
 *   ⑤ **기준선이 초록불인 것을 먼저 찍고** 변이를 겁니다
 *
 * 📐 **문턱을 어디에 뒀나 — 두 줄을 먼저 적었습니다**
 *   ① **무엇과 견주는가**
 *      · ⭐ 재능(A-8): **아무것도 안 고른 판과 「같은 시드에서 짝지은」 차이**. 절대값이 아니에요
 *      · 🌙 곡선(A-10): **`HINTS[].w`에서 세운 닫힌 식**과 견줍니다 — 함수 출력끼리 안 견줘요
 *   ② **격자의 어느 칸에서 재는가**
 *      · ⭐ 재능은 4포지션 전부 (주스탯 바닥 1.05가 포지션마다 다른 칸을 미니까요)
 *      · 🌙 곡선은 3택 × 3세기 = 9칸 전부 · 🔴 `gn` 한 칸만 재면 **0이 있는 갈래를 놓칩니다**
 *   🔒 그리고 **Σ⭐는 밴드가 아니라 「정확히 0」**입니다 — 같은 시드로 짝지으면 잡음이 0이거든요
 *     (실측: 정상 2.7e-15 · ④ 우수리 되돌리기를 지우면 0.205). 밴드를 쓸 이유가 없습니다.
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가:
 *     네 화면의 시간대 톤(`data-yr`) · 진행 띠(`.arc-steps`)의 모양 · 칩(`.arc-chip`)의 배치 ·
 *     620ms가 「방금 고른 것을 읽기에」 충분한지 · 문구가 여덟~열한 살의 하루로 읽히는지.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 */
"use strict";
const { bootPage, pageMutsOK, townAuto, tapFoot, tapChild, pickOrigin, seedBoth, wait, CHILD_SCREENS }
  = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱·계수 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const YEARS = 4;                 // 🧒 어린 시절의 해 수
const PER_YEAR = 3;              // 🧒 해마다 3택
const N_STATS = 6;               // 📊 능력치 여섯 칸
/* ⭐ **확정 계수 한 벌** (설계 133번 · 실측 132번). 🔒 소스에서 안 읽습니다 —
 *    읽으면 상수를 바꿔도 검사가 따라가서 아무것도 안 잡혀요. */
const TAL_SHIFT = 0.10, TAL_SHIFT_HELD = 0.20;
const GROW_TILT = 2.0, GROW_TILT_HELD = 4.0;
const TAL_TOL = 0.012;           // ⭐ 재능 이동의 허용 오차 (실측 |Δ−계수| ≤ 0.004)
const SUM_EPS = 1e-9;            // 🔒 Σ⭐ — **정확히 보존**입니다 (실측 2.7e-15)
const TILT_TOL = 2.5;            // 🌙 곡선 비율 밴드 %p (n = 12,000 · 1σ ≈ 0.45%p → 5.5σ)
const TILT_N = 12000;            // 🎲 칸마다
const SEEDS = [11, 29];          // 🎲 시드 하나로 안 잽니다
const TAL_N = 2500;              // ⭐ 짝지은 굴림 수 (포지션마다)

/* 🧒 네 해의 키 — 🔒 **세이브(`S.childPicks`)가 가리키는 값**이라 여기 박습니다. */
const Y_KEYS = [
  ["ball", "body", "eye"],       // 🧸 초1 — CHILD_FOCUS
  ["fin", "run", "steal"],       // 👦 초2 — CHILD_TALENT
  ["ge", "gn", "gl"],            // 🌙 초3 — GROW_TILT
  ["h1", "h2", "h3"],            // 🔑 초4 — 굳히기
];
const TYPE_OF = { ge: "early", gn: "normal", gl: "late" };   // 🌙 고른 것 ↔ 성장타입

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 — **0번이 먼저 소스와 대조합니다**
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 A-M1 — 👦 **초2의 짝이 🧸 초1과 겹칩니다.** `fin`이 `ball`과 같은 짝이 돼요 —
   *    초1·초2를 둘 다 몰면 **두 칸에 전부 몰리는** 「완전 정렬 몰빵」이 열립니다. */
  TAL_OVERLAP: { "prospect.js": [[/fin: {3}\["shoot", "speed"\],/, 'fin:   ["dribble", "shoot"],']] },
  /* 🔴 A-M2 — 🔑 **굳히기가 세기를 안 올립니다.** 화면도 칩도 멀쩡한데 h2가 **정확히 0**이에요. */
  HELD_FLAT: { "prospect.js": [[/const shift = heldIs\(childPicks, "h2"\) \? TAL_SHIFT_HELD : TAL_SHIFT;/,
    "const shift = TAL_SHIFT;"]] },
  /* 🔴 A-M3 — 🧮 **내려가는 몫을 상수로 박습니다.** 「종속값을 상수로」의 정면이에요 —
   *    미는 칸이 늘거나 세기가 바뀌면 조용히 총합이 샙니다. */
  DOWN_FIX: { "prospect.js": [[/const down = shift \* push\.length \/ \(keys\.length - push\.length\);/,
    "const down = 0;"]] },
  /* 🔴 A-M4 — 🔒 **④ 우수리 되돌리기(Σ⭐ 복원)를 지웁니다.** 🚨 **단독으로는 증상이 안 보여요** —
   *    clamp가 먹는 양이 그대로 총합의 오차가 되는데, 그건 화면 어디에도 안 나옵니다. */
  TAL_NO_RESTORE: { "prospect.js": [[/( {6})for \(let guard = 0; guard < 400; guard\+\+\) \{\n {8}let sum = 0;/,
    "$1if (false) for (let guard = 0; guard < 400; guard++) {\n        let sum = 0;"]] },
  /* 🔴 A-M5 — 🌙 **곱하기를 더하기로.** 🚨 `hint.w`의 **0이 사라집니다** —
   *    *"이 코멘트면 만성이 아니다"*가 정보에서 **그냥 확률**로 내려앉아요(74번 판정 ③-B의 정면). */
  TILT_ADD: { "prospect.js": [[/const type = pickW\(GROWTH_TYPES, mulW\(hint\.w, growTilt\(childPicks\)\)\);/,
    "const type = pickW(GROWTH_TYPES, hint.w.map((v, i) => v + growTilt(childPicks)[i]));"]] },
  /* 🔴 A-M6 — 🌙 **기울임을 없앱니다.** 화면은 「기울어요」라고 적어 놓고 값은 안 움직여요. */
  TILT_OFF: { "prospect.js": [[/const GROW_TILT = [\d.]+;/, "const GROW_TILT = 1.0;"]] },
  /* 🔴 A-M7 — 🧸 **`focusW`를 스칼라로.** engineer가 balancer 모델을 읽고 고친 자리예요 —
   *    스칼라면 **🏫 유스가 미는 칸까지** 들어올려서 「굳힌 것」이 어린 시절이 아니게 됩니다. */
  FOCUSW_SCALAR: { "prospect.js": [[/\? \(k\) => \(held\.indexOf\(k\) >= 0 \? FOCUS_W_HELD : FOCUS_W\) : null;/,
    "? () => FOCUS_W_HELD : null;"]] },
  /* 🔴 A-M8 — 🔑 **초4의 설명 줄을 「베껴 적습니다」.** 지금은 그 해의 문장을 **참조**하는데,
   *    베끼면 초2의 짝을 갈아 문구를 고친 날 **화면만 옛말**을 해요. */
  DESC_COPY: { "intro.js": [[/return got \? got\.sub : "";/, 'return "그해에 고른 것을 이어 갔어요";']] },
  /* 🔴 A-M9 — ⬅️ **앞 해로 돌아와 다시 골라도 뒤의 해를 안 버립니다.**
   *    🌙 초3을 다시 골랐는데 🔑 초4가 **옛 해를 굳히고** 있는 상태가 돼요. */
  NO_TRUNC: { "game.js": [[/ {4}chosenChild = chosenChild\.slice\(0, yr - 1\);/,
    "    /* 🧪 안 버림 */"]] },
  /* 🔴 A-M10 — 🔒 **620ms 빗장을 뺍니다.** 다른 갈래를 한 번 더 누르면
   *    «고른 것과 넘어간 것이 다른» 상태가 됩니다. */
  GATE_OFF: { "intro.js": [[/ {8}if \(gate\.shut\) return;\n {8}gate\.shut = true;/, "        gate.shut = true;"]] },
};

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버
 * ══════════════════════════════════════════════════════════════ */
function boot(seed, muts) {
  const W = bootPage({ muts: muts || {}, fastTimers: false });
  seedBoth(W, seed);
  const D = W.document;
  let taps = 0;
  /* 🖱️ **실기기 순서 그대로** — pointerdown → pointerup → click 셋 다 */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 것이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    taps += 1;
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  return { W, D, press, taps: () => taps,
    P: () => W.WingerProspect, I: () => W.WingerIntro,
    active: () => (D.querySelector(".screen.active") || {}).id,
    close: () => W.close() };
}
/* 🚪 **게임 입구를 통해** 🧒 초1 화면 앞까지. */
async function toChild(h) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(h.W, h.press, "R");
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, "seoul");
  return back;
}
/* ⏳ **`chosenChild`가 「정착할 때까지」 지켜봅니다** — 🔴 A-6이 여기서 경합했습니다.
 * ═════════════════════════════════════════════════════════════════════════
 * 🚨 2026-09-03 — `GATE_OFF` 변이가 **안 잡혔습니다.** 계약이 멀쩡해서가 아니라
 *    **둘째 콜백이 도착하기 전에 읽었기** 때문이에요:
 *      · 빗장이 없으면 탭 두 번이 `setTimeout(done, 620)`을 **둘** 예약합니다
 *      · 첫 콜백이 화면을 넘기는 순간 「화면이 바뀔 때까지」 대기가 **끝나 버리고**,
 *        `chosenChild`를 읽는 시점이 둘째 콜백보다 **앞**일 수 있습니다
 *      · 그러면 담긴 값이 아직 `ball`이라 **변이가 안 잡힌 것처럼 보입니다** — 경합이에요
 *    🔑 그리고 **경합은 시드로도 표본으로도 안 없어집니다.** 실제로 같은 검사가
 *      한 번은 잡고 한 번은 못 잡았어요(그게 경합이라는 증거입니다).
 *
 * 🔧 **시간을 박지 않습니다** — 「값이 조용해질 때까지」를 기다려요.
 *    `chosenChild`가 `QUIET_MS` 동안 한 글자도 안 바뀌면 정착으로 봅니다.
 *    🔒 `ECHO_MS`(620)를 베껴 적지 않아요 — 연출 길이가 바뀌어도 이 줄은 그대로 삽니다.
 * 🔴 돌려주는 값에 **`writes`(값이 바뀐 횟수)**를 같이 담습니다 — 「몇 번 담겼나」가
 *    빗장이 지키는 바로 그것이라, 값만 보면 두 콜백이 우연히 같은 키일 때 못 잡아요. */
const QUIET_MS = 260;        // 🔒 이만큼 조용하면 정착 (연출 620ms보다 짧고, 콜백 간격보다 깁니다)
const SETTLE_CAP = 4000;     // ⏱️ 아무리 오래 걸려도 여기서 멈춥니다
async function settleChild(h) {
  const read = () => JSON.stringify(h.W.__get("chosenChild") || []);
  let last = read(), writes = 0, quiet = 0;
  const t = Date.now();
  /* 🔴 **첫 번째 담김을 「먼저」 기다립니다.** 처음부터 조용하다고 정착으로 보면
   *    620ms 콜백이 오기도 전에 끝나서 `writes = 0`으로 읽어요 — 그것도 경합입니다. */
  while (Date.now() - t < SETTLE_CAP && !(writes >= 1 && quiet >= QUIET_MS)) {
    await wait(10);
    const now = read();
    if (now === last) { quiet += 10; continue; }
    last = now; writes += 1; quiet = 0;
  }
  return { picks: JSON.parse(last), writes, at: h.active() };
}

/* 🧒 **그 해의 화면을 읽습니다** (누르기 전) */
function readYear(h, yr) {
  const sid = CHILD_SCREENS[yr - 1];
  const sec = h.D.getElementById(sid);
  const cards = Array.from(sec.querySelectorAll(".card[data-child]"));
  return {
    at: h.active(), sid,
    keys: cards.map((c) => c.dataset.child),
    descs: cards.map((c) => (c.querySelector(".card-desc") || {}).textContent || ""),
    chips: Array.from(sec.querySelectorAll(".arc-chip")).map((e) => e.textContent),
    locked: cards.filter((c) => c.disabled).length,
    yrAttr: sec.dataset.yr,
  };
}

/* ══════════════════════════════════════════════════════════════
 * 0️⃣ 변이 정규식이 **지금 소스에 걸리는가** — 죽지 않고 빨간불로
 * ══════════════════════════════════════════════════════════════ */
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0,
    `A-0. 🧪 변이 정규식 ${Object.keys(MUT).length}개가 지금 \`beta/winger2/\`에 전부 걸린다`
    + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 "안 도는" 상태예요**\n       · ${bad.join("\n       · ")}` : ""));
  if (bad.length) { console.log(`\n❌ 빨간불 ${fail}건`); process.exit(1); }
}

async function main() {

/* ══════════════════════════════════════════════════════════════════════
 * A-1 ~ A-6. 🖥️ **화면 넷** — 게임 입구를 통해 실제로 눌러 봅니다
 * ══════════════════════════════════════════════════════════════════════ */
console.log("── 🖥️ A. 어린 시절 네 화면 ──");

/* 🚪 네 해를 걸으며 **누르기 전의 화면**을 해마다 읽습니다.
 * 🔴 돌려주는 값에 **탭 수**가 들어 있습니다 — 「도달했는가」만 재면 아무것도 안 눌러도
 *    타임아웃·기본값이 흐름을 끝까지 밀어 초록불이 나요(자가 복구가 실패를 삼킴). */
async function walk(muts, picks) {
  const h = boot(SEEDS[0], muts);
  const back = await toChild(h);
  const years = [];
  for (let y = 1; y <= YEARS; y++) {
    const before = h.taps();
    const seen = readYear(h, y);
    const kid = await tapChild(h.W, h.press, picks[y - 1], y);
    years.push(Object.assign(seen, { kid, taps: h.taps() - before, after: h.active() }));
  }
  const stored = h.W.__get("chosenChild");
  const r = { years, stored: Array.isArray(stored) ? stored.slice() : stored, at: h.active() };
  if (back) back();
  h.close();
  return r;
}

const PICK_A = ["ball", "fin", "gl", "h3"];
const BASE = await walk(null, PICK_A);
{
  const sidOK = BASE.years.every((y, i) => y.at === CHILD_SCREENS[i] && y.sid === CHILD_SCREENS[i]);
  const tapOK = BASE.years.every((y) => y.taps === 1 && y.kid != null);
  const storedOK = Array.isArray(BASE.stored) && BASE.stored.length === YEARS
    && BASE.stored.every((k, i) => k === PICK_A[i]);
  const yrOK = BASE.years.every((y, i) => y.yrAttr === String(i + 1));
  check(sidOK && tapOK && storedOK && yrOK && BASE.at === "screen-position",
    `A-1. 🖥️ **네 화면을 해마다 「탭 하나」로 지난다** — 그리고 게임이 **누른 것을 그대로** 담는다`
    + `\n     ${BASE.years.map((y, i) => `초${i + 1}(${y.sid}, data-yr=${y.yrAttr}) 탭 ${y.taps} → ${y.kid}`).join(" · ")}`
    + `\n     게임이 담은 것 \`chosenChild\` = [${BASE.stored.join(" ")}] (누른 것 [${PICK_A.join(" ")}]) · 도착 ${BASE.at}`
    + `\n     🔴 견주는 것은 «누르려 한 것»이 아니라 **게임이 받아 든 \`chosenChild\`**예요 —`
    + ` 전자와 견주면 그건 **자기 자신과 비교**입니다`
    + `\n     🔒 [다음]이 없어 해마다 탭이 **하나**입니다 — 둘이 되면 \`town-test\`의`
    + ` \`DECISIONS_BEFORE_CARD\`(8)와 \`foot-next-test\` N-8도 같이 움직여야 해요`
    + (sidOK && tapOK && storedOK ? "" : `\n     🔴 화면·탭·담긴 값 중 어긋난 것이 있습니다`));
}
{
  const keyOK = BASE.years.every((y, i) =>
    y.keys.length === PER_YEAR && Y_KEYS[i].every((k, j) => y.keys[j] === k));
  check(keyOK,
    `A-2. 🖥️ **해마다 카드가 정확히 ${PER_YEAR}장**이고 키가 계약과 같다`
    + `\n     ${BASE.years.map((y, i) => `초${i + 1} [${y.keys.join(" ")}] (계약 [${Y_KEYS[i].join(" ")}])`).join("\n     ")}`
    + `\n     🔒 키는 **세이브가 가리키는 값**이라 안 바꿉니다 — 순서가 필요하면 새 필드를 더하세요`
    + (keyOK ? "" : `\n     🔴 한 갈래에 **닿을 길이 없어집니다** — 값 쪽 검사는 전부 초록불이에요`));
}
{
  /* 🧺 지나온 해의 칩 — 🔒 **초4의 칩은 없습니다**(다음이 없어서)이지만 지나온 셋은 보여요 */
  const want = [0, 1, 2, 3];
  const got = BASE.years.map((y) => y.chips.length);
  const ok = got.every((n, i) => n === want[i]);
  check(ok,
    `A-3. 🧺 **지나온 해만 칩으로 되짚는다** — 초1 ${got[0]} · 초2 ${got[1]} · 초3 ${got[2]} · 초4 ${got[3]}장 (계약 ${want.join(" · ")})`
    + `\n     초4의 칩: [${BASE.years[3].chips.join(" · ")}]`
    + `\n     🔒 칩에는 **숫자도 스탯 이름도 없습니다** — 「무엇을 골랐나」를 되짚는 자리지`
    + ` 「무엇이 좋은가」를 알려 주는 자리가 아니에요`
    + (ok ? "" : `\n     🔴 칩 수가 계약과 다릅니다`));
}
{
  /* 🔑 **초4의 설명 줄이 그 해의 문장을 「참조」하는가** — 베끼면 짝을 간 날 화면만 옛말을 해요.
   * 🔒 정답은 **소스의 그 문장**입니다(글자를 안 베꼈어요). 🌙 초3을 다르게 골라 **두 번** 걷습니다. */
  const alt = await walk(null, ["ball", "fin", "ge", "h3"]);
  const h0 = boot(SEEDS[0], null);
  const I = h0.I();
  const subOf = (yr, key) => (I[`CHILD_PICKS${yr}`].find((c) => c.key === key) || {}).sub;
  const h3At = (r) => {
    const y4 = r.years[3];
    return y4.descs[y4.keys.indexOf("h3")];
  };
  const wantGl = subOf(3, "gl"), wantGe = subOf(3, "ge");
  h0.close();
  const ok = !!wantGl && !!wantGe && wantGl !== wantGe
    && h3At(BASE) === wantGl && h3At(alt) === wantGe;
  check(ok,
    `A-4. 🔑 **초4의 설명 줄이 「그 해에 실제로 고른 문장」을 참조한다** (베끼지 않았다)`
    + `\n     🌳 초3에 \`gl\`을 고르면 → 초4 \`h3\` 줄 "${h3At(BASE)}" (소스의 \`CHILD_PICKS3.gl.sub\` = "${wantGl}")`
    + `\n     🌱 초3에 \`ge\`를 고르면 → 초4 \`h3\` 줄 "${h3At(alt)}" (소스의 \`CHILD_PICKS3.ge.sub\` = "${wantGe}")`
    + `\n     🔒 정답을 **소스에서 뜯어옵니다** — 글자를 베끼면 문구를 다듬는 날 조용히 안 걸려요`
    + (ok ? `\n     🔑 «같은 문장을 한 번 더 본다»가 「굳히기」가 화면에서 읽히는 방식입니다`
      : `\n     🔴 초4가 그 해의 문장을 안 따라옵니다 — 짝을 간 날 **화면만 옛말**을 하게 돼요`));
}
{
  /* ⬅️ **앞 해로 돌아와 다시 고르면 뒤의 해는 버려야** 합니다 —
   *    남겨 두면 「🌙 초3을 다시 골랐는데 🔑 초4가 옛 해를 굳히는」 상태가 돼요. */
  const h = boot(SEEDS[0], null);
  const back = await toChild(h);
  for (let y = 1; y <= YEARS; y++) await tapChild(h.W, h.press, PICK_A[y - 1], y);
  const before = (h.W.__get("chosenChild") || []).slice();
  const at4 = h.active();
  h.press(h.D.getElementById("btn-back-child4"), "⬅️ 초4에서 뒤로");
  const y3 = readYear(h, 3);
  /* 🔴 **잠긴 채로 서면 아무것도 못 고릅니다** — `show()`가 아니라 `goChildYear()`여야 해요 */
  const reopened = h.active() === CHILD_SCREENS[2] && y3.locked === 0;
  const re = await tapChild(h.W, h.press, "ge", 3);
  const mid = (h.W.__get("chosenChild") || []).slice();
  const at4b = h.active();
  const y4 = readYear(h, 4);
  const h3desc = y4.descs[y4.keys.indexOf("h3")];
  const I = h.I();
  const wantGe = (I.CHILD_PICKS3.find((c) => c.key === "ge") || {}).sub;
  if (back) back();
  h.close();
  const ok = before.length === YEARS && reopened && re === "ge"
    && mid.length === 3 && mid[2] === "ge" && at4b === CHILD_SCREENS[3] && h3desc === wantGe;
  check(ok,
    `A-5. ⬅️ **앞 해로 돌아와 다시 고르면 뒤의 해를 버린다** — 그리고 초4 줄이 **따라옵니다**`
    + `\n     초4(${at4})까지 [${before.join(" ")}] → ⬅️ 뒤로 → 초3 다시 열림 ${reopened ? "✔(잠김 0)" : `🔴(${h.active ? "" : ""}잠긴 카드 ${y3.locked}장)`}`
    + `\n     🌱 \`ge\`로 다시 고름 → [${mid.join(" ")}] (길이 ${mid.length} · 🔑 초4가 **버려졌어요**) → ${at4b}`
    + `\n     초4 \`h3\` 줄: "${h3desc}" (계약 "${wantGe}")`
    + `\n     🔒 \`show()\`가 아니라 \`goChildYear()\`여야 합니다 — \`show()\`만 하면 그 화면의 버튼이`
    + ` 이미 눌려 **잠긴 채**(\`disabled\`) 서 있어서 아무것도 못 골라요`
    + (ok ? "" : `\n     🔴 뒤의 해가 안 버려졌거나 초4 줄이 안 따라옵니다`));
}
{
  /* 🔒 **머무는 동안의 두 번째 탭을 삼켜야** 합니다.
   * 🔴 **「값이 정착할 때까지」 기다린 뒤에 읽습니다** — 화면이 바뀌자마자 읽으면
   *    빗장을 빼도 둘째 콜백 전에 읽어서 **변이가 안 잡힙니다**(위 `settleChild` 참고). */
  const h = boot(SEEDS[0], null);
  const back = await toChild(h);
  const sec = h.D.getElementById(CHILD_SCREENS[0]);
  h.press(sec.querySelector('.card[data-child="ball"]'), "🧒 초1 ball");
  /* 🖱️ **바로 이어서** 다른 갈래를 한 번 더 — 실기기 순서 그대로 */
  let threw = null;
  try { h.press(sec.querySelector('.card[data-child="eye"]'), "🧒 초1 eye (두 번째)"); }
  catch (e) { threw = e; }
  const st = await settleChild(h);
  if (back) back();
  h.close();
  const ok = !threw && st.picks[0] === "ball" && st.writes === 1;
  check(ok,
    `A-6. 🔒 **머무는 동안의 두 번째 탭을 삼킨다** — ⚽를 누른 뒤 👀를 눌러도 담긴 것은 **[${st.picks.join(" ")}]**`
    + `\n     🖱️ 실기기 순서(pointerdown → pointerup → click) 그대로 두 번 눌렀습니다`
    + `\n     🔎 측정 조건 — \`chosenChild\`가 **${QUIET_MS}ms 동안 안 바뀔 때까지** 기다린 뒤 읽습니다.`
    + ` 🔴 화면이 바뀌는 순간 읽으면 **둘째 콜백보다 앞서 읽어** 빗장을 빼도 안 잡혀요(경합)`
    + `\n     🔑 **담긴 횟수 ${st.writes}회** — 값만 보면 두 탭이 우연히 같은 키일 때 못 잡습니다. 계약은 **1회**예요`
    + (ok ? "" : `\n     🔴 두 번째 탭이 먹혔습니다${threw ? ` (${threw.message})` : ""}`));
}

/* ══════════════════════════════════════════════════════════════════════
 * A-7. 👦 **`CHILD_TALENT` 짝** — 🔒 표를 **소스에서 되짚습니다**
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 `childPush(["fin"])`이 곧 👦 초2의 짝이고, `childPush(["ball"])`이 🧸 초1의 짝이에요
 *    (🌙 초3·🔑 초4는 천장 몫이 0이라 빈 배열입니다). **베껴 적지 않습니다.** */
console.log("── 👦 A-7. CHILD_TALENT 짝 (직교 매칭) ──");
const PAIRS = (() => {
  const h = boot(SEEDS[0], null);
  const P = h.P();
  const focus = {}, talent = {};
  for (const k of Y_KEYS[0]) focus[k] = P.childPush([k]).slice().sort();
  for (const k of Y_KEYS[1]) talent[k] = P.childPush([k]).slice().sort();
  const keys = h.W.__get("STAT_DEFS").map((d) => d.key);
  h.close();
  return { focus, talent, keys };
})();
{
  const T = Object.values(PAIRS.talent);
  const flat = T.flat();
  const uniq = new Set(flat);
  const sizeOK = T.every((p) => p.length === 2);
  const unionOK = uniq.size === N_STATS && flat.length === N_STATS;
  const F = Object.values(PAIRS.focus).map((p) => p.join("|"));
  const orth = T.every((p) => !F.includes(p.join("|")));
  check(sizeOK && unionOK && orth,
    `A-7. 👦 **짝 셋이 여섯 칸을 2 + 2 + 2로 나누고, 🧸 초1의 어느 짝과도 같지 않다** (직교 매칭)`
    + `\n     👦 초2 ${Object.entries(PAIRS.talent).map(([k, v]) => `${k}[${v.join(" ")}]`).join(" · ")}`
    + `\n     🧸 초1 ${Object.entries(PAIRS.focus).map(([k, v]) => `${k}[${v.join(" ")}]`).join(" · ")}`
    + `\n     합집합 ${uniq.size}칸 / 겹침 ${flat.length - uniq.size}개 / 같은 짝 ${T.filter((p) => F.includes(p.join("|"))).length}개`
    + (sizeOK && unionOK && orth
      ? `\n     🔑 직교라 둘 다 잘 골라도 미는 칸이 **최대 3칸**입니다 — 나머지 셋이 반대 압력을 계속 걸어요`
      : `\n     🔴 겹치면 초1·초2를 둘 다 몰아 **「완전 정렬 몰빵」**이 열립니다`));
}

/* ══════════════════════════════════════════════════════════════════════
 * A-8 · A-9. ⭐ **재능 전이** — 🔒 **같은 시드에서 짝지어** 봅니다
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 `rollTalents`는 ①에서 여섯 칸을 굴린 뒤 ③에서 이동을 얹습니다. 난수 소비가
 *    **선택에 무관하게 같아서**, 시드를 되감으면 **같은 굴림 위의 차이**를 볼 수 있어요.
 *    🔒 그래서 잡음이 **0**입니다 — 밴드가 아니라 **정확한 값**으로 잴 수 있습니다. */
console.log("── ⭐ A-8·A-9. 재능 전이 (짝지은 굴림) ──");
function talPaired(muts, seed) {
  const W = bootPage({ muts: muts || {} });
  const st = seedBoth(W, seed);
  const P = W.WingerProspect;
  const keys = W.__get("STAT_DEFS").map((d) => d.key);
  const POS = Object.keys(W.__get("POS_INFO"));
  const at = st.i;
  const seq = (pos, picks) => {
    st.i = at;
    const out = [];
    for (let i = 0; i < TAL_N; i++) out.push(P.rollTalents(pos, picks));
    return out;
  };
  const acc = { d: {}, dHeld: {}, sumErr: 0, sumErrHeld: 0, n: 0 };
  for (const k of keys) { acc.d[k] = 0; acc.dHeld[k] = 0; }
  for (const pos of POS) {
    const a = seq(pos, []);
    const b = seq(pos, ["ball", "fin", "gn", "h3"]);
    const c = seq(pos, ["ball", "fin", "gn", "h2"]);
    for (let i = 0; i < TAL_N; i++) {
      let sa = 0, sb = 0, sc = 0;
      for (const k of keys) {
        acc.d[k] += b[i][k] - a[i][k];
        acc.dHeld[k] += c[i][k] - a[i][k];
        sa += a[i][k]; sb += b[i][k]; sc += c[i][k];
      }
      acc.sumErr = Math.max(acc.sumErr, Math.abs(sb - sa));
      acc.sumErrHeld = Math.max(acc.sumErrHeld, Math.abs(sc - sa));
      acc.n += 1;
    }
  }
  for (const k of keys) { acc.d[k] /= acc.n; acc.dHeld[k] /= acc.n; }
  W.close();
  return Object.assign(acc, { keys, pos: POS.length });
}
const TAL = SEEDS.map((s) => talPaired(null, s));
{
  const push = PAIRS.talent.fin;               // 👦 `fin`이 미는 두 칸 (소스에서 뜯음)
  const rest = PAIRS.keys.filter((k) => !push.includes(k));
  const downWant = (n) => -n * push.length / (PAIRS.keys.length - push.length);
  const upOK = TAL.every((t) => push.every((k) => Math.abs(t.d[k] - TAL_SHIFT) <= TAL_TOL));
  const dnOK = TAL.every((t) => rest.every((k) => Math.abs(t.d[k] - downWant(TAL_SHIFT)) <= TAL_TOL));
  const heldUp = TAL.every((t) => push.every((k) => Math.abs(t.dHeld[k] - TAL_SHIFT_HELD) <= TAL_TOL));
  const heldDn = TAL.every((t) => rest.every((k) => Math.abs(t.dHeld[k] - downWant(TAL_SHIFT_HELD)) <= TAL_TOL));
  const ok = upOK && dnOK && heldUp && heldDn;
  check(ok,
    `A-8. ⭐ **👦 초2가 미는 두 칸의 재능이 \`TAL_SHIFT\`만큼 오르고, 나머지가 그만큼 내려간다**`
    + `\n     미는 칸 [${push.join(" ")}] Δ ${TAL.map((t) => push.map((k) => t.d[k].toFixed(4)).join("/")).join(" · ")} (계약 +${TAL_SHIFT})`
    + `\n     나머지 [${rest.join(" ")}] Δ ${TAL.map((t) => rest.map((k) => t.d[k].toFixed(4)).join("/")).join(" · ")} (계약 ${downWant(TAL_SHIFT).toFixed(4)} = shift × 2 ÷ 4 · **종속값**)`
    + `\n     🔑 h2로 굳히면 미는 칸 ${TAL.map((t) => push.map((k) => t.dHeld[k].toFixed(4)).join("/")).join(" · ")} (계약 +${TAL_SHIFT_HELD})`
    + `\n     🔎 측정 조건 — **같은 시드를 되감아 짝지은 차이**입니다(절대값이 아니에요) ·`
    + ` 포지션 ${TAL[0].pos}개 전부 × 시드 ${SEEDS.length}개 × ${TAL_N}굴림 = ${TAL[0].n}쌍`
    + `\n     🔒 계수(${TAL_SHIFT} / ${TAL_SHIFT_HELD})는 **검사에 박았습니다** — 소스에서 읽으면 상수를 바꿔도 따라가요`
    + (ok ? "" : `\n     🔴 이동 폭이 계약과 다릅니다 (허용 ±${TAL_TOL})`));
}
{
  const worst = Math.max(...TAL.map((t) => Math.max(t.sumErr, t.sumErrHeld)));
  const ok = worst < SUM_EPS;
  check(ok,
    `A-9. 🔒 **Σ⭐ 재능이 어린 시절 선택에 무관하게 「정확히」 보존된다** — 짝지은 |ΔΣ| 최대 **${worst.toExponential(2)}** (문턱 ${SUM_EPS})`
    + `\n     🔎 측정 조건 — 같은 시드를 되감아 **한 굴림씩** 견줍니다. 잡음이 0이라 밴드가 필요 없어요`
    + `\n     🚨 이 문장이 없으면 **④ 우수리 되돌리기 루프를 지워도 증상이 0장**입니다 —`
    + ` clamp가 먹는 양(0.10에서 0.094% · 0.20에서 0.380%)이 그대로 총합의 오차가 되는데,`
    + ` 그건 **화면 어디에도 안 나옵니다**`
    + (ok ? "" : `\n     🔴 Σ가 샙니다 — ③의 \`down\`(종속값)이나 ④(우수리 되돌리기)를 보세요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * A-10 · A-11. 🌙 **성장타입 기울임** — 🔒 **닫힌 식**과 견줍니다
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 **함수 출력끼리 안 견줍니다.** `HINTS[].w`(소스의 데이터)와 여기 박은 틸트 계수로
 *    기대 확률을 **직접 세워** 대조해요. 그래야 `growTilt`·`mulW`·`pickW`가 **셋 다** 물립니다.
 * 🔴 **9칸 전부**를 잽니다 — `gn` 한 칸만 재면 `ge`/`gl`의 **0이 있는 갈래**를 놓쳐요
 *    (`gn`은 세 코멘트 어디에도 0이 없어서 「곱하기 ↔ 더하기」가 잘 안 드러납니다). */
console.log("── 🌙 A-10·A-11. 성장타입 기울임 (9칸 전부) ──");
function tiltRun(muts, seed) {
  const W = bootPage({ muts: muts || {} });
  seedBoth(W, seed);
  const P = W.WingerProspect;
  const ids = P.GROWTH_TYPES.map((g) => g.id);
  const HINTS = P.HINTS;
  const rows = [];
  let zeroHit = 0;
  for (const c3 of Y_KEYS[2]) for (const c4 of Y_KEYS[3]) {
    const picks = ["ball", "fin", c3, c4];
    const cnt = {};
    for (const id of ids) cnt[id] = 0;
    for (let i = 0; i < TILT_N; i++) {
      const b = P.rollBuild("k", "wg", picks);
      cnt[b.growthType] += 1;
      /* 🔒 **0은 0으로 남아야** 합니다 — `hint.w`가 0인 타입이 뽑히면 곱하기가 죽은 거예요 */
      if (b.hint.w[ids.indexOf(b.growthType)] === 0) zeroHit += 1;
    }
    rows.push({ c3, c4, want: TYPE_OF[c3], got: cnt[TYPE_OF[c3]] / TILT_N * 100 });
  }
  /* 📐 **닫힌 식** — `HINTS[].w` × 틸트. 🔒 코멘트가 균등하게 뽑히는 것만 씁니다. */
  const expect = (c3, c4) => {
    const i = ids.indexOf(TYPE_OF[c3]);
    const mul = c4 === "h3" ? GROW_TILT_HELD : GROW_TILT;
    let acc = 0;
    for (const hint of HINTS) {
      const w = hint.w.slice();
      w[i] *= mul;
      const s = w.reduce((a, v) => a + v, 0);
      acc += s > 0 ? w[i] / s : 0;
    }
    return acc / HINTS.length * 100;
  };
  const none = (c3) => {
    const i = ids.indexOf(TYPE_OF[c3]);
    let acc = 0;
    for (const hint of HINTS) {
      const s = hint.w.reduce((a, v) => a + v, 0);
      acc += s > 0 ? hint.w[i] / s : 0;
    }
    return acc / HINTS.length * 100;
  };
  /* 🧒 아무것도 안 고른 판 — 🔒 기울임이 없으면 **기여가 정확히 0**이어야 합니다 */
  const flat = {};
  for (const id of ids) flat[id] = 0;
  for (let i = 0; i < TILT_N; i++) flat[P.rollBuild("k", "wg", []).growthType] += 1;
  W.close();
  return { rows: rows.map((r) => Object.assign(r, { exp: expect(r.c3, r.c4) })),
    zeroHit, flat, ids, TILT_N,
    flatRows: Y_KEYS[2].map((c3) => ({ c3, got: flat[TYPE_OF[c3]] / TILT_N * 100, exp: none(c3) })) };
}
const TILT = SEEDS.map((s) => tiltRun(null, s));
{
  const off = TILT.flatMap((t) => t.rows.concat(t.flatRows)).filter((r) => Math.abs(r.got - r.exp) > TILT_TOL);
  const ok = off.length === 0;
  const show = TILT[0];
  check(ok,
    `A-10. 🌙 **고른 성장타입이 나올 확률이 닫힌 식과 맞는다** — 3택 × 3세기 **9칸 전부** + 안 고른 판 3칸`
    + `\n     안 고름: ${show.flatRows.map((r) => `${r.c3} ${r.got.toFixed(1)}%(식 ${r.exp.toFixed(1)})`).join(" · ")}`
    + `\n     ${Y_KEYS[3].map((c4) => `${c4 === "h3" ? "🌙 굳힘(×" + GROW_TILT_HELD + ")" : "기울임(×" + GROW_TILT + ")"} ${show.rows.filter((r) => r.c4 === c4).map((r) => `${r.c3} ${r.got.toFixed(1)}%(식 ${r.exp.toFixed(1)})`).join(" · ")}`).join("\n     ")}`
    + `\n     🔎 측정 조건 — 견주는 상대는 **\`HINTS[].w\`에서 세운 닫힌 식**입니다(함수 출력끼리가 아니에요) ·`
    + ` 칸마다 ${TILT_N}판 × 시드 ${SEEDS.length}개 · 밴드 ±${TILT_TOL}%p (1σ ≈ 0.45%p)`
    + `\n     🔴 **「작동률」이라는 이름을 쓰지 마세요** — 여기 적힌 건 「고른 대로 될 확률」이고,`
    + ` \`gn\`의 31.1 → 47.4 → 64.3%가 그 값이에요. \`ge\`/\`gl\`이 다른 건 **\`w\`의 0 때문**이지 고장이 아닙니다`
    + (ok ? "" : `\n     🔴 어긋난 칸 ${off.length}개: ${off.slice(0, 6).map((r) => `${r.c3}/${r.c4 || "안고름"} ${r.got.toFixed(1)} vs ${r.exp.toFixed(1)}`).join(" · ")}`));
}
{
  const hits = TILT.reduce((a, t) => a + t.zeroHit, 0);
  check(hits === 0,
    `A-11. 🔒 **\`hint.w\`의 0은 0으로 남는다** — \`w\`가 0인 타입이 뽑힌 횟수 **${hits}**회 / ${TILT.length * 9 * TILT_N}판`
    + `\n     🔑 곱하기라서 그렇습니다. *"이 코멘트면 만성이 아니다"*가 **회피 수단이 아니라 정보**로 사는 자리예요`
    + `\n     🔴 «0을 없애려고 더하기로 바꾸지 마세요** — 그 순간 정보 장치가 통째로 그냥 확률이 됩니다`
    + (hits === 0 ? "" : `\n     🔴 0이 무너졌습니다 — \`mulW\`가 곱하기인지 보세요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * A-12. 🧸 **굳히기의 가중은 「칸마다」** — 스칼라면 유스까지 들어올립니다
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 견주는 것은 **부호**입니다 — 🇧🇷 `br`(유스가 `dribble`·`shoot`을 밈)에서 👀 `eye`를 굳히면,
 *    총합이 고정이라 **유스 전용 칸은 「내려가야」** 해요. 스칼라면 **올라갑니다.** */
console.log("── 🧸 A-12. 굳히기 가중이 칸마다인가 ──");
function focusProbe(muts, seed) {
  const W = bootPage({ muts: muts || {} });
  seedBoth(W, seed);
  const P = W.WingerProspect;
  const keys = W.__get("STAT_DEFS").map((d) => d.key);
  const mean = (picks) => {
    const s = {};
    for (const k of keys) s[k] = 0;
    for (let i = 0; i < 3000; i++) {
      const r = P.rollShape("br", "wg", picks);
      for (const k of keys) s[k] += r.stats[k];
    }
    for (const k of keys) s[k] /= 3000;
    return s;
  };
  const a = mean(["eye", "fin", "gn", "h3"]);   // 🌙 h3 — 🧸 초1을 안 굳힘
  const b = mean(["eye", "fin", "gn", "h1"]);   // 🧸 h1 — 초1을 굳힘
  W.close();
  return { d: Object.fromEntries(keys.map((k) => [k, b[k] - a[k]])), keys };
}
{
  const R = SEEDS.map((s) => focusProbe(null, s));
  const YOUTH = ["dribble", "shoot"];           // 🇧🇷 br의 유스 짝 — 👀 eye와 안 겹칩니다
  const EYE = PAIRS.focus.eye;                  // 👀 초1이 미는 짝 (소스에서 뜯음)
  const eyeUp = R.every((r) => EYE.every((k) => r.d[k] > 0));
  const youthDown = R.every((r) => YOUTH.every((k) => r.d[k] < 0));
  const ok = eyeUp && youthDown;
  check(ok,
    `A-12. 🧸 **굳히기가 「굳힌 그 두 칸만」 올린다** — 🇧🇷 유스가 미는 칸은 **내려가야** 합니다`
    + `\n     👀 초1이 미는 칸 [${EYE.join(" ")}] Δ ${R.map((r) => EYE.map((k) => r.d[k].toFixed(2)).join("/")).join(" · ")} (올라야 함)`
    + `\n     🇧🇷 유스 전용 칸 [${YOUTH.join(" ")}] Δ ${R.map((r) => YOUTH.map((k) => r.d[k].toFixed(2)).join("/")).join(" · ")} (내려야 함)`
    + `\n     🔎 측정 조건 — 🌙 \`h3\`(안 굳힘) ↔ 🧸 \`h1\`(굳힘)을 같은 시장·같은 자리에서 견줍니다.`
    + ` 🔑 **부호**만 봅니다 — 총합이 고정이라 «올린 칸 말고는 내려간다»가 구조예요`
    + `\n     🔴 스칼라 하나로 두면 유스 칸도 \`FOCUS_W_HELD\`를 받아 **올라갑니다** —`
    + ` 그러면 「굳힌 것」이 어린 시절이 아니게 돼요 (engineer가 balancer 모델을 읽고 고친 자리)`
    + (ok ? "" : `\n     🔴 부호가 계약과 다릅니다`));
}

/* ══════════════════════════════════════════════════════════════════════
 * 🧪 변이 — **기준선이 초록불인 것을 먼저 찍고** 겁니다
 * ══════════════════════════════════════════════════════════════════════ */
console.log(`\n── 🧪 변이 — 되돌리면 정말 빨간불이 뜨는가 (기준선 ${fail === 0 ? "🟢 초록불" : "🔴 빨간불"}) ──`);
if (fail !== 0) {
  console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다 — 위를 먼저 고치세요.");
  console.log("   🔑 이미 빨간불인 검사는 **남의 변이 신호까지 먹습니다** (CLAUDE.md 실패 유형표).");
} else {
  const CASES = [
    ["TAL_OVERLAP", "A-7", async (m) => {
      const h = boot(SEEDS[0], m);
      const t = Y_KEYS[1].map((k) => h.P().childPush([k]).slice().sort().join("|"));
      const f = Y_KEYS[0].map((k) => h.P().childPush([k]).slice().sort().join("|"));
      h.close();
      return t.some((p) => f.includes(p)) || new Set(t.join("|").split("|")).size !== N_STATS;
    }],
    ["HELD_FLAT", "A-8", async (m) => {
      const t = talPaired(m, SEEDS[0]);
      return PAIRS.talent.fin.some((k) => Math.abs(t.dHeld[k] - TAL_SHIFT_HELD) > TAL_TOL);
    }],
    ["DOWN_FIX", "A-8", async (m) => {
      const t = talPaired(m, SEEDS[0]);
      const rest = PAIRS.keys.filter((k) => !PAIRS.talent.fin.includes(k));
      return rest.some((k) => Math.abs(t.d[k] + TAL_SHIFT * 2 / 4) > TAL_TOL);
    }],
    ["TAL_NO_RESTORE", "A-9", async (m) => {
      const t = talPaired(m, SEEDS[0]);
      return Math.max(t.sumErr, t.sumErrHeld) >= SUM_EPS;
    }],
    ["TILT_ADD", "A-11", async (m) => tiltRun(m, SEEDS[0]).zeroHit > 0],
    ["TILT_OFF", "A-10", async (m) => {
      const t = tiltRun(m, SEEDS[0]);
      return t.rows.some((r) => Math.abs(r.got - r.exp) > TILT_TOL);
    }],
    ["FOCUSW_SCALAR", "A-12", async (m) => {
      const r = focusProbe(m, SEEDS[0]);
      return ["dribble", "shoot"].some((k) => r.d[k] >= 0);
    }],
    ["DESC_COPY", "A-4", async (m) => {
      const r = await walk(m, ["ball", "fin", "gl", "h3"]);
      const y4 = r.years[3];
      const h0 = boot(SEEDS[0], null);
      const want = (h0.I().CHILD_PICKS3.find((c) => c.key === "gl") || {}).sub;
      h0.close();
      return y4.descs[y4.keys.indexOf("h3")] !== want;
    }],
    ["NO_TRUNC", "A-5", async (m) => {
      const h = boot(SEEDS[0], m);
      const back = await toChild(h);
      for (let y = 1; y <= YEARS; y++) await tapChild(h.W, h.press, PICK_A[y - 1], y);
      h.press(h.D.getElementById("btn-back-child4"), "⬅️ 뒤로");
      await tapChild(h.W, h.press, "ge", 3);
      const mid = (h.W.__get("chosenChild") || []).slice();
      if (back) back();
      h.close();
      return mid.length !== 3;
    }],
    /* 🔒 **기준선과 같은 자를 씁니다** — `settleChild`로 정착까지 기다린 뒤,
     *    「담긴 값」과 「담긴 횟수」를 **둘 다** 봅니다. 값만 보면 경합에 걸려요. */
    ["GATE_OFF", "A-6", async (m) => {
      const h = boot(SEEDS[0], m);
      const back = await toChild(h);
      const sec = h.D.getElementById(CHILD_SCREENS[0]);
      h.press(sec.querySelector('.card[data-child="ball"]'), "ball");
      try { h.press(sec.querySelector('.card[data-child="eye"]'), "eye"); } catch (e) { /* 사라졌으면 그것도 증상 */ }
      const st = await settleChild(h);
      if (back) back();
      h.close();
      return st.picks[0] !== "ball" || st.writes !== 1;
    }],
  ];
  for (const [name, guard, bites] of CASES) {
    let hit = null, err = null;
    try { hit = await bites(MUT[name]); } catch (e) { err = e; }
    check(hit === true,
      `🧪 **변이 ${name}** → **${guard}가 빨간불**이어야 한다`
      + (hit === true ? "" : `\n     🔴 안 잡혔어요 — ${guard}가 아무것도 안 지킵니다${err ? ` (${err.message})` : ""}`));
  }

  /* ══════════════════════════════════════════════════════════════════
   * 🔒 **반대 방향** — 물면 안 되는 것도 확인합니다
   * ══════════════════════════════════════════════════════════════════ */
  const KEEP = [
    /* 🌙 곡선 변이는 ⭐ 재능을 한 톨도 안 건드립니다 — 층이 다르거든요 */
    ["TILT_OFF", "A-9", async (m) => {
      const t = talPaired(m, SEEDS[0]);
      return Math.max(t.sumErr, t.sumErrHeld) < SUM_EPS;
    }],
    /* 🔑 굳히기를 없앤 변이는 **Σ⭐를 안 건드립니다** — 이동 폭만 줄어요 */
    ["HELD_FLAT", "A-9", async (m) => {
      const t = talPaired(m, SEEDS[0]);
      return Math.max(t.sumErr, t.sumErrHeld) < SUM_EPS;
    }],
  ];
  for (const [name, guard, stays] of KEEP) {
    let ok = null, err = null;
    try { ok = await stays(MUT[name]); } catch (e) { err = e; }
    check(ok === true,
      `🧪 **변이 ${name} → ${guard}는 초록불로 남아야** 한다 (문장끼리 성질이 안 섞였다는 증거)`
      + (ok === true ? "" : `\n     🔴 ${guard}가 남의 변이까지 뭅니다 — 문장이 너무 넓어요${err ? ` (${err.message})` : ""}`));
  }
}

console.log(`\n${fail ? `❌ 빨간불 ${fail}건` : "✅ 전부 통과"} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.log(`\n💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
