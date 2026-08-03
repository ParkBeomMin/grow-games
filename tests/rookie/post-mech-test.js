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
 * ─────────────────────────────────────────────────────────────────────────
 * 🎯 이번 판의 본론 — 🧊 볼카운트 승부를 들어내고 🎯 수싸움을 넣었어요.
 *
 * 볼카운트는 "안 누르는 게 수"인 판단 게임인데 화면(날아오는 공 + 스윙 버튼)이
 * 누가 봐도 타이밍 게임이라, 세 번을 고쳐도 "언제 눌러야 할지 모르겠다"가
 * 안 없어졌어요. 그래서 기대를 만들 물건 자체를 화면에서 들어냈어요.
 *
 * 수싸움에서 이 파일이 못 박는 건 **시간이 결과에 한 톨도 안 들어간다**예요.
 *   · 판 내내 requestAnimationFrame을 한 번도 안 불러요 (움직이는 게 없어요)
 *   · 손을 놓고 있으면 화면이 한 글자도 안 바뀌어요
 *   · 같은 판을 0.04초에 고르든 5초에 고르든 **결과가 글자까지 같아요**
 * 그리고 찍기가 아니라는 것 — 기색(버릇)이 능력치를 따라 또렷해지고, 같은 칸만
 * 거듭 고르면 상대가 적응해서 나빠져요.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ④의 사람 모델은 '오차를 가진 사람'이에요. 🏃 홈 승부는 화면(주자와 송구 자리)만
 * 읽고 lag만큼 늦은 화면으로 판단해요. 🎯 수싸움은 화면(기색 막대와 내 자국)만
 * 읽고 trust·memo만큼만 믿어요. 사람의 손을 정확히 맞힐 수는 없지만, "잘 보는
 * 사람"과 "대충 하는 사람"이 갈리는지, 능력치를 올리면 나아지는지는 이렇게 재야
 * 알 수 있어요.
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
const CSS_SRC = fs.readFileSync(path.join(BETA, "rookie/style.css"), "utf8");

