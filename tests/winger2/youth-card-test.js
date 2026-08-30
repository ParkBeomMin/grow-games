/* ⚽ 더 윙어 II — 🎚️ 유스 순간 카드의 **중심(YOUTH_CARD_P)이 중립인가**
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-08-30 · engineer 80번 §2 · 설계 13번 §2-6)
 *
 *   · ⚔️ 유스 평가전은 **경기 평점(등급)을 `stageScore`가 이미 능력치로 정하고**,
 *     순간 카드는 거기서 **±1칸만** 움직입니다
 *   · 그래서 카드의 중심 `autoP`는 **상수**예요 — 프로처럼 `pFinish`/`pConcede`를
 *     쓰면 능력치가 한 경기에 두 번 실려요(§2-6이 폐기한 **이중 계상**)
 *   · 능력치는 사라진 게 아니라 **`half(a)`(조작이 흔드는 폭)에 남습니다**
 *
 * 🔴 **그러니 "유스도 프로와 같은 중심을 써야 한다"고 우기면 안 됩니다.**
 *    그건 폐기된 세계의 문장이에요. 되살아나면 M3(PRO_CENTER)이 잡습니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 **값이 아니라 관계로 씁니다** — `YOUTH_CARD_P`를 읽어 오지 않아요
 * ─────────────────────────────────────────────────────────────────────────
 * engineer가 확정한 값은 `{ goal: 1/3, assist: 1/3, defend: 0.5 }`인데,
 * **그 숫자를 여기 베껴 적으면** 값을 바꿔도 이 검사가 따라가거나(읽어 오면),
 * 구조가 바뀌면 통째로 뜻을 잃습니다(베껴 적으면).
 *
 * 대신 그 값이 **무엇을 위한 자리인지**를 씁니다 —
 *
 *      🎯 s = 0.5(중립 조작 · 🤖 자동 진행이 쓰는 값)에서
 *         **perfect 빈도 = miss 빈도**   ⇔   등급 ±1칸 기댓값이 0
 *
 * ⚽🅰️는 `miss = (1−p)/2`라 p = ⅓에서, 🧱은 이분이라 p = 0.5에서 그렇게 됩니다.
 * **두 조건이 하나의 문장으로 모이고**, 계수를 어디로 옮겨도 이 문장은 그대로예요.
 * 검사가 값을 알 필요가 **없습니다** — 스스로 굴려서 확인해요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **진짜 `playYouthMoment`를 부릅니다** — 산식 사본을 안 지어요
 *      (🤖 자동 진행이 쓰는 바로 그 갈래: `cb(judge(0.5), T)`)
 *   ③ **문턱(0.025)은 여기 박습니다.** 1σ를 함께 찍어 여유를 눈에 보이게 해요
 *   ④ **측정 조건을 검사가 스스로 찍습니다** — 각 칸의 실제 능력치를 출력합니다.
 *      능력치 축이 죽어 있으면(전부 같은 값) 그것부터 빨간불이에요
 *   ⑤ **시드 하나로 안 잽니다** — 시드 셋을 각각 봅니다
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 * ⏱️ 약 25초.
 */
"use strict";
const { bootPage, pageMutsOK } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 **문턱은 여기 박습니다** — 소스에서 안 읽어요
 * ══════════════════════════════════════════════════════════════ */
const N = 60000;          // 칸마다 굴리는 횟수
const BAND = 0.025;       // |perfect − miss| 문턱
/* 📏 **문턱과 기준선 사이의 여유를 눈에 보이게 둡니다.**
 *   · 잡음 1σ = √(Var) / √N — ⚽🅰️(p≈⅓) 0.0033 · 🧱(p≈0.5) 0.0041
 *     → 0.025는 **6σ 넘게** 떨어져 있어요. 우연으로 빨간불이 뜨지 않습니다
 *   · 변이(중심을 0.45 / 0.65로 옮김)는 **0.175 / 0.30**이라 문턱의 7~12배예요
 *   ⚠️ 문턱을 기준선 쪽으로 더 조이지 마세요 — "가끔 빨간불 뜨는 검사"가 되면
 *      사람이 그 옆의 진짜 실패를 못 봅니다. */
