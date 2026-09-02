/* ⚽ 더 윙어 II — 순간 카드 미니게임 **한 종** (winger2 전용)
 *
 *   W2Moment.play(container, opts, cb)
 *     opts = { kind: "goal"|"assist"|"defend", moment: (엔진이 주는 이름 — 화면 고르기에 안 씁니다),
 *              condition: 0~100, foot: "L"|"R", judge: (s) => "perfect"|"ok"|"miss" }
 *     cb(judge, detail)      detail = { s, moment, weak }
 *
 * ── 🥅 하나뿐입니다 — **골문 6칸** ──────────────────────────
 * *"미니게임들 다 뭘 어떻게 하라는지 모르겠다니까ㅜㅠㅜ 없애줘. 없애고 일단 공격 상황에서
 * 축구골대를 배경으로 6칸 만들어서 어디로 공 찰지 선택하는 미니게임 하자. 골키퍼 가운데서
 * 움직이고"* — 그대로 만들었어요.
 *
 *     🥅 골문 배경 · 6칸 · 어디로 찰지 한 번 탭 · 🧤 키퍼가 가운데에서 미끄러짐
 *
 * 🔴 **🏃 컷인 · 🎯 킬패스 · 🧱 차단은 없앴습니다.** 형태째 지웠어요 —
 *    같은 계단을 다른 이름으로 되살리지 마세요.
 *
 * ── 🎭 **판이 하나, 배역이 둘 — 🧱 수비는 판이 없습니다** ────
 * 카드 종류는 셋인데(⚽ 결정 · 🅰️ 전개 · 🧱 수비) **판은 공격 쪽 둘에만 뜹니다.**
 * 🔑 낱말만 갈리고 산식은 한 줄도 안 갈라져요 —
 *
 *     ⚽ 결정  빈 곳으로 **차요**       (내 골)
 *     🅰️ 전개  빈 곳으로 **굴려 줘요**  (동료가 마무리)
 *     🧱 수비  **화면을 안 엽니다** — `s = 0.5` 중립 판정만 돌려줘요
 *
 * 🔴 **수비에 골문 격자를 띄우지 않습니다** (117번 §6-1 a안 탈락 · 원칙 ①).
 *    *"한 명만 지나가면 실점이에요"*인데 화면이 **상대 골문**이면, 화면이 만드는 기대
 *    (**골을 넣는다**)와 상황의 핵심(**막는다**)이 정면으로 싸웁니다.
 * 🔴 **수비 카드를 안 뽑는 것도 아닙니다** (b안 탈락 · 원칙 ⑪) — `cardP.defend`·`MINI.defend`·
 *    `BLEND.df`·무실점 기록이 그 위에 서 있어서, **연출 축의 부족을 육성 축 손잡이로**
 *    고치는 게 됩니다.
 * ★ **c안입니다** — `cardP(autoP, a, 0.5) = autoP`가 **모든 능력치에 대해 정의상** 성립해요.
 *    🟢 육성은 그대로 살고(결과는 `autoP` = 능력치가 정합니다) **조작만 빠집니다.**
 * 🔒 **「카드」로 부르지 않습니다** (117번 §6-3 · 원칙 ③) — 손잡이가 있는 것처럼 보이는데
 *    없으면 그게 노이즈예요. 수비는 **중계 한 줄 + 결과**로 흐릅니다.
 * ⚠️ 범민 님이 *"**일단** 공격 상황에서"*라고 하셨어요 — 🥅가 *"바로 알겠다"*를 받으면
 *    **같은 격자를 우리 골문으로 돌려** 수비용을 만듭니다(117번 §6-4).
 *    🚨 그때도 🧱 차단의 **형태**(칩 둘 읽기 · 세기로 정답이 뒤집힘 · 2단 국면 · 띠)는
 *    되살리지 마세요. 이름을 갈아도 안 됩니다.
 *
 * ── 왜 전용 파일인가 ─────────────────────────────────────────
 * `timing.js`·`base.css`·`match.js`는 **8개 게임이 전부 내려받습니다.** 축구 하나만
 * 쓰는 판을 거기 넣으면 안 쓰는 게임까지 무게를 집니다. 🎤 아이돌의 tour-stage.js와
 * ⚾ 야구의 post-stage.js가 같은 이유로 전용 파일이에요. 인터페이스만 timing.js와 맞춥니다.
 *
 * ── 🖼️ 세 줄 위계와 낱말 (112번 §11-8) ─────────────────────
 * 머리는 **늘 세 줄**이에요 — 준비 화면에도, 본 게임 상자에도 같은 세 줄이 섭니다.
 *
 *     [상황 분류]  작게   `.w2m-stake`   ⚽ 골 찬스 — 넣으면 골이에요
 *     [무엇을]     크게   `.tm-label`    🥅 일대일 슈팅
 *     [왜/어떻게]  한 줄  `.w2m-why`     키퍼가 미끄러진 반대쪽, 가장 밝은 칸으로 차요
 *
 * 🔴 **화면의 낱말이 아니라 축구의 낱말을 씁니다.** *"초록 존"*·*"갭"*·*"코스 칸"*은
 *    우리 화면의 이름이지 축구의 이름이 아니에요 — 도형이 무엇인지 모르면 규칙 설명이
 *    붙을 자리가 없습니다(112번 §11-1).
 *      게이트·판정 창 → **밝은 칸**   ·   초록 존 → **빈 곳**
 *    ⚠️ **클래스 이름은 그대로**예요(`.w2m-cell` 등). 바뀌는 것은 **사람이 읽는 문구**뿐입니다.
 *
 * ── 🖼️ 화면 문법 — 장면 + 격자 + 칸 탭 (112번 §11-4) ──────
 *   **축구 장면 하나 · 그 위에 6칸 · 방해하는 것이 시간에 따라 움직임 ·
 *   한 번 탭이 「어디 + 언제」를 동시에.** 버튼이 없어요 — **장면이 곧 버튼**입니다.
 * 🔴 옛 🥅는 **자유 좌표**였습니다("골문 아무 데나 누르기"). 공간이 문제가 아니라
 *    **경계가 없는 게** 문제였어요 — *"아무 데나 눌러도 되나?"*가 남았습니다.
 * 🔒 **칸 수는 「읽힘」의 손잡이이지 난이도 손잡이가 아니에요**(112번 §11-5) —
 *    난이도는 `ONE_WIN`이 잡습니다. 🔴 다만 **무관하지도 않아요**: 칸이 좁으면
 *    `CELL_FLOOR`가 만드는 바닥도 같이 낮아집니다. **칸 수를 바꾸면 `ONE_WIN`을 다시 재세요.**
 *
 * ── 🔒 판정을 이 파일이 만들지 않습니다 ──────────────────────
 * 여기가 내는 것은 **조작 성공도 `s` ∈ [0,1]** 하나뿐이에요. 판정("perfect"/"ok"/"miss")은
 * 엔진이 §2-6의 산식으로 옮깁니다 —
 *
 *     P(사건 | 카드) = clamp( autoP(me) + 2*half(a)*(s − 0.5), 0, 1 )
 *
 * `autoP`는 그 경기의 전력과 내 능력치에서 나오는 값이라 미니게임이 알 수 없어요.
 * 미니게임이 제 손으로 판정을 만들면 **카드 갈래가 자동 갈래와 어긋납니다** —
 * §2-6이 고친 바로 그 자리예요. 그래서 `opts.judge(s)`로 엔진에 되돌려 물어요.
 *
 * ── 🔴 능력치는 판정 창을 넓히지 **않습니다** (설계 §4-5) ────
 * 판정 창에 걸리는 것은 **🦶 주발(±25%)과 🫀 컨디션(condMul)뿐**이에요.
 * 능력치는 이미 두 번 실려 있습니다 — `autoP`의 중심(sc)과 조작 폭 `half(a)`.
 * 여기에 판정 창까지 얹으면 **세 번째 경로**가 생기고, `s = 0.5`에서 중립이 성립한다는
 * §2-6의 정의가 능력치마다 깨집니다.
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
  /* 판정 창 배수 하나로 모읍니다 — 🦶 주발 · 🫀 컨디션 · ♿ 확대가 여기 한 자리에서 곱해져요. */
  const winMul = (cond, foot) => condOf(cond) * (wideOn() ? WIDE : 1) * (foot || 1);

  /* ---------- 🏔️ `CELL_FLOOR` — **격자가 낼 수 있는 `s`의 천장** ----------
   *
   * 🔑 **「칸을 눌렀다」는 「이 칸 어딘가」이지 「정확히 칸 한가운데」가 아닙니다.**
   * 그래서 오차에 **바닥**을 깝니다 — `err = max(|칸 중심 − 좋은 지점|, 칸폭 × CELL_FLOOR)`.
   *
   * 🚨 **왜 필요한가** (112번 §12 · 실측 40)
   *   자유 좌표에서는 **손이 바닥을 만들었습니다** — 노린 곳에 못 맞으니까요.
   *   격자는 탭을 **칸 중심으로 스냅**해서 그 바닥을 지웠고, 오차가 **0을 지나갈 수** 있게 됐어요.
   *   `sBar(0, 창) = 1`이라 **창을 아무리 좁혀도 잘하는 사람은 만점**을 굽니다
   *   (실측: 능숙 `E[s]`가 0.702 → **0.903**).
   *
   * 🔴 **바닥은 「몫 나누기」로 만들면 안 됩니다.** 한 번 그렇게 풀었다가 되돌렸어요 —
   *   「좋은 지점」을 거의 안 움직이게 하면 천장은 생기지만 **어느 칸을 누를지가 고정**되고,
   *   **격자가 버튼 하나가 됩니다**(112번 §11-4에서 폐기한 「띠 + 버튼」으로 되돌아가요).
   *   🔑 **바닥은 속도와 무관해야** 몫을 자유롭게 나눌 수 있습니다.
   *
   * 🔒 **손잡이 셋을 같은 표에 두지 마세요** — 축이 서로 다릅니다:
   *      `속도 ÷ 창`   난이도 (중립화 비)      → `ONE_WIN`
   *      몫 나누기      공간 ↔ 시간 지분        → `ONE_CLOSE`
   *      `CELL_FLOOR`  `s`의 **천장**          → 여기
   *
   * ⚠️ **칸 폭에 비례합니다** — 칸이 좁으면 바닥도 낮아져요.
   *      5칸: 20.00 × 0.30 = 6.0   ·   **6칸: 16.67 × 0.36 = 6.0**
   *   그래서 **읽힘으로 칸 수를 먼저 정하고, 그 칸 폭 위에서 비(`ONE_WIN`)로 난이도를 맞추는**
   *   순서입니다(112번 §11-5 정정).
   *
   * ══════════════════════════════════════════════════════════════════
   * 🚨🚨 **`CELL_FLOOR 0.36`과 `ONE_WIN 23`은 「한 벌」입니다 — 따로 만지지 마세요**
   * ══════════════════════════════════════════════════════════════════
   * (2026-09-02 · balancer 119번 §1-6 · 시드 3벌 × 조작자 모델 3벌 × 20,000판)
   *
   * 🔑 **모델이 필요 없는 자가 먼저 답을 줍니다** — 조작자 모델이 한 톨도 안 들어가요:
   *      `s 천장 = 1 − (칸폭 × CELL_FLOOR) ÷ ONE_WIN`
   *      상용 5칸: `1 − 6/23 = 0.7391`   ·   지금 6칸: `1 − 6/23 = 0.7391` ✅
   *
   * 🔴 **하나만 넣으면 무너집니다** (「보통」 짝지은 차이 · 계약 ≤ 0.005):
   *      `ONE_WIN 23`만 (floor 0.30) → 능숙이 **+0.077로 오히려 커짐** · 천장 0.7826
   *      `CELL_FLOOR 0.36`만 (win 22) → 보통 **−0.0195**(계약의 4~5배 밖) · 천장 0.7273
   *      ⭐ **둘 다** → 보통 **−0.0028** · 능숙 초과분 **절반**(+0.065 → +0.030) · 천장 **0.7391**
   *
   * 🔒 **축은 그대로 삽니다** — `ONE_WIN`은 여전히 난이도, `CELL_FLOOR`는 여전히 천장이에요.
   *    바뀐 건 **「6칸이 만든 초과분을 어느 축이 갚느냐」**뿐입니다.
   * 🟡 **값을 치릅니다** — 격자 폭(조준이 성적을 가르는 폭)이 5칸의 **58%**로 줄어요
   *    (`칸폭 × (0.5 − CELL_FLOOR) ÷ ONE_WIN`). 「어느 칸을 눌러도 비슷해지는」 쪽이라,
   *    🔴 **여기를 더 올리면 격자가 버튼 하나가 됩니다.** 0.36이 상한이라고 보세요. */
  const CELL_FLOOR = 0.36;
  const cellFloorErr = (err, cellW) => Math.max(err, cellW * CELL_FLOOR);

  /* ---------- 📐 계수 ----------
   * 조작이 정하는 것은 `s`뿐이고, **평균적인 조작이 s ≈ 0.5**에 오도록 잡았습니다.
   * 그래야 `s = 0.5`가 중립인 §2-6의 정의 위에서 balancer의 곡선이 안 흔들려요.
   * 실측 절차와 결과는 `docs/superpowers/_workspace/116_engineer_one-mini.md`에 있어요.
   *
   * 🥅 **골문 6칸** — 판은 이것 하나뿐입니다.
   *
   * 🧤 키퍼가 **골문 한가운데 근처에서 출발해 한쪽으로 미끄러지며** 몸을 벌려요.
   *      `off`   가운데에서 벗어난 거리 (**출발 자리**. 늘 양수예요)
   *      `slide` 그 판에서 **더 미끄러지는** 거리
   *      `cov`   덮는 반폭 — `cov0 → cov1`로 벌어집니다
   *    **키퍼가 간 쪽의 반대가 빈 곳**이고, 「좋은 지점」은 그 빈 곳의 한가운데예요.
   *
   * 🔒 **키퍼는 가운데를 안 넘습니다.** `off`가 0을 지나거나 반대편으로 넘어가면
   *    좌우 빈 곳이 같아지는 순간이 생기고, 그때 **대칭으로 보이는 화면인데 한쪽만
   *    정답**이 되는 절벽이 납니다(거울 칸이 0점). 옛 판이 `|kc − 50| ≥ 4`로 막던
   *    바로 그 자리예요 — 출발이 가운데로 오면서 **부호 고정**으로 형태가 바뀌었습니다.
   * 🔒 **`slide` 최대값 < `cov1 − cov0`이어야 합니다.** 미끄러지는 만큼 빈 곳이 넓어지고
   *    몸이 벌어지는 만큼 좁아져서, 이 부등호가 깨지면 **기다릴수록 좋아지는** 판이 돼요
   *    («빨리 차라»가 통째로 죽습니다). 지금은 16 < 24입니다.
   * 🔒 `cells`는 **「읽힘」의 손잡이**예요. 범민 님이 **6칸**으로 정하셨습니다.
   *    ⚠️ 난이도와 무관하지는 않아요 — 칸이 좁으면 `CELL_FLOOR`가 만드는 바닥도 같이
   *    낮아집니다. **읽힘으로 칸 수를 먼저 정하고, 그 칸 폭 위에서 `ONE_WIN`으로 난이도를
   *    맞추는** 순서예요. 🔴 칸 수를 바꾸면 `ONE_WIN`을 다시 재세요.
   * 🔒 `look`은 **화면이 미리 보여 주는 시간**이에요 — `s`에 안 들어갑니다(§아래 「미래 흘리기」).
   * 🪦 **`post`(골대 기둥)는 없습니다 — 판정에서도 그림에서도 지웠습니다** (2026-09-02 · 122번 §7-4).
   *    판정에서 빠진 건 112번인데(격자의 바깥 칸이 곧 골문 구석이라 기둥까지 오차에 넣으면
   *    규칙이 둘이 됩니다), 그림만 남아 **화면이 없는 규칙을 그리고** 있었어요.
   *    🚨 되살리면 «저기 닿으면 손해» 라는 거짓말이 돌아옵니다.
   *
   * 🔴 **`need`·`kc`는 죽었습니다.** `need`는 *"키퍼 몸에서 남은 여유가 클수록 좋다"*는
   *    옛 형태(오차의 방향이 반대)였고, `kc`는 *"키퍼가 한 자리에 서 있다"*는 옛 무대예요.
   *    🚨 **같은 계단을 다른 이름으로 되살리지 마세요** — 폐기된 건 이름이 아니라 형태입니다. */
  const ONE = { cells: 6, off: [5, 9], slide: [5, 16], cov0: 10, cov1: 34,
    grow: 2400, life: 3400, look: 450 };

  /* 🎚️ **난이도 손잡이 — 「속도 ÷ 창」의 창 쪽.** 여기 하나만 만지세요.
   * 「속도」는 좋은 지점이 밀리는 빠르기이고, 그 둘의 **비**가 난이도예요.
   * 🔴 `ONE_CLOSE`나 `CELL_FLOOR`로 난이도를 맞추지 마세요 — 그 둘은 다른 축입니다.
   *
   * 📏 **22 → 23으로 되돌아왔습니다** (2026-09-02 · balancer 119번 §1-6).
   *    🚨 **`CELL_FLOOR 0.36`과 「한 벌」입니다** — 위 `CELL_FLOOR` 주석의 🚨 절을 먼저 읽으세요.
   *    🔴 **둘 중 하나만 만지면 무너집니다.** 여기만 23으로 올리면(floor 0.30 유지)
   *       능숙 초과분이 **+0.066 → +0.077로 오히려 커집니다.**
   *
   *    ── 왜 한 번 22로 내렸다가 돌아왔나 ──
   *    116번은 6칸이 만든 `s` 상승을 **창으로** 갚으려 했어요. 그런데 `ONE_WIN`은
   *    서툰·보통·능숙 **셋을 같은 방향으로 밀 뿐이라 기울기가 안 바뀝니다** —
   *    6칸이 만든 것은 **기울기(잘하는 사람만 더 버는 것)**라 창으로는 못 없앴어요.
   *    🔑 그 몫을 `CELL_FLOOR`가 받으면서 **난이도 축은 제자리로** 돌아온 것입니다.
   *
   *    🔒 **짝지은 차이로 잡았습니다**(옛 5칸·고정 키퍼 ↔ 새 6칸·미끄러지는 키퍼 ·
   *    같은 조작자 · 같은 판 · 20,000판 × 시드 3벌 × 조작자 모델 3벌):
   *      「보통」 **−0.0028 ~ −0.0089** (계약 ≤ 0.005) · 서툰 +0.025 ~ −0.001 · 능숙 +0.026 ~ +0.030
   *    🔴 **절대값을 계약으로 삼지 마세요** — 그건 조작자 모델의 성질이에요. 계약은 **차이**입니다.
   *    ⚠️ **23.25를 고르지 마세요** — 두 모델을 억지로 맞춘 값이라 구조적 뜻이 없고
   *       문턱 여유가 0입니다. **23은 `1 − 6/23 = 0.7391`이라는 산수의 값**이에요. */
  const ONE_WIN = 23;

  /* ⚖️ **몫 나누기 — 공간 ↔ 시간 지분.** 난이도가 아니라 **무엇으로 이기는가**를 정합니다.
   * 0에 가까우면 «어느 칸인가»(공간)만 남고, 크면 «언제 누르는가»(시간)가 무거워져요.
   * 🔒 `CELL_FLOOR`가 천장을 따로 잡고 있어서 **여기를 자유롭게 나눌 수 있습니다** —
   *    옛날에는 이 값으로 천장까지 만들려다 격자를 버튼 하나로 만들 뻔했어요. */
  const ONE_CLOSE = 0.45;

  /* ---------- 🎯 `s` — 조작 성공도 ----------
   * s = 1 − 오차 / 판정창. **판이 하나라도 이 모양을 지킵니다** — 나중에 판이 늘면
   * 난이도를 한자리에서 견줄 수 있어야 해요 (설계 §4-4 ①). */
  const sBar = (err, win) => clamp(1 - err / Math.max(win, 1e-6), 0, 1);
  /* 🥅 **누른 칸의 중심**이 그 순간의 **빈 곳 한가운데**에서 벗어난 거리(골문 폭 %).
   * 🔴 옛 `sOne(margin, mul)`은 *"여유가 클수록 좋다 · 키퍼 몸 안이면 0"*이었습니다 —
   *    **오차의 방향이 반대**였고, 그 형태를 버렸어요(112번 §1-3 · §11-10).
   *    이름은 같지만 **받는 것이 「여유」에서 「오차」로 바뀌었습니다.**
   * ⚠️ 창을 좁히는 것(키퍼가 지운 각)은 `mul`에 들어옵니다 — `상수 × mul` 꼴을 지켜야
   *    🫀 컨디션·♿ 확대가 **같은 비율**로 걸려요.
   * 🏔️ 넣는 `err`에는 **`CELL_FLOOR` 바닥이 이미 깔려 있어야** 합니다(`oneErr`) —
   *    바닥이 `s`의 천장을 만드는 자리예요. */
  const sOne = (err, mul) => sBar(err, ONE_WIN * mul);

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

  /* 🖼️ **상황 분류** — 세 줄 위계의 첫 줄이에요(112번 §11-8).
   * 같은 미니게임이 두 종류로 열려요(🏃 돌파는 결정에도 전개에도). **무엇이 걸렸는지
   * 모르는 것이 문제**라 맨 위에 작게 밝힙니다.
   * ⚠️ 첫 글자의 이모지(⚽·🅰️·🧱)가 카드 성격과 짝이에요 — 화면이 말하는 성격과
   *    이 줄이 어긋나면 안 됩니다(youth-moment-test D-1이 그 자리를 봅니다). */
  const STAKE = {
    goal: "⚽ 골 찬스 — 넣으면 골이에요",
    assist: "🅰️ 찬스 메이킹 — 성공하면 도움이에요",
    /* 🧱은 **지금 이 판을 안 엽니다**(117번 §6). 줄을 남겨 두는 건 표가 카드 종류
     * 셋을 그대로 비추게 하려는 거예요 — 수비용 판이 돌아오면 그때 이 줄이 다시 섭니다. */
    defend: "🧱 실점 위기 — 놓치면 실점이에요",
  };

  /* 🖼️ **세 줄 위계** — 준비 화면과 본 게임 상자가 **같은 세 줄**을 씁니다.
   * 한 자리에서만 만들어야 둘이 안 갈라져요(옛 상자는 `tm-label` 한 줄에 규칙을 욱여넣어서
   * *"무슨 상황인지"*가 아니라 *"뭘 누르는지"*만 있었습니다). */
  const head = (stake, what, why) => `<p class="w2m-stake">${esc(stake)}</p>`
    + `<p class="tm-label w2m-what">${what}</p>`
    + `<p class="w2m-why">${why}</p>`;

  function ready(container, info, start) {
    const full = bumpSeen(info.key) < FULL_SHOWS;
    const body = full
      ? `<ul class="w2m-ready-lines">${info.lines.map((t) => `<li>${t}</li>`).join("")}</ul>`
      : "";
    const keys = (info.keys || [])
      .map((k) => `<span class="w2m-ready-key"><b>${esc(k.name)}</b><span>${esc(k.desc)}</span></span>`).join("");
    const wrap = document.createElement("div");
    wrap.className = "tm-box w2m-ready";
    wrap.innerHTML = head(info.stake, info.title, info.why) + body
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
  /* 🔗 **화면 등급의 유일한 주인** (설계 122번 §2-4 · §7-2).
   *
   * 🔒 **이건 종속값입니다 — 손잡이가 아니에요.** 격자의 `w2m-cell-hot`·`w2m-cell-in`도,
   *    판 끝의 판정 문구 셋(`onTap`의 `end(...)`)도 **전부 여기를 읽습니다.**
   *    한 자리에 둔 이유는 **화면과 판정이 갈라질 자리를 안 만들려고**예요 —
   *    표시가 «완벽»이라고 해 놓고 문구가 «스쳤어요»라고 하면 그게 거짓말입니다.
   * 🔴 **`ONE_WIN`·`CELL_FLOOR`와 같은 표에 두지 마세요** — 저 둘은 손잡이고
   *    이건 그 결과를 읽는 자입니다(원칙 ⑨ — 성격이 다른 것을 나란히 두지 않기).
   * 🔴 **`in`을 0.35로 올리지 마세요.** 0.35는 `loneJudge`의 값인데 그 함수는
   *    실제 경기에서 **한 번도 안 불립니다**(주석이 스스로 적어 뒀어요).
   *    안 돌아가는 폴백의 값을 화면에 그리면 **아무도 안 보는 규칙을 화면이 지키게** 됩니다. */
  const TIER_S = { perfect: 0.75, in: 0 };
  const TIER = (s) => (s >= TIER_S.perfect ? "perfect" : s > TIER_S.in ? "ok" : "miss");
  const RES_CLS = { perfect: "w2m-good", ok: "w2m-mid", miss: "w2m-bad" };
  /* 🎉 파티클 이모지는 **카드 종류**가 정합니다 — 판이 하나라 moment로 가를 게 없어요.
   * (`WORDS[kind].hit` 한 자리에 모아 뒀습니다) */

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
      if (tier === "perfect" && window.Fx) window.Fx.burst(wrap, (ctx.words && ctx.words.hit) || "⚡", 8);
      setTimeout(() => {
        wrap.remove();
        ctx.cb(ctx.toJudge(v), { s: v, moment: ctx.moment, weak: !!ctx.weak });
      }, 620);
    };
  }

  /* ================================================================
   * 2. 🥅 1대1 마무리 — **장면 + 격자 + 칸 탭** (fw · wg)
   *
   * 🖼️ **장면**은 골문 앞이에요. 그 위에 **골문 칸(격자)**이 서 있고,
   * 🧤 **키퍼가 달려나오며 각을 지웁니다** — **밝은 칸이 좁아져요.**
   * **가장 밝은 칸**을 한 번 누르면 「어디 + 언제」가 동시에 정해집니다.
   *
   * 🔴 **버튼이 따로 없습니다 — 장면이 곧 버튼**이에요(112번 §11-4).
   *
   * 🔑 **밝기가 곧 판정입니다.** 칸의 밝기 = 지금 그 칸을 누르면 나올 `s`예요.
   *    그려진 것과 판정하는 것이 **같은 값**이라 «보이는 폭이 그대로 판정»이 됩니다(원칙 ③).
   *    ⛔ 밝기에 보정 곡선을 얹지 마세요 — 그 순간 화면이 거짓말을 시작합니다.
   *
   * 🔴 **옛 판은 자유 좌표였습니다** — *"골문 아무 데나 누르세요"*. 공간이 문제가 아니라
   *    **경계가 없는 게** 문제였어요(112번 §11-2). 격자는 **고를 것을 눈에 보이게** 합니다.
   *    🔴 같이 죽은 것 둘: `ONE.need`(*"여유가 클수록 좋다"*는 오차의 반대 방향) ·
   *    골대 기둥까지 오차에 넣던 `margin`의 3항 `Math.min`(규칙이 둘이었어요).
   *    ✅ 산 것: **골문이라는 공간** · 키퍼가 각을 좁힌다는 장면 · `grow`(다 나오기까지의 시간).
   *
   * 🦶 주발 — **주발 쪽 절반의 칸이 더 넓게 밝습니다**(판정 창 ±25%가 그대로 밝기예요).
   *    한가운데 칸은 딱 절반 경계에 서니 **어느 쪽도 아닌 중립**으로 둡니다.
   *    ⚠️ `.w2m-half`(색으로 갈린 절반)와 `cellMul`(판정)이 **같은 조건**을 써야 해요 —
   *       한쪽만 고치면 화면이 판정과 반대를 가리킵니다(2026-08-29에 실제로 났던 버그).
   * ================================================================ */

  /* 🎲 판 하나의 무대 — **키퍼가 어느 쪽으로, 얼마나 미끄러지나** 둘뿐이에요.
   * 🔒 둘 다 화면에 그대로 보입니다(🧤가 가는 방향과 거리). 숨은 정보가 없어요.
   * 🔒 `side`는 판 내내 **안 바뀝니다** — 키퍼가 가운데를 넘으면 좌우 빈 곳이 뒤집혀서
   *    **대칭으로 보이는 화면인데 한쪽만 정답**이 되는 절벽이 나요(`ONE` 주석의 🔒). */
  const oneRoll = () => ({
    side: Math.random() < 0.5 ? -1 : 1,                 // 🧤가 미끄러지는 쪽 (그 반대가 빈 곳)
    off0: randIn(ONE.off[0], ONE.off[1]),               // 가운데에서 벗어난 출발 거리
    slide: randIn(ONE.slide[0], ONE.slide[1]),          // 그 판에서 더 미끄러지는 거리
  });

  /* ⏱️ **닫힌 식이에요 — 프레임을 누적하지 않습니다.** 그래야 60fps든 30fps든,
   * 검사의 가상 시계든 판정이 똑같아요(rAF가 가짜였을 때 판이 통째로 얼어붙은 자리입니다).
   *
   *   cov   키퍼가 덮은 반폭 (몸이 벌어져요)
   *   kc    🧤 키퍼의 한가운데 — 50에서 출발해 `side` 쪽으로 미끄러져요
   *   near  빈 곳 쪽을 향한 몸 끝 — 여기서부터가 빈 곳이에요
   *   best  🔑 **빈 곳의 한가운데.** `(cov 벌어짐 − slide)`의 절반만 밀립니다
   *   openW 남은 빈 곳의 폭 — 🔒 **늘 줄어들어요**(`slide < cov1 − cov0`이라서)
   *   tight 🔑 **각이 좁아진 정도** — 판정 창에 곱해집니다. 기다리면 창만 좁아져요 */
  const oneAt = (b, sec) => {
    const p = clamp(sec * 1000 / ONE.grow, 0, 1);
    const cov = ONE.cov0 + (ONE.cov1 - ONE.cov0) * p;
    const kc = 50 + b.side * (b.off0 + b.slide * p);
    const openLeft = b.side > 0;                       // 키퍼가 오른쪽으로 가면 빈 곳은 왼쪽
    const near = openLeft ? kc - cov : kc + cov;
    return { p, cov, kc, near, openLeft,
      best: openLeft ? near / 2 : (near + 100) / 2,
      openW: openLeft ? near : 100 - near,
      tight: 1 - ONE_CLOSE * p };
  };
  /* 칸의 중심(골문 폭 %)과 칸 폭 */
  const oneCellX = (i) => (i + 0.5) * (100 / ONE.cells);
  /* 🏔️ 오차 — **바닥이 여기서 깔립니다.** *"이 칸 어딘가"*이지 *"정확히 중심"*이 아니에요. */
  const oneErr = (cx, best) => cellFloorErr(Math.abs(cx - best), 100 / ONE.cells);

  function runShotGrid(container, ctx, gate) {
    const right = ctx.foot !== "L";                 // 오른발잡이면 골문 오른쪽 절반이 주발 쪽
    const board = oneRoll();
    /* 🦶 칸마다 창 배수를 **한 번만** 잽니다 — 칸 중심은 안 움직이니까요.
     * 🔒 **6칸은 50에 앉는 칸이 없어 3 : 3으로 깔끔히 갈립니다.**
     *    중립 갈래(`cx === 50`)는 홀수 칸이던 시절의 자리예요 — 지금은 한 번도 안 걸립니다.
     *    ⚠️ 홀수로 되돌리면 다시 걸리니 지웠다가 되살리지 말고 그대로 두세요. */
    const cellMul = (cx) => winMul(ctx.condition, cx === 50 ? 1 : ((cx > 50) === right ? STRONG : WEAK));
    const cells = [];
    for (let i = 0; i < ONE.cells; i++) {
      const cx = oneCellX(i);
      cells.push({ i, x: cx, mul: cellMul(cx), strong: cx !== 50 && (cx > 50) === right });
    }

    /* 🎨 격자는 **뼈대만 인라인**으로 박습니다(자리·크기). 색과 빛은 style.css 몫이에요 —
     * `--m-cell-line`·`--m-lit`을 정의하면 그대로 갈아입습니다(!important가 필요 없어요).
     * 🔒 밝기(opacity)만 JS가 매 프레임 씁니다. 그게 곧 `s`니까 CSS가 정할 수 없어요. */
    const cw = (100 / ONE.cells).toFixed(4);
    const cellHTML = cells.map((c) => `<button type="button" class="w2m-cell${c.strong ? " w2m-strong" : ""}"`
      + ` data-i="${c.i}" aria-label="골문 ${c.i + 1}번 칸"`
      + ` style="position:absolute;top:0;bottom:0;left:${(c.i * (100 / ONE.cells)).toFixed(4)}%;width:${cw}%;`
      + `padding:0;background:transparent;border:0;`
      + (c.i ? `border-left:1px solid var(--m-cell-line, rgba(255,255,255,.26));` : "")
      + `cursor:pointer">`
      + `<i class="w2m-cell-lit" style="position:absolute;top:0;right:0;bottom:0;left:0;opacity:0;`
      + `background:var(--m-lit, rgba(255,214,102,.78));pointer-events:none"></i>`
      /* 🔮 **미래 예고 띠** — `ONE.look`(0.45초) 뒤의 밝기예요. 아래쪽에 얇게 깝니다. */
      + `<i class="w2m-cell-next" style="position:absolute;right:0;bottom:0;left:0;height:5px;opacity:0;`
      + `background:var(--m-lit-next, rgba(255,214,102,.5));pointer-events:none"></i></button>`).join("");

    /* 🦶 **양쪽에 다 이름표를 답니다.** 주발 쪽에만 달면 반대편이 "그냥 골문"으로
     * 보여서 좁아진 줄을 몰라요 — 좌우가 다르다는 게 안 읽히면 통제할 수 없는
     * 노이즈가 됩니다(원칙 ③). 색도 앰버 ↔ 회색으로 갈라 둡니다.
     * 🔴 판정 줄(`cellMul`)과 **같은 모양**의 조건을 씁니다 — 한쪽만 고치면
     *    화면이 판정과 반대를 가리켜요(2026-08-29에 실제로 났던 버그입니다). */
    const W = ctx.words;
    /* 🏷️ **종류를 클래스로 남깁니다** — `w2m-k-goal` · `w2m-k-assist`.
     * 🔴 이게 없으면 `style.css`가 **한국어 `aria-label`의 첫 글자**로 종류를 갈라야 해요
     *    (director가 임시로 `[aria-label^="문전"]`에 붙여 뒀습니다). 낱말을 고치는 날
     *    **CSS가 조용히 안 걸리는** 자리라, 여기서 구조로 내줍니다. */
    const wrap = box(container, "w2m-oneone w2m-k-" + ctx.kind,
      head(ctx.stake, W.title, W.why)
      + `<div class="w2m-goal" role="group" aria-label="${esc(W.aria)}">`
      + `<div class="w2m-half ${right ? "w2m-weak" : "w2m-strong"}" style="left:0;width:50%"></div>`
      + `<div class="w2m-half ${right ? "w2m-strong" : "w2m-weak"}" style="left:50%;width:50%"></div>`
      + cellHTML
      /* 🧤 키퍼 — **트랙도 몸통도 프레임마다 움직입니다.**
       *   트랙 `.w2m-keeper`  translateX(kc%)   — 가운데에서 한쪽으로 미끄러져요
       *   몸통 `.w2m-keeper-body` scaleX(cov/50) — 각을 지우며 벌어져요
       * 몸통은 폭 100%(골문 폭)를 kc에 중심 두고 있어서 scaleX(cov/50) = 폭 2·cov% 예요.
       * 🔒 **둘 다 transform입니다** — left·width를 프레임마다 쓰면 그때마다 레이아웃이 다시 돕니다.
       * 🔒 **칸보다 뒤에 그립니다** — 밝은 칸이 키퍼를 덮으면 «어디가 막혔는지»가 사라져요.
       *    `.w2m-keeper`는 pointer-events: none이라 위에 있어도 탭을 안 가로챕니다. */
      + `<div class="w2m-keeper"><i class="w2m-keeper-ghost" style="position:absolute;left:-50%;top:12%;`
      + `width:100%;height:76%;border-radius:10px;pointer-events:none;`
      + `border:1px dashed var(--m-ghost, rgba(233,238,255,.5))"></i>`
      + `<i class="w2m-keeper-body"></i><b class="w2m-keeper-face">🧤</b></div>`
      + `<b class="w2m-ball" aria-hidden="true" style="position:absolute;left:50%;bottom:2px;`
      + `transform:translateX(-50%);pointer-events:none;font-size:.9rem;line-height:1">⚪</b>`
      + `<span class="w2m-foot-tag strong" style="${right ? "right:4px" : "left:4px"}">🦶 ＋${Math.round(FOOT_WIN * 100)}%</span>`
      + `<span class="w2m-foot-tag weak" style="${right ? "left:4px" : "right:4px"}">약발 －${Math.round(FOOT_WIN * 100)}%</span>`
      + `</div>`
      + `<p class="w2m-tip">${esc(W.tip)}</p>`);

    const goal = wrap.querySelector(".w2m-goal");
    const keeper = wrap.querySelector(".w2m-keeper");
    const kbody = wrap.querySelector(".w2m-keeper-body");
    const tip = wrap.querySelector(".w2m-tip");
    const ghost = wrap.querySelector(".w2m-keeper-ghost");
    cells.forEach((c) => {
      c.el = wrap.querySelector(`.w2m-cell[data-i="${c.i}"]`);
      c.lit = c.el.querySelector(".w2m-cell-lit");
      c.next = c.el.querySelector(".w2m-cell-next");
    });
    /* 🔒 min-height라 style.css가 더 키울 수 있어요(폰에서 손가락으로 누를 칸이라
     * 96px은 빠듯합니다). inline height였다면 CSS가 절대 못 이깁니다. */
    if (!goal.style.minHeight) goal.style.minHeight = "96px";
    const end = ender(wrap, ctx);
    const t0 = nowMs();
    let urgent = false;

    /* 🎯 그 순간 그 칸의 `s`. **판정도 그림도 이 한 줄을 지납니다** — 둘이 갈라질 자리가 없어요.
     * 🔒 창을 좁히는 것(`tight`)과 🦶·🫀·♿(`c.mul`)이 **곱해져서 하나의 mul**로 들어갑니다 —
     *    `상수 × mul` 꼴이라야 🦶·🫀·♿가 같은 비율로 걸려요.
     * 🏔️ 오차는 `oneErr`가 **바닥을 깔아** 줍니다 — 그게 `s`의 천장이에요. */
    const cellS = (c, a) => sOne(oneErr(c.x, a.best), a.tight * c.mul);

    /* ---------- 🔮 **화면이 미래를 흘립니다** (112번 §12) ----------
     *
     * 🚨 **왜 넣나** — 격자가 「내다보기」라는 축을 드러냈습니다. 손의 정확도는 완만히 늘지만
     *    내다보기는 *"아, 미리 눌러야 하는구나"* **한 번이면 끝**이라, 숙련도 폭이 아니라
     *    **「안다 / 모른다」 계단**이 돼요. 🔑 그건 범민 님이 말씀하신 *"이해하기 어렵다"*와
     *    **정확히 같은 축**입니다. 그래서 **숨기지 않고 화면에 답니다.**
     *
     *   🧤 **키퍼의 자취** — `look` 뒤에 **어디까지 미끄러져 얼마나 벌어질지** 점선으로
     *   🔮 **예고 띠**     — `look` 뒤 그 칸의 밝기. **곧 어두워질 칸 · 곧 밝아질 칸**이 보여요
     *
     * 🔒 **`s`에는 한 톨도 안 들어갑니다.** 판정은 그대로이고, 바뀌는 건 «미리 알 수 있느냐»뿐이에요.
     *    그래서 곡선이 아니라 **읽기 축**으로 흡수됩니다.
     * ⛔ 예고 띠를 판정에 쓰지 마세요 — 그 순간 규칙이 둘이 되고, 화면이 결과를 만드는 자리가 됩니다. */
    const paint = (t) => {
      const sec = (t - t0) / 1000;
      const a = oneAt(board, sec);
      const nx = oneAt(board, sec + ONE.look / 1000);
      keeper.style.transform = `translateX(${a.kc.toFixed(2)}%)`;
      kbody.style.transform = `scaleX(${(a.cov / 50).toFixed(4)})`;
      /* 🔮 자취는 **트랙 안에서** 그리니 지금 자리와의 **차이**만큼 더 밉니다.
       * 자취의 폭이 골문 폭과 같아서 translateX(d%)가 곧 골문 폭의 d%예요. */
      ghost.style.transform = `translateX(${(nx.kc - a.kc).toFixed(2)}%) scaleX(${(nx.cov / 50).toFixed(4)})`;
      for (const c of cells) {
        const v = cellS(c, a), v2 = cellS(c, nx);
        c.lit.style.opacity = v.toFixed(3);
        c.next.style.opacity = v2.toFixed(3);
        /* 🎯 **판정 등급 셋을 그대로 그립니다** (설계 122번 §2-2).
         *      `hot` s ≥ perfect  「지금 누르면 완벽」
         *      `in`  s > 0        「빈 곳에 닿아요」
         *      없음  s = 0        「키퍼 정면이거나 너무 멀어요」
         * 🔴 **`hot`은 「지금 가장 좋은 칸」이 아닙니다** — **「지금 누르면 완벽인 칸」**이에요.
         *    드문 게 맞습니다(프레임의 7.8~17.5%). 🔒 **문턱을 「자주 뜨게」 내리지 마세요** —
         *    내리는 순간 표시와 판 끝 문구가 갈라집니다. 주인은 위 `TIER_S`예요.
         * 🔒 **둘은 배타입니다.** 겹치면 한 칸에 굵은 링과 가는 테두리가 같이 떠서
         *    **두 채널이 같은 말을 두 번** 합니다.
         * 🔑 초보자에게 필요한 건 정답이 아니라 **「이 칸은 0점」**이고, 그게 `in`이 없는 칸이에요 —
         *    밝기 0.05와 0의 차이는 3.4초 안에 폰에서 못 읽습니다. */
        const hot = v >= TIER_S.perfect;
        c.el.classList.toggle("w2m-cell-hot", hot);
        c.el.classList.toggle("w2m-cell-in", !hot && v > TIER_S.in);
        /* 「곧 어두워짐」을 클래스로도 — 색으로만 알리면 색약에서 안 읽혀요.
         * 🔒 **위 등급과 다른 축**이라 `hot`·`in` 어느 쪽과도 겹칩니다(위 = 등급 · 아래 = 시간). */
        c.el.classList.toggle("w2m-cell-soon", v2 < v - 0.08);
        /* 🪦 **`rise`(곧 좋아질 칸)는 없습니다 — 지웠습니다** (2026-09-02 · 설계 122번 §4).
         * 이 판에는 「기다리면 좋아지는 칸」이 **구조적으로 존재하지 않아요** —
         * `ONE`의 🔒 `slide 최대 < cov1 − cov0`(16 < 24)이 그걸 **금지**합니다.
         * 실측: 1,785,000 프레임 중 **289 프레임(0.016%)** · 가능한 최대 상승 0.074~0.085 < 문턱 0.08.
         * 🔑 **0.016%는 버그가 아니라 그 불변식이 지켜지고 있다는 계측**이었어요.
         * 🚨 **문턱을 내려서 되살리지 마세요** — 되살아나는 건 클래스가 아니라
         *    **「기다려」라는 거짓말**이고, 판정은 여전히 **「빨리 차」**입니다.
         *    되살리려면 위 부등호를 먼저 깨야 하고, 그러면 「빨리 차라」가 통째로 죽습니다. */
      }
      return a;
    };

    const tick = (t) => {
      if (ctx.done) return;
      const a = paint(t);
      /* 다 나온 뒤 `life`까지 약 1초는 **화면이 거의 안 변합니다.** 그 사이에 놓치면
       * "아무 일도 없었는데 실패"가 돼요 — 한 줄로 알려요. 움직이는 재촉 막대를 넣지 않는 건
       * 조준 판이라 **표적이 하나여야** 하기 때문이에요. */
      if (!urgent && a.p >= 1) {
        urgent = true;
        tip.textContent = W.urgent;
        tip.classList.add("urgent");
      }
      if (t - t0 >= ONE.life) {
        end(0, W.late);
        return;
      }
      RAF(tick);
    };

    /* 👆 **칸 하나 탭.** 손가락이 어느 칸에 닿았는지는 세 갈래로 찾아요 —
     *   ① 누른 요소가 칸이면 그 칸 (키보드 Enter도 여기로 옵니다)
     *   ② 좌표가 있으면 좌표가 든 칸
     *   ③ 둘 다 없으면(폭을 못 재는 환경) 한가운데 칸
     * 🔒 `onTap`을 **골문 하나**에만 답니다 — 칸마다 달면 탭 자리가 여섯 군데로 늘어나고,
     *    `wiring-test.js`가 세는 탭 자리 수가 통째로 흔들려요. */
    const cellFrom = (e) => {
      const t = e && e.target;
      const hit = t && t.closest ? t.closest(".w2m-cell") : null;
      if (hit && hit.dataset && hit.dataset.i != null) return clamp(Number(hit.dataset.i), 0, ONE.cells - 1);
      const r = goal.getBoundingClientRect();
      const w = r.width || 300;
      if (!e || e.clientX == null) return Math.floor(ONE.cells / 2);
      const x = clamp((e.clientX - r.left) / w * 100, 0, 99.9999);
      return Math.floor(x / (100 / ONE.cells));
    };

    onTap(goal, (e) => {
      if (ctx.done) return;
      const c = cells[cellFrom(e)];
      ctx.weak = !c.strong && c.x !== 50;
      const a = oneAt(board, (nowMs() - t0) / 1000);   // 🔒 판정은 그 순간의 값 — 그림이 아니에요
      const s = cellS(c, a);
      /* 🗣️ 실패 문구만 «키퍼 몸에 걸친 칸인가»로 갈라요 — **판정이 아니라 말**입니다.
       *    (판정은 위 한 줄이 전부예요. 여기에 갈래를 더하면 규칙이 둘이 됩니다) */
      const onKeeper = Math.abs(c.x - a.kc) < a.cov;
      /* 🔗 문턱을 여기 다시 적지 않습니다 — **주인은 `TIER_S`**예요(위 주석).
       * 화면의 `hot`·`in`과 **같은 자**라야 «표시가 곧 사후 설명»이 됩니다. */
      end(s, s >= TIER_S.perfect ? W.great + (ctx.weak ? " 🦶 약발로!" : "")
        : s > TIER_S.in ? W.ok
          : onKeeper ? W.onKeeper : W.far);
    }, gate);
    paint(t0);
    RAF(tick);
  }

  /* ---------- 🗣️ 창구 — **판은 하나, 낱말은 셋** ----------
   *
   * 🔑 **여기서 갈리는 것은 낱말뿐입니다.** `runShotGrid`는 한 벌이고 산식도 한 줄이에요 —
   *    카드 종류가 고르는 건 **무슨 장면인가**뿐입니다.
   * 🔴 **🧱 수비 칸이 없는 게 맞습니다** — 수비는 판을 안 열어요(머리말 🎭 · 117번 §6).
   *    여기에 `defend`를 채워 넣는 순간 **수비 상황에 상대 골문이 뜹니다.**
   * 🔴 옛 `GAMES`(moment → 게임)는 죽었어요. 게임이 하나라 **moment로 고를 게 없습니다.**
   *    엔진의 `MINI` 표는 그대로 두고(engine.js는 한 줄도 안 건드려요) `opts.moment`는
   *    **화면 고르기에 안 씁니다** — `detail.moment`로 그대로 되돌려만 줘요.
   *
   * 🖼️ 세 줄 위계 (준비 화면과 본 게임 상자가 **같은 세 줄**을 씁니다)
   *      [상황 분류] `STAKE[kind]`  ·  [무엇을] `title`  ·  [왜/어떻게] `why`
   *
   * ⚠️ **낱말은 축구의 낱말입니다.** 화면의 이름(«칸»·«창»)이 아니라 «빈 곳»·«코스»예요. */
  const WORDS = {
    goal: {
      title: "🥅 일대일 슈팅",
      why: "🧤 키퍼가 미끄러진 <b>반대쪽</b> — <b>테두리가 있는 칸</b> 중 가장 밝은 칸으로 차요",
      aria: "골문 6칸 — 가장 밝은 칸으로 차세요",
      lines: [
        "🧤 키퍼가 <b>가운데에서 한쪽으로</b> 미끄러지며 각을 지워요.",
        "<b>키퍼가 간 쪽의 반대</b>가 빈 곳이에요. 빈 곳 한가운데에 가까운 칸일수록 <b>밝아요.</b>",
        "🦶 주발 쪽 절반은 <b>더 넓게</b> 밝고, 약발 쪽 절반은 좁게 밝아요.",
      ],
      keys: [{ name: "골문 칸", desc: "테두리 = 빈 곳에 닿는 칸 · ◎ = 완벽. 기다릴수록 테두리가 줄어요" }],
      tip: "키퍼가 각을 다 지우기 전에요!",
      urgent: "🧤 각이 거의 없어요! 지금 안 차면 놓쳐요",
      great: "🥅 빈 곳 한가운데를 정확히!",
      ok: "🥅 키퍼 손끝을 스치고 들어갔어요",
      onKeeper: "🧤 키퍼 정면이었어요",
      far: "😖 빈 곳에서 너무 멀었어요",
      late: "🧤 키퍼가 각을 다 지웠어요 — 슛 타이밍을 놓쳤어요",
      hit: "⚡",
    },
    assist: {
      title: "⚡ 컷백 연결",
      why: "🧤 키퍼가 비운 쪽 — <b>테두리가 있는 칸</b> 중 가장 밝은 칸으로 굴려 주세요",
      aria: "문전 6칸 — 가장 밝은 칸으로 연결하세요",
      lines: [
        "🧤 키퍼가 <b>가운데에서 한쪽으로</b> 미끄러지며 문전을 덮어요.",
        "<b>키퍼가 간 쪽의 반대</b>가 빈 곳이에요. 그 한가운데에 가까운 칸일수록 <b>밝아요.</b>",
        "🦶 주발 쪽 절반은 <b>더 넓게</b> 밝고, 약발 쪽 절반은 좁게 밝아요.",
      ],
      keys: [{ name: "문전 칸", desc: "테두리 = 동료가 닿는 자리 · ◎ = 완벽. 기다릴수록 테두리가 줄어요" }],
      tip: "키퍼가 문전을 다 덮기 전에요!",
      urgent: "🧤 문전이 거의 다 덮였어요! 지금 안 주면 놓쳐요",
      great: "🅰️ 딱 비어 있던 자리로!",
      ok: "🅰️ 연결은 됐는데 한 발 멀었어요",
      onKeeper: "🧤 키퍼가 먼저 잘라 냈어요",
      far: "😖 아무도 없는 곳으로 갔어요",
      late: "🧤 문전이 다 덮였어요 — 연결할 곳이 없었어요",
      hit: "✨",
    },
  };

  /* 🔑 준비 화면의 「본 횟수」는 **한 열쇠**를 씁니다 — 규칙이 하나뿐이라
   * 종류마다 세 번씩(모두 아홉 번) 전문을 펴면 그게 그냥 잔소리가 돼요.
   * 낱말은 그때그때 그 카드의 것으로 보여 줍니다. */
  const SHOT_KEY = "w2-shot";

  /* 화면이 부르는 자리. 준비 화면 → 본 게임 → cb(판정) 순서예요.
   * 🤖 자동 진행은 여기까지 안 옵니다 — career.js가 미니게임을 아예 안 열고
   * 지금의 확률 굴림(autoJudge)을 그대로 써요. */
  /* 🎮 **그 종류가 판(화면)을 여는가** — 🔑 이 물음의 **주인은 여기 하나**입니다.
   * 부르는 쪽(`game.js`의 유스 순간 카드)은 상자를 비우고 클래스를 붙이기 **전에** 이걸 묻습니다.
   * 🔒 `opens`가 거짓이면 `play()`는 **화면을 한 조각도 안 그리고** 중립(`s = 0.5`)으로 흘려요. */
  const opens = (kind) => kind !== "defend";

  function play(container, opts, cb) {
    const o = opts || {};
    const done = typeof cb === "function" ? cb : () => {};
    const judge = typeof o.judge === "function" ? o.judge : loneJudge;
    /* 🧱 **수비는 판이 없습니다** (117번 §6 · 머리말 🎭).
     * `s = 0.5`면 `cardP = autoP`라 **결과가 자동 갈래와 정의상 같아요** — 육성은 살고
     * 조작만 빠집니다. 🔒 **화면을 한 조각도 안 그립니다** — 손잡이처럼 보이는 것을
     * 띄웠다가 아무것도 안 하면 그게 노이즈예요(원칙 ③).
     *
     * 🔴 **부르는 쪽도 같은 것을 물어야 하는데, 「같은 판단을 두 번 적지」 않습니다.**
     *    부르는 쪽이 `kind === "defend"`를 **따로 적으면** 방어가 겹쳐요 — 한쪽을 지워도
     *    증상이 0장이라 **검사가 통째로 아무것도 못 지킵니다**(CLAUDE.md 「방어가 겹침」).
     *    그래서 판단의 주인은 **`opens(kind)` 하나**이고, 아래 줄도 부르는 쪽도 그걸 씁니다.
     * ⚠️ 부르는 쪽이 이걸 안 물으면 **상자를 비우고 클래스를 붙인 채로** 여기 닿아서
     *    «아무것도 안 하는 빈 상자»가 뜹니다 — 그래서 여기서도 한 번 더 막아요. */
    if (!opens(o.kind)) { done(judge(0.5), { s: 0.5, moment: o.moment || "block", weak: false }); return; }
    /* 🔒 모르는 kind는 ⚽ 결정으로 떨어뜨립니다 — 화면이 통째로 안 뜨는 것보다 나아요. */
    const kind = WORDS[o.kind] ? o.kind : "goal";
    const words = WORDS[kind];
    const ctx = {
      done: false, weak: false, kind, words,
      /* 🔒 `moment`는 **엔진이 준 이름 그대로 되돌려 줍니다.** 화면을 고르는 데는 안 써요 —
       * 판이 하나라 고를 게 없고, `MINI` 표(engine.js)는 한 줄도 안 건드렸습니다. */
      moment: o.moment || "oneone",
      condition: o.condition, foot: o.foot === "L" ? "L" : "R",
      /* 🖼️ 세 줄 위계의 첫 줄 — 본 게임 상자가 준비 화면과 **같은 줄**을 씁니다 */
      stake: STAKE[kind] || STAKE.goal,
      cb: done,
      toJudge: judge,
    };
    if (!container) { ctx.cb(ctx.toJudge(0.5), { s: 0.5, moment: ctx.moment, weak: false }); return; }
    ready(container, {
      key: SHOT_KEY, title: words.title, why: words.why, lines: words.lines,
      keys: words.keys, stake: ctx.stake,
    }, (gate) => runShotGrid(container, ctx, gate));
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
    play, opens, WORDS,
    /* 🧪 실측·검사 창구. **판정 산식이 아니라 조작 성공도만** 여기 있어요 —
     * 검사가 여기서 문턱을 읽어 가면 상수를 바꿔도 안 잡힙니다(기준값은 검사에 직접 적으세요). */
    _t: { sOne, sBar, winMul, wideOn, loneJudge,
      /* 🥅 무대와 좌표 — **실측·검사가 산식을 베껴 적지 않게** 내보냅니다.
       * `oneAt`은 닫힌 식이라 화면 없이도 판을 그대로 굴릴 수 있어요. */
      oneRoll, oneAt, oneCellX, oneErr, cellFloorErr,
      /* 🔒 손잡이 셋을 **따로** 내보냅니다 — 같은 표에 두면 무엇을 고쳤는지 못 가려요
       *    (`ONE_WIN` 난이도 · `ONE_CLOSE` 지분 · `CELL_FLOOR` 천장) */
      K: { ONE, ONE_WIN, ONE_CLOSE, CELL_FLOOR, STRONG, WEAK, WIDE, FOOT_WIN } },
  };
})();