const mulberry32 = (a) => function () {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
let plyRnd = mulberry32(20260803);
const gauss = (sd) => {
  const u = Math.max(1e-9, plyRnd()), v = plyRnd();
  return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const pctOf = (s) => parseFloat(String(s || "0").replace("%", "")) || 0;

/* ================================================================
 * 가상 시계 위의 post-stage.js · timing.js
 * 실시간으로 재면 한 판이 몇 초라 표본을 못 모아요(1000판이면 한 시간).
 * 시계를 우리가 돌리면 같은 코드를 그대로 돌리면서 수천 판을 몇 초에 봐요.
 * ================================================================ */
function vstage(src, api) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="box"></div></body></html>`,
    { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/" });
  const V = dom.window;
  V.eval(src);
  let VT = 0, vid = 1, vt = [], sched = 0, rafs = 0;
  V.performance.now = () => VT;
  V.Date.now = () => VT;
  /* sched는 '지금까지 걸린 타이머 수'예요 — 준비 화면 위에서 시계가 도는지
   * 아닌지를 결과가 아니라 원인 쪽에서 못 박으려고 세요.
   * rafs는 **프레임 루프를 돌렸는지**예요. 🎯 수싸움에서는 이게 0이어야 해요 —
   * 화면에서 움직이는 것이 하나도 없다는 뜻이니까요. */
  V.requestAnimationFrame = (cb) => { sched++; rafs++; const id = vid++; vt.push({ at: VT + 16.667, id, fn: () => cb(VT) }); return id; };
  V.cancelAnimationFrame = (id) => { const i = vt.findIndex((t) => t.id === id); if (i >= 0) vt.splice(i, 1); };
  V.setTimeout = (fn, ms) => { sched++; const id = vid++; vt.push({ at: VT + (ms || 0), id, fn }); return id; };
  V.clearTimeout = (id) => { const i = vt.findIndex((t) => t.id === id); if (i >= 0) vt.splice(i, 1); };

  /* 한 판을 돌려요. watch는 일정 간격으로 화면을 읽는 '눈'이에요 — fire(선택자)로 눌러요.
   *
   * ctl로 줄 수 있는 것:
   *   noStart   준비 화면에서 손을 놓고 있어요 (누르기 전을 보는 검사용)
   *   start     "click"이면 포인터 이벤트가 없는 환경(마우스·키보드)처럼 click만 보내요
   *   leak      시작 제스처의 꼬리(pointerup·click)가 갈 요소. 기본은 ".tm-btn"이에요
   *   noTail    꼬리를 아예 안 보내요 (누수가 없던 세상 — 비교용 기준선)
   *   stopAt    이 가상 시각에서 멈춰요 (판이 끝나기 전 화면을 그대로 찍어 보려고요)
   *   tap3      { at, sel, via } — 새 탭 한 번을 그 시각에 보내요
   *   step·to   눈이 화면을 보는 간격과 끝 시각 (🎯 수싸움은 움직이는 게 없어서 성기게 봐요)
   *   until     이 가상 시각까지만 굴려요 (🎯 수싸움의 안전망이 구마다 15초라 넉넉해야 해요) */
  function trial(mech, opts, seed, watch, ctl) {
    vt = []; VT = 0; sched = 0; rafs = 0;
    V.Math.random = mulberry32(seed);
    const box = V.document.getElementById("box");
    box.innerHTML = "";
    let res = null, endedAt = 0;
    V[api][mech](box, opts, (r) => { res = r; endedAt = VT; });
    const send = (el, type) => {
      if (el) el.dispatchEvent(new V.Event(type, { bubbles: true, cancelable: true }));
    };
    /* 🧭 준비 화면 — 사람이 ▶️ 시작을 누르는 자리예요. 우회하지 않고 실제로 눌러요.
     * 가상 시각 0에서 누르니 그 뒤로 흐르는 시간은 준비 화면이 없던 때와 똑같아요.
     *
     * ✋ 실기기가 보내는 순서를 **그대로** 보내요: pointerdown → pointerup → click.
     * pointerdown에서 준비 화면이 지워지고 그 자리에 게임 상자가 그려지니까, 손을
     * 뗄 때 오는 pointerup·click은 **그 지점에 새로 생긴 요소**로 가요. 그래서 꼬리는
     * 기본으로 게임의 첫 버튼(.tm-btn)에게 보내요. */
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
      if (type) { send(el, type); return; }
      send(el, "pointerdown"); send(el, "pointerup"); send(el, "click");
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
    const step = (ctl && ctl.step) || 4;
    const to = (ctl && ctl.to) || 9000;
    if (watch) for (let t = step; t <= to; t += step) vt.push({ at: t + 0.001, id: vid++, fn: () => { if (res === null) watch(wrap, VT, fire); } });
    let steps = 0;
    const until = (ctl && ctl.stopAt) || (ctl && ctl.until) || 22000;
    while (vt.length && res === null && steps++ < 300000) {
      vt.sort((a, b) => a.at - b.at);
      /* 다음 일이 멈추기로 한 시각보다 뒤면 **꺼내지 않고** 멈춰요.
       * 꺼내 놓고 시각만 보면 그 일이 이미 벌어진 뒤예요 — 🎯 수싸움처럼 남은
       * 타이머가 15초짜리 안전망 하나뿐이면, 0.04초 화면을 찍으려다 안전망을
       * 터뜨려서 판이 끝나 버려요. */
      if (vt[0].at > until) break;
      const ev = vt.shift();
      VT = ev.at;
      ev.fn();
    }
    return { res, endedAt, left: box.innerHTML, ready: !!readyBox, readyHTML, preTimers, rafs };
  }
  return { V, trial };
}

const PS = vstage(PS_SRC, "PostStage");
const T = PS.V.PostStage._t;
/* 기존 8종도 같은 가상 시계 위에 세워 둬요. 아래 ④에서 도입 전 기준선을 재는 데
 * 쓰고, 바로 다음의 준비 화면 검사에서 "8종에는 이 화면이 없다"를 볼 때도 써요. */
const TM = vstage(TM_SRC, "Timing");

/* 🎯 수싸움은 움직이는 게 없어서 4ms마다 볼 이유가 없어요. 대신 한 구를 오래
 * 들여다보는 사람도 재야 하니 끝 시각은 길게 잡아요. */
const MIND_WATCH = { step: 12, to: 16000 };

const dist = (n, fn) => {
  const d = { perfect: 0, good: 0, miss: 0 };
  let dur = 0, worst = 0;
  for (let i = 0; i < n; i++) {
    const r = fn(i + 1);
    d[r.res == null ? "miss" : r.res] += 1;
    dur += r.endedAt;
    worst = Math.max(worst, r.endedAt);
  }
  return Object.assign(d, { n, dur: dur / n, worst, p: d.perfect / n, g: d.good / n, m: d.miss / n });
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
 * ① 계약
 * ================================================================ */
group("① 계약");

check(/window\.PostStage = \(\(\) => \{/.test(PS_SRC), "post-stage.js가 window.PostStage 하나만 세운다");
check(/return \{\s*mind, dash,/.test(PS_SRC), "mind · dash 두 메커닉을 내보낸다");
// 판정은 세 가지뿐 — cb로 나가는 값이 전부 이 셋 안에 있어야 해요
{
  const grades = new Set((PS_SRC.match(/finish\(\s*"(\w+)"/g) || []).map((s) => s.match(/"(\w+)"/)[1]));
  /* 🎯 수싸움은 등급을 문자열이 아니라 mindGrade가 정해요 — 그래서 산식을 실제로
   * 굴려서 나오는 값도 같이 모아요. 표를 베껴 적지 않으려는 거예요. */
  for (let h = -1; h <= T.MIND.rounds + 2; h++) for (const d of [true, false]) grades.add(T.mindGrade(h, d));
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
  const mech = ["mind", "dash"];
  const dup = mech.filter((m) => tsFns.includes(m) || tmFns.includes(m));
  check(dup.length === 0, `메커닉 이름이 투어 3종·기존 8종과 겹치지 않는다 (겹친 이름 ${dup.join(" · ") || "없음"})`);
  check(psFns.includes("mind") && psFns.includes("dash"), `메커닉 두 개가 실제로 여기 있다 (${psFns.join(" · ")})`);
}

/* 🧊 볼카운트 승부는 깨끗이 들어냈어요 — 죽은 코드가 남으면 다음 사람이 그걸
 * 살아 있는 규칙으로 읽어요. 코드·문구·CSS·호출부를 통째로 봐요. */
{
  const FILES = [["post-stage.js", PS_SRC], ["rookie/game.js", GAME_SRC], ["rookie/style.css", CSS_SRC]];
  /* 코드에 남은 흔적 — 함수·CSS 클래스·문구 묶음 이름이에요. 하나라도 살아 있으면
   * 다음 사람이 그걸 살아 있는 규칙으로 읽어요. */
  const dead = FILES.filter(([, src]) =>
    /countBreak|countEdge|countStrikeP|countHitGrade|COUNT_MSG|COUNT_BAT|COUNT_PIT|ps-track|ps-zone|ps-ball|ps-count|ps-c-ball|PostStage\.count/.test(src));
  check(dead.length === 0, `🧊 볼카운트 승부의 코드가 한 줄도 안 남았다 (남은 곳: ${dead.map((d) => d[0]).join(" · ") || "없음"})`);
  /* 화면에 뜨는 말에도 안 남아야 해요. 주석은 빼고 봐요 — "왜 들어냈는지"를 적어
   * 두는 건 오히려 남겨야 하는 기록이라, 그것까지 막으면 설명을 못 써요. */
  const noComment = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const spoken = FILES.filter(([, src]) => /볼카운트|빗맞은 파울|꺾인 뒤|눈금\(┊\)|골라냈어요/.test(noComment(src)));
  check(spoken.length === 0, `화면에 뜨는 말에도 안 남았다 (남은 곳: ${spoken.map((d) => d[0]).join(" · ") || "없음"})`);
  check(!/\bcount\b/.test(PS_SRC), "post-stage.js에 count라는 이름이 아예 없다 (메커닉 이름을 지웠어요)");
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

// CSS는 절대색이 아니라 테마 변수여야 해요 (새로 들어간 .pm-* 만 봐요)
guard("테마 변수", () => {
  const block = CSS_SRC.split("\n").filter((l) => /^\.pm-|^\.pm/.test(l.trim())).join("\n");
  const hex = block.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  check(hex.length === 0, `🎯 수싸움 CSS가 절대색을 안 쓴다 (${hex.join(" · ") || "없음"})`);
  check(/var\(--/.test(block), "색을 테마 변수로 가져온다");
});

/* ================================================================
 * 🧭 준비 화면 — 눌러야 시작해요
 *
 * 규칙이 여러 구에 걸쳐 있고(수싸움) 버튼이 둘이라(홈 승부) 한 줄짜리 안내로는
 * 첫 판을 통째로 날려요.
 * 여기서 못 박는 건 딱 하나예요 — **▶️ 시작을 누르기 전에는 시계가 안 돌아요.**
 * 시간이 아무리 흘러도 판정이 나면 안 되고, 타이머가 한 개라도 걸려 있으면 안 돼요.
 * ================================================================ */
group("🧭 준비 화면");
const MIND_OPT = { label: "t", zonePct: 22, tier: 0 };
const DASH_OPT = { label: "t", zonePct: 22, tier: 0, goText: "돌진! 🏃", stopText: "멈춰! ✋" };
guard("준비 화면", () => {
  const R = PS.V.PostStage._t;
  const OPTS = { mind: MIND_OPT, dash: DASH_OPT };
  const NAMES = [["🎯 수싸움", "mind"], ["🏃 홈 승부", "dash"]];
  const keyDesc = (html, name) => {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = html.match(new RegExp(`<b>${esc}</b><span>([^<]+)</span>`));
    return m ? m[1] : "";
  };
  // 처음 보는 사람으로 되돌려요 — 값이 없으면 그냥 0이에요 (마이그레이션이 없어요)
  PS.V.localStorage.removeItem(R.READY_KEY);
  /* 두 메커닉의 안전망(🎯 구마다 15초 · 🏃 6초)보다 길게 흘려 봐야 "정말로 아무것도
   * 안 돈다"를 말할 수 있어요. */
  const SAFE = Math.max(R.MIND.capPer, R.DASH.cap);

  for (const [name, mech] of NAMES) {
    let lastVT = 0, moved = 0;
    const idle = PS.trial(mech, OPTS[mech], 1, (wrap, now) => {
      lastVT = now;
      if (wrap.querySelector(".pm-board") || wrap.querySelector(".ps-runner")) moved++;
    }, { noStart: true, step: 40, to: SAFE + 2000, until: SAFE + 3000 });
    check(idle.ready, `${name} — 행동이 시작되기 전에 준비 화면이 먼저 뜬다`);
    check(idle.preTimers === 0,
      `${name} — 누르기 전에는 타이머가 하나도 안 걸린다 (rAF·setTimeout ${idle.preTimers}개)`);
    check(lastVT > SAFE,
      `${name} — 시계는 실제로 흘렀다 (${(lastVT / 1000).toFixed(1)}초 · 안전망보다 길어요)`);
    check(idle.res === null, `${name} — 그렇게 흘러도 판정이 안 난다 (${idle.res || "판정 없음"})`);
    check(moved === 0, `${name} — 판이 화면에 안 나타난다 (나타난 프레임 ${moved})`);
    check(/mg-go/.test(idle.readyHTML), `${name} — 준비 화면에 ▶️ 시작 버튼이 있다`);

    // ② 누르면 시작되고 정상적으로 끝나요
    const run = PS.trial(mech, OPTS[mech], 1);
    check(run.res !== null, `${name} — ▶️ 시작을 누르면 실제로 굴러가고 끝난다 (${run.res})`);
    check(run.left.trim() === "", `${name} — 끝나면 준비 화면도 본 상자도 안 남는다`);
  }

  /* ③ 버튼이 둘인 메커닉은 둘 다 설명에 나와요. 🎯 수싸움은 세 칸이 역할이 같아서
   * 대신 '무엇을 누르는지'와 '칸이 무엇을 말해 주는지'가 적혀 있어야 해요. */
  PS.V.localStorage.removeItem(R.READY_KEY);
  const dashHTML = PS.trial("dash", DASH_OPT, 1, null, { noStart: true }).readyHTML;
  for (const btn of [DASH_OPT.goText, DASH_OPT.stopText]) {
    const desc = keyDesc(dashHTML, btn);
    check(desc.length >= 10, `🏃 홈 승부 — "${btn}"이 무엇을 하는지 적혀 있다 ("${desc}")`);
  }
  const mindHTML = PS.trial("mind", MIND_OPT, 1, null, { noStart: true }).readyHTML;
  check(keyDesc(mindHTML, R.MIND_COURSES.join(" · ")).length >= 10,
    `🎯 수싸움 — 세 칸이 무엇인지 적혀 있다 ("${keyDesc(mindHTML, R.MIND_COURSES.join(" · "))}")`);
  check(/기색 막대/.test(mindHTML) && keyDesc(mindHTML, "기색 막대 · ●").length >= 10,
    `🎯 수싸움 — 기색 막대와 내 자국(●)이 무엇인지도 적혀 있다`);
  /* 🕒 준비 화면이 "시간 제한이 없다"를 **말로** 해 줘야 해요. 화면에서 물건을
   * 치우는 것만으로는 앞 메커닉에 데인 사람의 기대가 안 풀려요. */
  check(/제한 시간도 없어요/.test(mindHTML),
    "🎯 수싸움 — 준비 화면이 '제한 시간이 없다'고 분명히 말한다");

  /* ④ 여러 번 본 뒤에는 설명이 짧아져요. 줄어드는 건 설명의 길이지 시작
   * 버튼이 아니에요 — 준비 화면 자체는 계속 떠야 해요. */
  PS.V.localStorage.removeItem(R.READY_KEY);
  const shots = [];
  for (let i = 0; i < R.FULL_SHOWS + 3; i++) {
    shots.push(PS.trial("mind", MIND_OPT, 1, null, { noStart: true }));
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
  check(R.FULL_SHOWS >= 1 && R.FULL_SHOWS <= 5,
    `전문을 펴 보이는 횟수가 한 손 안이다 (${R.FULL_SHOWS}번)`);
  check(Object.keys(R.readSeen()).every((k) => ["mind", "dash"].includes(k)),
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
 * ⏱️ 🎯 수싸움 — "언제 누르지?"가 생길 자리가 없는가
 *
 * 이게 이번 교체의 본체예요. 앞 메커닉(🧊 볼카운트)은 판단 게임인데 화면이
 * 타이밍 게임이라, 준비 화면을 붙이고 스윙 타이밍을 판정에 넣어도 끝내
 * "언제 눌러야 할지 모르겠다"가 안 없어졌어요.
 *
 * 그래서 여기서는 **기대를 만들 물건 자체가 없다**를 원인 쪽에서 못 박아요.
 *   ① 판 내내 requestAnimationFrame을 한 번도 안 부른다 (움직이는 게 없어요)
 *   ② 손을 놓고 있으면 화면이 한 글자도 안 바뀐다 (0.3초 뒤 = 12초 뒤)
 *   ③ **같은 판을 언제 고르든 결과가 같다** — 0.04초에 고른 사람과 5초에 고른
 *      사람의 판정 분포가 판마다 하나도 안 어긋나요
 *   ④ 화면 어디에도 남은 시간을 세는 물건이 없다
 * ================================================================ */
group("⏱️ 🎯 수싸움 — 시간이 결과에 안 들어가는가");
guard("시간 무관", () => {
  const O = { label: "t", zonePct: 30, tier: 0 };

  // ① 프레임 루프를 아예 안 돌려요
  let rafSum = 0;
  for (let i = 0; i < 40; i++) rafSum += PS.trial("mind", O, 100 + i, null, { stopAt: 12000 }).rafs;
  check(rafSum === 0, `판이 열려 있는 내내 requestAnimationFrame을 한 번도 안 부른다 (${rafSum}회)`);
  const dashRaf = PS.trial("dash", DASH_OPT, 1, null, { stopAt: 1200 }).rafs;
  check(dashRaf > 0, `견줌: 🏃 홈 승부는 같은 잣대로 프레임을 돌린다 (${dashRaf}회) — 잣대가 살아 있어요`);

  // ② 손을 놓고 있으면 화면이 한 글자도 안 바뀌어요
  let same = 0;
  for (let i = 0; i < 20; i++) {
    const a = PS.trial("mind", O, 200 + i, null, { stopAt: 300 });
    const b = PS.trial("mind", O, 200 + i, null, { stopAt: 12000 });
    if (a.left === b.left && /pm-board/.test(a.left)) same++;
  }
  check(same === 20, `0.3초 뒤 화면과 12초 뒤 화면이 글자까지 같다 (${same}/20판)`);

  /* ③ 언제 누르든 결과가 같아요. 같은 씨앗·같은 전략으로 **고르는 시각만** 바꿔
   * 두 번 세워요. 손이 흔들리지 않는 사람(pnoise 0)이라 난수도 안 갈려서, 결과가
   * 다르면 그건 오롯이 시각 때문이에요. */
  const STEADY = { think: 40, trust: 1.0, memo: 0.30, pnoise: 0 };
  const SLOWH = { think: 4200, trust: 1.0, memo: 0.30, pnoise: 0 };
  for (const aim of ["match", "dodge"]) {
    let diff = 0, fastDur = 0, slowDur = 0;
    const N = 120;
    for (let i = 0; i < N; i++) {
      const f = mindAs(30, 1, 300 + i, STEADY, aim);
      const s = mindAs(30, 1, 300 + i, SLOWH, aim);
      if (f.res !== s.res) diff++;
      fastDur += f.endedAt; slowDur += s.endedAt;
    }
    check(diff === 0,
      `${aim === "match" ? "타자" : "투수"} — 0.04초에 고른 판과 4.2초에 고른 판의 결과가 하나도 안 다르다 (${diff}/${N}판)`);
    console.log(`   ${aim === "match" ? "타자" : "투수"} 같은 판, 고르는 시각만 다르게 | 빠른 손 ${(fastDur / N / 1000).toFixed(2)}초 · 느린 손 ${(slowDur / N / 1000).toFixed(2)}초 · 결과 차이 0판`);
  }

  /* ④ 화면에 남은 시간을 세는 물건이 없어요. 진행 막대·초읽기·깜빡임이 있으면
   * 그 자체가 "언제 누르지?"예요 — 앞 메커닉의 판독 게이지가 정확히 그거였어요. */
  const shot = PS.trial("mind", O, 7, null, { stopAt: 500 });
  check(!/ps-track|tm-bar|tm-zone|tm-fill/.test(shot.left),
    "화면에 시간을 세는 물건이 하나도 없다 (진행 막대·판독 게이지 없음)");
  /* 규칙만 잘라 봐요 — 머리말 주석에 "transition조차 안 걸어요"라고 적어 뒀거든요.
   * 첫 규칙(.pm-head)부터 시작해서 남은 주석도 마저 걷어내요. */
  const pmCss = (CSS_SRC.split(".pm-head {")[1] || "").split("/* 판정 한 줄")[0]
    .replace(/\/\*[\s\S]*?\*\//g, "");
  check(pmCss.length > 200 && !/transition|animation/.test(pmCss),
    "🎯 수싸움 CSS에 움직이는 효과가 없다 (transition·animation 없음)");
});

/* ================================================================
 * 🔎 찍기가 아니라 읽기인가 — 기색(버릇)과 적응
 *
 *   ① 상대에게 **버릇**이 있다 — 세 칸이 균등하지 않아요
 *   ② 그 버릇이 기색 막대로 **보인다**, 그리고 능력치가 높을수록 더 맞아요
 *   ③ 내가 고른 자국이 화면에 남고, 상대가 **그 칸을 피한다**(투수면 노려요)
 *   ④ 그래서 같은 칸만 거듭 고르면 실제로 나빠진다
 * ================================================================ */
group("🔎 기색(버릇)과 적응");
guard("읽기", () => {
  const q = (sel) => PS.V.document.querySelector(sel);
  const barsNow = () => Array.prototype.slice.call(PS.V.document.querySelectorAll(".pm-col"))
    .map((c) => pctOf(c.querySelector(".pm-gauge i").style.height));

  // ① 한 칸은 반드시 가장 진해요 (막대가 셋 다 같으면 읽을 것이 없어요)
  {
    let flat = 0;
    for (let i = 0; i < 40; i++) {
      PS.trial("mind", { label: "t", zonePct: 40, tier: 0 }, 500 + i, null, { stopAt: 200 });
      const b = barsNow();
      if (b.length !== 3 || Math.max(...b) - Math.min(...b) < 5) flat++;
    }
    check(flat === 0, `눈이 좋으면 칸마다 기색이 뚜렷이 갈린다 (셋이 붙어 있던 판 ${flat}/40)`);
    check(/🔥/.test(PS.V.document.querySelector(".tm-box").innerHTML),
      "가장 진한 칸에 표식(🔥)이 붙는다 — 막대를 못 재는 사람도 알아볼 수 있어요");
  }

  /* ② 능력치가 높을수록 기색이 진짜 성향에 가까워요. 화면에서 가장 진한 칸을
   * 골랐을 때 실제로 맞는 비율로 재요 — 이게 곧 "읽을 수 있는 정도"예요.
   * 산식(mindRead)이 아니라 **화면과 결과**로 재는 게 요점이에요. */
  const TOP = { think: 20, trust: 1.0, memo: 0, pnoise: 0 };   // 오직 가장 진한 칸만 골라요
  const hitRate = (zone, tier) => {
    const d = dist(260, (s) => mindAs(zone, tier, s, TOP, "match"));
    return d;
  };
  const lowD = hitRate(30, 0), midD = hitRate(35, 0), hiD = hitRate(40, 0);
  const deepD = hitRate(40, 2);
  console.log(`   가장 진한 칸만 고르는 사람 | 존30 P${pct(lowD.p)} · 존35 P${pct(midD.p)} · 존40 P${pct(hiD.p)} · 존40(마지막 시리즈) P${pct(deepD.p)}`);
  check(hiD.p > lowD.p + 0.12,
    `능력치가 높을수록 기색이 실제로 맞는다 (존30 P${pct(lowD.p)} → 존40 P${pct(hiD.p)})`);
  check(midD.p > lowD.p && hiD.p > midD.p,
    `가운데 칸도 순서대로다 (${pct(lowD.p)} → ${pct(midD.p)} → ${pct(hiD.p)})`);
  check(deepD.p < hiD.p,
    `시리즈가 깊으면 같은 능력치로도 덜 보인다 (존40 tier0 ${pct(hiD.p)} → tier2 ${pct(deepD.p)})`);
  /* 능력치가 낮으면 정말로 안 보여요 — 기색을 따라가도 찍기와 비슷해야 해요.
   * (그래도 아래 ④가 보여주듯 '적응'은 능력치 없이도 읽을 수 있어요.) */
  const blind = dist(260, (s) => PS.trial("mind", { label: "t", zonePct: 30, tier: 2 }, s,
    (wrap, now, fire) => {
      const cols = wrap.querySelectorAll(".pm-col");
      if (!cols.length || cols[0].disabled) return;
      fire(cols[Math.floor(plyRnd() * cols.length)]);
    }, MIND_WATCH));
  console.log(`   견줌: 아무 칸이나 찍는 사람 | P${pct(blind.p)} M${pct(blind.m)} 배수 ${mult(blind).toFixed(3)}`);
  check(Math.abs(lowD.p - blind.p) < 0.12,
    `능력치가 바닥이면 기색을 따라가도 찍기와 비슷하다 (존30 P${pct(lowD.p)} vs 찍기 P${pct(blind.p)})`);

  /* ③ 내가 고른 자국이 화면에 남고, 상대의 성향이 그만큼 기울어요.
   * 화면(●)과 산식(odds)이 같은 이야기를 하는지를 여기서 봐요. */
  {
    // 한 칸(0번)만 두 번 고른 뒤의 화면을 그대로 들여다봐요
    PS.trial("mind", { label: "t", zonePct: 40, tier: 0 }, 909,
      (wrap, now, fire) => {
        const cols = wrap.querySelectorAll(".pm-col");
        if (!cols.length || cols[0].disabled) return;
        fire(cols[0]);
      }, Object.assign({}, MIND_WATCH, { stopAt: 1100 }));
    const marks = Array.prototype.slice.call(PS.V.document.querySelectorAll(".pm-mine"))
      .map((e) => (e.textContent.match(/●/g) || []).length);
    check(marks[0] >= 1 && marks[1] === 0 && marks[2] === 0,
      `내가 고른 칸에만 자국(●)이 쌓인다 (${marks.join(" · ")})`);
  }
  /* ④ 적응이 **정말로 도는가** — 같은 씨앗으로 첫 구만 다르게 골라서, 둘째 구의
   * 기색을 나란히 놓고 봐요. 상대의 버릇도 난수도 완전히 같고 **내가 어디를
   * 골랐는지만** 달라요. 그런데도 기색이 갈리면, 갈린 몫은 오롯이 적응이에요.
   *   타자(match) — 내가 간 칸을 상대가 피해요 → 그 칸의 기색이 **내려가야** 해요
   *   투수(dodge) — 타자가 내가 던진 칸을 노려요 → **올라가야** 해요
   * (성적으로만 재면 안 돼요. 한 칸만 고르는 사람은 적응이 없어도 '버릇에 얻어걸리거나
   *  통째로 빗나가거나'로 갈려서 성적이 나빠지거든요 — 적응이 아니라 분산이에요.) */
  {
    const alwaysPick = (i) => (wrap, now, fire) => {
      const cols = wrap.querySelectorAll(".pm-col");
      if (!cols.length || cols[0].disabled) return;
      fire(cols[i]);
    };
    const barAt = (aim, pickIdx, seed) => {
      PS.trial("mind", { label: "t", zonePct: 40, tier: 0, aim }, seed, alwaysPick(pickIdx),
        Object.assign({}, MIND_WATCH, { stopAt: 620 }));      // 2구가 그려진 직후예요
      const col = PS.V.document.querySelector('.pm-col[data-i="0"] .pm-gauge i');
      return col ? pctOf(col.style.height) : null;
    };
    for (const aim of ["match", "dodge"]) {
      let mineSum = 0, otherSum = 0, n = 0;
      for (let i = 0; i < 120; i++) {
        const a = barAt(aim, 0, 700 + i), b = barAt(aim, 1, 700 + i);
        if (a == null || b == null) continue;
        mineSum += a; otherSum += b; n++;
      }
      const mineAvg = mineSum / n, otherAvg = otherSum / n;
      const name = aim === "match" ? "타자" : "투수";
      console.log(`   ${name} 적응 | 첫 구에 그 칸을 고른 판의 2구 기색 ${mineAvg.toFixed(1)} · 다른 칸을 고른 판 ${otherAvg.toFixed(1)} (${n}쌍)`);
      const moved = aim === "match" ? otherAvg - mineAvg : mineAvg - otherAvg;
      check(moved > 4,
        `${name} — 내가 고른 칸을 상대가 ${aim === "match" ? "피한다" : "노린다"} (기색이 ${moved.toFixed(1)}만큼 ${aim === "match" ? "내려가요" : "올라가요"})`);
    }
  }

  /* ⑤ 그래서 한 칸만 거듭 고르면 나빠져요. 능력치를 최대로 줘도 그래야 해요 —
   * "읽기"가 아니라 "버티기"로는 못 이긴다는 뜻이니까요. */
  const ONE = (aim) => dist(300, (s) => PS.trial("mind", { label: "t", zonePct: 40, tier: 0, aim }, s,
    (wrap, now, fire) => {
      const cols = wrap.querySelectorAll(".pm-col");
      if (!cols.length || cols[0].disabled) return;
      fire(cols[0]);
    }, MIND_WATCH));
  const RND = (aim) => dist(300, (s) => PS.trial("mind", { label: "t", zonePct: 40, tier: 0, aim }, s,
    (wrap, now, fire) => {
      const cols = wrap.querySelectorAll(".pm-col");
      if (!cols.length || cols[0].disabled) return;
      fire(cols[Math.floor(plyRnd() * cols.length)]);
    }, MIND_WATCH));
  for (const aim of ["match", "dodge"]) {
    const one = ONE(aim), rnd = RND(aim);
    console.log(`   ${aim === "match" ? "타자" : "투수"} 한 칸만 거듭 | 배수 ${mult(one).toFixed(3)} (M${pct(one.m)}) · 아무 칸이나 ${mult(rnd).toFixed(3)} (M${pct(rnd.m)})`);
    check(mult(one) < mult(rnd) - 0.05,
      `${aim === "match" ? "타자" : "투수"} — 같은 칸만 거듭 고르면 찍는 것보다도 나쁘다 (${mult(one).toFixed(3)} < ${mult(rnd).toFixed(3)})`);
  }
});

/* ================================================================
 * ✋ 탭 누수 — 한 번의 탭이 두 번 먹히면 안 돼요
 *
 * 실기기 한 번의 탭은 이벤트를 **셋** 보내요 — pointerdown → pointerup → click.
 * ▶️ 시작은 pointerdown에서 처리해요(누르자마자 화면이 바뀌어야 하니까요). 그
 * 순간 준비 화면이 지워지고 그 자리에 게임 버튼이 그려져요. 그래서 손을 뗄 때 오는
 * click은 **방금 생긴 게임 버튼**에게 가요. 그 버튼에게는 난생처음 오는 입력이라
 * TAP_ECHO 방어에 안 걸려요 — TAP_ECHO는 같은 요소 안의 중복만 막거든요.
 *
 * 여기서 못 박는 건 셋이에요.
 *   ① 시작 제스처(셋 다)를 보내도 게임이 즉시 끝나지 않고 화면이 한 칸도 안 움직인다
 *   ② 그 뒤 **새로 짚은 손가락**은 정상적으로 먹힌다
 *   ③ 마우스 경로(click만 오는 환경)도 똑같다
 * 꼬리가 어느 요소로 새는지는 기기·브라우저마다 달라서, onTap이 걸린 자리를
 * 전부 돌아 봐요.
 * ================================================================ */
group("✋ 탭 누수 (한 번 누른 게 두 번 먹히면 안 돼요)");
guard("탭 누수", () => {
  const OPTS = { mind: MIND_OPT, dash: DASH_OPT };
  /* 시작 제스처의 꼬리가 떨어질 만한 자리 — onTap이 걸린 요소를 전부 적어요.
   * post-stage.js에 onTap이 새로 붙으면 여기도 같이 늘려야 해요. */
  const SPOTS = {
    mind: [['.pm-col[data-i="0"]', "첫 칸"], ['.pm-col[data-i="1"]', "가운데 칸"], ['.pm-col[data-i="2"]', "끝 칸"]],
    dash: [[".ps-go", "돌진 버튼"], [".ps-stop", "멈춰 버튼"]],
  };
  const NAME = { mind: "🎯 수싸움", dash: "🏃 홈 승부" };
  const SNAP = 40;    // 시작 직후의 화면을 찍는 시각(ms)
  const LATER = 240;  // 새 손가락을 짚는 시각(ms)
  const live = (h) => /tm-box/.test(h) && !/tm-done-/.test(h);

  for (const mech of ["mind", "dash"]) {
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

/* 🎯 mind 사람 모델 — **화면만** 보고 골라요.
 *
 *   think  한 구를 정하는 데 걸리는 시간(ms). 판 길이를 재는 데만 써요 —
 *          결과에는 안 들어가요(위 ⏱️ 검사가 그걸 못 박아요).
 *   trust  기색 막대를 얼마나 믿는가 (눈)
 *   memo   내 자국이 상대를 얼마나 기울인다고 보는가 (적응을 아는 정도).
 *          기색이 안 보여도 이건 공짜로 알 수 있어요 — 능력치가 필요 없거든요.
 *   pnoise 손이 흔들리는 폭
 *
 * aim이 "dodge"(투수)면 고르는 방향이 통째로 뒤집혀요 — 진한 칸을 **피하고**,
 * 내가 거듭 던진 칸도 피해요(타자가 거기서 기다리니까요). */
function mindAs(zone, tier, seed, sk, aim) {
  const dodge = aim === "dodge";
  let planAt = 0, planRound = -1;
  return PS.trial("mind", { label: "t", zonePct: zone, tier, aim }, seed, (wrap, now, fire) => {
    const cols = Array.prototype.slice.call(wrap.querySelectorAll(".pm-col"));
    if (!cols.length || cols[0].disabled) return;
    const r = parseInt(wrap.querySelector(".pm-round").textContent, 10);
    if (planRound !== r) { planRound = r; planAt = now + sk.think; }
    if (now < planAt) return;                    // 여기서 손이 나가요 (결과와는 무관해요)
    const sc = cols.map((c, i) => {
      const bar = pctOf(c.querySelector(".pm-gauge i").style.height) / 100;
      const mine = (c.querySelector(".pm-mine").textContent.match(/●/g) || []).length;
      return bar * sk.trust + (dodge ? 1 : -1) * mine * sk.memo + (sk.pnoise ? plyRnd() * sk.pnoise : 0);
    });
    let pick = 0;
    for (let i = 1; i < cols.length; i++) if (dodge ? sc[i] < sc[pick] : sc[i] > sc[pick]) pick = i;
    fire(cols[pick]);
  }, MIND_WATCH);
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



/* ================================================================
 * ③ 도달성 — 진짜 엔진·진짜 시간으로
 * ================================================================ */
group("③ 도달성 (메커닉 자체)");
guard("도달성", () => {
  const GOOD = { think: 900, trust: 1.0, memo: 0.30, pnoise: 0.06 };
  const POOR = { think: 900, trust: 0.0, memo: 0.0, pnoise: 1.0 };
  for (const [name, fn, poorFn] of [
    ["🎯 수싸움", (s) => mindAs(38, 0, s, GOOD, "match"), (s) => mindAs(12, 2, s, POOR, "match")],
    ["🏃 홈 승부", (s) => dashAs(38, 0, s, 160, 60, 90), (s) => dashAs(12, 2, s, 340, -140, 420)],
  ]) {
    const d = dist(200, fn);
    check(d.perfect > 0, `${name} — 잘하면 perfect에 실제로 닿는다 (${pct(d.p)})`);
    check(d.good > 0, `${name} — 성공(good)도 실제로 나온다 (${pct(d.g)})`);
    console.log(`   ${name} 잘하는 사람 | P ${pct(d.p)} · G ${pct(d.g)} · M ${pct(d.m)} · 평균 ${(d.dur / 1000).toFixed(2)}초 · 최장 ${(d.worst / 1000).toFixed(2)}초`);
    const poor = dist(150, poorFn);
    check(poor.miss > 0, `${name} — 못하면 miss가 실제로 난다 (${pct(poor.m)})`);
  }
  // 투수 시점도 따로 봐요 — 유불리가 뒤집히니 도달성도 따로 확인해야 해요
  {
    const d = dist(200, (s) => mindAs(38, 0, s, GOOD, "dodge"));
    check(d.perfect > 0 && d.good > 0,
      `🎯 수싸움(투수 시점) — 완벽과 성공에 둘 다 닿는다 (P ${pct(d.p)} · G ${pct(d.g)} · M ${pct(d.m)})`);
  }
  // 아무것도 안 눌러도 끝나요 (안 그러면 손을 놓은 순간 게임이 멎어요)
  for (const [name, mech, opt] of [["🎯 수싸움", "mind", MIND_OPT], ["🏃 홈 승부", "dash", DASH_OPT]]) {
    let stuck = 0, worst = 0, boxLeft = 0;
    for (let i = 0; i < 40; i++) {
      const r = PS.trial(mech, Object.assign({}, opt, { tier: 2 }), 5000 + i);
      if (r.res == null) stuck++;
      worst = Math.max(worst, r.endedAt);
      if (r.left.trim() !== "") boxLeft++;
    }
    check(stuck === 0, `${name} — 아무것도 안 눌러도 끝난다 (막힌 판 ${stuck})`);
    check(boxLeft === 0, `${name} — 끝나면 상자를 지우고 나간다 (남은 판 ${boxLeft})`);
    console.log(`   ${name} 손 놓기 | 최장 ${(worst / 1000).toFixed(2)}초`);
  }
  /* 한 판이 3~5초예요. 가을야구 한 시리즈에 미니게임이 여러 번이라 길면 그 자체가 버그예요.
   *
   * ⏳ 🎯 수싸움은 **사람이 고민한 시간이 곧 판 길이**라, 엔진 몫과 사람 몫을 갈라 봐요.
   *   · 엔진 몫  = 판정을 보여주는 사이(reveal) + 정리(OUTRO). 사람이 즉시 고른다고 치고 재요.
   *   · 사람 몫  = 한 구를 1초 안에 고르는 사람으로 재요.
   * 엔진 몫이 길면 그건 우리 잘못이고, 사람 몫이 길면 그건 이 메커닉의 성질이에요. */
  const spans = [];
  for (const tier of [0, 1, 2]) {
    for (const zone of [12, 26, 40]) {
      for (const aim of ["match", "dodge"]) {
        spans.push({ kind: "engine", d: dist(40, (s) => mindAs(zone, tier, s, { think: 0, trust: 1, memo: 0.3, pnoise: 0.06 }, aim)) });
        spans.push({ kind: "human", d: dist(40, (s) => mindAs(zone, tier, s, { think: 950, trust: 1, memo: 0.3, pnoise: 0.06 }, aim)) });
      }
      spans.push({ kind: "dash", d: dist(50, (s) => dashAs(zone, tier, s, 200, 50, 150)) });
    }
  }
  const worstOf = (kind) => Math.max(...spans.filter((x) => x.kind === kind).map((x) => x.d.dur));
  const peakOf = (kind) => Math.max(...spans.filter((x) => x.kind === kind).map((x) => x.d.worst));
  console.log(`   한 판 길이 | 🎯 엔진 몫 ${(worstOf("engine") / 1000).toFixed(2)}초 · 🎯 사람 몫(구당 0.95초) ${(worstOf("human") / 1000).toFixed(2)}초 · 🏃 ${(worstOf("dash") / 1000).toFixed(2)}초`);
  check(worstOf("engine") <= 2600,
    `🎯 엔진이 붙드는 시간이 2.6초 안이다 (${(worstOf("engine") / 1000).toFixed(2)}초 · reveal ${T.MIND.reveal}ms × ${T.MIND.rounds}구)`);
  check(worstOf("human") <= 5000 && peakOf("human") <= 6500,
    `🎯 한 구를 1초 안에 고르면 평균 5초·최장 6.5초 안에 끝난다 (${(worstOf("human") / 1000).toFixed(2)}초 · ${(peakOf("human") / 1000).toFixed(2)}초)`);
  check(worstOf("dash") <= 5000 && peakOf("dash") <= 6500,
    `🏃 한 판 평균이 5초, 가장 오래 끈 판도 6.5초 안이다 (${(worstOf("dash") / 1000).toFixed(2)}초 · ${(peakOf("dash") / 1000).toFixed(2)}초)`);
});

/* ================================================================
 * ④ 난이도 — 능력치·시리즈 깊이가 실제로 들어가는가
 *   그리고 기존 8종을 같은 사람 모델로 같이 재요 (도입 전 기준선)
 * ================================================================ */
group("④ 난이도");

/* 🎯 수싸움도 🏃 홈 승부도 **가을야구에서만** 나와요. 거기 서는 선수는
 * miniZone(stat)이 30~40이라, 그 구간을 재야 육성이 닿는지 알 수 있어요. */
const ZONES = [30, 35, 40];
const AIMS = ["match", "dodge"];
/* rnd는 **이 사람 몫의 난수 씨앗**이에요. 한 줄기를 셋이 이어 쓰면 앞사람이 몇 번
 * 뽑았느냐에 따라 뒷사람 숫자가 통째로 흔들려요 — 아무것도 안 바꾼 칸의 값이
 * 움직여서 실행끼리 나란히 놓고 볼 수 없게 돼요. 사람마다 씨앗을 따로 줘요.
 *
 * lag·tsig·mem·find는 🏃 홈 승부와 기존 8종용, think·trust·memo·pnoise는
 * 🎯 수싸움용이에요.
 *
 * 🐢 느린손은 **읽는 눈이 '보통'과 똑같고 손만 느려요**(think 2.6초). 수싸움에서는
 * 그래서 '보통'과 성적이 같아야 해요 — 손 속도가 판정에 안 들어가니까요.
 * 앞 메커닉(🧊 볼카운트)에서는 바로 이 사람이 마지막 시리즈에서 70% 삼진으로
 * 무너졌어요. 그 자리를 여기서 다시 봐요. */
const SKILL = { name: "능숙", rnd: 20260801, lag: 160, margin: 60, dsigma: 90, mem: 0.94, find: 900, tsig: 55, think: 800, trust: 1.00, memo: 0.30, pnoise: 0.06 };
const AVG = { name: "보통", rnd: 20260802, lag: 240, margin: 40, dsigma: 220, mem: 0.82, find: 1500, tsig: 110, think: 1300, trust: 0.72, memo: 0.18, pnoise: 0.34 };
const SLOW = { name: "느린손", rnd: 20260803, lag: 300, margin: 30, dsigma: 300, mem: 0.74, find: 1900, tsig: 150, think: 2600, trust: 0.72, memo: 0.18, pnoise: 0.34 };
const PROFILES = [SKILL, AVG, SLOW];
const DN = Number(process.env.POST_N || 90);

// [skill][aim][tier][zone] → 두 메커닉을 합친 판정 분포
const NEWTAB = {};
guard("새 2종 난이도", () => {
  for (const sk of PROFILES) {
    plyRnd = mulberry32(sk.rnd);        // 이 사람 몫의 줄기 — 옆 사람에게 안 새요
    NEWTAB[sk.name] = { match: {}, dodge: {} };
    for (const tier of [0, 1, 2]) {
      for (const aim of AIMS) NEWTAB[sk.name][aim][tier] = {};
      for (const zone of ZONES) {
        /* 🏃 홈 승부는 시점이 바뀌어도 코드가 같아요(문구만 갈아끼워요) —
         * 그래서 한 번만 재서 양쪽에 같이 써요. 🎯 수싸움은 유불리가 통째로
         * 뒤집히니 시점마다 따로 재요. */
        const b = dist(DN, (s) => dashAs(zone, tier, s, sk.lag, sk.margin, sk.dsigma));
        for (const aim of AIMS) {
          const a = dist(DN, (s) => mindAs(zone, tier, s, sk, aim));
          NEWTAB[sk.name][aim][tier][zone] = {
            p: (a.p + b.p) / 2, g: (a.g + b.g) / 2, m: (a.m + b.m) / 2,
            mind: a, dash: b,
          };
        }
      }
    }
  }
  for (const sk of PROFILES) {
    for (const aim of AIMS) {
      for (const tier of [0, 1, 2]) {
        const row = (key) => ZONES.map((z) => {
          const d = key ? NEWTAB[sk.name][aim][tier][z][key] : NEWTAB[sk.name][aim][tier][z];
          return `존${z} P${pct(d.p)} M${pct(d.m)} 배수 ${mult(d).toFixed(3)}`;
        }).join(" · ");
        console.log(`   ${sk.name} ${aim === "match" ? "타자" : "투수"} tier${tier} 합침 | ${row(null)}`);
        console.log(`   ${sk.name} ${aim === "match" ? "타자" : "투수"} tier${tier} 🎯만 | ${row("mind")}`);
      }
    }
  }
  /* 🐢 손이 느린 사람 — 이 줄이 이번 교체의 안전선이에요.
   * 🎯 수싸움에서는 손 속도가 판정에 안 들어가니, 읽는 눈이 같은 '보통'과
   * 성적이 붙어 있어야 해요. 앞 메커닉에서는 여기가 70% 삼진이었어요. */
  {
    const cells = (name) => [0, 1, 2].map((t) => AIMS.map((a) => ZONES.map((z) => NEWTAB[name][a][t][z].mind)))
      .reduce((x, y) => x.concat(y), []).reduce((x, y) => x.concat(y), []);
    const slow = cells(SLOW.name), avg = cells(AVG.name);
    const meanM = (arr) => arr.reduce((a, d) => a + d.m, 0) / arr.length;
    const worstM = Math.max(...slow.map((d) => d.m));
    console.log(`   🐢 손이 느린 사람의 🎯 수싸움 | 평균 실패 ${pct(meanM(slow))} · 가장 나쁜 칸 ${pct(worstM)} (읽는 눈이 같은 '보통'은 평균 ${pct(meanM(avg))})`);
    check(worstM <= 0.5,
      `🐢 손이 느려도 어느 칸에서든 절반 넘게 무너지지는 않는다 (가장 나쁜 칸 ${pct(worstM)})`);
    check(Math.abs(meanM(slow) - meanM(avg)) < 0.06,
      `🐢 손 속도는 🎯 수싸움 성적에 안 들어간다 (느린손 ${pct(meanM(slow))} vs 보통 ${pct(meanM(avg))})`);
  }
  /* 능력치를 올리면 나아져요. 양 끝만 못 박아요 — 표본이 유한해서(칸마다
   * POST_N판) 가운데 칸은 ±0.03쯤 흔들려요. 한 계단씩 못 박으면 난이도가
   * 아니라 난수를 재게 돼요.
   *
   * 메커닉 하나씩은 **완벽(perfect)이 나오는 비율**로 봐요. 🏃 홈 승부는 잘하면
   * 멈춰서 성공(good)을 챙길 수 있어서, 능력치가 낮아도 배수가 1.00 근처에
   * 머물러요 — 능력치가 실제로 사는 자리는 "정말로 홈을 밟느냐"거든요. */
  const bad = [];
  const lowZ = ZONES[0], hiZ = ZONES[ZONES.length - 1];
  for (const sk of [SKILL, AVG]) {
    for (const aim of AIMS) {
      for (const tier of [0, 1, 2]) {
        for (const key of ["mind", "dash"]) {
          const a = NEWTAB[sk.name][aim][tier][lowZ][key].p, b = NEWTAB[sk.name][aim][tier][hiZ][key].p;
          if (!(b > a)) bad.push(`${sk.name}/${aim}/tier${tier}/${key} ${pct(a)}→${pct(b)}`);
        }
        const a = mult(NEWTAB[sk.name][aim][tier][lowZ]), b = mult(NEWTAB[sk.name][aim][tier][hiZ]);
        if (!(b > a)) bad.push(`${sk.name}/${aim}/tier${tier}/합침 ${a.toFixed(3)}→${b.toFixed(3)}`);
      }
    }
  }
  check(bad.length === 0, `능력치를 올리면 두 메커닉 다 성적이 오른다 (거꾸로 간 칸 ${bad.join(" · ") || "없음"})`);
  /* 능력치가 실제로 뜻 있게 갈라야 해요 (모든 칸이 똑같으면 육성이 안 닿아요).
   * 칸 하나는 표본이 흔들리니 열두 칸(손끝 2 × 시점 2 × 시리즈 깊이 3)의 평균으로 봐요. */
  const gaps = [];
  for (const sk of [SKILL, AVG]) {
    for (const aim of AIMS) {
      for (const tier of [0, 1, 2]) {
        gaps.push(mult(NEWTAB[sk.name][aim][tier][hiZ]) - mult(NEWTAB[sk.name][aim][tier][lowZ]));
      }
    }
  }
  const gapMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  check(gapMean >= 0.03 && Math.min(...gaps) > 0,
    `능력치 ${lowZ}→${hiZ}이 배수를 평균 0.03 넘게 벌린다 (평균 ${gapMean.toFixed(3)} · 가장 좁은 칸 ${Math.min(...gaps).toFixed(3)})`);
  NEWTAB.__gap = gapMean;
  // 시리즈가 깊어질수록 어려워져요 (여기도 양 끝만 봐요)
  const up = [];
  for (const sk of [SKILL, AVG]) {
    for (const aim of AIMS) {
      for (const zone of ZONES) {
        const a = mult(NEWTAB[sk.name][aim][0][zone]), b = mult(NEWTAB[sk.name][aim][2][zone]);
        if (!(b < a)) up.push(`${sk.name}/${aim}/존${zone} ${a.toFixed(3)}→${b.toFixed(3)}`);
      }
    }
  }
  check(up.length === 0, `마지막 시리즈가 와일드카드보다 어렵다 (거꾸로 간 칸 ${up.join(" · ") || "없음"})`);
  // 대충 하면 벌을 받아요 — 이게 없으면 메커닉이 장식이에요
  const rush = dist(150, (s) => PS.trial("dash", { label: "t", zonePct: 38, tier: 0 }, s, (w, n, fire) => fire(".ps-go")));
  const froze = dist(150, (s) => PS.trial("dash", { label: "t", zonePct: 38, tier: 0 }, s));
  check(mult(froze) < mult(rush),
    `🏃 아무것도 안 고르는 게 무작정 돌진보다 나쁘다 (${mult(froze).toFixed(3)} < ${mult(rush).toFixed(3)}) — 고르지 않는 것이 최악이에요`);
  console.log(`   🏃 무작정 돌진 배수 ${mult(rush).toFixed(3)} · 손 놓기 ${mult(froze).toFixed(3)}`);
  for (const aim of AIMS) {
    const idle = dist(80, (s) => PS.trial("mind", { label: "t", zonePct: 38, tier: 0, aim }, s));
    const best = NEWTAB[SKILL.name][aim][0][hiZ].mind;
    check(mult(idle) < mult(best) - 0.10,
      `🎯 ${aim === "match" ? "타자" : "투수"} — 손 놓기(${mult(idle).toFixed(3)})가 읽는 사람(${mult(best).toFixed(3)})보다 확실히 나쁘다`);
  }
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
      OLDTAB[sk.name][stat] = old8(stat, zone, sk, Math.max(60, DN));
    }
    console.log(`   기존 8종 ${sk.name} | ${[70, 110, 150].map((st) =>
      `능력치${st} P${pct(OLDTAB[sk.name][st].p)} M${pct(OLDTAB[sk.name][st].m)} 배수 ${mult(OLDTAB[sk.name][st]).toFixed(3)}`).join(" · ")}`);
  }
  /* 기존 8종은 프로 능력치에서 거의 다 perfect예요 — 그래서 가을야구가 5월과
   * 손맛이 같았어요. 새 2종이 그보다 능력치에 더 민감해야 만든 뜻이 있어요. */
  const oldGaps = [SKILL.name, AVG.name].map((n) => mult(OLDTAB[n][150]) - mult(OLDTAB[n][70]));
  const oldGap = oldGaps.reduce((a, b) => a + b, 0) / oldGaps.length;
  const newGap = NEWTAB.__gap;
  console.log(`   능력치가 벌리는 폭 | 기존 8종 ${oldGap.toFixed(3)} · 새 2종 ${newGap.toFixed(3)}`);
  check(newGap > oldGap,
    `새 2종이 기존 8종보다 능력치에 더 민감하다 (${newGap.toFixed(3)} > ${oldGap.toFixed(3)})`);
  console.log(`   기존 8종은 프로 능력치에서 거의 다 완벽이에요 (능력치 150 · 완벽 ${
    [SKILL.name, AVG.name].map((n) => pct(OLDTAB[n][150].p)).join(" / ")} · miss ${
    [SKILL.name, AVG.name].map((n) => pct(OLDTAB[n][150].m)).join(" / ")})`);
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
  const send = (el, type) => {
    if (el) el.dispatchEvent(new w.Event(type, { bubbles: true, cancelable: true }));
  };
  /* 🧭 준비 화면이 떠 있으면 ▶️ 시작을 눌러요 — 사람이 하는 그대로예요.
   * 새 2종은 이 버튼을 누르기 전에 타이머를 한 개도 안 걸어서, 안 눌러 주면
   * 가상 시계를 아무리 돌려도 경기가 그 자리에 멈춰 있어요. */
  const ready = { taps: 0, after: null };
  const tapReady = () => {
    const holder = w.document.querySelector(".mg-ready");
    if (!holder) return false;
    const parent = holder.parentNode;               // 본 게임 상자가 붙을 자리예요
    ready.taps++;
    /* ✋ 실기기 순서를 그대로 보내요 — pointerdown → pointerup → click. */
    send(holder.querySelector(".mg-go"), "pointerdown");
    const tail = parent && parent.querySelector(".tm-box .tm-btn");
    send(tail, "pointerup");
    send(tail, "click");
    if (ready.after) ready.after(parent);           // 누른 직후의 화면을 보고 싶을 때
    return true;
  };
  /* 🎯 수싸움은 **사람이 고르기 전까지 아무 일도 안 일어나요.** 그래서 여기서도
   * 사람처럼 칸 하나를 눌러 줘야 경기가 이어져요. 안 눌러 주면 15초짜리 안전망이
   * 걷어 줄 때까지 판이 그대로 서 있어요 — 그게 바로 "시간 제한이 없다"의 값이에요.
   * 눌린 판 수는 mind.taps로 세요. */
  const mind = { taps: 0 };
  const tapMind = () => {
    const col = w.document.querySelector(".pm-col:not([disabled])");
    if (!col) return false;
    mind.taps++;
    send(col, "pointerdown"); send(col, "pointerup"); send(col, "click");
    return true;
  };
  const pump = (max) => {
    const cap = max || 60000;
    let n = 0;
    while (n < cap) {
      if (!vt.length) { if (!tapReady() && !tapMind()) break; continue; }
      if ((n & 511) === 0) { tapReady(); tapMind(); }
      n++;
      vt.sort((a, b) => a.at - b.at);
      const ev = vt[0];
      /* 다음 일이 한참 뒤라면 게임이 **사람을 기다리는 중**이에요 — 🎯 수싸움에
       * 남은 것이 15초짜리 안전망뿐인 자리예요. 그때만 화면을 뒤져서 눌러 줘요.
       * 매 걸음 DOM을 뒤지면 한 시즌 굴리는 데 몇 분씩 걸려요. */
      if (ev.at - VT > 4000 && (tapReady() || tapMind())) continue;
      VT = ev.at;
      if (ev.rep) ev.at = VT + ev.rep; else vt.shift();
      ev.fn();
    }
  };
  return { dom, w, pump, ready, mind, $: (id) => w.document.getElementById(id), get: w.__get, set: w.__set };
}

const G = bootGame();
const Career = G.w.Career;
const active = () => (G.w.document.querySelector(".screen.active") || {}).id;

/* 프로 선수 한 명을 세우고, 정규시즌을 마지막 한 경기만 남긴 자리에 놓아요.
 * 승패는 실제 산식(teamWinP·팀 전력)으로 굴려서 순위(시드)가 저절로 나와요. */
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
   * 🧭 이제 부르자마자 그려지는 건 준비 화면이에요. 본 게임 화면(.pm-board·.ps-field)은
   * ▶️ 시작을 누른 뒤에야 생기니, 그건 tapReady가 누른 직후에(ready.after) 봐요. */
  const drawn = { ready: 0, early: 0, board: 0, field: 0, inMoment: 0, other: 0 };
  const spy = (real, bag, watchDom) => new Proxy(real, {
    get(t, k) {
      const v = t[k];
      if (typeof v !== "function" || k === "constructor") return v;
      return (...a) => {
        bag.push(k);
        const out = v.apply(t, a);
        if (watchDom && a[0] && a[0].querySelector) {
          if (a[0].querySelector(".mg-ready")) drawn.ready++;
          if (a[0].querySelector(".pm-board") || a[0].querySelector(".ps-field")) drawn.early++;
          if (a[0].id === "game-moment") drawn.inMoment++;
        }
        return out;
      };
    },
  });
  G.ready.after = (parent) => {
    if (!parent || !parent.querySelector) return;
    if (parent.querySelector(".pm-board")) drawn.board++;
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

  /* 가을야구 — 같은 선수를 시즌 끝에 놓고 굴려요. */
  let inPost = false;
  const postSeen = { post: 0, timing: 0, kinds: new Set() };
  const hookLen = { post: 0, timing: 0 };
  const readyBefore = G.ready.taps, mindBefore = G.mind.taps;
  setupPro({ pos: "batter", stat: 140 });
  seen.post.length = 0; seen.timing.length = 0;
  const r = runToReport((st) => {
    if (!inPost && st.post && st.post.myRound) {
      inPost = true;
      hookLen.post = seen.post.length; hookLen.timing = seen.timing.length;
    }
  });
  postSeen.post = seen.post.length - hookLen.post;
  postSeen.timing = seen.timing.length - hookLen.timing;
  for (const k of seen.post.slice(hookLen.post)) postSeen.kinds.add(k);
  check(r.entered, "가을야구까지 실제로 들어갔다");
  check(postSeen.post > 0, `가을야구에서 새 메커닉이 뜬다 (${postSeen.post}판 · ${[...postSeen.kinds].join(" · ")})`);
  check(postSeen.timing === 0, `가을야구에는 기존 8종이 안 뜬다 (${postSeen.timing}판)`);
  check(postSeen.kinds.size === 2, `두 메커닉이 다 나온다 (${[...postSeen.kinds].join(" · ")})`);
  check(drawn.board > 0 && drawn.field > 0 && drawn.other === 0,
    `▶️ 시작을 누르면 두 메커닉 다 실제 DOM을 그린다 (🎯 세 칸 ${drawn.board}판 · 🏃 주루로 ${drawn.field}판 · 못 그린 판 ${drawn.other})`);
  check(drawn.inMoment === drawn.board + drawn.field,
    `미니게임이 경기 화면의 #game-moment 안에 붙는다 (${drawn.inMoment}/${drawn.board + drawn.field}판)`);
  const readyTaps = G.ready.taps - readyBefore;
  check(drawn.ready === postSeen.post,
    `가을야구 미니게임은 판마다 준비 화면을 먼저 띄운다 (${postSeen.post}판 · 준비 화면 ${drawn.ready}판)`);
  check(drawn.early === 0,
    `준비 화면을 누르기 전에는 본 게임 화면이 안 그려진다 (미리 그려진 판 ${drawn.early})`);
  check(readyTaps === postSeen.post,
    `그 준비 화면을 사람이 하나하나 눌러서 경기가 이어졌다 (${readyTaps}회)`);
  /* 🎯 수싸움은 사람이 칸을 고를 때까지 아무 일도 안 일어나요 — 진짜 화면에서도
   * 그런지 봐요. 안 눌러 줬는데도 판이 넘어갔다면 어딘가에서 시계가 도는 거예요. */
  check(G.mind.taps - mindBefore >= drawn.board,
    `🎯 수싸움은 진짜 화면에서도 사람이 칸을 골라야 넘어간다 (${G.mind.taps - mindBefore}번 골랐어요 · ${drawn.board}판)`);
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
  check(G.ready.taps === autoReadyBefore,
    `자동 판정이면 준비 화면도 한 번을 안 뜬다 (${G.ready.taps - autoReadyBefore}회)`);
  check(/if \(autoMiniOn\(\)\) \{ cb\(autoRes\(mech\.stat\(\)\), txt\); return; \}/.test(GAME_SRC),
    "playPostMini에 autoMiniOn 경로가 있다");
  check(/if \(inPostMini\(\)\) \{ playPostMini\(container, cb\); return; \}/.test(GAME_SRC),
    "playRandomMini의 첫 줄에서만 갈라진다 (정규시즌 8종은 손대지 않았어요)");
  /* 🎯 시점이 뒤집히면 문구와 유불리도 뒤집혀야 해요 — 투수가 "맞혔어요!"를
   * 보면 안 되고, 타자 말로 된 준비 화면을 읽어도 안 돼요. */
  check(/aim: bat \? "match" : "dodge"/.test(GAME_SRC),
    "투수는 aim: dodge로 불린다 (같은 코드, 뒤집힌 목표)");
  check(/scoreLabel: "읽힘"/.test(GAME_SRC) && /다른 칸<\/b>으로 던져야 이겨요/.test(GAME_SRC),
    "투수 쪽 문구와 준비 화면이 통째로 갈아끼워져 있다 (적중 → 읽힘)");

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
  const useNew = (stat, skName, pos) => {
    const z = zoneOf(stat);
    const aim = pos === "batter" ? "match" : "dodge";
    G.set("autoRes", () => {
      const st = G.get("S");
      const tier = (st.post && POST_TIER[st.post.myRound]) || 0;
      const d = lerp(NEWTAB[skName][aim][tier], ZONES, z);
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
      for (const [nm, apply] of [
        ["게임 기본", () => G.set("autoRes", realAutoRes)],
        ["구8·능숙", () => useOld(stat, SKILL.name)],
        ["구8·보통", () => useOld(stat, AVG.name)],
        ["구8·느린손", () => useOld(stat, SLOW.name)],
        ["신2·능숙", () => useNew(stat, SKILL.name, pos)],
        ["신2·보통", () => useNew(stat, AVG.name, pos)],
        ["신2·느린손", () => useNew(stat, SLOW.name, pos)],
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
  /* 🎯 교체 전(🧊 볼카운트 + 🏃 홈 승부)의 평균 하락이 14.6%p였어요. 그 자리를
   * 크게 벗어나면 밸런스가 통째로 움직인 거예요. */
  check(mean <= 0.15, `평균 하락이 15%p를 안 넘는다 (${(mean * 100).toFixed(1)}%p)`);
});

G.dom.window.close();
PS.V.close();
TM.V.close();
console.log(fail ? `\n❌ ${fail}개 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
