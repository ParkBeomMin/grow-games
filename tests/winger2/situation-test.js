/* ⚽ 더 윙어 II 1막 — 🌦️ **상황 조각** (23번 §2 · 24번 §4-1 · 2 · 26번 §2)
 *
 * 도전 확률 = 50 + 실력(±10) + **그날의 상황**(−12 · −6 · 0 · +6 · +12 중 하나). 상황은 「칸 안에서 움직이는 항」이라
 * 아무리 잘 키워도 확실한 도전은 없어요(원칙 ④). 이 항이 **다른 무엇에도 안 묶여 있는지**를 봅니다:
 *   T-1  다섯 칸 **균등**(각 ⅕) — 시드 · 주 2만 칸에서 칸마다 20% ± 2%p(1σ ≈ 0.28%p · 7σ)
 *   T-2  카드마다 **뜰 때 한 번** — 카드의 상황 = 그 판 · 그 주의 이벤트 난수원 값(`draws`) · 기록(`evLog`)에도 같은 값
 *   T-2b **얼림** — 카드 앞에서 창을 닫고 다시 열면 **같은 카드 · 같은 % · 같은 상황**(굴림이 다시 안 일어남)
 *   T-3  같은 시드에서 **답만 바꿔도** 주마다 상황이 같다(소비가 선택에 안 묶임 — 24번 §0-1)
 *   T-4  **보통 판(늘 안전)은 확률 식에 안 닿는다** — 상황 칸 · 실력 상한을 바꿔도 평가서 · 구간이 **비트 같다**(24번 §4-2)
 *   + 변이: 상황 굴림이 선택 수에 묶임(T-3) · 상황이 컨디션에 샘(T-4 — 「샘」이 있으면 식을 바꾼 판이 갈려요)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { PAGE_DIR, pageMutsOK, mutsOKIn } = require("./_load.js");
const { boot, runAct, lsDump, numbersOf } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const SIT = [-12, -6, 0, 6, 12];     // 🔒 23번 §2 · 24번 §2 — 박은 값
const MUT = {
  /* T-3 — 상황 굴림 자리에 「지금까지 도전한 수」를 섞음(선택에 묶임) */
  M_BOUND: { "events.js": [[/const sr = X\.rngOf\(S\.seed, w, X\.SALT\.sit\);/, "const sr = X.rngOf(S.seed, w + (S.evLog || []).filter((l) => l.k === \"try\").length * 97, X.SALT.sit);"]] },
  /* T-4 — 상황이 컨디션에 샘(카드가 뜰 때마다) */
  M_LEAK: { "events.js": [[/ {4}return \{ rRoll, rPick, u, sit \};/, "    S.cond = Math.max(0, Math.min(100, (S.cond || 0) + sit / 6));\n    return { rRoll, rPick, u, sit };"]] },
  /* T-4의 「식을 바꾼 판」 — 상황 칸을 넓힘 · 실력 상한을 바꿈 */
  F_SIT: { "events.js": [[/SIT: \[-12, -6, 0, 6, 12\],/, "SIT: [-20, -10, 0, 10, 20],"]] },
  F_CAP: { "events.js": [[/SKILL_CAP: 10,/, "SKILL_CAP: 4,"]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const join = (...ms) => { const out = {}; for (const m of ms) for (const [f, l] of Object.entries(m || {})) out[f] = (out[f] || []).concat(l); return out; };

(async () => {
  /* ══════════ T-1 — 균등 ══════════ */
  {
    const W = {};
    new Function("window", `${fs.readFileSync(path.join(PAGE_DIR, "world.js"), "utf8")}\n${fs.readFileSync(path.join(PAGE_DIR, "events.js"), "utf8")}`)(W);
    const EV = W.W2Events;
    const cnt = Object.fromEntries(SIT.map((v) => [v, 0]));
    let n = 0, other = 0;
    for (let seed = 1; seed <= 600; seed++) for (let w = 2; w <= 34; w++) {
      const v = EV.draws({ seed }, w).sit;
      if (v in cnt) cnt[v] += 1; else other += 1;
      n += 1;
    }
    const pcts = SIT.map((v) => 100 * cnt[v] / n);
    check(other === 0 && pcts.every((p) => Math.abs(p - 20) <= 2), `T-1. 🌦️ 상황 다섯 칸이 균등 — ${SIT.map((v, i) => `${v > 0 ? "+" : ""}${v}: ${pcts[i].toFixed(2)}%`).join(" · ")} (칸 ${n.toLocaleString("en-US")} · 표 밖 ${other} · 각 20 ± 2%p)`);
  }

  /* ══════════ T-2 · T-3 — 한 판 · 답만 바꾼 판 ══════════ */
  async function one(seed, policy, muts) {
    const env = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], auto: true, policy, muts });
    const r = await runAct(env);
    const S = r.S;
    const EV = env.w.W2Events;
    const byWeek = {};
    const bad = [];
    for (const c of env.seen.card) {
      if (!(c.opts || []).some((o) => o.k === "try")) continue;
      const want = EV.draws(S, c.w).sit;
      if (c.sit !== want) bad.push(`${c.w}주 ${c.id}: 카드 ${c.sit} ≠ 그 주 ${want}`);
      const o = c.opts.find((x) => x.k === "try");
      if (o.parts[1].v !== c.sit) bad.push(`${c.w}주 ${c.id}: 조각 ${o.parts[1].v} ≠ 카드 ${c.sit}`);
      byWeek[c.w] = c.sit;
    }
    for (const l of S.evLog || []) if (l.sit != null && byWeek[l.w] != null && l.sit !== byWeek[l.w]) bad.push(`${l.w}주 기록 ${l.sit} ≠ 카드 ${byWeek[l.w]}`);
    env.w.close();
    return { S, byWeek, bad, n: Object.keys(byWeek).length };
  }
  const A = await one(7, { tryAt: 0 });
  const B = await one(7, { tryAt: 101, promise: false });
  check(A.n >= 8 && A.bad.length === 0 && B.bad.length === 0, `T-2. 🌦️ 카드 ${A.n + B.n}장의 상황 = **그 판 · 그 주의 이벤트 난수원 값** · 조각 · 기록이 같은 값 (어긋남 ${A.bad.length + B.bad.length})` + (A.bad.length ? `\n     🔴 ${A.bad.slice(0, 3).join(" · ")}` : ""));
  const both = Object.keys(A.byWeek).filter((w) => w in B.byWeek);
  const diff = both.filter((w) => A.byWeek[w] !== B.byWeek[w]);
  check(both.length >= 4 && diff.length === 0, `T-3. 🔁 같은 시드 · **답만 바꾼** 두 판(늘 도전 ↔ 늘 안전) — 둘 다 카드가 뜬 ${both.length}주의 상황이 전부 같다 (어긋남 ${diff.length})`);

  /* ══════════ T-2b — 얼림(카드 앞에서 닫고 다시 열기) ══════════ */
  async function freeze(muts) {
    let first = null;
    const env = boot({ seed: 31, pos: "wg", auto: true, muts, policy: { card: (c) => {
      if (!first && c.kind === "event" && (c.opts || []).some((o) => o.k === "try")) { first = JSON.parse(JSON.stringify(c)); return null; }
      return (c.opts || []).findIndex((o) => o.k === "safe") >= 0 ? c.opts.findIndex((o) => o.k === "safe") : 0;
    } } });
    await runAct(env, { until: () => !!first, stall: 200 });
    const keys = lsDump(env.w);
    env.w.close();
    let again = null;
    const env2 = boot({ seed: 31, pos: "wg", auto: true, muts, keys, policy: { card: (c) => { if (!again) { again = JSON.parse(JSON.stringify(c)); return null; } return 0; } } });
    await runAct(env2, { entry: "continue", until: () => !!again, stall: 200 });
    env2.w.close();
    const t = (c) => c && c.opts.find((o) => o.k === "try");
    return { first, again, same: !!first && !!again && first.id === again.id && first.w === again.w && first.sit === again.sit && t(first).pct === t(again).pct
      && JSON.stringify(t(first).parts) === JSON.stringify(t(again).parts) };
  }
  const fz = await freeze(null);
  check(fz.same, `T-2b. 🧊 카드 앞에서 닫았다 다시 열면 **같은 카드 · 같은 % · 같은 상황** — ${fz.first ? `${fz.first.w}주 ${fz.first.id} · ${fz.first.opts.find((o) => o.k === "try").pct}% · 상황 ${fz.first.sit}` : "카드를 못 만남"} ↔ ${fz.again ? `${fz.again.w}주 ${fz.again.id} · ${fz.again.opts.find((o) => o.k === "try").pct}% · 상황 ${fz.again.sit}` : "다시 열었는데 카드가 없음"}`);

  /* ══════════ T-4 — 보통 판은 확률 식에 안 닿는다 ══════════ */
  const SAFE = { tryAt: 101, promise: false, flag: false };
  async function usual(muts, seeds) {
    const out = [];
    for (const seed of seeds) {
      const env = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], gender: seed % 2 ? "f" : "m", auto: true, policy: SAFE, muts });
      const r = await runAct(env);
      out.push(JSON.stringify([numbersOf(r.S).sheet, r.S.ending && r.S.ending.id, r.S.stats, r.S.record]));
      env.w.close();
    }
    return out;
  }
  const SEEDS = [101, 202, 303, 404, 505, 606];
  const base = await usual(null, SEEDS);
  const fsit = await usual(MUT.F_SIT, SEEDS);
  const fcap = await usual(MUT.F_CAP, SEEDS);
  const okT4 = (x, y) => x.every((v, i) => v === y[i]);
  check(okT4(base, fsit) && okT4(base, fcap), `T-4. 🛡️ **보통 판(늘 안전)은 확률 식에 안 닿는다** — 상황 칸을 ±20으로 · 실력 상한을 4로 바꾼 판과 평가서 · 엔딩 · 능력치 · 기록이 비트 같다 (판 ${SEEDS.length}개 × 둘)`);
  /* 🧪 「샘」이 있으면 식을 바꾼 판이 갈려야 — 그래야 T-4가 무언가를 재는 거예요 */
  if (okT4(base, fsit)) {
    const leakBase = await usual(MUT.M_LEAK, SEEDS);
    const leakSit = await usual(join(MUT.M_LEAK, MUT.F_SIT), SEEDS);
    check(!okT4(leakBase, leakSit), `변이-M_LEAK(상황이 컨디션에 샘) → T-4가 빨간불 (식을 바꾼 판과 갈린 판 ${leakBase.filter((v, i) => v !== leakSit[i]).length}/${SEEDS.length})`);
  }
  if (both.length && diff.length === 0) {
    const A2 = await one(7, { tryAt: 0 }, MUT.M_BOUND);
    const B2 = await one(7, { tryAt: 101, promise: false }, MUT.M_BOUND);
    const b2 = Object.keys(A2.byWeek).filter((w) => w in B2.byWeek);
    check(b2.some((w) => A2.byWeek[w] !== B2.byWeek[w]), `변이-M_BOUND(상황 굴림이 도전 수에 묶임) → T-3이 빨간불 (갈린 주 ${b2.filter((w) => A2.byWeek[w] !== B2.byWeek[w]).length}/${b2.length})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
