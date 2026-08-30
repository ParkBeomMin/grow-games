/* 🌱 유망주 · 나이 축 · 성장타입 — ⚽ 더 윙어 II 전용
 *
 * 설계: 13_designer_v2-final.md §6-2(유망주 3택) · §6-4(나이 축) · §7-1(성장타입)
 *
 * ── 왜 전용 파일인가 ──
 * timing.js·base.css·cloud.js는 8개 게임이 전부 내려받아요. 여기 들어가는 건
 * ⚽ 더 윙어 II에서만 쓰는 것이라 그쪽에 두면 안 쓰는 게임까지 무게를 집니다.
 *
 * ── 이 파일이 폐기하는 형태 ──
 * 셋 다 **시즌 번호(proYear)로 사람의 몸을 판정하던** 자리예요. 이름만 바꾸지 않고
 * 형태를 바꿉니다 — 축이 시즌 번호에서 **나이**로 옮겨가고, 성장타입이 그 위에 실려요.
 *
 *   ① career.js 결산 성장/노쇠  `proYear<=4 ? +rand(0,1)*talent : proYear>=11 ? -rand(0.6,1.8)`
 *      → 나이곡선의 기울기. 노쇠는 **지금 능력치에 비례**해요(일률 감소가 아닙니다).
 *   ② career.js 연말 평가 벌점   `agePen = (proYear-11+1) * 0.8`
 *      → 정점을 넘긴 만큼(`1 - 곡선`)
 *   ③ career.js 훈련 효율       `yearMod = proYear<=4 ? 1.1 : ... : 0.45`
 *      → **정점 나이 기준**으로 같은 눈금. 조숙은 일찍, 만성은 늦게 옵니다.
 *
 * ── 곡선 눈금 ──
 * 🌿 보통은 **동료(NPC)가 쓰는 곡선을 그대로** 부릅니다(`WingerSquad.ageCurve`).
 * 상수를 두 곳에 두면 반드시 어긋나요 — 그래서 복사하지 않고 빌려 씁니다.
 *
 * ⚠️ 여기 숫자는 **전부 제안**입니다. 나이·성장타입은 커리어 전체의 능력치 궤적을
 * 바꾸니 balancer 실측 ③(커리어 곡선·`c*` 확정)·④(성장타입 3종 ±8%)가 따라와야 해요.
 *
 * game.js의 전역(S, rand, randInt, clamp, pick, STAT_DEFS, POS_INFO, TALENT_MAX,
 * legacyTalentBonus, loadLegacy, talentStars, statCap)과 window.WingerSquad를 쓰므로
 * **game.js·squad.js 뒤에** 로드해야 해요. */
"use strict";

