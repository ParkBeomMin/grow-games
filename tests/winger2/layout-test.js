/* ⚽ 더 윙어 II 1막 v4 — 📱 **선택지 카드 320 × 568 스크롤 없음** (47번 §2 「셋~넷 · 각 2줄 · 52px · 320 × 568 스크롤 없음」 · 31번 v4)
 *
 * jsdom은 배치를 안 해서 진짜 브라우저(headless Chromium · playwright-core)로 진짜 `index.html` + `scenes.js` + `style.css`를 띄웁니다.
 *   LY-1  진짜 1막(jsdom 장치)에서 나온 셋 · 넷 칸 카드(무작위 이벤트 · 이야기 장 · 약속)를 320 × 568에서 그림 —
 *         페이지 · 카드 판 모두 스크롤 0(scrollHeight ≤ clientHeight) · 선택지 버튼이 모두 화면 안 · 버튼 높이 ≥ 52px · 두 줄(줄 1 꼬리표 + 태도 · 줄 2 숫자)
 *   LY-2  📋 평가서 자리별 표(`.w2o-byat` · v5 J19) — 자리가 섞인 진짜 평가서를 320 폭에서 펼쳤을 때 칸(th · td)이 낱자로 끊기지 않음
 *         (칸 높이 ≤ 한 줄의 1.6배) · 표가 판 폭 안(가로 넘침 0) · 행이 byAt 줄 수만큼
 *   + 변이(스타일만 — 구현 파일은 안 건드림): 버튼 최소 높이 120px를 덧입히면 → LY-1이 빨간불(검사가 넘침을 잡는지) ·
 *     표 칸을 줄바꿈 허용 + 좁은 고정 폭으로 → LY-2가 빨간불
 * 🔧 필요한 것: playwright-core + Chromium(`PW_CORE` · `PW_CHROME` — 기본 /workspace/.tools · /workspace/.pw-browsers 의 headless shell). 없으면 💥(2)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 2분
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { BETA } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "/workspace/.pw-browsers";
let chromium;
try { ({ chromium } = require(process.env.PW_CORE || "/workspace/.tools/node_modules/playwright-core")); }
catch (e) { console.log(`💥 playwright-core가 없어요 — ${e.message}`); process.exit(2); }

/* 🗂️ `LY_BETA` — 다른 판(예: HEAD를 `git archive`로 푼 사본)의 화면으로 같은 카드를 잴 때(빨강이 HEAD에서도 빨강인지 가르기) */
const SERVE = process.env.LY_BETA || BETA;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]);
      const f = path.join(SERVE, u.endsWith("/") ? u + "index.html" : u);
      if (!f.startsWith(SERVE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(r);
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}
/* 카드 모으기 — 칸 3 · 4 · 약속 · 이야기 장에서 몇 장씩 */
async function cards() {
  const out = [];
  for (const [seed, order] of [[903, ["cert", "talk"]], [904, ["talk", "cert"]], [906, ["promise", "cert"]]]) {
    const env = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], auto: true, realScene: false, policy: { card: (c) => {
      if (!c.opts || !c.opts.length) return 0;
      for (const k of order) { const i = c.opts.findIndex((x) => x.k === k); if (i >= 0) return i; }
      return 0;
    } } });
    await runAct(env);
    out.push(...env.seen.card.filter((c) => Array.isArray(c.choices) && c.choices.length >= 3));
    env.w.close();
  }
  const pick = [];
  const add = (f, n) => { for (const c of out.filter(f).slice(0, n)) if (pick.indexOf(c) < 0) pick.push(c); };
  add((c) => c.choices.length === 4, 4);
  add((c) => c.choices.length === 3, 3);
  add((c) => c.choices.some((x) => x.k === "promise"), 2);
  add((c) => c.kind === "story", 2);
  return pick;
}
async function measure(page, card, extraCss) {
  return page.evaluate(async ({ card, extraCss }) => {
    if (extraCss) { const st = document.createElement("style"); st.textContent = extraCss; document.head.appendChild(st); }
    /* 🔄 v5(31번 v5 · director 보고): 입구 화면의 광고(`ins.adsbygoogle` · `iframe` — 약 60px)가 측정 중에 들어와 페이지 높이를 늘려요.
     *    카드와 무관한 높이라 **광고만 재고 빼서** 셈 — 카드 판 · 겹 · 버튼 · 「카드가 더한 페이지 높이」는 그대로 봄(뜻: 카드 스크롤 0) */
    /* 🧪 입구 광고가 늘 오지는 않아요(바깥 요청을 막음) — 60px 광고 틀을 **늘 하나 끼워** 제외 길을 매번 지나게 함(director가 본 「페이지 +24」의 모양) */
    const fake = document.createElement("iframe");
    fake.className = "ly-fake-ad"; fake.style.cssText = "display:block;width:100%;height:60px;border:0";
    (document.getElementById("w2-entry") || document.body).appendChild(fake);
    const ads = [...document.querySelectorAll("ins.adsbygoogle, iframe")];
    const adH = Math.max(0, ...ads.map((e) => Math.round(e.getBoundingClientRect().height)));
    ads.forEach((e) => { e.dataset.lyHide = e.style.display; e.style.display = "none"; });
    const se0 = document.scrollingElement;
    const base = se0.scrollHeight - se0.clientHeight;             // 카드 밑 화면(입구) 자체의 넘침 — 카드가 더한 만큼만 셈
    const p = window.W2Scenes.card(card);
    await new Promise((r) => setTimeout(r, 400));
    const panel = document.querySelector("#w2-layer .w2o-panel");
    const btns = [...document.querySelectorAll("#w2-layer .w2o-panel button.w2o-ch")].filter((b) => b.offsetParent !== null);
    const vh = window.innerHeight, vw = window.innerWidth;
    const se = document.scrollingElement;
    const r = {
      pageScroll: se.scrollHeight - se.clientHeight - base, base,
      panelBottom: panel ? panel.getBoundingClientRect().bottom - vh : 99,
      twoLine: btns.every((b) => b.querySelector(".w2o-ch-l1") && b.querySelector(".w2o-ch-l2")),
      panelScroll: panel ? panel.scrollHeight - panel.clientHeight : -1,
      layerScroll: (() => { const l = document.getElementById("w2-layer"); return l ? l.scrollHeight - l.clientHeight : -1; })(),
      n: btns.length,
      out: btns.filter((b) => { const q = b.getBoundingClientRect(); return q.top < 0 || q.bottom > vh + 0.5 || q.left < 0 || q.right > vw + 0.5; }).length,
      minH: Math.min(...btns.map((b) => b.getBoundingClientRect().height)),
    };
    const first = btns[0];
    if (first) first.click();
    await Promise.race([p, new Promise((res) => setTimeout(res, 300))]);
    if (extraCss) document.head.lastChild.remove();
    ads.forEach((e) => { e.style.display = e.dataset.lyHide || ""; });
    fake.remove();
    r.adH = adH; r.ads = ads.length;
    return r;
  }, { card, extraCss });
}
/* 📋 자리가 섞인 평가서 하나 — 진짜 1막 판(스텁 장면 · byat-test와 같은 판) */
async function mixedSheet() {
  const env = boot({ seed: 4103, pos: "mf", operator: "normal", realScene: false });
  const r = await runAct(env);
  const sheet = JSON.parse(JSON.stringify(r.S.sheet));
  env.w.close();
  return sheet;
}
async function byatLayout(page, sheet, extraCss) {
  return page.evaluate(async ({ sheet, extraCss }) => {
    if (extraCss) { const st = document.createElement("style"); st.textContent = extraCss; document.head.appendChild(st); }
    const p = window.W2Scenes.sheet(Object.assign({ title: "📋 스카우트 평가서" }, sheet));
    await new Promise((r) => setTimeout(r, 1500));
    const det = document.querySelector("#w2-layer .w2o-byat");
    if (!det) return { none: true };
    det.open = true;
    await new Promise((r) => setTimeout(r, 100));
    const tb = det.querySelector("table");
    const cells = [...det.querySelectorAll("th, td")];
    const lh = (el) => { const v = parseFloat(getComputedStyle(el).lineHeight); return Number.isFinite(v) ? v : parseFloat(getComputedStyle(el).fontSize) * 1.3; };
    const broken = cells.filter((c) => c.getBoundingClientRect().height > lh(c) * 1.6 + 6).map((c) => c.textContent);
    const panel = det.closest(".w2o-panel") || det.parentElement;
    const r = { rows: det.querySelectorAll("tbody tr").length, broken, over: Math.round(tb.scrollWidth - det.clientWidth), panelOver: Math.round(panel.scrollWidth - panel.clientWidth), vw: window.innerWidth };
    const ok = document.querySelector("#w2-layer .w2o-ok"); if (ok) ok.click();
    await Promise.race([p, new Promise((res) => setTimeout(res, 300))]);
    return r;
  }, { sheet, extraCss });
}
(async () => {
  const list = await cards();
  const msheet = await mixedSheet();
  const mByAt = ((msheet.cols.find((c) => c.k === "record") || {}).detail || {}).byAt || [];
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/winger2/`;
  const exe = process.env.PW_CHROME || "/workspace/.pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on("pageerror", (e) => console.log(`   ⚠️ 페이지 오류 ${e.message}`));
  /* 🌐 바깥 요청(광고 · 분석)은 막음 — 판정에 무관하고 네트워크가 느리면 검사가 시간 초과로 죽어요(광고 높이는 아래에서 따로 빼고 셈) */
  await page.route("**/*", (rt) => (/^http:\/\/127\.0\.0\.1/.test(rt.request().url()) ? rt.continue() : rt.abort()));
  await page.goto(url);
  await page.waitForFunction(() => window.W2Scenes && document.querySelector("#w2-entry"), null, { timeout: 15000 });
  /* 카드마다 페이지를 새로 엶 — 앞 카드의 결과 창 · 남은 겹이 다음 측정에 섞이지 않게 */
  const fresh = async () => { await page.goto(url); await page.waitForFunction(() => window.W2Scenes && document.querySelector("#w2-entry"), null, { timeout: 15000 }); };
  const run = async (css) => { const rs = []; for (const c of list) { await fresh(); rs.push(Object.assign({ id: c.id, k: c.choices.length }, await measure(page, c, css))); } return rs; };
  const rs = await run(null);
  const adMax = Math.max(0, ...rs.map((x) => x.adH));
  console.log(`   🔎 측정에서 뺀 광고 요소 ${Math.max(...rs.map((x) => x.ads))}개(끼워 넣은 60px 틀 포함) · 높이 최대 ${adMax}px(카드 밖 — 입구 화면)`);
  check(rs.every((x) => x.adH >= 60), `LY-0. 🧪 광고 제외 길이 매번 지남 — 카드마다 60px 광고 틀을 끼우고 빼서 셈(${rs.filter((x) => x.adH >= 60).length}/${rs.length})`);
  console.log(`   🃏 ${rs.map((x) => `${x.id}(${x.k})`).join(" · ")}`);
  const bad = rs.filter((x) => x.pageScroll > 0 || x.panelScroll > 0 || x.layerScroll > 0 || x.panelBottom > 0.5 || x.out > 0 || x.minH < 52 || x.n < x.k || !x.twoLine);
  check(list.length >= 6 && bad.length === 0, `LY-1. 📱 320 × 568 — 카드 ${list.length}장(넷 ${rs.filter((x) => x.k === 4).length} · 셋 ${rs.filter((x) => x.k === 3).length} · 약속 · 이야기 장 포함) 스크롤 0 · 버튼 화면 밖 0 · 버튼 높이 최소 ${Math.min(...rs.map((x) => x.minH)).toFixed(0)}px(≥ 52)`
    + (bad.length ? `\n     🔴 ${bad.slice(0, 3).map((x) => `${x.id}(${x.k}칸 · 버튼 ${x.n}): 페이지 +${x.pageScroll}(밑 화면 ${x.base}) · 판 바닥 ${x.panelBottom.toFixed(0)} · 두 줄 ${x.twoLine} · 판 ${x.panelScroll} · 겹 ${x.layerScroll} · 밖 ${x.out} · 높이 ${x.minH.toFixed(0)}`).join(" · ")}` : ""));
  /* LY-2 */
  {
    await fresh();
    const b = await byatLayout(page, msheet, null);
    const ok = !b.none && b.rows === mByAt.length && mByAt.length > 1 && b.broken.length === 0 && b.over <= 0 && b.panelOver <= 0;
    check(ok, `LY-2. 📋 320 폭 평가서 자리별 표 — 행 ${b.rows}(byAt ${mByAt.length}) · 낱자로 끊긴 칸 ${b.none ? "?" : b.broken.length} · 표 가로 넘침 ${b.over}px · 판 가로 넘침 ${b.panelOver}px`
      + (b.none ? "\n     🔴 표가 안 그려짐" : b.broken.length ? `\n     🔴 끊긴 칸: ${b.broken.slice(0, 5).join(" · ")}` : ""));
  }
  if (fail === 0) {
    await fresh();
    const mb2 = await byatLayout(page, msheet, ".w2o-byat th, .w2o-byat td { white-space: normal !important; word-break: break-all !important; } .w2o-byat table { table-layout: fixed !important; width: 120px !important; }");
    check(!mb2.none && mb2.broken.length > 0, `변이-NARROW(표 칸 줄바꿈 허용 + 좁은 고정 폭) → LY-2가 빨간불 (끊긴 칸 ${mb2.broken ? mb2.broken.length : "?"})`);
    const m = await run("#w2-layer .w2o-panel button { min-height: 120px !important; }");
    const mb = m.filter((x) => x.pageScroll > 0 || x.panelScroll > 0 || x.layerScroll > 0 || x.out > 0);
    check(mb.length > 0, `변이-TALL(버튼 120px를 덧입힘) → LY-1이 빨간불 (넘친 카드 ${mb.length}/${m.length})`);
  }
  await browser.close();
  srv.close();
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
