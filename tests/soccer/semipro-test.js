/* 📹 세미프로 입단 → K리그3에서 프로 시작 — 실제로 이어지는지, 출발이 맨 아래인지 본다.
 *
 * 유스 3년을 못 넘긴 사람이 갈 곳이 없어 게임이 끝났다. 📹 세미프로 입단은
 * "세미프로 무대에 자리를 얻었어요"라고 말해놓고 끝났다. 5단 사다리가 생겼으니
 * 그 말대로 사다리 맨 아래(K리그3)에서 프로를 시작하게 한다.
 *
 * 이러면 유스 엔딩 7종 중 진짜 끝은 🎒 축구화를 잠시 벗다 하나만 남는다. 그게 맞다 —
 * 유스 3년은 "어디서 시작하느냐"를 가르는 관문이지 "프로가 되느냐"를 가르는 관문이 아니다.
 *
 * showEnding을 직접 부르지 않는다. jsdom에 beta/soccer/index.html을 통째로 띄우고
 * 타이틀 → 유스 → 포지션 → 이름 → 훈련 36개월 → 프로 도전까지 **실제 버튼을 클릭**해
 * 도달한다. 데뷔 리그·클럽도 엔딩 화면의 '⚽ 프로 커리어 시작!' 버튼을 눌러서 정해지게 하고,
 * 결과는 전부 DOM과 살아 있는 게임 상태(S)에서 읽는다. (scout-path-test.js와 같은 방식이다.)
 *
 * 라운드 결과 고정 — 통과 판정은 `Math.random() < p`이고 p는 [0.12, 0.93]으로 clamp된다.
 * 난수를 통째로 0.93 위로 올리면 무조건 탈락, 0.12 아래로 내리면 무조건 통과다.
 * 호출 순서를 셀 필요가 없다.
 *
 * 명성 시드 — 엔딩 분기는 `score = S.fandom + overall() * 2`를 본다. 📹는 첫 라운드
 * 탈락(lastRound 0) + score >= 330이고, 🎒는 같은 자리에서 score가 그 아래다.
 * 클릭만으로는 score가 130~230쯤이라 📹에 못 닿으니 **프로 도전 화면에 닿은 직후**에
 * 살아 있는 S.fandom만 심는다. 문턱을 넘겼다는 것도 짐작하지 않고 엔딩 시점의 실제
 * score를 다시 계산해서 확인한다.
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
const CLUBS = rawClubs ? new Function(`${rawClubs} return CLUBS;`)() : {};

const rawLeagues = grab(SRC_GAME, /const LEAGUES = \[[\s\S]*?\n\];/);
check(!!rawLeagues, "game.js에서 LEAGUES를 뽑는다");
const LEAGUES = rawLeagues ? new Function(`${rawLeagues} return LEAGUES;`)() : [];

const rawPool = grab(SRC_CAREER, /const DEBUT_POOL = \d+;/);
const DEBUT_POOL = rawPool ? new Function(`${rawPool} return DEBUT_POOL;`)() : 3;

const rawRounds = grab(SRC_GAME, /const SURVIVAL_ROUNDS = \[[^\]]*\];/);
const SURVIVAL_ROUNDS = new Function(`${rawRounds} return SURVIVAL_ROUNDS;`)();

/* 사다리의 맨 아래·맨 위는 tier로 찾는다. id는 옛 세이브가 가리키는 값이라
 * 순서와 무관하다 — 새 하부 리그가 id 4·5를 받았다. */
const byTier = LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const BOTTOM = byTier[0];
const K1 = LEAGUES.find((l) => l.name === "K리그1") || {};
const avgStr = (id) => mean((CLUBS[id] || [{ str: 0 }]).map((c) => c.str));
console.log(`  사다리 맨 아래: ${BOTTOM.name}(id ${BOTTOM.id}) · 기본 리그: ${K1.name}(id ${K1.id})`);

