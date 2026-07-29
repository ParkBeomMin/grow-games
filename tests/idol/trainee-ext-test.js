/* 🌱 연습생 연장 — 엔딩 문구가 약속한 "한 해 더"를 실제로 주는지, 그리고 그 대가가
 * 진짜로 붙는지 본다.
 *
 * 엔딩 7종 중 데뷔로 이어지는 건 셋(👑·🌟·💜)뿐인데, 나머지 셋이 다음 장을 약속하는
 * 문구를 달고 그냥 끝났다. "3년 연습하고 데뷔 못해도 계속 도전할 수 있게 하자.
 * 연습생은 오래 할 수 있잖아. 대신 나이 패널티가 생기긴 하는 거지" — 사용자 요청이 출발점이다.
 * 축구의 유스 재계약(1회 제한)과 달리 아이돌은 **무제한**이다. 대신 연장할수록
 * 데뷔 서바이벌의 라운드 통과 확률이 TRAINEE_EXT_PENALTY만큼 깎인다.
 *
 * showEnding을 직접 부르지 않는다. jsdom에 beta/idol/index.html을 통째로 띄우고
 * 타이틀 → 기획사 → 포지션 → 이름 → 36개월 → 데뷔 서바이벌까지 **실제 버튼을 클릭**해
 * 도달한다. 확인도 전부 DOM과 localStorage에서 읽는다.
 * (cloud.js 때 스크립트 로드 순서가 틀려 기능이 죽었는데도 문자열 매칭 테스트는
 *  전부 초록이었던 적이 있다. 그래서 입구를 통해서만 들어간다.)
 *
 * 라운드 결과 고정 — 통과 판정은 `Math.random() < p`이고 p는 [0.12, 0.93]으로 clamp된다.
 * 난수를 통째로 0.93 위로 올리면 무조건 탈락, 0.12 아래로 내리면 무조건 통과다.
 * 연장 패널티가 아무리 커도 clamp 밖으로는 못 나가니 이 방법은 그대로 성립한다.
 *
 * ④의 3000회 비교만은 예외다. 매번 36개월을 클릭할 수는 없어서, 실제 플레이로 도달한
 * 서바이벌 시점의 상태를 스냅샷으로 떠 두고 그것을 되돌린 뒤 **서바이벌 화면의 버튼을
 * 실제로 클릭**해서 4라운드를 굴린다. 재는 대상(라운드 판정)은 여전히 게임 코드다.
 *
 * 상수는 소스에서 뽑아 쓴다. eval("const x = …")은 선언이 eval 스코프에 갇히니
 * new Function으로 감싸 return 한다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/idol";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
const deep = (o) => JSON.parse(JSON.stringify(o));

const SRC_GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
const SRC_CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");

// ---------- 소스에서 뽑는 상수 ----------
const rawSaveKey = grab(SRC_GAME, /const SAVE_KEY = "[^"]+";/);
check(!!rawSaveKey, "game.js에서 SAVE_KEY를 뽑는다");
const SAVE_KEY = rawSaveKey ? new Function(`${rawSaveKey} return SAVE_KEY;`)() : "trainee-save-v1";
const SLOTS_KEY = SAVE_KEY + "-slots";

const rawPen = grab(SRC_GAME, /const TRAINEE_EXT_PENALTY = [\d.]+;/);
check(!!rawPen, "game.js에서 TRAINEE_EXT_PENALTY를 뽑는다");
const PENALTY = rawPen ? new Function(`${rawPen} return TRAINEE_EXT_PENALTY;`)() : 0.12;

const rawRounds = grab(SRC_GAME, /const SURVIVAL_ROUNDS = \[[^\]]*\];/);
const SURVIVAL_ROUNDS = new Function(`${rawRounds} return SURVIVAL_ROUNDS;`)();

const rawAgencies = grab(SRC_GAME, /const AGENCIES = \[[\s\S]*?\n\];/);
check(!!rawAgencies, "game.js에서 AGENCIES를 뽑는다");
const AGENCIES = new Function(`${rawAgencies} return AGENCIES;`)();
const WEAKEST = AGENCIES.reduce((lo, a) => (a.debut < lo.debut ? a : lo), AGENCIES[0]);
console.log(`  나이 패널티 ${Math.round(PENALTY * 100)}%p/회 · 데뷔 파워 최약체: ${WEAKEST.name}(${WEAKEST.debut})`);

// ---------- 페이지 부트스트랩 ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  localStorage.setItem("grow-auto-mini", "1");   // 무대 승부처 미니게임 자동 진행
  /* jsdom에는 캔버스가 없어요. 레이더 차트는 이 검증과 무관하니 무해한 스텁으로 막아요. */
  HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
