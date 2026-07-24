/* 더 셰프 🍜 요리사 키우기 */
"use strict";

// ---------- 데이터 ----------
const MARKETS = [
  {
    id: "hotel", name: "호텔 조리부", emoji: "🏨", tier: "정통 코스",
    debut: 0.68, growth: 0.96, spot: 1.0,
    desc: "체계적인 기본기. 안정적이지만 개성은 천천히 붙어요",
  },
  {
    id: "fine", name: "파인다이닝", emoji: "🍽️", tier: "미쉐린 코스",
    debut: 0.62, growth: 1.12, spot: 1.15,
    desc: "최고급 주방. 성장은 빠르지만 압박이 살인적이에요",
  },
  {
    id: "noodle", name: "노포 주방", emoji: "🍜", tier: "실전 코스",
    debut: 0.58, growth: 1.15, spot: 1.05,
    desc: "손맛으로 배우는 야생 주방. 실전 감각이 쑥쑥 자라요",
  },
];

const STAT_DEFS = [
  { key: "knife", name: "칼솜씨", emoji: "🔪", sub: "손질·정교함" },
  { key: "taste", name: "미각", emoji: "👅", sub: "간·밸런스" },
  { key: "creativity", name: "창의력", emoji: "🎨", sub: "플레이팅·메뉴" },
  { key: "speed", name: "스피드", emoji: "⚡", sub: "조리 속도·타이밍" },
  { key: "stamina", name: "체력", emoji: "🔋", sub: "주방 지구력" },
];

// 전문 분야 — 야구의 '포지션' 대응. 주력 능력치가 달라져요
const POS_INFO = {
  korean: { name: "한식", stat: "taste" },
  western: { name: "양식", stat: "knife" },
  dessert: { name: "디저트", stat: "creativity" },
};

const CHEF_NAMES = ["도마", "칼든손", "맛의달인", "불꽃요리", "간잘맞춤", "플레이팅", "미쉐린", "막내셰프", "수셰프", "오너셰프", "손맛", "황금레시피"];

const STAGE_TYPES = [
  { name: "기본기 심사", main: "knife", aux: "speed" },
  { name: "맛 평가", main: "taste", aux: "creativity" },
  { name: "창작 요리", main: "creativity", aux: "taste" },
  { name: "자유 코스", main: null, aux: "stamina" },
];

const EVALS = { 6: "상반기 요리 경연", 12: "연말 셰프 대회" };
const SURVIVAL_ROUNDS = ["실기 테스트", "서비스 실전", "블라인드 심사", "최종 시연"];

