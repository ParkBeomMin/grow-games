/* 7종 도움말에 "기록 보관" 항목이 실제로 렌더되는지 검증 — 실제 jsdom 브라우저에서
 * 페이지를 통째로 로드하고 openHelp()를 불러 모달을 연 뒤, help.js가 실제로 그려낸
 * DOM 안에 새 섹션이 있는지를 본다.
 *
 * 파일 텍스트에 "기록 보관" 문자열이 있는지만 grep하면 안 된다. HELP_SECTIONS 배열에
 * 넣었어도 Help.open()에 실제로 전달되지 않거나, 배열 순서가 깨져 있거나, 로드 순서
 * 문제로 openHelp가 아예 안 불리면 grep은 통과하고 기능은 죽어 있을 수 있다.
 * (cloud-wire-test.js가 잡아낸 것과 같은 종류의 "죽은 기능"을 여기서도 같은 방식으로 막는다)
 *
 * 유니콘은 help.js를 쓰지 않으므로 대상에서 뺀다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(__dirname + "/jsdom.js");

const B = "/workspace/grow-games/beta";
const GAMES = ["rookie", "idol", "stock", "dev", "chef", "stream", "soccer", "winger2"];

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// 네트워크를 막는 선행 스크립트 (실제 서버로는 아무 요청도 안 나가요)
const PRELUDE = `
  window.__net = [];
  window.fetch = () => { window.__net.push("fetch"); return Promise.reject(new Error("net off")); };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  localStorage.setItem("grow-auto-mini", "1");
`;

function buildHtml(game) {
  const DIR = path.join(B, game);
  let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const clean = src.split("?")[0];
    const p = path.resolve(DIR, clean);
    if (!fs.existsSync(p)) return m;
    return `<script>\n${fs.readFileSync(p, "utf8")}\n</script>`;
  });
  html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
  return html;
}

for (const game of GAMES) {
  /* ⚽ winger2는 **1막 모양**으로 따로 봅니다(아래 `winger2Column`) — 다른 7종의 문장은 한 글자도 안 바꿨어요. */
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
  const doc = window.document;

  check(typeof window.openHelp === "function", `${game}: openHelp() 접근 가능`);
  check(!!window.Help && typeof window.Help.open === "function", `${game}: Help.open 로드됨`);
  check(!doc.querySelector(".help-overlay"), `${game}: 열기 전에는 도움말 모달이 없다`);

  if (typeof window.openHelp === "function") {
    try { window.openHelp(); } catch (e) { check(false, `${game}: openHelp() 호출 중 예외 없음 (${e.message})`); }
  }

  const overlay = doc.querySelector(".help-overlay");
  check(!!overlay, `${game}: openHelp() 호출로 실제 모달(.help-overlay)이 열린다`);
  if (!overlay) continue;

  const secs = Array.from(overlay.querySelectorAll(".help-sec"));
  check(secs.length > 0, `${game}: 도움말 섹션이 실제로 그려진다 (${secs.length}개)`);

  const last = secs[secs.length - 1];
  const lastTitle = last && last.querySelector("h4") && last.querySelector("h4").textContent;
  check(!!lastTitle && lastTitle.includes("💾") && lastTitle.includes("기록 보관"),
    `${game}: 마지막 섹션이 "기록 보관"이다 — 실제 렌더: "${lastTitle}"`);

  const lastBody = last && last.querySelector("p") && last.querySelector("p").innerHTML;
  check(!!lastBody && /이 기기의 브라우저에 저장되고/.test(lastBody),
    `${game}: 본문에 로컬 저장 안내가 실제로 그려진다 — "${lastBody && lastBody.slice(0, 40)}..."`);
  check(!!lastBody && /🔗 기록 연동/.test(lastBody),
    `${game}: 본문에 타이틀 화면 안내(🔗 기록 연동)가 실제로 그려진다`);

  // 닫기 버튼이 실제로 모달을 닫는다 (help.js의 기존 동작이 그대로 살아있는지 확인)
  const closeBtn = overlay.querySelector(".help-close");
  check(!!closeBtn, `${game}: 닫기 버튼이 있다`);
  if (closeBtn) closeBtn.click();
  check(!doc.querySelector(".help-overlay"), `${game}: 닫기 버튼을 누르면 모달이 사라진다`);
}

