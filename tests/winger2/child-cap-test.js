/* 🧒📈 ⚽ 더 윙어 II — **어린 시절이 그리는 천장** (`childCap` · `statCap`)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 이 파일이 생긴 이유 — **이걸 보는 검사가 저장소에 0곳이었습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 2026-09-03(커밋 fde6688), 🧒 어린 시절이 네 해가 되면서 `statCap`에 항이 하나 붙었어요:
 *
 *     statCap(k) = STAT_CAP + transLv(k)×TRANS_CAP_STEP + childCap(k)
 *     childCap(k) = CHILD_CAP_STEP × (q(k) − q̄)        🔴 q̄는 종속값
 *
 * 그런데 `statCap`·`childCap`·`CHILD_TALENT`·`GROW_TILT`를 보는 검사가 **하나도 없었습니다.**
 * engineer가 고친 것을 하나씩 되돌려 봤더니 **변이 9개가 커밋된 검사에는 하나도 안 걸렸어요.**
 * 그 상태로는
 *   · 천장의 Σ가 **새어 나가도** (= 평균 천장이 조용히 올라 「게임이 쉬워져도」)
 *   · 옛 세이브가 **중립이 아니게 되어도** (= 마이그레이션 안 하기로 한 규칙의 정면)
 *   · `childCap`이 `statCap`에서 **떨어져 나가도** (= 네 해가 통째로 장식이 되어도)
 *   · 천장이 세이브에 **실려 나가도** (= 계수를 바꾼 날 옛 세이브만 옛 천장을 써도)
 * 아무도 안 웁니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 값을 고치기 전에 여기부터 여세요
 * ═════════════════════════════════════════════════════════════════════════
 *
 * 「🧒 **어린 시절이 「평균 천장」이 아니라 「천장의 모양」만 바꾸는 세계**」.
 *
 *   · 🔒 **Σ childCap = 0**입니다. 여섯 칸이 각각 다르지만 평균은 여전히 정확히 `STAT_CAP`이에요.
 *     🔑 그 성질이 **「어린 시절은 난이도 손잡이가 아니다」를 「구조로」** 만듭니다.
 *     🔴 Σ가 0이 아니게 되는 순간 이건 트레이드오프가 아니라 **순수 난이도 손잡이**가 되고,
 *       몰빵에 반대 압력을 걸 자리가 **아예 없어집니다**.
 *   · 🧮 `q̄`는 **칸 수에 매인 종속값**이지 손잡이가 아닙니다. 6을 박으면 칸이 바뀐 날 Σ가 샙니다.
 *   · 🗄️ **마이그레이션하지 않습니다** — `childPicks`가 없거나 `[]`이면 여섯 칸이 **정확히 0**.
 *   · 🔒 **천장 값 자체는 저장하지 않습니다** — 저장하면 계수를 바꾼 날 옛 세이브만 옛 천장을 써요.
 *   · 🌙 **초3(`ge`/`gn`/`gl`)은 천장에 한 톨도 안 더합니다** — 그건 「시점(나이곡선)」 축이라
 *     🔑 초4 `h3`도 `GROW_TILT_HELD`를 받지 천장 몫을 받지 않아요. **성질이 다른 축입니다.**
 *
 * ⚠️ **뒤집히면 이 파일이 옛 계약이 되는 판정**
 *   · *"어린 시절이 평균 천장도 올려 주자"* → **K-1·K-3b**가 통째로 옛 계약입니다.
 *     그 순간 「고르기」가 모양이 아니라 **세지는 손잡이**가 돼요.
 *   · *"🌙 초3도 천장을 밀자"* → **K-5b**(초3은 천장을 안 움직인다)가 먼저 뒤집힙니다.
 *   · *"한 선수에 천장을 하나로"* → **K-2**(여섯 칸이 갈린다)가 성립할 수 없습니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🎚️ **`CHILD_CAP_STEP` = 1.5 — balancer가 확정했습니다** (135번 · 2026-09-03)
 * ─────────────────────────────────────────────────────────────────────────
 * 만 30세 정렬 폭(🌙초3을 `gn`으로 고정한 27조합 × 8칸), 밴드는 **초3 만30세 폭 1.80 × 2 = 3.60%p**:
 *
 *     1 · 1.25 → 1.59~2.13%p   🔴 아래 미달 (🏃wg 0.35~0.45% < 0.5%)
 *     **1.5**  → **2.23~3.27%p  ✅ 통과**
 *     2 · 2.5 · 3 → 3.48~5.84%p 🔴 위 초과
 *
 * 🚨 **쓸 수 있는 창이 `1.42 ~ 1.75`뿐입니다 — 여유가 양쪽 8~9%.** 아래는 🏃wg가, 위는 fw가 묶어요.
 * 🔴 **`BLEND`·`STAT_CAP`·`CHILD_TALENT`·`FOCUS_W_HELD` 중 하나만 움직여도 창을 다시 재야 합니다.**
 *    그래서 아래 **K-10(재측정 조건)**이 그 넷의 지문을 붙잡고 있어요 — 하나라도 움직이면 빨간불입니다.
 *
 * 🔒 **그래도 산식 검사는 값에 안 기댑니다.** K-1~K-9는 계수를 뭘로 놓든 성립해야 하는 문장이에요.
 *    값을 보는 것은 **K-10a(창 안에 있나)** 하나뿐이고, 그건 밸런스 계약이지 산식 계약이 아닙니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **M4 감도 — 계수 값에 따라 「증상이 0장」인 자리** (🚨 확정으로 **살아났습니다**)
 * ─────────────────────────────────────────────────────────────────────────
 * engineer는 *"M4는 2.0에서만 잡히고 3.0에서는 증상이 0장"*이라고 짚었어요.
 * balancer가 **1.5**로 정하면서 그 자리가 **살아났습니다** — 1.5는 3의 배수가 아니거든요.
 * 실측 (81조합 중 Σ≠0인 조합 수 · 우수리 되돌리기 루프를 지운 채):
 *
 *     step **1.5** → **81 / 81**  ← ✅ 확정값(2026-09-03 소스에 들어갔습니다). 여기서 재면 잡힙니다
 *     step 3.0     → **0 / 81**   ← 🔴 옛 임시값. 여기서만 재면 **아무것도 안 잡힙니다**
 *     2.5 → 72/81 · 0.7 → 54/81 · 2.0 → 27/81 · 1.0 → 27/81 · 4.5 → 81/81
 *
 * 🔑 **까닭**: Σq가 늘 짝수라, 계수가 **3의 배수**면 `3q − Σq/2`가 전부 정수예요.
 *    반올림이 아무 일도 안 하니 되돌릴 우수리가 **애초에 안 생깁니다.**
 *    🔴 그래서 그 루프는 **그 계수에서만 증상이 0장**입니다 — 「방어가 겹침」의 사촌이에요.
 *
 * 🔧 **잡는 법**: 검사가 `CHILD_CAP_STEP`을 **직접 여러 값으로 바꿔 가며** 굴립니다.
 *    🔒 **소스의 값을 안 읽습니다** — 정규식은 `= [숫자];`를 받아 아무 값에나 걸려요.
 *    🔒 **감도 조건을 검사가 스스로 찍습니다**(감도 조건): 쓸어 본 계수 중 **적어도 하나에서
 *       M4가 실제로 잡혀야** 합니다. 3의 배수만 남으면 K-8은 아무것도 안 지키는 초록불이에요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚨 **여기서 찾은 것 — 「방어가 겹침」: 우수리 되돌리기가 `q̄` 오류를 가립니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 🧮 `q̄`를 **상수 1로 박아도 Σ는 여전히 0**입니다. 우수리 되돌리기 루프가 어긋난 만큼을
 * 그대로 되돌려 놓거든요 — 게다가 여섯 칸을 **같은 만큼** 밀어서 「모양」도 안 바뀝니다.
 *
 *     step 1.5 — 정상 0/81 · q̄만 망가뜨림 **0/81** · 되돌리기만 끔 81/81 · **둘 다 81/81**
 *     step 3.0 — 정상 0/81 · q̄만 망가뜨림 **0/81** · 되돌리기만 끔 0/81 · **둘 다 27/81**
 *
 * 🔴 **그래서 「Σ = 0」만 보는 검사로는 `q̄` 오류를 절대 못 잡습니다.** 증상이 0장이에요.
 * 🔧 **K-9**가 그 자리를 직교로 엽니다 — **되돌리기를 끈 채** 3의 배수 계수에서 Σ를 봅니다.
 *    그러면 「중립화가 **구조로** 서 있는가」만 남아요. 🔑 이게 `q̄`를 지키는 유일한 문장입니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 페이지를 통째로 싣고 진짜 `childCapAll()`을 부릅니다
 *   ② **산식은 소스에서 · 문턱은 여기 · 종속값은 관계식으로** (세 축)
 *   ③ 81조합을 **전수**로 훑습니다 — 시드 하나로도, 조합 하나로도 안 잽니다
 *   ④ **기준선이 초록불인 것을 먼저 찍고** 변이를 겁니다 (0번이 정규식부터 대조)
 *   ⑤ 변이마다 **어느 문장이** 물어야 하는지 못 박고, **안 물어야 하는 문장**도 확인합니다
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가:
 *     밴드(4~6%p / 2~3%p)가 맞는지 · 천장이 커리어에서 「느껴지는」 크기인지 ·
 *     상한 도달 표시(`.stat-val.max`)의 모양. 앞의 둘은 **balancer의 실측** 몫입니다.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 */
