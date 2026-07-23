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
    const drafted = score >= 300; // 육성선수 이상
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
    startCamp();
  }

  function proLog(msg) {
    S.proLog.unshift(`[${S.proYear}년차] ${msg}`);
    S.proLog = S.proLog.slice(0, 30);
  }

  function startCamp() {
    S.proYear += 1;
    S.camp = 3;
    S.condition = 80;
    proLog(`⛺ ${S.proYear}년차 스프링캠프 시작! (${S.age}세)`);
    save();
    renderPro();
    show("screen-pro");
  }

  function renderPro() {
    $("pro-name").textContent = `${S.name} (${S.pos === "batter" ? "타자" : "투수"})`;
    $("pro-team").textContent = `⚾ ${S.team} · ${S.age}세 · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = `캠프 훈련 ${3 - S.camp}/3`;
    const av = $("pro-avatar");
    if (S.avatar) { av.src = S.avatar; av.classList.remove("hidden"); }
    else av.classList.add("hidden");
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
  $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    const stats = $("pro-stats");
    stats.innerHTML = "";
    for (const d of STAT_DEFS[S.pos]) {
      const v = Math.round(S.stats[d.key]);
      const row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML = `
        <span class="stat-name">${d.emoji} ${d.name}</span>
        <div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>
        <span class="stat-val">${v}</span>`;
      stats.appendChild(row);
    }

    $("pro-camp-title").textContent = `스프링캠프 — 남은 훈련 ${S.camp}회, 끝나면 시즌 개막!`;
    const box = $("pro-actions");
    box.innerHTML = "";
    for (const d of STAT_DEFS[S.pos]) {
      const btn = document.createElement("button");
      btn.className = "action-btn";
      btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
      btn.onclick = () => campAction(d);
      box.appendChild(btn);
    }
    const rest = document.createElement("button");
    rest.className = "action-btn rest";
    rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 회복</span>`;
    rest.onclick = () => campAction(null);
    box.appendChild(rest);

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
        if (S.camp <= 0) runSeason();
        else renderPro();
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
    if (S.camp <= 0) runSeason();
    else renderPro();
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

  function runSeason() {
    // 포지션 핵심 능력치 가중 (집중 육성한 선수가 제 성적을 내도록)
    const core = S.pos === "batter"
      ? S.stats.contact * 0.45 + S.stats.power * 0.35 + S.stats.run * 0.1 + S.stats.defense * 0.1
      : S.stats.velocity * 0.35 + S.stats.control * 0.35 + S.stats.breaking * 0.2 + S.stats.stamina * 0.1;
    const agePen = S.age >= 31 ? (S.age - 30) * 0.55 : 0;
    const condBonus = (S.condition - 50) / 60;
    const war = Math.round(clamp((core - 48) / 6 + rand(-1, 2) + condBonus - agePen, -1.5, 12) * 10) / 10;

    let line;
    if (S.pos === "batter") {
      const avg = clamp(0.215 + S.stats.contact * 0.0013 + rand(-0.015, 0.015), 0.18, 0.39);
      const hr = Math.max(0, Math.round(S.stats.power * 0.36 + rand(-5, 5)));
      const sb = Math.max(0, Math.round(S.stats.run * 0.3 + rand(-4, 4)));
      line = `타율 ${avg.toFixed(3)} · ${hr}홈런 · ${sb}도루`;
    } else {
      const era = clamp(5.6 - S.stats.control * 0.033 - S.stats.velocity * 0.012 + rand(-0.4, 0.4), 1.4, 7.5);
      const wins = Math.max(0, Math.round(war * 1.5 + 4 + rand(-2, 2)));
      const k = Math.max(20, Math.round((S.stats.velocity + S.stats.breaking) * 1.1 + rand(-15, 15)));
      line = `평균자책 ${era.toFixed(2)} · ${wins}승 · ${k}탈삼진`;
    }

    const rank = clamp(randInt(2, 10) - Math.round(war / 2.5), 1, 10);
    const champ = (rank === 1 && Math.random() < 0.5) || (rank === 2 && Math.random() < 0.22);
    const awards = [];
    if (S.proYear === 1 && war >= 3.5 && Math.random() < 0.75) { awards.push("신인왕"); S.career.roy += 1; }
    if (war >= 6.5 && Math.random() < 0.5) { awards.push("MVP"); S.career.mvp += 1; }
    else if (war >= 4.5 && Math.random() < 0.45) { awards.push("골든글러브"); S.career.gg += 1; }
    if (champ) S.career.rings += 1;
    S.career.warSum = Math.round((S.career.warSum + Math.max(war, 0)) * 10) / 10;
    S.career.seasons.push({ y: S.proYear, age: S.age, war, line, rank, champ, awards });

    // 시즌을 치르며 성장(젊을 때)·노쇠화(31세 이후)
    for (const d of STAT_DEFS[S.pos]) {
      if (S.age <= 25) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1.2) * S.talents[d.key], 0, STAT_CAP);
      else if (S.age >= 31) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.8, 2.2) - (S.age - 31) * 0.35, 0, STAT_CAP);
    }
    const salary = 3000 + Math.round(Math.max(war, 0) * 1500);
    S.money = (S.money || 0) + salary;
    S.age += 1;
    save();

    const feeds = [
      { text: `⚾ ${S.proYear}년차 시즌 개막 — ${S.team} ${S.name}` },
      ...shuffle(S.pos === "batter" ? [...SEASON_MOMENTS_BAT] : [...SEASON_MOMENTS_PIT])
        .slice(0, 3)
        .map((t) => ({ text: t, cls: war >= 3 ? "good" : "" })),
      { text: `정규시즌 최종 ${rank}위로 마감`, cls: rank <= 3 ? "good" : rank >= 8 ? "bad" : "" },
    ];
    if (champ) feeds.push({ text: "🏆 한국시리즈 우승!! 헹가래의 주인공이 됐어요", cls: "good" });
    feeds.push({ text: `💰 시즌 연봉 정산 +${fmtMoney(salary)}`, cls: "good" });
    for (const a of awards) feeds.push({ text: `🎖️ ${a} 수상!`, cls: "good" });
    playFeeds(`📺 ${S.proYear}년차 시즌`, feeds, seasonReport);
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

  function seasonReport() {
    const s = S.career.seasons[S.career.seasons.length - 1];
    const rows = S.career.seasons.slice(-8).map((x) =>
      `<tr><td>${x.y}년차</td><td>${x.age}세</td><td style="text-align:left">${x.line}${x.champ ? " 🏆" : ""}${x.awards.length ? " 🎖️" : ""}</td><td>${x.war.toFixed(1)}</td></tr>`
    ).join("");
    const forcedRetire = S.age > 40 || overall() < 30;
    $("career-title").textContent = `📊 ${s.y}년차 시즌 결산`;
    $("career-card").innerHTML = `
      ${S.avatar ? `<img class="draft-avatar" src="${S.avatar}" alt="" />` : `<div class="draft-emoji">⚾</div>`}
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
      avatar: S.avatar || null,
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
    clearSave();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      ${entry.avatar ? `<img class="draft-avatar" src="${entry.avatar}" alt="" />` : `<div class="draft-emoji">⚾</div>`}
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
        ${e.avatar ? `<img class="hof-face" src="${e.avatar}" alt="" />` : `<div class="hof-face-emoji">⚾</div>`}
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
      if (S.camp > 0) { renderPro(); show("screen-pro"); }
      else seasonReport();
    },
  };
})();
