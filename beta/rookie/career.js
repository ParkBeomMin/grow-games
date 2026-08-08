/* 프로 커리어 · 명예의 전당 · 배틀 아레나 — 더 드래프트 확장
 * game.js의 전역(S, $, rand, randInt, pick, clamp, shuffle, show, save, clearSave,
 * STAT_DEFS, overall)을 사용하므로 반드시 game.js 뒤에 로드해야 해요. */
"use strict";

window.Career = (() => {
  const HOF_KEY = "grow-hof-v1";
  const BATTLE_KEY = "grow-battle-v1";

  // 내장 고스트 상대 (전부 가상의 선수)
  const GHOSTS = [
    { id: "g1", name: "미스터 제로 한무실", bp: 690 },
    { id: "g2", name: "홈런공장장 장외포", bp: 640 },
    { id: "g3", name: "안타기계 오출루", bp: 560 },
    { id: "g4", name: "도루왕 발바람", bp: 470 },
    { id: "g5", name: "철벽 포수 벽창호", bp: 420 },
    { id: "g6", name: "언더핸드 마구사", bp: 350 },
    { id: "g7", name: "괴물 신인 고신인", bp: 280 },
    { id: "g8", name: "연습생 신화 백지명", bp: 180 },
  ];

  // 명예의 전당에 남은 옛 구단·학교 이름도 새 이름으로 보여줘요
  // (서버에 이미 올라간 기록은 못 바꾸니, 표시할 때 갈아끼웁니다)
  const loadHof = () => migrateNames(JSON.parse(localStorage.getItem(HOF_KEY) || "[]"));
  const saveHof = (list) => localStorage.setItem(HOF_KEY, JSON.stringify(list));
  const loadBattle = () => JSON.parse(localStorage.getItem(BATTLE_KEY) || "{}");
  // 대전 기록도 백업 대상(keysOf)이에요. touch()로 표시해두지 않으면 다음 pull에
  // 조용히 덮여 사라져요.
  const saveBattle = (d) => {
    localStorage.setItem(BATTLE_KEY, JSON.stringify(d));
    if (window.Cloud) Cloud.touch();
  };
  const bpOf = (score, ovr) => Math.round(score * 0.4 + ovr * 3);

  // ---------- 드래프트 훅 ----------
  function onDraft(score, team) {
    const actions = document.querySelector("#screen-draft .draft-actions");
    document.getElementById("btn-go-pro")?.remove();
    document.getElementById("btn-retire-now")?.remove();
    const drafted = score >= 270; // 육성선수 이상
    const btn = document.createElement("button");
    if (drafted) {
      S.team = team;
      save();
      btn.id = "btn-go-pro";
      btn.className = "btn btn-primary";
      btn.textContent = "⚾ 프로 무대로!";
      btn.onclick = () => enterPro(team);
    } else {
      btn.id = "btn-retire-now";
      btn.className = "btn btn-ghost";
      btn.textContent = "🏛️ 기록 남기고 은퇴";
      btn.onclick = () => enshrine(null);
      clearSave();
    }
    actions.prepend(btn);
  }

  // ---------- 프로 커리어 ----------
  function enterPro(team) {
    S.phase = "pro";
    S.team = team;
    S.age = 19;
    S.proYear = 0;
    S.career = { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    S.proLog = [];
    S.role = assignRole();
    if (window.Stats) Stats.log("pro_enter", { team, role: S.role });
    startCamp();
  }

  // 능력치에 따라 타순/투수 보직 배정 (매 시즌 재평가)
  function assignRole() {
    if (S.pos === "batter") {
      const { contact, power, run } = S.stats;
      if (Math.max(contact, power, run) < 55) return "6번 타자";
      if (power >= contact && power >= run) return "4번 타자";
      if (run > contact) return "1번 타자";
      return "3번 타자";
    }
    if (S.stats.stamina >= 55) return "선발 투수";
    if (S.stats.velocity >= S.stats.control) return "마무리 투수";
    return "불펜 투수";
  }

  function proLog(msg) {
    S.proLog.unshift(`[${S.proYear}년차] ${msg}`);
    S.proLog = S.proLog.slice(0, 30);
  }

  function startCamp() {
    // 가을야구 화면이 순위표를 펼쳐놨어요. 새 시즌은 접힌 채로 시작해요.
    const sb = $("pro-standings");
    if (sb) sb.open = false;
    S.proYear += 1;
    S.camp = 3;
    S.condition = 80;
    driftTeamStr();
    if (S.tradeSour) {                 // 트레이드로 잡음이 있었던 해
      S.condition = 60;
      S.tradeSour = false;
      proLog(`😐 트레이드 잡음의 여파로 캠프 분위기가 어색해요 (컨디션 ${S.condition})`);
    }
    S.season = null;
    const newRole = assignRole();
    if (newRole !== S.role) {
      proLog(`📋 코칭스태프 결정: 올 시즌 보직은 ${newRole}! (지난 시즌 ${S.role || "신인"})`);
      S.role = newRole;
    }
    proLog(`⛺ ${S.proYear}년차 스프링캠프 시작! (${S.age}세 · ${S.role})`);
    save();
    renderPro();
    show("screen-pro");
  }

  function renderPro() {
    $("pro-name").textContent = `${S.name} (${S.pos === "batter" ? "타자" : "투수"})`;
    $("pro-team").innerHTML = `⚾ ${leagueBadge()}${S.team} · ${S.role || ""} · ${S.age}세 · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = S.season ? `G ${S.season.game}/${S.season.total} · ${myRank()}위` : `캠프 훈련 ${3 - S.camp}/3`;
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
    renderStandings();
    $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    const stats = $("pro-stats");
    stats.innerHTML = "";
    for (const d of STAT_DEFS[S.pos]) {
      const v = Math.round(S.stats[d.key]);
      const tv = S.talents[d.key], tl = transLv(d.key);
      const stars = "⭐".repeat(talentStars(tv)) + (isTalentMax(tv) ? (tl ? ` <span class="tr">✨${tl}</span>` : " MAX") : "");
      const row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML = `
        <span class="stat-name">${d.emoji} ${d.name}</span>
        <div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>
        <span class="stat-val${v >= statCap(d.key) ? " max" : ""}" title="상한 ${statCap(d.key)}">${v}</span>
        <span class="stat-pot" title="잠재력 — 별이 많을수록 훈련 효율이 높아요">${stars}</span>`;
      if (v >= 100) {
        const aw = document.createElement("button");
        aw.className = "mini-btn awaken-btn" + (v >= statCap(d.key) ? " ready" : "");
        aw.textContent = isTalentMax(tv) ? "🌠 초월" : "🔮 각성";
        aw.onclick = () => { if (awakenTalent(d.key, proLog)) renderPro(); };
        row.appendChild(aw);
      }
      stats.appendChild(row);
    }

    $("pro-camp-title").textContent = S.season
      ? (S.pendingGame ? `⚾ 경기일! G${S.season.game + 1} 준비 완료 — 경기를 시작하세요` : `시즌 중 — 다음 경기 전 훈련 ${S.camp}회 남음`)
      : `스프링캠프 — 남은 훈련 ${S.camp}회, 끝나면 시즌 개막!`;
    const box = $("pro-actions");
    box.innerHTML = "";
    for (const d of STAT_DEFS[S.pos]) {
      const btn = document.createElement("button");
      // 상한에 닿으면 훈련해도 오르지 않아요 — 각성/초월로 바꿔줍니다
      if (atCap(d.key)) {
        const tmax = isTalentMax(S.talents[d.key]);
        const pct = Math.round((tmax ? transP(transLv(d.key)) : awakenP(Math.round(S.stats[d.key]))) * 100);
        btn.dataset.key = d.key;
        btn.className = "action-btn awaken-act";
        btn.innerHTML = `<span class="a-emoji">${tmax ? "🌠" : "🔮"}</span>${d.name} ${tmax ? "초월 각성" : "재능 각성"}<span class="a-sub">상한 ${statCap(d.key)} 도달 · 성공률 ${pct}%</span>`;
        btn.onclick = () => { if (awakenTalent(d.key, proLog)) renderPro(); };
      } else {
        btn.dataset.key = d.key;
        btn.className = "action-btn";
        btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
        btn.onclick = () => campAction(d);
      }
      box.appendChild(btn);
    }
    box.appendChild(makeAdSlotButton(renderPro));
    const rest = document.createElement("button");
    rest.className = "action-btn rest";
    rest.dataset.key = "__rest";
    rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 회복</span>`;
    rest.onclick = () => campAction(null);
    box.appendChild(rest);

    // 경기일 — 훈련 잠그고 경기 시작 버튼만 (📺 특훈은 턴 미소모라 허용)
    if (S.season && S.pendingGame) {
      box.querySelectorAll(".action-btn").forEach((b) => {
        if (!b.classList.contains("ad-slot")) b.disabled = true;
      });
      const go = document.createElement("button");
      go.className = "action-btn rest go-game";
      go.innerHTML = `<span class="a-emoji">⚾</span>경기 시작<span class="a-sub">G${S.season.game + 1}/${S.season.total} vs ${nextOpp()}</span>`;
      go.onclick = playProGame;
      box.appendChild(go);
    }

    /* 🔁 시즌 중 트레이드 — 창구가 열려 있을 때만 보여요.
     * 위의 경기일 잠금 루프가 끝난 뒤에 붙여요. 협상은 턴을 쓰지 않아서
     * 경기일에 눌러도 상관없거든요. */
    if (inSeasonTrade()) {
      const tr = document.createElement("button");
      // 훈련 타일과 성격이 달라요. 휴식·경기 시작과 같이 3칸을 다 쓰는 가로 버튼으로 둡니다.
      tr.className = "action-btn rest";
      tr.dataset.key = "__trade";
      const left = tradeCloseAt() - S.season.game;
      // 가로 배치라 한 줄에 늘어서요. 서브 문구가 길면 넘쳐서 짧게 씁니다.
      const sub = S.trade ? "협상 이어하기"
        : left <= 0 ? "오늘이 마감 · 컨디션 소모"
        : `마감까지 ${left}경기 · 컨디션 소모`;
      tr.innerHTML = `<span class="a-emoji">🔁</span>트레이드 요청<span class="a-sub">${sub}</span>`;
      tr.onclick = startTrade;
      box.appendChild(tr);
    }

    $("pro-log").innerHTML = (S.proLog || [])
      .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
      .join("");
  }

  function campAction(def) {
    // 상한에 닿았으면 훈련은 턴만 소모돼요 — 각성으로 돌려줍니다
    if (def && atCap(def.key)) { if (awakenTalent(def.key, proLog)) renderPro(); return; }
    if (def) {
      const ageMod = S.age <= 23 ? 1.1 : S.age <= 27 ? 1.0 : S.age <= 30 ? 0.75 : 0.45;
      const failP = S.condition < 40 ? 0.15 : 0.07;
      if (Math.random() < failP) {
        const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
        S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
        S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
        proLog(`😵 ${def.name} 훈련이 꼬였어요… -${loss.toFixed(1)}`);
      actFx(def.key, "-" + loss.toFixed(1), true);
        S.camp -= 1;
        save();
        afterCamp();
        return;
      }
      const condMod = S.condition >= 70 ? 1.1 : S.condition >= 40 ? 1.0 : 0.6;
      let gain = rand(1.8, 3.6) * S.talents[def.key] * ageMod * condMod;
      if (S.stats[def.key] >= 100) gain *= 0.5;
      gain = Math.round(gain * 10) / 10;
      S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, statCap(def.key));
      S.condition = clamp(S.condition - randInt(10, 16), 0, 100);
      proLog(`${def.emoji} ${def.name} 훈련 +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);
      actFx(def.key, "+" + gain.toFixed(1));
    } else {
      S.condition = clamp(S.condition + randInt(25, 40), 0, 100);
      proLog(`🛌 컨디션 회복 (${Math.round(S.condition)})`);
    }
    S.camp -= 1;
    save();
    afterCamp();
  }

  const SEASON_MOMENTS_BAT = [
    "개막 시리즈부터 멀티히트로 존재감! 🏏",
    "5월, 끝내기 안타로 팀을 구했어요 🔥",
    "올스타 브레이크 전까지 맹타 행진 ⚡",
    "8월 무더위에도 페이스가 떨어지지 않아요 💪",
    "시즌 막판, 중요한 순간마다 해결사 노릇 🎯",
  ];
  const SEASON_MOMENTS_PIT = [
    "개막전 선발 등판, 5이닝 무실점! 🧊",
    "6월, 시즌 첫 완봉승을 따냈어요 🔥",
    "올스타전에서 최고 구속을 갈아치웠어요 ⚡",
    "여름철 연투에도 흔들림이 없어요 💪",
    "포스트시즌이 걸린 경기에서 역투! 🎯",
  ];

  // ---------- 시즌 (리그별 경기 수만큼 한 경기씩) ----------
  /* 지금 뛰는 리그의 구단 목록이에요. 옛 세이브(S.league 없음)는 KBO 구단만 나와요 —
   * leagueOf가 막아주니 여기서 따로 마이그레이션하지 않아요.
   * 상수가 아니라 함수인 건 해외로 나가면 목록이 통째로 바뀌기 때문이에요. */
  const leagueTeams = () => teamsOf(leagueOf(S));
  /* 리그 표에 games가 없던 시절의 값이에요. leagueOf가 옛 세이브를 KBO로 받아주니
   * 실제로는 안 쓰이지만, 표가 깨져도 시즌이 0경기로 끝나지 않게 남겨둡니다. */
  const SEASON_TOTAL = 144;
  const seasonTotal = () => leagueOf(S).games || SEASON_TOTAL;
  /* 진행 중인 시즌의 경기 수예요. **저장본에 적힌 total이 정본**이고, 없을 때만
   * 지금 리그로 떨어져요. 시즌 도중에 리그가 바뀌는 길은 없지만(포스팅은 오프시즌,
   * 트레이드는 같은 리그 안), 여기를 매번 다시 계산하면 그런 길이 하나라도 생기는 순간
   * 진행 중인 시즌의 길이가 바뀌어서 순위표와 트레이드 창구가 어긋나요. */
  const curTotal = () => (S.season && S.season.total) || seasonTotal();

  /* 🏋️ 한 시즌이 주는 훈련 횟수예요.
   *
   * 예전에는 경기마다 2회, 3연전이 끝나는 경기(이동일이 끼는 날)에는 3회를 줬어요.
   * 144경기면 144×2 + 48 = 336회입니다.
   *
   * 🌏 경기 수가 리그마다 달라지면서 이 합까지 같이 늘면 안 돼요. 162경기 리그는
   * 훈련 기회도 12.5% 많아져서 능력치가 더 빨리 커요. 그러면 난이도(oppUp·lgUp)로
   * 깎아둔 몫을 성장 속도로 되돌려받게 돼서, **해외 진출이 도박이 아니라 정답**이 됩니다.
   * 사다리 검사는 능력치를 고정해 두고 재기 때문에 이 새는 구멍을 못 봐요.
   *
   * 그래서 총 훈련 횟수를 336회로 못 박고 시즌 길이에 맞춰 나눠 줘요.
   * 긴 시즌은 이동일이 덜 자주 오는 셈이에요 — 한 해에 쉬는 날 수는 같으니까요.
   *
   * ⚠️ 144경기에서는 예전 식과 **한 톨도 안 달라요.** floor(g×336/144) = floor(g×7/3)이라
   * 칸 사이 차이가 2,2,3 …으로 돌아서 3연전 경계에서만 3회가 나오거든요.
   * 난수를 안 쓰니 옛 세이브의 난수 호출 횟수도 그대로예요.
   * tests/rookie/club-test.js ⑧이 두 성질을 다 지켜요. */
  const CAMP_BASE_GAMES = 144;
  const CAMP_TURNS = 336;                      // 144경기 × 2회 + 3연전 경계 48번
  const campAt = (g, total) => Math.floor((g * CAMP_TURNS) / (total || CAMP_BASE_GAMES));
  const campAfter = (g, total) => campAt(g, total) - campAt(g - 1, total);

  function runSeason() {
    if (!S.season) initSeason();
    S.pendingGame = true;
    save();
    renderPro();
    show("screen-pro");
  }

  function afterCamp() {
    if (S.camp > 0) { renderPro(); return; }
    if (S.season) {
      S.pendingGame = true;
      save();
      renderPro();
      show("screen-pro");
    } else {
      runSeason();
    }
  }

  function initSeason() {
    S.season = {
      game: 0,
      total: seasonTotal(),
      teamW: 0,
      teamL: 0,
      // 팀 전력은 저장본에 남아요 — 이적할 때 '어느 팀인지'가 의미를 가지려면 필요해요
      others: leagueTeams().filter((t) => t !== S.team).map((name) => ({ name, w: 0, l: 0, str: teamStrOf(name) })),
      stats: S.pos === "batter" ? { ab: 0, hits: 0, hr: 0, sb: 0 } : { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 },
    };
    // 🏅 개인 기록 순위 — 이번 시즌 라이벌 필드. 자체 시드로만 굴려요(전역 난수 안 씀).
    S.season.raceSeed = ((S.proYear || 1) * 2654435761) >>> 0;
    S.season.race = rollRace();
    save();
  }

  /* ---------- 🏅 개인 기록 순위 (라이벌 레이스) ----------
   * 더 윙어의 개인 순위와 같은 결이에요. 리그 각 팀의 간판 선수(squad.js)가 매 경기
   * 실제로 안타·홈런을 쌓고, 나와 같은 잣대로 한 표에 줄서요. 시즌이 끝나면 종목 1위가
   * 그 부문 타이틀을 가져가요 — 화면에서 보던 순위가 곧 수상 결과예요.
   *
   * ⚠️ 라이벌 시뮬은 **전역 Math.random을 절대 안 써요.** S.season.raceSeed에서 갈라낸
   * 자체 시드 PRNG로만 굴려요. 정규시즌 마지막 경기부터 도는 밸런스 시뮬(post-mech ⑤)이
   * 이 난수에 흔들리면 안 되니까요. 그래서 재현·테스트도 쉬워요. */
  const RACE_ANCHOR = {
    batter: { hits: 185, hr: 48, sb: 70, avg: 0.333 },
    pitcher: { wins: 15, k: 415, saves: 42, era: 2.5 },
  };
  const RACE_COUNTS = { batter: ["hits", "hr", "sb"], pitcher: ["wins", "k", "saves"] };
  let raceKey = null;   // 지금 보고 있는 순위 탭 (저장 안 해요 — 화면 상태예요)

  // 크누스 포아송 — 평균 mean으로 정수 하나. rng는 넘겨받은 시드 PRNG예요(전역 난수 아님).
  function racePoisson(rng, mean) {
    if (mean <= 0) return 0;
    const L = Math.exp(-mean); let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  // 종목 지터를 비율 스탯(타율·자책)엔 좁게 눌러요 — 안 그러면 타율이 .27~.44로 튀어요.
  const rateJit = (j) => 1 + (j - 0.985) * 0.4;

  /* 이번 시즌 라이벌 필드를 만들어요. 다른 팀마다 간판 선수(내 시점과 같은 타자/투수)를
   * 한 명씩 세우고, 각자의 시즌 목표치(누적은 경기마다 쌓고, 비율은 고정)를 잡아요. */
  const squadLib = () => (typeof window !== "undefined" ? window.RookieSquad : null);
  function rollRace() {
    const cls = S.pos;
    const others = leagueTeams().filter((t) => t !== S.team);
    const seed = (S.proYear || 1);
    const RS = squadLib();
    const book = RS ? RS.build(others.concat([S.team]), teamStrOf, seed) : null;
    const counts = RACE_COUNTS[cls], anch = RACE_ANCHOR[cls];
    return others.map((team, i) => {
      const star = book ? book[team][cls]
        : { name: fallbackName(team, seed, i), pop: clamp((teamStrOf(team) - 0.34) / 0.30, 0.4, 1), jit: {} };
      const pop = star.pop, popF = 0.55 + 0.5 * pop;
      const jit = (k) => star.jit[k] || 1;
      const rate = {};
      for (const k of counts) rate[k] = (anch[k] * popF * jit(k)) / (S.season.total || 144);
      const r = { name: star.name, team, pop, rate };
      for (const k of counts) r[k] = 0;
      if (cls === "batter") r.avg = +(anch.avg * (0.88 + 0.13 * pop) * rateJit(jit("avg"))).toFixed(3);
      else r.era = +(anch.era * (1.35 - 0.5 * pop) * rateJit(jit("era"))).toFixed(2);
      return r;
    });
  }
  // squad.js가 아직 없을 때(옛 캐시·시뮬 하네스)만 쓰는 이름 — 전역 난수 안 써요.
  function fallbackName(team, seed, i) {
    const P = ["강태풍", "이대포", "박홈런", "최강속", "정교타", "김일발", "윤노히", "장수호", "임쾌속", "조폭투"];
    return P[(hashStr(team) + seed * 7 + i * 3) % P.length];
  }
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /* 경기 한 판만큼 라이벌 기록을 굴려요 (finishProGame에서 sn.game을 올린 직후에 불러요).
   * 시드는 (raceSeed, 그 경기 번호)로 갈라내서 언제 불러도 같은 결과가 나와요. */
  function raceStep() {
    const sn = S.season; if (!sn || !Array.isArray(sn.race)) return;
    const counts = RACE_COUNTS[S.pos];
    const g = sn.game;
    const seed = ((sn.raceSeed >>> 0) ^ Math.imul(g, 2654435761)) >>> 0;
    const RS = squadLib();
    const rng = RS ? RS._mulberry32(seed) : mulberry(seed);
    for (const r of sn.race) for (const k of counts) r[k] += racePoisson(rng, r.rate[k]);
  }
  // squad.js 없을 때를 위한 최소 PRNG (같은 식).
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* 옛 세이브(시즌 중인데 race가 없음)나 시뮬 하네스를 위해 지금 경기 수까지 되감아요. */
  function ensureRace() {
    const sn = S.season; if (!sn) return;
    if (Array.isArray(sn.race)) return;
    if (sn.raceSeed == null) sn.raceSeed = (S.proYear || 1) * 2654435761 >>> 0;
    sn.race = rollRace();
    const upto = sn.game || 0, save0 = sn.game;
    for (let g = 1; g <= upto; g++) { sn.game = g; raceStep(); }
    sn.game = save0;
  }

  // 나 + 라이벌을 한 종목으로 줄세워요. era만 낮은 게 위, 나머지는 큰 게 위. 동률은 내가 위(공동 수상).
  function raceRank(metric) {
    const sn = S.season; if (!sn) return [];
    ensureRace();
    const higher = !(metric === "era");
    const valOf = (x) => (metric === "avg" || metric === "era") ? (x.me ? titleMetric(sn.stats, metric) : x[metric])
      : (x.me ? (sn.stats[metric] || 0) : (x[metric] || 0));
    const me = { name: S.name, team: S.team, me: true };
    const field = (sn.race || []).concat([me]).map((x) => ({ ...x, v: valOf(x) }));
    field.sort((a, b) => (higher ? b.v - a.v : a.v - b.v) || (a.me ? -1 : b.me ? 1 : 0));
    return field;
  }
  const raceTop = (metric) => { const r = raceRank(metric); return r.length && r[0].me; };
  const raceFmt = (m, x) => (m === "avg" ? x.toFixed(3) : m === "era" ? x.toFixed(2) : Math.round(x));
  const RACE_UNIT = { hits: "안타", hr: "홈런", sb: "도루", avg: "타율", wins: "승", k: "탈삼진", era: "자책", saves: "세이브" };

  /* 순위표 HTML — 종목 탭 + 그 종목의 상위 5명(내가 5위 밖이면 내 줄을 아래에 핀). */
  function raceHTML() {
    const sn = S.season; const mine = myTitles();
    if (!sn || !mine.length) return "";
    const metrics = mine.map(([, t]) => t.metric);
    if (!raceKey || !metrics.includes(raceKey)) raceKey = metrics[0];
    const t = mine.find(([, x]) => x.metric === raceKey)[1];
    const ranked = raceRank(raceKey);
    const myIdx = ranked.findIndex((x) => x.me);
    const line = (x, i) => `<tr class="${x.me ? "me" : ""}"><td>${i + 1}</td>`
      + `<td>${x.name || "나"}${x.me ? ` <span class="rc-me">나</span>` : ""}<span class="rc-club">${x.team || ""}</span></td>`
      + `<td class="rc-v">${i === 0 ? "👑" : ""}${raceFmt(raceKey, x.v)}</td></tr>`;
    const shown = ranked.slice(0, 5).map(line).join("");
    const pinned = myIdx >= 5 ? `<tr class="rc-gap"><td colspan="3">⋯</td></tr>${line(ranked[myIdx], myIdx)}` : "";
    const tabs = mine.map(([, x]) =>
      `<button type="button" class="race-tab${x.metric === raceKey ? " on" : ""}" data-k="${x.metric}">${x.emoji} ${x.name}</button>`).join("");
    return `<div class="race-tabs">${tabs}</div>`
      + `<table class="rank-table race-table"><thead><tr><th>#</th><th>선수</th><th>${t.emoji} ${RACE_UNIT[raceKey]}</th></tr></thead>`
      + `<tbody>${shown}${pinned}</tbody></table>`
      + `<div class="race-note">👑 이 부문 1위 — 시즌이 끝나면 부문 타이틀을 받아요</div>`;
  }

  function standingsHTML() {
    const rows = [
      { name: S.team, w: S.season.teamW, l: S.season.teamL, me: true },
      ...S.season.others,
    ].sort((a, b) => b.w - a.w || a.l - b.l);
    // 게임차 = ((1위 승 - 우리 승) + (우리 패 - 1위 패)) / 2 — 야구 표준 계산이에요.
    // 반 게임 차가 나오니 .5는 살리고 .0은 떼요. 공동 1위는 전부 '-'로 보여요.
    const top = rows[0];
    const gb = (t) => {
      const g = ((top.w - t.w) + (t.l - top.l)) / 2;
      return g <= 0 ? "-" : g.toFixed(1).replace(/\.0$/, "");
    };
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>팀</th><th>승-패</th><th>게임차</th></tr></thead>
      <tbody>${rows.map((t, i) => `<tr class="${t.me ? "me" : ""}"><td>${i + 1}</td><td>${t.name}</td><td>${t.w}-${t.l}</td><td>${gb(t)}</td></tr>`).join("")}</tbody></table>`;
  }

  function myRank() {
    return S.season.others.filter((o) => o.w > S.season.teamW).length + 1;
  }

  // 📊 프로 화면의 접이식 순위표. 시즌 중이 아니면 숨겨요.
  function renderStandings() {
    const box = $("pro-standings");
    if (!box) return;
    if (!S.season) { box.hidden = true; return; }
    box.hidden = false;
    /* 🌏 해외에서는 순위표 제목에도 리그를 적어요 — 처음 보는 구단 이름만 늘어서면
     * 여기가 어느 리그인지 알 길이 없어요. KBO는 예전 문구 그대로예요. */
    const l = leagueOf(S);
    $("pro-standings-sum").textContent =
      `📊 ${l.id === 1 ? "" : `${l.flag} ${l.name} · `}${myRank()}위 · ${S.season.teamW}승 ${S.season.teamL}패`;
    const body = $("pro-standings-body");
    body.innerHTML = standingsHTML() + raceHTML();
    // 순위 탭은 한 번만 위임으로 물려요 — 눌리면 그 종목으로 다시 그려요 (화면 상태만 바뀜).
    if (!body.dataset.raceWired) {
      body.dataset.raceWired = "1";
      body.addEventListener("click", (e) => {
        const btn = e.target.closest(".race-tab");
        if (!btn || !S.season) return;
        raceKey = btn.dataset.k;
        renderStandings();
      });
    }
  }

  function nextOpp() {
    return S.season.others[Math.floor(S.season.game / 3) % S.season.others.length].name;
  }

  function teamWinP() {
    const core = S.pos === "batter"
      ? S.stats.contact * 0.45 + S.stats.power * 0.35 + S.stats.run * 0.1 + S.stats.defense * 0.1
      : S.stats.velocity * 0.35 + S.stats.control * 0.35 + S.stats.breaking * 0.2 + S.stats.stamina * 0.1;
    const agePen = S.age >= 31 ? (S.age - 30) * 0.02 : 0;
    // 소속팀 전력도 조금 섞어요. 안 그러면 강팀으로 이적해도 성적이 똑같아서
    // 이적에 '우승 도전' 같은 이유가 생기지 않아요. (내 기량이 여전히 주력)
    const teamBonus = (teamStrOf(S.team) - 0.49) * 0.45;
    return clamp(0.42 + (core * clutchAvg() - 50) / 160 + (S.condition - 50) / 600 - agePen + teamBonus, 0.25, 0.72);
  }

  /* 경기 승률 — 정규시즌은 teamWinP 그대로예요.
   * 가을야구는 상대가 정해져 있으니 상대 전력을 반영해요. 안 그러면 한국시리즈에서
   * 1위 팀을 만나는 것과 5월에 꼴찌를 만나는 게 똑같아져요. */
  function gameWinP() {
    const base = teamWinP();
    if (!inPost()) return base;
    const raw = S.post.str ? S.post.str[postOpp()] : null;
    const opp = typeof raw === "number" ? raw : 0.49;   // 0.49는 팀 전력의 한가운데예요
    return clamp(base - (opp - 0.49) * 1.8, 0.2, 0.85);
  }

  // 경기 화면 제목 — 포스트시즌엔 정규시즌 경기 번호 대신 라운드·차수를 써요.
  const gameLabel = () => (inPost()
    ? `${postLabel(S.post.myRound)} ${S.post.gameNo}차전`
    : `G${S.season.game + 1}`);
  const seasonLabel = () => (inPost()
    ? `🍂 ${S.age}살 가을야구 — ${S.team}`
    : `⚾ ${S.age}살 시즌 — ${S.team}`);

  function playProGame() {
    const sn = S.season;
    const post = inPost();
    const opp = post ? postOpp() : nextOpp();
    const isBat = S.pos === "batter";
    let mode = "full";
    if (!isBat) {
      // 가을야구는 단축 로테이션이에요 — 선발은 4경기마다, 불펜은 등판 확률이 올라가요
      if (S.role === "선발 투수") {
        const n = post ? S.post.gameNo - 1 : sn.game;
        mode = n % (post ? 4 : 5) === 0 ? "full" : "bench";
      } else {
        const p = S.role === "마무리 투수" ? (post ? 0.70 : 0.55) : (post ? 0.60 : 0.45);
        mode = Math.random() < p ? "relief" : "bench";
      }
    }
    if (mode === "full") {
      if (isBat) proBatterGame(opp);
      else proPitcherGame(opp);
    } else {
      quickGame(mode, opp);
    }
  }

  // 타자: 매 타석 미니게임 (자동 모드면 즉시 판정)
  function proBatterGame(opp) {
    const abs = randInt(3, 5);
    const abInns = { 3: [1, 4, 7], 4: [1, 3, 6, 8], 5: [1, 3, 5, 7, 8] }[abs];
    const perf = { pts: 0, line: "", highlight: "", ab: abs, hits: 0, hr: 0, sb: 0 };
    const story = { ourInn: Array(9).fill(0), oppInn: Array(9).fill(0), events: [], proAb: abInns };
    const oppRuns = randInt(1, 5);
    /* 팀 동료가 내는 점수예요. 예전에는 randInt(0,3)(평균 1.5점)이었는데,
     * 그건 내가 혼자 4점 넘게 뽑아내던 시절에 맞춰진 값이에요. 타격을 실제
     * 야구 수준으로 되돌리면서 팀도 같이 점수를 내야 승패가 말이 됩니다.
     * 소속팀 전력을 섞어서 강팀으로 이적하면 실제로 더 이깁니다. */
    const ourBg = clamp(randInt(1, 4) + Math.round((teamStrOf(S.team) - 0.49) * 6), 0, 6);
    for (let i = 0; i < oppRuns; i++) story.oppInn[randInt(0, 8)]++;
    for (let i = 0; i < ourBg; i++) story.ourInn[randInt(0, 8)]++;
    $("tour-title").textContent = seasonLabel();
    show("screen-tournament");
    renderGameSim({
      title: `${gameLabel()} vs ${opp}`,
      oppName: opp,
      oppStr: oppFor(opp),      // 상대가 강할수록 치기 어렵고 막기 어려워요 (리그 난이도 포함)
      homeName: S.team,
      perf, story,
      interactive: false,
      preWin: Math.random() < gameWinP(),
      onFinish: (win) => {
        perf.line = `${S.name}: ${perf.ab}타수 ${perf.hits}안타${perf.hr ? ` ${perf.hr}홈런` : ""}${perf.sb ? ` ${perf.sb}도루` : ""}`;
        return finishProGame(win, perf);
      },
    });
  }

  // 선발 투수: 이닝마다 위기 미니게임 2~3회
  function proPitcherGame(opp) {
    const ip = clamp(4 + Math.floor(S.stats.stamina / 25) + randInt(-1, 1), 4, 8);
    const kBase = clamp(Math.round(ip * (0.4 + (S.stats.velocity + S.stats.breaking) / 240)), 0, ip * 2);
    const perf = { pts: 0, line: "", highlight: "", ip, k: kBase, runs: 0 };
    const crisisCnt = randInt(2, 3);
    const story = {
      ourInn: Array(9).fill(0),
      oppInn: Array(9).fill(0),
      events: [{ inn: ip, half: "초", text: `${ip}이닝 소화 후 마운드를 넘깁니다 👏`, cls: "" }],
      proCrisis: shuffle(Array.from({ length: ip }, (_, i) => i + 1)).slice(0, crisisCnt),
    };
    const ourBg = randInt(1, 4);
    for (let i = 0; i < ourBg; i++) story.ourInn[randInt(0, 7)]++;
    const bullpen = randInt(0, 2);
    for (let i = 0; i < bullpen; i++) story.oppInn[randInt(Math.min(ip, 8), 8)]++;
    $("tour-title").textContent = seasonLabel();
    show("screen-tournament");
    renderGameSim({
      title: `${gameLabel()} vs ${opp} (선발 등판)`,
      oppName: opp,
      oppStr: oppFor(opp),      // 상대가 강할수록 치기 어렵고 막기 어려워요 (리그 난이도 포함)
      /* 위기 실점 '크기'에는 팀 전력이 아니라 리그 난이도만 걸려요. oppStr에 섞인 채로
       * 키우면 KBO에서 강팀을 만날 때도 실점이 늘어 기존 밸런스가 흔들려요. */
      lgUp: leagueOf(S).oppUp,
      homeName: S.team,
      perf, story,
      interactive: false,
      preWin: Math.random() < gameWinP(),
      onFinish: (win) => {
        perf.line = `${S.name}: ${perf.ip}이닝 ${perf.k}탈삼진 ${perf.runs}실점`;
        return finishProGame(win, perf);
      },
    });
  }

  // 등판 없는 날 — 짧은 카드 (구원 등판은 playRelief에서 직접 다뤄요)
  function quickGame(mode, opp) {
    if (mode === "relief") { playRelief(opp); return; }
    $("tour-title").textContent = `📺 ${gameLabel()} — ${S.team} vs ${opp}`;
    $("tour-round").textContent = S.role;
    $("tour-card").innerHTML = `<div class="pbp" id="pbp-pro"></div><div id="game-result"></div><div id="game-moment"></div>`;
    show("screen-tournament");
    const perf = null;
    const feeds = [];
    // 등판 없는 날 — 순수 팀 전력 승부
    const win = Math.random() < gameWinP();
    feeds.push({ text: "🪑 오늘은 등판 없이 더그아웃에서 응원!" });
    feeds.push({ text: `📢 경기 종료 — ${win ? "승리! 🎉" : "패배 😢"}`, cls: win ? "good" : "bad" });
    const box = $("pbp-pro");
    let idx = 0;
    const btn = $("btn-tour-next");
    btn.disabled = false;
    btn.textContent = "⏩";
    const finishQuick = () => {
      const out = finishProGame(win, perf);
      $("game-result").innerHTML = out.extra || "";
      btn.textContent = out.nextLabel;
      btn.onclick = out.nextFn;
    };
    const timer = setInterval(() => {
      if (idx >= feeds.length) { clearInterval(timer); finishQuick(); return; }
      const f = feeds[idx++];
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      box.appendChild(div);
    }, 450);
    btn.onclick = () => {
      clearInterval(timer);
      while (idx < feeds.length) {
        const f = feeds[idx++];
        const div = document.createElement("div");
        if (f.cls) div.className = f.cls;
        div.textContent = f.text;
        box.appendChild(div);
      }
      finishQuick();
    };
  }

  /* 🔔 구원 등판 — 예전에는 결과 두 줄만 흘러가고 끝이라 투수가 심심했어요.
   * 이제 등판 상황(점수·이닝)을 보여주고, 위기 미니게임으로 실점을 직접 정한 뒤,
   * 바뀐 점수를 그대로 따라가게 했어요. 선발의 스코어보드만큼 크지는 않지만
   * 1~2이닝짜리 등판에는 9이닝 표가 과해서 점수판만 간단히 씁니다. */
  function playRelief(opp) {
    const isCloser = S.role === "마무리 투수";
    const perf = { ip: isCloser ? 1 : randInt(1, 2), k: 0, runs: 0 };
    const inn = isCloser ? 9 : randInt(6, 8);
    // 등판 시점 점수 — 마무리는 1~3점 앞선 세이브 상황, 중간계투는 접전에 투입돼요
    const their0 = isCloser ? randInt(0, 4) : randInt(1, 5);
    const our0 = isCloser ? their0 + randInt(1, 3) : their0 + randInt(-1, 1);

    $("tour-title").textContent = `📺 ${gameLabel()} — ${S.team} vs ${opp}`;
    $("tour-round").textContent = S.role;
    $("tour-card").innerHTML = `
      <div class="relief-score" id="relief-score"></div>
      <div class="pbp" id="pbp-pro"></div>
      <div id="game-moment"></div>
      <div id="game-result"></div>`;
    show("screen-tournament");

    const box = $("pbp-pro");
    const btn = $("btn-tour-next");
    const setScore = (our, their) => {
      $("relief-score").innerHTML =
        `<span class="rs-name">${S.team.slice(0, 5)}</span>` +
        `<span class="rs-num${our > their ? " rs-lead" : ""}">${our}</span>` +
        `<span class="rs-sep">:</span>` +
        `<span class="rs-num${their > our ? " rs-lead" : ""}">${their}</span>` +
        `<span class="rs-name">${opp.slice(0, 5)}</span>`;
    };
    const feed = (text, cls) => {
      const d = document.createElement("div");
      if (cls) d.className = cls;
      d.textContent = text;
      box.appendChild(d);
      box.scrollTop = box.scrollHeight;
    };

    setScore(our0, their0);
    const gap = our0 - their0;
    feed(isCloser
      ? `🔔 ${inn}회초, ${gap}점 앞선 세이브 상황에 마무리 등판!`
      : `🔔 ${inn}회초, ${gap === 0 ? "동점" : gap > 0 ? "살얼음 리드" : "추격 중인"} 승부처에 중간계투 등판!`);
    feed("🔥 주자가 쌓이며 위기! 여기서 막아야 해요.", "bad");

    btn.disabled = true;
    btn.textContent = "🔥 위기!";

    const resolve = (res) => {
      /* 선발 위기와 같은 식을 써요 (game.js의 crisisRuns).
       * 세 번째 인자가 리그 난이도예요 — 팀 전력(oppFor 안의 teamStrOf)과 갈라서 넘겨요.
       * 여기를 빼먹으면 구원 투수만 리그를 안 느껴서 마무리가 해외에서 무조건 이득이 돼요. */
      const runs = crisisRuns(res, oppFor(opp), leagueOf(S).oppUp);
      let txt, cls;
      if (runs === 0) {
        perf.k += res === "perfect" ? 2 : 1;
        txt = res === "perfect" ? "연속 탈삼진으로 위기 탈출!! 🧊" : "범타 처리로 위기 탈출! 🧤";
        cls = "good";
      } else if (runs === 1) {
        txt = res === "perfect" ? "잘 던졌지만 빗맞은 안타… 1실점" : "1실점으로 최소 실점 방어";
        cls = "";
      } else {
        txt = `통한의 적시타… ${runs}실점 💧`;
        cls = "bad";
      }
      perf.runs = runs;

      let our = our0, their = their0 + runs;
      setScore(our, their);
      feed(`${inn}회초 · ${txt}`, cls);
      feed(`${S.name}: ${perf.ip}이닝 ${perf.k}K ${perf.runs}실점`, perf.runs ? "bad" : "good");

      if (isCloser) {
        // 리드를 날렸으면 연장 끝에 팀이 이겨도 세이브는 안 붙어요 (finishProGame에서 확인)
        perf.blown = their >= our;
        if (perf.blown) feed("💥 블론세이브… 리드를 지키지 못했어요", "bad");
        else feed("🧊 리드를 지켜냈어요! 세이브 성공!", "good");
      } else {
        // 내가 내려간 뒤 남은 이닝은 팀에 맡겨요
        const addOur = randInt(0, 3), addThem = randInt(0, 2);
        if (addOur || addThem) feed(`⚾ 남은 이닝, 양 팀이 ${addOur}점과 ${addThem}점을 주고받았어요`);
        our += addOur; their += addThem;
        setScore(our, their);
      }

      let win;
      if (our > their) win = true;
      else if (our < their) win = false;
      else {
        win = Math.random() < gameWinP();
        if (win) our += 1; else their += 1;
        feed(win ? "🔥 연장 끝에 승리!" : "💧 연장 끝에 석패…", win ? "good" : "bad");
        setScore(our, their);
      }
      feed(`📢 경기 종료 — ${S.team} ${our} : ${their} ${opp}`, win ? "good" : "bad");

      const out = finishProGame(win, perf) || {};
      $("game-result").innerHTML = `
        <div class="tour-vs">${S.team} <span class="${win ? "win" : "lose"}">${win ? "승리! 🎉" : "패배… 😢"}</span></div>
        <div class="tour-line">${S.name}: ${perf.ip}이닝 ${perf.k}탈삼진 ${perf.runs}실점</div>
        ${out.extra || ""}`;
      btn.disabled = false;
      btn.textContent = out.nextLabel || "계속";
      btn.onclick = out.nextFn || (() => {});
    };

    playRandomMini($("game-moment"), resolve);
  }

  /* ⚡ 실전 성장 — 낮은 확률로 경기에서 한 단계 깨쳐요. 더 윙어의 같은 이름 기능을
   * 야구로 옮긴 거예요(soccer/career.js의 proMatchFinalize). 훈련만으로 크는 게 아니라
   * 경기가 선수를 키운다는 감각을 줘요. 그 경기에 **실제로 한 일**이 무게가 돼요 —
   * 안타면 타격, 홈런이면 파워, 도루면 주루, 삼진이면 구위·변화구, 무실점이면 제구
   * 쪽으로 기울어요. 바닥 무게(baseW)를 남겨 아무 일 없던 칸도 조금은 열어 둬요.
   *
   * ⚖️ 축구(한 시즌 38경기)와 달리 야구는 144~162경기예요. 같은 확률이면 네 배로
   * 자라 훈련이 무의미해져요. 그래서 **경기당 확률을 훨씬 낮게** 잡아 한 시즌 기대
   * 성장이 두세 점에 머물게 했어요 — tests/rookie/growth-test.js가 실측으로 못 박아요. */
  const MATCH_GROW = {
    base: 0.008,                    // 경기당 바닥 확률
    win: 0.004, loss: -0.002,       // 이긴 경기에서 더 배워요
    actK: 0.010, actCap: 0.012,     // 활약이 클수록 확률이 올라요(상한까지)
    lo: 0.004, hi: 0.030,
    baseW: 0.5,                     // 아무 일 없던 칸도 조금은 열어 둬요 — 경기를 뛴 값이에요
    gainLo: 0.4, gainHi: 1.4,
  };
  /* 이 경기에 무엇을 했나 → 어느 능력치가 오를까. 타자·투수가 통째로 달라요. */
  function growWeightOf(perf) {
    const b = MATCH_GROW.baseW, p = perf || {};
    if (S.pos === "batter") {
      return {
        contact: b + (p.hits || 0) * 2.2,
        power: b + (p.hr || 0) * 4.0,
        run: b + (p.sb || 0) * 3.5,
        defense: b,
        stamina: 1,                 // 뛴 것 자체가 근거라 바닥이 조금 높아요
      };
    }
    return {
      velocity: b + (p.k || 0) * 0.9,
      breaking: b + (p.k || 0) * 0.7,
      control: b + Math.max(0, 3 - (p.runs || 0)) * 1.1,   // 실점 없이 막아낸 제구
      defense: b,
      stamina: 1 + (p.ip || 0) * 0.3,                      // 긴 이닝 = 체력
    };
  }
  /* 왜 그게 올랐는지 문구로 남겨요 — 화면에서 근거가 읽혀야 랜덤 보너스로 안 보여요. */
  function growWhyOf(perf, key) {
    const p = perf || {};
    const why = S.pos === "batter" ? {
      contact: (p.hits || 0) > 0 ? "안타를 친 감각이 남아" : "",
      power: (p.hr || 0) > 0 ? "담장을 넘긴 손맛이 남아" : "",
      run: (p.sb || 0) > 0 ? "베이스를 훔친 감이 붙어" : "",
      defense: "", stamina: "",
    } : {
      velocity: (p.k || 0) > 0 ? "삼진을 잡은 구위가 남아" : "",
      breaking: (p.k || 0) > 0 ? "변화구가 춤춘 게 남아" : "",
      control: (p.runs || 0) === 0 ? "실점 없이 막아낸 제구가 붙어" : "",
      defense: "", stamina: (p.ip || 0) >= 6 ? "긴 이닝을 버틴 게 남아" : "",
    };
    return why[key] || "";
  }
  /* 활약이 클수록 확률도 올라가요. 승패도 봐요. posAxis를 안 쓰고 직접 재는 건
   * 야구는 타자·투수 지표가 아예 달라서예요(축구는 골·도움·수비 한 축이었어요). */
  function growPOf(perf, win) {
    const p = perf || {};
    const didAxis = S.pos === "batter"
      ? (p.hits || 0) + (p.hr || 0) * 1.5 + (p.sb || 0)
      : (p.k || 0) * 0.6 + Math.max(0, (p.ip || 0) - (p.runs || 0) * 1.5);
    return clamp(
      MATCH_GROW.base
      + (win ? MATCH_GROW.win : MATCH_GROW.loss)
      + Math.min(MATCH_GROW.actCap, didAxis * MATCH_GROW.actK),
      MATCH_GROW.lo, MATCH_GROW.hi);
  }
  /* 경기 한 판이 끝날 때마다 한 번 굴려요 (정규시즌·가을야구 공통). */
  function matchGrowth(perf, win) {
    if (Math.random() >= growPOf(perf, win)) return;
    const w = growWeightOf(perf);
    const pool = STAT_DEFS[S.pos].filter((d) => !atCap(d.key));   // 상한에 닿은 칸은 빼요
    const total = pool.reduce((sum, d) => sum + (w[d.key] || 0), 0);
    if (!pool.length || total <= 0) return;
    let roll = Math.random() * total, d = pool[pool.length - 1];
    for (const cand of pool) { roll -= w[cand.key] || 0; if (roll < 0) { d = cand; break; } }
    const gain = Math.round(rand(MATCH_GROW.gainLo, MATCH_GROW.gainHi) * S.talents[d.key] * 10) / 10;
    if (gain <= 0) return;
    S.stats[d.key] = clamp(S.stats[d.key] + gain, 0, statCap(d.key));
    const why = growWhyOf(perf, d.key);
    proLog(`⚡ ${why ? why + " " : "실전에서 "}${d.name}을(를) 깨쳤어요! +${gain.toFixed(1)} (${Math.round(S.stats[d.key])})`);
    if (window.Fx) Fx.flash(`⚡ ${d.name} +${gain.toFixed(1)}`);
  }

  // 경기 종료 후 공통 처리 — 팀/리그/개인 기록 갱신
  function finishProGame(win, perf) {
    if (inPost()) return finishPostGame(win, perf);
    const sn = S.season;
    sn.game += 1;
    if (win) sn.teamW += 1; else sn.teamL += 1;
    for (const o of sn.others) {
      if (Math.random() < o.str) o.w += 1; else o.l += 1;
    }
    raceStep();                       // 🏅 라이벌들도 이번 경기만큼 기록을 쌓아요 (자체 시드)
    const t = sn.stats;
    if (perf) {
      if (S.pos === "batter") {
        t.ab += perf.ab; t.hits += perf.hits; t.hr += perf.hr; t.sb += perf.sb;
      } else {
        t.ip += perf.ip; t.k += perf.k; t.er += perf.runs || 0; t.g += 1;
        if (S.role === "선발 투수" && win && perf.ip >= 5) t.wins += 1;
        if (S.role === "마무리 투수" && win && !perf.blown) t.saves += 1;
      }
    }
    matchGrowth(perf, win);          // ⚡ 실전 성장 — 낮은 확률로 경기에서 한 단계 깨쳐요
    const featLine = rollFeats(perf, win);   // 🎇 한 경기 대기록 — 인생 경기
    const pay = win ? 40 : 20;
    S.money = (S.money || 0) + pay;
    S.condition = clamp(S.condition - randInt(3, 6), 0, 100);
    S.pendingGame = false;
    save();
    const extra = `${featLine || ""}<div class="tour-pts">💰 수당 +${pay}만 · ${S.team} ${sn.teamW}승 ${sn.teamL}패 · 현재 ${myRank()}위</div>`;
    if (sn.game >= sn.total) {
      return { extra, nextLabel: "🍂 정규시즌 종료", nextFn: enterPostseason };
    }
    return {
      extra,
      nextLabel: `🏋️ 다음 경기 준비 (G${sn.game + 1})`,
      nextFn: () => {
        // 시리즈가 끝나면 이동일이 껴서 훈련 기회가 더 많아요.
        // 한 시즌의 총 훈련 횟수는 리그와 무관하게 336회예요 (campAfter 주석 참고).
        S.camp = campAfter(sn.game, sn.total);
        save();
        renderPro();
        show("screen-pro");
      },
    };
  }

  /* 포스트시즌 경기 결과 — 시리즈를 굴리고, 기록은 정규시즌과 분리해 쌓아요.
   * 실제 야구도 포스트시즌 타율을 정규시즌에 합치지 않아요. */
  function finishPostGame(win, perf) {
    const P = S.post;
    const idx = P.series.findIndex((s) => s.round === P.myRound);
    const before = P.series[idx];
    const iAmA = before.a === P.myTeam;
    P.series[idx] = Postseason.advanceSeries(before, iAmA ? win : !win);
    const s = P.series[idx];

    const t = P.stats;
    if (perf) {
      if (S.pos === "batter") {
        t.ab += perf.ab; t.hits += perf.hits; t.hr += perf.hr; t.sb += perf.sb;
      } else {
        t.ip += perf.ip; t.k += perf.k; t.er += perf.runs || 0; t.g += 1;
        if (S.role === "선발 투수" && win && perf.ip >= 5) t.wins += 1;
        if (S.role === "마무리 투수" && win && !perf.blown) t.saves += 1;
      }
    }
    matchGrowth(perf, win);          // ⚡ 실전 성장 — 가을야구에서도 한 단계 깨쳐요
    const featLine = rollFeats(perf, win);   // 🎇 한 경기 대기록 — 가을야구의 인생 경기
    const pay = win ? 80 : 40;              // 가을야구 수당은 정규시즌의 두 배예요
    S.money = (S.money || 0) + pay;
    S.condition = clamp(S.condition - randInt(3, 6), 0, 100);

    const myW = iAmA ? s.aw : s.bw, opW = iAmA ? s.bw : s.aw;
    const extra = `${featLine || ""}<div class="tour-pts">💰 수당 +${pay}만 · 시리즈 ${myW}-${opW}</div>`;

    if (!s.done) {
      P.gameNo += 1;
      save();
      return { extra, nextLabel: `🍂 ${P.gameNo}차전으로`, nextFn: () => { renderPost(); show("screen-pro"); } };
    }

    // 시리즈 종료 — 라운드 사이엔 이동일·휴식일이 있어 컨디션이 회복돼요
    S.condition = clamp(S.condition + 15, 0, 100);
    if (s.winner !== P.myTeam) P.eliminated = true;
    P.gameNo = 1;
    save();
    const won = s.winner === P.myTeam;
    const label = postLabel(s.round);
    const line = {
      text: won ? `🎉 ${label} 승리! (${myW}-${opW})` : `😢 ${label} 탈락… (${myW}-${opW})`,
      cls: won ? "good" : "bad",
    };
    /* 가을야구에 들어간 뒤로는 남은 시리즈가 전부 내 경기예요. 그래서 라운드를 이기면
     * 연출 화면에 띄울 게 이 한 줄뿐이라, 결과 카드를 지우고 빈 상자를 보여주게 돼요.
     * 대신 결과 화면 위에서 축하만 하고, 다음 라운드로는 버튼을 눌러야 넘어가요.
     * 탈락·한국시리즈는 결산으로 가면서 다른 팀 결과도 함께 흘려보내야 해서 그대로 둬요. */
    const nextName = postLabel(ROUND_ORDER[ROUND_ORDER.indexOf(s.round) + 1]);
    let cheering = false;
    const nextRound = () => {
      if (cheering) return;                 // 축하 도중 다시 눌려도 대진이 밀리지 않게요
      cheering = true;
      if (window.Fx) {
        Fx.confetti({ emojis: ["🎉", "🍂", "✨"], count: 50 });
        Fx.flash(`🎉 ${label} 승리! ${myW}-${opW}`);
      }
      const btn = $("btn-tour-next");
      btn.textContent = `⚾ ${nextName}로`;
      btn.onclick = () => advancePostseason();
    };
    return {
      extra,
      nextLabel: won ? (s.round === "ks" ? "🏆 시즌 결산" : "🍂 다음 라운드로") : "🏁 시즌 결산",
      nextFn: won && s.round !== "ks" ? nextRound : () => advancePostseason([line]),
    };
  }

  function playFeeds(title, feeds, onDone) {
    $("tour-title").textContent = title;
    $("tour-round").textContent = "";
    $("tour-card").innerHTML = `<div class="pbp" id="pbp-pro"></div>`;
    show("screen-tournament");
    let idx = 0, timer = null, finished = false;
    const apply = (f, withFx) => {
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("pbp-pro").appendChild(div);
      $("pbp-pro").scrollTop = $("pbp-pro").scrollHeight;
      if (withFx && f.fx && window.Fx) f.fx();
    };
    const done = () => {
      if (finished) return;               // 빨리 감기를 두 번 누르면 결산이 두 번 돌아요
      finished = true;
      clearTimeout(timer);
      onDone();
    };
    /* 이펙트가 붙은 줄은 연출이 끝날 때까지 다음 줄을 미뤄요.
     * 수상이 여러 개면 예전엔 한꺼번에 겹쳐 떠서 뭘 받았는지 안 보였어요. */
    const step = () => {
      if (idx >= feeds.length) { done(); return; }
      const f = feeds[idx++];
      apply(f, true);
      timer = setTimeout(step, f.fx ? 1700 : 600);
    };
    timer = setTimeout(step, 300);
    $("btn-tour-next").textContent = "⏩ 빨리 감기";
    $("btn-tour-next").onclick = () => {
      clearTimeout(timer);
      while (idx < feeds.length) apply(feeds[idx++], false);   // 건너뛸 땐 이펙트는 생략해요
      done();
    };
  }

  const ROUND_ORDER = ["wc", "semi", "po", "ks"];
  const inPost = () => !!(S.post && S.post.myRound && !S.post.eliminated);

  /* 🍂 가을야구 라벨 — 대진 구조(postseason.js)는 KBO 그대로예요.
   * 5팀 진출 · 와일드카드 → 준PO → PO → 마지막 시리즈. 새 대진 방식을 만들지 않아요.
   * 리그마다 다른 건 **마지막 시리즈의 이름 하나뿐**이에요. 와일드카드·준PO·PO는
   * 어느 리그에서 써도 뜻이 통해서 손대지 않아요.
   *
   * ⚠️ 라벨 매핑은 여기 한 곳뿐이에요. 화면·연출·결산이 전부 postLabel을 거칩니다.
   * Postseason.LABEL을 직접 읽는 자리를 새로 만들지 마세요 — 그러면 대륙 리그에서
   * "한국시리즈"가 다시 떠요. tests/rookie/posting-test.js가 그 자리를 세어서 막아요.
   *
   * 모르는 리그는 postseason.js의 기본 이름으로 떨어져요 (옛 세이브 방어와 같은 결). */
  const KS_LABEL = { 1: "한국시리즈", 2: "열도시리즈", 3: "대륙시리즈" };
  const postLabel = (round) =>
    (round === "ks" && KS_LABEL[leagueOf(S).id]) || Postseason.LABEL[round];

  /* 화면에 붙는 리그 꼬리표. KBO는 빈 문자열이라 예전 화면이 한 글자도 안 바뀌어요.
   * id를 받는 쪽(leagueTagOf)이 본체예요 — 결산은 **그 시즌의 리그**를 붙여야 하니까요.
   * 모르는 id·없는 id는 leagueOf가 KBO로 받아줘요 (옛 세이브 방어와 같은 결). */
  const leagueTagOf = (id) => {
    const l = leagueOf({ league: id });
    return l.id === 1 ? "" : ` (${l.flag} ${l.short})`;
  };
  const leagueTag = () => {
    return leagueTagOf(S.league);
  };

  /* 🌏 HUD에 붙는 리그 배지. 꼬리표는 팀 이름 뒤에 묻혀서 훈련 화면에서 '내가 지금
   * 해외에 있다'는 게 잘 안 보였어요. KBO는 빈 문자열이라 국내 화면은 그대로예요. */
  const leagueBadge = () => {
    const l = leagueOf(S);
    return l.id === 1 ? "" : `<span class="lg-badge">${l.flag} ${l.name}</span> `;
  };

  /* 정규시즌이 끝나면 최종 순위로 가을야구 진출을 가려요. 6위 이하면 바로 결산이에요. */
  function enterPostseason() {
    const sn = S.season;
    const standings = [
      { name: S.team, w: sn.teamW, l: sn.teamL, str: 0.5 },
      ...sn.others.map((o) => ({ name: o.name, w: o.w, l: o.l, str: o.str })),
    ].sort((a, b) => b.w - a.w);

    const bracket = Postseason.buildBracket(standings, S.team);
    if (!bracket) {                       // 6위 이하 — 가을야구 없음
      S.post = null;
      save();
      playFeeds("🍂 가을야구", [
        { text: `정규시즌 ${myRank()}위 — 가을야구 진출에 실패했어요`, cls: "bad" },
        { text: "5위 안에 들어야 가을야구에 나갈 수 있어요" },
      ], finishSeason);
      return;
    }

    S.post = {
      series: bracket.series,
      myTeam: S.team,
      myRank: bracket.myRank,
      myRound: bracket.myRound,
      gameNo: 1,
      eliminated: false,
      wonKS: false,
      // 자동 시뮬에 쓸 팀 강도 (내 팀 것은 안 써요 — 내 경기는 직접 치르니까요)
      str: standings.reduce((m, t) => ((m[t.name] = t.str), m), {}),
      stats: S.pos === "batter"
        ? { ab: 0, hits: 0, hr: 0, sb: 0 }
        : { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 },
    };
    save();
    advancePostseason([{ text: `🍂 ${bracket.myRank}위로 가을야구에 진출했어요!`, cls: "good" }]);
  }

  const mySeries = () => (S.post ? S.post.series.find((s) => s.round === S.post.myRound) : null);
  const postOpp = () => { const s = mySeries(); return s ? (s.a === S.post.myTeam ? s.b : s.a) : ""; };

  /* 포스트시즌 중의 프로 화면. 시리즈 중엔 훈련이 없어요(실제로도 경기만 있어요).
   * 능력치·컨디션 표시는 renderPro와 같은 요소를 그대로 써요. */
  function renderPost() {
    const P = S.post, s = mySeries();
    const myW = s.a === P.myTeam ? s.aw : s.bw;
    const opW = s.a === P.myTeam ? s.bw : s.aw;
    const label = postLabel(s.round);

    $("pro-name").textContent = `${S.name} (${S.pos === "batter" ? "타자" : "투수"})`;
    $("pro-team").innerHTML = `⚾ ${leagueBadge()}${S.team} · ${S.role || ""} · ${S.age}세 · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = `🍂 ${label} ${P.gameNo}차전`;
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
    $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    // 순위표 자리에 시리즈 현황을 보여줘요
    const box = $("pro-standings");
    box.hidden = false;
    box.open = true;
    $("pro-standings-sum").textContent = `🍂 ${label} · 시리즈 ${myW}-${opW}`;
    $("pro-standings-body").innerHTML = `<table class="rank-table"><tbody>${
      S.post.series.map((x) => {
        const line = x.done
          ? `${x.a} ${x.aw}-${x.bw} ${x.b} → ${x.winner}`
          : x.b == null ? `${x.a} vs (미정)` : `${x.a} ${x.aw}-${x.bw} ${x.b}`;
        return `<tr class="${x.round === P.myRound ? "me" : ""}"><td>${postLabel(x.round)}</td><td>${line}</td></tr>`;
      }).join("")
    }</tbody></table>`;

    $("pro-stats").innerHTML = "";
    $("pro-camp-title").textContent = `${label} ${P.gameNo}차전 — ${S.team} vs ${postOpp()}`;
    const acts = $("pro-actions");
    acts.innerHTML = "";
    const go = document.createElement("button");
    go.className = "action-btn rest go-game";
    go.innerHTML = `<span class="a-emoji">⚾</span>경기 시작<span class="a-sub">시리즈 ${myW}-${opW} · ${s.need}선승제</span>`;
    go.onclick = playProGame;
    acts.appendChild(go);

    $("pro-log").innerHTML = (S.proLog || []).map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`).join("");
  }

  /* 대진을 앞으로 굴려요. 내가 나설 시리즈를 만나면 멈추고 화면을 그려요.
   * 내가 안 낀 라운드는 팀 강도로 자동 판정해서 연출로 흘려보내요. */
  function advancePostseason(seed) {
    const P = S.post;
    const feeds = seed ? seed.slice() : [];

    // 정상이면 최대 4바퀴예요 (와카·준PO·PO·KS). 저장이 깨져도 탭이 멎지 않게 막아둬요.
    let guard = 0;
    for (;;) {
      if (guard++ > 8) break;
      P.series = Postseason.feedWinner(P.series);
      const idx = P.series.findIndex((s) => !s.done && s.b != null);
      if (idx < 0) break;                        // 남은 시리즈 없음 = 가을야구 종료

      const s = P.series[idx];
      const mine = !P.eliminated && (s.a === P.myTeam || s.b === P.myTeam);
      if (mine) {
        P.myRound = s.round;
        // 와일드카드는 4위가 1승을 안고 시작하니 그만큼 빼야 차수가 맞아요
        P.gameNo = s.aw + s.bw + 1 - (s.round === "wc" ? 1 : 0);
        save();
        const go = () => { renderPost(); show("screen-pro"); };
        if (feeds.length) playFeeds("🍂 가을야구", feeds, go); else go();
        return;
      }

      P.series[idx] = Postseason.simSeries(
        s.round, s.a, s.b, P.str[s.a], P.str[s.b], s.round === "wc" ? 1 : 0
      );
      const r = P.series[idx];
      feeds.push({ text: `${postLabel(r.round)}  ${r.a} ${r.aw}-${r.bw} ${r.b} → ${r.winner} 진출` });
    }

    // 가을야구 종료 — 우승 여부를 확정하고 결산으로
    const ks = P.series[3];
    P.wonKS = !!(ks.done && ks.winner === P.myTeam);
    P.myRound = null;
    save();
    if (P.wonKS) feeds.push({ text: `🏆 ${postLabel("ks")} 우승!! 헹가래의 주인공이 됐어요`, cls: "good" });
    else if (ks.done) feeds.push({ text: `🏆 ${ks.winner}이(가) ${postLabel("ks")} 우승을 차지했어요` });
    if (feeds.length) playFeeds("🍂 가을야구", feeds, finishSeason); else finishSeason();
  }

  /* 포스트시즌 성적 한 줄. 정규시즌 기록과 합치지 않아요. */
  function postStatLine() {
    const P = S.post;
    if (!P || !P.stats) return "";
    const t = P.stats;
    if (S.pos === "batter") {
      if (!t.ab) return "";
      // 타율은 야구 관례대로 앞의 0을 떼요. 다만 1.000은 떼면 .000이 돼서 그대로 둬요.
      const avg = t.hits / t.ab;
      const avgTxt = avg >= 1 ? avg.toFixed(3) : avg.toFixed(3).slice(1);
      return `🍂 가을야구 ${t.ab}타수 ${t.hits}안타${t.hr ? ` ${t.hr}홈런` : ""} (타율 ${avgTxt})`;
    }
    if (!t.g) return "";
    return `🍂 가을야구 ${t.g}경기 ${t.ip}이닝 ${t.k}탈삼진 ${t.er}자책`;
  }

  /* 🏛️ 통산 마일스톤 — 커리어가 쌓아 온 누적 기록의 고비들. 야구는 기록의 스포츠라
   * 통산 3000안타·500홈런 같은 숫자가 곧 전설의 증표예요. 넘는 순간 결산에서 축하하고
   * 명예의 전당 가치에 얹어요. 별도 필드에 저장하지 않고 seasons[]의 raw를 더해 구해요
   * — 마이그레이션이 없어요. 옛 세이브도 그 자리에서 통산이 계산돼요. */
  const MILESTONES = [
    { key: "hits", name: "통산 안타", emoji: "🏏", pos: "batter", marks: [1000, 1500, 2000, 2500, 3000] },
    { key: "hr", name: "통산 홈런", emoji: "💣", pos: "batter", marks: [100, 200, 300, 400, 500] },
    { key: "sb", name: "통산 도루", emoji: "👟", pos: "batter", marks: [200, 400, 600, 800] },
    { key: "k", name: "통산 탈삼진", emoji: "🔥", pos: "pitcher", marks: [1500, 2500, 3500, 4500, 5000] },
    { key: "wins", name: "통산 다승", emoji: "🏆", pos: "pitcher", marks: [50, 100, 150, 200] },
    { key: "saves", name: "통산 세이브", emoji: "🚪", pos: "pitcher", marks: [100, 200, 300, 400] },
  ];
  /* seasons[]의 raw를 전부 더해 통산 카운팅 스탯을 구해요. 타자·투수 시즌이 섞여 있어도
   * 각 시즌 raw에 있는 필드만 더하니 안전해요. */
  function careerCounts(seasons) {
    const c = { hits: 0, hr: 0, sb: 0, ab: 0, k: 0, wins: 0, saves: 0, ip: 0 };
    for (const s of (seasons || [])) {
      const r = (s && s.raw) || {};
      for (const key in c) c[key] += (+r[key] || 0);
    }
    return c;
  }
  /* 🎇 한 경기 대기록 — 낮은 확률로 터지는 '인생 경기'. perf에 안타 허용 수가 없어서
   * 노히터는 **완봉(무실점) 선발 등판**에만 걸어요(노히터는 언제나 완봉이니까요).
   * 사이클링히트도 실제 2·3루타를 셀 수 없어, 멀티안타+홈런 경기에 능력치로 확률을 걸어요. */
  const FEATS = {
    perfect: { name: "퍼펙트게임", emoji: "💎", pv: 40, pos: "pitcher" },
    nohit: { name: "노히터", emoji: "🙅", pv: 22, pos: "pitcher" },
    cycle: { name: "사이클링히트", emoji: "🔄", pv: 20, pos: "batter" },
    multihr: { name: "멀티홈런 쇼", emoji: "💥", pv: 12, pos: "batter" },
  };
  /* 🏅 시즌 타이틀 — 홈런왕·다승왕처럼 리그 1등에게 주는 상. 개인 기록 순위(라이벌 필드)에서
   * 그 종목 1위면 받아요. 화면에서 시즌 내내 보던 순위가 곧 수상 결과예요(raceTop). */
  const TITLES = {
    hits: { name: "최다안타", emoji: "🏏", pos: "batter", metric: "hits", higher: true, pv: 14 },
    hr: { name: "홈런왕", emoji: "💣", pos: "batter", metric: "hr", higher: true, pv: 18 },
    avg: { name: "수위타자", emoji: "📈", pos: "batter", metric: "avg", higher: true, pv: 18 },
    sb: { name: "도루왕", emoji: "👟", pos: "batter", metric: "sb", higher: true, pv: 14 },
    wins: { name: "다승왕", emoji: "🏆", pos: "pitcher", metric: "wins", higher: true, pv: 18, role: "선발 투수" },
    k: { name: "탈삼진왕", emoji: "🔥", pos: "pitcher", metric: "k", higher: true, pv: 16, role: "선발 투수" },
    era: { name: "평균자책왕", emoji: "🎯", pos: "pitcher", metric: "era", higher: false, pv: 18, role: "선발 투수" },
    saves: { name: "세이브왕", emoji: "🚪", pos: "pitcher", metric: "saves", higher: true, pv: 16, role: "마무리 투수" },
  };
  const titleMetric = (st, m) => (m === "avg" ? (st.hits || 0) / Math.max(st.ab || 0, 1)
    : m === "era" ? ((st.er || 0) * 9) / Math.max(st.ip || 0, 1) : (st[m] || 0));
  const myTitles = () => Object.entries(TITLES).filter(([, t]) => t.pos === S.pos && (!t.role || t.role === S.role));
  /* 이번 시즌 딴 타이틀 — 개인 기록 순위(라이벌 필드)에서 그 종목 1위면 받아요.
   * 화면에서 보던 👑이 곧 수상 결과예요. 비율 타이틀은 최소 출장을 요구해요. */
  function titlesWon(stats) {
    // 실제 게임은 initSeason에서 race를 깔아요. race가 없으면(밸런스 시뮬 하네스처럼
    // 시즌을 손으로 세운 경우) 라이벌 필드를 되감지 않고 조용히 넘어가요 — 그쪽은 수상을 안 봐요.
    if (!S.season || !Array.isArray(S.season.race)) return [];
    const tot = S.season.total || 144;
    const out = [];
    for (const [id, t] of myTitles()) {
      if (t.metric === "avg" && (stats.ab || 0) < tot * 2) continue;
      if (t.metric === "era" && (stats.ip || 0) < tot * 0.9) continue;
      if (t.metric === "era" && titleMetric(stats, "era") <= 0) continue;
      if (raceTop(t.metric)) out.push({ id, v: titleMetric(stats, t.metric) });
    }
    return out;
  }

  /* 마일스톤 하나의 명예의 전당 가치 — 뒤 고비일수록 가팔라요(3000안타는 전설이니까요). */
  const MILE_PV = [8, 12, 18, 26, 36];
  /* 통산 마일스톤 + 한 경기 대기록 + 시즌 타이틀을 합친 전당 가치예요. careerScore가 이 하나만
   * 부르면 되도록 묶어 뒀어요(테스트가 careerScore를 떼어 갈 때 의존 함수를 하나만 알면 돼요). */
  function mileScore(c) {
    const miles = (((c || {}).miles) || []).reduce((sum, m) => sum + (MILE_PV[m.i] || 10), 0);
    const feats = (((c || {}).feats) || []).reduce((sum, f) => sum + ((FEATS[f.t] || {}).pv || 10), 0);
    const titles = (((c || {}).titles) || []).reduce((sum, tt) => sum + ((TITLES[tt.id] || {}).pv || 10), 0);
    return miles + feats + titles;
  }
  /* 경기 한 판의 대기록을 굴려요 (한 경기에 많아야 하나). 터지면 S.career.feats에 담고
   * 문구를 돌려줘요 — 부르는 쪽(결과 카드)이 크게 띄워요. */
  function rollFeats(perf, win) {
    /* 🎲 주사위를 **경기마다 딱 두 번** 먼저 굴려 둬요. 굴리는 횟수가 성적·능력치에
     * 따라 들쭉날쭉하면, 같은 씨앗으로 도는 밸런스 시뮬(post-mech ⑤)의 난수 줄기가
     * 능력치별로 다르게 어긋나 우승 곡선이 뒤틀려요. 늘 두 번이면 흔들림이 균일해요. */
    const r1 = Math.random(), r2 = Math.random();
    if (!perf) return null;
    const p = perf;
    let t = null;
    if (S.pos === "pitcher") {
      // 노히터 — 완봉(무실점) 선발 등판에서, 구위·제구가 좋을수록
      if (S.role === "선발 투수" && (p.ip || 0) >= 6 && (p.runs || 0) === 0) {
        const stuff = (S.stats.velocity + S.stats.breaking + S.stats.control) / 3;
        if (r1 < clamp(0.02 + (stuff - 90) / 100 * 0.10, 0.02, 0.14)) {
          // 퍼펙트게임 — 노히터 중에서도 제구가 완벽할 때
          t = r2 < clamp((S.stats.control - 100) / 100 * 0.4, 0.05, 0.35) ? "perfect" : "nohit";
        }
      }
    } else {
      if ((p.hr || 0) >= 3) t = "multihr";                    // 한 경기 3홈런+ (자연 발생)
      else if ((p.hits || 0) >= 3 && (p.hr || 0) >= 1) {      // 사이클링히트 — 능력치로 확률
        const all = (S.stats.contact + S.stats.power + S.stats.run) / 3;
        if (r1 < clamp((all - 90) / 100 * 0.04, 0.005, 0.04)) t = "cycle";   // 드물어야 특별해요
      }
    }
    if (!t) return null;
    const def = FEATS[t];
    (S.career.feats = S.career.feats || []).push({ t, y: S.proYear });
    proLog(`🎇 대기록! ${def.emoji} ${def.name}${win ? "" : " (팀은 졌지만 개인 대기록)"}`);
    if (window.Fx) { if (Fx.confetti) Fx.confetti({ emojis: ["🎇", "⚾", "✨"], count: 40 }); Fx.flash(`🎇 ${def.name}!`); }
    return `<div class="tour-pts feat-line">🎇 대기록 — ${def.emoji} <b>${def.name}</b>!</div>`;
  }
  /* prev(이번 시즌 전 통산)와 now(이번 시즌 포함) 사이에 새로 넘은 고비들을 돌려줘요. */
  function newMilestones(prev, now, year) {
    const out = [];
    for (const m of MILESTONES) {
      m.marks.forEach((mk, i) => {
        if ((prev[m.key] || 0) < mk && (now[m.key] || 0) >= mk) out.push({ key: m.key, n: mk, y: year, i });
      });
    }
    return out;
  }
  /* 🏛️ 결산·전당에 그릴 통산 기록 블록 — 시점(타자/투수)에 맞는 카운팅 스탯과
   * 다음 고비까지 남은 수, 이미 넘은 고비 배지를 보여줘요. */
  function milestoneHTML() {
    const c = careerCounts(S.career.seasons);
    const mine = MILESTONES.filter((m) => m.pos === S.pos);
    const rows = mine.map((m) => {
      const cur = c[m.key] || 0;
      const next = m.marks.find((mk) => cur < mk);
      const badges = m.marks.filter((mk) => cur >= mk)
        .map((mk) => `<span class="mile-badge">${m.emoji}${mk}</span>`).join("");
      const tail = next
        ? `<span class="mile-next">다음 ${next}까지 <b>${next - cur}</b></span>`
        : `<span class="mile-next mile-max">👑 최고 기록 달성</span>`;
      return `<div class="mile-row"><span class="mile-name">${m.emoji} ${m.name} <b>${cur}</b></span>${tail}${badges ? `<div class="mile-badges">${badges}</div>` : ""}</div>`;
    }).join("");
    // 🎇 한 경기 대기록 — 터진 적 있으면 종류별로 세어 한 줄 얹어요
    const feats = S.career.feats || [];
    const cnt = {};
    for (const f of feats) cnt[f.t] = (cnt[f.t] || 0) + 1;
    const featRow = feats.length
      ? `<div class="mile-row mile-feats"><span class="mile-name">🎇 통산 대기록</span><span class="mile-feat-list">${
        Object.keys(FEATS).filter((t) => cnt[t]).map((t) => `${FEATS[t].emoji} ${FEATS[t].name} <b>${cnt[t]}</b>`).join(" · ")}</span></div>`
      : "";
    // 🏅 통산 타이틀 — 홈런왕·다승왕 등을 몇 번 땄는지
    const titles = S.career.titles || [];
    const tc = {};
    for (const tt of titles) tc[tt.id] = (tc[tt.id] || 0) + 1;
    const titleRow = titles.length
      ? `<div class="mile-row mile-feats"><span class="mile-name">🏅 통산 타이틀</span><span class="mile-feat-list">${
        Object.keys(TITLES).filter((id) => tc[id]).map((id) => `${TITLES[id].emoji} ${TITLES[id].name} <b>${tc[id]}</b>`).join(" · ")}</span></div>`
      : "";
    return `<div class="mile-box"><div class="mile-title">🏛️ 통산 기록</div>${rows}${titleRow}${featRow}</div>`;
  }

  function finishSeason() {
    if (!S.season) return;
    const sn = S.season;
    const t = sn.stats;
    let line, raw, war;
    if (S.pos === "batter") {
      const avg = t.hits / Math.max(t.ab, 1);
      war = clamp((avg - 0.250) * 50 + t.hr * 0.06 + t.sb * 0.02, -1.5, 12);
      line = `타율 ${avg.toFixed(3)} · ${t.hr}홈런 · ${t.sb}도루`;
      raw = { ...t, avg };
    } else {
      const era = (t.er * 9) / Math.max(t.ip, 1);
      /* 실제 WAR과 같은 뼈대예요 — 대체선수(자책 5.7)보다 몇 점을 아꼈는지 구하고,
       * 던진 이닝만큼 곱해 '1승 ≈ 10점'으로 환산합니다.
       * 예전에는 이닝을 아예 안 봐서, 79이닝 마무리(WAR 7.8)가
       * 174이닝 에이스(WAR 5.1)보다 높게 나오는 역전이 있었어요.
       * 승수·세이브 가산은 실제 WAR엔 없지만, 수상 투표가 그걸 본다는 걸 반영했어요. */
      const REPL_ERA = 5.7, RUNS_PER_WIN = 10;
      const runsSaved = ((REPL_ERA - era) / 9) * t.ip;
      if (S.role === "마무리 투수") {
        war = clamp(runsSaved / RUNS_PER_WIN + t.saves * 0.02, -1.5, 12);
        line = `평균자책 ${era.toFixed(2)} · ${t.saves}세이브 · ${t.k}탈삼진`;
      } else {
        war = clamp(runsSaved / RUNS_PER_WIN + t.wins * 0.05, -1.5, 12);
        line = `평균자책 ${era.toFixed(2)} · ${t.wins}승 · ${t.k}탈삼진`;
      }
      raw = { ...t, era };
    }
    war = Math.round(war * 10) / 10;
    const rank = myRank();
    // 한국시리즈를 실제로 이겼을 때만 우승이에요 (예전엔 순위로 주사위를 굴렸어요)
    const champ = !!(S.post && S.post.wonKS);
    /* 🌏 가중을 걸기 **전**의 수상 횟수예요. 아래 addAwardWeight가 이 값을 씁니다 —
     * 여기서 안 떠 두면 상을 세고 난 뒤의 값(이번 상까지 포함된 값)을 이어붙이게 돼서
     * 옛 세이브의 새 상이 두 번 세어져요. */
    const preAward = { mvp: S.career.mvp || 0, gg: S.career.gg || 0, roy: S.career.roy || 0 };
    // 수상은 '리그 내 상대 비교' — 가상 경쟁자들의 WAR와 겨뤄 최고면 수상해요.
    // (압도적인 시즌은 랜덤에 밀려 MVP를 놓치지 않아요)
    const awards = [];
    /* 🌏 수상 판정 전체를 **시즌 길이에 맞춰 늘려요.**
     *
     * 경쟁자 분포(0.5~2.5 · 3.5~7.8 · 4.2~6.2)는 **144경기짜리 리그 동료**를 그린
     * 값이에요. 162경기 리그에서는 그 동료들도 162경기를 뛰니까 WAR이 같이 올라가야
     * 하는데, 고정해 두면 나만 누적이 늘고 문턱은 그대로라 상이 그냥 싸집니다.
     * 실제로 그렇게 뒀더니 준정상급(능력치 130)의 최적 리그가 열도에서 대륙으로
     * 넘어갔어요 — 타자·투수 둘 다요.
     *
     * 진입 컷(1.5 · 5.5 · 4.5)도 **같이** 늘려요. 경쟁자만 늘리고 컷을 두면
     * "겨루기는 그대로인데 입장은 쉬워지는" 반쪽이 돼서, 상 하나라도 받을 확률이
     * 긴 리그에서만 올라가요. 여기서 WAR과 겨루는 값은 **전부** k가 붙습니다.
     *
     * 그래서 이 판정은 **경기당 성적이 같으면 리그가 달라도 수상 확률이 같아요.**
     * 리그가 남기는 차이는 수상 확률이 아니라 ①난이도(oppUp·lgUp)로 깎인 성적과
     * ②명예의 전당에 쌓이는 누적(warSum·홈런·이닝)이에요. 후자가 "경기가 많아
     * 누적이 쌓인다"는 설계고, 그건 이 스케일과 무관하게 그대로 남아요.
     *
     * ⚠️ KBO는 144라 k가 정확히 1이에요 — 곱해도 값이 한 톨도 안 바뀝니다.
     * 난수를 뽑는 **횟수**도 그대로예요(rand의 인자만 바뀌어요). 옛 세이브는
     * S.season.total이 144라 여기로 떨어져요. tests/rookie/league-test.js ⑭가 지켜요.
     *
     * 기준은 **그 시즌의 total**이에요. 리그 표를 나중에 고쳐도 이미 치른 시즌의
     * 판정 기준은 안 흔들려요. */
    const AWARD_BASE = 144;
    const awardK = ((S.season && S.season.total) || AWARD_BASE) / AWARD_BASE;
    /* 컷을 3.5 → 1.5로 내렸어요. 타격·투구 판정을 다시 잡으면서 WAR 스케일이
     * 내려갔고, 새 모델의 1년차는 WAR 0 언저리예요. 예전 컷으로는 신인왕이
     * 아예 나오지 않습니다. 경쟁자 분포도 같은 비율로 낮췄어요. */
    if (S.proYear === 1 && war >= 1.5 * awardK) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(0.5 * awardK, 2.5 * awardK)));
      if (war >= bestRookie) { awards.push("신인왕"); S.career.roy += 1; }
    }
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5 * awardK, 7.8 * awardK)));
    if (war >= 5.5 * awardK && war >= leagueBest) {
      awards.push("MVP"); S.career.mvp += 1;
    }
    /* 골든글러브는 MVP와 별개로 판정해요.
     * 예전에는 else if라서 MVP를 받으면 골든글러브를 아예 못 받았고,
     * 그 바람에 리그 최고 시즌이 상을 덜 받는 역전이 있었어요.
     *
     * 컷은 투수가 더 높아요. 골든글러브는 리그에 10자리인데 투수는 그중 1자리라,
     * 모든 투수가 한 자리를 두고 겨루거든요. 야수는 포지션 안에서만 겨룹니다. */
    if (war >= 4.5 * awardK) {
      const posBar = S.pos === "batter"
        ? rand(4.2 * awardK, 6.2 * awardK)
        : rand(5.2 * awardK, 7.2 * awardK);
      if (war >= posBar) { awards.push("골든글러브"); S.career.gg += 1; }
    }
    addAwardWeight(awards, preAward);
    if (champ) S.career.rings += 1;
    S.career.warSum = Math.round((S.career.warSum + Math.max(war, 0)) * 10) / 10;
    /* team·league — **그 시즌에 뛴 소속**을 결산 시점에 그냥 적어요. 여기 적힌 값이 정본이에요.
     * league는 나중에 생긴 필드라 옛 기록에는 없어요. 그건 읽는 쪽(playedAt)이 S.moves에서
     * 역산해 메워요 — 세이브는 고치지 않아요(클라우드 동기화와 부딪혀요). */
    const wonTitles = titlesWon(raw);   // 🏅 이번 시즌 딴 타이틀 — 개인 기록 순위 1위
    if (wonTitles.length) S.career.titles = (S.career.titles || []).concat(wonTitles.map((w) => ({ id: w.id, y: S.proYear })));
    const mileBefore = careerCounts(S.career.seasons);   // 이번 시즌을 더하기 전 통산
    S.career.seasons.push({ y: S.proYear, age: S.age, war, line, rank, champ, awards, titles: wonTitles.map((w) => w.id), role: S.role, team: S.team, league: S.league, raw });
    const gotMiles = newMilestones(mileBefore, careerCounts(S.career.seasons), S.proYear);
    if (gotMiles.length) S.career.miles = (S.career.miles || []).concat(gotMiles);
    /* 어느 리그에서 뛴 시즌인지 남겨요 — 해외 진출(열도·대륙)이 실제로 쓰이는지
     * 데이터가 없었어요. 축구도 같은 이유로 year_end에 lg를 붙였습니다. */
    if (window.Stats) Stats.log("season_end", { y: S.proYear, war, rank, champ, lg: leagueOf(S).id });

    for (const d of STAT_DEFS[S.pos]) {
      if (S.age <= 25) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1.2) * S.talents[d.key], 0, statCap(d.key));
      else if (S.age >= 31) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.8, 2.2) - (S.age - 31) * 0.35, 0, statCap(d.key));
    }
    /* WAR 계수를 1500 → 2500으로 올렸어요. 판정 재조정으로 WAR이 절반 아래로
     * 내려가서, 그대로 두면 2.10.0·2.11.0에서 완화한 경제가 다시 빡빡해져요. */
    const salary = 3000 + Math.round(Math.max(war, 0) * 2500);
    S.money = (S.money || 0) + salary;
    S.age += 1;
    const finalW = sn.teamW, finalL = sn.teamL;
    // 결산 화면에서 보여줄 최종 순위표를 남겨둬요 (S.season을 곧 지우니까요)
    S.lastStandings = standingsHTML();
    S.season = null;
    S.pendingGame = false;
    const postLine = postStatLine();     // S.post를 지우기 전에 문구를 만들어요
    S.post = null;
    save();
    // 결산이 끝난 뒤에 올려요. save()보다 먼저 부르면 collect()가 **지난 시즌** 상태를
    // 담아 올리고 dirty=0 · 새 도장까지 찍어요. 바로 뒤 save()가 dirty를 다시 세워도
    // 방금 켜진 2분 잠금에 막혀서, 다른 기기는 한 시즌 전 상태를 받게 돼요.
    if (window.Cloud) Cloud.mark();

    const feeds = [
      { text: `🏁 정규시즌 종료 — 최종 ${rank}위 (${finalW}승 ${finalL}패)`, cls: rank <= 3 ? "good" : rank >= 8 ? "bad" : "" },
    ];
    if (postLine) feeds.push({ text: postLine });
    if (champ) feeds.push({
      text: S.career.rings === 1
        ? `🏆 ${postLabel("ks")} 우승 — 첫 반지예요!`
        : `🏆 ${postLabel("ks")} 우승 — 통산 ${S.career.rings}번째 반지예요`,
      cls: "good",
      fx: () => Fx.celebrate("champion", `🏆 ${postLabel("ks")} 우승!`),
    });
    // 수상은 하나씩 따로 띄워요 — 합쳐 놓으면 무엇을 받았는지 눈에 안 들어와요
    for (const a of awards) {
      feeds.push({ text: `🎖️ ${a} 수상!`, cls: "good", fx: () => Fx.celebrate("award", `🎖️ ${a} 수상!`) });
    }
    // 🏅 시즌 타이틀 — 리그 1등에 오르면 하나씩 크게 띄워요
    for (const w of wonTitles) {
      const t = TITLES[w.id];
      feeds.push({ text: `🏅 ${t.emoji} ${t.name} 등극!`, cls: "good", fx: () => Fx.celebrate("award", `🏅 ${t.name}!`) });
    }
    // 🏛️ 통산 고비를 넘겼으면 하나씩 크게 띄워요 — 커리어의 이정표예요
    for (const nm of gotMiles) {
      const def = MILESTONES.find((x) => x.key === nm.key);
      feeds.push({
        text: `${def.emoji} 대기록 — ${def.name} ${nm.n} 돌파!`, cls: "good",
        fx: () => Fx.celebrate("award", `${def.emoji} ${def.name} ${nm.n}!`),
      });
    }
    feeds.push({ text: `💰 시즌 연봉 정산 +${fmtMoney(salary)}`, cls: "good" });
    playFeeds(`📺 ${S.proYear}년차 시즌 결산`, feeds, seasonReport);
  }

  /* 🔁 이적 하나가 어느 시즌부터 반영되는지 돌려줘요.
   * 오프시즌 이적(inSeason이 아님)은 **다음** 시즌부터고, 시즌 중 트레이드는 **그** 시즌부터예요.
   * inSeason이 없는 옛 기록은 전부 오프시즌 이적이에요 (시즌 중 트레이드는 나중에 생겼어요). */
  const moveFrom = (m) => (m.inSeason ? m.y : m.y + 1);

  /* y년차에 뛴 팀을 S.moves에서 역산해요.
   *   ① y년차에 이미 반영된 이적 중 **마지막** 것의 도착팀
   *   ② 그런 이적이 없으면 **가장 이른 이적의 출발팀** (y 뒤에만 옮겼다는 뜻)
   *   ③ 이적이 아예 없으면 지금 팀 — 한 번도 안 옮긴 커리어예요
   * 근거가 하나도 없으면 null을 돌려주고, 부르는 쪽이 지금 팀으로 떨어져요. */
  function teamOfYear(y, st) {
    const mv = ((st && st.moves) || []).filter((m) => m && m.y != null && m.to != null);
    let last = null, first = null;
    for (const m of mv) {
      if (moveFrom(m) <= y && (!last || moveFrom(m) >= moveFrom(last))) last = m;
      if (!first || moveFrom(m) < moveFrom(first)) first = m;
    }
    if (last) return last.to;
    if (first && first.from != null) return first.from;
    return st ? st.team : null;
  }

  /* y년차에 뛴 리그를 역산해요. 리그를 옮긴 이적(moveToLeague)만 fromLeague·league를
   * 남기니까 그것만 봐요 — 같은 리그 안 이적(FA·트레이드)은 리그를 안 바꿔요. */
  function leagueOfYear(y, st) {
    const mv = ((st && st.moves) || []).filter((m) => m && m.y != null && m.league != null);
    let last = null, first = null;
    for (const m of mv) {
      if (moveFrom(m) <= y && (!last || moveFrom(m) >= moveFrom(last))) last = m;
      if (!first || moveFrom(m) < moveFrom(first)) first = m;
    }
    if (last) return last.league;
    if (first && first.fromLeague != null) return first.fromLeague;
    return st ? st.league : null;
  }

  /* 📊 그 시즌에 뛴 소속이에요 — **지금 소속이 아니라요.**
   *
   * 결산 화면에서 그대로 포스팅을 하면 화면이 다시 그려지는데, 여기서 S.team을 쓰면
   * 방금 끝난 시즌 성적 옆에 **새 팀 이름**이 붙어요. 그 시즌은 옛 팀에서 뛴 거예요.
   * ⚽ 축구(beta/soccer/career.js의 clubOfYear·fillClubs)가 같은 문제를 이렇게 풀었어요.
   *
   * 정본은 결산 때 적어둔 s.team·s.league고, 없으면 S.moves에서 역산해요.
   * 세이브는 고치지 않아요 — 그릴 때만 계산합니다(클라우드 동기화와 부딪혀요). */
  function playedAt(s, st) {
    const y = s ? s.y : null;
    const team = s && s.team != null ? s.team : (y != null ? teamOfYear(y, st) : (st && st.team));
    const league = s && s.league != null ? s.league : (y != null ? leagueOfYear(y, st) : (st && st.league));
    return { team: team != null ? team : (st && st.team), league };
  }

  function seasonReport() {
    const s = S.career.seasons[S.career.seasons.length - 1];
    /* 헤더는 **그 시즌에 뛴 팀**이에요. 이적하고 돌아와도 성적과 팀이 안 어긋나요. */
    const at = playedAt(s, S);
    const cur = leagueOf(S);
    // 결산 뒤에 팀이나 리그가 바뀌었으면 따로 알려줘요 — 헤더를 덮어쓰지 않아요
    const movedAfter = S.team !== at.team || cur.id !== leagueOf({ league: at.league }).id;
    const AWARD_TAG = { MVP: "MVP", 골든글러브: "GG", 신인왕: "신인왕" };
    const rows = S.career.seasons.slice(-8).map((x) => {
      const badges =
        (x.champ ? `<span class="sn-tag champ">🏆우승</span>` : "") +
        (x.awards || []).map((a) => `<span class="sn-tag award">🎖️${AWARD_TAG[a] || a}</span>`).join("") +
        (x.titles || []).map((id) => `<span class="sn-tag title">${TITLES[id] ? TITLES[id].emoji + TITLES[id].name : id}</span>`).join("");
      return `<tr><td>${x.y}년차</td><td>${x.age}세</td><td class="sn-line">${x.line}${badges ? `<span class="sn-tags">${badges}</span>` : ""}</td><td class="sn-war">${x.war.toFixed(1)}</td></tr>`;
    }).join("");
    // 8시즌을 넘기면 표가 잘리니 전체를 어디서 보는지 알려줘요
    const moreHint = S.career.seasons.length > 8
      ? `<div class="hint">최근 8시즌만 표시돼요 — 전체는 상단 <b>📊 기록</b>에서 볼 수 있어요</div>`
      : "";
    const forcedRetire = S.age > 40 || overall() < 30;
    $("career-title").textContent = `📊 ${s.y}년차 시즌 결산`;
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚾</div>
      <div class="draft-title">${
        s.war >= 5 ? "리그를 지배한 시즌!" :
        s.war >= 2.5 ? "제 몫을 해낸 시즌" :
        s.war >= 0.5 ? "아쉬움이 남는 시즌" : "혹독한 시즌…"
      }</div>
      <div class="draft-team">${at.team}${leagueTagOf(at.league)} <span class="team-str">${strLabel(teamStrOf(at.team))}</span> · ${s.line} · WAR ${s.war.toFixed(1)}</div>
      ${movedAfter ? `<div class="hint next-club">➡️ 다음 시즌 소속 — ${cur.flag} ${cur.name} · <b>${S.team}</b></div>` : ""}
      ${(S.moves || []).length ? `<div class="hint">🔁 이적 이력 — ${S.moves.map((m) => `${m.type === "post" ? "🌏 " : ""}${m.y}년차 ${m.from}→${m.to}${m.inSeason ? " (시즌 중)" : ""}`).join(" · ")}</div>` : ""}
      <div class="rec-tabs">
        <button type="button" class="rec-tab on" data-p="0">📊 팀 순위</button>
        <button type="button" class="rec-tab" data-p="1">📅 시즌별</button>
        <button type="button" class="rec-tab" data-p="2">🏛️ 통산</button>
      </div>
      <div class="rec-panes" id="rec-panes">
        <div class="rec-pane on">${S.lastStandings || `<div class="hint">최종 순위표가 없어요</div>`}</div>
        <div class="rec-pane"><table class="season-table season-career"><thead><tr><th>시즌</th><th>나이</th><th>성적</th><th>WAR</th></tr></thead><tbody>${rows}</tbody></table>${moreHint}</div>
        <div class="rec-pane">${milestoneHTML()}</div>
      </div>
      <div class="draft-summary">
        통산 ${S.career.seasons.length}시즌 · WAR ${S.career.warSum.toFixed(1)} · 🏆 우승 ${S.career.rings}회 · MVP ${S.career.mvp} · GG ${S.career.gg}${S.career.roy ? " · 신인왕" : ""}<br/>
        ${forcedRetire ? "구단에서 은퇴식을 준비하고 있어요…" : overall() < 42 ? "⚠️ 기량 하락이 눈에 띄어요. 은퇴를 고민할 때일지도." : "다음 시즌도 달릴 수 있어요!"}
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    if (!forcedRetire) {
      const next = document.createElement("button");
      next.className = "btn btn-primary";
      next.textContent = `⛺ ${S.proYear + 1}년차 캠프 시작`;
      next.onclick = startCamp;
      act.appendChild(next);
    }
    // 오프시즌 이적 — 자격이 될 때만 보여줘요
    if (!forcedRetire && faReady()) {
      const fa = document.createElement("button");
      fa.className = "btn btn-ghost";
      fa.id = "btn-fa";
      /* 문구를 짧게 둬요. 결산 버튼은 3열로 서서 폭이 좁아요 —
       * "(N년차 자격)"까지 붙이면 폰에서 "FA 선언 (8년차 자"로 잘렸어요.
       * 몇 년차인지는 FA 화면이 첫 줄에 적어줘요. */
      fa.textContent = "💼 FA 선언";
      fa.onclick = showFa;
      act.appendChild(fa);
    }
    if (!forcedRetire && tradeReady()) {
      const tr = document.createElement("button");
      tr.className = "btn btn-ghost";
      tr.id = "btn-trade";
      tr.textContent = "🔁 트레이드 요청";
      tr.onclick = startTrade;
      act.appendChild(tr);
    }
    /* 🌏 포스팅 — FA·트레이드와 같은 줄에 서요. 갈 곳이 하나라도 열려 있을 때만 보여요.
     * 해외에 있으면 복귀 경로가 늘 열려 있어서 이 버튼도 늘 있어요 (그게 돌아오는 길이에요). */
    if (!forcedRetire) {
      const po = postingOffers();
      if (po.length) {
        const up = po.some((g) => g.league.tier > leagueOf(S).tier);
        const btn = document.createElement("button");
        btn.className = "btn btn-ghost";
        btn.id = "btn-posting";
        // "(포스팅)"은 뺐어요 — 좁은 3열에서 잘려요. 포스팅이라는 말은 이적 화면 제목에 있어요.
        btn.textContent = up ? "🌏 해외 진출" : "🌏 리그 복귀";
        btn.onclick = showPosting;
        act.appendChild(btn);
      }
    }
    const ret = document.createElement("button");
    ret.className = "btn btn-ghost";
    ret.textContent = "🎓 은퇴하기";
    ret.onclick = () => {
      if (!confirm(
        `🎓 여기서 커리어를 마칠까요?\n\n` +
        `· 명예의 전당에 기록이 남아요\n` + retireSummary() +
        `· 등급: ${gradeOfScore(careerScore())}\n\n` +
        `⚠️ 되돌릴 수 없어요.` +
        (rebirthReady() ? ` 유산을 남기려면 '환생'을 선택하세요.` : ``) +
        `\n\n진행할까요?`
      )) return;
      enshrine(S.team);
    };
    act.appendChild(ret);
    const reb = document.createElement("button");
    reb.className = "btn btn-ghost";
    reb.textContent = "🧬 환생하기";
    reb.disabled = !rebirthReady();
    reb.onclick = () => rebirth(S.team);
    act.appendChild(reb);
    if (!rebirthReady()) {
      const rh = document.createElement("div");
      rh.className = "hint";
      rh.textContent = rebirthHint();
      act.appendChild(rh);
    }
    wireRecordTabs();
    if (window.Ads) window.Ads.display($("ad-career"));
    show("screen-career");
  }

  /* 📊 결산의 팀순위·시즌별·통산을 탭 하나로 접어요 — 세 표가 세로로 길어서 스크롤이 버거웠어요.
   * 탭 버튼으로도, 판을 좌우로 스와이프해서도 넘겨요 (폰에서 자연스럽게). */
  function wireRecordTabs() {
    const panes = $("rec-panes"); if (!panes) return;
    const tabs = Array.from(document.querySelectorAll(".rec-tab"));
    const boxes = Array.from(panes.querySelectorAll(".rec-pane"));
    let cur = 0;
    const go = (i) => {
      cur = Math.max(0, Math.min(boxes.length - 1, i));
      tabs.forEach((t, k) => t.classList.toggle("on", k === cur));
      boxes.forEach((b, k) => b.classList.toggle("on", k === cur));
    };
    tabs.forEach((t) => (t.onclick = () => go(+t.dataset.p)));
    // 좌우 스와이프 — 가로 이동이 세로보다 크고 40px을 넘으면 판을 넘겨요.
    let x0 = null, y0 = null;
    panes.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    panes.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
      x0 = y0 = null;
    }, { passive: true });
  }

  /* ---------- 이적 (FA 계약 · 트레이드 요청) ----------
   * 오프시즌(시즌 결산 화면)에서 팀을 옮길 수 있어요.
   *  · FA    — 자격 연차를 채우면 여러 구단의 제안 중에서 고르는 방식
   *  · 트레이드 — 내가 먼저 요청하고 구단 프런트와 협상해서 승낙을 받아내는 방식
   * 팀을 옮기는 게 의미가 있으려면 '어느 팀인지'가 성적에 영향을 줘야 해서,
   * 팀마다 전력(teamStr)을 두고 승률에 반영해요. */
  const FA_YEAR = 8;         // FA 자격 연차
  const TRADE_MIN_YEAR = 2;  // 트레이드 요청 가능 연차
  const TRADE_ROUNDS = 3;    // 협상 라운드 수
  /* 시즌 중 트레이드 창구. KBO 마감 시한(7월 31일)을 144경기의 약 70% 지점으로 옮겼어요.
   * 시즌 초반에는 실제로도 트레이드가 거의 없어서 하한도 뒀어요.
   *
   * 🌏 리그마다 경기 수가 달라서 **비율로 씁니다.** 30·100을 그대로 쓰면 162경기
   * 리그에서 마감이 62% 지점이 되고, 143경기 리그에서는 70%를 넘겨요 —
   * "시즌의 어디쯤"이라는 뜻이 리그마다 달라져 버려요.
   * 기준은 진행 중인 시즌의 total이라 옛 세이브(144)는 30·100 그대로예요. */
  const TRADE_OPEN = 30, TRADE_CLOSE = 100, TRADE_BASE = 144;
  const tradeOpenAt = () => Math.round((TRADE_OPEN * curTotal()) / TRADE_BASE);
  const tradeCloseAt = () => Math.round((TRADE_CLOSE * curTotal()) / TRADE_BASE);
  const TRADE_COND_ROUND = 8;   // 협상 한 라운드당 컨디션
  const TRADE_COND_FAIL = 20;   // 시즌 중 무산되면 추가로 깎이는 컨디션
  const TRADE_FRONT_PENALTY = 12; // 시즌 중엔 전력 이탈이라 구단이 더 꺼려요
  /* 팬 여론 문턱. 여론은 승낙 확률에 관여하지 않고, 성사된 뒤에만 쓰여요. */
  const FANS_CONTENDER = 45;  // 이 위여야 우승 후보가 행선지 후보에 들어와요
  const FANS_EXTRA = 65;      // 이 위면 행선지가 한 팀 늘어요
  const FANS_WELCOME = 60;    // 이 위면 환영 계약금이 붙어요
  const WELCOME_MAX = 3000;   // 여론 100일 때의 환영 계약금

  // 팀 전력 — 한 번 정해두고 시즌마다 조금씩 흔들려요. 저장본에도 남아서
  // '작년에 강했던 팀'이 올해도 대체로 강해요.
  function teamStrOf(name) {
    if (!S.teamStr) S.teamStr = {};
    if (typeof S.teamStr[name] !== "number") {
      /* 해외 구단은 목록에 전력이 못 박혀 있어요 — 리그마다 평균이 달라야 하니까요.
       * KBO 구단과 모르는 이름은 undefined라 예전 그대로 뽑아요. 난수를 뽑는 횟수까지
       * 예전과 같아야 진행 중인 캐릭터의 순위표가 안 튑니다. */
      const fixed = clubStrOf(name);
      S.teamStr[name] = typeof fixed === "number" ? fixed : Math.round(rand(0.38, 0.60) * 1000) / 1000;
    }
    return S.teamStr[name];
  }
  /* 타석·위기 판정에 넘기는 '상대 수준'이에요. 팀 전력 위에 리그 난이도를 얹어요.
   * 상위 리그에서는 모든 상대가 그만큼 셉니다.
   *
   * 순위표·팀 승률이 쓰는 teamStrOf와 일부러 갈라놨어요. 거기까지 oppUp을 얹으면
   * 리그를 옮긴 순간 우리 팀 승률과 가을야구 대진까지 함께 무너져요
   * (⚽ 축구에서 같은 자리를 놓쳐 수비수 팀 승률이 7%가 된 적이 있어요).
   * 리그 난이도는 '내가 상대하는 공'에만 걸립니다. 해외 구단의 전력은 구단 목록이 정해요.
   *
   * KBO는 oppUp이 0이라 teamStrOf와 한 톨까지 같아요 — 그래서 진행 중인 캐릭터의
   * 성적이 안 튀고, 기존 저장 데이터를 마이그레이션하지 않아도 됩니다.
   *
   * 🌏 상대를 '그 리그 평균 대비'로 읽어요. 해외 구단은 전력 자체가 높게 박혀 있어서
   * (대륙 평균 0.55), teamStrOf를 그대로 쓰면 리그 단차가 oppUp(0.06)보다 훨씬 커져
   * 대륙 타율이 무너졌어요 — 실제 단차가 의도의 2배가 됐죠. 그래서 리그 평균을 빼서
   * '리그가 세다'는 효과는 오직 oppUp에서만 오게 합니다. 평균을 빼도 리그 안의
   * 강팀·약팀 편차는 그대로 남아요. KBO는 평균이 0.49라 보정이 0 — 국내는 완전 항등이에요. */
  function oppFor(name) {
    return teamStrOf(name) - leagueAvgStr(leagueOf(S)) + 0.49 + leagueOf(S).oppUp;
  }
  /* 시즌마다 팀 전력이 조금씩 흔들려요. 울타리는 리그마다 달라요 —
   * KBO 울타리(0.36~0.63)를 해외에 그대로 씌우면 몇 시즌 만에 리그 차이가 녹아 없어져요.
   *
   * 🌏 **한 번이라도 알게 된 구단은 리그를 떠나 있어도 계속 흔들려요.**
   * 예전에는 지금 리그만 흔들어서, 해외에 나가 있는 동안 KBO 전력이 얼어붙었어요.
   * 5년 만에 돌아오면 5년 전 순위표가 그대로 살아나서, 리빌딩이던 팀이 여전히
   * 리빌딩이고 우승 후보가 여전히 우승 후보였죠. 복귀 경로가 생긴 지금은 실제로 보여요.
   *
   * 다른 리그는 **이미 S.teamStr에 있는 구단만** 흔들어요. 없는 구단까지 여기서
   * 만들어버리면 KBO만 뛴 옛 세이브가 뽑는 난수 횟수가 달라져서 순위표가 튑니다.
   * KBO만 뛴 세이브는 tier 1만 돌고 나머지는 통째로 건너뛰어요 — 예전과 한 톨도 안 달라요. */
  function driftTeamStr() {
    if (!S.teamStr) S.teamStr = {};
    const cur = leagueOf(S);
    for (const l of LEAGUES.slice().sort((a, b) => a.tier - b.tier)) {
      const mine = l.id === cur.id;
      const [lo, hi] = driftBandOf(l);
      for (const t of teamsOf(l)) {
        if (!mine && typeof S.teamStr[t] !== "number") continue;
        S.teamStr[t] = Math.round(clamp(teamStrOf(t) + rand(-0.03, 0.03), lo, hi) * 1000) / 1000;
      }
    }
  }
  const strLabel = (v) =>
    v >= 0.56 ? "🏆 우승 후보" : v >= 0.50 ? "📈 상위권" : v >= 0.44 ? "😐 중위권" : "🌱 리빌딩";

  /* 나이 계수 — 구단이 사는 건 지금 성적만이 아니라 남은 전성기예요.
   * 실제 FA 시장도 20대 후반이 정점이고 30줄부터 값이 빠져요.
   * 기울기를 완만하게 잡은 이유: 나이가 들면 스탯이 깎이고 그게 이미 WAR에
   * 반영돼요. 여기서 세게 곱하면 같은 노화를 두 번 감점하게 됩니다. */
  const ageValueMod = (a) => (a <= 25 ? 1.1 : a <= 29 ? 1 : clamp(1 - (a - 29) * 0.06, 0.35, 1));

  /* 시장 가치 0~100 — 최근 3시즌 WAR가 주력이고 현재 기량이 보조예요.
   * 여기에 나이를 곱해요. 이 값이 FA 제안 규모와 트레이드 난이도를 함께 좌우해요. */
  function marketValue() {
    const last3 = (S.career.seasons || []).slice(-3);
    const avgWar = last3.length ? last3.reduce((a, x) => a + Math.max(x.war, 0), 0) / last3.length : 0;
    return Math.round(clamp((avgWar * 11 + overall() * 0.35) * ageValueMod(S.age), 0, 100));
  }

  const moveTitle = (t) => { $("move-title").textContent = t; };
  const moveCard = (html) => { $("move-card").innerHTML = html; };
  function moveActions(list) {
    const box = $("move-actions");
    box.innerHTML = "";
    for (const it of list) {
      const b = document.createElement("button");
      b.className = "btn " + (it.ghost ? "btn-ghost" : "btn-primary");
      b.innerHTML = it.label;
      b.onclick = it.onClick;
      if (it.disabled) b.disabled = true;
      box.appendChild(b);
    }
  }

  // 팀을 실제로 옮겨요. 이적 이력은 결산·명예의 전당에서 쓰여요.
  function moveTo(team, type, bonus) {
    const from = S.team;
    /* 시즌 중 이적이면 내 팀 성적과 새 팀 성적을 맞바꿔요.
     * S.season은 내 팀(teamW/teamL)과 나머지 9팀(others)을 나눠 들고 있어서,
     * 자리만 바꾸면 순위표·상대팀·가을야구 대진이 전부 그대로 맞아떨어져요.
     * 리그 전체 승수도 보존돼요 — 지우는 게 아니라 옮기는 거니까요.
     * 오프시즌에는 finishSeason이 S.season을 지운 뒤라 이 분기를 타지 않아요. */
    if (S.season) {
      const sn = S.season;
      const i = sn.others.findIndex((o) => o.name === team);
      if (i >= 0) {
        const nt = sn.others[i];
        sn.others[i] = { name: from, w: sn.teamW, l: sn.teamL, str: teamStrOf(from) };
        sn.teamW = nt.w;
        sn.teamL = nt.l;
      }
    }
    S.team = team;
    S.money = (S.money || 0) + (bonus || 0);
    S.moves = S.moves || [];
    /* inSeason이 있어야 몇 년차 기록에 어느 팀을 쓸지 가릅니다.
     * 오프시즌 이적은 다음 시즌부터, 시즌 중 이적은 그 시즌부터 새 팀이에요.
     * 이 필드가 없는 옛 기록은 전부 오프시즌 이적입니다(시즌 중 이적은 2.14.0부터). */
    S.moves.push({ y: S.proYear, age: S.age, from, to: team, type, inSeason: !!S.season });
    proLog(`${type === "fa" ? "💼" : "🔁"} ${from} → ${team} 이적! (${type === "fa" ? "FA 계약" : "트레이드"})`);
    if (window.Stats) Stats.log("transfer", { type, from, to: team, y: S.proYear });
    save();
  }

  // ---------- FA ----------
  const faReady = () => S.proYear >= FA_YEAR && S.faYear !== S.proYear;

  /* 제안 목록. 강팀일수록 지갑을 덜 여니까 '돈이냐 우승이냐'가 갈려요. */
  function faOffers() {
    const mv = marketValue();
    const n = mv >= 60 ? 4 : mv >= 40 ? 3 : mv >= 22 ? 2 : 1;
    const others = shuffle(leagueTeams().filter((t) => t !== S.team)).slice(0, n);
    const offers = others.map((name) => {
      const str = teamStrOf(name);
      // 전력 계수를 크게 잡아야 '돈이냐 우승이냐'가 또렷해져요. 흔들림은 작게.
      const raw = (6000 + mv * 1100) * rand(0.93, 1.08) * (1.3 - (str - 0.44) * 2.8);
      return { name, str, money: Math.max(2000, Math.round(raw / 500) * 500) };
    });
    // 원소속팀은 언제나 붙잡아요 (조금 더 얹어서)
    const myStr = teamStrOf(S.team);
    offers.push({
      name: S.team, str: myStr, stay: true,
      money: Math.max(2000, Math.round((6000 + mv * 1150) * 1.1 / 500) * 500),
    });
    return offers;
  }

  function showFa() {
    const mv = marketValue();
    const offers = faOffers();
    moveTitle("💼 FA 자격 취득");
    moveCard(`
      <div class="draft-emoji">💼</div>
      <div class="draft-title">${S.proYear}년차 — 자유계약선수</div>
      <div class="draft-team">시장 가치 ${mv} / 100 · 제안 ${offers.length}건</div>
      ${(() => {
        const am = ageValueMod(S.age);
        if (am > 1) return `<div class="hint">🌱 ${S.age}세 — 남은 전성기가 길어 웃돈이 붙어요 (×${am.toFixed(2)})</div>`;
        if (am < 1) return `<div class="hint">⏳ ${S.age}세 — 나이가 시장 가치를 깎아요 (×${am.toFixed(2)})</div>`;
        return "";
      })()}
      <div class="hint">계약금이 큰 팀일수록 전력이 아쉬운 경우가 많아요. 우승을 노릴지, 목돈을 챙길지 골라주세요.</div>
      <div class="offer-list">${offers.map((o, i) => `
        <button class="offer" data-i="${i}">
          <span class="offer-team">${o.name}${o.stay ? ' <span class="offer-stay">잔류</span>' : ""}</span>
          <span class="offer-str">${strLabel(o.str)}</span>
          <span class="offer-money">💰 ${fmtMoney(o.money)}</span>
        </button>`).join("")}</div>`);
    $("move-card").querySelectorAll(".offer").forEach((b) => {
      b.onclick = () => {
        const o = offers[+b.dataset.i];
        if (!confirm(`${o.name} 와(과) 계약할까요?\n\n· 계약금 ${fmtMoney(o.money)}\n· 팀 전력 ${strLabel(o.str)}`)) return;
        S.faYear = S.proYear;
        if (o.stay) {
          S.money = (S.money || 0) + o.money;
          proLog(`💼 FA 잔류! ${S.team}와 재계약 (계약금 ${fmtMoney(o.money)})`);
          if (window.Stats) Stats.log("transfer", { type: "fa_stay", to: S.team, y: S.proYear });
          save();
        } else {
          moveTo(o.name, "fa", o.money);
        }
        if (window.Fx) Fx.celebrate("award", `💼 ${o.name} 계약!`);
        seasonReport();
      };
    });
    moveActions([{ label: "← 결산으로 돌아가기", ghost: true, onClick: seasonReport }]);
    show("screen-move");
  }

  // ---------- 트레이드 요청 ----------
  const tradeReady = () => S.proYear >= TRADE_MIN_YEAR && S.tradeYear !== S.proYear;
  // 시즌 중 신청 자격 — 연 1회 제약은 오프시즌과 공유해요
  const inSeasonTrade = () =>
    !!S.season && S.season.game >= tradeOpenAt() && S.season.game <= tradeCloseAt() && tradeReady();

  /* 협상 카드. front = 구단 프런트의 태도, fans = 팬 여론.
   * 어느 쪽도 공짜가 없어서 매 라운드 저울질을 하게 돼요. */
  /* 협상 카드. front = 구단 프런트의 태도, fans = 팬 여론.
   * 어느 쪽도 공짜가 없어서 매 라운드 저울질을 하게 돼요.
   * 같은 협상에서 한 번 쓴 카드는 다시 나오지 않아요 — 3라운드 동안
   * 무엇을 남겨둘지 계산하게 만들려고요. */
  const TRADE_CARDS = [
    { id: "talk",   label: "🤝 단장과 진솔한 면담", desc: "무난하지만 확실해요",            front: [10, 18], fans: [0, 0] },
    { id: "mates",  label: "🗣️ 동료들의 지지",      desc: "라커룸이 편을 들어줘요",          front: [8, 16],  fans: [4, 10] },
    { id: "ring",   label: "🏆 우승 도전 명분",     desc: "우리 팀이 강하면 역효과예요",      front: [12, 20], fans: [8, 16], contender: true },
    { id: "family", label: "🙏 가족 사정 호소",     desc: "구단도 사람 사정은 봐줘요",        front: [10, 16], fans: [6, 12] },
    { id: "quiet",  label: "🧊 조용히 기다리기",     desc: "잡음은 없지만 관심도 식어요",      front: [6, 12],  fans: [-14, -6] },
    { id: "thanks", label: "🎤 팀에 감사 인터뷰",   desc: "여론은 얻지만 구단은 미지근해요",   front: [2, 8],   fans: [12, 20] },
    { id: "fan",    label: "🙇 팬들께 직접 호소",   desc: "여론은 얻지만 프런트는 불편해요",   front: [-8, -2], fans: [16, 26] },
    { id: "press",  label: "📰 언론에 흘리기",      desc: "구단은 싫어하고 팬은 주목해요",     front: [-14, -6], fans: [12, 22] },
    { id: "pay",    label: "💰 연봉 삭감 감수",     desc: "지갑을 열어 길을 트는 방법",       front: [16, 26], fans: [-12, -4], cost: 3000 },
    { id: "fund",   label: "🎁 구단 발전기금",      desc: "확실하지만 아주 비싸요",           front: [24, 34], fans: [0, 0],    cost: 8000 },
    { id: "strike", label: "🧨 훈련 거부",          desc: "가장 강한 수 · 몸과 여론을 갈아넣어요", front: [22, 34], fans: [-20, -12], cond: 15 },
    { id: "rumor",  label: "💼 타 구단 관심설",     desc: "먹히면 크지만 역풍도 커요",        front: [18, 28], fans: [0, 0],
                    gamble: 0.55, bad: { front: [-12, -4], fans: [-8, 0] } },
  ];

  /* 승낙 확률. 화면과 판정이 반드시 같은 값을 써야 해서 함수로 뽑았어요.
   * 두 곳에 같은 식을 두면 한쪽만 고쳐져 어긋나요. */
  const tradeOdds = (front) => clamp((front - 40) / 50, 0.05, 0.95);

  // 시작 태도로 구단 분위기를 읽어줘요 — 숫자만 보면 감이 안 와요
  const tradeMood = (f) =>
    f >= 55 ? "구단도 재편을 고민하는 눈치예요"
    : f >= 35 ? "구단은 아직 마음을 정하지 못한 것 같아요"
    : f >= 20 ? "구단은 널 놓칠 생각이 없어 보여요"
    : "구단은 절대 못 놓겠다는 분위기예요";

  /* 구단 반응은 태도 변화량으로 골라요. 카드마다 전용 문구를 두면 카드가 늘 때마다
   * 문구도 따라 늘고, 도박 카드처럼 결과가 갈리는 경우를 못 맞춰요. */
  const frontReaction = (df) =>
    df >= 22 ? "단장이 처음으로 고개를 끄덕였어요"
    : df >= 12 ? "단장이 잠시 말을 멈췄어요…"
    : df >= 1 ? "구단은 별말 없이 들어줬어요"
    : df >= -8 ? "구단은 떨떠름한 표정이에요"
    : "구단은 불쾌한 기색을 감추지 않았어요";

  function startTrade() {
    // 협상 도중 화면을 벗어났다 오면 그 자리에서 이어가요
    if (!S.trade) {
      const mv = marketValue();
      // 시즌 중이면 지금 순위를 봐요. 작년 순위로 재면 올해 하위권이라 팔 이유가
      // 생긴 상황을 못 읽어요.
      const last = S.career.seasons[S.career.seasons.length - 1];
      const rank = S.season ? myRank() : last ? last.rank : 5;
      // 잘하는 선수일수록 안 놔주고, 팀이 하위권이면(리빌딩) 쉽게 놔줘요
      const raw = 48 - (mv - 40) * 0.42 + (rank - 5) * 3.4 - (S.season ? TRADE_FRONT_PENALTY : 0);
      const front = Math.round(clamp(raw, 8, 76));
      S.trade = { round: 1, front, fans: 50, log: [], paid: 0, used: [], mood: tradeMood(front) };
    }
    renderTrade();
    show("screen-move");
  }

  // 협상을 접거나 마친 뒤 돌아갈 곳
  const tradeBack = () => {
    if (S.season) { renderPro(); show("screen-pro"); }
    else seasonReport();
  };

  const gaugeHTML = (label, v, good) => `
    <div class="neg-gauge">
      <div class="neg-label"><span>${label}</span><span>${Math.round(v)}</span></div>
      <div class="bar"><div class="bar-fill ${good}" style="width:${clamp(v, 0, 100)}%"></div></div>
    </div>`;

  function renderTrade() {
    const T = S.trade;
    T.used = T.used || [];
    // 이미 쓴 카드와 돈이 모자란 카드는 빼요
    const pool = TRADE_CARDS.filter((c) => !T.used.includes(c.id) && !(c.cost && (S.money || 0) < c.cost));
    const cards = shuffle(pool).slice(0, 3);
    const pct = Math.round(tradeOdds(T.front) * 100);
    moveTitle("🔁 트레이드 요청");
    moveCard(`
      <div class="draft-emoji">🔁</div>
      <div class="draft-title">협상 ${T.round} / ${TRADE_ROUNDS} 라운드</div>
      <div class="draft-team">${S.team} 프런트와 이야기 중이에요</div>
      ${T.round === 1 && T.mood ? `<div class="hint">💬 ${T.mood}</div>` : ""}
      ${gaugeHTML("🏢 구단 태도", T.front, "scout")}
      <div class="hint">✅ 지금 승낙 확률 <b>${pct}%</b> — 구단 태도로만 정해져요 (42 이하는 5%, 90이면 95%)</div>
      ${gaugeHTML("📣 팬 여론", T.fans, "cond")}
      <div class="hint">📣 여론은 성사된 뒤에 쓰여요 — 45↑ 우승 후보도 데려가요 · 65↑ 행선지 +1팀 · 60↑ 환영 계약금 · 35↓ 이적 후 적응이 힘들어요</div>
      ${T.log.length ? `<div class="neg-log">${T.log.map((l) => `<div>${l}</div>`).join("")}</div>` : ""}`);
    moveActions(cards.map((c) => ({
      label: `${c.label}<span class="a-sub">${c.desc}</span>`,
      onClick: () => playTradeCard(c),
    })).concat([{ label: "← 요청 취소", ghost: true, onClick: () => { S.trade = null; save(); tradeBack(); } }]));
  }

  function playTradeCard(c) {
    const T = S.trade;
    T.used = T.used || [];
    T.used.push(c.id);                    // 같은 협상에서 다시 안 나와요

    // 💼 타 구단 관심설 — 먹히면 크고 아니면 역풍이에요
    const flop = c.gamble ? Math.random() >= c.gamble : false;
    const eff = flop ? c.bad : c;
    let df = randInt(eff.front[0], eff.front[1]);
    let dn = randInt(eff.fans[0], eff.fans[1]);
    // 우승 도전 명분은 우리 팀이 이미 강하면 먹히지 않아요
    if (c.contender && teamStrOf(S.team) >= 0.53) { df = -randInt(6, 12); dn = -randInt(2, 8); }

    if (c.cost) { const pay = Math.min(S.money || 0, c.cost); S.money -= pay; T.paid += pay; }
    // 🧨 훈련 거부의 몸값. 오프시즌은 캠프가 컨디션을 80으로 다시 세워서
    // 깎아봐야 사라져요 — 그쪽 대가는 여론 하락이에요.
    if (c.cond && S.season) S.condition = clamp(S.condition - c.cond, 0, 100);
    // 시즌 중 협상은 경기에 집중이 안 돼요. 오프시즌에는 깎이지 않아요.
    if (S.season) S.condition = clamp(S.condition - TRADE_COND_ROUND, 0, 100);

    T.front = clamp(T.front + df, 0, 100);
    T.fans = clamp(T.fans + dn, 0, 100);
    const sign = (v) => (v >= 0 ? `+${v}` : `${v}`);
    const gambleTxt = c.gamble ? (flop ? "역풍이 불었어요! " : "제대로 먹혔어요! ") : "";
    T.log.unshift(`${c.label} → 구단 ${sign(df)} · 여론 ${sign(dn)}`
      + `${c.cost ? ` · 💰 ${c.cost}만 지출` : ""}`
      + `${c.cond && S.season ? ` · 🩹 컨디션 -${c.cond}` : ""}`
      + `${S.season ? ` · 🩹 컨디션 -${TRADE_COND_ROUND}` : ""}`
      // 이 문자열은 innerHTML로 들어가요. \n은 HTML에서 접히니 <br>을 씁니다.
      + `<br>💬 ${gambleTxt}${frontReaction(df)}`);
    T.round += 1;
    save();
    if (T.round > TRADE_ROUNDS) finishTrade();
    else renderTrade();
  }

  function finishTrade() {
    const T = S.trade;
    const p = clamp((T.front - 40) / 50, 0.05, 0.95);
    const ok = Math.random() < p;
    S.tradeYear = S.proYear;
    if (!ok) {
      const mid = !!S.season;
      S.trade = null;
      S.tradeSour = true;              // 다음 캠프에서 컨디션이 깎여요
      // 시즌 중이면 남은 경기를 그 몸으로 뛰어야 해요
      if (mid) S.condition = clamp(S.condition - TRADE_COND_FAIL, 0, 100);
      proLog(`🔁 트레이드 요청이 거절됐어요… 구단과의 사이가 서먹해졌어요`);
      save();
      moveTitle("🔁 트레이드 무산");
      moveCard(`
        <div class="draft-emoji">🙅</div>
        <div class="draft-title">구단이 요청을 거절했어요</div>
        <div class="draft-team">승낙 확률 ${Math.round(p * 100)}% — 이번엔 닿지 않았어요</div>
        <div class="hint">올해는 다시 요청할 수 없어요.${mid
          ? ` 잡음의 여파로 컨디션이 ${TRADE_COND_FAIL} 떨어졌어요 (현재 ${Math.round(S.condition)}).`
          : " 다음 시즌 시작 컨디션이 조금 떨어져요."}</div>`);
      moveActions([{ label: mid ? "← 팀으로 돌아가기" : "← 결산으로", ghost: true, onClick: tradeBack }]);
      return;
    }
    /* 승낙 — 나를 원하는 구단을 추려요.
     * 우승 후보는 여론이 받쳐줘야 붙어요. 예전엔 시장 가치 55 이상이면 이 조건을
     * 통째로 우회해서, 잘하는 선수에게 여론이 아무 의미가 없었어요.
     * 그 우회를 없앴어요 — 여론을 챙길지 구단 태도를 밀지가 진짜 저울질이 되게요. */
    const mv = marketValue();
    // 기본은 3팀까지, 여론이 받쳐주면 한 팀 더. 안쪽 상한을 빼면 시장 가치가 높은
    // 선수는 기본이 이미 4가 돼서 여론 보너스가 아무 일도 안 해요.
    const slots = clamp(Math.min(3, 1 + Math.floor(mv / 30)) + (T.fans >= FANS_EXTRA ? 1 : 0), 2, 4);
    const pool = shuffle(leagueTeams().filter((t) => t !== S.team))
      .filter((t) => teamStrOf(t) < 0.52 || T.fans >= FANS_CONTENDER)
      .slice(0, slots);
    // 시즌 중엔 새 팀의 현재 성적도 보여줘요 — 가을야구 진출이 걸린 정보예요
    const rec = (name) => {
      const o = S.season && S.season.others.find((x) => x.name === name);
      return o ? ` · ${o.w}승 ${o.l}패` : "";
    };
    const suitors = (pool.length ? pool : shuffle(leagueTeams().filter((t) => t !== S.team)).slice(0, 2))
      .map((name) => ({ name, str: teamStrOf(name), rec: rec(name) }));
    const sour = T.fans < 35;
    /* 환영 계약금 — 팬이 반기면 새 구단이 지갑을 열어요.
     * 트레이드는 원래 이적료가 0이라(FA와 달리) 여론을 챙길 이유가 하나 더 생겨요. */
    const welcome = T.fans >= FANS_WELCOME
      ? Math.round(((T.fans - FANS_WELCOME) / (100 - FANS_WELCOME)) * WELCOME_MAX / 100) * 100
      : 0;
    moveTitle("🔁 트레이드 승낙!");
    moveCard(`
      <div class="draft-emoji">🤝</div>
      <div class="draft-title">구단이 길을 열어줬어요</div>
      <div class="draft-team">승낙 확률 ${Math.round(p * 100)}% · 팬 여론 ${Math.round(T.fans)}</div>
      ${sour ? `<div class="hint">⚠️ 여론이 차가워요. 새 팀에서도 시선이 곱지 않아 적응이 힘들 거예요.</div>` : ""}
      ${welcome ? `<div class="hint">🎉 팬들이 반겨요 — 환영 계약금 ${fmtMoney(welcome)}이 함께 들어와요</div>` : ""}
      <div class="hint">어느 팀으로 갈지 골라주세요. (${suitors.length}팀)</div>
      <div class="offer-list">${suitors.map((o, i) => `
        <button class="offer" data-i="${i}">
          <span class="offer-team">${o.name}</span>
          <span class="offer-str">${strLabel(o.str)}${o.rec}</span>
        </button>`).join("")}</div>`);
    $("move-card").querySelectorAll(".offer").forEach((b) => {
      b.onclick = () => {
        const o = suitors[+b.dataset.i];
        if (!confirm(`${o.name} 로 이적할까요?\n\n· 팀 전력 ${strLabel(o.str)}`
          + (welcome ? `\n· 환영 계약금 ${fmtMoney(welcome)}` : "")
          + (o.rec ? `\n· 현재 성적${o.rec}\n\n남은 시즌을 이 팀에서 뛰어요. 내 기록은 그대로 이어져요.` : ""))) return;
        if (sour) S.tradeSour = true;
        S.trade = null;
        moveTo(o.name, "trade", welcome);
        if (window.Fx) Fx.celebrate("award", `🔁 ${o.name} 이적!`);
        tradeBack();
      };
    });
    moveActions([]);
  }

  /* ---------- 🌏 해외 진출 (포스팅) ----------
   * 오프시즌에만, 한 해에 한 번. FA(8년차)·트레이드(2년차)와 나란히 서는 세 번째 창구예요.
   *
   * **세 번째 화면을 만들지 않았어요.** screen-move를 그대로 씁니다 —
   * moveTitle·moveCard·moveActions·`.offer` 목록까지 FA 화면과 같은 모양이에요.
   * 셋이 결산 화면의 같은 자리에서 같은 생김새로 열려야 '팀을 옮기는 일'이라는
   * 한 갈래로 읽혀요. 대신 자격 창구는 셋을 섞지 않았어요 — 아래 설명을 보세요.
   *
   * 왜 FA 화면에 섞지 않았나: FA는 8년차부터인데 포스팅은 4년차부터예요.
   * 섞으면 4~7년차에는 해외 제안을 볼 창구가 아예 없어지고, 8년차부터는 같은 목록에
   * 자격 연차가 다른 두 제도가 뒤엉켜요. 트레이드는 구단을 설득하는 협상 게임이라
   * 성격이 아예 달라서 거기에도 못 넣어요.
   *
   * 문턱은 **위로 갈 때만** 있어요. 돌아오는 이적은 언제든 됩니다.
   * 강등·방출은 없어요 — 벌이 무거우면 아무도 도전하지 않아요. */
  const POST_GATE = [
    // KBO → 열도: 첫 해외예요. 연차와 성적을 함께 봐요.
    { from: 1, to: 2, year: 4, war: 4.0 },
    /* 열도 → 대륙: 이미 해외를 겪었으니 연차는 안 봐요 (열도에 있다는 것 자체가 4년차 이상).
     * 그래서 직행보다 성적 문턱도 낮아요 — 실제 커리어 경로와 같아요. */
    { from: 2, to: 3, year: 0, war: 4.5 },
    // KBO → 대륙 직행: 가장 어려운 길이에요. 연차·성적 둘 다 제일 높아요.
    { from: 1, to: 3, year: 7, war: 5.5 },
  ];

  const lastSeason = () => {
    const ss = (S.career && S.career.seasons) || [];
    return ss.length ? ss[ss.length - 1] : null;
  };
  // 직전 시즌 WAR. 아직 한 시즌도 안 치렀으면 어떤 문턱도 못 넘어요.
  const lastWar = () => { const s = lastSeason(); return s ? s.war : -Infinity; };
  /* 오프시즌에만, 한 해에 한 번이에요 (FA의 S.faYear · 트레이드의 S.tradeYear와 같은 방식).
   * 옛 세이브엔 S.postYear가 없어요 — undefined !== proYear라 그대로 열려요. */
  const postingReady = () => !S.season && S.postYear !== S.proYear;

  /* 두 리그 사이의 문턱. 없으면 null(그 길이 아예 없다)이에요.
   * 내려가는 이적은 표에 없어도 언제나 열려요 — 이게 '복귀는 문턱이 없다'입니다. */
  function gateFor(from, to) {
    if (!from || !to || from.id === to.id) return null;
    if (to.tier < from.tier) return { from: from.id, to: to.id, year: 0, war: -Infinity, back: true };
    return POST_GATE.find((g) => g.from === from.id && g.to === to.id) || null;
  }

  /* 갈 수 있는 곳과 못 가는 곳을 **함께** 돌려줘요. 화면이 잠긴 리그도 보여주면서
   * 무엇이 모자란지 적어야 도전할 목표가 생겨요. tier 순서로 정렬해요(id 아니에요). */
  function postingGates() {
    const cur = leagueOf(S);
    const war = lastWar();
    const open = postingReady();
    return LEAGUES.slice().sort((a, b) => a.tier - b.tier)
      .filter((l) => l.id !== cur.id)
      .map((l) => {
        const gate = gateFor(cur, l);
        const okYear = !!gate && S.proYear >= gate.year;
        const okWar = !!gate && war >= gate.war;
        return { league: l, gate, okYear, okWar, ok: !!gate && okYear && okWar && open };
      });
  }
  const postingOffers = () => postingGates().filter((g) => g.ok);

  /* 🌏 리그 난이도를 숫자로 — 도박의 크기를 감추지 않으려면 여기가 정확해야 해요.
   *
   * 투수는 game.js의 crisisRuns를 **그대로 돌려요**(흉내 내지 않아요). 난수를 고정 씨앗으로
   * 갈아끼워서 같은 화면이 늘 같은 숫자를 보이게 합니다 — 다시 눌렀는데 숫자가 흔들리면
   * 크기를 재는 자가 못 돼요. 끝나면 finally에서 반드시 원래 Math.random으로 되돌려요
   * (crisisRuns는 동기 함수라 그 사이에 다른 코드가 끼어들지 않아요).
   *
   * 타자 쪽 hitP는 game.js의 타석 판정 안에 박혀 있어 부를 수가 없어서, 여기서 같은 식을
   * 한 번 더 씁니다. **소스에서 값을 옮겨 적은 유일한 자리예요.**
   * tests/rookie/posting-test.js가 진짜 hitP를 game.js에서 뽑아 이 함수와 대조해서
   * 둘이 어긋나면 빨간불이 떠요. */
  const HIT_OPP_K = 0.55;   // game.js hitP의 (oppStr - 0.49) 계수와 같아야 해요
  const hitPreview = (oppStr) =>
    clamp(0.16 + S.stats.contact / 800 - (oppStr - 0.49) * HIT_OPP_K, 0.10, 0.46) * clutch("contact");

  const CRISIS_PREVIEW_N = 4000;
  function crisisPreview(oppStr, lgUp) {
    const real = Math.random;
    let seed = 20260731;
    Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    try {
      let sum = 0;
      for (let i = 0; i < CRISIS_PREVIEW_N; i++) sum += crisisRuns(autoRes(S.stats.control), oppStr, lgUp);
      return sum / CRISIS_PREVIEW_N;
    } finally { Math.random = real; }
  }

  /* 그 리그에서 내 판정이 어떻게 되는지 한 숫자로. 리그 평균 상대를 기준으로 봐요 —
   * 어느 구단에 갈지는 다음 화면에서 따로 고르니까, 여기서는 '리그가 바뀌면 무엇이
   * 달라지는지'만 떼어 보여줍니다. 타자는 안타 확률(클수록 좋음),
   * 투수는 위기 한 번당 실점(작을수록 좋음)이에요.
   *
   * 🌏 기준 상대는 oppFor 처방과 **같은 계산**이라야 화면이 거짓말을 안 해요. oppFor가
   * 상대를 '그 리그 평균 대비'로 읽으니(teamStrOf − leagueAvgStr + 0.49 + oppUp), 리그
   * 평균 구단은 편차가 0이라 어느 리그든 정확히 0.49 + oppUp이 돼요 — 그게 그 리그에서
   * 실제로 만나는 상대의 평균이에요. 예전엔 여기는 0.49 + oppUp인데 실제 oppFor는
   * teamStrOf + oppUp(대륙 0.617)이라, 화면이 대륙의 실제 깎임을 절반 넘게 감췄어요.
   * 처방으로 실제 평균이 0.49 + oppUp과 맞아떨어지면서 이 숫자가 정직해집니다. */
  const leagueMetric = (lg) => (S.pos === "batter"
    ? hitPreview(0.49 + lg.oppUp)
    : crisisPreview(0.49 + lg.oppUp, lg.oppUp));
  /* 화면에 적히는 숫자예요. 차이(dTxt)도 **이 반올림한 값끼리** 빼요 —
   * 원값으로 빼면 "29.8% → 28.6%"인데 차이는 "−1.1%p"로 적히는 어긋남이 생겨요. */
  const metricRound = (v) => (S.pos === "batter" ? Math.round(v * 1000) / 10 : Math.round(v * 100) / 100);
  const metricDigits = () => (S.pos === "batter" ? 1 : 2);
  const metricUnit = () => (S.pos === "batter" ? "%" : "점");
  const metricTxt = (v) => `${metricRound(v).toFixed(metricDigits())}${metricUnit()}`;
  const metricName = () => (S.pos === "batter" ? "🏏 타석당 안타 확률" : "🔥 위기 한 번당 실점");

  function postingRow(g, i, cur, mine) {
    const l = g.league;
    const v = leagueMetric(l);
    const bat = S.pos === "batter";
    const diff = metricRound(v) - metricRound(mine);
    const dTxt = `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(metricDigits())}${bat ? "%p" : "점"}`;
    // 타자는 안타 확률이 내려가면 손해, 투수는 실점이 올라가면 손해예요
    const worse = bat ? diff < 0 : diff > 0;
    const dOpp = l.oppUp - cur.oppUp;
    const need = !g.gate
      ? "이 리그로 가는 길은 없어요"
      : [g.okYear ? "" : `${g.gate.year}년차 이상`,
         g.okWar ? "" : `직전 시즌 WAR ${g.gate.war.toFixed(1)} 이상`].filter(Boolean).join(" · ")
        || "올해는 이미 한 번 신청했어요";
    return `
      <button class="offer lg-offer${g.ok ? "" : " locked"}" data-i="${i}"${g.ok ? "" : " disabled"}>
        <span class="offer-team">${l.flag} ${l.name}${l.tier < cur.tier ? ' <span class="offer-stay">복귀</span>' : ""}</span>
        <span class="offer-str">상대 수준 ${dOpp >= 0 ? "+" : "−"}${Math.abs(dOpp).toFixed(2)} · 리그 위세 ×${l.prestige.toFixed(2)}</span>
        <span class="lg-num ${worse ? "down" : "up"}">${metricName()} ${metricTxt(mine)} → ${metricTxt(v)} <b>${dTxt}</b></span>
        ${g.ok ? "" : `<span class="lg-need">🔒 ${need}</span>`}
      </button>`;
  }

  function showPosting() {
    const cur = leagueOf(S);
    const gates = postingGates();
    const war = lastWar();
    const mine = leagueMetric(cur);
    moveTitle("🌏 리그 이적 (포스팅)");
    moveCard(`
      <div class="draft-emoji">🌏</div>
      <div class="draft-title">${S.proYear}년차 — 포스팅 신청</div>
      <div class="draft-team">지금 ${cur.flag} ${cur.name} · ${S.team} · 직전 시즌 WAR ${war === -Infinity ? "—" : war.toFixed(1)}</div>
      <div class="hint">오프시즌에 한 해 한 번만 신청할 수 있어요. <b>돌아오는 이적은 문턱이 없어요</b> — 언제든 내려올 수 있고, 성적이 나빠도 리그가 저절로 내려가지는 않아요.</div>
      <div class="offer-list">${gates.map((g, i) => postingRow(g, i, cur, mine)).join("")}</div>
      <div class="hint lg-warn">⚠️ <b>팀 승률과 가을야구 진출은 리그를 옮겨도 거의 그대로예요.</b>
        해외로 간다고 팀 성적이 좋아지지 않아요. 바뀌는 건 위에 적힌 <b>내 개인 성적</b>과,
        거기서 받은 상이 명예의 전당에 남는 <b>값어치(리그 위세)</b>예요.</div>`);
    $("move-card").querySelectorAll(".offer").forEach((b) => {
      b.onclick = () => {
        const g = gates[+b.dataset.i];
        if (g && g.ok) showPostingClubs(g);
      };
    });
    moveActions([{ label: "← 결산으로 돌아가기", ghost: true, onClick: seasonReport }]);
    show("screen-move");
  }

  /* 행선지 구단 고르기. FA와 같은 방식이에요 — 시장 가치가 높을수록 손을 내미는
   * 구단이 많아요. 리그의 열 구단을 통째로 보여주면 늘 최강팀만 고르게 돼서
   * '어디로 갈지'가 선택이 아니게 됩니다. */
  function showPostingClubs(g) {
    const lg = g.league, mv = marketValue();
    const n = mv >= 60 ? 4 : mv >= 40 ? 3 : 2;
    const clubs = shuffle(teamsOf(lg).filter((t) => t !== S.team)).slice(0, n)
      .map((name) => ({ name, str: teamStrOf(name) }));
    const v = leagueMetric(lg), mine = leagueMetric(leagueOf(S));
    moveTitle(`${lg.flag} ${lg.name} 이적`);
    moveCard(`
      <div class="draft-emoji">${lg.flag}</div>
      <div class="draft-title">${lg.name} — 행선지 선택</div>
      <div class="draft-team">시장 가치 ${mv} / 100 · 손을 내민 구단 ${clubs.length}곳</div>
      <div class="hint">${metricName()} ${metricTxt(mine)} → <b>${metricTxt(v)}</b> · 리그 위세 ×${lg.prestige.toFixed(2)}</div>
      <div class="offer-list">${clubs.map((o, i) => `
        <button class="offer" data-i="${i}">
          <span class="offer-team">${o.name}</span>
          <span class="offer-str">${strLabel(o.str)}</span>
        </button>`).join("")}</div>`);
    $("move-card").querySelectorAll(".offer").forEach((b) => {
      b.onclick = () => {
        const o = clubs[+b.dataset.i];
        if (!confirm(
          `${lg.flag} ${lg.name}의 ${o.name}(으)로 옮길까요?\n\n`
          + `· 팀 전력 ${strLabel(o.str)}\n`
          + `· ${metricName().replace(/^\S+\s/, "")} ${metricTxt(mine)} → ${metricTxt(v)}\n`
          + `· 리그 위세 ×${lg.prestige.toFixed(2)}\n\n`
          + `올해는 다시 신청할 수 없어요. 돌아오는 건 언제든 됩니다.`
        )) return;
        moveToLeague(lg, o.name);
        if (window.Fx) Fx.celebrate("award", `${lg.flag} ${o.name} 이적!`);
        seasonReport();
      };
    });
    moveActions([{ label: "← 리그 목록으로", ghost: true, onClick: showPosting }]);
    show("screen-move");
  }

  /* 리그를 실제로 옮겨요. 오프시즌에만 불려서 S.season이 없어요 —
   * 다음 initSeason이 leagueTeams()로 순위표를 새로 짜면 상대 구단이 통째로 바뀝니다.
   * 여기서 S.league를 내리는 코드는 어디에도 없어요. 강등이 없다는 건 그런 뜻이에요. */
  function moveToLeague(lg, team) {
    const from = S.team, fromLg = leagueOf(S);
    S.league = lg.id;
    S.team = team;
    S.postYear = S.proYear;
    S.moves = S.moves || [];
    // fromLeague·league를 함께 남겨요 — 옛 기록에는 없는 필드라 있으면 리그 이적이에요
    S.moves.push({
      y: S.proYear, age: S.age, from, to: team,
      type: "post", inSeason: false, fromLeague: fromLg.id, league: lg.id,
    });
    proLog(`🌏 ${fromLg.name} → ${lg.name} 이적! (${from} → ${team})`);
    if (window.Stats) Stats.log("transfer", { type: "post", from, to: team, y: S.proYear, league: lg.id });
    save();
  }

  // ---------- 명예의 전당 ----------
  /* 컷을 새 WAR 스케일에 맞춰 올렸어요. 예전 800은 개편 전 모델에서 4년이면
   * 닿아 이미 너무 낮았습니다. 점수 식(careerScore)은 그대로 두고 컷만 옮겨요 —
   * 둘 다 건드리면 무엇이 결과를 바꿨는지 알 수 없어져요.
   * 개편 전에 쌓인 기록은 점수가 부풀려져 있어 대부분 최고 등급으로 남아요.
   * 기록을 지우지 않기로 한 대가이고, 초창기 밸런스의 흔적으로 둡니다. */
  function gradeOfScore(sc) {
    if (sc >= 1200) return "🐐 불멸의 레전드";
    if (sc >= 700) return "👑 명예의 전당 헌액";
    if (sc >= 380) return "🌟 구단 레전드";
    if (sc >= 180) return "💪 준수한 커리어";
    if (sc >= 70) return "🧢 저니맨";
    return "🌱 짧고 굵은 야구 인생";
  }

  /* 🌏 리그 가중 — 같은 상이라도 위 리그에서 받은 게 명예의 전당에 크게 남아요.
   * 이적 화면이 "리그 위세 ×2.30"이라고 적어두는 그 배수고, 여기가 그 약속을 지키는 자리예요.
   *
   * 세 상(MVP·골든글러브·신인왕)에 **같은** 배수를 걸어요. 한 상만 크게 얹으면
   * league-test ⑨⑩이 '상 하나라도 × 위세'로 재둔 사다리가 흔들려요.
   *
   * ⚠️ 옛 세이브에는 가중 카운터(mvpW…)가 없어요. `(S.career.mvpW || 0) + prestige`로
   * 쓰면 MVP 4회짜리 세이브가 5번째를 받는 순간 지난 4회가 통째로 사라집니다
   * (점수 200 → 50). ⚽ 축구에서 실제로 낸 버그예요.
   * 그래서 가중 카운터가 없으면 **옛 카운터를 1배로 세어 이어붙여요.**
   *
   * 로드 시점에 마이그레이션하지 않아요. 상을 받는 이 순간에만 만듭니다 —
   * 그래야 상을 한 번도 안 받고 끝나는 옛 세이브가 한 톨도 안 바뀌어요. */
  function addAwardWeight(awards, pre) {
    // 이름표를 밖에 두지 않아요 — 밖에 두면 이 함수만 떼어다 돌리는 검사에서 조용히 비어요
    const KEY = { MVP: "mvp", 골든글러브: "gg", 신인왕: "roy" };
    const prestige = leagueOf(S).prestige;
    for (const a of awards) {
      const k = KEY[a];
      if (!k) continue;
      const base = S.career[k + "W"] != null ? S.career[k + "W"] : ((pre && pre[k]) || 0);
      // 1.4 + 1.4가 2.8000000000000003이 되는 부동소수 찌꺼기를 여기서 끊어요
      S.career[k + "W"] = Math.round((base + prestige) * 100) / 100;
    }
  }

  /* 읽는 쪽도 같은 규칙이에요 — 가중 카운터가 없으면 옛 카운터로 떨어져요.
   * KBO는 위세가 1이라 국내만 뛴 커리어의 점수는 예전과 완전히 같습니다. */
  const awardW = (c, key) => (c[key + "W"] != null ? c[key + "W"] : (c[key] || 0));

  /* warSum에는 가중을 걸지 않아요. 이유가 셋이에요.
   *  ① WAR은 상위 리그에서 이미 내려가요(그게 난이도예요). 거기에 위세를 곱하면
   *     난이도를 스스로 되돌리는 셈이에요.
   *  ② 투수 WAR이 타자보다 훨씬 커요(능력치 100에서 6.4 vs 3.0). warSum에 위세를 걸면
   *     같은 배수인데도 투수가 얻는 점수가 훨씬 커져서, 타자·투수가 같은 사다리를
   *     가져야 한다는 요구가 깨져요.
   *  ③ 실측이 사다리를 뒤집어요 — warSum까지 가중하면 능력치 100(평범) 구간의 최적이
   *     KBO를 벗어납니다(타자 열도 · 투수 대륙). 아랫칸이 무너지면 "실력이 되면 올라가는
   *     게 이득"이 아니라 "무조건 나가는 게 이득"이 돼요.
   * 실측 표는 tests/rookie/league-test.js ⑫에 있고, '커리어 점수가 지금 리그를 아예
   * 안 읽는다'는 구조는 tests/rookie/hof-test.js ⑧이 지켜요. */
  function careerScore() {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    return Math.round(
      c.warSum * 10 + c.rings * 25 + awardW(c, "mvp") * 40 + awardW(c, "gg") * 15 + awardW(c, "roy") * 20 +
      (S.trophies ? S.trophies.length : 0) * 8 + S.scout * 0.05 +
      transTotal() * 25 +   // ✨ 초월 단계 보너스
      mileScore(c)          // 🏛️ 통산 마일스톤 — 뒤 고비일수록 크게
    );
  }

  // ---------- 🧬 환생 ----------
  // 은퇴(명예의 전당 등록)와 달리, 기록은 남기지 않고 유산만 다음 세대에 넘겨요.
  /* 🧬 환생 자격 — 아래 중 하나라도 이루면 열려요.
   * 은퇴는 언제나 가능하니 못 채워도 커리어가 막히지는 않아요.
   * 초월은 시간이 아니라 투자를 요구해서(스탯 상한 + 판정 통과) 1단계로 둬요. */
  const REBIRTH_NEED = { win: 3, top: 3, trans: 1 };
  function rebirthReady() {
    const c = S.career || {};
    return (c.rings || 0) >= REBIRTH_NEED.win
      || (c.mvp || 0) >= REBIRTH_NEED.top
      || transTotal() >= REBIRTH_NEED.trans;
  }
  function rebirthHint() {
    const c = S.career || {};
    return `🏆 우승 ${c.rings || 0}/${REBIRTH_NEED.win} · 🎖️ MVP ${c.mvp || 0}/${REBIRTH_NEED.top} · 🌠 초월 ${transTotal()}/${REBIRTH_NEED.trans} — 하나만 채우면 열려요`;
  }

  function rebirth(team) {
    if (!rebirthReady()) {
      alert(`🧬 아직 환생할 수 없어요.\n\n${rebirthHint()}\n\n기록을 남기고 끝내려면 '은퇴'를 선택하세요.`);
      return;
    }
    const sc = careerScore();
    const gain = legacyGain(sc);
    const L = loadLegacy();
    const nextPts = L.pts + gain, nextGen = L.gen + 1;
    const before = legacyTalentBonus(L.pts), after = legacyTalentBonus(nextPts);
    if (!confirm(
      `🧬 여기서 커리어를 마치고 다음 세대에 물려줄까요?\n\n` +
      `· 유산 +${gain} (누적 ${nextPts})\n` +
      `· 다음 세대 시작 재능 +${before.toFixed(2)} → +${after.toFixed(2)}\n` +
      `· 시작 자금 ${fmtMoney(legacyMoneyBonus(nextPts))}\n` +
      `· ${nextGen + 1}세로 새로 시작해요\n\n` +
      `⚠️ 명예의 전당에는 남지 않아요. 기록을 남기려면 '은퇴'를 선택하세요.\n\n진행할까요?`
    )) return;
    saveLegacy({ pts: nextPts, gen: nextGen });
    if (window.Stats) Stats.log("rebirth", { gen: nextGen, pts: nextPts, score: sc });
    clearSave();
    if (window.Cloud) Cloud.mark();
    alert(
      `🧬 ${S.name}의 커리어가 막을 내렸어요.\n\n` +
      `유산 ${gain}을 남겨 누적 ${nextPts}이 됐습니다.\n` +
      `이제 ${nextGen + 1}세가 더 높은 재능으로 출발해요!`
    );
    // 전송이 끝나야 '올렸음' 도장이 찍혀요. 안 기다리고 새로고침하면 keepalive 덕에
    // 요청은 살아남아도 도장은 안 찍혀서, 혼자 쓰는 기기인데도 다음 실행에 충돌 화면이
    // 떠요. settle()은 상한이 있어 네트워크가 느려도 오래 붙잡지 않아요.
    if (window.Cloud && window.Cloud.settle) Cloud.settle().then(() => location.reload());
    else location.reload();
  }

  /* 🎓 은퇴 확인창에 넣을 요약. 되돌릴 수 없는 선택이라 뭐가 남는지 보여줘요. */
  function retireSummary() {
    const c = S.career || {};
    const awards = [
      (c.rings || 0) ? `🏆우승 ${c.rings}` : "",
      (c.mvp || 0) ? `🎖️MVP ${c.mvp}` : "",
      (c.gg || 0) ? `🧤GG ${c.gg}` : "",
      (c.roy || 0) ? "🌟신인왕" : "",
    ].filter(Boolean).join(" · ");
    const seasons = (c.seasons || []).length;
    return `    ${S.name} · ${seasons}시즌 · WAR ${(c.warSum || 0).toFixed(1)}${leagueTag()}\n`
      + (awards ? `    ${awards}${weightNote(c)}\n` : "    수상 기록 없음\n");
  }

  /* 🌏 상 옆에 붙는 한 줄. 리그 가중이 실제로 얹혀 있을 때만 보여줘요 —
   * "MVP 3"이라고만 적어두면 점수가 왜 그렇게 큰지 화면 어디서도 알 수가 없어요. */
  function weightNote(c) {
    const raw = (c.mvp || 0) * 40 + (c.gg || 0) * 15 + (c.roy || 0) * 20;
    const w = awardW(c, "mvp") * 40 + awardW(c, "gg") * 15 + awardW(c, "roy") * 20;
    return raw > 0 && Math.abs(w - raw) > 0.05 ? ` (🌏 리그 위세로 ×${(w / raw).toFixed(2)})` : "";
  }

  function enshrine(team) {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    const score = careerScore();
    // S를 지우기 전에 떠 둬요 — 아래 은퇴식 화면은 S가 null이 된 뒤에도 이 값을 씁니다
    const lgTag = leagueTag(), wNote = weightNote(c);
    const entry = {
      id: "p" + Date.now(),
      game: "rookie",
      name: S.name,
      pos: S.pos,
      team: team || "고교 무대",
      seasons: c.seasons.length,
      warSum: c.warSum,
      rings: c.rings, mvp: c.mvp, gg: c.gg, roy: c.roy,
      /* 🌏 어느 리그에서 마쳤는지와, 상이 리그 위세로 얼마나 크게 남았는지예요.
       * 옛 기록에는 없는 칸이라 화면은 없어도 되게 그려요 (마이그레이션하지 않아요). */
      league: leagueOf(S).id,
      mvpW: awardW(c, "mvp"), ggW: awardW(c, "gg"), royW: awardW(c, "roy"),
      finalOvr: Math.round(overall()),
      trans: transTotal(),
      gen: loadLegacy().gen + 1,
      score,
      grade: gradeOfScore(score) + (transTotal() ? ` · ${transcendTitle(transTotal())}` : ""),
    };
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
    if (window.Match) window.Match.submitHof("rookie", entry);
    // 마지막 리그를 남겨요 — "어디까지 갔나" 분포를 보려면 이게 있어야 해요
    if (window.Stats) Stats.log("retire", { seasons: entry.seasons, war: entry.warSum, score: entry.score, lg: leagueOf(S).id });
    clearSave();
    if (window.Cloud) Cloud.mark();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚾</div>
      <div class="draft-title">${entry.name}, 그라운드와 작별</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons ? `${entry.team}${lgTag}에서 ${entry.seasons}시즌을 뛰었어요.` : "프로 무대 대신 다른 길을 택했어요."}</div>
      <div class="draft-summary">
        통산 WAR ${(+entry.warSum).toFixed(1)} · 🏆 ${entry.rings} · MVP ${entry.mvp} · GG ${entry.gg}${entry.roy ? " · 신인왕" : ""}${wNote}<br/>
        커리어 점수 <b>${entry.score}</b> — 명예의 전당에 영구 기록됐어요
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    const hofBtn = document.createElement("button");
    hofBtn.className = "btn btn-primary";
    hofBtn.textContent = "🏛️ 명예의 전당 보기";
    hofBtn.onclick = showHof;
    act.appendChild(hofBtn);
    S = null; // 은퇴 완료 — 더 이상 '현역'으로 배틀 목록에 남지 않게
    const again = document.createElement("button");
    again.className = "btn btn-ghost";
    again.textContent = "🔁 새 선수 키우기";
    again.onclick = () => location.reload();
    act.appendChild(again);
    show("screen-career");
  }

  async function showHof() {
    const box = $("hof-list");
    box.innerHTML = `<p class="hint">불러오는 중…</p>`;
    show("screen-hof");
    if (window.Match) await window.Match.backfillHof();
    const local = loadHof().filter((e) => e.game === "rookie");
    const localIds = new Set(local.map((e) => e.id));
    let list = local, global = false;
    // 서버 기록에도 옛 이름이 남아 있어요 — 표시할 때 새 이름으로 갈아끼웁니다
    const remote = migrateNames(window.Match ? await window.Match.fetchHof("rookie") : null);
    if (remote && remote.length) {
      global = true;
      const seen = new Set();
      list = [];
      for (const e of [...remote, ...local]) {
        if (!e || seen.has(e.id)) continue;
        seen.add(e.id);
        list.push(e);
      }
    }
    list.sort((a, b) => b.score - a.score);
    hofShown = 20;
    drawHof(list, localIds);
  }

  // 더 보기로 20명씩 늘리고, 내 기록이 목록 밖이면 하단에 고정해서 보여줘요
  let hofShown = 20;
  function drawHof(list, localIds) {
    const box = $("hof-list");
    box.innerHTML = list.length ? "" : `<p class="hint">아직 아무도 없어요. 첫 전설이 되어보세요!</p>`;
    const myIdx = list.findIndex((x) => localIds.has(x.id));
    const view = list.slice(0, hofShown).map((e, i) => ({ e, i }));
    if (myIdx >= hofShown) view.push({ gap: true }, { e: list[myIdx], i: myIdx });
    view.forEach(({ e, i, gap }) => {
      if (gap) { const gp = document.createElement("div"); gp.className = "hof-gap"; gp.textContent = "⋯"; box.appendChild(gp); return; }
      const div = document.createElement("div");
      div.className = "hof-card" + (localIds.has(e.id) ? " me" : "");
      div.innerHTML = `
        <div class="hof-face-emoji">⚾</div>
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.gen > 1 ? `<span class="hof-gen">${e.gen}세</span> ` : ""}${e.name} <span class="hof-grade">${e.grade}</span></div>
          ${e.team} · ${e.seasons}시즌 · WAR ${(+e.warSum).toFixed(1)} · 🏆${e.rings} · 점수 ${e.score}
        </div>`;
      box.appendChild(div);
    });
    const left = list.length - Math.min(list.length, hofShown);
    if (left > 0) {
      const more = document.createElement("button");
      more.className = "mini-btn rank-more";
      more.textContent = `▾ 더 보기 (${left}명 남음)`;
      more.onclick = () => { hofShown += 20; drawHof(list, localIds); };
      box.appendChild(more);
    }
  }

  // ---------- 랜덤 매칭 (공용 ../match.js — Supabase 연동) ----------
  const GAME_ID = "rookie";
  const matchEnabled = () => !!(window.Match && window.Match.enabled());
  function submitProfile(f, rating, w, l) {
    if (window.Match) window.Match.submit(GAME_ID, { name: f.name, bp: f.bp, rating, w, l });
  }
  async function fetchRoster() {
    return window.Match ? window.Match.roster(GAME_ID) : null;
  }

  // ---------- 배틀 아레나 ----------
  const BATTLE_TXT = [
    "초반부터 팽팽한 투수전! 🧊",
    "중반, 흐름을 가져오는 한 방! 💥",
    "수비에서 슈퍼캐치가 터졌어요 🧤",
    "불펜 싸움으로 이어지는 접전 🔥",
    "9회, 심장이 터질 듯한 클라이맥스 ⚡",
  ];

  // 현역(육성 중) 선수 + 은퇴 선수 모두 출전 가능
  function fighters() {
    const list = [];
    if (S && S.name) {
      const warSum = S.career ? S.career.warSum : 0;
      list.push({
        id: "cur-" + S.name,
        name: `${S.name} (현역)`,
        bp: Math.round(overall() * 3 + (S.scout || 0) * 0.15 + warSum * 8),
      });
    }
    for (const e of loadHof().filter((x) => x.game === "rookie")) {
      list.push({ id: e.id, name: e.name, bp: bpOf(e.score, e.finalOvr) });
    }
    return list;
  }

  let battleReturn = "screen-title";
  function showBattle(returnTo) {
    if (returnTo) battleReturn = returnTo;
    if (!S) {
      const sv = localStorage.getItem(SAVE_KEY);
      if (sv) S = JSON.parse(sv);
    }
    const list = fighters();
    const setup = $("battle-setup");
    if (!list.length) {
      setup.innerHTML = `<p class="hint">대결할 선수가 없어요.<br/>먼저 선수를 키우면 현역이든 은퇴 후든 언제든 참전할 수 있어요!</p>`;
    } else {
      setup.innerHTML = `
        <div class="battle-row">
          <label>내 선수</label>
          <select id="battle-me">${list.map((f, i) => `<option value="${i}">${f.name} · 전투력 ${f.bp}</option>`).join("")}</select>
          <button class="btn btn-primary" id="btn-fight">🎲 랜덤 매칭 시작</button>
          <p class="av-note">${matchEnabled() ? "🌍 전 세계 플레이어 풀에서 전투력이 비슷한 상대를 찾아요" : "🤖 오프라인 모드 — 매칭 서버 연결 전까진 봇과 매칭돼요"}</p>
        </div>`;
      $("btn-fight").onclick = async () => {
        if (battling) return;
        battling = true;
        const btn = $("btn-fight");
        btn.disabled = true;
        btn.textContent = "🔍 상대 찾는 중…";
        try {
          const me = list[+$("battle-me").value];
          const roster = await fetchRoster();
          let opp;
          const pool = (roster || []).filter((r) => !r.mine);
          if (pool.length) {
            pool.sort((a, b) => Math.abs(a.bp - me.bp) - Math.abs(b.bp - me.bp));
            const o = pick(pool.slice(0, 6)); // 전투력 근접 매칭
            opp = { id: "r-" + o.id, name: o.name, bp: o.bp, remote: true };
          } else {
            const g = pick(GHOSTS);
            opp = { ...g, name: `${g.name} (봇)` };
          }
          btn.textContent = "⚔️ 배틀 진행 중…";
          fight(me, opp);   // 잠금은 finishFight에서 풀어요
        } catch (e) {
          resetFightBtn();   // 실패해도 다시 시도할 수 있게 잠금은 풀어줘요
          throw e;           // 원인은 삼키지 않고 그대로 드러내요
        }
      };
    }
    // 배틀 도중에 나갔다 다시 들어와도 잠긴 채로 남지 않게 초기화해요.
    clearInterval(battleTimer);
    battling = false;
    $("battle-view").innerHTML = "";
    renderRanking();
    show("screen-battle");
  }

  let battleTimer = null;
  // 매칭 요청부터 결과 표시까지 버튼을 잠가요. 안 잠그면 배틀 연출(약 3초) 중에
  // 다시 눌려서 진행 중이던 배틀이 결과 없이 사라져요.
  let battling = false;
  function resetFightBtn() {
    battling = false;
    const btn = $("btn-fight");
    if (btn) { btn.disabled = false; btn.textContent = "🎲 랜덤 매칭 시작"; }
  }
  function fight(me, opp) {
    const p = clamp(0.5 + (me.bp - opp.bp) / 700, 0.08, 0.92);
    const win = Math.random() < p;
    if (window.Stats) Stats.log("battle", { win, remote: !!opp.remote });
    const myRuns = win ? randInt(3, 8) : randInt(0, 3);
    const oppRuns = win ? randInt(0, Math.max(0, myRuns - 1)) : myRuns + randInt(1, 3);

    $("battle-view").innerHTML = `<div class="tour-card"><div class="pbp" id="battle-pbp"></div><div id="battle-result"></div></div>`;
    const feeds = [
      { text: `⚔️ ${me.name} vs ${opp.name} — 플레이볼!` },
      ...shuffle([...BATTLE_TXT]).slice(0, 3).map((t) => ({ text: t })),
      { text: `📢 경기 종료 — ${myRuns}:${oppRuns}`, cls: win ? "good" : "bad" },
    ];
    let idx = 0;
    clearInterval(battleTimer);
    battleTimer = setInterval(() => {
      if (idx >= feeds.length) {
        clearInterval(battleTimer);
        finishFight(me, opp, win, myRuns, oppRuns);
        return;
      }
      const f = feeds[idx++];
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("battle-pbp").appendChild(div);
    }, 550);
  }

  function finishFight(me, opp, win, a, b) {
    const data = loadBattle();
    data.records = data.records || {};
    const rec = (id, name, base, ghost) =>
      data.records[id] || (data.records[id] = { name, rating: base, w: 0, l: 0, ghost });
    const rm = rec(me.id, me.name, 1000, false);
    const ro = rec(opp.id, opp.name, opp.bp ? 900 + Math.round(opp.bp / 4) : 1000, !opp.remote);
    const expected = 1 / (1 + Math.pow(10, (ro.rating - rm.rating) / 400));
    const delta = Math.round(24 * ((win ? 1 : 0) - expected));
    rm.rating += delta;
    ro.rating -= delta;
    if (win) { rm.w++; ro.l++; } else { rm.l++; ro.w++; }
    saveBattle(data);
    submitProfile(me, rm.rating, rm.w, rm.l); // 내 최신 전적을 매칭 풀에 공유
    $("battle-result").innerHTML = `
      <div class="tour-vs">${win ? `${me.name} 승리! 🎉` : `${opp.name} 승리… 💧`} <span class="score-final">${a}:${b}</span></div>
      <div class="tour-pts">레이팅 ${delta >= 0 ? "+" : ""}${delta} → ${rm.rating}</div>`;
    resetFightBtn();
    renderRanking();
  }

  async function renderRanking() {
    let rows = [];
    let global = false;
    const roster = await fetchRoster();
    if (roster && roster.length) {
      global = true;
      rows = roster.map((p) => ({
        id: p.id,
        name: p.name,
        rating: p.rating || 1000,
        w: p.w || 0,
        l: p.l || 0,
        ghost: !p.mine,
      }));
    } else {
      const data = loadBattle();
      rows = Object.entries(data.records || {}).map(([id, r]) => ({ id, ...r }));
      for (const g of GHOSTS) {
        if (!rows.find((r) => r.id === g.id)) {
          rows.push({ id: g.id, name: `${g.name} (봇)`, rating: 900 + Math.round(g.bp / 4), w: 0, l: 0, ghost: true });
        }
      }
    }
    rows.sort((x, y) => y.rating - x.rating);
    rankShown = 15;
    drawRanking(rows, global);
  }

  // 더 보기로 15명씩 늘리고, 내 순위가 목록 밖이면 하단에 고정해서 보여줘요
  let rankShown = 15;
  function drawRanking(rows, global) {
    const myIdx = rows.findIndex((r) => !r.ghost);
    const row = (r, i) => `<tr class="${r.ghost ? "" : "me"}"><td>${i + 1}</td><td>${r.name}</td><td>${r.w}승 ${r.l}패</td><td>${r.rating}</td></tr>`;
    const shown = rows.slice(0, rankShown).map(row).join("");
    const pinned = myIdx >= rankShown ? `<tr class="hof-gap-row"><td colspan="4">⋯</td></tr>` + row(rows[myIdx], myIdx) : "";
    const left = rows.length - Math.min(rows.length, rankShown);
    $("battle-rank").innerHTML = `
      <h2 class="rank-title">🏅 ${global ? "글로벌" : "로컬"} 배틀 랭킹 <span class="rank-total">${rows.length}명</span></h2>
      <table class="rank-table"><thead><tr><th>#</th><th>선수</th><th>전적</th><th>레이팅</th></tr></thead>
      <tbody>${shown}${pinned}</tbody></table>
      ${left > 0 ? `<button class="mini-btn rank-more" id="btn-rank-more">▾ 더 보기 (${left}명 남음)</button>` : ""}`;
    const mb = $("btn-rank-more");
    if (mb) mb.onclick = () => { rankShown += 15; drawRanking(rows, global); };
  }

  // ---------- 초기화 ----------
  $("btn-hof")?.addEventListener("click", showHof);
  $("btn-battle")?.addEventListener("click", () => showBattle("screen-title"));
  $("btn-battle-main")?.addEventListener("click", () => showBattle("screen-main"));
  $("btn-battle-pro")?.addEventListener("click", () => showBattle("screen-pro"));
  $("btn-hof-back")?.addEventListener("click", () => show("screen-title"));
  $("btn-battle-back")?.addEventListener("click", () => show(battleReturn));

  return {
    onDraft,
    // 🛍️ 상점에서 돌아올 때 가을야구 중이면 포스트시즌 화면으로 돌아가야 해요.
    // renderPro로 고정돼 있으면 경기 시작 버튼이 사라지고 훈련 버튼이 살아나요.
    refreshPro: () => (inPost() ? renderPost() : renderPro()),
    showSeasonReport: seasonReport,
    // 🏛️ 통산 기록 블록 — 결산뿐 아니라 상시 접근하는 📊 기록 화면(game.js)에서도 그려요
    milestoneHTML,
    // 테스트에서 내부 계산을 들여다보기 위한 창구예요 (게임 로직은 이걸 쓰지 않아요)
    _internals: { marketValue, teamWinP, teamStrOf, faOffers },
    /* 리그 관련 창구예요. 시리즈의 다른 게임(⚽ 축구)이 `_t`로 통일돼 있어서
     * 해외 진출로 새로 붙는 것들은 여기에 모아요. LEAGUES·leagueOf는 game.js의
     * 전역이지만, 테스트가 한 곳만 보면 되게 여기서 같이 내보내요. */
    _t: {
      LEAGUES, leagueOf, oppFor, teamStrOf,
      POST_GATE, postingGates, postingOffers, moveToLeague, postLabel, KS_LABEL,
      LEAGUE_CLUBS, teamsOf, clubStrOf, driftBandOf, leagueTeams, driftTeamStr, teamWinP, gameWinP,
      // ⚾ 리그별 경기 수와, 거기에 비례해 움직이는 트레이드 창구
      seasonTotal, curTotal, tradeOpenAt, tradeCloseAt, inSeasonTrade,
      // 📊 그 시즌에 뛴 소속 — 결산 헤더가 지금 팀을 쓰지 않는지 화면에서 대조할 때 써요
      playedAt,
      // ⚡ 실전 성장 — 확률·무게 산식을 테스트가 그대로 굴려 볼 수 있게 열어 둬요
      MATCH_GROW, growWeightOf, growWhyOf, growPOf, matchGrowth,
      // 🏅 개인 기록 순위 — 라이벌 필드·시뮬·순위·수상 판정을 테스트가 그대로 굴려요
      TITLES, titleMetric, myTitles, titlesWon, RACE_ANCHOR, RACE_COUNTS,
      rollRace, raceStep, raceRank, raceTop, ensureRace,
      state: () => S,
    },
    enterPro,
    showHof,
    showBattle,
    showPro: () => {
      // 가을야구 도중에 나갔다 와도 그 자리에서 이어져요
      if (inPost()) { renderPost(); show("screen-pro"); }
      else if ((S.season && S.pendingGame) || S.camp > 0) { renderPro(); show("screen-pro"); }
      // 정규시즌을 다 치른 뒤라면 결산으로 이어져야 해요. 여기서 runSeason으로
      // 떨어지면 한 경기가 더 생기고, 방금 딴 우승이 새 대진에 덮여 사라져요.
      // 기준은 저장본의 total이에요 — 리그마다 경기 수가 다르니 숫자를 못 박지 않아요.
      else if (S.season && S.season.game >= S.season.total) {
        if (S.post) advancePostseason(); else finishSeason();
      }
      else if (S.season) runSeason();
      else seasonReport();
    },
  };
})();
