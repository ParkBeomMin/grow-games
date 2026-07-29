/* 더 윙어 ⚽ 축구선수 키우기 */
"use strict";

// ---------- 데이터 ----------
// 유스 배경 선택 — 야구의 '지역'·아이돌의 '소속사' 대응
const MARKETS = [
  {
    id: "k", name: "K리그 유스", emoji: "🇰🇷", tier: "국내 명문",
    debut: 0.66, growth: 0.98, spot: 1.0,
    desc: "체계적인 국내 유스. 안정적으로 크지만 세계무대는 멀어요",
  },
  {
    id: "eu", name: "유럽 아카데미", emoji: "🇪🇺", tier: "빅클럽 유스",
    debut: 0.6, growth: 1.15, spot: 1.15,
    desc: "세계 최고의 유스. 성장은 빠르지만 경쟁이 살벌해요",
  },
  {
    id: "br", name: "남미 유스", emoji: "🇧🇷", tier: "삼바 축구",
    debut: 0.62, growth: 1.08, spot: 1.05,
    desc: "길거리 축구로 다져진 개인기. 화려하게 성장해요",
  },
  {
    id: "jp", name: "일본 J리그 유스", emoji: "🇯🇵", tier: "정교한 시스템",
    debut: 0.65, growth: 1.04, spot: 1.03,
    desc: "정교한 패스 축구를 가르쳐요. 전술 이해와 기본기가 빠르게 자라요",
  },
  {
    id: "af", name: "아프리카 유망주", emoji: "🌍", tier: "피지컬 몬스터",
    debut: 0.57, growth: 1.18, spot: 1.08,
    desc: "타고난 신체 능력으로 폭발 성장. 대신 기복이 크고 경쟁이 치열해요",
  },
];

const STAT_DEFS = [
  { key: "shoot", name: "슛", emoji: "⚽", sub: "결정력·마무리" },
  { key: "pass", name: "패스", emoji: "🎯", sub: "시야·연계" },
  { key: "dribble", name: "드리블", emoji: "🏃", sub: "돌파·개인기" },
  { key: "defense", name: "수비", emoji: "🛡️", sub: "태클·위치선정" },
  { key: "stamina", name: "체력", emoji: "🫀", sub: "지구력·스피드" },
];

// 포지션 — 야구의 '포지션' 대응. 주력 능력치가 달라져요
const POS_INFO = {
  fw: { name: "공격수", stat: "shoot" },
  mf: { name: "미드필더", stat: "pass" },
  df: { name: "수비수", stat: "defense" },
  wg: { name: "윙어", stat: "dribble" },
};

/* 리그 티어 — 축구 커리어의 핵심 서사는 리그를 옮기는 거예요.
 * penalty는 경기 평점에서 빼고, prestige는 축에 곱해요.
 *
 * 난이도를 곱셈이 아니라 평점에서 빼는 게 핵심이에요.
 * perf = clamp((rating - 5) / 4 + 0.6, 0.15, 1.6)이 평점의 비선형 함수라,
 * 평점을 깎으면 약한 선수가 훨씬 크게 무너져요. 강한 선수는 상한 근처라 덜 다칩니다.
 * 곱셈으로 해봤더니 순효과가 균일해서 능력치와 무관하게 올라갈수록 유리했어요.
 *
 * career.js가 아니라 여기 두는 건 career.js가 IIFE라 그 안의 선언이 밖으로 안 새기
 * 때문이에요. 클럽 전력·동료 득점처럼 game.js 쪽에서도 리그를 읽어야 해요. */
const LEAGUES = [
  { id: 1, name: "K리그",       short: "국내",   flag: "🇰🇷", penalty: 0,   prestige: 1.00 },
  { id: 2, name: "유로파리그",   short: "유럽",   flag: "🇪🇺", penalty: 1.6, prestige: 1.35 },
  { id: 3, name: "챔피언스리그", short: "빅클럽", flag: "🏆", penalty: 2.8, prestige: 1.80 },
];

// 옛 세이브에는 S.league가 없어요. 마이그레이션하지 않고 없으면 1부로 봐요.
function leagueOf(st) {
  return LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
}

/* 클럽 — 전력(str)은 팀 성적에만 작용해요. 개인 수상에는 안 닿습니다.
 * 같은 리그 안에서 전력 좋은 팀으로 가면 팀은 더 이기지만 내 수상 확률은 그대로예요.
 * 이게 리그 이적(개인 커리어)과 명확히 구분되는 지점이에요.
 *
 * 리그 티어는 "내가 어디까지 통하나"를 묻고, 클럽 전력은 "우리 팀이 이기나"를 물어요.
 * 두 축이 겹치면 같은 리그 이적과 상위 리그 이적이 같은 질문이 돼서 선택이 사라져요.
 *
 * 실제 구단명은 쓰지 않아요 — 이 저장소는 상표를 전부 가상 명칭으로 바꿨어요. */
const CLUBS = {
  1: [
    { name: "FC 노바", str: 78 }, { name: "레인저스", str: 71 },
    { name: "선더볼트", str: 66 }, { name: "블랙이글스", str: 62 },
    { name: "시티즌", str: 57 }, { name: "포레스트 FC", str: 52 },
  ],
  2: [
    { name: "레알 몬테", str: 84 }, { name: "아틀레티코 델", str: 79 },
    { name: "노르드 위니온", str: 74 }, { name: "올림피코 베라", str: 70 },
    { name: "스타디온 루체", str: 65 }, { name: "AC 리베라", str: 61 },
  ],
  3: [
    { name: "인터 아우로라", str: 93 }, { name: "바이언 슈타트", str: 90 },
    { name: "로열 알비온", str: 87 }, { name: "파리 셀레스트", str: 84 },
    { name: "밀란 코로나", str: 81 }, { name: "이베리아 솔", str: 78 },
  ],
};

// 옛 세이브에는 S.clubStr이 없어요. 마이그레이션하지 않고 없으면 70으로 봐요.
function clubStrOf(st) {
  const v = st && st.clubStr;
  return typeof v === "number" && isFinite(v) ? clamp(v, 40, 95) : 70;
}

// 상대 팀은 같은 리그에서 뽑아요. 내 클럽은 빼고요.
function oppClubs(st) {
  const list = CLUBS[leagueOf(st).id] || CLUBS[1];
  const names = list.map((c) => c.name).filter((n) => n !== (st && st.group));
  return names.length ? names : list.map((c) => c.name);
}

const PLAYER_NAMES = ["도현", "시우", "주원", "하준", "은우", "서준", "이안", "리오", "카이", "마테오", "루카", "지안"];

// 평가 경기 종목: 주 스탯 / 보조 스탯 가중치
const STAGE_TYPES = [
  { name: "공격 전개", main: "shoot", aux: "dribble" },
  { name: "중원 장악", main: "pass", aux: "stamina" },
  { name: "수비 조직", main: "defense", aux: "stamina" },
  { name: "포지션 자유", main: null, aux: "stamina" }, // main = 내 포지션 스탯
];

const EVALS = { 6: "상반기 유스 리그", 12: "연말 평가전" };
const SURVIVAL_ROUNDS = ["구단 트라이아웃", "2군 테스트", "1군 콜업", "프로 계약"];

// ---------- 상태 ----------
const SAVE_KEY = "winger-save-v1";

// ---------- 🧬 유산(환생) ----------
// 환생하면 커리어를 마치고 '다음 세대'가 유산을 이어받아요.
// 은퇴(명예의 전당 등록)와 달리 기록은 남기지 않고, 대신 영구 보너스를 넘겨줍니다.
// 보너스는 sqrt로 완만하게 오르고 상한이 있어 폭주하지 않아요.
const LEGACY_KEY = SAVE_KEY + "-legacy";
const LEGACY_TALENT_CAP = 0.25;   // 시작 재능 보너스 상한
function loadLegacy() {
  try { const l = JSON.parse(localStorage.getItem(LEGACY_KEY)); if (l && typeof l.pts === "number") return l; } catch {}
  return { pts: 0, gen: 0 };
}
function saveLegacy(l) { try { localStorage.setItem(LEGACY_KEY, JSON.stringify(l)); } catch {} }
const legacyTalentBonus = (pts) => Math.min(0.03 * Math.sqrt(Math.max(pts, 0)), LEGACY_TALENT_CAP);
const LEGACY_MONEY_CAP = 15000;   // 시작 자금 상한 (대략 한 시즌 수입)
// 재능 보너스와 같은 모양이에요 — √로 완만히 오르고 누적 70쯤에서 함께 포화해요.
const legacyMoneyBonus = (pts) => Math.min(Math.round(1800 * Math.sqrt(Math.max(pts, 0))), LEGACY_MONEY_CAP);
// 은퇴 점수 → 이번 환생으로 얻는 유산 포인트
const legacyGain = (score) => Math.max(1, Math.floor(Math.sqrt(Math.max(score, 0) / 10)));
let S = null;
let ev = null; // 진행 중인 대회/프로 도전

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const STAT_CAP = 130;
const fmtMoney = (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v)}만`);

function rollStats(pos) {
  const stats = {};
  const talents = {};
  for (const d of STAT_DEFS) {
    stats[d.key] = randInt(24, 38);
    talents[d.key] = Math.min(rand(0.8, 1.45) + legacyTalentBonus(loadLegacy().pts), TALENT_MAX);
  }
  stats[POS_INFO[pos].stat] = clamp(stats[POS_INFO[pos].stat] + 8, 0, STAT_CAP);
  talents[POS_INFO[pos].stat] = Math.max(talents[POS_INFO[pos].stat], 1.05);
  return { stats, talents };
}

let pendingRoll = null;
function renderRoll() {
  if (!pendingRoll) return;
  window.Radar.draw($("roll-radar"), STAT_DEFS, pendingRoll.stats, {
    stroke: "#5fa8ff",
    fill: "rgba(95, 168, 255, 0.28)",
  });
  $("roll-stars").innerHTML = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(talentStars(pendingRoll.talents[d.key]))}`)
    .join(" · ") + `<br/>⭐ = 잠재력 — 별이 많은 능력치일수록 훈련 효율이 높아요`;
}
$("btn-reroll")?.addEventListener("click", () => {
  pendingRoll = rollStats(chosenPos);
  renderRoll();
});

