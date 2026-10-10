/* ⚽ 더 윙어 II 1막 v4 — 0️⃣ **효과 0 = 옛 판** (46번 §4 #1 · 47번 · J13)
 *
 * v4는 「넘긴다(효과 0)」 칸을 없애고 셋~넷(🎲 크게 · 🎲 작게 · 🌿 확정 · 💬 이야기)으로 바꿨어요. 확정에도 몫이 있어서 「늘 확정」 손은
 * 옛 「늘 넘긴다」 판과 같을 수 없어요(J13 — 그래서 pair R8 · situation T-4의 전제가 바뀜). 46번 §4 #1은 그 대신
 * **몫을 안 받는 검사용 손**으로 「이벤트 판이 나머지 판(경기 · 훈련 · 난수 줄기)을 하나도 안 흔든다」를 봅니다.
 *   Z-1  같은 시드 300판 — 옛 판(v3 · 커밋 `ff41d1f`를 `git archive`로 푼 사본 · 「늘 넘긴다」) ≡ 지금 판(「늘 🌿 · 💬를 고르되 몫은 0」 — 검사 손이
 *        고르기 직전에 그 칸을 옛 「넘긴다」 모양으로 바꿈) — 능력치 · 컨디션 · 🤝 · 기록 · 경기마다 · 평가서 칸 · 합계 · 이벤트 기록 · 이야기 결말 · 순위표 비트 같음
 *        (구간 · 엔딩 · 업적은 T가 바뀌어 뺌 — 47번 §1)
 *   + 변이(46번 §4 #1): 확정에 몫을 남김(검사 손이 바꾼 칸에 🫀 +3을 다시 붙임) → 빨간불
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 15분
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");
const { ROOT } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const OLD = "ff41d1f";   // 🔒 v3 커밋(44번 판) — 박은 값
const N = Number(process.env.Z_N) || 300;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "w2zero-"));
execSync(`git archive ${OLD} beta | tar -x -C ${tmp}`, { cwd: ROOT });
const OLD_DIR = path.join(tmp, "beta", "winger2");

const numbers = (S) => ({
  stats: S.stats, cond: S.cond, trust: S.trust, record: S.record, weak: [S.weak, S.weakXp],
  games: S.games.map((g) => [g.w, g.t, g.gf, g.ga, g.res, g.g, g.a, g.d, g.r, g.sv]),
  sheet: S.sheet.cols.map((c) => c.v).concat([S.sheet.total]), mid: (S.mid || []).map((m) => [m.week, m.total]),
  evLog: (S.evLog || []).map((l) => [l.w, l.id, l.k, l.pct, l.ok, l.sit]), story: (S.story.done || []).map((d) => [d.sid, d.end, d.week]),
  table: S.world.league.table, cup: [S.world.cup.stage, S.world.cup.out, S.world.cup.done],
});
/* 옛 판 — 「늘 넘긴다」(문 깃발은 받음 — 둘 다 수치 0) */
const OLD_POL = { tryAt: 101, promise: false, flag: true };
/* 지금 판 — 🌿 · 💬 칸을 고르고, 고르기 직전에 그 칸을 옛 「넘긴다」로(몫 0) */
function zeroHand(env, keepFx) {
  const EV = env.w.W2Events;
  const raw = EV.answer;
  EV.answer = (S, i) => {
    const o = S.ev && S.ev.opts && S.ev.opts[i];
    if (o && (o.k === "cert" || o.k === "talk")) {
      S.ev.opts = S.ev.opts.slice();
      S.ev.opts[i] = keepFx ? { k: "cert", label: o.label, fx: { cond: 3 } } : { k: "safe", label: o.label };
    }
    return raw(S, i);
  };
}
const NEW_POL = { card: (c) => {
  if (!c.opts || !c.opts.length) return 0;
  const f = c.opts.findIndex((x) => x.k === "flag");
  if (f >= 0) return f;
  const z = c.opts.findIndex((x) => x.k === "cert" || x.k === "talk");
  return z >= 0 ? z : c.opts.findIndex((x) => x.k === "ok") >= 0 ? c.opts.findIndex((x) => x.k === "ok") : 0;
} };
async function one(seed, side, keepFx) {
  const pos = ["fw", "wg", "mf", "df"][seed % 4];
  const env = side === "old" ? boot({ seed, pos, auto: true, realScene: false, pageDir: OLD_DIR, policy: OLD_POL })
    : boot({ seed, pos, auto: true, realScene: false, policy: NEW_POL });
  if (side === "new") zeroHand(env, keepFx);
  const r = await runAct(env);
  const out = r.done ? numbers(r.S) : null;
  env.w.close();
  return out;
}
async function z1(n, keepFx) {
  let same = 0, dead = 0;
  const bad = [];
  for (let i = 0; i < n; i++) {
    const seed = 60001 + i * 17;
    const a = await one(seed, "old"), b = await one(seed, "new", keepFx);
    if (!a || !b) { dead += 1; continue; }
    const diff = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    if (diff.length) bad.push(`#${seed}: ${diff.join(",")}`); else same += 1;
  }
  return { same, dead, bad };
}
(async () => {
  const r = await z1(N, false);
  check(r.same === N && r.dead === 0, `Z-1. 0️⃣ 옛 판(v3 「늘 넘긴다」) ≡ 지금 판(몫을 안 받는 손) — ${r.same} / ${N}판 비트 같음(멈춘 판 ${r.dead})` + (r.bad.length ? `\n     🔴 ${r.bad.slice(0, 3).join(" · ")}` : ""));
  if (fail === 0) {
    const m = await z1(10, true);
    check(m.same < 10, `변이-KEEPFX(확정에 몫을 남김 — 🫀 +3) → Z-1이 빨간불 (같은 판 ${m.same} / 10)`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