// ---------- ① 하부 클럽 표 ----------
console.log("=== ① 하부 리그 클럽 표 ===");
const LOWER = byTier.filter((l) => l.tier < (K1.tier || 3));
check(LOWER.length >= 2, `K리그1보다 아래인 리그가 둘 이상이다 (${LOWER.map((l) => l.name).join(" · ")})`);
guard("하부 클럽", () => {
  for (const lg of LOWER) {
    const list = CLUBS[lg.id];
    check(Array.isArray(list) && list.length >= 6,
      `CLUBS에 ${lg.name}(id ${lg.id})이 6개 이상 있다 (${(list || []).length}개)`);
    const ok = (list || []).every((c) => c && typeof c.name === "string" && c.name.length > 0
      && typeof c.str === "number" && isFinite(c.str));
    check(ok, `${lg.name} 클럽마다 name과 str이 있다`);
    /* 전력은 clubStrOf가 40~95로 막는다. 그 밖을 적으면 화면에 보이는 전력과
     * 실제로 쓰이는 전력이 어긋난다. */
    const out = (list || []).filter((c) => !(c.str >= 40 && c.str <= 95));
    check(out.length === 0,
      `${lg.name} 전력이 40~95 안이다 (벗어난 클럽 ${out.length}개${out.length ? `: ${out.map((c) => `${c.name} ${c.str}`).join(", ")}` : ""})`);
    console.log(`  ${lg.name}: ${(list || []).map((c) => `${c.name}(${c.str})`).join(" · ")}`);
  }
});

// ---------- ② 하부일수록 평균 전력이 낮다 ----------
console.log("=== ② 리그별 평균 전력 ===");
guard("평균 전력", () => {
  const rows = byTier.filter((l) => CLUBS[l.id]);
  console.log(`  ${rows.map((l) => `${l.name} ${avgStr(l.id).toFixed(1)}`).join(" < ")}`);
  for (const lg of LOWER) {
    check(avgStr(lg.id) < avgStr(K1.id),
      `${lg.name} 평균 전력이 ${K1.name}보다 낮다 (${avgStr(lg.id).toFixed(1)} < ${avgStr(K1.id).toFixed(1)})`);
  }
  let bad = 0;
  for (let i = 1; i < rows.length; i++) if (!(avgStr(rows[i - 1].id) < avgStr(rows[i].id))) bad++;
  check(bad === 0, `tier 순서대로 평균 전력이 오른다 (어긋난 칸 ${bad}개)`);
});

// ---------- 페이지 부트스트랩 (scout-path-test.js와 동일) ----------
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
  $("input-name").value = "세미프로";
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
  /* msg는 클래스 없는 div 하나로 그려져요 — 화면에 실제로 뜬 문장을 그대로 읽어요.
   * (소스에서 정규식으로 뽑으면 화면에 안 붙어도 초록이 떠요.) */
  const card = P.$("ending-card");
  const msgEl = Array.from(card.children).find((el) => !el.className);
  return {
    title: card.querySelector(".draft-title").textContent,
    team: card.querySelector(".draft-team").textContent,
    msg: msgEl ? msgEl.textContent : "",
    text: card.textContent,
    score: P.score(),
  };
}

// 첫 라운드에서 탈락 → showEnding(false, 0). 여기서 score가 📹와 🎒를 가른다.
const FAIL_AT_ROUND_0 = [false];
const ALL_PASS = Array(SURVIVAL_ROUNDS.length).fill(true);

// ---------- ③ 📹 세미프로 입단에 프로 버튼이 있다 ----------
console.log("=== ③ 첫 라운드 탈락 · score ≥ 330 → 📹 세미프로 입단 ===");
const Semi = makePage(0x9e3779b9);
let semiOK = false;
guard("📹 엔딩 도달", () => {
  const r = runTo(Semi, FAIL_AT_ROUND_0, 400);
  console.log(`  엔딩 카드: ${r.title} / ${r.team} (score ${Math.round(r.score)})`);
  check(r.score >= 330, `엔딩 시점의 실제 score가 330 이상이다 (${Math.round(r.score)})`);
  check(r.title === "세미프로 입단", `엔딩 제목이 '세미프로 입단'이다 (${r.title})`);
  check(r.text.includes("📹"), "📹 엔딩이 맞다");
  check(!!Semi.$("btn-go-debut"), "엔딩 화면 DOM에 '⚽ 프로 커리어 시작!' 버튼(#btn-go-debut)이 있다");
  check(!!Semi.$("btn-go-debut") && Semi.$("btn-go-debut").textContent.includes("프로 커리어 시작"),
    `버튼 문구가 '⚽ 프로 커리어 시작!'이다 (${Semi.$("btn-go-debut") ? Semi.$("btn-go-debut").textContent : "없음"})`);
  check(!Semi.$("btn-idol-retire"), "마무리 버튼 대신 프로 진출로 이어진다");
  check(!Semi.$("btn-youth-ext"), "프로로 가니 '한 시즌 더 뛰기'는 없다");

  // teamLine이 실제 목적지(사다리 맨 아래 리그)를 말한다
  check(r.team.includes(BOTTOM.name), `teamLine이 ${BOTTOM.name}을 말한다 (${r.team})`);
  check(!/재도전/.test(r.team), `teamLine이 '재도전'으로 얼버무리지 않는다 (${r.team})`);

  /* 문구 — 실제로 프로로 이어지니 앞을 봐야 하고, 출발이 사다리 맨 아래라는 것도 말해야 한다.
   * 문장을 통째로 비교하면 다듬을 때마다 빨개지니 "무엇을 말하는가"만 본다. */
  console.log(`  📹 msg: ${r.msg}`);
  check(/시작|이어|서게|올라|밟/.test(r.msg), `앞으로 이어진다는 걸 말한다 ("${r.msg}")`);
  check(/가장 아래|맨 아래|바닥|최하위|제일 낮|밑바닥/.test(r.msg),
    `출발이 사다리의 가장 아래라는 것도 말한다 ("${r.msg}")`);
  check(!/헛되지|여기까지|끝났어요/.test(r.msg), `끝맺음 문구가 아니다 ("${r.msg}")`);
  check(/(요|다)[.!…]?$/.test(r.msg.trim()), `존댓말 어투를 지킨다 ("${r.msg}")`);
  semiOK = true;
});

