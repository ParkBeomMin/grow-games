/* 📋 기록 화면의 프로 기록 표에 그 시즌 소속·리그가 적히는지 본다.
 *
 * 제보(실기기 스크린샷): "커리어 기록 화면에서 각 시즌별로 팀이랑 리그가 다를 텐데
 * 그게 안 적혀 있네."
 *
 * 맞았다. 표가 시즌·성적·평점·수상 네 칸뿐이라 "3시즌 103골"이 K리그3에서 낸
 * 건지 프리미어리그에서 낸 건지 알 수가 없었다. 결산 화면(career.js)에는
 * 소속 칼럼이 있는데 기록 화면(game.js)에는 없었다 — 같은 데이터를 두 화면이
 * 다르게 보여주고 있던 셈이다.
 *
 * 칸을 새로 만들지는 않았다. 수상 칸이 이미 다섯 줄까지 늘어나 폭이 없다
 * (결산 표를 7칸 → 4칸으로 줄인 것과 같은 이유). 시즌 칸 아래 작은 글씨다.
 *
 * 지키는 것:
 *   ① 시즌마다 그 시즌 소속이 표에 있다
 *   ② 리그도 짧은 이름(short)으로 있다 — 전체 이름은 칸을 넘긴다
 *   ③ 팀 최종 순위도 함께 (있으면)
 *   ④ 칸 수는 그대로 넷이다 — 늘리면 폰에서 헤더가 세로로 쪼개진다
 *   ⑤ 옛 세이브(club 없음)에서도 안 죽는다
 *
 * 실제 페이지를 열고 버튼을 눌러 DOM에서 읽는다 — 렌더 함수를 직접 안 부른다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = "/workspace/grow-games";
const DIR = path.join(ROOT, "beta/soccer");
const { JSDOM } = require(path.join(ROOT, "tests/cloud/jsdom.js"));

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

process.on("uncaughtException", (e) => {
  if (String((e && e.stack) || "").includes("x.test")) return;
  console.error(e); process.exit(1);
});

const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  window.alert = () => {};
  window.confirm = () => false;
  localStorage.setItem("grow-auto-mini", "1");
  HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src.split("?")[0]);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`)
  .replace("</body>", `<script>
    window.__get = (n) => eval(n);
    window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
  </script></body>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
const $ = (id) => w.document.getElementById(id);
const T = w.WingerCareer && w.WingerCareer._t;
check(!!T, "WingerCareer가 로드된다");
if (!T) { console.log("\n❌ 실패"); process.exit(1); }

const LEAGUES = T.LEAGUES;
/* 리그는 소스에서 읽는다 — id·이름을 여기 옮겨 적으면 리그가 바뀌어도 안 들킨다.
 * tier가 가장 낮은 것과 가장 높은 것을 골라, 두 시즌이 확실히 다른 리그가 되게 한다. */
const byTier = LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const LOW = byTier[0], HIGH = byTier[byTier.length - 1];
const clubOf = (lg) => (T.CLUBS[lg.id] || [])[0];

// 세 시즌: 하위 리그 → 상위 리그로 옮긴 커리어
const YEARS = [
  { y: 1, club: clubOf(LOW).name, league: LOW.id, rank: 3, teams: 6, goals: 10, assists: 4, defense: 2, apps: 38, avg: 6.7, awards: [], wins: 1, sales: 0, dFan: 0, hype: 3 },
  { y: 2, club: clubOf(LOW).name, league: LOW.id, rank: 1, teams: 6, goals: 22, assists: 9, defense: 3, apps: 38, avg: 7.9, awards: ["리그MVP"], wins: 5, sales: 0, dFan: 0, hype: 5 },
  { y: 3, club: clubOf(HIGH).name, league: HIGH.id, rank: 5, teams: 6, goals: 31, assists: 12, defense: 4, apps: 38, avg: 8.2, awards: ["골든부츠"], wins: 9, sales: 0, dFan: 0, hype: 6 },
];

function openWith(years) {
  const S = w.__get('newState(MARKETS[0], "fw", "기록확인")');
  S.phase = "soccer-pro";
  S.group = years[years.length - 1].club;
  S.league = years[years.length - 1].league;
  S.proYear = years.length;
  S.career = { years: years.map((x) => ({ ...x })), wins: 15, daesang: 1, bonsang: 1, rookie: 0,
    sales: 0, goals: 63, assists: 25, defense: 9, apps: 114, teamW: 0, teamD: 0, teamL: 0 };
  w.__set("S", S);
  $("btn-record-pro") ? $("btn-record-pro").click() : w.__get("openRecord")("screen-pro");
  return $("record-card");
}

