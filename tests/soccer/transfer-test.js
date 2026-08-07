/* 이적 화면 — 오프시즌에 제안을 받아 클럽과 리그를 옮기는 화면.
 *
 * 이 저장소는 "함수는 있는데 브라우저에선 못 가는" 기능을 여러 번 겪었다.
 * cloud.js 때는 스크립트 로드 순서가 틀려 8개 게임 전부에서 기능이 죽어 있었는데
 * 문자열 매칭 테스트는 47/47 초록이었다. 그래서 여기서는 renderTransfer 같은 함수를
 * 절대 직접 부르지 않는다. jsdom에 beta/soccer/index.html을 통째로 띄우고,
 * 엔딩 화면의 "프로 커리어 시작" 버튼 → 준비 화면의 훈련/경기 버튼 → 시즌 결산의
 * "이적 제안 보기" 버튼 → 제안 카드 순으로 **실제 클릭**해서 도달한다.
 * 확인도 전부 DOM에서 읽는다 (.screen.active · .tf-card · #pro-team 텍스트).
 *
 * 산식과 상수는 소스에서 뽑아 쓴다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
 * eval("const x = …")은 쓰지 않는다. 선언이 eval 자기 스코프에 갇혀 밖으로 안 샌다.
 * new Function으로 감싸 return 한다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
// 아직 없는 이름을 쓰는 검사는 던지면서 죽는다. 그 자체가 실패지, 테스트 중단은 아니다.
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

// ---------- 페이지 부트스트랩 (tests/idol/concept-test.js와 같은 방식) ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};   // jsdom 미구현 경고로 로그가 묻혀요
  localStorage.setItem("grow-auto-mini", "1");
`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
/* game.js의 S·newState는 `let`/`function` 선언이라 window에 안 붙는다.
 * 전역 어휘 스코프는 스크립트끼리 공유되니, 페이지 안에서 eval로 읽고 쓴다. */
html = html.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const get = w.__get, set = w.__set;

const Career = w.WingerCareer;
check(!!Career, "WingerCareer 모듈이 페이지에서 로드된다");
check(typeof Career?._t?.state === "function", "_t.state가 노출된다");
if (!Career || !Career._t || typeof Career._t.state !== "function") { console.log("\n❌ 실패"); process.exit(1); }
const T = Career._t;

// ---------- 소스에서 뽑는 상수 (값을 옮겨 적지 않는다) ----------
const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const consts = {
  minYear: grab(SRC, /const TRANSFER_MIN_YEAR = [^;]+;/),
  promote: grab(SRC, /const PROMOTE_HYPE = \{[^}]*\};/),
  perLeague: grab(SRC, /const OFFERS_PER_LEAGUE = [^;]+;/),
};
const missing = Object.entries(consts).filter(([, v]) => !v).map(([k]) => k);
check(missing.length === 0,
  missing.length ? `career.js에 자격 상수가 없어요: ${missing.join(", ")}` : "TRANSFER_MIN_YEAR · PROMOTE_HYPE · OFFERS_PER_LEAGUE가 career.js에 있다");

const TRANSFER_MIN_YEAR = consts.minYear ? new Function(`${consts.minYear} return TRANSFER_MIN_YEAR;`)() : 2;
const PROMOTE_HYPE = consts.promote ? new Function(`${consts.promote} return PROMOTE_HYPE;`)() : { 2: 5.5, 3: 6.5 };
const OFFERS_PER_LEAGUE = consts.perLeague ? new Function(`${consts.perLeague} return OFFERS_PER_LEAGUE;`)() : 2;

const LEAGUES = T.LEAGUES;
const CLUBS = T.CLUBS;
const leagueById = (id) => LEAGUES.find((l) => l.id === id);
/* 리그 이름은 LEAGUES에서 읽는다. 예전에는 검사 문구가 "1부·2부·3부"였는데,
 * 5단 사다리가 들어온 뒤로 그 말이 K리그1·유로파리그·챔피언스리그를 가리키게 됐다.
 * 하부 리그(K리그3·K리그2)가 생겨서 "2부"라고 읽으면 정반대 리그를 떠올리게 된다.
 * 이 파일이 재는 대상은 그대로고, 부르는 이름만 실제 이름으로 바꾼다. */
const NM = (id) => (leagueById(id) || {}).name || `id ${id}`;
/* 한국 1부(id 1) **바로 한 칸 위** 리그. 예전에는 그게 유로파(id 2)라 id를 그대로 썼는데,
 * 나라별 리그가 붙으면서 id 2(🏴 잉글랜드 2부)가 여섯 칸 위로 밀렸다. 능력치 70이
 * 못 여는 게 당연해진 자리라, "실제로 열리는 사다리"는 tier로 찾는다. */
