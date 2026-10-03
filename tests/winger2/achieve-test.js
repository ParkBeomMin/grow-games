/* ⚽ 더 윙어 II 1막 — 🏅 **업적** (24번 §4-5 · R10 · 12번 §7-5 · 31번 §5 · 26번 §2 · §5)
 *
 *   AC-1  문턱 — `rested` = 대회 첫 경기 컨디션 **≥ 80**(79는 아님) · `allc` = 여섯 모두 **≥ 56**(55.9는 아님) — 박은 값(24번 §2)
 *   AC-1b `rested`가 읽는 값 = **대회 첫 경기에 실제로 넘긴 컨디션**(조별 1차전의 `condition` · 둘째 경기부터는 +10 회복이 붙어 달라짐)
 *   AC-2  🌍 진짜 세계에서 닿음 — 정책 다섯(잘함 · 보통-🎯 · 대충 · 쉼 · 완벽-🎯)을 돌려 가며 **흔한 · 드문 업적 18개가 전부** 닿을 때까지(예산 40판)
 *   AC-3  🧪 길이 이어졌나 — 귀한 · 전설 10개(`race` · `cs5` · `r9` · `g7` · `league` · `a7` · `wall3` · `crown` · `hat` · `cup`)는
 *         진짜 세계에서 먼저 찾고, 못 찾으면 **상대를 약하게 만든 세계**(검사만의 변이)에서라도 닿아야 — 세이브 칸 이름 · 기록 경로가
 *         끊기면(오타 · 안 쓰는 칸) 어떤 판에서도 못 땁니다. 🔑 「얼마나 자주」는 balancer 실측(24번 R10 · 84,000판)의 몫이에요
 *   AC-4  🔔 알림 — 엔딩 때 딴 업적의 알림은 **필름 뒤로**(엔딩 장면 위에 안 겹침) · 판정은 엔딩 전 그대로(엔딩 장면이 뜰 때 이미 세이브에 있음)
 *         · 알림 수 == 딴 업적 수(하나씩) · **엔딩 장면 · 필름 앞에서 닫았다 이어해도** 두 판의 알림 합 == 딴 업적 수
 *   + 변이(파일 안)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 3분
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { PAGE_DIR, pageMutsOK, mutsOKIn } = require("./_load.js");
const { boot, runAct, lsDump } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const RESTED = 80, ALLC = 56;                       // 🔒 24번 §2 — 박은 값
const REAL = ["grad", "story1", "family", "g1", "winner", "next", "number", "mom10", "s1", "onething", "rested", "door", "allc", "gift", "longshot", "promise3", "qf", "pk"];
const RARE = ["race", "cs5", "r9", "g7", "league", "a7", "wall3", "crown", "hat", "cup"];
const DEVICE = ["trio", "all7", "six"];             // 기기 장부 업적 — 판 하나로 못 잼(24번 R10 밖 · 첫 베타는 지호만 열려 도윤 · 하람 문이 없음)

const ASRC = fs.readFileSync(path.join(PAGE_DIR, "achieve.js"), "utf8");
const achOf = (src) => { const W = { WingerEngine: { K: { BLEND: { fw: ["shoot"], wg: ["dribble"], mf: ["pass"], df: ["defense"] } } } }; new Function("window", src)(W); return W.W2Ach; };
/* 🧪 검사만의 세계 — 상대 학교를 모두 20으로(우리 58) · 난수 소비 수는 그대로 */
const FAV = { "world.js": [[/LEAGUE_STR: \[52, 55, 58, 61, 66\],/, "LEAGUE_STR: [20, 20, 20, 20, 20],"], [/CUP_SEED: \[70, 78\],/, "CUP_SEED: [20, 21],"], [/CUP_REST: \[50, 69\],/, "CUP_REST: [20, 21],"]] };
const MUT_A = {
  RESTED90: [[/RESTED: 80,/, "RESTED: 90,"]],
  ALLC60: [[/ALLC: 56,/, "ALLC: 60,"]],
};
const MUT = {
  S_AT: { "achieve.js": [[/S_AT: 88,/, "S_AT: 101,"]] },
  HAT: { "achieve.js": [[/test: \(S\) => \(rec\(S\)\.hat \|\| 0\) >= 1 \},/, "test: (S) => (rec(S).hatt || 0) >= 1 },"]] },
  CUPLAST: { "game.js": [[/if \(S\.cupGames === 0\) S\.cupFirstCond = cond;/, "S.cupFirstCond = cond;"]] },
  NOW: { "game.js": [[/S\.achPend = \(Array\.isArray\(S\.achPend\) \? S\.achPend : \[\]\)\.concat\(window\.W2Ach\.check\(S\)\);/, "announce(window.W2Ach.check(S));"]] },
  NOSAVE: { "game.js": [[/(S\.achPend = \(Array\.isArray\(S\.achPend\) \? S\.achPend : \[\]\)\.concat\(window\.W2Ach\.check\(S\)\);)\n {8}save\(\);/, "$1"]] },
};
{
  const bad = mutsOKIn(ASRC, MUT_A, "achieve.js").concat(pageMutsOK(MUT), pageMutsOK({ FAV }));
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
{
  const A = achOf(ASRC);
  const ids = A.LIST.map((d) => d.id);
  const mine = REAL.concat(RARE, DEVICE);
  check(ids.length === 31 && mine.every((id) => ids.indexOf(id) >= 0) && ids.every((id) => mine.indexOf(id) >= 0), `0b. 🏅 업적 31개 = 판에서 따는 28(흔함·드묾 ${REAL.length} + 귀함·전설 ${RARE.length}) + 기기 장부 3 — 검사의 목록과 소스 목록이 같다`);
}

/* ══════════ AC-1 ══════════ */
function ac1(A) {
  const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
  const base = () => ({ pos: "wg", week: 36, stats: Object.fromEntries(K6.map((k) => [k, 70])), record: {}, world: { cup: { stage: 0 } }, story: { done: [] }, evLog: [] });
  const got = (S) => A.check(S);
  const r79 = got(Object.assign(base(), { cupFirstCond: RESTED - 1 })).indexOf("rested") >= 0;
  const r80 = got(Object.assign(base(), { cupFirstCond: RESTED })).indexOf("rested") >= 0;
  const rNull = got(Object.assign(base(), { cupFirstCond: null })).indexOf("rested") >= 0;
  const lowOne = (v) => Object.assign(base(), { stats: Object.assign(Object.fromEntries(K6.map((k) => [k, 70])), { speed: v }) });
  const a559 = got(lowOne(ALLC - 0.1)).indexOf("allc") >= 0;
  const a56 = got(lowOne(ALLC)).indexOf("allc") >= 0;
  return { ok: !r79 && r80 && !rNull && !a559 && a56, r79, r80, a559, a56 };
}
const c1 = ac1(achOf(ASRC));
check(c1.ok, `AC-1. 📏 \`rested\` — 대회 첫 경기 컨디션 ${RESTED - 1} → ${c1.r79 ? "땀" : "못 땀"} · ${RESTED} → ${c1.r80 ? "땀" : "못 땀"} · 기록 없음 → 못 땀 / \`allc\` — 한 칸 ${ALLC - 0.1} → ${c1.a559 ? "땀" : "못 땀"} · ${ALLC} → ${c1.a56 ? "땀" : "못 땀"}`);
check(!ac1(achOf(ASRC.replace(MUT_A.RESTED90[0][0], MUT_A.RESTED90[0][1]))).ok, `변이-RESTED90(\`rested\` 문턱 90 — 22번의 옛 값) → AC-1이 빨간불`);
check(!ac1(achOf(ASRC.replace(MUT_A.ALLC60[0][0], MUT_A.ALLC60[0][1]))).ok, `변이-ALLC60(\`allc\` 문턱 60) → AC-1이 빨간불`);

const POLS = [
  { name: "잘함", hand: 0.85, policy: { tryAt: 50 } },
  { name: "보통-🎯", hand: 0.5, policy: { tryAt: 50, train: "focus" } },
  { name: "대충", hand: 0.2, policy: { tryAt: 0, restTh: 30 } },
  { name: "쉼", hand: 0.6, policy: { tryAt: 50, restTh: 90 } },
  { name: "완벽-🎯", hand: 1.0, policy: { tryAt: 50, train: "focus" } },
];
/* 닿을 때까지 — 돌린 판 수 · 판마다 딴 것 · 닿은 곳(진짜 / 약한 세계) */
async function scan(targets, budget, muts, opt) {
  const want = new Set(targets);
  const where = {};
  let runs = 0, cupBad = [];
  for (let i = 0; i < budget && want.size; i++) {
    const fav = opt && opt.fav ? true : opt && opt.mixed ? i % 3 === 2 : false;
    const p = POLS[(opt && opt.pol != null) ? opt.pol : i % POLS.length];
    const seed = 21000 + i * 71;
    const pos = ["fw", "wg", "mf", "df", "fw", "df", "wg"][i % 7];
    const allM = Object.assign({}, muts || {});
    if (fav) for (const [f, l] of Object.entries(FAV)) allM[f] = (allM[f] || []).concat(l);
    const env = boot({ seed, pos, gender: i % 2 ? "f" : "m", realScene: false, hand: () => p.hand, policy: p.policy, muts: allM });
    const r = await runAct(env);
    runs += 1;
    for (const id of Object.keys((r.S && r.S.ach) || {})) if (want.has(id)) { want.delete(id); where[id] = `${fav ? "🧪" : "🌍"} ${p.name} ${pos} #${seed}`; }
    /* AC-1b 재료 — 대회 첫 경기에 넘긴 컨디션 */
    if (opt && opt.cupProbe && r.S) {
      const first = env.seen.live.find((m) => m.week === 20);
      const second = env.seen.live.filter((m) => m.week === 20)[1];
      if (first) cupBad.push({ got: r.S.cupFirstCond, want: first.cfg.condition, second: second ? second.cfg.condition : null });
    }
    env.w.close();
  }
  return { missing: [...want], where, runs, cupBad };
}

(async () => {
  /* ══════════ AC-1b ══════════ */
  {
    const probe = async (muts) => (await scan(["__none"], 3, muts, { cupProbe: true, pol: 3 })).cupBad;
    const b = await probe(null);
    const ok = b.length === 3 && b.every((x) => x.got === x.want) && b.some((x) => x.second != null && x.second !== x.want);
    check(ok, `AC-1b. 🫀 \`rested\`가 읽는 값 == 대회 첫 경기에 실제로 넘긴 컨디션 — ${b.map((x) => `${x.got}=${x.want}(둘째 경기 ${x.second})`).join(" · ")}`);
    const m = await probe(MUT.CUPLAST);
    check(m.some((x) => x.got !== x.want), `변이-CUPLAST(마지막 대회 경기 컨디션을 적음) → AC-1b가 빨간불 (${m.map((x) => `${x.got}≠${x.want}`).join(" · ")})`);
  }

  /* ══════════ AC-2 · AC-3 ══════════ */
  const a2 = await scan(REAL.concat(RARE), 40, null);
  const realMiss = a2.missing.filter((id) => REAL.indexOf(id) >= 0);
  check(realMiss.length === 0, `AC-2. 🌍 진짜 세계 · 정책 다섯을 돌려 ${a2.runs}판 — 흔한 · 드문 업적 ${REAL.length}개가 전부 닿았다` + (realMiss.length ? `\n     🔴 못 닿음: ${realMiss.join(" · ")}` : "")
    + `\n     ${REAL.map((id) => `${id} ← ${a2.where[id] || "—"}`).join(" · ")}`);
  const rareLeft = a2.missing.filter((id) => RARE.indexOf(id) >= 0);
  const a3 = rareLeft.length ? await scan(rareLeft, 24, null, { fav: true }) : { missing: [], where: {}, runs: 0 };
  const whereAll = Object.assign({}, a2.where, a3.where);
  check(a3.missing.length === 0, `AC-3. 🧪 귀한 · 전설 ${RARE.length}개의 길이 이어져 있다 — 진짜 세계에서 ${RARE.length - rareLeft.length}개 · 약한 세계에서 ${rareLeft.length - a3.missing.length}개(${a3.runs}판)` + (a3.missing.length ? `\n     🔴 못 닿음: ${a3.missing.join(" · ")}` : "")
    + `\n     ${RARE.map((id) => `${id} ← ${whereAll[id] || "—"}`).join(" · ")}`);
  {
    const m1 = await scan(["s1", "onething"], 4, MUT.S_AT, { pol: 1 });
    check(m1.missing.length === 2, `변이-S_AT(S 문턱 101 — 닿을 수 없음) → AC-2가 빨간불 (못 닿음 ${m1.missing.join(" · ")} · ${m1.runs}판)`);
    const m2 = await scan(["hat"], 8, MUT.HAT, { fav: true, pol: 4 });
    check(m2.missing.length === 1, `변이-HAT(\`hat\`이 없는 칸 \`rec.hatt\`를 읽음) → AC-3이 빨간불 (${m2.runs}판)`);
  }

  /* ══════════ AC-4 — 알림 ══════════ */
  async function alerts(muts) {
    const one = boot({ seed: 777, pos: "wg", auto: true, realScene: false, muts });
    const r = await runAct(one);
    const S = r.S;
    const seen = one.seen;
    one.w.close();
    const iSheet = seen.order.lastIndexOf("sheet:final");
    const finals = seen.flash.filter((f) => /^🏅/.test(f.t)).filter((f) => seen.order.indexOf(f.after) >= 0 && seen.order.lastIndexOf(f.after) >= iSheet);
    const early = finals.filter((f) => f.after !== "film");
    const medals = seen.flash.filter((f) => /^🏅/.test(f.t)).length;
    const nAch = Object.keys(S.ach || {}).length;
    const endAch = (seen.ending[0] && seen.ending[0].__ach) || [];
    const atEnd = ["grad", "next", "door"].filter((id) => (S.ach || {})[id]);
    const judgedBefore = atEnd.every((id) => endAch.indexOf(id) >= 0 && S.ach[id].w === 36);
    /* 엔딩 장면 · 필름 앞에서 닫고 이어하기 — 두 자리 */
    const reopen = async (hang) => {
      const A1 = boot({ seed: 777, pos: "wg", auto: true, realScene: false, muts, policy: { [hang]: true } });
      await runAct(A1, { until: (Sx, e) => (hang === "filmHang" ? e.seen.film.length : e.seen.ending.length) >= 1, stall: 300 });
      const n1 = A1.seen.flash.filter((f) => /^🏅/.test(f.t)).length;
      const keys = lsDump(A1.w);
      A1.w.close();
      const B1 = boot({ seed: 777, pos: "wg", auto: true, realScene: false, muts, keys });
      const rb = await runAct(B1, { entry: "continue" });
      const n2 = B1.seen.flash.filter((f) => /^🏅/.test(f.t)).length;
      const nAch2 = Object.keys((rb.S && rb.S.ach) || {}).length;
      B1.w.close();
      return { n1, n2, nAch2, done: rb.done };
    };
    const atEnding = await reopen("endingHang"), atFilm = await reopen("filmHang");
    return { early, finals, medals, nAch, atEnd, judgedBefore, atEnding, atFilm, done: r.done && atEnding.done && atFilm.done };
  }
  const al = await alerts(null);
  check(al.done && al.finals.length > 0 && al.early.length === 0, `AC-4a. 🔔 엔딩 때 딴 업적 ${al.finals.length}개의 알림이 전부 **필름 뒤**에 떴다(엔딩 · 문 · 평가서 위에 뜬 것 ${al.early.length})` + (al.early.length ? `\n     🔴 ${al.early.map((f) => `${f.t} ← ${f.after} 뒤`).join(" · ")}` : ""));
  check(al.judgedBefore && al.atEnd.length > 0, `AC-4b. ⏱️ 판정 시점은 그대로 — 엔딩 업적 ${al.atEnd.join(" · ")}이 **엔딩 장면이 뜰 때 이미 세이브에** 있음(36주 판정)`);
  check(al.medals === al.nAch, `AC-4c. 🔢 알림 수 ${al.medals} == 딴 업적 수 ${al.nAch}(하나씩)`);
  const okD = (x) => x.n1 + x.n2 === x.nAch2 && x.nAch2 === al.nAch;
  check(okD(al.atEnding) && okD(al.atFilm), `AC-4d. 💾 닫았다 이어해도 알림 합 == 딴 업적 수 — 엔딩 장면에서 ${al.atEnding.n1} + ${al.atEnding.n2} · 필름 앞에서 ${al.atFilm.n1} + ${al.atFilm.n2} == ${al.nAch}`);
  {
    const m = await alerts(MUT.NOW);
    check(m.early.length > 0, `변이-NOW(엔딩 업적을 바로 알림) → AC-4a가 빨간불 (필름 전에 뜬 알림 ${m.early.length})`);
    const m2 = await alerts(MUT.NOSAVE);
    check(!(okD(m2.atEnding) && okD(m2.atFilm)), `변이-NOSAVE(미룬 알림을 저장 안 함) → AC-4d가 빨간불 (엔딩 장면에서 닫으면 ${m2.atEnding.n1} + ${m2.atEnding.n2} ≠ ${m2.atEnding.nAch2})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
