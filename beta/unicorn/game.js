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

// 장비·자동화를 사면 구매액의 (1-ASSET_KEEP)만큼이 감가로 날아가요.
// 그래서 기업가치가 눈에 띄게 내려갔다가, 늘어난 생산으로 다시 채워집니다.
const ASSET_KEEP = 0.6;
// 단계 기준선은 '기업가치' 기준 — 예전 누적 기준선의 정확히 0.6배라
// 진행 속도는 그대로이고, 기존 저장본이 강등되지 않아요.
const STAGES = [
  { v: 0,     emoji: "🌱", name: "부트스트랩" },
  { v: 3e3,   emoji: "🌿", name: "프리시드" },
  { v: 1.8e5, emoji: "🌾", name: "시드 투자" },
  { v: 6e6,   emoji: "📈", name: "시리즈 A" },
  { v: 1.8e8, emoji: "🚀", name: "시리즈 B" },
  { v: 6e9,   emoji: "💫", name: "시리즈 C" },
  { v: 6e10,  emoji: "🦄", name: "유니콘" },
  { v: 6e12,  emoji: "👑", name: "데카콘" },
];
const EXIT_UNLOCK = 6e6;      // 시리즈 A부터 Exit 가능
const FINAL_STAGE = 6e12;     // 데카콘 = 엔딩 트리거

const BOOST_DUR = 60000;   // 부스터 지속 60초
const BOOST_CD = 300000;   // 쿨다운 5분

