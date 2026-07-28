/* 월드투어를 끝까지 돌려 등급과 보상이 나오는지. 실패해도 커리어가 안 끝나는지.
 *
 * 산식만 보면 "함수는 있는데 브라우저에선 못 가는" 기능이 그대로 통과해요.
 * 그래서 여기서는 실제 DOM(jsdom)에 페이지를 통째로 띄우고,
 * 연말 결산 화면의 버튼을 눌러 투어 화면에 들어가 도시를 전부 도는 것까지 봐요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/idol";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

// 네트워크·광고를 막고, 미니게임은 자동 판정으로 (사람 입력 없이 끝까지 돌리려고요)
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  localStorage.setItem("grow-auto-mini", "1");
`;

let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
/* 최상위 let/const는 브라우저에서도 window 속성이 안 돼요.
 * 페이지 안에서 직접 eval하는 창구를 하나 열어 접근합니다. */
html = html.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/idol/" });
const w = dom.window;
const $ = (id) => w.document.getElementById(id);
const activeScreen = () => (w.document.querySelector(".screen.active") || {}).id;

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// ---------- 1. 등급 산식 ----------
const Career = w.Career || w.IdolCareer;   // game.js가 쓰는 것과 같은 조회 방식
check(!!Career, "Career 모듈이 로드된다");
check(typeof Career?._t?.tourGrade === "function", "tourGrade가 노출된다");
if (!Career || !Career._t || !Career._t.tourGrade) { console.log("\n❌ 실패"); process.exit(1); }

const g = Career._t.tourGrade;
check(g(1.0) === "S", `전 도시 만석이면 S (${g(1.0)})`);
check(g(0.5) === "C" || g(0.5) === "B", `절반이면 B~C (${g(0.5)})`);
check(g(0) === "C", `아무도 안 오면 C (${g(0)})`);

// ---------- 2. 실제 화면에서 열고 완주하기 ----------
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
const get = w.__get, set = w.__set;
check(typeof get === "function" && get("typeof S") === "object", "게임 전역(S) 접근 가능");

function setupPro(fandom) {
  set("S", get('newState(AGENCIES[0], "vocal", "테스트")'));
  const S = get("S");
  S.phase = "idol-pro";
  S.group = "테스트팀";
  S.center = true;
  S.proYear = 6;
  S.camp = 0;
  S.activity = null;
  S.pendingShow = false;
  S.proLog = [];
  S.fandom = fandom;
  S.money = 5000;
  S.condition = 80;
  for (const k of Object.keys(S.stats)) S.stats[k] = 110;
  S.career = {
    years: [{ y: 6, hype: 8.2, wins: 4, sales: 140, dFan: 90, awards: ["대상"] }],
    wins: 12, daesang: 3, bonsang: 2, rookie: 1, sales: 700, tours: 0,
  };
  return S;
}

const tourButton = () => Array.from(w.document.querySelectorAll("#career-actions button"))
  .find((b) => /월드투어/.test(b.textContent));

// 아직 조건 미달이면 버튼이 없어야 해요
setupPro(100).career.daesang = 0;
Career.showActivity();
check(activeScreen() === "screen-career", "연말 결산 화면이 뜬다");
check(!tourButton(), "조건 미달이면 월드투어 버튼이 없다");

// 조건을 채우면 결산 화면에서 투어로 갈 수 있어요
const S = setupPro(9000);
Career.showActivity();
const btnEnter = tourButton();
check(!!btnEnter, "조건을 채우면 결산 화면에 월드투어 버튼이 생긴다");
if (!btnEnter) { console.log("\n❌ 실패"); process.exit(1); }

/* 투어를 한 번 완주시키고, 시작 전후를 비교해 돌려줘요.
 * 클릭만으로 끝까지 가는지(=브라우저에서 실제로 완주 가능한지)를 봅니다. */
function runTour() {
  const before = { fandom: S.fandom, money: S.money, tours: S.career.tours, years: S.career.years.length };
  tourButton().click();
  const onTour = activeScreen() === "screen-tour";
  const btn = $("btn-tour-go");
  let clicks = 0;
  while (onTour && btn && !$("tour-result").querySelector(".tour-grade") && clicks < 40) {
    if (btn.disabled) break;
    btn.click();
    clicks++;
  }
  const gradeEl = $("tour-result").querySelector(".tour-grade");
  return { before, onTour, clicks, grade: gradeEl ? gradeEl.textContent.trim()[0] : null, btn };
}

const r1 = runTour();
check(r1.onTour, "버튼을 누르면 월드투어 화면으로 넘어간다");
check(r1.clicks >= 4, `도시마다 공연을 눌러 진행한다 (버튼 ${r1.clicks}번)`);
check(["S", "A", "B", "C"].includes(r1.grade), `완주하면 등급이 나온다 (${r1.grade})`);
check(S.career.tours === 1, `완주한 투어만 tours로 세어진다 (${S.career.tours})`);
check(S.fandom >= r1.before.fandom, `팬덤이 줄지 않는다 (${r1.before.fandom} → ${S.fandom})`);
check(S.money >= r1.before.money, `자금이 줄지 않는다 (${r1.before.money} → ${S.money})`);

// 결산으로 되돌아와야 커리어가 이어져요
r1.btn.click();
check(activeScreen() === "screen-career", "투어를 마치면 결산 화면으로 돌아온다");
check(get("typeof S") === "object" && S.phase === "idol-pro", "투어 뒤에도 커리어가 계속된다");
check(!tourButton(), "같은 해에는 다시 못 떠난다");

// ---------- 3. 대실패해도 잃는 게 없어야 해요 ----------
set("autoRes", () => "miss");   // 모든 도시에서 미니게임 실패
S.proYear += 1;                  // 다음 해 — 다시 도전할 수 있어요
S.career.years.push({ y: S.proYear, hype: 6, wins: 2, sales: 90, dFan: 40, awards: [] });
Career.showActivity();
check(!!tourButton(), "다음 해에는 다시 도전할 수 있다");
const r2 = runTour();
check(r2.grade === "C", `전부 실패하면 C 등급 (${r2.grade})`);
check(S.fandom >= r2.before.fandom, `실패해도 팬덤이 안 깎인다 (${r2.before.fandom} → ${S.fandom})`);
check(S.money >= r2.before.money, `실패해도 자금이 안 깎인다 (${r2.before.money} → ${S.money})`);
check(S.career.years.length === r2.before.years, "실패해도 활동 기록이 사라지지 않는다");
r2.btn.click();
check(activeScreen() === "screen-career" && S.phase === "idol-pro", "실패해도 커리어가 끝나지 않는다");

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
