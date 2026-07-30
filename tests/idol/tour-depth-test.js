/* 🌏 월드투어가 실제 도전인지 — 강행군 · 기세 · 쉬어가기 선택, 그리고 등급 분포.
 *
 * 전부 게임 입구를 통해 봐요. tour-harness.js가 실제 페이지(jsdom)를 띄우고
 * 연말 결산 화면의 버튼을 눌러 투어를 도는 부트스트랩을 갖고 있어요.
 * 산식만 떼어내 검사하면 "함수는 맞는데 화면에서는 못 고르는" 선택지가 통과해요.
 *
 * 개편 전 분포(무작위 500회): S 5.6% · A 71.8% · B 22.6% · C 0% — 사실상 전원 A였어요.
 *
 * 한 도시를 세 무대(🎬 오프닝 · ✨ 킬링파트 · 🔥 앵콜)로 늘린 뒤 다시 쟀어요.
 * 세 번의 평균은 한 번보다 분산이 작아서 분포가 가운데(B)로 뭉치려고 해요.
 * 등급 컷은 그대로 두고 game.js의 TOUR_STAGES 가중치로만 맞췄어요.
 * 지금 분포(무작위 500회): S 11% · A 30% · B 44% · C 16%.
 * 세 무대 구성은 tests/idol/tour-set-test.js가 봐요.
 */
"use strict";
const { boot } = require("/workspace/grow-games/tests/idol/tour-harness.js");

const H = boot();
const T = H.Career._t;

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const rnd = (a, b) => a + Math.random() * (b - a);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const avgFill = (r) => (r.fills.length ? mean(r.fills) : 0);

// ---------- 1. 강행군 — 도시마다 컨디션이 깎여요 ----------
H.setupPro(9000, { condition: 95 });
const r1 = H.runTour({ res: "good" });
check(r1.entered && r1.grade, `투어를 완주한다 (${r1.grade}등급, 도시 ${r1.fills.length}곳)`);
const dropping = r1.conds.every((c, i) => i === 0 || c < r1.conds[i - 1]);
check(r1.conds.length >= 4 && dropping, `도시를 돌 때마다 컨디션이 깎인다 (${r1.conds.map(Math.round).join(" → ")})`);
check(r1.conds[r1.conds.length - 1] < r1.conds[0] - 25,
  `투어 끝에는 컨디션이 크게 떨어져 있다 (${Math.round(r1.conds[0])} → ${Math.round(r1.conds[r1.conds.length - 1])})`);
// 뒤로 갈수록 한 도시가 더 깎여요 — 후반이 고비가 되게요
const drops = r1.conds.slice(1).map((c, i) => r1.conds[i] - c);
check(mean(drops.slice(Math.ceil(drops.length / 2))) > mean(drops.slice(0, Math.floor(drops.length / 2))),
  `후반 도시가 더 많이 깎인다 (${drops.map(Math.round).join(" / ")})`);

// ---------- 2. 컨디션이 낮으면 같은 판정에서도 객석이 낮아요 ----------
check(T.tourCondMul(95) > T.tourCondMul(50) && T.tourCondMul(50) > T.tourCondMul(10),
  `컨디션이 낮을수록 객석 배수가 낮다 (95:${T.tourCondMul(95).toFixed(2)} / 50:${T.tourCondMul(50).toFixed(2)} / 10:${T.tourCondMul(10).toFixed(2)})`);
function sampleFills(n, opts, policy) {
  const out = [];
  for (let i = 0; i < n; i++) { H.setupPro(2000, opts); out.push(avgFill(H.runTour(policy))); }
  return mean(out);
}
// 미니게임 판정을 "good"으로 고정했으니, 차이는 컨디션에서만 와요
const hiCond = sampleFills(120, { condition: 100 }, { res: "good" });
const loCond = sampleFills(120, { condition: 50 }, { res: "good" });
check(hiCond > loCond + 0.05,
  `같은 미니게임 결과라도 컨디션이 낮으면 객석이 낮다 (컨디션 100 → ${(hiCond * 100).toFixed(1)}% / 50 → ${(loCond * 100).toFixed(1)}%)`);

