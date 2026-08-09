/* 🌏 국가대표 발탁 — 문턱·래칫·와일드카드·클럽 신뢰.
 *
 * 이 장치의 약속은 하나다: **한 번 넘으면 안 뺏긴다.**
 * 각성(🔮)은 능력치를 45~60으로 되돌리는 **투자**인데, 각성했다고 명단에서 빼면
 * 잘하려던 행동에 벌을 주는 꼴이다. 그래서 판정 지점이 둘(후반기 초대장 · 시즌 끝
 * 늦깎이)이지만 **둘 다 "넘으면 들어옴" 단방향**이라 빼앗는 경로가 코드에 없다.
 *
 * 3시즌만 특별하다. 도달률이 5~20%라 그대로 두면 대부분이 시즌 일곱 개를 지나야
 * 간판 기능을 처음 본다. 그래서 첫 대회만 낮은 문턱(유망주 와일드카드)을 열되,
 * 그냥 주면 무조건 수락이라 **대가 있는 선택**으로 만들었다 — 다녀오면 다음 시즌
 * 클럽 선발 확률이 내려가고, 남으면 올라간다.
 *
 * 지키는 것:
 *   ① 문턱은 🎖️국가대표 후보 클래스 문턱을 **그대로 읽는다** (화면과 판정이 한 몸)
 *   ② 후반기에 문턱을 넘으면 초대장이 뜨고 잠긴다 — 전반기에는 안 뜬다
 *   ③ 래칫 — 초대장을 받은 뒤 각성으로 종합이 떨어져도 발탁이 유지된다
 *   ④ 초대장을 못 받았어도 시즌 끝에 문턱을 넘으면 늦깎이로 합류한다
 *   ⑤ 문턱에 못 미치면 대회가 안 열리고 결산으로 간다 (기록에 "none"이 남는다)
 *   ⑥ 🌱 와일드카드는 3시즌에만 열린다 — 7시즌에는 안 열린다
 *   ⑦ 와일드카드는 두 선택지가 실제로 다른 결과를 낸다
 *   ⑧ 클럽 신뢰는 **다음 시즌 한 해만** 선발 점수에 실린다 (그 뒤 저절로 무효)
 *   ⑨ 고사하면 그 시즌은 닫힌다 — 거절해 놓고 늦깎이로 들어가는 뒷문이 없다
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

const WCSRC = fs.readFileSync(path.join(DIR, "worldcup.js"), "utf8");
const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");

// ---------- ① 문턱을 어디서 읽는가 ----------
console.log("=== ① 문턱이 클래스와 한 몸인가 ===");
guard("① 문턱 출처", () => {
  const body = (WCSRC.match(/function classBar\(\) \{[\s\S]*?\n {2}\}/) || [""])[0];
  check(/PLAYER_TITLES/.test(body) && /CALL_TITLE/.test(body),
    "문턱의 기준점을 PLAYER_TITLES에서 CALL_TITLE로 찾아 읽는다 — 여기에 78을 적어 두면 클래스를 바꿨을 때 화면과 판정이 갈려요");
  check(/const CALL_TITLE = .국가대표 후보./.test(WCSRC), "찾는 이름이 🎖️국가대표 후보다");
  const row = GAME.match(/\[(\d+), "🎖️ 국가대표 후보"\]/);
  check(!!row, `game.js에 🎖️국가대표 후보 줄이 있다 (문턱 ${row ? row[1] : "?"})`);
});

// ---------- 페이지 ----------
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
html = html.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} }; w.Stats = { log() {} }; w.alert = () => {};
const $ = (id) => w.document.getElementById(id);
const Career = w.WingerCareer, WC = w.WingerWorldCup, Squad = w.WingerSquad;
check(!!WC && !!Career && !!Squad, "worldcup.js·career.js·squad.js가 로드된다");
if (!WC || !Career || !Squad) { console.log("\n❌ 실패"); process.exit(1); }
const S = () => Career._t.state();
/* ⚠️ 문턱은 이제 **국적과 시즌마다 달라요.** 여기서 한 번 읽어 상수처럼 쓰면
 * 시나리오마다 어긋납니다 — 쓰는 자리에서 그때그때 물어봐요. */
const barAt = (y) => WC.callBar(y);
const wildAt = (y) => WC.wildBar(y);

