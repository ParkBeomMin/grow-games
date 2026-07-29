/* 경기 평점이 능력치를 따라 자라는지 본다.
 *
 * 예전 산식은 `clamp(myScore / 10, 1, 10)`이라 능력치 60이면 이미 10.0 만점이었다.
 * 그 위로는 평점도 MOM도 성적도 전부 같았다 — 이게 축구의 천장이었다.
 * 평점은 matchContribution(perf)·matchScoreline·MOM 순위표·deriveOppGoals
 * 네 곳이 함께 쓰므로, 여기가 무너지면 경기 결과 전체가 어긋난다.
 *
 * 산식은 전부 소스에서 정규식으로 뽑는다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
 * 직접 eval(`const x = …`)은 쓰지 않는다. 선언이 eval 자기 스코프에 갇혀서 바깥으로
 * 새지 않고, 산식을 뭘로 바꾸든 undefined가 나와 테스트가 통과해버린다.
 * 그래서 new Function으로 감싸 return 한다.
 *
 * 평점 산식은 clutch()에 기대고, clutch는 전역 S(talents·trans)를 읽는다.
 * 그래서 아래 new Function은 S와 개별 인자(stats/pos/condition/fandom)를 함께 넘긴다.
 * 산식이 어느 쪽 이름을 쓰든 같은 값이 들어가도록 맞춰둔 것이다. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const grab = (src, re) => { const mm = src.match(re); return mm ? mm[0] : null; };

const parts = {
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  myScore: grab(SRC, /const myScore =[\s\S]*?;\n/),
  rating: grab(SRC, /const rating = clamp\(myScore[^;]+;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

/* 밸런스 상수는 '있으면 같이 넣는다'. 옛 산식에는 없던 이름이라 필수로 걸면
 * 고치기 전에는 테스트가 아예 못 돌아 빨간불의 내용을 볼 수 없다.
 * 값은 절대 여기 옮겨 적지 않는다 — 소스에 적힌 그대로 실행한다. */
const consts = [
  grab(SRC, /const FAN_CAP = [^;]+;/),
  grab(SRC, /const RATING_DIV = [^;]+;/),
].filter(Boolean).join(" ");

/* 리그 티어(game.js)도 같은 규칙으로 '있으면 넣는다'. 평점 산식이 리그 페널티를
 * 빼기 때문에 없으면 ReferenceError가 난다. 아래 S에는 league를 안 넣으니 1부가 되고,
 * 1부는 penalty 0이라 이 파일의 모든 기대값이 그대로다 — 그게 league-test ⑥의 약속이다. */
const leagueSrc = [
  grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
].filter(Boolean).join("\n");

const ratingFn = new Function("S", "stats", "pos", "condition", "fandom", "clamp", "rand", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${leagueSrc}
  ${consts}
  ${parts.myScore}
  ${parts.rating}
  return rating;
`);

const POS = ["fw", "mf", "df", "wg"];
function ratingOnce(stat, { condition = 80, fandom = stat * 25, pos = "fw" } = {}) {
  const stats = { shoot: stat, pass: stat, dribble: stat, defense: stat, stamina: stat };
  const talents = { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 };
  const S = { stats, talents, trans: {}, pos, condition, fandom };
  return ratingFn(S, stats, pos, condition, fandom, clamp, rand);
}
const avg = (stat, opt, n = 2000) => {
  let s = 0;
  for (let i = 0; i < n; i++) s += ratingOnce(stat, opt);
  return s / n;
};

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// ① 단조 증가 — 능력치를 올리면 평점이 반드시 따라 올라야 한다
console.log("=== ① 능력치별 평균 평점 (2000회) ===");
const STATS = [40, 60, 80, 100, 120];
const means = {};
for (const st of STATS) { means[st] = avg(st); console.log(`  능력치 ${String(st).padStart(3)} → ${means[st].toFixed(2)}`); }
let mono = true;
for (let i = 1; i < STATS.length; i++) if (means[STATS[i]] <= means[STATS[i - 1]]) mono = false;
check(mono, "평점이 능력치 40 < 60 < 80 < 100 < 120 순으로 단조 증가한다");

// ②③④ 목표 구간 — 스펙 '고칠 것 1' 측정표의 밴드
const band = (stat, lo, hi, m) => check(m >= lo && m <= hi, `능력치 ${stat} 평균 평점이 ${lo}~${hi} 범위다 (${m.toFixed(2)})`);
band(40, 4.5, 5.5, means[40]);
band(80, 6.7, 7.5, means[80]);
band(120, 8.9, 9.7, avg(120));

// ⑤ 천장 검사 — 이게 이 작업의 뿌리다. 옛 산식에서는 둘 다 10.0이라 차이가 0이었다
const m60 = avg(60), m130 = avg(130);
check(m130 - m60 >= 3.0, `능력치 60과 130의 평균 평점 차이가 3.0 이상이다 (${m60.toFixed(2)} → ${m130.toFixed(2)}, 차이 ${(m130 - m60).toFixed(2)})`);

// ⑥ 팬덤 상한 — 명성만 쌓아서 평점을 사지 못하게 막는다
const f900 = avg(40, { fandom: 900 }), fBig = avg(40, { fandom: 100000 });
check(Math.abs(fBig - f900) < 0.2, `팬덤 900과 100000의 평균 평점 차이가 0.2 미만이다 (${f900.toFixed(2)} vs ${fBig.toFixed(2)})`);

// ⑦ 범위 — 화면에 그대로 찍히는 값이라 1~10을 벗어나면 안 된다
let out = 0, lo = 99, hi = -99;
for (let i = 0; i < 20000; i++) {
  const st = rand(10, 200), r = ratingOnce(st, {
    condition: rand(0, 100), fandom: rand(0, 200000),
    pos: POS[Math.floor(Math.random() * POS.length)],
  });
  if (!(r >= 1 && r <= 10)) out++;
  if (r < lo) lo = r;
  if (r > hi) hi = r;
}
check(out === 0, `평점이 1~10을 벗어나지 않는다 (20000회, 최저 ${lo.toFixed(2)} 최고 ${hi.toFixed(2)}, 이탈 ${out}건)`);

// ⑧ 구조 — clutch(결정적 순간 보정)가 산식에서 빠지면 재능이 경기에 안 닿는다
check(/clutch\(/.test(parts.myScore), "myScore 산식에 clutch(...) 보정이 남아 있다");

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
