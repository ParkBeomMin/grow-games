/* 🏛️ 명예의 전당 — 달 탭과 헌액 카드.
 *
 * 요청: "명전은 기존 데이터들은 하나로 묶어서 과거로 두고 지금부터 쌓이는 걸
 * 월별로 분리해도 좋을듯" · "명전에서 선수 클릭 시 그 선수 기록을 레이어로"
 *
 * 옛 항목에도 시각은 이미 있었어요 — id가 `"w" + Date.now()`였습니다.
 * 그래서 "옛 것은 전부 한 덩어리"로 밀지 않고 id에서 꺼내 제 달로 보냅니다.
 * 못 읽는 항목만 🕰️ 그 이전으로 모여요.
 *
 * 지키는 것:
 *   ① 달이 여럿이면 달 탭이 생기고, 달 수와 사람 수가 맞는다
 *   ② 탭을 누르면 그 달 사람만 보인다
 *   ③ 달 안의 번호는 1부터 다시 매겨진다 (전체 순위를 그대로 베끼지 않는다)
 *   ④ `at`이 없는 옛 항목도 id에서 시각을 꺼내 제 달로 간다
 *   ⑤ 시각을 못 읽는 항목만 🕰️ 그 이전으로 간다
 *   ⑥ 카드를 누르면 헌액 카드가 열리고 커리어가 적힌다
 *   ⑦ 없는 기록은 줄 자체를 안 그린다 (0과 "없음"이 같은 얼굴이 되면 안 돼요)
 *   ⑧ 달이 하나뿐이면 탭 줄이 아예 안 뜬다 — 탭 수가 데이터에서 나온다는 증거
 *
 * 실제 화면(#hof-list)을 Career.showHof()로 그려서 DOM을 읽어요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");

const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  window.alert = () => {};
  localStorage.setItem("grow-auto-mini", "1");
`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
w.alert = () => {};
const Career = w.WingerCareer;
check(!!Career && typeof Career.showHof === "function", "명예의 전당 화면이 페이지에서 로드된다");
if (!Career) { console.log("\n❌ 실패"); process.exit(1); }

/* 달 하나를 고정 시각으로 만들어요.
 *   · 달 **한가운데**(5일 03:00 UTC)를 쓰는 이유 — 표시가 로컬 시각 기준이라
 *     월말 자정을 쓰면 시간대에 따라 옆 달로 새요.
 *   · **오늘보다 앞선 날**만 씁니다 — 미래 시각은 읽는 쪽이 거절해요(잘못 적힌 값이니까요).
 *     처음에 15일로 뒀다가 8월 항목이 통째로 🕰️ 그 이전으로 갔습니다. */
const at = (y, m) => Date.UTC(y, m - 1, 5, 3, 0, 0);

/* 명예의 전당 항목 한 줄. score를 밖에서 정해 순위를 마음대로 세워요. */
function entry(o) {
  return {
    id: o.id, game: "soccer", name: o.name, pos: "fw", team: "한강 FC",
    seasons: 10, wins: 5, daesang: 1, bonsang: 1, rookie: 0,
    goals: 100, assists: 40, apps: 300, finalOvr: 90, trans: 0, gen: 1,
    score: o.score, sv: 2, teamSeasons: 10, trophies: 2,
    leagues: "🇰🇷 K1", peakLg: "🇰🇷 K리그1", country: "kr",
    title: "🌟 월드클래스", bestTitle: "⭐ 슈퍼스타", grade: "🎽 팀의 기둥",
    ...(o.at != null ? { at: o.at } : {}),
    ...(o.ballon != null ? { ballon: o.ballon } : {}),
  };
}

const seed = (list) => w.localStorage.setItem("grow-hof-v1", JSON.stringify(list));
const box = () => w.document.getElementById("hof-list");
const tabEls = () => Array.from(box().querySelectorAll(".hof-tab"));
const cardEls = () => Array.from(box().querySelectorAll(".hof-card"));
const cardNames = () => cardEls().map((c) => c.querySelector(".hof-name").textContent.replace(/\s+/g, " ").trim());