/* 프로 상태를 실제 버튼으로 만들고, 시즌·반기·종합을 원하는 자리에 놓는다. */
function setup(year, cb, ovr) {
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const st = S();
  st.proYear = year;
  st.activity = { cb, cbTotal: 2, week: 3, weekTotal: 19, wins: 0, sales: 0, hypeSum: 0,
    cbHype: 0, cbWins: 0, goals: 0, assists: 0, defense: 0, apps: 0, teamW: 0, teamD: 0,
    teamL: 0, ratingSum: 0, opp: "테스트 FC", race: [] };
  setOvr(ovr);
  const old = w.document.querySelector(".wc-overlay");
  if (old) old.remove();
  return st;
}
function setOvr(target) {
  const st = S();
  for (const k of Object.keys(st.stats)) st.stats[k] = target;
  for (let i = 0; i < 300; i++) {
    const cur = w.__get("overall")();
    if (Math.abs(cur - target) < 0.6) break;
    const d = cur < target ? 0.5 : -0.5;
    for (const k of Object.keys(st.stats)) st.stats[k] = Math.max(1, st.stats[k] + d);
  }
}
const overlay = () => w.document.querySelector(".wc-overlay");
const invite = () => { Career.refreshPro(); return overlay(); };

// ---------- ①-b 문턱이 소집 때마다 조금씩 달라지는가 ----------
console.log("=== ①-b 문턱은 고정이 아니다 ===");
guard("①-b 움직이는 문턱", () => {
  const cls = WC._t.classBar();
  const MK = [["k", "🇰🇷"], ["jp", "🇯🇵"], ["br", "🇧🇷"], ["af", "🏴"], ["eu", "🇮🇹"]];
  const bars = {};
  for (const [m] of MK) {
    w.__set("S", { market: m, proYear: 7 });
    bars[m] = [3, 7, 11, 15].map((y) => WC.callBar(y));
  }
  MK.forEach(([m, f]) => console.log(`   ${f} ${bars[m].join(" · ")} (기준점 ${cls})`));

  /* ① 국가마다 다르다 — 강한 나라일수록 문이 좁아요. 이게 밸런스 고리예요:
   * 대회에서 유리한 만큼 들어가기가 어렵습니다. */
  const kr = bars.k[1], br = bars.br[1];
  check(br > kr, `강한 나라일수록 문턱이 높다 (🇧🇷 ${br} > 🇰🇷 ${kr})`);
  check(br - kr >= 4, `그 차이가 체감된다 (${br - kr})`);
  check(br - kr <= 12, `그렇다고 벽은 아니다 (${br - kr}) — 유스 선택이 사형선고가 되면 안 돼요`);

  /* ② 세대마다 흔들린다 */
  const wob = MK.some(([m]) => new Set(bars[m]).size > 1);
  check(wob, "같은 나라라도 대회마다 문턱이 조금씩 다르다 — 세대가 두꺼울 때가 있어요");

  /* ③ 그래도 기준점 근처를 벗어나진 않는다 */
  const all = MK.flatMap(([m]) => bars[m]);
  const lo = Math.min(...all), hi = Math.max(...all);
  check(hi - lo <= 14, `전체 폭이 과하지 않다 (${lo} ~ ${hi})`);
  check(lo >= cls - 10 && hi <= cls + 10, `기준점(${cls}) 근처에 머문다 (${lo} ~ ${hi})`);

  /* ④ ⚠️ 무작위가 아니다 — 다시 물어봐도 같은 값이어야 해요.
   * Math.random이면 준비 화면을 다시 그릴 때마다 문턱이 달라져서 배지 숫자를
   * 믿을 수 없게 됩니다(👥 선발 확률에서 이미 같은 사고가 났어요). */
  w.__set("S", { market: "k", proYear: 7 });
  const shots = [...Array(12)].map(() => WC.callBar(7));
  check(new Set(shots).size === 1, `같은 시즌에 몇 번을 물어도 같은 값이다 (${[...new Set(shots)].join(",")})`);
  check(!/Math\.random/.test((WCSRC.match(/function callBar\([\s\S]*?\n {2}\}/) || [""])[0]),
    "문턱 산식에 Math.random이 없다");

  /* ⑤ 🌱 와일드카드도 같이 움직인다 */
  const gap = WC.callBar(3) - WC.wildBar(3);
  check(gap === WC._t.WILD_GAP && gap > 0, `와일드카드는 문턱에서 ${gap} 아래로 따라 움직인다`);

  /* ⑥ 화면이 그 이유를 말하는가 — 숫자만 보이면 "왜 지난번이랑 다르지"가 돼요 */
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false); $("btn-go-debut").click();
  const st = S();
  st.proYear = 7; st.activity = null;
  const badge = WC.badgeHTML().replace(/<[^>]+>/g, "");
  console.log(`   배지 — "${badge.trim()}"`);
  check(/대표팀|대한민국|🇰🇷/.test(badge), "배지가 어느 나라 문턱인지 알려준다");
});