function newState(market, pos, name, roll) {
  const { stats, talents } = roll || rollStats(pos);
  return {
    market: market.id, pos, name,
    year: 1, month: 1,
    stats, talents,
    /* 새 선수는 1부에서 시작해요. 소속 클럽은 프로 데뷔(enterCareer) 때 정해지고,
     * 그때까지는 기본 전력 70으로 유스 경기를 치러요. */
    league: 1,
    clubStr: 70,
    // 🧬 환생 유산으로 받은 시작 자금이에요. 유산이 없으면 0이에요.
    money: legacyMoneyBonus(loadLegacy().pts),
    gear: {},
    condition: 80,
    fandom: 0, // 명성·스카우트 주목도
    buff: false,
    trophies: [],
    stages: 0, // 출전 경기 수
    youth: { g: 0, a: 0, def: 0 }, // 유스 통산 골·도움·수비
    log: [],
  };
}

const marketOf = () => MARKETS.find((m) => m.id === S.market);
const overall = () => {
  const vals = Object.values(S.stats);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

// ---------- 저장 — 여러 선수(슬롯) 지원 ----------
const SLOTS_KEY = SAVE_KEY + "-slots";
let curSlot = null;
function loadSlots() {
  try { return JSON.parse(localStorage.getItem(SLOTS_KEY)) || {}; } catch { return {}; }
}
function saveSlots(sl) { localStorage.setItem(SLOTS_KEY, JSON.stringify(sl)); }
{
  const old = localStorage.getItem(SAVE_KEY);
  if (old) {
    try {
      const sl = loadSlots();
      sl["s" + Date.now()] = JSON.parse(old);
      saveSlots(sl);
    } catch { /* 손상된 저장은 버려요 */ }
    localStorage.removeItem(SAVE_KEY);
  }
}
function save() {
  if (!S) return;
  if (!curSlot) curSlot = "s" + Date.now() + Math.floor(Math.random() * 1e4);
  S.savedAt = Date.now();
  const sl = loadSlots();
  sl[curSlot] = S;
  saveSlots(sl);
  if (window.Cloud) Cloud.touch();
}
function clearSave() {
  if (!curSlot) return;
  const sl = loadSlots();
  delete sl[curSlot];
  saveSlots(sl);
  curSlot = null;
}

// ---------- 화면 전환 ----------
function show(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
  if (!show._silent) history.pushState({ s: id }, "");
}

const BACK_SAFE = ["screen-title", "screen-agency", "screen-position", "screen-name", "screen-hof", "screen-battle"];
window.addEventListener("popstate", (e) => {
  const target = e.state && e.state.s;
  const cur = document.querySelector(".screen.active");
  const curId = cur ? cur.id : "";
  if (target && BACK_SAFE.includes(target) && BACK_SAFE.includes(curId)) {
    show._silent = true;
    show(target);
    show._silent = false;
  } else {
    history.pushState({ s: curId }, "");
  }
});

$("btn-back-first")?.addEventListener("click", () => show("screen-title"));
$("btn-back-position")?.addEventListener("click", () => show("screen-agency"));
$("btn-back-name")?.addEventListener("click", () => show("screen-position"));
const goHome = () => { if (S) save(); location.reload(); };
$("btn-home-main")?.addEventListener("click", goHome);
$("btn-home-pro")?.addEventListener("click", goHome);


// ---------- 재능 각성 ----------
// 재능 상한. 별 표시는 talentStars()가 이 값을 5성에 맞춰 환산해요.
const TALENT_MAX = 1.8;
// ✨ 초월 각성 — 재능이 MAX에 닿은 뒤의 엔드게임.
// 재능은 1.8로 고정(올리면 훈련↑→단계↑ 되먹임으로 폭주해요). 대신 단계마다
// 그 스탯의 상한이 조금 올라 계속 훈련할 공간이 생기고, 실질 보상은
// 명예의 전당 점수 가산이에요. 성공률이 단계마다 떨어져 자연히 느려집니다.
const TRANS_CAP_STEP = 6;   // 단계당 스탯 상한 증가
const TRANS_P0 = 0.45, TRANS_PDEC = 0.03, TRANS_PMIN = 0.15;
const transLv = (key) => (S.trans && S.trans[key]) || 0;
const transTotal = () => Object.values((S && S.trans) || {}).reduce((a, b) => a + b, 0);
const statCap = (key) => STAT_CAP + transLv(key) * TRANS_CAP_STEP;
const transP = (lv) => Math.max(TRANS_P0 - lv * TRANS_PDEC, TRANS_PMIN);
// 상한에 닿은 능력치는 더 훈련해도 오르지 않아요(턴만 소모).
// 그래서 그 능력치의 행동 버튼은 각성/초월로 바뀝니다.
const atCap = (key) => Math.round(S.stats[key]) >= statCap(key);
const awakenP = (v) => Math.min(0.25 + (v - 100) * 0.015, 0.75);
// 재능은 훈련 속도뿐 아니라 '큰 순간'에도 작용해요 (클러치 보정).
// 스탯에 이미 반영된 걸 또 곱하는 이중 이득이 되지 않게 폭을 좁혔어요:
// 평균 재능(1.3) 기준 ±6%, 초월 단계로 최대 +6%p 추가.
// 재능 상한이 1.8이라 실제로 닿는 범위는 0.94 ~ 1.12배예요 (clamp 바깥쪽은 여유분).
const CLUTCH_SCALE = 0.12;
function clutch(key) {
  const t = (S && S.talents && S.talents[key]) || 1.3;
  return clamp(1 + (t - 1.3) * CLUTCH_SCALE + Math.min(transLv(key) * 0.004, 0.06), 0.9, 1.16);
}
function clutchAvg() {
  const ks = Object.keys((S && S.talents) || {});
  return ks.length ? ks.reduce((a, k) => a + clutch(k), 0) / ks.length : 1;
}
function transcendTitle(n) {
  if (n >= 40) return "🔱 신화의 영역";
  if (n >= 25) return "🌌 무아지경";
  if (n >= 12) return "✨ 초월자";
  if (n >= 1) return "🌠 각성 너머";
  return "";
}
const talentStars = (t) => clamp(Math.round(((t - 0.6) / (TALENT_MAX - 0.6)) * 5), 1, 5);
const isTalentMax = (t) => t >= TALENT_MAX - 1e-9;
// 재능 MAX 이후 — 상한까지 채운 스탯으로 초월에 도전해요.
function transcend(key, d, v, logFn) {
  const cap = statCap(key);
  if (v < cap) {
    alert(
      `✨ ${d.name} 재능은 이미 최대(⭐⭐⭐⭐⭐ MAX)예요!\n\n` +
      `이제부터는 🌠 초월 각성에 도전할 수 있어요.\n` +
      `· 조건: ${d.name} 수치를 상한(${cap})까지 채우기 — 지금 ${v}\n` +
      `· 초월 1단계마다 상한 +${TRANS_CAP_STEP}, 명예의 전당 점수 +25`
    );
    return false;
  }
  const lv = transLv(key);
  const p = transP(lv);
  if (!confirm(
    `🌠 ${d.name} 초월 각성 (현재 ✨${lv})\n\n` +
    `성공 확률 ${Math.round(p * 100)}% — 단계가 오를수록 낮아져요\n` +
    `· 성공: ✨${lv + 1} 달성, 상한 ${cap} → ${cap + TRANS_CAP_STEP}, 명예의 전당 +25점\n` +
    `· 실패: ${d.name} 수치만 초기화 (재능은 이미 MAX라 잃지 않아요)\n\n도전할까요?`
  )) return false;

  S.trans = S.trans || {};
  if (Math.random() < p) {
    S.trans[key] = lv + 1;
    S.stats[key] = randInt(45, 60);
    logFn(`🌠✨ ${d.name} 초월 ${lv + 1}단계 달성!! 상한이 ${statCap(key)}까지 열렸어요`);
    if (window.Fx) Fx.celebrate("transcend", `🌠 초월 ${lv + 1}단계!`, ".awaken-btn");
  } else {
    S.stats[key] = randInt(45, 60);
    logFn(`🌠💦 초월 실패… ${d.name} ${Math.round(S.stats[key])}부터 다시 (✨${lv} 유지)`);
    if (window.Fx) { Fx.burst(".awaken-btn", "💦", 8); Fx.flash(`💦 ${d.name} 초월 실패…`); }
  }
  save();
  return true;
}

function awakenTalent(key, logFn) {
  const defs = Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos];
  const d = defs.find((x) => x.key === key);
  const v = Math.round(S.stats[key]);
  if (!d || v < 100) return false;
  // 재능이 상한(TALENT_MAX)이면 각성해도 오르는 게 없어요.
  // 예전엔 '성공'이 뜨면서 스탯만 45~60으로 깎여 순손실이었습니다.
  if (S.talents[key] >= TALENT_MAX - 1e-9) return transcend(key, d, v, logFn);
  const p = awakenP(v);
  const ok = confirm(
    `🔮 ${d.name} 재능 각성 시도!\n\n` +
    `성공 확률 ${Math.round(p * 100)}% (돌파가 깊을수록 올라가요)\n` +
    `· 성공: 재능(⭐)이 영구히 상승 — 훈련 효율이 평균 ${Math.round(0.225 / S.talents[key] * 100)}% 빨라져요\n` +
    `· 실패: 낮은 확률로 재능이 살짝 하락\n` +
    `· 성공하든 실패하든 ${d.name} 수치는 크게 낮아져서 다시 키워야 해요\n\n진행할까요?`
  );
  if (!ok) return false;
  if (Math.random() < p) {
    S.talents[key] = Math.min(S.talents[key] + rand(0.15, 0.3), TALENT_MAX);
    S.stats[key] = randInt(45, 60);
    logFn(`🔮✨ ${d.name} 재능 각성 성공!! 잠재력이 한 단계 피어났어요 (수치 ${Math.round(S.stats[key])}부터 재도전)`);
    if (window.Fx) Fx.celebrate("awaken", `⭐ ${d.name} 각성 성공!`, ".awaken-btn");
  } else if (Math.random() < 0.1) {
    S.talents[key] = Math.max(S.talents[key] - 0.1, 0.8);
    S.stats[key] = randInt(30, 50);
    logFn(`🔮💧 각성 실패… 무리한 시도에 재능까지 살짝 잃었어요 (${Math.round(S.stats[key])})`);
    // 실패에 연출이 없어서 "아무 일도 안 일어났다 = 오류"로 읽혔어요 (플레이어 제보)
    if (window.Fx) { Fx.burst(".awaken-btn", "💧", 10); Fx.flash(`💧 ${d.name} 각성 실패… 재능도 잃었어요`); }
  } else {
    S.stats[key] = randInt(30, 50);
    logFn(`🔮💦 각성 실패… ${d.name} ${Math.round(S.stats[key])}부터 다시 담금질!`);
    if (window.Fx) { Fx.burst(".awaken-btn", "💦", 8); Fx.flash(`💦 ${d.name} 각성 실패…`); }
  }
  save();
  return true;
}