"use strict";
const { bootPage, pageMutsOK } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const N_STATS = 6;              // 📊 능력치 여섯 칸
const YEARS = 4;                // 🧒 어린 시절의 해 수
const PER_YEAR = 3;             // 🧒 해마다 3택
const COMBOS = 81;              // 3⁴ — 🔒 전수입니다(표본이 아니에요)
const SUM_WANT = 0;             // 🔒 Σ childCap — **정확히 0**
const MIN_SPREAD = 1;           // 📈 적어도 한 조합은 천장이 **갈려야** 합니다 (실측 3~9)
/* 🧪 **감도 쓸이** — 🔴 `CHILD_CAP_STEP`을 검사가 직접 갈아 끼웁니다.
 *    🔒 **맨 앞이 확정값 1.5**입니다(balancer 135번). 3의 배수가 아니라 M4가 여기서 잡혀요.
 *    🔒 3.0(옛 임시값)도 남겨 둡니다 — **거기서는 안 잡힌다**는 걸 검사가 직접 찍게요.
 *    🔴 소스의 값에 안 기댑니다 — 소스가 1.5가 되든 3.0으로 남든 이 목록은 그대로예요. */
const STEP_SWEEP = [1.5, 2.0, 2.5, 0.7, 4.5, 3.0];
const STEP_CONFIRMED = 1.5;        // ⭐ balancer 확정값 (135번)
const STEP_WIN_LO = 1.42, STEP_WIN_HI = 1.75;   // 🚨 쓸 수 있는 창 — 여유 양쪽 8~9%
/* 🔒 **재측정 조건의 지문** — 이 넷이 움직이면 위 창을 **다시 재야** 합니다 (K-10).
 *    🔴 값을 「계약」으로 삼는 게 아니라, **움직였는지**를 봅니다. 움직였으면 빨간불이에요. */
const REMEASURE = {
  "engine.js": [
    [/const BLEND_W = \[([\d., ]+)\];/, "0.60, 0.25, 0.15"],
  ],
  "game.js": [
    [/const STAT_CAP = (\d+);/, "130"],
  ],
  "prospect.js": [
    [/const FOCUS_W_HELD = ([\d.]+);/, "1.60"],
    [/fin: +\[([^\]]+)\],/, '"shoot", "speed"'],
    [/run: +\[([^\]]+)\],/, '"pass", "stamina"'],
    [/steal: \[([^\]]+)\],/, '"dribble", "defense"'],
  ],
};

/* 🧒 네 해의 키 — 🔒 **세이브(`S.childPicks`)가 가리키는 값**이라 여기 박습니다.
 *    (소스에서 읽어 오면 표가 통째로 사라져도 «0조합을 전부 통과»가 됩니다) */
