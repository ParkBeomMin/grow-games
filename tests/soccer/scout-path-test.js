/* 📞 타 구단 스카우트 → 프로 커리어 — 실제로 이어지는지, 그리고 출발이 나쁜지 본다.
 *
 * 엔딩 7종 중 프로로 가는 건 셋(👑·🌟·💜)뿐이었다. 유스 3년 결과를 재보니 종합 55에서
 * 63%, 65에서 40%가 유스에서 끝났다. 필터가 너무 빡빡해서 📞 타 구단 스카우트를 열었다.
 * 다만 프로는 프로여도 출발은 나쁘게 준다 — 1부 최약체 클럽 하나로 고정한다.
 *
 * showEnding을 직접 부르지 않는다. jsdom에 beta/soccer/index.html을 통째로 띄우고
 * 타이틀 → 유스 → 포지션 → 이름 → 훈련 36개월 → 프로 도전까지 **실제 버튼을 클릭**해
 * 도달한다. 데뷔 클럽도 엔딩 화면의 '⚽ 프로 커리어 시작!' 버튼을 눌러서 정해지게 하고,
 * 결과는 전부 DOM과 살아 있는 게임 상태(S)에서 읽는다.
 *
 * 라운드 결과 고정 — 통과 판정은 `Math.random() < p`이고 p는 [0.12, 0.93]으로 clamp된다.
 * 난수를 통째로 0.93 위로 올리면 무조건 탈락, 0.12 아래로 내리면 무조건 통과다.
 * 호출 순서를 셀 필요가 없다. (youth-ext-test.js와 같은 방식이다.)
 *
 * 명성 시드 — 엔딩 분기는 `score = S.fandom + overall() * 2`를 본다. 휴식·훈련만
 * 눌러서 3년을 보내면 score가 130~230쯤이라 420 문턱에 클릭만으로는 못 닿는다.
 * 그래서 **프로 도전 화면에 닿은 직후**에 살아 있는 S.fandom만 올려 둔다. 라운드 진행과
 * 엔딩 판정은 전부 게임이 스스로 한다. 문턱을 넘겼다는 것도 짐작하지 않고,
 * 엔딩 시점의 실제 score를 다시 계산해서 확인한다.
 *
 * 상수는 소스에서 뽑는다. eval("const x = …")은 선언이 eval 스코프에 갇히니
 * new Function으로 감싸 return 한다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

const SRC_GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
const SRC_CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");

// ---------- 소스에서 뽑는 상수 ----------
const rawClubs = grab(SRC_GAME, /const CLUBS = \{[\s\S]*?\n\};/);
check(!!rawClubs, "game.js에서 CLUBS를 뽑는다");
const CLUBS = new Function(`${rawClubs} return CLUBS;`)();

const rawPool = grab(SRC_CAREER, /const DEBUT_POOL = \d+;/);
check(!!rawPool, "career.js에서 DEBUT_POOL을 뽑는다");
const DEBUT_POOL = new Function(`${rawPool} return DEBUT_POOL;`)();

const rawRounds = grab(SRC_GAME, /const SURVIVAL_ROUNDS = \[[^\]]*\];/);
const SURVIVAL_ROUNDS = new Function(`${rawRounds} return SURVIVAL_ROUNDS;`)();

// 1부 클럽을 전력 오름차순으로 — 맨 앞이 최약체, 앞 DEBUT_POOL개가 일반 데뷔 풀
const L1 = CLUBS[1].slice().sort((a, b) => a.str - b.str);
const WEAKEST = L1[0];
const DEBUT_NAMES = L1.slice(0, DEBUT_POOL).map((c) => c.name);
const strOf = (name) => (CLUBS[1].find((c) => c.name === name) || {}).str;
console.log(`  1부 최약체: ${WEAKEST.name}(전력 ${WEAKEST.str}) · 일반 데뷔 풀: ${DEBUT_NAMES.join(", ")}`);

// ---------- 페이지 부트스트랩 (youth-ext-test.js와 동일) ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  localStorage.setItem("grow-auto-mini", "1");   // 승부처 미니게임 자동 진행
  HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
`;
let HTML = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
HTML = HTML.replace("</head>", `<script>${PRELUDE}</script></head>`);
/* game.js의 S·overall은 스크립트 어휘 스코프라 window에 안 붙는다.
 * 페이지 안에서 eval로 읽는다. */
HTML = HTML.replace("</body>", `<script>
  window.__get = (n) => eval(n);
</script></body>`);

