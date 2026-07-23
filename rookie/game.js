/* 더 루키 ⚾ 야구선수 키우기 */
"use strict";

// ---------- 데이터 ----------
const REGIONS = [
  {
    id: "seoul", name: "서울", emoji: "🏙️",
    school: "서울고", teams: ["LG 트윈스", "두산 베어스", "키움 히어로즈"],
    win: 0.70, growth: 1.0, spot: 1.1,
    desc: "미디어와 스카우트가 몰리는 수도. 주목받기 좋아요",
  },
  {
    id: "gyeongin", name: "인천·경기", emoji: "🌊",
    school: "인천고", teams: ["SSG 랜더스", "KT 위즈"],
    win: 0.62, growth: 1.05, spot: 1.0,
    desc: "탄탄한 유망주 산실. 성장 환경이 좋아요",
  },
  {
    id: "chungcheong", name: "대전·충청", emoji: "🌰",
    school: "대전고", teams: ["한화 이글스"],
    win: 0.58, growth: 1.1, spot: 1.05,
    desc: "팀은 약하지만 출전 기회가 많아 크게 성장해요",
  },
  {
    id: "honam", name: "광주·전라", emoji: "🍚",
    school: "광주제일고", teams: ["KIA 타이거즈"],
    win: 0.78, growth: 0.92, spot: 0.95,
    desc: "최강 명문. 우승은 쉽지만 주전 경쟁이 치열해요",
  },
  {
    id: "daegu", name: "대구·경북", emoji: "🍎",
    school: "대구상원고", teams: ["삼성 라이온즈"],
    win: 0.72, growth: 0.97, spot: 1.0,
    desc: "전통의 야구 도시. 밸런스가 좋아요",
  },
  {
    id: "busan", name: "부산·경남", emoji: "⚓",
    school: "부산고", teams: ["롯데 자이언츠", "NC 다이노스"],
    win: 0.74, growth: 0.95, spot: 1.0,
    desc: "구도(球都) 부산. 열광적인 응원 속에 큰 무대 경험",
  },
];

const STAT_DEFS = {
  batter: [
    { key: "contact", name: "타격", emoji: "🏏", sub: "안타 생산" },
    { key: "power", name: "파워", emoji: "💪", sub: "홈런 파워" },
    { key: "run", name: "주루", emoji: "👟", sub: "도루·주루" },
    { key: "defense", name: "수비", emoji: "🧤", sub: "수비 안정감" },
    { key: "stamina", name: "체력", emoji: "🫀", sub: "지구력" },
  ],
  pitcher: [
    { key: "velocity", name: "구속", emoji: "🔥", sub: "빠른 공" },
    { key: "control", name: "제구", emoji: "🎯", sub: "정확한 공" },
    { key: "breaking", name: "변화구", emoji: "🌀", sub: "현란한 공" },
    { key: "defense", name: "수비", emoji: "🧤", sub: "견제·수비" },
    { key: "stamina", name: "체력", emoji: "🫀", sub: "이닝 소화" },
  ],
};

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const GIVEN = ["도윤", "시우", "하준", "은찬", "민재", "태양", "강민", "준서", "지호", "건우", "현빈", "서준"];

const OPPONENTS = ["북일고", "덕수고", "경남고", "유신고", "장충고", "휘문고", "마산용마고", "전주고", "세광고", "강릉고", "경북고", "천안북일고", "충암고", "성남고"];

const TOURNAMENTS = { 6: "황금사자기", 8: "청룡기" };
const ROUNDS = ["16강", "8강", "4강", "결승"];

// ---------- 상태 ----------
const SAVE_KEY = "rookie-save-v1";
let S = null; // 게임 상태
let tour = null; // 진행 중인 대회 상태

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function newState(region, pos, name) {
  const stats = {};
  const talents = {};
  for (const d of STAT_DEFS[pos]) {
    stats[d.key] = randInt(28, 44);
    talents[d.key] = rand(0.8, 1.45);
  }
  return {
    region: region.id, pos, name,
    year: 1, month: 3,
    stats, talents,
    avatar: (window.Avatar && window.Avatar.get()) || null,
    condition: 80,
    scout: 0,
    buff: false, // 다음 훈련 효율 상승
    trophies: [],
    games: 0, // 대회 출전 경기 수
    log: [],
  };
}

const regionOf = () => REGIONS.find((r) => r.id === S.region);
const overall = () => {
  const vals = Object.values(S.stats);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
function clearSave() { localStorage.removeItem(SAVE_KEY); }

// ---------- 화면 전환 ----------
function show(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

// ---------- 시작 흐름 ----------
let chosenRegion = null;
let chosenPos = null;

function initTitle() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    $("btn-continue").classList.remove("hidden");
    $("btn-continue").onclick = () => {
      S = JSON.parse(saved);
      if (S.phase === "pro" && window.Career) {
        window.Career.showPro();
      } else {
        renderMain();
        show("screen-main");
      }
    };
  }
  $("btn-new").onclick = () => {
    renderRegions();
    show("screen-region");
  };
}

