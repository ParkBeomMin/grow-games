/* 🍂 가을야구 전용 미니게임 2종(beta/post-stage.js) — 계약 · 배치 · 도달성 · 난이도 · 우승 확률.
 *
 * 다섯 갈래로 봐요.
 *
 *  ① 계약     timing.js와 인터페이스가 같은가. 판정이 세 가지뿐인가.
 *              timing.js와 tour-stage.js를 안 건드렸는가. 야구만 내려받는가.
 *  ② 배치     **가을야구에서만** 나오는가. 정규시즌은 예전 8종 그대로인가.
 *              autoMiniOn() 경로가 살아 있는가.
 *  ③ 도달성   진짜 화면·진짜 엔진으로 실제 눌러서 완주하는가. 잘하면 perfect에
 *              닿는가. 아무것도 안 눌러도 안 막히는가. 한 판이 3~5초인가.
 *  ④ 난이도   가상 시계로 '사람 모델'을 돌려 판정 분포를 재요. 능력치를 올리면
 *              성적이 오르고, 시리즈가 깊어지면 어려워지는가.
 *              **기존 8종도 같은 사람 모델로 같이 재요** — 도입 전과 나란히 놓아야
 *              "쉬워졌다/어려워졌다"를 말할 수 있어요.
 *  ⑤ 우승 확률 ④가 잰 분포를 그대로 게임에 꽂고, 정규시즌 마지막 경기부터 결산까지
 *              **진짜 화면으로** 굴려서 우승 확률을 재요. 능력치에 따라 갈리되
 *              극단으로 쏠리지 않아야 해요.
 *
 * ④의 사람 모델은 '오차를 가진 사람'이에요. 화면(공 위치·공 크기·주자와 송구
 * 자리)만 읽고, lag만큼 늦은 화면으로 판단해 오차를 얹어 눌러요. 사람의 손을
 * 정확히 맞힐 수는 없지만, "잘 보는 사람"과 "대충 하는 사람"이 갈리는지,
 * 능력치를 올리면 나아지는지는 이렇게 재야 알 수 있어요.
 *
 * 난이도 숫자를 여기 옮겨 적지 않아요 — 전부 소스를 그대로 돌려서 냅니다.
 * 옮겨 적으면 post-stage.js를 고쳐도 초록이 뜹니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = "/workspace/grow-games";
const BETA = process.env.BETA || path.join(ROOT, "beta");
const { JSDOM } = require(ROOT + "/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}\n${e.stack}`); } };
const group = (t) => console.log(`\n— ${t}`);

const PS_SRC = fs.readFileSync(path.join(BETA, "post-stage.js"), "utf8");
const TM_SRC = fs.readFileSync(path.join(ROOT, "timing.js"), "utf8");
const TS_SRC = fs.readFileSync(path.join(BETA, "tour-stage.js"), "utf8");
const GAME_SRC = fs.readFileSync(path.join(BETA, "rookie/game.js"), "utf8");

const mulberry32 = (a) => function () {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
let plyRnd = mulberry32(20260731);
const gauss = (sd) => {
  const u = Math.max(1e-9, plyRnd()), v = plyRnd();
  return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const pctOf = (s) => parseFloat(String(s || "0").replace("%", "")) || 0;
const remOf = (s) => parseFloat(String(s || "0").replace("rem", "")) || 0;

/* ================================================================
 * ① 계약
 * ================================================================ */
group("① 계약");

