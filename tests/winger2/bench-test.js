/* ⚽ 더 윙어 II — 🧬 선수 조립대 (♾️ 무제한 다시 뽑기 · 📊 총합 고정)
 *
 * 🔴 **이 파일이 생기기 전까지 총합 고정을 지키는 검사가 한 줄도 없었습니다.**
 *    engineer가 원칙 ⑩으로 `spread(POOL + rand(-18,18), …)`을 넣고 돌렸는데
 *    **검사 9개가 전부 기준선과 똑같았어요** (`76_engineer_creation-bench.md` §6).
 *    옛 A-1(*"세 장의 총합이 서로 같다"*)이 `rollCards`와 함께 죽으면서 그 자리가 비었습니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-08-30 · designer 74번 판정 ③-C · ④-B · engineer 76번)
 *
 *   · 🎲 다시 뽑기는 **♾️ 무제한**이고 **↩️ 되돌리기가 없습니다**
 *   · 🎲가 굴리는 것은 **📊 배분 하나뿐** — `talents`·`growthType`·`hint`·`trait`·`flaw`는 🔒
 *   · 그래서 안전한 이유는 **횟수가 아니라 총합 고정(194)**입니다
 *
 * 🚨 **왜 총합이 브레이크인가** (designer 74번 §위험):
 *     굴리는 비용이 0이면 무회상 최적정지의 문턱은 `V = E[max(X, V)]`에서
 *     **`V → sup(X)`로 수렴합니다.** 굴리기를 막을 방법은 없어요.
 *     → **굴려도 안 좋아지는 것을 굴리게 하면 됩니다.**
 *     → 규칙: **굴릴 수 있는 것은 「총합이 고정된 축」뿐입니다.**
 *
 * ⚠️ **옛 세계의 문장을 여기에 되살리지 마세요.**
 *    옛 `prospect-test` C절은 *"두 번 쓰면 잠긴다"* · *"상한이 이 기능의 절반"*이었고,
 *    designer 판정이 **정확히 그 문장을 뒤집었습니다.** 값만 `2 → Infinity`로 바꾸면
 *    검사가 옛 계약을 지킵니다 — 지켜야 할 것 자체가 바뀌었어요.
 *
 * ⚠️ **반대로 C-1/C-2가 빨간불이면 검사를 고치지 마세요.** 총합을 되돌리세요.
 *    무제한을 지탱하는 게 그것 하나입니다. 그리고 그건 designer 말대로
 *    **천천히 일어나서 원인을 못 찾습니다** — 그래서 여기서 잡습니다.
 *
 * 🚧 **⭐ 잠재력 총합 고정(3-B)은 아직 안 들어왔습니다.**
 *    지금 `rollTalents`는 독립 `rand(0.8,1.45)`이고 **총합이 안 고정**이에요 —
 *    **그게 현재 계약입니다.** 그래서 여기서는 *"잠재력의 총합이 고정"*이 아니라
 *    *"잠재력은 🎲 대상이 아니다"*(D-1)만 봅니다.
 *    🔴 3-B가 들어오면 **D-1이 뒤집힙니다** (designer 검사 2번: *"반대로 바뀝니다"* —
 *    ⭐ 잠재력이 🎲 대상이 되고, 대신 **총합 고정**이 그 자리를 맡아요).
 *    그때 1-B(`rollTalents` 총합 고정)·1-C(⭐5성 출현율 > 0%)를 여기 더하면서
 *    **D-1을 같이 다시 겨누세요.** 지금 미리 짜면 빨간불인데 그냥 두는 검사가 됩니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **총합 194는 여기 박습니다.** `P.POOL`을 읽어 오면 `POOL`을 200으로 바꿔도
 *      검사가 따라가서 **아무것도 안 잡혀요** (변이 `POOL_200`이 그 자리입니다)
 *   ③ **자기 자신과 비교하지 않습니다** — `evenStats()`의 총합도 194와 대 봅니다
 *   ④ **게임 입구를 통해** — 타이틀 → ✏️ 이름 → 🏟️ 유스 → 🎯 포지션 → 🧬 조립대.
 *      실기기 순서 그대로(pointerdown → pointerup → click)
 *   ⑤ **시드 하나로 안 잽니다** — 시드 셋으로 돌려 합칩니다
 *
 * ⏱️ 약 25초.
 */
"use strict";
const { bootPage, pageMutsOK, townAuto, passTown } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 **정답은 여기 있습니다** — 소스에서 안 읽어요
 *
 * `P.POOL`에서 읽으면 `const POOL = 200`으로 바꿔도 검사가 따라갑니다.
 * 산식은 소스에서 뜯고, **문턱은 검사에 박습니다** — 방향이 반대예요.
 * ══════════════════════════════════════════════════════════════ */
const POOL_WANT = 194;          // 📊 한 굴림의 스탯 총합. 굴려도 여기가 안 움직여야 합니다
const AGE_WANT = 17;            // 🎂 조립대에서 나오는 나이 (유스 3년 + 17 = 데뷔 만 20세)
const SLOTS = 6;                // 스탯 칸 수

const ROLLS_PURE = 100000;      // `rollShape` 직접 호출 (designer 검사 1번 규격)
const SEEDS = [11, 23, 37];     // 🎲 시드 하나로 안 잽니다
const ROLLS_UI = 100;           // 시드당 🎲 버튼을 누르는 횟수 → 합계 300번
/* 🎲를 눌렀는데 모양이 그대로면 버튼이 죽은 거예요. 문턱은 **기준선과 변이 사이**에 둡니다 —
 * 기준선 실측 300/300(100%) · 🎲를 죽이면 1/300(0.3%). 90%는 그 한가운데예요. */
