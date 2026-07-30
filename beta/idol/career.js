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
  // 대전 기록도 백업 대상(keysOf)이에요. touch()로 표시해두지 않으면 다음 pull에
  // 조용히 덮여 사라져요.
  const saveBattle = (d) => {
    localStorage.setItem(BATTLE_KEY, JSON.stringify(d));
    if (window.Cloud) Cloud.touch();
  };
  const bpOf = (score, ovr) => Math.round(score * 0.4 + ovr * 3);

  // ---------- 엔딩 훅 ----------
  /* opts.keepSave — 🌱 연습생 재계약처럼 엔딩 뒤에도 이어갈 길이 남은 경우예요.
   * 여기서 clearSave()를 부르면 '한 해 더 연습하기'를 누르기도 전에 기록이 사라져요.
   * 그래도 '🏛️ 기록 남기고 마무리'는 그대로 둬요 — 연장을 안 쓰고 끝낼 수 있어야 해요.
   * (enshrine()이 자기 안에서 clearSave()를 부르니 마무리 경로는 그대로 정리돼요.)
   * opts.castAgency — 📞 타사 캐스팅으로 올라온 경우예요. 그 기획사로 옮겨 데뷔해요. */
  function onEnding(debutable, center, opts) {
    const keepSave = !!(opts && opts.keepSave);
    const castAgency = (opts && opts.castAgency) || null;
    const actions = document.querySelector("#screen-ending .draft-actions");
    document.getElementById("btn-go-debut")?.remove();
    document.getElementById("btn-idol-retire")?.remove();
    const btn = document.createElement("button");
    if (debutable) {
      save();
      btn.id = "btn-go-debut";
      btn.className = "btn btn-primary";
      btn.textContent = "🎬 데뷔 활동 시작!";
      btn.onclick = () => enterCareer(center, castAgency);
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

  // ---------- 데뷔 후 활동 ----------
  function enterCareer(center, castAgency) {
    // 📞 타사 캐스팅이면 소속을 그 기획사로 옮기고 데뷔해요 (기록에도 새 소속으로 남아요)
    if (castAgency) S.agency = castAgency;
    S.phase = "idol-pro";
    S.group = pick(GROUP_NAMES);
    S.center = !!center;
    S.proYear = 0;
    S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0, tours: 0 };
    S.proLog = [];
    if (window.Stats) Stats.log("debut", { group: S.group, center: !!center });
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
    S.yearConcepts = [];   // 올해 고른 컨셉 기록 — 연말 결산에서 비워요
    proLog(`💿 ${S.proYear}년차 활동 시작! 첫 컴백을 준비해요.`);
    save();
    renderPrep();
    show("screen-pro");
  }

  // ---------- 연간 활동 (컴백 2회 × 음방 6주) ----------
  const CB_PER_YEAR = 2;
  const WEEKS_PER_CB = 6;
  const RIVAL_GROUPS = ["네온시티", "스텔라즈", "허니문", "그라비티", "민트초코", "새벽달", "아이리스", "폭스클럽"];

  function rollRivals() {
    // 해마다 3%씩 강해져요. 멈춰 있으면 밀리지만, 성실히 키우면 계속 앞서요.
    // 이 성장률이 실제로 먹히는 건 주간 점수의 팬덤 항에 상한이 걸려 있기 때문이에요.
    // 상한이 없던 시절엔 팬덤이 혼자 불어나서, 훈련을 아예 멈춘 플레이어조차
    // 해마다 라이벌을 더 크게 따돌렸어요 (성장의 부호가 뒤집혀 있었어요).
    // 값을 바꿀 땐 tests/idol/weekly-test.js의 승률 표로 확인하세요.
    // 지금 3%는 그 표(중위권은 후반에 좁혀지고, 잘 키운 아이돌은 계속 강함)에
    // 맞춘 값이에요 — 올릴수록 중위권이 더 빨리 무너집니다.
    const grow = 1 + Math.max(0, (S.proYear || 1) - 1) * 0.03;
    return RIVAL_GROUPS.map((name) => ({ name, pop: rand(52, 88) * grow }));
  }

  function initActivity() {
    const tr = rollTrend();
    S.activity = {
      cb: 1, cbTotal: CB_PER_YEAR,
      week: 0, weekTotal: WEEKS_PER_CB,
      wins: 0, sales: 0, hypeSum: 0, cbHype: 0, cbWins: 0,
      concept: null, hot: tr.hot, cold: tr.cold, rumor: tr.rumor,
      rivals: rollRivals(),
    };
  }

  // 연습 턴 소진 후 흐름 제어 — 무대 날엔 pendingShow로 잠가요
  function afterPrep() {
    if (S.camp > 0) { renderPrep(); return; }
    if (!S.activity) initActivity();
    else if (S.activity.week >= S.activity.weekTotal) {
      // 다음 컴백 시작 — 컨셉을 다시 고르고 유행도 새로 굴려요
      const tr = rollTrend();
      S.activity.cb += 1;
      S.activity.week = 0;
      S.activity.cbHype = 0;
      S.activity.cbWins = 0;
      S.activity.concept = null;
      S.activity.hot = tr.hot;
      S.activity.cold = tr.cold;
      S.activity.rumor = tr.rumor;
      S.activity.rivals = rollRivals();
    }
    S.pendingShow = true;
    save();
    renderPrep();
    show("screen-pro");
  }

  function renderPrep() {
    $("pro-name").textContent = `${S.name} (${POS_INFO[S.pos].name})`;
    $("pro-team").textContent = `🎤 ${S.group}${S.center ? " · 센터" : ""} · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = S.activity
      ? `${S.activity.cb}차 컴백 · W${S.activity.week}/${S.activity.weekTotal} · 1위 ${S.activity.wins}회`
      : `컴백 준비 ${3 - S.camp}/3`;
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
  $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;
    renderStandings();

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
        <span class="stat-pot" title="잠재력 — 별이 많을수록 연습 효율이 높아요">${stars}</span>`;
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
        ? `💿 ${S.activity.cb}차 컴백 준비 완료 — 컴백을 시작하세요!`
        : `🎤 음방 D-day! W${S.activity.week + 1} 무대를 시작하세요`)
      : (S.activity
        ? `활동 중 — 다음 무대 전 연습 ${S.camp}회 남음`
        : `컴백 준비 — 남은 연습 ${S.camp}회, 끝나면 활동 시작!`);
    const box = $("pro-actions");
    box.innerHTML = "";
    for (const d of STAT_DEFS) {
      const btn = document.createElement("button");
      // 상한에 닿으면 연습해도 오르지 않아요 — 각성/초월로 바꿔줍니다
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
        btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 연습<span class="a-sub">${d.sub}</span>`;
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

    // 무대 날 — 연습 잠그고 시작 버튼만 (🎁 특훈은 턴 미소모라 허용)
    if (S.pendingShow) {
      box.querySelectorAll(".action-btn").forEach((b) => {
        if (!b.classList.contains("ad-slot")) b.disabled = true;
      });
      const go = document.createElement("button");
      go.className = "action-btn rest go-game";
      go.innerHTML = S.activity.week === 0
        ? `<span class="a-emoji">💿</span>${S.activity.cb}차 컴백 시작<span class="a-sub">티저 · 뮤비 공개 → 첫 무대</span>`
        : `<span class="a-emoji">🎤</span>음방 무대<span class="a-sub">W${S.activity.week + 1}/${S.activity.weekTotal} 주간 차트 경쟁</span>`;
      // 컨셉을 아직 안 골랐으면 무대 대신 컨셉 선택 화면으로 보내요. 이 한 줄이 게이트 전부예요.
      go.onclick = () => {
        if (!S.activity.concept) { renderConcept(); show("screen-concept"); return; }
        playShow();
      };
      box.appendChild(go);
    }

    $("pro-log").innerHTML = (S.proLog || [])
      .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
      .join("");
  }

  function prepAction(def) {
    // 상한에 닿았으면 연습은 턴만 소모돼요 — 각성으로 돌려줍니다
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
      proLog(`${def.emoji} ${def.name} 연습 +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);
      actFx(def.key, "+" + gain.toFixed(1));
    } else {
      S.condition = clamp(S.condition + randInt(25, 40), 0, 100);
      proLog(`🛌 컨디션 회복 (${Math.round(S.condition)})`);
    }
    S.camp -= 1;
    save();
    afterPrep();
  }

  // ---------- 음방 무대 (주 1회, 주간 차트 경쟁) ----------
  function chartHTML(rows) {
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>그룹</th><th>점수</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td><td>${Math.round(r.score)}</td></tr>`).join("")}</tbody></table>`;
  }

  /* ---------- 🏆 올해의 그룹 순위 ----------
   * 음방 1위 횟수와 팬덤을 한 표에 모아, 라이벌들 사이에서 우리가 어디쯤인지 보여줘요.
   * 한 해 단위로 쌓고 새 연차가 시작되면 리셋해요 (연차 활동 → 연말 결산 흐름 그대로).
   * 컴백마다 라이벌을 새로 뽑아도 그룹 이름으로 이어 붙여서 기록은 안 끊겨요.
   *
   * ⚠️ 라이벌 팬덤은 '표시 전용'이에요. 절대 pop이나 주간 점수로 되돌아가면 안 돼요.
   * 주간 점수의 팬덤 항에는 상한(FANDOM_CAP)이 걸려 있고, 라이벌 성장은 오직
   * rollRivals()의 3%만으로 굴러가요. 여기서 되먹임이 하나라도 생기면 오래 걸린
   * 주간 밸런스가 통째로 무너져요. 읽는 방향은 pop → 시작 팬덤 한 번뿐이에요. */
  const RIVAL_FAN_SEED = 3.6;
  function seedFandom(pop) {
    // 그 정도 인기로 데뷔부터 지금까지 쌓았을 법한 팬덤을 어림잡아요.
    // 안 그러면 10년차 플레이어(팬덤 수천) 옆에 0부터 시작한 라이벌이 서서
    // 표가 아무 의미도 없어져요.
    return Math.max(0, Math.round(pop * RIVAL_FAN_SEED * (S.proYear || 1)));
  }

  // 진행 중인 캐릭터는 S.standings가 없어요 — 없으면 지금 연차로 새로 열어줘요.
  function ensureStandings() {
    const yr = S.proYear || 1;
    if (!S.standings || S.standings.year !== yr) S.standings = { year: yr, groups: {} };
    const gs = S.standings.groups;
    for (const r of (S.activity && S.activity.rivals) || []) {
      if (!gs[r.name]) gs[r.name] = { wins: 0, fandom: seedFandom(r.pop) };
    }
    return gs;
  }

  /* 주간 차트 결과를 그해 기록에 반영해요.
   * 라이벌 팬덤은 '차트에서 거둔 성적'으로만 자라요 — 증감 폭은 플레이어와 같은 표예요.
   * 내 기록은 여기 담지 않아요. 표를 그릴 때 S.fandom과 S.activity.wins를 그대로
   * 읽어 쓰니까, 따로 복사해두고 어긋날 일이 없어요. */
  function recordWeek(rows) {
    const gs = ensureStandings();
    rows.forEach((r, i) => {
      if (r.me) return;
      const g = gs[r.name];
      if (!g) return;
      const rk = i + 1;
      if (rk === 1) g.wins += 1;
      g.fandom = Math.max(0, g.fandom + (rk === 1 ? randInt(10, 18) : rk <= 3 ? randInt(4, 9) : randInt(-3, 3)));
    });
  }

  // 내 줄의 1위 횟수는 부르는 쪽이 넘겨줘요 (활동 중이면 act.wins, 결산이면 그해 기록).
  function standingsRows(myWins) {
    const gs = (S.standings && S.standings.groups) || {};
    return [
      { name: S.group, wins: myWins || 0, fandom: Math.round(S.fandom || 0), me: true },
      ...Object.entries(gs).map(([name, g]) => ({ name, wins: g.wins || 0, fandom: Math.round(g.fandom || 0) })),
    ].sort((a, b) => b.wins - a.wins || b.fandom - a.fandom);
  }

  function standingsHTML(myWins) {
    const rows = standingsRows(myWins);
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>그룹</th><th>🏆 음방 1위</th><th>💖 팬덤</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}${r.me ? " (우리)" : ""}</td><td>${r.wins}회</td><td>${r.fandom}</td></tr>`).join("")}</tbody></table>`;
  }

  // 📊 커리어 화면의 접이식 순위표. 활동 중이 아니면 숨겨요.
  function renderStandings() {
    const box = $("pro-standings");
    if (!box) return;
    if (!S.activity) { box.hidden = true; return; }
    ensureStandings();
    const myWins = S.activity.wins || 0;
    const rank = standingsRows(myWins).findIndex((r) => r.me) + 1;
    box.hidden = false;
    $("pro-standings-sum").textContent =
      `🏆 올해 그룹 순위 ${rank}위 · 음방 1위 ${myWins}회 · 💖 팬덤 ${Math.round(S.fandom || 0)}`;
    $("pro-standings-body").innerHTML = standingsHTML(myWins);
  }

  /* 컴백 컨셉 — 같은 능력치라도 어느 컨셉으로 나가느냐가 초동을 가릅니다.
   * 가중치는 스펙(docs/superpowers/specs/2026-07-28-comeback-concept-design.md)이 정본이에요.
   * v는 편차예요. 강렬이 가장 크고(±28%) 청량이 가장 작아요(±10%). */
  const CONCEPTS = [
    { id: "cool",   emoji: "💧", name: "청량",   desc: "댄스 중심 · 안정적",
      w: { dance: 1.0, charm: 0.5, vocal: 0.2, rap: 0.1 }, v: 0.10 },
    { id: "fierce", emoji: "🔥", name: "강렬",   desc: "랩·댄스 중심 · 편차가 커요",
      w: { rap: 0.8, dance: 0.7, charm: 0.4, vocal: 0.1 }, v: 0.28 },
    { id: "emo",    emoji: "🌙", name: "감성",   desc: "보컬 중심",
      w: { vocal: 1.1, charm: 0.5, dance: 0.2, rap: 0.0 }, v: 0.12 },
    { id: "teen",   emoji: "✨", name: "하이틴", desc: "매력 중심",
      w: { charm: 1.1, dance: 0.5, vocal: 0.3, rap: 0.1 }, v: 0.18 },
  ];
  const SALES_K = 0.72;    // 시뮬레이션으로 잡은 값 — 곡선이 여기 걸려 있어요
  const TREND_HOT = 1.18;
  const TREND_COLD = 0.85;

  // 옛 세이브에는 concept이 없어요. 편차가 가장 작은 청량을 기본으로 둡니다.
  function conceptOf(act) {
    return CONCEPTS.find((c) => c.id === (act && act.concept)) || CONCEPTS[0];
  }

  // 같은 컨셉이 유행이자 식상으로 뽑히면 상쇄돼요 (배수 없음)
  function trendMul(concept, act) {
    if (!act || !act.hot || act.hot === act.cold) return 1;
    if (concept.id === act.hot) return TREND_HOT;
    if (concept.id === act.cold) return TREND_COLD;
    return 1;
  }

  // 편차와 유행 배수를 뺀 기댓값 — 컨셉 선택 화면에 보여줄 숫자예요
  function expectedSales(stats, concept, fandom, cbWins) {
    let base = 0;
    for (const k in concept.w) base += (stats[k] || 0) * concept.w[k];
    return Math.max(1, Math.round(base * SALES_K + (fandom || 0) * 0.05 + (cbWins || 0) * 4));
  }

  /* 컴백마다 유행 하나, 식상 하나를 굴려요. 같은 게 뽑히면 상쇄돼서 배수가 안 붙어요.
   * rumor는 고르기 전에 보여줄 후보 2종이에요. 진짜 유행이 반드시 들어 있어서
   * 플레이어는 반반 확률에 걸지 말지를 판단하게 돼요.
   * 전부 공개하면 정답이 확정돼 고민이 사라지고, 전부 감추면 유행이 순수 운이 됩니다. */
  function rollTrend() {
    const hot = CONCEPTS[randInt(0, CONCEPTS.length - 1)].id;
    const cold = CONCEPTS[randInt(0, CONCEPTS.length - 1)].id;
    let other;
    do { other = CONCEPTS[randInt(0, CONCEPTS.length - 1)].id; } while (other === hot);
    // 진짜 유행이 항상 앞에 오면 첫 칸만 보고 답을 알아요. 순서를 섞습니다.
    const rumor = Math.random() < 0.5 ? [hot, other] : [other, hot];
    return { hot, cold, rumor };
  }

  /* 컴백 시작 전 컨셉 고르기 — 소문 2종만 보여줘요.
   * 확정 유행(act.hot)은 여기서 절대 읽지 않아요. 고른 뒤에 공개됩니다.
   * 예상 판매량에도 유행 배수를 얹지 않아요. 아직 확정이 아니니까요.
   * 여기서 확정 유행이 새어 나가면 정답이 확정돼서 고민이 사라져요 — 이 설계의 전부예요. */
  function renderConcept() {
    const act = S.activity;
    const rumor = act.rumor || [];
    const names = rumor
      .map((id) => CONCEPTS.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => `${c.emoji} ${c.name}`);
    $("concept-title").textContent = `🎬 ${S.proYear}년차 ${act.cb}차 컴백 — 컨셉 정하기`;
    $("concept-rumor-line").innerHTML = names.length === 2
      ? `🗣 업계 소문: 이번 시즌은 <b>${names[0]}</b> 아니면 <b>${names[1]}</b> 이 온대요`
      : `🗣 이번 시즌은 소문이 잠잠해요`;

    $("concept-list").innerHTML = CONCEPTS.map((c) => {
      const est = expectedSales(S.stats, c, S.fandom, act.cbWins);
      const isRumor = rumor.includes(c.id);
      return `<button class="concept-card ${isRumor ? "concept-rumor" : ""}" data-cid="${c.id}">
        <span class="c-emoji">${c.emoji}</span>
        <span><span class="c-name">${c.name}${isRumor ? `<span class="concept-badge">🗣 소문</span>` : ""}</span><br><span class="c-desc">${c.desc}</span></span>
        <span class="c-sales">~ ${est}만 장</span>
      </button>`;
    }).join("");

    $("concept-list").querySelectorAll(".concept-card").forEach((el) => {
      el.onclick = () => {
        S.activity.concept = el.dataset.cid;
        save();
        // 고른 뒤에야 확정 유행을 공개해요. 무대는 공개 화면의 시즌 시작 버튼에서 열려요.
        renderReveal();
        show("screen-reveal");
      };
    });
  }

  /* 컨셉을 고른 뒤 확정 유행을 공개해요. 여기서 처음으로 유행·식상을 보여줍니다.
   * 배수는 trendMul이 정본이에요 — 화면에서 다시 계산하지 않아요.
   * 표기 퍼센트도 trendMul이 준 배수에서 뽑아요. 값을 손으로 적어두면
   * TREND_HOT/TREND_COLD를 바꿨을 때 화면만 옛 숫자로 남아요.
   *
   * "유행이 없었어요" 판정도 trendMul에서 뽑아요. act.hot/act.cold를 직접 읽어
   * 따로 판정하던 시절엔 두 식이 갈라졌어요 — CONCEPTS에 없는 id를 든 세이브
   * (hot: "retro", cold: "cool")로 청량을 고르면 "유행이 없었어요"라고 써놓고
   * 바로 아래에서 -15%를 띄웠거든요. 배수를 받는 컨셉이 있으면 유행이 있는 거예요. */
  function renderReveal() {
    const act = S.activity;
    const c = conceptOf(act);
    const hot = CONCEPTS.find((x) => trendMul(x, act) > 1);
    const cold = CONCEPTS.find((x) => trendMul(x, act) < 1);
    const mul = trendMul(c, act);
    const pct = Math.round((mul - 1) * 100);

    $("reveal-title").textContent = `${c.emoji} ${c.name} 컨셉으로 컴백!`;
    const lines = [];
    if (hot) lines.push(`<span>🔥 유행 <b>${hot.emoji} ${hot.name}</b></span>`);
    if (cold) lines.push(`<span>❄️ 식상 <b>${cold.emoji} ${cold.name}</b></span>`);
    $("reveal-trend").innerHTML = lines.length
      ? lines.join("\n         ")
      : `<span>이번 시즌은 뚜렷한 유행이 없었어요</span>`;

    const box = $("reveal-effect");
    if (mul > 1) {
      box.className = "reveal-hit";
      box.innerHTML = `<div class="r-head">🔥 트렌드 적중!</div>
        <div class="r-sub">이번 컴백 초동 판매량 <b>+${pct}%</b></div>`;
    } else if (mul < 1) {
      box.className = "reveal-miss";
      box.innerHTML = `<div class="r-head">❄️ 한물간 컨셉…</div>
        <div class="r-sub">이번 컴백 초동 판매량 <b>${pct}%</b></div>`;
    } else {
      box.className = "reveal-flat";
      box.innerHTML = `<div class="r-head">🎬 무난한 시즌이에요</div>
        <div class="r-sub">유행을 타지도, 밀리지도 않아요</div>`;
    }
  }

  function playShow() {
    const act = S.activity;
    const firstWeek = act.week === 0;
    $("stage-title").textContent = `💿 ${S.proYear}년차 ${act.cb}차 컴백 — ${S.group}`;
    /* 컴백 내내 무대 상단에 고른 컨셉과 유행 버프를 남겨요. 배수는 trendMul이 정본이라
     * 화면에서 다시 계산하지 않고, 퍼센트도 trendMul이 준 배수에서 뽑아요 (renderReveal과 동일한 방식). */
    const c = conceptOf(act);
    const mul = trendMul(c, act);
    const pct = Math.round((mul - 1) * 100);
    const buff = mul > 1 ? ` · 🔥 +${pct}%` : mul < 1 ? ` · ❄️ ${pct}%` : "";
    $("stage-round").textContent = `W${act.week + 1}/${act.weekTotal} 음악방송 · ${c.emoji} ${c.name}${buff}`;
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
          { text: `📸 ${S.group} ${act.cb}차 컴백 티저 공개! 팬들이 술렁여요` },
          { text: "🎬 뮤직비디오 공개 — 조회수가 무섭게 올라요" },
          { text: "🎤 컴백 첫 무대 생방송 시작!" },
        ]
      : [
          { text: `📺 ${pick(["뮤직 차트쇼", "주간 뮤직", "라이브 스테이지", "슈퍼 뮤직"])} 생방송 — ${S.group} 무대!` },
          { text: pick([
            "🎙️ 라이브 밸런스가 좋아요. 현장 반응이 뜨거워요",
            "📱 무대 직캠이 실시간 트렌드에 올랐어요",
            "💖 팬덤 응원봉이 객석을 가득 메웠어요",
            "🩰 대형 스크린에 잡힌 표정 연기가 화제예요",
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

    // 매 무대 필수 미니게임 (자동 모드면 즉시 판정)
    let miniBonus = 0, miniHype = 0;
    function moment() {
      if (momentOn) return;
      momentOn = true;
      btn.disabled = true;
      btn.textContent = "✨ 하이라이트!";
      playRandomMini($("cb-moment"), (res, type) => {
        if (res === "perfect") { miniBonus = 10; miniHype = 0.5; feed({ text: type.great, cls: "good" }); }
        else if (res === "miss") { miniBonus = -8; miniHype = -0.5; feed({ text: type.bad, cls: "bad" }); }
        else { miniBonus = 3; feed({ text: type.ok }); }
        weeklyChart();
      });
    }

    // 주간 차트 발표
    /* 주간 점수의 축은 능력치예요. 팬덤 항에는 상한(FANDOM_CAP)이 있어요 —
     * 팬덤은 활동만 해도 저절로 쌓이는 값이라, 상한이 없으면 훈련을 멈춰도
     * 점수가 해마다 올라가서 라이벌 성장(rollRivals의 3%)을 통째로 덮어버려요. */
    const FANDOM_CAP = 16;
    function weeklyChart() {
      const myScore =
        (S.stats[POS_INFO[S.pos].stat] * 0.32 +
        S.stats.charm * 0.22 +
        ((S.stats.vocal + S.stats.dance + S.stats.rap) / 3) * 0.2) * clutch(POS_INFO[S.pos].stat) +
        S.condition / 8 + Math.min((S.fandom || 0) / 45, FANDOM_CAP) + miniBonus + rand(-5, 5);
      const rows = [
        { name: S.group, score: myScore, me: true },
        ...act.rivals.map((r) => ({ name: r.name, score: r.pop + rand(-8, 8) })),
      ].sort((a, b) => b.score - a.score);
      const rank = rows.findIndex((r) => r.me) + 1;
      const won = rank === 1;
      recordWeek(rows);   // 🏆 올해 그룹 순위에 이번 주 결과를 남겨요 (표시 전용)

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
        feed({ text: `🏆 주간 차트 1위!! 앵콜 무대를 가져갑니다!`, cls: "good" });
      } else if (rank <= 3) {
        dFan = randInt(4, 9);
        feed({ text: `📊 이번 주 차트 ${rank}위 — 1위가 눈앞이에요!`, cls: "good" });
      } else {
        dFan = randInt(-3, 3);
        feed({ text: `📊 이번 주 차트 ${rank}위`, cls: rank >= 6 ? "bad" : "" });
      }
      S.fandom = Math.max(0, (S.fandom || 0) + dFan);
      S.money = (S.money || 0) + pay;
      S.condition = clamp(S.condition - randInt(3, 6), 0, 100);
      S.pendingShow = false;

      const cbDone = act.week >= act.weekTotal;
      let extraLine = "";
      if (cbDone) {
        /* 초동 판매량 — 이 게임의 고유 축이에요. 능력치에서 직접 자라고 상한이 없어요.
         * 컨셉이 어느 능력치를 볼지 정하고, 시즌 유행이 배수를 얹어요. 편차는 컨셉마다 달라요. */
        const concept = conceptOf(act);
        const cbSales = Math.max(1, Math.round(
          expectedSales(S.stats, concept, S.fandom, act.cbWins) *
          trendMul(concept, act) * (1 + rand(-concept.v, concept.v))
        ));
        act.sales += cbSales;
        /* 연말 결산에 남길 기록이에요 — 고른 컨셉과 적중 여부. 한 해에 컴백이 2번이라
         * 둘 다 쌓아요. 적중 판정도 trendMul이 정본이에요 (화면과 같은 근거). */
        const cbMul = trendMul(concept, act);
        S.yearConcepts = (S.yearConcepts || []).concat({
          id: concept.id, t: cbMul > 1 ? "hot" : cbMul < 1 ? "cold" : "",
        });
        extraLine = `<div class="tour-pts">💿 ${act.cb}차 컴백 종료 · ${concept.emoji} ${concept.name} — 1위 ${act.cbWins}회 · 초동 ${cbSales}만 장</div>`;
      }
      save();

      $("cb-result").innerHTML = `
        <div class="tour-vs">${won ? "🏆 1위!" : `차트 ${rank}위`} <span class="${won ? "win" : ""}">${S.group}</span></div>
        ${chartHTML(rows.slice(0, 5))}
        <div class="tour-pts">💰 출연료 +${pay}만 · ${dFan >= 0 ? `💖 팬덤 +${dFan}` : `📉 팬덤 ${dFan}`}</div>
        ${extraLine}`;

      btn.disabled = false;
      if (!cbDone) {
        btn.textContent = `🏋️ 다음 무대 준비 (W${act.week + 1})`;
        btn.onclick = () => {
          S.camp = 2;
          save();
          renderPrep();
          show("screen-pro");
        };
      } else if (act.cb < act.cbTotal) {
        btn.textContent = `💿 ${act.cb + 1}차 컴백 준비하기`;
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

  /* 🌏 월드투어 — 정상에 오른 뒤에만 열리는 후반 목표예요.
   * 상을 노린 육성과 팬덤을 노린 육성 둘 다 길이 되게 '또는'으로 뒀어요.
   *
   * 이 수치는 tests/idol/pacing-test.js로 실제 산식을 굴려서 잰 값이에요
   * (데뷔부터 은퇴까지 연습 턴·주간 차트·판매량·수상을 전부 돌립니다).
   *   강하게 키우면 평균 6.8년차에 열려요 (거의 모든 판이 열림)
   *   보통으로 키우면 평균 9.5년차 — 은퇴 직전에 겨우 닿거나 못 닿아요
   * 팬덤은 10년을 꽉 채워도 3천 언저리라, 예전의 8000은 아무도 못 넘었어요.
   * 값을 바꿀 땐 반드시 pacing-test.js를 다시 돌리세요. */
  const TOUR_DAESANG = 3;
  const TOUR_FANDOM = 2000;
  function tourReady() {
    return (S.career.daesang || 0) >= TOUR_DAESANG || (S.fandom || 0) >= TOUR_FANDOM;
  }

  /* 도시 수는 팬덤이 정해요 — 4곳에서 시작해 8곳까지 늘어나요.
   * 열림 기준(TOUR_FANDOM)에서 세기 시작해요. 절대값으로 재던 시절엔
   * 4000당 한 곳이라, 실제로 도달 가능한 팬덤 범위에서는 영원히 4곳이었어요. */
  const TOUR_CITY_STEP = 400;
  function tourCities() {
    return clamp(4 + Math.floor(((S.fandom || 0) - TOUR_FANDOM) / TOUR_CITY_STEP), 4, 8);
  }

  /* 투어 등급 — 전체 도시의 평균 객석 점유율로 매겨요.
   * 실패해도 커리어가 끝나지 않아요. 다음 해에 다시 도전할 수 있어요.
   *
   * 컷은 강행군·기세·쉬어가기를 넣은 뒤 tests/idol/tour-depth-test.js로 실측해
   * 다시 잡은 값이에요. 예전 컷(0.95 / 0.80 / 0.60)은 컨디션 소모가 없던 시절
   * 기준이라, 무작위 플레이 500회에서 A가 72%·C가 0%였어요 — 사실상 전원 A였죠.
   * 지금은 S 13% · A 32% · B 39% · C 16%로 갈리고, 미니게임을 전부 완벽하게
   * 소화하면 S가 78%예요. 컷을 만질 땐 반드시 tour-depth-test.js의 분포표를
   * 다시 재세요. */
  function tourGrade(fillRate) {
    if (fillRate >= 0.86) return "S";
    if (fillRate >= 0.72) return "A";
    if (fillRate >= 0.60) return "B";
    return "C";
  }

  const TOUR_PLACES = [
    "도쿄", "오사카", "타이베이", "방콕", "싱가포르", "자카르타", "마닐라",
    "시드니", "로스앤젤레스", "뉴욕", "멕시코시티", "상파울루", "런던", "파리", "베를린",
  ];
  const TOUR_MUL = { S: 1.6, A: 1.25, B: 1.0, C: 0.7 };   // 등급별 보상 배수
  const TOUR_RANK = { C: 0, B: 1, A: 2, S: 3 };

  /* 🔥 강행군 — 투어는 체력전이에요. 도시마다 컨디션이 깎이고, 컨디션이 낮으면
   * 같은 무대를 해도 객석이 덜 차요. 아주 낮으면 공연이 취소되기까지 해요.
   *
   * 소모 총량은 도시 수와 무관하게 맞춰요(TOUR_DRAIN을 도시 수로 나눠요).
   * 도시 수는 팬덤이 정하는데, 도시가 많을수록 더 지치게 만들면 잘 키운 사람이
   * 오히려 불리해져요 — 성장의 부호가 뒤집히는 거죠. 라이벌 성장률에서 같은
   * 실수를 한 적이 있어요(rollRivals 주석 참고).
   * 대신 뒤로 갈수록 한 도시가 더 깎이게 램프를 걸어서, 후반이 고비가 돼요. */
  const TOUR_DRAIN = 52;        // 투어 한 번에 쓰는 컨디션 총량(평균)
  const TOUR_RAMP = 0.9;        // 마지막 도시는 첫 도시의 1.9배로 깎여요
  const TOUR_START_MIN = 50;    // 한 해를 마치고 떠나니 이만큼은 회복한 상태예요
  const TOUR_REST_SHOW = 55;    // 이 아래면 🛌 쉬어가기 선택지가 떠요
  const TOUR_DANGER = 18;       // 이 아래로 강행하면 공연 취소 위험이 있어요
  const TOUR_HYPE_STEP = 0.06; // 연속 만석 1회당 다음 도시 객석 보너스
  const TOUR_HYPE_MAX = 4;      // 기세는 4연속까지 쌓여요 (최대 +0.24)
  const TOUR_FULL = 0.85;       // 이 이상 차면 '만석' — 기세가 이어져요

  /* 컨디션 → 객석 배수. 80 이상이면 온전하고, 바닥이면 0.6까지 떨어져요.
   * 계단이 아니라 직선이라 "조금 더 지쳤다"가 그대로 객석에 비쳐요. */
  function tourCondMul(cond) {
    return clamp(0.6 + cond * 0.005, 0.6, 1);
  }

  // i번째 도시(0부터)를 도는 데 드는 컨디션. n개 도시 전체 합이 대략 TOUR_DRAIN이에요.
  function tourDrain(i, n) {
    const at = n > 1 ? i / (n - 1) : 0.5;
    const ramp = (1 + TOUR_RAMP * at) / (1 + TOUR_RAMP / 2);
    return Math.max(1, Math.round((TOUR_DRAIN / n) * ramp * rand(0.85, 1.15)));
  }

  // 컨디션이 바닥이면 공연이 취소돼요. 최대 45%까지만 — 전멸은 안 만들어요.
  function tourCancelChance(cond) {
    return cond >= TOUR_DANGER ? 0 : clamp((TOUR_DANGER - cond) / 40, 0, 0.45);
  }

  /* 진행 중인 투어. 한 해 안에 시작해서 끝나는 이벤트라 저장하지 않아요 —
   * 중간에 나가면 그냥 없던 일이 되고, S.career.tours도 안 올라가요. */
  let tour = null;

  function startTour() {
    if (!tourReady()) return;
    /* cond는 투어 안에서만 쓰는 값이에요 — S.condition을 직접 깎지 않아요.
     * 투어는 저장하지 않는 이벤트라, 중간에 나갔다 들어오면 깎인 컨디션만 남아
     * 다음 시도가 불가능해지거든요. 옛 세이브엔 condition이 없을 수도 있어서
     * TOUR_START_MIN으로 받쳐요. */
    tour = {
      cities: shuffle([...TOUR_PLACES]).slice(0, tourCities()),
      i: 0, fills: [], notes: [],
      cond: clamp(Math.max(S.condition || 0, TOUR_START_MIN), 0, 100),
      streak: 0,
    };
    $("tour-log").innerHTML = "";
    $("tour-moment").innerHTML = "";
    $("tour-result").innerHTML = "";
    proLog(`🌏 ${tour.cities.length}개 도시 월드투어를 떠나요!`);
    renderTourCity();
    show("screen-tour");
  }

  function tourFeed(text, cls) {
    const div = document.createElement("div");
    if (cls) div.className = cls;
    div.textContent = text;
    $("tour-log").appendChild(div);
    $("tour-log").scrollTop = $("tour-log").scrollHeight;
  }

  function tourFillHTML() {
    const mark = { rest: " 🛌", cancel: " ⚠️" };
    return tour.fills.map((f, i) => `
      <div class="tour-fill"><span>${tour.cities[i]}${mark[tour.notes[i]] || ""}</span>
        <div class="bar"><div class="bar-fill scout" style="width:${Math.round(f * 100)}%"></div></div>
        <span>${Math.round(f * 100)}%</span></div>`).join("");
  }

  /* 🔥 남은 컨디션과 기세를 한 줄로 보여줘요. 강행할지 쉴지 고르는 근거예요. */
  function tourMetaHTML() {
    const cls = tour.cond < TOUR_DANGER ? "danger" : tour.cond < TOUR_REST_SHOW ? "warn" : "";
    const hype = Math.min(tour.streak, TOUR_HYPE_MAX);
    return `<span class="tour-cond ${cls}">🔥 컨디션 ${Math.round(tour.cond)}</span>` +
      `<span class="tour-hype">${hype ? `🎆 기세 ${tour.streak}연속 만석 (객석 +${Math.round(hype * TOUR_HYPE_STEP * 100)}%)` : "🎆 기세 없음"}</span>`;
  }

  function renderTourCity() {
    const city = tour.cities[tour.i];
    const n = tour.cities.length;
    $("tour-city").textContent = `${tour.i + 1}/${n}번째 도시 — ${city} 🎫`;
    $("tour-meta").innerHTML = tourMetaHTML();
    $("tour-moment").innerHTML = "";
    /* 🐛 도시가 바뀔 때 로그도 비워요. 예전에는 tour-moment만 비워서 타이베이
     * 화면에 자카르타 이야기가 그대로 남아 있었어요(실기기 스크린샷). 도시별
     * 객석은 아래 tour-result에 계속 쌓이니, 로그는 지금 도시 것만 보여줘요. */
    $("tour-log").innerHTML = "";
    tourFeed(`✈️ ${city} 도착 — ${tour.i + 1}/${n}번째 도시`);
    if (tour.cond < TOUR_DANGER) {
      tourFeed(`🥵 몸이 무너지기 직전이에요. 강행하면 공연이 취소될 수도 있어요…`, "bad");
    } else if (tour.cond < TOUR_REST_SHOW) {
      tourFeed(`😮‍💨 누적된 피로가 느껴져요. 하루 쉬어갈까요?`);
    }
    const btn = $("btn-tour-go");
    btn.disabled = false;
    btn.textContent = tour.cond < TOUR_DANGER ? `${city} 강행하기 ⚠️` : `${city} 공연하기 🎤`;
    btn.onclick = playTourCity;
    // 🛌 쉬어가기는 컨디션이 낮을 때만 나타나요
    const rb = $("btn-tour-rest");
    rb.classList.toggle("hidden", tour.cond >= TOUR_REST_SHOW);
    rb.disabled = false;
    rb.textContent = "🛌 하루 쉬어가기";
    rb.onclick = restTourCity;
  }

  // 도시 한 곳을 끝내고 다음으로 넘어가는 버튼을 세워요
  function afterTourCity() {
    const btn = $("btn-tour-go");
    $("btn-tour-rest").classList.add("hidden");
    $("tour-result").innerHTML = tourFillHTML();
    $("tour-meta").innerHTML = tourMetaHTML();
    tour.i += 1;
    btn.disabled = false;
    if (tour.i < tour.cities.length) {
      btn.textContent = `다음 도시로 ✈️ (${tour.i + 1}/${tour.cities.length})`;
      btn.onclick = renderTourCity;
    } else {
      btn.textContent = "🏁 투어 마무리";
      btn.onclick = finishTour;
    }
  }

  /* 도시 한 곳을 강행해요 — 이동과 공연으로 컨디션이 깎이고, 깎인 컨디션이
   * 그 무대의 객석에 그대로 반영돼요. 미니게임 판정이 뼈대, 컨디션·기세가 살이에요. */
  function playTourCity() {
    const btn = $("btn-tour-go");
    btn.disabled = true;
    $("btn-tour-rest").disabled = true;
    const city = tour.cities[tour.i];
    const n = tour.cities.length;
    const drain = tourDrain(tour.i, n);
    tour.cond = clamp(tour.cond - drain, 0, 100);
    tourFeed(`🚚 이동과 리허설로 컨디션 -${drain} (남은 컨디션 ${Math.round(tour.cond)})`);
    $("tour-meta").innerHTML = tourMetaHTML();

    // 몸이 버티지 못하면 공연이 취소돼요. 객석 0으로 남지만 커리어는 안 끝나요.
    if (Math.random() < tourCancelChance(tour.cond)) {
      tour.fills.push(0);
      tour.notes.push("cancel");
      tour.streak = 0;
      $("tour-moment").innerHTML = "";
      tourFeed(`🚑 ${city} 공연 취소… 몸이 버티지 못했어요`, "bad");
      tourFeed(`🎫 ${city} 객석 0%`, "bad");
      afterTourCity();
      return;
    }

    playRandomMini($("tour-moment"), (res, type) => {
      const base = res === "perfect" ? rand(0.93, 1.0)
        : res === "miss" ? rand(0.34, 0.56)
        : rand(0.68, 0.86);
      const condMul = tourCondMul(tour.cond);
      const hype = Math.min(tour.streak, TOUR_HYPE_MAX) * TOUR_HYPE_STEP;
      // 매력이 높으면 현지 화제성이 붙어 객석이 조금 더 차요
      const fill = clamp(base * condMul + hype + (S.stats.charm - 100) / 600, 0, 1);
      tour.fills.push(fill);
      tour.notes.push("");
      tourFeed(res === "perfect" ? type.great : res === "miss" ? type.bad : type.ok,
        res === "perfect" ? "good" : res === "miss" ? "bad" : "");
      if (condMul < 1) tourFeed(`😩 지친 몸이 무대를 갉아먹어요 (객석 ×${condMul.toFixed(2)})`, "bad");
      if (hype > 0) tourFeed(`🎆 ${tour.streak}연속 만석의 화제성! (객석 +${Math.round(hype * 100)}%)`, "good");
      tourFeed(`🎫 ${city} 객석 ${Math.round(fill * 100)}%`, fill >= TOUR_FULL ? "good" : "");
      // 🎆 기세 — 만석을 이어가면 눈덩이가 되고, 한 번 못 채우면 리셋돼요
      tour.streak = fill >= TOUR_FULL ? tour.streak + 1 : 0;
      afterTourCity();
    });
  }

  /* 🛌 하루 쉬어가기 — 컨디션을 회복하지만 그 도시 객석은 낮게 확정되고
   * 기세도 끊겨요. 취소를 피하는 안전판이지, 이득을 보는 선택은 아니에요. */
  function restTourCity() {
    const btn = $("btn-tour-go");
    btn.disabled = true;
    $("btn-tour-rest").disabled = true;
    const city = tour.cities[tour.i];
    const before = tour.cond;
    tour.cond = clamp(tour.cond + randInt(26, 38), 0, 100);
    const fill = rand(0.26, 0.42);
    tour.fills.push(fill);
    tour.notes.push("rest");
    tour.streak = 0;
    $("tour-moment").innerHTML = "";
    tourFeed(`🛌 ${city} 공연을 축소하고 하루 쉬었어요. 컨디션 ${Math.round(before)} → ${Math.round(tour.cond)}`, "good");
    tourFeed(`🎫 ${city} 객석 ${Math.round(fill * 100)}% — 무대를 줄인 만큼 객석도 줄었어요`);
    afterTourCity();
  }

  /* 완주했을 때만 등급이 나오고 tours가 올라가요.
   * 보상은 언제나 0 이상이에요 — 투어가 망해도 팬덤·자금·기록이 줄지 않아요. */
  function finishTour() {
    const n = tour.fills.length;
    const avg = n ? tour.fills.reduce((a, b) => a + b, 0) / n : 0;
    const grade = tourGrade(avg);
    const mul = TOUR_MUL[grade];
    /* 계수를 45·900에서 60·1200으로 올렸어요. 강행군이 들어와 평균 객석이
     * 0.85에서 0.70으로 내려갔는데, 계수를 그대로 두면 완주 보상이 25%쯤
     * 줄어들어요. 투어는 후반 목표라 벌이가 얇아지면 아무도 안 떠나요.
     * 실측(tour-depth-test.js)으로 평균 보상이 개편 전과 비슷해지는 값을 잡았어요.
     * 등급 배수는 그대로라, 폭은 넓어졌지만 기대값은 유지돼요. */
    const dFan = Math.max(0, Math.round(n * avg * 60 * mul));
    const income = Math.max(0, Math.round(n * avg * 1200 * mul));
    S.career.tours = (S.career.tours || 0) + 1;
    S.tourYear = S.proYear;   // 한 해에 한 번만 떠날 수 있어요
    if (!S.tourBest || TOUR_RANK[grade] > TOUR_RANK[S.tourBest]) S.tourBest = grade;
    S.fandom = (S.fandom || 0) + dFan;
    S.money = (S.money || 0) + income;
    proLog(`🌏 월드투어 완주! ${n}개 도시 평균 객석 ${Math.round(avg * 100)}% · ${grade}등급`);
    if (window.Stats) Stats.log("tour", { cities: n, grade, fill: Math.round(avg * 100) });
    if (grade === "S" && window.Fx) Fx.celebrate("award", "🌏 월드투어 대성공!");
    save();

    const cancels = tour.notes.filter((x) => x === "cancel").length;
    const rests = tour.notes.filter((x) => x === "rest").length;
    $("tour-city").textContent = `🏁 ${n}개 도시 완주 — 평균 객석 ${Math.round(avg * 100)}%`;
    $("tour-meta").innerHTML = `<span class="tour-cond">🔥 남은 컨디션 ${Math.round(tour.cond)}</span>` +
      `<span class="tour-hype">${cancels ? `🚑 취소 ${cancels}회 · ` : ""}${rests ? `🛌 쉬어간 도시 ${rests}곳` : "🛌 한 번도 쉬지 않았어요"}</span>`;
    $("tour-moment").innerHTML = "";
    $("btn-tour-rest").classList.add("hidden");
    $("tour-result").innerHTML = `
      <div class="tour-grade">${grade} 등급</div>
      ${tourFillHTML()}
      <div class="tour-pts">💖 팬덤 +${dFan} · 💰 투어 수익 +${fmtMoney(income)}${
        grade === "C" ? "<br/>아쉬웠지만 잃은 건 하나도 없어요. 내년에 다시 도전해요!" : ""}</div>`;
    const btn = $("btn-tour-go");
    btn.disabled = false;
    btn.textContent = "← 결산으로 돌아가기";
    btn.onclick = () => { tour = null; yearReport(); };
  }

  // ---------- 연말 결산 ----------
  function finishYear() {
    const act = S.activity;
    const agePen = S.proYear >= 8 ? (S.proYear - 7) * 0.8 : 0;
    /* 연말 평가는 그해 초동 판매량이 정해요.
     * 순위(hypeSum)는 회차 화면의 긴장감으로 남기고 여기서는 안 써요 —
     * 순위는 1위 위가 없어서 본질적으로 천장이 있거든요.
     * 판매량은 상한이 없지만 후반에 기하급수로 커지니 로그로 눌러요.
     * 선형으로 재면 10년차에 hype가 수백이 돼요. */
    const hype = clamp(Math.log(Math.max(1, act.sales)) * 2.4 - 8 - agePen, -1.5, 12);
    const wins = act.wins;
    const sales = act.sales;
    const dFan = Math.round(hype * 10 + wins * 3 - (hype < 0 ? 15 : 0));
    S.fandom = Math.max(0, S.fandom + dFan);
    // 수상은 '업계 내 상대 비교' — 가상 경쟁자들과 겨뤄 최고면 수상해요.
    const awards = [];
    if (S.proYear === 1 && hype >= 3) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(1.5, 4.2)));
      if (hype >= bestRookie) { awards.push("신인상"); S.career.rookie += 1; }
    }
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8)));
    if (hype >= 5.5 && hype >= leagueBest) {
      awards.push("대상"); S.career.daesang += 1;
    }
    /* 본상은(는) 대상과(와) 별개로 판정해요.
     * 예전에는 else if라서 대상을(를) 받으면 본상을(를) 아예 못 받았어요.
     * 가장 잘한 시즌이 오히려 상을 덜 받는 역전이 났습니다. */
    if (hype >= 4.5) {
      const posBar = rand(4.2, 6.2);
      if (hype >= posBar) { awards.push("본상"); S.career.bonsang += 1; }
    }
    S.career.sales += sales;
    if (awards.length && window.Fx) Fx.celebrate("award", `🎖️ ${awards.join(" · ")}!`);
    S.career.years.push({ y: S.proYear, hype: Math.round(hype * 10) / 10, wins, sales, dFan, awards, concepts: S.yearConcepts || [] });
    S.yearConcepts = [];
    if (window.Stats) Stats.log("year_end", { y: S.proYear, wins, sales });
    // 초반엔 성장, 8년차부터는 서서히 하락
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

  /* 그해 고른 컨셉과 적중 여부를 한 줄로 만들어요. 한 해에 컴백이 2번이라 둘 다 나와요.
   * 옛 연차 기록에는 concepts가 아예 없어요 — 마이그레이션하지 않고 여기서 빈 배열로 받아요.
   * withName이면 이름까지("💧 청량 적중"), 아니면 표에 들어갈 짧은 꼴("💧🔥")이에요. */
  function conceptLine(list, withName) {
    return (list || []).map((c) => {
      const def = CONCEPTS.find((x) => x.id === (c && c.id));
      if (!def) return "";
      if (withName) return `${def.emoji} ${def.name}${c.t === "hot" ? " 적중" : c.t === "cold" ? " 식상" : ""}`;
      return `${def.emoji}${c.t === "hot" ? "🔥" : c.t === "cold" ? "❄️" : ""}`;
    }).filter(Boolean).join(withName ? " · " : " ");
  }

  function yearReport() {
    const y = S.career.years[S.career.years.length - 1];
    const rows = S.career.years.slice(-8).map((x) =>
      `<tr><td>${x.y}년차</td><td>1위 ${x.wins}회</td><td>초동 ${x.sales}만</td><td class="sn-concept" title="${conceptLine(x.concepts, true)}">${conceptLine(x.concepts) || "-"}</td><td>${x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    const forcedRetire = S.proYear >= 10;
    /* 🏆 그해 그룹 최종 순위. 결산이 끝나도 S.standings는 남아 있고, 다음 연차
     * 활동이 시작될 때 비로소 새로 열려요. 다른 해의 기록이면 아예 안 보여줘요. */
    const standings = (S.standings && S.standings.year === y.y)
      ? `<details class="standings-box"><summary>🏆 ${y.y}년차 그룹 최종 순위</summary>${standingsHTML(y.wins)}</details>`
      : "";
    $("career-title").textContent = `📊 ${y.y}년차 활동 결산`;
    $("career-card").innerHTML = `
      <div class="draft-emoji">🎤</div>
      <div class="draft-title">${
        y.awards.includes("대상") ? "차트를 지배한 해!" :
        y.awards.length ? "탄탄한 활동을 이어간 해" :
        y.wins > 0 ? "아쉬움이 남는 컴백" : "혹독한 한 해…"
      }</div>
      <div class="draft-team">${S.group} · 음방 1위 ${y.wins}회 · 초동 ${y.sales}만 장${
        conceptLine(y.concepts, true) ? `<br/>🎬 컨셉 ${conceptLine(y.concepts, true)}` : ""}</div>
      <table class="season-table"><thead><tr><th>연차</th><th>음방</th><th>판매량</th><th>컨셉</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      ${standings}
      <div class="draft-summary">
        통산 ${S.career.years.length}년 활동 · 1위 ${S.career.wins}회 · 🏆 대상 ${S.career.daesang} · 본상 ${S.career.bonsang}${S.career.rookie ? " · 신인상" : ""}${(S.career.tours || 0) ? ` · 🌏 월드투어 ${S.career.tours}회${S.tourBest ? `(최고 ${S.tourBest})` : ""}` : ""}<br/>
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
    /* 🌏 월드투어 — 조건을 채운 뒤에만, 한 해에 한 번 떠날 수 있어요.
     * 은퇴가 강제되는 10년차에도 남겨둬요. 마지막 해에 여는 사람도 있으니까요. */
    if (tourReady() && S.tourYear !== S.proYear) {
      const tb = document.createElement("button");
      tb.className = "btn btn-primary";
      /* 🐛 도시 수는 여기에 안 써요. 옆의 "💿 N년차 컴백 준비"와 나란히 서서
       * 폭이 절반이라, 괄호까지 붙이면 "🌏 월드투어 떠나기 (4개…"로 잘렸어요
       * (실기기 스크린샷). 도시 수는 투어 화면의 "1/4번째 도시"에서 보여줘요. */
      tb.textContent = "🌏 월드투어 떠나기";
      tb.onclick = startTour;
      act.appendChild(tb);
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
    if (sc >= 850) return "🐐 세대를 정의한 아이돌";
    if (sc >= 600) return "👑 명예의 전당 헌액";
    if (sc >= 400) return "🌟 원탑 스타";
    if (sc >= 220) return "💪 롱런 아이돌";
    if (sc >= 90) return "🧢 아는 사람만 아는 명곡 부자";
    return "🌱 짧지만 빛났던 무대";
  }

  function careerScore() {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    return Math.round(
      S.fandom * 0.5 + c.wins * 6 + c.daesang * 50 + c.bonsang * 15 + c.rookie * 20 +
      (c.tours || 0) * 40 +   // 🌏 완주한 월드투어
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
      id: "i" + Date.now(),
      game: "idol",
      name: S.name,
      pos: S.pos,
      team: S.group || agencyOf().name,
      seasons: c.years ? c.years.length : 0,
      wins: c.wins, daesang: c.daesang, bonsang: c.bonsang, rookie: c.rookie,
      tours: c.tours || 0, tourBest: S.tourBest || "",
      finalOvr: Math.round(overall()),
      trans: transTotal(),
      gen: loadLegacy().gen + 1,
      score,
      grade: gradeOfScore(score) + (transTotal() ? ` · ${transcendTitle(transTotal())}` : ""),
    };
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
    if (window.Match) window.Match.submitHof("idol", entry);
    if (window.Stats) Stats.log("retire", { years: entry.seasons, wins: entry.wins, score: entry.score });
    clearSave();
    if (window.Cloud) Cloud.mark();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      <div class="draft-emoji">🎤</div>
      <div class="draft-title">${entry.name}, 무대와 작별</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons ? `${entry.team}(으)로 ${entry.seasons}년을 활동했어요.` : "데뷔 무대 대신 다른 길을 택했어요."}</div>
      <div class="draft-summary">
        음방 1위 ${entry.wins}회 · 🏆 대상 ${entry.daesang} · 본상 ${entry.bonsang}${entry.rookie ? " · 신인상" : ""}${entry.tours ? ` · 🌏 월드투어 ${entry.tours}회${entry.tourBest ? `(최고 ${entry.tourBest})` : ""}` : ""}<br/>
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

  async function showHof() {
    const box = $("hof-list");
    box.innerHTML = `<p class="hint">불러오는 중…</p>`;
    show("screen-hof");
    if (window.Match) await window.Match.backfillHof();
    const local = loadHof().filter((e) => e.game === "idol");
    const localIds = new Set(local.map((e) => e.id));
    let list = local, global = false;
    const remote = window.Match ? await window.Match.fetchHof("idol") : null;
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
        <div class="hof-face-emoji">🎤</div>
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.gen > 1 ? `<span class="hof-gen">${e.gen}세</span> ` : ""}${e.name} <span class="hof-grade">${e.grade}</span></div>
          ${e.team} · ${e.seasons}년 활동 · 1위 ${e.wins}회 · 🏆${e.daesang + e.bonsang}${e.tours ? ` · 🌏${e.tours}` : ""} · 점수 ${e.score}
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
  // 🎤 시즌 시작 — playShow가 안에서 show("screen-stage")까지 해요 (중복 전환 금지)
  $("btn-reveal-go")?.addEventListener("click", () => { if (S.activity) playShow(); });
  $("btn-hof-back")?.addEventListener("click", () => show("screen-title"));
  $("btn-battle-back")?.addEventListener("click", () => show(battleReturn));

  return {
    // 검증용 창구예요 — 산식만 열어둡니다. 게임 코드에서는 쓰지 마세요.
    /* tourState는 테스트용 창구예요. tour는 이 IIFE 안의 지역 변수라
     * 페이지에서 eval해도 안 보여서, 강행군·기세를 검사할 방법이 없어요. */
    _t: { tourGrade, tourReady, tourCities, tourCondMul, tourDrain, tourCancelChance,
      CONCEPTS, conceptOf, trendMul, expectedSales, rollTrend, state: () => S, tourState: () => tour },
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
