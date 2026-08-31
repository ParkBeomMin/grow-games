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

  /* 🧬 조립대 — **3택 카드에서 「내가 만드는 선수」로** (2026-08-30 · 74번 판정 ②·⑤)
   *
   * 🔓 여기 있던 `const CARDS = 3;`이 사라졌습니다. 카드 3택을 폐기하고 **한 명을
   *    조립대에 펼칩니다.** 3택과 다시 뽑기를 **둘 다** 두면 *"3장 중 고르고 각각 리롤"*이
   *    되어 최적화가 폭발해요 — 그래서 둘 중 하나만 남깁니다.
   *
   * 🔑 **이 설계 전체를 지탱하는 한 줄:**
   *    **다시 굴려도 총합이 안 바뀌면, 몇 번을 굴려도 곡선이 안 밀립니다.** 바뀌는 건 모양뿐이에요.
   *    반대로 총합이 흔들리면 **리롤 1회도** 곡선을 밉니다(기댓값이 `E[max of N+1]`이 되니까요).
   *    → 그래서 `POOL`은 **손잡이가 아니라 잠금장치**입니다. 밴드로 풀지 마세요.
   *      (💥 「낮은 확률로 대박」 제안이 이 자리를 건드립니다 — designer 판정 + 실측이 붙기 전에는
   *       총합을 흔들지 않습니다. `spread`는 총합을 **인자로 받으니** 그때 여기만 바꾸면 돼요) */
  const POOL = 194;               // 한 굴림의 스탯 총합. **정확히** 194 — 우수리까지 되돌려요(spread)
  const STAT_LO = 18, STAT_HI = 54;   // 한 칸이 극단으로 쏠려 못 쓰는 모양이 되지 않게

  /* ══════════════════════════════════════════════════════════════════
   * 🎛️ **다시 뽑기 — ♾️ 무제한입니다** (2026-08-30 · 74번 판정 ③-C · ④-B)
   *
   * 🔴 **예산도 ↩️ 되돌리기도 없습니다.** 둘 다 넣었다가 뺐어요. 이유가 서로 다릅니다:
   *
   *   · 예산 → **횟수는 손잡이가 아니었습니다.** 위험의 정체가 총합이지 횟수가 아니에요
   *   · ↩️ 되돌리기 → **무제한이면 필요가 없습니다.** *"직전이 더 좋았다"*는
   *     **다시 굴리면 또 나올 수 있는 것**이라 실제로 잃은 게 아니거든요.
   *     되돌릴 수 없는 걸 나란히 보여주는 건 **손잡이 없는 정보**(원칙 ③의 역방향)라
   *     📊 시트도 「직전 ↔ 지금」에서 **「지금 ↔ 표준」**으로 옮겼습니다.
   *
   * 🔑 **무제한이 왜 안전한가 — 근거를 두 줄로 남깁니다** (다음 사람이 다시 잠그지 않게)
   *
   *   ⚠️ *"굴리면 직전 게 사라지니 무제한이어도 최고값에 못 간다"*는 **유한 예산에서만** 맞아요.
   *      무회상 최적 정지의 문턱은 `V = E[max(X, V)]`이고, **굴리는 비용이 0이면**
   *      `P(X > V) > 0`인 한 **`V → sup(X)`로 수렴합니다.** 손실이 아니라 **지연**이에요.
   *
   *   ✅ **진짜 브레이크는 「굴려도 안 좋아지는 것을 굴리게 하는 것」입니다.**
   *      실측 D: 📊 배분만 굴릴 때 0 → 무제한이 **+0.35%**. 고른 모양의 유효 능력치는
   *      **+17.7%**인데도요. 총합이 고정이라 세지는 게 아니라 **모양만** 바뀌니까요.
   *
   * 🚨 **그래서 규칙은 이것 하나입니다 — 굴릴 수 있는 것은 「총합이 고정된 축」뿐입니다.**
   *    총합을 정의할 수 없는 축(🧬 성장타입 · 📏 키)은 **굴리지 말고 잠그세요.**
   *    ⚠️ 예산을 도로 채워 넣는 건 답이 아니에요 — 총합이 흔들리면 **예산 1회도** 곡선을 밉니다.
   *
   * ⭐ 잠재력 총합 고정(3-B)은 **아직입니다** — balancer 실측 D″가 먼저예요.
   *    곡선을 흔드는 변경은 **한 번에 하나씩 끊어 잽니다**(§11). 지금은 잠근 채로 둡니다. */
  const REROLL_MAX = Infinity;    // 🎲 예산. **♾️ 무제한** — 브레이크는 횟수가 아니라 `POOL` 고정이에요

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

  /* ⭐ 잠재력(재능) — **조립대에 들어올 때 한 번만** 굴리고 🔒 잠깁니다.
   *
   * 🔴 예전에는 이 함수가 `rollCards` **안**에 있었어요. 그래서 🎲를 누를 때마다
   *    잠재력이 같이 굴렀고, 🎲 예산이 그대로 **잠재력의 `max of N`**이 됐습니다 —
   *    *"타고난 것"이 굴려서 피할 수 있는 값*이 되어 버린 자리예요(74번 판정 ①-2).
   *    ⚠️ **다시 `rollBuild` 안으로 옮기지 마세요.** 그게 새던 자리입니다.
   *    (5번 작업에서 📏 키 화면이 들어오면 호출 위치가 그쪽으로 옮겨갑니다 — 잠금은 그대로예요) */
  function rollTalents(pos) {
    const bonus = legacyTalentBonus(loadLegacy().pts);
    const t = {};
    for (const d of STAT_DEFS) t[d.key] = Math.min(rand(0.8, 1.45) + bonus, TALENT_MAX);
    const ps = POS_INFO[pos].stat;
    t[ps] = Math.max(t[ps], 1.05);
    return t;
  }

  /* 📊 배분 한 벌 — **🎲가 굴리는 유일한 것**입니다.
   *
   * 총합은 언제나 정확히 `POOL`이라, 몇 번을 굴려도 바뀌는 건 **모양**뿐이에요.
   * 그래서 예산을 마음 편히 줄 수 있습니다(실측 D — 예산 0 ↔ 무제한이 **+0.35%**).
   *
   * ⚠️ 🎁(🗣️ 코멘트 · 🧬 성장타입 · ⭐ 특능 · 🩹 결함)는 여기 없습니다. 일부러예요 —
   *    🧬를 함께 굴리면 첫 3시즌이 **+19.8%**, 🌳 만성이 36% → 10%로 사라집니다(실측 D-ⓑ). */
  function rollShape(marketId, pos) {
    const focus = YOUTH_FOCUS[marketId] || [];
    const posKey = POS_INFO[pos].stat;
    /* 그 굴림만의 편중 — 굴릴 때마다 모양이 달라 보이게 하는 칸이에요 */
    const shapeKey = pick(STAT_DEFS.map((d) => d.key));
    const out = {
      shapeKey,
      stats: spread(POOL, posKey, focus, shapeKey),
    };
    return out;
  }

  /* 📊 **표준** — 총합 `POOL`을 여섯 칸에 **고르게** 나눈 모양이에요.
   * 굴림이 아니라 **자**입니다. 무제한 굴림에서 플레이어가 실제로 묻는 건
   * *"이거 멈춰도 되나"*이고, 그 답은 **평범한 모양과 견줘야** 나옵니다.
   * 그리고 이게 💥 대박의 인지 장치예요 — 얼마나 드문 걸 뽑았는지 시트가 말해 줍니다.
   * ⚠️ 총합이 `POOL`과 **정확히 같아야** 합니다 — 자가 다르면 견주는 뜻이 사라져요. */
  function evenStats() {
    const keys = STAT_DEFS.map((d) => d.key);
    const base = Math.floor(POOL / keys.length);
    const extra = POOL - base * keys.length;      // 반올림 우수리는 앞 칸부터 한 점씩
    const out = {};
    keys.forEach((k, i) => { out[k] = base + (i < extra ? 1 : 0); });
    return out;
  }

  /* 🧬 선수 한 명 — 조립대에 들어올 때 **한 번**만 부릅니다.
   * 여기서 정해진 것 중 🎲가 다시 건드리는 건 `stats`·`shapeKey`뿐이에요.
   *
   * 🧒 이름은 여기서 안 짓습니다 — **이름 화면이 맨 앞**이라 사람이 이미 정했어요.
   *    (세 장 중복 방지 `cardName`도 같이 사라졌습니다. 한 명이라 겹칠 게 없어요) */
  function rollBuild(marketId, pos) {
    /* 🗣️ 코멘트를 먼저 뽑고 그 가중치로 성장타입을 굴려요 — 화면엔 코멘트만 나갑니다.
     * `HINTS`의 `w`에 있는 **0**은 결함이 아니라 기능입니다(74번 판정 ③-B):
     * 🎲로 못 바꾸니 *"이 코멘트면 만성이 아니다"*가 **회피 수단이 아니라 정보**예요. */
    const hint = pick(HINTS);
    const type = pickW(GROWTH_TYPES, hint.w);
    const sh = rollShape(marketId, pos);
    return {
      age: CARD_AGE,
      hint,
      shapeKey: sh.shapeKey,
      // 📊 **정점 기준값**이에요 — 화면 레이더는 여기에 나이곡선을 곱합니다
      stats: sh.stats,
      growthType: type.id,
      trait: TRAITS.length ? pick(TRAITS).id : null,
      flaw: FLAWS.length ? pick(FLAWS).id : null,
    };
  }

  /* 📈 레이더에 그릴 값 — **정점 기준값 × 곡선(나이, 숨은 성장타입)**.
   * 총합은 언제나 `POOL`인데 **보이는 크기는 성장타입마다 다릅니다.**
   * 늦게 피는 타입일수록 지금이 작아요 — 그게 🧬 성장타입의 반대급부입니다. */
  function cardShown(card) {
    const c = curveAt(card.growthType, card.age, 0);
    const out = {};
    for (const d of STAT_DEFS) out[d.key] = card.stats[d.key] * c;
    return out;
  }

  /* 만든 선수를 세이브에 심어요. 특능·결함은 **자리만** 잡습니다 (효과는 §11-7).
   * ⚠️ 인자 이름이 `card`인 건 **세이브 스키마와 호출부를 안 건드리려고**예요 —
   *    3택은 사라졌지만 여기 들어오는 모양(age·growthType·trait·flaw·stats)은 그대로입니다. */
  /* 🔢 **등번호** — 이번에 새로 생긴 값이에요 (유니폼 등에 새겨집니다).
   *
   * 🔑 **포지션 관례를 기본값으로** 주고 그중에서 고르게 했습니다. 왜 「자유 입력」이
   *    아니냐면 — 등번호는 **고르는 재미**지 채우는 칸이 아니에요. 자유 입력이면
   *    검증(0? 100? 빈칸?)과 키보드가 붙고, 세로 화면이 한 칸 더 길어집니다.
   *    세 개면 탭 세 번이고 전부 그럴듯한 번호예요.
   *
   * 🔴 **등번호는 꾸미기입니다. 효과를 붙이지 마세요** (설계 83번 §11).
   *    효과가 붙는 순간 **최적 번호가 확정되고, 그건 취향이 아니라 정답**이 됩니다.
   *    *"기록이 효과"*도 아니에요 — 번호는 그냥 꾸미기입니다.
   *
   * ⚠️ **세이브 스키마는 마이그레이션하지 않습니다.** 옛 세이브엔 `shirtNo`가 없어요 —
   *    읽는 쪽이 `shirtNoOf()`로 기본값을 줍니다.
   * 🚧 설계 83번은 나중에 📍 세부 자리(`wantSlot`)가 생기면 그 관례값으로 가자고 합니다.
   *    `defaultNo(pos)` 한 함수만 갈면 되게 뒀어요 — 부르는 쪽은 안 바뀝니다. */
  const SHIRT_NOS = { fw: [9, 10, 19], wg: [7, 11, 17], mf: [8, 10, 6], df: [4, 5, 3] };
  const shirtNosOf = (pos) => SHIRT_NOS[pos] || SHIRT_NOS.mf;
  const defaultNo = (pos) => shirtNosOf(pos)[0];
  /* 👕 화면·유니폼이 함께 쓰는 **하나의 읽는 자리**입니다 (옛 세이브 = 기본값) */
  const shirtNoOf = (st) => {
    const S0 = st || S;
    return (S0 && Number(S0.shirtNo)) || defaultNo(S0 && S0.pos);
  };

  function applyCard(st, card, rerolls) {
    const S0 = st || S;
    if (!S0 || !card) return S0;
    S0.age = card.age;
    /* 🔢 조립대에서 고른 등번호. 안 골랐으면 포지션 관례값이에요 */
    S0.shirtNo = Number(card.shirtNo) || defaultNo(S0.pos);
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
   * 🧬 조립대 화면 — **최소한만.** 연출과 실루엣은 director 몫이에요 (§11-11).
   *
   * 클래스 이름을 남겨 두니 style.css에서 그대로 잡으면 됩니다:
   *   .pbench > .pb-head > .pc-silhouette · .pc-id > .pc-name · .pb-meta
   *           > .pb-slot.pc-now   > .pc-cap · .pc-radar-box > .pc-radar
   *           > .pb-slot.pc-grades > .pcg-cap · .pcg-row(.is-top) > .pcg-name · .pcg-star
   *                                 · .stat-grade · .pcg-bar > .pcg-fill · .pcg-val
   *           > .pb-slot.pb-gift  > .pb-lock · .pc-hint · .pc-trait · .pc-flaw
   *   .pb-budget > .pb-pip(.on)
   * 🎬 `.pb-slot`은 **들어올 때 0.6초씩 순서대로 굴러 채워지는** 자리예요
   *    (`data-slot` 순서). `prefers-reduced-motion`이면 한 번에 — director 항목입니다.
   * ══════════════════════════════════════════════════════════════════ */

  /* { market, pos, who, talents, build, prev, used, onPick }
   * · `talents` · `build`의 🎁 칸은 **한 번 굴리고 안 바뀝니다**
   * · `used`는 🎲를 쓴 횟수예요 — 남은 횟수는 `leftOf()`가 계산합니다
   *   (예산이 `Infinity`일 수 있어서 **쓴 횟수**를 셉니다. 남은 수를 세면 세이브에 ∞가 들어가요)
   * · ↩️ 되돌리기가 없어서 **직전 배분을 안 들고 있습니다** — 굴리면 그대로예요.
   *   무제한이라 후회할 이유가 없어요(다시 굴리면 또 나옵니다) */
  let draw = null;
  const leftOf = () => REROLL_MAX - (draw ? draw.used : 0);

  const traitById = (id) => TRAITS.find((t) => t.id === id) || null;
  const flawById = (id) => FLAWS.find((f) => f.id === id) || null;

  /* 🖐️ 12px 문턱 — 조립대가 세로로 길어 **스크롤이 있습니다.**
   * 손가락이 움직였으면 그건 누른 게 아니에요. 좌우 스와이프는 사라졌지만
   * 세로로 끌다 손을 떼면 🎲가 먹히는 자리라 문턱은 그대로 남깁니다. */
  const DRAG_MIN = 12;

  /* 👕 **무대** — 3D 유니폼(char3d.js)이 서는 자리예요. (캐릭터였다가 유니폼이 됐습니다)
   *
   * 🔑 무대 안에는 **CSS 유니폼이 늘 깔려 있습니다.** 3D는 그 위를 덮을 뿐이에요.
   *    WebGL이 없거나(jsdom·구형 기기) three.js 내려받기가 실패하거나 컨텍스트를 잃으면
   *    **아무것도 안 해도 CSS 유니폼이 그대로 보입니다.** 폴백을 따로 만드는 게 아니라
   *    **폴백 위에 3D를 얹는** 구조예요 — 그래야 실패해도 화면이 멀쩡합니다.
   *    🔑 폴백에도 **이름과 번호가 글자로** 들어갑니다 — 3D가 없어도 *"내 선수"*는 남아요.
   *
   * 🦶 **주발은 글자 칩이 말합니다 — 좌우로 뜻을 만들지 않았어요.**
   *    ⚠️ 유니폼은 돌아갑니다. 앞을 보면 착용자의 왼쪽이 화면 오른쪽이고 뒤를 보면 반대예요.
   *       **안정된 좌우가 없습니다.** 공을 한쪽에 놓으면 **반 바퀴마다 거짓말**이 돼요 —
   *       예전에 🦶 표시 색이 판정과 반대이던 버그가 정확히 그 형태였습니다.
   *    ✅ 그래서 ⚽ 공은 **가운데**에 두고, 칩이 글자로 주발을 말합니다.
   *
   * ⚠️ 이름이 비어 있어도 됩니다 — 그때는 **무지 유니폼**이에요 (아무것도 안 새겨집니다). */
  function stageHTML(who, no) {
    return `<span class="w2c-stage" id="pc-stage">`
      + jerseyHTML({ name: who.name, no })
      + `<span class="w2c-foot" aria-hidden="true">${footLabel(who.foot)}</span>`
      + `</span>`;
  }

  /* 👕 **CSS 유니폼 한 벌 — 이 함수가 유일한 출처입니다.**
   *
   * 🔑 쓰는 곳이 **둘**이에요:
   *    ① 🧬 조립대 무대의 **폴백** (WebGL이 없거나 three.js가 못 왔을 때. 3D가 뜨면 가려집니다)
   *    ② 🏠 유스 홈 · 💼 프로 화면의 **HUD 미니 유니폼** (`W2Hud.paint`)
   *    같은 함수를 쓰는 이유는 하나입니다 — **두 벌로 나뉘면 반드시 갈라집니다.**
   *    조립대에서 본 유니폼과 HUD의 유니폼이 다른 옷이면 *"내 선수"*가 깨져요.
   *
   * 🎨 색은 전부 `--kit-*` 네 변수. 절대색이 한 개도 없습니다 — 팀 색이 생기면
   *    그 요소에 변수만 갈아 끼우면 이 함수도 3D도 같이 갑니다.
   *
   * ⚠️ `mini`면 **이름을 안 넣습니다.** HUD 크기(0.33배)에서 이름은 4px이라 못 읽어요 —
   *    못 읽는 글자를 넣으면 정보가 아니라 얼룩입니다. 번호는 15px이라 읽힙니다. */
  function jerseyHTML(opt) {
    const o = opt || {};
    const nm = String(o.name || "").trim();
    const no = o.no == null ? "" : String(o.no);
    const a11y = o.label
      ? ` role="img" aria-label="${esc(o.label)}"`
      : ` aria-hidden="true"`;
    return `<span class="pc-jersey${o.mini ? " is-mini" : ""}"${a11y}>`
      + `<i class="j-sleeve l"></i><i class="j-sleeve r"></i>`
      + `<i class="j-body"></i><i class="j-hem"></i><i class="j-collar"></i>`
      + (o.mini ? "" : `<b class="j-name">${esc(nm)}</b>`)
      + `<b class="j-no">${esc(no)}</b>`
      + `</span>`;
  }

  /* 🔢 등번호 고르기 — **자기 안에서 끝나는 한 칸**이에요.
   * ⚠️ 조립대 구성이 바뀔 수 있다고 들었습니다(포메이션 그림 등). 그래서 이 줄은
   *    `benchHTML`에서 **한 줄 옮기면 어디로든 가게** 만들어 뒀어요 — 무대와 안 얽힙니다. */
  function shirtHTML(pos, no) {
    const opts = shirtNosOf(pos).map((n) =>
      `<button type="button" class="pc-no${n === no ? " on" : ""}" data-no="${n}" `
      + `aria-pressed="${n === no}">${n}</button>`).join("");
    return `<span class="pc-shirt" role="group" aria-label="등번호 고르기">`
      + `<span class="pc-shirt-lab">🔢 등번호</span>${opts}</span>`;
  }

  /* 👕 **HUD 미니 유니폼을 칠합니다** — 🏠 유스 홈 · 💼 프로 화면이 부릅니다.
   *
   * 🔴 **WebGL을 한 줄도 안 씁니다.** HUD는 늘 떠 있는 자리라, 여기서 3D가 돌면
   *    🔥 순간 카드의 프레임을 갉아먹고 **곡선이 기기 성능에 의존**하게 돼요.
   *    (자세한 판단은 `style.css`의 `.w2-hudkit` 주석에 적어 뒀습니다)
   *
   * 🔑 **같은 번호면 다시 안 그립니다.** `renderMain`은 턴마다 도는데 `innerHTML`을
   *    매번 새로 쓰면 그때마다 파싱·레이아웃이 한 번씩 돕니다 — 유니폼은 안 바뀌는 축이라
   *    다시 그릴 이유가 없어요.
   * ⚠️ 세이브를 안 건드립니다. `shirtNoOf`가 옛 세이브에도 기본 번호를 줘요. */
  function paintJersey(el, st) {
    if (!el) return;
    const no = shirtNoOf(st);
    if (el.dataset.kitNo === String(no)) return;
    el.dataset.kitNo = String(no);
    el.innerHTML = jerseyHTML({ no, mini: true, label: `등번호 ${no}번 유니폼` });
  }

  /* 🧍 무대에 선수를 세워요 — **3D가 없어도 아무 일도 안 일어납니다.**
   *
   * `char3d.js`는 ES module이라 `window.W2Char`가 **항상 늦게** 생깁니다
   * (jsdom은 module을 아예 실행하지 않아서 검사에서는 영원히 없어요).
   * 그래서 ① 여기서 매번 있는지 보고 ② 늦게 도착하면 `w2char-ready`로 다시 칠합니다. */
  function paintChar() {
    if (!draw) return;
    const stage = document.getElementById("pc-stage");
    if (!stage) return;
    try {
      if (window.W2Char) window.W2Char.show(stage, {
        name: draw.who.name,
        number: draw.build.shirtNo,
        foot: draw.who.foot,
        /* 👕 **킷은 아직 안 넘깁니다** — 무대의 CSS 변수(`--kit-*` = 무지)를 씁니다.
         * 팀 색·무늬가 생기면 여기 `kit: { body, sleeve, trim, text, pattern }` 한 줄이면 돼요.
         * char3d.js에 **절대색이 한 개도 없어서** 그 한 줄로 끝납니다. */
      });
    } catch (e) { /* 연출이 게임을 멈추면 안 됩니다 */ }
  }

  /* 🔢 등번호를 갈아 끼워요 — **화면을 통째로 다시 그리지 않습니다.**
   *
   * 🔑 `render()`를 부르면 `innerHTML`이 통째로 새로 그려지고 🎬 슬롯 연출이 세 칸 다시 돕니다.
   *    번호 하나 바꾸는 데 화면이 한 번 깜빡이면 **고르는 맛이 사라져요.**
   *    그래서 ① 3D는 `set()`으로 등판만 ② 폴백 글자와 버튼 상태만 손댑니다. */
  function setShirtNo(no) {
    if (!draw || !(no > 0)) return;
    draw.build.shirtNo = no;
    const body = document.getElementById("prospect-body");
    if (body) {
      body.querySelectorAll(".pc-no").forEach((btn) => {
        const on = Number(btn.dataset.no) === no;
        btn.classList.toggle("on", on);
        btn.setAttribute("aria-pressed", String(on));
      });
      const fb = body.querySelector(".j-no");
      if (fb) fb.textContent = String(no);
    }
    try { if (window.W2Char) window.W2Char.set({ number: no }); } catch (e) {}
  }

  /* 🧹 조립대를 **완전히 떠날 때** 컨텍스트까지 놓습니다.
   * 안 놓으면 다음 화면에서 프레임을 먹어요 — 🔥 순간 카드는 프레임 위에서 판정합니다. */
  function dropChar() {
    try { if (window.W2Char) window.W2Char.dispose(); } catch (e) {}
  }

  try {
    window.addEventListener("w2char-ready", paintChar);
  } catch (e) { /* window가 없는 환경(노드 직접 로드)에서는 그냥 넘어갑니다 */ }

  /* ⭐ 잠재력이 가장 높은 칸에만 별 하나 — *"이 칸은 더 클 수 있어요"*가
   * 그 줄에서 읽혀야 해요.
   *
   * 🔑 선수가 **하나뿐이라 이 별이 화면의 유일한 고정점**입니다. 🔒 잠긴 축이고,
   *    📊 배분은 🎲로 바뀌니까요 — *"어디까지 클 수 있나"*는 여기서만 읽힙니다. */
  function starKeys(talents) {
    if (!talents || typeof talentStars !== "function") return [];
    const st = STAT_DEFS.map((d) => ({ k: d.key, n: talentStars(talents[d.key]) }));
    const top = Math.max.apply(null, st.map((x) => x.n));
    return top >= 3 ? st.filter((x) => x.n === top).map((x) => x.k) : [];
  }

  /* 📏 **잠재력 바** — 조립대와 📊 견주기 시트가 함께 쓰는 **절대 자**(값 ÷ STAT_HI).
   *
   * ⚠️ 유스 홈·💼 준비 화면의 **XP 바**(`.bar-fill.xp` = 다음 승급까지)와 **다른 자**예요.
   *    이름을 다르게 부릅니다 — 둘 다 "XP 바"면 다음 사람이 통일하려 듭니다.
   *
   * 🔑 **자는 그 화면이 던지는 질문이 정해요.**
   *    🧬 조립대·📊 시트가 묻는 건 *"직전과 지금 중 어느 모양이 나은가"*라 **절대 크기**여야 하고,
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
   *   등급   = 타고난 몸이 어떤 모양인가 (총합이 언제나 194인 그 값)
   * 등급을 지금 실력으로 매기면 여섯 칸이 전부 `F`로 깔려요 —
   * 열일곱의 곡선이 0.56~0.84라 18~54가 10~45로 눌립니다. 그러면 🎲를 눌러도 뭐가 달라졌는지 못 봐요.
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
    /* 🎬 `data-slot`은 **화면에 보이는 순서**예요 — 🧍 무대 바로 아래가 등급 여섯 줄입니다.
     * 🔑 왜 레이더보다 위인가: 🎲가 바꾸는 건 **📊 배분**이고, 그걸 가장 곧게 읽는 게
     *    이 여섯 줄이에요. 🎲 버튼과 캐릭터 사이에 **바뀌는 것**이 있어야 굴린 보람이 보입니다.
     *    (390px 렌더 실측 — 무대 240 + 여섯 줄 195가 접히는 선 안에 같이 들어옵니다) */
    return `<span class="pc-grades pb-slot" data-slot="1">`
      + `<span class="pcg-cap"><b>🌱 출발점</b> — 열일곱의 타고난 몸이에요. 훈련이 여기서부터 키웁니다`
      + `<br/>⭐ 가장 크게 자랄 칸 · 바는 여섯 칸을 <b>같은 자</b>로 재요</span>`
      + rows + `</span>`;
  }

  /* 화면에 나가는 문자열은 대부분 이 파일 안의 상수예요(남이 올린 값이 아닙니다).
   * 그런데 🧒 **이름은 사람이 직접 칩니다.** 조립대 골격을 innerHTML로 짜니
   * **반드시 이스케이프해서** 붙이세요 — 이름 자리가 정확히 그 자리라 esc()로 감쌌습니다. */
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const footLabel = (f) => (f === "L" ? "🦶 왼발" : "🦶 오른발");

  /* 🧬 조립대 본문 한 벌.
   *
   * ⚠️ 📏 **키는 이번 범위가 아닙니다** — 5번 작업에서 들어오고, 자리는
   *    아래 `.pb-meta`(🔒 잠긴 사실 줄)에 `🎂 17세` 옆으로 **합류**합니다.
   *    화면 순서는 📏 키 화면 → 🎯 포지션 → 🧬 조립대라, 여기 오는 건 이미 정해진 값이에요. */
  function benchHTML(b, who, talents, pos) {
    const tr = traitById(b.trait), fl = flawById(b.flaw);
    return `
      <span class="pb-head">
        ${stageHTML(who, b.shirtNo)}
        <span class="pc-id">
          <span class="pc-name">🧒 ${esc(who.name || "이름 없는 유망주")}</span>
        </span>
      </span>
      <span class="pb-meta">🎂 ${b.age}세 · ${footLabel(who.foot)}</span>
      ${shirtHTML(pos, b.shirtNo)}
      ${gradeStripHTML(b, talents)}
      <span class="pc-now pb-slot" data-slot="2">
        <span class="pc-cap"><b>📈 지금 실력</b> — 늦게 크는 선수일수록 작아 보여요</span>
        <span class="pc-radar-box"><canvas class="pc-radar" width="300" height="260"></canvas></span>
      </span>
      <span class="pb-gift pb-slot" data-slot="3">
        <span class="pcg-cap"><b>🎁 타고난 것</b> <span class="pb-lock" title="굴려서 못 바꿔요" aria-label="잠김">🔒</span>
          — 🎲는 <b>📊 배분만</b> 다시 뽑아요. 여기는 안 바뀝니다</span>
        <span class="pc-hint">🗣️ ${b.hint.text}</span>
        <span class="pc-trait">${tr ? `${tr.emoji} ${esc(tr.name)}<span class="pc-eff">${esc(tr.desc)}</span>` : ""}</span>
        <span class="pc-flaw">${fl ? `${fl.emoji} ${esc(fl.name)}<span class="pc-eff">${esc(fl.desc)}</span>` : ""}</span>
      </span>`;
  }

  /* 📊 견주기 시트 — **3열(세 장) → 2열(「지금 ↔ 표준」)**입니다.
   *
   * ⚠️ 「직전 ↔ 지금」이 **아닙니다.** 되돌릴 수 없는 걸 나란히 보여주는 건
   *    손잡이 없는 정보예요(원칙 ③의 역방향). 무제한이라 직전은 잃은 것도 아니고요.
   * 🔑 무제한 굴림에서 플레이어가 묻는 건 ***"이거 멈춰도 되나"***입니다 —
   *    표준(총합 194를 고르게 나눈 모양)과 견줘야 그 답이 나와요.
   *
   * ⚠️ 여기 등급도 **정점 기준값**입니다. 캡션이 그 말을 해요.
   * 🔑 자는 **고정 분모**(값 ÷ STAT_HI)라 🎲 전후로 안 바뀝니다 —
   *    자가 판마다 늘었다 줄면 *못한 굴림이 좋아 보입니다.* */
  function compareHTML(cur, talents) {
    if (!window.W2Grade) return "";
    const stars = starKeys(talents);
    const cols = [{ mark: "🧒", lab: "지금", tone: "a", stats: cur.stats },
      { mark: "📊", lab: "표준", tone: "b", stats: evenStats() }];
    const head = `<tr><th class="pcs-lab">칸</th>`
      + cols.map((c) => `<th class="pcs-col tone-${c.tone}">${c.mark}<span>${c.lab}</span></th>`).join("")
      + `</tr>`;
    const rows = STAT_DEFS.map((d) => {
      const vals = cols.map((c) => c.stats[d.key]);
      const best = Math.max.apply(null, vals);
      return `<tr><th class="pcs-lab">${d.emoji} ${d.name}${stars.indexOf(d.key) >= 0 ? `<span class="pcg-star">⭐</span>` : ""}</th>`
        + cols.map((c) => {
          const g = W2Grade.of(c.stats[d.key]);
          return `<td class="${c.stats[d.key] === best ? "pcs-best" : ""}">`
            + `<span class="stat-grade g-${g.base}">${g.label}</span>`
            + `<span class="pcs-bar"><span class="pcs-fill" style="width:${potPct(c.stats[d.key]).toFixed(1)}%"></span></span>`
            + `</td>`;
        }).join("") + `</tr>`;
    }).join("");
    return `<p class="pcs-cap"><b>📊 표준</b>은 총합 ${POOL}을 여섯 칸에 <b>고르게</b> 나눈 모양이에요 — 굴림이 아니라 <b>자</b>입니다.<br/>`
      + `바는 둘을 <b>같은 자</b>(${STAT_HI} 만점)로 재요. <b>총합은 양쪽 다 ${POOL}</b>라 `
      + `표준보다 긴 칸이 있으면 <b>그만큼 다른 칸을 내준 것</b>이에요.<br/>`
      + `👉 <b>얼마나 치우쳤나</b>가 이 표가 답하는 질문입니다 — 멈출지 더 굴릴지는 여기서 정하세요.</p>`
      + `<table class="pcs-tbl">${head}${rows}</table>`;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 🎲 다시 뽑기 · ↩️ 되돌리기
   * ══════════════════════════════════════════════════════════════════ */

  /* 🎲 — **📊 배분만** 굴립니다. 🎁도 ⭐ 잠재력도 안 건드려요.
   * ♾️ 무제한이라 **이 함수가 굴리는 게 곧 「굴려도 안전한 축」의 전부**예요.
   * 🔴 예전 `rollCards`를 통째로 다시 부르던 자리입니다. 그러면 `rollTalents`가
   *    같이 굴러서 🎲가 **잠재력 리롤**이 됐어요 — 그 배선을 끊은 게 이 함수입니다. */
  function doReroll() {
    if (!draw || leftOf() <= 0) return;
    draw.used += 1;
    const sh = rollShape(draw.market.id, draw.pos);
    draw.build.stats = sh.stats;
    draw.build.shapeKey = sh.shapeKey;
    render();
    /* 🎲 **유니폼은 안 바뀝니다** — 바뀌는 건 🌱 등급 여섯 줄(바로 아래)이에요.
     * 배분을 유니폼에 실으면 *색·무늬로 능력치를 읽는 화면*이 되고, 그건 등급 줄이 할 말입니다.
     * 대신 손엔 대답해야 하니 **한 번 흔듭니다** — 아무것도 안 뜻해서 거짓말을 할 수가 없어요. */
    try { if (window.W2Char) window.W2Char.nudge(); } catch (e) {}
  }

  function render() {
    const b = draw.build, who = draw.who;
    const hint = document.getElementById("prospect-hint");
    if (hint) hint.textContent =
      `🎲는 몇 번이든 눌러도 돼요 — 총합은 언제나 ${POOL}라 세지는 게 아니라 모양만 달라집니다.`;

    const body = document.getElementById("prospect-body");
    if (body) {
      body.innerHTML = benchHTML(b, who, draw.talents, draw.pos);
      if (window.Radar) {
        /* 📈 레이더 캔버스가 300×260인 건 **공용 radar.js를 안 고치고** 크게 그리려고예요.
         * `R = min(W,H)/2 - 36`이라 캔버스가 작으면 반지름이 통째로 라벨에 먹힙니다
         * (200×168 → 반지름 48px). 300×260이면 94px이 남아요. 8종 공용 파일이라
         * 저 상수는 못 건드리니, **이쪽 캔버스를 키워서 풉니다.**
         * ⚠️ **더 키우면 안 돼요** — 라벨이 12px로 박혀 있어 비가 1.15를 넘으면 안 읽힙니다.
         *
         * 📊 **곡선을 곱한 값**을 그려요 — 지금 실력이 그대로 보여야 성장타입이 반대급부가 됩니다.
         * max 44 = `STAT_HI(54) × 열일곱의 가장 이른 곡선(0.80)` — **테두리 = 지금 나이에
         * 가능한 최대**예요. 기본값 60을 쓰면 가장 좋은 모양도 73%까지만 차서 늘 미완성으로 보입니다. */
        window.Radar.draw(body.querySelector(".pc-radar"), STAT_DEFS, cardShown(b), {
          max: 44, stroke: "#5fa8ff", fill: "rgba(95, 168, 255, 0.28)",
        });
      }
      /* 👕 무대는 **다시 그린 다음** 세웁니다 — innerHTML이 옛 캔버스를 통째로 버리니까요.
       * `W2Char.show`는 이미 서 있으면 컨텍스트를 새로 만들지 않고 **갈아입히기만** 해요. */
      paintChar();
      /* 🔢 등번호 버튼 — 다시 그릴 때마다 새 요소라 매번 겁니다 */
      body.querySelectorAll(".pc-no").forEach((btn) => {
        btn.onclick = () => { if (!dragged) setShirtNo(Number(btn.dataset.no)); };
      });
    }

    /* 🎲 몇 번 뽑았나 — **남은 횟수가 아니라 쓴 횟수**예요(무제한이라 남은 수가 없습니다).
     * ⚠️ 예산이 유한한 정책으로 되돌아가면 여기에 ●○을 다시 그리면 됩니다. */
    const left = leftOf();
    const capped = Number.isFinite(REROLL_MAX);
    const bud = document.getElementById("prospect-budget");
    if (bud) {
      let pips = "";
      if (capped) {
        const cells = [];
        for (let i = 0; i < REROLL_MAX; i++) cells.push(`<span class="pb-pip${i < left ? " on" : ""}"></span>`);
        pips = `<span class="pb-pips" role="img" aria-label="남은 다시 뽑기 ${left} / ${REROLL_MAX}회">${cells.join("")}</span>`;
      }
      bud.innerHTML = `<span class="pb-bud-lab">${capped ? "🎲 남은 다시 뽑기"
        : draw.used ? `🎲 지금까지 ${draw.used}번 뽑았어요` : "🎲 마음에 들 때까지 뽑아도 돼요"}</span>`
        + pips
        + `<span class="pb-bud-note">총합은 언제나 ${POOL}라 굴려도 <b>세지지 않아요</b> — 바뀌는 건 모양뿐입니다</span>`;
    }

    const rb = document.getElementById("btn-prospect-reroll");
    if (rb) {
      rb.textContent = left <= 0 ? "🎲 다시 뽑기를 다 썼어요"
        : capped ? `🎲 다시 뽑기 ${left}회` : "🎲 다시 뽑기";
      rb.disabled = left <= 0;
      rb.onclick = () => { if (!dragged) doReroll(); };
    }

    const cmpBox = document.getElementById("prospect-compare");
    if (cmpBox) cmpBox.innerHTML = compareHTML(draw.build, draw.talents);

    /* ⭐ 잠재력은 🔒 잠긴 축이라 시트 아래에 **한 번만** 적습니다 */
    const tal = document.getElementById("prospect-talent");
    if (tal) {
      tal.innerHTML = STAT_DEFS
        .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(talentStars(draw.talents[d.key]))}`)
        .join(" · ") + `<br/>⭐ = 잠재력 — 🔒 <b>타고난 값이라 🎲로 안 바뀌어요</b>`;
    }

    const sheet = document.getElementById("prospect-sheet");
    const cmpBtn = document.getElementById("btn-prospect-compare");
    const closeBtn = document.getElementById("btn-sheet-close");
    const keepBtn = document.getElementById("btn-sheet-keep");
    const rerollBtn = document.getElementById("btn-sheet-reroll");
    if (sheet && cmpBtn) {
      const close = () => { sheet.classList.remove("on"); sheet.hidden = true; };
      cmpBtn.onclick = () => { if (dragged) return; sheet.hidden = false; sheet.classList.add("on"); };
      if (closeBtn) closeBtn.onclick = close;
      if (keepBtn) keepBtn.onclick = close;
      /* 🎲 시트 안에서도 바로 굴릴 수 있어요 — 표를 보고 *"더 굴리자"*가 되는 자리라
       * 닫았다 다시 여는 왕복을 만들면 안 됩니다. 시트는 **열어 둔 채** 다시 그려요. */
      if (rerollBtn) {
        rerollBtn.disabled = leftOf() <= 0;
        rerollBtn.onclick = () => { if (!dragged) doReroll(); };
      }
      sheet.onclick = (e) => { if (e.target === sheet) close(); };
      if (!sheet.classList.contains("on")) close();
    }

    const start = document.getElementById("btn-prospect-start");
    if (start) {
      start.textContent = who.name ? `${who.name} 선수로 시작` : "이 선수로 시작";
      /* ⚠️ pointerdown이 아니라 click이에요. pointerdown에서 화면을 갈아치우면
       * 손을 뗄 때 그 자리의 새 요소로 click이 가서 **두 번 먹힙니다.**
       * 미니게임 준비 화면에서 실제로 났던 버그예요. */
      start.onclick = () => {
        if (dragged) return;
        /* 🧹 조립대를 떠나요 — 3D를 여기서 놓습니다. 안 놓으면 다음 화면에서
         * 프레임을 먹고, 🔥 순간 카드는 **프레임 위에서 판정**합니다. */
        dropChar();
        if (draw.onPick) draw.onPick(draw.build, draw.talents, draw.used);
      };
    }
  }

  /* 🖐️ 화면 하나에 한 번만 겁니다(다시 그려도 다시 안 걸어요).
   * ⚠️ 좌표가 없는 합성 이벤트(검사 하네스)에서도 안 죽어야 해요 — 그때는 `dragged`가
   * 늘 false라 **탭으로만** 동작합니다. */
  let dragged = false;
  let dragBound = false;
  function bindDragGuard() {
    const sc = document.getElementById("screen-prospect");
    if (!sc || dragBound) return;
    dragBound = true;
    let x0 = null, y0 = null;
    sc.addEventListener("pointerdown", (e) => {
      x0 = typeof e.clientX === "number" ? e.clientX : null;
      y0 = typeof e.clientY === "number" ? e.clientY : null;
      dragged = false;
    });
    sc.addEventListener("pointermove", (e) => {
      if (x0 == null) return;
      if (Math.abs(e.clientX - x0) > DRAG_MIN || Math.abs(e.clientY - y0) > DRAG_MIN) dragged = true;
    });
    /* click은 pointerup **다음**에 와요 — 그 한 번만 막고 바로 풉니다 */
    sc.addEventListener("pointerup", () => { x0 = null; if (dragged) setTimeout(() => { dragged = false; }, 0); });
    sc.addEventListener("pointercancel", () => { x0 = null; dragged = false; });
  }

  /* `who`는 **이름 화면이 이미 정해 준 것**이에요 — { name, foot }.
   * (📏 키가 5번에서 들어오면 여기 `height`가 함께 옵니다) */
  function open(market, pos, who, onPick, onBack) {
    draw = { market, pos, who: who || {}, used: 0, onPick };
    /* ⭐ 잠재력·🧬 성장타입·⭐ 특능·🩹 결함은 **여기서 한 번**만 굴러요 */
    draw.talents = rollTalents(pos);
    draw.build = rollBuild(market.id, pos);
    /* 🔢 포지션 관례 번호로 시작해요 — 🎲로는 **안 바뀝니다**(안 바뀌는 축이에요) */
    draw.build.shirtNo = defaultNo(pos);
    bindDragGuard();
    render();
    const back = document.getElementById("btn-back-prospect");
    if (back) back.onclick = (e) => { dropChar(); if (onBack) onBack(e); };
    show("screen-prospect");
  }

  return {
    GROWTH_TYPES, HINTS, FLAWS, TRAITS, TRAIT_SLOTS,
    ageOf, typeOf, peakAgeOf, ageMul, curveAt, flawOf, traitsOf,
    nowStats, trainMul, cardShown,
    birthday, seasonTally, mustRetire, suggestRetire,
    /* 🔓 `rollCards`가 사라진 자리예요 — 3택을 폐기했습니다.
     * · `rollShape` = 📊 배분 한 벌 (**🎲가 굴리는 유일한 것** · 총합 언제나 POOL)
     * · `rollBuild` = 선수 한 명 (조립대에 들어올 때 한 번)
     * · `rollTalents` = ⭐ 잠재력 (**따로** 부릅니다 — 🎲가 못 건드리게 뺀 자리) */
    rollShape, rollBuild, rollTalents, applyCard, open,
    SHIRT_NOS, shirtNosOf, defaultShirtNo: defaultNo, shirtNoOf,
    /* 👕 HUD가 같은 유니폼을 그리려고 씁니다 — **마크업의 유일한 출처**예요 */
    jerseyHTML, paintJersey,
    POOL, REROLL_MAX, evenStats,
    RETIRE_AGE, RETIRE_CURVE, LOW_APPS, LOW_RUN, CARD_AGE,
    START_AGE, PEAK_SHIFT_MAX, HOT_RUN, HOT_BAR,
    _t: { spread, pickW, pieceAt, trainStep, TRAIN_NEUTRAL, YOUTH_FOCUS, STAT_LO, STAT_HI, state: () => draw },
  };
})();
