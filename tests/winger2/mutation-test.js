/* ⚽ 더 윙어 II — 변이 검증 (설계 13번 §12-5 · §10-3)
 *
 * 설계가 못박은 세 가지:
 *   "SPOT을 1로 되돌리면 1번이, sc(x)를 1로 고정하면 12번이,
 *    fatigue가 도움을 세게 하면 11번이 **반드시 빨간불**이어야 한다."
 * 여기에 두 개를 더 답니다 —
 *   D. condMul을 STEP 3 무게에도 걸면 (설계 검사 19번)
 *   E. 🌟 에이스 후보에 **나를 다시 넣으면** (22번 항목 20 — 2026-08-28 사고의 재발 방지)
 *
 * 이 파일은 그 셋을 **실제로 소스를 갈아치워** 확인합니다.
 *   ① 지금 엔진에서 초록불인가          (기준선)
 *   ② 변이를 넣으면 빨간불이 되는가      (변이 검증)
 * 둘 다 만족해야 그 검사가 무언가를 지키는 거예요. ②가 안 되면 그 검사는 실패한 겁니다.
 *
 * 🚨 문턱은 **전부 이 파일에 직접 적었습니다.** _t.K나 MOM_MIN에서 읽어 오면
 *    상수를 바꿔도 검사가 따라가서 아무것도 안 잡혀요 (13번 §10-3).
 *    괄호 안 숫자는 2026-08-28 실측값이고, 문턱은 그 사이에 박았습니다.
 *
 * 🎲 시드를 박았으니 이 검사는 **완전히 결정론적**입니다. 같은 소스면 같은 숫자예요.
 */
"use strict";
const { load, mutsOK, xiOf, play } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ── 변이 셋. 정규식이 안 걸리면 load()가 던집니다 (조용히 무변이로 통과하는 걸 막아요) ── */
const MUT = {
  SPOT1: [[/const SPOT = 4\.00;/, "const SPOT = 1.00;"]],
  SC1: [[/const sc = \(ability\) => mid\(ability\) \/ SC_REF;/, "const sc = () => 1;"]],
  FAT_A: [[/ {6}bump\(scorer\);\n/, "      bump(scorer); if (assister) bump(assister);\n"]],
};
/* V0 구조 회귀 = ① 나를 에이스 후보에 다시 넣고 ② SPOT/NPC_SPOT을 배타적으로.
 * 두 줄을 **같이** 되돌려야 그때의 구조가 됩니다 — 한 줄만 바꾸면 다른 엔진이에요. */
const MUT_ACE_V0 = [
  [/const pool = xi\.filter\(\(x\) => want\.indexOf\(x\.pos\) >= 0 && !x\.me\);\n {4}const list = pool\.length \? pool : xi\.filter\(\(x\) => !x\.me\);/,
    "const pool = xi.filter((x) => want.indexOf(x.pos) >= 0);\n    const list = pool.length ? pool : xi.slice();"],
  /* ⚠️ 2026-08-28(밤) 갱신 — `NPC_SPOT`이 **숫자에서 카드 종류별 객체로** 바뀌었어요
   * (`{ goal: 2.80, assist: 5.80, defend: 4.50 }`). 옛 정규식(`NPC_SPOT : 1`)이 안 걸려서
   * 이 파일이 **두 게이트째 죽어 있었습니다** — 초록불이 아니라 *안 돈* 상태였어요.
   * 그 사이 계수 여덟과 ACE_POOL 두 자리가 움직였는데 승자독식 계단이
   * 되살아났는지 아무도 안 봤습니다. 맨 위 MUTS 검사가 그걸 막습니다. */
  [/ {6}\* \(row === ace \? \(NPC_SPOT\[kind\] \|\| NPC_SPOT\.goal\) : 1\)\n {6}\* \(row\.me \? ME_P \* SPOT : 1\);/,
    "      * (row === ace ? (row.me ? SPOT : (NPC_SPOT[kind] || NPC_SPOT.goal)) : 1)\n      * (row.me ? ME_P : 1);"],
];

