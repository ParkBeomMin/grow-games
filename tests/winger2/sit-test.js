/* ⚽ 더 윙어 II 1막 v2 — 🦶🫀 **판의 상황 · 승산 줄 · 📍 q** (드라이버 `live.js` · 37번 §4 #5 · #6 · #8 · #10 · 38번 §5 · §6 3′-a · b)
 *
 *   ST-1  🦶 약발 상황 — 판마다 **0.4**(v3 · 44번 §1 · 43번 §4 #5 — 🤖 1,200경기로 몫을 봄) · 배수 `min(0.95, 0.75 + 0.13 × 단계)` → 0 · 1 · 2단계 0.75 · 0.88 · 0.95 · 아니면 1
 *         🫀 = `condMul(그 경기 날 컨디션)` · 판이 받는 `sit`이 이 값 그대로(판은 셈하지 않음)
 *   ST-2  상황 같음(#5) — 같은 시드면 🤖 · 손이 **같은 판에서 같은 상황**(약발 여부 열이 같음 — 둘 다 있는 판끼리) · 🤖 판의 `s` = clamp(0.5 × 🦶 × 🫀)
 *   ST-3  상황 난수 따로(#6) — 배수를 1로 묶으면 「상황을 뽑는 🤖」과 「상황을 안 뽑는 🤖」의 경기가 **비트 같음**(300 / 300)
 *   ST-4  승산 줄 = 판정 확률(#8 · 3′-b) — 판이 받은 `odds(s)` == round(100 × `cardP(autoP(kind, 내 능력치), 내 능력치, s)`)
 *   ST-5  📍 `q`(#10) = `cardP(autoP(kind, 민재), 민재, 0.5 × (약발 상황 ? 0.75 : 1))` · 민재 🫀 1
 *   + 변이: 🤖에서 🫀 빼기 · 상황 굴림이 엔진 열을 건드림 · 승산을 `sBoard`로 · q에서 상황 뺌 · 약발 꼭대기 없음
 *   ST-6  🦶 약발 한 단계 = 경험 **1.5**(43번 §4 #5) — 세이브의 `weakXp` 1.4 · 1.5 · 2.9 · 3.0 · 9 → 단계 0 · 1 · 1 · 2 · 2
 *   ST-7  손 ≡ 🤖(43번 §4 #1) — 판 셋이 모두 감이라 진짜 판 값(`_t.values` · 아무 칸)으로 둔 경기와 🤖 경기가 비트 같음(300 / 300)
 * 🔒 0.75 · 0.13 · 0.95 · 0.4 · 1.5 · 0.75(민재)는 38번 §5 · 44번 §1 — 박은 값
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 1분
 */
