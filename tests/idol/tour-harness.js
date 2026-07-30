/* 🌏 월드투어를 실제 화면에서 돌리는 부트스트랩이에요.
 *
 * 산식만 떼어내 검사하면 "함수는 있는데 브라우저에선 못 가는" 기능이 그대로 통과해요.
 * 그래서 여기서는 실제 DOM(jsdom)에 페이지를 통째로 띄우고, 연말 결산 화면의 버튼을
 * 눌러 투어 화면에 들어가 도시를 전부 도는 것까지 봐요.
 *
 * tour-run-test.js(완주·보상)와 tour-depth-test.js(깊이·페이싱)가 같이 씁니다.
 * DOM을 한 번만 띄우고 투어를 수백 번 돌릴 수 있어요 — 투어는 저장하지 않는
 * 한 해짜리 이벤트라, S만 다시 세우면 처음 상태로 돌아가요.
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

function boot() {
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
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };

  const $ = (id) => w.document.getElementById(id);
  const activeScreen = () => (w.document.querySelector(".screen.active") || {}).id;
  const get = w.__get, set = w.__set;
  const Career = w.Career || w.IdolCareer;

  /* 투어 조건을 채운 프로 아이돌 한 명을 세워요.
   * opts로 능력치·컨디션을 흔들면 "여러 사람이 여러 컨디션으로 떠난" 표본이 돼요. */
  function setupPro(fandom, opts) {
    const o = opts || {};
    set("S", get('newState(AGENCIES[0], "vocal", "테스트")'));
    const S = get("S");
    S.phase = "idol-pro";
    S.group = "테스트팀";
    S.center = true;
    S.proYear = o.proYear === undefined ? 6 : o.proYear;
    S.camp = 0;
    S.activity = null;
    S.pendingShow = false;
    S.proLog = [];
    S.fandom = fandom;
    S.money = 5000;
    S.condition = o.condition === undefined ? 80 : o.condition;
    for (const k of Object.keys(S.stats)) S.stats[k] = o.stat === undefined ? 110 : o.stat;
    S.career = {
      years: [{ y: S.proYear, hype: 8.2, wins: 4, sales: 140, dFan: 90, awards: ["대상"] }],
      wins: 12, daesang: 3, bonsang: 2, rookie: 1, sales: 700, tours: 0,
    };
    return S;
  }

  const tourButton = () => Array.from(w.document.querySelectorAll("#career-actions button"))
    .find((b) => /월드투어/.test(b.textContent));

  /* 진행 중인 투어 상태. career.js의 IIFE 안에 있는 지역 변수라 __get으로는 못 봐요
   * (__get의 eval은 최상위 스크립트 스코프에서 돌아요). _t로 열어둔 창구를 씁니다. */
  const tourState = () => (Career._t.tourState ? Career._t.tourState() : null);

  /* 화면에 실제로 보이는 버튼만 세요 — 쉬어가기는 컨디션이 낮을 때만 나타나요.
   * base.css의 .hidden(display:none !important)으로 숨겨요. */
  const restButton = () => {
    const b = $("btn-tour-rest");
    return b && !b.classList.contains("hidden") ? b : null;
  };

  /* 게임이 원래 쓰는 자동 판정. policy.res로 덮어쓴 뒤 다음 판에서 되돌려요 —
   * 안 되돌리면 앞선 표본의 판정이 뒤 표본까지 물들어요. */
  const realAutoRes = get("autoRes");

  /* 투어를 한 번 완주시켜요.
   * policy.rest(info) — 쉬어가기 버튼이 떠 있을 때 쉴지 정해요 (기본: 안 쉬어요).
   * policy.res      — 미니게임 판정을 강제해요 ("perfect" | "good" | "miss").
   *                   함수를 주면 매번 불러요 (도시별로 다르게 줄 수 있어요).
   * 시작 전후를 비교할 수 있게 before를 같이 돌려줘요. */
  function runTour(policy) {
    const p = policy || {};
    const S = get("S");
    set("autoRes", !p.res ? realAutoRes : typeof p.res === "function" ? p.res : () => p.res);
    Career.showActivity();
    const enter = tourButton();
    if (!enter) return { entered: false };
    const before = { fandom: S.fandom, money: S.money, tours: S.career.tours, years: S.career.years.length };
    enter.click();
    const onTour = activeScreen() === "screen-tour";
    const go = $("btn-tour-go");
    let clicks = 0, rests = 0, restOffers = 0;
    /* 도시마다 한 번씩만 컨디션을 기록해요. "다음 도시로" 클릭에서는 아무것도
     * 안 바뀌니, 매 클릭마다 담으면 같은 값이 두 번씩 들어가요. */
    const conds = [];
    let lastI = -1;
    let fills = [];
    while (onTour && go && !$("tour-result").querySelector(".tour-grade") && clicks < 60) {
      if (go.disabled) break;
      const t = tourState();
      if (t) {
        fills = t.fills.slice();
        if (t.i !== lastI) { conds.push(t.cond); lastI = t.i; }
      }
      const rb = restButton();
      if (rb) restOffers++;
      if (rb && p.rest && p.rest({ cond: t ? t.cond : 100, i: t ? t.i : 0 })) {
        rb.click(); rests++;
      } else {
        go.click();
      }
      clicks++;
    }
    const after = tourState();
    if (after) fills = after.fills.slice();
    const gradeEl = $("tour-result").querySelector(".tour-grade");
    return {
      entered: true, before, onTour, clicks, rests, restOffers, conds, fills,
      grade: gradeEl ? gradeEl.textContent.trim()[0] : null,
      btn: go,
    };
  }

  return { dom, w, $, activeScreen, get, set, Career, setupPro, tourButton, restButton, tourState, runTour };
}

module.exports = { boot };
