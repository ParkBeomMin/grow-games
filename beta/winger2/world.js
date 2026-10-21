/* ⚽ 더 윙어 II 1막 — 🏫 고교 세계 · 권역 리그 · 전국대회 · 승부차기 · 공개 테스트 · ⭐ 평점
 *
 * 설계: 12번 §8-3(세계) · §5-3(경기) · §8-4(평점) · 13번 §4 · §5-2(두 세계 · 난수 소비량)
 * 구조는 실측 장치(`scratchpad/winger2-bal/lib/act2.js`)와 **같은 모양**이에요 — 계수(22·24번)가
 * 그 모양 위에서 잰 값이라서요(원칙 ⑧ 「계수표만 보지 말고 그 계수를 잰 모델 코드까지」).
 *
 * ── 🔒 지키는 것 ────────────────────────────────────────────
 *  · **세계는 판을 시작할 때 한 번** 만들어 세이브에 넣어요 — 다시 열어도 같은 세계예요.
 *  · **세계 모양(전력 · 대진 · 흔들림)을 만드는 굴림과 이름 뽑기는 난수원이 다릅니다**
 *    (`SALT.world` · `SALT.name`). 남자부 · 여자부 이름 목록 길이도 같아요 — 이름 뽑기가
 *    전력 굴림을 밀면 성별만 바꿨는데 세계가 달라져요(13번 §5-2 「성별 대칭」).
 *  · **성별은 이름 · 세계 이름 글자만** 가릅니다 — 숫자는 한 벌(13번 §5).
 *  · **나와 경쟁자는 같은 자로** — 내 경기(`createMatch`) · 남의 경기(`autoMatch`) · 내 상대의
 *    기록(`shareByWeight`)이 전부 엔진의 같은 함수를 지나요(11번 §7-1 #3).
 *  · **모든 굴림은 판 시드에서 경기마다 갈라 낸 난수원**으로 — `Math.random` · `Date`를 판정 흐름에
 *    넣지 않아요(25번 §5). 같은 시드 · 같은 조작이면 같은 1막이에요.
 *  · 실존 학교 · 대회 · 선수 이름을 쓰지 않아요(결정 5) — 이름 목록은 가칭입니다(아래 ⚠️).
 *
 * 다른 파일은 `window.W2World`만 봐요. 텍스트 도우미(`fill` — 이름 뒤 조사)도 여기 있어요. */
"use strict";

