/* 더 인베스터 📈 주린이 키우기 */
"use strict";

// ---------- 데이터 ----------
// 시장 선택 — 야구의 '지역'·아이돌의 '소속사' 대응
const MARKETS = [
  {
    id: "kospi", name: "국장", emoji: "🇰🇷", tier: "코스피·코스닥",
    debut: 0.68, growth: 0.95, spot: 1.0,
    desc: "변동성 낮고 배당이 안정적. 대신 우상향이 더뎌 성장이 느려요",
  },
  {
    id: "us", name: "미장", emoji: "🇺🇸", tier: "나스닥·S&P",
    debut: 0.6, growth: 1.15, spot: 1.15,
    desc: "장기 우상향이 강해 수익이 커요. 대신 환율·변동성 리스크가 커요",
  },
  {
    id: "jp", name: "일본장", emoji: "🇯🇵", tier: "닛케이·토픽스",
    debut: 0.63, growth: 1.05, spot: 1.05,
    desc: "오랜 횡보 끝 부활장. 엔저 환율 플레이가 매력이에요",
  },
];

const STAT_DEFS = [
  { key: "analysis", name: "분석력", emoji: "📊", sub: "차트·재무 분석" },
  { key: "reflex", name: "순발력", emoji: "⚡", sub: "매매 타이밍" },
  { key: "info", name: "정보력", emoji: "📰", sub: "뉴스·재료 포착" },
  { key: "capital", name: "자금운용", emoji: "💰", sub: "비중·리스크 관리" },
  { key: "mental", name: "멘탈", emoji: "🧠", sub: "평정심·존버력" },
];

// 투자 스타일 — 야구의 '포지션' 대응. 주력 능력치가 달라져요
const POS_INFO = {
  value: { name: "가치투자", stat: "analysis" },
  scalp: { name: "단타", stat: "reflex" },
  news: { name: "정보매매", stat: "info" },
};

const INVESTOR_NAMES = ["존버킹", "불개미", "떡상장인", "월가의여우", "존버여신", "급등헌터", "가치도사", "코린이", "동학개미", "슈퍼루키", "차트마스터", "익절요정"];

// 모의투자 대회 종목: 주 스탯 / 보조 스탯 가중치
const STAGE_TYPES = [
  { name: "실적 시즌 매매", main: "analysis", aux: "capital" },
  { name: "급등주 단타", main: "reflex", aux: "mental" },
  { name: "테마주 정보전", main: "info", aux: "capital" },
  { name: "자유 종목전", main: null, aux: "capital" }, // main = 내 스타일 스탯
];

const EVALS = { 6: "상반기 모의투자 대회", 12: "연말 모의투자 대회" };
const SURVIVAL_ROUNDS = ["소액 실전", "레버리지 도전", "계좌 인증", "전업 선언"];

