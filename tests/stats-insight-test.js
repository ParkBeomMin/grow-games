/* 💡 통계 페이지의 자동 코멘트 — 숫자를 보고 말이 되는 문장을 만드는지 본다.
 *
 * 숫자만 늘어놓으면 볼 때마다 "그래서 뭐가 문제지?"를 손으로 따져야 한다.
 * 그래서 전환율·쏠림·추세를 계산해 판단과 근거를 문장으로 단다.
 *
 * ⚠️ 여기서 제일 중요한 건 **틀린 말을 안 하는가**다.
 * 표본 3명을 보고 "이탈이 심각합니다"라고 하면 코멘트 전체를 안 믿게 된다.
 * 그러면 있으나 마나가 아니라 **있는 게 더 나쁘다.**
 *
 * 지키는 것:
 *   ① 표본이 적으면 판단을 접는다 (단정하는 낱말이 안 나와야 한다)
 *   ② 문턱을 절대값으로 박지 않는다 — 시리즈 평균에서 뽑는다
 *   ③ 좋고 나쁨이 뒤집히지 않는다 (완주율이 높은데 🟠가 뜨면 안 된다)
 *   ④ 근거(분자·분모)가 항상 붙는다 — 확인할 수 없는 코멘트는 소문이다
 *
 * 함수는 소스에서 정규식으로 뽑아 그대로 실행한다. 값을 옮겨 적지 않는다.
 */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/stats/index.html", "utf8");
const grab = (re) => { const m = SRC.match(re); return m ? m[0] : null; };

const parts = {
  games: grab(/const GAMES = \{[^}]*\};/),
  keys: grab(/const GAME_KEYS = [^;]+;/),
  minN: grab(/const MIN_N = [^;]+;/),
  pct: grab(/const pct = [^;]+;/),
  fmt: grab(/const fmtPct = [^;]+;/),
  metrics: grab(/function metricsOf\(summary, game\) \{[\s\S]*?\n    \}/),
  row: grab(/const row = \(kind, ico, txt, why\) =>[\s\S]*?;\n/),
  compare: grab(/function compareLine\(label, mine, avg, n, opts\) \{[\s\S]*?\n    \}/),
  skew: grab(/function skewLine\(choices, game, key, label\) \{[\s\S]*?\n    \}/),
  trend: grab(/function trendLine\(daily, game\) \{[\s\S]*?\n    \}/),
  section: grab(/function insightSection\(state, game\) \{[\s\S]*?\n    \}/),
  alias: grab(/const CHOICE_ALIAS = \{[\s\S]*?\n    \};/),
  norm: grab(/const normChoice = [^;]+;/),
  pos: grab(/const POS = \{[^}]*\};/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const build = new Function("state", "game", `
  ${parts.games} ${parts.keys} ${parts.minN} ${parts.pct} ${parts.fmt}
  ${parts.alias} ${parts.norm} ${parts.pos}
  ${parts.metrics} ${parts.row} ${parts.compare} ${parts.skew} ${parts.trend} ${parts.section}
  return insightSection(state, game);`);
const normChoice = new Function(`${parts.alias} ${parts.norm} return normChoice;`)();
const MIN_N = new Function(`${parts.minN} return MIN_N;`)();

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const strip = (h) => h.replace(/<[^>]*>/g, "");

// 게임 하나의 이벤트 줄을 만든다
const ev = (game, visitors, started, retired, battled, visitTotal) => ([
  { game, event: "visit", players: visitors, total: visitTotal != null ? visitTotal : visitors },
  { game, event: "new_player", players: started, total: started },
  { game, event: "retire", players: retired, total: retired },
  { game, event: "battle", players: battled, total: battled },
]);

// ── ① 표본이 적으면 단정하지 않는다
const tiny = { summary: ev("soccer", 3, 2, 1, 0), choices: [], daily: [] };
const tinyHtml = strip(build(tiny, "soccer"));
console.log(`   표본 3명 → "${tinyHtml.replace(/\s+/g, " ").trim().slice(0, 60)}…"`);
check(!/심각|위험|문제|나빠요|낮아요|높아요/.test(tinyHtml),
  "표본 3명에는 단정하는 낱말이 안 나온다");
check(/적|모이|아직/.test(tinyHtml), "대신 '표본이 적다'고 말한다");

// ── ② 좋고 나쁨이 안 뒤집힌다
const base = [
  ...ev("rookie", 200, 100, 40, 30),
  ...ev("idol", 200, 100, 40, 30),
  ...ev("dev", 200, 100, 40, 30),
];
const good = { summary: [...base, ...ev("soccer", 200, 160, 90, 60)], choices: [], daily: [] };
const poor = { summary: [...base, ...ev("soccer", 200, 40, 4, 2)], choices: [], daily: [] };
const goodHtml = build(good, "soccer"), poorHtml = build(poor, "soccer");
check(goodHtml.includes("ins-row good") && !goodHtml.includes("ins-row warn"),
  "평균보다 좋은 게임에는 🟢만 뜬다");
check(poorHtml.includes("ins-row warn") && !poorHtml.includes("ins-row good"),
  "평균보다 나쁜 게임에는 🟠만 뜬다");
