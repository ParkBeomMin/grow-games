/* 📏 ⚽ 더 윙어 II — **편차 밴드가 게임을 세게도 약하게도 만들지 않는다** (S-1 · S-2 · S-3 · T-4)
 *
 * 🔴 **이 파일의 옛 판(3장 절대 점수)은 2026-09-01에 통째로 옛 계약이 됐습니다.**
 *    `rollOffers`가 **점수**를 받다가 **편차 `d`**를 받게 바뀌었고, 검사가 0~6점을
 *    그대로 넣고 있어 6건이 빨간불이었어요 (`96_engineer_school-stages.md` §5-1).
 *    설계 93번 §10 「버려지는 것」이 *"`rollOffers`의 절대 점수 밴드는 죽습니다"*라고
 *    미리 적어 뒀던 그 자리입니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-09-01 · designer 93번 §5-3·§8-1 · engineer 96번 §6-2 S-1~S-3)
 *
 *   · 🏫 학교는 🧬 조립대 **앞**이라 **모든 플레이어가 정확히 같은 몸**으로 뜁니다
 *     (`WingerProspect.evenStats()`). 능력치도 포지션도 안 탑니다 — T-1b가 그걸 봐요
 *   · 📏 등급을 정하는 것은 점수가 아니라 **편차 `d = 점수 − 뛴 카드 수`**입니다
 *   · 🎲 카드 한 장이 **개별로 평균 1 · 1을 축으로 대칭**이라(⚽🅰️는 2/1/0 각 ⅓,
 *     🧱는 2/0 각 ½), 몇 장을 어떻게 섞든 **N장의 합은 N을 축으로 대칭**이에요.
 *     그래서 `d`는 **N이 몇이든 0을 축으로 대칭**입니다
 *   · 📣 배수 다섯 칸(0.90 / 0.95 / 1.00 / 1.05 / 1.10)과 밴드(`tierOfD`)와
 *     흔들림(0.25 / 0.50 / 0.25)은 **독립된 세 값이 아니라 한 대칭의 세 조각**이에요
 *   · 🔑 **새 밸런스 상수 0개** — `PEER_REF.town` 한 칸이 여덟 판 전부를 봅니다
 *   · 🔗 **그 한 칸은 숫자가 아니라 종속값입니다** (2026-09-01 · engineer 102번 §3) —
 *     `get town()`이 `evenStats()`의 평균을 그대로 따라가요. 그래서 `autoP`가 ⅓·⅓·½이고
 *     **카드 한 장의 기대 점수가 정확히 1점**입니다 (S-3e). 🔴 여기에 숫자를 적으면
 *     그 순간 「거의」로 돌아가고, 카드가 늘수록 `E[d]`가 위로 샙니다
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들 — 값을 고치기 전에 이 파일을 먼저 여세요**
 *   · 「학교가 능력치를 타야 한다」는 판정이 나오면 **T-1b가 통째로 옛 계약**이 됩니다
 *   · 「편차 말고 절대 점수로 돌아가자」는 판정이 나오면 **S-3의 N 무관성이 옛 계약**이에요
 *   · 「🧬 조립대를 학교 앞으로 옮기자」는 판정이 나오면 **S-3e의 등식이 통째로 옛 계약**입니다 —
 *     개인차가 생기는 순간 「전원 같은 몸」이 깨져서 한 장의 기대 점수가 1이 아니게 돼요
 *   · ✅ **`BAND_EDGE = ±2 / ±4`가 2026-09-01에 확정됐습니다** (designer · 96번 ⓐ ·
 *     「밴드만(SHAKE 전)」으로 재서 극단 등급이 목표를 넘김).
 *     🔒 **그래도 이 파일의 뼈대는 여전히 경계값이 아니라 「대칭」입니다** — 확정됐다고
 *     경계를 검사에 박지 마세요. 나중에 ±3/±6으로 옮겨져도 S-1·S-2·S-3은 **그대로 살아요.**
 *     🔑 값을 박는 순간 이 파일은 「경계가 바뀌면 통째로 빨간불이 되는 검사」가 됩니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔑 **왜 「구조」와 「값」을 따로 재는가** — 이번 라운드가 숫자로 보여 줬습니다
 * ─────────────────────────────────────────────────────────────────────────
 * engineer가 밴드의 **0축 대칭 한 칸만** 깨뜨렸을 때 (96번 §6-1 M-2):
 *
 *     E[spotMul] = **0.99915**   →  ±0.5% 문턱 검사는 **초록불**입니다 (0.085%p)
 *
 * 🔴 **값으로 재는 검사는 이 사고를 절대 못 잡습니다.** 그래서 S-1은 통계가 아니라
 *    **`tierOfD(d) + tierOfD(−d) === 4`라는 항등식**을 봅니다 — 한 칸만 어긋나도
 *    그 자리에서 빨간불이에요. 🔑 「종속값은 관계식으로」가 여기서 유일한 방어입니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(±0.5% · 0.90 · 1.10 · ±2% · 합 4)은 여기 박습니다.** `_t.OFFER`·`_t.SHAKE`·
 *      `_t.BAND_EDGE`·`_t.NEUTRAL_TIER`에서 읽어 오면 **표를 통째로 갈아도 검사가 따라가요**
 *   ③ **산식은 게임의 함수를 그대로 부릅니다** — `_t.tierOfD` · `_t.rollOffers` ·
 *      `_t.judgeFor` · `_t.PTS` · `_t.deal` · `_t.STAGES`. 점수 산식을 베껴 적지 않아요
 *   ④ **시드 하나로 안 잽니다** — 시드 다섯으로 재고, 시드마다 따로 찍습니다
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인합니다 (안 걸리면 ❌ 한 줄, 죽지 않아요)
 *      그리고 **변이 검증 전에 기준선이 초록불인지** 먼저 찍습니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 📏 왜 ±0.5%인가 — 기준선과 변이 사이의 여유를 먼저 쟀습니다
 * ─────────────────────────────────────────────────────────────────────────
 *   기준선(시드 5 × 20,000판 · N=2/5/8)   벗어남 ≤ **0.04%**  ← 🎉 고침 전 0.12%
 *   시드 간 1σ                              ≈ 0.02%     → ±0.5%는 약 **25σ**
 *   🔒 **그래도 ±0.5%를 조이지 않습니다** — M-S1(−0.085%)을 문턱으로 잡으려 들면
 *      S-1(항등식)이 왜 있는지가 흐려지고, 잡음에도 흔들리기 시작해요
 *   🧪 M-S1B 밴드 경계를 비대칭으로          −1.1%       → 문턱의 2배
 *   🧪 M-C2  흔들림을 0.10/0.50/0.40         +1.5%       → 문턱의 3배
 *   🔴 🧪 M-S1 밴드 대칭 한 칸만 깨기        **−0.085%** → **문턱 안** (S-1이 잡습니다)
 *
 *   문턱이 기준선(0.12%)과 변이(1.1%) **사이**에 있고 양쪽에 안 붙어 있습니다.
 *   🚨 조이지 마세요 — 0.2%로 조이면 시드 잡음이 검사를 흔듭니다.
 *   🚨 풀지도 마세요 — 1.0%로 풀면 M-S1B가 그대로 지나갑니다.
 *   🔑 **그리고 아무리 잘 잡아도 M-S1은 문턱으로 못 잡아요.** 그게 S-1이 있는 이유입니다.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 * ⏱️ 약 10초 걸려요 (2026-09-01 실측 8.9~9.3초 — 옛 주석의 「2분」은 옛 판 기준이었어요).
 */