window.W2World = (() => {
  /* 🎚️ 조정될 수 있는 상수 — 이 블록만 고칩니다(25번 §5). */
  const TUNE = Object.freeze({
    US_STR: 58,                          // 12번 §8-3 우리 학교 전력
    LEAGUE_STR: [52, 55, 58, 61, 66],    // 12번 §8-3 권역 리그 5교 — 마지막(66)이 에이스의 학교
    CUP_SEED: [70, 78],                  // 12번 §8-3 · 22번 §0-1 — 전국대회 시드 8교
    CUP_REST: [50, 69],                  // 〃 — 나머지 23교
    TEST_STR: 62,                        // 12번 §8-3 공개 테스트 선발팀(62 대 62)
    JITTER: 8,                           // 12번 §8-3 선수 흔들림 ±8
    /* `RIVAL_PLUS` 퇴역(51번 v4-3 · J16 · J17) — {rival}(번호를 가져간 1학년)은 또래 곡선을 따라요 */
    ACE_PLUS: 12,                        // 12번 §8-3 · 24번 §2 — 🔥 {ace} = 학교 전력 + 12
    ACE_PLUS_POS: { wg: 2 },             // 51번 v4-3 — 윙어만 +2(🔗 결말 분포를 포지션마다 맞춤)
    /* 🔗 중립화 상수 — 포지션 넷의 경기당 내 순간 수를 맞춰요(내 줄의 `buff`로 실림 · 12번 §8-5).
     * 기준 능력치 56.0 · `COND_REF` 51 · FORMATION · 포지션 무게 · SPOT…에 종속(바뀌면 다시 잼). */
    ACT1_SPOT: { fw: 7.598, wg: 6.532, mf: 4.343, df: 6.948 },   // 51번 v4-3 — 필드 10 · ⚖️ 58:58에서 경기당 판 2.50
    RATE_B: { fw: 62, wg: 61, mf: 62, df: 62 },                   // 37번 §2 · 38번 §5 — 평점 기본 b
    /* 🎲 시작 능력치(29번 §3-3 · J6 — 37번 §2 · 38번 §5) — 여섯 모두 40에서 1점씩 48번(한 칸 최대 56 · 합 288) */
    START_BASE: 40, START_STEP: 1, START_N: 48, START_CAP: 56,
    PK_P: 0.75,                          // 12번 §5-3 승부차기 중심(동료 · 상대 킥도 같은 값)
    /* 🧩 포메이션(48번 §2 · §12 · 51번 v4-3) — 상성 c · 감독 「줄의 폼」이 이 안이면 ⚖️ */
    FORM_C: 0.03, FORM_TIE: 1.0,
    /* 🔁 또래(내 포지션 · 50번 §2 · §11 · §12 · 51번 v4-3) — 수 · 흩어짐 · 학년 기울기 · 빠르기 · 그 주 컨디션 폭 */
    PEER_N: { fw: 2, wg: 2, mf: 5, df: 5 }, PEER_SPREAD: 3,
    PEER_GRADE_D: { 1: -3, 2: 0, 3: 2 }, PEER_PACE: { 1: 1.30, 2: 1.00, 3: 0.75 }, PEER_COND_W: 1.5,
    /* 🎯 감독의 선발 판단(48번 §12-2 · 50번 §11-3 · §12-4 · 51번 v4-3) */
    W_TRUST: 0.5, W_COND: 0.1, W_WEAK: 1.5, BENCH_GAP: 3.5, SUB_MIN: 60, CHANCE_N: 1,
  });
  /* 📈 보통 판 곡선 G(주) — 주 능력치 blend가 그 주까지 자란 양(51번 v4-3 · `out/g50w.json` — 🔗 중립화 표 · 0~36주) */
  const PEER_G = {
    fw: [0, 2.4, 2.4, 2.4, 2.4, 2.8, 2.8, 2.8, 2.8, 2.8, 3.5, 3.5, 5.42, 5.42, 5.42, 5.74, 5.84, 5.84, 5.84, 6.34, 6.34, 6.34, 6.41, 7.32, 8.17, 8.17, 8.28, 8.58, 8.58, 8.58, 8.58, 8.8, 8.8, 9.06, 9.167, 10.85, 10.85],
    wg: [0, 0, 0, 0, 0.5, 2.1, 2.1, 2.1, 2.1, 2.1, 2.8, 2.8, 2.8, 2.8, 3.32, 4.62, 4.82, 4.82, 4.82, 5.32, 5.32, 5.32, 5.39, 5.41, 5.41, 5.89, 6.31, 7.88, 7.88, 7.88, 7.88, 7.96, 7.96, 8.427, 8.45, 8.45, 8.45],
    mf: [0, 0, 0, 0, 2, 2.667, 2.667, 2.667, 3.057, 3.057, 3.057, 3.057, 3.057, 3.057, 5.097, 5.147, 5.8, 5.8, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 8, 8.027, 8.8, 8.8, 8.807, 9.16, 9.17, 9.17, 9.17, 9.17, 9.17, 9.17],
    df: [0, 0, 0, 0, 0, 0, 1.32, 1.32, 1.97, 1.97, 2.39, 2.39, 2.39, 2.39, 2.39, 2.39, 2.39, 4.34, 5.057, 5.357, 5.357, 5.357, 5.357, 5.357, 5.357, 5.357, 5.357, 5.357, 6.497, 6.917, 7.493, 7.667, 7.667, 7.883, 7.903, 7.903, 7.903],
  };
  /* 🫀 또래의 그 주 컨디션 — 보통 판 경기 날 컨디션 분포의 21 분위(`out/peercond50.json`) · 중앙(55) 기준 `PEER_COND_W` 배 */
  const PEER_CQ = [28, 38, 40, 43, 43, 46, 47, 49, 52, 53, 55, 56, 58, 60, 61, 63, 65, 67, 69, 72, 77];

  /* ---------- 🧩 포메이션 넷(48번 §2 · 52번 §2) — 필드 10 + 키퍼 ----------
   * `FORMS[이름]` = [[x, y, role], …] 11개(키퍼 첫 줄) · x 0~100(왼 → 오) · y 0~50(우리 골라인 → 하프라인 · 우리 골문 아래) ·
   *   role ∈ gk · def · wb · mid · wing · fwd — 상대는 화면이 뒤집어요(원정이어도 우리 = 아래 · 48번 §11).
   * `FORM_W[이름]` = { fa, fd, n }(엔진 배수 · 엔진이 보는 포지션 머릿수 — 윙백은 3-5-2 미드 · 5-3-2 수비) */
  const FORMS = Object.freeze({
    "4-4-2": [[50, 4, "gk"], [14, 14, "def"], [38, 13, "def"], [62, 13, "def"], [86, 14, "def"],
      [38, 28, "mid"], [62, 28, "mid"], [12, 32, "wing"], [88, 32, "wing"], [38, 42, "fwd"], [62, 42, "fwd"]],
    "4-3-3": [[50, 4, "gk"], [14, 14, "def"], [38, 13, "def"], [62, 13, "def"], [86, 14, "def"],
      [28, 27, "mid"], [50, 25, "mid"], [72, 27, "mid"], [14, 40, "wing"], [86, 40, "wing"], [50, 44, "fwd"]],
    "3-5-2": [[50, 4, "gk"], [26, 13, "def"], [50, 12, "def"], [74, 13, "def"],
      [10, 26, "wb"], [90, 26, "wb"], [32, 28, "mid"], [50, 26, "mid"], [68, 28, "mid"], [38, 42, "fwd"], [62, 42, "fwd"]],
    "5-3-2": [[50, 4, "gk"], [8, 18, "wb"], [92, 18, "wb"], [28, 12, "def"], [50, 11, "def"], [72, 12, "def"],
      [30, 28, "mid"], [50, 27, "mid"], [70, 28, "mid"], [38, 42, "fwd"], [62, 42, "fwd"]],
  });
  const FORM_W = Object.freeze({
    "4-4-2": { fa: 1.00, fd: 1.00, n: { fw: 2, wg: 2, mf: 2, df: 4 }, name: "⚖️ 균형 4-4-2" },
    "4-3-3": { fa: 1.05, fd: 0.95, n: { fw: 1, wg: 2, mf: 3, df: 4 }, name: "↔️ 측면 4-3-3" },
    "3-5-2": { fa: 1.03, fd: 0.97, n: { fw: 2, wg: 0, mf: 5, df: 3 }, name: "🎯 중앙 3-5-2" },
    "5-3-2": { fa: 0.94, fd: 1.06, n: { fw: 2, wg: 0, mf: 3, df: 5 }, name: "🧱 수비 5-3-2" },
  });
  const FORM_NAMES = Object.keys(FORMS);
  /* 상성 고리 — 측면 > 중앙 > 수비 > 측면 · 균형은 누구와도 1 */
  const BEATS = { "4-3-3": "3-5-2", "3-5-2": "5-3-2", "5-3-2": "4-3-3" };
  const formM = (a, b) => (BEATS[a] === b ? 1 + TUNE.FORM_C : BEATS[b] === a ? 1 - TUNE.FORM_C : 1);
  /* 엔진에 넘기는 배수 — 내 경기(`createMatch`) · 남의 경기(`autoMatch`) 같은 값 */
  const formCfg = (us, them) => { const A = FORM_W[us], B = FORM_W[them];
    return { fa: A.fa, fd: A.fd, fa2: B.fa, fd2: B.fd, m: formM(us, them), m2: formM(them, us) }; };
  const autoForm = (a, b) => { const A = FORM_W[a || "4-4-2"], B = FORM_W[b || "4-4-2"];
    return { faA: A.fa, fdA: A.fd, faB: B.fa, fdB: B.fd, mA: formM(a || "4-4-2", b || "4-4-2"), mB: formM(b || "4-4-2", a || "4-4-2") }; };
  /* 이웃 자리(48번 §3 · §12-2) — ② · ③에서 내가 서는 자리 */
  const NEIGH = { fw: "wg", wg: "fw", mf: "df", df: "mf" };
  /* 그 포메이션에 이웃 자리가 없으면 다음으로 가까운 자리(공격수 · 3-5-2 · 5-3-2 → 미드필더) — 늘 10명이 서게 */
  const NEIGH_ALT = { fw: ["wg", "mf"], wg: ["fw", "mf"], mf: ["df", "wg"], df: ["mf", "wg"] };
  const neighIn = (pos, f) => NEIGH_ALT[pos].find((p) => FORM_W[f].n[p] > 0) || NEIGH[pos];

  const STAT_KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
  const FORMATION = { fw: 2, wg: 2, mf: 4, df: 3 };   // 세계를 만들 때 굴리는 11줄(옛 판과 같은 소비) — 경기에 서는 줄은 `FORMS`(필드 10)
  const POS_ORDER = ["fw", "wg", "mf", "df"];
  const LEAGUE_WEEKS = [6, 8, 10, 12, 14, 25, 27, 29, 31, 33];   // 12번 §5-1 — 전반기 5 · 후반기 5
  const ACE_ROUND = 2;                 // 🔥 에이스의 학교와는 3라운드(10주 · 29주)에 고정(21번 §4-1)

  /* ⭐ 평점 모양 — 옛 `career.js` RATE의 **모양 그대로**(12번 §8-4) · 값 b만 1막에서 다시 잼(24번 §2).
   * 🔒 골·도움·수비 크레딧은 같은 종류가 쌓일수록 0.78씩 줄어요(만점이 흔해지지 않게). */
  const RATE = {
    fw: { g: 10, a: 7.0, d: 2.0, cs: 1.0, cc: 0.5 },
    wg: { g: 10, a: 7.5, d: 2.4, cs: 1.5, cc: 0.8 },
    mf: { g: 10, a: 7.5, d: 2.8, cs: 2.5, cc: 1.5 },
    df: { g: 12, a: 8.0, d: 3.6, cs: 4.5, cc: 3.5 },
  };
  const RATE_RESULT = 2.5, RATE_CONCEDE = 3, RATE_DECAY = 0.78, RATE_LOSS_CAP = 95, RATE_NOISE = 4;

  /* ---------- 🎲 난수 — 판 시드에서 갈라 냅니다 ----------
   * 🔒 난수원이 둘 이상이면 **시드를 소금으로 가릅니다**(11번 §7-3 #19) — 같은 시드의 두 난수원은
   *    앞 1,000개가 1000/1000 일치해요. 소금은 실측 장치(`load.js`)와 같은 값 + 새로 둘(`sit` · `name`). */
  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fmix(h) {
    h = h >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  const mix = (...xs) => xs.reduce((h, x) => fmix((h ^ (x >>> 0)) + 0x9e3779b9), 0x1234567) >>> 0;
  const SALT = Object.freeze({
    engine: 0x9e3779b9, event: 0x85ebca6b, world: 0x27d4eb2f, rate: 0x165667b1,
    test: 0xd3a2646c, pk: 0xfd7046c5, sit: 0x2545f491, name: 0x5bd1e995,
    start: 0x3c6ef372,   // 🎲 시작 능력치(29번 §3-3 — 새 소금)
    form: 0x2f6b9a1d,    // 🧩 상대 포메이션(52번 — 새 소금)
    peer: 0x6a09e667,    // 🔁 또래 곡선 · 그 주 컨디션(50번 — 새 소금)
    board: 0x1b873593,   // 🦶 판의 상황(36번 §3-2 — 엔진 열 밖 · 경기 열쇠마다)
  });
  /* 한 자리의 난수원 — `key`는 그 자리의 고유 번호(주 · 경기)예요. 다시 열어도 같은 자리는 같은 값이에요. */
  const rngOf = (seed, key, salt) => mulberry32(mix(seed, key) ^ salt);
  const engineSeed = (seed, key) => (mix(seed, key) ^ SALT.engine) >>> 0;
  const randInt = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  function shuffle(r, a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* 경기마다 고유 번호 — 엔진 · 평점 · 승부차기 난수원이 이 번호에서 갈라져요 */
  const KEY = {
    league: (round, j) => 100 + round * 4 + j,          // j = 0 내 경기 · 1 · 2 남의 경기
    group: (g, m) => 200 + g * 6 + m,
    ko: (rd, i) => 300 + rd * 8 + i,
    test: 400, tech: (i) => 401 + i, testXI: 450,
    pkKick: (k) => 5000 + k, pk: (k) => 6000 + k, rate: (k) => 7000 + k,
    groupTie: (g) => 800 + g, leagueTie: 900,
    start: (k) => 910 + k,                               // 🎲 시작 능력치 k번째 뽑기(0 = 첫 모양 · 1~3 = 다시 뽑기)
    heroName: (k) => 930 + k,                            // 🎲 이름 버튼 k번째
    peerCond: (w) => 1000 + w,                           // 🔁 또래의 그 주 컨디션(주마다)
    peerName: 1100,                                      // 🔁 또래 이름(새로 더한 줄만)
  };

  /* ---------- ✏️ 글 — 이름 뒤 조사 ----------
   * `{key}` → 값 · `{key|가}` → 값 + 조사(받침에 맞춰). 사람 이름은 **틀 자리**로만 씁니다(13번 §4-4).
   * 🔑 `{me}`는 플레이어가 바꿀 수 있어서 조사 도우미가 필요해요. 짝 이름(민재/민서 · 태오/서아 ·
   *    세헌/가은)은 받침을 맞춰 둬서 조사가 성별로 안 갈립니다.
   * 🔒 돌려주는 것은 **평문**이에요 — 그리는 쪽이 `textContent`로 넣거나 이스케이프합니다. */
  const JOSA = { 가: ["이", "가"], 이: ["이", "가"], 는: ["은", "는"], 은: ["은", "는"], 를: ["을", "를"], 을: ["을", "를"],
    와: ["과", "와"], 과: ["과", "와"], 로: ["으로", "로"], 으로: ["으로", "로"], 야: ["아", "야"], 아: ["아", "야"],
    랑: ["이랑", "랑"], 이랑: ["이랑", "랑"], 이에요: ["이에요", "예요"], 예요: ["이에요", "예요"], 라면: ["이라면", "라면"] };
  const DIGIT_JONG = [21, 8, 0, 16, 0, 0, 1, 8, 8, 0];   // 영 일 이 삼 사 오 육 칠 팔 구 — 끝소리(ㄹ = 8)
  function jongOf(word) {
    const s = String(word == null ? "" : word).trim();
    if (!s) return 0;
    const code = s.charCodeAt(s.length - 1);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
    if (code >= 48 && code <= 57) return DIGIT_JONG[code - 48];
    return 0;
  }
  function josa(word, j) {
    const pair = JOSA[j];
    if (!pair) return j;
    const jong = jongOf(word);
    if (j === "로" || j === "으로") return jong && jong !== 8 ? pair[0] : pair[1];
    return jong ? pair[0] : pair[1];
  }
  const fill = (text, vars) => String(text == null ? "" : text).replace(/\{(\w+)(?:\|([^}]+))?\}/g, (all, k, j) => {
    if (!vars || vars[k] == null) return all;
    const v = String(vars[k]);
    return j ? v + josa(v, j) : v;
  });
  /* 남이 친 글자를 씻어요(이름 · 한마디) — 받는 길목에서 씻고, 그리는 자리에서도 이스케이프합니다(원칙 ⑦). */
  const clean = (v, max) => String(v == null ? "" : v)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>&"'`\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max || 12);

  /* ---------- 🏷️ 이름 ----------
   * 🏫 학교 이름은 실재 고등학교와 대조했어요(32번 · 12번 §8-3 「확정 전 검색 대조」) — 실재 학교 10개 · 다른 작품의
   *    학교 2개와 겹친 이름을 바꿨어요(25번 §8). 🔒 **길이 · 순서는 그대로** — 이름만 바꿔야 섞는 난수 소비가 같아요.
   * 🔒 남 · 여 이름 목록은 **길이가 같아요**(뽑는 횟수도 같게) — 13번 §5-2.
   * 🔒 주인공 · 조연 자리 이름(지호 · 도윤 · 하람 · 민재 · 태오 · 세헌 · 민서 · 서아 · 가은 · 도연)은 목록에 없어요. */
  const OUR_SCHOOL = "솔빛고";
  const SCHOOLS = ["한결고", "단비고", "너울고", "윤슬고", "도란고", "은솔고", "미리내고", "미르고", "온새고",
    "늘봄고", "여울고", "꽃샘고", "새밭고", "물결고", "느티고", "살구고", "높새고", "큰들고", "들샘고",
    "들녘고", "산들고", "봄내고", "솔숲고", "달빛고", "별하고", "새터고", "언덕고", "청솔고", "들꽃고",
    "샛별고", "노을고", "바람고", "잎새고", "햇살고", "푸름고", "초록고", "다온고", "해솔고"];
  const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권",
    "황", "안", "송", "전", "홍", "유", "고", "문", "양", "손", "배", "백", "허", "남", "심"];
  const GIVEN = {
    m: ["준호", "민준", "서준", "도현", "예준", "시우", "주원", "하준", "지훈", "건우", "우진", "선우", "서진",
      "유준", "연우", "은우", "정우", "승우", "승현", "시윤", "준혁", "지환", "승민", "유찬", "윤우", "민성",
      "준서", "현우", "은찬", "동현"],
    f: ["서연", "서윤", "지우", "하윤", "하은", "지유", "윤서", "채원", "수아", "서현", "예은", "다은", "수빈",
      "예린", "지아", "소윤", "유나", "시은", "나연", "채은", "윤아", "예서", "하린", "아린", "연서", "유진",
      "수연", "은서", "소율", "지원"],
  };
  /* 🚫 이름이 통째로 겹치면 안 되는 사람들(유명 선수 · 유명인) — 걸리면 같은 난수원에서 다시 뽑아요
   *    (이름 난수원은 세계 모양과 따로라 다시 뽑아도 전력이 안 밀려요). */
  const FORBID = new Set(["손흥민", "이강인", "김민재", "황희찬", "조규성", "황인범", "이재성", "박지성", "차범근",
    "기성용", "이승우", "백승호", "정우영", "김승규", "조현우", "설영우", "오현규", "양민혁", "배준호", "홍명보",
    "안정환", "이영표", "박주영", "구자철", "지소연", "조소현", "박은선", "여민지", "최유리", "장슬기", "이금민",
    "김혜리", "박지민", "김태형", "전정국", "정호석", "김남준", "김석진", "민윤기", "이지은", "김지수", "박채영",
    "김민준", "이서준", "김서연", "박서준"]);
  /* 🧑 자리 이름 — 13번 §4-1 · §12-1(류세헌 · 류가은은 웹 검색 대조를 마친 이름) */
  const ROLE_NAME = {
    m: { rival: "차민재", keeper: "김태오", ace: "류세헌" },
    f: { rival: "차민서", keeper: "김서아", ace: "류가은" },
  };
  const ROLE_WHO = { m: { rival: "minjae", keeper: "taeo", ace: "seheon" }, f: { rival: "minseo", keeper: "seoa", ace: "gaeun" } };
  const WORLD_NAME = {
    m: { team: "솔빛고 축구부", league: "남부 권역 리그", cup: "푸른잔디배", test: "프로 구단 공개 테스트" },
    f: { team: "솔빛고 여자축구부", league: "남부 권역 리그 여자부", cup: "푸른잔디배 여자부", test: "여자 1부 구단 합동 테스트" },
  };
  const g2 = (g) => (g === "f" ? "f" : "m");
  /* 성 + 이름 한 번 — 금지 목록이거나 성과 이름 첫 글자가 같으면(「유유찬」) 빈 값을 돌려 다시 뽑게 해요 */
  function pickName(r, g) {
    const sur = SURNAMES[Math.floor(r() * SURNAMES.length)];
    const giv = GIVEN[g][Math.floor(r() * GIVEN[g].length)];
    const nm = sur + giv;
    return FORBID.has(nm) || giv[0] === sur ? "" : nm;
  }
  /* 🎲 플레이어 이름 표(29번 §3-4) — 남 · 여 각 24 · 두 글자. 33번 대조로 실존 유명인 · 선수와 겹친 17개를
   *    바꾼 표(15번 「이름 🎲 표 대조」 — 남 11 · 여 6). 세계의 다른 이름(`GIVEN`) · 자리 이름 · 학교 이름과 안 겹쳐요. */
  const HERO_NAMES = {
    m: ["태언", "주안", "해준", "시헌", "태찬", "윤헌", "시겸", "은후", "서후", "도결", "무진", "강윤",
      "하겸", "건율", "준율", "준원", "은결", "태건", "태온", "민결", "예겸", "현율", "도율", "도건"],
    f: ["하율", "서하", "은재", "채아", "예채", "라희", "단아", "새봄", "채하", "서율", "채온", "예솔",
      "주율", "서림", "하랑", "수하", "세아", "채윤", "예솜", "예봄", "시하", "채율", "서빈", "연지"],
  };
  /* 🎲 이름 하나 — 고른 카드의 성별 표에서 고르게 · 바로 앞 이름은 다시 안 냄 */
  function rollName(g, prev, r) {
    const list = HERO_NAMES[g2(g)].filter((x) => x !== prev);
    return list[Math.floor(r() * list.length)];
  }
  /* 🎲 시작 능력치 k번째 모양 — 판 시드에서(포지션 · 주발 · 성별 · 외형과 무관 · 29번 §3-3) */
  function rollStart(seed, k) {
    const T = TUNE;
    const r = rngOf(seed, KEY.start(k), SALT.start);
    const st = {};
    for (const key of STAT_KEYS) st[key] = T.START_BASE;
    for (let t = 0; t < T.START_N; t++) {
      const ok = STAT_KEYS.filter((key) => st[key] + T.START_STEP <= T.START_CAP);
      st[ok[Math.floor(r() * ok.length)]] += T.START_STEP;
    }
    return st;
  }
  /* 부르는 이름 — 문장에선 두 글자(세헌 · 가은), 명단 · 순위표에선 성까지(12번 §12-1 · 13번 §12-1) */
  const short = (full) => (String(full).length >= 3 ? String(full).slice(1) : String(full));

  /* ---------- 🏫 세계 만들기 ----------
   * 🔒 **굴림 순서가 실측 장치 `genWorld`와 같아요** — 우리 학교 흔들림 → 리그 5교 → 대진 → 대회 시드 ·
   *    나머지 → 대회 학교 흔들림. 📍 {rival}의 자리는 **내 포지션의 첫 빈칸**, 🔥 {ace}는 에이스 학교의
   *    **내 포지션 첫 칸**(내 부문의 맞수 — 12번 §8-3). 둘 다 흔들림 없이 고정 전력이에요. */
  function create(seed, pos, gender) {
    const g = g2(gender);
    const T = TUNE;
    const wr = rngOf(seed, 0, SALT.world);
    const jitter = (base) => base + randInt(wr, -T.JITTER, T.JITTER);
    // 우리 학교 — 나 + 동료 10(내 포지션의 첫 빈칸이 {rival})
    const ours = [];
    let u = 0, rivalPut = false;
    for (const p of POS_ORDER) for (let j = 0; j < FORMATION[p]; j++) {
      if (p === pos && j === 0) continue;                         // 내 칸
      if (p === pos && !rivalPut) { ours.push({ id: "R", pos: p, str: T.US_STR, role: "rival" }); rivalPut = true; continue; }   // 전력은 `upgrade`가 또래 곡선으로
      ours.push({ id: `U${u++}`, pos: p, str: jitter(T.US_STR), role: "" });
    }
    // 권역 리그 5교 — 11명씩(흔들림을 먼저 굴린 뒤 에이스 칸을 갈아 끼워요 — 소비량이 늘 같게)
    const league = [{ id: 0, str: T.US_STR }];
    T.LEAGUE_STR.forEach((s, i) => {
      const k = i + 1;
      const xi = [];
      let n = 0;
      for (const p of POS_ORDER) for (let j = 0; j < FORMATION[p]; j++) xi.push({ id: `L${k}_${n++}`, pos: p, str: jitter(s) });
      if (k === T.LEAGUE_STR.length) {
        const at = xi.findIndex((x) => x.pos === pos);
        xi[at] = { id: `L${k}_A`, pos, str: s + T.ACE_PLUS, role: "ace" };
      }
      league.push({ id: k, str: s, xi });
    });
    // 대진 — 원형 배정을 섞어서 두 바퀴(홈 · 원정) · 🔥 에이스의 학교와는 3라운드에 고정
    const perm = shuffle(wr, [0, 1, 2, 3, 4, 5]);
    const rounds = [];
    for (let r = 0; r < 5; r++) {
      const rest = perm.slice(1);
      const rot = rest.slice(r).concat(rest.slice(0, r));
      const arr = [perm[0]].concat(rot);
      rounds.push([[arr[0], arr[5]], [arr[1], arr[4]], [arr[2], arr[3]]]);
    }
    const aceK = T.LEAGUE_STR.length;
    const r5 = rounds.findIndex((rd) => rd.some(([x, y]) => (x === 0 && y === aceK) || (x === aceK && y === 0)));
    const tmp = rounds[ACE_ROUND]; rounds[ACE_ROUND] = rounds[r5]; rounds[r5] = tmp;
    // 전국대회 31교 — 8조 × 4팀 · 시드가 조마다 한 곳 · 우리는 1조의 둘째 자리
    const seeds = []; for (let k = 0; k < 8; k++) seeds.push(randInt(wr, T.CUP_SEED[0], T.CUP_SEED[1]));
    const ns = []; for (let k = 0; k < 23; k++) ns.push(randInt(wr, T.CUP_REST[0], T.CUP_REST[1]));
    shuffle(wr, ns);
    const groups = [];
    let q = 0;
    for (let gi = 0; gi < 8; gi++) {
      const grp = [{ id: `S${gi}`, str: seeds[gi] }];
      if (gi === 0) grp.push({ id: "US", str: T.US_STR, us: true });
      const need = gi === 0 ? 2 : 3;
      for (let k = 0; k < need; k++) grp.push({ id: `N${q}`, str: ns[q++] });
      for (const t of grp) if (!t.us) { t.xs = []; for (let k = 0; k < 11; k++) t.xs.push(jitter(t.str)); }
      groups.push(grp);
    }

    /* 🏷️ 이름 — **따로 가른 난수원**에서, 세계 모양을 다 만든 **뒤에**(13번 §5-2).
     * 뽑는 자리 수는 성별과 무관하게 같아요(동료 9 + 리그 선수 54 · 학교 36). */
    const nr = rngOf(seed, 0, SALT.name);
    const taken = new Set([OUR_SCHOOL]);
    const schoolPool = shuffle(nr, SCHOOLS.slice());
    const nameSchool = () => { const s = schoolPool.find((x) => !taken.has(x)) || `${taken.size}번고`; taken.add(s); return s; };
    const usedNames = new Set(Object.values(ROLE_NAME[g]));
    const nameOne = () => {
      for (let t = 0; t < 50; t++) {
        const nm = pickName(nr, g);
        if (nm && !usedNames.has(nm)) { usedNames.add(nm); return nm; }
      }
      return `선수${usedNames.size}`;
    };
    const R = ROLE_NAME[g];
    for (const x of ours) x.name = x.role === "rival" ? R.rival : nameOne();
    for (const t of league.slice(1)) {
      t.name = nameSchool();
      for (const x of t.xi) x.name = x.role === "ace" ? R.ace : nameOne();
    }
    league[0].name = OUR_SCHOOL;
    for (const grp of groups) for (const t of grp) t.name = t.us ? OUR_SCHOOL : nameSchool();

    const W = WORLD_NAME[g];
    return {
      v: 1,
      school: { name: OUR_SCHOOL, team: W.team, colors: ["navy", "white"] },
      keeper: { name: R.keeper, who: ROLE_WHO[g].keeper },
      rivalWho: ROLE_WHO[g].rival, aceWho: ROLE_WHO[g].ace,
      ours,
      league: { name: W.league, teams: league, rounds, table: league.map(() => ({ pts: 0, gf: 0, ga: 0 })),
        ind: {}, lostTo: [] },
      cup: { name: W.cup, groups, res: {}, stage: 0, ko: [], out: false, done: false },
      test: { name: W.test },
    };
  }

  /* ---------- ⚽ 경기에 넣을 줄 ----------
   * 🔒 줄은 **세이브의 복사본**으로 만들어요 — 엔진이 줄 객체에 캐시(`_ab`)를 붙이니까요.
   * 🔒 내 줄의 6키 이름이 계약이에요(`statReader`가 모르는 키를 조용히 평균으로 채워요). */
  const npc = (x) => ({ id: x.id, name: x.name || "", pos: x.pos, slot: {}, me: false, str: x.str });
  function meRow(S) {
    const sp = TUNE.ACT1_SPOT[S.pos] || 1;
    const stats = {};
    for (const k of STAT_KEYS) stats[k] = S.stats[k];
    return { id: "me", name: S.name, pos: S.pos, slot: {}, me: true, stats, foot: 1, buff: { g: sp, a: sp, d: sp } };
  }
  /* 대회 학교 — 굴려 둔 11명 중 그 학교 포메이션의 10자리(POS_ORDER 차례로) */
  function strsXI(t) {
    const n = (FORM_W[t.form] || FORM_W["4-4-2"]).n;
    const out = [];
    let i = 0;
    for (const p of POS_ORDER) for (let j = 0; j < n[p]; j++) { out.push({ id: `${t.id}_${i}`, pos: p, slot: {}, me: false, str: t.xs[i] }); i++; }
    return out;
  }

  /* ================================================================
   * 🧩🔁 v5 — 포메이션 · 또래 · 감독의 선발 판단(48번 §12 · 50번 §11 · §12 · 51번 v4-3 · 52번)
   * 🔒 굴림은 모두 판 시드에서(새 소금 `form` · `peer`) · 경기 중 굴림 0 · 같은 입력이면 같은 판단
   * ================================================================ */
  const lineOf = (p) => (p === "fw" || p === "wg" ? "atk" : p === "mf" ? "mid" : "def");
  const LINE_NAME = { atk: "공격 줄", mid: "미드 줄", def: "수비 줄" };
  const LINE_FORM = { atk: "4-3-3", mid: "3-5-2", def: "5-3-2" };
  const LINE_TOP = { atk: 3, mid: 5, def: 5 };       // 줄 = 그 줄을 살리는 포메이션의 선발 수만큼 센 사람
  const t10 = (v) => Math.round(v * 10);              // 0.1 단위 정수 — 조각을 먼저 접어 더함(보이는 값 = 판정 값)
  /* 리그 학교의 10자리 — 굴려 둔 11명의 `pos`를 포메이션에 맞춰 다시 붙이고 남는 한 명은 `off`(기록 · 이름은 그대로) ·
   *   🔥 에이스는 늘 내 포지션 자리 — 포메이션에 그 자리가 없으면 이웃 자리를 내 포지션 이름으로(51번 v4-3) */
  function lineup(t, myPos) {
    const need = Object.assign({}, FORM_W[t.form].n);
    for (const x of t.xi) { if (x.pos0 == null) x.pos0 = x.pos; x.off = true; }
    const ace = t.xi.find((x) => x.role === "ace");
    if (ace) { const at = need[myPos] > 0 ? myPos : NEIGH[myPos]; need[at] -= 1; ace.pos = myPos; ace.off = false; }
    const rest = t.xi.filter((x) => x.role !== "ace");
    for (const p of POS_ORDER) for (const x of rest) { if (need[p] <= 0) break; if (x.off && x.pos0 === p) { x.pos = p; x.off = false; need[p] -= 1; } }
    for (const p of POS_ORDER) for (const x of rest) { if (need[p] <= 0) break; if (x.off) { x.pos = p; x.off = false; need[p] -= 1; } }
  }
  const teamXI = (t) => t.xi.filter((x) => !x.off).map(npc);
  /* 🔁 판을 v5 세계로 — 새 판(`newState`)과 옛 세이브(`loadSave`)가 같은 길(한 번만 · `world.v` 2) ·
   *   상대 포메이션 · 리그 10자리 · {rival} → 번호의 1학년(또래) · 내 포지션 또래 · 또래 출발선 = 내 시작 blend */
  function upgrade(S) {
    const Wd = S.world;
    if (!Wd || Wd.v >= 2) return false;
    const T = TUNE, E = window.WingerEngine;
    const pos = S.pos;
    const fr = rngOf(S.seed, 0, SALT.form);
    const deal = (k) => { const bag = []; while (bag.length < k) bag.push(...shuffle(fr, FORM_NAMES.slice())); return bag; };
    const lg = deal(Wd.league.teams.length - 1);
    Wd.league.teams.slice(1).forEach((t, i) => {
      t.form = lg[i];
      const ace = t.xi.find((x) => x.role === "ace");
      if (ace) ace.str = t.str + T.ACE_PLUS + (T.ACE_PLUS_POS[pos] || 0);
      lineup(t, pos);
    });
    const cupT = [];
    for (const g of Wd.cup.groups) for (const t of g) if (!t.us) cupT.push(t);
    const cb = deal(cupT.length);
    cupT.forEach((t, i) => { t.form = cb[i]; });
    // 우리 학교 — 내 포지션 동료를 또래로(번호의 1학년 = 첫 또래 · 1학년)
    const num = Wd.ours.find((x) => x.role === "rival" || x.role === "number");
    Wd.ours = Wd.ours.filter((x) => x.pos !== pos);
    const pr = rngOf(S.seed, 0, SALT.peer);
    const nr = rngOf(S.seed, KEY.peerName, SALT.name);
    const g = g2(S.gender);
    const used = new Set([Wd.keeper.name].concat(Wd.ours.map((x) => x.name)));
    for (const t of Wd.league.teams.slice(1)) for (const x of t.xi) used.add(x.name);
    const nameOne = () => { for (let k = 0; k < 50; k++) { const nm = pickName(nr, g); if (nm && !used.has(nm)) { used.add(nm); return nm; } } return `선수${used.size}`; };
    for (let k = 0; k < T.PEER_N[pos]; k++) {
      const row = k === 0 && num ? num : { id: `P${k}`, pos, role: "", name: nameOne() };
      const grade = k === 0 ? 1 : 1 + Math.floor(pr() * 3);
      pr();                                                   // 빠르기 칸 굴림(옛 장치와 같은 소비 — 학년이 빠르기를 정해요)
      const d = -T.PEER_SPREAD + 2 * T.PEER_SPREAD * pr() + T.PEER_GRADE_D[grade];
      Object.assign(row, { pos, role: k === 0 ? "number" : "", peer: { grade, d: Math.round(d * 1000) / 1000, pace: T.PEER_PACE[grade] } });
      Wd.ours.push(row);
    }
    /* 🧍 자리 채우기 — 어떤 포메이션이든 10명이 서게: 다른 포지션 동료가 모자라면(미드필더 · 4-4-2에서 하나) 같은 흔들림의 동료를 더해요
     *    (51번 장치는 이 자리를 9명으로 잼 — 30번 v5에 적음) */
    const xr = rngOf(S.seed, 1, SALT.form);
    for (const f of FORM_NAMES) {
      if (FORM_W[f].n[pos] === 0) continue;
      for (const p of POS_ORDER) {
        if (p === pos) continue;
        const have = Wd.ours.filter((x) => !x.peer && x.pos === p).length;
        const short = FORM_W[f].n[p] - have - Math.max(0, Wd.ours.filter((x) => !x.peer && x.pos !== p).length - POS_ORDER.filter((q) => q !== pos && q !== p).reduce((a, q) => a + FORM_W[f].n[q], 0));
        for (let k = 0; k < short; k++) Wd.ours.push({ id: `X${Wd.ours.length}`, pos: p, str: T.US_STR + randInt(xr, -T.JITTER, T.JITTER), role: "", name: nameOne() });
      }
    }
    Wd.peerStart = Math.round(E.blendOf({ pos, stats: S.statsAt0 || S.stats }) * 1000) / 1000;
    Wd.form = Wd.form || { h1: null, h2: null };
    Wd.v = 2;
    return true;
  }
  const peers = (S) => S.world.ours.filter((x) => x.peer);
  const numberRow = (S) => S.world.ours.find((x) => x.role === "number" || x.role === "rival") || null;
  const wk = (w) => Math.max(0, Math.min(36, Math.floor(Number(w)) || 0));
  /* 또래 i의 그 주 능력 — 내 시작 blend + δ + 빠르기 × G(주) */
  const peerA = (S, q, w) => S.world.peerStart + q.peer.d + q.peer.pace * PEER_G[S.pos][wk(w)];
  /* 또래의 그 주 — { row, a, cond, score } · 컨디션은 (판 시드 · 주)에서 또래 차례로 한 번씩 */
  function peersAt(S, w) {
    const r = rngOf(S.seed, KEY.peerCond(wk(w)), SALT.peer);
    const med = PEER_CQ[10];
    return peers(S).map((q) => {
      const u = r() * 20, i = Math.min(19, Math.floor(u));
      const c0 = PEER_CQ[i] + (PEER_CQ[i + 1] - PEER_CQ[i]) * (u - i);
      const cond = Math.round(clamp(med + TUNE.PEER_COND_W * (c0 - med), 0, 100));
      const a = peerA(S, q, w);
      return { row: q, a, cond, score: a + TUNE.W_COND * (cond - 51) };
    });
  }
  /* 내 선발 점수의 조각(0.1 정수) — 능력(blend) · 🤝 · 컨디션 · 🦶 약발 */
  function myScore10(S, cond) {
    const E = window.WingerEngine;
    const cd = cond != null ? cond : S.cond;                 // 경기 날 컨디션(대회 회복이 붙으면 그 값)
    return { a: t10(E.blendOf({ pos: S.pos, stats: S.stats })), t: t10(TUNE.W_TRUST * Math.round(Number(S.trust) || 0)),
      c: t10(TUNE.W_COND * (Math.round(Number(cd) || 0) - 51)), wk: t10(TUNE.W_WEAK * (Math.floor(Number(S.weak)) || 0)) };
  }
  /* 🧠 감독의 포메이션 — 반기마다(1주 · 20주) 「요즘 좋은 줄」(줄의 폼 = 선발 점수 − 평소 수준)을 살림 ·
   *   셋이 `FORM_TIE` 안이면 ⚖️ · 내 포지션 자리 0인 포메이션은 고르지 않음(50번 §11-1 · 51번 v4-3) */
  function chooseForm(S, half) {
    const w = half === 1 ? 1 : 20;
    const base0 = S.world.peerStart + PEER_G[S.pos][w];
    const pa = new Map(peersAt(S, w).map((x) => [x.row, x]));
    const m = myScore10(S);
    const mine = (m.a + m.t + m.c + m.wk) / 10;
    const ln = { atk: [], mid: [], def: [] };
    ln[lineOf(S.pos)].push(mine - base0);
    for (const x of S.world.ours) ln[lineOf(x.pos0 || x.pos)].push(x.peer ? pa.get(x).score - base0 : x.str - TUNE.US_STR);
    const st = {};
    for (const k of Object.keys(ln)) { const top = ln[k].slice().sort((a, b) => b - a).slice(0, LINE_TOP[k]); st[k] = t10(top.reduce((a, b) => a + b, 0) / top.length) / 10; }
    const order = Object.keys(st).sort((a, b) => st[b] - st[a]);
    let f = "4-4-2", why;
    if (t10(st[order[0]] - st[order[2]]) > t10(TUNE.FORM_TIE)) {
      const l = order.find((k) => FORM_W[LINE_FORM[k]].n[S.pos] > 0);
      if (l) { f = LINE_FORM[l]; why = `강 감독: 「요즘 ${LINE_NAME[l]}이 좋다 — ${f}」`; }
    }
    if (!why) why = `강 감독: 「줄마다 큰 차가 없다 — ${f} 균형으로 간다」`;
    return { name: f, why, lines: ["atk", "mid", "def"].map((k) => ({ name: LINE_NAME[k], v: st[k] })) };
  }
  /* 지금 반기의 우리 포메이션 — 그 반기에 처음 물을 때 한 번 정해 얼려요(세이브) */
  function formNow(S, w) {
    const h = (Number(w) || S.week) < 20 ? "h1" : "h2";
    if (!S.world.form) S.world.form = { h1: null, h2: null };
    if (!S.world.form[h]) S.world.form[h] = chooseForm(S, h === "h1" ? 1 : 2);
    return S.world.form[h];
  }
  /* 🎯 감독의 선발 판단 — 경계 = 또래를 선발 점수로 줄 세운 s번째 · Δ = 내 점수 − 그의 점수(조각을 먼저 접어 더함) ·
   *   ① Δ ≥ 0 선발 · ② −BENCH_GAP < Δ < 0 이웃 자리 선발 · ③ 벤치 → SUB_MIN′ 교체(이웃 자리) ·
   *   기회 주기: 앞 공식 경기가 ③이면 ③ 대신 ② · 또래가 자리보다 적으면 ① */
  function pickFor(S, w, formName, prevK, cond) {
    const T = TUNE;
    const f = formName || formNow(S, w).name;
    const sN = FORM_W[f].n[S.pos];
    const srt = peersAt(S, w).sort((a, b) => (b.score - a.score) || (a.row.name < b.row.name ? -1 : a.row.name > b.row.name ? 1 : 0));
    if (!srt.length || sN > srt.length) return { k: 1, at: S.pos, d: null, parts: [], rival: null, onMin: 0, on: srt.slice(0, Math.max(0, sN - 1)).map((x) => x.row.id), chance: false };
    const tr = srt[sN - 1];
    const m = myScore10(S, cond);
    const parts = [
      { name: "능력", v: (m.a - t10(tr.a)) / 10 },
      { name: "🤝 감독 신뢰", v: m.t / 10 },
      { name: "🫀 컨디션", v: (m.c - t10(T.W_COND * (tr.cond - 51))) / 10 },
      { name: "🦶 약발", v: m.wk / 10 },
    ];
    const d10 = parts.reduce((a, x) => a + t10(x.v), 0);
    const d = d10 / 10;
    let k = d10 >= 0 ? 1 : d10 > -t10(T.BENCH_GAP) ? 2 : 3;
    let chance = false;
    if (k === 3 && prevK === 3) { k = 2; chance = true; }   // 기회 주기 — 연속 벤치 `CHANCE_N`(1)번이면 다음은 적어도 ②
    const on = (k === 1 ? srt.slice(0, sN - 1) : srt.slice(0, sN)).map((x) => x.row.id);
    return { k, at: k === 1 ? S.pos : neighIn(S.pos, f), d, parts, rival: { id: tr.row.id, name: tr.row.name, grade: tr.row.peer.grade, a: t10(tr.a) / 10, cond: tr.cond },
      onMin: k === 3 ? T.SUB_MIN : 0, on, chance };
  }
  /* 우리 팀 10명 — 나(선 자리) · 선발 또래 · 나머지는 전력 순으로 자리마다(같은 포지션 먼저 · 모자라면 아무나) */
  function ourXI(S, opt) {
    const o = opt || {};
    const w = o.w != null ? o.w : S.week;
    const f = o.form || (S.world.form && S.world.form[(w < 20 ? "h1" : "h2")] ? S.world.form[w < 20 ? "h1" : "h2"].name : "4-4-2");
    const at = o.at || S.pos;
    const need = Object.assign({}, FORM_W[f].n);
    const me = meRow(S);
    me.pos = at; need[at] -= 1;
    const rows = [me];
    const pa = peersAt(S, w);
    const onIds = o.on || pa.slice().sort((a, b) => b.score - a.score).slice(0, Math.max(0, need[S.pos])).map((x) => x.row.id);
    for (const x of pa) if (onIds.indexOf(x.row.id) >= 0 && need[S.pos] > 0) { need[S.pos] -= 1; rows.push(Object.assign(npc(x.row), { pos: S.pos, str: x.a })); }
    const rest = S.world.ours.filter((x) => !x.peer).slice().sort((a, b) => b.str - a.str);
    const used = new Set();
    for (const p of POS_ORDER) for (const u of rest) { if (need[p] <= 0) break; if (!used.has(u) && (u.pos0 || u.pos) === p) { used.add(u); need[p] -= 1; rows.push(Object.assign(npc(u), { pos: p })); } }
    for (const p of POS_ORDER) for (const u of rest) { if (need[p] <= 0) break; if (!used.has(u)) { used.add(u); need[p] -= 1; rows.push(Object.assign(npc(u), { pos: p })); } }
    return rows;
  }
  /* 🔁 팀 내 라이벌(그 주 · 지금 포메이션) · 🏁 리그 내 라이벌(부문 순위 바로 위 · 1위면 바로 아래 · 우리 학교 빼고) */
  function teamRival(S, w) {
    const p = pickFor(S, w, null, null);
    return p.rival;
  }
  function leagueRival(S) {
    const all = ranking(S).filter((x) => x.me || x.team !== OUR_SCHOOL);
    const i = all.findIndex((x) => x.me);
    if (i < 0 || all.length < 2) return null;
    const x = i > 0 ? all[i - 1] : all[1];
    const aceId = (aceRow(S) || {}).id;
    return { id: x.id, name: x.name, team: x.team, v: x.v, me: all[i].v, above: i > 0, ace: x.id === aceId };
  }

  /* ---------- ⭐ 평점 — 엔진 밖(12번 §8-4) ----------
   * 🔒 화면에 적힌 **한 자리 숫자 그대로** 돌려줘요 — 7.46이 「7.5」로 보이는데 판정이 7.46을 읽으면
   *    보이는 숫자와 판정이 어긋나요(📍 집계 · 🎯 테스트 · `r9`가 전부 이 값을 읽습니다).
   * 🔒 흔들림 ±4(÷10이면 ±0.4)는 이 경기의 평점 난수원에서 **한 번**. */
  const credit = (n, unit) => (n <= 0 ? 0 : unit * (1 - Math.pow(RATE_DECAY, n)) / (1 - RATE_DECAY));
  function ratingParts(info, pos) {
    const r = RATE[pos] || RATE.fw;
    const b = TUNE.RATE_B[pos] != null ? TUNE.RATE_B[pos] : 64;
    const conceded = info.oppGoals || 0;
    const out = [{ k: "base", label: "기본", v: b }];
    if (info.myGoals) out.push({ k: "g", label: `⚽ 골 ${info.myGoals}`, v: credit(info.myGoals, r.g) });
    if (info.assists) out.push({ k: "a", label: `🅰️ 도움 ${info.assists}`, v: credit(info.assists, r.a) });
    if (info.defense) out.push({ k: "d", label: `🛡️ 수비 ${info.defense}`, v: credit(info.defense, r.d) });
    if (info.res === "W") out.push({ k: "res", label: "팀 승리", v: RATE_RESULT });
    else if (info.res === "L") out.push({ k: "res", label: "팀 패배", v: -RATE_RESULT });
    if (conceded === 0) out.push({ k: "cs", label: "무실점", v: r.cs });
    else if (conceded >= RATE_CONCEDE) out.push({ k: "cc", label: `${conceded}실점`, v: -r.cc });
    return out;
  }
  function rate(info, pos, rnd) {
    const sum = ratingParts(info, pos).reduce((a, p) => a + p.v, 0) + (-RATE_NOISE + rnd() * 2 * RATE_NOISE);
    const v = info.res === "L" ? Math.min(sum, RATE_LOSS_CAP) : sum;
    return Math.round(clamp(v / 10, 1, 10) * 10) / 10;
  }

  /* ---------- 🥅 승부차기 — 양 팀 5명씩 · **내 킥은 첫 번째 한 번만 판**(12번 §5-3) ----------
   * `myKick()`이 참/거짓을 돌려줘요(없으면 남의 경기). 나머지는 `PK_P`(0.75) · 서든데스도 자동.
   * 🔒 판정은 엔진 창구 그대로(`judgeAtP("goal", 0.75, 능력치, s)` — 부르는 쪽) · 여기는 굴림만. */
  function shootout(r, myKick) {
    let a = 0, b = 0;
    const kicks = [];
    for (let i = 0; i < 5; i++) {
      const ka = (i === 0 && myKick) ? !!myKick() : r() < TUNE.PK_P;
      if (ka) a += 1;
      kicks.push({ side: "A", i, ok: ka, mine: i === 0 && !!myKick });
      if (a > b + (5 - i) || b > a + (4 - i)) break;
      const kb = r() < TUNE.PK_P;
      if (kb) b += 1;
      kicks.push({ side: "B", i, ok: kb });
      if (a > b + (4 - i) || b > a + (4 - i)) break;
    }
    let sd = 5;
    while (a === b) {
      const ka = r() < TUNE.PK_P, kb = r() < TUNE.PK_P;
      if (ka) a += 1;
      if (kb) b += 1;
      kicks.push({ side: "A", i: sd, ok: ka }, { side: "B", i: sd, ok: kb });
      sd += 1;
    }
    return { winA: a > b, a, b, kicks };
  }

  /* ---------- 🏟️ 권역 리그 ---------- */
  const roundOf = (w) => LEAGUE_WEEKS.indexOf(w);        // 0~9 · 리그 주가 아니면 −1
  /* 이 주의 내 상대 — 둘째 바퀴는 첫 바퀴와 같은 라운드 순서예요(홈 · 원정만 바뀜) */
  function oppOf(S, w) {
    const ri = roundOf(w);
    if (ri < 0) return null;
    const pr = S.world.league.rounds[ri % 5].find(([x, y]) => x === 0 || y === 0);
    const oid = pr[0] === 0 ? pr[1] : pr[0];
    const t = S.world.league.teams[oid];
    return { oid, name: t.name, str: t.str, form: t.form || "4-4-2", home: ri < 5 ? pr[0] === 0 : pr[1] === 0, ace: oid === TUNE.LEAGUE_STR.length };
  }
  const addInd = (ind, id, g, a, d) => {
    if (!id) return;
    const c = ind[id] || (ind[id] = [0, 0, 0]);
    c[0] += g; c[1] += a; c[2] += d;
  };
  const tally = (tb, x, y, gx, gy) => {
    tb[x].gf += gx; tb[x].ga += gy; tb[y].gf += gy; tb[y].ga += gx;
    if (gx > gy) tb[x].pts += 3; else if (gx < gy) tb[y].pts += 3; else { tb[x].pts += 1; tb[y].pts += 1; }
  };
  /* 내 경기가 끝난 뒤 — 순위표 · 개인 기록(나 · 동료 · 상대) · 전반기에 진 상대.
   * 🔒 상대 클럽의 골 · 차단은 **이미 중계에 뜬 스코어**를 STEP 3 무게로 나눠요(`shareByWeight`) —
   *    다시 굴리면 화면과 순위표가 다른 말을 해요. 엔진 난수원은 그 경기의 것을 이어 씁니다. */
  function afterOurLeague(S, w, info) {
    const E = window.WingerEngine;
    const L = S.world.league;
    const o = oppOf(S, w);
    tally(L.table, 0, o.oid, info.teamGoals, info.oppGoals);
    if (info.res === "L" && roundOf(w) < 5 && L.lostTo.indexOf(o.oid) < 0) L.lostTo.push(o.oid);
    addInd(L.ind, "me", info.myGoals, info.assists, info.defense);
    for (const mt of info.mates) addInd(L.ind, mt.row && mt.row.id, mt.g, mt.a, mt.d);
    const xo = teamXI(L.teams[o.oid]);
    const so = o.str;
    for (const { scorer, assister } of E.shareByWeight(xo, info.oppGoals, "goal", so / (so + TUNE.US_STR))) {
      addInd(L.ind, scorer && scorer.id, 1, 0, 0);
      if (assister) addInd(L.ind, assister.id, 0, 1, 0);
    }
    for (const { scorer } of E.shareByWeight(xo, info.oppStops, "defend")) addInd(L.ind, scorer && scorer.id, 0, 0, 1);
  }
  /* 같은 라운드의 남의 경기 둘 — `autoMatch`(나와 같은 8칸 루프) */
  function otherLeague(S, w) {
    const E = window.WingerEngine;
    const L = S.world.league;
    const ri = roundOf(w);
    const out = [];
    L.rounds[ri % 5].forEach(([x, y], j) => {
      if (x === 0 || y === 0) return;
      E._t.seed(engineSeed(S.seed, KEY.league(ri, j + 1)));
      const r = E.autoMatch({ xiA: teamXI(L.teams[x]), xiB: teamXI(L.teams[y]), strA: L.teams[x].str, strB: L.teams[y].str,
        form: autoForm(L.teams[x].form, L.teams[y].form) });
      tally(L.table, x, y, r.gf, r.ga);
      for (const { scorer, assister } of r.goalsA.concat(r.goalsB)) {
        addInd(L.ind, scorer && scorer.id, 1, 0, 0);
        if (assister) addInd(L.ind, assister.id, 0, 1, 0);
      }
      for (const [row, n] of r.defA) addInd(L.ind, row.id, 0, 0, n);
      for (const [row, n] of r.defB) addInd(L.ind, row.id, 0, 0, n);
      out.push({ x, y, gf: r.gf, ga: r.ga });
    });
    return out;
  }
  /* 순위표 — 승점 → 득실 → 다득점 → (같으면) 고정 제비. 제비는 판마다 한 번 뽑아 둬요 */
  function table(S) {
    const L = S.world.league;
    const r = rngOf(S.seed, KEY.leagueTie, SALT.pk);
    return L.table.map((t, k) => ({ k, name: L.teams[k].name, ...t, tie: r() }))
      .sort((p, q) => (q.pts - p.pts) || ((q.gf - q.ga) - (p.gf - p.ga)) || (q.gf - p.gf) || (p.tie - q.tie));
  }
  /* 내 부문(공격수 · 윙어 골 · 미드 도움 · 수비수 수비)의 리그 기록 — 🔥 · `crown`이 읽어요(리그 경기만) */
  const catOf = (pos) => (pos === "mf" ? 1 : pos === "df" ? 2 : 0);
  const recOf = (S, id) => { const c = S.world.league.ind[id]; return c ? c[catOf(S.pos)] : 0; };
  const aceRow = (S) => S.world.league.teams[TUNE.LEAGUE_STR.length].xi.find((x) => x.role === "ace");
  /* 부문 순위 — 🔒 같으면 **내가 아래**예요(1위는 혼자 앞서야 1위) */
  function ranking(S) {
    const all = [{ id: "me", name: S.name, team: OUR_SCHOOL, v: recOf(S, "me"), me: true }];
    for (const x of S.world.ours) all.push({ id: x.id, name: x.name, team: OUR_SCHOOL, v: recOf(S, x.id) });
    for (const t of S.world.league.teams.slice(1)) for (const x of t.xi) all.push({ id: x.id, name: x.name, team: t.name, v: recOf(S, x.id) });
    return all.sort((p, q) => (q.v - p.v) || ((p.me ? 1 : 0) - (q.me ? 1 : 0)));
  }

  /* ---------- 🏆 전국대회 ----------
   * 조별 — 한 조 여섯 경기(순서는 실측 장치와 같음) · 조 2위까지 16강 · 16강부터 단판(비기면 🥅 승부차기). */
  const GROUP_PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  const cupTeam = (S, id) => { for (const g of S.world.cup.groups) for (const t of g) if (t.id === id) return t; return null; };
  /* 남의 경기 한 판 — 단판이면 비길 때 승부차기(남의 킥만) */
  function autoCup(S, a, b, key, ko) {
    const E = window.WingerEngine;
    E._t.seed(engineSeed(S.seed, key));
    const r = E.autoMatch({ xiA: strsXI(a), xiB: strsXI(b), strA: a.str, strB: b.str, form: autoForm(a.form, b.form) });
    let winA = r.gf > r.ga, pk = null;
    if (ko && r.gf === r.ga) { pk = shootout(rngOf(S.seed, KEY.pk(key), SALT.pk), null); winA = pk.winA; }
    return { a: a.id, b: b.id, ga: r.gf, gb: r.ga, winA, pk: pk ? [pk.a, pk.b] : null };
  }
  /* 조별 — 우리 조의 우리 경기 셋을 뺀 **나머지 전부**를 한 번에(대회 주간에 들어설 때) */
  function cupGroupsAuto(S) {
    const C = S.world.cup;
    C.groups.forEach((grp, gi) => GROUP_PAIRS.forEach(([i, j], m) => {
      const key = `g${gi}_${m}`;
      if (C.res[key] || grp[i].us || grp[j].us) return;
      C.res[key] = autoCup(S, grp[i], grp[j], KEY.group(gi, m), false);
    }));
  }
  /* 우리 조별 경기 셋 — 순서대로(1조 짝 표에서 우리가 낀 것) */
  const ourGroupGames = (S) => GROUP_PAIRS.map(([i, j], m) => ({ i, j, m }))
    .filter(({ i, j }) => S.world.cup.groups[0][i].us || S.world.cup.groups[0][j].us)
    .map(({ i, j, m }) => {
      const grp = S.world.cup.groups[0];
      const opp = grp[i].us ? grp[j] : grp[i];
      return { key: `g0_${m}`, engineKey: KEY.group(0, m), opp, usFirst: !!grp[i].us };
    });
  function groupTable(S, gi) {
    const C = S.world.cup;
    const grp = C.groups[gi];
    const tr = rngOf(S.seed, KEY.groupTie(gi), SALT.pk);
    const tb = new Map(grp.map((t) => [t.id, { id: t.id, name: t.name, pts: 0, gf: 0, ga: 0, tie: tr() }]));
    GROUP_PAIRS.forEach(([i, j], m) => {
      const r = C.res[`g${gi}_${m}`];
      if (!r) return;
      const A = tb.get(r.a), B = tb.get(r.b);
      A.gf += r.ga; A.ga += r.gb; B.gf += r.gb; B.ga += r.ga;
      if (r.ga > r.gb) A.pts += 3; else if (r.ga < r.gb) B.pts += 3; else { A.pts += 1; B.pts += 1; }
    });
    return [...tb.values()].sort((p, q) => (q.pts - p.pts) || ((q.gf - q.ga) - (p.gf - p.ga)) || (q.gf - p.gf) || (p.tie - q.tie));
  }
  /* 16강 대진 — 조 1위 · 2위가 엇갈려요(실측 장치 그대로) */
  function bracket(S) {
    const P = (g, k) => groupTable(S, g)[k].id;
    return [[P(0, 0), P(1, 1)], [P(2, 0), P(3, 1)], [P(4, 0), P(5, 1)], [P(6, 0), P(7, 1)],
      [P(1, 0), P(0, 1)], [P(3, 0), P(2, 1)], [P(5, 0), P(4, 1)], [P(7, 0), P(6, 1)]];
  }
  const KO_NAME = ["16강", "8강", "4강", "결승"];
  /* 🏆 무대 단계 — 0 조별 · 1 16강 · 2 8강 · 3 4강 · 4 준우승 · 5 우승(평가서 무대 칸이 읽어요) */
  const STAGE_NAME = ["조별 리그", "16강", "8강", "4강", "준우승", "우승"];

  /* ---------- 🎯 공개 테스트 — 선발팀 둘(62 대 62) ----------
   * 🔒 기술 판의 중심 = `TEST_P[판] × clamp(능력치 ÷ 기준선, 0.6, 1.4)` — 판정은 엔진 창구(`judgeAtP`)라
   *    여기는 동료 줄만 만들어요. 동료 흔들림은 테스트 난수원에서, 이름은 이름 난수원에서(따로). */
  function testXI(S) {
    const tr = rngOf(S.seed, KEY.testXI, SALT.test);
    const nr = rngOf(S.seed, KEY.testXI, SALT.name);
    const g = g2(S.gender);
    const xi = [meRow(S)];
    let n = 0;
    for (const p of POS_ORDER) for (let j = 0; j < FORM_W["4-4-2"].n[p]; j++) {   // 공개 테스트는 양쪽 ⚖️ 4-4-2 · 필드 10
      if (p === S.pos && j === 0) continue;
      const str = TUNE.TEST_STR + randInt(tr, -TUNE.JITTER, TUNE.JITTER);
      let nm = "";
      for (let t = 0; t < 20 && !nm; t++) nm = pickName(nr, g);
      xi.push({ id: `T${n++}`, name: nm || `선수${n}`, pos: p, slot: {}, me: false, str });
    }
    return xi;
  }

  return {
    TUNE, STAT_KEYS, FORMATION, POS_ORDER, LEAGUE_WEEKS, KEY, SALT, KO_NAME, STAGE_NAME, GROUP_PAIRS,
    create, ourXI, meRow, strsXI, testXI, npc,
    FORMS, FORM_W, FORM_NAMES, NEIGH, neighIn, formM, formCfg, autoForm, upgrade, peers, numberRow, peerA, peersAt, chooseForm, formNow,
    pickFor, teamRival, leagueRival, teamXI, PEER_G,
    rate, ratingParts, shootout,
    roundOf, oppOf, afterOurLeague, otherLeague, table, ranking, recOf, catOf, aceRow,
    cupTeam, cupGroupsAuto, ourGroupGames, groupTable, bracket, autoCup,
    rngOf, engineSeed, mix, mulberry32, randInt, shuffle, clamp,
    fill, josa, clean, short, ROLE_NAME, ROLE_WHO, WORLD_NAME, OUR_SCHOOL,
    HERO_NAMES, rollName, rollStart,
  };
})();
