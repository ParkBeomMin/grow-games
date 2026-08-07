/* 🏷️ 칭호와 🏛️ 커리어 등급 — 축이 둘로 나뉘어 있는가.
 *
 * 제보(실기기 스크린샷): 마지막 다섯 시즌을 평점 4.4~6.1로 보내고 프리미어리그에서
 * 최하위 강등으로 끝낸 커리어에 "🐐 축구 역사에 남을 레전드"가 붙었다.
 * "기록이 좋지 않은 것 같은데 축구 역사에 남을 레전드인 게 맞나??"
 *
 * 원인이 둘이었다.
 *  ① 문턱이 분포 밖에 있었다 — 커리어 점수를 실측하니 **바닥이 946점**인데
 *     레전드 문턱이 850점이었다. 사실상 전원 레전드였다.
 *  ② 점수의 3분의 2가 명성(×0.5)과 MOM(×6)이었다. 둘 다 약한 리그일수록 쉽게
 *     쌓여서, 같은 능력치로 K리그3에 눌러앉으면 4173점 · 프리미어리그까지
 *     올라가면 2572점이 나왔다. **올라가는 게 손해**였다.
 *
 * 그리고 "다른 팀 선수는 월드클래스 같은 게 붙는데 내 선수엔 없다"는 제보로
 * 칭호를 넣었다. 칭호는 **지금 실력**, 등급은 **평생 업적**이라 축이 다르다.
 *
 * 지키는 것:
 *   ① 칭호는 실력에 대해 단조롭다 — 잘해질수록 내려가지 않는다
 *   ② 경쟁자 눈금(raceStr)이 리그 격을 탄다 — 같은 pop이면 위 리그가 위 칭호
 *   ③ 경쟁자 눈금이 실측에 맞는다 (pop 70과 대등해지는 종합, 리그별)
 *   ④ 개인 순위표에 경쟁자 칭호가 실제로 그려진다
 *   ⑤ 준비 화면에 내 칭호가 그려진다
 *   ⑥ 칭호와 등급은 서로 다른 축이다 — 능력치가 바닥이어도 업적이 있으면 등급은 높다
 *   ⑦ 명성·MOM만 잔뜩 쌓은 커리어는 레전드가 아니다 (제보의 그 상황)
 *   ⑧ 변이 검증 — 옛 산식·옛 문턱으로 되돌리면 ⑦이 무너진다
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 실행한다. 직접 eval은 쓰지 않는다.
 * 화면 검사는 게임 입구를 통해 실제 상태를 넣고 실제 렌더를 부른다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");

// ---------- 산식 추출 ----------
const parts = {
  titles: grab(GAME, /const PLAYER_TITLES = \[[\s\S]*?\n\];/),
  titleTop: grab(GAME, /const TITLE_TOP = [^;]+;/),
  titleIdx: grab(GAME, /function titleIdx\(power\) \{[\s\S]*?\n\}/),
  titleAt: grab(GAME, /const titleAt = \(idx\) =>[^;]+;/),
  titleOf: grab(GAME, /const titleOf = \(power\) =>[^;]+;/),
  payStep: grab(GAME, /const TITLE_PAY_STEP = [^;]+;/),
  payMul: grab(GAME, /const titlePayMul = \(idx\) =>[^;]+;/),
  raceStr: grab(GAME, /const raceStr = \(pop, prestige\) =>[^;]+;/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  scoreW: grab(SRC, /const SCORE_W = \{[\s\S]*?\n {2}\};/),
  peakPres: grab(SRC, /function peakPrestige\(\) \{[\s\S]*?\n {2}\}/),
  careerScore: grab(SRC, /function careerScore\(\) \{[\s\S]*?\n {2}\}/),
  gradeOf: grab(SRC, /function gradeOfScore\(sc\) \{[\s\S]*?\n {2}\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const TITLE = new Function("clamp",
  `${parts.titles}\n${parts.titleTop}\n${parts.titleIdx}\n${parts.titleAt}\n${parts.titleOf}
   ${parts.payStep}\n${parts.payMul}\n${parts.raceStr}\n${parts.leagues}
   return { PLAYER_TITLES, TITLE_TOP, titleIdx, titleAt, titleOf, titlePayMul, TITLE_PAY_STEP, raceStr, LEAGUES };`
)((v, a, b) => Math.min(b, Math.max(a, v)));
const { titleOf, titleIdx, titleAt, titlePayMul, TITLE_TOP, raceStr, PLAYER_TITLES, LEAGUES } = TITLE;
const leagueById = (id) => LEAGUES.find((l) => l.id === id);
// 칭호 이름 → 단계 번호. 이름을 바꿔도 따라오도록 표에서 찾아요.
const tierOf = (t) => titleIdx(PLAYER_TITLES.find(([, n]) => n === t)[0]);

const scoreFn = new Function("S", "transTotal", `${parts.leagues}
  const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
  ${parts.scoreW}\n${parts.peakPres}\n${parts.careerScore}\n${parts.gradeOf}
  const sc = careerScore(); return { sc, grade: gradeOfScore(sc) };`);
const scoreOf = (S) => scoreFn(S, () => (S.transLv || 0));

// ---------- ① 칭호는 실력에 대해 단조롭다 ----------
guard("① 단조성", () => {
  let bad = 0, prev = -1;
  for (let p = 0; p <= 160; p += 1) {
    const t = tierOf(titleOf(p));
    if (t < prev) bad++;
    prev = t;
  }
  check(bad === 0, `실력이 오를수록 칭호가 내려가지 않는다 (역전 ${bad}회)`);
  check(new Set(PLAYER_TITLES.map(([, n]) => n)).size === PLAYER_TITLES.length,
    `칭호 이름이 서로 다르다 (${PLAYER_TITLES.length}단계)`);
  check(titleOf(0) === PLAYER_TITLES[PLAYER_TITLES.length - 1][1],
    "실력 0이면 가장 낮은 칭호다 (구멍 없이 항상 하나가 나온다)");
  check(PLAYER_TITLES.length >= 10, `단계가 10개 이상이다 (${PLAYER_TITLES.length}단계)`);
  const names = PLAYER_TITLES.map(([, n]) => n).join(" ");
  check(/국가대표/.test(names), `국가대표 칭호가 있다 (${names.match(/[^ ]*국가대표[^ ]*/g) || []})`);
  // 번호는 낮은 칭호가 0, 가장 높은 칭호가 마지막이어야 해요 — 수당 배수가 이걸 씁니다
  check(titleIdx(0) === 0 && titleIdx(9999) === TITLE_TOP,
    `번호가 아래 0 → 위 ${TITLE_TOP}로 매겨진다 (${titleIdx(0)} … ${titleIdx(9999)})`);
  check(PLAYER_TITLES.every((_, i) => titleAt(i) === PLAYER_TITLES[TITLE_TOP - i][1]),
    "번호로 되찾은 칭호가 표와 일치한다");
});

/* ---------- ①-2 효과(경기 수당) ----------
 * 칭호에 능력치 배수를 걸면 종합을 두 번 세는 셈이라(골·평점·수상·명성이 이미
 * 종합으로 굴러가요) 여태 고정이던 경기 수당에 걸었다. 그 약속을 지킨다. */
guard("①-2 수당 배수", () => {
  const muls = Array.from({ length: TITLE_TOP + 1 }, (_, i) => titlePayMul(i));
  console.log(`   수당 배수 — ${muls.map((m) => m.toFixed(2)).join(" ")}`);
  check(muls[0] === 1, `가장 낮은 칭호의 수당 배수가 1.00이다 (${muls[0]}) — 초반 살림을 깎지 않아요`);
  check(muls.every((m, i) => i === 0 || m > muls[i - 1]), "칭호가 오를수록 수당 배수가 커진다");
  check(muls[TITLE_TOP] >= 2 && muls[TITLE_TOP] <= 5,
    `최고 칭호의 배수가 2~5배 사이다 (${muls[TITLE_TOP].toFixed(2)})`);
  check(titlePayMul(-5) === muls[0] && titlePayMul(999) === muls[TITLE_TOP],
    "범위 밖 번호를 줘도 배수가 튀지 않는다");
  // 한 시즌(38경기 · MOM 20회) 수당이 실제로 얼마나 벌어지나
  const season = (i) => Math.round((38 * 30 + 20 * 100) * titlePayMul(i));
  console.log(`   한 시즌 수당 — 🪑 ${season(0)}만 · 🌟 ${season(6)}만 · 최고 ${season(TITLE_TOP)}만`);
  check(season(TITLE_TOP) > season(0) * 2, `최고 칭호의 시즌 수당이 바닥의 두 배를 넘는다 (${season(0)} → ${season(TITLE_TOP)})`);
});

// ---------- ② 경쟁자 눈금이 리그 격을 탄다 ----------
guard("② 리그 격", () => {
  const ids = [5, 1, 2, 3];
  const vals = ids.map((id) => raceStr(70, leagueById(id).prestige));
  console.log(`=== ② pop 70의 실력 점수 — ${ids.map((id, i) => `${leagueById(id).name} ${vals[i].toFixed(1)}`).join(" · ")} ===`);
  check(vals.every((v, i) => i === 0 || v > vals[i - 1]),
    `위 리그일수록 같은 pop의 실력 점수가 높다 (${vals.map((v) => v.toFixed(1)).join(" < ")})`);
  check(tierOf(titleOf(raceStr(80, leagueById(3).prestige))) > tierOf(titleOf(raceStr(80, leagueById(5).prestige))),
    "같은 pop 80이라도 프리미어리그 선수가 K리그3 선수보다 위 칭호를 받는다");
});

/* ---------- ③ 눈금이 실측에 맞는가 ----------
 * 실측 방법: 리그마다 pop 70인 경쟁자 8명과 한 시즌(38경기)을 굴려서, 내 평균
 * 평점 순위가 정확히 한가운데(4.5위)가 되는 종합을 이분 탐색으로 찾았다.
 *   K리그3 55.7 · K리그1 63.4 · 챔피언십 97.8 · 프리미어리그 117.5
 * raceStr은 이 네 점에 맞춘 직선이다. 오차 12를 넘으면 눈금이 어긋난 것이라
 * "내 칭호"와 "경쟁자 칭호"가 다른 자를 쓰게 된다.
 * ⚠️ 기대값을 소스에서 읽어오지 않는다 — 그러면 raceStr을 뭘로 바꿔도 통과한다. */
guard("③ 실측 대조", () => {
  const MEASURED = { 5: 55.7, 1: 63.4, 2: 97.8, 3: 117.5 };
  let worst = 0, worstName = "";
  for (const id of Object.keys(MEASURED).map(Number)) {
    const got = raceStr(70, leagueById(id).prestige);
    const err = Math.abs(got - MEASURED[id]);
    console.log(`   ${leagueById(id).name} — 실측 ${MEASURED[id]} · 산식 ${got.toFixed(1)} (오차 ${err.toFixed(1)})`);
    if (err > worst) { worst = err; worstName = leagueById(id).name; }
  }
  check(worst <= 12, `경쟁자 눈금이 실측과 맞는다 (최대 오차 ${worst.toFixed(1)} · ${worstName})`);
  /* 문턱을 이 실측 위에 얹었으니, 리그 중간 선수의 칭호가 리그 순서를 따라야 한다.
   * 여기가 어긋나면 "K리그3 중간이 월드클래스" 같은 화면이 나온다. */
  const mid = [5, 1, 2, 3].map((id) => ({ n: leagueById(id).name, t: titleOf(raceStr(70, leagueById(id).prestige)) }));
  console.log(`   리그 중간 선수 — ${mid.map((m) => `${m.n} ${m.t}`).join(" · ")}`);
  const idxs = mid.map((m) => tierOf(m.t));
  check(idxs.every((v, i) => i === 0 || v > idxs[i - 1]),
    `리그가 높을수록 중간 선수의 칭호가 높다 (${mid.map((m) => m.t).join(" < ")})`);
});

// ---------- ⑥ 칭호와 등급은 다른 축이다 ----------
const EMPTY = {
  years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0,
  goals: 0, assists: 0, defense: 0, apps: 0,
};
const stateOf = (over) => Object.assign({
  league: 1, fandom: 0, trophies: [], center: false, trans: {},
  career: Object.assign({}, EMPTY),
}, over);

guard("⑥ 두 축", () => {
  const years = Array.from({ length: 12 }, (_, i) => ({ y: i + 1, league: 3 }));
  const great = stateOf({
    league: 3, fandom: 2000,
    career: Object.assign({}, EMPTY, { years, daesangW: 8 * 2.4, daesang: 8, ballon: 3, wins: 120 }),
  });
  const g = scoreOf(great);
  // 그 선수가 서른셋에 종합 45까지 내려왔다면 — 업적은 그대로, 칭호는 내려간다
  const nowTitle = titleOf(45), peakTitle = titleOf(120);
  console.log(`=== ⑥ 업적 ${g.sc}점 ${g.grade} · 전성기 칭호 ${peakTitle} → 은퇴 직전 ${nowTitle} ===`);
  check(g.sc >= 2600, `발롱도르 3회 커리어는 최고 등급에 닿는다 (${g.sc}점 · ${g.grade})`);
  check(tierOf(nowTitle) < tierOf(peakTitle),
    "능력치가 내려가면 칭호는 내려간다 — 등급은 그대로인데도");
});

/* ---------- ⑦ 명성·MOM만 쌓은 커리어는 레전드가 아니다 ----------
 * 제보 그대로의 상황이다. 하부 리그에서 MOM과 명성을 쓸어 담고 상위 리그에서는
 * 아무것도 못 한 커리어. 예전 산식에서는 이게 850점 문턱을 한참 넘겼다. */
guard("⑦ 제보 상황", () => {
  const years = Array.from({ length: 10 }, (_, i) => ({ y: i + 1, league: i < 5 ? 5 : 3 }));
  const st = stateOf({
    league: 3, fandom: 2722,
    career: Object.assign({}, EMPTY, { years, wins: 96, daesang: 0, bonsang: 0 }),
  });
  const r = scoreOf(st);
  console.log(`=== ⑦ 명성 2722 · MOM 96 · 수상 0 → ${r.sc}점 ${r.grade} ===`);
  check(!r.grade.includes("레전드"),
    `명성과 MOM만으로는 레전드가 되지 않는다 (${r.sc}점 · ${r.grade})`);

  // 반대로 같은 커리어에 프리미어리그 발롱도르가 붙으면 등급이 올라간다
  const decorated = stateOf({
    league: 3, fandom: 2722,
    career: Object.assign({}, EMPTY, {
      years, wins: 96, ballon: 4, daesang: 6, daesangW: 6 * 2.4, bonsang: 8, bonsangW: 8 * 2.4, ringW: 5 * 2.4,
    }),
  });
  const d = scoreOf(decorated);
  console.log(`=== ⑦ 같은 커리어 + 발롱도르 4회 → ${d.sc}점 ${d.grade} ===`);
  check(d.sc > r.sc * 2, `업적이 등급을 끌어올린다 (${r.sc} → ${d.sc})`);
  check(d.grade.includes("레전드"), `발롱도르 4회면 레전드다 (${d.grade})`);
});

/* ---------- ⑧ 변이 검증 — 옛 산식·옛 문턱이면 ⑦이 무너져야 한다 ---------- */
guard("⑧ 변이 검증", () => {
  const oldScore = new Function("S", `
    const c = S.career;
    return Math.round(
      S.fandom * 0.5 + c.wins * 6 + (c.daesangW || c.daesang || 0) * 50 +
      (c.bonsangW || c.bonsang || 0) * 15 + c.rookie * 20 + (c.ballon || 0) * 80 +
      c.years.length * 5 + (S.trophies ? S.trophies.length : 0) * 8);`);
  const oldGrade = (sc) => (sc >= 850 ? "🐐 축구 역사에 남을 레전드" : "그 외");
  const years = Array.from({ length: 10 }, (_, i) => ({ y: i + 1, league: i < 5 ? 5 : 3 }));
  const st = stateOf({ league: 3, fandom: 2722,
    career: Object.assign({}, EMPTY, { years, wins: 96 }) });
  const sc = oldScore(st);
  console.log(`=== ⑧ 옛 산식으로는 ${sc}점 → ${oldGrade(sc)} ===`);
  check(oldGrade(sc).includes("레전드"),
    `옛 산식·옛 문턱이면 같은 커리어가 레전드가 된다 (${sc}점) — 이게 제보의 그 화면이에요`);
});

// ---------- ④⑤ 화면 — 실제로 그려지는가 ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
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
const $ = (id) => w.document.getElementById(id);
const Career = w.WingerCareer;
check(!!Career && !!Career._t, "WingerCareer 모듈이 페이지에서 로드된다");
if (!Career || !Career._t) { console.log("\n❌ 실패"); process.exit(1); }

guard("④⑤ 화면 표시", () => {
  // 데뷔까지 실제로 눌러서 잘 만들어진 프로 상태를 얻어요
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const S = Career._t.state();
  S.league = 3;                       // 프리미어리그 — 경쟁자 칭호가 가장 잘 갈려요
  S.proYear = 6;
  for (const k of Object.keys(S.stats)) S.stats[k] = 95;
  S.activity = null; S.camp = 3; S.pendingShow = false;
  Career.refreshPro();

  const team = $("pro-team").textContent;
  console.log(`=== ⑤ 준비 화면 소속 줄 — "${team}" ===`);
  const myTitle = titleOf(95);
  check(team.includes(myTitle), `준비 화면에 내 칭호가 있다 (${myTitle})`);
  check(team.includes("종합"), "종합 수치도 함께 있다 — 칭호가 어디서 나온 값인지 보여요");

  /* 개인 순위표는 시즌이 시작돼야 경쟁자 명단이 생겨요. 상태를 손으로 만들지 않고
   * **마지막 훈련 버튼을 실제로 눌러서** 캠프를 끝냅니다 — 그래야 게임이 쓰는
   * 경로(prepAction → afterPrep → initActivity)를 그대로 지나가요. */
  S.camp = 1;
  Career.refreshPro();
  const rest = w.document.querySelector('#pro-actions .action-btn.rest');
  check(!!rest, "준비 화면에 훈련(휴식) 버튼이 있다");
  if (rest) rest.click();
  const st = Career._t.state();
  check(!!(st.activity && Array.isArray(st.activity.race)),
    `마지막 훈련을 마치면 시즌이 시작되고 경쟁자 명단이 생긴다 (${st.activity ? (st.activity.race || []).length : 0}명)`);
  Career.refreshPro();
  const body = $("pro-race-body").innerHTML;
  const rows = Array.from(w.document.querySelectorAll("#pro-race-body .ch-title"))
    .map((e) => e.textContent);
  console.log(`=== ④ 개인 순위표 칭호 ${rows.length}줄 — ${rows.slice(0, 3).join(" / ")} ===`);
  check(rows.length >= 3, `개인 순위표 줄마다 칭호가 붙는다 (${rows.length}줄)`);
  check(rows.every((t) => PLAYER_TITLES.some(([, n]) => n === t)),
    "표에 찍힌 칭호가 전부 정의된 칭호다 — 빈 칸이나 undefined가 아니에요");
  check(!/undefined|NaN/.test(body), "표에 undefined·NaN이 없다");
});

/* ---------- ⑨ 획득과 효과가 화면에 드러나는가 ----------
 * 칭호만 띄우고 끝내면 "그래서 뭐가 좋은데"가 남는다. 올라선 순간을 알려주고,
 * 효과(수당 배수)를 돈 줄에 붙인다. 옛 세이브가 이어하기만 했는데 "승급!"이
 * 뜨면 안 된다는 것도 여기서 지킨다. */
guard("⑨ 승급과 효과", () => {
  const S = Career._t.state();
  const setOvr = (v) => { for (const k of Object.keys(S.stats)) S.stats[k] = v; };
  const logs = () => ($("pro-log") ? $("pro-log").textContent.replace(/\s+/g, " ") : "");
  const money = () => $("pro-money").textContent;

  // 옛 세이브 — 칭호 번호가 없는 상태에서 처음 그릴 때는 조용해야 해요
  delete S.titleIdx;
  S.proLog = [];
  setOvr(30);
  Career.refreshPro();
  check(!/칭호 승급/.test(logs()), `옛 세이브를 이어하기만 하면 승급 알림이 안 뜬다 ("${logs().slice(0, 40)}")`);
  check(S.titleIdx === 0, `대신 지금 칭호로 조용히 맞춰 둔다 (${titleAt(S.titleIdx)})`);
  check(!/수당 ×/.test(money()),
    `배수가 ×1.00인 칭호에서는 수당 줄을 안 띄운다 ("${money()}") — 아무 일도 안 하는 숫자로 화면을 채우지 않아요`);

  // 능력치를 올리면 승급 — 로그 · 명성 · 수당 배수
  const beforeFan = S.fandom, beforeIdx = S.titleIdx;
  setOvr(110);
  Career.refreshPro();
  const up = logs();
  console.log(`=== ⑨ 승급 로그 — "${up.slice(0, 70)}" · ${money()} ===`);
  check(S.titleIdx > beforeIdx, `능력치를 올리면 칭호가 올라간다 (${titleAt(beforeIdx)} → ${titleAt(S.titleIdx)})`);
  check(/칭호 승급/.test(up), "올라선 순간을 알려준다");
  check(up.includes(titleAt(S.titleIdx)), "그 알림에 새 칭호 이름이 있다");
  check(S.fandom > beforeFan, `승급하면 명성이 붙는다 (${Math.round(beforeFan)} → ${Math.round(S.fandom)})`);
  const mul = titlePayMul(S.titleIdx);
  check(money().includes(`수당 ×${mul.toFixed(2)}`),
    `돈 줄에 수당 배수가 붙는다 (×${mul.toFixed(2)} · "${money()}")`);
  check(mul > 1, `그 배수가 1보다 크다 (×${mul.toFixed(2)}) — 칭호가 실제로 돈이 돼요`);

  // 두 번 그려도 같은 알림이 또 뜨지 않아요
  S.proLog = [];
  Career.refreshPro();
  check(!/칭호 승급/.test(logs()), "같은 칭호로 다시 그려도 알림이 두 번 뜨지 않는다");

  // 노쇠 — 내려갈 때는 알려주되 명성을 깎지 않아요
  const fanAtTop = S.fandom;
  S.proLog = [];
  setOvr(45);
  Career.refreshPro();
  const down = logs();
  console.log(`=== ⑨ 강등 로그 — "${down.slice(0, 70)}" ===`);
  check(/기량이 떨어졌어요/.test(down), "기량이 떨어지면 내려왔다고 알려준다");
  check(S.fandom === fanAtTop, `내려갈 때 명성을 깎지 않는다 (${Math.round(fanAtTop)} → ${Math.round(S.fandom)})`);

  // 커리어 최고 칭호는 남아요 — 은퇴식이 이걸 씁니다
  check(S.career.bestTitle > S.titleIdx,
    `커리어 최고 칭호가 따로 남는다 (최고 ${titleAt(S.career.bestTitle)} · 지금 ${titleAt(S.titleIdx)})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