// ---------- ④ 그 버튼을 누르면 K리그3에서 프로가 시작된다 ----------
console.log("=== ④ '프로 커리어 시작!'을 눌렀을 때 ===");
guard("세미프로 데뷔", () => {
  if (!semiOK) throw new Error("③ 단계가 실패해서 이어갈 수 없어요");
  const pool = (CLUBS[BOTTOM.id] || []).slice().sort((a, b) => a.str - b.str);
  const poolNames = pool.slice(0, DEBUT_POOL).map((c) => c.name);
  const byName = (n) => pool.find((c) => c.name === n);

  Semi.$("btn-go-debut").click();
  const S = Semi.state();
  check(Semi.active() === "screen-pro", `프로 화면으로 넘어간다 (${Semi.active()})`);
  check(S.phase === "soccer-pro", `phase가 프로로 바뀐다 (${S.phase})`);
  check(S.league === BOTTOM.id, `${BOTTOM.name}(id ${BOTTOM.id})에서 시작한다 (${S.league})`);
  check(!!byName(S.group), `소속 클럽이 ${BOTTOM.name} 클럽이다 (${S.group})`);
  check(!!byName(S.group) && S.clubStr === byName(S.group).str,
    `클럽 전력도 그 클럽 값으로 들어간다 (${S.clubStr})`);

  // 200번 눌러도 늘 K리그3 하위 DEBUT_POOL개 안에서 나온다
  const seen = new Set();
  const strs = [];
  let outLeague = 0;
  for (let i = 0; i < 200; i++) {
    Semi.$("btn-go-debut").click();
    const St = Semi.state();
    if (St.league !== BOTTOM.id) outLeague++;
    seen.add(St.group);
    strs.push(St.clubStr);
  }
  check(outLeague === 0, `200번을 눌러도 늘 ${BOTTOM.name}에서 시작한다 (벗어난 판 ${outLeague}건)`);
  check([...seen].every((n) => poolNames.includes(n)),
    `200회 모두 ${BOTTOM.name} 하위 ${DEBUT_POOL}개에서 나온다 (나온 클럽: ${[...seen].join(", ")})`);
  check(seen.size > 1, `한 곳으로 고정되지 않는다 (${seen.size}종)`);
  console.log(`  세미프로 데뷔 클럽 평균 전력 ${mean(strs).toFixed(1)} (${[...seen].join(" · ")})`);
});

// ---------- ⑤ 🎒 축구화를 잠시 벗다는 여전히 진짜 엔딩이다 ----------
console.log("=== ⑤ 첫 라운드 탈락 · score < 330 → 🎒 축구화를 잠시 벗다 ===");
guard("🎒 진짜 엔딩", () => {
  const Q = makePage(0x9e3779b9);
  const r = runTo(Q, FAIL_AT_ROUND_0, 0);   // 명성을 0으로 심으면 330 문턱에 못 닿는다
  console.log(`  엔딩 카드: ${r.title} / ${r.team} (score ${Math.round(r.score)})`);
  check(r.score < 330, `엔딩 시점의 실제 score가 330 미만이다 (${Math.round(r.score)})`);
  check(r.title === "축구화를 잠시 벗다", `같은 첫 라운드 탈락이어도 🎒다 (${r.title})`);
  check(!Q.$("btn-go-debut"), "🎒에는 프로 버튼(#btn-go-debut)이 없다 — 진짜 엔딩이 하나는 남는다");
  check(!!Q.$("btn-idol-retire"), "'🏛️ 기록 남기고 마무리'로만 끝난다");
  Q.dom.window.close();
});

