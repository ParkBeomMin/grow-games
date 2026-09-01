/* 🏫 ⚽ 더 윙어 II — 초·중·고 학교 대항전 · 🏟️ 유스 입단 제안 (winger2 전용)
 *
 *   WingerTown.openStage(id, { pos, foot }, done)   🏫 그 단계의 카드를 굴리고 `done()`
 *   WingerTown.playedStage(id) / played()           그 단계를 굴렸나 / 🏫 아크가 끝났나
 *   WingerTown.score() / cards() / deviation()      누적 점수 · 뛴 카드 수 · 편차 d
 *   WingerTown.offerFor(marketId)                   🏟️ 그 유스가 내민 제안
 *   WingerTown.scoreOf(st)/cardsOf(st)/deviationOf(st)   세이브에서 읽기 — **옛 세이브는 d = 0**
 *
 * ── 왜 전용 파일인가 ─────────────────────────────────────────
 * `timing.js`·`base.css`·`match.js`·`help.js`는 **8개 게임이 전부 내려받습니다.**
 * 축구 하나만 쓰는 화면을 거기 넣으면 안 쓰는 게임까지 무게를 집니다.
 * 🎤 아이돌의 `tour-stage.js`·⚾ 야구의 `post-stage.js`·🔥 `winger-moment.js`와 같은 이유예요.
 * game.js의 최상위 `const`(PEER_REF·youthAutoP·show…)는 **뒤에 실린 스크립트에서 그대로 보입니다** —
 * 그래서 산식을 베껴 오지 않고 **게임이 쓰는 그 함수를 그대로** 부릅니다.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 🏫 **3단계인데 능력치는 안 자랍니다** (설계 93번 §5-1)
 * ══════════════════════════════════════════════════════════════════════
 * 초·중·고 여덟 판을 뛰는 동안 **몸은 한 번도 안 바뀝니다.**
 * 3단계를 3단계로 만드는 것은 능력치가 아니라 **무대 · 자리 · 미니게임 해금**이에요:
 *
 *   | 단계        | 카드 | 📍 자리 | 미니게임        | 무대 |
 *   | 🏫 초등부   | 2   | 🔴 없음 | 대표 3종        | 공터 · 아무도 안 봄 |
 *   | 🎯 포지션   | —   | ✅ 여기서 고릅니다 | | 중학교 진학 |
 *   | 🏫 중등부   | 3   | ✅      | `MINI[kind][pos]` 4종 | 학교 운동장 |
 *   | 🏫 고등부   | 3   | ✅      | 〃              | 관중 · 스카우트석 |
 *
 * 🔴 **단계별 기준선 3칸(`PEER_REF`에 초/중/고)을 만들지 마세요.** 그건 87번이 폐기한
 *    **「동네만 따로 세기를 정하는 값」과 정확히 같은 형태**입니다 — 이름만 다르고요.
 *    `PEER_REF.town = 32.0` **한 칸이 여덟 판 전부를** 봅니다.
 *
 * 🔴 **초등 결과는 포지션을 「추천」하면 안 됩니다** (70번 §8이 🔥 트라이아웃을 뺀 근거 (a) —
 *    *"조작 실력은 선수의 것이 아니다"*). 초등 점수는 🎯 자리 화면에 **한 글자도 안 나옵니다.**
 *    순서만 바뀐 것이지 추천은 없어요.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 **제안이 사는 것은 `spot`(주목도) 하나뿐입니다** (설계 85번 §2-2)
 * ══════════════════════════════════════════════════════════════════════
 * 🔴 **`growth`·`debut`에는 한 톨도 안 닿습니다. 검사가 지킵니다.**
 *
 *   `growth` 0.98~1.18  🔴 **36턴 복리**예요. 복리 축에 조작 여덟 장을 걸면 그건 육성이
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
 * 🔴 **건너뛰기·난이도 선택·재도전 버튼을 붙이지 마세요** (설계 93번 §2-2).
 *    기준이 바뀌었습니다 — 옛 기준은 *"생성 화면의 결정 탭이 4를 안 넘는다"*였고,
 *    새 기준은 🔑 **「첫 순간 카드 「앞」에 놓인 결정이 3을 안 넘는다」**예요
 *    (✏️ 이름 · 🦶 주발 · 🗺️ 동네 = 3). 카드와 카드 **사이**에 놓인 결정(🎯 자리)은
 *    첫 카드를 1초도 안 밀어서 이 검산에 안 들어갑니다.
 *    🔒 **그래도 뒤쪽 결정에는 상한이 있어요** — *"카드와 카드 사이"*라는 자리 자체가
 *    상한입니다. 카드가 안 끼는 결정을 뒤에 붙이면 그 순간 검산이 다시 무너져요.
 *    ⏱️ 실기기에서 아크가 길어지면 **카드 수를 줄이지 화면을 줄이지 마세요.**
 */
