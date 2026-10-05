/* ⚽ 더 윙어 II 1막 — 검사 공용 **뼈대** (2026-10-02 · inspector · 26번 §1)
 *
 * 🔪 **뼈만 남겼습니다**(11번 §6 「`_load.js`는 뼈만 옮깁니다」). 옛 입구(동네 · 주발 · 초1~초4 ·
 *    학교 아크 · 조기 제안)를 지나던 도우미(`townAuto` · `passTown` · `tapFoot` · `tapChild*` ·
 *    `pickOrigin` · `passStage` · `stageIdle` · `passEarly` · `passArc`)는 **1막에 그 화면이 없어서** 지웠어요.
 *    1막 한 판을 굴리는 장치는 따로 `_act.js`에 있습니다(이 파일은 엔진 · 판 · 페이지를 싣는 데까지).
 *
 * 🔒 지키는 것 넷
 *   ① 직접 eval을 안 씁니다. `new Function(...)` + `return`이에요
 *      (직접 eval은 `const`가 eval 스코프에 갇혀 값이 늘 undefined가 됩니다)
 *   ② 문턱은 **검사에 직접 적습니다.** `_t.K`에서 읽어 오면 상수를 바꿔도
 *      검사가 따라가서 아무것도 안 잡혀요
 *   ③ 변이는 **반드시 적용됐는지 확인**합니다(`mutsOK` · `fileMutsOK` · 안 걸리면 `load*`가 던짐)
 *   ④ 💥 **크래시는 종료 코드 2** — 0 통과 · 1 빨간불 · 2 죽음(안 돌았음)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = "/workspace/grow-games";
const BETA = path.join(ROOT, "beta");
const PAGE_DIR = path.join(BETA, "winger2");
const ENGINE = path.join(PAGE_DIR, "engine.js");
const SRC = fs.readFileSync(ENGINE, "utf8");

/* ═══════════════════════════════════════════════════════════════════════
 * 💥 **크래시는 초록불도 빨간불도 아닙니다** — 종료 코드로 갈라 줍니다
 *     0 = 통과 · 1 = 빨간불(검사가 돌았고 계약이 깨짐) · **2 = 💥 죽음(안 돌았음)**
 * 모아 돌릴 때:
 *   red=0; dead=0
 *   for t in tests/winger2/*-test.js; do
 *     node "$t" >/dev/null 2>&1; c=$?
 *     [ $c -eq 1 ] && { echo "❌ $(basename $t)"; red=$((red+1)); }
 *     [ $c -ge 2 ] && { echo "💥 $(basename $t) — 안 돌았어요"; dead=$((dead+1)); }
 *   done; echo "빨간불 ${red}건 · 죽음 ${dead}건"
 * ═══════════════════════════════════════════════════════════════════════ */
function die(e) {
  console.log(`\n💥 검사가 죽었어요 — 이건 초록불도 빨간불도 아닙니다 (안 돈 겁니다)`);
  console.log(`   ${e && e.stack ? e.stack : e}`);
  process.exit(2);
}
/* 🔒 **삼키지 않습니다.** 닫은 창의 늦은 콜백은 `bootPage`의 `close()`가 「전송을 먼저 끄고 한 틱 뒤에 닫기」로
 *    막아요 — 여기서 스택을 보고 삼키면 **다른 창의 진짜 예외까지** 같이 묻힐 수 있습니다. */
/* 🔒 **`tests/winger2/`의 검사에만** 겁니다 — 다른 검사(`check-page-test.js` 등)가 엔진 로더만 빌려 쓸 때
 *    그 파일의 예외 방침(닫힌 페이지의 예외는 삼킴)을 덮어쓰지 않게요. */
if (require.main && /[\\/]tests[\\/]winger2[\\/]/.test(require.main.filename || "")) {
  process.on("uncaughtException", die);
  process.on("unhandledRejection", die);
}

/* 🔎 변이 정규식이 **지금 소스에 걸리는지** 미리 확인합니다. 던지지 않아요.
 * 돌려주는 것: 안 걸린 정규식의 목록(빈 배열이면 전부 걸림). */
