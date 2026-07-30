/* 🌏 월드투어 전용 무대 — 한 도시 = 콘서트 한 편(🎬 오프닝 · ✨ 킬링파트 · 🔥 앵콜).
 *
 * 전부 게임 입구를 통해 봐요. tour-harness.js가 실제 페이지(jsdom)를 띄우고
 * 연말 결산 화면의 버튼을 눌러 투어를 도는 부트스트랩이에요.
 *
 * 여기서는 자동 판정을 끄고 window.Timing을 기록용으로 갈아끼워요. 그러면
 * "사람이 실제로 미니게임을 하는 경로"가 그대로 돌면서, 어떤 메커닉이 몇 번
 * 불렸고 문구가 무엇이었는지까지 볼 수 있어요. 자동 플레이 경로는 8번에서
 * 따로 봐요 — 확인 페이지와 다른 테스트가 그 경로로 도니까요.
 *
 * 등급 분포(무작위 500회)와 보상 안전장치는 tour-depth-test.js가 봐요.
 */
"use strict";
const { boot } = require("/workspace/grow-games/tests/idol/tour-harness.js");

const H = boot();
const { w, $ } = H;

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/* ---------- Timing을 기록용으로 갈아끼워요 ----------
 * 게임은 window.Timing을 호출할 때마다 찾아가니(캐시하지 않아요) 이렇게 덮으면
 * 실제 사람 경로가 그대로 돌아요. cb를 바로 부르니 한 클릭에 세 무대가 끝나요. */
const MECHS = ["play", "hold", "sequence", "reaction", "duel", "target", "drop", "odd"];
const realTiming = w.Timing;
let calls = [];
let nextRes = () => "good";
const spy = {};
for (const k of MECHS) {
  spy[k] = (box, opts, cb) => {
    calls.push({ mech: k, label: String(opts.label || "") });
    cb(nextRes(calls.length - 1));
  };
}
const manual = () => { w.localStorage.setItem("grow-auto-mini", "0"); w.Timing = spy; };
const auto = () => { w.localStorage.setItem("grow-auto-mini", "1"); w.Timing = realTiming; };

// 투어 화면에 들어가 첫 도시 앞에 서요 (게임 입구를 통해서만)
function enterTour(opts) {
  const S = H.setupPro((opts && opts.fandom) || 2000, opts || {});
  H.Career.showActivity();
  const btn = H.tourButton();
  if (!btn) throw new Error("월드투어 버튼이 없어요");
  btn.click();
  return S;
}
// 도시 한 곳을 공연해요 → 그 도시 객석(fill)을 돌려줘요
function playCity() {
  calls = [];
  const before = H.tourState().fills.length;
  $("btn-tour-go").click();
  const t = H.tourState();
  return t.fills.length > before ? t.fills[t.fills.length - 1] : null;
}
const nextCity = () => $("btn-tour-go").click();

// ---------- 1. 한 도시에서 미니게임이 세 번 돌아요 ----------
manual();
enterTour({ condition: 95 });
playCity();
check(calls.length === 3, `한 도시에서 미니게임이 세 번 돌아간다 (${calls.length}번)`);
const setLog = $("tour-log").textContent;
check(/1\/3/.test(setLog) && /2\/3/.test(setLog) && /3\/3/.test(setLog),
  "세 무대가 1/3 · 2/3 · 3/3으로 안내된다");
check(/오프닝/.test(setLog) && /킬링파트/.test(setLog) && /앵콜/.test(setLog),
  "오프닝 · 킬링파트 · 앵콜이 모두 무대에 오른다");
// 🎼 세트리스트가 화면에 실제로 보여요 (진행 표시가 없으면 그냥 미니게임 3연타예요)
const strip = $("tour-set");
check(!!strip, "세트리스트 칸이 화면에 있다");
check(!!strip && strip.querySelectorAll(".tour-stage").length === 3,
  `세트리스트에 세 무대가 다 서 있다 (${strip ? strip.querySelectorAll(".tour-stage").length : 0}칸)`);

// ---------- 2. 세 무대의 메커닉이 서로 다르다 (200회) ----------
let sameCombo = 0;
const seenMech = new Set();
const combos = new Set();
for (let i = 0; i < 200; i++) {
  if (i % 4 === 0) enterTour({ condition: 95 });
  else nextCity();
  playCity();
  const ms = calls.map((c) => c.mech);
  ms.forEach((m) => seenMech.add(m));
  combos.add(ms.join(">"));
  if (new Set(ms).size !== 3) sameCombo++;
}
check(sameCombo === 0, `200회 내내 세 메커닉이 서로 다르다 (같은 게 두 번 나온 도시 ${sameCombo}곳)`);
check(seenMech.size >= 6, `여러 메커닉이 실제로 쓰인다 (${seenMech.size}종: ${[...seenMech].join(" ")})`);
check(combos.size >= 8, `세트 조합이 매번 달라진다 (${combos.size}가지)`);
// 새 엔진을 만들지 않았어요 — 전부 window.Timing의 기존 8종이에요
check([...seenMech].every((m) => MECHS.includes(m)), "전부 기존 window.Timing 메커닉이다");

