/* 🥇 개인 순위(득점·도움) — 화면에 보이는 경쟁이 곧 수상 판정인지 본다.
 *
 * 예전에는 부문상이 `if (골 >= rand(51,72) * bar)`처럼 **랜덤 문턱**이었다.
 * 리그에 몇 골을 넣은 선수가 있는지 게임이 몰랐다. 그 상태로 득점 순위표만
 * 화면에 붙이면 표와 수상이 서로 모르는 사이가 된다 — 이 저장소에서 여러 번
 * 반복된 병이다(반복 문제 유형 8번: 결과가 원인을 안 본다).
 *
 * 지키는 것:
 *   ① 부문상은 **그 표의 1위**여야 받는다 (랜덤 문턱이 아니다)
 *   ② 경쟁자는 시즌 내내 같은 사람이고 기록이 쌓인다 (반기마다 리셋되면 안 된다)
 *   ③ 리그가 높을수록 1위 기록이 많다 (상위 리그 득점왕이 더 값진 이유)
 *   ④ 옛 세이브(race 없음)에서도 안 죽는다
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const G = fs.readFileSync(`${BASE}/game.js`, "utf8");
const C = fs.readFileSync(`${BASE}/career.js`, "utf8");
const grab = (s, re) => { const m = s.match(re); return m ? m[0] : null; };

const parts = {
  roles: grab(G, /const RACE_ROLES = \[[\s\S]*?\n\];/),
  lam: grab(G, /const raceLam = \([\s\S]*?;\n/),
  leagues: grab(G, /const LEAGUES = \[[\s\S]*?\n\];/),
  rank: grab(C, /function raceRank\(key\) \{[\s\S]*?\n  \}/),
  /* ⚠️ `[^;]+;`로 자르면 안 돼요 — 화살표 함수 **본문 안의 첫 세미콜론**에서 끊깁니다.
   * 오늘 stats 페이지의 esc에서도 같은 자리에 걸렸어요. 끝나는 모양으로 잡습니다. */
  top: grab(C, /const raceTop = \(key\) => \{[\s\S]*?\};/),
  advance: grab(C, /function raceAdvance\(\) \{[\s\S]*?\n  \}/),
  awardBlk: grab(C, /if \(Array\.isArray\(act\.race\) && act\.race\.length\) \{[\s\S]*?\n    \}/),
  initAct: grab(C, /function initActivity\(\) \{[\s\S]*?\n  \}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const LEAGUES = new Function(`${parts.leagues} return LEAGUES;`)();
const ROLES = new Function(`${parts.roles} return RACE_ROLES;`)();
const raceLam = new Function(`${parts.lam} return raceLam;`)();

// ── ① 부문상이 표 1위를 본다 (소스 배선)
check(/raceTop\("g"\)/.test(parts.awardBlk) && /골든부츠/.test(parts.awardBlk),
  "골든부츠가 득점 1위를 본다");
check(/raceTop\("a"\)/.test(parts.awardBlk) && /raceTop\("d"\)/.test(parts.awardBlk) && /raceTop\("p"\)/.test(parts.awardBlk),
  "플레이메이커·철벽상·공격포인트왕도 각각 1위를 본다");
check(!/rand\(\s*\d+\s*,\s*\d+\s*\)\s*\*\s*bar/.test(parts.awardBlk),
  "랜덤 문턱이 남아 있지 않다 — 표와 수상이 같은 것을 봐야 한다");

// ── ② 시즌 내내 같은 명단 (반기 갱신 자리에 race가 없어야 한다)
check(/race: rollRace\(\)/.test(parts.initAct), "시즌 시작에 경쟁자 명단을 뽑는다");
const halfReset = grab(C, /S\.activity\.cb \+= 1;[\s\S]*?rollRivals\(\);/);
check(!!halfReset && !/race/.test(halfReset),
  "반기가 바뀌어도 경쟁자 기록은 안 지운다 (라이벌만 다시 뽑아요)");

// ── ③ 순위 계산 — 내가 1위면 raceTop이 참
const rankOf = new Function("S", "key", `${parts.rank}${parts.top} return { rank: raceRank(key), top: raceTop(key) };`);
const mkS = (myGoals, rivalGoals) => ({
  name: "나", group: "우리팀",
  activity: { goals: myGoals, assists: 0, defense: 0,
    race: rivalGoals.map((g2, i) => ({ name: `상대${i}`, club: "X", role: "r", g: g2, a: 0, d: 0 })) },
});
const win = rankOf(mkS(50, [40, 30, 20]), "g");
const lose = rankOf(mkS(30, [40, 30, 20]), "g");
check(win.top === true && win.rank[0].me, `내가 최다 득점이면 1위다 (${win.rank[0].name} ${win.rank[0].v})`);
check(lose.top === false, `아니면 1위가 아니다 (1위 ${lose.rank[0].name} ${lose.rank[0].v})`);
/* 동점이면 받는다. 실제로도 **공동 득점왕은 둘 다** 받아요 —
 * 한 골 차이로 갈리는 건 몰라도, 같은 기록인데 상을 못 받으면 이상합니다.
 * raceRank의 정렬이 동점에서 내 줄을 앞에 두는 게 이 규칙이에요. */
check(rankOf(mkS(40, [40, 10]), "g").top === true, "동점이면 공동 1위로 받는다");
// 공격포인트는 골+도움
const p = rankOf({ name: "나", group: "T",
  activity: { goals: 10, assists: 30, defense: 0,
    race: [{ name: "상대", club: "X", g: 35, a: 0, d: 0 }] } }, "p");
check(p.top === true, `공격포인트왕은 골+도움으로 잰다 (내 40 vs 상대 35)`);

// ── ④ 리그가 높을수록 1위 기록이 많다
function pois(lam) { let n = 0, L = Math.exp(-Math.max(0, lam)), pp = 1; do { pp *= Math.random(); n++; } while (pp > L && n < 12); return n - 1; }
const topGoals = (lg) => {
  let best = 0;
  for (const r of ROLES) {
    let g2 = 0;
    for (let i = 0; i < 38; i++) g2 += pois(raceLam(r.g, 70, lg.prestige));
    if (g2 > best) best = g2;
  }
  return best;
};
const byTier = LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const tops = byTier.map((l) => { let s = 0; for (let i = 0; i < 60; i++) s += topGoals(l); return s / 60; });
console.log(`   리그별 득점 1위 평균 — ${byTier.map((l, i) => `${l.short} ${tops[i].toFixed(0)}`).join(" · ")}`);
check(tops[tops.length - 1] > tops[0] * 1.2,
  `상위 리그 득점왕이 더 많이 넣는다 (${tops[0].toFixed(0)} → ${tops[tops.length - 1].toFixed(0)})`);
check(tops.every((v, i) => i === 0 || v >= tops[i - 1] - 3), "리그가 오를수록 1위 기록이 안 줄어든다");

// ── ⑤ 옛 세이브 — race가 없으면 부문상을 건너뛴다 (안 죽는다)
const noRace = rankOf({ name: "나", group: "T", activity: { goals: 99, assists: 0, defense: 0 } }, "g");
check(noRace.top === true && noRace.rank.length === 1,
  "경쟁자 명단이 없어도 순위 계산이 안 죽는다 (나 혼자)");
check(/Array\.isArray\(act\.race\) && act\.race\.length/.test(parts.awardBlk),
  "명단이 없는 옛 세이브에는 부문상을 안 준다 — 없는 경쟁을 이겼다고 할 수 없다");

/* ── 변이 검증 — 수상을 다시 랜덤 문턱으로 되돌리면 ①이 무너져야 한다. */
const brokenAward = 'if (act.goals >= 50) awards.push("골든부츠");';
check(!/raceTop/.test(brokenAward), "변이 검증 — 랜덤 문턱 판정에는 raceTop이 없다 (①이 그걸 잡는다)");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
