/* ⚽ 팀 결과와 내 활약이 갈라져 있는가.
 *
 * 제보: "내 선수가 못해도 팀이 잘할 수 있고 팀이 잘해도 내가 못할 수 있는 거지 지금??"
 * 재보니 **아니었다.**
 *   · 내 경기 평점 7.5 이상이면 팀 승률 99.4% · 6.0 미만이면 6.4%
 *   · 공격P 2개 이상 올린 경기에서 팀이 진 비율 0.0%
 *   · 팀 득점의 90%가 내 몫, 동료 골 기댓값마저 내 평점에 비례
 *   · 클럽 전력을 45→95로 바꿔도 승률이 10%p, 내 종합을 45→125로 바꾸면 78%p
 * 팀이 사실상 나였다. 약팀이라는 게 존재하지 않으니 이적도 의미가 없었다.
 *
 * 고친 방향:
 *   · 동료 골 = **우리 전력 대 상대 전력** (내 경기력은 ±0.3 상한으로 거들기만)
 *   · 실점 = (기본 골 + 우리 팀 골 × CONC_MIX) × 전력 균형
 *     우리 팀 골을 되비추는 게 핵심이다. 한 경기 3~4골을 넣는 선수가 주인공인
 *     게임이라, 실점을 낮은 값에 묶어 두면 내 골 수가 곧 승패가 된다.
 *   · 리그 경기도 상대 클럽 전력을 본다 (여태 상대가 누구든 똑같았다)
 *
 * 지키는 것:
 *   ① 클럽 전력이 팀 승률을 크게 움직인다
 *   ② 내 실력도 움직이지만 클럽을 압도하지 않는다
 *   ③ 공격P 2+ 인데 팀이 지는 경기가 실제로 나온다
 *   ④ 공격P 0인데 팀이 이기는 경기도 나온다
 *   ⑤ 같은 팀이라도 강한 상대를 만나면 덜 이긴다
 *   ⑥ 동료 골은 전력 차에 크게, 내 평점에 작게 반응한다
 *   ⑦ 실점 상한이 지켜진다 (8:5 같은 스코어가 안 나오게)
 *   ⑧ 변이 검증 — 옛 산식으로 되돌리면 ①③이 무너진다
 *
 * 산식은 전부 소스에서 정규식으로 뽑아 new Function으로 굴린다. 직접 eval은 안 쓴다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const grab = (s, re) => { const m = s.match(re); return m ? m[0] : null; };
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

const parts = {
  buffFns: grab(GAME, /const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/),
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  poissonish: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  contrib: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  clubStrOf: grab(GAME, /function clubStrOf\(st\) \{[\s\S]*?\n\}/),
  tmTbl: grab(GAME, /const TEAMMATE_GOALS = \{[\s\S]*?\};/),
  mates: grab(GAME, /const MATE_SCALE = [\s\S]*?function teammateGoals\(rating, oppStr\) \{[\s\S]*?\n\}/),
  conc: grab(GAME, /const CONC_BASE = [\s\S]*?function deriveOppGoals\(rating, defStat, oppStr, teamGoals\) \{[\s\S]*?\n\}/),
  concCap: grab(GAME, /const CONC_CAP = [^;]+;/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  leagueOf: grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  fanCap: grab(SRC, /const FAN_CAP = [^;]+;/),
  ratingDiv: grab(SRC, /const RATING_DIV = [^;]+;/),
  ratingOf: grab(SRC, /function ratingOf\(stats, pos, condition, fandom\) \{[\s\S]*?\n {2}\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

/* 한 경기 — career.js playShow와 같은 순서다.
 * 평점 → 기여 → **동료 골** → 우리 팀 골 → 실점 → 승부처 → 승패.
 * 순서가 중요하다. 실점이 우리 팀 골을 보기 때문에, 동료 골을 나중에 굴리면
 * 실점 산식이 늘 0을 보고 전력 차만 남는다. */
const mkMatch = (mateSrc, concSrc) => new Function("S", "oppStr", "clamp", "rand", "randInt", "pick", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.leagues} ${parts.leagueOf} ${parts.clubStrOf}
  ${parts.buffFns} ${parts.poissonish} ${parts.contrib} ${parts.autoRes}
  ${parts.fanCap} ${parts.ratingDiv} ${parts.ratingOf}
  ${parts.tmTbl}
  ${mateSrc}
  ${concSrc}
  const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom);
  const c = matchContribution(rating);
  const momentRes = autoRes(S.stats[POS_INFO[S.pos].stat]);
  const mates = teammateGoals(rating, oppStr);
  let h = c.g + c.a + mates;
  let a = deriveOppGoals(rating, S.stats.defense, oppStr, h);
  if (momentRes === "perfect") h += 1;
  if (momentRes === "miss") a += 1;
  return { res: h > a ? "W" : h < a ? "L" : "D", g: c.g + (momentRes === "perfect" ? 1 : 0),
    a: c.a, mates, h, conc: a, rating };
