/* ⚾ 포스팅(해외 진출) · 가을야구 라벨 · 이적 화면
 *
 * 앞의 두 검사가 지키는 자리와 겹치지 않아요.
 *  · tests/rookie/league-test.js — '내가 상대하는 공'이 리그마다 세지는가 (난이도)
 *  · tests/rookie/club-test.js   — 구단 전력을 올려도 팀 승률이 안 무너지는가
 *  · 이 파일                      — **거기로 갈 자격이 있는가, 그리고 화면에 닿는가**
 *
 * ⚠️ 여기서 가장 중요한 건 '도달성'이에요. 자격 함수가 맞는 값을 돌려줘도 화면에서
 * 그 버튼을 못 누르면 기능이 없는 거예요. 그래서 이 파일은 DOM을 흉내 내는 아주 작은
 * 상자를 만들어 **결산 화면 → 버튼 → 리그 목록 → 구단 목록 → 이적**까지 실제 함수로
 * 걸어갑니다. HTML 문자열도 실제로 만들어진 것을 읽어요.
 *
 * 값을 옮겨 적지 않아요. 자격 표도 산식도 전부 소스에서 잘라내 그대로 돌립니다.
 * eval("const x = …")은 쓰지 않아요 (선언이 eval 자기 스코프에 갇혀서 밖으로 안 새요).
 * career.js 함수는 tests/cloud/career-cloud-test.js가 쓰는 방식 그대로,
 * with(스코프) 안에서 실제 소스를 돌려요. 채우지 않은 이름은 스텁이 받아줍니다. */
"use strict";
const fs = require("fs");

const BASE = process.env.ROOKIE || "/workspace/grow-games/beta/rookie";
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const POST = fs.readFileSync(`${BASE}/postseason.js`, "utf8");
const CSS = fs.readFileSync(`${BASE}/style.css`, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const group = (t) => console.log(`\n— ${t}`);

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const grab = (src, re, label) => {
  const m = src.match(re);
  if (!m) throw new Error(`소스에서 못 찾았어요: ${label}`);
  return m[0];
};

/* ---------- game.js 쪽 ---------- */
const GAME_PARTS = [
  ["REGIONS", /const REGIONS = \[[\s\S]*?\n\];/],
  ["STAT_DEFS", /const STAT_DEFS = \{[\s\S]*?\n\};/],
  ["STAT_CAP", /const STAT_CAP = [^;]+;/],
  ["TRANS_CAP_STEP", /const TRANS_CAP_STEP = [^;]+;/],
  ["transLv", /const transLv = [^;]+;/],
  ["transTotal", /const transTotal = [^;]+;/],
  ["statCap", /const statCap = [^;]+;/],
  ["overall", /const overall = \(\) => \{[\s\S]*?\n\};/],
  ["fmtMoney", /const fmtMoney = [^;]+;/],
  ["CLUTCH_SCALE", /const CLUTCH_SCALE = [^;]+;/],
  ["clutch", /function clutch\(key\) \{[\s\S]*?\n\}/],
  ["clutchAvg", /function clutchAvg\(\) \{[\s\S]*?\n\}/],
  ["autoRes", /function autoRes\(stat\) \{[\s\S]*?\n\}/],
  ["CRISIS_LEAGUE_K", /const CRISIS_LEAGUE_K = [^;]+;/],
  ["CRISIS_LEAGUE_CAP", /const CRISIS_LEAGUE_CAP = [^;]+;/],
  ["crisisRuns", /function crisisRuns\(res, oppStr, lgUp\) \{[\s\S]*?\n\}/],
  ["LEAGUES", /const LEAGUES = \[[\s\S]*?\n\];/],
  ["leagueOf", /function leagueOf\(st\) \{[\s\S]*?\n\}/],
  ["LEAGUE_CLUBS", /const LEAGUE_CLUBS = \{[\s\S]*?\n\};/],
  ["LEAGUE_DRIFT", /const LEAGUE_DRIFT = [^;]+;/],
  ["leagueIdOf", /const leagueIdOf = \(league\) => \{[\s\S]*?\n\};/],
  ["teamsOf", /function teamsOf\(league\) \{[\s\S]*?\n\}/],
  ["driftBandOf", /function driftBandOf\(league\) \{[\s\S]*?\n\}/],
  ["CLUB_STR", /const CLUB_STR = \{\};[\s\S]*?\nconst clubStrOf = [^;]+;/],
];
let G;
try {
  const src = GAME_PARTS.map(([n, re]) => grab(GAME, re, n)).join("\n");
  // eslint-disable-next-line no-new-func
  G = new Function("S", "clamp", "randInt", `${src}
    return { LEAGUES, leagueOf, LEAGUE_CLUBS, teamsOf, driftBandOf, clubStrOf, clutch, clutchAvg,
             autoRes, crisisRuns, STAT_DEFS, statCap, transTotal, overall, fmtMoney,
             CRISIS_LEAGUE_K, CRISIS_LEAGUE_CAP };`);
} catch (e) {
  console.log(`❌ ${e.message}`);
  process.exit(1);
}

/* ---------- postseason.js — 파일 통째로 돌려요 ---------- */
const win = {};
// eslint-disable-next-line no-new-func
new Function("window", POST)(win);
const Postseason = win.Postseason;

/* ---------- 아주 작은 DOM 상자 ----------
 * 화면에 닿는지 보려면 요소가 실제로 있어야 해요. innerHTML은 문자열 그대로 담아두고,
 * querySelectorAll(".offer")는 그 문자열에서 버튼을 긁어 같은 객체를 돌려줘요 —
 * 화면 코드가 onclick을 걸어둔 그 객체를 테스트가 그대로 눌러야 하니까요. */
function makeDom() {
  const reg = {};
  const mk = (tag) => {
    const e = {
      tag, className: "", id: "", textContent: "", disabled: false, hidden: false, open: false,
      dataset: {}, children: [], style: {}, onclick: null, _html: "", _q: {},
      appendChild(c) { e.children.push(c); return c; },
      prepend(c) { e.children.unshift(c); return c; },
      remove() {},
      addEventListener() {},
      querySelectorAll(sel) {
        if (e._q[sel]) return e._q[sel];
        const cls = sel.replace(/^\./, "");
        const out = [];
        const re = /<button[^>]*class="([^"]*)"[^>]*>/g;
        let m;
        while ((m = re.exec(e._html))) {
          if (!m[1].split(/\s+/).includes(cls)) continue;
          const tagTxt = m[0];
          const di = /data-i="(\d+)"/.exec(tagTxt);
          out.push({
            dataset: { i: di ? di[1] : undefined },
            className: m[1],
            disabled: /\sdisabled(\s|>)/.test(tagTxt),
            onclick: null,
          });
        }
        e._q[sel] = out;
        return out;
      },
    };
    Object.defineProperty(e, "innerHTML", {
      get: () => e._html,
      set: (v) => { e._html = String(v); e.children = []; e._q = {}; },
    });
    return e;
  };
  const $ = (id) => reg[id] || (reg[id] = mk("div"));
  return {
    $, reg,
    document: {
      createElement: mk,
      getElementById: $,
      querySelector: () => mk("div"),
    },
  };
}

/* ---------- career.js 쪽 — 실제 소스를 with(스코프) 안에서 돌려요 ---------- */
function cutFn(header) {
  const lines = SRC.split("\n");
  const i = lines.findIndex((l) => l === header);
  if (i < 0) throw new Error(`함수를 못 찾았어요: ${header}`);
  for (let j = i + 1; j < lines.length; j++) if (lines[j] === "  }") return lines.slice(i, j + 1).join("\n");
  throw new Error(`함수 끝을 못 찾았어요: ${header}`);
}
/* 선언 순서가 중요해요 — const는 TDZ가 있어서 쓰기 전에 초기화돼야 해요.
 * 그래서 const 묶음을 먼저 깔고 함수 선언을 뒤에 붙여요 (함수는 호이스팅돼요). */
