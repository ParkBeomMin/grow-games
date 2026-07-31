/* 🏛️ 명예의 전당 리그 가중 — 상은 '어느 리그에서 받았는지'만큼 남아요.
 *
 * 앞의 세 검사가 지키는 자리와 겹치지 않아요.
 *  · tests/rookie/league-test.js — 리그마다 성적이 얼마나 내려가는가, 그리고 사다리
 *    (⑫가 '명예의 전당 점수'로 다시 잰 곡선이라 이 파일과 짝이에요)
 *  · tests/rookie/club-test.js   — 구단 전력을 올려도 팀 승률이 안 무너지는가
 *  · tests/rookie/posting-test.js — 거기로 갈 자격이 있는가, 화면에 닿는가
 *  · 이 파일                      — **그 상이 점수에 실제로 얹히는가**
 *
 * ⚠️ 이 파일이 지키는 가장 중요한 자리는 '옛 세이브'예요.
 * ⚽ 축구에서 `S.career.mvpW = (S.career.mvpW || 0) + prestige`로 썼다가,
 * MVP 4회짜리 세이브가 5번째를 받는 순간 지난 4회가 통째로 사라졌어요(200점 → 50점).
 * ④가 그 사고를 그대로 재현해서, 지금 구현이 거기 안 빠지는지 봅니다.
 *
 * 값을 옮겨 적지 않아요. 배점도 위세도 전부 소스에서 잘라내 그대로 돌립니다.
 * eval("const x = …")은 쓰지 않아요 (선언이 eval 자기 스코프에 갇혀서 밖으로 안 새요).
 * career.js 함수는 tests/rookie/posting-test.js와 같은 방식으로,
 * with(스코프) 안에서 실제 소스를 돌려요. 채우지 않은 이름은 스텁이 받아줍니다.
 *
 * 시즌은 흉내내지 않고 **게임 입구로 걸어가서** 굴려요 — 캠프 → 144경기 → 가을야구 →
 * 결산(finishSeason)까지가 한 사슬이고, 수상 판정과 가중은 그 끝에 붙어 있어요. */
"use strict";
const fs = require("fs");

const BASE = process.env.ROOKIE || "/workspace/grow-games/beta/rookie";
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const POST = fs.readFileSync(`${BASE}/postseason.js`, "utf8");

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
 * querySelectorAll(".offer")는 그 문자열에서 버튼을 긁어 같은 객체를 돌려줘요. */
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
          const di = /data-i="(\d+)"/.exec(m[0]);
          out.push({ dataset: { i: di ? di[1] : undefined }, className: m[1], disabled: /\sdisabled(\s|>)/.test(m[0]), onclick: null });
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
  return { $, reg, document: { createElement: mk, getElementById: $, querySelector: () => mk("div") } };
}

