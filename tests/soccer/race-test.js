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
const halfReset = grab(C, /S\.activity\.cb \+= 1;[\s\S]*?cbWins = 0;/);
check(!!halfReset && !/race/.test(halfReset),
  "반기가 바뀌어도 경쟁자 기록은 안 지운다 (시즌 내내 같은 8명이에요)");

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

/* ── ⑥ 화면에 실제로 뜨는가 — 시즌 중에도, 시즌 준비 중에도
 *
 * 진행 중이던 세이브는 명단이 없어서(시즌 시작에만 만들어져요) 표가 통째로 안 떴고,
 * 시즌 준비 중에는 S.activity가 아예 없어서 또 안 떴다.
 * 그리고 그 준비 중 분기가 `S.phase === "pro"`를 보고 있었는데 실제 값은
 * **"soccer-pro"**라 한 번도 안 돌았다 — 2.28.0에 넣은 "준비 중에도 리그 순위표를
 * 보여준다"까지 내내 죽어 있었다. 문자열을 손으로 비교하는 자리의 전형적인 사고다. */
const RENDER = grab(C, /const race = \$\("pro-race"\);[\s\S]*?\n    \}/);
check(!!RENDER, "준비 화면의 개인 순위 렌더 블록을 찾았다");
check(!!RENDER && /ensureRace\(\)/.test(RENDER),
  "그릴 때 명단이 비어 있으면 채운다 (진행 중이던 세이브)");
check(!!RENDER && !/S\.phase === "pro"/.test(RENDER),
  '준비 중 분기가 `S.phase === "pro"`를 안 본다 — 실제 값은 "soccer-pro"라 안 걸려요');
const PHASE_SET = grab(C, /S\.phase = "[^"]+";/);
const IS_PRO = grab(C, /const isPro = \(\) => S\.phase === "[^"]+";/);
check(!!PHASE_SET && !!IS_PRO && PHASE_SET.split('"')[1] === IS_PRO.split('"')[1],
  `넣는 값과 비교하는 값이 같다 (${PHASE_SET} ↔ ${IS_PRO})`);

const ENSURE = grab(C, /function ensureRace\(\) \{[\s\S]*?\n  \}/);
check(!!ENSURE && /act\.apps/.test(ENSURE),
  "옛 세이브를 채울 때 **이미 치른 경기 수만큼** 미리 굴린다 — 0골에서 시작하면 경쟁이 안 돼요");

/* ── ⑦ 개인 순위와 경기 후 평점표가 **같은 명단**인가
 *
 * 제보: "개인 순위 상위에 있는 선수가 평점 순위에서는 잘 안 보인다."
 * 맞는 관찰이었다 — 명단이 둘이었다. act.rivals(평점표 8명)와 act.race(개인 순위
 * 8명)가 아예 다른 사람들이라, 득점 1위가 평점표에 없는 게 정상 동작이었다.
 * 지금은 act.race 하나만 쓴다. */
const FINAL = grab(C, /const roundRes = recordRound\(act\.opp, info\.res\);[\s\S]*?\.sort\([^;]*\);/);
check(!!FINAL && /raceRate\(roundRes, applyMateGoals\(raceAdvance\(\), info\.mateGoals\)\)/.test(FINAL),
  "경기 후 평점표가 경쟁자 명단의 그 라운드 기록을 그대로 쓴다 (동료 골 반영 포함)");
check(!!FINAL && /\.\.\.scored\.map/.test(FINAL) && !/act\.rivals/.test(FINAL),
  "평점표 행이 act.rivals(옛 별도 명단)를 안 본다");