function mutsOKIn(src, table, label) {
  const bad = [];
  for (const [name, muts] of Object.entries(table || {})) {
    for (const [re] of muts) {
      const hit = src.match(re);
      if (!hit) bad.push(`${name}${label ? ` → ${label}` : ""}: ${re}`);
      else if (src.replace(re, "\u0000") === src) bad.push(`${name}${label ? ` → ${label}` : ""}(치환 무효): ${re}`);
    }
  }
  return bad;
}
const mutsOK = (table) => mutsOKIn(SRC, table, "");

/* 🔧 소스 한 벌에 변이를 겁니다 — 하나라도 안 걸리면 던집니다(조용히 무변이로 통과하지 않게) */
function applyMuts(src, muts, label) {
  let out = src;
  for (const [re, rep] of muts || []) {
    const before = out;
    out = out.replace(re, rep);
    if (out === before) throw new Error(`${label || "소스"}에 변이가 안 걸렸어요 — ${re}`);
  }
  return out;
}

/* ⚙️ 엔진을 node에서 그대로 — `Math`를 감싸 넘겨 엔진이 `_rng` 밖에서 `Math.random`을 부르는지 셉니다 */
function load(muts) {
  const src = applyMuts(SRC, muts, "engine.js");
  const win = {};
  const counter = { random: 0 };
  const MathShim = Object.create(Math);
  MathShim.random = function () { counter.random += 1; return Math.random(); };
  const E = new Function("window", "Math", `${src}\nreturn window.WingerEngine;`)(win, MathShim);
  E.__mathRandomCalls = counter;
  return E;
}

/* ---------- 명단 픽스처 ----------
 * ⚠️ 실제 1막 명단과 **같은 모양**이어야 해요(`world.js`의 `meRow` · `npc`):
 *   { name, pos, slot:{}, me, stats|null, str, foot, buff? }
 * 🔒 `FORMATION`은 1막 그대로(fw 2 · wg 2 · mf 4 · df 3) — 검사에 박은 값이에요. */
const FORMATION = { fw: 2, wg: 2, mf: 4, df: 3 };
const SPREAD = [-11, 7, -3, 13, -8, 2, 10, -14, 5, -6, 9];
const statsOf = (a) => ({ shoot: a, pass: a, dribble: a, defense: a, stamina: a, speed: a });
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* 🎲 `spin`을 주면 SPREAD를 섞습니다 — 고정 SPREAD 한 벌은 에이스 자리를 못 박아 버려요(옛 award-test B-2) */
function spreadFor(spin) {
  if (spin == null) return SPREAD;
  const r = mulberry32(spin >>> 0);
  const out = SPREAD.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}
/* 🧍 나 없는 선발 11명 */
function xiAll(mateBase, spin) {
  const base = mateBase == null ? 70 : mateBase;
  const sp = spreadFor(spin);
  const rows = [];
  let i = 0;
  for (const p of ["fw", "wg", "mf", "df"]) {
    for (let j = 0; j < FORMATION[p]; j++) {
      rows.push({ name: `P${i}`, pos: p, slot: { g: 1, a: 1, d: 1 }, me: false,
        str: Math.max(25, Math.min(99, base + sp[i % sp.length])) });
      i += 1;
    }
  }
  return rows;
}
/* 🧍 나 + 동료 10 — `buff`를 주면 내 줄에 실어요(1막의 `ACT1_SPOT` 통로 · 12번 §8-5) */
function xiOf(pos, ability, mateBase, spin, buff) {
  const rows = xiAll(mateBase, spin);
  const at = rows.findIndex((r) => r.pos === pos);
  const me = { name: "나", pos, slot: { g: 1, a: 1, d: 1 }, me: true, stats: statsOf(ability), foot: 1 };
  if (buff) me.buff = buff;
  rows[at] = me;
  return rows;
}

/* 🫀 **1막의 중립 컨디션** — 엔진 `COND_REF`(`condMul = 1`)와 같은 값을 **검사에 박습니다**(소스에서 안 읽음).
 * 🔗 `COND_REF`가 다시 움직이면(사슬의 머리 · 12번 §8-2) `engine-test` ⑧이 먼저 빨간불이 되고, 그때 여기를 같이 고칩니다. */
const COND_NEUTRAL = 51;

/* n경기를 굴려 집계합니다. 시드를 박으니 결과가 완전히 재현돼요.
 * 🔒 기본 컨디션은 **1막 중립 51**(옛 80은 1막에서 `condMul 1.087` — 중립이 아닙니다) */
