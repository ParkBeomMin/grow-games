/* 🖊️ 헌액 한마디 — 그리고 그 글이 **남의 브라우저에서 실행되지 않는가.**
 *
 * 명예의 전당은 8종이 **같은 표 하나**를 읽어서, 거기 올라간 값이 다른 사람 화면에
 * innerHTML로 그려집니다. 그래서 한마디를 받기 전에 이걸 먼저 확인했어요 —
 * 이름 칸에 `<img src=x onerror=…>`를 넣은 항목이 **DOM에 태그 그대로** 들어갔습니다.
 * 입력칸의 maxlength는 화면의 예의일 뿐, 개발자 도구를 열면 아무 값이나 올라가요.
 *
 * 지키는 것:
 *   ① 남이 올린 값이 태그로 살아나지 않는다 (목록·헌액 카드 둘 다)
 *   ② match.js가 보낼 때도 받을 때도 씻는다 — 8종이 같은 길을 쓰니 거기서 막아요
 *   ③ 한마디는 길이·줄바꿈·태그 글자가 정리된다
 *   ④ 은퇴식에서 실제로 한마디를 남길 수 있고, 그게 카드에 뜬다
 *   ⑤ 안 남기면 그 줄이 아예 안 그려진다 (빈 따옴표는 더 쓸쓸해요)
 *   ⑥ 원격 전송은 **한 번**이다 — hof 표에 UPDATE 정책이 없어서 덮어쓸 수 없어요
 *   ⑦ 변이 검증 — 이스케이프를 떼면 ①이 무너진다
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const MATCH = fs.readFileSync("/workspace/grow-games/beta/match.js", "utf8");

const EVIL = '<img src=x onerror="window.__PWNED=1">';
const mkEntry = (over) => Object.assign({
  id: "w1", game: "soccer", name: "테스트", pos: "fw", team: "클럽", seasons: 5,
  wins: 1, daesang: 0, bonsang: 0, rookie: 0, goals: 10, assists: 5, defense: 3,
  apps: 50, finalOvr: 90, gen: 1, score: 1000, sv: 3, grade: "A", leagues: "K리그1",
  at: Date.UTC(2026, 7, 1),
}, over || {});

// ---------- ② match.js가 씻는가 ----------
console.log("=== ② 오가는 길에서 씻는가 (8종이 같은 길을 써요) ===");
{
  const src = (MATCH.match(/const BAD = [\s\S]*?\n {2}\}\n\n {2}async function submitHof/) || [""])[0]
    .replace(/\n {2}async function submitHof$/, "");
  check(!!src, "match.js에서 씻는 함수를 찾았다");
  if (src) {
    const scrub = new Function(`${src} return scrub;`)();
    const out = scrub({ name: EVIL, word: "안녕", score: 7, deep: { a: { b: { c: { d: "x" } } } } });
    check(!/[<>]/.test(out.name), `이름의 태그 글자가 지워진다 (${out.name})`);
    check(out.score === 7 && out.word === "안녕", "멀쩡한 값은 그대로 둔다");
    check(out.deep.a.b.c === null, "깊이 제한이 있다 — 끝없이 감싼 값으로 못 막는다");
    const long = scrub({ w: "가".repeat(500) });
    check(long.w.length <= 120, `긴 문자열을 자른다 (${long.w.length}자)`);
  }
  check(/data: scrub\(entry\)/.test(MATCH), "보낼 때 씻는다");
  const fetchBody = (MATCH.match(/async function fetchHof\(game\) \{[\s\S]*?\n {2}\}/) || [""])[0];
  check(/scrub\(/.test(fetchBody), "**받을 때도** 씻는다 — 이미 올라가 있는 값이 진짜 위험이에요");
}

// ---------- 페이지 ----------
const PRE = `window.fetch=()=>Promise.reject(new Error("off"));`
  + `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};`
  + `window.alert=()=>{};window.confirm=()=>false;localStorage.setItem("grow-auto-mini","1");`;
function boot(hof, mutate) {
  let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(DIR, src);
      if (!fs.existsSync(p)) return "";
      let code = fs.readFileSync(p, "utf8");
      if (mutate) code = mutate(code, path.basename(p));   // ⑦ 변이 검증에서 씁니다
      return `<script>\n${code}\n</script>`;
    });
  const seed = hof ? `localStorage.setItem("grow-hof-v1", ${JSON.stringify(JSON.stringify(hof))});`
    + `localStorage.setItem("grow-hof-synced","1");` : "";
  html = html.replace("</head>", `<script>${PRE}${seed}</script></head>`)
    .replace("</body>", `<script>window.__get=(n)=>eval(n);window.__set=(n,v)=>{window.__v=v;eval(n+" = window.__v");};</script></body>`);
  const d = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
  const ww = d.window;
  ww.Ads = { display() {}, init() {} }; ww.Stats = { log() {} }; ww.alert = () => {};
  ww.HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({}, { get: () => () => ({ width: 40 }), set: () => true });
  };
  return ww;
}

// ---------- ① 남이 올린 값이 태그로 살아나는가 ----------
console.log("=== ① 남이 올린 값이 태그로 살아나지 않는가 ===");
(async () => {
  {
    const w = boot([mkEntry({ name: EVIL, team: EVIL, grade: EVIL, leagues: EVIL, word: EVIL })]);
    w.Match = null;
    await w.WingerCareer.showHof();
    const box = w.document.getElementById("hof-list");
    check(!!box && box.innerHTML.length > 20, "명예의 전당이 그려진다");
    check(!w.document.querySelector("#hof-list img"), "목록 — 태그가 DOM에 안 들어간다");
    check(!w.__PWNED, "목록 — 실행되지 않는다");
    check(/&lt;img/.test(box.innerHTML), "글자 그대로 보인다 (지우는 게 아니라 이스케이프)");

    // 헌액 카드도 같은 값을 그려요 — 여기만 새면 소용이 없어요
    const card = w.document.querySelector(".hof-card");
    check(!!card, "헌액 카드를 열 줄이 있다");
    if (card) {
      card.click();
      const ov = w.document.querySelector(".hof-overlay");
      check(!!ov, "헌액 카드가 열린다");
      check(!ov.querySelector("img"), "헌액 카드 — 태그가 DOM에 안 들어간다");
      check(!w.__PWNED, "헌액 카드 — 실행되지 않는다");
    }
    w.close();
  }

  // ---------- ③ 한마디 다듬기 ----------
  console.log("=== ③ 한마디를 다듬는가 ===");
  {
    const src = (CAREER.match(/const WORD_MAX = \d+;[\s\S]*?\.slice\(0, WORD_MAX\);/) || [""])[0];
    check(!!src, "한마디 규격을 소스에서 찾았다");
    const clean = new Function(`${src} return cleanWord;`)();
    const max = new Function(`${src} return WORD_MAX;`)();
    check(clean("가".repeat(200)).length === max, `${max}자로 자른다`);
    check(!/[<>&"']/.test(clean(EVIL)), `태그 글자를 지운다 (${clean(EVIL)})`);
    check(clean("한\n두\t줄") === "한 두 줄", "줄바꿈·탭을 한 칸으로 만든다 — 카드 한 줄에 들어가야 해요");
    check(clean("   ") === "", "공백만 남기면 빈 값이 된다");
    check(clean(null) === "" && clean(undefined) === "", "값이 없어도 안 죽는다");
    check(clean("후회 없이 뛰었습니다") === "후회 없이 뛰었습니다", "멀쩡한 글은 그대로 둔다");
  }

  // ---------- ④⑤⑥ 은퇴식에서 실제로 남기는가 ----------
  console.log("=== ④⑤⑥ 은퇴식에서 남기고, 카드에 뜨는가 ===");
  {
    const w = boot(null);
    const sent = [];
    w.Match = { submitHof: (g, e) => { sent.push(JSON.parse(JSON.stringify(e))); return Promise.resolve(true); },
      fetchHof: () => Promise.resolve(null), backfillHof: () => Promise.resolve(), register() {} };
    const C = w.WingerCareer;
    w.__set("S", w.__get('newState(MARKETS[0], "fw", "은퇴자")'));
    C.onEnding(true, false);
    w.document.getElementById("btn-go-debut").click();
    const st = C._t.state();
    st.career = st.career || {};
    st.career.years = [{}, {}, {}];
    C._t.enshrine();

    const input = w.document.getElementById("hof-word");
    check(!!input, "은퇴식에 한마디 칸이 뜬다");
    check(sent.length === 0, "⑥ 한마디를 받기 전에는 원격으로 안 올린다 — 같은 id는 덮어쓸 수 없어요");

    input.value = `  후회 없이 뛰었습니다 ${EVIL}  `;
    w.document.getElementById("btn-hof-word").click();
    await new Promise((r) => setTimeout(r, 30));
    check(sent.length === 1, `⑥ 한마디까지 담아서 **한 번만** 올린다 (${sent.length}회)`);
    const up = sent[0] || {};
    check(!!up.word && !/[<>]/.test(up.word), `올라간 한마디가 다듬어져 있다 (${up.word})`);
    check(input.disabled, "남긴 뒤에는 칸이 잠긴다 — 두 번 올릴 수 없어요");

    const saved = JSON.parse(w.localStorage.getItem("grow-hof-v1") || "[]");
    check(saved.length === 1 && saved[0].word === up.word, "로컬 기록에도 같은 값이 들어간다 — 내 화면과 남의 화면이 같아야 해요");
    check(saved[0].sent === true, "올린 표시가 남는다");

    await C.showHof();
    const list = w.document.getElementById("hof-list").innerHTML;
    check(/후회 없이 뛰었습니다/.test(list), "④ 명예의 전당 목록에 한마디가 뜬다");
    check(/&lt;img/.test(list) || !/<img/.test(list), "그때도 태그로 살아나지 않는다");
    w.close();
  }

  // ---------- ⑤ 안 남기면 ----------
  console.log("=== ⑤ 안 남기면 줄이 없다 ===");
  {
    const w = boot([mkEntry({ name: "무언" })]);
    w.Match = null;
    await w.WingerCareer.showHof();
    const box = w.document.getElementById("hof-list");
    check(!/hof-word/.test(box.innerHTML), "한마디가 없으면 목록에 그 줄이 없다");
    const card = w.document.querySelector(".hof-card");
    if (card) {
      card.click();
      const ov = w.document.querySelector(".hof-overlay");
      check(!!ov && !ov.querySelector(".hofd-word"), "헌액 카드에도 빈 따옴표가 안 뜬다");
    }
    w.close();
  }

  // ---------- ⑦ 변이 검증 ----------
  console.log("=== ⑦ 변이 검증 ===");
  {
    /* ⚠️ "esc 함수가 이스케이프한다"만 보면 **부르지도 않는 esc**를 지키게 돼요.
     * 그리는 길에서 esc를 빼고 페이지를 다시 세워, ①이 실제로 빨간불이 되는지 봅니다. */
    let hit = 0;
    const w = boot([mkEntry({ name: EVIL })], (code, file) => {
      if (file !== "career.js") return code;
      const out = code.replace(/const esc = \(v\) =>[\s\S]*?;\n/, "const esc = (v) => String(v == null ? \"\" : v);\n");
      if (out !== code) hit += 1;
      return out;
    });
    check(hit === 1, "변이 치환이 됐다 (esc를 그냥 문자열로)");
    w.Match = null;
    await w.WingerCareer.showHof();
    const box = w.document.getElementById("hof-list");
    check(!!w.document.querySelector("#hof-list img"),
      "변이 — 이스케이프를 떼면 태그가 DOM에 들어간다 (①이 그걸 잡아요)");
    check(!/&lt;img/.test((box || {}).innerHTML || ""), "변이 — 그때는 글자로 안 보인다");
    w.close();
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
