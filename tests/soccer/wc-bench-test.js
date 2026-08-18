/* 🎖️ 대표팀 안에서의 선발 경쟁 (설계 D3 — 월드컵 3단계).
 *
 * 1·2단계는 **"발탁 = 전 경기 선발"**로 출고했다. 그래야 대회가 그것만으로
 * 완결되고, 4년에 한 번뿐인 첫 대회가 "벤치에서 세 경기 보고 왔다"가 되지 않는다.
 * 이제 대회가 자리를 잡았으니 클래스가 대표팀 안에서도 말을 한다.
 *
 *   🏅 국가대표 주전(92↑) — 전 경기 선발 확정. **클래스 이름이 곧 약속이다.**
 *   🎖️ 국가대표 후보(78~91) — 경기마다 굴린다. 토너먼트에서 가산.
 *
 * 지키는 것:
 *   ① 문턱을 클래스 표에서 읽는다 — 92를 적어 두면 화면의 🏅과 판정이 갈린다
 *   ② 확률 곡선 — 주전은 1, 후보는 위로 갈수록 높고, 토너먼트가 더 높다
 *   ③ 버튼이 그 확률을 **미리 적는다** (감춘 굴림은 버그로 읽힌다)
 *   ④ 실제로 굴린다 — 주전은 결장 0, 후보는 결장이 생긴다
 *   ⑤ 벤치 경기는 내 기록에 **안 쌓이는데** 대회는 나아간다
 *   ⑥ 벤치 경기에도 동료·상대·다른 나라 기록은 쌓인다 (여기가 멈추면 대회가 멈춘다)
 *   ⑦ 벤치에 성장 보상이 없다 — 5경기짜리 대회에서 주면 벤치가 이득이 된다
 *   ⑧ 변이 검증 — 늘 선발이면 ④가 무너진다
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const WCSRC = fs.readFileSync(path.join(DIR, "worldcup.js"), "utf8");
const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");

// ---------- ① 문턱의 출처 ----------
console.log("=== ① 문턱이 클래스와 한 몸인가 ===");
{
  const body = (WCSRC.match(/function starterBar\(\) \{[\s\S]*?\n {2}\}/) || [""])[0];
  check(/PLAYER_TITLES/.test(body) && /STARTER_TITLE/.test(body),
    "문턱을 PLAYER_TITLES에서 STARTER_TITLE로 찾아 읽는다 — 92를 적어 두면 화면의 🏅과 판정이 갈려요");
  const row = GAME.match(/\[(\d+), "🏅 국가대표 주전"\]/);
  check(!!row, `game.js에 🏅국가대표 주전 줄이 있다 (문턱 ${row ? row[1] : "?"})`);
}

// ---------- 페이지 ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  window.alert = () => {};
  localStorage.setItem("grow-auto-mini", "1");
`;
function boot() {
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
  const d = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
  const ww = d.window;
  ww.Ads = { display() {}, init() {} }; ww.Stats = { log() {} }; ww.alert = () => {};
  ww.HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({}, { get: () => () => ({ width: 40 }), set: () => true });
  };
  return d;
}
const dom = boot();
const w = dom.window;
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const Career = w.WingerCareer, WC = w.WingerWorldCup;
check(!!WC && !!Career, "worldcup.js·career.js가 페이지에서 로드된다");
if (!WC || !Career) { console.log("\n❌ 실패"); process.exit(1); }
const S = () => Career._t.state();
const T = WC._t;

// ---------- ② 확률 곡선 ----------
console.log("=== ② 확률 곡선 ===");
{
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  const st = S();
  const setOvr = (t) => { for (const k of w.__get("STAT_KEYS")) st.stats[k] = t; };
  const hi = T.starterBar(), lo = T.classBar();
  const at = (ovr, stage) => { setOvr(ovr); return WC.xiP(stage); };
  const rows = [lo, lo + 5, hi - 3, hi, hi + 20].map((o) =>
    `${o}→${Math.round(at(o, "group") * 100)}%/${Math.round(at(o, "semi") * 100)}%`);
  console.log(`   종합→조별/토너먼트  ${rows.join("  ")}  (후보 ${lo} · 주전 ${hi})`);

  check(at(hi, "group") === 1 && at(hi + 30, "group") === 1,
    `🏅 주전(${hi}↑)은 전 경기 선발 확정 — 클래스 이름이 약속이에요`);
  check(at(lo, "group") > 0 && at(lo, "group") < 1, `🎖️ 후보 문턱(${lo})은 굴림이다 (${Math.round(at(lo, "group") * 100)}%)`);
  let mono = true;
  for (let o = lo; o < hi; o++) if (at(o, "group") > at(o + 1, "group") + 1e-9) mono = false;
  check(mono, "후보 구간에서 종합이 오르면 확률도 오른다 — 훈련이 헛되면 안 돼요");
  check(at(lo + 5, "semi") > at(lo + 5, "group"),
    `토너먼트에서 확률이 오른다 (${Math.round(at(lo + 5, "group") * 100)}% → ${Math.round(at(lo + 5, "semi") * 100)}%) — 큰 경기에 기회가 와요`);
  check(at(lo - 15, "group") >= T.XI_FLOOR - 1e-9 && at(lo - 15, "group") > 0,
    `문턱 아래(🌱 와일드카드)도 바닥은 있다 (${Math.round(at(lo - 15, "group") * 100)}%) — 0이면 초대가 아니라 벌이에요`);
  /* ⚠️ 다시 물어봐도 같은 값이어야 해요 — 버튼에 적힌 숫자를 믿을 수 있어야 합니다 */
  setOvr(lo + 6);
  check(new Set([...Array(12)].map(() => WC.xiP("group"))).size === 1, "몇 번을 물어도 같은 확률이다 (버튼의 숫자를 믿을 수 있어요)");
  check(!/Math\.random/.test((WCSRC.match(/function xiP\([\s\S]*?\n {2}\}/) || [""])[0]), "확률 산식에 Math.random이 없다");
}

