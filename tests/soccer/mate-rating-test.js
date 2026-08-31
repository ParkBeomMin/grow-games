/* ⭐ 우리 팀 동료의 그 경기 평점이 **그 경기에 한 일**을 보는가.
 *
 * 제보: "5대1로 이겼는데 우리팀 다른 선수는 평점이 낮은거야?"
 * 맞는 관찰이었어요. 우리 팀 동료는 그 라운드에 한 일이 평점에 하나도 안 들어갔습니다.
 *
 *   · shareGoals가 우리 클럽을 통째로 건너뛰어서 → 골 0 · 도움 0
 *   · 수비는 `mine ? 0 : …`으로 묶여서              → 수비 0
 *   · 중계에 뜬 동료 골(applyMateGoals)은 **평점을 다 매긴 뒤에** 얹혀서
 *     두 골을 넣은 동료도 그 경기 평점은 0골짜리
 *
 * 그래서 동료 평점은 `기본 + 승패 + 흔들림`뿐이었어요 — 5:1이든 1:0이든 같았고,
 * 경기 후 평점표 상위는 늘 다른 클럽이 가져갔습니다.
 *
 * 지키는 것:
 *   ① 5:1 대승에서 **우리 팀에서도 높은 평점이 나온다** (옛 코드로는 천장이 6.1)
 *   ② 골을 받은 동료가 못 받은 동료보다 확실히 높다
 *   ③ 중계에 뜬 이름이 그대로 골 임자가 된다 — 화면과 표가 같은 것을 본다
 *   ④ 시즌을 굴리면 동료의 도움·수비 칸이 실제로 찬다 (예전에는 영원히 0)
 *   ⑤ 우리 팀 선수 골 합 + 내 골 = 순위표의 팀 득점
 *   ⑥ 변이 검증 — 중계 골을 안 넘기면(옛 계약) ①②④가 무너진다
 *
 * 실제 페이지를 띄워 게임의 leagueRound를 그대로 굴려요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

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

/* 한 라운드 — 내 경기 스코어는 밖에서 정해 넣어요(중계에 뜬 값 노릇).
 * mine을 안 넘기면 **옛 계약**(우리 팀은 통째로 건너뛰기)을 그대로 재현해요. */
function round(S, gf, ga, myGoals, mateNames, withMine) {
  const opp = S.table.rows.map((r) => r.name).filter((n) => n !== S.group)[0];
  S.activity.opp = opp;
  const res = gf > ga ? "W" : gf < ga ? "L" : "D";
  const rr = T.recordRound(opp, res, gf, ga);
  return T.leagueRound(rr, null, withMine ? { goals: mateNames, myGoals } : undefined);
}

// 그 경기에 뛴 동료 이름 — 게임의 mateNames()와 같은 명단(matchXI)이에요
const mates = () => Squad.matchXI().filter((x) => !x.me).map((x) => x.name);

/* 화면에 뜨는 평점(1~10)으로 바꿔요. leagueRound가 돌려주는 score는 ×10 눈금이에요.
 * 문턱은 검사에 박습니다 — 소스에서 읽어오면 계수를 바꿔도 따라와서 안 잡혀요. */
const shown = (r) => Math.min(10, Math.max(1, r.score / 10));

// ---------- ①②③ 5:1 대승 ----------
console.log("=== ①②③ 5:1로 이긴 라운드 ===");
const N = 300;
function bigWin(withMine) {
  let top = 0, scorer = 0, quiet = 0, nScorer = 0, nQuiet = 0, nameHit = 0, goals = 0;
  for (let i = 0; i < N; i++) {
    const S = fresh();
    const m = mates();
    // 중계: 내가 3골, 동료 둘이 하나씩 — 팀 5골
    const named = [m[0], m[1]];
    const out = round(S, 5, 1, 3, named, withMine);
    const ours = out.filter((r) => r.club === S.group);
    top = Math.max(top, ...ours.map(shown));
    for (const r of ours) {
      const isNamed = named.includes(r.p.name);
      if (isNamed) { scorer += shown(r); nScorer += 1; if (r.dg > 0) nameHit += 1; }
      else { quiet += shown(r); nQuiet += 1; }
      goals += r.dg;
    }
  }
  return { top, scorer: scorer / Math.max(1, nScorer), quiet: quiet / Math.max(1, nQuiet),
    nameHit, goals: goals / N };
}
const now = bigWin(true);
console.log(`   우리 팀 최고 평점 ${now.top.toFixed(2)} · 골 받은 동료 ${now.scorer.toFixed(2)} · 나머지 ${now.quiet.toFixed(2)}`);
/* 옛 코드의 천장은 `기본 5.40 + 승 0.25 + 흔들림 0.40` = 6.05였어요.
 * (무실점이었다면 +0.45까지) — 그래서 6.5를 넘으면 옛 코드로는 불가능한 값이에요. */
