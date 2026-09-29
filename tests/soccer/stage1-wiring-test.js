/* 🔌 등록 교차 — 새 파일 여섯이 **빠짐없이 걸려 있는가** (스펙 §6-7 · 25번 §2 · grow-inspector 「경계면 교차 비교」)
 *
 * 조용히 실패하는 자리들이에요 — 빨간불 없이 「없는 것처럼」 굴어요.
 *   ① sw.js ASSETS ↔ 실제 파일 — 목록의 파일이 전부 있고, 페이지가 읽는 스크립트·스타일이 전부 목록에 있다 · CACHE를 올렸다
 *      (목록에 없으면 **오프라인에서만** 깨지고, 없는 파일이 목록에 있으면 addAll이 통째로 실패해 새 서비스워커가 안 깔려요)
 *   ② index.html `<script>` 순서 — career.js 바로 뒤에 events → story → book → achieve → film → scenes
 *      (film.js가 먼저 로드돼야 scenes.js가 WingerFilm에 drawCard·share를 붙여요 — 스펙 §6-5) · 새 자리(#screen-book · #screen-film ·
 *      #btn-book · #stage-promise)가 있다
 *   ③ beta/cloud.js keysOf — soccer에만 `-book` 한 줄 · 그림자 키는 안 올라감 · 다른 게임은 그대로
 *   ④ beta/_check.html 🎬 시나리오 여섯 — 버튼을 눌러 심은 세이브로 **게임을 실제로 띄워** 적힌 곳에 닿는다
 *      (check-page-test는 .ck-card·.mg-item만 세서 이 절을 안 봐요)
 *
 * 변이
 *   W1 ASSETS에서 scenes.js를 뺀다            → ① 빨간불
 *   W2 CACHE를 운영판 이름으로 되돌린다         → ① 빨간불
 *   W3 story.js · book.js 줄 순서를 바꾼다      → ② 빨간불
 *   W4 keysOf의 -book 줄을 지운다              → ③ 빨간불
 *   W5 🎬 시나리오가 betaAt 도장을 안 찍는다    → ④ 빨간불(onLoad가 떠 있는 이벤트를 치워 창이 안 떠요)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const fs = require("fs");
const path = require("path");
const H = require("./_w1.js");
H.guardExit();
const { JSDOM, VirtualConsole } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const ROOT = "/workspace/grow-games";
const DIR = path.join(ROOT, "beta/soccer");
const NEW6 = ["events.js", "story.js", "book.js", "achieve.js", "film.js", "scenes.js"];
const read = (p) => fs.readFileSync(p, "utf8");
const MUTS = {
  W1: { file: "sw.js", muts: [[/"\.\/scenes\.js",\s*/, ""]] },
  W2: { file: "sw.js", muts: [[/const CACHE = "soccer-v27";/, 'const CACHE = "soccer-v26";']] },
  W3: { file: "index.html", muts: [[/  <script src="story\.js"><\/script>\n  <script src="book\.js"><\/script>/, '  <script src="book.js"></script>\n  <script src="story.js"></script>']] },
  W4: { which: "beta", file: "../cloud.js", muts: [[/\n    if \(game === "soccer"\) out\.push\(s \+ "-book"\);[^\n]*/, ""]] },
  W5: { file: "../_check.html", muts: [[/x\.S\.savedAt = x\.S\.betaAt = Date\.now\(\);/, "x.S.savedAt = Date.now();"]] },
};