// ---------- 보너스 보상 (공용) — 30분에 1번 ----------
const AD_CD_KEY = "grow-ad-cd";
const AD_CD_MS = 1800000;
const adCooldownLeft = () =>
  Math.max(0, AD_CD_MS - (Date.now() - (+localStorage.getItem(AD_CD_KEY) || 0)));

function showAdModal(amount, onDone) {
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal ad-modal">
      <p class="av-title">🎁 보너스 타임!</p>
      <div class="ad-modal-body"><div class="ad-emoji">⏳</div>준비 중…</div>
      <div class="av-actions"><button class="btn btn-ghost ad-modal-close" disabled>잠시만요…</button></div>
    </div>`;
  document.body.appendChild(ov);
  const body = ov.querySelector(".ad-modal-body");
  const closeBtn = ov.querySelector(".ad-modal-close");
  const finish = () => { ov.remove(); if (onDone) onDone(); };
  window.Ads.rewarded((ok) => {
    if (ok) {
      S.money = (S.money || 0) + amount;
      localStorage.setItem(AD_CD_KEY, Date.now());
      save();
      if (window.Stats) Stats.log("bonus", { type: "money" });
      body.innerHTML = `<div class="ad-emoji">💰</div><b>+${amount}만</b> 획득!<br/><span class="av-note">다음 보너스는 30분 후에 열려요</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>보상을 받지 못했어요`;
    }
    closeBtn.disabled = false;
    closeBtn.textContent = "확인";
    closeBtn.onclick = finish;
  });
}

function showAdTrainModal(rerender) {
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal ad-modal">
      <p class="av-title">🎁 무료 특별훈련!</p>
      <div class="ad-modal-body"><div class="ad-emoji">⏳</div>준비 중…</div>
      <div class="av-actions"><button type="button" class="btn btn-ghost ad-modal-close" disabled>잠시만요…</button></div>
    </div>`;
  document.body.appendChild(ov);
  const body = ov.querySelector(".ad-modal-body");
  const closeBtn = ov.querySelector(".ad-modal-close");
  window.Ads.rewarded((ok) => {
    if (ok) {
      const pool = statDefs().filter((x) => !atCap(x.key));
      const d = pick(pool.length ? pool : statDefs());
      let gain = rand(2.2, 4.2) * S.talents[d.key];
      if (S.stats[d.key] >= 100) gain *= 0.5;
      gain = Math.round(gain * 10) / 10;
      S.stats[d.key] = clamp(S.stats[d.key] + gain, 0, statCap(d.key));
      localStorage.setItem(AD_CD_KEY, Date.now());
      save();
      if (window.Stats) Stats.log("bonus", { type: "train" });
      body.innerHTML = `<div class="ad-emoji">${d.emoji}</div><b>${d.name} +${gain.toFixed(1)}</b> 특별훈련 완료!<br/><span class="av-note">턴을 소모하지 않는 보너스 훈련 · 다음은 30분 후</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>특별훈련에 실패했어요`;
    }
    closeBtn.disabled = false;
    closeBtn.textContent = "확인";
    closeBtn.onclick = () => { ov.remove(); if (rerender) rerender(); };
  });
}

function makeAdSlotButton(rerender) {
  const btn = document.createElement("button");
  btn.className = "action-btn ad-slot";
  const left = adCooldownLeft();
  if (left > 0) {
    btn.disabled = true;
    btn.innerHTML = `<span class="a-emoji">🎁</span>특훈<span class="a-sub">${Math.ceil(left / 60000)}분 후 가능</span>`;
  } else {
    btn.innerHTML = `<span class="a-emoji">🎁</span>특훈<span class="a-sub">30분마다 무료 훈련</span>`;
    btn.onclick = () => showAdTrainModal(rerender);
  }
  return btn;
}

// ---------- 장비 상점 ----------
const GEAR_TIERS = [
  { n: "I", bonus: 3, price: 500 },
  { n: "II", bonus: 5, price: 1500 },
  { n: "III", bonus: 8, price: 4000 },
  { n: "IV", bonus: 12, price: 10000 },
  { n: "V", bonus: 16, price: 25000 },
];
let shopReturn = "screen-main";
function statDefs() { return Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos]; }
function openShop(returnTo) {
  shopReturn = returnTo || "screen-main";
  renderShop();
  show("screen-shop");
}
function renderShop() {
  $("shop-money").textContent = `💰 보유 자금 ${fmtMoney(S.money || 0)}`;
  const box = $("shop-list");
  box.innerHTML = "";
  for (const d of statDefs()) {
    const ownedCnt = GEAR_TIERS.filter((t) => S.gear[`${d.key}-${t.n}`]).length;
    const tier = GEAR_TIERS[ownedCnt];
    const div = document.createElement("div");
    div.className = "shop-item" + (tier ? "" : " owned");
    if (tier) {
      div.innerHTML = `
        <span class="si-emoji">${d.emoji}</span>
        <div class="si-info"><div class="si-name">${d.name} 장비 ${tier.n}</div>${d.name} +${tier.bonus} · ${fmtMoney(tier.price)}</div>
        <button class="mini-btn">구매</button>`;
      div.querySelector(".mini-btn").onclick = () => {
        if ((S.money || 0) < tier.price) {
          alert("자금이 부족해요! 경기 수당이나 보너스로 모아봐요 💰");
          return;
        }
        S.money -= tier.price;
        S.gear = S.gear || {};
  S.trans = S.trans || {};
        S.gear[`${d.key}-${tier.n}`] = true;
        S.stats[d.key] = clamp(S.stats[d.key] + tier.bonus, 0, statCap(d.key));
        save();
        renderShop();
      };
    } else {
      div.innerHTML = `<span class="si-emoji">${d.emoji}</span><div class="si-info"><div class="si-name">${d.name} 장비 완비!</div>모든 티어 보유 중 ✨</div>`;
    }
    box.appendChild(div);
  }
  const left = adCooldownLeft();
  const adRow = $("ad-row");
  if (left > 0) {
    adRow.innerHTML = `<p class="av-note">🎁 다음 보너스까지 약 ${Math.ceil(left / 60000)}분 남았어요</p>`;
  } else {
    adRow.innerHTML = `<button class="btn btn-primary" id="btn-ad">🎁 30분 보너스 +200만 받기</button>`;
    $("btn-ad").onclick = () => showAdModal(200, renderShop);
  }
}

