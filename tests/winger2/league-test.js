/* ⚽ 더 윙어 II 1막 — 🏟️ **나와 경쟁자가 같은 자로 잰다** (리그 대칭 · 한 장면에 굴림 하나)
 *
 * 근거: 11번 §6-A(옮길 검사 — `league-test` 30 · 31 · 31b) · §7-1 #3 · #4 · 원본 `13_designer_v2-final.md` §2-8b (7) · §2-10
 * 🔄 **2026-10-02 · inspector — 1막으로 옮겼습니다.** 옛 파일(855줄)에서 **엔진의 계약만** 남겼어요:
 *   30   🎲 한 장면에 굴림은 하나 — `chance(pf * pc)`로 되돌리면 빨간불(그대로)
 *   31   🏟️ 내 경기(`createMatch`)와 남의 경기(`autoMatch`)가 같은 산식으로 **득점**(±15% · 그대로)
 *   31b  🚧 실점 · 무실점 비대칭 — **알려진 설계 한계**(상한만 · **1막 눈금으로 다시 잼**)
 *   44   🎮 「코드 + 플레이어」 — 명단에 내가 있으면 조작 실력이 실점을 움직인다(관계 셋 · 1막 눈금)
 *   🪦 버린 것: 32(🎖️ 칭호 버프 — 1막엔 칭호가 없고 `buff` 칸은 `ACT1_SPOT` 통로 → `chain-test`가 봄) ·
 *      33 · 33-D(G-7 부문상 판정 — 옛 `career.js`) — 크레딧 규칙(전개 주인공 = 도움)은 `credit-test.js`로 옮겼어요
 *
 * 🌍 **1막 눈금** — 전력 **58 : 58**(우리 학교 · 권역 평균 58.33 — 12번 §8-3) · 동료 58 ± 흔들림 · 컨디션 **51**(중립).
 *    🔴 옛 눈금(70 : 70)과 **수치가 다릅니다** — `sc(능력치)`가 70 아래에서 1보다 작아 내 클럽의 실점 확률
 *       (`1 − (1 − CON·defW)·sc`)이 커지고, 남의 경기의 득점 확률(`FIN·atkW·sc`)은 작아져요. 그래서 31b의 비대칭이
 *       옛 −14.6%에서 1막 눈금 **−27.1%**로 커졌습니다(같은 뿌리 — 아래 31b).
 *
 * ─────────────────────────────────────────────────────────────────
 * 🚧 종료 코드 두 갈래 (`tests/soccer/curve-test.js`와 같은 방식)
 *   reg(...)   회귀 — 깨지면 종료 코드 1
 *   goal(...)  목표 — 아직 못 닿은 항목은 UNMET에 적고 🚧(종료 0) · **목표를 달성하면 ❌ 「승격하세요」**
 * ⚠️ **현재 실측값을 기대값으로 박지 않았습니다.** CAP은 「여기까지는 알려진 상태」이지 목표가 아니에요.
 * 🎲 시드 넷의 평균으로 판정합니다(단일 시드는 잡음). ⏱️ 약 10초.
 */
"use strict";
const { load, mutsOK, xiOf, xiAll, COND_NEUTRAL } = require("./_load.js");

let fail = 0;
const gaps = [];
const reg = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const UNMET = {
  "concede-sym": "실점 비대칭 — 내 경기(`createMatch`)는 칸마다 우리 쪽 한 명의 `pConcede`(CON·defW = 0.5555에 수비 능력치가 실림), "
    + "남의 경기(`autoMatch`)는 공격 쪽 `pFinish`(FIN·atkW = 0.4420) 하나 — **경쟁자 수비수의 개인 능력치가 안 실려요**(§2-8b (7) · 2차의 「칸마다 관점 굴리기」로 미룸). "
    + "1막 눈금(능력치 58 — sc < 1)에서 더 커집니다",
  "cs-sym": "무실점 비대칭 — 위와 같은 뿌리. 내 클럽이 더 먹혀서 무실점이 적습니다",
};
const goal = (key, ok, msg) => {
  const known = Object.prototype.hasOwnProperty.call(UNMET, key);
  if (ok && !known) { console.log(`✅ ${msg}`); return; }
  if (ok && known) { console.log(`❌ ${msg} — 🎉 목표를 달성했어요! UNMET["${key}"]를 지우고 **31로 승격**하세요`); fail += 1; return; }
  if (!ok && !known) { console.log(`❌ ${msg}`); fail += 1; return; }
  console.log(`🚧 ${msg}`);
  gaps.push({ key, msg, why: UNMET[key] });
};