"use strict";
const { bootPage, pageMutsOK, SRC } = require("./_load.js");   // SRC = engine.js 소스 (산식을 뜯어옵니다)

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const NEUTRAL = 1.000;      // 🎯 학교를 얹어도 기댓값이 안 움직인다
const EPS = 0.005;          // ±0.5% (위 표 참고 — 조이지도 풀지도 마세요)
const FLOOR = 0.90;         // 🔒 바닥 (「주목 배수 하한」이지 「학교 페널티」가 아니에요)
const CEIL = 1.10;          // 🔒 천장
const STEP = 0.05;          // 📣 칸 사이 간격 — 등간격이라야 대칭이 배수까지 내려옵니다
const N_TIER = 5;           // 📣 등급 다섯 칸 (☆ ~ ⭐⭐⭐⭐)
const MID_TIER = 2;         // 📣 중립 칸 = ⭐⭐ 입단 제안
const TIER_SUM = 4;         // 🔑 **`tierOfD(d) + tierOfD(−d)`의 값** (= 2 × 중립 칸)
const SYM_EPS = 0.02;       // 🎲 흔들림 좌우 대칭 — ±2% (기준선 0.4% · 3배 안 붙음)
/* ══════════════════════════════════════════════════════════════════════
 * 📊 **`d` 분포의 좌우 차이** — 🎉 2026-09-01에 **±6% → ±1%로 조였습니다**
 * ══════════════════════════════════════════════════════════════════════
 * ±6%였던 까닭은 기준선이 **1.9%**였기 때문이에요 — `PEER_REF.town`이 32.0으로 박혀 있어
 * 카드 한 장이 평균 1.005~1.010점이었고, 그게 분포를 통째로 오른쪽으로 밀었습니다.
 * `town`이 종속값이 되면서 그 밀림이 사라졌어요.
 *
 * 📏 **조이기 전에 1σ부터 쟀습니다** (5시드 × 20,000판 = 100,000판을 한 묶음으로 · 묶음 6벌):
 *     기준선          평균 **0.145%** · 1σ 0.090% · 최대 0.244%
 *     🧪 M-REF-CONST  평균 **1.836%** · 1σ 0.192% · 최소 1.585%
 *   → ±1%는 기준선에서 **+9.5σ**, 변이에서 **−4.4σ**. 양쪽 어디에도 안 붙어 있습니다.
 * 🚨 **±2%로 조이지 마세요** — 변이의 최대가 **2.078%**라 시드에 따라 그냥 지나갑니다
 *    (102번 §3의 *"±2%로 조이라"*는 실측 전에 적힌 줄이에요. 재 보니 아니었습니다). */
const SYM_EPS_D = 0.01;
/* ══════════════════════════════════════════════════════════════════════
 * 📏 **카드당 중립 드리프트** — 🎉 「알려진 미달(🚧)」에서 **계약으로 승격**했습니다
 * ══════════════════════════════════════════════════════════════════════
 * 2026-09-01 이전에는 `PEER_REF.town = 32.0` ↔ `evenStats()` 평균 32.333의 불일치로
 * 카드당 **+0.0077점**이 위로 샜고, 이 자리는 상한 0.02의 🚧였어요.
 * `get town()`이 종속값이 되면서 해소됐고, **양방향 「승격하세요」가 갈렸습니다.**
 *
 * 📏 **문턱을 새 실측 옆에 안 붙였습니다** (100,000판 한 묶음 · 묶음 6벌 · N=8):
 *     기준선          평균 **+0.000053** · 1σ 0.000829 · 최대|·| 0.001415
 *     🧪 M-REF-CONST  평균 **+0.007121** · 1σ 0.000777 · 최소 +0.005726
 *   → 0.003은 기준선에서 **+3.6σ**, 변이에서 **−5.3σ**. 사이에 있고 한쪽에 안 붙었어요.
 * 🚨 0.001로 조이면 잡음이 검사를 흔듭니다. 0.006으로 풀면 변이가 지나가요. */
const DRIFT_EPS = 0.003;
/* 🎯 **카드 한 장의 중립 기대 점수.** 🔑 이건 실측값이 아니라 **설계의 정의**예요 —
 *    `d = 점수 − 뛴 카드 수`가 0을 축으로 대칭이려면 한 장이 **정확히 1점**이라야 합니다.
 *    🔴 그래서 문턱이 아니라 **등식**입니다. 아래 S-3e가 배정도로 견줘요. */
