/* 🔥 ⚽ 더 윙어 II — 순간 카드 미니게임 4종 (winger2 전용)
 *
 *   W2Moment.play(container, opts, cb)
 *     opts = { kind: "goal"|"assist"|"defend", moment: "cutin"|"oneone"|"killpass"|"block",
 *              condition: 0~100, foot: "L"|"R", judge: (s) => "perfect"|"ok"|"miss" }
 *     cb(judge, detail)      detail = { s, moment, weak }
 *
 * ── 왜 전용 파일인가 ─────────────────────────────────────────
 * `timing.js`·`base.css`·`match.js`는 **8개 게임이 전부 내려받습니다.** 축구 하나만
 * 쓰는 4종을 거기 넣으면 안 쓰는 게임까지 무게를 집니다. 🎤 아이돌의 tour-stage.js와
 * ⚾ 야구의 post-stage.js가 같은 이유로 전용 파일이고, 미니게임 확장이 한 번도
 * 부딪히지 않은 게 이 설계 덕분이에요. 인터페이스만 timing.js와 맞춥니다.
 *
 * ── 🚨 읽기와 타이밍의 화면 문법을 섞지 않습니다 (설계 §4-2) ──
 *   읽기 게임(🧱 차단)   = 방향 버튼 3개. **움직이는 것이 화면에 하나도 없어야 해요.**
 *   조준·타이밍(나머지)  = 움직이는 표적 + 누르기. **판단으로 이기는 요소가 없어야 해요.**
 * 🧊 볼카운트는 *"타이밍처럼 생겼는데 핵심이 안 누르기"*라 세 번 고치고 버렸습니다.
 * 🧱 차단은 `beta/soccer/cup.js`의 승부차기 화면 문법을 그대로 복제했어요 —
 * 이 저장소에서 유일하게 성공한 축구 조작이라, 새 위험이 아니라 검증된 형태의 재사용입니다.
 *
 * ── 🔒 판정을 이 파일이 만들지 않습니다 ──────────────────────
 * 여기가 내는 것은 **조작 성공도 `s` ∈ [0,1]** 하나뿐이에요. 판정("perfect"/"ok"/"miss")은
 * 엔진이 §2-6의 산식으로 옮깁니다 —
 *
 *     P(사건 | 카드) = clamp( autoP(me) + 2*half(a)*(s − 0.5), 0, 1 )
 *
 * `autoP`는 그 경기의 전력과 내 능력치에서 나오는 값이라 미니게임이 알 수 없어요.
 * 미니게임이 제 손으로 판정을 만들면 **카드 갈래가 자동 갈래와 어긋납니다** —
 * §2-6이 고친 바로 그 자리예요(🅰️ 전개 도움 4~6배 · 🧱 수비 실점 −9.8%).
 * 그래서 `opts.judge(s)`로 엔진에 되돌려 물어요.
 *
 * ── 🔴 능력치는 판정 창을 넓히지 **않습니다** (설계 §4-5) ────
 * 판정 창에 걸리는 것은 **🦶 주발(±25%)과 🫀 컨디션(condMul)뿐**이에요.
 * 능력치는 이미 두 번 실려 있습니다 — `autoP`의 중심(sc)과 조작 폭 `half(a)`.
 * 여기에 판정 창까지 얹으면 **세 번째 경로**가 생기고, `s = 0.5`에서 중립이 성립한다는
 * §2-6의 정의가 능력치마다 깨집니다(balancer가 `_t.skill = 0.5`로 잰 곡선이 통째로 움직여요).
 * 현행 상용의 `miniZone(stat)`(game.js:1889)이 능력치를 창에 넣는데, 그건 `autoP`가
 * 능력치를 안 타던 옛 구조의 값이에요 — **표가 아니라 그 표를 잰 모델이 다릅니다.**
 *
 * ── ⚠️ pointerdown 이중 탭 ───────────────────────────────────
 * `pointerdown` 핸들러 안에서 화면을 갈아치우고 그 자리에 새 클릭 대상을 그리면,
 * 손을 뗄 때 브라우저가 **그 지점의 새 요소로 click을 보내 즉시 두 번 먹힙니다.**
 * 준비 화면에서 실제로 났던 버그예요. post-stage.js와 같은 `gate`로 막습니다.
 */
"use strict";