/* 🔒 1막 눈금 — **검사에 박은 값**(소스에서 안 읽음) */
const STR = 58;            // 12번 §8-3 — 우리 학교 58 · 권역 평균 58.33
const N = 20000;
const SEEDS = [11, 202, 5150, 31337];
const SKILL = 0.5;         // 🤖 자동 진행과 같은 값
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const spread = (a) => `[${a.map((v) => v.toFixed(2)).join(" ")}]`;
const rel = (mineV, otherV) => 100 * (otherV - mineV) / mineV;   // (다른 − 내) ÷ 내

const MUT_TABLE = {
  "30-한장면두굴림": [[/if \(chance\(pf\)\) \{/,
    "if (chance(pf * (guard ? pConcede(1 - aw, abilityOf(guard)) : 1))) {"]],
};
{
  const bad = mutsOK(MUT_TABLE);
  reg(bad.length === 0, `0. 변이 정규식 ${Object.values(MUT_TABLE).reduce((a, m) => a + m.length, 0)}개가 지금 beta/winger2/engine.js에 전부 걸린다`
    + (bad.length ? `\n     🔴 **안 걸린 것 — 그 변이 검사는 "안 도는" 상태입니다**` + bad.map((b) => `\n       · ${b}`).join("") : ""));
}

/* 내 클럽 — 카드 갈래(`createMatch`). ⚠️ 명단에 **me 없음**(`xiAll`) — 조작 실력과 무관한 「순수 산식 대칭」 */
function myClub(E, SEED) {
  E._t.seed(SEED); E._t.skill = SKILL;
  let gf = 0, ga = 0, cs = 0;
  for (let i = 0; i < N; i++) {
    const r = E._t.playMatch({ xi: xiAll(STR, i), oppName: "상대", teamStr: STR, oppStr: STR, condition: COND_NEUTRAL });
    gf += r.teamGoals; ga += r.oppGoals; if (!r.oppGoals) cs += 1;
  }
  return { gf: gf / N, ga: ga / N, cs: cs / N };
}
/* 다른 클럽 — `autoMatch`(1막 `world.js`의 남의 리그 경기 · 대회 경기가 이 길). 두 클럽이 서로 먹고 먹히니 득점 = 실점 */
function otherClubs(E, SEED) {
  E._t.seed(SEED);
  let goals = 0, clubs = 0, cs = 0;
  for (let i = 0; i < N; i++) {
    const r = E._t.autoMatch({ xiA: xiAll(STR, i), xiB: xiAll(STR, i + 1e6), strA: STR, strB: STR });
    goals += r.gf + r.ga; clubs += 2;
    if (!r.ga) cs += 1;
    if (!r.gf) cs += 1;
  }
  return { gf: goals / clubs, ga: goals / clubs, cs: cs / clubs };
}

/* ══════════════════════════════════════════════════════════════
 * 31 · 31b
 * ══════════════════════════════════════════════════════════════ */
const SYM_BAND = 15;       // % — designer가 정한 범위. 값이 아니라 **두 갈래의 차이**에 겁니다
const PROMOTE_MARGIN = 3;  // %p — 승격은 밴드 안쪽 12%에서만(히스테리시스 · 옛 파일 그대로)
/* 🚧 31b 상한 — **1막 눈금으로 다시 잼**(2026-10-02 · N=20,000 × 시드 4):
 *    실점 −27.37 / −27.19 / −27.19 / −26.78 → 평균 −27.13 (시드 간 SD ≈ 0.25)
 *    무실점 +57.96 / +58.92 / +61.05 / +58.49 → 평균 +59.11 (SD ≈ 1.4)
 *    상한은 그 위에 여유 — 실점 **32%**(≈ 19σ) · 무실점 **70%**(≈ 8σ). 더 나빠지면 잡히고, 좋아지면 「승격하세요」. */
const CONCEDE_CAP = 32;
const CS_CAP = 70;
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
  console.log(`   다른클럽 득점 ${per[0].B.gf.toFixed(3)} · 실점 ${per[0].B.ga.toFixed(3)} · 무실점 ${(per[0].B.cs * 100).toFixed(1)}%\n`);
  const COND = `측정 조건: 1막 눈금 — 전력 ${STR}:${STR} · 동료 ${STR}±흔들림 · 컨디션 ${COND_NEUTRAL} · _t.skill = ${SKILL} · 명단에 me 없음(순수 산식) · N=${N} · 시드 ${SEEDS.join("/")}`;
  reg(Math.abs(dG) <= SYM_BAND,
    `31. 🏟️ 내 경기와 남의 경기가 같은 산식으로 **득점**한다 — 시드 평균 ${dG >= 0 ? "+" : ""}${dG.toFixed(2)}% (±${SYM_BAND}%)`
    + `\n     ${COND}\n     시드별 ${spread(per.map((x) => x.g))}`);
  goal("concede-sym", Math.abs(dC) <= SYM_BAND - PROMOTE_MARGIN,
    `31b. 🚧 **실점**은 아직 같은 산식이 아니다 — 차 ${dC >= 0 ? "+" : ""}${dC.toFixed(1)}% (밴드 ±${SYM_BAND}% · 승격 ±${SYM_BAND - PROMOTE_MARGIN}%)`);
  reg(Math.abs(dC) <= CONCEDE_CAP,
    `31b-상한. 실점 비대칭이 더 나빠지지 않았다 — 시드 평균 |${dC.toFixed(2)}%| ≤ ${CONCEDE_CAP}% (상한이지 목표가 아니에요)\n     시드별 ${spread(per.map((x) => x.c))}`);
  goal("cs-sym", Math.abs(dS) <= SYM_BAND - PROMOTE_MARGIN,
    `31b. 🚧 **무실점**도 아직 같은 산식이 아니다 — 차 ${dS >= 0 ? "+" : ""}${dS.toFixed(1)}% (밴드 ±${SYM_BAND}% · 승격 ±${SYM_BAND - PROMOTE_MARGIN}%)`);
  reg(Math.abs(dS) <= CS_CAP,
    `31b-상한. 무실점 비대칭이 더 나빠지지 않았다 — 시드 평균 |${dS.toFixed(2)}%| ≤ ${CS_CAP}%\n     시드별 ${spread(per.map((x) => x.s))}`);
  /* 방향까지 — 크기만 보면 **뒤집혀도** 통과해요. 미달로 남아 있는 동안에만 봅니다(그 뒤엔 부호가 잡음) */
  if (Math.abs(dC) > SYM_BAND || Math.abs(dS) > SYM_BAND) {
    reg(dC < 0 && dS > 0, `31b-방향. 비대칭의 방향이 그대로다 — 내 클럽이 더 먹히고(실점 ${dC.toFixed(1)}%) 무실점이 적다(${dS.toFixed(1)}%)`);
  }
}