// ---------- ⑥ 회귀: 🌱 한 시즌 더 뛰기 · 📞 최약체 시작 ----------
console.log("=== ⑥ 회귀 — 🌱 한 시즌 더 · 📞 최약체 ===");
guard("🌱 연장 회귀", () => {
  const Q = makePage(0x9e3779b9);
  runTo(Q, [true, false], null);   // 라운드 1 탈락 → 🌱 유스 재계약
  check(Q.$("ending-card").textContent.includes("유스 재계약"), "🌱 유스 재계약 엔딩에 닿는다");
  const ext = Q.$("btn-youth-ext");
  check(!!ext, "'🌱 한 시즌 더 뛰기' 버튼이 그대로 있다");
  if (ext) {
    ext.click();
    const S = Q.state();
    check(S.year === 3 && S.month === 1, `누르면 3년차 1월로 돌아간다 (${S.year}년차 ${S.month}월)`);
    check(Q.active() === "screen-main", `육성 화면으로 돌아간다 (${Q.active()})`);
    check(S.youthExt === true, "연장 사용 표시(youthExt)가 남는다");
  }
  Q.dom.window.close();
});

guard("📞 최약체 회귀", () => {
  const Q = makePage(0x9e3779b9);
  const r = runTo(Q, [true, true, false], 600);   // 라운드 2 탈락 + score ≥ 420 → 📞
  check(r.title === "타 구단 스카우트!", `📞 타 구단 스카우트에 닿는다 (${r.title})`);
  const btn = Q.$("btn-go-debut");
  check(!!btn, "📞에도 '⚽ 프로 커리어 시작!' 버튼이 그대로 있다");
  if (btn) {
    const weakest = (CLUBS[K1.id] || []).slice().sort((a, b) => a.str - b.str)[0];
    btn.click();
    const S = Q.state();
    check(S.league === K1.id, `📞는 여전히 ${K1.name}에서 시작한다 (${S.league})`);
    check(S.group === weakest.name && S.clubStr === weakest.str,
      `📞는 여전히 ${K1.name} 최약체에서 시작한다 (${S.group} ${S.clubStr} / 기대 ${weakest.name} ${weakest.str})`);
  }
  Q.dom.window.close();
});

guard("🌟 정상 계약 회귀", () => {
  const Q = makePage(0x51ed2701);
  const r = runTo(Q, ALL_PASS, null);
  const btn = Q.$("btn-go-debut");
  check(!!btn, `정상 프로 계약(${r.title})에도 프로 버튼이 있다`);
  if (btn) {
    btn.click();
    check(Q.state().league === K1.id, `정상 프로 계약은 여전히 ${K1.name}에서 시작한다 (${Q.state().league})`);
  }
  Q.dom.window.close();
});

// ---------- ⑦ 배선 — 조건을 호출부에서 다시 계산하지 않는다 ----------
console.log("=== ⑦ 배선 ===");
{
  const hook = grab(SRC_GAME, /window\.WingerCareer\.onEnding\([\s\S]*?\);/);
  check(!!hook, "game.js에서 onEnding 호출부를 뽑았다");
  check(!!hook && !/score\s*>=\s*330|lastRound === 0/.test(hook),
    "onEnding 호출부가 330·라운드 조건을 다시 계산하지 않는다 (엔딩 분기의 플래그를 그대로 넘긴다)");
  check(!!hook && /startLeague/.test(hook), "호출부가 startLeague를 넘긴다");
  check(!!hook && /keepSave/.test(hook) && /weakestClub/.test(hook), "keepSave·weakestClub 경로가 그대로 살아 있다");
  check(/startLeague/.test(SRC_CAREER), "game.js가 넘긴 시작 리그를 career.js가 읽는다");
  check(/function enterCareer\(captain, weakest, startLeague\)/.test(SRC_CAREER),
    "enterCareer가 시작 리그를 인자로 받는다");
  // 리그 계수와 데뷔 풀은 손대지 않았다
  check(/const DEBUT_POOL = 3;/.test(SRC_CAREER), "DEBUT_POOL은 3 그대로다");
  const coef = LEAGUES.map((l) => `${l.tier}:${l.penalty}/${l.prestige}/${l.bar}`).join(" ");
  check(coef === "1:0/0.55/0.5 2:0/0.85/0.75 3:0/1/1 4:1.6/1.75/1.12 5:2.8/2.4/1.3",
    `리그 계수(penalty·prestige·bar)가 그대로다 (${coef})`);
}

Semi.dom.window.close();
console.log(fail ? `\n❌ ${fail}개 실패` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
