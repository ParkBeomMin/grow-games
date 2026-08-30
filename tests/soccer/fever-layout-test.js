/* 🎉 피버 띠가 본문을 가리지 않는다 — 실제로 그려 보고 재요.
 *
 * 제보: "이벤트 열리니까 상단 띠 배너가 가리는 문제가 있네"
 *
 * ── 왜 jsdom으로는 못 잡나요 ──────────────────────────────────────
 * 띠는 position:fixed 라 자리를 차지하지 않고, 대신 본문을 그만큼 내려서 피해요.
 * 그 "그만큼"이 맞는지는 **높이를 재야만** 알 수 있는데, jsdom은 레이아웃을
 * 계산하지 않아서 모든 높이가 0이에요. 그래서 헤드리스 크로미움으로 그립니다.
 *
 * ── 이 검사가 지키는 관계 ────────────────────────────────────────
 * 띠 높이는 **운영자가 넣은 효과 개수와 화면 폭**에 따라 달라져요. 효과가 많으면
 * 문구가 두 줄로 접혀서 띠가 그만큼 두꺼워집니다. 그러니 본문을 내리는 양은
 * 상수로 적을 수 없고, 띠를 따라 움직여야 해요.
 *
 *   띠 아래 끝  ≤  본문이 시작하는 선          ← 안 가림
 *   본문 시작선 − 띠 아래 끝  ≥ MIN_GAP        ← 띠에 딱 붙지도 않음
 *
 * 값을 옮겨 적지 않아요. 양쪽 다 **그려진 화면에서 재서** 관계로만 봅니다 —
 * 그래서 글꼴이 바뀌든 효과가 늘든 따라가요.
 *
 * ⚠️ 여기서 재는 건 CSS 한 줄이 아니라 **관계**예요. 고친 뒤 style.css의
 *    `body.fever-on #app` 을 옛 상수(2.6rem)로 되돌리면 반드시 빨간불이 떠야 해요.
 *    (아래 ③ 변이 검증에서 그 되돌린 판을 실제로 그려서 확인합니다.)
 *
 * ── 처음에 이 검사가 거짓말을 했어요 (기록) ──────────────────────
 * ① env.js가 /beta/ 에서 localStorage를 'beta::'로 감싸요. 접두사 없이 심었더니
 *    fever.js가 확인용 통로를 못 보고 **네트워크로 빠져서 상용 이벤트를 읽었어요.**
 *    그래서 "효과 1개" 판이 실제로는 6개짜리 상용 행으로 돌아가고 있었습니다.
 * ② 그래서 네트워크를 아예 막아요(글꼴만 통과). 통로가 깨지면 배너가 안 떠서
 *    **조용히 통과하는 대신 요란하게 실패**해요. 심은 제목이 화면에 그대로
 *    나오는지도 매번 확인합니다 — 다른 데서 온 값으로 재면 안 되니까요.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const TOOLS = process.env.GROW_TOOLS || "/workspace/.tools";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(TOOLS, "browsers");
}
const PW = path.join(TOOLS, "node_modules", "playwright-core");
if (!fs.existsSync(PW)) {
  console.error(`⏭️  playwright-core가 없어서 건너뜁니다: ${PW}`);
  process.exit(2);                       // 실패가 아니라 "못 쟀음" — 초록불로 세지 않아요
}
const { chromium } = require(PW);

const ROOT = path.resolve(__dirname, "..", "..");
const WIDTHS = [320, 390];               // 320은 지금도 팔리는 가장 좁은 폰이에요
const MIN_GAP = 8;                       // 띠와 본문 사이 최소 숨통 (px)

/* 운영자가 실제로 넣을 수 있는 양 끝이에요.
 *   여섯 개 — 지금 열린 🌙 일요일 마무리 피버 (문구가 두 줄로 접혀요)
 *   한 개   — 가장 짧은 띠. **이것마저 모자랐던 게 이 버그의 핵심**이에요 */
const CASES = [
  ["효과 6개(문구 두 줄)", { a: 0.15, d: 0.15, g: 0.15, moment: 0.1, rate: 0.3, train: 0.8 }, 6],
  ["효과 1개(가장 짧은 띠)", { train: 0.8 }, 1],
];

const TITLE = "일요일 마무리 피버";
const row = (boost) => ({
  id: "soccer-fever", game: "soccer", emoji: "🌙", title: TITLE,
  note: "한 주를 닫는 밤이에요. 마지막 한 판, 조금 더 잘 풀리게 해뒀어요",
  starts_at: new Date(Date.now() - 3600e3).toISOString(),
  ends_at: new Date(Date.now() + 9 * 3600e3).toISOString(),
  boost,
});

/* 글꼴은 실제로 받아 와요 — 글자 폭이 달라지면 접힘이 달라지고, 이 검사는
 * 접힌 줄 수로 높이가 변하는 걸 재니까요. 그 밖의 바깥 요청은 전부 막아요.
 * (scripts/shoot.js의 guardRoutes와 같은 방침이에요.) */
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
const guardRoutes = (context) => context.route("**/*", (route) => {
  const u = route.request().url();
  if (/^(file|data|blob):/.test(u)) return route.continue();
  if (FONT_HOSTS.some((h) => u.includes(h))) return route.continue();
  return route.abort();          // ⚠️ 상용 Supabase로 새는 걸 여기서 끊어요
});

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