/* ---------- career.js 쪽 — 실제 소스를 with(스코프) 안에서 돌려요 ---------- */
function cutFn(header) {
  const lines = SRC.split("\n");
  const i = lines.findIndex((l) => l === header);
  if (i < 0) throw new Error(`함수를 못 찾았어요: ${header}`);
  for (let j = i + 1; j < lines.length; j++) if (lines[j] === "  }") return lines.slice(i, j + 1).join("\n");
  throw new Error(`함수 끝을 못 찾았어요: ${header}`);
}
/* const 묶음을 먼저 깔고 함수 선언을 뒤에 붙여요 (const는 TDZ가 있고, 함수는 호이스팅돼요). */
const CAREER_CONSTS = [
  ["SEASON_TOTAL", /  const SEASON_TOTAL = [^;]+;/],
  // ⚾ 리그별 경기 수 — 스텁이 받으면 S.season.total이 undefined가 돼서 시즌이 0경기로 끝나요
  ["seasonTotal", /  const seasonTotal = [^;]+;/],
  ["curTotal", /  const curTotal = [^;]+;/],
  ["leagueTeams", /  const leagueTeams = [^;]+;/],
  ["ROUND_ORDER", /  const ROUND_ORDER = [^;]+;/],
  ["inPost", /  const inPost = [^;]+;/],
  ["KS_LABEL", /  const KS_LABEL = \{[^\n]*\};/],
  ["postLabel", /  const postLabel = \(round\) =>[\s\S]*?;\n/],
  ["leagueTagOf", /  const leagueTagOf = \(id\) => \{[\s\S]*?\n  \};/],
  ["leagueTag", /  const leagueTag = \(\) => \{[\s\S]*?\n  \};/],
  // 📊 그 시즌에 뛴 소속을 역산하는 쪽이에요 — 스텁이 받으면 결산 헤더가 조용히 비어요
  ["moveFrom", /  const moveFrom = [^;]+;/],
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
  // 🏛️ 이 태스크가 더한 것 — 읽는 쪽이에요
  ["awardW", /  const awardW = [^;]+;/],
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
  "  function myRank() {",
  "  function enterPostseason() {",
  "  function advancePostseason(seed) {",
  "  function finishProGame(win, perf) {",
  "  function finishPostGame(win, perf) {",
  "  function postStatLine() {",
  // 🏛️ 이 태스크가 더한 것 — 쓰는 쪽이에요. 스텁이 받아버리면 12시즌이 가중 없이 지나가요
  "  function addAwardWeight(awards, pre) {",
  "  function finishSeason() {",
  "  function teamOfYear(y, st) {",
  "  function leagueOfYear(y, st) {",
  "  function playedAt(s, st) {",
  "  function seasonReport() {",
  "  function moveActions(list) {",
  "  function gateFor(from, to) {",
  "  function postingGates() {",
  "  function crisisPreview(oppStr, lgUp) {",
  "  function postingRow(g, i, cur, mine) {",
  "  function showPosting() {",
  "  function moveToLeague(lg, team) {",
  "  function gradeOfScore(sc) {",
  "  function weightNote(c) {",
  "  function careerScore() {",
  "  function retireSummary() {",
  "  function enshrine(team) {",
].filter((h, i, arr) => arr.indexOf(h) === i);
const CAREER_SRC = [
  ...CAREER_CONSTS.map(([n, re]) => grab(SRC, re, n)),
  ...CAREER_FNS.map(cutFn),
].join("\n");
const EXPORTS = ["SEASON_TOTAL", "seasonTotal", "curTotal", "leagueTeams", "inPost", "mySeries", "leagueTag", "lastWar",
  "postingGates", "postingOffers", "leagueMetric", "metricTxt",
  "startCamp", "initSeason", "gameWinP", "enterPostseason", "advancePostseason",
  "finishProGame", "finishSeason", "seasonReport", "showPosting", "moveToLeague",
  "addAwardWeight", "awardW", "careerScore", "gradeOfScore", "weightNote", "retireSummary", "enshrine"];

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

/* 한 판(세이브 하나)을 열어요. 은퇴식(enshrine)까지 걸어가야 해서 명예의 전당 저장소와
 * 유산도 상자로 받아둡니다 — 실제 localStorage 대신이에요. */