const SIGMA_MIN = 4;      // 문턱은 잡음 1σ의 최소 몇 배여야 하나
const KINDS = [["g", "⚽ 결정"], ["a", "🅰️ 전개"], ["d", "🧱 수비"]];
/* 🧪 `S.stats`를 이 값으로 채워 능력치 축을 훑습니다.
 * ⚠️ **`S.stats`가 곧 능력치가 아니에요.** `nowStats`가 🎂 17세 성장 곡선(≈0.5)을
 *    곱하고, `blendOf`가 [40, 220]으로 자릅니다 — 그래서 유스에서 엔진이 실제로 보는
 *    능력치는 **40 언저리~60**이에요(바닥 40에 눌립니다).
 * 🔬 그 위(200 · 400)는 **일부러 유스 밖까지** 밀어 본 것입니다. `half(a)`가
 *    40~120에서 0.17 → 0.20으로 움직이니, 중립이 그 구간 전체에서 성립하는지
 *    봐야 "능력치가 중심에 안 실렸다"가 증명돼요.
 * 📸 실제로 걸린 능력치는 A-3이 **찍어서 보여줍니다** — 축이 죽으면 그게 먼저 빨간불이에요. */
const LEVELS = [30, 90, 200, 400];
const SEEDS = [11, 23, 37];
const POS = "wg";

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 M-P1 — ⚽ 결정의 중심을 옮김. 등급 기댓값이 +0.175칸으로 기울어요 */
  P_GOAL: { "game.js": [[/const YOUTH_CARD_P = \{ goal: 1 \/ 3, assist: 1 \/ 3, defend: 0\.5 \};/,
    "const YOUTH_CARD_P = { goal: 0.45, assist: 1 / 3, defend: 0.5 };"]] },
  /* 🔴 M-P2 — 🧱 수비의 중심을 옮김 (이분이라 기울기가 더 큽니다) */
  P_DEFEND: { "game.js": [[/const YOUTH_CARD_P = \{ goal: 1 \/ 3, assist: 1 \/ 3, defend: 0\.5 \};/,
    "const YOUTH_CARD_P = { goal: 1 / 3, assist: 1 / 3, defend: 0.65 };"]] },
  /* 🔴 **M-P3 — 폐기된 「프로의 중심」을 유스에 되살립니다** (§2-6 이중 계상).
   *    능력치가 중심에 실려서 잘 큰 선수가 **가만히 있어도** 등급이 올라요 —
   *    engineer 80번 §4-1의 옛 표(−0.105 → +0.245)가 그 모양입니다. */
  PRO_CENTER: { "game.js": [[/const judge = \(s\) => E\.judgeAtP\(kind, YOUTH_CARD_P\[kind\], ability, s\);/,
    "const judge = (s) => E.judgeAtP(kind, E.mid(ability), ability, s);"]] },
  /* 🔴 **M-P4 — v1 자동 판정(`autoRes`)으로 조용히 떨어집니다.**
   *    엔진이나 미니게임이 안 실렸을 때의 폴백인데, 늘 그리로 가면
   *    🤖 자동 진행의 등급 기댓값이 능력치를 타요 (= 승부처가 v1으로 복귀) */
  FALLBACK: { "game.js": [[/ {2}if \(!E \|\| !E\.judgeAtP \|\| !M \|\| !M\.play\) \{ playRandomMini\(container, cb\); return; \}/,
    "  if (true) { playRandomMini(container, cb); return; }"]] },
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
const mutOK = (name) => pageMutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해** 선수를 만들고, 그 선수의
 *    `playYouthMoment`를 🤖 자동 진행 갈래로 굴립니다.
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function boot(seed, muts) {
  /* 🤖 자동 진행을 켭니다 — `playYouthMoment`가 `cb(judge(0.5), T)`로 즉시 답하는
   *    바로 그 갈래예요. **중립(s = 0.5)이 걸려 있는 자리**입니다. */
  const W = bootPage({ muts, keys: { "grow-auto-mini": "1" } });
  W.Math.random = mulberry32(seed);
  const D = W.document;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what})`);
    for (const t of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true }));
    }
  };
  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  press(D.querySelector("#agency-list button"), "🏟️ 유스");
  press(D.querySelector(`#position-list .card[data-pos="${POS}"]`), `🎯 ${POS}`);
  press(D.getElementById("btn-prospect-start"), "btn-prospect-start");
  return W;
}

/* 한 칸(카드 종류 × 능력치)을 N번 굴려 판정 빈도를 셉니다.
 * ⚠️ **측정 조건을 스스로 찍습니다** — 그 칸에서 엔진이 실제로 본 능력치를 함께 돌려줘요.
 *    (검사가 능력치 축을 아예 안 타고 있는데 값만 정상으로 보인 전례가 있습니다) */
