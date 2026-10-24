/* ⚽ 더 윙어 II 1막 v5 — 📋 **평가서 자리별 표(`byAt`)가 화면에 나오는가** (52번 §2 · J19 · 50번 §12-1 · 31번 「byAt」 고침)
 *
 * 배포 베타 점검에서 「자리별 표가 안 나옴」이 나왔어요 — 화면이 옛 자리(평가서 맨 위 `x.detail`)만 읽고, 데이터는 ⚽ 기록 칸의
 * `detail.byAt`에 있었습니다. v5 검사 45개는 `byAt`를 **데이터로만**(rev3 R3-2) 봐서 못 잡았어요. 그 자리를 메웁니다.
 *   BA-1  진짜 1막 판(스텁 장면)에서 **이웃 자리로 뛴 경기가 있는 판**의 진짜 평가서(`W2Sheet.compute`)를 진짜 `W2Scenes.sheet`로 그리면
 *         `.w2o-byat` 표의 행 수 = 기록 칸 `detail.byAt` 길이 · 행마다 경기 · 골 · 도움 · 수비 · 가중(g·a·d) · 경기당(소수 둘) = 그 줄 값 ·
 *         요약 줄의 「○○ N경기」 합 = 공식 경기 수
 *   BA-2  한 자리로만 뛴 판도 표가 섬(행 1)
 *   + 변이: 화면이 옛 자리(`x.detail`)만 읽음 → BA-1이 빨간불
 *   (320 폭에서 칸이 낱자로 끊기지 않는가는 layout-test LY-2)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 2분
 */
"use strict";
const { bootPage, pageMutsOK, wait } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const MUT = { OLDSPOT: { "scenes.js": [[/const recDet = \(recCol && recCol\.detail\) \|\| x\.detail \|\| null;/, "const recDet = x.detail || null;"]] } };
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
/* 판 모으기 — rev3에서 자리가 섞였던 판(미드 · 수비수)과 한 자리 판 */
async function sheets() {
  const out = [];
  for (const [seed, pos] of [[4103, "mf"], [4104, "df"], [4105, "df"], [4102, "wg"]]) {
    const env = boot({ seed, pos, operator: "normal", realScene: false });
    const r = await runAct(env);
    const S = r.S;
    const rec = S.sheet.cols.find((c) => c.k === "record");
    out.push({ seed, pos, sheet: JSON.parse(JSON.stringify(S.sheet)), byAt: (rec.detail && rec.detail.byAt) || [], games: S.games.filter((g) => g.t !== "T").length });
    env.w.close();
  }
  return out;
}
async function draw(muts, sheet) {
  const W = bootPage({ fastTimers: true, muts });
  for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
  const layer = W.document.getElementById("w2-layer");
  const p = W.W2Scenes.sheet(Object.assign({ title: "📋 스카우트 평가서" }, sheet));
  await wait(5);
  const det = layer.querySelector(".w2o-byat");
  const rows = det ? [...det.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map((c) => c.textContent)) : null;
  const summary = det ? (det.querySelector("summary") || {}).textContent || "" : "";
  const ok = layer.querySelector(".w2o-ok"); if (ok) ok.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
  await Promise.race([p, wait(300)]);
  W.close();
  return { rows, summary };
}
const same = (row, b) => {
  const w = b.w || {};
  const want = [String(b.n), String(b.g), String(b.a), String(b.d), [w.g, w.a, w.d].join("·"), Number(b.avg).toFixed(2)];
  return JSON.stringify(row.slice(1)) === JSON.stringify(want);
};
async function ba(muts, list) {
  const bad = [];
  let mixed = 0, single = 0;
  for (const x of list) {
    const d = await draw(muts, x.sheet);
    if (x.byAt.length > 1) mixed += 1; else if (x.byAt.length === 1) single += 1;
    if (!d.rows) { bad.push(`${x.seed}/${x.pos}: 표 없음(byAt ${x.byAt.length}줄)`); continue; }
    if (d.rows.length !== x.byAt.length) bad.push(`${x.seed}: 행 ${d.rows.length} ≠ byAt ${x.byAt.length}`);
    x.byAt.forEach((b, i) => { if (!d.rows[i] || !same(d.rows[i], b)) bad.push(`${x.seed} ${b.at}: ${JSON.stringify(d.rows[i])}`); });
    const nSum = [...d.summary.matchAll(/(\d+)경기/g)].reduce((a, m) => a + Number(m[1]), 0);
    if (nSum !== x.games) bad.push(`${x.seed}: 요약 경기 합 ${nSum} ≠ 공식 경기 ${x.games}`);
  }
  return { bad, mixed, single };
}
(async () => {
  const list = await sheets();
  const r = await ba(null, list);
  check(r.bad.length === 0 && r.mixed >= 1, `BA-1. 📋 자리가 섞인 판 ${r.mixed}개 · 한 자리 판 ${r.single}개 — 진짜 \`W2Scenes.sheet\`의 \`.w2o-byat\` 행 = 기록 칸 \`detail.byAt\`(행 수 · 경기 · 골 · 도움 · 수비 · 가중 · 경기당) · 요약 경기 합 = 공식 경기 수`
    + (r.bad.length ? `\n     🔴 ${r.bad.slice(0, 3).join(" · ")}` : ""));
  check(r.single >= 1 && r.bad.length === 0, `BA-2. 📋 한 자리로만 뛴 판도 표가 섬(행 1)`);
  if (fail === 0) {
    const m = await ba(MUT.OLDSPOT, list.filter((x) => x.byAt.length > 1).slice(0, 1));
    check(m.bad.length > 0, `변이-OLDSPOT(화면이 옛 자리 \`x.detail\`만 읽음 — 배포 베타 결함 모양) → BA-1이 빨간불 (${m.bad[0] || ""})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