/* 한 판 그려서 재요. cssPatch가 있으면 그 CSS를 마지막에 덧대요 — 변이 검증용이에요. */
async function measure(browser, dir, width, boost, cssPatch) {
  const context = await browser.newContext({
    viewport: { width, height: 844 }, deviceScaleFactor: 2,
    locale: "ko-KR", timezoneId: "Asia/Seoul",
  });
  await guardRoutes(context);
  const page = await context.newPage();
  /* ⚠️ 접두사를 붙여요. env.js가 /beta/ 에서 localStorage를 'beta::'로 감싸서,
   * 접두사 없이 심으면 fever.js가 못 읽어요 (scripts/shoot.js도 같은 이유로 붙여요). */
  await page.addInitScript((r) => {
    // 🧪 확인용 통로 — 이게 있으면 fever.js가 네트워크 대신 이걸 봐요
    localStorage.setItem("beta::grow-fever-test", JSON.stringify(r));
  }, row(boost));
  await page.goto(`file://${path.join(ROOT, dir, "index.html")}`, { waitUntil: "load" });
  await page.waitForSelector(".fever-bar", { timeout: 8000 });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  if (cssPatch) await page.addStyleTag({ content: cssPatch });
  // 처음 마주친 순간의 알림은 닫아요 — 본 화면을 재야 하니까요
  const ok = await page.$("#btn-fever-ok");
  if (ok) await ok.click();
  await page.waitForTimeout(250);

  const m = await page.evaluate(() => {
    const bar = document.querySelector(".fever-bar");
    const app = document.getElementById("app");
    const barBottom = bar.getBoundingClientRect().bottom;
    // 본문이 실제로 시작하는 선 — #app의 패딩 안쪽 첫 픽셀이에요
    const r = app.getBoundingClientRect();
    const contentTop = r.top + parseFloat(getComputedStyle(app).paddingTop);
    // 타이틀 화면(클릭 없이 닿는 유일한 화면)에서 눈에 보이는 첫 요소
    const active = document.querySelector(".screen.active");
    const kid = active && [...active.children].find((c) => c.getBoundingClientRect().height > 0);
    // 우측 상단 알약이 띠에 깔리는지 — 같은 구석을 쓰는 고정 요소예요
    const pill = document.createElement("div");
    pill.className = "cloud-sync";
    pill.textContent = "☁️ 저장 중";
    document.body.appendChild(pill);
    const pr = pill.getBoundingClientRect();
    const pillHidden = pr.top < barBottom;
    pill.remove();
    return {
      barBottom: +barBottom.toFixed(1),
      contentTop: +contentTop.toFixed(1),
      kidTop: kid ? +kid.getBoundingClientRect().top.toFixed(1) : null,
      kidName: kid ? `${kid.tagName}.${(kid.className || "").split(" ")[0]}` : null,
      pillHidden,
      pillTop: +pr.top.toFixed(1),
      // 화면에 뜬 게 정말 우리가 심은 이벤트인지 (다른 데서 온 값으로 재면 안 돼요)
      shownTitle: (bar.querySelector(".fv-body b") || {}).textContent || "",
      effCount: (bar.querySelector(".fv-eff") || { textContent: "" }).textContent.split("·").filter(Boolean).length,
    };
  });
  await context.close();
  return m;
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    for (const dir of ["beta/soccer", "beta/winger2"]) {
      console.log(`\n=== ${dir} ===`);
      for (const [label, boost, want] of CASES) {
        for (const w of WIDTHS) {
          const m = await measure(browser, dir, w, boost);
          const gap = +(m.contentTop - m.barBottom).toFixed(1);
          const tag = `${label} · ${w}px`;
          /* 심은 게 그대로 떴나 — 이게 어긋나면 아래 숫자는 전부 남의 이벤트를 잰 거예요 */
          check(m.shownTitle === TITLE && m.effCount === want,
            `${tag} — 심은 이벤트가 그대로 떠요 (제목 "${m.shownTitle}" · 효과 ${m.effCount}개)`);
          check(gap >= 0, `${tag} — 본문을 안 가려요 (띠 아래 ${m.barBottom} ≤ 본문 ${m.contentTop})`);
          check(gap >= MIN_GAP, `${tag} — 띠와 본문 사이가 ${gap}px (${MIN_GAP}px 이상)`);
          if (m.kidTop != null) {
            check(m.kidTop >= m.barBottom,
              `${tag} — 첫 화면의 ${m.kidName}가 띠 아래에 있어요 (${m.kidTop} ≥ ${m.barBottom})`);
          }
          check(!m.pillHidden,
            `${tag} — ☁️ 동기화 알약이 띠에 안 깔려요 (알약 위 ${m.pillTop} ≥ 띠 아래 ${m.barBottom})`);
        }
      }
    }

    // ---------- ③ 변이 검증 ----------
    /* 고친 걸 되돌리면 정말 빨간불이 뜨나? 옛 상수를 덧대서 다시 그려요.
     * 여기서 통과해 버리면 위의 초록불은 아무것도 안 지키는 거예요. */
    console.log("\n=== ③ 변이 검증 (옛 상수 2.6rem으로 되돌린 판) ===");
    const OLD = "body.fever-on #app { padding-top: 2.6rem !important; }";
    let caught = 0;
    for (const [label, boost] of CASES) {
      for (const w of WIDTHS) {
        const m = await measure(browser, "beta/soccer", w, boost, OLD);
        if (m.shownTitle !== TITLE) { console.log(`   ⚠️ ${label}·${w}px — 심은 이벤트가 아니에요, 변이 검증이 무의미해요`); continue; }
        const gap = +(m.contentTop - m.barBottom).toFixed(1);
        if (gap < 0) caught++;
        console.log(`   ${label} · ${w}px → 여백 ${gap}px ${gap < 0 ? "❌ 가림(잡힘)" : "⚠️ 안 잡힘"}`);
      }
    }
    check(caught === CASES.length * WIDTHS.length,
      `옛 상수로 되돌리면 ${CASES.length * WIDTHS.length}가지 모두 빨간불 (잡힌 것 ${caught})`);
  } finally {
    await browser.close();
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
