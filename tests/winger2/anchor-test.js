/* ⚽ 더 윙어 II 1막 v2 — ⚓ **숫자 닻** (37번 §4 #14 · 38번 §5 — 「구현이 balancer 장치와 같은 값을 내는가」)
 *
 * 37번의 닻은 balancer **장치**(`act2.js`)가 보통 판 × 4 포지션 × 칸마다 21,000판에서 잰 값이에요. 진짜 구현을 같은 조건으로 굴려
 * **통계 잡음 안에서** 대조합니다(닻은 절대값 계약의 유일한 예외 — 39번 §2).
 *   조건: 진짜 1막 한 판(입구 → 졸업) · 보통 판 정책(`_act.js` 기본 손) · **보통 조작자**(37번 §0-3 자리표 — 🧱 보임 반반 ·
 *         맞힌 몫 잘 보임 0.48 · 흐림 0.24 · 🥅 · 🅰️ 0.5) — 판(`W2Moment.play`)을 그 정책 스텁으로 갈아 끼움(드라이버는 부를 때마다 전역에서 찾음)
 *   닻(37번 §4 #14): 경기당 판 2.45~2.47 · 판 구성 🧱 40.0 · 38.8 · 48.4 · 65.4% · 판정 `s̄` 0.49~0.51 · 솜씨 칸 평균 5.66 · 5.71 · 5.38 · 5.02
 *   허용 폭: **3.5 × 표본 표준오차**(이 판들의 SD ÷ √N에서) — 닻이 범위면 범위 양 끝에서. 🤖 4.0은 sheet-test P-1b가 비트로 봄
 *   🔎 시범 측정(포지션마다 40판): 판 2.50 · 2.46 · 2.51 · 2.44(SE ≈ 0.04) · 🧱 38.3 · 37.5 · 46.7 · 66.2%(SE ≈ 1.5%p) · s̄ 0.49~0.50 ·
 *      솜씨 5.89 · 5.77 · 5.19 · 5.00(SE 0.17 · 0.22 · 0.13 · 0.08) — 모두 1.5 SE 안
 *   + 변이: 솜씨 칸 기울기 20 → 5(`SKILL_GAIN`) → 솜씨 닻이 빨간불(공격수 · 윙어)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 12분(포지션마다 60판 + 변이 30판)
 */
"use strict";
const { pageMutsOK } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const POS = ["fw", "wg", "mf", "df"];
/* 🔒 37번 §4 #14 — 박은 값 */
const ANCHOR = {
  bpm: { fw: [2.45, 2.47], wg: [2.45, 2.47], mf: [2.45, 2.47], df: [2.45, 2.47] },
  blk: { fw: [0.400, 0.400], wg: [0.388, 0.388], mf: [0.484, 0.484], df: [0.654, 0.654] },
  s: { fw: [0.49, 0.51], wg: [0.49, 0.51], mf: [0.49, 0.51], df: [0.49, 0.51] },
  skill: { fw: [5.66, 5.66], wg: [5.71, 5.71], mf: [5.38, 5.38], df: [5.02, 5.02] },
};
const Z = 3.5;
const MUT = { GAIN5: { "sheet.js": [[/SKILL_BASE: 4\.0, SKILL_GAIN: 20,/, "SKILL_BASE: 4.0, SKILL_GAIN: 5,"]] } };
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
async function measure(pos, N, muts) {
  const per = [];
  for (let i = 0; i < N; i++) {
    const env = boot({ seed: 91001 + i * 7 + pos.charCodeAt(0), pos, gender: i % 2 ? "f" : "m", operator: "normal", realScene: false, muts });
    const r = await runAct(env);
    const off = env.seen.live.filter((m) => m.week !== 35);          // 공식 경기(리그 · 대회) — 연습경기 뺌
    let boards = 0, blk = 0, sSum = 0;
    for (const m of off) for (const b of m.info.boards) { boards += 1; if (b.kind === "defend") blk += 1; sSum += b.s; }
    per.push({ bpm: boards / off.length, blk: blk / boards, s: sSum / boards, skill: r.S.sheet.cols.find((c) => c.k === "skill").v });
    env.w.close();
  }
  const st = (k) => { const m = per.reduce((a, x) => a + x[k], 0) / N; const sd = Math.sqrt(per.reduce((a, x) => a + (x[k] - m) ** 2, 0) / (N - 1)); return { m, se: sd / Math.sqrt(N) }; };
  return Object.fromEntries(["bpm", "blk", "s", "skill"].map((k) => [k, st(k)]));
}
const inBand = (x, [lo, hi]) => x.m >= lo - Z * x.se && x.m <= hi + Z * x.se;

(async () => {
  const N = 60;
  const R = {};
  for (const pos of POS) R[pos] = await measure(pos, N);
  const row = (k, f) => POS.map((p) => `${p} ${f(R[p][k].m)}±${f(Z * R[p][k].se)}(닻 ${ANCHOR[k][p][0] === ANCHOR[k][p][1] ? f(ANCHOR[k][p][0]) : `${f(ANCHOR[k][p][0])}~${f(ANCHOR[k][p][1])}`})${inBand(R[p][k], ANCHOR[k][p]) ? "" : " 🔴"}`).join(" · ");
  const pct = (v) => (v * 100).toFixed(1), d2 = (v) => v.toFixed(2), d3 = (v) => v.toFixed(3);
  console.log(`   🔎 진짜 1막 · 보통 판 · 보통 조작자 · 포지션마다 ${N}판(공식 경기만)`);
  check(POS.every((p) => inBand(R[p].bpm, ANCHOR.bpm[p])), `A-1. ⚓ 경기당 판 — ${row("bpm", d2)}`);
  check(POS.every((p) => inBand(R[p].blk, ANCHOR.blk[p])), `A-2. ⚓ 판 구성 🧱 몫(%) — ${row("blk", pct)}`);
  check(POS.every((p) => inBand(R[p].s, ANCHOR.s[p])), `A-3. ⚓ 판정 s̄ — ${row("s", d3)}`);
  check(POS.every((p) => inBand(R[p].skill, ANCHOR.skill[p])), `A-4. ⚓ 솜씨 칸 평균 — ${row("skill", d2)}`);
  if (fail === 0) {
    const m = await measure("fw", 30, MUT.GAIN5);
    check(!inBand(m.skill, ANCHOR.skill.fw), `변이-GAIN5(솜씨 칸 기울기 20 → 5) → A-4가 빨간불 (공격수 ${d2(m.skill.m)}±${d2(Z * m.skill.se)} · 닻 5.66)`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