const CARD_E = 1;
const EXACT = 1e-12;        // 배정도 견줌의 허용 오차 (실측 차는 정확히 0이었습니다)
const D_SWEEP = 40;         // 📏 `d`를 이만큼 훑습니다 (실제 범위 ±8보다 훨씬 넓게)
const D_DOMAIN = 12;        // 🔒 배수 상·하한을 볼 `d` 구간 (±8 + 여유)
const ARC_N = [2, 5, 8];    // 🏫 초등만 · 초+중 · 초+중+고 — **어느 시점에서도** 중립
const N = 20000;            // 시드당 판수
const SEEDS = [11, 23, 37, 41, 59];   // 🎲 시드 하나로 안 잽니다
const POSES = ["fw", "wg", "mf", "df"];

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴🔑 **M-S1 — 밴드의 0축 대칭을 「한 칸만」 깹니다.** 이번 라운드의 핵심이에요.
   *    `d = +4`가 ⭐⭐⭐⭐ 대신 ⭐⭐⭐가 되어 위쪽만 한 칸 좁아집니다.
   *    🔴 **E[spotMul]이 0.99915** — ±0.5% 문턱 검사는 **초록불로 통과합니다.**
   *    S-1(항등식)만 잡아요. 값으로 재는 검사가 왜 부족한지의 증거입니다. */
  M_S1_ASYM: { "town.js": [[/if \(d < BAND_EDGE\[3\]\) return 3;/, "if (d < BAND_EDGE[3] + 1) return 3;"]] },
  /* 🔴 **M-S1B — 경계 배열 자체를 비대칭으로**(`[-4, -2, 1, 4]`).
   *    이건 폭이 커서 S-1도 S-3도 잡습니다 — **S-3이 아직 해상도를 갖고 있다는 증거**예요
   *    (S-1이 다 잡아 주니 S-3은 필요 없다, 가 아닙니다). */
  M_S1B_EDGE: { "town.js": [[/const BAND_EDGE = \[-4, -2, 2, 4\];/, "const BAND_EDGE = [-4, -2, 1, 4];"]] },
  /* 🔴 **M-S2 — 바닥을 0.80으로.** *"못했으면 더 아프게"* 는 언제든 오는 압박이고,
   *    그 순간 회복 경로가 사라집니다(= 처벌의 정의 · 설계 85번 §3-3 ①). */
  M_S2_FLOOR: { "town.js": [[/\{ mul: 0\.90, star: "☆"/, '{ mul: 0.80, star: "☆"']] },
  /* 🔴 **M-C2 — 흔들림을 한쪽만 키웁니다.** 좌우 대칭이라 기댓값을 안 움직이는 게
   *    ±1칸의 계약인데, 한쪽만 키우면 그건 흔들림이 아니라 **난이도 조정**이에요. */
  M_C2_SHAKE: { "town.js": [[/\[\[-1, 0\.25\], \[0, 0\.50\], \[1, 0\.25\]\]/, "[[-1, 0.10], [0, 0.50], [1, 0.40]]"]] },
  /* 🎯🔴 **M-REF-CONST — `PEER_REF.town`을 다시 「숫자」로 되돌립니다** (종속값 → 상수 32.0).
   *
   * ⚠️ **이 변이는 2026-09-01에 방향이 뒤집혔습니다.** 옛 판은 `town: 32.0` 줄을
   *    32.333으로 **고치는** 변이(M-REF-FIX)였어요 — 「미달이 해소되면 S-3e가 갈리는가」를
   *    재는 자리였죠. 그 고침이 실제로 들어오면서 **겨눌 것이 없어졌고**, 정규식도
   *    소스에 안 걸리게 됐습니다(0번이 잡았어요).
   * ★ 이제 겨누는 것은 반대쪽입니다 — **누가 이 칸에 숫자를 다시 적으면 잡히는가.**
   *    `game.js`의 `get town()` 주석이 *"여기에 숫자를 적지 마세요"*라고 적어 둔 그 사고예요.
   * 🔒 **getter의 껍데기는 그대로 두고 돌려주는 값만** 32.0으로 바꿉니다 —
   *    `evenStats()`는 여전히 불려서 **난수 소비량이 안 바뀝니다.** 변이가 재려던 것
   *    말고 다른 것까지 흔들면 그건 신호가 아니라 잡음이에요. */
  M_REF_CONST: { "game.js": [[
    /return ks\.length \? ks\.reduce\(\(a, k\) => a \+ st\[k\], 0\) \/ ks\.length : 0;/,
    "return 32.0;"]] },
  /* 🔴 **M-G — `clamp`를 빼고 흔들림을 ±2로.** 표 밖 칸을 집어 배수가 사라집니다.
   *    (옛 판에서 `base + d`였던 줄이 `base + sh`로 이름이 바뀌었어요 — 96번 §5-1) */
  M_G_NOCLAMP: { "town.js": [
    [/const tier = clamp\(base \+ sh, 0, OFFER\.length - 1\);/, "const tier = base + sh;"],
    [/\[\[-1, 0\.25\], \[0, 0\.50\], \[1, 0\.25\]\]/, "[[-2, 0.25], [0, 0.50], [2, 0.25]]"],
  ] },
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

/* ── 🎲 시드를 박습니다. 엔진은 로드 시점에 `Math.random`을 잡아 두므로
 *    (`let _rng = Math.random;`) **`_t.seed()`를 반드시 불러야** 판정이 재현돼요.
 *    페이지의 `Math.random`만 갈면 `rollOffers`·`deal`만 걸리고 판정은 안 걸립니다. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 🏫 학교 아크를 **게임의 함수 그대로** 굴립니다 — 점수 산식을 베끼지 않아요.
 *   · `_t.STAGES` × `_t.deal(stage)`      = 게임이 뽑는 **그 덱**(초등 2 · 중등 3 · 고등 3)
 *   · `_t.judgeFor(key, {pos}).judge(0.5)` = 자동 진행이 부르는 **그 갈래**(중립 조작)
 *   · `_t.PTS[판정]`                       = 게임이 점수를 매기는 **그 표**
 *   · `_t.rollOffers(d)`                   = 5곳이 손을 드는 **그 함수**
 * 🔴 `_t.OFFER`·`_t.SHAKE`·`_t.BAND_EDGE`는 **문턱으로 안 읽습니다** — 그게 검사 대상이라서요. */
function harness(muts) {
  const W = bootPage({ muts });
  const T = W.WingerTown, E = W.WingerEngine;
  if (!T || !T._t || !E || !E._t) { W.close(); throw new Error("WingerTown._t / WingerEngine._t 창구가 없어요"); }
  const MK = W.__get("MARKETS");
  return {
    W, T, MK,
    seed: (s) => { E._t.seed(s); W.Math.random = mulberry32((s ^ 0x9e3779b9) >>> 0); },
    /* 🏫 앞에서부터 `upto`단계까지 굴려 { 점수, 카드수 }를 냅니다.
     * 🔑 초등은 게임과 똑같이 `_t.ELEM_POS`를 씁니다 — 자리를 아직 안 골랐으니까요. */
    arc: (upto, pos) => {
      let sc = 0, n = 0;
      for (let s = 0; s < upto; s++) {
        const stage = T._t.STAGES[s];
        const deck = T._t.deal(stage);
        const p = stage.id === "e" ? T._t.ELEM_POS : pos;
        for (const c of deck) {
          sc += T._t.PTS[T._t.judgeFor(c.key, { pos: p }).judge(0.5)] || 0;
          n += 1;
        }
      }
      return { score: sc, n, d: sc - n };
    },
    close: () => W.close(),
  };
}

const H = harness(null);

/* ══════════════════════════════════════════════════════════════════════
 * 🔑 S-1. 📏 **밴드가 0을 축으로 대칭이다** — 구조로 잽니다 (통계로는 못 잡아요)
 * ══════════════════════════════════════════════════════════════════════ */
console.log("── 🔑 S-1. 밴드가 0축 대칭 (구조) ──");
{
  const tier = H.T._t.tierOfD;
  const bad = [];
  for (let d = -D_SWEEP; d <= D_SWEEP; d++) {
    const s = tier(d) + tier(-d);
    if (s !== TIER_SUM) bad.push(`d=${d}: ${tier(d)}+${tier(-d)}=${s}`);
  }
  check(typeof tier === "function" && bad.length === 0,
    `S-1. 🔑 **모든 \`d\`에서 \`tierOfD(d) + tierOfD(−d) === ${TIER_SUM}\`** (d = −${D_SWEEP} ~ +${D_SWEEP} · ${D_SWEEP * 2 + 1}칸)`
    + `\n     ${[-6, -4, -2, -1, 0, 1, 2, 4, 6].map((d) => `${d >= 0 ? "+" : ""}${d}→${tier(d)}`).join(" · ")}`
    + (bad.length
      ? `\n     🔴 **깨진 자리 ${bad.length}칸**: ${bad.slice(0, 6).join(" · ")}${bad.length > 6 ? " …" : ""}`
        + `\n     🔑 이게 깨져도 E[spotMul]은 문턱 안에 남을 수 있습니다(0.99915) — **S-3으로는 못 잡아요**`
      : `\n     🔑 대칭이면 **E[등급] = 중립이 실측이 아니라 정의로** 성립합니다`));

  /* 📊 **측정 조건을 검사가 스스로 찍습니다.** 🔴 이게 없으면 S-1은 껍데기예요 —
   *    `tierOfD`가 **늘 2를 돌려줘도** 합은 4라서 초록불입니다. 밴드가 진짜 밴드인지
   *    (단조 증가 · 다섯 칸이 전부 나옴 · 0은 중립 칸) 여기서 봅니다. */
  const seen = new Set();
  let mono = true;
  for (let d = -D_SWEEP; d < D_SWEEP; d++) {
    seen.add(tier(d));
    if (tier(d + 1) < tier(d)) mono = false;
  }
  seen.add(tier(D_SWEEP));
  const ok = mono && seen.size === N_TIER && tier(0) === MID_TIER
    && tier(-D_SWEEP) === 0 && tier(D_SWEEP) === N_TIER - 1;
  check(ok,
    `S-1a. 📊 그 밴드가 **진짜 밴드다** — \`d\`에 대해 단조 증가하고 ${N_TIER}칸이 전부 나오며 \`tierOfD(0) === ${MID_TIER}\``
    + `\n     단조 ${mono ? "✔" : "🔴"} · 나온 칸 ${Array.from(seen).sort().join("/")} (${seen.size}개) · d=0 → ${tier(0)}`
    + `\n     🔑 **이 줄이 없으면 S-1은 아무것도 안 지킵니다** — 늘 ${MID_TIER}만 돌려줘도 합은 ${TIER_SUM}이거든요`);
}

/* ══════════════════════════════════════════════════════════════════════
 * S-2. 📣 **배수 표가 등간격 대칭이다** — 대칭이 배수까지 내려와야 중립이 됩니다
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 📣 S-2. 배수 표가 등간격 대칭 ──");
{
  const O = H.T._t.OFFER;
  const muls = (O || []).map((o) => o.mul);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const symOK = muls.length === N_TIER
    && muls.every((v, i) => near(v + muls[N_TIER - 1 - i], 2 * NEUTRAL));
  const stepOK = muls.length === N_TIER
    && muls.every((v, i) => i === 0 || near(v - muls[i - 1], STEP));
  const endOK = muls.length === N_TIER && near(muls[0], FLOOR) && near(muls[N_TIER - 1], CEIL)
    && near(muls[MID_TIER], NEUTRAL);
  check(symOK && stepOK && endOK,
    `S-2. 📣 배수 ${N_TIER}칸이 **${NEUTRAL.toFixed(2)}을 축으로 등간격 대칭**이다`
    + ` — \`mul[i] + mul[${N_TIER - 1}−i] === ${(2 * NEUTRAL).toFixed(2)}\` · 간격 ${STEP.toFixed(2)} · 양 끝 ${FLOOR.toFixed(2)}/${CEIL.toFixed(2)}`
    + `\n     ${muls.map((v) => v.toFixed(2)).join(" · ")}`
    + (symOK ? "" : `\n     🔴 좌우 합이 ${(2 * NEUTRAL).toFixed(2)}이 아닌 칸이 있어요 — 밴드가 대칭이어도 **기댓값이 기웁니다**`)
    + (stepOK ? "" : `\n     🔴 간격이 고르지 않아요`)
    + (endOK ? "" : `\n     🔴 양 끝이나 중립 칸이 계약과 달라요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * S-3. 🎯 **중립이 N에 무관하다** — 2장에서도 · 5장에서도 · 8장에서도 ×1.000
 * ══════════════════════════════════════════════════════════════════════ */
console.log("\n── 🎯 S-3. 중립이 N(뛴 카드 수)에 무관 ──");

function runNeutral(h, seed, pos, upto, n) {
  h.seed(seed);
  let sum = 0, cnt = 0, cards = 0;
  const dist = {};
  for (let i = 0; i < n; i++) {
    const a = h.arc(upto, pos);
    cards = a.n;
    dist[a.d] = (dist[a.d] || 0) + 1;
    const off = h.T._t.rollOffers(a.d);
    for (const m of h.MK) { sum += off[m.id].mul; cnt += 1; }
  }
  return { mean: sum / cnt, dist, cards, n: cnt };
}

const BASE = {};
for (let s = 0; s < ARC_N.length; s++) {
  const upto = s + 1;
  const rows = SEEDS.map((sd) => ({ seed: sd, ...runNeutral(H, sd, "wg", upto, N) }));
  BASE[upto] = rows;
  const want = ARC_N[s];
  const worst = rows.reduce((a, b) => (Math.abs(b.mean - NEUTRAL) > Math.abs(a.mean - NEUTRAL) ? b : a));
  check(rows.every((r) => Math.abs(r.mean - NEUTRAL) <= EPS),
    `S-3${"abc"[s]}. 🎯 **N = ${rows[0].cards}장**(${upto}단계)에서 E[spotMul] = ${NEUTRAL.toFixed(3)} ± ${(EPS * 100).toFixed(1)}%`
    + ` — 시드 ${SEEDS.length}개 × ${N.toLocaleString()}판`
    + `\n     ${rows.map((r) => `${r.seed}:${r.mean.toFixed(5)}`).join(" · ")}`
    + `\n     가장 벗어난 시드 ${worst.seed} → ${((worst.mean - NEUTRAL) * 100).toFixed(3)}% (문턱 ±${(EPS * 100).toFixed(1)}%)`);
  /* 📊 측정 조건 — 덱이 실제로 몇 장이었는지 검사가 스스로 찍습니다.
   *    (카드 수 자체의 계약은 `school-test.js` S-6이 게임 입구로 지킵니다) */
  check(rows.every((r) => r.cards === want),
    `S-3${"abc"[s]}-조건. 📊 ${upto}단계까지의 덱이 실제로 **${want}장**이었다 (잰 값 ${rows[0].cards}장)`
    + (rows[0].cards === want ? "" : `\n     🔴 카드 수가 달라졌어요 — 위 S-3${"abc"[s]}은 "다른 N을 잰" 값입니다`));
}

/* 📊 **`d` 분포가 0을 축으로 대칭인가** — S-3의 1.000이 우연이 아니라
 *    이 대칭 때문임을 검사가 스스로 찍습니다. 시드 5개를 **합쳐서** 봅니다. */
{
  const rows = BASE[3];
  const d = {};
  for (const r of rows) for (const k of Object.keys(r.dist)) d[k] = (d[k] || 0) + r.dist[k];
  const tot = Object.values(d).reduce((a, b) => a + b, 0);
  let low = 0, high = 0;
  for (const k of Object.keys(d)) { const v = Number(k); if (v < 0) low += d[k]; else if (v > 0) high += d[k]; }
  const gap = Math.abs(low - high) / tot;
  const keys = Object.keys(d).map(Number).sort((a, b) => a - b);
  check(gap <= SYM_EPS_D,
    `S-3d. 📊 **편차 \`d\`의 분포가 0을 축으로 대칭**이다 — P(d<0) ≈ P(d>0) (±${(SYM_EPS_D * 100).toFixed(0)}% · 시드 ${SEEDS.length}개 합산 ${tot.toLocaleString()}판)`
    + `\n     ${keys.map((k) => `${k > 0 ? "+" : ""}${k}:${((d[k] || 0) / tot * 100).toFixed(1)}%`).join(" · ")}`
    + `\n     아래 ${(low / tot * 100).toFixed(2)}% ↔ 위 ${(high / tot * 100).toFixed(2)}% (차이 ${(gap * 100).toFixed(2)}%)`
    + `\n     🔑 S-3의 1.000은 우연이 아니라 **이 대칭 × S-1의 대칭 × S-2의 대칭**입니다`
    + `\n     🎉 2026-09-01까지는 **「거의」**였고 문턱이 ±6%였습니다 — \`PEER_REF.town\`이 종속값이 되며`
    + ` 기준선이 1.9% → 0.15%로 내려와 **±1%로 조였어요**(아래 S-3e·S-3f가 그 까닭입니다)`);
}

/* ══════════════════════════════════════════════════════════════════════
 * 🎉 S-3e. **카드 한 장의 기대 점수가 「정확히」 1점이다** — 구조로, 배정도로
 * ══════════════════════════════════════════════════════════════════════
 * 🚧 **이 자리는 2026-09-01까지 「알려진 미달」이었습니다.** 설계는
 *    *"E[등급] = ×1.000이 실측이 아니라 정의로 성립한다"*고 적었는데 실제로는
 *    「정의로」가 아니라 **「거의」**였어요 — `PEER_REF.town = 32.0` ↔ `evenStats()`
 *    평균 **32.333**이라 `autoP`가 ⅓·½가 아니라 **0.3368 · 0.5052**였고,
 *    카드 한 장이 **1.005~1.010점**이라 장마다 +0.0077점씩 위로 샜습니다.
 *    옛 판은 그걸 상한 0.02로 박고 🚧로 두면서, **드리프트가 목표 아래로 내려오면
 *    ❌ 「이제 승격하세요」**라고 말하도록 양방향으로 만들어 뒀어요.
 * ✅ **그 양방향이 갈렸습니다.** `PEER_REF.town`이 `evenStats()` 평균을 따라가는
 *    **종속값**이 되면서(engineer 102번 §3) 미달이 해소됐고, 이 블록을 승격합니다.
 *
 * 🔑 **교훈 — 검사가 이미 적어 둔 불일치를 아무도 안 읽었습니다.**
 *    *"±0.5% 안이니 통과"*가 **원인을 안 묻게** 만들었어요.
 *    ⚠️ **문턱을 통과한 편향에도 원인이 있습니다.**
 *
 * ── 🔬 왜 통계가 아니라 「등식」으로 승격하는가 ──
 * 승격된 검사가 다시 통계(±0.003)뿐이면, 다음에 이 불일치가 절반만 돌아와도
 * **또 문턱 안에 숨습니다.** 그래서 여기서는 **카드 한 장의 기대 점수를 배정도로**
 * 계산해 1과 견줍니다 — 0.5%도 0.05%도 아니고 **정확히 0**이라야 통과예요.
 *
 * ── 🔒 산식은 어디서 오는가 (베껴 적지 않습니다) ──
 *   · `outcome(kind, p)`  → **engine.js 소스에서 정규식으로 뜯어** `new Function`으로 되살립니다.
 *                            난수 `rnd`를 **우리가 넣어** 판정이 갈리는 자리를 이분법으로 찾아요.
 *                            🔴 `1.5p + 0.5` 같은 기댓값 공식을 검사에 적지 않습니다 —
 *                               적는 순간 `outcome`의 갈래가 바뀌어도 검사가 안 따라가요.
 *   · `PTS`               → `_t.PTS` (게임이 점수를 매기는 그 표)
 *   · `autoP`             → `_t.judgeFor(key, {pos}).autoP` (학교가 실제로 엔진에 넣는 그 값)
 *   · 기댓값 **1**만이 검사에 박힌 값입니다 — 그건 실측이 아니라 **중립의 정의**예요.
 *
 * 🌍 **이 등식이 성립하는 세계**: 🏫 학교가 🧬 조립대 **앞**이라 전원이 `evenStats()`의
 *    같은 몸으로 뜁니다. 조립대가 앞으로 오면 개인차가 `d`를 밀어 이 문장이 통째로
 *    옛 계약이 돼요 — 그때는 이 블록부터 다시 보세요 (town.js `evenBody` 주석).
 * 🔴 그리고 **`PEER_REF`에 town 전용 「세기 손잡이」를 되살리지 마세요** — 87번이 폐기한
 *    형태입니다. 지금 칸은 아무것도 안 정하고 `evenStats()`를 **따라갈** 뿐이에요. */
console.log("\n── 🎯 S-3e. 카드 한 장의 기대 점수가 정확히 1점 ──");
{
  /* 🔬 engine.js에서 `outcome`을 뜯어 옵니다 — 직접 eval 금지, `new Function` + `return`. */
  const m = SRC.match(/function outcome\(kind, p\) \{[\s\S]*?\n {2}\}/);
  const outcome = m ? new Function("rnd", `${m[0]}\nreturn outcome;`) : null;
  check(!!outcome,
    "S-3e-0. 🔬 engine.js에서 `outcome(kind, p)`를 **소스째 뜯어** 왔다 (`new Function` + return)"
    + (outcome ? "" : "\n     🔴 정규식이 안 걸립니다 — `outcome`의 모양이 바뀌었어요. **아래 S-3e는 안 돈 겁니다**"));

  if (outcome) {
    /* 판정은 난수 `r`에 대한 **계단 함수**예요. 계단이 놓인 자리를 이분법으로 찾으면
     * 각 판정의 확률이 배정도까지 정확히 나옵니다 — 표본이 아니라 **정의역 전체**입니다. */
    const segsOf = (kind, p) => {
      const at = (r) => outcome(() => r)(kind, p);
      const M = 4096;
      const segs = [];
      let cur = at(0), prev = 0;
      for (let i = 1; i <= M; i++) {
        const r = i / M, v = at(r);
        if (v !== cur) {
          let lo = prev, hi = r;
          for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; if (at(mid) === cur) lo = mid; else hi = mid; }
          segs.push([cur, hi]); cur = v;
        }
        prev = r;
      }
      segs.push([cur, 1]);
      return segs;
    };
    const PTS = H.T._t.PTS;
    const rows = H.T._t.CARDS.map((c) => {
      const j = H.T._t.judgeFor(c.key, { pos: "wg" });
      let E = 0, from = 0;
      for (const [res, to] of segsOf(j.kind, j.autoP)) { E += (PTS[res] != null ? PTS[res] : 0) * (to - from); from = to; }
      return { key: c.key, emoji: c.emoji, kind: j.kind, p: j.autoP, E };
    });
    const worst = rows.reduce((a, b) => (Math.abs(b.E - CARD_E) > Math.abs(a.E - CARD_E) ? b : a));
    check(rows.length > 0 && rows.every((r) => Math.abs(r.E - CARD_E) <= EXACT),
      `S-3e. 🎯 **카드 ${rows.length}종 전부 기대 점수가 정확히 ${CARD_E}점**이다`
      + ` — \`outcome\`(소스) × \`_t.PTS\` × \`judgeFor().autoP\``
      + `\n     ${rows.map((r) => `${r.emoji}${r.kind}: p=${r.p.toFixed(6)} → E=${r.E.toFixed(12)}`).join("\n     ")}`
      + `\n     가장 벗어난 카드 ${worst.emoji}${worst.kind} → ${(worst.E - CARD_E).toExponential(2)} (허용 ${EXACT.toExponential(0)})`
      + (rows.every((r) => Math.abs(r.E - CARD_E) <= EXACT)
        ? `\n     🔑 한 장이 정확히 1점이라 **덱이 몇 장이든·무엇이 뽑히든** \`E[d] = 0\`입니다 — 정의로요`
        : `\n     🔴 한 장의 기대 점수가 1이 아닙니다 — \`d\`가 0을 축으로 안 서요.`
          + `\n        까닭은 십중팔구 \`PEER_REF.town\` ↔ \`evenStats()\` 평균의 어긋남입니다`));

    /* 📊 **측정 조건을 검사가 스스로 찍습니다.** 🔴 이게 없으면 위 등식은 껍데기예요 —
     *    `judgeFor`가 세 카드 모두 같은 kind를 돌려줘도(예전에 실제로 그렇게 읽혔습니다)
     *    E는 셋 다 1이라 초록불이거든요. **세 갈래가 다 나오는지** 여기서 봅니다. */
    const kinds = Array.from(new Set(rows.map((r) => r.kind))).sort();
    check(kinds.length === 3 && rows.length === 3,
      `S-3e-조건. 📊 카드 ${rows.length}종이 **서로 다른 판정 갈래 ${kinds.length}가지**를 쓴다 (${kinds.join(" · ")})`
      + (kinds.length === 3 ? "" : `\n     🔴 갈래가 ${kinds.length}가지뿐이에요 — 위 S-3e가 같은 카드를 세 번 잰 셈입니다`));
  }

  /* 🔗 **`PEER_REF.town`이 「숫자」가 아니라 「따라가는 칸」인가** — 경계면 교차 비교예요.
   *    왼쪽(생산자) `town.js`의 `evenBody().x`  ↔  오른쪽(소비자) `game.js`의 `PEER_REF.town`.
   * 🔴 두 값이 같다는 것만으로는 부족합니다 — 우연히 같은 숫자가 박혀 있어도 통과하니까요.
   *    그래서 **`evenStats()`가 움직이면 `town`도 따라 움직이는지**를 봅니다(종속값은 관계로). */
  {
    const body = H.T._t.evenBody();
    const ref = H.W.__get("PEER_REF");
    const ratio = ref.town > 0 ? body.x / ref.town : NaN;
    check(Math.abs(ratio - 1) <= EXACT,
      `S-3e-a. 🔗 학교가 보는 몸이 **기준선 위에 정확히** 선다 — \`evenBody().x / PEER_REF.town = ${ratio}\``
      + `\n     몸 ${body.x} ↔ 기준선 ${ref.town}`
      + (Math.abs(ratio - 1) <= EXACT ? "" : `\n     🔴 비율이 1이 아니에요 — \`autoP\`가 설계값에서 벗어납니다`));

    /* 🔑 **따라가는가**를 재는 자리 — `evenStats()`를 잠깐 다른 값으로 갈아 끼우고
     *    `PEER_REF.town`이 **같이 움직이는지** 봅니다. 숫자가 박혀 있으면 안 움직여요.
     *    🔒 원래 함수는 곧바로 되돌립니다 (뒤 검사에 안 남게). */
    const P = H.W.WingerProspect;
    const real = P.evenStats;
    let moved = false, probe = NaN;
    try {
      P.evenStats = () => ({ a: 60, b: 60, c: 60, d: 60, e: 60, f: 60 });
      probe = H.W.__get("PEER_REF").town;
      moved = Math.abs(probe - 60) <= EXACT;
    } finally { P.evenStats = real; }
    check(moved,
      `S-3e-b. 🔗 **\`PEER_REF.town\`은 숫자가 아니라 종속값이다** — \`evenStats()\`를 평균 60으로 갈아 끼우면 \`town\`도 60이 된다 (잰 값 ${probe})`
      + (moved
        ? `\n     🔑 \`POOL\`이 194에서 200이 돼도 자동으로 맞습니다 — **값이 아니라 관계**라서요`
        : `\n     🔴 안 따라옵니다 — 누가 이 칸에 **숫자를 다시 적었어요.** \`game.js\`의 \`get town()\` 주석을 보세요`));
    check(Math.abs(H.W.__get("PEER_REF").town - body.x) <= EXACT,
      `S-3e-c. ♻️ 위 갈아 끼우기를 **되돌렸다** (지금 \`town\` = ${H.W.__get("PEER_REF").town})`
      + `\n     🔑 안 되돌리면 뒤따르는 검사가 전부 "다른 세계"를 잽니다 — 측정 조건을 스스로 찍는 자리예요`);
  }
}

