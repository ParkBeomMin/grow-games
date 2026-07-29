/* 계약금 — 이적으로 돈만 챙기는 왕복을 막았는가.
 *
 * 이적할 때마다 계약금이 들어오기만 하면, 같은 리그 안에서 A↔B를 오가며
 * 돈만 챙기는 플레이가 최적해가 된다. 하위 리그로 내려가는 이적까지 같은 돈을
 * 주면 "몸값"이라는 말 자체가 무너진다.
 *
 * 확인은 전부 화면에서 한다. transferFee를 직접 부르지 않고, 결산 화면의
 * "💼 이적 제안 보기" 버튼 → 제안 카드를 실제로 눌러서 자금이 얼마나 늘었는지 센다.
 * 계수는 소스에서 뽑는다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
 * eval("const x = …")은 쓰지 않는다. new Function으로 감싸 return 한다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

// ---------- 페이지 부트스트랩 (tests/soccer/transfer-test.js와 같은 방식) ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  localStorage.setItem("grow-auto-mini", "1");
`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
html = html.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const get = w.__get, set = w.__set;

const Career = w.WingerCareer;
check(!!Career, "WingerCareer 모듈이 페이지에서 로드된다");
if (!Career || !Career._t || typeof Career._t.state !== "function") { console.log("\n❌ 실패"); process.exit(1); }
const T = Career._t;
const LEAGUES = T.LEAGUES;
const CLUBS = T.CLUBS;
const leagueById = (id) => LEAGUES.find((l) => l.id === id);

// ---------- 소스에서 뽑는 계수 ----------
const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const src = {
  down: grab(SRC, /const DOWNGRADE_FEE = [^;]+;/),
  loyal: grab(SRC, /const LOYALTY_FEE = [^;]+;/),
  promote: grab(SRC, /const PROMOTE_HYPE = \{[^}]*\};/),
  pow: grab(SRC, /const FEE_PRESTIGE_POW = [^;]+;/),
};
const missing = Object.entries(src).filter(([, v]) => !v).map(([k]) => k);
check(missing.length === 0,
  missing.length ? `career.js에 계약금 계수가 없어요: ${missing.join(", ")}`
    : "DOWNGRADE_FEE · LOYALTY_FEE가 career.js에 있다");
const DOWNGRADE_FEE = src.down ? new Function(`${src.down} return DOWNGRADE_FEE;`)() : null;
const LOYALTY_FEE = src.loyal ? new Function(`${src.loyal} return LOYALTY_FEE;`)() : null;
const PROMOTE_HYPE = src.promote ? new Function(`${src.promote} return PROMOTE_HYPE;`)() : { 2: 5.5, 3: 6.5 };
const FEE_PRESTIGE_POW = src.pow ? new Function(`${src.pow} return FEE_PRESTIGE_POW;`)() : 3;
check(DOWNGRADE_FEE != null && DOWNGRADE_FEE > 0 && DOWNGRADE_FEE < 1,
  `DOWNGRADE_FEE가 0과 1 사이다 — 리그를 내려가면 계약금이 줄어든다 (${DOWNGRADE_FEE})`);
check(LOYALTY_FEE != null && LOYALTY_FEE > 0 && LOYALTY_FEE < 1,
  `LOYALTY_FEE가 0과 1 사이다 — 이적을 거듭할수록 계약금이 줄어든다 (${LOYALTY_FEE})`);

// ---------- 데뷔까지 실제로 눌러서 프로 상태를 만든다 ----------
set("S", get('newState(MARKETS[0], "fw", "테스트")'));
Career.onEnding(true, false);
$("btn-go-debut").click();
check(active() === "screen-pro", `데뷔하면 프로 준비 화면으로 간다 (${active()})`);
// 결산 화면을 띄우려면 시즌이 하나는 있어야 한다
T.state().career.years.push({
  y: 1, hype: 0, wins: 0, sales: 0, dFan: 0, awards: [],
  goals: 0, assists: 0, defense: 0, apps: 30,
});

const cards = () => Array.from(w.document.querySelectorAll("#screen-transfer .tf-card"));
/* 결산 화면으로 돌아가 다시 이적 버튼을 누른다. moves는 건드리지 않는다 —
 * 이 파일의 주제가 "이력이 계약금을 깎는가"라서 이력을 지우면 검사가 무의미해진다. */
