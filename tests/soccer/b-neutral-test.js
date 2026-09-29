/* 🏅 B 켠 것 == 끈 것 — 업적·필름은 경기력에 0 (스펙 §0 지킬 것 ② · §2-6 · §9-A 2)
 *
 * 업적(achieve.js)과 필름(film.js)은 「해낸 적이 있다」는 기록일 뿐이라, 켜든 끄든 **같은 커리어**가 나와야 해요.
 * 판정 함수는 세이브를 **읽기만** 하고 난수를 안 써요(스펙 §2-6).
 *
 * 지키는 것
 *   같은 시드 · 같은 버튼 순서 · 같은 이벤트 답(정책 난수로 아무 칸 — 이벤트는 둘 다 있어요)으로
 *   베타(전부) vs 베타에서 achieve.js·film.js를 뺀 판을 굴려,
 *   ① 걸음마다 핵심 칸 · 결산마다 세이브 전체(ach·rep·시각만 뺌 — evLog·이야기·proLog까지 같아야 해요)가 같다
 *   ② 명예의 전당 항목(업적이 만드는 rep·achN·style·best와 시각만 뺌)이 같다 — careerScore · 수상 포함
 *   ③ 게임 난수를 먹은 횟수가 같다
 *
 * 변이 — B1 업적 판정(check) 안에서 Math.random()을 한 번 부른다(스펙 §9-A 2가 적은 변이) → 빨간불
 *
 * 측정 조건: 게임 = Math.random(시드) · 이벤트 = seed ^ 0x9E3779B9 · 정책 = seed ^ 0x85EBCA6B · 연출은 난수 없는 빈 연출.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const path = require("path");
const H = require("./_w1.js");
H.guardExit();

const MUT = { B1: { file: "achieve.js", muts: [[/function check\(when\) \{\n    if \(!S\) return \[\];/, "function check(when) {\n    if (!S) return [];\n    Math.random();"]] } };
const DROP_B = ["achieve.js", "film.js"];
const KEEP_OUT = ["ach", "rep", "savedAt", "betaAt"];          // B가 만드는 칸 + 시각
const HOF_B = ["rep", "achN", "style", "best", "id", "at", "sent"];

const JOB = H.jobArg();
if (JOB) {
  const j = JOB;
  const P = H.boot({ which: "beta", seed: j.seed, drop: j.off ? DROP_B : [], muts: j.mut ? { "achieve.js": MUT[j.mut].muts } : null });
  const D = H.makeDriver(P, { pos: j.pos, market: j.market, name: "비교", ev: H.EV.random, move: 0.35, ext: true, wild: "go" });
  const steps = [], cps = [];
  let pre = H.md5(H.core(P.S()));
  D.run({
    max: 90000,
    until: j.until ? (st) => st.phase === "soccer-pro" && st.proYear >= j.until && P.active() === "screen-career" : null,
    onStep: (what) => {
      steps.push(pre);
      if (what === "season" || what === "debut" || what === "retire") cps.push({ tag: `${what}@${steps.length}`, h: H.md5(H.snap(P.S(), KEEP_OUT)) });
      pre = H.md5(H.core(P.S()));
    },
  });
  cps.push({ tag: "end", h: H.md5(H.snap(P.S(), KEEP_OUT)) });
  let hof = [];
  try { hof = JSON.parse(P.w.localStorage.getItem("grow-hof-v1") || "[]").filter((e) => e.game === "soccer"); } catch { hof = []; }
  const hofOld = hof.map((e) => { const c = Object.assign({}, e); for (const k of HOF_B) delete c[k]; return c; });
  cps.push({ tag: "hof", h: H.md5(JSON.stringify(hofOld)) });
  const out = { steps, cps, log: D.log, errors: P.errors, rng: P.calls.game, evs: D.evs.length,
    score: hof.length ? hof[0].score : null, ach: hof.length ? hof[0].achN : null, B: !!P.w.WingerAch };
  P.close();
  H.emit(out);
} else {
  let bad = 0, dead = 0;
  const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
  (async () => {
    console.log("=== 0. 변이 등록 ===");
    const miss = H.mutMisses(MUT);
    check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);
    const base = [{ seed: 515151, pos: "wg", market: 2 }, { seed: 626262, pos: "df", market: 4, until: 6 }];
    const jobs = [];
    for (const b of base) jobs.push(Object.assign({ off: false }, b), Object.assign({ off: true }, b));
    if (!miss.length) jobs.push({ seed: 515151, pos: "wg", market: 2, until: 2, off: true }, { seed: 515151, pos: "wg", market: 2, until: 2, off: false, mut: "B1" });
    const R = await H.runJobs(path.resolve(__filename), jobs, Number(process.env.W1_PAR) || 2);
    const same = (x, y) => x.steps.length === y.steps.length && x.steps.every((h, i) => h === y.steps[i])
      && x.cps.length === y.cps.length && x.cps.every((c, i) => c.h === y.cps[i].h);
    const where = (x, y) => {
      const n = Math.min(x.steps.length, y.steps.length);
      for (let i = 0; i < n; i++) if (x.steps[i] !== y.steps[i]) return `걸음 ${i} [${x.log.slice(Math.max(0, i - 2), i + 1).join(" ")}]`;
      const k = x.cps.findIndex((c, i) => !y.cps[i] || c.h !== y.cps[i].h);
      return k >= 0 ? `체크포인트 ${x.cps[k].tag}` : "길이";
    };
    console.log("=== ①②③ B 켠 판 == 끈 판 ===");
    for (let i = 0; i < base.length; i++) {
      const on = R[2 * i], off = R[2 * i + 1];
      const label = `${base[i].pos} · 유스 ${base[i].market} · 시드 ${base[i].seed}${base[i].until ? ` (${base[i].until}시즌까지)` : " (은퇴까지)"}`;
      if (on.dead || off.dead) { dead++; console.log(`💥 ${label} — ${(on.dead || off.dead).slice(0, 300)}`); continue; }
      check(on.B && !off.B, `${label} — 켠 판에 업적 모듈 있음 · 끈 판에 없음`);
      check(same(on, off), `${label} — 걸음 ${on.steps.length} · 결산 ${on.cps.length - 2} · 답한 이벤트 ${on.evs}건 · 점수 ${on.score} · 켠 판 업적 ${on.ach}개${same(on, off) ? "" : ` — ${where(on, off)}에서 갈라짐`}`);
      check(on.rng === off.rng, `${label} — 게임 난수 ${on.rng} / ${off.rng}`);
      check(on.errors.concat(off.errors).length === 0, `${label} — 페이지 안 예외 0${on.errors.concat(off.errors).length ? ` — ${on.errors.concat(off.errors)[0].slice(0, 200)}` : ""}`);
    }
    console.log("=== 변이 검증 ===");
    if (miss.length) check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)");
    else {
      const off = R[jobs.length - 2], mut = R[jobs.length - 1];
      if (off.dead || mut.dead) { dead++; console.log(`💥 B1 — ${(off.dead || mut.dead).slice(0, 300)}`); }
      else check(!same(off, mut), `B1 업적 판정 안에서 Math.random() 한 번 → 빨간불 (${same(off, mut) ? "같음 — 아무것도 안 지키고 있어요" : where(off, mut) + "에서 갈라짐"})`);
    }
    console.log(dead ? `\n💥 죽은 판 ${dead}개` : bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
    process.exit(dead ? 2 : bad ? 1 : 0);
  })().catch(H.die);
}