function open(S) {
  const g = G(S, clamp, randInt);
  const dom = makeDom();
  const hof = [];
  const store = Object.assign({}, g, {
    S, Postseason, clamp, rand, randInt, shuffle, pick,
    $: dom.$, document: dom.document,
    window: {},
    confirm: () => true,
    show: () => {},
    save: () => {},
    clearSave: () => {},
    loadHof: () => hof,
    // ⚠️ list가 loadHof()가 준 그 배열일 수 있어요 — 먼저 복사하지 않으면 통째로 비워져요
    saveHof: (list) => { const copy = list.slice(); hof.length = 0; hof.push(...copy); },
    loadLegacy: () => ({ pts: 0, gen: 0 }),
    transcendTitle: () => "",
    playFeeds: (title, feeds, onDone) => { store._feeds = feeds; if (onDone) onDone(); },
  });
  const c = makeCareer(scopeOf(store));
  c._dom = dom;
  c._store = store;
  c._hof = hof;
  return c;
}
const stateOf = (over = {}) => ({
  name: "테스터", pos: "batter", role: "3번 타자", age: 24, condition: 80,
  proYear: 0, money: 0, trans: {}, scout: 0, camp: 0, trophies: [],
  stats: { contact: 150, power: 150, run: 150, defense: 150, stamina: 150 },
  talents: { contact: 1.3, power: 1.3, run: 1.3, defense: 1.3, stamina: 1.3 },
  career: { seasons: [], roy: 0, mvp: 0, gg: 0, rings: 0, warSum: 0 },
  proLog: [], teamStr: {}, season: null, post: null, moves: [],
  ...over,
});

const TABLE = G(stateOf(), clamp, randInt).LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const LG = (tier) => TABLE.find((l) => l.tier === tier);
const NAME = (tier) => LG(tier).name;

/* 🏏 시즌을 통째로 굴려요 — 캠프 → 그 리그의 경기 수 → 가을야구 → 결산.
 * 타석 판정은 화면(game.js) 안에 있어서 여기서는 못 불러요. 그래서 경기마다 넘기는
 * 성적(perf)을 우리가 정합니다 — 이 파일이 재는 건 '무엇을 받았을 때 점수가 어떻게
 * 남는가'지, '얼마나 잘 치는가'가 아니에요. 그건 league-test가 재요.
 * MONSTER는 WAR 상한(12)에 닿는 성적이라 **리그와 무관하게 언제나 같은 WAR**이 나와요.
 * 그래야 리그 사이 점수 차이가 오직 위세에서 온 것이 됩니다. */
const MONSTER = { ab: 4, hits: 4, hr: 2, sb: 1 };
const QUIET = { ab: 4, hits: 0, hr: 0, sb: 0 };
function playYear(S, c, perf) {
  c.startCamp();
  c.initSeason();
  // 경기 수는 리그마다 달라요 — initSeason이 적어준 total만큼 굴려요
  for (let g = 0; g < S.season.total; g++) {
    c.finishProGame(Math.random() < c.gameWinP(), perf);
    S.condition = 80;
  }
  c.enterPostseason();
  let n = 0;
  while (c.inPost() && n++ < 60) {
    c.finishProGame(Math.random() < c.gameWinP(), perf);
    const s = c.mySeries();
    if (s && s.done) c.advancePostseason();
  }
  if (S.post && S.post.eliminated && S.post.myRound) c.advancePostseason();
  if (S.season) c.finishSeason();
  S.age = 26;                      // 노화로 능력치가 흔들리지 않게 붙잡아요
  return S.career.seasons[S.career.seasons.length - 1];
}

/* 세이브 한 판을 열고 그 리그의 구단에 앉혀요. */
function playerAt(tier, over = {}) {
  const lg = LG(tier);
  const S = stateOf({ league: lg.id, ...over });
  const c = open(S);
  S.team = c.leagueTeams()[0];
  return { S, c, lg };
}

/* 상 하나의 배점을 소스에 물어봐요 — 값을 옮겨 적지 않고, 가중 카운터를 1 올렸을 때
 * 실제 careerScore가 얼마나 오르는지로 잽니다. 배점이 바뀌어도 그대로 맞아요. */
const ZERO = { seasons: [], warSum: 0, rings: 0, mvp: 0, gg: 0, roy: 0 };
const scoreOfCareer = (career) => playerAt(1, { career: { ...career }, scout: 0, trophies: [] }).c.careerScore();
const PT = {};
for (const [k, wk] of [["mvp", "mvpW"], ["gg", "ggW"], ["roy", "royW"]]) {
  PT[k] = scoreOfCareer({ ...ZERO, [wk]: 1 }) - scoreOfCareer(ZERO);
}