// 사명 추천 — 통짜 이름 + (앞말 × 뒷말) 조합으로 매번 다르게 뽑아요
const COMPANY_NAMES = ["토스트", "당근파이", "쿠키페이", "배달의민속", "네이비어", "카카옹", "라인프렌드", "우아한형아들", "비바리버블릭", "센드버그"];
const NAME_HEAD = [
  "토스", "당근", "쿠키", "배달", "네이비", "카카", "라인", "우아", "비바", "센드",
  "크래프트", "하이퍼", "넥스트", "딥", "퀀텀", "노바", "제로", "코드", "픽셀", "버그",
  "무한", "새벽", "라면", "심야", "월세", "치킨", "라떼", "떡상", "존버", "폭풍",
];
const NAME_TAIL = [
  "랩스", "소프트", "테크", "웍스", "페이", "클라우드", "스튜디오", "컴퍼니", "시스템즈", "다이나믹스",
  "코퍼레이션", "홀딩스", "네트웍스", "AI", "로보틱스", "인터랙티브", "솔루션", "플랫폼", "커넥트", "스페이스",
];
function randomCompany() {
  // 1/4 확률로 통짜 이름, 나머지는 조합형
  if (Math.random() < 0.25) return pick(COMPANY_NAMES);
  return pick(NAME_HEAD) + pick(NAME_TAIL);
}
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
    company: randomCompany(),
    code: 0,             // 보유 코드(줄)
    gens: {}, equip: {}, // 자동화 보유수 / 장비 보유수
    so: 0, exits: 0,
    earnedRun: 0, earnedAll: 0, bestRun: 0,
    spent: 0,            // 이번 판에 장비·자동화에 쓴 코드(줄)
    peakVal: 0,          // 이번 판 최고 기업가치 — 단계·Exit 보상 기준
    valConv: 1,          // 기업가치 체계 전환 완료 표시
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
      S.bestRun = S.bestRun || S.earnedRun || 0;
      // 기업가치 체계로 이관 — 예전 저장본은 '누적 생산 − 잔액'이 곧 지출이에요
      if (typeof S.spent !== "number") S.spent = Math.max(0, (S.earnedRun || 0) - (S.code || 0));
      if (!S.valConv) { S.bestRun = (S.bestRun || 0) * ASSET_KEEP; S.valConv = 1; }
      S.peakVal = Math.max(S.peakVal || 0, S.code + S.spent * ASSET_KEEP);
      S.bestRun = Math.max(S.bestRun || 0, S.peakVal);
      return true;
    }
  } catch { /* noop */ }
  return false;
}
// 초기화 중에는 저장을 완전히 막아요.
// (지우고 reload하면 beforeunload의 save()가 방금 지운 데이터를 되살려버려요)
let wiping = false;
function save() {
  if (wiping) return;
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
// 💼 보유 자산 = 지금까지 장비·자동화에 투자한 금액의 ASSET_KEEP만큼
const assetVal = () => (S.spent || 0) * ASSET_KEEP;
// 🏦 기업가치(라이브) — 사면 감가만큼 즉시 내려가요
const valuation = () => S.code + assetVal();
// 단계·Exit 보상은 '이번 판 최고 기업가치' 기준 — 구매 때문에 강등되거나
// 보상이 줄어들지 않게 하려는 장치예요.
const peakVal = () => Math.max(S.peakVal || 0, valuation());
const stageOf = (v) => { let st = STAGES[0]; for (const s of STAGES) if (v >= s.v) st = s; return st; };
const nextStage = (v) => STAGES.find((s) => s.v > v) || null;
// 첫 Exit(시리즈 A)에서 SO 10 = 생산 ×2.0 — 리셋이 확실히 이득이 되게
const exitSO = () => Math.floor(10 * Math.sqrt(peakVal() / EXIT_UNLOCK));
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
  S.spent = (S.spent || 0) + cost;
  S.gens[g.id] = (S.gens[g.id] || 0) + 1;
  save(); renderAll();
}
function buyEquip(e) {
  const cost = equipCost(e);
  if (!unlocked(e) || S.code < cost) return;
  S.code -= cost;
  S.spent = (S.spent || 0) + cost;
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
  if (peakVal() < EXIT_UNLOCK) return;
  const gain = exitSO();
  if (gain < 1) return;
  const label = stageOf(peakVal()).name;
  const nextExits = S.exits + 1;
  const opening = [...GENERATORS, ...EQUIP].filter((it) => it.req === nextExits);
  const unlockMsg = opening.length
    ? `· 🔓 새로 열려요: ${opening.map((o) => o.name).join(", ")}\n`
    : "";
  if (!confirm(
    `🚀 Exit — ${label} 단계에서 회사를 매각/상장할까요?\n\n` +
    `· 스톡옵션 +${gain} 획득 (영구 생산 배수 ×${(1 + (S.so + gain) * 0.1).toFixed(2)})\n` +
    unlockMsg +
    `· 코드·조직·개발력은 초기화되고, 더 빠르게 다시 시작해요\n` +
    `· 회사만 파는 거예요 — 창업 인생은 계속됩니다\n\n진행할까요?`
  )) return;
  S.so += gain;
  S.exits += 1;
  S.code = 0; S.gens = {}; S.equip = {}; S.earnedRun = 0;
  S.spent = 0; S.peakVal = 0;
  S.buffUntil = 0;
  addLog(`🚀 Exit 성공! 스톡옵션 +${gain} (통산 ${S.exits}회, 누적 SO ${S.so})`);
  if (window.Fx) Fx.celebrate("champion", `🚀 Exit! 스톡옵션 +${gain}`, "#btn-exit");
  if (opening.length) addLog(`🔓 ${opening.map((o) => o.name).join(", ")} 해금!`);
  if (window.Stats) Stats.log("exit", { exits: S.exits, so: S.so, stage: label });
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
  if (S.endedAt || peakVal() < FINAL_STAGE) return;
  S.endedAt = Date.now();
  addLog("👑 데카콘 등극! 시장을 지배하는 회사가 되었어요.");
  if (window.Fx) Fx.celebrate("ending", "👑 데카콘 등극!");
  if (window.Stats) Stats.log("decacorn", { exits: S.exits, so: S.so, playMin: Math.round(playTime() / 60000) });
  save();
  showEnding();
}
function showEnding() {
  $("end-company").textContent = "🦄 " + S.company;
  $("end-stats").innerHTML = [
    ["🏢 최고 기업가치", lines(peakVal())],
    ["💾 통산 생산 코드", lines(S.earnedAll)],
    ["🚀 Exit 횟수", S.exits + "회"],
    ["🧾 누적 스톡옵션", S.so + " (×" + prestigeMult().toFixed(2) + ")"],
    ["⏱️ 플레이 타임", hhmm(playTime())],
  ].map(([k, v]) => `<div class="end-row"><span>${k}</span><b>${v}</b></div>`).join("");
  $("ending").classList.remove("hidden");
  if (window.Ads && window.Ads.display) window.Ads.display($("end-ad"));
}
function closeEnding() { $("ending").classList.add("hidden"); }

