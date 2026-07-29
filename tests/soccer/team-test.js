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
  matchContribution: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  deriveOppGoals: grab(GAME, /function deriveOppGoals\(rating, defStat\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  // MatchSim.run — cfg 구조 분해 · 이벤트(evs) 생성부 · 결과 res · info 블록
  cfgPick: grab(GAME, /const \{ home, away[^;]*\} = cfg;/),
  evsBlock: grab(GAME, /const evs = \[\];[\s\S]*?evs\.sort\([^;]*\);/),
  resLine: grab(GAME, /const res = h > a \? [^;]+;/),
  infoBlock: grab(GAME, /const info = \{[\s\S]*?\n {6}\};/),
  ratingOf: grab(SRC, /function ratingOf\(stats, pos, condition, fandom\) \{[\s\S]*?\n {2}\}/),
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
  grab(GAME, /function teammateGoals\(rating\) \{[\s\S]*?\n\}/),
].filter(Boolean).join("\n");

// 동료 득점 표 자체 — 없으면 ReferenceError: TEAMMATE_GOALS is not defined
const tableFn = new Function(`${mateSrc}\n  return TEAMMATE_GOALS;`);
// 동료 골 수 한 판 — 없으면 ReferenceError: teammateGoals is not defined
const mateFn = new Function("S", "rating", "clamp", `
  ${parts.poissonish}
  ${mateSrc}
  return teammateGoals(rating);
`);

/* 경기 한 판. career.js의 playShow와 같은 순서로 평점 → 기여도 → 실점을 구하고,
 * MatchSim.run에서 떼어 온 evs 생성부로 팀 스코어를 쌓는다.
 * 결정적 순간은 자동 판정(autoRes)으로 돌리고, 성공/실패 시 스코어 반영은
 * MatchSim.moment의 h += 1 / a += 1과 같게 맞춰뒀다. */
const simFn = new Function("S", "clamp", "rand", "randInt", "pick", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${consts}
  ${parts.ratingOf}
  ${parts.poissonish}
  ${mateSrc}
  ${parts.matchContribution}
  ${parts.deriveOppGoals}
  ${parts.autoRes}
  const rt = ratingOf(S.stats, S.pos, S.condition, S.fandom);
  const c = matchContribution(rt);
  const cfg = {
    home: "우리", away: "상대", myName: S.name,
    goals: c.g, assists: c.a, defense: c.def,
    oppGoals: deriveOppGoals(rt, S.stats.defense),
    rating: rt,
  };
  ${parts.cfgPick}
  ${parts.evsBlock}
  let h = 0, a = 0;
  for (const e of evs) { if (e.h) h += e.h; if (e.a) a += e.a; }
  const momentRes = autoRes(S.stats[POS_INFO[S.pos].stat]);
  if (momentRes === "perfect") h += 1;
  else if (momentRes === "miss") a += 1;
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

  // ⑤ 수비수가 쓸 수 있는 포지션이어야 한다 (예전엔 능력치 70에서 7%였다)
  const df70 = rates[70].df;
  check(df70 >= 0.4, `수비수가 능력치 70에서 팀 승률 40% 이상이다 (${(df70 * 100).toFixed(1)}%)`);
});

// ⑥ 동료 골은 내 기록이 아니다 — info.myGoals·assists에 섞이면 수상 축과 통산 기록이 틀어진다
guard("내 기록 분리", () => {
  const n = 4000;
  let bad = 0, mateSum = 0, mineSum = 0;
  for (let i = 0; i < n; i++) {
    const pos = POS[i % POS.length];
    const { info, mine } = playMatch(pos, 90);
    const bonus = info.momentRes === "perfect" ? 1 : 0;
    if (info.myGoals !== mine.g + bonus || info.assists !== mine.a) bad++;
    mineSum += info.myGoals + info.assists;
    mateSum += info.teamGoals - bonus - mine.g - mine.a;
  }
  check(bad === 0,
    `동료 골이 info.myGoals·assists에 섞이지 않는다 (${n}경기, 어긋난 경기 ${bad}건)`);
  check(mateSum > 0,
    `그러면서 동료 골이 팀 스코어에는 들어간다 (${n}경기, 내 공격포인트 ${mineSum} · 동료 골 ${mateSum})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
