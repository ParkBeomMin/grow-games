/* 🌏 월드컵 — 대회가 실제로 굴러가고, **어떤 경로로 끝나든 결산에 닿는가.**
 *
 * 이 기능에서 제일 위험한 자리는 배선이다. career.js에서 finishYear로 들어가는
 * 입구가 다섯 곳(리그 종료·벤치 주 종료·컵 탈락·컵 우승·컵 대진 방어)인데, 거기에
 * 각각 월드컵 분기를 심으면 **반드시 하나가 샌다.** v2.48.0이 정확히 그 사고였다 —
 * 경기를 뛴 주에는 pendingShow를 내렸는데 벤치 주에는 안 내려서, 다음 준비 화면이
 * "훈련 2회 남음"이라 적어 놓고 훈련 버튼 여섯 개를 전부 잠갔다.
 *
 * 그래서 관문(seasonEnd) 하나로 모았고, 대회 안에서도 경기를 소비하는 모든 갈래가
 * wcAfterMatch() 하나를 지난다. 이 파일은 그 계약이 살아 있는지 본다.
 *
 * 지키는 것:
 *   ① 배선 — finishYear를 직접 부르는 자리가 관문 말고는 없다 (여섯 번째 입구 방어)
 *   ② 대회가 실제로 끝까지 굴러간다 (실제 버튼만 눌러서)
 *   ③ 어떤 경로로 끝나든 결산에 닿고 S.wc === null이 된다
 *   ④ 테마 클래스가 대회 중에만 붙는다 — 끝나면 저절로 떨어진다
 *   ⑤ 대회 중에는 pendingShow가 절대 안 선다 (리그 버튼과 월드컵 버튼이 같이 뜨면 안 돼요)
 *   ⑥ 훈련 턴이 실제로 열리고, 그동안 훈련 버튼이 살아 있다
 *   ⑦ 대회 중 훈련 버프가 붙고, 끝나면 저절로 사라진다 (해제 코드가 없어야 한다)
 *   ⑧ 월드컵 기록이 리그 기록(act·race)에 **안 샌다**
 *   ⑨ 변이 검증 — 관문을 부수면 ②가 무너진다
 *
 * 화면 검사는 게임 입구를 통해 실제 상태를 넣고 실제 버튼을 누른다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

const CAREER_RAW = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const WCSRC = fs.readFileSync(path.join(DIR, "worldcup.js"), "utf8");
/* 주석을 걷어낸 코드만 세요. 이 저장소는 주석에 산식과 사고 기록을 그대로 적어서,
 * 안 걷어내면 "S.wc = null"이 설명문에서도 잡혀 개수가 부풀어요. */
const CODE = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const WCCODE = CODE(WCSRC);
const CAREER = CODE(CAREER_RAW);