check(now.top > 6.5, `5:1 대승이면 우리 팀에서도 높은 평점이 나온다 (최고 ${now.top.toFixed(2)} · 옛 천장 6.05)`);
check(now.scorer > now.quiet + 0.5,
  `골을 받은 동료가 확실히 높다 (${now.scorer.toFixed(2)} vs ${now.quiet.toFixed(2)})`);
check(now.nameHit === 2 * N,
  `중계에 이름이 뜬 동료가 그 골의 임자가 된다 (${now.nameHit}/${2 * N})`);
check(Math.abs(now.goals - 2) < 0.001, `우리 팀 골은 중계에 뜬 둘뿐이다 (${now.goals}골/경기)`);

// ---------- ④⑤ 시즌을 굴리면 ----------
console.log("\n=== ④⑤ 한 시즌(38라운드) ===");
function season(withMine) {
  const S = fresh();
  const clubs = S.table.rows.map((r) => r.name);
  for (let i = 0; i < 38; i++) {
    const opp = clubs.filter((n) => n !== S.group)[i % (clubs.length - 1)];
    S.activity.opp = opp;
    const gf = Math.floor(Math.random() * 4), ga = Math.floor(Math.random() * 3);
    const res = gf > ga ? "W" : gf < ga ? "L" : "D";
    const my = Math.floor(Math.random() * (gf + 1));
    const m = mates();
    const named = [];
    for (let k = 0; k < gf - my; k++) named.push(m[Math.floor(Math.random() * m.length)]);
    const rr = T.recordRound(opp, res, gf, ga);
    T.leagueRound(rr, null, withMine ? { goals: named, myGoals: my } : undefined);
    S.activity.goals += my;
    S.activity.apps += 1;
    S.activity.week += 1;
  }
  const squad = Squad.squadOf(S.group).filter((x) => !x.me);
  return {
    a: squad.reduce((t, x) => t + (x.a || 0), 0),
    d: squad.reduce((t, x) => t + (x.d || 0), 0),
    g: squad.reduce((t, x) => t + (x.g || 0), 0),
    my: S.activity.goals,
    gf: S.table.rows.find((r) => r.name === S.group).gf,
  };
}
const yr = season(true);
console.log(`   동료 시즌 합 — ⚽${yr.g} 🅰️${yr.a} 🛡️${yr.d} · 내 골 ${yr.my} · 순위표 팀 득점 ${yr.gf}`);
check(yr.a > 0, `동료의 도움 칸이 찬다 (${yr.a}도움 · 예전에는 영원히 0)`);
check(yr.d > 0, `동료의 수비 칸이 찬다 (${yr.d}수비 · 예전에는 영원히 0)`);
check(yr.g + yr.my === yr.gf,
  `우리 팀 선수 골 합 + 내 골 = 순위표 팀 득점 (${yr.g} + ${yr.my} = ${yr.gf})`);

// ---------- ⑥ 변이 검증 ----------
console.log("\n=== ⑥ 변이 검증 — 중계 골을 안 넘기면(옛 계약) ===");
/* ⚠️ 여기서 되돌리는 건 **골 쪽 계약뿐**이에요(mineRound를 안 넘김).
 * 🛡️ 수비 쪽 변이(`const dd = mine ? 0 : …`을 되살리기)는 이 API로는 끌 수
 * 없어서 손으로 확인했어요 — 되살리면 ④의 "동료의 수비 칸이 찬다"가
 * `0수비`로 빨간불이 떠요. 고치기 전에 실제로 그렇게 뜨는 걸 봤습니다. */
const old = bigWin(false);
const oldYr = season(false);
console.log(`   옛 계약 — 골 받은 동료 ${old.scorer.toFixed(2)} · 나머지 ${old.quiet.toFixed(2)} · 동료 시즌 ⚽${oldYr.g} 🅰️${oldYr.a}`);
check(old.scorer - old.quiet < 0.3,
  `옛 계약이면 골을 넣은 동료가 구별되지 않는다 (${old.scorer.toFixed(2)} vs ${old.quiet.toFixed(2)}) — ②가 그걸 잡아요`);
check(oldYr.a === 0 && oldYr.g === 0,
  `옛 계약이면 동료의 골·도움이 0이다 (⚽${oldYr.g} 🅰️${oldYr.a}) — ③④가 그걸 잡아요`);

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
try { w.close(); } catch { /* 닫는 중 남은 콜백은 무시해요 */ }
process.exit(fail ? 1 : 0);
