/* beta/_check.html — 화면 확인용 페이지.
 *
 * 이 페이지는 세이브를 덮어쓰는 도구예요. 그래서 "버튼이 그려진다"로는 부족해요.
 * 네 가지를 봅니다.
 *   ① 시나리오 버튼이 전부 렌더된다
 *   ② 누르면 그 시나리오의 세이브가 localStorage에 심긴다
 *   ③ 심기 전에 백업이 만들어지고, 되돌리기로 원래 세이브가 되살아난다
 *   ④ 심은 세이브로 게임을 실제로 띄우면 의도한 화면에 닿는다  ← 이게 핵심이에요
 *
 * ④는 함수를 부르지 않아요. jsdom에 beta/soccer/index.html·beta/idol/index.html을
 * 통째로 띄우고, 타이틀의 '이어하기' → 슬롯 카드 → (시나리오마다 정해진 버튼)을
 * **실제로 클릭**해서 도달합니다. 이 저장소는 "함수는 있는데 브라우저에선 못 가는"
 * 기능을 여러 번 겪었어요 — 확인용 도구가 그 함정에 빠지면 확인이 통째로 거짓말이 돼요.
 *
 * URL은 https://x.test/beta/… 로 둡니다. env.js가 /beta/에서 localStorage를
 * 'beta::'로 감싸는데, 확인 페이지와 게임이 같은 접두사를 써야 심은 게 읽혀요.
 * 접두사가 어긋나면 아무 일도 안 일어나는 채로 조용히 실패해요.
 *
 * eval("const x = …")은 쓰지 않아요 — 선언이 eval 자기 스코프에 갇혀요. */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = "/workspace/grow-games";
const BETA = path.join(ROOT, "beta");
const { JSDOM } = require(path.join(ROOT, "tests/cloud/jsdom.js"));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

/* 닫은 jsdom 페이지에 아직 매달려 있던 cloud.js 콜백이 뒤늦게 깨어나면서
 * 사라진 document를 만지면 여기까지 터져 나와요. 게임이 잘못된 게 아니라
 * 페이지를 닫는 순서 문제라, **페이지 안에서 난 예외만** 삼키고 계속 갑니다.
 * (⑤ 은퇴식 검사가 await로 한 박자 쉬면서부터 드러났어요 — 그전에는 검사가
 *  process.exit로 먼저 끝나 그 콜백이 깨어날 틈이 없었을 뿐이에요.)
 * 밖에서 난 예외는 그대로 죽어야 해요. 확인 도구가 조용히 초록을 띄우면 안 돼요. */
const fromClosedPage = (e) => String((e && e.stack) || "").includes("x.test");
for (const ev of ["uncaughtException", "unhandledRejection"]) {
  process.on(ev, (e) => {
    if (fromClosedPage(e)) return;
    console.error(e);
    process.exit(1);
  });
}
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

// ---------- ① _fixtures.js 자체 ----------
console.log("=== ① 시나리오 데이터 ===");
const FIX_PATH = path.join(BETA, "_fixtures.js");
check(fs.existsSync(FIX_PATH), "beta/_fixtures.js가 있다 (없으면 node scripts/make-fixtures.js)");
if (!fs.existsSync(FIX_PATH)) { console.log("\n❌ 실패"); process.exit(1); }

const FIX_SRC = fs.readFileSync(FIX_PATH, "utf8");
/* new Function으로 감싸 읽어요 — eval에 대입식을 넣으면 선언이 밖으로 안 새요. */
const FIXTURES = new Function(`const window = {}; ${FIX_SRC} return window.CHECK_FIXTURES;`)();
check(!!FIXTURES && Array.isArray(FIXTURES.items), "window.CHECK_FIXTURES.items가 배열이다");
check(FIXTURES.items.length >= 13, `시나리오가 13개 이상이다 (${FIXTURES.items.length}개)`);

/* 확인 페이지가 카드를 그리는 게임 목록이에요. 여기 없는 게임의 시나리오는
 * _fixtures.js에 있어도 화면에 한 장도 안 그려져서 조용히 사라져요 —
 * 그래서 목록을 페이지 소스에서 직접 읽어 와 대조합니다. */
const CHECK_SRC = fs.readFileSync(path.join(BETA, "_check.html"), "utf8");
const GAMES = (() => {
  const m = CHECK_SRC.match(/const GAME_ORDER = \[([^\]]*)\]/);
  if (!m) throw new Error("_check.html에서 GAME_ORDER를 못 찾았어요");
  return m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
})();
check(GAMES.includes("rookie"), `확인 페이지가 야구(rookie) 묶음을 그린다 (${GAMES.join(" · ")})`);

for (const it of FIXTURES.items) {
  const keys = Object.keys(it.keys || {});
  check(!!it.check && it.check.length > 4, `${it.id} — 확인할 것 한 줄이 있다`);
  check(Array.isArray(it.steps) && it.steps.length > 0, `${it.id} — 무엇을 눌러야 하는지 적혀 있다`);
  check(keys.length > 0, `${it.id} — 심을 세이브 키가 있다 (${keys.join(", ")})`);
  check(GAMES.includes(it.game), `${it.id} — 게임이 ${GAMES.join("/")} 중 하나다 (${it.game})`);
}