const card = openWith(YEARS);
const table = card.querySelector("table.season-record");
check(!!table, "프로 기록 표가 그려진다");

const heads = Array.from(table.querySelectorAll("thead th")).map((t) => t.textContent.trim());
const rows = Array.from(table.querySelectorAll("tbody tr"));
check(rows.length === YEARS.length, `${YEARS.length}시즌치 행이 그려진다 (${rows.length}줄)`);

// ── ④ 칸 수는 그대로 넷 — 늘리면 폰에서 헤더가 세로로 쪼개져요
check(heads.length === 4, `표는 네 칸 그대로다 (${heads.join(" · ")})`);

// ── ①②③ 시즌 칸에 소속·리그·순위
YEARS.forEach((yr, i) => {
  const cell = rows[i].children[0];
  const club = cell.querySelector(".rec-club");
  const lg = cell.querySelector(".rec-lg");
  const lgDef = LEAGUES.find((l) => l.id === yr.league);
  check(!!club && club.getAttribute("title") === yr.club,
    `${yr.y}시즌 소속이 "${yr.club}"이다 (${club ? club.getAttribute("title") : "없음"})`);
  check(!!club && !!club.textContent.trim() && yr.club.includes(club.textContent.trim().slice(0, 2)),
    `${yr.y}시즌 소속이 줄인 이름으로 보인다 (${club ? club.textContent.trim() : "-"})`);
  const lgTxt = lg ? lg.textContent.trim() : "";
  check(lgTxt.includes(lgDef.short) && !lgTxt.includes(lgDef.name),
    `${yr.y}시즌 리그가 짧은 이름이다 ("${lgTxt}" — 전체 이름 '${lgDef.name}'이 아니라 '${lgDef.short}')`);
  check(lgTxt.includes(`${yr.rank}위`), `${yr.y}시즌 팀 순위(${yr.rank}위)도 함께 보인다 ("${lgTxt}")`);
});

/* 리그를 옮긴 게 표에서 실제로 갈려 보이는지 — 세 줄이 다 같은 글자면
 * 소속을 그리고 있어도 "시즌마다 다르다"는 물음에는 답을 못 한다. */
const lgTexts = rows.map((r) => (r.children[0].querySelector(".rec-lg") || {}).textContent || "");
check(new Set(lgTexts.map((t) => t.trim())).size >= 2,
  `시즌마다 리그 줄이 다르게 나온다 (${lgTexts.map((t) => t.trim()).join(" / ")})`);

// ── ⑤ 옛 세이브 — club·league·rank가 없어도 안 죽는다
const OLD = [{ y: 1, goals: 5, assists: 1, defense: 0, apps: 38, avg: 6.0, awards: [], wins: 0, sales: 0, dFan: 0, hype: 2 }];
let crashed = false, oldRows = [];
try {
  const c2 = openWith(OLD);
  oldRows = Array.from(c2.querySelectorAll("table.season-record tbody tr"));
} catch (e) { crashed = true; console.log(`   ${e.message}`); }
check(!crashed && oldRows.length === 1, "소속이 없는 옛 시즌도 표가 그려진다 (안 죽는다)");
check(!crashed && oldRows.length === 1 && /1시즌/.test(oldRows[0].children[0].textContent),
  "그런 줄에도 시즌 숫자는 그대로 보인다");

/* ── 변이 검증 — 시즌 칸을 옛 모양(`${x.y}시즌`)으로 되돌리면 ①이 무너져야 한다.
 * 소스에서 그 자리를 확인한다. 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
const CELL = GAME.match(/const seasonCell = \(x\) => \{[\s\S]*?\n {4}\};/);
check(!!CELL, "seasonCell을 소스에서 찾았다");
check(!!CELL && /rec-club/.test(CELL[0]) && /rec-lg/.test(CELL[0]),
  "seasonCell이 소속과 리그를 둘 다 그린다");
check(/<td class="rec-season">\$\{seasonCell\(x\)\}<\/td>/.test(GAME),
  "표가 실제로 seasonCell을 쓴다 — 함수만 만들고 안 쓰면 화면은 그대로예요");
check(/CT\.fillClubs \? CT\.fillClubs\(S\.career\.years, S\)/.test(GAME),
  "옛 시즌의 소속은 career.js가 S.moves에서 역산해 메운다");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
