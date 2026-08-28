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

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