/* 커리어 점수에서 **상이 남긴 몫**만 떼어낸 값이에요.
 * careerScore는 정수로 반올림해서 돌려줘서(35 = 15 × 2.3), 점수끼리 빼면 ±1이 섞여요.
 * 그래서 배수를 잴 때는 반올림 전의 이 값을 써요. 이게 진짜 점수와 같은지는
 * awardPart와 대조해서 ①에서 직접 확인합니다. */
const awardValue = (c, cr) =>
  c.awardW(cr, "mvp") * PT.mvp + c.awardW(cr, "gg") * PT.gg + c.awardW(cr, "roy") * PT.roy;

/* 실제 careerScore를 두 번 불러서(상 카운터를 지웠을 때와 그대로일 때) 그 차이를 봐요.
 * 점수 식을 여기 옮겨 적지 않는 대신 반올림 오차 ±1을 안고 갑니다. */
function awardPart(S, c) {
  const cr = S.career;
  const keys = ["mvp", "gg", "roy", "mvpW", "ggW", "royW"];
  const keep = {};
  for (const k of keys) if (k in cr) keep[k] = cr[k];
  const full = c.careerScore();
  for (const k of keys) delete cr[k];
  const bare = c.careerScore();
  for (const k of keys) if (k in keep) cr[k] = keep[k];
  return full - bare;
}

/* ---------- ① 대륙 MVP 1회가 KBO 1회보다 크고, 배수가 위세와 같아요 ---------- */
group("① 가중 실측 — 게임 입구로 걸어가서");
let ROW = null;
guard("가중 실측", () => {
  console.log(`  상 하나의 배점 | MVP ${PT.mvp} · 골든글러브 ${PT.gg} · 신인왕 ${PT.roy} (careerScore에 직접 물어봤어요)`);
  ROW = TABLE.map((l) => {
    const { S, c } = playerAt(l.tier);
    const season = playYear(S, c, MONSTER);          // 1년차 — 신인왕까지 세 상 전부
    return { l, S, c, season, val: awardValue(c, S.career), part: awardPart(S, c), score: c.careerScore() };
  });
  console.log(`  리그 | 받은 상 | 가중 카운터 | 상이 남긴 점수 | 커리어 점수`);
  for (const r of ROW) {
    console.log(`  ${r.l.name.padEnd(7)} | ${r.season.awards.join("·").padEnd(16)} | MVP ${r.S.career.mvpW} · GG ${r.S.career.ggW} · 신인왕 ${r.S.career.royW} | ${String(r.val).padStart(7)} | ${r.score}`);
  }
  const base = ROW[0];
  check(ROW.every((r) => r.season.war === base.season.war),
    `세 리그가 같은 WAR로 같은 상을 받았다 (WAR ${base.season.war} · ${base.season.awards.join("·")})`);
  check(base.season.awards.includes("MVP") && base.season.awards.includes("골든글러브") && base.season.awards.includes("신인왕"),
    `세 상을 전부 받은 시즌이다 (${base.season.awards.join("·")})`);
  for (const r of ROW) {
    const ratio = r.val / base.val;
    check(Math.abs(ratio - r.l.prestige) < 1e-9,
      `${r.l.name}에서 받은 상이 ${NAME(1)}의 ×${r.l.prestige.toFixed(2)}로 남는다 (실측 ×${ratio.toFixed(4)})`);
    // 이 값이 진짜 커리어 점수에 얹혀 있는지 — careerScore를 두 번 불러 대조해요 (반올림 ±1)
    check(Math.abs(r.part - r.val) <= 1,
      `${r.l.name} — 그 몫이 커리어 점수에 실제로 얹혀 있다 (점수 차 ${r.part} · 상 몫 ${r.val})`);
    if (r !== base) check(r.val > base.val, `${r.l.name} 쪽 점수가 실제로 더 크다 (${base.val} → ${r.val})`);
  }
});

