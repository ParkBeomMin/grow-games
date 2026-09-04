/* 🪑 ⚽ 더 윙어 II — **화면에 뜨는 선발 확률이 실제와 같은가** (K-1 · K-2 · K-3 · K-5 · K-6)
 *
 * 🔴 **이 파일이 생기기 전까지 「화면 = 실제」를 지키는 검사가 한 줄도 없었습니다.**
 *    `myLine()`만 `x.str`을 보고 `rollLineup()`·`startingXIOf()`는 `pickWeight`를 봤어요 —
 *    🌱 `YOUTH_BONUS`(18세 +18% … 21세 +5%)가 **화면 확률에서 통째로 빠져** 있었고,
 *    **동료 NPC에게도** 빠졌습니다. balancer 실측(138번):
 *
 *      | 나이 | pos/base/Δ | 화면 | 실제 | 최대차 |
 *      |---|---|---|---|---|
 *      | 20 | fw/62/0  | 52.4% | **71.8%** | 55.8%p |
 *      | 22 | wg/79/−5 | 59.2% | **49.2%** | **87.2%p** |
 *
 *    20~21세는 낮게, 22+는 높게 — **부호까지 뒤집힙니다.**
 *    `rank`도 `str` 순이라 「실력 N번째」와 🗣️ 감독 대사 갈래(`COACH_FAR`/`NEAR`)까지 틀렸어요.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-09-04 · balancer 138번 · 커밋 e540627)
 *
 *   · 감독이 선발을 고를 때 보는 무게는 **`pickWeight` 한 곳에서만** 정해집니다
 *     (`= x.str × youthMul(x)`). 우리 팀·다른 팀·화면이 **같은 자**를 써야 해요
 *   · 🌱 `YOUTH_BONUS`는 **선발 경쟁 무게에만** 걸립니다 — 생산량은 나이곡선이 정해요
 *   · 🪑 **매 경기 다시 뽑힙니다** — 회전을 만드는 건 벤치 주 회복 `BENCH_COND`라는
 *     **음의 되먹임**이에요(밀리면 몸이 돌아오고 뛰면 깎입니다)
 *   · 🛌 보호 로테이션(`restP`)은 **확률에도 같이** 실립니다 — 굴릴 때만 빼면
 *     "100%라고 적혀 있는데 벤치"가 됩니다
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들 — 값을 고치기 전에 이 파일을 먼저 여세요**
 *   · 🌱 `YOUTH_BONUS`를 **폐기**하는 판정이 나오면 → K-2c(커버리지)가 0이 되어
 *     **K-2가 아무것도 안 지키는 초록불**이 됩니다. 그날 K-2를 다시 겨누세요
 *   · `myLine()`이 **화면 말고 판정에도** 쓰이게 되면 K-1의 「대조」가 「자기 자신과 비교」가
 *     됩니다 — 지금은 부르는 자리가 넷뿐이고 **전부 화면**이라 성립해요
 *   · `BENCH_COND`가 **폐기**되면 K-5가 통째로 옛 계약입니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 `eval` 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱은 여기 박습니다.** `Q.BENCH_COND[0]`이나 `COND_CAP`을 소스에서 읽어 오면
 *      **상수를 바꿔도 검사가 따라가서 아무것도 안 잡혀요**
 *   ③ **자기 자신과 비교하지 않습니다** — 🖥️ 화면(`myLine`)을 ⚽ 실제 굴림(`rollLineup`)과,
 *      🔢 순번(`myLine.rank`)을 🥇 다른 팀 선발을 뽑는 자(`startingXIOf`)와 댑니다
 *   ④ **시드 하나로 안 잽니다** — 시드 셋으로 돌려 합칩니다
 *   ⑤ **변이 전에 기준선이 초록불인지 먼저 찍습니다** (이미 빨간불인 검사는 남의 변이 신호까지 먹어요)
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🔒 **문턱을 적기 전의 두 줄** (CLAUDE.md ⑦)
 * ═════════════════════════════════════════════════════════════════════════
 * ① **무엇과 견주는가**
 *      K-1 🖥️ `myLine().odds` ↔ 같은 상태에서 `rollLineup()`을 ROLLS번 굴린 **실제 선발률**
 *      K-2 🔢 `myLine().line`의 앞 `slots`명 ↔ `startingXIOf(내 클럽)`이 뽑은 내 포지션 선발
 *      K-5 🛌 벤치 주를 지난 뒤의 `S.condition` ↔ **검사에 박은 바닥값**
 *      K-6 🩺 컨디션만 20 → 95로 옮겼을 때 **실제 선발률의 차이** ↔ 검사에 박은 밴드
 * ② **격자의 어느 칸에서 재는가**
 *      🇰🇷 K리그1 **데뷔 칸**입니다. `DEBUT_POOL = 3`이라 클럽 전력이 52·57·62 셋이에요.
 *      🎯 자리 4 × 🏟️ 클럽 3 × 🎂 나이 4(20·21·22·26) × 🩺 컨디션 2 × 📊 Δ능력 5 × 🎲 시드 3
 *      = **1,440칸**. 🎂 나이 넷은 🌱 보너스가 **살아 있는 구간(20·21)과 죽은 구간(22·26)**을
 *      둘 다 밟습니다 — 한쪽만 밟으면 부호가 뒤집히는 걸 못 봐요.
 *
 * ⏱️ 약 3분 (굴림이 900만 번쯤 돕니다).
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 */
"use strict";
const fs = require("fs");
const { bootPage, pageMutsOK, seedBoth } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const note = (msg) => console.log(`🔎 ${msg}`);

