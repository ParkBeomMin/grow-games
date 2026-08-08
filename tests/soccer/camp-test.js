/* 🔥 1년 특훈 — 프로 도전에 실패한 뒤의 한 해가 실제로 굴러가는가.
 *
 * 제안: "프로 입단 실패하면 1년간 특훈하기 기능을 넣고, 특훈 기간에는
 * 도박 vs 노력 이런 느낌으로 선택해서 스탯을 올릴 수 있게 하고,
 * 노력 쪽은 연타 같은 걸 막 해야 하고." · "도박은 대박도 한 번씩 나와야 해."
 *
 * 예전 🌱 유스 재계약은 3년차를 통째로 다시 뛰게 했어요 — 방금 한 걸 그대로
 * 반복하는 거라 무엇을 바꿔야 하는지도 손에 안 잡혔습니다.
 *
 * 이런 장치에서 조용히 죽는 자리:
 *   · 커리어당 한 번이라고 해놓고 두 번 들어가짐
 *   · 노력이 손해가 됨 (연타를 못 하는 사람 = 자동 미니게임이 벌을 받음)
 *   · 도박이 늘 이득이거나 늘 손해 (선택이 아니라 정답/함정이 됨)
 *   · 대박이 이름만 있고 안 나옴
 *   · 능력치 상한을 넘거나 음수가 됨
 *   · 특훈만 하고 프로 도전으로 안 이어짐 (막다른 길)
 *
 * 지키는 것:
 *   ① 실패 엔딩에 특훈 버튼이 있고, 커리어당 한 번만 열린다
 *   ② 노력은 연타를 하나도 못 해도 반드시 오른다
 *   ③ 연타를 많이 칠수록 더 오른다
 *   ④ 도박은 네 갈래가 다 나오고, 대박도 실제로 나온다
 *   ⑤ 도박 기댓값이 노력과 비슷하다 (한쪽이 정답이 되지 않게)
 *   ⑥ 능력치 상한·하한을 안 넘는다
 *   ⑦ 여섯 회차가 끝나면 프로 재도전으로 이어진다
 *   ⑧ 변이 검증 — 노력의 최소 보장을 없애면 ②가 무너진다
 *
 * 화면 검사는 게임 입구를 통해 실제 버튼을 눌러 도달한다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
const CAMP = fs.readFileSync(path.join(DIR, "camp.js"), "utf8");

// ---------- 산식 추출 ----------
const parts = {
  turns: grab(CAMP, /const CAMP_TURNS = [^;]+;/),
  tapMs: grab(CAMP, /const TAP_MS = [^;]+;/),
  tapTarget: grab(CAMP, /const TAP_TARGET = [^;]+;/),
  effMin: grab(CAMP, /const EFFORT_MIN = [^;]+;/),
  effMax: grab(CAMP, /const EFFORT_MAX = [^;]+;/),
  gamble: grab(CAMP, /const GAMBLE = \[[\s\S]*?\n {2}\];/),
  gainLine: grab(CAMP, /const gain = Math\.round\([^;]+;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const C = new Function(`${parts.turns}\n${parts.tapMs}\n${parts.tapTarget}
  ${parts.effMin}\n${parts.effMax}\n${parts.gamble}
  return { CAMP_TURNS, TAP_MS, TAP_TARGET, EFFORT_MIN, EFFORT_MAX, GAMBLE };`)();
// 연타 → 상승폭. 소스의 그 줄을 그대로 굴려요.
const gainOf = new Function("taps", "clamp", `${parts.tapTarget}\n${parts.effMin}\n${parts.effMax}
  const ratio = clamp(taps / TAP_TARGET, 0, 1);
  ${parts.gainLine}
  return gain;`);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------- ②③ 노력 ----------
guard("②③ 노력", () => {
  const zero = gainOf(0, clamp), half = gainOf(C.TAP_TARGET / 2, clamp);
  const full = gainOf(C.TAP_TARGET, clamp), over = gainOf(C.TAP_TARGET * 3, clamp);
  console.log(`   연타 0회 +${zero} · ${C.TAP_TARGET / 2}회 +${half} · ${C.TAP_TARGET}회 +${full} · ${C.TAP_TARGET * 3}회 +${over}`);
  check(zero >= C.EFFORT_MIN && zero > 0,
    `한 번도 못 쳐도 오른다 (+${zero}) — 여기가 0이면 "실패해서 특훈 받았는데 특훈도 실패"가 돼요`);
  check(half > zero && full > half, `많이 칠수록 더 오른다 (${zero} < ${half} < ${full})`);
  check(over === full, `상한을 넘겨 쳐도 최대치에서 멈춘다 (${over} = ${full})`);
});

// ---------- ④⑤ 도박 ----------
guard("④⑤ 도박", () => {
  const sum = C.GAMBLE.reduce((a, g) => a + g.p, 0);
  check(Math.abs(sum - 1) < 1e-9, `갈래 확률의 합이 1이다 (${sum.toFixed(3)})`);
  const jack = C.GAMBLE.find((g) => g.key === "jack");
  const hurt = C.GAMBLE.find((g) => g.key === "hurt");
  check(!!jack && jack.p > 0, `🌠 대박 갈래가 있고 실제로 나온다 (${jack ? (jack.p * 100).toFixed(0) : 0}%)`);
  check(!!hurt && hurt.lo < 0, `🤕 잃는 갈래도 있다 (${hurt ? hurt.lo : 0} ~ ${hurt ? hurt.hi : 0}) — 없으면 도박이 아니에요`);
  // 대박이 여섯 회차 안에 한 번쯤은 나와야 "한 번씩 나온다"가 성립해요
  const inCamp = 1 - Math.pow(1 - jack.p, C.CAMP_TURNS);
  console.log(`   ${C.CAMP_TURNS}회차 안에 대박을 볼 확률 ${(inCamp * 100).toFixed(0)}%`);
  check(inCamp >= 0.3 && inCamp <= 0.75,
    `특훈 한 번에 대박을 볼 확률이 30~75%다 (${(inCamp * 100).toFixed(0)}%)`);
  check(jack.lo >= C.EFFORT_MAX * 1.5,
    `대박이 노력 최대치(${C.EFFORT_MAX})보다 확실히 크다 (최소 +${jack.lo})`);

  // 기댓값 — 노력과 비슷해야 선택이 돼요
  const ev = C.GAMBLE.reduce((a, g) => a + g.p * (g.lo + g.hi) / 2, 0);
  const effortMid = gainOf(C.TAP_TARGET * 0.55, clamp);
  console.log(`   도박 기댓값 +${ev.toFixed(2)} · 보통 노력(${Math.round(C.TAP_TARGET * 0.55)}회) +${effortMid}`);
  check(ev >= effortMid * 0.6 && ev <= effortMid * 1.4,
    `도박 기댓값이 노력과 비슷하다 (${ev.toFixed(2)} vs ${effortMid}) — 한쪽이 정답이면 고를 이유가 없어요`);
});

// ---------- ⑧ 변이 검증 ----------
guard("⑧ 변이 검증", () => {
  const broken = parts.gainLine.replace(/EFFORT_MIN \+ /, "0 * EFFORT_MIN + ");
  check(broken !== parts.gainLine, "변이 치환이 실제로 일어났다");
  const badGain = new Function("taps", "clamp", `${parts.tapTarget}\n${parts.effMin}\n${parts.effMax}
    const ratio = clamp(taps / TAP_TARGET, 0, 1);
    ${broken}
    return gain;`);
  console.log(`   최소 보장을 빼면 연타 0회 → +${badGain(0, clamp)}`);
  check(badGain(0, clamp) <= 0,
    "최소 보장을 빼면 한 번도 못 친 사람이 아무것도 못 얻는다 — ②가 그걸 지키고 있어요");
});

// ---------- ①⑥⑦ 화면 ----------
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
check(!!w.WingerCamp, "camp.js가 페이지에서 로드된다 (WingerCamp)");
if (!w.WingerCamp) { console.log("\n❌ 실패"); process.exit(1); }

/* 유스 3년을 실제 버튼으로 굴려 프로 도전까지 간 뒤, 첫 라운드에서 떨어뜨려요.
 * 난수를 0.93 위로 올리면 통과 판정(Math.random() < p, p ≤ 0.93)이 반드시 실패해요. */
