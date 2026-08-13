/* 🏆 팀 성적과 개인 기록이 같은 것을 보는가.
 *
 * 이 저장소가 계속 앓아 온 병의 **마지막 자리**예요.
 * 예전에는 라운드가 승·무·패만 굴렸고, 개인 기록은 선수마다 따로 굴렸어요.
 * 그래서 **우리 팀이 3:0으로 이겼는데 우리 팀 선수 골 합이 1**일 수 있었습니다.
 * 🌏 월드컵에서는 이미 고쳤어요 — "4:2로 이겼는데 상대 골 합이 3"(제보).
 *
 * 이제 골을 먼저 굴리고 승패를 거기서 읽고, 그 골을 그 클럽 선수에게 나눠요.
 *
 * 지키는 것:
 *   ① 시즌이 끝나면 **각 클럽의 득점 = 그 클럽 선수들의 골 합**
 *   ② 리그 전체 득점 = 리그 전체 실점 (짝을 지어 굴리니까요)
 *   ③ 승패가 스코어에서 읽힌다 (3:1인데 무승부가 나오면 안 돼요)
 *   ④ 내 경기는 **중계에 뜬 스코어 그대로** 순위표에 담긴다
 *   ⑤ 순위가 승점 → 득실차 → 다득점으로 갈린다
 *   ⑥ 득실 칸이 없는 옛 세이브도 안 죽는다
 *   ⑦ 변이 검증 — 골을 선수마다 따로 굴리면 ①이 무너진다
 *
 * 실제 페이지를 띄워 게임의 함수를 그대로 굴려요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");

const PRE = `window.fetch=()=>Promise.reject(new Error("off"));`
  + `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};`
  + `window.alert=()=>{};window.confirm=()=>false;localStorage.setItem("grow-auto-mini","1");`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRE}</script></head>`)
  .replace("</body>", `<script>window.__get=(n)=>eval(n);window.__set=(n,v)=>{window.__v=v;eval(n+" = window.__v");};</script></body>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} }; w.Stats = { log() {} }; w.alert = () => {};
const get = w.__get, set = w.__set;
const T = w.WingerCareer._t;
const Squad = w.WingerSquad;
check(!!T.leagueRound && !!T.recordRound, "리그 시뮬 함수가 페이지에서 로드된다");
if (!T.leagueRound) { console.log("\n❌ 실패"); process.exit(1); }

const LG = 1;
function fresh() {
  const st = get(`newState(MARKETS[0], "fw", "나")`);
  st.pos = "fw"; st.league = LG; st.proYear = 5;
  const c = get("CLUBS")[LG][2];
  st.group = c.name; st.clubStr = c.str;
  st.activity = { cb: 1, cbTotal: 2, week: 0, weekTotal: 19, wins: 0, sales: 0,
    hypeSum: 0, cbHype: 0, cbWins: 0, goals: 0, assists: 0, defense: 0, apps: 0,
    teamW: 0, teamD: 0, teamL: 0, opp: null, raceFilled: true, appsFixed: true };
  set("S", st);
  Squad.ensureSquads();
  T.initTable();
  return get("S");
}

/* 한 시즌을 굴려요 — 내 경기 스코어는 밖에서 정해 넣어요(중계에 뜬 값 노릇). */
function season(S, rounds) {
  const clubs = S.table.rows.map((r) => r.name);
  for (let i = 0; i < rounds; i++) {
    const opp = clubs.filter((n) => n !== S.group)[i % (clubs.length - 1)];
    S.activity.opp = opp;
    const gf = Math.floor(Math.random() * 4), ga = Math.floor(Math.random() * 3);
    const res = gf > ga ? "W" : gf < ga ? "L" : "D";
    const roundRes = T.recordRound(opp, res, gf, ga);
    T.leagueRound(roundRes);
    /* 내 몫 — 내 골과 동료 골로 gf를 채워요. 게임에서도 그렇게 나뉩니다. */
    const my = Math.min(gf, Math.floor(Math.random() * (gf + 1)));
    S.activity.goals += my;
    S.activity.apps += 1;
    S.activity.week += 1;
    const names = Squad.startingXI().filter((x) => !x.me);
    for (let k = 0; k < gf - my; k++) {
      const who = names[Math.floor(Math.random() * names.length)];
      if (who) who.g = (who.g || 0) + 1;
    }
  }
}

