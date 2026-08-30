/* scripts/shoot.js — 화면별 스크린샷 도구예요.
 *
 *   node scripts/shoot.js                   # 시나리오 전부
 *   node scripts/shoot.js soccer-transfer   # 하나만 (여러 개 나열해도 돼요)
 *   node scripts/shoot.js --list            # 시나리오 목록만 보여줘요
 *   node scripts/shoot.js --width 320       # 이 폭만 (기본은 320·390 둘 다)
 *
 * 결과는 shots/<시나리오>-<폭>.png 로 떨어져요. shots/는 .gitignore에 있어요 —
 * 이미지는 저장소에 커밋하지 않아요.
 *
 * ── 왜 이게 필요한가요 ─────────────────────────────────────────────
 * 이 저장소는 jsdom으로 DOM은 촘촘히 보는데, **CSS가 사각지대**였어요.
 * "표에 칼럼이 있다"는 통과하면서 좁은 폰에서 그 칼럼이 화면 밖으로 밀려나는 걸
 * 아무도 못 잡았죠. 헤드리스 Chromium으로 실제로 그려 보고, 두 가지를 해요.
 *   ① 사람이 볼 스크린샷을 남긴다 (shots/*.png)
 *   ② 가로 넘침을 기계로 잡는다 (scrollWidth > clientWidth면 레이아웃 버그예요)
 *
 * ② 는 눈으로 보는 것보다 훨씬 잘 잡아요. 넘친 요소까지 찾아서 알려줘요.
 *
 * ── 도달 경로는 새로 짓지 않았어요 ────────────────────────────────
 * 세이브는 beta/_fixtures.js(= node scripts/make-fixtures.js의 산물)를 그대로 쓰고,
 * 각 화면까지 가는 클릭 순서는 tests/check-page-test.js가 쓰는 것과 같아요.
 * 손으로 지은 세이브는 실제 게임이 만들지 않는 조합이 섞여서, 화면은 멀쩡한데
 * 진짜 플레이에서는 다르게 보이는 상황을 만들어요.
 *
 * ── 새 화면을 추가하려면 ──────────────────────────────────────────
 * 아래 SCENARIOS에 한 줄 더하면 돼요. fixture로 세이브를 고르고, go()에
 * 그 화면까지 가는 클릭을 적으면 끝이에요. 세이브가 필요 없는 화면(타이틀 등)은
 * fixture를 비워 두면 돼요.
 *
 * ── 이 도구는 게임을 고치지 않아요 ────────────────────────────────
 * beta/ 와 루트의 게임 코드는 한 줄도 건드리지 않아요. 관찰만 해요.
 */
"use strict";

const fs = require("fs");
const path = require("path");

/* node_modules는 저장소 안에 두지 않아요 — /workspace/.tools 에 있어요.
 * playwright는 브라우저 경로를 launch 때 읽으니, require보다 먼저 심어 둬요. */
const TOOLS = process.env.GROW_TOOLS || "/workspace/.tools";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(TOOLS, "browsers");
}
const PW = path.join(TOOLS, "node_modules", "playwright-core");
if (!fs.existsSync(PW)) {
  console.error(`❌ playwright-core를 못 찾았어요: ${PW}\n   GROW_TOOLS 로 다른 경로를 줄 수 있어요.`);
  process.exit(1);
}
const { chromium } = require(PW);

const ROOT = path.resolve(__dirname, "..");
const BETA = path.join(ROOT, "beta");
const OUT = path.join(ROOT, "shots");

// 폰 기준이에요. 320은 지금도 팔리는 가장 좁은 화면(iPhone SE 1세대·갤럭시 폴드 접힘)이에요.
const WIDTHS = [320, 390];
const HEIGHT = 844;
const SCALE = 2;

// ---------- 시나리오 세이브 (beta/_fixtures.js) ----------
function loadFixtures() {
  const p = path.join(BETA, "_fixtures.js");
  if (!fs.existsSync(p)) {
    console.error("❌ beta/_fixtures.js가 없어요. node scripts/make-fixtures.js 로 먼저 뽑아 주세요.");
    process.exit(1);
  }
  /* eval("const x = …")은 쓰지 않아요 — 선언이 eval 자기 스코프에 갇혀요.
   * (tests/check-page-test.js와 같은 방식이에요.) */
  const src = fs.readFileSync(p, "utf8");
  const F = new Function(`const window = {}; ${src} return window.CHECK_FIXTURES;`)();
  const byId = {};
  for (const it of F.items || []) byId[it.id] = it;
  return { F, byId };
}