console.log(`   좋은 쪽: ${strip(goodHtml).match(/시작 전환율 \d+%[^·]*/) || ""}`);
console.log(`   나쁜 쪽: ${strip(poorHtml).match(/시작 전환율 \d+%[^·]*/) || ""}`);

// ── ③ 문턱이 절대값이 아니다 — 시리즈 전체가 낮으면 '낮다'고 안 한다
const allLow = {
  summary: [...ev("rookie", 200, 40, 8, 4), ...ev("idol", 200, 40, 8, 4),
    ...ev("dev", 200, 40, 8, 4), ...ev("soccer", 200, 40, 8, 4)],
  choices: [], daily: [],
};
const lowHtml = strip(build(allLow, "soccer"));
check(!/낮아요/.test(lowHtml),
  "시리즈 전체가 낮으면 그중 하나를 '낮다'고 하지 않는다 (평균 기준이라는 증거)");

// ── ④ 근거가 붙는다
check(/방문 200명 중 160개 캐릭터 생성/.test(strip(goodHtml)),
  "코멘트마다 분자·분모가 적힌다 — 확인할 수 없는 코멘트는 소문이다");

// ── ⑤ 선택 쏠림
const skewed = {
  summary: [...base, ...ev("soccer", 200, 100, 40, 30)],
  choices: [
    { game: "soccer", choice: "K리그 유스", pos: "fw", n: 80 },
    { game: "soccer", choice: "J리그 유스", pos: "mf", n: 8 },
    { game: "soccer", choice: "브라질 유스", pos: "df", n: 6 },
    { game: "soccer", choice: "이탈리아 유스", pos: "wg", n: 6 },
  ],
  daily: [],
};
const skewHtml = strip(build(skewed, "soccer"));
console.log(`   ${(skewHtml.match(/시작 선택이[^(]*/) || [""])[0].trim()}`);
check(/시작 선택이.*K리그 유스.*몰려/.test(skewHtml), "한쪽으로 몰리면 지목한다");
check(/고르게면/.test(skewHtml), "'고르게 갈리면 몇 %인지'를 같이 적는다 — 기준 없이 '몰렸다'만 쓰면 판단이 안 돼요");

const evenly = {
  summary: [...base, ...ev("soccer", 200, 100, 40, 30)],
  choices: ["a", "b", "c", "d"].map((c, i) => ({ game: "soccer", choice: c, pos: "p" + i, n: 25 })),
  daily: [],
};
check(/고르게 갈려요/.test(strip(build(evenly, "soccer"))), "고르게 갈리면 그렇다고 말한다");

// ── ⑥ 추세 — 짧은 기간에는 말하지 않는다
const day = (n) => `2026-08-${String(n).padStart(2, "0")}`;
const shortDaily = [1, 2, 3].map((d) => ({ game: "soccer", day: day(d), visits: 50, new_players: 10 }));
check(!/최근/.test(strip(build({ summary: [...base, ...ev("soccer", 200, 100, 40, 30)], choices: [], daily: shortDaily }, "soccer"))),
  "3일치로는 추세를 말하지 않는다");

const fallDaily = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ game: "soccer", day: day(d), visits: 100, new_players: 10 }))
  .concat([8, 9, 10, 11, 12, 13, 14].map((d) => ({ game: "soccer", day: day(d), visits: 40, new_players: 4 })));
const fallHtml = strip(build({ summary: [...base, ...ev("soccer", 200, 100, 40, 30)], choices: [], daily: fallDaily }, "soccer"));
console.log(`   ${(fallHtml.match(/최근 \d+일 방문[^·]*·[^—]*—\s*[-+\d%]*/) || [""])[0].trim()}`);
check(/최근 7일 방문 280/.test(fallHtml) && /-60%/.test(fallHtml), "떨어지는 추세를 숫자로 짚는다");

/* ── ⑦ 이름이 바뀐 선택지가 하나로 접히는가
 *
 * 로그에 **표시 이름**을 남겨 온 게 화근이다. 이름을 바꾸는 순간 같은 선택지가
 * 옛 이름·새 이름으로 쪼개진다 — 실제로 축구 유스를 나라에 맞추자 배경 분포가
 * 9줄로 갈라졌다(유럽 아카데미 64 · 이탈리아 유스 2 …).
 * 과거 데이터는 못 고치니 화면에서 접고, 앞으로는 게임이 id를 함께 남긴다. */
