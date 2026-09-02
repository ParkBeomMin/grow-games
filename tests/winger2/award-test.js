/* ⚽ 더 윙어 II — 🏆 부문상 갈래 검사 (autoMatch 크레딧 · raceRank · 부문상 판정)
 *
 * 🔴 **이 파일은 "검사가 없어서 못 잡은 자리"를 메우려고 만들었습니다.**
 *    engineer가 게이트 ①-G의 G-3(전개 크레딧)·G-5(철벽상 축)를 고친 뒤
 *    **원본으로 되돌려 봤는데 `tests/winger2/` 4종이 전부 초록불**이었어요.
 *    리그 도움이 +18.6% 움직이고 부문상 축이 통째로 갈렸는데 아무도 안 봤습니다.
 *
 *    구멍이 셋이었어요 —
 *      ① `autoMatch`의 크레딧 (경쟁 클럽) — `engine-test`는 `createMatch`의 카드만 봅니다
 *      ② `raceRank` (개인 순위표 집계)  — `career.js` 쪽 검사가 아예 없었어요
 *      ③ 부문상 판정 (누가 무슨 상을 받나)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚨 **값이 아니라 관계를 봅니다.** 문턱을 지금 박으면 안 되는 자리예요.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * G-3·G-5로 곡선이 움직였고 **도움÷골 0.881은 아직 확정값이 아닙니다** —
 * designer가 `shareByWeight` 처리를 판단 중이고, balancer가 G-2에서 `NPC_SPOT`을
 * 쪼갤 예정이며, `POS_AXIS`가 차단을 볼지 무실점을 볼지도 안 정해졌어요.
 * **그 값을 여기 박으면 다음 주에 상시 빨간불이 됩니다.**
 *
 * 그래서 이 파일이 지키는 건 전부 **관계**입니다:
 *   · 나와 경쟁자가 **같은 규칙**을 쓰는가 (두 갈래의 분포가 서로 일치하는가)
 *   · 주인공을 **어느 무게로** 뽑았는가 (득점자 분포가 GOAL_W 순서인가)
 *   · **표시와 판정이 같은 것**을 보는가 (raceValue ↔ raceRank의 val)
 *   · 정렬 축이 무엇인가 (무실점 → 차단 → 내 줄)
 * 절대값(도움÷골 · 수상률 · 시즌 무실점 수)은 **한 개도 안 박았습니다.**
 * 곡선이 굳은 뒤에 balancer 실측을 받아 따로 회귀 검사를 만드세요.
 *
 * 🎲 시드를 박았으니 결정론적입니다. ⏱️ 약 25초 (JSDOM 부팅 4회 포함).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
const { load, mutsOK, xiOf, xiAll, pagePre } = require("./_load.js");

const DIR = "/workspace/grow-games/beta/winger2";
const BETA = "/workspace/grow-games/beta";
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

const POS = ["fw", "wg", "mf", "df"];
const share = (o) => { const t = POS.reduce((s, p) => s + o[p], 0); const r = {}; for (const p of POS) r[p] = t ? o[p] / t : 0; return r; };
const gap = (a, b) => Math.max(...POS.map((p) => Math.abs(a[p] - b[p]))) * 100;
const fmt = (o) => POS.map((p) => `${p} ${(o[p] * 100).toFixed(1)}%`).join(" ");

/* 🧍 **나 없는 선발 11명.** `createMatch`의 모든 장면이 `autoAttack`을 지나가게 해서
 * `autoMatch`와 **같은 조건**으로 세웁니다. `me`가 있으면 내 장면만 미니게임 갈래로
 * 빠져서 두 갈래를 나란히 놓을 수 없어요. 이름이 P0~P10으로 다 달라서
 * 카드의 goalBy·assistBy(이름)를 포지션으로 되돌릴 수 있습니다.
 *
 * 🔴 **명단마다 `spin`을 돌립니다 — 한 벌만 쓰면 안 돼요.**
 * `_load.js`의 고정 SPREAD는 mateBase 70에서 언제나 `fw 59·77 / wg 67·83`을 내고,
 * `ACE_POOL.goal`이 `["fw","wg"]`가 된 뒤로는 **골 에이스가 100% 윙어**가 됩니다
 * (실제 게임은 49~50%). 그 한 벌로 포지션 분포를 재면 코드가 멀쩡해도 순서가 뒤집혀 보여요 —
 * 실제로 B-2가 그렇게 빨간불이었고, **결함은 검사 쪽에 있었습니다.**
 * 경기마다 다른 spin을 주면 명단 폭의 앙상블이 되어 실제 분포에 붙습니다. */
const xiNoMe = (base, spin) => xiAll(base, spin);