// ======================================================================
// 조작 도우미 — 전부 실제 클릭이에요 (tests/check-page-test.js와 같은 경로)
// ======================================================================
function makeP(page, game) {
  const P = {
    page, game,
    // 게임 코드가 쓰는 것과 같은 방식으로 눌러요. playwright의 click은 요소가
    // 화면에 보이고 멈춰 있어야 하는데, 미니게임처럼 움직이는 화면에서 흔들려요.
    click: (sel) => page.$eval(sel, (el) => el.click()),
    text: (sel) => page.$eval(sel, (el) => el.textContent.trim()).catch(() => ""),
    active: () => page.evaluate(() => (document.querySelector(".screen.active") || {}).id || "(없음)"),
    wait: (sel, ms) => page.waitForSelector(sel, { state: "attached", timeout: ms || 8000 }),
    // 문구로 버튼을 찾아 눌러요 (버튼 id가 없는 자리가 있어요)
    clickText: (sel, re) => page.evaluate(([s, r]) => {
      const b = [...document.querySelectorAll(s)].find((x) => new RegExp(r).test(x.textContent));
      if (!b) throw new Error(`문구 /${r}/ 에 맞는 ${s} 가 없어요`);
      b.click();
    }, [sel, re.source]),
    // 난수 고정 — "pass"면 무조건 통과, "fail"이면 무조건 탈락이에요 (아래 주석 참고)
    rng: (mode) => page.evaluate((m) => { window.__rngMode = m; }, mode),
    sleep: (ms) => page.waitForTimeout(ms),
  };
  return P;
}

/* 타이틀의 '이어하기' → 슬롯 카드. 사용자가 폰에서 하는 동작 그대로예요. */
async function resume(P) {
  await P.wait("#btn-continue:not(.hidden)");
  await P.click("#btn-continue");
  await P.wait(".slot-modal .slot-go");
  await P.click(".slot-modal .slot-go");
  await P.wait(".screen.active");
}

/* 유스 프로 도전(트라이아웃)을 한 라운드씩 굴려요.
 *
 * plan은 라운드별 판정이에요 — ["pass", "fail"]이면 1라운드 통과 · 2라운드 탈락.
 * 통과 판정은 `Math.random() < p`이고 p는 [0.12, 0.93]으로 clamp돼요. 그래서
 * 난수를 0.11 아래로 누르면 무조건 통과, 0.94 위로 올리면 무조건 탈락이에요.
 * (scripts/make-fixtures.js가 엔딩을 만들 때 쓰는 것과 같은 방법이에요.)
 *
 * 버튼은 하나(#btn-stage-next)를 문구만 바꿔 재사용해요.
 *   "트라이아웃 시작" / "○○ 도전!"  → 라운드 시작
 *   "⏩ 빨리감기"                    → 중계를 끝까지 넘겨요 (여기서 판정이 나요)
 *   "결과 받아들이기" / "최종 결과"   → 엔딩 화면으로
 * 판정(Math.random)은 '빨리감기' 클릭 안에서 일어나니, 라운드 시작 전에 심은 모드가
 * 그 클릭까지 살아 있어야 해요.
 */
async function runTryout(P, plan) {
  let round = 0;
  for (let guard = 0; guard < 24; guard += 1) {
    const label = await P.text("#btn-stage-next");
    if (/결과/.test(label)) break;
    if (/빨리감기/.test(label)) { await P.click("#btn-stage-next"); continue; }
    await P.rng(plan[Math.min(round, plan.length - 1)]);
    round += 1;
    await P.click("#btn-stage-next");
  }
  await P.rng("normal");
  await P.click("#btn-stage-next");
  await P.wait("#screen-ending.active #ending-card");
}

