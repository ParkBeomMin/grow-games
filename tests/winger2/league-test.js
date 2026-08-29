/* ⚽ 더 윙어 II — 리그 대칭 + 🎖️ 칭호 버프 배선 (게이트 ①-G 후보 D)
 *
 * 근거: `13_designer_v2-final.md` §2-7b(칭호 버프) · §2-8b (7)(실점 비대칭) · §2-10(네 번째 냄새)
 *       `38_engineer_gate-d.md`
 *
 * 여기서 보는 것 넷
 *   30. 🎲 **한 장면에 굴림은 하나** — `chance(pf * pc)`로 되돌리면 빨간불
 *   31. 🏟️ **여섯 클럽이 같은 산식** — 득점 (±15%)
 *   31b. 🚧 **실점·무실점** — designer가 2차로 미룬 **알려진 비대칭**. 상한만 지킵니다
 *   32. 🎖️ **칭호 버프가 리그 경기에 닿는가** — `w(i)`에서 buff 항을 빼면 빨간불
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚧 31b를 왜 따로 두나 — **designer 판정입니다. 31에 합치지 마세요.**
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   > 득점 비대칭은 **버그**였고, 실점 비대칭은 **알려진 설계 한계**입니다.
 *   > 같은 검사에 묶으면 안 됩니다. 버그를 고쳤는데 검사가 계속 빨간불이면
 *   > **검사가 신호를 잃습니다.**
 *
 * 원인이 §2-8b (7)에 숫자로 있어요 — 능력치 70·대등(0.5)에서 한 공격 장면이 골이 될 확률:
 *
 *     내가 먹는 길 (createMatch)  pConcede = CON × defW = 1.111 × 0.5 = 0.5555
 *     남이 먹는 길 (autoMatch)    pFinish  = FIN × atkW = 0.884 × 0.5 = 0.4420   ← 25.7% 차
 *
 * `autoMatch`에는 **경쟁자 수비수의 개인 능력치가 안 실립니다.** 경쟁자 클럽의 무실점은
 * 클럽 전력만 가르고, 내 클럽은 거기에 내 수비 카드가 더해져요. 방향은 **나에게 불리한 쪽**
 * (내 클럽이 더 먹히고 무실점이 적음)이라 철벽상 곡선은 이미 그 위에서 잡혀 있습니다.
 *
 * 🔜 **2차의 「칸마다 관점 굴리기」가 들어가면 31b를 지우고 31에 합치세요.**
 *    그때는 실점·무실점도 ±15% 안으로 들어와야 합니다. 아래 UNMET에서 키를 빼면
 *    자동으로 31과 같은 밴드로 판정됩니다 — **달성했는데 UNMET에 남아 있으면 빨간불**이에요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚧 종료 코드 두 갈래 (`tests/soccer/curve-test.js`와 같은 방식)
 * ─────────────────────────────────────────────────────────────────────────
 *   reg(...)   회귀 — 지금 지켜지고 깨지면 안 되는 계약. 깨지면 **종료 코드 1**
 *   goal(...)  목표 — 아직 못 닿은 항목은 UNMET에 적고 **종료 코드 0**, 🚧 배너로 크게
 *
 *   · UNMET인데 여전히 미달   → 🚧 (예상된 상태)
 *   · UNMET인데 **목표 달성**  → ❌ 종료 코드 1 ("31로 승격하세요")  ← 썩지 않는 이유
 *   · UNMET이 아닌데 미달      → ❌ 종료 코드 1 (회귀)
 *
 * ⚠️ **현재 실측값을 기대값으로 박지 않았습니다.** 그건 버그를 정답으로 단언하는 짓이에요.
 *    CAP은 *"여기까지는 알려진 상태"*이지 목표가 아닙니다 — 여기 맞추려 하지 마세요.
 *
 * 🎲 시드를 박았으니 결정론적입니다. ⏱️ 약 30초.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
const { load, mutsOK, xiOf, xiAll } = require("./_load.js");

const DIR = "/workspace/grow-games/beta/winger2";
const BETA = "/workspace/grow-games/beta";

let fail = 0;
const gaps = [];
const reg = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
/* 🚧 아직 못 닿은 목표. **여기 적힌 것만** 종료 코드에서 빠집니다. */
const UNMET = {
  "concede-sym": "실점 비대칭 — **지금 시드 넷 평균 −14.6%로 밴드(±15%) 가장자리에 걸쳐 있습니다.**"
    + " 시드 하나로 재면 통과했다 실패했다 해요 — 단일 시드는 잡음입니다."
    + " 그리고 **조작 실력에 따라서도 갈립니다**(balancer: skill 0.35에서 −18.2% · 0.65에서 −14.0%)."
    + " 그건 me가 있는 명단에서의 값이고, 여기 −14.6%는 **me 없는 순수 산식**이라 skill과 무관해요(44번 참고)."
    + " 계수를 그쪽에 맞춘 게 아니라 NPC_SPOT.assist(6.50)의 부수 효과예요 —"
    + " pConcede(CON×defW 0.5555) vs pFinish(FIN×atkW 0.4420), 차 25.7%는 그대로입니다."
    + " autoMatch에 경쟁자 수비수의 개인 능력치가 안 실려요 (§2-8b (7) · 2차의 「칸마다 관점 굴리기」)",
  "cs-sym": "무실점 비대칭 — 위와 같은 뿌리. 내 클럽이 더 먹혀서 무실점이 적습니다",
};
const goal = (key, ok, msg) => {
  const known = Object.prototype.hasOwnProperty.call(UNMET, key);
  if (ok && !known) { console.log(`✅ ${msg}`); return; }
  if (ok && known) {
    console.log(`❌ ${msg} — 🎉 목표를 달성했어요! UNMET["${key}"]를 지우고 **31로 승격**하세요`);
    fail += 1; return;
  }
  if (!ok && !known) { console.log(`❌ ${msg}`); fail += 1; return; }
  console.log(`🚧 ${msg}`);
  gaps.push({ key, msg, why: UNMET[key] });
};

