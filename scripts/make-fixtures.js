/* beta/_fixtures.js 를 만드는 스크립트예요.
 *
 *   node scripts/make-fixtures.js            # 전부 다시 뽑아요
 *   node scripts/make-fixtures.js soccer     # 축구 시나리오만
 *   node scripts/make-fixtures.js idol       # 아이돌 시나리오만
 *   node scripts/make-fixtures.js rookie     # 야구 시나리오만
 *
 * ── 왜 이렇게 만드나요 ─────────────────────────────────────────────
 * 확인용 세이브를 손으로 지으면 안 돼요. 실제 게임이 만들지 않는 조합이 섞여서,
 * 화면은 멀쩡한데 진짜 플레이에서는 다르게 보이는 상황이 생겨요.
 * 그래서 tests/soccer/*.js · tests/idol/*.js 와 똑같은 방식으로 jsdom에 페이지를
 * 통째로 띄우고, 타이틀 → 유스 → 프로 도전 → 시즌까지 **실제 버튼을 클릭**해서
 * 목표 상태까지 갑니다. 거기서 localStorage를 통째로 떠서 beta/_fixtures.js에 씁니다.
 *
 * 난수는 시드를 심어 고정해요(semipro-test.js와 같은 PRNG). 산식이 바뀌면
 * 같은 시드라도 다른 상태가 나오니, 그때는 이 스크립트를 다시 돌리면 돼요.
 *
 * ── beta:: 네임스페이스 주의 ───────────────────────────────────────
 * env.js는 경로에 /beta/가 있으면 localStorage를 'beta::'로 감싸요.
 * 여기서는 jsdom URL을 https://x.test/soccer/ 로 두어 **접두사 없는 키**를 뽑고,
 * beta/_check.html이 env.js를 함께 불러서 심을 때 다시 접두사가 붙게 합니다.
 * 그래야 상용/베타 어느 쪽에 두어도 그 환경의 키로 심겨요.
 *
 * eval("const x = …")은 쓰지 않아요 — 선언이 eval 자기 스코프에 갇혀 밖으로 안 새요. */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = "/workspace/grow-games";
const BETA = path.join(ROOT, "beta");
const OUT = path.join(BETA, "_fixtures.js");
const { JSDOM } = require(path.join(ROOT, "tests/cloud/jsdom.js"));

const only = process.argv[2] || "";
const log = (m) => { console.log(m); };

/* jsdom 페이지를 닫으면, 아직 매달려 있던 cloud.js의 fetch 콜백이 사라진 document를
 * 만지면서 터져요. 게임 코드가 잘못된 게 아니라 페이지를 닫는 순서 문제라,
 * **페이지 안에서 난 예외만** 삼키고 계속 갑니다. 밖에서 난 건 그대로 죽어야 해요. */
process.on("uncaughtException", (e) => {
  if (String((e && e.stack) || "").includes("x.test")) return;
  console.error(e);
  process.exit(1);
});

// ---------- 페이지 부트스트랩 (tests/soccer/semipro-test.js와 같은 방식) ----------
const PRELUDE_BASE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  window.confirm = () => false;   // jsdom엔 confirm이 없어요. '아니오'로 답해 각성·은퇴를 막습니다.
  /* 페이지를 닫을 때 정리하려고 타이머를 모아 둬요. 안 그러면 setInterval이 남아서
   * 페이지가 메모리에서 안 풀리고, 수백 번 열면 힙이 터져요. */
  window.__timers = [];
  (function () {
    var st = window.setTimeout, si = window.setInterval;
    window.setTimeout = function () { var id = st.apply(window, arguments); window.__timers.push(id); return id; };
    window.setInterval = function () { var id = si.apply(window, arguments); window.__timers.push(id); return id; };
  })();
  localStorage.setItem("grow-auto-mini", "1");   // 승부처 미니게임 자동 진행
  HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
`;

const htmlCache = {};
function pageHTML(game) {
  if (htmlCache[game]) return htmlCache[game];
  const dir = path.join(BETA, game);
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8")
    .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(dir, src.split("?")[0]);
      if (!fs.existsSync(p)) return "";
      /* 세이브 심기는 env.js **뒤**, game.js **앞**이어야 해요.
       * env.js는 /beta/ 경로에서 localStorage에 'beta::' 접두사를 씌우고,
       * game.js는 로드하자마자 슬롯을 읽어요. 순서가 틀리면 조용히 아무 일도 안 나요. */
      return `<script>\n${fs.readFileSync(p, "utf8")}\n</script>`
        + (src.endsWith("env.js") ? "<!--SEED-->" : "");
    });
  /* game.js의 S·overall·leagueOf는 `let`/`function` 선언이라 window에 안 붙어요.
   * 전역 어휘 스코프는 스크립트끼리 공유되니, 페이지 안에서 eval로 읽어요. */
  html = html.replace("</body>", `<script>window.__get = (n) => eval(n);</script></body>`);
  htmlCache[game] = html;
  return html;
}

/* 세이브를 미리 심고 페이지를 여는 경우에 쓰는 조각이에요.
 * </script>가 JSON 안에 들어가면 스크립트가 그 자리에서 끊기니 쪼개 둡니다. */
const seedScript = (data) =>
  data
    ? `(function(){var d=${JSON.stringify(data).replace(/<\/script/gi, "<\\/script")};` +
      `for(var k in d)localStorage.setItem(k,d[k]);})();`
    : "";

function makePage(game, seed0, seedData) {
  const html = pageHTML(game)
    .replace("</head>", `<script>${PRELUDE_BASE}</script></head>`)
    .replace("<!--SEED-->", seedData ? `<script>${seedScript(seedData)}</script>` : "");
  const dom = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true, url: `https://x.test/${game}/`,
  });
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
  /* 통과 판정은 `Math.random() < p`이고 p는 [0.12, 0.93]으로 clamp돼요.
   * 난수를 0.93 위로 올리면 무조건 탈락, 0.12 아래로 내리면 무조건 통과예요.
   * seed0에 null을 주면 진짜 난수를 써요 — 엔딩 확률을 재는 데 씁니다. */
  let mode = "normal";
  const base = seed0 == null ? Math.random : prng;
  w.Math.random = () => {
    const r = base();
    if (mode === "pass") return r * 0.11;
    if (mode === "fail") return 0.94 + r * 0.05;
    return r;
  };

  const $ = (id) => w.document.getElementById(id);
  const P = {
    dom, w, $, game,
    active: () => (w.document.querySelector(".screen.active") || {}).id,
    setMode: (m) => { mode = m; },
    get: (n) => w.__get(n),
    state: () => w.__get("S"),
    overall: () => w.__get("overall")(),
    close: () => {
      try {
        for (const id of (w.__timers || [])) { w.clearTimeout(id); w.clearInterval(id); }
        w.__timers = [];
      } catch { /* 이미 닫혔으면 넘어가요 */ }
      try { dom.window.close(); } catch { /* 같은 이유 */ }
    },
  };
  return P;
}

// ---------- localStorage 통째로 뜨기 ----------
/* 게임이 실제로 쓴 키를 그대로 떠요. 다만 아래 셋은 반드시 빼요.
 *
 *  · grow-auto-mini · grow-ad-cd — 사용자 취향이에요. 확인하려다 설정이 바뀌면 안 돼요.
 *  · grow-player-id · grow-cloud-token — **기기 정체성**이에요. 이게 딸려 가면 폰이
 *    이 생성 스크립트의 기기인 척하게 돼서, 사용자의 클라우드 세이브를 덮어쓸 수 있어요.
 *    확인용 도구가 낼 수 있는 사고 중 제일 큰 게 이겁니다.
 *  · grow-cloud-dirty-* · grow-visit-* — 동기화 표시와 방문 기록이에요. 남의 기기에
 *    심어봐야 의미가 없고, 클라우드에 헛된 업로드만 부릅니다. */
const SKIP_KEYS = new Set(["grow-auto-mini", "grow-ad-cd", "grow-player-id", "grow-cloud-token"]);
const SKIP_PREFIX = ["grow-cloud-dirty-", "grow-visit-"];
const skipKey = (k) => SKIP_KEYS.has(k) || SKIP_PREFIX.some((p) => k.startsWith(p));

function snapshot(P) {
  const ls = P.w.localStorage;
  const out = {};
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k || skipKey(k)) continue;
    out[k] = ls.getItem(k);
  }
  return out;
}

// ---------- 공통 조작 (전부 실제 클릭이에요) ----------
function newPlayer(P, agencyIdx, pos, name) {
  const { w, $ } = P;
  $("btn-new").click();
  const cards = w.document.querySelectorAll("#agency-list .card");
  if (!cards[agencyIdx]) throw new Error(`소속 카드 ${agencyIdx}번이 없어요`);
  cards[agencyIdx].click();
  const posCard = w.document.querySelector(`#position-list .card[data-pos="${pos}"]`);
  if (!posCard) throw new Error(`포지션 카드 ${pos}가 없어요`);
  posCard.click();
  $("input-name").value = name;
  $("btn-start").click();
  if (P.active() !== "screen-main") throw new Error(`육성 화면에 못 갔어요 (${P.active()})`);
}

/* 훈련 전략 — "lowest"는 가장 낮은 능력치를, "pos"는 주 포지션 능력치를 먼저 올려요.
 * 컨디션이 바닥이면 무조건 쉬어요(훈련 실패 확률이 커져요). */
function doAct(P, sel, plan) {
  const st = P.state();
  /* 🔮 각성·🌠 초월 버튼은 빼요. confirm으로 물어보는데 여기서는 늘 '아니오'라
   * 눌러도 아무 일이 안 나요 — 그대로 두면 같은 버튼만 계속 누르며 갇힙니다. */
  const list = Array.from(P.w.document.querySelectorAll(sel))
    .filter((b) => !b.disabled && b.dataset.key && !b.classList.contains("awaken-act"));
  if (!list.length) return false;
  const rest = list.find((b) => b.dataset.key === "__rest");
  if (st.condition < 45 && rest) { rest.click(); return true; }
  // "rest"는 아예 훈련을 안 해요 — 종합 능력치를 낮게 유지하는 데 써요.
  if (plan === "rest" && rest) { rest.click(); return true; }
  const trains = list.filter((b) => b.dataset.key !== "__rest");
  if (!trains.length) { list[0].click(); return true; }
  if (plan === "pos") {
    const key = P.get("POS_INFO")[st.pos].stat;
    const want = trains.find((b) => b.dataset.key === key);
    if (want) { want.click(); return true; }
  }
  let best = trains[0], bv = Infinity;
  for (const b of trains) {
    const v = st.stats[b.dataset.key];
    if (typeof v === "number" && v < bv) { bv = v; best = b; }
  }
  best.click();
  return true;
}

