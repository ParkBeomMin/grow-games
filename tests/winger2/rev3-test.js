/* ⚽ 더 윙어 II 1막 v2 — 🔁 **29번 회귀 · 숫자** (39번 §2 「29번 회귀」 · 「숫자」 · 38번 §5 · 29번 §2 · 34번 · 28번 R10)
 *
 *   R3-1  📍 「같은 장면, {rival}라면」 집계 — 경기마다 `tally`가 받은 판에서: n = q가 있는 판 수 · 해냄 = `perfect` 판 수 ·
 *         「{rival}라면」 = round(Σq, 한 자리) · d = 해냄 − 그 값 · 집계 D가 경기 d의 합(보이는 값 = 판정 값) · 결말이 D와 `SLOT_LINE` 1.5로 갈림
 *   R3-2  ⚽ 기록 칸 = min(40, n_pos × (g·g축 + a·a축 + d·d축) ÷ 경기) — **n_pos 41.27 · 37.68 · 35.70 · 38.58**(v3 44번 §1) · **수비수 가중 0.55 × 3**(29번 §2-3)
 *         · 공격수 1.0 · 0.5 · 0.15 / 윙어 0.8 · 0.8 · 0.15 / 미드 0.5 · 1.0 · 0.30(22번 · 그대로) — 네 포지션 판의 평가서에서
 *   R3-3  🎯 테스트 칸 0~4 = 기술(맞힌 판 ÷ 6 × 1.6) + 연습경기 clamp((평점 − 1) × 2.4 ÷ 9, 0, 2.4) · 칸 최대 4
 *   R3-4  🏅 업적 희귀도 = 28번 R10 표 → 34번(`number` 드묾 · `allc` 귀함) → 38번 §5(`g7` 귀함) → 44번 §1(`promise3` · `league` 전설 · `gift` 귀함) — 33칸 전부
 *   보이는 칸은 최대 나머지 반올림(한 자리 · 칸 합 = 보이는 총점)이라 다시 셈과 **0.1 미만** 차이를 허용
 *   (T · READ_K · 몸 꼭대기는 sheet-test P-1 · P-3 · P-4가 봄 · 졸업 줄 · act1 새 칸은 save-test SV-3 · SV-4)
 *   + 변이: 해냄을 ok까지 셈 · 수비수 가중 옛 값(2.0 · 1.0 · 0.55) · n_pos 옛 값(34번) · 연습경기 몫 2.0 · `g7` 드묾
 * 🔒 숫자는 38번 §5 · 28번 R10 · 34번 — 박은 값
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 몇 분
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { pageMutsOK, PAGE_DIR } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const NPOS = { fw: 41.27, wg: 37.68, mf: 35.70, df: 38.58 };   // 🔄 v3 44번 §1(38번 39.83 · 36.36 · 34.46 · 37.24에서)
const AX = { fw: [1.0, 0.5, 0.15], wg: [0.8, 0.8, 0.15], mf: [0.5, 1.0, 0.30], df: [0.55, 0.55, 0.55] };
const TIER = {
  /* 🔄 v3 44번 §1 — promise3 · league → 전설 · gift → 귀함 */
  흔함: "grad story1 family g1 mom10 winner next", 드묾: "s1 onething rested a7 door race number",
  귀함: "r9 cs5 wall3 qf longshot crown pk allc g7 gift", 전설: "hat cup trio all7 six promise3 league",
};
const MUT = {
  MADE_OK: { "story.js": [[/const made = bs\.filter\(\(x\) => x\.judge === "perfect"\)\.length;/, 'const made = bs.filter((x) => x.judge !== "miss").length;']] },
  DF_OLD: { "sheet.js": [[/df: \{ g: 0\.55, a: 0\.55, d: 0\.55 \}/, "df: { g: 2.0, a: 1.0, d: 0.55 }"]] },
  NPOS_OLD: { "sheet.js": [[/N_POS: \{ fw: 41\.27, wg: 37\.68, mf: 35\.70, df: 38\.58 \}/, "N_POS: { fw: 39.83, wg: 36.36, mf: 34.46, df: 37.24 }"]] },
  TESTM: { "sheet.js": [[/TEST_TECH: 1\.6, TEST_MATCH: 2\.4,/, "TEST_TECH: 1.6, TEST_MATCH: 2.0,"]] },
  G7: { "achieve.js": [[/allc: "귀함", g7: "귀함", gift: "귀함",/, 'allc: "귀함", g7: "귀함", gift: "드묾",']] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const col = (S, k) => S.sheet.cols.find((c) => c.k === k);
async function run(seed, pos, muts) {
  const env = boot({ seed, pos, operator: "normal", realScene: false, muts });
  const calls = [];
  const ST = env.w.W2Story;
  if (ST && ST.tally) {
    const raw = ST.tally;
    ST.tally = (S, boards) => { const r = raw(S, boards); if (r) calls.push({ r: Object.assign({}, r), boards: JSON.parse(JSON.stringify(boards || [])) }); return r; };
  }
  const r = await runAct(env);
  const tierTbl = env.w.W2Ach && env.w.W2Ach.TUNE ? env.w.W2Ach.TUNE.TIER : null;
  env.w.close();
  return { S: r.S, calls, tierTbl };
}
function r31(runs) {
  const bad = [];
  let n = 0;
  for (const { S, calls } of runs) {
    let D = 0;
    for (const { r, boards } of calls) {
      const bs = boards.filter((x) => typeof x.q === "number");
      const made = bs.filter((x) => x.judge === "perfect").length;
      const e10 = Math.round(bs.reduce((a, x) => a + x.q, 0) * 10);
      const d10 = made * 10 - e10;
      D = (Math.round(D * 10) + d10) / 10;
      n += 1;
      if (r.n !== bs.length || r.made !== made || Math.round(r.exp * 10) !== e10 || Math.round(r.d * 10) !== d10 || Math.round(r.D * 10) !== Math.round(D * 10)) {
        bad.push(`${S.seed}: n ${r.n}/${bs.length} · 해냄 ${r.made}/${made} · 기대 ${r.exp}/${e10 / 10} · d ${r.d}/${d10 / 10} · D ${r.D}/${D}`);
        break;
      }
    }
    const slot = (S.story.done || []).find((d) => d.sid === "slot");
    if (slot && calls.length) {
      const want = Math.round(D * 10) >= 15 ? "took" : Math.round(D * 10) <= -15 ? "gave" : "pair";
      if (slot.end !== want) bad.push(`${S.seed}: 결말 ${slot.end} ≠ ${want}(D ${D})`);
    }
  }
  return { bad, n };
}
function r32(S) {
  const R = S.record, ax = AX[S.pos];
  const want = R.apps ? Math.min(40, NPOS[S.pos] * (R.g * ax[0] + R.a * ax[1] + R.d * ax[2]) / R.apps) : 0;
  return { got: col(S, "record").v, want };
}
function r33(S) {
  const t = S.test || {};
  const want = t.rating == null ? 0 : (Number(t.tech) || 0) * 1.6 / 6 + Math.min(2.4, Math.max(0, (t.rating - 1) * 2.4 / 9));
  return { got: col(S, "test").v, want, max: col(S, "test").max };
}

(async () => {
  const runs = [];
  for (const [seed, pos] of [[4101, "fw"], [4102, "wg"], [4103, "mf"], [4104, "df"], [4105, "df"]]) runs.push(await run(seed, pos));
  const t1 = r31(runs);
  check(t1.bad.length === 0 && t1.n >= 20, `R3-1. 📍 「같은 장면」 집계 — 판 ${runs.length}개의 경기 ${t1.n}번: n · 해냄(perfect) · round(Σq) · d · 집계 D(경기 d의 합)가 다시 셈과 같음 · 결말이 D와 ±1.5로 갈림` + (t1.bad.length ? `\n     🔴 ${t1.bad.slice(0, 3).join(" · ")}` : ""));
  {
    const rows = runs.map(({ S }) => ({ pos: S.pos, ...r32(S), R: S.record }));
    const bad = rows.filter((x) => Math.abs(x.got - x.want) >= 0.1 - 1e-9);
    const df = rows.filter((x) => x.pos === "df");
    check(bad.length === 0 && df.some((x) => x.R.g + x.R.a > 0), `R3-2. ⚽ 기록 칸 = min(40, n_pos × 가중 합 ÷ 경기) — ${rows.map((x) => `${x.pos} ${x.got} ≈ ${x.want.toFixed(2)}`).join(" · ")}(수비수 골 · 도움 ${df.map((x) => x.R.g + x.R.a).join(" · ")} — 0.55 × 3이 실제로 걸림)` + (bad.length ? " 🔴" : ""));
  }
  {
    const rows = runs.map(({ S }) => r33(S));
    const bad = rows.filter((x) => Math.abs(x.got - x.want) >= 0.1 - 1e-9 || x.max !== 4 || x.got < 0 || x.got > 4);
    check(bad.length === 0 && rows.some((x) => x.want > 0), `R3-3. 🎯 테스트 칸 0~4 = 기술 × 1.6 ÷ 6 + 연습경기(평점 − 1) × 2.4 ÷ 9 — ${rows.map((x) => `${x.got} ≈ ${x.want.toFixed(2)}`).join(" · ")} · 칸 최대 ${rows[0].max}`);
  }
  const tierOk = (tbl) => {
    if (!tbl) return ["표 없음"];
    const bad = [];
    const want = {};
    for (const [t, ks] of Object.entries(TIER)) for (const k of ks.split(" ")) want[k] = t;
    for (const k of new Set(Object.keys(want).concat(Object.keys(tbl)))) if (want[k] !== tbl[k]) bad.push(`${k} ${tbl[k]} ≠ ${want[k]}`);
    return bad;
  };
  const tb = tierOk(runs[0].tierTbl);
  check(tb.length === 0, `R3-4. 🏅 업적 희귀도 33칸 = 28번 R10 → 34번 → 38번 §5(g7 귀함) → 44번 §1(promise3 · league 전설 · gift 귀함)` + (tb.length ? `\n     🔴 ${tb.join(" · ")}` : ""));
  if (fail === 0) {
    const m1 = await run(4101, "fw", MUT.MADE_OK);
    check(r31([m1]).bad.length > 0, "변이-MADE_OK(해냄을 ok까지 셈) → R3-1이 빨간불");
    const m2 = await run(4104, "df", MUT.DF_OLD);
    const x2 = r32(m2.S);
    check(Math.abs(x2.got - x2.want) >= 0.1, `변이-DF_OLD(수비수 가중 2.0 · 1.0 · 0.55) → R3-2가 빨간불 (${x2.got} ≠ ${x2.want.toFixed(2)})`);
    const m3 = await run(4102, "wg", MUT.NPOS_OLD);
    const x3 = r32(m3.S);
    check(Math.abs(x3.got - x3.want) >= 0.1, `변이-NPOS_OLD(n_pos 38번 옛 값) → R3-2가 빨간불 (${x3.got} ≠ ${x3.want.toFixed(2)})`);
    const m4 = await run(4101, "fw", MUT.TESTM);
    const x4 = r33(m4.S);
    check(Math.abs(x4.got - x4.want) >= 0.1 || x4.max !== 4, `변이-TESTM(연습경기 몫 2.0) → R3-3이 빨간불 (${x4.got} · 최대 ${x4.max})`);
    const m5 = await run(4101, "fw", MUT.G7);
    check(tierOk(m5.tierTbl).length > 0, "변이-G7(gift를 옛 드묾으로) → R3-4가 빨간불");
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
