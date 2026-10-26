/* 🙈 관리 화면 — 명예의 전당 기록 가리기.
 *
 * 제보: 「밀란 노바크」 — 초월 60,000회 · 능력치 60,034로 명예의 전당 1위에 올라온 조작 세이브.
 * 숫자 문턱은 그럴듯하게 꾸민 조작을 못 잡아서, 사람이 보고 가리는 손잡이를 붙였어요.
 *
 * 지키는 것:
 *   ① 그 게임의 기록만 점수 순으로 보인다 (다른 게임 기록이 안 섞인다)
 *   ② 이름 찾기가 목록을 좁힌다
 *   ③ 가리기는 **그 줄의 DB id**로 hof_hide(p_hidden: true)를 부르고, 목록에서 빠진다
 *   ④ 비번이 없으면 아무것도 안 보낸다 · 확인창에서 취소하면 아무것도 안 보낸다
 *   ⑤ 가린 기록 보기 → hof_hidden_list, 되돌리기 → hof_hide(p_hidden: false), 목록에 돌아온다
 *   ⑥ 다시 그려도 넣어 둔 비번이 남는다
 *
 * 실제 페이지를 띄워 **버튼을 눌러**, 서버로 나가는 몸통을 읽어요.
 */
"use strict";
const fs = require("fs");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const PAGE = "/workspace/grow-games/beta/stats/index.html";
const SRC = fs.readFileSync(PAGE, "utf8");

const rec = (id, name, score, seasons) => ({ id, name, score, seasons, at: 1792000000000 });
const HOF = [
  { game: "soccer", data: rec("w1", "밀란 노바크", 1503564, 3) },
  { game: "soccer", data: rec("w2", "띠띠앵2세", 16315, 15) },
  { game: "soccer", data: rec("w3", "카이 노바크", 11037, 15) },
  { game: "soccer", data: rec("w4", "윤민준", 12097, 15) },
  { game: "rookie", data: rec("r1", "야구왕", 99999, 10) },      // 다른 게임 — 축구 탭에 안 섞여야 해요
];
const HIDDEN = [{ id: "soccer-w9", game: "soccer", player: "가린사람", score: 7777, data: rec("w9", "가린사람", 7777, 5) }];

