/* 더 유니콘 🦄 창업 방치 — 클릭으로 코딩 → 개발력·조직으로 성장 → Exit 프레스티지
 * 개발력(반복): 클릭당 코드 +N   /   조직(반복): 초당 코드 +N   — 둘 다 가산식, 배수 아님 */
"use strict";

const SAVE_KEY = "unicorn-save-v1";
const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- 데이터 ----------
// 조직 — 반복 채용/구축, 개당 '초당 +per줄' 패시브. 비용은 1.15^보유수로 상승.
const GENERATORS = [
  { id: "americano", emoji: "👨‍💻", name: "열정 인턴",          per: 1,    cost: 25 },
  { id: "energy",    emoji: "🧑‍💻", name: "주니어 개발자",      per: 4,    cost: 120 },
  { id: "book",      emoji: "👩‍💻", name: "시니어 개발자",      per: 9,    cost: 350 },
  { id: "stack",     emoji: "🧠",  name: "테크리드",           per: 18,   cost: 900 },
  { id: "ai",        emoji: "🤖",  name: "자동 커밋봇",         per: 40,   cost: 2600 },
  { id: "youtube",   emoji: "🔁",  name: "CI/CD 파이프라인",    per: 90,   cost: 7500 },
  { id: "copilot",   emoji: "☁️",  name: "오토스케일 서버",     per: 200,  cost: 22000 },
  { id: "conf",      emoji: "🌏",  name: "오프쇼어 팀",         per: 450,  cost: 75000 },
  { id: "remote",    emoji: "🏢",  name: "판교 사옥",           per: 1000, cost: 2.6e5 },
  { id: "offshore",  emoji: "🦾",  name: "AI 코딩 에이전트",    per: 2400, cost: 1.5e6 },
  { id: "agent",     emoji: "🛰️", name: "자율 개발 군단",      per: 6000, cost: 1e7 },
  // req = 해금에 필요한 Exit 횟수 (회차를 거듭할수록 새 조직이 열려요)
  { id: "angel",     emoji: "😇",  name: "엔젤 투자자",         per: 15000,  cost: 6e7, req: 1 },
  { id: "ipo",       emoji: "🔔",  name: "IPO 준비팀",          per: 40000,  cost: 4e8, req: 2 },
  { id: "quantum",   emoji: "🌌",  name: "양자컴 클러스터",     per: 100000, cost: 3e9, req: 3 },
];

// 개발력 — 반복 투자, 개당 '클릭당 +per줄' (내 코딩 셋업·스킬). 비용은 1.15^보유수로 상승.
const EQUIP = [
  { id: "kb",       emoji: "⌨️",  name: "텐키리스 키보드",       per: 1,    cost: 15 },
  { id: "chair",    emoji: "🪑",  name: "인체공학 의자",         per: 3,    cost: 120 },
  { id: "glass",    emoji: "🎧",  name: "집중용 헤드셋",         per: 7,    cost: 400 },
  { id: "mouse",    emoji: "🖱️", name: "게이밍 마우스",         per: 15,   cost: 1200 },
  { id: "wrist",    emoji: "💪",  name: "손목 보호대",           per: 30,   cost: 3200 },
  { id: "lube",     emoji: "⌨️",  name: "무접점 커스텀 키보드",  per: 60,   cost: 9000 },
  { id: "dual",     emoji: "🖥️", name: "울트라와이드 모니터",   per: 140,  cost: 32000 },
  { id: "rgb",      emoji: "🌙",  name: "새벽 감성 코딩",        per: 300,  cost: 1.2e5 },
  { id: "keycap",   emoji: "🧘",  name: "몰입 모드(Flow)",       per: 700,  cost: 6e5 },
  { id: "sitstand", emoji: "⚡",  name: "단축키 장인",           per: 1800, cost: 3.2e6 },
  { id: "vim",      emoji: "🪄",  name: "정규식 흑마법",         per: 5000, cost: 2e7 },
  // req = 해금에 필요한 Exit 횟수
  { id: "pair",     emoji: "👥",  name: "AI 페어 프로그래머",    per: 12000, cost: 1.2e8, req: 1 },
  { id: "neural",   emoji: "🧬",  name: "뇌-키보드 인터페이스",  per: 30000, cost: 8e8,   req: 2 },
  { id: "timestop", emoji: "⏳",  name: "시간 정지 디버깅",      per: 80000, cost: 6e9,   req: 3 },
];

const STAGES = [
  { v: 0,    emoji: "🌱", name: "부트스트랩" },
  { v: 5e3,  emoji: "🌿", name: "프리시드" },
  { v: 3e5,  emoji: "🌾", name: "시드 투자" },
  { v: 1e7,  emoji: "📈", name: "시리즈 A" },
  { v: 3e8,  emoji: "🚀", name: "시리즈 B" },
  { v: 1e10, emoji: "💫", name: "시리즈 C" },
  { v: 1e11, emoji: "🦄", name: "유니콘" },
  { v: 1e13, emoji: "👑", name: "데카콘" },
];
const EXIT_UNLOCK = 1e7;      // 시리즈 A부터 Exit 가능
const FINAL_STAGE = 1e13;     // 데카콘 = 엔딩 트리거

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

