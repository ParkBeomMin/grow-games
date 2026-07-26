/* 더 스트리머 📺 스트리머 키우기 */
"use strict";

// ---------- 데이터 ----------
const MARKETS = [
  {
    id: "big", name: "대형 플랫폼", emoji: "📺", tier: "메이저",
    debut: 0.66, growth: 0.98, spot: 1.0,
    desc: "노출이 좋아 대박 기회. 대신 경쟁이 지옥이에요",
  },
  {
    id: "game", name: "게임 특화", emoji: "🎮", tier: "니치",
    debut: 0.6, growth: 1.12, spot: 1.1,
    desc: "충성 시청자가 빠르게 붙어요",
  },
  {
    id: "short", name: "숏폼", emoji: "📱", tier: "바이럴",
    debut: 0.58, growth: 1.15, spot: 1.15,
    desc: "한 방 터지면 폭발 성장. 대신 기복이 커요",
  },
  {
    id: "vtuber", name: "버추얼", emoji: "🐰", tier: "신개념",
    debut: 0.6, growth: 1.1, spot: 1.1,
    desc: "캐릭터로 승부하는 신세계. 팬덤이 단단해요",
  },
  {
    id: "indie", name: "개인 방송국", emoji: "📻", tier: "자유",
    debut: 0.56, growth: 1.16, spot: 1.05,
    desc: "내 마음대로 굴리는 야생 방송. 성장 폭이 커요",
  },
];

const STAT_DEFS = [
  { key: "talk", name: "입담", emoji: "🎤", sub: "말빨·재치" },
  { key: "plan", name: "기획력", emoji: "💡", sub: "콘텐츠 아이디어" },
  { key: "reaction", name: "리액션", emoji: "😲", sub: "순발력·텐션" },
  { key: "chat", name: "소통력", emoji: "💬", sub: "시청자 소통" },
  { key: "stamina", name: "체력", emoji: "🔋", sub: "장시간 방송" },
];

// 방송 장르 — 야구의 '포지션' 대응. 주력 능력치가 달라져요
const POS_INFO = {
  game: { name: "게임 방송", stat: "reaction" },
  talk: { name: "토크", stat: "talk" },
  variety: { name: "예능·챌린지", stat: "plan" },
  irl: { name: "야외·일상", stat: "stamina" },
};

const STREAM_NAMES = ["빵형", "섭이", "코난", "랄라", "도치", "우와", "킹아", "별방", "꿀잼", "괴물신인", "침착이", "대상"];

const STAGE_TYPES = [
  { name: "게임 실력 방송", main: "reaction", aux: "stamina" },
  { name: "토크 라이브", main: "talk", aux: "chat" },
  { name: "기획 콘텐츠", main: "plan", aux: "talk" },
  { name: "자유 방송", main: null, aux: "chat" },
];

const EVALS = { 6: "상반기 스트리머 챌린지", 12: "연말 크리에이터 어워드" };
const SURVIVAL_ROUNDS = ["첫 방송", "합방 오디션", "챌린지 미션", "파트너 심사"];

