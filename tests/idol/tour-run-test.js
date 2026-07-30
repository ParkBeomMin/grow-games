/* 월드투어를 끝까지 돌려 등급과 보상이 나오는지. 실패해도 커리어가 안 끝나는지.
 *
 * 산식만 보면 "함수는 있는데 브라우저에선 못 가는" 기능이 그대로 통과해요.
 * 그래서 여기서는 실제 DOM(jsdom)에 페이지를 통째로 띄우고,
 * 연말 결산 화면의 버튼을 눌러 투어 화면에 들어가 도시를 전부 도는 것까지 봐요.
 *
 * 부트스트랩은 tour-harness.js로 옮겼어요 — tour-depth-test.js와 같이 씁니다.
 * 이 파일은 "완주하고 보상을 받고 커리어가 이어지느냐"만 봐요.
 * 강행군·기세·쉬어가기 선택과 등급 분포는 tour-depth-test.js가 봐요.
 */
"use strict";
const { boot } = require("/workspace/grow-games/tests/idol/tour-harness.js");

const H = boot();
const { $, activeScreen, get, Career, setupPro, tourButton } = H;

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// ---------- 1. 등급 산식 ----------
check(!!Career, "Career 모듈이 로드된다");
check(typeof Career?._t?.tourGrade === "function", "tourGrade가 노출된다");
if (!Career || !Career._t || !Career._t.tourGrade) { console.log("\n❌ 실패"); process.exit(1); }

const g = Career._t.tourGrade;
check(g(1.0) === "S", `전 도시 만석이면 S (${g(1.0)})`);
check(g(0.5) === "C" || g(0.5) === "B", `절반이면 B~C (${g(0.5)})`);
check(g(0) === "C", `아무도 안 오면 C (${g(0)})`);

// ---------- 2. 실제 화면에서 열고 완주하기 ----------
check(typeof get === "function" && get("typeof S") === "object", "게임 전역(S) 접근 가능");

// 아직 조건 미달이면 버튼이 없어야 해요
setupPro(100).career.daesang = 0;
Career.showActivity();
check(activeScreen() === "screen-career", "연말 결산 화면이 뜬다");
check(!tourButton(), "조건 미달이면 월드투어 버튼이 없다");

// 조건을 채우면 결산 화면에서 투어로 갈 수 있어요
let S = setupPro(9000);
Career.showActivity();
check(!!tourButton(), "조건을 채우면 결산 화면에 월드투어 버튼이 생긴다");
if (!tourButton()) { console.log("\n❌ 실패"); process.exit(1); }
/* 🐛 옆의 "💿 N년차 컴백 준비"(12자)와 나란히 서서 폭이 절반이에요.
 * 도시 수까지 괄호로 붙였던 시절엔 "🌏 월드투어 떠나기 (4개…"로 잘렸어요. */
check(tourButton().textContent.length <= 14,
  `버튼 문구가 짧아 안 잘린다 (${tourButton().textContent.length}자 · "${tourButton().textContent}")`);

/* 투어를 한 번 완주시켜요 — 클릭만으로 끝까지 가는지(=브라우저에서 실제로
 * 완주 가능한지)를 봅니다. 쉬어가기 선택지가 떠도 무시하고 계속 강행해요.
 * 강행만 하는 흐름도 막히지 않고 끝까지 가야 해요. */
const r1 = H.runTour({});
check(r1.onTour, "버튼을 누르면 월드투어 화면으로 넘어간다");
check(r1.clicks >= 4, `도시마다 공연을 눌러 진행한다 (버튼 ${r1.clicks}번)`);
check(["S", "A", "B", "C"].includes(r1.grade), `완주하면 등급이 나온다 (${r1.grade})`);
check(S.career.tours === 1, `완주한 투어만 tours로 세어진다 (${S.career.tours})`);
check(S.fandom >= r1.before.fandom, `팬덤이 줄지 않는다 (${r1.before.fandom} → ${S.fandom})`);
check(S.money >= r1.before.money, `자금이 줄지 않는다 (${r1.before.money} → ${S.money})`);

// 결산으로 되돌아와야 커리어가 이어져요
r1.btn.click();
check(activeScreen() === "screen-career", "투어를 마치면 결산 화면으로 돌아온다");
check(get("typeof S") === "object" && S.phase === "idol-pro", "투어 뒤에도 커리어가 계속된다");
check(!tourButton(), "같은 해에는 다시 못 떠난다");

// ---------- 3. 쉬어가기를 골라도 완주할 수 있어요 ----------
/* 컨디션이 낮으면 도시 앞에서 🛌 쉬어가기가 뜨는데, 그쪽만 골라도 흐름이
 * 막히지 않아야 해요. 강행 버튼만 있던 시절의 클릭 흐름이 갈라진 지점이에요. */
S = setupPro(9000, { condition: 50 });
S.proYear += 1;
S.career.years.push({ y: S.proYear, hype: 7, wins: 3, sales: 110, dFan: 60, awards: [] });
const rRest = H.runTour({ rest: () => true });
check(rRest.restOffers > 0, `컨디션이 낮으면 쉬어가기 선택지가 뜬다 (${rRest.restOffers}회 제안)`);
check(rRest.rests > 0, `쉬어가기를 실제로 고를 수 있다 (${rRest.rests}곳에서 쉼)`);
check(["S", "A", "B", "C"].includes(rRest.grade), `쉬어가도 완주해 등급이 나온다 (${rRest.grade})`);
check(S.fandom >= rRest.before.fandom && S.money >= rRest.before.money, "쉬어가도 팬덤·자금이 줄지 않는다");
rRest.btn.click();
check(activeScreen() === "screen-career", "쉬어간 투어도 결산 화면으로 돌아온다");

// ---------- 4. 대실패해도 잃는 게 없어야 해요 ----------
S.proYear += 1;                  // 다음 해 — 다시 도전할 수 있어요
S.career.years.push({ y: S.proYear, hype: 6, wins: 2, sales: 90, dFan: 40, awards: [] });
Career.showActivity();
check(!!tourButton(), "다음 해에는 다시 도전할 수 있다");
const r2 = H.runTour({ res: "miss" });   // 모든 도시에서 미니게임 실패
check(r2.grade === "C", `전부 실패하면 C 등급 (${r2.grade})`);
check(S.fandom >= r2.before.fandom, `실패해도 팬덤이 안 깎인다 (${r2.before.fandom} → ${S.fandom})`);
check(S.money >= r2.before.money, `실패해도 자금이 안 깎인다 (${r2.before.money} → ${S.money})`);
check(S.career.years.length === r2.before.years, "실패해도 활동 기록이 사라지지 않는다");
r2.btn.click();
check(activeScreen() === "screen-career" && S.phase === "idol-pro", "실패해도 커리어가 끝나지 않는다");

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