window.W2Moment = (() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const randIn = (a, b) => a + Math.random() * (b - a);
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);

  /* ---------- 🎚️ 판정 창 ----------
   *
   * 🦶 주발 — 주발 쪽 코스 +25% · 약발 쪽 −25% (설계 §A-5 ③).
   *    **화면에 좌우가 다르게 그려집니다** — 안 보이면 통제할 수 없는 노이즈가 돼요(원칙 ③).
   * 🫀 컨디션 — condMul. 지쳐 있으면 판정이 좁아집니다 (설계 §2-7).
   * ♿ 접근성 — 전역 확대 +30%, **성적 페널티 없음**. 접근성은 축약 대상이 아니에요. */
  const FOOT_WIN = 0.25;
  const STRONG = 1 + FOOT_WIN, WEAK = 1 - FOOT_WIN;
  const WIDE_KEY = "grow-wide-judge";
  const WIDE = 1.30;
  const wideOn = () => {
    try { return localStorage.getItem(WIDE_KEY) === "1"; } catch (e) { return false; }
  };
  /* ⚠️ `window.`를 붙여 씁니다 — 맨 이름(WingerEngine)으로 쓰면 검사가 이 파일을
   * new Function으로 실을 때 전역이 아니라 ReferenceError가 나요. 브라우저에서는 같은 값이에요. */
  const condOf = (c) => (window.WingerEngine ? window.WingerEngine.condMul(c) : 1);
  /* 판정 창 배수 하나로 모읍니다 — 네 종이 같은 자를 써야 난이도가 같이 움직여요. */
  const winMul = (cond, foot) => condOf(cond) * (wideOn() ? WIDE : 1) * (foot || 1);

  /* ---------- 📐 계수 ----------
   * 조작이 정하는 것은 `s`뿐이고, **평균적인 조작이 s ≈ 0.5**에 오도록 잡았습니다.
   * 그래야 `s = 0.5`가 중립인 §2-6의 정의 위에서 balancer의 곡선이 안 흔들려요.
   * 실측 절차와 결과는 `docs/superpowers/_workspace/50_engineer_minigames.md`에 있어요. */
  const CUT = { speed: 118, win: 12, lane: [26, 74], sweeps: 3 };
  const ONE = { need: 26, kw0: 12, kw1: 36, grow: 2400, life: 3400, post: 3.5 };
  const KP = { win: 8, line: 92, speed: [22, 34], start: [6, 34], life: 6000 };
  /* 🧱 차단 — 읽을 것이 **둘**이에요(주발 · 몸 방향).
   *
   * 🔴 몸 방향의 **세기가 두 가지**인 게 이 판의 전부예요. 세기가 하나면 사후확률의
   * 크기 순서가 판마다 안 바뀌어서 **늘 같은 쪽을 고르는 게 정답**이 됩니다 —
   * 신호가 둘인 척하는 신호 하나짜리 판이 돼요(실측에서 숙련도를 흔들어도 s가
   * 0.540에서 한 걸음도 안 움직였습니다).
   *
   *   확실히 틀었어요 → 몸 방향이 tellHi 확률로 진짜  → 몸 방향을 따라가는 게 맞아요
   *   살짝 흔들었어요 → tellLo 확률로만 진짜(페인트)  → **주발 쪽**이 더 유력해요
   *
   * 두 경우의 정답이 서로 달라야 '겹쳐 읽기'가 성립합니다. 계수는 그 부등호가
   * 양쪽에서 뒤집히도록 잡았어요 —
   *   확실히: tellHi(0.58) > favor × (1−tellHi)/2 (1.6 × 0.21 = 0.336)
   *   살짝  : tellLo(0.24) < favor × (1−tellLo)/2 (1.6 × 0.38 = 0.608) */
  const BLK = { tellHi: 0.58, tellLo: 0.24, hiP: 0.5, part: 0.24, favor: 1.6 };

  /* ---------- 🎯 `s` — 조작 성공도 ----------
   * 네 종이 **같은 모양**을 씁니다: s = 1 − 오차 / 판정창.
   * 모양이 같아야 난이도를 한자리에서 견줄 수 있어요 (설계 §4-4 ①). */
  const sBar = (err, win) => clamp(1 - err / Math.max(win, 1e-6), 0, 1);
  /* 🏃 갭 중심에서 벗어난 거리(%) */
  const sCut = (err, mul) => sBar(err, CUT.win * mul);
  /* 🥅 빈 곳의 여유(%). 키퍼 몸 안이면 0 — 막힌 거예요 */
  const sOne = (margin, mul) => (margin < 0 ? 0 : sBar(Math.max(0, ONE.need - margin), ONE.need * mul));
  /* 🎯 오프사이드 라인까지 남은 거리(%). 0에 가까울수록 좋고, 넘었으면 0 */
  const sKp = (gap, mul) => (gap < 0 ? 0 : sBar(gap, KP.win * mul));
  /* 🧱 정확 1 · 인접 BLK.part · 반대 0. 가운데로 붙으면 좌우로 나가도 몸을 걸칠 수 있어요 */
  const sBlk = (pick, truth) => (pick === truth ? 1 : pick === 1 || truth === 1 ? BLK.part : 0);

  /* ---------- 📱 탭 ----------
   * post-stage.js와 같은 모양이에요. 실기기는 pointerdown → pointerup → click 셋이
   * 다 오는데, 둘을 다 세면 한 번 누른 게 두 번이 됩니다.
   *
   * ⚠️ TAP_ECHO는 **같은 요소 안의 중복**만 막아요. ▶️ 시작이 준비 화면을 지우고 그
   * 자리에 게임 버튼을 그리면 손을 뗄 때 오는 click은 **방금 생긴 버튼**에게 갑니다 —
   * 그 버튼의 lastPointer는 초기값이라 안 걸려요. 그래서 gate가 따로 필요해요. */
  const TAP_ECHO = 700;
  const newGate = () => ({ shut: false });

  function onTap(el, fn, gate) {
    let lastPointer = -TAP_ECHO;
    el.addEventListener("pointerdown", (e) => {
      lastPointer = Date.now();
      if (gate) gate.shut = false;               // 여기서부터가 이 판의 입력이에요
      if (e && e.cancelable) e.preventDefault();
      fn(e, true);
    });
    el.addEventListener("click", (e) => {
      if (Date.now() - lastPointer < TAP_ECHO) return;        // 같은 요소 안의 메아리
      if (gate && gate.shut) { gate.shut = false; return; }   // 시작 제스처의 꼬리예요
      fn(e, false);
    });
  }

  /* ---------- 🧭 준비 화면 ----------
   * 규칙이 여러 단계이고 버튼이 둘 이상인 메커닉은 **한 줄 설명으로 첫 판을 무조건
   * 날립니다.** 그래서 메커닉마다 본 횟수를 세어 처음 FULL_SHOWS번만 전문을 펴고,
   * 그 뒤로는 한 줄로 줄여요. **준비 화면 자체는 늘 뜹니다** — 줄어드는 건 설명의
   * 길이지 시작 버튼이 아니에요. 시작 시점을 사람이 잡는 게 이 화면의 목적입니다.
   *
   * ⏱️ 누르기 전에는 아무것도 안 돌아요 — rAF도 setTimeout도 준비 화면 위에서는
   * 한 번도 안 불립니다. 그래서 판정도 난이도도 한 줄 안 바뀌어요.
   *
   * 🔑 세는 값은 야구·아이돌과 같은 열쇠(grow-mech-ready)를 나눠 쓰되 이름을 w2-로
   * 시작해 안 겹칩니다. 값이 없으면 그냥 0이에요 — 마이그레이션이 없습니다. */
  const READY_KEY = "grow-mech-ready";
  const FULL_SHOWS = 3;

  const readSeen = () => {
    try {
      const o = JSON.parse(localStorage.getItem(READY_KEY) || "{}");
      return (o && typeof o === "object") ? o : {};
    } catch (e) { return {}; }        // 사생활 보호 모드처럼 못 읽는 자리도 있어요
  };
  const bumpSeen = (key) => {
    const seen = readSeen();
    const n = Number(seen[key]) || 0;
    seen[key] = n + 1;
    try { localStorage.setItem(READY_KEY, JSON.stringify(seen)); } catch (e) { /* 못 써도 넘어가요 */ }
    return n;
  };

  /* 카드가 무엇으로 열렸는지 — 같은 미니게임이 두 종류로 열려요(🏃 돌파는 결정에도
   * 전개에도). **무엇이 걸렸는지 모르는 것이 문제**라 준비 화면 첫 줄에 밝힙니다. */
  const STAKE = {
    goal: "⚽ 결정적인 순간 — 넣으면 골이에요",
    assist: "🅰️ 찬스를 만드는 순간 — 성공하면 도움이에요",
    defend: "🧱 막아야 하는 순간 — 놓치면 실점이에요",
  };

  function ready(container, info, start) {
    const full = bumpSeen(info.key) < FULL_SHOWS;
    const body = full
      ? `<ul class="w2m-ready-lines">${info.lines.map((t) => `<li>${t}</li>`).join("")}</ul>`
      : `<p class="w2m-ready-short">${info.short}</p>`;
    const keys = (info.keys || [])
      .map((k) => `<span class="w2m-ready-key"><b>${esc(k.name)}</b><span>${esc(k.desc)}</span></span>`).join("");
    const wrap = document.createElement("div");
    wrap.className = "tm-box w2m-ready";
    wrap.innerHTML = `<p class="w2m-stake">${esc(info.stake)}</p>`
      + `<p class="tm-label">${info.title}</p>${body}`
      + (keys ? `<div class="w2m-ready-keys">${keys}</div>` : "")
      + `<button type="button" class="btn btn-primary tm-btn w2m-go">▶️ 시작</button>`;
    container.appendChild(wrap);
    const gate = newGate();
    let went = false;
    onTap(wrap.querySelector(".w2m-go"), (e, viaPointer) => {
      if (went) return;               // pointerdown과 click이 겹쳐도 한 번만 시작해요
      went = true;
      gate.shut = !!viaPointer;
      wrap.remove();                  // 준비 화면을 치우고 나서 본 게임 상자를 붙여요
      start(gate);
    });
  }

  /* ---------- 판 하나의 뼈대 ---------- */
  const RAF = (fn) => (typeof requestAnimationFrame === "function"
    ? requestAnimationFrame(fn) : setTimeout(() => fn(Date.now()), 16));
  const nowMs = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

  /* 엔진 밖(확인 페이지·손 시연)에서 부를 때만 쓰는 되받이예요.
   * 실제 경기에서는 **반드시** opts.judge가 옵니다 — 중립이 거기 걸려 있어요. */
  const loneJudge = (s) => (s >= 0.75 ? "perfect" : s >= 0.35 ? "ok" : "miss");

  function box(container, cls, html) {
    const wrap = document.createElement("div");
    wrap.className = "tm-box w2m-box " + cls;
    wrap.innerHTML = html;
    container.appendChild(wrap);
    return wrap;
  }

  /* ---------- 🎬 판정 피드백 (grow-director) ----------
   *
   * ⚖️ **골 세리머니보다 반드시 작습니다.** 미니게임은 카드 *안*에서 벌어지고
   * 골은 그 *결과*예요 — 위계가 뒤집히면 골이 안 특별해집니다.
   *
   *   | 사건        | 밝기            | 흔들림          | 파티클              | 진동  |
   *   |-------------|-----------------|-----------------|---------------------|-------|
   *   | ⚽ 골       | 풀스크린 .42    | .w2-scene 5px   | burst 14 + confetti | 40ms  |
   *   | 🎮 미니게임 | **상자 안 .28** | **상자 2px**    | **burst 8 (완벽만)**| 없음  |
   *
   * 🔇 **진동은 골에만** 겁니다 (설계 §5-4). 여기서 울리면 골의 신호가 닳아요.
   *
   * 🔒 문턱(0.75 · 0)은 원래 이 함수가 쓰던 값 그대로예요. 눈에 보이는 등급과
   * 안 보이는 등급이 갈리지 않게 TIER 한 곳에서만 정합니다 — 판정 자체는
   * 여기가 안 만들어요(머리말 참고). 이건 **손이 얼마나 정확했나**의 등급입니다. */
  const TIER = (s) => (s >= 0.75 ? "perfect" : s > 0 ? "ok" : "miss");
  const RES_CLS = { perfect: "w2m-good", ok: "w2m-mid", miss: "w2m-bad" };
  const HIT_EMOJI = { block: "🛡️", cutin: "💨", oneone: "⚡", killpass: "✨" };

  function ender(wrap, ctx) {
    return (s, line) => {
      if (ctx.done) return;
      ctx.done = true;
      const v = clamp(s, 0, 1), tier = TIER(v);
      wrap.querySelectorAll("button").forEach((b) => { b.disabled = true; });
      /* 상자가 판정 색으로 한 번 물들어요. 클래스만 붙이고 나머지는 style.css 몫 —
       * 애니메이션도 prefers-reduced-motion 차단도 그 한 자리에 모입니다. */
      wrap.classList.add("w2m-hit", "w2m-t-" + tier);
      const p = document.createElement("p");
      p.className = "w2m-res " + RES_CLS[tier];
      /* 🎚️ 조작 정확도 — **결과가 아니라 손**입니다. 골이 됐는지는 위 문구(그리고
       * 뒤이어 오는 경기 카드)가 말하고, 이 막대는 "얼마나 정확히 눌렀나"만 그려요.
       * 둘을 섞으면 거짓말이 됩니다 — 판정은 엔진이 만들고 여기는 s만 내니까요.
       * scaleX라 폭이 바뀌어도 레이아웃을 다시 안 돌려요. */
      p.innerHTML = line
        + '<span class="w2m-acc" role="img" aria-label="조작 정확도 ' + Math.round(v * 100) + '점">'
        + '<i style="transform:scaleX(' + v.toFixed(3) + ')"></i></span>';
      wrap.appendChild(p);
      /* 파티클은 **완벽할 때만** 8개(골은 14개예요). Fx가 reduced-motion을 스스로 봅니다. */
      if (tier === "perfect" && window.Fx) window.Fx.burst(wrap, HIT_EMOJI[ctx.moment] || "⚡", 8);
      setTimeout(() => {
        wrap.remove();
        ctx.cb(ctx.toJudge(v), { s: v, moment: ctx.moment, weak: !!ctx.weak });
      }, 620);
    };
  }

  /* ================================================================
   * 1. 🏃 컷인 돌파 — 조준 + 타이밍 (wg · fw)
   *
   * 수비수 둘 사이의 갭이 좌우로 열렸다 닫혀요. 코스는 둘 —
   * **🦶 주발 쪽 칸이 눈에 띄게 넓고**, 약발 쪽은 좁아요(판정 창 ±25%가 그대로 폭이에요).
   * 갭이 그 칸 위에 왔을 때 그 코스 버튼을 누르면 통과입니다.
   *
   * 조준(어느 코스)과 타이밍(언제)이 **한 번의 누르기**에 같이 들어가요.
   * 숨은 정보가 하나도 없어서 수싸움이 아닙니다 — 판단이 아니라 손이 정해요.
   * ================================================================ */
  function runCutin(container, ctx, gate) {
    const right = ctx.foot !== "L";                 // 오른발잡이면 오른쪽이 주발 코스예요
    const lanes = [
      { x: CUT.lane[0], strong: !right },
      { x: CUT.lane[1], strong: right },
    ].map((l) => {
      const mul = winMul(ctx.condition, l.strong ? STRONG : WEAK);
      return { x: l.x, strong: l.strong, mul, half: CUT.win * mul };
    });

    /* 🦶 주발이 **눈에 보입니다** — 그려진 칸 폭이 곧 판정 창이에요(설계 §4-5).
     * 칸 안에 가운데 눈금(w2m-gate-mid)을 하나 둡니다: 판정은 칸 중심에서 멀어진
     * 거리로 재는데, 눈금이 없으면 넓은 칸일수록 "어디가 한가운데인지"가 안 보여요.
     * ±25%를 글자로도 한 번 더 적습니다 — 폭 차이만으로는 "왜 다른가"를 못 읽어요. */
    const gateHTML = lanes.map((l, i) => `<div class="w2m-gate ${l.strong ? "w2m-strong" : "w2m-weak"}"`
      + ` data-i="${i}" style="left:${(l.x - l.half).toFixed(2)}%;width:${(l.half * 2).toFixed(2)}%">`
      + `<i class="w2m-gate-mid"></i>${l.strong ? `<b class="w2m-gate-tag">🦶</b>` : ""}</div>`).join("");
    const btnHTML = lanes.map((l, i) => `<button type="button" class="btn w2m-side ${l.strong ? "w2m-strong" : "w2m-weak"}" data-i="${i}">`
      + `<span class="w2m-side-arrow">${i === 0 ? "⬅️" : "➡️"}</span>`
      + `<span class="w2m-side-lab">${l.strong ? "🦶 주발 쪽" : "약발 쪽"}</span>`
      + `<span class="w2m-side-win">판정 창 ${l.strong ? "＋" : "－"}${Math.round(FOOT_WIN * 100)}%</span></button>`).join("");
    /* ●●● — 남은 왕복. 갭은 CUT.sweeps번 오가고 닫혀요(그때 s=0). 안 그리면
     * "갑자기 닫혔다"가 되는데, 이미 걸려 있는 효과를 화면에 안 보여주는 건
     * 통제할 수 없는 노이즈예요(원칙 ③). */
    const wrap = box(container, "w2m-cutin",
      `<p class="tm-label">🏃 갭이 코스 칸에 오는 순간 통과!</p>`
      + `<div class="tm-bar w2m-lane">${gateHTML}`
      /* 갭은 **폭 100%짜리 트랙**을 translateX(%)로 밀어요 — %가 부모(레인) 폭 기준이라
       * left를 쓸 때와 위치가 같고, 프레임마다 레이아웃을 다시 안 돌립니다.
       * ⛔ 트랜지션을 붙이지 마세요: 그림이 pos보다 늦게 따라오면 **보이는 자리와
       *    판정하는 자리가 갈라져요.** 판정은 pos로 하고 그림은 매 프레임 pos를 그립니다. */
      + `<div class="w2m-gap"><i></i></div></div>`
      + `<p class="w2m-sweeps" aria-label="남은 왕복"></p>`
      + `<div class="w2m-btns">${btnHTML}</div>`);

    const gap = wrap.querySelector(".w2m-gap");
    const sweepEl = wrap.querySelector(".w2m-sweeps");
    const end = ender(wrap, ctx);
    let pos = 0, dir = 1, sweeps = 0, last = nowMs(), shownSweeps = -1;
    const paintSweeps = () => {
      if (sweeps === shownSweeps) return;                  // 왕복이 바뀔 때만 씁니다
      shownSweeps = sweeps;
      const left = Math.max(0, CUT.sweeps - sweeps);
      sweepEl.textContent = "●".repeat(left) + "○".repeat(CUT.sweeps - left);
      sweepEl.classList.toggle("last", left <= 1);
    };

    const tick = (t) => {
      if (ctx.done) return;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      pos += dir * dt * CUT.speed;
      if (pos >= 100) { pos = 100; dir = -1; sweeps += 1; }
      if (pos <= 0) { pos = 0; dir = 1; sweeps += 1; }
      gap.style.transform = `translateX(${pos.toFixed(2)}%)`;
      paintSweeps();
      if (sweeps >= CUT.sweeps) { end(0, "🙈 갭이 닫혔어요 — 돌파 실패"); return; }
      RAF(tick);
    };

    lanes.forEach((l, i) => {
      onTap(wrap.querySelector(`.w2m-side[data-i="${i}"]`), () => {
        if (ctx.done) return;
        ctx.weak = !l.strong;
        const s = sCut(Math.abs(pos - l.x), l.mul);   // 🔒 판정은 pos — 화면이 아니라 값이에요
        end(s, s >= 0.75 ? `⚡ 갭을 완전히 뚫었어요!${l.strong ? "" : " 🦶 약발 쪽으로!"}`
          : s > 0 ? "🏃 몸을 비집고 지나갔어요" : "🧱 수비수에게 막혔어요");
      }, gate);
    });
    paintSweeps();
    RAF(tick);
  }

  /* ================================================================
   * 2. 🥅 1대1 마무리 — 조준 (fw · wg)
   *
   * 키퍼가 달려나와 각을 좁혀 와요. **골문에서 넣고 싶은 지점을 직접 누릅니다.**
   * 기다릴수록 남는 틈이 줄어드니, "틈이 남아 있을 때 코스를 정하는" 판이에요.
   *
   * 🦶 골문의 절반(주발 쪽)은 판정 창이 넓고 반대쪽은 좁아요 — **화면에 색으로 나뉩니다.**
   * 숨은 정보가 없어요. 키퍼 위치도 폭도 다 보이니 수싸움이 아니라 조준입니다.
   * ================================================================ */
  function runOneone(container, ctx, gate) {
    const right = ctx.foot !== "L";                 // 오른발잡이면 골문 오른쪽 절반이 주발 쪽
    const kc = randIn(28, 72);                      // 키퍼가 늘 가운데 있으면 조준이 없어져요
    /* 🦶 **양쪽에 다 이름표를 답니다.** 주발 쪽에만 달면 반대편이 "그냥 골문"으로
     * 보여서 좁아진 줄을 몰라요 — 좌우가 다르다는 게 안 읽히면 통제할 수 없는
     * 노이즈가 됩니다(원칙 ③). 색도 앰버 ↔ 회색으로 갈라 둡니다.
     * 🥅 골대 기둥(ONE.post)도 그려요 — 거기 붙으면 여유가 깎이는데(sOne의 margin)
     * 화면에 없으면 "왜 구석인데 안 들어갔지"가 됩니다. 폭은 상수에서 읽어 와요. */
    const wrap = box(container, "w2m-oneone",
      `<p class="tm-label">🥅 빈 곳을 눌러 코스를 정하세요</p>`
      + `<div class="w2m-goal" role="group" aria-label="골문 — 넣고 싶은 지점을 누르세요">`
      /* 🔴 좌우가 뒤집혀 있었어요 (헤드리스 크로미움으로 그려 보고 잡았습니다).
       * 판정은 `strong = right ? x >= 50 : x < 50` — 오른발잡이면 **오른쪽 절반**이
       * 주발 쪽이고, 이름표도 오른쪽에 붙습니다. 그런데 색은 왼쪽 절반에 칠해져 있었어요.
       * 화면이 판정과 반대를 가리키면 🦶는 보이는 게 아니라 **거짓말**이 됩니다(원칙 ③).
       * 조건을 판정 줄과 **같은 모양**으로 맞춰 뒀어요 — 한쪽만 고치면 또 갈라져요. */
      + `<div class="w2m-half ${right ? "w2m-weak" : "w2m-strong"}" style="left:0;width:50%"></div>`
      + `<div class="w2m-half ${right ? "w2m-strong" : "w2m-weak"}" style="left:50%;width:50%"></div>`
      + `<i class="w2m-post" style="left:0;width:${ONE.post}%"></i>`
      + `<i class="w2m-post" style="right:0;width:${ONE.post}%"></i>`
      /* 키퍼도 컷인의 갭과 같은 방식이에요 — 폭 100% 트랙을 kc%로 **한 번만** 밀고
       * (kc는 안 바뀝니다), 몸통만 scaleX로 벌립니다. left·width를 프레임마다 쓰면
       * 그때마다 레이아웃이 다시 돌아요. 장갑은 안 늘어나게 몸통 밖에 둡니다. */
      + `<div class="w2m-keeper"><i class="w2m-keeper-body"></i><b class="w2m-keeper-face">🧤</b></div>`
      + `<span class="w2m-foot-tag strong" style="${right ? "right:4px" : "left:4px"}">🦶 ＋${Math.round(FOOT_WIN * 100)}%</span>`
      + `<span class="w2m-foot-tag weak" style="${right ? "left:4px" : "right:4px"}">약발 －${Math.round(FOOT_WIN * 100)}%</span>`
      + `</div>`
      + `<p class="w2m-tip">키퍼가 각을 좁히기 전에요!</p>`);

    const goal = wrap.querySelector(".w2m-goal");
    const keeper = wrap.querySelector(".w2m-keeper");
    const kbody = wrap.querySelector(".w2m-keeper-body");
    const tip = wrap.querySelector(".w2m-tip");
    /* 🔒 min-height라 style.css가 더 키울 수 있어요(폰에서 손가락으로 누를 칸이라
     * 96px은 빠듯합니다). inline height였다면 CSS가 절대 못 이깁니다.
     * style.css를 못 읽는 자리(확인용 칸·오프라인 실패)에서도 이 바닥이 남아요. */
    if (!goal.style.minHeight) goal.style.minHeight = "96px";
    keeper.style.transform = `translateX(${kc.toFixed(2)}%)`;
    const end = ender(wrap, ctx);
    const t0 = nowMs();
    let kw = ONE.kw0, maxed = false;

    const tick = (t) => {
      if (ctx.done) return;
      const p = clamp((t - t0) / ONE.grow, 0, 1);
      kw = ONE.kw0 + (ONE.kw1 - ONE.kw0) * p;
      /* 몸통은 폭 100%(골문 폭)를 기준으로 kc에 중심을 두고 있어요 —
       * 2·kw%가 되려면 scaleX(kw/50)입니다. 좌우 클램프는 골문의 overflow가 잘라 줘요. */
      kbody.style.transform = `scaleX(${(kw / 50).toFixed(4)})`;
      /* ONE.grow에서 다 벌어진 뒤 ONE.life까지 약 1초는 **화면이 안 변합니다.**
       * 그 사이에 놓치면 "아무 일도 없었는데 실패"가 돼요 — 한 줄로 알려요.
       * 움직이는 재촉 막대를 넣지 않는 건 조준 판이라 표적이 하나여야 하기 때문이에요. */
      if (p >= 1 && !maxed) { maxed = true; tip.textContent = "🧤 각이 거의 없어요! 지금 안 차면 놓쳐요"; tip.classList.add("urgent"); }
      if (t - t0 >= ONE.life) { end(0, "🧤 키퍼가 각을 다 지웠어요 — 슛 타이밍을 놓쳤어요"); return; }
      RAF(tick);
    };

    onTap(goal, (e) => {
      if (ctx.done) return;
      const r = goal.getBoundingClientRect();
      const w = r.width || 300;                     // 폭을 못 재는 환경(검사)에서도 안 깨져요
      const x = clamp(((e && e.clientX != null ? e.clientX : r.left + w / 2) - r.left) / w * 100, 0, 100);
      const strong = right ? x >= 50 : x < 50;
      ctx.weak = !strong;
      /* 여유 = 키퍼 몸과 골대 기둥 중 **가까운 쪽**까지의 거리예요.
       * 키퍼 몸 안이면 음수 — 막힌 거예요. */
      const inKeeper = x > kc - kw && x < kc + kw;
      const margin = inKeeper ? -1
        : Math.min(Math.abs(x - (x < kc ? kc - kw : kc + kw)), x - ONE.post, 100 - ONE.post - x);
      const s = sOne(margin, winMul(ctx.condition, strong ? STRONG : WEAK));
      end(s, s >= 0.75 ? `🥅 골문 구석에 정확히!${strong ? "" : " 🦶 약발로 마무리!"}`
        : s > 0 ? "🥅 키퍼 옆을 아슬아슬하게 스쳤어요" : inKeeper ? "🧤 키퍼 정면이었어요" : "😖 골대를 벗어났어요");
    }, gate);
    RAF(tick);
  }

  /* ================================================================
   * 3. 🎯 킬패스 — 조준 + 타이밍 (mf · wg · fw)
   *
   * 동료 셋이 **오프사이드 라인**을 향해 서로 다른 속도로 뛰어요.
   * 라인을 넘기 **직전**에 그 동료에게 찔러 주면 최고예요. 이미 넘었으면 오프사이드고,
   * 너무 이르면 수비가 따라붙습니다.
   *
   * 조준(누구에게)과 타이밍(언제)이 둘 다 필요해요 — 셋의 속도가 달라서
   * "지금 라인에 가장 가까운 사람"이 계속 바뀝니다.
   * 🦶 주발은 여기 안 걸려요 — 설계 §4-5가 1·2번에만 걸었습니다.
   * ================================================================ */
  function runKillpass(container, ctx, gate) {
    const runs = [0, 1, 2].map((i) => ({
      x: randIn(KP.start[0], KP.start[1]),
      v: randIn(KP.speed[0], KP.speed[1]),
      el: null, btn: null, i,
    }));
    const mul = winMul(ctx.condition, 1);
    /* ①②③을 **동료 옆에도** 답니다 — 버튼에만 있으면 "지금 라인에 제일 가까운 게
     * 몇 번이지"를 매번 눈으로 세야 해요. 셋의 속도가 다른 게 이 판의 전부인데
     * 누구를 누르는지가 안 읽히면 조준이 아니라 운이 됩니다.
     * 동료도 폭 100% 트랙을 translateX(%)로 밉니다 — 이유는 컷인의 갭과 같아요. */
    const rows = runs.map((r, i) => `${12 + i * 28}%`);
    const laneHTML = runs.map((r, i) => `<b class="w2m-lane-no" style="top:${rows[i]}">${"①②③"[i]}</b>`).join("");
    const runHTML = runs.map((r, i) => `<div class="w2m-run" data-i="${i}" style="top:${rows[i]}">`
      + `<span class="w2m-run-ico">🏃</span></div>`).join("");
    const btnHTML = runs.map((r, i) => `<button type="button" class="btn w2m-run-btn" data-i="${i}">`
      + `<span class="w2m-run-no">${"①②③"[i]}</span> 찔러주기</button>`).join("");
    const wrap = box(container, "w2m-killpass",
      `<p class="tm-label">🎯 라인을 넘기 직전에 찔러 주세요</p>`
      + `<div class="w2m-pitch">${laneHTML}<div class="w2m-offside" style="left:${KP.line}%"><b>오프사이드</b></div>${runHTML}</div>`
      + `<div class="w2m-btns">${btnHTML}</div>`);

    const pitch = wrap.querySelector(".w2m-pitch");
    if (!pitch.style.minHeight) pitch.style.minHeight = "84px";   // 바닥만 — 살은 style.css 몫이에요
    runs.forEach((r) => {
      r.el = wrap.querySelector(`.w2m-run[data-i="${r.i}"]`);
      r.btn = wrap.querySelector(`.w2m-run-btn[data-i="${r.i}"]`);
    });
    const end = ender(wrap, ctx);
    const t0 = nowMs();
    let last = t0;

    const tick = (t) => {
      if (ctx.done) return;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      let alive = 0;
      for (const r of runs) {
        r.x += r.v * dt;
        r.el.style.transform = `translateX(${clamp(r.x, 0, 100).toFixed(2)}%)`;
        const off = r.x > KP.line;
        r.el.classList.toggle("w2m-offside-run", off);
        r.btn.disabled = off;
        if (off && !r.flagged) {
          r.flagged = true;                                  // 한 번만 씁니다
          r.btn.innerHTML = `<span class="w2m-run-no">${"①②③"[r.i]}</span> 🚩 오프사이드`;
        }
        else alive += 1;
      }
      if (!alive) { end(0, "🚩 셋 다 라인을 넘어버렸어요"); return; }
      if (t - t0 >= KP.life) { end(0, "⏳ 찌를 틈을 놓쳤어요"); return; }
      RAF(tick);
    };

    runs.forEach((r) => onTap(r.btn, () => {
      if (ctx.done || r.btn.disabled) return;
      const s = sKp(KP.line - r.x, mul);
      end(s, s >= 0.75 ? "🎯 라인을 완벽하게 갈랐어요!"
        : s > 0 ? "🎯 조금 일렀지만 연결됐어요" : "🚩 오프사이드…");
    }, gate));
    RAF(tick);
  }

  /* ================================================================
   * 4. 🧱 차단 — 읽기 (df · mf/CDM)
   *
   * `beta/soccer/cup.js`의 승부차기 화면 문법을 그대로 복제했어요 —
   * **한 줄 힌트 + 방향 버튼 셋.** 이 저장소에서 유일하게 성공한 축구 조작입니다.
   *
   * 🚨 **움직이는 것이 하나도 없어요.** 흘러가는 막대도, 재는 숫자도, 프레임 루프도
   * 없습니다. 1초에 고르든 10초에 고르든 결과가 같아요. 이건 취향이 아니라 이
   * 메커닉의 존재 이유예요 — 🧊 볼카운트가 "타이밍처럼 생겼는데 핵심이 안 누르기"라
   * 세 번 고치고도 죽은 자리입니다.
   *
   * 🔎 그럼 찍기냐 — 아니에요. **읽을 것이 둘입니다.**
   *   ① 드리블러의 주발 — 자기 주발 쪽으로 파고드는 걸 좋아해요 (×BLK.favor)
   *   ② 몸을 튼 방향과 **그 세기** — 확실히 틀었으면 대체로 진짜, 살짝 흔들었으면 페인트
   *
   * **세기에 따라 정답이 서로 다른 쪽으로 바뀌는 게 이 판의 전부예요** —
   * 확실히 틀었으면 몸 방향, 살짝 흔들었으면 주발 쪽입니다. 몸 방향만 따라가면
   * 평균에 머물고, 세기를 함께 읽어야 위로 올라가요. 그 차이가 이 판의 `s`입니다.
   * (세기가 하나뿐이면 늘 같은 쪽이 정답이라 신호가 하나인 판이 됩니다 — BLK 주석 참고)
   * ================================================================ */
  const DIRS = [
    /* `to`·`was`는 조사예요 — 받침이 없는 "가운데"만 다릅니다("가운데으로"·"가운데이었어요"가
     * 나오던 자리). 문장을 붙여 만드는 곳이 넷이라 칸에 들고 다니는 게 안전해요. */
    { key: 0, arrow: "⬅️", label: "왼쪽", to: "왼쪽으로", was: "왼쪽이었어요" },
    { key: 1, arrow: "⬆️", label: "가운데", to: "가운데로", was: "가운데였어요" },
    { key: 2, arrow: "➡️", label: "오른쪽", to: "오른쪽으로", was: "오른쪽이었어요" },
  ];

  /* 진짜 방향 · 몸 힌트 · 힌트의 세기를 함께 굴려요.
   * 진짜 방향은 **주발 쪽으로 기울어** 있고(favor), 힌트는 세기에 따라 다른 확률로
   * 진짜와 같아요. 그래서 힌트만 따라가면 딱 그 확률만큼만 맞습니다. */
  function rollBlock(footR) {
    const favor = footR ? 0 : 2;                 // 오른발잡이는 **내** 왼쪽으로 파고들어요
    const w = [1, 1, 1];
    w[favor] = BLK.favor;
    const sum = w[0] + w[1] + w[2];
    let r = Math.random() * sum, truth = 0;
    for (let i = 0; i < 3; i++) { r -= w[i]; if (r < 0) { truth = i; break; } }
    const hi = Math.random() < BLK.hiP;
    const tell = Math.random() < (hi ? BLK.tellHi : BLK.tellLo)
      ? truth : pickOne([0, 1, 2].filter((i) => i !== truth));
    return { truth, tell, favor, hi };
  }

  function runBlock(container, ctx, gate) {
    const footR = Math.random() < 0.75;           // 프로 선수의 대략 4분의 3이 오른발잡이예요
    const { truth, tell, hi } = rollBlock(footR);
    /* ⛔ **여기에는 움직이는 것이 하나도 없습니다.** rAF도 타이머도 흐르는 막대도요.
     * 연출로도 그 성격을 지켜요 — 반짝이는 힌트, 카운트다운, 재촉하는 색 전환을
     * 넣지 않습니다. 1초에 고르든 10초에 고르든 화면이 똑같아야 해요.
     * (🧊 볼카운트가 "타이밍처럼 생겼는데 핵심이 안 누르기"라 세 번 고치고 죽은 자리)
     *
     * 🔎 읽을 것이 **둘**이라 칩도 둘로 나눕니다. 한 문장에 이어 붙이면 "주발"과
     * "몸 방향의 세기"가 한 덩어리로 읽혀서, 세기에 따라 정답이 갈리는 이 판의
     * 핵심이 안 보여요.
     *
     * 🚫 **정답을 알려주는 줄은 넣지 않았습니다.** ("살짝이면 주발 쪽" 같은 힌트)
     * 매 판 적어 주면 겹쳐 읽기가 사라지고 E[s]가 실측한 0.537 위로 올라가요 —
     * 연출이 결과를 만드는 자리가 됩니다. 규칙은 준비 화면이 처음 3번 가르칩니다.
     *
     * 🎨 세기는 **초록/빨강이 아니라 실선/점선**으로 갈랐어요. 색으로 가르면
     * "살짝 흔들었어요"가 나쁜 신호처럼 보이는데, 그건 틀린 신호가 아니라
     * **다른 쪽을 가리키는 신호**예요. 실선=확실히 · 점선=살짝이 그 뜻에 맞습니다. */
    const btnHTML = DIRS.map((d) => `<button type="button" class="btn w2m-dir" data-i="${d.key}">`
      + `<span class="w2m-dir-arrow">${d.arrow}</span><span class="w2m-dir-lab">${d.label}</span></button>`).join("");
    const wrap = box(container, "w2m-block",
      `<p class="tm-label">🧱 어디로 파고들까요?</p>`
      + `<div class="w2m-read">`
      + `<span class="w2m-sig"><b>🦶 주발</b><span>${footR ? "오른발" : "왼발"}잡이</span></span>`
      + `<span class="w2m-sig ${hi ? "w2m-tell-hi" : "w2m-tell-lo"}">`
      + `<b>${DIRS[tell].arrow} 몸 방향</b>`
      + `<span>${DIRS[tell].to} ${hi ? "확실히 틀었어요" : "살짝 흔들었어요"}</span></span>`
      + `</div>`
      + `<div class="w2m-btns w2m-dirs">${btnHTML}</div>`);

    const end = ender(wrap, ctx);
    DIRS.forEach((d) => onTap(wrap.querySelector(`.w2m-dir[data-i="${d.key}"]`), () => {
      if (ctx.done) return;
      const s = sBlk(d.key, truth);
      end(s, s >= 0.75 ? `🛡️ 완벽하게 읽었어요! 상대는 ${DIRS[truth].was}`
        : s > 0 ? `🧱 몸을 걸쳐 속도를 죽였어요 (상대는 ${DIRS[truth].label})`
          : `😖 역동작에 완전히 걸렸어요 — 상대는 ${DIRS[truth].was}`);
    }, gate));
  }

  /* ---------- 창구 ---------- */
  const GAMES = {
    cutin: {
      run: runCutin, key: "w2-cutin", title: "🏃 컷인 돌파",
      lines: [
        "수비수 둘 사이의 <b>갭</b>이 좌우로 열렸다 닫혀요.",
        "갭이 <b>코스 칸 위에 왔을 때</b> 그 코스 버튼을 누르세요.",
        "🦶 <b>주발 쪽 칸이 더 넓어요</b> — 화면에 보이는 폭이 그대로 판정 창이에요.",
      ],
      short: "갭이 코스 칸에 왔을 때 그 코스를 누르세요 — 주발 쪽이 더 넓어요.",
      keys: [{ name: "⬅️ / ➡️", desc: "돌파할 코스예요. 갭이 그 칸 위일 때 누르세요" }],
    },
    oneone: {
      run: runOneone, key: "w2-oneone", title: "🥅 1대1 마무리",
      lines: [
        "키퍼가 <b>달려나와 각을 좁혀요</b> — 기다릴수록 빈 곳이 줄어요.",
        "골문에서 <b>넣고 싶은 지점을 직접 누르세요.</b>",
        "🦶 주발 쪽 절반은 판정이 <b>넓고</b>, 약발 쪽 절반은 좁아요.",
      ],
      short: "빈 곳이 남아 있을 때 골문을 눌러 코스를 정하세요.",
      keys: [{ name: "골문", desc: "누른 지점이 슛 코스예요. 키퍼와 골대에서 멀수록 좋아요" }],
    },
    killpass: {
      run: runKillpass, key: "w2-killpass", title: "🎯 킬패스",
      lines: [
        "동료 셋이 <b>오프사이드 라인</b>을 향해 서로 다른 속도로 뛰어요.",
        "라인을 <b>넘기 직전</b>에 그 동료 버튼을 누르면 최고예요.",
        "이미 넘은 동료는 <b>오프사이드</b>라 버튼이 잠겨요.",
      ],
      short: "라인을 넘기 직전인 동료를 골라 찔러 주세요.",
      keys: [{ name: "① ② ③", desc: "찔러 줄 동료예요. 라인에 가까울수록 좋아요" }],
    },
    block: {
      run: runBlock, key: "w2-block", title: "🧱 차단",
      lines: [
        "이 판은 <b>움직이는 것이 하나도 없어요</b> — 읽고 고르는 판이에요.",
        "<b>확실히 틀었으면</b> 몸 방향이 대체로 진짜예요 — 그쪽을 막으세요.",
        "<b>살짝 흔들었으면</b> 페인트일 때가 많아요 — 그럴 땐 상대의 <b>주발 쪽</b>이 유력해요.",
      ],
      short: "확실히 틀었으면 몸 방향, 살짝 흔들었으면 주발 쪽을 막으세요.",
      keys: [{ name: "⬅️ ⬆️ ➡️", desc: "막을 방향이에요. 가운데는 좌우로 나가도 몸을 걸칠 수 있어요" }],
    },
  };

  /* 화면이 부르는 자리. 준비 화면 → 본 게임 → cb(판정) 순서예요.
   * 🤖 자동 진행은 여기까지 안 옵니다 — career.js가 미니게임을 아예 안 열고
   * 지금의 확률 굴림(autoJudge)을 그대로 써요. */
  function play(container, opts, cb) {
    const o = opts || {};
    const g = GAMES[o.moment] || GAMES.oneone;
    const ctx = {
      done: false, weak: false, moment: o.moment || "oneone",
      condition: o.condition, foot: o.foot === "L" ? "L" : "R",
      cb: typeof cb === "function" ? cb : () => {},
      toJudge: typeof o.judge === "function" ? o.judge : loneJudge,
    };
    if (!container) { ctx.cb(ctx.toJudge(0.5), { s: 0.5, moment: ctx.moment, weak: false }); return; }
    ready(container, {
      key: g.key, title: g.title, lines: g.lines, short: g.short, keys: g.keys,
      stake: STAKE[o.kind] || STAKE.goal,
    }, (gate) => g.run(container, ctx, gate));
  }

  /* ♿ 판정 창 전역 확대 — **성적 페널티가 없습니다.** 접근성은 축약 대상이 아니에요.
   * 체크박스는 winger2의 index.html에 있고, 없는 화면에서는 그냥 안 걸립니다. */
  if (typeof document !== "undefined") {
    const wire = () => {
      const chk = document.getElementById("wide-judge");
      if (!chk) return;
      chk.checked = wideOn();
      chk.onchange = () => {
        try { localStorage.setItem(WIDE_KEY, chk.checked ? "1" : "0"); } catch (e) { /* 못 써도 넘어가요 */ }
      };
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
    else wire();
  }

  // 엔진에 스스로 꽂아요 — index.html에서 engine.js 뒤에 실려요
  if (window.WingerEngine && window.WingerEngine.setMini) window.WingerEngine.setMini(play);

  return {
    play, GAMES,
    /* 🧪 실측·검사 창구. **판정 산식이 아니라 조작 성공도만** 여기 있어요 —
     * 검사가 여기서 문턱을 읽어 가면 상수를 바꿔도 안 잡힙니다(기준값은 검사에 직접 적으세요). */
    _t: { sCut, sOne, sKp, sBlk, sBar, winMul, wideOn, rollBlock, loneJudge, K: { CUT, ONE, KP, BLK, STRONG, WEAK, WIDE, FOOT_WIN } },
  };
})();