/* 투어 도시 한 곳을 시작해서, 원하는 미니게임이 화면에 뜬 순간에 멈춰요.
 * 세 무대는 🎬 웨이브 → ✨ 싱크 → 🔥 함성 순서로 이어지고, 손을 안 대도
 * 각각 3.6~4초에 스스로 끝나요(tour-stage.js). 그래서 기다리면 순서대로 와요. */
async function tourMini(P, sel) {
  await resume(P);
  await P.clickText("#career-actions .btn", /월드투어/);
  await P.wait("#screen-tour.active #btn-tour-go");
  await P.click("#btn-tour-go");
  // 첫 도시는 컨디션이 넉넉해서 공연 취소(cond < 18)가 안 나요 — 기다리면 반드시 떠요
  await P.wait(`#tour-moment .tm-box ${sel}`, 20000);
  await P.sleep(250);   // 막 붙은 박스의 첫 프레임이 그려질 틈을 줘요
}

// ======================================================================
// 시나리오 — 새 화면은 여기에 한 줄 더하면 돼요
// ======================================================================
/*  id       … 파일명이자 명령줄 인자예요
 *  fixture  … beta/_fixtures.js의 시나리오 id (세이브 출처). 비우면 세이브를 안 심어요
 *  game     … fixture가 있으면 자동으로 정해져요. 없을 때만 적어요
 *  autoMini … 승부처 미니게임 자동 진행(grow-auto-mini). 미니게임 화면을 찍을 땐 false
 *  clip     … 이 요소만 찍어요. 비우면 fullPage (화면 전체 세로로)
 *  go       … 그 화면까지 가는 클릭
 */
