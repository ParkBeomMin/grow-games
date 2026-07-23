/* 데뷔 후 활동 · 명예의 전당 · 배틀 아레나 — 더 트레이니 확장
 * game.js의 전역(S, $, rand, randInt, pick, clamp, shuffle, show, save, clearSave,
 * STAT_DEFS, POS_INFO, overall)을 사용하므로 game.js 뒤에 로드해야 해요. */
"use strict";

window.IdolCareer = (() => {
  const HOF_KEY = "grow-hof-v1";
  const BATTLE_KEY = "grow-battle-idol-v1";

  // 내장 봇 상대 (전부 가상의 아이돌)
  const GHOSTS = [
    { id: "ig1", name: "레전드 보컬 하이노트", bp: 690 },
    { id: "ig2", name: "춤신 스핀킹", bp: 640 },
    { id: "ig3", name: "래핑머신 빔프로", bp: 560 },
    { id: "ig4", name: "국민 아이돌 온에어", bp: 470 },
    { id: "ig5", name: "밈요정 챌린저", bp: 400 },
    { id: "ig6", name: "예능 만능 큐트봇", bp: 330 },
    { id: "ig7", name: "괴물 신인 첫무대", bp: 260 },
    { id: "ig8", name: "연습생 전설 무소속", bp: 180 },
  ];
  const GROUP_NAMES = ["루멘", "별무리", "크로마", "온다이브", "페어리즈", "블루문"];

  const loadHof = () => JSON.parse(localStorage.getItem(HOF_KEY) || "[]");
  const saveHof = (list) => localStorage.setItem(HOF_KEY, JSON.stringify(list));
  const loadBattle = () => JSON.parse(localStorage.getItem(BATTLE_KEY) || "{}");
  const saveBattle = (d) => localStorage.setItem(BATTLE_KEY, JSON.stringify(d));
  const bpOf = (score, ovr) => Math.round(score * 0.4 + ovr * 3);

  // ---------- 엔딩 훅 ----------
  function onEnding(debutable, center) {
    const actions = document.querySelector("#screen-ending .draft-actions");
    document.getElementById("btn-go-debut")?.remove();
    document.getElementById("btn-idol-retire")?.remove();
    const btn = document.createElement("button");
    if (debutable) {
      save();
      btn.id = "btn-go-debut";
      btn.className = "btn btn-primary";
      btn.textContent = "🎬 데뷔 활동 시작!";
      btn.onclick = () => enterCareer(center);
    } else {
      btn.id = "btn-idol-retire";
      btn.className = "btn btn-ghost";
      btn.textContent = "🏛️ 기록 남기고 마무리";
      btn.onclick = () => enshrine();
      clearSave();
    }
    actions.prepend(btn);
  }

  // ---------- 데뷔 후 활동 ----------
  function enterCareer(center) {
    S.phase = "idol-pro";
    S.group = pick(GROUP_NAMES);
    S.center = !!center;
    S.proYear = 0;
    S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0 };
    S.proLog = [];
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
    proLog(`💿 ${S.proYear}년차 컴백 준비 시작!`);
    save();
    renderPrep();
    show("screen-pro");
  }

  function renderPrep() {
    $("pro-name").textContent = `${S.name} (${POS_INFO[S.pos].name})`;
    $("pro-team").textContent = `🎤 ${S.group}${S.center ? " · 센터" : ""} · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = `컴백 준비 ${3 - S.camp}/3`;
    const av = $("pro-avatar");
    if (S.avatar) { av.src = S.avatar; av.classList.remove("hidden"); }
    else av.classList.add("hidden");
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
  $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    const stats = $("pro-stats");
    stats.innerHTML = "";
    for (const d of STAT_DEFS) {
      const v = Math.round(S.stats[d.key]);
      const row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML = `
        <span class="stat-name">${d.emoji} ${d.name}</span>
        <div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>
        <span class="stat-val">${v}</span>`;
      if (v >= 100) {
        const aw = document.createElement("button");
        aw.className = "mini-btn awaken-btn";
        aw.textContent = "🔮 각성";
        aw.onclick = () => { if (awakenTalent(d.key, proLog)) renderPrep(); };
        row.appendChild(aw);
      }
      stats.appendChild(row);
    }

    $("pro-camp-title").textContent = `컴백 준비 — 남은 연습 ${S.camp}회, 끝나면 컴백 무대!`;
    const box = $("pro-actions");
    box.innerHTML = "";
    for (const d of STAT_DEFS) {
      const btn = document.createElement("button");
      btn.className = "action-btn";
      btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 연습<span class="a-sub">${d.sub}</span>`;
      btn.onclick = () => prepAction(d);
      box.appendChild(btn);
    }
    box.appendChild(makeAdSlotButton(renderPrep));
    const rest = document.createElement("button");
    rest.className = "action-btn rest";
    rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 회복</span>`;
    rest.onclick = () => prepAction(null);
    box.appendChild(rest);

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
        if (S.camp <= 0) runComeback();
        else renderPrep();
        return;
      }
      const condMod = S.condition >= 70 ? 1.1 : S.condition >= 40 ? 1.0 : 0.6;
      let gain = rand(1.8, 3.6) * S.talents[def.key] * yearMod * condMod;
      if (S.stats[def.key] >= 100) gain *= 0.5;
      gain = Math.round(gain * 10) / 10;
      S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, STAT_CAP);
      S.condition = clamp(S.condition - randInt(10, 16), 0, 100);
      proLog(`${def.emoji} ${def.name} 연습 +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);
    } else {
      S.condition = clamp(S.condition + randInt(25, 40), 0, 100);
      proLog(`🛌 컨디션 회복 (${Math.round(S.condition)})`);
    }
    S.camp -= 1;
    save();
    if (S.camp <= 0) runComeback();
    else renderPrep();
  }

  // ---------- 컴백 활동 시뮬레이션 ----------
  function runComeback() {
    const perf =
      S.stats[POS_INFO[S.pos].stat] * 0.4 +
      S.stats.charm * 0.3 +
      ((S.stats.vocal + S.stats.dance + S.stats.rap) / 3) * 0.3;
    const agePen = S.proYear >= 8 ? (S.proYear - 7) * 0.5 : 0;
    let hype = clamp((perf - 48) / 6 + rand(-1, 2) + (S.condition - 50) / 60 - agePen, -1.5, 12);

    $("stage-title").textContent = `💿 ${S.proYear}년차 컴백 — ${S.group}`;
    $("stage-round").textContent = "";
    $("stage-card").innerHTML = `<div class="pbp" id="pbp-cb"></div><div id="cb-moment"></div>`;
    show("screen-stage");

    const feed = (f) => {
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("pbp-cb").appendChild(div);
      $("pbp-cb").scrollTop = $("pbp-cb").scrollHeight;
    };
    const pre = [
      { text: `📸 ${S.group} 컴백 티저 공개! 팬들이 술렁여요` },
      { text: "🎬 뮤직비디오 공개 — 조회수가 무섭게 올라요" },
      { text: "🎤 컴백 무대 생방송 시작!" },
    ];
    let idx = 0, momentOn = false;
    const btn = $("btn-stage-next");
    btn.textContent = "⏩ 빨리 감기";
    btn.disabled = false;
    const timer = setInterval(() => {
      if (idx >= pre.length) { clearInterval(timer); moment(); return; }
      feed(pre[idx++]);
    }, 650);
    btn.onclick = () => {
      if (momentOn) return;
      clearInterval(timer);
      while (idx < pre.length) feed(pre[idx++]);
      moment();
    };

    function moment() {
      if (momentOn) return;
      momentOn = true;
      btn.disabled = true;
      btn.textContent = "✨ 킬링파트!";
      const stat = S.stats[POS_INFO[S.pos].stat];
      window.Timing.play($("cb-moment"), {
        label: "✨ 컴백 무대 킬링파트! 초록 존에서!",
        button: "지금! 🎤",
        zonePct: clamp(13 + stat * 0.24, 13, 38),
      }, (res) => {
        if (res === "perfect") { hype += 1.2; feed({ text: "💫 킬링파트 직캠이 실시간 트렌드 1위!", cls: "good" }); }
        else if (res === "miss") { hype -= 1.2; feed({ text: "😱 생방송 무대 실수… 클립이 퍼지고 있어요", cls: "bad" }); }
        else feed({ text: "✨ 안정적인 컴백 무대를 마쳤어요" });
        finish();
      });
    }

    function finish() {
      const wins = Math.max(0, Math.round(hype * 1.3 + rand(-1, 1)));
      const sales = Math.max(1, Math.round(S.fandom * 0.08 + hype * 6 + rand(-5, 5)));
      const dFan = Math.round(hype * 12 + wins * 4 - (hype < 0 ? 15 : 0));
      S.fandom = Math.max(0, S.fandom + dFan);
      const awards = [];
      if (S.proYear === 1 && hype >= 3 && Math.random() < 0.8) { awards.push("신인상"); S.career.rookie += 1; }
      if (hype >= 6.5 && Math.random() < 0.45) { awards.push("대상"); S.career.daesang += 1; }
      else if (hype >= 4.5 && Math.random() < 0.5) { awards.push("본상"); S.career.bonsang += 1; }
      S.career.wins += wins;
      S.career.sales += sales;
      S.career.years.push({ y: S.proYear, hype: Math.round(hype * 10) / 10, wins, sales, dFan, awards });
      // 초반엔 성장, 8년차부터는 서서히 하락
      for (const d of STAT_DEFS) {
        if (S.proYear <= 3) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1) * S.talents[d.key], 0, STAT_CAP);
        else if (S.proYear >= 8) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.6, 1.8), 0, STAT_CAP);
      }
      const income = sales * 3 + wins * 80;
      S.money = (S.money || 0) + income;
      save();
      feed({ text: `📊 음악방송 1위 ${wins}회 · 초동 ${sales}만 장`, cls: wins > 0 ? "good" : "" });
      feed({ text: `💰 활동 정산 +${fmtMoney(income)}`, cls: "good" });
      if (awards.length) feed({ text: `🏆 연말 시상식 ${awards.join(", ")} 수상!`, cls: "good" });
      feed({ text: dFan >= 0 ? `💖 팬덤 +${dFan}` : `📉 팬덤 ${dFan}`, cls: dFan >= 0 ? "good" : "bad" });
      btn.disabled = false;
      btn.textContent = "활동 결산 보기";
      btn.onclick = yearReport;
    }
  }

  function yearReport() {
    const y = S.career.years[S.career.years.length - 1];
    const rows = S.career.years.slice(-8).map((x) =>
      `<tr><td>${x.y}년차</td><td>1위 ${x.wins}회</td><td>초동 ${x.sales}만</td><td>${x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    const forcedRetire = S.proYear >= 10;
    $("career-title").textContent = `📊 ${y.y}년차 활동 결산`;
    $("career-card").innerHTML = `
      ${S.avatar ? `<img class="draft-avatar" src="${S.avatar}" alt="" />` : `<div class="draft-emoji">🎤</div>`}
      <div class="draft-title">${
        y.hype >= 6 ? "차트를 지배한 해!" :
        y.hype >= 3.5 ? "탄탄한 활동을 이어간 해" :
        y.hype >= 1 ? "아쉬움이 남는 컴백" : "혹독한 한 해…"
      }</div>
      <div class="draft-team">${S.group} · 음방 1위 ${y.wins}회 · 초동 ${y.sales}만 장</div>
      <table class="season-table"><thead><tr><th>연차</th><th>음방</th><th>판매량</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="draft-summary">
        통산 ${S.career.years.length}년 활동 · 1위 ${S.career.wins}회 · 🏆 대상 ${S.career.daesang} · 본상 ${S.career.bonsang}${S.career.rookie ? " · 신인상" : ""}<br/>
        💖 팬덤 ${Math.round(S.fandom)} · ${forcedRetire ? "소속사와의 계약이 끝나가요. 아름다운 마무리를 준비할 때…" : "다음 컴백도 달릴 수 있어요!"}
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    if (!forcedRetire) {
      const next = document.createElement("button");
      next.className = "btn btn-primary";
      next.textContent = `💿 ${S.proYear + 1}년차 컴백 준비`;
      next.onclick = startPrep;
      act.appendChild(next);
    }
    const ret = document.createElement("button");
    ret.className = "btn btn-ghost";
    ret.textContent = "🎓 은퇴하기";
    ret.onclick = () => enshrine();
    act.appendChild(ret);
    show("screen-career");
  }

  // ---------- 명예의 전당 ----------
  function gradeOfScore(sc) {
    if (sc >= 850) return "🐐 세대를 정의한 아이돌";
    if (sc >= 600) return "👑 명예의 전당 헌액";
    if (sc >= 400) return "🌟 원탑 스타";
    if (sc >= 220) return "💪 롱런 아이돌";
    if (sc >= 90) return "🧢 아는 사람만 아는 명곡 부자";
    return "🌱 짧지만 빛났던 무대";
  }

  function enshrine() {
    const c = S.career || { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0 };
    const score = Math.round(
      S.fandom * 0.5 + c.wins * 6 + c.daesang * 50 + c.bonsang * 15 + c.rookie * 20 +
      (c.years ? c.years.length : 0) * 5 + (S.trophies ? S.trophies.length : 0) * 8 + (S.center ? 30 : 0)
    );
    const entry = {
      id: "i" + Date.now(),
      game: "idol",
      name: S.name,
      pos: S.pos,
      team: S.group || agencyOf().name,
      avatar: S.avatar || null,
      seasons: c.years ? c.years.length : 0,
      wins: c.wins, daesang: c.daesang, bonsang: c.bonsang, rookie: c.rookie,
      finalOvr: Math.round(overall()),
      score,
      grade: gradeOfScore(score),
    };
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
    clearSave();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      ${entry.avatar ? `<img class="draft-avatar" src="${entry.avatar}" alt="" />` : `<div class="draft-emoji">🎤</div>`}
      <div class="draft-title">${entry.name}, 무대와 작별</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons ? `${entry.team}(으)로 ${entry.seasons}년을 활동했어요.` : "데뷔 무대 대신 다른 길을 택했어요."}</div>
      <div class="draft-summary">
        음방 1위 ${entry.wins}회 · 🏆 대상 ${entry.daesang} · 본상 ${entry.bonsang}${entry.rookie ? " · 신인상" : ""}<br/>
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
    again.textContent = "🔁 새 연습생 키우기";
    again.onclick = () => location.reload();
    act.appendChild(again);
    show("screen-career");
  }

  function showHof() {
    const list = loadHof().filter((e) => e.game === "idol").sort((a, b) => b.score - a.score);
    const box = $("hof-list");
    box.innerHTML = list.length ? "" : `<p class="hint">아직 아무도 없어요. 첫 전설이 되어보세요!</p>`;
    list.forEach((e, i) => {
      const div = document.createElement("div");
      div.className = "hof-card";
      div.innerHTML = `
        ${e.avatar ? `<img class="hof-face" src="${e.avatar}" alt="" />` : `<div class="hof-face-emoji">🎤</div>`}
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.name} <span class="hof-grade">${e.grade}</span></div>
          ${e.team} · ${e.seasons}년 활동 · 1위 ${e.wins}회 · 🏆${e.daesang + e.bonsang} · 점수 ${e.score}
        </div>`;
      box.appendChild(div);
    });
    show("screen-hof");
  }

  // ---------- 랜덤 매칭 (공용 ../match.js — Supabase 연동) ----------
  const GAME_ID = "idol";
  const matchEnabled = () => !!(window.Match && window.Match.enabled());
  function submitProfile(f, rating, w, l) {
    if (window.Match) window.Match.submit(GAME_ID, { name: f.name, bp: f.bp, rating, w, l });
  }
  async function fetchRoster() {
    return window.Match ? window.Match.roster(GAME_ID) : null;
  }

  // ---------- 배틀 아레나 (컴백 대결) ----------
  const BATTLE_TXT = [
    "파워풀한 오프닝 무대! 🔥",
    "고음 배틀에서 우위를 가져와요 🎶",
    "안무 챌린지 조회수가 폭발해요 📱",
    "팬덤 응원전이 뜨겁게 달아올라요 💖",
    "마지막 무대, 소름 돋는 피날레 ⚡",
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
    for (const e of loadHof().filter((x) => x.game === "idol")) {
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
      setup.innerHTML = `<p class="hint">대결할 아이돌이 없어요.<br/>먼저 연습생을 키우면 현역이든 은퇴 후든 언제든 참전할 수 있어요!</p>`;
    } else {
      setup.innerHTML = `
        <div class="battle-row">
          <label>내 아이돌</label>
          <select id="battle-me">${list.map((f, i) => `<option value="${i}">${f.name} · 무대 파워 ${f.bp}</option>`).join("")}</select>
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
    let a, b;
    if (win) { a = randInt(86, 97); b = a - randInt(2, 8); }
    else { b = randInt(86, 97); a = b - randInt(2, 8); }

    $("battle-view").innerHTML = `<div class="tour-card"><div class="pbp" id="battle-pbp"></div><div id="battle-result"></div></div>`;
    const feeds = [
      { text: `⚔️ ${me.name} vs ${opp.name} — 컴백 대결 시작!` },
      ...shuffle([...BATTLE_TXT]).slice(0, 3).map((t) => ({ text: t })),
      { text: `📢 심사 종료 — ${a}:${b}`, cls: win ? "good" : "bad" },
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
      <table class="rank-table"><thead><tr><th>#</th><th>아이돌</th><th>전적</th><th>레이팅</th></tr></thead>
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
      if (S.camp > 0) { renderPrep(); show("screen-pro"); }
      else yearReport();
    },
  };
})();
