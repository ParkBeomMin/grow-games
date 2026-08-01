/* 🌏 월드투어 전용 무대 미니게임 3종 — 아이돌(더 트레이니)만 내려받아요.
 *
 * 왜 timing.js가 아니고 여기냐면: timing.js(8종)는 8개 게임이 전부 내려받아요.
 * 투어에서만 쓰는 메커닉을 거기 넣으면 쓰지 않는 7개 게임까지 무게를 져요.
 * 게다가 이 셋은 범용 타이밍 원시함수가 아니라 콘서트장에서만 성립하는 것이에요 —
 * 관객석 함성 웨이브·두 파트의 싱크·함성 게이지는 야구장에도 주식창에도 없어요.
 * 소유가 분명한 게 낫습니다. 그래서 timing.js는 한 줄도 건드리지 않았어요.
 *
 * 인터페이스는 timing.js와 똑같아요 — fn(container, opts, cb)이고 cb(res)의 res는
 * "perfect" | "good" | "miss" 셋뿐이에요. 그래서 기존 투어 코드(game.js의
 * playTourSet · tourSetBase)가 아무 변환 없이 그대로 받아요. 새 판정 등급은
 * 만들지 않았어요. DOM 구성·이벤트·정리 순서도 timing.js의 관례를 그대로 따라요:
 * .tm-box를 container에 붙이고, 끝나면 tm-done-* 를 붙여 잠깐 보여준 뒤
 * 박스를 지우고 cb를 불러요. 이 순서가 어긋나면 다음 무대가 앞 박스 안에 겹쳐 떠요.
 *
 *   TourStage.wave(box, { label, button, zonePct }, cb)   🎬 오프닝 — 함성 웨이브
 *   TourStage.sync(box, { label, button, zonePct }, cb)   ✨ 킬링파트 — 싱크로
 *   TourStage.roar(box, { label, button, zonePct }, cb)   🔥 앵콜 — 함성 유지
 *
 * 🧭 셋 다 **준비 화면**을 먼저 띄워요. 규칙을 읽고 ▶️ 시작을 눌러야 빛이 흐르고
 * 바가 움직여요 — 자세한 약속은 아래 ready()의 머리말에 적어 뒀어요.
 *
 * zonePct는 game.js의 miniZone(stat)이 준 값(10~40)이에요. 능력치와 컨디션이
 * 높으면 커져요. 셋 다 이 값으로 판정을 느슨하게 해요 — 육성이 투어에 닿는 자리예요.
 * 무대별로 어느 능력치를 보는지는 game.js의 TOUR_MECH가 정해요.
 *
 * 세 메커닉 모두 3~5초에 끝나요. 도시 8곳 × 3무대 = 24판이라 한 판이 길면
 * 그 자체가 버그예요. 실제 소요는 tests/idol/tour-mech-test.js가 재요.
 */
"use strict";