(async () => {
  // ---------- 세 달 + 시각을 못 읽는 항목 ----------
  /* ⓐ 8월: at을 가진 새 항목 둘
   * ⓑ 7월: at이 없고 **id에만 시각이 있는** 옛 항목 하나  ← ④가 여기예요
   * ⓒ 5월: 옛 항목 하나
   * ⓓ 시각을 못 읽는 항목 하나 (id가 시각이 아닌 다른 판에서 온 것)  ← ⑤ */
  seed([
    entry({ id: "w" + at(2026, 8), name: "팔월가", score: 500, at: at(2026, 8), ballon: 3 }),
    entry({ id: "w" + (at(2026, 8) + 1000), name: "팔월나", score: 900, at: at(2026, 8) + 1000 }),
    entry({ id: "w" + at(2026, 7), name: "칠월다", score: 700 }),
    entry({ id: "w" + at(2026, 5), name: "오월라", score: 300 }),
    entry({ id: "old-legacy-x", name: "그이전마", score: 800 }),
  ]);

  console.log("=== ① 달 탭 ===");
  await Career.showHof();
  const tabs = tabEls().map((t) => t.textContent.replace(/\s+/g, " ").trim());
  console.log(`   탭 — ${tabs.join(" | ")}`);
  check(tabs.length === 5, `전체 + 달 3개 + 🕰️ 그 이전 = 5칸이다 (${tabs.length}칸)`);
  check(/전체 5/.test(tabs[0]), `전체 탭에 사람 수가 붙는다 (${tabs[0]})`);
  check(tabs.some((t) => /26\.08 2/.test(t)), "8월 탭에 2명이 잡힌다");
  check(tabs.some((t) => /26\.07 1/.test(t)), "7월 탭에 1명이 잡힌다 — ④ at 없이 id에서 꺼낸 항목이에요");
  check(tabs.some((t) => /26\.05 1/.test(t)), "5월 탭에 1명이 잡힌다");
  check(tabs.some((t) => /🕰️ 그 이전 1/.test(t)), "⑤ 시각을 못 읽는 항목만 🕰️ 그 이전으로 간다");
  // 달은 최신이 앞이에요 — 명예의 전당은 "요즘 누가 들어왔나"를 먼저 봅니다
  const order = tabs.slice(1, 4).map((t) => t.split(" ")[0]);
  check(order.join(",") === "26.08,26.07,26.05", `달은 최신이 앞이다 (${order.join(" → ")})`);

  console.log("=== ①② 전체 탭은 점수 순 ===");
  check(cardNames().length === 5, `전체 탭에 5명이 보인다 (${cardNames().length}명)`);
  check(/1\. 팔월나/.test(cardNames()[0]), `점수가 가장 높은 사람이 1위다 (${cardNames()[0]})`);

  console.log("=== ②③ 달 탭을 누르면 ===");
  tabEls().find((t) => t.dataset.k === "2026-08").click();
  const aug = cardNames();
  console.log(`   8월 — ${aug.join(" · ")}`);
  check(aug.length === 2, `8월 사람만 보인다 (${aug.length}명)`);
  check(aug.every((n) => n.includes("팔월")), "8월 아닌 사람이 섞이지 않는다");
  check(/^1\. 팔월나/.test(aug[0]) && /^2\. 팔월가/.test(aug[1]),
    `③ 달 안에서 번호가 1부터 다시 매겨진다 (${aug.join(" / ")})`);

  tabEls().find((t) => t.dataset.k === "past").click();
  const past = cardNames();
  console.log(`   🕰️ 그 이전 — ${past.join(" · ")}`);
  check(past.length === 1 && past[0].includes("그이전마"),
    `🕰️ 그 이전에는 시각을 못 읽은 한 명만 있다 (${past.join(" / ")})`);

  // ---------- ⑥⑦ 헌액 카드 ----------
  console.log("=== ⑥ 카드를 누르면 헌액 카드가 열린다 ===");
  tabEls().find((t) => t.dataset.k === "2026-08").click();
  cardEls()[1].click();                       // 2위 = 팔월가 (발롱도르 3회)
  const modal = w.document.querySelector(".hof-overlay .hofd-modal");
  check(!!modal, "레이어가 열린다");
  const txt = modal ? modal.textContent.replace(/\s+/g, " ") : "";
  console.log(`   ${txt.slice(0, 200)}`);
  check(/팔월가/.test(txt), "누른 선수의 이름이 적힌다");
  check(/2026년 8월 2위/.test(txt), `고른 달과 그 안의 순위가 적힌다 (${(txt.match(/\S+ \d+위[^·]*/) || [""])[0].trim()})`);
  check(/⭐ 슈퍼스타/.test(txt), "커리어 최고 클래스가 적힌다");
  check(/100골/.test(txt) && /40도움/.test(txt), "통산 기록이 적힌다");
  check(/발롱도르 3/.test(txt), "🏅 발롱도르가 적힌다 — 여태 명예의 전당 항목에 없던 칸이에요");
  check(/2026년 8월 [456]일/.test(txt), `헌액 날짜가 적힌다 (${(txt.match(/2026년 \d+월 \d+일/) || [""])[0]})`);

  console.log("=== ⑦ 없는 기록은 줄 자체가 없다 ===");
  modal.querySelector("#btn-hofd-close").click();
  cardEls()[0].click();                       // 1위 = 팔월나 (ballon 칸 자체가 없음)
  const t2 = w.document.querySelector(".hof-overlay .hofd-modal").textContent.replace(/\s+/g, " ");
  check(!/발롱도르/.test(t2), "발롱도르가 없는 옛 항목에는 그 줄이 아예 없다 (0으로 적지 않아요)");
  check(!/월드컵/.test(t2), "월드컵 기록이 없으면 그 줄도 없다");
  w.document.querySelector(".hof-overlay").remove();

  // ---------- ⑧ 달이 하나면 탭이 없다 ----------
  console.log("=== ⑧ 변이 검증 — 탭 수가 데이터에서 나오는가 ===");
  seed([
    entry({ id: "w" + at(2026, 8), name: "혼자가", score: 500, at: at(2026, 8) }),
    entry({ id: "w" + (at(2026, 8) + 5), name: "혼자나", score: 400, at: at(2026, 8) + 5 }),
  ]);
  await Career.showHof();
  console.log(`   탭 ${tabEls().length}칸 · 카드 ${cardEls().length}장`);
  check(tabEls().length === 0, `달이 하나뿐이면 탭 줄이 안 뜬다 (${tabEls().length}칸) — 늘 5칸이면 위 ①은 아무것도 안 지켜요`);
  check(cardEls().length === 2, "그래도 사람은 그대로 보인다");

  // 소스 쪽 계약 — 달 키를 시각에서 뽑는가
  check(/hofMonth[\s\S]{0,400}getFullYear\(\)/.test(CAREER),
    "달 키를 항목의 시각에서 뽑는다 (고정 문자열이 아니에요)");
  check(/e\.at != null \? Number\(e\.at\) : Number\(String\(e\.id \|\| ""\)\.replace/.test(CAREER),
    "at이 없으면 id에서 시각을 꺼낸다 — 옛 기록을 통째로 버리지 않아요");

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  w.close();
  process.exit(fail ? 1 : 0);
})();
