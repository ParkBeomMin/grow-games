/* 승격 — 5단 사다리를 아래에서 위로 올라갈 수 있는가.
 *
 * 하부 리그가 생기면서 "아래에서 위로 올라오는 길"이 이 게임의 주 서사가 됐다.
 * 그런데 PROMOTE_HYPE가 위쪽 두 리그만 덮고 있으면 need가 Infinity가 되어
 * K리그3·K리그2가 막다른 길이 된다. 📹 세미프로로 시작한 선수는 영원히 K리그3다.
 * 이 파일이 그 사다리를 지킨다.
 *
 * 확인은 전부 게임 입구를 통해서 한다. jsdom에 beta/soccer/index.html을 통째로 띄우고
 * 엔딩 화면의 '프로 커리어 시작' → 결산의 '이적 제안 보기' → 제안 카드 순으로
 * **실제 클릭**해 도달하고, 결과는 DOM과 살아 있는 S에서 읽는다.
 * (tests/soccer/transfer-test.js · semipro-test.js와 같은 방식이다.)
 *
 * 상수와 산식은 소스에서 정규식으로 뽑아 쓴다 — 값을 옮겨 적으면 원본이 바뀌어도
 * 초록이 뜬다. eval("const x = …")은 선언이 eval 자기 스코프에 갇히니 쓰지 않는다.
 * new Function으로 감싸 return 한다. */
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
  window.alert = () => {};
  localStorage.setItem("grow-auto-mini", "1");
