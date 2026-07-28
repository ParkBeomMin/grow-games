/* 🏆 올해의 그룹 순위 — 음방 1위 횟수와 팬덤을 한 표에.
 *
 * 이 파일이 지키는 것은 세 가지예요.
 *   1) 기록이 한 해 동안 쌓이고(컴백 2회를 가로질러) 새 연차에 리셋되는가
 *   2) 내 줄이 진짜 내 값(S.fandom · S.activity.wins)을 보여주는가 — 사본이 아니라
 *   3) 라이벌 팬덤이 pop이나 주간 점수로 절대 되먹임되지 않는가
 *
 * 그리고 무엇보다, 이 표가 **브라우저에서 실제로 닿는가**를 봐요.
 * 이 프로젝트는 "함수는 있는데 화면에선 못 가는" 기능을 초록 불 아래 여러 번
 * 내보냈어요. 그래서 3번 절은 jsdom에 페이지를 통째로 띄우고, 게임의 입구
 * (Career.showActivity)에서 시작해 버튼만 눌러 순위표에 닿는지 확인해요.
 *
 * 산식·함수는 전부 소스에서 정규식으로 뽑아 씁니다 (복사하면 원본과 어긋나도
 * 초록이 떠요). 직접 eval("const x = …")은 선언이 eval 자기 스코프에 갇혀서 늘
 * undefined가 되니, new Function(...)으로 감싸 return 해요 — axis-test.js와 같아요. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/idol";
const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

// ---------- 소스 추출 ----------
const parts = {
  CB: /const CB_PER_YEAR = [^;]+;/,
  WK: /const WEEKS_PER_CB = [^;]+;/,
  seedC: /const RIVAL_FAN_SEED = [^;]+;/,
  roll: /function rollRivals\(\)[\s\S]*?\n  \}/,
  CONCEPTS: /const CONCEPTS = \[[\s\S]*?\n  \];/,
  trend: /function rollTrend\(\)[\s\S]*?\n  \}/,
  init: /function initActivity\(\)[\s\S]*?\n  \}/,
  after: /function afterPrep\(\)[\s\S]*?\n  \}/,
  seed: /function seedFandom\([\s\S]*?\n  \}/,
  ensure: /function ensureStandings\([\s\S]*?\n  \}/,
  record: /function recordWeek\([\s\S]*?\n  \}/,
  rowsFn: /function standingsRows\([\s\S]*?\n  \}/,
  htmlFn: /function standingsHTML\([\s\S]*?\n  \}/,
  render: /function renderStandings\([\s\S]*?\n  \}/,
  prep: /function renderPrep\(\)[\s\S]*?\n  \}/,
  weekly: /function weeklyChart\(\)[\s\S]*?\n    \}/,
  score: /const myScore =[\s\S]*?;\n/,
};
const got = {};
for (const [k, re] of Object.entries(parts)) {
  const m = SRC.match(re);
  if (!m) { console.log(`❌ ${k}를 소스에서 못 찾았어요`); fail++; }
  else got[k] = m[0];
}
if (fail) { console.log("\n❌ 실패"); process.exit(1); }

// ---------- 1) 한 해 동안 쌓이고, 새 해에 리셋 ----------
const RIVAL_GROUPS = ["R1", "R2", "R3", "R4", "R5"];
// renderPrep이 하는 일 중 순위표에 관한 부분만 세워요 (나머지는 화면이라 무의미).
// $ 는 가짜 엘리먼트를 돌려주는 스텁이에요.
const wire = new Function("rand", "randInt", "RIVAL_GROUPS", "els", `
  let S;
  const save = () => {}, show = () => {};
  const $ = (id) => (els[id] = els[id] || { textContent: "", innerHTML: "", hidden: false });
  const renderPrep = () => renderStandings();
  ${got.CB}
  ${got.WK}
  ${got.seedC}
  ${got.roll}
  ${got.CONCEPTS}
  ${got.trend}
  ${got.init}
  ${got.after}
  ${got.seed}
  ${got.ensure}
  ${got.record}
  ${got.rowsFn}
  ${got.htmlFn}
  ${got.render}
  return {
    set: (x) => { S = x; }, get: () => S,
    afterPrep, recordWeek, ensureStandings, standingsRows, standingsHTML, renderStandings,
  };
`);

const els = {};
const W = wire(rand, randInt, RIVAL_GROUPS, els);

// 매주 rows를 만들어요 — 1위는 지정한 그룹, 내 그룹은 me로 표시해요.
const mkRows = (rivals, winnerIdx, myRank) => {
  const others = rivals.map((r) => ({ name: r.name, score: 0 }));
  const win = others.splice(winnerIdx, 1)[0];
  const rest = [win, ...others];
  rest.splice(myRank - 1, 0, { name: "우리팀", score: 0, me: true });
  return rest;
};

const S = {
  proYear: 1, camp: 0, activity: null, pendingShow: false,
  group: "우리팀", fandom: 500, proLog: [],
};
W.set(S);
W.afterPrep();                       // 컴백 준비 끝 → 1차 컴백 시작
const gs = () => (S.standings || {}).groups || {};
check(Object.keys(gs()).length === RIVAL_GROUPS.length,
  `활동이 시작되면 순위표에 라이벌이 채워진다 (${Object.keys(gs()).length}팀)`);
check((S.standings || {}).year === 1, `기록이 연차로 묶인다 (${(S.standings || {}).year})`);

const popsOf = () => S.activity.rivals.map((r) => Math.round(r.pop * 1e6));
const popBefore = popsOf();
for (let i = 0; i < 6; i++) W.recordWeek(mkRows(S.activity.rivals, 0, 2));
check(gs().R1 && gs().R1.wins === 6, `1차 컴백 6주가 기록된다 (R1 ${gs().R1 && gs().R1.wins}회)`);
check(JSON.stringify(popsOf()) === JSON.stringify(popBefore),
  "주간 기록이 라이벌 pop을 건드리지 않는다");

// 2차 컴백 — 라이벌은 새로 뽑히지만 기록은 이어져야 해요
S.activity.week = S.activity.weekTotal;
S.camp = 0;
W.afterPrep();
check(S.activity.cb === 2, `6주가 끝나면 2차 컴백으로 넘어간다 (${S.activity.cb}차)`);
W.ensureStandings();
check(gs().R1 && gs().R1.wins === 6, `컴백이 바뀌어도 기록이 살아남는다 (R1 ${gs().R1 && gs().R1.wins}회)`);
for (let i = 0; i < 6; i++) W.recordWeek(mkRows(S.activity.rivals, 0, 2));
check(gs().R1 && gs().R1.wins === 12,
  `한 해 두 컴백이 합산된다 (R1 ${gs().R1 && gs().R1.wins}회)`);

// 새 연차 — startPrep()이 하는 일: 연차를 올리고 activity를 비워요
const fanY1 = gs().R1.fandom;
S.proYear = 2;
S.activity = null;
S.camp = 0;
W.afterPrep();
W.ensureStandings();
check((S.standings || {}).year === 2, `새 연차에 기록이 새로 열린다 (${(S.standings || {}).year})`);
check(gs().R1 && gs().R1.wins === 0, `새 연차에 1위 횟수가 리셋된다 (${gs().R1 && gs().R1.wins}회)`);
check(gs().R1 && gs().R1.fandom !== fanY1,
  `새 연차 팬덤은 그 해 기준으로 다시 잡힌다 (${fanY1} → ${gs().R1 && gs().R1.fandom})`);

// 시작 팬덤은 연차에 따라 커져요 — 1년차 라이벌이 10년차 플레이어와 나란히
// 놓이면 표가 의미를 잃으니까요.
const seedAt = (yr) => {
  const T = { proYear: yr, camp: 0, activity: null, pendingShow: false, group: "우리팀", fandom: 0, proLog: [] };
  W.set(T);
  W.afterPrep();
  W.ensureStandings();
  const g = T.standings.groups;
  return Object.values(g).reduce((a, x) => a + x.fandom, 0) / Object.keys(g).length;
};
const s1 = seedAt(1), s9 = seedAt(9);
check(s1 > 0 && s9 > s1 * 5, `라이벌 시작 팬덤이 연차와 함께 커진다 (${s1.toFixed(0)} → ${s9.toFixed(0)})`);

// ---------- 2) 내 줄은 진짜 내 값 ----------
W.set(S);
S.fandom = 1234;
S.activity.wins = 7;
const rows = W.standingsRows(S.activity.wins);
const mine = rows.find((r) => r.me);
check(!!mine, "내 줄이 표에 있다");
check(mine && mine.fandom === 1234, `내 팬덤이 S.fandom 그대로다 (${mine && mine.fandom})`);
check(mine && mine.wins === 7, `내 1위 횟수가 S.activity.wins 그대로다 (${mine && mine.wins})`);
S.fandom = 9999;
const rows2 = W.standingsRows(S.activity.wins);
check(rows2.find((r) => r.me).fandom === 9999, "S.fandom을 바꾸면 표가 바로 따라온다 (사본이 아니다)");
const html = W.standingsHTML(7);
check(/<tr class="me"/.test(html), "내 줄에 me 표시가 붙는다");
check(/우리/.test(html), "내 줄에 '우리' 라벨이 붙는다");
// 헤더 <tr>은 class가 없어요 — 본문 줄만 세요
check((html.match(/<tr class=/g) || []).length === RIVAL_GROUPS.length + 1,
  `표에 나 + 라이벌 전부가 담긴다 (${(html.match(/<tr class=/g) || []).length}줄)`);
check(/음방 1위|🏆/.test(html) && /팬덤|💖/.test(html), "두 지표가 한 표에 함께 있다");

// ---------- 3) 라이벌 팬덤은 표시 전용 ----------
check(!/standings|fandom/i.test(got.roll), "rollRivals가 팬덤·순위표를 아예 모른다");
check(!/standings/.test(got.score), "주간 점수 산식이 순위표를 참조하지 않는다");
check(/S\.fandom/.test(got.score), "주간 점수의 팬덤 항은 여전히 내 S.fandom 하나뿐이다");
// 주간 차트에서 라이벌 점수를 만드는 줄 — pop 말고 다른 게 섞이면 안 돼요
const rivalScoreM = got.weekly.match(/act\.rivals\.map\([^\n]+/);
check(!!rivalScoreM && /r\.pop/.test(rivalScoreM[0]) && !/fandom|standings|wins/.test(rivalScoreM[0]),
  `라이벌 주간 점수는 pop만 쓴다 — "${rivalScoreM ? rivalScoreM[0].trim() : "없음"}"`);
// recordWeek는 순위표만 만져야 해요
check(!/\.pop\s*[-+*/]?=/.test(got.record) && !/rivals\s*=/.test(got.record),
  "recordWeek가 pop이나 라이벌 배열을 다시 쓰지 않는다");

