/* 👥 스쿼드 — 우리 팀에 실제로 사람이 있게 하는 파일이에요.
 *
 * 예전에는 팀이라는 게 숫자 몇 개뿐이었어요. 동료 골은 이름 없이 굴렀고,
 * 중계에 뜨는 이름은 **개인 순위 8명 중 우리 클럽 소속인 한두 명**에게서
 * 빌려 썼습니다("한 팀에 선수는 11명으로 있는 거 맞지?" — 아니었어요).
 *
 * 이제 **리그의 모든 클럽**이 선발 11 + 벤치 5, 16명씩 갖습니다.
 * 우리 팀만 사람이 있고 상대는 숫자뿐이면, 개인 순위에 뜨는 다른 팀 선수와
 * 그 팀의 실제 명단이 또 서로 모르는 사이가 돼요 — 이 저장소의 단골 병이에요.
 *   · 선발은 **포지션 자리마다 실력 순**으로 정해져요. 내 종합이 그 경쟁에 들어가요.
 *   · 선발이 아니면 경기를 못 뛰어요. 대신 그 주에 능력치 하나가 올라요 —
 *     "결장 = 성장 정지"가 되면 벤치는 그냥 벌이 되고, 그건 이탈로 이어져요.
 *   · 동료 골은 **선발 명단에서** 포지션 가중으로 뽑아 그 선수 기록에 쌓여요.
 *
 * 이 구조가 만드는 것: 약팀으로 가면 선발이 쉽고 강팀에 가면 벤치를 각오해야
 * 해요. 이적이 "어느 리그로"만이 아니라 "뛸 수 있느냐"의 문제가 됩니다.
 *
 * game.js의 전역(S, rand, randInt, clamp, pick, shuffle, overall, clubStrOf,
 * statCap, POS_INFO, STAT_DEFS, randomPlayerName, MARKETS)을 쓰므로
 * game.js 뒤에 로드해야 해요. */
"use strict";