/* ---------- ① ---------- */
function swCheck(sw, html) {
  const A = (/const ASSETS = \[([\s\S]*?)\];/.exec(sw) || [])[1] || "";
  const assets = Array.from(A.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  const missingFile = assets.filter((a) => a !== "./" && !fs.existsSync(path.resolve(DIR, a)));
  const local = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g)).map((m) => m[1]).filter((s) => !/^https?:/.test(s))
    .concat(Array.from(html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)).map((m) => m[1]).filter((s) => !/^https?:/.test(s)));
  const norm = (s) => (s.startsWith("../") || s.startsWith("./") ? s : `./${s}`);
  const notListed = local.map(norm).filter((s) => !assets.includes(s));
  /* 운영판(soccer/)도 안 싣던 공용 파일(env·cloud·stats·fx·ads)은 **이번 작업 전부터** 빠져 있어요 — 새로 빠진 것만 셉니다 */
  const liveSw = read(path.join(ROOT, "soccer/sw.js")), liveHtml = read(path.join(ROOT, "soccer/index.html"));
  const liveAssets = Array.from(((/const ASSETS = \[([\s\S]*?)\];/.exec(liveSw) || [])[1] || "").matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  const liveLocal = Array.from(liveHtml.matchAll(/<script src="([^"]+)"><\/script>/g)).map((m) => m[1]).filter((x) => !/^https?:/.test(x)).map(norm);
  const oldGap = liveLocal.filter((x) => !liveAssets.includes(x));
  const cache = (/const CACHE = "([^"]+)"/.exec(sw) || [])[1];
  const liveCache = (/const CACHE = "([^"]+)"/.exec(read(path.join(ROOT, "soccer/sw.js"))) || [])[1];
  return { assets, missingFile, notListed: notListed.filter((x) => !oldGap.includes(x)), oldGap, cache, liveCache, new6: NEW6.every((f) => assets.includes(`./${f}`)) };
}
/* ---------- ② ---------- */
function orderCheck(html) {
  const srcs = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g)).map((m) => m[1]);
  const i = srcs.indexOf("career.js");
  return { after: srcs.slice(i + 1, i + 7), ok: i >= 0 && JSON.stringify(srcs.slice(i + 1, i + 7)) === JSON.stringify(NEW6) };
}