// ---------- 상태 ----------
const SAVE_KEY = "streamer-save-v1";

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
let ev = null;

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
    stroke: "#c07bff",
    fill: "rgba(192, 123, 255, 0.28)",
  });
  $("roll-stars").innerHTML = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(talentStars(pendingRoll.talents[d.key]))}`)
    .join(" · ") + `<br/>⭐ = 잠재력 — 별이 많은 능력치일수록 연습 효율이 높아요`;
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
    // 🧬 환생 유산으로 받은 시작 자금이에요. 유산이 없으면 0이에요.
    money: legacyMoneyBonus(loadLegacy().pts),
    gear: {},
    condition: 80,
    fandom: 0, // 구독자·화제성
    buff: false,
    trophies: [],
    stages: 0, // 참가한 챌린지 수
    log: [],
  };
}

const marketOf = () => MARKETS.find((m) => m.id === S.market);
const overall = () => {
  const vals = Object.values(S.stats);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

// ---------- 저장 — 여러 스트리머(슬롯) 지원 ----------
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
// 평균 재능(1.3) 기준 ±6%, 초월 단계로 최대 +6%p 추가 → 총 0.90 ~ 1.16배.
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
  } else {
    S.stats[key] = randInt(30, 50);
    logFn(`🔮💦 각성 실패… ${d.name} ${Math.round(S.stats[key])}부터 다시 담금질!`);
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
      <p class="av-title">🎁 무료 연습!</p>
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
      body.innerHTML = `<div class="ad-emoji">${d.emoji}</div><b>${d.name} +${gain.toFixed(1)}</b> 연습 완료!<br/><span class="av-note">턴을 소모하지 않는 보너스 연습 · 다음은 30분 후</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>연습을 놓쳤어요`;
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
    btn.innerHTML = `<span class="a-emoji">🎁</span>연습<span class="a-sub">${Math.ceil(left / 60000)}분 후 가능</span>`;
  } else {
    btn.innerHTML = `<span class="a-emoji">🎁</span>연습<span class="a-sub">30분마다 무료 연습</span>`;
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
          alert("자금이 부족해요! 방송 수익이나 보너스로 모아봐요 💰");
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
  let curHtml = "";
  if (S.activity) {
    const act = S.activity;
    curHtml = `<br/><b>🔥 진행 중인 시즌</b><br/>${["상반기", "하반기"][act.cb - 1] || act.cb + "차"} · ${act.week}/${act.weekTotal}주차 방송<br/>실시간 1위 ${act.wins}회 · 화제 지수 ${act.hypeSum >= 0 ? "+" : ""}${Math.round(act.hypeSum * 10) / 10}<br/>`;
  }
  let proHtml = "";
  if (S.career && S.career.years && S.career.years.length) {
    const rows = S.career.years.map((x) =>
      `<tr><td>${x.y}년차</td><td>1위 ${x.wins}회</td><td>${x.sales}만</td><td>${x.awards && x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    proHtml = `
      <table class="season-table"><thead><tr><th>연차</th><th>실시간1위</th><th>수익</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div>통산 ${S.career.years.length}년 · 1위 ${S.career.wins}회 · 🏆 올해의스트리머 ${S.career.daesang} · 인기상 ${S.career.bonsang}${S.career.rookie ? " · 신인상" : ""}</div>`;
  }
  const gearList = STAT_DEFS
    .map((d) => {
      const owned = GEAR_TIERS.filter((t) => S.gear && S.gear[`${d.key}-${t.n}`]).length;
      return owned ? `${d.emoji}${"★".repeat(owned)}` : null;
    })
    .filter(Boolean)
    .join(" ");
  $("record-card").innerHTML = `
    <div class="draft-emoji">📺</div>
    <div class="draft-title">${S.name}</div>
    <div class="draft-team">${S.phase === "stream-pro" ? `${S.group}${S.center ? " · 인기 1위" : ""} · ${S.proYear}년차` : `${m.emoji} ${m.name} ${S.year}년차`} · ${POS_INFO[S.pos].name}</div>
    <div class="draft-summary">
      <b>🌱 무명 기록</b><br/>챌린지 ${S.stages || 0}회 · ⭐ 구독자·화제성 ${Math.round(S.fandom)}<br/>${trophyLine}<br/>
      ${curHtml}
      ${proHtml ? `<br/><b>📺 전업 기록</b>${proHtml}<br/>` : ""}
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
    const c = window.StreamerCareer;
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
    Match.count("stream").then((n) => {
      if (n) {
        $("title-count").innerHTML = `📺 지금까지 <b>${n.toLocaleString()}명</b>의 스트리머가 방송을 켰어요!`;
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
  if (S.phase === "stream-pro" && window.StreamerCareer) {
    window.StreamerCareer.showActivity();
  } else {
    renderMain();
    show("screen-main");
  }
}

function slotDesc(st) {
  const posName = POS_INFO[st.pos] ? POS_INFO[st.pos].name : "";
  if (st.phase === "stream-pro") return `📺 ${st.group || "전업 스트리머"} · ${st.proYear || 1}년차${st.center ? " · 인기1위" : ""}`;
  const m = MARKETS.find((x) => x.id === st.market);
  return `${m ? m.emoji + " " + m.name : ""} ${st.year}년차 · ${posName}`;
}

function showSlotPicker() {
  const sl = loadSlots();
  const ids = Object.keys(sl).sort((a, b) => (sl[b].savedAt || 0) - (sl[a].savedAt || 0));
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal slot-modal">
      <p class="av-title">👥 어떤 스트리머로 이어할까요?</p>
      <div class="slot-list">${ids.map((id) => {
        const st = sl[id];
        const d = st.savedAt ? new Date(st.savedAt) : null;
        return `
          <div class="slot-row">
            <button type="button" class="slot-go" data-id="${id}">
              <span class="slot-avatar slot-emoji">📺</span>
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
      if (!confirm(`${st ? st.name : "이 스트리머"}의 저장을 삭제할까요? 되돌릴 수 없어요!`)) return;
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
      $("position-hint").textContent = `${m.name} 시작! 어떤 장르로 방송할까요?`;
      show("screen-position");
    };
    box.appendChild(btn);
  }
}

