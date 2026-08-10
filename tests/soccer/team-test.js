/* 동료 득점이 팀 스코어에 들어가는지, 그리고 그게 내 기록을 오염시키지 않는지 본다.
 *
 * 예전 MatchSim.run은 팀 스코어를 올리는 이벤트가 '내 골'과 '내 도움' 둘뿐이었다.
 * 동료가 넣는 골이 아예 없으니, 골·도움 기댓값이 낮은 수비수는 팀이 득점을 못 했다.
 * 능력치 70에서 수비수 팀 승률이 7%, 같은 조건 공격수가 51%였다.
 *
 * 산식은 전부 소스에서 정규식으로 뽑는다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
 * 직접 eval(`const x = …`)은 쓰지 않는다. 선언이 eval 자기 스코프에 갇혀서 바깥으로
 * 새지 않고, 산식을 뭘로 바꾸든 undefined가 나와 테스트가 통과해버린다.
 * 그래서 new Function으로 감싸 return 한다.
 *
 * 팀 승률은 이벤트 배열(evs)과 info 블록을 소스에서 그대로 떼어 와 돌린다.
 * 동료 골이 evs에만 들어가고 info.myGoals에는 안 들어가는지를 함께 보기 위해서다.
 * 전역 S(pos·stats·talents·condition·fandom)를 읽는 산식들이라, new Function은
 * S를 파라미터로 받고 떼어 온 선언들이 그 S를 클로저로 잡게 감쌌다. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const grab = (src, re) => { const mm = src.match(re); return mm ? mm[0] : null; };

const parts = {
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  poissonish: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  /* 🎖️ 시즌 칭호 — matchContribution·ratingOf·autoRes가 buffMul/buffSum을 봐요.
   * 같이 안 떼어 오면 ReferenceError로 죽습니다(조용히 통과하지는 않아요).
   * 이 검사들은 칭호가 없는 상태(S.buffs 없음)를 보니 배수는 전부 1이 나와요 —
   * 칭호가 붙었을 때의 동작은 tests/soccer/buff-test.js가 봅니다. */
  /* 🔥 승부처 성공이 무엇으로 남는지는 포지션이 정해요(극장골/도움/차단).
   * info 블록이 momentKind()를 부르니 같이 떼어 와야 굴러가요. */
  momentKind: grab(GAME, /const MOMENT_KIND = \{[^}]*\};\nconst momentKind = [^;]+;/),
  // 재능이 능력치마다 따로 붙어요 — ratingOf가 STAT_KEYS를 훑어요
  statKeys: grab(GAME, /const STAT_KEYS = \[[^\]]*\];/),
  goalScale: grab(GAME, /const GOAL_SCALE = [^;]+;/),
  buffFns: grab(GAME, /const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/),
  matchContribution: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  deriveOppGoals: grab(GAME, /const CONC_BASE = [\s\S]*?function deriveOppGoals\([^)]*\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  // MatchSim.run — cfg 구조 분해 · 이벤트(evs) 생성부 · 결과 res · info 블록
  cfgPick: grab(GAME, /const \{ home, away[^;]*\} = cfg;/),
  evsBlock: grab(GAME, /const evs = \[\];[\s\S]*?evs\.sort\([^;]*\);/),
  resLine: grab(GAME, /const res = h > a \? [^;]+;/),
  infoBlock: grab(GAME, /const info = \{[\s\S]*?\n {6}\};/),
  ratingOf: grab(SRC, /function ratingOf\([^)]*\) \{[\s\S]*?\n {2}\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

/* 밸런스 상수는 '있으면 같이 넣는다'. 아직 없는 이름을 필수로 걸면 고치기 전에는
 * 테스트가 아예 못 돌아서 빨간불의 내용을 볼 수 없다. 없으면 그 이름을 쓰는 검사가
 * ReferenceError로 떨어지고, 그게 우리가 보고 싶은 빨간불이다.
 * 값은 절대 여기 옮겨 적지 않는다 — 소스에 적힌 그대로 실행한다. */
const consts = [
  grab(SRC, /const FAN_CAP = [^;]+;/),
  grab(SRC, /const RATING_DIV = [^;]+;/),
].filter(Boolean).join(" ");
const mateSrc = [
  grab(GAME, /const TEAMMATE_GOALS = \{[^}]*\};/),
  grab(GAME, /const MATE_SCALE = [\s\S]*?function teammateGoals\([^)]*\) \{[\s\S]*?\n\}/),
].filter(Boolean).join("\n");
/* 리그 티어도 같은 규칙으로 '있으면 넣는다'. ratingOf가 리그 페널티를 빼기 때문에
 * 없으면 ReferenceError가 난다. 아래 stateOf는 league를 안 넣으니 1부(penalty 0)라
 * 이 파일의 기대값은 그대로다 — 그게 league-test ⑥의 약속이다. */
