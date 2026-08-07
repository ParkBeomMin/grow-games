/* 경기 평점이 **실제 축구 평점처럼** 계산되는지 본다.
 *
 * 지금까지의 산식은 `능력치 평점 × 10`이 뼈대였고, 그 경기는 위에 얹는
 * 보정이었다. 그래서 화면에 뜨는 건 "그날 누가 잘했나"가 아니라
 * "누가 센 선수인가"였다 — 능력치 130이 0골 0도움으로 6.9를 받고,
 * 능력치 50이 두 골을 넣고 6.5를 받았다.
 *
 * 실제 평점 업체는 그 경기에 일어난 일만 본다. 그래서 여기서 지키는 건:
 *   ⓪ **능력치·컨디션·명성이 평점에 아예 안 들어간다** (이게 핵심)
 *   ① 잘한 경기와 조용한 경기가 화면에서 확실히 갈린다
 *   ② 조용한 경기가 재앙처럼 보이지는 않는다
 *   ③ 승패·무실점도 남는다
 *   ④ 포지션이 손해 보지 않는다 (수비수의 몸싸움도 쳐준다)
 *   ⑤ 내 눈금과 라이벌 눈금이 같은 자리에 있다 (순위가 뒤집히지 않게)
 *
 * 절대값 하나를 고정하지 않는다 — 산식이 조금 움직여도 되지만 관계는 남아야 한다.
 * 산식은 소스에서 정규식으로 뽑아 그대로 실행한다. 직접 eval은 쓰지 않는다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  goalScale: grab(GAME, /const GOAL_SCALE = [^;]+;/),
  rateTbl: grab(SRC, /const RATE = \{[\s\S]*?\n  \};/),
  rateRes: grab(SRC, /const RATE_RESULT = [^;]+;/),
  rateCon: grab(SRC, /const RATE_CONCEDE = [^;]+;/),
  /* 같은 종류가 쌓이면 값이 줄어요(credit) — 산식이 이걸 부르니 함께 떼어 와야 해요 */
  decay: grab(SRC, /const RATE_DECAY = [^;]+;/),
  credit: grab(SRC, /const credit = \(n, unit\) =>[\s\S]*?;\n/),
  lossCap: grab(SRC, /const RATE_LOSS_CAP = [^;]+;/),
  ratePartsFn: grab(SRC, /function ratingParts\(info, pos, momAdj\) \{[\s\S]*?\n  \}/),
  rateFn: grab(SRC, /function matchRating\(info, pos, momAdj\) \{[\s\S]*?\n  \}/),
  score: grab(SRC, /const myRankScore = matchRating\([^;]+;/),
  conceded: grab(SRC, /const raceConceded = [^;]+;/),
  racePos: grab(SRC, /const RACE_POS = \{[^}]*\};/),
  roles: grab(fs.readFileSync(`${BASE}/game.js`, "utf8"), /const RACE_ROLES = \[[\s\S]*?\n\];/),
  lam: grab(fs.readFileSync(`${BASE}/game.js`, "utf8"), /const raceLam = \([\s\S]*?;\n/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

/* 산식을 뽑아 실행한다. **S를 인자로 넘긴다** — 산식이 능력치를 몰래 다시
 * 읽기 시작하면 ⓪에서 잡히도록 하려는 것이다. */
const rateOnce = new Function(
  "S", "info", "pos", "momAdj", "clamp", "rand",
  `${parts.rateTbl}
   ${parts.rateRes}
   ${parts.rateCon}
   ${parts.decay}
   ${parts.credit}
   ${parts.lossCap}
   ${parts.ratePartsFn}
   ${parts.rateFn}
   return clamp(matchRating(info, pos, momAdj) / 10, 1, 10);`
);
const N = 20000;
const WEAK = { stats: { shoot: 20, pass: 20, dribble: 20, defense: 20, stamina: 20 }, condition: 25, fandom: 0 };
const STRONG = { stats: { shoot: 200, pass: 200, dribble: 200, defense: 200, stamina: 200 }, condition: 100, fandom: 9000 };
const avgRating = (info, pos, S = WEAK) => {
  let s = 0;
  for (let i = 0; i < N; i++) s += rateOnce(S, info, pos, 0, clamp, rand);
  return s / N;
};

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ⓪ 능력치가 평점에 안 들어간다 — 이 파일에서 제일 중요한 검사
const same = { myGoals: 1, assists: 1, defense: 1, res: "W", oppGoals: 1 };
const weakRate = avgRating(same, "fw", WEAK);
const strongRate = avgRating(same, "fw", STRONG);
console.log(`   같은 경기 내용 — 능력치 20/컨디션 25 ${weakRate.toFixed(2)} · 능력치 200/컨디션 100 ${strongRate.toFixed(2)}`);
check(Math.abs(weakRate - strongRate) < 0.06,
  `능력치·컨디션·명성이 열 배 달라도 같은 경기면 같은 평점이다 (차이 ${Math.abs(weakRate - strongRate).toFixed(3)})`);

// ── ① 잘한 경기와 조용한 경기가 갈린다
const big = avgRating({ myGoals: 2, assists: 2, defense: 1, res: "W", oppGoals: 1 }, "fw");
const quiet = avgRating({ myGoals: 0, assists: 0, defense: 0, res: "W", oppGoals: 1 }, "fw");
const one = avgRating({ myGoals: 1, assists: 0, defense: 0, res: "W", oppGoals: 1 }, "fw");
const hat = avgRating({ myGoals: 3, assists: 0, defense: 0, res: "W", oppGoals: 1 }, "fw");
console.log(`   공격수 — 0골 ${quiet.toFixed(2)} · 1골 ${one.toFixed(2)} · 해트트릭 ${hat.toFixed(2)} · 2골2도움 ${big.toFixed(2)}`);
check(big >= 8.5, `2골 2도움 승리는 8.5를 넘는다 (${big.toFixed(2)})`);
check(big - quiet >= 2.8, `잘한 경기와 조용한 경기가 2.8점 넘게 벌어진다 (${(big - quiet).toFixed(2)}점)`);

/* 골 하나의 값이 실제 축구 평점의 눈금(+1.0)과 맞는지. 이 눈금이 있어야
 * 화면의 숫자를 사람이 읽을 수 있다 ("한 골 넣었으니 1점 오르는구나"). */
const goalStep = one - quiet;
check(Math.abs(goalStep - 1.0) < 0.25, `골 하나가 평점 +1.0 근처다 (${goalStep.toFixed(2)})`);
/* 골이 쌓일수록 계속 오르되, **덜 오릅니다**(credit의 체감).
 * 예전에는 골마다 +1.0씩 그대로 더해서 만점이 흔했어요 —
 * 챔피언십에서 평점 10.0이 12.7%, 한 라운드에 둘 이상이 33%였습니다. */
check(hat > one, `해트트릭이 1골보다 높다 (${hat.toFixed(2)} > ${one.toFixed(2)})`);
check(hat - one >= 1.0 && hat - one < goalStep * 2,
  `골이 쌓일수록 오르지만 덜 오른다 — 1골→해트트릭 ${(hat - one).toFixed(2)}점 (골 하나 값 ${goalStep.toFixed(2)}의 두 배 미만)`);

// ── ② 조용한 경기가 재앙처럼 보이지 않는다
check(quiet >= 5.2, `아무것도 못 한 경기도 5점대는 준다 (${quiet.toFixed(2)})`);

// ── ③ 승패와 무실점이 남는다
const won = avgRating({ myGoals: 1, assists: 1, defense: 0, res: "W", oppGoals: 1 }, "fw");
const lost = avgRating({ myGoals: 1, assists: 1, defense: 0, res: "L", oppGoals: 2 }, "fw");
check(won > lost, `같은 활약이면 이긴 경기가 높다 (${won.toFixed(2)} > ${lost.toFixed(2)})`);
const dfClean = avgRating({ myGoals: 0, assists: 0, defense: 3, res: "W", oppGoals: 0 }, "df");
const dfLeak = avgRating({ myGoals: 0, assists: 0, defense: 3, res: "W", oppGoals: 3 }, "df");
console.log(`   수비수 3수비 승리 — 무실점 ${dfClean.toFixed(2)} · 3실점 ${dfLeak.toFixed(2)}`);
check(dfClean - dfLeak >= 0.6, `수비수는 무실점과 대량 실점이 갈린다 (${(dfClean - dfLeak).toFixed(2)}점)`);

// ── ④ 포지션이 손해 보지 않는다
const dfWork = avgRating({ myGoals: 0, assists: 0, defense: 5, res: "W", oppGoals: 1 }, "df");
console.log(`   수비수 5수비 ${dfWork.toFixed(2)} · 공격수 1골 ${one.toFixed(2)}`);
check(dfWork > one, `수비수가 몸으로 막은 경기도 제대로 쳐준다 (${dfWork.toFixed(2)} > ${one.toFixed(2)})`);
/* 골은 누가 넣어도 골이다 — 예전 posAxis 가중치를 쓰면 미드필더의 골이
 * 공격수의 골보다 반값이라 "미드필더 해트트릭 6.6"이 나왔다. */
const mfHat = avgRating({ myGoals: 3, assists: 0, defense: 0, res: "W", oppGoals: 1 }, "mf");
check(mfHat >= hat - 0.3, `미드필더의 해트트릭도 공격수만큼 쳐준다 (${mfHat.toFixed(2)} vs ${hat.toFixed(2)})`);

/* ── ⑤ 내 눈금과 경쟁자 눈금이 같은 자리에 있다
 * 경쟁자도 이제 나와 **같은 matchRating**을 쓴다. 그래도 생산량이 다른 자에서
 * 나오므로(raceLam) 두 분포가 겹치는지 실제로 굴려 확인한다. */
const ROLES = new Function(`${parts.roles} return RACE_ROLES;`)();
const RACE_POS = new Function(`${parts.racePos} return RACE_POS;`)();
const raceLam = new Function(`${parts.lam} return raceLam;`)();
const conceded = new Function("randInt", `${parts.conceded} return raceConceded;`)(
  (a, b) => Math.floor(a + Math.random() * (b - a + 1)));
function pois(l) { let n = 0, L = Math.exp(-Math.max(0, l)), p = 1; do { p *= Math.random(); n++; } while (p > L && n < 12); return n - 1; }
const rivalRate = (pres) => {
  const def = ROLES[Math.floor(Math.random() * ROLES.length)];
  const pop = rand(52, 88), res = ["W", "D", "L"][Math.floor(Math.random() * 3)];
  return rateOnce(WEAK, {
    myGoals: pois(raceLam(def.g, pop, pres)), assists: pois(raceLam(def.a, pop, pres)),
    defense: pois(raceLam(def.d, pop, pres)), res, oppGoals: conceded(res),
  }, RACE_POS[def.key] || "mf", 0, clamp, rand);
};
const rivalAvgAt = (pres) => { let s = 0; for (let i = 0; i < N; i++) s += rivalRate(pres); return s / N; };
const lowAvg = rivalAvgAt(0.55), topAvg = rivalAvgAt(2.40);
console.log(`   경쟁자 평균 평점 — K리그3 ${lowAvg.toFixed(2)} · 프리미어리그 ${topAvg.toFixed(2)} · 내 2골2도움 ${big.toFixed(2)}`);
check(big > lowAvg && big > topAvg, `2골 2도움이면 어느 리그 경쟁자 평균도 넘는다 (${big.toFixed(2)})`);
check(quiet < lowAvg - 1.0, `조용한 경기는 경쟁자 평균에 한참 못 미친다 (${quiet.toFixed(2)} vs ${lowAvg.toFixed(2)})`);
/* 리그 격이 경쟁자 실력에 실제로 실리는지 — 예전 계수는 최하위와 최상위가
 * 사실상 같은 선수였다("K리그3 경쟁자나 PL 경쟁자나 똑같다"는 제보). */
check(topAvg - lowAvg > 0.8,
  `리그가 오르면 경쟁자 눈높이가 확실히 올라간다 (${lowAvg.toFixed(2)} → ${topAvg.toFixed(2)})`);

/* ── 변이 검증 — 골·도움·수비 항을 빼면 ①이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const brokenFn = parts.ratePartsFn
  .replace(/if \(info\.myGoals\)[^\n]*\n/, "")
  .replace(/if \(info\.assists\)[^\n]*\n/, "")
  .replace(/if \(info\.defense\)[^\n]*\n/, "");
if (brokenFn === parts.ratePartsFn) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
const brokenRate = new Function(
  "S", "info", "pos", "momAdj", "clamp", "rand",
  `${parts.rateTbl}\n${parts.rateRes}\n${parts.rateCon}\n${parts.decay}\n${parts.credit}\n${parts.lossCap}\n${brokenFn}\n${parts.rateFn}\n` +
  `return clamp(matchRating(info, pos, momAdj) / 10, 1, 10);`
);
let bs = 0, bq = 0;
for (let i = 0; i < N; i++) {
  bs += brokenRate(WEAK, { myGoals: 2, assists: 2, defense: 1, res: "W", oppGoals: 1 }, "fw", 0, clamp, rand);
  bq += brokenRate(WEAK, { myGoals: 0, assists: 0, defense: 0, res: "W", oppGoals: 1 }, "fw", 0, clamp, rand);
}
const gapBroken = (bs - bq) / N;
check(gapBroken < 2.8,
  `변이 검증 — 골·도움·수비 항을 빼면 잘한 경기와 조용한 경기 차가 ${gapBroken.toFixed(2)}점으로 무너진다`);

/* ── ⑥ 만점(10.0)이 드문가, 진 경기에 만점이 나오는가
 *
 * 제보: "소속팀이 패했는데 평점 10점을 받을 수 있나?"
 * 현실에서 **패배 팀 선수가 최고 평점을 받는 건 흔해요** — 평점은 팀 결과가 아니라
 * 개인 퍼포먼스를 재니까요. 하지만 **10.0 만점은 리그 전체에서 시즌에 한두 번**이고,
 * 진 경기의 10.0은 사실상 없습니다. 한 라운드에 둘이 만점인 것도 마찬가지고요.
 *
 * 우리 쪽 실측(고치기 전) — 챔피언십 10.0이 12.7%, 한 라운드에 둘 이상 33.3%.
 * 이 게임은 득점이 실제보다 많은데 골마다 +1.0을 그대로 더해서 생긴 일이에요. */
{
  const bigGame = { myGoals: 4, assists: 2, defense: 2, oppGoals: 1 };
  const won = avgRating({ ...bigGame, res: "W" }, "fw");
  const lost = avgRating({ ...bigGame, res: "L", oppGoals: 5 }, "fw");
  console.log(`   4골 2도움 — 이겼을 때 ${won.toFixed(2)} · 졌을 때 ${lost.toFixed(2)}`);
  check(lost < 10, `진 경기는 만점이 안 나온다 (${lost.toFixed(2)})`);
  const capVal = new Function(`${parts.lossCap} return RATE_LOSS_CAP;`)() / 10;
  let maxLost = 0;
  for (let i = 0; i < N; i++) {
    const v = rateOnce(WEAK, { myGoals: 9, assists: 9, defense: 9, res: "L", oppGoals: 4 }, "fw", 8, clamp, rand);
    if (v > maxLost) maxLost = v;
  }
  check(maxLost <= capVal + 1e-9,
    `아무리 잘해도 진 경기의 상한은 ${capVal.toFixed(1)}이다 (실측 최고 ${maxLost.toFixed(2)})`);
  // 이긴 경기에서는 만점이 가능해야 해요 — 아예 못 받으면 그것도 이상해요
  let anyTen = false;
  for (let i = 0; i < N; i++) {
    if (rateOnce(WEAK, { myGoals: 9, assists: 9, defense: 9, res: "W", oppGoals: 0 }, "fw", 8, clamp, rand) >= 9.99) anyTen = true;
  }
  check(anyTen, "압도적인 경기를 이기면 10.0도 나온다 (만점 자체를 막지는 않아요)");
  // 그리고 평범하게 잘한 경기로는 만점이 안 나와야 해요
  const solid = avgRating({ myGoals: 2, assists: 1, defense: 1, res: "W", oppGoals: 1 }, "fw");
  check(solid < 9.5, `2골 1도움 승리 정도로는 만점 근처가 아니다 (${solid.toFixed(2)})`);
}

/* ── 화면 내역이 화면 숫자와 맞는지 ────────────────────────────────
 * "골 +2.0, 도움 +0.7, 승리 +0.25"를 늘어놨는데 다 더해도 표시 평점이 안 나오면
 * 설명이 오히려 의심을 부른다. 항목 합 + 그날의 흐름 = 표시 평점이어야 한다. */
const whyHTML = grab(SRC, /function ratingWhyHTML\(score, info, pos, momAdj\) \{[\s\S]*?\n  \}/);
if (!whyHTML) { console.log("❌ ratingWhyHTML을 못 찾았어요"); process.exit(1); }
const renderWhy = new Function(
  "score", "info", "pos", "momAdj", "clamp",
  `${parts.rateTbl}\n${parts.rateRes}\n${parts.rateCon}\n${parts.decay}\n${parts.credit}\n${parts.lossCap}\n${parts.ratePartsFn}\n${whyHTML}\n` +
  `return ratingWhyHTML(score, info, pos, momAdj);`
);
let sumOK = true, shownOK = true;
for (let i = 0; i < 400; i++) {
  const info = {
    myGoals: Math.floor(Math.random() * 4), assists: Math.floor(Math.random() * 3),
    defense: Math.floor(Math.random() * 5), oppGoals: Math.floor(Math.random() * 4),
    res: ["W", "D", "L"][Math.floor(Math.random() * 3)],
  };
  const momAdj = [0, 8, -8][Math.floor(Math.random() * 3)];
  const score = 40 + Math.random() * 60;
  const html = renderWhy(score, info, "fw", momAdj, clamp);
  // 항목 값들을 화면 문자열에서 도로 읽는다 (렌더 결과를 본다 — 산식을 다시 계산하지 않는다)
  const nums = [...html.matchAll(/<b>[^<]*<\/b>\s*([+−]?)([\d.]+)<\/span>/g)]
    .map(([, sign, v]) => (sign === "−" ? -Number(v) : Number(v)));
  const total = nums.reduce((a, b) => a + b, 0);
  if (Math.abs(total - clamp(score / 10, 1, 10)) > 0.02) sumOK = false;
  const shown = Number((html.match(/평점 ([\d.]+) —/) || [])[1]);
  if (Math.abs(shown - clamp(score / 10, 1, 10)) > 0.06) shownOK = false;
}
check(sumOK, "화면에 늘어놓은 항목을 다 더하면 그 경기 평점이 나온다 (400개 무작위 경기)");
check(shownOK, "요약에 뜨는 평점이 실제 점수와 같다");

/* 순위 점수가 실제로 이 산식을 쓰는지 — 산식만 고치고 배선을 안 바꾸면
 * 위의 초록불이 전부 허공을 지키게 된다. */
check(/matchRating\(info, S\.pos, momAdj\)/.test(parts.score),
  "경기 결과 화면의 순위 점수가 이 산식을 그대로 쓴다");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
