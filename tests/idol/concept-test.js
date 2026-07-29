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

// ---------- 20~27) 컨셉 선택 화면 — 전부 게임 입구(버튼 클릭)로만 도달해요 ----------
/* renderConcept()을 직접 부르지 않아요. 준비 화면의 음방 무대 액션(.go-game)을 실제로
 * 눌러서 화면에 닿고, 거기서 DOM을 읽어 확인해요. "함수는 있는데 브라우저에선 못 가는"
 * 기능을 다섯 번 겪은 저장소라서요. */
const T2 = Career2._t;
const goBtn2 = () => w2.document.querySelector("#pro-actions .go-game");
const cards2 = () => Array.from(w2.document.querySelectorAll("#screen-concept .concept-card"));
const nameOf2 = (id) => (T2.CONCEPTS.find((c) => c.id === id) || {}).name;
const finishStage2 = () => {
  $2("btn-stage-next").click();   // ⏩ 빨리 감기 → 미니게임 자동 → 주간 차트
  $2("btn-stage-next").click();   // 다음 무대 준비 / 다음 컴백 → 준비 화면
};
// 준비 화면에서 연습 턴을 소진해 무대 버튼이 뜰 때까지 (게이트를 우회하지 않아요)
const untilGo2 = () => {
  let guard = 0;
  while (activeScreen2() === "screen-pro" && !goBtn2() && guard++ < 10) restBtn2().click();
  return !!goBtn2();
};

check(!!goBtn2(), "1차 컴백 시작 버튼(.go-game)이 준비 화면에 있다");
goBtn2().click();
check(activeScreen2() === "screen-concept",
  `음방 무대 액션을 누르면 컨셉 선택 화면이 뜬다 (${activeScreen2()})`);
check(!$2("screen-stage").classList.contains("active"), "이때 무대 화면(screen-stage)은 안 보인다");

check(cards2().length === 4, `.concept-card가 4개다 (${cards2().length})`);
/* 카드 "순서"도 누설 통로예요. 진짜 유행을 늘 첫 칸으로 올리면 카드 하나하나는
 * 서로 구분되지 않는데도 첫 칸만 보고 답을 알 수 있어요. 순서는 CONCEPTS 정의
 * 그대로여야 해요 — 유행과 무관한 고정 순서라는 뜻이니까요. */
const cardOrder2 = cards2().map((c) => c.dataset.cid).join(",");
const conceptOrder2 = T2.CONCEPTS.map((c) => c.id).join(",");
check(cardOrder2 === conceptOrder2,
  `카드 순서가 CONCEPTS 정의 순서와 같다 — 유행에 따라 재정렬되지 않는다 (카드 ${cardOrder2} vs 정의 ${conceptOrder2})`);
const rumorCards2 = cards2().filter((c) => c.classList.contains("concept-rumor"));
const plainCards2 = cards2().filter((c) => !c.classList.contains("concept-rumor"));
check(rumorCards2.length === 2, `.concept-rumor가 붙은 카드가 정확히 2개다 (${rumorCards2.length})`);
const rumorCids2 = rumorCards2.map((c) => c.dataset.cid).sort().join(",");
check(rumorCids2 === [...act1.rumor].sort().join(","),
  `소문 카드의 data-cid 집합이 act.rumor와 같다 (카드 ${rumorCids2} vs act ${[...act1.rumor].sort().join(",")})`);

/* 정보 누설 방지 — 이 화면은 act.rumor만 본다.
 * 카드는 4장 다 그리니까 '식상 컨셉의 이름이 화면에 아예 없다'로는 잴 수 없어요.
 * 대신 (a) 소문 줄에 식상이 안 섞이는지, (b) 확정을 가리키는 낱말이 없는지,
 * (c) 카드끼리 서로 구분되는 표시가 없는지를 봐요. 배수가 새면 (c)에서 잡혀요. */
const conceptText2 = $2("screen-concept").textContent;
const rumorLine2 = $2("concept-rumor-line").textContent;
check(act1.rumor.every((id) => rumorLine2.includes(nameOf2(id))),
  `소문 줄에 rumor 2종의 이름이 그대로 나온다 (${rumorLine2.trim()})`);
check(act1.rumor.includes(act1.cold) || !rumorLine2.includes(nameOf2(act1.cold)),
  `확정 식상(${nameOf2(act1.cold)})은 소문 줄에 등장하지 않는다`);