// ---------- 확인 페이지 부트스트랩 ----------
/* <script src>를 인라인해서 로드 순서를 살려요. env.js가 반드시 _fixtures.js보다 먼저예요. */
function makeCheckPage(preSeed) {
  let html = fs.readFileSync(path.join(BETA, "_check.html"), "utf8")
    .replace(/<link[^>]*>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(BETA, src);
      return fs.existsSync(p)
        ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>`
        + (src === "env.js" ? "<!--SEED-->" : "")
        : "";
    });
  // 기존 세이브 심기는 env.js **뒤에** 넣어요 — 앞에 넣으면 접두사가 안 붙어요.
  html = html.replace("<!--SEED-->", preSeed
    ? `<script>(function(){var d=${JSON.stringify(preSeed)};for(var k in d)localStorage.setItem(k,d[k]);})();</script>`
    : "");
  /* 🌐 jsdom에는 fetch가 없어요. _check.html은 머리에 붙일 판 번호를 받으려고
   * ../VERSION을 한 번 불러오는데, 그게 없으면 스크립트가 통째로 멎어서
   * 아래 검사가 전부 무너져요. 화면 검사와는 상관없는 자리라 조용히 막아 둬요
   * (tests/rookie/post-mech-test.js의 PRELUDE가 같은 이유로 같은 모양이에요). */
  const dom = new JSDOM(html.replace("<head>",
    `<head><script>window.fetch = () => Promise.reject(new Error("net off"));</script>`), {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/beta/_check.html",
  });
  return dom;
}

// ---------- ② 버튼 렌더 ----------
console.log("=== ② 화면 ===");
const OLD_SAVE = { "winger-save-v1-slots": JSON.stringify({ sOld: { name: "진행중인선수", proYear: 4 } }) };
const dom = makeCheckPage(OLD_SAVE);
const w = dom.window;
const doc = w.document;
const cards = () => Array.from(doc.querySelectorAll(".ck-card"));

check(!!w.CheckPage, "CheckPage가 페이지에서 노출된다");
check(cards().length === FIXTURES.items.length,
  `시나리오 버튼이 전부 그려진다 (${cards().length}/${FIXTURES.items.length})`);
check(cards().every((c) => c.dataset.id), "버튼마다 시나리오 id가 붙어 있다");
guard("확인할 것", () => {
  const missing = cards().filter((c) => !c.textContent.includes("👀"));
  check(missing.length === 0, `버튼마다 '무엇을 확인해야 하는지' 한 줄이 보인다 (빠진 것 ${missing.length}개)`);
});
guard("경고 문구", () => {
  const t = doc.body.textContent;
  check(t.includes("개발 확인용") && t.includes("덮어씁니다"),
    "⚠️ 개발 확인용 — 세이브를 덮어씁니다 가 화면에 있다");
  check(!!doc.getElementById("ck-restore"), "되돌리기 버튼이 있다");
});
/* 폰에서 보는 페이지예요 — 버튼이 가로 2열로 붙으면 글자가 뭉개져요.
 * 카드 목록은 세로(flex column)여야 해요. */
guard("세로 배치", () => {
  const src = fs.readFileSync(path.join(BETA, "_check.html"), "utf8");
  check(/\.ck-list\s*\{[^}]*flex-direction:\s*column/.test(src), ".ck-list가 세로로 쌓인다");
});

// ---------- ③ 심기 · 백업 · 되돌리기 ----------
console.log("=== ③ 심기 · 백업 · 되돌리기 ===");
const lsDump = () => {
  const ls = w.localStorage, out = {};
  for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k) out[k] = ls.getItem(k); }
  return out;
};
check(lsDump()["winger-save-v1-slots"] === OLD_SAVE["winger-save-v1-slots"],
  "심기 전에는 원래 세이브가 그대로 있다");
check(!w.localStorage.getItem(w.CheckPage.BACKUP_KEY), "아직 백업은 없다");

const target = FIXTURES.items[0];
let navTo = null;
w.CheckPage.nav = (u) => { navTo = u; };
guard("시나리오 심기", () => {
  const card = cards().find((c) => c.dataset.id === target.id);
  if (!card) throw new Error(`${target.id} 버튼이 없어요`);
  card.click();
  check(navTo === target.url, `누르면 ${target.url} 로 이동한다 (${navTo})`);
  const after = lsDump();
  const bad = Object.keys(target.keys).filter((k) => after[k] !== target.keys[k]);
  check(bad.length === 0, `그 시나리오의 세이브가 그대로 심긴다 (어긋난 키 ${bad.length}개)`);
  check(after["winger-save-v1-slots"] !== OLD_SAVE["winger-save-v1-slots"],
    "원래 세이브는 확인용으로 바뀐다");
  const b = w.CheckPage.backupInfo();
  check(!!b, "심기 전에 백업이 만들어진다");
  check(!!b && b.data["winger-save-v1-slots"] === OLD_SAVE["winger-save-v1-slots"],
    "백업에 원래 세이브가 통째로 들어 있다");
});

/* 두 번째 시나리오를 눌러도 백업은 다시 뜨지 않아요.
 * 다시 뜨면 방금 심은 확인용 세이브가 백업을 덮어써서 진짜 캐릭터가 사라져요. */
guard("백업 덮어쓰기 방지", () => {
  const before = JSON.stringify(w.CheckPage.backupInfo().data);
  const second = FIXTURES.items[1] || FIXTURES.items[0];
  const card = cards().find((c) => c.dataset.id === second.id);
  if (card) card.click();
  check(JSON.stringify(w.CheckPage.backupInfo().data) === before,
    "두 번째로 심어도 백업은 처음 것 그대로다");
});

guard("되돌리기", () => {
  check(w.CheckPage.restore() === true, "되돌리기가 동작한다");
  const after = lsDump();
  check(after["winger-save-v1-slots"] === OLD_SAVE["winger-save-v1-slots"],
    "원래 세이브가 되살아난다");
  check(!w.localStorage.getItem(w.CheckPage.BACKUP_KEY),
    "되돌린 뒤에는 백업이 지워진다 (다음에 새로 뜰 수 있게)");
  check(doc.getElementById("ck-restore").disabled === true,
    "백업이 없으면 되돌리기 버튼이 잠긴다");
});

/* env.js를 안 불러오면 확인 페이지는 접두사 없는 키를 쓰고, 베타 게임은
 * 'beta::' 키를 읽어요 — 아무 일도 안 일어나는 채로 조용히 실패해요. */
guard("beta:: 접두사", () => {
  const src = fs.readFileSync(path.join(BETA, "_check.html"), "utf8");
  check(/<script src="env\.js"><\/script>/.test(src), "_check.html이 env.js를 함께 불러온다");
  check(/src="env\.js"[\s\S]*src="_fixtures\.js"/.test(src), "env.js가 _fixtures.js보다 먼저다");
});

// ---------- ④ 심은 세이브로 게임을 실제로 띄운다 ----------
console.log("=== ④ 심은 세이브로 게임에 들어간다 ===");
const gamePrelude = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
  /* 페이지를 닫을 때 정리하려고 타이머를 모아 둬요. 안 그러면 setInterval이 남아서
   * 닫힌 페이지를 뒤늦게 다시 만집니다. */
  window.__timers = [];
  (function () {
    var st = window.setTimeout, si = window.setInterval;
    window.setTimeout = function () { var id = st.apply(window, arguments); window.__timers.push(id); return id; };
    window.setInterval = function () { var id = si.apply(window, arguments); window.__timers.push(id); return id; };
  })();
`;
function openGame(game, keys) {
  const dir = path.join(BETA, game);
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8")
    .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(dir, src.split("?")[0]);
      if (!fs.existsSync(p)) return "";
      return `<script>\n${fs.readFileSync(p, "utf8")}\n</script>`
        + (src.endsWith("env.js") ? "<!--SEED-->" : "");
    });
  html = html.replace("</head>", `<script>${gamePrelude}</script></head>`);
  // 세이브 심기는 env.js 뒤 · game.js 앞이어야 해요 (game.js가 로드 때 슬롯을 읽어요)
  html = html.replace("<!--SEED-->",
    `<script>(function(){var d=${JSON.stringify(keys).replace(/<\/script/gi, "<\\/script")};` +
    `for(var k in d)localStorage.setItem(k,d[k]);localStorage.setItem("grow-auto-mini","1");})();</script>`);
  const d = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true, url: `https://x.test/beta/${game}/`,
  });
  const ww = d.window;
  ww.Ads = { display() {}, init() {} };
  ww.Stats = { log() {} };
  return {
    dom: d, w: ww,
    $: (id) => ww.document.getElementById(id),
    active: () => (ww.document.querySelector(".screen.active") || {}).id,
    close: () => {
      try {
        for (const id of (ww.__timers || [])) { ww.clearTimeout(id); ww.clearInterval(id); }
        ww.__timers = [];
      } catch { /* 이미 닫혔으면 넘어가요 */ }
      try { d.window.close(); } catch { /* 같은 이유 */ }
    },
  };
}

