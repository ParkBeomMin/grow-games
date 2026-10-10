/* ⚽ 더 윙어 II 1막 v4 — 📱 **선택지 카드 320 × 568 스크롤 없음** (47번 §2 「셋~넷 · 각 2줄 · 52px · 320 × 568 스크롤 없음」 · 31번 v4)
 *
 * jsdom은 배치를 안 해서 진짜 브라우저(headless Chromium · playwright-core)로 진짜 `index.html` + `scenes.js` + `style.css`를 띄웁니다.
 *   LY-1  진짜 1막(jsdom 장치)에서 나온 셋 · 넷 칸 카드(무작위 이벤트 · 이야기 장 · 약속)를 320 × 568에서 그림 —
 *         페이지 · 카드 판 모두 스크롤 0(scrollHeight ≤ clientHeight) · 선택지 버튼이 모두 화면 안 · 버튼 높이 ≥ 52px · 두 줄(줄 1 꼬리표 + 태도 · 줄 2 숫자)
 *   + 변이(스타일만 — 구현 파일은 안 건드림): 버튼 최소 높이 120px를 덧입히면 → LY-1이 빨간불(검사가 넘침을 잡는지)
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

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]);
      const f = path.join(BETA, u.endsWith("/") ? u + "index.html" : u);
      if (!f.startsWith(BETA) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
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
    return r;
  }, { card, extraCss });
}
(async () => {
  const list = await cards();
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/winger2/`;
  const exe = process.env.PW_CHROME || "/workspace/.pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on("pageerror", (e) => console.log(`   ⚠️ 페이지 오류 ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.W2Scenes && document.querySelector("#w2-entry"), null, { timeout: 15000 });
  const run = async (css) => { const rs = []; for (const c of list) rs.push(Object.assign({ id: c.id, k: c.choices.length }, await measure(page, c, css))); return rs; };
  const rs = await run(null);
  const bad = rs.filter((x) => x.pageScroll > 0 || x.panelScroll > 0 || x.layerScroll > 0 || x.panelBottom > 0.5 || x.out > 0 || x.minH < 52 || x.n < x.k || !x.twoLine);
  check(list.length >= 6 && bad.length === 0, `LY-1. 📱 320 × 568 — 카드 ${list.length}장(넷 ${rs.filter((x) => x.k === 4).length} · 셋 ${rs.filter((x) => x.k === 3).length} · 약속 · 이야기 장 포함) 스크롤 0 · 버튼 화면 밖 0 · 버튼 높이 최소 ${Math.min(...rs.map((x) => x.minH)).toFixed(0)}px(≥ 52)`
    + (bad.length ? `\n     🔴 ${bad.slice(0, 3).map((x) => `${x.id}(${x.k}칸 · 버튼 ${x.n}): 페이지 +${x.pageScroll}(밑 화면 ${x.base}) · 판 바닥 ${x.panelBottom.toFixed(0)} · 두 줄 ${x.twoLine} · 판 ${x.panelScroll} · 겹 ${x.layerScroll} · 밖 ${x.out} · 높이 ${x.minH.toFixed(0)}`).join(" · ")}` : ""));
  if (fail === 0) {
    const m = await run("#w2-layer .w2o-panel button { min-height: 120px !important; }");
    const mb = m.filter((x) => x.pageScroll > 0 || x.panelScroll > 0 || x.layerScroll > 0 || x.out > 0);
    check(mb.length > 0, `변이-TALL(버튼 120px를 덧입힘) → LY-1이 빨간불 (넘친 카드 ${mb.length}/${m.length})`);
  }
  await browser.close();
  srv.close();
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