function renderRegions() {
  const box = $("region-list");
  box.innerHTML = "";
  for (const r of REGIONS) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.innerHTML = `
      <span class="card-emoji">${r.emoji}</span>
      <span class="card-title">${r.name}</span>
      <span class="card-sub">${r.school} · ${r.teams.join(" / ")}</span>
      <span class="card-desc">${r.desc}</span>
      <span class="card-tags">
        <span class="tag">팀 전력 ${"★".repeat(Math.round(r.win * 5))}</span>
        <span class="tag">성장 ${"★".repeat(Math.round(r.growth * 3))}</span>
      </span>`;
    btn.onclick = () => {
      chosenRegion = r;
      $("position-hint").textContent = `${r.school}에 입학했어요! 어떤 선수가 될까요?`;
      show("screen-position");
    };
    box.appendChild(btn);
  }
}

document.querySelectorAll("#position-list .card").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenPos = btn.dataset.pos;
    $("name-hint").textContent = `${chosenRegion.school} ${chosenPos === "batter" ? "타자" : "투수"} 유망주의 이름은?`;
    $("input-name").value = pick(SURNAMES) + pick(GIVEN);
    show("screen-name");
  });
});

$("btn-random-name").addEventListener("click", () => {
  $("input-name").value = pick(SURNAMES) + pick(GIVEN);
});

$("btn-start").addEventListener("click", () => {
  const name = $("input-name").value.trim() || pick(SURNAMES) + pick(GIVEN);
  S = newState(chosenRegion, chosenPos, name);
  addLog(`⚾ ${chosenRegion.school} 입학! ${name}의 야구 인생이 시작됐어요.`);
  save();
  renderMain();
  show("screen-main");
});

// ---------- 메인 렌더 ----------
function renderMain() {
  const r = regionOf();
  $("hud-name").textContent = `${S.name} (${S.pos === "batter" ? "타자" : "투수"})`;
  $("hud-school").textContent = `${r.emoji} ${r.school} · 종합 ${Math.round(overall())}`;
  $("hud-turn").textContent = `${S.year}학년 ${S.month}월`;

  const av = $("hud-avatar");
  if (S.avatar) { av.src = S.avatar; av.classList.remove("hidden"); }
  else av.classList.add("hidden");

  $("cond-num").textContent = Math.round(S.condition);
  const condBar = $("cond-bar");
  condBar.style.width = `${S.condition}%`;
  condBar.classList.toggle("low", S.condition < 35);

  const scoutPct = clamp((S.scout / 450) * 100, 0, 100);
  $("scout-num").textContent = Math.round(S.scout);
  $("scout-bar").style.width = `${scoutPct}%`;

  // 스탯
  const statsBox = $("stats-box");
  statsBox.innerHTML = "";
  for (const d of STAT_DEFS[S.pos]) {
    const v = Math.round(S.stats[d.key]);
    const stars = "⭐".repeat(clamp(Math.round((S.talents[d.key] - 0.6) * 4), 1, 5));
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-name">${d.emoji} ${d.name}</span>
      <div class="bar"><div class="bar-fill stat" style="width:${v}%"></div></div>
      <span class="stat-val">${v}</span>
      <span class="stat-pot" title="잠재력">${stars}</span>`;
    statsBox.appendChild(row);
  }

  // 행동 버튼
  const actBox = $("action-list");
  actBox.innerHTML = "";
  for (const d of STAT_DEFS[S.pos]) {
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
    btn.onclick = () => doTraining(d);
    actBox.appendChild(btn);
  }
  const rest = document.createElement("button");
  rest.className = "action-btn rest";
  rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 대폭 회복</span>`;
  rest.onclick = doRest;
  actBox.appendChild(rest);

  renderLog();
}

function addLog(msg) {
  S.log.unshift(`[${S.year}학년 ${S.month}월] ${msg}`);
  S.log = S.log.slice(0, 40);
}

function renderLog() {
  const box = $("log-box");
  box.innerHTML = S.log
    .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
    .join("");
}

// ---------- 행동 ----------
function doTraining(def) {
  const r = regionOf();

  // 컨디션이 바닥일 때 무리하면 부상
  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🤕 지친 몸으로 무리하다 ${def.name} 훈련 중 부상! 한 달을 재활로 날렸어요.`);
    endMonth();
    return;
  }

  const condMod = S.condition >= 70 ? 1.15 : S.condition >= 40 ? 1.0 : 0.6;
  const buffMod = S.buff ? 1.5 : 1.0;
  S.buff = false;
  let gain = rand(2.2, 4.2) * S.talents[def.key] * r.growth * condMod * buffMod;
  gain = Math.round(gain * 10) / 10;
  S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, 100);
  S.condition = clamp(S.condition - randInt(12, 18), 0, 100);
  addLog(`${def.emoji} ${def.name} 훈련 완료! +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);

  maybeEvent();
  endMonth();
}