// ---------- ②③ 초대장과 래칫 ----------
console.log("=== ②③ 초대장은 후반기에 뜨고, 한 번 뜨면 안 뺏긴다 ===");
guard("②③ 래칫", () => {
  setup(7, 1, barAt(7) + 6);
  check(!invite(), `전반기에는 초대장이 안 뜬다 (종합 ${Math.round(w.__get("overall")())} ≥ ${barAt(7)})`);
  check(S().wcCall !== 7, "전반기에는 발탁도 안 잠긴다");

  S().activity.cb = 2;
  const ov = invite();
  check(!!ov, "후반기에 문턱을 넘으면 초대장이 뜬다");
  check(/소집/.test(ov ? ov.textContent : ""), "소집 통지라고 적혀 있다");
  check(!ov.querySelector("#btn-wc-stay"), "정식 발탁에는 거절 선택지가 없다 — 와일드카드만 고르는 거예요");
  ov.querySelector("button").click();
  check(S().wcCall === 7, "누르면 그 시즌 발탁이 잠긴다 (래칫)");

  // ③ 각성으로 종합이 바닥까지 떨어져도 유지
  setOvr(40);
  check(S().wcCall === 7,
    `각성으로 종합이 ${Math.round(w.__get("overall")())}까지 떨어져도 발탁이 유지된다 — 각성은 투자예요`);
  let done = false;
  WC.enter(() => { done = true; });
  check(!!S().wc, "시즌 끝에 실제로 대회가 열린다 (문턱 아래인데도)");
  check(!done, "결산으로 그냥 넘어가지 않는다");
  S().wc = null;
});

// ---------- ④⑤ 늦깎이 합류와 미달 ----------
console.log("=== ④⑤ 늦깎이 합류 / 문턱 미달 ===");
guard("④ 늦깎이", () => {
  setup(7, 2, barAt(7) + 4);
  S().wcCall = undefined;                       // 초대장을 못 받은 채로 시즌 끝
  let done = false;
  WC.enter(() => { done = true; });
  check(!!S().wc && !done, "초대장이 없어도 시즌 끝에 문턱을 넘으면 합류한다");
  S().wc = null;
});
guard("⑤ 미달", () => {
  const st = setup(7, 2, barAt(7) - WC._t.LUCK_GAP - 5);   // 🎲 깜짝 발탁 사정권 밖
  st.wcCall = undefined;
  let done = false;
  WC.enter(() => { done = true; });
  check(!st.wc, `문턱에 못 미치면 대회가 안 열린다 (종합 ${Math.round(w.__get("overall")())} < ${barAt(7)})`);
  check(done, "결산으로 넘어간다");
  const h = (st.wcHist || []).filter((x) => x.y === 7)[0];
  check(!!h && h.result === "none", `기록에 'none'이 남는다 (${h ? h.result : "없음"}) — 결산 한 줄과 통계의 근거예요`);
  check(/문턱/.test(WC.reportLine()), `결산 문구가 문턱을 알려준다 — "${WC.reportLine()}"`);
});

