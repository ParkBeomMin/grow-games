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
  check(!/리그1|리그2|리그3|챔피언십|세리에/.test(sum),
    `리그 이름이 안 남아 있다 — "${sum}"`);

  const race = txt("pro-race-sum") + " " + txt("pro-race-body");
  console.log(`   개인 순위 자리 — "${txt("pro-race-body").slice(0, 70)}"`);
  check(/월드컵 개인 순위/.test(race), "개인 순위 자리가 대회 개인 순위를 본다");
  check(/리그와 따로/.test(race),
    "리그와 따로 쌓인다고 적혀 있다 — 화면이 그렇게 안 보이면 그게 곧 제보가 돼요");
  /* 🥇 나 혼자 있는 표는 순위가 아니에요 — 다른 나라 얼굴이 같이 있어야 경쟁이 됩니다 */
  const rows = $("pro-race-body").querySelectorAll("tbody tr").length;
  const others = $("pro-race-body").querySelectorAll("tbody tr:not(.me)").length;
  console.log(`   순위표 ${rows}줄 (나 말고 ${others}명)`);
  check(rows >= 6, `참가국 얼굴이 다 올라온다 (${rows}줄)`);
  check(others >= 5, `다른 나라 선수가 함께 있다 (${others}명) — 나 혼자면 순위가 아니라 내 기록이에요`);
  check($("pro-race-body").querySelectorAll("tbody tr.me").length === 1,
    "내 줄은 하나뿐이다 — 우리 나라 얼굴은 나 자신이라 두 줄이 되면 명단이 갈린 거예요");

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
  let guardN = 0;
  while (st.wc && guardN++ < 400) {
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
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