// ---------- 커리어 기록 ----------
let recordReturn = "screen-main";
function openRecord(returnTo) {
  recordReturn = returnTo || "screen-main";
  renderRecord();
  show("screen-record");
}
function renderRecord() {
  const m = marketOf();
  const trophyLine = S.trophies && S.trophies.length ? `🏆 ${S.trophies.join(", ")}` : "🏆 대회 1위 경력 없음";
  const y = S.youth || { g: 0, a: 0, def: 0 };
  let curHtml = "";
  if (S.activity) {
    const act = S.activity;
    const rec = act.teamW != null ? ` · ${act.teamW}승 ${act.teamD}무 ${act.teamL}패` : "";
    curHtml = `<br/><b>🔥 진행 중인 시즌</b><br/>${["전반기", "후반기"][act.cb - 1] || act.cb + "차"} · ${act.week}/${act.weekTotal}R 소화${rec}<br/>⚽ 골 ${act.goals || 0} · 🅰️ 도움 ${act.assists || 0} · 🛡️ 수비 ${act.defense || 0} · 🏅 MOM ${act.wins}회<br/>`;
  }
  let proHtml = "";
  if (S.career && S.career.years && S.career.years.length) {
    const rows = S.career.years.map((x) =>
      `<tr><td>${x.y}시즌</td><td>${x.apps != null ? x.apps : "-"}</td><td>${x.goals != null ? x.goals : "-"}</td><td>${x.assists != null ? x.assists : "-"}</td><td>${x.defense != null ? x.defense : "-"}</td><td>${x.awards && x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    const cr = S.career;
    proHtml = `
      <table class="season-table"><thead><tr><th>시즌</th><th>출전</th><th>⚽골</th><th>🅰️도움</th><th>🛡️수비</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div>통산 ${cr.years.length}시즌 · 출전 ${cr.apps || 0}경기 · ⚽ ${cr.goals || 0}골 · 🅰️ ${cr.assists || 0}도움 · 🛡️ 수비 ${cr.defense || 0} · 🏅 MOM ${cr.wins}회<br/>🏆 MVP ${cr.daesang} · 베스트11 ${cr.bonsang}${cr.rookie ? " · 신인왕" : ""}</div>`;
  }
  const gearList = STAT_DEFS
    .map((d) => {
      const owned = GEAR_TIERS.filter((t) => S.gear && S.gear[`${d.key}-${t.n}`]).length;
      return owned ? `${d.emoji}${"★".repeat(owned)}` : null;
    })
    .filter(Boolean)
    .join(" ");
  $("record-card").innerHTML = `
    <div class="draft-emoji">⚽</div>
    <div class="draft-title">${S.name}</div>
    <div class="draft-team">${S.phase === "soccer-pro" ? `${S.group}${S.center ? " · 주장" : ""} · ${S.proYear}시즌` : `${m.emoji} ${m.name} 유망주 ${S.year}년차`} · ${POS_INFO[S.pos].name}</div>
    <div class="draft-summary">
      <b>🌱 유스 기록</b><br/>출전 ${S.stages || 0}경기 · ⚽ ${y.g}골 · 🅰️ ${y.a}도움 · 🛡️ 수비 ${y.def}<br/>⭐ 명성 ${Math.round(S.fandom)}<br/>${trophyLine}<br/>
      ${curHtml}
      ${proHtml ? `<br/><b>⚽ 프로 기록</b>${proHtml}<br/>` : ""}
      ${gearList ? `<br/><b>🛍️ 보유 장비</b> ${gearList}` : ""}
    </div>`;
}
$("btn-record-main")?.addEventListener("click", () => openRecord("screen-main"));
$("btn-record-pro")?.addEventListener("click", () => openRecord("screen-pro"));
$("btn-record-back")?.addEventListener("click", () => show(recordReturn));

$("btn-shop-main")?.addEventListener("click", () => openShop("screen-main"));
$("btn-shop-pro")?.addEventListener("click", () => openShop("screen-pro"));
$("btn-shop-back")?.addEventListener("click", () => {
  show(shopReturn);
  if (shopReturn === "screen-main") renderMain();
  else {
    const c = window.WingerCareer;
    if (c && c.refreshPro) c.refreshPro();
  }
});

// ---------- 시작 흐름 ----------
let chosenMarket = null;
let chosenPos = null;

function initTitle() {
  if (Object.keys(loadSlots()).length) {
    $("btn-continue").classList.remove("hidden");
    $("btn-continue").onclick = showSlotPicker;
  }
  $("btn-new").onclick = () => {
    renderMarkets();
    show("screen-agency");
  };
  if (window.Match && Match.enabled()) {
    Match.count("soccer").then((n) => {
      if (n) {
        $("title-count").innerHTML = `⚽ 지금까지 <b>${n.toLocaleString()}명</b>의 유망주가 그라운드를 밟았어요!`;
        $("title-count").classList.remove("hidden");
      }
    });
  }
}

function resumeSlot(id) {
  const sl = loadSlots();
  if (!sl[id]) return;
  curSlot = id;
  S = sl[id];
  S.money = S.money || 0;
  S.gear = S.gear || {};
  if (S.phase === "soccer-pro" && window.WingerCareer) {
    window.WingerCareer.showActivity();
  } else {
    renderMain();
    show("screen-main");
  }
}

function slotDesc(st) {
  const posName = POS_INFO[st.pos] ? POS_INFO[st.pos].name : "";
  if (st.phase === "soccer-pro") return `⚽ ${st.group || "프로팀"} · ${st.proYear || 1}시즌${st.center ? " · 주장" : ""}`;
  const m = MARKETS.find((x) => x.id === st.market);
  return `${m ? m.emoji + " " + m.name : ""} 유망주 ${st.year}년차 · ${posName}`;
}

function showSlotPicker() {
  const sl = loadSlots();
  const ids = Object.keys(sl).sort((a, b) => (sl[b].savedAt || 0) - (sl[a].savedAt || 0));
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal slot-modal">
      <p class="av-title">👥 어떤 선수로 이어할까요?</p>
      <div class="slot-list">${ids.map((id) => {
        const st = sl[id];
        const d = st.savedAt ? new Date(st.savedAt) : null;
        return `
          <div class="slot-row">
            <button type="button" class="slot-go" data-id="${id}">
              <span class="slot-avatar slot-emoji">⚽</span>
              <span class="slot-info">
                <b>${st.name}</b>
                <span>${slotDesc(st)}</span>
                ${d ? `<span class="slot-date">${d.getMonth() + 1}/${d.getDate()} 저장</span>` : ""}
              </span>
            </button>
            <button type="button" class="slot-del" data-id="${id}" aria-label="삭제">🗑️</button>
          </div>`;
      }).join("")}</div>
      <div class="av-actions"><button type="button" class="btn btn-ghost slot-close">닫기</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector(".slot-close").onclick = () => ov.remove();
  ov.querySelectorAll(".slot-go").forEach((b) => {
    b.onclick = () => { ov.remove(); resumeSlot(b.dataset.id); };
  });
  ov.querySelectorAll(".slot-del").forEach((b) => {
    b.onclick = () => {
      const st = sl[b.dataset.id];
      if (!confirm(`${st ? st.name : "이 선수"}의 저장을 삭제할까요? 되돌릴 수 없어요!`)) return;
      const cur = loadSlots();
      delete cur[b.dataset.id];
      saveSlots(cur);
      ov.remove();
      if (Object.keys(cur).length) showSlotPicker();
      else $("btn-continue").classList.add("hidden");
    };
  });
}

function renderMarkets() {
  const box = $("agency-list");
  box.innerHTML = "";
  const starBar = (v, vals) => { const lo = Math.min(...vals), hi = Math.max(...vals); const n = hi === lo ? 3 : Math.min(5, Math.max(1, 1 + Math.round(((v - lo) / (hi - lo)) * 4))); return "★".repeat(n) + "☆".repeat(5 - n); };
  const GVALS = MARKETS.map((x) => x.growth), DVALS = MARKETS.map((x) => x.debut);
  for (const m of MARKETS) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.innerHTML = `
      <span class="card-emoji">${m.emoji}</span>
      <span class="card-title">${m.name}</span>
      <span class="card-sub">${m.tier}</span>
      <span class="card-desc">${m.desc}</span>
      <span class="card-tags">
        <span class="tag">성장 ${starBar(m.growth, GVALS)}</span>
        <span class="tag">안정성 ${starBar(m.debut, DVALS)}</span>
      </span>`;
    btn.onclick = () => {
      chosenMarket = m;
      $("position-hint").textContent = `${m.name} 입단! 어떤 포지션으로 뛸까요?`;
      show("screen-position");
    };
    box.appendChild(btn);
  }
}

document.querySelectorAll("#position-list .card").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenPos = btn.dataset.pos;
    $("name-hint").textContent = `${chosenMarket.name} ${POS_INFO[chosenPos].name} 유망주의 이름은?`;
    $("input-name").value = pick(PLAYER_NAMES);
    pendingRoll = rollStats(chosenPos);
    show("screen-name");
    renderRoll();
  });
});

$("btn-random-name").addEventListener("click", () => {
  $("input-name").value = pick(PLAYER_NAMES);
});

$("btn-start").addEventListener("click", () => {
  const name = $("input-name").value.trim() || pick(PLAYER_NAMES);
  curSlot = null;
  if (window.Stats) Stats.log("new_player", { pos: chosenPos, agency: chosenMarket.name });
  if (window.Match) Match.register("soccer", name);
  S = newState(chosenMarket, chosenPos, name, pendingRoll);
  addLog(`⚽ ${chosenMarket.name} 입단! ${name}의 축구 인생이 시작됐어요.`);
  save();
  renderMain();
  show("screen-main");
});

// ---------- 메인 렌더 ----------
function renderMain() {
  const m = marketOf();
  $("hud-name").textContent = `${S.name} (${POS_INFO[S.pos].name})`;
  $("hud-school").textContent = `${m.emoji} ${m.name} · 종합 ${Math.round(overall())}`;
  $("hud-turn").textContent = `${S.year}년차 ${S.month}월`;

  $("hud-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
  $("cond-num").textContent = Math.round(S.condition);
  const condBar = $("cond-bar");
  condBar.style.width = `${S.condition}%`;
  condBar.classList.toggle("low", S.condition < 35);

  const pct = clamp((S.fandom / 450) * 100, 0, 100);
  $("scout-num").textContent = Math.round(S.fandom);
  $("scout-bar").style.width = `${pct}%`;

  const statsBox = $("stats-box");
  statsBox.innerHTML = "";
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
      <span class="stat-pot" title="잠재력 — 별이 많을수록 훈련 효율이 높아요">${stars}</span>`;
    if (v >= 100) {
      const aw = document.createElement("button");
      aw.className = "mini-btn awaken-btn" + (v >= statCap(d.key) ? " ready" : "");
      aw.textContent = isTalentMax(tv) ? "🌠 초월" : "🔮 각성";
      aw.onclick = () => { if (awakenTalent(d.key, addLog)) renderMain(); };
      row.appendChild(aw);
    }
    statsBox.appendChild(row);
  }

  const actBox = $("action-list");
  actBox.innerHTML = "";
  for (const d of STAT_DEFS) {
    const btn = document.createElement("button");
    // 상한에 닿았으면 훈련 대신 각성에 도전해요 (턴 낭비 방지)
    if (atCap(d.key)) {
      const tmax = isTalentMax(S.talents[d.key]);
      const pct = Math.round((tmax ? transP(transLv(d.key)) : awakenP(Math.round(S.stats[d.key]))) * 100);
      btn.dataset.key = d.key;
      btn.className = "action-btn awaken-act";
      btn.innerHTML = `<span class="a-emoji">${tmax ? "🌠" : "🔮"}</span>${d.name} ${tmax ? "초월 각성" : "재능 각성"}<span class="a-sub">상한 ${statCap(d.key)} 도달 · 성공률 ${pct}%</span>`;
      btn.onclick = () => { if (awakenTalent(d.key, addLog)) renderMain(); };
    } else {
      btn.dataset.key = d.key;
      btn.className = "action-btn";
      btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
      btn.onclick = () => doTraining(d);
    }
    actBox.appendChild(btn);
  }
  actBox.appendChild(makeAdSlotButton(renderMain));
  const rest = document.createElement("button");
  rest.className = "action-btn rest";
  rest.dataset.key = "__rest";
  rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 대폭 회복</span>`;
  rest.onclick = doRest;
  actBox.appendChild(rest);

  // 대회일 — 훈련 잠그고 출전 버튼만 (🎁 특훈은 턴 미소모라 허용)
  if (S.pendingStage) {
    actBox.querySelectorAll(".action-btn").forEach((b) => {
      if (!b.classList.contains("ad-slot")) b.disabled = true;
    });
    const ps = S.pendingStage;
    const go = document.createElement("button");
    go.className = "action-btn rest go-game";
    go.innerHTML = ps.kind === "survival"
      ? `<span class="a-emoji">🔥</span>프로 도전 시작!<span class="a-sub">3년의 훈련이 여기서 판가름나요</span>`
      : `<span class="a-emoji">🏆</span>${ps.name} 출전!<span class="a-sub">유스 대회 준비 완료</span>`;
    go.onclick = () => {
      const kind = ps.kind, name = ps.name;
      S.pendingStage = null;
      save();
      renderMain();
      if (kind === "survival") startSurvival();
      else startEval(name);
    };
    actBox.appendChild(go);
  }

  renderLog();
}

function addLog(msg) {
  S.log.unshift(`[${S.year}년차 ${S.month}월] ${msg}`);
  S.log = S.log.slice(0, 40);
}

function renderLog() {
  $("log-box").innerHTML = S.log
    .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
    .join("");
}

// ---------- 행동 ----------
// 버튼을 누르면 화면이 통째로 다시 그려져서 눌린 흔적이 남지 않아요.
// 그래서 결과(증감치)를 버튼 위에 띄워 눌린 걸 분명히 보여줍니다.
// 화면이 바뀌었으면(대회·시즌 등) Fx.tap이 알아서 넘어가요.
// 한 번의 행동에 화면이 여러 번 다시 그려져요
// (endMonth → renderMain → advanceMonth → renderMain). 바로 붙이면 다음 렌더가
// 지워버리니, 이번 턴 렌더가 전부 끝난 뒤(다음 태스크)에 붙입니다.
// 그 사이 다른 화면으로 넘어갔으면 버튼이 없어서 Fx.tap이 조용히 넘어가요.
function actFx(key, text, bad) {
  setTimeout(() => {
    if (!window.Fx) return;
    // 같은 key의 버튼이 육성 화면과 프로 화면 양쪽에 있어요.
    // 지금 보이는 화면에서 먼저 찾아야 숨은 버튼에 붙지 않아요.
    const sel = `.action-btn[data-key="${key}"]`;
    const el = document.querySelector(`.screen.active ${sel}`) || document.querySelector(sel);
    Fx.tap(el, text, bad ? "bad" : "good");
  }, 0);
}
function doTraining(def) {
  // 상한에 닿았으면 훈련은 턴만 소모돼요 — 각성으로 돌려줍니다
  if (atCap(def.key)) { if (awakenTalent(def.key, addLog)) renderMain(); return; }
  const m = marketOf();

  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🤕 지친 몸으로 무리하다 ${def.name} 훈련 중 잔부상. 한 달을 회복으로 날렸어요.`);
    actFx(def.key, "🤕 부상", true);
    endMonth();
    return;
  }

  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 훈련이 영 안 풀렸어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
    actFx(def.key, "-" + loss.toFixed(1), true);
    maybeEvent();
    endMonth();
    return;
  }

  const condMod = S.condition >= 70 ? 1.15 : S.condition >= 40 ? 1.0 : 0.6;
  const buffMod = S.buff ? 1.5 : 1.0;
  S.buff = false;
  let gain = rand(2.2, 4.2) * S.talents[def.key] * m.growth * condMod * buffMod;
  if (S.stats[def.key] >= 100) gain *= 0.5;
  gain = Math.round(gain * 10) / 10;
  S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, statCap(def.key));
  S.condition = clamp(S.condition - randInt(12, 18), 0, 100);
  addLog(`${def.emoji} ${def.name} 훈련 완료! +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);
  actFx(def.key, "+" + gain.toFixed(1));

  maybeEvent();
  endMonth();
}

function doRest() {
  const condBefore = S.condition;
  S.condition = clamp(S.condition + randInt(30, 42), 0, 100);
  S.stats.stamina = clamp(S.stats.stamina + 0.5, 0, statCap("stamina"));
  addLog(`🛌 푹 쉬었어요. 컨디션 회복! (${Math.round(S.condition)})`);
  actFx("__rest", "컨디션 +" + Math.round(S.condition - condBefore));
  maybeEvent();
  endMonth();
}

function maybeEvent() {
  if (Math.random() > 0.3) return;
  const m = marketOf();
  const events = [
    () => {
      const d = pick(STAT_DEFS);
      S.stats[d.key] = clamp(S.stats[d.key] + 3, 0, statCap(d.key));
      addLog(`🧑‍🏫 감독님의 특별 개인지도! ${d.name} +3`);
    },
    () => {
      const pts = Math.round(8 * m.spot);
      S.fandom += pts;
      addLog(`📱 연습 경기 하이라이트가 화제! 명성 +${pts}`);
    },
    () => {
      S.condition = clamp(S.condition - 20, 0, 100);
      addLog(`🤕 가벼운 근육 뭉침으로 며칠 쉬었어요. 컨디션 -20`);
    },
    () => {
      S.condition = clamp(S.condition + 12, 0, 100);
      addLog(`🥗 영양사가 짜준 식단으로 몸이 가벼워요! 컨디션 +12`);
    },
    () => {
      S.buff = true;
      addLog(`🔥 라이벌의 활약에 승부욕이 불타올라요! 다음 훈련 효율 1.5배`);
    },
    () => {
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, statCap("stamina"));
      addLog(`🏃 새벽 러닝이 몸에 붙었어요. 체력 +2`);
    },
    () => {
      S.fandom = Math.max(0, S.fandom - 10);
      addLog(`📉 경기 실수 장면이 짤로 돌아요… 명성 -10`);
    },
  ];
  pick(events)();
}

// ---------- 월 진행 ----------
function endMonth() {
  if (S.year === 3 && S.month === 12) {
    S.pendingStage = { kind: "survival" };
  } else if (EVALS[S.month]) {
    S.pendingStage = { kind: "eval", name: EVALS[S.month] };
  }
  save();
  renderMain();
  if (S.pendingStage) return;
  advanceMonth();
}

function advanceMonth() {
  S.month += 1;
  if (S.month === 13) {
    S.month = 1;
    S.year += 1;
  }
  save();
  renderMain();
}

// ---------- 경기 공통 ----------
function stageScore(type) {
  const mainKey = type.main || POS_INFO[S.pos].stat;
  const score =
    S.stats[mainKey] * 0.55 +
    S.stats[type.aux] * 0.2 +
    S.stats.stamina * 0.1 +
    S.condition / 8 +
    rand(-9, 9);
  return { mainKey, score };
}

const GRADE_ORDER = ["D", "C", "B", "A", "S"];
const GRADE_INFO = {
  S: { pts: 30, txt: "🌟 완벽한 경기! 그라운드를 완전히 지배했어요." },
  A: { pts: 22, txt: "🔥 인상적인 활약! 관중석이 들썩였어요." },
  B: { pts: 15, txt: "🙂 무난한 경기. 제 몫을 해냈어요." },
  C: { pts: 9, txt: "😬 아쉬운 장면이 몇 번 있었어요." },
  D: { pts: -5, txt: "😢 부진한 경기… 전반에 교체되고 말았어요." },
};
const makeGrade = (g) => ({ g, ...GRADE_INFO[g] });

function gradeOf(score) {
  if (score >= 76) return makeGrade("S");
  if (score >= 64) return makeGrade("A");
  if (score >= 52) return makeGrade("B");
  if (score >= 40) return makeGrade("C");
  return makeGrade("D");
}

// ---------- 경기 스탯(골·도움·수비) & 스코어 산출 ----------
// 간이 포아송 샘플러 — 골/도움 수 같은 이산 이벤트에 자연스러운 분포를 줘요
function poissonish(lam) {
  let n = 0, L = Math.exp(-Math.max(0, lam)), p = 1;
  do { p *= Math.random(); n++; } while (p > L && n < 12);
  return n - 1;
}
// rating(평점 0~10대) → 이번 경기 골·도움·수비 (포지션별 가중)
function matchContribution(rating) {
  const perf = clamp((rating - 5) / 4 + 0.6, 0.15, 1.6);
  /* 윙어는 돌파로 기회를 만들어요. 골·도움 판정에 드리블이 함께 작용합니다.
   * 예전에는 드리블이 어디에도 안 들어가서, 윙어만 자기 주 스탯에 투자할수록
   * 성적이 나빠졌어요 (도달 가능 범위에서 재보니 85% → 32%). */
  const isWg = S.pos === "wg";
  const gStat = isWg ? (S.stats.shoot || 40) * 0.6 + (S.stats.dribble || 40) * 0.4 : (S.stats.shoot || 40);
  const aStat = isWg ? (S.stats.pass || 40) * 0.6 + (S.stats.dribble || 40) * 0.4 : (S.stats.pass || 40);
  const shootF = gStat / 100;
  const passF = aStat / 100;
  const defF = (S.stats.defense || 40) / 100;
  const G = { fw: 1.05, wg: 0.75, mf: 0.5, df: 0.14 };
  const A = { mf: 0.95, wg: 0.85, fw: 0.55, df: 0.28 };
  const D = { df: 2.3, mf: 1.2, wg: 0.5, fw: 0.45 };
  const gLam = (G[S.pos] ?? 0.4) * perf * (0.55 + shootF);
  const aLam = (A[S.pos] ?? 0.4) * perf * (0.55 + passF);
  const dLam = (D[S.pos] ?? 0.6) * perf * (0.55 + defF);
  return { g: poissonish(gLam), a: poissonish(aLam), def: poissonish(dLam) };
}
/* 동료 득점 — 예전에는 팀 득점이 내 골 + 내 도움뿐이라 동료가 넣는 골이 없었어요.
 * 수비수는 골·도움 기댓값이 낮아서 팀이 득점을 못 했고, 능력치 70에서
 * 팀 승률이 7%였습니다 (같은 조건 공격수 51%).
 * 내 포지션이 공격에서 멀수록 동료가 더 넣어요. 값은 시뮬레이션으로 잡았어요.
 * 이 골은 act.goals에 안 들어가요 — 내 골이 아니니까요. 수상 축은 그대로입니다. */
const TEAMMATE_GOALS = { fw: 0.35, wg: 0.5, mf: 0.8, df: 2.2 };

function teammateGoals(rating) {
  // 전력 70이 기준이에요. 좋은 팀은 동료가 더 넣습니다.
  const strF = clubStrOf(S) / 70;
  const base = (TEAMMATE_GOALS[S.pos] ?? 0.6) * (0.6 + (rating - 5) * 0.14) * strF;
  return poissonish(Math.max(0, base));
}
// 내 골 수 & 평점에 어울리는 팀 스코어(우리:상대)와 승부 결과
function matchScoreline(myGoals, rating) {
  let tf = myGoals + randInt(0, 2);
  const strength = clamp((rating - 5) / 5 + ((S.stats.defense || 40) - 50) / 120, -0.6, 0.9);
  const winP = clamp(0.45 + strength * 0.4, 0.15, 0.82);
  const roll = Math.random();
  let ta, res;
  if (roll < winP) { ta = randInt(0, Math.max(0, tf - 1)); res = "W"; }
  else if (roll < winP + 0.22) { ta = tf; res = "D"; }
  else { ta = tf + randInt(1, 2); res = "L"; }
  return { tf, ta, res };
}
const RES_LABEL = { W: "승리 🎉", D: "무승부 🤝", L: "패배 💧" };
// 골/도움/수비 이벤트를 분(') 마커와 함께 FM식 피드 라인으로
function matchEventFeeds(c, oppName, tf, ta) {
  const mins = [];
  for (let i = 0; i < c.g; i++) mins.push({ min: randInt(3, 90), text: `⚽ 골!! ${S.name} 득점`, cls: "good" });
  for (let i = 0; i < c.a; i++) mins.push({ min: randInt(3, 90), text: `🅰️ 도움! ${S.name}의 결정적 패스`, cls: "good" });
  if (S.pos === "df" && c.def >= 3 && ta === 0) mins.push({ min: randInt(60, 90), text: `🛡️ 완벽한 클린시트! 뒷문을 걸어 잠갔어요`, cls: "good" });
  else if (c.def >= 2) mins.push({ min: randInt(20, 85), text: `🛡️ 결정적 태클·차단 ${c.def}회로 위기를 막아요`, cls: "" });
  const oppGoals = Math.max(0, ta);
  for (let i = 0; i < Math.min(oppGoals, 2); i++) mins.push({ min: randInt(3, 90), text: `😣 ${oppName} 실점…`, cls: "bad" });
  mins.sort((x, y) => x.min - y.min);
  return mins.map((e) => ({ text: `${e.min}' ${e.text}`, cls: e.cls }));
}

