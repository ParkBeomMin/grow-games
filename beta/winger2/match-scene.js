/* 🎬 ⚽ 더 윙어 II — 순간 카드 경기 화면 (연출 전용)
 *
 *   window.W2Scene — career.js의 runV2Match가 부르는 이름 그대로예요
 *     mount(host, { home, away, myName, lite })   상단 고정 스코어보드 + 아래 피드를 깝니다
 *       lite  🏫 학교 대항전용 — 90분 경기가 아니라 **한 단계짜리 대항전**이라
 *             🅶🅾🅰🅻 배너 · 🏆 결승골 축포 · 🎉 Fx · ⌨️ 타이핑을 안 붙입니다.
 *             스코어보드 · 시계 · 피드 · 플래시 · 흔들림은 그대로예요.
 *     momentSlot()        → HTMLElement     🔥 내 순간의 미니게임이 들어갈 자리
 *     gen()               → number          🎬 지금 경기의 **세대**. mount()마다 하나씩 올라가요
 *     push(card, gen)     → Promise         카드 1장. 딜레이·타이핑·골 연출이 다 여기 있어요
 *                                           🎬 `gen`을 주면 **그 세대가 아니면 한 글자도 안 씁니다**
 *     summary(result)                       사후 집계 ("이 경기의 내 순간 N회")
 *     fast()                                ⏩ 빨리감기 — **연출만** 짧아집니다
 *     destroy()
 *
 *   🔥 내 순간 카드는 드라이버가 `push(card)`를 **두 번** 부릅니다 —
 *   미니게임을 열 때 한 번, 판정이 끝나고 한 번. 같은 카드 객체가 다시 오면
 *   "이제 결과를 그려라"로 알아듣습니다(openMoment / closeMoment).
 *
 *   킥오프·하프타임·종료 휘슬도 전부 엔진이 카드로 줍니다(kind: "kick"/"half"/"end").
 *   화면이 따로 만들지 않아요 — 양쪽이 만들면 같은 줄이 두 번 뜹니다.
 *
 * ═══ 이 파일이 지키는 것 ═══
 *
 * ① **연출은 결과를 만들지 않습니다.** 골이 들어갔는지·실점했는지는 전부
 *    card.result / card.score가 정해요. 여기서 스코어를 세거나 판정을 뒤집지 않습니다.
 *    미니게임 판정은 그대로 엔진에 넘기고, 엔진이 채운 card.result만 그립니다.
 *
 * ② **밀도의 차이가 긴장을 만듭니다.** 타이핑은 🔥 내 순간 카드에만 붙어요.
 *    전부 타이핑하면 지루해집니다. 카드 간 딜레이도 스코어차로 갈려요
 *    (1점 차 이내 900ms · 3점 차 이상 350ms).
 *
 * ③ **사전에 횟수를 약속하지 않습니다.** 능력치 70의 실제 개입은 경기당 0.72~0.88회라
 *    "경기당 2회"는 거짓말이 됩니다(설계 §5-2). 대신 끝나고 셉니다 —
 *    그 숫자가 늘어나는 것이 성장의 체감이에요.
 *
 * ④ **prefers-reduced-motion을 켜도 정보는 남습니다.** 골 배너·스코어·문구는 DOM에
 *    그대로 있고 움직임만 사라져요. Fx.flash는 reduced에서 통째로 안 뜨니
 *    **정보를 Fx에 맡기지 않습니다** — 배너는 우리가 피드에 직접 그려요.
 *
 * ⑤ 소리는 넣지 않습니다(저장소 전체 오디오 호출 0건 — 무음 기대를 깨지 않아요).
 *    진동은 **우리 골에만 40ms 한 번**. */
"use strict";

