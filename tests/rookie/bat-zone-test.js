/* 🎯 타격 구역 선택 화면 — 화면만 바뀌고 **판정은 한 톨도 안 바뀌었는가**
 *
 * 설계: docs/superpowers/_workspace/rookie/11_designer_bat-zone.md (Codex gpt-6-astra)
 *
 * 이건 새 미니게임이 아니라 **이미 있던 3택(`Timing.duel`)의 화면 교체**예요.
 * 그래서 이 파일이 지켜야 할 것은 재미가 아니라 **동등성**입니다 —
 * 조작 축을 하나 더 얹으면 육성과 조작이 다시 곱해지고, 그게 타율 .948 · WAR 58.6이
 * 나왔던 2026-07-27 이전 모델이에요 (docs/superpowers/specs/2026-07-27-batting-pitching-rebalance-design.md).
 *
 * 지키는 것:
 *   ⓿ 변이 정규식이 소스에 걸린다
 *   ① 같은 난수·같은 선택이면 판정이 기존 `Timing.duel`과 **정확히 같다** (평균이 아니라 일치)
 *   ② 어댑터가 난수를 **한 톨도 더 안 쓴다**
 *   ③ 구역 세 칸이 실제로 그려지고, `data-i`(판정에 쓰는 값)가 순서대로 보존된다
 *   ④ 콜백이 **딱 한 번** 온다
 *   ⑤ 등록 지점 — `index.html` 로드 순서 · `sw.js` ASSETS · 자동 진행 · 가을야구 분기
 *   ⑥ 변이 검증
 *
 * 🔒 `beta/timing.js`는 8개 게임이 공유해요. 이 검사는 **그 파일이 안 바뀌었는지도** 봅니다.
 *
 * 종료 코드 — 0 통과 · 1 빨간불 · 2 💥 검사가 아예 안 돌았음
 */
"use strict";
const fs = require("fs");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

const ROOT = "/workspace/grow-games";
const BASE = process.env.ROOKIE || `${ROOT}/beta/rookie`;
const ZONE_SRC = fs.readFileSync(`${BASE}/bat-zone.js`, "utf8");
const TIMING_SRC = fs.readFileSync(`${ROOT}/beta/timing.js`, "utf8");
const GAME_SRC = fs.readFileSync(`${BASE}/game.js`, "utf8");
const HTML_SRC = fs.readFileSync(`${BASE}/index.html`, "utf8");
const SW_SRC = fs.readFileSync(`${BASE}/sw.js`, "utf8");

let pass = 0, fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); ok ? pass++ : fail++; };
const group = (t) => console.log(`\n— ${t}`);

/* ── ⓿ 변이 등록 ── */
const MUT = {
  keepDataI: [/b\.dataset\.bzSide = SIDE\[i\] \|\| "";/, 'b.dataset.i = String(2 - i);'],
  extraRng:  [/const host = document\.createElement\("div"\);/, 'const host = document.createElement("div"); Math.random();'],
  twiceCb:   [/\(res\) => \{ host\.remove\(\); cb\(res\); \}/, '(res) => { host.remove(); cb(res); cb(res); }'],
};
/* 🔴 «autoMiniOn → cb(autoRes(stat), DUEL_*)»는 game.js에 **두 군데**(odd 분기·duel 분기) 있어요.
 * 앵커 없이 replace하면 앞의 것을 지워서 변이가 아무것도 안 잡습니다 — 실제로 한 번 놓쳤어요. */
const AUTO_RE = /if \(autoMiniOn\(\)\) \{ cb\(autoRes\(stat\), isBat \? DUEL_BAT : DUEL_PIT\); return; \}([\s\S]{0,400}?const zone = isBat)/;
const MUT_GAME = {
  autoGone: [AUTO_RE, "$1"],
  postGone: [/if \(inPostMini\(\)\) \{ playPostMini\(container, cb\); return; \}/, ""],
};
group("⓿ 변이 등록");
let dead = 0;
for (const [n, [re]] of Object.entries(MUT)) { const ok = re.test(ZONE_SRC); if (!ok) dead++; check(ok, `bat-zone.js «${n}»`); }
for (const [n, [re]] of Object.entries(MUT_GAME)) { const ok = re.test(GAME_SRC); if (!ok) dead++; check(ok, `game.js «${n}»`); }
if (dead) console.log("   🔴 위가 ❌면 ⑥은 아무것도 안 지키고 있을 수 있어요.");

