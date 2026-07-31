/* 🍂 가을야구 전용 미니게임 2종 — 야구(더 드래프트)만 내려받아요.
 *
 * 왜 timing.js가 아니고 여기냐면: timing.js(8종)는 8개 게임이 전부 내려받아요.
 * 가을야구에서만 쓰는 메커닉을 거기 넣으면 쓰지 않는 7개 게임까지 무게를 져요.
 * 아이돌 월드투어가 tour-stage.js로 같은 길을 먼저 갔고, 이 파일은 그 선례를 따라요.
 * 그래서 timing.js도 tour-stage.js도 한 줄 안 건드렸어요.
 *
 * 인터페이스는 timing.js와 똑같아요 — fn(container, opts, cb)이고 cb(res)의 res는
 * "perfect" | "good" | "miss" 셋뿐이에요. 그래서 game.js의 기존 경로
 * (beginProMoment · beginMidMoment · playRelief)가 아무 변환 없이 그대로 받아요.
 * DOM 구성·이벤트·정리 순서도 timing.js의 관례를 그대로 따라요: .tm-box를
 * container에 붙이고, 끝나면 tm-done-* 를 붙여 잠깐 보여준 뒤 박스를 지우고 cb를 불러요.
 *
 *   PostStage.count(box, { label, button, zonePct, tier, countLabels }, cb)  🧊 볼카운트 승부
 *   PostStage.dash (box, { label, goText, stopText, zonePct, tier }, cb)     🏃 홈 승부
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🆕 무엇이 새로운가 — 이게 이 파일의 존재 이유예요
 *
 * 기존 8종(timing.js)은 play·hold·sequence·reaction·duel·target·drop·odd이고,
 * 투어 3종(tour-stage.js)은 이동하는 판정 창·두 대상의 교차·연타 유지예요.
 * **열한 개 모두 "누르는 것"이 곧 행동이에요.** 안 누르면 그냥 실패예요.
 *
 *  🧊 count — **참는 것이 수(手)예요.** 존을 벗어나는 공을 골라내면 카운트가
 *     유리해지고, 유리한 카운트에서 친 공만 완벽이에요. 즉 완벽에 닿으려면
 *     **적어도 한 번은 반드시 손을 내지 않아야** 해요. 그리고 판이 한 번에 끝나지
 *     않아요 — 볼카운트라는 상태가 공과 공 사이를 건너가면서, 앞 공의 선택이
 *     뒤 공의 값어치를 바꿔요. 열한 개 중 어느 것도 이 두 가지를 갖고 있지 않아요.
 *
 *  🏃 dash — **정보와 시간을 맞바꿔요.** 열한 개는 전부 화면이 처음부터 전부
 *     보여요(존도, 커서도, 아이콘도). 여기서는 송구가 처음에 안 보이고 시간이
 *     지나야 드러나는데, 그 사이 주자는 계속 나아가서 **되돌아갈 수 있는 자리를
 *     잃어요.** 더 알고 싶으면 물러설 권리를 내놔야 해요. 게다가 버튼이 둘이라
 *     "언제 누르나"가 아니라 "무엇을 고르나"가 물음이에요.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * zonePct는 game.js의 miniZone(stat)이 준 값(10~40)이에요. 능력치와 컨디션이
 * 높으면 커져요. 둘 다 이 값으로 판정을 느슨하게 해요 — 육성이 가을야구에
 * 닿는 자리예요. 어느 능력치를 보는지는 game.js의 POST_MECH가 정해요.
 *
 * tier는 시리즈의 깊이예요 (0 와일드카드·준PO / 1 PO / 2 마지막 시리즈).
 * 뒤로 갈수록 공이 늦게 휘고 어깨가 강해져요 — 같은 능력치로도 더 어려워요.
 *
 * 두 메커닉 모두 3~5초에 끝나요. 가을야구 한 시리즈가 최대 5경기, 경기마다
 * 미니게임이 여러 번이라 한 판이 길면 그 자체가 버그예요.
 * 실제 소요·난이도·우승 확률은 tests/rookie/post-mech-test.js가 재요.
 */
"use strict";

