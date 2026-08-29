/* ⚽ 더 윙어 II — 경계면 교차 검사 (엔진 ↔ 드라이버 ↔ 화면 ↔ 캐시)
 *
 * 각각은 "올바르게" 구현돼 있는데 **연결 지점에서 계약이 어긋나는** 결함을 봅니다.
 * 한쪽만 열어 보면 절대 안 보이는 종류예요.
 *
 *   A. sw.js의 ASSETS  ↔  beta/winger2/의 실제 파일 · index.html의 <script src>
 *   B. career.js가 부르는 W2Scene API  ↔  match-scene.js가 내보내는 함수
 *   C. engine.js가 내는 stakeKey 8종  ↔  match-scene.js가 문구를 붙이는 표
 *   D. **게임 입구를 통해** 실제 버튼을 눌러 리그 경기를 완주 —
 *      화면에 결과가 남고 다음으로 갈 수 있는가
 *   E. 카드 빈도가 계단이 아닌가 (설계 §2-10 "계단이 축을 2.8배 튀게 한 주범")
 *
 * ⚠️ 문턱은 이 파일에 직접 적었습니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
const { load, xiOf, play } = require("./_load.js");

const DIR = "/workspace/grow-games/beta/winger2";
const BETA = "/workspace/grow-games/beta";
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════ A. sw.js ASSETS ↔ 디스크 · index.html ══════════
 * 오프라인에서만 깨지는 종류라 빨간불이 안 뜹니다. 그래서 여기서 셉니다. */
{
  const SW = fs.readFileSync(path.join(DIR, "sw.js"), "utf8");
  const HTML = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
  const am = SW.match(/const ASSETS = \[([\s\S]*?)\];/);
  const assets = am ? Array.from(am[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]) : [];
  check(assets.length > 0, `sw.js에서 ASSETS를 읽었다 (${assets.length}개)`);

  // ① addAll은 원자적이에요 — 하나라도 404면 설치가 통째로 실패해서 오프라인이 아예 안 됩니다
  const norm = (p0) => path.resolve(DIR, p0.split("?")[0]);
  const missing = assets.filter((a) => a !== "./" && !fs.existsSync(norm(a)));
  check(missing.length === 0, `ASSETS의 모든 항목이 디스크에 있다${missing.length ? ` — 없는 것: ${missing.join(", ")}` : ""}`);

  // ② 페이지가 실제로 받는 파일이 ASSETS에 있나
  const srcs = Array.from(HTML.matchAll(/<script src="([^"]+)"><\/script>/g)).map((m) => m[1])
    .concat(Array.from(HTML.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)).map((m) => m[1]))
    .filter((s) => !/^https?:/.test(s));
  /* 🌐 네트워크 의존 모듈은 일부러 안 넣어 왔어요 — 오프라인에서 할 일이 없는 파일이에요.
   * ⚠️ env.js는 **여기 들어가면 안 됩니다.** 베타/상용을 판별해 localStorage를
   *    'beta::'로 감싸는 모듈이라, 오프라인에서 빠지면 세이브 접두사가 통째로 틀어져요.
   *    🦄 unicorn/sw.js는 이미 ../env.js를 캐시합니다 — 그게 맞는 상태예요. */
  const NET_ONLY = ["../cloud.js", "../stats.js", "../ads.js"].map(norm);
  const cached = new Set(assets.map(norm));
  const gaps = srcs.map(norm).filter((s) => !cached.has(s) && NET_ONLY.indexOf(s) < 0)
    .map((s) => path.relative(DIR, s));
  check(gaps.length === 0,
    `index.html이 받는 파일이 ASSETS에 다 있다${gaps.length ? ` — 빠진 것: ${gaps.join(", ")} (오프라인에서만 깨져요)` : ""}`);

  // ③ 캐시 이름 — 접두사가 겹치면 activate가 **다른 게임 캐시를 지웁니다**
  const cm = SW.match(/const CACHE = "([^"]+)"/);
  check(!!cm && /^winger2-/.test(cm[1]), `CACHE 이름이 winger2- 접두사다 (${cm ? cm[1] : "못 찾음"})`);
  const other = fs.readFileSync(path.join(BETA, "soccer/sw.js"), "utf8").match(/const CACHE = "([^"]+)"/);
  check(!!cm && !!other && !cm[1].startsWith(other[1].replace(/-v\d+$/, "")) && !other[1].startsWith("winger2-"),
    `현행 ⚽ 더 윙어(${other ? other[1] : "?"})와 캐시 접두사가 안 겹친다`);

  // ④ SAVE_KEY — 기존 winger-save-v1을 재사용하면 옛 세이브를 덮어씁니다
  const G = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
  const sk = G.match(/const SAVE_KEY = "([^"]+)"/);
  check(!!sk && sk[1] === "winger2-save-v1", `SAVE_KEY = winger2-save-v1 (${sk ? sk[1] : "못 찾음"})`);

  /* ⑤ 확인 페이지 — `_check.html`의 GAME_ORDER ↔ `_fixtures.js`의 시나리오
   *
   * 🔇 **조용히 실패하는 자리입니다.** _check.html은
   *      const present = GAME_ORDER.filter((g) => F.items.some((x) => x.game === g));
   *    로 탭을 만들어요. GAME_ORDER에 winger2가 있어도 시나리오가 한 건도 없으면
   *    **탭이 아예 안 그려집니다** — 오류도, 빈 탭도 없이 그냥 없는 것처럼 굴어요.
   *    (반대 방향 — 시나리오는 있는데 GAME_ORDER에 없는 경우 — 도 같은 증상입니다.)
   *
   * 시나리오를 만드는 건 `scripts/make-fixtures.js`이고, 거기에 winger2 생산자가 있어야 해요.
   * 없으면 범민 님의 **실기기 확인 목록에서 ⚽ 더 윙어 II가 통째로 빠집니다.** */
  const CK = fs.readFileSync(path.join(BETA, "_check.html"), "utf8");
  const gm = CK.match(/const GAME_ORDER = \[([^\]]*)\]/);
  const order = gm ? Array.from(gm[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]) : [];
  check(order.indexOf("winger2") >= 0, `_check.html GAME_ORDER에 winger2가 있다 (${order.join(", ")})`);
  const FXS = fs.readFileSync(path.join(BETA, "_fixtures.js"), "utf8");
  const games = new Set(Array.from(FXS.matchAll(/"game":\s*"([a-z0-9]+)"/g)).map((m) => m[1]));
  const MKF = fs.readFileSync("/workspace/grow-games/scripts/make-fixtures.js", "utf8");
  check(games.has("winger2"),
    `_fixtures.js에 winger2 시나리오가 있다 (지금 있는 게임: ${Array.from(games).join(", ") || "없음"})`
    + (games.has("winger2") ? "" :
      `\n     GAME_ORDER에는 winger2가 있는데 시나리오가 0건이면 **탭이 한 장도 안 그려집니다** (오류 없이 조용히요).`
      + `\n     scripts/make-fixtures.js에 winger2 생산자 ${/game:\s*"winger2"/.test(MKF) ? "있음" : "**없음**"} — 거기부터 채워야 해요.`));
}