/* ---------- ② 세 상이 같은 방식으로 가중돼요 ---------- */
group("② 세 상이 같은 방식");
guard("세 상", () => {
  /* MVP만 크게 얹으면 league-test ⑨⑩이 '상 하나라도 × 위세'로 재둔 사다리가 흔들려요.
   * 그래서 상마다 따로 굴리지 않고, 실제 addAwardWeight를 상 하나씩 불러 대조해요. */
  for (const a of ["MVP", "골든글러브", "신인왕"]) {
    const got = TABLE.map((l) => {
      const { S, c } = playerAt(l.tier);
      c.addAwardWeight([a], { mvp: 0, gg: 0, roy: 0 });
      return { l, part: awardValue(c, S.career), cr: S.career };
    });
    const r = got.map((g, i) => g.part / got[0].part);
    console.log(`  ${a.padEnd(6)} | ${got.map((g, i) => `${g.l.name} ${g.part}(×${r[i].toFixed(2)})`).join(" · ")}`);
    check(got.every((g, i) => Math.abs(r[i] - g.l.prestige) < 1e-9),
      `${a}이(가) 리그마다 정확히 위세만큼 커진다 (${r.map((v) => `×${v.toFixed(2)}`).join(" · ")})`);
    // 다른 상의 카운터는 손대지 않아요 — 상 하나가 다른 상을 오염시키면 안 돼요
    const only = got[2].cr;
    const touched = ["mvpW", "ggW", "royW"].filter((k) => only[k] != null);
    check(touched.length === 1, `${a} 하나만 받으면 가중 카운터도 하나만 생긴다 (${touched.join("·") || "없음"})`);
  }
});

/* ---------- ③ 옛 세이브 방어 — 가중 필드가 없어도 던지지 않아요 ---------- */
group("③ 옛 세이브 — 가중 필드가 없을 때");
guard("옛 세이브", () => {
  const OLD = { seasons: [], warSum: 42.5, rings: 2, mvp: 4, gg: 3, roy: 1 };
  const { S, c } = playerAt(1, { career: { ...OLD } });
  delete S.league;                                   // 옛 세이브에는 S.league도 없어요
  let score = null, threw = null;
  try { score = c.careerScore(); } catch (e) { threw = e.message; }
  check(threw === null, `가중 필드가 없어도 점수가 계산된다 (${threw || score}점)`);
  check(!("mvpW" in S.career) && !("ggW" in S.career) && !("royW" in S.career),
    "점수를 읽었다고 가중 필드가 생기지 않는다 (로드 시점 마이그레이션을 안 해요)");

  /* '옛 방식으로 계산한다'를 옮겨 적지 않고 확인해요 — 옛 카운터를 그대로 가중
   * 카운터에 넣은 세이브와 점수가 같으면, 없을 때 1배로 세고 있다는 뜻이에요. */
  const asW = playerAt(1, { career: { ...OLD, mvpW: OLD.mvp, ggW: OLD.gg, royW: OLD.roy } });
  check(score === asW.c.careerScore(),
    `가중 필드가 없으면 옛 카운터를 1배로 센다 (${score} vs ${asW.c.careerScore()})`);
  check(c.awardW(S.career, "mvp") === OLD.mvp && c.awardW(S.career, "gg") === OLD.gg,
    `awardW가 옛 카운터로 떨어진다 (MVP ${c.awardW(S.career, "mvp")} · GG ${c.awardW(S.career, "gg")})`);
});

