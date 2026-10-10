/* ⚽ 더 윙어 II 1막 v3 — ⚓ **숫자 닻** (43번 §4 #9 · 44번 §1 — 「구현이 balancer 장치와 같은 값을 내는가」)
 *
 * 43번의 닻은 balancer 장치가 보통 판 × 4 포지션에서 잰 값이에요. 진짜 구현을 같은 조건으로 굴려 **통계 잡음 안에서** 대조합니다
 * (닻은 절대값 계약의 유일한 예외 — 39번 §2).
 *   조건: 진짜 1막 한 판(입구 → 졸업) · `_act.js` 기본 정책 · 쉼 문턱 `restTh`만 바꿈(43번 표의 「문턱 20 · 50 · 70 · 80 · 90」 —
 *         대충 · 보통 · 잘함 · 80 · 90) · 판은 보통 조작자 스텁(v3: 판 셋이 모두 감이라 고른 칸은 값에 0)
 *   닻(43번 §4 #9): A-1 경기당 판 2.45~2.47(보통 · 포지션마다) · A-2 판 구성 🧱 40.0 · 38.8 · 48.4 · 65.4%(37번 그대로 · 엔진 불변) ·
 *        A-3 경기 날 컨디션 중앙값 34 · 52 · 78 · 89 · 90(문턱 20 · 50 · 70 · 80 · 90 · 허용 ±2 — 정수 값의 중앙값) ·
 *        A-4 🫀 관리 칸 평균 대충 1.91 · 보통 7.23 · 잘함 10.0(허용 max(3.5 SE, 0.1))
 *   (n_pos 41.27 · 37.68 · 35.70 · 38.58 · T 66.4 · 59.4 · 52.8은 sheet-test P-5 · rev3-test R3-2가 박은 값으로 봄)
 *   🪦 v2 닻 「판정 s̄ 0.49~0.51」 · 「솜씨 칸 평균 5.66 · 5.71 · 5.38 · 5.02」는 44번 §1 퇴역(판 값이 늘 0.5 · 솜씨 칸 없음)
 *   🔄 v4(47번 · J13): 43번 닻은 「넘긴다(효과 0)」 기준 판에서 잰 값 — v4의 기준 판(늘 🌿 확정)은 🫀 +3이 쉼 · 훈련을 바꿔(46번 §3 ② — 관리 칸 −0.27)
 *        닻이 옮겨 가요. 그래서 이 닻은 **몫을 안 받는 검사용 손**(zero-test와 같은 손 — 그 손이 v3 판과 300판 비트 같음)으로 잽니다.
 *        v4 자체의 닻(T · 🧮 최선 종류 · 이벤트 장 수)은 choices-test CH-9 · sheet-test P-5
 *   🔎 시범 측정(문턱마다 32판): 중앙값 34 · 52 · 77 · 89 · 90 · 관리 칸 1.91 · 7.25 · 10 · 10 · 10 · 판 2.46~2.53
 *   + 변이: `CARE_LO` 20 → 25 → A-4가 빨간불(보통)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 12분
 */
