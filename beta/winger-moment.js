/* ⚽ 더 윙어 II — 순간 판 **셋 · 문법 하나** (winger2 전용 · director 몫 — 38번 §1)
 *
 *   W2Moment.play(slot, opts, cb)
 *     opts = { kind: "goal" | "assist" | "defend",
 *              sit: { weak, step, foot, cond }   — 🦶 · 🫀 **배수**는 드라이버가 셈(38번 §6 3′-a)
 *              odds(s) → 정수 %(0~100)          — 화면의 승산은 이 값 그대로(3′-b)
 *              judge(s) → "perfect"|"ok"|"miss"  — 고른 순간 정확히 한 번(3′-c)
 *              foot: "L"|"R"(차는 발 그림 — 약발 상황이면 드라이버가 이미 반대 발) · keeper · fast · still · wide }
 *     cb(judge, { s, sBoard, cell, target, seen, weak, ms })
 *   W2Moment.opens(kind) — 그 종류가 판을 여는가. 🔑 이 물음의 주인은 여기 하나예요
 *
 * 설계 36번 §2 · §7 · §8-1(**§16이 앞 절보다 우선**) · 계약 38번 §2 3′ · §6 · 계수 38번 §5(= 37번 §2)
 *
 * ── 판 셋 · 문법 하나 ──
 * 셋 다 「여섯 칸 중 하나를 한 번 탭 → 모션 → 결과 + 해설 한 줄」이고, 첫 화면이 한눈에 다르게 생겼어요.
 *   🥅 슈팅  상대 골문 정면 3 × 2 · 단서 0(감 — J1) · 여섯 칸 0.5 · 시간 제한 없음
 *   ⚡ 컷백  문전 부감 3 × 2 · 단서 0(감 — J5) · 여섯 칸 0.5 · 시간 제한 없음 · 고르기 전 그림에 수비 0
 *   🧱 막기  우리 골문 앞 1 × 6 · 🦶 슈터의 디딤발이 가리키는 길(단서 하나 · 늘 참 · 흐림 반) · 정답 0.80 · 나머지 0.44 · 4초
 *
 * ── 🔒 지키는 것 ──
 *  ① 판은 `s`만 냅니다 — `s = clamp(sBoard × sit.foot × sit.cond)`. 배수는 드라이버(`sit`)가, 승산은 `odds`가 셉니다.
 *     이 파일엔 확률 산식이 한 줄도 없어요(보이는 % = `odds`가 준 정수 그대로 — 보이는 값 = 판정 값).
 *  ② `judge(s)`는 고른 순간(🧱 시간 초과면 그때) **정확히 한 번**. 그림은 결과를 받은 **뒤** 36번 §7-2 표에서 골라요
 *     — 그림이 판정을 만들지 않습니다.
 *  ③ 🧱 거짓 0 — 공은 **모든 결과에서** 디딤발이 가리킨 길로 갑니다. 흐림은 보기만 어렵게(값 같음 · 가리는 다리는
 *     늘 같은 자리라 그 자체로는 아무것도 안 알려 줘요).
 *  ④ 연출 난수는 이 파일 전용(`fx`) — 판 하나에 **4번 고정**(결과를 안 탐) · `Math.random` 0 · 엔진 `_rng` 0 ·
 *     경기 화면 `fxRnd` 0(fx-count 계약).
 *  ⑤ 들리는 값 = 보이는 값 — 단서(`aria-describedby`) · 승산 · 결과 · 해설은 글로도 있어요.
 *  ⑥ 탭은 `click`만 씁니다(스크롤하다 칸이 눌리지 않게). 판이 뜬 뒤 `ARM_MS` 안의 **손가락** 탭은 ▶️ 두 번째 탭으로 보고 버려요.
 *
 * ⚠️ winger2 전용이에요. 8종이 내려받는 공유 파일(timing.js · base.css · match.js)에 넣지 마세요. */
"use strict";