const CAREER_CONSTS = [
  ["SEASON_TOTAL", /  const SEASON_TOTAL = [^;]+;/],
  ["leagueTeams", /  const leagueTeams = [^;]+;/],
  ["ROUND_ORDER", /  const ROUND_ORDER = [^;]+;/],
  ["inPost", /  const inPost = [^;]+;/],
  ["KS_LABEL", /  const KS_LABEL = \{[^\n]*\};/],
  ["postLabel", /  const postLabel = \(round\) =>[\s\S]*?;\n/],
  ["leagueTagOf", /  const leagueTagOf = \(id\) => \{[\s\S]*?\n  \};/],
  ["leagueTag", /  const leagueTag = \(\) => \{[\s\S]*?\n  \};/],
  // 📊 그 시즌에 뛴 소속을 역산하는 쪽이에요 — 스텁이 받으면 결산 헤더가 조용히 비어요
  ["moveFrom", /  const moveFrom = [^;]+;/],
  // 🌏 훈련 화면 HUD의 리그 배지 — 스텁이 받으면 리그가 안 보여도 초록이 떠요
  ["leagueBadge", /  const leagueBadge = \(\) => \{[\s\S]*?\n  \};/],
  ["mySeries", /  const mySeries = [^;]+;/],
  ["postOpp", /  const postOpp = \(\) => \{[^\n]*\};/],
  ["FA_YEAR", /  const FA_YEAR = [^;]+;/],
  ["TRADE_MIN_YEAR", /  const TRADE_MIN_YEAR = [^;]+;/],
  ["strLabel", /  const strLabel = \(v\) =>[\s\S]*?"🌱 리빌딩";/],
  ["ageValueMod", /  const ageValueMod = [^;]+;/],
  ["moveTitle", /  const moveTitle = [^\n]+;\n/],
  ["moveCard", /  const moveCard = [^\n]+;\n/],
  ["faReady", /  const faReady = [^;]+;/],
  ["tradeReady", /  const tradeReady = [^;]+;/],
  ["POST_GATE", /  const POST_GATE = \[[\s\S]*?\n  \];/],
  ["lastSeason", /  const lastSeason = \(\) => \{[\s\S]*?\n  \};/],
  ["lastWar", /  const lastWar = [^\n]+;/],
  ["postingReady", /  const postingReady = [^;]+;/],
  ["postingOffers", /  const postingOffers = [^;]+;/],
  ["HIT_OPP_K", /  const HIT_OPP_K = [^;]+;/],
  ["hitPreview", /  const hitPreview = \(oppStr\) =>[\s\S]*?clutch\("contact"\);/],
  ["CRISIS_PREVIEW_N", /  const CRISIS_PREVIEW_N = [^;]+;/],
  ["leagueMetric", /  const leagueMetric = \(lg\) => \(S\.pos[\s\S]*?\);\n/],
  ["metricRound", /  const metricRound = [^;]+;/],
  ["metricDigits", /  const metricDigits = [^;]+;/],
  ["metricUnit", /  const metricUnit = [^;]+;/],
  ["metricTxt", /  const metricTxt = [^;]+;/],
  ["metricName", /  const metricName = [^;]+;/],
];
const CAREER_FNS = [
  "  function proLog(msg) {",
  "  function assignRole() {",
  "  function startCamp() {",
  "  function teamStrOf(name) {",
  "  function oppFor(name) {",
  "  function driftTeamStr() {",
  "  function marketValue() {",
  "  function teamWinP() {",
  "  function gameWinP() {",
  "  function initSeason() {",
  "  function standingsHTML() {",
  // 🌏 훈련 화면 그 자체예요 — 리그 표시를 화면에서 읽으려면 실제로 그려야 해요
  "  function renderPro() {",
  "  function renderStandings() {",
  "  function myRank() {",
  "  function enterPostseason() {",
  "  function advancePostseason(seed) {",
  "  function finishProGame(win, perf) {",
  "  function finishPostGame(win, perf) {",
  "  function postStatLine() {",
  /* 🌏 finishSeason이 부르는 리그 가중이에요. 안 넣으면 스텁이 조용히 받아버려서
   * 여기서 굴리는 12시즌이 가중 없이 지나가요 — 없는 걸 있다고 믿는 초록이 돼요. */
  "  function addAwardWeight(awards, pre) {",
  "  function finishSeason() {",
  "  function teamOfYear(y, st) {",
  "  function leagueOfYear(y, st) {",
  "  function playedAt(s, st) {",
  "  function seasonReport() {",
  "  function moveActions(list) {",
  "  function moveTo(team, type, bonus) {",
  "  function faOffers() {",
  "  function showFa() {",
  "  function gateFor(from, to) {",
  "  function postingGates() {",
  "  function crisisPreview(oppStr, lgUp) {",
  "  function postingRow(g, i, cur, mine) {",
  "  function showPosting() {",
  "  function showPostingClubs(g) {",
  "  function moveToLeague(lg, team) {",
];
const CAREER_SRC = [
  ...CAREER_CONSTS.map(([n, re]) => grab(SRC, re, n)),
  ...CAREER_FNS.map(cutFn),
].join("\n");
const EXPORTS = ["SEASON_TOTAL", "leagueTeams", "inPost", "mySeries", "postOpp", "KS_LABEL", "postLabel",
  "leagueTag", "strLabel", "faReady", "tradeReady", "POST_GATE", "lastWar", "postingReady",
  "postingOffers", "HIT_OPP_K", "hitPreview", "leagueMetric", "metricTxt",
  "proLog", "startCamp", "teamStrOf", "driftTeamStr", "marketValue", "teamWinP", "gameWinP",
  "initSeason", "myRank", "enterPostseason", "advancePostseason", "finishProGame", "finishSeason",
  "seasonReport", "faOffers", "showFa", "gateFor", "postingGates", "crisisPreview",
  "showPosting", "showPostingClubs", "moveToLeague", "moveTo", "renderPro", "leagueBadge"];