// ---------- 3. 기세 — 연속 만석이 눈덩이가 되고, 한 번 망하면 리셋돼요 ----------
/* 같은 도시(3번째)의 객석을 비교해요. 컨디션 소모는 판정과 무관하니 두 표본의
 * 컨디션 경로는 같고, 다른 건 기세뿐이에요.
 *   keep  : perfect · perfect · perfect  → 3번째 도시에서 기세 2
 *   break : perfect · miss    · perfect  → 3번째 도시에서 기세 0 */
function thirdCityFill(pattern) {
  const out = [];
  for (let i = 0; i < 150; i++) {
    H.setupPro(2000, { condition: 100 });
    const r = H.runTour({ res: () => pattern[H.tourState().i] || "perfect" });
    out.push(r.fills[2]);
  }
  return mean(out);
}
const keep = thirdCityFill(["perfect", "perfect", "perfect"]);
const broke = thirdCityFill(["perfect", "miss", "perfect"]);
check(keep > broke + 0.03,
  `연속 만석 뒤 객석이 더 높다 (기세 유지 ${(keep * 100).toFixed(1)}% / 한 번 망침 ${(broke * 100).toFixed(1)}%)`);

H.setupPro(2000, { condition: 100 });
H.Career.showActivity();
H.tourButton().click();
H.set("autoRes", () => "perfect");
H.$("btn-tour-go").click();                       // 1번째 도시 — 만석
check(H.tourState().streak === 1, `만석이면 기세가 쌓인다 (${H.tourState().streak})`);
H.$("btn-tour-go").click();                       // 다음 도시로
H.set("autoRes", () => "miss");
H.$("btn-tour-go").click();                       // 2번째 도시 — 실패
check(H.tourState().streak === 0, `한 번 못 채우면 기세가 리셋된다 (${H.tourState().streak})`);

// ---------- 4. 쉬어가기 선택지가 화면에 뜨는 조건 ----------
H.setupPro(2000, { condition: 100 });
H.Career.showActivity();
H.tourButton().click();
check(!H.restButton(), "컨디션이 넉넉하면 쉬어가기 선택지가 안 보인다");
H.setupPro(2000, { condition: 50 });
H.Career.showActivity();
H.tourButton().click();
const rest0 = H.restButton();
check(!!rest0, "컨디션이 낮으면 첫 도시부터 🛌 쉬어가기 선택지가 뜬다");
check(!!rest0 && /쉬어가기/.test(rest0.textContent), `선택지 문구가 쉬어가기라고 말한다 (${rest0 && rest0.textContent})`);

// ---------- 5. 쉬면 컨디션이 회복되고 그 도시 객석은 낮게 확정돼요 ----------
const condBeforeRest = H.tourState().cond;
rest0.click();
const t5 = H.tourState();
check(t5.cond > condBeforeRest + 15, `쉬면 컨디션이 회복된다 (${Math.round(condBeforeRest)} → ${Math.round(t5.cond)})`);
check(t5.fills.length === 1 && t5.fills[0] < 0.45, `쉰 도시는 객석이 낮게 확정된다 (${Math.round(t5.fills[0] * 100)}%)`);
check(t5.streak === 0, "쉬면 기세가 끊긴다");
check(t5.notes[0] === "rest", "쉬어간 도시가 기록에 남는다");
// 컨디션이 회복되면 선택지가 다시 사라져요
check(!H.restButton(), "쉰 뒤 컨디션이 넉넉해지면 선택지가 사라진다");

// ---------- 6. 등급이 실제로 갈려요 ----------
function dist(n, policy, opts) {
  const d = { S: 0, A: 0, B: 0, C: 0, none: 0 };
  let fills = 0, cancels = 0, cities = 0, minFan = Infinity, minMoney = Infinity, years = true;
  for (let i = 0; i < n; i++) {
    const S = H.setupPro(opts.fandom(), opts.each ? opts.each() : {});
    const r = H.runTour(policy);
    d[r.grade || "none"]++;
    fills += avgFill(r);
    cities += r.fills.length;
    cancels += r.fills.filter((x) => x === 0).length;
    minFan = Math.min(minFan, S.fandom - r.before.fandom);
    minMoney = Math.min(minMoney, S.money - r.before.money);
    if (S.career.years.length !== r.before.years) years = false;
    if (S.career.tours !== r.before.tours + 1) years = false;
  }
  return { d, avg: fills / n, cancels, cities, minFan, minMoney, years, n };
}
const pc = (r, k) => `${k} ${(r.d[k] / r.n * 100).toFixed(1)}%`;
const line = (name, r) => `${name}: ${["S", "A", "B", "C"].map((k) => pc(r, k)).join(" · ")} (평균 객석 ${(r.avg * 100).toFixed(1)}%)`;