// ---------- 상태 ----------
const SAVE_KEY = "investor-save-v1";
let S = null;
let ev = null; // 진행 중인 대회/전업 도전

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
    stroke: "#5fd38a",
    fill: "rgba(95, 211, 138, 0.28)",
  });
  $("roll-stars").innerHTML = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(clamp(Math.round((pendingRoll.talents[d.key] - 0.6) * 4), 1, 5))}`)
    .join(" · ") + `<br/>⭐ = 잠재력 — 별이 많은 능력치일수록 공부 효율이 높아요`;
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
    fandom: 0, // 투자 내공(실력·평판) 지수
    buff: false,
    trophies: [],
    stages: 0, // 실전 매매 횟수
    log: [],
  };
}

const marketOf = () => MARKETS.find((m) => m.id === S.market);
const overall = () => {
  const vals = Object.values(S.stats);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

// ---------- 저장 — 여러 계정(슬롯) 지원 ----------
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
    // 매매/육성 진행 중에는 실수 방지를 위해 뒤로가기를 막아요
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
const AD_CD_MS = 1800000; // 30분
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
      body.innerHTML = `<div class="ad-emoji">💰</div><b>+${amount}만</b> 시드 획득!<br/><span class="av-note">다음 보너스는 30분 후에 열려요</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>보상을 받지 못했어요`;
    }
    closeBtn.disabled = false;
    closeBtn.textContent = "확인";
    closeBtn.onclick = finish;
  });
}

// 무료 특강 — 랜덤 스탯을 공부하되 턴을 소모하지 않아요
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
      body.innerHTML = `<div class="ad-emoji">${d.emoji}</div><b>${d.name} +${gain.toFixed(1)}</b> 특강 완료!<br/><span class="av-note">턴을 소모하지 않는 보너스 공부 · 다음은 30분 후</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>특강에 실패했어요`;
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
    btn.innerHTML = `<span class="a-emoji">🎁</span>특강<span class="a-sub">30분마다 무료 공부</span>`;
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
  $("shop-money").textContent = `💰 보유 시드 ${fmtMoney(S.money || 0)}`;
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
          alert("시드가 부족해요! 매매 수익이나 보너스로 모아봐요 💰");
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

// ---------- 투자 기록 ----------
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
    curHtml = `<br/><b>🔥 진행 중인 매매</b><br/>${["상반기", "하반기"][act.cb - 1] || act.cb + "차"} · ${act.week}/${act.weekTotal}주차 소화<br/>올해 수익률 1위 ${act.wins}회 · 매매 화력 ${act.hypeSum >= 0 ? "+" : ""}${Math.round(act.hypeSum * 10) / 10}<br/>`;
  }
  let proHtml = "";
  if (S.career && S.career.years && S.career.years.length) {
    const rows = S.career.years.map((x) =>
      `<tr><td>${x.y}년차</td><td>1위 ${x.wins}회</td><td>수익 ${x.sales}만</td><td>${x.awards && x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    proHtml = `
      <table class="season-table"><thead><tr><th>연차</th><th>수익률1위</th><th>연수익</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div>통산 ${S.career.years.length}년 · 1위 ${S.career.wins}회 · 🏆 올해의투자자 ${S.career.daesang} · 베스트개미 ${S.career.bonsang}${S.career.rookie ? " · 신인상" : ""}</div>`;
  }
  const gearList = STAT_DEFS
    .map((d) => {
      const owned = GEAR_TIERS.filter((t) => S.gear && S.gear[`${d.key}-${t.n}`]).length;
      return owned ? `${d.emoji}${"★".repeat(owned)}` : null;
    })
    .filter(Boolean)
    .join(" ");
  $("record-card").innerHTML = `
    <div class="draft-emoji">📈</div>
    <div class="draft-title">${S.name}</div>
    <div class="draft-team">${S.phase === "stock-pro" ? `${S.group}${S.center ? " · 슈퍼개미" : ""} · ${S.proYear}년차` : `${m.emoji} ${m.name} 주린이 ${S.year}년차`} · ${POS_INFO[S.pos].name}</div>
    <div class="draft-summary">
      <b>🌱 주린이 기록</b><br/>실전 매매 ${S.stages || 0}회 · 📈 내공 ${Math.round(S.fandom)}<br/>${trophyLine}<br/>
      ${curHtml}
      ${proHtml ? `<br/><b>📈 지난 투자 기록</b>${proHtml}<br/>` : ""}
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
    const c = window.StockCareer;
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
    Match.count("stock").then((n) => {
      if (n) {
        $("title-count").innerHTML = `📈 지금까지 <b>${n.toLocaleString()}명</b>의 주린이가 시장에 뛰어들었어요!`;
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
  if (S.phase === "stock-pro" && window.StockCareer) {
    window.StockCareer.showActivity();
  } else {
    renderMain();
    show("screen-main");
  }
}

function slotDesc(st) {
  const posName = POS_INFO[st.pos] ? POS_INFO[st.pos].name : "";
  if (st.phase === "stock-pro") return `📈 ${st.group || "전업투자자"} · ${st.proYear || 1}년차${st.center ? " · 슈퍼개미" : ""}`;
  const m = MARKETS.find((x) => x.id === st.market);
  return `${m ? m.emoji + " " + m.name : ""} 주린이 ${st.year}년차 · ${posName}`;
}

function showSlotPicker() {
  const sl = loadSlots();
  const ids = Object.keys(sl).sort((a, b) => (sl[b].savedAt || 0) - (sl[a].savedAt || 0));
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal slot-modal">
      <p class="av-title">👥 어떤 계정으로 이어할까요?</p>
      <div class="slot-list">${ids.map((id) => {
        const st = sl[id];
        const d = st.savedAt ? new Date(st.savedAt) : null;
        return `
          <div class="slot-row">
            <button type="button" class="slot-go" data-id="${id}">
              <span class="slot-avatar slot-emoji">📈</span>
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
      if (!confirm(`${st ? st.name : "이 계정"}의 저장을 삭제할까요? 되돌릴 수 없어요!`)) return;
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
        <span class="tag">우상향 ${"★".repeat(Math.round(m.growth * 3))}</span>
        <span class="tag">안정성 ${"★".repeat(Math.round(m.debut * 5))}</span>
      </span>`;
    btn.onclick = () => {
      chosenMarket = m;
      $("position-hint").textContent = `${m.name} 입성! 어떤 투자 스타일로 시작할까요?`;
      show("screen-position");
    };
    box.appendChild(btn);
  }
}

document.querySelectorAll("#position-list .card").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenPos = btn.dataset.pos;
    $("name-hint").textContent = `${chosenMarket.name} ${POS_INFO[chosenPos].name} 주린이의 닉네임은?`;
    $("input-name").value = pick(INVESTOR_NAMES);
    pendingRoll = rollStats(chosenPos);
    show("screen-name");
    renderRoll();
  });
});

$("btn-random-name").addEventListener("click", () => {
  $("input-name").value = pick(INVESTOR_NAMES);
});

$("btn-start").addEventListener("click", () => {
  const name = $("input-name").value.trim() || pick(INVESTOR_NAMES);
  curSlot = null;
  if (window.Stats) Stats.log("new_player", { pos: chosenPos, agency: chosenMarket.name });
  if (window.Match) Match.register("stock", name);
  S = newState(chosenMarket, chosenPos, name, pendingRoll);
  addLog(`📈 ${chosenMarket.name} 입문! ${name}의 주식 인생이 시작됐어요.`);
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
      <span class="stat-pot" title="잠재력 — 별이 많을수록 공부 효율이 높아요">${stars}</span>`;
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
    btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 공부<span class="a-sub">${d.sub}</span>`;
    btn.onclick = () => doTraining(d);
    actBox.appendChild(btn);
  }
  actBox.appendChild(makeAdSlotButton(renderMain));
  const rest = document.createElement("button");
  rest.className = "action-btn rest";
  rest.innerHTML = `<span class="a-emoji">☕</span>휴식 <span class="a-sub">멘탈 대폭 회복</span>`;
  rest.onclick = doRest;
  actBox.appendChild(rest);

  // 대회일 — 공부 잠그고 대회 출전 버튼만 (🎁 특강은 턴 미소모라 허용)
  if (S.pendingStage) {
    actBox.querySelectorAll(".action-btn").forEach((b) => {
      if (!b.classList.contains("ad-slot")) b.disabled = true;
    });
    const ps = S.pendingStage;
    const go = document.createElement("button");
    go.className = "action-btn rest go-game";
    go.innerHTML = ps.kind === "survival"
      ? `<span class="a-emoji">🔥</span>전업 도전 시작!<span class="a-sub">3년의 공부가 여기서 판가름나요</span>`
      : `<span class="a-emoji">🏆</span>${ps.name} 출전!<span class="a-sub">모의투자 대회 준비 완료</span>`;
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
    addLog(`🤯 번아웃 상태로 무리하다 ${def.name} 공부를 접었어요. 한 달을 회복으로 날렸어요.`);
    endMonth();
    return;
  }

  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, STAT_CAP);
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 공부가 오히려 헷갈렸어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
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
  addLog(`${def.emoji} ${def.name} 공부 완료! +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);

  maybeEvent();
  endMonth();
}