function doRest() {
  S.condition = clamp(S.condition + randInt(30, 42), 0, 100);
  S.stats.stamina = clamp(S.stats.stamina + 0.5, 0, 100);
  addLog(`🛌 푹 쉬었어요. 컨디션 회복! (${Math.round(S.condition)})`);
  maybeEvent();
  endMonth();
}

function maybeEvent() {
  if (Math.random() > 0.3) return;
  const r = regionOf();
  const events = [
    () => {
      const d = pick(STAT_DEFS[S.pos]);
      S.stats[d.key] = clamp(S.stats[d.key] + 3, 0, 100);
      addLog(`🧢 감독님의 특별 지도! ${d.name} +3`);
    },
    () => {
      const pts = Math.round(8 * r.spot);
      S.scout += pts;
      addLog(`📸 프로 스카우트가 연습 경기를 지켜봤어요! 주목도 +${pts}`);
    },
    () => {
      S.condition = clamp(S.condition - 20, 0, 100);
      addLog(`🤒 감기 몸살로 며칠 고생했어요. 컨디션 -20`);
    },
    () => {
      S.condition = clamp(S.condition + 12, 0, 100);
      addLog(`🍜 급식에 특식이 나왔어요! 컨디션 +12`);
    },
    () => {
      S.buff = true;
      addLog(`🔥 라이벌의 도발에 불이 붙었어요! 다음 훈련 효율 1.5배`);
    },
    () => {
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, 100);
      addLog(`🏃 아침 러닝 습관이 몸에 붙었어요. 체력 +2`);
    },
    () => {
      S.scout = Math.max(0, S.scout - 10);
      addLog(`📉 슬럼프라는 소문이 돌아요… 스카우트 주목도 -10`);
    },
  ];
  pick(events)();
}

// ---------- 월 진행 ----------
function endMonth() {
  save();
  renderMain();

  // 대회 달이면 대회 시작
  const tname = TOURNAMENTS[S.month];
  if (tname) {
    startTournament(tname);
    return;
  }
  advanceMonth();
}

function advanceMonth() {
  // 3학년 9월 = 드래프트
  if (S.year === 3 && S.month === 9) {
    showDraft();
    return;
  }
  S.month += 1;
  if (S.month === 13) S.month = 1;
  if (S.month === 3 && S.year < 3) S.year += 1;
  // 학년은 3월에 올라감 (1·2월은 겨울 훈련)
  save();
  renderMain();
}

// ---------- 대회 ----------
function startTournament(name) {
  tour = { name, round: 0, alive: true, totalPts: 0, results: [] };
  $("tour-title").textContent = `🏆 ${name} 전국고교야구대회`;
  $("tour-round").textContent = "";
  $("tour-card").innerHTML = `
    <div class="tour-vs">⚾ ${regionOf().school}, ${name} 출전!</div>
    <div class="tour-line">전국의 강호들과 겨룰 시간이에요.<br/>좋은 활약을 보이면 스카우트 주목도가 크게 올라요.</div>`;
  $("btn-tour-next").textContent = "1차전 시작";
  $("btn-tour-next").onclick = playTourGame;
  show("screen-tournament");
}

function playTourGame() {
  const r = regionOf();
  const roundName = ROUNDS[tour.round];
  const opp = pick(OPPONENTS);

  // 승률: 학교 전력 + 선수 능력 + 컨디션 - 라운드 페널티
  const p = clamp(
    r.win + (overall() - 50) / 130 + (S.condition - 50) / 700 - tour.round * 0.06,
    0.15, 0.92
  );
  const perf = S.pos === "batter" ? batterLine() : pitcherLine();
  // 절반 이상은 '운명의 9회' 접전 — 타이밍 미니게임이 승부를 결정해요
  const interactive = Math.random() < 0.55;
  const preWin = interactive ? null : Math.random() < p;
  const story = S.pos === "batter"
    ? batterStory(preWin, perf, interactive)
    : pitcherStory(preWin, perf, interactive);
  renderGameSim(roundName, opp, perf, story, interactive, preWin);
}

// ---------- 경기 시뮬레이션 연출 ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function addRuns(inn, n, lo = 0, hi = 8) {
  for (let i = 0; i < n; i++) inn[randInt(lo, hi)]++;
}

