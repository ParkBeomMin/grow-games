/* 8종 배선 검증 — 실제 jsdom 브라우저에서 스크립트를 문서 순서 그대로 실행해
 * Cloud.init이 "실행됐는지", "올바른 게임 키로 실행됐는지", 버튼 클릭이 실제로
 * 모달을 여는지, save() 호출이 실제로 dirty 플래그를 남기는지를 검증해요.
 *
 * 예전 버전은 파일 텍스트에 "Cloud.init(" 문자열이 존재하는지만 봤어요. 그건
 * 스크립트 로드 순서 문제(cloud.js가 game.js보다 늦게 실행되어 Cloud.init이
 * 한 번도 안 불리는 버그)를 47/47 통과로 놓쳤어요. 이 버전은 실제로 실행되는지를
 * 봐서 같은 종류의 버그가 다시 생기면 반드시 잡아냅니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(__dirname + "/jsdom.js");

const B = "/workspace/grow-games/beta";
const GAMES = ["rookie", "idol", "stock", "dev", "chef", "stream", "soccer", "winger2", "unicorn"];

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// 네트워크를 막는 선행 스크립트 (실제 서버로는 아무 요청도 안 나가요)
const PRELUDE = `
  window.__net = [];
  window.fetch = () => { window.__net.push("fetch"); return Promise.reject(new Error("net off")); };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  localStorage.setItem("grow-auto-mini", "1");
`;

// cloud.js가 로드된 직후(그 다음 스크립트가 돌기 전) window.Cloud.init을 감싸서
// 실제로 호출됐는지·무슨 인자로 호출됐는지를 기록해요. init 자체 동작은 그대로 둬요.
const SPY = `
  window.__cloudInitCalls = window.__cloudInitCalls || [];
  if (window.Cloud && !window.Cloud.__spied) {
    var __origInit = window.Cloud.init;
    window.Cloud.init = function (g) {
      window.__cloudInitCalls.push(g);
      return __origInit.apply(this, arguments);
    };
    window.Cloud.__spied = true;
  }
`;

/* 최상위 let/const는 브라우저에서도 window 속성이 안 돼요.
 * 게임 안에서 직접 eval하는 창구를 하나 열어 접근합니다. (dom-test.js와 같은 방식) */
const GETSET = `
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
`;

function buildHtml(game) {
  const DIR = path.join(B, game);
  let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const clean = src.split("?")[0]; // 유니콘의 ?v=25 같은 캐시 무효화 쿼리는 파일 경로가 아니에요
    const p = path.resolve(DIR, clean);
    if (!fs.existsSync(p)) return m; // 로컬 파일이 아니면(외부 스크립트 등) 손대지 않아요
    let block = `<script>\n${fs.readFileSync(p, "utf8")}\n</script>`;
    if (/(^|\/)cloud\.js$/.test(clean)) block += `<script>${SPY}</script>`;
    return block;
  });
  html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
  html = html.replace("</body>", `<script>${GETSET}</script></body>`);
  return html;
}