const leagueSrc = [
  grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
].filter(Boolean).join("\n");
/* 클럽 전력도 같은 규칙으로 '있으면 넣는다'. teammateGoals·deriveOppGoals가
 * clubStrOf(S)를 읽기 때문에 없으면 ReferenceError가 난다. 아래 stateOf는
 * clubStr을 안 넣으니 기본 전력 70이라 이 파일의 기대값은 그대로다 —
 * 전력 70이 기준점이라는 게 club-test의 약속이다. */
const clubSrc = [
  grab(GAME, /const CLUBS = \{[\s\S]*?\n\};/),
  grab(GAME, /function clubStrOf\(st\) \{[\s\S]*?\n\}/),
].filter(Boolean).join("\n");

// 동료 득점 표 자체 — 없으면 ReferenceError: TEAMMATE_GOALS is not defined
const tableFn = new Function(`${mateSrc}\n  return TEAMMATE_GOALS;`);
// 동료 골 수 한 판 — 없으면 ReferenceError: teammateGoals is not defined
const mateFn = new Function("S", "rating", "clamp", `
  ${parts.momentKind}
  ${parts.statKeys}
  ${parts.goalScale}
  ${parts.poissonish}
  ${leagueSrc}
  ${clubSrc}
  ${mateSrc}
  return teammateGoals(rating, S.oppStr);
`);

/* 경기 한 판. career.js의 playShow와 같은 순서로 평점 → 기여도 → 실점을 구하고,
 * MatchSim.run에서 떼어 온 evs 생성부로 팀 스코어를 쌓는다.
 * 결정적 순간은 자동 판정(autoRes)으로 돌리고, 성공/실패 시 스코어 반영은
 * MatchSim.moment의 h += 1 / a += 1과 같게 맞춰뒀다. */