document.querySelectorAll("#position-list .card").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenPos = btn.dataset.pos;
    $("name-hint").textContent = `${chosenMarket.name} ${POS_INFO[chosenPos].name} 스트리머의 닉네임은?`;
    $("input-name").value = pick(STREAM_NAMES);
    pendingRoll = rollStats(chosenPos);
    show("screen-name");
    renderRoll();
  });
});

$("btn-random-name").addEventListener("click", () => {
  $("input-name").value = pick(STREAM_NAMES);
});

$("btn-start").addEventListener("click", () => {
  const name = $("input-name").value.trim() || pick(STREAM_NAMES);
  curSlot = null;
  if (window.Stats) Stats.log("new_player", { pos: chosenPos, agency: chosenMarket.name });
  if (window.Match) Match.register("stream", name);
  S = newState(chosenMarket, chosenPos, name, pendingRoll);
  addLog(`📺 ${chosenMarket.name} 시작! ${name}의 방송 인생이 시작됐어요.`);
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
      <span class="stat-pot" title="잠재력 — 별이 많을수록 연습 효율이 높아요">${stars}</span>`;
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

  if (S.pendingStage) {
    actBox.querySelectorAll(".action-btn").forEach((b) => {
      if (!b.classList.contains("ad-slot")) b.disabled = true;
    });
    const ps = S.pendingStage;
    const go = document.createElement("button");
    go.className = "action-btn rest go-game";
    go.innerHTML = ps.kind === "survival"
      ? `<span class="a-emoji">🔥</span>전업 도전 시작!<span class="a-sub">3년의 방송이 여기서 판가름나요</span>`
      : `<span class="a-emoji">🏆</span>${ps.name} 참가!<span class="a-sub">준비 완료</span>`;
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
  const m = marketOf();

  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🥵 목이 쉬도록 방송하다 뻗었어요. 한 달을 회복으로 날렸어요.`);
    actFx(def.key, "🤕 부상", true);
    endMonth();
    return;
  }

  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 연습이 영 안 풀렸어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
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
  const m = marketOf();
  const events = [
    () => {
      const d = pick(STAT_DEFS);
      S.stats[d.key] = clamp(S.stats[d.key] + 3, 0, statCap(d.key));
      addLog(`🧑‍🏫 선배 스트리머의 꿀팁을 얻었어요! ${d.name} +3`);
    },
    () => {
      const pts = Math.round(8 * m.spot);
      S.fandom += pts;
      addLog(`📱 편집 클립이 알고리즘을 탔어요! 화제성 +${pts}`);
    },
    () => {
      S.condition = clamp(S.condition - 20, 0, 100);
      addLog(`🌙 밤샘 방송으로 뻗었어요. 컨디션 -20`);
    },
    () => {
      S.condition = clamp(S.condition + 12, 0, 100);
      addLog(`☕ 여유로운 휴방으로 리프레시! 컨디션 +12`);
    },
    () => {
      S.buff = true;
      addLog(`🔥 라이벌의 대박 방송에 자극받았어요! 다음 연습 효율 1.5배`);
    },
    () => {
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, statCap("stamina"));
      addLog(`🏃 규칙적인 방송 루틴이 자리잡았어요. 체력 +2`);
    },
    () => {
      S.fandom = Math.max(0, S.fandom - 10);
      addLog(`📉 사소한 방송 실수가 짤로 돌아요… 화제성 -10`);
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

// ---------- 방송 공통 ----------
function stageScore(type) {
  const mainKey = type.main || POS_INFO[S.pos].stat;
  const score =
    S.stats[mainKey] * 0.55 +
    S.stats[type.aux] * 0.2 +
    S.stats.chat * 0.1 +
    S.condition / 8 +
    rand(-9, 9);
  return { mainKey, score };
}

const GRADE_ORDER = ["D", "C", "B", "A", "S"];
const GRADE_INFO = {
  S: { pts: 30, txt: "🚀 역대급 방송! 클립이 알고리즘을 타고 퍼져요." },
  A: { pts: 22, txt: "🔥 채팅창이 폭발! 시청자가 몰려와요." },
  B: { pts: 15, txt: "🙂 무난한 방송. 고정 시청자는 만족했어요." },
  C: { pts: 9, txt: "😬 살짝 늘어지는 구간이 있었어요." },
  D: { pts: -5, txt: "😢 방송 사고… 시청자가 우수수 나갔어요." },
};
const makeGrade = (g) => ({ g, ...GRADE_INFO[g] });

function gradeOf(score) {
  if (score >= 76) return makeGrade("S");
  if (score >= 64) return makeGrade("A");
  if (score >= 52) return makeGrade("B");
  if (score >= 40) return makeGrade("C");
  return makeGrade("D");
}

// ---------- 연출 ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MOMENTS = {
  reaction: {
    good: ["기가 막힌 순발력에 채팅창 폭발! 😲", "클러치 상황을 완벽하게 넘겨요 ✨", "예상 못한 반전에 리액션 만점! 🔥"],
    bad: ["살짝 버벅였어요 😬", "타이밍을 놓칠 뻔했어요 💦"],
  },
  talk: {
    good: ["드립이 찰지게 터졌어요! 🎤", "입담으로 채팅을 쥐락펴락 ✨", "진솔한 이야기에 시청자가 감동해요 🔥"],
    bad: ["말이 살짝 꼬였어요 😬", "드립이 살짝 식었어요 💦"],
  },
  plan: {
    good: ["기획이 제대로 먹혔어요! 💡", "콘텐츠 구성이 신선해요 ✨", "반전 기획에 시청자가 놀라요 🔥"],
    bad: ["구성이 살짝 늘어졌어요 😬", "기획 의도가 애매했어요 💦"],
  },
};

