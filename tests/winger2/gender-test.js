/* ⚽ 더 윙어 II 1막 — 🚻 **성별 대칭** (13번 · 22번 §4-7 · 26번 §2 · §5)
 *
 *   GS-1  같은 시드 · 같은 입력에서 남 · 여 두 판의 **모든 숫자**가 같다 — 능력치 · 컨디션 · 🤝 · 기록 · 경기마다의 숫자 ·
 *         평가서 칸 · 합계 · 구간 · 엔딩 · 업적 · 이벤트 기록(%, 상황, 성패) · 이야기 결말 · 리그 순위표 · 개인 기록 · 대회 단계
 *         (🤖 자동 판 6쌍 + 손으로 둔 판 2쌍)
 *   GS-2  다른 것은 **이름 · 그림 · 문장**뿐 — 팀 · 리그 · 대회 이름과 {rival} · {keeper} · {ace} 이름 · 그림 열쇠(`who`)가 갈리고,
 *         카드의 **모양**(id · 종류 · 선택지 종류 · % · 조각 · 판돈)은 같다
 *   GS-3  여자부 세계 **모양** == 남자부 — 리그 6팀 · 대회 8조 32팀 · 전력 · 대진 · 명단 자리 · 흔들림(이름만 빼면 비트 같음 · 세계 40벌)
 *   GS-4  🧪 감도(26번 §5 · engineer `sym-mut.js`) — **여자부만 세계 굴림 앞에서 한 번 더 뽑는** 변이에서 GS-1 · GS-3이 빨간불
 *         (그대로면 초록). 이름 뽑기는 세계 모양을 다 만든 **뒤** 따로 가른 난수원이라 대칭과 안 묶여요(13번 §5-2)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 1분
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { PAGE_DIR, pageMutsOK, load } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const MUT = { PRE_F: { "world.js": [[/const wr = rngOf\(seed, 0, SALT\.world\);/, 'const wr = rngOf(seed, 0, SALT.world); if (g === "f") wr();']] } };
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
/* 카드 모양 — 글을 빼고 숫자 · 종류만 */
const shapeOf = (cards) => cards.filter((c) => c.kind === "event" || c.kind === "story").map((c) => [c.__week, c.id, c.kind, c.sit,
  (c.opts || []).map((o) => [o.k, o.pct == null ? null : o.pct, o.stake || null, (o.parts || []).map((p) => p.v)])]);