window.WingerProspect = (() => {
  /* ══════════════════════════════════════════════════════════════════
   * 📈 성장타입 3종 — 🔄 **재설계** (§7-1 · 2026-08-29 판정)
   *
   * ⚠️ **성장타입에 훈련 배수 칸(`train`)이 없습니다.** 훈련 쪽 보정은 성장타입의
   *    속성이 아니라 **계단의 종속값**이라, `TRAIN_NEUTRAL`에 따로 있어요(아래).
   *    여기에 다시 `train: 1.18` 같은 칸을 만들지 마세요 — 한 번 그렇게 두었다가
   *    *"성장타입의 트레이드오프 손잡이"*로 읽혀서 **멀쩡한 것을 지웠습니다.**
   *
   * **트레이드오프는 곡선 하나가 맡습니다.** 조숙을 약하게 하고 싶으면 앵커를 내리세요.
   *
   * 초판의 진짜 잘못은 **정점만 옮기고 양끝을 그대로 둔 것**이었어요. 그러면
   * 만성은 상승기가 길고 조숙은 하락기가 길어져 면적이 통째로 벌어집니다
   * (곡선 배수 20→37세 0.628 / 0.868 / 1.001).
   *
   * **조숙은 짧고 높게, 만성은 길고 낮게.** 이제 정점과 양끝이 함께 움직여요:
   *   🌱 조숙 — 20대 초반에 이미 최고(신인상·조기 이적)지만 **커리어가 가장 짧아요**
   *   🌳 만성 — 10대 후반이 아주 약해 **초반 시즌을 버려야** 하지만 30대 중후반까지 갑니다
   *
   * `pts`는 [나이, 곡선값] 앵커예요. 설계 표를 **그대로** 옮겼습니다.
   * 사이는 직선, 양 끝 밖은 끝 구간의 기울기로 늘려요 (카드 나이 17세가 여기 걸려요).
   *
   * ⚠️ **중립 검증은 「곡선 배수」가 아니라 「커리어 총 면적」**입니다 —
   *    **데뷔~38세**까지의 곡선 적분이에요. 배수로 재면 짧고 높은 타입이 구조적으로 집니다.
   *    ⚠️ **은퇴 제안 나이까지로 끊지 마세요.** 제안은 강제가 아니라 **정보**라
   *    받아들일지는 사람이 정합니다 — *선택의 결과*를 중립 대상으로 삼으면
   *    *"잘 고른 사람과 못 고른 사람이 같아야 한다"*가 돼요(원칙 ⑥의 반대 형태).
   *
   * ⚠️ 🌿 보통이 **더는 NPC 곡선과 같지 않습니다**(정점 26 vs NPC 27 · 18세 0.70 vs 0.68).
   *    §6-4의 *"NPC가 쓰는 자를 그대로"*는 이제 **모델**(`정점값 × 곡선`)을 가리키고
   *    숫자가 아니에요. 동료(squad.js)는 자기 곡선을 그대로 씁니다 — 안 건드렸어요. */
  const GROWTH_TYPES = [
    { id: "early",  emoji: "🌱", name: "조숙", peak: 22,
      pts: [[18, 0.84], [22, 1.00], [26, 0.97], [30, 0.88], [34, 0.76], [38, 0.62]] },
    { id: "normal", emoji: "🌿", name: "보통", peak: 26,
      pts: [[18, 0.70], [22, 0.88], [26, 1.00], [30, 0.93], [34, 0.82], [38, 0.70]] },
    { id: "late",   emoji: "🌳", name: "만성", peak: 30,
      pts: [[18, 0.56], [22, 0.74], [26, 0.90], [30, 1.00], [34, 0.88], [38, 0.72]] },
  ];
  const NORMAL = GROWTH_TYPES.find((g) => g.id === "normal");

  /* 🗣️ 스카우트 코멘트 — 성장타입을 **흐릿하게** 두는 장치예요 (§6-2).
   * 전부 공개하면 만성이 늘 정답이 되고, 전부 감추면 순수 운입니다.
   * `w`는 [조숙, 보통, 만성]의 가중치예요. */
  const HINTS = [
    { id: "early", text: "또래보다 몸이 빨리 여물었다는 평이에요", w: [0.7, 0.3, 0.0] },
    { id: "late",  text: "기본기부터 차근히 쌓는 스타일이래요",   w: [0.0, 0.3, 0.7] },
    { id: "mixed", text: "코치들 사이에 평이 갈려요",             w: [1 / 3, 1 / 3, 1 / 3] },
  ];

  /* ⚠️ 결함 8종 (§6-2 — 제안) · ⭐ 특능 (§7-2)
   *
   * 🚧 **지금은 칸만입니다.** 효과를 경기에 거는 건 설계 §11의 7번(특능 엔진)이에요.
   * 카드에 이름이 뜨고 세이브에 남기까지만 합니다 — `eff`는 그때 읽을 자리예요.
   *
   * 결함은 "약한 카드"를 만드는 장치가 아니에요. 세 장의 기대 강도는 같아야 하고,
   * 다른 건 **어떤 게임을 하게 되느냐**입니다. 그래서 결함마다 반대급부가 붙어요.
   *
   * ⚠️ 🩹 유리몸의 반대급부("초기 배분 한 칸 높음")는 **일부러 안 걸었습니다** —
   *    부상 확률(불이익)이 아직 안 붙었는데 배분만 올리면 그 카드가 그냥 좋아져요.
   *    둘은 특능 엔진에서 **같이** 켜야 합니다. */
  const FLAWS = [
    { id: "glass",  emoji: "🩹", name: "유리몸",      desc: "부상이 잦아요",                 eff: { injury: 1.6, statBonus: 1 } },
    { id: "greedy", emoji: "😤", name: "욕심쟁이",    desc: "골에 욕심을 내요",             eff: { assist: -0.10, goal: 0.14 } },
    { id: "timid",  emoji: "🥶", name: "새가슴",      desc: "큰 순간에 얼어요",             eff: { moment: -0.08, train: 0.10 } },
    { id: "slow",   emoji: "🐢", name: "굼벵이",      desc: "발이 늦게 트여요",             eff: { growSpeed: 0.7, growBody: 1.15 } },
    { id: "lone",   emoji: "🗣️", name: "독불장군",    desc: "동료와 잘 못 어울려요",         eff: { trust: 0.5, goal: 0.08 } },
    { id: "away",   emoji: "🌧️", name: "원정 울렁증", desc: "원정에서 힘을 못 써요",         eff: { away: -0.07, home: 0.07 } },
    { id: "slowst", emoji: "📉", name: "슬로 스타터", desc: "시즌 초에 시동이 느려요",       eff: { early8: -0.12, late8: 0.12 } },
    { id: "cold",   emoji: "🧊", name: "냉정",        desc: "감정에 잘 흔들리지 않아요",     eff: { lockChoice: 1, moment: 0.05 } },
  ];

  /* ⭐ 특능 — §7-2가 "일반 **12종**"을 적었지만 **목록은 아직 없습니다.**
   * 여기 있는 셋은 설계가 이름까지 적어 둔 것뿐이에요(조건부 효과의 예시).
   * 나머지 9종은 designer가 특능 엔진(§11-7)에서 확정합니다 — 지어내지 않았어요.
   *
   * 효과의 절반 이상이 **조건부**여야 해요(원칙 ⑦). 조건부면 고르게 키운 쪽이
   * 조건을 더 자주 만족해서, 몰빵 메타에 반대 압력이 걸립니다.
   *
   * ⚠️ **`eff`를 읽는 코드가 아직 없습니다.** 실측으로 확인했어요 —
   *    커리어 한 벌 동안 `S.traits`·`S.flaw` **읽기 0회**(같은 탐침에서 `S.stats`는 10,792회).
   *
   *    그래서 **문구에서 수치를 뺍니다.** "70분 이후 골 +22%"라고 적어 두면
   *    플레이어가 **그 수치를 근거로 카드를 고릅니다.** 안 돌아가는 숫자는
   *    노이즈보다 나빠요 — 없는 것보다 틀린 게 더 해롭습니다.
   *    **엔진이 `eff`를 실제로 읽기 시작하면 그때 수치를 되돌려주세요.**
   *    `eff` 값 자체는 엔진이 쓸 예정이라 그대로 둡니다. */
  const TRAITS = [
    { id: "late70",  emoji: "⭐", name: "늦은 시간의 사나이", desc: "경기 막판에 강해요",       eff: { when: "late", goal: 0.22 } },
    { id: "chaser",  emoji: "⭐", name: "추격자",             desc: "지고 있을 때 더 달려요", eff: { when: "behind2", all: 0.18 } },
    { id: "bigGame", emoji: "⭐", name: "빅게임 플레이어",     desc: "큰 무대에서 강해요",       eff: { when: "knockout", moment: 0.12 } },
  ];
  const TRAIT_SLOTS = 6;          // 장착 칸 (§7-2). 지금은 자리만 만들어 둬요

  /* ══════════════════════════════════════════════════════════════════
   * 🗑️ 폐기한 손잡이 셋 — **되살리지 마세요**
   *
   * · `AGE_GAIN` (곡선 상승을 능력치에 얼마나 실을지)
   *   → 곡선이 **읽는 순간** 곱해집니다(`nowStats`). 시즌 결산 성장/노쇠 자체가 없어졌어요.
   *     (참고: 설계의 `c*`는 이것이 아니라 **`condMul`의 컨디션 기준점 80**입니다 —
   *      54번 보고서가 잘못 이름 붙였던 자리예요)
   * · `AGE_PEN` (연말 평가 나이 벌점)
   *   → `overall()`이 이미 곡선만큼 내려갑니다. 벌점을 또 걸면 **나이를 두 번 세요.**
   *     훈련 배수를 지운 것과 **같은 근거**입니다 (§7-1 ①).
   * · `AGE_TRADE` (카드 나이 보정)
   *   → 카드 레이더가 `정점값 × 곡선`이라 **반대급부가 저절로 생깁니다.** 손잡이가 필요 없어요.
   *
   * ⚠️ 셋 다 "곡선이 이미 하는 일"을 한 번 더 하던 계수예요. 이름을 바꿔 되살리면
   *    같은 축을 두 번 세게 됩니다. */

  /* 🎂 나이 축 (§6-4) */
  /* 🎂 카드 나이는 **셋 다 17세**예요 — 17~19로 굴리던 것을 폐기했습니다 (§6-2 재판정).
   *
   * ⓑ안(정점 기준값 × 곡선)이 **능력치는 풀었지만 시간을 못 풀었어요.** 같은 총합이라도
   * 17세 카드는 19시즌, 19세 카드는 17시즌을 뜁니다 — 실측 총 상 **12.5% 차**.
   * **시간은 다른 무엇으로도 못 삽니다.** 스탯으로도, 특능으로도 보정이 안 돼요.
   *
   * ⚠️ **카드가 밋밋해지지 않습니다.** 나이 다양성은 **성장타입이 이미 만들어요** —
   *    같은 18세라도 곡선이 조숙 0.84 · 보통 0.70 · 만성 0.56이라 레이더 크기가
   *    확 다릅니다. 반대급부가 나이 칸에서 성장타입 칸으로 옮겨간 것뿐이고,
   *    **하나의 칸이 하나의 이야기를 해서 더 깨끗해집니다.**
   *
   * ⚠️ ⓑ(정점 기준값 + 곡선 곱)는 **그대로 유지**합니다. 나이가 같아도 곡선이 다르니까요.
   *
   * 🔴 **왜 18이 아니라 17인가 — 유스가 3년이라 `카드 나이 + 3 = 데뷔 나이`입니다.**
   *    18로 두면 데뷔가 만 21세가 되는데, 그건 실제 프로 데뷔(18~20세)보다 늦고
   *    balancer의 커리어 측정이 전부 **만 20세 기준**이라 값을 통째로 다시 재야 해요.
   *    17이면 데뷔 **만 20세**, 커리어는 20~38세 = **18시즌**입니다
   *    (은퇴 제안을 받아들이면 조숙 14 · 보통 16 · 만성 17시즌).
   *    ⚠️ 이 값을 옮기면 **데뷔 나이가 통째로 따라 움직입니다** — 곡선 위 어디에서
   *    커리어가 시작하느냐가 바뀌니, 면적·훈련 총량·출전을 전부 다시 재세요. */
  const CARD_AGE = 17;
  const START_AGE = 18;           // 나이 칸이 없는 옛 세이브의 출발 나이
  const RETIRE_AGE = 38;          // 이 나이의 시즌이 마지막 — 다음은 없어요
  /* 🕯️ 곡선이 여기 밑이고 — **0.75에서 0.78로.** 정점 가드와 **한 벌**입니다 (§6-4 재판정).
   * 0.75로는 🌳 만성이 은퇴 제안을 **영영 못 받았어요**(37세 곡선 0.760 > 0.75).
   * ⚠️ 이건 "세기 손잡이"가 아니라 *"정점의 몇 할 아래로 내려갔나"*예요 —
   *    `GROWTH_TYPES` 앵커를 옮기면 **여기도 따라 옮겨야** 합니다(종속값). */
  const RETIRE_CURVE = 0.78;
  const LOW_APPS = 15;            // 출전이 이만큼도 안 되는 시즌이
  const LOW_RUN = 2;              // 이만큼 연달아 나오면 은퇴 제안
  const PEAK_SHIFT_MAX = 2;       // 정점 나이 이동 상한 (커리어당)
  const HOT_RUN = 3;              // 평균 평점 7.0↑ 시즌이 이만큼 연속이면 정점 +1
  const HOT_BAR = 7.0;

  /* 🌱 유망주 카드 (§6-2) */
  const CARDS = 3;
  const REROLL_MAX = 2;           // 무제한 리롤을 대체합니다 — "타고난 것"이 살아나요
  const POOL = 194;               // 세 장의 스탯 총합. 옛 rollStats의 기대 총합(6×31+8)과 같아요
  const STAT_LO = 18, STAT_HI = 54;   // 한 칸이 극단으로 쏠려 못 쓰는 카드가 되지 않게

  /* 🏫 유스가 바꾸는 것은 **풀의 분포**예요 (§6-1).
   * 브라질 풀에서는 드리블 편중 카드가, 이탈리아 풀에서는 수비 편중 카드가 자주 나와요.
   * 총합은 안 건드립니다 — 유스는 "무엇을 잘 가르치나"지 "얼마나 좋은가"가 아니에요.
   * ⚠️ 키는 MARKETS의 id예요. 옛 세이브가 가리키는 값이라 안 바꿔요
   *    ("af"는 🇬🇧 잉글랜드, "eu"는 🇮🇹 이탈리아입니다 — 이름만 바뀐 자리예요). */
  const YOUTH_FOCUS = {
    k:  ["stamina", "pass"],        // 🇰🇷 체계적인 국내 유스
    jp: ["pass", "dribble"],        // 🇯🇵 정교한 패스 축구
    br: ["dribble", "shoot"],       // 🇧🇷 길거리 축구로 다져진 개인기
    af: ["speed", "stamina"],       // 🇬🇧 피지컬과 속도를 먼저
    eu: ["defense", "pass"],        // 🇮🇹 전술과 수비 조직
  };
  const FOCUS_W = 1.30;             // 유스가 미는 칸
  const POS_W = 1.25;               // 내 포지션 주 스탯
  const SHAPE_W = 1.35;             // 그 카드만의 편중 — 세 장이 서로 달라 보이게

  /* ══════════════════════════════════════════════════════════════════
   * 읽는 쪽 기본값 — **마이그레이션하지 않습니다** (§9-2)
   * ══════════════════════════════════════════════════════════════════ */

  /* 🎂 나이. 칸이 없는 옛 세이브는 **지금까지 흐른 시간에서 되짚어요.**
   * 그냥 18을 주면 15시즌을 뛴 노장이 갑자기 열여덟이 돼서 다시 크기 시작해요 —
   * 기본값이 중립이 아니면 그건 기능 추가가 아니라 밸런스 변경입니다. */
  function ageOf(st) {
    const S0 = st || (typeof S !== "undefined" ? S : null);
    if (!S0) return START_AGE;
    if (S0.age != null) return S0.age;
    const youth = Math.max(0, (S0.year || 1) - 1);
    const pro = Math.max(0, S0.proYear || 0);
    return START_AGE + youth + pro;
  }

  const typeOf = (st) => {
    const S0 = st || (typeof S !== "undefined" ? S : null);
    const id = (S0 && S0.growthType) || "normal";
    return GROWTH_TYPES.find((g) => g.id === id) || NORMAL;
  };
  const shiftOf = (st) => {
    const S0 = st || (typeof S !== "undefined" ? S : null);
    return clamp((S0 && S0.peakShift) || 0, 0, PEAK_SHIFT_MAX);
  };
  const flawOf = (st) => {
    const S0 = st || (typeof S !== "undefined" ? S : null);
    return FLAWS.find((f) => f.id === ((S0 && S0.flaw) || "")) || null;
  };
  const traitsOf = (st) => {
    const S0 = st || (typeof S !== "undefined" ? S : null);
    return (S0 && Array.isArray(S0.traits) ? S0.traits : []);
  };
  const peakAgeOf = (st) => typeOf(st).peak + shiftOf(st);

  /* ══════════════════════════════════════════════════════════════════
   * 나이곡선
   * ══════════════════════════════════════════════════════════════════ */

  /* 앵커 사이는 직선, 밖은 끝 구간의 기울기로 늘려요. */
  function pieceAt(pts, a) {
    if (a <= pts[0][0]) {
      const [x0, y0] = pts[0], [x1, y1] = pts[1];
      return y0 + ((y1 - y0) / (x1 - x0)) * (a - x0);
    }
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      if (a <= x1) return y0 + ((y1 - y0) / (x1 - x0)) * (a - x0);
    }
    const [x0, y0] = pts[pts.length - 2], [x1, y1] = pts[pts.length - 1];
    return y1 + ((y1 - y0) / (x1 - x0)) * (a - x1);
  }

  /* 성장타입 t의 나이 a에서의 곡선값. `shift`는 정점 나이 이동이에요 —
   * 곡선을 통째로 오른쪽으로 밀어서 꺾이는 때를 늦춥니다. */
  function curveAt(t, a, shift) {
    const g = typeof t === "string" ? (GROWTH_TYPES.find((x) => x.id === t) || NORMAL) : (t || NORMAL);
    return pieceAt(g.pts, a - (shift || 0));
  }
  /* 세이브 하나의 지금 곡선값 — 화면과 판정이 같은 값을 봐야 하니 여기 한 곳에서만. */
  const ageMul = (st, a) => curveAt(typeOf(st), a == null ? ageOf(st) : a, shiftOf(st));

  /* ══════════════════════════════════════════════════════════════════
   * 🎯 **지금 실력** — `S.stats`는 정점 기준값이고, 곡선은 여기서 곱합니다
   *
   * 동료(NPC)가 이미 쓰는 모델 그대로예요 — `squad.js`의 `strOfRow`가
   * `peak × ageCurve(age)`로 *지금 실력*을 내는 것과 **같은 자**입니다.
   *
   *   세이브(`S.stats`)  = 정점 기준값. 훈련·각성·장비가 올리는 건 **이 값**이에요
   *   지금 실력          = 정점 기준값 × 곡선(나이, 성장타입)   ← 판정과 화면이 보는 값
   *
   * 이 구조가 하는 일 둘:
   *   ① 유망주 카드 세 장의 **총합이 같으면서도** 나이·성장타입이 반대급부를 냅니다 —
   *      🌳 만성 17세는 곡선 0.5대라 지금 아주 약해 보이지만, 시간이 지나면 같아져요.
   *      `AGE_TRADE` 같은 손잡이가 **필요 없는 이유**예요.
   *   ② 성장·노쇠에 **시즌 결산 단계가 없습니다.** 나이가 한 살 오르면 곡선이 따라
   *      움직여서 끝이에요 — 그래서 *정체 구간*이 구조적으로 생길 수가 없습니다.
   *
   * 🗑️ 폐기: 옛 `growthDelta`(곡선 기울기를 결산에서 `S.stats`에 더하던 것).
   *    `S.stats`가 정점 기준값인데 거기에 곡선을 또 누적하면 **기준값이 아니게 됩니다** —
   *    카드가 약속한 *"시간이 지나면 같아져요"*가 깨져요.
   *
   * ⚠️ §9-2 규칙 6 — 없는 칸은 `|| 0`이 아니라 **나머지 평균**이에요.
   *    0으로 채우면 종합이 내려가는데, 나머지 평균이면 `(합+평균)÷(n+1) = 평균`이라
   *    소수점까지 안 흔들립니다. */
  function nowStats(st) {
    const S0 = st || (typeof S !== "undefined" ? S : null);
    const src = (S0 && S0.stats) || {};
    const keys = STAT_DEFS.map((d) => d.key);
    const have = keys.filter((k) => src[k] != null);
    const mean = have.length ? have.reduce((a, k) => a + src[k], 0) / have.length : 40;
    const c = ageMul(S0);
    const out = {};
    for (const k of keys) out[k] = (src[k] == null ? mean : src[k]) * c;
    return out;
  }

  /* 🏋️ 훈련 효율의 나이 계단 — **정점 나이 기준**이에요.
   * 옛 `yearMod = proYear<=4 ? 1.1 : <=9 ? 1.0 : <=12 ? 0.7 : 0.45`를 대체합니다.
   * 눈금(1.1 / 1.0 / 0.7 / 0.45)은 그대로 두고 **기준을 시즌 번호에서 정점 나이로**
   * 옮겼어요 — 스무 살 데뷔·보통 타입이면 옛 값과 거의 같은 자리에 떨어집니다. */
  const trainStep = (age, peak) =>
    age <= peak - 4 ? 1.1 : age <= peak + 1 ? 1.0 : age <= peak + 4 ? 0.7 : 0.45;

  /* ══════════════════════════════════════════════════════════════════
   * 🧮 **훈련 계단 보정 — 중립화 상수입니다. 트레이드오프 손잡이가 아니에요.**
   *
   * ── 무엇을 하나 ──
   * 계단이 **정점 나이 기준**이라, 정점이 이른 타입은 배우는 창(1.1 → 1.0)을 일찍
   * 지나 남은 커리어를 0.7 · 0.45에서 보냅니다. 스무 살 데뷔·조숙(정점 22)은
   * **데뷔하는 해에 이미 1.0**이고 스물일곱부터 0.45예요.
   * 그건 설계된 불이익이 아니라 **계단을 정점에 걸어 둔 데서 나오는 부산물**입니다.
   * 이 상수는 그 부산물을 지웁니다 — 커리어 훈련 총량을 세 타입이 같게 만들어요.
   *
   * ── 🔴 이 값을 만지려는 사람에게 ──
   * **성장타입을 세게/약하게 하려고 여기를 건드리지 마세요.**
   * *"만성이 세니까 ×0.7로"* 같은 것이 정확히 하면 안 되는 일이에요.
   * **트레이드오프는 곡선이 맡습니다** — 세기를 바꾸려면 `GROWTH_TYPES`의 앵커를 옮기세요.
   * 훈련과 곡선이 둘 다 세기를 정하면 서로 얽혀서, 어느 쪽을 만져도 다른 쪽이 깨집니다.
   *
   * ── 🔴 종속값입니다 — 계단을 바꾸면 **여기를 다시 역산해야 해요** ──
   * 값은 손으로 고른 게 아니라 계단에서 나왔습니다:
   *
   *     TRAIN_NEUTRAL[t] = Σ trainStep(a, peak(보통)) ÷ Σ trainStep(a, peak(t))
   *                        (a = 데뷔 20세 ~ 37세)
   *
   * `trainStep`의 눈금(1.1/1.0/0.7/0.45)이나 구간(−4 / +1 / +4)을 바꾸거나,
   * `GROWTH_TYPES`의 **정점 나이**를 옮기면 **이 셋이 전부 틀어집니다.** 다시 재세요.
   *
   * ── 왜 이름이 「훈련 상승폭」이 아닌가 ──
   * 처음엔 ×1.18 / ×0.86을 성장타입의 `train` 칸에 뒀습니다. 그러니
   * *"조숙은 훈련이 빠르다"*는 **트레이드오프 손잡이**로 읽혔고,
   * 계단과 상쇄되는 걸 보고 *"아무 일도 안 하는 계수"*라 판단해 **지웠어요.**
   * 지우자 계단의 불균형이 그대로 드러났습니다(훈련 총량 **81.5 / 100 / 119.2**).
   * 상쇄되고 있던 게 아니라 **상쇄하고 있던** 것이었어요.
   * 그래서 이름을 바꿉니다 — 이건 성장타입의 성질이 아니라 **계단의 짝**입니다.
   *
   * ⚠️ 제안값입니다. balancer가 게임을 굴려 확인해요 (목표 ±3%). */
  const TRAIN_NEUTRAL = { early: 1.226, normal: 1.000, late: 0.839 };

  function trainMul(st) {
    const t = typeOf(st);
    const n = TRAIN_NEUTRAL[t.id];
    return (n == null ? 1 : n) * trainStep(ageOf(st), peakAgeOf(st));
  }

  /* ══════════════════════════════════════════════════════════════════
   * 나이를 먹고, 은퇴를 판정합니다
   * ══════════════════════════════════════════════════════════════════ */

  /* 시즌·연차가 하나 넘어갈 때 한 살. 유스에서도 프로에서도 같은 자를 씁니다. */
  function birthday(st) {
    const S0 = st || S;
    if (!S0) return;
    S0.age = ageOf(S0) + 1;
  }

  /* 시즌 결산에서 한 번 — 출전이 적은 시즌이 몇 번 연달았는지,
   * 잘한 시즌이 몇 번 연달았는지 세요. 둘 다 없던 칸이라 읽는 쪽이 기본값을 줍니다. */
  function seasonTally(st, apps, avgRating) {
    const S0 = st || S;
    if (!S0) return;
    S0.lowApps = (apps || 0) < LOW_APPS ? ((S0.lowApps || 0) + 1) : 0;
    /* 📈 3시즌 연속 평균 평점 7.0↑이면 정점 나이가 한 살 늦춰져요 (§7-1).
     * 고정 라벨이 아니라는 걸 말하는 자리예요 — 잘하면 전성기가 길어집니다. */
    if (avgRating != null && avgRating >= HOT_BAR) {
      S0.hotRun = (S0.hotRun || 0) + 1;
      if (S0.hotRun >= HOT_RUN && shiftOf(S0) < PEAK_SHIFT_MAX) {
        S0.peakShift = shiftOf(S0) + 1;
        S0.hotRun = 0;
        return true;          // 화면이 "전성기가 늘었어요"를 적을 수 있게
      }
    } else {
      S0.hotRun = 0;
    }
    return false;
  }

  /* 더는 뛸 수 없는 나이. 옛 `proYear >= 15`(시즌 수 고정)를 대체해요. */
  const mustRetire = (st) => ageOf(st) >= RETIRE_AGE;

  /* 은퇴 **제안** — 강제가 아니에요. 더 뛸지는 사람이 정합니다 (§6-4).
   *
   * 🔴 **정점을 넘겼는지를 반드시 함께 봅니다.** 나이곡선은 **뒤집힌 U자**라
   * 문턱 하나로 판정하면 **오르막에도 걸려요** — 🌳 만성 만 19~22세(곡선 0.56~0.74)가
   * `🕯️ 은퇴를 생각해 볼 때입니다`를 받았습니다. 정작 만 33~37세에는 안 받고요.
   * 실측으로 잡힌 자리예요(27번 ⓐ).
   *
   * ⚠️ **문턱(0.78)과 이 가드는 한 벌입니다. 하나만 넣으면 각각 다르게 고장나요:**
   *   · 가드만  → 🌳 만성이 은퇴 제안을 **영영 못 받음** (37세 0.760 > 0.75)
   *   · 문턱만  → 오르막 제안이 **만 23세까지 넓어짐** */
  const suggestRetire = (st) =>
    !mustRetire(st)
    && ageOf(st) > peakAgeOf(st)                       // 🔴 내리막에서만 — 방향 가드
    && ageMul(st) < RETIRE_CURVE
    && ((st && st.lowApps) || 0) >= LOW_RUN;

  /* ══════════════════════════════════════════════════════════════════
   * 🌱 유망주 카드 3장
   * ══════════════════════════════════════════════════════════════════ */

  /* 가중치대로 하나 뽑기. w의 합이 0이면 첫 칸이에요. */
  function pickW(list, w) {
    let sum = 0;
    for (const v of w) sum += v;
    if (!(sum > 0)) return list[0];
    let r = Math.random() * sum;
    for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }

  /* 한 장의 6스탯 — **총합이 정확히 목표값**이 되게 나눠요.
   *
   * 🚨 세 장의 총합이 같아야 합니다 (§6-2 · 원칙 ④). 한 장이 그냥 좋으면
   * 그건 선택이 아니라 정답이에요. 그래서 반올림 뒤에 남는 우수리까지 되돌려 놓아요 —
   * 한 장만 1 높아도 "총합이 같다"는 약속이 깨집니다. */
  function spread(total, posKey, focus, shapeKey) {
    const keys = STAT_DEFS.map((d) => d.key);
    const w = {};
    for (const k of keys) {
      w[k] = rand(0.85, 1.15);
      if (focus.indexOf(k) >= 0) w[k] *= FOCUS_W;
      if (k === posKey) w[k] *= POS_W;
      if (k === shapeKey) w[k] *= SHAPE_W;
    }
    let wSum = 0;
    for (const k of keys) wSum += w[k];
    const out = {};
    for (const k of keys) out[k] = clamp(Math.round((w[k] / wSum) * total), STAT_LO, STAT_HI);
    /* 우수리 되돌리기 — 반올림과 clamp로 어긋난 만큼을 한 칸씩 옮겨요.
     * 옮길 자리가 없으면(전부 상·하한) 멈춥니다 — 무한 반복을 막는 자리예요. */
    for (let guard = 0; guard < 400; guard++) {
      let sum = 0;
      for (const k of keys) sum += out[k];
      const diff = total - sum;
      if (diff === 0) break;
      const step = diff > 0 ? 1 : -1;
      const room = keys.filter((k) => (step > 0 ? out[k] < STAT_HI : out[k] > STAT_LO));
      if (!room.length) break;
      out[pick(room)] += step;
    }
    return out;
  }

  /* ⭐ 잠재력(재능)은 **카드 칸이 아니에요** (§6-2의 다섯 칸에 없습니다).
   * 세 장이 공유해요 — 카드마다 따로 굴리면 한 장이 재능만으로 그냥 좋아져서
   * "총합은 같다"를 지켜도 기대 강도가 어긋납니다. */
  function rollTalents(pos) {
    const bonus = legacyTalentBonus(loadLegacy().pts);
    const t = {};
    for (const d of STAT_DEFS) t[d.key] = Math.min(rand(0.8, 1.45) + bonus, TALENT_MAX);
    const ps = POS_INFO[pos].stat;
    t[ps] = Math.max(t[ps], 1.05);
    return t;
  }

  /* 🧒 이름 — game.js의 `randomPlayerName`을 그대로 씁니다(유스 지역에 맞는 이름이 나와요).
   * 없는 환경이면 조용히 빈 문자열이라, 이름 줄만 안 보이고 카드는 그대로 돕니다. */
  function cardName(marketId, taken) {
    if (typeof randomPlayerName !== "function") return "";
    for (let i = 0; i < 12; i++) {
      const n = randomPlayerName({ id: marketId });
      if (!taken.some((c) => c.name === n)) return n;
    }
    return randomPlayerName({ id: marketId });
  }

  /* 세 장을 한 번에 뽑아요. 특능·결함·편중 스탯은 **서로 겹치지 않게** 나눠 줍니다 —
   * 같은 결함이 둘이면 고를 게 없어요. */
  function rollCards(marketId, pos) {
    const focus = YOUTH_FOCUS[marketId] || [];
    const posKey = POS_INFO[pos].stat;
    const shapePool = STAT_DEFS.map((d) => d.key).slice();
    const traitPool = TRAITS.slice();
    const flawPool = FLAWS.slice();
    const cards = [];
    for (let i = 0; i < CARDS; i++) {
      const age = CARD_AGE;
      const hint = HINTS[i % HINTS.length];
      /* 성장타입은 **여기서 굴러 카드에 숨어 있어요.** 화면에는 코멘트만 나갑니다. */
      const type = pickW(GROWTH_TYPES, hint.w);
      const shapeKey = shapePool.length ? shapePool.splice(Math.floor(Math.random() * shapePool.length), 1)[0] : posKey;
      const trait = traitPool.length ? traitPool.splice(Math.floor(Math.random() * traitPool.length), 1)[0] : null;
      const flaw = flawPool.length ? flawPool.splice(Math.floor(Math.random() * flawPool.length), 1)[0] : null;
      cards.push({
        age, hint, shapeKey,
        /* 🧒 **이름.** 카드에 이름이 없으면 `🎂 17세` 셋을 견주게 돼요 —
         * 누구를 데려오는지가 화면에 없었습니다. 여기서 붙인 이름이 이름 화면의
         * 기본값으로 그대로 넘어가요 (game.js `openProspect`). 세 장은 안 겹칩니다. */
        name: cardName(marketId, cards),
        growthType: type.id,
        trait: trait ? trait.id : null,
        flaw: flaw ? flaw.id : null,
        // 📊 **정점 기준값**이에요 — 세 장의 총합이 같습니다. 화면 레이더는 여기에 곡선을 곱해요
        stats: spread(POOL, posKey, focus, shapeKey),
      });
    }
    /* 세 장의 코멘트가 늘 같은 순서로 나오면 "첫째 칸이 조숙"이 정답이 돼요. */
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = cards[i].hint; cards[i].hint = cards[j].hint; cards[j].hint = t;
      const g = cards[i].growthType; cards[i].growthType = cards[j].growthType; cards[j].growthType = g;
    }
    return { cards, talents: rollTalents(pos) };
  }

  /* 카드 레이더에 그릴 값 — **정점 기준값 × 곡선(나이, 숨은 성장타입)**.
   * 세 장의 총합은 같지만 **보이는 크기는 다릅니다.** 그게 나이 칸의 반대급부예요. */
  function cardShown(card) {
    const c = curveAt(card.growthType, card.age, 0);
    const out = {};
    for (const d of STAT_DEFS) out[d.key] = card.stats[d.key] * c;
    return out;
  }

  /* 고른 카드를 세이브에 심어요. 특능·결함은 **자리만** 잡습니다 (효과는 §11-7). */
  function applyCard(st, card, rerolls) {
    const S0 = st || S;
    if (!S0 || !card) return S0;
    S0.age = card.age;
    S0.growthType = card.growthType;
    S0.peakShift = 0;
    S0.flaw = card.flaw || "";
    S0.traits = card.trait ? [card.trait] : [];
    /* 장착 6칸 — 첫 칸에 유망주 특능이 들어가고 나머지는 비어 있어요.
     * 시즌마다 "이번엔 뭘 켤까"가 되는 자리입니다 (§7-2). */
    S0.traitSlots = [];
    for (let i = 0; i < TRAIT_SLOTS; i++) S0.traitSlots.push(i === 0 ? (card.trait || null) : null);
    S0.rerolls = rerolls || 0;
    S0.lowApps = 0;
    S0.hotRun = 0;
    return S0;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 화면 — **최소한만.** 연출과 실루엣은 director 몫이에요 (§11-11).
   * 클래스 이름을 남겨 두니 style.css에서 그대로 잡으면 됩니다.
   * ══════════════════════════════════════════════════════════════════ */

  let draw = null;          // { market, pos, cards, talents, left }

  const traitById = (id) => TRAITS.find((t) => t.id === id) || null;
  const flawById = (id) => FLAWS.find((f) => f.id === id) || null;

  /* 🖐️ 스와이프 — 카드가 곧 버튼이라, **끌었으면 누른 게 아니어야** 해요.
   * 손가락이 12px 넘게 움직이면 그 손가락의 click은 무시합니다. */
  const DRAG_MIN = 12;

  /* 🎨 카드마다 색이 하나 — 지금 몇 번째 카드인지가 색으로도 읽혀요.
   * 📊 견주기 시트의 열 머리가 **같은 색**을 씁니다 (🅰️는 어디서나 🅰️). */
  const TONE = ["a", "b", "c"];
  const MARK = ["🅰️", "🅱️", "🅲"];

  /* 🧒 CSS 실루엣 — 이미지도 캔버스도 없이 `<i>` 여덟 개로 그려요.
   * 3D(char3d.js)가 들어오면 이 자리를 그대로 덮습니다 — 그때도 **폴백으로 남습니다**. */
  function figureHTML(card, i) {
    const h = (String(card.shapeKey || "").charCodeAt(0) || 65) % 3;
    return `<span class="pc-silhouette tone-${TONE[i % 3]} hair-${h}" aria-hidden="true">`
      + `<i class="s-leg l"></i><i class="s-leg r"></i>`
      + `<i class="s-arm l"></i><i class="s-arm r"></i>`
      + `<i class="s-body"></i><i class="s-head"></i><i class="s-hair"></i><i class="s-ball"></i>`
      + `</span>`;
  }

  /* ⭐ 잠재력이 가장 높은 칸에만 별 하나 — *"이 칸은 더 클 수 있어요"*가
   * 그 줄에서 읽혀야 해요. 자세한 다섯 칸짜리 표는 📊 견주기 시트에 있습니다.
   * (잠재력은 세 장이 함께 쓰는 값이라 카드마다 다르지 않아요) */
  function starKeys(talents) {
    if (!talents || typeof talentStars !== "function") return [];
    const st = STAT_DEFS.map((d) => ({ k: d.key, n: talentStars(talents[d.key]) }));
    const top = Math.max.apply(null, st.map((x) => x.n));
    return top >= 3 ? st.filter((x) => x.n === top).map((x) => x.k) : [];
  }

  /* 📏 **잠재력 바** — 카드와 📊 견주기 시트가 함께 쓰는 **절대 자**(값 ÷ STAT_HI).
   *
   * ⚠️ 유스 홈·💼 준비 화면의 **XP 바**(`.bar-fill.xp` = 다음 승급까지)와 **다른 자**예요.
   *    이름을 다르게 부릅니다 — 둘 다 "XP 바"면 다음 사람이 통일하려 듭니다.
   *
   * 🔑 **자는 그 화면이 던지는 질문이 정해요.**
   *    🌱 카드·📊 시트가 묻는 건 *"셋 중 어느 게 나은가"*라 **절대 크기**여야 하고,
   *    🏠 유스 홈·💼 준비가 묻는 건 *"다음 승급까지 얼마나"*라 **구간 진행률**이어야 합니다.
   *
   * 🔴 구간 진행률로 그렸을 때 실제로 렌더에서 잰 값입니다(2026-08-30 · 390px):
   *      `⚽ 슛 42(E)` → **18.4px** · `🎯 패스 40(E)` → **0px**
   *      `🏃 드리블 30(F)` → **124.5px** · `⚡ 스피드 24(F)` → **99.6px**
   *    여섯 칸에서 **가장 좋은 칸이 가장 짧고 가장 나쁜 칸이 길었어요.**
   *    "작아서 안 보인다"가 아니라 **바가 순서를 거꾸로 말하고 있던 것**입니다. */
  const potPct = (v) => Math.max(0, Math.min(100, (Number(v) / STAT_HI) * 100));

  /* 📊 능력치 여섯 줄.
   *
   * ⚠️ 등급을 매기는 값은 **정점 기준값(`card.stats`)**이에요 — 위 레이더가 그리는
   * *지금 실력*이 아닙니다. 두 값이 다른 걸 일부러 그대로 둡니다:
   *   레이더 = 지금 얼마나 여물었나 (나이·성장타입이 만드는 반대급부)
   *   등급   = 타고난 몸이 어떤 모양인가 (세 장의 총합이 같은 그 값)
   * 등급을 지금 실력으로 매기면 세 장이 전부 `F`로 깔려요 —
   * 열일곱의 곡선이 0.56~0.84라 18~54가 10~45로 눌립니다. 그러면 카드를 못 고릅니다.
   *
   * 🔑 **글자보다 바가, 바보다 ⭐가 일합니다.** 열일곱의 타고난 값은 18~54라
   * 여섯 칸이 거의 `F`(~39) 아니면 `E`(40~57)예요. 전부 F일 때 알아야 할 건
   * *"지금 얼마나"*가 아니라 ***"어디까지 클 수 있나"***라, ⭐가 등급 글자보다 큽니다. */
  function gradeStripHTML(card, talents) {
    if (!window.W2Grade) return "";
    const stars = starKeys(talents);
    const rows = STAT_DEFS.map((d) => {
      const g = W2Grade.of(card.stats[d.key]);
      if (!g) return "";
      /* ⭐ 자리는 **줄마다 늘 있습니다** — 별이 있을 때만 칸을 만들면 이름이 줄마다 밀려요 */
      const top = stars.indexOf(d.key) >= 0;
      return `<span class="pcg-row${top ? " is-top" : ""}">`
        + `<span class="pcg-name">${d.emoji} ${d.name}</span>`
        + `<span class="pcg-star"${top ? ` title="가장 크게 자랄 칸이에요" aria-label="가장 크게 자랄 칸"` : ` aria-hidden="true"`}>${top ? "⭐" : ""}</span>`
        + `<span class="stat-grade g-${g.base}">${g.label}</span>`
        + `<span class="pcg-bar"><span class="pcg-fill" style="width:${potPct(card.stats[d.key]).toFixed(1)}%"></span></span>`
        + `<span class="pcg-val">${g.shown}</span>`
        + `</span>`;
    }).join("");
    /* 🔑 **`F`가 거짓말에서 서사로 바뀌는 한 줄이에요.**
     * 예전 캡션은 `📊 다 자랐을 때`였는데, 플레이어는 앞을 읽고 *"다 자라도 F야?"*로
     * 이해합니다 — 그건 거짓말이에요. 36턴 훈련이 ≈100점을 더하고 프로 커리어가 더 얹어요.
     * 타이틀이 이미 *"동네 유망주에서 프로 계약까지"*라고 적어 뒀습니다.
     * **출발점이 `F`인 게 이 게임입니다.** */
    return `<span class="pc-grades">`
      + `<span class="pcg-cap"><b>🌱 출발점</b> — 열일곱의 타고난 몸이에요. 훈련이 여기서부터 키웁니다`
      + `<br/>⭐ 가장 크게 자랄 칸 · 바는 여섯 칸을 <b>같은 자</b>로 재요</span>`
      + rows + `</span>`;
  }

  /* 화면에 나가는 문자열은 전부 이 파일 안의 상수예요(남이 올린 값이 아닙니다).
   * 그래도 카드 골격을 innerHTML로 짜니, 사람이 넣는 값이 여기 들어오면
   * **반드시 이스케이프해서** 붙이세요 — 🧒 이름이 그 자리라 esc()로 감쌌습니다. */
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function open(market, pos, onPick, onBack) {
    draw = { market, pos, left: REROLL_MAX, idx: 0 };
    const r = rollCards(market.id, pos);
    draw.cards = r.cards; draw.talents = r.talents;
    render(onPick);
    const back = document.getElementById("btn-back-prospect");
    if (back) back.onclick = onBack;
    show("screen-prospect");
  }

  /* 지금 보고 있는 카드만 바꿔 그려요 — 카드 세 장을 다시 만들지 않습니다
   * (레이더를 다시 그리면 캔버스가 세 번 지워졌다 그려져요). */
  function setIdx(n) {
    if (!draw || !draw.cards) return;
    const max = draw.cards.length - 1;
    draw.idx = Math.max(0, Math.min(max, n));
    const list = document.getElementById("prospect-list");
    if (list) list.style.transform = `translateX(${-draw.idx * 100}%)`;
    const cards = document.querySelectorAll("#prospect-list .prospect-card");
    cards.forEach((el, i) => {
      const on = i === draw.idx;
      el.classList.toggle("on", on);
      /* 안 보이는 카드는 탭 순서·스크린리더에서 빠져요 — 있는데 안 보이면
       * 손가락과 낭독이 엉뚱한 카드에 닿습니다. */
      el.tabIndex = on ? 0 : -1;
      el.setAttribute("aria-hidden", on ? "false" : "true");
    });
    const dots = document.querySelectorAll("#prospect-dots .pc-dot");
    dots.forEach((el, i) => el.classList.toggle("on", i === draw.idx));
    const prev = document.getElementById("btn-pc-prev");
    const next = document.getElementById("btn-pc-next");
    if (prev) prev.disabled = draw.idx <= 0;
    if (next) next.disabled = draw.idx >= max;
    const pick = document.getElementById("btn-prospect-pick");
    const c = draw.cards[draw.idx];
    if (pick) pick.textContent = c && c.name ? `${c.name} 선수로 갈게요` : "이 선수로 갈게요";
    const nav = document.getElementById("prospect-dots");
    if (nav) nav.setAttribute("aria-label", `유망주 ${draw.idx + 1} / ${draw.cards.length}`);
  }

  /* 📊 견주기 시트 — **원래의 3열 의도가 사는 자리**예요.
   * 숫자 없이 글자만이라 390px에서 세 칸이 안 깨집니다 (한 칸이 한 글자니까요).
   * ⚠️ 여기 등급도 **정점 기준값**이에요. 캡션이 그 말을 합니다. */
  function compareHTML(cards, talents) {
    if (!window.W2Grade) return "";
    const stars = starKeys(talents);
    const head = `<tr><th class="pcs-lab">칸</th>`
      + cards.map((c, i) => `<th class="pcs-col tone-${TONE[i % 3]}">${MARK[i % 3]}<span>${esc(c.name || `${i + 1}번`)}</span></th>`).join("")
      + `</tr>`;
    /* 📏 시트도 카드와 **같은 잠재력 바**를 씁니다 (`값 ÷ STAT_HI`).
     *
     * 🔴 예전엔 분모가 `max(40, 이번 판 18칸의 최대)`라 **자가 판마다 늘었다 줄었어요.**
     *    세 장이 다 약하면 바가 통째로 길어져서 **못한 뽑기가 좋아 보입니다.**
     *    🎲 리롤이 2회 있으니 *"이번 뽑기는 통째로 별로다"*가 읽혀야 하고,
     *    그러려면 **리롤 전후로 자가 안 바뀌어야** 해요. 그래서 고정 분모입니다. */
    const rows = STAT_DEFS.map((d) => {
      const vals = cards.map((c) => c.stats[d.key]);
      const best = Math.max.apply(null, vals);
      return `<tr><th class="pcs-lab">${d.emoji} ${d.name}${stars.indexOf(d.key) >= 0 ? `<span class="pcg-star">⭐</span>` : ""}</th>`
        + cards.map((c) => {
          const g = W2Grade.of(c.stats[d.key]);
          return `<td class="${c.stats[d.key] === best ? "pcs-best" : ""}">`
            + `<span class="stat-grade g-${g.base}">${g.label}</span>`
            + `<span class="pcs-bar"><span class="pcs-fill" style="width:${potPct(c.stats[d.key]).toFixed(1)}%"></span></span>`
            + `</td>`;
        }).join("") + `</tr>`;
    }).join("");
    const line = (lab, fn) => `<tr><th class="pcs-lab">${lab}</th>`
      + cards.map((c) => `<td class="pcs-txt">${fn(c)}</td>`).join("") + `</tr>`;
    const tr = line("⭐ 특능", (c) => { const t = traitById(c.trait); return t ? `${t.emoji} ${esc(t.name)}` : "—"; });
    const fl = line("🩹 결함", (c) => { const f = flawById(c.flaw); return f ? `${f.emoji} ${esc(f.name)}` : "—"; });
    return `<p class="pcs-cap"><b>🌱 출발점</b>의 모양이에요 — 카드의 레이더(지금 실력)와 <b>다른 자</b>입니다.<br/>`
      + `바는 세 장을 <b>같은 자</b>(${STAT_HI} 만점)로 재요 — <b>바가 긴 쪽</b>이 앞섭니다. 🎲 다시 뽑아도 자는 안 바뀝니다.</p>`
      + `<table class="pcs-tbl">${head}${rows}${tr}${fl}</table>`;
  }

  function render(onPick) {
    const hint = document.getElementById("prospect-hint");
    /* 🎂 셋 다 열일곱이라, 레이더 크기 차이는 **오직 얼마나 여물었나**에서 옵니다.
     * 그 이유를 화면이 말해 주지 않으면 *"왜 이 카드만 약하지?"*가 노이즈가 돼요(원칙 ③). */
    if (hint) hint.textContent =
      `한 장씩 넘겨 보세요. 세 명의 잠재력 총합은 같아요.`;

    const box = document.getElementById("prospect-list");
    box.innerHTML = "";
    draw.cards.forEach((c, i) => {
      const tr = traitById(c.trait), fl = flawById(c.flaw);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `card prospect-card tone-${TONE[i % 3]}`;
      btn.dataset.idx = String(i);
      /* 📈 레이더 캔버스가 300×260인 건 **공용 radar.js를 안 고치고** 크게 그리려고예요.
       * `R = min(W,H)/2 - 36`이라 캔버스가 작으면 반지름이 통째로 라벨에 먹힙니다
       * (200×168 → 반지름 48px). 300×260이면 94px이 남아요. 8종 공용 파일이라
       * 저 상수는 못 건드리니, **이쪽 캔버스를 키워서 풉니다.** */
      btn.innerHTML = `
        <span class="pc-head">
          <span class="pc-mark">${MARK[i % 3]}</span>
          <span class="pc-id">
            <span class="pc-name">🧒 ${esc(c.name || `${i + 1}번 유망주`)}</span>
            <span class="pc-age">🎂 ${c.age}세 · ${esc((tr && tr.name) || "유망주")}</span>
          </span>
          ${figureHTML(c, i)}
        </span>
        <span class="pc-tap">👆 이 카드를 누르면 이 선수로 갑니다 · 좌우로 쓸어서 넘겨요</span>
        <span class="pc-now">
          <span class="pc-cap"><b>📈 지금 실력</b> — 늦게 크는 선수일수록 작아 보여요</span>
          <span class="pc-radar-box"><canvas class="pc-radar" width="300" height="260"></canvas></span>
        </span>
        ${gradeStripHTML(c, draw.talents)}
        <span class="pc-hint">🗣️ ${c.hint.text}</span>
        <span class="pc-trait">${tr ? `${tr.emoji} ${tr.name}<span class="pc-eff">${tr.desc}</span>` : ""}</span>
        <span class="pc-flaw">${fl ? `${fl.emoji} ${fl.name}<span class="pc-eff">${fl.desc}</span>` : ""}</span>`;
      /* ⚠️ pointerdown이 아니라 click이에요. pointerdown에서 화면을 갈아치우면
       * 손을 뗄 때 그 자리의 새 요소로 click이 가서 **두 번 먹힙니다.**
       * 미니게임 준비 화면에서 실제로 났던 버그예요. */
      btn.addEventListener("click", () => {
        if (dragged) return;                       // 🖐️ 끌어서 넘긴 거예요 — 고른 게 아닙니다
        if (i !== draw.idx) { setIdx(i); return; } // 옆 카드를 눌렀으면 그 카드로 넘어가기만
        if (onPick) onPick(draw.cards[i], draw.talents, REROLL_MAX - draw.left);
      });
      box.appendChild(btn);
      if (window.Radar) {
        /* 📊 **곡선을 곱한 값**을 그려요 — 지금 실력이 그대로 보여야 나이가 반대급부가 됩니다.
         * max 44 = `STAT_HI(54) × 열일곱의 가장 이른 곡선(0.80)` — **테두리 = 지금 나이에
         * 가능한 최대**예요. 기본값 60을 쓰면
         * 가장 좋은 카드도 73%까지만 차서 **셋 다 늘 미완성으로 보입니다.** */
        window.Radar.draw(btn.querySelector(".pc-radar"), STAT_DEFS, cardShown(c), {
          max: 44, stroke: "#5fa8ff", fill: "rgba(95, 168, 255, 0.28)",
        });
      }
    });

    const dots = document.getElementById("prospect-dots");
    if (dots) {
      dots.innerHTML = draw.cards.map((c, i) => `<span class="pc-dot tone-${TONE[i % 3]}"></span>`).join("");
      dots.onclick = null;
    }
    const prev = document.getElementById("btn-pc-prev");
    const next = document.getElementById("btn-pc-next");
    if (prev) prev.onclick = () => setIdx(draw.idx - 1);
    if (next) next.onclick = () => setIdx(draw.idx + 1);
    const pick = document.getElementById("btn-prospect-pick");
    if (pick) pick.onclick = () => { if (onPick) onPick(draw.cards[draw.idx], draw.talents, REROLL_MAX - draw.left); };

    bindSwipe();
    setIdx(draw.idx || 0);

    /* ⭐ 잠재력은 세 장이 공유해요 — 📊 견주기 시트 안에 한 번만 적습니다.
     * (카드 밖에 그냥 떠 있으면 뭘 말하는 줄인지 알 수가 없었어요) */
    const tal = document.getElementById("prospect-talent");
    if (tal) {
      tal.innerHTML = STAT_DEFS
        .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(talentStars(draw.talents[d.key]))}`)
        .join(" · ") + `<br/>⭐ = 잠재력 — 세 명이 함께 쓰는 값이에요 (다시 뽑으면 같이 바뀝니다)`;
    }

    const cmpBox = document.getElementById("prospect-compare");
    if (cmpBox) cmpBox.innerHTML = compareHTML(draw.cards, draw.talents);
    const sheet = document.getElementById("prospect-sheet");
    const cmpBtn = document.getElementById("btn-prospect-compare");
    const closeBtn = document.getElementById("btn-sheet-close");
    if (sheet && cmpBtn) {
      cmpBtn.onclick = () => { sheet.hidden = false; sheet.classList.add("on"); };
      const close = () => { sheet.classList.remove("on"); sheet.hidden = true; };
      if (closeBtn) closeBtn.onclick = close;
      sheet.onclick = (e) => { if (e.target === sheet) close(); };
      close();
    }

    const rb = document.getElementById("btn-prospect-reroll");
    if (rb) {
      rb.textContent = draw.left > 0 ? `🎲 다시 뽑기 ${draw.left}회` : "🎲 다시 뽑기를 다 썼어요";
      rb.disabled = draw.left <= 0;
      rb.onclick = () => {
        if (draw.left <= 0) return;
        draw.left -= 1;
        const rr = rollCards(draw.market.id, draw.pos);
        draw.cards = rr.cards; draw.talents = rr.talents;
        draw.idx = 0;
        render(onPick);
      };
    }
  }

  /* 🖐️ 스와이프 — 화면 하나에 한 번만 겁니다(다시 그려도 다시 안 걸어요).
   * ⚠️ 좌표가 없는 합성 이벤트(검사 하네스)에서도 안 죽어야 해요 — 그때는 `dragged`가
   * 늘 false라 **탭으로만** 동작합니다. */
  let dragged = false;
  let swipeBound = false;
  function bindSwipe() {
    const vp = document.getElementById("prospect-viewport");
    if (!vp || swipeBound) return;
    swipeBound = true;
    let x0 = null;
    vp.addEventListener("pointerdown", (e) => {
      x0 = typeof e.clientX === "number" ? e.clientX : null;
      dragged = false;
    });
    vp.addEventListener("pointermove", (e) => {
      if (x0 == null) return;
      if (Math.abs(e.clientX - x0) > DRAG_MIN) dragged = true;
    });
    const end = (e) => {
      if (x0 == null) return;
      const dx = (typeof e.clientX === "number" ? e.clientX : x0) - x0;
      x0 = null;
      if (Math.abs(dx) > 40) setIdx(draw.idx + (dx < 0 ? 1 : -1));
      /* click은 pointerup **다음**에 와요 — 그 한 번만 막고 바로 풉니다 */
      if (dragged) setTimeout(() => { dragged = false; }, 0);
    };
    vp.addEventListener("pointerup", end);
    vp.addEventListener("pointercancel", () => { x0 = null; dragged = false; });
    /* ⌨️ 화살표로도 넘겨요 */
    vp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { setIdx(draw.idx - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { setIdx(draw.idx + 1); e.preventDefault(); }
    });
  }

  return {
    GROWTH_TYPES, HINTS, FLAWS, TRAITS, TRAIT_SLOTS,
    ageOf, typeOf, peakAgeOf, ageMul, curveAt, flawOf, traitsOf,
    nowStats, trainMul, cardShown,
    birthday, seasonTally, mustRetire, suggestRetire,
    rollCards, applyCard, open,
    POOL, CARDS, REROLL_MAX,
    RETIRE_AGE, RETIRE_CURVE, LOW_APPS, LOW_RUN, CARD_AGE,
    START_AGE, PEAK_SHIFT_MAX, HOT_RUN, HOT_BAR,
    _t: { spread, pickW, pieceAt, rollTalents, trainStep, TRAIN_NEUTRAL, YOUTH_FOCUS, STAT_LO, STAT_HI, state: () => draw },
  };
})();