// ---------- 경기 연출 ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MOMENTS = {
  shoot: {
    good: ["날카로운 침투 후 마무리! ⚽", "골키퍼 타이밍을 뺏는 슛! ✨", "환상적인 감아차기가 골망을 흔들어요 🎯"],
    bad: ["결정적 찬스에서 살짝 빗맞았어요 😬", "슈팅 각도가 아쉬웠어요 💦"],
  },
  pass: {
    good: ["전방을 꿰뚫는 스루패스! 🎯", "한 번의 터치로 흐름을 바꿔요 ✨", "정확한 크로스가 득점 기회로! 🔥"],
    bad: ["패스가 살짝 길었어요 😬", "연결이 한 박자 늦었어요 💦"],
  },
  defense: {
    good: ["완벽한 태클로 위기를 끊어요! 🛡️", "상대 에이스를 완전히 지웠어요 ✨", "몸을 던진 블로킹! 🔥"],
    bad: ["뒷공간을 살짝 내줬어요 😬", "커버 타이밍이 늦었어요 💦"],
  },
  dribble: {
    good: ["현란한 개인기로 수비를 벗겨내요! 🏃", "폭발적인 스피드로 측면을 돌파! ⚡", "환상적인 드리블에 관중이 열광해요 🔥"],
    bad: ["무리한 드리블이 끊겼어요 😬", "볼 컨트롤이 살짝 흔들렸어요 💦"],
  },
};