const SCENARIOS = [
  // ---------- ⚽ 더 윙어 ----------
  {
    id: "soccer-transfer", emoji: "💼", fixture: "soccer-transfer",
    title: "이적 화면 — 상위 리그 제안",
    go: async (P) => {
      await resume(P);
      await P.click("#btn-transfer");
      await P.wait("#screen-transfer.active #transfer-list .tf-card");
    },
  },
  {
    id: "soccer-promote", emoji: "🪜", fixture: "soccer-promote",
    title: "하부 리그 승격 제안",
    go: async (P) => {
      await resume(P);
      await P.click("#btn-transfer");
      await P.wait("#screen-transfer.active #transfer-list .tf-card");
    },
  },
  {
    id: "soccer-report", emoji: "📊", fixture: "soccer-report",
    title: "연말 결산 — 소속 칼럼",
    go: async (P) => {
      await resume(P);
      await P.wait("#screen-career.active #career-card table tbody tr");
    },
  },
  {
    /* 엔딩은 판정 결과라 세이브만으로 재현이 안 돼요 — 도전 직전 상태를 심고
     * 난수를 눌러 원하는 엔딩으로 몰아요. 🌱은 "1라운드 통과 → 2라운드 탈락"이에요
     * (lastRound >= 1 · score < 420 이면 유스 재계약). */
    id: "soccer-youth-ext", emoji: "🌱", fixture: "soccer-youth-ext",
    title: "유스 재계약 엔딩",
    go: async (P) => {
      await resume(P);
      await P.wait("#screen-main.active #action-list .go-game");
      await P.click("#action-list .go-game");
      await runTryout(P, ["pass", "fail"]);
    },
  },
  {
    /* 📹는 "첫 라운드에서 떨어지는데 score(명성 + 종합×2)는 330을 넘는" 자리예요.
     * 이 세이브가 명성 274 · 종합 36(=346)이라, 1라운드를 떨어뜨리면 바로 나와요. */
    id: "soccer-semipro", emoji: "📹", fixture: "soccer-semipro",
    title: "세미프로 입단 엔딩",
    go: async (P) => {
      await resume(P);
      await P.wait("#screen-main.active #action-list .go-game");
      await P.click("#action-list .go-game");
      await runTryout(P, ["fail"]);
    },
  },

  // ---------- 🎤 더 트레이니 ----------
  {
    id: "idol-concept", emoji: "💿", fixture: "idol-concept",
    title: "컴백 컨셉 선택",
    go: async (P) => {
      await resume(P);
      await P.wait("#screen-pro.active #pro-actions .go-game");
      await P.click("#pro-actions .go-game");
      await P.wait("#screen-concept.active #concept-list .concept-card");
    },
  },
  {
    id: "idol-reveal", emoji: "🔥", fixture: "idol-reveal",
    title: "유행 공개 (🔥 적중 +18%)",
    go: async (P) => {
      await resume(P);
      await P.wait("#screen-pro.active #pro-actions .go-game");
      await P.click("#pro-actions .go-game");
      await P.wait("#screen-concept.active #concept-list .concept-card");
      // 유행 컨셉을 골라야 🔥 적중 화면이 떠요. 무엇이 유행인지는 세이브가 알아요.
      await P.page.evaluate(() => {
        const hot = (window.IdolCareer._t.state().activity || {}).hot;
        const card = document.querySelector(`#concept-list .concept-card[data-cid="${hot}"]`);
        if (!card) throw new Error(`유행 컨셉(${hot}) 카드가 없어요`);
        card.click();
      });
      await P.wait("#screen-reveal.active #reveal-effect");
    },
  },
  {
    id: "idol-report", emoji: "📊", fixture: "idol-report",
    title: "연말 결산 — 5칸 표",
    go: async (P) => {
      await resume(P);
      await P.wait("#screen-career.active #career-card .season-table tbody tr");
    },
  },
  {
    id: "idol-tour", emoji: "🌏", fixture: "idol-tour",
    title: "월드투어 (첫 도시 대기)",
    go: async (P) => {
      await resume(P);
      await P.clickText("#career-actions .btn", /월드투어/);
      await P.wait("#screen-tour.active #btn-tour-go");
    },
  },
  {
    id: "idol-standings", emoji: "🏆", fixture: "idol-standings",
    title: "그룹 순위표 (펼친 상태)",
    go: async (P) => {
      await resume(P);
      await P.wait("#screen-pro.active #pro-standings-body tr");
      // 접이식(<details>)이라 펴 줘야 표가 보여요
      await P.page.$eval("#pro-standings", (el) => { el.open = true; });
      await P.sleep(150);
    },
  },

  // ---------- 🎪 투어 전용 미니게임 3종 ----------
  /* 진행 중 화면이에요. autoMini를 꺼서 미니게임이 실제로 뜨게 하고,
   * 그 요소가 나타난 순간에 찍어요. 셋은 한 도시 안에서 순서대로 이어져요. */
  {
    id: "tour-mini-wave", emoji: "🎬", fixture: "idol-tour", autoMini: false,
    title: "투어 미니게임 — 함성 웨이브",
    go: (P) => tourMini(P, ".ts-wave"),
  },
  {
    id: "tour-mini-sync", emoji: "✨", fixture: "idol-tour", autoMini: false,
    title: "투어 미니게임 — 싱크로",
    go: (P) => tourMini(P, ".ts-sync"),
  },
  {
    id: "tour-mini-roar", emoji: "🔥", fixture: "idol-tour", autoMini: false,
    title: "투어 미니게임 — 함성 유지",
    go: (P) => tourMini(P, ".ts-roar"),
  },
];

// ======================================================================
// 페이지 준비 — 세이브 심기 · 난수 고정
// ======================================================================
/* 세이브를 심는 자리가 중요해요.
 * env.js는 /beta/ 경로에서 localStorage를 'beta::'로 감싸요. _fixtures.js의 키는
 * 접두사가 없는 형태(https://x.test/soccer/ 에서 뽑았어요)라, 여기서는 접두사를
 * 직접 붙여 심어요. addInitScript는 페이지 스크립트보다 먼저 도니, game.js가
 * 로드하며 슬롯을 읽을 때 이미 심겨 있어요.
 *
 * 난수는 여기서 한 번 감싸 두고, 필요할 때 window.__rngMode만 바꿔요.
 * "pass"는 0.11 아래로 눌러 무조건 통과, "fail"은 0.94 위로 올려 무조건 탈락이에요
 * (판정 확률 p가 [0.12, 0.93]으로 clamp되니까요). */