const UP1 = LEAGUES.find((l) => l.tier === (leagueById(1) || {}).tier + 1) || leagueById(2);
/* 리그 목록에서 훑는다 — 하부 리그가 늘어도 여기를 다시 안 고치게.
 *
 * ⚠️ 승강이 일어나면 리그 명단이 세이브(S.world)로 옮겨 가요. 이적 카드는 그걸
 * 보고 그리니, 여기서도 **같은 곳**을 봐야 합니다. CLUBS만 보면 자리를 바꾼 팀의
 * 전력이 어긋나서, 화면은 맞는데 검사만 빨간불이 떠요. */
const clubByName = (n) => {
  const st = T.state ? T.state() : null;
  const world = (st && st.world) || {};
  for (const l of LEAGUES) {
    const hit = (world[l.id] || CLUBS[l.id] || []).find((c) => c.name === n);
    if (hit) return hit;
  }
  return LEAGUES.flatMap((l) => CLUBS[l.id] || []).find((c) => c.name === n);
};

// ---------- ① 데뷔 클럽은 기본 리그(K리그1) 하위 3개에서만 뽑힌다 ----------
/* 지금까지는 K리그1 6개 중 무작위라 전력 52~78로 갈렸다. 첫 시즌 팀 성적이 운이고
 * 신인이 우승 후보에 가는 것도 어색하다. 엔딩 화면의 "프로 커리어 시작" 버튼을
 * 실제로 200번 눌러서 확인한다 — enterCareer를 직접 부르지 않는다. */
const DEBUT_N = 200;
const debut = [];
guard("데뷔 클럽", () => {
  for (let i = 0; i < DEBUT_N; i++) {
    set("S", get('newState(MARKETS[0], "fw", "테스트")'));
    Career.onEnding(true, false);
    const btn = $("btn-go-debut");
    if (!btn) throw new Error("엔딩 화면에 '프로 커리어 시작' 버튼이 없어요");
    btn.click();
    const St = T.state();
    debut.push({ name: St.group, str: St.clubStr, league: St.league });
  }
  const strs = CLUBS[1].map((c) => c.str).slice().sort((a, b) => a - b);
  const median = strs.length % 2 ? strs[(strs.length - 1) / 2] : (strs[strs.length / 2 - 1] + strs[strs.length / 2]) / 2;
  const bottom3 = new Set(CLUBS[1].slice().sort((a, b) => a.str - b.str).slice(0, 3).map((c) => c.name));
  const over = debut.filter((d) => !(d.str <= median));
  const outside = debut.filter((d) => !bottom3.has(d.name));
  const names = [...new Set(debut.map((d) => d.name))];
  console.log(`=== ① 데뷔 클럽 ${DEBUT_N}회 (${NM(1)} 전력 ${strs.join("·")} · 중앙값 ${median}) ===`);
  console.log(`  뽑힌 클럽: ${names.map((n) => `${n}(${clubByName(n) ? clubByName(n).str : "?"})`).join(" · ")}`);
  check(over.length === 0, `${DEBUT_N}회 모두 데뷔 클럽 전력이 ${NM(1)} 중앙값(${median}) 이하다 (넘은 판 ${over.length}건)`);
  check(outside.length === 0, `${DEBUT_N}회 모두 ${NM(1)} 하위 3개 클럽(${[...bottom3].join("·")})에서 뽑힌다 (벗어난 판 ${outside.length}건)`);
  check(names.length >= 2, `한 클럽으로 고정되지 않는다 (${names.length}종)`);
  check(debut.every((d) => d.league === 1), `데뷔는 언제나 기본 리그(${NM(1)})다`);
});