const HR_TXT = [
  "담장을 훌쩍 넘기는 큼지막한 홈런! 💥",
  "받아치는 순간 확신하는 타구! 홈런! 💥",
  "좌측 폴대를 살짝 스치는 극적인 홈런! 💥",
];
const HIT_TXT = [
  "좌중간을 가르는 안타! 🏏",
  "유격수 키를 넘기는 안타! 🏏",
  "우전 적시타! 🏏",
  "총알 같은 2루타! ⚡",
];
const OUT_TXT = [
  "아쉬운 헛스윙 삼진 😔",
  "잘 맞았지만 중견수 정면 뜬공",
  "유격수 땅볼로 물러납니다",
  "파울 접전 끝에 범타 처리",
];

// 타자: 개인 성적을 이닝에 배치. interactive면 마지막 타석은 미니게임 몫으로 남겨둠
function batterStory(win, perf, interactive) {
  const ourInn = Array(9).fill(0), oppInn = Array(9).fill(0), contrib = Array(9).fill(0);
  const events = [];
  const outcomes = shuffle([
    ...Array(perf.hr).fill("hr"),
    ...Array(perf.hits - perf.hr).fill("hit"),
    ...Array(perf.ab - perf.hits).fill("out"),
  ]);
  if (interactive) outcomes.pop(); // 마지막 타석은 유저가 직접
  const abInnsAll = [[], [3], [2, 5], [1, 4, 7], [1, 3, 6, 8], [1, 3, 5, 7, 8]];
  const abInns = abInnsAll[outcomes.length] || [1, 3, 6, 8];
  let sbLeft = perf.sb;
  outcomes.forEach((o, i) => {
    const inn = abInns[i];
    if (o === "hr") {
      const runs = randInt(1, 2);
      ourInn[inn - 1] += runs;
      contrib[inn - 1] += runs;
      events.push({ inn, half: "말", text: `${S.name}, ${pick(HR_TXT)}`, cls: "good" });
    } else if (o === "hit") {
      events.push({ inn, half: "말", text: `${S.name}, ${pick(HIT_TXT)}`, cls: "good" });
      if (sbLeft > 0) {
        sbLeft--;
        events.push({ inn, half: "말", text: "이어서 과감한 도루 성공! 👟", cls: "good" });
      }
    } else {
      events.push({ inn, half: "말", text: `${S.name}, ${pick(OUT_TXT)}`, cls: "" });
    }
  });
  perf.baseHits = outcomes.filter((o) => o !== "out").length;
  perf.baseHr = outcomes.filter((o) => o === "hr").length;
  const hrTotal = ourInn.reduce((a, b) => a + b, 0);

  if (interactive) {
    // 9회말 시작 시점에 정확히 1점 뒤진 접전으로 구성
    const ourTotal8 = Math.max(hrTotal, randInt(1, 4));
    addRuns(ourInn, ourTotal8 - hrTotal, 0, 7);
    addRuns(oppInn, ourTotal8 + 1, 0, 8);
    for (let i = 0; i < 9; i++) {
      if (oppInn[i] > 0) events.push({ inn: i + 1, half: "초", text: `상대가 ${oppInn[i]}점을 냈어요 😬`, cls: "bad" });
      if (i < 8) {
        const extra = ourInn[i] - contrib[i];
        if (extra > 0) events.push({ inn: i + 1, half: "말", text: `우리 타선이 ${extra}점을 뽑아냅니다! 🔥`, cls: "good" });
      }
    }
    return { ourInn, oppInn, events, moment: { half: "말" } };
  }

  const targetOur = win
    ? randInt(Math.max(3, hrTotal + 1), Math.max(6, hrTotal + 3))
    : hrTotal + randInt(0, 2);
  const targetOpp = win ? randInt(0, targetOur - 1) : targetOur + randInt(1, 3);
  addRuns(ourInn, targetOur - hrTotal);
  addRuns(oppInn, targetOpp);
  for (let i = 0; i < 9; i++) {
    if (oppInn[i] > 0) events.push({ inn: i + 1, half: "초", text: `상대가 ${oppInn[i]}점을 냈어요 😬`, cls: "bad" });
    const extra = ourInn[i] - contrib[i];
    if (extra > 0) events.push({ inn: i + 1, half: "말", text: `우리 타선이 ${extra}점을 뽑아냅니다! 🔥`, cls: "good" });
  }
  return { ourInn, oppInn, events };
}