// 경기 승부처 미니게임 — 슛/파워/패스연계/반응/드리블 5종 랜덤
const SOCCER_BAR = { ok: "✨ 침착하게 마무리했어요", great: "💫 완벽한 타이밍, 골망을 흔드는 슛!!", bad: "😱 급하게 차다 골대를 벗어났어요" };
const SOCCER_HOLD = { ok: "⚽ 알맞은 파워로 정확한 슛!", great: "💥 완벽하게 실은 강슛, 골키퍼도 손 못 써!!", bad: "😵 힘이 과해 크로스바를 넘겼어요" };
const SOCCER_SEQ = { ok: "🎯 패스 연계를 정확히 이어갔어요", great: "🌟 원터치 연계로 수비를 완전히 무너뜨렸다!!", bad: "🙈 연계 타이밍이 어긋났어요" };
const SOCCER_REACT = { ok: "🛡️ 결정적 순간에 바로 반응했어요", great: "⚡ 번개 같은 반응으로 실점을 막았다!!", bad: "😵 한 박자 늦어 뒷공간을 내줬어요" };
const SOCCER_DUEL = { ok: "🧠 수비수의 무게중심을 뺏었어요", great: "🎯 완벽한 페인트로 제쳐냈다!!", bad: "🙈 수비수에게 공을 뺏겼어요" };
const miniZone = (stat) => clamp(13 + stat * 0.22 + (S.condition - 50) * 0.08, 10, 40);

const autoMiniOn = () => localStorage.getItem("grow-auto-mini") === "1";
function autoRes(stat) {
  const pPerfect = clamp(0.12 + stat * 0.003 + (S.condition - 50) * 0.001, 0.08, 0.5);
  const pMiss = clamp(0.4 - stat * 0.002, 0.08, 0.4);
  const r = Math.random();
  return r < pPerfect ? "perfect" : r < pPerfect + pMiss ? "miss" : "good";
}
{
  const chk = $("auto-mini");
  if (chk) {
    chk.checked = autoMiniOn();
    chk.onchange = () => localStorage.setItem("grow-auto-mini", chk.checked ? "1" : "0");
  }
}

