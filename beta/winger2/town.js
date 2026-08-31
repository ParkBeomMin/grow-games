/* 🏘️ ⚽ 더 윙어 II — 동네 축구 · 🏟️ 유스 입단 제안 (winger2 전용)
 *
 *   WingerTown.open({ pos, foot }, done)   🏘️ 순간 카드 3장을 굴리고 `done()`을 부릅니다
 *   WingerTown.played() / score()          굴렸나 · 0~6점
 *   WingerTown.offerFor(marketId)          🏟️ 그 유스가 내민 제안 { tier, mul, star, label, word }
 *   WingerTown.scoreOf(st)                 세이브에서 읽기 — **옛 세이브는 중립 3**
 *
 * ── 왜 전용 파일인가 ─────────────────────────────────────────
 * `timing.js`·`base.css`·`match.js`·`help.js`는 **8개 게임이 전부 내려받습니다.**
 * 축구 하나만 쓰는 화면을 거기 넣으면 안 쓰는 게임까지 무게를 집니다.
 * 🎤 아이돌의 `tour-stage.js`·⚾ 야구의 `post-stage.js`·🔥 `winger-moment.js`와 같은 이유예요.
 * game.js의 최상위 `const`(PEER_REF·youthAutoP·show…)는 **뒤에 실린 스크립트에서 그대로 보입니다** —
 * 그래서 산식을 베껴 오지 않고 **게임이 쓰는 그 함수를 그대로** 부릅니다.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 **동네는 능력치를 안 탑니다 — 태울 축이 없어서예요** (설계 85번 §4-1-a)
 * ══════════════════════════════════════════════════════════════════════
 * 동네는 🧬 조립대 **앞**이라 `S.stats`가 아직 없고, **모든 플레이어가 정확히 같은 몸**
 * (`WingerProspect.evenStats()` = `POOL 194 ÷ 6 ≈ 32.33`)으로 뜁니다.
 * 능력치가 전원 동일하니 **능력치를 태워도 아무 일이 안 일어나요.**
 *
 * 🔴 **그래서 「동네 전용 카드 확률 상수」를 두지 않습니다** (설계 87번).
 *    전원이 같은 값이면 상수 하나든 산식이든 결과가 같은데, 상수를 따로 두면
 *    **다음 사람이 그 상수를 난이도 손잡이로 만집니다.** `PEER_REF`에 칸 하나로 끝나요 —
 *    32.33 ÷ 32.0 = **비율 1.009**, 거의 정확히 중립입니다.
 *    🔑 **주석으로 지키던 것을 구조가 지킵니다.**
 *
 * 그리고 이게 층을 만듭니다 — 튜토리얼이 구조로 설명돼요:
 *
 *   | 무대        | 카드의 중심     | 능력치 | 조작 | 팀 |
 *   | 🏘️ 동네     | **또래 기준선** | 🔴 없음(전원 동일) | ✅ | 🔴 |
 *   | ⚔️ 유스 평가전 | **능력치가 정함** | ✅ | ✅ | 🔴 |
 *   | ⚽ 프로 경기  | **전력 + 능력치** | ✅ | ✅ | ✅ |
 *
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 **제안이 사는 것은 `spot`(주목도) 하나뿐입니다** (설계 85번 §2-2)
 * ══════════════════════════════════════════════════════════════════════
 * 🔴 **`growth`·`debut`에는 한 톨도 안 닿습니다. 검사가 지킵니다.**
 *
 *   `growth` 0.98~1.18  🔴 **36턴 복리**예요. 복리 축에 조작 3장을 걸면 그건 육성이
 *                          아니라 **처벌**입니다. *"성취감이 약하다"*는 압박이 반드시
 *                          오는데, **그때 손대야 하는 곳이 여기가 아닙니다.**
 *   `debut`  0.57~0.66  🔴 유스 선택의 **트레이드오프 축**(데뷔 쉬움 ↔ 성장 빠름).
 *                          여기 닿으면 *"못한 사람이 오히려 데뷔가 쉬워지는"* 뒤집힘이 납니다
 *   `spot`   1.00~1.15  ✅ **여기만.** `pts = round(fg.pts × spot)`은 **곱**이라
 *                          경기 평점이 낮으면 곱해도 작아요 — *"덜 키운 쪽은 +0"*이
 *                          **산식으로 보장**됩니다(원칙 ⑥). 그리고 ⭐ 명성은
 *                          **누적·무상한**이라 `score = fandom + overall()×2`에
 *                          **훈련으로 만회할 길이 이미 들어 있습니다.**
 *
 * 🔴 **유스 5곳은 못해도 전부 옵니다. 목록을 줄이지 않습니다** (설계 85번 §3-1).
 *    못한 사람에게 🇰🇷(`debut` 0.66 · 가장 쉬움)만 주면 **데뷔가 오히려 쉬워지고**,
 *    잘한 사람이 험한 🇮🇹를 받습니다 — **처벌이 처벌이 아니고 보상이 보상이 아니게 돼요.**
 *    바뀌는 건 각 카드에 붙는 **제안 등급 한 줄**뿐입니다.
 *
 * 🔴 **건너뛰기·난이도 선택·재도전 버튼을 붙이지 마세요** (설계 85번 §5-3).
 *    결정 탭이 4(🪪 신원·📍 위치·🏟️ 제안·🧬 조립대)를 넘는 순간 검산이 무너지고,
 *    무엇보다 **그건 v2의 정체(내가 개입하는 순간)를 건너뛰는 버튼**입니다.
 *    ⏱️ 실기기에서 길어지면 **길이를 줄이지 버튼을 붙이지 마세요.**
 */
