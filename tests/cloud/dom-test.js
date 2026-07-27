/* 실제 DOM(jsdom)에서 루키를 브라우저와 같은 방식으로 로드해 경기를 돌려요.
 * <script src>를 그대로 인라인해서, 최상위 const가 스크립트끼리 공유되는
 * 브라우저 동작을 재현합니다. (window.eval은 이게 안 돼요)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(__dirname + "/jsdom.js");

const DIR = process.argv[2] || "/workspace/grow-games/beta/rookie";
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");

// 네트워크·광고를 막는 선행 스크립트
const PRELUDE = `
  window.__net = [];
  window.fetch = () => { window.__net.push("fetch"); return Promise.reject(new Error("net off")); };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  localStorage.setItem("grow-auto-mini", "1");
`;

let missing = [];
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const p = path.resolve(DIR, src);
  if (!fs.existsSync(p)) { missing.push(src); return ""; }
  return `<script>\n${fs.readFileSync(p, "utf8")}\n</script>`;
});
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
/* 최상위 let/const는 브라우저에서도 window 속성이 안 돼요.
 * 페이지 안에서 직접 eval하는 창구를 하나 열어 접근합니다. */
html = html.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/rookie/" });
const { window } = dom;
const $ = (id) => window.document.getElementById(id);

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

if (missing.length) console.log(`   (없는 스크립트 건너뜀: ${missing.join(", ")})`);
check(typeof window.__get === "function" && window.__get("typeof S") === "object", "게임 전역(S) 접근 가능");
check(typeof window.renderGameSim === "function", "renderGameSim 로드됨");
check(!!window.Career, "Career 모듈 로드됨");
check(!!window.Timing, "Timing 모듈 로드됨");
if (typeof window.__get !== "function") process.exit(1);
// S는 최상위 let이라 객체를 새로 넣어줘야 해요
window.__set("S", window.__get('newState(REGIONS[0], "pitcher", "임도윤")'));
const S = window.__get("S");
window.Ads = { display() {}, init() {} };
window.Stats = { log() {} };

/* ---------- 고교 투수 경기 60회: 스코어보드 정합성 · 연장 칸 · 재등판 문구 ---------- */
const rows = [];
let extraSeen = 0, comebackText = 0, reliefRuns = 0, earlyHook = 0;
for (let t = 0; t < 60; t++) {
  S.condition = 70;
  Object.assign(S.stats, { velocity: 80, breaking: 75, control: 78, stamina: t % 2 ? 130 : 55, defense: 60 });

  const perf = window.pitcherLine();
  const interactive = perf.ip >= 8 && Math.random() < 0.55;
  const preWin = interactive ? null : Math.random() < 0.5;
  const story = window.pitcherStory(preWin, perf, interactive);
  if (perf.ip < 8) {
    earlyHook++;
    if (story.oppInn.slice(Math.min(perf.ip, 8), 8).reduce((a, b) => a + b, 0) > 0) reliefRuns++;
  }
  if (story.events.some((e) => /다시 공을 쥡니다/.test(e.text))) comebackText++;

  window.renderGameSim({
    title: "4강 vs 장충고", oppName: "장충고", homeName: "백제고",
    perf, story, interactive, preWin,
    onFinish: () => ({ extra: "", nextLabel: "계속", nextFn: () => {} }),
  });
  const btn = $("btn-tour-next");
  for (let i = 0; i < 60 && btn && !btn.disabled; i++) btn.click();

  const head = $("sb-head");
  if (!head) { check(false, "스코어보드가 렌더되지 않음"); break; }
  const cols = head.children.length - 2;
  if (cols > 9) extraSeen++;
  for (const s of ["opp", "our"]) {
    const cells = Array.from($(`sb-row-${s}`).children).slice(1, -1);
    rows.push({
      s, cols, n: cells.length,
      sum: cells.reduce((a, c) => a + (+c.textContent || 0), 0),
      r: +$(`sb-r-${s}`).textContent,
    });
  }
}
const bad = rows.filter((x) => x.sum !== x.r);
const badCols = rows.filter((x) => x.n !== x.cols);
check(bad.length === 0, `이닝 합 = R  (${rows.length}개 행${bad.length ? ` · 어긋남 ${bad.length}건 ${JSON.stringify(bad[0])}` : ""})`);
check(badCols.length === 0, `헤더 칸 수 = 데이터 칸 수${badCols.length ? ` · 어긋남 ${badCols.length}건` : ""}`);
check(extraSeen > 0, `연장 경기 발생 시 칸이 늘어남 (${extraSeen}/60경기)`);
check(comebackText === 0, `"다시 공을 쥡니다" 문구 없음 (${comebackText}건)`);
check(reliefRuns > 0, `조기 강판 경기에서 불펜 실점이 찍힘 (${reliefRuns}/${earlyHook}경기)`);

/* ---------- 구원 등판 화면 ---------- */
S.role = "마무리 투수"; S.team = "서울 드래곤즈"; S.phase = "pro";
S.age = 25; S.proYear = 3; S.condition = 70; S.proLog = [];
Object.assign(S.stats, { velocity: 80, breaking: 75, control: 78, stamina: 70, defense: 60 });
// 리그 구성은 게임 로직 그대로 만들어요 (teamStrOf는 Career._internals에 있어요)
const teams = window.__get("REGIONS").flatMap((r) => r.teams).filter((t) => t !== S.team);
S.season = {
  game: 10, total: 144, teamW: 6, teamL: 4,
  others: teams.map((name) => ({ name, w: 5, l: 5, str: window.Career._internals.teamStrOf(name) })),
  stats: { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 },
};
S.career = { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
S.pendingGame = true;

// 실제 UI 경로로 구원 등판을 돌려요 — 프로 화면의 "경기 시작" 버튼을 눌러요
let sawScore = 0, sawResult = 0, tried = 0, roles = {};
for (let i = 0; i < 60; i++) {
  S.role = i % 2 ? "마무리 투수" : "불펜 투수";
  S.pendingGame = true;
  S.season.game = 10;
  S.season.stats = { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 };
  S.camp = 0;
  window.Career.showPro();
  const go = window.document.querySelector(".go-game");
  if (!go) continue;
  tried++;
  go.click();
  const btn = $("btn-tour-next");
  for (let j = 0; j < 60 && btn && !btn.disabled; j++) btn.click();
  const rs = $("relief-score");
  if (rs && rs.textContent.trim()) { sawScore++; roles[S.role] = (roles[S.role] || 0) + 1; }
  if ($("game-result") && /이닝/.test($("game-result").innerHTML)) sawResult++;
}
check(tried > 0, `프로 경기 시작 버튼을 찾아 실행 (${tried}회)`);
check(sawScore > 0, `구원 등판 점수판이 실제로 그려짐 (${sawScore}/${tried} · ${JSON.stringify(roles)})`);
check(sawResult > 0, `구원 등판 결과 화면에 투구 기록 출력 (${sawResult}/${tried})`);

console.log(fail ? "\n❌ 실패 있음" : "\n✅ 실제 DOM에서 전부 통과");
process.exit(fail ? 1 : 0);