const leakWords2 = ["확정", "식상", "유행", "진짜", "정답", "배수"];
const leaked2 = leakWords2.filter((wd) => conceptText2.includes(wd));
check(leaked2.length === 0, `화면 어디에도 확정을 가리키는 낱말이 없다 (${leaked2.join(",") || "없음"})`);

/* 카드에서 컨셉 고유 내용(이모지·이름·설명·예상 판매량)을 지운 뒤 남는 껍데기를 비교해요.
 * 숫자를 뭉개는 건 **태그 바깥 텍스트뿐**이에요. 예상 판매량은 카드마다 다른 게 정상이라
 * 뭉개야 하지만, 속성값까지 같이 뭉개면 data-h="1" / data-h="0" 처럼 숫자로 진짜 유행을
 * 심는 누설이 둘 다 N이 돼서 안 잡혀요. 속성값은 그대로 두고 비교해요. */
const norm2 = (el) => {
  const c = T2.CONCEPTS.find((x) => x.id === el.dataset.cid) || { emoji: "", name: "", desc: "" };
  // data-cid는 속성 값만 지워요 — 통째로 치환하면 클래스명(c-emoji)의 "emo"까지 먹혀요
  return el.outerHTML
    .replace(/data-cid="[^"]*"/, 'data-cid="·"')
    .split(c.emoji).join("·")
    .split(c.name).join("·")
    .split(c.desc).join("·")
    .replace(/>([^<]*)</g, (m0, text) => `>${text.replace(/\d+/g, "N")}<`);
};
check(norm2(rumorCards2[0]) === norm2(rumorCards2[1]),
  "소문 카드 2장은 서로 구분되지 않는다 (둘 중 어느 쪽이 진짜 유행인지 표시가 없다)");
check(plainCards2.length === 2 && norm2(plainCards2[0]) === norm2(plainCards2[1]),
  "소문 밖 카드 2장도 서로 구분되지 않는다 (식상 표시가 없다)");

/* 예상 판매량 — 소스에서 뽑은 expectedSales로 계산해 비교해요. 숫자를 적어두지 않아요.
 * 유행 배수가 곱해져 있으면 값이 어긋나서 실패해요. */
const S2 = T2.state();
const salesBad2 = cards2().filter((el) => {
  const c = T2.CONCEPTS.find((x) => x.id === el.dataset.cid);
  const shown = Number((el.querySelector(".c-sales").textContent.match(/\d+/) || [0])[0]);
  return shown !== T2.expectedSales(S2.stats, c, S2.fandom, act1.cbWins);
});
check(salesBad2.length === 0,
  `카드 4장의 예상 판매량이 expectedSales와 정확히 일치한다 (어긋난 카드 ${salesBad2.map((e) => e.dataset.cid).join(",") || "없음"})`);
// 위 검사가 실효 있는지 — 배수가 붙었다면 실제로 숫자가 달라지는 상황인지 확인해요
const hotC2 = T2.CONCEPTS.find((c) => c.id === act1.hot);
const otherId2 = T2.CONCEPTS.map((c) => c.id).find((id) => id !== act1.hot);
const pureHot2 = T2.expectedSales(S2.stats, hotC2, S2.fandom, act1.cbWins);
const mulHot2 = Math.round(pureHot2 * T2.trendMul(hotC2, { hot: act1.hot, cold: otherId2 }));
check(mulHot2 !== pureHot2,
  `유행 배수가 얹혔다면 숫자가 달라지는 상황이다 — 위 검사가 실효 있다 (순수 ${pureHot2} vs 배수 ${mulHot2})`);

// 카드를 클릭하면 그 컨셉이 확정돼요
const picked2 = cards2()[1];
const pickedId2 = picked2.dataset.cid;
picked2.click();
check(T2.state().activity.concept === pickedId2,
  `카드를 클릭하면 act.concept이 그 카드의 data-cid가 된다 (${pickedId2} → ${T2.state().activity.concept})`);
// 고르고 나면 유행 공개 화면을 한 번 지나요 (Task 4) — 우회하지 않고 버튼을 눌러 통과해요
check(activeScreen2() === "screen-reveal", `고르고 나면 유행 공개 화면으로 넘어간다 (${activeScreen2()})`);
$2("btn-reveal-go").click();
check(activeScreen2() === "screen-stage", `공개 화면에서 시즌을 시작하면 무대로 넘어간다 (${activeScreen2()})`);