/* 대회 하나를 실제 버튼만 눌러 끝까지 몬다 — worldcup-test와 같은 방식이에요. */
function runTournament(year, ovr) {
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const st = S();
  st.proYear = year;
  for (const k of w.__get("STAT_KEYS")) st.stats[k] = ovr;
  Career.refreshPro();

  const seen = { played: 0, benched: 0, subs: [], goSubs: [], statSum: [], gone: false, runMax: 0 };
  let lastSig = "", same = 0;
  for (let i = 0; i < 900; i++) {
    const sig = `${active()}|${st.camp}|${st.wc ? st.wc.stage + st.wc.gIdx + st.wc.ready : "-"}`
      + `|${(($("btn-stage-next") || {}).textContent || "").slice(0, 14)}`;
    if (sig === lastSig) { if (++same > 30) break; } else { lastSig = sig; same = 0; }
    if (st.wc) {
      seen.played = st.wc.apps || 0; seen.benched = st.wc.benched || 0;
      seen.runMax = Math.max(seen.runMax, st.wc.benchRun || 0);   // 🪑 연속 결장의 최댓값
    }
    const inv = w.document.querySelector(".wc-overlay button");
    if (inv) { inv.click(); continue; }
    const id = active();
    if (id === "screen-career") { seen.gone = true; break; }
    if (id === "screen-stage") {
      const n = $("btn-stage-next");
      const pk = (!n || n.hidden) ? w.document.querySelector("#pk-box button") : null;
      if (pk) { pk.click(); continue; }
      if (!n || n.hidden || n.disabled) break;
      n.click(); continue;
    }
    if (id !== "screen-pro") break;
    /* ⚠️ 리그 경기도 같은 `.go-game`이에요 — 그것도 눌러야 시즌이 끝나고 대회가 열려요.
     * 월드컵 버튼만 찾으면 리그가 안 굴러서 **대회에 영영 도달 못 합니다.** */
    const go = w.document.querySelector("#pro-actions .go-game");
    if (go && !go.classList.contains("wc-go")) { go.click(); continue; }
    if (go) {
      seen.goSubs.push((go.querySelector(".a-sub") || {}).textContent || "");
      // 🪑 벤치 경기 전후로 능력치 합을 재요 — 성장 보상이 붙었는지 봅니다
      const before = w.__get("STAT_KEYS").reduce((a, k) => a + st.stats[k], 0);
      const appsB = (st.wc || {}).apps || 0;
      go.click();
      const after = w.__get("STAT_KEYS").reduce((a, k) => a + st.stats[k], 0);
      if (st.wc && (st.wc.apps || 0) === appsB) seen.statSum.push(after - before);   // 안 뛴 경기
      const card = w.document.querySelector(".wc-bench");
      if (card) seen.subs.push(card.textContent.replace(/\s+/g, " ").trim());
      continue;
    }
    const r = [...w.document.querySelectorAll("#pro-actions .action-btn")]
      .find((b) => b.dataset.key === "__rest" && !b.disabled);
    if (!r) break;
    r.click();
  }
  const h = (st.wcHist || []).filter((x) => x.y === year)[0] || null;
  return { seen, st, hist: h };
}