/* 🧪 이 파일이 쓰는 변이 전부 — 0번 검사가 여기 있는 정규식을 소스와 대조합니다. */
const MUT_TABLE = {
  "B-①전개주인공이득점자": [[/if \(kind === "goal"\) \{\n {10}if \(chance\(ASSIST_P2\)\) \{/,
    'if (kind === "goal" || true) {\n          if (chance(ASSIST_P2)) {']],
  "B-②마무리를a무게로": [[/scorer = rest\.length \? pickActor\(rest, "goal", hits\)\.who : who;/,
    'scorer = rest.length ? pickActor(rest, "assist", hits).who : who;']],
  "B-③share가전부결정출신": [[/const big = chance\(pBig\);\n {6}const \{ who \} = pickActor\(xi, big \? "goal" : "assist", hits\);/,
    'const big = true;\n      const { who } = pickActor(xi, "goal", hits);']],
  "B-3-fatigue를주인공에게": [[/ {8}hits\.set\(scorer, \(hits\.get\(scorer\) \|\| 0\) \+ 1\);/,
    "        hits.set(who, (hits.get(who) || 0) + 1);"]],
};
/* ══════════════════════════════════════════════════════════════
 * 🔎 0. **변이 정규식이 지금 소스에 걸리나** — 다른 무엇보다 먼저 봅니다
 *
 * 변이 정규식은 소스 **문자열**에 의존해요. 누가 그 줄의 모양을 바꾸면 정규식이
 * 안 걸리고 `load()`가 던져서 **파일이 그 자리에서 죽습니다** — 그런데 모아 돌릴 때는
 * `❌ 실패 1건`으로만 보여서 *안 돈 것*과 *빨간불*이 구분이 안 돼요.
 * 이 저장소에서 **세 번** 난 사고입니다 (`ME_P : 1` · `NPC_SPOT : 1` · 축구 검사 10개).
 *
 * 여기서 먼저 대조하면 **죽는 대신 ❌ 한 줄**로 뜹니다.
 * (`_load.js`가 크래시를 **종료 코드 2**로 갈라 주는 것과 한 벌이에요.)
 * ══════════════════════════════════════════════════════════════ */
{
  const bad = mutsOK(MUT_TABLE);
  const n = Object.values(MUT_TABLE).reduce((a, m) => a + m.length, 0);
  check(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 beta/winger2/engine.js에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}

/* ══════════════════════════════════════════════════════════════
 * A. `createMatch`의 장면별 크레딧 계약 — **내 카드와 동료 카드 둘 다**
 *
 *   🅰️ 전개 장면(kind "assist") = 찬스를 **만드는** 장면
 *        → 주인공(by)이 **도움**, 마무리는 다른 사람
 *   ⚽ 결정 장면(kind "goal")   = **넣는** 장면
 *        → 주인공(by)이 **득점자**
 *
 * 이게 §2-5의 규칙이고, B가 `autoMatch`를 여기에 맞춥니다.
 * **내 카드도 같은 계약을 지키는지 함께 봅니다** — 나만 다른 규칙이면
 * 그것 자체가 §2-9·§2-10이 없애려던 병이에요.
 * ══════════════════════════════════════════════════════════════ */
{
  const E = load();
  E._t.seed(4242); E._t.skill = 0.5;
  let mineA = 0, mateA = 0, mineG = 0, mateG = 0;
  const bad = [];
  for (let i = 0; i < 4000; i++) {
    /* 여기서는 진짜 명단(me 있음)을 씁니다 — 내 카드를 봐야 하니까요. */
    const pos = POS[i % 4];
    const r = E._t.playMatch({ xi: xiOf(pos, 100, 70), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
    for (const c of r.cards) {
      if (c.judge !== "perfect") continue;
      if (c.kind === "assist") {
        if (c.assistBy !== c.by) bad.push(`전개 카드인데 주인공(${c.by})이 도움을 못 받았어요 (assistBy=${c.assistBy})`);
        else if (c.goalBy === c.by) bad.push(`전개 카드인데 주인공(${c.by})이 득점자예요`);
        else if (c.mine) mineA += 1; else mateA += 1;
      } else if (c.kind === "goal") {
        if (c.goalBy !== c.by) bad.push(`결정 카드인데 주인공(${c.by})이 득점자가 아니에요 (goalBy=${c.goalBy})`);
        else if (c.mine) mineG += 1; else mateG += 1;
      }
    }
  }
  check(mineA > 200 && mateA > 200 && mineG > 200 && mateG > 200,
    `표본 — 내 카드 전개 ${mineA} 결정 ${mineG} · 동료 카드 전개 ${mateA} 결정 ${mateG} (각 200장 이상)`);
  check(bad.length === 0,
    `A. 🅰️ 전개는 주인공이 도움 · ⚽ 결정은 주인공이 득점자 — **내 카드와 동료 카드가 같은 규칙**`
    + (bad.length ? ` — 어긋남 ${bad.length}건: ${bad[0]}` : ` (어긋남 0건 / ${mineA + mateA + mineG + mateG}장)`));
}

/* ══════════════════════════════════════════════════════════════
 * B-0. 🎲 **픽스처가 건강한가** — 이걸 먼저 봅니다
 *
 * 🔴 이 저장소에서 **두 번** 데인 자리예요.
 *   ① `_load.js`의 고정 SPREAD가 mateBase 70에서 언제나 `fw 59·77 / wg 67·83`을 내서,
 *      `ACE_POOL.goal`에 wg가 들어간 뒤 **골 에이스가 100% 윙어**가 됐습니다(실제 50.1%).
 *      B-2가 그것 때문에 빨간불이었고 **코드는 멀쩡했어요.**
 *   ② 그걸 spin(앙상블)으로 고쳤는데, 검사가 내 자리 한 칸을 `str = base`로 **평평하게**
 *      만들어서 fw만 폭이 좁았습니다 — 골 에이스가 fw 37% / wg 63%로 다시 기울었어요.
 *      `xiAll()`로 열한 명 전부에 폭을 주고 나서야 **50 대 50**이 됐습니다.
 *
 * 그래서 *"픽스처가 실제와 같은 모양인가"*를 **검사로** 만듭니다.
 * 이게 없으면 다음에 또 기울었을 때 **엉뚱한 검사가 빨간불**이 되고, 그 검사를 고치려다
 * 멀쩡한 코드를 건드리게 돼요. engineer 표현대로 *"지금 초록불은 운이 좋은 것"*이 됩니다.
 *
 * 문턱 40~60%는 머릿수(fw 2 : wg 2)에서 나온 값이지 실측값이 아니에요.
 * ══════════════════════════════════════════════════════════════ */
{
  const E = load();
  const cnt = { fw: 0, wg: 0, mf: 0, df: 0 };
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const xi = xiNoMe(70, i);
    const cand = xi.filter((x) => ["fw", "wg"].indexOf(x.pos) >= 0);   // ACE_POOL.goal
    const ace = cand.reduce((a, b) => (E.blendOf(a) >= E.blendOf(b) ? a : b), cand[0]);
    cnt[ace.pos] += 1;
  }
  const wgShare = 100 * cnt.wg / N;
  check(wgShare >= 40 && wgShare <= 60,
    `B-0. 픽스처가 골 에이스를 한쪽으로 안 몰아준다 — 앙상블 ${N}벌에서 wg ${wgShare.toFixed(1)}% (40~60%)`
    + ` · 실제 게임 50.1%`);
  /* 🧪 앙상블을 끄면(고정 SPREAD 한 벌) **100%로 쏠립니다** — 이 검사가 그걸 잡는지 확인해요.
   * 안 쏠리면 B-0이 아무것도 안 지키고 있다는 뜻입니다. */
  const fixed = xiNoMe(70);
  const fc = fixed.filter((x) => ["fw", "wg"].indexOf(x.pos) >= 0);
  const fAce = fc.reduce((a, b) => (E.blendOf(a) >= E.blendOf(b) ? a : b), fc[0]);
  check(fAce.pos === "wg",
    `B-0-변이. 고정 SPREAD 한 벌은 골 에이스가 **언제나 ${fAce.pos}**다 — 그래서 앙상블을 씁니다`
    + ` (${fixed.filter((x) => ["fw", "wg"].indexOf(x.pos) >= 0).map((x) => `${x.pos}${x.str}`).join(" ")})`);
}

/* ══════════════════════════════════════════════════════════════
 * B. `autoMatch` ↔ `createMatch` 교차 — **나와 경쟁자가 같은 규칙을 쓰는가**
 *
 * 🔬 재는 법 — 같은 11명(나 없음)·같은 전력(70:70)으로 두 갈래를 나란히 굴려
 *   ① 도움이 붙은 골의 비율      ② 득점자 포지션 분포      ③ 도움자 포지션 분포
 *   셋이 **서로 일치**해야 합니다. 절대값은 안 봅니다 — 두 갈래의 **차이**만 봐요.
 *
 * ⚠️ 두 갈래가 소수점까지 같지는 않습니다. `autoMatch`의 `oneWay`는 마무리와 수비를
 *   **한 번의 굴림**(`pf * pc`)으로 보는데 `createMatch`의 공격 장면에는 수비수가
 *   없어서, 같은 장면 수에서 골이 덜 납니다. 골이 덜 나면 `urgency`(뒤지고 있을 때
 *   빅찬스 확률↑)가 다르게 걸려서 **장면 종류의 섞임**이 조금 달라져요.
 *   그건 크레딧 규칙이 아니라 설계된 차이입니다.
 *   시드 3개 실측: 득점자 1.08 / 1.33 / 1.50%p · 도움자 0.36 / 0.78 / 0.36%p ·
 *   도움비 −0.40 / −0.01 / +0.36%p. 밴드는 그 위에 둡니다.
 * ══════════════════════════════════════════════════════════════ */
/* 🎚️ 2026-08-29 — 2.0 → **3.0%p**로 넓히고 **시드 셋의 평균**으로 잽니다.
 *
 * 🔴 ③ `shareByWeight`에는 **구조적 잔차**가 있습니다 — `urgency`(뒤지면 찬스가 는다)를
 *    쓸 수 없어서(최종 스코어만 넘어와요) 결정 쪽이 조금 낮게 잡히고, 그만큼 도움비가
 *    **체계적으로 높습니다**(37번 ②). 즉 이 Δ는 0을 중심으로 흔들리는 게 아니라
 *    **+1%p쯤에 중심이 있고** 그 위에서 시드 잡음이 얹혀요.
 *
 * 시드 넷 실측(N=12,000): ③ Δ **0.74 / 0.83 / 2.28 / 1.62 %p**.
 * **옛 밴드 2.0%p는 시드 5150에서 넘습니다** — 시드 77로 고정돼 있어서 안 보였을 뿐,
 * 계수가 조금만 움직이면 *"고장이 아니라 우연으로"* 빨간불이 될 자리였어요.
 * 3.0%p는 기준선 평균(≈1.4%p)에서 두 배 위 · 변이(−27%p)에서 아홉 배 아래입니다.
 *
 * 🎲 그리고 **시드 하나로 판정하지 않습니다** — designer가 31b에 내린 판정
 * (*"단일 시드는 신호가 아니라 잡음"*)이 여기에도 그대로 적용돼요.
 * 변이 쪽은 효과가 20~30%p라 시드 하나로 충분합니다. */
const RATE_BAND = 3.0;    // %p — 도움이 붙은 골 비율의 두 갈래 차 (시드 셋 평균)
const SEEDS3 = [77, 202, 5150];
const DIST_BAND = 3.0;    // %p — 포지션 분포의 두 갈래 최대 차
const REPEAT_BAND = 2.0;  // %p — 2골 경기의 반복 득점 비율 차 (🥵 fatigue 자리)
const N_MATCH = 12000;
const N_REPEAT = 30000;

function viaCreate(E, n, seed) {
  E._t.seed(seed); E._t.skill = 0.5;
  const g = { fw: 0, wg: 0, mf: 0, df: 0 }, a = { fw: 0, wg: 0, mf: 0, df: 0 };
  let goals = 0, withA = 0;
  const counts = [];                        // 경기별 골 수 — ③에 같은 리듬으로 먹입니다
  for (let i = 0; i < n; i++) {
    const xi = xiNoMe(70, i);                // 🎲 경기마다 다른 명단 폭 (앙상블)
    const posOf = new Map(xi.map((x) => [x.name, x.pos]));
    const r = E._t.playMatch({ xi, oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
    let c0 = 0;
    for (const c of r.cards) {
      if ((c.kind !== "goal" && c.kind !== "assist") || c.judge !== "perfect") continue;
      goals += 1; c0 += 1;
      if (c.goalBy) g[posOf.get(c.goalBy)] += 1;
      if (c.assistBy) { withA += 1; a[posOf.get(c.assistBy)] += 1; }
    }
    counts.push(c0);
  }
  return { goals, rate: withA / goals, g: share(g), a: share(a), counts };
}
/* ③ `shareByWeight` — **내 경기의 상대 클럽 한 팀**만 이 길로 갑니다.
 * 스코어가 이미 정해진 클럽이라 골 수를 밖에서 받아요. ①이 낸 경기별 골 수를
 * 그대로 먹여서 `hits`(🥵 fatigue)가 리셋되는 리듬까지 맞춥니다.
 * ⚠️ 이 길은 **무작위로 뽑히는 클럽이 아니라 언제나 내 상대**예요 —
 *    여기만 규칙이 다르면 "내 상대 팀 선수만 도움이 덜 난다"는 계통 오차가 되고,
 *    경기 수를 늘려도 평균으로 안 씻깁니다. 그래서 이 갈래를 따로 봅니다. */
function viaShare(E, counts, seed) {
  E._t.seed(seed);
  const g = { fw: 0, wg: 0, mf: 0, df: 0 }, a = { fw: 0, wg: 0, mf: 0, df: 0 };
  let goals = 0, withA = 0;
  let spin = 0;
  for (const c of counts) {
    const sp = spin++;
    if (!c) continue;
    for (const go of E.shareByWeight(xiNoMe(70, sp), c, "goal", 0.5)) {
      goals += 1; g[go.scorer.pos] += 1;
      if (go.assister) { withA += 1; a[go.assister.pos] += 1; }
    }
  }
  return { goals, rate: withA / goals, g: share(g), a: share(a) };
}
function viaAuto(E, n, seed) {
  E._t.seed(seed);
  const g = { fw: 0, wg: 0, mf: 0, df: 0 }, a = { fw: 0, wg: 0, mf: 0, df: 0 };
  let goals = 0, withA = 0;
  for (let i = 0; i < n; i++) {
    const r = E._t.autoMatch({ xiA: xiNoMe(70, i), xiB: xiNoMe(70, i + 1e6), strA: 70, strB: 70 });
    for (const list of [r.goalsA, r.goalsB]) for (const go of list) {
      goals += 1; g[go.scorer.pos] += 1;
      if (go.assister) { withA += 1; a[go.assister.pos] += 1; }
    }
  }
  return { goals, rate: withA / goals, g: share(g), a: share(a) };
}
/* 🥵 fatigue — **정확히 2골 난 팀·경기**에서 같은 사람이 둘 다 넣은 비율.
 * 골 수로 조건을 걸어 두 갈래의 득점률 차이를 지웁니다.
 * 지명이 끝나기 **전에** 피로를 올리면(옛 순서) 득점자가 안 지쳐서 이 비율이 올라가요. */
function repeatRate(E, n, seed, auto) {
  E._t.seed(seed); E._t.skill = 0.5;
  let two = 0, same = 0;
  for (let i = 0; i < n; i++) {
    if (auto) {
      const r = E._t.autoMatch({ xiA: xiNoMe(70, i), xiB: xiNoMe(70, i + 1e6), strA: 70, strB: 70 });
      for (const l of [r.goalsA, r.goalsB]) if (l.length === 2) { two += 1; if (l[0].scorer === l[1].scorer) same += 1; }
    } else {
      const r = E._t.playMatch({ xi: xiNoMe(70, i), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
      const sc = r.cards.filter((c) => (c.kind === "goal" || c.kind === "assist") && c.judge === "perfect" && c.goalBy).map((c) => c.goalBy);
      if (sc.length === 2) { two += 1; if (sc[0] === sc[1]) same += 1; }
    }
  }
  return { p: same / two, n: two };
}

function crossOf(E, seed) {
  const sd = seed == null ? SEEDS3[0] : seed;
  const C = viaCreate(E, N_MATCH, sd);
  const A = viaAuto(E, N_MATCH, sd);
  const H = viaShare(E, C.counts, sd);
  const d = (X) => ({ rate: 100 * (X.rate - C.rate), g: gap(X.g, C.g), a: gap(X.a, C.a) });
  return { C, A, H, auto: d(A), shr: d(H) };
}
const armOK = (x) => Math.abs(x.rate) <= RATE_BAND && x.g <= DIST_BAND && x.a <= DIST_BAND;
const crossOK = (x) => armOK(x.auto) && armOK(x.shr);
const armTxt = (x) => `도움비 Δ${x.rate >= 0 ? "+" : ""}${x.rate.toFixed(2)}%p · 득점자 Δ${x.g.toFixed(2)}%p · 도움자 Δ${x.a.toFixed(2)}%p`;

{
  const E0 = load();
  const runs = SEEDS3.map((sd) => crossOf(E0, sd));
  const mean = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  const sprd = (f) => `[${runs.map((r) => f(r).toFixed(2)).join(" ")}]`;
  const base = {
    C: runs[0].C, A: runs[0].A, H: runs[0].H,
    auto: { rate: mean((r) => r.auto.rate), g: mean((r) => r.auto.g), a: mean((r) => r.auto.a) },
    shr: { rate: mean((r) => r.shr.rate), g: mean((r) => r.shr.g), a: mean((r) => r.shr.a) },
  };
  check(base.C.goals > 8000 && base.A.goals > 8000 && base.H.goals > 8000,
    `표본 — ① createMatch 골 ${base.C.goals} · ② autoMatch ${base.A.goals} · ③ shareByWeight ${base.H.goals}`);
  check(armOK(base.auto),
    `B-1. ② autoMatch가 ① 카드와 같은 규칙을 쓴다 — 시드 ${SEEDS3.length}개 평균 ${armTxt(base.auto)}`
    + ` (도움비 ±${RATE_BAND} · 분포 ±${DIST_BAND}) · 시드별 도움비 ${sprd((r) => r.auto.rate)}`
    + `\n     ① create 득점자[${fmt(base.C.g)}] 도움자[${fmt(base.C.a)}]`
    + `\n     ② auto   득점자[${fmt(base.A.g)}] 도움자[${fmt(base.A.a)}]`);
  check(armOK(base.shr),
    `B-1b. ③ shareByWeight(**언제나 내 상대 클럽**)도 같은 규칙을 쓴다 — 시드 ${SEEDS3.length}개 평균 ${armTxt(base.shr)}`
    + ` · 시드별 도움비 ${sprd((r) => r.shr.rate)}`
    + `\n     ③ share  득점자[${fmt(base.H.g)}] 도움자[${fmt(base.H.a)}]`);

  /* ── 무게 순서 — **주인공을 어느 무게로 뽑았나**를 직접 봅니다 ──
   * 전개 장면의 주인공을 득점자로 만들면 득점자 분포가 GOAL_W가 아니라
   * ASSIST_W(mf·wg가 큰)를 닮습니다. 그 뒤집힘을 여기서 잡아요.
   * 문턱은 `E.K.GOAL_W`·`ASSIST_W`의 **순서**지 값이 아닙니다. */
  const orderBad = [];
  for (const [tag, d] of [["create", base.C], ["auto", base.A]]) {
    if (!(d.g.fw > d.g.wg && d.g.fw > d.g.mf && d.g.fw > d.g.df)) orderBad.push(`${tag} 득점자가 GOAL_W 순서가 아니에요`);
    if (!(d.a.wg > d.a.fw && d.a.mf > d.a.fw && d.a.wg > d.a.df)) orderBad.push(`${tag} 도움자가 ASSIST_W 순서가 아니에요`);
  }
  check(orderBad.length === 0,
    `B-2. 두 갈래 다 득점자는 GOAL_W(fw 최대) · 도움자는 ASSIST_W(wg·mf > fw) 순서다`
    + (orderBad.length ? ` — ${orderBad.join(" · ")}` : ""));

  /* ── 🥵 fatigue 자리 ── */
  const rc = repeatRate(load(), N_REPEAT, 77, false);
  const ra = repeatRate(load(), N_REPEAT, 77, true);
  const dRep = 100 * (ra.p - rc.p);
  check(Math.abs(dRep) <= REPEAT_BAND,
    `B-3. 🥵 fatigue가 두 갈래에서 같은 자리에 쌓인다 — 2골 경기의 반복 득점`
    + ` create ${(rc.p * 100).toFixed(2)}% (n=${rc.n}) vs auto ${(ra.p * 100).toFixed(2)}% (n=${ra.n})`
    + ` · Δ${dRep >= 0 ? "+" : ""}${dRep.toFixed(2)}%p (±${REPEAT_BAND})`);

  /* ══════════ B-변이 셋 ══════════ */
  const MUTS = [
    ["🔴 전개 장면도 주인공이 득점자 (G-3 이전의 원본)",
      [[/if \(kind === "goal"\) \{\n {10}if \(chance\(ASSIST_P2\)\) \{/,
        'if (kind === "goal" || true) {\n          if (chance(ASSIST_P2)) {']]],
    ["마무리를 g 무게가 아니라 a 무게로 뽑음",
      [[/scorer = rest\.length \? pickActor\(rest, "goal", hits\)\.who : who;/,
        'scorer = rest.length ? pickActor(rest, "assist", hits).who : who;']]],
    ["🔴 ③ shareByWeight가 모든 골을 ⚽ 결정 출신으로 봄 (G-4 선행 이전의 원본)",
      [[/const big = chance\(pBig\);\n {6}const \{ who \} = pickActor\(xi, big \? "goal" : "assist", hits\);/,
        'const big = true;\n      const { who } = pickActor(xi, "goal", hits);']]],
  ];
  for (const [tag, muts] of MUTS) {
    const m = crossOf(load(muts));
    /* 어느 갈래가 갈렸는지 같이 적어요 — ③만 갈리는 변이도 있어서
     * ②만 찍어 두면 "빨간불인데 왜인지 모르는" 메시지가 됩니다. */
    const which = [!armOK(m.auto) ? `② ${armTxt(m.auto)}` : null, !armOK(m.shr) ? `③ ${armTxt(m.shr)}` : null]
      .filter(Boolean).join(" / ") || `② ${armTxt(m.auto)} / ③ ${armTxt(m.shr)}`;
    check(!crossOK(m), `B-변이. ${tag} → 빨간불 (${which})`);
  }
  {
    const M = load([[/ {8}hits\.set\(scorer, \(hits\.get\(scorer\) \|\| 0\) \+ 1\);/,
      "        hits.set(who, (hits.get(who) || 0) + 1);"]]);
    const mr = repeatRate(M, N_REPEAT, 77, true);
    const d = 100 * (mr.p - rc.p);
    check(Math.abs(d) > REPEAT_BAND,
      `B-3-변이. 🥵 fatigue를 득점자가 아니라 주인공에게 쌓으면 → 빨간불`
      + ` (auto ${(mr.p * 100).toFixed(2)}% · Δ${d >= 0 ? "+" : ""}${d.toFixed(2)}%p)`);
  }
}

/* ══════════════════════════════════════════════════════════════
 * C·D·E — `career.js` 갈래. **진짜 함수를 부릅니다.**
 *   `raceRank`·`raceTop`은 `WingerCareer._t`에 있어서 페이지를 띄우면 그대로 부를 수 있어요.
 *   변이는 `career.js` 소스를 갈아치운 페이지를 다시 띄워서 넣습니다
 *   (정규식이 안 걸리면 던져요 — 조용히 무변이로 통과하는 걸 막습니다).
 * ══════════════════════════════════════════════════════════════ */
const CAREER_SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");

const FX = (() => {
  const s = fs.readFileSync(path.join(BETA, "_fixtures.js"), "utf8");
  const m = s.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
  return m ? new Function(`return ${m[1]};`)() : null;
})();
const ITEM = FX && FX.items.find((x) => x.id === "winger2-def");
if (!ITEM) { console.log("❌ winger2-def 확인용 세이브를 못 찾았어요 (beta/_fixtures.js)"); process.exit(1); }

/* 🛡️ `winger2-def`(수비수 · K리그1 리그 경기 직전)를 씁니다 — 🛡️ 철벽상 갈래를 보는
 *    검사라 수비수 세이브가 맞아요. **디스크에 있는 그대로** 씁니다(키를 안 갈아요). */
function boot(careerMuts) {
  let career = CAREER_SRC;
  for (const [re, rep] of careerMuts || []) {
    const before = career;
    career = career.replace(re, rep);
    if (career === before) throw new Error(`career.js에 변이가 안 걸렸어요 — ${re}`);
  }
  const keys = ITEM.keys;
  /* ⏱️ preamble은 `_load.js`의 `pagePre()` **한 벌**입니다 — 여기서 복붙하지 마세요.
   * 가짜 rAF(`cb(0)`)가 미니게임 넷을 통째로 얼렸던 자리예요 (109번 §2).
   * 새 복붙본이 생기면 `raf-test.js`가 빨간불을 냅니다. */
  const PRE = pagePre(keys);
  const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(DIR, src.split("?")[0]);
      if (!fs.existsSync(p)) return "";
      return `<script>\n${p.endsWith("career.js") ? career : fs.readFileSync(p, "utf8")}\n</script>`;
    })
    .replace("</head>", `<script>${PRE}</script></head>`);
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/winger2/" });
  const w = dom.window;
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };
  /* 🖱️ 게임 입구를 통해 들어갑니다 — 세이브를 직접 손으로 세우지 않아요. */
  w.document.getElementById("btn-continue").click();
  const go = w.document.querySelector(".slot-modal .slot-go");
  if (go) go.click();
  return w;
}

/* 🎛️ 합성 기록을 심습니다 — **값이 아니라 순서**를 보려고 일부러 극단으로 벌려요.
 *   무실점왕   cs 9 · 차단 1     ← 표에 **먼저** 들어갑니다
 *   결선승자   cs 9 · 차단 5     ← 무실점 동점, 차단이 더 많음 → **진짜 1위**
 *   차단왕     cs 7 · 차단 99    ← 축이 차단으로 되돌아가면 1위가 됨
 *   나         cs 8 · 차단 50    ← 둘 사이
 *
 * ⚠️ **넣는 순서가 중요합니다.** 무실점왕을 결선승자보다 **앞에** 넣어야 해요 —
 *    Array.sort는 안정 정렬이라, 타이브레이커가 없으면 입력 순서가 그대로 남습니다.
 *    결선승자를 앞에 넣으면 타이브레이커를 지워도 1위가 그대로라
 *    **변이가 안 잡히는 검사**가 돼요 (실제로 처음에 그렇게 짰다가 걸렸습니다). */
function plant(w) {
  const CT = w.WingerCareer._t;
  const S = CT.state();
  const sq = w.WingerSquad.ensureSquads();
  const all = [];
  for (const club of Object.keys(sq)) for (const x of sq[club]) if (!x.me) all.push(x);
  for (const x of all) { x.apps = 10; x.cs = 0; x.d = 0; x.g = 0; x.a = 0; x.rate = 60; x.mom = 0; }
  all[0].name = "무실점왕"; all[0].cs = 9; all[0].d = 1;
  all[1].name = "결선승자"; all[1].cs = 9; all[1].d = 5;
  all[2].name = "차단왕"; all[2].cs = 7; all[2].d = 99;
  S.activity.apps = 10; S.activity.cs = 8; S.activity.defense = 50;
  S.activity.goals = 0; S.activity.assists = 0; S.activity.wins = 0; S.activity.ratingSum = 60;
  return CT;
}

/* ── C. raceRank 정렬 계약 ── */
let W0 = null, CT0 = null;
{
  W0 = boot(); CT0 = plant(W0);
  const rows = CT0.raceRank("d");
  const top4 = rows.slice(0, 4).map((x) => x.name);
  check(w0ErrsEmpty(W0), `페이지가 오류 없이 떴다${W0.__errs.length ? ` — ${W0.__errs[0]}` : ""}`);
  check(top4[0] === "결선승자" && top4[1] === "무실점왕",
    `C-1. 🛡️ 수비 부문의 **주축이 무실점**이다 (1·2위 ${top4.slice(0, 2).join(" · ")} — 둘 다 무실점 9)`);
  check(top4[0] === "결선승자",
    `C-2. 무실점이 같으면 **차단이 타이브레이커**다 — 표에 늦게 들어온 결선승자(9/5)가`
    + ` 먼저 들어온 무실점왕(9/1)을 앞질렀다 (1위 ${top4[0]})`);
  check(rows.findIndex((x) => x.me) === 2,
    `C-3. 내 줄(무실점 8)이 무실점 9 둘 뒤, 무실점 7 앞이다 (${rows.slice(0, 4).map((x) => `${x.name}${x.me ? "(나)" : ""} ${x.cs}/${x.d}`).join(" | ")})`);
  const desc = rows.every((x, i) => i === 0 || rows[i - 1].v >= x.v);
  check(desc, "C-4. 전체가 내림차순이다");
  check(CT0.raceTop("d") === false, "C-5. 내가 1위가 아니면 raceTop(\"d\")가 false다");
}
function w0ErrsEmpty(w) { return w.__errs.length === 0; }

/* ── C-변이 셋 ── */
{
  const CASES = [
    ["🔴 축을 무실점에서 차단으로 되돌림 (G-5 이전)",
      [[/ {6}: key === "d" \? \(x\.cs \|\| 0\)/, '      : key === "d" ? (x.d || 0)']],
      (CT) => CT.raceRank("d")[0].name !== "차단왕"],
    ["타이브레이커(차단)를 없앰",
      [[/ {4}const tie = \(x\) => \(key === "d" \? \(x\.d \|\| 0\) : 0\);/, "    const tie = () => 0;"]],
      (CT) => CT.raceRank("d")[0].name === "결선승자"],
    ["정렬을 오름차순으로",
      [[/return rows\.sort\(\(x, y\) => y\.v - x\.v \|\| tie\(y\) - tie\(x\) \|\| \(x\.me \? -1 : 1\)\);/,
        "return rows.sort((x, y) => x.v - y.v || tie(y) - tie(x) || (x.me ? -1 : 1));"]],
      (CT) => { const r = CT.raceRank("d"); return r.every((x, i) => i === 0 || r[i - 1].v >= x.v); }],
  ];
  for (const [tag, muts, stillOK] of CASES) {
    const w = boot(muts);
    const CT = plant(w);
    check(!stillOK(CT), `C-변이. ${tag} → 빨간불 (1위 ${CT.raceRank("d")[0].name})`);
    w.close();
  }
}

/* ══════════════════════════════════════════════════════════════
 * D. **표시 ↔ 판정** — 이 저장소가 계속 앓아 온 자리
 *   정렬은 무실점으로 하는데 표에는 차단을 띄우면, 화면과 순위표가 다른 말을 합니다.
 *   `raceValue`는 내보내지지 않아서 **소스에서 정규식으로 뜯어** 세우고,
 *   판정 쪽은 **진짜 `raceRank`**의 결과와 대조합니다.
 *   → 한쪽만 고치면 여기서 갈립니다.
 * ══════════════════════════════════════════════════════════════ */
function raceValueFrom(src) {
  const m = src.match(/ {2}const raceValue = \(r, k\) =>[\s\S]*?;\n/);
  if (!m) throw new Error("raceValue를 못 뜯었어요 — 정규식을 고치세요");
  return new Function(`${m[0]}  return raceValue;`)();
}
{
  const raceValue = raceValueFrom(CAREER_SRC);
  /* 필드마다 **서로 다른 값**을 넣습니다 — 같은 값이면 어느 필드를 봐도 통과해요
   * (실제로 그렇게 짰다가 아무것도 안 지키는 검사가 된 전례가 있습니다). */
  const probe = { g: 11, a: 22, d: 33, cs: 44, avg: 5.5, m: 66, mom: 77 };
  const off = [];
  for (const key of ["g", "a", "d", "p", "r", "m"]) {
    const rows = CT0.raceRank(key);
    const truth = rows.map((x) => x.v);
    /* 진짜 raceRank가 정렬에 쓴 값(v)과, 표시 함수가 같은 줄에 대해 내는 값이 같아야 해요 */
    const shownTop = Number(raceValue(rows[0], key));
    if (!(Math.abs(shownTop - truth[0]) < 1e-9)) off.push(`${key}: 표시 ${shownTop} ≠ 판정 ${truth[0]}`);
  }
  check(off.length === 0,
    `D-1. 표에 뜨는 값과 부문상 판정이 **같은 것**을 본다 (6개 탭)${off.length ? ` — ${off.join(" · ")}` : ""}`);
  check(Number(raceValue(probe, "d")) === probe.cs,
    `D-2. 🛡️ 탭의 표시값이 무실점(cs)이다 — 차단(d)이 아니라 (표시 ${raceValue(probe, "d")} · cs ${probe.cs} · d ${probe.d})`);

  const MV = raceValueFrom(CAREER_SRC.replace(/ {4}: k === "d" \? \(r\.cs \|\| 0\)/, '    : k === "d" ? (r.d || 0)'));
  check(Number(MV(probe, "d")) !== probe.cs,
    `D-변이. 🛡️ 표시값만 차단으로 되돌리면 → 빨간불 (표시 ${MV(probe, "d")} ≠ 판정 ${probe.cs})`);
}

/* ══════════════════════════════════════════════════════════════
 * E. 부문상 판정 — **어느 부문 1위가 어느 상을 받나**
 *   결산 함수 안이라 통째로 부를 수 없어서, 판정 네 줄을 소스에서 뜯어
 *   `raceTop`을 스파이로 갈아 끼우고 **키 → 상 이름** 대응을 봅니다.
 *   C가 "d = 무실점"을 지키므로, 둘을 이으면
 *   **무실점 1위 → raceTop("d") → 🛡️ 철벽상**이 끝까지 연결됩니다.
 * ══════════════════════════════════════════════════════════════ */
{
  const m = CAREER_SRC.match(/if \(raceTop\("g"\)\)[\s\S]*?if \(raceTop\("p"\)\)[^\n]*\n/);
  if (!m) throw new Error("부문상 판정 블록을 못 뜯었어요 — 정규식을 고치세요");
  const runAwards = (src) => (winKey) => {
    const awards = [];
    new Function("raceTop", "awards", src)((k) => k === winKey, awards);
    return awards;
  };
  const run = runAwards(m[0]);
  const WANT = { g: "골든부츠", a: "플레이메이커", d: "철벽상", p: "공격포인트왕" };
  const off = [];
  for (const [k, name] of Object.entries(WANT)) {
    const got = run(k);
    if (got.length !== 1 || got[0] !== name) off.push(`${k} → ${got.join(",") || "없음"} (기대 ${name})`);
  }
  check(off.length === 0,
    `E-1. 부문 1위 → 상 대응이 맞다 — g 골든부츠 · a 플레이메이커 · **d 철벽상** · p 공격포인트왕`
    + (off.length ? ` — 어긋남: ${off.join(" · ")}` : ""));
  check(run("m").length === 0 && run("r").length === 0,
    "E-2. ⭐ 평점·🏅 MOM 1위에는 부문상이 안 붙는다 (그 둘은 상이 아니에요)");

  const MS = m[0].replace(/if \(raceTop\("d"\)\) awards\.push\("철벽상"\);/, 'if (raceTop("g")) awards.push("철벽상");');
  if (MS === m[0]) throw new Error("E 변이가 안 걸렸어요");
  const mrun = runAwards(MS);
  check(!(mrun("d").length === 1 && mrun("d")[0] === "철벽상"),
    `E-변이. 🛡️ 철벽상이 무실점(d)이 아니라 다른 부문을 보게 하면 → 빨간불 (d 1위의 상: ${mrun("d").join(",") || "없음"})`);
}

/* ══════════════════════════════════════════════════════════════
 * F. `posAxis`(hype·리그MVP·베스트11·발롱도르의 축)는 **차단**을 본다
 *
 * 🛡️ 철벽상의 축은 「무실점 경기 수」로 옮겼지만(G-5), `posAxis`는 **차단 그대로**입니다.
 * designer 판정이에요 — 무실점으로 옮기면 `d` 가중을 **네 포지션이 전부** 갖고 있어서
 * fw·wg·mf의 `n`까지 다시 잡아야 하고, 리그MVP·베스트11·발롱도르 곡선이 통째로 움직입니다.
 * (`36_engineer_award-axis.md` ③ · `37_engineer_share-fix.md` ①)
 *
 * **지금은 소스가 그럴 뿐 검사가 지키고 있지 않았습니다.** 여기서 못박아요.
 * ⚠️ 이 판정이 뒤집히면 이 검사도 같이 뒤집어야 합니다 —
 *    그때 `POS_AXIS`의 `n` 네 개가 전부 다시 잡히니, 여기가 빨간불로 알려 줄 거예요.
 * ══════════════════════════════════════════════════════════════ */
{
  const posAxis = CT0.posAxis;
  const only = (k, v) => ({ goals: 0, assists: 0, defense: 0, cs: 0, [k]: v });
  const off = [];
  for (const pos of POS) {
    const byBlock = posAxis(only("defense", 20), pos);
    const byClean = posAxis(only("cs", 20), pos);
    if (!(byBlock > 0)) off.push(`${pos}: 차단이 축을 안 올려요 (${byBlock})`);
    if (byClean !== 0) off.push(`${pos}: 무실점이 축을 올려요 (${byClean}) — 지금은 차단이 축이에요`);
  }
  check(off.length === 0,
    `F-1. posAxis(hype의 축)는 **차단**을 본다 — 무실점이 아니라 (designer 판정 · 37번 ①)`
    + (off.length ? ` — ${off.join(" · ")}` : ` (df 차단 20 → ${posAxis(only("defense", 20), "df").toFixed(2)} · 무실점 20 → ${posAxis(only("cs", 20), "df").toFixed(2)})`));

  const wm = boot([[/ {4}return \(\(a\.goals \|\| 0\) \* x\.g \+ \(a\.assists \|\| 0\) \* x\.a \+ \(a\.defense \|\| 0\) \* x\.d\) \* x\.n;/,
    "    return ((a.goals || 0) * x.g + (a.assists || 0) * x.a + (a.cs || 0) * x.d) * x.n;"]]);
  const mAxis = wm.WingerCareer._t.posAxis;
  check(mAxis(only("defense", 20), "df") === 0 && mAxis(only("cs", 20), "df") > 0,
    `F-변이. posAxis를 무실점으로 갈면 → 빨간불`
    + ` (차단 20 → ${mAxis(only("defense", 20), "df")} · 무실점 20 → ${mAxis(only("cs", 20), "df").toFixed(2)})`);
  wm.close();
}

W0.close();
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