/* ══════════════════════════════════════════════════════════════
 * 🔒 **정답은 여기 있습니다** — 소스에서 안 읽어요
 *
 * `Q.BENCH_COND[0]`에서 읽으면 `[4, 10]`으로 바꿔도 검사가 따라갑니다.
 * 산식은 소스에서 뜯고, **문턱은 검사에 박습니다** — 방향이 반대예요.
 * ══════════════════════════════════════════════════════════════ */

/* K-1 — 🖥️ 화면과 ⚽ 실제의 차이. **절대 확률(71.8%)을 굳히지 않습니다** —
 * 계약은 「두 자가 같다」예요. 계수가 움직이면 두 값이 **같이** 움직여야 합니다.
 *   실측 기준선 회전칸 평균차 1.38%p · >5%p 칸 0.1% (2026-09-04, 1,440칸)
 *   실측 변이 B2 회전칸 평균차 15.36%p · >5%p 칸 37.2%
 *   → 문턱은 **그 사이**에 둡니다. 한쪽에 붙이지 않아요. */
const GAP_ROT_MAX = 5.0;      // 회전칸(실제 10~90%) 평균 |화면 − 실제| 상한 (%p)
const GAP_OVER5_MAX = 0.10;   // |화면 − 실제| > 5%p인 칸의 비율 상한
const ROT_MIN = 0.25;         // 🔴 커버리지 — 회전칸이 이보다 적으면 K-1이 포화칸만 재는 셈

/* K-5 — 🛌 벤치 주 회복의 **바닥**. 목표가 아니라 바닥입니다.
 *   실측 기준선 최소 70(= BENCH_COND[0]) · 변이 [4,10]에서 20 → 문턱은 그 사이 */
const REST_FLOOR = 50;

/* K-6 — 🩺 컨디션 손잡이의 밴드.
 *   실측 기준선 비포화칸 평균 Δ 36.1%p (칸별 1σ 23.3 · 평균의 오차 ±1.2%p)
 *   실측 변이 DEAD(손잡이 죽음) 4.2%p · 변이 HUGE(옛 버그 모양) 52.9%p
 *   → 하한 18(기준선 여유 18.1 · 변이 여유 13.8) · 상한 45(기준선 여유 8.9 · 변이 여유 7.9)
 *   🔴 **상한이 있는 이유**: 예전에 컨디션 하나가 당락을 다 정했습니다(실력 1위인데 컨디션 34면 23%).
 *      실력이 순번만 매기는 세계로 되돌아가면 여기가 웁니다. */