/* ══════════════════════════════════════════════════════════════════════
 * 📏 S-3f. **카드당 중립 드리프트** — 위 등식이 실제 판에서도 지켜지는가 (통계)
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 S-3e가 **정의**를 보고, 여기가 **실제로 굴린 판**을 봅니다. 둘 다 있어야 해요 —
 *    등식만 보면 `deal`·`judge` 배선이 끊겨도 모르고, 통계만 보면 작은 편향이 문턱에 숨습니다.
 * 🚧 → 🎉 이 줄은 2026-09-01까지 상한 0.02의 「알려진 미달」이었습니다 (위 S-3e 머리말).
 *    지금은 **그냥 계약**이에요 — 넘으면 빨간불입니다. */
{
  const rows = BASE[3];
  let sum = 0, tot = 0;
  for (const r of rows) for (const k of Object.keys(r.dist)) { sum += Number(k) * r.dist[k]; tot += r.dist[k]; }
  const perCard = (sum / tot) / rows[0].cards;      // 장당 평균 편차 = 장당 중립 초과 점수
  check(Math.abs(perCard) <= DRIFT_EPS,
    `S-3f. 📏 카드당 중립 드리프트 = **${perCard >= 0 ? "+" : ""}${perCard.toFixed(5)}점/장**`
    + ` (N=${rows[0].cards} · ${tot.toLocaleString()}판 · 문턱 ±${DRIFT_EPS} · 1σ ≈ 0.00083)`
    + (Math.abs(perCard) <= DRIFT_EPS
      ? `\n     🔑 기준선 평균 +0.00005 · 1σ 0.00083 — 문턱은 **+3.6σ**이고 변이에서는 **−5.3σ**입니다`
      : `\n     🔴 **문턱을 넘었습니다.** 카드 한 장의 기대 점수가 1에서 벗어났어요 —`
        + `\n        위 S-3e가 초록불인데 여기만 빨간불이면 **표본을 먼저 의심하세요**(시드를 늘려 보세요).`
        + `\n        S-3e도 빨간불이면 \`PEER_REF.town\`이 \`evenStats()\`를 안 따라가고 있습니다`));
}

