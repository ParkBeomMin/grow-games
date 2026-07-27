/* 셰프 활동 · 명예의 전당 · 배틀 아레나 — 더 셰프 확장
 * game.js의 전역(S, $, rand, randInt, pick, clamp, shuffle, show, save, clearSave,
 * STAT_DEFS, POS_INFO, overall)을 사용하므로 game.js 뒤에 로드해야 해요. */
"use strict";

window.ChefCareer = (() => {
  const HOF_KEY = "grow-hof-v1";
  const BATTLE_KEY = "grow-battle-chef-v1";

  const GHOSTS = [
    { id: "cg1", name: "미쉐린 3스타 거장", bp: 690 },
    { id: "cg2", name: "철판 위의 신 불꽃손", bp: 640 },
    { id: "cg3", name: "한식 대가 손맛", bp: 560 },
    { id: "cg4", name: "디저트 아티스트 슈가", bp: 470 },
    { id: "cg5", name: "불도장 마스터", bp: 400 },
    { id: "cg6", name: "칼의 장인 정형왕", bp: 330 },
    { id: "cg7", name: "괴물 신인 라이징", bp: 260 },
    { id: "cg8", name: "무명 막내 설거지", bp: 180 },
  ];
  const CLUB_NAMES = ["르 시엘", "미도리", "한상", "비스트로 K", "오마카세 하나", "키친 살롱"];

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

  function onEnding(canGoPro, owner) {
    const actions = document.querySelector("#screen-ending .draft-actions");
    document.getElementById("btn-go-debut")?.remove();
    document.getElementById("btn-idol-retire")?.remove();
    const btn = document.createElement("button");
    if (canGoPro) {
      save();
      btn.id = "btn-go-debut";
      btn.className = "btn btn-primary";
      btn.textContent = "🍽️ 셰프 커리어 시작!";
      btn.onclick = () => enterCareer(owner);
    } else {
      btn.id = "btn-idol-retire";
      btn.className = "btn btn-ghost";
      btn.textContent = "🏛️ 기록 남기고 마무리";
      btn.onclick = () => enshrine();
      clearSave();
    }
    actions.prepend(btn);
  }

  function enterCareer(owner) {
    S.phase = "chef-pro";
    S.group = pick(CLUB_NAMES);
    S.center = !!owner;
    S.proYear = 0;
    S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0 };
    S.proLog = [];
    if (window.Stats) Stats.log("debut", { group: S.group, center: !!owner });
    startPrep();
  }

  function proLog(msg) {
    S.proLog.unshift(`[${S.proYear}년차] ${msg}`);
    S.proLog = S.proLog.slice(0, 30);
  }

  function startPrep() {
    S.proYear += 1;
    S.camp = 3;
    S.condition = 80;
    S.activity = null;
    S.pendingShow = false;
    proLog(`🍜 ${S.proYear}년차 시작! 상반기 시즌 메뉴를 준비해요.`);
    save();
    renderPrep();
    show("screen-pro");
  }

  // ---------- 연간 활동 (상/하반기 × 영업 6주) ----------
  const CB_PER_YEAR = 2;
  const WEEKS_PER_CB = 6;
  const CB_LABELS = ["상반기", "하반기"];
  const cbLabel = (n) => CB_LABELS[n - 1] || `${n}차`;
  const RIVAL_GROUPS = ["미쉐린 셰프", "불꽃 철판왕", "한식 명인", "디저트 장인", "라이벌 오너", "베테랑 셰프", "괴물 신입", "방송 스타셰프"];

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
    $("pro-team").textContent = `🍜 ${S.group}${S.center ? " · 오너셰프" : ""} · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = S.activity
      ? `${cbLabel(S.activity.cb)} · ${S.activity.week}/${S.activity.weekTotal}주 · 극찬 ${S.activity.wins}회`
      : `메뉴 준비 ${3 - S.camp}/3`;
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
        <span class="stat-pot" title="잠재력 — 별이 많을수록 수련 효율이 높아요">${stars}</span>`;
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
        ? `🍜 ${cbLabel(S.activity.cb)} 오픈 준비 완료 — 영업을 시작하세요!`
        : `🔔 오픈 시간! ${S.activity.week + 1}주차 영업을 시작하세요`)
      : (S.activity
        ? `영업 중 — 다음 영업 전 수련 ${S.camp}회 남음`
        : `메뉴 준비 — 남은 수련 ${S.camp}회, 끝나면 영업 시작!`);
    const box = $("pro-actions");
    box.innerHTML = "";
    for (const d of STAT_DEFS) {
      const btn = document.createElement("button");
      // 상한에 닿으면 수련해도 오르지 않아요 — 각성/초월로 바꿔줍니다
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
        btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 수련<span class="a-sub">${d.sub}</span>`;
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
        ? `<span class="a-emoji">🍽️</span>${cbLabel(S.activity.cb)} 오픈<span class="a-sub">시즌 메뉴 공개 → 첫 영업</span>`
        : `<span class="a-emoji">🔔</span>디너 서비스<span class="a-sub">${S.activity.week + 1}/${S.activity.weekTotal}주 손님 평점 경쟁</span>`;
      go.onclick = playShow;
      box.appendChild(go);
    }

    $("pro-log").innerHTML = (S.proLog || [])
      .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
      .join("");
  }

  function prepAction(def) {
    // 상한에 닿았으면 수련은 턴만 소모돼요 — 각성으로 돌려줍니다
    if (def && atCap(def.key)) { if (awakenTalent(def.key, proLog)) renderPrep(); return; }
    if (def) {
      const yearMod = S.proYear <= 3 ? 1.1 : S.proYear <= 6 ? 1.0 : S.proYear <= 8 ? 0.7 : 0.45;
      const failP = S.condition < 40 ? 0.15 : 0.07;
      if (Math.random() < failP) {
        const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
        S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
        S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
        proLog(`😵 ${def.name} 수련이 꼬였어요… -${loss.toFixed(1)}`);
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
      proLog(`${def.emoji} ${def.name} 수련 +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);
      actFx(def.key, "+" + gain.toFixed(1));
    } else {
      S.condition = clamp(S.condition + randInt(25, 40), 0, 100);
      proLog(`🛌 컨디션 회복 (${Math.round(S.condition)})`);
    }
    S.camp -= 1;
    save();
    afterPrep();
  }

  // ---------- 디너 서비스 (주 1회, 손님 평점 경쟁) ----------
  function chartHTML(rows) {
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>셰프</th><th>평점</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td><td>${(r.score / 20).toFixed(1)}⭐</td></tr>`).join("")}</tbody></table>`;
  }

  function playShow() {
    const act = S.activity;
    const firstWeek = act.week === 0;
    $("stage-title").textContent = `🍜 ${S.proYear}년차 ${cbLabel(act.cb)} — ${S.group}`;
    $("stage-round").textContent = `${act.week + 1}/${act.weekTotal}주 디너 서비스`;
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
          { text: `📋 ${S.group}, ${cbLabel(act.cb)} 시즌 메뉴를 완성했어요` },
          { text: "🍷 예약이 꽉 찼어요 — 만석입니다!" },
          { text: "🔔 오픈! 첫 디너 서비스 시작!" },
        ]
      : [
          { text: `🔔 ${act.week + 1}주차 디너 오픈 — ${S.group}` },
          { text: pick([
            "🍷 단골 손님들이 자리를 채워요",
            "📸 SNS 인플루언서가 방문했어요",
            "🥘 오늘의 스페셜이 반응이 좋아요",
            "👨‍👩‍👧 가족 단위 손님으로 홀이 북적여요",
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

    // 주간 손님 평점 랭킹 발표
    function weeklyChart() {
      const myScore =
        (S.stats[POS_INFO[S.pos].stat] * 0.32 +
        S.stats.stamina * 0.22 +
        ((S.stats.knife + S.stats.taste + S.stats.creativity) / 3) * 0.2) * clutch(POS_INFO[S.pos].stat) +
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
      let pay = 40;
      let dFan;
      if (won) {
        act.wins += 1;
        act.cbWins += 1;
        S.career.wins += 1;
        pay += 120;
        dFan = randInt(10, 18);
        feed({ text: `🏆 이번 주 최고 평점!! 예약이 폭주해요!`, cls: "good" });
      } else if (rank <= 3) {
        dFan = randInt(4, 9);
        feed({ text: `📊 이번 주 평점 ${rank}위 — 1위가 눈앞이에요!`, cls: "good" });
      } else {
        dFan = randInt(-3, 3);
        feed({ text: `📊 이번 주 평점 ${rank}위`, cls: rank >= 6 ? "bad" : "" });
      }
      S.fandom = Math.max(0, (S.fandom || 0) + dFan);
      S.money = (S.money || 0) + pay;
      S.condition = clamp(S.condition - randInt(3, 6), 0, 100);
      S.pendingShow = false;

      const cbDone = act.week >= act.weekTotal;
      let extraLine = "";
      if (cbDone) {
        const cbSales = Math.max(1, Math.round(S.fandom * 0.08 + act.cbWins * 12 + act.cbHype * 6 + rand(-6, 6)));
        act.sales += cbSales;
        extraLine = `<div class="tour-pts">🍽️ ${cbLabel(act.cb)} 종료 — 극찬 ${act.cbWins}회 · 매출 ${cbSales}만</div>`;
      }
      save();

      $("cb-result").innerHTML = `
        <div class="tour-vs">${won ? "🏆 최고 평점!" : `평점 ${rank}위`} <span class="${won ? "win" : ""}">${S.name}</span></div>
        ${chartHTML(rows.slice(0, 5))}
        <div class="tour-pts">💰 매출 +${pay}만 · ${dFan >= 0 ? `⭐ 명성 +${dFan}` : `📉 명성 ${dFan}`}</div>
        ${extraLine}`;

      btn.disabled = false;
      if (!cbDone) {
        btn.textContent = `🏋️ 다음 영업 준비 (${act.week + 1}주차)`;
        btn.onclick = () => {
          S.camp = 2;
          save();
          renderPrep();
          show("screen-pro");
        };
      } else if (act.cb < act.cbTotal) {
        btn.textContent = `🍜 ${cbLabel(act.cb + 1)} 준비하기`;
        btn.onclick = () => {
          S.camp = 3;
          save();
          renderPrep();
          show("screen-pro");
        };
      } else {
        btn.textContent = "🏁 연말 결산";
        btn.onclick = finishYear;
      }
    }
  }

  // ---------- 연말 결산 ----------
  function finishYear() {
    const act = S.activity;
    const agePen = S.proYear >= 8 ? (S.proYear - 7) * 0.8 : 0;
    const hype = clamp(act.hypeSum / 2.2 - agePen, -1.5, 12);
    const wins = act.wins;
    const sales = act.sales;
    const dFan = Math.round(hype * 10 + wins * 3 - (hype < 0 ? 15 : 0));
    S.fandom = Math.max(0, S.fandom + dFan);
    // 수상은 '업계 내 상대 비교' — 가상 경쟁자들과 겨뤄 최고면 수상해요.
    const awards = [];
    if (S.proYear === 1 && hype >= 3) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(1.5, 4.2)));
      if (hype >= bestRookie) { awards.push("신인셰프상"); S.career.rookie += 1; }
    }
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8)));
    if (hype >= 5.5 && hype >= leagueBest) {
      awards.push("올해의셰프"); S.career.daesang += 1;
    } else if (hype >= 4.5) {
      const posBar = rand(4.2, 6.2);
      if (hype >= posBar) { awards.push("맛집선정"); S.career.bonsang += 1; }
    }
    S.career.sales += sales;
    if (awards.length && window.Fx) Fx.celebrate("award", `🎖️ ${awards.join(" · ")}!`);
    S.career.years.push({ y: S.proYear, hype: Math.round(hype * 10) / 10, wins, sales, dFan, awards });
    if (window.Stats) Stats.log("year_end", { y: S.proYear, wins, sales });
    for (const d of STAT_DEFS) {
      if (S.proYear <= 3) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1) * S.talents[d.key], 0, statCap(d.key));
      else if (S.proYear >= 8) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.6, 1.8), 0, statCap(d.key));
    }
    const income = sales * 2 + wins * 40;
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

  function yearReport() {
    const y = S.career.years[S.career.years.length - 1];
    const rows = S.career.years.slice(-8).map((x) =>
      `<tr><td>${x.y}년차</td><td>극찬 ${x.wins}회</td><td>${x.sales}만</td><td>${x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    const forcedRetire = S.proYear >= 10;
    $("career-title").textContent = `📊 ${y.y}년차 연말 결산`;
    $("career-card").innerHTML = `
      <div class="draft-emoji">🍜</div>
      <div class="draft-title">${
        y.hype >= 6 ? "미식가를 사로잡은 해!" :
        y.hype >= 3.5 ? "단골이 늘어난 한 해" :
        y.hype >= 1 ? "무난히 굴러간 한 해" : "혹독한 한 해…"
      }</div>
      <div class="draft-team">${S.group} · 극찬 ${y.wins}회 · 매출 ${y.sales}만</div>
      <table class="season-table"><thead><tr><th>연차</th><th>극찬</th><th>매출</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="draft-summary">
        통산 ${S.career.years.length}년 · 극찬 ${S.career.wins}회 · 🏆 올해의셰프 ${S.career.daesang} · 맛집 ${S.career.bonsang}${S.career.rookie ? " · 신인상" : ""}<br/>
        ⭐ 명성 ${Math.round(S.fandom)} · ${forcedRetire ? "이제 후배에게 주방을 물려줄 때가 됐어요. 아름다운 마무리를…" : "다음 해도 계속 달릴 수 있어요!"}
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    if (!forcedRetire) {
      const next = document.createElement("button");
      next.className = "btn btn-primary";
      next.textContent = `🍜 ${S.proYear + 1}년차 시작`;
      next.onclick = startPrep;
      act.appendChild(next);
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

  // ---------- 명예의 전당 ----------
  function gradeOfScore(sc) {
    if (sc >= 850) return "🐐 요리계의 전설";
    if (sc >= 600) return "👑 명예의 전당 헌액";
    if (sc >= 400) return "🌟 미쉐린 스타 셰프";
    if (sc >= 220) return "💪 지역 맛집 오너";
    if (sc >= 90) return "🧢 알아주는 동네 맛집";
    return "🌱 짧지만 뜨거웠던 주방";
  }

  function careerScore() {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    return Math.round(
      S.fandom * 0.5 + c.wins * 6 + c.daesang * 50 + c.bonsang * 15 + c.rookie * 20 +
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
    return `    ${S.name} · ${years}년차\n`
      + (awards ? `    ${awards}\n` : "    수상 기록 없음\n");
  }

  function enshrine() {
    const c = S.career || { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0 };
    const score = careerScore();
    const entry = {
      id: "c" + Date.now(),
      game: "chef",
      name: S.name,
      pos: S.pos,
      team: S.group || marketOf().name,
      seasons: c.years ? c.years.length : 0,
      wins: c.wins, daesang: c.daesang, bonsang: c.bonsang, rookie: c.rookie,
      finalOvr: Math.round(overall()),
      trans: transTotal(),
      gen: loadLegacy().gen + 1,
      score,
      grade: gradeOfScore(score) + (transTotal() ? ` · ${transcendTitle(transTotal())}` : ""),
    };
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
    if (window.Match) window.Match.submitHof("chef", entry);
    if (window.Stats) Stats.log("retire", { years: entry.seasons, wins: entry.wins, score: entry.score });
    clearSave();
    if (window.Cloud) Cloud.mark();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      <div class="draft-emoji">🍜</div>
      <div class="draft-title">${entry.name}, 앞치마를 내려놓다</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons ? `${entry.team}에서 ${entry.seasons}년을 요리했어요.` : "정식 셰프 대신 다른 길을 택했어요."}</div>
      <div class="draft-summary">
        극찬 리뷰 ${entry.wins}회 · 🏆 올해의셰프 ${entry.daesang} · 맛집 ${entry.bonsang}${entry.rookie ? " · 신인상" : ""}<br/>
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
    again.textContent = "🔁 새 셰프 키우기";
    again.onclick = () => location.reload();
    act.appendChild(again);
    show("screen-career");
  }

  async function showHof() {
    const box = $("hof-list");
    box.innerHTML = `<p class="hint">불러오는 중…</p>`;
    show("screen-hof");
    if (window.Match) await window.Match.backfillHof();
    const local = loadHof().filter((e) => e.game === "chef");
    const localIds = new Set(local.map((e) => e.id));
    let list = local, global = false;
    const remote = window.Match ? await window.Match.fetchHof("chef") : null;
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
        <div class="hof-face-emoji">🍜</div>
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.gen > 1 ? `<span class="hof-gen">${e.gen}세</span> ` : ""}${e.name} <span class="hof-grade">${e.grade}</span></div>
          ${e.team} · ${e.seasons}년 · 극찬 ${e.wins}회 · 🏆${e.daesang + e.bonsang} · 점수 ${e.score}
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
  const GAME_ID = "chef";
  const matchEnabled = () => !!(window.Match && window.Match.enabled());
  function submitProfile(f, rating, w, l) {
    if (window.Match) window.Match.submit(GAME_ID, { name: f.name, bp: f.bp, rating, w, l });
  }
  async function fetchRoster() {
    return window.Match ? window.Match.roster(GAME_ID) : null;
  }

  // ---------- 배틀 아레나 (요리 대결) ----------
  const BATTLE_TXT = [
    "초반부터 완벽한 미장플라스! 🔪",
    "불 조절에서 압도적 우위를 가져와요 🔥",
    "한 입에 심사위원이 눈을 감아요 👅",
    "예술적인 플레이팅에 탄성이 터져요 🎨",
    "막판 마무리 소스로 완성도를 끌어올려요 🍽️",
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
    for (const e of loadHof().filter((x) => x.game === "chef")) {
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
      setup.innerHTML = `<p class="hint">대결할 셰프가 없어요.<br/>먼저 셰프를 키우면 현역이든 은퇴 후든 언제든 참전할 수 있어요!</p>`;
    } else {
      setup.innerHTML = `
        <div class="battle-row">
          <label>내 셰프</label>
          <select id="battle-me">${list.map((f, i) => `<option value="${i}">${f.name} · 요리 실력 ${f.bp}</option>`).join("")}</select>
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
    if (win) { a = randInt(70, 100); b = a - randInt(4, 20); }
    else { b = randInt(70, 100); a = b - randInt(4, 20); }

    $("battle-view").innerHTML = `<div class="tour-card"><div class="pbp" id="battle-pbp"></div><div id="battle-result"></div></div>`;
    const feeds = [
      { text: `⚔️ ${me.name} vs ${opp.name} — 요리 대결 시작!` },
      ...shuffle([...BATTLE_TXT]).slice(0, 3).map((t) => ({ text: t })),
      { text: `📢 심사 종료 — ${a}점 : ${b}점`, cls: win ? "good" : "bad" },
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
