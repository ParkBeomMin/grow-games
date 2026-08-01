/* 🎪 월드투어 전용 무대 미니게임 3종(beta/tour-stage.js) — 계약 · 도달성 · 난이도.
 *
 * 세 갈래로 봐요.
 *
 *  ① 계약   timing.js와 인터페이스가 같은가. 판정이 세 가지뿐인가.
 *            timing.js를 건드리지 않았는가(8종이 그대로 있는가).
 *  ② 도달성  게임 입구를 통해, 진짜 엔진·진짜 시간으로 실제 클릭해서 완주하는가.
 *            잘 누르면 perfect까지 실제로 닿는가. 아무것도 안 눌러도 안 막히는가.
 *  ③ 난이도  가상 시계로 '사람 모델'을 돌려 판정 분포를 재요.
 *            이게 있어야 "메커닉을 고쳤더니 전원 perfect가 됐다"를 잡을 수 있어요.
 *            등급 분포(무작위 500회)는 tour-depth-test.js가, 세 무대의 구성은
 *            tour-set-test.js가 봐요. 여기는 메커닉 자체의 난이도만 봐요.
 *
 * ③의 사람 모델은 '오차를 가진 사람'이에요. 화면(빛 위치·두 바 간격·게이지)만
 * 읽고, 노린 순간에 오차를 얹어 누르거나, 조금 지난 화면을 보고 연타해요.
 * 사람의 손을 정확히 맞힐 수는 없지만, "누가 봐도 잘하는 사람"과 "마구 두드리는
 * 사람"의 결과가 갈리는지, 능력치를 올리면 나아지는지는 이렇게 재야 알 수 있어요.
 */