/* ---------- ④ 확인 페이지 ---------- */
function checkPage(muts) {
  let html = read(path.join(ROOT, "beta/_check.html"))
    .replace(/<link[^>]*>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(ROOT, "beta", src);
      return fs.existsSync(p) ? `<script>\n${read(p)}\n</script>` : "";
    });
  if (muts) html = H.applyMuts(html, muts, "_check.html");
  const vc = new VirtualConsole();
  const dom = new JSDOM(html.replace("<head>", `<head><script>window.fetch = () => Promise.reject(new Error("net off"));</script>`),
    { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/beta/_check.html", virtualConsole: vc });
  return dom.window;
}
const KEYS = ["winger-save-v1-slots", "winger-save-v1-book", "winger-book-shadow"];
async function reach(muts) {
  const cw = checkPage(muts);
  const items = Array.from(cw.document.querySelectorAll("#wsc-list .wsc-item"));
  const out = { n: items.length, res: [] };
  const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));
  for (const b of items) {
    const title = b.querySelector("b").textContent;
    if (b.disabled) { out.res.push({ title, ok: false, why: "버튼이 잠겨 있어요(기준 시나리오 없음)" }); continue; }
    for (const k of KEYS) cw.localStorage.removeItem(k);
    b.click();
    const keys = { "beta::grow-auto-mini": "1" };
    for (const k of KEYS) { const v = cw.localStorage.getItem(k); if (v != null) keys[`beta::${k}`] = v; }
    const P = H.boot({ which: "beta", seed: 11, keys, url: "https://x.test/beta/soccer/" });
    let ok = false, why = "";
    try {
      const cont = () => { H.tap(P, P.$("btn-continue")); const go = P.doc.querySelector(".slot-modal .slot-go"); if (go) H.tap(P, go); };
      const ov = () => P.doc.querySelector(".ev-overlay");
      if (/도전 · 확정/.test(title)) {
        cont();
        ok = !!ov() && /성공\s*62%/.test(ov().textContent);
        why = ov() ? ov().textContent.slice(0, 60) : `창 없음(${P.active()})`;
      } else if (/이야기 1장/.test(title)) {
        cont();
        ok = !!ov() && ov().textContent.includes("📖 🌍 낯선 땅 1/2") && ov().querySelectorAll(".ev-opt").length === 3;
        why = ov() ? ov().querySelector(".ev-kicker").textContent : "창 없음";
      } else if (/약속/.test(title)) {
        cont();
        const o = ov();
        if (o) {
          const pi = P.w.WingerEvents.pending().opts.findIndex((x) => x.k === "promise");
          H.tap(P, o.querySelector(`.ev-opt[data-i="${pi}"]`));
          const okb = o.querySelector(".ev-ok"); if (okb) H.tap(P, okb);
          const g = Array.from(P.$("pro-actions").children).find((x) => x.classList.contains("go-game"));
          if (g) H.tap(P, g);
          const band = P.$("stage-promise");
          const shownBand = P.active() === "screen-stage" && band && !band.hidden ? band.textContent : "";
          ok = !o.textContent.includes("%") && /📋 약속: 팀 승리/.test(shownBand);
          why = `띠 「${shownBand}」 · 화면 ${P.active()}`;
        } else why = "창 없음";
      } else if (/등번호/.test(title)) {
        cont();
        for (let t = 0; t < 3 && !P.doc.querySelector(".no-overlay"); t++) {
          const tb = Array.from(P.$("pro-actions").children).find((x) => x.dataset && x.dataset.key && x.dataset.key !== "__rest" && !x.disabled && !x.classList.contains("awaken-act"));
          if (tb) H.tap(P, tb);
        }
        ok = !!P.doc.querySelector(".no-overlay");
        why = ok ? "🔢 창" : `창 없음(${P.active()})`;
      } else if (/도감/.test(title)) {
        H.tap(P, P.$("btn-book"));
        const t = P.$("book-body") ? P.$("book-body").textContent : "";
        /* 시나리오 장부의 ev 여덟 칸 중 s_abroad1은 이야기 장이라 🎲 이벤트 목록(유스 4 + 프로 17 = 21)에 없어요 → 7 / 21
         * (director 31번 「도감 → 만난 이벤트 7 / 21」과 같아요) */
        ok = P.active() === "screen-book" && /만난 이벤트\s*7\s*\/\s*21/.test(t);
        why = `${P.active()} · ${(t.match(/만난 이벤트[^이]*/) || [""])[0].slice(0, 30)}`;
      } else if (/은퇴 필름/.test(title)) {
        cont();
        const ret = Array.from(P.doc.querySelectorAll("#career-actions .btn")).find((x) => /은퇴하기/.test(x.textContent));
        P.w.__confirmYes = true;
        if (ret) H.tap(P, ret);
        await tick(20);
        const chs = P.doc.querySelectorAll("#film-body .film-ch").length;
        ok = P.active() === "screen-film" && chs >= 8 && !!P.doc.querySelector('#film-body [data-act="share"]');
        why = `${P.active()} · 장 ${chs}개`;
      } else { why = "모르는 시나리오 제목"; }
    } catch (e) { why = `예외 — ${e.message}`; }
    const errs = P.errors.filter((e) => !/navigation/.test(e));
    if (errs.length) { ok = false; why += ` · 예외 ${errs[0].slice(0, 120)}`; }
    out.res.push({ title, ok, why });
    P.close();
  }
  try { cw.close(); } catch { /* 닫는 중 */ }
  return out;
}

