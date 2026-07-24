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
};

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
    stroke: "#5fa8ff",
    fill: "rgba(95, 168, 255, 0.28)",
  });
  $("roll-stars").innerHTML = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(clamp(Math.round((pendingRoll.talents[d.key] - 0.6) * 4), 1, 5))}`)
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
    money: 0,
    gear: {},
    condition: 80,
    fandom: 0, // 명성·스카우트 주목도
    buff: false,
    trophies: [],
    stages: 0, // 출전 경기 수
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
      <p class="av-title">🎁 무료 특별훈련!</p>
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
    curHtml = `<br/><b>🔥 진행 중인 시즌</b><br/>${["전반기", "후반기"][act.cb - 1] || act.cb + "차"} · ${act.week}/${act.weekTotal}R 소화<br/>이 주의 선수 ${act.wins}회 · 활약 지수 ${act.hypeSum >= 0 ? "+" : ""}${Math.round(act.hypeSum * 10) / 10}<br/>`;
  }
  let proHtml = "";
  if (S.career && S.career.years && S.career.years.length) {
    const rows = S.career.years.map((x) =>
      `<tr><td>${x.y}시즌</td><td>MOM ${x.wins}회</td><td>${x.sales}P</td><td>${x.awards && x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    proHtml = `
      <table class="season-table"><thead><tr><th>시즌</th><th>MOM</th><th>공격P</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div>통산 ${S.career.years.length}시즌 · MOM ${S.career.wins}회 · 🏆 MVP ${S.career.daesang} · 베스트11 ${S.career.bonsang}${S.career.rookie ? " · 신인왕" : ""}</div>`;
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
      <b>🌱 유스 기록</b><br/>출전 ${S.stages || 0}경기 · ⭐ 명성 ${Math.round(S.fandom)}<br/>${trophyLine}<br/>
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
    btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
    btn.onclick = () => doTraining(d);
    actBox.appendChild(btn);
  }
  actBox.appendChild(makeAdSlotButton(renderMain));
  const rest = document.createElement("button");
  rest.className = "action-btn rest";
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
function doTraining(def) {
  const m = marketOf();

  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🤕 지친 몸으로 무리하다 ${def.name} 훈련 중 잔부상. 한 달을 회복으로 날렸어요.`);
    endMonth();
    return;
  }

  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, STAT_CAP);
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 훈련이 영 안 풀렸어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
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
  addLog(`${def.emoji} ${def.name} 훈련 완료! +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);

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
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, STAT_CAP);
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
  const mech = pick(["bar", "hold", "seq", "react", "duel"]);
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
  } else {
    if (autoMiniOn()) { cb(autoRes(S.stats.dribble), SOCCER_DUEL); return; }
    window.Timing.duel(container, {
      label: "🧠 1:1 드리블! 수비수를 어디로 제칠까?",
      choices: ["왼쪽", "가운데", "오른쪽"],
      hintChance: clamp((S.stats.dribble - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, (res) => cb(res, SOCCER_DUEL));
  }
}

let stageTimer = null;
function renderStageSim(type, grade, onFinal) {
  const key = type.main || POS_INFO[S.pos].stat;
  const pool = MOMENTS[key] || MOMENTS.shoot;
  const goodN = grade.g === "S" ? 3 : grade.g === "A" ? 2 : grade.g === "B" ? 1 : 0;
  const badN = grade.g === "D" ? 2 : grade.g === "C" ? 1 : grade.g === "B" ? 1 : 0;
  const moments = shuffle([
    ...shuffle([...pool.good]).slice(0, goodN).map((t) => ({ text: t, cls: "good" })),
    ...shuffle([...pool.bad]).slice(0, badN).map((t) => ({ text: t, cls: "bad" })),
  ]);
  const feeds = [
    { text: `⚽ ${S.name}, ${type.name} 상황에 나섭니다.` },
    { text: "휘슬이 울리고, 경기가 시작돼요 🏟️" },
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
    applyFeed({ text: "🔥 결정적인 순간이 찾아와요…!", cls: "good" });
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
      applyFeed({ text: "경기 종료 휘슬! 평점을 매깁니다… 📝" });
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
      <div class="tour-vs">경기 평점 <span class="${fg.g === "S" || fg.g === "A" ? "win" : fg.g === "D" ? "lose" : ""}">${fg.g}</span></div>
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
      <div class="tour-vs">경기 평점 ${fg.g} — <span class="${pass ? "win" : "lose"}">${pass ? "통과! 🎉" : "탈락… 💧"}</span></div>
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

// ---------- 시작 ----------
initTitle();
if (window.Stats) Stats.init("soccer");