/* 검사 D — condMul을 STEP 3 무게에도 겁니다. 세 줄이 한 벌이에요. */
const MUT_COND3 = [
  [/const COND_REF = 80;/, "const COND_REF = 80;\n  let _condHack = 80;"],
  [/const cond = c\.condition;/, "const cond = c.condition; _condHack = cond;"],
  [/ {6}\* \(row\.me \? ME_P \* SPOT : 1\);/, "      * (row.me ? ME_P * SPOT * condMul(_condHack) : 1);"],
];

/* ══════════════════════════════════════════════════════════════
 * 🔎 0. **변이 정규식이 지금 소스에 걸리나** — 다른 무엇보다 먼저 봅니다
 *
 * 🔴 이 저장소에서 **세 번** 난 사고예요. 변이 정규식은 소스 **문자열**에 의존하니,
 *    누가 그 줄의 모양을 바꾸면 정규식이 안 걸리고 `load()`가 던져서 **파일이 죽습니다.**
 *    그런데 모아 돌릴 때는 `❌ 실패 1건`으로만 보여서 *안 돈 것*과 *빨간불*이 구분이 안 돼요.
 *
 *      ② 검사 D의 `ME_P : 1`        — 여러 커밋 동안 D·D-변이가 안 돌았습니다
 *      ③ 검사 E의 `NPC_SPOT : 1`    — **두 게이트째** 안 돌았습니다 (NPC_SPOT이 객체가 됐어요)
 *
 * 🔧 그래서 **여기서 먼저** 전부 대조합니다. 안 걸리면 **죽는 대신 ❌ 한 줄**로 떠요 —
 *    그러면 "검사가 안 돈다"가 곧바로 눈에 보이고, 나머지 검사는 계속 돕니다.
 *    (`_load.js`도 크래시를 **종료 코드 2**로 갈라 줍니다 — 1(빨간불)과 안 섞여요.)
 * ══════════════════════════════════════════════════════════════ */
const ALL_MUTS = { ...MUT, ACE_V0: MUT_ACE_V0, COND3: MUT_COND3 };
const BAD = new Set();
/* 🩹 안 걸린 변이는 **건너뛰지 않고** 그 자리에서 ❌를 냅니다 —
 * 조용히 통과하면 "변이 검증이 있다"는 거짓말이 남아요.
 * 대신 **죽지는 않아서** 나머지 검사(기준선 포함)는 계속 돕니다. */