/* ── 판을 세워요 — 진짜 DOM에서 진짜 버튼을 누릅니다 ── */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* ⏱️ 손으로 돌리는 시계.
 * `Timing.duel`은 판정을 **500ms 뒤에** 넘기고, 안 누르면 6초 뒤 miss로 끝내요.
 * 진짜 타이머를 쓰면 검사가 느리고, 안 기다리면 **판정이 늘 undefined인데 「전부 일치」**가 됩니다. */
function makeClock() {
  let now = 0, id = 1;
  const q = new Map();
  return {
    set: (fn, ms) => { const i = id++; q.set(i, { at: now + (ms || 0), fn }); return i; },
    clr: (i) => q.delete(i),
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const [i, e] of q) if (e.at <= end && (!next || e.at < next.e.at)) next = { i, e };
        if (!next) break;
        q.delete(next.i); now = next.e.at; next.e.fn();
      }
      now = end;
    },
  };
}
function boot(zoneSrc) {
  const dom = new JSDOM("<!doctype html><body><div id='c'></div></body>", { pretendToBeVisual: true });
  const w = dom.window;
  const clock = makeClock();
  // eslint-disable-next-line no-new-func
  new Function("window", "document", "setTimeout", "clearTimeout", TIMING_SRC)(w, w.document, clock.set, clock.clr);
  // eslint-disable-next-line no-new-func
  new Function("window", "document", zoneSrc || ZONE_SRC)(w, w.document);
  return { w, host: w.document.getElementById("c"), clock };
}
const OPTS = { label: "테스트", choices: ["몸쪽", "가운데", "바깥쪽"], hintChance: 0.5 };

/* 실기기 순서 그대로 — pointerdown → pointerup → click */
function tap(w, el) {
  for (const type of ["pointerdown", "pointerup", "click"]) {
    el.dispatchEvent(new w.window.Event(type, { bubbles: true, cancelable: true }));
  }
}
/* 한 판을 돌려 판정을 받아요. pick = 누를 칸(0~2). 난수는 시드로 고정합니다. */
function run(w, host, seed, pick, useZone, zoneSrc) {
  let rngCalls = 0;
  const rng = mulberry32(seed);
  w.window.Math.random = () => { rngCalls++; return rng(); };
  const got = [];
  const runner = useZone ? w.window.RookieBatZone.play : w.window.Timing.duel;
  runner(host, OPTS, (res) => got.push(res));
  const btns = host.querySelectorAll(".tm-duel-btn");
  const el = btns[pick];
  if (el) tap(w, el);
  return { got, rngCalls, btns, el };
}
function once(seed, pick, useZone, zoneSrc) {
  const { w, host, clock } = boot(zoneSrc);
  const r = run({ window: w }, host, seed, pick, useZone, zoneSrc);
  clock.advance(600);   // 결과 표시 500ms를 흘려야 판정이 옵니다
  return { ...r, w, host, clock };
}

let sane;
try { sane = once(1, 0, true); } catch (e) { console.log(`💥 판을 못 세웠어요 — ${e.message}`); process.exit(2); }

/* ── ① 판정 동등성 ── */
group("① 같은 난수·같은 선택 → 판정이 기존과 정확히 같다");
let cmp = 0, mismatch = 0;
const seeds = [1, 7, 42, 99, 1234, 5150, 31337, 777, 20260906, 3];
for (const seed of seeds) {
  for (const pick of [0, 1, 2]) {
    const a = once(seed, pick, false);   // 기존 timing.js duel
    const b = once(seed, pick, true);    // 새 구역 화면
    a.w.close(); b.w.close();
    cmp++;
    if (JSON.stringify(a.got) !== JSON.stringify(b.got)) mismatch++;
  }
}
check(mismatch === 0, `시드 ${seeds.length}개 × 세 칸 = ${cmp}판이 전부 일치한다 (불일치 ${mismatch}판)`);
// 🔒 «전부 miss»처럼 한 값으로 뭉쳐 있으면 위 일치는 공짜예요 — 판정이 실제로 갈리는지 봅니다
const spread = {};
for (const seed of seeds) for (const pick of [0, 1, 2]) {
  const r = once(seed, pick, true); spread[r.got[0]] = (spread[r.got[0]] || 0) + 1; r.w.close();
}
check(Object.keys(spread).length === 3,
  `판정이 세 갈래로 실제로 갈린다 (${Object.entries(spread).map(([k, v]) => `${k} ${v}`).join(" · ")})`);