// 승부처 미니게임 — 클립타이밍/텐션/기획순서/돌발대응/여론읽기 5종 랜덤
const STREAM_BAR = { ok: "✨ 좋은 장면을 잘 잡았어요", great: "💫 완벽한 클립! 알고리즘 대박 예감!!", bad: "😱 타이밍을 놓쳐 밍밍한 장면…" };
const STREAM_HOLD = { ok: "🔥 텐션을 알맞게 끌어올렸어요!", great: "💥 최고조 텐션, 채팅창 폭발!!", bad: "😵 너무 오버해서 선을 넘었어요" };
const STREAM_SEQ = { ok: "💡 기획 순서를 정확히 소화했어요", great: "🌟 완벽한 구성, 콘텐츠가 착착 감겨요!!", bad: "🙈 순서가 꼬여 흐름이 끊겼어요" };
const STREAM_REACT = { ok: "⚡ 돌발 상황에 바로 대응했어요", great: "🚀 0.1초 리액션, 레전드 짤 탄생!!", bad: "😵 대응이 늦어 어색한 침묵이…" };
const STREAM_DUEL = { ok: "🧠 채팅 여론을 정확히 읽었어요", great: "🎯 시청자 니즈 저격, 채팅창 도배!!", bad: "🙈 분위기를 잘못 읽어 싸늘해졌어요" };
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
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), STREAM_BAR); return; }
    window.Timing.play(container, {
      label: "🎬 하이라이트! 초록 존에서 클립 따기!",
      button: "클립! ✂️",
      zonePct: miniZone(S.stats[posStat]),
    }, (res) => cb(res, STREAM_BAR));
  } else if (mech === "hold") {
    if (autoMiniOn()) { cb(autoRes(S.stats.stamina), STREAM_HOLD); return; }
    window.Timing.hold(container, {
      label: "🔥 텐션 업! 꾹 눌러 끌어올리다 초록 존에서 딱!",
      button: "텐션! 🔥",
      zonePct: miniZone(S.stats.stamina),
    }, (res) => cb(res, STREAM_HOLD));
  } else if (mech === "seq") {
    if (autoMiniOn()) { cb(autoRes(S.stats.plan), STREAM_SEQ); return; }
    window.Timing.sequence(container, {
      label: "💡 콘텐츠 콘티! 순서를 기억했다가 그대로!",
      icons: ["🎤", "💡", "🎬", "👍"],
      showMs: 900 + S.stats.plan * 6 + (S.condition - 50) * 3,
    }, (res) => cb(res, STREAM_SEQ));
  } else if (mech === "react") {
    if (autoMiniOn()) { cb(autoRes(S.stats.reaction), STREAM_REACT); return; }
    window.Timing.reaction(container, {
      label: "⚡ 돌발 상황! 신호가 켜지면 즉시 리액션!",
      button: "리액션!! 😲",
      perfectMs: 300 + S.stats.reaction * 1.5,
      goodMs: 700 + S.stats.reaction * 2.5,
    }, (res) => cb(res, STREAM_REACT));
  } else if (mech === "target") {
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), STREAM_REACT); return; }
    window.Timing.target(container, {
      label: "💥 도네 알림 폭주! 튀어나오는 후원을 빠르게 탭!",
      icon: "💸", count: 3, lifeMs: 800 + Math.min(S.stats[posStat], 130) * 3,
    }, (res) => cb(res, STREAM_REACT));
  } else if (mech === "drop") {
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), STREAM_BAR); return; }
    window.Timing.drop(container, {
      label: "🎬 클립 캐치! 떨어지는 하이라이트를 초록 존에서 딱!",
      icon: "✂️", zonePct: miniZone(S.stats[posStat]),
    }, (res) => cb(res, STREAM_BAR));
  } else if (mech === "odd") {
    if (autoMiniOn()) { cb(autoRes(S.stats.chat), STREAM_DUEL); return; }
    window.Timing.odd(container, {
      label: "👀 채팅 관찰! 다른 이모지 하나를 빠르게 찾아 탭!",
      rounds: 2, sets: [["😂", "🤣"], ["👍", "👎"], ["❤️", "🧡"]],
    }, (res) => cb(res, STREAM_DUEL));
  } else {
    if (autoMiniOn()) { cb(autoRes(S.stats.chat), STREAM_DUEL); return; }
    window.Timing.duel(container, {
      label: "🧠 채팅 여론! 시청자가 원하는 건?",
      choices: ["드립", "진지", "리액션"],
      hintChance: clamp((S.stats.chat - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, (res) => cb(res, STREAM_DUEL));
  }
}

let stageTimer = null;
function renderStageSim(type, grade, onFinal) {
  const key = type.main || POS_INFO[S.pos].stat;
  const pool = MOMENTS[key] || MOMENTS.talk;
  const goodN = grade.g === "S" ? 3 : grade.g === "A" ? 2 : grade.g === "B" ? 1 : 0;
  const badN = grade.g === "D" ? 2 : grade.g === "C" ? 1 : grade.g === "B" ? 1 : 0;
  const moments = shuffle([
    ...shuffle([...pool.good]).slice(0, goodN).map((t) => ({ text: t, cls: "good" })),
    ...shuffle([...pool.bad]).slice(0, badN).map((t) => ({ text: t, cls: "bad" })),
  ]);
  const feeds = [
    { text: `📺 ${S.name}, ${type.name}에 나섭니다.` },
    { text: "방송 ON — 시청자가 하나둘 들어와요 🔴" },
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
    applyFeed({ text: "🔥 결정적인 방송 순간이 왔어요…!", cls: "good" });
    const btn = $("btn-stage-next");
    btn.disabled = true;
    btn.textContent = "🔥 승부처!";
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
      applyFeed({ text: "방송 종료! 시청자 반응을 집계합니다… 📊" });
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

// ---------- 스트리머 챌린지 ----------
function startEval(name) {
  ev = { kind: "eval", name, idx: 0, totalPts: 0, scores: [] };
  $("stage-title").textContent = `🏆 ${S.year}년차 ${name}`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">📺 전 스트리머가 겨루는 챌린지!</div>
    <div class="tour-line">세 번의 방송에 도전해요.<br/>좋은 성적이면 화제성과 업계의 주목이 올라요.</div>`;
  $("btn-stage-next").textContent = "첫 방송 시작";
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
  $("stage-round").textContent = `${ev.idx}번째 방송 · ${type.name}`;
  renderStageSim(type, grade, (fg) => {
    const pts = Math.round(fg.pts * m.spot);
    const pay = { S: 60, A: 40, B: 25, C: 10, D: 0 }[fg.g] || 0;
    S.money = (S.money || 0) + pay;
    S.fandom = Math.max(0, S.fandom + pts);
    S.stages += 1;
    ev.totalPts += pts;
    ev.scores.push(score + (fg.pts - grade.pts) * 0.6);
    save();
    const resultHTML = `
      <div class="tour-vs">방송 등급 <span class="${fg.g === "S" || fg.g === "A" ? "win" : fg.g === "D" ? "lose" : ""}">${fg.g}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `⭐ 화제성 +${pts}` : `📉 화제성 ${pts}`}${pay ? ` · 💰 후원 +${pay}만` : ""}</div>`;
    return ev.idx < 3
      ? { resultHTML, nextLabel: "다음 방송", nextFn: playEvalStage }
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
    <div class="tour-vs">스트리머 24명 중 <span class="${rank <= 3 ? "win" : rank >= 18 ? "lose" : ""}">${rank}위</span></div>
    <div class="tour-line">${
      rank === 1 ? "🏆 전체 1위! 커뮤니티 실검에 올랐어요." :
      rank <= 3 ? "🌟 최상위권! MCN들이 눈독을 들여요." :
      rank <= 10 ? "🙂 중상위권. 꾸준함이 무기예요." :
      rank <= 17 ? "😐 중하위권… 다음 챌린지까지 더 달려야 해요." :
      "😨 하위권. 콘텐츠 방향을 고민할 때예요. 분발!"
    }</div>
    ${bonus ? `<div class="tour-pts">🏅 순위 보너스 화제성 +${bonus}</div>` : ""}
    <div class="tour-pts">이번 챌린지 화제성 합계 +${ev.totalPts + bonus}</div>`;
  $("btn-stage-next").textContent = "방송국으로 돌아가기";
  $("btn-stage-next").onclick = () => {
    addLog(`🏆 ${ev.name} ${rank}위! (화제성 +${ev.totalPts + bonus})`);
    ev = null;
    show("screen-main");
    advanceMonth();
  };
}

// ---------- 전업 도전 ----------
function startSurvival() {
  ev = { kind: "survival", round: 0, eliminated: false };
  $("stage-title").textContent = `📺 전업 도전 <라이브 스타>`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">🔥 첫 방송부터 파트너 심사까지</div>
    <div class="tour-line">3년의 방송이 오늘을 위해 있었어요.<br/>모든 관문을 통과하면 전업 스트리머입니다.</div>`;
  $("btn-stage-next").textContent = "첫 방송 시작";
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
  renderStageSim(type, grade, (fg) => {
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
    save();
    const resultHTML = `
      <div class="tour-vs">방송 등급 ${fg.g} — <span class="${pass ? "win" : "lose"}">${pass ? "통과! 🎉" : "탈락… 💧"}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `⭐ 화제성 +${pts}` : `📉 화제성 ${pts}`}</div>`;
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
    emoji = "👑"; title = "대형 스트리머 등극!";
    teamLine = `${m.name} 파트너 — 플랫폼 인기 1위`;
    msg = "역대급 화제성! 실검을 장악하며 대세 스트리머가 됐어요.";
  } else if (survivedFinal) {
    emoji = "🌟"; title = "전업 스트리머 데뷔!";
    teamLine = `플랫폼 파트너 계약 확정`;
    msg = "전업 성공! 3년의 방송이 드디어 직업이 됐어요.";
  } else if (lastRound === 3) {
    emoji = "💜"; title = "파트너 대기";
    teamLine = "합방 러브콜 → 파트너 후보";
    msg = "아쉽게 파트너는 놓쳤지만, 인기 스트리머들의 합방 제안이 이어졌어요.";
  } else if (lastRound === 2 && score >= 420) {
    emoji = "📞"; title = "MCN 스카우트!";
    teamLine = "유망 MCN 합류 제안";
    msg = "챌린지를 지켜본 MCN에서 러브콜이! 소속 크리에이터로 도전해요.";
  } else if (lastRound >= 1) {
    emoji = "🌱"; title = "취미 방송 유지";
    teamLine = "다음 시즌 재도전";
    msg = "이번엔 여기까지. 하지만 고정 시청자는 계속 늘고 있어요.";
  } else if (score >= 330) {
    emoji = "📹"; title = "유튜브 전향";
    teamLine = "편집 콘텐츠로 커리어 시작";
    msg = "라이브는 접었지만 쌓인 감각이 있어요. 편집 영상으로 역주행을 노려요!";
  } else {
    emoji = "🎒"; title = "잠시 마이크를 끄다";
    teamLine = "다른 길 탐색";
    msg = "꿈은 이루지 못했지만 3년의 방송은 사라지지 않아요. 언젠가 다시 ON!";
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
      ⭐ 최종 화제성 ${Math.round(S.fandom)} · 챌린지 ${S.stages}회<br/>
      ${trophyLine}
    </div>`;

  $("btn-share").onclick = () => {
    const text = `📺 더 스트리머 결과\n${m.name} ${S.name} — ${title}\n${teamLine}\n화제성 ${Math.round(S.fandom)} / ${trophyLine}`;
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

  if (window.StreamerCareer) window.StreamerCareer.onEnding(survivedFinal || lastRound === 3, survivedFinal && score >= 520);
  else clearSave();
  show("screen-ending");
}

// ---------- ❓ 도움말 ----------
const HELP_SECTIONS = [
  { emoji: "🏋️", title: "훈련과 컨디션", body:
    "매달 훈련이나 휴식을 골라요. 훈련은 능력치를 올리고 컨디션을 깎아요.\n" +
    "컨디션이 낮은 채로 계속 훈련하면 탈이 나요. 무리하지 말고 쉬어 가세요." },
  { emoji: "⭐", title: "재능과 각성", body:
    "능력치 옆의 별은 훈련 효율이에요. 별이 많을수록 같은 훈련으로 더 많이 올라요.\n" +
    "능력치 100을 넘으면 '한계 돌파' 구간이라 훈련 효율이 절반이 되고, 그때부터 🔮각성으로\n" +
    "재능을 올릴 수 있어요. 상한(130)까지 채우면 훈련 대신 각성만 남아요.\n" +
    "재능이 최대가 되면 🌠초월로 상한 자체를 6씩 올려요 — 성공할수록 어려워지지만\n" +
    "명예의 전당 점수가 크게 붙어요." },
  { emoji: "📺", title: "방송과 전업 전향", body:
    "시청자 0명에서 3년 동안 방송하며 실력과 인지도를 쌓아요.\n" +
    "3년이 끝나면 그동안의 성과로 전업 전향이 갈려요.\n" +
    "전향하면 전업 스트리머로 이어가고, 아니면 여기서 커리어가 끝나요." },
  { emoji: "🎓", title: "은퇴와 환생", body:
    "둘 다 커리어를 마치지만 남기는 게 달라요.\n" +
    "🎓은퇴는 🏛️명예의 전당에 기록을 남겨요. 전 세계 플레이어와 순위를 겨뤄요.\n" +
    "🧬환생은 기록 대신 유산을 남겨, 다음 캐릭터가 더 높은 재능과 시작 자금으로 출발해요.\n" +
    "환생은 🏆우승 3회 · 🎖️대상 3회 · 🌠초월 1단계 중 하나를 이뤄야 열려요." },
  { emoji: "💰", title: "돈 벌기와 쓰기", body:
    "활동 수당과 정산으로 돈이 들어와요.\n" +
    "🛍️상점에서 장비를 사면 능력치가 바로 올라요. 등급은 순서대로만 살 수 있어요.\n" +
    "30분마다 🎁특훈으로 무료 훈련을 한 번 받을 수 있어요." },
];

function openHelp() {
  if (window.Help) window.Help.open("📺 더 스트리머 도움말", HELP_SECTIONS);
}
$("btn-help-main")?.addEventListener("click", openHelp);
$("btn-help-pro")?.addEventListener("click", openHelp);

// ---------- 시작 ----------
initTitle();
if (window.Stats) Stats.init("stream");
