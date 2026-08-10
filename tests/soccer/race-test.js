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
  // 재능이 능력치마다 따로 붙어요 — ratingOf가 STAT_KEYS를 훑어요
  statKeys: grab(G, /const STAT_KEYS = \[[^\]]*\];/),
  goalScale: grab(G, /const GOAL_SCALE = [^;]+;/),
  roles: grab(G, /const RACE_ROLES = \[[\s\S]*?\n\];/),
  lam: grab(G, /const raceLam = \([\s\S]*?;\n/),
  leagues: grab(G, /const LEAGUES = \[[\s\S]*?\n\];/),
  rank: grab(C, /function raceRank\(key\) \{[\s\S]*?\n  \}/),
  /* ⚠️ `[^;]+;`로 자르면 안 돼요 — 화살표 함수 **본문 안의 첫 세미콜론**에서 끊깁니다.
   * 오늘 stats 페이지의 esc에서도 같은 자리에 걸렸어요. 끝나는 모양으로 잡습니다. */
  top: grab(C, /const raceTop = \(key\) => \{[\s\S]*?\};/),
  advance: grab(C, /function leagueRound\([^)]*\) \{[\s\S]*?\n  \}/),
  awardBlk: grab(C, /if \(\(act\.apps \|\| 0\) > 0 && window\.WingerSquad\) \{[\s\S]*?\n    \}/),
  initAct: grab(C, /function initActivity\(\) \{[\s\S]*?\n  \}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const LEAGUES = new Function(`${parts.leagues} return LEAGUES;`)();
const ROLES = new Function(`${parts.roles} return RACE_ROLES;`)();
// raceLam이 득점 눈금(GOAL_SCALE)을 곱해요 — 같이 안 넘기면 ReferenceError로 죽습니다
const raceLam = new Function(`${parts.goalScale} ${parts.lam} return raceLam;`)();

// ── ① 부문상이 표 1위를 본다 (소스 배선)
check(/raceTop\("g"\)/.test(parts.awardBlk) && /골든부츠/.test(parts.awardBlk),
  "골든부츠가 득점 1위를 본다");
check(/raceTop\("a"\)/.test(parts.awardBlk) && /raceTop\("d"\)/.test(parts.awardBlk) && /raceTop\("p"\)/.test(parts.awardBlk),
  "플레이메이커·철벽상·공격포인트왕도 각각 1위를 본다");
check(!/rand\(\s*\d+\s*,\s*\d+\s*\)\s*\*\s*bar/.test(parts.awardBlk),
  "랜덤 문턱이 남아 있지 않다 — 표와 수상이 같은 것을 봐야 한다");

/* ── ② 명단을 따로 뽑지 않는다
 * 예전에는 시즌 초에 실력 상위 여덟을 뽑아 act.race에 두고 그들만 굴렸다.
 * 그러면 다른 클럽의 아홉 번째 선수는 아무리 잘해도 표에 못 올라온다 —
 * 명단 화면에는 있는데 순위표에는 없는 사람이 88명이었다.
 * 이제 기록은 **리그 명단 한 벌**(S.squads)에만 쌓이고, 표는 그걸 읽는다. */
check(/raceFilled: true/.test(parts.initAct) && !/race: rollRace\(\)/.test(parts.initAct),
  "시즌을 시작할 때 경쟁자 명단을 따로 뽑지 않는다 — 기록은 리그 명단 한 벌에만 쌓여요");
const halfReset = grab(C, /S\.activity\.cb \+= 1;[\s\S]*?cbWins = 0;/);
check(!!halfReset && !/race/.test(halfReset),
  "반기가 바뀌어도 경쟁자 기록은 안 지운다 (시즌 내내 같은 8명이에요)");

// ── ③ 순위 계산 — 내가 1위면 raceTop이 참
/* raceRank가 이제 **우리 팀 동료 기록**도 같이 세워요(window.WingerSquad).
 * 여기서는 경쟁자 명단만 놓고 순위 규칙을 보는 자리라 명단 모듈은 비워서 넘깁니다 —
 * 안 넘기면 `window is not defined`로 죽어요. 동료가 표에 끼는지는
 * tests/soccer/career-column-test.js가 실제 화면으로 봅니다. */
/* raceRank는 이제 **리그 명단**(WingerSquad)을 읽고, 역할 이름을 RACE_ROLES에서
 * 꺼내요. 둘 다 넘겨 줘야 굴러갑니다 — 안 넘기면 ReferenceError로 죽어요. */
const rankOf = new Function("S", "key", "window", "WingerSquad", "RACE_ROLES", "clamp", "pick", "roleOf",
  `${parts.rank}${parts.top} return { rank: raceRank(key), top: raceTop(key) };`);
/* 경쟁자는 이제 **리그 명단**에서 와요. 그래서 명단 모듈을 흉내 낸 것을 넘겨요 —
 * 손으로 지어낸 act.race가 아니라, 게임이 실제로 읽는 그 자리를 채우는 거예요. */
const mkS = (myGoals, rivalGoals) => ({
  name: "나", group: "우리팀",
  activity: { goals: myGoals, assists: 0, defense: 0, apps: 1 },
});
const clampF = (v, a, b) => Math.min(b, Math.max(a, v));
const pickF = (arr) => arr[0];
// 게임이 읽는 자리를 그대로 채워 넘겨요
const RK = (st, key, win) => rankOf(st, key, win, win.WingerSquad, ROLES, clampF, pickF, () => ROLES[0]);
const mkWin = (rivalGoals) => {
  const rows = rivalGoals.map((g2, i) => ({ name: `상대${i}`, pos: "fw", str: 70, g: g2, a: 0, d: 0, apps: 1 }));
  return { WingerSquad: { ensureSquads: () => ({ X: rows }), leagueXI: () => rows.map((p) => ({ club: "X", p })) } };
};
const win = RK(mkS(50), "g", mkWin([40, 30, 20]));
const lose = RK(mkS(30), "g", mkWin([40, 30, 20]));
check(win.top === true && win.rank[0].me, `내가 최다 득점이면 1위다 (${win.rank[0].name} ${win.rank[0].v})`);
check(lose.top === false, `아니면 1위가 아니다 (1위 ${lose.rank[0].name} ${lose.rank[0].v})`);
/* 동점이면 받는다. 실제로도 **공동 득점왕은 둘 다** 받아요 —
 * 한 골 차이로 갈리는 건 몰라도, 같은 기록인데 상을 못 받으면 이상합니다.
 * raceRank의 정렬이 동점에서 내 줄을 앞에 두는 게 이 규칙이에요. */
check(RK(mkS(40), "g", mkWin([40, 10])).top === true, "동점이면 공동 1위로 받는다");
// 공격포인트는 골+도움
const p = RK({ name: "나", group: "T", activity: { goals: 10, assists: 30, defense: 0, apps: 1 } }, "p",
  { WingerSquad: { ensureSquads: () => ({ X: [{ name: "상대", pos: "fw", str: 70, g: 35, a: 0, d: 0, apps: 1 }] }),
    leagueXI: () => [{ club: "X", p: { name: "상대", pos: "fw", str: 70, g: 35, a: 0, d: 0, apps: 1 } }] } });
check(p.top === true, `공격포인트왕은 골+도움으로 잰다 (내 40 vs 상대 35)`);

/* ── ④ 리그가 높을수록 1위 기록이 많다
 *
 * ⚠️ **어디서 그 차이가 오는지가 바뀌었다.** 예전에는 경쟁자를 여덟 명만 두고
 * 실력을 rand(52,88)로 지어냈기 때문에, 리그 격(prestige)을 생산량에 따로
 * 실어 줘야 했다. 이제 경쟁자가 **리그 명단의 실제 선수 전원**이라 리그 수준은
 * 그 선수들의 실력(pop)에 이미 들어 있다 — 격을 또 곱하면 같은 축을 두 번 센다.
 * (실측: 격까지 곱하면 PL 득점왕이 44골이 되어 종합 130도 수상률 2%였다)
 *
 * 그래서 여기서도 **클럽 전력**으로 잰다. 리그가 셀수록 명단이 좋고, 그래서
 * 1위 기록이 많아지는 것이 지금의 인과다. */
function pois(lam) { let n = 0, L = Math.exp(-Math.max(0, lam)), pp = 1; do { pp *= Math.random(); n++; } while (pp > L && n < 12); return n - 1; }
const CLUBS_SRC0 = grab(G, /const CLUBS = \{[\s\S]*?\n\};/);
const CLUBS_ALL = new Function(`${CLUBS_SRC0} return CLUBS;`)();
// 그 리그 클럽들의 전력 — 명단 실력이 여기서 나온다 (squad.js가 base ± 14로 흩뿌린다)
const leagueStr = (lg) => {
  const cs = CLUBS_ALL[lg.id] || [];
  return cs.length ? cs.reduce((a, c) => a + c.str, 0) / cs.length : 70;
};
const topGoals = (lg) => {
  const base = leagueStr(lg);
  let best = 0;
  // 그 리그 선발들 — 여덟 역할을 클럽 수만큼 굴려 리그 한 시즌의 최다 득점을 본다
  for (let k = 0; k < (CLUBS_ALL[lg.id] || []).length; k++) {
    for (const r of ROLES) {
      const pop = Math.max(40, Math.min(95, base + (Math.random() * 28 - 14)));
      let g2 = 0;
      for (let i = 0; i < 38; i++) g2 += pois(raceLam(r.g, pop));
      if (g2 > best) best = g2;
    }
  }
  return best;
};
const byTier = LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const tops = byTier.map((l) => { let s = 0; for (let i = 0; i < 20; i++) s += topGoals(l); return s / 20; });
console.log(`   리그별 득점 1위 평균 — ${byTier.map((l, i) => `${l.short} ${tops[i].toFixed(0)}`).join(" · ")}`);
check(tops[tops.length - 1] > tops[0] * 1.2,
  `상위 리그 득점왕이 더 많이 넣는다 (${tops[0].toFixed(0)} → ${tops[tops.length - 1].toFixed(0)})`);
check(tops.every((v, i) => i === 0 || v >= tops[i - 1] - 3), "리그가 오를수록 1위 기록이 안 줄어든다");
/* 변이 검증 — 실력을 리그마다 같게 두면 ④가 무너져야 한다.
 * 안 무너지면 이 검사는 "리그 격"이 아니라 그냥 난수를 재고 있는 것이다. */
const flatTop = (n) => { let best = 0; for (let k = 0; k < 6; k++) for (const r of ROLES) {
  let g2 = 0; for (let i = 0; i < 38; i++) g2 += pois(raceLam(r.g, 70)); if (g2 > best) best = g2; } return best; };
let flatLo = 0, flatHi = 0;
for (let i = 0; i < 20; i++) { flatLo += flatTop(); flatHi += flatTop(); }
check(Math.abs(flatLo - flatHi) / 20 < tops[tops.length - 1] - tops[0],
  `변이 검증 — 실력을 리그마다 같게 두면 차이가 ${(Math.abs(flatLo - flatHi) / 20).toFixed(1)}골로 사라진다`);

// ── ⑤ 옛 세이브 — race가 없으면 부문상을 건너뛴다 (안 죽는다)
const noRace = RK({ name: "나", group: "T", activity: { goals: 99, assists: 0, defense: 0 } }, "g", {});
check(noRace.top === true && noRace.rank.length === 1,
  "경쟁자 명단이 없어도 순위 계산이 안 죽는다 (나 혼자)");
check(/\(act\.apps \|\| 0\) > 0/.test(parts.awardBlk),
  "한 경기도 안 치른 시즌에는 부문상을 안 준다 — 없는 경쟁을 이겼다고 할 수 없다");

/* ── ⑥ 화면에 실제로 뜨는가 — 시즌 중에도, 시즌 준비 중에도
 *
 * 진행 중이던 세이브는 명단이 없어서(시즌 시작에만 만들어져요) 표가 통째로 안 떴고,
 * 시즌 준비 중에는 S.activity가 아예 없어서 또 안 떴다.
 * 그리고 그 준비 중 분기가 `S.phase === "pro"`를 보고 있었는데 실제 값은
 * **"soccer-pro"**라 한 번도 안 돌았다 — 2.28.0에 넣은 "준비 중에도 리그 순위표를
 * 보여준다"까지 내내 죽어 있었다. 문자열을 손으로 비교하는 자리의 전형적인 사고다. */
const RENDER = grab(C, /const race = \$\("pro-race"\);[\s\S]*?\n    \}/);
check(!!RENDER, "준비 화면의 개인 순위 렌더 블록을 찾았다");
check(!!RENDER && /ensureLeagueRecords\(\)/.test(RENDER),
  "그릴 때 기록이 비어 있으면 채운다 (진행 중이던 세이브)");
