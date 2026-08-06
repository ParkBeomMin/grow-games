/* 더 트레이니 🎤 아이돌 연습생 키우기 */
"use strict";

// ---------- 데이터 ----------
const AGENCIES = [
  {
    id: "sw", name: "SW엔터", emoji: "🏢", tier: "대형",
    debut: 0.76, growth: 0.92, spot: 1.15,
    desc: "빅3 대형 기획사. 데뷔만 하면 대박, 대신 경쟁이 지옥이에요",
  },
  {
    id: "onlyone", name: "온리원컴퍼니", emoji: "🌐", tier: "대형",
    debut: 0.72, growth: 0.97, spot: 1.1,
    desc: "글로벌 시스템 명가. 해외 팬덤이 빠르게 붙어요",
  },
  {
    id: "luna", name: "루나엔터", emoji: "🌙", tier: "중형",
    debut: 0.62, growth: 1.05, spot: 1.0,
    desc: "알짜 중형 기획사. 기회와 경쟁의 균형이 좋아요",
  },
  {
    id: "byeol", name: "별빛엔터", emoji: "⭐", tier: "소형",
    debut: 0.55, growth: 1.12, spot: 0.95,
    desc: "소형이지만 1:1 트레이닝. 실력이 쑥쑥 자라요",
  },
  {
    id: "garage", name: "개러지뮤직", emoji: "🎸", tier: "신생",
    debut: 0.5, growth: 1.15, spot: 1.05,
    desc: "신생 기획사. 뭐든 시켜줘서 무대 경험이 쌓여요",
  },
];

const STAT_DEFS = [
  { key: "vocal", name: "보컬", emoji: "🎤", sub: "가창력" },
  { key: "dance", name: "댄스", emoji: "🕺", sub: "춤·퍼포먼스" },
  { key: "rap", name: "랩", emoji: "🎙️", sub: "랩·작사" },
  { key: "charm", name: "매력", emoji: "✨", sub: "표정·무대 장악" },
  { key: "stamina", name: "체력", emoji: "🫀", sub: "연습 지구력" },
];

const POS_INFO = {
  vocal: { name: "보컬", stat: "vocal" },
  dance: { name: "댄스", stat: "dance" },
  rap: { name: "랩", stat: "rap" },
};

const STAGE_NAMES = ["하람", "다온", "세인", "벼리", "라온", "누리", "시안", "도담", "늘봄", "여름", "가온", "미르"];

// 평가 무대 종류: 주 스탯 / 보조 스탯 가중치
const STAGE_TYPES = [
  { name: "보컬 무대", main: "vocal", aux: "charm" },
  { name: "댄스 무대", main: "dance", aux: "stamina" },
  { name: "랩 무대", main: "rap", aux: "charm" },
  { name: "포지션 자유 무대", main: null, aux: "charm" }, // main = 내 포지션 스탯
];

const EVALS = { 6: "상반기 쇼케이스", 12: "연말 평가" };
const SURVIVAL_ROUNDS = ["예선", "본선", "세미파이널", "파이널"];

/* 🌱 연습생 연장 — 나이 패널티
 * 연습생은 실제로 오래 해요. 그래서 연장 횟수에 제한을 두지 않는 대신,
 * 데뷔 서바이벌의 라운드 통과 확률에서 `연장 횟수 × 이 값`을 빼요.
 * 여기가 스스로 거는 제동입니다.
 *
 * 값의 근거는 실측이에요. 연장한 한 해를 제대로 굴리면(컨디션 60 아래에서 쉬고
 * 재능이 높은 능력치부터 연습) 종합이 +7~8, 팬덤이 +54~63 올라요.
 * p로 환산하면 종합에서 +0.077~0.089, 팬덤에서 +0.036~0.042 — 합쳐서 +0.12쯤이에요.
 * 그래서 0.12는 "한 해를 제대로 굴리면 본전, 대충 굴리면 손해"인 지점이에요.
 * (기획사별 첫 연장 실측: SW엔터 +0.116 · 루나엔터 +0.122 · 개러지뮤직 +0.134) */
const TRAINEE_EXT_PENALTY = 0.12;
// 옛 세이브엔 이 필드가 없어요. 없으면 0 — 마이그레이션은 하지 않아요.
const traineeExt = () => (S && S.traineeExt) || 0;
const extPenalty = (n) => (n == null ? traineeExt() : n) * TRAINEE_EXT_PENALTY;
// %p로 보여줄 때 쓰는 표기예요. 감추지 않고 항상 숫자로 알려줍니다.
const extPenaltyPct = (n) => Math.round(extPenalty(n) * 100);

// ---------- 상태 ----------
const SAVE_KEY = "trainee-save-v1";

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
let ev = null; // 진행 중인 평가/서바이벌

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const STAT_CAP = 130; // 100 이후는 '한계 돌파' 구간 (성장 효율 절반)
const fmtMoney = (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v)}만`);

// 시작 능력치 뽑기 — 이름 화면에서 미리 보고 다시 뽑을 수 있어요
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
    stroke: "#ff8fc8",
    fill: "rgba(255, 143, 200, 0.3)",
  });
  $("roll-stars").innerHTML = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(talentStars(pendingRoll.talents[d.key]))}`)
    .join(" · ") + `<br/>⭐ = 잠재력 — 별이 많은 능력치일수록 연습 효율이 높아요`;
}
$("btn-reroll")?.addEventListener("click", () => {
  pendingRoll = rollStats(chosenPos);
  renderRoll();
});

function newState(agency, pos, name, roll) {
  const { stats, talents } = roll || rollStats(pos);
  return {
    agency: agency.id, pos, name,
    year: 1, month: 1,
    stats, talents,
    // 🧬 환생 유산으로 받은 시작 자금이에요. 유산이 없으면 0이에요.
    money: legacyMoneyBonus(loadLegacy().pts),
    gear: {},
    condition: 80,
    fandom: 0,
    buff: false,
    trophies: [],
    stages: 0, // 오른 무대 수
    log: [],
  };
}

const agencyOf = () => AGENCIES.find((a) => a.id === S.agency);
/* 📞 타사 캐스팅이 데려가는 기획사예요. 데뷔 파워가 제일 낮은 곳 하나로 고정해요 —
 * 데뷔는 데뷔지만 출발이 제일 불리한 자리라는 걸 기획사로 말해줍니다.
 * (축구의 '1부 최약체 클럽'과 같은 자리예요.) */
const castingAgency = () => AGENCIES.reduce((lo, a) => (a.debut < lo.debut ? a : lo), AGENCIES[0]);
const overall = () => {
  const vals = Object.values(S.stats);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

// ---------- 저장 — 연습생 여러 명(슬롯) 지원 ----------
const SLOTS_KEY = SAVE_KEY + "-slots";
let curSlot = null;
function loadSlots() {
  try { return JSON.parse(localStorage.getItem(SLOTS_KEY)) || {}; } catch { return {}; }
}
function saveSlots(sl) { localStorage.setItem(SLOTS_KEY, JSON.stringify(sl)); }
// 예전 단일 저장 → 슬롯으로 이사
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

// ---------- 화면 이동 (뒤로/홈) ----------
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
    // 경기/육성 진행 중에는 실수 방지를 위해 뒤로가기를 막아요
    history.pushState({ s: curId }, "");
  }
});