/* ---------- ④ ⚽ 축구에서 낸 버그 — 옛 세이브가 새 상을 받는 순간 ---------- */
group("④ 옛 세이브가 새 상을 받아도 점수가 안 떨어져요");
guard("축구 버그", () => {
  for (const l of TABLE) {
    // MVP 4 · GG 3 · 신인왕 1까지 쌓아둔 옛 세이브예요 (가중 필드가 하나도 없어요)
    const { S, c } = playerAt(l.tier, {
      career: { seasons: [], warSum: 40, rings: 2, mvp: 4, gg: 3, roy: 1 },
      proYear: 5,
    });
    const before = c.careerScore();
    const beforePart = awardValue(c, S.career);
    const season = playYear(S, c, MONSTER);          // 6년차 — MVP·골든글러브를 또 받아요
    const after = c.careerScore();
    const afterPart = awardValue(c, S.career);
    console.log(`  ${l.name.padEnd(7)} | ${season.awards.join("·").padEnd(12)} | 점수 ${before} → ${after} | 상 몫 ${beforePart} → ${afterPart} | mvpW ${S.career.mvpW} · ggW ${S.career.ggW}`);
    check(season.awards.includes("MVP"), `${l.name}에서 5번째 MVP를 받았다 (${season.awards.join("·")})`);
    check(afterPart >= beforePart,
      `${l.name} — 새 상을 받고 상 몫이 안 줄었다 (${beforePart} → ${afterPart})`);
    check(S.career.mvpW === Math.round((4 + l.prestige) * 100) / 100,
      `${l.name} — 지난 MVP 4회가 1배로 살아남아 이어붙는다 (mvpW ${S.career.mvpW} · 기대 ${Math.round((4 + l.prestige) * 100) / 100})`);
    check(S.career.mvp === 5, `옛 카운터도 그대로 5회로 올라간다 (${S.career.mvp}회)`);
    check(after > before, `커리어 점수도 올라간다 (${before} → ${after})`);

    /* 축구가 냈던 버그를 그대로 재현해요 — 그때 점수가 얼마나 떨어졌을지 적어둡니다.
     * 이 줄이 있어야 "왜 이렇게 썼는지"가 다음 사람에게 남아요. */
    const buggy = { ...S.career, mvpW: 0 + l.prestige, ggW: 0 + l.prestige, royW: 0 + l.prestige };
    const bug = playerAt(l.tier, { career: buggy }).c.careerScore();
    check(bug < after, `  └ (mvpW || 0) + 위세로 썼다면 ${after} → ${bug}으로 떨어졌을 자리다`);
  }

  /* 소스에도 못을 박아요 — 옛 카운터를 이어받는 자리가 실제로 있는지. */
  const fn = cutFn("  function addAwardWeight(awards, pre) {");
  check(/!= null \? S\.career\[k \+ "W"\]/.test(fn) || /!= null[\s\S]*?pre/.test(fn),
    "가중 카운터가 없을 때 옛 카운터(pre)로 떨어지는 갈래가 소스에 있다");
  check(!/\(\s*S\.career\[[^\]]+\]\s*\|\|\s*0\s*\)\s*\+\s*prestige/.test(fn),
    "축구가 낸 (… || 0) + prestige 꼴이 소스에 없다");
  check(/preAward/.test(cutFn("  function finishSeason() {")),
    "수상 판정 전의 카운터를 떠 두는 자리가 finishSeason에 있다 (상을 두 번 세지 않아요)");
});

