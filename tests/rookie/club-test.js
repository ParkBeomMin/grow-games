/* ⚾ 해외 구단 목록과 팀 승률 — 리그를 올려도 우리 팀 승률이 무너지지 않는지 봐요.
 *
 * 리그 사다리(tests/rookie/league-test.js)는 '내가 상대하는 공'이 세지는 쪽을 지켜요.
 * 이 파일은 그 옆칸을 지킵니다 — **구단 전력**이에요.
 *
 * ⚠️ 여기가 해외 진출에서 가장 위험한 자리예요. 팀 전력은 난이도(oppUp)와 다른 통로라
 * teamWinP(내 팀 보너스) · 순위표(다른 팀 승수) · gameWinP(가을야구 상대 보정) ·
 * 가을야구 대진(S.post.str)까지 한꺼번에 흘러갑니다.
 * ⚽ 축구에서 정확히 같은 자리를 놓쳐 수비수 팀 승률이 7%가 된 적이 있어요.
 * 천장에 가려져 안 보이다가 다른 걸 고치고 나서야 드러났죠.
 * 그래서 ④가 리그 × 능력치 × 포지션 격자로 팀 승률을 직접 재고 30~85%를 못 박아요.
 * **범위를 넓히지 마세요.** 넓히는 순간 이 검사는 아무것도 안 지킵니다.
 *
 * 값을 여기 옮겨 적지 않아요. 구단 목록도 산식도 전부 소스에서 잘라내 그대로 돌려요 —
 * 옮겨 적으면 원본이 바뀌어도 초록이 뜹니다.
 * eval("const x = …")은 쓰지 않아요(선언이 eval 자기 스코프에 갇혀 밖으로 안 새요).
 * career.js 함수는 tests/cloud/career-cloud-test.js가 쓰는 방식 그대로,
 * with(스코프) 안에서 실제 소스를 돌려요. 채우지 않은 이름은 스텁이 받아줍니다. */
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

/* ---------- game.js 쪽 (리그 · 구단 목록) ---------- */
const GAME_PARTS = [
  ["REGIONS", /const REGIONS = \[[\s\S]*?\n\];/],
  ["CLUTCH_SCALE", /const CLUTCH_SCALE = [^;]+;/],
  ["transLv", /const transLv = [^;]+;/],
  ["clutch", /function clutch\(key\) \{[\s\S]*?\n\}/],
  ["clutchAvg", /function clutchAvg\(\) \{[\s\S]*?\n\}/],
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
  G = new Function("S", "clamp", `${src}
    return { LEAGUES, leagueOf, LEAGUE_CLUBS, LEAGUE_DRIFT, teamsOf, driftBandOf, clubStrOf, clutchAvg };`);
} catch (e) {
  console.log(`❌ ${e.message}`);
  process.exit(1);
}

/* ---------- postseason.js — 파일 통째로 돌려요 (window만 흉내내요) ---------- */
const win = {};
// eslint-disable-next-line no-new-func
new Function("window", POST)(win);
const Postseason = win.Postseason;
check(!!(Postseason && Postseason.buildBracket), "postseason.js에서 Postseason을 읽었다");

/* ---------- career.js 쪽 — 실제 소스를 with(스코프) 안에서 돌려요 ---------- */
// 2칸 들여쓰기 함수 하나를 통째로 잘라내요 (career-cloud-test.js와 같은 방식이에요)
function cutFn(header) {
  const lines = SRC.split("\n");
  const i = lines.findIndex((l) => l === header);
  if (i < 0) throw new Error(`함수를 못 찾았어요: ${header}`);
  for (let j = i + 1; j < lines.length; j++) if (lines[j] === "  }") return lines.slice(i, j + 1).join("\n");
  throw new Error(`함수 끝을 못 찾았어요: ${header}`);
}
const CAREER_FNS = [
  "  function teamStrOf(name) {",
  "  function driftTeamStr() {",
  "  function teamWinP() {",
  "  function gameWinP() {",
  "  function initSeason() {",
  "  function myRank() {",
  "  function enterPostseason() {",
  "  function advancePostseason(seed) {",
  "  function finishProGame(win, perf) {",
  "  function finishPostGame(win, perf) {",
];
const CAREER_CONSTS = [
  ["leagueTeams", /  const leagueTeams = [^;]+;/],
  ["inPost", /  const inPost = [^;]+;/],
  ["mySeries", /  const mySeries = [^;]+;/],
  ["postOpp", /  const postOpp = \(\) => \{[^\n]*\};/],
  ["ROUND_ORDER", /  const ROUND_ORDER = [^;]+;/],
];
const CAREER_SRC = [
  ...CAREER_CONSTS.map(([n, re]) => grab(SRC, re, n)),
  ...CAREER_FNS.map(cutFn),
].join("\n");
const EXPORTS = ["leagueTeams", "inPost", "mySeries", "postOpp",
  "teamStrOf", "driftTeamStr", "teamWinP", "gameWinP", "initSeason", "myRank",
  "enterPostseason", "advancePostseason", "finishProGame"];