// 투수: 내가 던진 이닝에 탈삼진/실점 배치. interactive면 9회초 위기를 유저가 막음
function pitcherStory(win, perf, interactive) {
  const ourInn = Array(9).fill(0), oppInn = Array(9).fill(0);
  const events = [];
  const ip = interactive ? Math.min(perf.ip, 8) : perf.ip;
  const myRuns = Array(ip).fill(0), myKs = Array(ip).fill(0);
  for (let i = 0; i < perf.runs; i++) myRuns[randInt(0, ip - 1)]++;
  for (let i = 0; i < perf.k; i++) myKs[randInt(0, ip - 1)]++;
  for (let i = 0; i < ip; i++) {
    oppInn[i] += myRuns[i];
    if (myRuns[i] > 0) events.push({ inn: i + 1, half: "초", text: `${S.name}, ${myRuns[i]}실점… 흔들립니다 😬`, cls: "bad" });
    else if (myKs[i] >= 2) events.push({ inn: i + 1, half: "초", text: `${S.name}, 탈삼진 ${myKs[i]}개 포함 무실점! 🔥`, cls: "good" });
    else if (Math.random() < 0.35) events.push({ inn: i + 1, half: "초", text: `${S.name}, 삼자범퇴 처리 🧊`, cls: "good" });
  }

  if (interactive) {
    // 9회초 시작 시점에 1점 앞선 리드, 마지막 위기를 유저가 직접 막음
    const oppTotal8 = oppInn.slice(0, 8).reduce((a, b) => a + b, 0);
    addRuns(ourInn, oppTotal8 + 1, 0, 7);
    for (let i = 0; i < 8; i++) {
      if (ourInn[i] > 0) events.push({ inn: i + 1, half: "말", text: `우리 타선이 ${ourInn[i]}점 지원! 🔥`, cls: "good" });
    }
    if (ip < 8) events.push({ inn: 8, half: "초", text: `불펜이 버텨준 사이, 9회를 앞두고 ${S.name}이(가) 다시 공을 쥡니다 🔥`, cls: "" });
    return { ourInn, oppInn, events, moment: { half: "초" } };
  }

  if (perf.ip < 9) {
    events.push({ inn: perf.ip, half: "초", text: `${perf.ip}이닝을 끝으로 마운드를 내려옵니다 👏`, cls: "" });
    const bullpen = win ? randInt(0, 1) : randInt(1, 2);
    for (let i = 0; i < bullpen; i++) oppInn[randInt(perf.ip, 8)]++;
    for (let i = perf.ip; i < 9; i++) {
      if (oppInn[i] > 0) events.push({ inn: i + 1, half: "초", text: `불펜이 ${oppInn[i]}점을 내줬어요 💦`, cls: "bad" });
    }
  }
  let oppTotal = oppInn.reduce((a, b) => a + b, 0);
  if (!win && oppTotal === 0) {
    oppInn[8]++;
    oppTotal++;
    events.push({ inn: 9, half: "초", text: "9회초 통한의 결승점을 내줬어요 💧", cls: "bad" });
  }
  const targetOur = win ? oppTotal + randInt(1, 4) : Math.max(0, oppTotal - randInt(1, 3));
  addRuns(ourInn, targetOur);
  for (let i = 0; i < 9; i++) {
    if (ourInn[i] > 0) events.push({ inn: i + 1, half: "말", text: `우리 타선이 ${ourInn[i]}점 지원! 🔥`, cls: "good" });
  }
  return { ourInn, oppInn, events };
}