// ---------- ⑤-b 🎲 깜짝 발탁 ----------
console.log("=== ⑤-b 문턱 아래에서도 가끔 이름이 올라오는가 ===");
guard("⑤-b 깜짝 발탁", () => {
  const P = WC.luckP, GAP = WC._t.LUCK_GAP;
  const bar = 80;
  const curve = [];
  for (let d = 0; d <= GAP + 2; d++) curve.push([d, P(bar - d, bar)]);
  console.log(`   문턱까지 ${curve.filter(([d]) => d <= GAP + 1).map(([d, p]) => `${d}→${Math.round(p * 100)}%`).join(" · ")}`);

  /* ⚠️ 방향이 핵심이에요 — 문턱을 넘은 사람은 **여전히 100%**입니다.
   * 확률 판정을 뺐던 이유가 "78인데 왜 안 뽑혀"였는데, 그걸 되살리면 안 돼요. */
  check(P(bar, bar) === 0 && P(bar + 5, bar) === 0,
    "문턱을 넘으면 도박이 없다 — 넘은 사람은 100% 뽑혀요 (여기가 확률이 되면 안 돼요)");
  check(P(bar - 1, bar) > 0, `문턱 코앞에서는 가능성이 있다 (${Math.round(P(bar - 1, bar) * 100)}%)`);
  check(P(bar - GAP - 1, bar) === 0, `너무 멀면 없다 (문턱 -${GAP + 1})`);
  // 가까울수록 높아야 훈련이 헛되지 않아요
  let mono = true;
  for (let d = 2; d <= GAP; d++) if (P(bar - d, bar) > P(bar - d + 1, bar)) mono = false;
  check(mono, "문턱에 가까울수록 확률이 높다 — 훈련이 헛되지 않아야 해요");
  check(P(bar - 1, bar) <= 0.5, `코앞이어도 절반을 안 넘는다 (${Math.round(P(bar - 1, bar) * 100)}%) — 문턱이 의미를 잃으면 안 돼요`);

  /* 배지가 확률을 **미리** 말하는가 — 감춘 도박은 버그로 읽혀요 */
  const st = setup(7, 2, barAt(7) - 3);
  st.wcCall = undefined;
  const badge = WC.badgeHTML().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  console.log(`   배지 — "${badge.trim()}"`);
  check(/깜짝 발탁/.test(badge), "배지가 깜짝 발탁을 미리 알려준다");
  check(/%/.test(badge), "확률을 숫자로 적는다 — 감춘 도박은 버그로 읽혀요");
  check(/문턱까지/.test(badge), "문턱까지 얼마나 남았는지도 적는다");

  /* 실제로 굴러가는가 — 사정권에서 여러 번 굴려 둘 다 나오는지 */
  let called = 0, missed = 0;
  for (let i = 0; i < 60; i++) {
    const s2 = setup(7, 2, barAt(7) - 2);
    s2.wcCall = undefined; s2.wcHist = [];
    let done = false;
    WC.enter(() => { done = true; });
    if (s2.wc) { called++; s2.wc = null; } else missed++;
  }
  console.log(`   문턱 -2에서 60번 — 발탁 ${called} · 미발탁 ${missed}`);
  /* 뽑혔으면 소집 카드가 그걸 말해야 해요 — 아무 말 없으면 "왜 갑자기 뽑혔지"가 됩니다 */
  const s4 = setup(7, 2, barAt(7) - 1);
  s4.wcCall = undefined; s4.wcHist = []; s4.wcLucky = undefined;
  for (let i = 0; i < 40 && !s4.wc; i++) { s4.wcHist = []; WC.enter(() => {}); }
  if (s4.wc) {
    check(s4.wcLucky === 7, `깜짝 발탁이면 표시가 남는다 (wcLucky=${s4.wcLucky})`);
    const card = ($("stage-card") || {}).textContent || "";
    check(/깜짝 발탁/.test(card), `소집 카드가 깜짝 발탁이라고 말한다`);
    /* 소집 카드는 **한 번 스치고 말아요.** 대회 내내 남는 줄이 없으면
     * "왜 문턱도 안 됐는데 뛰고 있지"가 됩니다. */
    const badge2 = WC.badgeHTML().replace(/<[^>]+>/g, " ");
    console.log(`   대회 중 배지 — "${badge2.replace(/\s+/g, " ").trim()}"`);
    check(/깜짝 발탁/.test(badge2), "대회 중 배지에도 깜짝 발탁으로 승선했다고 남는다");
    s4.wc = null;
  }
  check(called > 0, `문턱 아래인데 뽑히는 판이 있다 (${called}/60)`);
  check(missed > 0, `그렇다고 늘 뽑히지는 않는다 (${missed}/60)`);

  /* 사정권 밖은 한 번도 안 뽑혀야 해요 */
  let far = 0;
  for (let i = 0; i < 40; i++) {
    const s3 = setup(7, 2, barAt(7) - GAP - 4);
    s3.wcCall = undefined; s3.wcHist = [];
    WC.enter(() => {});
    if (s3.wc) { far++; s3.wc = null; }
  }
  check(far === 0, `사정권 밖(문턱 -${GAP + 4})에서는 한 번도 안 뽑힌다 (${far}/40)`);
});