// 타이틀의 '이어하기' → 슬롯 카드. 사용자가 폰에서 하는 동작 그대로예요.
function resume(P) {
  const cont = P.$("btn-continue");
  if (!cont || cont.classList.contains("hidden")) throw new Error("'이어하기' 버튼이 안 보여요 (세이브가 안 심겼어요)");
  cont.click();
  const go = P.w.document.querySelector(".slot-modal .slot-go");
  if (!go) throw new Error("슬롯 목록에 선수 카드가 없어요");
  go.click();
  return P.active();
}

const byId = (id) => FIXTURES.items.find((x) => x.id === id);

/* 세이브만으로 곧장 닿는 화면들 — 여기서 도달을 실제로 확인해요.
 * 유스 엔딩(soccer-youth-ext · soccer-semipro)은 판정 결과라 세이브만으로는 못 닿아요.
 * 그건 '직전 상태'까지만 심고 확률을 화면에 적어 두는 시나리오라, 여기서는
 * 도전 버튼이 실제로 뜨는 것까지만 봅니다. */
/* 뽑히지 않은 시나리오는 건너뛰어요 — 다만 이번 작업의 핵심인 이적 화면만은
 * 없으면 실패로 봅니다. 못 만든 걸 조용히 넘기면 확인 페이지가 반쯤 빈 채로 나가요. */
const REQUIRED = new Set(["soccer-transfer", "rookie-posting", "rookie-posting-locked",
  "rookie-abroad-report", "rookie-cont-series", "rookie-retire"]);