function makePage(seed0) {
  const dom = new JSDOM(HTML, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
  const w = dom.window;
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };

  let seed = seed0 | 0;
  const prng = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let mode = "normal";
  w.Math.random = () => {
    const r = prng();
    if (mode === "pass") return r * 0.11;          // p의 하한 0.12보다 항상 작다 → 무조건 통과
    if (mode === "fail") return 0.94 + r * 0.05;   // p의 상한 0.93보다 항상 크다 → 무조건 탈락
    return r;
  };

  const $ = (id) => w.document.getElementById(id);
  const active = () => (w.document.querySelector(".screen.active") || {}).id;
  return {
    dom, w, $, active,
    setMode: (m) => { mode = m; },
    state: () => w.__get("S"),
    // 엔딩 분기가 쓰는 값 그대로 — S.fandom + overall() * 2
    score: () => w.__get("S").fandom + w.__get("overall")() * 2,
  };
}

// ---------- 입구부터 클릭으로만 진행하는 조작 ----------
function newPlayer(P) {
  const { w, $, active } = P;
  $("btn-new").click();
  if (active() !== "screen-agency") throw new Error(`새 게임 시작 → 유스 선택으로 못 갔어요 (${active()})`);
  w.document.querySelector("#agency-list .card").click();
  if (active() !== "screen-position") throw new Error(`유스를 골라도 포지션 화면이 안 떠요 (${active()})`);
  const pos = w.document.querySelector('#position-list .card[data-pos="wg"]');
  if (!pos) throw new Error("윙어 카드가 없어요");
  pos.click();
  if (active() !== "screen-name") throw new Error(`포지션을 골라도 이름 화면이 안 떠요 (${active()})`);
  $("input-name").value = "스카우트";
  $("btn-start").click();
  if (active() !== "screen-main") throw new Error(`입단해도 육성 화면이 안 떠요 (${active()})`);
}