/* 모르는 이름은 아무 일도 안 하는 스텁이 받아요 ($, save, playFeeds, 화면 …).
 * 진짜 전역·내장은 globalThis에서 그대로 가져와요. */
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

/* 한 판(세이브 하나)을 여는 창구예요. S와 game.js 전역이 같은 S를 보게 묶어요. */
function open(S) {
  const g = G(S, clamp);
  return makeCareer(scopeOf(Object.assign({}, g, {
    S, Postseason, clamp, rand, randInt, shuffle, pick,
    window: {}, document: undefined,
  })));
}
const stateOf = (over = {}) => ({
  name: "테스터", pos: "batter", role: "선발 투수", age: 27, condition: 80,
  proYear: 5, money: 0, trans: {},
  stats: { contact: 100, power: 100, run: 100, defense: 100, stamina: 100 },
  talents: { contact: 1.3, power: 1.3, run: 1.3, defense: 1.3, stamina: 1.3 },
  career: { seasons: [], roy: 0, mvp: 0, gg: 0 },
  teamStr: {}, season: null, post: null,
  ...over,
});

const TABLE = G(stateOf(), clamp).LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const NAME = (tier) => TABLE.find((l) => l.tier === tier).name;
const CLUBS_OF = (tier) => {
  const S = stateOf();
  const g = G(S, clamp);
  return g.LEAGUE_CLUBS[TABLE.find((l) => l.tier === tier).id];
};

/* ---------- ① 리그마다 구단이 6곳 이상이고 이름이 안 겹쳐요 ---------- */
group("① 구단 목록");
guard("구단 목록", () => {
  const all = [];
  for (const l of TABLE) {
    const clubs = CLUBS_OF(l.tier);
    check(clubs.length >= 6, `${l.name}에 구단이 6곳 이상이다 (${clubs.length}곳)`);
    all.push(...clubs.map((c) => c.name));
  }
  check(new Set(all).size === all.length,
    `구단 이름이 리그를 통틀어 겹치지 않는다 (${all.length}곳 중 서로 다른 이름 ${new Set(all).size}개)`);
  check(all.every((n) => typeof n === "string" && n.trim().length > 0), "구단 이름이 전부 비어 있지 않다");

  // 옛 세이브가 상대할 KBO 구단은 REGIONS에서 그대로 와야 해요 (마이그레이션을 하지 않아요)
  const kboFromRegions = (GAME.match(/teams: \[[^\]]*\]/g) || [])
    .flatMap((s) => s.match(/"[^"]+"/g) || []).map((s) => s.slice(1, -1));
  const kbo = CLUBS_OF(1).map((c) => c.name);
  check(kboFromRegions.length > 0 && kbo.join("|") === kboFromRegions.join("|"),
    `tier 1 구단이 REGIONS의 국내 구단 그대로다 (${kbo.length}곳)`);
  check(CLUBS_OF(1).every((c) => c.str === null),
    "KBO 구단은 전력을 못 박지 않는다 (teamStrOf가 예전처럼 뽑아요)");
  for (const t of [2, 3]) {
    check(CLUBS_OF(t).every((c) => typeof c.str === "number"),
      `${NAME(t)} 구단은 전력이 목록에 못 박혀 있다`);
  }
});