$("btn-back-first")?.addEventListener("click", () => show("screen-title"));
$("btn-back-position")?.addEventListener("click", () => show("screen-agency"));
$("btn-back-name")?.addEventListener("click", () => show("screen-position"));
// 홈 = 타이틀로 (진행 상황은 매 턴 자동 저장돼요)
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
// 스탯 100 이상(한계 돌파)부터 도전 가능. 깊이 돌파할수록 성공 확률 상승.
// 성공: 재능(⭐) 상승 / 실패: 낮은 확률로 재능 하락 — 어느 쪽이든 스탯은 크게 낮아져 다시 키워야 해요.
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
  // 화면 표시(반올림)와 동일한 기준 — 99.6도 '100'으로 보이면 각성 가능해야 해요
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
  /* 🔮 각성은 엔드게임인데 로그가 없어서 **몇 명이 여기까지 오는지** 몰랐어요.
   * CS에 "각성해도 별이 안 오른다"가 대기 중인데 실제 시도 수를 못 봤습니다.
   * 시도 자체를 남겨요 — 성공률은 확률이지만 "얼마나 시도하나"가 진짜 물음이에요. */
  const awakenOk = Math.random() < p;
  if (window.Stats) Stats.log("awaken", { key, lv: Math.round(S.talents[key] * 100) / 100, ok: awakenOk });
  if (awakenOk) {
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
const AD_CD_MS = 1800000; // 30분
const adCooldownLeft = () =>
  Math.max(0, AD_CD_MS - (Date.now() - (+localStorage.getItem(AD_CD_KEY) || 0)));

// 팝업(모달)로 보너스 지급 연출
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

// 무료 특훈 — 랜덤 스탯을 연습하되 턴을 소모하지 않아요
function showAdTrainModal(rerender) {
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal ad-modal">
      <p class="av-title">🎁 무료 특훈!</p>
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
      body.innerHTML = `<div class="ad-emoji">${d.emoji}</div><b>${d.name} +${gain.toFixed(1)}</b> 특훈 완료!<br/><span class="av-note">턴을 소모하지 않는 보너스 연습 · 다음은 30분 후</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>특훈에 실패했어요`;
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
    btn.innerHTML = `<span class="a-emoji">🎁</span>특훈<span class="a-sub">30분마다 무료 연습</span>`;
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
        <div class="si-info"><div class="si-name">${d.name} 아이템 ${tier.n}</div>${d.name} +${tier.bonus} · ${fmtMoney(tier.price)}</div>
        <button class="mini-btn">구매</button>`;
      div.querySelector(".mini-btn").onclick = () => {
        if ((S.money || 0) < tier.price) {
          alert("자금이 부족해요! 활동 정산이나 보너스로 모아봐요 💰");
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
      div.innerHTML = `<span class="si-emoji">${d.emoji}</span><div class="si-info"><div class="si-name">${d.name} 아이템 완비!</div>모든 티어 보유 중 ✨</div>`;
    }
    box.appendChild(div);
  }
  // 🎁 보너스 보상 (30분 쿨다운) — 팝업으로 진행
  const left = adCooldownLeft();
  const adRow = $("ad-row");
  if (left > 0) {
    adRow.innerHTML = `<p class="av-note">🎁 다음 보너스까지 약 ${Math.ceil(left / 60000)}분 남았어요</p>`;
  } else {
    adRow.innerHTML = `<button class="btn btn-primary" id="btn-ad">🎁 30분 보너스 +200만 받기</button>`;
    $("btn-ad").onclick = () => showAdModal(200, renderShop);
  }
}
// ---------- 활동 기록 ----------
let recordReturn = "screen-main";
function openRecord(returnTo) {
  recordReturn = returnTo || "screen-main";
  renderRecord();
  show("screen-record");
}
function renderRecord() {
  const a = agencyOf();
  const trophyLine = S.trophies && S.trophies.length ? `🏆 ${S.trophies.join(", ")}` : "🏆 평가 1위 경력 없음";
  // 진행 중인 활동 (데뷔 후)
  let curHtml = "";
  if (S.activity) {
    const act = S.activity;
    curHtml = `<br/><b>🔥 진행 중인 활동</b><br/>${act.cb}차 컴백 · ${act.week}/${act.weekTotal}주차 소화<br/>올해 음방 1위 ${act.wins}회 · 컴백 화력 ${act.hypeSum >= 0 ? "+" : ""}${Math.round(act.hypeSum * 10) / 10}<br/>`;
  }
  let proHtml = "";
  if (S.career && S.career.years && S.career.years.length) {
    const rows = S.career.years.map((x) =>
      `<tr><td>${x.y}년차</td><td>1위 ${x.wins}회</td><td>초동 ${x.sales}만</td><td>${x.awards && x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    proHtml = `
      <table class="season-table"><thead><tr><th>연차</th><th>음방</th><th>판매량</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div>통산 ${S.career.years.length}년 · 1위 ${S.career.wins}회 · 🏆 대상 ${S.career.daesang} · 본상 ${S.career.bonsang}${S.career.rookie ? " · 신인상" : ""}</div>`;
  }
  const gearList = STAT_DEFS
    .map((d) => {
      const owned = GEAR_TIERS.filter((t) => S.gear && S.gear[`${d.key}-${t.n}`]).length;
      return owned ? `${d.emoji}${"★".repeat(owned)}` : null;
    })
    .filter(Boolean)
    .join(" ");
  $("record-card").innerHTML = `
    <div class="draft-emoji">🎤</div>
    <div class="draft-title">${S.name}</div>
    <div class="draft-team">${S.phase === "idol-pro" ? `${S.group}${S.center ? " · 센터" : ""} · ${S.proYear}년차` : `${a.emoji} ${a.name} 연습생 ${S.year}년차`} · ${POS_INFO[S.pos].name}</div>
    <div class="draft-summary">
      <b>🏫 연습생 기록</b><br/>무대 ${S.stages || 0}회 · 💖 팬덤 ${Math.round(S.fandom)}<br/>${trophyLine}<br/>
      ${curHtml}
      ${proHtml ? `<br/><b>🎤 지난 활동 기록</b>${proHtml}<br/>` : ""}
      ${gearList ? `<br/><b>🛍️ 보유 아이템</b> ${gearList}` : ""}
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
    const c = window.Career || window.IdolCareer;
    if (c && c.refreshPro) c.refreshPro();
  }
});

// ---------- 시작 흐름 ----------
let chosenAgency = null;
let chosenPos = null;

function initTitle() {
  if (Object.keys(loadSlots()).length) {
    $("btn-continue").classList.remove("hidden");
    $("btn-continue").onclick = showSlotPicker;
  }
  $("btn-new").onclick = () => {
    renderAgencies();
    show("screen-agency");
  };
  // 지금까지 등록된 연습생 수
  if (window.Match && Match.enabled()) {
    Match.count("idol").then((n) => {
      if (n) {
        $("title-count").innerHTML = `🎤 지금까지 <b>${n.toLocaleString()}명</b>의 연습생이 데뷔를 꿈꿨어요!`;
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
  if (S.phase === "idol-pro" && window.IdolCareer) {
    window.IdolCareer.showActivity();
  } else {
    renderMain();
    show("screen-main");
  }
}

function slotDesc(st) {
  const posName = POS_INFO[st.pos] ? POS_INFO[st.pos].name : "";
  if (st.phase === "idol-pro") return `🎤 ${st.group || "데뷔 그룹"} · ${st.proYear || 1}년차${st.center ? " · 센터" : ""}`;
  const a = AGENCIES.find((x) => x.id === st.agency);
  return `🏢 ${a ? a.name : ""} 연습생 ${st.year}년차 · ${posName}`;
}

// 이어하기 — 어떤 연습생으로 계속할지 선택
function showSlotPicker() {
  const sl = loadSlots();
  const ids = Object.keys(sl).sort((a, b) => (sl[b].savedAt || 0) - (sl[a].savedAt || 0));
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal slot-modal">
      <p class="av-title">👥 어떤 연습생으로 이어할까요?</p>
      <div class="slot-list">${ids.map((id) => {
        const st = sl[id];
        const d = st.savedAt ? new Date(st.savedAt) : null;
        return `
          <div class="slot-row">
            <button type="button" class="slot-go" data-id="${id}">
              <span class="slot-avatar slot-emoji">🎤</span>
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
      if (!confirm(`${st ? st.name : "이 연습생"}의 저장을 삭제할까요? 되돌릴 수 없어요!`)) return;
      const cur = loadSlots();
      delete cur[b.dataset.id];
      saveSlots(cur);
      ov.remove();
      if (Object.keys(cur).length) showSlotPicker();
      else $("btn-continue").classList.add("hidden");
    };
  });
}