function play(E, pos, ability, opt) {
  const o = opt || {};
  const n = o.n || 1000;
  E._t.seed(o.seed == null ? 7 : o.seed);
  E._t.skill = o.skill == null ? 0.5 : o.skill;
  const acc = { g: 0, a: 0, d: 0, cards: 0, success: 0, tg: 0, og: 0, n, matches: [] };
  for (let i = 0; i < n; i++) {
    const r = E._t.playMatch({
      xi: xiOf(pos, ability, o.mateBase, o.spin == null ? null : o.spin + i, o.buff),
      oppName: "상대", teamStr: o.teamStr == null ? 70 : o.teamStr,
      oppStr: o.oppStr == null ? 70 : o.oppStr, condition: o.condition == null ? COND_NEUTRAL : o.condition,
    });
    acc.g += r.myGoals; acc.a += r.assists; acc.d += r.defense;
    acc.cards += r.mineCards; acc.success += r.mineSuccess;
    acc.tg += r.teamGoals; acc.og += r.oppGoals;
    if (o.keep) acc.matches.push(r);
  }
  acc.perMatch = { g: acc.g / n, a: acc.a / n, d: acc.d / n, cards: acc.cards / n, og: acc.og / n, tg: acc.tg / n };
  acc.season = { g: acc.perMatch.g * 38, a: acc.perMatch.a * 38, d: acc.perMatch.d * 38 };
  return acc;
}

/* ═══════════════════════════════════════════════════════════════════════
 * 🥅 `beta/winger-moment.js` — 판을 **브라우저 없이** 부르기(산식 · 상수 쪽)
 * `window` · `document` · `localStorage`를 자리만 채워 줍니다.
 *   · `window.WingerEngine`을 넣어야 🫀 컨디션(`condMul`)이 진짜로 걸려요 — 안 넣으면 `condOf`가 1로 떨어져
 *     **컨디션 검사가 아무것도 안 지킵니다**
 * ═══════════════════════════════════════════════════════════════════════ */
const MOMENT = path.join(BETA, "winger-moment.js");
const MSRC = fs.readFileSync(MOMENT, "utf8");
function loadMoment(muts, opt) {
  const o = opt || {};
  const src = applyMuts(MSRC, muts, "winger-moment.js");
  const store = { "grow-wide-judge": o.wide ? "1" : "0" };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  const win = { WingerEngine: o.engine || load() };
  const doc = { getElementById: () => null, readyState: "complete", addEventListener() {} };
  const M = new Function("window", "document", "localStorage", `${src}\nreturn window.W2Moment;`)(win, doc, localStorage);
  M.__store = store;
  M.__win = win;
  return M;
}
const momentMutsOK = (table) => mutsOKIn(MSRC, table, "winger-moment.js");

/* 🖥️ **진짜 DOM 위의 `W2Moment`** — 판을 실기기 순서로 눌러 보는 자리.
 * 🔒 `url`이 있어야 `localStorage`가 삽니다(없으면 ♿ 확대가 검사에서 한 번도 안 걸려요). */
function momentDom(muts) {
  const { JSDOM } = require(path.join(ROOT, "tests/cloud/jsdom.js"));
  const mom = applyMuts(MSRC, muts, "winger-moment.js");
  const dom = new JSDOM("<!doctype html><body><div id=host></div></body>",
    { runScripts: "outside-only", pretendToBeVisual: true, url: "https://x.test/winger2/" });
  const W = dom.window;
  W.eval(fs.readFileSync(ENGINE, "utf8"));
  W.eval(mom);
  return W;
}
/* 🖱️ 실기기 순서 그대로 — pointerdown → pointerup → click 셋 다 */
function pressDom(W, el) {
  for (const t of ["pointerdown", "pointerup", "click"]) {
    const e = new W.Event(t, { bubbles: true, cancelable: true });
    e.clientX = 10; e.clientY = 10;
    el.dispatchEvent(e);
  }
}
/* 🖱️🖱️ **브라우저의 click 재타겟** — pointerdown/up은 옛 요소에, click은 그 자리에 새로 생긴 요소에 */
function pressRetarget(W, oldEl, root, newSel) {
  for (const t of ["pointerdown", "pointerup"]) {
    oldEl.dispatchEvent(new W.Event(t, { bubbles: true, cancelable: true }));
  }
  const fresh = root.querySelector(newSel);
  if (!fresh) throw new Error(`재타겟할 새 요소를 못 찾았어요 — ${newSel}`);
  fresh.dispatchEvent(new W.Event("click", { bubbles: true, cancelable: true }));
  return fresh;
}