for (const game of GAMES) {
  /* ⚽ winger2는 **1막 모양**으로 따로 봅니다(아래 `winger2Column`) — 다른 8종의 문장은 한 글자도 안 바꿨어요. */
  if (game === "winger2") continue;
  console.log(`\n--- ${game} ---`);
  let dom;
  try {
    dom = new JSDOM(buildHtml(game), {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      url: `https://x.test/${game}/`,
    });
  } catch (e) {
    check(false, `${game}: 페이지 로드 중 예외 없음 (${e.message})`);
    continue;
  }
  const { window } = dom;

  // 1) Cloud.init이 실제로 실행됐고, 이 게임 고유 키로 실행됐는지
  const calls = window.__cloudInitCalls || [];
  check(calls.length > 0, `${game}: Cloud.init 실제 실행됨 (${calls.length}회)`);
  check(calls[0] === game, `${game}: Cloud.init에 올바른 키 전달 — 기대: "${game}" / 받음: ${JSON.stringify(calls[0])}`);

  // 2) #btn-cloud 클릭 시 실제로 모달이 열리는지
  const btn = window.document.getElementById("btn-cloud");
  check(!!btn, `${game}: #btn-cloud 존재`);
  if (btn) {
    btn.click();
    check(!!window.document.querySelector(".cloud-overlay"), `${game}: #btn-cloud 클릭 → 모달(.cloud-overlay) 열림`);
  }

  // 2b) 버튼 위치 — 브리프대로 #btn-hof 바로 다음이어야 해요 (7종은 원래 #btn-battle 뒤에 있었음)
  if (btn) {
    const prev = btn.previousElementSibling;
    check(!!prev && prev.id === "btn-hof", `${game}: #btn-cloud가 #btn-hof 바로 다음 (실제 이전 형제: ${prev ? prev.id : "없음"})`);
  }

  // 3) save() 호출 → touch()가 cloud.js까지 도달해 dirty 플래그를 남기는지
  //    (cur가 null이면 touch()는 조용히 아무 일도 안 해요 — 이게 배선이 끊겼을 때 증상이에요)
  if (typeof window.save !== "function") {
    check(false, `${game}: save() 함수 접근 가능`);
  } else {
    // S가 null이면 대부분 게임의 save()가 조용히 no-op하니, 최소한의 진짜 객체로 채워요
    try {
      const isNull = window.__get("typeof S !== 'undefined' ? S === null : false");
      if (isNull) window.__set("S", {});
    } catch (e) {}
    if (game === "unicorn") {
      try { window.__set("wiping", false); } catch (e) {}
    }
    try { window.save(); } catch (e) { check(false, `${game}: save() 호출 중 예외 없음 (${e.message})`); }
    const dirty = window.localStorage.getItem("grow-cloud-dirty-" + game);
    check(dirty === "1", `${game}: save() 후 grow-cloud-dirty-${game} = "1" (실제: ${JSON.stringify(dirty)}) — cur가 이 게임 키로 세팅됐다는 증거`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * ⚽ winger2 — **더 윙어 II 1막 모양**으로 옮긴 칸 (2026-10-02 · inspector · 25번 §8 · 26번 §5)
 * ═══════════════════════════════════════════════════════════════════════
 * 1막 `game.js`는 IIFE(`window.W2Game`)라 **전역 `save` · `S`가 없고**, 입구를 `DOMContentLoaded` 뒤
 * `boot()`가 그린 다음 `Cloud.init`을 부릅니다. 그래서 위 8종의 **구조 문장**(전역 `save()` · 부팅 전 init ·
 * `#btn-hof` 바로 다음)은 이 게임에서 성립하지 않아요 — 오케스트레이터 결정(25번 §8)대로 구조는 1막 모양으로,
 * **계약의 뜻은 그대로** 지킵니다:
 *   W-1 `Cloud.init`이 **한 번 · "winger2"로** 실제 실행됨 — 🆕 **부팅 뒤**(그 순간 입구가 이미 그려져 있음)
 *   W-2 `#btn-cloud`가 있고 누르면 `.cloud-overlay`가 열림 — 🆕 자리는 입구 버튼 줄의 **❓ 도움말 바로 다음**
 *       (1막엔 명전 버튼이 없어요 — 졸업생 · 도감이 그 자리 · 25번 §8)
 *   W-3 저장(`W2Game._t.save`) → `grow-cloud-dirty-winger2` = "1" — `cur`가 이 게임 키로 섰다는 증거
 *   W-4 **SAVE** — 클라우드가 백업하는 키(`keysOf`의 첫 칸)가 **게임이 실제로 쓰는 키**(`W2Game.SAVE_KEY`)와 같음 ·
 *       허브 이어하기 색인(`-slots`)과 📖 도감 장부(`winger2-book`)도 백업 · 그림자(`-shadow`)는 **안** 올림
 *   W-5 **SUMMARY** — 진짜로 저장한 세이브 · 색인을 클라우드 요약에 넣으면 「1막 N주」로 읽힘
 * 🧪 그리고 **이 칸 자체의 감도**를 봅니다 — 배선 한 줄씩을 끊은 사본마다 **제 문장이** 빨간불이어야 해요.
 * 🌍 이 칸이 서 있는 세계: 「1막 입구가 `DOMContentLoaded` 뒤에 그려지고 그 다음 `Cloud.init`」.
 *    입구를 즉시 그리게 바뀌면 W-1의 「부팅 뒤」가 먼저 뒤집힙니다 — 그때는 결정(25번 §8)부터 다시 보세요. */
function w2Html(over) {
  const DIR = path.join(B, "winger2");
  let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const clean = src.split("?")[0];
    const p = path.resolve(DIR, clean);
    if (!fs.existsSync(p)) return m;
    let code = fs.readFileSync(p, "utf8");
    const base = path.basename(p);
    for (const [re, rep] of (over && over[base]) || []) {
      const before = code;
      code = code.replace(re, rep);
      if (code === before) throw new Error(`${base}에 변이가 안 걸렸어요 — ${re}`);
    }
    let block = `<script>\n${code}\n</script>`;
    if (/(^|\/)cloud\.js$/.test(clean)) {
      block += `<script>${SPY}
        window.__cloudInitEntry = [];
        (function () { var f = window.Cloud && window.Cloud.init; if (!f) return;
          window.Cloud.init = function (g) { window.__cloudInitEntry.push(!!document.getElementById("w2-entry")); return f.apply(this, arguments); }; })();
      </script>`;
    }
    return block;
  });
  html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
  return html;
}
async function winger2Column(over) {
  const bad = [];
  const msgs = {};
  const say = (ok, msg) => { msgs[msg.slice(0, 3)] = msg; if (!ok) bad.push(msg); return ok; };
  const dom = new JSDOM(w2Html(over), { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/winger2/" });
  const w = dom.window;
  const d = w.document;
  /* 부팅은 `DOMContentLoaded` 뒤 — 그 신호를 기다립니다(벽시계 문턱이 아니라 문서 상태) */
  for (let i = 0; i < 200 && (d.readyState === "loading" || !d.querySelector("#w2-entry")); i++) await new Promise((r) => setTimeout(r, 5));
  const calls = w.__cloudInitCalls || [];
  const at = w.__cloudInitEntry || [];
  const res = {};
  res.w1 = say(calls.length === 1 && calls[0] === "winger2" && at[0] === true,
    `W-1 Cloud.init 한 번 · "winger2" · 부팅 뒤(입구가 그려진 뒤) — 실제 ${JSON.stringify(calls)} · 그 순간 입구 ${JSON.stringify(at)}`);
  const btn = d.getElementById("btn-cloud");
  let opened = false;
  if (btn) { btn.click(); opened = !!d.querySelector(".cloud-overlay"); }
  const prev = btn && btn.previousElementSibling;
  res.w2 = say(!!btn && opened && !!prev && prev.classList.contains("w2-help") && !!btn.closest("#w2-entry .w2-entry-acts"),
    `W-2 #btn-cloud ${btn ? "있음" : "없음"} · 누르면 .cloud-overlay ${opened ? "열림" : "안 열림"} · 이전 형제 ${prev ? prev.className : "없음"}(❓ 도움말 다음이어야)`);
  /* W-3 — 진짜 1막 세이브를 만들어 저장합니다(빈 객체로 채우지 않아요 — 게임이 쓰는 모양 그대로) */
  let dirty = null, savedRaw = null;
  try {
    const G = w.W2Game;
    G._t.S = G.newState({ preset: "jiho", gender: "m", name: "윙어", pos: "wg", foot: "R", no: 7, seed: 4242 });
    G._t.save();
    dirty = w.localStorage.getItem("grow-cloud-dirty-winger2");
    savedRaw = w.localStorage.getItem(G.SAVE_KEY);
  } catch (e) { bad.push(`W-3 저장하다 예외 — ${e.message}`); }
  res.w3 = say(dirty === "1", `W-3 저장 → grow-cloud-dirty-winger2 = "1" (실제 ${JSON.stringify(dirty)})`);
  /* W-4 — SAVE · 키 백업 */
  const K = w.Cloud && w.Cloud._t ? w.Cloud._t.keysOf("winger2") : [];
  const SK = w.W2Game ? w.W2Game.SAVE_KEY : null;
  res.w4 = say(!!SK && K[0] === SK && !!savedRaw && K.indexOf(SK + "-slots") >= 0 && K.indexOf("winger2-book") >= 0 && K.indexOf("winger2-book-shadow") < 0,
    `W-4 클라우드 백업 키 ${JSON.stringify(K)} ↔ 게임 SAVE_KEY ${JSON.stringify(SK)}(저장됨 ${!!savedRaw}) — 첫 칸 일치 · -slots · winger2-book 있음 · -shadow 없음`);
  /* W-5 — SUMMARY: 진짜로 쓴 세이브 · 색인으로 */
  let sum1 = null, sum2 = null;
  try {
    const obj = {};
    for (const k of K) { const v = w.localStorage.getItem(k); if (v != null) obj[k] = v; }
    sum1 = w.Cloud._t.summarize("winger2", obj);
    const flat = {}; flat[SK] = obj[SK];
    sum2 = w.Cloud._t.summarize("winger2", flat);
  } catch (e) { bad.push(`W-5 요약하다 예외 — ${e.message}`); }
  res.w5 = say(/^1막 1주/.test(String(sum1)) && /^1막 1주/.test(String(sum2)),
    `W-5 클라우드 요약 — 색인 있음 ${JSON.stringify(sum1)} · 세이브만 ${JSON.stringify(sum2)} (둘 다 「1막 1주」로 읽혀야)`);
  try { if (w.Cloud) { w.Cloud.touch = () => {}; } w.fetch = () => new Promise(() => {}); } catch (e) { /* 닫힘 */ }
  setImmediate(() => { try { w.close(); } catch (e) { /* 닫힘 */ } });
  return { bad, res, msgs };
}

(async () => {
  console.log(`\n--- winger2 (1막 모양) ---`);
  const base = await winger2Column(null);
  for (const k of ["w1", "w2", "w3", "w4", "w5"]) {
    check(base.res[k] === true, `winger2: ${base.msgs[`W-${k[1]}`] || `W-${k[1]} (문장을 못 만들었어요)`}`);
  }
  /* 🧪 감도 — 배선 한 줄씩 끊은 사본마다 **제 문장이** 빨간불이어야 합니다(기준선이 초록일 때만 뜻이 있어요) */
  const MUT = [
    ["init 줄 삭제", "w1", { "game.js": [[/ {4}if \(window\.Cloud && window\.Cloud\.init\) window\.Cloud\.init\(GAME\);\n/, ""]] }],
    ["init을 부팅 전으로(옛 8종 모양)", "w1", { "game.js": [[/ {2}function boot\(\) \{\n {4}if \(!root\(\)\) return;\n/,
      "  if (window.Cloud && window.Cloud.init) window.Cloud.init(GAME);\n  function boot() {\n    if (!root()) return;\n"]] }],
    ["#btn-cloud id 삭제", "w2", { "game.js": [[/, \{ id: "btn-cloud" \}\)\);/, "));"]] }],
    ["저장의 touch 삭제", "w3", { "game.js": [[/ {4}if \(window\.Cloud && window\.Cloud\.touch\) window\.Cloud\.touch\(\);\n {2}\}\n {2}\/\* 🏠 허브/,
      "  }\n  /* 🏠 허브"]] }],
    ["cloud.js SAVE를 옛 v1로", "w4", { "cloud.js": [[/winger2: "winger2-save-v2",/, 'winger2: "winger2-save-v1",']] }],
    ["cloud.js 도감 백업 줄 삭제", "w4", { "cloud.js": [[/ {4}if \(game === "winger2"\) out\.push\("winger2-book"\);[^\n]*\n/, ""]] }],
    ["SUMMARY를 옛 모양으로", "w5", { "cloud.js": [[/ {4}winger2: function \(s\) \{ return s\.label[^\n]*\n/,
      '    winger2: function (s) { return s.phase === "winger2-pro" ? "프로 " + (s.proYear || 0) + "시즌" : "유스 " + (s.year || 1) + "년차"; },\n']] }],
  ];
  if (base.bad.length) {
    console.log("   ⚠️ winger2 기준선이 빨간불이라 감도 확인을 건너뜁니다 — 위를 먼저 고치세요");
  } else {
    for (const [name, want, over] of MUT) {
      let r = null, err = null;
      try { r = await winger2Column(over); } catch (e) { err = e; }
      check(!err && r && r.res[want] === false,
        `winger2: 🧪 변이 「${name}」 → W-${want[1]}이 빨간불`
        + (err ? ` — 💥 ${err.message}` : r && r.res[want] !== false ? " — 🔴 안 잡혔어요(그 문장은 아무것도 안 지킵니다)" : ""));
    }
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