function toFailEnding() {
  $("btn-new").click();
  w.document.querySelectorAll("#agency-list .card")[0].click();
  w.document.querySelector('#position-list .card[data-pos="df"]').click();
  $("input-name").value = "테스트";
  $("btn-start").click();
  for (let g = 0; g < 8000; g++) {
    const id = active();
    if (id === "screen-stage") {
      if ((w.__get("ev") || {}).kind === "survival") break;
      $("btn-stage-next").click();
      continue;
    }
    if (id !== "screen-main") throw new Error(`예상 못 한 화면 (${id})`);
    const go = w.document.querySelector("#action-list .go-game");
    if (go) { go.click(); continue; }
    const list = Array.from(w.document.querySelectorAll("#action-list .action-btn"))
      .filter((b) => !b.disabled && b.dataset.key && !b.classList.contains("awaken-act"));
    if (!list.length) throw new Error("육성 화면에 누를 게 없어요");
    (list.find((b) => b.dataset.key === "defense") || list[0]).click();
  }
  /* 난수를 0.11 아래로 내리면 반드시 통과(p ≥ 0.12), 0.93 위로 올리면 반드시 탈락.
   * 1라운드를 통과하고 2라운드에서 떨어뜨려요 — 그래야 🌱 유스 재계약 자리로 갑니다.
   * (0라운드에서 바로 떨어지면 성적에 따라 📹 세미프로나 🎒로 갈려요) */
  const real = w.Math.random;
  const rounds = [true, false];
  for (const pass of rounds) {
    w.Math.random = pass ? () => 0.01 : () => 0.99;
    $("btn-stage-next").click();
    $("btn-stage-next").click();
  }
  w.Math.random = real;
  $("btn-stage-next").click();
  if (active() !== "screen-ending") throw new Error(`엔딩 화면이 아니에요 (${active()})`);
}