/* ---------- ⑤ KBO만 뛴 커리어는 점수가 안 변해요 ---------- */
group("⑤ KBO 항등");
guard("KBO 항등", () => {
  const { S, c } = playerAt(1);
  for (let y = 0; y < 8; y++) playYear(S, c, y % 2 ? MONSTER : QUIET);
  const cr = S.career;
  console.log(`  8시즌 | MVP ${cr.mvp}(가중 ${cr.mvpW}) · GG ${cr.gg}(가중 ${cr.ggW}) · 신인왕 ${cr.roy}(가중 ${cr.royW}) · 점수 ${c.careerScore()}`);
  check(cr.mvp > 0 && cr.gg > 0, `KBO에서 실제로 상을 받았다 (MVP ${cr.mvp} · GG ${cr.gg})`);
  check(cr.mvpW === cr.mvp && cr.ggW === cr.gg,
    `KBO의 가중 카운터가 옛 카운터와 완전히 같은 숫자다 (위세 1이라 항등이에요 · MVP ${cr.mvpW}/${cr.mvp} · GG ${cr.ggW}/${cr.gg})`);
  check(["mvp", "gg", "roy"].every((k) => c.awardW(cr, k) === cr[k]),
    "한 번도 안 받은 상은 가중 카운터가 아예 안 생기고, 읽을 때 옛 카운터로 떨어진다");

  // 가중 카운터를 통째로 지워도 점수가 한 톨도 안 바뀌어요 — 그게 '변하지 않는다'예요
  const full = c.careerScore();
  const bare = playerAt(1, { career: { ...cr, mvpW: undefined, ggW: undefined, royW: undefined } }).c.careerScore();
  check(full === bare, `가중 카운터가 있든 없든 KBO 커리어의 점수가 같다 (${full} vs ${bare})`);
  check(c.weightNote(cr) === "", `KBO 커리어에는 위세 문구가 안 붙는다 ("${c.weightNote(cr)}")`);
  // 등급도 같은 자리에 있어야 해요
  check(c.gradeOfScore(full) === c.gradeOfScore(bare), `등급도 같다 (${c.gradeOfScore(full)})`);
});

/* ---------- ⑥ 결산·은퇴 화면에 지금 리그가 보여요 ---------- */
group("⑥ 화면에 리그가 보여요");
guard("리그 표시", () => {
  for (const l of TABLE) {
    const { S, c } = playerAt(l.tier);
    playYear(S, c, MONSTER);
    c.seasonReport();
    const html = c._dom.$("career-card").innerHTML;
    const want = l.id === 1 ? true : html.includes(l.flag);
    check(want, `${l.name} — 결산 화면이 지금 리그를 보여준다 (${l.flag} ${l.short})`);
    const sum = c.retireSummary();
    // KBO는 꼬리표가 안 붙어요 — 다른 리그의 깃발이 하나도 없어야 그게 확인돼요
    check(l.id === 1 ? TABLE.filter((x) => x.id !== 1).every((x) => !sum.includes(x.flag)) : sum.includes(l.flag),
      `${l.name} — 은퇴 확인창에 지금 리그가 적힌다 (${sum.split("\n")[0].trim()})`);
    // 은퇴식 화면 — 여기서 S가 지워지니 이 세이브는 여기서 끝이에요
    c.enshrine(S.team);
    const bye = c._dom.$("career-card").innerHTML;
    check(l.id === 1 ? true : bye.includes(l.flag),
      `${l.name} — 은퇴식 화면에도 리그가 남는다`);
    const entry = c._hof[c._hof.length - 1];
    check(entry && entry.league === l.id,
      `${l.name} — 명예의 전당 기록에 리그가 남는다 (league ${entry ? entry.league : "없음"})`);
    check(entry && entry.mvpW === Math.round(l.prestige * 100) / 100,
      `${l.name} — 명예의 전당 기록에 가중 MVP가 남는다 (${entry ? entry.mvpW : "없음"})`);
    if (l.id !== 1) {
      check(new RegExp(`리그 위세로 ×${l.prestige.toFixed(2)}`).test(bye),
        `${l.name} — 은퇴식이 상의 값어치가 몇 배인지 적어준다 (×${l.prestige.toFixed(2)})`);
    }
  }
});

