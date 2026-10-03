/* ⚽ 더 윙어 II 1막 — 🏠 **허브 이어하기** (26번 §5 · 30번 「허브 색인」 · 25번 §8)
 *
 *   HB-1  🔴 이스케이프 — `beta/index.html` 이어하기 카드의 **이름 · 진행 글자**에 HTML(`<img src=x onerror=…>` · `<svg onload=…>` ·
 *         `<b onmouseover=…>`)을 넣어도 **글자 그대로** 보이고 끼어든 요소 0 · 스크립트가 안 돎(고치기 전엔 실제로 경고창이 떴음)
 *         · 평범한 이름은 「이름 · 더 윙어 II · 1막 N주」로 그대로
 *   HB-2  📇 색인 `winger2-save-v2-slots` = `{ main: { name, label, savedAt } }`
 *         ⓐ 한 판 내내(틱마다) 세이브와 맞음 — 이름 · 「1막 N주」/「졸업」 · 저장 시각
 *         ⓑ 못 읽는 세이브(깨진 글 · 옛 `v: 1`)면 입구가 색인을 **지움**(허브에 유령 카드가 안 남게)
 *         ⓒ 세이브 쓰기가 실패하면 색인을 **그대로 둠**(색인이 세이브를 앞서지 않게) · 다시 써지면 맞춰짐
 *         ⓓ 색인 쓰기만 실패하면 색인을 **지움**(틀린 카드보다 빈자리)
 *   + 변이(파일 안)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { ROOT, BETA, pageMutsOK, wait, mutsOKIn } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const SAVE_KEY = "winger2-save-v2", SLOTS = "winger2-save-v2-slots";

/* ══════════ HB-1 — 허브 페이지 ══════════ */
const HUB = fs.readFileSync(path.join(BETA, "index.html"), "utf8");
const MUT_H = { NOESC: [[/<b>\$\{esc\(c\.st\.name\)\}<\/b><span>\$\{c\.g\.title\} · \$\{esc\(progressLabel\(c\.st\)\)\}<\/span>/, "<b>${c.st.name}</b><span>${c.g.title} · ${progressLabel(c.st)}</span>"]] };
const MUT = {
  LABEL: { "game.js": [[/label: sv\.act1 \? "졸업" : `1막 \$\{sv\.week\}주`/, 'label: sv.act1 ? "졸업" : `1막 ${sv.week + 1}주`']] },
  KEEP_GHOST: { "game.js": [[/ {4}writeIndex\(sv\); {46}\/\/ 클라우드로/, "    if (sv) writeIndex(sv);                                              // 클라우드로"]] },
  AHEAD: { "game.js": [[/if \(ok\) writeIndex\(S\);/, "writeIndex(S);"]] },
  WRONG_IDX: { "game.js": [[/try \{ localStorage\.removeItem\(SLOTS_KEY\); \} catch \(e2\) \{ \/\* 다음 저장 때 맞춰요 \*\/ \}/, "/* 그대로 둠 */"]] },
};
{
  const bad = mutsOKIn(HUB, MUT_H, "beta/index.html").concat(pageMutsOK(MUT));
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
function hub(html, keys) {
  const { JSDOM } = require(path.join(ROOT, "tests/cloud/jsdom.js"));
  const page = html.replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => { const f = path.resolve(BETA, src.split("?")[0]); return fs.existsSync(f) ? `<script>\n${fs.readFileSync(f, "utf8")}\n</script>` : ""; })
    .replace("<head>", `<head><script>window.alert = (m) => { window.__alerts = (window.__alerts || []).concat([String(m)]); };${Object.entries(keys).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join("")}</script>`);
  const dom = new JSDOM(page, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/index.html" });
  const w = dom.window;
  const row = w.document.getElementById("continue-row");
  const out = { cards: row ? [...row.querySelectorAll(".continue-card")].map((a) => a.textContent.replace(/\s+/g, " ").trim()) : [],
    injected: row ? row.querySelectorAll("img, svg, [onerror], [onload], [onmouseover]").length : -1, alerts: w.__alerts || [], pwn: w.__pwn };
  w.close();
  return out;
}
const T = 1790000000000;
const XSS = {
  [SLOTS]: JSON.stringify({ main: { name: "<img src=x onerror=\"window.__pwn=1;alert(1)\">", label: "<b onmouseover=alert(2)>졸업</b>", savedAt: T + 5 } }),
  "trainee-save-v1-slots": JSON.stringify({ x: { name: "<svg onload=\"window.__pwn=3;alert(3)\">", year: "<img src=y onerror=alert(4)>", savedAt: T + 4 } }),
};
const NORMAL = { [SLOTS]: JSON.stringify({ main: { name: "강민서", label: "1막 11주", savedAt: T + 1 } }), "rookie-save-v1-slots": JSON.stringify({ a: { name: "김야구", year: 2, savedAt: T } }) };
{
  const n = hub(HUB, NORMAL);
  check(n.cards.length === 2 && n.cards[0].indexOf("강민서") >= 0 && n.cards[0].indexOf("더 윙어 II · 1막 11주") >= 0, `HB-1a. 🏠 평범한 이름 — 카드 「${n.cards[0] || "없음"}」(저장 시각 순 · 다른 게임 카드도 그대로)`);
  const x = hub(HUB, XSS);
  const lit = x.cards.some((c) => c.indexOf("<img src=x onerror=") >= 0) && x.cards.some((c) => c.indexOf("<svg onload=") >= 0) && x.cards.some((c) => c.indexOf("<b onmouseover=alert(2)>졸업</b>") >= 0);
  check(x.injected === 0 && lit && !x.alerts.length && x.pwn == null, `HB-1b. 🔴 HTML 이름 · 진행 글자 — 글자 그대로 ${lit ? "보임" : "🔴 안 보임"} · 끼어든 요소 ${x.injected} · 돈 스크립트 ${x.alerts.length + (x.pwn != null ? 1 : 0)}`);
  const m = hub(HUB.replace(MUT_H.NOESC[0][0], MUT_H.NOESC[0][1]), XSS);
  check(m.injected > 0, `변이-NOESC(이스케이프를 뺌) → HB-1b가 빨간불 (끼어든 요소 ${m.injected})`);
}

/* ══════════ HB-2 — 게임 쪽 색인 ══════════ */
const idxOf = (w) => JSON.parse(w.localStorage.getItem(SLOTS) || "null");
const saveOf = (w) => { try { return JSON.parse(w.localStorage.getItem(SAVE_KEY) || "null"); } catch (e) { return "깨짐"; } };
const want = (sv) => sv && { main: { name: sv.name, label: sv.act1 ? "졸업" : `1막 ${sv.week}주`, savedAt: sv.savedAt || 0 } };
async function a(muts) {
  const env = boot({ seed: 515, pos: "wg", auto: true, realScene: false, muts });
  let ticks = 0, bad = 0, first = null;
  const r = await runAct(env, { until: () => {
    const sv = saveOf(env.w);
    if (sv) { ticks += 1; if (JSON.stringify(idxOf(env.w)) !== JSON.stringify(want(sv))) { bad += 1; if (!first) first = `${sv.week}주: ${JSON.stringify(idxOf(env.w))}`; } }
    return false;
  } });
  const end = JSON.stringify(idxOf(env.w)) === JSON.stringify(want(saveOf(env.w))) && idxOf(env.w).main.label === "졸업";
  env.w.close();
  return { ticks, bad, first, end, done: r.done };
}
async function bc(muts) {
  /* ⓑ 못 읽는 세이브 */
  const ghost = JSON.stringify({ main: { name: "유령", label: "1막 9주", savedAt: 1 } });
  const res = [];
  for (const broken of ["{깨진 글", JSON.stringify({ v: 1, name: "옛 선수", week: 5 })]) {
    const env = boot({ seed: 1, pos: "wg", auto: true, realScene: false, muts, keys: { [SAVE_KEY]: broken, [SLOTS]: ghost } });
    for (let i = 0; i < 300 && !env.w.document.querySelector("#w2-entry .w2-new"); i++) await wait(5);
    res.push(env.w.localStorage.getItem(SLOTS));
    env.w.close();
  }
  /* ⓒ ⓓ 쓰기 실패 */
  const env = boot({ seed: 515, pos: "wg", auto: true, realScene: false, muts });
  await runAct(env, { until: (S) => S.week === 4 });
  const w = env.w, G = w.W2Game;
  const before = w.localStorage.getItem(SLOTS);
  /* 🔒 jsdom의 Storage는 제 몸에 속성을 달면 「항목」이 돼요 — 원형(prototype)의 setItem을 갈아 끼웁니다 */
  const proto = w.Storage.prototype, rawSet = proto.setItem;
  const flashes = [];
  const rawFlash = w.Fx && w.Fx.flash;
  if (w.Fx) w.Fx.flash = (t) => { flashes.push(String(t)); };
  let failKey = SAVE_KEY;
  proto.setItem = function (k, v) { if (k === failKey) throw new Error("QuotaExceededError"); return rawSet.call(this, k, v); };
  G._t.S.week += 0; G._t.S.cond = Math.max(0, G._t.S.cond - 1);   // 세이브 글이 바뀌게(저장 시각도 새로)
  G._t.save();
  const keptC = w.localStorage.getItem(SLOTS) === before && flashes.some((t) => /저장 공간/.test(t));
  failKey = null;
  G._t.save();
  const fixedC = JSON.stringify(idxOf(w)) === JSON.stringify(want(saveOf(w)));
  failKey = SLOTS;
  G._t.save();
  const droppedD = w.localStorage.getItem(SLOTS) == null && saveOf(w) && saveOf(w).week === G._t.S.week;
  failKey = null;
  proto.setItem = rawSet;
  if (w.Fx && rawFlash) w.Fx.flash = rawFlash;
  w.close();
  return { b: res, bOk: res.every((x) => x == null), keptC, fixedC, droppedD };
}

(async () => {
  const ra = await a(null);
  check(ra.done && ra.ticks > 30 && ra.bad === 0 && ra.end, `HB-2a. 📇 한 판 내내 색인 == 세이브 — 틱 ${ra.ticks}번 · 어긋남 ${ra.bad} · 졸업 뒤 「졸업」` + (ra.first ? `\n     🔴 ${ra.first}` : ""));
  const r = await bc(null);
  check(r.bOk, `HB-2b. 👻 못 읽는 세이브(깨진 글 · 옛 v1 모양)면 입구가 색인을 지움 — ${r.b.map((x) => (x == null ? "지움" : `🔴 남음 ${x}`)).join(" · ")}`);
  check(r.keptC && r.fixedC, `HB-2c. 💾 세이브 쓰기가 실패하면 색인 그대로(⚠️ 알림) ${r.keptC ? "✓" : "✗"} · 다시 써지면 맞춰짐 ${r.fixedC ? "✓" : "✗"}`);
  check(r.droppedD, `HB-2d. 🕳️ 색인 쓰기만 실패하면 색인을 지움(틀린 카드보다 빈자리) · 세이브는 써짐`);
  if (fail === 0) {
    const m1 = await a(MUT.LABEL);
    check(m1.bad > 0, `변이-LABEL(진행 글자가 한 주 앞섬) → HB-2a가 빨간불 (어긋남 ${m1.bad})`);
    const m2 = await bc(MUT.KEEP_GHOST);
    check(!m2.bOk, `변이-KEEP_GHOST(못 읽는 세이브면 색인을 그대로) → HB-2b가 빨간불`);
    const m3 = await bc(MUT.AHEAD);
    check(!m3.keptC, `변이-AHEAD(세이브가 실패해도 색인을 씀) → HB-2c가 빨간불`);
    const m4 = await bc(MUT.WRONG_IDX);
    check(!m4.droppedD, `변이-WRONG_IDX(색인 쓰기 실패 때 옛 색인을 남김) → HB-2d가 빨간불`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