`;
let HTML = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
HTML = HTML.replace("</head>", `<script>${PRELUDE}</script></head>`);
/* game.js의 S·ev·curSlot은 let 선언이라 window에 안 붙어요.
 * 전역 어휘 스코프는 스크립트끼리 공유되니 페이지 안에서 eval로 읽어요. */
HTML = HTML.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
  /* ④ 전용 — 스냅샷을 되돌리고 데뷔 서바이벌 직전(3년차 12월)에 세워요.
   * 라운드 판정 자체는 손대지 않아요. 무대는 화면 버튼으로 굴립니다. */
  window.__armSurvival = (json, ext) => {
    S = JSON.parse(json);
    S.traineeExt = ext;
    S.year = 3; S.month = 12;
    S.pendingStage = { kind: "survival" };
    ev = null;
    renderMain();
    show("screen-main");
  };
</script></body>`);

/* 한 판을 끝까지 굴리면 화면 상태가 되돌아오지 않아서 시나리오마다 페이지를 새로 띄워요. */
function makePage(seed0, agencyIdx) {
  const dom = new JSDOM(HTML, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/idol/" });
  const w = dom.window;
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };

  /* 난수 제어 — 기본은 재현 가능한 PRNG, 필요할 때만 통과/탈락 구간으로 고정해요. */
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
    if (mode === "pass") return r * 0.11;          // p의 하한 0.12보다 항상 작아요 → 무조건 통과
    if (mode === "fail") return 0.94 + r * 0.05;   // p의 상한 0.93보다 항상 커요 → 무조건 탈락
    return r;
  };

  const $ = (id) => w.document.getElementById(id);
  const active = () => (w.document.querySelector(".screen.active") || {}).id;
  return {
    dom, w, $, active,
    setMode: (m) => { mode = m; },
    state: () => w.__get("S"),
    curSlot: () => w.__get("curSlot"),
    slots: () => JSON.parse(w.localStorage.getItem(SLOTS_KEY) || "{}"),
    agencyIdx,
  };
}

// ---------- 입구부터 클릭으로만 진행하는 조작 ----------
function newTrainee(P, agencyIdx) {
  const { w, $, active } = P;
  $("btn-new").click();
  if (active() !== "screen-agency") throw new Error(`새 게임 시작 → 기획사 선택으로 못 갔어요 (${active()})`);
  const cards = w.document.querySelectorAll("#agency-list .card");
  if (!cards.length) throw new Error("기획사 카드가 안 그려졌어요");
  cards[agencyIdx || 0].click();
  if (active() !== "screen-position") throw new Error(`기획사를 골라도 포지션 화면이 안 떠요 (${active()})`);
  const pos = w.document.querySelector('#position-list .card[data-pos="vocal"]');
  if (!pos) throw new Error("보컬 카드가 없어요");
  pos.click();
  if (active() !== "screen-name") throw new Error(`포지션을 골라도 이름 화면이 안 떠요 (${active()})`);
  $("input-name").value = "연장이";
  $("btn-start").click();
  if (active() !== "screen-main") throw new Error(`계약해도 육성 화면이 안 떠요 (${active()})`);
}