// ---------- 🐛 버그 잡기 ----------
// 화면을 보고 있을 때만 가끔 벌레가 기어다녀요. 탭하면 보상, 놓치면 코드가 조금 줄어요.
// (자리를 비운 동안엔 등장하지 않아요 — 방치형인데 안 보는 사이 손해 보면 안 되니까)
const BUG_GAP_MIN = 45000, BUG_GAP_MAX = 100000; // 등장 간격
const BUG_LIFE = 9000;                            // 놓치기까지 시간
const BUG_KINDS = ["🐛", "🪲", "🦗", "🕷️"];
let bugTimer = null, bugEl = null;

function bugReward() { return Math.max(perSec() * 30, clickValue() * 25, 10); }
function bugPenalty() { return Math.min(S.code * 0.02, Math.max(perSec() * 8, clickValue() * 10)); }

function scheduleBug() {
  clearTimeout(bugTimer);
  bugTimer = setTimeout(spawnBug, BUG_GAP_MIN + Math.random() * (BUG_GAP_MAX - BUG_GAP_MIN));
}
function spawnBug() {
  // 화면이 안 보이거나 이미 한 마리 있으면 다음 기회로
  if (document.hidden || bugEl || document.querySelector(".end-wrap:not(.hidden)")) { scheduleBug(); return; }
  const el = document.createElement("button");
  el.className = "bug";
  el.type = "button";
  el.setAttribute("aria-label", "버그 잡기");
  el.textContent = pick(BUG_KINDS);
  const fromLeft = Math.random() < 0.5;
  el.style.top = (18 + Math.random() * 64) + "vh";
  el.style.setProperty("--from", fromLeft ? "-14vw" : "108vw");
  el.style.setProperty("--to", fromLeft ? "108vw" : "-14vw");
  el.style.setProperty("--dur", BUG_LIFE + "ms");
  el.style.setProperty("--flip", fromLeft ? "1" : "-1");
  document.body.appendChild(el);
  bugEl = el;

  let caught = false;
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (caught) return;
    caught = true;
    const gain = bugReward();
    S.code += gain; S.earnedRun += gain; S.earnedAll += gain;
    if (valuation() > (S.peakVal || 0)) S.peakVal = valuation();
    addLog(`🐛✅ 버그를 잡았어요! 핫픽스 보상 +${lines(gain)}`);
    if (window.Fx) Fx.burst(el, "✨", 10);
    el.classList.add("squash");
    setTimeout(() => removeBug(), 260);
    save(); renderAll();
  });

  setTimeout(() => {
    if (caught) return;
    const loss = bugPenalty();
    if (loss > 0) {
      S.code = Math.max(0, S.code - loss);
      addLog(`🐛💥 버그를 놓쳤어요… 장애로 코드 ${lines(loss)} 유실!`);
    } else {
      addLog("🐛… 버그가 도망갔어요. (다행히 잃을 코드가 없었네요)");
    }
    removeBug();
    save(); renderAll();
  }, BUG_LIFE);
}
function removeBug() {
  if (bugEl) { bugEl.remove(); bugEl = null; }
  scheduleBug();
}

// ---------- 사명 짓기 ----------
// 새 게임을 시작할 때(그리고 상단 회사명을 눌렀을 때) 이름을 직접 정할 수 있어요.
let namingDone = null; // 확인 시 실행할 콜백
function renderNamePicks() {
  const box = $("name-picks");
  const picks = [];
  while (picks.length < 4) { const n = randomCompany(); if (!picks.includes(n)) picks.push(n); }
  box.innerHTML = picks.map((n) => `<button class="name-pick" type="button">${n}</button>`).join("");
  box.querySelectorAll(".name-pick").forEach((b) => {
    b.onclick = () => { $("name-input").value = b.textContent; $("name-input").focus(); };
  });
}
const NAMING_TEXT = {
  new:    { emoji: "🦄", title: "창업하기",   desc: "회사 이름을 정해주세요. 명예의 전당에 이 이름으로 남아요.", ok: "🚀 창업 시작" },
  rename: { emoji: "✏️", title: "사명 변경",  desc: "회사 이름을 바꿔요. 진행 상황은 그대로예요.",              ok: "✅ 확인" },
  retire: { emoji: "🏛️", title: "은퇴 등록",  desc: "명예의 전당에 남길 회사 이름이에요.",                      ok: "🏛️ 이 이름으로 등록" },
};
function openNaming(mode, onDone) {
  const t = NAMING_TEXT[mode] || NAMING_TEXT.rename;
  namingDone = onDone || null;
  $("name-emoji").textContent = t.emoji;
  $("name-title").textContent = t.title;
  $("name-desc").textContent = t.desc;
  $("btn-name-ok").textContent = t.ok;
  $("name-input").value = S.company;
  renderNamePicks();
  $("naming").classList.remove("hidden");
  setTimeout(() => { const el = $("name-input"); el.focus(); el.select(); }, 60);
}
function confirmName() {
  const v = String($("name-input").value || "").trim().slice(0, 24);
  S.company = v || randomCompany();   // 비워두면 추천 이름으로
  $("naming").classList.add("hidden");
  save(); renderAll();
  registerCompany();                  // 창업·개명 시 풀에 등록 (중복은 무시돼요)
  if (namingDone) { const cb = namingDone; namingDone = null; cb(); }
}

