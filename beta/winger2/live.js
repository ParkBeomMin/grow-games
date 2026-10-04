/* ⚽ 더 윙어 II 1막 — **경기 드라이버 하나**(엔진 + 90분 시계)
 *
 *   WingerLive.play(host, cfg) → Promise<info>
 *     cfg  = { xi, teamStr, oppStr, condition, homeName, oppName, myName, foot: "L"|"R", keeper,
 *              pos, chibi, promiseLine, scout, seed, auto, rate(result) → 평점, sFor(card) → s(화면 없을 때만) }
 *            `pos`("fw"·"wg"·"mf"·"df")는 화면에만 — 판에서 「나」 말이 서는 집 자리(없으면 윙어 자리)
 *     info = 엔진 result() + { rating, promise: { ok } | null, saved, boards: [{ kind, s, judge, auto }] }
 *            (`auto` — 사람이 판을 안 둔 칸: 🤖 자동이거나 판 자리를 못 받아 중립 s = 0.5로 흘린 칸)
 *            (90′ 휘슬 줄이 그려진 **뒤에** 풀려요 — 결과 · [다음]은 부르는 쪽이 그 아래에 붙입니다)
 *
 * 설계: 12번 §8-1(드라이버) · 11번 §2-4 · §8-1(옛 `town.js` 시계를 뽑아 옴) · 25번 §3 계약 1~4
 *
 * ── 🔒 지키는 것 (감사 11번 §7) ─────────────────────────────────
 *  · **엔진 수정 0** — 카드를 받은 **뒤** 그 분까지 시계를 돌립니다. 분은 `minutesFor`가 경기 시작에
 *    이미 뽑아 두어서, 굴림이 표시보다 몇 초 앞서도 「앞 카드 결과를 보고 굴린다」는 그대로예요.
 *  · **시계는 `await` 루프** — `setInterval` 금지(#21). ⏩·🤖는 **간격만** 0이고 틱 개수는 그대로예요.
 *  · **시계가 줄을 추월하지 않습니다** — 줄마다 `push`의 Promise를 기다린 뒤 다음 분으로 가요.
 *  · **세대 가드는 `match-scene.js` 한 곳** — 여기서는 `push(card, gen)`·`clock(min, gen)`에 세대를
 *    넘기기만 하고 **따로 확인하지 않습니다**(#20 — 방어가 겹치면 한쪽을 지워도 증상이 0장).
 *    `clock()`이 `false`면(다음 경기가 이미 깔림) 루프를 끊어요.
 *  · **90′ 줄이 그려진 뒤에** 풀립니다 — 안전망 타임아웃 없음(#23 · 자가 복구가 실패를 삼킴).
 *  · **흐름 줄의 주인은 엔진의 중립 장면**(`kind: "filler"`) — 12분 격자 줄은 안 씁니다(겹쳐요).
 *    글만 1막 흐름 표로 갈아 끼워요. 흐름(`a`·`h`·`mid`)은 카드 번호·스코어에서 **결정적**으로(판정 난수 0).
 *  · **판을 여는가의 주인은 `W2Moment.opens` 하나** — 옛 `career.js`의 `pendingKind !== "defend"`를
 *    두지 않습니다(방어가 겹침). 🧱도 판을 엽니다(12번 §4-4).
 *  · 연출 난수는 화면(`fxRnd`)만 — 여기는 굴림이 **한 번도** 없어요. 엔진 굴림은 `cfg.seed`로 시작해요.
 *
 * 🧪 `host`가 없거나 화면(`W2Scene`)이 안 왔으면 **화면 없이** 끝까지 돌립니다(판은 `cfg.sFor`,
 *    없으면 중립 `s = 0.5`). 스크립트 하나가 안 왔다고 판이 통째로 멈추지 않게 — 그리고 검사가
 *    같은 드라이버를 node에서 부를 수 있게요.
 *
 * ⚠️ winger2 전용 파일이에요. 8종이 내려받는 공유 파일(timing.js·base.css·match.js)에 넣지 마세요. */
"use strict";