/* ---------- ② 리그가 높을수록 평균 전력이 높아요 ---------- */
group("② 리그별 평균 전력");
guard("평균 전력", () => {
  /* KBO는 목록에 값이 없어요. teamStrOf가 실제로 뽑는 값의 평균을 봐야 해요 —
   * 여기에 0.49를 적어 넣으면 뽑는 식이 바뀌어도 안 들킵니다. */
  const meanOf = (tier) => {
    const S = stateOf({ league: TABLE.find((l) => l.tier === tier).id });
    const c = open(S);
    let s = 0, n = 0;
    for (let i = 0; i < 4000; i++) {
      S.teamStr = {};
      for (const t of c.leagueTeams()) { s += c.teamStrOf(t); n++; }
    }
    return s / n;
  };
  const means = TABLE.map((l) => meanOf(l.tier));
  console.log(`  평균 전력 | ${TABLE.map((l, i) => `${l.name} ${means[i].toFixed(3)}`).join(" · ")}`);
  let up = true;
  for (let i = 1; i < means.length; i++) if (!(means[i] > means[i - 1])) up = false;
  check(up, `tier가 올라갈수록 평균 전력이 높다 (${means.map((v) => v.toFixed(3)).join(" < ")})`);
  // teamStrOf와 같은 눈금이어야 해요 — 0.49가 한가운데고, 사람이 읽을 수 있는 폭이에요
  const inScale = TABLE.every((l, i) => means[i] > 0.3 && means[i] < 0.75);
  check(inScale, "평균 전력이 teamStrOf와 같은 눈금(0.3~0.75) 안에 있다");
});

/* ---------- ③ 실제 구단명을 쓰지 않아요 ---------- */
group("③ 가상 명칭");
guard("가상 명칭", () => {
  /* 이 저장소는 상표를 전부 가상 명칭으로 바꿨어요 (KBO 구단명도 그래서 바꿨습니다).
   * KBO · 열도(NPB) · 대륙(MLB)에 실제로 있는 별칭을 한글·영문으로 모아 걸러요. */
  const REAL = [
    // KBO
    "베어스", "트윈스", "히어로즈", "랜더스", "위즈", "다이노스", "라이온스", "자이언츠", "타이거스", "이글스",
    // NPB
    "드래곤스", "카프", "스왈로즈", "베이스타즈", "호크스", "버팔로스", "마린스", "파이터스", "라이온즈",
    // MLB
    "양키스", "다저스", "레드삭스", "컵스", "메츠", "카디널스", "브레이브스", "애스트로스", "매리너스",
    "파드리스", "필리스", "파이리츠", "레인저스", "레이스", "로키스", "로열스", "가디언스", "말린스",
    "내셔널스", "오리올스", "화이트삭스", "레즈", "브루어스", "다이아몬드백스", "에인절스", "애슬레틱스",
    "블루제이스",
    // 영문
    "Bears", "Twins", "Heroes", "Landers", "Wiz", "Dinos", "Lions", "Giants", "Tigers", "Eagles",
    "Dragons", "Carp", "Swallows", "BayStars", "Hawks", "Buffaloes", "Marines", "Fighters",
    "Yankees", "Dodgers", "Red Sox", "Cubs", "Mets", "Cardinals", "Braves", "Astros", "Mariners",
    "Padres", "Phillies", "Pirates", "Rangers", "Rays", "Rockies", "Royals", "Guardians", "Marlins",
    "Nationals", "Orioles", "White Sox", "Reds", "Brewers", "Diamondbacks", "Angels", "Athletics",
    "Blue Jays",
  ];
  /* 별칭은 '마지막 낱말'을 통째로 견줘요. 부분 문자열로 보면 "한백 코메츠"가
   * "메츠"에 걸려요 — 그건 이미 있던 가상 명칭이라 잘못된 빨간불이에요. */
  const REAL_ORG = ["요미우리", "한신", "주니치", "히로시마", "야쿠르트", "소프트뱅크", "오릭스",
    "세이부", "니혼햄", "라쿠텐", "두산", "기아", "삼성", "한화", "키움", "롯데", "넥센"];
  const all = TABLE.flatMap((l) => CLUBS_OF(l.tier).map((c) => c.name));
  const nickOf = (n) => n.trim().split(/\s+/).slice(-1)[0].toLowerCase();
  const hit = all.filter((n) =>
    REAL.some((r) => nickOf(n) === r.toLowerCase() || n.toLowerCase() === r.toLowerCase())
    || REAL_ORG.some((r) => n.includes(r)));
  check(hit.length === 0, `실제 구단 별칭을 쓰지 않는다 (${hit.length ? hit.join(" · ") : "없음"})`);
  for (const l of TABLE) {
    console.log(`  ${l.flag} ${l.name} | ${CLUBS_OF(l.tier).map((c) =>
      `${c.name}${c.str == null ? "" : ` ${c.str.toFixed(2)}`}`).join(" · ")}`);
  }
});