`);
const match = mkMatch(parts.mates, parts.conc);

const STATS = ["shoot", "pass", "dribble", "defense", "stamina"];
function run(fn, ovr, clubStr, oppStr, n, pos = "fw") {
  const S = { pos, league: 1, proYear: 5, condition: 80, fandom: 900,
    stats: {}, talents: {}, trans: {}, clubStr };
  for (const k of STATS) { S.stats[k] = ovr; S.talents[k] = 1.3; }
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(fn(S, oppStr, clamp, rand, randInt, pick));
  return rows;
}
const wr = (rs) => rs.filter((r) => r.res === "W").length / rs.length;
const N = 9000;

// ---------- ① 클럽 전력 ----------
let clubSpread = 0;
guard("① 클럽 전력", () => {
  const lo = wr(run(match, 85, 45, 70, N)), hi = wr(run(match, 85, 95, 70, N));
  clubSpread = hi - lo;
  console.log(`   종합 85 고정 · 상대 70 — 전력 45 ${(lo * 100).toFixed(0)}% → 전력 95 ${(hi * 100).toFixed(0)}%`);
  check(clubSpread >= 0.35,
    `클럽 전력이 팀 승률을 크게 움직인다 (${(clubSpread * 100).toFixed(0)}%p) — 예전엔 10%p였어요`);
});

// ---------- ② 내 실력 ----------
guard("② 내 실력", () => {
  const lo = wr(run(match, 45, 70, 70, N)), hi = wr(run(match, 125, 70, 70, N));
  const abSpread = hi - lo;
  console.log(`   전력 70 고정 · 상대 70 — 종합 45 ${(lo * 100).toFixed(0)}% → 종합 125 ${(hi * 100).toFixed(0)}%`);
  check(abSpread >= 0.25, `내 실력도 팀 승률을 움직인다 (${(abSpread * 100).toFixed(0)}%p) — 아예 무의미해지면 안 돼요`);
  check(abSpread <= clubSpread + 0.15,
    `내 실력이 클럽을 압도하지 않는다 (내 ${(abSpread * 100).toFixed(0)}%p vs 클럽 ${(clubSpread * 100).toFixed(0)}%p) — 예전엔 78 vs 10이었어요`);
});

// ---------- ③④ 갈렸는가 ----------
guard("③④ 엇갈리는 경기", () => {
  const rs = run(match, 85, 70, 70, N * 3);
  const star = rs.filter((r) => r.g + r.a >= 2);
  const dry = rs.filter((r) => r.g + r.a === 0);
  const starLoss = star.filter((r) => r.res === "L").length / star.length;
  const dryWin = wr(dry);
  console.log(`   공격P 2+ (${(star.length / rs.length * 100).toFixed(0)}%) → 팀 패배 ${(starLoss * 100).toFixed(0)}%`);
  console.log(`   공격P 0  (${(dry.length / rs.length * 100).toFixed(0)}%) → 팀 승리 ${(dryWin * 100).toFixed(0)}%`);
  check(starLoss >= 0.10,
    `내가 잘해도 팀이 지는 경기가 나온다 (${(starLoss * 100).toFixed(0)}%) — 예전엔 0.0%였어요`);
  check(dryWin >= 0.03,
    `내가 못해도 팀이 이기는 경기가 나온다 (${(dryWin * 100).toFixed(0)}%)`);
  const mateShare = rs.reduce((s, r) => s + r.mates, 0) / rs.reduce((s, r) => s + r.h, 0);
  console.log(`   팀 득점 중 동료 몫 ${(mateShare * 100).toFixed(0)}%`);
  check(mateShare >= 0.10, `팀 득점에 동료 몫이 있다 (${(mateShare * 100).toFixed(0)}%)`);
});

// ---------- ⑤ 상대 전력 ----------
guard("⑤ 상대 전력", () => {
  const easy = wr(run(match, 85, 70, 45, N)), hard = wr(run(match, 85, 70, 95, N));
  console.log(`   내 전력 70 고정 — 약한 상대(45) ${(easy * 100).toFixed(0)}% · 강한 상대(95) ${(hard * 100).toFixed(0)}%`);
  check(easy - hard >= 0.25,
    `같은 팀이라도 상대가 세면 덜 이긴다 (${((easy - hard) * 100).toFixed(0)}%p) — 여태 리그 경기는 상대가 누구든 똑같았어요`);
});

// ---------- ⑥ 동료 골의 반응 ----------
guard("⑥ 동료 골", () => {
  const mateOnly = new Function("S", "rating", "oppStr", "clamp", `
    ${parts.leagues} ${parts.leagueOf} ${parts.clubStrOf} ${parts.poissonish}
    ${parts.tmTbl} ${parts.mates}
    return teammateGoals(rating, oppStr);`);
  const mean = (clubStr, oppStr, rating) => {
    const S = { pos: "mf", clubStr, stats: {}, talents: {}, trans: {} };
    let s = 0;
    for (let i = 0; i < 20000; i++) s += mateOnly(S, rating, oppStr, clamp);
    return s / 20000;
  };
  const byEdge = mean(95, 45, 7) / mean(45, 95, 7);
  const byForm = mean(70, 70, 9.5) / mean(70, 70, 5);
  console.log(`   전력 차(95vs45 ÷ 45vs95) ${byEdge.toFixed(2)}배 · 내 평점(9.5 ÷ 5.0) ${byForm.toFixed(2)}배`);
  check(byEdge > 3, `동료 골이 전력 차에 크게 반응한다 (${byEdge.toFixed(2)}배)`);
  check(byForm > 1.05 && byForm < 1.6,
    `내 평점에는 작게 반응한다 (${byForm.toFixed(2)}배) — 예전엔 이게 주인공이라 못한 날 동료도 같이 못 넣었어요`);
});

// ---------- ⑦ 실점 상한 ----------
guard("⑦ 실점 상한", () => {
  const CAP = new Function(`${parts.concCap} return CONC_CAP;`)();
  const rs = run(match, 125, 45, 95, N);   // 최악의 조건 — 약팀에서 강팀을 만난 슈퍼스타
  const worst = Math.max(...rs.map((r) => r.conc));
  const avg = rs.reduce((s, r) => s + r.conc, 0) / rs.length;
  console.log(`   최악 조건(전력 45 vs 상대 95) — 평균 실점 ${avg.toFixed(2)} · 최대 ${worst}`);
  // 승부처 실패가 상한 뒤에 +1을 얹어요 — 그래서 CAP+1까지가 정상이에요
  check(worst <= CAP + 1, `한 경기 실점이 상한(${CAP}) + 승부처 실패 1을 안 넘는다 (최대 ${worst})`);
  check(avg <= CAP, `최악의 조건에서도 평균 실점이 상한 아래다 (${avg.toFixed(2)})`);
});

/* ---------- ⑧ 변이 검증 — 옛 산식으로 되돌리면 ①③이 무너져야 한다 ----------
 * 옛 산식을 여기 그대로 적어 둔다. 지금 산식을 소스에서 뽑아 쓰는 것과 달리,
 * 이건 "예전에는 이랬다"는 대조군이라 값이 박혀 있어도 된다. */
guard("⑧ 변이 검증", () => {
  const OLD_MATE = `function teammateGoals(rating, oppStr) {
    const strF = clubStrOf(S) / 70;
    const base = (TEAMMATE_GOALS[S.pos] ?? 0.6) * (0.6 + (rating - 5) * 0.14) * strF;
    return poissonish(Math.max(0, base));
  }`;
  const OLD_CONC = `function deriveOppGoals(rating, defStat, oppStr, teamGoals) {
    const strAdj = (clubStrOf(S) - 70) / 100;
    const base = 2.4 - (rating - 5) * 0.28 - (defStat / 100) * 1.4 - strAdj + rand(-0.3, 0.9);
    return Math.max(0, Math.min(4, Math.round(base)));
  }`;
  const old = mkMatch(OLD_MATE, OLD_CONC);
  const clubLo = wr(run(old, 85, 45, 70, N)), clubHi = wr(run(old, 85, 95, 70, N));
  const abLo = wr(run(old, 45, 70, 70, N)), abHi = wr(run(old, 125, 70, 70, N));
  const rs = run(old, 85, 70, 70, N * 2);
  const star = rs.filter((r) => r.g + r.a >= 2);
  const starLoss = star.filter((r) => r.res === "L").length / star.length;
  console.log(`   옛 산식 — 클럽 폭 ${((clubHi - clubLo) * 100).toFixed(0)}%p · 내 실력 폭 ${((abHi - abLo) * 100).toFixed(0)}%p · 공격P 2+ 패배 ${(starLoss * 100).toFixed(0)}%`);
  check(clubHi - clubLo < 0.2,
    `옛 산식에서는 클럽 전력이 거의 작용하지 않았다 (${((clubHi - clubLo) * 100).toFixed(0)}%p)`);
  check(abHi - abLo > (clubHi - clubLo) * 2,
    `옛 산식에서는 내 실력이 클럽을 압도했다 (내 ${((abHi - abLo) * 100).toFixed(0)}%p vs 클럽 ${((clubHi - clubLo) * 100).toFixed(0)}%p)`);
  check(starLoss < 0.05,
    `옛 산식에서는 내가 잘하면 팀이 거의 안 졌다 (${(starLoss * 100).toFixed(1)}%)`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