const spread = { fandom: () => Math.round(rnd(2000, 9000)), each: () => ({ stat: Math.round(rnd(90, 132)), condition: Math.round(rnd(50, 95)) }) };
const perf = dist(200, { res: "perfect" }, spread);
const bad = dist(200, { res: "miss" }, spread);
console.log(`   ${line("전부 perfect", perf)}`);
console.log(`   ${line("전부 miss   ", bad)}`);
const topOf = (r) => ["S", "A", "B", "C"].reduce((a, k) => (r.d[k] > r.d[a] ? k : a), "S");
check(topOf(perf) !== topOf(bad), `미니게임을 잘하냐 못하냐로 등급이 갈린다 (perfect→${topOf(perf)} / miss→${topOf(bad)})`);
check(perf.d.S >= 100, `잘하면 S에 도달한다 (200회 중 ${perf.d.S}회)`);
check(bad.d.C === 200, `전부 실패하면 전원 C다 (${bad.d.C}/200)`);

// ---------- 7. 전원 S가 아니에요 — 무작위 플레이 500회 ----------
/* '무작위 플레이'는 게임의 자동 판정(autoRes)에 맡기고, 쉬어가기 문턱도
 * 사람마다 다르게 흔들어요 (아예 안 쉬는 사람부터 조금만 지쳐도 쉬는 사람까지). */
const randPolicy = () => { const th = rnd(0, 42); return { rest: (info) => info.cond < th }; };
const roll = { fandom: spread.fandom, each: spread.each };
const rd = { d: { S: 0, A: 0, B: 0, C: 0, none: 0 }, n: 500, avg: 0, cancels: 0, cities: 0, minFan: Infinity, minMoney: Infinity, years: true };
for (let i = 0; i < 500; i++) {
  const S = H.setupPro(roll.fandom(), roll.each());
  const r = H.runTour(randPolicy());
  rd.d[r.grade || "none"]++;
  rd.avg += avgFill(r) / 500;
  rd.cities += r.fills.length;
  rd.cancels += r.fills.filter((x) => x === 0).length;
  rd.minFan = Math.min(rd.minFan, S.fandom - r.before.fandom);
  rd.minMoney = Math.min(rd.minMoney, S.money - r.before.money);
  if (S.career.years.length !== r.before.years) rd.years = false;
}
console.log(`   ${line("무작위 500회", rd)}`);
check(rd.d.S / 500 < 0.4, `S등급 비율이 40% 미만이다 (${(rd.d.S / 500 * 100).toFixed(1)}%)`);
check(rd.d.S > 0 && rd.d.A > 0 && rd.d.B > 0 && rd.d.C > 0, "S·A·B·C가 모두 나온다");
check(rd.d.C / 500 > 0.05, `조건만 겨우 채운 판은 C로 떨어진다 (C ${(rd.d.C / 500 * 100).toFixed(1)}%)`);
/* 등급 컷이 새 분포에 맞아야 해요. "네 등급이 다 나온다"만 보면 컷이 낡아도
 * 통과해요 — 예전 컷(0.95 / 0.80 / 0.60)을 그대로 두면 B가 60%를 먹는데도
 * S·A·B·C가 전부 한 번씩은 나오니까요. 그게 바로 시시했던 이유예요.
 * 그래서 어느 등급도 절반을 넘지 않고, 모두 5% 이상은 나오는지까지 봐요. */
const ratios = ["S", "A", "B", "C"].map((k) => rd.d[k] / 500);
check(Math.max(...ratios) <= 0.5,
  `어느 한 등급이 절반을 먹지 않는다 (최다 ${(Math.max(...ratios) * 100).toFixed(1)}%)`);