function renderAgencies() {
  const box = $("agency-list");
  box.innerHTML = "";
  const starBar = (v, vals) => { const lo = Math.min(...vals), hi = Math.max(...vals); const n = hi === lo ? 3 : Math.min(5, Math.max(1, 1 + Math.round(((v - lo) / (hi - lo)) * 4))); return "★".repeat(n) + "☆".repeat(5 - n); };
  const GVALS = AGENCIES.map((x) => x.growth), DVALS = AGENCIES.map((x) => x.debut);
  for (const a of AGENCIES) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.innerHTML = `
      <span class="card-emoji">${a.emoji}</span>
      <span class="card-title">${a.name}</span>
      <span class="card-sub">${a.tier} 기획사</span>
      <span class="card-desc">${a.desc}</span>
      <span class="card-tags">
        <span class="tag">데뷔 파워 ${starBar(a.debut, DVALS)}</span>
        <span class="tag">성장 ${starBar(a.growth, GVALS)}</span>
      </span>`;
    btn.onclick = () => {
      chosenAgency = a;
      $("position-hint").textContent = `${a.name} 오디션 합격! 어떤 포지션을 노릴까요?`;
      show("screen-position");
    };
    box.appendChild(btn);
  }
}

document.querySelectorAll("#position-list .card").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenPos = btn.dataset.pos;
    $("name-hint").textContent = `${chosenAgency.name} ${POS_INFO[chosenPos].name} 연습생의 활동명은?`;
    $("input-name").value = pick(STAGE_NAMES);
    pendingRoll = rollStats(chosenPos);
    show("screen-name");
    renderRoll();
  });
});

$("btn-random-name").addEventListener("click", () => {
  $("input-name").value = pick(STAGE_NAMES);
});

$("btn-start").addEventListener("click", () => {
  const name = $("input-name").value.trim() || pick(STAGE_NAMES);
  curSlot = null; // 새 연습생은 새 슬롯에 — 기존 저장은 그대로 남아요
  /* ⚠️ 이름 말고 **id**를 함께 남겨요. 예전에는 표시 이름만 남겨서, 선택지 이름을
   * 바꾸는 순간 통계에서 같은 항목이 옛 이름·새 이름으로 쪼개졌어요 —
   * 축구 유스를 나라에 맞추자 배경 분포가 9줄로 갈라졌습니다.
   * id는 세이브가 가리키는 값이라 안 바뀌어요. 이름은 사람이 읽으라고 같이 둡니다. */
  if (window.Stats) Stats.log("new_player", { pos: chosenPos, agency: chosenAgency.name, mk: chosenAgency.id });
  if (window.Match) Match.register("idol", name);
  S = newState(chosenAgency, chosenPos, name, pendingRoll);
  addLog(`🎤 ${chosenAgency.name} 연습생 계약! ${name}의 연습실 생활이 시작됐어요.`);
  save();
  renderMain();
  show("screen-main");
});