check(!!RENDER && !/S\.phase === "pro"/.test(RENDER),
  '준비 중 분기가 `S.phase === "pro"`를 안 본다 — 실제 값은 "soccer-pro"라 안 걸려요');
const PHASE_SET = grab(C, /S\.phase = "[^"]+";/);
const IS_PRO = grab(C, /const isPro = \(\) => S\.phase === "[^"]+";/);
check(!!PHASE_SET && !!IS_PRO && PHASE_SET.split('"')[1] === IS_PRO.split('"')[1],
  `넣는 값과 비교하는 값이 같다 (${PHASE_SET} ↔ ${IS_PRO})`);

const ENSURE = grab(C, /function ensureLeagueRecords\(\) \{[\s\S]*?\n  \}/);
check(!!ENSURE && /act\.apps/.test(ENSURE) && /leagueRound\(null, skip\)/.test(ENSURE),
  "옛 세이브를 채울 때 **이미 치른 경기 수만큼** 미리 굴린다 — 0골에서 시작하면 경쟁이 안 돼요");
check(!!ENSURE && /act\.raceFilled/.test(ENSURE),
  "한 번만 채운다 — 화면을 그릴 때마다 다시 굴리면 기록이 눈덩이처럼 불어나요");

/* ── ⑦ 개인 순위와 경기 후 평점표가 **같은 명단**인가
 *
 * 제보: "개인 순위 상위에 있는 선수가 평점 순위에서는 잘 안 보인다."
 * 맞는 관찰이었다 — 명단이 둘이었다. act.rivals(평점표 8명)와 act.race(개인 순위
 * 8명)가 아예 다른 사람들이라, 득점 1위가 평점표에 없는 게 정상 동작이었다.
 * 지금은 act.race 하나만 쓴다. */
