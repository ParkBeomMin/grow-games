/* 🇪🇺 유럽 무대 승강제 — 유로파 ↔ 챔피언스리그, 그리고 유로파 최하위의 국내 복귀.
 *
 * 예전에는 유럽에 가면 팀 성적이 아무 데도 안 닿았다(applyPromotion이 바로 null).
 * 순위표는 그려지는데 1위를 해도 꼴찌를 해도 아무 일이 없었다.
 *
 * 여기서 지키는 것:
 *   ① 유로파 1위(+승점차) → 챔스 승격 / 챔스 최하위 → 유로파 강등
 *   ② 챔스 1위 → 승격이 아니라 **우승 트로피** (사다리 맨 위)
 *   ③ 유로파 최하위 → **K리그1**로 (유럽 출전권 상실). 사다리를 건너는 유일한 자리
 *   ④ 두 사다리가 안 이어진다 — K리그1 1위는 우승이지 유로파 승격이 아니다
 *   ⑤ K리그3 최하위는 갈 데가 없어 아무 일도 안 일어난다
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
  domestic: grab(SRC, /const DOMESTIC_TIERS = \[[^\]]*\];/),
  euro: grab(SRC, /const EURO_TIERS = \[[^\]]*\];/),
  drop: grab(SRC, /const EURO_DROP = [^;]+;/),
  ladderOf: grab(SRC, /const ladderOf = \(id\) => [\s\S]*?: null\);/),
  gap: grab(SRC, /const PROMO_GAP = [^;]+;/),
  settle: grab(SRC, /const PROMO_SETTLE = [^;]+;/),
  apply: grab(SRC, /function applyPromotion\(\) \{[\s\S]*?\n  \}/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  clubs: grab(GAME, /const CLUBS = \{[\s\S]*?\n\};/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

/* applyPromotion은 tableReady/tableRows/myTableRank/leagueOf/CLUBS/S를 본다.
 * 순위표는 테스트가 직접 만들어 넣는다 — 여기서 재는 건 '표를 보고 무엇을 정하나'다. */
const makeApply = () => new Function(
  "S", "rowsIn", "rankIn",
  `${parts.leagues}
   ${parts.clubs}
   const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
   const tableReady = () => true;
   const tableRows = () => rowsIn;
   const myTableRank = () => rankIn;
   ${parts.domestic}
   ${parts.euro}
   ${parts.drop}
   ${parts.ladderOf}
   ${parts.gap}
   ${parts.settle}
   ${parts.apply}
   const move = applyPromotion();
   return { move, league: S.league };`
);
const apply = makeApply();

const LEAGUE_NAME = { 5: "K리그3", 4: "K리그2", 1: "K리그1", 2: "유로파리그", 3: "챔피언스리그" };
/* 6팀 순위표. gap을 주면 1위가 2위보다 그만큼 앞선다. */
const table = (gap) => [
  { name: "나", pts: 60 }, { name: "B", pts: 60 - gap },
  { name: "C", pts: 40 }, { name: "D", pts: 35 }, { name: "E", pts: 30 }, { name: "F", pts: 25 },
];
/* 정착 기간을 넘긴 상태로 둔다 — 여기서 보려는 건 사다리지 정착 규칙이 아니다.
 * (정착 규칙 자체는 promote-test.js가 본다) */
const state = (league) => ({ league, proYear: 9, leagueSince: 0, group: "레알 몬테", clubStr: 70, trophies: [] });

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const run = (league, rank, gap) => apply(state(league), table(gap == null ? 12 : gap), rank);

// ── ① 유럽 사다리 안에서 오르내린다
const up = run(2, 1);
check(up.move && up.move.kind === "up" && up.league === 3,
  `유로파 1위 → 챔피언스리그 승격 (${up.move ? up.move.to : "안 일어남"})`);

const chDown = run(3, 6);
check(chDown.move && chDown.move.kind === "down" && chDown.league === 2,
  `챔스 최하위 → 유로파리그 강등 (${chDown.move ? chDown.move.to : "안 일어남"})`);

// 승점 차가 모자라면 승격 안 됨 — 국내와 같은 문턱을 쓴다
const narrow = run(2, 1, 3);
check(!narrow.move && narrow.league === 2, "승점 차가 모자라면 유로파 1위여도 승격 안 된다");