const COND_LO = 18;
const COND_HI = 45;
const COND_UNSAT_MIN = 0.60;  // 🔴 커버리지 — 포화칸만 남으면 손잡이가 안 보입니다

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * 🔒 **계수를 정규식에 안 베낍니다** (`\d+`). 값이 바뀌어도 변이가 안 죽어요 —
 *    2026-09-03에 인자가 하나 늘면서 옛 정규식이 죽은 자리와 같은 형태입니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **B-1 되돌리기 — `myLine`의 순번만 `str` 순으로.**
   *    `startingXIOf`의 같은 줄과 헷갈리지 않게 **`x.pos === S.pos`**로 못박습니다
   *    (다른 팀 쪽은 `x.pos === p`예요). */
  B1_RANK_STR: { "squad.js": [[/const line = sq\.filter\(\(x\) => x\.pos === S\.pos\)\.sort\(\(a, b\) => pickWeight\(b\) - pickWeight\(a\)\);/,
    "const line = sq.filter((x) => x.pos === S.pos).sort((a, b) => b.str - a.str);"]] },
  /* 🔴 **B-2 되돌리기 — `myLine`의 굴림 무게만 `str`로.** 확률이 최대 87.2%p 틀립니다 */
  B2_ODDS_STR: { "squad.js": [[/\{ x, v: pickWeight\(x\) \+ \(nextU\(\) \* 2 - 1\) \* FORM_SWING/,
    "{ x, v: x.str + (nextU() * 2 - 1) * FORM_SWING"]] },
  /* 🔴 🛌 벤치 주 회복을 옛 폭(+4~10)으로 — 한 번 바닥나면 계속 벤치인 늪이 됩니다 */
  BENCH_LOW: { "squad.js": [[/const BENCH_COND = \[\d+, \d+\];/, "const BENCH_COND = [4, 10];"]] },
  /* 🔴 🛌 `Math.max`를 지움 — 컨디션 95인데 쉬었다고 72가 됩니다 */
  BENCH_NOMAX: { "squad.js": [[/S\.condition = clamp\(Math\.max\(S\.condition, randInt\(BENCH_COND\[0\], BENCH_COND\[1\]\)\), 0, 100\);/,
    "S.condition = clamp(randInt(BENCH_COND[0], BENCH_COND[1]), 0, 100);"]] },
  /* 🔴 🩺 컨디션 손잡이를 죽임 — 쉬는 데 이유가 없어집니다 */
  COND_DEAD: { "squad.js": [[/const COND_MID = \d+, COND_DIV = \d+, COND_CAP = \d+;/,
    "const COND_MID = 60, COND_DIV = 10, COND_CAP = 0;"]] },
  /* 🔴 🩺 **옛 버그 모양** — 컨디션 하나가 당락을 다 정하던 폭((컨디션−70)/6, −11.7~+5) */
  COND_HUGE: { "squad.js": [[/const COND_MID = \d+, COND_DIV = \d+, COND_CAP = \d+;/,
    "const COND_MID = 70, COND_DIV = 6, COND_CAP = 12;"]] },
};