/* ══════════════════════════════════════════════════════════════
 * 30. 🎲 한 장면에 굴림은 하나 — `chance(pf * pc)`로 되돌리면 빨간불
 *   (변이는 `dw`를 되살리지 않고 `1 - aw`로 씁니다 — `atkW + defW = 1`이라 같은 값이에요)
 * ══════════════════════════════════════════════════════════════ */
{
  const M = load(MUT_TABLE["30-한장면두굴림"]);
  const B = otherClubs(M, SEEDS[0]);
  const dG = rel(base.A.gf, B.gf), dS = rel(base.A.cs, B.cs);
  reg(Math.abs(dG) > SYM_BAND,
    `30-변이. 🎲 chance(pf × pc)로 되돌리면 → 31이 빨간불 (다른 클럽 득점 ${base.B.gf.toFixed(3)} → **${B.gf.toFixed(3)}** · 차 ${dG.toFixed(1)}%)`);
  reg(Math.abs(dS) > CS_CAP, `30-변이. 무실점 상한도 함께 잡는다 (차 ${dS.toFixed(1)}% > ${CS_CAP}%)`);
}

/* ══════════════════════════════════════════════════════════════
 * 44. 🎮 「코드 + 플레이어」 — 명단에 내가 있으면(🧱 수비수) **조작 실력이 실점을 움직인다**
 *   1막에서 🧱 수비 판이 생겨(12번 §4 · 결정 A) 이 자리가 **실제로 손이 닿는 자리**가 됐어요.
 *   🚨 절대값을 안 박습니다 — 관계 셋: ① 잘할수록 덜 먹힌다(단조) ② 그 폭이 실제로 있다 ③ 창 전체에서 상한 안
 *   창 `E[s] ∈ [0.44, 0.58]`은 옛 balancer 실측(실플레이 폭) 그대로 — **창 밖은 balancer 몫**이에요.
 *   🎲 같은 시드(CRN)로 실력만 바꿉니다 — 판정 굴림 수가 실력과 무관해 차이가 잡음에 안 묻혀요.
 * ══════════════════════════════════════════════════════════════ */