const DISTINCT_MIN = 0.90;

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * (안 걸리면 `bootPage`가 던져 파일이 💥로 죽어요. 이 저장소에서 세 번 난 사고입니다.)
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **M1 — engineer가 넣었을 때 검사 9개가 전부 초록불이었던 그 변이입니다.**
   * 총합이 굴림마다 흔들려요. 무제한 리롤에서는 이게 곧 `max of N` → `sup`입니다. */
  /* 🔒 **인자 목록을 안 베낍니다 — `spread(POOL,` 앞머리만 봅니다.** 2026-09-03에
   *    🔑초4 굳히기가 `focusW`를 다섯째 인자로 붙이면서 옛 정규식이 죽었어요
   *    (커밋 fde6688). 🔴 인자가 또 늘어도 이 모양이면 안 죽습니다. */
  POOL_LOOSE: { "prospect.js": [[/ {6}stats: spread\(POOL, /,
    "      stats: spread(POOL + randInt(-18, 18), "]] },
  /* 🔴 **총합 자체를 옮김** — 굴림 사이에는 고정인데 값이 다릅니다.
   * `P.POOL`을 읽는 검사는 이걸 **절대 못 잡아요**(따라가니까요). 그래서 194를 박았습니다. */
  POOL_200: { "prospect.js": [[/^ {2}const POOL = 194;/m, "  const POOL = 200;"]] },
  /* 🔴 **우수리 되돌리기를 멈춤** — 반올림 오차가 그대로 남아 총합이 191~196으로 흩어집니다.
   * "대충 194 근처"와 "정확히 194"의 차이를 보는 자리예요. */
  REMAINDER_OFF: { "prospect.js": [[/ {6}if \(diff === 0\) break;/, "      break;"]] },
  /* 🔴 **M2 — 🎲가 ⭐ 잠재력까지 굴림.** 타고난 것이 굴려서 피할 수 있는 값이 됩니다
   * (74번 판정 ①-2 · engineer가 배선을 끊은 바로 그 자리) */
  REROLL_TALENTS: { "prospect.js": [[/ {4}draw\.build\.shapeKey = sh\.shapeKey;/,
    "    draw.build.shapeKey = sh.shapeKey;\n    draw.talents = rollTalents(draw.pos);"]] },
  /* 🔴 **M3 — 🎲가 🧬 성장타입까지 굴림.** 총합을 정의할 수 없는 축이라 굴리면 안 돼요
   * (실측 D-ⓑ: 함께 굴리면 첫 3시즌 +19.8% · 🌳 만성이 36% → 10%로 사라짐) */
  REROLL_GROWTH: { "prospect.js": [[/ {4}draw\.build\.shapeKey = sh\.shapeKey;/,
    "    draw.build.shapeKey = sh.shapeKey;\n    draw.build.growthType = pick(GROWTH_TYPES).id;"]] },
  /* 🔴 **🎲가 죽음** — 눌러도 배분이 안 바뀝니다. 총합만 보는 검사는 이걸 못 잡아요 */
  DEAD_ROLL: { "prospect.js": [[/ {4}draw\.build\.stats = sh\.stats;/, "    /* 🧪 변이: 배분이 안 바뀜 */"]] },
  /* 🔴 **옛 세계로 되돌림** — 예산 2회. 무제한이 설계인 지금은 이게 회귀입니다 */
  REROLL_CAP: { "prospect.js": [[/const REROLL_MAX = Infinity;/, "const REROLL_MAX = 2;"]] },
};

/* ══════════════════════════════════════════════════════════════
 * 🔎 0. 변이 정규식이 지금 소스에 걸리나 — 다른 무엇보다 먼저
 * ══════════════════════════════════════════════════════════════ */
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
/* 변이 하나가 안 걸리면 **죽지 않고 ❌ 한 줄**로 뜨게 합니다 */
const mutRun = (name, fn) => (pageMutsOK({ [name]: MUT[name] }).length ? null : fn());
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 조립대에 닿습니다
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function boot(seed, muts, keys) {
  const W = bootPage(muts || keys ? { muts, keys } : undefined);
  if (seed != null) W.Math.random = mulberry32(seed);
  const D = W.document;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click.
   *    하나만 보내던 검사가 24개 케이스를 놓친 전례가 있어요. */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  const active = () => (D.querySelector(".screen.active") || {}).id;
  return { W, D, press, active, close: () => W.close() };
}

/* 🚪 타이틀 → ✏️ 이름·🦶 주발 → 📍 자리 → 🏘️ 동네 3장 → 🏟️ 입단 제안 → 🧬 조립대
 * ⚠️ 2026-08-31에 **🏘️ 동네가 들어오면서 순서가 바뀌었습니다** (85번 「순-B」) —
 *    유스가 「고르는 화면」에서 「제안받는 화면」이 되어 **자리 뒤로** 갔어요.
 *    `#agency-list`는 동네를 지나야 채워집니다(`showOffers` → `renderMarkets`). */
function toBench(h) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  const back = townAuto(h.W);
  h.press(h.D.querySelector("#position-list .card[data-pos]"), "📍 자리");
  passTown(h.W, h.press, back);
  h.press(h.D.querySelector("#agency-list button"), "🏟️ 입단 제안");
  return h;
}

const sumOf = (o) => Object.keys(o).reduce((a, k) => a + o[k], 0);
/* 🖥️ **화면이 찍고 있는 것**만 읽습니다 — 로직에 다시 물어보지 않아요 */
const shownSum = (h) => Array.from(h.D.querySelectorAll("#prospect-body .pcg-val"))
  .reduce((a, e) => a + parseInt(e.textContent, 10), 0);
/* 🎁 🔒 잠긴 축을 **화면 글자로** 뜬 한 줄 — 상태가 아니라 사람이 보는 것 */
const giftText = (h) => ["#prospect-body .pc-hint", "#prospect-body .pc-trait",
  "#prospect-body .pc-flaw", "#prospect-talent"]
  .map((s) => { const el = h.D.querySelector(s); return el ? el.textContent.trim() : "(없음)"; }).join(" ‖ ");

/* 🎲를 `rolls`번 눌러 굴림마다 무엇이 바뀌고 무엇이 안 바뀌는지 모읍니다.
 * ⚠️ **매 굴림을 봅니다** — 처음과 끝만 보면 중간에 튄 굴림을 놓쳐요. */