/* ══════════════════════════════════════════════════════════════
 * 🔎 0. 변이 정규식이 지금 소스에 걸리나 — 다른 무엇보다 먼저
 * ══════════════════════════════════════════════════════════════ */
{
  const bad = pageMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `K-0. 변이 정규식 ${n}개가 지금 beta/winger2/에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}
const mutDead = (name) => pageMutsOK({ [name]: MUT[name] }).length > 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — 📀 **디스크의 세이브를 「이어하기」로 엽니다**
 *
 * 🔴 처음부터 만들면 데뷔까지 학교 아크 8장을 지나야 해서 칸 하나에 몇 초씩 듭니다.
 *    여기서 재는 건 **프로 선발 경쟁**이라 데뷔 뒤 상태면 충분해요 —
 *    `prospect-test.js`의 `openSave`와 **같은 길**입니다.
 * ⚠️ 세이브를 열고 나서 `S`를 직접 옮깁니다(포지션·나이·컨디션·능력치). 그건
 *    **화면을 우회하는 게 아니라** 격자를 밟는 거예요 — 재는 두 값(`myLine`·`rollLineup`)은
 *    둘 다 그 `S`를 그대로 읽습니다.
 * ══════════════════════════════════════════════════════════════ */
const FX = (() => {
  const src = fs.readFileSync("/workspace/grow-games/beta/_fixtures.js", "utf8");
  const m = src.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
  const F = m ? new Function(`return ${m[1]};`)() : null;   // 🔒 직접 eval 안 씁니다
  return F && F.items.find((x) => x.id === "winger2-match");
})();
if (!FX) { console.log("💥 winger2 확인용 세이브를 못 찾았어요 (beta/_fixtures.js)"); process.exit(2); }

function openSave(muts, seed) {
  const W = bootPage({ keys: FX.keys, muts: muts || {} });
  W.document.getElementById("btn-continue").click();
  const go = W.document.querySelector(".slot-modal .slot-go");
  if (go) go.click();
  /* 🎲 난수원이 둘이라 **시드를 가릅니다** — 같은 시드를 걸면 lockstep이 나고,
   *    그건 잡음이 아니라 편향이라 표본을 늘려도 안 없어져요 (`seedBoth` 주석). */
  seedBoth(W, seed);
  return W;
}

const POS4 = ["fw", "wg", "mf", "df"];
const AGES = [20, 21, 22, 26];      // 🌱 보너스가 사는 구간(20·21)과 죽은 구간(22·26)을 둘 다
const CONDS = [45, 80];
const DABL = [-6, -3, 0, 3, 6];     // 📊 클럽 전력 대비 내 능력치
const SEEDS = [11, 23, 37];
const ROLLS = 1200;                 // 칸당 굴림. 표준오차 ≤ 1.5%p

/* 그 칸에 나를 세웁니다 — 🎯 자리 · 🏟️ 클럽 · 🎂 나이 · 🩺 컨디션 · 📊 능력치 */
function place(W, club, pos, age, cond, d) {
  const S = W.WingerCareer._t.state();
  S.group = club.name; S.pos = pos; S.age = age; S.condition = cond;
  S.growthType = "norm"; S.peakShift = 0;
  for (const k of Object.keys(S.stats)) S.stats[k] = club.str + d;
  S.squads = null;                  // 그 클럽의 명단을 새로 꾸립니다
  W.WingerSquad.ensureSquads();
  return S;
}
/* ⚽ **실제** — 그 라운드 선발을 진짜로 굴려서 내가 들었는지 셉니다.
 * `xiWeek`를 되돌려야 매번 다시 뽑아요(안 그러면 한 번 정한 게 고정입니다). */
function realRate(W, S, n) {
  const Q = W.WingerSquad;
  let hit = 0;
  for (let i = 0; i < (n || ROLLS); i++) {
    if (S.activity) S.activity.xiWeek = -1;
    Q.rollLineup();
    if (Q.isStarter()) hit += 1;
  }
  return hit / (n || ROLLS);
}

/* ══════════════════════════════════════════════════════════════
 * K-1. 🖥️ **화면에 뜨는 확률이 ⚽ 실제와 같다**
 *
 * 🔴 **절대값(71.8%)으로 굳히지 않습니다** — 계약은 「두 자가 같다」예요.
 *    절대값을 박으면 계수를 고친 날 난이도를 검사 쪽으로 끌고 가게 됩니다.
 * ══════════════════════════════════════════════════════════════ */
function oddsGrid(muts) {
  const rows = [];
  for (const seed of SEEDS) {
    const W = openSave(muts, seed);
    const CT = W.WingerCareer._t;
    const clubs = CT.debutClubs(CT.state());
    for (const club of clubs) for (const pos of POS4) for (const age of AGES)
      for (const c of CONDS) for (const d of DABL) {
        const S = place(W, club, pos, age, c, d);
        const shown = W.WingerSquad.myLine().odds;
        rows.push({ seed, club: club.str, pos, age, c, d, shown, real: realRate(W, S) });
      }
    W.close();
  }
  return rows;
}
function oddsStat(rows) {
  const gap = rows.map((r) => Math.abs(r.shown - r.real) * 100);
  const rot = rows.filter((r) => r.real > 0.10 && r.real < 0.90);
  const rg = rot.map((r) => Math.abs(r.shown - r.real) * 100);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const worst = rows.reduce((a, b) => (Math.abs(a.shown - a.real) > Math.abs(b.shown - b.real) ? a : b));
  return { n: rows.length, mean: mean(gap), rotN: rot.length, rotShare: rot.length / rows.length,
    rotMean: mean(rg), over5: gap.filter((v) => v > 5).length / gap.length,
    max: Math.max(...gap), worst };
}
const showWorst = (w) => `${w.pos}/전력 ${w.club}/Δ${w.d >= 0 ? "+" : ""}${w.d}/${w.age}세/컨디션 ${w.c}`
  + ` — 화면 ${(w.shown * 100).toFixed(1)}% ↔ 실제 ${(w.real * 100).toFixed(1)}%`;

console.log("\n── 🖥️ K-1. 화면에 뜨는 선발 확률 = 실제 선발률 ──");
const BASE = oddsStat(oddsGrid(null));
console.log(`   격자 ${BASE.n}칸 (자리 4 × 클럽 3 × 나이 4 × 컨디션 2 × Δ능력 5 × 시드 ${SEEDS.length})`
  + ` · 칸당 ${ROLLS}굴림`);
check(BASE.rotShare >= ROT_MIN,
  `K-1c. 🎯 **회전 구간에 실제로 서 있다** — 실제 선발률이 10~90%인 칸 ${BASE.rotN}개`
  + ` (전체의 ${(BASE.rotShare * 100).toFixed(0)}% ≥ ${(ROT_MIN * 100).toFixed(0)}%)`
  + (BASE.rotShare >= ROT_MIN ? "" :
    `\n     🔴 **0%·100% 칸만 남았습니다** — 거기서는 화면과 실제가 공짜로 같아요.`
    + ` K-1a/K-1b가 아무것도 안 지킵니다. Δ능력 축을 좁히세요`));
check(BASE.rotMean <= GAP_ROT_MAX,
  `K-1a. 🖥️ 회전칸 평균 |화면 − 실제| = **${BASE.rotMean.toFixed(2)}%p** ≤ ${GAP_ROT_MAX}%p`
  + `\n     (전체 ${BASE.n}칸 평균 ${BASE.mean.toFixed(2)}%p · 최대 ${BASE.max.toFixed(1)}%p)`
  + (BASE.rotMean <= GAP_ROT_MAX ? "" :
    `\n     🔴 가장 어긋난 칸: ${showWorst(BASE.worst)}`
    + `\n     👉 \`myLine()\`이 \`rollLineup()\`과 **다른 자**를 보고 있어요 — squad.js의 \`pickWeight\`를 대조하세요`));
