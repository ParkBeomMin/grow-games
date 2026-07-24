/* 프로 선수 활동 · 명예의 전당 · 배틀 아레나 — 더 윙어 확장
 * game.js의 전역(S, $, rand, randInt, pick, clamp, shuffle, show, save, clearSave,
 * STAT_DEFS, POS_INFO, overall)을 사용하므로 game.js 뒤에 로드해야 해요. */
"use strict";

window.WingerCareer = (() => {
  const HOF_KEY = "grow-hof-v1";
  const BATTLE_KEY = "grow-battle-soccer-v1";

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
  const CLUB_NAMES = ["FC 스카이", "레드불스", "블루윙즈", "유나이티드", "갤럭시 SC", "다이너마이트"];

  const loadHof = () => JSON.parse(localStorage.getItem(HOF_KEY) || "[]");
  const saveHof = (list) => localStorage.setItem(HOF_KEY, JSON.stringify(list));
  const loadBattle = () => JSON.parse(localStorage.getItem(BATTLE_KEY) || "{}");
  const saveBattle = (d) => localStorage.setItem(BATTLE_KEY, JSON.stringify(d));
  const bpOf = (score, ovr) => Math.round(score * 0.4 + ovr * 3);

  // ---------- 엔딩 훅 ----------
  function onEnding(canGoPro, captain) {
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
      clearSave();
    }
    actions.prepend(btn);
  }

  // ---------- 프로 활동 ----------
  function enterCareer(captain) {
    S.phase = "soccer-pro";
    S.group = pick(CLUB_NAMES);
    S.center = !!captain;
    S.proYear = 0;
    S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0 };
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
      btn.className = "action-btn";
      btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
      btn.onclick = () => prepAction(d);
      box.appendChild(btn);
    }
    box.appendChild(makeAdSlotButton(renderPrep));
    const rest = document.createElement("button");
    rest.className = "action-btn rest";
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
    if (def) {
      const yearMod = S.proYear <= 3 ? 1.1 : S.proYear <= 6 ? 1.0 : S.proYear <= 8 ? 0.7 : 0.45;
      const failP = S.condition < 40 ? 0.15 : 0.07;
      if (Math.random() < failP) {
        const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
        S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, STAT_CAP);
        S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
        proLog(`😵 ${def.name} 훈련이 꼬였어요… -${loss.toFixed(1)}`);
        S.camp -= 1;
        save();
        afterPrep();
        return;
      }
      const condMod = S.condition >= 70 ? 1.1 : S.condition >= 40 ? 1.0 : 0.6;
      let gain = rand(1.8, 3.6) * S.talents[def.key] * yearMod * condMod;
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
    afterPrep();
  }

  // ---------- 리그 경기 (주 1회, 주간 활약 경쟁) ----------
  function chartHTML(rows) {
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>선수</th><th>평점</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td><td>${(r.score / 10).toFixed(1)}</td></tr>`).join("")}</tbody></table>`;
  }

  function playShow() {
    const act = S.activity;
    const firstWeek = act.week === 0;
    $("stage-title").textContent = `⚽ ${S.proYear}시즌 ${cbLabel(act.cb)} — ${S.group}`;
    $("stage-round").textContent = `R${act.week + 1}/${act.weekTotal} 리그 경기`;
    $("stage-card").innerHTML = `<div class="pbp" id="pbp-cb"></div><div id="cb-moment"></div><div id="cb-result"></div>`;
    show("screen-stage");

    const feed = (f) => {
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("pbp-cb").appendChild(div);
      $("pbp-cb").scrollTop = $("pbp-cb").scrollHeight;
    };
    const pre = firstWeek
      ? [
          { text: `📋 ${S.group}, ${cbLabel(act.cb)} 개막을 앞두고 전술 미팅` },
          { text: "🏟️ 홈 팬들이 경기장을 가득 메웠어요" },
          { text: "🔔 킥오프! 개막전 시작!" },
        ]
      : [
          { text: `🔔 R${act.week + 1} 킥오프 — ${S.group} vs ${pick(act.rivals).name}의 팀` },
          { text: pick([
            "🏃 초반부터 강하게 몰아붙여요",
            "📣 원정 응원단의 함성이 뜨거워요",
            "🎯 전방 압박이 매섭게 걸립니다",
            "🛡️ 팽팽한 중원 싸움이 이어져요",
          ]) },
        ];
    let idx = 0, momentOn = false;
    const btn = $("btn-stage-next");
    btn.textContent = "⏩ 빨리 감기";
    btn.disabled = false;
    const timer = setInterval(() => {
      if (idx >= pre.length) { clearInterval(timer); moment(); return; }
      feed(pre[idx++]);
    }, 600);
    btn.onclick = () => {
      if (momentOn) return;
      clearInterval(timer);
      while (idx < pre.length) feed(pre[idx++]);
      moment();
    };

    let miniBonus = 0, miniHype = 0;
    function moment() {
      if (momentOn) return;
      momentOn = true;
      btn.disabled = true;
      btn.textContent = "🔥 승부처!";
      playRandomMini($("cb-moment"), (res, type) => {
        if (res === "perfect") { miniBonus = 10; miniHype = 0.5; feed({ text: type.great, cls: "good" }); }
        else if (res === "miss") { miniBonus = -8; miniHype = -0.5; feed({ text: type.bad, cls: "bad" }); }
        else { miniBonus = 3; feed({ text: type.ok }); }
        weeklyChart();
      });
    }

    // 주간 활약(평점) 랭킹 발표
    function weeklyChart() {
      const myScore =
        S.stats[POS_INFO[S.pos].stat] * 0.32 +
        S.stats.stamina * 0.22 +
        ((S.stats.shoot + S.stats.pass + S.stats.dribble) / 3) * 0.2 +
        S.condition / 8 + (S.fandom || 0) / 45 + miniBonus + rand(-5, 5) + 20;
      const rows = [
        { name: S.name, score: myScore, me: true },
        ...act.rivals.map((r) => ({ name: r.name, score: r.pop + rand(-8, 8) })),
      ].sort((a, b) => b.score - a.score);
      const rank = rows.findIndex((r) => r.me) + 1;
      const won = rank === 1;

      act.week += 1;
      act.hypeSum += (5 - rank) * 0.35 + miniHype;
      act.cbHype += (5 - rank) * 0.35 + miniHype;
      let pay = 30;
      let dFan;
      if (won) {
        act.wins += 1;
        act.cbWins += 1;
        S.career.wins += 1;
        pay += 100;
        dFan = randInt(10, 18);
        feed({ text: `🏆 이 주의 선수(MOM)!! 최고 평점을 받았어요!`, cls: "good" });
      } else if (rank <= 3) {
        dFan = randInt(4, 9);
        feed({ text: `📊 이번 R 평점 ${rank}위 — MOM이 눈앞이에요!`, cls: "good" });
      } else {
        dFan = randInt(-3, 3);
        feed({ text: `📊 이번 R 평점 ${rank}위`, cls: rank >= 6 ? "bad" : "" });
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

      $("cb-result").innerHTML = `
        <div class="tour-vs">${won ? "🏆 MOM!" : `평점 ${rank}위`} <span class="${won ? "win" : ""}">${S.name}</span></div>
        ${chartHTML(rows.slice(0, 5))}
        <div class="tour-pts">💰 경기 수당 +${pay}만 · ${dFan >= 0 ? `⭐ 명성 +${dFan}` : `📉 명성 ${dFan}`}</div>
        ${extraLine}`;

      btn.disabled = false;
      if (!cbDone) {
        btn.textContent = `🏋️ 다음 경기 준비 (R${act.week + 1})`;
        btn.onclick = () => {
          S.camp = 2;
          save();
          renderPrep();
          show("screen-pro");
        };
      } else if (act.cb < act.cbTotal) {
        btn.textContent = `⚽ ${cbLabel(act.cb + 1)} 준비하기`;
        btn.onclick = () => {
          S.camp = 3;
          save();
          renderPrep();
          show("screen-pro");
        };
      } else {
        btn.textContent = "🏁 시즌 결산";
        btn.onclick = finishYear;
      }
    }
  }

  // ---------- 시즌 결산 ----------
  function finishYear() {
    const act = S.activity;
    const agePen = S.proYear >= 8 ? (S.proYear - 7) * 0.8 : 0;
    const hype = clamp(act.hypeSum / 2.2 - agePen, -1.5, 12);
    const wins = act.wins;
    const sales = act.sales;
    const dFan = Math.round(hype * 10 + wins * 3 - (hype < 0 ? 15 : 0));
    S.fandom = Math.max(0, S.fandom + dFan);
    const awards = [];
    if (S.proYear === 1 && hype >= 3 && Math.random() < 0.8) { awards.push("신인왕"); S.career.rookie += 1; }
    if (hype >= 6.5 && Math.random() < 0.45) { awards.push("리그MVP"); S.career.daesang += 1; }
    else if (hype >= 4.5 && Math.random() < 0.5) { awards.push("베스트11"); S.career.bonsang += 1; }
    S.career.sales += sales;
    S.career.years.push({ y: S.proYear, hype: Math.round(hype * 10) / 10, wins, sales, dFan, awards });
    if (window.Stats) Stats.log("year_end", { y: S.proYear, wins, sales });
    for (const d of STAT_DEFS) {
      if (S.proYear <= 3) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1) * S.talents[d.key], 0, STAT_CAP);
      else if (S.proYear >= 8) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.6, 1.8), 0, STAT_CAP);
    }
    const income = sales * 3 + wins * 40;
    S.money = (S.money || 0) + income;
    S.activity = null;
    S.pendingShow = false;
    save();
    yearReport();
  }

  function yearReport() {
    const y = S.career.years[S.career.years.length - 1];
    const rows = S.career.years.slice(-8).map((x) =>
      `<tr><td>${x.y}시즌</td><td>MOM ${x.wins}회</td><td>${x.sales}P</td><td>${x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    const forcedRetire = S.proYear >= 10;
    $("career-title").textContent = `📊 ${y.y}시즌 결산`;
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚽</div>
      <div class="draft-title">${
        y.hype >= 6 ? "리그를 지배한 시즌!" :
        y.hype >= 3.5 ? "제 몫을 해낸 시즌" :
        y.hype >= 1 ? "아쉬움이 남는 시즌" : "혹독한 시즌…"
      }</div>
      <div class="draft-team">${S.group} · MOM ${y.wins}회 · 공격포인트 ${y.sales}P</div>
      <table class="season-table"><thead><tr><th>시즌</th><th>MOM</th><th>공격P</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="draft-summary">
        통산 ${S.career.years.length}시즌 · MOM ${S.career.wins}회 · 🏆 MVP ${S.career.daesang} · 베스트11 ${S.career.bonsang}${S.career.rookie ? " · 신인왕" : ""}<br/>
        ⭐ 명성 ${Math.round(S.fandom)} · ${forcedRetire ? "슬슬 은퇴를 고민할 나이가 됐어요. 아름다운 마무리를…" : "다음 시즌도 계속 뛸 수 있어요!"}
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    if (!forcedRetire) {
      const next = document.createElement("button");
      next.className = "btn btn-primary";
      next.textContent = `⚽ ${S.proYear + 1}시즌 시작`;
      next.onclick = startPrep;
      act.appendChild(next);
    }
    const ret = document.createElement("button");
    ret.className = "btn btn-ghost";
    ret.textContent = "🎓 은퇴하기";
    ret.onclick = () => enshrine();
    act.appendChild(ret);
    if (window.Ads) window.Ads.display($("ad-career"));
    show("screen-career");
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

  function enshrine() {
    const c = S.career || { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0 };
    const score = Math.round(
      S.fandom * 0.5 + c.wins * 6 + c.daesang * 50 + c.bonsang * 15 + c.rookie * 20 +
      (c.years ? c.years.length : 0) * 5 + (S.trophies ? S.trophies.length : 0) * 8 + (S.center ? 30 : 0)
    );
    const entry = {
      id: "w" + Date.now(),
      game: "soccer",
      name: S.name,
      pos: S.pos,
      team: S.group || marketOf().name,
      seasons: c.years ? c.years.length : 0,
      wins: c.wins, daesang: c.daesang, bonsang: c.bonsang, rookie: c.rookie,
      finalOvr: Math.round(overall()),
      score,
      grade: gradeOfScore(score),
    };
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
    if (window.Match) window.Match.submitHof("soccer", entry);
    if (window.Stats) Stats.log("retire", { years: entry.seasons, wins: entry.wins, score: entry.score });
    clearSave();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚽</div>
      <div class="draft-title">${entry.name}, 그라운드와 작별</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons ? `${entry.team}에서 ${entry.seasons}시즌을 뛰었어요.` : "프로 무대 대신 다른 길을 택했어요."}</div>
      <div class="draft-summary">
        MOM ${entry.wins}회 · 🏆 MVP ${entry.daesang} · 베스트11 ${entry.bonsang}${entry.rookie ? " · 신인왕" : ""}<br/>
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
    box.innerHTML = list.length ? "" : `<p class="hint">아직 아무도 없어요. 첫 전설이 되어보세요!</p>`;
    list.slice(0, 100).forEach((e, i) => {
      const div = document.createElement("div");
      div.className = "hof-card" + (localIds.has(e.id) ? " me" : "");
      div.innerHTML = `
        <div class="hof-face-emoji">⚽</div>
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.name} <span class="hof-grade">${e.grade}</span></div>
          ${e.team} · ${e.seasons}시즌 · MOM ${e.wins}회 · 🏆${e.daesang + e.bonsang} · 점수 ${e.score}
        </div>`;
      box.appendChild(div);
    });
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
        const me = list[+$("battle-me").value];
        $("btn-fight").textContent = "🔍 상대 찾는 중…";
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
    onEnding,
    refreshPro: renderPrep,
    showHof,
    showBattle,
    showActivity: () => {
      if (S.camp > 0 || S.activity || S.pendingShow) { renderPrep(); show("screen-pro"); }
      else if (S.career && S.career.years.length) yearReport();
      else { renderPrep(); show("screen-pro"); }
    },
  };
})();