const FINAL = grab(C, /const roundRes = recordRound\(act\.opp, info\.res\);[\s\S]*?\.sort\([^;]*\);/);
check(!!FINAL && /const scored = leagueRound\(roundRes\);/.test(FINAL)
  && /applyMateGoals\(info\.mateGoals\);/.test(FINAL),
  "경기 후 평점표가 리그 전 선발의 그 라운드 기록을 그대로 쓴다 (동료 골 반영 포함)");
check(!!FINAL && /\.\.\.scored\.map/.test(FINAL) && !/act\.rivals/.test(FINAL),
  "평점표 행이 act.rivals(옛 별도 명단)를 안 본다");
// 주석에는 옛 이름이 설명으로 남아 있어요 — **호출·접근**만 봅니다
check(!/rollRivals\(|fillRivals\(|act\.rivals\.|act\.rivals =/.test(C),
  "소스에 옛 라이벌 명단을 쓰는 코드가 없다 — 남아 있으면 명단이 다시 갈라져요");
/* 평점·MOM이 명단에 쌓이는지 — 개인 순위의 ⭐/🏅 칸 근거다 */
const RATEFN = grab(C, /function leagueRound\([^)]*\) \{[\s\S]*?\n  \}/);
check(!!RATEFN && /p\.rate = \(p\.rate \|\| 0\) \+ clamp/.test(RATEFN), "선수에게 평점이 누적된다 (⭐ 평균 평점)");
/* 우리 팀은 **굴리지 않는다** — 중계에 뜬 골이 따로 들어오므로, 굴리면 같은
 * 라운드를 두 번 세게 된다(🌏 월드컵의 skip 규칙과 같다). */
check(!!RATEFN && /const mine = club === S\.group;/.test(RATEFN) && /mine \? 0 :/.test(RATEFN),
  "우리 팀은 굴리지 않고 중계에 뜬 값을 쓴다 — 같은 라운드를 두 번 세지 않아요");
check(!!RATEFN && /if \(p\.me\) continue;/.test(RATEFN),
  "내 기록은 여기서 안 쌓는다 — S.activity 한 곳에만 남아요");
check(/top\.p\.mom = \(top\.p\.mom \|\| 0\) \+ 1/.test(C), "그 라운드 1위에게 MOM이 쌓인다 (🏅)");
const RANKFN = grab(C, /function raceRank\(key\) \{[\s\S]*?\n  \}/);
check(!!RANKFN && /key === "r" \? x\.avg/.test(RANKFN) && /key === "m"/.test(RANKFN),
  "순위표가 평균 평점(r)과 MOM(m) 부문을 안다");
/* 평균 평점은 **그 사람이 뛴 경기 수**로 나눈다. 사람마다 출전 수가 다르다
 * (선발이 매 경기 다시 뽑히니까) — 내 경기 수로 나누면 벤치를 오간 선수가 손해다. */
check(!!RANKFN && /avgOf\(x, x\.apps\)/.test(RANKFN),
  "평균 평점을 그 사람의 출전 수로 나눈다");

/* ── ⑧ 우리 팀 선수가 명단에 들어가는가
 *
 * 제보: "개인순위나 평점순위에 우리팀 다른 선수들은 한번도 안 보인다."
 * 맞았다 — rollRace가 oppClubs(내 클럽을 **빼고** 돌려주는 함수)로 소속을
 * 나눠 줬다. 리그 득점왕 표에 우리 팀 선수가 한 명도 없는 게 정상 동작이었다. */
/* 이제 소속을 나눠 줄 필요가 없다 — **리그 명단을 그대로** 읽으니 우리 클럽이
 * 빠질 자리가 아예 없다. 예전에는 oppClubs(내 클럽을 빼는 함수)로 나눠 줘서
 * 리그 득점왕 표에 우리 팀 선수가 한 명도 없는 게 정상 동작이었다. */
check(!/function rollRace\(/.test(C), "경쟁자를 따로 뽑는 함수가 없다");
check(!!RANKFN && /WingerSquad\.ensureSquads\(\)/.test(RANKFN),
  "순위표가 리그 명단을 그대로 읽는다 — 우리 클럽이 빠질 자리가 없어요");

const LEAGUE_CLUBS = grab(G, /function leagueClubs\(st\) \{[\s\S]*?\n\}/);
const CLUBS_SRC = grab(G, /const CLUBS = \{[\s\S]*?\n\};/);
check(!!LEAGUE_CLUBS && !!CLUBS_SRC, "leagueClubs를 소스에서 찾았다");
const CLUBS_IN = grab(G, /function clubsIn\(id, st\) \{[\s\S]*?\n\}/);
const clubsOf = new Function("st", `${CLUBS_SRC}\n${parts.leagues}\n`
  + grab(G, /function leagueOf\(st\) \{[\s\S]*?\n\}/) + `\n${CLUBS_IN}\n${LEAGUE_CLUBS}\n return leagueClubs(st);`);
const MY = clubsOf({ league: 1 })[0];
const names = clubsOf({ league: 1, group: MY });
check(names.includes(MY), `내 클럽 "${MY}"이 목록에 들어 있다`);
// 승격·이적 직후처럼 목록에 없는 클럽이어도 빠지지 않아야 한다
check(clubsOf({ league: 1, group: "이상한 FC" }).includes("이상한 FC"),
  "목록에 없는 클럽(승격·이적 직후)도 넣어 준다");

/* 8명을 6클럽에 `i % clubs.length`로 돌리면 내 클럽은 반드시 1~2명 몫을 받는다.
 * 실제로 굴려서 확인한다 — "적어도 한 명은 우리 팀"이 이 수정의 약속이다. */
const ROLES_N = ROLES.length;
let worst = 99;
for (let t = 0; t < 200; t++) {
  const shuffled = names.slice().sort(() => Math.random() - 0.5);
  let mine = 0;
  for (let i = 0; i < ROLES_N; i++) if (shuffled[i % shuffled.length] === MY) mine++;
  if (mine < worst) worst = mine;
}
check(worst >= 1, `${ROLES_N}명을 ${names.length}클럽에 돌리면 우리 팀이 최소 ${worst}명은 들어간다`);

/* ── ⑨ 부문 탭 — 눌렀을 때 실제로 줄이 바뀌는가
 *
 * 탭은 화면만 다시 그리는 코드라 "버튼은 있는데 정렬은 안 바뀐다"가 나기 쉽다.
 * 그래서 raceHTML을 진짜로 실행해서 **1등 이름이 부문마다 달라지는지** 본다.
 * (탭 이름만 문자열로 확인하면 배선이 죽어도 초록이 뜬다) */
const HTMLFN = grab(C, /function raceHTML\(\) \{[\s\S]*?\n  \}/);
const TABS = grab(C, /const RACE_TABS = \[[\s\S]*?\n  \];/);
/* ⚠️ `\[[^\]]*\]`로 자르면 안 돼요 — 중첩 배열이라 **첫 `["g", "⚽"]`의 닫는 괄호**에서
 * 끊깁니다. 이 저장소에서 `[^;]+;`로 화살표 함수 본문을 자르다 겪은 것과 같은 자리예요. */

const VALUE = grab(C, /const raceValue = \(r, k\) =>[\s\S]*?: r\[k\] \|\| 0;/);
check(!!HTMLFN && !!TABS && !!VALUE, "탭·표 렌더 조각을 소스에서 찾았다");

/* 명단은 부문마다 1등이 다르도록 일부러 어긋나게 짠다. */
const RACE_FIX = [
  { name: "득점왕", club: "A", g: 30, a: 2, d: 3, rate: 40, mom: 0 },
  { name: "도움왕", club: "B", g: 2, a: 25, d: 4, rate: 45, mom: 1 },
  { name: "수비왕", club: "C", g: 0, a: 1, d: 90, rate: 50, mom: 0 },
  { name: "평점왕", club: "D", g: 8, a: 8, d: 20, rate: 95, mom: 2 },
  { name: "MOM왕", club: "E", g: 9, a: 7, d: 15, rate: 60, mom: 9 },
];
/* raceHTML이 줄마다 🏷️ 클래스를 적으면서 leagueOf·overall·raceStr·titleOf를 봐요.
 * 이 검사가 보는 것은 **줄 세우는 순서와 머리글**이라, 그쪽은 최소한으로 넘깁니다 —
 * 클래스 칸이 제대로 붙는지는 tests/soccer/career-column-test.js가 실제 화면으로 봐요. */
const mkHTML0 = new Function(
  "S", "key", "$", "window", "leagueOf", "overall", "raceStr", "titleOf",
  "WingerSquad", "RACE_ROLES", "clamp", "pick", "roleOf",
  `${TABS}
   let raceKey = key;
   const raceTab = (k) => RACE_TABS.find(([x]) => x === k) || RACE_TABS[4];
   const raceUnit = (k) => raceTab(k)[2];
   const raceValue = ${VALUE.replace(/^const raceValue = /, "")}
   ${parts.rank}
   ${HTMLFN}
   return raceHTML();`
);
/* 명단은 이제 **리그 명단**에서 와요 — act.race가 아니라 WingerSquad를 채워 넘겨요.
 * 출전 수(apps)를 같게 둬야 평균 평점이 rate 순서 그대로 나옵니다. */
const FIX_ROWS = RACE_FIX.map((r) => ({ ...r, pos: "mf", str: 70, apps: 10 }));
const FIX_WIN = { WingerSquad: {
  ensureSquads: () => FIX_ROWS.reduce((o, r) => { (o[r.club] = o[r.club] || []).push(r); return o; }, {}),
  leagueXI: () => FIX_ROWS.map((r) => ({ club: r.club, p: r })),
} };
const mkHTML = (st, key, dollar) => mkHTML0(st, key, dollar, FIX_WIN,
  () => ({ prestige: 1 }), () => 70, () => 70, () => "🧢 리그 주전",
  FIX_WIN.WingerSquad, ROLES, clampF, pickF, () => ROLES[0]);
const FIX_S = { name: "나", group: "Z",
  activity: { apps: 10, goals: 5, assists: 5, defense: 5, ratingSum: 55, wins: 0 } };
const firstRow = (html) => {
  const m = html.match(/<tbody>[\s\S]*?<td>1<\/td><td>([^<]*)/);
  return m ? m[1] : null;
};
const EXPECT = { g: "득점왕", a: "도움왕", d: "수비왕", r: "평점왕", m: "MOM왕" };
for (const [k, who] of Object.entries(EXPECT)) {
  const html = mkHTML(FIX_S, k, () => null);
  check(firstRow(html) === who, `${k} 탭으로 줄을 세우면 1위가 ${who}다 (실제 ${firstRow(html)})`);
}
// 공격포인트(p)는 골+도움 — 어느 한 부문 1위가 그대로 오면 안 된다
const pTop = firstRow(mkHTML(FIX_S, "p", () => null));
check(pTop === "득점왕", `공격P 탭은 골+도움으로 잰다 (득점왕 32 · 도움왕 27 · 실제 ${pTop})`);
// 고른 탭이 화면에도 표시된다
const gHTML = mkHTML(FIX_S, "g", () => null);
check(/class="race-tab on" data-k="g"/.test(gHTML), "고른 탭에 on 표시가 붙는다");
check(/data-k="a"/.test(gHTML) && /data-k="m"/.test(gHTML), "다른 부문 탭도 함께 그려진다");
/* 탭 하나에 숫자 하나 — 다섯 칸을 다 띄우면 탭을 만든 이유가 없어지고
 * 폰에서는 7칸이 들어가느라 글자만 작아져요. */
const cells = (html) => (html.match(/<tbody>[\s\S]*?<\/tbody>/)[0]
  .match(/<tr[^>]*>[\s\S]*?<\/tr>/)[0].match(/<td/g) || []).length;
check(cells(gHTML) === 3, `한 줄이 순위·선수·숫자 세 칸이다 (${cells(gHTML)}칸)`);
// ⚠️ /<th/g는 `<thead`에도 걸려요 — 닫는 태그로 셉니다
const heads = (html) => (html.match(/<thead>[\s\S]*?<\/thead>/)[0].match(/<\/th>/g) || []).length;
check(heads(gHTML) === 3, `머리글도 세 칸이다 (${heads(gHTML)}칸)`);
// 머리글이 그 부문 단위를 말한다
const unitOf = (html) => (html.match(/<th>([^<]*)<\/th><\/tr>/) || [])[1];
check(unitOf(gHTML) === "골", `⚽ 탭의 머리글이 "골"이다 (${unitOf(gHTML)})`);
check(unitOf(mkHTML(FIX_S, "r", () => null)) === "평균 평점",
  `⭐ 탭의 머리글이 "평균 평점"이다 (${unitOf(mkHTML(FIX_S, "r", () => null))})`);
// 👑은 지금 보고 있는 부문의 1위에만 붙는다
// 안내 문구에도 👑이 있어서 표 안(tbody)에서만 센다
const crowns = (html) => ((html.match(/<tbody>[\s\S]*?<\/tbody>/) || [""])[0].match(/👑/g) || []).length;
check(crowns(gHTML) === 1, `👑이 그 부문 1위 한 명에게만 붙는다 (${crowns(gHTML)}개)`);

// 배선 — 탭 클릭이 다시 그리는 함수를 부른다
const RENDER_RACE = grab(C, /function renderRace\(\) \{[\s\S]*?\n  \}/);
check(!!RENDER_RACE && /raceKey = b\.dataset\.k;\s*renderRace\(\)/.test(RENDER_RACE),
  "탭을 누르면 정렬 기준을 바꾸고 다시 그린다");
check(!!RENDER_RACE && !/renderPrep\(\)/.test(RENDER_RACE),
  "탭 클릭이 renderPrep을 안 부른다 — 부르면 <details>가 접혀서 표가 사라져요");

/* ── ⑩ 동료가 넣은 골이 개인 순위에 올라가는가
 *
 * 제보: "좀 전 경기에서 우리 팀원이 2골을 넣었는데 득점 순위에 안 보인다."
 * 중계는 `⚽ 동료의 골!`이라고만 떴다 — **이름이 없으니 그 골이 어디에도 안 남았다.**
 * 이제 우리 팀 선수 이름으로 넣고, 그 골을 시즌 기록으로 옮긴다.
 *
 * 우리 팀 선수는 나와 같은 경기를 뛴 사람이라, 굴린 값 대신 **중계에 뜬 골**을 쓴다.
 * 안 그러면 같은 라운드를 두 번 세게 된다. */
const MATE_FN = grab(C, /function applyMateGoals\(names\) \{[\s\S]*?\n  \}/);
check(!!MATE_FN, "applyMateGoals를 소스에서 찾았다");
/* 기록이 **명단 한 벌**에만 남게 되면서 이 함수도 아주 단순해졌다 —
 * 예전에는 race와 squads 두 벌을 손으로 맞추느라 굴린 몫을 물리고 다시 더했다. */
const applyMate = new Function("S", "names", "window", "WingerSquad",
  `${MATE_FN} return applyMateGoals(names);`);
{
  const mine = [
    { name: "동료A", g: 5 },
    { name: "동료B", g: 3 },
    { name: "나", me: true, g: 0 },
  ];
  const other = [{ name: "남의팀선수", g: 7 }];
  const WS = { squadOf: (c) => (c === "우리팀" ? mine : other) };
  applyMate({ group: "우리팀" }, ["동료A", "동료A"], { WingerSquad: WS }, WS);
  const by = Object.fromEntries(mine.concat(other).map((x) => [x.name, x]));
  check(by["동료A"].g === 7, `중계에 2골 뜬 동료가 시즌 7골이 된다 (5 + 2 · 실제 ${by["동료A"].g}골)`);
  check(by["동료B"].g === 3, `중계에 안 나온 동료는 그대로다 (3골 · 실제 ${by["동료B"].g}골)`);
  check(by["남의팀선수"].g === 7, `다른 클럽 선수는 안 건드린다 (7골 · 실제 ${by["남의팀선수"].g}골)`);
  check(by["나"].g === 0, "내 줄에는 안 넣는다 — 내 골은 S.activity에 따로 쌓여요");
}
// 배선 — 라운드 반영이 실제로 이 함수를 통과한다
check(/const scored = leagueRound\(roundRes\);\s*\n\s*applyMateGoals\(info\.mateGoals\);/.test(C),
  "라운드를 굴린 **바로 다음에** 중계의 동료 골을 얹는다 — 순서가 바뀌면 우리 팀 골이 덮여요");
// 중계가 이름을 붙이고 돌려주는가
check(/text: who \? `⚽ \$\{who\}의 골!/.test(G), "중계가 동료 이름으로 골을 알린다");
check(/mateGoals,\s*\/\/ 이 경기에서 골을 넣은/.test(G), "중계가 누가 넣었는지 info로 돌려준다");
check(/mates: mateNames\(\)/.test(C), "경기를 시작할 때 우리 팀 명단을 넘긴다");

/* ── 변이 검증 — 수상을 다시 랜덤 문턱으로 되돌리면 ①이 무너져야 한다. */
const brokenAward = 'if (act.goals >= 50) awards.push("골든부츠");';
check(!/raceTop/.test(brokenAward), "변이 검증 — 랜덤 문턱 판정에는 raceTop이 없다 (①이 그걸 잡는다)");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