/* 유스 3년을 굴려요.
 * stopAtGate가 true면 **프로 도전 버튼이 뜬 육성 화면**에서 멈춰요.
 * 여기가 유스 엔딩 시나리오의 스냅샷 자리예요 — 이 순간의 세이브에는
 * pendingStage = {kind:"survival"}이 들어 있어서, 다시 열면 도전 버튼이 그대로 떠요.
 * (버튼을 누르는 순간 pendingStage가 지워진 채로 저장돼서, 그 뒤에 뜨면 늦어요.) */
function youthUntilSurvival(P, plan, stopAtGate) {
  for (let g = 0; g < 8000; g++) {
    const id = P.active();
    if (id === "screen-stage") {
      if ((P.get("ev") || {}).kind === "survival") return true;
      P.$("btn-stage-next").click();
      continue;
    }
    if (id === "screen-main") {
      const go = P.w.document.querySelector("#action-list .go-game");
      if (go) {
        if (stopAtGate && (P.state().pendingStage || {}).kind === "survival") return true;
        go.click();
        continue;
      }
      if (!doAct(P, "#action-list .action-btn", plan)) throw new Error("육성 화면에 누를 게 없어요");
      continue;
    }
    throw new Error(`예상 못 한 화면이에요 (${id})`);
  }
  throw new Error("8000번을 눌러도 프로 도전에 못 닿았어요");
}

/* 프로 도전 한 라운드. wantPass가 null이면 진짜 판정에 맡겨요.
 * 클릭은 두 번이에요 — ⏩ 빨리감기 → 승부처(자동) → 결과. */
function survivalRound(P, wantPass) {
  if (wantPass != null) P.setMode(wantPass ? "pass" : "fail");
  P.$("btn-stage-next").click();
  P.$("btn-stage-next").click();
  P.setMode("normal");
}

// 프로 도전이 끝난 뒤 엔딩 화면으로 넘어가요.
function toEnding(P) {
  P.$("btn-stage-next").click();
  return P.active();
}
// 커리어 모듈 이름이 게임마다 달라요 (축구 WingerCareer · 아이돌 IdolCareer).
const careerOf = (P) => P.w.WingerCareer || P.w.IdolCareer || P.w.Career;

const endingTitle = (P) => {
  const el = P.$("ending-card").querySelector(".draft-title");
  return el ? el.textContent : "";
};

// 프로 한 시즌을 버튼 클릭만으로 끝까지 소화해요 (결산 화면까지).
function playSeason(P, plan) {
  for (let g = 0; g < 4000; g++) {
    const id = P.active();
    if (id === "screen-career") return true;
    if (id === "screen-pro") {
      const go = P.w.document.querySelector("#pro-actions .go-game");
      if (go) { go.click(); continue; }
      if (!doAct(P, "#pro-actions .action-btn", plan)) return false;
      continue;
    }
    if (id === "screen-concept") {
      // 아이돌 — 컨셉을 골라야 무대가 열려요. 소문 첫 칸을 고릅니다.
      const act = P.state().activity;
      const want = (act.rumor && act.rumor[0]) || "cool";
      const card = P.w.document.querySelector(`#concept-list .concept-card[data-cid="${want}"]`);
      if (!card) return false;
      card.click();
      continue;
    }
    if (id === "screen-reveal") { P.$("btn-reveal-go").click(); continue; }
    if (id === "screen-stage") { P.$("btn-stage-next").click(); continue; }
    return false;
  }
  return false;
}

const nextSeasonBtn = (P) => Array.from(P.w.document.querySelectorAll("#career-actions .btn"))
  .find((b) => /시즌 시작|년차 컴백 준비/.test(b.textContent));

// ---------- 축구: 프로 데뷔까지 ----------
/* mode: "pro"    — 전 라운드 통과 → 🌟 프로 계약 성공 (K리그1에서 출발)
 *       "semi"   — 첫 라운드 탈락 + 명성 시드 → 📹 세미프로 입단 (K리그3에서 출발)
 *
 * "semi"의 명성 시드는 tests/soccer/semipro-test.js가 쓰는 것과 같은 방법이에요.
 * 엔딩 분기는 score = S.fandom + overall() * 2 를 보는데, 봇이 클릭만으로 얻는 score는
 * 330 문턱에 못 닿아요. 그래서 프로 도전 화면에 닿은 직후에 살아 있는 S.fandom만 심고,
 * 엔딩 제목을 화면에서 다시 읽어 실제로 📹가 떴는지 확인합니다. */
function soccerDebut(P, mode, plan, marketIdx) {
  /* marketIdx — 유스 국적(MARKETS의 자리). 안 넘기면 예전과 같아요.
   * 국적이 🌟 프로 계약 데뷔 리그를 정하므로, 나라별 시나리오는 여기를 바꿔서 만들어요.
   *   0 🇰🇷 K리그 · 1 🇯🇵 J리그 · 2 🇧🇷 브라질 · 3 🇬🇧 잉글랜드 · 4 🇮🇹 이탈리아
   * (난이도 순으로 놓여 있어요 — 뒤로 갈수록 데뷔 리그가 험해요) */
  const agency = marketIdx != null ? marketIdx : (mode === "semi" ? 0 : 1);
  newPlayer(P, agency, "fw", mode === "semi" ? "밑바닥" : "윙어");
  youthUntilSurvival(P, plan);
  if (mode === "semi") {
    P.state().fandom = 400;
    survivalRound(P, false);
  } else {
    for (let i = 0; i < P.get("SURVIVAL_ROUNDS").length; i++) survivalRound(P, true);
  }
  if (toEnding(P) !== "screen-ending") throw new Error(`엔딩 화면이 안 떠요 (${P.active()})`);
  const title = endingTitle(P);
  const want = mode === "semi" ? "세미프로 입단" : "프로 계약 성공";
  // 제목에 느낌표가 붙는 엔딩이 있어요 ("프로 계약 성공!"). 포함으로 봅니다.
  if (!title.includes(want)) throw new Error(`엔딩이 '${want}'가 아니라 '${title}'이에요`);
  const btn = P.$("btn-go-debut");
  if (!btn) throw new Error("엔딩 화면에 '프로 커리어 시작' 버튼이 없어요");
  btn.click();
  return title;
}

const upOffers = (P) => {
  const st = P.state();
  const tier = P.get("leagueOf")(st).tier;
  return (careerOf(P).transferOffers(st) || []).filter((o) => o.league.tier > tier);
};
const lastHype = (P) => {
  const ys = P.state().career.years;
  return ys.length ? ys[ys.length - 1].hype : 0;
};

// ---------- 시나리오 ----------
/* 시나리오 하나가 끝날 때마다 파일에 바로 써요. 한 시나리오를 굴리는 데 몇 분씩 걸려서,
 * 뒤에서 터지면 앞의 결과까지 통째로 날아가면 다시 몇십 분을 굴려야 해요. */
const fixtures = [];
const add = (f) => { fixtures.push(f); log(`  ✅ ${f.id} — ${f.title}`); writeOut(); };

/* ⚽ ① 이적 화면 (K리그1 · 상위 리그 제안)
 * 3시즌 오프시즌에 유로파리그 제안이 오려면 직전 시즌 평가가 5.5 이상이어야 해요.
 * 시즌 성적은 판정이 섞여서 시드마다 달라요 — 조건에 맞는 시드를 찾을 때까지 굴립니다. */
