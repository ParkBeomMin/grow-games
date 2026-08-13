/* 🏆 리그 순위표 — 모든 팀의 경기 수가 같은가.
 *
 * 제보(실기기 스크린샷): 챔피언십 순위표의 경기 수가 26·22·22·22·23·22·19로
 * 제각각이었다. "경기수 차이는 왜 생기는 거지?"
 *
 * 팀이 **7개**였다. applyPromotion은 리그(S.league)만 바꾸고 클럽 이름(S.group)은
 * 그대로 두기 때문에, 승격하면 내 클럽이 새 리그의 CLUBS 목록(6팀)에 없다.
 * initTable이 그걸 **덧붙여서** 7팀이 됐고, recordRound가 남은 팀을 둘씩 짝지으면
 * 매 라운드 한 팀이 짝을 못 지어 쉬었다. 무작위로 쉬니 26경기와 19경기가 갈렸다.
 *
 * 지키는 것:
 *   ① 표의 팀 수는 항상 짝수다 (승격·이적으로 내 클럽이 목록에 없어도)
 *   ② 승격해 들어가면 팀 수가 그대로다 — 늘어나지 않는다 (약한 팀이 내려간 자리)
 *   ③ 내 클럽은 반드시 표에 있다
 *   ④ 여러 라운드를 굴려도 모든 팀의 경기 수가 1 이내로 붙어 있다
 *   ⑤ 홀수 표(옛 세이브)여도 쉬는 팀이 한 팀에 몰리지 않는다
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 실행한다. 직접 eval은 쓰지 않는다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  initTable: grab(SRC, /function initTable\(\) \{[\s\S]*?\n  \}/),
  /* recordRound가 이제 **스코어까지** 굴려요 — 골 산식도 함께 떼어 와야 굴러갑니다 */
  poisson: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  clubGoals: grab(SRC, /const GOAL_G0 = [\s\S]*?const clubGoals = [^;]+;/),
  record: grab(SRC, /function recordRound\([^)]*\) \{[\s\S]*?\n  \}/),
  clubs: grab(GAME, /const CLUBS = \{[\s\S]*?\n\};/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  clubStrOf: grab(GAME, /function clubStrOf\(st\) \{[\s\S]*?\n\}/),
  clubsIn: grab(GAME, /function clubsIn\(id, st\) \{[\s\S]*?\n\}/),
  roster: grab(SRC, /const leagueRoster = \(id\) => clubsIn\(id, S\);/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const shuffle = (xs) => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

const CLUBS = new Function(`${parts.clubs} return CLUBS;`)();
const LEAGUES = new Function(`${parts.leagues} return LEAGUES;`)();

/* initTable을 그대로 실행해 표를 만든다. S는 인자로 넘겨 클로저로 잡게 한다. */
const buildTable = (S) => new Function(
  "S", "clamp",
  `${parts.clubs}
   ${parts.leagues}
   const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
   ${parts.clubStrOf}
   ${parts.clubsIn}
   ${parts.roster}
   ${parts.initTable}
   initTable();
   return S.table;`
)(S, clamp);

const anyLeague = LEAGUES[0];
const listOf = (id) => CLUBS[id] || [];

// ── ①②③ 승격으로 목록에 없는 클럽이 되어도
for (const lg of LEAGUES) {
  const list = listOf(lg.id);
  if (!list.length) continue;
  const S = { league: lg.id, group: "이름없는 승격팀", clubStr: 61 };
  const t = buildTable(S);
  const names = t.rows.map((r) => r.name);
  check(t.rows.length % 2 === 0, `${lg.name} — 표가 짝수다 (${t.rows.length}팀)`);
  check(t.rows.length === list.length,
    `${lg.name} — 팀 수가 원래 리그와 같다 (${list.length} → ${t.rows.length})`);
  check(names.includes("이름없는 승격팀"), `${lg.name} — 내 클럽이 표에 있다`);
  // 밀려난 건 원래 목록에서 제일 약한 팀이어야 해요
  const weakest = list.slice().sort((a, b) => a.str - b.str)[0];
  check(!names.includes(weakest.name),
    `${lg.name} — 제일 약한 팀(${weakest.name} ${weakest.str})이 내려간 자리에 들어간다`);
}

// 목록 안의 클럽이면 아무것도 안 바뀐다
{
  const list = listOf(anyLeague.id);
  const S = { league: anyLeague.id, group: list[0].name, clubStr: list[0].str };
  const t = buildTable(S);
  check(t.rows.length === list.length && t.rows.every((r, i) => r.name === list[i].name),
    `원래 소속이면 표가 그대로다 (${t.rows.length}팀)`);
}

/* ── ④ 여러 라운드를 굴려도 경기 수가 붙어 있는가 — recordRound를 실제로 돌린다 */
const runRounds = new Function(
  "S", "rows", "n", "clamp", "shuffle", "Math",
  `const tableReady = () => true;
   const initTable = () => {};
   S.table = { rows };
   ${parts.poisson}
   ${parts.clubGoals}
   ${parts.record}
   for (let i = 0; i < n; i++) {
     const others = rows.filter((r) => r.name !== S.group);
     const opp = others[Math.floor(Math.random() * others.length)].name;
     recordRound(opp, ["W", "D", "L"][Math.floor(Math.random() * 3)]);
   }
   return rows;`
);
const mkRows = (names) => names.map((n, i) => ({ name: n, str: 50 + i * 5, w: 0, d: 0, l: 0 }));
const gp = (r) => r.w + r.d + r.l;

{
  const S = { group: "우리팀" };
  const rows = runRounds(S, mkRows(["우리팀", "B", "C", "D", "E", "F"]), 38, clamp, shuffle, Math);
  const counts = rows.map(gp);
  console.log(`   6팀 38라운드 — 경기 수 ${counts.join(" · ")}`);
  check(Math.max(...counts) - Math.min(...counts) === 0,
    `짝수 표에서는 모든 팀의 경기 수가 똑같다 (차이 ${Math.max(...counts) - Math.min(...counts)})`);
  check(counts.every((c) => c === 38), "모든 팀이 38경기를 치른다");
}

// ── ⑤ 홀수 표(옛 세이브)여도 한 팀에 몰리지 않는다
{
  const S = { group: "우리팀" };
  const rows = runRounds(S, mkRows(["우리팀", "B", "C", "D", "E", "F", "G"]), 38, clamp, shuffle, Math);
  /* 나는 매 라운드 뛰니까 홀수 표에서는 나만 경기 수가 많아요 — 그건 어쩔 수 없어요.
   * 여기서 지키는 건 **쉬는 부담이 다른 팀들 사이에 고르게 나뉘는가**입니다.
   * 예전에는 무작위로 쉬게 둬서 22 vs 19처럼 벌어졌어요. */
  const mine = rows.find((r) => r.name === "우리팀");
  const others = rows.filter((r) => r.name !== "우리팀").map(gp);
  const spread = Math.max(...others) - Math.min(...others);
  console.log(`   7팀(옛 세이브) 38라운드 — 나 ${gp(mine)} · 나머지 ${others.join(" · ")} (나머지 편차 ${spread})`);
  check(spread <= 1,
    `홀수 표여도 쉬는 부담이 고르게 나뉜다 (나머지 편차 ${spread}) — 예전엔 여기가 벌어졌어요`);
  check(gp(mine) === 38, `나는 매 라운드 뛴다 (${gp(mine)}경기)`);
}

/* ── 변이 검증 — 옛 initTable(덧붙이기)로 되돌리면 ①이 무너져야 한다.
 * 그리고 옛 recordRound(무작위 bye)로 되돌리면 ⑤가 무너져야 한다. */
{
  const brokenInit = parts.initTable
    .replace(/if \(S\.group && !rows\.some[\s\S]*?\n    \}/,
      `if (S.group && !rows.some((r) => r.name === S.group)) {
      rows.push({ name: S.group, str: 55, w: 0, d: 0, l: 0 });
    }`)
    .replace(/\/\/ 어떤 이유로든 홀수면[\s\S]*?\n    \}/, "");
  if (brokenInit === parts.initTable) { console.log("❌ initTable 변이 치환이 안 됐어요"); process.exit(1); }
  const oldTable = new Function(
    "S", "clamp",
    `${parts.clubs}\n${parts.leagues}
     const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
     ${parts.clubStrOf}\n${parts.clubsIn}\n${parts.roster}\n${brokenInit}\n initTable(); return S.table;`
  )({ league: anyLeague.id, group: "이름없는 승격팀", clubStr: 61 }, clamp);
  check(oldTable.rows.length % 2 === 1,
    `변이 검증 — 옛 방식(덧붙이기)이면 ${oldTable.rows.length}팀 홀수가 된다`);

  const brokenRec = parts.record.replace(/if \(rest\.length % 2 === 1\) \{[\s\S]*?\n    \}/, "");
  if (brokenRec === parts.record) { console.log("❌ recordRound 변이 치환이 안 됐어요"); process.exit(1); }
  const oldRun = new Function(
    "S", "rows", "n", "clamp", "shuffle", "Math",
    `const tableReady = () => true;
     const initTable = () => {};
     S.table = { rows };
     ${parts.poisson}
     ${parts.clubGoals}
     ${brokenRec}
     for (let i = 0; i < n; i++) {
       const others = rows.filter((r) => r.name !== S.group);
       const opp = others[Math.floor(Math.random() * others.length)].name;
       recordRound(opp, ["W", "D", "L"][Math.floor(Math.random() * 3)]);
     }
     return rows;`
  );
  let worst = 0;
  for (let t = 0; t < 30; t++) {
    const rows = oldRun({ group: "우리팀" }, mkRows(["우리팀", "B", "C", "D", "E", "F", "G"]), 38, clamp, shuffle, Math);
    const c = rows.filter((r) => r.name !== "우리팀").map(gp);
    worst = Math.max(worst, Math.max(...c) - Math.min(...c));
  }
  check(worst > 2, `변이 검증 — 무작위로 쉬게 두면 나머지 팀끼리도 ${worst}까지 벌어진다`);
}

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