// 클릭할 때 터미널에 찍히는 코드 라인들 (우리 개그 라인)
const CODE_LINES = [
  "git commit -m '일단 커밋'",
  "npm run build",
  "const idea = new Startup();",
  "deploy --prod --yolo",
  "fix: 새벽 3시의 그 버그",
  "console.log('여기까진 됨');",
  "useEffect(() => grow(), []);",
  "SELECT * FROM users;",
  "docker compose up -d",
  "refactor: 함수 이름 또 바꿈",
  "test: 통과했다 치자",
  "merge main ← feature/유니콘",
  "try { ship(); } catch (e) {}",
  "chore: 의존성 42개 업데이트",
  "perf: 렌더링 3배 빨라짐",
  "feat: 결제 붙임",
  "hotfix: 결제 다시 붙임",
  "TODO: 나중에 고치자",
  "rm -rf node_modules && npm i",
  "if (버그) { 버그 = false; }",
  "// 이 코드는 건드리지 마세요",
  "git push --force (미안)",
];
const BOOT_LINES = ["시스템 초기화 완료.", "코딩 시작 준비 끝."];
const TERM_MAX = 9; // 터미널에 남겨둘 줄 수

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
    startedAt: Date.now(), endedAt: 0, playMs: 0,
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
      S.startedAt = S.startedAt || Date.now();
      S.endedAt = S.endedAt || 0;
      S.playMs = S.playMs || 0;
      return true;
    }
  } catch { /* noop */ }
  return false;
}
function save() {
  const now = Date.now();
  // 플레이 타임 누적 (sessionStart는 init에서 잡아요)
  if (S.sessionStart) { S.playMs = (S.playMs || 0) + (now - S.sessionStart); S.sessionStart = now; }
  S.savedAt = now;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {}
}

// ---------- 계산 ----------
const prestigeMult = () => 1 + S.so * 0.10;
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
// 첫 Exit(시리즈 A)에서 SO 10 = 생산 ×2.0 — 리셋이 확실히 이득이 되게
const exitSO = () => Math.floor(10 * Math.sqrt(S.earnedRun / EXIT_UNLOCK));
// 해금 여부 — req가 없으면 처음부터, 있으면 Exit 횟수 충족 시
const unlocked = (it) => !it.req || S.exits >= it.req;

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

// ---------- 터미널 출력 ----------
let lastLineIdx = -1;
function termPush(text, boot) {
  const body = $("term-body");
  if (!body) return;
  const el = document.createElement("span");
  el.className = "term-line" + (boot ? " boot" : "");
  const p = document.createElement("span");
  p.className = "p"; p.textContent = ">";
  el.append(p, " " + text);
  body.appendChild(el);
  while (body.childElementCount > TERM_MAX) body.removeChild(body.firstElementChild);
}
function termBoot() { BOOT_LINES.forEach((l) => termPush(l, true)); }
function termCode() {
  let i = Math.floor(Math.random() * CODE_LINES.length);
  if (i === lastLineIdx) i = (i + 1) % CODE_LINES.length; // 같은 줄 연속 방지
  lastLineIdx = i;
  termPush(CODE_LINES[i], false);
}

// ---------- 클릭 ----------
function onClick(e) {
  const v = clickValue();
  S.code += v; S.earnedRun += v; S.earnedAll += v;
  termCode();
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
  if (!unlocked(g) || S.code < cost) return;
  S.code -= cost;
  S.gens[g.id] = (S.gens[g.id] || 0) + 1;
  save(); renderAll();
}
function buyEquip(e) {
  const cost = equipCost(e);
  if (!unlocked(e) || S.code < cost) return;
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
  const nextExits = S.exits + 1;
  const opening = [...GENERATORS, ...EQUIP].filter((it) => it.req === nextExits);
  const unlockMsg = opening.length
    ? `· 🔓 새로 열려요: ${opening.map((o) => o.name).join(", ")}\n`
    : "";
  if (!confirm(
    `🚀 Exit — ${label} 단계에서 회사를 매각/상장할까요?\n\n` +
    `· 스톡옵션 +${gain} 획득 (영구 생산 배수 ×${(1 + (S.so + gain) * 0.1).toFixed(2)})\n` +
    unlockMsg +
    `· 코드·조직·개발력은 초기화되고, 더 빠르게 다시 시작해요\n\n진행할까요?`
  )) return;
  S.so += gain;
  S.exits += 1;
  S.code = 0; S.gens = {}; S.equip = {}; S.earnedRun = 0;
  S.buffUntil = 0;
  addLog(`🚀 Exit 성공! 스톡옵션 +${gain} (통산 ${S.exits}회, 누적 SO ${S.so})`);
  if (opening.length) addLog(`🔓 ${opening.map((o) => o.name).join(", ")} 해금!`);
  save(); renderAll();
  alert(
    `🎉 Exit 완료!\n\n스톡옵션 ${gain}개를 챙기고 새 창업을 시작합니다.\n이제 생산 배수 ×${prestigeMult().toFixed(2)}!` +
    (opening.length ? `\n\n🔓 해금: ${opening.map((o) => o.name).join(", ")}` : "")
  );
}

