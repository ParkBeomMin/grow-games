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

// ---------- 상태 ----------
const SAVE_KEY = "trainee-save-v1";
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
    talents[d.key] = rand(0.8, 1.45);
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
    .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(clamp(Math.round((pendingRoll.talents[d.key] - 0.6) * 4), 1, 5))}`)
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
    avatar: (window.Avatar && window.Avatar.get()) || null,
    money: 0,
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
// 스탯 100 이상(한계 돌파)부터 도전 가능. 깊이 돌파할수록 성공 확률 상승.
// 성공: 재능(⭐) 상승 / 실패: 낮은 확률로 재능 하락 — 어느 쪽이든 스탯은 크게 낮아져 다시 키워야 해요.
function awakenTalent(key, logFn) {
  const defs = Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos];
  const d = defs.find((x) => x.key === key);
  // 화면 표시(반올림)와 동일한 기준 — 99.6도 '100'으로 보이면 각성 가능해야 해요
  const v = Math.round(S.stats[key]);
  if (!d || v < 100) return false;
  const p = Math.min(0.25 + (v - 100) * 0.015, 0.75);
  const ok = confirm(
    `🔮 ${d.name} 재능 각성 시도!\n\n` +
    `성공 확률 ${Math.round(p * 100)}% (돌파가 깊을수록 올라가요)\n` +
    `· 성공: 재능(⭐)이 영구히 상승\n` +
    `· 실패: 낮은 확률로 재능이 살짝 하락\n` +
    `· 성공하든 실패하든 ${d.name} 수치는 크게 낮아져서 다시 키워야 해요\n\n진행할까요?`
  );
  if (!ok) return false;
  if (Math.random() < p) {
    S.talents[key] = Math.min(S.talents[key] + rand(0.15, 0.3), 1.8);
    S.stats[key] = randInt(45, 60);
    logFn(`🔮✨ ${d.name} 재능 각성 성공!! 잠재력이 한 단계 피어났어요 (수치 ${Math.round(S.stats[key])}부터 재도전)`);
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
      const d = pick(statDefs());
      let gain = rand(2.2, 4.2) * S.talents[d.key];
      if (S.stats[d.key] >= 100) gain *= 0.5;
      gain = Math.round(gain * 10) / 10;
      S.stats[d.key] = clamp(S.stats[d.key] + gain, 0, STAT_CAP);
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
        S.gear[`${d.key}-${tier.n}`] = true;
        S.stats[d.key] = clamp(S.stats[d.key] + tier.bonus, 0, STAT_CAP);
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
              ${st.avatar ? `<img class="slot-avatar" src="${st.avatar}" alt="" />` : `<span class="slot-avatar slot-emoji">🎤</span>`}
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
  for (const a of AGENCIES) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.innerHTML = `
      <span class="card-emoji">${a.emoji}</span>
      <span class="card-title">${a.name}</span>
      <span class="card-sub">${a.tier} 기획사</span>
      <span class="card-desc">${a.desc}</span>
      <span class="card-tags">
        <span class="tag">데뷔 파워 ${"★".repeat(Math.round(a.debut * 5))}</span>
        <span class="tag">성장 ${"★".repeat(Math.round(a.growth * 3))}</span>
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
  if (window.Stats) Stats.log("new_player", { pos: chosenPos, agency: chosenAgency.id });
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
  $("hud-turn").textContent = `${S.year}년차 ${S.month}월`;

  const av = $("hud-avatar");
  if (S.avatar) { av.src = S.avatar; av.classList.remove("hidden"); }
  else av.classList.add("hidden");

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
    const stars = "⭐".repeat(clamp(Math.round((S.talents[d.key] - 0.6) * 4), 1, 5));
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-name">${d.emoji} ${d.name}</span>
      <div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>
      <span class="stat-val">${v}</span>
      <span class="stat-pot" title="잠재력 — 별이 많을수록 훈련 효율이 높아요">${stars}</span>`;
    if (v >= 100) {
      const aw = document.createElement("button");
      aw.className = "mini-btn awaken-btn";
      aw.textContent = "🔮 각성";
      aw.onclick = () => { if (awakenTalent(d.key, addLog)) renderMain(); };
      row.appendChild(aw);
    }
    statsBox.appendChild(row);
  }

  const actBox = $("action-list");
  actBox.innerHTML = "";
  for (const d of STAT_DEFS) {
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 연습<span class="a-sub">${d.sub}</span>`;
    btn.onclick = () => doTraining(d);
    actBox.appendChild(btn);
  }
  actBox.appendChild(makeAdSlotButton(renderMain));
  const rest = document.createElement("button");
  rest.className = "action-btn rest";
  rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 대폭 회복</span>`;
  rest.onclick = doRest;
  actBox.appendChild(rest);

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
function doTraining(def) {
  const a = agencyOf();

  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🤕 지친 몸으로 무리하다 ${def.name} 연습 중 몸이 상했어요. 한 달을 회복으로 날렸어요.`);
    endMonth();
    return;
  }

  // 훈련 실패 — 컨디션이 낮을수록 위험해요
  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, STAT_CAP);
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 훈련이 완전히 꼬였어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
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
  S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, STAT_CAP);
  S.condition = clamp(S.condition - randInt(12, 18), 0, 100);
  addLog(`${def.emoji} ${def.name} 연습 완료! +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);

  maybeEvent();
  endMonth();
}

function doRest() {
  S.condition = clamp(S.condition + randInt(30, 42), 0, 100);
  S.stats.stamina = clamp(S.stats.stamina + 0.5, 0, STAT_CAP);
  addLog(`🛌 푹 쉬었어요. 컨디션 회복! (${Math.round(S.condition)})`);
  maybeEvent();
  endMonth();
}

function maybeEvent() {
  if (Math.random() > 0.3) return;
  const a = agencyOf();
  const events = [
    () => {
      const d = pick(STAT_DEFS);
      S.stats[d.key] = clamp(S.stats[d.key] + 3, 0, STAT_CAP);
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
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, STAT_CAP);
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
  save();
  renderMain();

  // 3년차 12월 = 데뷔 서바이벌
  if (S.year === 3 && S.month === 12) {
    startSurvival();
    return;
  }
  const evalName = EVALS[S.month];
  if (evalName) {
    startEval(evalName);
    return;
  }
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
  const mech = pick(["bar", "hold", "seq", "react", "duel"]);
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
  } else {
    if (autoMiniOn()) { cb(autoRes(S.stats.charm), IDOL_DUEL); return; }
    window.Timing.duel(container, {
      label: "🧠 엔딩 요정 자리 싸움! 카메라는 어디로?",
      choices: ["왼쪽", "중앙", "오른쪽"],
      hintChance: clamp((S.stats.charm - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, (res) => cb(res, IDOL_DUEL));
  }
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
  $("stage-card").innerHTML = `
    <div class="tour-vs">🔥 전국 연습생 100명, 데뷔조는 단 7명</div>
    <div class="tour-line">3년의 연습이 오늘을 위해 있었어요.<br/>예선부터 파이널까지, 살아남으면 데뷔합니다.</div>`;
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
    const p = clamp(
      0.40 + a.debut * 0.35 + (overall() - 50) / 90 + S.fandom / 1500 +
      (S.condition - 50) / 900 - ev.round * 0.05 + momentBonus,
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

  let emoji, title, teamLine, msg;
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
    emoji = "📞"; title = "타사 캐스팅!";
    teamLine = "라이벌 기획사 이적 제안";
    msg = "세미파이널 무대를 본 타사에서 러브콜이! 새 둥지에서 데뷔를 노려요.";
  } else if (lastRound >= 1) {
    emoji = "🌱"; title = "연습생 재계약";
    teamLine = `${a.name} 연습생 연장`;
    msg = "이번엔 여기까지. 하지만 회사는 아직 당신을 믿고 있어요.";
  } else if (score >= 330) {
    emoji = "📹"; title = "홀로서기 선언";
    teamLine = "유튜브 채널 개설 → 역주행 노리기";
    msg = "예선 탈락… 하지만 쌓인 팬덤이 있어요. 커버 영상으로 역주행을 노려봐요!";
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

  $("ending-card").innerHTML = `
    ${S.avatar ? `<img class="draft-avatar" src="${S.avatar}" alt="" />` : ""}
    <div class="draft-emoji">${emoji}</div>
    <div class="draft-title">${title}</div>
    <div class="draft-team">${teamLine}</div>
    <div>${msg}</div>
    <div class="draft-summary">
      ${a.emoji} ${a.name} · ${POS_INFO[S.pos].name} ${S.name}<br/>
      ${statLines}<br/>
      💖 최종 팬덤 ${Math.round(S.fandom)} · 무대 ${S.stages}회<br/>
      ${trophyLine}
    </div>`;

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

  // 데뷔조 합류·차기 데뷔조면 데뷔 활동으로 이어갈 수 있어요
  if (window.IdolCareer) window.IdolCareer.onEnding(survivedFinal || lastRound === 3, survivedFinal && score >= 520);
  else clearSave();
  show("screen-ending");
}

// ---------- 시작 ----------
initTitle();
if (window.Avatar) window.Avatar.mount("avatar-slot");
if (window.Stats) Stats.init("idol");