function doRest() {
  S.condition = clamp(S.condition + randInt(30, 42), 0, 100);
  S.stats.mental = clamp(S.stats.mental + 0.5, 0, STAT_CAP);
  addLog(`☕ 잠시 시장을 떠나 쉬었어요. 멘탈 회복! (${Math.round(S.condition)})`);
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
      addLog(`📚 유명 강사의 무료 강의를 정주행했어요! ${d.name} +3`);
    },
    () => {
      const pts = Math.round(8 * m.spot);
      S.fandom += pts;
      addLog(`💬 리딩방에서 알짜 정보를 건졌어요! 내공 +${pts}`);
    },
    () => {
      S.condition = clamp(S.condition - 20, 0, 100);
      addLog(`😱 뇌동매매로 물렸어요… 멘탈 -20`);
    },
    () => {
      S.condition = clamp(S.condition + 12, 0, 100);
      addLog(`🧘 매매일지를 쓰며 마음을 다잡았어요. 멘탈 +12`);
    },
    () => {
      S.buff = true;
      addLog(`🔥 옆 계좌 수익 인증에 자극받았어요! 다음 공부 효율 1.5배`);
    },
    () => {
      S.stats.mental = clamp(S.stats.mental + 2, 0, STAT_CAP);
      addLog(`🧘 손절 원칙을 몸에 익혔어요. 멘탈 +2`);
    },
    () => {
      S.fandom = Math.max(0, S.fandom - 10);
      addLog(`📉 SNS 훈수꾼에게 휘둘렸어요… 내공 -10`);
    },
  ];
  pick(events)();
}