/* 🔑 관계 검사 — 값을 베끼지 않습니다. **네 포지션이 서로 같아야** 해요. */
{
  const byPos = POSES.map((p) => ({ pos: p, ...runNeutral(H, SEEDS[0], p, 3, 4000) }));
  const vals = byPos.map((r) => r.mean);
  const same = vals.every((v) => v === vals[0]);
  check(same,
    `T-1b. 🔒 **학교는 몸을 안 탑니다** — 같은 시드에서 포지션 4종의 기댓값이 **정확히 같다**`
    + `\n     ${byPos.map((r) => `${r.pos}:${r.mean.toFixed(5)}`).join(" · ")}`
    + (same
      ? `\n     (🧬 조립대 앞이라 전원이 \`evenStats()\`의 같은 몸이에요 — 능력치를 태울 축이 없습니다)`
      : `\n     🔴 포지션마다 다릅니다 — 학교가 능력치·포지션을 타기 시작했어요`));
}

console.log("\n── 🔒 T-4. 바닥 0.90 · 천장 1.10을 안 벗어난다 ──");

/* 🔴 표본이 아니라 **정의역 전체**를 봅니다 — `d`는 −8~+8이 전부이고, 여유를 두고 ±12를 훑어요. */
function boundsOf(h, seeds, n) {
  let lo = Infinity, hi = -Infinity, bad = 0, hitLo = 0, hitHi = 0, tot = 0;
  for (const s of seeds) {
    h.seed(s);
    for (let d = -D_DOMAIN; d <= D_DOMAIN; d++) {
      for (let i = 0; i < n; i++) {
        const off = h.T._t.rollOffers(d);
        for (const m of h.MK) {
          const v = off[m.id] && off[m.id].mul;
          tot += 1;
          if (typeof v !== "number" || !isFinite(v)) { bad += 1; continue; }
          lo = Math.min(lo, v); hi = Math.max(hi, v);
          if (v === FLOOR) hitLo += 1;
          if (v === CEIL) hitHi += 1;
        }
      }
    }
  }
  return { lo, hi, bad, hitLo, hitHi, tot };
}