function cell(W, kindKey, level) {
  const S = W.__get("S");
  for (const k of Object.keys(S.stats)) S.stats[k] = level;
  const E = W.WingerEngine;
  const ability = E.blendOf({ pos: S.pos, stats: W.WingerProspect.nowStats(S) });
  const play = W.__get("playYouthMoment");
  const c = { perfect: 0, ok: 0, miss: 0, other: 0 };
  for (let i = 0; i < N; i++) {
    play(null, (res) => { if (res in c) c[res] += 1; else c.other += 1; }, kindKey);
  }
  return { ability, n: N, p: c.perfect / N, o: c.ok / N, m: c.miss / N, other: c.other };
}

/* 한 판(시드 하나)의 모든 칸 */
function sweep(seed, muts) {
  const W = boot(seed, muts);
  const out = [];
  for (const [kindKey, label] of KINDS) {
    for (const level of LEVELS) out.push(Object.assign({ kindKey, label, level }, cell(W, kindKey, level)));
  }
  const errs = W.__errs.slice();
  W.close();
  return { rows: out, errs };
}

const sd = (p) => Math.sqrt((p < 0.4 ? 2 / 3 : 1) / N);   // |perfect−miss|의 1σ 어림
const fmt = (r) => `${r.label}·능력치${r.ability.toFixed(0)}: p${r.p.toFixed(4)} o${r.o.toFixed(4)} m${r.m.toFixed(4)} Δ${(r.p - r.m >= 0 ? "+" : "")}${(r.p - r.m).toFixed(4)}`;

/* ══════════════════════════════════════════════════════════════
 * A. 🎯 **중립** — s = 0.5에서 perfect 빈도 = miss 빈도
 * ══════════════════════════════════════════════════════════════ */