// ---------- 월 진행 ----------
function endMonth() {
  // 대회/전업 도전 달이면 공부 버튼을 잠그고 '출전' 버튼으로 시작해요
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

// ---------- 매매 공통 ----------
function stageScore(type) {
  const mainKey = type.main || POS_INFO[S.pos].stat;
  const score =
    S.stats[mainKey] * 0.55 +
    S.stats[type.aux] * 0.2 +
    S.stats.capital * 0.1 +
    S.condition / 8 +
    rand(-9, 9);
  return { mainKey, score };
}

const GRADE_ORDER = ["D", "C", "B", "A", "S"];
const GRADE_INFO = {
  S: { pts: 30, txt: "🚀 완벽한 매매! 저점 매수·고점 매도, 교과서 그 자체." },
  A: { pts: 22, txt: "🔥 좋은 진입! 수익을 두둑이 챙겼어요." },
  B: { pts: 15, txt: "🙂 무난한 매매. 소소하게 익절했어요." },
  C: { pts: 9, txt: "😬 어정쩡한 자리에서 본전 근처로 마감." },
  D: { pts: -5, txt: "😢 고점에 물렸어요… 계좌가 파랗게 질렸어요." },
};
const makeGrade = (g) => ({ g, ...GRADE_INFO[g] });

function gradeOf(score) {
  if (score >= 76) return makeGrade("S");
  if (score >= 64) return makeGrade("A");
  if (score >= 52) return makeGrade("B");
  if (score >= 40) return makeGrade("C");
  return makeGrade("D");
}

// ---------- 매매 연출 ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MOMENTS = {
  analysis: {
    good: ["재무제표에서 저평가 신호를 포착! 📊", "차트 지지선을 정확히 짚었어요 ✨", "실적 서프라이즈를 미리 읽어냈어요 🎯"],
    bad: ["지표 해석을 살짝 착각했어요 😬", "분할매수 타이밍을 놓칠 뻔했어요 💦"],
  },
  reflex: {
    good: ["급등 초입에 정확히 올라탔어요! ⚡", "눌림목을 완벽하게 잡았어요 ✨", "손절 라인을 칼같이 지켰어요 🔥"],
    bad: ["반 박자 늦게 진입했어요 😬", "호가창 속도를 못 따라갔어요 💦"],
  },
  info: {
    good: ["장 시작 전 재료를 선점했어요! 📰", "공시가 뜨자마자 대응했어요 ✨", "테마 순환을 한발 앞서 읽었어요 🔥"],
    bad: ["뒷북 뉴스에 휩쓸릴 뻔했어요 😬", "찌라시에 잠깐 흔들렸어요 💦"],
  },
};

