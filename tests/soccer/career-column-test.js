/* ⚽ 결산 표 — 소속 칼럼 (task-1)
 *
 * 결산 화면에 이적 이력이 텍스트 한 줄로 나열되면, 이적을 몇 번만 해도 세 줄로
 * 접히면서 화면을 잡아먹는다(실기기 스크린샷으로 확인된 문제). ⚾ 더 드래프트가
 * 같은 문제를 이미 풀었다 — 소속을 표의 칼럼으로 옮기고 칸이 좁으니 이름을 줄인다
 * (beta/rookie/game.js의 shortTeam). 이 파일은 같은 방식이 ⚽ 더 윙어에도 됐는지 본다.
 *
 * S.moves에서 역산하지 않는다 — 시즌 결산 시점(finishYear)에 그 시즌의 club·league를
 * 그냥 적는 방식이라, 실제로 시즌을 굴려서(버튼 클릭) 그 값이 찍히는 걸 확인한다.
 * club·league는 2.22.0부터 생긴 새 필드라 옛 세이브의 항목에는 없다 — 마이그레이션하지
 * 않고 '-'로 그리는지도 확인한다.
 *
 * 확인은 전부 게임 입구를 통해서 한다 (tests/soccer/promote-test.js와 같은 부트스트랩).
 * 렌더 함수를 직접 부르지 않고 실제 버튼 클릭 → DOM에서 읽는다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

// ---------- 페이지 부트스트랩 (tests/soccer/promote-test.js와 같은 방식) ----------
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
html = html.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
w.alert = () => {};
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const get = w.__get, set = w.__set;

const Career = w.WingerCareer;
check(!!Career, "WingerCareer 모듈이 페이지에서 로드된다");
if (!Career || !Career._t || typeof Career._t.state !== "function") { console.log("\n❌ 실패"); process.exit(1); }
const T = Career._t;
const LEAGUES = T.LEAGUES;
const CLUBS = T.CLUBS;

// ---------- 시즌을 실제 버튼 클릭만으로 소화 (promote-test.js와 같은 헬퍼) ----------
const restBtn = () => Array.from(w.document.querySelectorAll("#pro-actions .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);
function playSeason() {
  let g = 0;
  while (g++ < 800) {
    const id = active();
    if (id === "screen-career") return true;
    if (id === "screen-stage") { const n = $("btn-stage-next"); if (!n) return false; n.click(); continue; }
    if (id !== "screen-pro") return false;
    const go = w.document.querySelector("#pro-actions .go-game");
    if (go) { go.click(); continue; }
    const r = restBtn();
    if (!r) return false;
    r.click();
  }
  return false;
}
const nextBtn = () => Array.from(w.document.querySelectorAll("#career-actions .btn"))
  .find((b) => b.textContent.includes("시즌 시작"));

// 결산 표에서 헤더 텍스트와 소속 칼럼 인덱스를 매번 새로 읽는다 — DOM이 진짜라는 증거다.
function reportTable() {
  const heads = Array.from(w.document.querySelectorAll("#career-card table thead th")).map((th) => th.textContent.trim());
  const idx = heads.indexOf("소속");
  const rows = Array.from(w.document.querySelectorAll("#career-card table tbody tr"));
  return { heads, idx, rows };
}

// ---------- ① 데뷔 → 1시즌 소화 — 실제로 도달 가능한가 ----------
console.log("=== ① 1시즌을 실제로 소화하면 그 시즌 소속이 기록되는가 ===");
guard("① 1시즌 결산", () => {
  set("S", get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  check(!!$("btn-go-debut"), "엔딩 화면에 '프로 커리어 시작' 버튼이 있다");
  $("btn-go-debut").click();
  check(active() === "screen-pro", `데뷔하면 프로 준비 화면으로 간다 (${active()})`);
  check(playSeason(), `1시즌을 버튼 클릭만으로 소화한다 (${active()})`);
  check(active() === "screen-career", "결산 화면에 도달한다");

  const St = T.state();
  check(St.career.years.length === 1, "1시즌치 기록이 쌓였다");
  const y0 = St.career.years[0];
  check(y0.club === St.group, `결산 시점의 소속(${St.group})이 그 시즌 기록에 그대로 찍힌다`);
  check(y0.league === St.league, `리그(${y0.league})도 함께 찍힌다`);
});

// ---------- ② 결산 표 헤더에 소속 칼럼이 있다 ----------
console.log("=== ② 결산 표에 소속 칼럼이 있는가 ===");
guard("② 소속 칼럼", () => {
  const { heads, idx, rows } = reportTable();
  check(idx !== -1, `표 헤더에 '소속'이 있다 (${heads.join(" · ")})`);
  check(rows.length === 1, "1시즌치 행이 그려진다");
  const cell = rows[0].children[idx];
  const name = cell.textContent.trim();
  check(!!name && name !== "-", `첫 행 소속 칸에 그 시즌 클럽 이름이 있다 (${name})`);
  check(cell.getAttribute("title") === T.state().group, "칸이 좁아 줄인 이름 대신 title 속성에 전체 클럽명이 있다");
});

// ---------- ③ '🔁 이적 이력' 텍스트 줄이 결산에서 사라졌다 ----------
console.log("=== ③ 이적 이력 텍스트 줄이 없는가 ===");
guard("③ 텍스트 줄 제거", () => {
  check(!w.document.querySelector("#career-card .move-log"), "결산 화면에 .move-log 요소가 없다");
  const txt = $("career-card").textContent;
  check(!txt.includes("이적 이력"), "결산 화면 텍스트에 '이적 이력' 문구가 없다 — 표로 옮겼으니 중복이다");
});

// ---------- ④ 이적을 안 한 시즌들은 소속 칸이 계속 같다 ----------
console.log("=== ④ 이적 없는 커리어 — 소속 칸이 일정한가 ===");
guard("④ 소속 칸 일관성", () => {
  const next = nextBtn();
  check(!!next, "'2시즌 시작' 버튼이 있다");
  next.click();
  check(playSeason(), "2시즌도 소화한다 (이적 없이)");
  check(active() === "screen-career", "2시즌 결산에 도달한다");

  const { idx, rows } = reportTable();
  check(rows.length === 2, "두 시즌치 행이 그려진다");
  const names = rows.map((r) => r.children[idx].getAttribute("title"));
  check(names[0] === names[1], `이적을 안 했으니 두 행의 소속이 같다 (${names.join(" · ")})`);
  check(!w.document.querySelector("#career-card table tbody .moved"), "이적이 없으니 강조(.moved) 표시도 없다");
});

// ---------- ⑤ 이적한 시즌은 소속이 바뀌고, 리그가 바뀌면 리그도 짧게 보인다 ----------
console.log("=== ⑤ 이적한 시즌 — 소속이 바뀌고 리그 태그가 붙는가 ===");
let transferredClub = null, transferredLeague = null, sourceLeague = null;
guard("⑤ 이적 반영", () => {
  const btn = $("btn-transfer");
  check(!!btn, "2년차 결산에 이적 버튼이 있다");
  sourceLeague = T.state().league;
  btn.click();
  check(active() === "screen-transfer", "이적 제안 화면으로 간다");

  const cards = Array.from(w.document.querySelectorAll("#screen-transfer .tf-card"));
  check(cards.length > 0, `이적 카드가 있다 (${cards.length}장)`);
  // 리그 태그 검사를 확실히 하려면 지금과 다른 리그의 카드를 고른다.
  // 아래 리그로 내려가는 이적은 항상 열려 있으니(career.js의 transferOffers 주석 참고)
  // 맨 아래 리그가 아닌 한 다른 리그 카드가 항상 있다.
  const otherLeagueCard = cards.find((c) => Number(c.dataset.league) !== sourceLeague);
  const card = otherLeagueCard || cards[0];
  transferredClub = card.dataset.club;
  transferredLeague = Number(card.dataset.league);
  card.click();
  check(active() === "screen-career", "카드를 고르면 결산 화면으로 돌아온다");
  check(T.state().group === transferredClub, `골라둔 클럽(${transferredClub})으로 실제로 옮겨졌다`);
  check(T.state().league === transferredLeague, "리그도 함께 옮겨졌다");

  const next = nextBtn();
  check(!!next, "이적 후에도 '3시즌 시작' 버튼이 있다");
  next.click();
  check(playSeason(), "3시즌도 소화한다");
  check(active() === "screen-career", "3시즌 결산에 도달한다");

  const St = T.state();
  const y2 = St.career.years[St.career.years.length - 1];
  check(y2.club === transferredClub, `3시즌 기록에 새 소속(${transferredClub})이 찍힌다`);

  const { idx, rows } = reportTable();
  check(rows.length === 3, "세 시즌치 행이 그려진다");
  const lastCell = rows[rows.length - 1].children[idx];
  check(lastCell.getAttribute("title") === transferredClub, `마지막 행의 소속 칸이 바뀐 클럽을 보여준다 (${transferredClub})`);
  check(lastCell.classList.contains("moved"), "이적한 시즌의 소속 칸에 강조(.moved)가 있다");
  if (transferredLeague !== sourceLeague) {
    const lg = LEAGUES.find((l) => l.id === transferredLeague);
    const tag = lastCell.querySelector(".yr-lg");
    check(!!tag, "리그가 바뀐 시즌은 소속 칸에서 리그도 알 수 있다");
    check(!!tag && tag.textContent.trim() === lg.short,
      `리그 표시가 짧다 (${lg.short} — 전체 이름 '${lg.name}'이 아니라 short 필드를 쓴다)`);
  } else {
    console.log("  (이번 실행에서는 같은 리그 안 이적이 뽑혀 리그 태그 검사는 건너뛴다)");
  }

  // ③에서는 이적이 없어 .move-log가 비어 조용히 통과할 수 있다(빈 이력이면 조건부로
  // 안 찍는 구현도 그 검사는 통과한다). 지금은 실제로 이적 이력(S.moves)이 쌓인 뒤라
  // "이력이 있어도 결산에는 안 찍는다"를 여기서 다시 확인해야 회귀를 놓치지 않는다.
  check((St2 => (St2.moves || []).length > 0)(T.state()), "이 시점엔 S.moves에 이적 이력이 실제로 쌓여 있다");
  check(!w.document.querySelector("#career-card .move-log"),
    "이적 이력이 쌓인 뒤에도 결산 화면에 .move-log 줄이 없다 (표로 옮겼으니 중복이다)");
  check(!$("career-card").textContent.includes("이적 이력"),
    "이적 이력이 쌓인 뒤에도 결산 텍스트에 '이적 이력' 문구가 없다");
});

// ---------- ⑥ 옛 세이브 방어 — club/league가 없는 항목도 던지지 않는다 ----------
console.log("=== ⑥ 옛 세이브(소속 없음) 방어 ===");
guard("⑥ 옛 세이브 방어", () => {
  const base = JSON.parse(JSON.stringify(T.state()));
  base.camp = 0; base.activity = null; base.pendingShow = false;
  // club·league는 이 태스크에서 생긴 새 필드다 — 옛 세이브의 항목에는 아예 없다.
  const oldYear = { y: 1, hype: 5, wins: 1, sales: 0, dFan: 0, awards: [], goals: 3, assists: 1, defense: 2, apps: 30 };
  const newYear = {
    y: 2, hype: 6, wins: 2, sales: 0, dFan: 0, awards: [], goals: 4, assists: 2, defense: 3, apps: 32,
    club: base.group, league: base.league,
  };
  base.career.years = [oldYear, newYear];
  base.proYear = 2;

  let threw = null;
  try {
    set("S", base);
    Career.showActivity();
  } catch (e) { threw = e; }
  check(!threw, `옛 항목이 섞여도 결산 렌더가 던지지 않는다${threw ? ` (${threw.message})` : ""}`);
  check(active() === "screen-career", "결산 화면이 뜬다");

  const { idx, rows } = reportTable();
  check(rows.length === 2, "두 시즌 행이 그려진다");
  check(rows[0].children[idx].textContent.trim() === "-", "club이 없는 옛 항목은 소속 칸이 '-'다");
  const newCell = rows[1].children[idx];
  check(newCell.textContent.trim() !== "-" && newCell.textContent.trim().length > 0,
    `club이 있는 새 항목은 소속 칸에 이름이 나온다 (${newCell.textContent.trim()})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 전부 통과");
w.close();
process.exit(fail ? 1 : 0);