const base = [];
for (const seed of SEEDS) {
  const { rows, errs } = sweep(seed);
  base.push({ seed, rows, errs });
}
{
  const errs = base.flatMap((b) => b.errs);
  check(errs.length === 0, `A-0. 페이지가 오류 없이 뜬다${errs.length ? ` — ${errs[0]}` : ""}`);

  const bad = [];
  let worst = 0, worstRow = null;
  for (const b of base) {
    for (const r of b.rows) {
      const d = Math.abs(r.p - r.m);
      if (d > worst) { worst = d; worstRow = { seed: b.seed, r }; }
      if (d > BAND) bad.push(`시드${b.seed} ${fmt(r)}`);
      if (r.other) bad.push(`시드${b.seed} ${r.label}: perfect/ok/miss 아닌 판정 ${r.other}건`);
    }
  }
  const cells = base.length * KINDS.length * LEVELS.length;
  check(bad.length === 0,
    `A-1. 🎯 **s = 0.5에서 perfect 빈도 = miss 빈도** — ${cells}칸 전부 |Δ| ≤ ${BAND}`
    + `\n     (= 등급 ±1칸 기댓값 0. 값을 베껴 적지 않고 **굴려서** 확인했어요 · 칸마다 ${N}회)`
    + `\n     최대 |Δ| = ${worst.toFixed(4)} @ 시드${worstRow.seed} ${worstRow.r.label}·능력치${worstRow.r.ability.toFixed(0)}`
    + (bad.length ? `\n     🔴 넘긴 칸 ${bad.length}개:\n       ${bad.slice(0, 6).join("\n       ")}` : ""));

  /* 📏 문턱이 잡음보다 넉넉히 위에 있나 — 좁으면 우연으로 빨간불이 뜹니다 */
  const s1 = Math.max(sd(1 / 3), sd(0.5));
  check(BAND >= SIGMA_MIN * s1,
    `A-2. 📏 문턱 ${BAND}이 잡음 1σ(${s1.toFixed(4)})의 **${(BAND / s1).toFixed(1)}배** (≥${SIGMA_MIN}배)`
    + ` — 실측 최대 |Δ|는 ${(worst / s1).toFixed(1)}σ였어요`);

  /* 🧪 **측정 조건이 살아 있나** — 능력치 축을 실제로 훑었는지 검사가 스스로 찍습니다.
   *    전부 같은 값이면 이 검사는 능력치를 아예 안 타고 있는 겁니다. */
  const abils = Array.from(new Set(base[0].rows.map((r) => Math.round(r.ability)))).sort((a, b) => a - b);
  const span = abils[abils.length - 1] / abils[0];
  check(abils.length >= 3 && span >= 2,
    `A-3. 🧪 측정 조건 — 능력치 축을 실제로 훑었다 (${abils.join(" → ")} · ${span.toFixed(1)}배)`
    + `\n     🏠 유스에서 엔진이 실제로 보는 값은 40 언저리~60이고, 위쪽은 half(a) 구간을 덮으려고 일부러 민 것이에요`
    + (abils.length >= 3 && span >= 2 ? "" :
      `\n     🔴 능력치가 안 흔들려요 — **이 검사는 지금 한 점만 재고 있습니다** (없는 병이 안 보여요)`));

  /* 🔒 엔진 `outcome` 표의 **모양 계약** — 값이 아니라 형태예요.
   *    ⚽🅰️는 세 갈래(ok가 있음) · 🧱은 두 갈래(읽기 게임이라 ok가 없음).
   *    그리고 ⚽🅰️는 `miss = (1−perfect)/2` — p가 어디로 가든 성립하는 관계입니다. */
  const shape = [];
  for (const b of base) {
    for (const r of b.rows) {
      if (r.kindKey === "d") {
        if (r.o !== 0) shape.push(`🧱에 ok가 ${r.o.toFixed(4)} (읽기 게임이라 이분이어야 해요)`);
        if (Math.abs(r.p + r.m - 1) > 1e-9) shape.push(`🧱 perfect+miss ≠ 1 (${(r.p + r.m).toFixed(4)})`);
      } else {
        if (r.o <= 0) shape.push(`${r.label}에 ok가 0 (세 갈래여야 해요)`);
        if (Math.abs(r.m - (1 - r.p) / 2) > BAND) shape.push(`${r.label} miss ≠ (1−perfect)/2 (${r.m.toFixed(4)} vs ${((1 - r.p) / 2).toFixed(4)})`);
      }
    }
  }
  check(shape.length === 0,
    `A-4. 🔒 엔진 outcome 표의 **모양** — ⚽🅰️는 세 갈래에 miss = (1−perfect)/2 · 🧱은 두 갈래`
    + (shape.length ? `\n     🔴 ${Array.from(new Set(shape)).slice(0, 4).join(" | ")}` : ""));

  console.log(`     기준선(시드 ${SEEDS[0]}):\n       ${base[0].rows.map(fmt).join("\n       ")}`);
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — **고치기 전에 빨간불이 뜨는지**
 *    기준선 A-1과 **같은 술어**(|perfect − miss| ≤ BAND)를 그대로 다시 겁니다.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
function mutCheck(name, tag, why, want) {
  if (!mutOK(name)) { check(false, `${tag}. 🧪 ${why}${MUT_DEAD}`); return; }
  const { rows } = sweep(SEEDS[0], MUT[name]);
  const over = rows.filter((r) => Math.abs(r.p - r.m) > BAND);
  const mx = Math.max(...rows.map((r) => Math.abs(r.p - r.m)));
  const hit = want ? want(rows, over) : over.length > 0;
  check(hit,
    `${tag}. 🧪 **변이 — ${why}** → A-1이 빨간불 (넘긴 칸 ${over.length}/${rows.length} · 최대 |Δ| ${mx.toFixed(4)})`
    + (hit ? "" : `\n     🔴 변이를 넣었는데 A-1이 **아직 초록불** — 중립성을 아무것도 안 지키고 있어요`
      + `\n       ${rows.map(fmt).join("\n       ")}`));
  return rows;
}
mutCheck("P_GOAL", "M-P1", "⚽ 결정의 중심을 1/3 → 0.45로 옮김",
  (rows, over) => over.length > 0 && over.every((r) => r.kindKey === "g"));
mutCheck("P_DEFEND", "M-P2", "🧱 수비의 중심을 0.5 → 0.65로 옮김",
  (rows, over) => over.length > 0 && over.every((r) => r.kindKey === "d"));
/* 🔴 이 변이는 **기울기까지 봅니다** — 중심이 능력치를 타면 낮은 능력치와 높은 능력치의
 *    Δ가 서로 달라져요(옛 표: −0.105 → +0.245). 값이 아니라 **관계**가 깨집니다. */
{
  const rows = mutCheck("PRO_CENTER", "M-P3", "폐기된 「프로의 중심」을 유스에 되살림 (§2-6 이중 계상)");
  if (rows) {
    const g = rows.filter((r) => r.kindKey === "g").map((r) => r.p - r.m);
    check(Math.abs(g[g.length - 1] - g[0]) > BAND,
      `M-P3b. 🧪 그때 등급 기댓값이 **능력치를 탄다** (S.stats ${LEVELS[0]} → ${LEVELS[LEVELS.length - 1]}에서 Δ ${g[0].toFixed(3)} → ${g[g.length - 1].toFixed(3)})`
      + `\n     기준선에서는 이 기울기가 0이어야 합니다 — 능력치는 half(a)(폭)에만 남아요`);
  }
}
mutCheck("FALLBACK", "M-P4", "v1 자동 판정(autoRes)으로 조용히 떨어짐");

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