"use strict";
const { bootPage, pageMutsOK, wait } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const FOOT = (step) => Math.min(0.95, 0.75 + 0.13 * step);
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const MUT = {
  NOHEART: { "live.js": [[/const v = clamp01\(0\.5 \* s\.foot \* s\.cond\);/, "const v = clamp01(0.5 * s.foot);"]] },
  ENGINE_RNG: { "live.js": [[/const weak = sr\(\) < T\.WEAK_P;/, "const weak = (E._t.seed(Math.floor(sr() * 1e9)), sr()) < T.WEAK_P;"]] },
  ODDS_SB: { "live.js": [[/const odds = \(sv\) => Math\.round\(100 \* E\.cardP\(m\.autoP\(kind, abMe\), abMe, num01\(Number\(sv\)\) \|\| 0\)\);/, "const odds = (sv) => Math.round(100 * (num01(Number(sv)) || 0));"]] },
  Q_NOSIT: { "live.js": [[/0\.5 \* \(s\.weak \? T\.RIVAL_WEAK : 1\)/, "0.5"]] },
  NOTOP: { "live.js": [[/WEAK_TOP: 0\.95,/, "WEAK_TOP: 1.5,"]] },
  THIRD: { "live.js": [[/WEAK_P: 0\.4,/, "WEAK_P: 1 / 3,"]] },
  XP2: { "game.js": [[/WEAK_XP: 1\.5,/, "WEAK_XP: 2.0,"]] },
  BLK80: { "winger-moment.js": [[/const values = \(\) => \[0, 1, 2, 3, 4, 5\]\.map\(\(\) => TUNE\.FLAT\);/, 'const values = (k) => [0, 1, 2, 3, 4, 5].map((i) => (k === "defend" ? (i === 0 ? 0.80 : 0.44) : TUNE.FLAT));']] },
  /* ST-3의 두 판 — 배수 1(뽑기는 함) · 배수 1(뽑기도 안 함) */
  ONE_DRAW: { "live.js": [[/return \{ weak, step, foot: footOf\(weak, step\), cond: heart \};/, "return { weak, step, foot: 1, cond: 1 };"]] },
  ONE_NODRAW: { "live.js": [[/return \{ weak, step, foot: footOf\(weak, step\), cond: heart \};/, "return { weak, step, foot: 1, cond: 1 };"], [/const weak = sr\(\) < T\.WEAK_P;/, "const weak = false;"]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const join = (...ms) => { const o = {}; for (const m of ms) for (const [f, l] of Object.entries(m || {})) o[f] = (o[f] || []).concat(l); return o; };

/* 한 페이지에서 머리 없는 경기 여럿 — 손이면 판 스텁(계약 3′ 모양)이 받은 것을 남김 */
async function matches(muts, list, hand) {
  const W = bootPage({ fastTimers: true, muts });
  for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
  const E = W.WingerEngine, X = W.W2World, out = [];
  let got = [];
  if (hand) {
    const vals = W.W2Moment._t.values;
    let pickN = 0;
    W.W2Moment = Object.assign({}, W.W2Moment, { play(slot, o, cb) {
      const sB = hand === "real" ? vals(o.kind)[(pickN++ * 7) % 6] : 0.6, s = Math.min(1, Math.max(0, sB * o.sit.foot * o.sit.cond));
      got.push({ kind: o.kind, sit: Object.assign({}, o.sit), odds: o.odds(s), odds0: o.odds(0.5 * o.sit.foot * o.sit.cond), s });
      const j = o.judge(s);
      Promise.resolve().then(() => cb(j, { s, sBoard: sB, cell: 0, target: null, seen: null, weak: o.sit.weak, ms: 1 }));
    } });
  }
  for (const c of list) {
    const S = { pos: c.pos, name: "나", stats: Object.fromEntries(K6.map((k) => [k, c.ab || 56])), world: X.create(c.seed, c.pos, "m") };
    const xi = X.ourXI(S);
    const cfg = { xi, teamStr: 58, oppStr: c.opp || 58, condition: c.cond, myName: "나", foot: "R", seed: X.engineSeed(c.seed, 100),
      sitRng: X.rngOf(c.seed, 100, X.SALT.board), weak: c.weak || 0, rivalAb: c.rivalAb, auto: !hand };
    got = [];
    const info = await W.WingerLive.play(null, cfg);
    /* 같은 입력으로 엔진 판을 하나 더 열어 `autoP`(읽기 창구 — 굴림 0)를 얻음 */
    const m2 = E.createMatch({ xi, teamStr: 58, oppStr: c.opp || 58, condition: c.cond });
    const me = xi.find((x) => x.me);
    out.push({ c, info, got, abMe: E.blendOf(me), autoP: (k, ab) => m2.autoP(k, ab), heart: E.condMul(c.cond), cardP: E.cardP });
  }
  W.close();
  return out;
}
const sig = (info) => JSON.stringify([info.teamGoals, info.oppGoals, (info.cards || []).map((x) => [x.k, x.kind, x.mine, x.judge, x.result])]);

(async () => {
  const L = [];
  for (let i = 0; i < 90; i++) L.push({ seed: 7000 + i, pos: ["fw", "wg", "mf", "df"][i % 4], cond: [30, 51, 80][i % 3], weak: i % 3, rivalAb: 64 });
  /* ST-1 · ST-4 · ST-5 — 손 */
  const H = await matches(null, L, true);
  const b1 = [], b4 = [], b5 = [];
  let nB = 0, nW = 0;
  for (const r of H) {
    r.got.forEach((g, i) => {
      nB += 1; if (g.sit.weak) nW += 1;
      const wantF = g.sit.weak ? FOOT(r.c.weak) : 1;
      if (Math.abs(g.sit.foot - wantF) > 1e-12 || Math.abs(g.sit.cond - r.heart) > 1e-12 || g.sit.step !== r.c.weak) b1.push(`${r.c.seed}#${i}: sit ${JSON.stringify(g.sit)} ≠ 🦶 ${wantF} · 🫀 ${r.heart}`);
      const wantO = Math.round(100 * r.cardP(r.autoP(g.kind, r.abMe), r.abMe, g.s));
      if (g.odds !== wantO) b4.push(`${r.c.seed}#${i}: odds ${g.odds} ≠ ${wantO}`);
      const b = r.info.boards[i];
      const wantQ = r.cardP(r.autoP(b.kind, 64), 64, 0.5 * (b.weak ? 0.75 : 1));
      if (b.q == null || Math.abs(b.q - wantQ) > 1e-12) b5.push(`${r.c.seed}#${i}: q ${b.q} ≠ ${wantQ}`);
    });
  }
  /* 몫은 🤖 1,200경기로(손 판 216번은 ⅓ · 0.4를 못 가름) */
  const LW = []; for (let i = 0; i < 1200; i++) LW.push({ seed: 20000 + i, pos: ["fw", "wg", "mf", "df"][i % 4], cond: 51, weak: 1 });
  const share = async (muts) => { const r = await matches(muts, LW, false); let n = 0, w = 0; for (const x of r) for (const b of x.info.boards) { n += 1; if (b.weak) w += 1; } return { n, w, f: w / n, se: Math.sqrt(0.4 * 0.6 / n) }; };
  const sh = await share(null);
  check(b1.length === 0 && Math.abs(sh.f - 0.4) <= 3 * sh.se, `ST-1. 🦶 🤖 판 ${sh.n}번 — 약발 상황 ${sh.w}(${(sh.f * 100).toFixed(1)}% · 0.4 ± 3σ ${(3 * sh.se * 100).toFixed(1)}%p) · 손 판 ${nB}번(약발 ${nW}) · 🦶 = min(0.95, 0.75 + 0.13 × 단계)(0 · 1 · 2단계) · 🫀 = condMul(30 · 51 · 80) · 판이 받은 sit이 그 값 그대로` + (b1.length ? `\n     🔴 ${b1.slice(0, 3).join(" · ")}` : ""));
  check(b4.length === 0 && nB > 100, `ST-4. 🎯 승산 줄 = 판정 확률 — 판 ${nB}번의 \`odds(s)\` == round(100 × cardP(autoP(kind, 내 능력치), 내 능력치, s))` + (b4.length ? `\n     🔴 ${b4.slice(0, 3).join(" · ")}` : ""));
  check(b5.length === 0, `ST-5. 📍 q — 판 ${nB}번이 cardP(autoP(kind, 민재 64), 64, 0.5 × (약발 상황 ? 0.75 : 1))` + (b5.length ? `\n     🔴 ${b5.slice(0, 3).join(" · ")}` : ""));
  /* ST-2 — 🤖 */
  const A = await matches(null, L, false);
  const b2 = [];
  A.forEach((r, k) => {
    /* 판정이 갈리면 스코어가 갈려 경기 길이(대승이면 6장에서 끊김)가 달라질 수 있어요 — 둘 다 있는 판(앞부분)끼리 견줌 */
    const n2 = Math.min(H[k].info.boards.length, r.info.boards.length);
    const hw = H[k].info.boards.slice(0, n2).map((x) => x.weak).join(), aw = r.info.boards.slice(0, n2).map((x) => x.weak).join();
    if (hw !== aw) b2.push(`${r.c.seed}: 손 ${hw} ↔ 🤖 ${aw}`);
    for (const b of r.info.boards) {
      const want = Math.min(1, 0.5 * (b.weak ? FOOT(r.c.weak) : 1) * r.heart);
      if (!b.auto || b.sBoard !== 0.5 || Math.abs(b.s - want) > 1e-12) b2.push(`${r.c.seed}: 🤖 s ${b.s} ≠ ${want}`);
    }
  });
  check(b2.length === 0, `ST-2. 🤖 = 손의 상황 — 같은 시드 ${A.length}경기에서 약발 상황 열이 같음 · 🤖 판 s = clamp(0.5 × 🦶 × 🫀)` + (b2.length ? `\n     🔴 ${b2.slice(0, 3).join(" · ")}` : ""));
  /* ST-3 — 300경기 */
  const L3 = []; for (let i = 0; i < 300; i++) L3.push({ seed: 8000 + i, pos: ["fw", "wg", "mf", "df"][i % 4], cond: 51, weak: i % 3 });
  const st3 = async (extra) => {
    const a = await matches(join(MUT.ONE_DRAW, extra), L3, false), b = await matches(MUT.ONE_NODRAW, L3, false);
    return a.filter((r, i) => sig(r.info) === sig(b[i].info)).length;
  };
  const same = await st3(null);
  check(same === 300, `ST-3. 🎲 상황 난수 따로 — 배수를 1로 묶으면 「상황을 뽑는 🤖」 = 「안 뽑는 🤖」 경기 ${same} / 300`);
  /* ST-6 — 약발 경험 1.5 */
  async function st6(muts) {
    const W = bootPage({ fastTimers: true, muts });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const X = W.W2World;
    const base = { v: 2, act: 1, seed: 5, preset: "jiho", gender: "m", name: "나", pos: "wg", foot: "R", no: 11, week: 5, ph: 0,
      stats: Object.fromEntries(K6.map((k) => [k, 50])), world: X.create(5, "wg", "m") };
    const got = [];
    for (const xp of [1.4, 1.5, 2.9, 3.0, 9]) {
      W.localStorage.setItem("winger2-save-v2", JSON.stringify(Object.assign({}, base, { weakXp: xp })));
      const sv = W.W2Game.loadSave();
      got.push(sv ? sv.weak : null);
    }
    W.close();
    return { ok: JSON.stringify(got) === "[0,1,1,2,2]", got };
  }
  const s6 = await st6(null);
  check(s6.ok, `ST-6. 🦶 약발 한 단계 = 경험 1.5 — weakXp 1.4 · 1.5 · 2.9 · 3.0 · 9 → 단계 ${s6.got.join(" · ")}(0 · 1 · 1 · 2 · 2)`);
  /* ST-7 — 손 ≡ 🤖 */
  async function st7(muts) {
    const a = await matches(muts, L3, "real"), b = await matches(muts, L3, false);
    return a.filter((r, i) => sig(r.info) === sig(b[i].info)).length;
  }
  const s7 = await st7(null);
  check(s7 === 300, `ST-7. 🤝 손 ≡ 🤖 — 진짜 판 값(\`_t.values\` · 아무 칸)으로 둔 경기 = 🤖 경기 ${s7} / 300`);
  /* 🧪 변이 */
  if (fail === 0) {
    const m1 = await matches(MUT.NOHEART, L.slice(0, 12), false);
    check(m1.some((r) => r.info.boards.some((b) => Math.abs(b.s - Math.min(1, 0.5 * (b.weak ? FOOT(r.c.weak) : 1) * r.heart)) > 1e-12)), `변이-NOHEART(🤖에서 🫀 빼기) → ST-2가 빨간불`);
    const m2 = await st3(MUT.ENGINE_RNG);
    check(m2 < 300, `변이-ENGINE_RNG(상황 굴림이 엔진 열을 건드림) → ST-3이 빨간불 (같은 경기 ${m2} / 300)`);
    const m3 = await matches(MUT.ODDS_SB, L.slice(0, 12), true);
    check(m3.some((r) => r.got.some((g) => g.odds !== Math.round(100 * r.cardP(r.autoP(g.kind, r.abMe), r.abMe, g.s)))), `변이-ODDS_SB(승산을 판 값으로) → ST-4가 빨간불`);
    const m4 = await matches(MUT.Q_NOSIT, L.slice(0, 24), true);
    check(m4.some((r) => r.info.boards.some((b) => b.weak && Math.abs(b.q - r.cardP(r.autoP(b.kind, 64), 64, 0.375)) > 1e-12)), `변이-Q_NOSIT(q에서 상황 뺌) → ST-5가 빨간불`);
    const m5 = await matches(MUT.NOTOP, L.filter((c) => c.weak === 2).slice(0, 12), true);
    check(m5.some((r) => r.got.some((g) => g.sit.weak && Math.abs(g.sit.foot - FOOT(2)) > 1e-12)), `변이-NOTOP(약발 꼭대기 0.95를 뺌 — 2단계 1.01) → ST-1이 빨간불`);
    const m6 = await share(MUT.THIRD);
    check(Math.abs(m6.f - 0.4) > 3 * m6.se, `변이-THIRD(상황 몫 ⅓ 남김 — 43번 §4 #5) → ST-1이 빨간불 (${(m6.f * 100).toFixed(1)}%)`);
    check(!(await st6(MUT.XP2)).ok, "변이-XP2(한 단계 경험 2.0) → ST-6이 빨간불");
    const m7 = await st7(MUT.BLK80);
    check(m7 < 300, `변이-BLK80(🧱만 정답 0.80 — 43번 §4 #1) → ST-7이 빨간불 (같은 경기 ${m7} / 300)`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
