/* ⚽ 더 윙어 II 1막 v2 — 🪪 **외형 대칭** (15번 C · 38번 계약 15 · 39번 §2 · act2 12번 R2-29 — 「카드 = 외형만」)
 *
 *   LK-1  같은 시드 · 같은 입력 · 같은 성별에서 **카드(지호 · 도윤 · 하람)만 바꾸면 모든 숫자**가 같다 — 능력치 · 컨디션 · 🤝 · 기록 ·
 *         경기마다의 숫자 · 평가서 칸 · 합계 · 구간 · 엔딩 · 업적 · 이벤트 · 이야기 결말 · 순위표 · 대회(🤖 4쌍 + 손 2쌍 × 남 · 여)
 *         — 목소리를 고르지 않은 판(카드마다 기본 목소리가 다름)도 숫자는 같다
 *   LK-2  다른 것은 **그림 열쇠 · 이름 · 문장**뿐 — 주인공 그림 열쇠(`who`)가 카드마다 갈리고, 카드 모양(id · 종류 · 선택지 · % · 판돈)은 같다
 *   + 변이(성별 대칭과 같은 모양): 카드 이름 길이만큼 시작 능력치 시드를 밀기 → LK-1이 빨간불
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 몇 분
 */
"use strict";
const { pageMutsOK } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const MUT = { CARDLEN: { "game.js": [[/const stats = X\(\)\.rollStart\(seed, k\);/, "const stats = X().rollStart(seed + String(o.preset).length, k);"]] } };
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const numbers = (S) => ({
  stats: S.stats, cond: S.cond, trust: S.trust, record: S.record,
  games: S.games.map((g) => [g.w, g.t, g.gf, g.ga, g.res, g.g, g.a, g.d, g.r, g.sv, g.rv]),
  sheet: S.sheet.cols.map((c) => c.v).concat([S.sheet.total, S.sheet.tier]), mid: (S.mid || []).map((m) => [m.week, m.total, m.tier]),
  ending: [S.ending.id, S.ending.tier], ach: Object.keys(S.ach || {}).sort(),
  evLog: (S.evLog || []).map((l) => [l.w, l.id, l.k, l.pct, l.ok, l.sit, l.alt]), story: (S.story.done || []).map((d) => [d.sid, d.end, d.week]),
  table: S.world.league.table, ind: S.world.league.ind, cup: [S.world.cup.stage, S.world.cup.out, S.world.cup.done], league: [S.leagueChamp, S.crown],
});
const shapeOf = (cards) => cards.filter((c) => c.kind === "event" || c.kind === "story").map((c) => [c.__week, c.id, c.kind, c.sit,
  (c.opts || []).map((o) => [o.k, o.pct == null ? null : o.pct, o.stake || null, (o.parts || []).map((p) => p.v)])]);
async function one(preset, gender, seed, opt) {
  const env = boot(Object.assign({ seed, preset, gender, pos: ["fw", "wg", "mf", "df"][seed % 4], realScene: false }, opt || {}));
  const r = await runAct(env);
  const out = { S: r.S, done: r.done, cards: env.seen.card };
  env.w.close();
  return out;
}
async function lk(muts, list) {
  const bad = [], shapes = [], who = [];
  let dead = 0, n = 0;
  for (const [seed, gender, opt] of list) {
    const runs = [];
    for (const p of ["jiho", "doyun", "haram"]) runs.push(await one(p, gender, seed, Object.assign({ muts }, opt)));
    n += 1;
    if (runs.some((r) => !r.done)) { dead += 1; continue; }
    const base = numbers(runs[0].S);
    for (const r of runs.slice(1)) {
      const B = numbers(r.S);
      const diff = Object.keys(base).filter((k) => JSON.stringify(base[k]) !== JSON.stringify(B[k]));
      if (diff.length) bad.push(`#${seed}${gender} ${r.S.preset}: ${diff.join(",")}`);
      if (JSON.stringify(shapeOf(runs[0].cards)) !== JSON.stringify(shapeOf(r.cards))) shapes.push(`#${seed}${gender} ${r.S.preset}`);
    }
    const ws = runs.map((r) => `${r.S.preset}-${r.S.gender}`);
    if (new Set(ws).size !== 3) who.push(`#${seed}${gender}`);
  }
  return { bad, shapes, who, dead, n };
}
(async () => {
  const L = [];
  for (const g of ["m", "f"]) {
    for (const s of [111, 222, 333]) L.push([s, g, { auto: true }]);
    L.push([444, g, { auto: true, policy: { tryAt: 0 } }]);
    L.push([555, g, { hand: () => 0.8 }]);
    L.push([666, g, { hand: () => 0.3, policy: { train: "focus" } }]);
  }
  const r = await lk(null, L);
  check(r.dead === 0 && r.bad.length === 0, `LK-1. 🪪 같은 시드 · 같은 입력에서 카드 셋(지호 · 도윤 · 하람)만 바꾼 ${r.n}벌 — 능력치 · 기록 · 경기 · 평가서 · 엔딩 · 업적 · 이벤트 · 이야기 · 순위표 · 대회의 **모든 숫자**가 같다 (어긋남 ${r.bad.length} · 멈춘 판 ${r.dead})` + (r.bad.length ? `\n     🔴 ${r.bad.slice(0, 3).join(" · ")}` : ""));
  check(r.shapes.length === 0 && r.who.length === 0, `LK-2. 🖼️ 다른 것은 그림 열쇠 · 이름 · 문장뿐 — 주인공 \`who\`가 카드마다 갈리고 카드 모양(id · 종류 · 선택지 · % · 판돈)은 같다` + (r.shapes.length || r.who.length ? `\n     🔴 ${r.shapes.concat(r.who).slice(0, 3).join(" · ")}` : ""));
  if (fail === 0) {
    const m = await lk(MUT.CARDLEN, L.slice(0, 2));
    check(m.bad.length > 0, `변이-CARDLEN(카드 이름 길이만큼 시작 능력치 시드를 밂) → LK-1이 빨간불 (어긋남 ${m.bad.length})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