const RENAMED = [
  ["유럽 아카데미", "이탈리아 유스"],
  ["아프리카 유망주", "잉글랜드 아카데미"],
  ["남미 유스", "브라질 유스"],
  ["일본 J리그 유스", "J리그 유스"],
  ["국내 유스", "K리그 유스"],
];
for (const [before, after] of RENAMED) {
  check(normChoice(before) === after, `"${before}" → "${after}"로 접힌다 (지금 ${normChoice(before)})`);
}
check(normChoice("K리그 유스") === "K리그 유스", "안 바뀐 이름은 그대로 둔다");
// id로 남긴 값도 이름으로 읽힌다 (앞으로 쌓일 데이터)
for (const [id, name] of [["eu", "이탈리아 유스"], ["af", "잉글랜드 아카데미"], ["br", "브라질 유스"], ["k", "K리그 유스"]]) {
  check(normChoice(id) === name, `id "${id}"도 "${name}"으로 읽힌다`);
}
/* 접기가 실제 화면 숫자를 합치는지 — 스크린샷에 찍힌 값 그대로 넣어 본다 */
const realChoices = [["K리그 유스", 76], ["유럽 아카데미", 64], ["아프리카 유망주", 15], ["남미 유스", 7],
  ["일본 J리그 유스", 5], ["잉글랜드 아카데미", 3], ["이탈리아 유스", 2], ["J리그 유스", 1], ["브라질 유스", 1]]
  .map(([c, n]) => ({ game: "soccer", choice: c, pos: "fw", n }));
const foldedHtml = strip(build({ summary: [...base, ...ev("soccer", 400, 174, 40, 30)], choices: realChoices, daily: [] }, "soccer"));
check(/이탈리아 유스 38%/.test(foldedHtml),
  `옛 이름과 새 이름이 합쳐진다 (유럽 64 + 이탈리아 2 = 66/174 = 38%)`);
check(!/유럽 아카데미|아프리카 유망주|남미 유스/.test(foldedHtml), "옛 이름은 화면에 안 남는다");

/* ── ⑧ 게임이 남기는 이벤트가 통계 표에 전부 등록돼 있는가
 *
 * EVENT_LABEL에 없으면 화면에 **영문 그대로** 뜨고, FUNNEL_ORDER에도 없으면
 * indexOf가 -1이라 **맨 앞으로** 밀린다. 둘 다 조용히 일어나서 새 이벤트를
 * 남긴 사람은 눈치채기 어렵다 — 실제로 transfer·rebirth·tour가 오래 빠져 있었고,
 * youth_round·cup·promo도 추가하자마자 같은 자리에 떨어졌다.
 * 게임 소스를 훑어서 실제로 남기는 이벤트를 모으고, 표와 대조한다. */
const path = require("path");
const ROOT = "/workspace/grow-games";
const logged = new Set();
for (const g of Object.keys(new Function(`${parts.games} return GAMES;`)())) {
  for (const f of ["game.js", "career.js"]) {
    const fp = path.join(ROOT, g, f);
    if (!fs.existsSync(fp)) continue;
    for (const m of fs.readFileSync(fp, "utf8").matchAll(/Stats\.log\("([a-z_]+)"/g)) logged.add(m[1]);
  }
}
/* 공통 파일도 훑어요 — help.js처럼 게임 폴더 밖에서 남기는 이벤트가 있어요.
 * 처음엔 게임 폴더와 stats.js만 봐서 "help가 표에만 있고 안 쓰인다"고 잘못 짚었어요. */
for (const f of ["stats.js", "help.js", "cloud.js", "match.js", "timing.js", "ads.js"]) {
  const fp = path.join(ROOT, f);
  if (!fs.existsSync(fp)) continue;
  for (const m of fs.readFileSync(fp, "utf8").matchAll(/(?:Stats\.)?log\("([a-z_]+)"/g)) logged.add(m[1]);
}

const ORDER = new Function(`${grab(/const FUNNEL_ORDER = \[[\s\S]*?\];/)} return FUNNEL_ORDER;`)();
const LABEL = new Function(`${grab(/const EVENT_LABEL = \{[\s\S]*?\n    \};/)} return EVENT_LABEL;`)();
const noLabel = [...logged].filter((e) => !LABEL[e]);
const noOrder = [...logged].filter((e) => !ORDER.includes(e));
console.log(`   게임이 남기는 이벤트 ${logged.size}종`);
check(noLabel.length === 0, `이벤트마다 한글 이름이 있다 (빠진 것: ${noLabel.join(" · ") || "없음"})`);
check(noOrder.length === 0, `이벤트마다 표시 순서가 있다 (빠진 것: ${noOrder.join(" · ") || "없음"})`);
// 순서에만 있고 실제로는 안 남기는 것도 짚어 준다 (지운 기능의 잔재)
const stale = ORDER.filter((e) => !logged.has(e));
check(stale.length === 0, `쓰지 않는 이벤트가 표에 남아 있지 않다 (${stale.join(" · ") || "없음"})`);

/* ── 변이 검증 — 표본 문턱을 0으로 내리면 ①이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const brokenBuild = new Function("state", "game", `
  ${parts.games} ${parts.keys} const MIN_N = 0; ${parts.pct} ${parts.fmt}
  ${parts.metrics} ${parts.row} ${parts.compare} ${parts.skew} ${parts.trend} ${parts.section}
  return insightSection(state, game);`);
const brokenTiny = strip(brokenBuild({ summary: [...base, ...ev("soccer", 3, 1, 0, 0)], choices: [], daily: [] }, "soccer"));
check(/낮아요|높아요/.test(brokenTiny),
  `변이 검증 — 문턱을 0으로 내리면 표본 3명에도 단정한다 (${brokenTiny.replace(/\s+/g, " ").trim().slice(0, 50)}…)`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