// ---------- 상태 ----------
const SAVE_KEY = "chef-save-v1";
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
    stroke: "#ff9d5c",
    fill: "rgba(255, 157, 92, 0.28)",
  });
  $("roll-stars").innerHTML = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(clamp(Math.round((pendingRoll.talents[d.key] - 0.6) * 4), 1, 5))}`)
    .join(" · ") + `<br/>⭐ = 잠재력 — 별이 많은 능력치일수록 수련 효율이 높아요`;
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
    money: 0,
    gear: {},
    condition: 80,
    fandom: 0, // 명성·맛집 평점
    buff: false,
    trophies: [],
    stages: 0, // 참가한 경연 수
    log: [],
  };
}

const marketOf = () => MARKETS.find((m) => m.id === S.market);
const overall = () => {
  const vals = Object.values(S.stats);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

// ---------- 저장 — 여러 셰프(슬롯) 지원 ----------
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
function awakenTalent(key, logFn) {
  const defs = Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos];
  const d = defs.find((x) => x.key === key);
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
      <p class="av-title">🎁 무료 특강!</p>
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
      body.innerHTML = `<div class="ad-emoji">${d.emoji}</div><b>${d.name} +${gain.toFixed(1)}</b> 특강 완료!<br/><span class="av-note">턴을 소모하지 않는 보너스 수련 · 다음은 30분 후</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>특강을 놓쳤어요`;
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
    btn.innerHTML = `<span class="a-emoji">🎁</span>특강<span class="a-sub">${Math.ceil(left / 60000)}분 후 가능</span>`;
  } else {
    btn.innerHTML = `<span class="a-emoji">🎁</span>특강<span class="a-sub">30분마다 무료 수련</span>`;
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
          alert("자금이 부족해요! 영업 수익이나 보너스로 모아봐요 💰");
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
    curHtml = `<br/><b>🔥 진행 중인 시즌</b><br/>${["상반기", "하반기"][act.cb - 1] || act.cb + "차"} · ${act.week}/${act.weekTotal}주차 영업<br/>극찬 리뷰 ${act.wins}회 · 화력 지수 ${act.hypeSum >= 0 ? "+" : ""}${Math.round(act.hypeSum * 10) / 10}<br/>`;
  }
  let proHtml = "";
  if (S.career && S.career.years && S.career.years.length) {
    const rows = S.career.years.map((x) =>
      `<tr><td>${x.y}년차</td><td>극찬 ${x.wins}회</td><td>${x.sales}만</td><td>${x.awards && x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    proHtml = `
      <table class="season-table"><thead><tr><th>연차</th><th>극찬리뷰</th><th>매출</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div>통산 ${S.career.years.length}년 · 극찬 ${S.career.wins}회 · 🏆 올해의셰프 ${S.career.daesang} · 맛집 ${S.career.bonsang}${S.career.rookie ? " · 신인상" : ""}</div>`;
  }
  const gearList = STAT_DEFS
    .map((d) => {
      const owned = GEAR_TIERS.filter((t) => S.gear && S.gear[`${d.key}-${t.n}`]).length;
      return owned ? `${d.emoji}${"★".repeat(owned)}` : null;
    })
    .filter(Boolean)
    .join(" ");
  $("record-card").innerHTML = `
    <div class="draft-emoji">🍜</div>
    <div class="draft-title">${S.name}</div>
    <div class="draft-team">${S.phase === "chef-pro" ? `${S.group}${S.center ? " · 오너셰프" : ""} · ${S.proYear}년차` : `${m.emoji} ${m.name} ${S.year}년차`} · ${POS_INFO[S.pos].name}</div>
    <div class="draft-summary">
      <b>🌱 수련 기록</b><br/>경연 ${S.stages || 0}회 · ⭐ 명성 ${Math.round(S.fandom)}<br/>${trophyLine}<br/>
      ${curHtml}
      ${proHtml ? `<br/><b>🍽️ 셰프 기록</b>${proHtml}<br/>` : ""}
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
    const c = window.ChefCareer;
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
    Match.count("chef").then((n) => {
      if (n) {
        $("title-count").innerHTML = `🍜 지금까지 <b>${n.toLocaleString()}명</b>의 요리사가 칼을 잡았어요!`;
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
  if (S.phase === "chef-pro" && window.ChefCareer) {
    window.ChefCareer.showActivity();
  } else {
    renderMain();
    show("screen-main");
  }
}

function slotDesc(st) {
  const posName = POS_INFO[st.pos] ? POS_INFO[st.pos].name : "";
  if (st.phase === "chef-pro") return `🍜 ${st.group || "레스토랑"} · ${st.proYear || 1}년차${st.center ? " · 오너셰프" : ""}`;
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
      <p class="av-title">👥 어떤 셰프로 이어할까요?</p>
      <div class="slot-list">${ids.map((id) => {
        const st = sl[id];
        const d = st.savedAt ? new Date(st.savedAt) : null;
        return `
          <div class="slot-row">
            <button type="button" class="slot-go" data-id="${id}">
              <span class="slot-avatar slot-emoji">🍜</span>
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
      if (!confirm(`${st ? st.name : "이 셰프"}의 저장을 삭제할까요? 되돌릴 수 없어요!`)) return;
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
  for (const m of MARKETS) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.innerHTML = `
      <span class="card-emoji">${m.emoji}</span>
      <span class="card-title">${m.name}</span>
      <span class="card-sub">${m.tier}</span>
      <span class="card-desc">${m.desc}</span>
      <span class="card-tags">
        <span class="tag">성장 ${"★".repeat(Math.round(m.growth * 3))}</span>
        <span class="tag">안정성 ${"★".repeat(Math.round(m.debut * 5))}</span>
      </span>`;
    btn.onclick = () => {
      chosenMarket = m;
      $("position-hint").textContent = `${m.name} 입문! 어떤 분야를 전문으로 할까요?`;
      show("screen-position");
    };
    box.appendChild(btn);
  }
}

