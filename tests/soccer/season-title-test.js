/* 📊 시즌 결산 한마디가 그 시즌과 맞는지 본다.
 *
 * 제보: **75골 16도움에 신인왕·리그MVP·베스트11·골든부츠·공격포인트왕 5관왕인데
 * "아쉬움이 남는 시즌"**.
 *
 * 원인은 문구가 hype를 그대로 본 것이다. hype는 명예의 전당 가치라 리그 격이
 * 곱해져 있는데, 수상 문턱(bar)은 리그 안 기준이다. 두 눈금이 다르니
 * "상은 쓸어 담았는데 아쉬운 시즌"이라는 자기모순이 나왔다.
 * K리그3에서 "리그를 지배한 시즌"을 보려면 299골이 필요했다(프리미어리그는 69골).
 *
 * 지키는 것:
 *   ① 같은 성적이면 리그가 달라도 같은 문구가 나온다 (리그 안 기준)
 *   ② 상을 여럿 받은 시즌이 "아쉽다"고 뜨지 않는다
 *   ③ 그래도 성적이 나쁘면 나쁘다고 한다 (수상만으로 다 되면 안 된다)
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const C = fs.readFileSync(`${BASE}/career.js`, "utf8");
const G = fs.readFileSync(`${BASE}/game.js`, "utf8");
const grab = (s, re) => { const m = s.match(re); return m ? m[0] : null; };

const parts = {
  k: grab(C, /const AXIS_K = [^;]+;/),
  off: grab(C, /const AXIS_OFF = [^;]+;/),
  axisTbl: grab(C, /const POS_AXIS = \{[\s\S]*?\n  \};/),
  axisFn: grab(C, /function posAxis\(act, pos\) \{[\s\S]*?\n  \}/),
  title: grab(C, /function seasonTitle\(y\) \{[\s\S]*?\n  \}/),
  leagues: grab(G, /const LEAGUES = \[[\s\S]*?\n\];/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const LEAGUES = new Function(`${parts.leagues} return LEAGUES;`)();
const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
const AXIS_K = new Function(`${parts.k} return AXIS_K;`)();
const AXIS_OFF = new Function(`${parts.off} return AXIS_OFF;`)();
const posAxis = new Function("act", "pos", `${parts.axisTbl}\n${parts.axisFn}\n return posAxis(act, pos);`);
const titleOf = new Function("y", "leagueOf", "AXIS_K", "S", `${parts.title} return seasonTitle(y);`);

const hypeOf = (goals, assists, defense, pos, lg) => Math.max(-1.5, Math.min(12,
  Math.log(Math.max(1, posAxis({ goals, assists, defense }, pos) * lg.prestige)) * AXIS_K - AXIS_OFF));
const call = (goals, assists, defense, lg, awards) => titleOf(
  { hype: hypeOf(goals, assists, defense, "fw", lg), league: lg.id, awards: awards || [] },
  leagueOf, AXIS_K, { league: lg.id });

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const byId = (id) => LEAGUES.find((l) => l.id === id);
const K3 = byId(5), K1 = byId(1), PL = byId(3);

// ── ① 같은 성적이면 리그가 달라도 같은 문구
const same = LEAGUES.map((l) => call(75, 16, 18, l, []));
console.log(`   75골 16도움 (수상 없음) — ${[...new Set(same)].join(" · ")}`);
check(new Set(same).size === 1,
  `같은 성적이면 리그가 달라도 같은 문구다 (${[...new Set(same)].join(" / ")}) — 예전엔 K리그3만 "아쉬움"이었어요`);

// ── ② 제보 그 시즌 — 5관왕이 "아쉽다"고 뜨면 안 된다
const reported = call(75, 16, 18, K3, ["신인왕", "리그MVP", "베스트11", "골든부츠", "공격포인트왕"]);
console.log(`   제보 시즌 (K리그3 · 75골 16도움 · 5관왕) — ${reported}`);
check(!/아쉬움|혹독/.test(reported), `5관왕 시즌이 아쉽다고 안 한다 (${reported})`);

// ── ③ 수상이 많으면 문구가 올라간다
const noAward = call(20, 5, 10, K1, []);
const withAwards = call(20, 5, 10, K1, ["리그MVP", "베스트11"]);
console.log(`   같은 성적(20골 5도움) — 수상 0개 "${noAward}" · 2개 "${withAwards}"`);
check(noAward !== withAwards, "수상 개수가 문구에 반영된다");

// ── ④ 그래도 성적이 나쁘면 나쁘다고 한다
const bad1 = call(2, 1, 3, K1, []);
console.log(`   부진한 시즌 (2골 1도움 · 수상 없음) — ${bad1}`);
check(/혹독|아쉬움/.test(bad1), `성적이 나쁘면 나쁘다고 한다 (${bad1})`);

/* ── ⑤ 문턱이 K리그1 기준 그대로다.
 * 문턱(7.6/6.0/3.5)은 **능력치**로 잡은 값이에요 — 5년차 실측 50→3.8 · 130→7.9.
 * 축으로 되돌리면 7.6은 골 164개쯤이라, 75골은 원래 평범한 시즌이 맞습니다.
 * (경기당 1.8골이 나오는 것 자체는 따로 볼 문제예요)
 * 여기서 지킬 건 "K리그1에서는 예전과 똑같이 판정되는가"입니다. */
const K1_SAME = [
  [190, 20, 20, "리그를 지배한 시즌!"],
  [90, 15, 15, "제 몫을 해낸 시즌"],
  [45, 10, 10, "아쉬움이 남는 시즌"],
  [2, 1, 3, "혹독한 시즌…"],
];
for (const [g2, a2, d2, want] of K1_SAME) {
  const got = call(g2, a2, d2, K1, []);
  check(got === want, `K리그1 ${g2}골 ${a2}도움 → "${want}" (${got})`);
}

/* ── 변이 검증 — 리그 격을 도로 나누는 부분을 빼면 ①이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const brokenTitle = parts.title.replace(/- AXIS_K \* Math\.log\(lg\.prestige \|\| 1\)/, "");
if (brokenTitle === parts.title) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
const brokenOf = new Function("y", "leagueOf", "AXIS_K", "S", `${brokenTitle} return seasonTitle(y);`);
const brokenSame = LEAGUES.map((l) => brokenOf(
  { hype: hypeOf(75, 16, 18, "fw", l), league: l.id, awards: [] }, leagueOf, AXIS_K, { league: l.id }));
check(new Set(brokenSame).size > 1,
  `변이 검증 — 리그 격을 안 나누면 같은 성적인데 문구가 갈린다 (${[...new Set(brokenSame)].join(" / ")})`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