// ---------- 엔딩 (데카콘 도달) ----------
function playTime() { return S.playMs + (Date.now() - (S.sessionStart || Date.now())); }
function hhmm(ms) {
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60);
  return (d ? `${d}일 ` : "") + (d || h ? `${h}시간 ` : "") + `${m}분`;
}
function checkEnding() {
  if (S.endedAt || valuation() < FINAL_STAGE) return;
  S.endedAt = Date.now();
  addLog("👑 데카콘 등극! 시장을 지배하는 회사가 되었어요.");
  save();
  showEnding();
}
function showEnding() {
  $("end-company").textContent = "🦄 " + S.company;
  $("end-stats").innerHTML = [
    ["🏢 최종 기업가치", lines(valuation())],
    ["💾 통산 생산 코드", lines(S.earnedAll)],
    ["🚀 Exit 횟수", S.exits + "회"],
    ["🧾 누적 스톡옵션", S.so + " (×" + prestigeMult().toFixed(2) + ")"],
    ["⏱️ 플레이 타임", hhmm(playTime())],
  ].map(([k, v]) => `<div class="end-row"><span>${k}</span><b>${v}</b></div>`).join("");
  $("ending").classList.remove("hidden");
  if (window.Ads && window.Ads.display) window.Ads.display($("end-ad"));
}
function closeEnding() { $("ending").classList.add("hidden"); }

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

  // 스프린트(부스터) 버튼
  const bb = $("btn-boost");
  if (now < S.buffUntil) { bb.disabled = true; bb.textContent = `🔥 스프린트 중! (${Math.ceil((S.buffUntil - now) / 1000)}초)`; }
  else if (now < S.boostCdUntil) { bb.disabled = true; bb.textContent = `🚀 스프린트 (${mmss(S.boostCdUntil - now)} 후)`; }
  else { bb.disabled = false; bb.textContent = "🚀 스프린트 (×2) — 60초간 생산 2배"; }

  // Exit 버튼
  const exitBtn = $("btn-exit");
  if (v >= EXIT_UNLOCK) { exitBtn.disabled = false; exitBtn.innerHTML = `🚀 Exit (매각/IPO) — 스톡옵션 +${exitSO()}`; }
  else { exitBtn.disabled = true; exitBtn.innerHTML = `🔒 Exit — 시리즈 A(${lines(EXIT_UNLOCK)})부터`; }
}

// 개발력·조직 공통 아이템 렌더 (subtitle 단위만 다름)
// 아직 안 열린 항목은 잠금 상태로 보여줘요 — Exit을 할 이유가 되게
function itemHTML(item, cnt, cost, can, unit) {
  if (!unlocked(item)) {
    return `
      <button class="gen lock" data-id="${item.id}" disabled>
        <span class="gen-emoji">🔒</span>
        <span class="gen-info">
          <b>???</b>
          <span class="gen-desc">Exit ${item.req}회 달성 시 해금</span>
        </span>
        <span class="gen-right"><span class="gen-lv">${unit} +${fmt(item.per)}줄</span></span>
      </button>`;
  }
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
// 잠긴 항목은 '바로 다음 하나'만 보여줘서 목록이 길어지지 않게
function visible(list) {
  const open = list.filter(unlocked);
  const next = list.find((it) => !unlocked(it));
  return next ? open.concat([next]) : open;
}
function renderGens() {
  const box = $("gen-list");
  box.innerHTML = visible(GENERATORS).map((g) => {
    const cnt = S.gens[g.id] || 0, cost = genCost(g);
    return itemHTML(g, cnt, cost, S.code >= cost, "초당");
  }).join("");
  box.querySelectorAll(".gen:not(.lock)").forEach((b) => { b.onclick = () => buyGen(GENERATORS.find((g) => g.id === b.dataset.id)); });
}
function renderEquip() {
  const box = $("equip-list");
  box.innerHTML = visible(EQUIP).map((e) => {
    const cnt = S.equip[e.id] || 0, cost = equipCost(e);
    return itemHTML(e, cnt, cost, S.code >= cost, "클릭당");
  }).join("");
  box.querySelectorAll(".gen:not(.lock)").forEach((b) => { b.onclick = () => buyEquip(EQUIP.find((e) => e.id === b.dataset.id)); });
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
  checkEnding();
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
  S.sessionStart = Date.now();
  offlineReward();
  termBoot();
  renderAll();
  setTab("equip");
  // click 대신 pointerdown — 빠른 연타에서 누락 없이 즉시 반응 (마우스·터치 모두 커버)
  $("clicker").addEventListener("pointerdown", (e) => { e.preventDefault(); onClick(e); });
  $("btn-boost").addEventListener("click", useBoost);
  $("btn-exit").addEventListener("click", doExit);
  $("btn-end-close").addEventListener("click", closeEnding);
  $("btn-end-exit").addEventListener("click", () => { closeEnding(); doExit(); });
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