function makeSoccerTransfer() {
  log("⚽ ① 이적 화면 — 🇰🇷 K리그1 3시즌 오프시즌, 상위 리그 제안");
  const YEARS = 3;
  for (const seed of seeds(40)) {
    let P;
    try {
      P = makePage("soccer", seed);
      /* 🇰🇷 국내 유스로 시작해요 — 유스 국적이 데뷔 리그를 정하게 되면서
       * 기본값(🇪🇺 유럽 아카데미)은 이탈리아 1부에서 출발합니다. 이 시나리오가
       * 보려는 건 "K리그1에서 위 리그 제안이 어떻게 보이나"예요. */
      soccerDebut(P, "pro", "pos", 0);
      let ok = false;
      for (let y = 1; y <= YEARS; y++) {
        if (!playSeason(P, "pos")) break;
        if (y === YEARS) ok = true;
        else { const b = nextSeasonBtn(P); if (!b) break; b.click(); }
      }
      const st = P.state();
      const up = ok ? upOffers(P) : [];
      if (ok && st.league === 1 && st.proYear === YEARS && up.length && P.$("btn-transfer")) {
        add({
          id: "soccer-transfer",
          game: "soccer", url: "soccer/", emoji: "💼",
          title: "이적 화면 — 상위 리그 제안",
          state: `${st.group} · ${P.get("leagueOf")(st).name} · ${st.proYear}시즌 오프시즌 · 직전 평가 ${lastHype(P).toFixed(1)}`,
          check: "리그 11개 묶음과 카드가 좁은 화면에서 안 겹치고, 카드마다 리그·계약금·평점 페널티·나라 특색이 다 읽히는지",
          steps: ["게임이 열리면 <b>이어하기</b> → 선수 카드", "결산 화면에서 <b>💼 이적 제안 보기</b>"],
          keys: snapshot(P),
        });
        P.close();
        return;
      }
      P.close();
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log("  ❌ 조건에 맞는 상태를 못 만들었어요 (이적 화면)");
}

/* ⚽ ② 하부 리그 이적 — K리그3에서 승격(K리그2) 제안 */
function makeSoccerPromote() {
  log("⚽ ② 하부 리그 이적 — 🇰🇷 K리그3에서 승격 제안");
  const bottom = null;
  for (const seed of seeds(40)) {
    let P;
    try {
      P = makePage("soccer", seed);
      soccerDebut(P, "semi", "pos");
      let ok = false;
      for (let y = 1; y <= 3; y++) {
        if (!playSeason(P, "pos")) break;
        if (y >= 2 && upOffers(P).length && P.$("btn-transfer")) { ok = true; break; }
        const b = nextSeasonBtn(P); if (!b) break; b.click();
      }
      const st = P.state();
      /* ⚠️ "떠나온 리그 그대로"를 요구하면 안 돼요. 팀 승강제가 생기면서 하부 리그
       * 1위 팀이 시즌 끝에 통째로 승격해 버립니다 — 실제로 시드 40개가 전부
       * 그렇게 빠져나갔어요. 보려는 건 "하부 리그에서 위 제안이 어떻게 보이나"라
       * 어느 하부 리그인지는 상관없어요. */
      if (ok && P.get("leagueOf")(st).tier <= 2) {
        const up = upOffers(P);
        const names = [...new Set(up.map((o) => o.league.name))].join(" · ");
        add({
          id: "soccer-promote",
          game: "soccer", url: "soccer/", emoji: "🪜",
          title: "하부 리그 이적 — 승격 제안",
          state: `${st.group} · ${P.get("leagueOf")(st).name} · ${st.proYear}시즌 오프시즌 · 승격 제안 ${names}`,
          check: "▲ 위 리그 · 지금 리그 · ▼ 아래 리그가 사다리 순서대로 놓이고, 하부 리그 카드의 '상은 쉬워도 값어치가 작아요'가 보이는지",
          steps: ["게임이 열리면 <b>이어하기</b> → 선수 카드", "결산 화면에서 <b>💼 이적 제안 보기</b>"],
          keys: snapshot(P),
        });
        P.close();
        return;
      }
      P.close();
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log("  ❌ 조건에 맞는 상태를 못 만들었어요 (하부 리그 이적)");
  return bottom;
}

/* ⚽ ③ 연말 결산 — 이적 이력이 여러 줄 쌓인 상태
 * 오프시즌마다 제안 하나를 실제로 눌러서 옮겨요. moveLog가 그 기록을 읽습니다. */
function makeSoccerReport() {
  log("⚽ ③ 연말 결산 — 이적 이력 여러 줄");
  for (const seed of seeds(20)) {
    let P;
    try {
      P = makePage("soccer", seed);
      soccerDebut(P, "pro", "pos");
      for (let y = 1; y <= 6; y++) {
        if (!playSeason(P, "pos")) break;
        // 2시즌부터 오프시즌마다 실제 카드를 눌러 이적해요
        const tf = P.$("btn-transfer");
        if (tf && y >= 2 && y <= 5) {
          tf.click();
          const cards = Array.from(P.w.document.querySelectorAll("#transfer-list .tf-card"));
          const pickCard = cards.find((c) => c.dataset.club !== P.state().group);
          if (pickCard) pickCard.click();
        }
        if (y === 6) break;
        const b = nextSeasonBtn(P); if (!b) break; b.click();
      }
      const st = P.state();
      if ((st.moves || []).length >= 3 && P.active() === "screen-career") {
        add({
          id: "soccer-report",
          game: "soccer", url: "soccer/", emoji: "📊",
          title: "연말 결산 — 이적 이력 여러 줄",
          state: `${st.group} · ${P.get("leagueOf")(st).name} · ${st.proYear}시즌 · 이적 ${st.moves.length}번`,
          check: "소속 칸에 클럽 이름이 나오는지, 리그 태그가 붙은 칸이 세로로 쪼개지지 않는지 봐주세요",
          steps: ["게임이 열리면 <b>이어하기</b> → 선수 카드", "바로 결산 화면이 떠요"],
          keys: snapshot(P),
        });
        P.close();
        return;
      }
      P.close();
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log("  ❌ 조건에 맞는 상태를 못 만들었어요 (연말 결산)");
}

/* 🏆 컵 대회 — 리그 4위 안에 들면 시즌이 끝난 뒤 8강부터 단판 토너먼트예요.
 * 리그 마지막 경기 결과 화면에서 멈춥니다 — 거기 '컵 8강 진출' 버튼이 있어요.
 * 그 버튼을 눌러야 대진이 뽑히니(startCup) 세이브에는 아직 컵이 없어요. */
function makeSoccerCup() {
  log("🏆 ⑨ 컵 대회 — 리그 4위 안, 8강 진출 직전");
  for (const seed of seeds(20)) {
    let P;
    try {
      P = makePage("soccer", seed);
      soccerDebut(P, "pro", "pos", 0);
      let hit = false;
      for (let g = 0; g < 6000; g++) {
        const id = P.active();
        if (id === "screen-stage") {
          const btn = P.$("btn-stage-next");
          /* 컵 진출 버튼을 **눌러서** 대진까지 뽑고 멈춰요. 누르기 전 상태를 뜨면
           * S.cup이 없어서, 이어하기로 들어갔을 때 컵이 통째로 사라집니다 —
           * 리그 종료 전환은 이 버튼에만 걸려 있고 세이브에는 안 남거든요. */
          if (btn && /컵|8강/.test(btn.textContent)) { btn.click(); hit = true; break; }
          btn.click(); continue;
        }
        if (id !== "screen-pro") break;
        const go = P.w.document.querySelector("#pro-actions .go-game");
        if (go) { go.click(); continue; }
        if (!doAct(P, "#pro-actions .action-btn", "pos")) break;
      }
      const st = P.state();
      if (hit) {
        const cup = P.get("SoccerCup").nameOf(P.get("leagueOf")(st).name && P.get("leagueOf")(st).country);
        add({
          id: "soccer-cup",
          game: "soccer", url: "soccer/", emoji: "🏆",
          title: `컵 대회 — ${cup} 8강`,
          state: `${st.group} · ${P.get("leagueOf")(st).name} · ${st.proYear}시즌 · ${cup} 8강 대진 완료`,
          check: "8강 → 4강 → 결승 단판 세 경기예요. 2부 팀이 대진에 섞여 나오는지, "
            + "비겼을 때 승부차기가 뜨는지(키퍼가 튼 반대쪽을 고르면 골) 봐주세요",
          steps: [
            "게임이 열리면 <b>이어하기</b> → 선수 카드",
            "훈련 2회를 쓰고 <b>🏆 …컵 8강 시작</b>을 눌러요 (대진은 이미 뽑혀 있어요)",
            "이기면 다음 라운드, 지면 거기서 끝이에요",
          ],
          keys: snapshot(P),
        });
        P.close();
        return;
      }
      P.close();
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log("  ❌ 조건에 맞는 상태를 못 만들었어요 (컵 대회)");
}

/* 🎓 유스 라운드 판정 근거 — "왜 떨어졌는지"를 보는 자리.
 *
 * 5:3으로 이기고 평점 A에 4골 1도움인데 탈락한 제보가 있었어요. 확률 판정이라
 * 일어날 수 있는 일인데(그 경기는 75%였어요) 화면에 근거가 없어 버그로 읽혔습니다.
 * 이제 결과 아래에 📊 통과 확률과 가장 크게 민 것/깎은 것이 붙어요.
 *
 * **프로 도전 직전**에서 멈춥니다 — 도전을 누르면 4라운드가 이어지고, 라운드마다
 * 그 줄이 뜹니다. 판정이 확률이라 통과도 탈락도 다 볼 수 있게 능력치를 중간에
 * 두고, 그 상태에서 1라운드 확률이 얼마인지 실제로 재서 적어 둬요. */
function makeSoccerJudge() {
  log("🎓 ⑩ 유스 라운드 판정 근거 — 프로 도전 직전");
  for (const seed of seeds(14)) {
    let P;
    try {
      P = makePage("soccer", seed);
      newPlayer(P, 0, "fw", "판정확인");
      youthUntilSurvival(P, "pos", true);
      const st = P.state();
      const ovr = P.overall();
      /* 능력치가 너무 높으면 늘 통과라 "왜 떨어졌는지"를 못 봐요.
       * 중간 구간(45~70)이라야 통과와 탈락이 둘 다 나옵니다. */
      if (ovr < 45 || ovr > 70) { P.close(); continue; }
      // 1라운드 통과 확률을 그 상태 그대로 계산해요 (화면에 뜰 값과 같은 식)
      const m = P.get("marketOf")();
      const base = 0.51 + (ovr - 50) / 90 + m.debut * 0.35 - 0.21
        + st.fandom / 1500 + (st.condition - 50) / 900;
      const lo = Math.round(Math.max(0.12, base - 0.32) * 100);
      const hi = Math.round(Math.min(0.93, base + 0.25) * 100);
      add({
        id: "soccer-judge",
        game: "soccer", url: "soccer/", emoji: "📊",
        title: "유스 라운드 판정 — 왜 떨어졌나",
        state: `${st.year}년차 · 종합 ${Math.round(ovr)} · 명성 ${Math.round(st.fandom)} — `
          + `통과와 탈락이 둘 다 나오는 구간이에요 (1라운드 ${lo}~${hi}%)`,
        check: "결과 아래 <b>🗣️ 감독 한마디</b>를 봐주세요. 잘하고도 떨어지면 \"자네가 못해서가 아니야\", "
          + "모자라서 떨어지면 무엇이 모자랐는지 짚어 줘요. 숫자 대신 말로 알려줍니다",
        steps: [
          "게임이 열리면 <b>이어하기</b> → 선수 카드",
          "<b>🔥 프로 도전</b>을 눌러요",
          "라운드마다 결과 아래에 🗣️ 감독 한마디가 붙어요 — 4라운드까지 이어져요",
        ],
        keys: snapshot(P),
      });
      P.close();
      return;
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log("  ❌ 조건에 맞는 상태를 못 만들었어요 (유스 판정)");
}

/* 🌍 나라 특색 — 유스 국적이 데뷔 리그를 정하고, 그 나라가 훈련·회복·수입에 얹혀요.
 *
 * 리그의 가치가 prestige 하나뿐일 때는 "어디서 상을 받아야 명예의 전당 점수가 큰가"로
 * 수렴했어요. 실측하니 능력치 62~150 어디에서도 최적이 네 리그뿐이었습니다.
 * 그래서 나라마다 다른 축에 곱셈을 하나씩 걸었어요 — 그게 화면에서 읽히는지 봐야 해요.
 *
 * 프로 준비 화면에서 멈춥니다. 소속 줄에 특색 딱지가 붙고, 훈련을 누르면 로그에
 * 국기가 찍혀요(배수가 걸린 훈련이라는 표시). 훈련을 몇 번 눌러 로그를 만들어 둡니다. */
function makeSoccerNation(marketIdx, tag) {
  log(`🌍 ${tag.emoji} ${tag.title}`);
  for (const seed of seeds(10)) {
    let P;
    try {
      P = makePage("soccer", seed);
      soccerDebut(P, "pro", "pos", marketIdx);
      // 준비 화면에서 몇 턴 눌러 훈련·휴식 로그를 남겨요 (경기로는 안 넘어가요)
      for (let i = 0; i < 6; i++) {
        if (P.active() !== "screen-pro") break;
        if (P.w.document.querySelector("#pro-actions .go-game")) break;
        if (!doAct(P, "#pro-actions .action-btn", "pos")) break;
      }
      const st = P.state();
      const lg = P.get("leagueOf")(st);
      if (P.active() === "screen-pro" && lg.country === tag.country) {
        add({
          id: `soccer-nation-${tag.country}`,
          game: "soccer", url: "soccer/", emoji: tag.emoji,
          title: tag.title,
          state: `${st.group} · ${lg.flag} ${lg.name} · ${tag.trait}`,
          check: tag.check,
          steps: [
            "게임이 열리면 <b>이어하기</b> → 선수 카드",
            "소속 줄에 <b>나라 특색 딱지</b>가 붙어 있어요",
            "아래 훈련 로그에 국기가 찍힌 줄이 그 배수가 걸린 훈련이에요",
          ],
          keys: snapshot(P),
        });
        P.close();
        return;
      }
      P.close();
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log(`  ❌ 조건에 맞는 상태를 못 만들었어요 (${tag.title})`);
}

/* ⚽ 경기 결과의 평점 순위표 — 라이벌 '소속' 칸.
 *
 * 순위 행을 만드는 map이 name·score만 옮겨서, 라이벌 소속이 전부 "-"로 보였어요.
 * 함께 버려졌던 역할 딱지(에이스 스트라이커 …)도 이제 같이 나와요 —
 * CSS가 display:block이라 소속 아래로 한 줄이 더 붙습니다. 그 모양을 봐야 해요.
 *
 * 결과 화면 자체는 세이브에 안 남아요(경기 도중 상태예요). 그래서 **다음 경기가
 * 대기 중인 상태**를 심어요. 열고 '경기하러 가기'를 한 번 누르면 그 화면이 나옵니다.
 * 시즌 중반까지 굴려서 라이벌 평점이 골고루 흩어지게 합니다. */
function makeSoccerChart() {
  log("⚽ ⑧ 경기 결과 평점 순위표 — 라이벌 소속");
  const MATCHES = 6;
  for (const seed of seeds(12)) {
    let P;
    try {
      P = makePage("soccer", seed);
      soccerDebut(P, "pro", "pos");
      let played = 0;
      for (let g = 0; g < 4000; g++) {
        const id = P.active();
        if (id === "screen-stage") { P.$("btn-stage-next").click(); continue; }
        if (id !== "screen-pro") break;
        const go = P.w.document.querySelector("#pro-actions .go-game");
        if (go) {
          if (played >= MATCHES) break;   // 여기서 멈춰요 — 다음 경기가 대기 중
          go.click(); played++; continue;
        }
        if (!doAct(P, "#pro-actions .action-btn", "pos")) break;
      }
      const st = P.state();
      const rivals = (st.activity && st.activity.rivals) || [];
      const ready = P.active() === "screen-pro" && !!P.w.document.querySelector("#pro-actions .go-game");
      // 라이벌에 소속이 실제로 박혀 있어야 확인이 의미가 있어요
      const clubsOK = rivals.length >= 5 && rivals.every((r) => r.club && r.name);
      if (played >= MATCHES && ready && clubsOK) {
        add({
          id: "soccer-chart",
          game: "soccer", url: "soccer/", emoji: "⭐",
          title: "경기 결과 평점 순위표 — 라이벌 소속",
          state: `${st.group} · ${st.proYear}시즌 · ${played}경기 소화 · 라이벌 ${rivals.length}명`,
          check: "순위표 소속 칸에 라이벌 클럽이 나오는지 봐주세요 (예전엔 전부 \"-\"였어요). "
            + "소속 아래 작은 글씨로 역할 딱지가 한 줄 더 붙는데, 표가 너무 길어 보이면 말씀해 주세요",
          steps: [
            "게임이 열리면 <b>이어하기</b> → 선수 카드",
            "<b>⚽ 경기하러 가기</b>를 눌러요",
            "경기가 끝나면 아래에 평점 순위표가 나와요",
          ],
          keys: snapshot(P),
        });
        P.close();
        return;
      }
      P.close();
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log("  ❌ 조건에 맞는 상태를 못 만들었어요 (평점 순위표)");
}

/* ⚽ 팀 승강제 — 리그 순위표 1위/꼴찌로 내 팀이 통째로 리그를 오르내려요.
 * 개인 이적 사다리와는 다른 축이라, 화면에서 둘이 어떻게 겹치는지 봐야 해요.
 * 승격이 실제로 일어난 시즌의 결산 화면을 심습니다. */
/* ⚽ 팀 승강제 — 리그 순위표 1위/꼴찌로 내 팀이 통째로 리그를 오르내려요.
 * 개인 이적 사다리와는 다른 축이라, 화면에서 둘이 어떻게 겹치는지 봐야 해요.
 *
 * kind: "up" 승격 · "down" 강등
 *  · 승격은 K리그3(세미프로 데뷔)에서 봐야 해요 — 프로 계약은 K리그1이라 국내
 *    최상위여서 올라갈 곳이 없습니다.
 *  · 강등은 반대로 K리그1(프로 계약)에서 시작해야 내려갈 곳이 있어요.
 *
 * 승강 조건이 '2위와 승점 8 차 + 그 리그 3시즌째'라 평범하게 굴리면 오래 걸려요.
 * 능력치를 실어(또는 눌러) 리그를 압도하거나 바닥을 치게 만듭니다 — 확인하려는 건
 * 승강 화면이지 "능력치를 어떻게 만들었나"가 아니에요.
 * 훈련으로 능력치가 움직이니 매 시즌 다시 눌러줍니다. */
function makeSoccerPromoRelegation(kind) {
  const up = kind === "up";
  log(up ? "⚽ ⑥ 팀 승격 — 리그 우승" : "⚽ ⑦ 팀 강등 — 최하위");
  for (const seed of seeds(8)) {
    let P;
    try {
      P = makePage("soccer", seed);
      soccerDebut(P, up ? "semi" : "pro", "pos");
      const setPower = () => {
        const st = P.state();                 // 실제 상태 객체라 직접 고치면 돼요
        for (const k of Object.keys(st.stats)) st.stats[k] = up ? 110 : 8;
        st.condition = up ? 90 : 30;
      };
      setPower();
      let hit = null;
      for (let y = 1; y <= 5; y++) {
        if (!playSeason(P, "pos")) break;
        const last = (P.state().career.years || []).slice(-1)[0];
        if (last && last.promo === (up ? "up" : "down")) { hit = last; break; }
        const b = nextSeasonBtn(P);
        if (!b) break;
        b.click();
        setPower();
      }
      const st = P.state();
      if (hit && P.active() === "screen-career") {
        add({
          id: up ? "soccer-promo" : "soccer-releg",
          game: "soccer", url: "soccer/", emoji: up ? "🔺" : "🔻",
          title: up ? "팀 승격 — 리그 우승" : "팀 강등 — 최하위",
          state: `${st.group} · ${hit.y}시즌 ${up ? "우승 → 승격" : "최하위 → 강등"} · 다음 리그 ${hit.promoTo}`,
          check: `결산에 ${up ? "🔺" : "🔻"} 안내가 뜨는지, 다음 시즌 준비 화면의 리그와 순위표가 바뀐 리그로 바뀌는지 봐주세요`,
          steps: ["게임이 열리면 <b>이어하기</b> → 선수 카드", `결산 화면에 ${up ? "승격" : "강등"} 안내가 있어요`, "<b>다음 시즌 시작</b>을 누르면 새 리그예요"],
          keys: snapshot(P),
        });
        P.close();
        return;
      }
      P.close();
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log(`  ❌ 조건에 맞는 상태를 못 만들었어요 (팀 ${up ? "승격" : "강등"})`);
}

/* ⚽ ④·⑤ 유스 엔딩 두 종 — 세이브만으로는 재현이 안 돼요.
 *
 * 엔딩 화면은 '프로 도전'의 판정 결과가 정하는데, 그 판정은 세이브에 안 남아요.
 * 그래서 **도전 직전 상태**를 심고, 무엇을 눌러야 하는지와 그 엔딩이 나올 확률을
 * 화면에 적어 줍니다. 확률은 짐작이 아니라, 심은 세이브로 페이지를 다시 열어
 * 진짜 난수로 TRIES번 굴려서 잰 값이에요. */
const ENDING_TRIES = 30;   // 최종 확률을 적을 때 굴리는 횟수
const SEARCH_TRIES = 12;   // 후보를 고를 때 굴리는 횟수 (거칠지만 빨라요)
function measureEnding(keys, wantTitle, tries) {
  const N = tries || ENDING_TRIES;
  let hit = 0;
  const seen = {};
  for (let i = 0; i < N; i++) {
    let P;
    try {
      P = makePage("soccer", null, keys);
      if (!resumeSaved(P)) throw new Error("이어하기 실패");
      const go = P.w.document.querySelector("#action-list .go-game");
      if (!go) throw new Error("프로 도전 버튼이 없어요");
      go.click();
      /* 라운드 수는 판정에 달렸어요. 결과 버튼 문구로 끝을 읽어요 —
       * 이어지면 "<다음 라운드> 도전!", 끝났으면 "…결과…"예요. */
      let guard = 0;
      while (guard++ < 6) {
        survivalRound(P, null);
        if (/결과/.test(P.$("btn-stage-next").textContent)) break;
      }
      toEnding(P);
      const t = P.active() === "screen-ending" ? endingTitle(P) : `(${P.active()})`;
      seen[t] = (seen[t] || 0) + 1;
      if (t.includes(wantTitle)) hit++;
      P.close();
    } catch (e) {
      if (P) P.close();
      seen["(오류) " + e.message] = (seen["(오류) " + e.message] || 0) + 1;
    }
    /* jsdom 페이지 하나가 무거워요. 수백 번 열면 힙이 터지니 틈틈이 정리해요.
     * (--expose-gc 없이 돌리면 이 줄은 그냥 지나갑니다) */
    if (global.gc && i % 4 === 3) global.gc();
  }
  return { pct: Math.round((hit / N) * 100), tries: N, seen };
}

/* 심어 둔 세이브로 페이지를 열고 '이어하기 → 선수 카드'를 실제로 눌러요.
 * 사용자가 폰에서 하는 동작과 똑같은 경로예요. */
function resumeSaved(P) {
  const cont = P.$("btn-continue");
  if (!cont || cont.classList.contains("hidden")) return false;
  cont.click();
  const go = P.w.document.querySelector(".slot-modal .slot-go");
  if (!go) return false;
  go.click();
  return true;
}

/* 후보를 여러 갈래로 만들어요 — 유스 배경(성장·데뷔 파워)과 훈련 방식이 달라지면
 * 통과 확률 p와 score가 함께 움직여서, 어느 엔딩으로 기울지가 달라져요.
 *
 * fandomSeed는 📹 전용이에요. 📹는 score = 명성 + 종합 × 2 가 330을 넘어야 열리는데,
 * 클릭만으로 굴린 유스는 거기 못 닿아요(tests/soccer/semipro-test.js도 같은 이유로
 * 명성만 심습니다). 그래서 자연산 후보를 먼저 다 재보고, 그걸로 📹가 한 번도
 * 안 뜨면 그때만 명성을 심어요. 심은 뒤에도 엔딩은 게임이 정하게 두고,
 * 확률은 실제로 굴려서 잽니다. */
function endingCandidates(kind) {
  const nat = [];
  for (const market of [0, 2]) {
    for (const plan of ["lowest", "pos"]) nat.push({ market, plan, fandomSeed: null });
  }
  if (kind === "youth") return nat;
  /* 📹는 "첫 라운드에서 떨어지는데 score는 330을 넘는" 좁은 자리예요.
   * 통과 확률 p = 0.40 + 데뷔파워×0.35 + (종합-50)/90 + 명성/1500 + (컨디션-50)/900.
   * score = 명성 + 종합×2.
   *
   * score 1점을 올리는 값이 명성 쪽이 훨씬 싸요 — 명성은 p를 0.00067만 올리는데
   * 종합은 0.0056을 올려요(여덟 배). 그래서 **종합은 낮게, 부족한 score는 명성으로**
   * 채우는 게 📹가 가장 잘 나오는 자리예요. 훈련을 안 하는 봇(rest)에
   * 데뷔 파워가 낮은 유스(아프리카·유럽)를 붙이고, 명성은 문턱을 겨우 넘을 만큼만 심어요.
   * "auto"가 그 계산이에요 — 고정값 420을 심으면 p가 같이 올라가서 오히려 👑이 떠요. */
  const semi = [];
  for (const market of [4, 1, 3]) {
    semi.push({ market, plan: "rest", fandomSeed: "auto" });
    semi.push({ market, plan: "lowest", fandomSeed: "auto" });
  }
  return nat.concat(semi);
}

/* 📹 문턱(score)을 game.js 소스에서 뽑아요. `} else if (score >= 330) {` 한 줄이에요. */
function semiScoreGate() {
  const src = fs.readFileSync(path.join(BETA, "soccer/game.js"), "utf8");
  const m = src.match(/else if \(score >= (\d+)\) \{\s*\n\s*emoji = "📹"/);
  if (!m) throw new Error("game.js에서 📹 엔딩의 score 문턱을 못 찾았어요");
  return Number(m[1]);
}

function makeSoccerEnding(kind) {
  const wantTitle = kind === "youth" ? "유스 재계약" : "세미프로 입단";
  log(`⚽ 유스 엔딩 — ${wantTitle} 직전 상태`);
  /* 후보를 전부 거칠게 재고(SEARCH_TRIES), 그중 위 세 개만 제대로 다시 재요(ENDING_TRIES).
   * 12번짜리 표본은 흔들림이 커서, 처음 1등을 그대로 믿으면 운 좋게 뜬 후보를 뽑아요 —
   * 실제로 검색에서 58%로 1등이던 후보가 30번 재니 40%였습니다. */
  const found = [];
  const seedList = [...seeds(2)];
  for (const cand of endingCandidates(kind)) {
    for (const seed of seedList) {
      let P;
      try {
        P = makePage("soccer", seed);
        newPlayer(P, cand.market, "fw", kind === "youth" ? "재계약" : "밑바닥");
        // 프로 도전 버튼이 뜬 육성 화면에서 멈춰요 — 이 순간의 세이브가 '직전 상태'예요.
        youthUntilSurvival(P, cand.plan, true);
        if (cand.fandomSeed != null) {
          /* "auto"는 score(= 명성 + 종합×2)가 문턱을 겨우 넘을 만큼만 심어요.
           * 문턱은 game.js의 엔딩 분기에서 뽑아 와요 — 값을 옮겨 적으면 산식이 바뀌어도 모릅니다. */
          const need = semiScoreGate();
          P.state().fandom = cand.fandomSeed === "auto"
            ? Math.max(0, Math.ceil(need + 15 - P.overall() * 2))
            : cand.fandomSeed;
          P.get("save")();   // 게임의 저장 함수를 그대로 써요
        }
        const keys = snapshot(P);
        const st = P.state();
        const info = `${st.year}년차 ${st.month}월 · 종합 ${Math.round(P.overall())} · 명성 ${Math.round(st.fandom)}`;
        P.close();
        const m = measureEnding(keys, wantTitle, SEARCH_TRIES);
        log(`  · 배경${cand.market}/${cand.plan}${cand.fandomSeed ? "/명성심음" : ""} 시드 ${seed}: ${wantTitle} ${m.pct}% ${JSON.stringify(m.seen)}`);
        if (m.pct > 0) found.push({ keys, info, m, cand });
      } catch (e) {
        if (P) P.close();
        log(`  · 배경${cand.market}/${cand.plan} 시드 ${seed}: ${e.message}`);
      }
    }
  }
  if (!found.length) { log(`  ❌ ${wantTitle} 상태를 못 만들었어요`); return; }

  found.sort((a, b) => b.m.pct - a.m.pct);
  let best = null;
  for (const c of found.slice(0, 3)) {
    const m = measureEnding(c.keys, wantTitle, ENDING_TRIES);
    log(`  · 결선 배경${c.cand.market}/${c.cand.plan}${c.cand.fandomSeed ? "/명성심음" : ""}: ${m.pct}% (${m.tries}번) ${JSON.stringify(m.seen)}`);
    if (!best || m.pct > best.m.pct) best = { ...c, m };
  }
  log(`  → 최종: ${wantTitle} ${best.m.pct}% (${best.m.tries}번)`);
  if (best.m.pct === 0) { log(`  ❌ ${wantTitle} — 다시 재니 한 번도 안 나왔어요`); return; }
  add({
    id: kind === "youth" ? "soccer-youth-ext" : "soccer-semipro",
    game: "soccer", url: "soccer/", emoji: kind === "youth" ? "🌱" : "📹",
    title: kind === "youth" ? "유스 재계약 엔딩 — 한 시즌 더 뛰기" : "세미프로 입단 엔딩 — 프로 커리어 시작",
    state: `${best.info} — 프로 도전 직전`,
    check: kind === "youth"
      ? "엔딩 카드 아래 <b>🌱 한 시즌 더 뛰기</b>가 맨 위에 오고, 버튼 3개가 세로로 안 겹치는지"
      : "엔딩 카드에 K리그3가 적히고 <b>⚽ 프로 커리어 시작!</b> 버튼이 보이는지",
    steps: [
      "게임이 열리면 <b>이어하기</b> → 선수 카드",
      "육성 화면에서 <b>🔥 프로 도전 시작!</b>",
      "트라이아웃을 끝까지 진행하면 엔딩 카드가 떠요",
    ],
    odds: {
      label: kind === "youth" ? "🌱 유스 재계약" : "📹 세미프로 입단",
      pct: best.m.pct, tries: best.m.tries,
      seeded: !!best.cand.fandomSeed,
    },
    keys: best.keys,
  });
}

// ---------- 아이돌 ----------
function idolDebut(P, plan) {
  newPlayer(P, 0, "vocal", "트레이니");
  youthUntilSurvival(P, plan);
  for (let i = 0; i < P.get("SURVIVAL_ROUNDS").length; i++) survivalRound(P, true);
  if (toEnding(P) !== "screen-ending") throw new Error(`엔딩 화면이 안 떠요 (${P.active()})`);
  const btn = P.$("btn-go-debut");
  if (!btn) throw new Error(`데뷔 버튼이 없어요 (엔딩: ${endingTitle(P)})`);
  btn.click();
}

/* 🎤 컴백 컨셉 선택 직전 상태. 컨셉을 고르기 전이라 소문 2종이 살아 있어요.
 * 유행(hot)은 화면에 안 나오지만 세이브에는 들어 있어요 — 🔥 적중 화면을 보려면
 * 무엇을 눌러야 하는지 알아야 해서, 확인 페이지에만 따로 적어 줍니다. */
function makeIdolConcept(id, title, emoji, check, wantHitInfo, seasons) {
  log(`🎤 ${title}`);
  for (const seed of seeds(20)) {
    let P;
    try {
      P = makePage("idol", seed);
      idolDebut(P, "pos");
      for (let y = 1; y < seasons; y++) {
        if (!playSeason(P, "pos")) throw new Error("시즌 소화 실패");
        const b = nextSeasonBtn(P); if (!b) throw new Error("다음 연차 버튼이 없어요"); b.click();
      }
      // 컴백 무대 버튼이 뜰 때까지 연습 턴을 소진해요 (게이트를 우회하지 않아요)
      let guard = 0;
      while (P.active() === "screen-pro" && !P.w.document.querySelector("#pro-actions .go-game") && guard++ < 12) {
        if (!doAct(P, "#pro-actions .action-btn", "pos")) break;
      }
      const st = P.state();
      const act = st.activity;
      if (P.active() !== "screen-pro" || !act || act.concept) throw new Error("컨셉 선택 직전이 아니에요");
      const C = careerOf(P)._t.CONCEPTS;
      const nm = (cid) => { const c = C.find((x) => x.id === cid); return c ? `${c.emoji} ${c.name}` : cid; };
      add({
        id, game: "idol", url: "idol/", emoji, title,
        state: `${st.group} · ${st.proYear}년차 ${act.cb}차 컴백 · 소문 ${act.rumor.map(nm).join(" / ")}`,
        check,
        steps: [
          "게임이 열리면 <b>이어하기</b> → 아이돌 카드",
          "준비 화면에서 <b>💿 컴백 시작</b>",
          wantHitInfo
            ? `컨셉 4장 중 <b>${nm(act.hot)}</b>을 고르면 🔥 적중(+18%) 화면이에요`
            : "소문 2종에 🗣 배지가 붙어 있는지 보세요",
        ],
        keys: snapshot(P),
      });
      P.close();
      return;
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log(`  ❌ 조건에 맞는 상태를 못 만들었어요 (${title})`);
}

/* 🎤 연말 결산 · 🌏 월드투어 · 🏆 그룹 순위표 */
function makeIdolRest() {
  log("🎤 연말 결산 · 월드투어 · 그룹 순위표");
  for (const seed of seeds(20)) {
    let P;
    try {
      P = makePage("idol", seed);
      idolDebut(P, "pos");
      let reportKeys = null, reportInfo = "", standKeys = null, standInfo = "";
      let tourKeys = null, tourInfo = "";
      for (let y = 1; y <= 9; y++) {
        if (!playSeason(P, "pos")) throw new Error("시즌 소화 실패");
        const st = P.state();
        const ys = st.career.years[st.career.years.length - 1];
        if (!reportKeys && (ys.concepts || []).length >= 2 && st.career.years.length >= 5) {
          reportKeys = snapshot(P);
          reportInfo = `${st.group} · ${st.proYear}년차 결산 · 기록 ${st.career.years.length}년`;
        }
        if (!tourKeys && careerOf(P)._t.tourReady()) {
          const tb = Array.from(P.w.document.querySelectorAll("#career-actions .btn"))
            .find((b) => /월드투어/.test(b.textContent));
          if (tb) {
            tourKeys = snapshot(P);
            tourInfo = `${st.group} · ${st.proYear}년차 · 💖 팬덤 ${Math.round(st.fandom)} · ${careerOf(P)._t.tourCities()}개 도시`;
          }
        }
        if (reportKeys && tourKeys) break;
        const b = nextSeasonBtn(P); if (!b) break; b.click();
      }
      // 활동 중(컴백 진행 중) 상태 — 준비 화면의 접이식 순위표가 여기서 보여요
      if (nextSeasonBtn(P)) {
        nextSeasonBtn(P).click();
        let guard = 0;
        while (P.active() === "screen-pro" && !P.w.document.querySelector("#pro-actions .go-game") && guard++ < 12) {
          if (!doAct(P, "#pro-actions .action-btn", "pos")) break;
        }
        const go = P.w.document.querySelector("#pro-actions .go-game");
        if (go) {
          go.click();                                  // 컨셉 화면
          const act = P.state().activity;
          const card = P.w.document.querySelector(`#concept-list .concept-card[data-cid="${act.rumor[0]}"]`);
          if (card) card.click();                      // 유행 공개
          if (P.active() === "screen-reveal") P.$("btn-reveal-go").click();
          if (P.active() === "screen-stage") { P.$("btn-stage-next").click(); P.$("btn-stage-next").click(); }
          if (P.active() === "screen-pro" && P.state().activity) {
            const st = P.state();
            standKeys = snapshot(P);
            standInfo = `${st.group} · ${st.proYear}년차 ${st.activity.cb}차 컴백 W${st.activity.week}/${st.activity.weekTotal}`;
          }
        }
      }
      P.close();

      if (reportKeys) {
        add({
          id: "idol-report", game: "idol", url: "idol/", emoji: "📊",
          title: "연말 결산 — 컨셉 칸이 있는 5칸 표",
          state: reportInfo,
          check: "표가 연차·음방·판매량·<b>컨셉</b>·수상 5칸인데 좁은 화면에서 가로로 안 넘치는지",
          steps: ["게임이 열리면 <b>이어하기</b> → 아이돌 카드", "바로 결산 화면이 떠요"],
          keys: reportKeys,
        });
      }
      if (tourKeys) {
        add({
          id: "idol-tour", game: "idol", url: "idol/", emoji: "🌏",
          title: "월드투어",
          state: tourInfo,
          check: "도시별 객석 막대가 화면 밖으로 안 나가고, 도시가 늘어도 카드 안에서 스크롤되는지",
          steps: ["게임이 열리면 <b>이어하기</b> → 아이돌 카드", "결산 화면에서 <b>🌏 월드투어 떠나기</b>"],
          keys: tourKeys,
        });
      }
      if (standKeys) {
        add({
          id: "idol-standings", game: "idol", url: "idol/", emoji: "🏆",
          title: "그룹 순위표",
          state: standInfo,
          check: "준비 화면의 접이식 순위표를 펴면 그룹들이 한 줄씩 안 겹치게 놓이는지",
          steps: ["게임이 열리면 <b>이어하기</b> → 아이돌 카드", "준비 화면에서 <b>🏆 올해 그룹 순위</b> 줄을 펴세요"],
          keys: standKeys,
        });
      }
      if (reportKeys || tourKeys || standKeys) return;
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  log("  ❌ 조건에 맞는 상태를 못 만들었어요 (아이돌)");
}

// ---------- ⚾ 야구 (더 드래프트) ----------
/* 야구는 축구·아이돌과 화면 이름이 달라요 — 지역(#region-list) · 프로 화면(#pro-actions) ·
 * 경기 연출(screen-tournament)이라 조작 함수를 따로 둡니다.
 *
 * 다섯 자리를 시나리오마다 새로 키우지 않아요. 포스팅 → 대륙 이적 → 대륙 결산 →
 * 대륙시리즈 → 은퇴는 실제로 **한 선수에게 이어지는 한 줄**이라, 그 줄을 그대로
 * 걸어가며 중간중간 뜹니다. 따로 키우면 같은 시즌을 다섯 번 굴리게 되고,
 * 무엇보다 이어지지 않는 다섯 사람이 돼요. */
const rookieAct = (P, sel) => {
  const st = P.state();
  /* 🔮 각성·🌠 초월은 confirm으로 묻는데 여기서는 늘 '아니오'라 눌러도 아무 일이 없어요.
   * 🔁 트레이드(__trade)는 협상 화면으로 새서 시즌이 멎어요. 둘 다 빼요. */
  const list = Array.from(P.w.document.querySelectorAll(sel))
    .filter((b) => !b.disabled && b.dataset.key && b.dataset.key !== "__trade"
      && !b.classList.contains("awaken-act"));
  if (!list.length) return false;
  const rest = list.find((b) => b.dataset.key === "__rest");
  if (st.condition < 45 && rest) { rest.click(); return true; }
  const trains = list.filter((b) => b.dataset.key !== "__rest");
  if (!trains.length) { list[0].click(); return true; }
  // 가장 낮은 능력치부터 올려요 — 한쪽만 키우면 보직 배정이 튀어서 시즌이 흔들려요.
  let best = trains[0], bv = Infinity;
  for (const b of trains) {
    const v = st.stats[b.dataset.key];
    if (typeof v === "number" && v < bv) { bv = v; best = b; }
  }
  best.click();
  return true;
};

// 지역 → 포지션 → 이름 → 고교 3년 → 드래프트 → 프로 무대까지. 전부 실제 클릭이에요.
function rookieDebut(P, regionIdx, pos, name) {
  P.$("btn-new").click();
  const cards = P.w.document.querySelectorAll("#region-list .card");
  if (!cards[regionIdx]) throw new Error(`지역 카드 ${regionIdx}번이 없어요`);
  cards[regionIdx].click();
  const posCard = P.w.document.querySelector(`#position-list .card[data-pos="${pos}"]`);
  if (!posCard) throw new Error(`포지션 카드 ${pos}가 없어요`);
  posCard.click();
  P.$("input-name").value = name;
  P.$("btn-start").click();
  if (P.active() !== "screen-main") throw new Error(`육성 화면에 못 갔어요 (${P.active()})`);

  for (let g = 0; g < 8000; g++) {
    const id = P.active();
    if (id === "screen-draft") break;
    if (id === "screen-tournament") { P.$("btn-tour-next").click(); continue; }
    if (id === "screen-main") {
      const go = P.w.document.querySelector("#action-list .go-game");
      if (go) { go.click(); continue; }
      if (!rookieAct(P, "#action-list .action-btn")) throw new Error("육성 화면에 누를 게 없어요");
      continue;
    }
    throw new Error(`예상 못 한 화면이에요 (${id})`);
  }
  const pro = P.$("btn-go-pro");
  if (!pro) throw new Error(`드래프트 화면에 '프로 무대로' 버튼이 없어요 (${P.active()})`);
  pro.click();
  if (P.active() !== "screen-pro") throw new Error(`프로 화면에 못 갔어요 (${P.active()})`);
}

/* 프로 한 시즌을 결산 화면까지 소화해요 (캠프 → 144경기 → 가을야구 → 결산).
 * onScreen은 화면이 바뀔 때마다 불려요 — 가을야구처럼 시즌 **도중에만** 있는 자리를
 * 뜨려면 여기서 잡아야 해요. 결산까지 가고 나면 S.post가 이미 지워져 있거든요. */
function rookieSeason(P, onScreen) {
  for (let g = 0; g < 40000; g++) {
    const id = P.active();
    if (onScreen) onScreen(P, id);
    if (id === "screen-career") return true;
    if (id === "screen-tournament") { P.$("btn-tour-next").click(); continue; }
    if (id === "screen-pro") {
      const go = P.w.document.querySelector("#pro-actions .go-game");
      if (go) { go.click(); continue; }
      if (!rookieAct(P, "#pro-actions .action-btn")) return false;
      continue;
    }
    return false;
  }
  return false;
}

/* 시즌을 stopAtGame 경기까지만 굴리고 프로 화면(시즌 도중)에서 멈춰요 — 순위표·🏅 타이틀
 * 레이스처럼 '시즌 중에만' 보이는 자리를 뜨려면 결산 전에 멈춰야 해요. */
function playPartial(P, stopAtGame) {
  for (let g = 0; g < 40000; g++) {
    const id = P.active();
    const sn = P.state().season;
    if (id === "screen-pro" && sn && sn.game >= stopAtGame) return true;
    if (id === "screen-career") return false;      // 시즌이 끝나 버렸어요
    if (id === "screen-tournament") { P.$("btn-tour-next").click(); continue; }
    if (id === "screen-pro") {
      const go = P.w.document.querySelector("#pro-actions .go-game");
      if (go) { go.click(); continue; }
      if (!rookieAct(P, "#pro-actions .action-btn")) return false;
      continue;
    }
    return false;
  }
  return false;
}

const campBtn = (P) => Array.from(P.w.document.querySelectorAll("#career-actions .btn"))
  .find((b) => /캠프 시작/.test(b.textContent));
const rookieGates = (P) => P.w.Career._t.postingGates();
const lgOf = (P) => P.w.Career._t.leagueOf(P.state());
const lastWar = (P) => {
  const ss = P.state().career.seasons;
  return ss.length ? ss[ss.length - 1].war : -Infinity;
};
/* 🌏 상에 걸린 리그 가중 배수예요. career.js의 weightNote가 화면에 적는 그 값이고,
 * 여기서는 "가중이 실제로 붙었는가"를 가려 스냅샷 자리를 고르는 데만 씁니다. */
function awardMul(c) {
  const raw = (c.mvp || 0) * 40 + (c.gg || 0) * 15 + (c.roy || 0) * 20;
  const w = (c.mvpW != null ? c.mvpW : c.mvp || 0) * 40
    + (c.ggW != null ? c.ggW : c.gg || 0) * 15
    + (c.royW != null ? c.royW : c.roy || 0) * 20;
  return raw > 0 ? w / raw : 1;
}

const ROOKIE_STEP1 = ["게임이 열리면 <b>이어하기</b> → 선수 카드"];

/* 야구 다섯 자리를 두 단계로 나눠 뽑아요.
 *
 *  1단계 KBO 7년 — 포스팅 화면 두 장을 뜨고, **실제로 대륙 리그로 이적**한 뒤
 *                  그 순간의 세이브를 남겨요.
 *  2단계 대륙 시즌 — 1단계가 남긴 세이브로 페이지를 새로 열어 이어서 굴려요.
 *
 * 왜 나눴냐면, 2단계는 원하는 자리가 뜰 때까지 여러 번 다시 굴려야 하는데
 * 한 페이지에서 이어 붙이면 7시즌짜리 KBO를 매번 다시 굴리게 돼요.
 * 실제로 한 페이지에서 20시즌 넘게 굴렸더니 jsdom 힙이 1.8GB에서 터졌습니다.
 * 나누면 페이지 하나가 짊어지는 시즌 수가 절반으로 줄고, 다시 굴릴 때
 * KBO 7년을 건너뛰어서 훨씬 빨라요. */
function makeRookieAll() {
  log("⚾ 포스팅 · 잠긴 제안 · 대륙 결산 · 대륙시리즈 · 은퇴식");
  const KBO_YEARS = 7;      // KBO → 대륙 직행 문턱이 7년차예요
  const ABROAD_YEARS = 10;  // 한 판에서 대륙 리그를 굴릴 최대 시즌 수
  /* 은퇴식 스냅샷을 고를 때 노리는 가중 배수예요.
   * 대륙은 상대가 세서 WAR이 내려가고, 상(골든글러브 4.5·MVP 5.5)이 쉽게 안 나와요.
   * 그래서 배수가 크게 오르지 않아요 — 그게 이 게임이 실제로 만드는 숫자예요.
   * WANT를 넘으면 거기서 멈추고, 못 넘어도 MIN 위라면 그중 가장 큰 것을 씁니다. */
  const RETIRE_MUL_WANT = 1.25;
  const RETIRE_MUL_MIN = 1.05;
  const done = new Set();

  // ── 1단계: KBO 7년 → 대륙 이적 ─────────────────────────────
  let base = null, baseInfo = "", lockedCand = null;
  for (const seed of seeds(8)) {
    let P;
    try {
      P = makePage("rookie", seed);
      rookieDebut(P, 0, "batter", "확인용");
      lockedCand = null;
      for (let y = 1; y <= KBO_YEARS; y++) {
        if (!rookieSeason(P)) throw new Error(`${y}년차 시즌이 결산까지 안 갔어요`);
        const st = P.state();
        const gs = rookieGates(P);
        const jp = gs.find((g) => g.league.tier === 2);
        const co = gs.find((g) => g.league.tier === 3);

        /* ② 잠긴 제안 — 열도는 열리고 대륙은 잠긴 자리예요.
         * 대륙 직행은 7년차 문턱이라 4~6년차면 성적이 아무리 좋아도 잠겨 있어요.
         *
         * 모자란 게 연차뿐인 해와 연차·성적 둘 다인 해가 있어요. 화면이 무엇을 적어주는지
         * 보는 게 이 시나리오의 목적이라 **둘 다 모자란 해**가 더 좋아요.
         * 그래서 바로 뜨지 않고 후보를 갱신하다가 KBO 7년이 끝날 때 가장 좋은 것을 씁니다.
         * 확인 문구도 여기서 적어 넣지 않고, 그 세이브가 실제로 무엇이 모자란지 물어서 씁니다. */
        if (!done.has("rookie-posting-locked") && jp.ok && !co.ok && P.$("btn-posting")) {
          const need = [co.okYear ? "" : `${co.gate.year}년차 이상`,
            co.okWar ? "" : `직전 시즌 WAR ${co.gate.war.toFixed(1)} 이상`].filter(Boolean);
          // 모자란 게 하나도 없는데 잠긴 건 '올해 이미 신청함'뿐이에요 — 그건 이 시나리오가 아니에요
          if (need.length && (!lockedCand || need.length > lockedCand.need.length)) {
            lockedCand = {
              need,
              keys: snapshot(P),
              state: `${st.team} · 🇰🇷 KBO · ${st.proYear}년차 오프시즌 · 직전 WAR ${lastWar(P).toFixed(1)}`,
            };
          }
        }

        /* ① 포스팅 제안 — 열도와 대륙이 **둘 다** 열린 자리예요. */
        if (!done.has("rookie-posting") && jp.ok && co.ok && P.$("btn-posting")) {
          done.add("rookie-posting");
          add({
            id: "rookie-posting", game: "rookie", url: "rookie/", emoji: "🌏",
            title: "포스팅 제안 — 열도·대륙이 함께 열린 상태",
            state: `${st.team} · 🇰🇷 KBO · ${st.proYear}년차 오프시즌 · 직전 WAR ${lastWar(P).toFixed(1)}`,
            check: "카드마다 상대 수준(+0.02 / +0.06)과 리그 위세(×1.40 / ×2.30), 안타 확률이 '지금 → 거기'로 다 보이는지, 좁은 화면에서 줄이 안 겹치는지",
            steps: [...ROOKIE_STEP1, "결산 화면에서 <b>🌏 해외 진출</b>"],
            keys: snapshot(P),
          });
        }
        /* 🏛️ 통산 마일스톤 — 몇 시즌 쌓이면 통산 고비를 넘겨요. 결산 화면의
         * '🏛️ 통산 기록' 블록과 넘은 고비 배지를 확인용으로 보여줘요.
         * 손으로 심지 않고 실제로 굴린 커리어의 결산을 그대로 떠요. */
        if (!done.has("rookie-milestone") && (st.career.miles || []).length >= 3 && P.active() === "screen-career") {
          done.add("rookie-milestone");
          add({
            id: "rookie-milestone", game: "rookie", url: "rookie/", emoji: "🏛️",
            title: "통산 마일스톤 — 대기록을 넘긴 결산",
            state: `${st.team} · 🇰🇷 KBO · ${st.proYear}년차 · 통산 마일스톤 ${(st.career.miles || []).length}개`,
            check: "결산 아래 <b>🏛️ 통산 기록</b> 블록이 뜨는지 — 통산 안타·홈런·도루와 다음 고비까지 남은 수, 넘은 고비 배지(🏏1000 등)가 보이는지",
            steps: [...ROOKIE_STEP1, "결산 화면 아래 <b>🏛️ 통산 기록</b> 블록을 확인"],
            keys: snapshot(P),
          });
        }
        if (y < KBO_YEARS) {
          const b = campBtn(P);
          if (!b) throw new Error(`${y}년차 결산에 캠프 버튼이 없어요`);
          b.click();
        }
      }

      // 🌏 실제로 화면을 눌러 대륙 리그로 옮겨요 (세이브를 손으로 고치지 않아요)
      const po = P.$("btn-posting");
      if (!po) throw new Error("7년차 결산에 포스팅 버튼이 없어요");
      po.click();
      const gates = rookieGates(P);
      const iCont = gates.findIndex((g) => g.league.tier === 3);
      const rows = P.w.document.querySelectorAll("#move-card .offer");
      if (!rows[iCont] || rows[iCont].disabled) throw new Error("대륙 리그 칸이 잠겨 있어요");
      rows[iCont].click();
      // 행선지 확인창은 '예'로 답해야 옮겨져요 (여기서는 기본이 '아니오'예요)
      const noConfirm = P.w.confirm;
      P.w.confirm = () => true;
      const clubs = P.w.document.querySelectorAll("#move-card .offer");
      if (!clubs.length) throw new Error("대륙 리그 구단 목록이 안 떠요");
      clubs[0].click();
      P.w.confirm = noConfirm;
      if (lgOf(P).tier !== 3) throw new Error(`대륙 리그로 안 옮겨졌어요 (${lgOf(P).name})`);
      if (P.active() !== "screen-career") throw new Error(`이적 뒤 결산으로 안 돌아왔어요 (${P.active()})`);

      base = snapshot(P);
      baseInfo = `${P.state().team} · ${P.state().proYear}년차`;
      P.close();
      if (lockedCand) {
        done.add("rookie-posting-locked");
        add({
          id: "rookie-posting-locked", game: "rookie", url: "rookie/", emoji: "🔒",
          title: "잠긴 제안 — 대륙은 아직 못 가요",
          state: lockedCand.state,
          check: `🔒 대륙 리그 칸이 눌리지 않고 모자란 것(${lockedCand.need.join(" · ")})이 적혀 있는지, 열린 칸과 잠긴 칸이 한눈에 갈리는지`,
          steps: [...ROOKIE_STEP1, "결산 화면에서 <b>🌏 해외 진출</b>"],
          keys: lockedCand.keys,
        });
      }
      break;
    } catch (e) {
      if (P) P.close();
      log(`  · 시드 ${seed}: ${e.message}`);
    }
  }
  if (!base) { log("  ❌ 대륙 리그까지 못 갔어요 — 야구 시나리오를 하나도 못 만들었어요"); return; }
  log(`  🌏 대륙 리그 이적 완료 — ${baseInfo}. 여기서부터 다시 굴려요`);

  // ── 2단계: 대륙 시즌 ────────────────────────────────────────
  /* 1단계가 남긴 세이브로 페이지를 새로 열어요. 심은 뒤 '이어하기 → 선수 카드'를
   * 실제로 눌러 들어갑니다 — 사용자가 폰에서 하는 경로와 같아요. */
  let retire = null;
  for (const seed of [...seeds(14)].slice(8)) {
    let P;
    try {
      P = makePage("rookie", seed, base);
      if (!resumeSaved(P)) throw new Error("이어하기가 안 돼요");
      if (P.active() !== "screen-career") throw new Error(`결산 화면이 아니에요 (${P.active()})`);

      for (let y = 1; y <= ABROAD_YEARS; y++) {
        const b = campBtn(P);
        if (!b) break;             // 은퇴 권고(나이·기량)로 캠프 버튼이 사라진 자리예요
        b.click();

        /* ④ 대륙시리즈 — 가을야구 최종전이에요. 시즌 **도중**에만 있는 자리라
         * 결산까지 가버리면 S.post가 지워져서 다시 못 만들어요. */
        let seriesKeys = null, seriesInfo = "";
        const watch = (Q, id) => {
          if (seriesKeys || done.has("rookie-cont-series")) return;
          if (id !== "screen-pro") return;
          const st = Q.state();
          if (!st.post || st.post.myRound !== "ks" || st.post.eliminated) return;
          if (!Q.w.document.querySelector("#pro-actions .go-game")) return;
          seriesKeys = snapshot(Q);
          seriesInfo = `${st.team} · 🗽 대륙 리그 · ${st.proYear}년차 · 대륙시리즈 ${st.post.gameNo}차전`;
        };
        if (!rookieSeason(P, watch)) throw new Error(`대륙 ${y}시즌이 결산까지 안 갔어요`);
        const st = P.state();

        if (seriesKeys) {
          done.add("rookie-cont-series");
          add({
            id: "rookie-cont-series", game: "rookie", url: "rookie/", emoji: "🍂",
            title: "대륙시리즈 — 가을야구 최종전",
            state: seriesInfo,
            check: "가을야구 최종전 이름이 '한국시리즈'가 아니라 <b>대륙시리즈</b>로 뜨는지 (위 라벨·시리즈 현황 표 양쪽 다)",
            steps: [...ROOKIE_STEP1, "바로 대륙시리즈 화면이 떠요"],
            keys: seriesKeys,
          });
        }

        /* ③ 대륙 리그 시즌 결산 — 해외에서 뛴 첫 시즌이에요. */
        if (!done.has("rookie-abroad-report")) {
          done.add("rookie-abroad-report");
          add({
            id: "rookie-abroad-report", game: "rookie", url: "rookie/", emoji: "🗽",
            title: "대륙 리그 시즌 결산",
            state: `${st.team} · 🗽 대륙 리그 · ${st.proYear}년차 결산 · WAR ${lastWar(P).toFixed(1)}`,
            check: "소속 줄에 <b>(🗽 대륙)</b> 꼬리표가 붙고, 🔁 이적 이력의 🌏 표시와 최종 순위표가 좁은 화면에서 안 넘치는지",
            steps: [...ROOKIE_STEP1, "바로 결산 화면이 떠요"],
            keys: snapshot(P),
          });
        }

        /* ⑤ 은퇴식 · 명예의 전당 — 대륙에서 받은 상이 몇 배로 남는지 보이는 자리예요.
         * 은퇴식 화면 자체는 세이브에 안 담겨요(누르는 순간 만들어지고 세이브는 지워져요).
         * 그래서 **누르기 직전**을 심고 무엇을 눌러야 하는지 적어 줍니다. */
        const mul = awardMul(st.career);
        if (!done.has("rookie-retire") && mul >= RETIRE_MUL_MIN && (!retire || mul > retire.mul)) {
          const c = st.career;
          retire = {
            mul,
            keys: snapshot(P),
            state: `${st.team} · 🗽 대륙 리그 · ${st.proYear}년차 · 🎖️MVP ${c.mvp} · 🧤GG ${c.gg}${c.roy ? " · 🌟신인왕" : ""} → 리그 가중 ×${mul.toFixed(2)}`,
          };
        }
        if (done.has("rookie-cont-series") && retire && retire.mul >= RETIRE_MUL_WANT) break;
      }
      P.close();
      log(`  · 대륙 시드 ${seed}: 뜬 자리 ${done.size}/4 · 은퇴식 후보 ${retire ? `×${retire.mul.toFixed(2)}` : "없음"}`);
    } catch (e) {
      if (P) P.close();
      log(`  · 대륙 시드 ${seed}: ${e.message}`);
    }
    if (done.has("rookie-cont-series") && done.has("rookie-abroad-report")
      && retire && retire.mul >= RETIRE_MUL_WANT) break;
  }

  if (retire) {
    add({
      id: "rookie-retire", game: "rookie", url: "rookie/", emoji: "🏛️",
      title: "은퇴식 · 명예의 전당 — 리그 가중이 얹힌 점수",
      state: retire.state,
      check: `은퇴 확인창과 은퇴식 화면의 수상 줄 옆에 <b>(🌏 리그 위세로 ×${retire.mul.toFixed(2)})</b>이 붙는지, 커리어 점수·등급이 그 가중을 반영하는지`,
      steps: [
        ...ROOKIE_STEP1,
        "결산 화면에서 <b>🎓 은퇴하기</b> → 확인창의 수상 줄을 보고 <b>확인</b>",
        "은퇴식이 뜨면 <b>🏛️ 명예의 전당 보기</b>",
      ],
      keys: retire.keys,
    });
    done.add("rookie-retire");
  }

  // 🏅 타이틀 레이스 — 시즌 도중 순위표 아래 레이스 패널을 보여줘요.
  // 능력치를 올려 경쟁권에 들게 한 뒤, 다음 시즌을 절반쯤 굴리다 프로 화면에서 멈춰 떠요.
  log("🏅 타이틀 레이스 — 시즌 도중 순위 경쟁");
  for (const seed of seeds(6)) {
    let P;
    try {
      P = makePage("rookie", seed);
      rookieDebut(P, 0, "batter", "확인용");
      const st = P.state();
      for (const key in st.stats) st.stats[key] = 128;   // 타이틀 경쟁권에 들도록 능력치를 올려요
      if (!rookieSeason(P)) { P.close(); continue; }       // 한 시즌 온전히 — 통산 기록을 쌓아요
      const cb = campBtn(P); if (!cb) { P.close(); continue; }
      cb.click();
      // 캠프(S.season 아직 null)를 지나 시즌을 절반쯤(KBO 144경기 중 70경기) 굴리다 멈춰요.
      if (!playPartial(P, 70) || !P.state().season) { P.close(); continue; }
      const s2 = P.state();
      add({
        id: "rookie-titlerace", game: "rookie", url: "rookie/", emoji: "🏅",
        title: "타이틀 레이스 — 시즌 도중 순위 경쟁",
        state: `${s2.team} · 🇰🇷 KBO · ${s2.proYear}년차 · ${s2.season.game}/${s2.season.total}경기`,
        check: "프로 화면에서 📊 순위표를 펼치면 아래 <b>🏅 타이틀 레이스</b>(현재·예상·1등선)가 뜨는지, 앞서는 종목에 🥇가 붙는지",
        steps: [...ROOKIE_STEP1, "프로 화면에서 <b>📊 순위표</b>를 펼치면 아래에 🏅 타이틀 레이스"],
        keys: snapshot(P),
      });
      done.add("rookie-titlerace");
      P.close();
      break;
    } catch (e) { log(`  ⚠️ 타이틀 레이스 ${seed}: ${e.message}`); if (P) P.close(); }
  }

  for (const id of ["rookie-posting", "rookie-posting-locked", "rookie-abroad-report",
    "rookie-cont-series", "rookie-retire", "rookie-titlerace"]) {
    if (!done.has(id)) log(`  ❌ ${id} — 조건에 맞는 상태를 못 만들었어요`);
  }
}

// 시드 목록 — 조건에 맞는 상태가 나올 때까지 순서대로 굴려요.
function* seeds(n) {
  let s = 0x9e3779b9;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    yield s;
  }
}

// ---------- 파일 쓰기 ----------
/* 이번에 뽑지 않은 시나리오는 기존 파일에서 살려요.
 * 그래야 `node scripts/make-fixtures.js soccer-transfer`처럼 하나만 다시 뽑아도
 * 나머지가 안 사라져요. 같은 id는 이번에 뽑은 게 이깁니다. */
const ORDER = ["soccer-transfer", "soccer-promote", "soccer-youth-ext", "soccer-semipro", "soccer-report",
  "idol-concept", "idol-reveal", "idol-report", "idol-tour", "idol-standings",
  "rookie-posting", "rookie-posting-locked", "rookie-abroad-report", "rookie-cont-series", "rookie-retire"];

function readPrev() {
  if (!fs.existsSync(OUT)) return [];
  try {
    const prev = fs.readFileSync(OUT, "utf8");
    const m = prev.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
    return m ? (new Function(`return ${m[1]};`)()).items || [] : [];
  } catch { return []; }
}
const PREV = readPrev();

function writeOut() {
  const mine = new Set(fixtures.map((x) => x.id));
  const items = PREV.filter((x) => !mine.has(x.id)).concat(fixtures);
  items.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const banner = `/* 자동 생성 파일이에요 — 손으로 고치지 마세요.
 * 만드는 법:  node scripts/make-fixtures.js
 * 각 세이브는 jsdom에서 실제 버튼을 눌러 그 상태까지 간 뒤 localStorage를 통째로 뜬 거예요.
 * 산식이 바뀌면 다시 뽑아야 해요. 베타 전용이라 상용(루트)에는 올라가지 않아요. */
`;
  fs.writeFileSync(OUT, `${banner}window.CHECK_FIXTURES = ${JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    items,
  }, null, 2)};\n`);
  return items.length;
}

// ---------- 실행 ----------
/* 인자로 게임 이름(soccer·idol)이나 시나리오 id 하나를 줄 수 있어요.
 * 유스 엔딩 두 개는 확률을 재느라 오래 걸리니, 그것만 다시 뽑을 때 유용해요. */
const want = (id, game) => !only || only === game || only === id;
const t0 = Date.now();
if (want("soccer-transfer", "soccer")) makeSoccerTransfer();
if (want("soccer-promote", "soccer")) makeSoccerPromote();
if (want("soccer-youth-ext", "soccer")) makeSoccerEnding("youth");
if (want("soccer-semipro", "soccer")) makeSoccerEnding("semi");
if (want("soccer-report", "soccer")) makeSoccerReport();
if (want("soccer-chart", "soccer")) makeSoccerChart();
if (want("soccer-cup", "soccer")) makeSoccerCup();
if (want("soccer-judge", "soccer")) makeSoccerJudge();
if (want("soccer-nation-kr", "soccer")) makeSoccerNation(0, {
  country: "kr", emoji: "🇰🇷", title: "K리그 유스 → K리그1 · 회복 +30%",
  trait: "🛌 회복 +30%",
  check: "휴식을 누르면 컨디션이 평소보다 많이 차는지 봐주세요 (+25~40의 1.3배). 훈련을 더 자주 돌릴 수 있어요",
});
if (want("soccer-nation-br", "soccer")) makeSoccerNation(2, {
  country: "br", emoji: "🇧🇷", title: "브라질 유스 → 브라질 세리에A · 드리블 +45%",
  trait: "🏃 드리블 +45%",
  check: "드리블 훈련만 유난히 많이 오르는지, 다른 능력치는 그대로인지 봐주세요",
});
if (want("soccer-nation-it", "soccer")) makeSoccerNation(4, {
  country: "it", emoji: "🇮🇹", title: "이탈리아 유스 → 세리에A · 수비 +45%",
  trait: "🛡️ 수비 +45%",
  check: "수비 훈련만 유난히 많이 오르는지 봐주세요. 같은 나라라 세리에B로 내려가도 특색은 그대로예요",
});
if (want("soccer-nation-en", "soccer")) makeSoccerNation(3, {
  country: "en", emoji: "🇬🇧", title: "잉글랜드 아카데미 → 챔피언십 · 수입 +35%",
  trait: "💰 수입 +35%",
  check: "경기 수당이 다른 나라보다 큰지 봐주세요 (30만·130만의 1.35배). 성장은 기본이고 대신 돈이 도는 리그예요",
});
if (want("soccer-nation-jp", "soccer")) makeSoccerNation(1, {
  country: "jp", emoji: "🇯🇵", title: "J리그 유스 → J1리그 · 훈련 +15%",
  trait: "🎓 훈련 +15%",
  check: "어느 능력치를 훈련해도 조금씩 더 오르는지 봐주세요 (한 가지만 빠른 🇧🇷·🇮🇹와 다른 결이에요)",
});
if (want("soccer-promo", "soccer")) makeSoccerPromoRelegation("up");
if (want("soccer-releg", "soccer")) makeSoccerPromoRelegation("down");
if (want("idol-concept", "idol")) {
  makeIdolConcept("idol-concept", "컴백 컨셉 선택 화면", "🎬",
    "컨셉 카드 4장이 좁은 화면에서 안 겹치고, 소문 2장에 🗣 배지가 붙는지", false, 2);
}
if (want("idol-reveal", "idol")) {
  makeIdolConcept("idol-reveal", "유행 공개 화면 — 적중(🔥 +18%)", "🔥",
    "🔥 트렌드 적중 카드와 +18%가 한눈에 읽히는지", true, 3);
}
if (want("idol-report", "idol") || want("idol-tour", "idol") || want("idol-standings", "idol")) makeIdolRest();
/* ⚾ 야구 다섯 자리는 한 선수의 커리어를 통째로 걸어가며 뜨는 거라 함께 뽑아요.
 * (하나만 다시 뽑고 싶어도 그 앞의 7시즌을 어차피 다시 굴려야 해요) */
if (only === "rookie" || !only) makeRookieAll();

log(`\n📦 ${OUT} — 시나리오 ${writeOut()}개 (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
