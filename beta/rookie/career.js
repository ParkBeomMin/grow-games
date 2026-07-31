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
    $("pro-team").textContent = `⚾ ${S.team} · ${S.role || ""} · ${S.age}세 · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
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
      const left = TRADE_CLOSE - S.season.game;
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

  // ---------- 시즌 (144경기를 한 경기씩) ----------
  const KBO_TEAMS = REGIONS.flatMap((r) => r.teams);
  const SEASON_TOTAL = 144;

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
      total: SEASON_TOTAL,
      teamW: 0,
      teamL: 0,
      // 팀 전력은 저장본에 남아요 — 이적할 때 '어느 팀인지'가 의미를 가지려면 필요해요
      others: KBO_TEAMS.filter((t) => t !== S.team).map((name) => ({ name, w: 0, l: 0, str: teamStrOf(name) })),
      stats: S.pos === "batter" ? { ab: 0, hits: 0, hr: 0, sb: 0 } : { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 },
    };
    save();
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
    $("pro-standings-sum").textContent =
      `📊 ${myRank()}위 · ${S.season.teamW}승 ${S.season.teamL}패`;
    $("pro-standings-body").innerHTML = standingsHTML();
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
    ? `${Postseason.LABEL[S.post.myRound]} ${S.post.gameNo}차전`
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

  // 경기 종료 후 공통 처리 — 팀/리그/개인 기록 갱신
  function finishProGame(win, perf) {
    if (inPost()) return finishPostGame(win, perf);
    const sn = S.season;
    sn.game += 1;
    if (win) sn.teamW += 1; else sn.teamL += 1;
    for (const o of sn.others) {
      if (Math.random() < o.str) o.w += 1; else o.l += 1;
    }
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
    const pay = win ? 40 : 20;
    S.money = (S.money || 0) + pay;
    S.condition = clamp(S.condition - randInt(3, 6), 0, 100);
    S.pendingGame = false;
    save();
    const extra = `<div class="tour-pts">💰 수당 +${pay}만 · ${S.team} ${sn.teamW}승 ${sn.teamL}패 · 현재 ${myRank()}위</div>`;
    if (sn.game >= sn.total) {
      return { extra, nextLabel: "🍂 정규시즌 종료", nextFn: enterPostseason };
    }
    return {
      extra,
      nextLabel: `🏋️ 다음 경기 준비 (G${sn.game + 1})`,
      nextFn: () => {
        // 3연전 단위로 시리즈가 끝나면 이동일이 껴서 훈련 기회가 더 많아요
        S.camp = sn.game % 3 === 0 ? 3 : 2;
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
    const pay = win ? 80 : 40;              // 가을야구 수당은 정규시즌의 두 배예요
    S.money = (S.money || 0) + pay;
    S.condition = clamp(S.condition - randInt(3, 6), 0, 100);

    const myW = iAmA ? s.aw : s.bw, opW = iAmA ? s.bw : s.aw;
    const extra = `<div class="tour-pts">💰 수당 +${pay}만 · 시리즈 ${myW}-${opW}</div>`;

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
    const label = Postseason.LABEL[s.round];
    const line = {
      text: won ? `🎉 ${label} 승리! (${myW}-${opW})` : `😢 ${label} 탈락… (${myW}-${opW})`,
      cls: won ? "good" : "bad",
    };
    /* 가을야구에 들어간 뒤로는 남은 시리즈가 전부 내 경기예요. 그래서 라운드를 이기면
     * 연출 화면에 띄울 게 이 한 줄뿐이라, 결과 카드를 지우고 빈 상자를 보여주게 돼요.
     * 대신 결과 화면 위에서 축하만 하고, 다음 라운드로는 버튼을 눌러야 넘어가요.
     * 탈락·한국시리즈는 결산으로 가면서 다른 팀 결과도 함께 흘려보내야 해서 그대로 둬요. */
    const nextName = Postseason.LABEL[ROUND_ORDER[ROUND_ORDER.indexOf(s.round) + 1]];
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
    const label = Postseason.LABEL[s.round];

    $("pro-name").textContent = `${S.name} (${S.pos === "batter" ? "타자" : "투수"})`;
    $("pro-team").textContent = `⚾ ${S.team} · ${S.role || ""} · ${S.age}세 · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
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
        return `<tr class="${x.round === P.myRound ? "me" : ""}"><td>${Postseason.LABEL[x.round]}</td><td>${line}</td></tr>`;
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
      feeds.push({ text: `${Postseason.LABEL[r.round]}  ${r.a} ${r.aw}-${r.bw} ${r.b} → ${r.winner} 진출` });
    }

    // 가을야구 종료 — 우승 여부를 확정하고 결산으로
    const ks = P.series[3];
    P.wonKS = !!(ks.done && ks.winner === P.myTeam);
    P.myRound = null;
    save();
    if (P.wonKS) feeds.push({ text: "🏆 한국시리즈 우승!! 헹가래의 주인공이 됐어요", cls: "good" });
    else if (ks.done) feeds.push({ text: `🏆 ${ks.winner}이(가) 한국시리즈 우승을 차지했어요` });
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
    // 수상은 '리그 내 상대 비교' — 가상 경쟁자들의 WAR와 겨뤄 최고면 수상해요.
    // (압도적인 시즌은 랜덤에 밀려 MVP를 놓치지 않아요)
    const awards = [];
    /* 컷을 3.5 → 1.5로 내렸어요. 타격·투구 판정을 다시 잡으면서 WAR 스케일이
     * 내려갔고, 새 모델의 1년차는 WAR 0 언저리예요. 예전 컷으로는 신인왕이
     * 아예 나오지 않습니다. 경쟁자 분포도 같은 비율로 낮췄어요. */
    if (S.proYear === 1 && war >= 1.5) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(0.5, 2.5)));
      if (war >= bestRookie) { awards.push("신인왕"); S.career.roy += 1; }
    }
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8)));
    if (war >= 5.5 && war >= leagueBest) {
      awards.push("MVP"); S.career.mvp += 1;
    }
    /* 골든글러브는 MVP와 별개로 판정해요.
     * 예전에는 else if라서 MVP를 받으면 골든글러브를 아예 못 받았고,
     * 그 바람에 리그 최고 시즌이 상을 덜 받는 역전이 있었어요.
     *
     * 컷은 투수가 더 높아요. 골든글러브는 리그에 10자리인데 투수는 그중 1자리라,
     * 모든 투수가 한 자리를 두고 겨루거든요. 야수는 포지션 안에서만 겨룹니다. */
    if (war >= 4.5) {
      const posBar = S.pos === "batter" ? rand(4.2, 6.2) : rand(5.2, 7.2);
      if (war >= posBar) { awards.push("골든글러브"); S.career.gg += 1; }
    }
    if (champ) S.career.rings += 1;
    S.career.warSum = Math.round((S.career.warSum + Math.max(war, 0)) * 10) / 10;
    S.career.seasons.push({ y: S.proYear, age: S.age, war, line, rank, champ, awards, role: S.role, team: S.team, raw });
    if (window.Stats) Stats.log("season_end", { y: S.proYear, war, rank, champ });

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
        ? "🏆 한국시리즈 우승 — 첫 반지예요!"
        : `🏆 한국시리즈 우승 — 통산 ${S.career.rings}번째 반지예요`,
      cls: "good",
      fx: () => Fx.celebrate("champion", "🏆 한국시리즈 우승!"),
    });
    // 수상은 하나씩 따로 띄워요 — 합쳐 놓으면 무엇을 받았는지 눈에 안 들어와요
    for (const a of awards) {
      feeds.push({ text: `🎖️ ${a} 수상!`, cls: "good", fx: () => Fx.celebrate("award", `🎖️ ${a} 수상!`) });
    }
    feeds.push({ text: `💰 시즌 연봉 정산 +${fmtMoney(salary)}`, cls: "good" });
    playFeeds(`📺 ${S.proYear}년차 시즌 결산`, feeds, seasonReport);
  }

  function seasonReport() {
    const s = S.career.seasons[S.career.seasons.length - 1];
    const AWARD_TAG = { MVP: "MVP", 골든글러브: "GG", 신인왕: "신인왕" };
    const rows = S.career.seasons.slice(-8).map((x) => {
      const badges =
        (x.champ ? `<span class="sn-tag champ">🏆우승</span>` : "") +
        (x.awards || []).map((a) => `<span class="sn-tag award">🎖️${AWARD_TAG[a] || a}</span>`).join("");
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
      <div class="draft-team">${S.team} <span class="team-str">${strLabel(teamStrOf(S.team))}</span> · ${s.line} · WAR ${s.war.toFixed(1)}</div>
      ${(S.moves || []).length ? `<div class="hint">🔁 이적 이력 — ${S.moves.map((m) => `${m.y}년차 ${m.from}→${m.to}`).join(" · ")}</div>` : ""}
      ${S.lastStandings ? `<div class="hint">📊 최종 순위</div>${S.lastStandings}` : ""}
      <table class="season-table season-career"><thead><tr><th>시즌</th><th>나이</th><th>성적</th><th>WAR</th></tr></thead><tbody>${rows}</tbody></table>
      ${moreHint}
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
      fa.textContent = `💼 FA 선언 (${S.proYear}년차 자격)`;
      fa.onclick = showFa;
      act.appendChild(fa);
    }
    if (!forcedRetire && tradeReady()) {
      const tr = document.createElement("button");
      tr.className = "btn btn-ghost";
      tr.textContent = "🔁 트레이드 요청";
      tr.onclick = startTrade;
      act.appendChild(tr);
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
    if (window.Ads) window.Ads.display($("ad-career"));
    show("screen-career");
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
   * 시즌 초반에는 실제로도 트레이드가 거의 없어서 하한도 뒀어요. */
  const TRADE_OPEN = 30, TRADE_CLOSE = 100;
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
    if (typeof S.teamStr[name] !== "number") S.teamStr[name] = Math.round(rand(0.38, 0.60) * 1000) / 1000;
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
   * 성적이 안 튀고, 기존 저장 데이터를 마이그레이션하지 않아도 됩니다. */
  function oppFor(name) {
    return teamStrOf(name) + leagueOf(S).oppUp;
  }
  function driftTeamStr() {
    for (const t of KBO_TEAMS) {
      S.teamStr[t] = Math.round(clamp(teamStrOf(t) + rand(-0.03, 0.03), 0.36, 0.63) * 1000) / 1000;
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
    const others = shuffle(KBO_TEAMS.filter((t) => t !== S.team)).slice(0, n);
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
    !!S.season && S.season.game >= TRADE_OPEN && S.season.game <= TRADE_CLOSE && tradeReady();

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
    const pool = shuffle(KBO_TEAMS.filter((t) => t !== S.team))
      .filter((t) => teamStrOf(t) < 0.52 || T.fans >= FANS_CONTENDER)
      .slice(0, slots);
    // 시즌 중엔 새 팀의 현재 성적도 보여줘요 — 가을야구 진출이 걸린 정보예요
    const rec = (name) => {
      const o = S.season && S.season.others.find((x) => x.name === name);
      return o ? ` · ${o.w}승 ${o.l}패` : "";
    };
    const suitors = (pool.length ? pool : shuffle(KBO_TEAMS.filter((t) => t !== S.team)).slice(0, 2))
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

  function careerScore() {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    return Math.round(
      c.warSum * 10 + c.rings * 25 + c.mvp * 40 + c.gg * 15 + c.roy * 20 +
      (S.trophies ? S.trophies.length : 0) * 8 + S.scout * 0.05 +
      transTotal() * 25   // ✨ 초월 단계 보너스
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
    return `    ${S.name} · ${seasons}시즌 · WAR ${(c.warSum || 0).toFixed(1)}\n`
      + (awards ? `    ${awards}\n` : "    수상 기록 없음\n");
  }

  function enshrine(team) {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    const score = careerScore();
    const entry = {
      id: "p" + Date.now(),
      game: "rookie",
      name: S.name,
      pos: S.pos,
      team: team || "고교 무대",
      seasons: c.seasons.length,
      warSum: c.warSum,
      rings: c.rings, mvp: c.mvp, gg: c.gg, roy: c.roy,
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
    if (window.Stats) Stats.log("retire", { seasons: entry.seasons, war: entry.warSum, score: entry.score });
    clearSave();
    if (window.Cloud) Cloud.mark();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚾</div>
      <div class="draft-title">${entry.name}, 그라운드와 작별</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons ? `${entry.team}에서 ${entry.seasons}시즌을 뛰었어요.` : "프로 무대 대신 다른 길을 택했어요."}</div>
      <div class="draft-summary">
        통산 WAR ${(+entry.warSum).toFixed(1)} · 🏆 ${entry.rings} · MVP ${entry.mvp} · GG ${entry.gg}${entry.roy ? " · 신인왕" : ""}<br/>
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
    // 테스트에서 내부 계산을 들여다보기 위한 창구예요 (게임 로직은 이걸 쓰지 않아요)
    _internals: { marketValue, teamWinP, teamStrOf, faOffers },
    /* 리그 관련 창구예요. 시리즈의 다른 게임(⚽ 축구)이 `_t`로 통일돼 있어서
     * 해외 진출로 새로 붙는 것들은 여기에 모아요. LEAGUES·leagueOf는 game.js의
     * 전역이지만, 테스트가 한 곳만 보면 되게 여기서 같이 내보내요. */
    _t: {
      LEAGUES, leagueOf, oppFor, teamStrOf,
      state: () => S,
    },
    enterPro,
    showHof,
    showBattle,
    showPro: () => {
      // 가을야구 도중에 나갔다 와도 그 자리에서 이어져요
      if (inPost()) { renderPost(); show("screen-pro"); }
      else if ((S.season && S.pendingGame) || S.camp > 0) { renderPro(); show("screen-pro"); }
      // 정규시즌 144경기를 다 치른 뒤라면 결산으로 이어져야 해요. 여기서 runSeason으로
      // 떨어지면 145번째 경기가 생기고, 방금 딴 우승이 새 대진에 덮여 사라져요.
      else if (S.season && S.season.game >= S.season.total) {
        if (S.post) advancePostseason(); else finishSeason();
      }
      else if (S.season) runSeason();
      else seasonReport();
    },
  };
})();