const Y1 = ["ball", "body", "eye"];      // 🧸 모양 — CHILD_FOCUS
const Y2 = ["fin", "run", "steal"];      // 👦 가속 — CHILD_TALENT
const Y3 = ["ge", "gn", "gl"];           // 🌙 시점 — GROW_TILT   🔴 천장에 안 닿습니다
const Y4 = ["h1", "h2", "h3"];           // 🔑 세기 — 굳히기

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 — **0번이 먼저 소스와 대조합니다**
 * ══════════════════════════════════════════════════════════════ */
const STEP_RE = /const CHILD_CAP_STEP = [\d.]+;/;
const MUT = {
  /* 🔴 K-M1 — 🧮 **`q̄`를 상수로 박습니다.** 칸 수에 매인 종속값을 손잡이로 바꾸는 자리예요.
   *    🔑 Σ가 **구조로** 0이 아니게 되어 평균 천장이 통째로 움직입니다. */
  QBAR_FIX: { "game.js": [[/const qbar = sq \/ keys\.length;/, "const qbar = 1;"]] },
  /* 🔴 K-M2 — 🔗 **`statCap`에서 `childCap`을 뗍니다.** `childCapAll()`은 멀쩡히 돌고
   *    Σ도 0이라, **천장 쪽 검사는 전부 초록불**입니다 — 배선만 죽어요. */
  CAP_UNWIRE: { "game.js": [[/const statCap = \(key\) => STAT_CAP \+ transLv\(key\) \* TRANS_CAP_STEP \+ childCap\(key\);/,
    "const statCap = (key) => STAT_CAP + transLv(key) * TRANS_CAP_STEP;"]] },
  /* 🔴 K-M3 — 👦 **초2를 천장에서 뺍니다.** `childPush`가 🧸초1만 셉니다.
   *    화면도 값도 멀쩡하고 Σ도 0이에요 — **초2가 천장에서만 조용히 사라집니다.** */
  NO_TALENT_Q: { "prospect.js": [[/const out = childFocus\(picks\)\.concat\(childTalent\(picks\)\);/,
    "const out = childFocus(picks);"]] },
  /* 🔴 K-M4 — 🧮 **우수리 되돌리기 루프를 지웁니다.** engineer가 미리 짚은 자리예요.
   *    🚨 **`CHILD_CAP_STEP = 3.0`에서는 증상이 0장**이라, 소스 값 그대로 재면 안 잡힙니다.
   *    그래서 K-8이 계수를 **갈아 끼워 가며** 물어요. */
  NO_REPAIR: { "game.js": [[/ {2}let diff = -sum;/, "  let diff = 0;"]] },
  /* 🔴 K-M5 — 💾 **천장을 세이브에 얹습니다.** 눈에 아무 증상이 없어요 —
   *    계수를 바꾼 **다음 날**, 옛 세이브만 옛 천장을 쓰는 것으로 드러납니다. */
  CAP_SAVED: { "game.js": [[/ {2}childCapMemo = \{ picks, val: out \};/,
    "  childCapMemo = { picks, val: out };\n  if (S) S.childCap = out;"]] },
  /* 🔴 K-M6 — 🎚️ **한 선수에 천장 하나.** 여섯 칸이 전부 같은 값을 받아요 —
   *    그러면 트레이드오프가 아니라 **순수 난이도 손잡이**가 됩니다(설계가 금지한 형태). */
  ONE_CAP: { "game.js": [[/raw\[k\] = CHILD_CAP_STEP \* \(q\[k\] - qbar\);/,
    "raw[k] = CHILD_CAP_STEP * qbar;"]] },
  /* 🔴 K-M7 — 📀 **옛 세이브가 중립이 아니게.** `childPicks`가 없으면 ⚽를 고른 것이 돼요. */
  OLD_NOT_NEUTRAL: { "game.js": [[/ {2}const picks = \(S && S\.childPicks\) \|\| null;/,
    '  const picks = (S && S.childPicks && S.childPicks.length) ? S.childPicks : ["ball", "fin"];']] },
};

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — 진짜 페이지를 싣고 **진짜 `childCapAll()`**을 부릅니다
 * ══════════════════════════════════════════════════════════════
 * 🔒 산식을 여기 옮겨 적지 않습니다. `bootPage`가 `index.html`의 스크립트를 그대로
 *    인라인해서 실으니, 아래 `__get`이 부르는 것은 **디스크의 그 함수**예요.
 * 🔒 `S`는 `__get`으로 갈아 끼웁니다 — `childCapAll`이 `S.childPicks`를 읽거든요.
 *    (직접 eval이 아니라 페이지가 심어 둔 `window.__get`입니다) */
function open(step, mutNames) {
  const byFile = {};
  const add = (f, m) => { (byFile[f] = byFile[f] || []).push(m); };
  /* 🔒 **바꿔 쓰는 문자열이 「언제나」 원본과 달라야 합니다.**
   * 🚨 2026-09-03에 여기서 죽었어요 — balancer 확정값 **1.5**가 소스에 들어가자,
   *    쓸이의 `1.5` 칸에서 `replace` 결과가 원본과 **글자 하나까지 같아졌고**
   *    `bootPage`가 *"변이가 안 걸렸어요"*로 던져 **파일이 통째로 💥(종료 2)**가 됐습니다.
   *    🔑 그 칸은 **변이가 아니라 기준선**인데, 그걸 「안 걸림」과 구분할 방법이 없었어요.
   * 🔧 그래서 뒤에 자국(`/* 🧪 쓸이 *​/`)을 붙입니다 — 값이 같아도 **문자열은 늘 달라져**
   *    「정말 안 걸리는 정규식」과 「값이 이미 그 값인 칸」이 갈립니다.
   * 🔴 이 자국을 지우지 마세요. 지우면 소스가 쓸이의 어느 값과 같아지는 날 또 죽습니다. */
  if (step != null) add("game.js", [STEP_RE, `const CHILD_CAP_STEP = ${step}; /* 🧪 쓸이 */`]);
  /* 🔒 **변이를 겹쳐 걸 수 있습니다** — K-9가 「되돌리기 끔 + q̄ 망가뜨림」을 겹쳐 걸어야
   *    가려진 자리가 열립니다(윗글 「방어가 겹침」). */
  for (const name of [].concat(mutNames || []))
    for (const [f, list] of Object.entries(MUT[name])) for (const m of list) add(f, m);
  const W = bootPage({ muts: byFile });
  const keys = W.__get("STAT_DEFS").map((d) => d.key);
  const setPicks = (picks) => W.__get(`S = ${JSON.stringify(picks === undefined ? {} : { childPicks: picks })}`);
  return {
    W, keys,
    /* 🧮 여섯 칸의 천장 몫 */
    cap: (picks) => { setPicks(picks); return W.__get("childCapAll()"); },
    /* 📈 여섯 칸의 **실제 상한** — 🔑 `childCapAll`이 아니라 `statCap`을 부릅니다.
     *    배선이 끊기면 여기서만 드러나요(K-M2). */
    stat: (picks) => { setPicks(picks); return keys.map((k) => W.__get(`statCap(${JSON.stringify(k)})`)); },
    /* 💾 `statCap`을 부른 **뒤** 세이브에 무엇이 남았는지 */
    saveKeys: (picks) => { setPicks(picks); keys.forEach((k) => W.__get(`statCap(${JSON.stringify(k)})`)); return W.__get("Object.keys(S)"); },
    close: () => W.close(),
  };
}
const sumOf = (keys, o) => keys.reduce((a, k) => a + o[k], 0);
const spreadOf = (keys, o) => Math.max(...keys.map((k) => o[k])) - Math.min(...keys.map((k) => o[k]));
/* 🧒 81조합 전수 */
const ALL = [];
for (const a of Y1) for (const b of Y2) for (const c of Y3) for (const d of Y4) ALL.push([a, b, c, d]);