check(BASE.over5 <= GAP_OVER5_MAX,
  `K-1b. 🖥️ |화면 − 실제| > 5%p인 칸이 **${(BASE.over5 * 100).toFixed(1)}%** ≤ ${(GAP_OVER5_MAX * 100).toFixed(0)}%`
  + (BASE.over5 <= GAP_OVER5_MAX ? "" : `\n     🔴 가장 어긋난 칸: ${showWorst(BASE.worst)}`));

/* ══════════════════════════════════════════════════════════════
 * K-2. 🔢 **화면의 순번이 🥇 실제 선발을 뽑는 자와 같다**
 *
 * 🔑 **K-1로는 이걸 절대 못 잡습니다.** `myLine`의 `line` 순서는 굴림 안에서 다시
 *    정렬되므로 **확률에 안 닿아요** — 실측으로 B-1만 되돌려도 평균차가
 *    0.72 → 0.73%p로 **꿈쩍도 안 합니다**(아래 K-3이 그 증거를 찍습니다).
 *    그래서 「한 벌」이에요: 확률은 K-1이, 순번은 K-2가 각각 잡습니다.
 *
 * 🔬 **자기 자신과 비교하지 않습니다.** 순번의 정답은 `pickWeight`를 다시 계산해 만든 게
 *    아니라, **다른 팀 선발을 뽑을 때 쓰는 그 함수**(`startingXIOf`)가 실제로 뽑은 사람입니다.
 *    경계면 교차 비교예요 — 생산자(`startingXIOf`) ↔ 소비자(`myLine`).
 * ══════════════════════════════════════════════════════════════ */
function rankGrid(muts) {
  let n = 0, bad = 0, badRank = 0, flip = 0;
  const worst = [];
  for (const seed of SEEDS) {
    const W = openSave(muts, seed);
    const Q = W.WingerSquad, CT = W.WingerCareer._t;
    for (const club of CT.debutClubs(CT.state())) for (const pos of POS4)
      for (const age of AGES) for (const d of DABL) {
        const S = place(W, club, pos, age, 70, d);
        const L = Q.myLine();
        const mine = L.line.slice(0, L.slots).map((x) => x.name);
        const real = Q.startingXIOf(S.group).filter((x) => x.pos === pos).map((x) => x.name);
        n += 1;
        const same = mine.length === real.length && mine.every((k) => real.indexOf(k) >= 0);
        if (!same) { bad += 1; if (worst.length < 3) worst.push(`${pos}/전력 ${club.str}/Δ${d}/${age}세 — 화면 [${mine.join(",")}] ↔ 실제 [${real.join(",")}]`); }
        if ((L.rank <= L.slots) !== (real.indexOf(S.name) >= 0)) badRank += 1;
        /* 🎯 커버리지 — 🌱 나이 보너스가 **실제로 순번을 뒤집는** 칸인가.
         *    이게 0이면 `str` 순이든 `pickWeight` 순이든 같은 답이라 K-2가 공짜 초록불이에요. */
        const byStr = L.line.slice().sort((a, b) => b.str - a.str).slice(0, L.slots).map((x) => x.name).join("|");
        if (byStr !== mine.join("|")) flip += 1;
      }
    W.close();
  }
  return { n, bad, badRank, flip, worst };
}
console.log("\n── 🔢 K-2. 화면의 순번 = 실제 선발을 뽑는 자 ──");
const R2 = rankGrid(null);
check(R2.flip / R2.n >= 0.10,
  `K-2c. 🎯 **🌱 나이 보너스가 순번을 실제로 뒤집는 칸이 있다** — ${R2.flip}/${R2.n}칸`
  + ` (${(R2.flip / R2.n * 100).toFixed(0)}%)`
  + (R2.flip / R2.n >= 0.10 ? "" :
    `\n     🔴 **\`str\` 순과 \`pickWeight\` 순이 어느 칸에서도 안 갈립니다** — K-2a/K-2b가 공짜 초록불이에요`
    + `\n     👉 🌱 YOUTH_BONUS가 폐기됐다면 이 파일의 「세계」부터 다시 읽으세요`));