/* ---------- ④ 팀 승률 30~85% — 이 파일의 본체 ---------- */
group("④ 팀 승률");

/* 승패를 정하는 건 게임 쪽 한 줄이에요. 여기 흉내를 적어두면 그 줄이 바뀌어도
 * 테스트가 눈치를 못 채니, 먼저 소스에 그 모양이 그대로 있는지 못 박아요. */
check((SRC.match(/preWin: Math\.random\(\) < gameWinP\(\),/g) || []).length === 2,
  `타자·투수 경기의 승패가 Math.random() < gameWinP()다 (${(SRC.match(/preWin: Math\.random\(\) < gameWinP\(\),/g) || []).length}곳)`);
check(/const win = Math\.random\(\) < gameWinP\(\);/.test(SRC),
  "등판 없는 날의 승패도 Math.random() < gameWinP()다");
check(/if \(Math\.random\(\) < o\.str\) o\.w \+= 1; else o\.l \+= 1;/.test(SRC),
  "다른 팀 승수는 그 팀 전력(o.str)으로 굴러간다");

const SEASON_TOTAL = Number((SRC.match(/const SEASON_TOTAL = (\d+);/) || [])[1] || 0);
check(SEASON_TOTAL > 0, `시즌 경기 수를 소스에서 읽었다 (${SEASON_TOTAL}경기)`);

const BANDS = [{ stat: 100, label: "평범" }, { stat: 130, label: "준정상급" }, { stat: 150, label: "정상급" }];
const POSES = [{ key: "batter", label: "🧢 타자" }, { key: "pitcher", label: "⚾ 투수" }];
const LO = 0.30, HI = 0.85;   // 이 범위를 넓히지 마세요 — 넓히면 이 검사는 아무것도 안 지켜요

const statsOf = (pos, stat) => (pos === "batter"
  ? { contact: stat, power: stat, run: stat, defense: stat, stamina: stat }
  : { velocity: stat, control: stat, breaking: stat, defense: stat, stamina: stat });
function playerOf(pos, stat, tier, over = {}) {
  const lg = TABLE.find((l) => l.tier === tier);
  const stats = statsOf(pos, stat);
  const talents = {};
  for (const k of Object.keys(stats)) talents[k] = 1.3;
  const S = stateOf({ league: lg.id, pos, stats, talents, ...over });
  return { S, c: open(S) };
}

/* 한 시즌을 통째로 굴려요 — 캠프(전력 드리프트) → 시즌 개막 → 144경기.
 * 승패는 실제 함수(gameWinP)가 정하고, 다른 팀 승수도 finishProGame이 굴려요. */
function season(pos, stat, tier, over = {}) {
  const { S, c } = playerOf(pos, stat, tier, over);
  S.team = pick(c.leagueTeams());
  c.driftTeamStr();                    // 스프링캠프가 매년 하는 일이에요
  c.initSeason();
  for (let g = 0; g < SEASON_TOTAL; g++) {
    c.finishProGame(Math.random() < c.gameWinP(), null);
    S.condition = over.condition != null ? over.condition : 80;   // 캠프·휴식으로 되돌아오는 몫은 이 검사의 관심이 아니에요
  }
  const sn = S.season;
  return { S, c, w: sn.teamW, l: sn.teamL, p: sn.teamW / (sn.teamW + sn.teamL), rank: c.myRank() };
}