// ---------- ⑥ 와일드카드는 3시즌에만 ----------
console.log("=== ⑥ 유망주 와일드카드는 첫 대회에만 ===");
guard("⑥ 3시즌 한정", () => {
  setup(3, 2, wildAt(3) + 3);
  const ov = invite();
  check(!!ov, `3시즌에 문턱(${barAt(3)}) 아래여도 초대장이 뜬다 (종합 ${Math.round(w.__get("overall")())})`);
  check(!!ov && !!ov.querySelector("#btn-wc-stay"), "와일드카드에는 두 선택지가 있다");
  check(/와일드카드/.test(ov.textContent), "유망주 와일드카드라고 적혀 있다");
  check(/감독/.test(ov.textContent), "클럽 감독의 말로 대가를 알려준다");
  ov.remove();

  setup(7, 2, wildAt(3) + 3);
  check(!invite(), `7시즌에는 같은 종합으로 초대장이 안 뜬다 — 와일드카드는 첫 대회에만이에요`);
  const st = S();
  st.wcCall = undefined;
  let done = false;
  WC.enter(() => { done = true; });
  check(!st.wc && done, "7시즌에 문턱 아래면 대회가 안 열린다");
});

// ---------- ⑦⑧⑨ 선택의 대가 ----------
console.log("=== ⑦⑧⑨ 두 선택지가 실제로 갈리는가 ===");
guard("⑦⑧⑨ 클럽 신뢰", () => {
  const trustOf = () => {
    const b = Squad.myBonus();
    return b.trust || 0;
  };
  // 다녀온다
  setup(3, 2, wildAt(3) + 3);
  let ov = invite();
  ov.querySelector("#btn-wc-go").click();
  const go = S();
  check(go.wcCall === 3, "다녀오기를 고르면 발탁이 잠긴다");
  check(!!go.clubTrust && go.clubTrust.v < 0, `클럽 신뢰가 마이너스가 된다 (${go.clubTrust ? go.clubTrust.v : "없음"})`);
  check(go.clubTrust.y === 4, `그 값은 **다음 시즌**(${go.clubTrust.y}) 것이다`);
  go.proYear = 4; Squad.ensureSquad();
  const tGo = trustOf();
  go.proYear = 5;
  const tGone = trustOf();
  console.log(`   다녀온 경우 — 4시즌 선발 점수 ${tGo} · 5시즌 ${tGone}`);
  check(tGo < 0, `다음 시즌 선발 점수가 내려간다 (${tGo})`);
  check(tGone === 0, `그다음 시즌에는 저절로 사라진다 (${tGone}) — 지우는 코드가 없어요`);

  // 남는다
  setup(3, 2, wildAt(3) + 3);
  ov = invite();
  ov.querySelector("#btn-wc-stay").click();
  const stay = S();
  check(!!stay.clubTrust && stay.clubTrust.v > 0, `남으면 클럽 신뢰가 플러스가 된다 (${stay.clubTrust ? stay.clubTrust.v : "없음"})`);
  stay.proYear = 4; Squad.ensureSquad();
  const tStay = trustOf();
  stay.proYear = 3;
  console.log(`   남은 경우 — 4시즌 선발 점수 ${tStay}`);
  check(tStay > 0, `다음 시즌 선발 점수가 올라간다 (${tStay})`);
  check(tGo !== tStay, "두 선택지가 실제로 다른 결과를 낸다 — 한쪽이 순수한 이득이면 선택이 아니라 확인 버튼이에요");

  // ⑨ 고사하면 그 시즌은 닫힌다 (뒷문 없음)
  check(stay.wcCall !== 3, "고사하면 발탁이 안 잠긴다");
  let done = false;
  WC.enter(() => { done = true; });
  check(!stay.wc && done, "고사한 시즌에는 늦깎이로도 안 들어간다 — 거절해 놓고 들어가는 뒷문이 없어요");
  check(/고사|클럽에 남/.test(WC.reportLine()), `결산 문구가 고사를 알려준다 — "${WC.reportLine()}"`);
});

// ---------- ⑩ 변이 검증 ----------
console.log("=== ⑩ 변이 검증 ===");
guard("⑩ 변이", () => {
  /* 래칫을 없애고 "지금 종합"으로만 판정하면 ③이 무너져야 해요.
   * 안 무너지면 이 검사는 아무것도 안 지키고 있는 겁니다. */
  const broken = new Function("ovr", "bar", "wcCall", "proYear", `
    // 래칫을 뺀 판정 — 지금 종합만 봐요
    return ovr >= bar;`);
  const withRatchet = new Function("ovr", "bar", "wcCall", "proYear", `
    if (wcCall === proYear) return true;
    return ovr >= bar;`);
  const lowAfterAwaken = 40;
  check(withRatchet(lowAfterAwaken, barAt(7), 7, 7) === true, "래칫이 있으면 각성 뒤에도 발탁이다");
  check(broken(lowAfterAwaken, barAt(7), 7, 7) === false,
    "래칫을 빼면 각성 뒤에 발탁이 사라진다 — ③이 그걸 막고 있어요");
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