async function one(gender, seed, opt) {
  const env = boot(Object.assign({ seed, gender, pos: ["fw", "wg", "mf", "df"][seed % 4], realScene: false }, opt || {}));
  const r = await runAct(env);
  const out = { S: r.S, done: r.done, cards: env.seen.card, portraits: (env.seen.portraits || []).map((p) => p.who).filter(Boolean), intro: env.seen.intro };
  env.w.close();
  return out;
}
async function gs1(muts) {
  const PAIRS = [[101, { auto: true }], [202, { auto: true }], [303, { auto: true }], [404, { auto: true }], [505, { auto: true, policy: { tryAt: 0 } }], [606, { auto: true, policy: { tryAt: 101, promise: false } }],
    [707, { hand: () => 0.8 }], [808, { hand: () => 0.3, policy: { train: "focus" } }]];
  const bad = [], names = [], shapes = [];
  let dead = 0;
  for (const [seed, opt] of PAIRS) {
    const a = await one("m", seed, Object.assign({ muts }, opt)), b = await one("f", seed, Object.assign({ muts }, opt));
    if (!a.done || !b.done) { dead += 1; continue; }
    const A = numbers(a.S), B = numbers(b.S);
    const diff = Object.keys(A).filter((k) => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
    if (diff.length) bad.push(`#${seed}: ${diff.join(",")}`);
    /* GS-2 */
    const wa = a.S.world, wb = b.S.world;
    const rv = (w) => w.ours.find((x) => x.role === "rival").name;
    const ac = (w) => w.league.teams[5].xi.find((x) => x.role === "ace").name;
    const differ = [["팀", wa.school.team, wb.school.team], ["리그", wa.league.name, wb.league.name], ["대회", wa.cup.name, wb.cup.name],
      ["{rival}", rv(wa), rv(wb)], ["{keeper}", wa.keeper.name, wb.keeper.name], ["{ace}", ac(wa), ac(wb)], ["그림 열쇠", wa.rivalWho, wb.rivalWho]];
    const same = differ.filter(([, x, y]) => x === y).map(([k]) => k);
    if (same.length) names.push(`#${seed}: 안 갈린 이름 ${same.join(",")}`);
    if (JSON.stringify(shapeOf(a.cards)) !== JSON.stringify(shapeOf(b.cards))) shapes.push(`#${seed}`);
  }
  return { bad, names, shapes, dead, n: PAIRS.length };
}
/* GS-3 — 세계만 */
function gs3(muts) {
  const E = load();
  const src = ((muts && muts["world.js"]) || []).reduce((s, [re, rep]) => s.replace(re, rep), fs.readFileSync(path.join(PAGE_DIR, "world.js"), "utf8"));
  const X = new Function("window", `${src}\nreturn window.W2World;`)({ WingerEngine: E });
  const strip = (w) => JSON.stringify(w, (k, v) => (k === "name" || k === "team" || k === "who" || /Who$/.test(k) ? undefined : v));
  const bad = [];
  let shapeOk = true;
  for (let i = 0; i < 40; i++) {
    const seed = 9000 + i * 17, pos = ["fw", "wg", "mf", "df"][i % 4];
    const m = X.create(seed, pos, "m"), f = X.create(seed, pos, "f");
    if (strip(m) !== strip(f)) bad.push(`#${seed}`);
    const cupN = f.cup.groups.reduce((a, g) => a + g.length, 0);
    if (f.league.teams.length !== 6 || f.cup.groups.length !== 8 || cupN !== 32 || m.league.teams.length !== 6 || m.cup.groups.reduce((a, g) => a + g.length, 0) !== 32) shapeOk = false;
  }
  return { bad, shapeOk };
}

(async () => {
  const g1 = await gs1(null);
  check(g1.dead === 0 && g1.bad.length === 0, `GS-1. 🚻 같은 시드 · 같은 입력의 남 · 여 ${g1.n}쌍 — 능력치 · 기록 · 경기 · 평가서 · 엔딩 · 업적 · 이벤트 · 이야기 · 순위표 · 대회의 **모든 숫자**가 같다 (어긋난 쌍 ${g1.bad.length})` + (g1.bad.length ? `\n     🔴 ${g1.bad.slice(0, 3).join(" · ")}` : ""));
  check(g1.names.length === 0 && g1.shapes.length === 0, `GS-2. 🏷️ 다른 것은 이름 · 그림뿐 — 팀 · 리그 · 대회 · {rival} · {keeper} · {ace} 이름 · 그림 열쇠가 쌍마다 갈리고, 카드 모양(id · 종류 · 선택지 · % · 조각 · 판돈)은 같다`
    + (g1.names.length ? `\n     🔴 ${g1.names.slice(0, 3).join(" · ")}` : "") + (g1.shapes.length ? `\n     🔴 카드 모양이 갈린 쌍 ${g1.shapes.join(",")}` : ""));
  const g3 = gs3(null);
  check(g3.bad.length === 0 && g3.shapeOk, `GS-3. 🌍 여자부 세계 모양 == 남자부 — 리그 6팀 · 대회 8조 32팀 · 전력 · 대진 · 명단 자리 · 흔들림이 이름만 빼면 비트 같다 (세계 40벌 · 어긋남 ${g3.bad.length})`);
  /* GS-4 — 감도 */
  const m3 = gs3(MUT.PRE_F);
  check(m3.bad.length >= 38, `GS-4a. 🧪 여자부만 세계 굴림 앞에서 한 번 더 → GS-3이 빨간불 (갈린 세계 ${m3.bad.length}/40)`);
  const m1 = await gs1(MUT.PRE_F);
  check(m1.bad.length >= m1.n - 1, `GS-4b. 🧪 같은 변이 → GS-1이 빨간불 (같은 쌍 ${m1.n - m1.bad.length - m1.dead}/${m1.n} — engineer 장치 「0/3」과 같은 방향)`);
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
