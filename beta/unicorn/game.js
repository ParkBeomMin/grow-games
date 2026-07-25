/* 더 유니콘 🦄 창업 방치 — 클릭으로 코딩 → 장비·자동화로 성장 → Exit 프레스티지
 * 장비(반복): 클릭당 코드 +N   /   자동화(반복): 초당 코드 +N   — 둘 다 가산식, 배수 아님 */
"use strict";

const SAVE_KEY = "unicorn-save-v1";
const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- 데이터 ----------
// 자동화 — 반복 구매, 개당 '초당 +per줄' 패시브. 비용은 1.15^보유수로 상승.
const GENERATORS = [
  { id: "americano", emoji: "☕",  name: "아메리카노",         per: 1,    cost: 20 },
  { id: "energy",    emoji: "⚡",  name: "에너지 드링크",      per: 2,    cost: 60 },
  { id: "book",      emoji: "📖",  name: "개발서적 정독",      per: 3,    cost: 150 },
  { id: "stack",     emoji: "🧱",  name: "스택오버플로우",     per: 6,    cost: 400 },
  { id: "ai",        emoji: "🧠",  name: "AI 활용능력 향상",   per: 10,   cost: 1000 },
  { id: "youtube",   emoji: "📺",  name: "유튜브 코딩 채널",   per: 20,   cost: 2200 },
  { id: "copilot",   emoji: "🤖",  name: "깃허브 코파일럿",    per: 30,   cost: 3500 },
  { id: "conf",      emoji: "🎫",  name: "테크 컨퍼런스",      per: 60,   cost: 8000 },
  { id: "remote",    emoji: "🏠",  name: "재택근무",           per: 100,  cost: 15000 },
  { id: "offshore",  emoji: "🌏",  name: "글로벌 오프쇼어 팀", per: 320,  cost: 5e4 },
  { id: "agent",     emoji: "🛰️", name: "AI 에이전트 군단",   per: 1200, cost: 3e5 },
];

// 장비 — 반복 구매, 개당 '클릭당 +per줄'. 비용은 1.15^보유수로 상승.
const EQUIP = [
  { id: "kb",     emoji: "⌨️",  name: "기계식 키보드",         per: 1,   cost: 10 },
  { id: "chair",  emoji: "🪑",  name: "허먼밀러 체어",         per: 2,   cost: 100 },
  { id: "glass",  emoji: "👓",  name: "블루라이트 차단 안경",  per: 3,   cost: 250 },
  { id: "mouse",  emoji: "🖱️", name: "로지텍 마우스",         per: 5,   cost: 500 },
  { id: "wrist",  emoji: "💺",  name: "손목 받침대",           per: 8,   cost: 900 },
  { id: "lube",   emoji: "💧",  name: "기계식 스위치 윤활",    per: 12,  cost: 1500 },
  { id: "dual",   emoji: "🖥️", name: "듀얼 모니터",           per: 35,  cost: 5000 },
  { id: "rgb",    emoji: "🌈",  name: "RGB 게이밍 감성",       per: 80,  cost: 12000 },
  { id: "keycap", emoji: "🔲",  name: "무각 키캡",             per: 150, cost: 25000 },
  { id: "sitstand", emoji: "🧍", name: "스탠딩 데스크",        per: 400, cost: 8e4 },
  { id: "vim",    emoji: "🧙",  name: "Vim 마스터",            per: 1000, cost: 5e5 },
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
    gens: {}, equip: {}, // 자동화 보유수 / 장비 보유수
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
      S = s; S.gens = S.gens || {}; S.equip = S.equip || {}; S.log = S.log || [];
      S.boostCdUntil = S.boostCdUntil || 0;
      return true;
    }
  } catch { /* noop */ }
  return false;
}
function save() { S.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }

// ---------- 계산 ----------
const prestigeMult = () => 1 + S.so * 0.04;
const buffMult = () => (Date.now() < S.buffUntil ? 2 : 1);
const baseSec = () => GENERATORS.reduce((s, g) => s + (S.gens[g.id] || 0) * g.per, 0);
const perSec = () => baseSec() * prestigeMult() * buffMult();
// 클릭당 코드 = (기본 1 + 장비 보너스 합) × 프레스티지·부스터 배수
const clickBase = () => 1 + EQUIP.reduce((s, e) => s + (S.equip[e.id] || 0) * e.per, 0);
const clickValue = () => clickBase() * prestigeMult() * buffMult();
const genCost = (g) => Math.ceil(g.cost * Math.pow(1.15, S.gens[g.id] || 0));
const equipCost = (e) => Math.ceil(e.cost * Math.pow(1.15, S.equip[e.id] || 0));
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
// 생산 속도용 — 100 미만 소수도 '0.1줄'처럼 보이게 (내림 때문에 0으로 보이지 않게)
function rate(n) {
  if (n <= 0) return "0";
  if (n < 100) { const r = Math.round(n * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); }
  return fmt(n);
}
const linesRate = (n) => rate(n) + "줄";
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
function buyEquip(e) {
  const cost = equipCost(e);
  if (S.code < cost) return;
  S.code -= cost;
  S.equip[e.id] = (S.equip[e.id] || 0) + 1;
  save(); renderAll();
}