// ---------- 3. 앵콜 가중치가 가장 크다 ----------
/* 앵콜만 perfect(나머지 miss) vs 앵콜만 miss(나머지 perfect)를 같은 조건에서 비교해요.
 * 컨디션 경로는 판정과 무관하니, 차이는 세 무대의 가중치에서만 와요. */
function fillWith(pattern) {
  const out = [];
  for (let i = 0; i < 200; i++) {
    if (i % 4 === 0) enterTour({ condition: 100 });
    else nextCity();
    nextRes = (i2) => pattern[i2];
    out.push(playCity());
  }
  nextRes = () => "good";
  return mean(out);
}
const encoreOK = fillWith(["miss", "miss", "perfect"]);
const encoreNG = fillWith(["perfect", "perfect", "miss"]);
check(encoreOK > encoreNG,
  `앵콜만 살린 쪽이 객석이 높다 — 앵콜이 가장 무겁다 (앵콜 perfect ${(encoreOK * 100).toFixed(1)}% / 앵콜 miss ${(encoreNG * 100).toFixed(1)}%)`);
// 오프닝 < 킬링파트 < 앵콜 순으로 무거워요
const onlyOpen = fillWith(["perfect", "miss", "miss"]);
const onlyKill = fillWith(["miss", "perfect", "miss"]);
check(onlyOpen < onlyKill && onlyKill < encoreOK,
  `무게가 오프닝 < 킬링파트 < 앵콜 순이다 (${(onlyOpen * 100).toFixed(1)}% < ${(onlyKill * 100).toFixed(1)}% < ${(encoreOK * 100).toFixed(1)}%)`);
// 세 무대가 다 합쳐져요 — 앵콜만 보는 게 아니에요
const allPerf = fillWith(["perfect", "perfect", "perfect"]);
check(allPerf > encoreOK + 0.05,
  `앵콜만 잘해도 세 무대를 다 잘한 것만 못하다 (전부 perfect ${(allPerf * 100).toFixed(1)}% / 앵콜만 ${(encoreOK * 100).toFixed(1)}%)`);

// ---------- 4. 문구가 투어 전용이다 ----------
/* 컴백 무대의 문구가 투어에 한 줄도 새어 나오지 않아야 해요. */
const CB_TEXT = [
  "킬링파트! 초록 존에서 포인트를", "클라이맥스 고음", "포인트 안무! 순서를 기억했다가",
  "개인 직캠 타임", "포토타임", "마이크 캐치", "안무 디테일", "엔딩 요정 자리 싸움",
  "킬링파트를 완벽하게! 객석이 터져나가요", "무대를 찢었다", "직캠 화력 폭발",
  "0.1초 만에 찾은 렌즈", "동선이 꼬여 화면 밖으로",
];
manual();
const S4 = enterTour({ condition: 95 });
const city4 = H.tourState().cities[0];
nextRes = () => "perfect";
playCity();
const log4 = $("tour-log").textContent;
const leaked = CB_TEXT.filter((t) => log4.includes(t) || calls.some((c) => c.label.includes(t)));
check(leaked.length === 0, `컴백 무대 문구가 투어에 안 나온다${leaked.length ? ` — 새어 나온 문구: ${leaked.join(" / ")}` : ""}`);
check(calls.every((c) => c.label.includes(city4)),
  `세 무대 안내에 모두 도시 이름이 들어간다 (${city4})`);
check(/[가-힣]+ 오프닝|오프닝 —/.test(log4), "무대 안내가 로그에도 남는다");

/* 🗣 현지 함성 — 도시마다 객석 소리가 달라야 "월드투어를 돌고 있다"는 느낌이 나요.
 * 도시를 여럿 돌면서 로그에 따온 함성을 도시별로 모아요. */
const cheerBy = new Map();
for (let i = 0; i < 60; i++) {
  if (i % 4 === 0) enterTour({ condition: 95 });
  else nextCity();
  const t = H.tourState();
  const cityNow = t.cities[t.i];
  nextRes = () => "perfect";
  playCity();
  const m = $("tour-log").textContent.match(/"([^"]+)"/);
  if (m) cheerBy.set(cityNow, m[1]);
}
nextRes = () => "good";
check(cheerBy.size >= 6, `여러 도시의 함성을 봤다 (${cheerBy.size}개 도시)`);
check(new Set(cheerBy.values()).size >= 5,
  `도시마다 함성이 다르다 (${[...cheerBy].slice(0, 5).map(([c, y]) => `${c}="${y}"`).join(" · ")})`);
