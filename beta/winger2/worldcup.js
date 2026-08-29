/* 🌏 월드컵 — 클럽 커리어 위에 얹히는 4년 주기 대회예요.
 *
 * 플레이어 제보에서 시작했어요: "클럽팀을 하다가 **중간에** 국가대표가 되어
 * 월드컵을 즐기고 싶다." 그래서 클럽을 대체하는 모드가 아니라, 지금 굴러가는
 * 시즌 루프 위에 얹히는 이벤트로 만듭니다.
 *
 * 컵(cup.js)과 **같은 몸이면 안 돼요.** 네 층이 차이를 만듭니다.
 *   📨 초대장  — 시즌 한복판에 날아와요. 남은 리그가 "월드컵을 향한 일정"이 됩니다
 *   🌏 테마    — 대회 기간 동안 화면의 결이 바뀌어요
 *   🏋️ 리듬    — 연전이 아니라 경기 사이에 훈련 턴이 있고, 그동안 훈련이 잘 돼요
 *   🏆 보상    — 게임 최고의 단일 업적이에요
 *
 * ⚠️ 이 파일이 지키는 계약 셋 (전부 이 저장소에서 사고가 났던 자리예요)
 *
 *  ① **경기를 소비하는 모든 갈래는 wcAfterMatch() 하나를 지납니다.**
 *     승·패·무승부·승부차기·조별 탈락·토너먼트 탈락·우승이 각자 다음 단계를 정하면
 *     반드시 하나가 샙니다. v2.48.0이 그랬어요 — 경기를 뛴 주에는 pendingShow를
 *     내렸는데 벤치 주에는 안 내려서, 다음 준비 화면이 "훈련 2회 남음"이라 적어 놓고
 *     훈련 버튼 여섯 개를 전부 잠갔습니다.
 *
 *  ② **단계 상태는 S.wc 안에만 둡니다.** 최상위 플래그(wcPrep 같은 것)를 만들지
 *     않아요. 대회가 끝나면 S.wc = null이고 그 안의 ready도 같이 사라지니,
 *     **해제를 잊을 대상 자체가 없습니다.**
 *
 *  ③ **산식을 베끼지 않습니다.** matchContribution·teammateGoals·deriveOppGoals·
 *     ratingOf를 그대로 쓰고, 클럽 대신 국가 전력을 인자로 넘겨요. 베끼면 다음에
 *     득점 눈금(GOAL_SCALE)을 만질 때 월드컵만 옛 눈금으로 남습니다.
 *
 * game.js의 전역(S, save, rand, randInt, clamp, pick, shuffle, overall, show, $,
 * MatchSim, matchContribution, teammateGoals, deriveOppGoals, poissonish,
 * randomPlayerName, MARKETS, PLAYER_TITLES, Fx)을 쓰므로 game.js 뒤에 로드해요.
 * career.js가 가진 것(proLog·queueFx·addTrophy·ratingOf·matchRating·finishYear)은
 * init()으로 받아요 — career.js를 크게 건드리지 않으려는 배선입니다. */
"use strict";