const B = boundsOf(H, SEEDS, 60);
check(B.bad === 0 && B.lo >= FLOOR && B.hi <= CEIL,
  `T-4. 🔒 편차 −${D_DOMAIN} ~ +${D_DOMAIN} **전 구간**에서 배수가 [${FLOOR.toFixed(2)}, ${CEIL.toFixed(2)}]을 안 벗어난다`
  + ` (${B.tot.toLocaleString()}장)`
  + `\n     실제 폭 ${B.lo.toFixed(2)} ~ ${B.hi.toFixed(2)}`
  + (B.bad ? `\n     🔴 배수가 숫자가 아닌 장 ${B.bad}건 — 표 밖 칸을 집었어요(clamp가 없어졌나요?)` : ""));
check(B.hitLo > 0 && B.hitHi > 0,
  `T-4a. 🔒 바닥 ${FLOOR.toFixed(2)}·천장 ${CEIL.toFixed(2)}이 **실제로 닿는다** (닿은 장 ${B.hitLo.toLocaleString()} · ${B.hitHi.toLocaleString()})`
  + `\n     🔑 이게 없으면 T-4는 "아무 데도 안 닿아서 통과"입니다 — 측정 조건을 스스로 찍는 자리예요`);

/* 🔑 관계 검사 — ±1칸이 **좌우 대칭**이라는 것이 중립의 기계장치입니다.
 *    배수 표를 안 읽고, `d = 0`에서 나온 칸들의 **위/아래 개수**만 셉니다. */
{
  H.seed(SEEDS[1]);
  const cnt = {};
  const M = 20000;
  for (let i = 0; i < M; i++) {
    const off = H.T._t.rollOffers(0);
    for (const m of H.MK) { const t = off[m.id].tier; cnt[t] = (cnt[t] || 0) + 1; }
  }
  const tiers = Object.keys(cnt).map(Number).sort((a, b) => a - b);
  const mid = tiers[Math.floor(tiers.length / 2)];
  const below = tiers.filter((t) => t < mid).reduce((a, t) => a + cnt[t], 0);
  const above = tiers.filter((t) => t > mid).reduce((a, t) => a + cnt[t], 0);
  const tot = below + above + (cnt[mid] || 0);
  const gap = Math.abs(below - above) / tot;
  check(tiers.length === 3 && gap <= SYM_EPS,
    `T-4b. 🔒 ±1칸 흔들림이 **좌우 대칭**이다 — 편차 0에서 아래로 ${below} ↔ 위로 ${above}`
    + ` (차이 ${(gap * 100).toFixed(2)}% · 문턱 ${(SYM_EPS * 100).toFixed(0)}%)`
    + `\n     칸 ${tiers.join("/")} — ${tiers.map((t) => `${t}:${(cnt[t] / tot * 100).toFixed(1)}%`).join(" · ")}`
    + (tiers.length === 3 ? "" : `\n     🔴 칸이 3개가 아니에요 — 흔들림 폭이 바뀌었습니다`)
    + `\n     🔑 대칭이 곧 중립의 기계장치예요. 한쪽만 키우면 그건 흔들림이 아니라 **난이도 조정**입니다`);
}