/* 🧪 이 파일이 쓰는 변이 전부 — 0번 검사가 여기 있는 정규식을 소스와 대조합니다. */
const MUT_TABLE = {
  "30-한장면두굴림": [[/if \(chance\(pf\)\) \{/,
    "if (chance(pf * (guard ? pConcede(1 - aw, abilityOf(guard)) : 1))) {"]],
  "32-①buff항제거": [[/ {6}\* \(\(row\.buff && row\.buff\[sk\]\) \|\| 1\)\n/, ""]],
  "32-②sk를g로고정": [[/ {6}\* \(\(row\.buff && row\.buff\[sk\]\) \|\| 1\)/,
    "      * ((row.buff && row.buff.g) || 1)"]],
};

const t0 = Date.now();

/* 🧍 나 없는 선발 11명. 두 갈래에 **같은 명단**을 넣어야 산식만 남습니다.
 * 🎲 명단마다 spin을 돌려요 — 고정 SPREAD 한 벌은 에이스 위치를 못 박아 버립니다
 * (`_load.js`의 spreadFor 주석 참고). */
const xiNoMe = (base, spin) => xiAll(base, spin);

const N = 20000;
/* 🎲 **시드 하나로 재지 않습니다** (designer 판정 2026-08-29).
 *
 * balancer가 시드 넷으로 재니 실점 비대칭이 **−14.83 ~ −16.42%**로 갈렸어요 —
 * 단일 시드로 재면 **통과했다 실패했다** 합니다. engineer는 한 시드에서
 * *"31로 승격되어 통과"*라고 봤고 designer는 같은 코드에서 *"둘이 밴드 밖"*이라고 봤습니다.
 * **단일 시드는 신호가 아니라 잡음입니다.**
 * 그래서 **시드 넷의 평균**으로 판정하고, 흩어짐도 함께 찍어요. */
const SEEDS = [11, 202, 5150, 31337];
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const spread = (a) => `[${a.map((v) => v.toFixed(2)).join(" ")}]`;

/* 🎚️ **측정 조건을 상수로 못박습니다** (2026-08-29 · balancer 지적).
 *
 * 🔴 31b는 `_t.skill`을 **어디에도 안 적어 두고** 재고 있었어요. 나중에 누가 기본값을
 *    바꾸면 *"검사가 왜 빨간불인지 아무도 모르는"* 상태가 됩니다.
 *    그리고 실제로 balancer가 skill을 흔드니 **같은 코드가 통과도 실패도** 했어요 —
 *    아래 44번이 그 자리를 따로 봅니다. */
const SKILL = 0.5;         // 🤖 자동 진행과 같은 값 · balancer가 곡선을 잰 값
/* 내 클럽 — 카드 갈래(`createMatch`). 내 공격 칸은 pFinish 하나, 상대 공격 칸은 pConcede 하나.
 * ⚠️ **이 명단에는 `me`가 없습니다**(`xiAll`) — 열한 명 전부 자동이에요.
 *    그래서 31·31b는 **조작 실력과 무관한 「순수 산식 대칭」**을 잽니다.
 *    실제 플레이(내가 카드를 여는 경우)는 skill을 타요 — 44번이 그쪽입니다. */
function myClub(E, SEED) {
  E._t.seed(SEED); E._t.skill = SKILL;
  let gf = 0, ga = 0, cs = 0;
  for (let i = 0; i < N; i++) {
    const r = E._t.playMatch({ xi: xiNoMe(70, i), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
    gf += r.teamGoals; ga += r.oppGoals; if (!r.oppGoals) cs += 1;
  }
  return { gf: gf / N, ga: ga / N, cs: cs / N };
}
/* 다른 클럽 — `autoMatch`. 한 경기에 두 클럽이 들어가니 클럽 단위로 나눠요.
 * 두 클럽이 서로 먹고 먹히니 **득점/경기 = 실점/경기**입니다(대칭). */
function otherClubs(E, SEED) {
  E._t.seed(SEED);
  let goals = 0, clubs = 0, cs = 0;
  for (let i = 0; i < N; i++) {
    const r = E._t.autoMatch({ xiA: xiNoMe(70, i), xiB: xiNoMe(70, i + 1e6), strA: 70, strB: 70 });
    goals += r.gf + r.ga; clubs += 2;
    if (!r.ga) cs += 1;          // A가 무실점
    if (!r.gf) cs += 1;          // B가 무실점
  }
  return { gf: goals / clubs, ga: goals / clubs, cs: cs / clubs };
}
const rel = (mineV, otherV) => 100 * (otherV - mineV) / mineV;   // (다른 − 내) ÷ 내

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
  reg(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 beta/winger2/engine.js에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}

/* ══════════════════════════════════════════════════════════════
 * 31. 🏟️ 여섯 클럽이 같은 산식 — **득점**
 *   문턱 ±15%는 designer가 정한 범위예요. 값이 아니라 **두 갈래의 차이**에 겁니다 —
 *   계수가 통째로 움직여도 둘이 같이 움직이면 안 걸려요.
 * ══════════════════════════════════════════════════════════════ */
const SYM_BAND = 15;       // % — 문턱. 소스에서 읽지 않습니다
/* 🎚️ **승격 문턱은 밴드보다 안쪽입니다** (히스테리시스).
 *
 * 2026-08-28(밤) ①-G 최종 계수에서 실점 비대칭이 −16.3% → **−14.8%**로 내려와
 * ±15% 밴드에 "닿았습니다". 승격 신호가 떴어요. **그런데 승격하지 않았습니다** —
 *
 *   ① **여유가 1%p 아래**입니다. 시드 넷(N=20,000): −14.70 / −14.62 / −14.31 / −14.63%
 *      → 평균 −14.56%. 표본을 줄이면(N=12,000) −14.21 ~ **−15.25**로 **밴드를 넘나듭니다.**
 *      승격하면 `reg`가 되어 **다음 계수 조정 한 번에 상시 빨간불**이 됩니다
 *   ② **근본 원인이 그대로**예요 — `CON 1.111 × 0.5 = 0.5555` vs `FIN 0.884 × 0.5 = 0.4420`,
 *      차 25.7%. 밴드에 닿은 건 `NPC_SPOT.assist`(6.50)가 전개 주인공을 능력치 높은
 *      도움 에이스로 더 자주 뽑아 `pFinish`가 오른 **부수 효과**입니다. 고친 게 아니에요
 *   ③ **같은 뿌리인 무실점은 여전히 +26~28%**로 크게 미달입니다.
 *      한쪽만 승격하면 "고쳤다"는 잘못된 신호가 남아요
 *
 * 그래서 **"밴드에 겨우 닿은 것"과 "밴드 안에 들어온 것"을 가릅니다** —
 * 승격은 `SYM_BAND - PROMOTE_MARGIN`(= 12%) 안쪽일 때만. 신호를 죽인 게 아니라
 * **안정적으로 도달했을 때만 울리게** 한 거예요. 2차의 「칸마다 관점 굴리기」가
 * 들어오면 원인이 사라지므로 여유 있게 통과할 겁니다. */
const PROMOTE_MARGIN = 3;  // %p
/* 🚧 31b 상한 — **목표가 아니라 "여기까지는 알려진 상태"**입니다.
 * 2026-08-28 실측 실점 −15.9% · 무실점 +29.1%. 그 위에 ~1.4배 여유를 둡니다.
 * 실측값을 그대로 박으면 잡음 한 번에 빨간불이고, 그건 현재 상태를 "정답"으로
 * 단언하는 짓이기도 해요. **더 나빠지면 잡히고, 좋아지면 승격하라고 알려 줍니다.** */
/* 🎚️ 2026-08-29 designer 지시로 조였습니다 — 22% → **17%**.
 * *"상한을 관측 최악에 여유를 둔 −17%로 잡고, 검사는 시드 넷의 평균으로."*
 * 시드 넷 실측(N=20,000): 실점 −14.70 / −14.62 / −14.31 / −14.63 → 평균 **−14.56**.
 * 무실점도 같은 철학으로 42% → **34%** (관측 최악 29.1%에 여유). */
const CONCEDE_CAP = 17;    // %
const CS_CAP = 34;         // %

let base = null;
{
  const E0 = load();
  const per = SEEDS.map((sd) => {
    const A = myClub(E0, sd), B = otherClubs(E0, sd);
    return { A, B, g: rel(A.gf, B.gf), c: rel(A.ga, B.ga), s: rel(A.cs, B.cs) };
  });
  base = { A: per[0].A, B: per[0].B, per };
  const dG = avg(per.map((x) => x.g)), dC = avg(per.map((x) => x.c)), dS = avg(per.map((x) => x.s));
  console.log(`   내 클럽  득점 ${per[0].A.gf.toFixed(3)} · 실점 ${per[0].A.ga.toFixed(3)} · 무실점 ${(per[0].A.cs * 100).toFixed(1)}%   (시드 ${SEEDS[0]})`);
  console.log(`   다른클럽 득점 ${per[0].B.gf.toFixed(3)} · 실점 ${per[0].B.ga.toFixed(3)} · 무실점 ${(per[0].B.cs * 100).toFixed(1)}%`);
  console.log(`   시드 ${SEEDS.length}개 — 득점 ${spread(per.map((x) => x.g))} · 실점 ${spread(per.map((x) => x.c))} · 무실점 ${spread(per.map((x) => x.s))}\n`);

  reg(Math.abs(dG) <= SYM_BAND,
    `31. 🏟️ 여섯 클럽이 같은 산식으로 **득점**한다 — 시드 ${SEEDS.length}개 평균 ${dG >= 0 ? "+" : ""}${dG.toFixed(2)}% (±${SYM_BAND}%)`
    + `\n     측정 조건: _t.skill = ${SKILL} · 명단에 me 없음(순수 산식) · 전력 70:70 · N=${N} · 시드 ${SEEDS.join("/")}`
    + `\n     시드별 ${spread(per.map((x) => x.g))}`);

  /* 31b — 🚧 알려진 미달. 두 갈래로 봅니다:
   *   ① ±15% 밴드에 들어왔나  → 들어왔으면 "승격하세요" 빨간불
   *   ② 상한(CAP)을 넘었나    → 넘으면 회귀 빨간불 (더 나빠진 것) */
  goal("concede-sym", Math.abs(dC) <= SYM_BAND - PROMOTE_MARGIN,
    `31b. 🚧 **실점**은 아직 같은 산식이 아니다 — 차 ${dC >= 0 ? "+" : ""}${dC.toFixed(1)}%`
    + ` (밴드 ±${SYM_BAND}% · **승격 ±${SYM_BAND - PROMOTE_MARGIN}%**)`
    + `${Math.abs(dC) <= SYM_BAND
      ? ` ← 밴드에는 닿았지만 여유가 ${(SYM_BAND - Math.abs(dC)).toFixed(2)}%p뿐이라 승격 안 합니다 (위 주석)` : ""}`);
  reg(Math.abs(dC) <= CONCEDE_CAP,
    `31b-상한. 실점 비대칭이 더 나빠지지 않았다 — 시드 평균 |${dC.toFixed(2)}%| ≤ ${CONCEDE_CAP}% (상한이지 목표가 아니에요)`
    + `\n     시드별 ${spread(per.map((x) => x.c))} · _t.skill = ${SKILL} · me 없음`);

  goal("cs-sym", Math.abs(dS) <= SYM_BAND - PROMOTE_MARGIN,
    `31b. 🚧 **무실점**도 아직 같은 산식이 아니다 — 차 ${dS >= 0 ? "+" : ""}${dS.toFixed(1)}%`
    + ` (밴드 ±${SYM_BAND}% · 승격 ±${SYM_BAND - PROMOTE_MARGIN}%)`);
  reg(Math.abs(dS) <= CS_CAP,
    `31b-상한. 무실점 비대칭이 더 나빠지지 않았다 — 시드 평균 |${dS.toFixed(2)}%| ≤ ${CS_CAP}% (상한이지 목표가 아니에요)`
    + `\n     시드별 ${spread(per.map((x) => x.s))} · _t.skill = ${SKILL} · me 없음`);

  /* 방향까지 못박습니다 — 크기만 보면 **반대로 뒤집혀도** 통과해요.
   * 지금은 내 클럽이 **더 먹히고** 무실점이 **적습니다**(나에게 불리한 쪽).
   * 뒤집히면 그건 "고쳐졌다"가 아니라 다른 고장이라 빨간불이어야 해요.
   *
   * ⚠️ **미달로 남아 있는 동안에만** 봅니다. 2차가 들어와 비대칭이 사라지면
   *    방향 자체가 의미를 잃어요(±15% 안에서는 부호가 잡음으로 갈립니다).
   *    그때는 위 두 줄이 "승격하세요" 빨간불로 알려 주니, 여기까지 같이 빨개지면
   *    **진짜 신호가 잡음에 묻힙니다.** */
  const stillOff = Math.abs(dC) > SYM_BAND || Math.abs(dS) > SYM_BAND;
  if (stillOff) {
    reg(dC < 0 && dS > 0,
      `31b-방향. 비대칭의 방향이 그대로다 — 내 클럽이 더 먹히고(실점 ${dC.toFixed(1)}%) 무실점이 적다(${dS.toFixed(1)}%)`);
  } else {
    console.log(`   (31b-방향은 건너뜁니다 — 실점·무실점이 둘 다 ±${SYM_BAND}% 안이면 방향은 잡음이에요)`);
  }
}

/* ══════════════════════════════════════════════════════════════
 * 30. 🎲 한 장면에 굴림은 하나 — §2-10의 **네 번째 냄새**
 *
 *   *"한 사건을 두 확률의 곱으로 정하는 것."*
 *   예전 `autoMatch`는 `chance(pf * pc)`였어요 — 바로 위 주석이
 *   *"두 번 굴리면 골이 반으로 줄어요"*라고 막으려던 그 일을 **코드가 하고 있었습니다.**
 *   `createMatch`는 칸마다 우리 팀에서 한 명만 봐요(우리 공격 칸이면 pFinish 하나,
 *   상대 공격 칸이면 pConcede 하나). 곱이 되는 형태는 설계 어디에도 없습니다.
 *
 *   변이는 `dw`를 되살리지 않고 `1 - aw`로 씁니다 — `atkW + defW = 1`이라 같은 값이에요.
 *   (engineer가 `pc`를 지우면서 `dw` 인자를 아예 뺐습니다. 되돌아오는 길을 막으려고요.)
 * ══════════════════════════════════════════════════════════════ */
{
  const M = load([[/if \(chance\(pf\)\) \{/,
    "if (chance(pf * (guard ? pConcede(1 - aw, abilityOf(guard)) : 1))) {"]]);
  const B = otherClubs(M, SEEDS[0]);   // 효과가 −45%라 시드 하나로 충분해요
  const dG = rel(base.A.gf, B.gf), dS = rel(base.A.cs, B.cs);
  reg(Math.abs(dG) > SYM_BAND,
    `30-변이. 🎲 chance(pf × pc)로 되돌리면 → 빨간불`
    + ` (다른 클럽 득점/경기 ${base.B.gf.toFixed(3)} → **${B.gf.toFixed(3)}** · 차 ${dG.toFixed(1)}%`
    + ` · 무실점률 ${(base.B.cs * 100).toFixed(1)}% → ${(B.cs * 100).toFixed(1)}%)`);
  reg(Math.abs(dS) > CS_CAP,
    `30-변이. 무실점 상한도 함께 잡는다 (차 ${dS.toFixed(1)}% > ${CS_CAP}%)`);
}

/* ══════════════════════════════════════════════════════════════
 * 32. 🎖️ 칭호 버프가 **리그 경기에 닿는가** (§2-7b)
 *
 *   칭호 여덟 개의 g·a·d가 v2 리그 38라운드에서 **통째로 죽어 있었습니다**
 *   (`buffMul`을 부르는 곳이 `matchContribution` 하나뿐이었고 v2는 카드 엔진을 써요).
 *   닿는 건 🏆 컵뿐이었어요. 🎉 피버도 같이 죽어 있었고요.
 *
 * 🚨 **값을 안 박습니다.** balancer가 실측 ①-L(칭호를 단 시즌이 얼마나 벌어지나)을
 *    아직 재고 있어요. 여기서 보는 건 **관계**뿐입니다 —
 *      ① 버프를 걸면 그 축이 오른다 (배선이 살아 있다)
 *      ② **건 축만** 오른다 (sk가 카드 종류에 맞게 걸린다)
 *      ③ 오르는 폭이 **버프 배수를 넘지 않는다** (11명이 나눠 갖는 몫이니까요)
 *      ④ 경쟁자에게는 **안 붙는다**
 * ══════════════════════════════════════════════════════════════ */
const BUFF = 1.40;         // 버프 배수 — BUFF_CAP.g/a/d = 0.4에서 온 값
const LIFT_MIN = 4;        // % — "닿는다"의 바닥 (실측 10.5~12.8% · 배선을 끊으면 0.00%)
const CROSS_MAX = 4;       // % — 안 건 축이 움직여도 되는 폭 (실측 최대 1.2%)
const CROSS_RATIO = 3;     // 배 — 건 축이 안 건 축보다 이만큼은 더 올라야 (실측 10~128배)
/* ⚠️ n을 6,000에서 **20,000으로 올렸습니다.** 수비수의 시즌 도움은 6,000경기에서
 * 1σ가 ±4.7%예요 — CROSS_MAX 4%가 **잡음에 걸려** 빨간불이 떴습니다(실제로 그랬어요).
 * 성긴 축을 절대값으로 보려면 표본이 그만큼 있어야 합니다.
 * 그리고 절대 밴드 하나에 기대지 않고 **비(CROSS_RATIO)도 함께** 봐요 —
 * 계수가 움직여 상승폭 자체가 커지거나 작아져도 비는 남습니다. */
const BUFF_N = 20000;
const KEYS = [["fw", "g"], ["mf", "a"], ["df", "d"]];

function trip(E, pos, buff, n, seed) {
  E._t.seed(seed); E._t.skill = 0.5;
  let g = 0, a = 0, d = 0;
  for (let i = 0; i < n; i++) {
    const xi = xiOf(pos, 110, 70, i);
    xi.find((x) => x.me).buff = buff;
    const r = E._t.playMatch({ xi, oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
    g += r.myGoals; a += r.assists; d += r.defense;
  }
  return { g: (g / n) * 38, a: (a / n) * 38, d: (d / n) * 38 };
}
const FLAT = { g: 1, a: 1, d: 1 };
const one = (k) => ({ g: 1, a: 1, d: 1, [k]: BUFF });

function liftsOf(E) {
  const out = {};
  for (const [pos, key] of KEYS) {
    const off = trip(E, pos, FLAT, BUFF_N, 3);
    const on = trip(E, pos, one(key), BUFF_N, 3);
    out[key] = { pos, own: 100 * (on[key] / off[key] - 1),
      cross: ["g", "a", "d"].filter((k) => k !== key).map((k) => 100 * (on[k] / off[k] - 1)) };
  }
  return out;
}
const maxCross = (x) => Math.max(...x.cross);
{
  const L = liftsOf(load());
  const line = KEYS.map(([pos, k]) => `${pos}·${k} +${L[k].own.toFixed(1)}%`).join(" · ");
  reg(KEYS.every(([, k]) => L[k].own >= LIFT_MIN),
    `32-1. 🎖️ 칭호 버프가 리그 경기(카드 엔진)에 닿는다 — ${line} (각 ≥${LIFT_MIN}%)`);
  const crossBad = KEYS.filter(([, k]) => maxCross(L[k]) > CROSS_MAX
    || L[k].own < CROSS_RATIO * Math.max(0.1, maxCross(L[k])))
    .map(([pos, k]) => `${pos}·${k} own +${L[k].own.toFixed(1)}% cross ${L[k].cross.map((v) => v.toFixed(1)).join("/")}`);
  reg(crossBad.length === 0,
    `32-2. **건 축만** 오른다 — sk가 카드 종류에 맞게 걸린다`
    + ` (안 건 축 최대 ${Math.max(...KEYS.map(([, k]) => maxCross(L[k]))).toFixed(1)}% ≤ ${CROSS_MAX}%`
    + ` · 건 축이 ${Math.min(...KEYS.map(([, k]) => L[k].own / Math.max(0.1, maxCross(L[k])))).toFixed(1)}배 이상 ≥ ${CROSS_RATIO}배)`
    + (crossBad.length ? ` — ${crossBad.join(" · ")}` : ""));
  reg(KEYS.every(([, k]) => L[k].own < (BUFF - 1) * 100),
    `32-3. 오르는 폭이 버프 배수(+${((BUFF - 1) * 100).toFixed(0)}%)를 안 넘는다 — 11명이 나눠 갖는 몫이에요`);

  /* 🧪 변이 ① — `w(i)`에서 buff 항을 통째로 뺍니다. 배선이 끊기면 정확히 +0.00%예요. */
  const M = load([[/ {6}\* \(\(row\.buff && row\.buff\[sk\]\) \|\| 1\)\n/, ""]]);
  const ML = liftsOf(M);
  reg(KEYS.every(([, k]) => ML[k].own < LIFT_MIN),
    `32-변이①. w(i)에서 buff 항을 빼면 → 빨간불`
    + ` (${KEYS.map(([pos, k]) => `${pos}·${k} ${ML[k].own >= 0 ? "+" : ""}${ML[k].own.toFixed(2)}%`).join(" · ")})`);

  /* 🧪 변이 ② — `sk`를 안 보고 **언제나 g 버프**를 읽게 합니다.
   * 배선은 살아 있지만 **카드 종류에 안 맞는 축**이 걸리는 형태예요.
   * 32-1(도움·차단이 안 오름)과 32-2(골 버프가 엉뚱한 축을 올림)가 같이 잡습니다. */
  const M2 = load([[/ {6}\* \(\(row\.buff && row\.buff\[sk\]\) \|\| 1\)/,
    "      * ((row.buff && row.buff.g) || 1)"]]);
  const M2L = liftsOf(M2);
  const skCaught = !KEYS.every(([, k]) => M2L[k].own >= LIFT_MIN)
    || KEYS.some(([, k]) => maxCross(M2L[k]) > CROSS_MAX);
  reg(skCaught,
    `32-변이②. sk를 안 보고 늘 g 버프를 읽으면 → 빨간불`
    + ` (${KEYS.map(([pos, k]) => `${pos}·${k} own ${M2L[k].own >= 0 ? "+" : ""}${M2L[k].own.toFixed(1)}% cross ${M2L[k].cross.map((v) => v.toFixed(1)).join("/")}`).join(" · ")})`);
}

/* ── 32-4. 게임 층 — 🚨 경쟁자에게는 안 붙는다 ──────────────────
 * `engRow`가 내 줄에만 buff를 실어 줍니다. 페이지를 띄워 **진짜 함수**로 봐요. */
{
  const item = (() => {
    const s = fs.readFileSync(path.join(BETA, "_fixtures.js"), "utf8");
    const m = s.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
    const F = m ? new Function(`return ${m[1]};`)() : null;
    return F && F.items.find((x) => x.id === "winger2-match");
  })();
  if (!item) { console.log("❌ winger2 확인용 세이브를 못 찾았어요 (beta/_fixtures.js)"); process.exit(1); }
  const PRE = `window.fetch=()=>Promise.reject(new Error("off"));
window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};
window.alert=()=>{};window.confirm=()=>false;
window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message||e.error));});
` + Object.entries(item.keys).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("");
  const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(DIR, src.split("?")[0]);
      return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
    })
    .replace("</head>", `<script>${PRE}</script></head>`)
    /* game.js의 최상위 const(buffMul·BUFF_CAP)는 window에 안 붙어요 — eval로 꺼냅니다 */
    .replace("</body>", `<script>window.__get=(n)=>eval(n);</script></body>`);
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/winger2/" });
  const w = dom.window;
  w.Ads = { display() {}, init() {} }; w.Stats = { log() {} };
  w.document.getElementById("btn-continue").click();
  const go0 = w.document.querySelector(".slot-modal .slot-go");
  if (go0) go0.click();

  const CT = w.WingerCareer._t;
  const S = CT.state();
  const buffMul = w.__get("buffMul");
  const CAP = w.__get("BUFF_CAP");
  const rowsOf = () => Object.values(CT.clubRows()).flat();
  const meRow = () => rowsOf().find((r) => r.me);
  /* 🪑 **벤치는 정상입니다 — 결함이 아니에요.**
   *
   * `clubRows()`는 `WingerSquad.leagueXI()`를 그대로 읽습니다. 내가 그 라운드 선발에서
   * 빠지면 `me` 줄이 통째로 없어요. 2026-08-29에 픽스처의 21세 신인이 나이곡선을 타면서
   * 종합 49.4 → 41.3이 되어 **벤치로 밀렸고**, 그 순간 아래 32-4~8·34가
   * `undefined.buff`로 **파일을 죽였습니다.**
   *
   * 🔴 그때 제가 "내 줄이 있다"를 회귀로 걸었는데 **그건 틀린 계약이었어요** —
   *    벤치는 게임이 원래 하는 일이고, 밸런스가 움직이면 언제든 다시 그렇게 됩니다.
   *    검사가 밸런스 변경을 못 견디면 그 검사가 잘못된 겁니다.
   *
   * 🔧 그래서 **계약을 바꿉니다**:
   *    · 지키는 것 — *"선발이면 me 줄이 있고, 벤치면 없다"* (leagueXI ↔ clubRows 정합)
   *    · 그리고 아래 buff 검사는 **선발 상태를 만들어 놓고** 돕니다.
   *      벤치라서 건너뛰면 "안 돈 것"이 초록으로 섞이니까요.
   *      스탯을 올리는 건 **검사 쪽 준비**이지 소스를 고치는 게 아닙니다. */
  const benched = !meRow();
  reg(w.WingerSquad.isStarter() === !benched,
    `32-0. 🔗 clubRows()가 leagueXI와 맞는다 — 선발이면 me 줄이 있고 벤치면 없다`
    + ` (전체 ${rowsOf().length}줄 · me ${rowsOf().filter((r) => r.me).length}줄 · isStarter ${w.WingerSquad.isStarter()})`);
  if (benched) {
    /* 🪑 벤치였으면 선발이 되도록 세워 둡니다 — 이 절은 내 줄이 있어야 도는 검사예요. */
    for (const k of Object.keys(S.stats)) S.stats[k] = 95;
    if (S.activity) S.activity.xiWeek = -1;
  }
  const HAVE_ME = !!meRow();
  reg(HAVE_ME,
    `32-0b. 🪑 벤치였으면 **선발로 세워** 아래 검사를 돌린다 (${benched ? "벤치였음 → 선발로" : "원래 선발"} · me ${rowsOf().filter((r) => r.me).length}줄)`
    + (HAVE_ME ? "" : `\n     🔴 스탯을 올려도 선발에 못 듭니다 — leagueXI를 보세요`));
  if (!HAVE_ME) { w.close(); }

  if (HAVE_ME) {
  S.buffs = []; S.buffY = S.proYear;
  const flat = meRow().buff;
  reg(!!flat && flat.g === 1 && flat.a === 1 && flat.d === 1,
    `32-4. 칭호가 없으면 내 buff가 {g:1, a:1, d:1}이다 (${JSON.stringify(flat)})`);

  /* 🥇 골든부츠 위너(g +15%) + 🏅 발롱도르 위너(모든 기여 +8%)를 심습니다 */
  S.buffs = ["boot", "ballon"]; S.buffY = S.proYear;
  const on = meRow().buff;
  reg(on.g > 1 && on.a > 1 && on.d > 1,
    `32-5. 칭호를 달면 내 buff가 오른다 — g ${on.g.toFixed(3)} · a ${on.a.toFixed(3)} · d ${on.d.toFixed(3)}`);
  reg(on.g === buffMul("g") && on.a === buffMul("a") && on.d === buffMul("d"),
    `32-6. engRow가 넘기는 값이 buffMul과 **정확히** 같다 (엔진은 전역을 안 읽어요 · §10-3b)`);
  reg(on.g <= 1 + CAP.g && on.a <= 1 + CAP.a && on.d <= 1 + CAP.d,
    `32-7. BUFF_CAP(g/a/d 각 +${(CAP.g * 100).toFixed(0)}%) 안이다 — 피버 없이는 상한을 안 넘어요`);

  const others = rowsOf().filter((r) => !r.me);
  const leaked = others.filter((r) => r.buff != null);
  reg(others.length >= 50 && leaked.length === 0,
    `32-8. 🚨 경쟁자 ${others.length}명 전원 buff가 null이다 — 칭호는 내 커리어가 쌓은 것이에요`
    + (leaked.length ? ` — 붙은 사람 ${leaked.length}명 (${leaked.slice(0, 3).map((r) => r.name).join(", ")})` : ""));
  /* ══════════════════════════════════════════════════════════════
   * 34. 🧯 `BUFF_CAP` — **안전장치**입니다. 평소에 안 물리는 게 정상이에요
   *
   * designer 판정: *"안전장치이고, 브레이크가 안 밟히는 게 정상."*
   *
   * 🔴 **2026-08-29 정정** — designer가 자기 예상이 틀렸다고 되돌렸습니다.
   *   처음엔 *"부문상 넷이 다 살아나면 그때 물린다"*고 봤는데,
   *   **부문상 셋은 축이 서로 달라 같은 키에 안 쌓입니다** — 🥇는 `g` · 🎯는 `a` · 🛡️는 `d`
   *   (33-A2가 그걸 소스에서 확인합니다). 같은 키에 겹치는 건 **모든 기여**에 붙는
   *   칭호들이고(🏅 발롱도르 +8% · 🥈 베스트11 +5% · 🌏 월드컵 위너 +10%),
   *   실제 트리거는 **발롱도르 + 월드컵 우승이 겹칠 때**입니다.
   *
   * 그래서 *"어떤 다섯 개인가"*가 중요해집니다 — 아무거나 다섯이 아니라
   * **같은 키에 쌓이는 조합**이어야 이 검사가 무언가를 지킵니다.
   *
   * 여기서 보는 건 셋 다 **관계**예요 (`BUFF_CAP` 값이 움직여도 성립합니다):
   *   ① 흔한 조합에서는 **안 잘린다**
   *   ② designer가 지목한 실제 겹침(🏅+🌏)도 **아직 상한 아래** — 그래서 평소엔 안 물려요
   *   ③ 같은 키에 충분히 쌓으면 **잘린다**
   * ══════════════════════════════════════════════════════════════ */
  {
    /* 🔎 칭호 효과는 **소스에서 뜯어옵니다** — 검사에 0.15/0.08을 박으면 효과표를 바꿔도 안 잡혀요. */
    const TSRC = fs.readFileSync(path.join(DIR, "game.js"), "utf8").match(/const SEASON_TITLES = \[[\s\S]*?\n\];/);
    if (!TSRC) throw new Error("game.js에서 SEASON_TITLES를 못 뜯었어요");
    const TITLES = new Function("HOT_FORM_BAR", "WC_CAMP_BUFF", `${TSRC[0]}\nreturn SEASON_TITLES;`)(0, null);
    const effOf = (ids, key) => ids.reduce((n, id) => {
      const t = TITLES.find((x) => x.id === id);
      return n + ((t && t.eff && t.eff[key]) || 0);
    }, 0);
    const setBuffs = (ids) => { S.buffs = ids; S.buffY = S.proYear; };

    /* ① 흔한 조합 — 🥇 골든부츠 하나 */
    setBuffs(["boot"]);
    const one1 = buffMul("g");
    reg(one1 > 1 && one1 < 1 + CAP.g,
      `34-1. 🧯 흔한 조합(🥇 골든부츠 하나)에서는 상한이 **안 물린다** — g ${one1.toFixed(3)} < ${(1 + CAP.g).toFixed(2)}`
      + ` (브레이크가 안 밟히는 게 정상이에요)`);

    /* ② 🔴 부문상 셋은 **같은 키에 안 쌓입니다** — designer 정정의 핵심 */
    setBuffs(["boot", "maker", "wall"]);
    const three3 = { g: buffMul("g"), a: buffMul("a"), d: buffMul("d") };
    reg(three3.g < 1 + CAP.g && three3.a < 1 + CAP.a && three3.d < 1 + CAP.d,
      `34-2. 🥇🎯🛡️ **셋을 다 받아도 안 물린다** — 축이 g·a·d로 갈려서 같은 키에 안 쌓여요`
      + ` (g ${three3.g.toFixed(3)} · a ${three3.a.toFixed(3)} · d ${three3.d.toFixed(3)} · 각 < ${(1 + CAP.g).toFixed(2)})`);

    /* ③ designer가 지목한 **실제 겹침** — 🏅 발롱도르 + 🌏 월드컵 위너 (둘 다 모든 기여) */
    setBuffs(["ballon", "wcwin"]);
    const real2 = buffMul("g");
    const raw2 = effOf(["ballon", "wcwin"], "g");
    reg(raw2 > 0 && real2 < 1 + CAP.g,
      `34-3. 🏅 발롱도르 + 🌏 월드컵 위너 — **같은 키에 쌓이지만 아직 상한 아래**`
      + ` (합 +${(raw2 * 100).toFixed(0)}% → g ${real2.toFixed(3)} < ${(1 + CAP.g).toFixed(2)})`
      + `\n     👉 이게 designer가 말한 "실제 트리거". 여기에 부문상이 더 얹혀야 물립니다`);

    /* ④ 같은 키(g)에 충분히 쌓으면 잘린다 — 다섯 개 전부 `g`에 기여하는 조합이에요 */
    const FIVE = ["boot", "point", "ballon", "eleven", "wcwin"];
    const rawG = effOf(FIVE, "g");
    setBuffs(FIVE);
    const capped = { g: buffMul("g"), a: buffMul("a"), d: buffMul("d") };
    const gKeys = FIVE.filter((id) => (TITLES.find((x) => x.id === id).eff || {}).g);
    reg(gKeys.length === FIVE.length && rawG > CAP.g,
      `34-4. 표본이 **전부 같은 키(g)에 쌓이고** 상한을 넘긴다 — ${FIVE.length}개 중 g 기여 ${gKeys.length}개 · 합 ${rawG.toFixed(2)} > ${CAP.g}`
      + ` (아무 다섯이 아니라 **같은 키** 조합이어야 34-5가 무언가를 지켜요)`);
    reg(Math.abs(capped.g - (1 + CAP.g)) < 1e-9,
      `34-5. 🧯 같은 키에 충분히 쌓이면 **상한에서 잘린다** — g ${capped.g.toFixed(3)} = 1 + ${CAP.g} (합 ${rawG.toFixed(2)}이 아니라)`);
    reg(capped.a <= 1 + CAP.a + 1e-9 && capped.d <= 1 + CAP.d + 1e-9,
      `34-6. a·d도 각자 상한 안이다 — a ${capped.a.toFixed(3)} · d ${capped.d.toFixed(3)} (≤ ${(1 + CAP.a).toFixed(2)})`);

    /* ⑤ 잘린 값이 엔진까지 그대로 — 상한이 화면에서만 걸리면 소용없어요 */
    const rowBuff = meRow().buff;
    reg(rowBuff.g === capped.g && rowBuff.a === capped.a && rowBuff.d === capped.d,
      `34-7. 잘린 값이 **엔진으로 그대로** 간다 (engRow → w(i)) — g ${rowBuff.g.toFixed(3)}`);

    setBuffs([]);
  }

  reg(w.__errs.length === 0, `페이지에 자바스크립트 오류가 없다${w.__errs.length ? ` — ${w.__errs[0]}` : ""}`);
  w.close();
  }
}

/* ══════════════════════════════════════════════════════════════
 * 44. 🎮 **31b는 코드가 아니라 「코드 + 플레이어」를 잽니다** (2026-08-29 · balancer 지적)
 *
 * 🔴 balancer가 `_t.skill`을 흔드니 **같은 코드가 통과도 실패도** 했습니다.
 *    31b가 재는 실점 비대칭에 **조작 실력이 실려 있었어요** — 내 🧱 수비 카드의
 *    성공이 곧 우리 클럽의 실점을 줄이니까요.
 *
 * 그래서 둘로 갈랐습니다. **같은 축을 재는 것 같지만 묻는 게 다릅니다.**
 *
 *   31b  명단에 **me 없음** → 조작이 개입할 자리가 없어요.  **순수 산식 대칭**을 잽니다
 *        (실측: skill을 0.35~0.65로 흔들어도 −14.56%에서 **소수점 하나 안 움직입니다**)
 *   44   명단에 **me 있음**(df110) → 내 카드가 실점에 직접 걸려요. **실제 플레이**를 잽니다
 *
 * 🚨 **44는 절대값을 안 박습니다.** balancer가 준 밴드 창 `E[s] ∈ [0.44, 0.58]`
 *    (조작 실력 전체 폭 ≈ 능력치 17점) 안에서 **관계 셋**만 봐요 —
 *      ① 잘할수록 덜 먹힌다 (단조)   ② 그 폭이 실제로 있다 (검사가 skill을 탄다)
 *      ③ 창 전체에서 상한 안
 *    창을 벗어난 실력(0.35·0.65)은 balancer 몫입니다 — 여기서 문턱을 박으면
 *    **코드가 아니라 가상 플레이어를 재게** 돼요(52번 §3에서 데인 그 자리).
 * ══════════════════════════════════════════════════════════════ */
const SKILL_BAND = [0.44, 0.58];   // balancer 실측 — 실플레이 E[s]가 도는 폭
const SKILL_MID = 0.50;            // 🤖 자동 진행이 내는 값 (실력 하한선)
const PLAY_CAP = 8;                // % — 창 안에서의 실점 비대칭 상한 (실측 최대 3.4%)
const PLAY_SPAN_MIN = 3;           // %p — 창 양 끝의 벌어짐. 이만큼은 있어야 "skill을 탄다"
const N44 = 8000;
{
  const E0 = load();
  /* 상대 쪽(autoMatch)은 skill과 무관해요 — 시드당 한 번만 재서 돌려씁니다 */
  const other = SEEDS.map((sd) => otherClubs(E0, sd));
  const meClub = (sd, sk) => {
    E0._t.seed(sd); E0._t.skill = sk;
    let ga = 0, cs = 0;
    for (let i = 0; i < N44; i++) {
      const r = E0._t.playMatch({ xi: xiOf("df", 110, 70, i), oppName: "상대",
        teamStr: 70, oppStr: 70, condition: 80 });
      ga += r.oppGoals; if (!r.oppGoals) cs += 1;
    }
    return { ga: ga / N44, cs: cs / N44 };
  };
  const at = (sk) => {
    const per = SEEDS.map((sd, i) => rel(meClub(sd, sk).ga, other[i].gf));
    return { avg: avg(per), per };
  };
  const lo = at(SKILL_BAND[0]), mid = at(SKILL_MID), hi = at(SKILL_BAND[1]);
  console.log(`   🎮 내가 df110일 때 실점 비대칭 — skill ${SKILL_BAND[0]} ${lo.avg.toFixed(2)}%`
    + ` · ${SKILL_MID} ${mid.avg.toFixed(2)}% · ${SKILL_BAND[1]} ${hi.avg.toFixed(2)}%`);
  console.log(`      시드별 ${SKILL_BAND[0]} ${spread(lo.per)} · ${SKILL_MID} ${spread(mid.per)} · ${SKILL_BAND[1]} ${spread(hi.per)}\n`);

  reg(lo.avg < mid.avg && mid.avg < hi.avg,
    `44-1. 🎮 **잘할수록 덜 먹힌다** — skill ${SKILL_BAND[0]} → ${SKILL_MID} → ${SKILL_BAND[1]}에서`
    + ` ${lo.avg.toFixed(2)}% < ${mid.avg.toFixed(2)}% < ${hi.avg.toFixed(2)}% (단조)`);

  const span = hi.avg - lo.avg;
  reg(span >= PLAY_SPAN_MIN,
    `44-2. 🎮 그 폭이 실제로 있다 — 창 양 끝이 **${span.toFixed(2)}%p** 벌어진다 (≥${PLAY_SPAN_MIN}%p)`
    + `\n     👉 이 폭이 0이면 **검사가 조작을 아예 안 보고 있다**는 뜻이에요`);

  const worst = Math.max(...[lo, mid, hi].map((x) => Math.max(...x.per.map(Math.abs))));
  reg(worst <= PLAY_CAP,
    `44-3. 🎮 밴드 창 [${SKILL_BAND.join(", ")}] 전체 · 시드 ${SEEDS.length}개에서 |비대칭| ≤ ${PLAY_CAP}%`
    + ` (최악 ${worst.toFixed(2)}%) — 상한이지 목표가 아니에요`);

  /* 🔗 31b의 측정 조건이 코드에 남아 있는가 — 나중에 기본값이 바뀌면 여기서 웁니다 */
  reg(SKILL === SKILL_MID && E0._t.skill === SKILL_BAND[1],
    `44-4. 🔗 측정 조건이 코드에 명시돼 있다 — 31b는 _t.skill = ${SKILL} (🤖 자동 진행과 같은 값)`
    + ` · 44는 ${SKILL_BAND.join("/")}를 직접 설정`);

  /* 🧪 변이 — `_t.skill`을 무시하고 늘 0.5로 굴리면 폭이 사라져 44-2가 빨간불이어야 합니다.
   * 이게 안 잡히면 44는 "조작을 본다"고 말만 하는 검사예요. */
  const MSK = [[/const autoJudge = \(kind\) => judgeAt\(kind, _skill == null \? 0\.5 : _skill\);/,
    "const autoJudge = (kind) => judgeAt(kind, 0.5);"]];
  const bad = mutsOK({ "44-skill": MSK });
  if (bad.length) {
    reg(false, `44-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${bad.join(", ")}`);
  } else {
    const M = load(MSK);
    const mAt = (sk) => {
      const per = SEEDS.map((sd, i) => {
        M._t.seed(sd); M._t.skill = sk;
        let ga = 0;
        for (let j = 0; j < N44; j++) {
          ga += M._t.playMatch({ xi: xiOf("df", 110, 70, j), oppName: "상대",
            teamStr: 70, oppStr: 70, condition: 80 }).oppGoals;
        }
        return rel(ga / N44, other[i].gf);
      });
      return avg(per);
    };
    const mSpan = mAt(SKILL_BAND[1]) - mAt(SKILL_BAND[0]);
    reg(!(mSpan >= PLAY_SPAN_MIN),
      `44-변이. _t.skill을 무시하고 늘 0.5로 굴리면 → 빨간불 (폭 ${span.toFixed(2)}%p → **${mSpan.toFixed(2)}%p**)`);
  }
}

/* ══════════════════════════════════════════════════════════════
 * 33. 🏆 ①-G 최종 통과 기준 — **G-7이 2026-08-29에 재정의됐습니다** (§2-8b (8c))
 *
 *   | | 옛 기준 | 새 기준 |
 *   |---|---|---|
 *   | 세 독립 축 🥇🎯🛡️ | 수상률 격차 ≤12%p | **그대로** (현재 0.7%p) |
 *   | 넷 전체 | 수상률 격차 ≤12%p | 🔄 **「수상률 × 효과」 격차 ≤30%** (현재 22%) |
 *   | 📈 단독 | — | 🆕 **25 ~ 45%** (현재 35.6%) |
 *
 * designer 근거: 📈 공격포인트왕은 **파생 축**(골+도움)이라 리그 1위가 구조적으로 낮고,
 * 개념집의 칭호 효과표가 이미 그에 맞춰 **효과를 40%로** 적어 뒀습니다
 * (🥇🎯🛡️ 각 +15% · 📈 골·도움 +6%). *"문턱이 낮고 효과가 약한 것은 서로 정합적"* —
 * 📈만 효과가 40%인데 수상률까지 같기를 요구한 게 앞뒤가 안 맞았어요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚪ **수상률 자체는 여기서 못 잽니다 — balancer 몫입니다.** 그래서 이렇게 나눕니다.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 수상률은 `내 기록 ÷ 리그 1위 기록` → hype → 수상 판정으로 갈려서 **커리어 몬테카를로**가
 * 필요합니다. 제가 여기서 리그 드라이버를 새로 짜면 이 저장소가 여섯 번 데인
 * **"경로가 다른 시뮬레이터"**가 돼요(`tests/soccer/`의 그 여섯 파일).
 *
 * 대신 **세 조각으로 갈라** 각자 지킬 수 있는 것을 지킵니다:
 *
 *   33-A 🔎 **효과표** — 소스에서 뜯어옵니다. 새 기준이 통째로 이 표 위에 서 있어요.
 *        📈의 효과가 셋과 같아지면 "자주 받아도 정합적"이라는 근거가 사라집니다
 *   33-B 🔗 **수상률의 유효 조건** — balancer 실측은 **특정 계수 위에서** 잰 값이에요.
 *        그 계수가 움직이면 그 수상률은 무효입니다. 그걸 검사가 지킵니다
 *   33-C 🧮 **기준 판정** — 소스의 효과 × (33-B가 유효를 보증한) 수상률
 *
 * 🚨 **33-C의 수상률은 "측정"이 아니라 "기록"입니다.** 계수가 그대로인 동안만 유효해요.
 *    계수를 옮기면 33-B가 먼저 빨간불로 *"수상률을 다시 재세요"*라고 말합니다.
 * ══════════════════════════════════════════════════════════════ */

/* 📌 balancer 실측 (`23_balancer_award-gate.md` · `41_engineer_gate-final.md` · 2026-08-29).
 * **검사가 잰 값이 아니라 옮겨 적은 값입니다.** 아래 33-B가 유효 조건을 지킵니다. */
const RATE = { "골든부츠": 0.183, "플레이메이커": 0.176, "철벽상": 0.181, "공격포인트왕": 0.356 };
/* 그 수상률을 잰 계수 — 하나라도 움직이면 위 표는 무효예요 */
const RATE_AT = {
  NPC_SPOT: { goal: 3.05, assist: 6.50, defend: 4.90 },
  POS_AXIS_N: { fw: 1.072, wg: 0.967, mf: 0.873, df: 0.794 },
  AXIS_OFF: 2.35, ASSIST_P2: 0.48, MOM_MIN: 8.40,
};
const GAP3_MAX = 12;       // %p — 세 독립 축 (문턱을 검사에 박습니다)
const GAIN_GAP_MAX = 30;   // %  — 넷의 「수상률 × 효과」
const POINT_BAND = [25, 45]; // % — 📈 단독

/* 🔎 효과는 **소스에서 뜯어옵니다** — 0.15/0.06을 검사에 박으면 효과표를 바꿔도 안 잡혀요.
 * (수상률 문턱은 박고 효과는 뜯어온다 — 방향이 반대인 그 규칙입니다.)
 * 부문상 이름 → `AWARD_BUFF` → 칭호 id → `SEASON_TITLES`의 eff 로 이어 갑니다. */
const GAME_SRC = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
function effTable() {
  const tm = GAME_SRC.match(/const SEASON_TITLES = \[[\s\S]*?\n\];/);
  const am = GAME_SRC.match(/const AWARD_BUFF = \{[\s\S]*?\n\};/);
  if (!tm || !am) throw new Error("game.js에서 SEASON_TITLES/AWARD_BUFF를 못 뜯었어요 — 정규식을 고치세요");
  /* 🔒 직접 eval을 안 씁니다 — const가 eval 스코프에 갇혀 값이 늘 undefined가 돼요.
   *    HOT_FORM_BAR 같은 바깥 이름이 섞여 있어서 자리만 채워 줍니다. */
  const { T, A } = new Function("HOT_FORM_BAR", "WC_CAMP_BUFF",
    `${tm[0]}\n${am[0]}\nreturn { T: SEASON_TITLES, A: AWARD_BUFF };`)(0, null);
  const out = {};
  for (const [award, id] of Object.entries(A)) {
    const t = T.find((x) => x.id === id);
    if (t) out[award] = { id, eff: t.eff || {}, name: t.name };
  }
  return out;
}

{
  const EFF = effTable();
  const AWARDS = ["골든부츠", "플레이메이커", "철벽상", "공격포인트왕"];
  const missing = AWARDS.filter((a) => !EFF[a]);
  reg(missing.length === 0,
    `33-A0. 부문상 넷이 전부 칭호로 이어진다 (AWARD_BUFF → SEASON_TITLES)`
    + (missing.length ? ` — 끊긴 것: ${missing.join(", ")}` : ` — ${AWARDS.map((a) => `${a}→${EFF[a].id}`).join(" · ")}`));

  /* ── 33-A. 🔎 효과표 — 새 기준이 통째로 이 표 위에 서 있습니다 ── */
  const sizeOf = (a) => Math.max(...["g", "a", "d"].map((k) => EFF[a].eff[k] || 0));
  const keysOf = (a) => ["g", "a", "d"].filter((k) => EFF[a].eff[k]);
  const three = ["골든부츠", "플레이메이커", "철벽상"];
  const sizes = three.map(sizeOf);
  reg(sizes.every((v) => v > 0 && Math.abs(v - sizes[0]) < 1e-9),
    `33-A1. 🥇🎯🛡️ 세 상의 효과 크기가 **서로 같다** — ${three.map((a, i) => `${a} +${(sizes[i] * 100).toFixed(0)}%`).join(" · ")}`);
  const seats = three.map(keysOf);
  reg(seats.every((k) => k.length === 1) && new Set(seats.map((k) => k[0])).size === 3,
    `33-A2. 셋이 **서로 다른 축**에 붙는다 — ${three.map((a, i) => `${a}→${seats[i].join("")}`).join(" · ")}`
    + ` (같은 키에 안 쌓이는 근거예요 · G-13)`);
  const pt = sizeOf("공격포인트왕");
  reg(pt > 0 && pt < sizes[0],
    `33-A3. 📈 공격포인트왕의 효과가 **셋보다 작다** — +${(pt * 100).toFixed(0)}% = 셋의 ${(pt / sizes[0] * 100).toFixed(0)}%`
    + `\n     👉 이게 "📈는 자주 받아도 정합적"의 **유일한 근거**입니다. 같아지면 G-7 재정의가 무너져요`);

  /* ── 33-B. 🔗 수상률의 유효 조건 — 계수가 그대로여야 위 RATE가 유효합니다 ── */
  const CAREER_SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
  const num = (src, re) => { const m0 = src.match(re); return m0 ? Number(m0[1]) : NaN; };
  const nsNow = load().K.NPC_SPOT;
  const posNow = {};
  const pm = CAREER_SRC.match(/const POS_AXIS = \{[\s\S]*?\n {2}\};/);
  if (pm) for (const [, k, v] of pm[0].matchAll(/(\w+):\s*\{[^}]*n:\s*([\d.]+)/g)) posNow[k] = Number(v);
  const drift = [];
  for (const k of ["goal", "assist", "defend"]) if (nsNow[k] !== RATE_AT.NPC_SPOT[k]) drift.push(`NPC_SPOT.${k} ${nsNow[k]}≠${RATE_AT.NPC_SPOT[k]}`);
  for (const k of ["fw", "wg", "mf", "df"]) if (posNow[k] !== RATE_AT.POS_AXIS_N[k]) drift.push(`POS_AXIS.${k}.n ${posNow[k]}≠${RATE_AT.POS_AXIS_N[k]}`);
  if (num(CAREER_SRC, /const AXIS_OFF\s*=\s*([\d.]+)/) !== RATE_AT.AXIS_OFF) drift.push("AXIS_OFF");
  if (num(CAREER_SRC, /const MOM_MIN\s*=\s*([\d.]+)/) !== RATE_AT.MOM_MIN) drift.push("MOM_MIN");
  if (load().K.ASSIST_P2 !== RATE_AT.ASSIST_P2) drift.push("ASSIST_P2");
  reg(drift.length === 0,
    `33-B. 🔗 위 수상률을 잰 **계수가 그대로다** — 움직였으면 그 수상률은 무효예요`
    + (drift.length
      ? `\n     🔴 움직인 것: ${drift.join(" · ")}\n     👉 balancer에게 **G-2·G-7 수상률 재측정**을 요청하고, 위 RATE·RATE_AT를 함께 고치세요.`
        + `\n        아래 33-C는 지금 **옛 수상률로 계산한 값**이라 믿으면 안 됩니다`
      : ` (NPC_SPOT ${RATE_AT.NPC_SPOT.goal}/${RATE_AT.NPC_SPOT.assist}/${RATE_AT.NPC_SPOT.defend} · POS_AXIS.n 넷 · AXIS_OFF · ASSIST_P2 · MOM_MIN)`));

  /* ── 33-C. 🧮 기준 판정 — 소스의 효과 × 기록된 수상률 ── */
  const gain = {};
  for (const a of AWARDS) gain[a] = RATE[a] * sizeOf(a);
  const gv = AWARDS.map((a) => gain[a]);
  const gapPct = 100 * (Math.max(...gv) - Math.min(...gv)) / Math.max(...gv);
  const r3 = three.map((a) => RATE[a] * 100);
  const gap3 = Math.max(...r3) - Math.min(...r3);
  reg(gap3 <= GAP3_MAX,
    `33-C1. ① 세 독립 축의 수상률 격차 ≤${GAP3_MAX}%p — ${three.map((a, i) => `${a} ${r3[i].toFixed(1)}%`).join(" · ")} → **${gap3.toFixed(1)}%p**`);
  reg(gapPct <= GAIN_GAP_MAX,
    `33-C2. ② 넷의 「수상률 × 효과」 격차 ≤${GAIN_GAP_MAX}% — `
    + AWARDS.map((a) => `${a} ${(gain[a] * 1000).toFixed(1)}‰`).join(" · ") + ` → **${gapPct.toFixed(0)}%**`);
  const pr = RATE["공격포인트왕"] * 100;
  reg(pr >= POINT_BAND[0] && pr <= POINT_BAND[1],
    `33-C3. ③ 📈 단독 ${POINT_BAND[0]}~${POINT_BAND[1]}% — **${pr.toFixed(1)}%**`
    + ` (상한이 없으면 기대 이득 기준만으로는 60%도 통과해요 · career.js:2240)`);

  /* 🧪 변이 — 📈의 효과를 셋과 같은 +15%로 올리면 기대 이득이 어긋납니다.
   * 효과를 소스에서 안 뜯고 검사에 박았다면 **이 변이가 안 잡힙니다.** */
  const MSRC = GAME_SRC.replace(/(\{ id: "point",[\s\S]*?eff: \{ g: )0\.06(, a: )0\.06( \})/, "$10.15$20.15$3");
  if (MSRC === GAME_SRC) {
    reg(false, "33-변이가 **안 돌았습니다** — game.js의 point 칭호 정규식이 소스와 안 맞아요");
  } else {
    const tm2 = MSRC.match(/const SEASON_TITLES = \[[\s\S]*?\n\];/);
    const T2 = new Function("HOT_FORM_BAR", "WC_CAMP_BUFF", `${tm2[0]}\nreturn SEASON_TITLES;`)(0, null);
    const pt2 = Math.max(...["g", "a", "d"].map((k) => (T2.find((x) => x.id === "point").eff[k] || 0)));
    const g2 = AWARDS.map((a) => RATE[a] * (a === "공격포인트왕" ? pt2 : sizeOf(a)));
    const gap2 = 100 * (Math.max(...g2) - Math.min(...g2)) / Math.max(...g2);
    reg(gap2 > GAIN_GAP_MAX,
      `33-변이. 📈의 효과를 셋과 같은 +${(pt2 * 100).toFixed(0)}%로 올리면 → 빨간불`
      + ` (기대 이득 격차 ${gapPct.toFixed(0)}% → **${gap2.toFixed(0)}%**)`);
  }
}

/* ══════════════════════════════════════════════════════════════
 * 33-D. 🅰️ G-7이 선 **전제** — 도움 축이 fw로 안 넘어갔나
 *
 * `ACE_POOL.assist`에 `fw`를 넣은 대가로 도움 축이 넘어가면, balancer가 계수를
 * 아무리 맞춰도 G-7이 안 섭니다. designer 계산은
 * *"에이스 자리는 넘겨줘도 축은 안 넘어간다"*였어요 — 그게 참인지 봅니다.
 * 값이 아니라 **순서와 배수**를 봐요.
 * ══════════════════════════════════════════════════════════════ */
const ASSIST_LEAD = 2.0;   // 배 — mf가 2위 포지션보다 이만큼은 앞서야 (실측 2.4배)
{
  const E = load();
  const POS4 = ["fw", "wg", "mf", "df"];
  const share = (o) => { const t = POS4.reduce((a, p) => a + o[p], 0); const r = {}; for (const p of POS4) r[p] = t ? o[p] / t : 0; return r; };
  const fmt = (o) => POS4.map((p) => `${p} ${(o[p] * 100).toFixed(1)}%`).join(" ");
  function dist(Eng, n, seed) {
    Eng._t.seed(seed);
    const a = { fw: 0, wg: 0, mf: 0, df: 0 }, g = { fw: 0, wg: 0, mf: 0, df: 0 };
    for (let i = 0; i < n; i++) {
      const r = Eng._t.autoMatch({ xiA: xiAll(70, i), xiB: xiAll(70, i + 1e6), strA: 70, strB: 70 });
      for (const l of [r.goalsA, r.goalsB]) for (const o of l) {
        g[o.scorer.pos] += 1; if (o.assister) a[o.assister.pos] += 1;
      }
    }
    return { a: share(a), g: share(g) };
  }
  /* 에이스 **자리**는 검사가 직접 계산합니다 — `aceOf`의 규칙(능력치 최대)을 옮겨 적었어요.
   * 엔진 출력을 정답으로 삼으면 자기 자신과 비교가 됩니다. */
  function aceSeat(Eng, pool, n) {
    const c = { fw: 0, wg: 0, mf: 0, df: 0 };
    for (let i = 0; i < n; i++) {
      const cand = xiAll(70, i).filter((x) => pool.indexOf(x.pos) >= 0);
      const ace = cand.reduce((x, y) => (Eng.blendOf(x) >= Eng.blendOf(y) ? x : y), cand[0]);
      c[ace.pos] += 1;
    }
    return share(c);
  }
  const D = dist(E, 20000, 77);
  const seat = aceSeat(E, ["mf", "wg", "fw"], 4000);
  const second = Math.max(D.a.fw, D.a.wg, D.a.df);
  reg(D.a.mf === Math.max(...POS4.map((p) => D.a[p])) && D.a.mf >= ASSIST_LEAD * second,
    `33-D1. 🅰️ 도움 축은 여전히 **mf가 쥔다** — mf ${(D.a.mf * 100).toFixed(1)}% · 2위 ${(second * 100).toFixed(1)}%`
    + ` (${(D.a.mf / second).toFixed(2)}배 ≥ ${ASSIST_LEAD}배)\n     도움 [${fmt(D.a)}]`);
  reg(seat.fw > 0.10 && D.a.fw < D.a.mf / 2,
    `33-D2. **에이스 자리는 넘겨줘도 축은 안 넘어간다** — fw가 도움 에이스 자리의`
    + ` ${(seat.fw * 100).toFixed(1)}%를 가져가지만 도움 축은 ${(D.a.fw * 100).toFixed(1)}% (mf의 4분의 1)`
    + `\n     도움 에이스 자리 [${fmt(seat)}]`);
  reg(D.g.fw === Math.max(...POS4.map((p) => D.g[p])),
    `33-D3. ⚽ 득점 축은 이 변경에 안 닿는다 — fw가 여전히 최대 (${fmt(D.g)})`);

  const MREV = [[/assist: \["mf", "wg", "fw"\]/, 'assist: ["mf", "wg"]']];
  const bad = mutsOK({ "33-ACE_POOL": MREV });
  if (bad.length) {
    reg(false, `33-D-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${bad.join(", ")}`);
  } else {
    const M = load(MREV);
    const seatM = aceSeat(M, ["mf", "wg"], 4000);
    const DM = dist(M, 20000, 77);
    reg(!(seatM.fw > 0.10),
      `33-D-변이. ACE_POOL.assist에서 fw를 빼면 → 빨간불 (fw의 도움 에이스 자리 ${(seat.fw * 100).toFixed(1)}% → **${(seatM.fw * 100).toFixed(1)}%**`
      + ` · 도움 축 ${(D.a.fw * 100).toFixed(1)}% → ${(DM.a.fw * 100).toFixed(1)}%)`);
  }
}

/* ---------- 마무리 ---------- */
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (gaps.length) {
  const bar = "━".repeat(72);
  console.log(`\n${bar}`);
  console.log(`🚧 알려진 미달 ${gaps.length}건 — 검사는 초록불이지만 설계 목표에는 못 닿았어요`);
  console.log(`   (designer가 2차로 미룬 항목이라 종료 코드에서 뺐습니다. 파일 상단 주석 참고)`);
  console.log(bar);
  for (const g of gaps) console.log(`   🚧 ${g.msg}\n      └─ ${g.why}`);
  console.log(bar);
}
if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
console.log(gaps.length
  ? `\n✅ 회귀 검사 통과 · 🚧 알려진 미달 ${gaps.length}건 (위 목록) — 종료 코드 0`
  : "\n✅ 통과");
process.exit(0);