// ---------- AI 리팩토링 부스터 (2배 · 5분 쿨다운 · 추후 보상형 광고) ----------
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
    `· 코드·장비·자동화는 초기화되고, 더 빠르게 다시 시작해요\n\n진행할까요?`
  )) return;
  S.so += gain;
  S.exits += 1;
  S.code = 0; S.gens = {}; S.equip = {}; S.earnedRun = 0;
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
  $("hud-sec").textContent = linesRate(perSec()) + "/초";
  $("hud-so").textContent = "🧾 스톡옵션 " + S.so + " (×" + prestigeMult().toFixed(2) + ")";
  $("clicker-label").textContent = `눌러서 코딩! 💾 +${fmt(clickValue())}줄`;
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

  // AI 리팩토링(부스터) 버튼
  const bb = $("btn-boost");
  if (now < S.buffUntil) { bb.disabled = true; bb.textContent = `🔥 리팩토링 발동 중! (${Math.ceil((S.buffUntil - now) / 1000)}초)`; }
  else if (now < S.boostCdUntil) { bb.disabled = true; bb.textContent = `🔥 AI 리팩토링 (${mmss(S.boostCdUntil - now)} 후)`; }
  else { bb.disabled = false; bb.textContent = "🔥 AI 리팩토링 (×2) — 60초간 생산 2배"; }

  // Exit 버튼
  const exitBtn = $("btn-exit");
  if (v >= EXIT_UNLOCK) { exitBtn.disabled = false; exitBtn.innerHTML = `🚀 Exit (매각/IPO) — 스톡옵션 +${exitSO()}`; }
  else { exitBtn.disabled = true; exitBtn.innerHTML = `🔒 Exit — 시리즈 A(${lines(EXIT_UNLOCK)})부터`; }
}

// 장비·자동화 공통 아이템 렌더 (subtitle 단위만 다름)
function itemHTML(item, cnt, cost, can, unit) {
  return `
    <button class="gen ${can ? "" : "no"}" data-id="${item.id}">
      <span class="gen-emoji">${item.emoji}</span>
      <span class="gen-info">
        <b>${item.name}</b>
        <span class="gen-desc">${unit} +${fmt(item.per)}줄</span>
      </span>
      <span class="gen-right">
        <span class="gen-lv">Lv.${cnt}</span>
        <span class="gen-cost">${lines(cost)}</span>
      </span>
    </button>`;
}
function renderGens() {
  const box = $("gen-list");
  box.innerHTML = GENERATORS.map((g) => {
    const cnt = S.gens[g.id] || 0, cost = genCost(g);
    return itemHTML(g, cnt, cost, S.code >= cost, "초당");
  }).join("");
  box.querySelectorAll(".gen").forEach((b) => { b.onclick = () => buyGen(GENERATORS.find((g) => g.id === b.dataset.id)); });
}
function renderEquip() {
  const box = $("equip-list");
  box.innerHTML = EQUIP.map((e) => {
    const cnt = S.equip[e.id] || 0, cost = equipCost(e);
    return itemHTML(e, cnt, cost, S.code >= cost, "클릭당");
  }).join("");
  box.querySelectorAll(".gen").forEach((b) => { b.onclick = () => buyEquip(EQUIP.find((e) => e.id === b.dataset.id)); });
}

function renderAll() {
  $("company-name").textContent = "🦄 " + S.company;
  renderHud();
  renderEquip();
  renderGens();
  renderLog();
}

// ---------- 탭 ----------
function setTab(tab) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("panel-equip").classList.toggle("hidden", tab !== "equip");
  $("panel-gen").classList.toggle("hidden", tab !== "gen");
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
  if (now - lastListRender > 500) { renderEquip(); renderGens(); renderLog(); lastListRender = now; }
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
  setTab("equip");
  // click 대신 pointerdown — 빠른 연타에서 누락 없이 즉시 반응 (마우스·터치 모두 커버)
  $("clicker").addEventListener("pointerdown", (e) => { e.preventDefault(); onClick(e); });
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
