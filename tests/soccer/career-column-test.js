/* ⚽ 결산 표 — 소속 칼럼 (task-1) + 옛 기록 소속 역산 (task-3)
 *
 * 결산 화면에 이적 이력이 텍스트 한 줄로 나열되면, 이적을 몇 번만 해도 세 줄로
 * 접히면서 화면을 잡아먹는다(실기기 스크린샷으로 확인된 문제). ⚾ 더 드래프트가
 * 같은 문제를 이미 풀었다 — 소속을 표의 칼럼으로 옮기고 칸이 좁으니 이름을 줄인다
 * (beta/rookie/game.js의 shortTeam). 이 파일은 같은 방식이 ⚽ 더 윙어에도 됐는지 본다.
 *
 * club·league는 시즌 결산 시점(finishYear)에 그 시즌 값을 그냥 적는다. 실제로 시즌을
 * 굴려서(버튼 클릭) 그 값이 찍히는 걸 ①④⑤에서 확인한다.
 *
 * 그런데 이 필드는 나중에 생겼다. 진행 중인 커리어는 그 전에 쌓인 시즌 기록에 club이
 * 없어서 실기기에서 소속 칸이 여섯 줄 전부 '-'로 나왔다. 그래서 **그릴 때** S.moves에서
 * 역산해 메운다(세이브는 고치지 않는다 — 클라우드 동기화와 부딪힌다). ⑧~⑫가 그 검사다.
 * ⑧은 확인 페이지(beta/_check.html)가 심는 soccer-report 세이브 그대로를 쓴다 —
 * 실기기에서 문제를 본 그 데이터다.
 *
 * 확인은 전부 게임 입구를 통해서 한다 (tests/soccer/promote-test.js와 같은 부트스트랩).
 * 렌더 함수를 직접 부르지 않고 실제 버튼 클릭 → DOM에서 읽는다.
 *
 * eval("const x = …")은 쓰지 않는다 — 선언이 eval 자기 스코프에 갇힌다. 픽스처를 읽을
 * 때는 new Function + return을 쓴다. */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = "/workspace/grow-games";
const DIR = path.join(ROOT, "beta/soccer");
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
/* seed는 게임 스크립트보다 **먼저** 심어야 한다 — game.js가 로드 때 슬롯을 읽는다.
 * env.js 바로 뒤가 그 자리다(URL이 /beta/면 'beta::' 접두사가 붙어야 하니까). */
function boot(seed) {
  let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(DIR, src);
      if (!fs.existsSync(p)) return "";
      return `<script>\n${fs.readFileSync(p, "utf8")}\n</script>`
        + (src.endsWith("env.js") ? "<!--SEED-->" : "");
    });
  html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
  html = html.replace("<!--SEED-->", seed
    ? `<script>(function(){var d=${JSON.stringify(seed).replace(/<\/script/gi, "<\\/script")};`
      + `for(var k in d)localStorage.setItem(k,d[k]);})();</script>`
    : "");
  html = html.replace("</body>", `<script>
    window.__get = (n) => eval(n);
    window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
  </script></body>`);
  const d = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
  const ww = d.window;
  ww.Ads = { display() {}, init() {} };
  ww.Stats = { log() {} };
  ww.alert = () => {};
  return d;
}

const dom = boot(null);
const w = dom.window;
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const get = w.__get, set = w.__set;

const Career = w.WingerCareer;
check(!!Career, "WingerCareer 모듈이 페이지에서 로드된다");
if (!Career || !Career._t || typeof Career._t.state !== "function") { console.log("\n❌ 실패"); process.exit(1); }
const T = Career._t;
const LEAGUES = T.LEAGUES;
/* 리그 약칭은 소스에서 읽는다. 여기 옮겨 적으면 리그 이름이 바뀌어도 안 들킨다 —
 * 실제로 K리그3 → 🇰🇷 한국 3부로 바뀌며 "3부"가 "한3"이 됐다. */