// ── ② 챔스 1위는 우승이지 승격이 아니다
const champ = run(3, 1);
check(champ.move && champ.move.kind === "title" && champ.league === 3,
  `챔스 1위 → 우승 트로피 (리그 그대로: ${LEAGUE_NAME[champ.league]})`);

// ── ③ 유로파 최하위는 K리그1로 — 사다리를 건너는 유일한 자리
const exit = run(2, 6);
check(exit.move && exit.move.kind === "down" && exit.league === 1,
  `유로파 최하위 → K리그1 (${exit.move ? exit.move.to : "안 일어남"})`);
check(exit.move && exit.move.euroExit === true,
  "유럽 출전권 상실은 따로 표시된다 (문구가 '강등'과 달라야 해요)");

// ── ④ 두 사다리는 안 이어진다
const k1top = run(1, 1);
check(k1top.move && k1top.move.kind === "title" && k1top.league === 1,
  `K리그1 1위 → 우승 트로피, 유로파로 안 올라간다 (리그 ${LEAGUE_NAME[k1top.league]})`);
check(!k1top.move.euroExit, "우승에는 유럽 출전권 표시가 안 붙는다");

// K리그1 최하위는 국내 사다리 안에서 내려간다 (유럽과 무관)
const k1down = run(1, 6);
check(k1down.move && k1down.league === 4, `K리그1 최하위 → K리그2 (${LEAGUE_NAME[k1down.league]})`);

// ── ⑤ 국내 맨 아래는 갈 데가 없다
const bottom = run(5, 6);
check(!bottom.move && bottom.league === 5, "K리그3 최하위는 아무 일도 안 일어난다");

// ── 전력도 함께 움직인다 (승격하면 새 리그 하위권, 강등되면 새 리그 상위권)
check(up.move && apply(state(2), table(12), 1).league === 3, "승격 뒤 리그가 실제로 바뀐다");
const strFor = (league, rank) => {
  const S = state(league);
  const A = new Function("S", "rowsIn", "rankIn",
    `${parts.leagues}\n${parts.clubs}\n` +
    `const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];\n` +
    `const tableReady = () => true; const tableRows = () => rowsIn; const myTableRank = () => rankIn;\n` +
    `${parts.domestic}\n${parts.euro}\n${parts.drop}\n${parts.ladderOf}\n${parts.gap}\n${parts.settle}\n${parts.apply}\n` +
    `applyPromotion(); return S.clubStr;`);
  return A(S, table(12), rank);
};
/* ⚠️ 승격 후와 강등 후를 그냥 비교하면 안 된다 — 도착하는 리그가 서로 달라서
 * 값이 우연히 같아질 수 있다(실제로 챔스 최약체와 K리그1 최강이 둘 다 78이었다).
 * **같은 리그 안에서** 어느 자리에 놓이는지를 본다. */
const clubStrOf = new Function(parts.clubs + " return (id) => CLUBS[id].map((c) => c.str);");
const chStrs = clubStrOf()(3), k1Strs = clubStrOf()(1);
const upStr = strFor(2, 1), downStr = strFor(2, 6);
console.log(`   전력 — 챔스 승격 후 ${upStr} (챔스 ${Math.min(...chStrs)}~${Math.max(...chStrs)})`
  + ` · K리그1 복귀 후 ${downStr} (K리그1 ${Math.min(...k1Strs)}~${Math.max(...k1Strs)})`);
check(upStr === Math.min(...chStrs), `승격하면 새 리그의 최약체로 들어간다 (${upStr})`);
check(downStr === Math.max(...k1Strs), `내려가면 그 리그의 최강으로 들어간다 (${downStr})`);

/* ── 변이 검증 — 유럽 사다리를 없애면 ①③이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const brokenEuro = parts.euro.replace(/\[[^\]]*\]/, "[]");
if (brokenEuro === parts.euro) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
const brokenApply = new Function("S", "rowsIn", "rankIn",
  `${parts.leagues}\n${parts.clubs}\n` +
  `const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];\n` +
  `const tableReady = () => true; const tableRows = () => rowsIn; const myTableRank = () => rankIn;\n` +
  `${parts.domestic}\n${brokenEuro}\n${parts.drop}\n${parts.ladderOf}\n${parts.gap}\n${parts.settle}\n${parts.apply}\n` +
  `return applyPromotion();`);
check(brokenApply(state(2), table(12), 1) === null,
  "변이 검증 — 유럽 사다리를 비우면 유로파 1위에 아무 일도 안 일어난다");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