// ---------- ③ 버튼이 확률을 적는가 ----------
console.log("=== ③ 버튼이 확률을 미리 적는가 ===");
{
  const star = runTournament(7, T.starterBar() + 6);
  const cand = runTournament(7, T.classBar() + 3);
  const s1 = star.seen.goSubs[0] || "", s2 = cand.seen.goSubs[0] || "";
  console.log(`   🏅 주전  ${s1}`);
  console.log(`   🎖️ 후보  ${s2}`);
  check(/선발 확정/.test(s1), "주전에게는 '선발 확정'이라 적는다");
  check(/선발 확률 \d+%/.test(s2), "후보에게는 확률을 적는다 — 감춘 굴림은 버그로 읽혀요");
  const shown = Number((s2.match(/선발 확률 (\d+)%/) || [])[1]);
  check(Math.abs(shown - WC.xiPct("group")) <= 1,
    `적힌 숫자가 실제 확률과 같다 (화면 ${shown}% · 판정 ${WC.xiPct("group")}%)`);
}

// ---------- ④⑤⑥⑦ 실제로 굴리는가 ----------
console.log("=== ④⑤⑥⑦ 대회를 끝까지 몰아 보기 ===");
{
  const RUNS = 14;
  const tally = (ovr) => {
    let played = 0, benched = 0, done = 0, appsMismatch = 0, grew = 0, growth = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = runTournament(7, ovr);
      if (!r.hist) continue;
      done += 1;
      played += r.seen.played; benched += r.seen.benched;
      if (r.hist.apps !== r.seen.played) appsMismatch += 1;
      for (const d of r.seen.statSum) { if (d > 0.001) grew += 1; growth += d; }
    }
    return { played, benched, done, appsMismatch, grew, growth };
  };
  const star = tally(T.starterBar() + 6);
  const cand = tally(T.classBar() + 2);
  console.log(`   🏅 주전 — 대회 ${star.done}회 · 출전 ${star.played} · 🪑 결장 ${star.benched}`);
  console.log(`   🎖️ 후보 — 대회 ${cand.done}회 · 출전 ${cand.played} · 🪑 결장 ${cand.benched}`);

  check(star.done >= RUNS - 1 && cand.done >= RUNS - 1, `대회가 끝까지 굴러간다 (주전 ${star.done}/${RUNS} · 후보 ${cand.done}/${RUNS})`);
  check(star.benched === 0, `🏅 주전은 한 경기도 안 앉는다 (결장 ${star.benched})`);
  check(cand.benched > 0, `🎖️ 후보는 결장이 생긴다 (결장 ${cand.benched})`);
  check(cand.played > 0, `그래도 대부분은 뛴다 (출전 ${cand.played} · 결장 ${cand.benched})`);
  /* ⑤ 안 뛴 경기는 내 기록에 안 남아요 — 대회 기록의 출전 수가 그 증거예요 */
  check(cand.appsMismatch === 0 && star.appsMismatch === 0,
    `대회 기록의 출전 수가 실제로 뛴 경기 수와 같다 (어긋난 대회 ${cand.appsMismatch + star.appsMismatch})`);
  /* ⑦ 벤치에 성장 보상이 없다 */
  check(cand.grew === 0, `🪑 벤치 경기에 능력치 보상이 없다 (오른 경우 ${cand.grew} · 합 ${cand.growth.toFixed(2)})`);
}