let simTimer = null;
function renderGameSim(roundName, opp, perf, story, interactive, preWin) {
  const r = regionOf();
  $("tour-round").textContent = `${roundName} vs ${opp}`;
  const heads = Array.from({ length: 9 }, (_, i) => `<th>${i + 1}</th>`).join("");
  const cells = (side) => Array.from({ length: 9 }, (_, i) => `<td id="sb-${side}-${i}"></td>`).join("");
  $("tour-card").innerHTML = `
    <table class="scoreboard">
      <thead><tr><th></th>${heads}<th>R</th></tr></thead>
      <tbody>
        <tr><th>${opp.slice(0, 4)}</th>${cells("opp")}<td class="sb-r" id="sb-r-opp">0</td></tr>
        <tr><th>${r.school.slice(0, 4)}</th>${cells("our")}<td class="sb-r" id="sb-r-our">0</td></tr>
      </tbody>
    </table>
    <div class="pbp" id="pbp"></div>
    <div id="game-moment"></div>
    <div id="game-result"></div>`;

  const evFor = (inn, half) => story.events.filter((e) => e.inn === inn && e.half === half);
  const steps = [{ feeds: [{ text: `⚾ ${roundName} vs ${opp} — 플레이볼!` }] }];
  for (let i = 0; i < 9; i++) {
    if (interactive && story.moment.half === "초" && i === 8) { steps.push({ moment: true }); break; }
    steps.push({ cell: ["opp", i, story.oppInn[i]], feeds: evFor(i + 1, "초").map((e) => ({ text: `${i + 1}회초 · ${e.text}`, cls: e.cls })) });
    if (interactive && story.moment.half === "말" && i === 8) { steps.push({ moment: true }); break; }
    steps.push({ cell: ["our", i, story.ourInn[i]], feeds: evFor(i + 1, "말").map((e) => ({ text: `${i + 1}회말 · ${e.text}`, cls: e.cls })) });
  }
  if (!interactive) {
    const ourTotal = story.ourInn.reduce((a, b) => a + b, 0);
    const oppTotal = story.oppInn.reduce((a, b) => a + b, 0);
    steps.push({ feeds: [{ text: `📢 경기 종료 — ${ourTotal}:${oppTotal}`, cls: preWin ? "good" : "bad" }] });
  }

  const totals = { opp: 0, our: 0 };
  let idx = 0, finished = false, momentOn = false;

  function applyStep(s) {
    if (s.cell) {
      const [side, i, v] = s.cell;
      $(`sb-${side}-${i}`).textContent = v;
      totals[side] += v;
      $(`sb-r-${side}`).textContent = totals[side];
    }
    if (s.addR) {
      const [side, n] = s.addR;
      totals[side] += n;
      $(`sb-r-${side}`).textContent = totals[side];
    }
    for (const f of s.feeds || []) {
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("pbp").appendChild(div);
    }
    const pbp = $("pbp");
    pbp.scrollTop = pbp.scrollHeight;
  }

  function beginMoment() {
    momentOn = true;
    clearInterval(simTimer);
    const isBat = S.pos === "batter";
    applyStep({ feeds: [{ text: isBat
      ? `⚡ 9회말 2아웃, 1점 차 역전 찬스! ${S.name}의 타석!`
      : `⚡ 9회초 1점 차 리드, 2아웃 만루 위기! ${S.name}의 결정구!`, cls: "good" }] });
    const btn = $("btn-tour-next");
    btn.disabled = true;
    btn.textContent = "⚡ 운명의 순간!";
    const stat = isBat ? S.stats.contact : S.stats.control;
    window.Timing.play($("game-moment"), {
      label: isBat ? "⚾ 공이 온다! 초록 존에서 스윙!" : "🎯 결정구! 초록 존에서 릴리스!",
      button: isBat ? "스윙! 🏏" : "던진다! 🔥",
      zonePct: clamp(13 + stat * 0.24, 13, 38),
    }, resolveMoment);
  }

  function resolveMoment(res) {
    const isBat = S.pos === "batter";
    const flipWin = () => Math.random() < clamp(0.5 + (overall() - 50) / 250, 0.3, 0.7);
    let win;
    if (isBat) {
      if (res === "perfect") {
        win = true;
        applyStep({ cell: ["our", 8, 2], feeds: [{ text: `9회말 · ${S.name}, 끝내기 투런 홈런!!! 💥🎉`, cls: "good" }] });
        perf.baseHits += 1; perf.baseHr += 1;
        perf.highlight = "💥 운명의 타석에서 터진 끝내기 홈런! 전국구 스타 탄생!";
      } else if (res === "good") {
        win = flipWin();
        applyStep({ cell: ["our", 8, 1], feeds: [{ text: `9회말 · ${S.name}, 극적인 동점 적시타! ⚡`, cls: "good" }] });
        applyStep({ addR: [win ? "our" : "opp", 1], feeds: [{ text: win ? "🔥 연장 10회, 끝내기 승리!" : "💧 연장 접전 끝에 아쉬운 역전패…", cls: win ? "good" : "bad" }] });
        perf.baseHits += 1;
        perf.highlight = win ? "⚡ 동점 적시타로 경기를 살려냈어요!" : "⚡ 동점 적시타에도 아쉬운 연장 패배…";
      } else {
        win = false;
        applyStep({ cell: ["our", 8, 0], feeds: [{ text: `9회말 · ${S.name}, 헛스윙 삼진… 경기 종료 💧`, cls: "bad" }] });
        perf.highlight = "😢 운명의 타석에서 방망이가 헛돌았어요…";
      }
      perf.hits = perf.baseHits;
      perf.hr = perf.baseHr;
      perf.pts = perf.hits * 7 + perf.hr * 16 + perf.sb * 4 + Math.round(S.stats.defense / 25) + (perf.hits === 0 ? -9 : 0);
      perf.line = `${S.name}: ${perf.ab}타수 ${perf.hits}안타${perf.hr ? ` ${perf.hr}홈런` : ""}${perf.sb ? ` ${perf.sb}도루` : ""}`;
    } else {
      if (res === "perfect") {
        win = true;
        applyStep({ cell: ["opp", 8, 0], feeds: [{ text: `9회초 · ${S.name}, 마지막 타자를 삼진으로!! 경기 끝! 🧊🎉`, cls: "good" }] });
        perf.highlight = "🧊 만루 위기에서 삼진 마무리! 강심장 에이스!";
      } else if (res === "good") {
        win = flipWin();
        applyStep({ cell: ["opp", 8, 1], feeds: [{ text: "9회초 · 1실점으로 동점을 허용했지만 추가 실점은 막았어요", cls: "" }] });
        applyStep({ addR: [win ? "our" : "opp", 1], feeds: [{ text: win ? "🔥 연장 10회말, 우리 타선의 끝내기!" : "💧 연장 접전 끝에 아쉬운 패배…", cls: win ? "good" : "bad" }] });
        perf.runs += 1;
      } else {
        win = false;
        applyStep({ cell: ["opp", 8, 2], feeds: [{ text: "9회초 · 통한의 역전 2타점 안타를 맞았어요… 💧", cls: "bad" }] });
        perf.highlight = "😵 마지막 순간 결정구가 가운데로 몰렸어요…";
        perf.runs += 2;
      }
      if (!perf.highlight || res === "good") {
        perf.highlight = win ? "🔥 위기를 버텨 승리를 지켜냈어요!" : perf.highlight;
      }
      perf.pts = Math.max(perf.ip * 2 + perf.k * 2.5 - perf.runs * 2.5, -12);
      perf.line = `${S.name}: ${perf.ip}이닝 ${perf.k}탈삼진 ${perf.runs}실점`;
    }
    applyStep({ feeds: [{ text: `📢 경기 종료 — ${totals.our}:${totals.opp}`, cls: win ? "good" : "bad" }] });
    showResult(win, res === "perfect" ? 6 : 0);
  }

  function showResult(win, bonus) {
    if (finished) return;
    finished = true;
    clearInterval(simTimer);
    S.games += 1;
    let pts = perf.pts + (win ? 4 : 1) + tour.round * 3 + (bonus || 0);
    pts = Math.round(pts * r.spot);
    S.scout = Math.max(0, S.scout + pts); // 못한 경기는 주목도가 깎여요
    tour.totalPts += pts;
    S.condition = clamp(S.condition - 6, 0, 100);
    save();
    const btn = $("btn-tour-next");
    btn.disabled = false;
    $("game-result").innerHTML = `
      <div class="tour-vs">${r.school} <span class="${win ? "win" : "lose"}">${win ? "승리! 🎉" : "패배… 😢"}</span></div>
      <div class="tour-line">${perf.line}</div>
      ${perf.highlight ? `<div class="tour-line tour-highlight">${perf.highlight}</div>` : ""}
      <div class="tour-pts">${pts >= 0 ? `🔭 스카우트 주목도 +${pts}` : `📉 스카우트 주목도 ${pts}`}</div>`;
    if (win && tour.round < ROUNDS.length - 1) {
      tour.round += 1;
      btn.textContent = `${ROUNDS[tour.round]} 진출!`;
      btn.onclick = playTourGame;
    } else {
      tour.alive = false;
      const champion = win && tour.round === ROUNDS.length - 1;
      if (champion) {
        S.trophies.push(`${S.year}학년 ${tour.name} 우승`);
        S.scout += 30;
        tour.totalPts += 30;
      }
      btn.textContent = champion ? "🏆 우승 세리머니!" : "대회 마치기";
      btn.onclick = () => finishTournament(champion, roundName);
    }
  }

  simTimer = setInterval(() => {
    if (idx >= steps.length) { if (!interactive) showResult(preWin, 0); return; }
    const st = steps[idx++];
    if (st.moment) { beginMoment(); return; }
    applyStep(st);
  }, 550);
  $("btn-tour-next").textContent = "⏩ 빨리 감기";
  $("btn-tour-next").disabled = false;
  $("btn-tour-next").onclick = () => {
    if (momentOn || finished) return;
    clearInterval(simTimer);
    while (idx < steps.length) {
      const st = steps[idx++];
      if (st.moment) { beginMoment(); return; }
      applyStep(st);
    }
    if (!interactive) showResult(preWin, 0);
  };
}