/* ── ② 난수 소비량 ── */
group("② 어댑터가 난수를 더 쓰지 않는다");
let rngSame = 0, rngDiff = 0;
for (const seed of seeds.slice(0, 5)) {
  const a = once(seed, 1, false), b = once(seed, 1, true);
  (a.rngCalls === b.rngCalls) ? rngSame++ : rngDiff++;
  a.w.close(); b.w.close();
}
check(rngDiff === 0, `난수 호출 수가 기존과 같다 (같음 ${rngSame} · 다름 ${rngDiff})`);

/* ── ③ 구역이 그려지고 data-i가 보존된다 ── */
group("③ 화면");
{
  /* 🔒 시계를 돌리기 **전에** 봅니다 — duel은 판정 500ms 뒤에 상자를 치워요.
   * 돌린 뒤에 보면 "요소가 없다"가 되고, 그건 화면이 없다는 뜻이 아닙니다. */
  const { w, host, clock } = boot();
  const got = [];
  w.Math.random = () => 0.5;
  w.RookieBatZone.play(host, OPTS, (res) => got.push(res));
  const btns = host.querySelectorAll(".tm-duel-btn");
  const box = host.querySelector(".rookie-bat-zone");
  const plate = host.querySelector(".bz-plate");
  check(btns.length === 3, `구역이 세 칸 그려진다 (${btns.length}칸)`);
  check([...btns].every((b, i) => b.dataset.i === String(i)),
    `판정에 쓰는 data-i가 순서대로 보존된다 (${[...btns].map((b) => b.dataset.i).join(",")})`);
  check([...btns].every((b) => b.classList.contains("bz-cell")), "세 칸에 전용 클래스가 붙는다");
  check(!!box, "존 상자에 야구 전용 클래스가 붙는다");
  check(!!plate, "홈플레이트가 그려진다");
  check(!!plate && plate.getAttribute("aria-hidden") === "true", "홈플레이트는 장식이라 읽어주지 않는다");
  check(/구역을 한 번 누르면/.test(host.textContent), "«빨리 눌러도 유리하지 않다»를 알려준다");
  check([...btns].map((b) => b.textContent).join(",") === "몸쪽,가운데,바깥쪽",
    `칸 이름이 몸쪽·가운데·바깥쪽이다 (${[...btns].map((b) => b.textContent).join(",")})`);
  // 🔑 그리고 **누르면 실제로 끝나야** 해요 — 위 단언들은 "안 눌러도" 전부 참이거든요
  tap({ window: w }, btns[1]);
  clock.advance(600);
  check(got.length === 1, `그 칸을 실제로 눌러 판정이 온다 (${got.length}회 · ${got[0]})`);
  check(!host.querySelector(".rookie-bat-zone"), "판정 뒤에는 화면이 치워진다");
  w.close();
}

/* ── ④ 콜백은 한 번 ── */
group("④ 콜백");
{
  const { w, host, clock } = boot();
  const r = run({ window: w }, host, 11, 2, true);
  tap({ window: w }, r.btns[0]);   // 연타 — 기존 done 가드가 막아야 해요
  clock.advance(600);
  check(r.got.length === 1, `연타해도 판정이 한 번만 온다 (${r.got.length}회)`);
  w.close();
}
{
  // 🔒 안 누르면 6초 뒤 miss — "기다리기로 성공하는 규칙"은 없어요 (폐기한 형태로 돌아가는 자리)
  const { w, host, clock } = boot();
  const got = [];
  w.Math.random = () => 0.5;
  w.RookieBatZone.play(host, OPTS, (res) => got.push(res));
  clock.advance(3000);
  check(got.length === 0, `3초에는 아직 판정이 없다 (${got.length}회)`);
  clock.advance(4000);
  check(got[0] === "miss", `안 누르면 6초 뒤 miss다 (${got[0]})`);
  w.close();
}

