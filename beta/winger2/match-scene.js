/* 🎬 ⚽ 더 윙어 II — 순간 카드 경기 화면 (연출 전용)
 *
 *   window.W2Scene — 1막 드라이버(`live.js`의 `WingerLive.play`)가 부르는 이름 그대로예요(25번 계약 2)
 *     mount(host, { home, away, myName, chibi, promiseLine, scout, pos })
 *                                          상단 고정 스코어보드 + 판 + 아래 피드를 깝니다
 *       chibi        🧸 내 치비 그림 경로(`Art.chibi(who, "base")`) — 판의 「나」 말이 되고,
 *                    결과 줄에서 같은 이름표의 `-chibi-score` · `-block` · `-down`으로 바뀝니다(12번 §9-4).
 *                    없거나 못 받으면 **예전의 앰버 원**으로 물러서요 — 깨진 그림 금지
 *       promiseLine  📋 이번 경기에 걸린 약속 한 줄 또는 null — 스코어보드 안, 경기 내내 보여요
 *       scout        🧑‍💼 공개 테스트면 `Art.src("scout", "interest")` · 아니면 null — 피드 맨 위(킥오프 위)
 *       pos          (선택) "fw"·"wg"·"mf"·"df" — 판에서 「나」 말이 서는 집 자리. 없으면 윙어 자리
 *     momentSlot()        → HTMLElement     🔥 내 순간의 미니게임이 들어갈 자리
 *     gen()               → number          🎬 지금 경기의 **세대**. mount()마다 하나씩 올라가요
 *     push(card, gen)     → Promise         카드 1장. 딜레이·타이핑·골 연출이 다 여기 있어요
 *                                           🎬 `gen`을 주면 **그 세대가 아니면 한 글자도 안 씁니다**
 *     clock(min, gen)     → boolean         ⏱️ **시계 한 칸.** 드라이버(`live.js`)의 시계 루프가 1분마다 부릅니다
 *                                           🎬 세대가 갈렸으면 **`false`** — 부르는 쪽이 루프를 끊어요
 *     summary(result)                       사후 집계 ("이 경기의 내 순간 N회")
 *     fast()                                ⏩ 빨리감기 — **연출만** 짧아집니다
 *     isFast()            → boolean         ⏩가 걸렸나 (드라이버의 시계 간격이 봅니다)
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
 *    🌊 그리고 **읽는 줄(흐름·킥오프·종료)은 `FLOW_MS`로 더 짧게** 갑니다 — 뜸을 들일
 *    반전이 없는 자리라서요. 🥅 하프타임은 스코어보드가 갱신되니 뜸을 그대로 들여요.
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
 *    진동은 **우리 골에만 40ms 한 번**.
 * ⑥ 🧸 **치비도 `card.result`만 읽습니다**(감사 11번 §7-2 #15) — 굴림 0 · 판정 난수원 0.
 *    그림 파일을 못 받아도 판정 · 스코어 · 문구는 한 글자도 안 바뀝니다(그림은 장식이에요).
 *
 * 🕰️ 옛 `lite`(🏫 학교 대항전) 갈래는 지웠습니다 — 1막에는 학교 아크가 없어요(25번 §2 「`lite` 정리」). */
"use strict";