window.PostStage = (() => {
  const clampV = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const zoneOf = (opts) => clampV((opts && opts.zonePct) || 22, 10, 40);
  const tierOf = (opts) => clampV(Math.round((opts && opts.tier) || 0), 0, 2);

  /* 판정을 보여주고 치우는 시간. timing.js의 450~500ms와 같은 감각이에요. */
  const OUTRO = 450;

  function makeBox(container, label, inner) {
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `<p class="tm-label">${label}</p>${inner}`;
    container.appendChild(wrap);
    return wrap;
  }

  /* 📱 모바일 탭 — pointerdown이 click보다 빠르고 스크롤·더블탭 확대에 안 밀려요.
   * 실기기에서는 pointerdown 뒤에 click이 한 번 더 오는데, 둘 다 세면 한 번 누른
   * 게 두 번이 돼요. 그래서 pointerdown 직후에 오는 click만 버려요. 시간으로
   * 가르면 포인터가 없는 환경(jsdom·구형 브라우저)의 키보드 입력도 같이 살아요.
   * tour-stage.js가 같은 이유로 같은 모양을 갖고 있어요. */
  const TAP_ECHO = 700;
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
   * 🧊 볼카운트 승부 — 참는 것이 수(手)예요
   *
   * 포수 시점이에요. 스트라이크 존이 가운데 있고, 공이 작게 나타나 커지면서
   * 날아와요. 처음에는 전부 한가운데로 오는 것처럼 보이다가 **휘는 지점**을
   * 지나면서 진짜 자리로 갈라져요 — 존 안에 꽂히거나, 존을 벗어나거나.
   *
   * 버튼은 하나예요. 누르면 스윙, **안 누르면 참기**예요. 참기가 아무것도
   * 하지 않는 게 아니라는 게 이 메커닉의 전부예요:
   *
   *   스윙 & 존 안  → 받아쳤어요. 여기서 판이 끝나요.
   *                   지금 카운트가 볼 > 스트라이크면 perfect, 아니면 good
   *   스윙 & 존 밖  → 헛스윙. 스트라이크 +1
   *   참기 & 존 안  → 루킹. 스트라이크 +1
   *   참기 & 존 밖  → 골라냈어요. 볼 +1
   *
   * 1볼 1스트라이크에서 시작해요(위기 상황을 이어받는 거예요). 3스트라이크면
   * 삼진(miss), 4볼이면 볼넷(good)이에요. 시작 카운트 덕에 **네 번째 공까지
   * 가면 반드시 어느 한쪽 문턱에 닿아요** — 애매하게 끝나는 판이 없어요.
   *
   * ⚖️ 여기서 나오는 것: 초구를 그냥 받아치면 카운트가 1-1(동률)이라 아무리 잘
   * 맞아도 good이에요. **perfect는 볼을 하나라도 골라낸 사람만 볼 수 있어요.**
   * 반대로 욕심내 참다가 존에 꽂히는 공을 두 번 보내면 그대로 삼진이에요.
   * "칠 수 있는 공을 참는 배짱"과 "속지 않는 눈"이 같은 자리에서 부딪혀요.
   *
   * 🎚 능력치(zonePct)는 두 곳에 들어가요.
   *   ① 휘는 지점이 빨라져요 — 진짜 자리를 볼 시간이 길어져요 (선구안·제구)
   *   ② 볼이 존에서 더 크게 벗어나요 — 애매한 공이 줄어요
   * 두 가지 다 "판독이 쉬워진다"예요. 판정 문턱은 능력치로 안 흔들어요 —
   * 카운트 규칙은 야구 규칙이라 사람마다 다르면 거짓말이 돼요.
   * ================================================================ */
  const COUNT = {
    flight: 900,          // 공 하나가 홈까지 오는 시간(ms)
    gap: 180,             // 다음 공까지 쉬는 시간(ms)
    b0: 1, s0: 1,         // 시작 카운트 — 위기를 이어받아요
    balls: 4, strikes: 3, // 볼넷 · 삼진 문턱 (야구 그대로예요)
    /* 존을 지나는 공의 비율. 실제 야구의 존 통과율(45% 안팎)에 맞춰 뒀어요.
     * 이 값이 곧 "아무 생각 없이 초구부터 휘두르는 사람"의 성적을 정해요 —
     * 0.44면 good 69% · miss 31%라 기존 8종을 무작위로 하는 것과 비슷해요. */
    pStrike: 0.44,
    pStrikeTier: -0.015,  // 뒤 시리즈일수록 유인구가 늘어요
    zx: [34, 66], zy: [26, 74],   // 스트라이크 존 (박스 안 %)
    /* 휘는 지점(비행 비율). 능력치가 높으면 앞당겨져요 —
     * zone 10 tier 0 → 0.515(판독 437ms) · zone 40 tier 0 → 0.32(612ms) */
    breakBase: 0.58, breakPer: -0.0065, breakTier: 0.03,
    /* 공이 존 경계에서 벗어나거나(볼) 파고드는(스트라이크) 정도(%).
     * zone 10 → 2.6 · zone 40 → 7.4. **여기가 이 메커닉의 난이도 손잡이예요.**
     * 능력치가 낮으면 볼과 스트라이크가 종이 한 장 차이로 지나가서, 잘 봐도
     * 갈라내지 못해요 — 그게 곧 '선구안이 없다'예요. 휘는 지점만으로 난이도를
     * 잡아 보니 능력치를 올려도 성적이 거의 안 움직였어요(실측 34% → 34%).
     * 사람은 궤적의 방향까지 보고 도착점을 꽤 잘 외삽하거든요. */
    edgeBase: 1.0, edgePer: 0.16, edgeTier: -0.35,
    /* 위아래는 존이 넓고 화면은 가로로 길어요. 같은 %가 픽셀로는 더 작게
     * 보여서, 위아래로 뺄 때만 이만큼 곱해요. */
    edgeY: 1.5,
    /* 프레임이 안 돌아도 여기서 끝내요. 정상 경로에서는 네 번째 공에서
     * 반드시 문턱에 닿아 tick이 먼저 끝내요 (최대 4×1080ms). */
    cap: 5800,
  };
  const countBreak = (zone, tier) =>
    clampV(COUNT.breakBase + clampV(zone, 10, 40) * COUNT.breakPer + tier * COUNT.breakTier, 0.2, 0.75);
  const countEdge = (zone, tier) =>
    Math.max(1.2, COUNT.edgeBase + clampV(zone, 10, 40) * COUNT.edgePer + tier * COUNT.edgeTier);
  const countStrikeP = (tier) => clampV(COUNT.pStrike + tier * COUNT.pStrikeTier, 0.2, 0.8);
  /* 받아쳤을 때의 등급 — 유리한 카운트(볼 > 스트라이크)에서만 완벽이에요 */
  const countHitGrade = (b, s) => (b > s ? "perfect" : "good");
  /* 한 공이 끝난 뒤 승부가 났는지. 안 났으면 null이에요 */
  const countEnd = (b, s) => (s >= COUNT.strikes ? "miss" : b >= COUNT.balls ? "good" : null);

  function count(container, opts, cb) {
    const zone = zoneOf(opts), tier = tierOf(opts);
    const brk = countBreak(zone, tier);
    const edge = countEdge(zone, tier);
    const pS = countStrikeP(tier);
    const names = (opts && opts.countLabels) || ["볼", "스트라이크"];
    /* 문구는 통째로 갈아끼울 수 있어요. 투수는 같은 규칙을 '유인구와 몰린 공'으로
     * 읽어야 말이 되거든요 — 투수가 "볼넷으로 걸어 나가요"를 보면 안 돼요. */
    const msg = Object.assign({
      hitPerfect: "💥 노림수 적중, 통타!",
      hitGood: "🏏 받아쳤어요!",
      whiff: "🌀 헛스윙…",
      looking: "😐 존에 꽂혔어요",
      taken: "👀 골라냈어요",
      out: "❌ 삼진…",
      free: "🚶 볼넷으로 걸어 나가요",
      timeup: "⏱️ 승부 종료",
      tip: "존을 벗어나면 참아요 · <b>유리한 카운트</b>에서 친 공만 완벽해요",
    }, (opts && opts.msg) || {});
    const wrap = makeBox(container, opts.label || "🧊 볼카운트 승부! 벗어나는 공은 참아요", `
      <div class="ps-plate">
        <div class="ps-zone"></div>
        <div class="ps-ball">⚾</div>
      </div>
      <p class="ps-count"></p>
      <p class="ps-mark">&nbsp;</p>
      <p class="tm-legend-tip">${msg.tip}</p>
      <button type="button" class="btn btn-primary tm-btn ps-tap">${opts.button || "스윙! 🏏"}</button>`);

    const zoneEl = wrap.querySelector(".ps-zone");
    const ball = wrap.querySelector(".ps-ball");
    const countEl = wrap.querySelector(".ps-count");
    const markEl = wrap.querySelector(".ps-mark");
    const btn = wrap.querySelector(".tm-btn");
    zoneEl.style.left = `${COUNT.zx[0]}%`;
    zoneEl.style.width = `${COUNT.zx[1] - COUNT.zx[0]}%`;
    zoneEl.style.top = `${COUNT.zy[0]}%`;
    zoneEl.style.height = `${COUNT.zy[1] - COUNT.zy[0]}%`;

    let b = COUNT.b0, s = COUNT.s0, pitches = 0;
    let cur = null, t0 = 0, raf = 0, done = false, live = false;

    const dots = (n, max) => "●".repeat(n) + "○".repeat(Math.max(0, max - n));
    function paintCount() {
      countEl.innerHTML =
        `<span class="ps-c-ball">${names[0]} ${dots(b, COUNT.balls)}</span>` +
        `<span class="ps-c-sep">·</span>` +
        `<span class="ps-c-strike">${names[1]} ${dots(s, COUNT.strikes)}</span>`;
    }
    paintCount();

    function newPitch() {
      pitches += 1;
      const strike = Math.random() < pS;
      // 처음에는 전부 한가운데로 오는 것처럼 보여요 (fake) — 갈라지는 건 휘는 지점부터예요
      const c = {
        strike,
        sx: rand(46, 54), sy: rand(44, 56),
        fx: rand(COUNT.zx[0] + 7, COUNT.zx[1] - 7), fy: rand(COUNT.zy[0] + 9, COUNT.zy[1] - 9),
        dx: rand(COUNT.zx[0] + 6, COUNT.zx[1] - 6), dy: rand(COUNT.zy[0] + 8, COUNT.zy[1] - 8),
      };
      /* 볼과 스트라이크가 정확히 대칭이에요 — 네 변 중 하나를 골라, 그 경계에서
       * off만큼 **밖(볼)** 또는 **안(스트라이크)** 에 꽂혀요. 한쪽만 경계에 붙이면
       * "가장자리로 오는 공은 전부 볼"이라는 공짜 힌트가 생겨서 눈이 필요 없어져요. */
      const side = Math.floor(Math.random() * 4);
      const off = rand(0.6, 1.0) * edge * (side >= 2 ? COUNT.edgeY : 1) * (strike ? -1 : 1);
      if (side === 0) c.dx = COUNT.zx[0] - off;
      else if (side === 1) c.dx = COUNT.zx[1] + off;
      else if (side === 2) c.dy = COUNT.zy[0] - off;
      else c.dy = COUNT.zy[1] + off;
      cur = c;
      live = true;
      wrap.classList.remove("ps-swing");
      t0 = performance.now();
      paintBall(0);
      raf = requestAnimationFrame(tick);
    }

    function paintBall(t) {
      const f = Math.min(1, t / brk);
      const u = t <= brk ? 0 : (t - brk) / (1 - brk);
      const g = 1 - (1 - u) * (1 - u);          // 휜 뒤에는 금방 벌어져요
      ball.style.left = `${cur.sx + (cur.fx - cur.sx) * f + (cur.dx - cur.fx) * g}%`;
      ball.style.top = `${cur.sy + (cur.fy - cur.sy) * f + (cur.dy - cur.fy) * g}%`;
      ball.style.fontSize = `${(0.7 + 1.15 * t).toFixed(2)}rem`;   // 다가올수록 커져요
    }

    /* note는 화면에 남길 한 줄이에요. 바깥의 msg(문구 묶음)와 이름이 겹치면
     * 안에서 msg.timeup 같은 걸 못 읽게 돼요 — 그래서 일부러 다르게 불러요. */
    function finish(res, note) {
      if (done) return;
      done = true;
      live = false;
      cancelAnimationFrame(raf);
      clearTimeout(guard);
      clearTimeout(gapTimer);
      btn.disabled = true;
      markEl.textContent = note;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, OUTRO);
    }
    const guard = setTimeout(() => finish(countEnd(b, s) || (b > s ? "good" : "miss"), msg.timeup), COUNT.cap);
    let gapTimer = 0;

    /* 한 공을 끝내요. swung이 true면 스윙, false면 참은 거예요. */
    function land(swung) {
      if (done || !live) return;
      live = false;
      cancelAnimationFrame(raf);
      if (swung && cur.strike) {
        finish(countHitGrade(b, s), b > s ? msg.hitPerfect : msg.hitGood);
        return;
      }
      if (swung || cur.strike) s += 1; else b += 1;
      paintCount();
      markEl.textContent = swung ? (cur.strike ? "" : msg.whiff)
        : cur.strike ? msg.looking : msg.taken;
      const end = countEnd(b, s);
      if (end) {
        finish(end, end === "miss" ? msg.out : msg.free);
        return;
      }
      if (pitches >= COUNT.balls) {           // 여기 오면 안 돼요 (문턱이 먼저 잡아요)
        finish(b > s ? "good" : "miss", msg.timeup);
        return;
      }
      gapTimer = setTimeout(newPitch, COUNT.gap);
    }

    function tick(now) {
      if (done || !live) return;
      const t = (now - t0) / COUNT.flight;
      paintBall(Math.min(t, 1));
      if (t >= 1) { land(false); return; }    // 그냥 지나가면 참은 거예요
      raf = requestAnimationFrame(tick);
    }

    onTap(btn, () => { if (live) { wrap.classList.add("ps-swing"); land(true); } });
    onTap(wrap.querySelector(".ps-plate"), () => { if (live) { wrap.classList.add("ps-swing"); land(true); } });
    newPitch();
  }

  /* ================================================================
   * 🏃 홈 승부 — 정보와 시간을 맞바꿔요
   *
   * 3루 주자가 홈으로 향해요. 위쪽은 송구, 아래쪽은 주자예요. 둘 다 오른쪽 끝
   * (🏠 홈)을 향하고, 먼저 닿는 쪽이 이겨요.
   *
   * 그런데 **송구는 처음에 안 보여요.** 타구가 어디로 갔는지, 누가 잡았는지
   * 아직 모르는 거예요(🌫). 주자가 어느 지점을 지나야 그제야 송구가 드러나요.
   *
   * 버튼이 둘이에요 — [돌진] 과 [멈춰].
   *   돌진 → 전력으로 홈까지 달려요. 송구보다 먼저 닿으면 득점(perfect),
   *          늦으면 태그아웃(miss). 한 번 가면 못 돌아와요.
   *   멈춰 → 3루로 돌아가요. **귀루 한계선(✋) 안이면** 안전(good),
   *          넘었으면 협살에 걸려요(miss).
   *
   * ⚖️ 여기서 나오는 것: 판단을 미루는 동안 주자는 **머뭇거리며(78% 속도)**
   * 계속 나아가요. 그래서 늦게 결정할수록 ① 돌진해도 홈에 늦게 닿고
   * ② 귀루 한계선을 넘어 물러설 권리 자체를 잃어요. 정보를 더 갖는 값을
   * 자리로 치르는 거예요. 아무것도 안 고르면 협살로 죽어요 — 이 판에서
   * 가장 나쁜 수는 틀린 선택이 아니라 **고르지 않는 것**이에요.
   *
   * 🎚 능력치(zonePct)는 세 곳에 들어가요.
   *   ① 주자가 빨라져요 (홈까지 걸리는 시간 ↓) — 돌진이 실제로 통해요
   *   ② 귀루 한계선이 뒤로 밀려요 — 더 오래 보고도 물러설 수 있어요
   *   ③ 송구가 일찍 드러나요 — 판단할 시간이 길어져요
   * 송구가 오는 시간(throwBase)만은 능력치와 무관한 절대 시간이에요.
   * 주자 시간에 비례시켜 두면 발이 빨라도 성공률이 그대로여서, 주력을 올린
   * 보람이 사라져요.
   * ================================================================ */
  const DASH = {
    /* 3루에서 홈까지 전력으로 달리는 시간(ms). zone 10 → 3060 · zone 40 → 2640 */
    runBase: 3200, runPer: -14,
    hesit: 0.78,          // 아직 안 정했을 때의 속도 배수 — 머뭇거려요
    /* 송구가 홈에 닿는 시간(ms). 주자 시간과 무관한 절대 시간이에요.
     * 2429~3643ms(tier 0)라 발이 느리면 아슬아슬하고 빠르면 넉넉해요. */
    throwBase: 2760, throwLo: 0.88, throwHi: 1.32, throwTier: -0.035,
    /* 귀루 한계선(주자 위치 %). zone 10 → 40.2 · zone 40 → 58.8 */
    backBase: 34, backPer: 0.62, backTier: -1.0,
    /* 송구가 드러나기 시작하는 자리 — **한계선의 몇 할 지점인가**로 잡아요.
     * 그래야 "보고 나서 물러설 수 있는 폭"이 능력치를 따라 같이 넓어져요.
     *   zone 10 tier 0 → 한계선의 80% 지점 (생각할 틈 ≈ 0.31초)
     *   zone 40 tier 0 → 62% 지점            (≈ 0.86초)
     * ⚠️ 예전에는 드러나는 자리와 한계선을 따로 잡았어요. 그러면 어느 능력치에서나
     * 폭이 넉넉해서 **멈추기가 늘 안전한 수**가 됐고, dash의 배수가 능력치와 거의
     * 무관하게 1.00에 붙어 버렸어요(실측 1.000 → 1.018). 물러설 틈이 능력치라야
     * 발이 느린 선수가 실제로 도박을 하게 돼요. 반대로 tier가 이 둘을 양쪽에서
     * 조이게 뒀더니 마지막 시리즈의 저능력치 선수가 99% 아웃이 났어요 —
     * tier는 송구 쪽을 세게 걸고 여기는 살살 건드려요. */
    revealFrac: 0.86, revealFracPer: -0.006, revealFracTier: 0.04,
    /* 프레임이 끊긴 기기를 위한 안전망이에요. 정상 경로에서는 주자가 홈에
     * 닿거나 송구가 먼저 닿아서 tick이 끝내요 (미결정이어도 4초 안). */
    cap: 6000,
  };
  const dashRun = (zone) => DASH.runBase + clampV(zone, 10, 40) * DASH.runPer;
  const dashThrow = (tier) => DASH.throwBase * (1 + tier * DASH.throwTier);
  const dashBack = (zone, tier) =>
    clampV(DASH.backBase + clampV(zone, 10, 40) * DASH.backPer + tier * DASH.backTier, 12, 92);
  const dashReveal = (zone, tier) => dashBack(zone, tier) *
    clampV(DASH.revealFrac + clampV(zone, 10, 40) * DASH.revealFracPer + tier * DASH.revealFracTier, 0.35, 0.95);

  function dash(container, opts, cb) {
    const zone = zoneOf(opts), tier = tierOf(opts);
    const runMs = dashRun(zone);
    const revealAt = dashReveal(zone, tier);
    const backAt = dashBack(zone, tier);
    const throwMs = dashThrow(tier) * rand(DASH.throwLo, DASH.throwHi);
    /* count와 같은 이유로 문구를 통째로 갈아끼울 수 있어요 — 투수는 주자가 아니라
     * 중계·백업 자리에서 같은 판단을 해요. */
    const msg = Object.assign({
      safe: "🎉 홈 세이프! 득점이에요",
      tagged: "❌ 홈에서 태그아웃…",
      rundown: "❌ 3루와 홈 사이에서 협살…",
      back: "🛑 3루에 안전하게 돌아왔어요",
      late: "❌ 어정쩡하게 걸려 협살…",
      going: "🏃 홈으로!!",
      timeup: "⏱️ 주루 판단 실패…",
      tip: "송구는 🌫️ 뒤에 숨어 있어요 · ✋ 선을 넘으면 <b>더는 못 돌아가요</b>",
    }, (opts && opts.msg) || {});
    /* 🌫️ 안개는 레인을 통째로 덮어요. 예전에는 🌫️ 한 개를 오른쪽 끝(홈)에 세워
     * 뒀는데, 그러면 "송구가 이미 홈에 닿았다"로 읽혀서 다들 겁을 먹고 멈췄어요.
     * 모른다는 건 '어딘가에 있다'가 아니라 '레인 전체가 안 보인다'예요. */
    const wrap = makeBox(container, opts.label || "🏃 홈 승부! 갈까요, 멈출까요?", `
      <div class="ps-field">
        <div class="ps-lane ps-lane-throw">
          <span class="ps-fog">🌫️ 타구를 쫓는 중…</span>
          <span class="ps-throw">🌫️</span><span class="ps-home">🏠</span>
        </div>
        <div class="ps-lane ps-lane-run"><span class="ps-back"></span><span class="ps-runner">🏃</span><span class="ps-home">🏠</span></div>
      </div>
      <p class="ps-mark">&nbsp;</p>
      <p class="tm-legend-tip">${msg.tip}</p>
      <div class="tm-duel ps-pick">
        <button type="button" class="btn btn-primary tm-btn ps-go">${(opts && opts.goText) || "돌진! 🏃"}</button>
        <button type="button" class="btn btn-ghost tm-btn ps-stop">${(opts && opts.stopText) || "멈춰! ✋"}</button>
      </div>`);

    const throwEl = wrap.querySelector(".ps-throw");
    const runEl = wrap.querySelector(".ps-runner");
    const backEl = wrap.querySelector(".ps-back");
    const markEl = wrap.querySelector(".ps-mark");
    const goBtn = wrap.querySelector(".ps-go");
    const stopBtn = wrap.querySelector(".ps-stop");
    backEl.style.left = `${backAt}%`;
    backEl.textContent = "✋";

    let p = 0, elapsed = 0, decided = false, done = false, raf = 0;
    let shown = false;

    function paint() {
      runEl.style.left = `${clampV(p, 0, 100)}%`;
      wrap.classList.toggle("ps-past-back", p > backAt);
      if (!shown && p >= revealAt) {
        shown = true;
        throwEl.textContent = "⚾";
        wrap.classList.add("ps-seen");
      }
      // 송구는 드러나기 전까지 자리도 알 수 없어요 (🌫️는 오른쪽 끝에 머물러요)
      throwEl.style.left = shown ? `${clampV(elapsed / throwMs * 100, 0, 100)}%` : "100%";
    }
    paint();

    // note를 msg와 다르게 부르는 이유는 count의 finish와 같아요
    function finish(res, note) {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(guard);
      goBtn.disabled = true;
      stopBtn.disabled = true;
      markEl.textContent = note;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, OUTRO);
    }
    const guard = setTimeout(() => finish("miss", msg.timeup), DASH.cap);

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      elapsed += dt;
      p += (dt / runMs) * 100 * (decided ? 1 : DASH.hesit);
      paint();
      if (p >= 100) {                         // 주자가 홈에 닿았어요
        finish(elapsed < throwMs ? "perfect" : "miss", elapsed < throwMs ? msg.safe : msg.tagged);
        return;
      }
      if (elapsed >= throwMs) {               // 송구가 먼저 닿았어요
        finish("miss", decided ? msg.tagged : msg.rundown);
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    onTap(goBtn, () => {
      if (done || decided) return;
      decided = true;
      wrap.classList.add("ps-dashing");
      goBtn.classList.add("ps-picked");
      stopBtn.disabled = true;
      markEl.textContent = msg.going;
    });
    onTap(stopBtn, () => {
      if (done || decided) return;
      finish(p <= backAt ? "good" : "miss", p <= backAt ? msg.back : msg.late);
    });
    raf = requestAnimationFrame(tick);
  }

  return {
    count, dash,
    /* 테스트가 판정 산식을 그대로 굴려 볼 수 있게 열어 둬요 — 난이도를 손으로
     * 베껴 두면 여기를 고칠 때 테스트만 옛 숫자로 남아요. */
    _t: {
      COUNT, DASH,
      countBreak, countEdge, countStrikeP, countHitGrade, countEnd,
      dashRun, dashThrow, dashReveal, dashBack,
    },
  };
})();
