/* 더 유니콘 🦄 창업 방치 — 클릭으로 코딩 → 자동화 → 성장 → Exit 프레스티지 */
"use strict";

const SAVE_KEY = "unicorn-save-v1";
const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- 데이터 ----------
const GENERATORS = [
  { id: "caffeine", emoji: "☕", name: "카페인 풀가동",       base: 0.1,   cost: 15,     desc: "밤샘 코딩 모드" },
  { id: "junior",   emoji: "👨‍💻", name: "주니어 개발자",     base: 1,     cost: 100,    desc: "열정은 가득" },
  { id: "senior",   emoji: "🧑‍💻", name: "시니어 개발자",     base: 8,     cost: 1100,   desc: "버그를 예방해요" },
  { id: "bot",      emoji: "🤖", name: "자동 커밋봇",         base: 47,    cost: 12000,  desc: "24시간 커밋" },
  { id: "ci",       emoji: "🔁", name: "CI/CD 파이프라인",    base: 260,   cost: 130000, desc: "자동 빌드·배포" },
  { id: "server",   emoji: "☁️", name: "서버 오토스케일",     base: 1400,  cost: 1.4e6,  desc: "무한 확장" },
  { id: "offshore", emoji: "🌏", name: "글로벌 오프쇼어 팀",  base: 7800,  cost: 2e7,    desc: "24시간 릴레이 개발" },
  { id: "ai",       emoji: "🧠", name: "AI 에이전트 군단",    base: 44000, cost: 3.3e8,  desc: "자율 개발·자율 배포" },
];

const UPGRADES = [
  { id: "kb1",        emoji: "⌨️", name: "기계식 키보드",        cost: 500,   type: "click",  mult: 2, desc: "클릭 파워 ×2" },
  { id: "coffee",     emoji: "☕", name: "에스프레소 머신",      cost: 5000,  type: "global", mult: 2, desc: "전체 생산 ×2" },
  { id: "framework",  emoji: "🧩", name: "최신 프레임워크 도입", cost: 6e4,   type: "global", mult: 2, desc: "전체 생산 ×2" },
  { id: "kb2",        emoji: "⌨️", name: "적축 커스텀 키보드",   cost: 3e5,   type: "click",  mult: 3, desc: "클릭 파워 ×3" },
  { id: "cloud",      emoji: "💳", name: "클라우드 크레딧 대량", cost: 3e6,   type: "global", mult: 2, desc: "전체 생산 ×2" },
  { id: "opensource", emoji: "⭐", name: "오픈소스 스타 떡상",   cost: 4e7,   type: "global", mult: 3, desc: "전체 생산 ×3" },
];

const STAGES = [
  { v: 0,    emoji: "🌱", name: "부트스트랩" },
  { v: 1e4,  emoji: "🌿", name: "프리시드" },
  { v: 1e6,  emoji: "🌾", name: "시드 투자" },
  { v: 1e8,  emoji: "📈", name: "시리즈 A" },
  { v: 1e10, emoji: "🚀", name: "시리즈 B" },
  { v: 1e12, emoji: "💫", name: "시리즈 C" },
  { v: 1e13, emoji: "🦄", name: "유니콘" },
  { v: 1e15, emoji: "👑", name: "데카콘" },
];
const EXIT_UNLOCK = 1e8; // 시리즈 A부터 Exit 가능

const BOOST_DUR = 60000;   // 부스터 지속 60초
const BOOST_CD = 300000;   // 쿨다운 5분

const COMPANY_NAMES = ["토스트", "당근파이", "쿠키페이", "배달의민속", "네이비어", "카카옹", "라인프렌드", "우아한형아들", "비바리버블릭", "센드버그"];
const MEMES = [
  "🚀 금요일 오후 배포 강행 — 그런데 대박이 났어요!",
  "🍜 '일단 머지'가 통했어요!",
  "🔥 스택오버플로우 복붙이 완벽 동작!",
  "☕ 커피 3샷으로 무한 집중 모드!",
  "🐛 전설의 버그를 한 방에 잡았어요!",
  "📈 인플루언서가 우리 서비스를 소개했어요!",
  "🧠 AI가 스스로 리팩터링을 끝냈어요!",
];