const restBtn = (P) => Array.from(P.w.document.querySelectorAll("#action-list .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);

/* 육성 화면에서 휴식만 눌러 달을 넘기고, 평가 무대가 뜨면 끝까지 치러요.
 * 데뷔 서바이벌 화면에 닿으면 거기서 멈춰요 — 라운드 결과는 호출부가 정해요. */
function runTraineeUntilSurvival(P) {
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
  throw new Error("4000번을 눌러도 데뷔 서바이벌에 못 닿았어요");
}

/* 서바이벌 한 라운드 — 첫 클릭은 무대 시작, 둘째 클릭은 빨리 감기(=통과 판정이 도는 곳). */
function playSurvivalRound(P, wantPass) {
  P.setMode(wantPass ? "pass" : "fail");
  P.$("btn-stage-next").click();   // 무대 오르기
  P.$("btn-stage-next").click();   // ⏩ 빨리 감기 → 승부처 → 판정 → 결과
  P.setMode("normal");
}

const toEnding = (P) => { P.$("btn-stage-next").click(); return P.active(); };
const endTitle = (P) => P.$("ending-card").querySelector(".draft-title").textContent;
const endTeam = (P) => P.$("ending-card").querySelector(".draft-team").textContent;

/* 시나리오 하나를 끝까지 굴려 엔딩 화면까지 데려가요.
 * fandom을 주면 서바이벌 화면에 닿은 직후에 살아 있는 상태에 심어 둬요
 * (엔딩 분기가 보는 score = S.fandom + overall() * 2의 문턱을 넘기려고요). */
function runTo(P, passes, fandom, agencyIdx) {
  newTrainee(P, agencyIdx);
  if (!runTraineeUntilSurvival(P)) throw new Error("데뷔 서바이벌 화면에 못 닿았어요");
  if (fandom != null) P.state().fandom = fandom;
  for (const p of passes) playSurvivalRound(P, p);
  if (toEnding(P) !== "screen-ending") throw new Error(`엔딩 화면이 안 떠요 (${P.active()})`);
  return { title: endTitle(P), team: endTeam(P), text: P.$("ending-card").textContent };
}

// ---------- ① 3년을 클릭으로 소화해 🌱 연습생 재계약 엔딩까지 ----------
console.log("=== ① 연습생 3년을 클릭으로 소화해 🌱 연습생 재계약 엔딩까지 ===");
const P = makePage(0x9e3779b9, 0);
let snap = null;
guard("🌱 엔딩 도달", () => {
  newTrainee(P, 0);
  check(runTraineeUntilSurvival(P), "휴식·평가 버튼만 눌러 3년을 마치고 데뷔 서바이벌 화면에 닿는다");
  check(P.state().year === 3 && P.state().month === 12,
    `데뷔 서바이벌은 3년차 12월에 열린다 (${P.state().year}년차 ${P.state().month}월)`);

  playSurvivalRound(P, true);    // 예선 통과
  playSurvivalRound(P, false);   // 본선 탈락 → lastRound = 1
  check(toEnding(P) === "screen-ending", `결과를 받아들이면 엔딩 화면이 뜬다 (${P.active()})`);
  console.log(`  엔딩 카드: ${endTitle(P)} / ${endTeam(P)}`);
  check(endTitle(P) === "연습생 재계약", `도달한 엔딩이 🌱 연습생 재계약이다 (${endTitle(P)})`);

  // ── 검사 1: 버튼이 DOM에 실제로 있다
  const ext = P.$("btn-trainee-ext");
  check(!!ext, "엔딩 화면 DOM에 '한 해 더 연습하기' 버튼(#btn-trainee-ext)이 있다");
  check(!!ext && ext.textContent.includes("한 해 더 연습"),
    `버튼 문구가 '🌱 한 해 더 연습하기'다 (${ext ? ext.textContent : "없음"})`);
  check(!!ext && P.w.document.querySelector("#screen-ending .draft-actions").contains(ext),
    "버튼이 엔딩 화면의 선택지 영역 안에 붙어 있다");

  // 연장을 안 쓰고 끝낼 길도 남아 있어야 한다
  check(!!P.$("btn-idol-retire"), "'🏛️ 기록 남기고 마무리' 선택지가 그대로 남아 있다");
  check(!P.$("btn-go-debut"), "연습생 재계약은 데뷔가 아니니 '데뷔 활동 시작' 버튼은 없다");

  // ── 검사 6: 몇 번째 연장인지와 문턱 상승분이 숫자로 보인다
  const note = P.$("ext-note");
  check(!!note, "엔딩 카드에 연장 안내(#ext-note)가 있다");
  const noteTxt = note ? note.textContent.replace(/\s+/g, " ").trim() : "";
  console.log(`  안내: ${noteTxt}`);
  check(noteTxt.includes("1번째 연장"), `이번이 몇 번째 연장인지 숫자로 보인다 ("${noteTxt.slice(0, 30)}…")`);
  check(noteTxt.includes(`-${Math.round(PENALTY * 100)}%p`),
    `문턱 상승분이 숫자로 보인다 (-${Math.round(PENALTY * 100)}%p)`);

  // ── 검사 3(앞부분): 엔딩 시점에 세이브가 아직 살아 있다
  check(P.curSlot() != null, "엔딩 화면에서 clearSave()가 돌지 않았다 (curSlot이 살아 있다)");
  check(Object.keys(P.slots()).length === 1,
    `저장 슬롯이 그대로 있다 (${Object.keys(P.slots()).length}개)`);

  snap = deep(P.state());
});

// ---------- ② 버튼을 누르면 3년차 1월, 능력치·팬덤은 그대로 ----------
console.log("=== ② '한 해 더 연습하기'를 눌렀을 때 ===");
guard("연장 실행", () => {
  if (!snap) throw new Error("① 단계가 실패해서 이어갈 수 없어요");
  P.$("btn-trainee-ext").click();

  const S = P.state();
  check(S.year === 3, `3년차로 되돌아간다 (${S.year}년차)`);
  check(S.month === 1, `1월로 되돌아간다 (${S.month}월)`);
  check(P.active() === "screen-main", `육성 화면으로 돌아간다 (${P.active()})`);
  check(!S.pendingStage, "무대 대기 상태가 남아 있지 않다");

  const moved = Object.keys(snap.stats).filter((k) => S.stats[k] !== snap.stats[k]);
  check(moved.length === 0,
    `능력치가 그대로다 (${Object.keys(snap.stats).map((k) => `${k} ${Math.round(snap.stats[k])}`).join(" · ")}${moved.length ? ` — 바뀐 것: ${moved.join(",")}` : ""})`);
  check(S.fandom === snap.fandom, `팬덤이 그대로다 (${snap.fandom} → ${S.fandom})`);
  check(JSON.stringify(S.talents) === JSON.stringify(snap.talents), "재능이 그대로다");
  check(S.stages === snap.stages, `오른 무대 수가 그대로다 (${snap.stages})`);
  check(JSON.stringify(S.trophies) === JSON.stringify(snap.trophies), "트로피가 그대로다");
  check(S.money === snap.money, `돈이 그대로다 (${snap.money})`);
  check(S.traineeExt === 1, `연장 횟수가 1이 된다 (${S.traineeExt})`);

  // 육성 화면에서도 연장 횟수와 문턱이 계속 보인다
  const hud = P.$("hud-turn").textContent;
  console.log(`  HUD: ${hud}`);
  check(hud.includes("연장 1회"), `HUD에 연장 횟수가 보인다 ("${hud}")`);
  check(hud.includes(`-${Math.round(PENALTY * 100)}%p`), `HUD에 문턱 상승분이 보인다 ("${hud}")`);

  // ── 검사 3: 누른 뒤에도 세이브가 살아 있다
  check(P.curSlot() != null, "누른 뒤에도 clearSave()가 돌지 않았다 (curSlot이 살아 있다)");
  const ids = Object.keys(P.slots());
  check(ids.length === 1, `저장 슬롯이 정확히 하나 남아 있다 (${ids.length}개)`);
  const saved = ids.length ? P.slots()[ids[0]] : null;
  check(!!saved && saved.year === 3 && saved.month === 1,
    `디스크에 저장된 값도 3년차 1월이다 (${saved ? `${saved.year}년차 ${saved.month}월` : "없음"})`);
  check(!!saved && saved.traineeExt === 1, "저장된 상태에 연장 횟수(traineeExt)가 남는다");
});

// ---------- ③ 무제한 — 2회·3회째도 버튼이 나온다 ----------
console.log("=== ③ 두 번째·세 번째 연장 (축구의 1회 제한과 다른 지점) ===");
guard("무제한 연장", () => {
  if (!snap) throw new Error("① 단계가 실패해서 이어갈 수 없어요");
  for (const n of [2, 3]) {
    check(runTraineeUntilSurvival(P), `${n - 1}번째 연장 시즌도 클릭만으로 데뷔 서바이벌까지 간다`);
    playSurvivalRound(P, true);
    playSurvivalRound(P, false);
    check(toEnding(P) === "screen-ending", `${n - 1}번째 연장 뒤 엔딩 화면이 뜬다 (${P.active()})`);
    check(endTitle(P) === "연습생 재계약", `다시 🌱 연습생 재계약 엔딩이다 (${endTitle(P)})`);

    const btn = P.$("btn-trainee-ext");
    check(!!btn, `${n}번째 연장 버튼이 또 나온다 — 횟수 제한이 없다`);
    const note = P.$("ext-note");
    const txt = note ? note.textContent.replace(/\s+/g, " ") : "";
    check(txt.includes(`${n}번째 연장`), `안내가 ${n}번째 연장이라고 알려준다 ("${txt.slice(0, 34)}…")`);
    check(txt.includes(`-${Math.round(PENALTY * n * 100)}%p`),
      `문턱이 -${Math.round(PENALTY * n * 100)}%p로 올라간다고 알려준다`);
    check(P.curSlot() != null, `${n - 1}번째 연장 뒤 엔딩에서도 세이브가 살아 있다`);
    check(!!P.$("btn-idol-retire"), `${n - 1}번째 연장 뒤에도 '🏛️ 기록 남기고 마무리'가 남아 있다`);

    if (!btn) break;
    btn.click();
    check(P.state().traineeExt === n, `연장 횟수가 ${n}이 된다 (${P.state().traineeExt})`);
    check(P.state().year === 3 && P.state().month === 1,
      `또 3년차 1월로 돌아간다 (${P.state().year}년차 ${P.state().month}월)`);
  }
});

// ---------- ④ 연장할수록 데뷔 확률이 실제로 낮아진다 ----------
/* 같은 능력치·같은 팬덤에서 연장 횟수만 0·1·3으로 바꿔 각 3000판씩 굴린다.
 * 스냅샷은 ①에서 실제 플레이로 도달한 서바이벌 시점 상태다. 팬덤만 고정값으로
 * 맞춰 두어 p가 clamp 구간(0.12/0.93)에 처박히지 않게 한다. */
console.log("=== ④ 연장 횟수별 데뷔 확률 (각 3000판) ===");
const RUNS = 3000;
const rates = {};
guard("확률 비교", () => {
  if (!snap) throw new Error("① 단계가 실패해서 이어갈 수 없어요");
  const base = deep(snap);
  base.fandom = 260;          // p를 중간 구간에 놓으려고 고정해요
  base.condition = 80;
  const baseJson = JSON.stringify(base);
  const Q = makePage(0x51ed2701, 0);
  newTrainee(Q, 0);            // 슬롯·화면을 실제 입구를 통해 만들어 둬요

  const DEBUT_TITLES = ["데뷔조 센터 데뷔!", "데뷔조 합류!"];
  for (const ext of [0, 1, 3]) {
    let debut = 0, rounds = 0;
    for (let i = 0; i < RUNS; i++) {
      Q.w.__armSurvival(baseJson, ext);
      const go = Q.w.document.querySelector("#action-list .go-game");
      if (!go) throw new Error("데뷔 서바이벌 출전 버튼이 안 떠요");
      go.click();
      // 화면 버튼만 눌러 서바이벌을 끝까지 굴려요
      for (let g = 0; g < 40 && Q.active() === "screen-stage"; g++) Q.$("btn-stage-next").click();
      if (Q.active() !== "screen-ending") throw new Error(`엔딩까지 못 갔어요 (${Q.active()})`);
      rounds += Q.state().stages - base.stages;
      if (DEBUT_TITLES.includes(endTitle(Q))) debut++;
    }
    rates[ext] = debut / RUNS;
    console.log(`  연장 ${ext}회 — 데뷔 ${(rates[ext] * 100).toFixed(1)}% · 평균 ${(rounds / RUNS).toFixed(2)}라운드 소화`);
  }
  Q.dom.window.close();

  check(rates[1] < rates[0],
    `연장 1회가 0회보다 데뷔 확률이 낮다 (${(rates[0] * 100).toFixed(1)}% → ${(rates[1] * 100).toFixed(1)}%)`);
  check(rates[3] < rates[1],
    `연장 3회가 1회보다 더 낮다 (${(rates[1] * 100).toFixed(1)}% → ${(rates[3] * 100).toFixed(1)}%)`);
  check(rates[0] - rates[3] > 0.05,
    `연장 3회의 손해가 눈에 보일 만큼 크다 (${((rates[0] - rates[3]) * 100).toFixed(1)}%p 차이)`);
  check(rates[0] > 0 && rates[0] < 1, `기준선이 clamp에 처박히지 않았다 (${(rates[0] * 100).toFixed(1)}%)`);
});

// ---------- ⑤ 📞 타사 캐스팅 → 더 약한 기획사에서 데뷔 ----------
console.log("=== ⑤ 세미파이널 탈락 · score ≥ 420 → 📞 타사 캐스팅 ===");
guard("📞 타사 캐스팅", () => {
  const Q = makePage(0x9e3779b9, 0);
  // 대형 SW엔터(데뷔 파워 최상)로 시작해서 라운드 2 탈락 → 📞
  const r = runTo(Q, [true, true, false], 600, 0);
  console.log(`  엔딩 카드: ${r.title} / ${r.team}`);
  const from = AGENCIES[0];
  check(r.title === "타사 캐스팅!", `엔딩 제목이 '타사 캐스팅!'이다 (${r.title})`);
  check(r.team.includes(WEAKEST.name), `이적처가 데뷔 파워 최약체 기획사다 (${r.team})`);
  check(!/노려|노립/.test(r.text), `문구가 '데뷔를 노려요'로 끝나지 않는다`);
  check(r.text.includes("불리"), "출발이 불리하다는 걸 함께 알려준다");

  // ── 검사 7: 데뷔 버튼이 있고, 누르면 더 약한 기획사로 간다
  const btn = Q.$("btn-go-debut");
  check(!!btn, "엔딩 화면 DOM에 '🎬 데뷔 활동 시작!' 버튼(#btn-go-debut)이 있다");
  check(!!btn && btn.textContent.includes("데뷔 활동 시작"),
    `버튼 문구가 '🎬 데뷔 활동 시작!'이다 (${btn ? btn.textContent : "없음"})`);
  check(!Q.$("btn-trainee-ext"), "데뷔로 이어지니 '한 해 더 연습하기'는 없다");
  check(!Q.$("btn-idol-retire"), "마무리 버튼 대신 데뷔로 이어진다");

  check(Q.state().agency === from.id, `누르기 전에는 아직 원소속이다 (${Q.state().agency})`);
  btn.click();
  const S = Q.state();
  check(Q.active() === "screen-pro", `데뷔 활동 화면으로 넘어간다 (${Q.active()})`);
  check(S.phase === "idol-pro", `phase가 데뷔로 바뀐다 (${S.phase})`);
  check(S.agency === WEAKEST.id, `소속이 ${WEAKEST.name}로 바뀐다 (${S.agency})`);
  const now = AGENCIES.find((x) => x.id === S.agency);
  check(!!now && now.debut < from.debut,
    `데뷔 파워가 실제로 낮아진다 (${from.name} ${from.debut} → ${now ? now.name + " " + now.debut : "?"})`);
  check(!S.center, "타사 캐스팅은 센터로 시작하지 않는다");

  // 여러 번 눌러도 늘 최약체 하나로 고정된다 (무작위가 아니다)
  const seen = new Set();
  for (let i = 0; i < 50; i++) { Q.$("btn-go-debut").click(); seen.add(Q.state().agency); }
  check(seen.size === 1 && seen.has(WEAKEST.id), `50번을 눌러도 늘 ${WEAKEST.name}다 (${[...seen].join(",")})`);
  Q.dom.window.close();
});

console.log("=== ⑤-2 이미 최약체 소속이면 더 나빠지지도, 좋아지지도 않는다 ===");
guard("📞 최약체 소속", () => {
  const idx = AGENCIES.findIndex((x) => x.id === WEAKEST.id);
  const Q = makePage(0x9e3779b9, idx);
  const r = runTo(Q, [true, true, false], 600, idx);
  console.log(`  엔딩 카드: ${r.title} / ${r.team}`);
  check(!!Q.$("btn-go-debut"), "이 경우에도 데뷔 버튼이 나온다");
  Q.$("btn-go-debut").click();
  check(Q.state().agency === WEAKEST.id, `소속이 ${WEAKEST.name} 그대로다 (${Q.state().agency})`);
  check(!/타사/.test(r.title), `옮길 곳이 없으니 '타사 캐스팅'이라고 말하지 않는다 (${r.title})`);
  Q.dom.window.close();
});

// ---------- ⑥ 📹 홀로서기 · 🎒 작별은 여전히 진짜 엔딩이다 ----------
console.log("=== ⑥ 📹 홀로서기 선언 · 🎒 연습실과 작별 ===");
for (const [name, fandom] of [["홀로서기 선언", 300], ["연습실과 작별", 0]]) {
  guard(name, () => {
    const Q = makePage(0x9e3779b9, 0);
    const r = runTo(Q, [false], fandom, 0);   // 예선 탈락 → lastRound = 0
    console.log(`  엔딩 카드: ${r.title} / ${r.team}`);
    check(r.title === name, `${name} 엔딩에 닿는다 (${r.title})`);
    check(!Q.$("btn-go-debut"), `${name} — 데뷔 버튼이 없다`);
    check(!Q.$("btn-trainee-ext"), `${name} — 연장 버튼도 없다 (진짜 엔딩이 남는다)`);
    check(!!Q.$("btn-idol-retire"), `${name} — '🏛️ 기록 남기고 마무리'로만 끝난다`);
    check(Q.curSlot() == null, `${name} — 이어갈 길이 없으니 예전처럼 clearSave()가 돈다`);
    Q.dom.window.close();
  });
}

// ---------- ⑦ 끝맺음 엔딩의 문구가 다음 장을 약속하지 않는다 ----------
/* 특정 문장을 통째로 비교하면 문구를 다듬을 때마다 빨개져요.
 * "미래를 약속하는 어미가 있느냐"만 봐요.
 * 📞 타사 캐스팅은 이제 실제로 데뷔로 이어지니 앞을 보는 문구가 맞아요 — ⑤가 맡아요. */
const PROMISE_FORMS = [
  { re: /봐요|봅시다|보자/, why: "청유·시도형(…해봐요)" },
  { re: /노려|겨냥/, why: "목표 선언(노려요)" },
  { re: /도전해요|도전합니다|재도전해요/, why: "앞으로의 도전 선언" },
  { re: /이어가요|이어집니다|계속돼요|계속됩니다/, why: "이야기가 계속된다는 예고" },
  { re: /할 거예요|갈 거예요|될 거예요|올라갈|시작해요|출발해요/, why: "미래 시제" },
  { re: /기다려요|기다리고 있어요|기다립니다/, why: "다음 장을 기다리게 하는 표현" },
  { re: /다음 (해|시즌|무대|이야기|장)/, why: "다음 장 직접 언급" },
];

function endingMsg(emoji) {
  const at = SRC_GAME.indexOf(`emoji = "${emoji}"`);
  if (at < 0) return null;
  const m = SRC_GAME.slice(at, at + 900).match(/msg\s*=\s*"([^"]*)"/);
  return m ? m[1] : null;
}

console.log("=== ⑦ 끝맺음 엔딩의 문구 ===");
for (const [emoji, name] of [["📹", "홀로서기 선언"], ["🎒", "연습실과 작별"]]) {
  const msg = endingMsg(emoji);
  check(!!msg, `${emoji} ${name}의 msg를 소스에서 뽑았다`);
  if (!msg) continue;
  console.log(`  ${emoji} ${msg}`);
  const hits = PROMISE_FORMS.filter((f) => f.re.test(msg));
  check(hits.length === 0,
    `${emoji} ${name} — 다음 장을 약속하는 어미가 없다${hits.length ? ` (걸린 것: ${hits.map((h) => h.why).join(", ")})` : ""}`);
}

// ---------- ⑧ 배선 ----------
console.log("=== ⑧ 배선 ===");
{
  const hook = grab(SRC_GAME, /window\.IdolCareer\.onEnding\([\s\S]*?\n\s*\);/);
  check(!!hook, "game.js에서 onEnding 호출부를 뽑았다");
  check(!!hook && !/score\s*>=\s*420|lastRound === 2/.test(hook),
    "onEnding 호출부가 420·라운드 조건을 다시 계산하지 않는다 (엔딩 분기의 플래그를 그대로 넘긴다)");
  check(/function onEnding\(debutable, center, opts\)/.test(SRC_CAREER),
    "career.js의 onEnding이 세 번째 인자(opts)를 받는다");
  check(/keepSave/.test(SRC_CAREER) && /keepSave/.test(SRC_GAME),
    "game.js가 넘긴 keepSave를 career.js가 읽는다");
  check(/if \(keepSave\) save\(\);\s*\n?\s*else clearSave\(\);/.test(SRC_CAREER),
    "keepSave면 save(), 아니면 clearSave() — 두 갈래가 다 있다");
  check(/castAgency/.test(SRC_GAME) && /castAgency/.test(SRC_CAREER),
    "game.js가 넘긴 castAgency를 career.js가 읽는다");
  check(/function enterCareer\(center, castAgency\)/.test(SRC_CAREER),
    "enterCareer가 이적할 기획사를 인자로 받는다");
  // 연장 횟수 제한이 어디에도 없다
  check(!/traineeExt\s*(>=|>)\s*\d/.test(SRC_GAME) && !/if \(S\.traineeExt\) return/.test(SRC_GAME),
    "연장 횟수를 막는 조건이 없다 (무제한)");
  check(/- extPenalty\(\)/.test(SRC_GAME), "라운드 통과 확률에서 연장 패널티를 뺀다");
}

P.dom.window.close();
console.log(fail ? `\n❌ ${fail}개 실패` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