function openTransfer(over = {}) {
  const St = T.state();
  St.camp = 0; St.activity = null; St.pendingShow = false;
  for (const k of ["league", "group", "clubStr", "proYear", "moves", "money"]) {
    if (over[k] !== undefined) St[k] = over[k];
  }
  if (over.hype !== undefined) St.career.years[St.career.years.length - 1].hype = over.hype;
  Career.showActivity();
  if (active() !== "screen-career") return null;
  const btn = $("btn-transfer");
  if (!btn) return null;
  btn.click();
  return active() === "screen-transfer" ? cards() : null;
}
/* 제안은 리그마다 무작위로 몇 개만 온다. 원하는 클럽 카드가 나올 때까지 다시 연다. */
function findCard(clubName, over = {}, tries = 200) {
  for (let i = 0; i < tries; i++) {
    const list = openTransfer(over);
    if (!list) throw new Error(`이적 화면이 안 열려요 (${active()})`);
    const hit = list.find((el) => el.dataset.club === clubName);
    if (hit) return hit;
  }
  throw new Error(`${clubName} 카드를 ${tries}번 열어도 못 만났어요`);
}
const feeOf = (el) => Number(el.dataset.fee);

const A = CLUBS[1][5];   // 포레스트 FC — 데뷔 클럽 풀
const B = CLUBS[1][0];   // FC 노바
const D = CLUBS[1][2];   // 선더볼트

// ---------- ① 같은 리그 왕복(A→B→A)의 총 계약금이 A→B 한 번보다 크지 않다 ----------
/* 이적을 아예 안 하면 계약금은 0원이라, "0원보다 작다"는 계약금이 음수여야 성립한다.
 * 그래서 못 박는 건 "돌아오는 다리에서 한 푼도 더 안 나온다"다 —
 * 왕복 총액이 편도 총액과 같아서, 왕복에 아무 이득이 없다. */
let feeAB = 0, feeBA = 0;
guard("① 왕복 이적", () => {
  const start = { league: 1, group: A.name, clubStr: A.str, proYear: 3, moves: [], money: 0, hype: 0 };
  const cardB = findCard(B.name, start);
  feeAB = feeOf(cardB);
  check(feeAB > 0, `A(${A.name}) → B(${B.name}) 첫 이적에는 계약금이 나온다 (${feeAB})`);
  const before = T.state().money || 0;
  cardB.click();
  const afterAB = T.state().money || 0;
  check(afterAB - before === feeAB, `카드에 적힌 계약금이 그대로 자금에 들어온다 (${afterAB - before} vs ${feeAB})`);
  check(T.state().group === B.name, `B로 옮겼다 (${T.state().group})`);

  // 다음 오프시즌 — 떠나온 A로 돌아간다
  const cardA = findCard(A.name, { proYear: 4, hype: 0 });
  feeBA = feeOf(cardA);
  const beforeBA = T.state().money || 0;
  cardA.click();
  const afterBA = T.state().money || 0;
  check(T.state().group === A.name, `A로 돌아왔다 (${T.state().group})`);
  console.log(`=== ① 왕복 — A→B ${feeAB} · B→A ${feeBA} · 총 ${feeAB + feeBA} (편도 ${feeAB}) ===`);
  check(feeBA === 0, `떠나온 클럽으로 돌아가면 계약금이 없다 (${feeBA})`);
  check(afterBA - beforeBA === 0, `돌아가는 이적으로 자금이 안 늘어난다 (${afterBA - beforeBA})`);
  check(feeAB + feeBA <= feeAB,
    `A→B→A 왕복 총 계약금이 A→B 한 번(그리고 머무름)보다 크지 않다 (${feeAB + feeBA} ≤ ${feeAB})`);
});

// ---------- ② 왕복을 반복해도 마찬가지다 ----------
guard("② 왕복 반복", () => {
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const cur = T.state().group;
    const want = cur === A.name ? B.name : A.name;
    const el = findCard(want, { proYear: 5 + i, hype: 0 });
    total += feeOf(el);
    el.click();
  }
  console.log(`=== ② A↔B 3번 더 왕복 — 추가 계약금 ${total} ===`);
  check(total === 0, `이미 오간 두 클럽을 다시 왕복해도 계약금이 한 푼도 안 나온다 (${total})`);
});