function seedScript() {
  return ([data, auto]) => {
    try {
      for (const k in data) localStorage.setItem("beta::" + k, data[k]);
      localStorage.setItem("beta::grow-auto-mini", auto ? "1" : "0");
      localStorage.setItem("beta::grow-ad-cd", String(Date.now() + 864e5));  // 광고 모달을 안 띄워요
    } catch (e) { /* 세이브를 못 심으면 아래 도달 단계가 실패로 알려 줘요 */ }
    window.__rngMode = "normal";
    const base = Math.random;
    Math.random = () => {
      const r = base();
      if (window.__rngMode === "pass") return r * 0.11;
      if (window.__rngMode === "fail") return 0.94 + r * 0.05;
      return r;
    };
  };
}

/* 폰트는 실제로 받아 와요 — 글자 폭이 달라지면 '가로 넘침' 판정이 통째로 거짓말이 돼요.
 * 그 밖의 바깥 요청(광고·집계)은 막아요. 화면에 안 보이는데 시간만 먹고,
 * 광고 자리가 들쭉날쭉해서 스크린샷이 매번 달라져요. */
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
async function guardRoutes(context) {
  await context.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith("file:") || u.startsWith("data:") || u.startsWith("blob:")) return route.continue();
    if (FONT_HOSTS.some((h) => u.includes(h))) return route.continue();
    return route.abort();
  });
}

// ======================================================================
// 가로 넘침 검사 — 이게 이 도구의 절반이에요
// ======================================================================
/* 두 가지를 봐요.
 *
 * ① 문서 가로 스크롤 — document.documentElement.scrollWidth > clientWidth.
 *    폰 화면에서 가로 스크롤은 거의 언제나 버그예요.
 *
 * ② 칸 안에서 잘린 내용 — 어떤 요소의 scrollWidth > clientWidth.
 *    ①만으로는 부족해요. base.css의 .screen이 overflow:hidden이라(172줄) 안에서
 *    넘친 것이 문서 스크롤로 드러나지 않고 **그냥 잘려요**. 잘린 건 스크롤보다 나빠요 —
 *    사용자가 볼 방법이 아예 없으니까요. 그래서 요소별로도 재요.
 *    overflow-x가 auto·scroll인 곳은 뺐어요 — 거긴 스크롤이 설계예요. */
async function overflowReport(page, width) {
  return page.evaluate((w) => {
    const de = document.documentElement;
    const docOver = de.scrollWidth - de.clientWidth;
    const clipped = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.id === "beta-badge") continue;                     // 베타 배지는 fixed 장식이에요
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (cs.position === "fixed") continue;
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue;   // 스크롤이 설계인 칸
      const cw = el.clientWidth;
      const over = el.scrollWidth - cw;
      if (cw <= 0 || over <= 1) continue;
      clipped.push({
        over, ratio: +(el.scrollWidth / cw).toFixed(2),
        scrollWidth: el.scrollWidth, clientWidth: cw,
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        cls: (el.className || "").toString().trim().slice(0, 50),
        text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34),
      });
    }
    /* 비율이 큰 것부터 봐요. 부모도 같이 걸리는데(자식이 넘치면 부모도 넘쳐요),
     * 원인은 대개 '자기 폭의 두 배가 들어 있는' 가장 안쪽 칸이에요. */
    clipped.sort((a, b) => b.ratio - a.ratio || b.over - a.over);

    /* ③ 표 칸이 세로로 쪼개진 곳 — 이 저장소가 여러 번 겪은 증상이에요
     * ("도/움", "수/비", "1년/차"). 잘리지도 넘치지도 않으니 ①②로는 안 잡혀요.
     * 짧은 글자가 두 줄로 접히면 폭이 모자란 거예요. 블록 자식이 있는 칸은
     * 원래 여러 줄이라 빼요 (예: 소속 아래 리그 태그). */
    const wrapped = [];
    const range = document.createRange();
    for (const cell of document.querySelectorAll("table th, table td")) {
      if ([...cell.querySelectorAll("*")].some((c) => getComputedStyle(c).display === "block")) continue;
      const txt = (cell.textContent || "").trim().replace(/\s+/g, " ");
      if (!txt || txt.length > 10) continue;
      /* 칸 높이로 재면 안 돼요 — 한 행의 칸들은 가장 높은 칸에 맞춰 늘어나서,
       * 한 줄인 칸도 두 줄로 보여요. 글자가 실제로 놓인 줄 상자를 세요. */
      range.selectNodeContents(cell);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      if (tops.size >= 2) wrapped.push({ lines: tops.size, text: txt.slice(0, 20), clientWidth: cell.clientWidth });
    }
    return {
      width: w, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
      docOver, clipped: clipped.slice(0, 8), clippedN: clipped.length,
      wrapped: wrapped.slice(0, 8), wrappedN: wrapped.length,
    };
  }, width);
}