/* 한 경기를 이길 확률 자체예요. 어느 팀에 몸담느냐가 teamWinP의 teamBonus를 통해
 * 승률을 흔드니까, 그 리그가 **가질 수 있는 전력을 전부** 밟아요 —
 * 목록에 적힌 값과 드리프트 울타리 양끝이에요.
 *
 * 시즌을 굴려 나온 승패는 이 확률에 이항 잡음(144경기면 ±4%p)이 얹힌 값이라
 * 못 박는 건 확률 쪽이어야 해요. 한 시즌이 우연히 85%를 넘는 건 밸런스가 아니라 난수예요.
 * 뽑기로 나온 전력을 쓰면 KBO의 '가장 약한 팀'이 실행할 때마다 달라져서 리그끼리
 * 견줄 수가 없어요 — 그래서 울타리 값을 직접 꽂아요. */
function winPs(pos, stat, tier, over = {}) {
  const { S, c } = playerOf(pos, stat, tier, over);
  const lg = TABLE.find((x) => x.tier === tier);
  const g = G(S, clamp);
  const strs = [...new Set(g.LEAGUE_CLUBS[lg.id].map((cl) => cl.str)
    .filter((v) => typeof v === "number").concat(g.driftBandOf(lg)))];
  const names = c.leagueTeams();
  return strs.map((v, i) => {
    S.team = names[i % names.length];
    S.teamStr[S.team] = v;
    return c.teamWinP();
  });
}

const N = Number(process.env.CLUB_N || 300);