function finishTournament(champion, lastRound) {
  if (champion) {
    addLog(`🏆 ${tour.name} 우승!! 전국이 ${S.name}을(를) 주목해요. (주목도 +${tour.totalPts})`);
  } else {
    addLog(`🏟️ ${tour.name} ${lastRound}에서 마무리. (주목도 +${tour.totalPts})`);
  }
  tour = null;
  show("screen-main");
  advanceMonth();
}

function batterLine() {
  const ab = randInt(3, 5);
  let hits = 0, hr = 0, sb = 0;
  for (let i = 0; i < ab; i++) {
    if (Math.random() < 0.04 + S.stats.contact / 150) {
      hits++;
      if (Math.random() < S.stats.power / 260) hr++;
    }
  }
  if (hits > 0 && Math.random() < S.stats.run / 250) sb++;
  const pts = hits * 7 + hr * 16 + sb * 4 + Math.round(S.stats.defense / 25) + (hits === 0 ? -9 : 0);
  const line = `${S.name}: ${ab}타수 ${hits}안타${hr ? ` ${hr}홈런` : ""}${sb ? ` ${sb}도루` : ""}`;
  let highlight = "";
  if (hr) highlight = "💥 담장을 넘기는 큼지막한 홈런! 관중석이 술렁여요.";
  else if (hits >= 3) highlight = "🔥 멀티히트를 넘어 맹타! 타격감이 뜨거워요.";
  else if (hits === 0 && Math.random() < 0.5) highlight = "😶 오늘은 방망이가 침묵했어요…";
  return { pts, line, highlight, ab, hits, hr, sb };
}