window.WingerSquad = (() => {
  /* 4-4-2가 아니라 이 게임의 포지션 넷(공격수·윙어·미드필더·수비수)에 맞춘 배치예요.
   * 합이 11이에요 — 골키퍼는 이 게임에 없어요. */
  const FORMATION = { fw: 2, wg: 2, mf: 4, df: 3 };
  const BENCH = 5;
  const SQUAD_SIZE = 11 + BENCH;

  /* 동료 실력 — 클럽 전력을 가운데 두고 흩어져요. 폭이 좁으면 내 종합이 조금만
   * 올라도 늘 선발이 되고, 넓으면 운이 다 정합니다. ±14가 그 사이예요. */
  const STR_SPREAD = 14;

  const POS_KEYS = ["fw", "wg", "mf", "df"];
  const posName = (p) => (POS_INFO[p] || {}).name || p;

  /* ---------- 📈 동료도 크고 늙어요 ----------
   *
   * 제보: "우리 팀·다른 팀 선수 능력치가 경기와 시즌을 거치며 변해야 한다.
   * 내가 각성에 실패하면 실력이 잠깐 줄듯, 다른 선수에게도 같은 일이 있으면 좋겠다."
   *
   * 여태 동료의 str은 **시즌 내내, 몇 시즌이 지나도 고정**이었어요. 그래서 몇 해
   * 지나면 나 혼자 앞서갑니다 — 선발 경쟁이 처음 한 번으로 끝나요.
   *
   * ── 어떻게 움직이나 ──
   * 선수마다 **나이(age)**와 **peak(끝까지 크면 닿을 실력)**를 둬요.
   * 지금 실력은 `peak × 나이곡선(age)`이에요. 어리면 아직 덜 컸고, 서른을 넘으면
   * 내려옵니다. 시즌이 바뀔 때 나이를 한 살 먹이고 다시 계산해요.
   *
   * ⚠️ **peak을 지금 실력에서 되계산하면 안 돼요.** 처음엔 그렇게 짰는데,
   * 그러면 열여덟 신인의 peak이 `지금 실력 ÷ 0.68`이 돼서 클럽 전력의 1.47배가
   * 됩니다. 은퇴한 자리마다 그런 신인이 들어오니 **리그가 계속 부풀어요** —
   * 실측에서 20시즌에 평균 +13.8이 나왔습니다. 클럽 전력(= 리그 수준)과 명단이
   * 서로 다른 말을 하기 시작하는 자리예요.
   *
   * 그래서 **peak을 클럽 전력 눈금에서 굴리고**, 지금 실력을 `peak × 나이곡선`으로
   * 내려요. 다만 그냥 굴리면 모두가 곡선만큼 깎여서 평균이 클럽 전력 아래로
   * 내려가니, 나이 분포의 **평균 곡선(MEAN_CURVE)**으로 한 번 되올려 둡니다.
   * 그러면 첫 시즌 명단 평균이 정확히 클럽 전력이고, 은퇴·신인이 도는 안정 상태의
   * 평균 곡선도 거의 같아서(0.8696 vs 0.8671) 시즌이 지나도 제자리예요.
   *
   * ── 잠깐 줄어드는 것 ──
   * 시즌마다 낮은 확률로 📉 부진이나 🔥 상승세가 붙어요. 그 시즌에만 실력이
   * ±(3~7) 움직이고 다음 시즌엔 사라집니다. 내 각성 실패와 같은 결이에요.
   *
   * ── 리그가 흘러가지 않게 ──
   * 서른다섯이 되거나 실력이 바닥나면 은퇴하고 그 자리에 신인(18~20)이 들어와요.
   * 신인의 실력도 클럽 전력에서 굴리니, 나가고 들어오는 것이 평균을 붙잡아 줍니다.
   * 실측(6팀 × 20시즌 × 60판): 리그 평균이 첫 시즌 대비 ±1 안에서 머물러요. */
  const AGE_MIN = 18, AGE_MAX = 34;      // 처음 명단을 꾸릴 때의 나이 폭
  const PEAK_AGE = 27;                   // 여기서 peak에 닿아요
  const YOUNG_FLOOR = 0.68;              // 열여덟의 실력은 peak의 이만큼
  const DECLINE_K = 0.022;               // 스물일곱을 넘기면 한 해에 이만큼씩 (2.2%)
  const RETIRE_AGE = 36;
  /* 나이 곡선 — 열여덟 0.68 → 스물일곱 1.00 → 서른셋 0.87 → 서른다섯 0.82 */
  function ageCurve(age) {
    if (age >= PEAK_AGE) return Math.max(0.6, 1 - (age - PEAK_AGE) * DECLINE_K);
    return YOUNG_FLOOR + (1 - YOUNG_FLOOR) * ((age - AGE_MIN) / (PEAK_AGE - AGE_MIN));
  }
  /* 그 시즌에만 붙는 흔들림. 없으면 0이에요(옛 세이브에는 칸 자체가 없어요). */
  const SLUMP_P = 0.10, SURGE_P = 0.10, FORM_LO = 3, FORM_HI = 7;
  const formOf = (x) => (x && x.form) || 0;
  /* 한 줄의 지금 실력 — **여기 한 곳에서만** 정해요.
   * 나이·peak·그 시즌 폼이 전부 여기로 모여야 화면과 판정이 같은 값을 봅니다. */
  const strOfRow = (x) => clamp(Math.round((x.peak * ageCurve(x.age) + formOf(x)) * 10) / 10, 25, 99);

  /* 나이 폭(18~34) 전체의 평균 곡선. peak을 이만큼 되올려 둬야 명단 평균이
   * 클럽 전력에 맞아요. 값을 손으로 적지 않고 **곡선에서 계산해요** — 곡선을
   * 고치면 여기가 따라옵니다(상수를 두 곳에 두면 반드시 어긋나요). */
  const MEAN_CURVE = (() => {
    let sum = 0, n = 0;
    for (let a = AGE_MIN; a <= AGE_MAX; a++) { sum += ageCurve(a); n++; }
    return sum / n;
  })();

  /* 한 명 만들기. `age`를 정해 주면 그 나이로, 안 주면 폭 안에서 굴려요.
   * peak은 **클럽 전력 눈금**에서 나와요 — 신인이든 노장이든 같은 자로 잽니다. */
  function rollPlayer(base, pos, age) {
    const a = age != null ? age : randInt(AGE_MIN, AGE_MAX);
    const target = clamp(base + rand(-STR_SPREAD, STR_SPREAD), 25, 99);
    const x = {
      name: randomPlayerName(Math.random() < 0.55 ? null : MARKETS.find((m) => m.id === "eu")),
      pos, age: a, peak: Math.round((target / MEAN_CURVE) * 10) / 10, str: 0,
      g: 0, a: 0, d: 0, apps: 0,
    };
    x.str = strOfRow(x);
    return x;
  }

  /* 클럽 하나의 스쿼드를 꾸려요. base는 그 클럽의 전력이에요.
   * mine이면 내 자리 하나를 나로 바꿔요. */
  function rollSquad(base, mine) {
    const need = {};
    for (const p of POS_KEYS) need[p] = FORMATION[p];
    // 벤치 몫은 포지션에 고르게 흩뿌려요
    for (let i = 0; i < BENCH; i++) need[POS_KEYS[i % POS_KEYS.length]] += 1;
    if (mine) need[S.pos] = Math.max(need[S.pos], FORMATION[S.pos] + 1);   // 내 자리엔 경쟁자가 있어야 해요

    const list = [];
    for (const p of POS_KEYS) {
      for (let i = 0; i < need[p]; i++) list.push(rollPlayer(base, p));
    }
    if (mine) {
      /* 내 자리 하나를 나로 바꿔요. 스쿼드에는 **나도 한 줄로** 들어가야
       * 선발 경쟁이 같은 표 안에서 벌어져요. */
      const at = list.findIndex((x) => x.pos === S.pos);
      list[at] = meRow();
    }
    return list.slice(0, SQUAD_SIZE);
  }
  /* 내 줄 — 나이도 peak도 없어요. 내 실력은 훈련·각성·노쇠가 정하고,
   * refreshMe가 매번 지금 값으로 덮어써요. 여기에 peak을 두면 두 곳이 됩니다. */
  const meRow = () => ({ me: true, name: S.name, pos: S.pos, str: overall(), g: 0, a: 0, d: 0, apps: 0 });

  /* 리그의 **모든 클럽** 명단을 세이브에 둬요. 리그나 내 클럽이 바뀌면 다시 꾸립니다.
   * 옛 세이브에는 아예 없어요 — 마이그레이션하지 않고 여기서 만듭니다.
   * 크기는 6팀 × 16명 = 96줄이라 세이브에 담아도 부담이 없어요. */
  function ensureSquads() {
    if (!S || !S.group) return {};
    const lg = leagueOf(S).id;
    if (!S.squads || S.squadsLeague !== lg) {
      const out = {};
      for (const c of clubsIn(lg, S)) out[c.name] = rollSquad(c.str, c.name === S.group);
      // 내 클럽이 리그 명단에 없는 옛 세이브 방어 — 없으면 만들어 둬요
      if (!out[S.group]) out[S.group] = rollSquad(clubStrOf(S), true);
      S.squads = out;
      S.squadsLeague = lg;
      S.squadClub = S.group;
      /* ⚠️ 내 줄을 **저장하기 전에** 채워요. 예전에는 save()를 먼저 부르고 그 뒤에
       * str을 넣어서, 디스크에는 str 0인 내가 남았습니다. 메모리에서는 매번 다시
       * 채워지니 화면은 멀쩡했지만, 세이브만 열어 보면 내가 꼴찌였어요. */
      refreshMe();
      save();
    } else if (S.squadClub !== S.group) {
      /* 🔁 같은 리그 안에서 클럽만 바뀌었어요(이적).
       *
       * 예전에는 여기서도 **리그 전체를 다시 꾸렸어요.** 그러면 다른 팀 선수들의
       * 나이와 성장이 통째로 리셋됩니다 — 몇 시즌 지켜본 유망주가 이적 한 번에
       * 사라져요. 이제 명단은 그대로 두고 **나만 옮겨 끼웁니다.**
       * 새 팀에서는 내 포지션의 **가장 약한 선수** 자리를 받아요 — 갓 온 선수가
       * 주전 자리를 공짜로 받지는 않아요. */
      moveMe();
      S.squadClub = S.group;
      save();
    }
    backfillAges();
    refreshMe();
    return S.squads;
  }

  /* 나를 지금 클럽으로 옮겨 끼워요. 다른 팀 명단은 안 건드려요. */
  function moveMe() {
    const sq = S.squads || {};
    for (const club of Object.keys(sq)) {
      const at = sq[club].findIndex((x) => x.me);
      if (at < 0) continue;
      // 내가 있던 자리는 그 클럽의 새 선수가 채워요 — 팀 크기가 줄면 안 돼요
      sq[club][at] = rollPlayer(clubBase(club), S.pos);
    }
    if (!sq[S.group]) { sq[S.group] = rollSquad(clubStrOf(S), true); return; }
    const mine = sq[S.group];
    const same = mine.map((x, i) => ({ x, i })).filter((e) => e.x.pos === S.pos)
      .sort((a, b) => a.x.str - b.x.str);
    if (same.length) mine[same[0].i] = meRow();
    else mine.push(meRow());
  }
  const clubBase = (club) => {
    const c = clubsIn(leagueOf(S).id, S).find((x) => x.name === club);
    return c ? c.str : clubStrOf(S);
  };

  /* 옛 세이브에는 나이도 peak도 없어요. **마이그레이션하지 않고 읽는 쪽에서** 채워요.
   * 지금 str을 그대로 두고 거기서 peak을 되계산하니, 채워 넣는 순간 실력이
   * 안 바뀝니다 — 이어하던 사람의 팀이 갑자기 세지거나 약해지지 않아요. */
  function backfillAges() {
    const sq = S.squads || {};
    for (const club of Object.keys(sq)) {
      for (const x of sq[club]) {
        if (x.me || x.age != null) continue;
        /* 여기서만은 **지금 실력에서 peak을 되계산해요.** 이어하던 사람의 팀이
         * 나이를 채우는 순간 세지거나 약해지면 안 되니까요 — 지금 실력을
         * 붙잡아 두는 게 먼저예요. 다음 시즌부터는 자기 곡선을 탑니다. */
        x.age = randInt(AGE_MIN, AGE_MAX);
        x.peak = Math.round(((x.str || 60) / ageCurve(x.age)) * 10) / 10;
      }
    }
  }

  /* 📅 한 시즌이 지났어요 — 나이를 먹이고, 그 시즌 폼을 새로 굴리고, 은퇴를 처리해요.
   * resetSeason이 부릅니다(시즌 기록을 비우는 그 자리 하나). */
  function ageSquads() {
    const sq = S.squads || {};
    /* 한 시즌에 한 번만. 결산에 이르는 길이 여럿이라(리그·컵·월드컵) 겹쳐 불릴 수
     * 있는데, 두 번 불리면 한 해에 두 살을 먹어요. 시즌 번호를 도장처럼 찍어 둡니다 —
     * 옛 세이브에는 그 칸이 없어서 자동으로 한 번은 지나갑니다. */
    if (S.squadAgedY === S.proYear) return S.squadNews || null;
    S.squadAgedY = S.proYear;
    backfillAges();
    const news = { grew: [], fell: [], gone: [], slump: [], surge: [] };
    for (const club of Object.keys(sq)) {
      const base = clubBase(club);
      const list = sq[club];
      for (let i = 0; i < list.length; i++) {
        const x = list[i];
        if (x.me) continue;                       // 내 성장은 훈련·각성·노쇠가 맡아요
        const before = x.str;
        x.age = (x.age || AGE_MIN) + 1;
        // 은퇴 — 자리는 신인이 이어받아요. 나가고 들어오는 게 리그 평균을 붙잡습니다
        if (x.age >= RETIRE_AGE) {
          if (club === S.group) news.gone.push({ name: x.name, age: x.age });
          list[i] = rollPlayer(base, x.pos, randInt(18, 20));
          continue;
        }
        /* 그 시즌에만 붙는 흔들림. 지난 시즌 것은 여기서 지워져요 —
         * 지우는 코드를 따로 두지 않으려고 매 시즌 새로 굴립니다. */
        const r = Math.random();
        x.form = r < SLUMP_P ? -rand(FORM_LO, FORM_HI)
          : r < SLUMP_P + SURGE_P ? rand(FORM_LO, FORM_HI) : 0;
        x.str = strOfRow(x);
        if (club !== S.group) continue;           // 소식은 우리 팀 것만 전해요
        if (x.form < 0) news.slump.push({ name: x.name, d: x.str - before });
        else if (x.form > 0) news.surge.push({ name: x.name, d: x.str - before });
        else if (x.str - before >= 1.5) news.grew.push({ name: x.name, d: x.str - before, age: x.age });
        else if (before - x.str >= 1.5) news.fell.push({ name: x.name, d: x.str - before, age: x.age });
      }
    }
    S.squadNews = news;
    return news;
  }
  // 내 줄의 실력·이름은 늘 지금 값이에요 (훈련·각성·개명으로 계속 움직여요)
  function refreshMe() {
    for (const x of (S.squads && S.squads[S.group]) || []) {
      if (x.me) { x.str = overall(); x.name = S.name; }
    }
  }
  const squadOf = (club) => ensureSquads()[club] || [];
  const ensureSquad = () => squadOf(S.group);        // 우리 팀

  /* 선발 11명 — 포지션 자리마다 실력 순이에요. */
  function startingXIOf(club) {
    const sq = squadOf(club);
    const out = [];
    for (const p of POS_KEYS) {
      const line = sq.filter((x) => x.pos === p).sort((a, b) => b.str - a.str);
      out.push(...line.slice(0, FORMATION[p]));
    }
    return out;
  }
  const startingXI = () => startingXIOf(S.group);

  /* 🔄 그 경기의 선발 — **매 경기 다시 뽑아요.**
   *
   * 실력 순으로만 고정하면 한 번 선발이면 시즌 내내 선발이고, 한 번 밀리면
   * 계속 벤치예요. 실제로는 감독이 그날 몸 상태와 최근 흐름을 보고 돌립니다.
   * 그래서 경기마다 ±5의 흔들림을 얹고, 내 쪽에는 **컨디션**을 더해요 —
   * 잘 쉬면 뽑히기 쉬워집니다(휴식에 이유가 하나 더 생겨요).
   * 경계에 있는 선수만 갈리고, 실력 차가 크면 그대로예요. */
  const FORM_SWING = 5;

  /* 감독이 나를 볼 때 실력 위에 얹는 것 — **컨디션과 최근 폼** 두 가지예요.
   *
   * ⚠️ 예전에는 컨디션 하나뿐이었고 그 폭이 (컨디션-70)/6, 즉 -11.7 ~ +5였어요.
   * 같은 포지션 실력 차가 보통 1~2인데 보정이 그보다 훨씬 커서, **실력 1위인데도
   * 컨디션 34면 선발 확률이 23%**였습니다. 실측: 컨디션만 10→100으로 옮기면
   * 4% ↔ 99%. 사실상 컨디션 하나가 당락을 다 정하고 실력은 순번만 매겼어요
   * (제보: "선발 확률은 컨디션에만 비례해??" — 그때는 사실상 그랬습니다).
   *
   * 그래서 둘 다 **한계를 두고** 얹어요. 컨디션이 바닥이어도 실력으로 밀어붙일
   * 여지를 남기고, 잘하고 있으면 그게 자리를 지켜 줍니다. */
  const COND_MID = 60, COND_DIV = 10, COND_CAP = 4;   // 컨디션 20 → -4 · 100 → +4
  const FORM_MID = 6.5, FORM_MUL = 1.5, FORM_CAP = 3; // 평균 평점 4.5 → -3 · 8.5 → +3
  /* 🤝 클럽 감독의 신뢰 — 🌏 월드컵 유망주 와일드카드에서 갈린 결과예요.
   * 대회를 다녀오면 마이너스, 클럽에 남으면 플러스가 **다음 시즌 한 해만** 실려요.
   * 시즌 번호를 함께 저장해서 지나면 저절로 무효라 지우는 코드가 없습니다
   * (S.wc.ready와 같은 원리 — 잊을 대상을 만들지 않아요). */
  const trustOf = () =>
    (S.clubTrust && S.clubTrust.y === S.proYear) ? (S.clubTrust.v || 0) : 0;

  function myBonus() {
    const cond = clamp((S.condition - COND_MID) / COND_DIV, -COND_CAP, COND_CAP);
    /* 최근 폼 — 이번 시즌 평균 평점이에요. 한 경기도 안 뛴 주에는 0(중립)이라
     * 시즌 초에 폼을 이유로 앉히는 일이 없어요. */
    const act = S.activity;
    const apps = (act && act.apps) || 0;
    const avg = apps ? (act.ratingSum || 0) / apps : null;
    const form = avg == null ? 0 : clamp((avg - FORM_MID) * FORM_MUL, -FORM_CAP, FORM_CAP);
    const trust = trustOf();
    return { cond, form, avg, trust, total: cond + form + trust };
  }
  const lineupScore = (x) => x.str + rand(-FORM_SWING, FORM_SWING) + (x.me ? myBonus().total : 0);

  /* 🛌 **보호 로테이션** — 몸이 바닥이면 감독이 가끔 쉬게 해요.
   *
   * 제보: "스탯이 좋아서 선발 확률이 100%인데, 컨디션이 0이면 감독이 선수 보호
   * 차원에서 가끔씩은 쉬게 해줄 수도 있는 거 아냐?? 중요하지 않은 경기 같은 거."
   * 맞아요 — 실력 103인데 팀 최고 수비수가 70이면 컨디션으로는 절대 안 밀려서,
   * 몸이 아무리 상해도 매 경기 90분을 뜁니다.
   *
   * ⚠️ 이건 **선발 확률에도 같이 실어요.** 굴릴 때만 빼고 확률에는 안 넣으면
   * "100%라고 적혀 있는데 벤치"가 됩니다 — 이 저장소가 계속 싸워 온 병이에요.
   * 리그 경기에만 걸려요(rollLineup을 리그만 부릅니다) — 🏆 컵과 🌏 월드컵은
   * 큰 경기라 감독도 안 뺍니다. */
  const REST_BAR = 30;       // 이 아래부터 감독이 쉬게 할 수 있어요
  const REST_MAX = 0.35;     // 컨디션 0일 때 (0 → 35% · 10 → 19% · 20 → 7% · 30 → 0%)
  function restP() {
    const c = S.condition;
    if (c == null || c >= REST_BAR) return 0;
    return REST_MAX * Math.pow((REST_BAR - c) / REST_BAR, 1.5);
  }

  /* 이번 경기 선발을 뽑아 활동 기록에 새겨요. 같은 라운드를 다시 그려도
   * 흔들리지 않게 **한 번 정하면 그 라운드 동안 고정**입니다. */
  function rollLineup() {
    const sq = ensureSquad();
    const rest = Math.random() < restP();     // 🛌 오늘 감독이 나를 뺄까
    const picked = [];
    for (const p of POS_KEYS) {
      const line = sq.filter((x) => x.pos === p)
        /* 보호 로테이션이 걸린 날은 내 점수를 바닥으로 내려요 — 명단에서 빼는 게
         * 아니라 경쟁에서 빠지는 것이라, 내 자리는 다음 사람이 자연스럽게 채워요. */
        .map((x) => ({ x, v: (x.me && rest) ? -Infinity : lineupScore(x) }))
        .sort((a, b) => b.v - a.v);
      picked.push(...line.slice(0, FORMATION[p]).map((e) => e.x));
    }
    if (S.activity) S.activity.rested = rest;
    if (S.activity) {
      S.activity.xi = picked.map((x) => x.name);
      S.activity.xiWeek = S.activity.week;
    }
    return picked;
  }
  /* 이번 경기 선발 명단 — 굴린 게 있으면 그걸, 없으면 실력 순 기본값이에요. */
  function matchXI() {
    const act = S.activity;
    if (act && Array.isArray(act.xi) && act.xiWeek === act.week) {
      const sq = ensureSquad();
      const out = act.xi.map((n) => sq.find((x) => x.name === n)).filter(Boolean);
      if (out.length === 11) return out;
    }
    return startingXI();
  }
  const isStarter = () => matchXI().some((x) => x.me);

  /* 🥇 개인 순위에 올릴 리그의 얼굴들 — **각 클럽의 선발 중 실력 상위**예요.
   * 예전에는 이름을 새로 지어 8명을 만들었어요. 그러면 개인 순위에 뜬 그 선수가
   * 어느 팀 명단에도 없는 유령이 됩니다. 이제 실제 사람 중에서 뽑아요. */
  /* 🥇 개인 순위에 올릴 사람 — **리그에서 제일 잘하는 선수들**이에요.
   *
   * ⚠️ 예전에는 "클럽마다 최소 한 명"을 먼저 채웠어요. 그러면 강팀 3순위보다
   * 못한 약팀 1순위가 자리를 차지해서, 표에 평범한 선수가 섞입니다.
   * 이건 **개인 기록 순위**예요 — 클럽을 고르게 보여주는 표가 아니라 잘하는
   * 사람이 오르는 표입니다(제보: "개인기록에는 나라마다 한자리는 필요없어",
   * 이어서 "리그에서 개인기록도 동일하게"). 🌏 월드컵도 같은 규칙이에요.
   *
   * 대신 **자리(포지션)는 고르게** 뽑아요. 부문상이 득점왕·도움왕·철벽상으로
   * 나뉘어 있어서, 여덟이 전부 공격수면 철벽상을 공격수가 받게 됩니다.
   * need로 포지션별 필요 수를 넘기면 그 안에서 실력 순으로 채워요.
   * 안 넘기면 그냥 실력 순 n명이에요. */
  function leagueFaces(n, need) {
    const all = [];
    for (const club of Object.keys(ensureSquads())) {
      for (const x of startingXIOf(club)) {
        if (x.me) continue;
        all.push({ club, player: x });
      }
    }
    all.sort((a, b) => b.player.str - a.player.str);
    if (!need) return all.slice(0, n);
    const out = [], left = Object.assign({}, need);
    /* ⚠️ **우리 클럽 자리도 따로 안 챙겨요.** 한때 한 자리를 남겼었는데,
     * 그건 "동료 골이 이 표에 쌓이려면 우리 선수가 표에 있어야 한다"는 배선
     * 사정 때문이었어요. 그건 이 표가 무엇인지와 상관없는 이유입니다 —
     * **기록이 좋지 않으면 안 보이는 게 맞아요**(제보). 동료 기록은 👥 명단
     * 화면에 그대로 남고, 개인 순위는 잘한 사람만 오릅니다. */
    for (const cand of all) {
      const p = cand.player.pos;
      if (!left[p]) continue;
      left[p] -= 1;
      out.push(cand);
      if (out.length >= n) break;
    }
    // 자리가 남으면 실력 순으로 마저 채워요
    for (const cand of all) {
      if (out.length >= n) break;
      if (out.includes(cand)) continue;
      out.push(cand);
    }
    return out.slice(0, n);
  }

  /* 내 자리 경쟁 — 같은 포지션에서 몇 등인가, 선발 자리는 몇 개인가.
   * odds — 흔들림(±FORM_SWING)과 컨디션을 감안한 **이번 경기 선발 확률**이에요.
   * 순번만 보여주면 "3/3인데 왜 벤치야?"가 되니, 경합 중이라는 걸 숫자로 알려줘요. */
  /* ⚠️ 확률은 **부를 때마다 같은 값**이 나와야 해요.
   *
   * 예전에는 Math.random으로 400번 굴려서 냈어요. 그러면 같은 상태인데도 HUD
   * 버튼과 스쿼드 레이어가 다른 숫자를 적고, 레이어를 다시 열 때마다 값이
   * 흔들립니다(제보: "HUD에 보이는 선발 확률이랑 눌러서 보이는 게 다르네.
   * 누를 때마다 확률이 바뀌네"). 게임의 무작위는 **경기 한 번**에만 있어야지
   * 그 확률을 읽는 행위에 있으면 안 돼요 — 화면이 흔들리면 훈련이 얼마나
   * 도움이 됐는지 비교할 수가 없습니다.
   *
   * 그래서 씨앗을 **입력에서** 뽑아 굴려요. 실력·컨디션·폼이 그대로면 언제
   * 물어봐도 같은 답이고, 하나라도 움직이면 답도 움직여요. */
  const seedOf = (line, bonus) => {
    let h = 2166136261;
    const mix = (v) => { h = Math.imul(h ^ (Math.round(v * 100) >>> 0), 16777619) >>> 0; };
    for (const x of line) mix(x.str);
    mix(bonus); mix(FORMATION[S.pos]); mix(line.length);
    return h >>> 0;
  };
  const rngFrom = (seed) => () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function myLine() {
    const sq = ensureSquad();
    const line = sq.filter((x) => x.pos === S.pos).sort((a, b) => b.str - a.str);
    const rank = line.findIndex((x) => x.me) + 1;
    const bonus = myBonus();
    const nextU = rngFrom(seedOf(line, bonus.total));
    let hit = 0;
    const N = 1200;   // 씨앗이 고정이라 늘려도 공짜예요 — 1%p 안쪽으로 잡힙니다
    for (let i = 0; i < N; i++) {
      const roll = line
        .map((x) => ({ x, v: x.str + (nextU() * 2 - 1) * FORM_SWING + (x.me ? bonus.total : 0) }))
        .sort((a, b) => b.v - a.v);
      if (roll.slice(0, FORMATION[S.pos]).some((e) => e.x.me)) hit++;
    }
    /* 🛌 보호 로테이션도 확률에 실어요 — 굴릴 때만 빼고 여기 안 넣으면
     * "100%라고 적혀 있는데 벤치"가 됩니다. */
    const rest = restP();
    return { rank, of: line.length, slots: FORMATION[S.pos], line,
      odds: (hit / N) * (1 - rest), rest, bonus };
  }

  /* 왜 앉았는지 / 왜 뽑혔는지 한 줄 — **화면 세 군데가 이 함수 하나를 써요.**
   * 벤치 카드와 스쿼드 레이어가 각자 문장을 만들면, 한쪽은 "앞사람을 넘어라"라고
   * 하고 다른 쪽은 "1번째"라고 적는 일이 생겨요. 실제로 그렇게 났습니다
   * (제보: "공격수 선발 2자리인데 지금 1번째라는 게 무슨 의미지?" — 실력으로는
   * 선발권인데 컨디션에 밀린 날이었어요. 문장이 그걸 말해 주지 않았습니다). */
  /* 감독이 한마디 하는 걸로 적어요.
   *
   * 처음엔 "컨디션이 34까지 떨어졌어요 — 🛌 휴식이 확률을 올려요"처럼 적었는데,
   * 그건 산식을 읽어 주는 것이지 **감독이 선수를 보는 말**이 아니에요(제보:
   * "왜 밀렸는지는 저렇게 알려주지 말고 감독이 한마디 하는 느낌으로").
   * 유스 트라이아웃의 🗣️ 감독 한마디와 같은 어투를 씁니다 — 이 게임에서
   * 선수에게 판정을 알려 주는 목소리는 하나예요.
   *
   * 말은 상황마다 여러 개를 두고 **그 주에 맞춰 골라요.** 하나뿐이면 벤치가
   * 이어질 때 같은 문장이 계속 나와서 사람이 아니라 안내문이 됩니다.
   * 같은 주에는 다시 그려도 같은 말이에요 — 라운드를 키로 고릅니다. */
  /* 말에 **다음에 뭘 하라는 한마디**를 붙여요. {w}는 지금 붙잡아야 할 능력치예요.
   * 숫자 줄("실력 3번째 · 선발 확률 53%")은 뺐습니다 — 감독은 확률을 읽어 주지
   * 않아요(제보: "숫자 줄은 적지 마.. 그냥 컨디션 조절해, 슛 연습해 이런 식으로"). */
  const COACH_FAR = [
    "아직 순번이 있어. {w} 연습부터 하고 오게.",
    "네 앞에 몇 명이 있네. {w}{를} 더 갈고닦아.",
    "조급해하지 마. 다만 지금은 네 앞에 사람이 있어 — {w}부터 붙이자.",
  ];
  const COACH_NEAR = [
    "네 앞에 딱 한 명이야. {w}만 조금 더 올리면 넘어.",
    "간발의 차였어. {w} 연습 한 번만 더 하고 오게.",
    "저 친구를 넘는 건 시간문제야. {w}{를} 붙여.",
  ];
  const COACH_COND = [
    "몸이 덜 올라왔더군. 오늘은 쉬고 컨디션부터 올리게.",
    "훈련장에서 보니 다리가 무겁더라. 무리시킬 수 없지 — 푹 쉬어.",
    "실력은 알아. 그런데 이 몸으로는 못 내보내. 컨디션 조절해.",
  ];
  const COACH_FORM = [
    "요즘 경기가 아쉬웠어. {w} 감각부터 되찾자.",
    "실력은 알지만 최근 경기력이 안 올라와. 다시 보여주게.",
    "지금은 흐름이 안 좋아. 한 주 끊고 {w}에 집중해.",
  ];
  const COACH_ROT = [
    "오늘은 다른 친구를 써보려고 하네. 컨디션 잘 챙기고 있게.",
    "체력을 아껴두게. 곧 쓸 일이 있어.",
    "자네가 못해서가 아니야. 훈련장에서 {w}이나 좀 다듬고 있게.",
  ];

  /* 지금 붙잡아야 할 능력치 — 포지션 주력이 평균보다 처졌으면 그것부터,
   * 아니면 가장 낮은 칸이에요. 감독이 "슛 연습해"라고 할 때 그 슛이 실제로
   * 내가 제일 아쉬운 자리여야 말이 조언이 됩니다. */
  // 받침이 있으면 을/이, 없으면 를/가 — 마지막 글자의 한글 코드로 봅니다
  const hasJong = (word) => {
    const c = word.charCodeAt(word.length - 1) - 0xac00;
    return c >= 0 && c <= 11171 && c % 28 !== 0;
  };

  function weakSpot() {
    const main = STAT_DEFS.find((d) => d.key === (POS_INFO[S.pos] || {}).stat);
    const avg = STAT_DEFS.reduce((a, d) => a + (S.stats[d.key] || 0), 0) / STAT_DEFS.length;
    if (main && (S.stats[main.key] || 0) < avg) return main;
    return STAT_DEFS.slice().sort((a, b) => (S.stats[a.key] || 0) - (S.stats[b.key] || 0))[0];
  }

  function benchReason(L) {
    const b = L.bonus;
    const pool = L.rank > L.slots + 1 ? COACH_FAR
      : L.rank > L.slots ? COACH_NEAR
      : b.cond <= -1.5 ? COACH_COND
      : b.form <= -1.5 ? COACH_FORM
      : COACH_ROT;
    const week = (S.activity && S.activity.week) || 0;
    const w = weakSpot();
    /* 조사는 능력치 이름의 받침을 보고 골라요 — "수비을(를)"처럼 적으면
     * 감독의 말이 아니라 안내문이 됩니다. */
    const say = pool[Math.abs(week + L.rank) % pool.length]
      .replace(/\{w\}/g, `${w.emoji} ${w.name}`)
      .replace(/\{를\}/g, hasJong(w.name) ? "을" : "를");
    return `<div class="coach-say">🗣️ 감독 — “${say}”</div>`;
  }



  /* 🪑 벤치 주 — 경기를 못 뛴 대신 능력치 하나가 올라요.
   * 결장이 곧 성장 정지가 되면 벤치는 그냥 벌이 되고, 그건 이탈로 이어져요. */
  const BENCH_GAIN = [1.6, 3.2];
  function benchTurn() {
    const defs = Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos];
    const pool = defs.filter((d) => S.stats[d.key] < statCap(d.key));
    const d = pick(pool.length ? pool : defs);
    const gain = Math.round(rand(BENCH_GAIN[0], BENCH_GAIN[1]) * S.talents[d.key] * 10) / 10;
    S.stats[d.key] = clamp(S.stats[d.key] + gain, 0, statCap(d.key));
    S.condition = clamp(S.condition + randInt(4, 10), 0, 100);   // 안 뛰었으니 몸은 쉬어요
    return { key: d.key, name: d.name, emoji: d.emoji, gain };
  }

  /* 동료 골을 넣을 사람 — **선발 중에서** 포지션 가중으로 뽑아요.
   * 나는 빼요. 내 골은 이미 내 기록으로 따로 쌓입니다. */
  const SCORE_W = { fw: 1.0, wg: 0.75, mf: 0.4, df: 0.12 };
  function pickScorer() {
    const xi = matchXI().filter((x) => !x.me);
    if (!xi.length) return null;
    let total = 0;
    for (const x of xi) total += (SCORE_W[x.pos] || 0.4) * (x.str / 70);
    let r = Math.random() * total;
    for (const x of xi) {
      r -= (SCORE_W[x.pos] || 0.4) * (x.str / 70);
      if (r <= 0) return x;
    }
    return xi[xi.length - 1];
  }
  /* 이번 경기에서 동료가 넣은 골을 실제 선수에게 배분해요. 이름 배열을 돌려줘서
   * 중계가 그대로 쓰고, 그 선수의 시즌 기록에도 쌓입니다. */
  function creditMateGoals(n) {
    const names = [];
    for (let i = 0; i < n; i++) {
      const who = pickScorer();
      if (!who) break;
      who.g += 1;
      names.push(who.name);
    }
    return names;
  }
  // 선발이 한 경기를 치렀다고 표시해요 (명단 화면의 출전 수)
  function markApps() { for (const x of matchXI()) x.apps += 1; }

  /* 새 시즌 — 리그 전체의 시즌 기록만 비워요. 나이는 여기서 안 먹여요.
   * 나이는 **시즌이 끝날 때**(finishYear → ageSquads) 먹습니다 — 결산 화면에
   * 그 시즌의 팀 소식을 적으려면 결산을 그리기 전에 이미 늙어 있어야 해요. */
  function resetSeason() {
    if (!S.squads) return;
    for (const club of Object.keys(S.squads)) {
      for (const x of S.squads[club]) { x.g = 0; x.a = 0; x.d = 0; x.apps = 0; }
    }
    backfillAges();
  }

  /* 🗞️ 시즌 결산에 얹는 우리 팀 소식 한 줄. 아무 일도 없었으면 빈 문자열이에요. */
  function newsLine() {
    const n = S.squadNews;
    if (!n) return "";
    const top = (list, k) => list.slice().sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[k];
    const bits = [];
    const g = top(n.surge, 0) || top(n.grew, 0);
    if (g) bits.push(`📈 ${g.name} ${g.d > 0 ? "+" : ""}${g.d.toFixed(1)}`);
    const f = top(n.slump, 0) || top(n.fell, 0);
    if (f) bits.push(`📉 ${f.name} ${f.d.toFixed(1)}`);
    if (n.gone.length) bits.push(`👋 ${n.gone.map((x) => `${x.name}(${x.age}세)`).join(" · ")} 은퇴`);
    return bits.length ? `🗞️ 팀 소식 — ${bits.join(" · ")}` : "";
  }

  // ---------- 화면 ----------
  function squadHTML() {
    const xi = matchXI();
    const inXI = new Set(xi);
    const sq = ensureSquad();
    /* 📈 나이와 그 시즌 상태를 이름 아래 적어요 — 안 보이면 동료가 크고 늙는 게
     * 화면에서는 그냥 숫자가 달라진 것으로만 보입니다. 옛 세이브(나이 없음)는
     * 칸 자체를 안 그려요. */
    const tag = (x) => {
      if (x.me || x.age == null) return "";
      const f = formOf(x);
      const mark = f < 0 ? ` <b class="sq-slump">📉 부진</b>` : f > 0 ? ` <b class="sq-surge">🔥 상승세</b>` : "";
      const young = x.age <= 21 ? " 🌱" : x.age >= 33 ? " 🕯️" : "";
      return `<span class="sq-age">${x.age}세${young}${mark}</span>`;
    };
    const row = (x) => `<tr class="${x.me ? "me" : ""}">`
      + `<td>${x.name}${x.me ? " <b>(나)</b>" : ""}${tag(x)}</td>`
      + `<td class="sq-pos">${posName(x.pos)}</td>`
      + `<td class="sq-str">${Math.round(x.str)}</td>`
      + `<td class="sq-rec">${x.apps ? `${x.apps}경기 ⚽${x.g}` : "-"}</td></tr>`;
    const group = (list) => list.map(row).join("");
    const bench = sq.filter((x) => !inXI.has(x)).sort((a, b) => b.str - a.str);
    const L = myLine();
    const head = `<tr><th>선수</th><th>포지션</th><th>실력</th><th>기록</th></tr>`;
    const b = L.bonus;
    const sign = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;
    /* 확률이 어디서 나왔는지 숫자로 펼쳐요 — 안 보이면 "컨디션이 다 정하나?"가 돼요 */
    const parts = `실력 ${Math.round(L.line.find((x) => x.me).str)}`
      + ` · 컨디션 ${sign(b.cond)}`
      + ` · 폼 ${b.avg == null ? "—" : sign(b.form)}`
      + ` · 그날 흔들림 ±${FORM_SWING}`
      /* 몸이 바닥이면 감독이 뺄 수 있다는 걸 확률 옆에 적어요 */
      + (L.rest > 0 ? `<br/>🛌 몸이 상해서 감독이 뺄 수 있어요 (−${Math.round(L.rest * 100)}%)` : "");
    return `<div class="sq-note">${
      isStarter()
        ? `✅ <b>이번 경기 선발</b> — ${posName(S.pos)} ${L.slots}자리 중 실력 ${L.rank}번째`
        : `🪑 <b>이번 경기 벤치</b> — ${posName(S.pos)} ${L.slots}자리 · 실력 ${L.rank}번째`}`
      + `<br/><span class="sq-odds">선발 확률 ${Math.round(L.odds * 100)}%</span>`
      + `<br/><span class="sq-parts">${parts}</span></div>`
      + `<table class="rank-table season-standings squad-table"><thead>${head}</thead>`
      + `<tbody><tr class="sq-sep"><td colspan="4">⚽ 선발 11</td></tr>${group(xi)}`
      + `<tr class="sq-sep"><td colspan="4">🪑 벤치 ${bench.length}</td></tr>${group(bench)}</tbody></table>`;
  }

  /* 👥 명단 레이어 — 준비 화면에 펼쳐 두면 자리를 너무 먹어요(제보).
   * base.css의 .av-overlay/.av-modal을 그대로 빌려 써요 — 8종이 같이 쓰는
   * 모달 껍데기라 여기서 새로 만들지 않습니다. */
  function openSquad() {
    if (document.querySelector(".squad-overlay")) return;
    const wrap = document.createElement("div");
    wrap.className = "av-overlay squad-overlay";
    const L = myLine();
    /* HUD 버튼은 준비 화면을 그릴 때 한 번 적히고 그대로 남아요. 그 사이에
     * 상태가 움직이면 버튼과 레이어가 다른 숫자를 적게 됩니다(제보: "HUD랑
     * 레이어랑 선발 확률값이 다른데"). 레이어를 여는 김에 버튼도 같은 계산으로
     * 다시 적어요 — 두 숫자가 어긋날 자리를 아예 없앱니다. */
    const hud = document.getElementById("btn-squad-pro");
    if (hud && !hud.hidden) hud.textContent = `👥 선발 ${Math.round(L.odds * 100)}%`;
    wrap.innerHTML = `<div class="av-modal squad-modal">
      <div class="av-title">👥 ${S.group} 스쿼드</div>
      ${squadHTML()}
      <div class="av-actions"><button class="btn btn-primary" id="btn-squad-close">닫기</button></div>
    </div>`;
    // 바깥을 눌러도 닫혀요 — 모달 안을 누를 때는 안 닫히게 대상까지 봅니다
    wrap.addEventListener("click", (ev) => { if (ev.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
    document.getElementById("btn-squad-close").onclick = () => wrap.remove();
    void L;
  }

  return {
    openSquad, rollLineup, matchXI, FORM_SWING,
    ensureSquads, ensureSquad, squadOf, startingXI, startingXIOf, leagueFaces,
    isStarter, myLine, benchReason, myBonus, restP, benchTurn, creditMateGoals, markApps, resetSeason, squadHTML,
    ageSquads, newsLine, ageCurve,
    FORMATION, BENCH, SQUAD_SIZE, BENCH_GAIN, SCORE_W, REST_BAR, REST_MAX,
    AGE_MIN, AGE_MAX, PEAK_AGE, RETIRE_AGE, SLUMP_P, SURGE_P, STR_SPREAD, MEAN_CURVE,
    _t: { rollSquad, pickScorer, rollPlayer, strOfRow, moveMe, backfillAges },
  };
})();
