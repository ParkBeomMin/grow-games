/* ⚽ 더 윙어 II 1막 — 📖 **이야기 · 약속** (20번 §4-6 · 22번 §4-4 · 5 · 12번 §7-2 · 7-4 · 21번 §4 · 5 · 26번 §2)
 *
 *   Y-1  📍 25 · 🔥 29 · 🕯️ 33 · 🏠 32 — **연 이야기의 2장이 고정 주에 못 온 판 0**(🏠은 그 주 🤝 버튼에 가족이 뜸 · 고르면 2장)
 *   Y-2  상한 — 카드 합 ≤ 18 · 무작위(기말고사 포함) ≤ 10 · 이야기 장은 상한에 **막히지 않음**(Y-1이 그 증거)
 *   Y-3  🔥 {ace}의 학교와는 **리그 3라운드(10주) · 8라운드(29주)** 에만 만남 — 세계 160벌(성별 · 포지션 돌림)
 *   Y-4  🔥은 **11주에 한 번만** 판정 — 그때 기록이 「나 M ≥ 1 · {ace} S − M ≤ 1」이면 열리고, 아니면 그 뒤로 조건이 서도 안 열림
 *   Y-5  🔥 기록은 **리그 경기만** — 내 리그 기록(`ind.me`) == 리그 경기 기록의 합(대회 경기는 안 들어감) · 결말이 그 기록의 규칙표대로
 *   Y-6  📋 약속은 **내 판만** 셈 — 살린 순간 = ⚽ 결정 perfect·ok + 🅰️ perfect + 🧱 perfect(내 카드만 · 동료 골의 자동 도움 · 승부차기 제외)
 *        약속의 성패 == 그 주 공식 경기의 살린 순간 ≥ 1 · 경기 화면의 「약속」 줄과 같은 답
 *   + 변이(파일 안): 무작위가 이야기 장보다 먼저(Y-1) · 무작위 상한 12(Y-2) · 에이스 라운드 4(Y-3) · 11주 뒤에도 판정(Y-4) ·
 *                   대회 기록이 🔥에 샘(Y-5) · 동료 판도 셈(Y-6) · 동료 골의 자동 도움을 셈(Y-6)
 * 🎲 정책을 여섯 갈래로(🤝 사람을 2 · 3주 / 30 · 31주 / 한 쪽만 / 아무도) × 시드 — 이야기가 열리는 주가 고르게 퍼지게. ⏱️ 약 4분.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { PAGE_DIR, pageMutsOK, load } = require("./_load.js");
const { boot, runAct, KEYS6 } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const CAP_ALL = 18, CAP_RANDOM = 10;                       // 🔒 12번 §7-2 — 박은 값
const ACE_WEEKS = [10, 29];                                // 🔒 21번 §4-1 — 박은 값
const SECOND = { slot: 25, race: 29, senior: 33, fam: 32 };  // 🔒 12번 §7-4 — 박은 값

const MUT = {
  /* Y-1 — 무작위 이벤트가 이야기 장보다 먼저(같은 주면 무작위가 자리를 먹음) */
  M_ORDER: { "events.js": [[/ {4}const ch = ST \? ST\.chapter\(S, w, dr\) : null;/,
    "    const ch = ST && !(dr.rRoll < TUNE.EV_P && !(w === 16)) ? ST.chapter(S, w, dr) : null;"]] },
  /* Y-2 — 무작위 상한 12 */
  M_CAP: { "events.js": [[/CAP_RANDOM: 10,/, "CAP_RANDOM: 12,"]] },
  /* Y-3 — 에이스 학교를 4라운드로 */
  M_ACE: { "world.js": [[/const ACE_ROUND = 2;/, "const ACE_ROUND = 3;"]] },
  /* Y-4 — 11주 뒤에도 판정 */
  M_LATE: { "story.js": [[/if \(w === TUNE\.RACE_OPEN && raceWouldOpen\(S\)\) \{/, "if (w >= TUNE.RACE_OPEN && raceWouldOpen(S)) {"]] },
  /* Y-5 — 대회 경기 기록이 🔥 리그 기록에 샘 */
  M_CUPLEAK: { "game.js": [[/ {4}R\.apps \+= 1; R\.g \+= info\.myGoals; R\.a \+= info\.assists; R\.d \+= info\.defense;/,
    "    R.apps += 1; R.g += info.myGoals; R.a += info.assists; R.d += info.defense;\n    if (o.t === \"C\") { const c0 = S.world.league.ind.me || (S.world.league.ind.me = [0, 0, 0]); c0[0] += info.myGoals; c0[1] += info.assists; c0[2] += info.defense; }"]] },
  /* Y-6 — 동료 판도 셈 · 동료 골의 자동 도움을 셈 */
  M_ALL: { "live.js": [[/const savedOf = \(cards\) => \(cards \|\| \[\]\)\.filter\(\(c\) => c\.mine\n/, "const savedOf = (cards) => (cards || []).filter((c) => true\n"]] },
  M_AST: { "live.js": [[/const savedOf = \(cards\) => \(cards \|\| \[\]\)\.filter\(\(c\) => c\.mine\n {4}&& \(c\.kind === "goal" \? c\.judge === "perfect" \|\| c\.judge === "ok" : c\.judge === "perfect"\)\)\.length;/,
    "const savedOf = (cards) => (cards || []).filter((c) => (c.mine\n    && (c.kind === \"goal\" ? c.judge === \"perfect\" || c.judge === \"ok\" : c.judge === \"perfect\")) || (!c.mine && c.credit && c.credit.a > 0)).length;"]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}

const POLS = [
  { name: "2·3주", people: { 2: "family", 3: "keeper", 32: "family" } },
  { name: "30·31주", people: { 30: "family", 31: "keeper", 32: "family" } },
  { name: "가족 15주", people: { 15: "family", 32: "family" } },
  { name: "키퍼 20주", people: { 20: "keeper" } },
  { name: "아무도", people: {} },
  { name: "32주 안 고름", people: { 2: "family", 3: "keeper" } },
];
/* 🔒 살린 순간 — 22번 §0-1 · 21번 §5의 정의 그대로(소스에서 안 읽음) */
const savedMine = (cards) => cards.filter((c) => c.mine && (c.kind === "goal" ? c.judge === "perfect" || c.judge === "ok" : c.judge === "perfect")).length;

async function oneRun(seed, pol, muts, extra) {
  const ppl = {}, rec = {};
  let idx = 0;
  /* 🧸 경기 화면은 스텁(\`realScene: false\`) — 이 검사는 경기 화면을 안 봐요(판정 · 기록은 진짜 엔진 · live.js) */
  const env = boot(Object.assign({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], gender: seed % 3 ? "m" : "f", auto: seed % 2 === 0, muts, realScene: false,
    hand: () => [0.2, 0.5, 0.8][seed % 3],
    policy: { tryAt: [0, 50, 101][seed % 3], promise: seed % 5 !== 0,
      home: (S) => {
        ppl[S.week] = (S.__ppl || []).slice();
        const X = env.w.W2World;
        rec[S.week] = { M: X.recOf(S, "me"), S: X.recOf(S, X.aceRow(S).id) };
        const pw = pol.people[S.week];
        if (pw && S.__ppl.indexOf(pw) >= 0) return { k: "people", who: pw };
        if (S.cond < 50) return { k: "rest" };
        return { k: "train", stat: KEYS6[idx++ % 6] };
      } } }, extra || {}));
  const r = await runAct(env);
  const out = { seed, pol: pol.name, S: r.S, done: r.done, stuck: r.stuck, cards: env.seen.card, live: env.seen.live, ppl, rec, w: env.w };
  return out;
}

function audit(R) {
  const S = R.S;
  const miss = [], capBad = [], raceBad = [], leagueBad = [], promBad = [];
  /* 결과 카드(`kind: "result"`)도 같은 `id`를 달아요 — 장 카드만 셉니다 */
  const ch = (id) => R.cards.filter((c) => c.id === id && c.kind === "story").map((c) => c.__week);
  /* Y-1 */
  if (JSON.stringify(ch("s_slot1")) !== "[6]" || JSON.stringify(ch("s_slot2")) !== `[${SECOND.slot}]`) miss.push(`📍 1장 ${ch("s_slot1")} · 2장 ${ch("s_slot2")}`);
  if (ch("s_race1").length && JSON.stringify(ch("s_race2")) !== `[${SECOND.race}]`) miss.push(`🔥 2장 ${ch("s_race2")}`);
  if (ch("s_senior1").length && JSON.stringify(ch("s_senior2")) !== `[${SECOND.senior}]`) miss.push(`🕯️ 2장 ${ch("s_senior2")}`);
  if (ch("s_fam1").length) {
    if ((R.ppl[SECOND.fam] || []).indexOf("family") < 0) miss.push(`🏠 32주 🤝 버튼에 가족이 없음(${(R.ppl[SECOND.fam] || []).join(",")})`);
    const chose = Object.values(POLS.find((p) => p.name === R.pol).people).length && POLS.find((p) => p.name === R.pol).people[SECOND.fam] === "family";
    if (chose && JSON.stringify(ch("s_fam2")) !== `[${SECOND.fam}]`) miss.push(`🏠 2장 ${ch("s_fam2")}`);
  }
  /* Y-2 */
  const shown = R.cards.filter((c) => c.kind === "event" || c.kind === "story").length;
  if (shown > CAP_ALL || (S.evRnd || 0) > CAP_RANDOM || shown !== (S.evCount || 0)) capBad.push(`카드 ${shown}장(evCount ${S.evCount}) · 무작위 ${S.evRnd}`);
  /* Y-4 */
  const r1 = ch("s_race1");
  const at11 = R.rec[11];
  const want = !!at11 && at11.M >= 1 && at11.S - at11.M <= 1;
  if (r1.some((w) => w !== 11)) raceBad.push(`🔥 1장이 ${r1}주`);
  if (at11 && (r1.length > 0) !== want) raceBad.push(`11주 기록 나 ${at11.M} · {ace} ${at11.S} → 열려야 ${want} · 실제 ${r1.length > 0}`);
  const lateTrue = !want && Object.entries(R.rec).some(([w, v]) => +w > 11 && +w <= 33 && v.M >= 1 && v.S - v.M <= 1);
  /* Y-5 */
  const L = S.games.filter((g) => g.t === "L"), C = S.games.filter((g) => g.t === "C");
  const me = S.world.league.ind.me || [0, 0, 0];
  const sum = (arr, k) => arr.reduce((a, g) => a + g[k], 0);
  if (me[0] !== sum(L, "g") || me[1] !== sum(L, "a") || me[2] !== sum(L, "d")) leagueBad.push(`ind.me ${me} ≠ 리그 ${sum(L, "g")}/${sum(L, "a")}/${sum(L, "d")}`);
  const cupStat = sum(C, "g") + sum(C, "a") + sum(C, "d");
  const raceDone = (S.story.done || []).find((d) => d.sid === "race");
  if (raceDone) {
    const X = R.w.W2World;
    const M = X.recOf(S, "me"), Sx = X.recOf(S, X.aceRow(S).id);
    const end = M > Sx ? "ace" : Sx - M <= 1 ? "close" : "far";
    if (raceDone.end !== end) leagueBad.push(`🔥 결말 ${raceDone.end} ≠ 규칙표 ${end}(나 ${M} · {ace} ${Sx})`);
  }
  /* Y-6 */
  let judged = 0;
  for (const m of R.live) {
    if (!m.info || m.week == null) continue;
    const want2 = savedMine(m.info.cards || []);
    if (m.info.saved !== want2) promBad.push(`${m.week}주 경기: saved ${m.info.saved} ≠ 내 판 ${want2}`);
  }
  for (const l of (S.evLog || []).filter((x) => x.k === "promise" && x.ok != null)) {
    judged += 1;
    const g = S.games.find((x) => x.w === l.w && (x.t === "L" || x.t === "C"));
    const m = R.live.find((x) => x.week === l.w && x.info && x.info.promise);
    if (!g) { promBad.push(`${l.w}주 약속인데 그 주 공식 경기가 없음`); continue; }
    if (l.ok !== (g.sv >= 1)) promBad.push(`${l.w}주 약속 ${l.ok} ↔ 살린 순간 ${g.sv}`);
    if (!m || m.info.promise.ok !== l.ok) promBad.push(`${l.w}주 경기 화면의 약속 줄 ${m ? m.info.promise.ok : "없음"} ↔ ${l.ok}`);
  }
  return { miss, capBad, raceBad, leagueBad, promBad, lateTrue, opened: r1.length > 0, cupStat, judged, shown, evRnd: S.evRnd || 0,
    fam: ch("s_fam1").length > 0, senior: ch("s_senior1").length > 0, notMine: R.live.reduce((a, m) => a + ((m.info && m.info.cards) || []).filter((c) => !c.mine && c.credit && c.credit.a > 0).length, 0) };
}

async function sweep(muts, seeds) {
  const res = [];
  for (const seed of seeds) for (const pol of POLS) {
    const R = await oneRun(seed, pol, muts);
    if (!R.done) { res.push({ dead: `${seed}/${pol.name}: ${R.stuck}` }); R.w.close(); continue; }
    res.push(Object.assign({ seed, pol: pol.name }, audit(R)));
    R.w.close();
  }
  return res;
}
const SEEDS = Array.from({ length: 10 }, (_, i) => 3001 + i * 37);
const agg = (res, k) => res.filter((r) => !r.dead).reduce((a, r) => a.concat(r[k].map((x) => `${r.seed}/${r.pol}: ${x}`)), []);

(async () => {
  const base = await sweep(null, SEEDS);
  const dead = base.filter((r) => r.dead);
  const ok = base.filter((r) => !r.dead);
  check(dead.length === 0, `Y-0. 🏁 ${base.length}판(시드 ${SEEDS.length} × 정책 ${POLS.length}) 전부 졸업까지 — 멈춘 판 ${dead.length}` + (dead.length ? `\n     🔴 ${dead.slice(0, 3).map((d) => d.dead).join(" · ")}` : ""));
  const nOpen = { race: ok.filter((r) => r.opened).length, senior: ok.filter((r) => r.senior).length, fam: ok.filter((r) => r.fam).length };
  const m1 = agg(base, "miss");
  check(m1.length === 0 && nOpen.race > 0 && nOpen.senior > 0 && nOpen.fam > 0, `Y-1. 📖 연 이야기의 2장이 고정 주(📍 25 · 🔥 29 · 🕯️ 33 · 🏠 32)에 못 온 판 0 — 연 판 🔥 ${nOpen.race} · 🕯️ ${nOpen.senior} · 🏠 ${nOpen.fam} / ${ok.length} (빠진 장 ${m1.length})`
    + (m1.length ? `\n     🔴 ${m1.slice(0, 3).join(" · ")}` : ""));
  const c1 = agg(base, "capBad");
  const maxShown = Math.max(...ok.map((r) => r.shown)), maxRnd = Math.max(...ok.map((r) => r.evRnd)), atCap = ok.filter((r) => r.evRnd === CAP_RANDOM).length;
  check(c1.length === 0 && atCap > 0, `Y-2. 🧮 상한 — 카드 합 최대 ${maxShown} ≤ ${CAP_ALL} · 무작위(기말고사 포함) 최대 ${maxRnd} ≤ ${CAP_RANDOM} · 그린 장 수 == \`evCount\` · 무작위 상한에 닿은 판 ${atCap}개(상한이 실제로 일함)`
    + (c1.length ? `\n     🔴 ${c1.slice(0, 3).join(" · ")}` : ""));

  /* Y-3 — 세계만(엔진 + world.js) */
  const y3 = (muts) => {
    const E = load();
    const src = (muts && muts["world.js"] || []).reduce((s, [re, rep]) => s.replace(re, rep), fs.readFileSync(path.join(PAGE_DIR, "world.js"), "utf8"));
    const X = new Function("window", `${src}\nreturn window.W2World;`)({ WingerEngine: E });
    const bad = [];
    for (let i = 0; i < 160; i++) {
      const S = { seed: 7000 + i * 13, pos: ["fw", "wg", "mf", "df"][i % 4], gender: i % 2 ? "f" : "m" };
      S.world = X.create(S.seed, S.pos, S.gender);
      const aceW = X.LEAGUE_WEEKS.filter((w) => X.oppOf(S, w).ace);
      if (JSON.stringify(aceW) !== JSON.stringify(ACE_WEEKS)) bad.push(`${S.seed}/${S.gender}: ${aceW}`);
    }
    return bad;
  };
  const b3 = y3(null);
  check(b3.length === 0, `Y-3. 🔥 {ace}의 학교와는 리그 ${ACE_WEEKS.join(" · ")}주에만 만난다 — 세계 160벌(남 · 여 · 포지션 넷) (어긋남 ${b3.length})` + (b3.length ? `\n     🔴 ${b3.slice(0, 3).join(" · ")}` : ""));

  const r4 = agg(base, "raceBad");
  const late = ok.filter((r) => r.lateTrue).length;
  check(r4.length === 0 && nOpen.race > 0 && ok.length - nOpen.race > 0, `Y-4. 🔥 11주에 한 번 판정 — 연 판 ${nOpen.race} · 안 연 판 ${ok.length - nOpen.race}이 전부 11주 기록의 규칙(M ≥ 1 · S − M ≤ 1)대로 · 「11주엔 안 섰다가 뒤에 선」 판 ${late}개도 안 열림 (어긋남 ${r4.length})`
    + (r4.length ? `\n     🔴 ${r4.slice(0, 3).join(" · ")}` : "") + (late === 0 ? "\n     🚧 「뒤에 조건이 선」 판이 없어 「한 번만」은 Y-4 변이로만 확인돼요" : ""));
  const l5 = agg(base, "leagueBad");
  const withCup = ok.filter((r) => r.cupStat > 0).length;
  check(l5.length === 0 && withCup > 0, `Y-5. 🔥 기록은 리그 경기만 — 내 리그 기록 == 리그 경기 기록의 합 · 🔥 결말이 규칙표대로 (대회에서 기록을 낸 판 ${withCup}개 · 어긋남 ${l5.length})` + (l5.length ? `\n     🔴 ${l5.slice(0, 3).join(" · ")}` : ""));
  const p6 = agg(base, "promBad");
  const judged = ok.reduce((a, r) => a + r.judged, 0), notMine = ok.reduce((a, r) => a + r.notMine, 0);
  check(p6.length === 0 && judged >= 20 && notMine > 0, `Y-6. 📋 약속은 내 판만 — 경기마다 살린 순간 == 내 카드의 ⚽ perfect·ok + 🅰️ perfect + 🧱 perfect · 약속 ${judged}건의 성패 == 그 주 살린 순간 ≥ 1 == 화면의 약속 줄 (동료 골에 붙은 내 자동 도움 ${notMine}번은 안 셈 · 어긋남 ${p6.length})`
    + (p6.length ? `\n     🔴 ${p6.slice(0, 3).join(" · ")}` : ""));

  /* ══════════ 🧪 변이 ══════════ */
  if (fail === 0) {
    const few = SEEDS.slice(0, 4);
    const mo = await sweep(MUT.M_ORDER, few);
    check(agg(mo, "miss").length > 0, `변이-M_ORDER(무작위가 이야기 장보다 먼저) → Y-1이 빨간불 (빠진 장 ${agg(mo, "miss").length})`);
    const mc = await sweep(MUT.M_CAP, few);
    check(agg(mc, "capBad").length > 0, `변이-M_CAP(무작위 상한 12) → Y-2가 빨간불 (넘친 판 ${agg(mc, "capBad").length})`);
    check(y3(MUT.M_ACE).length > 0, `변이-M_ACE(에이스 학교를 4라운드로) → Y-3이 빨간불`);
    const ml = await sweep(MUT.M_LATE, few);
    check(agg(ml, "raceBad").length > 0, `변이-M_LATE(11주 뒤에도 판정) → Y-4가 빨간불 (어긋남 ${agg(ml, "raceBad").length})`);
    const mk = await sweep(MUT.M_CUPLEAK, few);
    check(agg(mk, "leagueBad").length > 0, `변이-M_CUPLEAK(대회 기록이 🔥에 샘) → Y-5가 빨간불 (어긋남 ${agg(mk, "leagueBad").length})`);
    const ma = await sweep(MUT.M_ALL, few);
    check(agg(ma, "promBad").length > 0, `변이-M_ALL(동료 판도 셈) → Y-6이 빨간불 (어긋남 ${agg(ma, "promBad").length})`);
    const ms = await sweep(MUT.M_AST, few);
    check(agg(ms, "promBad").length > 0, `변이-M_AST(동료 골의 자동 도움을 셈) → Y-6이 빨간불 (어긋남 ${agg(ms, "promBad").length})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