const restBtn = (P) => Array.from(P.w.document.querySelectorAll("#action-list .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);

function runYouthUntilSurvival(P) {
  const { w, $, active } = P;
  for (let g = 0; g < 4000; g++) {
    const id = active();
    if (id === "screen-stage") {
      if ((w.__get("ev") || {}).kind === "survival") return true;
      $("btn-stage-next").click();
      continue;
    }
    if (id === "screen-main") {
      const go = w.document.querySelector("#action-list .go-game");
      if (go) { go.click(); continue; }
      const rest = restBtn(P);
      if (!rest) throw new Error("육성 화면에 누를 수 있는 휴식 버튼이 없어요");
      rest.click();
      continue;
    }
    throw new Error(`예상 못 한 화면이에요 (${id})`);
  }
  throw new Error("4000번을 눌러도 프로 도전에 못 닿았어요");
}

function playSurvivalRound(P, wantPass) {
  P.setMode(wantPass ? "pass" : "fail");
  P.$("btn-stage-next").click();   // 경기 시작
  P.$("btn-stage-next").click();   // ⏩ 빨리감기 → 승부처 → 판정 → 결과
  P.setMode("normal");
}

const toEnding = (P) => { P.$("btn-stage-next").click(); return P.active(); };

/* 시나리오 하나를 끝까지 굴려 엔딩 화면까지 데려간다.
 * fandom을 주면 프로 도전 화면에 닿은 직후에 살아 있는 상태에 심어 준다. */
function runTo(P, passes, fandom) {
  newPlayer(P);
  if (!runYouthUntilSurvival(P)) throw new Error("프로 도전 화면에 못 닿았어요");
  if (fandom != null) P.state().fandom = fandom;
  for (const p of passes) playSurvivalRound(P, p);
  if (toEnding(P) !== "screen-ending") throw new Error(`엔딩 화면이 안 떠요 (${P.active()})`);
  return {
    title: P.$("ending-card").querySelector(".draft-title").textContent,
    team: P.$("ending-card").querySelector(".draft-team").textContent,
    text: P.$("ending-card").textContent,
    score: P.score(),
  };
}

// 라운드 인덱스 2에서 탈락 → showEnding(false, 2). 앞의 두 라운드는 통과시킨다.
const FAIL_AT_ROUND_2 = [true, true, false];
const ALL_PASS = Array(SURVIVAL_ROUNDS.length).fill(true);

// ---------- ① 라운드 2 탈락 + score ≥ 420 → 📞 타 구단 스카우트, 프로 버튼이 있다 ----------
console.log("=== ① 라운드 2 탈락 · score ≥ 420 ===");
const Scout = makePage(0x9e3779b9);
let scoutOK = false;
guard("📞 엔딩 도달", () => {
  const r = runTo(Scout, FAIL_AT_ROUND_2, 600);
  console.log(`  엔딩 카드: ${r.title} / ${r.team} (score ${Math.round(r.score)})`);
  check(r.score >= 420, `엔딩 시점의 실제 score가 420 이상이다 (${Math.round(r.score)})`);
  check(r.title === "타 구단 스카우트!", `엔딩 제목이 '타 구단 스카우트!'다 (${r.title})`);
  check(r.text.includes("📞"), "📞 엔딩이 맞다");
  check(!!Scout.$("btn-go-debut"), "엔딩 화면 DOM에 '⚽ 프로 커리어 시작!' 버튼(#btn-go-debut)이 있다");
  check(!!Scout.$("btn-go-debut") && Scout.$("btn-go-debut").textContent.includes("프로 커리어 시작"),
    `버튼 문구가 '⚽ 프로 커리어 시작!'이다 (${Scout.$("btn-go-debut") ? Scout.$("btn-go-debut").textContent : "없음"})`);
  check(!Scout.$("btn-idol-retire"), "마무리 버튼 대신 프로 진출로 이어진다");
  check(!Scout.$("btn-youth-ext"), "프로로 가니 '한 시즌 더 뛰기'는 없다");
  // teamLine이 실제 목적지(1부 최하위권 클럽)를 말한다
  check(!/하위 리그/.test(r.team), `teamLine이 '하위 리그 이적 제안'이 아니다 (${r.team})`);
  scoutOK = true;
});

// ---------- ② 그 버튼을 누르면 1부 최약체 클럽에서 프로가 시작된다 ----------
console.log("=== ② '프로 커리어 시작!'을 눌렀을 때 ===");
const scoutStr = [];
guard("스카우트 데뷔", () => {
  if (!scoutOK) throw new Error("① 단계가 실패해서 이어갈 수 없어요");
  Scout.$("btn-go-debut").click();
  const S = Scout.state();
  check(Scout.active() === "screen-pro", `프로 화면으로 넘어간다 (${Scout.active()})`);
  check(S.phase === "soccer-pro", `phase가 프로로 바뀐다 (${S.phase})`);
  check(S.group === WEAKEST.name, `소속 클럽이 1부 최저 전력 클럽이다 (${S.group} / 기대 ${WEAKEST.name})`);
  check(S.clubStr === WEAKEST.str, `클럽 전력도 최저치로 들어간다 (${S.clubStr} / 기대 ${WEAKEST.str})`);
  check(S.league === 1, `1부에서 시작한다 (${S.league}부)`);

  // 무작위가 아니라 고정이다 — 같은 버튼을 200번 눌러도 늘 최약체
  for (let i = 0; i < 200; i++) {
    Scout.$("btn-go-debut").click();
    scoutStr.push(strOf(Scout.state().group));
  }
  const kinds = [...new Set(scoutStr)].sort((a, b) => a - b);
  check(scoutStr.every((s) => s === WEAKEST.str),
    `200번을 눌러도 늘 최약체다 (전력 종류: ${kinds.join(", ")})`);
});

// ---------- ③ 같은 라운드 2인데 score < 420이면 🌱 유스 재계약 ----------
console.log("=== ③ 라운드 2 탈락 · score < 420 ===");
guard("🌱 유스 재계약", () => {
  const Q = makePage(0x9e3779b9);
  const r = runTo(Q, FAIL_AT_ROUND_2, null);   // 명성을 안 심으면 문턱에 못 닿는다
  console.log(`  엔딩 카드: ${r.title} / ${r.team} (score ${Math.round(r.score)})`);
  check(r.score < 420, `엔딩 시점의 실제 score가 420 미만이다 (${Math.round(r.score)})`);
  check(r.title === "유스 재계약", `같은 라운드 2 탈락이어도 🌱 유스 재계약이다 (${r.title})`);
  check(!Q.$("btn-go-debut"), "프로 버튼(#btn-go-debut)이 없다");
  check(!!Q.$("btn-idol-retire"), "'🏛️ 기록 남기고 마무리'가 그대로 있다");
  Q.dom.window.close();
});

// ---------- ④ 정상 프로 계약의 데뷔 클럽은 하위 3개 중 하나, 평균 전력은 더 높다 ----------
console.log("=== ④ 정상 프로 계약(전 라운드 통과)의 데뷔 클럽 ===");
guard("정상 데뷔 분포", () => {
  const Q = makePage(0x51ed2701);
  const r = runTo(Q, ALL_PASS, null);
  console.log(`  엔딩 카드: ${r.title} / ${r.team} (score ${Math.round(r.score)})`);
  check(!!Q.$("btn-go-debut"), "정상 프로 계약에도 '⚽ 프로 커리어 시작!' 버튼이 있다");

  const proStr = [];
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    Q.$("btn-go-debut").click();
    const g = Q.state().group;
    seen.add(g);
    proStr.push(strOf(g));
  }
  check([...seen].every((n) => DEBUT_NAMES.includes(n)),
    `200회 모두 하위 ${DEBUT_POOL}개 중에서 나온다 (나온 클럽: ${[...seen].join(", ")})`);
  check(seen.size > 1, `한 곳으로 고정되지 않는다 (${seen.size}종)`);

  const pm = mean(proStr), sm = mean(scoutStr);
  check(scoutStr.length === 200 && proStr.length === 200, "두 경로 모두 200회씩 표본을 모았다");
  check(pm > sm, `정상 데뷔의 평균 전력이 스카우트 경로보다 높다 (정상 ${pm.toFixed(1)} > 스카우트 ${sm.toFixed(1)})`);
  Q.dom.window.close();
});

// ---------- ⑤ 회귀: 🌱 유스 재계약의 '한 시즌 더 뛰기'가 여전히 동작한다 ----------
console.log("=== ⑤ 회귀 — 한 시즌 더 뛰기 ===");
guard("연장 회귀", () => {
  const Q = makePage(0x9e3779b9);
  runTo(Q, [true, false], null);   // 라운드 1 탈락 → 🌱 유스 재계약
  check(Q.$("ending-card").textContent.includes("유스 재계약"), "🌱 유스 재계약 엔딩에 닿는다");
  const ext = Q.$("btn-youth-ext");
  check(!!ext, "'🌱 한 시즌 더 뛰기' 버튼이 그대로 있다");
  ext.click();
  const S = Q.state();
  check(S.year === 3 && S.month === 1, `누르면 3년차 1월로 돌아간다 (${S.year}년차 ${S.month}월)`);
  check(Q.active() === "screen-main", `육성 화면으로 돌아간다 (${Q.active()})`);
  check(S.youthExt === true, "연장 사용 표시(youthExt)가 남는다");
  Q.dom.window.close();
});

// ---------- ⑥ 📹 세미프로 입단은 여전히 프로로 안 간다 ----------
console.log("=== ⑥ 📹 세미프로 입단 ===");
guard("세미프로", () => {
  const Q = makePage(0x9e3779b9);
  // 첫 라운드에서 탈락(lastRound 0) + score ≥ 330 → 📹
  const r = runTo(Q, [false], 400);
  console.log(`  엔딩 카드: ${r.title} / ${r.team} (score ${Math.round(r.score)})`);
  check(r.title === "세미프로 입단", `📹 세미프로 입단에 닿는다 (${r.title})`);
  check(!Q.$("btn-go-debut"), "📹 세미프로 입단에는 프로 버튼이 없다");
  check(!!Q.$("btn-idol-retire"), "'🏛️ 기록 남기고 마무리'로만 끝난다");
  Q.dom.window.close();
});

// ---------- ⑦ 배선 — 조건을 호출부에서 다시 계산하지 않는다 ----------
console.log("=== ⑦ 배선 ===");
{
  const hook = grab(SRC_GAME, /window\.WingerCareer\.onEnding\([\s\S]*?\);/);
  check(!!hook, "game.js에서 onEnding 호출부를 뽑았다");
  check(!!hook && !/score\s*>=\s*420|lastRound === 2/.test(hook),
    "onEnding 호출부가 420·라운드 조건을 다시 계산하지 않는다 (엔딩 분기의 플래그를 그대로 넘긴다)");
  check(!!hook && /keepSave/.test(hook), "keepSave 경로가 그대로 살아 있다");
  check(/weakestClub/.test(SRC_GAME) && /weakestClub/.test(SRC_CAREER),
    "game.js가 넘긴 최약체 표시를 career.js가 읽는다");
  check(/function enterCareer\(captain, weakest\)/.test(SRC_CAREER),
    "enterCareer가 최약체 여부를 인자로 받는다");
  // 상수는 손대지 않았다
  check(/const DEBUT_POOL = 3;/.test(SRC_CAREER), "DEBUT_POOL은 3 그대로다");
  check(CLUBS[1].length === 6 && CLUBS[2].length === 6 && CLUBS[3].length === 6, "CLUBS는 리그당 6팀 그대로다");
}

Scout.dom.window.close();
console.log(fail ? `\n❌ ${fail}개 실패` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