/* ═══════════════════════════════════════════════════════════════════════
 * ⚽ winger2 — **더 윙어 II 1막 모양**으로 옮긴 칸 (2026-10-02 · inspector · 25번 §8 · 26번 §5)
 * ═══════════════════════════════════════════════════════════════════════
 * 1막 `game.js`는 IIFE(`window.W2Game`)라 **전역 `openHelp`가 없습니다** — 도움말은 입구의 ❓ 버튼(`.w2-help`)이
 * 엽니다(오케스트레이터 결정 25번 §8 · 전역은 안 늘림). 그래서 구조 문장 「`openHelp()` 접근 가능」만 1막 모양
 * 「입구의 ❓를 **눌러서** 열린다」로 바꾸고, **사용자에게 보이는 계약은 그대로** 봅니다:
 *   H-1 ❓를 누르면 `.help-overlay`가 열린다(누르기 전에는 없다)
 *   H-2 마지막 섹션이 「💾 기록 보관」이고 본문에 8종 표준 문구 둘(「이 기기의 브라우저에 저장되고」 · 「🔗 기록 연동」)
 *   H-3 닫기 버튼이 모달을 닫는다
 * 🧪 이 칸의 감도 — 문구 한 줄 · 버튼 배선을 끊은 사본에서 **제 문장이** 빨간불이어야 해요. */
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
    return `<script>\n${code}\n</script>`;
  });
  html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
  return html;
}
async function winger2Column(over) {
  const res = {}, msgs = {};
  const say = (k, ok, msg) => { res[k] = ok; msgs[k] = msg; };
  const dom = new JSDOM(w2Html(over), { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/winger2/" });
  const w = dom.window;
  const doc = w.document;
  for (let i = 0; i < 200 && (doc.readyState === "loading" || !doc.querySelector("#w2-entry")); i++) await new Promise((r) => setTimeout(r, 5));
  const before = !!doc.querySelector(".help-overlay");
  const hb = doc.querySelector("#w2-entry .w2-help");
  if (hb) for (const t of ["pointerdown", "pointerup", "click"]) hb.dispatchEvent(new w.MouseEvent(t, { bubbles: true, cancelable: true }));
  const overlay = doc.querySelector(".help-overlay");
  say("h1", !before && !!hb && !!overlay, `H-1 입구 ❓ ${hb ? "있음" : "없음"} → 누르면 .help-overlay ${overlay ? "열림" : "안 열림"} (누르기 전 ${before ? "이미 있음" : "없음"})`);
  const secs = overlay ? Array.from(overlay.querySelectorAll(".help-sec")) : [];
  const last = secs[secs.length - 1];
  const lastTitle = last && last.querySelector("h4") ? last.querySelector("h4").textContent : "";
  const lastBody = last && last.querySelector("p") ? last.querySelector("p").innerHTML : "";
  say("h2", lastTitle.includes("💾") && lastTitle.includes("기록 보관") && /이 기기의 브라우저에 저장되고/.test(lastBody) && /🔗 기록 연동/.test(lastBody),
    `H-2 섹션 ${secs.length}개 · 마지막 「${lastTitle}」 · 표준 문구 둘 ${/이 기기의 브라우저에 저장되고/.test(lastBody) ? "✔" : "✘"}${/🔗 기록 연동/.test(lastBody) ? "✔" : "✘"}`);
  const closeBtn = overlay && overlay.querySelector(".help-close");
  if (closeBtn) closeBtn.click();
  say("h3", !!closeBtn && !doc.querySelector(".help-overlay"), `H-3 닫기 버튼 ${closeBtn ? "있음" : "없음"} → 누르면 모달이 ${doc.querySelector(".help-overlay") ? "남음" : "사라짐"}`);
  try { if (w.Cloud) w.Cloud.touch = () => {}; w.fetch = () => new Promise(() => {}); } catch (e) { /* 닫힘 */ }
  setImmediate(() => { try { w.close(); } catch (e) { /* 닫힘 */ } });
  return { res, msgs };
}
(async () => {
  console.log(`\n--- winger2 (1막 모양) ---`);
  const base = await winger2Column(null);
  for (const k of ["h1", "h2", "h3"]) check(base.res[k] === true, `winger2: ${base.msgs[k]}`);
  const MUT = [
    ["입구 ❓ 배선 끊기", "h1", { "game.js": [[/btn\("w2-help", "❓ 도움말", openHelp\)/, 'btn("w2-help", "❓ 도움말", null)']] }],
    ["「🔗 기록 연동」 안내 문구를 옛 「☁️ 기록 연동」으로", "h2", { "game.js": [[/타이틀 화면의 🔗 기록 연동에서/, "타이틀 화면의 ☁️ 기록 연동에서"]] }],
    ["「💾 기록 보관」 뒤에 섹션을 하나 더(마지막이 아니게)", "h2", { "game.js": [[/ {6}\+ "경기 도중에 닫으면 그 경기는 처음부터 다시 해요\." \},\n {2}\];/, '      + "경기 도중에 닫으면 그 경기는 처음부터 다시 해요." },\n    { emoji: "🧪", title: "뒤에 붙은 섹션", body: "x" },\n  ];']] }],
  ];
  if (Object.values(base.res).some((v) => v !== true)) {
    console.log("   ⚠️ winger2 기준선이 빨간불이라 감도 확인을 건너뜁니다");
  } else {
    for (const [name, want, over] of MUT) {
      let r = null, err = null;
      try { r = await winger2Column(over); } catch (e) { err = e; }
      check(!err && r && r.res[want] === false, `winger2: 🧪 변이 「${name}」 → ${want.toUpperCase().replace("H", "H-")}가 빨간불`
        + (err ? ` — 💥 ${err.message}` : r && r.res[want] !== false ? " — 🔴 안 잡혔어요" : ""));
    }
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