// 숫자로도 확인 — 팬덤을 100만으로 부풀려도 pop 분포가 그대로여야 해요
const meanPop = (inflate) => {
  const T = { proYear: 5, camp: 0, activity: null, pendingShow: false, group: "우리팀", fandom: 0, proLog: [] };
  W.set(T);
  let sum = 0, n = 400;
  for (let i = 0; i < n; i++) {
    T.activity = null; T.camp = 0;
    W.afterPrep();
    W.ensureStandings();
    if (inflate) for (const g of Object.values(T.standings.groups)) g.fandom = 1e6;
    T.activity.week = T.activity.weekTotal; T.camp = 0;
    W.afterPrep();                       // 2차 컴백 — 여기서 pop을 다시 뽑아요
    sum += T.activity.rivals.reduce((a, r) => a + r.pop, 0) / T.activity.rivals.length;
  }
  return sum / n;
};
const plain = meanPop(false), inflated = meanPop(true);
check(Math.abs(plain - inflated) < 1.5,
  `팬덤을 100만으로 부풀려도 pop이 안 움직인다 (${plain.toFixed(2)} vs ${inflated.toFixed(2)})`);

// 배선: renderPrep이 순위표를 그리고, weeklyChart가 주간 결과를 기록하는가
check(/renderStandings\(\)/.test(got.prep), "renderPrep이 renderStandings를 부른다");
check(/recordWeek\(/.test(got.weekly), "weeklyChart가 recordWeek를 부른다");

// ---------- 4) 브라우저에서 실제로 닿는가 (jsdom) ----------
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  localStorage.setItem("grow-auto-mini", "1");
`;
let page = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
page = page.replace("</head>", `<script>${PRELUDE}</script></head>`);
page = page.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom = new JSDOM(page, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/idol/" });
const w = dom.window;
const $ = (id) => w.document.getElementById(id);
const activeScreen = () => (w.document.querySelector(".screen.active") || {}).id;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
const get = w.__get, set = w.__set;

const Career = w.Career || w.IdolCareer;
check(!!Career, "Career 모듈이 로드된다");
check(!!$("pro-standings"), "프로 화면에 순위표 자리(#pro-standings)가 있다");
if (!Career || !$("pro-standings")) { console.log("\n❌ 실패"); process.exit(1); }

set("S", get('newState(AGENCIES[0], "vocal", "테스트")'));
const G = get("S");
G.phase = "idol-pro";
G.group = "테스트팀";
G.center = true;
G.proYear = 1;
G.camp = 1;
G.activity = null;
G.pendingShow = false;
G.proLog = [];
G.fandom = 640;
G.money = 3000;
G.condition = 90;
for (const k of Object.keys(G.stats)) G.stats[k] = 105;
G.career = { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0, tours: 0 };
delete G.standings;

Career.showActivity();
check(activeScreen() === "screen-pro", "커리어 화면(screen-pro)이 뜬다");
check($("pro-standings").hidden === true, "활동 전에는 순위표가 숨어 있다");

const restBtn = () => Array.from(w.document.querySelectorAll("#pro-actions .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);
const trRows = () => Array.from($("pro-standings-body").querySelectorAll("tbody tr"));

restBtn().click();                    // 마지막 연습 턴 소진 → 활동 시작
check($("pro-standings").hidden === false, "활동이 시작되면 순위표가 화면에 나타난다");
check(trRows().length === 9, `표에 나 + 라이벌 8팀이 그려진다 (${trRows().length}줄)`);
check(/올해 그룹 순위/.test($("pro-standings-sum").textContent),
  `접이식 요약이 채워진다 — "${$("pro-standings-sum").textContent}"`);
const head = Array.from($("pro-standings-body").querySelectorAll("th")).map((t) => t.textContent).join("|");
check(/1위/.test(head) && /팬덤/.test(head), `헤더에 두 지표가 다 있다 — "${head}"`);
const myTr = () => trRows().find((tr) => tr.classList.contains("me"));
check(!!myTr() && /테스트팀/.test(myTr().textContent), "내 그룹 줄이 me로 표시된다");

// 한 주를 실제로 소화해요 — 화면 버튼만 눌러서
function playWeek() {
  let guard = 0;
  while (activeScreen() === "screen-pro" && guard++ < 10) {
    const go = w.document.querySelector("#pro-actions .go-game");
    if (go) { go.click(); break; }
    restBtn().click();
  }
  /* 새 컴백은 컨셉 선택 화면(screen-concept)을 먼저 지나야 무대가 열려요.
   * 게이트를 우회하지 않고, 플레이어처럼 카드를 하나 클릭해서 통과해요. */
  if (activeScreen() === "screen-concept") {
    const card = w.document.querySelector("#concept-list .concept-card");
    if (card) card.click();
  }
  if (activeScreen() !== "screen-stage") return false;
  $("btn-stage-next").click();        // ⏩ 빨리 감기 → 미니게임 자동 → 주간 차트
  $("btn-stage-next").click();        // 다음 무대 준비 / 다음 컴백 / 연말 결산
  return true;
}

check(playWeek(), "무대 버튼을 눌러 주간 차트까지 진행된다");
check(activeScreen() === "screen-pro", "무대가 끝나면 커리어 화면으로 돌아온다");
const winsIn = () => trRows().reduce((a, tr) => a + (+tr.children[2].textContent.replace(/\D/g, "") || 0), 0);
check(winsIn() === 1, `한 주에 1위는 정확히 한 팀 (합계 ${winsIn()}회)`);

/* 마지막 주 직전까지 돌려요 (1차 컴백 6주 + 2차 컴백 5주 = 11주).
 * 12주째를 돌면 바로 연말 결산으로 넘어가서 커리어 화면이 다시 안 그려지거든요. */
let weeks = 1;
while (activeScreen() === "screen-pro" && weeks < 11 && playWeek()) weeks++;
check(weeks === 11, `무대를 이어서 소화한다 (${weeks}주)`);
check(G.activity.cb === 2, `2차 컴백까지 넘어왔다 (${G.activity.cb}차)`);
check(winsIn() === 11, `두 컴백의 1위가 모두 합산된다 (합계 ${winsIn()}회 — 6주를 넘어야 합산이에요)`);
const myCells = myTr().children;
check(+myCells[2].textContent.replace(/\D/g, "") === G.activity.wins,
  `내 줄의 1위 횟수가 S.activity.wins와 같다 (표 ${myCells[2].textContent} / 실제 ${G.activity.wins})`);
check(+myCells[3].textContent.replace(/\D/g, "") === Math.round(G.fandom),
  `내 줄의 팬덤이 S.fandom과 같다 (표 ${myCells[3].textContent} / 실제 ${Math.round(G.fandom)})`);
const myWinsY1 = G.activity.wins;

// 마지막 주 → 연말 결산으로 넘어가면 최종 순위가 남아야 해요
check(playWeek(), "마지막 주까지 진행된다");
check(activeScreen() === "screen-career", `연말 결산 화면으로 간다 (${activeScreen()})`);
const cardBox = $("career-card").querySelector(".standings-box");
check(!!cardBox, "연말 결산에도 최종 순위표가 붙는다");
check(!!cardBox && (cardBox.querySelectorAll("tbody tr").length === 9),
  `결산 순위표도 9줄이다 (${cardBox ? cardBox.querySelectorAll("tbody tr").length : 0}줄)`);
check(!!cardBox && /<tr class="me"/.test(cardBox.innerHTML), "결산 순위표에도 내 줄이 표시된다");

// 새 연차 — 순위표가 리셋돼야 해요
const nextBtn = Array.from(w.document.querySelectorAll("#career-actions button"))
  .find((b) => /컴백 준비/.test(b.textContent));
check(!!nextBtn, "다음 연차 버튼이 있다");
nextBtn.click();
check(activeScreen() === "screen-pro" && G.proYear === 2, `2년차가 시작된다 (${G.proYear}년차)`);
check($("pro-standings").hidden === true, "연차 시작 직후에는 순위표가 다시 숨는다");
let guard = 0;
while (activeScreen() === "screen-pro" && !w.document.querySelector("#pro-actions .go-game") && guard++ < 10) restBtn().click();
check($("pro-standings").hidden === false, "2년차 활동이 시작되면 순위표가 다시 나타난다");
check(winsIn() === 0, `새 연차에는 1위 횟수가 0부터다 (합계 ${winsIn()}회)`);
check(myWinsY1 >= 0 && G.activity.wins === 0, `내 1위 횟수도 리셋된다 (작년 ${myWinsY1} → ${G.activity.wins})`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