check(R2.bad === 0,
  `K-2a. 🔢 화면이 세우는 선발권 명단 = \`startingXIOf\`가 실제로 뽑은 선발 — 어긋난 칸 **${R2.bad}/${R2.n}**`
  + (R2.bad === 0 ? "" : `\n     🔴 ${R2.worst.join("\n     🔴 ")}`
    + `\n     👉 화면(\`myLine\`)과 선발(\`startingXIOf\`)이 **다른 무게**를 보고 있어요`));
check(R2.badRank === 0,
  `K-2b. 🗣️ 「내가 선발권인가」가 두 자에서 같다 — 어긋난 칸 **${R2.badRank}/${R2.n}**`
  + `\n     👉 여기가 갈리면 \`benchReason\`의 갈래(\`COACH_FAR\`/\`COACH_NEAR\`)까지 틀립니다`);

/* ══════════════════════════════════════════════════════════════
 * K-3. 🧪 **변이 감도 — 둘 중 하나만 되돌려도 빨간불** (🔒 한 벌)
 *
 * 🔴 **기준선이 초록불인지 먼저 봅니다.** 이미 빨간불인 검사는 남의 변이 신호까지 먹어요.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 K-3. 변이 감도 (🔒 한 벌) ──");
const baseGreen = BASE.rotMean <= GAP_ROT_MAX && BASE.over5 <= GAP_OVER5_MAX && R2.bad === 0 && R2.badRank === 0;
check(baseGreen,
  `K-3-0. 🚦 **변이를 걸기 전에 기준선이 초록불이다** (K-1a ${BASE.rotMean.toFixed(2)}%p · K-1b ${(BASE.over5 * 100).toFixed(1)}% · K-2a ${R2.bad} · K-2b ${R2.badRank})`
  + (baseGreen ? "" : `\n     🔴 기준선이 이미 빨간불이라 **아래 변이 결과는 못 믿습니다** — 여기부터 고치세요`));

if (mutDead("B1_RANK_STR")) check(false, `K-3a. 🧪 **변이 B-1 — 🔢 순번만 \`str\` 순으로 되돌림**${MUT_DEAD}`);
else {
  const m2 = rankGrid(MUT.B1_RANK_STR);
  check(m2.bad > 0 && m2.badRank > 0,
    `K-3a. 🧪 **변이 B-1 — 🔢 순번만 \`str\` 순으로** → K-2가 빨간불`
    + ` (어긋난 칸 ${m2.bad}/${m2.n} · 선발권 판정 ${m2.badRank}/${m2.n})`
    + (m2.bad > 0 ? "" : `\n     🔴 되돌렸는데 K-2가 초록불이에요 — K-2가 아무것도 안 지킵니다`));
  /* 🔎 **B-1이 K-1에는 안 잡힌다는 물증** — 이게 「한 벌」이어야 하는 이유예요.
   *    판정에 안 씁니다(note). 값이 아니라 **왜 둘로 갈랐는지**를 남기는 자리입니다. */
  const s1 = oddsStat(oddsGrid(MUT.B1_RANK_STR));
  note(`K-3a-곁. B-1만 되돌리면 K-1은 **꿈쩍도 안 합니다** — 회전칸 평균차 ${BASE.rotMean.toFixed(2)} → ${s1.rotMean.toFixed(2)}%p`
    + `\n        👉 순번은 굴림 안에서 다시 정렬되어 **확률에 안 닿아요.** 그래서 K-2가 따로 있습니다`);
}
if (mutDead("B2_ODDS_STR")) check(false, `K-3b. 🧪 **변이 B-2 — 🖥️ 굴림 무게만 \`str\`로 되돌림**${MUT_DEAD}`);
else {
  const s2 = oddsStat(oddsGrid(MUT.B2_ODDS_STR));
  check(s2.rotMean > GAP_ROT_MAX && s2.over5 > GAP_OVER5_MAX,
    `K-3b. 🧪 **변이 B-2 — 🖥️ 굴림 무게만 \`str\`로** → K-1이 빨간불`
    + ` (회전칸 평균차 ${BASE.rotMean.toFixed(2)} → **${s2.rotMean.toFixed(2)}%p** · >5%p 칸 ${(BASE.over5 * 100).toFixed(1)} → **${(s2.over5 * 100).toFixed(1)}%** · 최대 ${s2.max.toFixed(1)}%p)`
    + `\n     🔎 가장 어긋난 칸: ${showWorst(s2.worst)}`
    + (s2.rotMean > GAP_ROT_MAX ? "" : `\n     🔴 되돌렸는데 K-1이 초록불이에요 — K-1이 아무것도 안 지킵니다`));
  const r2 = rankGrid(MUT.B2_ODDS_STR);
  note(`K-3b-곁. 반대로 B-2만 되돌리면 **K-2는 그대로 초록불**입니다 (어긋난 칸 ${r2.bad}/${r2.n})`
    + `\n        👉 🔒 **한 벌인 이유**: B-2만 넣으면 확률은 맞지만 순번·감독 대사가 계속 틀리고,`
    + ` B-1만 넣으면 순번만 맞고 확률이 87.2%p 틀립니다`);
}

