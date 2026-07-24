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
  $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    const stats = $("pro-stats");
    stats.innerHTML = "";
    for (const d of STAT_DEFS[S.pos]) {
      const v = Math.round(S.stats[d.key]);
      const stars = "⭐".repeat(clamp(Math.round((S.talents[d.key] - 0.6) * 4), 1, 5));
      const row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML = `
        <span class="stat-name">${d.emoji} ${d.name}</span>
        <div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>
        <span class="stat-val">${v}</span>
        <span class="stat-pot" title="잠재력 — 별이 많을수록 훈련 효율이 높아요">${stars}</span>`;
      if (v >= 100) {
        const aw = document.createElement("button");
        aw.className = "mini-btn awaken-btn";
        aw.textContent = "🔮 각성";
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
      btn.className = "action-btn";
      btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
      btn.onclick = () => campAction(d);
      box.appendChild(btn);
    }
    box.appendChild(makeAdSlotButton(renderPro));
    const rest = document.createElement("button");
    rest.className = "action-btn rest";
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
    if (def) {
      const ageMod = S.age <= 23 ? 1.1 : S.age <= 27 ? 1.0 : S.age <= 30 ? 0.75 : 0.45;
      const failP = S.condition < 40 ? 0.15 : 0.07;
      if (Math.random() < failP) {
        const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
        S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, STAT_CAP);
        S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
        proLog(`😵 ${def.name} 훈련이 꼬였어요… -${loss.toFixed(1)}`);
        S.camp -= 1;
        save();
        afterCamp();
        return;
      }
      const condMod = S.condition >= 70 ? 1.1 : S.condition >= 40 ? 1.0 : 0.6;
      let gain = rand(1.8, 3.6) * S.talents[def.key] * ageMod * condMod;
      if (S.stats[def.key] >= 100) gain *= 0.5;
      gain = Math.round(gain * 10) / 10;
      S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, STAT_CAP);
      S.condition = clamp(S.condition - randInt(10, 16), 0, 100);
      proLog(`${def.emoji} ${def.name} 훈련 +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);
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

  function nextOpp() {
    return S.season.others[Math.floor(S.season.game / 3) % S.season.others.length].name;
  }

  function teamWinP() {
    const core = S.pos === "batter"
      ? S.stats.contact * 0.45 + S.stats.power * 0.35 + S.stats.run * 0.1 + S.stats.defense * 0.1
      : S.stats.velocity * 0.35 + S.stats.control * 0.35 + S.stats.breaking * 0.2 + S.stats.stamina * 0.1;
    const agePen = S.age >= 31 ? (S.age - 30) * 0.02 : 0;
    return clamp(0.42 + (core - 50) / 160 + (S.condition - 50) / 600 - agePen, 0.25, 0.72);
  }

  function playProGame() {
    const sn = S.season;
    const opp = nextOpp();
    const isBat = S.pos === "batter";
    let mode = "full";
    if (!isBat) {
      if (S.role === "선발 투수") mode = sn.game % 5 === 0 ? "full" : "bench";
      else mode = Math.random() < (S.role === "마무리 투수" ? 0.55 : 0.45) ? "relief" : "bench";
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
    $("tour-title").textContent = `⚾ ${S.age}살 시즌 — ${S.team}`;
    show("screen-tournament");
    renderGameSim({
      title: `G${S.season.game + 1} vs ${opp}`,
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
    $("tour-title").textContent = `⚾ ${S.age}살 시즌 — ${S.team}`;
    show("screen-tournament");
    renderGameSim({
      title: `G${S.season.game + 1} vs ${opp} (선발 등판)`,
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
    $("tour-title").textContent = `📺 G${S.season.game + 1} — ${S.team} vs ${opp}`;
    $("tour-round").textContent = S.role;
    $("tour-card").innerHTML = `<div class="pbp" id="pbp-pro"></div><div id="game-result"></div><div id="game-moment"></div>`;
    show("screen-tournament");
    const win = Math.random() < teamWinP();
    let perf = null;
    const feeds = [];
    if (mode === "relief") {
      const ip = S.role === "마무리 투수" ? 1 : randInt(1, 2);
      const k = randInt(0, 2);
      const er = Math.random() < 0.18 ? 1 : 0;
      perf = { ip, k, runs: er };
      feeds.push({ text: S.role === "마무리 투수" ? "🔔 9회, 세이브 상황에 마무리 등판!" : "🔔 승부처에 중간계투로 등판!" });
      feeds.push({ text: `${S.name}: ${ip}이닝 ${k}K ${er}실점`, cls: er ? "bad" : "good" });
    } else {
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
      return { extra, nextLabel: "🏁 시즌 결산", nextFn: finishSeason };
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
    const champ = (rank === 1 && Math.random() < 0.6) || (rank > 1 && rank <= 3 && Math.random() < 0.22);
    const awards = [];
    if (S.proYear === 1 && war >= 3.5 && Math.random() < 0.75) { awards.push("신인왕"); S.career.roy += 1; }
    if (war >= 6.5 && Math.random() < 0.5) { awards.push("MVP"); S.career.mvp += 1; }
    else if (war >= 4.5 && Math.random() < 0.45) { awards.push("골든글러브"); S.career.gg += 1; }
    if (champ) S.career.rings += 1;
    S.career.warSum = Math.round((S.career.warSum + Math.max(war, 0)) * 10) / 10;
    S.career.seasons.push({ y: S.proYear, age: S.age, war, line, rank, champ, awards, role: S.role, raw });
    if (window.Stats) Stats.log("season_end", { y: S.proYear, war, rank, champ });

    for (const d of STAT_DEFS[S.pos]) {
      if (S.age <= 25) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1.2) * S.talents[d.key], 0, STAT_CAP);
      else if (S.age >= 31) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.8, 2.2) - (S.age - 31) * 0.35, 0, STAT_CAP);
    }
    const salary = 3000 + Math.round(Math.max(war, 0) * 1500);
    S.money = (S.money || 0) + salary;
    S.age += 1;
    const finalW = sn.teamW, finalL = sn.teamL;
    S.season = null;
    S.pendingGame = false;
    save();

    const feeds = [
      { text: `🏁 정규시즌 종료 — 최종 ${rank}위 (${finalW}승 ${finalL}패)`, cls: rank <= 3 ? "good" : rank >= 8 ? "bad" : "" },
    ];
    if (champ) feeds.push({ text: "🏆 한국시리즈 우승!! 헹가래의 주인공이 됐어요", cls: "good" });
    for (const a of awards) feeds.push({ text: `🎖️ ${a} 수상!`, cls: "good" });
    feeds.push({ text: `💰 시즌 연봉 정산 +${fmtMoney(salary)}`, cls: "good" });
    playFeeds(`📺 ${S.proYear}년차 시즌 결산`, feeds, seasonReport);
  }

  function seasonReport() {
    const s = S.career.seasons[S.career.seasons.length - 1];
    const rows = S.career.seasons.slice(-8).map((x) =>
      `<tr><td>${x.y}년차</td><td>${x.age}세</td><td style="text-align:left">${x.line}${x.champ ? " 🏆" : ""}${x.awards.length ? " 🎖️" : ""}</td><td>${x.war.toFixed(1)}</td></tr>`
    ).join("");
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
      <table class="season-table"><thead><tr><th>시즌</th><th>나이</th><th>성적</th><th>WAR</th></tr></thead><tbody>${rows}</tbody></table>
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

  function enshrine(team) {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    const score = Math.round(
      c.warSum * 10 + c.rings * 25 + c.mvp * 40 + c.gg * 15 + c.roy * 20 +
      (S.trophies ? S.trophies.length : 0) * 8 + S.scout * 0.05
    );
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
      score,
      grade: gradeOfScore(score),
    };
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
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

  function showHof() {
    const list = loadHof().slice().sort((a, b) => b.score - a.score);
    const box = $("hof-list");
    box.innerHTML = list.length ? "" : `<p class="hint">아직 아무도 없어요. 첫 전설이 되어보세요!</p>`;
    list.forEach((e, i) => {
      const div = document.createElement("div");
      div.className = "hof-card";
      div.innerHTML = `
        <div class="hof-face-emoji">⚾</div>
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.name} <span class="hof-grade">${e.grade}</span></div>
          ${e.team} · ${e.seasons}시즌 · WAR ${(+e.warSum).toFixed(1)} · 🏆${e.rings} · 점수 ${e.score}
        </div>
        `;
      box.appendChild(div);
    });
    show("screen-hof");
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
        const me = list[+$("battle-me").value];
        $("btn-fight").textContent = "🔍 상대 찾는 중…";
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
        $("btn-fight").textContent = "🎲 랜덤 매칭 시작";
        fight(me, opp);
      };
    }
    $("battle-view").innerHTML = "";
    renderRanking();
    show("screen-battle");
  }

  let battleTimer = null;
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
    $("battle-rank").innerHTML = `
      <h2 class="rank-title">🏅 ${global ? "글로벌" : "로컬"} 배틀 랭킹</h2>
      <table class="rank-table"><thead><tr><th>#</th><th>선수</th><th>전적</th><th>레이팅</th></tr></thead>
      <tbody>${rows.slice(0, 15).map((r, i) =>
        `<tr class="${r.ghost ? "" : "me"}"><td>${i + 1}</td><td>${r.name}</td><td>${r.w}승 ${r.l}패</td><td>${r.rating}</td></tr>`
      ).join("")}</tbody></table>`;
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
      if ((S.season && S.pendingGame) || S.camp > 0) { renderPro(); show("screen-pro"); }
      else if (S.season) runSeason();
      else seasonReport();
    },
  };
})();