// ---------- ⑥ 벤치 경기에도 대회는 굴러가는가 ----------
console.log("=== ⑥ 벤치 경기에도 남들은 뛰는가 ===");
{
  const r = runTournament(7, T.classBar() - 2);   // 결장이 잘 나오는 구간
  const card = r.seen.subs[0] || "";
  if (card) console.log(`   ${card.slice(0, 110)}`);
  check(r.seen.subs.length > 0 || r.seen.benched > 0, "벤치 카드가 실제로 뜬다");
  if (card) {
    check(/이번 경기는 벤치예요/.test(card), "벤치라고 적는다");
    check(/주전 확정은 \d+부터예요/.test(card), "왜 앉았는지 적는다 — 이유가 안 보이는 결장은 버그로 읽혀요");
    const sub = r.seen.subs.find((t) => /자리에 섰어요/.test(t));
    check(!!sub, "누가 내 자리에 섰는지 이름으로 적는다");
    check(/\d+ : \d+/.test(card), "나 없이 치른 스코어가 뜬다");
  }
  const h = r.hist;
  check(!!h, `벤치가 섞여도 대회가 기록으로 남는다 (${h ? h.result : "없음"})`);
}

// ---------- ⑨ 조사·연속 결장 ----------
console.log("=== ⑨ 계속 앉혀 두지는 않는가 ===");
{
  /* 받침을 보는가 — "임지훈가 섰어요"는 안 돼요. 소스에서 뽑아 굴려요. */
  const src = (WCSRC.match(/const ga = \(name\) => \{[\s\S]*?\n {4}\};/) || [""])[0];
  check(!!src, "조사 헬퍼를 소스에서 찾았다");
  if (src) {
    const ga = new Function(`${src} return ga;`)();
    const pairs = [["임지훈", "이"], ["김우진", "이"], ["이수아", "가"], ["최민서", "가"], ["다니 린드블롬", "이"]];
    const wrong = pairs.filter(([n, want]) => ga(n) !== want);
    check(wrong.length === 0, `받침에 따라 이/가를 고른다 (${pairs.map(([n]) => n + ga(n)).join(" · ")})`);
  }

  /* 🪑 두 경기 연속 결장이면 다음은 선발 — 다섯 경기를 통째로 앉아 있는 대회가 없어야 해요 */
  const MAX = WC._t.BENCH_RUN_MAX;
  let worst = 0, zero = 0, runs = 0, notCalled = 0;
  for (let i = 0; i < 12; i++) {
    const r = runTournament(7, T.classBar() + 1);
    /* ⚠️ `result: "none"`은 **대회에 못 간 시즌**이에요 — 문턱이 국가·세대마다
     * 흔들려서 종합이 문턱 근처면 아예 발탁이 안 됩니다. 그걸 "한 경기도 못 뛴
     * 대회"로 세면 이 검사가 딴 걸 재요. */
    if (!r.hist) continue;
    if (r.hist.result === "none") { notCalled += 1; continue; }
    runs += 1;
    worst = Math.max(worst, r.seen.runMax);
    if ((r.seen.played || 0) === 0) zero += 1;
  }
  console.log(`   대회 ${runs}회(미발탁 ${notCalled}회) — 가장 긴 연속 결장 ${worst} (상한 ${MAX}) · 한 경기도 못 뛴 대회 ${zero}회`);
  check(runs >= 4, `잴 만큼 대회가 열렸다 (${runs}회)`);
  check(worst <= MAX, `연속 결장이 ${MAX}을 안 넘는다 (실측 ${worst})`);
  check(zero === 0, `한 경기도 못 뛰고 끝나는 대회가 없다 (${zero}회) — 4년에 한 번인데 그건 초대가 아니라 벌이에요`);
}

// ---------- ⑧ 변이 검증 ----------
console.log("=== ⑧ 변이 검증 ===");
{
  const fn = (WCSRC.match(/function xiP\(stage\) \{[\s\S]*?\n {2}\}/) || [""])[0];
  check(!!fn, "xiP를 소스에서 찾았다");
  const broken = fn.replace(/if \(ovr >= hi\) return 1;/, "return 1;");
  check(broken !== fn, "변이 치환이 됐다");
  const run = new Function("clamp", "overall", "classBar", "starterBar",
    `const XI_LO = ${T.XI_LO}, XI_KNOCK = ${T.XI_KNOCK}, XI_FLOOR = ${T.XI_FLOOR};\n${broken}\nreturn xiP("group");`);
  const p = run((v, a, b) => Math.min(b, Math.max(a, v)), () => T.classBar() + 2, () => T.classBar(), () => T.starterBar());
  check(p === 1, "변이 — 늘 1을 돌려주면 후보도 전 경기 선발이 된다 (④의 '결장이 생긴다'가 그걸 잡아요)");
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
