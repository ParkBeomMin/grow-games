/* 프로 커리어 · 명예의 전당 · 배틀 아레나 — 더 루키 확장
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

  const loadHof = () => JSON.parse(localStorage.getItem(HOF_KEY) || "[]");
  const saveHof = (list) => localStorage.setItem(HOF_KEY, JSON.stringify(list));
  const loadBattle = () => JSON.parse(localStorage.getItem(BATTLE_KEY) || "{}");
  const saveBattle = (d) => localStorage.setItem(BATTLE_KEY, JSON.stringify(d));
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
    S.proYear += 1;
    S.camp = 3;
    S.condition = 80;
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
      others: KBO_TEAMS.filter((t) => t !== S.team).map((name) => ({ name, w: 0, l: 0, str: rand(0.36, 0.62) })),
      stats: S.pos === "batter" ? { ab: 0, hits: 0, hr: 0, sb: 0 } : { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 },
    };
    save();
  }

  function standingsHTML() {
    const rows = [
      { name: S.team, w: S.season.teamW, l: S.season.teamL, me: true },
      ...S.season.others,
    ].sort((a, b) => b.w - a.w);
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>팀</th><th>승-패</th></tr></thead>
      <tbody>${rows.map((t, i) => `<tr class="${t.me ? "me" : ""}"><td>${i + 1}</td><td>${t.name}</td><td>${t.w}-${t.l}</td></tr>`).join("")}</tbody></table>`;
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
    return clamp(0.42 + (core * clutchAvg() - 50) / 160 + (S.condition - 50) / 600 - agePen, 0.25, 0.72);
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
    const ourBg = randInt(0, 3);
    for (let i = 0; i < oppRuns; i++) story.oppInn[randInt(0, 8)]++;
    for (let i = 0; i < ourBg; i++) story.ourInn[randInt(0, 8)]++;
    $("tour-title").textContent = seasonLabel();
    show("screen-tournament");
    renderGameSim({
      title: `${gameLabel()} vs ${opp}`,
      oppName: opp,
      homeName: S.team,
      perf, story,
      interactive: false,
      preWin: Math.random() < teamWinP(),
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
      homeName: S.team,
      perf, story,
      interactive: false,
      preWin: Math.random() < teamWinP(),
      onFinish: (win) => {
        perf.line = `${S.name}: ${perf.ip}이닝 ${perf.k}탈삼진 ${perf.runs}실점`;
        return finishProGame(win, perf);
      },
    });
  }

  // 등판 없는 날 / 구원 등판 — 짧은 카드
  function quickGame(mode, opp) {
    $("tour-title").textContent = `📺 ${gameLabel()} — ${S.team} vs ${opp}`;
    $("tour-round").textContent = S.role;
    $("tour-card").innerHTML = `<div class="pbp" id="pbp-pro"></div><div id="game-result"></div><div id="game-moment"></div>`;
    show("screen-tournament");
    let perf = null;
    let win;
    const feeds = [];
    if (mode === "relief") {
      const isCloser = S.role === "마무리 투수";
      const ip = isCloser ? 1 : randInt(1, 2);
      const k = randInt(0, 2);
      // 등판당 실점 (마무리가 조금 더 안정적) — 0실점이 대부분, 가끔 1~2실점
      const er = Math.random() < (isCloser ? 0.16 : 0.22) ? (Math.random() < 0.28 ? 2 : 1) : 0;
      perf = { ip, k, runs: er };
      if (isCloser) {
        // 세이브 상황 = 우리 팀이 앞선 채 9회 등판. 무실점이면 리드를 지켜 승리+세이브,
        // 실점하면 블론세이브 위험이 커져요.
        feeds.push({ text: "🔔 9회, 팀이 앞선 세이브 상황에 마무리 등판!" });
        feeds.push({ text: `${S.name}: ${ip}이닝 ${k}K ${er}실점`, cls: er ? "bad" : "good" });
        if (er === 0) {
          win = true;
          feeds.push({ text: "🧊 리드를 완벽히 지켜냈어요! 세이브 성공!", cls: "good" });
        } else {
          win = Math.random() < (er === 1 ? 0.42 : 0.18);
          feeds.push({
            text: win ? "😮‍💨 실점했지만 아슬아슬하게 리드를 지켰어요" : "💥 블론세이브… 리드를 지키지 못했어요",
            cls: win ? "" : "bad",
          });
        }
      } else {
        // 중간계투 — 세이브 상황은 아니지만 무실점 호투는 승리에 힘을 보태요
        win = Math.random() < clamp(teamWinP() + (er === 0 ? 0.1 : -0.12 * er), 0.2, 0.85);
        feeds.push({ text: "🔔 승부처에 중간계투로 등판!" });
        feeds.push({ text: `${S.name}: ${ip}이닝 ${k}K ${er}실점`, cls: er ? "bad" : "good" });
      }
    } else {
      // 등판 없는 날 — 순수 팀 전력 승부
      win = Math.random() < teamWinP();
      feeds.push({ text: "🪑 오늘은 등판 없이 더그아웃에서 응원!" });
    }
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
        if (S.role === "마무리 투수" && win) t.saves += 1;
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
        if (S.role === "마무리 투수" && win) t.saves += 1;
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
    return {
      extra,
      nextLabel: won ? "🍂 다음 라운드로" : "🏁 시즌 결산",
      nextFn: () => advancePostseason([
        { text: won ? `🎉 ${label} 승리! (${myW}-${opW})` : `😢 ${label} 탈락… (${myW}-${opW})`, cls: won ? "good" : "bad" },
      ]),
    };
  }

  function playFeeds(title, feeds, onDone) {
    $("tour-title").textContent = title;
    $("tour-round").textContent = "";
    $("tour-card").innerHTML = `<div class="pbp" id="pbp-pro"></div>`;
    show("screen-tournament");
    let idx = 0, timer = null;
    const apply = (f) => {
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("pbp-pro").appendChild(div);
      $("pbp-pro").scrollTop = $("pbp-pro").scrollHeight;
    };
    const done = () => { clearInterval(timer); onDone(); };
    timer = setInterval(() => {
      if (idx >= feeds.length) { done(); return; }
      apply(feeds[idx++]);
    }, 600);
    $("btn-tour-next").textContent = "⏩ 빨리 감기";
    $("btn-tour-next").onclick = () => {
      while (idx < feeds.length) apply(feeds[idx++]);
      done();
    };
  }

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

    for (;;) {
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
      return `🍂 가을야구 ${t.ab}타수 ${t.hits}안타${t.hr ? ` ${t.hr}홈런` : ""} (타율 ${(t.hits / t.ab).toFixed(3).slice(1)})`;
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
      if (S.role === "마무리 투수") {
        war = clamp((4.2 - era) * 1.2 + t.saves * 0.08, -1.5, 12);
        line = `평균자책 ${era.toFixed(2)} · ${t.saves}세이브 · ${t.k}탈삼진`;
      } else {
        war = clamp((4.5 - era) * 1.6 + t.wins * 0.12, -1.5, 12);
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
    if (S.proYear === 1 && war >= 3.5) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(1.5, 4.2)));
      if (war >= bestRookie) { awards.push("신인왕"); S.career.roy += 1; }
    }
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8)));
    if (war >= 5.5 && war >= leagueBest) {
      awards.push("MVP"); S.career.mvp += 1;
    } else if (war >= 4.5) {
      const posBar = rand(4.2, 6.2); // 포지션 상위권 컷
      if (war >= posBar) { awards.push("골든글러브"); S.career.gg += 1; }
    }
    if (champ) S.career.rings += 1;
    S.career.warSum = Math.round((S.career.warSum + Math.max(war, 0)) * 10) / 10;
    S.career.seasons.push({ y: S.proYear, age: S.age, war, line, rank, champ, awards, role: S.role, raw });
    if (window.Stats) Stats.log("season_end", { y: S.proYear, war, rank, champ });

    for (const d of STAT_DEFS[S.pos]) {
      if (S.age <= 25) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1.2) * S.talents[d.key], 0, statCap(d.key));
      else if (S.age >= 31) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.8, 2.2) - (S.age - 31) * 0.35, 0, statCap(d.key));
    }
    const salary = 3000 + Math.round(Math.max(war, 0) * 1500);
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

    const feeds = [
      { text: `🏁 정규시즌 종료 — 최종 ${rank}위 (${finalW}승 ${finalL}패)`, cls: rank <= 3 ? "good" : rank >= 8 ? "bad" : "" },
    ];
    if (postLine) feeds.push({ text: postLine });
    if (champ) feeds.push({ text: "🏆 한국시리즈 우승!! 헹가래의 주인공이 됐어요", cls: "good" });
    if (champ && window.Fx) Fx.celebrate("champion", "🏆 우승!");
    for (const a of awards) feeds.push({ text: `🎖️ ${a} 수상!`, cls: "good" });
    if (awards.length && window.Fx) Fx.celebrate("award", `🎖️ ${awards.join(" · ")}!`);
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
      <div class="draft-team">${S.team} · ${s.line} · WAR ${s.war.toFixed(1)}</div>
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
    const ret = document.createElement("button");
    ret.className = "btn btn-ghost";
    ret.textContent = "🎓 은퇴하기";
    ret.onclick = () => enshrine(S.team);
    act.appendChild(ret);
    const reb = document.createElement("button");
    reb.className = "btn btn-ghost";
    reb.textContent = "🧬 환생하기";
    reb.onclick = () => rebirth(S.team);
    act.appendChild(reb);
    if (window.Ads) window.Ads.display($("ad-career"));
    show("screen-career");
  }

  // ---------- 명예의 전당 ----------
  function gradeOfScore(sc) {
    if (sc >= 800) return "🐐 불멸의 레전드";
    if (sc >= 500) return "👑 명예의 전당 헌액";
    if (sc >= 300) return "🌟 구단 레전드";
    if (sc >= 150) return "💪 준수한 커리어";
    if (sc >= 60) return "🧢 저니맨";
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
  function rebirth(team) {
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
    alert(
      `🧬 ${S.name}의 커리어가 막을 내렸어요.\n\n` +
      `유산 ${gain}을 남겨 누적 ${nextPts}이 됐습니다.\n` +
      `이제 ${nextGen + 1}세가 더 높은 재능으로 출발해요!`
    );
    location.reload();
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
    const remote = window.Match ? await window.Match.fetchHof("rookie") : null;
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
    refreshPro: renderPro,
    enterPro,
    showHof,
    showBattle,
    showPro: () => {
      // 가을야구 도중에 나갔다 와도 그 자리에서 이어져요
      if (inPost()) { renderPost(); show("screen-pro"); }
      else if ((S.season && S.pendingGame) || S.camp > 0) { renderPro(); show("screen-pro"); }
      else if (S.season) runSeason();
      else seasonReport();
    },
  };
})();