/* ═══════════════════════════════════════════════════════════════════════
 * 🖥️ 게임 페이지(`beta/winger2/index.html`)를 JSDOM에 — **진짜 스크립트 순서 그대로**
 *   opts.muts   { "game.js": [[정규식, 바꿀 문자열], …], "index.html": […], "winger-moment.js": […] }
 *               `<script src>`의 **basename**으로 겁니다. **안 걸리면 던집니다.**
 *   opts.keys   localStorage에 심을 것
 *   opts.fastTimers  setTimeout을 0ms로(연출 지연만 없앰 — rAF의 물리는 실시간 그대로)
 *   opts.pre    preamble 뒤에 덧붙일 스크립트(문자열)
 * ═══════════════════════════════════════════════════════════════════════
 * ⏱️ preamble은 **여기 한 벌만** 있습니다 — 🔴 가짜 rAF에 `0`을 넘기면 판이 얼어붙어요(`raf-test`). */
const RAF_SHIM = `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(typeof performance!=="undefined"&&performance.now?performance.now():Date.now()),0);`;
function pagePre(keys, opt) {
  const o = opt || {};
  return `window.fetch=()=>Promise.reject(new Error("off"));
${RAF_SHIM}window.scrollTo=()=>{};
window.alert=()=>{};window.confirm=()=>${o.confirm ? "true" : "false"};
`   /* ⏱️ fastTimers — 기다림을 0으로 뭉갬. "keep-long"이면 3초 이상(🧱 고를 시간 4초 · ♿ 5.2초 같은 **제한**)은 그대로 둬요
    *    — 손이 그 안에 누르면 판이 지워서 실제로 기다리는 일은 없고, 뭉개면 판이 열리자마자 시간 초과가 돼요 */
    + (o.fastTimers ? `(function(){var st=window.setTimeout;var keep=${o.fastTimers === "keep-long" ? "true" : "false"};window.setTimeout=function(fn,ms){var a=[].slice.call(arguments,2);return st.apply(window,[fn,keep&&ms>=3000?ms:0].concat(a));};})();\n` : "")
    + `window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message||e.error));});\n`
    + Object.entries(keys || {}).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("")
    + (o.pre || "");
}
/* `index.html`이 싣는 스크립트의 **basename → 실제 경로** — 변이 · 대조가 같은 파일을 보게 */
function pageScripts(html) {
  const out = {};
  for (const m of (html || fs.readFileSync(path.join(PAGE_DIR, "index.html"), "utf8")).matchAll(/<script src="([^"]+)"><\/script>/g)) {
    const f = path.resolve(PAGE_DIR, m[1].split("?")[0]);
    out[path.basename(f)] = f;
  }
  return out;
}
function bootPage(opts) {
  const o = opts || {};
  const { JSDOM } = require(path.join(ROOT, "tests/cloud/jsdom.js"));
  const muts = o.muts || {};
  const applied = {};
  let rawHtml = fs.readFileSync(path.join(PAGE_DIR, "index.html"), "utf8");
  if (muts["index.html"]) { rawHtml = applyMuts(rawHtml, muts["index.html"], "index.html"); applied["index.html"] = muts["index.html"].length; }
  const html = rawHtml
    .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const f = path.resolve(PAGE_DIR, src.split("?")[0]);
      if (!fs.existsSync(f)) return "";
      const base = path.basename(f);
      let code = fs.readFileSync(f, "utf8");
      if (muts[base]) { code = applyMuts(code, muts[base], base); applied[base] = muts[base].length; }
      return `<script>\n${code}\n</script>`;
    })
    .replace("</head>", `<script>${pagePre(o.keys, o)}</script></head>`)
    .replace("</body>", `<script>window.__get=(n)=>eval(n);</script></body>`);
  const missing = Object.keys(muts).filter((k) => !applied[k]);
  if (missing.length) throw new Error(`변이를 건 파일이 페이지에 안 실렸어요 — ${missing.join(", ")}`);
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: o.url || "https://x.test/winger2/" });
  const w = dom.window;
  w.Ads = { display() {}, init() {} };
  w.__applied = applied;
  /* 💥 `close()` 뒤에 늦게 도는 콜백이 검사를 통째로 죽이는 자리 — 클라우드 전송을 먼저 끄고 한 틱 뒤에 닫아요 */
  const rawClose = w.close.bind(w);
  let closed = false;
  w.close = () => {
    if (closed) return;
    closed = true;
    try { if (w.Cloud) { w.Cloud.touch = () => {}; w.Cloud.pushAll = () => {}; } } catch (e) { /* 이미 죽은 창 */ }
    try { w.fetch = () => new Promise(() => {}); } catch (e) { /* 이미 죽은 창 */ }
    setImmediate(() => { try { rawClose(); } catch (e) { /* 이미 닫힘 */ } });
  };
  return w;
}
/* 변이 정규식이 그 파일에 걸리는지 미리 — 죽지 않고 목록을 돌려줍니다.
 * table = { 이름: { "game.js": [[re, rep]…], … } } · 파일은 `index.html`이 싣는 basename 또는 `index.html` */
