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
const GAMES = ["rookie", "idol", "stock", "dev", "chef", "stream", "soccer", "unicorn"];

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

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