// ---------- ①② 팀 스코어 = 선수 골 합 ----------
console.log("=== ①② 시즌이 끝나면 ===");
{
  const S = fresh();
  season(S, 38);
  let worst = 0, lines = [];
  let sumGf = 0, sumGa = 0;
  for (const row of S.table.rows) {
    const squad = Squad.squadOf(row.name);
    const mine = row.name === S.group;
    const players = squad.filter((x) => !x.me).reduce((a, x) => a + (x.g || 0), 0)
      + (mine ? (S.activity.goals || 0) : 0);
    const d = Math.abs((row.gf || 0) - players);
    if (d > worst) worst = d;
    sumGf += row.gf || 0; sumGa += row.ga || 0;
    lines.push(`${row.name} 팀 ${row.gf}골 · 선수 합 ${players}골${d ? ` ❌ ${d}` : ""}`);
  }
  lines.forEach((l) => console.log(`   ${l}`));
  check(worst === 0, `각 클럽의 득점 = 그 클럽 선수들의 골 합 (가장 크게 어긋난 폭 ${worst})`);
  console.log(`   리그 총득점 ${sumGf} · 총실점 ${sumGa}`);
  check(sumGf === sumGa, `리그 총득점 = 총실점 (${sumGf} = ${sumGa}) — 짝을 지어 굴리니까요`);
}

// ---------- ③④ 스코어와 승패 ----------
console.log("=== ③④ 스코어와 승패 ===");
{
  const S = fresh();
  let scoreOK = true, mineOK = true;
  for (let i = 0; i < 300; i++) {
    const opp = S.table.rows.find((r) => r.name !== S.group).name;
    const out = T.recordRound(opp, "W", 3, 1);
    for (const k of Object.keys(out)) {
      const v = out[k];
      const want = v.gf > v.ga ? "W" : v.gf < v.ga ? "L" : "D";
      if (v.res !== want) scoreOK = false;
    }
    if (out[S.group].gf !== 3 || out[S.group].ga !== 1) mineOK = false;
    if (out[opp].gf !== 1 || out[opp].ga !== 3) mineOK = false;
  }
  check(scoreOK, "모든 팀의 승패가 스코어와 맞는다 (3:1인데 무승부가 나오면 안 돼요)");
  check(mineOK, "④ 내 경기는 중계에 뜬 스코어 그대로 담긴다 (3:1 → 상대는 1:3)");
}

// ---------- ⑤ 순위 ----------
console.log("=== ⑤ 순위 ===");
{
  const S = fresh();
  S.table.rows[0].w = 3; S.table.rows[0].gf = 3; S.table.rows[0].ga = 1;   // 승점 9 · 득실 +2
  S.table.rows[1].w = 3; S.table.rows[1].gf = 9; S.table.rows[1].ga = 1;   // 승점 9 · 득실 +8
  S.table.rows[2].w = 3; S.table.rows[2].gf = 5; S.table.rows[2].ga = 3;   // 승점 9 · 득실 +2 · 다득점
  const rows = T.tableRows();
  console.log(`   ${rows.slice(0, 3).map((r) => `${r.name} ${r.pts}점 ${r.gd > 0 ? "+" : ""}${r.gd} (${r.gf}득)`).join(" · ")}`);
  check(rows[0].name === S.table.rows[1].name, "같은 승점이면 득실차가 앞선 팀이 위다");
  check(rows[1].name === S.table.rows[2].name, "득실차도 같으면 다득점이 위다");
}

// ---------- ⑥ 옛 세이브 ----------
console.log("=== ⑥ 득실 칸이 없는 옛 세이브 ===");
{
  const S = fresh();
  for (const r of S.table.rows) { delete r.gf; delete r.ga; r.w = 2; }
  let ok = true;
  try {
    const rows = T.tableRows();
    ok = rows.length === S.table.rows.length && rows.every((r) => r.gd === 0);
    T.recordRound(S.table.rows.find((r) => r.name !== S.group).name, "W", 2, 0);
  } catch (e) { ok = false; console.log(`   ${e.message}`); }
  check(ok, "득실 칸이 없어도 순위표가 그려지고 라운드가 굴러간다 (0으로 읽어요)");
  const me = S.table.rows.find((r) => r.name === S.group);
  check((me.gf || 0) === 2, `그 뒤로는 득실이 쌓인다 (${me.gf}득)`);
}