guard("팀 승률", () => {
  const t0 = Date.now();
  const bad = [];
  for (const po of POSES) {
    console.log(`  ${po.label}  능력치 | ${TABLE.map((l) => l.name.padStart(30)).join(" | ")}`);
    for (const b of BANDS) {
      const cells = TABLE.map((l) => {
        const ps = winPs(po.key, b.stat, l.tier);
        let sum = 0, post = 0;
        for (let i = 0; i < N; i++) {
          const r = season(po.key, b.stat, l.tier);
          sum += r.p;
          if (r.rank <= 5) post++;
        }
        return { pLo: Math.min(...ps), pHi: Math.max(...ps), mean: sum / N, post: post / N };
      });
      console.log(`  ${b.label.padStart(6)} ${String(b.stat).padStart(5)} | ${cells.map((c) =>
        `승률 ${(c.pLo * 100).toFixed(1)}~${(c.pHi * 100).toFixed(1)}% 실측 ${(c.mean * 100).toFixed(1)}% 가을 ${(c.post * 100).toFixed(0)}%`
          .padStart(30)).join(" | ")}`);
      cells.forEach((c, i) => {
        const at = `${po.label} ${b.label} ${TABLE[i].name}`;
        if (!(c.pLo >= LO && c.pHi <= HI)) bad.push(`${at} 승률 ${(c.pLo * 100).toFixed(1)}~${(c.pHi * 100).toFixed(1)}%`);
        if (!(c.mean >= LO && c.mean <= HI)) bad.push(`${at} 실측 ${(c.mean * 100).toFixed(1)}%`);
      });
    }
  }
  check(bad.length === 0,
    `리그 × 능력치 × 포지션 ${TABLE.length * BANDS.length * POSES.length}칸이 전부 ${LO * 100}~${HI * 100}% 안에 있다 (칸당 ${N}시즌${bad.length ? " · 벗어남: " + bad.join(" / ") : ""})`);
  console.log(`  ⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
});

/* 격자 한 점(컨디션 80 · 27세)만 보고 넘어가면 안 돼요. 컨디션과 나이도 같은 식에
 * 들어가서, 셋이 함께 나빠지는 구석에서 바닥이 드러납니다.
 *
 * 두 가지를 따로 봐요.
 *  ⓐ 요구된 능력치 구간(평범~정상급)은 컨디션 0~100 · 23~38세 · 리그의 모든 구단을
 *     훑어도 30~85% 안이어야 해요.
 *  ⓑ 그 아래 구간(능력치 60·80)은 teamWinP가 원래 갖고 있던 하한(0.25)에 눌려요.
 *     이건 리그 때문이 아니라 KBO에서도 똑같이 일어나는 옛 성질이라 범위로 못 박지 않고,
 *     대신 **상위 리그가 KBO보다 낮아지지 않는다**를 못 박아요. 이 태스크의 위험은
 *     '리그를 옮겼더니 팀 승률이 무너지는 것'이고, 그게 정확히 이 비교예요. */
guard("팀 승률 바닥·천장", () => {
  const CONDS = [0, 50, 100], AGES = [23, 30, 38];
  const sweep = (stats) => {
    const out = [];
    for (const po of POSES) for (const stat of stats) for (const condition of CONDS) for (const age of AGES) {
      const row = TABLE.map((l) => winPs(po.key, stat, l.tier, { condition, age }));
      out.push({ at: `${po.label} 능력치${stat} 컨디션${condition} ${age}세`, row });
    }
    return out;
  };
  const span = (cells) => {
    let lo = 1, hi = 0, loAt = "", hiAt = "";
    for (const c of cells) c.row.forEach((ps, i) => {
      const a = `${c.at} ${TABLE[i].name}`;
      if (Math.min(...ps) < lo) { lo = Math.min(...ps); loAt = a; }
      if (Math.max(...ps) > hi) { hi = Math.max(...ps); hiAt = a; }
    });
    return { lo, hi, loAt, hiAt };
  };

  const band = span(sweep(BANDS.map((b) => b.stat)));
  console.log(`  ⓐ 요구 구간(능력치 ${BANDS.map((b) => b.stat).join("·")}) | 최저 ${(band.lo * 100).toFixed(1)}% — ${band.loAt} / 최고 ${(band.hi * 100).toFixed(1)}% — ${band.hiAt}`);
  check(band.lo >= LO && band.hi <= HI,
    `평범~정상급은 컨디션 0~100 · 23~38세 · 리그의 모든 구단을 훑어도 ${LO * 100}~${HI * 100}% 안이다 (${(band.lo * 100).toFixed(1)}~${(band.hi * 100).toFixed(1)}%)`);

  const low = sweep([60, 80]);
  const lowSpan = span(low);
  console.log(`  ⓑ 그 아래(능력치 60·80) | 최저 ${(lowSpan.lo * 100).toFixed(1)}% — ${lowSpan.loAt} (teamWinP 자체의 하한이에요 · KBO도 같아요)`);
  let worse = 0;
  for (const c of low) {
    const kbo = Math.min(...c.row[0]);
    for (let i = 1; i < c.row.length; i++) if (Math.min(...c.row[i]) < kbo - 1e-9) worse++;
  }
  check(worse === 0, `능력치 60·80에서도 상위 리그가 ${NAME(1)}보다 팀 승률이 낮아지지 않는다 (낮아진 칸 ${worse}개)`);
});

/* ---------- ⑤ 가을야구가 해외 구단으로도 굴러가요 (구조만 봐요 — 라벨은 다음 단계예요) ---------- */
group("⑤ 가을야구");
guard("가을야구", () => {
  /* 실제 흐름 그대로 굴려요 — enterPostseason이 대진을 짜고 advancePostseason이
   * 내 차례가 올 때까지 NPC 시리즈를 시뮬합니다. 내 경기는 finishProGame이 받아요. */
  let built = 0, bad = 0, unknownOpp = 0, notFinished = 0, noChamp = 0, champs = 0;
  const winP = [];
  const tries = Math.max(30, Math.round(N / 5));
  for (const l of TABLE) {
    for (let i = 0; i < tries; i++) {
      // 능력치를 높게 잡아야 가을야구에 자주 들어가요 (대진 자체를 보고 싶은 검사예요)
      const { S, c } = season("batter", 150, l.tier);
      c.enterPostseason();
      if (!S.post) continue;            // 6위 이하 — 가을야구 없음
      built++;
      const names = new Set(c.leagueTeams());
      let guardCnt = 0;
      while (c.inPost() && guardCnt++ < 60) {
        // 대진에 오른 이름이 전부 이 리그의 구단이어야 해요 (S.post.str이 이름으로 전력을 찾아요)
        for (const s of S.post.series) for (const n of [s.a, s.b]) if (n != null && !names.has(n)) bad++;
        const opp = c.postOpp();
        if (typeof S.post.str[opp] !== "number") unknownOpp++;
        winP.push(c.gameWinP());
        c.finishProGame(Math.random() < c.gameWinP(), null);
        const s = c.mySeries();
        if (s && s.done) c.advancePostseason();   // finishPostGame의 nextFn이 하는 일이에요
      }
      if (guardCnt >= 60) notFinished++;
      if (S.post.eliminated && S.post.myRound) c.advancePostseason();
      const ks = S.post.series[3];
      if (!(ks.done && names.has(ks.winner))) noChamp++;
      if (S.post.wonKS) champs++;
    }
  }
  check(built > 0, `해외 구단으로도 가을야구 대진이 만들어진다 (${built}판)`);
  check(bad === 0, `대진에 오른 팀 이름이 전부 그 리그의 구단이다 (어긋난 이름 ${bad}건)`);
  check(unknownOpp === 0,
    `내 가을야구 상대의 전력을 S.post.str에서 찾을 수 있다 (못 찾은 경우 ${unknownOpp}건 · 못 찾으면 gameWinP가 0.49로 뭉개져요)`);
  check(notFinished === 0, `가을야구 시리즈가 전부 끝난다 (안 끝난 경우 ${notFinished}건)`);
  check(noChamp === 0, `한국시리즈가 그 리그의 구단으로 끝난다 (어긋난 경우 ${noChamp}건)`);
  const pLo = Math.min(...winP), pHi = Math.max(...winP);
  console.log(`  가을야구 경기 승률 ${(pLo * 100).toFixed(1)}~${(pHi * 100).toFixed(1)}% · 우승 ${champs}/${built}판`);
  /* 가을야구는 상대 전력을 그대로 빼요(base - (opp - 0.49) * 1.8). 리그 평균 전력을
   * 올리면 여기가 제일 먼저 주저앉아요 — 구단 전력의 위쪽 끝을 묶어둔 이유예요. */
  check(pLo >= LO && pHi <= HI,
    `정상급 선수의 가을야구 경기 승률도 ${LO * 100}~${HI * 100}% 안이다 (${(pLo * 100).toFixed(1)}~${(pHi * 100).toFixed(1)}%)`);

  /* 가을야구는 상대 전력을 그대로 빼요 (base - (opp - 0.49) * 1.8).
   * 리그 평균 전력을 올리면 여기가 제일 먼저 주저앉는 자리예요.
   * 라벨은 다음 태스크에서 고치고, 이번에는 숫자가 살아 있는지만 봅니다. */
  const worst = [];
  for (const l of TABLE) {
    const clubs = CLUBS_OF(l.tier).map((c) => c.str).filter((v) => typeof v === "number");
    const band = G(stateOf(), clamp).driftBandOf(l);
    const top = clubs.length ? Math.max(...clubs) : 0.60;
    worst.push({ name: l.name, top, band });
    check(top <= band[1], `${l.name} 구단 전력이 드리프트 울타리 안이다 (최강 ${top} ≤ ${band[1]})`);
  }
  console.log(`  리그 최강 구단 전력 | ${worst.map((w) => `${w.name} ${w.top.toFixed(2)}(울타리 ${w.band[0]}~${w.band[1]})`).join(" · ")}`);
});

/* ---------- ⑥ 옛 세이브는 KBO 구단만 상대해요 ---------- */
group("⑥ 옛 세이브");
guard("옛 세이브", () => {
  const kbo = CLUBS_OF(1).map((c) => c.name);
  /* teamsOf를 직접 두들겨요. 게임 안에서는 leagueOf가 먼저 막아주지만, 그 방패가
   * 걷히거나 teamsOf를 다른 곳에서 부르게 되면 여기가 마지막 문이에요. */
  const g = G(stateOf(), clamp);
  const junk = [undefined, null, 0, 99, "2", "3", NaN, {}, { id: 99 }, [], true];
  const junkBad = junk.filter((v) => g.teamsOf(v).join("|") !== kbo.join("|"));
  check(junkBad.length === 0,
    `teamsOf가 모르는 값을 받으면 KBO 구단을 돌려준다 (어긋난 값 ${junkBad.length}개)`);
  check(TABLE.every((l) => g.teamsOf(l).join("|") === g.LEAGUE_CLUBS[l.id].map((c) => c.name).join("|")),
    "teamsOf가 리그 객체·id 어느 쪽으로 물어도 그 리그의 구단을 돌려준다");

  const cases = [{}, { league: null }, { league: 0 }, { league: 99 }, { league: "3" }, { league: NaN }];
  let bad = 0;
  for (const over of cases) {
    const S = stateOf(over);
    const c = open(S);
    if (c.leagueTeams().join("|") !== kbo.join("|")) bad++;
    S.team = kbo[0];
    c.initSeason();
    for (const o of S.season.others) if (!kbo.includes(o.name)) bad++;
  }
  check(bad === 0, `S.league가 없거나 깨진 세이브는 KBO 구단만 상대한다 (어긋난 경우 ${bad}건)`);

  /* 전력을 뽑는 방식도 예전 그대로여야 해요 — 난수를 뽑는 횟수까지 같아야
   * 진행 중인 캐릭터의 순위표가 안 튑니다. */
  const S = stateOf();
  const c = open(S);
  let calls = 0;
  const real = Math.random;
  Math.random = () => { calls++; return real(); };
  try { for (const t of kbo) c.teamStrOf(t); } finally { Math.random = real; }
  check(calls === kbo.length, `KBO 구단 전력은 팀마다 난수 한 번으로 뽑는다 (${calls}회 / ${kbo.length}팀)`);
  const vals = kbo.map((t) => c.teamStrOf(t));
  check(vals.every((v) => v >= 0.38 && v <= 0.60), `KBO 구단 전력이 예전 폭(0.38~0.60) 그대로다 (${Math.min(...vals)}~${Math.max(...vals)})`);
  check(kbo.every((t) => g.clubStrOf(t) === undefined),
    "KBO 구단은 목록에 전력이 못 박혀 있지 않다 (clubStrOf가 undefined)");

  /* 드리프트 울타리 — 리그마다 따로 있어야 리그 차이가 안 녹아요.
   * 울타리 값과만 견주면 '울타리를 전부 KBO 것으로 통일'하는 실수를 못 잡아요
   * (검사가 바뀐 울타리를 정답으로 삼아버려요). 그래서 300시즌을 흔든 뒤의
   * **리그 평균 순서**까지 봐요 — 그게 이 울타리가 지키려던 것이니까요. */
  const drifted = TABLE.map((l) => {
    const St = stateOf({ league: l.id });
    const cc = open(St);
    const band = G(St, clamp).driftBandOf(l);
    let sum = 0, n = 0, lo = 1, hi = 0;
    for (let r = 0; r < 40; r++) {
      St.teamStr = {};
      for (let i = 0; i < 300; i++) cc.driftTeamStr();
      for (const t of cc.leagueTeams()) {
        const v = St.teamStr[t];
        sum += v; n++;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    return { l, band, mean: sum / n, lo, hi };
  });
  for (const d of drifted) {
    check(d.lo >= d.band[0] - 1e-9 && d.hi <= d.band[1] + 1e-9,
      `${d.l.name} — 300번 흔들려도 울타리(${d.band[0]}~${d.band[1]}) 안이다 (${d.lo}~${d.hi})`);
  }
  let ordered = true;
  for (let i = 1; i < drifted.length; i++) if (!(drifted[i].mean > drifted[i - 1].mean)) ordered = false;
  console.log(`  300시즌 흔든 뒤 평균 전력 | ${drifted.map((d) => `${d.l.name} ${d.mean.toFixed(3)}`).join(" · ")}`);
  check(ordered,
    `300시즌을 흔들어도 tier 순서대로 평균 전력이 높다 (${drifted.map((d) => d.mean.toFixed(3)).join(" < ")})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