"use strict";

window.WingerTown = (() => {
  /* 🏘️ 동네에서 여는 카드 — ⚽ 결정 · 🅰️ 전개 · 🧱 수비 **각 한 장**.
   * 종류를 고정하는 이유 둘: ① 미니게임을 다 보여줍니다(튜토리얼)
   * ② 한 종류에 몰리는 운을 없앱니다 — 3장이면 표본이 너무 작아요. */
  const CARDS = [
    { key: "g", name: "결정", emoji: "⚽", line: "골문 앞에서 공이 발에 걸렸어요." },
    { key: "a", name: "전개", emoji: "🅰️", line: "친구가 뒷공간으로 뛰기 시작했어요." },
    { key: "d", name: "수비", emoji: "🧱", line: "한 명만 지나가면 실점이에요." },
  ];
  /* 판정 → 점수. `perfect 2 · ok 1 · miss 0` → 3장 합계 **0~6점** (설계 85번 §5-1).
   * 🧱 수비는 판정에 `ok`가 없어요(읽기 게임 · 이분) — 2점 아니면 0점입니다. */
  const PTS = { perfect: 2, ok: 1, miss: 0 };
  /* 🫀 동네에서의 컨디션 — `newState`의 시작값과 같은 80이에요.
   * 판정 창(`condMul`)에 걸리는 값이라 아무 값이나 두면 안 됩니다. */
  const TOWN_CONDITION = 80;

  /* ══════════════════════════════════════════════════════════════════
   * 📣 **제안 등급 표 — `spot`에 곱하는 한 겹입니다** (설계 85번 §5-1)
   * ══════════════════════════════════════════════════════════════════
   * 🔴 **난이도 손잡이가 아닙니다.** 세기를 여기서 잡지 마세요 —
   *    유스의 세기는 `YOUTH_CARD_P`, 프로 도전은 `GRADE_PASS`·`DONE_PASS_CAP`입니다.
   *
   * ── 🔑 왜 이 다섯 칸이 「중립」인가 — 우연이 아니라 대칭입니다 ──
   * 동네 카드의 중심은 또래 기준선에서 ⚽🅰️ = ⅓ · 🧱 = 0.5이고, 엔진 `outcome` 표가
   * ⚽🅰️는 `miss = (1−p)/2`(세 갈래) · 🧱은 두 갈래라 **중립 조작(s = 0.5)의 점수 분포**가
   *   0점 1/18 · 1점 2/18 · 2점 4/18 · 3점 4/18 · 4점 4/18 · 5점 2/18 · 6점 1/18
   * 로 **3점을 축으로 정확히 대칭**입니다. 그래서 아래 밴드(0~1 / 2~4 / 5~6)에서
   *   P(0~1점) = 3/18 = P(5~6점)  →  **E[등급] = 「입단 제안」 = ×1.000**
   * 이 **정확히** 성립해요(원칙 ④ — 동네를 얹는 것만으로 게임이 세지거나 약해지지 않습니다).
   *
   * 🔴 **그러니 밴드도 배수도 「하나만」 옮기지 마세요.** 셋은 독립된 값이 아니라
   *    **한 대칭의 세 조각**입니다 — 밴드를 0~2 / 3~4 / 5~6으로 바꾸면 그 순간
   *    E[등급]이 1.000에서 떨어져 나갑니다(`NPC_SPOT` 사고의 형태예요).
   *
   * 🔒 **바닥 ×0.90 · 천장 ×1.10** — 「주목 배수 하한」이지 「동네 페널티」가 아닙니다.
   *    바닥이 없으면 회복 경로 자체가 사라지고, **그게 처벌의 정의**예요(설계 §3-3 ①). */
  const OFFER = [
    { mul: 0.90, star: "☆", label: "관찰 대상" },
    { mul: 0.95, star: "⭐", label: "후보 등록" },
    { mul: 1.00, star: "⭐⭐", label: "입단 제안" },
    { mul: 1.05, star: "⭐⭐⭐", label: "정식 제안" },
    { mul: 1.10, star: "⭐⭐⭐⭐", label: "특급 영입" },
  ];
  const NEUTRAL_TIER = 2;      // ⭐⭐ 입단 제안 = ×1.00

  /* 🎲 **유스마다 따로 굴립니다** — 동네 성적은 **기댓값**만 올려요 (설계 85번 §4-2 · 원칙 ⑧).
   * *"동네에서 잘했는데 🇮🇹만 시큰둥하네"* 가 서사입니다. 5곳이 한꺼번에 굴러 다 같아지면
   * *"잘했으면 다 좋음"* 이 되어 **선택이 사라집니다.**
   * ⚠️ 좌우 대칭(0.25 / 0.50 / 0.25)이라 **기댓값을 안 움직입니다.** 한쪽만 키우면
   *    그건 흔들림이 아니라 **난이도 조정**이 돼요. */
  const SHAKE = [[-1, 0.25], [0, 0.50], [1, 0.25]];

  /* 🗣️ 그 유스의 말 — 제-2안(조건 차등)이 *"성취가 덜 직접적"*인 걸 **말이 갚습니다.**
   * 등급이 높을수록 그 유스의 색이 드러나요(0~2는 미지근한 공통, 3~4는 유스마다 다릅니다). */
  const COLD = [
    "이름만 적어 두겠습니다",
    "일단 지켜보겠습니다",
    "우리 유스에서 한번 해볼까요",
  ];
  const PITCH = {
    k: "차근차근, 우리가 끝까지 책임질게요",
    jp: "패스 한 번에 답이 보이는 선수로 만들겠습니다",
    br: "그 발재간, 우리가 마음껏 풀어 줄게요",
    af: "이 몸이면 1군에서도 버팁니다. 바로 데려가죠",
    eu: "전술을 뼈에 새기겠습니다",
  };

  const state = { done: false, score: 0, rows: [], offers: null };

  /* ── 🏘️ 동네에서 엔진이 보는 몸 ────────────────────────────────
   * **전원이 같은 값**이에요 — `evenStats()`는 `POOL`을 여섯 칸에 고르게 나눈 모양입니다.
   * ⚠️ 나이 곡선(`nowStats`)을 안 통과합니다 — 동네는 조립대 **앞**이라 나이도 성장타입도
   *    아직 없어요. `PEER_REF.town`은 **그 날것의 평균(32.33)** 위에서 잰 값입니다. */
  function evenBody() {
    const P = window.WingerProspect;
    const st = P && P.evenStats ? P.evenStats() : null;
    if (!st) return { stats: null, x: 0 };
    const vals = Object.keys(st).map((k) => st[k]).filter((v) => typeof v === "number");
    return { stats: st, x: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
  }

  /* 카드 한 장의 판정을 엔진에 물어봅니다. **판정 산식을 여기서 만들지 않아요** —
   * `youthAutoP`·`judgeAtP`는 ⚔️ 유스가 쓰는 그 함수 그대로입니다. */
  function judgeFor(cardKey, opts) {
    const E = window.WingerEngine;
    const kind = YOUTH_CARD_KIND[cardKey] || "goal";
    const body = evenBody();
    const ability = E.blendOf({ pos: opts.pos, stats: body.stats });
    const autoP = youthAutoP(kind, body.x, PEER_REF.town);
    return { kind, ability, autoP, judge: (s) => E.judgeAtP(kind, autoP, ability, s) };
  }

  /* 🎲 5곳의 제안을 **한 번만** 굴립니다 — 화면을 다시 열어도 다시 안 굴러요.
   * (다시 굴리면 뒤로 가기가 곧 재도전이 됩니다) */
  function rollOffers(score) {
    const base = score <= 1 ? NEUTRAL_TIER - 1 : score <= 4 ? NEUTRAL_TIER : NEUTRAL_TIER + 1;
    const out = {};
    for (const m of MARKETS) {
      let r = Math.random(), d = 0;
      for (const [v, w] of SHAKE) { r -= w; if (r <= 0) { d = v; break; } }
      const tier = clamp(base + d, 0, OFFER.length - 1);
      const o = OFFER[tier];
      out[m.id] = {
        tier, mul: o.mul, star: o.star, label: o.label,
        word: tier >= NEUTRAL_TIER + 1 ? (PITCH[m.id] || COLD[NEUTRAL_TIER]) : COLD[tier],
      };
    }
    return out;
  }

  // ---------- 🏘️ 화면 ----------
  function progHTML() {
    return CARDS.map((c, i) => {
      const r = state.rows[i];
      const cls = !r ? (i === state.rows.length ? "town-dot now" : "town-dot")
        : "town-dot " + (r.res === "perfect" ? "hit" : r.res === "ok" ? "mid" : "bad");
      return `<span class="${cls}">${c.emoji}</span>`;
    }).join("");
  }

  function open(opts, done) {
    const o = opts || {};
    state.done = false; state.score = 0; state.rows = []; state.offers = null;
    const card = $("town-card"), res = $("town-result"), btn = $("btn-town-next");
    const hint = $("town-hint"), prog = $("town-prog");

    function paint() {
      if (prog) prog.innerHTML = progHTML();
    }

    function playCard(i) {
      const c = CARDS[i];
      if (hint) hint.innerHTML = `<b>${c.emoji} ${c.name}</b> — ${c.line}`;
      paint();
      if (res) res.innerHTML = "";
      if (btn) { btn.classList.add("hidden"); btn.disabled = true; }
      if (card) { card.innerHTML = ""; card.className = "w2m-town"; }

      const J = judgeFor(c.key, { pos: o.pos });
      const E = window.WingerEngine, M = window.W2Moment;
      /* ⚠️ 엔진이나 미니게임이 아직 안 실렸으면 **중립 판정으로 조용히 넘어갑니다** —
       *    스크립트 하나가 안 왔다고 선수 만들기가 통째로 멈추면 안 돼요. */
      if (!E || !E.judgeAtP || !M || !M.play) { land(i, J.judge(0.5)); return; }
      // 🤖 자동 진행 — ⚔️ 유스 순간 카드와 같은 갈래예요 (중립 s = 0.5)
      if (autoMiniOn()) { land(i, J.judge(0.5)); return; }
      const pool = ((E.MINI || {})[J.kind] || {})[o.pos] || ["oneone"];
      M.play(card, {
        kind: J.kind, moment: pick(pool), condition: TOWN_CONDITION,
        foot: o.foot === "L" ? "L" : "R",   // 🦶 주발이 **첫 30초에** 살아나요 (판정 창 ±25%)
        judge: J.judge,
      }, (r) => land(i, r));
    }

    /* 카드 한 장이 끝난 자리. ⚠️ 여기서 그리는 [다음] 버튼은 **미니게임이 끝나고
     * 620ms 뒤**에 오는 콜백에서 붙습니다 — `pointerdown` 자리에 새 클릭 대상을
     * 그리는 그 이중 탭 함정과는 시점이 떨어져 있어요. */
    function land(i, r) {
      const c = CARDS[i];
      const p = PTS[r] != null ? PTS[r] : 0;
      state.rows.push({ key: c.key, res: r, pts: p });
      state.score += p;
      paint();
      const last = state.rows.length >= CARDS.length;
      if (res) {
        res.innerHTML = `<div class="town-res ${r === "perfect" ? "good" : r === "ok" ? "mid" : "bad"}">`
          + `${r === "perfect" ? "🔥 완벽했어요!" : r === "ok" ? "🙂 나쁘지 않았어요" : "😵 아쉬웠어요"}`
          + ` <b>+${p}</b></div>`
          + (last ? `<div class="town-line">🏘️ 동네 세 판 — <b>${state.score}점</b>. 벤치 끝에서 누가 계속 보고 있었어요.</div>` : "");
      }
      if (btn) {
        btn.textContent = last ? "🏟️ 스카우트를 만나요" : "다음 판";
        btn.classList.remove("hidden");
        btn.disabled = false;
        btn.onclick = () => {
          btn.disabled = true;
          if (!last) { playCard(i + 1); return; }
          state.done = true;
          state.offers = rollOffers(state.score);
          done();
        };
      }
    }

    playCard(0);
  }

  return {
    open,
    played: () => state.done,
    score: () => state.score,
    rows: () => state.rows.slice(),
    offerFor: (id) => (state.offers && state.offers[id])
      || { tier: NEUTRAL_TIER, mul: OFFER[NEUTRAL_TIER].mul, star: OFFER[NEUTRAL_TIER].star,
           label: OFFER[NEUTRAL_TIER].label, word: COLD[NEUTRAL_TIER] },
    /* 🔴 **옛 세이브는 중립 3입니다. `0`이 아니에요** (설계 85번 §6).
     * `0`으로 두면 진행 중인 커리어가 전부 *"동네에서 못한 선수"*로 조용히 내려갑니다 —
     * CLAUDE.md의 *"가중 카운터를 더할 땐 옛 카운터를 이어받으세요"*와 같은 자리예요. */
    scoreOf: (st) => (st && st.townScore != null ? st.townScore : 3),
    reset: () => { state.done = false; state.score = 0; state.rows = []; state.offers = null; },
    /* 🧪 실측·검사 창구. **문턱을 여기서 읽어 가지 마세요** — 상수를 바꿔도 검사가
     * 따라가서 아무것도 안 잡힙니다. 기준값은 검사에 직접 적으세요. */
    _t: { OFFER, SHAKE, CARDS, PTS, NEUTRAL_TIER, rollOffers, judgeFor, evenBody, TOWN_CONDITION },
  };
})();