// 같은 컴백 안에서 다시 진입하면 선택 화면을 건너뛰어요
finishStage2();
check(untilGo2(), "다음 주 무대 버튼이 다시 뜬다");
check(T2.state().activity.concept === pickedId2, "컴백이 이어지는 동안 고른 컨셉이 유지된다");
goBtn2().click();
check(activeScreen2() === "screen-stage",
  `컨셉을 이미 고른 컴백은 선택 화면을 건너뛰고 바로 무대로 간다 (${activeScreen2()})`);

// 옛 세이브 — concept은 있는데 hot/cold/rumor가 없는 상태로 진입해도 선택 화면이 안 떠요
finishStage2();
check(untilGo2(), "옛 세이브 검사 전 무대 버튼이 다시 뜬다");
const oldAct2 = T2.state().activity;
oldAct2.concept = "cool";
delete oldAct2.hot;
delete oldAct2.cold;
delete oldAct2.rumor;
goBtn2().click();
check(activeScreen2() === "screen-stage",
  `concept이 이미 있는 옛 세이브(hot·rumor 없음)로 진입해도 선택 화면이 안 뜬다 (${activeScreen2()})`);
finishStage2();

// 소문이 없는 옛 세이브가 컴백 중간에 업데이트를 맞아도 화면이 그려져요 (act.rumor || [])
check(untilGo2(), "소문 없는 옛 세이브 검사 전 무대 버튼이 다시 뜬다");
oldAct2.concept = null;
goBtn2().click();
check(activeScreen2() === "screen-concept", `소문이 없어도 컨셉 선택 화면은 뜬다 (${activeScreen2()})`);
check(cards2().length === 4 && cards2().every((c) => !c.classList.contains("concept-rumor")),
  `소문이 없는 옛 세이브에서는 소문 배지가 하나도 안 붙는다 (카드 ${cards2().length}장 · 배지 ${cards2().filter((c) => c.classList.contains("concept-rumor")).length}개)`);
check($2("concept-rumor-line").textContent.includes("잠잠"),
  `소문이 없으면 안내 문구로 대신한다 (${$2("concept-rumor-line").textContent.trim()})`);
cards2()[0].click();
check(activeScreen2() === "screen-reveal", `소문이 없어도 공개 화면은 지나간다 (${activeScreen2()})`);
$2("btn-reveal-go").click();
check(activeScreen2() === "screen-stage" && oldAct2.concept === "cool",
  `소문이 없어도 카드를 골라 무대로 넘어갈 수 있다 (${activeScreen2()} · ${oldAct2.concept})`);
finishStage2();