function reach(id, fn) {
  const it = byId(id);
  if (!it) {
    if (REQUIRED.has(id)) check(false, `${id} 시나리오가 _fixtures.js에 없다 (핵심 시나리오예요)`);
    else console.log(`⏭️  ${id} — _fixtures.js에 없어서 건너뛰어요`);
    return;
  }
  let P = null;
  try {
    P = openGame(it.game, it.keys);
    const first = resume(P);
    fn(P, first, it);
  } catch (e) {
    check(false, `${id} — ${e.message}`);
  } finally {
    if (P) P.close();
  }
}

// ⚽ 이적 화면 — 이 시나리오가 이번 작업의 핵심이에요
reach("soccer-transfer", (P, first) => {
  check(first === "screen-career", `심은 세이브로 들어가면 결산 화면이 뜬다 (${first})`);
  const tf = P.$("btn-transfer");
  check(!!tf, "결산 화면에 '💼 이적 제안 보기' 버튼이 있다");
  if (!tf) return;
  tf.click();
  check(P.active() === "screen-transfer", `그 버튼을 누르면 이적 화면이 뜬다 (${P.active()})`);
  const tfCards = P.w.document.querySelectorAll("#transfer-list .tf-card");
  check(tfCards.length > 0, `이적 카드가 그려진다 (${tfCards.length}장)`);
  const ups = P.w.document.querySelectorAll("#transfer-list .tf-group.up");
  check(ups.length > 0, `상위 리그(▲) 묶음이 있다 (${ups.length}개)`);
  const lgs = new Set(Array.from(tfCards).map((c) => c.dataset.league));
  check(lgs.size >= 2, `리그가 둘 이상 나온다 (${lgs.size}개)`);
});

// ⚽ 하부 리그 이적 — K리그3에서 승격 제안
reach("soccer-promote", (P, first) => {
  check(first === "screen-career", `결산 화면이 뜬다 (${first})`);
  const tf = P.$("btn-transfer");
  check(!!tf, "'💼 이적 제안 보기' 버튼이 있다");
  if (!tf) return;
  tf.click();
  check(P.active() === "screen-transfer", `이적 화면이 뜬다 (${P.active()})`);
  const ups = P.w.document.querySelectorAll("#transfer-list .tf-group.up");
  check(ups.length > 0, `승격(▲ 위 리그) 묶음이 있다 (${ups.length}개)`);
  const downs = P.w.document.querySelectorAll("#transfer-list .tf-group.down");
  check(downs.length === 0, `사다리 맨 아래라 아래 리그 묶음은 없다 (${downs.length}개)`);
});

/* ⚽ 연말 결산 — 소속 칼럼
 * 예전에는 이적 이력을 텍스트로 나열해서 네 번 이적하면 세 줄로 접혔어요.
 * 시즌 표의 소속 칸으로 옮겼습니다. 그래서 여기서는 옛 줄이 없어야 하고
 * 표에 소속 칼럼이 있어야 해요.
 *
 * 이 시나리오의 세이브는 소속 칼럼이 생기기 전에 뜬 옛 형식이라 years[]에 club이
 * 없어요. 그래서 한동안 여섯 줄이 전부 '-'였습니다 — 칼럼을 넣은 의미가 없었죠.
 * 이제 그릴 때 S.moves에서 역산해 메웁니다(세이브는 안 고쳐요). 여기서는 그 역산이
 * **실제로 채웠는지**를 이 세이브의 이적 이력과 맞춰 못 박아요. "비어 있지 않다"로
 * 느슨하게 두면 '-'가 다시 돌아와도 통과해요.
 *
 * 이적 이력: 2시즌 블랙이글스→머드독스 · 3시즌 머드독스→파인힐스 ·
 * 4시즌 파인힐스→머드독스 · 5시즌 머드독스→스톤워커스. 이적은 시즌이 끝난
 * 오프시즌에 일어나니 시즌 y의 소속은 y보다 앞선 마지막 이적의 도착 클럽이에요.
 * (칸이 좁아 이름을 4자로 줄이니 title 속성의 전체 이름으로 대조해요.) */
reach("soccer-report", (P, first) => {
  check(first === "screen-career", `결산 화면이 뜬다 (${first})`);
  const card = P.w.document.querySelector("#career-card");
  check(!card.querySelector(".move-log") && !/이적 이력/.test(card.textContent),
    "옛 '🔁 이적 이력' 텍스트 줄이 없다");
  const heads = [...card.querySelectorAll("table thead th")].map((th) => th.textContent.trim());
  check(heads.includes("소속"), `시즌 표에 소속 칼럼이 있다 (${heads.join("·")})`);
  const rows = [...card.querySelectorAll("table tbody tr")];
  check(rows.length === 6, `여섯 시즌 행이 그려진다 (${rows.length}행)`);
  const col = heads.indexOf("소속");
  const cells = rows.map((r) => r.children[col] || {});
  const names = cells.map((c) => (c.getAttribute ? c.getAttribute("title") : null));
  check(cells.every((c) => (c.textContent || "").trim() !== "-"),
    `소속 칸에 '-'가 한 줄도 없다 — 역산이 실제로 채웠다 (${names.join("·")})`);
  const WANT = ["블랙이글스", "블랙이글스", "머드독스", "파인힐스", "머드독스", "스톤워커스"];
  check(names.join("·") === WANT.join("·"),
    `여섯 시즌 소속이 이적 이력과 정확히 맞는다 (${names.join("·")})`);
  // 이적한 시즌(3·4·5·6)만 강조돼야 해요 — 역산 행에서도 이 표시가 살아야 합니다.
  const moved = cells.map((c) => c.classList.contains("moved"));
  check(moved.join(",") === "false,false,true,true,true,true",
    `이적한 시즌만 강조된다 (${moved.map((m, i) => `${i + 1}:${m}`).join(" ")})`);
  // 3시즌은 K리그1 → K리그3 이동이라 리그 태그가 붙어요. 나머지는 같은 리그예요.
  const tags = cells.map((c) => { const t = c.querySelector(".yr-lg"); return t ? t.textContent.trim() : ""; });
  check(tags.join("·") === "··3부···", `리그를 옮긴 3시즌에만 리그 태그가 붙는다 (${tags.join("·")})`);
});