window.W2Moment = (() => {
  /* 🎚️ 판 값 — 한 곳에 모읍니다(38번 §5 · 37번 §2). 🔶 = 실기기 사람 s̄(36번 §14-4) 뒤 다시 맞출 값 */
  const TUNE = Object.freeze({
    READ_HIT: 0.80,   // 🔶 🧱 디딤발이 가리킨 길 — 37번 §2
    READ_MISS: 0.44,  // 🔶 🧱 나머지 다섯 — 0.80 + 0.44 × 5 = 3.0 → 여섯 칸 평균 정확히 0.5(🤖 = 안 읽고 고른 한 수 · 구성)
    DIM: 0.5,         // 🔶 🧱 흐림 몫 — 값은 같고 보기만 어렵게(37번 §2 · 실기기 보정은 이 값만 — 36번 §4-2)
    FLAT: 0.5,        // 🥅 · ⚡ 여섯 칸 — 감의 판(38번 §5)
    PICK_MS: 4000,    // 🧱 고를 시간(36번 §9-1) — 🥅 · ⚡는 제한 없음
    WIDE: 1.3,        // ♿ 판정 넓게 — 🧱 고를 시간 +30%(5.2초 · 성적 페널티 없음)
    WARN_MS: 3000,    // 남은 3초부터 ⏳ 한 줄(36번 §7-7)
    GOAL_SAME: 0.15,  // 🥅 골인데 키퍼가 같은 칸으로 뜬 그림(손끝 너머)의 몫 — 그림만(36번 §9-1)
    ARM_MS: 350,      // 판이 뜬 뒤 이 시간 안의 손가락 탭은 버림(▶️를 두 번 누른 꼬리)
  });
  /* ⏱️ 탭 뒤 연출(36번 §7-1 — 제안). 🥅 약 2.2초 · ⚡ 약 2.5초 · 🧱 약 2.4초 · ⏩ 0.4초.
   * 움직임 줄이기는 **같은 시각표에서 모션만 0**(글을 읽을 시간은 같게) */
  const T = Object.freeze({
    MARK: 150, ODDS: 350, RESULT: 600, CLOSE: 620, FAST: 400,
    MOVE: { goal: [500, 0], assist: [300, 500], defend: [300, 400] },
  });
  const FULL_SHOWS = 3;                 // 준비 화면 전문은 처음 세 번(그 뒤엔 왜 줄 한 줄)
  const READY_KEY = "grow-mech-ready";  // 8종이 나눠 쓰는 「본 횟수」 열쇠 — 판마다 새 이름(w2v4-*)이라 안 겹쳐요

  /* 🎲 연출 난수 — 판 전용(mulberry32). 시작값은 기기 난수, 없으면 시계. 검사는 `_t.seed(n)`으로 고정해요 */
  let fxs = 0;
  const seed = (n) => { fxs = Number(n) >>> 0; };
  try { const a = new Uint32Array(1); window.crypto.getRandomValues(a); seed(a[0]); } catch (e) { seed(Date.now()); }
  const fx = () => {
    fxs = (fxs + 0x6D2B79F5) >>> 0;
    let t = fxs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const clamp01 = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  const nowMs = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function sv(tag, attrs, cls) {
    const e = document.createElementNS(NS, tag);
    for (const k of Object.keys(attrs || {})) e.setAttribute(k, String(attrs[k]));
    if (cls) e.setAttribute("class", cls);
    return e;
  }
  const put = (p, ...kids) => { for (const k of kids) if (k) p.appendChild(k); return p; };
  let seq = 0;
  let pin = null;                       // 🧪 확인 페이지의 다음 🧱 판 고정(`_t.pin`)

  /* 칸 값 — 🔒 판도 검사도 **이 한 줄**을 지납니다(사본 0). 🥅 · ⚡는 여섯 칸 같음, 🧱는 정답 하나 + 나머지 다섯 */
  const values = (kind, target) => [0, 1, 2, 3, 4, 5]
    .map((i) => (kind === "defend" ? (i === target ? TUNE.READ_HIT : TUNE.READ_MISS) : TUNE.FLAT));

  /* ---------- 🗣️ 낱말 — 세 줄 위계(상황 · 무엇 · 왜)는 준비 화면과 본 판이 같은 줄을 씁니다 ---------- */
  const STAKE = {
    goal: "⚽ 골 찬스 — 넣으면 골이에요",
    assist: "🅰️ 찬스 메이킹 — 성공하면 도움이에요",
    defend: "🧱 실점 위기 — 놓치면 실점이에요",
  };
  const GUESS = "🎲 감으로 — 어느 칸이든 승산은 같아요";
  const WORDS = {
    goal: {
      title: "🥅 슈팅", what: "골문 여섯 칸 중 한 곳으로 차요", why: GUESS, key: "w2v4-shot", weak: "🦶 약발 상황",
      full: () => "⚽ 슈팅 — 골문 여섯 칸 중 한 곳을 골라 차요. 단서는 없어요 — 키퍼도 어디로 올지 몰라요. "
        + "승산은 어느 칸이든 같고, 키운 만큼(능력치 · 약발 · 컨디션) 올라가요.",
      after: "키퍼는 어디로?", spark: "⚡",
    },
    assist: {
      title: "🅰️ 컷백", what: "문전 여섯 칸 중 한 곳으로 굴려요", why: GUESS, key: "w2v4-pass", weak: "🦶 약발 상황",
      full: () => "🅰️ 컷백 — 문전 여섯 칸 중 한 곳으로 굴려요. 단서는 없어요 — 동료가 어디로 달려들지 감으로. "
        + "승산은 어느 칸이든 같고, 키운 만큼(능력치 · 약발 · 컨디션) 올라가요.",
      after: "동료가 달려들어요", spark: "✨",
    },
    defend: {
      title: "🧱 슛 막기", what: "슛 길 여섯 중 한 곳으로 몸을 던져요", why: "🦶 슈터의 디딤발이 가리키는 길로",
      key: "w2v4-block", weak: "🦶 약발 디딤",
      full: (sec) => "🧱 슛 막기 — 슈터가 공 옆에 딛는 발(디딤발)의 앞코가 공이 갈 길이에요. 그 길로 몸을 던지세요. "
        + `디딤발은 거짓말을 안 해요 — 가려져 있으면 잘 봐야 할 뿐이에요. ${sec}초 안에요.`,
      after: null, spark: "🛡️",
    },
  };
  /* 칸 이름(aria-label · 결과 글) — 🥅 3 × 2 · ⚡ 문전(나는 오른쪽 끝줄 → 오른쪽이 가까운 기둥) · 🧱 1 × 6 */
  const GRID = ["왼쪽 위 구석", "가운데 위", "오른쪽 위 구석", "왼쪽 아래 구석", "가운데 아래", "오른쪽 아래 구석"];
  const ZONE = ["먼 기둥 앞 골 지역", "가운데 골 지역", "가까운 기둥 앞 골 지역",
    "먼 기둥 쪽 페널티 스폿 앞", "페널티 스폿 앞", "가까운 기둥 쪽 페널티 스폿 앞"];
  const ORD = ["첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째"];
  const LANE = (i) => `왼쪽에서 ${ORD[i]} 길`;
  const DIVE = ["↖ 왼쪽 위로", "↑ 가운데 위로", "↗ 오른쪽 위로", "↙ 왼쪽 아래로", "", "↘ 오른쪽 아래로"];

  /* ---------- 📐 그림의 자 — 폭 100 기준(높이 H). SVG(viewBox)와 HTML(%)이 같은 자를 씁니다 ----------
   * 🔒 판 상자는 `padding-bottom: H%`로 폭 대 높이를 못 박아요 — 🧱 디딤발 각도와 길의 각도가 어느 폭에서나 같게 */
  const G = {
    goal: { H: 58, ball: [50, 52], gk: [50, 30],
      cell: (i) => ({ x: 22 + 28 * (i % 3), y: 15.5 + 19 * Math.floor(i / 3), w: 28, h: 19 }) },
    assist: { H: 62, ball: [84, 8], gk: [50, 5], me: [88, 6], mates: [[34, 50], [60, 54]],
      cell: (i) => ({ x: 30 + 20 * (i % 3), y: 13.5 + 17 * Math.floor(i / 3), w: 20, h: 17 }) },
    defend: { H: 60, ball: [50, 12], heel: [39, 8], shoe: 16, line: 52.8, me: [50, 47], ours: [50, 56.5],
      cell: (i) => ({ x: (i + 0.5) * 100 / 6, y: 44, w: 100 / 6, h: 32 }) },
  };
  /* 🧱 길 i의 각도(아래 방향에서 잰 도) — 공에서 골라인의 길 끝까지. 디딤발은 이 각도와 **나란합니다** */
  const laneDeg = (i) => {
    const g = G.defend;
    return Math.atan2(g.cell(i).x - g.ball[0], g.line - g.ball[1]) * 180 / Math.PI;
  };

  /* 움직이는 조각 — 판과 같은 크기의 겹을 translate해서 **판의 %**로 옮깁니다(경기 판 `.w2-slot`과 같은 수) */
  function mover(cls, x, y, H, text) {
    const layer = el("div", "w2m-mv");
    const pc = el("i", `w2m-pc ${cls}`, text);
    pc.style.left = `${x}%`;
    pc.style.top = `${(y / H) * 100}%`;
    layer.appendChild(pc);
    return { el: layer, pc, x0: x, y0: y, H };
  }
  function moveTo(m, x, y, ms) {
    m.el.style.transitionDuration = `${ms}ms`;
    m.el.style.transform = `translate(${(x - m.x0).toFixed(2)}%, ${(((y - m.y0) / m.H) * 100).toFixed(2)}%)`;
  }
  function pose(m, rot, sc, ms) {
    m.pc.style.transitionDuration = `${ms}ms`;
    m.pc.style.setProperty("--rot", `${rot || 0}deg`);
    m.pc.style.setProperty("--sc", String(sc == null ? 1 : sc));
  }

  /* ---------- 🖼️ 판 그림 셋 — 그림 0장(CSS · SVG) ---------- */
  function frame(kind) {
    const f = el("div", `w2m-field w2m-f-${kind}`);
    f.style.paddingBottom = `${G[kind].H}%`;
    return f;
  }
  function artOf(kind, kids) {
    const s = sv("svg", { viewBox: `0 0 100 ${G[kind].H}`, "aria-hidden": "true", focusable: "false" }, "w2m-art");
    kids.forEach((k) => { if (k) s.appendChild(k); });
    return s;
  }
  const line = (x1, y1, x2, y2, cls) => sv("line", { x1, y1, x2, y2 }, cls);
  const rect = (x, y, w, h, cls, rx) => sv("rect", Object.assign({ x, y, width: w, height: h }, rx ? { rx } : {}), cls);

  /* 🥅 상대 골문 정면 — 키퍼는 늘 같은 대칭 준비 자세(단서처럼 읽힐 기울기 0 — 36번 §2-2) */
  function drawGoal(foot) {
    const g = G.goal, f = frame("goal"), kids = [rect(0, 44, 100, g.H - 44, "a-ground")];
    for (let x = 15; x < 92; x += 7) kids.push(line(x, 7, x, 44, "a-net"));
    for (let y = 12.3; y < 44; y += 6.3) kids.push(line(9, y, 91, y, "a-net"));
    kids.push(sv("path", { d: "M8 44 V6 H92 V44" }, "a-frame"), line(0, 44, 100, 44, "a-goalline"),
      sv("circle", { cx: 50, cy: 55, r: 0.9 }, "a-spot"));
    f.appendChild(artOf("goal", kids));
    const gk = mover("w2m-gk", g.gk[0], g.gk[1], g.H, "🧤");
    const ball = mover("w2m-ball", g.ball[0], g.ball[1], g.H);
    /* 🦶 차는 발 — 공 옆 신발 한 짝(그림만 · 판정 0). 오른발이면 공 오른쪽 */
    const kick = mover(`w2m-kick w2m-kick-${foot === "L" ? "L" : "R"}`, g.ball[0] + (foot === "L" ? -6 : 6), g.ball[1] + 2.5, g.H);
    put(f, gk.el, kick.el, ball.el);
    return { f, gk, ball, kick };
  }
  /* ⚡ 문전 부감 — 🔒 고르기 전엔 수비를 안 그립니다(빈칸이 정답처럼 읽히면 보이는 값 ≠ 판정 값 — 36번 §16-5) */
  function drawCut() {
    const g = G.assist, f = frame("assist");
    f.appendChild(artOf("assist", [
      rect(40, 0, 20, 3, "a-mouth"), line(0, 3, 100, 3, "a-line"),
      sv("path", { d: "M10 3 V43 H90 V3" }, "a-line a-box"), sv("path", { d: "M28 3 V14 H72 V3" }, "a-line"),
      sv("circle", { cx: 50, cy: 30, r: 0.9 }, "a-spot"),
    ]));
    const gk = mover("w2m-gk w2m-gk-top", g.gk[0], g.gk[1], g.H, "🧤");
    const me = mover("w2m-me", g.me[0], g.me[1], g.H, "🏃");
    const mates = g.mates.map(([x, y]) => mover("w2m-mate", x, y, g.H, "🏃"));
    const ball = mover("w2m-ball", g.ball[0], g.ball[1], g.H);
    put(f, gk.el, ...mates.map((m) => m.el), me.el, ball.el);
    return { f, gk, me, mates, ball };
  }
  /* 🧱 우리 골문 앞 — 위에 마주 선 슈터 · 공 · 공 옆 디딤발(앞코가 길 하나와 나란함) · 공에서 우리 골문으로 길 여섯.
   * 🔒 슈터의 어깨 · 시선 · 기울기는 늘 중립(그리지 않음) — 단서는 하나(폐기 형태 ⑴ 「칩 둘」 금지).
   * 🔒 흐림 = 우리 수비의 다리가 디딤발 뒤쪽 반을 가림 — 다리는 **늘 같은 자리**(뒤꿈치 위)라 그 자체로는 0정보예요 */
  function drawBlock(target, seen) {
    const g = G.defend, f = frame("defend");
    const lanes = [0, 1, 2, 3, 4, 5].map((i) => line(g.ball[0], g.ball[1], g.cell(i).x, g.line, "a-lane"));
    const shoe = sv("g", { transform: `translate(${g.heel[0]} ${g.heel[1]}) rotate(${(-laneDeg(target)).toFixed(2)})` },
      `a-shoe${seen === "dim" ? " is-dim" : ""}`);
    const L = g.shoe;
    put(shoe,
      sv("path", { d: `M-2.7 0.4 Q-2.9 -2 0 -2.2 Q2.9 -2 2.7 0.4 L2.5 ${L - 4} Q2.7 ${L} 0 ${L + 0.4} Q-2.7 ${L} -2.5 ${L - 4} Z` }, "a-sole"),
      sv("path", { d: `M-2.3 ${L - 5} Q0 ${L - 6.3} 2.3 ${L - 5}` }, "a-lace"),
      sv("circle", { cx: 0, cy: L - 2, r: 1.25 }, "a-toe"));
    const kids = [rect(0, g.line, 100, 60 - g.line, "a-netzone"), ...lanes,
      line(0, g.line, 100, g.line, "a-goalline"), rect(0.6, g.line, 1.6, 6, "a-post"), rect(97.8, g.line, 1.6, 6, "a-post"),
      sv("circle", { cx: 50, cy: 3.4, r: 2.6 }, "a-opp"), sv("path", { d: "M43.5 11.5 Q43.5 6.4 50 6.4 Q56.5 6.4 56.5 11.5 Z" }, "a-opp"),
      shoe];
    if (seen === "dim") kids.push(sv("path", { d: `M${g.heel[0] - 6.4} -1 V${g.heel[1] + 1} A6.4 6.4 0 0 0 ${g.heel[0] + 6.4} ${g.heel[1] + 1} V-1 Z` }, "a-leg"));
    f.appendChild(artOf("defend", kids));
    const ours = mover("w2m-ourgk", g.ours[0], g.ours[1], g.H, "🧤");
    const me = mover("w2m-me", g.me[0], g.me[1], g.H, "🏃");
    const ball = mover("w2m-ball", g.ball[0], g.ball[1], g.H);
    put(f, ours.el, me.el, ball.el);
    return { f, me, ball, lanes };
  }

  /* ---------- 🧭 준비 화면 · 본 횟수 ---------- */
  const readSeen = () => {
    try {
      const o = JSON.parse(localStorage.getItem(READY_KEY) || "{}");
      return o && typeof o === "object" ? o : {};
    } catch (e) { return {}; }          // 사생활 보호 모드처럼 못 읽는 자리도 있어요
  };
  const bumpSeen = (key) => {
    const seen = readSeen();
    const n = Number(seen[key]) || 0;
    seen[key] = n + 1;
    try { localStorage.setItem(READY_KEY, JSON.stringify(seen)); } catch (e) { /* 못 써도 넘어가요 */ }
    return n;
  };

  /* 세 줄 위계 + 판 머리 승산(J4) — 준비 화면과 본 판이 **같은 함수**로 그려요(둘이 안 갈라지게) */
  function head(B, ready) {
    const W = WORDS[B.kind];
    const what = el("p", "tm-label w2m-what", W.title);
    if (ready) what.appendChild(el("small", null, W.what));
    return [el("p", "w2m-stake", STAKE[B.kind]), what, el("p", "w2m-why", W.why), oddsLine(B)];
  }
  const pct = (B, s) => {
    if (typeof B.odds !== "function") return null;
    try { const v = Number(B.odds(clamp01(s))); return Number.isFinite(v) ? Math.round(v) : null; } catch (e) { return null; }
  };
  /* 🎯 판 머리 — 기본 승산 = 🤖과 같은 값(J4 · 36번 §3-3). 화살표 앞 = 「그 상황이 아니었다면」(약발만 뺌) ·
   *    🫀 꼬리표는 %p가 1 이상일 때만. 🔒 숫자는 전부 `odds`가 준 것 — 여기서 배수 · 승산을 셈하지 않아요 */
  function oddsLine(B) {
    const F = B.sit.foot, C = B.sit.cond;
    const base = pct(B, 0.5 * F * C);
    if (base == null) return null;
    const p = el("p", "w2m-odds");
    if (B.sit.weak) {
      const before = pct(B, 0.5 * C);
      p.appendChild(el("span", "w2m-sit", `${WORDS[B.kind].weak}${B.sit.step ? `(${B.sit.step}단계)` : ""}`));
      p.appendChild(document.createTextNode(` — 🎯 기본 승산 ${before == null ? "" : `${before} → `}${base}%`));
    } else {
      p.appendChild(document.createTextNode(`🎯 기본 승산 ${base}%`));
    }
    const noCond = pct(B, 0.5 * F);
    if (noCond != null && Math.abs(base - noCond) >= 1) {
      const d = base - noCond;
      p.appendChild(el("span", "w2m-cond", ` · 🫀 컨디션 ${d > 0 ? "+" : "−"}${Math.abs(d)}%p`));
    }
    return p;
  }
  /* 처음 세 번의 예시 그림 — 본 판과 같은 그리기 함수(작게 · 누를 수 없음 · 낭독에서 뺌) */
  function example(B) {
    const wrap = el("div", "w2m-ex");
    wrap.setAttribute("aria-hidden", "true");
    if (B.kind === "defend") {
      const d = drawBlock(3, "clear");
      d.lanes[3].classList.add("is-target");
      put(wrap, d.f, el("p", "w2m-ex-cap", "🦶 디딤발 앞코 → 넷째 길"));
    } else {
      wrap.appendChild(B.kind === "goal" ? drawGoal(B.foot).f : drawCut().f);
    }
    return wrap;
  }
  function ready(container, B, start) {
    const W = WORDS[B.kind];
    const full = bumpSeen(W.key) < FULL_SHOWS;
    const wrap = el("div", `tm-box w2m-ready w2m-k-${B.kind}`);
    put(wrap, ...head(B, true));
    if (full) put(wrap, example(B), el("p", "w2m-ready-full", W.full(B.limit / 1000)));
    const go = el("button", "btn btn-primary tm-btn w2m-go", "▶️ 시작");
    go.type = "button";
    wrap.appendChild(go);
    container.appendChild(wrap);
    try { go.focus({ preventScroll: true }); } catch (e) { /* 옛 브라우저 */ }
    let went = false;
    go.addEventListener("click", () => {
      if (went) return;
      went = true;
      wrap.remove();
      start();
    });
  }

  /* ---------- 🎬 결과 그림표 — 결과(엔진)가 먼저, 그림은 결과와 단서 둘 다에 참(36번 §7-2) ---------- */
  function planGoal(j, c, r) {
    const g = G.goal, cc = g.cell(c), row = Math.floor(c / 3), col = c % 3;
    let gkCell, ball, rebound = null, text, reach = 1;
    if (j === "perfect") {
      const same = r[3] < TUNE.GOAL_SAME;
      gkCell = same ? c : (c + 1 + Math.floor(r[2] * 5)) % 6;
      ball = same ? [cc.x + (col === 0 ? -8 : col === 2 ? 8 : 0), cc.y - (row === 0 ? 5 : col === 1 ? 9 : 0)] : [cc.x, cc.y];   // 같은 칸이면 손끝 너머(가운데 아래는 웅크린 키퍼 위로)
      if (same) reach = 0.86;
      text = same ? "⚽ 골! 손끝 너머로" : "⚽ 골! 키퍼 반대쪽으로";
    } else if (j === "ok") {
      gkCell = c;
      ball = [cc.x, cc.y];
      rebound = [cc.x + (cc.x < 50 ? -12 : 12), Math.min(g.H - 6, cc.y + 16)];
      text = "🧤 선방 — 키퍼가 읽었어요";
    } else {
      gkCell = Math.floor(r[2] * 6);
      if (row === 0) { ball = [cc.x, -5]; text = "💨 크로스바 위로 떴어요"; }
      else if (col !== 1) { ball = [col === 0 ? 2 : 98, 36]; text = "💨 기둥 옆으로 빗나갔어요"; }
      else { ball = [r[3] < 0.5 ? 28 : 72, 47]; text = "💨 빗맞아 옆으로 흘렀어요"; }
    }
    const note = gkCell === 4 ? "🧤 키퍼는 가운데에 버텼어요" : `🧤 키퍼는 ${DIVE[gkCell]} 떴어요`;
    return { gkCell, ball, rebound, text, note, reach };
  }
  function planCut(j, c, r) {
    const g = G.assist, z = g.cell(c);
    const runner = Math.abs(g.mates[0][0] - z.x) <= Math.abs(g.mates[1][0] - z.x) ? 0 : 1;
    const side = z.x < 50 ? -1 : z.x > 50 ? 1 : (r[2] < 0.5 ? -1 : 1);
    if (j === "perfect") {
      return { runner, run: [z.x, z.y + 3], shot: [50 + Math.max(-7, Math.min(7, (z.x - 50) * 0.35)), 1.2],
        gk: [50 - side * 5, 5], text: `🅰️ 도움! 동료가 ${ZONE[c]}에서 마무리했어요` };
    }
    if (j === "ok") {
      const k = [Math.max(43, Math.min(57, z.x)), 5.5];
      return { runner, run: [z.x, z.y + 3], shot: k, gk: k, text: "🧤 동료의 슛 — 키퍼가 막았어요" };
    }
    if (r[3] < 0.5) {
      const d = [z.x - side * 6, z.y - 3];
      return { runner, run: [z.x, z.y + 8], shot: d, def: d, gk: g.gk, text: "🔵 수비가 먼저 끊었어요" };
    }
    return { runner, run: [z.x, z.y + 3], shot: [z.x < 50 ? 33 : 67, -4], gk: [50 + side * 3, 5], text: "💨 동료의 슛이 골대 밖으로" };
  }
  function planBlock(j, c, t, r) {
    const g = G.defend, xt = g.cell(t).x;
    const over = [g.ball[0] + (xt - g.ball[0]) * (64 - g.ball[1]) / (g.line - g.ball[1]), 64];
    const note = `🦶 디딤발은 ${LANE(t)}을 가리켰어요`;
    if (c == null) {
      return j === "perfect" ? { ball: over, up: true, text: "⏳ 슈터가 먼저 찼어요 — 다행히 크로스바 위로", note }
        : { ball: [xt, 57.5], text: "⏳ 슈터가 먼저 찼어요", note };
    }
    if (c === t && j === "perfect") {
      return { ball: [xt, g.me[1]], rebound: [xt + (r[2] < 0.5 ? -12 : 12), 33], text: "🧱 막았어요! 디딤발을 읽었어요", note };
    }
    if (c === t) return { ball: [xt + (xt < 50 ? -3.5 : 3.5), 57.5], text: "😣 읽었는데 — 발끝을 스치고 들어갔어요", note };
    if (j === "perfect") return { ball: over, up: true, text: "🧱 막았어요 — 압박에 서두른 슛이 크로스바 위로", note };
    return { ball: [xt, 57.5], text: Math.abs(c - t) === 1 ? "😣 한 길 차이로 빠졌어요" : "😣 비운 길로 들어갔어요", note };
  }
  const DIVE_ROT = [-70, 0, 70, -70, 0, 70];
  const BODY_ROT = [-65, -40, -15, 15, 40, 65];

  /* ---------- 🔥 판 하나 ---------- */
  function run(container, B) {
    const W = WORDS[B.kind];
    const box = el("div", `tm-box w2m-box w2m-board w2m-k-${B.kind}${B.still || B.fast ? " w2m-still" : ""}`);
    const clueId = `w2m-clue-${++seq}`;                       // 🔒 연출 난수를 안 씀(판 하나에 4번 고정)
    const d = B.kind === "goal" ? drawGoal(B.foot) : B.kind === "assist" ? drawCut() : drawBlock(B.target, B.seen);
    const group = el("div", "w2m-cells");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", `${W.what} — 키보드 1~6`);
    group.setAttribute("aria-describedby", clueId);
    group.tabIndex = -1;
    const g = G[B.kind];
    const names = B.kind === "goal" ? GRID : B.kind === "assist" ? ZONE : [0, 1, 2, 3, 4, 5].map(LANE);
    const cells = [0, 1, 2, 3, 4, 5].map((i) => {
      const c = g.cell(i);
      const b = el("button", "w2m-cell");
      b.type = "button";
      b.dataset.i = String(i);
      b.setAttribute("aria-label", `${i + 1}번 — ${names[i]}`);
      b.style.left = `${c.x - c.w / 2}%`;
      b.style.top = `${((c.y - c.h / 2) / g.H) * 100}%`;
      b.style.width = `${c.w}%`;
      b.style.height = `${(c.h / g.H) * 100}%`;
      group.appendChild(b);
      return b;
    });
    d.f.appendChild(group);
    const clue = el("p", "w2m-clue", B.kind === "defend"
      ? `🦶 디딤발이 ${LANE(B.target)}을 가리켜요${B.seen === "dim" ? "(반쯤 가려짐)" : ""}`
      : "단서 없음 — 감으로 골라요");
    clue.id = clueId;
    const tip = el("p", "w2m-tip", B.kind === "defend" ? `⏱️ ${B.limit / 1000}초 안에 골라요` : "👆 여섯 칸 중 한 곳을 눌러요");
    tip.setAttribute("role", "status");
    const after = el("div", "w2m-after");
    after.setAttribute("role", "status");
    put(box, ...head(B), d.f, clue, tip, after);
    container.appendChild(box);
    try { group.focus({ preventScroll: true }); } catch (e) { /* 옛 브라우저 */ }

    const opened = nowMs();
    const timers = [];
    let picked = false;
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const stop = () => { timers.forEach(clearTimeout); timers.length = 0; document.removeEventListener("keydown", onKey); };

    const choose = (i) => {
      if (picked) return;
      picked = true;
      stop();
      const timeout = i == null;
      const sBoard = timeout ? 0 : B.vals[i];
      const s = clamp01(sBoard * B.sit.foot * B.sit.cond);
      const j = B.judge(s);                                       // 🔒 정확히 한 번 — 결과를 받은 뒤에 그려요
      const ms = timeout ? B.limit : Math.max(0, Math.round(nowMs() - opened));
      box.classList.add("w2m-done");
      cells.forEach((b) => { b.disabled = true; });
      if (!timeout) cells[i].classList.add("is-pick");
      reveal(B, d, box, tip, after, i, j, s, () => {
        box.remove();
        B.cb(j, { s, sBoard, cell: timeout ? null : i, target: B.kind === "defend" ? B.target : null,
          seen: B.kind === "defend" ? B.seen : null, weak: B.sit.weak, ms });
      });
    };
    cells.forEach((b, i) => b.addEventListener("click", (e) => {
      if (e.detail > 0 && nowMs() - opened < TUNE.ARM_MS) return;    // ▶️를 두 번 누른 꼬리(키보드 클릭은 detail 0)
      choose(i);
    }));
    function onKey(e) {
      if (!box.isConnected) { stop(); return; }                       // 화면이 갈려 판이 떨어져 나갔으면 귀를 닫아요
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || !/^[1-6]$/.test(e.key)) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      choose(Number(e.key) - 1);
    }
    document.addEventListener("keydown", onKey);
    if (B.kind === "defend") {
      /* ⏳ 남은 3초부터 한 줄 — 띠 · 줄어드는 테두리 없음(36번 §7-7). 시간이 지나도 칸 값은 안 변해요 */
      for (let k = Math.ceil(TUNE.WARN_MS / 1000); k >= 1; k -= 1) {
        later(Math.max(0, B.limit - k * 1000), () => { tip.textContent = `⏳ ${k}초`; tip.classList.add("urgent"); });
      }
      later(B.limit, () => choose(null));
    }
  }

  /* 고른 뒤 — 승산 줄(J4) → 모션 → 결과 + 해설 → 닫힘. ⏩는 마지막 장면 한 장으로 0.4초 */
  function reveal(B, d, box, tip, after, i, j, s, done) {
    const W = WORDS[B.kind];
    const p = pct(B, s);
    const pickText = (B.kind !== "defend" ? (p == null ? W.after : `🎯 ${p}% — ${W.after}`)
      : i == null ? `⏳ 못 골랐어요${p == null ? "" : ` — 🎯 ${p}%`}` : p == null ? "🧱 이 길로!" : `🎯 이 길이면 ${p}%`);
    const showPick = () => { tip.classList.remove("urgent"); tip.classList.add("w2m-pick"); tip.textContent = pickText; };
    if (B.kind === "defend") d.ball.el.dataset.lane = String(B.target);   // 🔒 거짓 0 — 공의 길 = 디딤발 길(검사가 읽는 자리)
    const r = B.r;
    const plan = B.kind === "goal" ? planGoal(j, i, r) : B.kind === "assist" ? planCut(j, i, r) : planBlock(j, i, B.target, r);
    const [m1, m2] = T.MOVE[B.kind];
    const fast = B.fast;
    const ms = (v) => (fast ? 0 : v);
    const move1 = () => {
      if (B.kind === "goal") {
        const c = G.goal.cell(plan.gkCell), row = Math.floor(plan.gkCell / 3);
        const gx = G.goal.gk[0] + (c.x - G.goal.gk[0]) * plan.reach, gy = plan.gkCell === 4 ? G.goal.gk[1] + 2 : row === 0 ? 20 : G.goal.gk[1] + 6;
        moveTo(d.gk, gx, gy, ms(m1));
        pose(d.gk, DIVE_ROT[plan.gkCell], plan.gkCell === 4 ? 0.94 : 1, ms(m1));
        moveTo(d.ball, plan.ball[0], plan.ball[1], ms(m1));
        pose(d.ball, 0, 0.62, ms(m1));
        pose(d.kick, B.foot === "L" ? 28 : -28, 1, ms(160));
      } else if (B.kind === "assist") {
        const z = G.assist.cell(i);
        moveTo(d.ball, z.x, z.y, ms(m1));
      } else if (i != null) {
        moveTo(d.me, G.defend.cell(i).x, G.defend.me[1], ms(m1));
        pose(d.me, BODY_ROT[i], 1, ms(m1));
      }
    };
    const move2 = () => {
      if (B.kind === "assist") {
        const m = d.mates[plan.runner];
        if (plan.def) {
          const df = mover("w2m-def", plan.def[0], plan.def[1], G.assist.H);
          df.el.classList.add("is-new");
          d.f.insertBefore(df.el, d.ball.el);
        }
        moveTo(m, plan.run[0], plan.run[1], ms(m2));
        moveTo(d.gk, plan.gk[0], plan.gk[1], ms(m2));
        moveTo(d.ball, plan.shot[0], plan.shot[1], ms(m2));
      } else if (B.kind === "defend") {
        moveTo(d.ball, plan.ball[0], plan.ball[1], ms(m2));
        if (plan.up) pose(d.ball, 0, 1.6, ms(m2));
      }
    };
    const result = () => {
      if (plan.rebound) moveTo(d.ball, plan.rebound[0], plan.rebound[1], ms(260));
      if (B.kind === "defend") d.lanes[B.target].classList.add("is-target");   // 해설 점선 — 디딤발이 가리킨 길
      const res = el("p", `w2m-res ${j === "perfect" ? "w2m-good" : j === "ok" ? "w2m-mid" : "w2m-bad"}`, plan.text);
      if (B.sit.weak && j === "perfect") res.appendChild(el("b", "w2m-win-weak", "🦶 약발로!"));
      put(after, res, plan.note ? el("p", "w2m-note", plan.note) : null);
      box.classList.add("w2m-hit", `w2m-t-${j}`);
      if (j === "perfect" && !B.still && !fast) {
        const sp = el("span", "w2m-spark");
        sp.setAttribute("aria-hidden", "true");
        for (let k = 0; k < 6; k += 1) { const e = el("i", null, W.spark); e.style.setProperty("--a", `${k * 60}deg`); sp.appendChild(e); }
        box.appendChild(sp);
      }
    };
    if (fast) {
      showPick();
      move1(); move2(); result();
      setTimeout(done, T.FAST);
      return;
    }
    const at = [T.MARK, T.MARK + T.ODDS, T.MARK + T.ODDS + m1, T.MARK + T.ODDS + m1 + m2];
    setTimeout(showPick, at[0]);
    setTimeout(move1, at[1]);
    if (m2) setTimeout(move2, at[2]);
    setTimeout(result, at[3]);
    setTimeout(done, at[3] + T.RESULT + T.CLOSE);
  }

  /* ---------- 🔁 바깥에 내는 것 ---------- */
  /* 엔진 밖(확인 페이지 · 손 시연)에서만 쓰는 되받이 — 실제 경기에선 늘 `opts.judge`가 와요 */
  const loneJudge = (s) => (s >= 0.75 ? "perfect" : s >= 0.35 ? "ok" : "miss");
  const opens = (kind) => Object.prototype.hasOwnProperty.call(WORDS, kind);
  const setting = (k) => {
    try { const S = window.W2Game && window.W2Game.settings; return !!(S && S.on(k)); } catch (e) { return false; }
  };
  const deviceStill = () => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  };

  function play(slot, opts, cb) {
    const o = opts || {};
    const done = typeof cb === "function" ? cb : () => {};
    const sit = o.sit && typeof o.sit === "object" ? o.sit : {};
    const num = (v) => (Number.isFinite(+v) && +v > 0 ? +v : 1);
    const B = {
      kind: o.kind, odds: o.odds, foot: o.foot === "L" ? "L" : "R",
      sit: { weak: !!sit.weak, step: Number.isInteger(+sit.step) && +sit.step > 0 ? +sit.step : 0, foot: num(sit.foot), cond: num(sit.cond) },
      fast: !!o.fast,
      still: typeof o.still === "boolean" ? o.still : (deviceStill() || setting("still")),
      wide: typeof o.wide === "boolean" ? o.wide : setting("wide"),
      cb: done,
    };
    /* 🔒 판정은 한 번 — 드라이버도 두 번째 부름엔 첫 결과를 주지만(3′-c) 판은 애초에 한 번만 불러요.
     *    `judge`가 던지면 경기를 멈추지 않으려고 되받이로 흘리고 콘솔에 남겨요(드라이버의 판정이 아님을 알리게) */
    let first = null;
    B.judge = (s) => {
      if (first) return first;
      let j;
      try { j = typeof o.judge === "function" ? o.judge(s) : loneJudge(s); } catch (e) { console.error(e); j = loneJudge(s); }
      first = j === "perfect" || j === "ok" || j === "miss" ? j : "miss";
      return first;
    };
    /* 🤖 자리 없음(머리 없는 길 · 판 자리를 못 받음) · 판이 없는 종류 — 그림 0 · 판정 한 번 · `ms` 0(3′-d) */
    if (!slot || !opens(B.kind)) {
      const s = clamp01(TUNE.FLAT * B.sit.foot * B.sit.cond);
      done(B.judge(s), { s, sBoard: TUNE.FLAT, cell: null, target: null, seen: null, weak: B.sit.weak, ms: 0 });
      return;
    }
    /* 🎲 판 하나에 연출 난수 **4번 고정** — 정답 길 · 보임 · 그림 갈래 둘(결과 · 종류를 안 탐) */
    B.r = [fx(), fx(), fx(), fx()];
    B.target = B.kind === "defend" ? Math.min(5, Math.floor(B.r[0] * 6)) : null;
    B.seen = B.kind === "defend" ? (B.r[1] < TUNE.DIM ? "dim" : "clear") : null;
    /* 🧪 확인 페이지(`winger2/check.html`)만 쓰는 한 번짜리 고정 — 굴림 4번은 그대로 하고 덮어써요(게임은 안 부름) */
    if (pin && B.kind === "defend") {
      if (pin.seen === "clear" || pin.seen === "dim") B.seen = pin.seen;
      if (Number.isInteger(pin.target) && pin.target >= 0 && pin.target < 6) B.target = pin.target;
    }
    pin = null;
    B.vals = values(B.kind, B.target);
    B.limit = B.kind === "defend" ? Math.round(TUNE.PICK_MS * (B.wide ? TUNE.WIDE : 1)) : 0;
    ready(slot, B, () => run(slot, B));
  }

  // 엔진에 스스로 꽂아요 — index.html에서 engine.js 뒤에 실려요
  if (window.WingerEngine && window.WingerEngine.setMini) window.WingerEngine.setMini(play);

  /* 🧪 `_t`는 검사 전용 창구 — 게임도 화면도 여기를 안 읽어요. 칸 값은 판이 쓰는 그 함수(`values`)를 그대로 내요 */
  return { play, opens, WORDS, _t: { TUNE, T, seed, values, laneDeg, loneJudge, pin: (o) => { pin = o && typeof o === "object" ? o : null; } } };
})();