const SKILLS = [0.44, 0.50, 0.58];
const PLAY_SPAN_MIN = 0.02;   // 경기당 실점 — 0.44 ↔ 0.58 차이의 바닥(실측 0.059 · 1막 눈금 df56)
const PLAY_CAP = 35;          // % — 창 안 실점 비대칭 상한(실측 −29.5 ~ −26.6%)
{
  const E = load();
  const ga = SKILLS.map((sk) => {
    E._t.seed(SEEDS[0]); E._t.skill = sk;
    let s = 0;
    for (let i = 0; i < N; i++) s += E._t.playMatch({ xi: xiOf("df", 56, STR, i), oppName: "상대", teamStr: STR, oppStr: STR, condition: COND_NEUTRAL }).oppGoals;
    return s / N;
  });
  const other = otherClubs(E, SEEDS[0]).ga;
  const asym = ga.map((g) => rel(g, other));
  reg(ga[0] > ga[1] && ga[1] > ga[2],
    `44-①. 🎮 잘할수록 덜 먹힌다 — 경기당 실점 ${SKILLS.map((sk, i) => `s ${sk}: ${ga[i].toFixed(3)}`).join(" > ")}`
    + `\n     측정 조건: 명단에 me(🧱 수비수 · 능력치 56 ≈ 1막 보통 판 여섯 평균) · 1막 눈금 · 같은 시드 ${SEEDS[0]}(CRN) · N=${N}`);
  reg(ga[0] - ga[2] >= PLAY_SPAN_MIN, `44-②. 🎮 그 폭이 실제로 있다 — 0.44 ↔ 0.58 차 ${(ga[0] - ga[2]).toFixed(3)} ≥ ${PLAY_SPAN_MIN} (검사가 실력을 탄다)`);
  reg(asym.every((a) => Math.abs(a) <= PLAY_CAP), `44-③. 창 전체에서 실점 비대칭이 상한 안 — ${asym.map((a) => a.toFixed(1) + "%").join(" · ")} (≤${PLAY_CAP}%)`);
}

if (gaps.length) {
  console.log(`\n🚧 알려진 미달 ${gaps.length}건 (종료 코드에 안 셉니다 — 달성하면 ❌로 「승격하세요」가 떠요)`);
  for (const g of gaps) console.log(`   · ${g.key}: ${g.why}`);
}
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