window.WingerWorldCup = (() => {
  /* career.js가 넘겨주는 도구들. 이 파일은 career.js 안쪽을 모르고,
   * career.js는 이 파일의 진행을 모르는 채로 서로를 부릅니다. */
  let CTX = null;
  const init = (ctx) => { CTX = ctx; };

  // ---------- 상수 ----------

  /* 4년 주기. 커리어 15시즌에 3·7·11·15 — 네 번이에요.
   *   3시즌  성장기 한복판, 대부분 못 나가는 "이른 월드컵" (그래서 와일드카드가 있어요)
   *   7시즌  전성기 첫 대회
   *  11시즌  노쇠 시작 — "아직 할 수 있나"
   *  15시즌  마지막 시즌 — 라스트 댄스
   * [3,7,11,15] 배열이 아니라 나머지 연산인 이유: 커리어 길이가 바뀌어도 살아요. */
  const FIRST_WC = 3, WC_CYCLE = 4;
  const isWcYear = (y) => y >= FIRST_WC && (y - FIRST_WC) % WC_CYCLE === 0;

  /* 문턱의 **기준점**은 클래스 문턱을 그대로 읽어요. 여기에 78을 적어 두면 클래스
   * 밸런스를 바꿨을 때 화면의 🎖️국가대표 후보와 실제 발탁이 어긋납니다 —
   * "표시와 판정이 서로 다른 것을 본다"가 이 저장소의 단골 병이에요. */
  const CALL_TITLE = "국가대표 후보";
  function classBar() {
    const row = (typeof PLAYER_TITLES !== "undefined" ? PLAYER_TITLES : [])
      .find((t) => String(t[1]).includes(CALL_TITLE));
    return row ? row[0] : 78;
  }

  /* 🎖️ **대표팀 안에서의 선발 경쟁** (설계 D3 — 3단계)
   *
   * 1·2단계는 "발탁 = 전 경기 선발"로 냈어요. 그래야 대회가 그것만으로 완결되고,
   * 4년에 한 번뿐인 첫 대회가 "벤치에서 세 경기 보고 왔다"가 되지 않으니까요.
   * 이제 대회가 자리를 잡았으니 **클래스가 대표팀 안에서도 말을 합니다.**
   *
   *   🏅 국가대표 주전(92↑) — 전 경기 선발 확정. **클래스 이름이 곧 약속이에요.**
   *   🎖️ 국가대표 후보(78~91) — 경기마다 굴려요. 이름이 "후보"인 이유가 생깁니다.
   *
   * ⚠️ 문턱을 여기 숫자로 적지 않아요 — 클래스 표에서 읽습니다(callBar과 같은 이유).
   * 92를 적어 두면 클래스 밸런스를 바꿨을 때 화면의 🏅과 실제 선발이 어긋나요.
   *
   * 토너먼트에서 확률이 올라가요 — **"큰 경기에 기회가 온다"**. 그리고 그게 없으면
   * 결승까지 와서 못 뛰는 대회가 흔해집니다.
   *
   * 문턱 아래(🌱 와일드카드·🎲 깜짝 발탁으로 온 선수)는 바닥 확률을 받아요.
   * 0으로 두면 다섯 경기를 통째로 앉아 있게 되는데, 그건 초대가 아니라 벌이에요. */
  const STARTER_TITLE = "국가대표 주전";
  function starterBar() {
    const row = (typeof PLAYER_TITLES !== "undefined" ? PLAYER_TITLES : [])
      .find((t) => String(t[1]).includes(STARTER_TITLE));
    return row ? row[0] : 92;
  }
  const XI_LO = 0.3;         // 🎖️ 후보 구간 바닥(=국가대표 후보 문턱)의 선발 확률
  const XI_KNOCK = 0.15;     // 토너먼트 가산 — 큰 경기에 기회가 와요
  const XI_FLOOR = 0.15;     // 문턱 아래로 온 선수의 바닥
  function xiP(stage) {
    const hi = starterBar(), lo = classBar();
    const ovr = overall();
    if (ovr >= hi) return 1;
    const t = (ovr - lo) / Math.max(1, hi - lo);
    const base = clamp(XI_LO + (1 - XI_LO) * t, XI_FLOOR, 1);
    return clamp(base + (stage === "group" ? 0 : XI_KNOCK), 0, 1);
  }
  const xiPct = (stage) => Math.round(xiP(stage) * 100);

  /* 🪑 **계속 앉혀 두지는 않아요.**
   *
   * 곡선만 두면 문턱 언저리(30%)에서 다섯 경기를 통째로 못 뛰는 대회가 실제로 나와요.
   * 4년에 한 번뿐인 대회에서 그건 초대가 아니라 벌이에요. 감독도 한 번은 써 봅니다.
   * 그래서 **두 경기 연속 결장이면 다음은 선발**이에요. 최악이 "셋에 하나"로 묶여요.
   * 상한이 아니라 바닥이라 잘하는 선수에게서 뭘 빼앗지 않아요. */
  const BENCH_RUN_MAX = 2;
  function xiNow() {
    const w = wc();
    if (!w) return 1;
    if ((w.benchRun || 0) >= BENCH_RUN_MAX) return 1;
    return xiP(w.stage);
  }

  /* 🎚️ 문턱은 **소집 때마다 조금씩 달라요.**
   *
   * 제보: "소집 문턱은 지금 무조건 고정인가?? 선수들 기량 보고 소집 때마다 조금씩
   * 바뀌면 좋겠는데." 맞는 말이에요 — 대표팀 문은 내가 잘하는가만이 아니라
   * **그 나라에 지금 누가 있는가**로 열립니다.
   *
   * 두 가지가 문턱을 움직여요.
   *   ① 국가 전력 — 🇧🇷 브라질이면 앞에 선 사람이 많아 문이 좁고, 약체면 넓어요.
   *      이게 밸런스 고리를 하나 만듭니다: **강한 나라는 대회에서 유리한 만큼
   *      들어가기가 어려워요.** 유스 선택이 유불리 하나로만 기울지 않게 됩니다.
   *   ② 세대 — 대회마다 ±2쯤 흔들려요. "이번 세대는 유난히 두껍다"가 생깁니다.
   *
   * ⚠️ 흔들림은 **무작위가 아니라 시즌·국가에서 뽑은 고정값**이에요. Math.random을
   * 쓰면 준비 화면을 다시 그릴 때마다 문턱이 달라져서 배지에 적힌 숫자를 믿을 수
   * 없게 됩니다 — 👥 선발 확률에서 이미 같은 사고가 났어요.
   * 그래서 배지에 **나라 이름을 같이** 적어요. 숫자만 보이면 "왜 지난번이랑
   * 다르지?"가 되니, 이유가 화면에 있어야 합니다. */
  const BAR_NAT_K = 0.5;      // 국가 전력이 문턱에 실리는 정도 (🇧🇷 +3.5 · 🇰🇷 -3.5쯤)
  const BAR_WOBBLE = 2;       // 세대마다 흔들리는 폭
  const WILD_GAP = 10;        // 🌱 와일드카드는 문턱에서 이만큼 아래

  const barSeed = (year, code) => {
    let h = 2166136261;
    const mix = (v) => { h = Math.imul(h ^ (v >>> 0), 16777619) >>> 0; };
    mix(year * 7919);
    for (let i = 0; i < code.length; i++) mix(code.charCodeAt(i));
    return (h >>> 0) / 4294967296;
  };

  function callBar(year) {
    const base = classBar();
    const y = year == null ? ((S && S.proYear) || 1) : year;
    const nat = myNation();
    if (!nat) return base;
    const natAdj = (nat.str - NAT_MEAN) * BAR_NAT_K;
    const wob = (barSeed(y, nat.c) * 2 - 1) * BAR_WOBBLE;
    return Math.round(base + natAdj + wob);
  }
  const wildBar = (year) => callBar(year) - WILD_GAP;

  /* 🎲 깜짝 발탁 — **문턱 아래에서도 가끔 이름이 올라와요.**
   *
   * 제보: "종합 문턱에 안 되더라도 3시즌은 와일드카드로 뽑잖아. 다른 시즌 때는
   * 낮은 확률로 소집시키는 건 어때??"
   *
   * ⚠️ 방향이 중요해요. 설계 때 확률 판정을 뺀 이유는 **문턱을 넘었는데 떨어지는**
   * 일을 막으려는 거였어요 — "78인데 왜 안 뽑혀"는 반드시 제보가 됩니다.
   * 이건 반대예요. 문턱 아래에서 **가끔 올라오는 것**이라 빼앗는 게 아니라 얹는
   * 거고, 넘은 사람은 여전히 100% 뽑혀요. 방향만 지키면 아쉬움이 아니라 선물이에요.
   *
   * 그래도 "지난번엔 72로 뽑혔는데 이번엔 74인데 왜 안 뽑혀"는 남아요. 그래서
   * **확률을 미리 화면에 적습니다.** 감춘 도박은 버그로 읽히고, 적어 둔 도박은
   * 이야기가 돼요(🎲 무리한 특훈이 같은 이유로 확률을 적어요).
   *
   * 문턱에 가까울수록 확률이 높아요 — 훈련이 헛되지 않아야 하니까요.
   * 굴리는 건 **시즌 끝에 딱 한 번**이에요(각성처럼 한 번의 결정). 준비 화면에서
   * 다시 그릴 때마다 굴리면 될 때까지 새로고침하는 게임이 됩니다. */
  const LUCK_GAP = 8;        // 문턱에서 이만큼 아래까지가 사정권
  const LUCK_MAX = 0.35;     // 문턱 코앞(1 차이)일 때의 확률
  function luckP(ovr, bar) {
    const d = bar - ovr;
    if (d <= 0 || d > LUCK_GAP) return 0;
    return LUCK_MAX * Math.pow(1 - (d - 1) / LUCK_GAP, 1.6);
  }

  /* 🌱 유망주 와일드카드 — **3시즌에만** 열리는 낮은 문턱이에요.
   *
   * 3시즌 도달률이 5~20%라, 이게 없으면 대부분의 플레이어는 시즌 일곱 개를 지나야
   * 간판 기능을 처음 봅니다. 3시즌은 아직 아무도 도달할 수 없는 시기라 문턱이
   * 문지기가 아니라 벽이에요. 그래서 첫 대회만 특별 취급합니다 —
   * **거의 모두가 한 번은 맛보고, 그 뒤 7·11·15는 순수하게 실력으로.** */
  const wildOpen = (S0) => S0.proYear === FIRST_WC;

  /* 🤝 클럽 감독의 신뢰 — 와일드카드를 받아들일지 정할 때의 대가예요.
   * squad.js의 선발 점수에 다음 시즌 한 해만 실립니다(컨디션 ±4·폼 ±3 규모라
   * 체감되되 압도하지 않아요). */
  const TRUST_GO = -2, TRUST_STAY = 2;

  /* 참가국 — 국가명·국기는 실제예요(게임이 이미 🇧🇷 브라질 세리에A처럼 실명 체계를
   * 씁니다). 대회명은 "월드컵" 단독이고 FIFA는 안 붙여요. 실존 선수·감독·엠블럼은
   * 만들지 않습니다.
   *
   * 전력 폭을 74~90으로 **좁게** 잡은 이유: 약체 국가 유스를 골랐다고 우승이
   * 구조적으로 막히면 안 돼요. 실제 순위 느낌은 살리되 사형선고는 아니게. */
  const NATIONS = [
    { c: "br", name: "🇧🇷 브라질", str: 90 },
    { c: "fr", name: "🇫🇷 프랑스", str: 89 },
    { c: "ar", name: "🇦🇷 아르헨티나", str: 88 },
    { c: "es", name: "🇪🇸 스페인", str: 87 },
    { c: "en", name: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 잉글랜드", str: 87 },
    { c: "de", name: "🇩🇪 독일", str: 86 },
    { c: "pt", name: "🇵🇹 포르투갈", str: 86 },
    { c: "it", name: "🇮🇹 이탈리아", str: 85 },
    { c: "nl", name: "🇳🇱 네덜란드", str: 84 },
    { c: "be", name: "🇧🇪 벨기에", str: 83 },
    { c: "hr", name: "🇭🇷 크로아티아", str: 82 },
    { c: "ur", name: "🇺🇾 우루과이", str: 81 },
    { c: "mx", name: "🇲🇽 멕시코", str: 79 },
    { c: "jp", name: "🇯🇵 일본", str: 78 },
    { c: "us", name: "🇺🇸 미국", str: 77 },
    { c: "kr", name: "🇰🇷 대한민국", str: 76 },
    { c: "sn", name: "🇸🇳 세네갈", str: 76 },
    { c: "au", name: "🇦🇺 호주", str: 74 },
  ];

  /* 내 대표팀 = **유스 국적**이에요. MARKETS가 이미 "유스 국적"으로 불리며 데뷔
   * 리그를 정하니, 거기서 유도하면 세이브에 새 필드가 0개입니다.
   * 모르는 값이면 🇰🇷로 방어해요(옛 세이브·손상된 값). */
  const MARKET_NATION = { k: "kr", jp: "jp", br: "br", af: "en", eu: "it" };
  const myNation = () => {
    const c = MARKET_NATION[(S && S.market) || "k"] || "kr";
    return NATIONS.find((n) => n.c === c) || NATIONS.find((n) => n.c === "kr");
  };

  const NAT_MEAN = NATIONS.reduce((a, n) => a + n.str, 0) / NATIONS.length;
  const natStr = (n) => NAT_MEAN + (n.str - NAT_MEAN) * NAT_SPREAD;
  /* 우리 팀 전력 — 좁힌 국가 전력에 내 종합(에이스 보정)을 얹어요.
   * `without`이면 에이스 보정을 안 얹어요 — 🪑 내가 벤치인 경기예요.
   * 리그의 myTeamGoals(oppStr, true)와 같은 생각이에요: 내가 안 뛰는 경기만
   * 갑자기 다른 자로 재면, 벤치인 경기만 팀이 이상해집니다. */
  const teamStr = (without) => natStr(myNation())
    + (without ? 0 : clamp((overall() - 90) / ACE_DIV, ACE_LO, ACE_HI));

  /* 🌍 국가 전력을 **평균 쪽으로 좁혀서** 써요.
   *
   * 표의 74~90을 그대로 쓰면 유스 국적이 성적을 통째로 정합니다. 실측(대회 6,000판):
   * 종합 100에서 🇧🇷 브라질 우승 18% · 🇰🇷 한국 5% — **3.6배**였어요. 유스 선택이
   * 유불리는 되어야 하지만 사형선고가 되면 안 됩니다(목표 2.0배 이내).
   * 0.35로 좁히니 1.6배가 됐어요. 순위 느낌은 남고 벽은 사라집니다.
   * 표를 직접 고치지 않고 여기서 좁히는 이유: "실제 전력을 이만큼 눌러 쓴다"는
   * 의도가 코드에 남아야 나중에 되돌리거나 다시 재기 쉬워요. */
  const NAT_SPREAD = 0.35;

  /* 🌟 에이스 보정 — **내 종합이 대표팀 전력에 얹혀요.**
   *
   * 이게 없으면 실력이 성적을 거의 못 움직였어요. 실측: 종합 80 → 140으로 올려도
   * 우승률이 4% → 12%뿐이었습니다(리그는 같은 구간에서 리그MVP 3% → 85%예요).
   * 내 골은 GOAL_SCALE 때문에 작은데 팀 전력 차가 크게 실려서, 대회가 "어느 나라
   * 유스를 골랐나" 게임이 됐던 거예요.
   * 에이스 한 명이 팀을 끌어올리는 건 실제 축구고, 이 게임은 내가 주인공이에요.
   * 넣고 나니 5% → 30%로 여섯 배가 됐어요. */
  const ACE_DIV = 4, ACE_LO = -6, ACE_HI = 8;

  const GROUP_N = 4;          // 우리 조 팀 수 (나 포함)
  const GROUP_GAMES = 3;      // 조별리그는 3경기
  const CAMP_FIRST = 2;       // 소집 직후 훈련 턴
  const CAMP_BETWEEN = 1;     // 경기 사이 훈련 턴 — 리그(2턴)보다 짧아요. 대회 일정은 빡빡합니다

  /* 상금 — 게임 최고의 단일 보상이에요. 현 최고는 리그 우승(1800 × 리그 격)이라
   * 프리미어리그에서 약 4,320만인데, 그걸 확실히 넘깁니다. 한 시즌 총수입
   * (3,000~5,000만)급이되 장비 곡선을 부수지는 않는 자리예요. */
  const PRIZE = { champion: 5000, final: 2000, semi: 1000, group: 0, game: 100 };
  const FAME = { call: 40, round: 40, champion: 250 };
  /* 대회 개인상 — 우승(250)보다는 아래, 라운드 통과(40)보다는 위예요.
   * 팀 성적과 다른 축이라 우승 없이도 이름을 남길 수 있어야 합니다. */
  const AWARD_FAME = { boot: 120, ball: 150, wall: 110 };
  const AW_NAME = { boot: "🥇 골든부츠", ball: "🏅 골든볼", wall: "🛡️ 골든월" };

  // ---------- 상태 ----------

  const wc = () => (S && S.wc) || null;
  const hist = () => (S && Array.isArray(S.wcHist) ? S.wcHist : []);
  const playedThisYear = () => hist().some((h) => h.y === S.proYear);
  const called = () => S && S.wcCall === S.proYear;

  /* 🌏 테마 클래스는 **켜고 끄는 게 아니라 S.wc에서 파생**돼요.
   * 끄는 쪽을 한 경로라도 놓치면 리그로 돌아왔는데 화면이 월드컵인 채로 남는데,
   * CSS는 이 저장소의 자동 검증 사각지대라 기계가 그걸 못 잡습니다.
   * 파생으로 두면 자기 복구형이에요 — 한 렌더를 놓쳐도 그다음이 고칩니다. */
  function themeSync() {
    if (typeof document === "undefined" || !document.body) return;
    document.body.classList.toggle("wc-mode", !!wc());
  }

  // ---------- 📨 초대장 ----------

  /* 후반기 준비 화면에서 문턱을 넘는 순간 뜨고, **그대로 잠겨요(래칫).**
   *
   * 이후 각성이나 노쇠로 종합이 떨어져도 발탁은 유지됩니다. 각성(🔮)은 능력치를
   * 45~60으로 되돌리는 **투자**인데, 각성했다고 명단에서 빠지면 잘하려던 행동에
   * 벌을 주는 꼴이에요. "감독은 오늘 폼이 아니라 검증된 실적으로 뽑았다"는
   * 픽션과도 맞습니다.
   *
   * 초대장을 못 받았어도 시즌 끝에 문턱을 넘으면 그때 합류해요(늦깎이 발탁).
   * 두 문 다 "넘으면 들어옴"이라 **빼앗는 경로가 코드에 존재하지 않습니다.** */
  function checkInvite() {
    if (!S || !CTX) return false;
    if (document.querySelector(".wc-overlay")) return false;   // 이미 떠 있으면 다시 안 띄워요
    if (!isWcYear(S.proYear) || called() || playedThisYear()) return false;
    if (!S.activity || S.activity.cb < 2) return false;        // 후반기부터 — 전반기는 명단 발표 전이에요
    const ovr = overall();
    const bar = callBar();
    if (ovr >= bar) { openInvite(false); return true; }
    if (wildOpen(S) && ovr >= wildBar()) { openInvite(true); return true; }
    return false;
  }

  function lockCall(wild) {
    S.wcCall = S.proYear;
    S.wcWild = wild ? S.proYear : undefined;
    S.fandom = (S.fandom || 0) + FAME.call;
    CTX.proLog(`📨 ${myNation().name} 대표팀 소집 명단에 승선했어요! (명성 +${FAME.call})`);
    save();
  }

  function openInvite(wild) {
    if (document.querySelector(".wc-overlay")) return;
    const nat = myNation();
    const wrap = document.createElement("div");
    wrap.className = "av-overlay wc-overlay";
    /* 와일드카드는 **선택**이 붙어요. 그냥 초대장만 주면 무조건 수락이라
     * 선택이 아니라 확인 버튼이 됩니다 — 대가를 클럽 감독의 신뢰에서 가져와요.
     * 3시즌엔 대부분 벤치 자원이라 클럽 자리를 잃는 게 실제로 아픕니다. */
    const body = wild
      ? `<p class="wc-inv-line">협회가 당신을 <b>🌱 유망주 와일드카드</b>로 부릅니다.</p>
         <div class="coach-say">🗣️ 클럽 감독 — “지금 네가 여길 비우면,
           돌아왔을 때 자리가 남아 있을 거란 보장은 못 해.”</div>`
      : `<p class="wc-inv-line">귀하를 <b>${S.proYear}시즌 월드컵 국가대표</b>로 소집합니다.</p>
         <div class="wc-inv-sub">시즌이 끝나면 대표팀에 합류해요.</div>`;
    const acts = wild
      ? `<button class="btn btn-primary" id="btn-wc-go">🌏 다녀오겠습니다</button>
         <button class="btn btn-ghost" id="btn-wc-stay">⚽ 클럽에 남겠습니다</button>`
      : `<button class="btn btn-primary" id="btn-wc-ok">영광입니다</button>`;
    wrap.innerHTML = `<div class="av-modal wc-invite">
      <div class="wc-inv-flag">${nat.name.split(" ")[0]}</div>
      <div class="av-title">📨 대표팀 소집 통지</div>
      ${body}
      ${wild ? `<div class="wc-inv-sub">다녀오면 대회 중 훈련이 잘 되고 명성이 올라요.
        대신 다음 시즌 <b>클럽 선발 확률</b>이 조금 낮아져요.<br/>
        남으면 감독의 신뢰를 얻어 다음 시즌 선발 확률이 조금 올라요.</div>` : ""}
      <div class="av-actions">${acts}</div>
    </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    if (wild) {
      document.getElementById("btn-wc-go").onclick = () => {
        lockCall(true);
        S.clubTrust = { y: S.proYear + 1, v: TRUST_GO };
        CTX.proLog(`🤝 클럽 감독의 표정이 굳었어요 — 다음 시즌 선발 경쟁이 조금 불리해져요`);
        save(); close(); CTX.renderPrep();
      };
      document.getElementById("btn-wc-stay").onclick = () => {
        /* 남기로 하면 **그 시즌 발탁이 닫혀요.** wcHist에 "none"으로 남겨서
         * 시즌 끝 관문이 다시 묻지 않게 합니다 — 안 그러면 거절해 놓고
         * 늦깎이 발탁으로 들어가는 뒷문이 생겨요. */
        S.wcHist = hist().concat([{ y: S.proYear, result: "none", stay: true, g: 0, a: 0, apps: 0 }]);
        S.clubTrust = { y: S.proYear + 1, v: TRUST_STAY };
        CTX.proLog(`⚽ 대표팀 소집을 고사하고 클럽에 남았어요 — 감독의 신뢰를 얻었어요`);
        save(); close(); CTX.renderPrep();
      };
    } else {
      document.getElementById("btn-wc-ok").onclick = () => { lockCall(false); close(); CTX.renderPrep(); };
    }
  }

  /* 준비 화면 배지 — 월드컵 시즌에만 한 줄. 남은 리그가 "월드컵을 향한 일정"으로
   * 읽히게 하는 것이 이 배지의 일이에요. */
  function badgeHTML() {
    if (!S || !isWcYear(S.proYear)) return "";
    /* 대회 중 배지 — **어떻게 승선했는지**도 적어요. 🎲 깜짝 발탁은 소집 카드에서
     * 한 번 스치고 마는데, 그 한 번을 놓치면 "왜 문턱도 안 됐는데 뛰고 있지"가 됩니다. */
    /* ⚠️ 대회 중에는 **어떻게 뽑혔는지 안 적어요.** 소집 카드에서 한 번 말하면
     * 충분하고, 대회 내내 "너는 깜짝 발탁이었다"를 붙여 두면 뛰는 내내 그 얘기예요
     * (제보: "월드컵 발탁된 이후에 깜짝 발탁으로 선정되었다 이런 얘기는 빼자"). */
    if (wc()) return `<div class="wc-badge">🌏 월드컵 진행 중 — 대표팀 훈련장에서 훈련이 잘 돼요</div>`;
    const stayed = hist().some((h) => h.y === S.proYear && h.stay);
    if (stayed) return `<div class="wc-badge dim">⚽ 이번 월드컵은 고사했어요 — 클럽에 집중해요</div>`;
    if (playedThisYear()) return "";
    if (called()) return `<div class="wc-badge">📨 월드컵 명단 승선 — 시즌이 끝나면 소집돼요</div>`;
    const bar = wildOpen(S) ? wildBar() : callBar();
    const ovr = Math.round(overall());
    /* 나라를 같이 적어요 — 문턱이 대회마다 달라지니, 숫자만 보이면
     * "왜 지난번이랑 다르지?"가 됩니다. 이유가 화면에 있어야 해요. */
    const p = luckP(ovr, bar);
    return `<div class="wc-badge dim">🌏 올해는 월드컵의 해 — ${myNation().name} 소집 문턱 <b>종합 ${bar}</b>`
      + ` (지금 ${ovr})${wildOpen(S) ? " · 🌱 유망주 와일드카드" : ""}`
      /* 도박은 **미리 적어야** 이야기가 돼요. 감추면 버그로 읽힙니다. */
      + `${p > 0 ? `<br/>🎲 문턱까지 <b>${bar - ovr}</b> — 깜짝 발탁 가능성 <b>${Math.round(p * 100)}%</b>` : ""}</div>`;
  }

  // ---------- 시즌 끝 관문 ----------

  /* career.js의 finishYear 입구 다섯 곳이 **이 함수 하나**를 지나요.
   * 다섯 곳에 각각 월드컵 분기를 심으면 반드시 하나가 샙니다. */
  const due = () => !!(S && isWcYear(S.proYear) && !playedThisYear() && !wc());

  function enter(onDone) {
    /* ⚠️ 이 시즌을 이미 치렀으면(우승했든, 문턱에 못 미쳤든, **고사했든**) 다시 안 열어요.
     * 관문(seasonEnd)이 due()로 한 번 거르지만 여기서도 막습니다 — 고사해 놓고
     * 늦깎이 발탁으로 들어가는 뒷문이 생기면 그 선택이 선택이 아니게 돼요. */
    if (playedThisYear() || wc()) { onDone(); return; }
    const bar = wildOpen(S) ? wildBar() : callBar();
    const ovr = overall();
    /* 초대장을 받았으면 종합이 떨어졌어도 들어가요(래칫). 못 받았어도 지금
     * 문턱을 넘으면 늦깎이로 합류합니다. */
    /* 🎲 깜짝 발탁 — 문턱 아래일 때 **여기서 딱 한 번** 굴려요.
     * 각성처럼 한 번의 결정이라 Math.random이 맞아요 — 확률을 '읽는' 자리가
     * 아니라 '거는' 자리입니다(배지가 읽는 자리고, 거기는 산식이라 안 흔들려요). */
    let lucky = false;
    if (!called() && ovr < bar) {
      const p = luckP(ovr, bar);
      lucky = p > 0 && Math.random() < p;
      if (!lucky) {
        S.wcHist = hist().concat([{ y: S.proYear, result: "none", g: 0, a: 0, apps: 0 }]);
        CTX.proLog(p > 0
          ? `🌏 이번 월드컵은 TV로 봤어요 — 깜짝 발탁(${Math.round(p * 100)}%)도 비껴갔어요`
          : `🌏 이번 월드컵은 TV로 봤어요 — 소집 문턱은 종합 ${bar}예요 (지금 ${Math.round(ovr)})`);
        save();
        onDone();
        return;
      }
      CTX.proLog(`🎲 깜짝 발탁! 명단 발표 직전에 이름이 올랐어요 (가능성 ${Math.round(p * 100)}%)`);
    }
    if (!called()) lockCall(wildOpen(S) && ovr < callBar());
    if (lucky) S.wcLucky = S.proYear;
    startTournament(onDone);
  }

  // ---------- 대회 ----------

  function rollGroups() {
    const me = myNation();
    const pool = NATIONS.filter((n) => n.c !== me.c);
    const picked = shuffle(pool.slice()).slice(0, 7);
    /* 명단에는 **좁힌 전력**을 적어 둬요 — 이후 판정이 전부 이 숫자를 봅니다.
     * 표의 원래 값과 실제 판정 값이 갈리면 "표시와 판정이 다른 것을 본다"가 돼요. */
    const myGroup = [{ name: me.name, str: natStr(me), me: true, pts: 0, gd: 0 }]
      .concat(picked.slice(0, GROUP_N - 1).map((n) => ({ name: n.name, str: natStr(n), pts: 0, gd: 0 })));
    const others = picked.slice(GROUP_N - 1).map((n) => ({ name: n.name, str: natStr(n) }));
    return { myGroup, others };
  }

  /* 대표팀 동료 이름 — **대회 안에서만 존재해요.**
   * squad.js의 리그 명단이나 개인 순위(race)에서 데려오고 싶어지는데, 참으세요.
   * 소속 리그가 제각각인 국대 동료를 리그 명단과 이으면 "그 선수가 두 표에서
   * 다른 숫자"가 되는 표가 하나 늘어납니다 — 이 저장소의 단골 병이에요. */
  /* 중계에 이름을 빌려줄 대표팀 동료 — **우리 나라 명단의 선발에서** 가져와요.
   * 따로 지어내면 중계에 뜬 이름이 순위표 어디에도 없는 유령이 됩니다. */
  const matesOf = () => {
    const w = wc();
    return (w && Array.isArray(w.mates) && w.mates.length) ? w.mates
      : natXI(true).filter((x) => !x.me).map((x) => x.name);
  };

  /* 🥇 대회 개인 순위 — **참가국마다 진짜 명단이 있어요.**
   *
   * 제보: "월드컵 개인순위는 우리팀이나 다른팀이나 다 11명 이상의 스쿼드로
   * 구성된 애들 중에서 나오는 거지??"
   *
   * ⚠️ 처음엔 아니었어요. 나라마다 **지어낸 얼굴 하나씩**이었고, 중계에 이름을
   * 빌려주는 대표팀 동료 6명은 그 표와 **서로 모르는 사이**였습니다. 동료가 골을
   * 넣어도 순위표에는 아무 일이 없었어요 — 이 저장소가 계속 싸워 온 바로 그 병
   * ("명단이 둘로 갈려 표시와 판정이 다른 것을 본다")을 여기서 되풀이하고 있었어요.
   *
   * 이제 참가 8개국이 전부 **squad.js와 같은 방식으로 16명씩** 갖습니다.
   *   · 우리 나라 명단에는 **내가 한 줄로** 들어가요 (rollSquad(base, true))
   *   · 중계에 뜨는 동료 이름은 우리 나라 **선발에서** 가져와요
   *   · 동료가 넣은 골은 **그 선수 기록에 쌓여** 순위표에 그대로 올라와요
   *   · 다른 나라도 자기 경기를 치르고, 그 골은 그 나라 선수에게 배분돼요
   * 순위표는 이 명단 하나에서만 뽑습니다 — 표가 둘일 자리가 없어요. */
  /* 순위표에 보여줄 사람 수. **참가국 수(8)보다 커야** 해요 —
   * 8이면 나라마다 한 자리씩으로 딱 차서, 우리 팀 동료가 아무리 많이 넣어도
   * 표에 못 올라옵니다(제보: "우리팀 선수가 골 많이 넣으면 그 선수도 나오고 이런거").
   * 나라별 한 자리를 채우고 남는 두 자리를 **득점 순으로** 줍니다. */
  const FACE_N = 10;
  const NAT_G0 = 1.15, NAT_GK = 0.055;       // 한 나라가 한 경기에 넣는 골 (전력 74 → 1.15)

  const sqLib = () => window.WingerSquad;
  function natSquadOf(str, mine) {
    const L = sqLib();
    return L && L._t && L._t.rollSquad ? markAce(L._t.rollSquad(str, !!mine), !!mine) : [];
  }
  // 그 명단의 선발 11 — squad.js의 포메이션을 그대로 써요
  function xiOf(list) {
    const L = sqLib();
    const F = (L && L.FORMATION) || { fw: 2, wg: 2, mf: 4, df: 3 };
    const out = [];
    for (const p of Object.keys(F)) {
      out.push(...list.filter((x) => x.pos === p).sort((a, b) => b.str - a.str).slice(0, F[p]));
    }
    return out;
  }
  /* 🇰🇷 **우리 나라가 그 경기에 세운 열한 명.**
   *
   * `xiOf`는 실력 순으로만 뽑아요. 그런데 대표팀 선발은 실력만이 아니라 **굴림**으로도
   * 정해집니다(🎖️ 후보 구간). 그래서 둘을 그냥 두면 어긋나요 —
   *   · 🏅 주전이라 뛰기로 정해졌는데 실력 순에서 밀려 xiOf에 없으면,
   *     열한 명에 **나까지 열둘**이 출전 수를 받아요.
   *   · 벤치인데 xiOf에 있으면, 안 뛴 경기의 출전 수가 동료에게 붙어요.
   * 이 파일이 계속 싸워 온 병("명단이 둘로 갈려 표시와 판정이 다른 것을 본다")의
   * 바로 그 모양이라, **뛰는지 여부를 받아서 명단을 하나로** 만듭니다.
   *
   * 뛰면 나는 반드시 들어가요 — 내 포지션에서 가장 약한 한 명이 자리를 비켜요.
   * 벤치면 나를 빼고 열한 명을 다시 뽑아요 — 그래서 **누가 내 자리에 섰는지**도
   * 여기서 자연히 나옵니다. */
  function natXI(playing) {
    const mine = mySquad();
    const me = mine.find((x) => x.me);
    const others = xiOf(mine.filter((x) => !x.me));
    if (!playing || !me) return others;
    const same = others.filter((x) => x.pos === me.pos).sort((a, b) => (a.str || 0) - (b.str || 0));
    const out = same[0] || others[others.length - 1];
    return others.filter((x) => x !== out).concat([me]);
  }

  /* 골을 넣을 사람 — 선발 중에서 포지션 가중으로. squad.js의 pickScorer와 같은 눈금이에요 */
  const SCORE_W = { fw: 1.0, wg: 0.75, mf: 0.4, df: 0.12 };
  /* 🛡️ 수비를 해낼 사람 — 위를 뒤집은 가중이에요.
   *
   * 왜 필요한가: 대회 개인 순위가 ⚽·🅰️ 두 칸뿐이라, **수비수로 월드컵을 뛰면
   * 자기 대회가 표에서 통째로 안 보였어요.** 경기 결과 화면에는 🛡️ 숫자가 뜨는데
   * 순위표에는 그 축이 아예 없어서, 화면 두 곳이 다른 말을 하고 있었습니다.
   * 리그에서 "포지션이 아니라 숫자로 1위를 정한다"로 이미 정리한 규칙이에요.
   *
   * 눈금(DEF_G0·DEF_GK)은 실측으로 잡았어요 — 아래 주석과 wc-balance-test 참고. */
  const DEF_W = { df: 1.0, mf: 0.55, wg: 0.22, fw: 0.1 };
  /* 한 나라가 한 경기에 해내는 수비 성공 (전력 74 → DEF_G0).
   * 종합 120 수비수가 5경기에서 🛡️ 10회쯤 쌓으니(matchContribution 실측),
   * 다른 나라 최고 수비수도 그 언저리에 오도록 맞춰요 — 안 그러면 상이 그냥 내 것이거나
   * 아예 못 닿는 것이 됩니다. */
  const DEF_G0 = 5.6, DEF_GK = 0.05;
  /* 🌟 나라마다 **에이스가 한 명** 있어요. 대표팀 골은 실제로 한둘에게 몰립니다.
   * 이게 없으면 상대 골이 11명에게 고르게 흩어져 개인 최다 득점자가 낮아지고,
   * 내 골은 다 나에게 쌓이니 **득점왕이 너무 쉬워져요** (실측: 종합 80에서 23%).
   * 8명 중 하나면 운만으로 12.5%인 자리라 그 근처가 맞습니다. */
  const ACE_W = 2.6;
  const wOf = (x) => (SCORE_W[x.pos] || 0.4) * (x.str / 70) * (x.ace ? ACE_W : 1);
  function pickFrom(xi) {
    if (!xi.length) return null;
    let total = 0;
    for (const x of xi) total += wOf(x);
    let r = Math.random() * total;
    for (const x of xi) {
      r -= wOf(x);
      if (r <= 0) return x;
    }
    return xi[xi.length - 1];
  }
  /* 그 나라에서 가장 잘하는 공격수를 에이스로 세워요.
   *
   * ⚠️ **우리 나라에도 세웁니다**(나는 빼고). 예전엔 "내가 주인공이니까"라며 안
   * 세웠는데, 그러면 동료 골이 열한 명에게 고루 흩어져서 **아무도 순위표에
   * 못 올라와요**(제보: "내가 1골 2도움 했는데 우리 팀 선수가 개인 기록 랭킹에
   * 안 보여서"). 실제 대표팀에도 나 말고 한 명은 더 넣는 사람이 있어요. */
  function markAce(list, mine) {
    const pool = mine ? list.filter((x) => !x.me) : list;
    const fw = pool.filter((x) => x.pos === "fw").sort((a, b) => b.str - a.str)[0]
      || pool.slice().sort((a, b) => b.str - a.str)[0];
    if (fw) fw.ace = true;
    return list;
  }

  /* 참가국 명단을 꾸려요. **읽는 쪽에서 채웁니다** — 이 필드는 나중에 생겨서
   * 그 전에 대회를 시작한 세이브에는 없어요(제보: "개인순위 아직 안 보이는데
   * 캐싱인가" — 캐시가 아니라 이 자리였어요). 이미 치른 경기 수만큼 다른 나라도
   * 굴려서 자연스러운 자리에 놓습니다. 0골로 시작하면 내가 늘 1위인 표가 돼요. */
  function ensureSquads() {
    const w = wc();
    if (!w) return null;
    if (!w.squads) {
      const meName = myNation().name;
      w.squads = {};
      for (const t of (w.myGroup || []).concat(w.others || [])) {
        w.squads[t.name] = natSquadOf(t.str, t.name === meName);
      }
      const mine = w.squads[meName] || [];
      w.mates = natXI(true).filter((x) => !x.me).map((x) => x.name);
      /* 이미 치른 내 경기는 **내 줄에 그대로 옮겨요.** 안 옮기면 대회 한복판에
       * 업데이트를 받은 사람의 골이 순위표에서 사라집니다. */
      const meRow0 = mine.find((x) => x.me);
      if (meRow0) { meRow0.g = w.g || 0; meRow0.a = w.a || 0; meRow0.apps = w.apps || 0; }
      for (let i = 0; i < (w.apps || 0); i++) advanceOthers();
      if (w.stage !== "group") cutNations();
      save();
    }
    return w.squads;
  }
  const mySquad = () => (ensureSquads() || {})[myNation().name] || [];

  /* 한 나라의 **정해진 골 수**를 그 나라 선발에게 배분해요.
   *
   * ⚠️ 이게 있어야 화면이 한 몸이 됩니다. 예전에는 상대 팀 골도 그냥 굴렸어요 —
   * 그래서 **4:2로 이겼는데 개인 순위의 독일 선수 골 합이 3**이 됐습니다(제보).
   * 조 순위표의 득실과 개인 순위의 합이 서로 다른 말을 하고 있었어요.
   * 이제 실제 경기에서 나온 골만 사람에게 붙습니다. */
  function creditNat(natName, goals) {
    const sq = (wc() || {}).squads || {};
    const list = sq[natName];
    if (!list) return;
    const xi = xiOf(list);
    for (const x of xi) x.apps = (x.apps || 0) + 1;
    for (let i = 0; i < goals; i++) {
      const who = pickFrom(xi);
      if (who) { who.g = (who.g || 0) + 1; who._dg = (who._dg || 0) + 1; }
      const asst = pickFrom(xi.filter((x) => x !== who));
      if (asst && Math.random() < 0.6) { asst.a = (asst.a || 0) + 1; asst._da = (asst._da || 0) + 1; }
    }
    creditDef(xi, natStrOf(natName));
    /* 그 경기 결과를 모르면(다른 나라끼리의 경기) 골 수로 짐작해요 —
     * 없는 결과를 지어내기보다 그 나라가 실제로 넣은 골을 근거로 씁니다. */
    creditRate(xi, goals >= 2 ? "W" : goals === 1 ? "D" : "L");
  }

  /* 🛡️ 그 경기의 수비를 선발에게 나눠요. 골과 같은 자리에서 같은 횟수만큼 도는
   * 게 중요해요 — 따로 굴리면 "출전 수는 3인데 수비는 5경기치"가 됩니다. */
  /* ⭐ 그 경기 평점 — **리그와 똑같은 기계**로 매겨요.
   *
   * 처음엔 "다른 나라 선수에게는 평점이 없다"고 안 넣었는데, 없는 게 아니라
   * **안 굴리고 있어서** 없던 거예요. 리그를 전 선수로 돌리면서 같은 산식을
   * 여기에도 씁니다 — 지어낸 숫자가 아니라 모두가 같은 방식으로 받는 값이에요. */
  function creditRate(xi, res) {
    for (const x of xi) {
      if (x.me) continue;                       // 내 평점은 w.ratingSum에 따로 쌓여요
      const info = { myGoals: x._dg || 0, assists: x._da || 0, defense: x._dd || 0,
        res, oppGoals: CTX.raceConceded(res) };
      x.rate = (x.rate || 0) + clamp(CTX.matchRating(info, x.pos || "mf", 0) / 10, 1, 10);
      x._dg = 0; x._da = 0; x._dd = 0;
    }
  }
  function creditDef(xi, str) {
    const n = poissonish(Math.max(0.2, DEF_G0 + ((str || 80) - 74) * DEF_GK));
    let total = 0;
    for (const x of xi) total += DEF_W[x.pos] || 0.3;
    for (let i = 0; i < n; i++) {
      let r = Math.random() * total;
      for (const x of xi) { r -= DEF_W[x.pos] || 0.3; if (r <= 0) { x.d = (x.d || 0) + 1; x._dd = (x._dd || 0) + 1; break; } }
    }
  }
  // 순위표·조 순위표가 쓰는 그 전력을 그대로 봐요 (따로 지어내지 않아요)
  function natStrOf(natName) {
    const w = wc() || {};
    const t = (w.myGroup || []).concat(w.others || []).find((x) => x.name === natName);
    return t ? t.str : 80;
  }

  /* 내가 한 경기를 치를 때 **다른 나라도 자기 경기를 치러요.**
   * 안 굴리면 순위표가 나만 오르는 표가 되고, 그건 경쟁이 아니에요.
   *
   * 단, **이미 실제 경기에서 골이 정해진 나라는 건너뜁니다**(skip) — 내 상대와,
   * 우리 조에서 자기들끼리 붙은 두 팀이 거기 들어가요. 안 건너뛰면 같은 경기의
   * 골이 두 번 붙어서 순위표가 조 순위표와 다른 말을 합니다. */
  function advanceOthers(skip) {
    const w = wc();
    const sq = w && w.squads;
    if (!sq) return;
    const meName = myNation().name;
    const done = skip instanceof Set ? skip : new Set(skip || []);
    const strOf = {};
    for (const t of (w.myGroup || []).concat(w.others || [])) strOf[t.name] = t.str;
    for (const nat of Object.keys(sq)) {
      if (nat === meName || done.has(nat)) continue;
      if ((w.natOut || []).includes(nat)) continue;
      creditNat(nat, poissonish(Math.max(0.1, NAT_G0 + ((strOf[nat] || 80) - 74) * NAT_GK) * GOAL_SCALE * 3));
    }
  }
  /* 우리 팀 동료가 넣은 골 — **이름으로 그 선수에게 적립해요.**
   * 중계에 뜬 이름과 순위표의 사람이 같아야 표가 하나예요. */
  const ASSIST_P = 0.55;     // 골 하나에 도움이 붙을 확률
  function creditMates(names, myGoals, res) {
    const mine = mySquad();
    const xi = natXI(true);                      // 내가 뛴 경기 — 나를 포함한 열한 명
    /* 내 출전 수는 **w.apps가 진짜**예요(finalize가 내 줄에 비춰 넣어요).
     * 여기서 또 세면 두 번 셉니다. */
    for (const x of xi) { if (!x.me) x.apps = (x.apps || 0) + 1; }
    const mates = xi.filter((x) => !x.me);
    for (const n of names || []) {
      const who = mine.find((x) => x.name === n) || pickFrom(mates);
      if (who) who.g = (who.g || 0) + 1;
      /* 동료 골에도 **도움이 붙어요.** 안 붙이면 도움 칸이 늘 0인 표가 됩니다. */
      const asst = pickFrom(mates.filter((x) => x !== who));
      if (asst && Math.random() < ASSIST_P) asst.a = (asst.a || 0) + 1;
    }
    /* ⚠️ **내 골에도 누군가 도움을 줘요.** 여기가 없어서 동료 도움 칸이 통째로
     * 비어 있었어요 — 내가 골을 쓸어 담는데 우리 팀 도움이 0이면 혼자 뛰는 팀이에요
     * (제보: "내가 골을 많이 넣는데 우리팀 도움은 하나도 없는 건가"). */
    for (let i = 0; i < (myGoals || 0); i++) {
      const asst = pickFrom(mates);
      if (asst && Math.random() < ASSIST_P) asst.a = (asst.a || 0) + 1;
    }
    /* 🛡️ 우리 나라 수비도 동료에게 쌓여요. **내 줄은 빼요** — 내 수비는 실제
     * 경기에서 나온 값(w.d)이 그대로 들어가니, 여기서 또 굴리면 두 번 세요. */
    creditDef(mates, natStrOf(myNation().name));
    for (const n of names || []) {
      const who = mine.find((x) => x.name === n && !x.me);
      if (who) who._dg = (who._dg || 0) + 1;
    }
    creditRate(mates, res || "D");
  }
  /* 조별리그가 끝나면 **떨어진 나라는 거기서 멈춰요.**
   * 우리 조는 실제 승점으로, 반대 조는 전력 상위 둘이 올라간 걸로 봐요. */
  function cutNations() {
    const w = wc();
    if (!w) return;
    const up = new Set();
    w.myGroup.slice().sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd)).slice(0, 2)
      .forEach((t) => up.add(t.name));
    w.others.slice().sort((a, b) => b.str - a.str).slice(0, 2).forEach((t) => up.add(t.name));
    w.natOut = Object.keys(w.squads || {}).filter((n) => !up.has(n));
  }

  /* 순위표에 올릴 사람 — **순수하게 기록 순**이에요.
   *
   * 한때는 "나라마다 최소 한 명"을 먼저 채웠어요(리그의 leagueFaces가 클럽마다
   * 한 명씩 넣는 걸 그대로 가져왔습니다). 그런데 이건 **개인 기록 순위**예요 —
   * 나라를 고르게 보여주는 표가 아니라 잘한 사람이 위에 오는 표입니다
   * (제보: "개인기록에는 나라마다 한자리는 필요없어. 선수 개인들의 기록이
   * 보여지는 거고, 시뮬레이션 돌고 나서 각 개인들의 기록에 따라 보여지면 돼").
   *
   * 참가국 8개 × 16명, **128명 전부**가 후보예요. 정렬은 골 3점 + 도움 1점.
   * 내가 순위 밖이면 아래에 따로 핀으로 붙여요 — 리그 개인 순위와 같은 방식이에요. */
  function faces(k) {
    const w = wc();
    const sq = ensureSquads();
    if (!sq) return [];
    const all = [];
    for (const nat of Object.keys(sq)) {
      for (const x of sq[nat]) all.push({ p: x, nat, out: (w.natOut || []).includes(nat) });
    }
    const key = FACE_KEY[k] || FACE_KEY.p;
    const ties = FACE_TIE[k] || FACE_TIE.p;
    all.sort((a, b) => {
      const d0 = key(b.p) - key(a.p);
      if (d0) return d0;
      for (const t of ties) { const d = t(b.p) - t(a.p); if (d) return d; }
      return (b.p.str || 0) - (a.p.str || 0);
    });
    return all;
  }
  /* 부문 — 리그 개인 순위와 같은 결이에요. **포지션이 아니라 숫자로** 줄을 세워요.
   * 공격수가 수비를 제일 많이 했으면 🛡️ 1위가 되는 게 맞습니다(리그에서 정한 규칙). */
  const FACE_TABS = [["r", "⭐ 평점", "평균 평점"], ["g", "⚽ 득점", "골"], ["a", "🅰️ 도움", "도움"],
    ["d", "🛡️ 수비", "수비"], ["p", "📈 공격P", "골+도움"]];
  // 평균 평점은 **그 선수가 뛴 경기 수**로 나눠요 (탈락한 나라는 3경기, 결승까지 가면 5경기)
  const faceAvg = (x) => ((x.apps || 0) ? (x.rate || 0) / x.apps : 0);
  const FACE_KEY = {
    p: (x) => (x.g || 0) * 3 + (x.a || 0),
    g: (x) => x.g || 0,
    a: (x) => x.a || 0,
    d: (x) => x.d || 0,
    r: faceAvg,
  };
  const FACE_VAL = { p: (x) => `${x.g || 0}⚽ ${x.a || 0}🅰️`, g: (x) => x.g || 0, a: (x) => x.a || 0,
    d: (x) => x.d || 0, r: (x) => faceAvg(x).toFixed(2) };

  /* ⚖️ **동률일 때 누가 위인가** — 순위표와 수상이 이걸 **같이** 씁니다.
   *
   * 제보(스크린샷): 득점 순위표 1위가 나(3골)인데 🥇 골든부츠는 3골인 다른 선수가
   * 가져갔어요. **표는 `골 → 실력` 순으로 세우고, 수상은 `골 → 도움` 순으로 정하고
   * 있었습니다.** 자가 둘이면 화면과 판정이 다른 말을 해요 — 이 저장소의 단골 병입니다.
   *
   * 규칙은 실제 대회를 따라요: 골든부츠는 동률이면 **도움**이 많은 쪽,
   * 골든월은 **적은 경기로 더 막은** 쪽이 아니라 많이 뛴 쪽(출전),
   * 골든볼은 평점이 같으면 생산량(골·도움)으로 가릅니다.
   * 마지막 자는 실력 — 여기까지 같으면 우열이 없으니 흔들리지 않을 값을 씁니다. */
  const FACE_TIE = {
    g: [(x) => x.a || 0, (x) => x.apps || 0],
    a: [(x) => x.g || 0, (x) => x.apps || 0],
    d: [(x) => x.apps || 0, (x) => x.g || 0],
    r: [(x) => (x.g || 0) * 2 + (x.a || 0), (x) => x.apps || 0],
    p: [(x) => x.g || 0, (x) => x.apps || 0],
  };
  // 동률일 때 무엇으로 갈랐는지 화면에 적어요 — 안 적으면 "왜 쟤가 위지"가 됩니다
  const TIE_NOTE = {
    g: "골이 같으면 🅰️ 도움이 많은 선수가 위예요",
    a: "도움이 같으면 ⚽ 골이 많은 선수가 위예요",
    d: "수비가 같으면 출전 경기가 많은 선수가 위예요",
    r: "평점이 같으면 골·도움이 많은 선수가 위예요",
    p: "같으면 ⚽ 골이 많은 선수가 위예요",
  };
  let faceTab = "r";
  // 화면에 그릴 줄 — 상위 N명, 내가 밖이면 내 줄을 따로 알려줘요
  function faceRows(k) {
    const all = faces(k || faceTab);
    const top = all.slice(0, FACE_N);
    const myAt = all.findIndex((e) => e.p.me);
    return { top, all, myAt, pinned: myAt >= FACE_N ? all[myAt] : null };
  }

  const faceScore = (e) => (e.p.g || 0) * 2 + (e.p.a || 0);

  /* 🥇 대회 개인 순위표 — 리그 개인 순위와 같은 모양이에요 */
  function raceHTML() {
    const w = wc() || {};
    const { top, myAt, pinned } = faceRows();
    if (!top.length) return recordHTML();
    const unit = (FACE_TABS.find(([k]) => k === faceTab) || FACE_TABS[0])[2];
    const val = FACE_VAL[faceTab] || FACE_VAL.p;
    const line = (e, i) => `<tr class="${e.p.me ? "me" : ""}"><td>${i + 1}</td>`
      + `<td>${e.p.name}${e.p.me ? " <b>(나)</b>" : ""}<span class="wc-nat">${e.nat}`
      /* 대회가 끝났으면 🏆 우승국만 표시해요. 진행 중일 때만 탈락을 적습니다 —
       * 끝난 뒤엔 우승국 말고 다 탈락이라 아무 말도 안 하는 것과 같아요. */
      + `${w.champ ? (e.nat === w.champ ? " · 🏆 우승" : "") : (e.out ? " · 탈락" : "")}</span></td>`
      + `<td>${val(e.p)}</td></tr>`;
    /* 내가 순위 밖이면 아래에 붙여요 — 내 줄이 아예 없으면 "나는 몇 등이지"를
     * 알 방법이 없어요(리그 개인 순위·평점 순위표와 같은 방식이에요). */
    const pin = pinned
      ? `<tr class="hof-gap-row"><td colspan="3">⋯</td></tr>${line(pinned, myAt)}`
      : "";
    /* 부문 탭 — 리그 개인 순위와 같은 껍데기(.race-tabs)를 빌려 써요.
     * 한 표에 칸을 다 늘어놓으면 좁은 화면에서 숫자가 뭉갭니다(리그에서 겪었어요). */
    const tabs = `<div class="race-tabs wc-face-tabs">${FACE_TABS.map(([k, label]) =>
      `<button type="button" class="race-tab${k === faceTab ? " on" : ""}" data-fk="${k}">${label}</button>`).join("")}</div>`;
    /* ⚖️ 동률이 실제로 있을 때만 규칙을 적어요 — 늘 적으면 잔소리가 됩니다.
     * 1위와 같은 값을 가진 사람이 또 있으면, 왜 순서가 그런지 보여야 해요. */
    const key = FACE_KEY[faceTab] || FACE_KEY.p;
    const tied = top.length > 1 && key(top[0].p) === key(top[1].p);
    const note = tied ? `<p class="wc-tie-note">⚖️ ${TIE_NOTE[faceTab] || TIE_NOTE.p}</p>` : "";
    return tabs + `<table class="rank-table season-standings"><thead>
        <tr><th>#</th><th>선수 · 국가</th><th>${unit}</th></tr></thead>
      <tbody>${top.map(line).join("")}${pin}</tbody></table>` + note + recordHTML();
  }
  /* 탭을 누르면 그 자리에서 다시 그려요. 화면을 그린 쪽이 이걸 한 번 불러 줍니다. */
  function wireFaceTabs(box, redraw) {
    if (!box) return;
    for (const b of box.querySelectorAll(".wc-face-tabs .race-tab")) {
      b.onclick = (ev) => { ev.preventDefault(); faceTab = b.dataset.fk; redraw(); };
    }
  }

  /* 🏁 **내가 떨어져도 대회는 끝까지 굴러요.**
   *
   * 제보: "조별리그에서 탈락하고 나서 바로 수상 내역 나오는데, 결승까지 시뮬레이션
   * 돌고 나서 나온 수상 내역이 맞나? 결승 우승한 국가도 보여줘야 할 듯."
   *
   * 맞아요. 내가 조별에서 떨어지면 남은 4강·결승이 안 치러져서, 득점왕이 **3경기치**
   * 기록으로 정해지고 있었어요. 4강까지 간 나라의 에이스는 두 경기를 더 뛰는데도요.
   * 우승국도 없어서 "그래서 누가 들었는데?"가 남았습니다.
   *
   * 내가 치른 경기는 **실제 결과를 그대로** 쓰고, 안 치른 경기만 전력으로 굴려요.
   * 대진은 조별 성적으로 짭니다: 우리 조 1위 × 반대 조 2위 / 우리 조 2위 × 반대 조 1위. */
  const KO_EDGE = 0.03;      // 전력 1 차이가 단판 승률에 실리는 정도
  function playOutRest() {
    const w = wc();
    if (!w) return null;
    const meName = myNation().name;
    const A = w.myGroup.slice().sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd)).slice(0, 2);
    const B = w.others.slice().sort((a, b) => b.str - a.str).slice(0, 2);
    if (A.length < 2 || B.length < 2) return null;
    const pairs = [[A[0], B[1]], [A[1], B[0]]];
    const alive = new Set([].concat(...pairs).map((t) => t.name));
    w.natOut = Object.keys(w.squads || {}).filter((n) => !alive.has(n));

    const winBy = (x, y) => (Math.random() < clamp(0.5 + (x.str - y.str) * KO_EDGE, 0.1, 0.9) ? x : y);
    const mySemi = (w.path || []).find((p) => p.stage === "semi");
    const myFinal = (w.path || []).find((p) => p.stage === "final");
    /* 내가 치른 토너먼트 경기 수만큼은 이미 굴렸어요 — 남은 만큼만 더 굴립니다 */
    let left = 2 - (mySemi ? 1 : 0) - (myFinal ? 1 : 0);

    const semiWin = pairs.map(([x, y]) => {
      const meIn = x.name === meName || y.name === meName;
      if (meIn && mySemi) return mySemi.win ? (x.name === meName ? x : y) : (x.name === meName ? y : x);
      return winBy(x, y);
    });
    if (left > 0) { advanceOthers(); left -= 1; }        // 4강 라운드
    w.natOut = Object.keys(w.squads || {})
      .filter((n) => !semiWin.some((t) => t.name === n));

    const [f1, f2] = semiWin;
    let champ;
    if ((f1.name === meName || f2.name === meName) && myFinal) {
      champ = myFinal.win ? (f1.name === meName ? f1 : f2) : (f1.name === meName ? f2 : f1);
    } else champ = winBy(f1, f2);
    if (left > 0) { advanceOthers(); left -= 1; }        // 결승 라운드
    /* ⚠️ 여기서 natOut을 "우승국 빼고 전부"로 두면 안 돼요 — 대회가 끝난 뒤
     * 순위표에 **모두가 탈락**으로 보입니다. 그건 정보가 아니에요.
     * 대신 우승국만 따로 기억해서 🏆를 붙여요. */
    w.champ = champ.name;
    return { champ: champ.name, runner: (champ === f1 ? f2 : f1).name };
  }

  /* 🏆 대회 수상 — 끝나고 한 번만 정해요.
   *   🥇 골든부츠  득점 1위
   *   🏅 골든볼    평균 평점 1위 — 모두가 같은 산식으로 평점을 받아요
   *   🛡️ 골든월    수비 1위 — 수비수에게도 들 것이 하나는 있어야 해요
   * 리그 수상(발롱도르·리그MVP)과 **다른 축**이에요 — 4년에 한 번뿐인 무대의 상입니다. */
  function decideAwards() {
    const w = wc();
    const rows = faces();
    if (!w || !rows.length) return [];
    /* ⚠️ **순위표의 1위를 그대로 데려와요.** 여기서 다시 줄을 세우면 자가 둘이 되고,
     * 화면의 1위와 수상자가 갈립니다 — 실제로 그렇게 갈렸어요(제보). */
    const boot = faces("g")[0];
    /* 🏅 골든볼은 **평점 1위**가 가져가요.
     * 실제 월드컵의 골든볼은 기자단 투표라 숫자로 정해지지 않지만, 이 게임에는
     * ⭐ 평점이라는 자가 이미 있고 **모두가 같은 방식으로** 받아요.
     * 예전에는 기여 + "실력에서 뽑은 가짜 평점"이었어요 — 그건 지어낸 값이었습니다. */
    const ball = faces("r")[0];
    const out = [];
    if (boot) out.push({ id: "boot", name: "🥇 골든부츠", who: boot.p.name, nat: boot.nat, me: !!boot.p.me, val: `${boot.p.g || 0}골` });
    if (ball) out.push({ id: "ball", name: "🏅 골든볼", who: ball.p.name, nat: ball.nat, me: !!ball.p.me, val: `평점 ${faceAvg(ball.p).toFixed(2)}` });
    /* 🛡️ 수비수에게도 들 것이 하나는 있어야 해요. 이게 없으면 대회 내내 1위를 해도
     * 아무 일도 안 일어납니다 — 리그에는 🛡️ 리그 최고 수비수가 이미 있어요. */
    const wall = faces("d")[0];
    if (wall && (wall.p.d || 0) > 0) out.push({ id: "wall", name: "🛡️ 골든월", who: wall.p.name, nat: wall.nat, me: !!wall.p.me, val: `수비 ${wall.p.d || 0}회` });
    return out;
  }

  function startTournament(onDone) {
    const { myGroup, others } = rollGroups();
    S.wc = {
      y: S.proYear, stage: "group", gIdx: 0, ready: false,
      myGroup, others, opp: null, mates: [], started: null, natOut: [], path: [],
      g: 0, a: 0, d: 0, apps: 0, ratingSum: 0,
      done: onDone ? undefined : undefined,
    };
    ensureSquads();            // 참가국 명단을 꾸려요 (우리 나라엔 내가 한 줄로)
    S.camp = CAMP_FIRST;
    S.condition = 80;                       // 소집 기간에 몸을 만들어요 (준비 턴 플래그 대신)
    CTX.proLog(`🌏 ${myNation().name} 대표팀에 합류했어요! 월드컵이 시작돼요`);
    save();
    themeSync();
    callSheet(onDone);
  }

  // 소집 카드 — 조 편성과 대회 안내
  function callSheet(onDone) {
    const w = wc();
    const nat = myNation();
    $("stage-title").textContent = `🌏 ${S.proYear}시즌 월드컵 — ${nat.name}`;
    $("stage-round").textContent = `대표팀 소집 · 조별리그 ${GROUP_GAMES}경기`;
    $("stage-card").innerHTML = `
      <div class="wc-card">
        <div class="draft-emoji">🌏</div>
        <div class="draft-title">대표팀에 합류했어요</div>
        ${S.wcLucky === S.proYear
          ? `<div class="wc-lucky">🎲 <b>깜짝 발탁</b> — 명단 발표 직전에 이름이 올랐어요</div>` : ""}
        <div class="tour-line">소집 기간이라 몸을 만들었어요 — <b>컨디션 80 회복</b><br/>
          대표팀 훈련장에서는 <b>훈련이 잘 돼요</b></div>
        ${groupTableHTML()}
      </div>`;
    themeSync();
    wire(`🏋️ 대표팀 훈련 (${S.camp}회)`, () => { CTX.renderPrep(); show("screen-pro"); });
    show("screen-stage");
  }

  function groupTableHTML() {
    const w = wc();
    if (!w) return "";
    const rows = w.myGroup.slice().sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd));
    return `<table class="rank-table season-standings wc-group"><thead>
        <tr><th>#</th><th>국가</th><th>승점</th><th>득실</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td>`
        + `<td>${r.name}</td><td>${r.pts}</td><td>${r.gd > 0 ? "+" : ""}${r.gd}</td></tr>`).join("")}
      </tbody></table>`;
  }

  /* 🌏 대회 중에는 준비 화면의 세 자리가 **월드컵을 봐야 해요.**
   * 리그 순위표·리그 개인 순위·클럽 선발 확률이 그대로 떠 있으면 화면이 딴 데를
   * 보고 있는 겁니다 — "표시와 판정이 서로 다른 것을 본다"의 사촌이에요. */
  /* 🏆 토너먼트 대진표 — 조별리그가 끝나면 순위표 자리가 **여기로 바뀌어요.**
   * 이미 끝난 조 순위를 계속 보여주면 화면이 지난 일을 보고 있는 거예요.
   *
   * 반대쪽 4강(우리 조 2위 vs 반대 조 1위)은 우리가 안 치르는 경기라 결과를
   * 굴리지 않아요 — 결승 상대는 어차피 nextOpponent()가 정합니다. 대진의 모양만
   * 보여줘서 "내가 어디쯤 와 있나"를 알 수 있게 해요. */
  function bracketHTML() {
    const w = wc();
    if (!w) return "";
    const me = myNation().name;
    /* ⚠️ 반대쪽 4강에 서는 우리 조 대표는 **내가 아닌 쪽**이에요.
     * 그냥 "조 2위"를 쓰면 내가 2위로 올라간 대회에서 **두 줄 다 우리 나라**가
     * 됩니다(제보 스크린샷: 4강 두 경기가 모두 🇰🇷 대한민국). */
    const adv = w.myGroup.slice().sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd)).slice(0, 2);
    const second = adv.find((t) => t.name !== me) || adv[1];
    const pool = w.others.slice().sort((a, b) => b.str - a.str);
    const semiOpp = (pool[1] || pool[0] || {}).name || "-";
    const finOpp = (pool[0] || {}).name || "-";
    const done = (st) => (w.path || []).find((p) => p.stage === st);
    const row = (label, a, b, state) => `<tr class="${state === "now" ? "me" : ""}">`
      + `<td>${label}</td><td>${a}</td><td class="wc-vs">vs</td><td>${b}</td>`
      + `<td>${state === "now" ? "지금" : state === "win" ? "승" : state === "lose" ? "패" : "—"}</td></tr>`;
    // 중립 구장이라 홈/원정이 없어요 — 헤더도 그렇게 적어요
    const semiMine = done("semi");
    const rows = [
      row("4강", me, semiOpp, semiMine ? (semiMine.win ? "win" : "lose") : (w.stage === "semi" ? "now" : "")),
      row("4강", (second || {}).name || "-", finOpp, ""),
      row("결승", w.stage === "final" ? me : "4강 승자", w.stage === "final" ? finOpp : "4강 승자",
        w.stage === "final" ? "now" : ""),
    ];
    return `<table class="rank-table season-standings wc-bracket"><thead>
        <tr><th>라운드</th><th>대진</th><th></th><th></th><th></th></tr></thead>
      <tbody>${rows.join("")}</tbody></table>`;
  }
  // 순위표 자리에 들어갈 것 — 조별리그면 조 순위, 토너먼트면 대진표
  const tableHTML2 = () => (wc() && wc().stage !== "group" ? bracketHTML() : groupTableHTML());

  function groupSumText() {
    const w = wc();
    if (!w) return "";
    const me = w.myGroup.find((x) => x.me);
    const rank = w.myGroup.slice().sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd))
      .findIndex((x) => x.me) + 1;
    const stage = w.stage === "group"
      ? `조별리그 ${Math.min(w.gIdx + 1, GROUP_GAMES)}/${GROUP_GAMES}차전`
      : w.stage === "semi" ? "4강" : "결승";
    return `🌏 ${myNation().name} — ${stage}`
      + (w.stage === "group" ? ` · 조 ${rank}위 · 승점 ${me.pts}` : "");
  }

  /* 대회 개인 기록 — 리그 개인 순위 자리에 들어가요.
   * 리그 득점왕 표를 그대로 두면 국대 골이 거기 섞인 것처럼 읽혀요(실제로는
   * 안 섞이지만, 화면이 그렇게 보이면 그게 곧 버그 제보가 됩니다). */
  function recordHTML() {
    const w = wc();
    if (!w) return "";
    const avg = w.apps ? (w.ratingSum / w.apps).toFixed(1) : "-";
    /* 🏁 **대회가 끝났으면 다음 상대가 없어요.**
     * 우승 화면 맨 아래에 "다음 상대 — 🇫🇷 프랑스"가 적혀 있었어요(제보) —
     * 트로피를 든 화면에서 다음 경기를 안내하고 있었습니다.
     * w.final은 결과 카드가 만들어졌다는 뜻이고, w.champ는 우승국이 정해졌다는
     * 뜻이에요. 둘 중 하나라도 있으면 대회는 끝난 거예요. */
    const over = !!(w.final || w.champ);
    const next = over ? null
      : w.stage === "group" && w.gIdx < GROUP_GAMES ? nextOpponent().name
      : w.stage !== "group" ? nextOpponent().name : null;
    return `<div class="wc-rec">
      <div class="wc-rec-row"><b>${w.apps}</b>경기 · <b>⚽ ${w.g}</b>골 · <b>🅰️ ${w.a}</b>도움`
      + ` · <b>🛡️ ${w.d}</b>수비 · 평균 평점 <b>${avg}</b>`
      + `${w.benched ? ` · 🪑 ${w.benched}경기 결장` : ""}</div>
      ${next ? `<div class="wc-rec-next">다음 상대 — ${next}</div>` : ""}
      <div class="wc-rec-note">이 기록은 <b>리그와 따로</b> 쌓여요 — 리그 득점왕 경쟁에는 안 섞입니다.</div>
    </div>`;
  }

  // 👥 자리의 버튼 — 대회 중에는 우리 조를 보여줘요
  function openGroup() {
    if (document.querySelector(".wc-group-overlay")) return;
    const w = wc();
    if (!w) return;
    const wrap = document.createElement("div");
    wrap.className = "av-overlay wc-group-overlay";
    wrap.innerHTML = `<div class="av-modal squad-modal">
      <div class="av-title">🌏 ${S.proYear}시즌 월드컵</div>
      <div class="sq-note">${groupSumText()}</div>
      ${tableHTML2()}
      ${recordHTML()}
      <div class="av-actions"><button class="btn btn-primary" id="btn-wcg-close">닫기</button></div>
    </div>`;
    wrap.addEventListener("click", (ev) => { if (ev.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
    document.getElementById("btn-wcg-close").onclick = () => wrap.remove();
  }

  const wire = (label, fn) => {
    const btn = $("btn-stage-next");
    if (!btn) return;
    btn.hidden = false; btn.disabled = false;
    btn.textContent = label;
    btn.onclick = fn;
  };

  // 준비 화면의 "경기 시작" 버튼 — 컵의 cupReady 버튼과 같은 자리·같은 모양이에요
  function startButton(onDone) {
    const w = wc();
    const btn = document.createElement("button");
    btn.className = "action-btn rest go-game wc-go";
    /* 🎖️ **확률을 미리 적어요.** 감춘 굴림은 버그로 읽히고, 적어 둔 굴림은
     * 이야기가 됩니다 (🎲 깜짝 발탁·🛌 보호 로테이션이 같은 이유로 적어요). */
    const p = xiNow();
    const sub = w.stage === "group" ? "조별리그 — 승점 3점" : "단판 — 무승부면 승부차기";
    const tag = p < 1 ? ` · 선발 확률 ${Math.round(p * 100)}%`
      : (w.benchRun || 0) >= BENCH_RUN_MAX ? ` · 🪑 ${w.benchRun}경기 연속 결장 — 이번엔 선발이에요`
      : " · 🏅 선발 확정";
    btn.innerHTML = `<span class="a-emoji">🌏</span>${stageLabel()}`
      + `<span class="a-sub">${sub}${tag}</span>`;
    btn.onclick = () => (Math.random() < p ? playMatch(onDone) : benchMatch(onDone));
    return btn;
  }

  const stageLabel = () => {
    const w = wc();
    if (!w) return "";
    return w.stage === "group" ? `조별리그 ${w.gIdx + 1}차전`
      : w.stage === "semi" ? "4강" : "결승";
  };

  // ---------- 경기 ----------

  function nextOpponent() {
    const w = wc();
    if (w.stage === "group") {
      const rivals = w.myGroup.filter((x) => !x.me);
      return rivals[w.gIdx % rivals.length];
    }
    // 토너먼트 — 반대쪽 조에서 전력 순으로 올라와요
    const pool = w.others.slice().sort((a, b) => b.str - a.str);
    return w.stage === "semi" ? pool[1] || pool[0] : pool[0];
  }

  function playMatch(onDone) {
    const w = wc();
    const nat = myNation();
    const opp = nextOpponent();
    w.opp = opp.name;
    w.ready = false;
    w.benchRun = 0;              // 🪑 연속 결장은 여기서 끊겨요
    save();

    $("stage-title").textContent = `🌏 ${S.proYear}시즌 월드컵 — ${nat.name}`;
    $("stage-round").textContent = `${stageLabel()} · vs ${opp.name}`;
    themeSync();
    show("screen-stage");

    /* ⚠️ 산식은 전부 기존 것을 그대로 써요. 다른 점은 **클럽 대신 국가 전력**을
     * 넘긴다는 것뿐입니다(ratingOf는 리그 벌점을 0으로 — 난이도는 국가 전력이 실어요). */
    const rating = CTX.ratingOf(WingerProspect.nowStats(S), S.pos, S.condition, S.fandom, 0);
    const c = matchContribution(rating);
    const us = teamStr();
    const mates = teammateGoals(rating, opp.str, us);
    const oppGoals = deriveOppGoals(rating, WingerProspect.nowStats(S).defense, opp.str, c.g + c.a + mates, us);
    MatchSim.run({
      home: nat.name, away: opp.name, myName: S.name,
      goals: c.g, assists: c.a, defense: c.def, oppGoals, rating, mateCount: mates,
      mates: matesOf(),
      finalize: (info) => finalize(info, onDone),
    });
  }

  /* 🪑 **벤치인 경기** — 대표팀 경기는 나 없이도 열려요.
   *
   * 지키는 것 셋:
   *   ① 내 기록(w.g·a·d·apps)에 **아무것도 안 쌓여요.** 안 뛴 경기니까요.
   *   ② 그래도 대회는 굴러가요 — 조 순위표·동료 기록·다른 나라가 전부 한 라운드
   *      나아갑니다. 여기가 멈추면 **내가 벤치인 주만 대회가 멈춰요.**
   *   ③ 다음 단계는 `wcAfterMatch()` 하나가 정해요 (이 파일의 계약 ①).
   *
   * **성장 보상은 없어요.** 클럽 벤치에는 훈련장 성장이 붙지만, 그건 38라운드
   * 리그의 장치예요. 5경기짜리 대회에서 또 주면 벤치가 이득이 됩니다. */
  function benchMatch(onDone) {
    const w = wc();
    const nat = myNation();
    const opp = nextOpponent();
    w.opp = opp.name;
    w.ready = false;

    /* 산식은 뛴 경기와 **같은 것**을 써요 — 내 종합(에이스 보정)과 평점만 빼고요.
     * 평점 자리에 6.5(중간값)를 넣는 건 리그의 벤치 주와 같은 방식이에요. */
    const us = teamStr(true);
    const teamGoals = teammateGoals(6.5, opp.str, us);
    const oppGoals = deriveOppGoals(6.5, WingerProspect.nowStats(S).defense, opp.str, teamGoals, us);
    let res = teamGoals > oppGoals ? "W" : teamGoals < oppGoals ? "L" : "D";
    /* 토너먼트에 무승부는 없어요. 그런데 **승부차기는 내가 못 차요** — 벤치니까요.
     * 그래서 전력으로 굴립니다. 지어낸 게 아니라 "내가 없는 팀의 승부차기"예요. */
    let pkText = "";
    if (w.stage !== "group" && res === "D") {
      const win = Math.random() < us / (us + opp.str);
      res = win ? "W" : "L";
      pkText = `승부차기 끝에 ${win ? "이겼어요" : "졌어요"} — 벤치에서 지켜봤어요`;
    }

    const stepped = benchCredit(teamGoals, res);   // 내 자리에 들어간 사람이 돌아와요
    w.credited = [];
    creditNat(w.opp, oppGoals);
    if (w.stage === "group") rollGroupRivals({ res, teamGoals, oppGoals });
    advanceOthers(new Set([w.opp].concat(w.credited || [])));
    w.benched = (w.benched || 0) + 1;
    w.benchRun = (w.benchRun || 0) + 1;
    if (w.stage === "group") {
      const me = w.myGroup.find((x) => x.me);
      me.pts += res === "W" ? 3 : res === "D" ? 1 : 0;
      me.gd += teamGoals - oppGoals;
    }
    CTX.proLog(`🪑 월드컵 ${stageLabel()} vs ${w.opp} 결장 — ${teamGoals}:${oppGoals} (나 없이)`);
    save();

    $("stage-title").textContent = `🌏 ${S.proYear}시즌 월드컵 — ${nat.name}`;
    $("stage-round").textContent = `${stageLabel()} · vs ${opp.name}`;
    themeSync();
    /* ⚠️ **경기를 치렀다는 표시를 여기서도 내려요.** 뛴 주에는 MatchSim 갈래가
     * 같은 일을 하는데, 벤치 갈래만 빠뜨리면 다음 준비 화면이 "훈련 N회"라 적어
     * 놓고 버튼을 전부 잠급니다 — v2.48.0에서 실제로 났던 사고예요. */
    S.pendingShow = false;

    /* ⚠️ `#stage-result`는 **MatchSim이 만드는** 요소라 여기엔 아직 없어요.
     * 없는 걸 만지면 함수가 그 자리에서 죽고, 화면은 버튼을 눌러도 아무 반응이
     * 없는 것처럼 보입니다(리그 벤치에서 났던 사고). 카드 안에 다 그려요. */
    const step = wcAfterMatch(res, onDone);
    $("stage-card").innerHTML = `
      <div class="bench-card wc-bench">
        <div class="draft-emoji">🪑</div>
        <div class="draft-title">이번 경기는 벤치예요</div>
        <div class="tour-line">${benchReason(stepped)}</div>
        <div class="ms-final ${res === "W" ? "win" : res === "L" ? "lose" : ""}">
          ${nat.name} ${teamGoals} : ${oppGoals} ${opp.name} · ${RES_LABEL[res]} (나 없이)</div>
        ${pkText ? `<div class="tour-line">${pkText}</div>` : ""}
        ${tableHTML2()}
        ${step.html}
      </div>`;
    const rbox = $("stage-result");
    if (rbox) rbox.innerHTML = "";
    wire(step.label, step.fn);
    show("screen-stage");
  }

  /* 🪑 우리 나라의 그 경기 — **나를 빼고** 굴려요.
   *
   * ⚠️ 명단에서 나를 뺀 **뒤에** 선발 11을 뽑아요. 뽑고 나서 거르면 열 명이 뛴
   * 경기가 됩니다. 이렇게 하면 "내 자리에 누가 들어갔는지"도 자연히 나와요 —
   * 벤치 카드에 그 이름을 적습니다. 이유가 안 보이는 결장은 버그로 읽혀요. */
  function benchCredit(goals, res) {
    const withMe = new Set(natXI(true).map((x) => x.name));
    const xi = natXI(false);
    for (const x of xi) x.apps = (x.apps || 0) + 1;
    for (let i = 0; i < goals; i++) {
      const who = pickFrom(xi);
      if (who) { who.g = (who.g || 0) + 1; who._dg = (who._dg || 0) + 1; }
      const asst = pickFrom(xi.filter((x) => x !== who));
      if (asst && Math.random() < ASSIST_P) { asst.a = (asst.a || 0) + 1; asst._da = (asst._da || 0) + 1; }
    }
    creditDef(xi, natStrOf(myNation().name));
    creditRate(xi, res);
    return xi.find((x) => !withMe.has(x.name)) || null;
  }

  /* 왜 앉았는지 한 줄 — 클래스가 이유예요. 감독이 그 말을 합니다. */
  function benchReason(stepped) {
    const ovr = Math.round(overall());
    const hi = starterBar();
    /* 받침에 따라 "이/가"가 갈려요 — 이름을 붙이는 문장이라 여기서만 봐요 */
    const ga = (name) => {
      const c = (name || "").charCodeAt((name || "").length - 1);
      return (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0) ? "이" : "가";
    };
    const who = stepped
      ? `<b>${stepped.name}</b>(실력 ${Math.round(stepped.str)})${ga(stepped.name)} 내 자리에 섰어요` : "";
    return `🗣️ "오늘은 벤치에서 시작하자." — 종합 <b>${ovr}</b> · 🏅 주전 확정은 <b>${hi}</b>부터예요`
      + (who ? `<br/>${who}` : "");
  }

  /* MatchSim의 계약대로 { resultHTML, nextLabel, nextFn }을 돌려줘요.
   * 화면을 직접 그리지 않아요 — MatchSim이 #stage-result에 넣습니다. */
  function finalize(info, onDone) {
    const w = wc();
    /* 🌏 기록은 S.wc에만 쌓아요 — S.activity(리그 시즌 기록)에 **절대 안 넣습니다.**
     * 넣으면 리그 개인 순위와 골든부츠 판정이 국대 골을 세게 돼요. */
    w.g += info.myGoals; w.a += info.assists; w.d += info.defense;
    w.apps += 1;
    w.ratingSum += clamp(CTX.matchRating(info, S.pos, 0) / 10, 1, 10);
    /* 🥇 내 줄은 **우리 나라 명단 안의 나**예요 — 따로 만들면 표가 둘로 갈려요 */
    const meRow = mySquad().find((x) => x.me);
    if (meRow) { meRow.g = w.g; meRow.a = w.a; meRow.d = w.d; meRow.apps = w.apps; meRow.rate = w.ratingSum; meRow.str = overall(); }
    creditMates(info.mateGoals, info.myGoals, info.res);   // 동료 골·도움·평점이 쌓여요
    /* ⚠️ **상대 팀은 이 경기에서 실제로 넣은 만큼만** 쌓여요. 따로 굴리면
     * "4:2로 이겼는데 상대 선수 골 합이 3"이 됩니다(제보). */
    w.credited = [];
    creditNat(w.opp, info.oppGoals);
    if (w.stage === "group") rollGroupRivals(info);   // 조의 다른 경기도 같은 라운드를 치러요
    advanceOthers(new Set([w.opp].concat(w.credited || [])));
    S.money = (S.money || 0) + PRIZE.game;

    const head = `<div class="ms-final ${info.res === "W" ? "win" : info.res === "L" ? "lose" : ""}">`
      + `${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · 월드컵 ${stageLabel()}</div>`
      + `<div class="tour-vs"><span>${S.name}</span> · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense}</div>`;

    if (w.stage === "group") {
      const me = w.myGroup.find((x) => x.me);
      me.pts += info.res === "W" ? 3 : info.res === "D" ? 1 : 0;
      me.gd += info.teamGoals - info.oppGoals;
      CTX.proLog(`🌏 월드컵 ${stageLabel()} vs ${w.opp} — ${info.teamGoals}:${info.oppGoals}`);
      const step = wcAfterMatch(info.res, onDone);
      return { resultHTML: head + tableHTML2() + step.html, nextLabel: step.label, nextFn: step.fn };
    }

    /* 토너먼트에 무승부는 없어요 — 승부차기는 컵의 것을 그대로 재사용합니다.
     * (같은 판정을 두 벌 두면 한쪽만 손보는 사고가 나요) */
    if (info.res === "D" && window.SoccerCup && SoccerCup.shootout) {
      return {
        resultHTML: head + `<div class="tour-line">비겼어요 — 승부차기로 갑니다</div><div id="pk-box"></div>`,
        nextLabel: "⚽ 승부차기 시작",
        nextFn: () => {
          const btn = $("btn-stage-next");
          if (btn) btn.hidden = true;
          SoccerCup.shootout(document.getElementById("pk-box"), {
            myName: myNation().name, oppName: w.opp,
            shoot: WingerProspect.nowStats(S).shoot, oppStr: nextOpponent().str,
            mates: matesOf(), myStr: teamStr(),
            onDone: (win) => {
              /* ⚠️ 승부차기 판을 **치워요.** 안 치우면 마지막 버튼이 그대로 남고,
               * 그걸 한 번 더 누르면 onDone이 또 불려 대회가 한 단계 더 넘어갑니다
               * (4강을 이겼는데 결승을 건너뛰고 끝나는 식). 실제로 검사 드라이버가
               * 그 버튼을 계속 눌러 자리를 맴돌면서 드러났어요. */
              const pk = document.getElementById("pk-box");
              if (pk) pk.innerHTML = "";
              if (btn) btn.hidden = false;
              CTX.proLog(`🌏 월드컵 ${stageLabel()} 승부차기 — ${win ? "승리" : "패배"}`);
              const step = wcAfterMatch(win ? "W" : "L", onDone);
              const box = document.getElementById("stage-result");
              if (box && step.html) box.insertAdjacentHTML("beforeend", step.html);
              wire(step.label, step.fn);
            },
          });
        },
      };
    }
    CTX.proLog(`🌏 월드컵 ${stageLabel()} vs ${w.opp} — ${info.teamGoals}:${info.oppGoals}`);
    const step = wcAfterMatch(info.res, onDone);
    return { resultHTML: head + step.html, nextLabel: step.label, nextFn: step.fn };
  }

  // 조의 다른 두 팀도 그 라운드를 치러요 — 순위표가 나만 보고 멈추면 안 돼요
  function rollGroupRivals(info) {
    const w = wc();
    const rivals = w.myGroup.filter((x) => !x.me);
    const played = rivals.find((x) => x.name === w.opp);
    if (played) {
      played.pts += info.res === "L" ? 3 : info.res === "D" ? 1 : 0;
      played.gd += info.oppGoals - info.teamGoals;
    }
    const rest = rivals.filter((x) => x !== played);
    if (rest.length >= 2) {
      const [a, b] = rest;
      const edge = (a.str - b.str) / 100;
      const ga = poissonish(Math.max(0, 1.2 + edge * 2));
      const gb = poissonish(Math.max(0, 1.2 - edge * 2));
      a.pts += ga > gb ? 3 : ga === gb ? 1 : 0;
      b.pts += gb > ga ? 3 : ga === gb ? 1 : 0;
      a.gd += ga - gb; b.gd += gb - ga;
      /* 그 경기의 골도 **사람에게** 붙여요 — 조 순위표의 득실과 개인 순위의
       * 합이 어긋나면 두 표가 서로 다른 말을 하게 됩니다. */
      creditNat(a.name, ga); creditNat(b.name, gb);
      w.credited = [a.name, b.name];
    }
  }

  // ---------- ⚠️ 단일 진행 함수 ----------

  /* **경기를 소비하는 모든 갈래가 여기 하나를 지나요.**
   * 승·패·무승부차기·조별 탈락·토너먼트 탈락·우승이 각자 다음 단계를 정하면
   * 반드시 하나가 샙니다. 다음 훈련 턴을 여는 것도, 대회를 끝내는 것도 여기서만 해요.
   * 돌려주는 것: { html, label, fn } — 화면은 부르는 쪽이 그려요. */
  function wcAfterMatch(res, onDone) {
    const w = wc();
    if (!w) return { html: "", label: "🏁 시즌 결산", fn: onDone };

    if (w.stage === "group") {
      w.gIdx += 1;
      if (w.gIdx < GROUP_GAMES) return toCamp(onDone, `조별리그 ${w.gIdx + 1}차전`);
      /* 조별리그 종료 — 상위 2팀이 올라가요 */
      const rank = w.myGroup.slice().sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd))
        .findIndex((x) => x.me) + 1;
      cutNations();                 // 떨어진 나라는 거기서 멈춰요
      if (rank > 2) return endTournament("group", onDone, `조 ${rank}위로 조별리그에서 멈췄어요`);
      w.stage = "semi";
      return toCamp(onDone, "4강");
    }
    if (w.stage === "semi") {
      // 대진표가 지난 경기를 기억해야 "내가 어디쯤 와 있나"가 보여요
      w.path = (w.path || []).concat([{ stage: "semi", opp: w.opp, win: res === "W" }]);
      void 0;
      if (res !== "W") return endTournament("semi", onDone, "4강에서 멈췄어요");
      w.stage = "final";
      return toCamp(onDone, "결승");
    }
    w.path = (w.path || []).concat([{ stage: "final", opp: w.opp, win: res === "W" }]);
    return endTournament(res === "W" ? "champion" : "final", onDone,
      res === "W" ? "월드컵을 들어올렸어요!!" : "결승에서 아쉽게 졌어요");
  }

  // 다음 경기 전 훈련 턴을 열어요
  function toCamp(onDone, nextLabel) {
    S.camp = CAMP_BETWEEN;
    wc().ready = false;
    save();
    themeSync();
    return {
      html: `<div class="tour-line">🏋️ ${nextLabel} 전까지 대표팀 훈련 ${S.camp}회</div>`,
      label: `🏋️ ${nextLabel} 준비 (훈련 ${S.camp}회)`,
      fn: () => { CTX.renderPrep(); show("screen-pro"); },
    };
  }

  // ---------- ⚠️ 단일 종료 함수 ----------

  /* **모든 종료 경로가 여기 하나를 지나 S.wc = null이 돼요.**
   * ready도 테마도 훈련 버프도 전부 S.wc에 매달려 있어서 여기 한 줄로 같이
   * 사라집니다 — 해제를 잊을 대상이 없어요. */
  function endTournament(result, onDone, msg) {
    const w = wc();
    const nat = myNation();
    const prize = PRIZE[result] || 0;
    const rounds = result === "group" ? 0 : result === "semi" ? 2 : 3;
    const fame = FAME.round * rounds + (result === "champion" ? FAME.champion : 0);

    S.money = (S.money || 0) + prize;
    S.fandom = (S.fandom || 0) + fame;
    S.career = S.career || {};
    S.career.wcApps = (S.career.wcApps || 0) + 1;
    if (result === "champion") {
      S.career.wcWin = (S.career.wcWin || 0) + 1;
      /* 🏆 우승국은 나예요. 여기서 안 적으면 playOutRest가 안 도는 우승 경로에서만
       * w.champ가 비어서, 순위표는 "🏆 우승" 표시를 못 하고 기록 줄은 다음 상대를
       * 안내합니다(제보: 우승 화면인데 "다음 상대 — 🇫🇷 프랑스"). */
      w.champ = nat.name;
      /* 트로피는 남기되 **커리어 점수 가중치는 0**이에요 — 점수는 W.wc 한 곳으로
       * 몰아서 손잡이를 하나로 유지합니다(양쪽에 실리면 조절할 곳이 둘이 돼요). */
      CTX.addTrophy(`${S.proYear}시즌 월드컵 우승`, null, 0);
    }
    /* ⚠️ **수상보다 먼저 대회를 끝까지 굴려요.** 내가 떨어져도 4강·결승은 열리고,
     * 거기까지 간 나라의 에이스는 두 경기를 더 뜁니다. 안 굴리면 득점왕이
     * 3경기치 기록으로 정해져요. */
    const fin = playOutRest();
    /* 🏆 대회 수상 — **끝나고 한 번만** 정해요. 조건을 나중에 다시 계산하면
     * 화면에 뜬 상과 기록이 어긋납니다(AWARD_BUFF와 같은 이유). */
    const awards = decideAwards();
    const mine = awards.filter((a) => a.me);
    let awFame = 0;
    for (const a of mine) {
      awFame += AWARD_FAME[a.id] || 0;
      const ck = a.id === "boot" ? "wcBoot" : a.id === "wall" ? "wcWall" : "wcBall";
      S.career[ck] = (S.career[ck] || 0) + 1;
      CTX.proLog(`🏆 월드컵 ${a.name} 수상! (${a.val})`);
    }
    S.fandom = (S.fandom || 0) + awFame;
    S.wcHist = hist().concat([{
      y: S.proYear, result, g: w.g, a: w.a, apps: w.apps, benched: w.benched || 0,
      awards: mine.map((a) => a.id),
      champ: fin ? fin.champ : (result === "champion" ? myNation().name : null),
    }]);
    CTX.proLog(`🌏 월드컵 ${LABEL[result]} — ${msg} (상금 +${prize}만 · 명성 +${fame + awFame})`);

    const html = `<div class="wc-card ${result === "champion" ? "champ" : ""}">
        <div class="draft-emoji">${EMOJI[result]}</div>
        <div class="draft-title">${LABEL[result]}</div>
        <div class="tour-line">${nat.name} · ${msg}</div>
        ${fin && result !== "champion"
          ? `<div class="wc-champ">🏆 이번 대회 우승 — <b>${fin.champ}</b> (준우승 ${fin.runner})</div>` : ""}
        <div class="tour-pts">⚽ ${w.g}골 🅰️ ${w.a}도움 · ${w.apps}경기
          ${prize ? ` · 💰 상금 +${prize}만` : ""} · ⭐ 명성 +${fame + awFame}</div>
        ${awards.length ? `<div class="wc-awards">${awards.map((a) =>
          `<div class="wc-award${a.me ? " me" : ""}">${a.name} — <b>${a.who}</b>`
          + `<span class="wc-nat">${a.nat}</span> ${a.val}${a.me ? " 🎉" : ""}</div>`).join("")}</div>` : ""}
        <div id="wc-final-race">${raceHTML()}</div>
      </div>`;
    if (result === "champion" && CTX.queueFx) {
      CTX.queueFx([["celebrate", "champion", `🏆 ${S.proYear}시즌 월드컵 우승!`, ".wc-card"]]);
    }

    /* ⚠️ 결과 카드를 경기 결과 **아래에 바로 붙이지 않아요.**
     * 4강에서 지는 순간 중계·스코어·탈락 카드·수상·순위표가 한 화면에 쏟아져서
     * 뭘 봐야 할지 알 수 없었어요(제보). 한 번 눌러서 결과 화면으로 갑니다.
     *
     * 그때까지 S.wc는 **살려 둬요** — 테마가 대회 결과 화면까지 이어지고,
     * 앱을 닫았다 열어도 그 화면으로 돌아옵니다. 지우는 자리는 여전히 하나예요. */
    w.final = { result, msg, html };
    save();
    return { html: "", label: "🌏 월드컵 결과 보기", fn: () => showFinal(onDone) };
  }

  // 대회 결과 화면 — 성적·수상·최종 개인 순위를 한 자리에서 봐요
  function showFinal(onDone) {
    const w = wc();
    if (!w || !w.final) { onDone(); return; }
    $("stage-title").textContent = `🌏 ${S.proYear}시즌 월드컵 — ${myNation().name}`;
    $("stage-round").textContent = "대회 종료";
    $("stage-card").innerHTML = w.final.html;
    const res = $("stage-result");
    if (res) res.innerHTML = "";
    /* 부문 탭 — 결과 카드는 **저장해 둔 HTML**이라(w.final.html) 탭만 눌러서
     * 카드를 통째로 다시 만들면 안 돼요. 순위표 칸 하나만 갈아 끼웁니다.
     * S.wc는 "🏁 시즌 결산"을 누를 때까지 살아 있어서 다시 그릴 수 있어요. */
    const drawRace = () => {
      const box = $("wc-final-race");
      if (!box) return;
      box.innerHTML = raceHTML();
      wireFaceTabs(box, drawRace);
    };
    drawRace();
    themeSync();
    wire("🏁 시즌 결산", () => {
      S.wc = null;             // ← 여기 한 줄에 ready·테마·훈련 버프가 전부 매달려 있어요
      save();
      themeSync();
      onDone();
    });
    show("screen-stage");
  }

  const LABEL = { champion: "🏆 월드컵 우승!!", final: "🥈 준우승", semi: "4강 진출", group: "조별리그 탈락" };
  const EMOJI = { champion: "🏆", final: "🥈", semi: "🎖️", group: "💧" };

  /* 앱을 닫았다 열었을 때 — 대회 중이면 **항상 준비 화면**으로 돌아와요.
   * 경기는 원자적이라(중간 상태를 저장하지 않아요) camp와 ready가 상태를 다 담습니다. */
  function resume(onDone) {
    if (!wc()) return false;
    themeSync();
    // 대회 결과 화면에서 닫았으면 거기로 돌아와요 (안 그러면 결과를 못 보고 넘어가요)
    if (wc().final) { showFinal(onDone); return true; }
    if (wc().ready) { CTX.renderPrep(); show("screen-pro"); return true; }
    CTX.renderPrep(); show("screen-pro");
    return true;
  }

  /* 🗣️ 결산의 월드컵 — **대표팀 감독이 한마디 하는 걸로** 적어요.
   *
   * 제보: "결산화면에서 국가대표 감독이 의견을 말하는 것처럼 바꾸자."
   * 이 게임에서 선수에게 판정을 알려 주는 목소리는 하나예요 — 유스 트라이아웃의
   * 🗣️ 감독 한마디, 🪑 벤치의 클럽 감독. 대표팀도 같은 자리에 세웁니다.
   *
   * 말은 상황마다 여러 개를 두고 **시즌으로 골라요.** 하나뿐이면 네 번의 대회가
   * 같은 문장을 네 번 반복해요. 숫자(경기·골·우승국)는 말 아래 작은 줄로 갈라
   * 둡니다 — 감독은 성적표를 읽지 않아요. */
  const SAY_FAR = [
    "아직 자네를 부를 자리가 아니었네. 더 크게 만들어 오게.",
    "명단을 짜며 자네 이름은 안 나왔어. 솔직히 말하는 게 예의겠지.",
    "지금은 앞에 선 사람이 많아. 그 줄을 줄이는 건 자네 몫이야.",
  ];
  const SAY_NEAR = [
    "회의 탁자에 자네 이름이 올랐네. 마지막에 다른 친구로 갔어.",
    "정말 아슬아슬했어. 한 끗이었네.",
    "이번엔 못 불렀지만, 다음엔 먼저 자네를 볼 걸세.",
  ];
  const SAY_STAY = [
    "클럽을 택했더군. 이해하네. 준비됐을 때 다시 부르지.",
    "지금은 자네 자리를 지키는 게 맞아. 그것도 선수의 일이야.",
  ];
  const SAY_GROUP = [
    "조별에서 멈췄네. 자네 탓만은 아니야.",
    "여기서 끝날 팀은 아니었는데. 다음을 준비하지.",
    "짧게 끝났어. 그래도 이 무대를 밟은 건 남을 걸세.",
  ];
  const SAY_GROUP_OK = [
    "팀은 멈췄지만 자네는 제 몫을 했어. 기억해 두겠네.",
    "이 성적으로 조별 탈락이라니, 자네한테는 미안한 대회야.",
  ];
  const SAY_SEMI = [
    "네 번째 팀으로 돌아왔군. 잘 싸웠어.",
    "여기까지 온 게 어딘가. 고개 들게.",
  ];
  const SAY_FINAL = [
    "한 걸음이었네. 그 한 걸음이 제일 멀지.",
    "은메달은 목에 걸어도 무겁더군. 다음엔 색을 바꾸세.",
  ];
  const SAY_CHAMP = [
    "우리가 해냈어. 자네가 있어서 가능했네.",
    "이 트로피는 오래 갈 걸세. 자네 이름과 함께.",
  ];
  /* ⚠️ **여기에 없는 상을 받으면 "undefined"가 화면에 찍혀요.**
   * 제보(스크린샷): "이 트로피는 오래 갈 걸세. 자네 이름과 함께. undefined"
   * 🛡️ 골든월을 나중에 만들면서 이 표에만 안 넣었습니다. 아래 `?? ""`가 두 번째
   * 방어선이에요 — 다음에 상을 하나 더 만들어도 화면에 undefined가 안 뜹니다. */
  const SAY_AWARD = {
    boot: "이 대회 최고의 골잡이였어.",
    ball: "이 대회 최고의 선수였네. 누가 봐도.",
    wall: "자네 뒤가 있어서 앞이 편했네.",
  };

  function reportLine() {
    if (!S || !isWcYear(S.proYear)) return "";
    const h = hist().filter((x) => x.y === S.proYear)[0];
    if (!h) return "";
    const nat = myNation();
    const pick = (pool, off) => pool[Math.abs(S.proYear + (off || 0)) % pool.length];
    const bar0 = wildOpen(S) ? wildBar() : callBar();
    const d = bar0 - Math.round(overall());
    const aw = h.awards || [];

    let say, fact;
    if (h.result === "none") {
      if (h.stay) {
        say = pick(SAY_STAY);
        fact = `${nat.name} 소집을 고사하고 클럽에 남았어요`;
      } else {
        const near = d > 0 && d <= LUCK_GAP;
        say = pick(near ? SAY_NEAR : SAY_FAR);
        fact = `${nat.name} 소집 문턱 종합 ${bar0}`
          + (d > 0 ? ` · 지금 ${Math.round(overall())} (${d} 남음)` : "")
          + (near ? ` · 🎲 깜짝 발탁도 비껴갔어요` : "");
      }
    } else {
      /* 조별 탈락은 **내가 잘했는지**로 말이 갈려요 — 팀이 멈춘 것과 내가 못한 건
       * 다른 이야기입니다(팀 성적을 내 활약에서 떼어낸 것과 같은 눈금이에요). */
      const good = (h.g || 0) >= 2 || aw.length;
      say = h.result === "champion" ? pick(SAY_CHAMP)
        : h.result === "final" ? pick(SAY_FINAL)
        : h.result === "semi" ? pick(SAY_SEMI)
        : pick(good ? SAY_GROUP_OK : SAY_GROUP);
      if (aw.length && SAY_AWARD[aw[0]]) say += ` ${SAY_AWARD[aw[0]]}`;
      fact = `${LABEL[h.result]} · ${h.apps}경기 ⚽${h.g} 🅰️${h.a}`
        + (h.benched ? ` · 🪑 ${h.benched}경기 결장` : "")
        + (aw.length ? ` · ${aw.map((id) => AW_NAME[id] || id).join(" · ")}` : "")
        + (h.champ && h.result !== "champion" ? ` · 우승 ${h.champ}` : "");
    }
    return `<div class="coach-say">🗣️ ${nat.name} 대표팀 감독 — “${say}”</div>`
      + `<div class="wc-fact">🌏 ${fact}</div>`;
  }

  return {
    init, due, enter, resume, checkInvite, badgeHTML, startButton, themeSync, reportLine,
    groupTableHTML, bracketHTML, tableHTML: tableHTML2, groupSumText, recordHTML,
    raceHTML, wireFaceTabs, openGroup, matesOf, faces, faceRows,
    active: () => !!wc(),
    isWcYear, callBar, wildBar, luckP, myNation, xiP, xiPct,
    _t: {
      NATIONS, wildBar, classBar, BAR_NAT_K, BAR_WOBBLE, WILD_GAP, barSeed,
      starterBar, xiP, xiNow, BENCH_RUN_MAX, XI_LO, XI_KNOCK, XI_FLOOR, benchMatch, benchCredit, benchReason,
      TRUST_GO, TRUST_STAY, PRIZE, FAME, AWARD_FAME,
      natSquadOf, xiOf, natXI, ensureSquads, advanceOthers, creditNat, creditMates, cutNations,
      faces, faceRows, matesOf, wireFaceTabs,
      decideAwards, faceScore, FACE_N, NAT_G0, NAT_GK, ACE_W, SCORE_W, DEF_W, DEF_G0, DEF_GK,
      creditDef, creditRate, faceAvg, FACE_TABS, FACE_KEY, mySquad, markAce,
      playOutRest, KO_EDGE, ASSIST_P, showFinal,
      LUCK_GAP, LUCK_MAX, luckP,
      NAT_SPREAD, ACE_DIV, ACE_LO, ACE_HI, natStr, teamStr, NAT_MEAN,
      FIRST_WC, WC_CYCLE, CAMP_FIRST, CAMP_BETWEEN, GROUP_GAMES,
      wildOpen, rollGroups, wcAfterMatch, endTournament, MARKET_NATION,
    },
  };
})();