const SHORT = (id) => (LEAGUES.find((l) => l.id === id) || {}).short;
const CLUBS = T.CLUBS;

// ---------- 시즌을 실제 버튼 클릭만으로 소화 (promote-test.js와 같은 헬퍼) ----------
const restBtn = () => Array.from(w.document.querySelectorAll("#pro-actions .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);
function playSeason() {
  let g = 0;
  while (g++ < 800) {
    const id = active();
    if (id === "screen-career") return true;
    if (id === "screen-stage") {
      // 🏆 컵 무승부 → 승부차기. 무승부가 흔해진 뒤로 여기 자주 걸려요.
      const pkBtn = w.document.querySelector("#pk-box button");
      if (pkBtn) { pkBtn.click(); continue; }
      const n = $("btn-stage-next");
      if (!n || n.hidden || n.disabled) return false;
      n.click(); continue;
    }
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

// ---------- ⑦ 결산 표 칼럼 압축 — 폭이 좁아 헤더가 세로로 쪼개지는 원인을 없앤다 (task-2) ----------
// 실기기 스크린샷에서 '도움'이 '도'/'움'으로, '수비'가 '수'/'비'로 갈라졌다. jsdom은 CSS
// 줄바꿈을 못 보므로, 줄바꿈의 '원인'인 칼럼 수·헤더 이모지·헤더 길이를 잰다.
console.log("=== ⑦ 결산 표 칼럼이 5개 이하 · 헤더에 이모지 없음 · 헤더 3자 이하 · 숫자 보존 ===");
guard("⑦ 칼럼 압축", () => {
  const { heads, rows } = reportTable();
  check(heads.length <= 5, `결산 표 칼럼이 5개 이하다 (${heads.length}개: ${heads.join(" · ")})`);
  for (const h of heads) {
    check(!/\p{Extended_Pictographic}/u.test(h), `헤더 '${h}'에 이모지가 없다`);
    check(h.length <= 3, `헤더 '${h}'가 3자 이하다 (${h.length}자)`);
  }

  // 골·도움·수비를 한 칸에 합쳐도 숫자가 전부 남아 있는지, 실제로 쌓인 S.career.years와
  // 대조한다. 지금까지(①④⑤)로 3시즌치 실제 기록이 쌓여 있다.
  const St = T.state();
  const years = St.career.years.slice(-8); // reportTable()도 최근 8개만 그리니 슬라이스를 맞춘다
  check(rows.length === years.length, `표 행 수(${rows.length})가 최근 기록 수(${years.length})와 같다`);
  rows.forEach((row, i) => {
    const y = years[i];
    /* ⚠️ 행 전체가 아니라 **성적 칸만** 읽는다. 소속 칸의 리그 약칭이 숫자로 끝나면
     * (🇰🇷 한국 3부 → "한3") textContent가 이어 붙어 "한3" + "33골"이 "333골"로 읽힌다.
     * 화면은 멀쩡하다 — .yr-lg가 display:block이라 줄이 갈린다. 읽는 쪽 문제다. */
    const text = (row.children[2] || row).textContent;
    const m = text.match(/(-|\d+)골\s*(-|\d+)도움\s*(-|\d+)수비/);
    check(!!m, `${i}번째 행에서 골·도움·수비 숫자를 표에서 읽을 수 있다 (${text.trim()})`);
    if (m) {
      const [, g, a, d] = m;
      const exp = (v) => (v != null ? String(v) : "-");
      check(g === exp(y.goals), `${i}번째 행 골 값이 그대로 보인다 (${g} vs ${y.goals})`);
      check(a === exp(y.assists), `${i}번째 행 도움 값이 그대로 보인다 (${a} vs ${y.assists})`);
      check(d === exp(y.defense), `${i}번째 행 수비 값이 그대로 보인다 (${d} vs ${y.defense})`);
    }
  });

  const idx = heads.indexOf("소속");
  check(idx !== -1, "소속 칼럼이 압축 뒤에도 남아 있다");
});

// ---------- ⑥ 옛 항목이 섞여도 던지지 않고, 빈 소속은 S.moves에서 메워진다 ----------
console.log("=== ⑥ club 없는 옛 항목이 섞인 세이브 ===");
guard("⑥ 옛 항목 섞임", () => {
  const base = JSON.parse(JSON.stringify(T.state()));
  base.camp = 0; base.activity = null; base.pendingShow = false;
  // club·league는 나중에 생긴 필드다 — 그 전에 쌓인 항목에는 아예 없다.
  const oldYear = { y: 1, hype: 5, wins: 1, sales: 0, dFan: 0, awards: [], goals: 3, assists: 1, defense: 2, apps: 30 };
  const newYear = {
    y: 2, hype: 6, wins: 2, sales: 0, dFan: 0, awards: [], goals: 4, assists: 2, defense: 3, apps: 32,
    club: base.group, league: base.league,
  };
  base.career.years = [oldYear, newYear];
  base.proYear = 2;
  // ⑤에서 2시즌 끝 오프시즌에 실제로 이적했으니 이 이력이 1시즌 소속의 근거다.
  check((base.moves || []).length > 0, `이 세이브에는 이적 이력이 있다 (${(base.moves || []).length}건)`);
  const firstFrom = base.moves[0].from;

  let threw = null;
  try {
    set("S", base);
    Career.showActivity();
  } catch (e) { threw = e; }
  check(!threw, `옛 항목이 섞여도 결산 렌더가 던지지 않는다${threw ? ` (${threw.message})` : ""}`);
  check(active() === "screen-career", "결산 화면이 뜬다");

  const { idx, rows } = reportTable();
  check(rows.length === 2, "두 시즌 행이 그려진다");
  check(rows[0].children[idx].textContent.trim() !== "-",
    "club이 없는 옛 항목도 '-'가 아니다 — S.moves에서 역산해 메운다");
  check(rows[0].children[idx].getAttribute("title") === firstFrom,
    `1시즌 소속이 첫 이적의 출발 클럽이다 (${firstFrom})`);
  const newCell = rows[1].children[idx];
  check(newCell.getAttribute("title") === base.group,
    `club이 적힌 항목은 적힌 값을 쓴다 (${base.group})`);

  // 세이브를 고치지 않는다 — 역산은 그릴 때만 쓰는 사본에서 벌어진다.
  const after = T.state().career.years;
  check(after[0].club == null, "그린 뒤에도 세이브의 옛 항목에는 club이 안 생긴다 (마이그레이션 아님)");
});

// ================= 실제 세이브로 보는 역산 (task-3) =================
/* 확인 페이지가 심는 세이브 그대로를 쓴다. 이 세이브가 실기기에서 소속 칸 여섯 줄을
 * 전부 '-'로 만든 그 데이터다 — 손으로 만든 세이브로는 그 사고를 다시 못 잡는다. */
const FIX_SRC = fs.readFileSync(path.join(ROOT, "beta/_fixtures.js"), "utf8");
const FIXTURES = new Function(`const window = {}; ${FIX_SRC} return window.CHECK_FIXTURES;`)();
const REPORT = (FIXTURES.items || []).find((x) => x.id === "soccer-report");
check(!!REPORT, "beta/_fixtures.js에 soccer-report 시나리오가 있다");

const SLOT_KEY = "winger-save-v1-slots";
// 세이브 한 덩이(슬롯 하나)를 꺼내서 고친 뒤 다시 슬롯 묶음으로 싸는 헬퍼.
/* ⚠️ **club을 직접 지워서** 옛 세이브를 만든다.
 * 이 파일이 지키는 건 "club이 없는 세이브에서 소속을 이적 이력으로 역산하는가"다.
 * 예전에는 픽스처가 club을 기록하기 전 버전이라 그냥 쓸 수 있었는데, 2.26.0부터
 * 결산에서 club을 적기 시작했다. 픽스처를 다시 뽑는 순간 club이 채워진 세이브가
 * 되어 역산 경로를 아예 안 타게 된다 — 검사가 조용히 다른 걸 보게 되는 자리다.
 * 그러니 픽스처가 무엇을 담고 있든 여기서 지우고 시작한다. */
function reportSave(mutate) {
  const slots = JSON.parse(REPORT.keys[SLOT_KEY]);
  const id = Object.keys(slots)[0];
  for (const y of (slots[id].career || {}).years || []) { delete y.club; delete y.league; }
  if (mutate) mutate(slots[id]);
  return { [SLOT_KEY]: JSON.stringify(slots) };
}
// 타이틀의 '이어하기' → 슬롯 카드. 사용자가 폰에서 하는 동작 그대로다.
function resumeInto(seed) {
  const d = boot(seed);
  const ww = d.window;
  const cont = ww.document.getElementById("btn-continue");
  if (!cont || cont.classList.contains("hidden")) throw new Error("'이어하기'가 안 보인다 (세이브가 안 심겼다)");
  cont.click();
  const go = ww.document.querySelector(".slot-modal .slot-go");
  if (!go) throw new Error("슬롯 목록에 선수 카드가 없다");
  go.click();
  return d;
}
// 결산 표의 소속 칼럼을 행마다 { full, text, moved, lg }로 읽는다.
function clubColumn(ww) {
  const heads = Array.from(ww.document.querySelectorAll("#career-card table thead th")).map((th) => th.textContent.trim());
  const idx = heads.indexOf("소속");
  const rows = Array.from(ww.document.querySelectorAll("#career-card table tbody tr"));
  return rows.map((r) => {
    const c = r.children[idx];
    const tag = c.querySelector(".yr-lg");
    // 순위 칸(.yr-rank)은 나중에 붙은 별개 줄이라 이름 검사에서 떼어 낸다
    const rankTag = c.querySelector(".yr-rank");
    return {
      full: c.getAttribute("title"),
      rank: rankTag ? rankTag.textContent.trim() : "",
      text: c.textContent.trim(),
      moved: c.classList.contains("moved"),
      lg: tag ? tag.textContent.trim() : null,
    };
  });
}

// ---------- ⑧ 실제 세이브 — 6시즌 소속이 이적 이력과 정확히 맞는가 ----------
/* 세이브의 이적 이력은 픽스처에서 읽는다 — 클럽 이름을 여기 적어 두면 시나리오를
 * 다시 뽑을 때마다 깨진다(실제로 리그 개편 뒤 전부 어긋났다). NOW는 현재 소속.
 * 이적은 **시즌이 끝난 오프시즌**에 일어나니 시즌 y의 소속은 y보다 앞선 마지막 이적의
 * 도착 클럽이다. 이 표를 그대로 못 박는다 — 한 칸이라도 밀리면 실패다. */
console.log("=== ⑧ 확인 페이지 세이브의 6시즌 소속 표 ===");
/* 기대값도 픽스처의 이적 이력에서 세운다 — 손으로 적어 두면 시나리오를 다시 뽑을
 * 때마다 깨진다. 규칙은 세 줄이다: **시즌 y의 소속은 y보다 앞선 마지막 이적의
 * 도착 클럽**, 그런 이적이 없으면 첫 이적의 출발 클럽. 리그가 바뀐 시즌만 태그가 붙는다.
 * (소스에서 뽑아 오면 자기 자신과 비교하는 꼴이 되므로 여기서 독립적으로 세운다) */
const NOW = (() => {
  const slots = JSON.parse(REPORT.keys[SLOT_KEY]);
  return slots[Object.keys(slots)[0]].group;
})();
const EXPECT = (() => {
  const slots = JSON.parse(REPORT.keys[SLOT_KEY]);
  const st = slots[Object.keys(slots)[0]];
  const mv = (st.moves || []).slice().sort((a, b) => a.y - b.y);
  const firstClub = mv.length ? mv[0].from : st.group;
  const lgOf = (name) => {
    const m = mv.find((x) => x.to === name);
    return m ? m.toLg : st.league;
  };
  let prevLg = mv.length ? mv[0].fromLg : st.league;
  return (st.career.years || []).map((yr) => {
    const past = mv.filter((x) => x.y < yr.y);
    const club = past.length ? past[past.length - 1].to : firstClub;
    const lgId = past.length ? lgOf(club) : prevLg;
    const moved = past.length > 0;
    const tag = lgId !== prevLg ? SHORT(lgId) : null;
    prevLg = lgId;
    return { y: yr.y, club, moved, lg: tag };
  });
})();
let reportDom = null;
guard("⑧ 실제 세이브 6시즌", () => {
  reportDom = resumeInto(reportSave(null));
  const ww = reportDom.window;
  check((ww.document.querySelector(".screen.active") || {}).id === "screen-career",
    `심은 세이브로 들어가면 결산 화면이 뜬다 (${(ww.document.querySelector(".screen.active") || {}).id})`);

  const St = ww.WingerCareer._t.state();
  check(St.career.years.length === 6, `6시즌치 기록이다 (${St.career.years.length}시즌)`);
  check(St.career.years.every((x) => x.club == null),
    "세이브의 시즌 기록에는 club이 하나도 없다 — 역산이 필요한 상태다");
  check(St.group === NOW, `현재 소속이 세이브의 소속과 같다 (${St.group} · 기대 ${NOW})`);
  check((St.moves || []).length === 4, `이적 이력이 4건이다 (${(St.moves || []).length}건)`);

  const col = clubColumn(ww);
  check(col.length === 6, `여섯 줄이 그려진다 (${col.length}줄)`);
  check(col.every((c) => c.text !== "-"), `'-'가 한 줄도 없다 (${col.map((c) => c.text).join(" · ")})`);
  EXPECT.forEach((e, i) => {
    const got = col[i] || {};
    check(got.full === e.club, `${e.y}시즌 소속이 ${e.club}다 (${got.full})`);
    const shortName = (got.text || "").replace(got.lg || "", "").replace(got.rank || "", "");
    check(!!shortName && e.club.startsWith(shortName),
      `${e.y}시즌 칸에 줄인 이름이 보인다 (${shortName})`);
  });
});

// ---------- ⑨ 역산으로 채운 행에서도 이적 강조와 리그 태그가 맞는가 ----------
console.log("=== ⑨ 역산 행의 .moved 강조 · 리그 태그 ===");
guard("⑨ 이적 표시", () => {
  if (!reportDom) throw new Error("⑧이 실패해서 화면이 없다");
  const col = clubColumn(reportDom.window);
  EXPECT.forEach((e, i) => {
    const got = col[i] || {};
    check(got.moved === e.moved,
      `${e.y}시즌 이적 강조(.moved)가 ${e.moved ? "있다" : "없다"} (${got.moved})`);
    check((got.lg || null) === e.lg,
      `${e.y}시즌 리그 태그가 ${e.lg || "없다"} (${got.lg || "없음"})`);
  });
  // 리그를 옮긴 3시즌만 태그가 붙는다 — 같은 리그 안 이적에 태그가 붙으면 잡음이다.
  check(col.filter((c) => c.lg).length === 1, `리그 태그는 딱 한 줄에만 있다 (${col.filter((c) => c.lg).length}줄)`);
});

// ---------- ⑩ 이적을 한 번도 안 한 커리어 — 모든 시즌이 현재 소속 ----------
/* S.moves 키가 아예 없는 세이브와 빈 배열인 세이브 둘 다 본다. 둘 중 하나만 막으면
 * 나머지 하나에서 던지거나 '-'가 남는다. */
console.log("=== ⑩ 이적 없는 커리어 (moves 없음 · 빈 배열) ===");
for (const [label, mutate] of [
  ["moves 키가 없는 세이브", (s) => { delete s.moves; }],
  ["moves가 빈 배열인 세이브", (s) => { s.moves = []; }],
]) {
  guard(`⑩ ${label}`, () => {
    const d = resumeInto(reportSave(mutate));
    try {
      const ww = d.window;
      check((ww.document.querySelector(".screen.active") || {}).id === "screen-career",
        `${label} — 던지지 않고 결산 화면이 뜬다`);
      const col = clubColumn(ww);
      check(col.length === 6, `${label} — 여섯 줄이 그려진다 (${col.length}줄)`);
      check(col.every((c) => c.full === NOW),
        `${label} — 모든 시즌이 현재 소속(${NOW})이다 (${col.map((c) => c.full).join(" · ")})`);
      check(col.every((c) => !c.moved), `${label} — 이적이 없으니 강조도 없다`);
    } finally { d.window.close(); }
  });
}

// ---------- ⑪ club이 적힌 시즌은 역산하지 않는다 ----------
/* 기록된 값이 정본이다. 일부러 이적 이력과 어긋난 값을 심어서, 역산이 그 값을
 * 덮어쓰지 않는지 본다. 덮어쓰면 앞으로 쌓일 정확한 기록이 추측으로 대체된다. */
console.log("=== ⑪ 적힌 club은 역산이 덮지 않는다 ===");
guard("⑪ 기록 우선", () => {
  const WRONG = "어긋난클럽";
  const d = resumeInto(reportSave((s) => {
    s.career.years[2].club = WRONG;      // 역산이라면 EXPECT[2].club이 나올 자리
    s.career.years[2].league = 3;        // 리그도 어긋나게 (id 3 = 사다리 꼭대기)
  }));
  try {
    const ww = d.window;
    const col = clubColumn(ww);
    check(col[2].full === WRONG, `club이 적힌 3시즌은 적힌 값(${WRONG})을 쓴다 (${col[2].full})`);
    check(col[2].text.startsWith("어긋난"), `줄인 이름도 적힌 값에서 나온다 (${col[2].text})`);
    check(col[2].lg === SHORT(3), `적힌 league(3)로 리그 태그가 붙는다 (${col[2].lg} · 기대 ${SHORT(3)})`);
    // 나머지 줄은 그대로 역산된다 — 한 칸이 적혀 있어도 다른 칸은 계속 메워야 한다.
    check(col[0].full === EXPECT[0].club && col[1].full === EXPECT[1].club,
      `앞 두 시즌은 여전히 역산된다 (${col[0].full} · ${col[1].full})`);
    check(col[3].full === EXPECT[3].club && col[5].full === EXPECT[5].club,
      `뒤 시즌도 여전히 역산된다 (${col[3].full} · ${col[5].full})`);
  } finally { d.window.close(); }
});

// ---------- ⑫ '-'가 남는 경우는 딱 하나 — 근거가 아무것도 없는 깨진 세이브 ----------
/* 역산의 마지막 근거는 '지금 소속'(S.group)이다. 이적 이력도 없고 group도 없으면
 * 그 시즌에 어디서 뛰었는지 알 방법이 없다 — 그때만 '-'가 남고, 던지지는 않는다.
 * 정상적인 세이브에서는 절대 안 나오는 상태다. */
console.log("=== ⑫ 근거가 없는 깨진 세이브만 '-'로 남는다 ===");
guard("⑫ 깨진 세이브", () => {
  const d = resumeInto(reportSave((s) => { delete s.moves; delete s.group; }));
  try {
    const ww = d.window;
    check((ww.document.querySelector(".screen.active") || {}).id === "screen-career",
      "이적 이력도 소속도 없는 세이브에서도 던지지 않고 결산이 뜬다");
    const col = clubColumn(ww);
    check(col.length === 6, `여섯 줄이 그려진다 (${col.length}줄)`);
    check(col.every((c) => c.text === "-"), `메울 근거가 없어 전부 '-'다 (${col.map((c) => c.text).join(" · ")})`);
    check(col.every((c) => !c.moved), "'-'인 칸에는 이적 강조가 붙지 않는다");
  } finally { d.window.close(); }
});

if (reportDom) reportDom.window.close();
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 전부 통과");
w.close();
process.exit(fail ? 1 : 0);