// ---------- 창업 중인 회사 수 ----------
// register는 id가 같으면 무시돼요(resolution=ignore-duplicates). 여러 번 불러도
// 이 기기의 회사는 한 번만 집계되고 전적도 덮이지 않아요.
function registerCompany() {
  if (window.Match && window.Match.enabled()) window.Match.register("unicorn", S.company);
}
const COUNT_POLL_MS = 60000;
let lastCountAt = 0;
function refreshCount(force) {
  if (!window.Match || !window.Match.enabled()) return;
  const now = Date.now();
  if (!force && now - lastCountAt < COUNT_POLL_MS) return;
  lastCountAt = now;
  window.Match.count("unicorn").then((n) => {
    if (!n) return;                   // 집계 전이거나 실패 — 빈 줄을 남기지 않아요
    const el = $("uni-count");
    el.innerHTML = `🌏 지금 <b>${n.toLocaleString()}개</b>의 회사가 창업 중이에요`;
    el.classList.remove("hidden");
  });
}

// ---------- 명예의 전당 / 은퇴 ----------
// Exit = 회사 하나를 팔고 '다시 창업'(프레스티지)  ·  은퇴 = 창업 인생 자체를 마무리
const HOF_KEY = "grow-hof-v1"; // 시리즈 공용 (entry.game으로 구분)
const loadHof = () => { try { return JSON.parse(localStorage.getItem(HOF_KEY)) || []; } catch { return []; } };
const saveHof = (l) => { try { localStorage.setItem(HOF_KEY, JSON.stringify(l.slice(-200))); } catch {} };

// 누적 코드가 주력(로그 스케일) + Exit 횟수 + 최고 단계
function hofScore() {
  return Math.round(
    Math.log10(S.earnedAll + 10) * 1000 +
    S.exits * 300 +
    STAGES.indexOf(stageOf(S.bestRun)) * 200
  );
}
function gradeOf(bestRun) {
  const st = stageOf(bestRun).name;
  if (bestRun >= FINAL_STAGE) return "👑 시장을 지배한 창업가";
  if (st === "유니콘") return "🦄 유니콘을 세운 사람";
  if (st === "시리즈 C") return "💫 대형 스타트업 대표";
  if (st === "시리즈 B") return "🚀 성장 궤도에 오른 대표";
  if (st === "시리즈 A") return "📈 투자 유치에 성공한 대표";
  return "🌱 작지만 단단했던 시작";
}
// 은퇴 가능 조건 — 한 번이라도 시리즈 A를 찍었거나 Exit 경험이 있으면
const canRetire = () => S.bestRun >= EXIT_UNLOCK || S.exits > 0;

// 은퇴 — 사명 모달로 이름을 확정한 뒤 진행해요
function doRetire() {
  if (!canRetire()) return;
  openNaming("retire", finishRetire);
}
function finishRetire() {
  const company = S.company;
  if (!confirm(
    `🏛️ 창업 인생을 마치고 은퇴할까요?\n\n` +
    `· ${company} 의 기록이 명예의 전당에 영구 등록돼요\n` +
    `· 회사만 파는 Exit과 달리, 은퇴는 커리어 전체를 마무리해요\n` +
    `· 스톡옵션을 포함한 모든 진행이 사라지고 완전히 새로 시작해요\n\n진행할까요?`
  )) return;

  const entry = {
    id: "u" + Date.now(),
    game: "unicorn",
    name: company,
    earnedAll: Math.round(S.earnedAll),
    bestRun: Math.round(S.bestRun),
    stage: stageOf(S.bestRun).name,
    exits: S.exits,
    so: S.so,
    playMs: playTime(),
    score: hofScore(),
    grade: gradeOf(S.bestRun),
  };
  const hof = loadHof();
  hof.push(entry);
  saveHof(hof);
  if (window.Match) window.Match.submitHof("unicorn", entry);
  if (window.Stats) Stats.log("retire", { exits: entry.exits, so: entry.so, score: entry.score });

  // 완전히 새 인생으로 — 자동 저장이 옛 상태를 되살리지 않게 S 자체를 교체
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  S = fresh();
  S.sessionStart = Date.now();
  save();
  $("ending").classList.add("hidden");
  renderAll();
  alert(
    `🏛️ ${entry.name}, 은퇴!\n\n명예의 전당에 이름을 남겼어요.\n\n` +
    `${entry.grade}\n최고 단계 ${entry.stage} · Exit ${entry.exits}회 · 점수 ${entry.score}`
  );
  showHof();
}