/* ══════════ B·C·D — 페이지를 실제로 띄웁니다 ══════════ */
const FX = (() => {
  const s = fs.readFileSync(path.join(BETA, "_fixtures.js"), "utf8");
  const m = s.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
  return m ? new Function(`return ${m[1]};`)() : null;
})();
const item = FX && FX.items.find((x) => x.id === "winger2-match");
if (!item) { console.log("❌ winger2 확인용 세이브를 못 찾았어요 (beta/_fixtures.js)"); process.exit(1); }
/* 🔑 **디스크에 있는 그대로 씁니다.** 예전에는 winger2 픽스처가 없어서 soccer 세이브를
 *    키·phase만 바꿔 빌려 썼는데, 그건 "픽스처가 실제와 다른 모양"이라는 이 저장소의
 *    단골 함정 바로 옆자리예요. 지금은 진짜 winger2 시나리오가 있습니다.
 *    ⚠️ 모양이 맞는지 여기서 한 번 확인하고 넘어갑니다 — 안 맞으면 손으로 고치지 말고
 *       `node scripts/make-fixtures.js`를 다시 돌리세요. */
const keys = item.keys;
const shapeBad = Object.entries(keys)
  .filter(([k, v]) => !/^winger2-save-v1/.test(k) || /"phase":"(?!winger2-)/.test(v))
  .map(([k]) => k);
check(shapeBad.length === 0,
  `winger2 픽스처가 디스크 모양 그대로다 — 키가 winger2-save-v1로 시작하고 phase가 winger2-*`
  + (shapeBad.length ? ` — 어긋난 키: ${shapeBad.join(", ")}` : ` (${Object.keys(keys).join(", ")})`));

const PRE = `window.fetch=()=>Promise.reject(new Error("off"));
window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};
window.alert=()=>{};window.confirm=()=>false;
(function(){var st=window.setTimeout;window.setTimeout=function(fn,ms){return st(fn,0);};})();
window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message||e.error));});
` + Object.entries(keys).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("");

let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src.split("?")[0]);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  })
  .replace("</head>", `<script>${PRE}</script></head>`)
  .replace("</body>", `<script>window.__get=(n)=>eval(n);</script></body>`);