guard("①⑥⑦ 특훈 화면", () => {
  toFailEnding();
  const title = $("ending-card").querySelector(".draft-title").textContent;
  const btn = $("btn-youth-ext");
  console.log(`=== ① 실패 엔딩 "${title}" — 버튼 "${btn ? btn.textContent : "없음"}" ===`);
  check(!!btn, `실패 엔딩(${title})에 특훈 버튼이 있다`);
  check(!!btn && btn.textContent.includes("특훈"), `버튼이 특훈이라고 말한다 (${btn ? btn.textContent : ""})`);

  const before = JSON.parse(JSON.stringify(w.__get("S").stats));
  btn.click();
  check(active() === "screen-camp", `누르면 특훈 화면으로 간다 (${active()})`);
  check(w.__get("S").campDone === true, "특훈을 시작하면 커리어당 한 번 표시가 선다");

  // 회차마다 능력치를 고르고, 노력/도박을 번갈아 눌러요
  const cap = w.__get("statCap");
  let gambles = 0;
  for (let t = 0; t < C.CAMP_TURNS; t++) {
    const stat = w.document.querySelector("#camp-actions .camp-stat");
    check(!!stat, `${t + 1}회차 — 능력치 버튼이 그려진다`);
    if (!stat) return;
    stat.click();
    const effort = $("btn-camp-effort"), gamble = $("btn-camp-gamble");
    check(!!effort && !!gamble, `${t + 1}회차 — 💪 노력과 🎲 도박이 둘 다 있다`);
    if (t % 2 === 0) effort.click(); else { gamble.click(); gambles++; }
  }
  console.log(`   여섯 회차 진행 (노력 ${C.CAMP_TURNS - gambles}회 · 도박 ${gambles}회)`);
  const after = w.__get("S").stats;
  const grew = Object.keys(after).filter((k) => after[k] > before[k]).length;
  check(grew >= 1, `특훈으로 능력치가 올랐다 (오른 칸 ${grew}개)`);
  const overCap = Object.keys(after).filter((k) => after[k] > cap(k) + 1e-9);
  const under = Object.keys(after).filter((k) => after[k] < 0);
  check(overCap.length === 0 && under.length === 0,
    `상한·하한을 안 넘는다 (넘은 칸 ${overCap.length + under.length}개)`);

  const done = $("btn-camp-done");
  check(!!done, "여섯 회차가 끝나면 '프로 재도전' 버튼이 뜬다");
  if (done) {
    done.click();
    check(active() === "screen-stage" && (w.__get("ev") || {}).kind === "survival",
      `누르면 프로 재도전으로 이어진다 (${active()} · ${(w.__get("ev") || {}).kind})`);
  }
  // 커리어당 한 번 — 다시 부르면 아무 일도 안 일어나요
  const at = active();
  w.WingerCamp.start();
  check(active() === at, `특훈은 커리어당 한 번이다 — 다시 불러도 안 열린다 (${active()})`);
});