// ======================================================================
// 한 장 찍기
// ======================================================================
async function shoot(browser, sc, fx, width) {
  const game = sc.game || (fx && fx.game);
  if (!game) throw new Error("게임(soccer/idol)을 못 정했어요");
  const context = await browser.newContext({
    viewport: { width, height: HEIGHT },
    deviceScaleFactor: SCALE,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    reducedMotion: "no-preference",
  });
  await guardRoutes(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    const m = String(e.message || e);
    // file:// 에서는 서비스워커를 못 등록해요. 게임 문제가 아니라 여는 방식 때문이에요.
    if (/ServiceWorker/i.test(m)) return;
    errors.push(m.slice(0, 120));
  });
  await page.addInitScript(seedScript(), [
    (fx && fx.keys) || {},
    sc.autoMini !== false,
  ]);

  const file = path.join(OUT, `${sc.id}-${width}.png`);
  try {
    await page.goto(`file://${path.join(BETA, game, "index.html")}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(300);                          // 폰트가 붙을 틈
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    const P = makeP(page, game);
    await sc.go(P);
    await page.waitForTimeout(200);
    const active = await P.active();
    const ov = await overflowReport(page, width);
    /* 🧪 BETA 배지는 화면 왼쪽 아래에 fixed로 떠 있어요. fullPage로 찍으면 그 자리에
     * 그대로 박혀서 카드 글자를 가려요. 넘침 검사를 끝낸 뒤에 가려요 — 검사에서는
     * 이미 position:fixed 라서 제외돼 있고, 게임 코드는 손대지 않아요. */
    await page.addStyleTag({ content: "#beta-badge{display:none!important}" }).catch(() => {});
    await page.screenshot({ path: file, fullPage: !sc.clip, animations: "disabled" })
      .catch(() => page.screenshot({ path: file, fullPage: !sc.clip }));
    return { ok: true, file, active, ov, errors };
  } catch (e) {
    // 실패도 남겨요 — 어디서 멈췄는지 보이는 게 아무것도 없는 것보다 나아요
    let active = "(모름)";
    try { active = await makeP(page, game).active(); } catch { /* 페이지가 죽었어요 */ }
    const bad = path.join(OUT, `_fail-${sc.id}-${width}.png`);
    try { await page.screenshot({ path: bad, fullPage: true }); } catch { /* 못 찍으면 넘어가요 */ }
    return { ok: false, file: bad, active, reason: String(e.message || e).split("\n")[0].slice(0, 160), errors };
  } finally {
    await context.close();
  }
}

// ======================================================================
// 실행
// ======================================================================
async function main() {
  const args = process.argv.slice(2);
  let widths = WIDTHS;
  const ids = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--list") {
      for (const s of SCENARIOS) console.log(`${s.emoji || "🔍"} ${s.id.padEnd(18)} ${s.title}`);
      return 0;
    } else if (a === "--width") {
      widths = String(args[++i] || "").split(",").map(Number).filter(Boolean);
    } else if (a.startsWith("--")) {
      console.error(`모르는 옵션이에요: ${a}`);
      return 1;
    } else ids.push(a);
  }

  const { byId } = loadFixtures();
  const picked = ids.length ? SCENARIOS.filter((s) => ids.includes(s.id)) : SCENARIOS;
  if (ids.length) {
    const miss = ids.filter((id) => !SCENARIOS.some((s) => s.id === id));
    if (miss.length) {
      console.error(`❌ 그런 시나리오가 없어요: ${miss.join(", ")}\n   node scripts/shoot.js --list 로 목록을 보세요.`);
      return 1;
    }
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const results = [];
  console.log(`📷 시나리오 ${picked.length}개 × 폭 ${widths.join("·")} = ${picked.length * widths.length}장\n`);

  for (const sc of picked) {
    const fx = sc.fixture ? byId[sc.fixture] : null;
    if (sc.fixture && !fx) {
      for (const w of widths) {
        results.push({ id: sc.id, width: w, ok: false, reason: `_fixtures.js에 ${sc.fixture} 세이브가 없어요` });
      }
      console.log(`❌ ${sc.id} — _fixtures.js에 ${sc.fixture} 세이브가 없어요`);
      continue;
    }
    for (const w of widths) {
      const t0 = Date.now();
      const r = await shoot(browser, sc, fx, w);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      results.push({ id: sc.id, title: sc.title, width: w, ...r });
      if (r.ok) {
        const flags = [];
        if (r.ov.docOver > 0) flags.push(`🚨 문서 가로 스크롤 +${r.ov.docOver}px`);
        if (r.ov.clippedN) flags.push(`🚨 잘린 칸 ${r.ov.clippedN}개`);
        if (r.ov.wrappedN) flags.push(`⚠️ 세로로 쪼개진 칸 ${r.ov.wrappedN}개`);
        console.log(`✅ ${sc.id} ${w}px — ${r.active} · ${secs}s${flags.length ? " · " + flags.join(" · ") : ""}`);
        for (const o of r.ov.clipped) {
          const sel = `${o.tag}${o.id ? "#" + o.id : ""}${o.cls ? "." + o.cls.split(/\s+/).join(".") : ""}`;
          console.log(`      ↳ ${sel} ${o.clientWidth}px 칸에 ${o.scrollWidth}px (×${o.ratio})  "${o.text}"`);
        }
      } else {
        console.log(`❌ ${sc.id} ${w}px — ${r.reason} (멈춘 화면: ${r.active})`);
      }
      if (r.errors && r.errors.length) console.log(`      ⚠️ 페이지 예외: ${[...new Set(r.errors)].join(" / ")}`);
    }
  }
  await browser.close();

  // ---------- 요약 ----------
  const okN = results.filter((r) => r.ok).length;
  const docOvers = results.filter((r) => r.ok && r.ov.docOver > 0);
  const clips = results.filter((r) => r.ok && r.ov.clippedN > 0);
  const fails = results.filter((r) => !r.ok);
  console.log(`\n${"─".repeat(58)}`);
  console.log(`📷 찍힘 ${okN}/${results.length}장 → ${path.relative(ROOT, OUT)}/`);
  if (fails.length) {
    console.log(`\n❌ 도달 못 한 것 ${fails.length}건`);
    for (const f of fails) console.log(`   · ${f.id} ${f.width}px — ${f.reason}`);
  }
  console.log(`\n📐 ① 문서 가로 스크롤 (documentElement.scrollWidth > clientWidth)`);
  if (!docOvers.length) console.log("   ✅ 없어요");
  else for (const o of docOvers) console.log(`   🚨 ${o.id} ${o.width}px — ${o.ov.scrollWidth}px (+${o.ov.docOver}px)`);

  console.log(`\n📐 ② 칸 안에서 잘린 내용 (요소 scrollWidth > clientWidth)`);
  if (!clips.length) console.log("   ✅ 없어요");
  else for (const o of clips) {
    const worst = o.ov.clipped[0];
    console.log(`   🚨 ${o.id} ${o.width}px — ${o.ov.clippedN}개, 가장 심한 곳: ` +
      `${worst.tag}${worst.cls ? "." + worst.cls.split(/\s+/)[0] : ""} ${worst.clientWidth}→${worst.scrollWidth}px "${worst.text}"`);
  }

  const wraps = results.filter((r) => r.ok && r.ov.wrappedN > 0);
  console.log(`\n📐 ③ 표 칸이 세로로 쪼개진 곳 (짧은 글자가 두 줄로 접힘)`);
  if (!wraps.length) console.log("   ✅ 없어요");
  else for (const o of wraps) {
    console.log(`   ⚠️ ${o.id} ${o.width}px — ${o.ov.wrappedN}칸: ` +
      o.ov.wrapped.slice(0, 4).map((x) => `"${x.text}"(${x.clientWidth}px)`).join(" "));
  }

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));
  return fails.length ? 1 : 0;
}

main().then((code) => process.exit(code)).catch((e) => { console.error(e); process.exit(1); });