// ---------- ③ 하위 리그 이적의 계약금이 같은 리그 이적보다 작다 ----------
/* 같은 목적지 클럽을 놓고 비교한다. 출발 리그만 다르니 차이는 순수하게
 * "내려가는 이적인가"에서만 온다. */
guard("③ 하위 리그 이적", () => {
  const dest = D;                        // 1부 선더볼트 — 아직 떠난 적 없는 클럽
  const same = findCard(dest.name, { league: 1, group: A.name, clubStr: A.str, proYear: 3, moves: [], hype: 0 });
  const feeSame = feeOf(same);
  const down1 = findCard(dest.name, { league: 2, group: CLUBS[2][0].name, clubStr: CLUBS[2][0].str, proYear: 3, moves: [], hype: 0 });
  const feeDown1 = feeOf(down1);
  const down2 = findCard(dest.name, { league: 3, group: CLUBS[3][0].name, clubStr: CLUBS[3][0].str, proYear: 3, moves: [], hype: 0 });
  const feeDown2 = feeOf(down2);
  console.log(`=== ③ ${dest.name}(1부)로 가는 계약금 — 1부에서 ${feeSame} · 2부에서 ${feeDown1} · 3부에서 ${feeDown2} ===`);
  check(feeDown1 < feeSame,
    `한 단계 내려가는 이적의 계약금이 같은 리그 이적보다 작다 (${feeDown1} < ${feeSame})`);
  check(feeDown2 < feeDown1,
    `두 단계 내려가면 더 작다 (${feeDown2} < ${feeDown1})`);
  check(Math.abs(feeDown1 / feeSame - DOWNGRADE_FEE) < 0.02,
    `낙폭 한 단계가 DOWNGRADE_FEE(${DOWNGRADE_FEE})만큼이다 (실측 ${(feeDown1 / feeSame).toFixed(3)})`);
});

// ---------- ④ 위로 올라가는 이적은 여전히 큰돈이다 ----------
/* 왕복을 막느라 리그를 올리는 이적의 보상까지 죽이면 도전할 이유가 사라진다. */
guard("④ 상위 리그 이적", () => {
  const start = { league: 1, group: A.name, clubStr: A.str, proYear: 3, moves: [], hype: PROMOTE_HYPE[3] };
  const same = findCard(B.name, start);
  const feeSame = feeOf(same);
  const up = findCard(CLUBS[3][0].name, start);
  const feeUp = feeOf(up);
  console.log(`=== ④ 1부 ${B.name} ${feeSame} vs 3부 ${CLUBS[3][0].name} ${feeUp} ===`);
  check(feeUp > feeSame * 3,
    `상위 리그 이적은 같은 리그 이적보다 훨씬 큰돈이다 (${feeUp} vs ${feeSame})`);
});

// ---------- ⑤ 이적을 거듭할수록 계약금이 줄어든다 ----------
/* 떠난 적 없는 새 클럽만 골라 돌아도 무한 급전이 되면 안 된다. */
guard("⑤ 저니맨 감가", () => {
  const dest = CLUBS[1][1];   // 레인저스
  const fresh = findCard(dest.name, { league: 1, group: A.name, clubStr: A.str, proYear: 3, moves: [], hype: 0 });
  const feeFresh = feeOf(fresh);
  const many = [
    { y: 2, from: "X1", to: "X2", fromLg: 1, toLg: 1 },
    { y: 3, from: "X2", to: "X3", fromLg: 1, toLg: 1 },
    { y: 4, from: "X3", to: "X4", fromLg: 1, toLg: 1 },
  ];
  const worn = findCard(dest.name, { league: 1, group: A.name, clubStr: A.str, proYear: 5, moves: many, hype: 0 });
  const feeWorn = feeOf(worn);
  console.log(`=== ⑤ ${dest.name} 계약금 — 첫 이적 ${feeFresh} · 이적 3회 뒤 ${feeWorn} ===`);
  check(feeWorn < feeFresh,
    `이적을 3번 한 뒤에는 같은 클럽의 계약금이 더 작다 (${feeWorn} < ${feeFresh})`);
  check(Math.abs(feeWorn / feeFresh - Math.pow(LOYALTY_FEE, many.length)) < 0.02,
    `감가가 LOYALTY_FEE^이적횟수(${Math.pow(LOYALTY_FEE, many.length).toFixed(3)})와 같다 (실측 ${(feeWorn / feeFresh).toFixed(3)})`);
});