"use strict";
const { pageMutsOK } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const POS = ["fw", "wg", "mf", "df"];
/* 🔒 43번 §4 #9 · 37번 §4 #14 — 박은 값 */
const BPM = [2.45, 2.47];
const BLK = { fw: 0.400, wg: 0.388, mf: 0.484, df: 0.654 };
const MED = { 20: 34, 50: 52, 70: 78, 80: 89, 90: 90 };
const CARE = { 20: 1.91, 50: 7.23, 70: 10.0 };
const Z = 3.5, MED_TOL = 2;
const MUT = { LO25: { "sheet.js": [[/CARE_LO: 20, CARE_SPAN: 50,/, "CARE_LO: 25, CARE_SPAN: 50,"]] } };
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
/* 0️⃣ 몫을 안 받는 손(zero-test와 같음) — 기본 정책대로 고르되 🌿 · 💬는 답하기 직전에 옛 「넘긴다」로 */
const ZERO_CARD = (c) => {
  if (!c.opts || !c.opts.length) return 0;
  const f = c.opts.findIndex((x) => x.k === "flag"); if (f >= 0) return f;
  const t = c.opts.findIndex((x) => x.k === "try"); if (t >= 0 && c.opts[t].pct >= 50) return t;
  const p = c.opts.findIndex((x) => x.k === "promise"); if (p >= 0) return p;
  const z = ["cert", "talk", "safe", "ok"].map((k) => c.opts.findIndex((x) => x.k === k)).find((i) => i >= 0);
  return z != null ? z : 0;
};
function zeroHand(env) {
  const EV = env.w.W2Events, raw = EV.answer;
  EV.answer = (S, i) => {
    const o = S.ev && S.ev.opts && S.ev.opts[i];
    if (o && (o.k === "cert" || o.k === "talk")) { S.ev.opts = S.ev.opts.slice(); S.ev.opts[i] = { k: "safe", label: o.label }; }
    return raw(S, i);
  };
}
async function measure(pos, N, th, muts) {
  const per = [], conds = [];
  for (let i = 0; i < N; i++) {
    const env = boot({ seed: 91001 + i * 7 + pos.charCodeAt(0) + th * 1000, pos, gender: i % 2 ? "f" : "m", operator: "normal", realScene: false, muts, policy: { restTh: th, card: ZERO_CARD } });
    zeroHand(env);
    const r = await runAct(env);
    const off = env.seen.live.filter((m) => m.week !== 35);          // 공식 경기(리그 · 대회) — 연습경기 뺌
    let boards = 0, blk = 0;
    for (const m of off) { conds.push(m.cfg.condition); for (const b of m.info.boards) { boards += 1; if (b.kind === "defend") blk += 1; } }
    per.push({ bpm: boards / off.length, blk: blk / boards, care: r.S.sheet.cols.find((c) => c.k === "care").v });
    env.w.close();
  }
  const st = (k) => { const m = per.reduce((a, x) => a + x[k], 0) / N; const sd = Math.sqrt(per.reduce((a, x) => a + (x[k] - m) ** 2, 0) / (N - 1)); return { m, se: sd / Math.sqrt(N) }; };
  return Object.assign(Object.fromEntries(["bpm", "blk", "care"].map((k) => [k, st(k)])), { conds });
}
const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const inBand = (x, lo, hi) => x.m >= lo - Z * x.se && x.m <= hi + Z * x.se;
const careOk = (x, want) => Math.abs(x.m - want) <= Math.max(Z * x.se, 0.1);
/* 포지션 넷을 한 판 묶음으로 — 평균은 포지션 평균의 평균 · SE는 합쳐서 */
const merge = (rs) => ({
  m: rs.reduce((a, r) => a + r.care.m, 0) / rs.length,
  se: Math.sqrt(rs.reduce((a, r) => a + r.care.se ** 2, 0)) / rs.length,
  conds: rs.flatMap((r) => r.conds),
});

(async () => {
  const N = 40, N2 = 8;
  const R = {};
  for (const pos of POS) R[pos] = await measure(pos, N, 50);
  const d2 = (v) => v.toFixed(2), pct = (v) => (v * 100).toFixed(1);
  console.log(`   🔎 진짜 1막 · 기본 정책 · 보통 조작자 · 보통(쉼 문턱 50) 포지션마다 ${N}판 · 그 밖 문턱 넷은 포지션마다 ${N2}판(공식 경기만)`);
  check(POS.every((p) => inBand(R[p].bpm, BPM[0], BPM[1])), `A-1. ⚓ 경기당 판 — ${POS.map((p) => `${p} ${d2(R[p].bpm.m)}±${d2(Z * R[p].bpm.se)}`).join(" · ")}(닻 ${BPM.join("~")})`);
  check(POS.every((p) => inBand(R[p].blk, BLK[p], BLK[p])), `A-2. ⚓ 판 구성 🧱 몫(%) — ${POS.map((p) => `${p} ${pct(R[p].blk.m)}±${pct(Z * R[p].blk.se)}(닻 ${pct(BLK[p])})`).join(" · ")}`);
  const byTh = { 50: merge(POS.map((p) => R[p])) };
  for (const th of [20, 70, 80, 90]) { const rs = []; for (const pos of POS) rs.push(await measure(pos, N2, th)); byTh[th] = merge(rs); }
  const meds = Object.fromEntries(Object.keys(MED).map((th) => [th, median(byTh[th].conds)]));
  check(Object.keys(MED).every((th) => Math.abs(meds[th] - MED[th]) <= MED_TOL), `A-3. ⚓ 경기 날 컨디션 중앙값(쉼 문턱 20 · 50 · 70 · 80 · 90) — ${Object.keys(MED).map((th) => `${th}: ${meds[th]}(닻 ${MED[th]})`).join(" · ")} · 허용 ±${MED_TOL}`);
  check(Object.keys(CARE).every((th) => careOk(byTh[th], CARE[th])), `A-4. ⚓ 🫀 관리 칸 평균 — ${Object.keys(CARE).map((th) => `${{ 20: "대충", 50: "보통", 70: "잘함" }[th]} ${d2(byTh[th].m)}±${d2(Math.max(Z * byTh[th].se, 0.1))}(닻 ${CARE[th]})`).join(" · ")}`);
  if (fail === 0) {
    const rs = []; for (const pos of POS) rs.push(await measure(pos, N2, 50, MUT.LO25));
    const m = merge(rs);
    check(!careOk(m, CARE[50]), `변이-LO25(관리 칸 바닥 20 → 25) → A-4가 빨간불 (보통 ${d2(m.m)} · 닻 7.23)`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