// ⚽ 유스 엔딩 두 종 — 도전 버튼까지만 확인해요 (엔딩은 판정 결과라 세이브에 안 남아요)
for (const id of ["soccer-youth-ext", "soccer-semipro"]) {
  reach(id, (P, first, it) => {
    check(first === "screen-main", `심은 세이브로 들어가면 육성 화면이 뜬다 (${first})`);
    const go = P.w.document.querySelector("#action-list .go-game");
    check(!!go, "'🔥 프로 도전 시작!' 버튼이 바로 보인다");
    check(!!go && go.textContent.includes("프로 도전"), `버튼 문구가 프로 도전이다 (${go ? go.textContent : "없음"})`);
    check(!!it.odds && it.odds.pct > 0,
      `엔딩이 나올 확률이 적혀 있다 (${it.odds ? it.odds.pct + "%" : "없음"})`);
  });
}

// 🎤 컨셉 선택 · 유행 공개
reach("idol-concept", (P, first) => {
  check(first === "screen-pro", `심은 세이브로 들어가면 준비 화면이 뜬다 (${first})`);
  const go = P.w.document.querySelector("#pro-actions .go-game");
  check(!!go, "'💿 컴백 시작' 버튼이 바로 보인다");
  if (!go) return;
  go.click();
  check(P.active() === "screen-concept", `누르면 컨셉 선택 화면이 뜬다 (${P.active()})`);
  const cs = P.w.document.querySelectorAll("#concept-list .concept-card");
  check(cs.length === 4, `컨셉 카드가 4장이다 (${cs.length})`);
  const rumor = P.w.document.querySelectorAll("#concept-list .concept-rumor");
  check(rumor.length === 2, `소문 2종에 배지가 붙어 있다 (${rumor.length})`);
});

reach("idol-reveal", (P, first, it) => {
  check(first === "screen-pro", `준비 화면이 뜬다 (${first})`);
  const go = P.w.document.querySelector("#pro-actions .go-game");
  check(!!go, "'💿 컴백 시작' 버튼이 있다");
  if (!go) return;
  go.click();
  check(P.active() === "screen-concept", `컨셉 선택 화면이 뜬다 (${P.active()})`);
  /* 안내 문구가 가리키는 컨셉을 실제로 눌러서 🔥 적중이 뜨는지 봐요.
   * 문구만 맞고 화면이 안 뜨면 사용자는 몇 번을 눌러도 못 보게 돼요. */
  const hot = P.w.__hot || (P.w.IdolCareer._t.state().activity || {}).hot;
  const card = P.w.document.querySelector(`#concept-list .concept-card[data-cid="${hot}"]`);
  check(!!card, `유행 컨셉(${hot}) 카드가 있다`);
  if (!card) return;
  const step = (it.steps || []).join(" ");
  const hotName = (P.w.IdolCareer._t.CONCEPTS.find((c) => c.id === hot) || {}).name;
  check(!!hotName && step.includes(hotName), `안내 문구가 눌러야 할 컨셉(${hotName})을 알려준다`);
  card.click();
  check(P.active() === "screen-reveal", `고르면 유행 공개 화면이 뜬다 (${P.active()})`);
  const eff = P.$("reveal-effect");
  check(!!eff && eff.className === "reveal-hit", `🔥 트렌드 적중 화면이다 (${eff ? eff.className : "없음"})`);
  check(!!eff && eff.textContent.includes("+18%"), `+18%가 적혀 있다 (${eff ? eff.textContent.trim() : ""})`);
});

// 🎤 연말 결산 · 월드투어 · 그룹 순위표
reach("idol-report", (P, first) => {
  check(first === "screen-career", `결산 화면이 뜬다 (${first})`);
  const th = P.w.document.querySelectorAll("#career-card .season-table thead th");
  check(th.length === 5, `표가 5칸이다 (${th.length}칸)`);
  check(Array.from(th).some((x) => x.textContent.includes("컨셉")), "컨셉 칸이 있다");
  const row = P.w.document.querySelector("#career-card .sn-concept");
  check(!!row && row.textContent.trim() !== "-", `컨셉 칸이 실제로 채워져 있다 (${row ? row.textContent.trim() : "없음"})`);
});