window.W2Scene = (() => {
  /* 🎞️ 움직임 줄이기 = 기기 설정 **또는** 게임 설정 `still` · 📳 진동 = 게임 설정 `buzz`(기본 켜짐)
   *    — 29번 §4-1 · 38번 §6 14-a. 설정은 `W2Game.settings.on`으로만 읽어요(localStorage를 직접 안 봄) */
  const setting = (k, dflt) => {
    try { const G = window.W2Game && window.W2Game.settings; return G && typeof G.on === "function" ? !!G.on(k) : dflt; } catch { return dflt; }
  };
  const reduced = () => {
    try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true; } catch { /* 옛 브라우저 */ }
    return setting("still", false);
  };
  const buzz = (ms) => {
    if (!setting("buzz", true)) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* 지원 안 하는 기기 */ }
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
  /* 🔬 **검사 전용 계수기** — `push`가 세대 불일치로 되돌아간 횟수예요 (`_t.drops()`).
   * 🔒 **누적입니다. `mount()`도 `destroy()`도 0으로 안 되돌립니다** — 단조 증가예요.
   *    단계마다 지우면 **아크가 끝난 뒤에 읽는 검사가 늘 0**을 봅니다(마지막 단계
   *    뒤에는 버릴 게 없으니까요). 「경합이 실제로 있었나」는 **아크 전체의 사실**이라
   *    그걸 그대로 셉니다. 창을 좁혀 보고 싶으면 **읽고 빼세요**(읽는 쪽에서 차분).
   * 🔴 **게임 로직은 이 값을 읽지 않습니다.** 화면에도 안 씁니다 — 읽는 순간
   *    연출이 경합 결과를 타게 되고, 그게 이 파일이 지키는 ①(연출은 결과를 안 만든다)입니다. */
  let _drops = 0;

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
   *    ⚠️ **같은 자리를 두 번 막지 마세요** — 부르는 쪽(드라이버 `live.js` — 옛 `town.js`)에도 세대 확인을 두면
   *    한쪽을 지워도 증상이 0장이라 변이가 아무것도 안 잡습니다. 세대의 소유자는 **여기**예요.
   *    ✍️ **await 뒤에는 반드시 `alive(my)`를 확인하세요**(②). 그리고 카드를 **줄 세워
   *    그리는 쪽**은 `gen()`을 받아 `push(card, g)`로 넘기세요(①) — 🏟️ 프로 경기
   *    (옛 `career.js`의 `runV2Match`)는 안 넘겼어요 — 🏆 대회 주간처럼 경기가 연달아 이어지면 같은 자리라
   *    1막 드라이버는 **반드시 넘깁니다**(12번 §8-1).
   *
   * 🔬 **재현 방법** — 🚧 **이 자리는 검사가 안 지킵니다**(경합이라 109번에서 「검증 불가」로
   *    분류됐어요. 문턱을 박으면 느린 판에서 아무것도 안 지키고 빠른 판에서 우연으로
   *    빨간불이 떠요). 그래서 재현을 **여기 적어 둡니다** — 다음 사람이 이 자리를 팔 때 쓰세요.
   *    (🕰️ 아래는 옛 `town.js` 🏫 학교 아크에서 잰 것이에요. 1막에서 같은 자리는 🏆 대회 주간의
   *     연속 경기 — 드라이버의 그리기 줄 안, `push` **앞**에 지연을 심어 같은 방법으로 봅니다)
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
    /* 🔒 **평문**을 돌려줍니다 — 그리는 쪽이 `textContent`로 넣어요(아래 `line`).
     * 🐛 예전엔 여기서 이름을 `esc()`하고, 그리는 쪽이 문장을 **또** `esc()`해서 이름에 `&` · `<`가 있으면
     *    「&amp;」가 그대로 보였어요(이중 이스케이프). 사용자 글자는 한 자리(`textContent`)에서만 씻깁니다(25번 §6). */
    const me = card.by || S.myName;
    const scorer = card.goalBy || card.by || S.myName;
    const passer = card.assistBy || card.by || S.myName;
    switch (card.result) {
      case "goal": return `⚽ 골!! ${scorer}, 그물을 흔듭니다!`;
      case "assist": return `🅰️ ${passer}의 침투 패스! ${scorer}가 마무리합니다!`;
      case "shot": return `🎯 슛! 골키퍼 정면… 아쉽습니다`;
      case "save": return `🧱 막아냅니다! 위기를 지웠어요`;
      case "concede": return `😣 뚫렸어요… 실점`;
      default: return card.kind === "defend" ? "🧱 걷어냅니다" : "😖 기회가 날아갔어요";
    }
  }

  /* ⏱️ **흐름 줄이 화면에 서 있는 최소 시간** — 🔒 **종속값입니다. 손잡이가 아니에요.**
   *    바닥은 **점이 다 서는 데 걸리는 514ms**입니다 (`style.css`의 `.w2-slot` `transition .42s`
   *    + 이 파일이 인라인으로 거는 최대 `transition-delay` 78ms = 계산 498 · 브라우저 실측 514
   *    · 설계 145번 §11). 620 = 514 + 106 (여유 21%).
   * 🔴 `.w2-slot`의 `transition`이 바뀌면 **여기도 따라 재계산**하세요 — 세기를 여기서 잡지 말고,
   *    거꾸로 바닥을 낮추려고 `.w2-slot`을 줄이지도 마세요(그건 점이 미끄러지는 걸 보여 주는 축이에요).
   * 🔑 결정 줄 900ms와 **31% 벌어져** 리듬이 갈립니다 (900 대 780은 13%라 사람 눈에 안 갈려요).
   *    ⚽ 더 윙어 1의 `MatchSim`은 780ms인데 더 짧게 잡는 이유는, 윙어1이 **한 줄씩** 흘리는 데 비해
   *    🏫 학교는 카드 사이에 **2~3줄을 뭉쳐서** 흘리기 때문입니다. */
  const FLOW_MS = 620;

  /* ---------- 딜레이 (설계 §5-5 · 149번 §4-1) ----------
   * 0-0이나 1점 차면 뜸을 들이고, 3점 차면 빠르게 넘겨요. setTimeout 값 하나가 서스펜스입니다.
   * 🌊 다만 **읽는 줄(흐름·킥오프·종료)은 뜸을 들일 반전이 없어서** `FLOW_MS`로 짧게 갑니다.
   *    🥅 하프타임은 **여기 안 넣습니다** — 스코어보드가 갱신되는 자리라 그 순간만은 뜸을 들여요.
   *    🔥 순간 카드 열기/닫기도 그대로 — 결정과 반전의 자리입니다.
   * 🔒 `Math.min`인 이유: 3점 차(350ms)에서 흐름 줄만 620으로 **느려지면 거꾸로**예요.
   *    흐름 줄은 결정 줄보다 **절대 느리지 않습니다.** */
  function delayOf(card) {
    if (S.fast) return 90;
    const d = Math.abs(S.h - S.a);
    const base = d <= 1 ? 900 : d === 2 ? 600 : 350;
    const flowish = !!card && (card.kind === "filler" || card.kind === "kick" || card.kind === "end");
    return flowish ? Math.min(FLOW_MS, base) : base;
  }

  /* ---------- 조각 만들기 ---------- */
  function el(cls, html) {
    const d = document.createElement("div");
    d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  /* 받은 글자는 `textContent`로만 — 카드 한 줄 = 분 + 본문 */
  function txt(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    e.textContent = text == null ? "" : String(text);
    return e;
  }
  function lineCard(cls, min, text) {
    const d = el(`w2-card ${cls}`.trim());
    d.append(txt("span", "w2-min", min), txt("span", "w2-body", text));
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
  /* ══════════════════════════════════════════════════════════════════
   * 🟩 **축구판** — 카드를 **따라가는 그림**입니다 (경기를 만들지 않아요)
   * ══════════════════════════════════════════════════════════════════
   * 🔴 원칙 ①의 자리입니다. 동그라미와 공은 **`card.kind`/`card.result`가 정한 자리로
   *    갑니다.** 공이 우리 골대로 갔으니 실점이 아니라, **실점 카드가 왔으니 공이
   *    거기 있는** 거예요. 여기서 굴리는 것도, 세는 것도, 뒤집는 것도 없습니다.
   *
   * ⏱️ **`dt`도 `requestAnimationFrame`도 안 씁니다.** 움직임은 전부 CSS `transition`이라
   *    하네스의 가짜 시계(`cb(0)`)에서도 **얼어붙을 게 없어요** — 자리는 언제나 인라인
   *    `transform`에 적혀 있고, 검사는 그 값을 그대로 읽습니다.
   *    (CLAUDE.md 열두째 유형 — `raf-test.js`가 지키는 그 함정입니다.)
   *
   * 🖼️ **판은 `mount()`에서 한 번만 그립니다.** 카드마다 다시 그리면 피드가 길어질수록
   *    느려져요. 카드마다 바뀌는 건 **클래스 두 개와 `transform` 하나**뿐입니다.
   *
   * ♿ **색으로만 가르지 않습니다** — 완전 흑백에서도 갈려야 해요:
   *      우리 편 = 꽉 찬 작은 원 · 상대 = **속 빈** 원(테두리만) · 나 = **가장 큰 원 + 바깥 링**
   *    공은 유일하게 **흰 핵**을 갖고 **혼자 움직입니다.**
   * ♿ 판은 `aria-hidden`이에요 — **같은 정보를 피드가 글로 이미 말합니다.**
   *    낭독에 두 번 읽히면 중계가 두 겹으로 들려요. */

  /* 🧍 포메이션 — 판 **폭·높이의 %**. x 0 = 우리 골라인 · 100 = 상대 골라인.
   * 🔒 4-4-2를 다 그리지 않습니다. 320px에서 22개가 서면 점이 서로 붙어 죽이 돼요.
   *    한 줄에 하나씩만 세워 **누가 앞이고 누가 뒤인지**만 읽히게 했습니다. */
  /* 🐛 **골키퍼가 판 밖으로 나갔습니다** — 렌더로만 보인 흠이에요(390·320 실측).
   *    처음엔 `gk`가 x 7%였는데 `push-h`(우리 진영으로 밀림)가 −9%라 **−2%**가 되어,
   *    390px에서 왼쪽 −10.3 ~ −1.3px — **통째로 잘렸습니다**. 하필 실점 카드마다요:
   *    🔴 **키퍼가 가장 필요한 순간에만 사라지는** 그림이었어요.
   *    🔒 그래서 골키퍼는 **밀림폭보다 안쪽**에 세웁니다 (10% > 7%). 밀림을 키우려면
   *       `style.css`의 `push-*`와 여기를 **같이** 보세요 — 둘이 한 쌍입니다. */
  const FORM_H = [[10, 50, " gk"], [24, 25, ""], [24, 75, ""], [42, 50, ""], [63, 27, ""]];
  const FORM_A = [[90, 50, " gk"], [77, 27, ""], [77, 73, ""], [58, 50, ""], [37, 67, ""]];
  /* 🧡 나 — **포지션마다 집 자리**가 다릅니다(1막은 넷 — 결정 4). [x, y, 역할]
   * 🐛 옛 II는 윙어 하나라 [64, 76] 한 자리였어요. 그대로 두면 🧱 수비수의 말이 상대 진영에 서서
   *    **우리 박스의 🧱 순간에 나만 멀리 있는** 그림이 됩니다 — 판이 카드를 따라간다는 약속이 깨져요.
   * 📏 자리는 우리 · 상대 점과 **흐름(±7%)으로 밀려도** 반지름 합(말 12px + 점 4.5px)보다 떨어지게 골랐어요
   *    (320px 판 기준 어림 — 👁️ 렌더로 한 번 더 봄). 역할은 라인 계수(`LINE` · `PULL`)를 고릅니다.
   * 🔒 드라이버가 `pos`를 안 주면 윙어 자리 — 옛 판과 한 픽셀도 다르지 않아요. */
  const ME_AT = { fw: [72, 46, "fwd"], wg: [64, 76, "wing"], mf: [48, 36, "mid"], df: [30, 40, "def"] };

  /* ══════════════════════════════════════════════════════════════════
   * 🏃 **점마다 다른 자리로 갑니다** — 대형이 통째로 미끄러지면 «뛴다»로 안 보여요
   * ══════════════════════════════════════════════════════════════════
   * 🕰️ 여기 있던 것은 **겹 하나를 `translateX(±7%)`로 통째로 미는 것**이었습니다.
   *    정직했지만 *"대형이 미끄러진다"*로 보이지 *"선수들이 뛴다"*로는 안 보였어요.
   * 🔑 그래서 한 점의 자리를 **둘의 합**으로 다시 짰습니다:
   *
   *      인라인 `left`/`top`(집 자리)  +  `.w2-slot`의 인라인 `transform`(어긋남 — 여기)
   *
   *    🔒 둘 다 **숫자로 적혀 있습니다** — 검사가 `left`와 인라인 `transform`을 더하면
   *       그 점이 판 안에 있는지 산수로 나옵니다.
   *
   * 🐛 **팀 밀림(±7%/±4%)이 예전엔 `.w2-side`의 CSS `translateX`였는데, 여기로 옮겼습니다.**
   *    ⚽ **공은 `.w2-side` 밖**이라 그 밀림을 안 탔어요. 그래서 「점이 공에서 얼마나 먼가」를
   *    재는 이 함수와 실제 화면이 **7%씩 어긋난 다른 좌표계**였습니다 —
   *    320px 렌더에서 **우리 중원이 공 위에 정확히 포개졌어요**(−7.3px).
   *    🔒 **두 좌표계를 하나로 합칩니다.** 밀림도 어긋남도 전부 이 함수가 냅니다.
   *    ⚠️ 그래서 `style.css`에는 `.w2-side`를 미는 규칙이 **없습니다.** 되살리면 두 번 밀려요.
   *
   * ⏱️ **`dt`도 `requestAnimationFrame`도 안 씁니다.** 어긋남은 카드 한 장에 **한 번**
   *    계산해서 인라인 `transform`에 적고, 미끄러지는 일은 CSS `transition`이 합니다.
   *    가짜 시계(`cb(0)`)에서도 얼어붙을 게 없어요.
   *
   * 🔴 **여전히 결과를 만들지 않습니다.** 점이 어디 서든 골이 되지 않아요 —
   *    입력은 «공이 어디 있나»(위 표가 정한 값)와 «흐름이 어느 쪽인가»뿐입니다.
   *
   * 🎲 굴림은 **`fxRnd`만** 씁니다(판정 난수원도 `Math.random()`도 아니에요).
   *    개수는 **역할만 보고 정해집니다** — 🧤 키퍼 1번 · 필드 2번. `if` 안에서 부르는 굴림이
   *    하나도 없어요. 그래서 `setPitch` 한 번이 언제나 **정확히 22번**입니다(아래 그 자리). */

  /* 🧍 역할 — `FORM_H`/`FORM_A`와 **자리가 같은** 배열이에요.
   * 🔒 표 안에 넣지 않은 이유: `FORM_H`의 **글자 그대로**를 검사(pitch-test M-GK)가 물고 있어요. */
  const ROLE = ["gk", "def", "def", "mid", "fwd"];
  /* 팀 전체가 미는 폭 — 우리가 더 크게 움직입니다(우리 이야기라서요).
   * 🕰️ 예전 `style.css`의 `.w2-pitch.push-* .w2-side.*`와 **같은 값**이에요 (7 · 4). */
  const PUSH = { home: 7, away: 4 };
  /* 라인 계수 — 흐름이 갈릴 때 **수비가 제일 크게 오르내립니다**(공격수는 이미 높아요).
   * 이 차이가 «라인이 내려앉는다»를 만듭니다 — 다 같은 값이면 또 미끄러져요. */
  const LINE = { gk: 0, def: 1, mid: 0.68, fwd: 0.38, wing: 0.24 };
  const LINE_STEP = 7;                 // 흐름 한 칸 = 판 폭의 7%
  /* 공에 붙는 힘 — **가까운 점만** 붙습니다. `RANGE` 밖은 0이에요.
   * 🔑 전원이 같은 거리를 붙으면 그것도 미끄러지는 그림이 됩니다. */
  const PULL = { gk: 0, def: 5.5, mid: 7, fwd: 6.2, wing: 7.6 };
  const RANGE = 46;
  const CLOSE = 0.6;                   // 아무리 가까워도 틈의 60%까지만 좁힙니다
  /* 🐛 **공을 덮으면 안 됩니다** — 320px 렌더에서 🧡 나(반지름 7px)가 ⚽ 공(5.5px) **뒤로
   *    숨었어요.** 하필 「내 순간」 카드라, 내가 관여한 그 순간에만 내가 안 보이는 그림입니다
   *    (🧤 키퍼가 실점 카드마다 사라지던 것과 **같은 모양의 흠**이에요).
   * 🔒 그래서 점은 공 둘레 **8칸을 비워 둡니다** — 320px에서 ≈21.6px이에요.
   *    🔑 가장 큰 반지름 합은 **🧡 커진 나(9.45px) + 공(5.5px) = 14.95px**이라 6.6px 남고,
   *       그 뒤에 붙는 흔들림(±1.7%·±2.2%)을 빼도 3px 넘게 떨어져요 (렌더 실측 최악 **+3.4px**).
   *    붙을 때는 여덟 칸 앞에서 멈추고, **이미 그 안에 있으면 물러섭니다**(집 자리가 공 밑일 때).
   * 🔒 물러서다 판 위아래로 나가지 않게 y는 [18, 82]에 가둡니다.
   *    🔑 기준은 **가장 큰 점**이에요 — 🧡 커진 나는 지름 18.9px이고, 판이 가장 낮을 때
   *       (`clamp(76px, …)`) 그 절반이 **높이의 12.45%**입니다. 82 + 12.45 = 94.5%라 4px 남아요.
   *    ⚠️ 처음엔 [14, 86]으로 뒀는데 그 절반을 14%로 잘못 봐서 **여유가 1.2px**이었습니다. */
  const STANDOFF = 8;
  const Y_MIN = 18, Y_MAX = 82;
  const YW = 0.35;                     // 판이 가로로 길어요 — y 1%는 x 0.35% 값어치
  const JX = 1.7, JY = 2.2;            // 🎲 점마다 조금씩 다른 자리
  /* 🧤 **골키퍼는 자기 골문을 안 떠납니다.**
   * 🔴 x 어긋남은 **판 가운데 쪽으로만** 갑니다 — 골라인 쪽은 **언제나 0**이에요.
   *    여기가 판 밖으로 나가는 **유일한 길**이라서요: 우리 키퍼는 집이 x 10%인데
   *    팀 밀림 −7%가 붙어 3%까지 내려오고, 남은 여유가 **3.4px**뿐입니다(판 264px 기준).
   *    ⚠️ 여기에 ±흔들림을 붙이면 **실점 카드마다 키퍼가 잘립니다**(140번에 실제로 났어요).
   *    🔬 변이 M-DEV가 정확히 그 상태를 만들어 P-1을 빨간불로 만듭니다. */
  const GK_OUT = 2;                    // 우리 팀이 밀어붙일 때만, 가운데로 두 칸
  /* 🐛 **키퍼를 공 쪽으로 너무 붙이면 안 됩니다.** 0.5로 뒀더니 실점 카드(공 y 28%)에서
   *    키퍼가 39%까지 올라와 **공과 겹쳤어요** — 320px 렌더에서 둘 사이가 8.5px인데
   *    반지름 합이 10px입니다. «키퍼가 잡았다»처럼 보이는 그 그림이에요(위 BALL_RESULT 주석).
   * 🔒 0.25면 공 y 26~74%에 대해 키퍼는 44~56%에만 있습니다 — 좌우로 지키는 건 읽히고,
   *    골라인 카드에서 공과는 **12px 넘게** 떨어져요. */
  const GK_TRACK = 0.25, GK_SPAN = 24, GK_JY = 0.8;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  /* 한 점의 **어긋남** [dx, dy] (판 폭·높이의 %).
   *   hx, hy  집 자리   ·  role  역할  ·  home  우리 편인가
   *   bx, by  공        ·  dir   흐름 (+1 상대 진영 · −1 우리 진영 · 0 중원) */
  function dotShift(hx, hy, role, home, bx, by, dir) {
    const push = PUSH[home ? "home" : "away"] * dir;
    if (role === "gk") {
      /* 🧤 좌우로 골문을 지키고(y), 우리 팀이 밀어붙일 때만 한 칸 **더** 나옵니다(x).
       *    🔒 `dir`이 내 골대 쪽을 가리키면 `out`은 **0**입니다 — 팀 밀림만 타요.
       *    🔴 그래서 우리 키퍼의 가장 왼쪽은 `10 − 7 = 3%` — **밀림이 CSS에 있던 시절과 같은 값**입니다. */
      const out = home ? (dir > 0 ? GK_OUT : 0) : (dir < 0 ? -GK_OUT : 0);
      return [push + out, clamp(by - hy, -GK_SPAN, GK_SPAN) * GK_TRACK + (fxRnd() * 2 - 1) * GK_JY];
    }
    let dx = push + LINE[role] * LINE_STEP * dir, dy = 0;
    const ux = bx - (hx + dx), uy = (by - hy) * YW;
    const d = Math.sqrt(ux * ux + uy * uy);
    if (d > 0.01) {
      /* 🔴 `d - STANDOFF`가 **음수면 물러섭니다** — 공을 덮고 선 자리에서 한 걸음 비켜요 */
      const move = d <= STANDOFF ? d - STANDOFF
        : Math.min(PULL[role] * Math.max(0, 1 - d / RANGE), d * CLOSE, d - STANDOFF);
      dx += (ux / d) * move;
      dy += ((uy / d) * move) / YW;
    }
    dx += (fxRnd() * 2 - 1) * JX;
    dy += (fxRnd() * 2 - 1) * JY;
    return [dx, clamp(hy + dy, Y_MIN, Y_MAX) - hy];
  }
  /* 판에 실제로 서는 줄 — `FORM_*`에서 **만들어 씁니다.** 베껴 적으면 표가 갈라져요
   * (골키퍼 자리를 고쳤는데 움직임만 옛 자리를 보는 날이 그 날입니다). */
  /* 🧡 **윙어인 나는 `wing`이에요 — 우리 편 공격수와 같은 값을 쓰면 둘이 늘 붙어 다닙니다.**
   *    윙어라 라인을 덜 타고(0.24), 공은 더 쫓아요(7.6). 다른 포지션은 그 줄의 역할을 씁니다 —
   *    집 자리가 떨어져 있어 같은 계수로 움직여도 **나란히** 갈 뿐 포개지지 않아요. */
  const homeRows = (me) => FORM_H.map((f, i) => [f[0], f[1], ROLE[i] || "mid"]).concat([[me[0], me[1], me[2]]]);
  const AWAY_ROWS = FORM_A.map((f, i) => [f[0], f[1], ROLE[i] || "mid"]);

  /* ⚽ **공이 어디로 가는가 — 표 하나가 전부입니다.** [x, y, 어느 진영으로 밀리나]
   * 🔒 `card.result`(엔진이 채운 값)를 그대로 읽습니다. `y`가 `null`이면 아래에서 흔들어요. */
  /* 🐛 y를 **골키퍼와 갈라 둡니다** — 처음엔 골·실점 둘 다 y 46%였는데, 키퍼도 50%라
   *    공이 **키퍼 위에 정확히 포개져** «키퍼가 잡았다»처럼 보였어요(390px 흑백 실측).
   *    골은 **위 구석**(28%)으로 넣습니다 — 골문 안이고, 키퍼와 20px 떨어져요. */
  const BALL_RESULT = {
    goal:    [97, 28, "a"],    // 🥅 상대 골망 — 위 구석
    assist:  [97, 28, "a"],
    shot:    [86, 50, "a"],    // 키퍼 정면 — 골문 앞에서 막혔어요
    save:    [18, 50, "h"],    // 🧱 걷어냈어요
    concede: [3, 28, "h"],     // 😣 우리 골망 — 위 구석
  };
  /* 판정 **전**(무엇이 걸렸나) — 아직 결과가 없으니 「걸린 자리」에 공을 둡니다 */
  const BALL_OPEN = { goal: [79, null, "a"], assist: [71, null, "a"], defend: [21, null, "h"] };
  /* 판정 **뒤인데 `result`가 없는 카드** — 😖 «발 끝에 안 걸렸어요» / 🧱 «걷어냅니다»예요.
   * 🐛 이게 없으면 `BALL_OPEN`으로 떨어져 **공이 골문 앞에 그대로 서 있습니다** —
   *    390px 실측에서 «발 끝에 안 걸렸어요»인데 공이 79%(상대 박스)였어요.
   *    기회가 **끝났다**는 것이 판에서도 보여야 합니다: 공이 박스를 떠나 중앙으로 돌아와요.
   * 🔒 그래도 **결과를 만들지 않습니다** — 「무슨 일이 있었나」는 여전히 `card.result`가 정하고,
   *    없다는 사실 자체를 그리는 것뿐이에요. */
  /* 🔒 x는 **우리 편 점 사이의 빈자리**로 골랐어요 — 63%(공격수)·42%(중원)에 겹치면
   *    공이 점 뒤로 숨습니다(390px 실측에서 64%가 공격수와 포개졌어요). */
  const BALL_LOST = { goal: [56, null, ""], assist: [52, null, ""], defend: [40, null, ""] };
  /* 🌊 **흐름이 가리키는 무게중심** — [가운데 x, 흔들 폭]. 결과가 아니라 «지금 공이 어느 쪽에»예요.
   *    (designer 144번 §5-3의 그 자리입니다. 좌표는 제안이었고 아래가 director 판정이에요.)
   * 🔒 **골문까지는 안 갑니다**: 🥅 골 97% · 🎯 슛 86%. 그 자리를 침범하면 «골인 줄 알았다»가 돼요 —
   *    그래서 `a`는 **78%에서 멈춥니다**(슛과 8% 떨어져요). `h`도 대칭으로 22%까지만.
   * 🔒 **`mid`는 흐름 없는 갈래와 같은 띠(38~62%)**입니다 — 🏟️ 프로 경기가 오늘 그리는 그 자리예요.
   * 🔴 **세 번째 칸(밀림)을 여기 두지 않습니다.** 밀림은 아래 `side`의 `card.flow` 줄이 맡아요 —
   *    양쪽에 다 적으면 **같은 답을 내는 줄이 둘**이 되어 한쪽을 지워도 증상이 0장입니다
   *    (CLAUDE.md 「방어가 겹침」 · designer 144번 §5-3이 콕 집어 경고한 자리). */
  const BALL_FLOW = { a: [70, 8], h: [30, 8], mid: [50, 12] };

  function setPitch(card, phase) {
    if (!S || !S.pitchEl) return;
    /* ══════════════════════════════════════════════════════════════
     * 🎲 **굴림 개수는 분기 밖에서 정합니다** — `setPitch` 한 번 = **언제나 정확히 22번**
     * ══════════════════════════════════════════════════════════════
     *   여기 **2** (`rx`·`ry`) + 점 **20**
     *   점 20 = 🧤 키퍼 2명 × 1 + 필드 9명 × 2. `dotShift`의 굴림은 **`if` 바깥**에 있고
     *   개수는 **역할만** 보므로, 카드 내용이 뭐든 20입니다 (`HOME_ROWS` 6 + `AWAY_ROWS` 5).
     *
     * 🔴 **예전엔 이 두 줄이 `if` 안에 있었습니다.** 골 카드는 0번, 놓친 카드는 1번이라
     *    **소비량이 판정 결과를 탔어요.** 값이 아무 데도 안 가도 그건 결합입니다 —
     *    `youth-moment B-0`이 지키는 자리가 그 모양으로 갈렸던 적이 있어요.
     * ⚠️ **`if`·`?:` 안에서 `fxRnd()`를 부르지 마세요.** 여기서 뽑아 내려보내세요.
     *
     * 🔒 카드 한 장이 지나는 `setPitch` 횟수도 고정입니다 — `card.mine`이면 2번
     *    (`openMoment` + `closeMoment`), 아니면 1번. **`mine`은 판정 전에 정해지는 값**이고,
     *    두 갈래 어디에도 `setPitch`를 건너뛰는 길이 없습니다(세대 가드만 있어요).
     * 🔒 ⌨️ 타이핑(`type`)의 굴림은 **글자 수**인데, 그 문장(`stakeLine`)은 `stakeKey`·`kind`·
     *    **카드 「전」 스코어**로만 만들어집니다 — 판정 결과를 안 탑니다. 🏫 학교는 아예 안 칩니다. */
    const rx = fxRnd(), ry = fxRnd();
    const r = card.result;
    let at = (phase !== "open" && r && BALL_RESULT[r])
      || (phase === "close" && BALL_LOST[card.kind])
      || BALL_OPEN[card.kind] || null;
    /* 🥅 킥오프·하프타임·휘슬은 **센터서클**이에요 — 아무 데도 안 걸려 있습니다 */
    if (!at && (card.kind === "kick" || card.kind === "half" || card.kind === "end")) at = [50, 50, ""];
    /* 🌫️ 그 밖(전개 카드)은 **흐름이 가리키는 진영**에서 흔들립니다.
     * 🐛 렌더로 본 흠이에요 — 흐름이 «우리가 밀어붙인다»인데 **공은 중원에** 있었습니다.
     *    줄은 올라갔는데 공만 가운데라 «흐름»이 화면에서 거짓말을 했어요(320px 실측).
     * 🔒 `flow`가 없으면(🏟️ 프로 경기) `38 + …*24` — **예전 그대로**입니다. */
    if (!at) {
      const f = BALL_FLOW[card.flow];
      /* 🔒 굴림은 **어느 갈래든 정확히 한 번**입니다 — 흐름이 있고 없고로 소비량이 안 갈려요 */
      at = f ? [f[0] + (rx * 2 - 1) * f[1], null, ""] : [38 + rx * 24, null, ""];
    }
    const y = at[1] == null ? 26 + ry * 48 : at[1];
    S.ballEl.style.transform = `translate(${at[0].toFixed(1)}%, ${y.toFixed(1)}%)`;
    /* 🌊 **흐름** — 공이 어느 진영에 있나(`at[2]`)가 먼저고, 그게 비어 있을 때만
     *    `card.flow`가 정합니다(🌫️ 전개 카드가 그 자리예요 — 결과가 없으니까요).
     * 🔴 `card.flow`를 **안 주는 갈래**(🏟️ 프로 경기 `engine.js`)에서는 `at[2] || ""`이라
     *    **예전과 한 글자도 다르지 않습니다** — 밀림 클래스가 그때 그대로 걸려요. */
    const side = at[2] || (card.flow === "a" ? "a" : card.flow === "h" ? "h" : "");
    S.pitchEl.classList.toggle("push-a", side === "a");
    S.pitchEl.classList.toggle("push-h", side === "h");
    /* 🏃 점마다 **다른 자리**로 보냅니다. 카드 한 장에 한 번, 인라인 `transform` 하나씩이에요.
     * 🔒 여기서 굴리는 것도(fxRnd만) 세는 것도 뒤집는 것도 없습니다 — 공이 간 자리를 보고
     *    «누가 그 근처인가»를 산수로 옮길 뿐이에요. */
    const dir = side === "a" ? 1 : side === "h" ? -1 : 0;
    for (const sl of (S.slots || [])) {
      const [dx, dy] = dotShift(sl.x, sl.y, sl.role, sl.home, at[0], y, dir);
      sl.el.style.transform = `translate(${dx.toFixed(2)}%, ${dy.toFixed(2)}%)`;
    }
    /* 🧡 **내 순간에는 내 동그라미가 커집니다** — "지금 나한테 왔다"가 판에서도 읽혀야 해요 */
    S.pitchEl.classList.toggle("mine", !!card.mine && phase !== "close");
    /* 🕸️ 골망 흔들림 — **골 카드가 왔을 때만.** 여기서 골을 만들지 않습니다 */
    const net = phase === "open" ? null : r === "goal" || r === "assist" ? "net-a" : r === "concede" ? "net-h" : null;
    S.pitchEl.classList.remove("net-a", "net-h");
    if (net && !reduced()) {
      void S.pitchEl.offsetWidth;
      S.pitchEl.classList.add(net);
      setTimeout(() => { if (S && S.pitchEl) S.pitchEl.classList.remove(net); }, 700);
    }
  }

  /* ---------- 타이핑 (순간 카드만) ---------- */
  async function type(body, text) {
    if (S.fast || reduced()) { body.textContent = text; return; }
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
    if (kind === "mine" || kind === "decisive") burst(S.topEl, ["⚽"], 12, 1);
    // 📳 진동은 우리 골에 40ms 한 번(내 막음은 closeMoment에서 25ms). 실점 · 동료 골에는 안 울려요 · 설정 `buzz`를 따라요
    if (kind === "mine" || kind === "decisive") buzz(40);
  }

  /* 🎆 **굴림 0의 파티클** — 공용 `Fx.burst` · `Fx.confetti`를 여기서 안 부르는 까닭:
   *    둘은 입자마다 `Math.random()`을 씁니다. 옛 II는 🏫 학교(`lite`)에서만 그걸 피했는데
   *    `lite`가 사라지면 **모든 경기**가 골마다 `Math.random`을 수십 번 먹게 돼요 —
   *    「판정 흐름에 `Math.random`을 새로 넣지 않는다」(25번 §5)에 정면으로 걸립니다(fx-count X-1이 잡았어요).
   * 🔑 그래서 입자의 각도 · 거리를 **번호에서** 정합니다(굴림 없음 · `fxRnd`도 안 씀 — 소비량이 결과를 타지 않게).
   * ♿ reduced에서는 아무것도 안 그립니다 — 정보는 배너 · 카드 글자에 있어요.
   * 🔒 `transform` · `opacity`만 움직입니다(`style.css`의 `w2Pop2`). */
  function burst(target, emojis, n, far) {
    if (reduced() || !target || !target.getBoundingClientRect) return;
    const r = target.getBoundingClientRect();
    const box = el("w2-burst");
    box.setAttribute("aria-hidden", "true");
    box.style.left = `${Math.round(r.left + r.width / 2)}px`;
    box.style.top = `${Math.round(r.top + r.height / 2)}px`;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.26;
      const d = (58 + (i % 3) * 26) * far;
      p.textContent = emojis[i % emojis.length];
      p.style.setProperty("--bx", `${Math.round(Math.cos(a) * d)}px`);
      p.style.setProperty("--by", `${Math.round(Math.sin(a) * d)}px`);
      p.style.animationDelay = `${(i % 4) * 30}ms`;
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 1100);
  }

  /* 🅶🅾🅰🅻 배너 — **내 골에만** 붙입니다.
   * 동료 골·실점에도 배너를 달았더니 바로 위 카드와 같은 말을 두 번 하게 됐어요
   *   27'  ⚽ 골!! 박스트, 그물을 흔듭니다!
   *        ⚽ 박스트의 골!          ← 같은 말
   * 설계 §5-4도 동료 골은 "플래시만 (약하게)", 실점은 "회색 플래시 + 흔들림"이에요.
   * 그쪽 정보는 카드 문구가 이미 담고 있어서 reduced-motion에서도 안 사라집니다. */
  function banner(text) {
    /* 🧸 `chibi-score`가 배너 옆에서 뜁니다(12번 §9-4) — 장식이라 alt를 비웁니다(글자가 이미 말해요) */
    const b = el("w2-goal");
    b.appendChild(txt("span", "", text));
    add(b);
    react(b, "score", true);
  }

  /* 🧸 **결과의 치비** — `mount`가 받은 `chibi`(base 경로)의 이름표에서 자세만 바꿔 씁니다.
   * 🔑 파일 이름이 곧 계약 키라(12번 §9-6) `…-chibi-base.webp` → `…-chibi-score.webp`가 성립해요.
   *    모양이 다르면(드라이버가 다른 경로를 줌) base 그대로 — 자세가 틀려도 **깨지지는 않습니다.**
   * 🔴 그림을 못 받으면 조용히 치웁니다 — 결과는 줄의 글자가 이미 말했어요. */
  function react(host, pose, lead) {
    if (!S || !S.chibi || !host) return;
    const img = document.createElement("img");
    img.className = lead ? "w2-react-lead" : "w2-react";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.decoding = "async";
    img.addEventListener("error", () => { img.remove(); host.classList.remove("has-react"); });
    img.src = S.chibi.replace(/-chibi-base(\.\w+)$/, `-chibi-${pose}$1`);
    if (lead) host.insertBefore(img, host.firstChild);
    else { host.classList.add("has-react"); host.appendChild(img); }
  }
  /* 결과 → 자세 — **`card.result`만 읽습니다**(원칙 ⑥).
   *   내 순간: 막음 → 몸 던지기 · 실점 → 낙담 · 놓침(결과 없음, 공격) → 낙담 · 🎯 골문 안 슛 → 없음
   *     (골문 안 슛은 약속에서 「살린 순간」이라 낙담으로 그리면 거짓말이에요 — 12번 §7-3)
   *   남의 카드: 실점만 → 낙담(12번 §9-4 「실점 · 놓친 뒤 결과 줄」)
   *   ⚽🅰️ 성공은 여기가 아니라 골 배너가 그립니다 */
  function poseOf(card) {
    const r = card.result;
    if (!card.mine) return r === "concede" ? "down" : null;
    if (r === "save") return "block";
    if (r === "concede") return "down";
    if (!r && card.kind !== "defend") return "down";
    return null;
  }

  /* 🏆 결승골 — 엔진의 markDecisive()가 **`end` 카드를 내기 직전에** 이미 그린 카드
   * 객체를 되채웁니다(engine.js `next()`). 그래서 기억해 둔 내 골 카드를 다시 보면
   * 알 수 있어요 — 드라이버가 따로 뭘 넘기지 않아도 됩니다.
   * 카드가 열리는 순간에 터뜨리면 안 돼요: 1-0 뒤에 2-2가 되면 결승골이 아니거든요. */
  function celebrateDecisive() {
    if (S.decisiveDone) return;
    const hit = S.myGoals.some((c) => c.decisive);
    if (!hit) return;
    S.decisiveDone = true;
    banner("🏆 결승골!!");
    burst(S.topEl, ["🏆", "⚽", "✨"], 18, 1.6);
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

  /* 🟩 판을 **한 번만** 짓습니다 (위 setPitch 머리말).
   * 🔒 집 자리는 인라인 `left`/`top`이고 **다시는 안 건드립니다** — 움직이는 건 그 점을
   *    감싼 겹(`.w2-slot`)의 `transform`뿐이라 레이아웃이 다시 안 돌아요.
   * 🧡 **겹을 하나 더 두는 이유** — `.w2-pitch.mine .w2-dot.me { transform: scale(1.35) }`와
   *    자리 `transform`이 **같은 요소에서 부딪히기** 때문입니다. 인라인이 이기면
   *    「내 순간에 커지는」 연출이 조용히 죽어요. 그래서 **겹이 옮기고, 점이 커집니다** —
   *    ⚠️ `!important`로 이기지 않았습니다(다음 사람이 못 덮어요).
   * ⏳ `transition-delay`를 점마다 조금씩 달리 줍니다(0·26·52·78ms · 🧡 나 13ms) — 열한 개가
   *    동시에 출발하면 그것도 «대형이 미끄러진다»로 보여요. 집 지을 때 한 번 심고 안 건드립니다.
   * 🔒 **시차 최댓값이 시간 예산에 들어갑니다** — `.42s + 78ms = 498ms`(브라우저 실측 514).
   *    🔴 견줄 상대는 900·600·350이 아니라 **가장 짧은 줄인 🌊 흐름 줄의 `FLOW_MS`(620ms)**예요 —
   *    `FLOW_MS`가 이 값에 **종속**됩니다. 여기를 늘리면 점이 다 서기 전에 다음 줄이 옵니다
   *    (`style.css`의 `.w2-slot` · 설계 145번 §11 · 149번 §4-1). */
  function dotsHTML(form) {
    return form.map(([x, y, k], i) =>
      `<i class="w2-slot" style="transition-delay:${(i % 4) * 26}ms">`
      + `<i class="w2-dot${k}" style="left:${x}%;top:${y}%"></i></i>`).join("");
  }
  /* 🧸 `chibi`가 있으면 「나」 원 안에 치비를 넣습니다(`has-chibi` — 받침 + 링은 그대로).
   *    판은 `aria-hidden`이라 alt를 비워요 — 같은 정보를 피드가 글로 말합니다. */
  function pitchHTML(me, chibi) {
    return `<div class="w2-pitch" aria-hidden="true">`
      + `<span class="w2-mouth h"></span><span class="w2-mouth a"></span>`
      + `<span class="w2-side away">${dotsHTML(FORM_A)}</span>`
      + `<span class="w2-side home">${dotsHTML(FORM_H)}`
      + `<i class="w2-slot" style="transition-delay:13ms">`
      + `<i class="w2-dot me${chibi ? " has-chibi" : ""}" style="left:${me[0]}%;top:${me[1]}%">`
      + `${chibi ? `<img src="${esc(chibi)}" alt="" decoding="async">` : ""}</i></i></span>`
      + `<span class="w2-ball" style="transform:translate(50%,50%)"><b></b></span>`
      + `</div>`;
  }
  /* 🧍 겹과 「집 자리·역할」을 짝지어 둡니다 — `setPitch`가 카드마다 이 목록만 돕니다.
   * 🔒 겹이 하나라도 안 잡히면 **그 점은 그냥 안 움직입니다**(집 자리에 서 있어요).
   *    화면이 통째로 죽는 것보다 낫고, 판정에는 아무 영향이 없습니다. */
  function slotsOf(host, me) {
    const out = [];
    const hs = host.querySelectorAll(".w2-side.home .w2-slot");
    const as = host.querySelectorAll(".w2-side.away .w2-slot");
    homeRows(me).forEach((r, i) => { if (hs[i]) out.push({ el: hs[i], x: r[0], y: r[1], role: r[2], home: true }); });
    AWAY_ROWS.forEach((r, i) => { if (as[i]) out.push({ el: as[i], x: r[0], y: r[1], role: r[2], home: false }); });
    return out;
  }

  /* ---------- 공개 API ---------- */
  function mount(host, cfg) {
    const c = cfg || {};
    /* 🎬 세대를 올립니다 — 옛 세대가 남긴 그리기는 이 순간 전부 무효가 돼요.
     *    (그걸 실제로 막는 줄은 `push` 맨 앞입니다. 위 표 참고) */
    _gen += 1;
    const me = ME_AT[c.pos] || ME_AT.wg;
    const chibi = typeof c.chibi === "string" && c.chibi ? c.chibi : null;
    const promise = typeof c.promiseLine === "string" && c.promiseLine.trim() ? c.promiseLine.trim() : null;
    const scout = typeof c.scout === "string" && c.scout ? c.scout : null;
    host.innerHTML = `
      <div class="w2-scene">
        <div class="w2-top">
          <div class="w2-row">
            <span class="w2-team home"></span>
            <span class="w2-score"><b>0</b><i>:</i><b>0</b></span>
            <span class="w2-team away"></span>
          </div>
          <div class="w2-meta">
            <span class="w2-clock">⏱ 0'</span>
            <span class="w2-mine-count" hidden></span>
            <button type="button" class="w2-gear-in" aria-label="설정">⚙️</button>
          </div>
          ${promise ? `<p class="w2-promise"></p>` : ""}
          ${pitchHTML(me, chibi)}
        </div>
        <div class="w2-feed">${scout ? `<div class="w2-scout"><img alt="문 스카우트 — 관심" decoding="async">`
          + `<p><b>스카우트석</b><br>문 스카우트가 이 경기를 지켜봐요</p></div>` : ""}</div>
      </div>`;
    const q = (s) => host.querySelector(s);
    /* 🔒 받은 글자(학교 이름 · 약속 줄)와 그림 경로는 **`textContent` · 속성으로만** 넣어요(25번 §6) */
    q(".w2-team.home").textContent = c.home || "우리 팀";
    q(".w2-team.away").textContent = c.away || "상대";
    if (promise) q(".w2-promise").textContent = promise;
    /* 🖼️ 깨진 그림 금지 — 치비를 못 받으면 **예전의 앰버 원**으로, 스카우트를 못 받으면 글자만 남깁니다 */
    const meImg = q(".w2-dot.me img");
    if (meImg) {
      meImg.addEventListener("error", () => {
        const dot = meImg.parentNode;
        meImg.remove();
        if (dot) dot.classList.remove("has-chibi");
        if (S && S.root && S.root.contains(dot)) S.chibi = null;   // 결과 줄 치비도 같은 파일 계열이라 같이 접어요
      });
    }
    /* ⚙️ 경기 화면의 설정 — 떠 있는 ⚙️(scenes.js)가 스코어보드 오른쪽 위(상대 학교 이름)를 덮어서, 경기 화면에선
     *    스코어보드 안 이 자리로 옮겨 와요(떠 있는 것은 style.css가 숨김). 판이 열려 있으면 안 열어요(29번 §4-5) */
    q(".w2-gear-in").addEventListener("click", (e) => {
      if (document.querySelector(".w2m-ready, .w2m-board, #w2-layer .w2o")) return;
      try { e.currentTarget.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }   // 닫으면 여기로 돌아와요
      const W = window.W2Scenes;
      if (W && typeof W.settings === "function") W.settings();
    });
    const scoutImg = q(".w2-scout img");
    if (scoutImg) { scoutImg.addEventListener("error", () => scoutImg.remove()); scoutImg.src = scout; }
    S = {
      root: q(".w2-scene"), topEl: q(".w2-top"), scoreEl: q(".w2-score"),
      clockEl: q(".w2-clock"), mineEl: q(".w2-mine-count"),
      pitchEl: q(".w2-pitch"), ballEl: q(".w2-ball"), feed: q(".w2-feed"),
      h: 0, a: 0, mine: 0, fast: false, myName: c.myName || "나", chibi,
      slot: null, pending: null, myGoals: [], slots: slotsOf(host, me), promise: !!promise,
      /* 🔬 ⏱️ 이 경기의 **시계 수열** — 검사 전용입니다 (`_t.clocks()`).
       * 🔒 **경기 하나의 값이라 여기서 비웁니다.** `_drops`가 누적인 것과 성격이 달라요:
       *    drops는 *"확률이 아니라 수로"* 보려고 단조 증가였고, clocks는 **단계마다
       *    0'~90'을 다시 밟는지**를 봐야 합니다. 🔴 성격이 달라 안 묶었어요. */
      clocks: [],
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
    /* 🎬 **끄는 줄** — 세대가 갈렸으면 여기서 한 글자도 안 씁니다 (위 표 ①).
     *    🔬 버린 횟수를 셉니다(`_t.drops()`) — 검사가 **확률이 아니라 수로** 볼 수 있게요. */
    if (g != null && g !== _gen) { _drops += 1; return; }
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
    await wait(delayOf(card));
    if (!alive(my)) return;
    setClock(card.min);
    setPitch(card, "plain");

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
    /* 🏁 **킥오프·종료 휘슬은 흐름 줄과 다른 옷**입니다 — 90분 대본이 들어오면서 0'과 90'이
     *    매 경기 반드시 뜨게 됐어요. 셋을 한 클래스로 묶으면 *"삐— 경기 종료"*가
     *    *"측면에서 두드립니다"*와 구분이 안 됩니다 (`style.css`의 `.w2-card.whistle`). */
    const cls = card.result === "goal" || card.result === "assist" || card.result === "save" ? "good"
      : card.result === "concede" ? "bad"
        : card.kind === "kick" || card.kind === "end" ? "whistle"
          : card.kind === "filler" ? "filler" : "";
    const min = card.min > 90 ? `90+${card.min - 90}'` : `${card.min == null ? "" : card.min}'`;
    const line = add(lineCard(cls, min, card.text || resultLine(card)));
    const pose = poseOf(card);
    if (pose) react(line, pose);

    if (fx) {
      if (fx === "mine" || fx === "decisive") banner(bannerText(card));
      goalFx(fx);
      if (!S.fast && !reduced()) await wait(320);
    } else if (card.kind === "end") {
      celebrateDecisive();
    } else if (changed && !S.fast) {
      await wait(150);
    }
  }

  /* ⏱️ **시계 한 칸** (설계 153번 §6-1). 🔒 **드라이버(`live.js`)의 시계 루프가 부릅니다.**
   * 🔴 이 파일은 여전히 **`dt`도 `requestAnimationFrame`도 안 씁니다** — 판은 「카드를
   *    따라가는 그림」 그대로이고, 시간축은 **드라이버에 하나뿐**이에요.
   *    🔴 **시계를 여기서 돌리지 마세요**(`setInterval`도, `rAF`도). 그 순간 이 파일이
   *    「가짜 rAF」를 구조로 피한 성질을 잃고, `raf-test`가 지키는 자리가 통째로 열립니다.
   * 🎬 세대가 갈리면 **`false`를 돌려줍니다** — 부르는 쪽이 그걸 보고 루프를 끊어요.
   *    🔒 `push`의 끄는 줄과 **같은 계수기**(`_drops`)를 씁니다: 둘 다 「세대가 갈려서
   *    한 글자도 안 썼다」는 같은 사건이라, 나누면 검사가 두 곳을 봐야 합니다. */
  function clock(min, g) {
    if (g != null && g !== _gen) { _drops += 1; return false; }
    if (!S) return false;
    setClock(min);
    S.clocks.push(min);
    return true;
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
    setPitch(card, "open");
    setScore(card.score);
    S.pending = card;
    S.mine += 1;
    S.mineEl.hidden = false;
    S.mineEl.textContent = `🔥 내 순간 ${S.mine}회`;

    const c = add(lineCard("mine", card.min > 90 ? `90+${card.min - 90}'` : card.min + "'", ""));
    await type(c.querySelector(".w2-body"), stakeLine(card));
    if (!alive(my)) return null;
    /* 📋 약속은 「그 경기의 **내 첫 순간**」(27번 §5-1) — 약속이 걸린 경기의 첫 판 머리에 한 줄(효과가 걸린 자리가 보이게).
     *    판정을 보여 주는 때는 지금처럼 경기 뒤(결과 줄)예요. 🤖 판도 같은 자리에 붙어요 */
    if (S.promise && S.mine === 1) c.appendChild(txt("span", "w2-tag w2-tag-promise", "📋 약속이 걸린 순간"));

    return momentSlot();
  }

  /* 판정 뒤. **card.result는 엔진이 이미 채워 둔 값**이어야 합니다. */
  async function closeMoment(card) {
    if (!S) return;
    const my = S;
    S.pending = null;
    if (S.slot) { S.slot.remove(); S.slot = null; }
    /* 🟩 🐛 여기가 빠져 있었습니다 — 판정이 끝났는데 **공이 「걸린 자리」에 그대로** 있었어요.
     *    실점 카드가 왔는데 공은 상대 진영 71%에 서 있었습니다(390px 실측).
     *    🔑 `push`(그 밖의 카드) · `openMoment`(무엇이 걸렸나) · `closeMoment`(결과)
     *    **셋 다** `setPitch`를 지나야 판이 카드를 따라갑니다. */
    setPitch(card, "close");
    setScore(card.score);
    const cls = card.result === "goal" || card.result === "assist" || card.result === "save" ? "good"
      : card.result === "concede" ? "bad" : "";
    const line = add(lineCard(cls, card.min > 90 ? `90+${card.min - 90}'` : card.min + "'", card.text || resultLine(card)));
    /* 🦶 🤖 판엔 판 머리가 없으니 **결과 줄에 꼬리표 하나**(36번 §3-3 「🧱 막음 · 🦶 약발」) — 자동으로 하는 사람에게도
     *    약발 훈련의 값이 보이게. 손으로 둔 판은 판 머리가 이미 말했어요 */
    if (card.auto && card.weak) line.appendChild(txt("span", "w2-tag w2-tag-weak", "🦶 약발"));
    const pose = poseOf(card);
    if (pose) react(line, pose);
    if (card.result === "save") buzz(25);                      // 📳 내 막음 — 골보다 짧게(위계)
    const fx = fxOf(card);
    if (fx) {
      if (fx === "mine" || fx === "decisive") banner(bannerText(card));
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
  /* 🔬 `_t`는 **검사 전용 창구**입니다 — 게임 로직도 화면도 여기를 읽지 않아요.
   *    `drops()`는 누적이고 아무것도 0으로 안 되돌립니다 (위 `_drops` 주석). */
  return { mount, momentSlot, push, openMoment, closeMoment, summary, tally: summary,
           gen: () => _gen, clock, fast, isFast, destroy,
           _t: { drops: () => _drops, clocks: () => (S ? S.clocks.slice() : []) } };
})();
