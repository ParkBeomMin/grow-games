/* 프로 선수 활동 · 명예의 전당 · 배틀 아레나 — 더 윙어 확장
 * game.js의 전역(S, $, rand, randInt, pick, clamp, shuffle, show, save, clearSave,
 * STAT_DEFS, POS_INFO, overall)을 사용하므로 game.js 뒤에 로드해야 해요. */
"use strict";

window.WingerCareer = (() => {
  const HOF_KEY = "grow-hof-v1";
  const BATTLE_KEY = "grow-battle-soccer-v1";

  /* 경기 평점 — 예전에는 myScore를 10으로 나눠서 능력치 60이면 이미 10.0 만점이었어요.
   * 그 위로는 아무리 키워도 평점도 MOM도 성적도 같아서, 이 게임의 천장이 여기였습니다.
   * 나누는 값을 키우고 팬덤 기여에 상한을 걸어 5.0~10.0으로 펼쳤어요.
   * matchContribution의 perf도 전원 최대치(1.6)로 죽어 있었는데 같이 살아납니다. */
  const FAN_CAP = 12;
  const RATING_DIV = 14;

  /* 경기 평점(1~10). clutch()는 전역 S의 재능·초월을 읽어요.
   * 리그 페널티는 clamp **안쪽**에서 빼요 — 밖에서 빼면 하한 1이 안 지켜져요. */
  function ratingOf(stats, pos, condition, fandom) {
    const myScore =
      (stats[POS_INFO[pos].stat] * 0.32 +
      stats.stamina * 0.22 +
      ((stats.shoot + stats.pass + stats.dribble) / 3) * 0.2) * clutch(POS_INFO[pos].stat) +
      condition / 8 + Math.min((fandom || 0) / 45, FAN_CAP) + rand(-5, 5) + 20;
    const rating = clamp(myScore / RATING_DIV - leagueOf(S).penalty, 1, 10);
    return rating;
  }

  /* 포지션별 축 — 골·도움·수비 성공을 포지션에 맞게 묶어요.
   * 수비수의 골 가중치가 높은 건 세트피스 득점이 실제로 희소하고 가치가 크기 때문이에요.
   * n은 정규화 계수예요. 수비수는 시즌 수비 성공이 68회인데 공격수는 골이 31개라,
   * 그대로 더하면 포지션이 곧 유불리가 됩니다. 시뮬레이션으로 잡은 값이에요. */
  const POS_AXIS = {
    fw: { g: 1.0, a: 0.5, d: 0.15, n: 1.00 },
    wg: { g: 0.8, a: 0.8, d: 0.15, n: 1.05 },
    mf: { g: 0.5, a: 1.0, d: 0.30, n: 0.96 },
    df: { g: 2.0, a: 1.0, d: 0.55, n: 0.72 },
  };
  const AXIS_K = 3.00;
  const AXIS_OFF = 4.19;

  // 시즌 축 점수. 옛 세이브에는 집계 필드가 없을 수 있어서 전부 || 0으로 받아요.
  function posAxis(act, pos) {
    const x = POS_AXIS[pos] || POS_AXIS.fw;
    const a = act || {};
    return ((a.goals || 0) * x.g + (a.assists || 0) * x.a + (a.defense || 0) * x.d) * x.n;
  }

  // 내장 봇 상대 (전부 가상의 선수)
  const GHOSTS = [
    { id: "wg1", name: "레전드 스트라이커 골머신", bp: 690 },
    { id: "wg2", name: "월드클래스 PM 매직풋", bp: 640 },
    { id: "wg3", name: "철벽 수비수 더월", bp: 560 },
    { id: "wg4", name: "득점왕 해트트릭", bp: 470 },
    { id: "wg5", name: "라이벌 윙어 스피드킹", bp: 400 },
    { id: "wg6", name: "베테랑 캡틴 리더", bp: 330 },
    { id: "wg7", name: "괴물 신인 라이징", bp: 260 },
    { id: "wg8", name: "무명 유망주 벤치", bp: 180 },
  ];

  const loadHof = () => JSON.parse(localStorage.getItem(HOF_KEY) || "[]");
  const saveHof = (list) => localStorage.setItem(HOF_KEY, JSON.stringify(list));
  const loadBattle = () => JSON.parse(localStorage.getItem(BATTLE_KEY) || "{}");
  // 대전 기록도 백업 대상(keysOf)이에요. touch()로 표시해두지 않으면 다음 pull에
  // 조용히 덮여 사라져요.
  const saveBattle = (d) => {
    localStorage.setItem(BATTLE_KEY, JSON.stringify(d));
    if (window.Cloud) Cloud.touch();
  };
  const bpOf = (score, ovr) => Math.round(score * 0.4 + ovr * 3);

  // ---------- 엔딩 훅 ----------
  /* opts.keepSave — 🌱 유스 재계약처럼 엔딩 뒤에도 이어갈 길이 남은 경우예요.
   * 여기서 clearSave()를 부르면 '한 시즌 더 뛰기'를 누르기도 전에 기록이 사라져요.
   * 그래도 '기록 남기고 마무리'는 그대로 둬요 — 연장을 안 쓰고 끝낼 수 있어야 해요.
   * (enshrine()이 자기 안에서 clearSave()를 부르니 마무리 경로는 그대로 정리돼요.) */
  function onEnding(canGoPro, captain, opts) {
    const keepSave = !!(opts && opts.keepSave);
    const actions = document.querySelector("#screen-ending .draft-actions");
    document.getElementById("btn-go-debut")?.remove();
    document.getElementById("btn-idol-retire")?.remove();
    const btn = document.createElement("button");
    if (canGoPro) {
      save();
      btn.id = "btn-go-debut";
      btn.className = "btn btn-primary";
      btn.textContent = "⚽ 프로 커리어 시작!";
      btn.onclick = () => enterCareer(captain);
    } else {
      btn.id = "btn-idol-retire";
      btn.className = "btn btn-ghost";
      btn.textContent = "🏛️ 기록 남기고 마무리";
      btn.onclick = () => enshrine();
      if (keepSave) save();
      else clearSave();
    }
    actions.prepend(btn);
  }

  // ---------- 프로 활동 ----------
  /* 데뷔 클럽은 그 리그의 하위 DEBUT_POOL개에서만 뽑아요.
   * 6개 전부에서 뽑던 시절에는 전력 52~78로 갈려서 첫 시즌 팀 성적이 운이었고,
   * 신인이 우승 후보 클럽에서 시작하는 것도 어색했어요. 올라가는 건 이적으로 해요. */
  const DEBUT_POOL = 3;
  function debutClubs(id) {
    const list = (CLUBS[id] || CLUBS[1]).slice().sort((a, b) => a.str - b.str);
    return list.slice(0, DEBUT_POOL);
  }

  function enterCareer(captain) {
    S.phase = "soccer-pro";
    /* 데뷔 클럽은 소속 리그(기본 1부)에서 뽑아요. 이름과 전력을 함께 받아 둡니다 —
     * 전력은 동료 득점·실점에만 쓰이고 개인 수상에는 안 닿아요. */
    S.league = leagueOf(S).id;
    const debutClub = pick(debutClubs(S.league));
    S.group = debutClub.name;
    S.clubStr = debutClub.str;
    S.center = !!captain;
    S.proYear = 0;
    /* daesangW · bonsangW는 리그격을 곱해 쌓는 가중 수상 카운터예요.
     * 옛 카운터(daesang · bonsang)는 화면에 "MVP 3회"처럼 횟수로 보여주는 데 그대로 써요. */
    S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, daesangW: 0, bonsangW: 0, rookie: 0, sales: 0, goals: 0, assists: 0, defense: 0, apps: 0, teamW: 0, teamD: 0, teamL: 0 };
    S.proLog = [];
    if (window.Stats) Stats.log("debut", { group: S.group, center: !!captain });
    startPrep();
  }

  function proLog(msg) {
    S.proLog.unshift(`[${S.proYear}시즌] ${msg}`);
    S.proLog = S.proLog.slice(0, 30);
  }

  function startPrep() {
    S.proYear += 1;
    S.camp = 3;
    S.condition = 80;
    S.activity = null;
    S.pendingShow = false;
    proLog(`⚽ ${S.proYear}시즌 시작! 전반기 리그를 준비해요.`);
    save();
    renderPrep();
    show("screen-pro");
  }

  // ---------- 시즌 활동 (전/후반기 × 리그 6라운드) ----------
  const CB_PER_YEAR = 2;
  const WEEKS_PER_CB = 6;
  const CB_LABELS = ["전반기", "후반기"];
  const cbLabel = (n) => CB_LABELS[n - 1] || `${n}차`;
  const RIVAL_GROUPS = ["에이스 스트라이커", "월드클래스 MF", "철벽 수비수", "득점왕 후보", "라이벌 윙어", "베테랑 캡틴", "괴물 신인", "국대 주전"];

  function rollRivals() {
    return RIVAL_GROUPS.map((name) => ({ name, pop: rand(52, 88) }));
  }

  function initActivity() {
    S.activity = {
      cb: 1, cbTotal: CB_PER_YEAR,
      week: 0, weekTotal: WEEKS_PER_CB,
      wins: 0, sales: 0, hypeSum: 0, cbHype: 0, cbWins: 0,
      goals: 0, assists: 0, defense: 0, apps: 0, teamW: 0, teamD: 0, teamL: 0,
      opp: pick(oppClubs(S)),
      rivals: rollRivals(),
    };
  }

  function afterPrep() {
    if (S.camp > 0) { renderPrep(); return; }
    if (!S.activity) initActivity();
    else if (S.activity.week >= S.activity.weekTotal) {
      S.activity.cb += 1;
      S.activity.week = 0;
      S.activity.cbHype = 0;
      S.activity.cbWins = 0;
      S.activity.rivals = rollRivals();
    }
    S.pendingShow = true;
    save();
    renderPrep();
    show("screen-pro");
  }

  function renderPrep() {
    $("pro-name").textContent = `${S.name} (${POS_INFO[S.pos].name})`;
    $("pro-team").textContent = `⚽ ${S.group}${S.center ? " · 주장" : ""} · ${S.proYear}시즌 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = S.activity
      ? `${cbLabel(S.activity.cb)} · R${S.activity.week}/${S.activity.weekTotal} · MOM ${S.activity.wins}회`
      : `시즌 준비 ${3 - S.camp}/3`;
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
  $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    const stats = $("pro-stats");
    stats.innerHTML = "";
    for (const d of STAT_DEFS) {
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
        aw.onclick = () => { if (awakenTalent(d.key, proLog)) renderPrep(); };
        row.appendChild(aw);
      }
      stats.appendChild(row);
    }

    $("pro-camp-title").textContent = S.pendingShow
      ? (S.activity.week === 0
        ? `⚽ ${cbLabel(S.activity.cb)} 리그 준비 완료 — 경기를 시작하세요!`
        : `🔔 킥오프! R${S.activity.week + 1} 경기를 시작하세요`)
      : (S.activity
        ? `시즌 중 — 다음 경기 전 훈련 ${S.camp}회 남음`
        : `시즌 준비 — 남은 훈련 ${S.camp}회, 끝나면 리그 개막!`);
    const box = $("pro-actions");
    box.innerHTML = "";
    for (const d of STAT_DEFS) {
      const btn = document.createElement("button");
      // 상한에 닿으면 훈련해도 오르지 않아요 — 각성/초월로 바꿔줍니다
      if (atCap(d.key)) {
        const tmax = isTalentMax(S.talents[d.key]);
        const pct = Math.round((tmax ? transP(transLv(d.key)) : awakenP(Math.round(S.stats[d.key]))) * 100);
        btn.dataset.key = d.key;
        btn.className = "action-btn awaken-act";
        btn.innerHTML = `<span class="a-emoji">${tmax ? "🌠" : "🔮"}</span>${d.name} ${tmax ? "초월 각성" : "재능 각성"}<span class="a-sub">상한 ${statCap(d.key)} 도달 · 성공률 ${pct}%</span>`;
        btn.onclick = () => { if (awakenTalent(d.key, proLog)) renderPrep(); };
      } else {
        btn.dataset.key = d.key;
        btn.className = "action-btn";
        btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
        btn.onclick = () => prepAction(d);
      }
      box.appendChild(btn);
    }
    box.appendChild(makeAdSlotButton(renderPrep));
    const rest = document.createElement("button");
    rest.className = "action-btn rest";
    rest.dataset.key = "__rest";
    rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 회복</span>`;
    rest.onclick = () => prepAction(null);
    box.appendChild(rest);

    if (S.pendingShow) {
      box.querySelectorAll(".action-btn").forEach((b) => {
        if (!b.classList.contains("ad-slot")) b.disabled = true;
      });
      const go = document.createElement("button");
      go.className = "action-btn rest go-game";
      go.innerHTML = S.activity.week === 0
        ? `<span class="a-emoji">⚽</span>${cbLabel(S.activity.cb)} 개막전<span class="a-sub">전술 미팅 → 킥오프</span>`
        : `<span class="a-emoji">🔔</span>리그 경기<span class="a-sub">R${S.activity.week + 1}/${S.activity.weekTotal} 주간 활약 경쟁</span>`;
      go.onclick = playShow;
      box.appendChild(go);
    }

    $("pro-log").innerHTML = (S.proLog || [])
      .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
      .join("");
  }

  function prepAction(def) {
    // 상한에 닿았으면 훈련은 턴만 소모돼요 — 각성으로 돌려줍니다
    if (def && atCap(def.key)) { if (awakenTalent(def.key, proLog)) renderPrep(); return; }
    if (def) {
      const yearMod = S.proYear <= 3 ? 1.1 : S.proYear <= 6 ? 1.0 : S.proYear <= 8 ? 0.7 : 0.45;
      const failP = S.condition < 40 ? 0.15 : 0.07;
      if (Math.random() < failP) {
        const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
        S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
        S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
        proLog(`😵 ${def.name} 훈련이 꼬였어요… -${loss.toFixed(1)}`);
      actFx(def.key, "-" + loss.toFixed(1), true);
        S.camp -= 1;
        save();
        afterPrep();
        return;
      }
      const condMod = S.condition >= 70 ? 1.1 : S.condition >= 40 ? 1.0 : 0.6;
      let gain = rand(1.8, 3.6) * S.talents[def.key] * yearMod * condMod;
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
    afterPrep();
  }

  // ---------- 리그 경기 (주 1회, 주간 활약 경쟁) ----------
  /* 평점은 10점 만점이에요.
   * 순위 점수(score)에는 결정적 순간 보정(±8)과 흔들림(±4)이 평점 뒤에 얹혀서
   * 최대 112까지 올라가요. 그건 MOM 순위를 가리는 값이지 평점이 아닌데,
   * 그대로 10으로 나눠 보여줘서 10.7 같은 평점이 찍혔어요.
   * 순서는 원래 점수로 가리고, 보여줄 때만 10점으로 맞춥니다. */
  function chartHTML(rows) {
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>선수</th><th>평점</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td><td>${clamp(r.score / 10, 1, 10).toFixed(1)}</td></tr>`).join("")}</tbody></table>`;
  }

  function playShow() {
    const act = S.activity;
    act.opp = pick(oppClubs(S)); // 이번 상대 — 같은 리그에서 내 클럽을 빼고 뽑아요
    $("stage-title").textContent = `⚽ ${S.proYear}시즌 ${cbLabel(act.cb)} — ${S.group}`;
    $("stage-round").textContent = `R${act.week + 1}/${act.weekTotal} 리그 · vs ${act.opp}`;
    show("screen-stage");

    const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom);
    const c = matchContribution(rating);
    const oppGoals = deriveOppGoals(rating, S.stats.defense);
    MatchSim.run({
      home: S.group, away: act.opp, myName: S.name,
      goals: c.g, assists: c.a, defense: c.def, oppGoals, rating,
      finalize: (info) => proMatchFinalize(act, info, rating),
    });
  }

  // 프로 경기 결과 반영 (MOM 평점 순위 + 보상 + 다음 진행)
  function proMatchFinalize(act, info, rating) {
    const momAdj = info.momentRes === "perfect" ? 8 : info.momentRes === "miss" ? -8 : 0;
    const myRankScore = rating * 10 + momAdj + rand(-4, 4);
    const rows = [
      { name: S.name, score: myRankScore, me: true },
      ...act.rivals.map((r) => ({ name: r.name, score: r.pop + rand(-8, 8) })),
    ].sort((a, b) => b.score - a.score);
    const rank = rows.findIndex((r) => r.me) + 1;
    const won = rank === 1;
    const hypeDelta = (5 - rank) * 0.35 + (info.momentRes === "perfect" ? 0.5 : info.momentRes === "miss" ? -0.5 : 0);

    act.apps = (act.apps || 0) + 1;
    act.goals = (act.goals || 0) + info.myGoals;
    act.assists = (act.assists || 0) + info.assists;
    act.defense = (act.defense || 0) + info.defense;
    if (info.res === "W") act.teamW = (act.teamW || 0) + 1;
    else if (info.res === "D") act.teamD = (act.teamD || 0) + 1;
    else act.teamL = (act.teamL || 0) + 1;

    act.week += 1;
    act.hypeSum += hypeDelta;
    act.cbHype += hypeDelta;
    let pay = 30, dFan;
    if (won) {
      act.wins += 1; act.cbWins += 1; S.career.wins += 1;
      pay += 100; dFan = randInt(10, 18);
    } else if (rank <= 3) {
      dFan = randInt(4, 9);
    } else {
      dFan = randInt(-3, 3);
    }
    S.fandom = Math.max(0, (S.fandom || 0) + dFan);
    S.money = (S.money || 0) + pay;
    S.condition = clamp(S.condition - randInt(3, 6), 0, 100);
    S.pendingShow = false;

    const cbDone = act.week >= act.weekTotal;
    let extraLine = "";
    if (cbDone) {
      const cbSales = Math.max(1, Math.round(S.fandom * 0.05 + act.cbWins * 6 + act.cbHype * 4 + rand(-4, 4)));
      act.sales += cbSales;
      extraLine = `<div class="tour-pts">⚽ ${cbLabel(act.cb)} 종료 — MOM ${act.cbWins}회 · 공격포인트 ${cbSales}P</div>`;
    }
    save();

    const scoreClass = info.res === "W" ? "win" : info.res === "L" ? "lose" : "";
    const resultHTML = `
      <div class="ms-final ${scoreClass}">${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${RES_LABEL[info.res]}</div>
      <div class="tour-vs">${won ? "🏅 MOM!" : `평점 ${rank}위`} <span class="${won ? "win" : ""}">${S.name}</span> · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense}</div>
      ${chartHTML(rows.slice(0, 5))}
      <div class="tour-pts">💰 경기 수당 +${pay}만 · ${dFan >= 0 ? `⭐ 명성 +${dFan}` : `📉 명성 ${dFan}`}</div>
      ${extraLine}`;

    let nextLabel, nextFn;
    if (!cbDone) {
      nextLabel = `🏋️ 다음 경기 준비 (R${act.week + 1})`;
      nextFn = () => { S.camp = 2; save(); renderPrep(); show("screen-pro"); };
    } else if (act.cb < act.cbTotal) {
      nextLabel = `⚽ ${cbLabel(act.cb + 1)} 준비하기`;
      nextFn = () => { S.camp = 3; save(); renderPrep(); show("screen-pro"); };
    } else {
      nextLabel = "🏁 시즌 결산";
      nextFn = finishYear;
    }
    return { resultHTML, nextLabel, nextFn };
  }

  // ---------- 시즌 결산 ----------
  function finishYear() {
    const act = S.activity;
    const agePen = S.proYear >= 8 ? (S.proYear - 7) * 0.8 : 0;
    /* 연말 평가는 이제 축이 해요. 예전에는 hypeSum(순위 기반)이라
     * 1위를 하는 순간 천장에 붙어서 능력치를 더 올려도 결과가 같았어요.
     * 축은 골·도움·수비 성공 개수라 상한이 없어요. 후반에 기하급수로 커지니
     * 로그로 잽니다 — 선형이면 10년차에 hype가 수백이 돼요.
     * hypeSum은 경기 화면 순위 연출에 그대로 남아 있어요.
     *
     * 리그격(prestige)을 축에 곱해요 — 같은 성적이라도 위 리그에서 낸 게 값어치가 커요.
     * 평점 페널티가 성적 자체를 깎으니, 이 둘이 맞물려 "실력이 되면 통하고
     * 아니면 못 버틴다"는 도박이 돼요.
     *
     * 아래 hype 줄과 수상 판정 블록은 여러 회귀 테스트가 소스에서 통째로 떼어 굴려요.
     * 그래서 리그를 지역 변수로 묶지 않고 매번 leagueOf(S)로 읽어요 —
     * 묶으면 떼어낸 조각이 밖에서 안 돌아서 테스트가 통째로 죽습니다. */
    const hype = clamp(Math.log(Math.max(1, posAxis(act, S.pos) * leagueOf(S).prestige)) * AXIS_K - AXIS_OFF - agePen, -1.5, 12);
    const wins = act.wins;
    const sales = act.sales;
    const dFan = Math.round(hype * 10 + wins * 3 - (hype < 0 ? 15 : 0));
    S.fandom = Math.max(0, S.fandom + dFan);
    // 수상은 '리그 내 상대 비교' — 가상 경쟁자들의 활약과 겨뤄 최고면 수상해요.
    // (압도적인 시즌은 랜덤에 밀려 상을 놓치지 않아요)
    const awards = [];
    if (S.proYear === 1 && hype >= 3) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(1.5, 4.2)));
      if (hype >= bestRookie) { awards.push("신인왕"); S.career.rookie += 1; }
    }
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8)));
    if (hype >= 5.5 && hype >= leagueBest) {
      awards.push("리그MVP");
      /* 리그격만큼 가중해서 따로 쌓아요. 빅클럽에서 받은 상이 더 값어치를 갖습니다.
       * 안 그러면 안전하게 1부에 머문 커리어가 명예의 전당에서 앞서요.
       *
       * 가중 카운터가 없던 옛 세이브는 그동안 받은 상을 1부 기준(×1)으로 세고 이어붙여요.
       * 로드할 때 마이그레이션하는 게 아니라, 새 상을 받는 이 순간에만 이어붙입니다 —
       * 0에서 시작하면 새 상 하나 때문에 지난 상이 통째로 사라져요. */
      S.career.daesangW = (S.career.daesangW != null ? S.career.daesangW : S.career.daesang) + leagueOf(S).prestige;
      S.career.daesang += 1;
    }
    /* 베스트11은(는) 리그MVP과(와) 별개로 판정해요.
     * 예전에는 else if라서 리그MVP을(를) 받으면 베스트11을(를) 아예 못 받았어요.
     * 가장 잘한 시즌이 오히려 상을 덜 받는 역전이 났습니다. */
    if (hype >= 4.5) {
      const posBar = rand(4.2, 6.2);
      // 베스트11도 같은 방식으로 리그격만큼 가중해요 (바로 위 리그MVP 주석 참고).
      if (hype >= posBar) { awards.push("베스트11"); S.career.bonsangW = (S.career.bonsangW != null ? S.career.bonsangW : S.career.bonsang) + leagueOf(S).prestige; S.career.bonsang += 1; }
    }
    S.career.sales += sales;
    const gg = act.goals || 0, ga = act.assists || 0, gd = act.defense || 0, apps = act.apps || 0;
    S.career.goals = (S.career.goals || 0) + gg;
    S.career.assists = (S.career.assists || 0) + ga;
    S.career.defense = (S.career.defense || 0) + gd;
    S.career.apps = (S.career.apps || 0) + apps;
    S.career.teamW = (S.career.teamW || 0) + (act.teamW || 0);
    S.career.teamD = (S.career.teamD || 0) + (act.teamD || 0);
    S.career.teamL = (S.career.teamL || 0) + (act.teamL || 0);
    if (awards.length && window.Fx) Fx.celebrate("award", `🎖️ ${awards.join(" · ")}!`);
    S.career.years.push({ y: S.proYear, hype: Math.round(hype * 10) / 10, wins, sales, dFan, awards, goals: gg, assists: ga, defense: gd, apps });
    if (window.Stats) Stats.log("year_end", { y: S.proYear, wins, sales, goals: gg, assists: ga });
    for (const d of STAT_DEFS) {
      if (S.proYear <= 3) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1) * S.talents[d.key], 0, statCap(d.key));
      else if (S.proYear >= 8) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.6, 1.8), 0, statCap(d.key));
    }
    const income = sales * 3 + wins * 40;
    S.money = (S.money || 0) + income;
    S.activity = null;
    S.pendingShow = false;
    save();
    // 결산이 끝난 뒤에 올려요. save()보다 먼저 부르면 collect()가 **지난 시즌** 상태를
    // 담아 올리고 dirty=0 · 새 도장까지 찍어요. 바로 뒤 save()가 dirty를 다시 세워도
    // 방금 켜진 2분 잠금에 막혀서, 다른 기기는 한 시즌 전 상태를 받게 돼요.
    if (window.Cloud) Cloud.mark();
    yearReport();
  }

  /* 🔁 이적 이력 한 줄. S.moves를 읽는 유일한 곳이에요 — 안 읽으면 옮겨 다닌 커리어가
   * 결산에도 은퇴식에도 안 남아서, 이적이 그냥 숫자만 바꾸는 버튼이 돼요.
   * 리그를 옮긴 이적은 어느 리그로 갔는지도 붙여요. 같은 "A→B"라도 국내 이동과
   * 빅클럽행은 전혀 다른 사건이라서요. */
  function moveLog(st) {
    const mv = (st && st.moves) || [];
    if (!mv.length) return "";
    return mv.map((m) => {
      const to = LEAGUES.find((l) => l.id === m.toLg);
      const tag = (to && m.fromLg !== m.toLg) ? `(${to.name})` : "";
      return `${m.y}시즌 ${m.from}→${m.to}${tag}`;
    }).join(" · ");
  }

  function yearReport() {
    const y = S.career.years[S.career.years.length - 1];
    const moves = moveLog(S);
    const rows = S.career.years.slice(-8).map((x) =>
      `<tr><td>${x.y}시즌</td><td>${x.apps != null ? x.apps : "-"}</td><td>${x.goals != null ? x.goals : "-"}</td><td>${x.assists != null ? x.assists : "-"}</td><td>${x.defense != null ? x.defense : "-"}</td><td>${x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    const forcedRetire = S.proYear >= 10;
    const cr = S.career;
    $("career-title").textContent = `📊 ${y.y}시즌 결산`;
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚽</div>
      <div class="draft-title">${
        /* 문턱은 새 hype 눈금(축 기반)에 맞춘 값이에요.
         * 5년차 실측: 능력치 50→3.8 · 70→5.3 · 90→6.4 · 110→7.4 · 130→7.9.
         * 옛 눈금(순위 기반) 문턱 6/3.5/1을 그대로 두면 능력치 90부터
         * 매 시즌 "리그를 지배한 시즌!"이 떴어요. */
        y.hype >= 7.6 ? "리그를 지배한 시즌!" :
        y.hype >= 6.0 ? "제 몫을 해낸 시즌" :
        y.hype >= 3.5 ? "아쉬움이 남는 시즌" : "혹독한 시즌…"
      }</div>
      <div class="draft-team">${leagueOf(S).flag} ${S.group} · ${leagueOf(S).name} · 전력 ${clubStrOf(S)} · ${y.apps || 0}경기 ⚽${y.goals || 0}골 🅰️${y.assists || 0}도움 🛡️${y.defense || 0} · MOM ${y.wins}회</div>
      ${moves ? `<div class="hint move-log">🔁 이적 이력 — ${moves}</div>` : ""}
      <table class="season-table"><thead><tr><th>시즌</th><th>출전</th><th>⚽골</th><th>🅰️도움</th><th>🛡️수비</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="draft-summary">
        통산 ${cr.years.length}시즌 · 출전 ${cr.apps || 0} · ⚽ ${cr.goals || 0}골 · 🅰️ ${cr.assists || 0}도움 · 🛡️ ${cr.defense || 0} · 🏅 MOM ${cr.wins}회<br/>
        🏆 MVP ${cr.daesang} · 베스트11 ${cr.bonsang}${cr.rookie ? " · 신인왕" : ""} · ⭐ 명성 ${Math.round(S.fandom)}<br/>
        ${forcedRetire ? "슬슬 은퇴를 고민할 나이가 됐어요. 아름다운 마무리를…" : "다음 시즌도 계속 뛸 수 있어요!"}
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    if (!forcedRetire) {
      const next = document.createElement("button");
      next.className = "btn btn-primary";
      next.textContent = `⚽ ${S.proYear + 1}시즌 시작`;
      next.onclick = startPrep;
      act.appendChild(next);
      /* 💼 이적은 오프시즌에만 열려요. 마지막 시즌(강제 은퇴)에는 갈 다음 시즌이
       * 없으니 안 띄우고, 한 오프시즌에 두 번 옮기지도 못하게 막아요. */
      if (canTransfer(S)) {
        const tf = document.createElement("button");
        tf.id = "btn-transfer";
        tf.className = "btn btn-ghost";
        tf.textContent = "💼 이적 제안 보기";
        tf.onclick = renderTransfer;
        act.appendChild(tf);
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
        `⚠️ 되돌릴 수 없어요.\n\n진행할까요?`
      )) return;
      enshrine();
    };
    act.appendChild(ret);
    if (window.Ads) window.Ads.display($("ad-career"));
    show("screen-career");
  }

  // ---------- 💼 이적 ----------
  /* 오프시즌(시즌 결산)에서만 열려요. 축이 둘인데 서로 겹치지 않아요.
   *
   *  · 같은 리그 이적 — 클럽 전력이 동료 득점·실점에 작용해요. 우승과 팀 성적의 축이에요.
   *  · 상위 리그 이적 — 평점 페널티와 수상 가치가 움직여요. 개인 커리어의 축이에요.
   *
   * 실측으로 갈라진 값이에요. 전력을 50에서 90으로 올리면 팀 승률이 12~29%p 오르는데
   * 리그MVP 확률은 1.3%p 안에서만 움직여요. 리그를 올리면 정반대예요.
   * 그래서 카드에 평점 페널티와 수상 가치를 숫자로 적어요 — 이게 도박의 크기라
   * 감추면 "왜 갑자기 무너졌는지" 모르는 채로 올라가게 돼요. */
  const TRANSFER_MIN_YEAR = 2;               // 같은 리그 이적도 2년차부터 열려요
  const PROMOTE_HYPE = { 2: 5.5, 3: 6.5 };   // 이 리그의 제안이 오는 직전 시즌 hype
  const OFFERS_PER_LEAGUE = 2;               // 리그마다 제안 수

  /* 계약금 — 리그 격과 클럽 전력에서 뽑아요. 격은 세제곱으로 실어요.
   * 리그를 올리는 이적이 눈에 띄게 큰 돈이어야 "지금 갈까"가 고민이 돼요.
   * 10만 단위로 끊어 읽기 좋게 합니다.
   *
   * 여기에 세 가지를 겁니다. 안 걸면 이적이 그냥 돈줄이 돼요 —
   * 같은 리그 안에서 A↔B를 오가기만 해도 매 오프시즌 계약금이 들어왔어요.
   *
   *  · 리그를 내려가면 계약금이 크게 줄어요. 몸값이 떨어지는 일이니까요.
   *  · 한 번 떠난 클럽으로 돌아갈 땐 계약금이 없어요. 왕복으로 두 번 받는 길을 막습니다.
   *  · 이적을 거듭할수록 줄어요. 매년 새 클럽으로 갈아타는 무한 급전도 막아야 해요.
   *
   * 이 셋이 다 있어야 막혀요. 돌아가는 이적만 0으로 하면 6개 클럽을 한 바퀴 도는
   * 우회로가 남고, 감가만 걸면 왕복이 여전히 조금씩 벌어요. */
  const DOWNGRADE_FEE = 0.3;   // 리그를 한 단계 내려갈 때마다 곱해요
  const LOYALTY_FEE = 0.75;    // 지금까지 한 이적 횟수만큼 거듭제곱으로 곱해요

  // 예전에 떠나온 클럽인가요. 이적 기록의 '떠난 곳'으로 봐요.
  const leftBefore = (st, name) => ((st && st.moves) || []).some((m) => m.from === name);

  function transferFee(club, league, st) {
    const state = st || S;
    const moves = (state && state.moves) || [];
    // 한 번 떠난 클럽은 다시 계약금을 주지 않아요. 돌아오는 건 자유지만 공짜예요.
    if (leftBefore(state, club.name)) return 0;
    const drop = Math.max(0, leagueOf(state).id - league.id);
    const base = club.str * club.str * 0.22 * Math.pow(league.prestige, 3);
    return Math.round(
      (base * Math.pow(DOWNGRADE_FEE, drop) * Math.pow(LOYALTY_FEE, moves.length)) / 10
    ) * 10;
  }

  // 계약금이 0이면 "0만"이라고 적지 않아요 — 왜 0인지가 안 보이면 고장으로 읽혀요.
  const feeText = (fee, back) =>
    fee > 0 ? `계약금 ${fmtMoney(fee)}` : `계약금 없음${back ? " (떠났던 클럽)" : ""}`;

  // 직전 시즌 hype. 이번 결산에서 방금 쌓은 값이에요.
  function lastHype(st) {
    const ys = (st && st.career && st.career.years) || [];
    return ys.length ? (ys[ys.length - 1].hype || 0) : 0;
  }
  // 한 오프시즌에 두 번 옮기지는 못해요. 이적 기록의 연차로 봐요.
  const movedThisYear = (st) => ((st && st.moves) || []).some((m) => m.y === st.proYear);
  const canTransfer = (st) => !!st && (st.proYear || 0) >= TRANSFER_MIN_YEAR && !movedThisYear(st);

  /* 갈 수 있는 리그마다 클럽을 OFFERS_PER_LEAGUE개씩 뽑아요.
   * 아래로 내려오는 이적은 언제든 가능해요 — 못 버티고 돌아오는 길을 막으면
   * 도전 자체를 안 하게 돼요. 위로 갈 때만 직전 시즌 hype 문턱을 봐요. */
  function transferOffers(st) {
    const state = st || S;
    if (!canTransfer(state)) return [];
    const cur = leagueOf(state);
    const hype = lastHype(state);
    const list = [];
    for (const lg of LEAGUES) {
      const need = PROMOTE_HYPE[lg.id];
      if (lg.id > cur.id && hype < (need == null ? Infinity : need)) continue;
      const pool = (CLUBS[lg.id] || []).filter((c) => c.name !== state.group);
      for (const club of shuffle(pool.slice()).slice(0, OFFERS_PER_LEAGUE)) {
        list.push({ club, league: lg, fee: transferFee(club, lg, state), back: leftBefore(state, club.name) });
      }
    }
    return list;
  }

  // 도박의 크기 — 평점에서 빼는 값과 수상 가치에 곱하는 값이에요.
  const riskText = (lg) =>
    `평점 ${lg.penalty > 0 ? `-${lg.penalty.toFixed(1)}` : "그대로"} · 수상 가치 ×${lg.prestige.toFixed(2)}`;

  function renderTransfer() {
    const cur = leagueOf(S);
    $("transfer-title").textContent = `💼 이적 제안 — ${S.proYear}시즌 오프시즌`;
    const gate = LEAGUES.filter((l) => PROMOTE_HYPE[l.id] != null)
      .map((l) => `${l.name} ${PROMOTE_HYPE[l.id]}`).join(" · ");
    $("transfer-now").innerHTML =
      `지금은 <b>${cur.flag} ${S.group}</b> (${cur.name} · 전력 ${clubStrOf(S)}) 소속이에요.<br/>`
      + `직전 시즌 평가 <b>${lastHype(S).toFixed(1)}</b> — 위 리그 제안은 평가가 이만큼 돼야 와요 (${gate}).<br/>`
      + `아래 리그로 내려가는 이적은 언제든 할 수 있어요 — 대신 계약금이 크게 줄어요.<br/>`
      + `한 번 떠난 클럽으로 돌아갈 땐 계약금이 없고, 이적을 거듭할수록 계약금이 깎여요.`;
    const box = $("transfer-list");
    box.innerHTML = "";
    const offers = transferOffers(S);
    if (!offers.length) {
      box.innerHTML = `<p class="hint">올해는 들어온 제안이 없어요.</p>`;
    }
    for (const lg of LEAGUES) {
      const mine = offers.filter((o) => o.league.id === lg.id);
      if (!mine.length) continue;
      const group = document.createElement("div");
      group.className = "tf-group" + (lg.id > cur.id ? " up" : lg.id < cur.id ? " down" : " same");
      group.dataset.league = String(lg.id);
      const head = document.createElement("div");
      head.className = "tf-head";
      head.innerHTML = `<span class="tf-lg">${lg.flag} ${lg.name}</span><span class="tf-risk">${riskText(lg)}</span>`;
      group.appendChild(head);
      for (const o of mine) {
        const card = document.createElement("button");
        card.className = "tf-card";
        card.dataset.club = o.club.name;
        card.dataset.league = String(lg.id);
        card.dataset.fee = String(o.fee);
        /* 카드마다 페널티와 수상 가치를 다시 적어요. 헤더에만 있으면
         * 스크롤하다 카드만 보고 누르는 사람에게는 안 보여요. */
        card.innerHTML = `
          <span class="tf-top"><span class="tf-name">${o.club.name}</span><span class="tf-str">전력 ${o.club.str}</span></span>
          <span class="tf-sub"><span class="tf-fee">${feeText(o.fee, o.back)}</span><span class="tf-risk">${riskText(lg)}</span></span>`;
        card.onclick = () => acceptOffer(o);
        group.appendChild(card);
      }
      box.appendChild(group);
    }
    show("screen-transfer");
  }

  /* 소속을 바꾸고 이적 기록을 남겨요. 리그·전력이 함께 바뀌어야
   * 다음 시즌 상대(oppClubs)와 동료 득점·실점이 새 클럽 기준으로 굴러가요. */
  function moveToClub(club, league, bonus) {
    const from = S.group;
    const prevLeague = S.league || 1;
    const prevBack = leftBefore(S, club.name);   // 기록을 쌓기 전에 봐요
    S.group = club.name;
    S.clubStr = club.str;
    S.league = league.id;
    S.money = (S.money || 0) + (bonus || 0);
    if (!Array.isArray(S.moves)) S.moves = [];
    S.moves.push({ y: S.proYear, from, to: club.name, fromLg: prevLeague, toLg: league.id });
    proLog(`💼 ${from} → ${club.name} 이적! (${league.name} · ${feeText(bonus || 0, prevBack)})`);
    if (window.Stats) Stats.log("transfer", { y: S.proYear, from, to: club.name, fromLg: prevLeague, toLg: league.id });
    save();
  }

  function acceptOffer(o) {
    moveToClub(o.club, o.league, o.fee);
    if (window.Fx) Fx.celebrate("award", `💼 ${o.club.name} 이적!`);
    yearReport();   // 결산으로 돌아가요 — 새 소속으로 다시 그려져요
  }

  // ---------- 명예의 전당 ----------
  function gradeOfScore(sc) {
    if (sc >= 850) return "🐐 축구 역사에 남을 레전드";
    if (sc >= 600) return "👑 명예의 전당 헌액";
    if (sc >= 400) return "🌟 월드클래스";
    if (sc >= 220) return "💪 리그 정상급";
    if (sc >= 90) return "🧢 꾸준한 주전";
    return "🌱 짧지만 빛났던 커리어";
  }

  function careerScore() {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    /* daesangW가 없는 옛 세이브는 가중 없이 계산해요. 마이그레이션하지 않습니다.
     * 1부만 뛴 커리어는 prestige가 1이라 두 경로의 값이 같아요 — 점수가 안 변합니다. */
    const dae = c.daesangW != null ? c.daesangW : (c.daesang || 0);
    const bon = c.bonsangW != null ? c.bonsangW : (c.bonsang || 0);
    return Math.round(
      S.fandom * 0.5 + c.wins * 6 + dae * 50 + bon * 15 + c.rookie * 20 +
      (c.years ? c.years.length : 0) * 5 + (S.trophies ? S.trophies.length : 0) * 8 + (S.center ? 30 : 0) +
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
    return (c.wins || 0) >= REBIRTH_NEED.win
      || (c.daesang || 0) >= REBIRTH_NEED.top
      || transTotal() >= REBIRTH_NEED.trans;
  }
  function rebirthHint() {
    const c = S.career || {};
    return `🏆 우승 ${c.wins || 0}/${REBIRTH_NEED.win} · 🎖️ 대상 ${c.daesang || 0}/${REBIRTH_NEED.top} · 🌠 초월 ${transTotal()}/${REBIRTH_NEED.trans} — 하나만 채우면 열려요`;
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
      (c.wins || 0) ? `🏆우승 ${c.wins}` : "",
      (c.daesang || 0) ? `🎖️대상 ${c.daesang}` : "",
      (c.bonsang || 0) ? `🏅본상 ${c.bonsang}` : "",
      (c.rookie || 0) ? "🌟신인상" : "",
    ].filter(Boolean).join(" · ");
    const years = (c.years || []).length;
    const moves = moveLog(S);
    return `    ${S.name} · ${years}년차\n`
      + (awards ? `    ${awards}\n` : "    수상 기록 없음\n")
      + (moves ? `    🔁 이적 ${(S.moves || []).length}회 — ${moves}\n` : "");
  }

  function enshrine() {
    const c = S.career || { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0 };
    const score = careerScore();
    const moves = moveLog(S);   // S를 비우기 전에 뽑아 둬요
    const entry = {
      id: "w" + Date.now(),
      game: "soccer",
      name: S.name,
      pos: S.pos,
      team: S.group || marketOf().name,
      seasons: c.years ? c.years.length : 0,
      wins: c.wins, daesang: c.daesang, bonsang: c.bonsang, rookie: c.rookie,
      goals: (c.goals || 0) + ((S.youth && S.youth.g) || 0),
      assists: (c.assists || 0) + ((S.youth && S.youth.a) || 0),
      apps: (c.apps || 0) + (S.stages || 0),
      finalOvr: Math.round(overall()),
      trans: transTotal(),
      gen: loadLegacy().gen + 1,
      score,
      grade: gradeOfScore(score) + (transTotal() ? ` · ${transcendTitle(transTotal())}` : ""),
    };
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
    if (window.Match) window.Match.submitHof("soccer", entry);
    if (window.Stats) Stats.log("retire", { years: entry.seasons, wins: entry.wins, score: entry.score });
    clearSave();
    if (window.Cloud) Cloud.mark();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚽</div>
      <div class="draft-title">${entry.name}, 그라운드와 작별</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons ? `${entry.team}에서 ${entry.seasons}시즌을 뛰었어요.` : "프로 무대 대신 다른 길을 택했어요."}</div>
      ${moves ? `<div class="hint move-log">🔁 이적 이력 — ${moves}</div>` : ""}
      <div class="draft-summary">
        통산 ${entry.apps}경기 ⚽ ${entry.goals}골 · 🅰️ ${entry.assists}도움<br/>
        🏅 MOM ${entry.wins}회 · 🏆 MVP ${entry.daesang} · 베스트11 ${entry.bonsang}${entry.rookie ? " · 신인왕" : ""}<br/>
        커리어 점수 <b>${entry.score}</b> — 명예의 전당에 영구 기록됐어요
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    const hofBtn = document.createElement("button");
    hofBtn.className = "btn btn-primary";
    hofBtn.textContent = "🏛️ 명예의 전당 보기";
    hofBtn.onclick = showHof;
    act.appendChild(hofBtn);
    S = null;
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
    const local = loadHof().filter((e) => e.game === "soccer");
    const localIds = new Set(local.map((e) => e.id));
    let list = local, global = false;
    const remote = window.Match ? await window.Match.fetchHof("soccer") : null;
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
        <div class="hof-face-emoji">⚽</div>
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.gen > 1 ? `<span class="hof-gen">${e.gen}세</span> ` : ""}${e.name} <span class="hof-grade">${e.grade}</span></div>
          ${e.team} · ${e.seasons}시즌${e.goals != null ? ` · ⚽${e.goals} 🅰️${e.assists || 0}` : ""} · 🏅MOM ${e.wins} · 🏆${e.daesang + e.bonsang} · 점수 ${e.score}
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
  const GAME_ID = "soccer";
  const matchEnabled = () => !!(window.Match && window.Match.enabled());
  function submitProfile(f, rating, w, l) {
    if (window.Match) window.Match.submit(GAME_ID, { name: f.name, bp: f.bp, rating, w, l });
  }
  async function fetchRoster() {
    return window.Match ? window.Match.roster(GAME_ID) : null;
  }

  // ---------- 배틀 아레나 (경기 대결) ----------
  const BATTLE_TXT = [
    "전방 압박으로 주도권을 잡아요! 🔥",
    "환상적인 개인기로 수비를 벗겨내요 🏃",
    "날카로운 침투 패스가 이어져요 🎯",
    "골문 앞 혼전, 몸을 사리지 않아요 💪",
    "경기 막판, 극적인 결승골! ⚽",
  ];

  function fighters() {
    const list = [];
    if (S && S.name) {
      const years = S.career && S.career.years ? S.career.years.length : 0;
      list.push({
        id: "cur-" + S.name,
        name: `${S.name} (현역)`,
        bp: Math.round(overall() * 3 + (S.fandom || 0) * 0.15 + years * 8),
      });
    }
    for (const e of loadHof().filter((x) => x.game === "soccer")) {
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
      setup.innerHTML = `<p class="hint">대결할 선수가 없어요.<br/>먼저 유망주를 키우면 현역이든 은퇴 후든 언제든 참전할 수 있어요!</p>`;
    } else {
      setup.innerHTML = `
        <div class="battle-row">
          <label>내 선수</label>
          <select id="battle-me">${list.map((f, i) => `<option value="${i}">${f.name} · 경기력 ${f.bp}</option>`).join("")}</select>
          <button class="btn btn-primary" id="btn-fight">🎲 랜덤 매칭 시작</button>
          <p class="av-note">${matchEnabled() ? "🌍 전 세계 플레이어 풀에서 실력이 비슷한 상대를 찾아요" : "🤖 오프라인 모드 — 매칭 서버 연결 전까진 봇과 매칭돼요"}</p>
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
            const o = pick(pool.slice(0, 6));
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
    let a, b;
    if (win) { a = randInt(1, 4); b = randInt(0, Math.max(0, a - 1)); }
    else { b = randInt(1, 4); a = randInt(0, Math.max(0, b - 1)); }

    $("battle-view").innerHTML = `<div class="tour-card"><div class="pbp" id="battle-pbp"></div><div id="battle-result"></div></div>`;
    const feeds = [
      { text: `⚔️ ${me.name} vs ${opp.name} — 매치 킥오프!` },
      ...shuffle([...BATTLE_TXT]).slice(0, 3).map((t) => ({ text: t })),
      { text: `📢 경기 종료 — ${a} : ${b}`, cls: win ? "good" : "bad" },
    ];
    let idx = 0;
    clearInterval(battleTimer);
    battleTimer = setInterval(() => {
      if (idx >= feeds.length) {
        clearInterval(battleTimer);
        finishFight(me, opp, win, a, b);
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
    submitProfile(me, rm.rating, rm.w, rm.l);
    $("battle-result").innerHTML = `
      <div class="tour-vs">${win ? `${me.name} 승리! 🎉` : `${opp.name} 승리… 💧`} <span class="score-final">${a} : ${b}</span></div>
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
  // 💼 남는다 — 아무것도 바꾸지 않고 결산으로 돌아가요
  $("btn-transfer-stay")?.addEventListener("click", () => yearReport());
  $("btn-hof-back")?.addEventListener("click", () => show("screen-title"));
  $("btn-battle-back")?.addEventListener("click", () => show(battleReturn));

  return {
    onEnding,
    refreshPro: renderPrep,
    showHof,
    showBattle,
    showActivity: () => {
      if (S.camp > 0 || S.activity || S.pendingShow) { renderPrep(); show("screen-pro"); }
      else if (S.career && S.career.years.length) yearReport();
      else { renderPrep(); show("screen-pro"); }
    },
    transferOffers,
    moveToClub,
    _t: {
      ratingOf, FAN_CAP, RATING_DIV, POS_AXIS, posAxis, AXIS_K, AXIS_OFF,
      LEAGUES, leagueOf, CLUBS, clubStrOf, debutClubs, DEBUT_POOL,
      TRANSFER_MIN_YEAR, PROMOTE_HYPE, OFFERS_PER_LEAGUE, transferFee, transferOffers, canTransfer,
      DOWNGRADE_FEE, LOYALTY_FEE, leftBefore, moveLog, careerScore,
      state: () => S,
    },
  };
})();