window.W2Scene = (() => {
  const reduced = () => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- 🎲 연출 전용 난수 ----------
   * 🔒 **보여주기만 하는 굴림은 판정 난수원을 쓰지 않습니다** (설계 101번 §3-4).
   *    값이 아무 데도 안 가도 **소비량으로 판정에 결합**해요 — `Math.random()`을 쓰면
   *    타이핑 글자 수(=카드 성적에 따라 달라짐)만큼 뒤 카드의 굴림이 밀립니다.
   *    🦶 주발만 뒤집어 견주는 검사(youth-moment B-0)가 실제로 그렇게 갈렸어요.
   * 🔑 그래서 여기서는 **자기 상태만 돌리는 32bit 카운터**를 씁니다 — Math.random도,
   *    엔진의 `_rng`도 한 번도 안 부릅니다. 보이는 것(40~60ms 흔들림)은 그대로예요. */
  let _fx = 0x9e3779b9;
  function fxRnd() {
    _fx = (_fx + 0x6d2b79f5) | 0;
    let t = Math.imul(_fx ^ (_fx >>> 15), 1 | _fx);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let S = null;   // 지금 경기의 상태. mount()가 새로 만듭니다
  let _gen = 0;   // 🎬 경기 세대. mount()마다 하나씩 올라가요 (아래 두 창의 근거입니다)

  /* ══════════════════════════════════════════════════════════════════
   * 🔁 **화면이 갈린 뒤에는 이어서 그리지 않습니다** — 새는 창이 **둘**이에요
   * ══════════════════════════════════════════════════════════════════
   * 딜레이·타이핑을 기다리는 사이에 다음 경기가 `mount()`를 부르면 `S`가 새로 만들어져요.
   * 그때 옛 카드가 이어 그리면 **지난 경기의 줄이 새 피드에 섞입니다.**
   * 🚨 🏫 학교 아크(초→중→고)에서 실제로 났어요 — **초등 마지막 카드가 중등 피드 맨 위에**
   *    떴고, 시계도 60'으로 되돌아갔습니다.
   *
   * | 창 | 언제 갈리나 | 막는 줄 | 지우면 나는 증상 |
   * |---|---|---|---|
   * | ① 들어오기 **전** | `push()`에 닿기 전에 이미 다음 경기가 깔림 | `push` 맨 앞의 `g !== _gen` | 옛 단계 카드가 **새 피드 맨 위에** (⏱️ 30'이 중등 피드에) |
   * | ② 들어온 **뒤** | `await` 도중에 다음 경기가 깔림 | `await` 뒤마다 `alive(my)` | 같은 증상이지만 **줄 중간부터** 섞임 |
   *
   * 🔒 **두 줄은 겹치지 않습니다.** ①은 `push` 진입 시점의 한 번, ②는 그 뒤의 매 `await`.
   *    ①을 지우면 ②가 못 잡고(옛 카드가 새 `S`를 「자기 것」으로 잡아 버려요),
   *    ②를 지우면 ①이 못 잡아요(진입할 땐 세대가 맞았으니까요).
   *    ⚠️ **같은 자리를 두 번 막지 마세요** — 부르는 쪽(`town.js`)에도 세대 확인을 두면
   *    한쪽을 지워도 증상이 0장이라 변이가 아무것도 안 잡습니다. 세대의 소유자는 **여기**예요.
   *    ✍️ **await 뒤에는 반드시 `alive(my)`를 확인하세요**(②). 그리고 카드를 **줄 세워
   *    그리는 쪽**은 `gen()`을 받아 `push(card, g)`로 넘기세요(①) — 🏟️ 프로 경기
   *    (`career.js`의 `runV2Match`)는 아직 안 넘깁니다. 다음 경기가 바로 이어지면 같은 자리예요.
   *
   * 🔬 **재현 방법** — 🚧 **이 자리는 검사가 안 지킵니다**(경합이라 109번에서 「검증 불가」로
   *    분류됐어요. 문턱을 박으면 느린 판에서 아무것도 안 지키고 빠른 판에서 우연으로
   *    빨간불이 떠요). 그래서 재현을 **여기 적어 둡니다** — 다음 사람이 이 자리를 팔 때 쓰세요.
   *    ① `town.js`의 `queue.then(...)` 안, `Scene.push(...)` **앞**에 `await wait(260)`을 심고
   *       (⚠️ 정착을 기다리지 말고 **고정 간격**으로 [다음]을 누르세요. 큐가 다 비면
   *        경합 자체가 안 일어나서 가드를 지워도 초록불입니다)
   *    ② 🏫 학교 아크를 초→중→고로 굴리며 단계마다 `#town-scene .w2-min`을 읽으세요.
   *    초등부(카드 2장)의 분은 **30·60**, 중·고등(3장)은 **23·45·68**이라
   *    **중등 피드의 `30'`이 곧 누수**입니다.
   *    📏 위 ①줄을 지우고 실측(110번): 누르는 간격 40·90·120ms에서 **시드 5/5**,
   *       60ms에서 2/5가 샜고, 줄이 있으면 네 간격 전부 **0/5**입니다. */
  const alive = (my) => S === my;

  /* ---------- 무엇이 걸렸는지 (설계 §5-1) ----------
   * 같은 미니게임이 결정으로도 전개로도 열려요. 결과가 다른 건 괜찮지만
   * **무엇이 걸렸는지 모르는 것이 문제**라, 카드 첫 줄이 반드시 그걸 밝힙니다. */
  /* 엔진(engine.js stakeOf)이 `stakeKey`를 함께 줍니다 — 화면이 한국어 문자열을
   * 비교하지 않게 하려고 engineer가 낸 코드예요. 그걸 먼저 보고, 없으면 `stake`(한국어),
   * 그것도 없으면 스코어차로 만듭니다. */
  const STAKE_TAIL = {
    comeback: "한 점이라도 따라갑니다",
    equalize: "동점입니다",
    lead: "앞서 나갑니다",
    clincher: "쐐기를 박습니다",
    holdBig: "추격을 끊습니다",
    holdLead: "리드를 지킵니다",
    holdDraw: "균형을 지킵니다",
    holdGap: "더 벌어지는 걸 막습니다",
  };
  /* stakeKey가 없으면 그 시점 스코어차로 만듭니다. 엔진이 주는 쪽이 정확해요
   * (엔진은 이미 그 값을 갖고 있고, 화면이 추측하면 카드가 뒤집힐 때 틀립니다). */
  function fallbackTail(kind, d) {
    if (kind === "defend") return d >= 1 ? "리드를 지킵니다" : d === 0 ? "균형을 지킵니다" : "더 벌어지는 걸 막습니다";
    if (d === -1) return "동점입니다";
    if (d <= -2) return "한 점이라도 따라갑니다";
    return "앞서 나갑니다";
  }
  function stakeLine(card) {
    const d = (card.score ? card.score[0] - card.score[1] : S.h - S.a);
    /* stake(한국어)를 그대로 이어 붙이지 않습니다 — "만회입니다"처럼 어색해져요.
     * 코드(stakeKey)로 문장을 고르거나, 없으면 스코어차로 만듭니다. */
    const tail = STAKE_TAIL[card.stakeKey] || fallbackTail(card.kind, d);
    if (card.kind === "defend") return `🧱 상대 에이스가 달려듭니다 — 여기서 막으면 ${tail}`;
    if (card.kind === "assist") return `🎯 동료가 뒷공간으로 뛰어요 — 이 패스가 통하면 ${tail}`;
    return `🔥 골문 앞! 이걸 넣으면 ${tail}`;
  }

  /* ---------- 카드 결과 문구 ----------
   * card.result는 **엔진이 정한 값**이에요. 여기서 만들지 않습니다. */
  function resultLine(card) {
    // 엔진이 goalBy(넣은 사람) · assistBy(찔러 준 사람)를 따로 줍니다
    const me = esc(card.by || S.myName);
    const scorer = esc(card.goalBy || card.by || S.myName);
    const passer = esc(card.assistBy || card.by || S.myName);
    switch (card.result) {
      case "goal": return `⚽ 골!! ${scorer}, 그물을 흔듭니다!`;
      case "assist": return `🅰️ ${passer}의 침투 패스! ${scorer}가 마무리합니다!`;
      case "shot": return `🎯 슛! 골키퍼 정면… 아쉽습니다`;
      case "save": return `🧱 막아냅니다! 위기를 지웠어요`;
      case "concede": return `😣 뚫렸어요… 실점`;
      default: return card.kind === "defend" ? "🧱 걷어냅니다" : "😖 기회가 날아갔어요";
    }
  }

  /* ---------- 딜레이 (설계 §5-5) ----------
   * 0-0이나 1점 차면 뜸을 들이고, 3점 차면 빠르게 넘겨요. setTimeout 값 하나가 서스펜스입니다. */
  function delayOf() {
    if (S.fast) return 90;
    const d = Math.abs(S.h - S.a);
    return d <= 1 ? 900 : d === 2 ? 600 : 350;
  }

  /* ---------- 조각 만들기 ---------- */
  function el(cls, html) {
    const d = document.createElement("div");
    d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function add(node) {
    /* 미니게임 자리는 언제나 피드의 맨 아래예요 — 카드는 그 위에 쌓입니다.
     * 드라이버가 momentSlot()을 push()보다 먼저 부르기 때문에 이 순서가 필요해요. */
    if (S.slot && S.slot.parentNode === S.feed) S.feed.insertBefore(node, S.slot);
    else S.feed.appendChild(node);
    // 새 카드가 화면 밖으로 나가면 push-in을 못 봐요
    try { node.scrollIntoView({ block: "nearest", behavior: S.fast ? "auto" : "smooth" }); } catch { /* 안 되는 브라우저도 있어요 */ }
    return node;
  }

  /* ---------- 스코어 ----------
   * card.score를 **그대로** 씁니다. 화면이 따로 누적하면 엔진과 어긋나요. */
  function setScore(score) {
    if (!Array.isArray(score)) return false;
    const [h, a] = score;
    const changed = h !== S.h || a !== S.a;
    S.h = h; S.a = a;
    S.scoreEl.innerHTML = `<b>${h}</b><i>:</i><b>${a}</b>`;
    if (changed && !reduced()) {
      S.scoreEl.classList.remove("bump"); void S.scoreEl.offsetWidth;
      S.scoreEl.classList.add("bump");
    }
    return changed;
  }
  function setClock(min) {
    if (min == null) return;
    S.clockEl.textContent = min > 90 ? `⏱ 90+${min - 90}'` : `⏱ ${min}'`;
  }
  const SIDE = { goal: "atk", assist: "atk", defend: "def", filler: "mid" };
  function setFlow(card) {
    const side = card.result === "concede" ? "def" : (SIDE[card.kind] || "mid");
    // transform만 움직여요 — left를 애니메이션하면 매 프레임 레이아웃을 다시 돌립니다
    S.flowEl.style.transform = `translateX(${side === "atk" ? 194 : side === "def" ? 0 : 97}%)`;
    S.flowEl.classList.toggle("def", side === "def");
  }

  /* ---------- 타이핑 (순간 카드만) ---------- */
  async function type(body, text) {
    /* 🏫 lite(학교)는 타이핑을 안 붙입니다 — 카드가 여덟 장이라 단계마다 몇 초씩 붙어요.
     * 밀도의 차이(②)는 프로 경기의 것이고, 학교는 카드 **전부가** 🔥 내 순간입니다. */
    if (S.fast || S.lite || reduced()) { body.textContent = text; return; }
    const card = body.parentNode;
    card.classList.add("w2-typing");
    body.textContent = "";
    for (let i = 0; i < text.length; i++) {
      body.textContent += text[i];
      await wait(40 + fxRnd() * 20);               // 40~60ms/자 — 🔒 연출 전용 난수원
    }
    card.classList.remove("w2-typing");
  }

  /* ---------- 골 연출 (설계 §5-4) ----------
   * kind: "mine" | "mate" | "concede" | "decisive"
   * ⚠️ 여기서 스코어를 건드리지 않습니다. 그리기만 해요. */
  function goalFx(kind) {
    const soft = kind === "mate";
    if (!reduced()) {
      const f = el("w2-flash" + (soft ? " mate" : kind === "concede" ? " bad" : ""));
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 500);
      if (!soft) {
        const shake = kind === "concede" ? "shake-x" : "shake";
        S.root.classList.remove("shake", "shake-x"); void S.root.offsetWidth;
        S.root.classList.add(shake);
        setTimeout(() => S.root.classList.remove(shake), 400);
      }
    }
    /* Fx는 **장식만** 맡깁니다 — reduced에서 통째로 안 떠도 정보가 안 사라지게요.
     * 🏫 lite에서는 통째로 안 부릅니다. 축포가 학교에 안 어울리기도 하지만,
     * 🔴 **`Fx.burst`가 입자마다 `Math.random()`을 씁니다** — 골이 들어갔을 때만 부르면
     *    난수 소비량이 카드 성적을 타서 뒤 카드 순서가 어긋나요(위 fxRnd 주석). */
    if (window.Fx && !S.lite) {
      if (kind === "mine" || kind === "decisive") Fx.burst(S.topEl, "⚽", 14);
      if (kind === "decisive") Fx.confetti({ level: "big", emojis: ["🏆", "⚽", "✨"] });
    }
    // 진동은 우리 골에만 40ms 한 번. 실점·동료 골에는 안 울려요
    if (kind === "mine" || kind === "decisive") {
      try { if (navigator.vibrate) navigator.vibrate(40); } catch { /* 지원 안 하는 기기 */ }
    }
  }

  /* 🅶🅾🅰🅻 배너 — **내 골에만** 붙입니다.
   * 동료 골·실점에도 배너를 달았더니 바로 위 카드와 같은 말을 두 번 하게 됐어요
   *   27'  ⚽ 골!! 박스트, 그물을 흔듭니다!
   *        ⚽ 박스트의 골!          ← 같은 말
   * 설계 §5-4도 동료 골은 "플래시만 (약하게)", 실점은 "회색 플래시 + 흔들림"이에요.
   * 그쪽 정보는 카드 문구가 이미 담고 있어서 reduced-motion에서도 안 사라집니다. */
  function banner(text) {
    add(el("w2-goal", esc(text)));
  }

  /* 🏆 결승골 — 엔진의 markDecisive()가 **`end` 카드를 내기 직전에** 이미 그린 카드
   * 객체를 되채웁니다(engine.js `next()`). 그래서 기억해 둔 내 골 카드를 다시 보면
   * 알 수 있어요 — 드라이버가 따로 뭘 넘기지 않아도 됩니다.
   * 카드가 열리는 순간에 터뜨리면 안 돼요: 1-0 뒤에 2-2가 되면 결승골이 아니거든요. */
  function celebrateDecisive() {
    if (S.lite || S.decisiveDone) return;   // 🏫 학교엔 결승골이 없어요 (단계 하나짜리 대항전)
    const hit = S.myGoals.some((c) => c.decisive);
    if (!hit) return;
    S.decisiveDone = true;
    add(el("w2-goal", "🏆 결승골!!"));
    if (window.Fx) Fx.confetti({ level: "big", emojis: ["🏆", "⚽", "✨"] });
    if (!reduced()) {
      const f = el("w2-flash");
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 500);
    }
  }

  /* 🔴 `decisive`(결승골)는 **경기가 끝나야 정해집니다** — engine.js의 markDecisive()가
   * 마지막에 채워요. 그래서 카드가 열리는 순간에는 아직 false입니다.
   * 그 순간 쓸 수 있는 건 `goAhead`(이 골로 앞서 나갔나)뿐이에요. 결승골 축포는
   * 휘슬 뒤 tally()에서 터뜨립니다 — 그게 정직합니다. */
  function bannerText(card) {
    if (card.decisive) return "🏆 결승골!!";
    if (card.result === "assist") return "🅰️ 도움!!";
    if (card.goAhead) return "⚽ 앞서 나갑니다!!";
    return "⚽ G O A L !!";
  }

  /* 카드가 무슨 연출을 부르는지 — card.result 하나만 봅니다 */
  function fxOf(card) {
    if (card.result === "concede") return "concede";
    if (card.result !== "goal" && card.result !== "assist") return null;
    // 내 골·내 도움은 기억해 둬요 — 결승골인지는 휘슬 때 이 카드로 되짚습니다
    if (card.mine && S.myGoals.indexOf(card) < 0) S.myGoals.push(card);
    if (card.decisive) return "decisive";
    return card.mine ? "mine" : "mate";
  }

  /* ---------- 공개 API ---------- */
  function mount(host, cfg) {
    const c = cfg || {};
    /* 🎬 세대를 올립니다 — 옛 세대가 남긴 그리기는 이 순간 전부 무효가 돼요.
     *    (그걸 실제로 막는 줄은 `push` 맨 앞입니다. 위 표 참고) */
    _gen += 1;
    host.innerHTML = `
      <div class="w2-scene">
        <div class="w2-top">
          <div class="w2-row">
            <span class="w2-team home">${esc(c.home || "우리 팀")}</span>
            <span class="w2-score"><b>0</b><i>:</i><b>0</b></span>
            <span class="w2-team away">${esc(c.away || "상대")}</span>
          </div>
          <div class="w2-meta">
            <span class="w2-clock">⏱ 0'</span>
            <span class="w2-mine-count" hidden></span>
          </div>
          <div class="w2-flow"><span class="w2-flow-mark"></span></div>
        </div>
        <div class="w2-feed"></div>
      </div>`;
    const q = (s) => host.querySelector(s);
    S = {
      root: q(".w2-scene"), topEl: q(".w2-top"), scoreEl: q(".w2-score"),
      clockEl: q(".w2-clock"), mineEl: q(".w2-mine-count"),
      flowEl: q(".w2-flow-mark"), feed: q(".w2-feed"),
      h: 0, a: 0, mine: 0, fast: false, lite: !!c.lite, myName: c.myName || "나",
      slot: null, pending: null, myGoals: [],
    };
    /* 킥오프 줄을 여기서 만들지 않습니다 — 엔진이 `kind: "kick"` 카드로 줘요.
     * 양쪽이 다 만들었더니 "킥오프!" 다음 줄에 "경기가 시작됩니다"가 또 떴습니다. */
    return S.root;
  }

  /* 카드 1장. mine 카드는 push()로 열지 않고 openMoment()/closeMoment()를 씁니다.
   *
   * 🎬 `g`는 부르는 쪽이 `gen()`으로 받아 둔 **그때의 세대**예요. 안 주면(프로 경기처럼
   *    카드를 한 장씩 순서대로 그리는 갈래) 예전 그대로 돕니다 — 읽는 쪽 기본값입니다. */
  async function push(card, g) {
    /* 🎬 **끄는 줄** — 세대가 갈렸으면 여기서 한 글자도 안 씁니다 (위 표 ①). */
    if (g != null && g !== _gen) return;
    if (!S || !card) return;
    const my = S;
    /* 🔥 내 순간 카드는 드라이버가 두 번 부릅니다 (위 머리말).
     *   1) 판정 전 — 무엇이 걸렸는지 + 미니게임 자리
     *   2) 판정 뒤 — 결과 줄 + 골 연출
     * 미니게임이 아직 없어 자동 판정으로 온 카드는 한 번에 두 줄을 이어 그려요. */
    if (card.mine) {
      if (S.pending === card) return closeMoment(card);
      if (card.judge == null) return openMoment(card);
      await openMoment(card);
      if (!alive(my)) return;
      return closeMoment(card);
    }
    await wait(delayOf());
    if (!alive(my)) return;
    setClock(card.min);
    setFlow(card);

    if (card.kind === "half") {
      /* 세 값이 다 없으면 "점유 —% · 슛 —"처럼 빈 칸을 늘어놓지 않아요.
       * 모르는 걸 자리만 잡아 두면 화면이 고장 난 것처럼 보입니다. */
      const bits = [];
      if (card.poss != null) bits.push(`점유 <b>${esc(card.poss)}%</b>`);
      if (card.shots != null) bits.push(`슛 <b>${esc(card.shots)}</b>`);
      if (card.rating != null) bits.push(`내 평점 <b>${esc(Number(card.rating).toFixed(1))}</b>`);
      add(el("w2-half", "🥅 하프타임" + (bits.length ? " · " + bits.join(" · ") : "")));
      setScore(card.score);
      return;
    }

    const changed = setScore(card.score);
    const fx = fxOf(card);
    const cls = card.result === "goal" || card.result === "assist" || card.result === "save" ? "good"
      : card.result === "concede" ? "bad"
        : (card.kind === "filler" || card.kind === "kick" || card.kind === "end") ? "filler" : "";
    const min = card.min > 90 ? `90+${card.min - 90}'` : `${card.min == null ? "" : card.min}'`;
    add(el("w2-card " + cls,
      `<span class="w2-min">${esc(min)}</span><span class="w2-body">${esc(card.text || resultLine(card))}</span>`));

    if (fx) {
      if (!S.lite && (fx === "mine" || fx === "decisive")) banner(bannerText(card));
      goalFx(fx);
      if (!S.fast && !reduced()) await wait(320);
    } else if (card.kind === "end") {
      celebrateDecisive();
    } else if (changed && !S.fast) {
      await wait(150);
    }
  }

  /* 🔥 미니게임이 들어갈 자리. 드라이버가 `push()`보다 **먼저** 부릅니다 —
   * 그래서 여기서 만들어 두고, 카드는 add()가 이 위에 끼워 넣어요. */
  function momentSlot() {
    if (!S) return null;
    if (!S.slot || S.slot.parentNode !== S.feed) { S.slot = el("w2-moment"); S.feed.appendChild(S.slot); }
    return S.slot;
  }

  /* 🔥 내 순간 — 첫 줄에 무엇이 걸렸는지 밝히고, 미니게임 자리를 돌려줍니다.
   * 미니게임은 엔진이 그 자리에 띄우고, 판정을 **엔진에** 넘깁니다. */
  async function openMoment(card) {
    if (!S) return null;
    const my = S;
    await wait(delayOf());
    if (!alive(my)) return null;
    setClock(card.min);
    setFlow(card);
    setScore(card.score);
    S.pending = card;
    S.mine += 1;
    /* 🏫 lite(학교)에서는 안 셉니다 — **카드가 전부 내 순간**이라 "2판 중 내 순간 2회"가
     * 아무 말도 안 해요. 프로 경기에서만 뜻이 있는 숫자입니다(설계 §5-2). */
    if (!S.lite) {
      S.mineEl.hidden = false;
      S.mineEl.textContent = `🔥 내 순간 ${S.mine}회`;
    }

    const c = add(el("w2-card mine",
      `<span class="w2-min">${esc(card.min > 90 ? `90+${card.min - 90}'` : card.min + "'")}</span><span class="w2-body"></span>`));
    await type(c.querySelector(".w2-body"), stakeLine(card));
    if (!alive(my)) return null;

    return momentSlot();
  }

  /* 판정 뒤. **card.result는 엔진이 이미 채워 둔 값**이어야 합니다. */
  async function closeMoment(card) {
    if (!S) return;
    const my = S;
    S.pending = null;
    if (S.slot) { S.slot.remove(); S.slot = null; }
    setScore(card.score);
    const cls = card.result === "goal" || card.result === "assist" || card.result === "save" ? "good"
      : card.result === "concede" ? "bad" : "";
    add(el("w2-card " + cls,
      `<span class="w2-min">${esc(card.min > 90 ? `90+${card.min - 90}'` : card.min + "'")}</span><span class="w2-body">${esc(card.text || resultLine(card))}</span>`));
    const fx = fxOf(card);
    if (fx) {
      if (!S.lite && (fx === "mine" || fx === "decisive")) banner(bannerText(card));
      goalFx(fx);
      if (!S.fast && !reduced()) await wait(320);
      if (!alive(my)) return;
    }
  }

  /* 사후 집계. **경기 전에 횟수를 약속하지 않는 대신 여기서 셉니다** (설계 §5-2).
   * 0회도 정상이에요 — 능력치 70이면 경기당 0.72~0.88회라 안 올 수 있습니다. */
  function summary(info) {
    if (!S) return;
    celebrateDecisive();                            // end 카드를 안 거친 호출자도 있어요
    const n = (info && info.mineCards) || 0;
    const m = (info && info.mineSuccess) || 0;
    add(el("w2-tally", n === 0
      ? "🔥 이 경기엔 내 순간이 오지 않았어요 — 능력치가 오르면 더 자주 옵니다"
      : `🔥 이 경기의 내 순간 <b>${n}회</b> (성공 <b>${m}</b>)`));
  }

  /* ⏩ 빨리감기 — **연출만** 짧아집니다. 순간 카드는 그대로 열려요.
   * 개입을 확률 굴림으로 대체하면 게임이 사라집니다(현행 더 윙어가 그랬어요). */
  function fast() { if (S) S.fast = true; }
  const isFast = () => !!(S && S.fast);
  function destroy() { S = null; }

  /* tally는 summary의 옛 이름이에요 — 확인 페이지가 아직 쓰고 있어서 남깁니다 */
  return { mount, momentSlot, push, openMoment, closeMoment, summary, tally: summary,
           gen: () => _gen, fast, isFast, destroy };
})();