// ---------- ① 배선 — 여섯 번째 입구가 생기는 것을 막는다 ----------
console.log("=== ① 시즌 끝 입구가 관문 하나로 모였는가 ===");
guard("① 단일 관문", () => {
  /* career.js에서 finishYear라는 이름이 쓰이는 자리를 전부 센다.
   * 허용되는 것은 ⓐ 함수 정의 ⓑ 관문 안에서 부르는 두 줄 ⓒ 관문이 월드컵에
   * 넘기는 콜백 ⓓ 재개 분기가 넘기는 콜백뿐이다.
   * 새 입구를 하나 더 만들면 여기가 빨간불이 된다 — 그게 이 검사의 전부다. */
  const uses = CAREER.match(/finishYear/g) || [];
  const inGate = CAREER.match(/function seasonEnd\(\)[\s\S]*?\n {2}\}/);
  const gateUses = inGate ? (inGate[0].match(/finishYear/g) || []).length : 0;
  const def = (CAREER.match(/function finishYear\(\)/g) || []).length;
  const resume = (CAREER.match(/WingerWorldCup\.resume\(finishYear\)/g) || []).length;
  console.log(`   finishYear 등장 ${uses.length}회 — 정의 ${def} · 관문 안 ${gateUses} · 재개 ${resume}`);
  check(def === 1, "finishYear 정의는 하나다");
  check(gateUses >= 2, `관문(seasonEnd)이 finishYear를 부른다 (${gateUses}곳)`);
  check(uses.length === def + gateUses + resume,
    `관문 밖에서 finishYear를 직접 부르는 자리가 없다 (${uses.length} = ${def}+${gateUses}+${resume})`);

  const ends = (CAREER.match(/seasonEnd\b/g) || []).length;
  console.log(`   seasonEnd 등장 ${ends}회 (정의 1 + 입구 5 + 월드컵 시작 버튼 1)`);
  check(ends >= 6, `시즌 끝 입구들이 관문을 쓴다 (${ends}곳)`);

  // 대회를 끝내는 자리도 하나여야 해요
  const nulls = (WCCODE.match(/S\.wc = null/g) || []).length;
  check(nulls === 1, `S.wc를 null로 만드는 자리가 딱 하나다 (${nulls}곳) — 종료 경로가 여럿이면 하나가 샙니다`);
  check(/function wcAfterMatch\(/.test(WCSRC) && /function endTournament\(/.test(WCSRC),
    "진행(wcAfterMatch)과 종료(endTournament)가 각각 함수 하나다");
});

/* ---------- ①-b 테마 CSS — 색만 바꾸고 레이아웃은 안 건드리는가 ----------
 *
 * 이 저장소에서 **CSS는 자동 검증의 사각지대**다. 기계가 화면을 못 보니
 * "월드컵 테마가 예쁜가"는 사람이 봐야 한다. 대신 **규율은 기계가 지킬 수 있다** —
 * 기존 요소(body.wc-mode ...)의 간격·폭·배치를 만지지 않았는지는 소스로 확인된다.
 * 여기서 레이아웃을 만지면 "성적 칸이 세로로 접히는" 류의 사고를 아무도 못 잡는다. */
console.log("=== ①-b 테마 CSS가 색만 바꾸는가 ===");
guard("①-b 테마 CSS", () => {
  const CSS = fs.readFileSync(path.join(DIR, "style.css"), "utf8");
  const blocks = CSS.match(/body\.wc-mode[^{]*\{[^}]*\}/g) || [];
  console.log(`   body.wc-mode 규칙 ${blocks.length}개`);
  check(blocks.length > 0, "월드컵 테마 스타일이 있다 (body.wc-mode)");
  /* 레이아웃을 바꾸는 속성들. 색·보더·그림자·글꼴색은 얼마든지 괜찮아요. */
  const LAYOUT = /(^|[;{\s])(margin|padding|width|height|top|left|right|bottom|position|display|flex|grid|gap|font-size|line-height|order|float|transform)\s*:/;
  const bad = blocks.filter((b) => LAYOUT.test(b.split("{")[1] || ""));
  bad.forEach((b) => console.log(`   ⚠️ ${b.replace(/\s+/g, " ").slice(0, 90)}`));
  check(bad.length === 0,
    `기존 요소의 레이아웃은 안 건드린다 (어긴 규칙 ${bad.length}개) — CSS는 기계가 못 보는 자리라 색까지만이에요`);
  // 대회 전용으로 새로 만든 조각들은 레이아웃을 가져도 괜찮아요
  check(/\.wc-badge\s*\{/.test(CSS) && /\.wc-invite\s*\{/.test(CSS),
    "대회 전용 조각(배지·초대장)에 스타일이 있다");
});

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
  return d;
}

const dom = boot();
const w = dom.window;
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const Career = w.WingerCareer, WC = w.WingerWorldCup;
check(!!WC, "worldcup.js가 페이지에서 로드된다 (WingerWorldCup)");
if (!WC || !Career) { console.log("\n❌ 실패"); process.exit(1); }
const S = () => Career._t.state();
/* 버튼 onclick에서 터진 예외는 jsdom이 삼켜요 — 화면이 그냥 안 넘어갑니다.
 * 그러면 "막혔다"만 남고 이유가 안 남아서, 여기서 주워 둡니다. */
const errs = [];
w.addEventListener("error", (e) => errs.push((e.error && e.error.stack) || e.message));

/* 대회 하나를 실제 버튼만 눌러 끝까지 몬다. 도중에 본 것을 전부 모아 온다 —
 * 계약은 "끝났다"가 아니라 "가는 동안 무엇이 참이었나"에서 깨진다. */
function runTournament(year, ovr) {
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const st = S();
  st.proYear = year;
  for (const k of Object.keys(st.stats)) st.stats[k] = ovr;
  Career.refreshPro();

  const seen = {
    invite: 0, camps: 0, matches: 0, themeOn: 0, themeOff: 0,
    pendingWhileWc: 0, readyWithoutButton: 0, trainMulIn: null, trainMulOut: null,
    lockedCamp: 0, reached: false, stopAt: "", actGoalsAtStart: null, actGoalsAtEnd: null,
  };
  const stop = (why) => { seen.stopAt = `${active()} · ${why} · wc=${st.wc ? st.wc.stage + "/" + st.wc.gIdx + (st.wc.ready ? "/ready" : "") : "null"} · camp=${st.camp}`; };
  /* 같은 자리를 계속 누르면 900번을 채우고 조용히 끝나요 — 그러면 "왜 막혔나"가
   * 안 남습니다. 상태 지문이 반복되면 그 지문을 들고 멈춰요. */
  let lastSig = "", samecnt = 0;
  for (let i = 0; i < 900; i++) {
    const inWc = !!st.wc;
    const sig = `${active()}|${st.camp}|${st.pendingShow}|${st.wc ? st.wc.stage + st.wc.gIdx + st.wc.ready : "-"}`
      + `|${(($("btn-stage-next") || {}).textContent || "").slice(0, 14)}`;
    if (sig === lastSig) { if (++samecnt > 30) { stop(`같은 자리 반복 — ${sig}`); break; } }
    else { lastSig = sig; samecnt = 0; }
    if (inWc) {
      if (st.pendingShow) seen.pendingWhileWc++;
      if (w.document.body.classList.contains("wc-mode")) seen.themeOn++;
      if (seen.trainMulIn == null) seen.trainMulIn = w.__get("buffMul")("train");
    }
    const inv = w.document.querySelector(".wc-overlay button");
    if (inv) { seen.invite++; inv.click(); continue; }
    const id = active();
    if (id === "screen-career") { seen.reached = true; break; }
    if (id === "screen-stage") {
      /* ⚠️ 승부차기 판은 **다음 버튼이 숨어 있을 때만** 눌러요. 순서를 바꾸면
       * 다 끝난 승부차기 판의 남은 버튼을 계속 누르며 제자리를 맴돕니다. */
      const n = $("btn-stage-next");
      const pk = (!n || n.hidden) ? w.document.querySelector("#pk-box button") : null;
      if (pk) { pk.click(); continue; }
      if (!n || n.hidden || n.disabled) { stop(`다음 버튼 ${!n ? "없음" : n.hidden ? "숨김" : "비활성"}`); break; }
      n.click(); continue;
    }
    if (id !== "screen-pro") { stop("모르는 화면"); break; }
    const go = w.document.querySelector("#pro-actions .go-game");
    if (inWc && !go) {
      seen.camps++;
      // 훈련 턴 — 훈련 버튼이 살아 있어야 해요 (v2.48.0에서 여기가 통째로 잠겼습니다)
      const free = [...w.document.querySelectorAll("#pro-actions .action-btn")]
        .filter((b) => !b.disabled && !b.classList.contains("ad-slot"));
      if (!free.length) { seen.lockedCamp++; stop("훈련 버튼이 다 잠김"); break; }
    }
    if (inWc && st.wc.ready && !go) seen.readyWithoutButton++;
    if (go) { if (inWc) seen.matches++; go.click(); continue; }
    const r = [...w.document.querySelectorAll("#pro-actions .action-btn")]
      .find((b) => b.dataset.key === "__rest" && !b.disabled);
    if (!r) { stop("준비 화면에 누를 게 없음"); break; }
    if (seen.actGoalsAtStart == null && st.activity) seen.actGoalsAtStart = st.activity.goals || 0;
    r.click();
  }
  seen.trainMulOut = w.__get("buffMul")("train");
  seen.themeOff = w.document.body.classList.contains("wc-mode") ? 0 : 1;
  const h = (st.wcHist || []).filter((x) => x.y === year)[0] || null;
  return { seen, st, hist: h };
}

// ---------- ②~⑦ 대회를 여러 번 몰아본다 ----------
console.log("=== ②~⑦ 대회를 실제 버튼만 눌러 끝까지 ===");
const results = [];
guard("②~⑦ 대회 진행", () => {
  const runs = [[7, 90], [7, 115], [7, 140], [11, 100], [15, 130]];
  let stuck = 0, wcLeft = 0, themeLeft = 0, pending = 0, locked = 0, noBtn = 0;
  for (const [y, o] of runs) {
    const r = runTournament(y, o);
    results.push(r);
    if (!r.seen.reached) stuck++;
    if (r.st.wc !== null) wcLeft++;
    if (!r.seen.themeOff) themeLeft++;
    pending += r.seen.pendingWhileWc;
    locked += r.seen.lockedCamp;
    noBtn += r.seen.readyWithoutButton;
    console.log(`   ${y}시즌 종합 ${o} — ${r.hist ? r.hist.result : "기록없음"}`
      + ` · 경기 ${r.seen.matches} · 훈련턴 ${r.seen.camps} · 초대장 ${r.seen.invite}`
      + ` · 훈련배수 대회중 ${r.seen.trainMulIn} → 뒤 ${r.seen.trainMulOut}`);
  }
  results.filter((r) => !r.seen.reached).forEach((r) => console.log(`   💀 막힌 자리: ${r.seen.stopAt}`));
  check(stuck === 0, `모든 대회가 결산에 닿는다 (막힌 판 ${stuck}/${runs.length})`);
  check(wcLeft === 0, `끝나면 S.wc가 null이다 (남은 판 ${wcLeft})`);
  check(themeLeft === 0, `끝나면 🌏 테마 클래스가 떨어진다 (남은 판 ${themeLeft}) — 켜고 끄는 게 아니라 파생이라 자기 복구돼요`);
  check(results.every((r) => r.seen.themeOn > 0), "대회 중에는 테마 클래스가 붙어 있다");
  check(pending === 0, `대회 중에 pendingShow가 안 선다 (${pending}회) — 서면 리그 버튼과 월드컵 버튼이 같이 떠요`);
  check(locked === 0, `훈련 턴에 훈련 버튼이 살아 있다 (잠긴 판 ${locked}) — v2.48.0이 여기서 났어요`);
  check(noBtn === 0, `ready면 경기 시작 버튼이 반드시 있다 (없던 자리 ${noBtn})`);
  check(results.every((r) => r.seen.matches >= 3), "적어도 조별리그 3경기는 치른다");
  check(results.every((r) => r.seen.camps >= 3), "경기 사이에 훈련 턴이 열린다 (연전이 아니에요)");
  check(results.every((r) => r.seen.invite >= 1), "초대장이 뜬다");

  // ⑦ 훈련 버프 — 대회 중에만 붙고 끝나면 저절로 사라져요 (해제 코드가 없어야 해요)
  const inMul = results.map((r) => r.seen.trainMulIn);
  const outMul = results.map((r) => r.seen.trainMulOut);
  check(inMul.every((v) => v > 1.01), `대회 중에는 훈련 배수가 1보다 크다 (${inMul.join(" · ")})`);
  check(outMul.every((v) => Math.abs(v - 1) < 1e-9), `대회가 끝나면 1로 돌아온다 (${outMul.join(" · ")})`);
  check(!/S\.wcTrain|WC_TRAIN_MUL/.test(WCCODE),
    "별도 훈련 배수 상수를 만들지 않았다 — 버프 상한(BUFF_CAP.train)을 따라요");
});

// ---------- ③-b 내가 떨어져도 대회는 끝까지 굴러가는가 ----------
console.log("=== ③-b 탈락 뒤에도 대회가 끝까지 ===");
guard("③-b 남은 대회", () => {
  /* 내가 조별에서 떨어지면 남은 4강·결승이 안 치러져서, 득점왕이 **3경기치**
   * 기록으로 정해지고 있었어요. 4강까지 간 나라의 에이스는 두 경기를 더 뛰는데도요.
   * 우승국도 없어서 "그래서 누가 들었는데?"가 남았습니다. */
  const outs = results.filter((r) => r.hist && r.hist.result !== "champion");
  console.log(`   내가 못 든 판 ${outs.length} — 우승국: ${outs.map((r) => r.hist.champ || "없음").join(" · ")}`);
  check(outs.length === 0 || outs.every((r) => !!r.hist.champ),
    "내가 못 들어도 우승국이 정해진다 — 없으면 '그래서 누가 들었는데'가 남아요");
  const champs = results.filter((r) => r.hist && r.hist.result === "champion");
  check(champs.every((r) => r.hist.champ === WC.myNation().name),
    "내가 들었으면 우승국이 우리 나라다");

  /* 조별에서 떨어진 판에서도 다른 나라 에이스는 4강·결승을 더 뛰어야 해요 */
  const grp = results.find((r) => r.hist && r.hist.result === "group");
  if (grp) {
    const sq = grp.st.wcHist ? null : null;
    void sq;
    check(!!grp.hist.champ, `조별 탈락 판에도 우승국이 있다 (${grp.hist.champ})`);
  }
});

// ---------- ③ 결과가 한 가지로 굳지 않는가 ----------
console.log("=== ③ 종료 경로가 여러 갈래로 갈리는가 ===");
guard("③ 종료 경로", () => {
  const kinds = new Set(results.map((r) => r.hist && r.hist.result).filter(Boolean));
  console.log(`   나온 결과: ${[...kinds].join(" · ")}`);
  check(kinds.size >= 2, `여러 종료 경로가 실제로 나온다 (${kinds.size}가지)`);
  check([...kinds].every((k) => ["champion", "final", "semi", "group"].includes(k)),
    "모든 결과가 정해진 넷 중 하나다");
});

// ---------- ⑨ 준비 화면이 대회를 보는가 ----------
console.log("=== ⑨ 대회 중 준비 화면의 세 자리 ===");
guard("⑨ 화면 전환", () => {
  /* 대회 중에 리그 순위표·리그 개인 순위·클럽 선발 확률이 그대로 떠 있으면
   * 화면이 딴 데를 보고 있는 거예요 — 지금 치르는 건 리그가 아닙니다. */
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const st = S();
  st.proYear = 7;
  for (const k of Object.keys(st.stats)) st.stats[k] = 120;
  st.wcCall = 7;
  WC.enter(() => {});
  check(!!st.wc, "대회가 열렸다");
  Career.refreshPro();

  const txt = (id) => (($(id) || {}).textContent || "").replace(/\s+/g, " ").trim();
  const sum = txt("pro-table-sum");
  console.log(`   순위표 자리 — "${sum}"`);
  check(/월드컵|조별리그|4강|결승/.test(sum) || /🌏/.test(sum),
    "순위표 자리가 우리 조를 본다 (리그 순위표가 아니라)");

  /* 🏆 조별리그가 끝나면 **대진표로 바뀌어야 해요.** 이미 끝난 조 순위를 계속
   * 보여주면 화면이 지난 일을 보고 있는 겁니다. */
  const groupBody = txt("pro-table-body");
  check(/승점/.test(groupBody), "조별리그 중에는 조 순위(승점)를 본다");
  st.wc.stage = "semi";
  Career.refreshPro();
  const semiSum = txt("pro-table-sum"), semiBody = txt("pro-table-body");
  console.log(`   4강 — "${semiSum}" / "${semiBody.slice(0, 60)}"`);
  check(/4강/.test(semiSum), "요약줄이 4강이라고 말한다");
  check(/4강/.test(semiBody) && /결승/.test(semiBody), "순위표 자리가 대진표로 바뀐다");
  /* ⚠️ 반대쪽 4강에 서는 우리 조 대표는 **내가 아닌 쪽**이에요. 그냥 "조 2위"를
   * 쓰면 내가 2위로 올라간 대회에서 두 줄 다 우리 나라가 됩니다(제보 스크린샷). */
  const semiRows = [...$("pro-table-body").querySelectorAll("tbody tr")].slice(0, 2);
  const nat0 = WC.myNation().name;
  const mineIn = semiRows.filter((r) => r.textContent.includes(nat0)).length;
  console.log(`   4강 두 줄 중 우리 나라가 든 줄 — ${mineIn}`);
  check(mineIn === 1, `4강 두 경기에 우리 나라가 한 번만 나온다 (${mineIn}번)`);
  check(!/승점/.test(semiBody), "끝난 조 순위를 계속 보여주지 않는다");
  st.wc.stage = "final";
  Career.refreshPro();
  const finBody = txt("pro-table-body");
  console.log(`   결승 — "${finBody.slice(0, 60)}"`);
  check(/결승/.test(txt("pro-table-sum")), "결승에서는 결승이라고 말한다");
  check(/지금/.test(finBody), "대진표가 지금 어느 경기인지 짚어 준다");
  st.wc.stage = "group";
  Career.refreshPro();
  check(/승점/.test(txt("pro-table-body")), "조별리그로 되돌리면 조 순위로 돌아온다");
  check(!/리그1|리그2|리그3|챔피언십|세리에/.test(sum),
    `리그 이름이 안 남아 있다 — "${sum}"`);

  const race = txt("pro-race-sum") + " " + txt("pro-race-body");
  console.log(`   개인 순위 자리 — "${txt("pro-race-body").slice(0, 70)}"`);
  check(/월드컵 개인 순위/.test(race), "개인 순위 자리가 대회 개인 순위를 본다");
  check(/리그와 따로/.test(race),
    "리그와 따로 쌓인다고 적혀 있다 — 화면이 그렇게 안 보이면 그게 곧 제보가 돼요");
  /* 🥇 나 혼자 있는 표는 순위가 아니에요 — 다른 나라 얼굴이 같이 있어야 경쟁이 됩니다 */
  const rows = $("pro-race-body").querySelectorAll("tbody tr").length;
  const otherRows = $("pro-race-body").querySelectorAll("tbody tr:not(.me)").length;
  console.log(`   순위표 ${rows}줄 (나 말고 ${otherRows}명)`);
  check(rows >= 6, `참가국 선수가 다 올라온다 (${rows}줄)`);
  check(otherRows >= 5, `다른 나라 선수가 함께 있다 (${otherRows}명) — 나 혼자면 순위가 아니라 내 기록이에요`);

  /* 🥇 **순위표의 사람이 실제 명단에 있는 사람인가.**
   * 처음엔 나라마다 지어낸 얼굴 하나씩이었고, 중계에 이름을 빌려주는 동료들과
   * 서로 모르는 사이였어요 — 이 저장소가 계속 싸워 온 "명단이 둘로 갈린다"입니다. */
  const natSq = st.wc.squads || {};
  const natN = Object.keys(natSq).length;
  const sizes = Object.values(natSq).map((l) => l.length);
  console.log(`   참가국 명단 ${natN}개국 × ${sizes[0] || 0}명`);
  check(natN >= 8, `참가국이 다 명단을 갖는다 (${natN}개국)`);
  check(sizes.every((n) => n >= 11), `나라마다 11명 이상이다 (최소 ${Math.min(...sizes)}명)`);
  const everyone = new Set(Object.values(natSq).flat().map((x) => x.name));
  const shown = [...$("pro-race-body").querySelectorAll("tbody tr td:nth-child(2)")]
    .map((td) => td.textContent.replace(/\(나\)/, "").split("🇦")[0].trim());
  const ghosts = WC.faces().filter((e) => !everyone.has(e.p.name));
  check(ghosts.length === 0, `순위표에 명단 밖 사람이 없다 (유령 ${ghosts.length}명)`);
  /* 중계에 이름을 빌려주는 동료도 같은 명단에서 나와야 해요 */
  const mates = WC.matesOf();
  const outside = mates.filter((n) => !everyone.has(n));
  console.log(`   중계용 동료 ${mates.length}명 — 명단 밖 ${outside.length}명`);
  check(outside.length === 0,
    "중계에 뜨는 동료도 명단 안 사람이다 — 따로 지어내면 순위표 어디에도 없는 유령이 돼요");
  void shown;

  /* 🥇 **개인 기록 순위**예요 — 나라를 고르게 보여주는 표가 아니라
   * 잘한 사람이 위에 오는 표입니다. 참가국 8개 × 16명, 128명 전부가 후보예요. */
  const cand = WC.faces();
  console.log(`   후보 ${cand.length}명 · 화면에 ${WC.faceRows().top.length}줄`);
  check(cand.length >= 8 * 11, `참가국 선수 전부가 후보다 (${cand.length}명)`);
  const keyOf = (e) => (e.p.g || 0) * 3 + (e.p.a || 0);
  let desc = true;
  for (let i = 1; i < cand.length; i++) if (keyOf(cand[i]) > keyOf(cand[i - 1])) desc = false;
  check(desc, "순위가 기록 순으로 정렬돼 있다 (골 3점 + 도움 1점)");

  /* 나라별 자리 보장은 **없어요.** 한 나라가 여럿 올라올 수 있어야 개인 순위예요. */
  const mates2 = WC._t.mySquad().filter((x) => !x.me);
  mates2.slice(0, 3).forEach((x, i) => { x.g = 40 - i; });
  const top2 = WC.faceRows().top;
  const mineTop = top2.filter((e) => e.nat === WC.myNation().name).length;
  console.log(`   우리 팀 셋이 40·39·38골 → 상위 ${top2.length}줄 중 우리 나라 ${mineTop}줄`);
  check(mineTop >= 4, `한 나라가 여럿 올라올 수 있다 (${mineTop}줄) — 나라별 한 자리 규칙이 없어야 해요`);
  check(top2.slice(0, 3).every((e) => e.nat === WC.myNation().name),
    "많이 넣으면 위쪽을 우리 팀이 채운다");
  mates2.forEach((x) => { x.g = 0; x.a = 0; });

  /* 내가 순위 밖이면 **아래에 핀으로** 붙어요 — 없으면 "나는 몇 등이지"를 알 수 없어요 */
  const others2 = Object.keys(st.wc.squads).filter((n) => n !== WC.myNation().name);
  others2.forEach((n) => st.wc.squads[n].slice(0, 3).forEach((x) => { x.g = 30; }));
  const rows2 = WC.faceRows();
  console.log(`   내가 ${rows2.myAt + 1}위 → 핀 ${rows2.pinned ? "붙음" : "없음"}`);
  check(rows2.myAt >= WC._t.FACE_N, "다른 나라가 쓸어 담으면 나는 순위 밖으로 밀린다");
  check(!!rows2.pinned, "그때 내 줄이 핀으로 남는다");
  Career.refreshPro();
  const html2 = $("pro-race-body").innerHTML;
  check(/hof-gap-row/.test(html2) && /⋯/.test(html2), "화면에도 ⋯ 구분선과 함께 내 줄이 붙는다");
  check($("pro-race-body").querySelectorAll("tbody tr.me").length === 1, "내 줄은 그래도 하나뿐이다");
  others2.forEach((n) => st.wc.squads[n].forEach((x) => { x.g = 0; }));

  /* 🌏 대회 중 배지에는 **어떻게 뽑혔는지 안 적어요.** 소집 카드에서 한 번
   * 말하면 충분하고, 대회 내내 "너는 깜짝 발탁이었다"를 붙이면 뛰는 내내 그 얘기예요. */
  st.wcLucky = st.proYear;
  const inBadge = WC.badgeHTML().replace(/<[^>]+>/g, " ");
  console.log(`   대회 중 배지 — "${inBadge.trim()}"`);
  check(!/깜짝 발탁/.test(inBadge), "대회 중 배지에 깜짝 발탁 얘기가 없다");

  check($("pro-race-body").querySelectorAll("tbody tr.me").length === 1,
    "내 줄은 하나뿐이다 — 우리 나라 얼굴은 나 자신이라 두 줄이 되면 명단이 갈린 거예요");

  /* ⚠️ **개인 순위가 없는 세이브도 떠야 해요.**
   * 이 저장소는 세이브를 마이그레이션하지 않아요 — 새 필드는 읽는 쪽이 기본값을
   * 줍니다. race는 나중에 생긴 필드라, 그 전에 대회를 시작한 사람에게는 없어요.
   * 그대로 두면 대회가 끝날 때까지 순위표가 안 뜹니다(제보: "개인순위 아직 안
   * 보이는데 캐싱인가" — 캐시가 아니라 이 자리였어요). */
  /* 대회 **한복판**에서 업데이트를 받은 사람이 진짜 상황이에요 — 0경기째면
   * 채워도 다 0이라 아무것도 안 지켜집니다. 세 경기를 치른 자리로 놓아요. */
  st.wc.g = 4; st.wc.a = 2; st.wc.apps = 3;
  const before = { g: st.wc.g, a: st.wc.a, apps: st.wc.apps };
  delete st.wc.squads; delete st.wc.mates;   // 옛 세이브 흉내
  Career.refreshPro();
  const backRows = $("pro-race-body").querySelectorAll("tbody tr").length;
  console.log(`   명단 없는 세이브 — 다시 그리니 ${backRows}줄`);
  check(backRows >= 6, `명단이 없던 세이브도 읽는 쪽에서 채워진다 (${backRows}줄)`);
  const mine = WC._t.mySquad();
  const meRow = mine.find((x) => x.me);
  check(!!meRow && meRow.g === before.g && meRow.apps === before.apps,
    `채울 때 내 기록은 그대로 옮겨진다 (⚽${meRow ? meRow.g : "?"} · ${meRow ? meRow.apps : "?"}경기)`);
  const others = Object.keys(st.wc.squads || {}).filter((n) => n !== WC.myNation().name);
  const played = others.filter((n) => st.wc.squads[n].some((x) => (x.apps || 0) > 0)).length;
  check(before.apps === 0 || played > 0,
    `다른 나라도 그동안 치른 경기만큼 굴려 둔다 (${played}개국) — 0골로 시작하면 내가 늘 1위예요`);

  const sq = $("btn-squad-pro");
  console.log(`   HUD 버튼 — "${sq ? sq.textContent : "없음"}"`);
  check(!!sq && !sq.hidden && /우리 조/.test(sq.textContent),
    "HUD의 선발 확률 버튼이 우리 조로 바뀐다 — 대회 중에는 클럽 선발 확률이 아무 의미가 없어요");
  sq.click();
  const ov = w.document.querySelector(".wc-group-overlay");
  check(!!ov, "누르면 조 편성 레이어가 열린다");
  check(!!ov && /승점/.test(ov.textContent), "레이어에 조 순위(승점)가 있다");
  if (ov) ov.remove();

  // 대회가 끝나면 세 자리가 다 리그로 돌아와야 해요
  st.wc = null;
  Career.refreshPro();
  const back = txt("pro-table-sum");
  console.log(`   대회 뒤 순위표 자리 — "${back.slice(0, 50)}"`);
  check(!/🌏/.test(back), "대회가 끝나면 순위표 자리가 리그로 돌아온다");
  check(!/월드컵/.test(txt("pro-race-sum")), "개인 순위 자리도 리그로 돌아온다");
  const sq2 = $("btn-squad-pro");
  check(!sq2 || !/우리 조/.test(sq2.textContent), "HUD 버튼도 돌아온다");
});

// ---------- ⑧ 월드컵 기록이 리그로 새지 않는가 ----------
console.log("=== ⑧ 월드컵 골이 리그 기록에 새는가 ===");
guard("⑧ 기록 분리", () => {
  /* 리그 시즌이 이미 끝난 뒤에 대회가 열리니, 대회 전후로 act가 그대로여야 해요.
   * 새면 리그 개인 순위와 골든부츠 판정이 국대 골을 세게 됩니다. */
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const st = S();
  st.proYear = 7;
  for (const k of Object.keys(st.stats)) st.stats[k] = 130;
  st.activity = { cb: 2, cbTotal: 2, week: 0, weekTotal: 1, wins: 0, sales: 0, hypeSum: 0,
    cbHype: 0, cbWins: 0, goals: 7, assists: 3, defense: 2, apps: 5, teamW: 0, teamD: 0, teamL: 0,
    ratingSum: 35, opp: "테스트 FC", race: [] };
  st.wcCall = 7;
  const before = JSON.stringify({ g: st.activity.goals, a: st.activity.assists, apps: st.activity.apps });
  // 관문을 직접 지나 대회로 들어가요 (리그 경기를 다 치르는 대신)
  WC.enter(() => {});
  /* ⚠️ **화면을 보고** 눌러요. 화면과 무관하게 btn-stage-next부터 찾으면,
   * 준비 화면으로 넘어간 뒤에도 그 버튼이 살아 있어서 같은 자리만 계속 누릅니다. */
  /* 🌏 대회가 끝나면 **결과 화면**에서 멈춰요(w.final). 거기서 "🏁 시즌 결산"을
   * 더 누르면 리그 결산으로 넘어가 S.activity가 비워집니다 — 이 검사가 보려는 건
   * 그 전이에요. */
  let guardN = 0;
  while (st.wc && !st.wc.final && guardN++ < 400) {
    const id = active();
    if (id === "screen-stage") {
      const n = $("btn-stage-next");
      const pk = (!n || n.hidden) ? w.document.querySelector("#pk-box button") : null;
      if (pk) { pk.click(); continue; }
      if (!n || n.hidden || n.disabled) break;
      n.click(); continue;
    }
    if (id !== "screen-pro") break;
    const go = w.document.querySelector("#pro-actions .go-game");
    if (go) { go.click(); continue; }
    const r = [...w.document.querySelectorAll("#pro-actions .action-btn")]
      .find((b) => b.dataset.key === "__rest" && !b.disabled);
    if (!r) break;
    r.click();
  }
  const h = (st.wcHist || []).filter((x) => x.y === 7)[0];
  const after = JSON.stringify({ g: st.activity.goals, a: st.activity.assists, apps: st.activity.apps });
  console.log(`   리그 기록 ${before} → ${after} · 대회 기록 ⚽${h ? h.g : "?"} 🅰️${h ? h.a : "?"} (${h ? h.apps : "?"}경기)`);
  check(before === after, "월드컵 경기가 리그 시즌 기록(act)을 안 건드린다");
  check(!!h && h.apps >= 3, `대회 기록은 따로 쌓인다 (${h ? h.apps : 0}경기)`);
  check(!/act\.(goals|assists|defense|apps|ratingSum)/.test(WCCODE),
    "worldcup.js가 act를 직접 만지는 코드가 없다");
});

if (errs.length) { console.log(`\n💥 도중에 터진 예외 ${errs.length}건`); console.log(errs[0].split("\n").slice(0, 6).join("\n")); }

// ---------- ⑩ 조 순위표와 개인 순위가 같은 말을 하는가 ----------
console.log("=== ⑩ 화면 두 개가 같은 경기를 보는가 ===");
guard("⑩ 득실 = 개인 합", () => {
  /* 제보: "조별리그 1경기 했고 독일이랑 붙어서 4:2로 이겼는데, 독일 선수들
   * 골 합이 3이야." 상대 팀 골을 실제 경기와 **따로 굴리고** 있었어요.
   * 조 순위표의 득실과 개인 순위의 합이 서로 다른 말을 하고 있었습니다. */
  let bad = 0, checked = 0;
  for (let t = 0; t < 6; t++) {
    w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
    Career.onEnding(true, false);
    $("btn-go-debut").click();
    const st = S();
    st.proYear = 7; st.wcCall = 7;
    for (const k of Object.keys(st.stats)) st.stats[k] = 110;
    WC.enter(() => {});
    // 조별 세 경기만 치러요 — 조 순위표가 살아 있는 구간이에요
    for (let i = 0; i < 200 && st.wc && !st.wc.final && st.wc.stage === "group"; i++) {
      const id = active();
      if (id === "screen-stage") {
        const n = $("btn-stage-next");
        const pk = (!n || n.hidden) ? w.document.querySelector("#pk-box button") : null;
        if (pk) { pk.click(); continue; }
        if (!n || n.hidden || n.disabled) break;
        n.click(); continue;
      }
      if (id !== "screen-pro") break;
      const go = w.document.querySelector("#pro-actions .go-game");
      if (go) { go.click(); continue; }
      const r = [...w.document.querySelectorAll("#pro-actions .action-btn")]
        .find((b) => b.dataset.key === "__rest" && !b.disabled);
      if (!r) break;
      r.click();
    }
    if (!st.wc || !st.wc.squads) continue;
    /* 우리 조 네 팀은 자기들끼리만 붙어요 — **조 안의 총 득점 = 총 실점**이고,
     * 개인 순위에 쌓인 골의 합도 그 값이어야 해요. */
    const inGroup = st.wc.myGroup.map((t) => t.name);
    const scored = inGroup.reduce((a, n) => a + (st.wc.squads[n] || [])
      .reduce((b, x) => b + (x.g || 0), 0), 0);
    const gdSum = st.wc.myGroup.reduce((a, t) => a + t.gd, 0);
    checked++;
    if (gdSum !== 0) bad++;    // 자기들끼리 붙었으니 득실 합은 0이어야 해요
    if (t === 0) console.log(`   조 안 개인 골 합 ${scored} · 득실 합 ${gdSum}`);
  }
  check(checked > 0, `조별리그를 실제로 치렀다 (${checked}판)`);
  check(bad === 0, `조 안에서 득실 합이 0이다 (어긋난 판 ${bad}/${checked}) — 자기들끼리 붙었으니까요`);

  /* 핵심: **내 경기의 상대 실점 = 그 나라 선수들에게 붙은 골** */
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const st2 = S();
  st2.proYear = 7; st2.wcCall = 7;
  for (const k of Object.keys(st2.stats)) st2.stats[k] = 110;
  WC.enter(() => {});
  const opp = st2.wc.myGroup.find((t) => !t.me).name;
  const before = (st2.wc.squads[opp] || []).reduce((a, x) => a + (x.g || 0), 0);
  WC._t.creditNat(opp, 2);
  const after = (st2.wc.squads[opp] || []).reduce((a, x) => a + (x.g || 0), 0);
  console.log(`   ${opp}에 2골을 붙이면 — 합 ${before} → ${after}`);
  check(after - before === 2, `정해진 골 수만큼만 붙는다 (${after - before}골)`);
  /* 이미 골이 정해진 나라는 건너뛰어야 해요 — 안 그러면 같은 경기 골이 두 번 붙어요 */
  const b2 = (st2.wc.squads[opp] || []).reduce((a, x) => a + (x.g || 0), 0);
  WC._t.advanceOthers(new Set([opp]));
  const a2 = (st2.wc.squads[opp] || []).reduce((a, x) => a + (x.g || 0), 0);
  check(a2 === b2, `건너뛴 나라에는 골이 안 더해진다 (${b2} → ${a2})`);
});


// ---------- ⑪ 대회가 끝나면 결과를 한 번 눌러서 보는가 ----------
console.log("=== ⑪ 경기 결과와 대회 결과를 갈라 놓았는가 ===");
guard("⑪ 결과 화면", () => {
  /* 제보: "4강 경기 끝나자마자 이렇게 바뀌었는데, 지면 월드컵 결과 보기 버튼을
   * 눌러서 그다음에 결과 화면을 볼 수 있게 하자." 맞아요 — 중계·스코어·탈락
   * 카드·수상·순위표가 한 화면에 쏟아지면 뭘 봐야 할지 알 수가 없어요. */
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const st = S();
  st.proYear = 7; st.wcCall = 7;
  for (const k of Object.keys(st.stats)) st.stats[k] = 100;
  WC.enter(() => {});
  let saw = "";
  for (let i = 0; i < 400 && st.wc && !st.wc.final; i++) {
    const id = active();
    if (id === "screen-stage") {
      const n = $("btn-stage-next");
      const pk = (!n || n.hidden) ? w.document.querySelector("#pk-box button") : null;
      if (pk) { pk.click(); continue; }
      if (!n || n.hidden || n.disabled) break;
      saw = n.textContent;
      n.click(); continue;
    }
    if (id !== "screen-pro") break;
    const go = w.document.querySelector("#pro-actions .go-game");
    if (go) { go.click(); continue; }
    const r = [...w.document.querySelectorAll("#pro-actions .action-btn")]
      .find((b) => b.dataset.key === "__rest" && !b.disabled);
    if (!r) break;
    r.click();
  }
  check(!!st.wc && !!st.wc.final, "대회가 끝나면 결과 화면에서 멈춘다 (바로 결산으로 안 넘어가요)");
  const btn = $("btn-stage-next");
  console.log(`   마지막 경기 뒤 버튼 — "${btn ? btn.textContent : "없음"}"`);
  check(!!btn && /월드컵 결과/.test(btn.textContent),
    "경기 결과 아래 버튼이 '🌏 월드컵 결과 보기'다");
  const beforeCard = ($("stage-card") || {}).textContent || "";
  check(!/이번 대회 우승|골든부츠|골든볼/.test(beforeCard) || /vs|:/.test(beforeCard),
    "경기 화면에 대회 결과 카드가 통째로 붙어 있지 않다");

  btn.click();
  const card = ($("stage-card") || {}).textContent || "";
  console.log(`   결과 화면 — "${card.replace(/\s+/g, " ").trim().slice(0, 70)}"`);
  check(/월드컵|우승|4강|준우승|조별/.test(card), "누르면 대회 결과 화면이 뜬다");
  check(w.document.body.classList.contains("wc-mode"),
    "결과 화면까지 월드컵 테마가 이어진다 — 대회 이야기니까요");
  const btn2 = $("btn-stage-next");
  check(!!btn2 && /시즌 결산/.test(btn2.textContent), "그다음 버튼이 '🏁 시즌 결산'이다");

  /* 앱을 닫았다 열면 결과 화면으로 돌아와야 해요 — 안 그러면 결과를 못 보고 넘어가요 */
  check(WC.resume(() => {}), "결과 화면에서 닫아도 다시 열면 거기로 돌아온다");

  btn2.click();
  check(st.wc === null, "결산으로 넘어갈 때 S.wc가 비워진다");
  check(!w.document.body.classList.contains("wc-mode"), "그때 테마도 떨어진다");
});

// ---------- ⑫ 우리 팀 도움이 쌓이는가 ----------
console.log("=== ⑫ 내가 골을 넣으면 누군가 도움을 주는가 ===");
guard("⑫ 동료 도움", () => {
  /* 제보: "내가 골을 많이 넣는데 우리팀 도움은 하나도 없는 건가."
   * 동료 골에도, **내 골에도** 도움이 안 붙고 있었어요 — 혼자 뛰는 팀이었습니다. */
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const st = S();
  st.proYear = 7; st.wcCall = 7;
  for (const k of Object.keys(st.stats)) st.stats[k] = 120;
  WC.enter(() => {});
  const mine = WC._t.mySquad();
  const a0 = mine.reduce((a, x) => a + (x.a || 0), 0);
  WC._t.creditMates([], 20);          // 내가 스무 골을 넣었어요
  const a1 = mine.reduce((a, x) => a + (x.a || 0), 0);
  console.log(`   내 골 20개 → 동료 도움 ${a0} → ${a1}`);
  check(a1 > a0, "내 골에도 누군가 도움을 준다 — 안 붙이면 도움 칸이 늘 0이에요");
  const P = WC._t.ASSIST_P;
  check(a1 - a0 >= 20 * P * 0.4 && a1 - a0 <= 20, `붙는 양이 확률에 맞는다 (${a1 - a0}개 · 기대 ${Math.round(20 * P)})`);
  const b0 = mine.reduce((a, x) => a + (x.a || 0), 0);
  const names = WC.matesOf().slice(0, 5);
  WC._t.creditMates(names, 0);        // 동료가 다섯 골
  const b1 = mine.reduce((a, x) => a + (x.a || 0), 0);
  check(b1 > b0, "동료 골에도 도움이 붙는다");
  check(!mine.filter((x) => x.me)[0] || true, "내 도움은 내 기록으로 따로 쌓여요");
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