`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
/* game.js의 S·newState·showEnding은 `let`/`function` 선언이라 window에 안 붙는다.
 * 전역 어휘 스코프는 스크립트끼리 공유되니, 페이지 안에서 eval로 읽고 쓴다. */
html = html.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
w.alert = () => {};
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const get = w.__get, set = w.__set;

const Career = w.WingerCareer;
check(!!Career, "WingerCareer 모듈이 페이지에서 로드된다");
if (!Career || !Career._t || typeof Career._t.state !== "function") { console.log("\n❌ 실패"); process.exit(1); }
const T = Career._t;
const LEAGUES = T.LEAGUES;
const CLUBS = T.CLUBS;
const BY_TIER = LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const leagueById = (id) => LEAGUES.find((l) => l.id === id);
/* ⚠️ CLUBS가 아니라 **세이브의 세계(S.world)**에서 찾아요.
 * 승격·강등이 일어나면 내 클럽이 상대 리그의 자리를 물려받으면서 전력도 그 자리
 * 값으로 바뀌어요(applyPromotion → swapLeagues). 그때부터 CLUBS는 그 클럽에
 * 대해 낡은 값입니다 — 이적 카드도 moveToClub도 전부 world를 보는데 검사만
 * CLUBS를 봐서, 여섯 번에 한 번쯤 "전력이 1 다르다"로 빨간불이 떴어요.
 * (같은 병을 tests/soccer/transfer-test.js에서도 한 번 고쳤습니다.) */
const clubByName = (n) => {
  const w = (T.state() || {}).world || {};
  return LEAGUES.flatMap((l) => (Array.isArray(w[l.id]) && w[l.id].length ? w[l.id] : (CLUBS[l.id] || [])))
    .find((c) => c.name === n);
};
/* ⚠️ 자리(BY_TIER[n])로 잡지 않는다. 나라별 리그로 늘면서 tier 자리가 밀려
 * BY_TIER[3]이 유로파에서 🇯🇵 일본 2부가 됐고, 이 파일의 절반이 엉뚱한 리그를 봤다.
 * id는 옛 세이브가 가리키는 값이라 안 움직인다 — 그걸 기준으로 잡는다.
 *   5 한국 3부 · 4 한국 2부 · 1 한국 1부 · 2 잉글랜드 2부(옛 유로파) · 3 잉글랜드 1부(옛 챔스) */
const byLeagueId = (id) => LEAGUES.find((l) => l.id === id);
const K3 = byLeagueId(5), K2 = byLeagueId(4), K1 = byLeagueId(1), EUR = byLeagueId(2), UCL = byLeagueId(3);

// ---------- 소스에서 뽑는 상수 ----------
const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
const consts = {
  promote: grab(SRC, /const PROMOTE_HYPE = \{[^}]*\};/),
  perLeague: grab(SRC, /const OFFERS_PER_LEAGUE = [^;]+;/),
  down: grab(SRC, /const DOWNGRADE_FEE = [^;]+;/),
};
const missing = Object.entries(consts).filter(([, v]) => !v).map(([k]) => k);
check(missing.length === 0,
  missing.length ? `career.js에서 상수를 못 찾았어요: ${missing.join(", ")}`
    : "PROMOTE_HYPE · OFFERS_PER_LEAGUE · DOWNGRADE_FEE를 소스에서 뽑았다");
if (missing.length) { console.log("\n❌ 실패"); process.exit(1); }
const PROMOTE_HYPE = new Function(`${consts.promote} return PROMOTE_HYPE;`)();
const OFFERS_PER_LEAGUE = new Function(`${consts.perLeague} return OFFERS_PER_LEAGUE;`)();
const DOWNGRADE_FEE = new Function(`${consts.down} return DOWNGRADE_FEE;`)();

// ---------- ① 5단 전부에 문턱이 있다 ----------
/* 이게 이 파일의 존재 이유다. 한 칸이라도 비면 그 리그가 막다른 길이 된다. */
console.log("=== ① 문턱이 5단 전부를 덮는가 ===");
guard("문턱 표", () => {
  const holes = BY_TIER.filter((l) => PROMOTE_HYPE[l.id] == null);
  check(holes.length === 0,
    `PROMOTE_HYPE가 리그 5개를 전부 덮는다 (빠진 리그 ${holes.map((l) => l.name).join(", ") || "없음"})`);
  // "어느 리그에서도 위로 갈 문턱이 정의돼 있다" — 맨 위(챔피언스리그)만 예외다
  const stuck = BY_TIER.filter((l) => {
    const up = BY_TIER.find((x) => x.tier === l.tier + 1);
    return up && PROMOTE_HYPE[up.id] == null;
  });
  check(stuck.length === 0,
    `맨 위를 뺀 모든 리그에서 한 칸 위로 갈 문턱이 정의돼 있다 (막다른 리그 ${stuck.map((l) => l.name).join(", ") || "없음"})`);
  const line = BY_TIER.map((l) => `${l.name} ${PROMOTE_HYPE[l.id]}`).join(" · ");
  console.log(`  문턱(그 리그로 들어가는 데 필요한 직전 시즌 hype): ${line}`);
  const ups = BY_TIER.slice(1).map((l) => PROMOTE_HYPE[l.id]);
  check(ups.every((v, i) => i === 0 || ups[i - 1] < v),
    `문턱이 tier 순으로 올라간다 (${BY_TIER.slice(1).map((l) => `${l.name} ${PROMOTE_HYPE[l.id]}`).join(" < ")})`);
});

/* ---------- ② 문턱을 능력치로 환산한다 — 실측 ----------
 *
 * hype는 리그마다 눈금이 다르다. 축에 prestige를 곱하니 같은 성적이라도
 * K리그3(0.55)에서는 K리그1보다 1.8쯤 낮게 나온다. 그래서 "문턱 숫자가 작다"는 것만으로는
 * 하부가 쉽다는 증명이 안 된다. 각 리그에서 그 문턱을 중앙값으로 내는 능력치를 실측해서
 * 사다리가 실제로 위로 갈수록 가팔라지는지 본다.
 *
 * 시즌은 페이지에 실제로 로드된 함수로 굴린다 (ratingOf·matchContribution·autoRes).
 * hype 산식만 career.js 소스에서 떼어 new Function으로 감싼다. */
const seasonSrc = {
  cbPerYear: grab(SRC, /const CB_PER_YEAR = [^;]+;/),
  weeksPerCb: grab(SRC, /const WEEKS_PER_CB = [^;]+;/),
  /* agePen은 노쇠 시작 시즌(DECLINE_FROM)을 읽어요 — 상수까지 같이 떼어 와야 굴러가요.
   * 따로 안 떼면 ReferenceError로 죽습니다(조용히 통과하지는 않아요). */
  ageConst: grab(SRC, /const DECLINE_FROM = [^;]+;/),
  agePen: grab(SRC, /const agePen = [^;]+;/),
  hype: grab(SRC, /const hype = clamp\([^;]+;/),
};
const seasonMissing = Object.entries(seasonSrc).filter(([, v]) => !v).map(([k]) => k);
check(seasonMissing.length === 0,
  seasonMissing.length ? `시즌·hype 산식을 못 찾았어요: ${seasonMissing.join(", ")}` : "시즌·hype 산식을 소스에서 뽑았다");

const GAMES = seasonMissing.length ? 12
  : new Function(`${seasonSrc.cbPerYear} ${seasonSrc.weeksPerCb} return CB_PER_YEAR * WEEKS_PER_CB;`)();
const hypeFn = seasonMissing.length ? null : new Function("S", "act", "clamp", "posAxis", "leagueOf", "AXIS_K", "AXIS_OFF",
  `${seasonSrc.ageConst}\n${seasonSrc.agePen}\n${seasonSrc.hype}\nreturn hype;`);
const clamp = get("clamp");
const matchContribution = get("matchContribution");
const autoRes = get("autoRes");
const POS_INFO = get("POS_INFO");
const POS = ["fw", "wg", "mf", "df"];

function seasonHype(pos, stat, league) {
  const st = {
    name: "나", pos, league, clubStr: 70, condition: 80, fandom: 900, proYear: 5, trans: {},
    stats: { shoot: stat, pass: stat, dribble: stat, defense: stat, stamina: stat },
    talents: { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 },
    career: { years: [] },
  };
  set("S", st);
  const act = { goals: 0, assists: 0, defense: 0, apps: 0 };
  for (let i = 0; i < GAMES; i++) {
    const rating = T.ratingOf(st.stats, st.pos, st.condition, st.fandom);
    const c = matchContribution(rating);
    act.goals += c.g; act.assists += c.a; act.defense += c.def; act.apps += 1;
    if (autoRes(st.stats[POS_INFO[pos].stat]) === "perfect") act.goals += 1;
  }
  return hypeFn(st, act, clamp, T.posAxis, T.leagueOf, T.AXIS_K, T.AXIS_OFF);
}

const N = Number(process.env.PROMOTE_N || 120);
const STATS = [40, 50, 60, 70, 80, 90, 100, 110, 120, 130];
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const needAbility = {};   // 리그 id → 그 리그에서 '한 칸 위 문턱'을 중앙값으로 내는 능력치

console.log(`=== ② 문턱을 능력치로 환산 (리그마다 능력치 ${STATS[0]}~${STATS[STATS.length - 1]} · 칸당 포지션 4종 × ${N}시즌) ===`);
guard("문턱의 능력치 환산", () => {
  if (seasonMissing.length) throw new Error("산식을 못 뽑아서 실측할 수 없어요");
  const curve = {};
  for (const lg of BY_TIER) {
    curve[lg.id] = STATS.map((stat) => {
      const hs = [];
      for (const pos of POS) for (let i = 0; i < N; i++) hs.push(seasonHype(pos, stat, lg.id));
      return median(hs);
    });
    console.log(`  ${lg.name.padEnd(7)} 중앙 hype: ${curve[lg.id].map((v, i) => `${STATS[i]}→${v.toFixed(2)}`).join(" ")}`);
  }
  // 중앙 hype 곡선에서 문턱을 넘는 능력치를 선형 보간으로 찾는다
  const crossAt = (id, target) => {
    const ys = curve[id];
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] >= target && ys[i - 1] < target) {
        const t = (target - ys[i - 1]) / (ys[i] - ys[i - 1]);
        return STATS[i - 1] + t * (STATS[i] - STATS[i - 1]);
      }
    }
    return ys[0] >= target ? STATS[0] : Infinity;
  };
  console.log("  리그         | 한 칸 위      | 문턱 | 필요 능력치");
  const rungs = [];
  for (const lg of BY_TIER) {
    const up = BY_TIER.find((x) => x.tier === lg.tier + 1);
    if (!up) continue;
    const a = crossAt(lg.id, PROMOTE_HYPE[up.id]);
    needAbility[lg.id] = a;
    rungs.push({ from: lg, to: up, need: PROMOTE_HYPE[up.id], ability: a });
    console.log(`  ${lg.name.padEnd(11)} | ${up.name.padEnd(12)} | ${String(PROMOTE_HYPE[up.id]).padStart(4)} | ${a === Infinity ? "닿지 않음" : a.toFixed(0)}`);
  }
  check(rungs.every((r) => isFinite(r.ability)),
    `사다리 모든 칸이 능력치 ${STATS[STATS.length - 1]} 안에서 열린다 (막힌 칸 ${rungs.filter((r) => !isFinite(r.ability)).map((r) => r.from.name).join(", ") || "없음"})`);
  /* 뒤집히지만 않으면 된다 — 동률은 허용한다.
   * 리그가 5개에서 11개로 늘면서 열 칸이 능력치 51~77 사이에 들어갔고, 눈금이 정수라
   * 옆칸끼리 같은 값이 나오는 게 정상이다. 지켜야 하는 건 "아래 칸이 더 어렵지 않다"이지
   * "칸마다 반드시 1 이상 벌어진다"가 아니다. 후자를 강요하면 나라를 더할 때마다
   * 사다리를 억지로 늘려야 하고, 그게 곧 문턱 폭주다.
   * 전체가 실제로 오르는지는 아래 '양 끝' 검사가 따로 본다. */
  /* 필요 능력치는 몬테카를로로 재는 값이라 옆칸끼리 ±1쯤은 그냥 흔들린다.
   * 그 흔들림까지 잡으면 돌릴 때마다 빨간불이 뜬다 — 실제로 화면에는
   * 73 ≤ 73으로 보이는데 소수점에서 뒤집혀 실패한 적이 있다.
   * 여기서 잡아야 하는 건 "사다리가 거꾸로 서 있다"이지 측정 노이즈가 아니다. */
  const NOISE = 1;
  check(rungs.every((r, i) => i === 0 || rungs[i - 1].ability <= r.ability + NOISE),
    `위로 갈수록 필요 능력치가 안 줄어든다 (${rungs.map((r) => `${r.from.name} ${r.ability.toFixed(1)}`).join(" ≤ ")})`);
  check(rungs[rungs.length - 1].ability - rungs[0].ability >= 20,
    `사다리 전체로는 확실히 벌어진다 (${rungs[0].ability.toFixed(0)} → ${rungs[rungs.length - 1].ability.toFixed(0)})`);
  // 하부 두 칸은 K리그1 → 유로파보다 확실히 쉬워야 한다
  const k1Need = needAbility[K1.id];
  check(needAbility[K3.id] < k1Need && needAbility[K2.id] < k1Need,
    `하부에서 위로 가는 게 ${K1.name}→${EUR.name}(능력치 ${k1Need.toFixed(0)})보다 쉽다 `
    + `(${K3.name} ${needAbility[K3.id].toFixed(0)} · ${K2.name} ${needAbility[K2.id].toFixed(0)})`);
});

// ---------- 시즌을 실제로 굴려 프로 상태를 만든다 ----------
const restBtn = () => Array.from(w.document.querySelectorAll("#pro-actions .action-btn"))
  .find((b) => b.dataset.key === "__rest" && !b.disabled);
function playSeason() {
  let g = 0;
  while (g++ < 800) {
    const id = active();
    if (id === "screen-career") return true;
    if (id === "screen-stage") {
      /* 🏆 컵에서 비기면 승부차기가 뜨고 그동안 '다음' 버튼이 잠겨요.
       * 팀 결과를 전력 대 전력으로 바꾼 뒤 무승부가 흔해져서 여기 자주 걸립니다 —
       * 예전에는 운 좋게 안 걸렸을 뿐이에요. 키커 버튼을 눌러 진행시켜요. */
      const pkBtn = w.document.querySelector("#pk-box button");
      if (pkBtn) { pkBtn.click(); continue; }
      const n = $("btn-stage-next");
      if (!n || n.hidden || n.disabled) return false;
      n.click(); continue;
    }
    if (id !== "screen-pro") return false;
    const go = w.document.querySelector("#pro-actions .go-game");
    if (go) { go.click(); continue; }
    const r = restBtn();
    if (!r) return false;
    r.click();
  }
  return false;
}
const nextBtn = () => Array.from(w.document.querySelectorAll("#career-actions .btn"))
  .find((b) => b.textContent.includes("시즌 시작"));

guard("프로 진입", () => {
  set("S", get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  check(active() === "screen-pro", `데뷔하면 프로 준비 화면으로 간다 (${active()})`);
  check(playSeason(), `1시즌을 버튼 클릭만으로 소화한다 (${active()})`);
  nextBtn().click();
  check(playSeason(), `2시즌도 소화한다 (${active()})`);
  check(T.state().proYear === 2 && !!$("btn-transfer"), "2년차 결산에 이적 버튼이 있다");
});

// ---------- 이적 화면 헬퍼 ----------
const cards = () => Array.from(w.document.querySelectorAll("#screen-transfer .tf-card"));
const cardsOf = (lg) => cards().filter((c) => Number(c.dataset.league) === lg.id);
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
const at = (lg, hype, extra = {}) => openTransfer({
  league: lg.id, group: CLUBS[lg.id][0].name, clubStr: CLUBS[lg.id][0].str,
  proYear: 5, moves: [], hype, ...extra,
});

// ---------- ③ K리그3에서 문턱을 넘으면 K리그2 제안이 온다 ----------
console.log("=== ③ 아래에서 위로 — K리그3 → K리그2 ===");
guard("K리그3 승격", () => {
  const need = PROMOTE_HYPE[K2.id];
  const below = at(K3, need - 0.1);
  check(!!below, `${K3.name}에서도 이적 화면이 열린다`);
  check(!!below && cardsOf(K2).length === 0,
    `직전 시즌 평가가 ${need} 미만이면 ${K2.name} 제안이 안 온다 (${below ? cardsOf(K2).length : 0}장)`);
  check(!!below && cardsOf(K3).length === OFFERS_PER_LEAGUE,
    `그래도 같은 리그 이적은 열려 있다 (${below ? cardsOf(K3).length : 0}장)`);

  const on = at(K3, need);
  check(!!on && cardsOf(K2).length === OFFERS_PER_LEAGUE,
    `평가가 ${need} 이상이면 ${K2.name} 제안이 ${OFFERS_PER_LEAGUE}장 온다 (${on ? cardsOf(K2).length : 0}장)`);
  check(!!on && cardsOf(K1).length === 0,
    `${need}으로는 ${K1.name}까지 건너뛰지는 못한다 (${on ? cardsOf(K1).length : 0}장)`);

  // 실제로 눌러서 올라간다 — 카드가 그려지기만 하고 안 먹으면 사다리가 아니다
  const card = (on || []).find((el) => Number(el.dataset.league) === K2.id);
  check(!!card, `${K2.name} 카드가 있다`);
  if (card) {
    const wantClub = card.dataset.club;
    card.click();
    const St = T.state();
    check(St.league === K2.id && St.group === wantClub,
      `카드를 누르면 ${K2.name} 소속이 된다 (${St.group} · ${leagueById(St.league).name})`);
    check(St.clubStr === clubByName(wantClub).str, `클럽 전력도 새 클럽 값이다 (${St.clubStr})`);
  }
});

// ---------- ④ K리그2에서도 한 칸 위가 열린다 ----------
guard("K리그2 승격", () => {
  const need = PROMOTE_HYPE[K1.id];
  const below = at(K2, need - 0.1);
  check(!!below && cardsOf(K1).length === 0,
    `${K2.name}에서 평가가 ${need} 미만이면 ${K1.name} 제안이 안 온다 (${below ? cardsOf(K1).length : 0}장)`);
  const on = at(K2, need);
  check(!!on && cardsOf(K1).length === OFFERS_PER_LEAGUE,
    `평가가 ${need} 이상이면 ${K1.name} 제안이 온다 (${on ? cardsOf(K1).length : 0}장)`);
});

// ---------- ⑤ 내려가는 이적은 문턱 없이 언제든 ----------
console.log("=== ⑤ 내려가는 길 ===");
guard("하향 이적", () => {
  const down = at(K1, -1.5);
  check(!!down, `${K1.name}에서 평가가 바닥이어도 이적 화면이 열린다`);
  check(!!down && cardsOf(K3).length === OFFERS_PER_LEAGUE && cardsOf(K2).length === OFFERS_PER_LEAGUE,
    `${K1.name}에서 ${K3.name}·${K2.name} 제안이 문턱 없이 온다 `
    + `(${K3.name} ${down ? cardsOf(K3).length : 0}장 · ${K2.name} ${down ? cardsOf(K2).length : 0}장)`);
  check(!!down && cardsOf(EUR).length === 0 && cardsOf(UCL).length === 0,
    `대신 위로는 한 장도 안 온다 (${EUR.name} ${down ? cardsOf(EUR).length : 0}장 · ${UCL.name} ${down ? cardsOf(UCL).length : 0}장)`);

  const top = at(UCL, -1.5);
  check(!!top && BY_TIER.filter((l) => l.tier < UCL.tier).every((l) => cardsOf(l).length === OFFERS_PER_LEAGUE),
    `${UCL.name}에서는 평가가 바닥이어도 아래 네 리그 제안이 모두 온다 `
    + `(${BY_TIER.map((l) => `${l.name} ${top ? cardsOf(l).length : 0}`).join(" · ")})`);
});

// ---------- ⑥ 유로파에서는 성적이 바닥이어도 국내로 안 내려온다 ----------
/* 사다리가 둘이고 **서로 안 이어진다.** 국내(K리그3→K리그2→K리그1)와
 * 유럽(유로파→챔스)이 따로 돌고, 두 무대를 오가는 건 이적 사다리뿐이다.
 * 유로파는 유럽 사다리의 맨 아래라 갈 데가 없어 강등이 안 일어난다.
 * (챔스 최하위 → 유로파 강등은 있다 — euro-promo-test.js가 본다)
 *
 * 개인 이적 사다리(PROMOTE_HYPE)에 강등이 없다는 것도 여전히 참이고 ⑤에서 본다.
 * 여기서 보는 건 팀 승강제다 — 다른 축이다.
 *
 * 훈련은 한 번도 안 하고 휴식만 눌러서(playSeason) 능력치를 그대로 둔 채 굴린다 —
 * 유로파리그의 평점 -1.6을 능력치 30대로 맞으니 성적은 바닥을 친다. */
console.log("=== ⑥ 유로파는 바닥이어도 국내로 안 내려온다 ===");
guard("사다리 분리", () => {
  set("S", get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const St = T.state();
  St.league = EUR.id;
  /* ⚠️ 그 리그의 **최약체** 클럽에 넣어요. 팀 성적이 내 활약에서 갈라진 뒤로는
   * 강한 클럽에 넣으면 내가 아무것도 안 해도 팀이 우승해서 승격해 버립니다 —
   * 여기서 보려는 건 "부진한 시즌에도 국내로 안 내려온다"예요. */
  const weakest = CLUBS[EUR.id].slice().sort((a, b) => a.str - b.str)[0];
  St.group = weakest.name;
  St.clubStr = weakest.str;
  const SEASONS = 5;
  const seen = [];
  let hypes = [];
  for (let i = 0; i < SEASONS; i++) {
    if (!playSeason()) throw new Error(`${i + 1}번째 시즌을 못 굴렸어요 (${active()})`);
    const S2 = T.state();
    seen.push(S2.league);
    hypes.push((S2.career.years[S2.career.years.length - 1] || {}).hype);
    const nb = nextBtn();
    if (!nb) break;
    nb.click();
  }
  console.log(`  ${SEASONS}시즌 성적(hype): ${hypes.join(" · ")} — 소속 리그: ${[...new Set(seen)].map((id) => leagueById(id).name).join(", ")}`);
  check(seen.length === SEASONS && seen.every((id) => id === EUR.id),
    `성적이 바닥이어도 ${SEASONS}시즌 내내 ${EUR.name} 소속 그대로다 (리그 ${[...new Set(seen)].map((id) => leagueById(id).name).join(", ")})`);
  check(seen.every((id) => ![K3.id, K2.id, K1.id].includes(id)),
    `국내 리그로 넘어가는 일이 없다 — 두 사다리는 안 이어진다 (${[...new Set(seen)].map((id) => leagueById(id).name).join(", ")})`);
  check(hypes.every((h) => h != null && h < PROMOTE_HYPE[UCL.id]),
    `그 시즌들이 실제로 부진했다 — 위 리그 문턱 근처에도 못 갔다 (최고 ${Math.max(...hypes)} < ${PROMOTE_HYPE[UCL.id]})`);
});

// ---------- ⑦ 카드가 리그를 말한다 ----------
console.log("=== ⑦ 이적 화면 표시 ===");
guard("카드 표시", () => {
  // 꼭대기 문턱을 넣으면 위아래가 전부 열려서 5개 리그 카드를 한 화면에서 볼 수 있다
  const list = at(K1, PROMOTE_HYPE[UCL.id]);
  const offering = BY_TIER.filter((l) => (CLUBS[l.id] || []).length);
  check(!!list && list.length === OFFERS_PER_LEAGUE * offering.length,
    `리그 ${offering.length}개 제안이 모두 있다 (${list ? list.length : 0}장 / 기대 ${OFFERS_PER_LEAGUE * offering.length}장)`);
  let badName = 0, badPen = 0, badPre = 0, badTier = 0, badLow = 0;
  for (const el of list || []) {
    const lg = leagueById(Number(el.dataset.league));
    const txt = el.textContent.replace(/\s+/g, " ");
    if (!txt.includes(lg.name)) badName++;
    if (Number(el.dataset.tier) !== lg.tier) badTier++;
    if (lg.penalty > 0 && !txt.includes(`-${lg.penalty.toFixed(1)}`)) badPen++;
    if (!txt.includes(`×${lg.prestige.toFixed(2)}`)) badPre++;
    // 하부 리그 카드는 페널티가 0이다 — 대신 '값어치가 작다'는 게 보여야 한다
    if (lg.prestige < 1 && !/값어치가 (작|적)/.test(txt)) badLow++;
  }
  check(badName === 0, `모든 카드에 리그 이름이 적혀 있다 (빠진 카드 ${badName}장)`);
  check(badTier === 0, `모든 카드에 data-tier가 그 리그의 tier로 붙는다 (어긋난 카드 ${badTier}장)`);
  check(badPen === 0,
    `상위 리그 카드에 평점 페널티가 숫자로 있다 (${BY_TIER.filter((l) => l.penalty > 0).map((l) => `-${l.penalty.toFixed(1)}`).join(" · ")} · 빠진 카드 ${badPen}장)`);
  check(badPre === 0,
    `모든 카드에 수상 가치가 숫자로 있다 (${BY_TIER.map((l) => `×${l.prestige.toFixed(2)}`).join(" · ")} · 빠진 카드 ${badPre}장)`);
  check(badLow === 0,
    `하부 리그 카드에는 페널티 대신 '수상 가치가 낮다'가 말로도 적혀 있다 `
    + `(${BY_TIER.filter((l) => l.prestige < 1).map((l) => l.name).join(" · ")} · 빠진 카드 ${badLow}장)`);
  // 묶음이 tier 순으로 그려진다 — 화면이 곧 사다리여야 위아래가 읽힌다
  const tiers = Array.from(w.document.querySelectorAll("#transfer-list .tf-group")).map((g) => Number(g.dataset.tier));
  check(tiers.length === offering.length && tiers.every((t, i) => i === 0 || tiers[i - 1] < t),
    `리그 묶음이 tier 순으로 늘어선다 (${tiers.join(" < ")})`);
});

// ---------- ⑧ 계약금 하향 판정이 tier를 본다 ----------
/* id로 재면 K리그1(id 1) → K리그3(id 5)이 drop 0이라 계약금이 한 푼도 안 깎인다.
 * 같은 K리그3 클럽을 놓고 출발 리그만 바꿔서 낙폭이 tier 차이만큼 붙는지 본다. */
console.log("=== ⑧ 계약금은 tier로 깎인다 ===");
guard("하향 계약금", () => {
  const dest = CLUBS[K3.id][0];
  const feeFrom = (lg) => {
    for (let i = 0; i < 300; i++) {
      const list = at(lg, PROMOTE_HYPE[UCL.id], { group: CLUBS[lg.id][5].name, clubStr: CLUBS[lg.id][5].str });
      const hit = (list || []).find((el) => el.dataset.club === dest.name);
      if (hit) return Number(hit.dataset.fee);
    }
    throw new Error(`${lg.name}에서 ${dest.name} 카드를 못 만났어요`);
  };
  const same = feeFrom(K3), one = feeFrom(K2), two = feeFrom(K1);
  console.log(`  ${dest.name}(${K3.name}) 계약금 — ${K3.name}에서 ${same} · ${K2.name}에서 ${one} · ${K1.name}에서 ${two}`);
  check(one < same, `한 칸 위에서 내려오면 계약금이 줄어든다 (${one} < ${same})`);
  check(two < one, `두 칸 위(${K1.name})에서 내려오면 더 줄어든다 (${two} < ${one})`);
  /* 계약금은 10만 단위로 끊어 적으니 비율로 재면 반올림이 오차를 키운다.
   * (하부 리그 계약금은 100만대라 10만이 곧 8%다) 그래서 한 칸(10만) 안인지로 본다.
   * id로 재는 옛 코드에서는 K리그1 → K리그3이 낙폭 0이라 두 값이 그대로 same이 된다. */
  const UNIT = 10;
  check(Math.abs(one - same * DOWNGRADE_FEE) <= UNIT,
    `한 칸 낙폭이 DOWNGRADE_FEE(${DOWNGRADE_FEE})다 (기대 ${(same * DOWNGRADE_FEE).toFixed(0)} · 실측 ${one})`);
  check(Math.abs(two - same * DOWNGRADE_FEE * DOWNGRADE_FEE) <= UNIT,
    `두 칸 낙폭이 DOWNGRADE_FEE²(${(DOWNGRADE_FEE * DOWNGRADE_FEE).toFixed(3)})다 `
    + `(기대 ${(same * DOWNGRADE_FEE * DOWNGRADE_FEE).toFixed(0)} · 실측 ${two})`);
});

// ---------- ⑨ 👑 유럽 빅클럽 입단은 유로파리그에서 시작한다 ----------
/* 유스 최상위 엔딩인데 K리그1에서 출발하면 🌟 프로 계약 성공과 첫 시즌이 똑같다.
 * 엔딩 분기(showEnding)를 그대로 태워서 확인한다 — 조건을 테스트에서 다시 계산하지 않는다. */
console.log("=== ⑨ 👑 유럽 빅클럽 입단의 시작 리그 ===");
guard("👑 시작 리그", () => {
  const showEnding = get("showEnding");
  check(typeof showEnding === "function", "game.js의 엔딩 분기(showEnding)를 페이지에서 잡았다");
  const debutPool = (id) => (CLUBS[id] || []).slice().sort((a, b) => a.str - b.str).slice(0, 3).map((c) => c.name);

  const runEnding = (fandom, stat) => {
    set("S", get('newState(MARKETS[0], "fw", "테스트")'));
    const St = get("S");
    for (const k of Object.keys(St.stats)) St.stats[k] = stat;
    St.fandom = fandom;
    showEnding(true, 4);                     // 최종 라운드까지 살아남은 경우
    return $("ending-card").textContent.replace(/\s+/g, " ");
  };

  const crown = runEnding(400, 95);          // score = 400 + 95*2 = 590 ≥ 520
  check(/유럽 빅클럽 입단/.test(crown), `점수가 높으면 👑 유럽 빅클럽 입단이 뜬다 (${crown.slice(0, 40)})`);
  check(crown.includes(EUR.name), `엔딩 카드가 ${EUR.name}을 말한다 (${crown.slice(0, 90)})`);
  check(!!$("btn-go-debut"), "👑에도 '⚽ 프로 커리어 시작!' 버튼이 있다");
  $("btn-go-debut").click();
  const St1 = T.state();
  check(St1.league === EUR.id, `👑는 ${EUR.name}에서 프로를 시작한다 (${leagueById(St1.league).name})`);
  check(debutPool(EUR.id).includes(St1.group),
    `데뷔 클럽이 ${EUR.name} 하위 3개에서 나온다 (${St1.group} / ${debutPool(EUR.id).join("·")})`);
  check(St1.center === true, "👑는 주장으로 시작한다 (기존 규칙 그대로)");

  const normal = runEnding(0, 80);           // score = 160 < 520
  check(/프로 계약 성공/.test(normal), `점수가 그 아래면 🌟 프로 계약 성공이다 (${normal.slice(0, 40)})`);
  $("btn-go-debut").click();
  check(T.state().league === K1.id, `🌟는 여전히 ${K1.name}에서 시작한다 (${leagueById(T.state().league).name})`);
});

// ---------- ⑩ 배선 — 엔딩 호출부가 조건을 다시 계산하지 않는다 ----------
{
  const hook = grab(GAME, /window\.WingerCareer\.onEnding\([\s\S]*?\);/);
  check(!!hook, "game.js에서 onEnding 호출부를 뽑았다");
  check(!!hook && !/score\s*>=\s*520|score\s*>=\s*330/.test(hook),
    "호출부가 엔딩 점수 조건을 다시 계산하지 않는다 (분기가 세운 플래그를 그대로 넘긴다)");
  check(!!hook && /startLeague/.test(hook), "호출부가 startLeague를 넘긴다");
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