// ---------- ⑥ 계약금이 없는 카드는 화면에도 그렇게 적힌다 ----------
guard("⑥ 계약금 표시", () => {
  const el = findCard(B.name, {
    league: 1, group: A.name, clubStr: A.str, proYear: 3, hype: 0,
    moves: [{ y: 2, from: B.name, to: A.name, fromLg: 1, toLg: 1 }],
  });
  check(feeOf(el) === 0, `떠난 적 있는 클럽의 카드는 계약금이 0이다 (${feeOf(el)})`);
  const txt = el.textContent.replace(/\s+/g, " ");
  check(!/계약금 0[만억]/.test(txt), `카드가 "계약금 0만"이라고 적지 않는다 (${txt})`);
  check(txt.includes("계약금 없음"), `카드에 계약금이 없다고 적혀 있다 (${txt})`);
});

/* ---------- ⑦ 리그격이 계약금에 얼마나 실리는가 ----------
 *
 * 여기가 조용히 새는 자리다. 계약금은 리그격(prestige)의 거듭제곱이라,
 * 리그 계수를 수상 가치 때문에 손대면 계약금이 따라 부푼다.
 * 실제로 5단 사다리 작업에서 챔피언스리그 prestige가 1.80 → 2.40이 되자
 * 세제곱이 그대로 실려 최상위 계약금이 2.37배가 됐다 —
 * 실측으로 계약금 한 장(1.4억)이 12시즌을 뛰어서 버는 돈(1.5억)과 맞먹었다.
 * 그래서 거듭제곱을 제곱으로 낮췄다.
 *
 * 검사는 화면에서 읽은 계약금으로 지수를 되짚는다. 전력이 다른 두 클럽을 비교하니
 * 전력의 제곱으로 나눠서 리그격 몫만 남긴다. 값을 옮겨 적지 않는다. */
guard("⑦ 리그격의 거듭제곱", () => {
  const byTier = LEAGUES.slice().sort((a, b) => a.tier - b.tier);
  const top = byTier[byTier.length - 1];
  const base = leagueById(1);                       // 기본 리그 — prestige 1.00이라 기준점이다
  const start = { league: base.id, group: A.name, clubStr: A.str, proYear: 3, moves: [], hype: PROMOTE_HYPE[top.id] };
  const topClub = CLUBS[top.id].slice().sort((a, b) => b.str - a.str)[0];
  const baseClub = CLUBS[base.id].slice().sort((a, b) => b.str - a.str)[0];
  const feeTop = feeOf(findCard(topClub.name, start));
  const feeBase = feeOf(findCard(baseClub.name, start));
  // 전력 몫을 걷어내고 리그격 몫만 남긴다
  const perStrTop = feeTop / (topClub.str * topClub.str);
  const perStrBase = feeBase / (baseClub.str * baseClub.str);
  const ratio = perStrTop / perStrBase;
  const powSeen = Math.log(ratio) / Math.log(top.prestige / base.prestige);
  console.log(`=== ⑦ ${topClub.name}(${top.name} 전력 ${topClub.str}) ${feeTop} vs ${baseClub.name}(${base.name} 전력 ${baseClub.str}) ${feeBase} ===`);
  console.log(`  전력 몫을 걷어낸 리그격 배수 ${ratio.toFixed(2)} — prestige ${top.prestige}의 ${powSeen.toFixed(2)}제곱`);
  check(Math.abs(powSeen - FEE_PRESTIGE_POW) < 0.05,
    `계약금이 리그격을 FEE_PRESTIGE_POW(${FEE_PRESTIGE_POW})제곱으로 싣는다 (실측 ${powSeen.toFixed(2)}제곱)`);
  check(FEE_PRESTIGE_POW < 3,
    `리그격을 세제곱으로 싣지 않는다 — 리그 계수를 올릴 때마다 계약금이 따라 폭주하던 자리다 (${FEE_PRESTIGE_POW}제곱)`);
  check(ratio < 10,
    `최상위 리그 계약금이 같은 전력이라면 기본 리그의 10배를 넘지 않는다 (${ratio.toFixed(2)}배)`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