function benchProbe(muts, seeds, rolls) {
  const acc = { sums: new Map(), shownSums: new Map(), shapes: new Set(), rolls: 0,
    talentDrift: 0, growthDrift: 0, giftDrift: 0, ageDrift: 0, locked: 0, errs: [], runs: 0 };
  for (const seed of (seeds || SEEDS)) {
    const h = toBench(boot(seed, muts));
    const st = () => h.W.WingerProspect._t.state();
    const s0 = st();
    const fix = { talents: JSON.stringify(s0.talents), growth: s0.build.growthType,
      gift: giftText(h), age: s0.build.age };
    acc.runs += 1;
    const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
    bump(acc.sums, sumOf(s0.build.stats));
    bump(acc.shownSums, shownSum(h));
    acc.shapes.add(JSON.stringify(s0.build.stats));
    const rb = h.D.getElementById("btn-prospect-reroll");
    for (let i = 0; i < (rolls || ROLLS_UI); i += 1) {
      if (rb.disabled) { acc.locked += 1; break; }
      h.press(rb, "🎲 다시 뽑기");
      const s = st();
      acc.rolls += 1;
      bump(acc.sums, sumOf(s.build.stats));
      bump(acc.shownSums, shownSum(h));
      acc.shapes.add(JSON.stringify(s.build.stats));
      if (JSON.stringify(s.talents) !== fix.talents) acc.talentDrift += 1;
      if (s.build.growthType !== fix.growth) acc.growthDrift += 1;
      if (giftText(h) !== fix.gift) acc.giftDrift += 1;
      if (s.build.age !== fix.age) acc.ageDrift += 1;
    }
    acc.lastDisabled = rb.disabled;
    acc.lastUsed = st().used;
    for (const e of h.W.__errs) acc.errs.push(e);
    h.close();
  }
  acc.draws = acc.rolls + acc.runs;      // 첫 굴림 + 🎲로 굴린 것
  return acc;
}
const keysOf = (m) => Array.from(m.keys()).sort((a, b) => a - b);