function pitcherLine() {
  const ip = clamp(3 + Math.floor(S.stats.stamina / 22) + randInt(-1, 1), 2, 8);
  const kRate = (S.stats.velocity + S.stats.breaking) / 2;
  const k = clamp(Math.round(ip * (0.4 + kRate / 90) + randInt(-1, 1)), 0, ip * 3);
  const runs = clamp(Math.round(ip * (0.9 - S.stats.control / 130) + randInt(-1, 1)), 0, 9);
  const pts = Math.max(ip * 2 + k * 2.5 - runs * 2.5, -12);
  const line = `${S.name}: ${ip}이닝 ${k}탈삼진 ${runs}실점`;
  let highlight = "";
  if (runs === 0 && ip >= 5) highlight = "🧊 압도적인 무실점 호투! 스카우트들이 수첩을 꺼내요.";
  else if (k >= ip * 1.5) highlight = "🔥 탈삼진 쇼! 상대 타자들이 방망이를 헛돌려요.";
  else if (runs >= 5) highlight = "😵 난타당한 하루… 다음을 기약해요.";
  return { pts, line, highlight, ip, k, runs };
}

// ---------- 드래프트 ----------
function showDraft() {
  const r = regionOf();
  const score = S.scout + overall() * 2;
  const team = pick(r.teams);

  let emoji, title, teamLine, msg;
  if (score >= 660) {
    emoji = "👑"; title = "1라운드 전체 상위 지명!";
    teamLine = `${team} 1라운드 지명`;
    msg = "전국이 주목한 최대어! 계약금이 역대급이라는 소문이 돌아요.";
  } else if (score >= 560) {
    emoji = "🌟"; title = "1라운드 지명!";
    teamLine = `${team} 1라운드 지명`;
    msg = "연고 구단이 1라운드에서 호명! 홈 팬들의 환호가 쏟아져요.";
  } else if (score >= 450) {
    emoji = "🎉"; title = "상위 라운드 지명!";
    teamLine = `${team} 2~4라운드 지명`;
    msg = "당당히 프로 유니폼을 입어요. 1군 데뷔가 머지않았어요.";
  } else if (score >= 360) {
    emoji = "🧢"; title = "중·하위 라운드 지명";
    teamLine = `${team} 5~10라운드 지명`;
    msg = "프로의 문을 통과! 여기서부터가 진짜 시작이에요.";
  } else if (score >= 300) {
    emoji = "🌱"; title = "육성선수 계약";
    teamLine = `${team} 육성선수 입단`;
    msg = "정식 지명은 아니지만 기회는 있어요. 흙 속의 진주가 되어봐요.";
  } else {
    emoji = "🎓"; title = "지명 소식이 없었어요…";
    teamLine = "대학 진학 후 재도전";
    msg = "아쉽지만 야구 인생은 길어요. 4년 뒤 대졸 드래프트를 노려봐요!";
  }

  const statLines = STAT_DEFS[S.pos]
    .map((d) => `${d.emoji} ${d.name} ${Math.round(S.stats[d.key])}`)
    .join(" · ");
  const trophyLine = S.trophies.length
    ? `🏆 ${S.trophies.join(", ")}`
    : "🏆 우승 경력 없음";

  $("draft-card").innerHTML = `
    ${S.avatar ? `<img class="draft-avatar" src="${S.avatar}" alt="" />` : ""}
    <div class="draft-emoji">${emoji}</div>
    <div class="draft-title">${title}</div>
    <div class="draft-team">${teamLine}</div>
    <div>${msg}</div>
    <div class="draft-summary">
      ${regionOf().emoji} ${r.school} · ${S.pos === "batter" ? "타자" : "투수"} ${S.name}<br/>
      ${statLines}<br/>
      🔭 최종 주목도 ${Math.round(S.scout)} · 대회 ${S.games}경기 출전<br/>
      ${trophyLine}
    </div>`;

  $("btn-share").onclick = () => {
    const text = `⚾ 더 루키 결과\n${r.school} ${S.name} — ${title}\n${teamLine}\n주목도 ${Math.round(S.scout)} / ${trophyLine}`;
    navigator.clipboard?.writeText(text).then(
      () => ($("btn-share").textContent = "✅ 복사 완료!"),
      () => ($("btn-share").textContent = "복사 실패 😢")
    );
  };
  $("btn-restart").onclick = () => {
    clearSave();
    location.reload();
  };

  if (window.Career) window.Career.onDraft(score, team);
  else clearSave();
  show("screen-draft");
}

// ---------- 시작 ----------
initTitle();
if (window.Avatar) window.Avatar.mount("avatar-slot");
