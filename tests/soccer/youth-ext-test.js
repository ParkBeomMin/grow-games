/* 🌱 유스 재계약 연장 — 엔딩 문구가 약속한 "한 시즌 더"를 실제로 주는지 본다.
 *
 * 엔딩 7종 중 프로로 이어지는 건 셋(👑·🌟·💜)뿐이었는데, 나머지가 다음 장을
 * 약속하는 문구를 달고 그냥 끝났다. 사용자가 "유스 재계약인데 게임 끝난거야?"라고
 * 물어온 게 이 검증의 출발점이다.
 * (그 뒤 📞 타 구단 스카우트도 프로로 열렸다 — scout-path-test.js가 맡는다.)
 *
 * showEnding을 직접 부르지 않는다. jsdom에 beta/soccer/index.html을 통째로 띄우고
 * 타이틀 → 유스 선택 → 포지션 → 이름 → 훈련 36개월 → 프로 도전까지 **실제 버튼을
 * 클릭**해서 도달한다. 확인도 전부 DOM과 localStorage에서 읽는다.
 * (cloud.js 때 스크립트 로드 순서가 틀려 기능이 죽었는데도 문자열 매칭 테스트는
 *  전부 초록이었던 적이 있다. 그래서 입구를 통해서만 들어간다.)
 *
 * 프로 도전의 통과 판정은 `Math.random() < p`이고 p는 [0.12, 0.93]으로 clamp된다.
 * 그래서 난수 전체를 0.93 위로 올리면 무조건 탈락, 0.12 아래로 내리면 무조건 통과다.
 * 호출 순서를 세지 않아도 라운드 결과를 확정할 수 있다.
 *
 * 상수는 소스에서 뽑아 쓴다. eval("const x = …")은 선언이 eval 스코프에 갇히니
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
const deep = (o) => JSON.parse(JSON.stringify(o));

const SRC_GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
const SRC_CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");

// ---------- 소스에서 뽑는 상수 ----------
const rawSaveKey = grab(SRC_GAME, /const SAVE_KEY = "[^"]+";/);
check(!!rawSaveKey, "game.js에서 SAVE_KEY를 뽑는다");
const SAVE_KEY = rawSaveKey ? new Function(`${rawSaveKey} return SAVE_KEY;`)() : "winger-save-v1";
const SLOTS_KEY = SAVE_KEY + "-slots";

const rawRounds = grab(SRC_GAME, /const SURVIVAL_ROUNDS = \[[^\]]*\];/);
const SURVIVAL_ROUNDS = rawRounds
  ? new Function(`${rawRounds} return SURVIVAL_ROUNDS;`)()
  : ["구단 트라이아웃", "2군 테스트", "1군 콜업", "프로 계약"];

// ---------- 페이지 부트스트랩 ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  localStorage.setItem("grow-auto-mini", "1");   // 승부처 미니게임 자동 진행
  /* jsdom에는 캔버스가 없어요. 레이더 차트는 이 검증과 무관하니 무해한 스텁으로 막아요 —
   * 안 막으면 이름 화면에서 던져서 로그가 스택 트레이스로 묻혀요. */
  HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
`;
let HTML = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
HTML = HTML.replace("</head>", `<script>${PRELUDE}</script></head>`);
/* game.js의 S·curSlot은 let 선언이라 window에 안 붙는다.
 * 전역 어휘 스코프는 스크립트끼리 공유되니 페이지 안에서 eval로 읽는다. */
HTML = HTML.replace("</body>", `<script>
  window.__get = (n) => eval(n);