function playRandomMini(container, cb) {
  const posStat = POS_INFO[S.pos].stat;
  const mech = pick(["bar", "hold", "seq", "react", "duel", "target", "drop", "odd"]);
  if (mech === "bar") {
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), SOCCER_BAR); return; }
    window.Timing.play(container, {
      label: "🎯 슛 찬스! 초록 존에서 슈팅!",
      button: "슛! ⚽",
      zonePct: miniZone(S.stats[posStat]),
    }, (res) => cb(res, SOCCER_BAR));
  } else if (mech === "hold") {
    if (autoMiniOn()) { cb(autoRes(S.stats.stamina), SOCCER_HOLD); return; }
    window.Timing.hold(container, {
      label: "💪 강슛 장전! 꾹 눌러 파워를 모으고 초록 존에서 슛!",
      button: "슛! ⚽",
      zonePct: miniZone(S.stats.stamina),
    }, (res) => cb(res, SOCCER_HOLD));
  } else if (mech === "seq") {
    if (autoMiniOn()) { cb(autoRes(S.stats.pass), SOCCER_SEQ); return; }
    window.Timing.sequence(container, {
      label: "🎯 패스 연계! 순서를 기억했다가 그대로!",
      icons: ["⚽", "🎯", "🏃", "🥅"],
      showMs: 900 + S.stats.pass * 6 + (S.condition - 50) * 3,
    }, (res) => cb(res, SOCCER_SEQ));
  } else if (mech === "react") {
    if (autoMiniOn()) { cb(autoRes(S.stats.defense), SOCCER_REACT); return; }
    window.Timing.reaction(container, {
      label: "🛡️ 결정적 순간! 신호가 켜지면 즉시 반응!",
      button: "커트!! 🛡️",
      perfectMs: 300 + S.stats.defense * 1.5,
      goodMs: 700 + S.stats.defense * 2.5,
    }, (res) => cb(res, SOCCER_REACT));
  } else if (mech === "target") {
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), SOCCER_REACT); return; }
    window.Timing.target(container, {
      label: "🎯 슛 찬스 러시! 튀어나오는 기회를 놓치지 말고 탭!",
      icon: "⚽", count: 3, lifeMs: 800 + Math.min(S.stats[posStat], 130) * 3,
    }, (res) => cb(res, SOCCER_REACT));
  } else if (mech === "drop") {
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), SOCCER_BAR); return; }
    window.Timing.drop(container, {
      label: "⚽ 트래핑! 떨어지는 공을 초록 존에서 딱 잡아 슛!",
      icon: "⚽", zonePct: miniZone(S.stats[posStat]),
    }, (res) => cb(res, SOCCER_BAR));
  } else if (mech === "odd") {
    if (autoMiniOn()) { cb(autoRes(S.stats.dribble), SOCCER_DUEL); return; }
    window.Timing.odd(container, {
      label: "👀 수비 빈틈 포착! 다른 하나를 빠르게 찾아 탭!",
      rounds: 2, sets: [["🧍", "🏃"], ["🥅", "⚽"], ["🟩", "🟢"]],
    }, (res) => cb(res, SOCCER_DUEL));
  } else {
    if (autoMiniOn()) { cb(autoRes(S.stats.dribble), SOCCER_DUEL); return; }
    window.Timing.duel(container, {
      label: "🧠 1:1 드리블! 수비수를 어디로 제칠까?",
      choices: ["왼쪽", "가운데", "오른쪽"],
      hintChance: clamp((S.stats.dribble - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, (res) => cb(res, SOCCER_DUEL));
  }
}

// 평점·수비력으로 상대 실점 수를 산출
function deriveOppGoals(rating, defStat) {
  // 전력 70이 기준이에요. 좋은 팀은 덜 먹습니다.
  const strAdj = (clubStrOf(S) - 70) / 100;
  const base = 2.4 - (rating - 5) * 0.28 - (defStat / 100) * 1.4 - strAdj + rand(-0.3, 0.9);
  return Math.max(0, Math.min(4, Math.round(base)));
}

// ---------- 경기 시뮬레이션 뷰 (스코어보드 + 미니 필드 + 중계) ----------
// 유스/프로 경기 공통. #stage-card 안에 렌더하고 #btn-stage-next를 재사용해요.
const MatchSim = (() => {
  let timer = null;
  function run(cfg) {
    const { home, away, myName, goals, assists, defense, oppGoals } = cfg;
    clearInterval(timer);
    $("stage-card").innerHTML = `
      <div class="msim">
        <div class="scoreboard">
          <span class="sb-team home">${home}</span>
          <span class="sb-score"><b id="sb-h">0</b><i>:</i><b id="sb-a">0</b></span>
          <span class="sb-team away">${away}</span>
        </div>
        <div class="sb-clock">⏱ <span id="sb-min">0</span>'</div>
        <div class="pitch">
          <span class="pitch-mid"></span>
          <span class="net left">🥅</span><span class="net right">🥅</span>
          <span class="ball" id="ball">⚽</span>
        </div>
        <div class="pbp" id="pbp"></div>
        <div id="stage-moment"></div>
        <div id="stage-result"></div>
      </div>`;
    let h = 0, a = 0;
    const setScore = () => { $("sb-h").textContent = h; $("sb-a").textContent = a; };
    const setMin = (m) => { const el = $("sb-min"); if (el) el.textContent = m; };
    const moveBall = (side) => {
      const b = $("ball"); if (!b) return;
      b.style.left = (side === "atk" ? 82 : side === "def" ? 18 : 50) + "%";
      b.style.top = (26 + Math.random() * 46) + "%";
    };
    const flash = (side) => {
      const p = document.querySelector(".msim .pitch"); if (!p) return;
      p.classList.remove("goal-h", "goal-a"); void p.offsetWidth;
      p.classList.add(side === "atk" ? "goal-h" : "goal-a");
    };
    const feed = (text, cls) => {
      const d = document.createElement("div");
      if (cls) d.className = cls;
      d.textContent = text;
      $("pbp").appendChild(d);
      $("pbp").scrollTop = $("pbp").scrollHeight;
    };

    // 골·실점·기타 이벤트를 분(') 순으로 배치
    const evs = [];
    const rmin = () => randInt(6, 82);
    for (let i = 0; i < goals; i++) evs.push({ min: rmin(), side: "atk", h: 1, cls: "good", text: `⚽ 골!! ${myName} 득점!` });
    for (let i = 0; i < assists; i++) evs.push({ min: rmin(), side: "atk", h: 1, cls: "good", text: `🅰️ ${myName}의 도움! 팀 추가골` });
    /* 동료 골이에요. 평점을 안 넘겨준 호출부(유스 등)에서는 0이 되도록 막아뒀어요. */
    const mates = cfg.rating != null ? teammateGoals(cfg.rating) : 0;
    for (let i = 0; i < mates; i++)
      evs.push({ min: rmin(), side: "atk", h: 1, cls: "good", text: `⚽ 동료의 골! 팀이 추가점을 뽑아냅니다` });
    for (let i = 0; i < oppGoals; i++) evs.push({ min: rmin(), side: "def", a: 1, cls: "bad", text: `😣 ${away}에 실점…` });
    if (defense >= 2) evs.push({ min: rmin(), side: "def", text: `🛡️ ${myName}, 결정적 태클로 위기를 끊어요!` });
    evs.push({ min: rmin(), side: "mid", text: pick(["중원 싸움이 뜨거워요", "빠른 템포로 오가는 공방", "관중석이 들썩입니다", "양 팀 압박이 매섭습니다"]) });
    evs.sort((x, y) => x.min - y.min);
    const momentMin = Math.min(88, Math.max(78, (evs.length ? evs[evs.length - 1].min : 60) + 4));

    let i = 0, momentDone = false, finished = false;
    const btn = $("btn-stage-next");

    const applyEvent = (e) => {
      setMin(e.min); moveBall(e.side);
      if (e.h) { h += 1; setScore(); flash("atk"); }
      if (e.a) { a += 1; setScore(); flash("def"); }
      feed(e.text, e.cls);
    };
    const step = () => {
      if (i >= evs.length) { clearInterval(timer); moment(); return; }
      applyEvent(evs[i++]);
    };

    function moment() {
      if (momentDone) return;
      momentDone = true;
      clearInterval(timer);
      setMin(momentMin); moveBall("atk");
      feed("🔥 결정적인 순간이 찾아와요…!", "good");
      btn.disabled = true;
      btn.textContent = "🔥 승부처!";
      playRandomMini($("stage-moment"), (res, mtype) => {
        if (res === "perfect") {
          h += 1; setScore(); flash("atk");
          feed(mtype.great, "good");
          feed(`🌟 극장골!! ${myName}, 결정적인 한 방을 꽂아요!`, "good");
        } else if (res === "miss") {
          a += 1; setScore(); flash("def");
          feed(mtype.bad, "bad");
          feed(`😱 치명적인 실수… ${away}에 한 점을 내줍니다`, "bad");
        } else {
          feed(mtype.ok);
        }
        setMin(90);
        feed("삐— 경기 종료 휘슬! 🔔");
        finish(res);
      });
    }

    function finish(momentRes) {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      const res = h > a ? "W" : h < a ? "L" : "D";
      const info = {
        home, away,
        myGoals: goals + (momentRes === "perfect" ? 1 : 0),
        assists, defense,
        teamGoals: h, oppGoals: a, res, momentRes,
      };
      const out = cfg.finalize(info);
      $("stage-result").innerHTML = out.resultHTML;
      btn.disabled = false;
      btn.textContent = out.nextLabel;
      btn.onclick = out.nextFn;
    }

    setScore(); setMin(0); moveBall("mid");
    feed(`🏟️ ${home} vs ${away} — 킥오프!`);
    btn.textContent = "⏩ 빨리감기";
    btn.disabled = false;
    btn.onclick = () => {
      if (momentDone || finished) return;
      clearInterval(timer);
      while (i < evs.length) applyEvent(evs[i++]);
      moment();
    };
    timer = setInterval(step, 780);
  }
  return { run };
})();

// 유스 경기(평가전/트라이아웃) — MatchSim로 시뮬레이션
function renderStageSim(type, grade, onFinal) {
  const gradeRating = { S: 8.4, A: 7.2, B: 6.1, C: 4.9, D: 3.7 }[grade.g] || 6;
  const rating = clamp(gradeRating + rand(-0.5, 0.5), 1, 10);
  const c = matchContribution(rating);
  const oppGoals = deriveOppGoals(rating, S.stats.defense);
  MatchSim.run({
    home: "우리 유스",
    away: pick(oppClubs(S)),
    myName: S.name,
    goals: c.g, assists: c.a, defense: c.def, oppGoals, rating,
    finalize: (info) => {
      let gi = GRADE_ORDER.indexOf(grade.g);
      if (info.momentRes === "perfect") gi = Math.min(4, gi + 1);
      else if (info.momentRes === "miss") gi = Math.max(0, gi - 1);
      return onFinal(makeGrade(GRADE_ORDER[gi]), info);
    },
  });
}

// ---------- 유스 대회 ----------
function startEval(name) {
  ev = { kind: "eval", name, idx: 0, totalPts: 0, scores: [] };
  $("stage-title").textContent = `🏆 ${S.year}년차 ${name}`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">⚽ 전 유망주가 지켜보는 평가전!</div>
    <div class="tour-line">세 번의 경기에 나서요.<br/>좋은 활약이면 명성과 스카우트 주목이 올라요.</div>`;
  $("btn-stage-next").textContent = "첫 경기 출전";
  $("btn-stage-next").onclick = playEvalStage;
  show("screen-stage");
}

function playEvalStage() {
  const m = marketOf();
  const type = ev.idx === 2 ? STAGE_TYPES[3] : STAGE_TYPES[pick([0, 1, 2])];
  const { score } = stageScore(type);
  const grade = gradeOf(score);
  S.condition = clamp(S.condition - 5, 0, 100);
  ev.idx += 1;
  $("stage-round").textContent = `${ev.idx}번째 경기 · ${type.name}`;
  renderStageSim(type, grade, (fg, info) => {
    const pts = Math.round(fg.pts * m.spot);
    const pay = { S: 60, A: 40, B: 25, C: 10, D: 0 }[fg.g] || 0;
    S.money = (S.money || 0) + pay;
    S.fandom = Math.max(0, S.fandom + pts);
    S.stages += 1;
    S.youth = S.youth || { g: 0, a: 0, def: 0 };
    S.youth.g += info.myGoals; S.youth.a += info.assists; S.youth.def += info.defense;
    ev.totalPts += pts;
    ev.scores.push(score + (fg.pts - grade.pts) * 0.6);
    save();
    const scoreClass = info.res === "W" ? "win" : info.res === "L" ? "lose" : "";
    const resultHTML = `
      <div class="ms-final ${scoreClass}">${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${RES_LABEL[info.res]}</div>
      <div class="tour-vs">경기 평점 <span class="${fg.g === "S" || fg.g === "A" ? "win" : fg.g === "D" ? "lose" : ""}">${fg.g}</span> · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense}</div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `⭐ 명성 +${pts}` : `📉 명성 ${pts}`}${pay ? ` · 💰 수당 +${pay}만` : ""}</div>`;
    return ev.idx < 3
      ? { resultHTML, nextLabel: "다음 경기", nextFn: playEvalStage }
      : { resultHTML, nextLabel: "종합 순위 발표", nextFn: finishEval };
  });
}

function finishEval() {
  const avg = ev.scores.reduce((x, y) => x + y, 0) / ev.scores.length;
  const rank = clamp(Math.round(28 - avg / 2.8 + rand(-2, 2)), 1, 24);
  let bonus = 0;
  if (rank === 1) {
    bonus = 25;
    S.trophies.push(`${S.year}년차 ${ev.name} 1위`);
  } else if (rank <= 3) bonus = 15;
  else if (rank <= 10) bonus = 8;
  S.fandom += bonus;
  $("stage-round").textContent = "종합 순위";
  $("stage-card").innerHTML = `
    <div class="tour-vs">유망주 24명 중 <span class="${rank <= 3 ? "win" : rank >= 18 ? "lose" : ""}">${rank}위</span></div>
    <div class="tour-line">${
      rank === 1 ? "🏆 전체 1위! 스카우트 명단 맨 위에 이름이 올랐어요." :
      rank <= 3 ? "🌟 최상위권! 여러 구단이 지켜보고 있어요." :
      rank <= 10 ? "🙂 중상위권. 꾸준함이 무기예요." :
      rank <= 17 ? "😐 중하위권… 다음 대회까지 더 달려야 해요." :
      "😨 하위권. 감독 면담이 잡혔어요. 분발해야 해요!"
    }</div>
    ${bonus ? `<div class="tour-pts">🏅 순위 보너스 명성 +${bonus}</div>` : ""}
    <div class="tour-pts">이번 대회 명성 합계 +${ev.totalPts + bonus}</div>`;
  $("btn-stage-next").textContent = "훈련장으로 돌아가기";
  $("btn-stage-next").onclick = () => {
    addLog(`🏆 ${ev.name} ${rank}위! (명성 +${ev.totalPts + bonus})`);
    ev = null;
    show("screen-main");
    advanceMonth();
  };
}

// ---------- 프로 도전 ----------
function startSurvival() {
  ev = { kind: "survival", round: 0, eliminated: false };
  $("stage-title").textContent = `⚽ 프로 도전 <드림>`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">🔥 트라이아웃부터 프로 계약까지</div>
    <div class="tour-line">3년의 훈련이 오늘을 위해 있었어요.<br/>단계를 통과하면 프로 계약서에 사인합니다.</div>`;
  $("btn-stage-next").textContent = "트라이아웃 시작";
  $("btn-stage-next").onclick = playSurvivalRound;
  show("screen-stage");
}

function playSurvivalRound() {
  const m = marketOf();
  const roundName = SURVIVAL_ROUNDS[ev.round];
  const type = pick(STAGE_TYPES);
  const { score } = stageScore(type);
  const grade = gradeOf(score);
  S.condition = clamp(S.condition - 5, 0, 100);
  $("stage-round").textContent = `${roundName} · ${type.name}`;
  renderStageSim(type, grade, (fg, info) => {
    const pts = Math.round(fg.pts * m.spot) + ev.round * 4;
    S.money = (S.money || 0) + 30 + ev.round * 20;
    S.fandom = Math.max(0, S.fandom + pts);
    S.stages += 1;
    const momentBonus = fg.pts > grade.pts ? 0.06 : fg.pts < grade.pts ? -0.06 : 0;
    const p = clamp(
      0.40 + m.debut * 0.35 + (overall() - 50) / 90 + S.fandom / 1500 +
      (S.condition - 50) / 900 - ev.round * 0.05 + momentBonus,
      0.12, 0.93
    );
    const pass = Math.random() < p;
    S.youth = S.youth || { g: 0, a: 0, def: 0 };
    S.youth.g += info.myGoals; S.youth.a += info.assists; S.youth.def += info.defense;
    save();
    const scoreClass = info.res === "W" ? "win" : info.res === "L" ? "lose" : "";
    const resultHTML = `
      <div class="ms-final ${scoreClass}">${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${RES_LABEL[info.res]}</div>
      <div class="tour-vs">경기 평점 ${fg.g} · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense} — <span class="${pass ? "win" : "lose"}">${pass ? "통과! 🎉" : "탈락… 💧"}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `⭐ 명성 +${pts}` : `📉 명성 ${pts}`}</div>`;
    if (pass && ev.round < SURVIVAL_ROUNDS.length - 1) {
      ev.round += 1;
      return { resultHTML, nextLabel: `${SURVIVAL_ROUNDS[ev.round]} 도전!`, nextFn: playSurvivalRound };
    }
    ev.eliminated = !pass;
    const capturedRound = ev.round;
    return {
      resultHTML,
      nextLabel: pass ? "🌟 최종 결과 보기" : "결과 받아들이기",
      nextFn: () => showEnding(pass, capturedRound),
    };
  });
}

// ---------- 엔딩 ----------
function showEnding(survivedFinal, lastRound) {
  const m = marketOf();
  const score = S.fandom + overall() * 2;

  let emoji, title, teamLine, msg;
  if (survivedFinal && score >= 520) {
    emoji = "👑"; title = "유럽 빅클럽 입단!";
    teamLine = `${m.name} 출신 — 빅리그 직행`;
    msg = "역대급 유망주! 세계적인 명문 구단이 러브콜을 보냈어요.";
  } else if (survivedFinal) {
    emoji = "🌟"; title = "프로 계약 성공!";
    teamLine = `프로 1군 계약 확정`;
    msg = "프로 데뷔 성공! 3년의 땀이 드디어 결실을 맺었어요.";
  } else if (lastRound === 3) {
    emoji = "💜"; title = "1군 콜업 대기";
    teamLine = "2군 계약 → 콜업 약속";
    msg = "아쉽게 1군 계약은 놓쳤지만, 구단이 곧 콜업을 약속했어요.";
  } else if (lastRound === 2 && score >= 420) {
    emoji = "📞"; title = "타 구단 스카우트!";
    teamLine = "하위 리그 구단 이적 제안";
    msg = "테스트를 지켜본 다른 구단에서 러브콜이! 새 팀에서 프로를 노려요.";
  } else if (lastRound >= 1) {
    emoji = "🌱"; title = "유스 재계약";
    teamLine = "유스팀 연장 계약";
    msg = "이번엔 여기까지. 하지만 구단은 아직 당신을 믿고 있어요.";
  } else if (score >= 330) {
    emoji = "📹"; title = "세미프로 입단";
    teamLine = "실업·세미프로 리그에서 재도전";
    msg = "프로는 못 갔지만 쌓인 경험이 있어요. 밑바닥부터 다시 올라가봐요!";
  } else {
    emoji = "🎒"; title = "축구화를 잠시 벗다";
    teamLine = "평범한 일상으로 복귀";
    msg = "꿈은 이루지 못했지만 3년의 땀은 사라지지 않아요. 공은 둥그니까!";
  }

  const statLines = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${Math.round(S.stats[d.key])}`)
    .join(" · ");
  const trophyLine = S.trophies.length
    ? `🏆 ${S.trophies.join(", ")}`
    : "🏆 대회 1위 경력 없음";

  $("ending-card").innerHTML = `
    <div class="draft-emoji">${emoji}</div>
    <div class="draft-title">${title}</div>
    <div class="draft-team">${teamLine}</div>
    <div>${msg}</div>
    <div class="draft-summary">
      ${m.emoji} ${m.name} · ${POS_INFO[S.pos].name} ${S.name}<br/>
      ${statLines}<br/>
      ⭐ 최종 명성 ${Math.round(S.fandom)} · 출전 ${S.stages}경기<br/>
      ⚽ ${(S.youth || {}).g || 0}골 · 🅰️ ${(S.youth || {}).a || 0}도움 · 🛡️ 수비 ${(S.youth || {}).def || 0}<br/>
      ${trophyLine}
    </div>`;

  $("btn-share").onclick = () => {
    const text = `⚽ 더 윙어 결과\n${m.name} ${S.name} — ${title}\n${teamLine}\n명성 ${Math.round(S.fandom)} / ${trophyLine}`;
    navigator.clipboard?.writeText(text).then(
      () => ($("btn-share").textContent = "✅ 복사 완료!"),
      () => ($("btn-share").textContent = "복사 실패 😢")
    );
  };
  $("btn-restart").onclick = () => {
    clearSave();
    location.reload();
  };

  if (window.Stats) Stats.log("ending", { title, score: Math.round(score) });

  if (window.WingerCareer) window.WingerCareer.onEnding(survivedFinal || lastRound === 3, survivedFinal && score >= 520);
  else clearSave();
  show("screen-ending");
}

// ---------- ❓ 도움말 ----------
const HELP_SECTIONS = [
  { emoji: "🏋️", title: "훈련과 컨디션", body:
    "매달 훈련이나 휴식을 골라요. 훈련은 능력치를 올리고 컨디션을 깎아요.\n" +
    "컨디션이 낮은 채로 계속 훈련하면 탈이 나요. 무리하지 말고 쉬어 가세요." },
  { emoji: "⭐", title: "재능과 각성", body:
    "능력치 옆의 별은 두 가지에 영향을 줘요.\n" +
    "① 훈련 효율 — 별이 많을수록 같은 훈련으로 더 많이 올라요.\n" +
    "② 승부처 보정 — 능력치가 같아도 별이 높으면 결정적인 순간에 조금 더 잘해요\n" +
    "   (최저 ×0.94 ~ 최고 ×1.12). 능력치에 이미 반영된 걸 또 곱하지 않게 폭을 좁게 뒀어요.\n" +
    "능력치 100을 넘으면 '한계 돌파' 구간이라 훈련 효율이 절반이 되고, 그때부터 🔮각성으로\n" +
    "재능을 올릴 수 있어요. 상한(130)까지 채우면 훈련 대신 각성만 남아요.\n" +
    "재능이 최대가 되면 🌠초월로 상한 자체를 6씩 올려요 — 성공할수록 어려워지지만\n" +
    "명예의 전당 점수가 크게 붙어요." },
  { emoji: "⚽", title: "경기와 프로 계약", body:
    "유스 3년 동안 경기에 나서며 실력과 주목도를 쌓아요.\n" +
    "3년이 끝나면 그동안의 성과로 프로 계약이 갈려요.\n" +
    "계약하면 리그 커리어를 이어가고, 아니면 유스에서 커리어가 끝나요." },
  { emoji: "🎓", title: "은퇴", body:
    "커리어를 마치면 🏛️명예의 전당에 기록이 남아요.\n" +
    "은퇴 시점의 성적으로 등급이 매겨지고, 전 세계 플레이어와 순위를 겨뤄요.\n" +
    "결산 화면에서 언제든 은퇴할 수 있어요. 확인창에서 남을 기록을 미리 보여줘요." },
  { emoji: "💰", title: "돈 벌기와 쓰기", body:
    "활동 수당과 정산으로 돈이 들어와요.\n" +
    "🛍️상점에서 장비를 사면 능력치가 바로 올라요. 등급은 순서대로만 살 수 있어요.\n" +
    "30분마다 🎁특훈으로 무료 훈련을 한 번 받을 수 있어요." },
  { emoji: "💾", title: "기록 보관", body:
    "기록은 이 기기의 브라우저에 저장되고, 서버에도 자동 백업돼요.\n" +
    "기기를 바꾸거나 브라우저 데이터를 지우면 이 기기의 기록은 사라져요.\n" +
    "타이틀 화면의 🔗 기록 연동에서 코드를 복사해 두면 새 기기에서 그대로 이어받을 수 있어요." },
];

function openHelp() {
  if (window.Help) window.Help.open("⚽ 더 윙어 도움말", HELP_SECTIONS);
}
$("btn-help-main")?.addEventListener("click", openHelp);
$("btn-help-pro")?.addEventListener("click", openHelp);

// ---------- 시작 ----------
initTitle();
if (window.Stats) Stats.init("soccer");

/* ☁️ 클라우드 세이브 연결 — 타이틀 진입 시 서버와 맞춰요 */
if (window.Cloud) {
  Cloud.init("soccer");
  $("btn-cloud")?.addEventListener("click", () => Cloud.openModal());
}