async function showHof() {
  const box = $("hof-list"), scope = $("hof-scope");
  box.innerHTML = `<p class="hint">불러오는 중…</p>`;
  scope.textContent = "기록을 불러오는 중…";
  $("hof").classList.remove("hidden");

  if (window.Match) await window.Match.backfillHof();
  const local = loadHof().filter((e) => e.game === "unicorn");
  const localIds = new Set(local.map((e) => e.id));
  const remote = window.Match ? await window.Match.fetchHof("unicorn") : null;
  // fetchHof는 실패하면 null, 성공했는데 기록이 없으면 [] 를 줘요.
  // 배열이기만 하면 '연결은 됐다'는 뜻 — 기록 0개를 오프라인으로 오해하면 안 돼요.
  const online = Array.isArray(remote);
  let list = local;
  if (online) {
    const seen = new Set();
    list = [];
    for (const e of [...remote, ...local]) {
      if (!e || seen.has(e.id)) continue;
      seen.add(e.id);
      list.push(e);
    }
  }
  list.sort((a, b) => b.score - a.score);
  scope.textContent = online
    ? (list.length ? "🌏 전 세계 창업가 순위" : "🌏 전 세계 순위")
    : "📡 서버에 연결하지 못했어요 — 내 기기 기록만 표시";
  hofShown = 20;
  drawHof(list, localIds, online);
}

// 더 보기로 20명씩 늘리고, 내 기록이 목록 밖이면 하단에 고정해요
let hofShown = 20;
function drawHof(list, localIds, online) {
  const box = $("hof-list");
  if (!list.length) {
    box.innerHTML = online
      ? `<p class="hint">아직 은퇴한 창업가가 없어요. 첫 전설이 되어보세요! 🦄</p>`
      : `<p class="hint">이 기기에 남은 기록이 없어요.</p>`;
    return;
  }
  box.innerHTML = "";
  const myIdx = list.findIndex((x) => localIds.has(x.id));
  const view = list.slice(0, hofShown).map((e, i) => ({ e, i }));
  if (myIdx >= hofShown) view.push({ gap: true }, { e: list[myIdx], i: myIdx });
  view.forEach(({ e, i, gap }) => {
    if (gap) { const gp = document.createElement("div"); gp.className = "hof-gap"; gp.textContent = "⋯"; box.appendChild(gp); return; }
    const div = document.createElement("div");
    div.className = "hof-row" + (localIds.has(e.id) ? " me" : "");
    div.innerHTML = `
      <span class="hof-rank">${i + 1}</span>
      <span class="hof-body">
        <b>${e.name} <span class="hof-grade">${e.grade || ""}</span></b>
        <span>${e.stage || "-"} · 누적 ${lines(e.earnedAll || 0)} · Exit ${e.exits || 0}회 · ${hhmm(e.playMs || 0)}</span>
      </span>
      <span class="hof-score">${(e.score || 0).toLocaleString()}</span>`;
    box.appendChild(div);
  });
  const left = list.length - Math.min(list.length, hofShown);
  if (left > 0) {
    const more = document.createElement("button");
    more.className = "mini-btn rank-more";
    more.textContent = `▾ 더 보기 (${left}명 남음)`;
    more.onclick = () => { hofShown += 20; drawHof(list, localIds, online); };
    box.appendChild(more);
  }
}
function closeHof() { $("hof").classList.add("hidden"); }