window.TourStage = (() => {
  const clampV = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const zoneOf = (opts) => clampV((opts && opts.zonePct) || 22, 10, 40);

  /* 판정을 보여주고 치우는 시간. timing.js의 450~500ms와 같은 감각이에요. */
  const OUTRO = 450;

  function makeBox(container, label, inner) {
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `<p class="tm-label">${label}</p>${inner}`;
    container.appendChild(wrap);
    return wrap;
  }

  /* 📱 모바일 탭 — pointerdown이 click보다 빠르고, 스크롤·더블탭 확대에 안 밀려요.
   * 판정이 ms 단위인 미니게임에서는 이 차이가 그대로 점수예요.
   *
   * 그런데 실기기에서는 pointerdown 뒤에 click이 한 번 더 와요. 둘 다 세면 한 번
   * 누른 게 두 번이 되고, 연타를 세는 앵콜에서는 그게 곧 삑사리예요.
   * 그래서 pointerdown 직후에 오는 click만 버려요. "pointerdown을 한 번 봤으면
   * 그 뒤 click은 전부 버린다"로 하면 간단하지만, 그러면 한 번 만진 뒤에는
   * 키보드(Enter·Space)로 누를 수 없게 돼요. 시간으로 가르면 둘 다 살아요.
   * click도 듣는 건 포인터 이벤트가 없는 환경(jsdom 테스트·아주 구형 브라우저)
   * 때문이에요. timing.js의 hold가 pointerdown/pointerup을 쓰는 방식과 같은 결이에요. */
  const TAP_ECHO = 700;   // pointerdown 뒤 이 시간 안에 오는 click은 같은 한 번이에요
  function onTap(el, fn) {
    let lastPointer = -TAP_ECHO;
    el.addEventListener("pointerdown", (e) => {
      lastPointer = Date.now();
      if (e && e.cancelable) e.preventDefault();
      fn();
    });
    el.addEventListener("click", () => {
      if (Date.now() - lastPointer < TAP_ECHO) return;
      fn();
    });
  }

  /* ================================================================
   * 🧭 준비 화면 — 규칙을 읽고 나서, 눌러야 시작해요
   *
   * 왜 필요하냐면: 이 셋은 규칙이 여러 단계예요(3연속으로 잡기 · 두 대상의 교차 ·
   * 연타 유지에 위쪽 한계까지). 한 줄짜리 .tm-label로는 첫 무대를 통째로 날려요.
   * "너무 빨리 지나가서 뭐 하라는 건지 모르겠다"는 말이 정확히 그 뜻이에요.
   *
   * ⏱️ 이 화면의 약속 하나가 전부예요 — **누르기 전에는 아무것도 안 돌아요.**
   * requestAnimationFrame도 setTimeout도 performance.now()도 준비 화면 위에서는
   * 한 번도 불리지 않아요. 진짜 메커닉은 runWave·runSync·runRoar 안에 통째로 들어
   * 있고, ready()가 그 함수를 붙잡고 있다가 ▶️ 시작을 눌렀을 때 놓아 줘요.
   * 판정도 난이도도 한 줄 안 바뀌어요 — 사람이 잡는 건 '시작 시각'뿐이에요.
   *
   * 📖 도시 8곳 × 3무대 = 24판이라 매번 세 줄을 다 읽으면 성가셔요. 메커닉마다 본
   * 횟수를 세어 처음 FULL_SHOWS번만 전문을 펴고, 그 뒤에는 한 줄로 줄여요.
   * **준비 화면 자체는 늘 떠요** — 줄어드는 건 설명의 길이지 시작 버튼이 아니에요.
   *
   * 🔑 세는 값은 새 열쇠(READY_KEY) 하나에만 담아요. 옛 저장은 한 칸도 안 건드려요 —
   * 마이그레이션이 없고, 값이 없으면 그냥 0이에요(= 처음 보는 사람).
   * 열쇠 안은 메커닉 이름별 횟수예요. post-stage.js와 같은 열쇠를 쓰지만 이름
   * (wave·sync·roar ↔ count·dash)이 겹치지 않아 서로를 덮지 않아요.
   * ================================================================ */
  const READY_KEY = "grow-mech-ready";
  const FULL_SHOWS = 3;          // 처음 이만큼은 전문, 그 뒤로는 한 줄

  const readSeen = () => {
    try {
      const o = JSON.parse(localStorage.getItem(READY_KEY) || "{}");
      return (o && typeof o === "object") ? o : {};
    } catch (e) { return {}; }   // 사생활 보호 모드처럼 못 읽는 자리도 있어요
  };
  /* 이번이 '보기 전 기준' 몇 번째인지 돌려줘요 — 0이면 난생처음 보는 거예요. */
  const bumpSeen = (key) => {
    const seen = readSeen();
    const n = Number(seen[key]) || 0;
    seen[key] = n + 1;
    try { localStorage.setItem(READY_KEY, JSON.stringify(seen)); } catch (e) { /* 못 써도 넘어가요 */ }
    return n;
  };

  /* info = { key, title, lines: [3줄], short: "한 줄", keys: [{ name, desc }] }
   * keys는 **버튼이 각각 무엇인지**예요. 투어 3종은 버튼이 하나씩이지만, 하나라도
   * 무엇을 하는 버튼인지는 적어 둬요 — 연타인지 한 번인지가 여기서 갈려요. */
  function ready(container, info, start) {
    const full = bumpSeen(info.key) < FULL_SHOWS;
    const body = full
      ? `<ul class="mg-ready-lines">${info.lines.map((t) => `<li>${t}</li>`).join("")}</ul>`
      : `<p class="mg-ready-short">${info.short}</p>`;
    const keys = (info.keys || [])
      .map((k) => `<span class="mg-ready-key"><b>${k.name}</b><span>${k.desc}</span></span>`).join("");
    const wrap = document.createElement("div");
    wrap.className = "tm-box mg-ready";
    wrap.innerHTML = `<p class="tm-label">${info.title}</p>${body}`
      + (keys ? `<div class="mg-ready-keys">${keys}</div>` : "")
      + `<button type="button" class="btn btn-primary tm-btn mg-go">▶️ 시작</button>`;
    container.appendChild(wrap);
    let went = false;
    onTap(wrap.querySelector(".mg-go"), () => {
      if (went) return;          // pointerdown과 click이 겹쳐도 한 번만 시작해요
      went = true;
      wrap.remove();             // 준비 화면을 치우고 나서 본 무대 상자를 붙여요
      start();
    });
  }

  /* 세 무대의 준비 화면 문구. 무대와 메커닉이 1:1이라 여기 붙여 둬요 —
   * 도시 이름이 들어가는 상황 문구(label)는 본 무대 상자가 그대로 들고 있어요. */
  const READY = {
    wave: {
      key: "wave",
      title: "🎬 함성 웨이브",
      lines: [
        "관객석을 따라 빛이 왼쪽에서 오른쪽으로 흘러요.",
        "🙌 표시가 있는 구역 <b>3곳</b>에 빛이 닿는 순간마다 한 번씩 눌러요.",
        "3번 다 잡으면 완벽, 2번이면 성공이에요. 미리 치면 그 구역은 놓친 것으로 굳어요 — 마구 두드리면 안 돼요.",
      ],
      short: "🙌 구역에 빛이 닿는 순간마다 한 번씩 · 3번 연속이면 완벽해요",
      desc: "🙌 구역에 빛이 닿는 순간 눌러요 (관객석을 직접 눌러도 돼요)",
    },
    sync: {
      key: "sync",
      title: "✨ 싱크로",
      lines: [
        "🎤와 🎶 두 바가 <b>서로 다른 속도로</b> 좌우를 왕복해요.",
        "둘이 위아래로 겹치는 순간에 <b>딱 한 번</b> 눌러요. 그때의 간격이 그대로 판정이에요.",
        "겹침은 여러 번 와요. 천천히 다가오는 겹침을 기다리는 쪽이 훨씬 잡기 쉬워요.",
      ],
      short: "두 바가 겹치는 순간 한 번만 · 기다리면 잡기 쉬운 겹침이 와요",
      desc: "두 바가 겹친 순간 눌러요 (한 번 누르면 그대로 끝나요)",
    },
    roar: {
      key: "roar",
      title: "🔥 함성 유지",
      lines: [
        "함성 게이지가 계속 식어요. <b>연타</b>로 올려서 목표선(│) 위에 붙잡아 둬요.",
        "목표선 위에 머문 시간이 쌓여요. 높이 올릴수록 더 빨리 쌓이고, 목표선은 시간이 갈수록 조금씩 올라가요.",
        "너무 세게 쳐서 붉은 구간까지 올리면 <b>삑사리(🎙️💥)</b>가 나요 — 게이지가 꺾이고 잠깐 안 먹혀요.",
      ],
      short: "연타로 목표선(│) 위에서 버텨요 · 붉은 구간까지 올리면 삑사리예요",
      desc: "빠르게 여러 번 눌러 함성을 끌어올려요",
    },
  };
  /* 버튼 이름은 opts에서 그대로 가져와요 — 화면의 버튼과 설명의 버튼 이름이
   * 다르면 설명이 오히려 헷갈려요. */
  const stageReady = (mech, opts, fallback) => ({
    key: READY[mech].key,
    title: READY[mech].title,
    lines: READY[mech].lines,
    short: READY[mech].short,
    keys: [{ name: (opts && opts.button) || fallback, desc: READY[mech].desc }],
  });

  /* ================================================================
   * 🎬 오프닝 — 함성 웨이브
   *
   * 관객석 구역이 가로로 늘어서 있고 빛이 왼쪽에서 오른쪽으로 흘러요.
   * 🙌 구역 3곳이 표시돼 있고, 빛이 그 구역의 최고조에 닿는 순간 탭해요.
   * 3번 다 잡으면 perfect, 2번이면 good, 1번 이하면 miss예요.
   *
   * 기존 sequence와 다른 점: sequence는 정해진 순서를 '기억해서' 누르는 거예요.
   * 여기서는 외울 게 없어요 — 판정 창 자체가 화면을 가로질러 '이동'해요.
   *
   * 연타 방어: 탭 한 번은 '지금 차례인 구역' 하나를 확정해요. 미리 치면 그
   * 구역이 그대로 놓친 것으로 굳고(파도가 끊겨요) 다음 구역으로 넘어가요.
   * 그래서 마구 두드리면 세 구역이 순식간에 전부 miss로 확정돼요.
   * ================================================================ */
  const WAVE = {
    seats: 7,             // 관객석 구역 수
    cues: [1, 3, 5],      // 함성이 최고조가 되는 구역 (여기서 탭해요)
    speed: 27,            // 빛이 흐르는 속도(%/초) → 한 번 흐르는 데 3.7초
    /* 판정 창 절반(ms). 3번 연속을 요구하니 창을 넉넉히 주면 곧바로 전원 perfect가
     * 돼요. 아래 값은 tests/idol/tour-mech-test.js로 실측해 잡았어요 —
     * 능숙한 사람(오차 σ70ms)이 perfect 60%대, 보통(σ120ms)이 30%대예요. */
    baseMs: 90,           // 능력치가 0일 때
    perMs: 1.8,           // zonePct 1당 넓어지는 폭 → zone 10:108ms · zone 40:162ms
    /* 프레임이 안 돌아도 여기서 끝내요. 빛은 프레임 간격(dt)으로 흐르니 프레임이
     * 느리면 '게임 시간'이 늦게 흘러요 — 벽시계로 빨리 끊으면 느린 기기만 손해예요.
     * 정상 경로에서는 빛이 오른쪽 끝에 닿으면서 tick이 먼저 끝내요(3.7초). */
    cap: 6500,
  };
  const waveWinMs = (zone) => WAVE.baseMs + clampV(zone, 10, 40) * WAVE.perMs;
  const waveCenter = (i) => ((i + 0.5) / WAVE.seats) * 100;
  const waveJudge = (hits) => (hits >= 3 ? "perfect" : hits === 2 ? "good" : "miss");

  /* 🎬 한 판. **여기서부터가 시간이 흐르는 자리예요** — 준비 화면의 ▶️ 시작을
   * 누른 뒤에만 불려요. 이 함수 밖에는 타이머가 한 줄도 없어요. */
  function runWave(container, opts, cb) {
    const zone = zoneOf(opts);
    const half = WAVE.speed * waveWinMs(zone) / 1000;   // 판정 창 절반(%)
    const seatsHTML = Array.from({ length: WAVE.seats }, (_, i) =>
      `<span class="ts-seat${WAVE.cues.includes(i) ? " ts-cue" : ""}" data-i="${i}">${
        WAVE.cues.includes(i) ? "🙌" : "👥"}</span>`).join("");
    const wrap = makeBox(container, opts.label || "🎬 함성 웨이브를 잡아요!", `
      <div class="ts-wave">
        <div class="ts-wave-light"></div>
        <div class="ts-seats">${seatsHTML}</div>
      </div>
      <p class="ts-dots"></p>
      <p class="tm-legend-tip">🙌 구역에 빛이 닿는 순간 탭해요 · 3번 연속이면 완벽!</p>
      <button type="button" class="btn btn-primary tm-btn ts-tap">${opts.button || "함성! 🙌"}</button>`);

    const light = wrap.querySelector(".ts-wave-light");
    const seats = wrap.querySelectorAll(".ts-seat");
    const dots = wrap.querySelector(".ts-dots");
    const btn = wrap.querySelector(".tm-btn");
    const strip = wrap.querySelector(".ts-wave");

    let pos = 0, cur = 0, hits = 0, raf = 0, done = false, lit = -1;
    const marks = [];
    const paintDots = () => {
      dots.textContent = WAVE.cues
        .map((_, i) => (i < marks.length ? (marks[i] ? "🙌" : "💧") : "◦")).join(" ");
    };
    paintDots();

    // 빛이 어느 구역 위에 있는지 칠해요 (같은 구역이면 손대지 않아요 — 매 프레임 DOM을 안 만져요)
    function paintLight() {
      const idx = clampV(Math.floor(pos / (100 / WAVE.seats)), 0, WAVE.seats - 1);
      if (idx === lit) return;
      if (lit >= 0) seats[lit].classList.remove("ts-on");
      seats[idx].classList.add("ts-on");
      lit = idx;
    }

    function resolve(hit) {
      const seat = seats[WAVE.cues[cur]];
      seat.classList.add(hit ? "ts-hit" : "ts-break");
      if (hit) hits += 1;
      else strip.classList.add("ts-wave-cut");            // 파도가 끊겨요
      marks.push(hit);
      cur += 1;
      paintDots();
    }

    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(guard);
      while (cur < WAVE.cues.length) resolve(false);      // 남은 구역은 놓친 거예요
      const res = waveJudge(hits);
      btn.disabled = true;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, OUTRO);
    }
    const guard = setTimeout(finish, WAVE.cap);

    let last = performance.now();
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      pos += dt * WAVE.speed;
      light.style.left = `${Math.min(pos, 100)}%`;
      paintLight();
      // 탭 없이 판정 창을 지나갔으면 그 구역은 놓친 거예요
      while (cur < WAVE.cues.length && pos > waveCenter(WAVE.cues[cur]) + half) resolve(false);
      if (cur >= WAVE.cues.length || pos >= 100) { finish(); return; }
      raf = requestAnimationFrame(tick);
    }

    const tap = () => {
      if (done || cur >= WAVE.cues.length) return;
      resolve(Math.abs(pos - waveCenter(WAVE.cues[cur])) <= half);
      if (cur >= WAVE.cues.length) finish();
    };
    onTap(btn, tap);
    onTap(strip, tap);                                    // 관객석을 직접 눌러도 돼요
    raf = requestAnimationFrame(tick);
  }

  /* ================================================================
   * ✨ 킬링파트 — 싱크로
   *
   * 두 개의 바가 서로 다른 속도로 왕복해요. 둘이 겹치는 순간에 탭해요.
   * 탭 한 번으로 끝나요 — 그때의 간격이 판정이에요.
   *
   * 기존 play와 다른 점: play는 '고정된' 초록 존에 움직이는 커서를 맞춰요.
   * 여기엔 고정된 존이 없어요. 두 움직이는 대상의 교차를 기다려야 해요.
   *
   * 속도를 크게 갈라 놨어요(느린 바 18%/초 · 빠른 바 52%/초). 그래서 겹침이
   * 세 번쯤 오는데 서로 성격이 달라요 — 마주 보고 스쳐 지나가는 겹침은 순식간이고,
   * 한 바가 벽에서 튕겨 같은 방향이 된 뒤의 겹침은 천천히 다가와요. 급하게 치면
   * 어려운 겹침을 잡게 되고, 기다리면 쉬운 겹침이 와요. '기다리는 긴장'이 이 맛이에요.
   * ================================================================ */
  const SYNC = {
    slow: 18,             // 느린 바 속도(%/초)
    fast: 52,             // 빠른 바 속도(%/초)
    barW: 16,             // 바 폭(%) — 화면에서 겹침이 보이는 크기예요
    cap: 4000,            // 이 안에 못 맞추면 miss (판정 연출까지 4.45초)
    /* 판정은 탭한 순간의 두 바 간격(%)이에요. 느린 겹침(접근 34%/초)에서는
     * 퍼펙트 간격 2.35%가 시간으로 ±69ms쯤이에요 — 실측은 tour-mech-test.js에 있어요. */
    perfBase: 1.6, perfPer: 0.075,  // 퍼펙트 간격(%) — zonePct로 넓어져요
    goodBase: 6.5, goodPer: 0.26,   // 성공 간격(%)
  };
  const syncPerf = (zone) => SYNC.perfBase + clampV(zone, 10, 40) * SYNC.perfPer;
  const syncGood = (zone) => SYNC.goodBase + clampV(zone, 10, 40) * SYNC.goodPer;
  const syncJudge = (gap, zone) =>
    gap <= syncPerf(zone) ? "perfect" : gap <= syncGood(zone) ? "good" : "miss";

  /* ✨ 한 판. runWave와 같아요 — 준비 화면을 누른 뒤에만 시계가 돌아요. */
  function runSync(container, opts, cb) {
    const zone = zoneOf(opts);
    const perfW = syncPerf(zone), goodW = syncGood(zone);
    const wrap = makeBox(container, opts.label || "✨ 두 파트가 겹치는 순간!", `
      <div class="ts-sync">
        <div class="ts-sync-row"><div class="ts-sync-bar ts-bar-a">🎤</div></div>
        <div class="ts-sync-row"><div class="ts-sync-bar ts-bar-b">🎶</div></div>
      </div>
      <p class="tm-legend-tip">두 파트가 위아래로 겹치는 순간을 노려요 · 겹침은 자주 안 와요</p>
      <button type="button" class="btn btn-primary tm-btn ts-tap">${opts.button || "싱크! ✨"}</button>`);

    const barA = wrap.querySelector(".ts-bar-a");
    const barB = wrap.querySelector(".ts-bar-b");
    const btn = wrap.querySelector(".tm-btn");

    /* 어느 바가 느린지와 어느 쪽에서 출발하는지를 매번 흔들어요 — 외운 순서로
     * 이기지 못하게요. 그래도 '마주 보고 출발'은 지켜서, 겹침이 반드시 와요. */
    const flip = Math.random() < 0.5, mirror = Math.random() < 0.5;
    let pa = rand(10, 24), pb = rand(76, 90), da = 1, db = -1;
    const sa = (flip ? SYNC.fast : SYNC.slow) * rand(0.94, 1.06);
    const sb = (flip ? SYNC.slow : SYNC.fast) * rand(0.94, 1.06);
    if (mirror) { pa = 100 - pa; da = -1; pb = 100 - pb; db = 1; }

    let raf = 0, done = false;
    const place = () => {
      barA.style.left = `${pa - SYNC.barW / 2}%`;
      barB.style.left = `${pb - SYNC.barW / 2}%`;
      const gap = Math.abs(pa - pb);
      wrap.classList.toggle("ts-sync-near", gap <= goodW);
      wrap.classList.toggle("ts-sync-hot", gap <= perfW);
    };
    place();

    function finish(res) {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(guard);
      btn.disabled = true;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, OUTRO);
    }
    const guard = setTimeout(() => finish("miss"), SYNC.cap);

    let last = performance.now();
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      pa += da * dt * sa; pb += db * dt * sb;
      if (pa <= 0) { pa = 0; da = 1; } else if (pa >= 100) { pa = 100; da = -1; }
      if (pb <= 0) { pb = 0; db = 1; } else if (pb >= 100) { pb = 100; db = -1; }
      place();
      raf = requestAnimationFrame(tick);
    }
    onTap(btn, () => { if (!done) finish(syncJudge(Math.abs(pa - pb), zone)); });
    raf = requestAnimationFrame(tick);
  }

  /* ================================================================
   * 🔥 앵콜 — 함성 유지
   *
   * 관객 함성 게이지가 계속 떨어져요. 연타로 올리면서 목표선 위에서 버텨요.
   * 목표선 위에 머문 시간의 비율이 판정이에요.
   *
   * 기존 hold와 다른 점: hold는 꾹 눌러 모았다가 한 번 떼는 '단발'이에요.
   * 여기는 떼는 순간이 없어요 — 연타로 계속 '유지'하는 거예요.
   *
   * 그리고 위로도 한계가 있어요. 삑사리 문턱을 넘기면 목이 갈라져서 함성이
   * 그 자리에서 꺾여요. 세게만 치면 못 버텨요 — 속도를 맞춰야 해요.
   *
   * 🎚 높이 올릴수록 시간이 더 크게 쌓여요(creditLow). 목표선 위이기만 하면 되던
   * 시절에는 '목표선에 딱 붙어 살살 치기'가 가장 안전하면서 동시에 가장 좋은 수였어요 —
   * 위험을 아예 안 지는 수가 최선이면 삑사리 구간이 있으나 없으나 같아요.
   * 지금은 목표선에 붙어 있으면 성공까지, 완벽은 위험을 지고 올라가야 나와요.
   *
   * 목표선은 시간이 갈수록 조금씩 올라가요(rise). 객석이 점점 더 큰 함성을
   * 원하니까요. 처음에 맞춘 속도로 끝까지 버틸 수 없어요 — '끝까지 버티는 것'이
   * 체력을 보는 이유예요.
   *
   * ⚖️ 난이도를 정하는 건 '연타 속도'가 아니라 '버틸 수 있는 폭(band)'이에요.
   * 초당 몇 번을 쳐야 하는지로 난이도를 잡아 보니 계단이 됐어요 — 초당 6.7번
   * 치는 사람은 전부 perfect, 5.3번인 사람은 전부 miss. 손이 빠른지로 갈리는 건
   * 기기와 손가락 싸움이라 육성 게임에서 볼 것이 아니에요.
   * 그래서 유지 속도는 편하게(초당 3.9번) 두고, 목표선~삑사리 사이의 폭을
   * 능력치로 넓혀요. 한 번 치면 7 오르고 사람은 0.2초쯤 늦게 반응하니(≈5),
   * 폭이 16이면 아슬아슬하고 33이면 넉넉해요. 그 사이를 체력이 벌어 줘요.
   * (실측은 tests/idol/tour-mech-test.js가 갖고 있어요.) */
  const ROAR = {
    dur: 3600,            // 버티는 시간(ms)
    gain: 7,              // 연타 한 번에 오르는 양
    /* 함성이 식는 속도(%/초). 능력치가 높으면 덜 식어요 — 유지에 필요한 연타 속도가
     * 곧 이 값 ÷ gain이에요 (zone 10이면 초당 4.1번, zone 40이면 3.6번). */
    decayBase: 30, decayPer: 0.12,
    below: 6,             // 목표선보다 이만큼 아래에서 시작해요
    lineBase: 46, linePer: 0.20,     // 목표선 — 능력치가 높으면 조금 내려와요
    rise: 10,             // 끝날 때까지 목표선이 이만큼 올라가요
    bandBase: 12, bandPer: 0.30,     // 버틸 수 있는 폭 → zone 10:15 · zone 40:24
    creditLow: 0.5,       // 목표선에 딱 붙어 있을 때 쌓이는 비율 (문턱 근처면 1.0)
    /* 삑사리가 나면 목표선 아래로 떨어지고, 잠깐 목이 안 나와요(연타가 안 먹혀요).
     * 문턱에서 고정폭만 깎으면 안 돼요 — 그게 폭보다 작으면 삑사리가 나도 여전히
     * 목표선 위라서, 세게만 쳐도 아무 손해가 없어요. 위쪽 한계가 실제로 아파야
     * '세게만 치면 안 된다'가 성립해요. */
    crackBelow: 14,       // 삑사리 뒤에는 목표선보다 이만큼 아래로 떨어져요
    crackMute: 320,       // 삑사리 뒤 연타가 안 먹히는 시간(ms)
    perfect: 0.68, good: 0.40,       // 쌓인 함성 비율 문턱
  };
  /* frac은 지금까지 흐른 시간 비율(0~1)이에요 — 목표선이 그만큼 올라가요. */
  const roarLine = (zone, frac) =>
    ROAR.lineBase - clampV(zone, 10, 40) * ROAR.linePer + ROAR.rise * (frac || 0);
  const roarBand = (zone) => ROAR.bandBase + clampV(zone, 10, 40) * ROAR.bandPer;
  const roarDecay = (zone) => ROAR.decayBase - clampV(zone, 10, 40) * ROAR.decayPer;
  const roarCrack = (zone, frac) => roarLine(zone, frac) + roarBand(zone);
  const roarJudge = (frac) =>
    frac >= ROAR.perfect ? "perfect" : frac >= ROAR.good ? "good" : "miss";
  /* 목표선 위 높이에 따라 시간이 쌓이는 비율 — 목표선에서 creditLow, 문턱에서 1.0 */
  const roarCredit = (g, line, band) =>
    g < line ? 0 : ROAR.creditLow + (1 - ROAR.creditLow) * clampV((g - line) / band, 0, 1);

  /* 🔥 한 판. runWave와 같아요 — 준비 화면을 누른 뒤에만 시계가 돌아요. */
  function runRoar(container, opts, cb) {
    const zone = zoneOf(opts);
    let line = roarLine(zone, 0), crack = roarCrack(zone, 0);
    const decay = roarDecay(zone), band = roarBand(zone);
    const wrap = makeBox(container, opts.label || "🔥 함성을 끝까지 유지해요!", `
      <div class="ts-roar">
        <div class="ts-roar-fill"></div>
        <div class="ts-roar-crackzone"></div>
        <div class="ts-roar-line"></div>
      </div>
      <div class="ts-hold"><div class="ts-hold-fill"></div><div class="ts-hold-goal"></div></div>
      <p class="tm-legend-tip">연타로 목표선(│) 위에서 버텨요 · 너무 세게 치면 삑사리 🎙️💥</p>
      <button type="button" class="btn btn-primary tm-btn ts-tap">${opts.button || "연타! 🔥"}</button>`);

    const crackEl = wrap.querySelector(".ts-roar-crackzone");
    const fill = wrap.querySelector(".ts-roar-fill");
    const lineEl = wrap.querySelector(".ts-roar-line");
    const holdFill = wrap.querySelector(".ts-hold-fill");
    const btn = wrap.querySelector(".tm-btn");
    // 완벽 문턱을 눈금으로 보여줘요 — 어디까지 채워야 하는지 모르면 배짱을 낼 수 없어요
    wrap.querySelector(".ts-hold-goal").style.left = `${ROAR.perfect * 100}%`;
    let g = clampV(line - ROAR.below, 0, 100);
    let held = 0, elapsed = 0, raf = 0, done = false, muteUntil = 0;

    function paint() {
      crackEl.style.left = `${crack}%`;
      crackEl.style.width = `${Math.max(0, 100 - crack)}%`;
      lineEl.style.left = `${line}%`;
      fill.style.width = `${clampV(g, 0, 100)}%`;
      holdFill.style.width = `${Math.round(held / ROAR.dur * 100)}%`;
      wrap.classList.toggle("ts-roar-on", g >= line && g < crack);
    }
    paint();

    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(guard);
      const res = roarJudge(held / ROAR.dur);
      btn.disabled = true;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, OUTRO);
    }
    /* 프레임이 끊긴 기기를 위한 안전망이에요. 게이지는 프레임 간격(dt)으로 움직이니
     * 프레임이 느리면 '게임 시간'이 늦게 흘러요. 벽시계로 너무 빨리 끊으면 느린 기기만
     * 손해를 봐요 — 그래서 넉넉하게 잡아요. 정상 경로에서는 tick이 먼저 끝내요. */
    const guard = setTimeout(finish, ROAR.dur + 1200);

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      elapsed += dt;
      // 객석이 원하는 함성이 점점 커져요 — 목표선과 삑사리 문턱이 같이 올라가요
      const frac = clampV(elapsed / ROAR.dur, 0, 1);
      line = roarLine(zone, frac);
      crack = roarCrack(zone, frac);
      if (g < crack) held += dt * roarCredit(g, line, band);
      g = clampV(g - decay * dt / 1000, 0, 100);
      paint();
      if (elapsed >= ROAR.dur) { finish(); return; }
      raf = requestAnimationFrame(tick);
    }

    onTap(btn, () => {
      if (done || elapsed < muteUntil) return;      // 삑사리 직후엔 목이 안 나와요
      g += ROAR.gain;
      if (g >= crack) {                             // 🎙️💥 삑사리 — 함성이 꺾여요
        g = clampV(line - ROAR.crackBelow, 0, 100);
        muteUntil = elapsed + ROAR.crackMute;
        wrap.classList.add("ts-roar-crackhit");
        setTimeout(() => wrap.classList.remove("ts-roar-crackhit"), ROAR.crackMute);
      }
      g = clampV(g, 0, 100);
      paint();
    });
    raf = requestAnimationFrame(tick);
  }

  /* 바깥에서 부르는 건 이 셋이에요 — 전부 준비 화면부터예요. */
  function wave(container, opts, cb) {
    ready(container, stageReady("wave", opts, "함성! 🙌"), () => runWave(container, opts || {}, cb));
  }
  function sync(container, opts, cb) {
    ready(container, stageReady("sync", opts, "싱크! ✨"), () => runSync(container, opts || {}, cb));
  }
  function roar(container, opts, cb) {
    ready(container, stageReady("roar", opts, "연타! 🔥"), () => runRoar(container, opts || {}, cb));
  }

  return {
    wave, sync, roar,
    /* 테스트가 판정 산식을 그대로 굴려 볼 수 있게 열어 둬요 — 난이도를 손으로
     * 베껴 두면 여기를 고칠 때 테스트만 옛 숫자로 남아요.
     * 준비 화면 쪽도 같은 이유로 열어 둬요 (횟수 문턱을 테스트가 베껴 적지 않게요). */
    _t: {
      WAVE, SYNC, ROAR,
      waveWinMs, waveCenter, waveJudge,
      syncPerf, syncGood, syncJudge,
      roarLine, roarBand, roarDecay, roarCrack, roarCredit, roarJudge,
      READY_KEY, FULL_SHOWS, readSeen, READY, stageReady,
    },
  };
})();