// 한 주를 실제로 소화해요 — 화면 버튼만 눌러서 (standings-test.js의 playWeek과 동일한 방식)
const gateLog2 = [];   // 컨셉 게이트가 열린 시점 기록 (몇 차 컴백에서, 그때 concept이 뭐였는지)
function playWeek2() {
  let guard = 0;
  while (activeScreen2() === "screen-pro" && guard++ < 10) {
    const go = w2.document.querySelector("#pro-actions .go-game");
    if (go) { go.click(); break; }
    restBtn2().click();
  }
  // 새 컴백이면 컨셉 게이트를 먼저 지나야 무대가 열려요 (게이트를 우회하지 않아요)
  if (activeScreen2() === "screen-concept") {
    // 화면이 뜬 그 순간의 concept 값을 남겨둬요 — 컴백마다 null로 돌아가는지 여기서 봐요
    gateLog2.push({ cb: Career2._t.state().activity.cb, before: Career2._t.state().activity.concept });
    const card = w2.document.querySelector("#concept-list .concept-card");
    if (card) card.click();
  }
  // 컨셉을 고르면 유행 공개 화면이 한 번 끼어들어요 — 여기도 버튼을 눌러 지나가요
  if (activeScreen2() === "screen-reveal") $2("btn-reveal-go").click();
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
/* 2차 컴백이 시작되면 concept이 null로 돌아가서 선택 화면이 다시 열려요.
 * 게이트가 생긴 뒤로는 playWeek2가 그 화면을 지나며 컨셉을 고르니, 루프가 끝난 시점의
 * act2.concept은 이미 채워져 있어요. 그래서 '화면이 열린 그 순간'의 값을 봐요. */
const gate2 = gateLog2.find((g) => g.cb === 2);
check(!!gate2, "2차 컴백에서도 컨셉 선택 화면이 다시 열린다");
check(!!gate2 && gate2.before === null,
  `2차 컴백이 시작되면 concept이 다시 null로 돌아간다 (선택 화면 진입 시 ${gate2 && JSON.stringify(gate2.before)})`);
check(!!act2 && act2.concept !== null, "선택 화면에서 고른 컨셉이 2차 컴백에 남는다");
check(!!act2 && validIds.has(act2.hot) && validIds.has(act2.cold),
  `2차 컴백도 hot·cold가 새로 굴려져 CONCEPTS의 id다 (hot=${act2 && act2.hot}, cold=${act2 && act2.cold})`);
check(!!act2 && Array.isArray(act2.rumor) && act2.rumor.length === 2 && act2.rumor.includes(act2.hot),
  `2차 컴백의 rumor에도 새 hot이 들어 있다 (${act2 && JSON.stringify(act2.rumor)})`);

// ---------- 28~33) 유행 공개 화면 — 상태만 정해두고 도달은 전부 버튼 클릭으로 ----------
/* 유행은 컴백마다 랜덤이라 "고른 컨셉이 hot과 같은" 판을 기다리면 테스트가 흔들려요.
 * 그래서 act.hot/act.cold를 먼저 정해두고, 준비 화면의 무대 버튼(.go-game)을 실제로
 * 눌러 선택 화면에 들어간 뒤 원하는 카드를 실제로 클릭해요.
 * renderReveal()은 절대 직접 부르지 않아요 — "함수는 있는데 브라우저에선 못 가는"
 * 기능을 다섯 번 겪은 저장소라서, 화면에 닿는 길은 언제나 버튼이어야 해요. */
const otherThan2 = (id) => T2.CONCEPTS.map((c) => c.id).find((x) => x !== id);
const conceptById2 = (id) => T2.CONCEPTS.find((c) => c.id === id);
const effect2 = () => $2("reveal-effect");
const effectText2 = () => effect2().textContent.replace(/\s+/g, " ").trim();

function enterConcept2(hot, cold) {
  const act = T2.state().activity;
  // 주차를 되돌려 이 컴백이 끝나지 않게 해요 (연말 결산으로 새면 화면이 달라져요)
  act.week = 0;
  act.concept = null;
  act.hot = hot;
  act.cold = cold;
  act.rumor = [hot, otherThan2(hot)];
  if (!untilGo2()) return false;
  goBtn2().click();
  return activeScreen2() === "screen-concept";
}
function pickCard2(id) {
  const el = cards2().find((c) => c.dataset.cid === id);
  if (el) el.click();
  return !!el;
}
// 공개 화면을 지나 무대를 소화하고 준비 화면으로 돌아와요
// afterEnter를 주면 무대 화면에 막 도착한 시점(finishStage2 이전)에 한 번 불러줘요.
function leaveReveal2(afterEnter) {
  $2("btn-reveal-go").click();
  const atStage = activeScreen2() === "screen-stage";
  if (atStage) {
    if (afterEnter) afterEnter();
    finishStage2();
  }
  return atStage;
}

/* 카드 순서 — 확정 유행을 첫 칸으로 끌어올리는 재정렬이 없는지 확정 상태에서 봐요.
 * 위(190행 근처)의 같은 검사는 그 판의 유행이 랜덤이라, 유행이 마침 첫 컨셉이면
 * 재정렬해도 순서가 안 바뀌어요. 여기서는 정의상 **마지막** 카드인 하이틴을
 * 유행으로 못 박아서, 재정렬이 있으면 반드시 걸리게 해요. */
check(enterConcept2("teen", "cool"), `카드 순서 검사를 위해 유행 하이틴으로 선택 화면에 들어간다 (${activeScreen2()})`);
check(cards2().map((c) => c.dataset.cid).join(",") === conceptOrder2,
  `확정 유행이 마지막 컨셉(하이틴)이어도 카드 순서가 정의 그대로다 (${cards2().map((c) => c.dataset.cid).join(",")} vs ${conceptOrder2})`);
check(pickCard2("cool"), "순서 검사 뒤 청량 카드를 골라 빠져나온다");
check(leaveReveal2(), "순서 검사 판도 시즌 시작으로 무대에 들어간다");

// 28) 카드를 고르면 공개 화면이 먼저 뜨고, 무대는 아직 안 열려요
check(enterConcept2("emo", "teen"), `유행 감성·식상 하이틴으로 선택 화면에 다시 들어간다 (${activeScreen2()})`);
check(pickCard2("emo"), "감성 카드를 실제로 클릭한다");
check(activeScreen2() === "screen-reveal", `카드를 클릭하면 유행 공개 화면이 뜬다 (${activeScreen2()})`);
check(!$2("screen-stage").classList.contains("active"), "공개 화면일 때 무대 화면(screen-stage)은 아직 안 보인다");
/* hidden 속성이 남아 있으면 .active가 붙어도 브라우저에선 안 보여요.
 * 다른 .screen과 똑같이 .active로만 제어되는지 확인해요. */
check(!$2("screen-reveal").hasAttribute("hidden")
  && w2.document.querySelectorAll(".screen.active").length === 1,
  `공개 화면은 hidden 없이 .active로만 제어된다 (활성 화면 ${w2.document.querySelectorAll(".screen.active").length}개)`);

// 29) 유행 적중 — 배수 표기는 trendMul에서 뽑아 비교해요 (숫자를 옮겨 적지 않아요)
const actHit2 = T2.state().activity;
const hitPct2 = Math.round((T2.trendMul(conceptById2("emo"), actHit2) - 1) * 100);
check(effect2().classList.contains("reveal-hit"),
  `고른 컨셉이 유행이면 #reveal-effect에 .reveal-hit이 붙는다 (${effect2().className})`);
check(hitPct2 === 18, `trendMul 기준 적중 보정이 +18%다 (${hitPct2}%)`);
check(effectText2().includes(`+${hitPct2}%`), `적중 문구에 +${hitPct2}%가 있다 (${effectText2()})`);
check($2("reveal-trend").textContent.includes(conceptById2("emo").name)
  && $2("reveal-trend").textContent.includes(conceptById2("teen").name),
  `공개 화면에서는 확정 유행·식상을 둘 다 보여준다 (${$2("reveal-trend").textContent.replace(/\s+/g, " ").trim()})`);

// 33) 공개 화면의 시즌 시작 버튼으로 무대에 들어가요
$2("btn-reveal-go").click();
check(activeScreen2() === "screen-stage", `공개 화면의 "🎤 시즌 시작"을 누르면 무대로 넘어간다 (${activeScreen2()})`);
check(!!$2("btn-stage-next") && !$2("screen-reveal").classList.contains("active"),
  "무대로 넘어가면 공개 화면은 닫힌다");

// 34~35) 무대 화면 상단(#stage-round)에도 고른 컨셉과 적중 버프가 남아있어요
const stageActHit2 = T2.state().activity;
const stageConceptHit2 = conceptById2(stageActHit2.concept);
check($2("stage-round").textContent.includes(stageConceptHit2.name),
  `무대 화면(#stage-round)에 고른 컨셉 이름이 있다 (${$2("stage-round").textContent})`);
const stagePctHit2 = Math.round((T2.trendMul(stageConceptHit2, stageActHit2) - 1) * 100);
check(stagePctHit2 === 18 && $2("stage-round").textContent.includes(`+${stagePctHit2}%`),
  `유행 적중이면 #stage-round에 +18%가 있다 (${$2("stage-round").textContent})`);

finishStage2();

// 30) 식상 적중 — 같은 유행 판에서 하이틴을 고르면 너프예요
check(enterConcept2("emo", "teen"), `식상 검사를 위해 선택 화면에 다시 들어간다 (${activeScreen2()})`);
check(pickCard2("teen"), "하이틴 카드를 실제로 클릭한다");
check(activeScreen2() === "screen-reveal", `식상을 골라도 공개 화면이 뜬다 (${activeScreen2()})`);
const missPct2 = Math.round((T2.trendMul(conceptById2("teen"), T2.state().activity) - 1) * 100);
check(effect2().classList.contains("reveal-miss"),
  `고른 컨셉이 식상이면 .reveal-miss가 붙는다 (${effect2().className})`);
check(missPct2 === -15, `trendMul 기준 식상 보정이 -15%다 (${missPct2}%)`);
check(effectText2().includes(`${missPct2}%`), `식상 문구에 ${missPct2}%가 있다 (${effectText2()})`);
// 36) 식상이면 무대 화면(#stage-round)에도 -15%가 남아있어요
check(leaveReveal2(() => {
  const a = T2.state().activity;
  const c = conceptById2(a.concept);
  const pct = Math.round((T2.trendMul(c, a) - 1) * 100);
  check(pct === -15 && $2("stage-round").textContent.includes(`${pct}%`),
    `식상이면 #stage-round에 -15%가 있다 (${$2("stage-round").textContent})`);
}), "식상 판도 시즌 시작으로 무대에 들어간다");

// 31) 유행도 식상도 아니면 무난 — 퍼센트 표기가 아예 없어요
check(enterConcept2("emo", "teen"), `무난 검사를 위해 선택 화면에 다시 들어간다 (${activeScreen2()})`);
check(pickCard2("cool"), "청량 카드를 실제로 클릭한다");
check(effect2().classList.contains("reveal-flat"),
  `유행도 식상도 아니면 .reveal-flat이 붙는다 (${effect2().className})`);
check(!effectText2().includes("%"), `무난한 시즌에는 % 표기가 없다 (${effectText2()})`);
// 36) 무난하면 무대 화면(#stage-round)에도 % 표기가 없어요
check(leaveReveal2(() => {
  check(!$2("stage-round").textContent.includes("%"),
    `무난하면 #stage-round에 % 표기가 없다 (${$2("stage-round").textContent})`);
}), "무난 판도 시즌 시작으로 무대에 들어간다");

// 32) hot과 cold가 같으면 상쇄 — 그 컨셉을 골라도 무난이에요
check(enterConcept2("fierce", "fierce"), `상쇄 검사를 위해 선택 화면에 다시 들어간다 (${activeScreen2()})`);
check(pickCard2("fierce"), "강렬 카드를 실제로 클릭한다");
const sameAct2 = T2.state().activity;
check(sameAct2.hot === sameAct2.cold && T2.trendMul(conceptById2("fierce"), sameAct2) === 1,
  `유행과 식상이 같은 판이고 trendMul이 1배다 (hot=${sameAct2.hot}, cold=${sameAct2.cold})`);
check(effect2().classList.contains("reveal-flat"),
  `유행이자 식상인 컨셉을 골랐으면 상쇄돼 .reveal-flat이다 (${effect2().className})`);
check(!effectText2().includes("%"), `상쇄된 판에도 % 표기가 없다 (${effectText2()})`);
check(leaveReveal2(), "상쇄 판도 시즌 시작으로 무대에 들어간다");

/* 38) CONCEPTS에 없는 id를 든 세이브 — 공개 화면의 유행 판정과 배수가 어긋나지 않아요.
 * trendMul은 act.hot이 유효한 id인지 안 봐요. hot이 "retro"(없는 id)이고 cold가 청량이면
 * 청량을 고른 사람은 실제로 ×0.85를 맞아요. 그런데 화면이 act.hot/act.cold를 따로 읽어
 * 판정하던 시절엔 "이번 시즌은 뚜렷한 유행이 없었어요"라고 써놓고 바로 아래에서 -15%를
 * 띄웠어요 — 한 화면이 자기모순이었어요. 지금은 rollTrend가 유효한 id만 만들어서 안 터지지만,
 * 컨셉을 추가하거나 개명하면 바로 나와요. 판정을 trendMul로 일원화한 뒤의 회귀 검사예요. */
check(enterConcept2("retro", "cool"), `없는 컨셉 id가 유행인 세이브로 선택 화면에 들어간다 (${activeScreen2()})`);
check(pickCard2("cool"), "그 판에서 청량 카드를 고른다");
const ghostAct2 = T2.state().activity;
const ghostMul2 = T2.trendMul(conceptById2("cool"), ghostAct2);
const ghostPct2 = Math.round((ghostMul2 - 1) * 100);
check(ghostMul2 < 1, `trendMul은 이 판을 식상(×${ghostMul2})으로 본다 — 자기모순이 성립할 조건이다`);
const ghostTrend2 = $2("reveal-trend").textContent.replace(/\s+/g, " ").trim();
check(!ghostTrend2.includes("없었어요"),
  `배수가 붙는 판을 "유행이 없었어요"라고 쓰지 않는다 (${ghostTrend2})`);
check(ghostTrend2.includes("식상") && ghostTrend2.includes(conceptById2("cool").name),
  `식상 컨셉(청량)을 화면에 그대로 밝힌다 (${ghostTrend2})`);
check(effect2().classList.contains("reveal-miss") && effectText2().includes(`${ghostPct2}%`),
  `효과 박스는 trendMul 그대로 ${ghostPct2}%다 (${effectText2()})`);
check(leaveReveal2(), "없는 id 판도 시즌 시작으로 무대에 들어간다");

// ---------- 39~) 컴백 결과의 초동 "숫자" — 컨셉과 유행이 실제 판매량에 닿는지 ----------
/* #cb-result에 컨셉 "이름"이 있는지만 보면, cbSales에서 trendMul(concept, act)를 통째로
 * 1로 바꾸거나 expectedSales의 concept 자리에 CONCEPTS[0]을 박아도 전부 초록이에요.
 * 그래서 화면에 찍힌 초동 숫자를 직접 뽑아, 소스에서 꺼낸
 * expectedSales × trendMul × (1 ± v) 범위와 대조해요.
 * 편차 v가 있어서 한 판으로는 못 갈라요 — 같은 조건을 여러 판 돌려 **전부** 범위 안인지,
 * 그리고 평균 배율이 trendMul 근처인지 함께 봐요.
 *
 * 능력치는 일부러 보컬 쪽으로 몰아둬요. 전부 100이면 청량과 감성의 기댓값이 우연히
 * 같아져서(가중치 합이 둘 다 1.8) 컨셉을 바꿔치기해도 숫자가 안 변하거든요. */
const skew2 = T2.state().stats;
skew2.vocal = 150; skew2.dance = 50; skew2.rap = 50; skew2.charm = 50;

// 컴백의 마지막 주를 실제로 소화해서 #cb-result의 초동 숫자를 받아와요
function finalWeek2(hot, cold, cid, lastCb) {
  if (!enterConcept2(hot, cold)) return null;
  if (!pickCard2(cid)) return null;
  $2("btn-reveal-go").click();
  if (activeScreen2() !== "screen-stage") return null;
  const a = T2.state().activity;
  a.cb = lastCb ? a.cbTotal : 1;   // 연말 결산으로 새지 않게 차수를 못 박아요
  a.week = a.weekTotal - 1;        // 이번 무대가 이 컴백의 마지막 주가 되게 해요
  $2("btn-stage-next").click();    // 미니게임 자동 → 주간 차트 → 컴백 종료 처리
  const text = $2("cb-result").textContent.replace(/\s+/g, " ").trim();
  const St = T2.state();
  const c = conceptById2(a.concept);
  /* 판매량은 주간 차트가 팬덤·1위 횟수를 갱신한 **뒤에** 계산돼요.
   * 그래서 갱신된 지금 값으로 다시 계산해야 산식과 같은 입력이 돼요. */
  return {
    shown: Number((text.match(/초동 (\d+)만/) || [0, NaN])[1]),
    pure: T2.expectedSales(St.stats, c, St.fandom, a.cbWins),
    mul: T2.trendMul(c, a), v: c.v, name: c.name, text,
  };
}

const N2 = 12;   // 편차 v 안에서 흔들리니 한 판으론 못 갈라요
function salesCase2(label, hot, cold, cid) {
  const rows = [];
  for (let i = 0; i < N2; i++) {
    const r = finalWeek2(hot, cold, cid, false);
    if (!r || !Number.isFinite(r.shown)) {
      check(false, `${label}: ${i + 1}번째 판에서 초동 숫자를 못 읽었어요 (${r ? r.text : activeScreen2()})`);
      return;
    }
    rows.push(r);
    $2("btn-stage-next").click();   // 다음 컴백 준비 → 준비 화면
  }
  const mul = rows[0].mul, v = rows[0].v;
  check(rows.every((r) => r.mul === mul && r.v === v),
    `${label}: ${N2}판 모두 같은 배수·편차 조건이다 (×${mul} · ±${v})`);
  check(rows.every((r) => r.text.includes(r.name)), `${label}: #cb-result에 고른 컨셉 이름이 남는다 (${rows[0].name})`);
  // 산식은 Math.round(expected × mul × (1 ± v))예요 — 반올림 여유 1을 얹어 범위를 잡아요
  const bad = rows.filter((r) => r.shown < Math.floor(r.pure * mul * (1 - v)) - 1
                              || r.shown > Math.ceil(r.pure * mul * (1 + v)) + 1);
  check(bad.length === 0,
    `${label}: ${N2}판 전부 초동이 expectedSales × ${mul} × (1 ± ${v}) 안이다 (벗어난 판 ${
      bad.length ? bad.map((r) => `${r.shown}/${r.pure}`).join(" ") : "없음"})`);
  const ratio = rows.reduce((a, r) => a + r.shown / r.pure, 0) / N2;
  check(Math.abs(ratio - mul) <= v,
    `${label}: ${N2}판 평균 배율이 trendMul(${mul})에 붙는다 (실측 ×${ratio.toFixed(3)})`);
  return ratio;
}

const hotRatio2 = salesCase2("유행 적중(감성)", "emo", "cool", "emo");
const coldRatio2 = salesCase2("식상(감성)", "cool", "emo", "emo");
const flatRatio2 = salesCase2("무난(감성)", "cool", "teen", "emo");
check(hotRatio2 > flatRatio2 && flatRatio2 > coldRatio2,
  `같은 컨셉·같은 능력치인데 유행 > 무난 > 식상 순으로 실제 초동이 갈린다 (${
    [hotRatio2, flatRatio2, coldRatio2].map((x) => (x || 0).toFixed(3)).join(" > ")})`);

// ---------- 연말 결산에 고른 컨셉과 적중 여부가 남는지 ----------
/* 스펙: "이 배수는 컴백 진행 내내 무대 화면 상단에 배지로 남는다.
 *        연말 결산에도 고른 컨셉과 적중 여부를 남긴다."
 * 한 해에 컴백이 2번이라 둘 다 남아야 해요. 앞선 검사들이 컴백을 여러 번 강제로
 * 끝냈으니 올해 기록을 비우고, 유행 적중 한 번 · 식상 한 번을 실제로 굴려 확인해요. */
T2.state().yearConcepts = [];
/* 옛 연차 기록에는 concepts가 아예 없어요. 마이그레이션하지 않는 게 방침이라
 * 읽는 쪽이 방어해야 해요 — 그 방어를 실제 표에서 확인하려고 옛 모양을 하나 끼워둬요. */
T2.state().career.years.push({ y: 0, hype: 5, wins: 3, sales: 100, dFan: 10, awards: [] });

const yr1 = finalWeek2("emo", "cool", "emo", false);
check(!!yr1 && yr1.mul > 1, `결산 검사 1차 컴백 — 감성으로 유행에 적중한다 (×${yr1 && yr1.mul})`);
$2("btn-stage-next").click();   // 2차 컴백 준비 → 준비 화면
const yr2 = finalWeek2("cool", "emo", "emo", true);
check(!!yr2 && yr2.mul < 1, `결산 검사 2차 컴백 — 감성이 식상에 걸린다 (×${yr2 && yr2.mul})`);
check($2("btn-stage-next").textContent.includes("연말 결산"),
  `2차 컴백이 끝나면 연말 결산 버튼이 나온다 (${$2("btn-stage-next").textContent})`);
$2("btn-stage-next").click();   // 🏁 연말 결산
check(activeScreen2() === "screen-career", `연말 결산 화면으로 넘어간다 (${activeScreen2()})`);

const years2 = T2.state().career.years;
const yEntry2 = years2[years2.length - 1];
check(Array.isArray(yEntry2.concepts) && yEntry2.concepts.length === 2,
  `연차 기록에 그해 컨셉이 2개 남는다 (${JSON.stringify(yEntry2.concepts)})`);
check(!!yEntry2.concepts && yEntry2.concepts.every((c) => c.id === "emo"),
  "두 컴백 다 감성으로 골랐다는 사실이 그대로 남는다");
check(!!yEntry2.concepts && yEntry2.concepts[0].t === "hot" && yEntry2.concepts[1].t === "cold",
  `적중 여부가 컴백 순서대로 남는다 (${JSON.stringify((yEntry2.concepts || []).map((c) => c.t))})`);

const cardText2 = $2("career-card").textContent.replace(/\s+/g, " ").trim();
check(cardText2.includes(conceptById2("emo").name), `결산 화면에 고른 컨셉 이름이 있다 (${cardText2.slice(0, 160)})`);
check(cardText2.includes("적중") && cardText2.includes("식상"),
  "결산 화면에 적중 여부가 둘 다 적힌다 (적중 · 식상)");

// .season-table로 좁혀요 — 결산 카드 안에는 그룹 순위표(.standings-box)도 같이 들어 있어요
const yrRows2 = Array.from($2("career-card").querySelectorAll(".season-table tbody tr"));
const lastRow2 = yrRows2[yrRows2.length - 1];
const oldRow2 = yrRows2[yrRows2.length - 2];
check(!!lastRow2 && lastRow2.children.length === 5,
  `결산 표에 컨셉 칸이 생겼다 (칸 ${lastRow2 ? lastRow2.children.length : 0}개)`);
check(!!lastRow2 && lastRow2.children[3].textContent.includes(conceptById2("emo").emoji),
  `표의 컨셉 칸에 고른 컨셉이 들어간다 (${lastRow2 ? lastRow2.children[3].textContent : ""})`);
check(!!oldRow2 && oldRow2.children[3].textContent.trim() === "-",
  `concepts가 없는 옛 연차 기록은 마이그레이션 없이 "-"로 그려진다 (${oldRow2 ? oldRow2.children[3].textContent.trim() : ""})`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
