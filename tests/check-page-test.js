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
check(FIXTURES.items.length >= 8, `시나리오가 8개 이상이다 (${FIXTURES.items.length}개)`);

for (const it of FIXTURES.items) {
  const keys = Object.keys(it.keys || {});
  check(!!it.check && it.check.length > 4, `${it.id} — 확인할 것 한 줄이 있다`);
  check(Array.isArray(it.steps) && it.steps.length > 0, `${it.id} — 무엇을 눌러야 하는지 적혀 있다`);
  check(keys.length > 0, `${it.id} — 심을 세이브 키가 있다 (${keys.join(", ")})`);
  check(["soccer", "idol"].includes(it.game), `${it.id} — 게임이 soccer/idol 중 하나다 (${it.game})`);
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
  const dom = new JSDOM(html, {
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
    close: () => d.window.close(),
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
const REQUIRED = new Set(["soccer-transfer"]);
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

console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
