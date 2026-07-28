/* 월드투어 열림 조건과 진행. 열림 수치(대상 몇 회 · 팬덤 몇)는 임시라, 여기서는
 * "숫자가 정확히 얼마냐"가 아니라 "조건이 or로 동작하냐"만 본다. 소스의 상수를
 * 그대로 읽어서 쓰기 때문에, Task 7에서 수치를 조정해도 이 테스트는 그대로 통과한다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");

const dm = SRC.match(/const TOUR_DAESANG\s*=\s*(\d+)/);
const fm = SRC.match(/const TOUR_FANDOM\s*=\s*(\d+)/);
if (!dm || !fm) { console.log("❌ TOUR_DAESANG · TOUR_FANDOM 상수를 못 찾았어요"); process.exit(1); }
const TOUR_DAESANG = Number(dm[1]);
const TOUR_FANDOM = Number(fm[1]);

// tourReady는 같은 위치에 선언된 TOUR_DAESANG/TOUR_FANDOM 상수를 클로저로 참조하므로
// 함수 본문만 떼어내면 안 되고, 상수 선언 두 줄부터 같이 뽑아야 한다.
const m = SRC.match(/const TOUR_DAESANG[\s\S]*?function tourReady\(\)[\s\S]*?\n  \}/);
if (!m) { console.log("❌ tourReady를 못 찾았어요"); process.exit(1); }

let S;
const tourReady = new Function("getS", `${m[0].replace(/\bS\./g, "getS().")}; return tourReady;`)(() => S);

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const mk = (dae, fandom) => ({ career: { daesang: dae, tours: 0 }, fandom });

S = mk(0, 0);
check(!tourReady(), "갓 데뷔하면 안 열린다");

S = mk(TOUR_DAESANG - 1, TOUR_FANDOM - 1);
check(!tourReady(), `대상 ${TOUR_DAESANG - 1}회 · 팬덤 ${TOUR_FANDOM - 1}로는 안 열린다 (둘 다 기준 미달)`);

S = mk(TOUR_DAESANG, 0);
check(tourReady(), `대상 ${TOUR_DAESANG}회면 열린다`);

S = mk(0, TOUR_FANDOM);
check(tourReady(), `팬덤 ${TOUR_FANDOM}이면 열린다`);

S = mk(TOUR_DAESANG, TOUR_FANDOM);
check(tourReady(), "둘 다면 당연히 열린다");

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