/* ══════════════════════════════════════════════════════════════
 * A. 🧬 **조립대에 도달한다** — 게임 입구를 통해서만
 * ══════════════════════════════════════════════════════════════ */
{
  const h = toBench(boot(11));
  const rows = h.D.querySelectorAll("#prospect-body .pcg-row").length;
  check(h.W.__errs.length === 0 && h.active() === "screen-prospect",
    `A-1. 🚪 타이틀 → ✏️ 이름 → 🏟️ 유스 → 🎯 포지션 → **🧬 조립대**에 도달한다 (${h.active()})`
    + (h.W.__errs.length ? `\n     🔴 페이지 오류: ${h.W.__errs[0]}` : ""));
  check(rows === SLOTS,
    `A-2. 🧬 조립대에 능력치 **${SLOTS}줄**이 그려진다 (${rows}줄)`);
  const st = h.W.WingerProspect._t.state();
  check(!!st && !!st.build && !!st.talents && st.used === 0,
    `A-3. 🧬 조립대 상태에 **선수 한 명**이 있다 (build ✔ · talents ✔ · 🎲 사용 ${st ? st.used : "?"}회)`
    + `\n     👉 \`cards\`가 없습니다 — 3택은 폐기됐어요 (74번 판정 ⑤)`);
  const BTNS = ["btn-prospect-reroll", "btn-prospect-compare", "btn-prospect-start", "btn-back-prospect"];
  const noBtn = BTNS.filter((id) => !h.D.getElementById(id));
  check(noBtn.length === 0,
    `A-4. 🧬 🎲 다시 뽑기 · 📊 견주기 · 🚀 시작 · ↩️ 뒤로 네 버튼이 다 있다`
    + (noBtn.length ? `\n     🔴 없는 것: ${noBtn.map((id) => `#${id}`).join(", ")}` : ""));
  h.close();
}

/* ══════════════════════════════════════════════════════════════
 * B. 📊 **총합이 정확히 ${POOL_WANT}이다** — 산식을 직접 굴려서
 *
 * 🔴 **여기가 M1의 자리입니다.** `rollShape`는 🎲가 굴리는 유일한 것이고,
 *    그 총합이 흔들리면 **무제한 리롤이 곧 최고값**이 됩니다.
 * 🔒 194를 소스에서 안 읽습니다 — `POOL`을 200으로 바꾸면 빨간불이어야 해요.
 * ══════════════════════════════════════════════════════════════ */
function pureSums(P, W, n) {
  const markets = Object.keys(P._t.YOUTH_FOCUS);
  const poses = Object.keys(W.__get("POS_INFO"));
  const shape = new Map(), build = new Map(), ages = new Set();
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (let i = 0; i < n; i += 1) {
    const m = markets[i % markets.length], pos = poses[i % poses.length];
    bump(shape, sumOf(P.rollShape(m, pos).stats));
  }
  for (let i = 0; i < Math.min(n, 20000); i += 1) {
    const b = P.rollBuild(markets[i % markets.length], poses[i % poses.length]);
    bump(build, sumOf(b.stats));
    ages.add(b.age);
  }
  return { shape, build, ages: Array.from(ages).sort((a, b) => a - b),
    markets: markets.length, poses: poses.length };
}
const W0 = bootPage();
const P0 = W0.WingerProspect;
{
  const r = pureSums(P0, W0, ROLLS_PURE);
  const off = keysOf(r.shape).filter((s) => s !== POOL_WANT);
  const offN = off.reduce((a, s) => a + r.shape.get(s), 0);
  check(off.length === 0,
    `B-1. 📊 \`rollShape\` **${ROLLS_PURE.toLocaleString()}회가 전부 총합 ${POOL_WANT}** `
    + `(${r.markets}유스 × ${r.poses}포지션 · 나온 총합 ${keysOf(r.shape).join(", ")})`
    + (off.length
      ? `\n     🔴 ${POOL_WANT}이 아닌 굴림 ${offN}회 (${(offN / ROLLS_PURE * 100).toFixed(4)}%) — 나온 총합 ${off.slice(0, 8).join(", ")}`
        + `\n     👉 **총합이 풀리면 무제한 리롤이 곧 최고값입니다.** 검사를 고치지 말고 총합을 되돌리세요`
      : ""));
  const bOff = keysOf(r.build).filter((s) => s !== POOL_WANT);
  check(bOff.length === 0 && r.ages.length === 1 && r.ages[0] === AGE_WANT,
    `B-2. 📊 \`rollBuild\` 2만 회도 **총합 ${POOL_WANT} 하나 · 나이 만 ${AGE_WANT}세 하나**`
    + ` (총합 ${keysOf(r.build).join(", ")} · 나이 ${r.ages.join(", ")})`);
  /* 📊 표준(자)의 총합도 같아야 합니다 — 자가 다르면 견주는 뜻이 사라져요.
   * 🔒 `evenStats()`를 `POOL`과 대 보면 **자기 자신과 비교**가 됩니다. 194와 대 봅니다. */
  const even = P0.evenStats();
  check(sumOf(even) === POOL_WANT && Object.keys(even).length === SLOTS,
    `B-3. 📊 「표준」의 총합도 **정확히 ${POOL_WANT}** — {${Object.keys(even).map((k) => even[k]).join(",")}} = ${sumOf(even)}`
    + `\n     👉 자가 다르면 「지금 ↔ 표준」 표가 견주는 뜻을 잃습니다`);
}

/* 🧪 B 변이 셋 — 총합이 깨지는 세 가지 모양 */
{
  const run = (name) => mutRun(name, () => {
    const MW = bootPage({ muts: MUT[name] });
    const r = pureSums(MW.WingerProspect, MW, 3000);
    MW.close();
    return keysOf(r.shape);
  });
  const m1 = run("POOL_LOOSE");
  check(!!m1 && m1.some((s) => s !== POOL_WANT),
    `B-변이①(M1). \`spread(POOL + rand(-18,18), …)\`로 **총합 고정을 깨면** → 빨간불`
    + (m1 ? ` (나온 총합 ${m1.length}종: ${m1[0]}~${m1[m1.length - 1]})` : MUT_DEAD)
    + `\n     👉 engineer가 이걸 넣었을 때 **검사 9개가 전부 기준선과 같았습니다** (76번 §6)`);
  const m2 = run("POOL_200");
  check(!!m2 && m2.some((s) => s !== POOL_WANT),
    `B-변이②. \`POOL\`을 **200으로 옮기면** → 빨간불`
    + (m2 ? ` (나온 총합 ${m2.join(", ")})` : MUT_DEAD)
    + `\n     👉 \`P.POOL\`을 읽는 검사는 **이걸 절대 못 잡습니다** — 그래서 ${POOL_WANT}을 박았어요`);
  const m3 = run("REMAINDER_OFF");
  check(!!m3 && m3.some((s) => s !== POOL_WANT),
    `B-변이③. **우수리 되돌리기를 멈추면** → 빨간불`
    + (m3 ? ` (나온 총합 ${m3.join(", ")})` : MUT_DEAD)
    + `\n     👉 "대충 ${POOL_WANT} 근처"가 아니라 **정확히 ${POOL_WANT}**이어야 합니다`);
}

/* ══════════════════════════════════════════════════════════════
 * C. 🎲 **몇 번을 굴려도 총합이 안 바뀐다** — 게임 입구를 통해 실제 버튼으로
 *
 * 🔑 **이게 새 계약입니다.** 옛 C절은 *"두 번 쓰면 잠긴다"*였는데
 *    designer 판정이 그 문장을 뒤집었어요 — 브레이크가 **횟수가 아니라 총합**입니다.
 * ══════════════════════════════════════════════════════════════ */
const BASE = benchProbe(null, SEEDS, ROLLS_UI);
{
  const off = keysOf(BASE.sums).filter((s) => s !== POOL_WANT);
  check(off.length === 0,
    `C-1. 🎲 시드 ${SEEDS.length}개 × 🎲 ${ROLLS_UI}번 — **${BASE.draws}굴림이 전부 총합 ${POOL_WANT}**`
    + ` (나온 총합 ${keysOf(BASE.sums).join(", ")})`
    + (off.length
      ? `\n     🔴 어긋난 굴림: ${off.map((s) => `${s}(${BASE.sums.get(s)}회)`).join(" · ")}`
        + `\n     👉 **♾️ 무제한을 지탱하는 게 이것 하나입니다** — 여기가 풀리면 굴릴수록 세집니다`
      : ""));
  /* 🖥️ **화면 ↔ 로직** — 상태가 194여도 화면이 다른 값을 찍으면 그것도 고장이에요 */
  const sOff = keysOf(BASE.shownSums).filter((s) => s !== POOL_WANT);
  check(sOff.length === 0,
    `C-2. 🖥️ **화면이 찍는 여섯 칸의 합도 매 굴림 ${POOL_WANT}** (\`.pcg-val\` · 나온 합 ${keysOf(BASE.shownSums).join(", ")})`
    + (sOff.length ? `\n     🔴 어긋난 굴림: ${sOff.join(", ")}` : "")
    + `\n     👉 로직에 다시 안 묻고 **사람이 보는 숫자**를 더합니다`);
  const rate = BASE.shapes.size / BASE.draws;
  check(rate >= DISTINCT_MIN,
    `C-3. 🎲 굴릴 때마다 **모양이 실제로 달라진다** — ${BASE.draws}굴림 중 서로 다른 모양 ${BASE.shapes.size}개`
    + ` (${(rate * 100).toFixed(1)}% ≥ ${(DISTINCT_MIN * 100).toFixed(0)}%)`
    + `\n     👉 총합만 보면 **🎲가 죽어도 초록불**입니다 — 바뀌는 쪽도 같이 봐요`);
  /* 🌍 **세계 주석**: 이건 「무제한」이라는 **정책**을 지키는 문장이에요.
   *    designer가 예산을 다시 채우기로 판정하면 **여기가 먼저 뒤집힙니다.**
   *    그때는 값을 고치기 전에 C-1부터 다시 보세요 —
   *    ⚠️ 총합이 흔들리는 세계에서는 **예산 1회도** 곡선을 밉니다. */
  check(BASE.locked === 0 && BASE.lastDisabled === false && BASE.lastUsed === ROLLS_UI,
    `C-4. ♾️ 🎲를 ${ROLLS_UI}번 눌러도 **안 잠긴다** (잠긴 판 ${BASE.locked} · 마지막 사용 ${BASE.lastUsed}회)`
    + `\n     🌍 이건 「무제한」 **정책**의 문장이에요. 예산이 돌아오는 판정이 나오면 여기가 먼저 뒤집힙니다 —`
    + ` 그때 C-1(총합)부터 다시 보세요. **총합이 흔들리면 예산 1회도 곡선을 밉니다**`);
  check(BASE.errs.length === 0,
    `C-5. 🎲 ${BASE.draws}굴림 동안 페이지 오류 0건${BASE.errs.length ? ` — ${BASE.errs[0]}` : ""}`);
}

/* ══════════════════════════════════════════════════════════════
 * D. 🔒 **🎲가 안 굴리는 것** — 굴릴 수 없는 축은 잠겨 있어야 합니다
 *
 * 🚨 총합을 정의할 수 없는 축(🧬 성장타입 · 🎁 타고난 것)은 **굴리면 안 됩니다.**
 *    지금 ⭐ 잠재력도 총합이 안 고정이라 같은 이유로 🔒입니다 (3-B 전).
 * ══════════════════════════════════════════════════════════════ */
{
  check(BASE.talentDrift === 0,
    `D-1. 🔒 ⭐ **잠재력이 🎲 전후로 한 글자도 안 바뀐다** — ${BASE.rolls}굴림 중 바뀐 것 ${BASE.talentDrift}회`
    + `\n     🌍 **3-B(⭐ 잠재력 총합 고정)가 들어오면 이 문장이 뒤집힙니다** — 그때 ⭐는 🎲 대상이 되고`
    + ` 대신 **총합 고정**이 이 자리를 맡아요 (designer 검사 2번). 지금은 총합이 안 고정이라 🔒입니다`);
  check(BASE.growthDrift === 0,
    `D-2. 🔒 🧬 **성장타입이 🎲 전후로 안 바뀐다** — 바뀐 것 ${BASE.growthDrift}회`
    + `\n     👉 총합을 정의할 수 없는 축이에요. 함께 굴리면 🌳 만성이 36% → 10%로 사라집니다 (실측 D-ⓑ)`);
  check(BASE.giftDrift === 0,
    `D-3. 🔒 🎁 **화면의 타고난 것(🗣️ 코멘트 · ⭐ 특능 · 🩹 결함 · ⭐ 잠재력 줄)이 안 바뀐다** — 바뀐 것 ${BASE.giftDrift}회`
    + `\n     👉 상태가 아니라 **사람이 보는 글자**를 대 봅니다. 화면이 🔒이라고 적어 놨어요`);
  check(BASE.ageDrift === 0,
    `D-4. 🔒 🎂 나이가 🎲 전후로 안 바뀐다 (만 ${AGE_WANT}세 고정 · 바뀐 것 ${BASE.ageDrift}회)`);
}

/* 🧪 C·D 변이 넷 — 각각 다른 검사가 잡아야 합니다 */
{
  const SHORT = [11], N = 12;
  const m1 = mutRun("POOL_LOOSE", () => benchProbe(MUT.POOL_LOOSE, SHORT, N));
  check(!!m1 && keysOf(m1.sums).some((s) => s !== POOL_WANT)
    && keysOf(m1.shownSums).some((s) => s !== POOL_WANT),
    `C-변이①(M1). 🎲 버튼을 통해서도 **총합이 흔들리면** → 빨간불`
    + (m1 ? ` (상태 총합 ${keysOf(m1.sums).join(",")} · 화면 합 ${keysOf(m1.shownSums).join(",")})` : MUT_DEAD));
  const m2 = mutRun("DEAD_ROLL", () => benchProbe(MUT.DEAD_ROLL, SHORT, N));
  check(!!m2 && (m2.shapes.size / m2.draws) < DISTINCT_MIN,
    `C-변이②. **🎲를 죽이면**(배분이 안 바뀜) → 빨간불`
    + (m2 ? ` (${m2.draws}굴림 중 서로 다른 모양 ${m2.shapes.size}개 = ${(m2.shapes.size / m2.draws * 100).toFixed(1)}%)` : MUT_DEAD)
    + `\n     👉 총합만 보는 검사는 이걸 못 잡아요 — 죽은 버튼도 총합은 ${POOL_WANT}입니다`);
  const m3 = mutRun("REROLL_CAP", () => benchProbe(MUT.REROLL_CAP, SHORT, N));
  check(!!m3 && (m3.locked > 0 || m3.lastDisabled === true),
    `C-변이③. **예산 2회로 되돌리면**(옛 세계) → 빨간불`
    + (m3 ? ` (잠긴 판 ${m3.locked} · 마지막 disabled ${m3.lastDisabled} · 실제 굴림 ${m3.rolls}회)` : MUT_DEAD));
  const m4 = mutRun("REROLL_TALENTS", () => benchProbe(MUT.REROLL_TALENTS, SHORT, N));
  check(!!m4 && m4.talentDrift > 0 && m4.giftDrift > 0,
    `D-변이①(M2). 🎲가 **⭐ 잠재력까지 굴리면** → 빨간불`
    + (m4 ? ` (잠재력이 바뀐 굴림 ${m4.talentDrift}/${m4.rolls} · 화면도 ${m4.giftDrift}회 바뀜)` : MUT_DEAD)
    + `\n     👉 engineer가 배선을 끊기 전까지 🎲 예산이 그대로 **잠재력의 max of N**이었습니다`);
  const m5 = mutRun("REROLL_GROWTH", () => benchProbe(MUT.REROLL_GROWTH, SHORT, N));
  check(!!m5 && m5.growthDrift > 0,
    `D-변이②(M3). 🎲가 **🧬 성장타입까지 굴리면** → 빨간불`
    + (m5 ? ` (성장타입이 바뀐 굴림 ${m5.growthDrift}/${m5.rolls})` : MUT_DEAD)
    + `\n     👉 화면에 안 나오는 축이라 **눈으로는 안 보입니다** — 상태를 직접 봐야 잡혀요`);
}

/* ══════════════════════════════════════════════════════════════
 * E. 📊 **「지금 ↔ 표준」 2열 시트** — 무제한 굴림에서 *"멈춰도 되나"*의 답
 * ══════════════════════════════════════════════════════════════ */
{
  const h = toBench(boot(23));
  h.press(h.D.getElementById("btn-prospect-compare"), "📊 견주기");
  const sheet = h.D.getElementById("prospect-sheet");
  const cols = h.D.querySelectorAll("#prospect-compare .pcs-col").length;
  const rows = h.D.querySelectorAll("#prospect-compare .pcs-tbl tr").length;
  check(!!sheet && sheet.hidden === false && sheet.classList.contains("on"),
    `E-1. 📊 📊 견주기를 누르면 시트가 열린다 (hidden ${sheet ? sheet.hidden : "?"})`);
  check(cols === 2 && rows === SLOTS + 1,
    `E-2. 📊 시트가 **2열(🧒 지금 · 📊 표준) × ${SLOTS + 1}행(머리 + ${SLOTS}칸)** (열 ${cols} · 행 ${rows})`
    + `\n     👉 「직전 ↔ 지금」이 **아닙니다** — 되돌리기가 없어서 직전은 손잡이 없는 정보예요`);
  /* 🎲를 시트 안에서 눌러도 시트가 **열린 채**여야 합니다 (닫았다 여는 왕복을 만들면 안 돼요) */
  const before = shownSum(h);
  h.press(h.D.getElementById("btn-sheet-reroll"), "시트 안 🎲");
  check(sheet.hidden === false && shownSum(h) === POOL_WANT && before === POOL_WANT,
    `E-3. 📊 시트 안에서 🎲를 눌러도 **시트가 열린 채** 다시 그려지고 합은 ${POOL_WANT} 그대로다`);
  h.press(h.D.getElementById("btn-sheet-keep"), "시트 닫기");
  check(sheet.hidden === true, `E-4. 📊 「이대로 갈게요」를 누르면 시트가 닫힌다`);
  h.close();
}

/* ══════════════════════════════════════════════════════════════
 * F. 🚀 **입단 경계면** — 조립대가 만든 것이 세이브에 그대로 들어가는가
 *
 * 🔴 생산자(조립대)와 소비자(세이브)를 **동시에 열어** 봅니다.
 *    한쪽만 보면 *"조립대는 194인데 세이브는 아니다"*가 안 보여요.
 * ══════════════════════════════════════════════════════════════ */
{
  const h = toBench(boot(37));
  const st = h.W.WingerProspect._t.state();
  const rb = h.D.getElementById("btn-prospect-reroll");
  const ROLLS = 7;
  for (let i = 0; i < ROLLS; i += 1) h.press(rb, "🎲");
  const built = JSON.parse(JSON.stringify(st.build));
  const talents = JSON.parse(JSON.stringify(st.talents));
  h.press(h.D.getElementById("btn-prospect-start"), "🚀 이 선수로 시작");
  const S = h.W.__get("S");
  check(h.active() === "screen-main",
    `F-1. 🚀 [이 선수로 시작] → **메인 화면**으로 간다 (${h.active()})`);
  check(!!S && sumOf(S.stats) === POOL_WANT,
    `F-2. 🚀 세이브의 스탯 총합이 **정확히 ${POOL_WANT}** (${S ? sumOf(S.stats) : "?"})`
    + `\n     👉 조립대가 194인데 세이브가 아니면 **경계면에서 새는 것**입니다`);
  check(!!S && JSON.stringify(S.stats) === JSON.stringify(built.stats)
    && JSON.stringify(S.talents) === JSON.stringify(talents),
    `F-3. 🚀 **마지막으로 본 몸이 그대로** 세이브에 들어간다 (📊 배분 ✔ · ⭐ 잠재력 ✔)`);
  check(!!S && S.age === AGE_WANT && S.growthType === built.growthType
    && S.rerolls === ROLLS && S.flaw === (built.flaw || "")
    && JSON.stringify(S.traits) === JSON.stringify(built.trait ? [built.trait] : []),
    `F-4. 🚀 나이·성장타입·🎲 횟수·특능·결함이 그대로 심긴다`
    + ` (만 ${S ? S.age : "?"}세 · ${S ? S.growthType : "?"} · 🎲 ${S ? S.rerolls : "?"}회)`
    + `\n     🟡 \`S.rerolls\`는 **상한이 없는 수**예요 (무제한이라 300도 들어갑니다)`);
  check(h.W.__errs.length === 0,
    `F-5. 🚀 입단까지 페이지 오류 0건${h.W.__errs.length ? ` — ${h.W.__errs[0]}` : ""}`);
  h.close();
}

/* ══════════════════════════════════════════════════════════════
 * G. 🧰 **픽스처 생성기가 지금 화면으로 선수를 만들 수 있는가**
 *
 * 🔴 `scripts/make-fixtures.js`의 `newPlayer()`를 ⚽ soccer와 ⚽ 더 윙어 II가
 *    **같이** 씁니다 (winger2는 `makeWinger2` → `soccerDebut` → `newPlayer`).
 *    그런데 새 흐름은 `btn-new` 다음이 ✏️ **이름 화면**이라 `#agency-list`가
 *    **비어 있고**(`renderMarkets()`가 `btn-name-next`로 옮겨갔어요),
 *    이름 화면의 `btn-start`도 조립대의 `btn-prospect-start`로 바뀌었습니다.
 *
 * 🚨 **이건 조용히 실패합니다.** `beta/_fixtures.js`가 디스크에 남아 있어서
 *    `_check.html`도 `check-page-test`도 `prospect-test`도 전부 통과해요 —
 *    **픽스처를 다시 만들 때 비로소** 죽습니다. 그리고 `makeWinger2`는 시드 30개를
 *    전부 잡아먹고 `❌ 조건에 맞는 상태를 못 만들었어요` 한 줄만 찍습니다.
 *
 * 🔬 재는 법 — **파일을 하나도 안 씁니다.**
 *    ⚠️ 옛 순서를 **손으로 재현하지 않아요.** 그러면 engineer가 고친 뒤에도
 *       제 재현본이 옛 순서를 돌려서 **영영 빨간불**이 됩니다 (검사가 코드가 아니라
 *       제 재현본을 재는 자리). **`newPlayer()`의 소스에서 누를 것을 뜯어**
 *       그대로 눌러 보고, **닿는 화면**만 봅니다.
 *    · 지금 화면에 없는 선택자는 **건너뜁니다** — 게임별 분기가 생겨도 안 웁니다
 *    · 판정은 오직 하나: **`screen-main`에 닿았는가**
 * ══════════════════════════════════════════════════════════════ */
{
  const MAKEFX = "/workspace/grow-games/scripts/make-fixtures.js";
  const src = require("fs").readFileSync(MAKEFX, "utf8");
  const body = src.match(/function newPlayer\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  const POS = "wg";
  const steps = [];
  /* 🔑 **누르기 전에 심는 것도 소스에서 뜯습니다.** `newPlayer()`는 🏘️ 동네 순간 카드를
   * 🤖 자동 진행으로 지나가려고 `localStorage.setItem`을 먼저 부르는데, 그 줄을 안 읽으면
   * 이 재현본은 **진짜 미니게임이 뜬 화면**을 누르게 됩니다 — 손이 없어서 영영 못 지나가요.
   * 🔴 값을 여기 베껴 적지 않습니다(그러면 소스가 바뀌어도 안 잡혀요). */
  const pre = {};
  if (body) {
    for (const line of body[1].split("\n")) {
      let g;
      if ((g = line.match(/localStorage\.setItem\(\s*["']([\w-]+)["']\s*,\s*["']([^"']*)["']\s*\)/))) { pre[g[1]] = g[2]; continue; }
      if ((g = line.match(/\$\("([\w-]+)"\)\.click\(\)/))) steps.push(`#${g[1]}`);
      else if ((g = line.match(/querySelectorAll\(["'`]([^"'`]+)["'`]\)/))) steps.push(g[1]);
      else if ((g = line.match(/querySelector\(`([^`]+)`\)/))) steps.push(g[1].replace(/\$\{pos\}/g, POS));
      else if ((g = line.match(/querySelector\(["']([^"']+)["']\)/))) steps.push(g[1]);
    }
  }
  check(!!body && steps.length >= 3,
    `G-0. 🧰 \`make-fixtures.js\`의 \`newPlayer()\`에서 **누르는 것 ${steps.length}개**를 뜯었다`
    + ` (${steps.join(" → ")})`
    + `\n     먼저 심는 것: ${Object.keys(pre).length ? Object.entries(pre).map(([k, v]) => `${k}=${v}`).join(" · ") : "없음"}`
    + (body ? "" : `\n     🔴 함수를 못 찾았어요 — 정규식을 고치세요 (이 검사는 지금 "안 돈" 상태입니다)`));

  /* ⏱️ 🧒 **어린 시절 네 화면은 `setTimeout(…, 620)`으로 넘어갑니다.**
   *    `make-fixtures.js`는 통째로 동기라 `fastEcho()`로 **그동안만 타이머를 즉시 실행**으로
   *    바꿔요. 🔒 **그 사실도 소스에서 읽습니다** — 여기 손으로 적으면 make-fixtures가
   *    방식을 바꾼 날 이 재현본만 옛 길에 남아요(「도달 경로가 조용히 죽음」). */
  const usesFastEcho = /fastEcho\(/.test(body ? body[1] : "");

  /* 🔴 **`bootPage`의 `fastTimers`로는 안 됩니다** — 그건 `setTimeout(fn, 0)`이라 여전히
   *    **비동기**예요. 이 재현본은 통째로 동기라 한 틱도 안 넘깁니다(실측: 그래도 `childPicks`가
   *    `[]`). `fastEcho`처럼 **그 자리에서 부르는** 것만 통합니다. */
  function replay(sync) {
    const h = boot(11, null, pre);
    const realST = h.W.setTimeout;
    if (sync) h.W.setTimeout = function (fn) { if (typeof fn === "function") fn(); return 0; };
    const skipped = [];
    for (const sel of steps) {
      const el = h.D.querySelector(sel);
      if (!el) { skipped.push(sel); continue; }
      el.click();                                   // make-fixtures는 click 한 번만 씁니다
    }
    if (sync) h.W.setTimeout = realST;
    const St = (h.W.WingerCareer && h.W.WingerCareer._t) ? h.W.WingerCareer._t.state() : null;
    const out = { landed: h.active(), skipped,
      picks: (St && St.childPicks) || null, schoolN: St ? St.schoolN : null };
    h.close();
    return out;
  }
  const G = replay(usesFastEcho);
  const skipped = G.skipped;
  const landed = G.landed;
  check(landed === "screen-main",
    `G-1. 🧰 그 순서를 그대로 눌러 **육성 화면에 닿는다** (닿은 곳: ${landed})`
    + (landed === "screen-main" ? "" :
      `\n     🔴 **\`beta/_fixtures.js\`의 winger2 시나리오 3종을 다시 만들 수 없습니다**`
      + `\n        (\`winger2-match\` · \`winger2-def\` · \`winger2-bench\`)`
      + `\n     🔴 지금 화면에 없어서 건너뛴 것: ${skipped.length ? skipped.join(" · ") : "없음"}`
      + `\n     👉 \`scripts/make-fixtures.js\`의 \`newPlayer()\` — **2026-09-03 기준 실제 순서**는 이렇습니다:`
      + `\n        \`btn-new\` → \`btn-name-next\` → 🦶 \`#screen-foot .foot-card[data-foot="R"]\` → \`btn-foot-next\``
      + `\n        → 🗺️ \`#origin-map .om-do[data-id="seoul"]\`(또는 \`#origin-cities .om-city\`) → \`btn-origin-next\``
      + `\n        → 🧒 \`#screen-child .card[data-child="ball"]\` → \`#screen-child2 …[data-child="fin"]\``
      + `\n          → \`#screen-child3 …[data-child="gn"]\` → \`#screen-child4 …[data-child="h1"]\``
      + `\n        → 🎯 \`#position-list .card[data-pos="wg"]\` → 🏫 \`btn-town-next\` ×2 → 📨 \`btn-early-next\``
      + `\n        → ×3 → 📨 \`btn-early-next\` → ×3 → 🏟️ \`#agency-list .card\` → \`btn-prospect-start\``
      + `\n     🚨 **그런데 줄만 더해서는 안 됩니다 — 🧒 어린 시절 네 화면이 \`setTimeout(…, 620)\`으로 넘어갑니다.**`
      + ` \`make-fixtures.js\`는 **통째로 동기**(\`.click()\`을 줄줄이)라 그 620ms를 못 기다려요.`
      + `\n        👉 \`newPlayer()\`와 그 호출자들을 **async/await**로 바꾸거나,`
      + ` 페이지 preamble에서 어린 시절 구간만 타이머를 즉시 실행으로 바꿔야 합니다`
      + `\n        ⚠️ 후자는 🏟️ 경기 연출까지 같이 즉시 실행이 되니 **범위를 반드시 좁히세요**`
      + `\n     👉 ⚠️ soccer도 같은 함수를 씁니다 — **게임별로 갈라 주세요**`
      + `\n        (🦶·🗺️·🧒 화면은 soccer에 없어서 \`querySelector\`가 null이라 자동으로 건너뜁니다)`
      + `\n     👉 이건 **조용히 실패하는 자리**예요: 디스크의 픽스처가 남아 있어서`
      + ` \`check-page-test\`도 \`_check.html\`도 통과합니다`
      + `\n     🔒 그래서 이 줄은 **❌(종료 1)로 둡니다** — 🚧로 낮추면 픽스처가 낡아 가는 걸`
      + ` 아무도 안 보게 돼요. 고치면 그날 초록불이 됩니다`));

  /* ══════════════════════════════════════════════════════════════
   * G-2. 🧒 **「닿았는가」가 아니라 「지나왔는가」** (2026-09-04 · 139번)
   *
   * 🔴 **G-1만으로는 🧒 어린 시절을 통째로 건너뛰고도 초록불입니다.** 실측:
   *      childPicks=[] · schoolN=8 · 닿은 곳=screen-main · 건너뛴 선택자 5개
   *    초1을 누르면 620ms 뒤에야 초2 화면이 생기는데, 동기로 줄줄이 누르면 초2~초4가
   *    **DOM에 아예 없어서** `querySelector`가 null → 조용히 건너뜁니다. 그런데
   *    `#position-list`는 정적 마크업이라 **그다음 줄이 흐름을 끝까지 밀어요.**
   *    👉 **「자가 복구가 실패를 삼킴」**입니다 — 도달만 재면 아무것도 안 눌러도 통과예요.
   *
   * 🔒 **`schoolN`은 이 사고의 감지기가 아닙니다** — 어린 시절을 통째로 건너뛴 위 실측에서도
   *    **8이었어요.** 감지기는 `childPicks`입니다. `schoolN`은 「학교 카드를 실제로 굴렸나」만
   *    봐요(옛 세이브 중립값 3보다 크다). 🔴 **정확한 8은 `town-test.js` T-5가 정본**이라
   *    여기 두 번째로 박지 않습니다 — designer가 카드 수(2/3/3)를 만지는 날 두 곳이 갈라져요.
   * ══════════════════════════════════════════════════════════════ */
  const CHILD_YEARS = 4;          // 🔒 문턱은 여기 박습니다 (`_load.js`의 CHILD_SCREENS와 같은 수)
  const OLD_SAVE_CARDS_NEUTRAL = 3;   // 📀 옛 세이브의 중립 카드 수 — 이보다 커야 학교를 굴린 거예요
  const walked = Array.isArray(G.picks) && G.picks.length === CHILD_YEARS;
  const schooled = typeof G.schoolN === "number" && G.schoolN > OLD_SAVE_CARDS_NEUTRAL;
  check(walked && schooled,
    `G-2. 🧒 그 순서가 **어린 시절 ${CHILD_YEARS}해를 실제로 지나온다**`
    + ` — \`childPicks\` [${(G.picks || []).join(", ") || "(빈 배열)"}] · \`schoolN\` ${G.schoolN}`
    + (walked && schooled ? "" :
      (!walked
        ? `\n     🔴 **어린 시절을 안 지났습니다** — 만들어지는 픽스처의 🔑 초1~초4 선택이 통째로 빠져요.`
          + ` 🧬 잠재력(\`TAL_SHIFT\`)·🎯 집중(\`FOCUS_W_HELD\`)·📐 천장(\`CHILD_CAP_STEP\`)이 전부 그 값을 봅니다`
        : "")
      + (!schooled ? `\n     🔴 **학교 카드를 안 굴렸습니다** — \`schoolN\`이 ${G.schoolN}이에요` : "")
      + `\n     👉 \`make-fixtures.js\`의 \`fastEcho()\`(620ms 타이머를 **그 자리에서** 실행) 배선을 보세요`));

  /* 🧪 **G-2가 공짜 초록불이 아니라는 증거** — 같은 순서를 **동기 타이머 없이** 누르면
   *    닿는 곳은 그대로 `screen-main`인데 어린 시절은 통째로 빠집니다.
   * 🔒 `fastEcho`를 안 쓰는 흐름으로 바뀌면 이 대조가 뜻을 잃으므로 그때는 안 돌립니다. */
  if (!usesFastEcho) {
    console.log(`🔎 G-2-대조. \`newPlayer()\`가 이제 \`fastEcho\`를 안 씁니다 — 이 대조는 뜻이 없어 건너뜁니다`);
  } else {
    const N = replay(false);
    const bit = !(Array.isArray(N.picks) && N.picks.length === CHILD_YEARS);
    check(bit,
      `G-2-대조. 🧪 **동기 타이머 없이** 같은 순서를 누르면 → G-2가 빨간불`
      + ` (닿은 곳 **${N.landed}** · \`childPicks\` [${(N.picks || []).join(", ") || "(빈 배열)"}]`
      + ` · \`schoolN\` ${N.schoolN} · 건너뛴 선택자 ${N.skipped.length}개)`
      + (bit
        ? `\n     🔑 **닿는 곳은 똑같이 \`${N.landed}\`입니다** — 그래서 G-1만으로는 아무것도 안 지켰어요`
        : `\n     🔴 타이머를 안 뭉갰는데도 ${CHILD_YEARS}해가 다 눌렸어요 — G-2가 아무것도 안 지킵니다`));
  }
}

W0.close();
console.log(`\n${fail ? `❌ ${fail}건 실패` : "✅ 통과"} — 🧬 조립대 · 📊 총합 고정`);
process.exit(fail ? 1 : 0);