/* ══════════════════════════════════════════════════════════════
 * K-5. 🛌 **벤치 주 회복 — 회전을 만드는 음의 되먹임**
 *
 * balancer 138번: *"회전을 실제로 만드는 건 🛌 벤치 주 회복 [70,100]이라는 음의 되먹임이에요.
 * 밀리면 몸이 돌아오고 뛰면 깎입니다."* 여기가 죽으면 「매 경기 다시 뽑혀요」가 거짓이 됩니다.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🛌 K-5. 벤치 주 회복 ──");
function benchProbe(muts) {
  const W = openSave(muts, SEEDS[0]);
  const Q = W.WingerSquad, S = W.WingerCareer._t.state();
  Q.ensureSquads();
  const run = (from, n) => {
    const out = [];
    for (let i = 0; i < n; i++) { S.condition = from; Q.benchTurn(); out.push(S.condition); }
    return { min: Math.min(...out), mean: out.reduce((a, b) => a + b, 0) / out.length };
  };
  const lo = run(20, 400), hi = run(95, 400);
  W.close();
  return { lo, hi };
}
{
  const B = benchProbe(null);
  check(B.lo.min >= REST_FLOOR,
    `K-5a. 🛌 컨디션 20에서 한 주 쉬면 **${REST_FLOOR} 이상으로 돌아온다** — 400번 중 최소 ${B.lo.min} · 평균 ${B.lo.mean.toFixed(1)}`
    + `\n     🔒 ${REST_FLOOR}은 **바닥이지 목표가 아닙니다** (지금 실측 바닥은 BENCH_COND[0] = ${B.lo.min})`
    + (B.lo.min >= REST_FLOOR ? "" : `\n     🔴 벤치가 **회복이 아니라 벌**이 됐어요 — 한 번 바닥나면 계속 벤치인 늪입니다`));
  check(B.hi.min >= 95,
    `K-5b. 🛌 컨디션 95에서 쉬어도 **안 내려간다** — 400번 중 최소 ${B.hi.min}`
    + `\n     🔑 값이 아니라 **관계**입니다 (\`Math.max\` — 쉬었는데 몸이 나빠지면 안 돼요)`);

  if (mutDead("BENCH_LOW")) check(false, `K-5-변이①. 🧪 **벤치 회복을 옛 폭(+4~10)으로**${MUT_DEAD}`);
  else {
    const M = benchProbe(MUT.BENCH_LOW);
    check(M.lo.min < REST_FLOOR,
      `K-5-변이①. 🧪 **벤치 회복을 [4,10]으로** → K-5a가 빨간불 (최소 ${M.lo.min} · 평균 ${M.lo.mean.toFixed(1)})`);
  }
  if (mutDead("BENCH_NOMAX")) check(false, `K-5-변이②. 🧪 **\`Math.max\`를 지움**${MUT_DEAD}`);
  else {
    const M = benchProbe(MUT.BENCH_NOMAX);
    check(M.hi.min < 95,
      `K-5-변이②. 🧪 **\`Math.max\`를 지움** → K-5b가 빨간불 (컨디션 95에서 쉬었더니 최소 ${M.hi.min})`);
  }
}

/* ══════════════════════════════════════════════════════════════
 * K-6. 🩺 **컨디션이 실제로 손잡이인가 — 그리고 손잡이「만」은 아닌가**
 *
 * 🔴 **모집단 평균으로 봅니다.** balancer: *"컨디션 20→95가 2%→38%도 시드 1개를 읽은 값"*.
 *    한 칸을 읽으면 답이 몇 배로 갈립니다.
 * 🔴 **밴드가 양쪽입니다.** 아래가 뚫리면 쉬는 데 이유가 없고, 위가 뚫리면
 *    옛 버그(컨디션 하나가 당락을 다 정함)로 돌아갑니다.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🩺 K-6. 컨디션 손잡이 ──");
const COND_ROLLS = 800;
function condGrid(muts) {
  const rows = [];
  for (const seed of [SEEDS[0], SEEDS[1]]) {
    const W = openSave(muts, seed);
    const CT = W.WingerCareer._t;
    for (const club of CT.debutClubs(CT.state())) for (const pos of POS4)
      for (const age of AGES) for (const d of DABL) {
        const S = place(W, club, pos, age, 70, d);
        S.condition = 20; const lo = realRate(W, S, COND_ROLLS);
        S.condition = 95; const hi = realRate(W, S, COND_ROLLS);
        rows.push({ lo, hi, d: hi - lo });
      }
    W.close();
  }
  return rows;
}
function condStat(rows) {
  /* 🎯 **포화칸을 뺍니다** — 양쪽 다 0%거나 양쪽 다 100%면 손잡이가 안 보여요.
   *    거기를 섞으면 평균이 격자 모양에 끌려다닙니다. */
  const un = rows.filter((r) => (r.lo > 0.02 || r.hi > 0.02) && (r.lo < 0.98 || r.hi < 0.98));
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return { n: rows.length, unN: un.length, unShare: un.length / rows.length,
    unMean: mean(un.map((r) => r.d * 100)) };
}
{
  const C = condStat(condGrid(null));
  check(C.unShare >= COND_UNSAT_MIN,
    `K-6c. 🎯 **비포화 칸에서 잰다** — ${C.unN}/${C.n}칸 (${(C.unShare * 100).toFixed(0)}% ≥ ${(COND_UNSAT_MIN * 100).toFixed(0)}%)`
    + (C.unShare >= COND_UNSAT_MIN ? "" : `\n     🔴 격자가 포화됐습니다 — K-6a/K-6b가 손잡이를 못 봐요`));
  check(C.unMean >= COND_LO,
    `K-6a. 🩺 컨디션 20 → 95가 선발률을 **${C.unMean.toFixed(1)}%p** 올린다 (≥ ${COND_LO}%p)`
    + `\n     🔒 **모집단 평균**이에요 — 한 칸으로 읽으면 몇 배로 갈립니다 (balancer 138번)`
    + (C.unMean >= COND_LO ? "" : `\n     🔴 손잡이가 죽었어요 — 🛌 쉬는 데 이유가 없어집니다`));
  check(C.unMean <= COND_HI,
    `K-6b. 🩺 그런데 컨디션「만」으로 당락이 정해지지는 않는다 — ${C.unMean.toFixed(1)}%p ≤ ${COND_HI}%p`
    + `\n     🔴 예전에 실력 1위인데 컨디션 34면 23%였습니다 — 컨디션 하나가 다 정하고 실력은 순번만 매겼어요`);

  if (mutDead("COND_DEAD")) check(false, `K-6-변이①. 🧪 **컨디션 손잡이를 죽임(COND_CAP 0)**${MUT_DEAD}`);
  else {
    const M = condStat(condGrid(MUT.COND_DEAD));
    check(M.unMean < COND_LO,
      `K-6-변이①. 🧪 **COND_CAP을 0으로** → K-6a가 빨간불 (${C.unMean.toFixed(1)} → **${M.unMean.toFixed(1)}%p**)`);
  }
  if (mutDead("COND_HUGE")) check(false, `K-6-변이②. 🧪 **옛 버그 모양((컨디션−70)/6, −11.7~+5)**${MUT_DEAD}`);
  else {
    const M = condStat(condGrid(MUT.COND_HUGE));
    check(M.unMean > COND_HI,
      `K-6-변이②. 🧪 **옛 버그 모양으로 되돌림** → K-6b가 빨간불 (${C.unMean.toFixed(1)} → **${M.unMean.toFixed(1)}%p**)`);
  }
}

console.log(`\n${fail ? `❌ ${fail}건 실패` : "✅ 통과"} — 🪑 화면 확률 = 실제 · 🔢 순번 · 🛌 벤치 회복 · 🩺 컨디션`);
console.log(`🚧 여기서 못 보는 것: 화면에 그 확률이 **어떻게 보이는지**(글자·색·막대)와`
  + ` 사람이 그 숫자를 믿는지 — CSS는 기계가 못 봅니다. 보고서 §검증 불가로 넘겼어요.`);
process.exit(fail ? 1 : 0);