/* ---------- ⑩ 연타가 실제로 뜨는가 (자동 미니게임 OFF) ----------
 *
 * 제보: "노력 버튼 누르면 뭐 연타 치는 게 나와야 하는 거 아니야?? 그냥 바로
 * 훈련된 거로 처리되네."
 * 연타판을 화면 아래에 붙여 뒀는데, 폰에서는 선택 버튼 밑이 이미 접힌 자리라
 * **버튼을 눌러도 안 보였다.** 3초가 그냥 흘러 0타로 끝나니 누르자마자 처리된
 * 것처럼 보였다. 화면 한가운데 레이어로 띄우고, **첫 탭이 있어야 시간이 흐르게** 했다.
 *
 * ⚠️ 위의 ①⑥⑦은 자동 미니게임을 켠 채로 돌아서 이 경로를 한 번도 안 지났다.
 * 그래서 페이지를 새로 열어 **자동을 끄고** 확인한다. */
(() => {
  const dom2 = new JSDOM(
    html.replace('localStorage.setItem("grow-auto-mini", "1");', 'localStorage.setItem("grow-auto-mini", "0");'),
    { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
  const w2 = dom2.window;
  w2.Ads = { display() {}, init() {} };
  w2.Stats = { log() {} };
  const D = w2.document;
  try {
    w2.__set("S", w2.__get('newState(MARKETS[0], "df", "테스트")'));
    w2.WingerCareer.onEnding(true, false);
    D.getElementById("btn-go-debut").click();
    const st = w2.WingerCareer._t.state();
    st.campDone = false; st.youthExt = false;
    w2.WingerCamp.start();
    check(!w2.__get("autoMiniOn")(), "자동 미니게임이 꺼진 상태로 연다");
    D.querySelector("#camp-actions .camp-stat").click();

    // 두 갈래가 나란히, 문구가 능력치 이름을 담는다
    const eff = D.getElementById("btn-camp-effort"), gam = D.getElementById("btn-camp-gamble");
    const back = D.getElementById("btn-camp-back");
    check(!!eff && !!gam && !!back, "노력·도박·다른 능력치 버튼이 다 있다");
    check(D.getElementById("camp-actions").classList.contains("camp-two"),
      "두 갈래가 두 칸으로 놓인다 (셋을 한 줄에 두면 글자가 접혀요)");
    const nm = w2.__get("STAT_DEFS").find((d) => d.key === D.querySelector("#camp-actions .camp-stat, [data-key]").dataset.key);
    console.log(`=== ⑩ 문구 — "${eff.textContent.replace(/\s+/g, " ").slice(0, 40)}" / "${gam.textContent.replace(/\s+/g, " ").slice(0, 30)}" ===`);
    check(!/^💪 노력/.test(eff.textContent.trim()) && /훈련|특훈/.test(eff.textContent),
      "노력 버튼이 '무엇을 하는지'로 적힌다 (장치 이름이 아니라)");
    void nm;

    const turnBefore = w2.WingerCamp._t.state().turn;
    check(!D.querySelector(".tap-overlay"), "누르기 전에는 연타 레이어가 없다");
    eff.click();
    const layer = D.querySelector(".tap-overlay");
    check(!!layer, "노력을 누르면 연타 레이어가 뜬다 — 화면 아래가 아니라 한가운데");
    check(w2.WingerCamp._t.state().turn === turnBefore,
      "레이어가 뜬 시점에는 아직 회차가 안 넘어간다 — 제보의 '바로 처리'가 여기였어요");

    // 실기기와 같은 이벤트로 두드려요
    const btn = D.getElementById("camp-tap-btn");
    const tap = () => btn.dispatchEvent(new w2.Event("pointerdown", { bubbles: true, cancelable: true }));
    for (let i = 0; i < 12; i++) tap();
    check(D.getElementById("camp-tap-count").textContent === "12",
      `두드린 만큼 세어진다 (${D.getElementById("camp-tap-count").textContent})`);
    check(!!D.querySelector(".tap-overlay") && w2.WingerCamp._t.state().turn === turnBefore,
      "두드리는 동안에는 안 끝난다");
  } catch (e) {
    check(false, `⑩ 연타 — ${e.message}`);
  }
  try { w2.close(); } catch { /* 타이머가 남아 있어도 검사에는 영향 없어요 */ }
})();

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