check(!cheerBy.has("도쿄") || cheerBy.get("도쿄").includes("サイコー"),
  `도쿄에서는 일본어 함성이 들린다 (${cheerBy.get("도쿄") || "이번엔 도쿄를 안 돌았어요"})`);
check(!cheerBy.has("파리") || cheerBy.get("파리").includes("Magnifique"),
  `파리에서는 파리 함성이 들린다 (${cheerBy.get("파리") || "이번엔 파리를 안 돌았어요"})`);

// ---------- 5. playRandomMini는 그대로다 — 컴백 무대는 여전히 한 번 ----------
/* 컴백을 게임 입구로 실제 진행해요: 준비 화면 → 컨셉 → 공개 → 무대 → 하이라이트. */
manual();
{
  const S = H.setupPro(2000, { condition: 90 });
  S.camp = 1;
  S.activity = null;
  H.Career.showActivity();
  const restBtn = () => Array.from(w.document.querySelectorAll("#pro-actions .action-btn"))
    .find((b) => b.dataset.key === "__rest" && !b.disabled);
  const goBtn = () => w.document.querySelector("#pro-actions .go-game");
  let guard = 0;
  while (!goBtn() && guard++ < 12) restBtn().click();
  check(!!goBtn(), "준비 화면에서 컴백 시작 버튼에 닿는다");
  goBtn().click();                                              // 컨셉 화면
  const card = w.document.querySelector("#screen-concept .concept-card");
  check(!!card, "컨셉 화면이 뜬다");
  card.click();                                                 // 공개 화면
  $("btn-reveal-go").click();                                   // 무대 시작
  calls = [];
  $("btn-stage-next").click();                                  // ⏩ 빨리 감기 → 하이라이트
  check(calls.length === 1, `컴백 무대는 여전히 미니게임 한 번이다 (${calls.length}번)`);
  const cbLog = $("pbp-cb") ? $("pbp-cb").textContent : "";
  check(!/1\/3/.test(cbLog) && !/오프닝/.test(cbLog),
    "컴백 무대에는 투어 세트(오프닝·앵콜)가 안 나온다");
  check(!/[가-힣]+ 오프닝/.test(calls[0] ? calls[0].label : ""),
    `컴백 미니게임 문구는 컴백 것이다 ("${calls[0] ? calls[0].label.slice(0, 24) : ""}…")`);
}

// ---------- 6. 세 무대가 실패해도 흐름이 안 막힌다 ----------
manual();
enterTour({ condition: 95 });
nextRes = () => "miss";
const missFill = playCity();
check(missFill !== null && missFill < 0.7, `세 무대를 다 놓쳐도 객석이 확정된다 (${Math.round(missFill * 100)}%)`);
check(!$("btn-tour-go").disabled, "세 무대가 끝나면 다음 도시 버튼이 살아난다");
nextRes = () => "good";

// ---------- 7. 무대가 끝날 때마다 세트리스트에 결과가 찍힌다 ----------
manual();
enterTour({ condition: 95 });
nextRes = (i) => (i === 0 ? "perfect" : i === 1 ? "good" : "miss");
playCity();
const chips = Array.from($("tour-set").querySelectorAll(".tour-stage"));
check(chips.length === 3 && chips.every((c) => c.className.includes("done")),
  "세 무대가 다 끝나면 세트리스트 세 칸이 모두 완료로 바뀐다");
check(chips[0].className.includes("perfect") && chips[1].className.includes("good") && chips[2].className.includes("miss"),
  `세트리스트가 무대별 판정을 그대로 보여준다 (${chips.map((c) => c.textContent.trim()).join(" · ")})`);
nextRes = () => "good";

// ---------- 8. 자동 플레이(autoMiniOn)로도 완주된다 ----------
auto();
{
  H.setupPro(9000, { condition: 90 });
  const r = H.runTour({ res: "good" });
  check(r.entered && !!r.grade, `자동 플레이로 완주해 등급이 나온다 (${r.grade}등급, 도시 ${r.fills.length}곳)`);
  check(r.clicks < 60, `클릭만으로 끝까지 간다 (${r.clicks}번)`);
  // 자동 경로에서도 판정이 도시마다 세 번 불려요
  let n = 0;
  H.setupPro(9000, { condition: 90 });
  const r2 = H.runTour({ res: () => { n++; return "good"; } });
  check(n === r2.fills.length * 3,
    `자동 판정도 도시마다 세 번 불린다 (${r2.fills.length}도시 × 3 = ${r2.fills.length * 3} / 실제 ${n})`);
  check($("tour-log").textContent.includes("앵콜"), "자동 플레이 로그에도 앵콜 무대가 남는다");
}

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