window.WingerLive = (() => {
  /* 🎚️ 조정될 수 있는 상수 — 이 블록만 고칩니다(25번 §5). */
  const TUNE = Object.freeze({
    /* ⏱️ 경기 1분이 실제로 걸리는 시간 — 🔒 **트레이드오프 손잡이**(길이 ↔ 시계 숫자가 읽히는가).
     * 15번 I — 사용자 결정: 90분 ≈ 22초(옛 90 → 250). 시계는 연출만 — 틱 개수 · 순서 · 판정은 이 값과 무관해요.
     * ⏩ 빨리 감기(`Scene.isFast`)와 🤖 자동은 간격 0 그대로예요. */
    MIN_MS: 250,
  });

  /* 🏁 0′ — **두 줄**(12번 §8-1). 🔒 「시작」이 아니라 **대진**을 말합니다 — 버튼이 이미 「🏁 경기 시작」이에요.
   * 둘째 줄이 `{me}`를 화면에 처음 올리는 자리예요. 조사는 `W2World.fill`이 이름에 맞춰 붙여요. */
  const KICK_LINE = "{opp|와}의 90분이 시작됩니다";
  const KICK2_LINE = "{me|가} 크게 숨을 들이쉽니다";

  /* 🌊 1막 흐름 표 — 🔒 **결정적**이에요(`Math.random` 0 · 엔진 `_rng` 0).
   * 흐름마다 세 줄 · 셋이 서로 다른 모양([0] 판세 · [1] 🧡 `{me}` · [2] 관중·세트피스).
   * 🔒 고르는 자는 「그 흐름이 이 경기에서 몇 번째로 쓰였나」(`used`) — 한 경기에서 같은 말이 두 번 안 떠요.
   * 🔒 `{me}` 줄은 **포지션을 안 탑니다**(수비수에게 「돌파!」가 뜨지 않게). 사람 이름은 틀 자리로만. */
  const FLOW_LINE = {
    a: ["완전히 밀어붙입니다 — 관중석이 들썩여요", "{me|가} 자리를 잡으며 동료를 부릅니다", "코너킥, 관중석이 일어섭니다"],
    h: ["상대가 거세게 나옵니다 — 관중석이 조용해졌어요", "{me|가} 끝까지 따라붙습니다", "연달아 두들겨 맞습니다"],
    mid: ["양 팀이 서로를 재고 있어요", "{me|가} 고개를 들어 앞을 봅니다", "관중석이 잠시 잦아듭니다"],
  };
  /* 🔁 흐름 — 🔒 **연출 축**이에요(판정에 한 톨도 안 갑니다). 기본은 교대(카드 번호로),
   * **마지막 카드만 스코어를 봅니다** — 90분 직전은 흐름이 스코어와 어긋나면 가장 크게 읽히는 자리라서요
   * (지고 있으면 우리가 몰아붙이고, 이기고 있으면 상대가 달려들어요). 새 굴림 0. */
  const flowOf = (k, n, us, them) => (k < n ? (k % 2 ? "a" : "h") : us < them ? "a" : us > them ? "h" : "mid");

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fill = (t, v) => (window.W2World && window.W2World.fill ? window.W2World.fill(t, v) : String(t));

  /* 💪 **살린 순간**(약속의 사실 근거 · 21번 §5 · 22번 §0-1) — 내 판만 셉니다(동료 골에 붙은 자동 도움 제외).
   * ⚽ 결정은 `perfect`(골)과 `ok`(골문 안 슛 — 「🎯 슛! 골키퍼 정면」)을 둘 다 살림으로, 🅰️ 🧱은 `perfect`만. */
  const savedOf = (cards) => (cards || []).filter((c) => c.mine
    && (c.kind === "goal" ? c.judge === "perfect" || c.judge === "ok" : c.judge === "perfect")).length;

  /* 🏁 킥오프 둘째 줄 — 엔진 카드가 아니라 **글 한 줄**이에요. 화면이 읽는 칸을 엔진 카드와 같은 모양으로 채워요. */
  const lineCard = (min, kind, text) => ({
    k: 0, n: 0, min, kind, mine: false, moment: null, big: false, clutch: false, stake: null, stakeKey: null,
    result: "none", by: null, pos: null, goalBy: null, assistBy: null, judge: null,
    credit: { g: 0, a: 0, d: 0 }, score: [0, 0], decisive: false, goAhead: false, text,
  });

  function finish(m, cfg, boards) {
    const res = m.result();
    const saved = savedOf(res.cards);
    return Object.assign(res, {
      rating: typeof cfg.rate === "function" ? cfg.rate(res) : null,
      /* 📋 약속은 **조건 하나**(살린 순간 1↑ — 21번 §5). 새 난수 0 — 이 경기의 실제 기록이에요. */
      promise: cfg.promiseLine ? { ok: saved >= 1 } : null,
      saved, boards,
    });
  }

  /* 🧪 화면 없이 — 같은 엔진 · 같은 순서(`m.resolve(m.judgeFor(s))`)로 끝까지 */
  function headless(m, cfg) {
    const boards = [];
    let c;
    while ((c = m.next())) {
      if (!m.pending) continue;
      const kind = m.pendingKind;
      const s = typeof cfg.sFor === "function" ? Number(cfg.sFor(c)) : 0.5;
      const sv = Number.isFinite(s) ? Math.min(1, Math.max(0, s)) : 0.5;
      const j = m.judgeFor(sv);
      m.resolve(j);
      boards.push({ kind, s: sv, judge: j });
    }
    return finish(m, cfg, boards);
  }

  async function play(host, cfg) {
    const c = cfg || {};
    const E = window.WingerEngine;
    if (!E || !E.createMatch) throw new Error("engine.js가 안 실렸어요");
    /* 🎲 엔진의 모든 굴림이 이 경기의 시드에서 시작해요 — 같은 시드 · 같은 조작이면 같은 경기예요.
     * (엔진 수정 0 — 이미 있는 창구 `_t.seed`) */
    if (Number.isFinite(c.seed) && E._t && E._t.seed) E._t.seed(c.seed);
    const m = E.createMatch({
      xi: c.xi, homeName: c.homeName, oppName: c.oppName,
      teamStr: c.teamStr, oppStr: c.oppStr, condition: c.condition,
    });
    const Scene = window.W2Scene;
    if (!host || !Scene || !Scene.mount) return headless(m, c);

    const M = window.W2Moment;
    const myName = String(c.myName || "나");
    host.innerHTML = "";
    const sceneEl = document.createElement("div");
    sceneEl.className = "w2-live-scene";
    const bar = document.createElement("div");
    bar.className = "w2-live-bar";
    host.append(sceneEl, bar);
    Scene.mount(sceneEl, {
      home: c.homeName, away: c.oppName, myName, pos: c.pos || null,
      chibi: c.chibi || null, promiseLine: c.promiseLine || null, scout: c.scout || null,
    });
    const gen = Scene.gen ? Scene.gen() : null;
    /* 🤖 자동 진행이면 판정이 즉시 나와요 — 연출만 짧게(⏩와 같은 자리 · 개입은 그대로 중립) */
    if (c.auto && Scene.fast) Scene.fast();

    /* 🎬 그리기를 **줄 세웁니다** — `push`는 async라, 기다리지 않으면 같은 카드가 두 번 열리거나
     * 시계가 줄을 추월해요. 돌려주는 값은 `push`의 결과(🔥 열기면 판 자리)예요.
     * 화면이 던져도 게임은 멈추지 않게 받아 두고(판 자리가 없으면 아래에서 중립으로 흘려요). */
    let queue = Promise.resolve();
    const draw = (card) => (queue = queue.then(() => Scene.push(card, gen)).catch((e) => {
      console.error(e);
      return null;
    }));

    let clockMin = 0;
    /* ⏱️ `target` 분까지 **한 칸씩**. 🔒 틱의 개수는 속도와 무관 — ⏩·🤖는 간격만 0이에요.
     * 🔴 `if (fast) { clockMin = target }`로 건너뛰지 마세요 — 「시계가 흐른다」가 통째로 눈이 멉니다. */
    async function tickTo(target) {
      while (clockMin < target) {
        clockMin += 1;
        if (!Scene.clock) { clockMin = target; return true; }
        if (!Scene.clock(clockMin, gen)) return false;       // 🎬 세대가 갈렸어요 — 화면의 판단이에요
        const ms = Scene.isFast && Scene.isFast() ? 0 : TUNE.MIN_MS;
        if (ms > 0) await wait(ms);
      }
      return true;
    }

    const boards = [];
    const used = { a: 0, h: 0, mid: 0 };   // 🗣️ 그 흐름이 이 경기에서 몇 번째로 쓰였나(경기 하나의 지역 값)
    /* 🔥 내 순간 — 열기(무엇이 걸렸나) → 판 → `m.judgeFor(s)` → `m.resolve` → 닫기(결과 줄) */
    async function mine(card) {
      const kind = m.pendingKind;
      const board = !c.auto && M && M.play && (!M.opens || M.opens(kind));
      if (!board) {
        const j = m.judgeFor(0.5);
        m.resolve(j);
        boards.push({ kind, s: 0.5, judge: j, auto: true });
        await draw(card);                  // 판정이 이미 들어간 카드라 화면이 열기 + 닫기를 한 번에 그려요
        return;
      }
      const slot = (await draw(card)) || (Scene.momentSlot ? Scene.momentSlot() : null);
      let got;
      if (slot) {
        got = await new Promise((done) => M.play(slot, {
          kind, moment: card.moment, condition: c.condition,
          foot: c.foot === "L" ? "L" : "R", keeper: c.keeper,
          /* 🔒 판은 `s`만 내고 판정은 엔진이 — 산식은 `engine.js` 한 곳(§2-6) */
          judge: (s) => m.judgeFor(s),
        }, (judge, detail) => done({ judge, s: detail && Number.isFinite(detail.s) ? detail.s : 0.5 })));
      } else {
        got = { judge: m.judgeFor(0.5), s: 0.5, auto: true };   // 판 자리를 못 받았어요 — 중립으로 흘리고 다음 분에서 화면이 판단해요
      }
      m.resolve(got.judge);
      boards.push({ kind, s: got.s, judge: got.judge, auto: !!got.auto });
      await draw(card);
    }

    async function runClock() {
      await queue;                         // 🔒 0′ 두 줄이 다 그려진 뒤에 시계가 움직여요
      showFast();
      for (;;) {
        const card = m.next();             // 엔진이 **그 자리에서** 굴립니다(점진 확정)
        if (!card) break;
        if (!(await tickTo(card.min))) return null;
        if (card.kind === "filler") {
          const fl = flowOf(card.k, m.n, card.score[0], card.score[1]);
          const t = FLOW_LINE[fl];
          card.flow = fl;
          card.text = fill(t[used[fl]++ % t.length], { me: myName });
          await draw(card);
        } else if (m.pending) {
          await mine(card);
        } else {
          await draw(card);
          if (card.kind === "end") break;
        }
      }
      await queue;
      if (Scene.summary) {
        const r = m.result();
        Scene.summary({ mineCards: r.mineCards, mineSuccess: r.mineSuccess });
      }
      bar.innerHTML = "";
      return finish(m, c, boards);
    }

    /* ⏩ 경기 중의 버튼 — **연출만** 짧게(판정 · 판에 한 톨도 안 닿아요). 이미 빨리감기 중이면 안 붙여요.
     * 🔒 `click`에서만(원칙 ⑥) · 🏁 버튼 콜백 **안**에서 붙이지 않고 `runClock()`의 `await queue` 뒤에 붙여요. */
    function showFast() {
      bar.innerHTML = "";
      if (!Scene.fast || !Scene.isFast || Scene.isFast()) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "w2-btn w2-live-fast";
      b.textContent = "⏩ 빨리감기";
      b.addEventListener("click", () => { Scene.fast(); b.remove(); });
      bar.appendChild(b);
    }

    /* 🏁 0′ 두 줄은 **[경기 시작]을 누르기 전에** 큐에 넣어요 — 사람이 읽고 누르는 시간이 이 두 줄을 덮습니다. */
    const kick = m.next();
    kick.text = fill(KICK_LINE, { opp: c.oppName || "상대" });
    draw(kick);
    draw(lineCard(0, "kick", fill(KICK2_LINE, { me: myName })));
    return new Promise((resolve, reject) => {
      const go = document.createElement("button");
      go.type = "button";
      go.className = "w2-btn w2-btn-primary w2-live-go";
      go.textContent = "🏁 경기 시작";
      go.addEventListener("click", () => {
        if (go.disabled) return;
        go.disabled = true;
        runClock().then(resolve, reject);
      });
      bar.appendChild(go);
    });
  }

  return { play, TUNE, _t: { flowOf, FLOW_LINE, savedOf, KICK_LINE, KICK2_LINE } };
})();