// 주석에는 옛 이름이 설명으로 남아 있어요 — **호출·접근**만 봅니다
check(!/rollRivals\(|fillRivals\(|act\.rivals\.|act\.rivals =/.test(C),
  "소스에 옛 라이벌 명단을 쓰는 코드가 없다 — 남아 있으면 명단이 다시 갈라져요");
/* 평점·MOM이 명단에 쌓이는지 — 개인 순위의 ⭐/🏅 칸 근거다 */
const RATEFN = grab(C, /function raceRate\(roundRes, deltas\) \{[\s\S]*?\n  \}/);
check(!!RATEFN && /r\.rate = \(r\.rate \|\| 0\) \+ clamp/.test(RATEFN), "경쟁자에게 평점이 누적된다 (⭐ 평균 평점)");
check(/top\.r\.mom = \(top\.r\.mom \|\| 0\) \+ 1/.test(C), "그 라운드 1위 경쟁자에게 MOM이 쌓인다 (🏅)");
const RANKFN = grab(C, /function raceRank\(key\) \{[\s\S]*?\n  \}/);
check(!!RANKFN && /key === "r" \? avg\(x\)/.test(RANKFN) && /key === "m"/.test(RANKFN),
  "순위표가 평균 평점(r)과 MOM(m) 부문을 안다");

/* ── ⑧ 우리 팀 선수가 명단에 들어가는가
 *
 * 제보: "개인순위나 평점순위에 우리팀 다른 선수들은 한번도 안 보인다."
 * 맞았다 — rollRace가 oppClubs(내 클럽을 **빼고** 돌려주는 함수)로 소속을
 * 나눠 줬다. 리그 득점왕 표에 우리 팀 선수가 한 명도 없는 게 정상 동작이었다. */
const ROLL = grab(C, /function rollRace\(\) \{[\s\S]*?\n  \}/);
check(!!ROLL && /leagueClubs\(S\)/.test(ROLL) && !/oppClubs\(S\)/.test(ROLL),
  "경쟁자 소속을 리그 전체 클럽에서 나눈다 (oppClubs는 내 클럽을 빼요)");

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
const mkHTML = new Function(
  "S", "key", "$",
  `${TABS}
   let raceKey = key;
   const raceTab = (k) => RACE_TABS.find(([x]) => x === k) || RACE_TABS[4];
   const raceUnit = (k) => raceTab(k)[2];
   const raceValue = ${VALUE.replace(/^const raceValue = /, "")}
   ${parts.rank}
   ${HTMLFN}
   return raceHTML();`
);
const FIX_S = { name: "나", group: "Z",
  activity: { apps: 10, goals: 5, assists: 5, defense: 5, ratingSum: 55, wins: 0, race: RACE_FIX } };
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
const MATE_FN = grab(C, /function applyMateGoals\(deltas, names\) \{[\s\S]*?\n  \}/);
check(!!MATE_FN, "applyMateGoals를 소스에서 찾았다");
const applyMate = new Function("S", "deltas", "names", `${MATE_FN} return applyMateGoals(deltas, names);`);
const mkDelta = (name, club, g0, dg) => ({ r: { name, club, g: g0 + dg }, dg, da: 0, dd: 0 });
{
  const S2 = { group: "우리팀" };
  const ds = [
    mkDelta("동료A", "우리팀", 5, 1),     // 굴려서 1골 — 중계에는 2골로 떴다
    mkDelta("동료B", "우리팀", 3, 2),     // 굴려서 2골 — 중계에는 0골
    mkDelta("남의팀선수", "상대팀", 7, 3), // 다른 클럽 — 굴린 값 그대로여야 한다
  ];
  applyMate(S2, ds, ["동료A", "동료A"]);
  const byName = Object.fromEntries(ds.map((d) => [d.r.name, d]));
  check(byName["동료A"].r.g === 7 && byName["동료A"].dg === 2,
    `중계에 2골 뜬 동료가 시즌 7골이 된다 (5 + 2 · 실제 ${byName["동료A"].r.g}골 / 이번 라운드 ${byName["동료A"].dg})`);
  check(byName["동료B"].r.g === 3 && byName["동료B"].dg === 0,
    `중계에 안 나온 동료는 굴린 골이 물려진다 (3골 유지 · 실제 ${byName["동료B"].r.g}골)`);
  check(byName["남의팀선수"].r.g === 10 && byName["남의팀선수"].dg === 3,
    `다른 클럽 선수는 굴린 값 그대로다 (10골 · 실제 ${byName["남의팀선수"].r.g}골)`);
}
// 배선 — 라운드 반영이 실제로 이 함수를 통과한다
check(/applyMateGoals\(raceAdvance\(\), info\.mateGoals\)/.test(C),
  "라운드 반영이 중계의 동료 골을 통과시킨다");
// 중계가 이름을 붙이고 돌려주는가
check(/text: who \? `⚽ \$\{who\}의 골!/.test(G), "중계가 동료 이름으로 골을 알린다");
check(/mateGoals,\s*\/\/ 이 경기에서 골을 넣은/.test(G), "중계가 누가 넣었는지 info로 돌려준다");
check(/mates: mateNames\(\)/.test(C), "경기를 시작할 때 우리 팀 명단을 넘긴다");

/* ── 변이 검증 — 수상을 다시 랜덤 문턱으로 되돌리면 ①이 무너져야 한다. */
const brokenAward = 'if (act.goals >= 50) awards.push("골든부츠");';
check(!/raceTop/.test(brokenAward), "변이 검증 — 랜덤 문턱 판정에는 raceTop이 없다 (①이 그걸 잡는다)");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