function pageMutsOK(table) {
  const scripts = pageScripts();
  const bad = [];
  for (const [name, byFile] of Object.entries(table || {})) {
    for (const [file, muts] of Object.entries(byFile)) {
      const f = file === "index.html" ? path.join(PAGE_DIR, "index.html") : (scripts[file] || path.join(PAGE_DIR, file));
      if (!fs.existsSync(f)) { bad.push(`${name} → ${file}: 파일이 없어요`); continue; }
      bad.push(...mutsOKIn(fs.readFileSync(f, "utf8"), { [name]: muts }, file));
    }
  }
  return bad;
}
/* 저장소 아무 파일 — 경로(ROOT 기준)로 대조 */
function fileMutsOK(rel, table) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) return [`${rel}: 파일이 없어요`];
  return mutsOKIn(fs.readFileSync(f, "utf8"), table, rel);
}

/* ═══════════════════════════════════════════════════════════════════════
 * 🎲 **난수원이 둘 이상이면 시드를 「갈라서」 겁니다** (11번 §7-3 #19)
 *   ① `W.Math.random` — 판(`winger-moment.js`)·공용 `Fx`가 부릅니다
 *   ② `WingerEngine._t.seed()` — 엔진은 로드 때 `let _rng = Math.random`으로 함수를 잡아 둬서 따로 걸어야 해요
 * 🔴 같은 시드면 lockstep(앞 1,000개 1000/1000 일치) — 잡음이 아니라 편향이라 표본을 늘려도 안 없어집니다.
 * 🌍 1막 게임은 판 시드에서 자리마다 갈라 낸 난수원(`world.js` `SALT`)을 엔진에 직접 겁니다 — 그 갈래는
 *    `seed-split-test` B절이 따로 봐요. 이 함수는 **검사가 거는** 두 흐름만 가릅니다. */
const SEED_SPLIT = 0x9E3779B9;
function seedBoth(W, seed, opt) {
  const o = opt || {};
  const base = mulberry32(seed >>> 0);
  const buf = [];
  const s = { i: 0 };
  s.fn = () => { if (s.i >= buf.length) buf.push(base()); return buf[s.i++]; };
  W.Math.random = s.fn;
  if (o.engine !== false && W.WingerEngine && W.WingerEngine._t) {
    W.WingerEngine._t.seed((seed ^ SEED_SPLIT) >>> 0);
  }
  return s;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { ROOT, BETA, PAGE_DIR, ENGINE, SRC, die,
  load, mutsOK, mutsOKIn, applyMuts, fileMutsOK,
  FORMATION, xiOf, xiAll, statsOf, play, spreadFor, mulberry32, COND_NEUTRAL,
  loadMoment, momentMutsOK, MSRC, MOMENT, momentDom, pressDom, pressRetarget,
  bootPage, pageMutsOK, pagePre, pageScripts, RAF_SHIM,
  seedBoth, SEED_SPLIT, wait };