// ---------- 렌더 ----------
function renderHud() {
  const now = Date.now();
  // 큰 숫자(진행바)는 라이브 기업가치, 단계 배지는 최고 기록 — 강등은 없어요
  const v = valuation(), pv = peakVal(), st = stageOf(pv), ns = nextStage(pv);
  $("hud-code").textContent = "💾 잔액 " + lines(S.code);
  $("hud-sec").textContent = linesRate(perSec()) + "/초";
  $("hud-asset").textContent = "💼 자산 " + lines(assetVal());
  $("hud-so").textContent = "🧾 스톡옵션 " + S.so + " (×" + prestigeMult().toFixed(2) + ")";
  $("clicker-label").textContent = `눌러서 코딩! 💾 +${fmt(clickValue())}줄`;
  $("stage-name").textContent = `${st.emoji} ${st.name}`;
  $("stage-val").textContent = "🏦 " + lines(v);
  $("stage-val").title = "기업가치 = 잔액 + 보유 자산. 장비·자동화를 사면 감가만큼 내려가요.";
  const bar = $("stage-bar");
  if (ns) {
    const pct = Math.max(0, Math.min(100, ((v - st.v) / (ns.v - st.v)) * 100));
    bar.style.width = pct + "%";
    // 방금 지른 직후엔 라이브 값이 최고치보다 낮아요 — 그 격차를 같이 보여줘요
    const behind = pv - v > (ns.v - st.v) * 0.01 ? ` · 최고 ${lines(pv)}` : "";
    $("stage-next").textContent = `다음: ${ns.emoji} ${ns.name} (${lines(ns.v)})${behind}`;
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
  if (v >= EXIT_UNLOCK) { exitBtn.disabled = false; exitBtn.innerHTML = `🚀 Exit — 매각하고 재창업 (스톡옵션 +${exitSO()})`; }
  else { exitBtn.disabled = true; exitBtn.innerHTML = `🔒 Exit — 시리즈 A(${lines(EXIT_UNLOCK)})부터`; }

  // 은퇴 — 조건 충족 시에만 노출 (아무 때나 끝낼 수 있게)
  $("btn-retire").classList.toggle("hidden", !canRetire());
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
  const pv = valuation();
  if (pv > (S.peakVal || 0)) S.peakVal = pv;
  if (S.peakVal > S.bestRun) S.bestRun = S.peakVal;
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
  const isNew = !load();
  if (isNew) { S = fresh(); save(); }
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
  $("btn-end-retire").addEventListener("click", doRetire);
  $("btn-retire").addEventListener("click", doRetire);
  $("btn-hof").addEventListener("click", showHof);
  $("btn-hof-close").addEventListener("click", closeHof);
  // 사명 짓기 — 상단 회사명을 누르면 언제든 바꿀 수 있어요
  $("btn-name-dice").addEventListener("click", () => { $("name-input").value = randomCompany(); renderNamePicks(); });
  $("btn-name-ok").addEventListener("click", confirmName);
  $("name-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); confirmName(); } });
  $("company-name").addEventListener("click", () => openNaming("rename"));
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("btn-reset").addEventListener("click", () => {
    if (confirm("정말 처음부터 다시 시작할까요? 모든 진행(스톡옵션 포함)이 사라져요!")) {
      wiping = true;                      // 이후 저장 차단 (reload 중 되살아나지 않게)
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      location.reload();
    }
  });
  lastTick = Date.now();
  setInterval(tick, 100);
  setInterval(save, 5000);
  window.addEventListener("beforeunload", save);
  // 방문·PWA 집계 + 이후 이벤트의 게임명 지정 (없으면 game이 "unknown"으로 기록돼요)
  if (window.Stats) Stats.init("unicorn");
  scheduleBug();  // 🐛 버그 등장 예약
  // 탭이 다시 보이면 타이머를 새로 잡아요 (백그라운드 동안 몰려 나오지 않게)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (!bugEl) scheduleBug();
    refreshCount();   // 돌아왔을 때 한 번 (COUNT_POLL_MS 안이면 건너뛰어요)
  });
  // 창업 중인 회사 수 — 기존 플레이어도 집계되게 이미 판이 있으면 바로 등록해요
  if (!isNew) registerCompany();
  refreshCount(true);
  // 백그라운드에서는 굳이 두드리지 않아요
  setInterval(() => { if (!document.hidden) refreshCount(); }, COUNT_POLL_MS);
  // 새로 시작하는 판이면 사명부터 정하고 들어가요
  if (isNew) openNaming("new");
}
init();