const simFn = new Function("S", "clamp", "rand", "randInt", "pick", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${leagueSrc}
  ${clubSrc}
  ${consts}
  ${parts.momentKind}
  ${parts.statKeys}
  ${parts.goalScale}
  ${parts.buffFns}
  ${parts.ratingOf}
  ${parts.poissonish}
  ${mateSrc}
  ${parts.matchContribution}
  ${parts.deriveOppGoals}
  ${parts.autoRes}
  const rt = ratingOf(S.stats, S.pos, S.condition, S.fandom);
  const c = matchContribution(rt);
  /* career.js playShow와 같은 순서예요 — 동료 골을 **먼저** 굴려서 우리 팀 골을 알고,
   * 그 값을 실점 산식에 물려줍니다. 이 순서가 팀 결과를 내 활약에서 떼어내는 축이에요. */
  const mateCount = teammateGoals(rt, S.oppStr);
  const cfg = {
    home: "우리", away: "상대", myName: S.name,
    goals: c.g, assists: c.a, defense: c.def,
    oppGoals: deriveOppGoals(rt, S.stats.defense, S.oppStr, c.g + c.a + mateCount),
    rating: rt, mateCount,
  };
  ${parts.cfgPick}
  ${parts.evsBlock}
  let h = 0, a = 0;
  for (const e of evs) { if (e.h) h += e.h; if (e.a) a += e.a; }
  const momentRes = autoRes(S.stats[POS_INFO[S.pos].stat]);
  /* ⚠️ 승부처 반영은 **MatchSim.moment와 같아야** 해요.
   * 수비수는 실점 한 골을 evs에서 떼어 두고(holdConceded) 여기서 정합니다 —
   * 막으면 안 들어가고, 보통이면 들어가고, 놓치면 하나 더 들어가요.
   * 예전엔 이 자리를 "perfect면 h+1"로만 베껴 둬서, 떼어 둔 골이 영영 안
   * 들어가 수비수 팀 승률이 20%p 넘게 뛰었어요. */
  const heldBack = momentKind() === "d" && cfg.oppGoals > 0 ? 1 : 0;
  if (momentRes === "perfect") { if (momentKind() !== "d") h += 1; }
  else if (momentRes === "miss") a += heldBack + 1;
  else a += heldBack;
  ${parts.resLine}
  ${parts.infoBlock}
  return { info, rating: rt, mine: c, evs };
`);

const POS = ["fw", "wg", "mf", "df"];
const POS_NAME = { fw: "공격수", wg: "윙어", mf: "미드필더", df: "수비수" };

function stateOf(pos, stat, over = {}) {
  const stats = { shoot: stat, pass: stat, dribble: stat, defense: stat, stamina: stat };
  const talents = { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 };
  return { name: "나", pos, stats, talents, trans: {}, condition: 80, fandom: stat * 25, ...over };
}
const playMatch = (pos, stat) => simFn(stateOf(pos, stat), clamp, rand, randInt, pick);

// 시즌(12경기)을 seasons번 돌려 팀 승률을 낸다
const SEASON_GAMES = 12;
function teamWinRate(pos, stat, seasons) {
  let w = 0, n = 0;
  for (let s = 0; s < seasons; s++) {
    for (let g = 0; g < SEASON_GAMES; g++) {
      if (playMatch(pos, stat).info.res === "W") w++;
      n++;
    }
  }
  return w / n;
}

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
// 아직 없는 이름을 쓰는 검사는 던지면서 죽는다. 그 자체가 실패지, 테스트 중단은 아니다.
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

// ① 동료 득점 표 — 네 포지션이 다 있고 값이 시뮬레이션으로 잡은 그대로다
guard("동료 득점 표", () => {
  const T = tableFn();
  const want = { fw: 0.35, wg: 0.5, mf: 0.8, df: 2.2 };
  const got = POS.map((p) => `${p}:${T[p]}`).join(" ");
  check(POS.every((p) => T[p] === want[p]), `TEAMMATE_GOALS가 fw 0.35 · wg 0.5 · mf 0.8 · df 2.2다 (${got})`);
});

// ② 공격에서 먼 포지션일수록 동료가 더 넣는다 — 수비수 > 미드필더 > 윙어 > 공격수
guard("동료 득점 순서", () => {
  const n = 20000;
  const mean = (pos) => {
    const S = stateOf(pos, 80);
    let s = 0;
    for (let i = 0; i < n; i++) s += mateFn(S, 7, clamp);
    return s / n;
  };
  const m = {};
  for (const p of POS) m[p] = mean(p);
  const shown = POS.map((p) => `${POS_NAME[p]} ${m[p].toFixed(2)}`).join(" · ");
  check(m.df > m.mf && m.mf > m.wg && m.wg > m.fw,
    `동료 득점 기댓값이 수비수 > 미드필더 > 윙어 > 공격수다 (${n}회, ${shown})`);
});

// ③ 평점이 오르면 동료 득점도 는다 — 못하는 날 팀이 더 넣는 구조면 성장이 거꾸로 간다
guard("평점 반영", () => {
  const n = 5000;
  const S = stateOf("mf", 80);
  const sum = (r) => { let s = 0; for (let i = 0; i < n; i++) s += mateFn(S, r, clamp); return s; };
  const lo = sum(5), hi = sum(9);
  check(hi > lo * 1.15, `평점 5보다 9일 때 동료 골이 늘어난다 (${n}회, ${lo} → ${hi})`);
});

// ④⑤ 포지션 균형 — 네 포지션의 팀 승률이 한 덩어리로 모여야 한다
const SEASONS = 2000;
const rates = {};
guard("포지션별 팀 승률", () => {
  console.log(`=== 포지션별 시즌 팀 승률 (${SEASON_GAMES}경기 × ${SEASONS}시즌) ===`);
  console.log(`  능력치 | ${POS.map((p) => POS_NAME[p].padStart(6)).join(" | ")} | 격차`);
  for (const stat of [70, 90, 110, 130]) {
    rates[stat] = {};
    for (const p of POS) rates[stat][p] = teamWinRate(p, stat, SEASONS);
    const vs = POS.map((p) => rates[stat][p]);
    const gap = Math.max(...vs) - Math.min(...vs);
    const cells = vs.map((v) => `${(v * 100).toFixed(0)}%`.padStart(6)).join(" | ");
    console.log(`  ${String(stat).padStart(6)} | ${cells} | ${(gap * 100).toFixed(1)}%p`);
  }
  for (const stat of [70, 90, 110]) {
    const vs = POS.map((p) => rates[stat][p]);
    const gap = Math.max(...vs) - Math.min(...vs);
    check(gap <= 0.15, `능력치 ${stat}: 네 포지션의 팀 승률 격차가 15%p 이내다 (${(gap * 100).toFixed(1)}%p)`);
  }

  /* ⑤ 수비수가 쓸 수 있는 포지션이어야 한다 (예전엔 능력치 70에서 7%였다)
   *
   * ⚠️ 문턱이 오래 40%였는데, 그 값은 **이 검사 자신의 실수**에서 나왔어요.
   * 승부처 반영을 손으로 베끼면서 수비수도 "perfect면 h+1"로 뒀는데, 게임은
   * `a = max(0, a-1)`이라 실점이 0인 경기에서는 아무 이득이 없었습니다.
   * 검사만 늘 +1을 줘서 43.8%가 나왔고, 실제 값은 내내 37%대였어요.
   * 승부처를 게임과 같게 맞추자 드러났습니다.
   *
   * 그래서 문턱을 실제에 맞춰 내려요. "쓸 수 있는 포지션인가"라는 뜻은
   * 절대값보다 **다른 포지션과 한 덩어리인가**가 더 잘 지켜요 — 그건 위의
   * 격차 검사가 봅니다. 여기서는 옛 7% 같은 붕괴만 막아요. */
  const df70 = rates[70].df;
  const best70 = Math.max(...POS.map((p) => rates[70][p]));
  check(df70 >= 0.33, `수비수가 능력치 70에서 팀 승률 33% 이상이다 (${(df70 * 100).toFixed(1)}%)`);
  check(best70 - df70 <= 0.06,
    `수비수가 제일 좋은 포지션과 6%p 안에 있다 (${((best70 - df70) * 100).toFixed(1)}%p)`);
});

// ⑥ 동료 골은 내 기록이 아니다 — info.myGoals·assists에 섞이면 수상 축과 통산 기록이 틀어진다
guard("내 기록 분리", () => {
  const n = 4000;
  let bad = 0, mateSum = 0, mineSum = 0;
  /* ⚠️ 승부처 성공(perfect) 한 칸이 **포지션마다 다른 자리**에 붙어요 —
   * 공격수·윙어는 골, 미드필더는 도움, 수비수는 수비. 예전에는 포지션과 무관하게
   * 골이었는데, 득점 눈금(GOAL_SCALE)이 들어간 뒤로 그 한 골이 수비수 득점의
   * 95%를 차지했어요(슛 36인 수비수가 6경기 6골로 득점 2위 — 제보).
   * 여기서 볼 건 "동료 골이 내 기록에 안 섞이는가"지, 승부처가 어디 붙는지가 아니에요. */
  const MK = { fw: "g", wg: "g", mf: "a", df: "d" };
  for (let i = 0; i < n; i++) {
    const pos = POS[i % POS.length];
    const { info, mine } = playMatch(pos, 90);
    const ok = info.momentRes === "perfect" ? 1 : 0;
    const kind = MK[pos];
    const wantG = mine.g + (ok && kind === "g" ? 1 : 0);
    const wantA = mine.a + (ok && kind === "a" ? 1 : 0);
    if (info.myGoals !== wantG || info.assists !== wantA) bad++;
    mineSum += info.myGoals + info.assists;
    // 수비수의 승부처는 팀 골이 아니라 실점 차단이라 팀 스코어에 안 얹혀요
    const teamBonus = ok && kind !== "d" ? 1 : 0;
    mateSum += info.teamGoals - teamBonus - mine.g - mine.a;
  }
  check(bad === 0,
    `동료 골이 info.myGoals·assists에 섞이지 않는다 (${n}경기, 어긋난 경기 ${bad}건)`);
  check(mateSum > 0,
    `그러면서 동료 골이 팀 스코어에는 들어간다 (${n}경기, 내 공격포인트 ${mineSum} · 동료 골 ${mateSum})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