/* 🖥️ 상용 경로로 띄웁니다 — /beta/ 경로면 env.js가 localStorage를 beta::로 감싸서
 *    위에서 심은 키를 못 읽어요 (그 자체가 env.js가 하는 일이에요). */
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/winger2/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  /* ── B. 드라이버가 부르는 이름 ↔ 화면이 내보내는 함수 ── */
  {
    const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
    const body = (CAREER.match(/function runV2Match\([\s\S]*?\n {2}\}/) || [""])[0];
    const called = Array.from(new Set(Array.from(body.matchAll(/scene\.(\w+)/g)).map((m) => m[1])));
    const api = Object.keys(w.W2Scene || {});
    const gone = called.filter((n) => api.indexOf(n) < 0);
    check(called.length >= 3, `runV2Match가 부르는 화면 API를 읽었다 — ${called.join(", ")}`);
    check(gone.length === 0, `그 이름이 match-scene.js에 다 있다${gone.length ? ` — 없는 것: ${gone.join(", ")}` : ""}`);
    /* ⏩ 빨리감기는 설계 §5-5 항목이에요. 화면은 fast()를 내보내는데 부르는 쪽이 있나요 */
    check(/\bfast\s*\(/.test(CAREER) || /W2Scene\.fast/.test(CAREER),
      "⏩ 빨리감기 — 화면의 fast()를 부르는 곳이 있다 (설계 §5-5)");
  }

  /* ── C. stakeKey 8종이 화면에서 서로 다른 문구가 된다 ──
   *  엔진이 실제로 내는 키를 모아서, 진짜 화면에 밀어 넣어 봅니다.
   *  표에 없는 키는 조용히 fallback으로 떨어져서 문구가 겹쳐요. */
  {
    const E = load();
    E._t.seed(4321); E._t.skill = 0.5;
    const keysSeen = new Set();
    for (let i = 0; i < 600; i++) {
      const r = E._t.playMatch({ xi: xiOf("mf", 110, 70), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
      for (const c of r.cards) if (c.mine && c.stakeKey) keysSeen.add(`${c.kind}|${c.stakeKey}`);
    }
    check(keysSeen.size >= 8, `엔진이 내는 (카드종류 × stakeKey) 조합 ${keysSeen.size}종을 모았다`);
    const host = w.document.createElement("div");
    w.document.body.appendChild(host);
    const lines = new Map();
    for (const combo of keysSeen) {
      const [kind, key] = combo.split("|");
      w.W2Scene.mount(host, { home: "우리", away: "상대", myName: "나" });
      w.W2Scene.fast();                      // 타이핑을 즉시 표시로 — 글자가 잘려 세면 안 돼요
      w.W2Scene.openMoment({ min: 50, kind, stakeKey: key, score: [1, 1], mine: true });
      await wait(60);
      const el = host.querySelector(".w2-card.mine .w2-body");
      lines.set(combo, el ? el.textContent : "");
      w.W2Scene.destroy();
      host.innerHTML = "";
    }
    const vals = Array.from(lines.values());
    const bad = vals.filter((t) => !t || /undefined|NaN/.test(t));
    check(bad.length === 0, `stakeKey마다 문구가 나온다 (undefined/NaN ${bad.length}건)`);
    // 카드 종류가 같은데 문구가 겹치면 그 키가 표에 없다는 뜻이에요
    let dup = 0;
    for (const kind of ["goal", "assist", "defend"]) {
      const t = Array.from(lines.entries()).filter(([k]) => k.startsWith(kind + "|")).map(([, v]) => v);
      dup += t.length - new Set(t).size;
    }
    check(dup === 0, `같은 카드 종류 안에서 stakeKey마다 문구가 다르다 (겹친 것 ${dup}건 — 표에 없는 키는 조용히 fallback으로 떨어져요)`);
  }

  /* ── D. 게임 입구를 통해 리그 경기를 완주 ── */
  $("btn-continue").click();
  const go0 = w.document.querySelector(".slot-modal .slot-go");
  if (go0) go0.click();
  const S = () => w.__get("S");
  check(!!S(), "확인용 세이브를 열었다");
  check(active() === "screen-pro", `프로 준비 화면에 도달했다 (${active()})`);
  const goBtn = () => w.document.querySelector("#pro-actions .go-game");
  check(!!goBtn(), "⚽ 경기하러 가기 버튼이 있다");

  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click.
   *    pointerdown 하나만 보내던 검사가 24개 케이스를 전부 놓친 전례가 있어요. */
  const press = (el) => {
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = w.PointerEvent || w.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };

  /* 🪑 **선발은 라운드마다 다시 뽑혀요** (`WingerSquad.isStarter()`).
   *    벤치인 주는 `benchShow` 갈래로 빠져서 순간 카드가 **한 장도 안 그려집니다** —
   *    그건 결함이 아니라 설계예요. 그 주는 넘기고 다음 라운드에 다시 눌러요.
   *
   * 🔴 이 되풀이가 **없으면 검사가 뒤집힙니다.** 픽스처를 winger2로 바꾸고 나서
   *    세 번에 한 번씩 빨간불이 떴어요 — 벤치인 주에 걸린 거였습니다.
   *    **그때그때 갈리는 검사는 아무도 안 믿게 됩니다.**
   *    여덟 라운드를 다 벤치로 보내면 그건 그것대로 빨간불이에요(조용히 건너뛰지 않습니다). */
  const MAX_ROUNDS = 8;
  let week0 = 0, benched = 0, opened = false, rounds = 0;
  for (; rounds < MAX_ROUNDS && !opened; rounds++) {
    if (!goBtn()) break;
    week0 = S().activity.week;
    press(goBtn());
    for (let i = 0; i < 200 && active() !== "screen-stage"; i++) await wait(10);
    for (let i = 0; i < 400 && S().activity.week === week0; i++) await wait(10);
    if (w.document.querySelectorAll(".w2-card").length >= 6) { opened = true; break; }
    benched += 1;
    const nx = $("btn-stage-next");
    if (nx) press(nx);
    for (let i = 0; i < 300 && active() !== "screen-pro"; i++) await wait(10);
    /* 🏋️ **한 주는 훈련 턴을 다 써야 ⚽ 경기 버튼이 열려요.**
     *    `career.js:1564`의 `if (S.pendingShow)`가 그 버튼을 그립니다 —
     *    준비 턴이 남아 있으면 화면에 훈련 버튼만 있어요.
     *    🛌 휴식을 씁니다: 훈련 버튼은 상한에 닿으면 「재능 각성」으로 바뀌어 턴을
     *    다르게 쓰는데, 휴식은 언제나 턴 하나를 그대로 소모해요.
     *    (실측: 두 번 누르면 열립니다. 넉넉히 12번까지 봐요.) */
    for (let t = 0; t < 12 && !goBtn(); t++) {
      const rest = w.document.querySelector('#pro-actions .action-btn[data-key="__rest"]');
      if (!rest) break;
      press(rest);
      for (let i = 0; i < 100 && !goBtn(); i++) await wait(10);
    }
  }
  check(opened,
    `⚽ 경기하러 가기 → 순간 카드 경기에 도달했다 (🪑 벤치인 주 ${benched}회 건너뜀 · ${rounds + 1}라운드째`
    + `${opened ? "" : ` · 마지막 화면 ${active()} · 버튼 ${goBtn() ? "있음" : "없음"}`})`);
  check(active() === "screen-stage", `경기 화면이 열렸다 (${active()})`);
  check(S().activity.week === week0 + 1, "경기가 끝까지 돌고 라운드가 넘어갔다");

  const feed = w.document.querySelectorAll(".w2-card");
  check(feed.length >= 6, `순간 카드 화면에 카드가 그려졌다 (${feed.length}장)`);
  check(!!w.document.querySelector(".w2-tally"), "🔥 사후 집계 줄이 남았다 (설계 §5-2 — 사전에 약속하지 않고 사후에 셉니다)");
  const stageText = ($("stage-card") || {}).textContent || "";
  check(!/undefined|NaN/.test(stageText), "경기 화면에 undefined/NaN이 없다");

  // 스코어보드가 엔진 결과와 같은가 — 화면이 자체로 세면 여기서 갈립니다
  const board = w.document.querySelector(".w2-score");
  const nums = board ? Array.from(board.querySelectorAll("b")).map((b) => Number(b.textContent)) : [];
  check(nums.length === 2 && nums.every(Number.isFinite), `스코어보드가 숫자 두 개다 (${nums.join(":")})`);

  /* 🔴 경기가 끝난 뒤 — 결과가 남고 **다음으로 갈 수 있어야** 합니다.
   *    proMatchFinalize는 {resultHTML, nextLabel, nextFn}을 **돌려주는** 함수예요
   *    (soccer에서는 MatchSim.run이 그 반환값을 그려 주고 버튼에 물렸습니다). */
  const next = $("btn-stage-next");
  check(!!next && !next.hidden && !next.disabled, "다음 버튼이 보이고 눌린다");
  check(!!(next && (next.onclick || next.__handler)),
    `다음 버튼에 할 일이 물려 있다 (라벨 "${next ? next.textContent : ""}")`);
  const before = active();
  if (next) press(next);
  await wait(80);
  check(active() !== before, `다음 버튼을 누르면 화면이 넘어간다 (누른 뒤 ${active()})`);
  check(/\d+\s*:\s*\d+/.test(stageText) && /평점|MOM/.test(stageText),
    "경기 결과 요약(스코어 · 평점/MOM)이 화면에 남는다");
  check(w.__errs.length === 0, `경기 중 자바스크립트 오류가 없다${w.__errs.length ? ` — ${w.__errs[0]}` : ""}`);

  /* ── E. 카드 빈도가 계단이 아니다 ──
   * 설계 §2-10: 에이스 계단을 폐기한 이유가 **"축이 70→90에서 2.8배 튀는 주범"**이었어요.
   * 능력치 5점 사이에 순간 카드 빈도가 배로 뛰면 그 계단이 그대로 남아 있는 겁니다. */
  {
    const E = load();
    /* 🔴 2026-08-28 문턱 갱신 — 1.60 → **1.35**, 폭도 70~110 → **60~150 · 4포지션**.
     * 옛 값은 🌟 에이스 승자독식 계단(fw 1.94 · df 2.92)이 살아 있던 엔진에서
     * "이 정도면 잡히겠지"로 잡은 값이었어요. 구조를 고치고 다시 재니 최대 1.09입니다.
     * 22번 inspector 항목 21이 **≤1.35**로 못박았고, 지금은 여유가 24%예요.
     * 계단은 위쪽 능력치에서만 나기도 해서 폭을 150까지 넓혔습니다.
     * ⚠️ 이 문턱이 **실제로 계단을 잡는지**는 mutation-test.js 검사 E가 증명합니다
     *    (구조를 되돌리면 1.94 / 2.92로 튀어요). 여기는 불변식, 거기는 그 불변식의 증명입니다. */
    const STEP_MAX = 1.35;          // 문턱 — 5점 사이 인접 비
    for (const pos of ["fw", "wg", "mf", "df"]) {
      const v = [];
      for (let ab = 60; ab <= 150; ab += 5) v.push([ab, play(E, pos, ab, { n: 1200, seed: 31, mateBase: 70 }).perMatch.cards]);
      let mx = 1, at = 0;
      for (let i = 1; i < v.length; i++) { const r = v[i][1] / v[i - 1][1]; if (r > mx) { mx = r; at = v[i][0]; } }
      check(mx <= STEP_MAX,
        `${pos} — 능력치 5점 사이 순간 카드 빈도가 계단이 아니다 (최대 비 ${mx.toFixed(2)} @ 능력치 ${at} · ≤${STEP_MAX})`
        + `\n     ${v.map(([a, c]) => `${a}:${c.toFixed(2)}`).join(" ")}`);
    }
    // 설계 검사 13번 — 전 포지션·전 능력치에서 경기당 0.6회 이상
    const FLOOR = 0.6;
    const low = [];
    for (const pos of ["fw", "wg", "mf", "df"]) {
      for (const ab of [70, 90, 110, 130, 150]) {
        const c = play(E, pos, ab, { n: 1200, seed: 41, mateBase: 70 }).perMatch.cards;
        if (c < FLOOR) low.push(`${pos}${ab}=${c.toFixed(2)}`);
      }
    }
    check(low.length === 0, `카드 빈도 ≥ ${FLOOR}회/경기 (설계 검사 13번)${low.length ? ` — 못 넘긴 칸: ${low.join(" ")}` : ""}`);
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("❌ 검사가 죽었어요 —", e.stack); process.exit(1); });