H.close();

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — 고치기 전에 **빨간불이 뜨는지** 반드시 확인합니다
 *
 * 🔴 **기준선이 초록불인 걸 위에서 먼저 확인했습니다.** 이미 빨간불인 검사는
 *    남의 변이 신호까지 통째로 먹어요 (engineer 96번 §6이 그래서 「건수」로 셌습니다).
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
if (fail) {
  console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);
}

/* 그 변이 아래에서 S-1(구조)과 S-3(값)이 각각 어떻게 되는지 **둘 다** 재서 돌려줍니다. */
function under(name, opt) {
  const o = opt || {};
  const h = harness(MUT[name]);
  const tier = h.T._t.tierOfD;
  let symBad = 0;
  for (let d = -D_SWEEP; d <= D_SWEEP; d++) if (tier(d) + tier(-d) !== TIER_SUM) symBad += 1;
  const means = SEEDS.map((s) => runNeutral(h, s, "wg", 3, o.n || N).mean);
  const bounds = o.bounds ? boundsOf(h, [SEEDS[0]], 40) : null;
  const muls = (h.T._t.OFFER || []).map((x) => x.mul);
  h.close();
  const outside = means.filter((v) => Math.abs(v - NEUTRAL) > EPS).length;
  return { symBad, means, outside, bounds, muls };
}

/* 🔑🔴 **M-S1 — 이번 라운드의 핵심 변이.**
 *    S-1(구조)은 빨간불이어야 하고, S-3(±0.5%)은 **통과합니다** — 그게 요점이에요. */
if (!mutOK("M_S1_ASYM")) check(false, `🧪 **변이 M-S1 — 밴드 대칭을 한 칸 깸**${MUT_DEAD}`);
else {
  const r = under("M_S1_ASYM");
  const worst = r.means.reduce((a, v) => (Math.abs(v - NEUTRAL) > Math.abs(a - NEUTRAL) ? v : a));
  check(r.symBad > 0,
    `🧪🔑 **변이 M-S1 — 📏 밴드 대칭을 「한 칸만」 깸** → **S-1이 빨간불** (깨진 자리 ${r.symBad}칸)`
    + `\n     그때 E[spotMul] = ${r.means.map((v) => v.toFixed(5)).join(" · ")}`
    + `\n     🔴 가장 벗어난 값이 ${((worst - NEUTRAL) * 100).toFixed(3)}% — 문턱 ±${(EPS * 100).toFixed(1)}%의 `
    + `**${(Math.abs(worst - NEUTRAL) / EPS * 100).toFixed(0)}%**밖에 안 됩니다`
    + `\n     ${r.outside === 0
      ? `🔑 **S-3(값)은 시드 ${r.means.length}개 전부 초록불로 통과합니다** — 그래서 S-1이 필요해요`
      : `🟡 이번엔 S-3도 ${r.outside}개 시드에서 갈렸어요 (그래도 S-1이 본 신호입니다)`}`
    + (r.symBad > 0 ? "" : `\n     🔴 대칭을 깼는데 S-1이 초록불이에요 — S-1이 아무것도 안 지킵니다`));
}

/* 🧪 M-S1B — 경계 배열을 비대칭으로. S-1도 S-3도 갈려야 합니다. */
if (!mutOK("M_S1B_EDGE")) check(false, `🧪 **변이 M-S1B — 경계 배열을 비대칭으로**${MUT_DEAD}`);
else {
  const r = under("M_S1B_EDGE");
  check(r.symBad > 0 && r.outside === r.means.length,
    `🧪 **변이 M-S1B — 경계를 \`[-4, -2, 1, 4]\`로** → S-1·S-3이 **둘 다** 빨간불`
    + `\n     S-1 깨진 자리 ${r.symBad}칸 · S-3 ${r.means.map((v) => `${v.toFixed(5)}(${((v - NEUTRAL) * 100).toFixed(2)}%)`).join(" · ")}`
    + (r.outside === r.means.length
      ? `\n     ✔ S-3이 시드 ${r.means.length}개 **전부**에서 갈렸어요 — **S-3도 아직 해상도가 있습니다**`
      : `\n     🔴 S-3이 아직 통과하는 시드가 ${r.means.length - r.outside}개예요`));
}

/* 🧪 M-S2 — 바닥을 0.80으로. S-2와 T-4가 갈려야 합니다. */
if (!mutOK("M_S2_FLOOR")) check(false, `🧪 **변이 M-S2 — 바닥을 0.80으로**${MUT_DEAD}`);
else {
  const r = under("M_S2_FLOOR", { n: 2000, bounds: true });
  const symOK = r.muls.every((v, i) => Math.abs(v + r.muls[r.muls.length - 1 - i] - 2 * NEUTRAL) < 1e-9);
  check(!symOK && r.bounds.lo < FLOOR,
    `🧪 **변이 M-S2 — 📣 바닥을 0.80으로** → S-2·T-4가 빨간불`
    + `\n     배수 ${r.muls.map((v) => v.toFixed(2)).join(" · ")} · 좌우 합 대칭 ${symOK ? "🔴 아직 성립" : "깨졌어요 ✔"}`
    + `\n     실제 폭 ${r.bounds.lo.toFixed(2)} ~ ${r.bounds.hi.toFixed(2)} (바닥 ${FLOOR.toFixed(2)} 아래 ${r.bounds.lo < FLOOR ? "✔" : "🔴"})`);
}