// ---------- 메인 렌더 ----------
function renderMain() {
  const a = agencyOf();
  $("hud-name").textContent = `${S.name} (${POS_INFO[S.pos].name})`;
  $("hud-school").textContent = `${a.emoji} ${a.name} · 종합 ${Math.round(overall())}`;
  // 연장 중이면 몇 번째인지·문턱이 얼마나 올라갔는지 육성 화면에서도 계속 보여줘요
  $("hud-turn").textContent = `${S.year}년차 ${S.month}월` +
    (traineeExt() ? ` · 🌱연장 ${traineeExt()}회 (-${extPenaltyPct()}%p)` : "");

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
    // 상한에 닿았으면 연습 대신 각성에 도전해요 (턴 낭비 방지)
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
      btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 연습<span class="a-sub">${d.sub}</span>`;
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

  // 무대 날 — 연습 잠그고 무대 시작 버튼만 (🎁 특훈은 턴 미소모라 허용)
  if (S.pendingStage) {
    actBox.querySelectorAll(".action-btn").forEach((b) => {
      if (!b.classList.contains("ad-slot")) b.disabled = true;
    });
    const ps = S.pendingStage;
    const go = document.createElement("button");
    go.className = "action-btn rest go-game";
    go.innerHTML = ps.kind === "survival"
      ? `<span class="a-emoji">🔥</span>데뷔 서바이벌 출전!<span class="a-sub">3년의 연습이 여기서 판가름나요</span>`
      : `<span class="a-emoji">🎤</span>${ps.name} 무대 오르기!<span class="a-sub">평가 무대 준비 완료</span>`;
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
  // 상한에 닿았으면 연습은 턴만 소모돼요 — 각성으로 돌려줍니다
  if (atCap(def.key)) { if (awakenTalent(def.key, addLog)) renderMain(); return; }
  const a = agencyOf();

  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🤕 지친 몸으로 무리하다 ${def.name} 연습 중 몸이 상했어요. 한 달을 회복으로 날렸어요.`);
    actFx(def.key, "🤕 부상", true);
    endMonth();
    return;
  }

  // 훈련 실패 — 컨디션이 낮을수록 위험해요
  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 훈련이 완전히 꼬였어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
    actFx(def.key, "-" + loss.toFixed(1), true);
    maybeEvent();
    endMonth();
    return;
  }

  const condMod = S.condition >= 70 ? 1.15 : S.condition >= 40 ? 1.0 : 0.6;
  const buffMod = S.buff ? 1.5 : 1.0;
  S.buff = false;
  let gain = rand(2.2, 4.2) * S.talents[def.key] * a.growth * condMod * buffMod;
  if (S.stats[def.key] >= 100) gain *= 0.5; // 💥 한계 돌파 구간
  gain = Math.round(gain * 10) / 10;
  S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, statCap(def.key));
  S.condition = clamp(S.condition - randInt(12, 18), 0, 100);
  addLog(`${def.emoji} ${def.name} 연습 완료! +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);
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
  const a = agencyOf();
  const events = [
    () => {
      const d = pick(STAT_DEFS);
      S.stats[d.key] = clamp(S.stats[d.key] + 3, 0, statCap(d.key));
      addLog(`🧑‍🏫 트레이너 선생님의 특별 레슨! ${d.name} +3`);
    },
    () => {
      const pts = Math.round(8 * a.spot);
      S.fandom += pts;
      addLog(`📱 연습 직캠이 SNS에서 소소하게 화제! 팬덤 +${pts}`);
    },
    () => {
      S.condition = clamp(S.condition - 20, 0, 100);
      addLog(`🤒 감기 몸살로 며칠 앓았어요. 컨디션 -20`);
    },
    () => {
      S.condition = clamp(S.condition + 12, 0, 100);
      addLog(`🧋 연습실에 간식 차가 왔어요! 컨디션 +12`);
    },
    () => {
      S.buff = true;
      addLog(`🔥 월말평가 1위 라이벌의 무대에 자극받았어요! 다음 연습 효율 1.5배`);
    },
    () => {
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, statCap("stamina"));
      addLog(`🏃 새벽 러닝 루틴이 몸에 붙었어요. 체력 +2`);
    },
    () => {
      S.fandom = Math.max(0, S.fandom - 10);
      addLog(`📉 무대 실수 클립이 돌고 있어요… 팬덤 -10`);
    },
  ];
  pick(events)();
}

// ---------- 월 진행 ----------
function endMonth() {
  // 평가/서바이벌 달이면 연습 버튼을 잠그고 '무대 오르기' 버튼으로 시작해요
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

// ---------- 무대 공통 ----------
function stageScore(type) {
  const mainKey = type.main || POS_INFO[S.pos].stat;
  const score =
    S.stats[mainKey] * 0.55 +
    S.stats[type.aux] * 0.2 +
    S.stats.charm * 0.1 +
    S.condition / 8 +
    rand(-9, 9);
  return { mainKey, score };
}

const GRADE_ORDER = ["D", "C", "B", "A", "S"];
const GRADE_INFO = {
  S: { pts: 30, txt: "🌟 완벽한 무대! 심사위원 전원이 기립했어요." },
  A: { pts: 22, txt: "🔥 시선을 사로잡는 무대! 카메라가 계속 따라와요." },
  B: { pts: 15, txt: "🙂 안정적인 무대. 나쁘지 않았어요." },
  C: { pts: 9, txt: "😬 아쉬운 실수가 있었어요. 다음에 만회해요." },
  D: { pts: -5, txt: "😢 무대 위에서 머리가 하얘졌어요… 팬들이 실망했어요." },
};
const makeGrade = (g) => ({ g, ...GRADE_INFO[g] });

function gradeOf(score) {
  if (score >= 76) return makeGrade("S");
  if (score >= 64) return makeGrade("A");
  if (score >= 52) return makeGrade("B");
  if (score >= 40) return makeGrade("C");
  return makeGrade("D");
}

// ---------- 무대 연출 ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MOMENTS = {
  vocal: {
    good: ["고음이 시원하게 뻗어요! 🎶", "애드리브에 심사위원이 고개를 끄덕여요 ✨", "떨림 없는 클라이맥스, 소름이 돋아요 🥹"],
    bad: ["고음에서 살짝 흔들렸어요 😬", "가사를 순간 놓칠 뻔했어요 💦"],
  },
  dance: {
    good: ["칼군무 포인트를 완벽하게 소화! 🕺", "턴 동작이 물 흐르듯 이어져요 ✨", "엔딩 포즈까지 한 치의 오차도 없어요 🔥"],
    bad: ["박자를 반 박자 놓쳤어요 😬", "동선이 살짝 꼬였어요 💦"],
  },
  rap: {
    good: ["속사포 파트를 씹지 않고 완주! 🎙️", "자작 가사에 연습실이 술렁여요 ✨", "비트 위에서 완전히 자유로워요 🔥"],
    bad: ["플로우가 잠깐 어긋났어요 😬", "발음이 뭉개진 구간이 있었어요 💦"],
  },
};

// 무대 승부처 미니게임 — 타이밍/홀드/안무 암기/반응/수싸움 5종 랜덤
const IDOL_BAR = { ok: "✨ 하이라이트를 무난히 소화했어요", great: "💫 킬링파트를 완벽하게! 객석이 터져나가요!", bad: "😱 하이라이트에서 삐끗… 등급이 흔들려요" };
const IDOL_HOLD = { ok: "🎤 고음을 안정적으로 끌어올렸어요!", great: "💥 완벽한 호흡에서 터진 초고음!! 무대를 찢었다!", bad: "😮‍💨 호흡 조절 실패… 음이 흔들렸어요" };
const IDOL_SEQ = { ok: "🕺 안무 순서를 정확히 소화했어요!", great: "🌟 칼군무 완벽 수행!! 직캠 화력 폭발!", bad: "🙈 안무 순서가 꼬였다… 동선 충돌" };
const IDOL_REACT = { ok: "📷 카메라 신호에 바로 반응했어요!", great: "⚡ 0.1초 만에 찾은 렌즈, 표정까지 완벽!!", bad: "😵 카메라가 지나갔는데 놓쳤어요…" };
const IDOL_DUEL = { ok: "📷 카메라를 정확히 찾아 미소!", great: "🌟 완벽한 동선, 직캠 각도 최고!!", bad: "🙈 동선이 꼬여 화면 밖으로…" };
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
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), IDOL_BAR); return; }
    window.Timing.play(container, {
      label: "✨ 킬링파트! 초록 존에서 포인트를 찍어요!",
      button: "지금! 🎤",
      zonePct: miniZone(S.stats[posStat]),
    }, (res) => cb(res, IDOL_BAR));
  } else if (mech === "hold") {
    if (autoMiniOn()) { cb(autoRes(S.stats.stamina), IDOL_HOLD); return; }
    window.Timing.hold(container, {
      label: "🎤 클라이맥스 고음! 꾹 눌러 호흡을 모으고, 초록 존에서 터뜨려요!",
      button: "꾹 누르기 🎶",
      zonePct: miniZone(S.stats.stamina),
    }, (res) => cb(res, IDOL_HOLD));
  } else if (mech === "seq") {
    if (autoMiniOn()) { cb(autoRes(S.stats.dance), IDOL_SEQ); return; }
    window.Timing.sequence(container, {
      label: "🕺 포인트 안무! 순서를 기억했다가 그대로!",
      icons: ["🎤", "🕺", "🎙️", "✨"],
      showMs: 900 + S.stats.dance * 6 + (S.condition - 50) * 3,
    }, (res) => cb(res, IDOL_SEQ));
  } else if (mech === "react") {
    if (autoMiniOn()) { cb(autoRes(S.stats.charm), IDOL_REACT); return; }
    window.Timing.reaction(container, {
      label: "📷 개인 직캠 타임! 신호가 켜지면 바로 렌즈를 봐요!",
      button: "여기!! 📷",
      perfectMs: 300 + S.stats.charm * 1.5,
      goodMs: 700 + S.stats.charm * 2.5,
    }, (res) => cb(res, IDOL_REACT));
  } else if (mech === "target") {
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), IDOL_REACT); return; }
    window.Timing.target(container, {
      label: "📸 포토타임! 여기저기 터지는 카메라를 놓치지 말고 탭!",
      icon: "📷", count: 3, lifeMs: 800 + Math.min(S.stats[posStat], 130) * 3,
    }, (res) => cb(res, IDOL_REACT));
  } else if (mech === "drop") {
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), IDOL_BAR); return; }
    window.Timing.drop(container, {
      label: "🎤 마이크 캐치! 떨어지는 마이크를 초록 존에서 딱 잡아요!",
      icon: "🎤", zonePct: miniZone(S.stats[posStat]),
    }, (res) => cb(res, IDOL_BAR));
  } else if (mech === "odd") {
    if (autoMiniOn()) { cb(autoRes(S.stats.charm), IDOL_DUEL); return; }
    window.Timing.odd(container, {
      label: "👀 안무 디테일! 다른 동작 하나를 빠르게 찾아 탭!",
      rounds: 2, sets: [["💃", "🕺"], ["🎤", "🎶"], ["⭐", "🌟"]],
    }, (res) => cb(res, IDOL_DUEL));
  } else {
    if (autoMiniOn()) { cb(autoRes(S.stats.charm), IDOL_DUEL); return; }
    window.Timing.duel(container, {
      label: "🧠 엔딩 요정 자리 싸움! 카메라는 어디로?",
      choices: ["왼쪽", "중앙", "오른쪽"],
      hintChance: clamp((S.stats.charm - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, (res) => cb(res, IDOL_DUEL));
  }
}

/* ---------- 🌏 월드투어 전용 무대 — 한 도시가 콘서트 한 편이에요 ----------
 *
 * 컴백 무대(playRandomMini)는 미니게임 한 번이에요. 투어는 다릅니다:
 * 🎬 오프닝 → ✨ 킬링파트 → 🔥 앵콜을 연달아 하고, 세 결과를 가중합해
 * 그 도시 객석이 정해져요. 문구도 도시 이름과 현지 함성이 들어간 투어 전용이에요.
 *
 * playRandomMini는 손대지 않았어요 — 컴백 무대는 예전 그대로 한 번이에요.
 * (회귀는 tests/idol/tour-set-test.js가 봐요.)
 *
 * 🎪 무대마다 전용 메커닉이 하나씩 붙어 있어요(mech). 예전에는 기존 8종에서
 * 무대별로 골라 썼는데, 그러면 종류가 컴백 무대와 똑같아서 투어라는 느낌이
 * 안 났어요. 지금은 셋 다 tour-stage.js의 투어 전용 메커닉이에요 —
 * 함성 웨이브 · 싱크로 · 함성 유지. 컴백 무대는 여전히 기존 8종을 써요.
 * 무대와 메커닉이 1:1이라 한 도시에서 같은 메커닉이 두 번 나오지 않아요.
 *
 * weight — 세 무대를 합칠 때의 가중치예요. 합이 1이고 앵콜이 압도적으로 무거워요.
 * 마지막에 무너지면 아파야 하니까요.
 *
 * 이 세 숫자는 등급 분포를 보고 잡은 값이에요. 세 번의 평균은 한 번보다 분산이
 * 작아요(평균으로 수렴). 그런데 투어 등급은 도시 4~8곳의 평균으로 매기니까,
 * 도시 안에서 또 평균을 내면 분포가 가운데로 뭉쳐서 전부 B가 돼요.
 * 앵콜을 무겁게 둘수록 "사실상 한 판"에 가까워져서 분포가 다시 갈라져요.
 * 무작위 플레이에서 B가 차지하는 비율(같은 산식으로 4만 판을 돌려 재고,
 * 채택값은 tests/idol/tour-depth-test.js의 500회로 세 번 확인했어요):
 *   0.33 / 0.33 / 0.33 → B 48%  (절반 문턱에 닿아요)
 *   0.12 / 0.22 / 0.66 → B 46%
 *   0.10 / 0.15 / 0.75 → B 44%  ← 지금 값 (실측 42.6 / 43.6 / 44.8%)
 * 값을 만질 땐 반드시 tour-depth-test.js의 분포표를 다시 재세요. 컨디션 소모·
 * 기세·취소 상수는 이 표를 맞추는 데 쓰지 않아요 — 가중치로만 맞춰요. */
const TOUR_STAGES = [
  { key: "open", emoji: "🎬", name: "오프닝", weight: 0.10, mech: "wave" },
  { key: "kill", emoji: "✨", name: "킬링파트", weight: 0.15, mech: "sync" },
  { key: "encore", emoji: "🔥", name: "앵콜", weight: 0.75, mech: "roar" },
];

/* 무대별 결과 문구 — 도시 이름과 현지 함성이 들어가요.
 * 컴백 무대의 IDOL_* 문구와는 한 줄도 겹치지 않아요. */
const TOUR_MSG = {
  open: {
    great: (c, y) => `🎬 첫 곡부터 ${c} 객석이 전부 일어섰어요! "${y}" 함성이 터져요`,
    ok: (c) => `🎬 첫 곡을 깔끔하게 넘겼어요. ${c} 객석이 슬슬 달아올라요`,
    bad: (c) => `🎬 첫 곡이 겉돌았어요… ${c} 객석이 아직 앉아 있어요`,
  },
  kill: {
    great: (c, y) => `✨ 하이라이트를 완벽하게!! ${c}의 "${y}"가 아레나를 흔들어요`,
    ok: (c) => `✨ 하이라이트를 무난히 소화했어요. ${c} 객석이 따라 불러요`,
    bad: (c) => `✨ 하이라이트에서 삐끗… ${c} 객석의 함성이 잦아들어요`,
  },
  encore: {
    great: (c, y) => `🔥 앵콜에 모든 걸 쏟았어요!! ${c} 전석이 "${y}"를 외쳐요`,
    ok: (c) => `🔥 앵콜로 무대를 잘 닫았어요. ${c} 객석이 손을 흔들어요`,
    bad: (c) => `🔥 마지막 앵콜에서 무너졌어요… ${c} 객석이 조용히 빠져나가요`,
  },
};
const tourStageMsg = (stage, res, city, cheer) => {
  const m = TOUR_MSG[stage.key] || TOUR_MSG.open;
  return (res === "perfect" ? m.great : res === "miss" ? m.bad : m.ok)(city, cheer);
};

/* 🎪 투어 전용 메커닉 셋 — 실행은 tour-stage.js(window.TourStage)에 있어요.
 * label은 (도시, 함성)을 받아요. 무대와 메커닉이 1:1이라 문구를 메커닉에 붙여 둬요.
 *
 * stat()이 자동 플레이(autoRes)가 볼 능력치이고, zonePct(miniZone)가 사람이
 * 직접 할 때 판정 창을 넓히는 값이에요. 둘이 같은 능력치를 봐야 "자동으로 돌린
 * 분포"와 "손으로 한 체감"이 어긋나지 않아요.
 *
 * 무대별로 보는 능력치 (설계 문서의 표):
 *   🎬 오프닝   → 댄스        무대 장악·동선
 *   ✨ 킬링파트 → 포지션 주 스탯  하이라이트는 자기 파트
 *   🔥 앵콜     → 체력        끝까지 버티는 것
 *
 * window.TourStage를 부를 때마다 찾아가요(변수에 캐시하지 않아요) — 테스트가
 * 기록용으로 갈아끼울 수 있어야 하니까요. window.Timing을 쓰던 방식과 같아요. */
const TOUR_MECH = {
  // 🎬 오프닝 — 관객석을 흐르는 함성 웨이브를 3번 연속 잡아요 (댄스: 무대 장악)
  wave: {
    stat: () => S.stats.dance,
    label: (c, y) => `🎬 ${c} 오프닝! "${y}" 함성이 객석을 타고 흘러요 — 최고조인 구역을 잡아요!`,
    run: (box, label, cb) => window.TourStage.wave(box, {
      label, button: "함성! 🙌", zonePct: miniZone(S.stats.dance),
    }, cb),
  },
  // ✨ 킬링파트 — 서로 다른 속도로 왕복하는 두 파트가 겹치는 순간 (포지션 주 스탯)
  sync: {
    stat: () => S.stats[POS_INFO[S.pos].stat],
    label: (c, y) => `✨ ${c} 하이라이트! "${y}" 속에서 두 파트가 겹치는 순간을 노려요!`,
    run: (box, label, cb) => window.TourStage.sync(box, {
      label, button: "싱크! ✨", zonePct: miniZone(S.stats[POS_INFO[S.pos].stat]),
    }, cb),
  },
  // 🔥 앵콜 — 식어가는 함성을 연타로 목표선 위에 붙잡아 둬요 (체력: 끝까지 버티기)
  roar: {
    stat: () => S.stats.stamina,
    label: (c, y) => `🔥 ${c} 앵콜! "${y}"가 식지 않게 마지막까지 함성을 끌어올려요!`,
    run: (box, label, cb) => window.TourStage.roar(box, {
      label, button: "연타! 🔥", zonePct: miniZone(S.stats.stamina),
    }, cb),
  },
};

/* 세 무대를 연달아 돌려요. 끝나면 cb([{ key, mech, res }, …])로 세 결과를 넘겨요.
 * opts.onStage(stage, i, label)  — 무대에 오를 때 (진행 표시·로그용)
 * opts.onResult(stage, res, msg) — 한 무대가 끝났을 때
 * 자동 플레이(autoMiniOn)면 미니게임을 띄우지 않고 즉시 판정해요 — 다른 미니게임들과
 * 같은 경로예요. 없으면 테스트도 확인 페이지도 투어에서 막혀요. */
function playTourSet(container, opts, cb) {
  const city = (opts && opts.city) || "이 도시";
  const cheer = (opts && opts.cheer) || "앵콜!";
  const mechs = TOUR_STAGES.map((st) => st.mech);
  const out = [];
  const step = (i) => {
    if (i >= TOUR_STAGES.length) { cb(out); return; }
    const stage = TOUR_STAGES[i];
    const mech = TOUR_MECH[mechs[i]];
    const label = mech.label(city, cheer);
    if (opts.onStage) opts.onStage(stage, i, label);
    const land = (res) => {
      out.push({ key: stage.key, mech: mechs[i], res });
      if (opts.onResult) opts.onResult(stage, res, tourStageMsg(stage, res, city, cheer));
      step(i + 1);
    };
    if (autoMiniOn()) { land(autoRes(mech.stat())); return; }
    mech.run(container, label, land);
  };
  step(0);
}

/* 세 무대를 하나의 객석 기반 점수로 합쳐요 — 무대마다 따로 굴리고 가중합해요.
 * 판정별 폭은 컴백 무대에서 쓰던 폭과 같아요. */
const TOUR_RES_VAL = { perfect: [0.93, 1.0], good: [0.68, 0.86], miss: [0.34, 0.56] };
function tourSetBase(results) {
  let sum = 0, wsum = 0;
  for (const r of results || []) {
    const stage = TOUR_STAGES.find((s) => s.key === r.key) || TOUR_STAGES[0];
    const span = TOUR_RES_VAL[r.res] || TOUR_RES_VAL.good;
    sum += stage.weight * rand(span[0], span[1]);
    wsum += stage.weight;
  }
  return wsum ? sum / wsum : 0;
}

let stageTimer = null;
// 무대를 문자중계처럼 연출 + 하이라이트 타이밍 미니게임 → 결과는 onFinal(최종등급)로
function renderStageSim(type, grade, onFinal) {
  const key = type.main || POS_INFO[S.pos].stat;
  const pool = MOMENTS[key] || MOMENTS.vocal;
  const goodN = grade.g === "S" ? 3 : grade.g === "A" ? 2 : grade.g === "B" ? 1 : 0;
  const badN = grade.g === "D" ? 2 : grade.g === "C" ? 1 : grade.g === "B" ? 1 : 0;
  const moments = shuffle([
    ...shuffle([...pool.good]).slice(0, goodN).map((t) => ({ text: t, cls: "good" })),
    ...shuffle([...pool.bad]).slice(0, badN).map((t) => ({ text: t, cls: "bad" })),
  ]);
  const feeds = [
    { text: `🎤 ${S.name}, ${type.name}에 오릅니다.` },
    { text: "조명이 켜지고, 음악이 시작돼요 🎶" },
    ...moments,
  ];

  $("stage-card").innerHTML = `<div class="pbp" id="pbp"></div><div id="stage-moment"></div><div id="stage-result"></div>`;
  let idx = 0, momentOn = false, finished = false;
  function applyFeed(f) {
    const div = document.createElement("div");
    if (f.cls) div.className = f.cls;
    div.textContent = f.text;
    $("pbp").appendChild(div);
    $("pbp").scrollTop = $("pbp").scrollHeight;
  }
  function startMoment() {
    if (momentOn) return;
    momentOn = true;
    clearInterval(stageTimer);
    applyFeed({ text: "✨ 하이라이트 파트가 다가와요…!", cls: "good" });
    const btn = $("btn-stage-next");
    btn.disabled = true;
    btn.textContent = "✨ 하이라이트!";
    playRandomMini($("stage-moment"), (res, type) => {
      let gi = GRADE_ORDER.indexOf(grade.g);
      if (res === "perfect") gi = Math.min(4, gi + 1);
      else if (res === "miss") gi = Math.max(0, gi - 1);
      const finalGrade = makeGrade(GRADE_ORDER[gi]);
      applyFeed(res === "perfect"
        ? { text: type.great, cls: "good" }
        : res === "good"
          ? { text: type.ok }
          : { text: type.bad, cls: "bad" });
      applyFeed({ text: "심사위원들이 점수를 적습니다… ✍️" });
      showResult(finalGrade);
    });
  }
  function showResult(finalGrade) {
    if (finished) return;
    finished = true;
    clearInterval(stageTimer);
    const r = onFinal(finalGrade);
    $("stage-result").innerHTML = r.resultHTML;
    const btn = $("btn-stage-next");
    btn.disabled = false;
    btn.textContent = r.nextLabel;
    btn.onclick = r.nextFn;
  }
  stageTimer = setInterval(() => {
    if (idx >= feeds.length) { startMoment(); return; }
    applyFeed(feeds[idx++]);
  }, 650);
  const btn = $("btn-stage-next");
  btn.textContent = "⏩ 빨리 감기";
  btn.disabled = false;
  btn.onclick = () => {
    if (momentOn || finished) return;
    while (idx < feeds.length) applyFeed(feeds[idx++]);
    startMoment();
  };
}

// ---------- 정기 평가 (쇼케이스) ----------
function startEval(name) {
  ev = { kind: "eval", name, idx: 0, totalPts: 0, scores: [] };
  $("stage-title").textContent = `🎪 ${S.year}년차 ${name}`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">🎤 전 연습생 공개 평가!</div>
    <div class="tour-line">세 번의 무대에 올라요.<br/>좋은 무대를 보여주면 팬덤과 회사의 주목도가 올라요.</div>`;
  $("btn-stage-next").textContent = "첫 무대 오르기";
  $("btn-stage-next").onclick = playEvalStage;
  show("screen-stage");
}