/* ══════════════════════════════════════════════════════════════
 * 0️⃣ 변이 정규식이 **지금 소스에 걸리는가** — 죽지 않고 빨간불로
 * ══════════════════════════════════════════════════════════════ */
{
  const bad = pageMutsOK(MUT);
  const stepHit = require("fs").readFileSync(require("path").join(require("./_load.js").PAGE_DIR, "game.js"), "utf8").match(STEP_RE);
  check(bad.length === 0 && !!stepHit,
    `K-0. 🧪 변이 정규식 ${Object.keys(MUT).length}개 + 계수 갈아끼우기가 지금 \`beta/winger2/\`에 전부 걸린다`
    + (stepHit ? `\n     🎚️ 지금 소스의 계수: \`${stepHit[0]}\` — 🔒 **값을 안 읽습니다.** 정규식이 아무 숫자에나 걸려요`
      : `\n     🔴 \`CHILD_CAP_STEP\` 선언 모양이 바뀌었습니다 — K-8(감도)이 통째로 안 돕니다`)
    + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 "안 도는" 상태예요**\n       · ${bad.join("\n       · ")}` : ""));
  if (bad.length || !stepHit) { console.log(`\n❌ 빨간불 ${fail}건`); process.exit(1); }
}

console.log("── 🧒📈 K. 어린 시절이 그리는 천장 ──");

/* ══════════════════════════════════════════════════════════════════════
 * K-1 · K-2 · K-3 — 기준선 (소스의 계수 그대로)
 * ══════════════════════════════════════════════════════════════════════ */
const BASE = (() => {
  const h = open(null, null);
  const rows = ALL.map((p) => ({ p, o: h.cap(p) }));
  const r = {
    keys: h.keys,
    rows,
    sums: rows.map((x) => sumOf(h.keys, x.o)),
    spreads: rows.map((x) => spreadOf(h.keys, x.o)),
    empty: h.cap([]),
    none: h.cap(undefined),
    unknown: h.cap(["zzz", "qqq", "ge"]),
    statAll: ALL.map((p) => h.stat(p)),
    statEmpty: h.stat([]),
    saveKeys: h.saveKeys(["ball", "fin", "ge", "h1"]),
  };
  h.close();
  return r;
})();
const K = BASE.keys;

{
  const bad = BASE.sums.filter((s) => s !== SUM_WANT).length;
  check(bad === 0 && BASE.rows.length === COMBOS && K.length === N_STATS,
    `K-1. 🔒 **Σ childCap = ${SUM_WANT}** — ${YEARS}해 × ${PER_YEAR}택 **${COMBOS}조합 전수**`
    + `\n     조합 ${BASE.rows.length}개 · 칸 ${K.length}개 · Σ≠0인 조합 **${bad}개**`
    + `\n     🔎 측정 조건 — 표본이 아니라 **전수**입니다(3⁴). 소스의 계수 그대로 굴렸어요`
    + (bad === 0
      ? `\n     🔑 평균 천장이 조합에 무관하게 그대로라, 어린 시절은 **난이도 손잡이가 아닙니다**`
      : `\n     🔴 Σ가 샙니다 — 그 순간 어린 시절이 **모두의 천장을 미는** 손잡이가 돼요`));
}
{
  const maxSpread = Math.max(...BASE.spreads);
  check(maxSpread >= MIN_SPREAD,
    `K-2. 📈 **여섯 칸이 실제로 갈린다** — 천장 폭 최대 ${maxSpread} · 최소 ${Math.min(...BASE.spreads)} (바닥 ${MIN_SPREAD})`
    + `\n     🌍 이 문장이 서 있는 세계 — 「어린 시절이 **천장의 모양**을 바꾸는 세계」예요.`
    + ` 🔒 바닥을 **1**로 둔 건 \`CHILD_CAP_STEP\`이 1.5든 3.0이든 넉넉히 넘기 때문입니다`
    + ` (실측 1.5에서 폭 2~5 · 3.0에서 3~9). 🔴 **밴드가 아니라 바닥**이라 계수를 바꿔도 안 흔들려요`
    + (maxSpread >= MIN_SPREAD ? "" : `\n     🔴 여섯 칸이 전부 같습니다 — 그건 트레이드오프가 아니라 **순수 난이도 손잡이**예요`));
}
{
  /* 🔑 **관계로 봅니다** — 「130이다」가 아니라 「조합을 바꿔도 합이 안 변한다」. */
  const totals = BASE.statAll.map((a) => a.reduce((x, y) => x + y, 0));
  const t0v = totals[0];
  const flat = totals.every((t) => t === t0v);
  const emptyTotal = BASE.statEmpty.reduce((x, y) => x + y, 0);
  const varies = BASE.statAll.some((a) => new Set(a).size > 1);
  check(flat && emptyTotal === t0v && varies,
    `K-3. 📈 **\`statCap\` 여섯 칸의 합이 ${COMBOS}조합 전부 같다** (합 ${t0v} · 옛 세이브도 ${emptyTotal})`
    + `\n     🔑 값이 아니라 **관계**입니다 — 「130이다」가 아니라 「조합을 바꿔도 안 변한다」예요.`
    + ` \`STAT_CAP\`을 옮겨도 이 문장은 그대로 삽니다`
    + `\n     🔒 그리고 **칸마다는 갈립니다** (${varies ? "갈림 ✔" : "🔴 여섯 칸이 전부 같아요"}) —`
    + ` 합만 보면 \`childCap\`이 통째로 죽어도 초록불이거든요`
    + `\n     예: [${BASE.rows[0].p.join(" ")}] → ${K.map((k, i) => `${k} ${BASE.statAll[0][i]}`).join(" · ")}`
    + (flat && emptyTotal === t0v ? "" : `\n     🔴 조합에 따라 합이 움직입니다 — 평균 천장이 새고 있어요`));
}
{
  const zero = (o) => K.every((k) => o[k] === 0);
  const ok = zero(BASE.empty) && zero(BASE.none) && zero(BASE.unknown);
  check(ok,
    `K-4. 📀 **옛 세이브가 정확히 중립이다** — \`[]\` · 칸 없음 · 모르는 키가 **여섯 칸 전부 정확히 0**`
    + `\n     \`[]\` → ${JSON.stringify(BASE.empty)}`
    + `\n     칸 없음 → ${JSON.stringify(BASE.none)} · 모르는 키(["zzz","qqq","ge"]) → ${JSON.stringify(BASE.unknown)}`
    + `\n     🔒 마이그레이션하지 않습니다(CLAUDE.md) — 새 필드는 **읽는 쪽**이 기본값을 줘요`
    + `\n     🔑 «모르는 키»에 🌙\`ge\`를 섞었습니다 — 초3은 **알려진 키인데도** 천장 몫이 0이거든요`
    + (ok ? "" : `\n     🔴 옛 세이브가 갑자기 무언가를 고른 것이 됩니다 — 진행 중인 커리어의 천장이 조용히 갈려요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * K-5. 🔑 **네 해가 각자 무엇을 하는가** — 성질이 다른 셋을 갈라 둡니다
 * ══════════════════════════════════════════════════════════════════════
 * 🔴 셋을 한 문장에 묶으면, 🌙 초3이 천장을 「안」 움직이는 것이 **고장으로 읽힙니다.**
 *    그건 고장이 아니라 **설계**예요 (초3은 나이곡선 축 · 133번 §4-3). */
{
  const capOf = (p) => BASE.rows.find((x) => x.p.join() === p.join()).o;
  const same = (a, b) => K.every((k) => a[k] === b[k]);
  /* 🧸 초1을 바꾸면 천장이 **바뀌어야** 합니다 */
  const y1 = !same(capOf(["ball", "fin", "gn", "h3"]), capOf(["body", "fin", "gn", "h3"]));
  /* 👦 초2를 바꾸면 천장이 **바뀌어야** 합니다 */
  const y2 = !same(capOf(["ball", "fin", "gn", "h3"]), capOf(["ball", "run", "gn", "h3"]));
  /* 🌙 초3을 바꾸면 천장은 **그대로여야** 합니다 (성질이 다른 축) */
  const y3 = Y3.every((c) => same(capOf(["ball", "fin", "ge", "h3"]), capOf(["ball", "fin", c, "h3"])));
  /* 🔑 초4를 바꾸면 천장이 **바뀌어야** 합니다 (h1 ↔ h2는 미는 짝이 다릅니다) */
  const y4 = !same(capOf(["ball", "fin", "gn", "h1"]), capOf(["ball", "fin", "gn", "h2"]));
  check(y1 && y2 && y3 && y4,
    `K-5. 🔑 **🧸초1 · 👦초2 · 🔑초4는 천장을 움직이고, 🌙초3은 「안」 움직인다**`
    + `\n     🧸 초1 ${y1 ? "움직임 ✔" : "🔴 안 움직임"} · 👦 초2 ${y2 ? "움직임 ✔" : "🔴 안 움직임"}`
    + ` · 🌙 초3 ${y3 ? "그대로 ✔" : "🔴 움직임"} · 🔑 초4 ${y4 ? "움직임 ✔" : "🔴 안 움직임"}`
    + `\n     🔑 **🌙초3이 안 움직이는 건 고장이 아니라 설계입니다** — 초3은 「시점(나이곡선)」 축이라`
    + ` \`GROW_TILT\`로 살고, 초4 \`h3\`도 \`GROW_TILT_HELD\`를 받지 천장 몫은 안 받아요`
    + `\n     🔴 이 넷을 **한 문장에 묶지 마세요** — 묶으면 «초3이 천장을 안 민다»가 고장으로 읽힙니다`);
}
{
  /* 🔑 **굳히기는 방향이 아니라 세기만** — h1이면 🧸초1의 두 칸이 **더 커야** 합니다.
   * 🔒 값이 아니라 **부등호**입니다. 계수를 바꿔도 그대로 살아요. */
  const capOf = (p) => BASE.rows.find((x) => x.p.join() === p.join()).o;
  const plain = capOf(["ball", "fin", "gn", "h3"]);   // 🌙 h3 — 천장 몫을 안 더하는 굳히기
  const h1 = capOf(["ball", "fin", "gn", "h1"]);
  const h2 = capOf(["ball", "fin", "gn", "h2"]);
  const up = (a, b) => K.filter((k) => a[k] > b[k]);
  const h1Up = up(h1, plain), h2Up = up(h2, plain);
  const ok = h1Up.length > 0 && h2Up.length > 0 && h1Up.join() !== h2Up.join();
  check(ok,
    `K-6. 🔑 **굳히기가 세기를 올린다 — 굳힌 해의 칸만** (h1 ↔ h2가 **다른 칸**을 올려요)`
    + `\n     🌙 h3(천장 몫 없음) 기준: 🧸 h1이 올린 칸 [${h1Up.join(" ")}] · 👦 h2가 올린 칸 [${h2Up.join(" ")}]`
    + `\n     🔒 값이 아니라 **부등호**입니다 — \`CHILD_CAP_STEP\`을 뭘로 놓든 성립해야 하는 문장이에요`
    + (ok ? `\n     🔑 두 목록이 **다릅니다** — 굳히기가 「무엇을」 굳혔는지 천장이 알고 있다는 뜻이에요`
      : `\n     🔴 굳히기가 세기를 안 올리거나, h1과 h2가 **같은 칸**을 올립니다`));
}
{
  /* 💾 **천장은 세이브에 안 실립니다** — 🔑 종속값은 관계로 삽니다. */
  const noCap = !BASE.saveKeys.some((k) => /cap/i.test(k));
  check(noCap,
    `K-7. 💾 **천장 값이 세이브에 안 실린다** — \`statCap\`을 여섯 번 부른 뒤 \`S\`의 칸: [${BASE.saveKeys.join(" ")}]`
    + `\n     🔑 저장하면 \`CHILD_CAP_STEP\`을 바꾼 날 **옛 세이브만 옛 천장**을 씁니다 — 종속값은 관계로 살아야 해요`
    + `\n     🔒 메모이즈는 \`S\` 밖(\`childCapMemo\`)에 둡니다 — \`S\`에 달면 그 칸이 세이브에 실려 나가요`
    + (noCap ? "" : `\n     🔴 \`S\`에 천장 칸이 생겼습니다`));
}

/* ══════════════════════════════════════════════════════════════════════
 * K-8. 🧪 **감도 — 계수를 갈아 끼워 가며 Σ를 봅니다**
 * ══════════════════════════════════════════════════════════════════════ */
console.log("── 🎚️ K-8. 계수 감도 (CHILD_CAP_STEP을 갈아 끼워서) ──");
function sweep(mutName) {
  return STEP_SWEEP.map((st) => {
    const h = open(st, mutName ? [mutName] : null);
    const bad = ALL.map((p) => sumOf(h.keys, h.cap(p))).filter((s) => s !== SUM_WANT).length;
    h.close();
    return { st, bad };
  });
}
const SWEEP_BASE = sweep(null);
{
  const ok = SWEEP_BASE.every((r) => r.bad === 0);
  check(ok,
    `K-8. 🎚️ **어떤 \`CHILD_CAP_STEP\`에서도 Σ = 0이다** — 쓸어 본 계수 ${STEP_SWEEP.length}개 × ${COMBOS}조합`
    + `\n     ${SWEEP_BASE.map((r) => `${r.st}: Σ≠0 ${r.bad}개`).join(" · ")}`
    + `\n     🔎 측정 조건 — 계수를 **검사가 직접** 갈아 끼웁니다. 🔒 소스의 값은 **안 읽어요** —`
    + ` balancer가 3.0을 1.5로 내려도 이 문장은 한 글자도 안 바뀝니다`
    + (ok ? "" : `\n     🔴 어떤 계수에서 Σ가 샙니다 — 우수리 되돌리기(잠금장치)를 보세요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * K-9. 🧮 **`q̄`가 진짜 평균인가** — 🔴 **가려진 자리를 직교로 엽니다**
 * ══════════════════════════════════════════════════════════════════════
 * 🚨 **「Σ = 0」만 보는 문장으로는 `q̄` 오류를 절대 못 잡습니다.** 우수리 되돌리기 루프가
 *    어긋난 만큼을 되돌려 놓고, 게다가 여섯 칸을 **같은 만큼** 밀어서 모양도 안 바뀌거든요 —
 *    **증상이 0장**입니다(「방어가 겹침」).
 * 🔧 그래서 **되돌리기를 끈 채** 3의 배수 계수에서 잽니다. 3의 배수면 반올림이 아무 일도
 *    안 하니, 남는 것은 **「중립화가 구조로 서 있는가」** 하나뿐이에요.
 * 🌍 이 문장이 서 있는 세계: 「Σq가 **짝수**인 세계」입니다 — 해마다 미는 칸이 둘씩이라
 *    그래요. 해마다 미는 칸 수가 홀수가 되는 판정이 나오면 **여기부터 다시 보세요**
 *    (그날은 3의 배수 계수에서도 반올림이 일을 해서 이 탐침이 흐려집니다). */
console.log("── 🧮 K-9. q̄가 진짜 평균인가 (되돌리기를 끈 직교 탐침) ──");
const PROBE_STEP = 3.0;   // 🔒 **탐침용 계수**입니다 — 소스의 값이 아니에요(3의 배수라야 반올림이 쉬어요)
function qbarProbe(extra) {
  const h = open(PROBE_STEP, ["NO_REPAIR"].concat(extra || []));
  const bad = ALL.map((p) => sumOf(h.keys, h.cap(p))).filter((v) => v !== SUM_WANT).length;
  h.close();
  return bad;
}
{
  const base = qbarProbe(null);
  check(base === 0,
    `K-9. 🧮 **중립화가 「구조로」 선다** — 우수리 되돌리기를 끈 채 계수 ${PROBE_STEP}에서도 Σ = 0 (Σ≠0 ${base}/${COMBOS})`
    + `\n     🔎 측정 조건 — 🔴 **되돌리기 루프를 일부러 끄고** 잽니다. 켠 채로는 그 루프가`
    + ` \`q̄\` 오류를 되돌려 놔서 **증상이 0장**이에요(실측: q̄를 1로 박아도 Σ≠0이 0/81)`
    + `\n     🔒 계수 ${PROBE_STEP}은 **탐침용**입니다 — 3의 배수라야 반올림이 쉬어서 \`q̄\`만 남아요.`
    + ` 소스의 계수(확정 ${STEP_CONFIRMED})와는 아무 상관이 없습니다`
    + (base === 0 ? `\n     🔑 \`q̄ = Σq ÷ STAT_DEFS.length\`가 종속값으로 살아 있다는 뜻이에요 — 6을 박으면 칸이 바뀐 날 샙니다`
      : `\n     🔴 되돌리기 없이는 Σ가 샙니다 — 중립화가 **구조가 아니라 수리로** 서 있어요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * K-10. 🎚️ **확정 계수와 재측정 조건** (balancer 135번)
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 여기 두 줄만 **값**을 봅니다 — 위 K-1~K-9는 계수를 뭘로 놓든 성립하는 문장이에요.
 *    🔴 밸런스 계약과 산식 계약을 **한 문장에 묶지 마세요.** 묶으면 계수를 만질 때마다
 *      산식 검사가 같이 빨간불이 되고, 그때부터 아무도 안 봅니다. */
console.log("── 🎚️ K-10. 확정 계수와 재측정 조건 ──");
const FS = require("fs"), PATH = require("path"), DIR = require("./_load.js").PAGE_DIR;
const srcOf = (f) => FS.readFileSync(PATH.join(DIR, f), "utf8");
{
  const m = srcOf("game.js").match(/const CHILD_CAP_STEP = ([\d.]+);/);
  const cur = m ? parseFloat(m[1]) : NaN;
  const inWin = cur >= STEP_WIN_LO && cur <= STEP_WIN_HI;
  /* 🚧 **알려진 상태입니다 — 종료 코드에 안 셉니다.**
   * balancer가 ${STEP_CONFIRMED}를 확정했지만, inspector가 \`tests/\`를 잡고 있어서
   * engineer가 \`beta/\`에 아직 안 넣었어요. **한 줄(3.0 → 1.5)**이면 ✅로 바뀝니다.
   * 🔴 여기를 ❌로 두면 이 파일이 「원래 빨간불인 검사」가 되어 옆의 진짜 실패를 먹습니다. */
  console.log(`${inWin ? "✅" : "🚧"} K-10a. 🎚️ **\`CHILD_CAP_STEP\`이 확정 창 \`${STEP_WIN_LO} ~ ${STEP_WIN_HI}\` 안에 있다** — 지금 소스 **${cur}**`
    + `\n     ⭐ balancer 확정값 **${STEP_CONFIRMED}** (135번) — 만 30세 정렬 폭 2.23~3.27%p · 밴드 3.60%p`
    + `\n     🚨 창이 \`${STEP_WIN_LO}~${STEP_WIN_HI}\`뿐입니다 — **여유 양쪽 8~9%.** 아래는 🏃wg(0.5% 바닥)가, 위는 fw가 묶어요`
    + (inWin ? "" : `\n     🚧 **고칠 곳 한 줄**: \`beta/winger2/game.js\`의 \`const CHILD_CAP_STEP = ${cur};\` → \`${STEP_CONFIRMED};\``
      + `\n        (임시 주석 「🚧 임시 (balancer 확정 전)」도 같이 지우세요)`
      + `\n        🔒 종료 코드에는 안 셉니다 — 산식 검사(K-1~K-9)는 이 값과 무관하게 전부 초록불이에요`));
}
{
  /* 🔒 **재측정 조건** — 창을 잰 그날의 지문입니다. 하나라도 움직이면 창이 **모르는 값**이 돼요. */
  const moved = [];
  for (const [f, list] of Object.entries(REMEASURE)) {
    const src = srcOf(f);
    for (const [re, want] of list) {
      const hit = src.match(re);
      if (!hit) moved.push(`${f}: ${re} — 🔴 모양이 바뀌어 **읽을 수가 없습니다**`);
      else if (hit[1].replace(/\s+/g, " ").trim() !== want) moved.push(`${f}: ${hit[1].replace(/\s+/g, " ").trim()} (잰 날 ${want})`);
    }
  }
  check(moved.length === 0,
    `K-10b. 🔒 **재측정 조건 — 창을 잰 그날의 계수 넷이 그대로다** (\`BLEND_W\` · \`STAT_CAP\` · \`CHILD_TALENT\` 짝 · \`FOCUS_W_HELD\`)`
    + `\n     🔑 **값을 계약으로 삼는 게 아니라 「움직였는지」를 봅니다.** 이 넷 중 하나만 움직여도`
    + ` \`${STEP_WIN_LO}~${STEP_WIN_HI}\` 창이 **모르는 값**이 돼요 — 여유가 8~9%뿐이라 한 번에 넘어갑니다`
    + (moved.length
      ? `\n     🔴 움직인 것 ${moved.length}개:\n       · ${moved.join("\n       · ")}`
        + `\n     👉 **balancer에게 창을 다시 재 달라고** 하고, 새 값으로 위 두 줄을 갱신하세요`
      : `\n     ✔ 그대로입니다 — 창을 그대로 믿어도 됩니다`));
}

/* ══════════════════════════════════════════════════════════════════════
 * 🧪 변이 — **기준선이 초록불인 것을 먼저 찍고** 겁니다
 * ══════════════════════════════════════════════════════════════════════ */
console.log(`\n── 🧪 변이 — 되돌리면 정말 빨간불이 뜨는가 (기준선 ${fail === 0 ? "🟢 초록불" : "🔴 빨간불"}) ──`);
if (fail !== 0) {
  console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다 — 위를 먼저 고치세요.");
  console.log("   🔑 이미 빨간불인 검사는 **남의 변이 신호까지 먹습니다** (CLAUDE.md 실패 유형표).");
} else {
  /* 🔴 K-M4는 **여기서만** 잡힙니다 — 아래 「감도 조건」이 그 사실을 스스로 찍어요. */
  const S4 = sweep("NO_REPAIR");
  const caught = S4.filter((r) => r.bad > 0);
  const atShipped = S4.find((r) => r.st === 3.0);
  check(caught.length > 0,
    `🧪🔑 **변이 K-M4 — 🧮 우수리 되돌리기 루프를 지움** → K-8이 빨간불`
    + `\n     ${S4.map((r) => `${r.st}: Σ≠0 ${r.bad}/${COMBOS}`).join(" · ")}`
    + `\n     🚨 **\`CHILD_CAP_STEP = 3.0\`에서는 Σ≠0이 ${atShipped ? atShipped.bad : "?"}개** —`
    + ` 소스의 값 그대로만 재면 **이 변이는 안 잡힙니다**`
    + `\n     🔑 Σq가 늘 짝수라 3의 배수 계수에서는 \`3q − Σq/2\`가 전부 정수예요 —`
    + ` 반올림이 아무 일도 안 하니 **되돌릴 우수리가 애초에 안 생깁니다**`
    + (caught.length ? `\n     ✔ 잡힌 계수: ${caught.map((r) => `${r.st}(${r.bad}개)`).join(" · ")}` : ""));
  /* 🔒 **감도 조건 — 쓸이가 죽지 않았는가.** 3의 배수가 아닌 값이 목록에 남아 있어야 해요. */
  const nonMul3 = STEP_SWEEP.filter((s) => Math.abs(s / 3 - Math.round(s / 3)) > 1e-9);
  check(nonMul3.length > 0 && caught.some((r) => nonMul3.includes(r.st)),
    `🧪 **감도 조건 — 쓸이에 「3의 배수가 아닌」 계수가 살아 있다** (${nonMul3.join(" · ")})`
    + `\n     🔑 여기가 비면 K-8이 **아무것도 안 지키는 초록불**이 됩니다 —`
    + ` 그게 「계수 값에 따라 변이가 안 잡히는」 자리예요`);

  /* 🧮 **K-M1 — `q̄`를 상수로 박기.** 🔴 K-1(Σ=0)은 **안 뭅니다** — 되돌리기가 가리거든요.
   *    K-9(직교 탐침)만 물어야 해요. 그 둘을 여기서 **같이** 확인합니다. */
  {
    const q9 = qbarProbe(["QBAR_FIX"]);
    const h1 = open(null, ["QBAR_FIX"]);
    const sigma = ALL.filter((p) => sumOf(h1.keys, h1.cap(p)) !== SUM_WANT).length;
    h1.close();
    check(q9 > 0,
      `🧪🔑 **변이 K-M1 — 🧮 \`q̄\`를 상수 1로 박음** → **K-9(직교 탐침)**가 빨간불`
      + `\n     K-9 탐침(되돌리기 끔 · 계수 ${PROBE_STEP}): Σ≠0 **${q9}/${COMBOS}**`
      + `\n     🚨 같은 변이인데 **K-1(Σ=0)은 Σ≠0이 ${sigma}/${COMBOS}** — 즉 **안 뭅니다.**`
      + ` 우수리 되돌리기가 어긋난 만큼을 되돌려 놓고 여섯 칸을 같은 만큼 밀거든요`
      + `\n     🔑 이게 「방어가 겹침」입니다 — 가리는 줄은 **단독으로는 증상이 없어** 존재 자체가 안 보여요`
      + (q9 > 0 ? "" : `\n     🔴 직교 탐침도 안 뭅니다 — \`q̄\`를 지키는 문장이 **한 줄도 없습니다**`));
    check(sigma === 0,
      `🧪 **변이 K-M1 → K-1는 초록불로 남아야** 한다 — 🔑 **그게 K-9가 있어야 하는 이유**입니다`
      + `\n     🔴 이 줄이 빨간불이면 K-9를 지워도 된다는 뜻이 아니라, 되돌리기가 안 도는 겁니다`);
  }

  const CASES = [
    /* [변이, 물어야 하는 문장, 무는지 재는 함수] */
    ["ONE_CAP", "K-2", (h) => ALL.every((p) => spreadOf(h.keys, h.cap(p)) < MIN_SPREAD)],
    ["CAP_UNWIRE", "K-3", (h) => {
      const a = ALL.map((p) => h.stat(p));
      return !a.some((x) => new Set(x).size > 1);      // 칸마다 갈리는 게 사라집니다
    }],
    ["OLD_NOT_NEUTRAL", "K-4", (h) => !h.keys.every((k) => h.cap([])[k] === 0)],
    ["NO_TALENT_Q", "K-5", (h) => {
      const a = h.cap(["ball", "fin", "gn", "h3"]), b = h.cap(["ball", "run", "gn", "h3"]);
      return h.keys.every((k) => a[k] === b[k]);       // 👦 초2가 천장에서 사라짐
    }],
    ["CAP_SAVED", "K-7", (h) => h.saveKeys(["ball", "fin", "ge", "h1"]).some((k) => /cap/i.test(k))],
  ];
  for (const [name, guard, bites] of CASES) {
    let hit = null, err = null;
    try { const h = open(null, [name]); hit = bites(h); h.close(); } catch (e) { err = e; }
    check(hit === true,
      `🧪 **변이 ${name}** → **${guard}가 빨간불**이어야 한다`
      + (hit === true ? "" : `\n     🔴 안 잡혔어요 — ${guard}가 아무것도 안 지킵니다${err ? ` (${err.message})` : ""}`));
  }

  /* ══════════════════════════════════════════════════════════════════
   * 🔒 **반대 방향** — 물면 안 되는 것도 확인합니다
   * ══════════════════════════════════════════════════════════════════
   * 🔑 성질이 다른 것을 한 문장에 묶지 않았다는 증거예요. */
  const KEEP = [
    /* 🔗 배선만 끊은 변이는 **Σ도 중립도 안 건드립니다** — K-1이 물면 그건 K-1이 너무 넓다는 뜻 */
    ["CAP_UNWIRE", "K-1", (h) => ALL.every((p) => sumOf(h.keys, h.cap(p)) === SUM_WANT)],
    /* 👦 초2를 천장에서 뺀 변이도 **Σ는 그대로** — 몫이 줄었을 뿐 중립화는 살아 있어요 */
    ["NO_TALENT_Q", "K-1", (h) => ALL.every((p) => sumOf(h.keys, h.cap(p)) === SUM_WANT)],
    /* 💾 저장 변이는 **값을 한 톨도 안 바꿉니다** */
    ["CAP_SAVED", "K-1", (h) => ALL.every((p) => sumOf(h.keys, h.cap(p)) === SUM_WANT)],
  ];
  for (const [name, guard, stays] of KEEP) {
    let ok = null, err = null;
    try { const h = open(null, [name]); ok = stays(h); h.close(); } catch (e) { err = e; }
    check(ok === true,
      `🧪 **변이 ${name} → ${guard}는 초록불로 남아야** 한다 (문장끼리 성질이 안 섞였다는 증거)`
      + (ok === true ? "" : `\n     🔴 ${guard}가 남의 변이까지 뭅니다 — 문장이 너무 넓어요${err ? ` (${err.message})` : ""}`));
  }
}

console.log(`\n${fail ? `❌ 빨간불 ${fail}건` : "✅ 전부 통과"} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
process.exit(fail ? 1 : 0);