"use strict";

window.WingerTown = (() => {
  /* 🏫 카드 세 종류 — ⚽ 결정 · 🅰️ 전개 · 🧱 수비.
   * 중·고등부는 **한 장씩 셋**을 씁니다: ① 미니게임을 다 보여주고(튜토리얼)
   * ② 한 종류에 몰리는 운을 없애요. 초등부는 이 셋 중 **둘**을 뽑습니다(§`deal`). */
  const CARDS = [
    { key: "g", name: "결정", emoji: "⚽", line: "골문 앞에서 공이 발에 걸렸어요." },
    { key: "a", name: "전개", emoji: "🅰️", line: "친구가 뒷공간으로 뛰기 시작했어요." },
    { key: "d", name: "수비", emoji: "🧱", line: "한 명만 지나가면 실점이에요." },
  ];

  /* 🏫 단계 표 — **카드 2 / 3 / 3 = 여덟 장**입니다 (설계 93번 §5-4 「카-A」).
   * 🔑 이 표에 **밸런스 계수가 한 칸도 없습니다.** 단계가 바꾸는 것은
   *    카드 수 · 무대 글 · 미니게임 폭뿐이고, 판정의 중심은 세 단계 모두
   *    `PEER_REF.town` 한 칸이에요.
   * ⏱️ 아크가 실기기에서 4분을 넘으면 여기 `n`을 2/2/2로 내리세요 —
   *    **화면을 줄이면 결정이 사라지고, 카드를 줄이면 길이만 줄어듭니다.**
   * 🔑 **`n`은 `deal()`이 실제로 읽습니다.** 값을 바꾸면 그 단계의 덱이 바로 줄어들어요 —
   *    🔴 예전엔 이 주석이 *"n을 내리세요"*라고 하는데 `deal()`이 `n`을 안 읽어서
   *    **아무 일도 안 났습니다.** 「선언은 있는데 배선이 없는」 자리였어요 (inspector ④). */
  /* 🔒 **두 줄은 전부 공통입니다 — 지역별로 가르지 마세요.** 17 시·도 × 3단계 × 2줄이면
   *    **102줄**이 됩니다. 지역이 들어가는 자리는 `place` 앞의 **낱말 하나**뿐이에요
   *    (`경기도 · 동네 공터`). 🔒 지역은 여전히 산식에 한 톨도 안 닿습니다(93번 §4-2).
   * 🔴 고등부 둘째 줄에 **「스카우트」라는 말을 안 씁니다** — 누군지는 다음 화면에서
   *    밝혀져요(원칙 ⑧ — 재미의 절반은 「모른다」에서). 그리고 마지막 카드 대사와
   *    **두 줄 사이에 겹치지 않게** 하는 자리이기도 합니다. */
  const STAGES = [
    { id: "e", n: 2, title: "🏫 초등부 대항전", place: "동네 공터",
      head: "공터에 애들이 다 모였어요.", sub: "자리도 없이 다 같이 공만 쫓아다녀요.",
      next: "🎯 자리를 정해요" },
    { id: "m", n: 3, title: "🏫 중등부 대항전", place: "학교 운동장",
      head: "가슴에 학교 이름이 붙었어요.", sub: "이제 각자 맡은 자리가 있어요.",
      next: "🏫 고등부로" },
    { id: "h", n: 3, title: "🏫 고등부 대항전", place: "고등부 대회",
      head: "관중석이 찼어요.", sub: "라인 밖에 낯선 어른들이 서 있어요.",
      next: "🏟️ 스카우트를 만나요" },
  ];
  const TOTAL_CARDS = STAGES.reduce((a, s) => a + s.n, 0);   // 8

  /* 🔴 **초등부에는 포지션이 없습니다** — 그런데 `engine.js`의 `MINI[kind][pos]`가
   *    `pos`를 요구해요. 🔒 **`engine.js`는 한 줄도 안 고칩니다**(검사 17종이 그 위에 섭니다).
   *
   * 그래서 `mf` 칸을 **읽습니다.** 이건 「초등은 미드필더」라는 뜻이 아니에요 —
   *   `MINI.goal.mf = ["oneone"]` · `MINI.assist.mf = ["killpass"]` · `MINI.defend.mf = ["block"]`
   * 이 칸이 마침 **각 종류의 대표 하나씩**이라 `cutin`이 안 나옵니다. 그게 설계가 말한
   * *"초등 3종 → 중등부터 4종 해금"*이에요. 🔒 **새 배정표를 만들지 않습니다.**
   *
   * 🔑 **판정값은 이 선택에 안 흔들립니다.** 학교 아크의 몸은 `evenStats()`(여섯 칸이 전부
   *    32.33)이고 `blendOf`는 가중합(0.60·0.25·0.15 = 1.00)이라 **어느 포지션을 넣어도
   *    32.33 → clamp 하한 40**으로 같은 값이 나와요. 실측으로 4 포지션 동일을 확인했습니다.
   *    → 초등에서 `mf`를 읽는 것은 **미니게임 배정에만** 닿고 곡선에는 안 닿습니다. */
  const ELEM_POS = "mf";

  /* 판정 → 점수. `perfect 2 · ok 1 · miss 0`.
   * 🧱 수비는 판정에 `ok`가 없어요(읽기 게임 · 이분) — 2점 아니면 0점입니다. */
  const PTS = { perfect: 2, ok: 1, miss: 0 };
  /* 🫀 학교 대항전에서의 컨디션 — `newState`의 시작값과 같은 80이에요.
   * 판정 창(`condMul`)에 걸리는 값이라 아무 값이나 두면 안 됩니다. */
  const TOWN_CONDITION = 80;

  /* ══════════════════════════════════════════════════════════════════
   * 📣 **제안 등급 표 — `spot`에 곱하는 한 겹입니다** (설계 85번 §5-1)
   * ══════════════════════════════════════════════════════════════════
   * 🔴 **난이도 손잡이가 아닙니다.** 세기를 여기서 잡지 마세요 —
   *    유스의 세기는 `YOUTH_CARD_P`, 프로 도전은 `GRADE_PASS`·`DONE_PASS_CAP`입니다.
   * 🔒 **바닥 ×0.90 · 천장 ×1.10** — 「주목 배수 하한」이지 「학교 페널티」가 아니에요.
   *    바닥이 없으면 회복 경로 자체가 사라지고, **그게 처벌의 정의**입니다(설계 85번 §3-3 ①). */
  const OFFER = [
    { mul: 0.90, star: "☆", label: "관찰 대상" },
    { mul: 0.95, star: "⭐", label: "후보 등록" },
    { mul: 1.00, star: "⭐⭐", label: "입단 제안" },
    { mul: 1.05, star: "⭐⭐⭐", label: "정식 제안" },
    { mul: 1.10, star: "⭐⭐⭐⭐", label: "특급 영입" },
  ];
  const NEUTRAL_TIER = 2;      // ⭐⭐ 입단 제안 = ×1.00

  /* ══════════════════════════════════════════════════════════════════
   * 📏 **편차 밴드 — `d = 점수 − 뛴 카드 수`** (설계 93번 §5-3 · §8-1)
   * ══════════════════════════════════════════════════════════════════
   * 🔴 **중립화 구조입니다. 난이도 손잡이가 아니에요.**
   *
   * ── 🔑 왜 「절대 점수」가 아니라 「편차」인가 ──
   * 엔진 `outcome`에서 **카드 한 장이 개별로 「평균 1 · 1을 축으로 대칭」**입니다:
   *   ⚽ 결정 · 🅰️ 전개 (`p = 1/3`)  →  2점 ⅓ · 1점 ⅓ · 0점 ⅓
   *   🧱 수비 (이분 · `p = 0.5`)      →  2점 ½ · 0점 ½
   * **독립인 대칭 분포의 합은 대칭**이므로 — 종류를 어떻게 섞든, 몇 장을 쓰든
   * **N장의 합은 평균 N · N을 축으로 대칭**입니다. 그래서
   *
   *     d = 점수 − 뛴 카드 수      →  중립에서 E[d] = 0, **d = 0을 축으로 대칭**
   *
   * ── 🔑 이게 세 가지를 한꺼번에 지킵니다 ──
   *   ① **중립이 어느 시점에서든 정확히 ×1.000** — 2장에서도, 5장에서도, 8장에서도
   *   ② **조기일수록 `d` 범위가 좁아 극단 등급이 안 나옵니다** — 「일찍 정하면 안전하다」가 산식으로
   *   ③ **옛 세이브가 자동으로 중립** — `townScore 3 · schoolN 3` → `d = 3 − 3 = 0`
   *
   * 🔴 **점수를 밴드에 그대로 넣지 마세요.** 옛 세이브의 `3`은 **3장 중립**인데 새 중립은 **8**이라,
   *    그대로 넣으면 `d = 3 − 8 = −5` → **진행 중인 커리어가 전부 ×0.90으로 조용히 내려갑니다.**
   *    CLAUDE.md의 *"가중 카운터를 더할 땐 옛 카운터를 이어받으세요"*가 정확히 이 자리예요 —
   *    **`schoolN`이 그 「이어받기」입니다.**
   *
   * ── 🔒 지켜야 하는 성질 (구조로 검사할 수 있습니다) ──
   *   🔑 **모든 `d`에 대해 `tierOfD(d) + tierOfD(−d) === 2 × NEUTRAL_TIER`**
   *   🔑 그리고 `OFFER`의 배수가 tier에 대해 등간격 대칭(0.90/0.95/1.00/1.05/1.10)
   *   → 이 둘이면 **E[등급] = ×1.000이 실측이 아니라 정의로** 성립합니다.
   *      경계 하나만 옮기면 그 자리에서 깨져요 (`NPC_SPOT` 사고와 같은 형태).
   *
   * 🔴 **밴드 경계를 「난이도」로 만지지 마세요.** 전체 기댓값이 높으면
   *    `OFFER` 표를 **평행이동**하세요 — 그게 대칭을 안 깨는 유일한 방향입니다.
   *
   * ── 🔑 경계를 재는 자: **「밴드만(SHAKE 전)」입니다** (designer 확정 · 96번 §3-3) ──
   * 목표는 *"다섯 등급이 각각 ≥ 5%"*인데, **`SHAKE` 뒤로 재면 밴드가 무엇을 하든 통과합니다.**
   * 실측이 그대로 보여 줬어요 — 경계 `±5`는 밴드만 보면 **3.3%**(탈락)인데
   * `SHAKE`를 지나면 **8.4%**(통과)가 됩니다.
   * 🔴 **그건 검사가 아니라 통과 도장**이고, 「초록불인데 아무것도 안 지키는 검사」의 한 형태예요.
   *    `±2/±4`는 밴드만으로 **7.8% / 8.5%**라 그 자를 통과합니다.
   *
   * 🟡 **그렇다고 `SHAKE` 뒤 분포를 버리지는 마세요 — 「다른 것」을 재는 자입니다.**
   *    `±2/±4`의 SHAKE 뒤 중앙(⭐⭐)이 **32%**인데, 이게 얇아지면
   *    *"등급이 늘 흔들린다"*로 읽혀요. 🔒 **`SHAKE`를 건드릴 때만** 보는 값입니다
   *    (balancer 12번 — 중앙 ≥ 30%). 밴드 경계를 그 자로 정하지 마세요. */
  const BAND_EDGE = [-4, -2, 2, 4];
  function tierOfD(d) {
    /* d ≤ −4 → ☆ · −3~−2 → ⭐ · −1~+1 → ⭐⭐ · +2~+3 → ⭐⭐⭐ · ≥ +4 → ⭐⭐⭐⭐
     * ⚠️ 아래 두 줄이 `<=`, 위 두 줄이 `<`인 게 **대칭의 자리**입니다 — 한쪽만 바꾸면
     *    0 축 대칭이 깨져요. */
    if (d <= BAND_EDGE[0]) return 0;
    if (d <= BAND_EDGE[1]) return 1;
    if (d < BAND_EDGE[2]) return NEUTRAL_TIER;
    if (d < BAND_EDGE[3]) return 3;
    return 4;
  }

  /* 🎲 **유스마다 따로 굴립니다** — 학교 성적은 **기댓값**만 올려요 (설계 85번 §4-2 · 원칙 ⑧).
   * *"고등부에서 잘했는데 🇮🇹만 시큰둥하네"* 가 서사입니다. 5곳이 한꺼번에 굴러 다 같아지면
   * *"잘했으면 다 좋음"* 이 되어 **선택이 사라집니다.**
   * ⚠️ 좌우 대칭(0.25 / 0.50 / 0.25)이라 **기댓값을 안 움직입니다.** 한쪽만 키우면
   *    그건 흔들림이 아니라 **난이도 조정**이 돼요. */
  const SHAKE = [[-1, 0.25], [0, 0.50], [1, 0.25]];

  /* 🗣️ 그 유스의 말 — 등급이 높을수록 그 유스의 색이 드러나요
   * (0~2는 미지근한 공통, 3~4는 유스마다 다릅니다). */
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

  /* 🏫 아크 전체의 누적입니다 — **단계마다 초기화하지 않아요.**
   *   stages  굴린 단계 { e: true, … }   ·  rows  뛴 카드 전부(종류·판정·점수) */
  const state = { stages: {}, score: 0, cards: 0, rows: [], offers: null };

  /* ── 🏫 학교에서 엔진이 보는 몸 ────────────────────────────────
   * **여덟 판 내내 전원이 같은 값**이에요 — `evenStats()`는 `POOL`을 여섯 칸에 고르게 나눈 모양입니다.
   * ⚠️ 나이 곡선(`nowStats`)을 안 통과합니다 — 학교는 조립대 **앞**이라 나이도 성장타입도
   *    아직 없어요. `PEER_REF.town`은 **그 날것의 평균(32.33)** 위에서 잰 값입니다. */
  function evenBody() {
    const P = window.WingerProspect;
    const st = P && P.evenStats ? P.evenStats() : null;
    if (!st) return { stats: null, x: 0 };
    const vals = Object.keys(st).map((k) => st[k]).filter((v) => typeof v === "number");
    return { stats: st, x: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
  }

  /* 카드 한 장의 판정을 엔진에 물어봅니다. **판정 산식을 여기서 만들지 않아요** —
   * `youthAutoP`·`judgeAtP`는 ⚔️ 유스가 쓰는 그 함수 그대로입니다.
   * 🔒 세 단계가 **같은 `PEER_REF.town` 한 칸**을 봅니다 (단계별 기준선이 없어요). */
  function judgeFor(cardKey, opts) {
    const E = window.WingerEngine;
    const kind = YOUTH_CARD_KIND[cardKey] || "goal";
    const body = evenBody();
    const ability = E.blendOf({ pos: (opts && opts.pos) || ELEM_POS, stats: body.stats });
    const autoP = youthAutoP(kind, body.x, PEER_REF.town);
    return { kind, ability, autoP, judge: (s) => E.judgeAtP(kind, autoP, ability, s) };
  }

  /* 🃏 그 단계가 뽑는 카드 — **`stage.n`장**입니다.
   *
   *   n === 3 (종류 수)  → ⚽🅰️🧱 **한 장씩 고정 순서.** 종류가 한쪽에 몰리는 운이 없어요
   *   n <  3            → **균등하게** n종류를 뽑습니다 (부분 Fisher-Yates)
   *
   * 🔴 **뽑기가 균등해야 합니다.** 한 종류가 자주 나오면 §7의 `fit`에서
   *    **그 나라만 자주 오게** 됩니다(설계 93번 §8-2 ⚠️). 부분 셔플은 앞 n칸이
   *    **균등한 n-순열**이라 종류마다 `n/3`로 같아요 — 초등(n=2)이면 ⅔씩입니다.
   * ⚠️ `n`이 종류 수를 넘으면 종류가 겹쳐야 하는데, 겹치면 위의 균등성이 깨집니다.
   *    지금은 **3으로 자릅니다** — 늘려야 하면 그때 균등성을 다시 재세요. */
  function deal(stage) {
    const n = Math.max(1, Math.min(CARDS.length, stage.n));
    if (n === CARDS.length) return CARDS.slice();
    const idx = CARDS.map((c, i) => i);
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(Math.random() * (idx.length - i));
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return idx.slice(0, n).map((i) => CARDS[i]);
  }

  /* 🎲 5곳의 제안을 **한 번만** 굴립니다 — 화면을 다시 열어도 다시 안 굴러요.
   * (다시 굴리면 뒤로 가기가 곧 재도전이 됩니다)
   * 🔑 인자는 **점수가 아니라 편차 `d`**입니다. 점수를 넣으면 옛 세이브가 깨져요. */
  function rollOffers(d) {
    const base = tierOfD(d);
    const out = {};
    for (const m of MARKETS) {
      let r = Math.random(), sh = 0;
      for (const [v, w] of SHAKE) { r -= w; if (r <= 0) { sh = v; break; } }
      const tier = clamp(base + sh, 0, OFFER.length - 1);
      const o = OFFER[tier];
      out[m.id] = {
        tier, mul: o.mul, star: o.star, label: o.label,
        word: tier >= NEUTRAL_TIER + 1 ? (PITCH[m.id] || COLD[NEUTRAL_TIER]) : COLD[tier],
      };
    }
    return out;
  }

  // ---------- 🏫 화면 ----------
  /* 🔘 진행 점 — **그 단계의 카드만** 그립니다(아크 전체가 아니라).
   * 🎬 클래스는 그대로예요: `.town-dot` + `now`/`hit`/`mid`/`bad` */
  function progHTML(deck, doneN) {
    return deck.map((c, i) => {
      const r = state.rows[state.rows.length - doneN + i];
      const cls = i >= doneN ? (i === doneN ? "town-dot now" : "town-dot")
        : "town-dot " + (r.res === "perfect" ? "hit" : r.res === "ok" ? "mid" : "bad");
      return `<span class="${cls}">${c.emoji}</span>`;
    }).join("");
  }

  /* 🏫 한 단계를 엽니다. 끝나면 `done()`이에요.
   *
   * 🔴 **여기는 재도전을 안 막습니다 — 일부러입니다.** 막는 곳은 `game.js`의 `goSchool`
   *    **한 군데뿐**이에요. 예전엔 여기에도 같은 가드가 있었는데, 가드가 겹치면
   *    **하나를 빼도 증상이 0장**이라 「재도전 뒷문」을 지키는 검사가 통째로
   *    아무것도 못 지키게 됩니다(inspector ⑤ — 변이가 안 잡혀서 드러났어요).
   * 🔒 **가드를 다시 여기 붙이지 마세요.** 새 호출자가 생기면 `goSchool`을 지나게 하세요. */
  function openStage(stageId, opts, done) {
    const stage = STAGES.find((s) => s.id === stageId) || STAGES[0];
    const o = opts || {};
    /* 🔴 초등부는 `opts.pos`를 **안 봅니다.** 아직 자리를 안 골랐고, 골랐더라도
     *    초등 화면이 자리를 아는 순간 「추천」의 뒷문이 열려요. */
    const pos = stage.id === "e" ? ELEM_POS : (o.pos || ELEM_POS);
    const deck = deal(stage);
    const card = $("town-card"), res = $("town-result"), btn = $("btn-town-next");
    const hint = $("town-hint"), prog = $("town-prog"), title = $("town-title");
    const place = $("town-place"), screen = $("screen-town");

    /* 🎬 무대가 커지는 게 보여야 합니다 — **능력치가 안 자라므로 여기가 성장의 유일한
     * 시각 증거**예요(설계 93번 §13). director가 `data-stage`(e/m/h)와
     * `.town-place`·`.town-head`로 배경·군중을 답니다.
     * 🗺️ 지역 이름은 **`WingerIntro`에서 읽어 옵니다** — 사본을 만들면 표가 갈라져요.
     *    안 골랐거나 스크립트가 안 왔으면 **그냥 안 붙입니다**(🌍 미상을 적지 않아요). */
    if (screen) screen.dataset.stage = stage.id;
    if (title) title.textContent = stage.title;
    const rn = (window.WingerIntro && o.origin) ? WingerIntro.nameOf(o.origin) : "";
    const at = rn && rn.indexOf("미상") < 0 ? `${rn} · ${stage.place}` : stage.place;
    /* CSS가 아직 안 붙어도 읽히게 — 구분자를 마크업에 둡니다(director가 나중에 숨겨요). */
    if (place) place.innerHTML = `<span class="town-place-at">${at}</span>`
      + `<span class="town-sep"> — </span>`
      + `<span class="town-head">${stage.head} ${stage.sub}</span>`;

    let i = 0;
    function playCard() {
      const c = deck[i];
      if (hint) hint.innerHTML = `<b>${c.emoji} ${c.name}</b> — ${c.line}`;
      if (prog) prog.innerHTML = progHTML(deck, i);
      if (res) res.innerHTML = "";
      if (btn) { btn.classList.add("hidden"); btn.disabled = true; }
      if (card) { card.innerHTML = ""; card.className = "w2m-town"; }

      const J = judgeFor(c.key, { pos });
      const E = window.WingerEngine, M = window.W2Moment;
      /* ⚠️ 엔진이나 미니게임이 아직 안 실렸으면 **중립 판정으로 조용히 넘어갑니다** —
       *    스크립트 하나가 안 왔다고 선수 만들기가 통째로 멈추면 안 돼요. */
      if (!E || !E.judgeAtP || !M || !M.play) { land(J.judge(0.5)); return; }
      // 🤖 자동 진행 — ⚔️ 유스 순간 카드와 같은 갈래예요 (중립 s = 0.5)
      if (autoMiniOn()) { land(J.judge(0.5)); return; }
      /* 🎮 초등은 `mf` 칸(대표 3종) · 중등부터 내 자리의 배정표(4종)가 돕니다.
       * 🔒 `MINI`는 `engine.js`의 그 표 그대로예요 — 사본을 만들면 표가 갈라집니다. */
      const pool = ((E.MINI || {})[J.kind] || {})[pos] || ["oneone"];
      M.play(card, {
        kind: J.kind, moment: pick(pool), condition: TOWN_CONDITION,
        foot: o.foot === "L" ? "L" : "R",   // 🦶 주발이 **첫 30초에** 살아나요 (판정 창 ±25%)
        judge: J.judge,
      }, (r) => land(r));
    }

    /* 카드 한 장이 끝난 자리. ⚠️ 여기서 그리는 [다음] 버튼은 **미니게임이 끝나고
     * 620ms 뒤**에 오는 콜백에서 붙습니다 — `pointerdown` 자리에 새 클릭 대상을
     * 그리는 그 이중 탭 함정과는 시점이 떨어져 있어요. */
    function land(r) {
      const c = deck[i];
      const p = PTS[r] != null ? PTS[r] : 0;
      state.rows.push({ stage: stage.id, key: c.key, res: r, pts: p });
      state.score += p;
      state.cards += 1;
      i += 1;
      if (prog) prog.innerHTML = progHTML(deck, i);
      const last = i >= deck.length;
      if (last) state.stages[stage.id] = true;
      if (res) {
        res.innerHTML = `<div class="town-res ${r === "perfect" ? "good" : r === "ok" ? "mid" : "bad"}">`
          + `${r === "perfect" ? "🔥 완벽했어요!" : r === "ok" ? "🙂 나쁘지 않았어요" : "😵 아쉬웠어요"}`
          + ` <b>+${p}</b></div>`
          /* 🔑 **단계 판수와 누적 점수를 섞어 적지 마세요** — "고등부 3판 — 7점"으로 붙으면
           *    3판에 7점을 낸 것처럼 읽힙니다. 지금까지의 누적을 따로 적습니다. */
          + (last ? `<div class="town-line">${stage.title} ${deck.length}판을 마쳤어요 —`
              + ` 지금까지 <b>${state.score}점</b> / ${state.cards}판`
              + ` <span class="town-dev">(기준 ${state.cards}점 · ${devText()})</span></div>` : "");
      }
      if (btn) {
        btn.textContent = last ? stage.next : "다음 판";
        btn.classList.remove("hidden");
        btn.disabled = false;
        btn.onclick = () => {
          btn.disabled = true;
          if (!last) { playCard(); return; }
          /* 🏟️ 제안은 **마지막 단계가 끝나야** 굴립니다 (조기 제안은 다음 작업 ①-C).
           * ⚠️ 한 번 굴린 뒤에는 다시 안 굴러요 — 그게 재도전 뒷문의 자리입니다.
           * 🔑 `played()`(세 단계 전부)가 아니라 **마지막 단계**를 봅니다 — 픽스처 생성기처럼
           *    앞 단계를 건너뛰고 온 길에서도 제안이 조용히 안 굴러 ×1.00으로 굳는 일이
           *    없어야 해요. 편차는 그때까지 실제로 뛴 카드로 재니까 여전히 중립입니다. */
          if (stage.id === STAGES[STAGES.length - 1].id && !state.offers) {
            state.offers = rollOffers(deviation());
          }
          done();
        };
      }
    }

    playCard();
  }

  const played = () => STAGES.every((s) => state.stages[s.id]);
  const deviation = () => state.score - state.cards;
  const devText = () => {
    const d = deviation();
    return `편차 ${d > 0 ? "+" : ""}${d}`;
  };

  return {
    openStage,
    playedStage: (id) => !!state.stages[id],
    played,
    score: () => state.score,
    cards: () => state.cards,
    deviation,
    rows: () => state.rows.slice(),
    STAGES: STAGES.map((s) => ({ id: s.id, n: s.n, title: s.title })),
    TOTAL_CARDS,
    offerFor: (id) => (state.offers && state.offers[id])
      || { tier: NEUTRAL_TIER, mul: OFFER[NEUTRAL_TIER].mul, star: OFFER[NEUTRAL_TIER].star,
           label: OFFER[NEUTRAL_TIER].label, word: COLD[NEUTRAL_TIER] },
    /* 🔴 **옛 세이브는 점수 3 · 카드 3입니다. `0`도 `8`도 아니에요** (설계 93번 §9).
     * 두 칸이 **짝으로** 기본값을 가져야 `d = 3 − 3 = 0`(정확히 중립)이 됩니다 —
     * 한쪽만 기본값을 주면 진행 중인 커리어가 조용히 ×0.90까지 내려가요.
     * CLAUDE.md의 *"가중 카운터를 더할 땐 옛 카운터를 이어받으세요"*와 같은 자리입니다. */
    scoreOf: (st) => (st && st.townScore != null ? st.townScore : 3),
    cardsOf: (st) => (st && st.schoolN != null ? st.schoolN : 3),
    deviationOf: (st) => ((st && st.townScore != null ? st.townScore : 3)
      - (st && st.schoolN != null ? st.schoolN : 3)),
    reset: () => { state.stages = {}; state.score = 0; state.cards = 0; state.rows = []; state.offers = null; },
    /* 🧪 실측·검사 창구. **문턱을 여기서 읽어 가지 마세요** — 상수를 바꿔도 검사가
     * 따라가서 아무것도 안 잡힙니다. 기준값은 검사에 직접 적으세요.
     * 🔑 `tierOfD`는 **구조 검사용**이에요 — 모든 `d`에서
     *    `tierOfD(d) + tierOfD(-d) === 4`인지 보면 대칭이 한 줄로 지켜집니다. */
    _t: { OFFER, SHAKE, CARDS, STAGES, PTS, NEUTRAL_TIER, BAND_EDGE, TOTAL_CARDS, ELEM_POS,
          tierOfD, rollOffers, judgeFor, evenBody, deal, TOWN_CONDITION },
  };
})();