"use strict";
const fs = require("fs");
const ROOT = "/workspace/grow-games";
const { JSDOM } = require(ROOT + "/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const MECHS = ["wave", "sync", "roar"];
const pctOf = (s) => parseFloat(String(s || "0").replace("%", "")) || 0;

/* ================= 가상 시계 위의 tour-stage.js =================
 * 실시간으로 재면 한 판이 4초라 표본을 못 모아요(400판이면 27분).
 * 시계를 우리가 돌리면 같은 코드를 그대로 돌리면서 수백 판을 몇 초에 봐요.
 * requestAnimationFrame · setTimeout · performance.now 를 전부 갈아끼워요. */
const vdom = new JSDOM(`<!doctype html><html><body><div id="box"></div></body></html>`,
  { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/" });
const V = vdom.window;
V.eval(fs.readFileSync(ROOT + "/beta/tour-stage.js", "utf8"));
const T = V.TourStage._t;

let VT = 0, vid = 1, vtimers = [], sched = 0;
V.performance.now = () => VT;
/* sched는 '지금까지 걸린 타이머 수'예요 — 준비 화면 위에서 시계가 도는지 아닌지를
 * 결과가 아니라 원인 쪽에서 못 박으려고 세요. */
V.requestAnimationFrame = (cb) => { sched++; const id = vid++; vtimers.push({ at: VT + 16.667, id, fn: () => cb(VT) }); return id; };
V.cancelAnimationFrame = (id) => { const i = vtimers.findIndex((t) => t.id === id); if (i >= 0) vtimers.splice(i, 1); };
V.setTimeout = (fn, ms) => { sched++; const id = vid++; vtimers.push({ at: VT + (ms || 0), id, fn }); return id; };
V.clearTimeout = (id) => { const i = vtimers.findIndex((t) => t.id === id); if (i >= 0) vtimers.splice(i, 1); };

// 시드 고정 난수 — 같은 seed면 같은 판이 나와서 '관찰 → 실행' 2패스가 가능해요
const mulberry32 = (a) => function () {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
let plyRnd = mulberry32(20260730);            // 사람의 오차는 게임 밖 난수예요
const gauss = (sd) => {
  const u = Math.max(1e-9, plyRnd()), v = plyRnd();
  return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/* 한 판을 돌려요. taps는 누를 가상 시각(ms), watch는 5ms마다 화면을 읽는 눈이에요.
 * ctl.noStart를 주면 준비 화면에서 손을 놓고 있어요 (누르기 전을 보는 검사용).
 * ctl.opts는 준비 화면 문구를 보려고 버튼 이름 같은 걸 얹을 때 써요. */
function trial(mech, zone, seed, taps, watch, ctl) {
  vtimers = []; VT = 0; sched = 0;
  V.Math.random = mulberry32(seed);
  const box = V.document.getElementById("box");
  box.innerHTML = "";
  let res = null, endedAt = 0;
  const opts = Object.assign({ label: "테스트", zonePct: zone }, (ctl && ctl.opts) || {});
  V.TourStage[mech](box, opts, (r) => { res = r; endedAt = VT; });
  /* 🧭 준비 화면 — 사람이 ▶️ 시작을 누르는 자리예요. 우회하지 않고 실제로 눌러요.
   * 가상 시각 0에서 누르니 그 뒤로 흐르는 시간은 준비 화면이 없던 때와 똑같아요 —
   * 판정 분포도 소요 시간도 이 화면 때문에 어긋나지 않아요. */
  const readyBox = box.querySelector(".mg-ready");
  const preTimers = sched;                  // 누르기 전에 걸린 타이머 (0이어야 해요)
  const readyHTML = readyBox ? readyBox.innerHTML : "";
  if (readyBox && !(ctl && ctl.noStart)) {
    const go = readyBox.querySelector(".mg-go");
    if (go) go.dispatchEvent(new V.Event("pointerdown", { bubbles: true, cancelable: true }));
  }
  const wrap = box.querySelector(".tm-box");
  const btn = wrap.querySelector(".tm-btn");
  const tap = () => btn.dispatchEvent(new V.Event("pointerdown", { bubbles: true, cancelable: true }));
  (taps || []).forEach((ms) => vtimers.push({ at: Math.max(1, ms), id: vid++, fn: tap }));
  if (watch) for (let t = 5; t <= 7000; t += 5) vtimers.push({ at: t + 0.001, id: vid++, fn: () => { if (!res) watch(wrap, VT, tap); } });
  while (vtimers.length && res === null && VT < 9000) {
    vtimers.sort((a, b) => a.at - b.at);
    const ev = vtimers.shift();
    VT = ev.at;
    ev.fn();
  }
  return { res, endedAt, wrap, lastVT: VT, ready: !!readyBox, readyHTML, preTimers, left: box.innerHTML };
}

// 🎬 관찰 패스로 빛의 궤적을 읽고, 최고조 순간에 오차를 얹어 눌러요
function waveAs(zone, seed, sigma, bias) {
  const seen = [];
  trial("wave", zone, seed, [], (wrap, t) => seen.push([t, pctOf(wrap.querySelector(".ts-wave-light").style.left)]));
  const taps = T.WAVE.cues.map((i) => {
    const c = T.waveCenter(i);
    const at = (seen.find((p) => p[1] >= c) || seen[seen.length - 1])[0];
    return at + gauss(sigma) + (bias || 0);
  });
  return trial("wave", zone, seed, taps.sort((a, b) => a - b));
}

// ✨ 관찰 패스로 겹침(교차)들을 찾아, 기다릴지 급할지 골라 눌러요
function syncAs(zone, seed, sigma, style) {
  const seen = [];
  trial("sync", zone, seed, [], (wrap, t) => seen.push([t,
    pctOf(wrap.querySelector(".ts-bar-a").style.left) - pctOf(wrap.querySelector(".ts-bar-b").style.left)]));
  const cross = [];
  for (let i = 1; i < seen.length; i++) {
    if ((seen[i - 1][1] > 0) !== (seen[i][1] > 0)) {
      cross.push({ t: seen[i][0], sp: Math.abs(seen[i][1] - seen[i - 1][1]) / ((seen[i][0] - seen[i - 1][0]) / 1000) });
    }
  }
  if (!cross.length) return trial("sync", zone, seed, [T.SYNC.cap - 400]);
  const pool = cross.filter((c) => c.t < T.SYNC.cap - 250);
  const use = pool.length ? pool : [cross[0]];
  // 기다리는 사람은 가장 천천히 다가오는 겹침을 노려요. 급한 사람은 첫 겹침에 손이 나가요.
  const pick = style === "hasty" ? use[0] : use.reduce((a, c) => (c.sp < a.sp ? c : a), use[0]);
  return trial("sync", zone, seed, [pick.t + gauss(sigma)]);
}

/* 🔥 화면만 보고 연타하는 사람 — lag만큼 지난 화면을 보고, gap보다 빨리는 못 누르고,
 * 연타 간격에 ±18% 손떨림이 있어요. aim은 어디까지 올릴지 정하는 배짱이에요. */
function roarAs(zone, seed, lag, gap, aimAt) {
  const hist = [];
  let lastTap = -9999, gapNow = gap;
  return trial("roar", zone, seed, [], (wrap, t, tap) => {
    const line = pctOf(wrap.querySelector(".ts-roar-line").style.left);
    const crack = pctOf(wrap.querySelector(".ts-roar-crackzone").style.left);
    hist.push([t, pctOf(wrap.querySelector(".ts-roar-fill").style.width), line, crack]);
    let h = hist[0];
    for (const x of hist) { if (x[0] <= t - lag) h = x; else break; }
    const aim = h[2] + (h[3] - h[2]) * aimAt;
    if (h[1] < aim && t - lastTap >= gapNow) {
      lastTap = t;
      gapNow = gap * (1 + (plyRnd() - 0.5) * 0.36);
      tap();
    }
  });
}

const dist = (n, fn) => {
  const d = { perfect: 0, good: 0, miss: 0 };
  let dur = 0;
  for (let i = 0; i < n; i++) { const r = fn(i + 1); d[r.res]++; dur += r.endedAt; }
  return { ...d, n, dur: dur / n, p: d.perfect / n, g: d.good / n, m: d.miss / n };
};
const show = (name, d) => console.log(`   ${name.padEnd(34)} P ${(d.p * 100).toFixed(0)}% · G ${(d.g * 100).toFixed(0)}% · M ${(d.m * 100).toFixed(0)}%  (${(d.dur / 1000).toFixed(2)}초)`);

// ================= ① 계약 =================
console.log("=== ① timing.js와 같은 계약을 지킨다 ===");
check(!!V.TourStage, "window.TourStage가 있다");
check(MECHS.every((m) => typeof V.TourStage[m] === "function"),
  `세 메커닉이 모두 함수다 (${MECHS.join(" · ")})`);
check(MECHS.every((m) => V.TourStage[m].length === 3),
  "셋 다 fn(container, opts, cb) 3인자다 — timing.js와 같은 모양");
const SRC = fs.readFileSync(ROOT + "/beta/tour-stage.js", "utf8");
check(!/window\.Timing/.test(SRC), "tour-stage.js가 window.Timing을 손대지 않는다");
check(!/\beval\s*\(/.test(SRC), "eval을 쓰지 않는다");
// timing.js 8종이 그대로 있어야 해요 — 컴백 무대가 그걸 써요
const TSRC = fs.readFileSync(ROOT + "/beta/timing.js", "utf8");
check(/return \{ play, hold, sequence, reaction, duel, target, drop, odd \};/.test(TSRC),
  "timing.js는 여전히 8종 그대로다 (건드리지 않았다)");
check(!/TourStage/.test(TSRC), "timing.js에 투어 전용 메커닉이 새어 들어가지 않았다");
// 아이돌만 내려받아요 — 다른 게임의 index.html에는 없어야 해요
const GAMES = ["rookie", "soccer", "stock", "dev", "chef", "stream", "unicorn"];
const loaded = GAMES.filter((g) => /tour-stage\.js/.test(fs.readFileSync(`${ROOT}/beta/${g}/index.html`, "utf8")));
check(loaded.length === 0, `아이돌 말고는 아무도 내려받지 않는다${loaded.length ? ` — ${loaded.join(", ")}` : ""}`);
check(/tour-stage\.js/.test(fs.readFileSync(`${ROOT}/beta/idol/index.html`, "utf8")),
  "아이돌 index.html은 tour-stage.js를 싣는다");
check(/tour-stage\.js/.test(fs.readFileSync(`${ROOT}/beta/idol/sw.js`, "utf8")),
  "서비스워커 캐시 목록에도 들어가 있다 (오프라인에서 투어가 안 뜨면 안 돼요)");

// 판정은 세 가지뿐이에요
const seenRes = new Set();
for (const m of MECHS) for (let i = 0; i < 40; i++) seenRes.add(trial(m, 10 + (i % 31), i + 1, [400 + i * 37]).res);
check([...seenRes].every((r) => ["perfect", "good", "miss"].includes(r)),
  `판정이 perfect · good · miss 셋뿐이다 (${[...seenRes].join(" ")})`);

/* ================= ①-2 준비 화면 — 눌러야 시작해요 =================
 * 이 셋은 규칙이 여러 단계예요(3연속으로 잡기 · 두 대상의 교차 · 연타 유지에
 * 위쪽 한계까지). 한 줄짜리 안내로는 첫 무대를 통째로 날렸어요.
 * 여기서 못 박는 건 딱 하나예요 — **▶️ 시작을 누르기 전에는 시계가 안 돌아요.**
 * 시간이 아무리 흘러도 판정이 나면 안 되고, 타이머가 한 개라도 걸려 있으면 안 돼요. */
console.log("\n=== ①-2 준비 화면 — 누르기 전에는 아무것도 안 돈다 ===");
const READY_NAME = { wave: "🎬 함성 웨이브", sync: "✨ 싱크로", roar: "🔥 함성 유지" };
const BTN_NAME = { wave: "함성! 🙌", sync: "싱크! ✨", roar: "연타! 🔥" };
const MAX_CAP = Math.max(T.WAVE.cap, T.SYNC.cap, T.ROAR.dur + 1200);
// 준비 화면 한 칸에서 버튼 이름에 붙은 설명을 꺼내요
const keyDesc = (html, name) => {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = html.match(new RegExp(`<b>${esc}</b><span>([^<]+)</span>`));
  return m ? m[1] : "";
};
// 처음 보는 사람으로 되돌려요 — 값이 없으면 그냥 0이에요 (마이그레이션이 없어요)
V.localStorage.removeItem(T.READY_KEY);
for (const m of MECHS) {
  const name = READY_NAME[m];
  /* ① 준비 화면이 뜨고, 누르기 전에는 아무것도 안 움직여요.
   * watch가 5ms마다 화면을 보며 시계를 7초까지 밀어요. 세 메커닉의 안전망
   * (웨이브 6.5초 · 싱크 4.0초 · 함성 4.8초)이 전부 그 안에 있으니, 그래도 판정이
   * 안 나면 정말로 아무것도 안 돌고 있는 거예요. */
  let moved = 0;
  const idle = trial(m, 22, 1, [], (wrap) => {
    const box = wrap.parentNode;
    if (box.querySelector(".ts-wave") || box.querySelector(".ts-sync") || box.querySelector(".ts-roar")) moved++;
  }, { noStart: true, opts: { button: BTN_NAME[m] } });
  check(idle.ready, `${name} — 무대가 시작되기 전에 준비 화면이 먼저 뜬다`);
  check(idle.preTimers === 0,
    `${name} — 누르기 전에는 타이머가 하나도 안 걸린다 (rAF·setTimeout ${idle.preTimers}개)`);
  check(idle.lastVT > MAX_CAP,
    `${name} — 시계는 실제로 흘렀다 (${(idle.lastVT / 1000).toFixed(1)}초 · 안전망 ${(MAX_CAP / 1000).toFixed(1)}초보다 길어요)`);
  check(idle.res === null, `${name} — 그렇게 흘러도 판정이 안 난다 (${idle.res || "판정 없음"})`);
  check(moved === 0, `${name} — 무대 화면이 한 프레임도 안 그려진다 (그려진 프레임 ${moved})`);
  check(/mg-go/.test(idle.readyHTML), `${name} — 준비 화면에 ▶️ 시작 버튼이 있다`);
  /* ② 버튼이 무엇을 하는지 적혀 있어요. 투어 3종은 버튼이 하나씩이지만
   * 한 번인지 연타인지가 여기서 갈려요 — 그래서 하나라도 적어 둬요. */
  const desc = keyDesc(idle.readyHTML, BTN_NAME[m]);
  check(desc.length >= 10, `${name} — "${BTN_NAME[m]}"이 무엇을 하는지 적혀 있다 ("${desc}")`);
  // ③ 누르면 시작되고 정상적으로 끝나요
  const run = trial(m, 22, 1, [400]);
  check(run.res !== null, `${name} — ▶️ 시작을 누르면 실제로 굴러가고 끝난다 (${run.res})`);
  check(run.left.trim() === "", `${name} — 끝나면 준비 화면도 본 무대 상자도 안 남는다`);
}
/* ④ 여러 번 본 뒤에는 설명이 짧아져요. 도시 8곳 × 3무대 = 24판이라 매번 세 줄을
 * 다 읽으면 성가셔요. 줄어드는 건 설명의 길이지 시작 버튼이 아니에요. */
V.localStorage.removeItem(T.READY_KEY);
const shots = [];
for (let i = 0; i < T.FULL_SHOWS + 3; i++) shots.push(trial("wave", 22, 1, [], null, { noStart: true }));
const shotFull = shots.slice(0, T.FULL_SHOWS), shotBrief = shots.slice(T.FULL_SHOWS);
check(shots.every((s) => s.ready), `${shots.length}번을 봐도 준비 화면 자체는 계속 뜬다`);
check(shotFull.every((s) => /mg-ready-lines/.test(s.readyHTML)),
  `처음 ${T.FULL_SHOWS}번은 설명을 다 펴서 보여준다`);
check(shotBrief.every((s) => /mg-ready-short/.test(s.readyHTML) && !/mg-ready-lines/.test(s.readyHTML)),
  `${T.FULL_SHOWS + 1}번째부터는 한 줄로 줄어든다`);
check(shotBrief.every((s) => s.readyHTML.length < shotFull[0].readyHTML.length),
  `줄어든 쪽이 실제로 더 짧다 (${shotFull[0].readyHTML.length}자 → ${shotBrief[0].readyHTML.length}자)`);
check(shotBrief.every((s) => /mg-go/.test(s.readyHTML)),
  "짧아져도 ▶️ 시작 버튼은 그대로다 — 시작 시점은 계속 사람이 잡아요");
/* 위 검사는 문턱을 코드에서 읽어 와요(테스트가 숫자를 베껴 적지 않게요). 그래서
 * 문턱 자체가 터무니없이 커지면 "줄어든다"가 참인 채로 기능이 죽어요 —
 * 투어 한 번이 도시 8곳 × 3무대 = 24판이니, 여기는 한 손 안이어야 해요. */
check(T.FULL_SHOWS >= 1 && T.FULL_SHOWS <= 5,
  `전문을 펴 보이는 횟수가 한 손 안이다 (${T.FULL_SHOWS}번)`);
check(Object.keys(JSON.parse(V.localStorage.getItem(T.READY_KEY))).every((k) => MECHS.includes(k)),
  `본 횟수는 새 열쇠(${T.READY_KEY}) 안에만 쌓인다 (${V.localStorage.getItem(T.READY_KEY)})`);
// ⑤ 기존 8종에는 준비 화면이 없어요 — 매 승부처마다 한 번 더 누르면 경기가 늘어져요
check(!/mg-ready/.test(TSRC), "timing.js에는 준비 화면 코드가 한 줄도 안 들어갔다");
V.localStorage.removeItem(T.READY_KEY);

// ================= ② 능력치가 판정을 느슨하게 한다 =================
console.log("\n=== ② 능력치(zonePct)가 판정에 들어간다 ===");
check(T.waveWinMs(40) > T.waveWinMs(10),
  `🎬 능력치가 높으면 판정 창이 넓다 (${T.waveWinMs(10).toFixed(0)}ms → ${T.waveWinMs(40).toFixed(0)}ms)`);
check(T.syncPerf(40) > T.syncPerf(10) && T.syncGood(40) > T.syncGood(10),
  `✨ 능력치가 높으면 겹침 판정이 넓다 (퍼펙트 ${T.syncPerf(10).toFixed(1)}% → ${T.syncPerf(40).toFixed(1)}%)`);
check(T.roarBand(40) > T.roarBand(10) && T.roarDecay(40) < T.roarDecay(10),
  `🔥 능력치가 높으면 버틸 폭이 넓고 덜 식는다 (폭 ${T.roarBand(10).toFixed(1)} → ${T.roarBand(40).toFixed(1)} · 유지 ${(T.roarDecay(10) / T.ROAR.gain).toFixed(2)} → ${(T.roarDecay(40) / T.ROAR.gain).toFixed(2)}타/s)`);
// zonePct를 안 줘도, 이상한 값을 줘도 안 던져요 (옛 호출·잘못된 값 방어)
let threw = null;
try {
  for (const m of MECHS) { trial(m, undefined, 7, [500]); trial(m, 999, 8, [500]); trial(m, -5, 9, [500]); }
} catch (e) { threw = e; }
check(!threw, `zonePct가 없거나 범위를 벗어나도 던지지 않는다${threw ? ` — ${threw.message}` : ""}`);

// ================= ③ 아무것도 안 해도 끝난다 · 마구 두드리면 나쁘다 =================
console.log("\n=== ③ 막히지 않는다 · 연타로는 못 이긴다 ===");
for (const m of MECHS) {
  const idle = dist(30, (i) => trial(m, 30, i, []));
  check(idle.m === 1, `${m}: 아무것도 안 누르면 miss로 끝난다 (miss ${(idle.m * 100).toFixed(0)}%)`);
  check(idle.dur > 0 && idle.dur <= 5000,
    `${m}: 안 눌러도 5초 안에 끝난다 (${(idle.dur / 1000).toFixed(2)}초)`);
}
// 30ms마다 무작정 두드리는 사람 — 어떤 메커닉도 이걸로는 완벽이 안 나와야 해요
const mash = Array.from({ length: 200 }, (_, i) => 20 + i * 30);
for (const m of MECHS) {
  const d = dist(30, (i) => trial(m, 40, i, mash));
  show(`${m}: 30ms마다 마구 두드리기`, d);
  check(d.p === 0, `${m}: 마구 두드려서는 perfect가 안 나온다 (perfect ${(d.p * 100).toFixed(0)}%)`);
}

// ================= ④ 난이도 실측 =================
/* 실제 투어에서 zonePct(miniZone)는 대개 34~40이에요 — 거기서 갈리는지가 중요해요. */
console.log("\n=== ④ 난이도 (사람 모델 · 가상 시계) ===");
const N = 40;
const rows = {};
for (const z of [12, 22, 40]) {
  console.log(`  -- zonePct ${z} --`);
  rows[z] = {
    waveGood: dist(N, (i) => waveAs(z, i, 70, 0)),
    waveMid: dist(N, (i) => waveAs(z, i, 120, 0)),
    waveRush: dist(N, (i) => waveAs(z, i, 120, -90)),
    syncWait: dist(N, (i) => syncAs(z, i, 120, "wait")),
    syncHasty: dist(N, (i) => syncAs(z, i, 120, "hasty")),
    roarGood: dist(N, (i) => roarAs(z, i, 140, 150, 0.5)),
    roarMid: dist(N, (i) => roarAs(z, i, 200, 180, 0.5)),
    roarGreedy: dist(N, (i) => roarAs(z, i, 200, 150, 0.97)),
    roarTimid: dist(N, (i) => roarAs(z, i, 200, 180, 0.08)),
  };
  show("🎬 잘하는 사람(오차 70ms)", rows[z].waveGood);
  show("🎬 보통(오차 120ms)", rows[z].waveMid);
  show("🎬 성급함(90ms 먼저)", rows[z].waveRush);
  show("✨ 느린 겹침을 기다림", rows[z].syncWait);
  show("✨ 첫 겹침에 손이 나감", rows[z].syncHasty);
  show("🔥 잘하는 사람(반응 140ms)", rows[z].roarGood);
  show("🔥 보통(반응 200ms)", rows[z].roarMid);
  show("🔥 삑사리 각까지 올림", rows[z].roarGreedy);
  show("🔥 목표선에 붙어 살살", rows[z].roarTimid);
}

// 잘하면 되고, 못하면 안 돼요 — 셋 다
check(rows[40].waveGood.p >= 0.6, `🎬 잘하면 대부분 완벽하다 (${(rows[40].waveGood.p * 100).toFixed(0)}%)`);
check(rows[40].waveRush.p < rows[40].waveMid.p,
  `🎬 성급하면 나빠진다 (성급 ${(rows[40].waveRush.p * 100).toFixed(0)}% < 보통 ${(rows[40].waveMid.p * 100).toFixed(0)}%)`);
check(rows[40].syncWait.p > rows[40].syncHasty.p + 0.1,
  `✨ 기다린 쪽이 확실히 낫다 — '기다리는 긴장'이 실제로 이득이다 (기다림 ${(rows[40].syncWait.p * 100).toFixed(0)}% / 급함 ${(rows[40].syncHasty.p * 100).toFixed(0)}%)`);
check(rows[40].roarGood.p >= 0.6, `🔥 잘하면 대부분 완벽하다 (${(rows[40].roarGood.p * 100).toFixed(0)}%)`);
check(rows[40].roarGreedy.p <= 0.1 && rows[40].roarGreedy.m >= 0.5,
  `🔥 삑사리 각까지 올리면 무너진다 (perfect ${(rows[40].roarGreedy.p * 100).toFixed(0)}% · miss ${(rows[40].roarGreedy.m * 100).toFixed(0)}%)`);
check(rows[40].roarTimid.p <= 0.1 && rows[40].roarTimid.m <= 0.3,
  `🔥 목표선에 붙어 살살 치면 성공까지만 (perfect ${(rows[40].roarTimid.p * 100).toFixed(0)}% · good ${(rows[40].roarTimid.g * 100).toFixed(0)}%)`);
// 능력치를 올리면 실제로 나아져요 — 이게 없으면 육성이 투어에 안 닿아요
check(rows[40].waveMid.p > rows[12].waveMid.p,
  `🎬 능력치가 높으면 같은 손으로 더 잘된다 (zone 12 ${(rows[12].waveMid.p * 100).toFixed(0)}% → zone 40 ${(rows[40].waveMid.p * 100).toFixed(0)}%)`);
check(rows[40].syncWait.p > rows[12].syncWait.p,
  `✨ 능력치가 높으면 같은 손으로 더 잘된다 (zone 12 ${(rows[12].syncWait.p * 100).toFixed(0)}% → zone 40 ${(rows[40].syncWait.p * 100).toFixed(0)}%)`);
check(rows[40].roarMid.p > rows[12].roarMid.p,
  `🔥 능력치가 높으면 같은 손으로 더 잘된다 (zone 12 ${(rows[12].roarMid.p * 100).toFixed(0)}% → zone 40 ${(rows[40].roarMid.p * 100).toFixed(0)}%)`);
/* 보통 손을 가진 사람은 어느 능력치에서도 전원 perfect가 아니에요.
 * (잘하는 사람이 다 키운 아이돌로 전원 perfect를 내는 건 보상이라 여기서 안 막아요.
 *  대신 능력치가 낮으면 잘하는 사람도 흔들려야 해요 — 아래에서 그걸 봐요.) */
for (const z of [12, 22, 40]) {
  for (const k of ["waveMid", "syncWait", "roarMid"]) {
    check(rows[z][k].p < 1, `zone ${z} ${k}: 보통 손으로는 전원 perfect가 아니다 (${(rows[z][k].p * 100).toFixed(0)}%)`);
  }
}
check(rows[12].waveGood.p < 0.9 && rows[12].roarGood.p < 0.9,
  `능력치가 낮으면 잘하는 사람도 흔들린다 (🎬 ${(rows[12].waveGood.p * 100).toFixed(0)}% · 🔥 ${(rows[12].roarGood.p * 100).toFixed(0)}%)`);

// ================= ⑤ 한 판이 3~5초에 끝난다 =================
console.log("\n=== ⑤ 한 판 소요 (도시 8곳 × 3무대 = 24판이라 길면 지루해요) ===");
/* endedAt은 cb가 불린 시각이라 판정 연출(450ms)까지 들어 있어요 — 사람이 실제로
 * 기다리는 시간이에요. 안 누르는 최악의 경우가 곧 그 메커닉의 상한이에요. */
for (const m of MECHS) {
  const worst = dist(20, (i) => trial(m, 40, i, []));
  check(worst.dur >= 2500 && worst.dur <= 5000,
    `${m}: 가장 오래 걸리는 판도 ${(worst.dur / 1000).toFixed(2)}초 (3~5초 안)`);
}
const fastest = dist(20, (i) => syncAs(40, i, 120, "hasty")).dur;
console.log(`   ✨ 급하게 치면 가장 빨리 끝나요: ${(fastest / 1000).toFixed(2)}초`);

// ================= ⑥ 진짜 엔진 · 진짜 시간 · 실제 클릭 =================
/* 여기까지는 가상 시계였어요. 시계를 우리가 돌리면 "requestAnimationFrame이 실제로
 * 걸려 있는가", "화면에 정말 뜨는가"를 못 봐요. 그래서 마지막은 게임 입구를 통해
 * 진짜 시간으로 해요 — 투어 화면에 들어가 도시를 실제로 클릭해서 공연해요. */
console.log("\n=== ⑥ 게임 입구를 통해 · 진짜 시간 · 실제 클릭으로 완주 ===");
const { boot } = require(ROOT + "/tests/idol/tour-harness.js");
const H = boot();
const w = H.w, $ = H.$;
w.scrollTo = () => {};                       // jsdom이 구현 안 한 것 — 경고만 시끄러워요
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 화면에 뜬 미니게임을 '잘하는 사람'처럼 눌러요. 무엇이 떴는지는 DOM으로 알아요. */
function playFrame(state) {
  const box = $("tour-moment").querySelector(".tm-box");
  if (!box) return null;
  const tapOn = (el) => el.dispatchEvent(new w.Event("pointerdown", { bubbles: true, cancelable: true }));
  /* 🧭 준비 화면이면 규칙을 읽고 ▶️ 시작을 눌러요 — 우회하지 않고 사람과 같은 길이에요.
   * 이 화면은 .tm-box를 함께 달고 있어서(상자 모양을 물려받아요) 여기서 먼저 갈라야 해요. */
  if (box.classList.contains("mg-ready")) {
    state.ready = (state.ready || 0) + 1;
    tapOn(box.querySelector(".mg-go"));
    return "ready";
  }
  const btn = box.querySelector(".tm-btn");
  if (box.querySelector(".ts-wave")) {
    const pos = pctOf(box.querySelector(".ts-wave-light").style.left);
    const dotsTxt = box.querySelector(".ts-dots").textContent.replace(/\s/g, "");
    const cur = [...dotsTxt].filter((c) => c !== "◦").length;
    if (cur < T.WAVE.cues.length) {
      const c = T.waveCenter(T.WAVE.cues[cur]);
      if (Math.abs(pos - c) <= 0.6) tapOn(btn);
    }
    return "wave";
  }
  if (box.querySelector(".ts-sync")) {
    const a = pctOf(box.querySelector(".ts-bar-a").style.left);
    const b = pctOf(box.querySelector(".ts-bar-b").style.left);
    if (Math.abs(a - b) <= 0.8) tapOn(btn);
    return "sync";
  }
  if (box.querySelector(".ts-roar")) {
    const g = pctOf(box.querySelector(".ts-roar-fill").style.width);
    const line = pctOf(box.querySelector(".ts-roar-line").style.left);
    const crack = pctOf(box.querySelector(".ts-roar-crackzone").style.left);
    const aim = line + (crack - line) * 0.62;
    const now = Date.now();
    if (g < aim && g + T.ROAR.gain < crack && now - state.lastTap >= 110) {
      state.lastTap = now;
      tapOn(btn);
    }
    return "roar";
  }
  return "?";
}

async function realCity() {
  w.localStorage.setItem("grow-auto-mini", "0");     // 자동 판정을 끄고 사람처럼 해요
  H.setupPro(2000, { condition: 95, stat: 130 });
  H.Career.showActivity();
  const enter = H.tourButton();
  if (!enter) throw new Error("월드투어 버튼이 없어요");
  enter.click();
  const city = H.tourState().cities[0];
  const t0 = Date.now();
  $("btn-tour-go").click();
  const state = { lastTap: 0, ready: 0 };
  const seen = [];
  for (let i = 0; i < 40000 && H.tourState().fills.length === 0; i++) {
    const kind = playFrame(state);
    // "ready"는 무대가 아니라 그 앞의 준비 화면이에요 — 무대 순서에는 안 넣어요
    if (kind && kind !== "?" && kind !== "ready" && !seen.includes(kind)) seen.push(kind);
    await sleep(0);
  }
  const chips = Array.from($("tour-set").querySelectorAll(".tour-stage"))
    .map((c) => (c.className.match(/done (perfect|good|miss)/) || [])[1] || "?");
  return { city, seen, chips, ready: state.ready, fill: H.tourState().fills[0], ms: Date.now() - t0 };
}

(async () => {
  const runs = [];
  for (let k = 0; k < 2; k++) runs.push(await realCity());
  for (const r of runs) {
    console.log(`   ${r.city}: ${r.seen.join(" → ")} · 판정 ${r.chips.join(" ")} · 객석 ${Math.round(r.fill * 100)}% · ${(r.ms / 1000).toFixed(1)}초`);
  }
  check(runs.every((r) => typeof r.fill === "number"), "실제 클릭으로 도시를 완주해 객석이 확정된다");
  /* 🧭 진짜 시간·진짜 DOM에서도 무대마다 준비 화면이 먼저 뜨고, 그걸 눌러야 무대가
   * 시작돼요. 가상 시계에서 본 것과 같은 이야기를 진짜 브라우저 경로에서 한 번 더 봐요. */
  check(runs.every((r) => r.ready === 3),
    `무대마다 준비 화면이 한 번씩 먼저 뜬다 (도시당 ${runs.map((r) => r.ready).join(" · ")}회)`);
  check(runs.every((r) => r.seen.join(",") === "wave,sync,roar"),
    `세 무대가 오프닝(wave) → 킬링파트(sync) → 앵콜(roar) 순서로 화면에 뜬다 (${runs[0].seen.join(" → ")})`);
  check(runs.every((r) => r.chips.length === 3 && !r.chips.includes("?")),
    `세 무대 판정이 모두 세트리스트에 찍힌다 (${runs.map((r) => r.chips.join("/")).join(" · ")})`);
  // 잘 누르면 perfect까지 실제로 닿아요 — 메커닉마다 한 번 이상
  const perfBy = MECHS.map((m, i) => runs.some((r) => r.chips[i] === "perfect"));
  check(perfBy.every(Boolean),
    `잘 누르면 세 메커닉 모두 perfect에 닿는다 (${MECHS.map((m, i) => `${m}:${perfBy[i] ? "○" : "✗"}`).join(" ")})`);
  check(runs.every((r) => !r.chips.includes("miss")),
    "잘 누르면 놓치는 무대가 없다");
  check(runs.every((r) => r.ms < 20000),
    `한 도시(세 무대)가 사람 손으로 20초 안에 끝난다 (${runs.map((r) => (r.ms / 1000).toFixed(1)).join("초 · ")}초)`);
  check(!$("tour-moment").querySelector(".tm-box"), "세 무대가 끝나면 미니게임 박스가 화면에 남지 않는다");
  check(!$("btn-tour-go").disabled, "세 무대가 끝나면 공연 버튼이 다시 살아난다");

  console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