function scopeOf(store) {
  const stub = function () { return undefined; };
  return new Proxy(store, {
    has: () => true,
    get(t, k) {
      if (k === Symbol.unscopables) return undefined;
      if (k in t) return t[k];
      if (k in globalThis) return globalThis[k];
      return stub;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
// eslint-disable-next-line no-new-func
const makeCareer = new Function("scope", `with (scope) { ${CAREER_SRC}
  return { ${EXPORTS.join(", ")} }; }`);

/* 한 판(세이브 하나)을 열어요. S와 game.js 전역이 같은 S를 보게 묶어요.
 * playFeeds는 연출(setTimeout)이라 바로 onDone으로 넘겨요 — 시즌이 결산까지 이어져야
 * 결산 화면(seasonReport)에 닿을 수 있고, 거기가 이 태스크의 입구예요. */
function open(S) {
  const g = G(S, clamp, randInt);
  const dom = makeDom();
  const store = Object.assign({}, g, {
    S, Postseason, clamp, rand, randInt, shuffle, pick,
    $: dom.$, document: dom.document,
    window: {},
    confirm: () => true,
    show: () => {},
    save: () => {},
    playFeeds: (title, feeds, onDone) => { store._feeds = feeds; if (onDone) onDone(); },
  });
  const c = makeCareer(scopeOf(store));
  c._dom = dom;
  c._store = store;
  return c;
}
const stateOf = (over = {}) => ({
  name: "테스터", pos: "batter", role: "3번 타자", age: 27, condition: 80,
  proYear: 5, money: 0, trans: {}, scout: 0, camp: 0,
  stats: { contact: 110, power: 110, run: 110, defense: 110, stamina: 110 },
  talents: { contact: 1.3, power: 1.3, run: 1.3, defense: 1.3, stamina: 1.3 },
  career: { seasons: [], roy: 0, mvp: 0, gg: 0, rings: 0, warSum: 0 },
  proLog: [], teamStr: {}, season: null, post: null, moves: [],
  ...over,
});

const TABLE = G(stateOf(), clamp, randInt).LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const LG = (tier) => TABLE.find((l) => l.tier === tier);
const NAME = (tier) => LG(tier).name;

/* 세이브 한 판을 '직전 시즌 WAR'과 함께 열어요. 자격은 S.career.seasons의 마지막 칸을 봐요. */
function playerAt(tier, proYear, war, over = {}) {
  const lg = LG(tier);
  const S = stateOf({ league: lg.id, proYear, ...over });
  S.career.seasons = war == null ? [] : [{ y: proYear, age: S.age, war, line: "", rank: 3, champ: false, awards: [], role: S.role, team: "테스트팀", raw: {} }];
  const c = open(S);
  S.team = c.leagueTeams()[0];
  return { S, c, lg };
}
const destNames = (c) => c.postingOffers().map((g) => g.league.name);

/* ---------- ① 자격 표 ---------- */
group("① 자격 표 — 직행이 가장 어렵고 열도를 거치면 낮아져요");
guard("자격 표", () => {
  const { c } = playerAt(1, 5, 4.0);
  const T = c.POST_GATE;
  const of = (from, to) => T.find((g) => g.from === from && g.to === to);
  const up1 = of(LG(1).id, LG(2).id), up2 = of(LG(2).id, LG(3).id), direct = of(LG(1).id, LG(3).id);
  check(!!up1 && !!up2 && !!direct,
    `올라가는 세 경로가 표에 있다 (${T.length}개)`);
  console.log(`  ${NAME(1)}→${NAME(2)} ${up1.year}년차·WAR ${up1.war} | ${NAME(2)}→${NAME(3)} ${up2.year}년차·WAR ${up2.war} | ${NAME(1)}→${NAME(3)} ${direct.year}년차·WAR ${direct.war}`);
  check(direct.war > up1.war && direct.year > up1.year,
    `직행(${NAME(1)}→${NAME(3)})이 첫 해외보다 어렵다 (WAR ${direct.war} > ${up1.war} · ${direct.year}년차 > ${up1.year}년차)`);
  check(direct.war > up2.war && direct.year > up2.year,
    `${NAME(2)}를 거치면 ${NAME(3)} 문턱이 낮아진다 (WAR ${up2.war} < ${direct.war} · ${up2.year}년차 < ${direct.year}년차)`);
  // 내려가는 경로는 표에 없어요 — gateFor가 언제나 열어줘요
  const down = T.filter((g) => {
    const f = TABLE.find((l) => l.id === g.from), t = TABLE.find((l) => l.id === g.to);
    return f && t && t.tier < f.tier;
  });
  check(down.length === 0, `내려가는 경로는 표에 없다 (문턱이 없으니까요 · ${down.length}개)`);
});

/* ---------- ② 문턱 실측 ---------- */
group("② 문턱 실측 — 어느 연차·어느 성적에서 열리나");
guard("문턱", () => {
  const c0 = playerAt(1, 5, 4.0).c;
  check(destNames(playerAt(1, 3, 3.0).c).length === 0,
    `3년차·WAR 3.0이면 어떤 해외 제안도 안 온다 (${destNames(playerAt(1, 3, 3.0).c).join("·") || "없음"})`);

  const d4 = destNames(playerAt(1, 4, 4.0).c);
  check(d4.length === 1 && d4[0] === NAME(2),
    `4년차·WAR 4.0이면 ${NAME(2)} 제안만 온다 (${d4.join("·") || "없음"})`);

  const d7 = destNames(playerAt(1, 7, 5.5).c);
  check(d7.includes(NAME(3)), `7년차·WAR 5.5면 ${NAME(3)} 직행 제안이 온다 (${d7.join("·")})`);

  // 같은 성적(WAR 4.5)에서 열도 소속이면 대륙이 열리고, KBO 소속이면 안 열려요
  const jp = destNames(playerAt(2, 6, 4.5).c);
  const kr = destNames(playerAt(1, 6, 4.5).c);
  check(jp.includes(NAME(3)) && !kr.includes(NAME(3)),
    `WAR 4.5에서 ${NAME(2)} 소속은 ${NAME(3)}이 열리고 ${NAME(1)} 소속은 안 열린다 (${NAME(2)}: ${jp.join("·")} / ${NAME(1)}: ${kr.join("·")})`);

  /* 문턱 그 자체를 훑어요 — 한 점만 보면 '4년차 이상'이 '4년차만'이어도 안 들켜요. */
  const scan = (fromTier, toTier) => {
    const to = LG(toTier).name;
    let minYear = null, minWar = null;
    for (let y = 1; y <= 15; y++) {
      if (destNames(playerAt(fromTier, y, 12).c).includes(to)) { minYear = y; break; }
    }
    for (let w = -20; w <= 120; w++) {
      if (destNames(playerAt(fromTier, 15, w / 10).c).includes(to)) { minWar = w / 10; break; }
    }
    return { minYear, minWar };
  };
  for (const [f, t] of [[1, 2], [1, 3], [2, 3]]) {
    const s = scan(f, t);
    const g = c0.gateFor(TABLE.find((l) => l.tier === f), TABLE.find((l) => l.tier === t));
    console.log(`  ${NAME(f)} → ${NAME(t)} | 열리는 최소 연차 ${s.minYear} · 최소 WAR ${s.minWar}`);
    check(s.minYear === g.year || (g.year <= 1 && s.minYear === 1),
      `${NAME(f)}→${NAME(t)}가 정확히 ${g.year}년차부터 열린다 (실측 ${s.minYear})`);
    check(Math.abs(s.minWar - g.war) < 0.11,
      `${NAME(f)}→${NAME(t)}가 정확히 WAR ${g.war}부터 열린다 (실측 ${s.minWar})`);
  }
});

/* ---------- ③ 돌아오는 이적은 문턱이 없어요 ---------- */
group("③ 복귀");
guard("복귀", () => {
  for (const tier of [2, 3]) {
    // 1년차·WAR -1.0 — 어떤 문턱도 못 넘을 성적이에요
    const d = destNames(playerAt(tier, 1, -1.0).c);
    const lower = TABLE.filter((l) => l.tier < tier).map((l) => l.name);
    check(lower.every((n) => d.includes(n)),
      `${NAME(tier)} 소속은 1년차·WAR -1.0이어도 아래 리그로 언제든 갈 수 있다 (${d.join("·") || "없음"})`);
  }
  // 시즌을 한 번도 안 치른 세이브도 복귀는 돼요 (직전 시즌이 없어요)
  const none = destNames(playerAt(3, 1, null).c);
  check(none.includes(NAME(1)) && none.includes(NAME(2)),
    `직전 시즌이 없어도 복귀 경로는 열려 있다 (${none.join("·") || "없음"})`);
  check(destNames(playerAt(1, 1, null).c).length === 0,
    `${NAME(1)}에서 직전 시즌이 없으면 아무 제안도 없다`);
});

/* ---------- ④ 오프시즌에만 · 한 해에 한 번 ---------- */
group("④ 창구");
guard("창구", () => {
  const { S, c } = playerAt(1, 8, 6.0);
  check(destNames(c).length > 0, "오프시즌에는 제안이 열려 있다");
  S.season = { game: 50, total: 144, teamW: 25, teamL: 25, others: [], stats: {} };
  check(destNames(c).length === 0, "시즌 중에는 제안이 닫힌다");
  S.season = null;
  const before = destNames(c).length;
  c.moveToLeague(LG(2), G(S, clamp, randInt).teamsOf(LG(2))[0]);
  check(before > 0 && destNames(c).length === 0,
    `같은 해에 두 번은 못 옮긴다 (이적 전 ${before}건 → 이적 후 ${destNames(c).length}건)`);
  S.proYear += 1;
  check(destNames(c).length > 0, "해가 바뀌면 다시 열린다 (복귀 경로)");
});

/* ---------- ⑤ 이적하면 리그·팀이 바뀌고 이력이 남아요 ---------- */
group("⑤ 이적");
guard("이적", () => {
  const { S, c } = playerAt(1, 7, 6.0);
  const from = S.team;
  const target = c.postingOffers().find((g) => g.league.tier === 3);
  check(!!target, `${NAME(3)} 제안을 골랐다`);
  const club = G(S, clamp, randInt).teamsOf(target.league)[2];
  c.moveToLeague(target.league, club);
  check(S.league === target.league.id, `S.league가 ${target.league.name}(id ${target.league.id})로 바뀐다 (${S.league})`);
  check(S.team === club, `S.team이 새 구단으로 바뀐다 (${S.team})`);
  const m = S.moves[S.moves.length - 1];
  check(!!m && m.type === "post" && m.from === from && m.to === club && m.league === target.league.id,
    `이적 이력이 남는다 (${m ? `${m.y}년차 ${m.from}→${m.to} · ${m.type}` : "없음"})`);
  check((S.proLog[0] || "").includes(target.league.name), `프로 일지에 리그 이적이 남는다 (${S.proLog[0] || "없음"})`);

  // 새 시즌의 상대가 통째로 새 리그 구단이어야 해요
  c.initSeason();
  const names = new Set(G(S, clamp, randInt).teamsOf(target.league));
  check(S.season.others.every((o) => names.has(o.name)) && S.season.others.length > 0,
    `다음 시즌 상대가 전부 ${target.league.name} 구단이다 (${S.season.others.length}팀)`);
});

/* ---------- ⑥ 강등이 없어요 — 여러 시즌 굴려 확인 ---------- */
group("⑥ 강등 없음");

/* 한 해를 통째로 굴려요 — 캠프 → 144경기 → 가을야구 → 결산(seasonReport)까지.
 * 이 흐름의 끝이 결산 화면이고, 거기가 포스팅 버튼이 서는 자리예요. */
function playYear(S, c) {
  c.startCamp();
  c.initSeason();
  for (let g = 0; g < c.SEASON_TOTAL; g++) {
    c.finishProGame(Math.random() < c.gameWinP(), null);
    S.condition = 80;
  }
  c.enterPostseason();
  let n = 0;
  while (c.inPost() && n++ < 60) {
    c.finishProGame(Math.random() < c.gameWinP(), null);
    const s = c.mySeries();
    if (s && s.done) c.advancePostseason();
  }
  if (S.post && S.post.eliminated && S.post.myRound) c.advancePostseason();
  if (S.season) c.finishSeason();     // 가을야구 없이 끝난 경우의 보험이에요
}

guard("강등 없음", () => {
  for (const tier of [2, 3]) {
    // 이 리그에서 버틸 수 없는 선수예요 — 성적이 바닥이어도 리그가 안 내려가야 해요
    const { S, c } = playerAt(tier, 1, null, {
      age: 22,
      stats: { contact: 40, power: 40, run: 40, defense: 40, stamina: 40 },
    });
    const id0 = S.league;
    let moved = 0, worst = 99;
    for (let y = 0; y < 12; y++) {
      playYear(S, c);
      if (S.league !== id0) moved++;
      const last = S.career.seasons[S.career.seasons.length - 1];
      if (last && last.war < worst) worst = last.war;
      const names = new Set(G(S, clamp, randInt).teamsOf(S.league));
      if (!names.has(S.team)) moved++;
    }
    console.log(`  ${NAME(tier)} · 능력치 40 · 12시즌 | 최저 WAR ${worst.toFixed(1)} · 통산 WAR ${S.career.warSum.toFixed(1)}`);
    check(moved === 0, `${NAME(tier)}에서 12시즌을 못해도 리그가 저절로 안 내려간다 (어긋난 시즌 ${moved}번)`);
    check(S.career.seasons.length === 12, `12시즌이 실제로 굴러갔다 (${S.career.seasons.length}시즌)`);
  }
  // 리그를 내리는 코드가 아예 없어야 해요 — moveToLeague만 S.league를 씁니다
  const writes = (SRC.match(/S\.league\s*=/g) || []).length;
  check(writes === 1, `S.league에 값을 넣는 자리가 moveToLeague 한 곳뿐이다 (${writes}곳)`);
});

/* ---------- ⑦ 가을야구 라벨 ---------- */
group("⑦ 가을야구 라벨");
guard("라벨", () => {
  const seen = [];
  for (const l of TABLE) {
    const { S, c } = playerAt(l.tier, 5, 5.0);
    const ks = c.postLabel("ks");
    seen.push(ks);
    console.log(`  ${l.flag} ${l.name} | ${["wc", "semi", "po", "ks"].map((r) => c.postLabel(r)).join(" → ")}`);
    check(typeof ks === "string" && ks.length > 0, `${l.name}의 마지막 시리즈에 이름이 있다 (${ks})`);
    // 구조는 그대로 — 앞의 세 라운드는 postseason.js 그대로예요
    const same = ["wc", "semi", "po"].every((r) => c.postLabel(r) === Postseason.LABEL[r]);
    check(same, `${l.name}의 와일드카드·준PO·PO는 postseason.js 그대로다`);
    check(S.league === l.id, `${l.name} 세이브가 그대로다`);
  }
  check(new Set(seen).size === TABLE.length,
    `리그마다 마지막 시리즈 이름이 다르다 (${seen.join(" · ")})`);
  check(seen[0] === Postseason.LABEL.ks,
    `${NAME(1)}은 postseason.js의 기본 이름 그대로다 (${seen[0]})`);

  // 라벨 매핑이 한 곳뿐이다 — Postseason.LABEL을 직접 읽는 자리는 postLabel 안에만
  const direct = (SRC.match(/Postseason\.LABEL\[/g) || []).length;
  check(direct === 1, `career.js에서 Postseason.LABEL을 직접 읽는 자리가 한 곳뿐이다 (${direct}곳)`);
  // 코드에 못 박힌 "한국시리즈"도 KS_LABEL 한 줄뿐이어야 해요 (주석은 빼고 세요)
  const hard = SRC.split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .filter((l) => l.includes(Postseason.LABEL.ks));
  check(hard.length === 1 && hard[0].includes("KS_LABEL"),
    `코드에 못 박힌 "${Postseason.LABEL.ks}"가 KS_LABEL 한 줄뿐이다 (${hard.length}줄)`);

  // 대륙 리그에서 실제 가을야구를 끝까지 굴려도 연출 문구가 그 리그 이름이다
  const { S, c } = playerAt(3, 6, 5.0, { stats: { contact: 150, power: 150, run: 150, defense: 150, stamina: 150 } });
  let champ = null;
  for (let i = 0; i < 40 && !champ; i++) {
    playYear(S, c);
    const feeds = c._store._feeds || [];
    const t = feeds.map((f) => f.text).join(" | ");
    if (t.includes("우승")) champ = t;
    S.age = 27;
  }
  check(!!champ && champ.includes(c.postLabel("ks")) && !champ.includes(Postseason.LABEL.ks),
    `${NAME(3)}의 우승 연출이 "${c.postLabel("ks")}"로 뜬다 (${champ ? champ.split("|").find((x) => x.includes("우승")).trim() : "우승 연출을 못 만났어요"})`);
});

/* ---------- ⑧ 화면 도달성 — 결산 → 버튼 → 리그 목록 → 구단 → 이적 ---------- */
group("⑧ 화면 도달성");
guard("도달성", () => {
  const { S, c } = playerAt(1, 7, 6.0);
  c.seasonReport();                                   // 결산 화면
  const acts = c._dom.$("career-actions").children;
  const labels = acts.map((b) => b.textContent);
  console.log(`  결산 버튼 | ${labels.join(" / ")}`);
  const btn = acts.find((b) => b.id === "btn-posting");
  check(!!btn, `결산 화면에 포스팅 버튼이 있다 (${labels.join(" / ")})`);
  check(acts.some((b) => b.id === "btn-trade"),
    "트레이드 버튼이 그대로 나란히 있다 (회귀)");

  btn.onclick();                                      // 👉 눌러요
  const title = c._dom.$("move-title").textContent;
  const html = c._dom.$("move-card").innerHTML;
  check(/포스팅/.test(title), `이적 화면(screen-move)이 열린다 — 제목 "${title}"`);
  for (const l of TABLE.filter((x) => x.id !== S.league)) {
    check(html.includes(l.name), `${l.name} 칸이 화면에 있다`);
  }
  // oppUp이 숫자로 보여야 해요 — 도박의 크기를 감추면 안 돼요
  for (const l of TABLE.filter((x) => x.id !== S.league)) {
    const d = (l.oppUp - TABLE.find((x) => x.id === S.league).oppUp).toFixed(2);
    check(html.includes(`+${d}`) || html.includes(`−${d}`),
      `${l.name}의 상대 수준 차이 ${d}이(가) 숫자로 보인다`);
    check(html.includes(`×${l.prestige.toFixed(2)}`),
      `${l.name}의 리그 위세 ×${l.prestige.toFixed(2)}가 숫자로 보인다`);
  }
  const nums = html.match(/(\d+\.\d)% → (\d+\.\d)%/g) || [];
  console.log(`  화면에 뜬 성적 변화 | ${nums.join(" · ")}`);
  check(nums.length === TABLE.length - 1,
    `리그마다 '지금 → 거기' 성적이 숫자로 보인다 (${nums.length}줄)`);
  check(nums.every((s) => { const m = s.match(/([\d.]+)% → ([\d.]+)%/); return +m[2] < +m[1]; }),
    `상위 리그로 갈수록 내 성적이 내려간다고 적혀 있다 (${nums.join(" · ")})`);
  check(/팀 승률/.test(html) && /가을야구 진출/.test(html),
    "팀 승률·가을야구는 그대로라는 경고가 화면에 있다");
  check(/개인 성적/.test(html), "바뀌는 게 개인 성적이라고 적혀 있다");

  // 잠긴 리그는 눌리지 않아요
  const rows = c._dom.$("move-card").querySelectorAll(".offer");
  check(rows.length === TABLE.length - 1, `리그 칸이 ${TABLE.length - 1}개다 (${rows.length}개)`);
  const locked = rows.filter((r) => r.className.includes("locked"));
  check(locked.length === 0, `7년차·WAR 6.0에는 잠긴 칸이 없다 (${locked.length}개)`);

  /* 잠긴 칸도 실제로 확인해요 — 4년차·WAR 4.0이면 대륙은 못 가요.
   * 못 가는 리그를 감추면 도전할 목표가 안 보여요. */
  {
    const lo = playerAt(1, 4, 4.0);
    lo.c.showPosting();
    const h = lo.c._dom.$("move-card").innerHTML;
    const rs = lo.c._dom.$("move-card").querySelectorAll(".offer");
    const lk = rs.filter((r) => r.className.includes("locked"));
    check(lk.length === 1 && lk.every((r) => r.disabled),
      `4년차·WAR 4.0이면 ${NAME(3)} 칸이 잠기고 눌리지 않는다 (잠긴 칸 ${lk.length}개)`);
    const gate = lo.c.gateFor(LG(1), LG(3));
    check(h.includes(`${gate.year}년차 이상`) && h.includes(`WAR ${gate.war.toFixed(1)} 이상`),
      `잠긴 칸이 무엇이 모자란지 적어준다 (${gate.year}년차 이상 · WAR ${gate.war.toFixed(1)} 이상)`);
  }

  // 👉 대륙 리그를 눌러요
  const gates = c.postingGates();
  const iCont = gates.findIndex((g) => g.league.tier === 3);
  check(!rows[iCont].className.includes("locked"), `7년차·WAR 6.0이라 ${NAME(3)} 칸이 열려 있다`);
  rows[iCont].onclick();
  const clubHtml = c._dom.$("move-card").innerHTML;
  const clubNames = G(S, clamp, randInt).teamsOf(LG(3));
  const shown = clubNames.filter((n) => clubHtml.includes(n));
  check(shown.length >= 2, `${NAME(3)} 구단 목록이 뜬다 (${shown.join(" · ")})`);

  // 👉 첫 구단을 눌러요
  const before = S.team;
  const clubBtns = c._dom.$("move-card").querySelectorAll(".offer");
  clubBtns[0].onclick();
  check(S.league === LG(3).id, `이적이 실제로 일어난다 — S.league ${S.league}`);
  check(clubNames.includes(S.team), `S.team이 ${NAME(3)} 구단이다 (${before} → ${S.team})`);
  check(c._dom.$("career-title").textContent.includes("결산"),
    `이적 뒤 결산 화면으로 돌아온다 (${c._dom.$("career-title").textContent})`);
  // 결산 화면이 지금 리그를 알려줘요
  check(c._dom.$("career-card").innerHTML.includes(LG(3).flag),
    `결산 화면이 지금 리그를 보여준다 (${LG(3).flag} ${LG(3).name})`);
});

/* ---------- ⑨ 미리보기 숫자가 진짜 산식과 같아요 ---------- */
group("⑨ 미리보기 핀");
guard("미리보기 핀", () => {
  /* 타자 — hitPreview는 game.js의 hitP를 한 번 더 쓴 유일한 자리예요.
   * 진짜 hitP를 소스에서 뽑아 같은 값이 나오는지 전 구간에서 대조해요. */
  const clutchSrc = [
    grab(GAME, /const CLUTCH_SCALE = [^;]+;/, "CLUTCH_SCALE"),
    grab(GAME, /const transLv = [^;]+;/, "transLv"),
    grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/, "clutch"),
  ].join("\n");
  const hitPSrc = grab(GAME, /const hitP = clamp\([\s\S]*?;/, "hitP");
  // eslint-disable-next-line no-new-func
  const realHitP = new Function("S", "clamp", "oppStr", `${clutchSrc} ${hitPSrc} return hitP;`);
  const preSrc = [
    grab(SRC, /  const HIT_OPP_K = [^;]+;/, "HIT_OPP_K"),
    grab(SRC, /  const hitPreview = \(oppStr\) =>[\s\S]*?clutch\("contact"\);/, "hitPreview"),
  ].join("\n");
  // eslint-disable-next-line no-new-func
  const preview = new Function("S", "clamp", `${clutchSrc} ${preSrc} return hitPreview;`);
  let worst = 0, n = 0;
  for (let contact = 20; contact <= 170; contact += 10) {
    for (let o = 30; o <= 72; o += 2) {
      const S = stateOf({ stats: { contact, power: 0, run: 0, defense: 0, stamina: 0 } });
      const a = realHitP(S, clamp, () => o / 100);
      const b = preview(S, clamp)(o / 100);
      worst = Math.max(worst, Math.abs(a - b));
      n++;
    }
  }
  check(worst < 1e-12,
    `화면의 안타 확률이 game.js의 hitP와 한 톨까지 같다 (${n}칸 · 최대 차이 ${worst.toExponential(1)})`);

  /* 투수 — 흉내가 아니라 game.js의 crisisRuns를 그대로 돌려야 해요. */
  const src = cutFn("  function crisisPreview(oppStr, lgUp) {");
  check(/crisisRuns\(/.test(src), "위기 미리보기가 game.js의 crisisRuns를 그대로 부른다");
  check(/finally/.test(src) && /Math\.random = real/.test(src),
    "난수를 갈아끼운 뒤 finally에서 되돌린다");

  const { S, c } = playerAt(1, 5, 4.0, {
    pos: "pitcher", role: "선발 투수",
    stats: { velocity: 110, control: 110, breaking: 110, defense: 110, stamina: 110 },
    talents: { velocity: 1.3, control: 1.3, breaking: 1.3, defense: 1.3, stamina: 1.3 },
  });
  const real = Math.random;
  const a = c.crisisPreview(0.49, 0);
  const b = c.crisisPreview(0.49, 0);
  check(a === b, `같은 화면은 늘 같은 숫자를 보인다 (${a.toFixed(4)} · ${b.toFixed(4)})`);
  check(Math.random === real, "Math.random이 원래대로 돌아왔다");
  const vals = TABLE.map((l) => c.crisisPreview(0.49 + l.oppUp, l.oppUp));
  console.log(`  ⚾ 투수 위기 한 번당 실점 | ${TABLE.map((l, i) => `${l.name} ${vals[i].toFixed(3)}점`).join(" · ")}`);
  let up = true;
  for (let i = 1; i < vals.length; i++) if (!(vals[i] > vals[i - 1])) up = false;
  check(up, `tier가 올라갈수록 위기 실점이 커진다 (${vals.map((v) => v.toFixed(3)).join(" < ")})`);

  // 투수 화면도 자기 지표로 뜨는지
  c.showPosting();
  const html = c._dom.$("move-card").innerHTML;
  check(/위기 한 번당 실점/.test(html) && !/안타 확률/.test(html),
    "투수 화면은 위기 실점으로 보여준다 (타자 지표를 안 써요)");
  const pn = html.match(/(\d+\.\d\d)점 → (\d+\.\d\d)점/g) || [];
  console.log(`  ⚾ 투수 화면 | ${pn.join(" · ")}`);
  check(pn.length === TABLE.length - 1, `투수도 리그마다 숫자가 뜬다 (${pn.length}줄)`);
});

/* ---------- ⑩ 기존 FA·트레이드 회귀 ---------- */
group("⑩ FA · 트레이드 회귀");
guard("회귀", () => {
  // FA 자격·트레이드 자격이 예전 그대로 (연차 기준)
  const mk = (y) => playerAt(1, y, 3.0).c;
  check(!mk(7).faReady() && mk(8).faReady(), `FA는 8년차부터다 (7년차 ${mk(7).faReady()} · 8년차 ${mk(8).faReady()})`);
  check(!mk(1).tradeReady() && mk(2).tradeReady(), `트레이드는 2년차부터다 (1년차 ${mk(1).tradeReady()} · 2년차 ${mk(2).tradeReady()})`);

  // 해외에 나가도 FA 제안이 그 리그 구단으로 나와요
  for (const l of TABLE) {
    const { S, c } = playerAt(l.tier, 9, 5.0);
    const names = new Set(G(S, clamp, randInt).teamsOf(l));
    const offers = c.faOffers();
    check(offers.length > 0 && offers.every((o) => names.has(o.name)),
      `${l.name}에서 FA 제안이 그 리그 구단으로 나온다 (${offers.length}건)`);
    /* 화면은 자기 손으로 faOffers()를 다시 뽑아요(제안 팀이 매번 달라요).
     * 그래서 위에서 받은 목록과 이름을 맞추지 않고, **화면에 뜬 팀이 전부
     * 그 리그 구단인지**를 봐요 — 리그를 따라가는지가 이 회귀의 관심이에요. */
    c.showFa();
    const html = c._dom.$("move-card").innerHTML;
    const shown = [...html.matchAll(/<span class="offer-team">([^<]+)/g)].map((m) => m[1].trim());
    check(/FA/.test(c._dom.$("move-title").textContent) && shown.length >= 2 && shown.every((n) => names.has(n)),
      `${l.name} FA 화면이 그 리그 구단으로 그려진다 (${shown.join(" · ")})`);
  }

  // 같은 해에 FA·트레이드·포스팅 셋이 나란히 설 수 있어요 (창구가 서로 안 잡아먹어요)
  const { S, c } = playerAt(1, 9, 6.0);
  c.seasonReport();
  const ids = c._dom.$("career-actions").children.map((b) => b.id).filter(Boolean);
  check(ids.includes("btn-fa") && ids.includes("btn-trade") && ids.includes("btn-posting"),
    `9년차·WAR 6.0이면 FA·트레이드·포스팅이 함께 뜬다 (${ids.join(" / ")})`);
  check(S.league === 1, "화면을 그렸다고 리그가 바뀌지는 않는다");

  // 옛 세이브(S.league 없음)도 그대로 굴러가요
  const old = stateOf({ proYear: 9 });
  delete old.league;
  delete old.moves;
  const oc = open(old);
  old.team = oc.leagueTeams()[0];
  old.career.seasons = [{ y: 9, age: 27, war: 2.0, line: "", rank: 5, champ: false, awards: [], role: "3번 타자", team: old.team, raw: {} }];
  oc.seasonReport();
  const oldIds = oc._dom.$("career-actions").children.map((b) => b.id).filter(Boolean);
  check(!oldIds.includes("btn-posting"),
    `옛 세이브(WAR 2.0)에는 포스팅 버튼이 안 뜬다 (${oldIds.join(" / ") || "없음"})`);
  check(oc.leagueTag() === "", `옛 세이브 화면에 리그 꼬리표가 안 붙는다 ("${oc.leagueTag()}")`);
});

/* ---------- ⑪ CSS는 테마 변수 ---------- */
group("⑪ 스타일");
guard("스타일", () => {
  const block = CSS.split("\n").filter((l) => /^\.lg-|^\.lg-offer|lg-warn/.test(l.trim()) || /lg-/.test(l));
  const abs = block.filter((l) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(l) && !/var\(--/.test(l));
  check(/\.lg-offer/.test(CSS) && /\.lg-warn/.test(CSS), "포스팅 화면 스타일이 style.css에 있다");
  check(abs.length === 0, `절대색을 안 쓰고 테마 변수만 쓴다 (어긋난 줄 ${abs.length}개)`);
  for (const v of ["--sky", "--accent2", "--accent", "--line", "--dim", "--cream"]) {
    check(CSS.includes(`var(${v})`), `테마 변수 ${v}를 쓴다`);
  }
});

/* ---------- ⑫ 복귀했을 때 옛 리그가 얼어붙어 있지 않아요 ---------- */
group("⑫ 전력 드리프트와 복귀");
guard("드리프트", () => {
  const g0 = G(stateOf(), clamp, randInt);
  const kbo = g0.teamsOf(LG(1)), jp = g0.teamsOf(LG(2)), cont = g0.teamsOf(LG(3));

  /* ⓐ 옛 세이브 항등 — KBO만 뛴 세이브는 예전과 난수 한 톨까지 같아야 해요.
   * 드리프트가 다른 리그까지 훑으면 여기서 난수 횟수가 늘어나 순위표가 통째로 튑니다. */
  {
    const S = stateOf();
    delete S.league;
    const c = open(S);
    S.team = kbo[0];
    for (const t of kbo) c.teamStrOf(t);      // 첫 시즌이 만드는 상태예요
    let calls = 0;
    const real = Math.random;
    Math.random = () => { calls++; return real(); };
    try { c.driftTeamStr(); } finally { Math.random = real; }
    check(calls === kbo.length, `옛 세이브의 드리프트가 난수를 ${kbo.length}번만 쓴다 (${calls}회)`);
    const touched = Object.keys(S.teamStr);
    check(touched.length === kbo.length && touched.every((t) => kbo.includes(t)),
      `옛 세이브는 KBO 구단만 흔든다 (${touched.length}팀)`);
  }

  /* ⓑ 해외에 나가 있어도 KBO 전력이 얼어붙지 않아요.
   * 예전에는 지금 리그만 흔들어서, 5년 뒤 복귀하면 5년 전 순위표가 그대로 살아났어요. */
  {
    const S = stateOf({ league: LG(3).id });
    const c = open(S);
    for (const t of kbo) c.teamStrOf(t);      // KBO에서 뛰던 시절이에요
    S.team = cont[0];
    /* 시즌마다 값이 달라졌는지를 봐요. 처음과 끝만 견주면 8번 흔들려 우연히 제자리로
     * 돌아온 팀이 '안 흔들렸다'로 잘못 잡혀요 (실제로 한 번 그렇게 흔들렸어요). */
    let prev = kbo.map((t) => S.teamStr[t]);
    const moved = kbo.map(() => false);
    for (let i = 0; i < 8; i++) {
      c.driftTeamStr();
      const now = kbo.map((t) => S.teamStr[t]);
      now.forEach((v, j) => { if (v !== prev[j]) moved[j] = true; });
      prev = now;
    }
    const after = kbo.map((t) => S.teamStr[t]);
    check(moved.every(Boolean),
      `${NAME(3)}에 있는 동안에도 ${NAME(1)} 구단 전력이 계속 흔들린다 (${moved.filter(Boolean).length}/${kbo.length}팀)`);
    // 울타리는 그 리그 것을 써요 — KBO 팀이 대륙 울타리로 끌려가면 복귀 순간 리그가 뒤집혀요
    const band = g0.driftBandOf(LG(1));
    check(after.every((v) => v >= band[0] - 1e-9 && v <= band[1] + 1e-9),
      `떠나 있어도 ${NAME(1)} 울타리(${band[0]}~${band[1]})를 지킨다 (${Math.min(...after)}~${Math.max(...after)})`);
    // 가본 적 없는 리그는 만들지 않아요 (없는 구단까지 만들면 난수 흐름이 달라져요)
    check(jp.every((t) => typeof S.teamStr[t] !== "number"),
      `가본 적 없는 ${NAME(2)} 구단은 만들지 않는다`);
  }
});

/* ---------- ⑬ 결산 헤더는 '그 시즌에 뛴 팀'이에요 ----------
 *
 * 🐛 결산 화면에서 그대로 포스팅을 하면 화면이 다시 그려져요. 예전에는 헤더가 S.team
 * (=방금 옮긴 새 팀)을 써서, **지난 시즌 성적 옆에 새 팀 이름**이 붙었어요.
 * 사용자 눈에는 그 시즌을 새 팀에서 뛴 것처럼 보입니다.
 * 여기서는 세이브를 손으로 꾸미지 않고, 시즌을 실제로 굴린 뒤 화면 버튼을 눌러 옮기고
 * 그 화면을 읽어서 확인해요. */
group("⑬ 결산 헤더의 소속");

/* 한 시즌을 실제로 굴린 뒤 결산 화면을 그려요 — 이 태스크의 입구예요. */
function playedReport(tier) {
  const { S, c } = playerAt(tier, 7, 3.0);
  playYear(S, c);                       // 진짜 시즌 하나 (기록도 게임이 직접 씁니다)
  c.seasonReport();
  return { S, c };
}
const headLine = (c) => {
  const m = /<div class="draft-team">([\s\S]*?)<\/div>/.exec(c._dom.$("career-card").innerHTML);
  return m ? m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
};
const nextLine = (c) => {
  const m = /<div class="hint next-club">([\s\S]*?)<\/div>/.exec(c._dom.$("career-card").innerHTML);
  return m ? m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";
};

guard("이적 직후 헤더", () => {
  /* 열도 → KBO 복귀로 걸어가요. 내려가는 경로는 문턱이 없어서(③) 성적과 무관하게
   * 언제나 열려 있고, 그래서 이 검사가 난수에 흔들리지 않아요. */
  const { S, c } = playedReport(2);
  const played = S.team, playedYear = S.proYear;
  check(headLine(c).startsWith(played), `이적 전 헤더가 지금 팀이다 (${headLine(c)})`);

  const btn = c._dom.$("career-actions").children.find((b) => b.id === "btn-posting");
  check(!!btn, "결산 화면에 포스팅 버튼이 있다");
  btn.onclick();
  const gates = c.postingGates();
  const iKbo = gates.findIndex((g) => g.league.tier === 1);
  const rows = c._dom.$("move-card").querySelectorAll(".offer");
  check(iKbo >= 0 && !rows[iKbo].disabled, `${NAME(1)} 복귀 칸이 열려 있다`);
  rows[iKbo].onclick();
  const clubs = c._dom.$("move-card").querySelectorAll(".offer");
  clubs[0].onclick();                   // 👉 실제로 옮겨요 — 화면이 결산으로 돌아와요

  check(S.team !== played && S.league === LG(1).id,
    `이적이 실제로 일어났다 (${played} → ${S.team})`);
  const head = headLine(c);
  console.log(`  이적 뒤 헤더 | ${head}`);
  console.log(`  이적 뒤 안내 | ${nextLine(c)}`);
  check(head.startsWith(played),
    `헤더가 **그 시즌에 뛴 팀**이다 (${playedYear}년차 ${played} · 화면 "${head}")`);
  check(!head.includes(S.team),
    `헤더에 방금 옮긴 팀(${S.team})이 안 섞인다`);
  check(head.includes(LG(2).flag) && head.includes(LG(2).short),
    `리그 꼬리표도 그 시즌의 리그다 (${LG(2).flag} ${LG(2).short})`);
  check(!head.includes(LG(1).flag), `지금 리그(${NAME(1)})가 헤더에 안 붙는다`);
  // 새 소속이 사라지면 안 돼요 — 자리만 옮긴 거예요
  const nx = nextLine(c);
  check(nx.includes(S.team) && nx.includes(LG(1).name),
    `새 소속은 '다음 시즌 소속' 줄에 따로 뜬다 ("${nx}")`);
});

guard("회귀 — 이적 안 한 시즌", () => {
  for (const tier of [1, 2]) {
    const { S, c } = playedReport(tier);
    const head = headLine(c);
    check(head.startsWith(S.team), `${NAME(tier)} — 안 옮긴 시즌은 헤더가 지금 팀 그대로다 (${head})`);
    check(head.includes(c.leagueTag().trim() || S.team),
      `${NAME(tier)} — 리그 꼬리표가 예전과 같다 ("${c.leagueTag()}")`);
    check(nextLine(c) === "", `${NAME(tier)} — 안 옮겼으면 '다음 시즌 소속' 줄이 안 뜬다`);
  }
});

/* 옛 세이브에는 시즌 기록에 team·league가 없어요. 그건 S.moves에서 역산해요.
 * 오프시즌 이적은 **다음** 시즌부터, 시즌 중 트레이드는 **그** 시즌부터 새 팀이에요 —
 * 야구에는 시즌 중 트레이드가 있어서 이 구분이 없으면 한 해가 통째로 어긋나요. */
guard("옛 세이브 역산", () => {
  const mkOld = (moves, over = {}) => {
    const S = stateOf({ proYear: 9, moves, ...over });
    const c = open(S);
    S.team = over.team != null ? over.team : c.leagueTeams()[0];
    // 옛 형식 — team·league가 없는 시즌 기록이에요
    S.career.seasons = [{ y: 9, age: 30, war: 3.0, line: "타율 0.300", rank: 4, champ: false, awards: [], role: S.role, raw: {} }];
    c.seasonReport();
    return { S, c };
  };
  const A = "옛소속", B = "새소속";

  // ① 8년차 오프시즌 이적 → 9년차는 새 팀에서 뛰었어요
  let r = mkOld([{ y: 8, from: A, to: B, type: "fa", inSeason: false }], { team: B });
  check(headLine(r.c).startsWith(B), `8년차 오프시즌 이적 → 9년차 소속은 ${B} (${headLine(r.c)})`);

  // ② 9년차 오프시즌 이적 → 9년차는 아직 옛 팀이에요 (이게 이 버그의 자리예요)
  r = mkOld([{ y: 9, from: A, to: B, type: "fa", inSeason: false }], { team: B });
  check(headLine(r.c).startsWith(A), `9년차 오프시즌 이적 → 9년차 소속은 아직 ${A} (${headLine(r.c)})`);

  // ③ 9년차 시즌 중 트레이드 → 그 시즌부터 새 팀이에요
  r = mkOld([{ y: 9, from: A, to: B, type: "trade", inSeason: true }], { team: B });
  check(headLine(r.c).startsWith(B), `9년차 시즌 중 트레이드 → 9년차 소속은 ${B} (${headLine(r.c)})`);
  check(/시즌 중/.test(r.c._dom.$("career-card").innerHTML),
    "이적 이력이 시즌 중 트레이드라고 알려준다");

  // ④ inSeason이 없는 더 옛 기록은 전부 오프시즌 이적이에요
  r = mkOld([{ y: 9, from: A, to: B, type: "fa" }], { team: B });
  check(headLine(r.c).startsWith(A), `inSeason이 없는 옛 이력은 오프시즌으로 본다 (${headLine(r.c)})`);

  // ⑤ 리그도 역산해요 — 9년차 오프시즌에 KBO→대륙이면 9년차는 아직 KBO예요
  r = mkOld([{ y: 9, from: A, to: B, type: "post", inSeason: false, fromLeague: LG(1).id, league: LG(3).id }],
    { team: B, league: LG(3).id });
  const h5 = headLine(r.c);
  check(h5.startsWith(A) && !h5.includes(LG(3).flag),
    `9년차 오프시즌 포스팅 → 9년차 헤더는 ${NAME(1)}의 ${A} (${h5})`);
  check(nextLine(r.c).includes(LG(3).name), `'다음 시즌 소속'이 ${NAME(3)}이라고 알려준다 (${nextLine(r.c)})`);

  /* ⑥ 두 번 옮긴 커리어 — 5년차에 국내→열도, 9년차 오프시즌에 열도→대륙.
   *    9년차 시즌은 **열도**에서 뛴 거예요. 지금 리그(대륙)로 떨어지면 안 돼요. */
  const MID = "열도팀";
  r = mkOld([
    { y: 5, from: A, to: MID, type: "post", inSeason: false, fromLeague: LG(1).id, league: LG(2).id },
    { y: 9, from: MID, to: B, type: "post", inSeason: false, fromLeague: LG(2).id, league: LG(3).id },
  ], { team: B, league: LG(3).id });
  const h6 = headLine(r.c);
  check(h6.startsWith(MID) && h6.includes(LG(2).flag) && !h6.includes(LG(3).flag),
    `두 번 옮겨도 9년차 헤더는 ${NAME(2)}의 ${MID}다 (${h6})`);

  // ⑦ 이적 이력이 아예 없는 옛 세이브 — 지금 팀으로 떨어지고 안 깨져요
  r = mkOld([]);
  check(headLine(r.c).startsWith(r.S.team), `이적 이력이 없으면 지금 팀으로 그린다 (${headLine(r.c)})`);
  const noMoves = stateOf({ proYear: 9 });
  delete noMoves.moves;
  const nc = open(noMoves);
  noMoves.team = nc.leagueTeams()[0];
  noMoves.career.seasons = [{ y: 9, age: 30, war: 1.0, line: "타율 0.250", rank: 6, champ: false, awards: [], role: "3번 타자", raw: {} }];
  nc.seasonReport();
  check(headLine(nc).startsWith(noMoves.team), `S.moves가 아예 없어도 안 깨진다 (${headLine(nc)})`);
});

/* ---------- ⑭ 버튼 문구가 안 잘려요 ----------
 * 결산 버튼은 3열로 서요(.draft-actions는 flex · flex-basis 140px). 문구가 길면
 * 폰에서 잘려요 — 실제로 "FA 선언 (8년차 자"까지만 보였어요.
 * 기준은 안 잘리는 버튼("🔁 트레이드 요청")이에요. */
group("⑭ 버튼 문구 길이");
guard("문구 길이", () => {
  const len = (t) => Array.from(t || "").length;
  const BAR = "🔁 트레이드 요청";
  const seen = [];
  // 국내(FA·트레이드·포스팅이 함께 서는 자리)와 해외(리그 복귀)를 둘 다 봐요
  for (const [tier, y, war] of [[1, 9, 6.0], [3, 9, 1.0]]) {
    const { c } = playerAt(tier, y, war);
    c.seasonReport();
    for (const b of c._dom.$("career-actions").children) {
      if (!b || !b.textContent) continue;
      seen.push(b.textContent);
      /* 기준은 같은 줄에 서는 보조 버튼(btn-ghost)끼리 재요. 맨 앞의 캠프 버튼은
       * btn-primary라 폭을 먼저 가져가고, 안 잘리는 게 이미 확인된 자리예요 —
       * 이 태스크에서 한 글자도 안 건드렸습니다. */
      if (!b.className.includes("btn-ghost")) { console.log(`  (기준 밖) ${b.textContent} — btn-primary`); continue; }
      check(len(b.textContent) <= len(BAR),
        `"${b.textContent}" ${len(b.textContent)}자 ≤ 기준 "${BAR}" ${len(BAR)}자`);
    }
  }
  console.log(`  결산 버튼 | ${[...new Set(seen)].join(" / ")}`);
  check(seen.some((t) => /해외 진출/.test(t)), `해외 진출 버튼이 그대로 있다 (회귀)`);
  check(seen.some((t) => /리그 복귀/.test(t)), `리그 복귀 버튼이 그대로 있다 (회귀)`);
  check(!seen.some((t) => /\(/.test(t)), `괄호로 늘어난 문구가 없다 (${seen.filter((t) => /\(/.test(t)).join(" / ") || "없음"})`);
});

/* ---------- ⑮ 훈련 화면이 어느 리그인지 알려줘요 ----------
 * 해외에서 뛰는 동안 화면 어디에도 리그가 크게 안 보였어요 (팀 이름 뒤 꼬리표뿐).
 * HUD에 배지를 달고 순위표 제목에도 리그를 적어요. KBO는 예전 화면 그대로예요. */
group("⑮ 훈련 화면의 리그 표시");
guard("훈련 화면", () => {
  for (const l of TABLE) {
    const { S, c } = playerAt(l.tier, 5, 3.0);
    c.startCamp();
    c.initSeason();
    c.renderPro();                                  // 👉 훈련 화면 그 자체예요
    const hud = c._dom.$("pro-team").innerHTML;
    const sum = c._dom.$("pro-standings-sum").textContent;
    console.log(`  ${l.flag} ${l.name} | HUD ${hud.replace(/<[^>]*>/g, "").trim()} | 순위표 ${sum}`);
    if (l.id === 1) {
      // KBO는 한 글자도 안 바뀌어요 (예전 형식 그대로)
      check(!/lg-badge/.test(hud), "KBO — 훈련 화면에 리그 배지가 안 붙는다 (회귀)");
      check(hud.startsWith(`⚾ ${S.team} · `), `KBO — HUD 문구가 예전 그대로다 (${hud})`);
      check(sum === `📊 ${c.myRank()}위 · ${S.season.teamW}승 ${S.season.teamL}패`,
        `KBO — 순위표 제목이 예전 그대로다 (${sum})`);
    } else {
      check(/class="lg-badge"/.test(hud), `${l.name} — 훈련 화면 HUD에 리그 배지가 붙는다`);
      check(hud.includes(l.flag) && hud.includes(l.name),
        `${l.name} — 배지에 리그 이름이 그대로 보인다 (${hud.replace(/<[^>]*>/g, "").trim()})`);
      check(hud.includes(S.team), `${l.name} — 팀 이름도 그대로 있다 (${S.team})`);
      check(sum.includes(l.flag) && sum.includes(l.name),
        `${l.name} — 순위표 제목에도 리그가 적힌다 (${sum})`);
    }
  }
  // 배지 스타일이 style.css에 있고 테마 변수만 써요
  const badge = CSS.split("\n").filter((l) => /lg-badge|next-club/.test(l) || /^\s{2}[a-z-]+:/.test(l));
  check(/\.lg-badge \{/.test(CSS), "리그 배지 스타일이 style.css에 있다");
  const abs = CSS.split(/\}/).filter((b) => /lg-badge|next-club/.test(b))
    .filter((b) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(b));
  check(abs.length === 0, `배지·안내 줄이 절대색을 안 쓴다 (어긋난 규칙 ${abs.length}개)`);
  void badge;
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