reach("idol-tour", (P, first) => {
  check(first === "screen-career", `결산 화면이 뜬다 (${first})`);
  const tb = Array.from(P.w.document.querySelectorAll("#career-actions .btn"))
    .find((b) => /월드투어/.test(b.textContent));
  check(!!tb, "'🌏 월드투어 떠나기' 버튼이 있다");
  if (!tb) return;
  // 🐛 옆의 "💿 N년차 컴백 준비"(12자)와 나란히 서서 폭이 절반이에요
  check(tb.textContent.length <= 14, `버튼 문구가 짧아 안 잘린다 (${tb.textContent.length}자)`);
  tb.click();
  check(P.active() === "screen-tour", `누르면 월드투어 화면이 뜬다 (${P.active()})`);
  check(!!P.$("tour-log"), "투어 진행 칸이 있다");
  // 🔥 강행군 — 남은 컨디션이 화면에 있어야 강행할지 쉴지 고를 수 있어요
  check(/컨디션/.test(P.$("tour-meta").textContent), `남은 컨디션이 보인다 (${P.$("tour-meta").textContent})`);
  check(/\d+\/\d+번째 도시/.test(P.$("tour-city").textContent), `도시 수가 보인다 (${P.$("tour-city").textContent})`);
});

reach("idol-standings", (P, first) => {
  check(first === "screen-pro", `준비 화면이 뜬다 (${first})`);
  const box = P.$("pro-standings");
  check(!!box && !box.hidden, "그룹 순위표가 보인다 (활동 중 상태)");
  const rows = P.w.document.querySelectorAll("#pro-standings-body tr");
  check(rows.length >= 5, `순위표에 그룹이 여러 줄 있다 (${rows.length}줄)`);
});

/* ---------- ⚾ 야구 (더 드래프트) — 해외 진출 ----------
 * 야구는 세이브 한 장이 곧 화면이에요. 오프시즌 세이브는 결산 화면으로,
 * 가을야구 도중의 세이브는 그 시리즈 화면으로 이어집니다(Career.showPro가 갈라요).
 * 그래서 여기서는 '심고 → 이어하기 → 정말 그 화면인가'를 끝까지 눌러 봅니다. */