check(/window\.PostStage = \(\(\) => \{/.test(PS_SRC), "post-stage.js가 window.PostStage 하나만 세운다");
check(/return \{\s*count, dash,/.test(PS_SRC), "count · dash 두 메커닉을 내보낸다");
// 판정은 세 가지뿐 — cb로 나가는 값이 전부 이 셋 안에 있어야 해요
{
  const grades = new Set((PS_SRC.match(/finish\(\s*"(\w+)"/g) || []).map((s) => s.match(/"(\w+)"/)[1]));
  for (const g of ["perfect", "good", "miss"]) grades.delete(g);
  check(grades.size === 0, `판정이 perfect · good · miss 셋뿐이다 (그 밖: ${[...grades].join(" · ") || "없음"})`);
  check(/cb\(res\)/.test(PS_SRC), "cb(res) 한 곳으로만 결과가 나간다");
}
check(!/TourStage/.test(PS_SRC), "tour-stage.js의 함수를 하나도 재사용하지 않는다 (TourStage를 안 부른다)");
check(!/window\.Timing/.test(PS_SRC), "timing.js의 함수도 재사용하지 않는다");
{
  const psFns = (PS_SRC.match(/^  function (\w+)\(/gm) || []).map((s) => s.match(/function (\w+)/)[1]);
  const tsFns = (TS_SRC.match(/^  function (\w+)\(/gm) || []).map((s) => s.match(/function (\w+)/)[1]);
  const tmFns = (TM_SRC.match(/^  function (\w+)\(/gm) || []).map((s) => s.match(/function (\w+)/)[1]);
  const mech = ["count", "dash"];
  const dup = mech.filter((m) => tsFns.includes(m) || tmFns.includes(m));
  check(dup.length === 0, `메커닉 이름이 투어 3종·기존 8종과 겹치지 않는다 (겹친 이름 ${dup.join(" · ") || "없음"})`);
  check(psFns.includes("count") && psFns.includes("dash"), `메커닉 두 개가 실제로 여기 있다 (${psFns.join(" · ")})`);
}

// timing.js는 한 줄도 안 건드렸어요 — 8종이 그대로 있고 새 파일을 모르는 채여야 해요
{
  const eight = ["play", "hold", "sequence", "reaction", "duel", "target", "drop", "odd"];
  const m = TM_SRC.match(/return \{ ([^}]+) \};/);
  const got = m ? m[1].split(",").map((s) => s.trim()) : [];
  check(eight.every((k) => got.includes(k)) && got.length === eight.length,
    `timing.js가 여전히 8종만 내보낸다 (${got.join(" · ")})`);
  check(!/PostStage/.test(TM_SRC) && !/PostStage/.test(TS_SRC),
    "timing.js · tour-stage.js가 PostStage를 모른다 (두 파일을 안 건드렸어요)");
}

// 야구만 내려받아요 — timing.js가 8개 게임 공용이라 여기 넣으면 안 되는 이유예요
guard("내려받는 게임", () => {
  const dirs = fs.readdirSync(BETA).filter((d) => fs.existsSync(path.join(BETA, d, "index.html")));
  const loads = dirs.filter((d) => /post-stage\.js/.test(fs.readFileSync(path.join(BETA, d, "index.html"), "utf8")));
  check(loads.length === 1 && loads[0] === "rookie",
    `post-stage.js를 내려받는 게임이 야구 하나뿐이다 (${loads.join(" · ") || "없음"})`);
  const rookieHtml = fs.readFileSync(path.join(BETA, "rookie/index.html"), "utf8");
  check(!/tour-stage\.js/.test(rookieHtml), "야구는 반대로 tour-stage.js를 안 내려받는다");
  const sw = fs.readFileSync(path.join(BETA, "rookie/sw.js"), "utf8");
  check(/\.\.\/post-stage\.js/.test(sw), "서비스워커가 새 파일을 캐시 목록에 담는다 (오프라인 플레이)");
});

/* ================================================================
 * 가상 시계 위의 post-stage.js · timing.js
 * 실시간으로 재면 한 판이 3초라 표본을 못 모아요(1000판이면 50분).
 * 시계를 우리가 돌리면 같은 코드를 그대로 돌리면서 수천 판을 몇 초에 봐요.
 * ================================================================ */
function vstage(src, api) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="box"></div></body></html>`,
    { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/" });
  const V = dom.window;
  V.eval(src);
  let VT = 0, vid = 1, vt = [], sched = 0;
  V.performance.now = () => VT;
  V.Date.now = () => VT;
  /* sched는 '지금까지 걸린 타이머 수'예요 — 준비 화면 위에서 시계가 도는지
   * 아닌지를 결과가 아니라 원인 쪽에서 못 박으려고 세요. */
  V.requestAnimationFrame = (cb) => { sched++; const id = vid++; vt.push({ at: VT + 16.667, id, fn: () => cb(VT) }); return id; };
  V.cancelAnimationFrame = (id) => { const i = vt.findIndex((t) => t.id === id); if (i >= 0) vt.splice(i, 1); };
  V.setTimeout = (fn, ms) => { sched++; const id = vid++; vt.push({ at: VT + (ms || 0), id, fn }); return id; };
  V.clearTimeout = (id) => { const i = vt.findIndex((t) => t.id === id); if (i >= 0) vt.splice(i, 1); };

  /* 한 판을 돌려요. watch는 4ms마다 화면을 읽는 '눈'이에요 — fire(선택자, 이벤트)로 눌러요.
   *
   * ctl로 줄 수 있는 것:
   *   noStart   준비 화면에서 손을 놓고 있어요 (누르기 전을 보는 검사용)
   *   start     "click"이면 포인터 이벤트가 없는 환경(마우스·키보드)처럼 click만 보내요
   *   leak      시작 제스처의 꼬리(pointerup·click)가 갈 요소. 기본은 ".tm-btn"이에요
   *   noTail    꼬리를 아예 안 보내요 (누수가 없던 세상 — 비교용 기준선)
   *   stopAt    이 가상 시각에서 멈춰요 (판이 끝나기 전 화면을 그대로 찍어 보려고요)
   *   tap3      { at, sel, via } — 새 탭 한 번을 그 시각에 보내요 */
  function trial(mech, opts, seed, watch, ctl) {
    vt = []; VT = 0; sched = 0;
    V.Math.random = mulberry32(seed);
    const box = V.document.getElementById("box");
    box.innerHTML = "";
    let res = null, endedAt = 0;
    V[api][mech](box, opts, (r) => { res = r; endedAt = VT; });
    const send = (el, type) => {
      if (el) el.dispatchEvent(new V.Event(type, { bubbles: true, cancelable: true }));
    };
    /* 🧭 준비 화면 — 사람이 ▶️ 시작을 누르는 자리예요. 우회하지 않고 실제로 눌러요.
     * 가상 시각 0에서 누르니 그 뒤로 흐르는 시간은 준비 화면이 없던 때와 똑같아요 —
     * 판정 분포도 소요 시간도 이 화면 때문에 어긋나지 않아요.
     *
     * ✋ 실기기가 보내는 순서를 **그대로** 보내요: pointerdown → pointerup → click.
     * pointerdown에서 준비 화면이 지워지고 그 자리에 게임 상자가 그려지니까, 손을
     * 뗄 때 오는 pointerup·click은 **그 지점에 새로 생긴 요소**로 가요. 그래서 꼬리는
     * 기본으로 게임의 첫 버튼(.tm-btn)에게 보내요 — ▶️ 시작도 상자 맨 아래 버튼이라
     * 손가락이 실제로 놓인 자리가 거기예요.
     * pointerdown 하나만 보내던 시절에는 이 누수가 테스트에 아예 안 보였어요. */
    const readyBox = box.querySelector(".mg-ready");
    const preTimers = sched;                  // 누르기 전에 걸린 타이머 (0이어야 해요)
    const readyHTML = readyBox ? readyBox.innerHTML : "";
    if (readyBox && !(ctl && ctl.noStart)) {
      const go = readyBox.querySelector(".mg-go");
      if ((ctl && ctl.start) === "click") {
        send(go, "click");                    // 🖱 포인터 이벤트가 없는 환경이에요
      } else {
        send(go, "pointerdown");              // 여기서 준비 화면이 지워지고 게임이 그려져요
        if (!(ctl && ctl.noTail)) {
          const tail = box.querySelector((ctl && ctl.leak) || ".tm-btn") || go;
          send(tail, "pointerup");
          send(tail, "click");
        }
      }
    }
    const wrap = box.querySelector(".tm-box");
    const fire = (sel, type) => {
      const el = typeof sel === "string" ? wrap.querySelector(sel) : sel;
      send(el, type || "pointerdown");
    };
    /* 새로 짚는 손가락 한 번. via "click"이면 마우스·키보드처럼 click만 와요. */
    if (ctl && ctl.tap3) {
      const c = ctl.tap3;
      vt.push({ at: c.at, id: vid++, fn: () => {
        const el = box.querySelector(c.sel);
        if (!el) return;
        if (c.via === "click") { send(el, "click"); return; }
        send(el, "pointerdown"); send(el, "pointerup"); send(el, "click");
      } });
    }
    if (watch) for (let t = 4; t <= 9000; t += 4) vt.push({ at: t + 0.001, id: vid++, fn: () => { if (res === null) watch(wrap, VT, fire); } });
    let steps = 0;
    const until = (ctl && ctl.stopAt) || 14000;
    while (vt.length && res === null && VT < until && steps++ < 300000) {
      vt.sort((a, b) => a.at - b.at);
      const ev = vt.shift();
      VT = ev.at;
      ev.fn();
    }
    return { res, endedAt, left: box.innerHTML, ready: !!readyBox, readyHTML, preTimers };
  }
  return { V, trial };
}

const PS = vstage(PS_SRC, "PostStage");
const T = PS.V.PostStage._t;
/* 기존 8종도 같은 가상 시계 위에 세워 둬요. 아래 ④에서 도입 전 기준선을 재는 데
 * 쓰고, 바로 다음의 준비 화면 검사에서 "8종에는 이 화면이 없다"를 볼 때도 써요. */
const TM = vstage(TM_SRC, "Timing");

/* ================================================================
 * 🧭 준비 화면 — 눌러야 시작해요
 *
 * 이번 수정의 본체예요. 규칙이 여러 단계고(볼카운트) 버튼이 둘이라(홈 승부)
 * 한 줄짜리 안내로는 첫 판을 통째로 날렸어요.
 * 여기서 못 박는 건 딱 하나예요 — **▶️ 시작을 누르기 전에는 시계가 안 돌아요.**
 * 시간이 아무리 흘러도 판정이 나면 안 되고, 타이머가 한 개라도 걸려 있으면 안 돼요.
 * ================================================================ */
group("🧭 준비 화면");
guard("준비 화면", () => {
  const R = PS.V.PostStage._t;
  const OPTS = {
    count: { label: "t", zonePct: 22, tier: 0, button: "스윙! 🏏" },
    dash: { label: "t", zonePct: 22, tier: 0, goText: "돌진! 🏃", stopText: "멈춰! ✋" },
  };
  const NAMES = [["🧊 볼카운트 승부", "count"], ["🏃 홈 승부", "dash"]];
  // 준비 화면 한 칸에서 버튼 이름에 붙은 설명을 꺼내요
  const keyDesc = (html, name) => {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = html.match(new RegExp(`<b>${esc}</b><span>([^<]+)</span>`));
    return m ? m[1] : "";
  };
  // 처음 보는 사람으로 되돌려요 — 값이 없으면 그냥 0이에요 (마이그레이션이 없어요)
  PS.V.localStorage.removeItem(R.READY_KEY);

  for (const [name, mech] of NAMES) {
    /* ① 준비 화면이 뜨고, 누르기 전에는 아무것도 안 움직여요.
     * watch가 4ms마다 화면을 보며 시계를 9초까지 밀어요. 두 메커닉의 안전망
     * (COUNT.cap 5.8초 · DASH.cap 6.0초)이 전부 그 안에 있으니, 그래도 판정이
     * 안 나면 정말로 아무것도 안 돌고 있는 거예요. */
    let lastVT = 0, moved = 0;
    const idle = PS.trial(mech, OPTS[mech], 1, (wrap, now) => {
      lastVT = now;
      if (wrap.querySelector(".ps-ball") || wrap.querySelector(".ps-runner")) moved++;
    }, { noStart: true });
    check(idle.ready, `${name} — 행동이 시작되기 전에 준비 화면이 먼저 뜬다`);
    check(idle.preTimers === 0,
      `${name} — 누르기 전에는 타이머가 하나도 안 걸린다 (rAF·setTimeout ${idle.preTimers}개)`);
    check(lastVT > Math.max(R.COUNT.cap, R.DASH.cap),
      `${name} — 시계는 실제로 흘렀다 (${(lastVT / 1000).toFixed(1)}초 · 안전망보다 길어요)`);
    check(idle.res === null, `${name} — 그렇게 흘러도 판정이 안 난다 (${idle.res || "판정 없음"})`);
    check(moved === 0, `${name} — 공도 주자도 화면에 안 나타난다 (나타난 프레임 ${moved})`);
    check(/mg-go/.test(idle.readyHTML), `${name} — 준비 화면에 ▶️ 시작 버튼이 있다`);

    // ② 누르면 시작되고 정상적으로 끝나요
    const run = PS.trial(mech, OPTS[mech], 1);
    check(run.res !== null, `${name} — ▶️ 시작을 누르면 실제로 굴러가고 끝난다 (${run.res})`);
    check(run.left.trim() === "", `${name} — 끝나면 준비 화면도 본 상자도 안 남는다`);
  }

  /* ③ 버튼이 둘인 메커닉은 둘 다 설명에 나와요 — 이게 없으면 준비 화면을 띄운
   * 뜻이 없어요. 화면에 뜨는 버튼 이름 그대로 적혀야 해요. */
  PS.V.localStorage.removeItem(R.READY_KEY);
  const dashHTML = PS.trial("dash", OPTS.dash, 1, null, { noStart: true }).readyHTML;
  for (const btn of [OPTS.dash.goText, OPTS.dash.stopText]) {
    const desc = keyDesc(dashHTML, btn);
    check(desc.length >= 10, `🏃 홈 승부 — "${btn}"이 무엇을 하는지 적혀 있다 ("${desc}")`);
  }
  const countHTML = PS.trial("count", OPTS.count, 1, null, { noStart: true }).readyHTML;
  check(keyDesc(countHTML, OPTS.count.button).length >= 10 && /누르지 않기/.test(countHTML),
    `🧊 볼카운트 승부 — 누르는 것과 참는 것이 둘 다 적혀 있다 ("${keyDesc(countHTML, "누르지 않기")}")`);

  /* ④ 여러 번 본 뒤에는 설명이 짧아져요. 줄어드는 건 설명의 길이지 시작
   * 버튼이 아니에요 — 준비 화면 자체는 계속 떠야 해요. */
  PS.V.localStorage.removeItem(R.READY_KEY);
  const shots = [];
  for (let i = 0; i < R.FULL_SHOWS + 3; i++) {
    shots.push(PS.trial("count", OPTS.count, 1, null, { noStart: true }));
  }
  const full = shots.slice(0, R.FULL_SHOWS), brief = shots.slice(R.FULL_SHOWS);
  check(shots.every((s) => s.ready), `${shots.length}번을 봐도 준비 화면 자체는 계속 뜬다`);
  check(full.every((s) => /mg-ready-lines/.test(s.readyHTML)),
    `처음 ${R.FULL_SHOWS}번은 설명을 다 펴서 보여준다`);
  check(brief.every((s) => /mg-ready-short/.test(s.readyHTML) && !/mg-ready-lines/.test(s.readyHTML)),
    `${R.FULL_SHOWS + 1}번째부터는 한 줄로 줄어든다`);
  check(brief.every((s) => s.readyHTML.length < full[0].readyHTML.length),
    `줄어든 쪽이 실제로 더 짧다 (${full[0].readyHTML.length}자 → ${brief[0].readyHTML.length}자)`);
  check(brief.every((s) => /mg-go/.test(s.readyHTML)),
    "짧아져도 ▶️ 시작 버튼은 그대로다 — 시작 시점은 계속 사람이 잡아요");
  /* 위 검사는 문턱을 코드에서 읽어 와요(테스트가 숫자를 베껴 적지 않게요). 그래서
   * 문턱 자체가 터무니없이 커지면 "줄어든다"가 참인 채로 기능이 죽어요 —
   * 가을야구 한 번에 미니게임이 스무 판 넘게 나오니, 여기는 한 손 안이어야 해요. */
  check(R.FULL_SHOWS >= 1 && R.FULL_SHOWS <= 5,
    `전문을 펴 보이는 횟수가 한 손 안이다 (${R.FULL_SHOWS}번)`);
  check(Object.keys(R.readSeen()).every((k) => ["count", "dash"].includes(k)),
    `본 횟수는 새 열쇠(${R.READY_KEY}) 안에만 쌓인다 (${JSON.stringify(R.readSeen())})`);

  /* ⑤ 기존 8종에는 준비 화면이 없어요 (회귀). 한 줄로 충분한 데다, 매 타석마다
   * 한 번 더 눌러야 하면 경기가 늘어져요. */
  const OLD8 = [
    ["play", { zonePct: 22, label: "t" }],
    ["hold", { zonePct: 22, label: "t" }],
    ["drop", { zonePct: 22, label: "t" }],
    ["sequence", { icons: ["⚾", "🧢", "🧤", "🏏"], showMs: 900 }],
    ["reaction", { perfectMs: 400, goodMs: 800 }],
    ["target", { count: 3, lifeMs: 900 }],
    ["odd", { rounds: 2, sets: [["⚾", "🥎"], ["🧢", "⛑️"]] }],
    ["duel", { choices: ["몸쪽", "가운데", "바깥쪽"], hintChance: 0.5 }],
  ];
  const got = OLD8.filter(([m, o]) => TM.trial(m, o, 3).ready).map(([m]) => m);
  check(got.length === 0, `기존 8종에는 준비 화면이 안 뜬다 (생긴 것: ${got.join(" · ") || "없음"})`);
  check(!/mg-ready/.test(TM_SRC), "timing.js에 준비 화면 코드가 한 줄도 안 들어갔다");
});

/* ================================================================
 * 👁️ 꺾이는 순간 — 화면에 보여야 배울 수 있어요
 *
 * 사용자 제보: "스윙하는 거 타이밍을 잘 모르겠네".
 *
 * 원인이 둘이었어요. ① land()가 존 안이냐만 봐서 타이밍이 결과에 아예 안
 * 들어갔고(그건 ④에서 재요), ② 꺾이는 순간이 화면 어디에도 안 적혀 있었어요.
 * ②를 안 고치면 ①만 고쳐 봐야 "왜 졌는지 모르겠다"가 될 뿐이에요.
 *
 * 여기서 못 박는 건 넷이에요.
 *   ① 눈금이 **판정이 쓰는 그 값**(countBreak)과 같은 자리에 선다
 *   ② 넘기 전과 넘은 뒤의 화면이 실제로 다르다 (.ps-broke · 안내 문구)
 *   ③ 능력치가 높으면 눈금이 왼쪽으로 옮겨 간다 (휘두를 구간이 넓어져요)
 *   ④ 일찍 낸 방망이는 화면에 흔적이 남는다 (.ps-rush · 이유를 적은 한 줄)
 * ================================================================ */
group("👁️ 꺾이는 순간이 화면에 보이는가");
guard("꺾이는 신호", () => {
  const OPTS = { label: "t", zonePct: 26, tier: 0, button: "스윙! 🏏" };
  const M = T.COUNT_MSG;
  const FLIGHT = T.COUNT.flight;
  const brk = T.countBreak(OPTS.zonePct, OPTS.tier);
  /* 판이 멈춘 자리에서 화면을 그대로 들여다봐요 — trial은 상자를 지우지 않고
   * 멈추니까(다음 판이 시작될 때 지워요) 여기서 DOM을 직접 물어볼 수 있어요. */
  const q = (sel) => PS.V.document.querySelector(sel);

  // ① 눈금이 판정과 같은 자리에 선다
  PS.trial("count", OPTS, 11, null, { stopAt: brk * FLIGHT - 80 });
  const markAt = pctOf(q(".ps-track-brk").style.left);
  check(Math.abs(markAt - brk * 100) < 0.2,
    `눈금이 판정이 쓰는 꺾이는 지점에 정확히 선다 (화면 ${markAt}% · 판정 ${(brk * 100).toFixed(1)}%)`);

  // ② 넘기 전 — 아직 아무것도 안 살아났어요
  const preWrap = q(".tm-box"), preCue = q(".ps-track-txt").textContent;
  const preFill = pctOf(q(".ps-track-fill").style.width);
  check(!preWrap.classList.contains("ps-broke"), "꺾이기 전에는 화면이 '아직'인 채로 있다 (.ps-broke 없음)");
  check(preCue === M.cueWait, `꺾이기 전 안내가 기다리라고 말한다 ("${preCue}")`);
  check(preFill < markAt, `막대가 아직 눈금에 못 닿았다 (${preFill}% < ${markAt}%)`);

  // ② 넘은 뒤 — 막대·안내가 한꺼번에 바뀌어요
  PS.trial("count", OPTS, 11, null, { stopAt: brk * FLIGHT + 80 });
  const postWrap = q(".tm-box"), postCue = q(".ps-track-txt").textContent;
  const postFill = pctOf(q(".ps-track-fill").style.width);
  check(postWrap.classList.contains("ps-broke"), "꺾이는 순간 화면이 살아난다 (.ps-broke)");
  check(postCue === M.cueRead && postCue !== preCue, `꺾인 뒤 안내가 지금이라고 말한다 ("${postCue}")`);
  check(postFill > markAt, `막대가 눈금을 넘어섰다 (${postFill}% > ${markAt}%)`);

  // ③ 능력치가 높으면 눈금이 왼쪽으로 — 휘두를 수 있는 구간이 넓어져요
  const at = (zone) => {
    PS.trial("count", { label: "t", zonePct: zone, tier: 0 }, 11, null, { stopAt: 40 });
    return pctOf(q(".ps-track-brk").style.left);
  };
  const lowMark = at(10), hiMark = at(40);
  check(hiMark < lowMark - 5,
    `능력치가 높으면 눈금이 왼쪽으로 옮겨 간다 (존10 ${lowMark}% → 존40 ${hiMark}%)`);

  /* ④ 일찍 낸 방망이는 흔적을 남겨요. 첫 공 도중(꺾이기 한참 전)에 새로 짚은
   * 손가락 한 번을 보내고, **그 자리에서** 화면을 봐요.
   * stopAt을 스윙 시각에 딱 맞춰요 — 스윙하면 이 공의 프레임이 끊겨서, 시계에
   * 남은 다음 일이 곧 '다음 공'이에요. 조금이라도 더 굴리면 그 공이 시작되면서
   * 흔적을 지워 버려요(새 공마다 게이지를 처음으로 되돌리니까요). */
  const early = Math.round(brk * FLIGHT * 0.4);
  PS.trial("count", OPTS, 11, null, { tap3: { at: early, sel: ".ps-tap" }, stopAt: early });
  const rushWrap = q(".tm-box"), rushMark = q(".ps-mark").textContent;
  check(rushWrap.classList.contains("ps-rush"),
    `일찍 휘두르면 화면에 '빨랐다'가 남는다 (.ps-rush · ${early}ms에 스윙)`);
  check(!rushWrap.classList.contains("ps-broke"), "그때는 아직 꺾이기 전이었다 (.ps-broke 없음)");
  check(rushMark === M.foul || rushMark === M.rush,
    `무엇이 틀렸는지 한 줄로 말해 준다 ("${rushMark}")`);

  /* ⑤ 준비 화면도 같은 말을 해요. 화면에는 눈금이 있는데 설명에 없으면,
   * 처음 보는 사람은 그 선이 무엇인지 끝까지 몰라요. */
  PS.V.localStorage.removeItem(T.READY_KEY);
  const readyHTML = PS.trial("count", OPTS, 11, null, { noStart: true }).readyHTML;
  check(/눈금/.test(readyHTML), "준비 화면이 눈금을 설명한다 (꺾인 뒤에 판단하라는 말)");
  check(/눈금/.test(M.readyShort) && /눈금/.test(M.tip),
    "짧아진 안내와 화면 아래 한 줄에도 그 말이 남는다");
  check(/눈금/.test(GAME_SRC),
    "투수 쪽 문구(game.js)도 같이 갈아끼웠다 — 한쪽만 타자 말로 남으면 안 돼요");
});

/* ================================================================
 * ✋ 탭 누수 — 한 번의 탭이 두 번 먹히면 안 돼요
 *
 * 사용자 제보: "설명 보고 눌렀는데 게임이 그냥 바로 끝나버리는데".
 *
 * 실기기 한 번의 탭은 이벤트를 **셋** 보내요 — pointerdown → pointerup → click.
 * ▶️ 시작은 pointerdown에서 처리해요(누르자마자 화면이 바뀌어야 하니까요). 그
 * 순간 준비 화면이 지워지고 그 자리에 게임 버튼이 그려져요. 그래서 손을 뗄 때 오는
 * click은 **방금 생긴 게임 버튼**에게 가요. 그 버튼에게는 난생처음 오는 입력이라
 * TAP_ECHO 방어에 안 걸려요 — TAP_ECHO는 같은 요소 안의 중복만 막거든요.
 * 결과가 곧 제보예요: 홈 승부는 손도 못 대고 협살/귀루로 끝나고, 볼카운트는
 * 초구를 저절로 휘둘러요.
 *
 * 이 검사가 없어서 버그가 나갔어요. 예전 검사는 pointerdown **하나만** 보냈고,
 * 그래서 실기기의 순서를 통째로 안 재현했어요. 여기서 못 박는 건 셋이에요.
 *   ① 시작 제스처(셋 다)를 보내도 게임이 즉시 끝나지 않고 화면이 한 칸도 안 움직인다
 *   ② 그 뒤 **새로 짚은 손가락**은 정상적으로 먹힌다
 *   ③ 마우스 경로(click만 오는 환경)도 똑같다
 * 꼬리가 어느 요소로 새는지는 기기·브라우저마다 달라서, onTap이 걸린 자리를
 * 전부 돌아 봐요.
 * ================================================================ */
group("✋ 탭 누수 (한 번 누른 게 두 번 먹히면 안 돼요)");
guard("탭 누수", () => {
  const OPTS = {
    count: { label: "t", zonePct: 22, tier: 0, button: "스윙! 🏏" },
    dash: { label: "t", zonePct: 22, tier: 0, goText: "돌진! 🏃", stopText: "멈춰! ✋" },
  };
  /* 시작 제스처의 꼬리가 떨어질 만한 자리 — onTap이 걸린 요소를 전부 적어요.
   * post-stage.js에 onTap이 새로 붙으면 여기도 같이 늘려야 해요. */
  const SPOTS = {
    count: [[".tm-btn", "스윙 버튼"], [".ps-plate", "홈플레이트(넓은 판)"]],
    dash: [[".ps-go", "돌진 버튼"], [".ps-stop", "멈춰 버튼"]],
  };
  const NAME = { count: "🧊 볼카운트", dash: "🏃 홈 승부" };
  const SNAP = 40;    // 시작 직후의 화면을 찍는 시각(ms)
  const LATER = 240;  // 새 손가락을 짚는 시각(ms)
  const live = (h) => /tm-box/.test(h) && !/tm-done-/.test(h);

  for (const mech of ["count", "dash"]) {
    /* 기준선 — 꼬리가 아예 안 샜을 때의 화면이에요. 같은 seed·같은 시각이라
     * 타이머 일정이 완전히 같아서, 화면도 한 글자까지 같아야 정상이에요. */
    const base = PS.trial(mech, OPTS[mech], 7, null, { noTail: true, stopAt: SNAP });
    check(base.res === null && live(base.left),
      `${NAME[mech]} — 기준선: 시작 ${SNAP}ms 뒤에도 판이 살아 있다 (${base.res || "판정 없음"})`);

    for (const [sel, spot] of SPOTS[mech]) {
      // ① 실기기 순서 그대로 — pointerdown → pointerup → click, 꼬리는 이 자리로
      const leak = PS.trial(mech, OPTS[mech], 7, null, { leak: sel, stopAt: SNAP });
      check(leak.res === null,
        `${NAME[mech]} — 시작 탭이 ${spot}으로 새도 판정이 즉시 안 난다 (${leak.res || "판정 없음"})`);
      check(live(leak.left), `${NAME[mech]} — 그러고도 화면이 살아 있다 (${spot})`);
      check(leak.left === base.left,
        `${NAME[mech]} — 화면이 한 칸도 안 움직였다 (${spot} · 꼬리가 안 샌 판과 같은 화면)`);

      // ② 그 뒤 새로 짚은 손가락은 먹혀요 — 안 그러면 게임이 죽은 거예요
      const after = PS.trial(mech, OPTS[mech], 7, null,
        { leak: sel, stopAt: LATER + 40, tap3: { at: LATER, sel } });
      const idle = PS.trial(mech, OPTS[mech], 7, null,
        { leak: sel, stopAt: LATER + 40 });
      check(after.left !== idle.left || after.res !== idle.res,
        `${NAME[mech]} — 새 탭(pointerdown→pointerup→click)은 ${spot}에서 그대로 먹힌다`);

      // ③ 마우스·키보드 경로 — click만 와도 시작하고, 그 뒤 click도 먹혀요
      const mouse = PS.trial(mech, OPTS[mech], 7, null, { start: "click", stopAt: SNAP });
      check(mouse.res === null && live(mouse.left) && mouse.left === base.left,
        `${NAME[mech]} — 마우스(click만)로 시작해도 즉시 아무 일도 안 난다 (${spot})`);
      const mouseTap = PS.trial(mech, OPTS[mech], 7, null,
        { start: "click", stopAt: LATER + 40, tap3: { at: LATER, sel, via: "click" } });
      const mouseIdle = PS.trial(mech, OPTS[mech], 7, null, { start: "click", stopAt: LATER + 40 });
      check(mouseTap.left !== mouseIdle.left || mouseTap.res !== mouseIdle.res,
        `${NAME[mech]} — 마우스 click 한 번도 ${spot}에서 그대로 먹힌다`);
    }

    // ④ 누수가 막혀도 판은 끝까지 굴러가요 (문이 닫힌 채로 남으면 안 돼요)
    const full = PS.trial(mech, OPTS[mech], 7);
    check(full.res !== null && full.left.trim() === "",
      `${NAME[mech]} — 실기기 순서로 시작해도 판은 정상적으로 끝난다 (${full.res})`);
  }
});

/* 🧊 count 사람 모델 — lag만큼 늦은 화면 두 장으로 도착점을 외삽해요.
 * 공 크기(font-size)가 얼마나 왔는지를 알려줘요 (사람도 크기로 거리를 봐요).
 *
 * ⏱️ at은 **방망이를 내는 시각**(비행 비율)이에요. 기본 0.90은 "마지막까지 보고
 * 정하는 사람"이라 늘 꺾인 뒤예요. 손이 느린 사람은 이 값을 뒤로 미뤄서 재요. */
function countAs(zone, tier, seed, lag, sigma, at) {
  const when = at == null ? 0.90 : at;
  let hist = [], lastT = 9, swung = false;
  return PS.trial("count", { label: "t", zonePct: zone, tier }, seed, (wrap, now, fire) => {
    const ball = wrap.querySelector(".ps-ball");
    if (!ball) return;
    const t = (remOf(ball.style.fontSize) - 0.7) / 1.15;
    if (t < lastT - 0.02) { hist = []; swung = false; }        // 새 공이에요
    lastT = t;
    hist.push({ now, t, x: pctOf(ball.style.left), y: pctOf(ball.style.top) });
    if (swung || t < when) return;                              // 여기서 손이 나가요
    let a = hist[0], b = hist[0];
    for (const h of hist) { if (h.now <= now - lag) b = h; }
    for (const h of hist) { if (h.now <= now - lag - 44) a = h; }
    const dt = Math.max(1e-6, b.t - a.t);
    const px = b.x + (b.x - a.x) / dt * (1 - b.t) + gauss(sigma);
    const py = b.y + (b.y - a.y) / dt * (1 - b.t) + gauss(sigma * 1.5);
    const Z = T.COUNT;
    swung = true;
    if (px > Z.zx[0] && px < Z.zx[1] && py > Z.zy[0] && py < Z.zy[1]) fire(".ps-tap");
  });
}

/* ⏱️ 타이밍만 다른 사람 — 판독은 아예 안 하고 정해진 시각에 그냥 휘둘러요.
 *
 * 꺾이기 전에는 공이 전부 한가운데로 오는 것처럼 보여요. 그래서 그때 내는
 * 방망이는 판독이 아니라 **그냥 휘두르는 것**이에요 — 그게 '눈감고 치기'의
 * 정의라 이 모델이 곧 그 사람이에요. at만 바꿔서 같은 사람을 꺾기 전과 꺾은 뒤에
 * 세워 두면, 판정 차이가 오롯이 **타이밍 때문**이라고 말할 수 있어요. */
function countBlindAs(zone, tier, seed, at) {
  let lastT = 9, swung = false;
  return PS.trial("count", { label: "t", zonePct: zone, tier }, seed, (wrap, now, fire) => {
    const ball = wrap.querySelector(".ps-ball");
    if (!ball) return;
    const t = (remOf(ball.style.fontSize) - 0.7) / 1.15;
    if (t < lastT - 0.02) swung = false;                        // 새 공이에요
    lastT = t;
    if (swung || t < at) return;
    swung = true;
    fire(".ps-tap");
  });
}

/* 🏃 dash 사람 모델 — 송구가 드러나면 도착 시각을 견줘요. margin은 배짱이에요. */
function dashAs(zone, tier, seed, lag, margin, sigma) {
  let hist = [], picked = false;
  return PS.trial("dash", { label: "t", zonePct: zone, tier }, seed, (wrap, now, fire) => {
    if (picked) return;
    const run = wrap.querySelector(".ps-runner"), thr = wrap.querySelector(".ps-throw");
    if (!run || !thr) return;
    const seen = thr.textContent === "⚾";
    hist.push({ now, p: pctOf(run.style.left), q: seen ? pctOf(thr.style.left) : null });
    const backAt = pctOf(wrap.querySelector(".ps-back").style.left);
    let b = hist[0];
    for (const h of hist) { if (h.now <= now - lag) b = h; }
    if (b.q == null) {
      // 아직 송구가 안 보여요. 한계선을 넘기 직전이면 도박을 해야 해요.
      if (b.p > backAt - 1.5) { picked = true; fire(".ps-go"); }
      return;
    }
    let a = null, ar = null;
    for (const h of hist) { if (h.q != null && h.now <= b.now - 120) a = h; }
    for (const h of hist) { if (h.now <= b.now - 160) ar = h; }
    if (!a || !ar) return;                                      // 아직 속도를 못 재요
    const vq = (b.q - a.q) / (b.now - a.now);
    const vp = (b.p - ar.p) / (b.now - ar.now);
    if (vq <= 0 || vp <= 0) return;
    const tThrow = b.now + (100 - b.q) / vq;
    const tHome = now + (100 - b.p) / (vp / T.DASH.hesit) + gauss(sigma);
    picked = true;
    if (tHome < tThrow - margin) fire(".ps-go");
    else if (b.p <= backAt) fire(".ps-stop");
    else fire(".ps-go");                                        // 물러설 수 없으면 갈 수밖에 없어요
  });
}

const dist = (n, fn) => {
  const d = { perfect: 0, good: 0, miss: 0 };
  let dur = 0, worst = 0;
  for (let i = 0; i < n; i++) {
    const r = fn(i + 1);
    d[r.res == null ? "miss" : r.res] += 1;
    dur += r.endedAt;
    worst = Math.max(worst, r.endedAt);
  }
  return { ...d, n, dur: dur / n, worst, p: d.perfect / n, g: d.good / n, m: d.miss / n };
};
/* 게임이 실제로 쓰는 배수예요 — game.js의 beginProMoment가 hitP에 곱하는 값.
 * 판정 분포를 하나의 눈금으로 견주려고 여기서만 써요. */
const MULT = (() => {
  const m = GAME_SRC.match(/const mult = res === "perfect" \? ([\d.]+) : res === "good" \? ([\d.]+) : ([\d.]+);/);
  if (!m) throw new Error("game.js에서 판정 배수를 못 찾았어요");
  return { perfect: +m[1], good: +m[2], miss: +m[3] };
})();
const mult = (d) => d.p * MULT.perfect + d.g * MULT.good + d.m * MULT.miss;
const pct = (v) => `${(v * 100).toFixed(0)}%`;

/* ================================================================
 * ③ 도달성 — 진짜 엔진·진짜 시간으로
 * ================================================================ */
group("③ 도달성 (메커닉 자체)");
guard("도달성", () => {
  const SK = { lag: 160, sigma: 2.0, margin: 60, dsigma: 90 };
  for (const [name, fn] of [
    ["🧊 볼카운트 승부", (s) => countAs(38, 0, s, SK.lag, SK.sigma)],
    ["🏃 홈 승부", (s) => dashAs(38, 0, s, SK.lag, SK.margin, SK.dsigma)],
  ]) {
    const d = dist(200, fn);
    check(d.perfect > 0, `${name} — 잘하면 perfect에 실제로 닿는다 (${pct(d.p)})`);
    check(d.good > 0, `${name} — 성공(good)도 실제로 나온다 (${pct(d.g)})`);
    console.log(`   ${name} 잘하는 사람 | P ${pct(d.p)} · G ${pct(d.g)} · M ${pct(d.m)} · 평균 ${(d.dur / 1000).toFixed(2)}초 · 최장 ${(d.worst / 1000).toFixed(2)}초`);
    // 못하면 실제로 벌을 받아요 — miss가 안 나오면 판정이 장식이에요
    const poor = dist(120, (s) => (name[0] === "🧊"
      ? countAs(12, 2, s, 320, 9.0)
      : dashAs(12, 2, s, 340, -140, 420)));
    check(poor.miss > 0, `${name} — 못하면 miss가 실제로 난다 (${pct(poor.m)})`);
  }
  // 아무것도 안 눌러도 끝나요 (안 그러면 손을 놓은 순간 게임이 멎어요)
  for (const [name, mech] of [["🧊 볼카운트 승부", "count"], ["🏃 홈 승부", "dash"]]) {
    let stuck = 0, worst = 0, boxLeft = 0;
    for (let i = 0; i < 60; i++) {
      const r = PS.trial(mech, { label: "t", zonePct: 22, tier: 2 }, 5000 + i);
      if (r.res == null) stuck++;
      worst = Math.max(worst, r.endedAt);
      if (r.left.trim() !== "") boxLeft++;
    }
    check(stuck === 0, `${name} — 아무것도 안 눌러도 끝난다 (막힌 판 ${stuck})`);
    check(boxLeft === 0, `${name} — 끝나면 상자를 지우고 나간다 (남은 판 ${boxLeft})`);
    console.log(`   ${name} 손 놓기 | 최장 ${(worst / 1000).toFixed(2)}초`);
  }
  // 한 판이 3~5초예요. 가을야구 한 시리즈에 미니게임이 여러 번이라 길면 그 자체가 버그예요.
  const spans = [];
  for (const mech of ["count", "dash"]) {
    for (const tier of [0, 1, 2]) {
      for (const zone of [12, 26, 40]) {
        const d = dist(60, (s) => (mech === "count"
          ? countAs(zone, tier, s, 200, 3.0)
          : dashAs(zone, tier, s, 200, 50, 150)));
        spans.push({ mech, tier, zone, dur: d.dur, worst: d.worst });
      }
    }
  }
  const slowMean = spans.filter((x) => x.dur > 5000);
  const slowWorst = spans.filter((x) => x.worst > 6500);
  check(slowMean.length === 0,
    `한 판 평균이 5초를 안 넘는다 (가장 긴 칸 ${(Math.max(...spans.map((x) => x.dur)) / 1000).toFixed(2)}초)`);
  check(slowWorst.length === 0,
    `가장 오래 끈 판도 6.5초 안이다 (${(Math.max(...spans.map((x) => x.worst)) / 1000).toFixed(2)}초)`);
});

/* ================================================================
 * ④ 난이도 — 능력치·시리즈 깊이가 실제로 들어가는가
 *   그리고 기존 8종을 같은 사람 모델로 같이 재요 (도입 전 기준선)
 * ================================================================ */
group("④ 난이도");

const ZONES = [26, 32, 38];
/* rnd는 **이 사람 몫의 난수 씨앗**이에요. 사람 모델은 gauss(공용 plyRnd)를 쓰는데,
 * 한 줄기를 셋이 이어 쓰면 앞사람이 몇 번 뽑았느냐에 따라 뒷사람 숫자가 통째로
 * 흔들려요. 실제로 여기 '느린손'을 새로 세웠더니 그 뒤에 재는 **기존 8종 기준선이
 * 같이 움직여서**, 아무것도 안 바뀐 칸의 '도입 전 대비 하락'이 10.2%p에서 15.7%p로
 * 보였어요 — 난이도가 아니라 표본이 움직인 거예요. 사람마다 씨앗을 따로 주면
 * 사람을 더 세워도 남의 숫자가 안 흔들려서, 실행끼리 나란히 놓고 볼 수 있어요. */
const SKILL = { name: "능숙", rnd: 20260731, lag: 160, sigma: 2.0, margin: 60, dsigma: 90, mem: 0.94, find: 900, tsig: 55 };
const AVG = { name: "보통", rnd: 20260732, lag: 240, sigma: 4.5, margin: 40, dsigma: 220, mem: 0.82, find: 1500, tsig: 110 };
/* 🐢 손이 느린 사람 — **꺾이는 걸 보고 나서** 비로소 반응해요(react ms).
 * 타이밍이 판정에 들어간 뒤로 "반응이 느리면 계속 삼진 아니냐"가 진짜 물음이
 * 됐어요. 그 물음을 답으로 바꾸려고 세운 세 번째 사람이에요 — 앞의 둘과 달리
 * 난이도 단조성 검사에는 안 넣고(표본이 더 흔들려요) 값만 재서 보고해요. */
const SLOW = { name: "느린손", rnd: 20260733, lag: 300, sigma: 5.5, margin: 30, dsigma: 300, mem: 0.74, find: 1900, tsig: 150, react: 380 };
const PROFILES = [SKILL, AVG, SLOW];
const DN = Number(process.env.POST_N || 90);

/* 방망이가 나가는 시각(비행 비율). react가 없으면 "마지막까지 보고 정하는 사람"이에요.
 * react가 있으면 꺾이는 지점 + 반응 시간이라, 그게 비행보다 길면 손이 아예 못 나가요
 * (= 다 지켜보게 돼요). 숫자를 여기 옮겨 적지 않아요 — 꺾이는 지점은 소스에서 읽어요. */
const swingAt = (sk, zone, tier) =>
  (sk.react == null ? undefined : T.countBreak(zone, tier) + sk.react / T.COUNT.flight);

// [skill][tier][zone] → 두 메커닉을 합친 판정 분포
const NEWTAB = {};
guard("새 2종 난이도", () => {
  for (const sk of PROFILES) {
    plyRnd = mulberry32(sk.rnd);        // 이 사람 몫의 줄기 — 옆 사람에게 안 새요
    NEWTAB[sk.name] = {};
    for (const tier of [0, 1, 2]) {
      NEWTAB[sk.name][tier] = {};
      for (const zone of ZONES) {
        const a = dist(DN, (s) => countAs(zone, tier, s, sk.lag, sk.sigma, swingAt(sk, zone, tier)));
        const b = dist(DN, (s) => dashAs(zone, tier, s, sk.lag, sk.margin, sk.dsigma));
        NEWTAB[sk.name][tier][zone] = {
          p: (a.p + b.p) / 2, g: (a.g + b.g) / 2, m: (a.m + b.m) / 2,
          count: a, dash: b,
        };
      }
    }
  }
  for (const sk of PROFILES) {
    for (const tier of [0, 1, 2]) {
      console.log(`   ${sk.name} tier${tier} | ${ZONES.map((z) => {
        const d = NEWTAB[sk.name][tier][z];
        return `존${z} P${pct(d.p)} M${pct(d.m)} 배수 ${mult(d).toFixed(3)}`;
      }).join(" · ")}`);
    }
  }
  /* 🐢 손이 느려도 삼진만 당하지는 않아요. 이 줄이 이번 변경의 안전선이에요 —
   * 타이밍을 판정에 넣으면서 가장 먼저 다치는 사람이 여기니까요. */
  {
    const slow = [0, 1, 2].map((tier) => ZONES.map((z) => NEWTAB[SLOW.name][tier][z].count))
      .reduce((a, b) => a.concat(b), []);
    const worstM = Math.max(...slow.map((d) => d.m));
    const meanM = slow.reduce((a, d) => a + d.m, 0) / slow.length;
    console.log(`   🐢 손이 느린 사람의 🧊 볼카운트 | 평균 실패 ${pct(meanM)} · 가장 나쁜 칸 ${pct(worstM)}`);
    check(worstM <= 0.5,
      `🐢 손이 느려도 어느 칸에서든 절반 넘게 삼진당하지는 않는다 (가장 나쁜 칸 ${pct(worstM)})`);
  }
  /* 능력치를 올리면 나아져요. 양 끝만 못 박아요 — 표본이 유한해서(칸마다
   * POST_N판) 가운데 칸은 ±0.03쯤 흔들려요. 한 계단씩 못 박으면 난이도가
   * 아니라 난수를 재게 돼요.
   *
   * 메커닉 하나씩은 **완벽(perfect)이 나오는 비율**로 봐요. 🏃 홈 승부는 잘하면
   * 멈춰서 성공(good)을 챙길 수 있어서, 능력치가 낮아도 배수가 1.00 근처에
   * 머물러요 — 능력치가 실제로 사는 자리는 "정말로 홈을 밟느냐"거든요.
   * 둘을 합친 배수는 아래에서 따로 못 박아요. */
  const bad = [];
  const lowZ = ZONES[0], hiZ = ZONES[ZONES.length - 1];
  for (const sk of [SKILL, AVG]) {
    for (const tier of [0, 1, 2]) {
      for (const key of ["count", "dash"]) {
        const a = NEWTAB[sk.name][tier][lowZ][key].p, b = NEWTAB[sk.name][tier][hiZ][key].p;
        if (!(b > a)) bad.push(`${sk.name}/tier${tier}/${key} ${pct(a)}→${pct(b)}`);
      }
      const a = mult(NEWTAB[sk.name][tier][lowZ]), b = mult(NEWTAB[sk.name][tier][hiZ]);
      if (!(b > a)) bad.push(`${sk.name}/tier${tier}/합침 ${a.toFixed(3)}→${b.toFixed(3)}`);
    }
  }
  check(bad.length === 0, `능력치를 올리면 두 메커닉 다 성적이 오른다 (거꾸로 간 칸 ${bad.join(" · ") || "없음"})`);
  /* 능력치가 실제로 뜻 있게 갈라야 해요 (모든 칸이 똑같으면 육성이 안 닿아요).
   * 칸 하나는 표본이 흔들리니 여섯 칸(손끝 2 × 시리즈 깊이 3)의 평균으로 봐요. */
  const gaps = [];
  for (const sk of [SKILL, AVG]) {
    for (const tier of [0, 1, 2]) {
      gaps.push(mult(NEWTAB[sk.name][tier][hiZ]) - mult(NEWTAB[sk.name][tier][lowZ]));
    }
  }
  const gapMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  check(gapMean >= 0.03 && Math.min(...gaps) > 0,
    `능력치 26→38이 배수를 평균 0.03 넘게 벌린다 (평균 ${gapMean.toFixed(3)} · 가장 좁은 칸 ${Math.min(...gaps).toFixed(3)})`);
  NEWTAB.__gap = gapMean;
  // 시리즈가 깊어질수록 어려워져요 (여기도 양 끝만 봐요)
  const up = [];
  for (const sk of [SKILL, AVG]) {
    for (const zone of ZONES) {
      const a = mult(NEWTAB[sk.name][0][zone]), b = mult(NEWTAB[sk.name][2][zone]);
      if (!(b < a)) up.push(`${sk.name}/존${zone} ${a.toFixed(3)}→${b.toFixed(3)}`);
    }
  }
  check(up.length === 0, `마지막 시리즈가 와일드카드보다 어렵다 (거꾸로 간 칸 ${up.join(" · ") || "없음"})`);
  // 대충 하면 벌을 받아요 — 이게 없으면 메커닉이 장식이에요
  const mash = dist(150, (s) => PS.trial("count", { label: "t", zonePct: 38, tier: 0 }, s, (w, n, fire) => fire(".ps-tap")));
  const idle = dist(150, (s) => PS.trial("count", { label: "t", zonePct: 38, tier: 0 }, s));
  const best = NEWTAB[SKILL.name][0][38].count;
  check(mash.perfect === 0,
    `🧊 초구부터 무작정 휘두르면 perfect가 아예 안 나온다 (${mash.perfect}판) — 볼을 골라야 완벽이에요`);
  check(mult(mash) < mult(best) - 0.05 && mult(idle) < mult(best) - 0.05,
    `🧊 무작정 스윙(${mult(mash).toFixed(3)})·전부 참기(${mult(idle).toFixed(3)})가 잘 보는 사람(${mult(best).toFixed(3)})보다 확실히 나쁘다`);
  const rush = dist(150, (s) => PS.trial("dash", { label: "t", zonePct: 38, tier: 0 }, s, (w, n, fire) => fire(".ps-go")));
  const froze = dist(150, (s) => PS.trial("dash", { label: "t", zonePct: 38, tier: 0 }, s));
  check(mult(froze) < mult(rush),
    `🏃 아무것도 안 고르는 게 무작정 돌진보다 나쁘다 (${mult(froze).toFixed(3)} < ${mult(rush).toFixed(3)}) — 고르지 않는 것이 최악이에요`);
  console.log(`   🧊 무작정 스윙 배수 ${mult(mash).toFixed(3)} · 전부 참기 ${mult(idle).toFixed(3)} · 잘 보는 사람 ${mult(best).toFixed(3)}`);

  /* ⏱️ **타이밍이 정말로 결과에 들어가는가** — 이번 변경의 본체예요.
   *
   * 같은 사람(판독 없이 그냥 휘두르는 사람)을 시각만 바꿔 두 번 세워요.
   * 전략도 화면도 난수도 같고 **방망이가 나가는 순간만** 달라요. 그런데도 성적이
   * 갈리면, 갈린 몫은 오롯이 타이밍이에요. 예전에는 이 둘이 완전히 같았어요 —
   * land()가 존 안이냐만 봤거든요. 그래서 화면은 타이밍 게임인데 손은 아무 데나
   * 눌러도 됐고, 그게 "스윙 타이밍을 모르겠다"의 정체였어요. */
  {
    const cases = [[26, 0], [32, 1], [38, 2]];
    const lines = [], gaps2 = [];
    for (const [zone, tier] of cases) {
      const brk = T.countBreak(zone, tier);
      const early = dist(150, (s) => countBlindAs(zone, tier, s, brk * 0.6));   // 꺾이기 전
      const late = dist(150, (s) => countBlindAs(zone, tier, s, 0.95));         // 꺾인 뒤
      gaps2.push(mult(late) - mult(early));
      lines.push(`존${zone}/tier${tier} 꺾기 전 ${mult(early).toFixed(3)}(P${pct(early.p)}) → 꺾은 뒤 ${mult(late).toFixed(3)}(P${pct(late.p)})`);
      check(early.perfect === 0,
        `🧊 꺾이기 전에 낸 방망이는 완벽이 아예 안 나온다 (존${zone}/tier${tier} · ${early.perfect}판)`);
    }
    console.log(`   ⏱️ 같은 사람, 시각만 다르게 | ${lines.join(" · ")}`);
    check(Math.min(...gaps2) > 0.10,
      `🧊 꺾인 뒤에 휘두른 쪽이 확실히 낫다 — 타이밍이 결과에 들어간다 (가장 좁은 칸 ${Math.min(...gaps2).toFixed(3)})`);
  }
  console.log(`   🏃 무작정 돌진 배수 ${mult(rush).toFixed(3)} · 손 놓기 ${mult(froze).toFixed(3)}`);
});

/* ---------- 도입 전 기준선: timing.js 8종을 같은 사람 모델로 ----------
 * TM(가상 시계 위의 timing.js)은 준비 화면 검사에서 함께 세워 뒀어요. */
function aimAs(mech, sel, prop, target, opts, seed, lag, sigma) {
  let hist = [], fired = false, plan = null, started = false;
  return TM.trial(mech, opts, seed, (wrap, now, fire) => {
    const btn = wrap.querySelector(".tm-btn");
    if (mech === "hold" && !started) { started = true; fire(btn, "pointerdown"); return; }
    if (fired) return;
    const el = wrap.querySelector(sel);
    if (!el) return;
    let goal = target;
    if (mech === "hold") {
      const pz = wrap.querySelector(".tm-zone-perfect");
      goal = pctOf(pz.style.left) + pctOf(pz.style.width) / 2;
    }
    hist.push({ now, v: pctOf(el.style[prop]) });
    let a = hist[0], b = hist[0];
    for (const h of hist) { if (h.now <= now - lag) b = h; }
    for (const h of hist) { if (h.now <= now - lag - 60) a = h; }
    if (a === b) return;
    const v = (b.v - a.v) / (b.now - a.now);
    if (v === 0 || (mech === "hold" && v <= 0)) return;
    const eta = b.now + (goal - b.v) / v;
    if (eta < b.now) return;                                   // 지나갔어요 — 다음 왕복을 기다려요
    if (plan == null || Math.abs(eta - plan) > 300) plan = eta + gauss(sigma);
    if (now >= plan) { fired = true; fire(btn, mech === "hold" ? "pointerup" : "click"); }
  });
}
function reactAs(opts, seed, lag, sigma) {
  let fired = false, plan = null;
  return TM.trial("reaction", opts, seed, (wrap, now, fire) => {
    if (fired) return;
    const btn = wrap.querySelector(".tm-btn");
    if (!btn.classList.contains("tm-react-go")) return;
    if (plan == null) plan = now + lag + Math.max(-lag * 0.5, gauss(sigma));
    if (now >= plan) { fired = true; fire(btn, "click"); }
  });
}
function seqAs(opts, seed, memP) {
  let seq = null, i = 0, plan = 0;
  return TM.trial("sequence", opts, seed, (wrap, now, fire) => {
    const show = wrap.querySelector(".tm-seq-show");
    if (!seq && show.textContent.indexOf("❓") < 0) seq = show.textContent.split(" ");
    const btns = wrap.querySelectorAll(".tm-seq-btn");
    if (!seq || !btns.length || btns[0].disabled || now < plan) return;
    plan = now + 260;
    const icons = Array.from(btns).map((b) => b.textContent);
    let want = seq[i];
    if (plyRnd() > memP) want = icons[Math.floor(plyRnd() * icons.length)];
    i += 1;
    fire(Array.from(btns).find((x) => x.textContent === want) || btns[0], "click");
  });
}
function duelAs(opts, seed) {
  let fired = false;
  return TM.trial("duel", opts, seed, (wrap, now, fire) => {
    if (fired || now < 700) return;
    fired = true;
    const btns = Array.from(wrap.querySelectorAll(".tm-duel-btn"));
    const m = wrap.querySelector(".tm-hint").textContent.match(/([가-힣]+)은\(는\) 함정/);
    const pool = m ? btns.filter((b) => b.textContent !== m[1]) : btns;
    fire(pool[Math.floor(plyRnd() * pool.length)], "click");
  });
}
function targetAs(opts, seed, lag, sigma) {
  let forEl = null, plan = 0;
  return TM.trial("target", opts, seed, (wrap, now, fire) => {
    const t = wrap.querySelector(".tm-target:not([disabled])");
    if (!t) { forEl = null; return; }
    if (forEl !== t) { forEl = t; plan = now + lag + Math.max(-lag * 0.5, gauss(sigma)); }
    if (now >= plan) fire(t, "click");
  });
}
function oddAs(opts, seed, findMs, sigma) {
  let forEl = null, plan = 0;
  return TM.trial("odd", opts, seed, (wrap, now, fire) => {
    const cells = Array.from(wrap.querySelectorAll(".tm-odd-cell"));
    if (!cells.length) return;
    const cnt = {};
    for (const c of cells) cnt[c.textContent] = (cnt[c.textContent] || 0) + 1;
    const odd = cells.find((c) => cnt[c.textContent] === 1);
    if (!odd) return;
    if (forEl !== odd) { forEl = odd; plan = now + Math.max(200, findMs + gauss(sigma)); }
    if (now >= plan) fire(odd, "click");
  });
}
/* game.js가 8종에 실제로 넘기는 옵션 그대로예요 (playRandomMini 참고) */
function old8(stat, zone, sk, n) {
  const all = { perfect: 0, good: 0, miss: 0 };
  const add = (d) => { all.perfect += d.perfect; all.good += d.good; all.miss += d.miss; };
  add(dist(n, (s) => aimAs("play", ".tm-marker", "left", 50, { zonePct: zone, label: "t" }, s, sk.lag, sk.tsig)));
  add(dist(n, (s) => aimAs("hold", ".tm-fill", "width", 0, { zonePct: zone, label: "t" }, s, sk.lag, sk.tsig)));
  add(dist(n, (s) => aimAs("drop", ".tm-drop-icon", "top", 66, { zonePct: zone, label: "t" }, s, sk.lag, sk.tsig)));
  add(dist(n, (s) => seqAs({ icons: ["⚾", "🧢", "🧤", "🏏"], showMs: 900 + stat * 6 + 90 }, s, sk.mem)));
  add(dist(n, (s) => reactAs({ perfectMs: 300 + stat * 1.5, goodMs: 700 + stat * 2.5 }, s, sk.lag, sk.tsig)));
  add(dist(n, (s) => targetAs({ count: 3, lifeMs: 800 + Math.min(stat, 130) * 3 }, s, sk.lag + 120, sk.tsig)));
  add(dist(n, (s) => oddAs({ rounds: 2, sets: [["⚾", "🥎"], ["🧢", "⛑️"], ["🧤", "🥊"]] }, s, sk.find, sk.tsig * 3)));
  add(dist(n, (s) => duelAs({ choices: ["몸쪽", "가운데", "바깥쪽"], hintChance: Math.max(0, Math.min(0.9, (stat - 40) / 80 + 0.075)) }, s)));
  const tot = all.perfect + all.good + all.miss;
  return { p: all.perfect / tot, g: all.good / tot, m: all.miss / tot };
}
const OLDTAB = {};
guard("기존 8종 기준선", () => {
  for (const sk of PROFILES) {
    /* 기존 8종 기준선도 사람마다 제 줄기를 써요. 여기가 '도입 전'이라, 이 숫자가
     * 실행마다 흔들리면 "새 메커닉이 얼마나 어려워졌나"를 아예 말할 수 없어요. */
    plyRnd = mulberry32(sk.rnd + 500);
    OLDTAB[sk.name] = {};
    for (const stat of [70, 110, 150]) {
      const zone = Math.min(40, Math.max(10, 13 + stat * 0.22 + 30 * 0.08));
      /* 새 2종과 같은 표본을 써요. 예전에는 DN/3만 돌렸는데, 기존 8종은 배수가
       * 1.05 언저리에 뭉쳐 있어서 능력치가 벌리는 폭(0.02 안팎)이 표본 잡음과
       * 같은 크기가 돼요 — 아래 비교가 실행할 때마다 뒤집혔어요. */
      OLDTAB[sk.name][stat] = old8(stat, zone, sk, Math.max(60, DN));
    }
    console.log(`   기존 8종 ${sk.name} | ${[70, 110, 150].map((st) =>
      `능력치${st} P${pct(OLDTAB[sk.name][st].p)} M${pct(OLDTAB[sk.name][st].m)} 배수 ${mult(OLDTAB[sk.name][st]).toFixed(3)}`).join(" · ")}`);
  }
  /* 기존 8종은 프로 능력치에서 거의 다 perfect예요 — 그래서 가을야구가 5월과
   * 손맛이 같았어요. 새 2종이 그보다 능력치에 더 민감해야 만든 뜻이 있어요.
   * 양쪽 다 여러 칸의 평균으로 견줘요 (칸 하나는 표본이 흔들려요). */
  const oldGaps = [SKILL.name, AVG.name].map((n) => mult(OLDTAB[n][150]) - mult(OLDTAB[n][70]));
  const oldGap = oldGaps.reduce((a, b) => a + b, 0) / oldGaps.length;
  const newGap = NEWTAB.__gap;
  console.log(`   능력치가 벌리는 폭 | 기존 8종 ${oldGap.toFixed(3)} · 새 2종 ${newGap.toFixed(3)}`);
  /* 앞서기만 하면 돼요(배수를 안 걸어요). 기존 8종의 폭은 참값이 0.02~0.04인데
   * 표본 오차가 ±0.01이라, 여기에 1.5배 같은 문턱을 얹으면 실행할 때마다 뒤집혀요.
   * 새 2종이 실제로 민감한지는 위의 "평균 0.03 넘게 벌린다"가 훨씬 세게 못 박아요
   * (실측 0.063 대 문턱 0.03). 이 줄은 그 위에 얹는 방향 확인이에요. */
  check(newGap > oldGap,
    `새 2종이 기존 8종보다 능력치에 더 민감하다 (${newGap.toFixed(3)} > ${oldGap.toFixed(3)})`);
  const oldMiss = [SKILL.name, AVG.name].map((n) => OLDTAB[n][150].m);
  console.log(`   기존 8종은 프로 능력치에서 거의 다 완벽이에요 (능력치 150 · 완벽 ${
    [SKILL.name, AVG.name].map((n) => pct(OLDTAB[n][150].p)).join(" / ")} · miss ${oldMiss.map(pct).join(" / ")})`);
});

/* ================================================================
 * ②·⑤ 게임 입구를 통해 — 진짜 화면을 띄워요
 * ================================================================ */
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.scrollTo = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
`;
function bootGame() {
  const DIR = path.join(BETA, "rookie");
  const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
    .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(DIR, src.split("?")[0]);
      return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
    })
    .replace("</head>", `<script>${PRELUDE}</script></head>`)
    /* 최상위 let/const는 브라우저에서도 window 속성이 안 돼요.
     * 페이지 안에서 직접 eval하는 창구를 하나 열어 접근합니다 (tour-harness.js와 같아요). */
    .replace("</body>", `<script>window.__get=(n)=>eval(n);window.__set=(n,v)=>{window.__v=v;eval(n+" = window.__v")};</script></body>`);
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/rookie/" });
  const w = dom.window;
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };
  // 가상 시계 — 한 시즌을 몇 초에 굴리려면 시계를 우리가 돌려야 해요
  let VT = 0, vid = 1, vt = [];
  w.performance.now = () => VT;
  w.requestAnimationFrame = (cb) => { const i = vid++; vt.push({ at: VT + 16.667, id: i, fn: () => cb(VT), rep: 0 }); return i; };
  w.setTimeout = (fn, ms) => { const i = vid++; vt.push({ at: VT + (ms || 0), id: i, fn, rep: 0 }); return i; };
  w.setInterval = (fn, ms) => { const i = vid++; vt.push({ at: VT + (ms || 1), id: i, fn, rep: ms || 1 }); return i; };
  const clr = (i) => { const k = vt.findIndex((t) => t.id === i); if (k >= 0) vt.splice(k, 1); };
  w.clearTimeout = clr; w.clearInterval = clr; w.cancelAnimationFrame = clr;
  /* 🧭 준비 화면이 떠 있으면 ▶️ 시작을 눌러요 — 사람이 하는 그대로예요.
   * 새 2종은 이 버튼을 누르기 전에 타이머를 한 개도 안 걸어서, 안 눌러 주면
   * 가상 시계를 아무리 돌려도 경기가 그 자리에 멈춰 있어요. 그게 바로 이 화면이
   * 지켜야 할 약속이라, 우회하지 않고 여기서 눌러 줘요. 몇 번 눌렀는지도 세요. */
  const ready = { taps: 0, after: null };
  const send = (el, type) => {
    if (el) el.dispatchEvent(new w.Event(type, { bubbles: true, cancelable: true }));
  };
  const tapReady = () => {
    const holder = w.document.querySelector(".mg-ready");
    if (!holder) return false;
    const parent = holder.parentNode;               // 본 게임 상자가 붙을 자리예요
    ready.taps++;
    /* ✋ 실기기 순서를 그대로 보내요 — pointerdown → pointerup → click.
     * pointerdown에서 준비 화면이 지워지고 그 자리에 게임 상자가 그려지니, 손을 뗄
     * 때 오는 꼬리는 **새로 생긴 게임 버튼**에게 가요. 진짜 화면에서도 그 꼬리로는
     * 게임이 안 움직여야 해요 — 움직이면 손도 못 댄 채로 판정이 나 버려요. */
    send(holder.querySelector(".mg-go"), "pointerdown");
    const tail = parent && parent.querySelector(".tm-box .tm-btn");
    send(tail, "pointerup");
    send(tail, "click");
    if (ready.after) ready.after(parent);           // 누른 직후의 화면을 보고 싶을 때
    return true;
  };
  /* 큐가 빌 때마다 확인하고, 큐가 안 비는 경우(setInterval)를 위해 512걸음마다도 봐요.
   * 매 걸음 DOM을 뒤지면 한 시즌 굴리는 데 몇 분씩 걸려요. */
  const pump = (max) => {
    const cap = max || 60000;
    let n = 0;
    while (n < cap) {
      if (!vt.length) { if (!tapReady()) break; continue; }
      if ((n & 511) === 0) tapReady();
      n++;
      vt.sort((a, b) => a.at - b.at);
      const ev = vt[0];
      VT = ev.at;
      if (ev.rep) ev.at = VT + ev.rep; else vt.shift();
      ev.fn();
    }
  };
  return { dom, w, pump, ready, $: (id) => w.document.getElementById(id), get: w.__get, set: w.__set };
}

const G = bootGame();
const Career = G.w.Career;
const active = () => (G.w.document.querySelector(".screen.active") || {}).id;

/* 프로 선수 한 명을 세우고, 정규시즌을 마지막 한 경기만 남긴 자리에 놓아요.
 * 승패는 실제 산식(teamWinP·팀 전력)으로 굴려서 순위(시드)가 저절로 나와요 —
 * 1번 시드로 고정하면 한 시리즈만 이기면 돼서 미니게임이 우승에 거의 안 닿아요. */
function setupPro(o) {
  const S = G.get(`newState(REGIONS[0], "${o.pos}", "확인")`);
  G.set("S", S);
  for (const k of Object.keys(S.stats)) S.stats[k] = o.stat;
  for (const k of Object.keys(S.talents)) S.talents[k] = 1.3;
  S.phase = "pro";
  S.league = o.league || 1;
  S.age = 27; S.proYear = 6; S.condition = 80; S.money = 0;
  S.career = { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
  S.proLog = []; S.trophies = []; S.teamStr = {}; S.post = null; S.trans = {};
  const teams = Career._t.leagueTeams();
  S.team = teams[0];
  S.role = o.pos === "batter" ? "4번 타자" : "선발 투수";
  Career._t.driftTeamStr();
  G.set("S", S);
  const total = Career._t.seasonTotal();
  const binom = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (G.w.Math.random() < p) k++; return k; };
  const myW = binom(total - 1, Career._t.teamWinP());
  S.season = {
    game: o.lastGame === false ? 0 : total - 1, total,
    teamW: myW, teamL: (total - 1) - myW,
    others: teams.filter((t) => t !== S.team).map((name) => {
      const str = Career._t.teamStrOf(name);
      const ww = binom(total - 1, str);
      return { name, w: ww, l: (total - 1) - ww, str };
    }),
    stats: o.pos === "batter" ? { ab: 0, hits: 0, hr: 0, sb: 0 } : { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 },
  };
  S.pendingGame = true;
  return S;
}

/* 정규시즌 마지막 경기부터 결산까지 실제 버튼을 눌러 굴려요. */
function runToReport(onStep) {
  Career.showPro();
  G.pump();
  let clicks = 0, entered = false;
  while (clicks++ < 400) {
    const st = G.get("S");
    if (st.post) entered = true;
    if (onStep) onStep(st);
    const scr = active();
    if (scr === "screen-pro") {
      const go = G.w.document.querySelector("#pro-actions .go-game");
      if (!go) break;
      go.click();
    } else if (scr === "screen-tournament") {
      const b = G.$("btn-tour-next");
      if (!b || b.disabled) break;
      b.click();
    } else break;
    G.pump();
  }
  const fin = G.get("S");
  const last = (fin.career.seasons || [])[fin.career.seasons.length - 1];
  return { entered, champ: !!(last && last.champ), rank: last ? last.rank : null };
}

group("② 배치 — 가을야구에서만");
guard("배치", () => {
  const realPost = G.w.PostStage, realTiming = G.w.Timing;
  const seen = { post: [], timing: [] };
  /* 상자가 실제로 화면에 그려졌는지도 같이 봐요. 가상 시계에서는 미니게임이
   * 한 번의 pump 안에서 시작하고 끝나서, 밖에서 보면 이미 지워진 뒤예요.
   *
   * 🧭 이제 부르자마자 그려지는 건 준비 화면이에요. 본 게임 화면(.ps-plate·.ps-field)은
   * ▶️ 시작을 누른 뒤에야 생기니, 그건 tapReady가 누른 직후에(ready.after) 봐요.
   * 두 시점을 따로 세는 것 자체가 "누르기 전에는 안 그려진다"를 말해 줘요. */
  // early = 준비 화면을 누르기도 전에 본 게임이 그려진 판 (0이어야 해요)
  const drawn = { ready: 0, early: 0, plate: 0, field: 0, inMoment: 0, other: 0 };
  const spy = (real, bag, watchDom) => new Proxy(real, {
    get(t, k) {
      const v = t[k];
      if (typeof v !== "function" || k === "constructor") return v;
      return (...a) => {
        bag.push(k);
        const out = v.apply(t, a);
        if (watchDom && a[0] && a[0].querySelector) {
          if (a[0].querySelector(".mg-ready")) drawn.ready++;
          if (a[0].querySelector(".ps-plate") || a[0].querySelector(".ps-field")) drawn.early++;
          if (a[0].id === "game-moment") drawn.inMoment++;
        }
        return out;
      };
    },
  });
  G.ready.after = (parent) => {
    if (!parent || !parent.querySelector) return;
    if (parent.querySelector(".ps-plate")) drawn.plate++;
    else if (parent.querySelector(".ps-field")) drawn.field++;
    else drawn.other++;
  };
  G.w.PostStage = spy(realPost, seen.post, true);
  G.w.Timing = spy(realTiming, seen.timing, false);
  G.w.localStorage.setItem("grow-auto-mini", "0");   // 손으로 하는 경로예요

  // 정규시즌 — 첫 경기부터 몇 경기 굴려서 어느 미니게임이 뜨는지 봐요
  setupPro({ pos: "batter", stat: 120, lastGame: false });
  Career.showPro();
  G.pump();
  for (let i = 0; i < 8 && active() === "screen-pro"; i++) {
    const go = G.w.document.querySelector("#pro-actions .go-game");
    if (!go) break;
    go.click();
    G.pump();
    let hop = 0;
    while (active() === "screen-tournament" && hop++ < 60) {
      const b = G.$("btn-tour-next");
      if (!b || b.disabled) break;
      b.click();
      G.pump();
    }
  }
  const regTiming = seen.timing.length, regPost = seen.post.length;
  check(regTiming > 0, `정규시즌에서 기존 8종(timing.js)이 그대로 뜬다 (${regTiming}판)`);
  check(regPost === 0, `정규시즌에는 가을야구 메커닉이 안 뜬다 (${regPost}판)`);

  /* 가을야구 — 같은 선수를 시즌 끝에 놓고 굴려요.
   * 마지막 정규시즌 경기 한 판이 먼저 지나가니(타자는 그 안에서 3~5타석),
   * 세는 건 S.post가 살아난 뒤부터예요. */
  let inPost = false;
  const postSeen = { post: 0, timing: 0, kinds: new Set() };
  const hookLen = { post: 0, timing: 0 };
  const readyBefore = G.ready.taps;
  setupPro({ pos: "batter", stat: 140 });
  seen.post.length = 0; seen.timing.length = 0;
  const r = runToReport((st) => {
    if (!inPost && st.post && st.post.myRound) {
      inPost = true;
      hookLen.post = seen.post.length; hookLen.timing = seen.timing.length;
    }
    if (inPost) {
      postSeen.post = seen.post.length - hookLen.post;
      postSeen.timing = seen.timing.length - hookLen.timing;
      for (const k of seen.post.slice(hookLen.post)) postSeen.kinds.add(k);
    }
  });
  postSeen.post = seen.post.length - hookLen.post;
  postSeen.timing = seen.timing.length - hookLen.timing;
  for (const k of seen.post.slice(hookLen.post)) postSeen.kinds.add(k);
  check(r.entered, "가을야구까지 실제로 들어갔다");
  check(postSeen.post > 0, `가을야구에서 새 메커닉이 뜬다 (${postSeen.post}판 · ${[...postSeen.kinds].join(" · ")})`);
  check(postSeen.timing === 0, `가을야구에는 기존 8종이 안 뜬다 (${postSeen.timing}판)`);
  check(postSeen.kinds.size === 2, `두 메커닉이 다 나온다 (${[...postSeen.kinds].join(" · ")})`);
  check(drawn.plate > 0 && drawn.field > 0 && drawn.other === 0,
    `▶️ 시작을 누르면 두 메커닉 다 실제 DOM을 그린다 (🧊 존 ${drawn.plate}판 · 🏃 주루로 ${drawn.field}판 · 못 그린 판 ${drawn.other})`);
  check(drawn.inMoment === drawn.plate + drawn.field,
    `미니게임이 경기 화면의 #game-moment 안에 붙는다 (${drawn.inMoment}/${drawn.plate + drawn.field}판)`);
  /* 🧭 판마다 준비 화면이 먼저 떴어요. 위의 pump가 그걸 눌러 준 횟수가 곧 판 수예요 —
   * 하나라도 안 떴으면 그 판은 준비 화면 없이 시작됐다는 뜻이에요. 반대로 안 눌러
   * 주면 첫 판에서 경기가 멈춰서 postSeen.post가 1에서 안 늘어나요. */
  const readyTaps = G.ready.taps - readyBefore;
  check(drawn.ready === postSeen.post,
    `가을야구 미니게임은 판마다 준비 화면을 먼저 띄운다 (${postSeen.post}판 · 준비 화면 ${drawn.ready}판)`);
  check(drawn.early === 0,
    `준비 화면을 누르기 전에는 본 게임 화면이 안 그려진다 (미리 그려진 판 ${drawn.early})`);
  check(readyTaps === postSeen.post,
    `그 준비 화면을 사람이 하나하나 눌러서 경기가 이어졌다 (${readyTaps}회)`);
  G.ready.after = null;

  // autoMiniOn — 이 경로가 없으면 테스트도 확인 페이지도 여기서 막혀요
  seen.post.length = 0; seen.timing.length = 0;
  const autoReadyBefore = G.ready.taps;
  G.w.localStorage.setItem("grow-auto-mini", "1");
  setupPro({ pos: "pitcher", stat: 140 });
  const auto = runToReport();
  check(auto.entered, "자동 판정으로도 가을야구를 완주한다");
  check(seen.post.length === 0 && seen.timing.length === 0,
    `자동 판정이면 미니게임 화면을 아예 안 띄운다 (post ${seen.post.length} · timing ${seen.timing.length})`);
  /* 🧭 자동 플레이는 준비 화면도 안 거쳐요. playPostMini가 autoMiniOn()이면
   * window.PostStage를 아예 안 부르는 구조라 그 앞의 준비 화면도 뜰 자리가 없어요 —
   * 자동인데 ▶️를 눌러야 하면 자동이 아니에요. */
  check(G.ready.taps === autoReadyBefore,
    `자동 판정이면 준비 화면도 한 번을 안 뜬다 (${G.ready.taps - autoReadyBefore}회)`);
  check(/if \(autoMiniOn\(\)\) \{ cb\(autoRes\(mech\.stat\(\)\), txt\); return; \}/.test(GAME_SRC),
    "playPostMini에 autoMiniOn 경로가 있다");
  check(/if \(inPostMini\(\)\) \{ playPostMini\(container, cb\); return; \}/.test(GAME_SRC),
    "playRandomMini의 첫 줄에서만 갈라진다 (정규시즌 8종은 손대지 않았어요)");

  G.w.PostStage = realPost;
  G.w.Timing = realTiming;
});

group("⑤ 가을야구 우승 확률");
guard("우승 확률", () => {
  const realAutoRes = G.get("autoRes");
  const POST_TIER = G.get("POST_TIER");
  const zoneOf = (stat) => Math.min(40, Math.max(10, 13 + stat * 0.22 + 30 * 0.08));
  const lerp = (tab, keys, x) => {
    let lo = keys[0], hi = keys[keys.length - 1];
    for (const k of keys) if (k <= x) lo = k;
    for (let i = keys.length - 1; i >= 0; i--) if (keys[i] >= x) hi = keys[i];
    if (lo === hi) return tab[lo];
    const f = (x - lo) / (hi - lo);
    const a = tab[lo], b = tab[hi];
    return { p: a.p + (b.p - a.p) * f, g: a.g + (b.g - a.g) * f, m: a.m + (b.m - a.m) * f };
  };
  // ④가 실제로 잰 분포를 그대로 꽂아요 — 여기 숫자를 옮겨 적지 않아요
  const useNew = (stat, skName) => {
    const z = zoneOf(stat);
    G.set("autoRes", () => {
      const st = G.get("S");
      const tier = (st.post && POST_TIER[st.post.myRound]) || 0;
      const d = lerp(NEWTAB[skName][tier], ZONES, z);
      const r = G.w.Math.random();
      return r < d.p ? "perfect" : r < d.p + d.g ? "good" : "miss";
    });
  };
  const useOld = (stat, skName) => {
    const d = lerp(OLDTAB[skName], [70, 110, 150], stat);
    G.set("autoRes", () => {
      const r = G.w.Math.random();
      return r < d.p ? "perfect" : r < d.p + d.g ? "good" : "miss";
    });
  };

  const CN = Number(process.env.POST_CHAMP_N || 45);
  const STATS = [80, 115, 150];
  const rows = [];
  const table = {};
  for (const pos of ["batter", "pitcher"]) {
    table[pos] = {};
    for (const stat of STATS) {
      table[pos][stat] = {};
      const cells = [];
      /* 🐢 손이 느린 사람도 같이 재요. 타이밍을 판정에 넣은 뒤로 "반응이 느리면
       * 가을야구를 못 하는 것 아니냐"가 진짜 물음이 됐고, 그건 우승 확률로만
       * 답할 수 있어요 — 미니게임 한 판이 아니라 시리즈 전체를 봐야 하니까요. */
      for (const [nm, apply] of [
        ["게임 기본", () => G.set("autoRes", realAutoRes)],
        ["구8·능숙", () => useOld(stat, SKILL.name)],
        ["구8·보통", () => useOld(stat, AVG.name)],
        ["구8·느린손", () => useOld(stat, SLOW.name)],
        ["신2·능숙", () => useNew(stat, SKILL.name)],
        ["신2·보통", () => useNew(stat, AVG.name)],
        ["신2·느린손", () => useNew(stat, SLOW.name)],
      ]) {
        apply();
        G.w.Math.random = mulberry32(4242 + stat);
        let champ = 0, ent = 0;
        for (let i = 0; i < CN; i++) {
          setupPro({ pos, stat });
          const r = runToReport();
          if (r.entered) ent++;
          if (r.champ) champ++;
        }
        const v = ent ? champ / ent : 0;
        table[pos][stat][nm] = v;
        cells.push(`${nm} ${pct(v)}`);
      }
      rows.push(`   ${pos === "batter" ? "🧢 타자" : "⚾ 투수"} ${String(stat).padStart(3)} | ${cells.join(" · ")}`);
    }
  }
  console.log(rows.join("\n"));
  G.set("autoRes", realAutoRes);

  const all = [];
  for (const pos of ["batter", "pitcher"]) for (const st of STATS) for (const k of ["신2·능숙", "신2·보통", "신2·느린손"]) all.push(table[pos][st][k]);
  const lo = Math.min(...all), hi = Math.max(...all);
  /* 극단으로 쏠리면 안 돼요 — 아무도 우승 못 하거나 누구나 우승하면 가을야구가 사라져요.
   * 이 범위를 넓히지 마세요. 넓히는 순간 이 검사는 아무것도 안 지킵니다. */
  check(lo >= 0.03 && hi <= 0.92, `우승 확률이 3%~92% 안이다 (${pct(lo)}~${pct(hi)})`);
  /* 능력치에 따라 갈려요. 칸 하나는 표본 오차가 ±6%p라, 손끝 두 갈래를 묶은
   * 평균으로 봐요 (묶지 않으면 난이도가 아니라 난수를 재게 돼요). */
  const flat = [];
  for (const pos of ["batter", "pitcher"]) {
    const at = (st) => (table[pos][st]["신2·능숙"] + table[pos][st]["신2·보통"]) / 2;
    const a = at(STATS[0]), b = at(STATS[STATS.length - 1]);
    const slowLo = table[pos][STATS[0]]["신2·느린손"], slowHi = table[pos][STATS[STATS.length - 1]]["신2·느린손"];
    console.log(`   ${pos === "batter" ? "🧢 타자" : "⚾ 투수"} 능력치 ${STATS[0]}→${STATS[STATS.length - 1]} | 우승 ${pct(a)} → ${pct(b)} (🐢 느린손 ${pct(slowLo)} → ${pct(slowHi)})`);
    if (!(b > a + 0.08)) flat.push(`${pos} ${pct(a)}→${pct(b)}`);
  }
  check(flat.length === 0, `능력치를 올리면 우승 확률이 오른다 (안 오른 칸: ${flat.join(" · ") || "없음"})`);
  /* 도입 전과 견줘요 — 어려워지는 건 좋지만 가을야구가 사라지면 안 돼요.
   * 칸 하나(CN판)는 표본 오차가 ±6%p라 칸 단위로 못 박으면 난수를 재게 돼요.
   * 포지션 × 손끝 묶음(능력치 세 칸의 평균)으로 봐요. */
  const drops = [];
  for (const pos of ["batter", "pitcher"]) {
    for (const sk of PROFILES.map((p) => p.name)) {
      const d = STATS.map((st) => table[pos][st][`구8·${sk}`] - table[pos][st][`신2·${sk}`]);
      drops.push({ key: `${pos}·${sk}`, v: d.reduce((a, b) => a + b, 0) / d.length });
    }
  }
  const worst = drops.reduce((a, b) => (b.v > a.v ? b : a));
  const mean = drops.reduce((a, b) => a + b.v, 0) / drops.length;
  console.log(`   도입 전 대비 | ${drops.map((d) => `${d.key} ${(d.v * 100).toFixed(1)}%p`).join(" · ")} (평균 ${(mean * 100).toFixed(1)}%p 하락)`);
  check(worst.v <= 0.25,
    `어느 묶음도 도입 전보다 우승 확률이 25%p 넘게 떨어지지 않는다 (가장 큰 ${worst.key} ${(worst.v * 100).toFixed(1)}%p)`);
  check(mean > -0.05, `가을야구가 쉬워지지는 않았다 (평균 ${(mean * 100).toFixed(1)}%p)`);
});

G.dom.window.close();
PS.V.close();
TM.V.close();
console.log(fail ? `\n❌ ${fail}개 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