// ---------- 상태 ----------
let S = null;
function fresh() {
  return {
    company: pick(COMPANY_NAMES),
    code: 0,             // 보유 코드(줄)
    gens: {}, ups: {},
    so: 0, exits: 0,
    earnedRun: 0, earnedAll: 0,
    buffUntil: 0, boostCdUntil: 0,
    savedAt: Date.now(),
    log: [],
  };
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.code === "number") {
      S = s; S.gens = S.gens || {}; S.ups = S.ups || {}; S.log = S.log || [];
      S.boostCdUntil = S.boostCdUntil || 0;
      return true;
    }
  } catch { /* noop */ }
  return false;
}
function save() { S.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }

// ---------- 계산 ----------
const clickMult = () => UPGRADES.filter((u) => u.type === "click" && S.ups[u.id]).reduce((m, u) => m * u.mult, 1);
const globalMult = () => UPGRADES.filter((u) => u.type === "global" && S.ups[u.id]).reduce((m, u) => m * u.mult, 1);
const prestigeMult = () => 1 + S.so * 0.04;
const buffMult = () => (Date.now() < S.buffUntil ? 2 : 1);
const baseSec = () => GENERATORS.reduce((s, g) => s + (S.gens[g.id] || 0) * g.base, 0);
const perSec = () => baseSec() * globalMult() * prestigeMult() * buffMult();
const clickValue = () => Math.max(1, 1 * clickMult()) * globalMult() * prestigeMult() * buffMult();
const genCost = (g) => Math.ceil(g.cost * Math.pow(1.15, S.gens[g.id] || 0));
const valuation = () => S.earnedRun;
const stageOf = (v) => { let st = STAGES[0]; for (const s of STAGES) if (v >= s.v) st = s; return st; };
const nextStage = (v) => STAGES.find((s) => s.v > v) || null;
const exitSO = () => Math.floor(Math.sqrt(S.earnedRun / 1e6));

// ---------- 숫자 포맷 (한글 단위) ----------
const UNITS = ["", "만", "억", "조", "경", "해", "자", "양", "구", "간"];
function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString();
  let t = 0, x = n;
  while (x >= 10000 && t < UNITS.length - 1) { x /= 10000; t++; }
  const s = x >= 100 ? String(Math.round(x)) : x.toFixed(2).replace(/\.?0+$/, "");
  return s + UNITS[t];
}
const lines = (n) => fmt(n) + "줄";
const mmss = (ms) => { const t = Math.ceil(ms / 1000); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };

// ---------- 로그 ----------
function addLog(msg) { S.log.unshift(msg); S.log = S.log.slice(0, 20); }
function renderLog() { $("ev-log").innerHTML = S.log.map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`).join(""); }

// ---------- 클릭 ----------
function onClick(e) {
  const v = clickValue();
  S.code += v; S.earnedRun += v; S.earnedAll += v;
  floatText(e, "+" + fmt(v));
}
function floatText(e, txt) {
  const c = $("clicker");
  const f = document.createElement("span");
  f.className = "float-num";
  f.textContent = txt;
  const r = c.getBoundingClientRect();
  f.style.left = ((e && e.clientX ? e.clientX - r.left : r.width / 2) + (Math.random() * 30 - 15)) + "px";
  f.style.top = (e && e.clientY ? e.clientY - r.top : r.height / 2) + "px";
  c.appendChild(f);
  setTimeout(() => f.remove(), 900);
}

// ---------- 구매 ----------
function buyGen(g) {
  const cost = genCost(g);
  if (S.code < cost) return;
  S.code -= cost;
  S.gens[g.id] = (S.gens[g.id] || 0) + 1;
  save(); renderAll();
}
function buyUp(u) {
  if (S.ups[u.id] || S.code < u.cost) return;
  S.code -= u.cost;
  S.ups[u.id] = 1;
  addLog(`${u.emoji} ${u.name} 도입! (${u.desc})`);
  save(); renderAll();
}

// ---------- 집중 부스터 (2배 · 5분 쿨다운 · 추후 보상형 광고) ----------
function useBoost() {
  const now = Date.now();
  if (now < S.buffUntil || now < S.boostCdUntil) return;
  const grant = () => {
    const t = Date.now();
    S.buffUntil = t + BOOST_DUR;
    S.boostCdUntil = t + BOOST_CD;
    addLog(pick(MEMES) + " (60초간 생산 2배!)");
    save(); renderAll();
  };
  if (window.Ads && window.Ads.rewarded) window.Ads.rewarded((ok) => { if (ok) grant(); });
  else grant();
}

// ---------- Exit (프레스티지) ----------
function doExit() {
  if (valuation() < EXIT_UNLOCK) return;
  const gain = exitSO();
  if (gain < 1) return;
  const label = stageOf(valuation()).name;
  if (!confirm(
    `🚀 Exit — ${label} 단계에서 회사를 매각/상장할까요?\n\n` +
    `· 스톡옵션 +${gain} 획득 (영구 생산 배수 +${gain * 4}%p)\n` +
    `· 코드·직원·업그레이드는 초기화되고, 더 빠르게 다시 시작해요\n\n진행할까요?`
  )) return;
  S.so += gain;
  S.exits += 1;
  S.code = 0; S.gens = {}; S.ups = {}; S.earnedRun = 0;
  S.buffUntil = 0;
  addLog(`🚀 Exit 성공! 스톡옵션 +${gain} (통산 ${S.exits}회, 누적 SO ${S.so})`);
  save(); renderAll();
  alert(`🎉 Exit 완료!\n\n스톡옵션 ${gain}개를 챙기고 새 창업을 시작합니다.\n이제 생산 배수 ×${prestigeMult().toFixed(2)}!`);
}

// ---------- 렌더 ----------
function renderHud() {
  const now = Date.now();
  const v = valuation(), st = stageOf(v), ns = nextStage(v);
  $("hud-code").textContent = "💾 " + lines(S.code);
  $("hud-sec").textContent = lines(perSec()) + "/초";
  $("hud-so").textContent = "🧾 스톡옵션 " + S.so + " (×" + prestigeMult().toFixed(2) + ")";
  $("stage-name").textContent = `${st.emoji} ${st.name}`;
  $("stage-val").textContent = "누적 " + lines(v);
  const bar = $("stage-bar");
  if (ns) {
    const pct = Math.max(0, Math.min(100, ((v - st.v) / (ns.v - st.v)) * 100));
    bar.style.width = pct + "%";
    $("stage-next").textContent = `다음: ${ns.emoji} ${ns.name} (${lines(ns.v)})`;
  } else {
    bar.style.width = "100%";
    $("stage-next").textContent = "🏆 최종 단계 도달!";
  }
  $("buff-tag").classList.toggle("hidden", now >= S.buffUntil);

  // 부스터 버튼
  const bb = $("btn-boost");
  if (now < S.buffUntil) { bb.disabled = true; bb.textContent = `🔥 부스터 발동 중! (${Math.ceil((S.buffUntil - now) / 1000)}초)`; }
  else if (now < S.boostCdUntil) { bb.disabled = true; bb.textContent = `🔥 부스터 (${mmss(S.boostCdUntil - now)} 후)`; }
  else { bb.disabled = false; bb.textContent = "🔥 집중 부스터 — 60초간 2배"; }

  // Exit 버튼
  const exitBtn = $("btn-exit");
  if (v >= EXIT_UNLOCK) { exitBtn.disabled = false; exitBtn.innerHTML = `🚀 Exit (매각/IPO) — 스톡옵션 +${exitSO()}`; }
  else { exitBtn.disabled = true; exitBtn.innerHTML = `🔒 Exit — 시리즈 A(${lines(EXIT_UNLOCK)})부터`; }
}

function renderGens() {
  const box = $("gen-list");
  box.innerHTML = GENERATORS.map((g) => {
    const cnt = S.gens[g.id] || 0;
    const cost = genCost(g);
    const can = S.code >= cost;
    const out = cnt * g.base * globalMult() * prestigeMult();
    return `
      <button class="gen ${can ? "" : "no"}" data-gen="${g.id}">
        <span class="gen-emoji">${g.emoji}</span>
        <span class="gen-info">
          <b>${g.name} ${cnt ? `<i>×${cnt}</i>` : ""}</b>
          <span class="gen-desc">${cnt ? `${lines(out)}/초` : g.desc}</span>
        </span>
        <span class="gen-cost">${lines(cost)}</span>
      </button>`;
  }).join("");
  box.querySelectorAll(".gen").forEach((b) => { b.onclick = () => buyGen(GENERATORS.find((g) => g.id === b.dataset.gen)); });
}

function renderUps() {
  const box = $("up-list");
  const avail = UPGRADES.filter((u) => !S.ups[u.id]);
  if (!avail.length) { box.innerHTML = `<p class="hint">모든 업그레이드를 도입했어요 ✨</p>`; return; }
  box.innerHTML = avail.map((u) => {
    const can = S.code >= u.cost;
    return `
      <button class="up ${can ? "" : "no"}" data-up="${u.id}">
        <span class="up-emoji">${u.emoji}</span>
        <span class="up-info"><b>${u.name}</b><span>${u.desc}</span></span>
        <span class="up-cost">${lines(u.cost)}</span>
      </button>`;
  }).join("");
  box.querySelectorAll(".up").forEach((b) => { b.onclick = () => buyUp(UPGRADES.find((u) => u.id === b.dataset.up)); });
}

function renderAll() {
  $("company-name").textContent = "🦄 " + S.company;
  renderHud();
  renderGens();
  renderUps();
  renderLog();
}

// ---------- 탭 ----------
function setTab(tab) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("panel-gen").classList.toggle("hidden", tab !== "gen");
  $("panel-up").classList.toggle("hidden", tab !== "up");
}

// ---------- 루프 ----------
let lastTick = Date.now(), lastListRender = 0;
function tick() {
  const now = Date.now();
  const dt = Math.min((now - lastTick) / 1000, 1);
  lastTick = now;
  const gain = perSec() * dt;
  if (gain > 0) { S.code += gain; S.earnedRun += gain; S.earnedAll += gain; }
  renderHud();
  if (now - lastListRender > 500) { renderGens(); renderUps(); renderLog(); lastListRender = now; }
}

// ---------- 오프라인 보상 ----------
function offlineReward() {
  const elapsed = Math.min((Date.now() - (S.savedAt || Date.now())) / 1000, 8 * 3600);
  if (elapsed < 60) return;
  const earn = perSec() * elapsed * 0.5;
  if (earn < 1) return;
  S.code += earn; S.earnedRun += earn; S.earnedAll += earn;
  const mins = Math.round(elapsed / 60);
  addLog(`💤 자리를 비운 ${mins}분 동안 ${lines(earn)}의 코드를 뽑았어요! (오프라인 50%)`);
  setTimeout(() => alert(`💤 자동 개발 완료!\n\n자리를 비운 ${mins}분 동안\n${lines(earn)}의 코드를 뽑아뒀어요. (오프라인 50% 효율)`), 300);
}

// ---------- 초기화 ----------
function init() {
  if (!load()) { S = fresh(); save(); }
  offlineReward();
  renderAll();
  setTab("gen");
  $("clicker").addEventListener("click", onClick);
  $("btn-boost").addEventListener("click", useBoost);
  $("btn-exit").addEventListener("click", doExit);
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("btn-reset").addEventListener("click", () => {
    if (confirm("정말 처음부터 다시 시작할까요? 모든 진행(스톡옵션 포함)이 사라져요!")) {
      localStorage.removeItem(SAVE_KEY); location.reload();
    }
  });
  lastTick = Date.now();
  setInterval(tick, 100);
  setInterval(save, 5000);
  window.addEventListener("beforeunload", save);
}
init();