function loadMut(name, muts) {
  if (BAD.has(name)) return null;
  return load(muts);
}
function mutCheck(name, E, msgFn) {
  if (E === null) {
    check(false, `${name}-변이가 **안 돌았습니다** — 정규식이 지금 소스와 안 맞아요 (0번 참고). 초록불이 아닙니다`);
    return false;
  }
  return true;
}
{
  const bad = mutsOK(ALL_MUTS);
  for (const b of bad) BAD.add(b.split(":")[0].replace(/\(치환 무효\)$/, ""));
  check(bad.length === 0,
    `0. 변이 정규식 ${Object.values({ ...MUT, a: MUT_ACE_V0, c: MUT_COND3 }).reduce((n, m0) => n + m0.length, 0)}개가`
    + ` 지금 beta/winger2/engine.js에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
        + `\n     engine.js에서 그 줄을 찾아 정규식을 새 모양으로 고치세요.`
      : ""));
}

/* ══════════════════════════════════════════════════════════════
 * 검사 A — 🌟 스포트라이트가 내 생산량을 만든다  (설계 검사 1번 계열)
 *   SPOT을 1로 되돌리면 시즌 골·도움이 무너져야 합니다.
 *
 * 🔴 2026-08-28 문턱 갱신 — **옛 문턱(fw 18.0 · wg 26.0)은 V0에서 잰 값이었습니다.**
 *    V0는 🌟 에이스 승자독식 계단이 살아 있던 엔진이에요. 그 계단 위에서는
 *    미드필더·윙어가 전개 장면을 독식해서 **도움이 40% 부풀어 있었고**(mf110 28.1 vs 목표 19.7),
 *    옛 문턱은 그 부푼 값(당시 22.4 / 30.1)의 바로 아래에 박혀 있었어요.
 *    즉 **없애기로 한 동작을 검사가 지키고 있었습니다.** 22번이 계단을 없애자
 *    16.4 / 20.0으로 내려왔고, 옛 문턱은 "고친 것"을 빨간불로 잡았습니다.
 *
 * ✅ 새 문턱의 근거 — **(라′) 능력치 110 목표를 130의 바닥으로 씁니다.**
 *      (라′) 110 목표: fw 시즌 14.4골 · wg 시즌 17.1도움  (22번 §①-A 표)
 *    이 픽스처(동료 70 · 전력 70:70 · 조작 0.5)는 22번의 "단독 측정"과 같은 눈금이에요 —
 *    같은 조건 110에서 fw 13.3 / wg 16.7이 나와 22번의 V1 실측(13.9 / 16.4)과 맞습니다.
 *    **능력치 130이 110 목표 아래로 내려가면 성장이 죽은 겁니다.**
 *    지금 실측 fw130 16.4 (여유 +14%) · wg130 20.0 (여유 +17%) · SPOT=1 변이 6.8 / 8.8.
 *
 * 🚨 값을 이 파일에 **직접 적습니다.** 소스나 설계 문서에서 읽어 오면 계수를 바꿔도
 *    검사가 따라가서 아무것도 안 잡혀요.
 * ══════════════════════════════════════════════════════════════ */
const FW130_GOALS_MIN = 14.4;      // (라') fw110 목표 — 문턱, 소스에서 읽지 않습니다
const WG130_ASSIST_MIN = 17.1;     // (라') wg110 목표
function measureSpot(E) {
  return {
    fwG: play(E, "fw", 130, { n: 3000, seed: 3, mateBase: 70 }).season.g,
    wgA: play(E, "wg", 130, { n: 3000, seed: 3, mateBase: 70 }).season.a,
  };
}
{
  const base = measureSpot(load());
  const E1 = loadMut("SPOT1", MUT.SPOT1);
  const mut = E1 && measureSpot(E1);
  check(base.fwG >= FW130_GOALS_MIN && base.wgA >= WG130_ASSIST_MIN,
    `A. 능력치 130 시즌 생산량 — fw 골 ${base.fwG.toFixed(1)} ≥ ${FW130_GOALS_MIN} · wg 도움 ${base.wgA.toFixed(1)} ≥ ${WG130_ASSIST_MIN}`);
  if (mutCheck("A(SPOT1)", E1)) check(!(mut.fwG >= FW130_GOALS_MIN && mut.wgA >= WG130_ASSIST_MIN),
    `A-변이. SPOT을 1로 되돌리면 빨간불이 된다 (fw 골 ${mut.fwG.toFixed(1)} · wg 도움 ${mut.wgA.toFixed(1)})`);
}

/* ══════════════════════════════════════════════════════════════
 * 검사 B — 🔒 자동 확률이 능력치를 탄다  (설계 검사 12번)
 *   sc(x)를 1로 고정하면 **동료 수비수 능력치가 실점에 전혀 안 닿습니다.**
 *   팀 전력(atkW/defW)은 고정하고 **명단의 str만** 갈아서 sc만 갈리게 했어요.
 *   실측: 실점 감소율 22.9~23.2% → −1.7~1.0% · 팀 득점 증가율 13~15% → 1~2%
 *
 *   ⚠️ 여기서 픽스처가 중요해요. 동료를 전부 str 70으로 두면 sc(70)=1이라
 *      **변이를 넣어도 아무 일이 안 일어납니다** (실제로 처음에 그렇게 짰다가
 *      초록불인데 아무것도 안 지키는 검사가 됐어요). 그래서 45 vs 95로 갈랐습니다.
 * ══════════════════════════════════════════════════════════════ */
const CONCEDE_DROP_MIN = 12;       // % — 문턱
const TEAMGOAL_GAIN_MIN = 7;       // %
function measureSc(E) {
  const weak = play(E, "fw", 110, { n: 3000, seed: 5, mateBase: 45 });
  const strong = play(E, "fw", 110, { n: 3000, seed: 5, mateBase: 95 });
  return {
    drop: 100 * (1 - strong.perMatch.og / weak.perMatch.og),
    gain: 100 * (strong.perMatch.tg / weak.perMatch.tg - 1),
  };
}
{
  const base = measureSc(load());
  const E1 = loadMut("SC1", MUT.SC1);
  const mut = E1 && measureSc(E1);
  check(base.drop >= CONCEDE_DROP_MIN && base.gain >= TEAMGOAL_GAIN_MIN,
    `B. 동료 능력치가 자동 확률에 실린다 — 실점 ${base.drop.toFixed(1)}% ↓ (≥${CONCEDE_DROP_MIN}) · 팀 득점 ${base.gain.toFixed(1)}% ↑ (≥${TEAMGOAL_GAIN_MIN})`);
  if (mutCheck("B(SC1)", E1)) check(!(mut.drop >= CONCEDE_DROP_MIN && mut.gain >= TEAMGOAL_GAIN_MIN),
    `B-변이. sc(x)를 1로 고정하면 빨간불이 된다 (실점 ${mut.drop.toFixed(1)}% ↓ · 팀 득점 ${mut.gain.toFixed(1)}% ↑ — 수비 능력치가 실점에 안 닿아요)`);
}

/* ══════════════════════════════════════════════════════════════
 * 검사 C — 🥵 fatigue는 **내가 넣은 골만** 센다  (설계 검사 11번)
 *   도움까지 세면 전개 카드가 결정 카드를 잡아먹습니다.
 *
 *   재는 법: 그 경기 내 **첫 크레딧이 골이었을 때** vs **도움이었을 때**,
 *   남은 카드 중 내가 주인공이 된 비율. 골 뒤에는 무게가 1/(1+FAT)로 깎이고
 *   도움 뒤에는 안 깎이니 비가 1보다 뚜렷이 커야 해요.
 *   이 지표는 SPOT 변이에는 **반대 방향으로** 움직여요(1.39~1.56) — fatigue에 특이합니다.
 *
 * 🔴 2026-08-28 문턱·표본 갱신 (22번 §①-C-② 권고)
 *    옛 문턱 1.18 / n=9,000은 **V0 엔진에서 잰 값**이었고, V0 기준선이 1.18~1.22로
 *    문턱에 정확히 걸터앉아 시드에 따라 갈렸습니다. 🌟 에이스 계단이 저연차 카드를
 *    눌러 놔서 표본이 골뒤/도움뒤로 안 갈렸던 거예요.
 *    새 구조에서 다시 쟀습니다 (n=12,000 · 시드 3개):
 *      기준선 1.311 / 1.308 / 1.315   변이(도움도 셈) 1.039 / 1.019 / 1.006
 *    시드 편차가 ±0.004로 붙어 있고, 기준선과 변이 사이가 텅 비어 있어요.
 *    **문턱 1.20**은 그 사이에 있고 기준선에서 9% 아래, 변이에서 15% 위입니다.
 * ══════════════════════════════════════════════════════════════ */
/* 🔴 2026-08-28(오후) 다시 내렸습니다 — 1.20 → **1.12**
 *    🅳 후보 D 한 벌(38번)에서 `NPC_SPOT`이 7.00 → 2.90으로 내려가면서
 *    기준선이 1.311 → **1.205~1.248**(시드 4개)로 함께 내려왔어요.
 *    1.20을 그대로 두면 **시드 101에서 여유가 0.4%**밖에 안 남습니다 —
 *    계수를 한 번만 더 건드려도 "고장 나서가 아니라 우연히" 빨간불이 돼요.
 *    그때그때 갈리는 검사는 아무도 안 믿게 됩니다.
 *    변이는 여전히 **1.009~1.021**로 깨끗이 갈리니, 1.12는 기준선에서 7.6% 아래 ·
 *    변이에서 9.7% 위 — 양쪽에 여유가 있습니다.
 * ⚠️ **balancer G-9 재측정 대기 중**입니다. 계수가 굳으면 다시 재서 조여 주세요. */
const AFTER_RATIO_MIN = 1.12;      // 문턱 (후보 D 기준선 1.205~1.248 · 변이 1.009~1.021)
const CARDS_MIN = 1.55;            // mf150·약한 동료의 경기당 순간 카드 수 (V1에서 2.30)
const FAT_N = 12000;               // 표본 (22번 확정 — 9,000에서는 시드에 따라 갈렸어요)
function measureFat(E, seed, n) {
  E._t.seed(seed); E._t.skill = 0.5;
  let ag = 0, ng = 0, aa = 0, na = 0, cards = 0, m = 0;
  for (let i = 0; i < n; i++) {
    const r = E._t.playMatch({ xi: xiOf("wg", 150, 60), oppName: "상대", teamStr: 88, oppStr: 52, condition: 80 });
    let first = null;
    for (const c of r.cards) {
      if (first === null) { if (c.credit.g) first = "g"; else if (c.credit.a) first = "a"; continue; }
      if (c.kind === "filler" || c.kind === "kick" || c.kind === "half" || c.kind === "end") continue;
      if (first === "g") { ng += 1; if (c.mine) ag += 1; } else { na += 1; if (c.mine) aa += 1; }
    }
  }
  E._t.seed(seed + 1); E._t.skill = 0.5;
  for (let i = 0; i < n; i++) {
    cards += E._t.playMatch({ xi: xiOf("mf", 150, 45), oppName: "상대", teamStr: 95, oppStr: 45, condition: 80 }).mineCards;
    m += 1;
  }
  return { ratio: (aa / na) / (ag / ng), cards: cards / m };
}
{
  const base = measureFat(load(), 5, FAT_N);
  const E1 = loadMut("FAT_A", MUT.FAT_A);
  const mut = E1 && measureFat(E1, 5, FAT_N);
  check(base.ratio >= AFTER_RATIO_MIN && base.cards >= CARDS_MIN,
    `C. 도움은 피로를 안 쌓는다 — 도움 뒤/골 뒤 카드 획득비 ${base.ratio.toFixed(3)} (≥${AFTER_RATIO_MIN}) · mf150 카드/경기 ${base.cards.toFixed(3)} (≥${CARDS_MIN})`);
  if (mutCheck("C(FAT_A)", E1)) check(!(mut.ratio >= AFTER_RATIO_MIN && mut.cards >= CARDS_MIN),
    `C-변이. fatigue가 도움을 세게 하면 빨간불이 된다 (비 ${mut.ratio.toFixed(3)} · 카드/경기 ${mut.cards.toFixed(3)})`);
}

/* ══════════════════════════════════════════════════════════════
 * 검사 D — 🫀 condMul이 STEP 3 무게에 안 걸린다  (설계 검사 19번)
 *   STEP 3에 또 걸면 컨디션 편차가 세제곱이 됩니다.
 *
 *   재는 법: **수비수의 🧱 수비 장면 점유율.** pBig(STEP 2)는 우리 공격 장면에만
 *   걸리니 수비 장면 점유율은 컨디션에 안 움직여야 해요. STEP 3 무게에 걸면
 *   내 무게가 통째로 condMul만큼 오르내려서 점유율이 따라 움직입니다.
 *   실측: −0.42% (안 움직임) → 변이 +9.50%
 * ══════════════════════════════════════════════════════════════ */
const COND_SHARE_GAIN_MAX = 2.0;   // % — 문턱
{
  const share = (E, cond) => {
    E._t.seed(13); E._t.skill = 0.5;
    let mine = 0, plays = 0;
    for (let i = 0; i < 5000; i++) {
      const r = E._t.playMatch({ xi: xiOf("df", 110, 60), oppName: "상대", teamStr: 70, oppStr: 70, condition: cond });
      for (const c of r.cards) if (c.kind === "defend") { plays += 1; if (c.mine) mine += 1; }
    }
    return mine / plays;
  };
  const measure = (E) => 100 * (share(E, 100) / share(E, 0) - 1);
  const base = measure(load());
  /* ⚠️ 2026-08-28 — 이 변이의 정규식이 **소스와 안 맞아 load()가 던지고 있었습니다.**
   * 🌟 에이스 구조 수정으로 마지막 줄이 `ME_P : 1` → `ME_P * SPOT : 1`로 바뀌었는데
   * 정규식이 옛 모양을 보고 있었어요. 그 결과 **이 파일이 검사 D 앞에서 죽었고**,
   * 마지막 줄만 보던 사람에게는 "실패 1건"으로만 보여서 D·D-변이 두 검사가
   * 여러 커밋 동안 **한 번도 안 돌았습니다.** 크래시는 초록불도 빨간불도 아닙니다. */
  const E1 = loadMut("COND3", MUT_COND3);
  const mut = E1 === null ? null : measure(E1);
  check(base <= COND_SHARE_GAIN_MAX,
    `D. condMul이 STEP 3 무게에 안 걸린다 — 컨디션 0→100 수비 장면 점유율 변화 ${base.toFixed(2)}% (≤${COND_SHARE_GAIN_MAX})`);
  if (mutCheck("D(COND3)", E1)) check(!(mut <= COND_SHARE_GAIN_MAX),
    `D-변이. STEP 3 무게에도 걸면 빨간불이 된다 (변화 ${mut.toFixed(2)}% — 편차가 겹쳐요)`);
}

/* ══════════════════════════════════════════════════════════════
 * 검사 E — 🌟 에이스는 **나와 경쟁자에게 동시에** 걸린다  (22번 inspector 항목 20·21)
 *
 * 🔴 이 검사는 **2026-08-28에 실제로 난 사고의 재발을 막는 자리**입니다.
 *
 *   무슨 일이 있었나 — engine.js의 `aceOf`가 **나도 에이스 후보에 넣어서**,
 *   클럽마다 에이스가 한 명인 **승자독식**이 됐습니다. 내가 팀 최강을 넘는 순간
 *   나는 `SPOT × ME_P`를 얻고 **경쟁자의 `NPC_SPOT`이 통째로 사라져요.**
 *   그게 designer가 §2-10에서 "폐기했다"고 적은 `ACE_W` 계단이 상수 이름만 바뀐 채
 *   살아남은 형태였습니다. 축이 fw 75→80에서 ×2.7 · mf 80→85에서 ×3.0으로 튀었고,
 *   **계단의 위치를 동료 전력이 정해서** 이적 페널티·저연차 붕괴·도움 40% 과다가
 *   전부 거기서 나왔어요. 계수로는 못 고치는 구조 결함이었습니다.
 *
 *   지금 규칙: **나는 늘 `SPOT`, 경쟁자 클럽 에이스는 늘 `NPC_SPOT`. 둘은 배타적이지 않습니다.**
 *
 * 🔬 재는 법 — 능력치 60~150을 5점 간격으로 훑어 **이웃 칸 카드 빈도의 비**를 봅니다.
 *   계단은 "어느 한 칸에서 갑자기 두 배"라는 모양이라 인접비가 바로 잡아요.
 *   문턱 1.35는 22번 inspector 항목 21에서 옮겨 적었습니다 (실측 최대 1.09 — 여유 24%).
 *   구조를 되돌리면 fw 1.94 · df 2.92로 튑니다.
 * ══════════════════════════════════════════════════════════════ */
const STEP_MAX = 1.35;             // 문턱 — 5점 사이 인접 비 (22번 항목 21)
function stepOf(E, pos) {
  const v = [];
  for (let ab = 60; ab <= 150; ab += 5) v.push([ab, play(E, pos, ab, { n: 1200, seed: 31, mateBase: 70 }).perMatch.cards]);
  let mx = 1, at = 0;
  for (let i = 1; i < v.length; i++) { const r = v[i][1] / v[i - 1][1]; if (r > mx) { mx = r; at = v[i][0]; } }
  return { mx, at, line: v.map(([a, c]) => `${a}:${c.toFixed(2)}`).join(" ") };
}
{
  const base = load();
  const mut = loadMut("ACE_V0", MUT_ACE_V0);
  for (const pos of ["fw", "df"]) {
    const b = stepOf(base, pos);
    check(b.mx <= STEP_MAX,
      `E. ${pos} — 능력치 5점 사이 카드 빈도가 계단이 아니다 (최대 비 ${b.mx.toFixed(2)} @ ${b.at} · ≤${STEP_MAX})`);
    if (!mutCheck(`E(${pos})`, mut)) continue;
    const m = stepOf(mut, pos);
    check(!(m.mx <= STEP_MAX),
      `E-변이. ${pos} — 🌟 에이스 후보에 나를 다시 넣으면 빨간불이 된다`
      + ` (최대 비 ${m.mx.toFixed(2)} @ 능력치 ${m.at} — 승자독식 계단이 돌아옵니다)`
      + `\n     ${m.line}`);
  }
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과 — 다섯 검사 모두 변이를 잡아냅니다");
process.exit(fail ? 1 : 0);
