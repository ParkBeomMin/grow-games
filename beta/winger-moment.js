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
 * ── 🚨 읽기와 타이밍의 화면 문법을 섞지 않습니다 (설계 §4-2 · 104번 §2-3) ──
 *   읽기 화면   = 방향 버튼 3개. **움직이는 것이 화면에 하나도 없어야 해요.**
 *   타이밍 화면 = 움직이는 표적 + 누르기. **판단으로 이기는 요소가 없어야 해요.**
 * 🧊 볼카운트는 *"타이밍처럼 생겼는데 핵심이 안 누르기"*라 세 번 고치고 버렸습니다.
 *
 * ── 🖼️ 세 줄 위계와 낱말 (112번 §11-8) ─────────────────────
 * 넷의 머리는 **늘 세 줄**이에요 — 준비 화면에도, 본 게임 상자에도 같은 세 줄이 섭니다.
 *
 *     [상황 분류]  작게   `.w2m-stake`   ⚽ 골 찬스 — 넣으면 골이에요
 *     [무엇을]     크게   `.tm-label`    🥅 1대1 마무리
 *     [왜/어떻게]  한 줄  `.w2m-why`     키퍼가 지운 반대쪽, 밝은 칸을 노려요
 *
 * 🔴 **화면의 낱말이 아니라 축구의 낱말을 씁니다.** *"초록 존"*·*"갭"*·*"코스 칸"*은
 *    우리 화면의 이름이지 축구의 이름이 아니에요 — 도형이 무엇인지 모르면 규칙 설명이
 *    붙을 자리가 없습니다(112번 §11-1). 표는 이렇습니다:
 *      초록 존 → **빈 곳**   ·   갭 → **수비 사이**
 *      코스 칸 → **파고들 길**   ·   게이트·판정 창 → **밝은 칸**
 *    ⚠️ **클래스 이름은 그대로**예요(`.w2m-gate` 등). 바뀌는 것은 **사람이 읽는 문구**뿐입니다.
 *
 * ── 🖼️ 🥅 1대1의 화면 문법 — 장면 + 격자 + 칸 탭 (112번 §11-4) ──
 *   **축구 장면 하나 · 그 위에 격자 · 방해하는 것이 시간에 따라 움직임 ·
 *   한 번 탭이 「어디 + 언제」를 동시에.** 버튼이 없어요 — **장면이 곧 버튼**입니다.
 * 🔴 옛 🥅는 **자유 좌표**였습니다("골문 아무 데나 누르기"). 공간이 문제가 아니라
 *    **경계가 없는 게** 문제였어요 — *"아무 데나 눌러도 되나?"*가 남았습니다.
 *    격자는 **고를 것을 눈에 보이게** 합니다. 🔒 **칸 수는 「읽힘」의 손잡이이지
 *    난이도 손잡이가 아니에요**(112번 §11-5) — 난이도는 `ONE.win`이 잡습니다.
 *
 * 🔴 **🧱 차단은 그 둘을 「한 화면에」가 아니라 「두 화면으로 나눠」 씁니다** (104번 §2).
 *   1단계 읽기   — 정지 · 무제한 · 재촉 연출 금지.  `beta/soccer/cup.js`의 승부차기 문법
 *                  그대로예요. 이 저장소에서 유일하게 성공한 축구 조작입니다.
 *   2단계 타이밍 — 상대가 지나가고 **버튼 하나**로 몸을 던져요. 겨냥이 없습니다.
 *   🔑 **1단계가 2단계의 판정 창 폭을 정합니다** — 읽기가 결과에 직접 실려요.
 * 🔴 **두 국면을 한 화면에 합치면 그 순간 정확히 🧊 볼카운트가 됩니다.**
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
   * 🔒 **손잡이 셋을 같은 표에 두지 마세요** — `BLK_WIN` ↔ `BLK_READ`와 같은 구조예요:
   *      `속도 ÷ 창`   난이도 (중립화 비)      → `ONE_WIN`
   *      몫 나누기      공간 ↔ 시간 지분        → `ONE_CLOSE`
   *      `CELL_FLOOR`  `s`의 **천장**          → 여기
   *
   * 🔒 **값은 넷이 공유하고 「거는 방식」만 다릅니다.** 🏃 컷인·🧱 차단은 이대로,
   *   🎯 킬패스는 **라인 쪽에만** 깝니다 — 라인 너머는 0 그대로예요(«아슬아슬함»이 그 판의 전부라
   *   양쪽에 깔면 절벽이 죽습니다). 지금은 🥅만 격자라 🥅만 겁니다.
   * ⚠️ **칸 폭에 비례합니다** — 칸이 좁으면 바닥도 낮아져요. 그래서 **읽힘(3~5칸)으로 칸 수를
   *   먼저 정하고, 그 칸 폭 위에서 비(`ONE_WIN`)로 난이도를 맞추는** 순서입니다(112번 §11-5 정정). */
  const CELL_FLOOR = 0.30;
  const cellFloorErr = (err, cellW) => Math.max(err, cellW * CELL_FLOOR);

  /* ---------- 📐 계수 ----------
   * 조작이 정하는 것은 `s`뿐이고, **평균적인 조작이 s ≈ 0.5**에 오도록 잡았습니다.
   * 그래야 `s = 0.5`가 중립인 §2-6의 정의 위에서 balancer의 곡선이 안 흔들려요.
   * 실측 절차와 결과는 `docs/superpowers/_workspace/50_engineer_minigames.md`에 있어요. */
  const CUT = { speed: 118, win: 12, lane: [26, 74], sweeps: 3 };
  /* 🥅 1대1 — **골문 격자의 무대** (112번 §11-4에서 자유 좌표를 대체했어요)
   *
   * 🧤 키퍼가 `kc`에 서서 **달려나오며 각을 지웁니다.** 덮는 반폭이 `cov0 → cov1`로
   * 벌어지고, 「좋은 지점」은 **넓은 쪽 빈 곳의 한가운데**예요 —
   * `cov`가 벌어지는 만큼의 **절반**씩 바깥으로 밀립니다.
   *
   * 🔒 `cells`는 **「읽힘」의 손잡이**입니다. 한눈에 세어지는 수(3~5)라 5로 뒀어요.
   *    ⚠️ 다만 **난이도와 무관하지는 않습니다**(112번 §11-5 정정) — 칸이 좁으면
   *    `CELL_FLOOR`가 만드는 바닥도 같이 낮아져요. **읽힘으로 먼저 정하고, 그 칸 폭에서
   *    `ONE_WIN`으로 난이도를 맞추는** 순서입니다. 🔴 칸 수를 바꾸면 `ONE_WIN`을 다시 재세요.
   * 🔒 `look`은 **화면이 미리 보여 주는 시간**이에요 — `s`에 안 들어갑니다(§아래 「미래 흘리기」).
   *
   * 🔴 **`need`는 죽었습니다.** *"키퍼 몸에서 남은 여유가 클수록 좋다"*는 옛 형태예요 —
   *    넷 중 혼자 *"오차가 작을수록"*이 아니라 *"여유가 클수록"*이었고, 그 반대 방향이
   *    112번 §1-3이 짚은 «오차의 뜻이 넷 다 다르다»의 한 자리였습니다.
   *    🚨 **같은 계단을 다른 이름으로 되살리지 마세요** — 폐기된 건 이름이 아니라 형태예요.
   *    (`kw0`·`kw1`은 `cov0`·`cov1`로 이름만 바꿨어요. **키퍼가 덮는 반폭**이라는 뜻은 그대로입니다.)
   * 🔒 `post`는 **그림만** 남습니다(골대 기둥). 판정에서는 빠졌어요 — 격자의 바깥 칸이
   *    곧 골문 구석이라 기둥까지 오차에 넣으면 규칙이 둘이 됩니다. */
  const ONE = { cells: 5, kc: [18, 82], cov0: 10, cov1: 34, grow: 2400, life: 3400, look: 450, post: 3.5 };

  /* 🎚️ **난이도 손잡이 — 「속도 ÷ 창」의 창 쪽.** 여기 하나만 만지세요.
   * 「속도」는 좋은 지점이 밀리는 빠르기(`(cov1−cov0)/2 ÷ grow`)이고, 그 둘의 **비**가 난이도예요.
   * 🔴 `ONE_CLOSE`나 `CELL_FLOOR`로 난이도를 맞추지 마세요 — 그 둘은 다른 축입니다. */
  const ONE_WIN = 23;

  /* ⚖️ **몫 나누기 — 공간 ↔ 시간 지분.** 난이도가 아니라 **무엇으로 이기는가**를 정합니다.
   * 0에 가까우면 «어느 칸인가»(공간)만 남고, 크면 «언제 누르는가»(시간)가 무거워져요.
   * 🔒 `CELL_FLOOR`가 천장을 따로 잡고 있어서 **여기를 자유롭게 나눌 수 있습니다** —
   *    옛날에는 이 값으로 천장까지 만들려다 격자를 버튼 하나로 만들 뻔했어요. */
  const ONE_CLOSE = 0.45;
  const KP = { win: 8, line: 92, speed: [22, 34], start: [6, 34], life: 6000 };
  /* 🧱 차단 **1단계(읽기)의 신호 계수**입니다 — 읽을 것이 **둘**이에요(주발 · 몸 방향).
   * (2단계의 무대·판정 창은 아래 `BLK_RUN`·`BLK_WIN`·`BLK_READ`가 따로 들고 있어요)
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
  const BLK = { tellHi: 0.58, tellLo: 0.24, hiP: 0.5, favor: 1.6 };

  /* 🧱 2단계 무대 — 상대가 내 앞을 지나갑니다 (104번 §2-1).
   * 🔒 **겨냥이 없습니다.** 버튼은 하나뿐이고 고르는 것은 「언제」뿐이에요 —
   * 나머지 셋(어디를 겨눠 언제)과 장르가 겹치면 넷이 다 같은 게임이 됩니다(§2-4).
   * 속도는 판마다 흔들려요. **화면에서 보이는 흔들림**이라 노이즈가 아닙니다(원칙 ③) —
   * 고정 속도면 리듬을 외워서 읽기와 무관하게 만점이 나와요. */
  const BLK_RUN = { mark: 70, speed: [58, 74] };

  /* 📏 **중립화 값입니다. 난이도 손잡이가 아니에요.**
   * 🔗 종속값 — `BLK_READ`·`BLK_RUN`(상대 속도·차단 지점) 중 하나라도 바뀌면 **따라 재계산**하세요.
   * 이 값이 하는 일은 하나뿐입니다: 🔑 **개편 전후로 E[s] 평균을 그 자리에 붙들어 두는 것.**
   * (넷의 평균이 서로 0.017 안에 있는 게 원칙 ④를 만듭니다)
   *
   * 🔴 **절대값이 아니라 「짝지은 비교」로 잡았습니다** (106번 §3-1). 같은 조작자·같은 판으로
   *    옛 매핑 **0.5102** → 새 매핑 **0.5112**예요. 50번 표의 「0.537」은 두 사람이 따로
   *    재구성해도 안 나옵니다(제 0.5102 · inspector 0.510) — **그 표를 잰 모델에만 있던 값**이라
   *    절대값에 맞추면 모델의 치우침을 실제 난이도로 굳혀 버려요(원칙 ⑧).
   * 단위는 **트랙 폭의 %**예요 — `CUT.win`과 같은 자입니다. 실측 절차는 106번 §2. */
  const BLK_WIN = 14.2;

  /* 🎯 **읽기 보상 — 이건 트레이드오프 손잡이입니다.**
   * 「읽기를 얼마나 결과에 실을 것인가 ↔ 손을 얼마나 실을 것인가」를 맞바꿉니다.
   * 🔴 키우면 읽기 게임이 되고, 줄이면 타이밍 게임이 됩니다.
   * ⚠️ **숙련도 폭은 여기서 안 나옵니다** — 설계 §4-1이 그렇게 적었지만 실측이 다릅니다(106번 §5-①).
   *    끝에서 끝까지 훑어도 폭은 14.6 → 11.0%p뿐이에요. **폭을 만드는 건 손(σt)**입니다 —
   *    3택 읽기는 베이즈 최적으로 읽어도 정타율이 51%(찍기 33%)라 벌 수 있는 게 18%p뿐이거든요.
   * 🔑 **반대로 읽어도 0이 아닙니다** — *"역동작에 걸렸는데 발을 뻗어 걷어냈어요"*.
   *    손잡이가 항상 뭔가를 해야 합니다(원칙 ③).
   * 🔴 **`BLK_WIN`과 같은 표에 두지 마세요.** 하나는 평균을 붙드는 종속값이고
   *    하나는 폭을 정하는 손잡이라, 섞으면 무엇을 고쳤는지 못 가립니다(원칙 ⑨). */
  const BLK_READ = { exact: 1.00, near: 0.45, opp: 0.15 };

  /* ---------- 🎯 `s` — 조작 성공도 ----------
   * 네 종이 **같은 모양**을 씁니다: s = 1 − 오차 / 판정창.
   * 모양이 같아야 난이도를 한자리에서 견줄 수 있어요 (설계 §4-4 ①). */
  const sBar = (err, win) => clamp(1 - err / Math.max(win, 1e-6), 0, 1);
  /* 🏃 수비 사이의 한가운데에서 벗어난 거리(%) */
  const sCut = (err, mul) => sBar(err, CUT.win * mul);
  /* 🥅 **누른 칸의 중심**이 그 순간의 **빈 곳 한가운데**에서 벗어난 거리(골문 폭 %).
   * 🔴 옛 `sOne(margin, mul)`은 *"여유가 클수록 좋다 · 키퍼 몸 안이면 0"*이었습니다 —
   *    **넷 중 혼자 반대 방향**이었고, 그 형태를 버렸어요(112번 §1-3 · §11-10).
   *    이름은 같지만 **받는 것이 「여유」에서 「오차」로 바뀌었습니다.** 🏃와 같은 자예요.
   * ⚠️ 창을 좁히는 것(키퍼가 지운 각)은 `mul`에 들어옵니다 — `상수 × mul` 꼴을 지켜야
   *    🫀 컨디션·♿ 확대가 넷에 **같은 비율**로 걸려요.
   * 🏔️ 넣는 `err`에는 **`CELL_FLOOR` 바닥이 이미 깔려 있어야** 합니다(`oneErr`) —
   *    바닥이 `s`의 천장을 만드는 자리예요. `sOne` 자신은 넷과 똑같은 자로 남습니다. */
  const sOne = (err, mul) => sBar(err, ONE_WIN * mul);
  /* 🎯 오프사이드 라인까지 남은 거리(%). 0에 가까울수록 좋고, 넘었으면 0 */
  const sKp = (gap, mul) => (gap < 0 ? 0 : sBar(gap, KP.win * mul));
  /* 🧱 1단계 읽기의 결과 — **판정 창의 폭**이 됩니다(104번 §2-2).
   * 가운데(1)에 붙으면 좌우로 나가도 몸을 걸칠 수 있어서 「인접」이에요. 좌↔우만 「반대」입니다.
   *
   * 🔴 **옛 `sBlk(pick, truth)`(정확 1 · 인접 0.24 · 반대 0)는 죽었습니다.**
   * 이름이 아니라 **형태**를 버린 거예요 — 읽기가 곧 `s`이면 조작과 결과 사이에 난수가
   * 한 겹 더 있어서, 완벽하게 읽어도 60%만 맞고 **잘 읽은 판과 찍은 판이 결과에서
   * 구분이 안 됐습니다**(104번 §1). 같은 계단을 다른 이름으로 되살리지 마세요. */
  const blkRead = (pick, truth) => (pick === truth ? "exact" : (pick === 1 || truth === 1) ? "near" : "opp");
  /* 🧱 읽기가 정한 판정 창(트랙 %). `sBar`는 나머지 셋과 **같은 자**를 씁니다 */
  const blkWin = (pick, truth, mul) => BLK_WIN * BLK_READ[blkRead(pick, truth)] * mul;

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
      + `<span class="w2m-side-win">${l.strong ? "＋" : "－"}${Math.round(FOOT_WIN * 100)}% ${l.strong ? "넓어요" : "좁아요"}</span></button>`).join("");
    /* ●●● — 남은 왕복. 갭은 CUT.sweeps번 오가고 닫혀요(그때 s=0). 안 그리면
     * "갑자기 닫혔다"가 되는데, 이미 걸려 있는 효과를 화면에 안 보여주는 건
     * 통제할 수 없는 노이즈예요(원칙 ③). */
    const wrap = box(container, "w2m-cutin",
      head(ctx.stake, ctx.title, "수비 사이가 파고들 길 위에 온 순간 그 길을 누르세요")
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

  /* 🎲 판 하나의 무대 — **키퍼가 어디에 서 있나** 하나뿐이에요.
   * 🔒 그 값이 화면에 그대로 보입니다(🧤가 선 자리). 숨은 정보가 없어요.
   * 🔴 가운데(50)를 피해 뽑습니다 — 딱 가운데면 좌우 빈 곳이 같아서 「넓은 쪽」이 안 정해져요. */
  const oneRoll = () => {
    let kc = randIn(ONE.kc[0], ONE.kc[1]);
    if (Math.abs(kc - 50) < 4) kc += kc < 50 ? -4 : 4;
    return { kc };
  };

  /* ⏱️ **닫힌 식이에요 — 프레임을 누적하지 않습니다.** 그래야 60fps든 30fps든,
   * 검사의 가상 시계든 판정이 똑같아요(rAF가 가짜였을 때 넷이 통째로 얼어붙은 자리입니다).
   *
   *   cov   키퍼가 덮은 반폭 (몸이 벌어져요)
   *   near  넓은 쪽을 향한 몸 끝 — 여기서부터가 빈 곳이에요
   *   best  🔑 **넓은 쪽 빈 곳의 한가운데.** cov의 절반만 밀리니 거의 안 움직입니다
   *   openW 남은 빈 곳의 폭 (화면에 그대로 보여요)
   *   tight 🔑 **각이 좁아진 정도** — 판정 창에 곱해집니다. 기다리면 창만 좁아져요 */
  const oneAt = (b, sec) => {
    const p = clamp(sec * 1000 / ONE.grow, 0, 1);
    const cov = ONE.cov0 + (ONE.cov1 - ONE.cov0) * p;
    const left = b.kc < 50;                            // 키퍼가 왼쪽이면 빈 곳은 오른쪽
    const near = left ? b.kc + cov : b.kc - cov;
    return { p, cov, near, left,
      best: left ? (near + 100) / 2 : near / 2,
      openW: left ? 100 - near : near,
      tight: 1 - ONE_CLOSE * p };
  };
  /* 칸의 중심(골문 폭 %)과 칸 폭 */
  const oneCellX = (i) => (i + 0.5) * (100 / ONE.cells);
  /* 🏔️ 오차 — **바닥이 여기서 깔립니다.** *"이 칸 어딘가"*이지 *"정확히 중심"*이 아니에요. */
  const oneErr = (cx, best) => cellFloorErr(Math.abs(cx - best), 100 / ONE.cells);

  function runOneone(container, ctx, gate) {
    const right = ctx.foot !== "L";                 // 오른발잡이면 골문 오른쪽 절반이 주발 쪽
    const board = oneRoll();
    /* 🦶 칸마다 창 배수를 **한 번만** 잽니다 — 칸 중심은 안 움직이니까요.
     * 한가운데 칸(중심 = 50)은 절반 경계에 딱 서서 어느 쪽도 아니에요 → 중립(1). */
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
    const wrap = box(container, "w2m-oneone",
      head(ctx.stake, ctx.title, "키퍼가 지운 반대쪽 — 가장 밝은 칸을 누르세요")
      + `<div class="w2m-goal" role="group" aria-label="골문 ${ONE.cells}칸 — 가장 밝은 칸을 누르세요">`
      + `<div class="w2m-half ${right ? "w2m-weak" : "w2m-strong"}" style="left:0;width:50%"></div>`
      + `<div class="w2m-half ${right ? "w2m-strong" : "w2m-weak"}" style="left:50%;width:50%"></div>`
      + `<i class="w2m-post" style="left:0;width:${ONE.post}%"></i>`
      + `<i class="w2m-post" style="right:0;width:${ONE.post}%"></i>`
      + cellHTML
      /* 🧤 키퍼 — 트랙은 kc%로 **한 번만** 밀고(kc는 안 바뀝니다), 몸통만 scaleX로 벌립니다.
       * 몸통은 폭 100%(골문 폭)를 kc에 중심 두고 있어서 scaleX(cov/50) = 폭 2·cov% 예요.
       * left·width를 프레임마다 쓰면 그때마다 레이아웃이 다시 돕니다.
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
      + `<p class="w2m-tip">키퍼가 각을 다 지우기 전에요!</p>`);

    const goal = wrap.querySelector(".w2m-goal");
    const keeper = wrap.querySelector(".w2m-keeper");
    const kbody = wrap.querySelector(".w2m-keeper-body");
    const tip = wrap.querySelector(".w2m-tip");
    keeper.style.transform = `translateX(${board.kc.toFixed(2)}%)`;
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
     *    `상수 × mul` 꼴이라야 넷이 같은 비율로 움직여요.
     * 🏔️ 오차는 `oneErr`가 **바닥을 깔아** 줍니다 — 그게 `s`의 천장이에요. */
    const cellS = (c, a) => sOne(oneErr(c.x, a.best), a.tight * c.mul);

    /* ---------- 🔮 **화면이 미래를 흘립니다** (112번 §12) ----------
     *
     * 🚨 **왜 넣나** — 격자가 「내다보기」라는 축을 드러냈습니다. 손의 정확도는 완만히 늘지만
     *    내다보기는 *"아, 미리 눌러야 하는구나"* **한 번이면 끝**이라, 숙련도 폭이 아니라
     *    **「안다 / 모른다」 계단**이 돼요. 🔑 그건 범민 님이 말씀하신 *"이해하기 어렵다"*와
     *    **정확히 같은 축**입니다. 그래서 **숨기지 않고 화면에 답니다.**
     *
     *   🧤 **키퍼의 자취** — `look` 뒤에 몸이 어디까지 벌어질지 점선으로
     *   🔮 **예고 띠**     — `look` 뒤 그 칸의 밝기. **곧 어두워질 칸 · 곧 밝아질 칸**이 보여요
     *
     * 🔒 **`s`에는 한 톨도 안 들어갑니다.** 판정은 그대로이고, 바뀌는 건 «미리 알 수 있느냐»뿐이에요.
     *    그래서 곡선이 아니라 **읽기 축**으로 흡수됩니다.
     * ⛔ 예고 띠를 판정에 쓰지 마세요 — 그 순간 규칙이 둘이 되고, 화면이 결과를 만드는 자리가 됩니다. */
    const paint = (t) => {
      const sec = (t - t0) / 1000;
      const a = oneAt(board, sec);
      const nx = oneAt(board, sec + ONE.look / 1000);
      kbody.style.transform = `scaleX(${(a.cov / 50).toFixed(4)})`;
      ghost.style.transform = `scaleX(${(nx.cov / 50).toFixed(4)})`;
      for (const c of cells) {
        const v = cellS(c, a), v2 = cellS(c, nx);
        c.lit.style.opacity = v.toFixed(3);
        c.next.style.opacity = v2.toFixed(3);
        c.el.classList.toggle("w2m-cell-hot", v >= 0.75);
        /* 「곧 어두워짐 / 곧 밝아짐」을 클래스로도 — 색으로만 알리면 색약에서 안 읽혀요 */
        c.el.classList.toggle("w2m-cell-soon", v2 < v - 0.08);
        c.el.classList.toggle("w2m-cell-rise", v2 > v + 0.08);
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
        tip.textContent = "🧤 각이 거의 없어요! 지금 안 차면 놓쳐요";
        tip.classList.add("urgent");
      }
      if (t - t0 >= ONE.life) {
        end(0, "🧤 키퍼가 각을 다 지웠어요 — 슛 타이밍을 놓쳤어요");
        return;
      }
      RAF(tick);
    };

    /* 👆 **칸 하나 탭.** 손가락이 어느 칸에 닿았는지는 세 갈래로 찾아요 —
     *   ① 누른 요소가 칸이면 그 칸 (키보드 Enter도 여기로 옵니다)
     *   ② 좌표가 있으면 좌표가 든 칸
     *   ③ 둘 다 없으면(폭을 못 재는 환경) 한가운데 칸
     * 🔒 `onTap`을 **골문 하나**에만 답니다 — 칸마다 달면 탭 자리가 다섯 군데로 늘어나고,
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
      const onKeeper = Math.abs(c.x - board.kc) < a.cov;
      end(s, s >= 0.75 ? `🥅 빈 곳 한가운데를 정확히!${ctx.weak ? " 🦶 약발로 마무리!" : ""}`
        : s > 0 ? "🥅 키퍼 손끝을 스치고 들어갔어요"
          : onKeeper ? "🧤 키퍼 정면이었어요" : "😖 빈 곳에서 너무 멀었어요");
    }, gate);
    paint(t0);
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
      head(ctx.stake, ctx.title, "오프사이드 라인을 넘기 직전인 동료를 누르세요")
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
   * 4. 🧱 차단 — 읽기 + 몸을 던지는 타이밍 (df · mf/CDM) · **2단 국면**
   *
   *   1단계 읽기   `beta/soccer/cup.js`의 승부차기 문법 그대로 — 한 줄 힌트 + 방향 버튼 셋.
   *                🔒 **정지 · 무제한 · 재촉 연출 금지.**
   *   2단계 타이밍 상대가 내 앞을 지나갑니다. 버튼 하나로 몸을 던져요.
   *
   *       s = sBar( |상대 위치 − 차단 지점|, BLK_WIN × BLK_READ[읽기결과] × 창배수 )
   *
   * 🔑 **읽기가 판정 창을 정합니다.** 잘 읽으면 창이 6.7배 넓어요 —
   *    🏃 컷인의 *"주발 쪽 칸이 더 넓어요 — 보이는 폭이 그대로 판정 창"*과 **같은 문법**입니다.
   *
   * 🔴 **왜 2단이 됐나** (104번 §1) — 옛 판은 읽기를 곧 `s`로 옮겼습니다(정확 1 · 인접 0.24 · 반대 0).
   *    그런데 **완벽하게 읽어도 58~61%만 맞습니다.** 조작과 결과 사이에 난수가 한 겹 더 있어서
   *    **잘 읽은 판과 대충 찍은 판이 결과에서 구분이 안 됐어요.** 나머지 셋은 *난수가 판을 만들고
   *    조작이 결과를 만드는데*, 차단만 *조작을 거친 뒤 난수가 결과를 다시 만들었습니다*
   *    (원칙 ③ — 통제 못 하는 효과는 영향이 아니라 노이즈). 🔑 **그 난수 한 겹을 「판정 창」으로
   *    바꾼 것**이 이 개편의 전부예요. 읽기는 그대로 살아 있고, 결과에 직접 실립니다.
   *
   * 🔎 읽을 것은 여전히 **둘**입니다.
   *   ① 드리블러의 주발 — 자기 주발 쪽으로 파고드는 걸 좋아해요 (×BLK.favor)
   *   ② 몸을 튼 방향과 **그 세기** — 확실히 틀었으면 대체로 진짜, 살짝 흔들었으면 페인트
   *
   * **세기에 따라 정답이 서로 다른 쪽으로 바뀌는 게 1단계의 전부예요** —
   * 확실히 틀었으면 몸 방향, 살짝 흔들었으면 주발 쪽입니다. 몸 방향만 따라가면
   * 평균에 머물고, 세기를 함께 읽어야 창이 넓어져요.
   * (세기가 하나뿐이면 늘 같은 쪽이 정답이라 신호가 하나인 판이 됩니다 — BLK 주석 참고)
   *
   * ⚠️ **2단계를 「또 하나의 컷인」으로 만들지 마세요** (104번 §2-4).
   *    나머지 셋은 *어디를 겨눠 언제*인데 2단계는 **「언제」만**입니다 — 버튼 하나예요.
   *    방향 버튼을 여기 되돌려 놓으면 넷이 다 같은 게임이 되고 반복이 더 나빠집니다.
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
   * 진짜와 같아요. 그래서 힌트만 따라가면 딱 그 확률만큼만 맞습니다.
   * 🎲 난수는 `Math.random()`을 **직접** 부릅니다 — 엔진의 `_rng`를 안 지나요.
   *    하네스가 `W.Math.random`을 갈면 호출 시점에 조회하니 그대로 먹힙니다. */
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

  /* 2단계 결과 문구 — **판정 창이 왜 그 폭이었는지**를 읽기 결과로 되짚어 줍니다.
   * 🔑 반대로 읽어도 0이 아니에요("발을 뻗어 걷어냈어요") — 손잡이가 항상 뭔가를 합니다. */
  const BLK_LINE = {
    exact: (t) => `🧱 방향은 읽었는데 몸이 반 박자 어긋났어요 (상대는 ${t.label})`,
    near: (t) => `🧱 몸을 걸쳐 속도를 죽였어요 (상대는 ${t.label})`,
    opp: (t) => `🧱 역동작에 걸렸는데 발을 뻗어 걷어냈어요 (상대는 ${t.label})`,
  };

  function runBlock(container, ctx, gate) {
    const footR = Math.random() < 0.75;           // 프로 선수의 대략 4분의 3이 오른발잡이예요
    const { truth, tell, hi } = rollBlock(footR);
    /* ⛔ **1단계에는 움직이는 것이 하나도 없습니다.** rAF도 타이머도 흐르는 막대도요.
     * 연출로도 그 성격을 지켜요 — 반짝이는 힌트, 카운트다운, 재촉하는 색 전환을
     * 넣지 않습니다. 1초에 고르든 10초에 고르든 이 화면이 똑같아야 해요.
     * 🔴 **여기에 초읽기를 붙이는 순간 정확히 🧊 볼카운트가 됩니다** — "타이밍처럼 생겼는데
     *    핵심이 안 누르기"라 세 번 고치고도 죽은 자리예요.
     * 🔑 재촉은 **2단계의 몫**입니다(runBlockDive). 국면을 화면으로 갈라 뒀으니
     *    타이밍이 필요하면 그쪽에 넣으세요. 이 화면에는 안 됩니다.
     *
     * 🔎 읽을 것이 **둘**이라 칩도 둘로 나눕니다. 한 문장에 이어 붙이면 "주발"과
     * "몸 방향의 세기"가 한 덩어리로 읽혀서, 세기에 따라 정답이 갈리는 이 판의
     * 핵심이 안 보여요.
     *
     * 🚫 **정답을 알려주는 줄은 넣지 않았습니다.** ("살짝이면 주발 쪽" 같은 힌트)
     * 매 판 적어 주면 겹쳐 읽기가 사라지고 E[s]가 실측한 평균 위로 올라가요(106번 §3) —
     * 연출이 결과를 만드는 자리가 됩니다. 규칙은 준비 화면이 처음 3번 가르칩니다.
     *
     * 🎨 세기는 **초록/빨강이 아니라 실선/점선**으로 갈랐어요. 색으로 가르면
     * "살짝 흔들었어요"가 나쁜 신호처럼 보이는데, 그건 틀린 신호가 아니라
     * **다른 쪽을 가리키는 신호**예요. 실선=확실히 · 점선=살짝이 그 뜻에 맞습니다. */
    const btnHTML = DIRS.map((d) => `<button type="button" class="btn w2m-dir" data-i="${d.key}">`
      + `<span class="w2m-dir-arrow">${d.arrow}</span><span class="w2m-dir-lab">${d.label}</span></button>`).join("");
    const wrap = box(container, "w2m-block",
      head(ctx.stake, ctx.title, "상대가 어디로 파고들지 먼저 읽으세요 — 시간은 무제한이에요")
      + `<div class="w2m-read">`
      + `<span class="w2m-sig"><b>🦶 주발</b><span>${footR ? "오른발" : "왼발"}잡이</span></span>`
      + `<span class="w2m-sig ${hi ? "w2m-tell-hi" : "w2m-tell-lo"}">`
      + `<b>${DIRS[tell].arrow} 몸 방향</b>`
      + `<span>${DIRS[tell].to} ${hi ? "확실히 틀었어요" : "살짝 흔들었어요"}</span></span>`
      + `</div>`
      + `<div class="w2m-btns w2m-dirs">${btnHTML}</div>`);

    /* ⚠️ **이중 탭** — 1단계 방향 버튼과 2단계 막기 버튼이 **같은 자리에 겹쳐** 그려집니다
     * (버튼 셋 → 버튼 하나라 가운데가 정확히 겹쳐요). `pointerdown`으로 화면을 갈아치우면
     * 손을 뗄 때 브라우저가 **그 지점의 새 버튼으로 click을 보내 즉시 두 번 먹힙니다.**
     * 그래서 2단계는 **자기 gate**를 새로 받고, 1단계 탭이 pointer로 왔으면 닫아 둡니다 —
     * 준비 화면 → 본 게임과 똑같은 형태예요. */
    const gate2 = newGate();
    let picked = false;
    DIRS.forEach((d) => onTap(wrap.querySelector(`.w2m-dir[data-i="${d.key}"]`), (e, viaPointer) => {
      if (ctx.done || picked) return;
      picked = true;
      gate2.shut = !!viaPointer;
      runBlockDive(wrap, ctx, gate2, { pick: d.key, truth });
    }, gate));
  }

  /* ---------- 🧱 2단계 — 몸을 던지는 타이밍 ----------
   *
   * 🔒 **여기서 화면 문법이 바뀝니다.** 상대가 움직이고, 시간이 흐르고, 재촉이 있어요.
   *    1단계와 **같은 상자**를 쓰되 클래스를 `w2m-block` → `w2m-block2`로 갈아요 —
   *    style.css가 *".w2m-block에는 움직이는 것을 하나도 넣지 마세요"*를 지키고 있어서,
   *    그 선택자에 2단계가 걸리면 안 됩니다.
   *
   * 🔑 **판정 창을 그대로 그립니다** — 보이는 폭이 곧 판정 창이에요(원칙 ③).
   *    잘 읽었으면 눈에 띄게 넓고, 반대로 읽었으면 얇은 띠 하나입니다.
   *    이건 정답 누설이 아니에요 — **방향은 이미 1단계에서 잠겼고 고를 게 안 남았습니다.**
   *
   * ⛔ `.w2m-gap`에 transition을 붙이지 마세요 — 그림이 pos보다 늦게 따라오면
   *    **보이는 자리와 판정하는 자리가 갈라집니다.** 판정은 pos로, 그림은 매 프레임 pos로. */
  function runBlockDive(wrap, ctx, gate, r) {
    const mul = winMul(ctx.condition, 1);        // 🦶 주발은 안 걸려요 — 상대의 발이지 내 발이 아닙니다
    const half = blkWin(r.pick, r.truth, mul);
    const read = blkRead(r.pick, r.truth);
    const speed = randIn(BLK_RUN.speed[0], BLK_RUN.speed[1]);
    const mark = BLK_RUN.mark;
    const me = DIRS[r.pick];

    wrap.classList.remove("w2m-block");
    wrap.classList.add("w2m-block2");
    wrap.innerHTML = head(ctx.stake, ctx.title, "상대가 밝은 칸 한가운데에 왔을 때 몸을 던지세요")
      + `<p class="w2m-blk-pick">${me.arrow} ${esc(me.label)}을 막으러 들어갔어요</p>`
      + `<div class="tm-bar w2m-lane w2m-blk-lane" role="img"`
      + ` aria-label="상대가 지나갑니다 — 밝은 칸 폭 ${(half * 2).toFixed(0)}%, 잘 읽었을수록 넓어요">`
      /* 밝은 칸 — 중심이 차단 지점이에요. 가운데 눈금이 없으면 넓을수록
       * "어디가 한가운데인지"가 안 보여서 넓은 게 오히려 헷갈립니다(🏃와 같은 이유). */
      + `<div class="w2m-gate w2m-strong w2m-blk-win" style="left:${(mark - half).toFixed(2)}%;`
      + `width:${(half * 2).toFixed(2)}%"><i class="w2m-gate-mid"></i></div>`
      + `<div class="w2m-gap w2m-blk-run"><i></i></div></div>`
      + `<div class="w2m-btns"><button type="button" class="btn btn-primary tm-btn w2m-blk-go">🛡️ 막기</button></div>`;

    const runner = wrap.querySelector(".w2m-blk-run");
    const end = ender(wrap, ctx);
    let pos = 0, last = nowMs();

    const tick = (t) => {
      if (ctx.done) return;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      pos += dt * speed;
      if (pos >= 100) {
        runner.style.transform = "translateX(100%)";
        end(0, `😖 몸을 못 던졌어요 — 상대는 ${DIRS[r.truth].was}`);
        return;
      }
      runner.style.transform = `translateX(${pos.toFixed(2)}%)`;
      RAF(tick);
    };

    onTap(wrap.querySelector(".w2m-blk-go"), () => {
      if (ctx.done) return;
      const s = sBar(Math.abs(pos - mark), half);   // 🔒 판정은 pos — 화면이 아니라 값이에요
      end(s, s >= 0.75 ? `🛡️ 완벽하게 끊었어요! 상대는 ${DIRS[r.truth].was}`
        : s > 0 ? BLK_LINE[read](DIRS[r.truth])
          : `😖 그대로 지나갔어요 — 상대는 ${DIRS[r.truth].was}`);
    }, gate);
    RAF(tick);
  }

  /* ---------- 창구 ---------- */
  const GAMES = {
    cutin: {
      run: runCutin, key: "w2-cutin", title: "🏃 컷인 돌파",
      why: "수비 사이가 벌어질 때 파고들 길로 뚫어요",
      lines: [
        "수비수 둘 <b>사이</b>가 좌우로 열렸다 닫혀요.",
        "<b>수비 사이</b>가 <b>파고들 길</b> 위에 왔을 때 그 길을 누르세요.",
        "🦶 <b>주발 쪽 길이 더 넓어요</b> — 화면에 보이는 폭이 그대로 성공 폭이에요.",
      ],
      keys: [{ name: "⬅️ / ➡️", desc: "파고들 길이에요. 수비 사이가 그 길 위일 때 누르세요" }],
    },
    oneone: {
      run: runOneone, key: "w2-oneone", title: "🥅 1대1 마무리",
      why: "키퍼가 지운 반대쪽, 가장 밝은 칸을 노려요",
      lines: [
        "🧤 키퍼가 나오면서 <b>한쪽 각을 지워요</b> — 기다릴수록 <b>빈 곳</b>이 줄어요.",
        "<b>빈 곳 한가운데</b>에 가까운 칸일수록 <b>밝아요.</b> 그 칸을 누르세요.",
        "🦶 주발 쪽 절반은 <b>더 넓게</b> 밝고, 약발 쪽 절반은 좁게 밝아요.",
      ],
      keys: [{ name: "골문 칸", desc: "밝을수록 좋은 칸이에요. 키퍼가 지울수록 밝은 칸이 줄어요" }],
    },
    killpass: {
      run: runKillpass, key: "w2-killpass", title: "🎯 킬패스",
      why: "오프사이드 라인을 넘기 직전인 동료에게 찔러 줘요",
      lines: [
        "동료 셋이 <b>오프사이드 라인</b>을 향해 서로 다른 속도로 뛰어요.",
        "라인을 <b>넘기 직전</b>에 그 동료 버튼을 누르면 최고예요.",
        "이미 넘은 동료는 <b>오프사이드</b>라 버튼이 잠겨요.",
      ],
      keys: [{ name: "① ② ③", desc: "찔러 줄 동료예요. 라인에 가까울수록 좋아요" }],
    },
    block: {
      /* 🔒 두 국면을 **둘 다** 적습니다 — 1단계만 적으면 2단계가 갑자기 튀어나오고,
       * 2단계만 적으면 읽기가 왜 중요한지가 안 보여요. `short`도 마찬가지입니다
       * (넷째 판부터는 이 한 줄만 보입니다). */
      run: runBlock, key: "w2-block", title: "🧱 차단",
      why: "먼저 방향을 읽고, 상대가 지나갈 때 몸을 던져요",
      lines: [
        "① <b>먼저 읽습니다</b> — 이 화면은 <b>움직이는 것이 하나도 없어요.</b> 천천히 고르세요.",
        "<b>확실히 틀었으면</b> 몸 방향이 대체로 진짜예요. <b>살짝 흔들었으면</b> 페인트일 때가 많아 상대의 <b>주발 쪽</b>이 유력해요.",
        "② <b>그 다음이 손입니다</b> — 상대가 지나갈 때 <b>🛡️ 막기</b>를 눌러 몸을 던지세요.",
        "🔑 <b>잘 읽었을수록 밝은 칸이 넓어요</b> — 화면에 보이는 폭이 그대로 성공 폭이에요.",
      ],
      keys: [
        { name: "⬅️ ⬆️ ➡️", desc: "읽은 방향이에요. 가운데는 좌우로 나가도 몸을 걸칠 수 있어요" },
        { name: "🛡️ 막기", desc: "상대가 밝은 칸 한가운데에 왔을 때 누르세요. 늦으면 지나가 버려요" },
      ],
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
      /* 🖼️ 세 줄 위계의 첫 두 줄 — 본 게임 상자가 준비 화면과 **같은 줄**을 씁니다 */
      stake: STAKE[o.kind] || STAKE.goal, title: g.title,
      cb: typeof cb === "function" ? cb : () => {},
      toJudge: typeof o.judge === "function" ? o.judge : loneJudge,
    };
    if (!container) { ctx.cb(ctx.toJudge(0.5), { s: 0.5, moment: ctx.moment, weak: false }); return; }
    ready(container, {
      key: g.key, title: g.title, why: g.why, lines: g.lines, keys: g.keys,
      stake: ctx.stake,
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
    _t: { sCut, sOne, sKp, sBar, blkRead, blkWin, winMul, wideOn, rollBlock, loneJudge,
      /* 🥅 무대와 좌표 — **실측·검사가 산식을 베껴 적지 않게** 내보냅니다.
       * `oneAt`은 닫힌 식이라 화면 없이도 판을 그대로 굴릴 수 있어요. */
      oneRoll, oneAt, oneCellX, oneErr, cellFloorErr,
      /* 🔒 손잡이 셋을 **따로** 내보냅니다 — 같은 표에 두면 무엇을 고쳤는지 못 가려요
       *    (`ONE_WIN` 난이도 · `ONE_CLOSE` 지분 · `CELL_FLOOR` 천장) */
      K: { CUT, ONE, ONE_WIN, ONE_CLOSE, CELL_FLOOR, KP, BLK, BLK_RUN, BLK_WIN, BLK_READ,
        STRONG, WEAK, WIDE, FOOT_WIN } },
  };
})();
