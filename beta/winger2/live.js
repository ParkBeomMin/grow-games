/* ⚽ 더 윙어 II 1막 — **경기 드라이버 하나**(엔진 + 90분 시계 + 판 셋의 상황)
 *
 *   WingerLive.play(host, cfg) → Promise<info>
 *     cfg  = { xi, teamStr, oppStr, condition, homeName, oppName, myName, foot: "L"|"R", keeper,
 *              pos, chibi, promiseLine, scout, seed, auto, rate(result) → 평점,
 *              weak(약발 단계 0~2), rivalAb(📍 민재 실력), sitRng(상황 난수원 — 균등 [0,1) 함수),
 *              fast(⏩로 시작), still(움직임 줄이기), wide(♿ 고를 시간 넉넉히) }
 *            `still` · `wide`는 참 · 거짓이나 함수 — 함수면 **판을 열 때마다** 읽어요(⚙️ 「다음 판부터」 · 「바로」)
 *            `pos`("fw"·"wg"·"mf"·"df")는 화면에만 — 판에서 「나」 말이 서는 집 자리(없으면 윙어 자리)
 *     info = 엔진 result() + { rating, promise: { ok } | null, saved, first, boards }
 *            boards: [{ kind, s, sBoard, judge, auto, cell, target, seen, weak, step, q, ms }]
 *              `s` = 판정에 쓴 값(`sBoard × 🦶 × 🫀`) · `auto` = 사람이 판을 안 둔 칸(🤖 · 판이 없음 · 판이 던짐)
 *              `q` = 📍 같은 장면을 민재가 맡았다면 해냈을 확률(29번 §2-2 · 36번 §3-5) · `ms` = 판이 열린 뒤 고를 때까지
 *            `first` = 그 경기 **첫 내 순간**을 살렸나(1 · 0 · 판이 없으면 null — 27번 §5-1)
 *            (90′ 휘슬 줄이 그려진 **뒤에** 풀려요 — 결과 · [다음]은 부르는 쪽이 그 아래에 붙입니다)
 *
 * 설계: 12번 §8-1(드라이버) · 27번(판 2~3 · 최소 1 · 상한 4 · 간격 15 — **엔진**이 정함) · 36번 §3 · §8 · §16(판 셋 ·
 *       상황) · 38번 §2 계약 3′ · 4′ · §5(계수) · 25번 §3 계약 1~4
 *
 * ── 🔒 지키는 것 (감사 11번 §7) ─────────────────────────────────
 *  · **엔진은 판정 한 곳** — 판은 `s`만 내고 `m.judgeFor(s)`가 굴려요(판마다 **한 번** — 두 번 불러도 첫 결과).
 *  · **상황(🦶 약발)은 따로 난수원** — 엔진 굴림 열을 안 건드려요(같은 경기 · 같은 순간이면 같은 상황).
 *    판마다 한 번 뽑아요 — 판을 열든 🤖이든 같은 수만큼(공통 난수).
 *  · **🤖 · 손 · 승산 줄이 같은 배수** — `s = clamp(sBoard × 🦶 × 🫀)` · 🤖는 `sBoard` 0.5(36번 §3-4).
 *    판은 배수를 스스로 셈하지 않고 `sit`을 곱하기만(38번 §1).
 *  · **화면 길과 머리 없는 길이 같은 규칙** — 머리 없는 길도 `W2Moment.play(null, …)`를 불러요(판이 🤖처럼 곧바로).
 *    판은 **부를 때마다 전역에서 찾아요**(검사가 손을 갈아 끼울 수 있게 — 로드 때 잡아 두지 않음).
 *  · **시계는 `await` 루프** — `setInterval` 금지(#21). ⏩·🤖는 **간격만** 0이고 틱 개수는 그대로예요.
 *  · **시계가 줄을 추월하지 않습니다** — 줄마다 `push`의 Promise를 기다린 뒤 다음 분으로 가요.
 *  · **세대 가드는 `match-scene.js` 한 곳** — 여기서는 `push(card, gen)`·`clock(min, gen)`에 세대를
 *    넘기기만 하고 **따로 확인하지 않습니다**(#20). `clock()`이 `false`면(다음 경기가 이미 깔림) 루프를 끊어요.
 *  · **90′ 줄이 그려진 뒤에** 풀립니다 — 안전망 타임아웃 없음(#23 · 자가 복구가 실패를 삼킴).
 *  · **흐름 줄의 주인은 엔진의 중립 장면**(`kind: "filler"`) — 흐름(`a`·`h`·`mid`)은 카드 번호·스코어에서 결정적으로.
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
    /* 🦶 약발 상황 — 판의 ⅓(판마다 따로 · 세 판 같게) · 🦶 = min(0.95, 0.75 + 0.13 × 약발 단계) → 0.75 · 0.88 · 0.95
     * 37번 §2 · 38번 §5(13%p는 R20 둘째 값 · 2단계는 36번 꼭대기 0.95로 묶음) 🔶 실기기 사람 s̄ 뒤 다시 */
    WEAK_P: 1 / 3, WEAK_BASE: 0.75, WEAK_STEP: 0.13, WEAK_TOP: 0.95,
    /* 📍 민재 쪽 `q`의 🦶 — 민재는 약발 0단계 · 🫀 1(36번 §3-5 · 38번 §5) */
    RIVAL_WEAK: 0.75,
  });
  /* 🦶 약발 상황의 배수 — 한 곳(경기 안 판 · 경기 밖 판(`game.js` 기술 테스트 · 승부차기) · 확인 페이지가 같이 씀) */
  const footOf = (weak, step) => (weak ? Math.min(TUNE.WEAK_TOP, TUNE.WEAK_BASE + TUNE.WEAK_STEP * step) : 1);
  const flag = (v) => { try { return typeof v === "function" ? !!v() : !!v; } catch (e) { return false; } };

  /* 🏁 0′ — **두 줄**(12번 §8-1). 🔒 「시작」이 아니라 **대진**을 말합니다 — 버튼이 이미 「🏁 경기 시작」이에요.
   * 둘째 줄이 `{me}`를 화면에 처음 올리는 자리예요. 조사는 `W2World.fill`이 이름에 맞춰 붙여요. */
  const KICK_LINE = "{opp|와}의 90분이 시작됩니다";
  const KICK2_LINE = "{me|가} 크게 숨을 들이쉽니다";
  /* 🦶 약발 2단계 「양발」 — 그 경기의 첫 약발 상황 뒤에 해설 한 줄(29번 §3-6 (가) · 한 경기 한 번) */
  const BOTH_LINE = "🦶 약발 쪽으로 온 공에도 {me|는} 망설이지 않아요 — 이제 양발이에요";

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
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const num01 = (v) => (typeof v === "number" && Number.isFinite(v) ? clamp01(v) : null);

  /* 💪 **살림**(약속 · 보고 — 27번 §5-1) — 내 판만 셉니다(동료 골에 붙은 자동 도움 제외).
   * ⚽ 결정은 `perfect`(골)과 `ok`(골문 안 슛)을 둘 다 살림으로, 🅰️ 🧱은 `perfect`만. */
  const isSaved = (c) => !!c && c.mine && (c.kind === "goal" ? c.judge === "perfect" || c.judge === "ok" : c.judge === "perfect");
  const savedOf = (cards) => (cards || []).filter(isSaved).length;

  /* 🏁 킥오프 둘째 줄 — 엔진 카드가 아니라 **글 한 줄**이에요. 화면이 읽는 칸을 엔진 카드와 같은 모양으로 채워요. */
  const lineCard = (min, kind, text) => ({
    k: 0, n: 0, min, kind, mine: false, moment: null, big: false, clutch: false, stake: null, stakeKey: null,
    result: "none", by: null, pos: null, goalBy: null, assistBy: null, judge: null,
    credit: { g: 0, a: 0, d: 0 }, score: [0, 0], decisive: false, goAhead: false, text,
  });

  function finish(m, cfg, boards) {
    const res = m.result();
    const fm = (res.cards || []).find((x) => x.mine);
    const first = fm ? (isSaved(fm) ? 1 : 0) : null;
    return Object.assign(res, {
      rating: typeof cfg.rate === "function" ? cfg.rate(res) : null,
      /* 📋 약속은 **그 경기의 내 첫 순간**(27번 §5-1). 첫 순간이 없으면(최소 1번 규칙 뒤엔 안 생김) 판정 없음 */
      promise: cfg.promiseLine && first != null ? { ok: first === 1 } : null,
      saved: savedOf(res.cards), first, boards,
    });
  }

  /* 🎯 한 경기의 판 셋 — 상황 굴림 · 승산 · 판정 한 번 · 기록(화면 길 · 머리 없는 길이 같이 씀) */
  function boardsOf(m, c, E) {
    const me = (c.xi || []).find((x) => x && x.me) || null;
    const abMe = me ? E.blendOf(me) : 50;
    const heart = E.condMul(c.condition);
    const step = Math.min(2, Math.max(0, Math.floor(Number(c.weak)) || 0));
    const rivalAb = typeof c.rivalAb === "number" && Number.isFinite(c.rivalAb) ? c.rivalAb : null;
    const W = window.W2World;
    /* 🎲 상황 난수원 — 부르는 쪽이 주면 그것(판 시드 · 경기 열쇠) · 없으면 경기 시드에서 따로 가른 줄기 */
    const sr = typeof c.sitRng === "function" ? c.sitRng
      : W && W.rngOf && W.SALT && Number.isFinite(c.seed) ? W.rngOf(c.seed >>> 0, 0, W.SALT.board) : () => 0.5;
    const main = c.foot === "L" ? "L" : "R";
    const T = TUNE;
    function sit() {
      const weak = sr() < T.WEAK_P;
      return { weak, step, foot: footOf(weak, step), cond: heart };
    }
    const qOf = (kind, s) => (rivalAb == null ? null
      : E.cardP(m.autoP(kind, rivalAb), rivalAb, 0.5 * (s.weak ? T.RIVAL_WEAK : 1)));
    function auto(kind, s) {
      const v = clamp01(0.5 * s.foot * s.cond);
      return { kind, s: v, sBoard: 0.5, judge: m.judgeFor(v), auto: true, cell: null, target: null, seen: null,
        weak: s.weak, step: s.step, q: qOf(kind, s), ms: 0 };
    }
    /* 손으로 두는 판 — slot이 null이면 판이 🤖처럼 곧바로(머리 없는 길). 판이 던지거나 판정을 안 했으면 🤖로 받음 */
    function hand(kind, s, slot, fast) {
      let got = null;
      const judge = (sv) => {
        if (!got) { const v = num01(Number(sv)); got = { s: v == null ? 0 : v }; got.j = m.judgeFor(got.s); }
        return got.j;
      };
      const odds = (sv) => Math.round(100 * E.cardP(m.autoP(kind, abMe), abMe, num01(Number(sv)) || 0));
      return new Promise((done) => {
        try {
          const M = window.W2Moment;
          M.play(slot, {
            kind, sit: s, odds, judge, foot: s.weak ? (main === "L" ? "R" : "L") : main,
            keeper: c.keeper, fast: !!fast, still: flag(c.still), wide: flag(c.wide),
          }, (j, d) => done(d || {}));
        } catch (e) {
          console.error(e);
          done(null);
        }
      }).then((d) => {
        if (!got) return auto(kind, s);
        const dd = d || {};
        return { kind, s: got.s, sBoard: num01(dd.sBoard), judge: got.j, auto: false,
          cell: dd.cell == null ? null : dd.cell, target: dd.target == null ? null : dd.target,
          seen: dd.seen === "clear" || dd.seen === "dim" ? dd.seen : null,
          weak: s.weak, step: s.step, q: qOf(kind, s), ms: Number.isFinite(dd.ms) ? Math.max(0, dd.ms) : null };
      });
    }
    const opens = (kind) => {
      const M = window.W2Moment;
      return !c.auto && !!M && typeof M.play === "function" && (!M.opens || M.opens(kind));
    };
    return { sit, auto, hand, opens };
  }

  /* 🧪 화면 없이 — 같은 엔진 · 같은 판 규칙 · 같은 상황 · 같은 🤖(판은 slot 없이 불러요) */
  async function headless(m, c, E) {
    const B = boardsOf(m, c, E);
    const boards = [];
    let card;
    while ((card = m.next())) {
      if (!m.pending) continue;
      const kind = m.pendingKind;
      const s = B.sit();
      const b = B.opens(kind) ? await B.hand(kind, s, null, false) : B.auto(kind, s);
      m.resolve(b.judge);
      boards.push(b);
    }
    return finish(m, c, boards);
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
    if (!host || !Scene || !Scene.mount) return headless(m, c, E);

    const B = boardsOf(m, c, E);
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
    /* 🤖 자동 진행 · ⏩ 「빨리 감기로 시작」(설정)이면 연출만 짧게 — 판정 · 판은 그대로(29번 §4-1) */
    if ((c.auto || c.fast) && Scene.fast) Scene.fast();
    const isFast = () => !!(Scene.isFast && Scene.isFast());

    /* 🎬 그리기를 **줄 세웁니다** — `push`는 async라, 기다리지 않으면 같은 카드가 두 번 열리거나
     * 시계가 줄을 추월해요. 돌려주는 값은 `push`의 결과(🔥 열기면 판 자리)예요.
     * 화면이 던져도 게임은 멈추지 않게 받아 두고(판 자리가 없으면 판이 🤖처럼 흘려요). */
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
        const ms = isFast() ? 0 : TUNE.MIN_MS;
        if (ms > 0) await wait(ms);
      }
      return true;
    }

    const boards = [];
    const used = { a: 0, h: 0, mid: 0 };   // 🗣️ 그 흐름이 이 경기에서 몇 번째로 쓰였나(경기 하나의 지역 값)
    let saidBoth = false;                  // 🦶 「양발」 해설 — 한 경기 한 번
    /* 🔥 내 순간 — 상황 → (🤖 | 열기 → 판) → `judge` 한 번 → `m.resolve` → 닫기(결과 줄)
     * 카드에 `weak`(🦶 약발 상황) · `auto`(🤖)를 달아 화면이 결과 줄 꼬리표를 그려요(36번 §3-3) */
    async function mine(card) {
      const kind = m.pendingKind;
      const s = B.sit();
      card.weak = s.weak;
      if (!B.opens(kind)) {
        const b = B.auto(kind, s);
        card.auto = true;
        m.resolve(b.judge);
        boards.push(b);
        await draw(card);                  // 판정이 이미 들어간 카드라 화면이 열기 + 닫기를 한 번에 그려요
        return;
      }
      const slot = (await draw(card)) || (Scene.momentSlot ? Scene.momentSlot() : null);
      /* 화면 길에서 판 자리가 없으면(장면이 자리를 못 냄) 🤖로 적어요 — `null` 자리는 머리 없는 길의 약속이에요(38번 §6 3′-d) */
      const b = slot ? await B.hand(kind, s, slot, isFast()) : B.auto(kind, s);
      if (b.auto) card.auto = true;
      m.resolve(b.judge);
      boards.push(b);
      await draw(card);
      if (s.weak && s.step >= 2 && !saidBoth) {
        saidBoth = true;
        await draw(Object.assign(lineCard(card.min, "filler", fill(BOTH_LINE, { me: myName })), { score: m.score.slice() }));
      }
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

  return { play, TUNE, footOf, _t: { flowOf, FLOW_LINE, savedOf, isSaved, KICK_LINE, KICK2_LINE } };
})();