</script></body>`);

/* 한 판을 끝까지 굴리면 화면 상태가 되돌아오지 않아서(엔딩은 location.reload로만 나간다)
 * 시나리오마다 페이지를 새로 띄운다. */
function makePage() {
  const dom = new JSDOM(HTML, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
  const w = dom.window;
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };

  /* 난수 제어 — 기본은 재현 가능한 PRNG, 필요할 때만 통과/탈락 구간으로 고정한다. */
  let seed = 0x9e3779b9;
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
    curSlot: () => w.__get("curSlot"),
    slots: () => JSON.parse(w.localStorage.getItem(SLOTS_KEY) || "{}"),
  };
}

// ---------- 입구부터 클릭으로만 진행하는 조작 ----------
function newPlayer(P) {
  const { w, $, active } = P;
  $("btn-new").click();
  if (active() !== "screen-agency") throw new Error(`새 게임 시작 → 유스 선택으로 못 갔어요 (${active()})`);
  const agency = w.document.querySelector("#agency-list .card");
  if (!agency) throw new Error("유스 카드가 안 그려졌어요");
  agency.click();
  if (active() !== "screen-position") throw new Error(`유스를 골라도 포지션 화면이 안 떠요 (${active()})`);
  const pos = w.document.querySelector('#position-list .card[data-pos="wg"]');
  if (!pos) throw new Error("윙어 카드가 없어요");
  pos.click();
  if (active() !== "screen-name") throw new Error(`포지션을 골라도 이름 화면이 안 떠요 (${active()})`);
  $("input-name").value = "연장이";
  $("btn-start").click();
  if (active() !== "screen-main") throw new Error(`입단해도 육성 화면이 안 떠요 (${active()})`);
}

const restBtn = (P) => Array.from(P.w.document.querySelectorAll("#action-list .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);

/* 육성 화면에서 휴식만 눌러 달을 넘기고, 유스 대회가 뜨면 끝까지 치른다.
 * 프로 도전(서바이벌) 화면에 닿으면 거기서 멈춘다 — 라운드 결과는 호출부가 정한다. */
/* 🔥 특훈 화면을 여섯 회차 굴려 프로 재도전까지 간다.
 * 회차마다 능력치 하나를 고르고 💪 노력을 누른다 (자동 미니게임이라 연타는 대신 굴러요). */
function runCamp(P) {
  const { w, $, active } = P;
  for (let t = 0; t < 40 && active() === "screen-camp"; t++) {
    const done = $("btn-camp-done");
    if (done) { done.click(); return true; }
    const stat = w.document.querySelector("#camp-actions .camp-stat");
    if (stat) { stat.click(); continue; }
    const effort = $("btn-camp-effort");
    if (!effort) return false;
    effort.click();
  }
  return active() !== "screen-camp";
}

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

/* 프로 도전 한 라운드 — 첫 클릭은 경기 시작, 둘째 클릭은 빨리감기(=통과 판정이 도는 곳).
 * 판정 직전에 모드를 걸어 두면 결과가 확정된다. */
function playSurvivalRound(P, wantPass) {
  P.setMode(wantPass ? "pass" : "fail");
  P.$("btn-stage-next").click();   // 경기 시작
  P.$("btn-stage-next").click();   // ⏩ 빨리감기 → 승부처 → 판정 → 결과
  P.setMode("normal");
}

// 마지막 결과 화면에서 한 번 더 눌러 엔딩으로 넘어간다
function toEnding(P) {
  P.$("btn-stage-next").click();
  return P.active();
}

// ---------- ① 유스 재계약 엔딩에 실제로 닿는다 ----------
console.log("=== ① 유스 3년을 클릭으로 소화해 🌱 유스 재계약 엔딩까지 ===");
const P = makePage();
let snap = null;
guard("🌱 엔딩 도달", () => {
  newPlayer(P);
  check(runYouthUntilSurvival(P), "휴식·대회 버튼만 눌러 3년을 마치고 프로 도전 화면에 닿는다");
  check(P.state().year === 3 && P.state().month === 12,
    `프로 도전은 3년차 12월에 열린다 (${P.state().year}년차 ${P.state().month}월)`);

  playSurvivalRound(P, true);    // 구단 트라이아웃 통과
  playSurvivalRound(P, false);   // 2군 테스트 탈락 → lastRound = 1
  check(toEnding(P) === "screen-ending", `결과를 받아들이면 엔딩 화면이 뜬다 (${P.active()})`);

  const card = P.$("ending-card").textContent;
  console.log(`  엔딩 카드: ${P.$("ending-card").querySelector(".draft-title").textContent} / ${P.$("ending-card").querySelector(".draft-team").textContent}`);
  check(card.includes("유스 재계약"), `도달한 엔딩이 🌱 유스 재계약이다 (${card.slice(0, 40)}…)`);

  // ── 검사 1: 버튼이 DOM에 실제로 있다
  const ext = P.$("btn-youth-ext");
  check(!!ext, "엔딩 화면 DOM에 연장 버튼(#btn-youth-ext)이 있다");
  /* ⚠️ 문구가 '한 시즌 더 뛰기' → '🔥 1년 특훈 시작'으로 바뀌었어요.
   * 예전 연장은 3년차를 통째로 다시 뛰게 했는데, 방금 한 걸 반복하는 거라
   * 무엇을 바꿔야 하는지도 손에 안 잡혔습니다. 지금은 여섯 번의 선택이에요. */
  check(!!ext && ext.textContent.includes("특훈"),
    `버튼 문구가 '🔥 1년 특훈 시작'이다 (${ext ? ext.textContent : "없음"})`);
  check(!!ext && P.w.document.querySelector("#screen-ending .draft-actions").contains(ext),
    "버튼이 엔딩 화면의 선택지 영역 안에 붙어 있다");

  // 연장을 안 쓰고 끝낼 길도 남아 있어야 한다
  check(!!P.$("btn-idol-retire"), "'🏛️ 기록 남기고 마무리' 선택지가 그대로 남아 있다");
  check(!P.$("btn-go-debut"), "유스 재계약은 프로로 안 가니 '프로 커리어 시작' 버튼은 없다");

  // ── 검사 3(앞부분): 엔딩 시점에 세이브가 아직 살아 있다
  check(P.curSlot() != null, "엔딩 화면에서 clearSave()가 돌지 않았다 (curSlot이 살아 있다)");
  check(Object.keys(P.slots()).length === 1,
    `저장 슬롯이 그대로 있다 (${Object.keys(P.slots()).length}개)`);

  snap = deep(P.state());
});

// ---------- ② 버튼을 누르면 🔥 특훈 화면, 능력치·명성은 그대로 ----------
console.log("=== ② '🔥 1년 특훈 시작'을 눌렀을 때 ===");
guard("연장 실행", () => {
  if (!snap) throw new Error("① 단계가 실패해서 이어갈 수 없어요");
  P.$("btn-youth-ext").click();

  const S = P.state();
  check(P.active() === "screen-camp", `🔥 특훈 화면으로 간다 (${P.active()})`);
  check(S.campDone === true, "특훈을 시작했다는 표시가 선다");
  /* 특훈은 **들어가는 순간에는** 아무것도 안 바꿔요 — 능력치를 움직이는 건
   * 회차마다 고르는 노력/도박입니다. 아래 검사들이 그 출발선을 지켜요. */

  const same = Object.keys(snap.stats).filter((k) => S.stats[k] !== snap.stats[k]);
  check(same.length === 0,
    `능력치가 그대로다 (${Object.keys(snap.stats).map((k) => `${k} ${Math.round(snap.stats[k])}`).join(" · ")}${same.length ? ` — 바뀐 것: ${same.join(",")}` : ""})`);
  check(S.fandom === snap.fandom, `명성이 그대로다 (${snap.fandom} → ${S.fandom})`);
  const ty = snap.youth || {}, ny = S.youth || {};
  check(ny.g === ty.g && ny.a === ty.a && ny.def === ty.def,
    `유스 기록(골·도움·수비)이 그대로다 (⚽${ty.g} 🅰️${ty.a} 🛡️${ty.def})`);
  check(S.stages === snap.stages, `출전 경기 수가 그대로다 (${snap.stages})`);
  check(JSON.stringify(S.talents) === JSON.stringify(snap.talents), "재능이 그대로다");

  // ── 검사 3: 누른 뒤에도 세이브가 살아 있다
  check(P.curSlot() != null, "누른 뒤에도 clearSave()가 돌지 않았다 (curSlot이 살아 있다)");
  const slots = P.slots();
  const ids = Object.keys(slots);
  check(ids.length === 1, `저장 슬롯이 정확히 하나 남아 있다 (${ids.length}개)`);
  const saved = ids.length ? slots[ids[0]] : null;
  check(!!saved && saved.campDone === true,
    `디스크에 저장된 값에도 특훈 표시가 남는다 (${saved ? saved.campDone : "없음"})`);
  check(!!saved && saved.youthExt === true, "저장된 상태에 연장 사용 표시(youthExt)가 남는다");
});

/* ---------- ③ 한 번 쓰면 다시 안 나온다 — 대신 프로로 흘러요 ----------
 *
 * ⚠️ 예전에는 연장을 다 쓴 뒤에 또 떨어지면 **다시 🌱 유스 재계약**이 떴어요.
 * 버튼은 없고 "구단과의 이야기가 모두 끝났어요"만 남는, 프로 무대를 한 번도
 * 못 밟고 끝나는 자리였습니다. 실측으로 이 엔딩이 가장 흔했어요(38%).
 * 지금은 연장을 다 쓰면 📹 세미프로로 흘러요 — 사다리 맨 아래라도 프로예요. */
console.log("=== ③ 연장한 시즌을 또 실패했을 때 ===");
guard("두 번째 유스 재계약", () => {
  if (!snap) throw new Error("① 단계가 실패해서 이어갈 수 없어요");
  /* 🔥 특훈은 유스 1년을 반복하지 않아요 — 여섯 회차를 마치면 곧바로 프로 재도전입니다. */
  check(runCamp(P), "특훈 여섯 회차를 마치면 프로 재도전으로 이어진다");
  playSurvivalRound(P, true);
  playSurvivalRound(P, false);
  check(toEnding(P) === "screen-ending", `두 번째 엔딩 화면이 뜬다 (${P.active()})`);
  const title = P.$("ending-card").querySelector(".draft-title").textContent;
  check(!P.$("ending-card").textContent.includes("유스 재계약"),
    `연장을 다 썼으면 🌱 유스 재계약이 다시 뜨지 않는다 (${title})`);
  check(!P.$("btn-youth-ext"), "이미 연장을 썼으니 '한 시즌 더 뛰기' 버튼이 없다");
  /* 성적이 아주 나쁘면 🎒로 끝날 수도 있어요. 그때는 마무리 버튼이 남고,
   * 프로로 이어지면 '프로 커리어 시작'이 뜹니다 — 둘 중 하나는 반드시 있어야 해요. */
  const goPro = !!P.$("btn-go-debut");
  check(goPro || !!P.$("btn-idol-retire"),
    `끝내는 길이든 프로로 가는 길이든 버튼이 하나는 있다 (${title})`);
  check(!goPro || P.curSlot() != null,
    `프로로 이어지면 세이브가 남는다 (${title})`);
  check(goPro || P.curSlot() == null,
    `정말 끝나는 엔딩이면 예전처럼 clearSave()가 돈다 (${title})`);
});

// ---------- ④ 프로로 가는 엔딩에는 연장 버튼이 없다 ----------
const N = SURVIVAL_ROUNDS.length;   // 라운드 수도 소스에서 받아요
const PRO_CASES = [
  { label: "🌟/👑 프로 계약 성공", passes: Array(N).fill(true) },
  { label: "💜 1군 콜업 대기", passes: [...Array(N - 1).fill(true), false] },
];
console.log("=== ④ 프로로 이어지는 엔딩 ===");
for (const c of PRO_CASES) {
  guard(c.label, () => {
    const Q = makePage();
    newPlayer(Q);
    runYouthUntilSurvival(Q);
    for (const p of c.passes) playSurvivalRound(Q, p);
    check(toEnding(Q) === "screen-ending", `${c.label} — 엔딩 화면이 뜬다 (${Q.active()})`);
    const title = Q.$("ending-card").querySelector(".draft-title").textContent;
    check(!Q.$("btn-youth-ext"), `${c.label}(${title}) — 연장 버튼이 없다`);
    check(!!Q.$("btn-go-debut"), `${c.label}(${title}) — '프로 커리어 시작' 버튼이 나온다`);
    check(!Q.$("btn-idol-retire"), `${c.label}(${title}) — 마무리 버튼 대신 프로 진출로 이어진다`);
    Q.dom.window.close();
  });
}

// ---------- ⑤ 끝나는 엔딩의 문구가 다음 장을 약속하지 않는다 ----------
/* 특정 문장을 통째로 비교하면 문구를 다듬을 때마다 빨개진다.
 * "미래를 약속하는 어미가 있느냐"만 본다. */
const PROMISE_FORMS = [
  { re: /봐요|봅시다|보자/, why: "청유·시도형(…해봐요)" },
  { re: /노려|겨냥/, why: "목표 선언(노려요)" },
  { re: /도전해요|도전합니다|재도전해요/, why: "앞으로의 도전 선언" },
  { re: /이어가요|이어집니다|계속돼요|계속됩니다/, why: "이야기가 계속된다는 예고" },
  { re: /할 거예요|갈 거예요|될 거예요|올라갈|시작해요|출발해요/, why: "미래 시제" },
  { re: /기다려요|기다리고 있어요|기다립니다/, why: "다음 장을 기다리게 하는 표현" },
  { re: /다음 (시즌|무대|이야기|장)/, why: "다음 장 직접 언급" },
];
const CLOSING_END = /(었어요|았어요|였어요|했어요|네요|니까!?)[.!…]?$/;

/* 그 엔딩 분기 안의 msg만 잘라 온다.
 *
 * ⚠️ 예전 추출기는 `msg\s*=\s*"…"`만 봤다. 📹 세미프로의 msg는 템플릿 리터럴로
 * 시작해서 안 잡혔고, **다음 분기(🎒)의 문구를 대신 읽고** 있었다.
 * 그런데도 초록이었다 — 🎒 문구가 마침 끝맺음 형태였기 때문이다.
 * (그리고 📹는 이제 semiPro = true로 실제 프로로 이어져서, 앞을 보는 문구가 맞다.
 *  정말 끝나는 엔딩은 🎒 하나뿐이고, 그것도 특훈을 다 썼을 때만이다.) */
function endingMsg(emoji) {
  const at = SRC_GAME.indexOf(`emoji = "${emoji}"`);
  if (at < 0) return null;
  const seg = SRC_GAME.slice(at, at + 900);
  /* 분기의 끝에서 자른다. 🎒는 마지막 else라 뒤에 "} else"가 없으니
   * 줄 시작의 닫는 중괄호를 경계로 쓴다 — 안 자르면 화면 HTML까지 읽는다. */
  const end = seg.search(/\n  \}(?:\n| else)/);
  const body = end > 0 ? seg.slice(0, end) : seg;
  /* 마지막 문자열 조각을 가져온다 — 🎒는 `canExtend ? "…" : "…"` 꼴이라
   * **끝나는 쪽(false 가지)**이 뒤에 온다. 거기가 진짜 끝맺음 문구다. */
  const all = [...body.matchAll(/"([^"\n]{12,})"/g)].map((m) => m[1]);
  return all.length ? all[all.length - 1] : null;
}

console.log("=== ⑤ 끝맺음 엔딩의 문구 ===");
for (const [emoji, name] of [["🎒", "축구화를 잠시 벗다 (특훈까지 다 쓴 뒤)"]]) {
  const msg = endingMsg(emoji);
  check(!!msg, `${emoji} ${name}의 msg를 소스에서 뽑았다`);
  if (!msg) continue;
  console.log(`  ${emoji} ${msg}`);
  const hits = PROMISE_FORMS.filter((f) => f.re.test(msg));
  check(hits.length === 0,
    `${emoji} ${name} — 다음 장을 약속하는 어미가 없다${hits.length ? ` (걸린 것: ${hits.map((h) => h.why).join(", ")})` : ""}`);
  const tail = msg.split(/(?<=[.!…])\s+/).filter(Boolean).pop() || msg;
  check(CLOSING_END.test(tail.trim()),
    `${emoji} ${name} — 마지막 문장이 끝맺음 형태다 ("${tail.trim()}")`);
}

// ---------- ⑥ 배선 — career.js가 세이브를 남길 길을 갖고 있다 ----------
console.log("=== ⑥ 배선 ===");
check(/function onEnding\(canGoPro, captain, opts\)/.test(SRC_CAREER),
  "career.js의 onEnding이 세 번째 인자(opts)를 받는다");
check(/keepSave/.test(SRC_CAREER) && /keepSave/.test(SRC_GAME),
  "game.js가 넘긴 keepSave를 career.js가 읽는다");
check(/keepSave\)\s*save\(\);\s*else\s*clearSave\(\);/.test(SRC_CAREER.replace(/\s+/g, " ").replace(/if \(keepSave\) /, "keepSave) ")),
  "keepSave면 save(), 아니면 clearSave() — 두 갈래가 다 있다");

P.dom.window.close();
console.log(fail ? `\n❌ ${fail}개 실패` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