/* ---------- ⑦ 이적 화면이 적은 "×2.30"이 참인가 ---------- */
group("⑦ 화면이 약속한 배수가 참이에요");
guard("화면 약속", () => {
  /* 화면 문구는 앞 태스크가 먼저 적었고, 그때는 점수에 아직 안 걸려 있었어요.
   * 그래서 여기서는 **화면에서 숫자를 읽어와서** 실제 점수와 대조해요 —
   * 소스의 prestige를 다시 읽으면 화면이 거짓말을 해도 안 들켜요. */
  const { S, c } = playerAt(1, { proYear: 7 });
  S.career.seasons = [{ y: 7, age: 26, war: 9.9, line: "", rank: 1, champ: false, awards: [], role: S.role, team: S.team, raw: {} }];
  c.showPosting();
  const html = c._dom.$("move-card").innerHTML;
  const rows = [...html.matchAll(/<span class="offer-team">([^<]*?)([가-힣 ]+리그)[^<]*<\/span>\s*<span class="offer-str">[^<]*리그 위세 ×(\d+\.\d\d)/g)];
  check(rows.length === TABLE.length - 1,
    `이적 화면에서 리그마다 위세 배수를 읽었다 (${rows.map((m) => `${m[2].trim()} ×${m[3]}`).join(" · ")})`);

  const kbo = playerAt(1);
  playYear(kbo.S, kbo.c, MONSTER);
  const kboPart = awardValue(kbo.c, kbo.S.career);
  for (const m of rows) {
    const name = m[2].trim(), shown = Number(m[3]);
    const lg = TABLE.find((l) => l.name === name);
    check(!!lg, `화면의 "${name}"이 실제 리그다`);
    const p = playerAt(lg.tier);
    playYear(p.S, p.c, MONSTER);
    const part = awardValue(p.c, p.S.career);
    const real = part / kboPart;
    console.log(`  ${name} | 화면 ×${shown.toFixed(2)} · 실제 ×${real.toFixed(4)} (상 몫 ${kboPart} → ${part})`);
    check(Math.abs(real - shown) < 1e-9,
      `화면이 적은 ×${shown.toFixed(2)}가 커리어 점수에서 그대로 지켜진다 (실측 ×${real.toFixed(4)})`);
  }

  // 화면이 약속한 문장 자체도 그대로 있어야 해요
  check(/명예의 전당에 남는/.test(html) && /값어치/.test(html),
    "화면이 '상이 명예의 전당에 남는 값어치'라고 적어둔 문장이 그대로 있다");
});

/* ---------- ⑧ 한 번 받은 상은 복귀해도 안 깎여요 ---------- */
group("⑧ 받을 때의 리그로 남아요");
guard("복귀", () => {
  const { S, c } = playerAt(3);
  playYear(S, c, MONSTER);                            // 대륙에서 세 상
  const abroad = awardValue(c, S.career);
  c.moveToLeague(LG(1), G(S, clamp, randInt).teamsOf(LG(1))[0]);
  const home = awardValue(c, S.career);
  check(abroad === home,
    `${NAME(3)}에서 받은 상은 ${NAME(1)}로 복귀해도 그대로다 (${abroad} → ${home})`);
  check(S.league === LG(1).id, `실제로 ${NAME(1)}로 돌아왔다 (league ${S.league})`);

  // 그다음 KBO 시즌의 상은 1배로 붙어요 — '지금 리그'가 아니라 '받을 때 리그'예요
  const mvpW0 = S.career.mvpW;
  playYear(S, c, MONSTER);
  check(S.career.mvpW === Math.round((mvpW0 + 1) * 100) / 100,
    `복귀 뒤 받은 MVP는 ×1.00으로 붙는다 (${mvpW0} → ${S.career.mvpW})`);

  /* warSum에는 위세를 안 걸어요. 왜 안 거는지의 실측 근거는 league-test ⑫에 있어요
   * (걸면 능력치 100 구간의 최적이 KBO를 벗어나서 사다리 아랫칸이 무너져요).
   * 여기서는 구조만 못 박아요 — 커리어 점수는 지금 리그를 아예 안 읽어야 해요. */
  const src = cutFn("  function careerScore() {");
  check(!/leagueOf|prestige|S\.league/.test(src),
    "careerScore가 '지금 리그'를 아예 안 읽는다 (warSum·우승에 위세가 안 걸려요)");
  check(/warSum \* 10/.test(src) && !/warSum[^\n]*prestige/.test(src),
    "warSum 항에 위세가 안 걸려 있다");
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