function playEvalStage() {
  const a = agencyOf();
  // 1·2번째 무대는 보컬/댄스/랩 중 랜덤, 마지막은 포지션 자유 무대
  const type = ev.idx === 2 ? STAGE_TYPES[3] : STAGE_TYPES[pick([0, 1, 2])];
  const { score } = stageScore(type);
  const grade = gradeOf(score);
  S.condition = clamp(S.condition - 5, 0, 100);
  ev.idx += 1;
  $("stage-round").textContent = `${ev.idx}번째 무대 · ${type.name}`;
  renderStageSim(type, grade, (fg) => {
    const pts = Math.round(fg.pts * a.spot);
    const pay = { S: 60, A: 40, B: 25, C: 10, D: 0 }[fg.g] || 0;
    S.money = (S.money || 0) + pay;
    S.fandom = Math.max(0, S.fandom + pts);
    S.stages += 1;
    ev.totalPts += pts;
    ev.scores.push(score + (fg.pts - grade.pts) * 0.6);
    save();
    const resultHTML = `
      <div class="tour-vs">무대 등급 <span class="${fg.g === "S" || fg.g === "A" ? "win" : fg.g === "D" ? "lose" : ""}">${fg.g}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `💖 팬덤 +${pts}` : `📉 팬덤 ${pts}`}${pay ? ` · 💰 수당 +${pay}만` : ""}</div>`;
    return ev.idx < 3
      ? { resultHTML, nextLabel: "다음 무대", nextFn: playEvalStage }
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
    <div class="tour-vs">연습생 24명 중 <span class="${rank <= 3 ? "win" : rank >= 18 ? "lose" : ""}">${rank}위</span></div>
    <div class="tour-line">${
      rank === 1 ? "🏆 전체 1위! 회사가 데뷔조 명단에 이름을 올려두기 시작했어요." :
      rank <= 3 ? "🌟 최상위권! 트레이너들 사이에서 데뷔조 후보로 불려요." :
      rank <= 10 ? "🙂 중상위권. 꾸준함이 무기예요." :
      rank <= 17 ? "😐 중하위권… 다음 평가까지 더 달려야 해요." :
      "😨 하위권. 월말 면담이 잡혔어요. 분발해야 해요!"
    }</div>
    ${bonus ? `<div class="tour-pts">🏅 순위 보너스 팬덤 +${bonus}</div>` : ""}
    <div class="tour-pts">이번 평가 팬덤 합계 +${ev.totalPts + bonus}</div>`;
  $("btn-stage-next").textContent = "연습실로 돌아가기";
  $("btn-stage-next").onclick = () => {
    addLog(`🎪 ${ev.name} ${rank}위! (팬덤 +${ev.totalPts + bonus})`);
    ev = null;
    show("screen-main");
    advanceMonth();
  };
}

// ---------- 데뷔 서바이벌 ----------
function startSurvival() {
  ev = { kind: "survival", round: 0, eliminated: false };
  $("stage-title").textContent = `📺 데뷔 서바이벌 <더 파이널>`;
  $("stage-round").textContent = "";
  // 연장으로 올라간 문턱은 무대에 오르기 전에 숫자로 알려줘요.
  const ext = traineeExt();
  $("stage-card").innerHTML = `
    <div class="tour-vs">🔥 전국 연습생 100명, 데뷔조는 단 7명</div>
    <div class="tour-line">3년의 연습이 오늘을 위해 있었어요.<br/>예선부터 파이널까지, 살아남으면 데뷔합니다.</div>
    ${ext ? `<div class="tour-pts">🌱 연습생 연장 ${ext}회 · 나이 패널티로 라운드 통과 확률 -${extPenaltyPct(ext)}%p</div>` : ""}`;
  $("btn-stage-next").textContent = "예선 무대 오르기";
  $("btn-stage-next").onclick = playSurvivalRound;
  show("screen-stage");
}

function playSurvivalRound() {
  const a = agencyOf();
  const roundName = SURVIVAL_ROUNDS[ev.round];
  const type = pick(STAGE_TYPES);
  const { score } = stageScore(type);
  const grade = gradeOf(score);
  S.condition = clamp(S.condition - 5, 0, 100);
  $("stage-round").textContent = `${roundName} · ${type.name}`;
  renderStageSim(type, grade, (fg) => {
    const pts = Math.round(fg.pts * a.spot) + ev.round * 4;
    S.money = (S.money || 0) + 30 + ev.round * 20;
    S.fandom = Math.max(0, S.fandom + pts);
    S.stages += 1;
    // 하이라이트 성공/실패가 생존 확률에도 영향
    const momentBonus = fg.pts > grade.pts ? 0.06 : fg.pts < grade.pts ? -0.06 : 0;
    // 🌱 연장한 횟수만큼 문턱이 올라가요 — 나이 패널티예요.
    const p = clamp(
      0.40 + a.debut * 0.35 + (overall() - 50) / 90 + S.fandom / 1500 +
      (S.condition - 50) / 900 - ev.round * 0.05 + momentBonus - extPenalty(),
      0.12, 0.93
    );
    const pass = Math.random() < p;
    save();
    const resultHTML = `
      <div class="tour-vs">무대 등급 ${fg.g} — <span class="${pass ? "win" : "lose"}">${pass ? "생존! 🎉" : "탈락… 💧"}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `💖 팬덤 +${pts}` : `📉 팬덤 ${pts}`}</div>`;
    if (pass && ev.round < SURVIVAL_ROUNDS.length - 1) {
      ev.round += 1;
      return { resultHTML, nextLabel: `${SURVIVAL_ROUNDS[ev.round]} 진출!`, nextFn: playSurvivalRound };
    }
    ev.eliminated = !pass;
    const capturedRound = ev.round;
    return {
      resultHTML,
      nextLabel: pass ? "🌟 최종 발표 보러 가기" : "결과 받아들이기",
      nextFn: () => showEnding(pass, capturedRound),
    };
  });
}

// ---------- 엔딩 ----------
function showEnding(survivedFinal, lastRound) {
  const a = agencyOf();
  const score = S.fandom + overall() * 2;

  /* 🌱 연습생 재계약은 "연장"이라는 말 그대로 한 해를 더 줘요. 횟수 제한은 없어요 —
   * 대신 연장할수록 데뷔 서바이벌 문턱이 올라가서(TRAINEE_EXT_PENALTY) 스스로 제동이 걸려요.
   * 📞 타사 캐스팅은 실제로 다른 기획사에서 데뷔로 이어져요. 조건(lastRound === 2 &&
   * score >= 420)을 호출부에서 다시 계산하면 분기와 어긋날 수 있으니 여기서 플래그만 세워요. */
  let emoji, title, teamLine, msg, canExtend = false, castPro = null;
  const extNext = traineeExt() + 1;   // 지금 버튼을 누르면 몇 번째 연장인지
  if (survivedFinal && score >= 520) {
    emoji = "👑"; title = "데뷔조 센터 데뷔!";
    teamLine = `${a.name} 신인 그룹 — 센터 확정`;
    msg = "최종 1픽! 데뷔 무대의 정중앙은 당신의 자리예요.";
  } else if (survivedFinal) {
    emoji = "🌟"; title = "데뷔조 합류!";
    teamLine = `${a.name} 신인 그룹 데뷔 확정`;
    msg = "파이널 생존! 3년의 연습실 생활이 드디어 무대가 됐어요.";
  } else if (lastRound === 3) {
    emoji = "💜"; title = "파이널 탈락… 하지만!";
    teamLine = `${a.name} 차기 데뷔조 확정`;
    msg = "아쉽게 최종 데뷔조엔 들지 못했지만, 회사가 차기 그룹 데뷔를 약속했어요.";
  } else if (lastRound === 2 && score >= 420) {
    // 데뷔 파워가 제일 낮은 기획사로 옮겨서 데뷔해요. 이미 그곳 소속이면 그대로 남아요.
    const cast = castingAgency();
    castPro = cast.id;
    emoji = "📞";
    title = cast.id === a.id ? "신생 기획사 데뷔조!" : "타사 캐스팅!";
    teamLine = `${cast.emoji} ${cast.name} 신인 그룹 데뷔조`;
    msg = cast.id === a.id
      ? `세미파이널 무대를 본 회사가 데뷔조를 짰어요. ${cast.name}는 데뷔 파워가 가장 약한 신생 기획사라 출발은 불리하지만, 여기서 데뷔 활동이 시작돼요.`
      : `세미파이널 무대를 본 ${cast.name}에서 러브콜이 왔어요. ${a.name}보다 데뷔 파워가 약한 신생 기획사라 출발은 불리하지만, 여기서 데뷔 활동이 시작돼요.`;
  } else if (lastRound >= 1) {
    emoji = "🌱"; title = "연습생 재계약";
    teamLine = `${a.name} 연습생 연장 계약`;
    canExtend = true;   // 연습생은 몇 번이든 더 할 수 있어요 — 횟수 제한은 두지 않아요
    msg = "이번엔 여기까지. 하지만 회사는 아직 당신을 믿고 있어요 — 한 해를 더 연습할 수 있어요.";
  } else if (score >= 330) {
    emoji = "📹"; title = "홀로서기 선언";
    teamLine = "연습생 계약 종료 — 내 채널로 홀로서기";
    msg = "예선에서 멈췄어요. 회사를 나와 직접 연 채널에는 3년의 무대가 그대로 남았어요.";
  } else {
    emoji = "🎒"; title = "연습실과 작별";
    teamLine = "평범한 일상으로 복귀";
    msg = "꿈은 이루지 못했지만 3년의 땀은 사라지지 않아요. 무대 밖에도 인생은 있으니까!";
  }

  const statLines = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${Math.round(S.stats[d.key])}`)
    .join(" · ");
  const trophyLine = S.trophies.length
    ? `🏆 ${S.trophies.join(", ")}`
    : "🏆 평가 1위 경력 없음";

  /* 연장은 공짜가 아니에요. 몇 번째 연장인지, 문턱이 얼마나 올라가는지 숫자로 보여줘요.
   * 감추면 눌러 놓고 나중에 이유를 모른 채 떨어지게 돼요. */
  const extNote = canExtend
    ? `<div class="draft-summary" id="ext-note">
        🌱 한 해 더 연습하면 <b>${extNext}번째 연장</b>이에요<br/>
        나이 패널티로 데뷔 서바이벌 라운드 통과 확률이
        ${traineeExt() ? `지금 -${extPenaltyPct()}%p에서 ` : ""}<b>-${extPenaltyPct(extNext)}%p</b>가 돼요<br/>
        한 해를 제대로 굴리면 (종합 +7~8) 딱 그만큼을 되찾을 수 있어요
      </div>`
    : "";

  $("ending-card").innerHTML = `
    <div class="draft-emoji">${emoji}</div>
    <div class="draft-title">${title}</div>
    <div class="draft-team">${teamLine}</div>
    <div>${msg}</div>
    <div class="draft-summary">
      ${a.emoji} ${a.name} · ${POS_INFO[S.pos].name} ${S.name}<br/>
      ${statLines}<br/>
      💖 최종 팬덤 ${Math.round(S.fandom)} · 무대 ${S.stages}회<br/>
      ${traineeExt() ? `🌱 연습생 연장 ${traineeExt()}회 (통과 확률 -${extPenaltyPct()}%p)<br/>` : ""}
      ${trophyLine}
    </div>
    ${extNote}`;

  $("btn-share").onclick = () => {
    const text = `🎤 더 트레이니 결과\n${a.name} ${S.name} — ${title}\n${teamLine}\n팬덤 ${Math.round(S.fandom)} / ${trophyLine}`;
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

  /* 데뷔조 합류·차기 데뷔조·📞 타사 캐스팅이면 데뷔 활동으로 이어갈 수 있어요.
   * keepSave를 넘기면 career.js가 clearSave()를 건너뛰어요 — 안 넘기면
   * "한 해 더 연습하기"를 누르기도 전에 세이브가 날아가요.
   * castAgency는 📞 경로 표시예요. 데뷔는 데뷔인데 제일 약한 기획사에서 출발해요. */
  if (window.IdolCareer) {
    window.IdolCareer.onEnding(
      survivedFinal || lastRound === 3 || !!castPro,
      survivedFinal && score >= 520,
      { keepSave: canExtend, castAgency: castPro }
    );
  } else if (!canExtend) {
    clearSave();
  }
  renderTraineeExtButton(canExtend);
  show("screen-ending");
}

/* 🌱 한 해 더 연습하기 — 엔딩 화면 맨 앞에 붙여요.
 * 연장을 안 쓰고 "🏛️ 기록 남기고 마무리"로 끝낼 수도 있어야 해서 다른 버튼은 그대로 둬요. */
function renderTraineeExtButton(canExtend) {
  document.getElementById("btn-trainee-ext")?.remove();
  if (!canExtend) return;
  const actions = document.querySelector("#screen-ending .draft-actions");
  if (!actions) return;
  const btn = document.createElement("button");
  btn.id = "btn-trainee-ext";
  btn.className = "btn btn-primary";
  btn.textContent = "🌱 한 해 더 연습하기";
  btn.onclick = extendTrainee;
  actions.prepend(btn);
}

/* 능력치·재능·팬덤·트로피는 그대로 두고 3년차 1월로만 되돌려요.
 * 횟수 제한은 없어요 — 대신 S.traineeExt가 늘면서 데뷔 서바이벌 문턱이 올라가요. */
function extendTrainee() {
  S.traineeExt = traineeExt() + 1;
  S.year = 3;
  S.month = 1;
  S.pendingStage = null;
  ev = null;
  addLog(`🌱 연습생 연장 계약 ${S.traineeExt}회! 3년차를 한 번 더 뛰어요. ` +
    `(데뷔 서바이벌 라운드 통과 확률 -${extPenaltyPct()}%p)`);
  save();
  renderMain();
  show("screen-main");
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
  { emoji: "🎤", title: "무대와 데뷔 서바이벌", body:
    "연습생 3년 동안 무대에 서며 실력과 인지도를 쌓아요.\n" +
    "3년이 끝나면 데뷔 서바이벌에서 그동안의 성과가 갈려요.\n" +
    "통과하면 데뷔해서 컴백 활동을 이어가고, 아니면 연습생으로 커리어가 끝나요.\n" +
    "🌱연습생 재계약으로 끝났다면 능력치를 그대로 안고 3년차를 다시 뛸 수 있어요.\n" +
    `횟수 제한은 없지만 연장 한 번마다 라운드 통과 확률이 ${Math.round(TRAINEE_EXT_PENALTY * 100)}%p씩 낮아져요 —\n` +
    "한 해를 제대로 굴리면 그만큼을 되찾지만, 대충 보내면 문턱만 높아져요." },
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
  if (window.Help) window.Help.open("🎤 더 트레이니 도움말", HELP_SECTIONS);
}
$("btn-help-main")?.addEventListener("click", openHelp);
$("btn-help-pro")?.addEventListener("click", openHelp);

// ---------- 시작 ----------
initTitle();
if (window.Stats) Stats.init("idol");

/* ☁️ 클라우드 세이브 연결 — 타이틀 진입 시 서버와 맞춰요 */
if (window.Cloud) {
  Cloud.init("idol");
  $("btn-cloud")?.addEventListener("click", () => Cloud.openModal());
}