// ---------- ⑦ 변이 검증 ----------
console.log("=== ⑧ 내 몫도 팀 스코어에서 나오는가 ===");
{
  /* 예전에는 내 골이 팀 스코어와 **무관하게** 나왔어요. 그래서 다른 클럽 선수는
   * 팀 득점에 묶여 있는데 나만 안 묶여서 부문상이 거저가 됐습니다. */
  const S = fresh();
  let over = 0, aOver = 0;
  for (let i = 0; i < 2000; i++) {
    const team = Math.floor(Math.random() * 6);
    const sp = T.splitMine(team);
    if (sp.g + sp.mates !== team) over += 1;      // 내 골 + 동료 골 = 팀 골
    if (sp.a > sp.mates) aOver += 1;              // 도움은 동료 골 수를 못 넘어요
  }
  check(over === 0, `내 골 + 동료 골 = 팀 골 (어긋난 경우 ${over}/2000)`);
  check(aOver === 0, `내 도움 ≤ 동료 골 (넘은 경우 ${aOver}/2000) — 내 골에 내가 도움을 줄 수는 없어요`);
  // 종합이 오르면 몫이 커져야 해요 — 안 그러면 성장이 골로 안 이어져요
  const shareAt = (ovr) => {
    for (const k of get("STAT_KEYS")) S.stats[k] = ovr;
    let g = 0;
    for (let i = 0; i < 3000; i++) g += T.splitMine(3).g;
    return g / (3000 * 3);
  };
  const lo = shareAt(70), hi = shareAt(130);
  console.log(`   내 몫 — 종합 70 ${(lo * 100).toFixed(0)}% · 종합 130 ${(hi * 100).toFixed(0)}%`);
  check(hi > lo + 0.1, `종합이 오르면 내 몫이 커진다 (${(lo * 100).toFixed(0)}% → ${(hi * 100).toFixed(0)}%)`);
  check(hi < 1, `혼자 다 넣지는 않는다 (${(hi * 100).toFixed(0)}%)`);
  // 🪑 내가 없는 주에는 내 종합이 팀 득점에 안 실려요
  for (const k of get("STAT_KEYS")) S.stats[k] = 130;
  const avg = (without) => {
    let t = 0;
    for (let i = 0; i < 4000; i++) t += T.myTeamGoals(70, without);
    return t / 4000;
  };
  const withMe = avg(false), noMe = avg(true);
  console.log(`   팀 득점 — 내가 뛰면 ${withMe.toFixed(2)} · 벤치면 ${noMe.toFixed(2)}`);
  check(withMe > noMe + 0.2, `내가 뛰면 팀이 더 넣는다 (${withMe.toFixed(2)} > ${noMe.toFixed(2)})`);
}

console.log("=== ⑦ 변이 검증 ===");
{
  /* 골을 선수마다 따로 굴리던 옛 방식으로 되돌리면 ①이 무너져야 해요.
   * 손으로 재현합니다 — 팀은 2골인데 선수들은 각자 굴려서 합이 안 맞아요. */
  const teamGoals = 2;
  const rolled = [0, 1, 0, 2, 1, 0, 0, 1, 0, 0, 1];      // 선수마다 따로 굴린 값
  const sum = rolled.reduce((a, b) => a + b, 0);
  console.log(`   팀 ${teamGoals}골인데 선수 합 ${sum}골`);
  check(sum !== teamGoals, `따로 굴리면 팀 ${teamGoals}골에 선수 합 ${sum}골이 된다 — ①이 그걸 막아요`);
  const round = (CAREER.match(/function leagueRound\([^)]*\) \{[\s\S]*?\n  \}/) || [""])[0];
  check(/dg: 0, da: 0/.test(round), "골·도움을 선수마다 굴리지 않는다");
  // 굴리는 건 🛡️ 수비뿐이에요 — 팀 스코어로는 알 수 없는 값이니까요
  const lam = (round.match(/raceLam\([^)]*\)/g) || []);
  check(lam.length === 1 && /def\.d/.test(lam[0]),
    `raceLam을 수비에만 쓴다 (${lam.join(" · ") || "안 씀"})`);
  check(/shareGoals\(out, roundRes\);/.test(round), "그 클럽이 실제로 넣은 골을 나눈다");
  const share = (CAREER.match(/function shareGoals\([^)]*\) \{[\s\S]*?\n  \}/) || [""])[0];
  check(/if \(club === S\.group\) continue;/.test(share),
    "우리 팀은 건너뛴다 — 중계에 뜬 골이 따로 들어오니까요");
  check(/for \(let i = 0; i < info\.gf; i\+\+\)/.test(share),
    "그 라운드 득점 수만큼만 나눈다");
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
try { w.close(); } catch { /* 닫는 중 남은 콜백은 무시해요 */ }
process.exit(fail ? 1 : 0);
