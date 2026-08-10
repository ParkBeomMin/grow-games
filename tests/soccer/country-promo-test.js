/* 🌍 나라별 승강 사다리 — 나라마다 하나씩 돌고, 서로 안 이어진다.
 *
 * 예전에는 유럽에 가면 팀 성적이 아무 데도 안 닿았다(applyPromotion이 바로 null).
 * 순위표는 그려지는데 1위를 해도 꼴찌를 해도 아무 일이 없었다.
 *
 * 여기서 지키는 것:
 *   ① 잉글랜드 2부 1위(+승점차) → 잉글랜드 1부 승격 / 잉글랜드 1부 최하위 → 잉글랜드 2부 강등
 *   ② 잉글랜드 1부 1위 → 승격이 아니라 **우승 트로피** (사다리 맨 위)
 *   ③ 두 사다리가 **완전히 따로 돈다** — 오르는 길도 내려오는 길도 안 이어진다
 *   ④ 그래서 각 사다리 맨 아래(한국 3부 · 유로파)는 갈 데가 없어 아무 일도 안 일어난다
 *
 * applyPromotion을 소스에서 통째로 떼어 굴린다. 값을 옮겨 적지 않는다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  tiers: grab(SRC, /const COUNTRY_TIERS = \{[\s\S]*?\n  \};/),
  ladderOf: grab(SRC, /const ladderOf = \(id\) => \{[\s\S]*?\n  \};/),
  /* applyPromotion이 우승을 트로피로 적립해요 — 같이 안 떼면 ReferenceError로 죽습니다.
   * addTrophy는 LEAGUES와 leagueOf를 보는데 둘은 이미 위에서 떼어 왔어요. */
  addTrophy: grab(SRC, /function addTrophy\(title, leagueId, weight\) \{[\s\S]*?\n  \}/),
  apply: grab(SRC, /function applyPromotion\(\) \{[\s\S]*?\n  \}/),
  /* 승강은 이제 리그 명단을 실제로 맞바꿔요 — 그 조각도 함께 떼어 와야 돌아갑니다. */
  swap: grab(SRC, /function swapLeagues\(fromId, toId, kind\) \{[\s\S]*?\n  \}/),
  roster: grab(SRC, /const leagueRoster = \(id\) => clubsIn\(id, S\);/),
  clubsIn: grab(fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8"),
    /function clubsIn\(id, st\) \{[\s\S]*?\n\}/),
  clubStrOf: grab(fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8"),
    /function clubStrOf\(st\) \{[\s\S]*?\n\}/),
  /* 승격·우승에 상금이 붙어요 — 그 조각도 함께 떼어 와야 applyPromotion이 돌아갑니다. */
  prizes: [
    grab(SRC, /const TITLE_PRIZE = [^;]+;/),
    grab(SRC, /const PROMO_PRIZE = [^;]+;/),
    grab(SRC, /const CUP_PRIZE = [^;]+;/),
    grab(SRC, /const CUP_ROUND_PRIZE = [^;]+;/),
    grab(SRC, /const prizeOf = \(base, lgId\) => \{[\s\S]*?\n  \};/),
  ].join("\n"),
  traits: [
    grab(fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8"), /const COUNTRY_TRAIT = \{[\s\S]*?\n\};/),
    grab(fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8"), /function traitOf\(st\) \{[\s\S]*?\n\}/),
    grab(fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8"), /const traitMul = \(st, key\) => \{[\s\S]*?\n\};/),
  ].join("\n"),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  clubs: grab(GAME, /const CLUBS = \{[\s\S]*?\n\};/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

/* applyPromotion은 tableReady/tableRows/myTableRank/leagueOf/CLUBS/S를 본다.
 * 순위표는 테스트가 직접 만들어 넣는다 — 여기서 재는 건 '표를 보고 무엇을 정하나'다. */
/* 세 곳이 같은 조각을 쌓아요. 한 곳만 빠뜨리면 그 검사만 조용히 죽으니 한데 모읍니다. */
const PRE = (tiers, apply) => `${parts.leagues}
   ${parts.clubs}
   const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
   const tableReady = () => true;
   const tableRows = () => rowsIn;
   const myTableRank = () => rankIn;
   ${tiers}
   ${parts.ladderOf}
   ${parts.prizes}
   ${parts.traits}
   ${parts.clubsIn}
   ${parts.clubStrOf}
   ${parts.roster}
   const proLog = () => {};
   ${parts.addTrophy}
   ${parts.swap}
   ${apply}`;

const makeApply = () => new Function(
  "S", "rowsIn", "rankIn", "clamp",
  `${parts.leagues}
   ${parts.clubs}
   const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
   const tableReady = () => true;
   const tableRows = () => rowsIn;
   const myTableRank = () => rankIn;
   ${parts.tiers}
   ${parts.ladderOf}
   ${parts.prizes}
   ${parts.traits}
   ${parts.clubsIn}
   ${parts.clubStrOf}
   ${parts.roster}
   const proLog = () => {};
   ${parts.addTrophy}
   ${parts.swap}
   ${parts.apply}
   const move = applyPromotion();
   return { move, league: S.league };`
);
const clampFn = (v, a, b) => Math.min(b, Math.max(a, v));
const applyRaw = makeApply();
const apply = (S, rows, rank) => applyRaw(S, rows, rank, clampFn);

/* 리그 이름은 소스에서 읽는다 — 여기 옮겨 적으면 이름이 바뀌어도 안 들킨다.
 * 실제로 K리그1 → 한국 1부 → 다시 K리그1로 두 번 바뀌었다. */
const LEAGUE_TBL = new Function(`${parts.leagues} return LEAGUES;`)();
const NM = (id) => (LEAGUE_TBL.find((l) => l.id === id) || {}).name || `id ${id}`;
const LEAGUE_NAME = Object.fromEntries(LEAGUE_TBL.map((l) => [l.id, l.name]));
/* 6팀 순위표. gap을 주면 1위가 2위보다 그만큼 앞선다. */
const table = (gap) => [
  { name: "나", pts: 60 }, { name: "B", pts: 60 - gap },
  { name: "C", pts: 40 }, { name: "D", pts: 35 }, { name: "E", pts: 30 }, { name: "F", pts: 25 },
];
/* 정착 기간을 넘긴 상태로 둔다 — 여기서 보려는 건 사다리지 정착 규칙이 아니다.
 * (정착 규칙 자체는 promote-test.js가 본다) */
const state = (league) => ({ league, proYear: 9, leagueSince: 0, group: "레알 몬테", clubStr: 70,
  trophies: [], career: { years: [{ y: 8 }] } });

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const run = (league, rank, gap) => apply(state(league), table(gap == null ? 12 : gap), rank);

// ── ① 유럽 사다리 안에서 오르내린다
const up = run(2, 1);
check(up.move && up.move.kind === "up" && up.league === 3,
  `${NM(2)} 1위 → ${NM(3)} 승격 (${up.move ? up.move.to : "안 일어남"})`);

const chDown = run(3, 6);
check(chDown.move && chDown.move.kind === "down" && chDown.league === 2,
  `${NM(3)} 최하위 → ${NM(2)} 강등 (${chDown.move ? chDown.move.to : "안 일어남"})`);

/* 승점 차는 이제 승격을 막지 않아요 — **1위면 그 자리에서 올라갑니다.**
 * 예전에는 2위와 8점 차(PROMO_GAP)를 걸었는데, 리그를 우승하고도 아무 일이
 * 안 일어나는 시즌이 생겼고 왜 막혔는지도 화면에 안 나왔어요(제보: 세리에B 1위인데 그대로).
 * 이 검사는 그 옛 규칙을 지키고 있었습니다 — 무너진 게 아니라 규칙이 바뀐 거예요. */
const narrow = run(2, 1, 1);
check(narrow.move && narrow.move.kind === "up" && narrow.league === 3,
  `승점 1점 차 1위여도 ${NM(2)} → ${NM(3)} 승격한다 (${narrow.move ? narrow.move.to : "안 일어남"})`);

// ── ② 잉글랜드 1부 1위는 우승이지 승격이 아니다
const champ = run(3, 1);
check(champ.move && champ.move.kind === "title" && champ.league === 3,
  `${NM(3)} 1위 → 우승 트로피 (리그 그대로: ${LEAGUE_NAME[champ.league]})`);

/* ── ③ 두 사다리는 완전히 따로 돈다.
 * 한때 "잉글랜드 2부 최하위 → 한국 1부"로 이어 뒀는데, 유럽은 국내 리그를 이겨서 가는
 * 곳이 아니라 개인 성적으로 초청받는 무대라 그 통로를 없앴다.
 * 두 무대를 오가는 건 오직 이적 사다리(PROMOTE_HYPE)뿐이다. */
const exit = run(2, 6);
check(!exit.move && exit.league === 2,
  `${NM(2)} 최하위는 다른 나라로 안 내려온다 (리그 ${LEAGUE_NAME[exit.league]})`);

const k1top = run(1, 1);
check(k1top.move && k1top.move.kind === "title" && k1top.league === 1,
  `${NM(1)} 1위 → 우승 트로피, 다른 나라로 안 올라간다 (리그 ${LEAGUE_NAME[k1top.league]})`);

// 한국 1부 최하위는 국내 사다리 안에서 내려간다 (유럽과 무관)
const k1down = run(1, 6);
check(k1down.move && k1down.league === 4, `${NM(1)} 최하위 → ${NM(4)} (${LEAGUE_NAME[k1down.league]})`);

// ── ④ 각 사다리 맨 아래는 갈 데가 없다
const bottom = run(5, 6);
check(!bottom.move && bottom.league === 5, `${NM(5)} 최하위도 아무 일도 안 일어난다`);

// ── 전력도 함께 움직인다 (승격하면 새 리그 하위권, 강등되면 새 리그 상위권)
check(up.move && apply(state(2), table(12), 1).league === 3, "승격 뒤 리그가 실제로 바뀐다");
const strFor = (league, rank) => {
  const S = state(league);
  const A = new Function("S", "rowsIn", "rankIn", "clamp",
    PRE(parts.tiers, parts.apply) + `\n applyPromotion(); return S.clubStr;`);
  return A(S, table(12), rank, clampFn);
};
/* ⚠️ 승격 후와 강등 후를 그냥 비교하면 안 된다 — 도착하는 리그가 서로 달라서
 * 값이 우연히 같아질 수 있다(실제로 최상위 최약체와 한국 1부 최강이 둘 다 78이었다).
 * **같은 리그 안에서** 어느 자리에 놓이는지를 본다. */
const clubStrOf = new Function(parts.clubs + " return (id) => CLUBS[id].map((c) => c.str);");
const chStrs = clubStrOf()(3), eurStrs = clubStrOf()(2);
const upStr = strFor(2, 1), downStr = strFor(3, 6);
console.log(`   전력 — ${NM(3)} 승격 후 ${upStr} (${NM(3)} ${Math.min(...chStrs)}~${Math.max(...chStrs)})`
  + ` · ${NM(2)} 강등 후 ${downStr} (${NM(2)} ${Math.min(...eurStrs)}~${Math.max(...eurStrs)})`);
check(upStr === Math.min(...chStrs), `승격하면 새 리그의 최약체로 들어간다 (${upStr})`);
check(downStr === Math.max(...eurStrs), `내려가면 그 리그의 최강으로 들어간다 (${downStr})`);

/* ── 변이 검증 — 유럽 사다리를 없애면 ①③이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const brokenTiers = parts.tiers.replace(/en: \[[^\]]*\]/, "en: []");
if (brokenTiers === parts.tiers) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
const brokenApply = new Function("S", "rowsIn", "rankIn", "clamp",
  PRE(brokenTiers, parts.apply) + `\n return applyPromotion();`);
check(brokenApply(state(2), table(12), 1, clampFn) === null,
  `변이 검증 — 잉글랜드 사다리를 비우면 ${NM(2)} 1위에 아무 일도 안 일어난다`);

/* ── 이적 직후에도 승강이 그대로 굴러가는가
 *
 * 제보 둘이 같은 자리에서 나왔다.
 *  "프리미어리그 와서 팀이 꼴찌했던 것 같은데 강등을 안 한 것 같다."
 *  "세리에B 리그 1위면 리그 우승에 상위 리그로 올라가야 하는 거 아냐?"
 *
 * 원인은 정착 기간(PROMO_SETTLE)이었다. leagueSince는 **이적으로 리그가 바뀔
 * 때도 새로 서서**(moveToClub), 이적하면 두 시즌 동안 올라가지도 내려가지도
 * 않았다. 강등 쪽은 먼저 걷어냈고, 승격 쪽도 이제 걷어냈다 —
 * **"승격은 뭐든 상관없이 1위하면 되어야 해."** */
const justMoved = () => {
  const S = state(3);
  S.leagueSince = S.proYear;          // 방금 이적해 왔어요
  return S;
};
const movedDown = apply(justMoved(), table(0), 6);
check(movedDown.move && movedDown.move.kind === "down",
  `이적 직후 시즌이라도 꼴찌면 강등된다 (${movedDown.move ? movedDown.move.to : "안 일어남"})`);
const movedUp = apply((() => { const S = state(2); S.leagueSince = S.proYear; return S; })(), table(20), 1);
check(!!movedUp.move && movedUp.move.kind === "up",
  `이적 직후여도 1위면 승격한다 (${movedUp.move ? movedUp.move.to : "안 일어남"})`);
// 데뷔 시즌은 한 번만 면제된다
const rookie = state(3); rookie.career = { years: [] };
const rookieDown = apply(rookie, table(0), 6);
check(!rookieDown.move, `프로 데뷔 시즌은 꼴찌여도 면제된다 (${rookieDown.move ? rookieDown.move.to : "안 일어남"})`);

/* 변이 검증 — 강등에도 정착 기간을 다시 걸면 위 검사가 무너져야 한다. */
/* 변이 검증 — 강등에 정착 기간을 다시 걸면 위 검사가 무너져야 한다.
 * 상수는 이제 소스에 없으니 여기서 옛 규칙을 그대로 적어 되살린다(대조군). */
const settleBack = parts.apply.replace(
  "if (debutSeason) return null;",
  "if (S.leagueSince != null && S.proYear - S.leagueSince < 2) return null;"
);
if (settleBack === parts.apply) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
const settleBackRun = new Function(
  "S", "rowsIn", "rankIn", "clamp",
  `${parts.leagues}
   ${parts.clubs}
   const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
   const tableReady = () => true;
   const tableRows = () => rowsIn;
   const myTableRank = () => rankIn;
   ${parts.tiers}
   ${parts.ladderOf}
   ${parts.prizes}
   ${parts.traits}
   ${parts.clubsIn}
   ${parts.clubStrOf}
   ${parts.roster}
   const proLog = () => {};
   ${parts.swap}
   ${settleBack}
   return applyPromotion();`
);
check(!settleBackRun(justMoved(), table(0), 6, clampFn),
  "변이 검증 — 강등에 정착 기간을 다시 걸면 이적 직후 꼴찌가 안 내려간다");

/* ── 최종 순위를 승강 판정 **전에** 읽는가
 *
 * applyPromotion은 승격·강등이 나면 S.table을 null로 지운다. 그 뒤에 순위를
 * 읽으면 늘 null이라, 결산 화면과 통계 로그가 **승격한 시즌의 순위를 통째로
 * 잃는다.** 순서가 곧 값인 자리라 소스 순서로 지킨다. */
const FINISH = grab(SRC, /const leaguePlayed = S\.league;[\s\S]*?S\.career\.years\.push\([^;]*;/);
check(!!FINISH, "결산의 승강 처리 블록을 찾았다");
if (FINISH) {
  const iRank = FINISH.indexOf("const finalRank =");
  const iMove = FINISH.indexOf("applyPromotion()");
  check(iRank >= 0 && iMove >= 0 && iRank < iMove,
    "최종 순위를 applyPromotion보다 먼저 읽는다 (표가 지워지기 전에)");
  check(/rank: finalRank, teams: finalTeams/.test(FINISH),
    "시즌 기록에 팀 최종 순위와 팀 수가 남는다");
  check(/rank: finalRank, hype:/.test(SRC),
    "통계 로그도 같은 값을 쓴다 — 승격한 시즌의 순위가 null로 안 남아요");
}

/* ── 🌍 내가 승격하면 실제로 한 팀이 내려오는가
 *
 * 제보: "내가 승격하면 다른 한 팀은 강등되었어야지.
 *        경기·팀·선수·기록·점수 이런 건 전부 싱크가 잘 맞아야 해."
 *
 * 예전에는 S.league 값만 바꿨어요. 리그 명단(CLUBS)은 고정이라 내 클럽이 새 리그
 * 목록에 없는 유령 상태가 됐고, 순위표가 7팀이 되면서 매 라운드 한 팀이 쉬었습니다.
 * 지금은 자리를 맞바꿔요 — 양쪽 리그의 팀 수가 그대로여야 합니다. */
const rosterOf = new Function("S", "id",
  `${parts.clubs}\n${parts.clubsIn}\n return clubsIn(id, S);`);
const worldCheck = (kind) => {
  const fromId = kind === "up" ? 2 : 3;     // 챔피언십 ↔ 프리미어리그
  const toId = kind === "up" ? 3 : 2;
  const S = state(fromId);
  S.group = rosterOf(S, fromId)[0].name;    // 그 리그의 실제 클럽으로 시작해요
  S.clubStr = rosterOf(S, fromId)[0].str;
  const beforeFrom = rosterOf(S, fromId).length, beforeTo = rosterOf(S, toId).length;
  const beforeToNames = rosterOf(S, toId).map((c) => c.name);
  // apply는 { move, league }를 돌려줘요 — 안쪽 move를 꺼내야 해요
  const move = (kind === "up" ? apply(S, table(12), 1) : apply(S, table(0), 6)).move;
  const afterFrom = rosterOf(S, fromId), afterTo = rosterOf(S, toId);
  return { S, move, beforeFrom, beforeTo, afterFrom, afterTo, beforeToNames, fromId, toId };
};
for (const kind of ["up", "down"]) {
  const r = worldCheck(kind);
  const label = kind === "up" ? "승격" : "강등";
  check(!!r.move && r.move.kind === kind, `${label}이 실제로 일어난다 (${r.move ? r.move.kind : "안 일어남"})`);
  check(r.afterFrom.length === r.beforeFrom && r.afterTo.length === r.beforeTo,
    `${label} 뒤에도 양쪽 리그 팀 수가 그대로다 (${r.beforeFrom}/${r.beforeTo} → ${r.afterFrom.length}/${r.afterTo.length})`);
  check(r.afterTo.some((c) => c.name === r.S.group),
    `${label}하면 내 클럽이 새 리그 명단에 들어간다 (${r.S.group})`);
  check(!r.afterFrom.some((c) => c.name === r.S.group),
    `${label}하면 내 클럽이 떠난 리그에서 빠진다`);
  // 자리를 맞바꾼 팀이 실제로 반대쪽으로 갔는가
  const swapped = r.beforeToNames.filter((n) => !r.afterTo.some((c) => c.name === n));
  check(swapped.length === 1, `${label}하면 반대쪽에서 정확히 한 팀이 자리를 내준다 (${swapped.join(",") || "없음"})`);
  check(swapped.length === 1 && r.afterFrom.some((c) => c.name === swapped[0]),
    `그 팀이 내가 있던 리그에 실제로 들어간다 (${swapped[0]})`);
}
// 올라갈 때는 위 리그 최약체가, 내려갈 때는 아래 리그 최강이 자리를 바꿔요
{
  const up = worldCheck("up");
  const before = rosterOf({}, up.toId);
  const weakest = before.slice().sort((a, b) => a.str - b.str)[0];
  check(!up.afterTo.some((c) => c.name === weakest.name),
    `승격하면 위 리그 **최약체**(${weakest.name} ${weakest.str})가 내려온다`);
  const down = worldCheck("down");
  const lower = rosterOf({}, down.toId);
  const best = lower.slice().sort((a, b) => b.str - a.str)[0];
  check(!down.afterTo.some((c) => c.name === best.name),
    `강등되면 아래 리그 **최강**(${best.name} ${best.str})이 올라간다`);
}
// 안 건드린 리그는 세이브에 안 남아요 — 세이브가 쓸데없이 커지지 않게
{
  const r = worldCheck("up");
  const touched = Object.keys(r.S.world || {}).map(Number).sort((a, b) => a - b);
  check(touched.length === 2 && touched.includes(r.fromId) && touched.includes(r.toId),
    `승강이 일어난 두 리그만 세이브에 남는다 (${touched.join(",")})`);
}

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