/* 🧪 M-C2 — 흔들림을 한쪽만 키움. S-3이 갈려야 합니다. */
if (!mutOK("M_C2_SHAKE")) check(false, `🧪 **변이 M-C2 — 흔들림을 0.10 / 0.50 / 0.40으로**${MUT_DEAD}`);
else {
  const r = under("M_C2_SHAKE");
  check(r.outside === r.means.length,
    `🧪 **변이 M-C2 — 🎲 흔들림을 한쪽만 키움** → S-3이 시드 ${r.means.length}개 **전부**에서 빨간불`
    + `\n     ${r.means.map((v) => `${v.toFixed(5)}(${((v - NEUTRAL) * 100).toFixed(2)}%)`).join(" · ")}`
    + (r.outside === r.means.length
      ? `\n     ✔ 벗어난 폭이 문턱 ±${(EPS * 100).toFixed(1)}%의 ${(Math.abs(r.means[0] - NEUTRAL) / EPS).toFixed(1)}배 — 잡음이 아니라 신호예요`
      : `\n     🔴 아직 통과하는 시드가 ${r.means.length - r.outside}개 — 그 시드에서는 아무것도 안 지키고 있어요`));
}

/* 🎯🔴 **M-REF-CONST — `PEER_REF.town`을 다시 숫자(32.0)로.** 이 파일의 승격을 지키는 변이예요.
 *    S-3e(등식) · S-3e-b(종속) · S-3d(분포) · S-3f(드리프트)가 **넷 다** 갈려야 합니다.
 * ⚠️ **방향이 뒤집힌 변이입니다** — 옛 판(M-REF-FIX)은 「고치면 🚧가 ❌로 갈리는가」를
 *    쟀어요. 고침이 들어왔으니 이제 재야 할 것은 **「되돌리면 잡히는가」**입니다. */
if (!mutOK("M_REF_CONST")) check(false, `🧪 **변이 M-REF-CONST — \`PEER_REF.town\`을 다시 32.0으로**${MUT_DEAD}`);
else {
  const h = harness(MUT.M_REF_CONST);
  /* 🔴 **표본을 줄이지 마세요.** 4,000판으로 쟀더니 1σ가 0.0016이라 해소된 값(+0.0002)이
   *    +0.0028로 튀어 「아직 🚧」로 읽혔습니다 — 밴드가 좁아서 뜬 빨간불의 교과서예요.
   *    (볼트: *"밴드가 좁아서 빨간불이 뜨면 표본을 먼저 의심하세요"*) */
  const rows = SEEDS.map((s) => runNeutral(h, s, "wg", 3, N));
  const ref = h.W.__get("PEER_REF").town;
  const body = h.T._t.evenBody();
  const ps = h.T._t.CARDS.map((c) => h.T._t.judgeFor(c.key, { pos: "wg" }));
  const PTSm = h.T._t.PTS;
  h.close();
  let sum = 0, tot = 0, lo = 0, hi = 0;
  for (const r of rows) for (const k of Object.keys(r.dist)) {
    const v = Number(k);
    sum += v * r.dist[k]; tot += r.dist[k];
    if (v < 0) lo += r.dist[k]; else if (v > 0) hi += r.dist[k];
  }
  const perCard = (sum / tot) / rows[0].cards;
  const gap = Math.abs(lo - hi) / tot;
  const ratio = body.x / ref;
  /* 🔑 「몇 개가 갈리는가」를 **건수로** 셉니다 — 하나만 보면 나머지가 조용히 죽어도 몰라요. */
  /* 🎯 **S-3e(등식)를 변이 아래에서 다시 계산합니다** — 이게 이 파일의 머릿돌이라,
   *    변이 표에서 빠지면 "승격은 했는데 아무도 안 겨누는" 줄이 됩니다. */
  const mE = SRC.match(/function outcome\(kind, p\) \{[\s\S]*?\n {2}\}/);
  const oc = mE ? new Function("rnd", `${mE[0]}\nreturn outcome;`) : null;
  const Eof = (kind, p) => {
    if (!oc) return NaN;
    const at = (r) => oc(() => r)(kind, p);
    let E = 0, from = 0, cur = at(0), prev = 0;
    const M = 4096;
    for (let i = 1; i <= M; i++) {
      const r = i / M, v = at(r);
      if (v !== cur) {
        let lo = prev, hi = r;
        for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; if (at(mid) === cur) lo = mid; else hi = mid; }
        E += (PTSm[cur] != null ? PTSm[cur] : 0) * (hi - from); from = hi; cur = v;
      }
      prev = r;
    }
    E += (PTSm[cur] != null ? PTSm[cur] : 0) * (1 - from);
    return E;
  };
  const Es = ps.map((j) => Eof(j.kind, j.autoP));
  const caught = [
    ["S-3e 등식", Es.every((v) => Math.abs(v - CARD_E) > EXACT)],
    ["S-3e-b 종속", Math.abs(ratio - 1) > EXACT],
    ["S-3f 드리프트", Math.abs(perCard) > DRIFT_EPS],
    ["S-3d 분포", gap > SYM_EPS_D],
  ];
  const n = caught.filter((c) => c[1]).length;
  check(n === caught.length,
    `🧪🎯 **변이 M-REF-CONST — \`PEER_REF.town\`을 다시 숫자 ${ref}로** → 승격된 검사 ${caught.length}줄이 **전부** 빨간불`
    + `\n     ${caught.map(([nm, ok]) => `${ok ? "✔" : "🔴"} ${nm}`).join(" · ")}`
    + `\n     비율 ${ratio.toFixed(6)} (1이 아님) · 카드 기대 점수 ${Es.map((v, i) => `${ps[i].kind}=${v.toFixed(6)}`).join(" · ")}`
    + `\n     autoP ${ps.map((j) => `${j.kind}=${j.autoP.toFixed(6)}`).join(" · ")}`
    + `\n     드리프트 +${perCard.toFixed(5)}/장 (문턱 ${DRIFT_EPS}) · 분포 좌우차 ${(gap * 100).toFixed(2)}% (문턱 ${(SYM_EPS_D * 100).toFixed(0)}%) · ${tot.toLocaleString()}판`
    + (n === caught.length
      ? `\n     ✔ **숫자를 다시 적으면 그 자리에서 잡힙니다** — 승격이 「현재값을 정답으로 단언」한 게 아니에요`
      : `\n     🔴 ${caught.length - n}줄이 아직 초록불입니다 — 그 줄은 지금 아무것도 안 지켜요`));
}

/* 🧪 M-G — clamp를 빼고 흔들림을 ±2로. 표 밖 칸을 집어 배수가 사라집니다.
 * ⚠️ 이 변이는 **던질 수도 있어요**(`OFFER[tier]`가 undefined). 던지는 것도
 *    "빨간불"로 셉니다 — 다만 어느 쪽이었는지 화면에 적습니다. */
if (!mutOK("M_G_NOCLAMP")) check(false, `🧪 **변이 M-G — clamp 제거 + 흔들림 ±2**${MUT_DEAD}`);
else {
  let how = "", caught = false;
  try {
    const h = harness(MUT.M_G_NOCLAMP);
    const b = boundsOf(h, [SEEDS[0]], 40);
    h.close();
    caught = b.bad > 0 || b.lo < FLOOR || b.hi > CEIL;
    how = b.bad ? `배수가 사라진 장 ${b.bad}건` : `실제 폭 ${b.lo.toFixed(2)} ~ ${b.hi.toFixed(2)}`;
  } catch (e) {
    caught = true; how = `그 자리에서 던졌어요 — ${String(e.message).slice(0, 60)}`;
  }
  check(caught, `🧪 **변이 M-G — clamp 제거 + 흔들림 ±2** → T-4가 빨간불 (${how})`);
}

/* ---------- 마무리 ---------- */
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
console.log("\n✅ 통과");
process.exit(0);