// 매매 승부처 미니게임 — 타이밍/존버/차트패턴/급등락/세력 5종 랜덤
const STOCK_BAR = { ok: "✨ 무난한 자리에서 체결했어요", great: "💫 완벽한 저점 매수·고점 매도!!", bad: "😱 추격매수했다가 바로 물렸어요" };
const STOCK_HOLD = { ok: "🧘 흔들림 없이 버텨 수익 구간까지!", great: "💎 완벽한 존버 끝에 최고점 익절!!", bad: "😵 못 참고 손절했는데 바로 반등…" };
const STOCK_SEQ = { ok: "📈 파동을 정확히 따라 매매했어요", great: "🌟 흐름을 완벽히 읽어 수익 극대화!!", bad: "🙈 패턴이 깨진 걸 놓쳤어요" };
const STOCK_REACT = { ok: "⚡ 변동성에 바로 대응했어요", great: "🚀 급등 신호에 0.1초 컷 진입!!", bad: "😵 급락에 얼어붙어 대응 실패…" };
const STOCK_DUEL = { ok: "🧠 세력의 함정을 피했어요", great: "🎯 설거지 직전 완벽 탈출!!", bad: "🙈 세력 물량에 그대로 당했어요" };
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
    if (autoMiniOn()) { cb(autoRes(S.stats[posStat]), STOCK_BAR); return; }
    window.Timing.play(container, {
      label: "🎯 매수 타이밍! 초록 존에서 체결하세요!",
      button: "체결! 📈",
      zonePct: miniZone(S.stats[posStat]),
    }, (res) => cb(res, STOCK_BAR));
  } else if (mech === "hold") {
    if (autoMiniOn()) { cb(autoRes(S.stats.mental), STOCK_HOLD); return; }
    window.Timing.hold(container, {
      label: "💪 존버 중! 꾹 참다가 수익 구간에서 익절!",
      button: "익절! 💎",
      zonePct: miniZone(S.stats.mental),
    }, (res) => cb(res, STOCK_HOLD));
  } else if (mech === "seq") {
    if (autoMiniOn()) { cb(autoRes(S.stats.reflex), STOCK_SEQ); return; }
    window.Timing.sequence(container, {
      label: "📈 차트 파동! 흐름을 기억했다가 그대로 매매!",
      icons: ["📈", "📉", "💰", "🔴"],
      showMs: 900 + S.stats.reflex * 6 + (S.condition - 50) * 3,
    }, (res) => cb(res, STOCK_SEQ));
  } else if (mech === "react") {
    if (autoMiniOn()) { cb(autoRes(S.stats.capital), STOCK_REACT); return; }
    window.Timing.reaction(container, {
      label: "🚨 급등/급락 신호! 켜지는 순간 즉시 대응!",
      button: "대응!! ⚡",
      perfectMs: 300 + S.stats.capital * 1.5,
      goodMs: 700 + S.stats.capital * 2.5,
    }, (res) => cb(res, STOCK_REACT));
  } else {
    if (autoMiniOn()) { cb(autoRes(S.stats.capital), STOCK_DUEL); return; }
    window.Timing.duel(container, {
      label: "🧠 세력 심리전! 설거지 물량은 어디로?",
      choices: ["저가", "현재가", "고가"],
      hintChance: clamp((S.stats.capital - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, (res) => cb(res, STOCK_DUEL));
  }
}

let stageTimer = null;
// 매매를 문자중계처럼 연출 + 승부처 미니게임 → 결과는 onFinal(최종등급)로
function renderStageSim(type, grade, onFinal) {
  const key = type.main || POS_INFO[S.pos].stat;
  const pool = MOMENTS[key] || MOMENTS.analysis;
  const goodN = grade.g === "S" ? 3 : grade.g === "A" ? 2 : grade.g === "B" ? 1 : 0;
  const badN = grade.g === "D" ? 2 : grade.g === "C" ? 1 : grade.g === "B" ? 1 : 0;
  const moments = shuffle([
    ...shuffle([...pool.good]).slice(0, goodN).map((t) => ({ text: t, cls: "good" })),
    ...shuffle([...pool.bad]).slice(0, badN).map((t) => ({ text: t, cls: "bad" })),
  ]);
  const feeds = [
    { text: `📈 ${S.name}, ${type.name}에 참전합니다.` },
    { text: "장이 열리고, 호가창이 빠르게 움직여요 📊" },
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
    applyFeed({ text: "🔥 결정적 매매 타이밍이 다가와요…!", cls: "good" });
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
      applyFeed({ text: "장 마감, 손익을 정산합니다… 🧮" });
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

// ---------- 모의투자 대회 ----------
function startEval(name) {
  ev = { kind: "eval", name, idx: 0, totalPts: 0, scores: [] };
  $("stage-title").textContent = `🏆 ${S.year}년차 ${name}`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">📈 전 주린이 공개 모의투자 대회!</div>
    <div class="tour-line">세 번의 실전 매매에 도전해요.<br/>좋은 성적이면 내공과 시장의 주목이 올라요.</div>`;
  $("btn-stage-next").textContent = "첫 매매 시작";
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
  $("stage-round").textContent = `${ev.idx}번째 매매 · ${type.name}`;
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
      <div class="tour-vs">매매 등급 <span class="${fg.g === "S" || fg.g === "A" ? "win" : fg.g === "D" ? "lose" : ""}">${fg.g}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `📈 내공 +${pts}` : `📉 내공 ${pts}`}${pay ? ` · 💰 수익 +${pay}만` : ""}</div>`;
    return ev.idx < 3
      ? { resultHTML, nextLabel: "다음 매매", nextFn: playEvalStage }
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
    <div class="tour-vs">주린이 24명 중 <span class="${rank <= 3 ? "win" : rank >= 18 ? "lose" : ""}">${rank}위</span></div>
    <div class="tour-line">${
      rank === 1 ? "🏆 전체 1위! 커뮤니티에서 '고수 주린이'로 회자되기 시작했어요." :
      rank <= 3 ? "🌟 최상위권! 리딩방마다 당신의 매매를 참고해요." :
      rank <= 10 ? "🙂 중상위권. 꾸준함이 무기예요." :
      rank <= 17 ? "😐 중하위권… 다음 대회까지 더 공부해야 해요." :
      "😨 하위권. 계좌가 파랗게 질렸어요. 분발해야 해요!"
    }</div>
    ${bonus ? `<div class="tour-pts">🏅 순위 보너스 내공 +${bonus}</div>` : ""}
    <div class="tour-pts">이번 대회 내공 합계 +${ev.totalPts + bonus}</div>`;
  $("btn-stage-next").textContent = "책상으로 돌아가기";
  $("btn-stage-next").onclick = () => {
    addLog(`🏆 ${ev.name} ${rank}위! (내공 +${ev.totalPts + bonus})`);
    ev = null;
    show("screen-main");
    advanceMonth();
  };
}

// ---------- 전업 도전 ----------
function startSurvival() {
  ev = { kind: "survival", round: 0, eliminated: false };
  $("stage-title").textContent = `📈 전업투자자 도전 <올인>`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">🔥 직장을 걸고, 시드를 걸고</div>
    <div class="tour-line">3년의 공부가 오늘을 위해 있었어요.<br/>소액 실전부터 전업 선언까지, 살아남으면 전업투자자입니다.</div>`;
  $("btn-stage-next").textContent = "소액 실전 시작";
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
      <div class="tour-vs">매매 등급 ${fg.g} — <span class="${pass ? "win" : "lose"}">${pass ? "통과! 🎉" : "실패… 💧"}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `📈 내공 +${pts}` : `📉 내공 ${pts}`}</div>`;
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
    emoji = "👑"; title = "전업 슈퍼개미 등극!";
    teamLine = `${m.name} 전업투자자 — 슈퍼개미`;
    msg = "압도적 성과! 시장이 당신의 매매를 주목하기 시작했어요.";
  } else if (survivedFinal) {
    emoji = "🌟"; title = "전업투자자 전향!";
    teamLine = `${m.name} 전업투자자 데뷔`;
    msg = "전업 선언 성공! 3년의 공부가 드디어 직업이 됐어요.";
  } else if (lastRound === 3) {
    emoji = "💜"; title = "전업 실패… 하지만!";
    teamLine = "겸업 투자자로 재도전";
    msg = "아쉽게 전업엔 실패했지만, 직장을 지키며 다시 도전할 발판을 마련했어요.";
  } else if (lastRound === 2 && score >= 420) {
    emoji = "📞"; title = "증권사 스카우트!";
    teamLine = "프랍 트레이더 제안";
    msg = "계좌 인증 실력을 본 증권사에서 러브콜이! 회사 돈으로 매매를 노려요.";
  } else if (lastRound >= 1) {
    emoji = "🌱"; title = "직장인 투자자 유지";
    teamLine = "월급 받으며 투자 지속";
    msg = "이번엔 여기까지. 하지만 시드는 계속 쌓이고 있어요.";
  } else if (score >= 330) {
    emoji = "📹"; title = "주식 유튜버 선언";
    teamLine = "투자 채널 개설 → 인플루언서 노리기";
    msg = "전업은 못 했지만 쌓인 내공이 있어요. 콘텐츠로 역주행을 노려봐요!";
  } else {
    emoji = "🎒"; title = "잠시 시장과 작별";
    teamLine = "본업에 집중하기로";
    msg = "꿈은 이루지 못했지만 3년의 공부는 사라지지 않아요. 언젠가 다시 도전할 수 있으니까!";
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
      📈 최종 내공 ${Math.round(S.fandom)} · 실전 매매 ${S.stages}회<br/>
      ${trophyLine}
    </div>`;

  $("btn-share").onclick = () => {
    const text = `📈 더 인베스터 결과\n${m.name} ${S.name} — ${title}\n${teamLine}\n내공 ${Math.round(S.fandom)} / ${trophyLine}`;
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

  // 전업 성공·재도전 확보면 전업 활동으로 이어갈 수 있어요
  if (window.StockCareer) window.StockCareer.onEnding(survivedFinal || lastRound === 3, survivedFinal && score >= 520);
  else clearSave();
  show("screen-ending");
}

// ---------- 시작 ----------
initTitle();
if (window.Stats) Stats.init("stock");