const html = SRC.replace("</head>", `<script>
  localStorage.setItem("grow-stats-auth", "${(SRC.match(/const PW_HASH = "([^"]+)"/) || [])[1]}");
  window.__sent = [];
  window.__confirm = true;
  window.fetch = (url, opt) => {
    const u = String(url);
    if (opt && opt.method === "POST") {
      window.__sent.push({ url: u, body: JSON.parse(opt.body) });
      const list = /hof_hidden_list/.test(u) ? ${JSON.stringify(HIDDEN)} : null;
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(list) });
    }
    const body = /\\/hof\\?/.test(u) ? ${JSON.stringify(HOF)}
      : /stats_summary/.test(u) ? [{ game: "soccer", event: "visit", players: 9, total: 9 }, { game: "rookie", event: "visit", players: 9, total: 9 }] : [];
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  };
  window.confirm = () => window.__confirm;
  window.scrollTo = () => {};
</script></head>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/beta/stats/#soccer" });
const w = dom.window;
const $ = (id) => w.document.getElementById(id);
const wait = async (cond, n = 60) => { for (let i = 0; i < n && !cond(); i++) await new Promise((r) => setTimeout(r, 10)); };
const names = () => [...w.document.querySelectorAll(".hf-hide")].map((b) => b.closest("tr").firstElementChild.firstChild.textContent);
/* 버튼은 **화면에 보이는 이름으로** 찾아요. data-id로 찾으면 id를 잘못 만드는 변이에서
 * 검사가 단언 전에 null.click()으로 죽어 버려, 무엇이 틀렸는지 안 보였어요. */
const btnOf = (name, cls = ".hf-hide") => [...w.document.querySelectorAll(cls)].find((b) => b.closest("tr").firstElementChild.firstChild.textContent === name);

(async () => {
  await wait(() => $("hf-pw"));
  check(!!$("hf-pw"), "⚽ 더 윙어 탭에 기록 가리기 칸이 그려진다");
  if (!$("hf-pw")) { console.log("\n❌ 실패"); process.exit(1); }

  console.log("=== ① 그 게임 기록만 점수 순 ===");
  console.log(`   ${names().join(" · ")}`);
  check(JSON.stringify(names()) === JSON.stringify(["밀란 노바크", "띠띠앵2세", "윤민준", "카이 노바크"]),
    "축구 기록 넷이 점수 순이다");
  check(!names().includes("야구왕"), "다른 게임 기록이 안 섞인다");

  console.log("=== ② 이름 찾기 ===");
  $("hf-q").value = "노바크";
  $("hf-find").click();
  console.log(`   「노바크」 → ${names().join(" · ")}`);
  check(JSON.stringify(names()) === JSON.stringify(["밀란 노바크", "카이 노바크"]), "이름에 「노바크」가 든 둘만 남는다");
  check($("hf-q").value === "노바크", "찾은 뒤에도 찾기 칸에 글자가 남는다");

  console.log("=== ④ 비번 없음 · 취소 ===");
  w.__sent.length = 0;
  btnOf("밀란 노바크").click();
  await new Promise((r) => setTimeout(r, 30));
  check(w.__sent.length === 0, "비번이 없으면 아무것도 안 보낸다");
  $("hf-pw").value = "아무비번";
  w.__confirm = false;
  btnOf("밀란 노바크").click();
  await new Promise((r) => setTimeout(r, 30));
  check(w.__sent.length === 0, "확인창에서 취소하면 아무것도 안 보낸다");
  w.__confirm = true;

  console.log("=== ③ 가리기 ===");
  btnOf("밀란 노바크").click();
  await wait(() => w.__sent.some((x) => /hof_hidden_list/.test(x.url)));
  await new Promise((r) => setTimeout(r, 20));
  const hide = (w.__sent.find((x) => /rpc\/hof_hide/.test(x.url)) || {}).body;
  console.log(`   보낸 것 — ${JSON.stringify(hide)}`);
  check(!!hide && hide.p_id === "soccer-w1" && hide.p_hidden === true && hide.p_pw === "아무비번",
    "그 줄의 DB id(게임-id)로 hof_hide(가림)를 부른다");
  check(!names().includes("밀란 노바크"), `가린 기록이 목록에서 빠진다 (${names().join(" · ")})`);
  check(/가렸어요/.test($("hf-msg").textContent), `결과를 알려 준다 (${$("hf-msg").textContent})`);
  check($("hf-pw").value === "아무비번", "⑥ 다시 그려도 넣어 둔 비번이 남는다");

  console.log("=== ⑤ 가린 기록 · 되돌리기 ===");
  w.__sent.length = 0;
  $("hf-hidden").click();
  await wait(() => w.document.querySelector(".hf-show"));
  check(w.__sent.some((x) => /rpc\/hof_hidden_list/.test(x.url) && x.body.p_pw === "아무비번"), "가린 기록 보기가 비번과 함께 hof_hidden_list를 부른다");
  const shown = [...w.document.querySelectorAll(".hf-show")].map((b) => b.dataset.id);
  check(JSON.stringify(shown) === '["soccer-w9"]', `가린 기록이 되돌리기 버튼과 함께 보인다 (${shown})`);
  w.__sent.length = 0;
  $("hf-q").value = "";
  $("hf-find").click();
  btnOf("가린사람", ".hf-show").click();
  await wait(() => w.__sent.some((x) => /hof_hidden_list/.test(x.url)));
  await new Promise((r) => setTimeout(r, 20));
  const show = (w.__sent.find((x) => /rpc\/hof_hide/.test(x.url)) || {}).body;
  check(!!show && show.p_id === "soccer-w9" && show.p_hidden === false, `되돌리기는 hof_hide(가림 해제)를 부른다 (${JSON.stringify(show)})`);
  check(names().includes("가린사람"), `되돌린 기록이 목록에 돌아온다 (${names().join(" · ")})`);

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  w.close();
  process.exit(fail ? 1 : 0);
})();
