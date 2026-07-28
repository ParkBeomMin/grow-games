/* 컴백 컨셉 4종과 판매량 기댓값 산식.
 *
 * "함수는 있는데 브라우저에선 못 가는" 기능을 다섯 번 겪은 저장소라, 여기서도
 * 실제 DOM(jsdom)에 페이지를 통째로 띄우고 Career._t에서 산식을 꺼내 검사한다
 * (tour-run-test.js와 같은 부트스트랩). 값을 옮겨 적은 테스트는 소스가 바뀌어도
 * 초록불이 뜨니, CONCEPTS·conceptOf·trendMul·expectedSales는 전부 _t로 노출된
 * 그대로를 호출해서 확인한다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/idol";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

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

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/idol/" });
const w = dom.window;

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const Career = w.Career || w.IdolCareer;
check(!!Career, "Career 모듈이 로드된다");
check(typeof Career?._t?.conceptOf === "function", "conceptOf가 _t로 노출된다");
if (!Career || !Career._t || !Career._t.conceptOf) { console.log("\n❌ 실패"); process.exit(1); }

const { CONCEPTS, conceptOf, trendMul, expectedSales } = Career._t;

// ---------- 1) CONCEPTS 4종 ----------
check(Array.isArray(CONCEPTS) && CONCEPTS.length === 4, `CONCEPTS가 4개다 (${CONCEPTS && CONCEPTS.length})`);
const ids = (CONCEPTS || []).map((c) => c.id).sort().join(",");
check(ids === "cool,emo,fierce,teen", `id가 정확히 cool/fierce/emo/teen이다 (${ids})`);

// ---------- 2) 가중치 합 ----------
const sumW = (c) => Object.values(c.w).reduce((a, b) => a + b, 0);
const byId = (id) => CONCEPTS.find((c) => c.id === id);
const near = (a, b) => Math.abs(a - b) < 1e-9;
check(near(sumW(byId("cool")), 1.8), `청량 가중치 합이 1.8이다 (${sumW(byId("cool"))})`);
check(near(sumW(byId("fierce")), 2.0), `강렬 가중치 합이 2.0이다 (${sumW(byId("fierce"))})`);
check(near(sumW(byId("emo")), 1.8), `감성 가중치 합이 1.8이다 (${sumW(byId("emo"))})`);
check(near(sumW(byId("teen")), 2.0), `하이틴 가중치 합이 2.0이다 (${sumW(byId("teen"))})`);

// ---------- 3~5) conceptOf 기본값·매칭·방어 ----------
check(conceptOf({}).id === "cool", "옛 세이브(concept 없음)는 청량 기본값이다");
check(conceptOf({ concept: "emo" }).id === "emo", "concept: emo면 감성을 고른다");
check(conceptOf({ concept: "없는거" }).id === "cool", "깨진 concept 값은 청량으로 방어된다");

// ---------- 6~10) trendMul ----------
const cool = byId("cool"), fierce = byId("fierce"), emo = byId("emo"), teen = byId("teen");
check(trendMul(emo, { hot: "emo", cold: "teen" }) === 1.18, "유행 컨셉이면 1.18배다");
check(trendMul(teen, { hot: "emo", cold: "teen" }) === 0.85, "식상 컨셉이면 0.85배다");
check(trendMul(cool, { hot: "emo", cold: "teen" }) === 1, "유행도 식상도 아니면 1배다");
check(trendMul(emo, { hot: "emo", cold: "emo" }) === 1, "같은 컨셉이 유행이자 식상이면 상쇄돼 1배다");
check(trendMul(cool, {}) === 1, "act에 hot/cold가 없는 옛 세이브는 1배다");
check(fierce.id === "fierce", "강렬 컨셉 객체를 정상적으로 참조한다"); // byId 자체 확인용 sanity

// ---------- 11~13) expectedSales ----------
const statsVocal = { vocal: 150, dance: 60, charm: 60, rap: 60 };
const statsDance = { vocal: 60, dance: 150, charm: 60, rap: 60 };
const sVocalEmo = expectedSales(statsVocal, emo, 0, 0);
const sVocalCool = expectedSales(statsVocal, cool, 0, 0);
check(sVocalEmo > sVocalCool, `보컬 150 스탯에서 감성이 청량보다 판매량이 높다 (감성 ${sVocalEmo} vs 청량 ${sVocalCool})`);

const sDanceCool = expectedSales(statsDance, cool, 0, 0);
const sDanceEmo = expectedSales(statsDance, emo, 0, 0);
check(sDanceCool > sDanceEmo, `댄스 150 스탯에서 청량이 감성보다 판매량이 높다 (청량 ${sDanceCool} vs 감성 ${sDanceEmo})`);

const lowFan = expectedSales(statsVocal, emo, 0, 0);
const midFan = expectedSales(statsVocal, emo, 1000, 0);
const highFan = expectedSales(statsVocal, emo, 5000, 0);
check(lowFan <= midFan && midFan <= highFan,
  `팬덤이 오르면 expectedSales가 단조 증가한다 (${lowFan} → ${midFan} → ${highFan})`);
check(lowFan < highFan, `팬덤 차이가 실제로 값을 움직인다 (${lowFan} vs ${highFan})`);

// ---------- 14~17) rollTrend — 소문 2종 ----------
const { rollTrend } = Career._t;
check(typeof rollTrend === "function", "rollTrend이 _t로 노출된다");
if (typeof rollTrend !== "function") { console.log("\n❌ 실패"); process.exit(1); }

const validIds = new Set(CONCEPTS.map((c) => c.id));
let badHotCold = 0, badRumor = 0, rumorFirst = 0, rumorSecond = 0;
const hotSeen = new Set();
for (let i = 0; i < 300; i++) {
  const r = rollTrend();
  if (!validIds.has(r.hot) || !validIds.has(r.cold)) badHotCold++;
  hotSeen.add(r.hot);
  const rumorOk = Array.isArray(r.rumor) && r.rumor.length === 2
    && r.rumor[0] !== r.rumor[1] && r.rumor.includes(r.hot);
  if (!rumorOk) badRumor++;
  if (r.rumor && r.rumor[0] === r.hot) rumorFirst++;
  if (r.rumor && r.rumor[1] === r.hot) rumorSecond++;
}
check(badHotCold === 0, "300회 모두 hot·cold가 CONCEPTS의 id다");
check(hotSeen.size === 4, `300회 중 hot이 4종 전부 나온다 (${[...hotSeen].sort().join(",")})`);
check(badRumor === 0, "300회 전부 rumor 길이 2 · 서로 다른 값 · hot을 포함한다");
check(rumorFirst > 0 && rumorSecond > 0,
  `rumor 안에서 hot의 위치가 고정되지 않는다 (앞칸 ${rumorFirst}회, 뒤칸 ${rumorSecond}회)`);

// ---------- 18~19) 게임 입구를 통해 확인 (jsdom, standings-test.js와 같은 부트스트랩) ----------
let page2 = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
page2 = page2.replace("</head>", `<script>${PRELUDE}</script></head>`);
page2 = page2.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom2 = new JSDOM(page2, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/idol/" });
const w2 = dom2.window;
w2.Ads = { display() {}, init() {} };
w2.Stats = { log() {} };
const $2 = (id) => w2.document.getElementById(id);
const activeScreen2 = () => (w2.document.querySelector(".screen.active") || {}).id;
const get2 = w2.__get, set2 = w2.__set;

const Career2 = w2.Career || w2.IdolCareer;
check(!!Career2, "두 번째 페이지에서도 Career 모듈이 로드된다");
check(typeof Career2?._t?.state === "function", "state가 _t로 노출된다");
if (!Career2 || typeof Career2._t.state !== "function") { console.log("\n❌ 실패"); process.exit(1); }

set2("S", get2('newState(AGENCIES[0], "vocal", "테스트")'));
const G2 = get2("S");
G2.phase = "idol-pro";
G2.group = "테스트팀";
G2.center = true;
G2.proYear = 1;
G2.camp = 1;
G2.activity = null;
G2.pendingShow = false;
G2.proLog = [];
G2.fandom = 500;
G2.money = 3000;
G2.condition = 90;
for (const k of Object.keys(G2.stats)) G2.stats[k] = 100;
G2.career = { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0, tours: 0 };
delete G2.standings;

Career2.showActivity();
const restBtn2 = () => Array.from(w2.document.querySelectorAll("#pro-actions .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);
restBtn2().click(); // 마지막 연습 턴 소진 → 1차 컴백 시작

const act1 = Career2._t.state().activity;
check(!!act1, "컴백이 시작되면 activity가 채워진다");
check(!!act1 && act1.concept === null, "고르기 전에는 concept이 null이다");
check(!!act1 && validIds.has(act1.hot) && validIds.has(act1.cold),
  `activity에도 hot·cold가 CONCEPTS의 id로 채워진다 (hot=${act1 && act1.hot}, cold=${act1 && act1.cold})`);
check(!!act1 && Array.isArray(act1.rumor) && act1.rumor.length === 2 && act1.rumor.includes(act1.hot),
  `activity의 rumor에도 실제 hot이 들어 있다 (${act1 && JSON.stringify(act1.rumor)})`);

// 한 주를 실제로 소화해요 — 화면 버튼만 눌러서 (standings-test.js의 playWeek과 동일한 방식)
function playWeek2() {
  let guard = 0;
  while (activeScreen2() === "screen-pro" && guard++ < 10) {
    const go = w2.document.querySelector("#pro-actions .go-game");
    if (go) { go.click(); break; }
    restBtn2().click();
  }
  if (activeScreen2() !== "screen-stage") return false;
  $2("btn-stage-next").click();        // ⏩ 빨리 감기 → 미니게임 자동 → 주간 차트
  $2("btn-stage-next").click();        // 다음 무대 준비 / 다음 컴백
  return true;
}

// 1차 컴백은 6주예요. 6주째 무대가 끝나도 cb는 그대로고, 다음 번 연습(afterPrep)에서
// 컴백 롤오버가 일어나요 — 그래서 7번째 playWeek2() 호출까지 지켜봐야 cb가 2로 넘어가요.
let weeks2 = 0;
while (Career2._t.state().activity.cb === 1 && weeks2 < 8) { check(playWeek2(), `1차 컴백 진행 중 무대가 소화된다 (${weeks2 + 1}회차)`); weeks2++; }
check(Career2._t.state().activity.cb === 2, `1차 컴백이 끝나면 2차 컴백으로 넘어간다 (${Career2._t.state().activity.cb}차)`);

const act2 = Career2._t.state().activity;
check(!!act2 && act2.concept === null, "2차 컴백이 시작되면 concept이 다시 null로 돌아간다");
check(!!act2 && validIds.has(act2.hot) && validIds.has(act2.cold),
  `2차 컴백도 hot·cold가 새로 굴려져 CONCEPTS의 id다 (hot=${act2 && act2.hot}, cold=${act2 && act2.cold})`);
check(!!act2 && Array.isArray(act2.rumor) && act2.rumor.length === 2 && act2.rumor.includes(act2.hot),
  `2차 컴백의 rumor에도 새 hot이 들어 있다 (${act2 && JSON.stringify(act2.rumor)})`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
