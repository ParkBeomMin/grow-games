/* ⚽ 더 윙어 II 1막 v5 — 🧩 **11대11 · 포메이션 · 선발 판단** (52번 §2 계약 · 51번 v4-3 · v4-4 #1 · #2 · #8 · #10)
 *
 *   V-1a 결정성 — 같은 시드 · 같은 손이면 같은 판(경기마다 선 자리 `at` · 판단 `pick` · 포메이션 `form` · 스코어 · 기록 · 평가서) — 두 번 돌려 비트 같음
 *   V-1b 옛 엔진 그대로(51번 v4-4 #1) — `form` · `onMin`이 없으면 지금 엔진 = v4 커밋(`ee0933d`) 엔진 — 같은 입력 300경기(내 경기)
 *        + 남의 경기(`autoMatch`) 300경기 비트 같음
 *   V-2  보이는 값 = 판정 값(선발 판단 · 52번 §2) — 진짜 1막 판들의 `info.pick`마다: 조각(능력 · 🤝 · 컨디션 · 🦶)을 0.1로 접은 합 = Δ ·
 *        k = ① Δ ≥ 0 · ② −3.5 < Δ < 0 · ③ 그 밖 — 단 앞 공식 경기가 ③이면 ②(기회 주기 · 연속 ③ 0 · 「늘 쉼」 손 셋으로 실제로 지나감 ≥ 3번) · ①이면 선 자리 = 내 포지션 · ③이면 60′ 전 내 카드 0
 *   V-3  포메이션 배수가 판정에 쓰임(51번 v4-4 #2) — `createMatch({ form })`의 🥅 중심 확률 비 = atkW(form) ÷ atkW(없음),
 *        atkW = us·fa·m ÷ (us·fa·m + them·fd2) — 무작위 배수 200벌
 *   V-4  교체 경기(51번 v4-4 #10 · 15번 F8) — `onMin` 60: 6장 끊기 없음(3골 차에도 카드 수 = 끊기를 아예 끈 엔진과 같음) · 투입 전 내 카드 0 ·
 *        내 판 최소 1 · 교체 아닌 경기는 끊기 그대로
 *   (평가서 `byAt` = 기록 칸 — rev3-test R3-2)
 *   + 변이: form 기본값이 배수 1이 아님 · 🦶 약발 조각을 화면 조각에서 뺌 · 기회 주기 끔 · `fd2` 빼먹기 · 교체 경기에도 끊기 남김
 * 🔒 3.5 · 60 · 식 모양은 51번 v4-3 · 52번 §2 — 박은 값
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 4분
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { load, mutsOK, pageMutsOK, PAGE_DIR, ROOT } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const OLD = "ee0933d";   // 🔒 v4 커밋 — 박은 값
const BENCH_GAP = 3.5, SUB_MIN = 60;
const MUT = {
  FORM1: [[/const F = c\.form \|\| null;/, "const F = c.form || { fa: 1, fd: 1, fa2: 1, fd2: 1, m: 1.02, m2: 1 };"]],
  NOFD2: [[/\(us0 \* F\.fa \* F\.m \+ them0 \* F\.fd2\)/, "(us0 * F.fa * F.m + them0)"]],
  CUT: [[/if \(Math\.abs\(us - them\) >= GOAL_GAP && !onMin\)/, "if (Math.abs(us - them) >= GOAL_GAP)"]],
  NOCUT: [[/if \(Math\.abs\(us - them\) >= GOAL_GAP && !onMin\)/, "if (false)"]],
};
const PMUT = { NOWEAK: { "world.js": [[/ {6}\{ name: "🦶 약발", v: m\.wk \/ 10 \},\n/, ""]] },
  /* 기회 주기를 끔(연속 ③ 허용 — 51번 v4-4 #9 「연속 2」) */
  NOCHANCE: { "world.js": [[/if \(k === 3 && prevK === 3\) \{ k = 2; chance = true; \}/, "if (false) { k = 2; chance = true; }"]] } };
{
  const bad = mutsOK(MUT).concat(pageMutsOK(PMUT));
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const WSRC = fs.readFileSync(path.join(PAGE_DIR, "world.js"), "utf8");
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const worldOf = (E) => new Function("window", `${WSRC}\nreturn window.W2World;`)({ WingerEngine: E });
const sig = (r) => JSON.stringify([r.teamGoals, r.oppGoals, r.myGoals, r.assists, r.defense, r.rating, (r.cards || []).map((c) => [c.k, c.min, c.kind, c.mine, c.judge, c.result])]);

(async () => {
  /* V-1a */
  {
    const run = async () => {
      const env = boot({ seed: 5151, pos: "fw", operator: "normal", realScene: false });
      const r = await runAct(env);
      const S = r.S;
      const out = JSON.stringify([S.games.map((g) => [g.w, g.at, g.pick, g.form, g.gf, g.ga, g.g, g.a, g.d, g.r]), S.stats, S.sheet.cols.map((c) => c.v), S.sheet.total, S.rivalLog]);
      env.w.close();
      return out;
    };
    const a = await run(), b = await run();
    check(a === b && a.length > 100, `V-1a. 🔁 같은 시드 · 같은 손 두 번 — 경기마다 선 자리 · 판단 · 포메이션 · 스코어 · 기록 · 평가서 · 라이벌 기록 비트 같음`);
  }
  /* V-1b */
  {
    const oldSrc = execSync(`git show ${OLD}:beta/winger2/engine.js`, { cwd: ROOT, encoding: "utf8" });
    const Eo = new Function("window", "Math", `${oldSrc}\nreturn window.WingerEngine;`)({}, Object.create(Math));
    const En = load();
    const X = worldOf(En);
    let same = 0, sameA = 0;
    for (let i = 0; i < 300; i++) {
      const pos = ["fw", "wg", "mf", "df"][i % 4];
      const S = { pos, name: "나", stats: Object.fromEntries(K6.map((k) => [k, 46 + (i % 40)])), world: X.create(4000 + i, pos, "m") };
      const cfg = () => ({ xi: X.ourXI(S), teamStr: 58, oppStr: 50 + (i % 5) * 4, condition: 30 + (i % 7) * 10 });
      Eo._t.seed(i * 7 + 1); Eo._t.skill = 0.5; En._t.seed(i * 7 + 1); En._t.skill = 0.5;
      if (sig(Eo._t.playMatch(cfg())) === sig(En._t.playMatch(cfg()))) same += 1;
      const T = S.world.league.teams;
      const ac = () => ({ xiA: JSON.parse(JSON.stringify(T[1].xi)), xiB: JSON.parse(JSON.stringify(T[2].xi)), strA: 55 + (i % 9), strB: 58 });
      Eo._t.seed(i * 11 + 3); En._t.seed(i * 11 + 3);
      const ra = Eo._t.autoMatch(ac()), rb = En._t.autoMatch(ac());
      if (JSON.stringify(ra) === JSON.stringify(rb) && ra) sameA += 1;
    }
    const Em = load(MUT.FORM1);
    let mSame = 0;
    for (let i = 0; i < 40; i++) {
      const pos = ["fw", "wg", "mf", "df"][i % 4];
      const S = { pos, name: "나", stats: Object.fromEntries(K6.map((k) => [k, 56])), world: X.create(4000 + i, pos, "m") };
      const cfg = () => ({ xi: X.ourXI(S), teamStr: 58, oppStr: 58, condition: 51 });
      Eo._t.seed(i + 1); Eo._t.skill = 0.5; Em._t.seed(i + 1); Em._t.skill = 0.5;
      if (sig(Eo._t.playMatch(cfg())) === sig(Em._t.playMatch(cfg()))) mSame += 1;
    }
    check(same === 300 && sameA === 300, `V-1b. 🧱 \`form\` · \`onMin\` 없으면 v4 엔진(\`${OLD}\`)과 비트 같음 — 내 경기 ${same}/300 · 남의 경기 ${sameA}/300`);
    check(mSame < 40, `변이-FORM1(form 기본값이 배수 1이 아님 — 51번 v4-4 #1) → V-1b가 빨간불 (같은 경기 ${mSame}/40)`);
  }
  /* V-2 */
  const v2 = async (muts) => {
    const bad = [];
    let n = 0, kc = { 1: 0, 2: 0, 3: 0 }, chance = 0, run3 = 0;
    /* 보통 손 여섯 + 「늘 쉼」 손 셋(훈련 0 — 또래에 밀려 ③이 이어지는 판 · 기회 주기를 실제로 지나게) */
    const REST = { restTh: 0, home: () => ({ k: "rest" }) };
    for (const [seed, pos, pol] of [[5201, "fw"], [5202, "wg"], [5203, "mf"], [5204, "df"], [5205, "fw"], [5206, "mf"], [5301, "mf", REST], [5307, "fw", REST], [5309, "mf", REST]]) {
      const env = boot({ seed, pos, operator: "normal", realScene: false, muts, policy: pol });
      await runAct(env);
      let prevK = null;
      for (const m of env.seen.live) {
        const p = m.info.pick;
        if (!p) { continue; }
        n += 1; kc[p.k] = (kc[p.k] || 0) + 1;
        if (p.d != null) {
          const d10 = p.parts.reduce((a, x) => a + Math.round(x.v * 10), 0);
          if (Math.round(p.d * 10) !== d10) bad.push(`${seed}@${m.week}: 조각 합 ${d10 / 10} ≠ Δ ${p.d}`);
          if (p.parts.map((x) => x.name).join() !== "능력,🤝 감독 신뢰,🫀 컨디션,🦶 약발") bad.push(`${seed}@${m.week}: 조각 ${p.parts.map((x) => x.name)}`);
          let want = d10 >= 0 ? 1 : d10 > -BENCH_GAP * 10 ? 2 : 3;
          if (want === 3 && prevK === 3) { want = 2; chance += 1; }
          if (p.k !== want) bad.push(`${seed}@${m.week}: k ${p.k} ≠ ${want}(Δ ${p.d} · 앞 ${prevK})`);
        }
        if (p.k === 1 && p.at !== pos) bad.push(`${seed}@${m.week}: ① 인데 선 자리 ${p.at}`);
        /* ③ — 계약 모양(52번 §2)에 투입 분은 없음 · 경기에서 봄: 60′ 전 내 카드 0 · 내 판 ≥ 1 */
        if (p.k === 3) {
          const mine = (m.info.cards || []).filter((c) => c.mine);
          if (mine.some((c) => c.min < SUB_MIN) || mine.length < 1) bad.push(`${seed}@${m.week}: ③ 인데 내 카드 ${mine.map((c) => c.min).join(",")}′`);
        }
        if (m.week !== 35) { if (p.k === 3 && prevK === 3) run3 += 1; prevK = p.k; }
      }
      env.w.close();
    }
    return { bad, n, kc, chance, run3 };
  };
  const r2 = await v2(null);
  check(r2.bad.length === 0 && r2.n > 50 && r2.chance >= 3 && r2.run3 === 0, `V-2. 🎯 선발 판단 ${r2.n}경기(① ${r2.kc[1]} · ② ${r2.kc[2]} · ③ ${r2.kc[3]} · 기회 주기로 ③ → ② ${r2.chance}번 · 연속 ③ ${r2.run3}) — 조각 넷을 0.1로 접은 합 = Δ · k = Δ의 문턱(0 · −3.5) · 앞이 ③이면 ② · ① 선 자리 = 내 포지션 · ③ 투입 60′` + (r2.bad.length ? `\n     🔴 ${r2.bad.slice(0, 3).join(" · ")}` : ""));
  /* V-3은 엔진의 `atkW`를 직접 못 읽어 — `createMatch`의 읽기 창구가 쓰는 같은 식(소스)을 뜯어 견줌 */
  {
    const E = load(), Ex = load(MUT.NOFD2);
    const src = fs.readFileSync(path.join(PAGE_DIR, "engine.js"), "utf8");
    const usLine = (src.match(/ {4}const us0 = [^\n]+\n/) || [""])[0], themLine = (src.match(/ {4}const them0 = [^\n]+\n/) || [""])[0];
    const X = worldOf(E);
    const bad = [], badX = [];
    let st = 7;
    const rnd = () => { st = (st * 1103515245 + 12345) % 2147483648; return st / 2147483648; };
    for (let i = 0; i < 200; i++) {
      const S = { pos: "wg", name: "나", stats: Object.fromEntries(K6.map((k) => [k, 50])), world: X.create(4100 + i, "wg", "m") };
      const F = { fa: 0.9 + rnd() * 0.2, fd: 0.9 + rnd() * 0.2, fa2: 0.9 + rnd() * 0.2, fd2: 0.9 + rnd() * 0.2, m: 0.97 + rnd() * 0.06, m2: 0.97 + rnd() * 0.06 };
      const base = { xi: X.ourXI(S), teamStr: 50 + rnd() * 20, oppStr: 50 + rnd() * 20, condition: 51 };
      /* 배수 없는 판의 atkW = us0 ÷ (us0 + them0) → us0 / them0 = a0 ÷ (1 − a0) — autoP는 atkW에 비례(천장 밖)라 비로 되읽음 */
      const ab = 40;
      const p0 = E.createMatch(base).autoP("goal", ab), p1 = E.createMatch(Object.assign({ form: F }, base)).autoP("goal", ab);
      const px = Ex.createMatch(Object.assign({ form: F }, base)).autoP("goal", ab);
      /* a0를 모르니 두 식을 같은 r(= us0/them0)로: 엔진의 a0는 p0/(FIN·sc)인데 그 둘도 모름 → r을 소스 줄로 직접 셈 */
      const c = base;
      const r = new Function("c", `${usLine}${themLine} return us0 / them0;`)(c);
      const a0 = r / (r + 1), a1 = (r * F.fa * F.m) / (r * F.fa * F.m + F.fd2);
      if (Math.abs(p1 / p0 - a1 / a0) > 1e-9) bad.push(`#${i}: 비 ${(p1 / p0).toFixed(6)} ≠ ${(a1 / a0).toFixed(6)}`);
      if (Math.abs(px / p0 - a1 / a0) > 1e-9) badX.push(i);
    }
    check(!!usLine && bad.length === 0, `V-3. 🧩 포메이션 배수가 판정에 쓰임 — 무작위 배수 200벌에서 🥅 중심 확률 비 = atkW(form) ÷ atkW(없음) · atkW = us·fa·m ÷ (us·fa·m + them·fd2)` + (bad.length ? `\n     🔴 ${bad.slice(0, 3).join(" · ")}` : "") + (usLine ? "" : "\n     🔴 엔진에서 us0 줄을 못 뜯음"));
    check(badX.length > 0, `변이-NOFD2(\`fd2\` 빼먹기 — 51번 v4-4 #2) → V-3이 빨간불 (${badX.length}/200)`);
  }
  /* V-4 */
  const v4 = (E, Enc) => {
    const X = worldOf(E);
    const bad = [];
    let n = 0, big = 0, normalCut = 0;
    for (let i = 0; i < 300; i++) {
      const pos = ["fw", "wg", "mf", "df"][i % 4];
      const S = { pos, name: "나", stats: Object.fromEntries(K6.map((k) => [k, 56])), world: X.create(4200 + i, pos, "m") };
      const cfg = (onMin) => ({ xi: X.ourXI(S), teamStr: 78, oppStr: 50, condition: 51, onMin });
      E._t.seed(i + 11); E._t.skill = 0.5; Enc._t.seed(i + 11); Enc._t.skill = 0.5;
      const r = E._t.playMatch(cfg(SUB_MIN)), rn = Enc._t.playMatch(cfg(SUB_MIN));
      n += 1;
      const mine = r.cards.filter((c) => c.mine);
      if (Math.abs(r.teamGoals - r.oppGoals) >= 3) big += 1;
      if (r.cards.length !== rn.cards.length) bad.push(`#${i}: 카드 ${r.cards.length} ≠ 끊기 없는 엔진 ${rn.cards.length}`);
      if (mine.some((c) => c.min < SUB_MIN)) bad.push(`#${i}: 투입 전 내 카드`);
      if (mine.length < 1) bad.push(`#${i}: 내 판 0`);
      E._t.seed(i + 11); Enc._t.seed(i + 11);
      const a = E._t.playMatch(cfg(0)), b = Enc._t.playMatch(cfg(0));
      if (a.cards.length < b.cards.length) normalCut += 1;
    }
    return { bad, n, big, normalCut };
  };
  {
    const r4 = v4(load(), load(MUT.NOCUT));
    check(r4.bad.length === 0 && r4.big > 10 && r4.normalCut > 0, `V-4. 🔁 교체 경기(onMin 60) ${r4.n}판(3골 차 ${r4.big}판) — 카드 수 = 끊기를 끈 엔진 · 투입 전 내 카드 0 · 내 판 최소 1 · 교체 아닌 경기는 끊김(${r4.normalCut}판)` + (r4.bad.length ? `\n     🔴 ${r4.bad.slice(0, 3).join(" · ")}` : ""));
    const m4 = v4(load(MUT.CUT), load(MUT.NOCUT));
    check(m4.bad.length > 0, `변이-CUT(교체 경기에도 끊기 남김 — 51번 v4-4 #10) → V-4가 빨간불 (${m4.bad.length})`);
  }
  if (fail === 0) {
    const mc = await v2(PMUT.NOCHANCE);
    check(mc.bad.length > 0 || mc.run3 > 0, `변이-NOCHANCE(기회 주기를 끔 — 연속 ③ · 51번 v4-4 #9) → V-2가 빨간불 (연속 ③ ${mc.run3}번)`);
    const m2 = await v2(PMUT.NOWEAK);
    check(m2.bad.length > 0, `변이-NOWEAK(🦶 약발 조각을 화면에서 뺌 — 51번 v4-4 #8) → V-2가 빨간불 (${m2.bad.length})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
