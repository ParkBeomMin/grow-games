/* ⚽ 더 윙어 II 1막 — 🅰️ **크레딧 규칙이 세 갈래에서 같은가** (옛 `award-test.js`의 A · B절을 옮김)
 *
 * 🔄 2026-10-02 · inspector — 11번 §6-A 「`award-test.js` 중 `autoMatch` 크레딧 절 → 옮김 · 부문상 판정 절은 버림」.
 *    옛 파일 이름(award — 부문상)은 1막에 맞지 않아 **크레딧만 남긴 이 파일**로 갈랐어요.
 *    🔑 1막에서 이 규칙이 닿는 자리: **리그 개인 기록**(`world.js` `ind` — 🔥 「나 대 세헌」 · 👑 `crown` 부문 1위 ·
 *       📍 {rival} 평점) — 내 경기(`createMatch`) · 남의 경기(`autoMatch`) · 내 상대의 기록(`shareByWeight`)이
 *       **같은 규칙**으로 쌓여야 순위가 공정해요(11번 §7-1 #3 「나와 경쟁자는 같은 자로」).
 *
 * 지키는 것 (값이 아니라 **관계**):
 *   A    🅰️ 전개는 주인공이 도움 · ⚽ 결정은 주인공이 득점자 — **내 카드와 동료 카드가 같은 규칙**
 *   B-0  🎲 픽스처가 골 에이스를 한쪽으로 안 몰아준다(앙상블) — 픽스처 건강
 *   B-1  ② `autoMatch`가 ① `createMatch`와 같은 규칙(도움비 · 득점자 · 도움자 분포의 **차이**)
 *   B-1b ③ `shareByWeight`(**언제나 내 상대 클럽**)도 같은 규칙
 *   B-2  두 갈래 다 득점자는 GOAL_W 순서 · 도움자는 ASSIST_W 순서
 *   B-3  🥵 fatigue가 두 갈래에서 같은 자리(득점자)에 쌓인다
 *   D    🅰️ 도움 축이 fw로 안 넘어갔다(옛 league 33-D — 엔진 `ACE_POOL` 구조의 결론)
 *   + 변이 넷이 각각 빨간불
 *
 * 🌍 **1막 눈금** — 전력 58 : 58 · 동료 58 ± 흔들림 · 컨디션 51(중립) · 내 능력치 56(1막 보통 판 여섯 평균 근처).
 *    밴드는 1막 눈금에서 **다시 재서** 박았습니다(아래 각 상수 옆 실측).
 * 🎲 결정론적(시드 고정). ⏱️ 약 30초.
 */
"use strict";
const { load, mutsOK, xiOf, xiAll, COND_NEUTRAL } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const POS = ["fw", "wg", "mf", "df"];
const share = (o) => { const t = POS.reduce((s, p) => s + o[p], 0); const r = {}; for (const p of POS) r[p] = t ? o[p] / t : 0; return r; };
const gap = (a, b) => Math.max(...POS.map((p) => Math.abs(a[p] - b[p]))) * 100;
const fmt = (o) => POS.map((p) => `${p} ${(o[p] * 100).toFixed(1)}%`).join(" ");
const STR = 58;
const xiNoMe = (base, spin) => xiAll(base, spin);