/* ── ⑤ 등록 지점 ── */
group("⑤ 등록 지점");
const iTiming = HTML_SRC.indexOf('src="../timing.js"');
const iZone = HTML_SRC.indexOf('src="bat-zone.js"');
const iGame = HTML_SRC.indexOf('src="game.js"');
check(iZone > 0, "index.html이 bat-zone.js를 내려받는다");
check(iTiming > 0 && iTiming < iZone && iZone < iGame,
  "timing.js 뒤, game.js 앞에 놓인다 (로드 순서)");
check(/ASSETS = \[[^\]]*"\.\/bat-zone\.js"/.test(SW_SRC), "sw.js ASSETS에 있다 (오프라인)");
const cacheV = (SW_SRC.match(/const CACHE = "(rookie-v\d+)"/) || [])[1];
check(cacheV === "rookie-v6", `자산이 늘었으니 캐시 이름이 올라갔다 (${cacheV})`);
check(/const zone = isBat && window\.RookieBatZone \? window\.RookieBatZone\.play : window\.Timing\.duel;/.test(GAME_SRC),
  "타자만 새 화면을 쓰고, 스크립트가 없으면 예전 화면으로 떨어진다");
check(AUTO_RE.test(GAME_SRC),
  "🤖 자동 진행이면 화면을 만들기 전에 돌아간다 (구역 판정을 덧붙이지 않아요)");
check(/if \(inPostMini\(\)\) \{ playPostMini\(container, cb\); return; \}/.test(GAME_SRC),
  "🍂 가을야구는 전용 4종으로 먼저 빠진다");
// 🔒 공유 파일은 건드리지 않았는가
check(!/RookieBatZone|bz-cell|bat-zone/.test(TIMING_SRC), "공유 timing.js에 야구 전용 흔적이 없다");

/* ── ⑥ 변이 검증 ── */
group("⑥ 변이 검증");
const mutRun = (key) => {
  const [re, to] = MUT[key];
  return ZONE_SRC.replace(re, to);
};
// data-i를 뒤집으면 ③이 무너져야 해요
{
  const { w, host } = boot(mutRun("keepDataI"));
  w.Math.random = () => 0.5;
  w.RookieBatZone.play(host, OPTS, () => {});
  const btns = host.querySelectorAll(".tm-duel-btn");
  check(![...btns].every((b, i) => b.dataset.i === String(i)),
    `data-i를 뒤집으면 ③이 빨간불이 된다 (${[...btns].map((b) => b.dataset.i).join(",")})`);
  w.close();
}
// 난수를 더 쓰면 ②가 무너져야 해요
{
  const a = once(7, 1, false), b = once(7, 1, true, mutRun("extraRng"));
  check(a.rngCalls !== b.rngCalls, `난수를 하나 더 쓰면 ②가 빨간불이 된다 (${a.rngCalls} vs ${b.rngCalls})`);
  a.w.close(); b.w.close();
}
// 콜백을 두 번 부르면 ④가 무너져야 해요
{
  const r = once(11, 2, true, mutRun("twiceCb"));
  check(r.got.length !== 1, `콜백을 두 번 부르면 ④가 빨간불이 된다 (${r.got.length}회)`);
  r.w.close();
}
// game.js 쪽 변이는 소스 단언이 잡아야 해요
for (const [key, [re, to]] of Object.entries(MUT_GAME)) {
  const mutated = GAME_SRC.replace(re, to);
  const stillOk = key === "autoGone"
    ? AUTO_RE.test(mutated)
    : /if \(inPostMini\(\)\) \{ playPostMini\(container, cb\); return; \}/.test(mutated);
  check(!stillOk, `«${key}» 변이가 ⑤에서 빨간불이 된다`);
}
// sw.js 등록을 지우면 ⑤가 무너져야 해요
check(!/ASSETS = \[[^\]]*"\.\/bat-zone\.js"/.test(SW_SRC.replace('"./bat-zone.js", ', "")),
  "sw.js 등록을 지우면 ⑤가 빨간불이 된다");

console.log(fail ? `\n❌ ${fail}개 실패 (pass ${pass})` : `\n✅ 통과 (${pass})`);
process.exit(fail ? 1 : 0);
