/* ⚽ 더 윙어 II 1막 v2 — 🎯 **기술 테스트 · 승부차기 판** (37번 §4 #13 · 36번 §8-3 · §4-4 · 38번 §5)
 *
 *   TT-1  기술 테스트 판 셋 = 공격수 · 윙어 🥅 × 3 · 미드필더 🅰️ × 2 + 🧱 · 수비수 🧱 × 3(12번 §5-4 · 박은 값)
 *   TT-2  같은 상황 굴림 · **각자의 열쇠** — 판 i의 약발 상황 == `rngOf(판 시드, KEY.tech(i), SALT.board)() < ⅓`(손 · 🤖 둘 다)
 *   TT-3  🤖 = 0.5 × 상황 — 🤖 판은 sBoard 0.5 · s = 0.5 × 🦶 × 🫀(약발 아닌 판끼리 🫀 하나 · 약발 판은 그 🫀 × min(0.95, 0.75 + 0.13 × 단계))
 *   TT-4  승부차기 내 킥은 🎮 솜씨 칸에 안 더함 — 승부차기가 있었던 판(시드 5008)의 솜씨 칸 「🧱 막기 판 N번」 == 공식 경기 🧱 판 수
 *   + 변이: 기술 판이 열쇠 하나를 같이 씀(`KEY.tech(0)`) · 승부차기 킥을 솜씨에 더함
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 몇 분
 */
"use strict";
const { pageMutsOK } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const KINDS = { fw: "goal,goal,goal", wg: "goal,goal,goal", mf: "assist,assist,defend", df: "defend,defend,defend" };
const FOOT = (step) => Math.min(0.95, 0.75 + 0.13 * step);
const MUT = {
  ONEKEY: { "game.js": [[/const got = await fresh\(board\(at, kind, center, blend, X\(\)\.KEY\.tech\(i\)\)\);/, "const got = await fresh(board(at, kind, center, blend, X().KEY.tech(0)));"]] },
  PK_IN: { "game.js": [[/(const got = await fresh\(board\(at, "goal", X\(\)\.TUNE\.PK_P, blend, X\(\)\.KEY\.pkKick\(key\), auto\)\);\n\s+noteBoard\(got\);)/, "$1 S.record.sN += 1; S.record.sSum += got.sBoard;"]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
async function one(seed, pos, o) {
  const env = boot(Object.assign({ seed, pos, operator: "normal", realScene: false }, o || {}));
  const r = await runAct(env);
  const X = env.w.W2World, P = env.w.WingerLive.TUNE.WEAK_P;
  const tb = (r.S.test && r.S.test.techBoards) || [];
  const wantWeak = tb.map((_, i) => X.rngOf(r.S.seed, X.KEY.tech(i), X.SALT.board)() < P);
  const offDef = env.seen.live.filter((m) => m.week !== 35).reduce((a, m) => a + m.info.boards.filter((b) => b.kind === "defend").length, 0);
  const note = (r.S.sheet.cols.find((c) => c.k === "skill") || {}).note || "";
  const nNote = +((note.match(/막기 판 (\d+)번/) || [])[1] || 0);
  env.w.close();
  return { S: r.S, tb, wantWeak, offDef, nNote };
}
const t2 = (x) => x.tb.length === 3 && x.tb.every((b, i) => b.weak === x.wantWeak[i]);
const t3 = (x) => {
  const plain = x.tb.filter((b) => !b.weak).map((b) => b.s / 0.5);
  const C = plain.length ? plain[0] : null;
  return x.tb.every((b) => b.auto && b.sBoard === 0.5) && plain.every((c) => Math.abs(c - C) < 1e-12)
    && (C == null || x.tb.filter((b) => b.weak).every((b) => Math.abs(b.s - Math.min(1, 0.5 * FOOT(x.S.weak) * C)) < 1e-12));
};
(async () => {
  const H = [], A = [];
  for (const [seed, pos] of [[6101, "fw"], [6102, "wg"], [6103, "mf"], [6104, "df"], [6105, "mf"], [6106, "df"]]) {
    H.push(await one(seed, pos));
    A.push(await one(seed, pos, { auto: true }));
  }
  const k1 = H.concat(A).filter((x) => x.tb.map((b) => b.kind).join() !== KINDS[x.S.pos]);
  check(k1.length === 0, `TT-1. 🎯 기술 판 셋 — ${H.slice(0, 4).map((x) => `${x.S.pos} ${x.tb.map((b) => ({ goal: "🥅", assist: "🅰️", defend: "🧱" })[b.kind]).join("")}`).join(" · ")}`);
  const nW = H.concat(A).reduce((a, x) => a + x.tb.filter((b) => b.weak).length, 0);
  check(H.concat(A).every(t2) && nW > 0, `TT-2. 🎲 기술 판 i의 약발 상황 == rngOf(판 시드, KEY.tech(i), SALT.board) — 손 · 🤖 ${H.length + A.length}판 × 3(약발 판 ${nW})`);
  check(A.every(t3), `TT-3. 🤖 기술 판 = 0.5 × 상황 — sBoard 0.5 · s = 0.5 × 🦶 × 🫀(🤖 ${A.length}판)`);
  const pk = await one(5008, "fw");
  check(pk.S.record.pkN > 0 && pk.nNote === pk.offDef, `TT-4. 🥅 승부차기 킥(${pk.S.record.pkN}번)은 솜씨 칸에 안 더함 — 「🧱 막기 판 ${pk.nNote}번」 == 공식 경기 🧱 판 ${pk.offDef}`);
  if (fail === 0) {
    const m1 = [];
    for (const [seed, pos] of [[6101, "fw"], [6103, "mf"], [6104, "df"]]) m1.push(await one(seed, pos, { auto: true, muts: MUT.ONEKEY }));
    check(!m1.every(t2), "변이-ONEKEY(기술 판 셋이 열쇠 하나를 같이 씀) → TT-2가 빨간불");
    const m2 = await one(5008, "fw", { muts: MUT.PK_IN });
    check(m2.nNote !== m2.offDef, `변이-PK_IN(승부차기 킥을 솜씨에 더함) → TT-4가 빨간불 (${m2.nNote} ≠ ${m2.offDef})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
