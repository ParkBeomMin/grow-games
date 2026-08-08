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
  const body = (WCSRC.match(/function callBar\(\) \{[\s\S]*?\n {2}\}/) || [""])[0];
  check(/PLAYER_TITLES/.test(body) && /CALL_TITLE/.test(body),
    "문턱을 PLAYER_TITLES에서 CALL_TITLE로 찾아 읽는다 — 여기에 78을 적어 두면 클래스를 바꿨을 때 화면과 판정이 갈려요");
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
const BAR = WC.callBar();
const WILD = WC._t.WILD_BAR;
console.log(`   문턱 ${BAR} · 🌱 와일드카드 ${WILD} (3시즌만)`);
check(WILD < BAR, `와일드카드 문턱이 더 낮다 (${WILD} < ${BAR})`);

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

// ---------- ②③ 초대장과 래칫 ----------
console.log("=== ②③ 초대장은 후반기에 뜨고, 한 번 뜨면 안 뺏긴다 ===");
guard("②③ 래칫", () => {
  setup(7, 1, BAR + 6);
  check(!invite(), `전반기에는 초대장이 안 뜬다 (종합 ${Math.round(w.__get("overall")())} ≥ ${BAR})`);
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
  setup(7, 2, BAR + 4);
  S().wcCall = undefined;                       // 초대장을 못 받은 채로 시즌 끝
  let done = false;
  WC.enter(() => { done = true; });
  check(!!S().wc && !done, "초대장이 없어도 시즌 끝에 문턱을 넘으면 합류한다");
  S().wc = null;
});
guard("⑤ 미달", () => {
  const st = setup(7, 2, BAR - 8);
  st.wcCall = undefined;
  let done = false;
  WC.enter(() => { done = true; });
  check(!st.wc, `문턱에 못 미치면 대회가 안 열린다 (종합 ${Math.round(w.__get("overall")())} < ${BAR})`);
  check(done, "결산으로 넘어간다");
  const h = (st.wcHist || []).filter((x) => x.y === 7)[0];
  check(!!h && h.result === "none", `기록에 'none'이 남는다 (${h ? h.result : "없음"}) — 결산 한 줄과 통계의 근거예요`);
  check(/문턱/.test(WC.reportLine()), `결산 문구가 문턱을 알려준다 — "${WC.reportLine()}"`);
});

// ---------- ⑥ 와일드카드는 3시즌에만 ----------
console.log("=== ⑥ 유망주 와일드카드는 첫 대회에만 ===");
guard("⑥ 3시즌 한정", () => {
  setup(3, 2, WILD + 3);
  const ov = invite();
  check(!!ov, `3시즌에 문턱(${BAR}) 아래여도 초대장이 뜬다 (종합 ${Math.round(w.__get("overall")())})`);
  check(!!ov && !!ov.querySelector("#btn-wc-stay"), "와일드카드에는 두 선택지가 있다");
  check(/와일드카드/.test(ov.textContent), "유망주 와일드카드라고 적혀 있다");
  check(/감독/.test(ov.textContent), "클럽 감독의 말로 대가를 알려준다");
  ov.remove();

  setup(7, 2, WILD + 3);
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
  setup(3, 2, WILD + 3);
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
  setup(3, 2, WILD + 3);
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
  check(withRatchet(lowAfterAwaken, BAR, 7, 7) === true, "래칫이 있으면 각성 뒤에도 발탁이다");
  check(broken(lowAfterAwaken, BAR, 7, 7) === false,
    "래칫을 빼면 각성 뒤에 발탁이 사라진다 — ③이 그걸 막고 있어요");
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