(async () => {
  console.log("=== 0. 변이 등록 ===");
  const miss = [];
  for (const [k, m] of Object.entries(MUTS)) {
    const src = read(path.resolve(DIR, m.file));
    if (!m.muts.every(([re]) => re.test(src))) miss.push(k);
  }
  check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(", ")}` : ""}`);

  const SW = read(path.join(DIR, "sw.js")), HTML = read(path.join(DIR, "index.html"));
  console.log("=== ① sw.js ASSETS ↔ 실제 파일 ===");
  const s1 = swCheck(SW, HTML);
  check(s1.missingFile.length === 0, `목록의 파일이 전부 있다 (${s1.assets.length}개${s1.missingFile.length ? ` — 없음: ${s1.missingFile.join(", ")}` : ""})`);
  check(s1.notListed.length === 0 && s1.new6, `페이지가 읽는 스크립트·스타일이 전부 목록에 있다 · 새 파일 여섯 포함${s1.notListed.length ? ` — 빠짐: ${s1.notListed.join(", ")}` : ""}`);
  if (s1.oldGap.length) console.log(`   🚧 범위 밖(이번 작업 전부터) — 운영판·베타 둘 다 ASSETS에 없는 공용 파일: ${s1.oldGap.join(", ")} (오프라인 첫 실행에서 못 받을 수 있어요)`);
  check(!!s1.cache && s1.cache !== s1.liveCache, `CACHE를 올렸다 (베타 ${s1.cache} · 운영판 ${s1.liveCache})`);

  console.log("=== ② index.html ===");
  const o2 = orderCheck(HTML);
  check(o2.ok, `career.js 바로 뒤 — ${o2.after.join(" → ")}`);
  const P = H.boot({ which: "beta", seed: 1 });
  const d = P.doc;
  const titleBtns = Array.from(d.querySelectorAll("#screen-title button")).map((b) => b.id);
  check(!!d.getElementById("screen-book") && !!d.getElementById("screen-film") && !!d.getElementById("btn-book")
    && titleBtns.indexOf("btn-book") === titleBtns.indexOf("btn-cloud") + 1, `새 자리 — #screen-book · #screen-film · 타이틀 📖 도감(🔗 기록 연동 바로 뒤: ${titleBtns.join(" ")})`);
  const stage = d.getElementById("screen-stage");
  const kids = stage ? Array.from(stage.children).map((x) => x.id) : [];
  check(kids.indexOf("stage-promise") >= 0 && kids.indexOf("stage-promise") === kids.indexOf("stage-card") - 1, `#stage-promise가 중계 카드 바로 위 (${kids.filter(Boolean).join(" · ")})`);
  check(!!P.w.WingerFilm && typeof P.w.WingerFilm.drawCard === "function" && typeof P.w.WingerFilm.share === "function" && typeof P.w.WingerFilm.build === "function",
    "순서대로 로드돼 WingerFilm에 build(로직)·drawCard·share(화면)가 다 붙었다");

  console.log("=== ③ beta/cloud.js keysOf ===");
  const C = P.w.Cloud && P.w.Cloud._t;
  const ks = C ? C.keysOf("soccer") : [];
  const others = C ? ["rookie", "idol", "winger2"].map((g) => C.keysOf(g)).flat() : [];
  check(ks.includes("winger-save-v1-book") && !ks.includes("winger-book-shadow"), `soccer 키 — ${ks.join(", ")}`);
  check(!others.some((k) => /-book$|shadow/.test(k)), "다른 게임 키에는 장부가 안 붙는다");
  check(!/-book/.test(read(path.join(ROOT, "cloud.js"))), "운영 루트 cloud.js는 안 건드렸다(운영 반영은 promote.sh 몫)");
  P.close();

  console.log("=== ④ 확인 페이지 🎬 시나리오 — 실제로 띄워 닿기 ===");
  const R = await reach(null);
  check(R.n === 6, `🎬 절 버튼이 여섯 개 그려진다 (${R.n})`);
  for (const r of R.res) check(r.ok, `${r.title} — ${r.why}`);

  console.log("=== 변이 검증 ===");
  if (miss.length) check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)");
  else {
    const w1 = swCheck(H.applyMuts(SW, MUTS.W1.muts, "sw"), HTML);
    check(w1.notListed.length > 0 || !w1.new6, `W1 ASSETS에서 scenes.js를 빼면 → ① 빨간불 (빠짐 ${w1.notListed.join(",")})`);
    const w2 = swCheck(H.applyMuts(SW, MUTS.W2.muts, "sw"), HTML);
    check(w2.cache === w2.liveCache, `W2 CACHE를 운영판 이름으로 → ① 빨간불 (${w2.cache})`);
    const w3 = orderCheck(H.applyMuts(HTML, MUTS.W3.muts, "index"));
    check(!w3.ok, `W3 story·book 순서를 바꾸면 → ② 빨간불 (${w3.after.join(" → ")})`);
    const Q = H.boot({ which: "beta", seed: 1, muts: { "../cloud.js": MUTS.W4.muts } });
    const k4 = Q.w.Cloud._t.keysOf("soccer");
    Q.close();
    check(!k4.includes("winger-save-v1-book"), `W4 keysOf 줄을 지우면 → ③ 빨간불 (${k4.join(", ")})`);
    const R5 = await reach(MUTS.W5.muts);
    const r5 = R5.res.find((r) => /도전 · 확정/.test(r.title));
    check(!!r5 && !r5.ok, `W5 시나리오가 betaAt 도장을 안 찍으면 → ④ 빨간불 (🎲 ${r5 && r5.why})`);
  }
  console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(bad ? 1 : 0);
})().catch(H.die);