check(Math.min(...ratios) >= 0.05,
  `네 등급이 모두 5% 이상 나온다 (최소 ${(Math.min(...ratios) * 100).toFixed(1)}%)`);
check(rd.d.none === 0, "완주하지 못한 판이 없다 (클릭만으로 끝까지 갈 수 있다)");

// ---------- 8. 망해도 팬덤·자금·기록은 줄지 않아요 (취소가 나도) ----------
check(rd.minFan >= 0 && rd.minMoney >= 0,
  `무작위 500회에서 팬덤·자금이 한 번도 줄지 않는다 (최소 증가 💖${rd.minFan} 💰${rd.minMoney})`);
check(rd.years, "활동 기록이 사라지지 않고 완주한 투어만 세어진다");
// 취소가 실제로 나는 상황을 만들어요 — 컨디션이 바닥인데 한 번도 안 쉬는 강행
const wreck = dist(150, { res: "miss", rest: () => false }, { fandom: () => 9000, each: () => ({ condition: 30, stat: 90 }) });
console.log(`   ${line("바닥 컨디션 강행", wreck)} · 취소 ${wreck.cancels}/${wreck.cities}도시`);
check(wreck.cancels > 0, `컨디션이 바닥이면 공연이 취소된다 (${wreck.cancels}건)`);
check(wreck.minFan >= 0 && wreck.minMoney >= 0,
  `취소가 나도 팬덤·자금이 줄지 않는다 (최소 증가 💖${wreck.minFan} 💰${wreck.minMoney})`);
check(wreck.years, "취소가 나도 기록이 남고 완주로 세어진다");
check(wreck.d.none === 0, "취소가 나도 끝까지 완주할 수 있다");
// 쉬어가기는 취소를 막는 안전판이에요
const saved = dist(150, { res: "miss", rest: () => true }, { fandom: () => 9000, each: () => ({ condition: 30, stat: 90 }) });
check(saved.cancels < wreck.cancels, `쉬어가면 취소가 줄어든다 (강행 ${wreck.cancels}건 → 쉼 ${saved.cancels}건)`);

// ---------- 9. 옛 세이브 방어 — 새 필드 없이 떠나도 안 던져요 ----------
let threw = null;
try {
  const S = H.setupPro(9000);
  delete S.condition;          // 컨디션 개념이 없던 시절의 세이브
  delete S.tourBest;
  const r9 = H.runTour({});
  check(!!r9.grade, `condition이 없는 세이브로도 완주한다 (${r9.grade}등급)`);
} catch (e) { threw = e; }
check(!threw, `옛 세이브로 투어를 시작해도 던지지 않는다${threw ? ` — ${threw.message}` : ""}`);

// ---------- 10. 버그 두 개 (Task 2) ----------
H.setupPro(9000, { condition: 95 });
H.Career.showActivity();
const enterBtn = H.tourButton();
check(enterBtn.textContent.length <= 14,
  `투어 시작 버튼이 짧다 (${enterBtn.textContent.length}자 · "${enterBtn.textContent}")`);
enterBtn.click();
const n10 = H.tourState().cities.length;
check(H.$("tour-city").textContent.includes(`/${n10}번째`),
  `투어 화면에 도시 수가 표시된다 (${H.$("tour-city").textContent})`);
const city1 = H.tourState().cities[0];
H.set("autoRes", () => "good");
H.$("btn-tour-go").click();
check(H.$("tour-log").textContent.includes(city1), "첫 도시 화면에는 첫 도시 로그가 있다");
H.$("btn-tour-go").click();                       // 2번째 도시로
check(!H.$("tour-log").textContent.includes(city1),
  `2번째 도시 화면에 첫 도시(${city1}) 로그가 남지 않는다`);
check(H.$("tour-log").textContent.includes(H.tourState().cities[1]),
  "2번째 도시 화면에는 그 도시 이름이 있다");
check(H.$("tour-result").textContent.includes(city1),
  "지나온 도시의 객석 기록은 결과 칸에 남아 있다");

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