// ---------- 시즌을 실제로 굴린다 (버튼 클릭만으로) ----------
const restBtn = () => Array.from(w.document.querySelectorAll("#pro-actions .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);
function playSeason() {
  let guard0 = 0;
  while (guard0++ < 600) {
    const id = active();
    if (id === "screen-career") return true;
    if (id === "screen-pro") {
      const go = w.document.querySelector("#pro-actions .go-game");
      if (go) { go.click(); continue; }
      const rest = restBtn();
      if (!rest) return false;
      rest.click();
      continue;
    }
    if (id === "screen-stage") { $("btn-stage-next").click(); continue; }
    return false;
  }
  return false;
}

// 마지막 데뷔 선수로 1시즌을 소화한다
guard("1시즌 소화", () => {
  check(active() === "screen-pro", `데뷔하면 프로 준비 화면으로 간다 (${active()})`);
  check(playSeason(), `1시즌을 버튼 클릭만으로 끝까지 소화한다 (${active()})`);
  check(active() === "screen-career", `1시즌이 끝나면 결산 화면이 뜬다 (${active()})`);
});

// ---------- ② 1년차 결산에는 이적 버튼이 없다 ----------
check(T.state().proYear === 1, `지금은 1년차다 (${T.state().proYear})`);
check(!$("btn-transfer"),
  `1년차 결산에는 이적 버튼이 없다 (같은 리그 이적도 ${TRANSFER_MIN_YEAR}년차부터)`);

// ---------- ③ 2년차 결산에는 이적 버튼이 있고, 누르면 이적 화면이 뜬다 ----------
const nextBtn = () => Array.from(w.document.querySelectorAll("#career-actions .btn"))
  .find((b) => b.textContent.includes("시즌 시작"));
guard("2년차 진입", () => {
  check(!!nextBtn(), "결산 화면에 다음 시즌 시작 버튼이 있다");
  nextBtn().click();
  check(playSeason(), `2시즌도 버튼 클릭만으로 소화한다 (${active()})`);
  check(T.state().proYear === 2, `2년차 결산에 도착했다 (${T.state().proYear}년차)`);
  check(!!$("btn-transfer"), "2년차 결산에는 이적 버튼이 있다");
  $("btn-transfer").click();
  check(active() === "screen-transfer", `이적 버튼을 누르면 screen-transfer가 보인다 (${active()})`);
  check(!$("screen-transfer").hasAttribute("hidden")
    && w.document.querySelectorAll(".screen.active").length === 1,
    `이적 화면은 hidden 없이 .active로만 제어된다 (활성 화면 ${w.document.querySelectorAll(".screen.active").length}개)`);
});

// ---------- 이적 화면에 다시 들어가는 헬퍼 ----------
const cards = () => Array.from(w.document.querySelectorAll("#screen-transfer .tf-card"));
const cardsOf = (lg) => cards().filter((c) => Number(c.dataset.league) === lg);
/* 결산 화면으로 돌아가 다시 이적 버튼을 누른다. 화면 함수는 부르지 않는다 —
 * showActivity()는 게임이 이어하기에 쓰는 공개 입구고, 그 뒤는 전부 버튼 클릭이다. */
function openTransfer(over = {}) {
  const St = T.state();
  St.camp = 0;
  St.activity = null;
  St.pendingShow = false;
  if (over.league != null) St.league = over.league;
  if (over.group != null) St.group = over.group;
  if (over.clubStr != null) St.clubStr = over.clubStr;
  if (over.proYear != null) St.proYear = over.proYear;
  if (over.moves != null) St.moves = over.moves;
  if (over.hype != null) St.career.years[St.career.years.length - 1].hype = over.hype;
  Career.showActivity();
  if (active() !== "screen-career") return null;
  const btn = $("btn-transfer");
  if (!btn) return null;
  btn.click();
  return active() === "screen-transfer" ? cards() : null;
}

// ---------- ④ 현재 소속 클럽은 제안에 안 들어간다 ----------
guard("현재 클럽 제외", () => {
  let bad = 0, seen = 0;
  for (let i = 0; i < 60; i++) {
    const c = CLUBS[1][i % CLUBS[1].length];
    const list = openTransfer({ league: 1, group: c.name, clubStr: c.str, hype: 0, moves: [] });
    if (!list) { bad++; continue; }
    seen += list.length;
    if (list.some((el) => el.dataset.club === c.name)) bad++;
  }
  check(bad === 0, `60번 다시 열어도 현재 소속 클럽이 제안에 없다 (어긋난 판 ${bad}건 · 카드 ${seen}장)`);
});

// ---------- ⑤ hype 문턱 — 유로파리그·챔피언스리그 제안 ----------
guard("리그 문턱", () => {
  const below = openTransfer({ league: 1, group: CLUBS[1][5].name, hype: PROMOTE_HYPE[2] - 0.1, moves: [] });
  check(!!below, "문턱 아래에서도 이적 화면 자체는 열린다 (같은 리그 이적은 되니까)");
  check(!!below && cardsOf(1).length === OFFERS_PER_LEAGUE,
    `${NM(1)} 제안이 ${OFFERS_PER_LEAGUE}개 온다 (${below ? cardsOf(1).length : 0}개)`);
  check(!!below && cardsOf(2).length === 0,
    `직전 시즌 hype가 ${PROMOTE_HYPE[2]} 미만이면 ${NM(2)} 제안이 안 온다 (${below ? cardsOf(2).length : 0}개)`);
  check(!!below && cardsOf(3).length === 0,
    `그때 ${NM(3)} 제안도 당연히 없다 (${below ? cardsOf(3).length : 0}개)`);

  const at2 = openTransfer({ hype: PROMOTE_HYPE[2], moves: [] });
  check(!!at2 && cardsOf(2).length === OFFERS_PER_LEAGUE,
    `hype가 ${PROMOTE_HYPE[2]} 이상이면 ${NM(2)} 제안이 ${OFFERS_PER_LEAGUE}개 온다 (${at2 ? cardsOf(2).length : 0}개)`);
  check(!!at2 && cardsOf(3).length === 0,
    `${PROMOTE_HYPE[2]}으로는 ${NM(3)} 제안이 아직 안 온다 (${at2 ? cardsOf(3).length : 0}개)`);

  const at3 = openTransfer({ hype: PROMOTE_HYPE[3], moves: [] });
  check(!!at3 && cardsOf(2).length === OFFERS_PER_LEAGUE && cardsOf(3).length === OFFERS_PER_LEAGUE,
    `hype가 ${PROMOTE_HYPE[3]} 이상이면 ${NM(2)}·${NM(3)} 제안이 함께 온다 (${NM(2)} ${at3 ? cardsOf(2).length : 0} · ${NM(3)} ${at3 ? cardsOf(3).length : 0})`);
});

// ---------- ⑥ 챔피언스리그에 있으면 아래 리그 제안도 온다 (내려오는 이적은 언제든) ----------
guard("아래로 내려오는 이적", () => {
  const down = openTransfer({ league: 3, group: CLUBS[3][0].name, clubStr: CLUBS[3][0].str, hype: -1, moves: [] });
  check(!!down, `${NM(3)} 소속에서도 이적 화면이 열린다`);
  check(!!down && cardsOf(1).length === OFFERS_PER_LEAGUE && cardsOf(2).length === OFFERS_PER_LEAGUE,
    `hype가 바닥이어도 ${NM(1)}·${NM(2)} 제안은 온다 (${NM(1)} ${down ? cardsOf(1).length : 0} · ${NM(2)} ${down ? cardsOf(2).length : 0})`);
  check(!!down && cardsOf(3).length === OFFERS_PER_LEAGUE,
    `같은 리그(${NM(3)}) 이적도 가능하다 (${down ? cardsOf(3).length : 0}개)`);
});

// ---------- ⑦ 카드에 평점 페널티와 수상 가치가 숫자로 있다 ----------
/* 이게 도박의 크기다. 감추면 "왜 갑자기 성적이 무너지는지" 모르는 채로 올라가게 된다.
 * 숫자는 LEAGUES에서 그대로 뽑아 비교한다 — 테스트에 옮겨 적지 않는다. */
guard("페널티·수상 가치 표시", () => {
  const list = openTransfer({ league: 1, group: CLUBS[1][5].name, hype: PROMOTE_HYPE[3], moves: [] });
  /* hype가 꼭대기면 위로는 전부 열리고, 아래로 내려가는 이적은 원래 문턱이 없다.
   * 그래서 클럽 표가 있는 리그 전부에서 제안이 온다 — 숫자를 옮겨 적지 않고 표에서 센다. */
  const offering = LEAGUES.filter((l) => (CLUBS[l.id] || []).length);
  check(!!list && list.length === OFFERS_PER_LEAGUE * offering.length,
    `${offering.length}개 리그 제안이 모두 있다 (${list ? list.length : 0}장 / 기대 ${OFFERS_PER_LEAGUE * offering.length}장)`);
  let badPen = 0, badPre = 0;
  for (const el of list || []) {
    const lg = leagueById(Number(el.dataset.league));
    const txt = el.textContent.replace(/\s+/g, " ");
    if (lg.penalty > 0 && !txt.includes(`-${lg.penalty.toFixed(1)}`)) badPen++;
    if (!txt.includes(`×${lg.prestige.toFixed(2)}`)) badPre++;
  }
  check(badPen === 0, `상위 리그 카드에 평점 페널티가 숫자로 있다 (${LEAGUES.filter((l) => l.penalty > 0).map((l) => `-${l.penalty.toFixed(1)}`).join(" · ")} · 빠진 카드 ${badPen}장)`);
  check(badPre === 0, `모든 카드에 수상 가치가 숫자로 있다 (${LEAGUES.map((l) => `×${l.prestige.toFixed(2)}`).join(" · ")} · 빠진 카드 ${badPre}장)`);
  const one = (list || [])[0];
  check(!!one && one.dataset.club && !!clubByName(one.dataset.club),
    `카드에 data-club이 CLUBS의 이름으로 붙는다 (${one ? one.dataset.club : ""})`);
  check(!!one && (list || []).every((el) => el.textContent.includes(String(clubByName(el.dataset.club).str))),
    "카드마다 그 클럽의 전력이 숫자로 있다");
});

// ---------- ⑧ "남는다"를 누르면 아무것도 안 바뀐다 ----------
guard("남는다", () => {
  const list = openTransfer({ league: 1, group: CLUBS[1][5].name, clubStr: CLUBS[1][5].str, hype: PROMOTE_HYPE[3], moves: [] });
  check(!!list, "남는다 검사를 위해 이적 화면에 들어간다");
  const St = T.state();
  const before = { group: St.group, league: St.league, clubStr: St.clubStr, moves: JSON.stringify(St.moves || []) };
  check(!!$("btn-transfer-stay"), "이적 화면에 '남는다' 버튼이 있다");
  $("btn-transfer-stay").click();
  const after = T.state();
  check(after.group === before.group && after.league === before.league && after.clubStr === before.clubStr
    && JSON.stringify(after.moves || []) === before.moves,
    `남는다를 누르면 소속·리그·전력·이적 기록이 그대로다 (${after.group} · ${after.league}부 · 전력 ${after.clubStr})`);
  check(active() === "screen-career", `남는다를 누르면 결산 화면으로 돌아간다 (${active()})`);
});

// ---------- ⑨ 카드를 누르면 소속이 바뀌고 기록이 쌓인다 ----------
guard("이적 실행", () => {
  const from = CLUBS[1][5];
  const list = openTransfer({ league: 1, group: from.name, clubStr: from.str, hype: PROMOTE_HYPE[3], moves: [] });
  check(!!list, "이적 실행 검사를 위해 이적 화면에 들어간다");
  const target = (list || []).find((el) => Number(el.dataset.league) === 2);
  check(!!target, `${NM(2)} 제안 카드가 있다`);
  if (!target) return;
  const wantClub = target.dataset.club;
  const wantStr = clubByName(wantClub).str;
  const year = T.state().proYear;
  const money = T.state().money || 0;
  target.click();

  const St = T.state();
  check(St.group === wantClub, `S.group이 카드의 클럽으로 바뀐다 (${from.name} → ${St.group})`);
  check(St.league === 2, `S.league가 ${NM(2)}로 바뀐다 (${St.league})`);
  check(St.clubStr === wantStr, `S.clubStr이 그 클럽의 전력이 된다 (${St.clubStr} vs ${wantStr})`);
  check(Array.isArray(St.moves) && St.moves.length === 1, `S.moves에 한 줄이 쌓인다 (${(St.moves || []).length}줄)`);
  const mv = (St.moves || [])[0] || {};
  check(mv.y === year && mv.from === from.name && mv.to === wantClub && mv.fromLg === 1 && mv.toLg === 2,
    `이적 기록에 연차·전소속·새소속·리그가 남는다 (${JSON.stringify(mv)})`);
  check((St.money || 0) > money, `계약금이 자금에 더해진다 (${money} → ${St.money})`);

  // ⑩ 이적 후 결산으로 돌아가고, 다음 시즌이 새 클럽에서 시작된다
  check(active() === "screen-career", `이적하면 결산 화면으로 돌아간다 (${active()})`);
  check($("career-card").textContent.includes(wantClub),
    `결산 화면이 새 클럽으로 갱신된다 (${wantClub})`);
  check(!$("btn-transfer"), "한 오프시즌에 두 번 이적할 수는 없다 (이적 버튼이 사라진다)");
  check(!!nextBtn(), "이적 뒤에도 다음 시즌 시작 버튼이 있다");
  nextBtn().click();
  check(active() === "screen-pro", `다음 시즌이 시작된다 (${active()})`);
  check($("pro-team").textContent.includes(wantClub),
    `다음 시즌 준비 화면의 소속이 새 클럽이다 (${$("pro-team").textContent})`);
  check(T.state().clubStr === wantStr && T.state().league === 2,
    "새 시즌도 새 클럽의 전력·리그로 굴러간다");
});


// ---------- ⑪ 능력치 70은 챔피언스리그 제안을 사실상 못 받는다 ----------
/* 약한 선수가 빅클럽에 가서 팀 승률 13%로 무너지는 상황을 막는 방어선이다.
 * 챔피언스리그 문턱(PROMOTE_HYPE[3])이 능력치 70의 시즌 hype보다 확실히 위인지 실측한다.
 *
 * 실측 결과를 그대로 적는다. "능력치 70은 절대 챔피언스리그 제안을 못 받는다"는 성립하지 않는다.
 * 평균은 문턱보다 1점 넘게 아래지만 분포에 꼬리가 있어서, 커리어 하이 시즌 1~2%는
 * 문턱을 넘는다. 그건 고장이 아니라 설계다 — 문턱은 "제안이 오는 조건"이지
 * 성공 보장이 아니고, 그렇게 열린 카드에도 평점 -2.8이 그대로 적혀 있다(⑦).
 * 그래서 여기서는 (a) 넘는 시즌이 드문 꼬리인지, (b) 평범한 시즌(중앙값·상위 5%)으로는
 * 화면에 챔피언스리그 카드가 한 장도 안 뜨는지를 못 박는다.
 *
 * 시즌은 페이지에 실제로 로드된 함수로 굴린다 (ratingOf·matchContribution·autoRes).
 * hype 산식만 career.js 소스에서 떼어 new Function으로 감싼다 — 옮겨 적으면
 * 산식이 바뀌어도 초록이 뜬다. */
const seasonSrc = {
  cbPerYear: grab(SRC, /const CB_PER_YEAR = [^;]+;/),
  weeksPerCb: grab(SRC, /const WEEKS_PER_CB = [^;]+;/),
  /* agePen은 노쇠 시작 시즌(DECLINE_FROM)을 읽어요 — 상수까지 같이 떼어 와야 굴러가요.
   * 따로 안 떼면 ReferenceError로 죽습니다(조용히 통과하지는 않아요). */
  ageConst: grab(SRC, /const DECLINE_FROM = [^;]+;/),
  agePen: grab(SRC, /const agePen = [^;]+;/),
  hype: grab(SRC, /const hype = clamp\([^;]+;/),
};
const seasonMissing = Object.entries(seasonSrc).filter(([, v]) => !v).map(([k]) => k);
check(seasonMissing.length === 0, seasonMissing.length ? `산식을 못 찾았어요: ${seasonMissing.join(", ")}` : "시즌·hype 산식을 소스에서 뽑았다");

guard("능력치 70의 챔피언스리그 차단", () => {
  if (seasonMissing.length) return;
  const careerState = T.state();   // 시뮬레이션이 전역 S를 갈아끼우니 원래 세이브를 붙잡아 둔다
  const GAMES = new Function(`${seasonSrc.cbPerYear} ${seasonSrc.weeksPerCb} return CB_PER_YEAR * WEEKS_PER_CB;`)();
  const hypeFn = new Function("S", "act", "clamp", "posAxis", "leagueOf", "AXIS_K", "AXIS_OFF",
    `${seasonSrc.ageConst}\n${seasonSrc.agePen}\n${seasonSrc.hype}\nreturn hype;`);
  const clamp = get("clamp");
  const matchContribution = get("matchContribution");
  const autoRes = get("autoRes");
  const POS_INFO = get("POS_INFO");

  const stateOf = (pos, stat) => ({
    name: "나", pos, league: 1, clubStr: 70, condition: 80, fandom: 900, proYear: 5, trans: {},
    stats: { shoot: stat, pass: stat, dribble: stat, defense: stat, stamina: stat },
    talents: { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 },
    career: { years: [] },
  });
  function seasonHype(pos, stat) {
    const st = stateOf(pos, stat);
    set("S", st);
    const act = { goals: 0, assists: 0, defense: 0, apps: 0 };
    for (let i = 0; i < GAMES; i++) {
      const rating = T.ratingOf(st.stats, st.pos, st.condition, st.fandom);
      const c = matchContribution(rating);
      act.goals += c.g; act.assists += c.a; act.defense += c.def; act.apps += 1;
      // 승부처 극장골도 실제 시즌처럼 얹는다 (info.myGoals와 같은 처리)
      if (autoRes(st.stats[POS_INFO[pos].stat]) === "perfect") act.goals += 1;
    }
    return hypeFn(st, act, clamp, T.posAxis, T.leagueOf, T.AXIS_K, T.AXIS_OFF);
  }

  const N = Number(process.env.TRANSFER_N || 300);
  const POS = ["fw", "wg", "mf", "df"];
  const POS_NAME = { fw: "공격수", wg: "윙어", mf: "미드필더", df: "수비수" };
  const pctl = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  console.log(`=== ⑪ 능력치 70의 5년차 시즌 hype (포지션당 ${N}시즌) ===`);
  console.log(`  포지션 |   평균 | 중앙값 | 상위5% |   최대 | ${UP1.name} 문턱 ${PROMOTE_HYPE[UP1.id]} 이상 | ${NM(3)} 문턱 ${PROMOTE_HYPE[3]} 이상`);
  const all = [];
  for (const pos of POS) {
    const hs = [];
    for (let i = 0; i < N; i++) hs.push(seasonHype(pos, 70));
    all.push(...hs);
    hs.sort((a, b) => a - b);
    const avg = hs.reduce((a, b) => a + b, 0) / hs.length;
    const p2 = hs.filter((h) => h >= PROMOTE_HYPE[UP1.id]).length / hs.length;
    const p3 = hs.filter((h) => h >= PROMOTE_HYPE[3]).length / hs.length;
    console.log(`  ${POS_NAME[pos].padStart(5)} | ${avg.toFixed(2).padStart(6)} | ${pctl(hs, 0.5).toFixed(2).padStart(6)} | ${pctl(hs, 0.95).toFixed(2).padStart(6)} | ${hs[hs.length - 1].toFixed(2).padStart(6)} | ${`${(p2 * 100).toFixed(1)}%`.padStart(17)} | ${`${(p3 * 100).toFixed(1)}%`.padStart(17)}`);
  }
  all.sort((a, b) => a - b);
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  const rate3 = all.filter((h) => h >= PROMOTE_HYPE[3]).length / all.length;
  const rateUp1 = all.filter((h) => h >= PROMOTE_HYPE[UP1.id]).length / all.length;
  const p50 = pctl(all, 0.5), p95 = pctl(all, 0.95), max = all[all.length - 1];

  check(p95 < PROMOTE_HYPE[3],
    `능력치 70은 상위 5% 시즌으로도 ${NM(3)} 문턱을 못 넘는다 (상위 5% ${p95.toFixed(2)} vs 문턱 ${PROMOTE_HYPE[3]})`);
  check(PROMOTE_HYPE[3] - mean > Math.abs(mean - PROMOTE_HYPE[UP1.id]),
    `평균 시즌은 ${UP1.name} 문턱 근처지 ${NM(3)} 문턱 근처가 아니다 (평균 ${mean.toFixed(2)} — ${UP1.name}까지 ${(mean - PROMOTE_HYPE[UP1.id]).toFixed(2)} · ${NM(3)}까지 ${(PROMOTE_HYPE[3] - mean).toFixed(2)})`);
  check(rate3 < 0.05,
    `${NM(3)} 문턱을 넘는 건 커리어 하이 시즌 5% 미만이다 (${POS.length}포지션 × ${N}시즌 중 ${(rate3 * 100).toFixed(2)}%)`);
  check(rateUp1 > 0.2 && rateUp1 < 0.8,
    `${UP1.name}는 그와 달리 실제로 열리는 사다리다 (${(rateUp1 * 100).toFixed(1)}%가 ${UP1.name} 문턱을 넘는다)`);

  /* 화면에서도 막히는지 — 중앙값 시즌과 상위 5% 시즌을 hype로 박고 실제로 버튼을 눌러
   * 챔피언스리그 카드 수를 센다. 0장이어야 "평범한 능력치 70은 빅클럽 문을 못 연다"가 된다. */
  set("S", careerState);
  for (const [label, h] of [["중앙값", p50], ["상위 5%", p95]]) {
    const list = openTransfer({ league: 1, group: CLUBS[1][5].name, clubStr: CLUBS[1][5].str, hype: h, moves: [] });
    check(!!list, `능력치 70의 ${label} 시즌(hype ${h.toFixed(2)})으로 이적 화면에 들어간다`);
    check(!!list && cardsOf(3).length === 0,
      `능력치 70의 ${label} 시즌으로는 ${NM(3)} 카드가 한 장도 없다 (${list ? cardsOf(3).length : 0}장)`);
    check(!!list && cardsOf(1).length === OFFERS_PER_LEAGUE,
      `대신 같은 리그 이적은 그대로 열려 있다 (${NM(1)} ${list ? cardsOf(1).length : 0}장)`);
  }
  /* 문턱이 실제로 hype를 본다는 것도 못 박는다. 이 검사가 없으면 위 두 줄은
   * "챔피언스리그 카드를 아예 안 그린다"는 버그로도 초록이 뜬다.
   *
   * 예전에는 능력치 70의 커리어 하이로 이 문을 열었다. 한 시즌을 12경기에서
   * 38경기로 늘리면서 시즌 변동성이 줄어(경기가 많을수록 운이 평균으로 수렴한다)
   * 꼬리가 더는 문턱에 닿지 않는다. 그건 그것대로 확인하고, 문턱이 hype를 본다는
   * 것은 문턱 위 값을 직접 박아 확인한다. */
  /* ⚠️ **최고값이 아니라 상위 1%로 본다.**
   * 컵 대회(2.36.0)가 생기면서 시즌 기록에 3경기가 더해져 hype가 ~8% 올랐어요.
   * 1200시즌 중 딱 한 번 나온 커리어 하이가 문턱을 살짝 넘는 건(6.68 vs 6.5)
   * 오히려 좋은 일이에요 — "인생 시즌 한 번으로 최상위 리그 문이 열린다"니까요.
   * 지켜야 하는 건 그게 **흔하면 안 된다**는 거고, 그건 위의 상위 5%·비율 검사가 봐요. */
  const p99 = pctl(all, 0.99);
  check(p99 < PROMOTE_HYPE[3],
    `능력치 70은 상위 1% 시즌으로도 ${NM(3)} 문턱을 못 넘는다 (상위 1% ${p99.toFixed(2)} · 최고 ${max.toFixed(2)} vs 문턱 ${PROMOTE_HYPE[3]})`);
  const overBar = PROMOTE_HYPE[3] + 0.5;
  const top = openTransfer({ league: 1, group: CLUBS[1][5].name, clubStr: CLUBS[1][5].str, hype: overBar, moves: [] });
  check(!!top && cardsOf(3).length === OFFERS_PER_LEAGUE,
    `문턱을 넘는 hype(${overBar.toFixed(2)})에서는 ${NM(3)} 문이 열린다 — 문턱이 실제로 hype를 보고 있다는 뜻이다 (${top ? cardsOf(3).length : 0}장)`);
  check(!!top && (top || []).filter((el) => Number(el.dataset.league) === 3)
    .every((el) => el.textContent.includes(`-${leagueById(3).penalty.toFixed(1)}`)),
    `그 카드에도 평점 -${leagueById(3).penalty.toFixed(1)}이 그대로 적혀 있다 (도박의 크기를 감추지 않는다)`);
});

/* ── 🏟️ 이적 제안 카드에 그 클럽의 리그 내 자리
 *
 * 전력 숫자(예: 78)만 보고는 "3부의 최강"과 "1부의 최약체"를 구분할 수 없었다.
 * 다른 리그는 시즌을 굴리지 않으니 전력 순서로 매기고, 표기도 "전력 N위"로 정직하게 쓴다.
 * 내가 뛰는 리그는 실제 순위표가 있으니 "지난 시즌 N위"다. */
const STAND = grab(SRC, /function clubStanding\(club, leagueId\) \{[\s\S]*?\n  \}/);
const STAND_TXT = grab(SRC, /const standingText = \(st\) => st[\s\S]*?;\n/);
check(!!STAND && !!STAND_TXT, "clubStanding·standingText를 소스에서 찾았다");
if (STAND && STAND_TXT) {
  const CL = T.CLUBS;
  const lgId = Number(Object.keys(CL)[0]);
  const list = CL[lgId];
  const CLUBS_IN = grab(fs.readFileSync(path.join(DIR, "game.js"), "utf8"),
    /function clubsIn\(id, st\) \{[\s\S]*?\n\}/);
  const ROSTER = grab(SRC, /const leagueRoster = \(id\) => clubsIn\(id, S\);/);
  const mk = (league, ready, rows) => new Function("CLUBS", "club", "leagueId",
    `const S = { league: ${league} };
     ${CLUBS_IN}
     ${ROSTER}
     const tableReady = () => ${ready};
     const tableRows = () => ${JSON.stringify(rows || [])};
     ${STAND}
     ${STAND_TXT}
     const st = clubStanding(club, leagueId);
     return { st, txt: standingText(st) };`);
  const strongest = list.slice().sort((a, b) => b.str - a.str)[0];
  const weakest = list.slice().sort((a, b) => a.str - b.str)[0];
  const away = mk(-1, false, null);
  const s1 = away(CL, strongest, lgId), s2 = away(CL, weakest, lgId);
  console.log(`   ${strongest.name}(전력 ${strongest.str}) ${s1.txt} · ${weakest.name}(전력 ${weakest.str}) ${s2.txt}`);
  check(!!s1.st && s1.st.rank === 1, `가장 센 팀이 1위로 나온다 (${s1.txt})`);
  check(!!s2.st && s2.st.rank === list.length, `가장 약한 팀이 꼴찌로 나온다 (${s2.txt})`);
  check(/전력/.test(s1.txt), "다른 리그는 '전력' 순위라고 정직하게 적는다");
  // 내가 뛰는 리그는 진짜 순위표를 쓴다 — 전력이 꼴찌여도 1위로 마쳤으면 1위다
  const real = mk(lgId, true, [{ name: weakest.name }, { name: strongest.name }])(CL, weakest, lgId);
  check(!!real.st && real.st.rank === 1 && /지난 시즌/.test(real.txt),
    `내 리그는 실제 순위표를 쓴다 (전력은 꼴찌인데 ${real.txt})`);
  check(/tf-rank/.test(SRC) && /standingText\(clubStanding\(o\.club, lg\.id\)\)/.test(SRC),
    "이적 카드가 실제로 이 값을 그린다");
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