document.querySelectorAll("#position-list .card").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenPos = btn.dataset.pos;
    $("name-hint").textContent = `${chosenMarket.name} ${POS_INFO[chosenPos].name} 지망생의 이름은?`;
    $("input-name").value = pick(CHEF_NAMES);
    pendingRoll = rollStats(chosenPos);
    show("screen-name");
    renderRoll();
  });
});

$("btn-random-name").addEventListener("click", () => {
  $("input-name").value = pick(CHEF_NAMES);
});

$("btn-start").addEventListener("click", () => {
  const name = $("input-name").value.trim() || pick(CHEF_NAMES);
  curSlot = null;
  if (window.Stats) Stats.log("new_player", { pos: chosenPos, agency: chosenMarket.name });
  if (window.Match) Match.register("chef", name);
  S = newState(chosenMarket, chosenPos, name, pendingRoll);
  addLog(`🍜 ${chosenMarket.name} 입문! ${name}의 요리 인생이 시작됐어요.`);
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
    const stars = "⭐".repeat(clamp(Math.round((S.talents[d.key] - 0.6) * 4), 1, 5));
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-name">${d.emoji} ${d.name}</span>
      <div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>
      <span class="stat-val">${v}</span>
      <span class="stat-pot" title="잠재력 — 별이 많을수록 수련 효율이 높아요">${stars}</span>`;
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
    btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 수련<span class="a-sub">${d.sub}</span>`;
    btn.onclick = () => doTraining(d);
    actBox.appendChild(btn);
  }
  actBox.appendChild(makeAdSlotButton(renderMain));
  const rest = document.createElement("button");
  rest.className = "action-btn rest";
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
      ? `<span class="a-emoji">🔥</span>셰프 도전 시작!<span class="a-sub">3년의 수련이 여기서 판가름나요</span>`
      : `<span class="a-emoji">🏆</span>${ps.name} 출전!<span class="a-sub">경연 준비 완료</span>`;
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
function doTraining(def) {
  const m = marketOf();

  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🤕 지친 몸으로 무리하다 ${def.name} 수련 중 손을 데었어요. 한 달을 회복으로 날렸어요.`);
    endMonth();
    return;
  }

  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, STAT_CAP);
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 수련이 영 안 풀렸어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
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
  S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, STAT_CAP);
  S.condition = clamp(S.condition - randInt(12, 18), 0, 100);
  addLog(`${def.emoji} ${def.name} 수련 완료! +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);

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
  const m = marketOf();
  const events = [
    () => {
      const d = pick(STAT_DEFS);
      S.stats[d.key] = clamp(S.stats[d.key] + 3, 0, STAT_CAP);
      addLog(`🧑‍🍳 셰프님의 특별 지도! ${d.name} +3`);
    },
    () => {
      const pts = Math.round(8 * m.spot);
      S.fandom += pts;
      addLog(`📱 만든 요리 사진이 SNS에서 화제! 명성 +${pts}`);
    },
    () => {
      S.condition = clamp(S.condition - 20, 0, 100);
      addLog(`🔥 밤샘 마감 준비로 뻗었어요. 컨디션 -20`);
    },
    () => {
      S.condition = clamp(S.condition + 12, 0, 100);
      addLog(`🍲 든든한 賄い(직원식)로 힘이 났어요! 컨디션 +12`);
    },
    () => {
      S.buff = true;
      addLog(`🔥 라이벌 셰프의 신메뉴에 자극받았어요! 다음 수련 효율 1.5배`);
    },
    () => {
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, STAT_CAP);
      addLog(`🏃 새벽 시장 다니는 루틴이 몸에 붙었어요. 체력 +2`);
    },
    () => {
      S.fandom = Math.max(0, S.fandom - 10);
      addLog(`📉 손님 컴플레인이 리뷰에 올라왔어요… 명성 -10`);
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

// ---------- 경연 공통 ----------
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
  S: { pts: 30, txt: "🌟 완벽한 요리! 심사위원이 접시를 싹 비웠어요." },
  A: { pts: 22, txt: "🔥 훌륭한 맛과 플레이팅! 극찬이 쏟아졌어요." },
  B: { pts: 15, txt: "🙂 무난한 완성도. 제 몫을 했어요." },
  C: { pts: 9, txt: "😬 간이 살짝 아쉬웠어요." },
  D: { pts: -5, txt: "😢 접시를 태웠어요… 심사위원 표정이 굳었어요." },
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
  knife: {
    good: ["재료 손질이 예술이에요! 🔪", "칼질 하나로 심사위원을 사로잡아요 ✨", "완벽한 정형에 감탄이 나와요 🎯"],
    bad: ["손질이 살짝 거칠었어요 😬", "두께가 고르지 않았어요 💦"],
  },
  taste: {
    good: ["간이 완벽하게 잡혔어요! 👅", "감칠맛의 균형이 예술이에요 ✨", "한 입에 심사위원이 눈을 떠요 🔥"],
    bad: ["간이 살짝 세게 됐어요 😬", "밸런스가 아쉬웠어요 💦"],
  },
  creativity: {
    good: ["플레이팅이 한 폭의 그림 같아요! 🎨", "예상 밖의 조합이 통했어요 ✨", "메뉴에 스토리가 담겼어요 🔥"],
    bad: ["콘셉트가 살짝 과했어요 😬", "접시가 조금 허전했어요 💦"],
  },
};

// 승부처 미니게임 — 불조절/간맞추기/손질순서/주문폭주/취향읽기 5종 랜덤
const CHEF_BAR = { ok: "✨ 알맞게 익혀냈어요", great: "💫 완벽한 불 조절, 겉바속촉!!", bad: "😱 불이 세서 겉이 탔어요" };
const CHEF_HOLD = { ok: "👅 간을 알맞게 맞췄어요!", great: "💎 신의 한 수, 완벽한 간!!", bad: "😵 간을 더하다 짜졌어요" };
const CHEF_SEQ = { ok: "🔪 손질 순서를 정확히 지켰어요", great: "🌟 물 흐르듯 완벽한 미장플라스!!", bad: "🙈 순서가 꼬여 재료를 낭비했어요" };
const CHEF_REACT = { ok: "🔥 주문 폭주에 바로 대응했어요", great: "⚡ 0.1초 컷 플레이팅, 완벽한 타이밍!!", bad: "😵 주문이 밀려 접시가 식었어요…" };
const CHEF_DUEL = { ok: "🧠 손님 취향을 정확히 읽었어요", great: "🎯 숨은 니즈까지 저격, 감동의 한 접시!!", bad: "🙈 취향을 잘못 읽어 남겼어요" };
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
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), CHEF_BAR); return; }
    window.Timing.play(container, {
      label: "🔥 불 조절! 초록 존에서 딱 익혀요!",
      button: "지금! 🍳",
      zonePct: miniZone(S.stats[posStat]),
    }, (res) => cb(res, CHEF_BAR));
  } else if (mech === "hold") {
    if (autoMiniOn()) { cb(autoRes(S.stats.taste), CHEF_HOLD); return; }
    window.Timing.hold(container, {
      label: "🧂 간 맞추기! 꾹 눌러 간을 더하다 초록 존에서 멈춰요!",
      button: "간! 🧂",
      zonePct: miniZone(S.stats.taste),
    }, (res) => cb(res, CHEF_HOLD));
  } else if (mech === "seq") {
    if (autoMiniOn()) { cb(autoRes(S.stats.knife), CHEF_SEQ); return; }
    window.Timing.sequence(container, {
      label: "🔪 손질 순서! 순서를 기억했다가 그대로!",
      icons: ["🔪", "🥕", "🍳", "🍽️"],
      showMs: 900 + S.stats.knife * 6 + (S.condition - 50) * 3,
    }, (res) => cb(res, CHEF_SEQ));
  } else if (mech === "react") {
    if (autoMiniOn()) { cb(autoRes(S.stats.speed), CHEF_REACT); return; }
    window.Timing.reaction(container, {
      label: "🔔 주문 폭주! 벨이 울리면 즉시 플레이팅!",
      button: "완성!! 🍽️",
      perfectMs: 300 + S.stats.speed * 1.5,
      goodMs: 700 + S.stats.speed * 2.5,
    }, (res) => cb(res, CHEF_REACT));
  } else {
    if (autoMiniOn()) { cb(autoRes(S.stats.creativity), CHEF_DUEL); return; }
    window.Timing.duel(container, {
      label: "🧠 손님 취향 읽기! 무엇을 원할까?",
      choices: ["담백하게", "진하게", "새롭게"],
      hintChance: clamp((S.stats.creativity - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, (res) => cb(res, CHEF_DUEL));
  }
}

let stageTimer = null;
function renderStageSim(type, grade, onFinal) {
  const key = type.main || POS_INFO[S.pos].stat;
  const pool = MOMENTS[key] || MOMENTS.taste;
  const goodN = grade.g === "S" ? 3 : grade.g === "A" ? 2 : grade.g === "B" ? 1 : 0;
  const badN = grade.g === "D" ? 2 : grade.g === "C" ? 1 : grade.g === "B" ? 1 : 0;
  const moments = shuffle([
    ...shuffle([...pool.good]).slice(0, goodN).map((t) => ({ text: t, cls: "good" })),
    ...shuffle([...pool.bad]).slice(0, badN).map((t) => ({ text: t, cls: "bad" })),
  ]);
  const feeds = [
    { text: `🍜 ${S.name}, ${type.name}에 도전합니다.` },
    { text: "타이머가 시작되고, 불이 올라와요 🔥" },
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
    applyFeed({ text: "🔥 결정적인 마무리 순간이 왔어요…!", cls: "good" });
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
      applyFeed({ text: "완성한 접시를 심사대에 올립니다… 🍽️" });
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

// ---------- 요리 경연 ----------
function startEval(name) {
  ev = { kind: "eval", name, idx: 0, totalPts: 0, scores: [] };
  $("stage-title").textContent = `🏆 ${S.year}년차 ${name}`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">🍜 전 지망생이 겨루는 요리 경연!</div>
    <div class="tour-line">세 번의 요리에 도전해요.<br/>좋은 성적이면 명성과 업계의 주목이 올라요.</div>`;
  $("btn-stage-next").textContent = "첫 요리 시작";
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
  $("stage-round").textContent = `${ev.idx}번째 요리 · ${type.name}`;
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
      <div class="tour-vs">심사 등급 <span class="${fg.g === "S" || fg.g === "A" ? "win" : fg.g === "D" ? "lose" : ""}">${fg.g}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `⭐ 명성 +${pts}` : `📉 명성 ${pts}`}${pay ? ` · 💰 상금 +${pay}만` : ""}</div>`;
    return ev.idx < 3
      ? { resultHTML, nextLabel: "다음 요리", nextFn: playEvalStage }
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
    <div class="tour-vs">지망생 24명 중 <span class="${rank <= 3 ? "win" : rank >= 18 ? "lose" : ""}">${rank}위</span></div>
    <div class="tour-line">${
      rank === 1 ? "🏆 전체 1위! 미식가들의 극찬이 쏟아져요." :
      rank <= 3 ? "🌟 최상위권! 여러 레스토랑이 눈독을 들여요." :
      rank <= 10 ? "🙂 중상위권. 꾸준함이 무기예요." :
      rank <= 17 ? "😐 중하위권… 다음 대회까지 더 갈고닦아야 해요." :
      "😨 하위권. 셰프와의 면담이 잡혔어요. 분발해야 해요!"
    }</div>
    ${bonus ? `<div class="tour-pts">🏅 순위 보너스 명성 +${bonus}</div>` : ""}
    <div class="tour-pts">이번 경연 명성 합계 +${ev.totalPts + bonus}</div>`;
  $("btn-stage-next").textContent = "주방으로 돌아가기";
  $("btn-stage-next").onclick = () => {
    addLog(`🏆 ${ev.name} ${rank}위! (명성 +${ev.totalPts + bonus})`);
    ev = null;
    show("screen-main");
    advanceMonth();
  };
}

// ---------- 셰프 도전 ----------
function startSurvival() {
  ev = { kind: "survival", round: 0, eliminated: false };
  $("stage-title").textContent = `🍜 셰프 도전 <파이널 키친>`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">🔥 실기 테스트부터 최종 시연까지</div>
    <div class="tour-line">3년의 수련이 오늘을 위해 있었어요.<br/>모든 관문을 통과하면 정식 셰프입니다.</div>`;
  $("btn-stage-next").textContent = "실기 테스트 시작";
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
      <div class="tour-vs">심사 결과 ${fg.g} — <span class="${pass ? "win" : "lose"}">${pass ? "통과! 🎉" : "탈락… 💧"}</span></div>
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
    emoji = "👑"; title = "미쉐린 스타 셰프!";
    teamLine = `${m.name} 출신 — 별을 단 오너셰프`;
    msg = "역대급 재능! 개업한 레스토랑이 단숨에 별을 받았어요.";
  } else if (survivedFinal) {
    emoji = "🌟"; title = "정식 셰프 데뷔!";
    teamLine = `유명 레스토랑 정식 셰프 계약`;
    msg = "정식 셰프 합격! 3년의 수련이 드디어 나만의 주방으로 이어졌어요.";
  } else if (lastRound === 3) {
    emoji = "💜"; title = "최종 탈락… 하지만!";
    teamLine = "수셰프로 스카우트";
    msg = "아쉽게 오너 셰프는 놓쳤지만, 실력을 인정받아 부주방장을 맡게 됐어요.";
  } else if (lastRound === 2 && score >= 420) {
    emoji = "📞"; title = "레스토랑 스카우트!";
    teamLine = "신생 레스토랑 셰프 제안";
    msg = "심사를 지켜본 오너에게 러브콜이! 새 주방을 이끌어봐요.";
  } else if (lastRound >= 1) {
    emoji = "🌱"; title = "수련 연장";
    teamLine = "다음 시즌 재도전";
    msg = "이번엔 여기까지. 하지만 손맛은 계속 깊어지고 있어요.";
  } else if (score >= 330) {
    emoji = "📹"; title = "푸드트럭 창업";
    teamLine = "작은 가게로 커리어 시작";
    msg = "정식 셰프는 못 됐지만 쌓인 실력이 있어요. 밑바닥부터 팬을 모아가요!";
  } else {
    emoji = "🎒"; title = "잠시 앞치마를 벗다";
    teamLine = "다른 길 탐색";
    msg = "꿈은 이루지 못했지만 3년의 손맛은 사라지지 않아요. 언젠가 다시!";
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
      ⭐ 최종 명성 ${Math.round(S.fandom)} · 경연 ${S.stages}회<br/>
      ${trophyLine}
    </div>`;

  $("btn-share").onclick = () => {
    const text = `🍜 더 셰프 결과\n${m.name} ${S.name} — ${title}\n${teamLine}\n명성 ${Math.round(S.fandom)} / ${trophyLine}`;
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

  if (window.ChefCareer) window.ChefCareer.onEnding(survivedFinal || lastRound === 3, survivedFinal && score >= 520);
  else clearSave();
  show("screen-ending");
}

// ---------- 시작 ----------
initTitle();
if (window.Stats) Stats.init("chef");