// 리그 상수는 game.js에서 읽어 와요 — 화면에 뜰 숫자를 여기 옮겨 적으면 원본이 바뀌어도 초록이 떠요.
const ROOKIE_GAME_SRC = fs.readFileSync(path.join(BETA, "rookie/game.js"), "utf8");
const LEAGUES = (() => {
  const m = ROOKIE_GAME_SRC.match(/const LEAGUES = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error("game.js에서 LEAGUES를 못 찾았어요");
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m[1]};`)();
})();
const LG = (tier) => LEAGUES.find((l) => l.tier === tier);
// 포스팅 화면을 여는 버튼. 해외로 나갈 때든 돌아올 때든 id는 같아요.
const postingBtn = (P) => P.$("btn-posting");

reach("rookie-posting", (P, first) => {
  check(first === "screen-career", `심은 세이브로 들어가면 결산 화면이 뜬다 (${first})`);
  const btn = postingBtn(P);
  check(!!btn, "결산 화면에 '🌏 해외 진출 (포스팅)' 버튼이 있다");
  if (!btn) return;
  check(btn.textContent.includes("해외 진출"), `버튼 문구가 해외 진출이다 (${btn.textContent})`);
  btn.click();
  check(P.active() === "screen-move", `누르면 포스팅 화면이 뜬다 (${P.active()})`);
  const rows = P.w.document.querySelectorAll("#move-card .offer");
  check(rows.length === LEAGUES.length - 1, `갈 수 있는 리그 칸이 ${LEAGUES.length - 1}개다 (${rows.length}개)`);
  const locked = Array.from(rows).filter((r) => r.classList.contains("locked"));
  check(locked.length === 0, `열도·대륙이 **둘 다** 열려 있다 (잠긴 칸 ${locked.length}개)`);
  const html = P.$("move-card").innerHTML;
  // 상대 수준·리그 위세가 숫자로 보여야 해요 — 도박의 크기를 감추면 고를 수가 없어요
  for (const tier of [2, 3]) {
    const l = LG(tier);
    check(html.includes(`+${l.oppUp.toFixed(2)}`), `${l.name}의 상대 수준 +${l.oppUp.toFixed(2)}가 숫자로 보인다`);
    check(html.includes(`×${l.prestige.toFixed(2)}`), `${l.name}의 리그 위세 ×${l.prestige.toFixed(2)}가 숫자로 보인다`);
  }
  const nums = html.match(/(\d+\.\d)% → (\d+\.\d)%/g) || [];
  check(nums.length === LEAGUES.length - 1, `리그마다 안타 확률이 '지금 → 거기'로 보인다 (${nums.join(" · ") || "없음"})`);
  check(nums.every((s) => { const m = s.match(/([\d.]+)% → ([\d.]+)%/); return +m[2] < +m[1]; }),
    `위 리그로 갈수록 안타 확률이 내려간다고 적혀 있다 (${nums.join(" · ")})`);
});

reach("rookie-posting-locked", (P, first) => {
  check(first === "screen-career", `결산 화면이 뜬다 (${first})`);
  const btn = postingBtn(P);
  check(!!btn, "'🌏 해외 진출 (포스팅)' 버튼이 있다");
  if (!btn) return;
  btn.click();
  check(P.active() === "screen-move", `포스팅 화면이 뜬다 (${P.active()})`);
  const rows = Array.from(P.w.document.querySelectorAll("#move-card .offer"));
  const locked = rows.filter((r) => r.classList.contains("locked"));
  const open = rows.filter((r) => !r.classList.contains("locked"));
  check(open.length === 1 && open[0].textContent.includes(LG(2).name),
    `${LG(2).name}은 열려 있다 (${open.map((r) => r.textContent.trim().split("\n")[0]).join(" · ") || "없음"})`);
  check(locked.length === 1 && locked[0].textContent.includes(LG(3).name),
    `${LG(3).name}만 잠겨 있다 (잠긴 칸 ${locked.length}개)`);
  if (!locked.length) return;
  check(locked[0].disabled === true, "잠긴 칸은 눌리지 않는다");
  /* 무엇이 모자란지 적어줘야 도전할 목표가 생겨요.
   * 기대 문구를 여기 옮겨 적지 않아요 — 이 세이브가 실제로 무엇이 모자란지를
   * 게임에게 물어보고(postingGates), 그게 화면에 그대로 적혔는지만 봅니다.
   * 문턱 값을 여기 박아두면 자격 표가 바뀌는 순간 이 검사가 거짓말을 해요. */
  const co = P.w.Career._t.postingGates().find((g) => g.league.tier === 3);
  const want = [
    co.okYear ? "" : `${co.gate.year}년차 이상`,
    co.okWar ? "" : `직전 시즌 WAR ${co.gate.war.toFixed(1)} 이상`,
  ].filter(Boolean);
  const need = locked[0].querySelector(".lg-need");
  const txt = need ? need.textContent : "";
  check(want.length > 0 && !!need && want.every((s) => txt.includes(s)),
    `잠긴 칸이 모자란 것을 빠짐없이 적어준다 (모자란 것 ${want.join(" · ")} / 화면 "${txt.trim()}")`);
  // 이미 채운 조건까지 모자란 것처럼 적으면 안 돼요 (도전할 목표가 흐려져요)
  if (co.okYear) check(!/년차 이상/.test(txt), `연차는 채웠으니 연차 문턱은 안 적힌다 ("${txt.trim()}")`);
  if (co.okWar) check(!/WAR/.test(txt), `성적은 채웠으니 WAR 문턱은 안 적힌다 ("${txt.trim()}")`);
});

reach("rookie-abroad-report", (P, first) => {
  check(first === "screen-career", `심은 세이브로 들어가면 결산 화면이 뜬다 (${first})`);
  const card = P.$("career-card");
  const txt = card.textContent;
  /* 소속 줄 하나만 떼어서 봐요 — 카드 전체 텍스트로 보면 다른 줄(이적 이력·안내)에
   * 깃발이 있어도 통과해서, 정작 헤더가 비어 있어도 안 들켜요. */
  const teamLine = (card.querySelector(".draft-team") || {}).textContent || "";
  check(teamLine.includes(LG(3).flag) && teamLine.includes(LG(3).short),
    `소속 줄에 (${LG(3).flag} ${LG(3).short}) 꼬리표가 붙는다 (${teamLine || "없음"})`);
  /* 🐛 헤더는 **그 시즌에 뛴 팀**이어야 해요. 이 세이브는 시즌 기록에 league가 없는
   * 옛 형식이라, 이적 이력에서 역산해 채워지는지까지 여기서 확인돼요. */
  const st = P.w.Career._t.state();
  const last = st.career.seasons[st.career.seasons.length - 1];
  const at = P.w.Career._t.playedAt(last, st);
  check(teamLine.startsWith(at.team) && at.team === st.team,
    `소속 줄이 그 시즌(${last.y}년차)에 뛴 팀이다 (${at.team})`);
  check(P.w.Career._t.leagueOf({ league: at.league }).tier === 3,
    `역산한 그 시즌의 리그가 ${LG(3).name}다 (league ${at.league})`);
  check(/🔁 이적 이력/.test(txt) && txt.includes("🌏"),
    "🔁 이적 이력에 🌏 리그 이적이 남아 있다");
  const rows = card.querySelectorAll("table tbody tr");
  check(rows.length > 0, `시즌 표가 그려진다 (${rows.length}행)`);
  // 해외에서도 결산의 다음 걸음(캠프·은퇴)이 그대로 있어야 해요
  const acts = Array.from(P.w.document.querySelectorAll("#career-actions .btn")).map((b) => b.textContent);
  check(acts.some((t) => /캠프 시작/.test(t)), `다음 시즌 버튼이 있다 (${acts.join(" / ")})`);
});

reach("rookie-cont-series", (P, first) => {
  check(first === "screen-pro", `심은 세이브로 들어가면 가을야구 화면이 뜬다 (${first})`);
  const KS = LG(3) && P.w.Career._t.KS_LABEL[LG(3).id];
  const KBO_KS = P.w.Career._t.KS_LABEL[LG(1).id];
  check(!!KS && KS !== KBO_KS, `${LG(3).name}의 최종전 이름이 따로 있다 (${KS})`);
  const turn = P.$("pro-turn").textContent;
  check(turn.includes(KS), `화면 위 라벨이 ${KS}다 (${turn})`);
  /* 🌏 어느 리그에서 뛰는지가 HUD에 배지로 붙어야 해요 — 실제 DOM에 요소로 서는지까지 봐요
   * (문자열만 맞고 요소가 안 서면 폰에서는 아무 표시도 안 나요). */
  const badge = P.w.document.querySelector("#pro-team .lg-badge");
  check(!!badge && badge.textContent.includes(LG(3).name),
    `HUD에 ${LG(3).name} 배지가 붙는다 (${badge ? badge.textContent.trim() : "없음"})`);
  const sum = P.$("pro-standings-sum").textContent;
  check(sum.includes(KS), `시리즈 현황 제목도 ${KS}다 (${sum})`);
  const body = P.$("pro-standings-body").textContent;
  check(!body.includes(KBO_KS), `대진표 어디에도 ${KBO_KS}가 안 남아 있다`);
  const go = P.w.document.querySelector("#pro-actions .go-game");
  check(!!go, "'⚾ 경기 시작' 버튼이 바로 보인다");
  check(P.$("pro-camp-title").textContent.includes(KS),
    `경기 안내 줄도 ${KS}다 (${P.$("pro-camp-title").textContent})`);
});

/* ---------- ⑤ 은퇴식 · 명예의 전당 (비동기) ----------
 * 은퇴식은 세이브에 담기지 않아요 — 누르는 순간 만들어지고, 그 순간 세이브가 지워져요.
 * 그래서 '누르기 직전'을 심고 여기서 실제로 눌러 봅니다.
 * 명예의 전당은 showHof가 async라(원격 기록을 먼저 기다려요) 이 블록만 await를 써요. */
async function finish() {
  const it = byId("rookie-retire");
  if (!it) {
    check(false, "rookie-retire 시나리오가 _fixtures.js에 없다 (핵심 시나리오예요)");
  } else {
    let P = null;
    try {
      P = openGame(it.game, it.keys);
      const first = resume(P);
      check(first === "screen-career", `심은 세이브로 들어가면 결산 화면이 뜬다 (${first})`);
      const ret = Array.from(P.w.document.querySelectorAll("#career-actions .btn"))
        .find((b) => /은퇴하기/.test(b.textContent));
      check(!!ret, "결산 화면에 '🎓 은퇴하기' 버튼이 있다");
      if (ret) {
        let asked = "";
        P.w.confirm = (msg) => { asked = String(msg); return true; };
        ret.click();
        // 확인창에서부터 가중이 보여야 해요 — 되돌릴 수 없는 선택이니까요
        check(/🌏 리그 위세로 ×\d+\.\d\d/.test(asked),
          `은퇴 확인창의 수상 줄에 리그 가중이 적혀 있다 (${(asked.match(/.*위세로 ×[\d.]+\)/) || ["없음"])[0].trim()})`);
        check(P.$("career-title").textContent.includes("은퇴식"),
          `확인하면 은퇴식 화면이 뜬다 (${P.$("career-title").textContent})`);
        const card = P.$("career-card").textContent;
        const mul = (card.match(/리그 위세로 ×([\d.]+)/) || [])[1];
        check(!!mul, `은퇴식 화면에도 (🌏 리그 위세로 ×N.NN)이 붙는다 (${mul || "없음"})`);
        check(!!mul && +mul > 1, `가중 배수가 1보다 크다 — 대륙에서 받은 상이 크게 남았다 (×${mul})`);
        const score = +((card.match(/커리어 점수 (\d+)/) || [])[1] || 0);
        check(score > 0, `커리어 점수가 화면에 있다 (${score})`);
        /* 가중이 점수에 **실제로** 얹혔는지 봐요. 문구만 맞고 점수가 그대로면
         * 화면이 거짓말을 하는 거예요. 가중분(mvpW…)을 뺀 점수보다 커야 해요. */
        const hof = JSON.parse(P.w.localStorage.getItem("grow-hof-v1") || "[]");
        const e = hof[hof.length - 1];
        check(!!e && e.league === LG(3).id, `명예의 전당 기록에 리그가 남는다 (${e ? e.league : "없음"})`);
        const bonus = e ? (e.mvpW - e.mvp) * 40 + (e.ggW - e.gg) * 15 + (e.royW - e.roy) * 20 : 0;
        check(bonus > 0 && e.score > 0,
          `점수에 리그 가중분이 실제로 얹혀 있다 (가중 없으면 ${Math.round(e.score - bonus)} → 지금 ${e.score})`);

        const hofBtn = Array.from(P.w.document.querySelectorAll("#career-actions .btn"))
          .find((b) => /명예의 전당/.test(b.textContent));
        check(!!hofBtn, "은퇴식에 '🏛️ 명예의 전당 보기' 버튼이 있다");
        if (hofBtn) {
          hofBtn.click();
          await new Promise((r) => setTimeout(r, 50));   // showHof가 async예요
          check(P.active() === "screen-hof", `누르면 명예의 전당이 뜬다 (${P.active()})`);
          const cards2 = P.w.document.querySelectorAll("#hof-list .hof-card");
          check(cards2.length > 0, `방금 은퇴한 선수가 목록에 있다 (${cards2.length}명)`);
          check(Array.from(cards2).some((c) => c.textContent.includes(String(e.score))),
            `그 점수(${e.score})가 목록에 그대로 보인다`);
        }
      }
    } catch (err) {
      check(false, `rookie-retire — ${err.message}`);
    } finally {
      if (P) P.close();
    }
  }

  console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 전부 통과");
  process.exit(fail ? 1 : 0);
}
finish();