const MUT_TABLE = {
  "B-①전개주인공이득점자": [[/if \(kind === "goal"\) \{\n {10}if \(chance\(ASSIST_P2\)\) \{/,
    'if (kind === "goal" || true) {\n          if (chance(ASSIST_P2)) {']],
  "B-②마무리를a무게로": [[/scorer = rest\.length \? pickActor\(rest, "goal", hits\)\.who : who;/,
    'scorer = rest.length ? pickActor(rest, "assist", hits).who : who;']],
  "B-③share가전부결정출신": [[/const big = chance\(pBig\);\n {6}const \{ who \} = pickActor\(xi, big \? "goal" : "assist", hits\);/,
    'const big = true;\n      const { who } = pickActor(xi, "goal", hits);']],
  "B-3-fatigue를주인공에게": [[/ {8}hits\.set\(scorer, \(hits\.get\(scorer\) \|\| 0\) \+ 1\);/,
    "        hits.set(who, (hits.get(who) || 0) + 1);"]],
};
{
  const bad = mutsOK(MUT_TABLE);
  check(bad.length === 0, `0. 변이 정규식 ${Object.values(MUT_TABLE).reduce((a, m) => a + m.length, 0)}개가 지금 beta/winger2/engine.js에 전부 걸린다`
    + (bad.length ? `\n     🔴 **안 걸린 것 — 그 변이 검사는 "안 도는" 상태입니다**` + bad.map((b) => `\n       · ${b}`).join("") : ""));
}

/* ══════════ A. 내 카드와 동료 카드가 같은 크레딧 규칙 ══════════ */
{
  const E = load();
  E._t.seed(4242); E._t.skill = 0.5;
  let mineA = 0, mateA = 0, mineG = 0, mateG = 0;
  const bad = [];
  for (let i = 0; i < 6000; i++) {
    const pos = POS[i % 4];
    const r = E._t.playMatch({ xi: xiOf(pos, 56, STR, i), oppName: "상대", teamStr: STR, oppStr: STR, condition: COND_NEUTRAL });
    for (const c of r.cards) {
      if (c.judge !== "perfect") continue;
      if (c.kind === "assist") {
        if (c.assistBy !== c.by) bad.push(`전개 카드인데 주인공(${c.by})이 도움을 못 받았어요 (assistBy=${c.assistBy})`);
        else if (c.goalBy === c.by) bad.push(`전개 카드인데 주인공(${c.by})이 득점자예요`);
        else if (c.mine) mineA += 1; else mateA += 1;
      } else if (c.kind === "goal") {
        if (c.goalBy !== c.by) bad.push(`결정 카드인데 주인공(${c.by})이 득점자가 아니에요 (goalBy=${c.goalBy})`);
        else if (c.mine) mineG += 1; else mateG += 1;
      }
    }
  }
  check(mineA > 200 && mateA > 200 && mineG > 200 && mateG > 200,
    `표본 — 내 카드 전개 ${mineA} 결정 ${mineG} · 동료 카드 전개 ${mateA} 결정 ${mateG} (각 200장 이상 · 1막 눈금 · 6,000경기)`);
  check(bad.length === 0, `A. 🅰️ 전개는 주인공이 도움 · ⚽ 결정은 주인공이 득점자 — **내 카드와 동료 카드가 같은 규칙**`
    + (bad.length ? ` — 어긋남 ${bad.length}건: ${bad[0]}` : ` (어긋남 0건 / ${mineA + mateA + mineG + mateG}장)`));
}

/* ══════════ B-0. 픽스처 건강 — 골 에이스가 fw·wg 반반(머릿수 2 : 2에서 나온 문턱 40~60%) ══════════ */
{
  const E = load();
  const cnt = { fw: 0, wg: 0, mf: 0, df: 0 };
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const cand = xiNoMe(STR, i).filter((x) => ["fw", "wg"].indexOf(x.pos) >= 0);
    const ace = cand.reduce((a, b) => (E.blendOf(a) >= E.blendOf(b) ? a : b), cand[0]);
    cnt[ace.pos] += 1;
  }
  const wgShare = 100 * cnt.wg / N;
  check(wgShare >= 40 && wgShare <= 60, `B-0. 픽스처가 골 에이스를 한쪽으로 안 몰아준다 — 앙상블 ${N}벌에서 wg ${wgShare.toFixed(1)}% (40~60%)`);
  const fc = xiNoMe(STR).filter((x) => ["fw", "wg"].indexOf(x.pos) >= 0);
  const fAce = fc.reduce((a, b) => (E.blendOf(a) >= E.blendOf(b) ? a : b), fc[0]);
  check(fAce.pos === "wg", `B-0-변이. 고정 SPREAD 한 벌은 골 에이스가 **언제나 ${fAce.pos}**다 — 그래서 앙상블을 씁니다`);
}

/* ══════════ B. ① createMatch ↔ ② autoMatch ↔ ③ shareByWeight ══════════
 * 🎚️ 밴드 — **1막 눈금으로 다시 잼**(2026-10-02 · N=12,000 × 시드 3): 아래 출력의 시드별 값이 실측이에요.
 *    옛 70 눈금 밴드(도움비 3.0 · 분포 3.0 · 반복 2.0 %p)를 그대로 두고 1막 기준선이 그 안쪽인지 · 변이가 밖인지 확인했습니다. */
const RATE_BAND = 3.0;    // %p
const DIST_BAND = 3.0;    // %p
const REPEAT_BAND = 2.0;  // %p
const SEEDS3 = [77, 202, 5150];
const N_MATCH = 12000;
const N_REPEAT = 30000;
function viaCreate(E, n, seed) {
  E._t.seed(seed); E._t.skill = 0.5;
  const g = { fw: 0, wg: 0, mf: 0, df: 0 }, a = { fw: 0, wg: 0, mf: 0, df: 0 };
  let goals = 0, withA = 0;
  const counts = [];
  for (let i = 0; i < n; i++) {
    const xi = xiNoMe(STR, i);
    const posOf = new Map(xi.map((x) => [x.name, x.pos]));
    const r = E._t.playMatch({ xi, oppName: "상대", teamStr: STR, oppStr: STR, condition: COND_NEUTRAL });
    let c0 = 0;
    for (const c of r.cards) {
      if ((c.kind !== "goal" && c.kind !== "assist") || c.judge !== "perfect") continue;
      goals += 1; c0 += 1;
      if (c.goalBy) g[posOf.get(c.goalBy)] += 1;
      if (c.assistBy) { withA += 1; a[posOf.get(c.assistBy)] += 1; }
    }
    counts.push(c0);
  }
  return { goals, rate: withA / goals, g: share(g), a: share(a), counts };
}
function viaShare(E, counts, seed) {
  E._t.seed(seed);
  const g = { fw: 0, wg: 0, mf: 0, df: 0 }, a = { fw: 0, wg: 0, mf: 0, df: 0 };
  let goals = 0, withA = 0, spin = 0;
  for (const c of counts) {
    const sp = spin++;
    if (!c) continue;
    for (const go of E.shareByWeight(xiNoMe(STR, sp), c, "goal", 0.5)) {
      goals += 1; g[go.scorer.pos] += 1;
      if (go.assister) { withA += 1; a[go.assister.pos] += 1; }
    }
  }
  return { goals, rate: withA / goals, g: share(g), a: share(a) };
}
function viaAuto(E, n, seed) {
  E._t.seed(seed);
  const g = { fw: 0, wg: 0, mf: 0, df: 0 }, a = { fw: 0, wg: 0, mf: 0, df: 0 };
  let goals = 0, withA = 0;
  for (let i = 0; i < n; i++) {
    const r = E._t.autoMatch({ xiA: xiNoMe(STR, i), xiB: xiNoMe(STR, i + 1e6), strA: STR, strB: STR });
    for (const list of [r.goalsA, r.goalsB]) for (const go of list) {
      goals += 1; g[go.scorer.pos] += 1;
      if (go.assister) { withA += 1; a[go.assister.pos] += 1; }
    }
  }
  return { goals, rate: withA / goals, g: share(g), a: share(a) };
}
function repeatRate(E, n, seed, auto) {
  E._t.seed(seed); E._t.skill = 0.5;
  let two = 0, same = 0;
  for (let i = 0; i < n; i++) {
    if (auto) {
      const r = E._t.autoMatch({ xiA: xiNoMe(STR, i), xiB: xiNoMe(STR, i + 1e6), strA: STR, strB: STR });
      for (const l of [r.goalsA, r.goalsB]) if (l.length === 2) { two += 1; if (l[0].scorer === l[1].scorer) same += 1; }
    } else {
      const r = E._t.playMatch({ xi: xiNoMe(STR, i), oppName: "상대", teamStr: STR, oppStr: STR, condition: COND_NEUTRAL });
      const sc = r.cards.filter((c) => (c.kind === "goal" || c.kind === "assist") && c.judge === "perfect" && c.goalBy).map((c) => c.goalBy);
      if (sc.length === 2) { two += 1; if (sc[0] === sc[1]) same += 1; }
    }
  }
  return { p: same / two, n: two };
}
function crossOf(E, seed) {
  const sd = seed == null ? SEEDS3[0] : seed;
  const C = viaCreate(E, N_MATCH, sd);
  const A = viaAuto(E, N_MATCH, sd);
  const H = viaShare(E, C.counts, sd);
  const d = (X) => ({ rate: 100 * (X.rate - C.rate), g: gap(X.g, C.g), a: gap(X.a, C.a) });
  return { C, A, H, auto: d(A), shr: d(H) };
}
const armOK = (x) => Math.abs(x.rate) <= RATE_BAND && x.g <= DIST_BAND && x.a <= DIST_BAND;
const crossOK = (x) => armOK(x.auto) && armOK(x.shr);
const armTxt = (x) => `도움비 Δ${x.rate >= 0 ? "+" : ""}${x.rate.toFixed(2)}%p · 득점자 Δ${x.g.toFixed(2)}%p · 도움자 Δ${x.a.toFixed(2)}%p`;
{
  const E0 = load();
  const runs = SEEDS3.map((sd) => crossOf(E0, sd));
  const mean = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  const sprd = (f) => `[${runs.map((r) => f(r).toFixed(2)).join(" ")}]`;
  const base = {
    C: runs[0].C, A: runs[0].A, H: runs[0].H,
    auto: { rate: mean((r) => r.auto.rate), g: mean((r) => r.auto.g), a: mean((r) => r.auto.a) },
    shr: { rate: mean((r) => r.shr.rate), g: mean((r) => r.shr.g), a: mean((r) => r.shr.a) },
  };
  check(base.C.goals > 6000 && base.A.goals > 6000 && base.H.goals > 6000,
    `표본 — ① createMatch 골 ${base.C.goals} · ② autoMatch ${base.A.goals} · ③ shareByWeight ${base.H.goals} (1막 눈금 · 시드 ${SEEDS3[0]})`);
  check(armOK(base.auto),
    `B-1. ② autoMatch가 ① 카드와 같은 규칙을 쓴다 — 시드 ${SEEDS3.length}개 평균 ${armTxt(base.auto)} (도움비 ±${RATE_BAND} · 분포 ±${DIST_BAND})`
    + `\n     시드별 도움비 ${sprd((r) => r.auto.rate)} · 득점자 ${sprd((r) => r.auto.g)} · 도움자 ${sprd((r) => r.auto.a)}`
    + `\n     ① create 득점자[${fmt(base.C.g)}] 도움자[${fmt(base.C.a)}]`
    + `\n     ② auto   득점자[${fmt(base.A.g)}] 도움자[${fmt(base.A.a)}]`);
  check(armOK(base.shr),
    `B-1b. ③ shareByWeight(**언제나 내 상대 클럽**)도 같은 규칙을 쓴다 — 시드 ${SEEDS3.length}개 평균 ${armTxt(base.shr)}`
    + `\n     시드별 도움비 ${sprd((r) => r.shr.rate)} · 득점자 ${sprd((r) => r.shr.g)} · 도움자 ${sprd((r) => r.shr.a)}`
    + `\n     ③ share  득점자[${fmt(base.H.g)}] 도움자[${fmt(base.H.a)}]`);
  const orderBad = [];
  for (const [tag, d] of [["create", base.C], ["auto", base.A]]) {
    if (!(d.g.fw > d.g.wg && d.g.fw > d.g.mf && d.g.fw > d.g.df)) orderBad.push(`${tag} 득점자가 GOAL_W 순서가 아니에요`);
    if (!(d.a.wg > d.a.fw && d.a.mf > d.a.fw && d.a.wg > d.a.df)) orderBad.push(`${tag} 도움자가 ASSIST_W 순서가 아니에요`);
  }
  check(orderBad.length === 0, `B-2. 두 갈래 다 득점자는 GOAL_W(fw 최대) · 도움자는 ASSIST_W(wg·mf > fw) 순서다`
    + (orderBad.length ? ` — ${orderBad.join(" · ")}` : ""));
  const rc = repeatRate(load(), N_REPEAT, 77, false);
  const ra = repeatRate(load(), N_REPEAT, 77, true);
  const dRep = 100 * (ra.p - rc.p);
  check(Math.abs(dRep) <= REPEAT_BAND,
    `B-3. 🥵 fatigue가 두 갈래에서 같은 자리에 쌓인다 — 2골 경기의 반복 득점 create ${(rc.p * 100).toFixed(2)}% (n=${rc.n}) vs auto ${(ra.p * 100).toFixed(2)}% (n=${ra.n}) · Δ${dRep >= 0 ? "+" : ""}${dRep.toFixed(2)}%p (±${REPEAT_BAND})`);

  for (const [tag, name] of [["🔴 전개 장면도 주인공이 득점자", "B-①전개주인공이득점자"],
    ["마무리를 g 무게가 아니라 a 무게로 뽑음", "B-②마무리를a무게로"],
    ["🔴 ③ shareByWeight가 모든 골을 ⚽ 결정 출신으로 봄", "B-③share가전부결정출신"]]) {
    const m = crossOf(load(MUT_TABLE[name]));
    const which = [!armOK(m.auto) ? `② ${armTxt(m.auto)}` : null, !armOK(m.shr) ? `③ ${armTxt(m.shr)}` : null].filter(Boolean).join(" / ")
      || `② ${armTxt(m.auto)} / ③ ${armTxt(m.shr)}`;
    check(!crossOK(m), `B-변이. ${tag} → 빨간불 (${which})`);
  }
  {
    const mr = repeatRate(load(MUT_TABLE["B-3-fatigue를주인공에게"]), N_REPEAT, 77, true);
    const d = 100 * (mr.p - rc.p);
    check(Math.abs(d) > REPEAT_BAND, `B-3-변이. 🥵 fatigue를 득점자가 아니라 주인공에게 쌓으면 → 빨간불 (auto ${(mr.p * 100).toFixed(2)}% · Δ${d >= 0 ? "+" : ""}${d.toFixed(2)}%p)`);
  }
}

/* ══════════ D. 🅰️ 도움 축이 fw로 안 넘어갔다 (옛 league 33-D) ══════════
 * `ACE_POOL.assist`에 fw를 넣은 대가로 도움 축이 넘어가면 🔥 「나 대 세헌」의 미드필더 부문(도움)이 무너져요.
 * 값이 아니라 **순서와 배수**를 봅니다 — mf가 2위 포지션보다 이만큼은 앞서야(옛 문턱 2.0배 · 1막 눈금 실측은 출력). */
const ASSIST_LEAD = 2.0;
{
  const E = load();
  E._t.seed(31337);
  const a = { fw: 0, wg: 0, mf: 0, df: 0 };
  for (let i = 0; i < 20000; i++) {
    const r = E._t.autoMatch({ xiA: xiAll(STR, i), xiB: xiAll(STR, i + 1e6), strA: STR, strB: STR });
    for (const l of [r.goalsA, r.goalsB]) for (const o of l) if (o.assister) a[o.assister.pos] += 1;
  }
  const s = share(a);
  const sorted = POS.slice().sort((x, y) => s[y] - s[x]);
  const lead = s.mf / s[sorted[1] === "mf" ? sorted[0] : sorted[1]];
  check(sorted[0] === "mf" && lead >= ASSIST_LEAD, `D. 🅰️ 도움 축은 mf가 1위이고 2위보다 ${lead.toFixed(2)}배 (≥${ASSIST_LEAD}) — ${fmt(s)}`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
