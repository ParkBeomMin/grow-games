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
      for (let i = 0; i < need[p]; i++) {
        list.push({
          name: randomPlayerName(Math.random() < 0.55 ? null : MARKETS.find((m) => m.id === "eu")),
          pos: p, str: clamp(base + rand(-STR_SPREAD, STR_SPREAD), 25, 99),
          g: 0, a: 0, d: 0, apps: 0,
        });
      }
    }
    if (mine) {
      /* 내 자리 하나를 나로 바꿔요. 스쿼드에는 **나도 한 줄로** 들어가야
       * 선발 경쟁이 같은 표 안에서 벌어져요. */
      const at = list.findIndex((x) => x.pos === S.pos);
      list[at] = { me: true, name: S.name, pos: S.pos, str: overall(), g: 0, a: 0, d: 0, apps: 0 };
    }
    return list.slice(0, SQUAD_SIZE);
  }

  /* 리그의 **모든 클럽** 명단을 세이브에 둬요. 리그나 내 클럽이 바뀌면 다시 꾸립니다.
   * 옛 세이브에는 아예 없어요 — 마이그레이션하지 않고 여기서 만듭니다.
   * 크기는 6팀 × 16명 = 96줄이라 세이브에 담아도 부담이 없어요. */
  function ensureSquads() {
    if (!S || !S.group) return {};
    const lg = leagueOf(S).id;
    if (!S.squads || S.squadsLeague !== lg || S.squadClub !== S.group) {
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
    }
    refreshMe();
    return S.squads;
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

  /* 이번 경기 선발을 뽑아 활동 기록에 새겨요. 같은 라운드를 다시 그려도
   * 흔들리지 않게 **한 번 정하면 그 라운드 동안 고정**입니다. */
  function rollLineup() {
    const sq = ensureSquad();
    const picked = [];
    for (const p of POS_KEYS) {
      const line = sq.filter((x) => x.pos === p)
        .map((x) => ({ x, v: lineupScore(x) })).sort((a, b) => b.v - a.v);
      picked.push(...line.slice(0, FORMATION[p]).map((e) => e.x));
    }
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
  function leagueFaces(n) {
    const all = [];
    for (const club of Object.keys(ensureSquads())) {
      const xi = startingXIOf(club).filter((x) => !x.me).sort((a, b) => b.str - a.str);
      xi.forEach((x, i) => all.push({ club, player: x, seed: x.str - i * 2 }));
    }
    all.sort((a, b) => b.seed - a.seed);
    /* 클럽마다 최소 한 명씩 먼저 넣고, 남는 자리를 실력 순으로 채워요 —
     * 안 그러면 강팀 선수만 표를 채워서 "리그 경쟁"이 아니라 "그 팀 명단"이 돼요. */
    const out = [], used = new Set(), byClub = new Set();
    for (const cand of all) {
      if (byClub.has(cand.club)) continue;
      out.push(cand); used.add(cand.player); byClub.add(cand.club);
      if (out.length >= n) break;
    }
    for (const cand of all) {
      if (out.length >= n) break;
      if (used.has(cand.player)) continue;
      out.push(cand); used.add(cand.player);
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
    return { rank, of: line.length, slots: FORMATION[S.pos], line, odds: hit / N, bonus };
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

  /* 새 시즌 — 리그 전체의 시즌 기록만 비워요. 명단은 그대로예요. */
  function resetSeason() {
    if (!S.squads) return;
    for (const club of Object.keys(S.squads)) {
      for (const x of S.squads[club]) { x.g = 0; x.a = 0; x.d = 0; x.apps = 0; }
    }
  }

  // ---------- 화면 ----------
  function squadHTML() {
    const xi = matchXI();
    const inXI = new Set(xi);
    const sq = ensureSquad();
    const row = (x) => `<tr class="${x.me ? "me" : ""}">`
      + `<td>${x.name}${x.me ? " <b>(나)</b>" : ""}</td>`
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
      + ` · 그날 흔들림 ±${FORM_SWING}`;
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
    isStarter, myLine, benchReason, myBonus, benchTurn, creditMateGoals, markApps, resetSeason, squadHTML,
    FORMATION, BENCH, SQUAD_SIZE, BENCH_GAIN, SCORE_W,
    _t: { rollSquad, pickScorer },
  };
})();
