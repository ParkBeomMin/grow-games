/* 🗣️ 유스 라운드 판정을 감독의 말로 전하는지 본다.
 *
 * 처음엔 "통과 확률 75% — 이 경기가 +19%p로…"처럼 수치로 적었다. 그건 판정식을
 * 그대로 읽어 주는 것이지 **감독이 선수를 보는 말**이 아니다.
 *
 * 지키는 것:
 *   ① 대사에 숫자·퍼센트가 안 샌다 (판정식이 그대로 새면 대사가 아니라 명세서다)
 *   ② 상황마다 말이 달라진다 — 잘하고 떨어졌으면 "운이 없었다",
 *      모자라서 떨어졌으면 무엇이 모자랐는지
 *   ③ **못 바꾸는 것**에는 "조금만 더"를 안 붙인다 (라운드·유스 배경)
 *   ④ 어떤 조합에서도 빈 대사가 안 나온다
 *
 * 대사 생성부를 소스에서 통째로 떼어 굴린다. 말을 여기 옮겨 적지 않는다.
 */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8");

const start = SRC.indexOf("    const pp = Math.round(p * 100);");
const end = SRC.indexOf("const why = `🗣️ 감독");
if (start < 0 || end < 0) { console.log("❌ 대사 생성부를 소스에서 못 찾았어요"); process.exit(1); }
const speak = new Function("p", "factors", "pass",
  `${SRC.slice(start, end)} return line;`);

const F = (game, ovr, youth, fame, cond, round) => [
  { label: "이 경기", v: game }, { label: "능력치", v: ovr },
  { label: "유스 배경", v: youth }, { label: "명성", v: fame },
  { label: "컨디션", v: cond }, { label: "라운드", v: round },
];

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ① 숫자가 안 샌다 — 확률·%p·조각 이름이 그대로 나오면 안 된다
const CASES = [];
for (const p of [0.15, 0.3, 0.45, 0.55, 0.7, 0.8, 0.93]) {
  for (const pass of [true, false]) {
    for (const f of [
      F(0.19, 0.12, 0.02, 0.10, 0.03, 0),
      F(-0.26, -0.14, -0.03, 0, -0.02, -0.10),
      F(0.02, 0.05, 0.02, 0.01, -0.09, -0.02),
      F(-0.04, 0.05, 0.02, 0.01, -0.03, -0.10),
      F(0, 0, 0, 0, 0, 0),
    ]) CASES.push({ p, pass, f, line: speak(p, f, pass) });
  }
}
const numeric = CASES.filter((c) => /\d|%|\+|-\d/.test(c.line));
check(numeric.length === 0,
  `${CASES.length}가지 조합 어디에도 숫자가 안 샌다 (샌 것: ${numeric.slice(0, 2).map((c) => c.line).join(" / ") || "없음"})`);
const empty = CASES.filter((c) => !c.line || c.line.trim().length < 6);
check(empty.length === 0, `빈 대사가 없다 (${empty.length}건)`);
check(CASES.every((c) => /[.!?…]$/.test(c.line.trim())), "대사가 문장으로 끝난다");

// ── ② 상황마다 말이 달라진다
const good = F(0.19, 0.14, 0.02, 0.08, 0.03, 0);
const luckyFail = speak(0.76, good, false);
const weakFail = speak(0.28, F(-0.26, -0.14, -0.03, 0, -0.02, -0.10), false);
console.log(`   잘하고 떨어짐 — “${luckyFail}”`);
console.log(`   모자라서 떨어짐 — “${weakFail}”`);
check(/운|자리/.test(luckyFail), "잘하고 떨어지면 운 이야기를 한다");
check(!/운이 없/.test(weakFail), "모자라서 떨어졌는데 운 탓을 하지 않는다");
check(luckyFail !== weakFail, "두 상황의 대사가 다르다");

const sure = speak(0.85, good, true), barely = speak(0.41, F(0.03, -0.10, 0.02, 0.01, -0.02, -0.05), true);
console.log(`   확실한 통과 — “${sure}”`);
console.log(`   아슬한 통과 — “${barely}”`);
check(sure !== barely, "여유 있는 통과와 아슬한 통과의 말이 다르다");

// ── ③ 못 바꾸는 것에는 "조금만 더"를 안 붙인다
const roundWorst = speak(0.52, F(-0.04, 0.05, 0.02, 0.01, -0.03, -0.10), false);
const condWorst = speak(0.52, F(0.02, 0.05, 0.02, 0.01, -0.09, -0.02), false);
console.log(`   라운드가 발목 — “${roundWorst}”`);
console.log(`   컨디션이 발목 — “${condWorst}”`);
check(!/조금 더 됐어도/.test(roundWorst),
  "라운드처럼 못 바꾸는 것에는 '조금만 더'를 안 붙인다 — 못 할 일을 시키는 말이 된다");
check(/조금 더 됐어도/.test(condWorst), "컨디션처럼 바꿀 수 있는 것에는 붙인다");

// ── ④ 어느 조각이 최고/최저여도 그 조각에 맞는 말이 나온다
const LABELS = ["이 경기", "능력치", "유스 배경", "명성", "컨디션", "라운드"];
let covered = 0;
for (let i = 0; i < LABELS.length; i++) {
  const f = LABELS.map((label, j) => ({ label, v: j === i ? -0.25 : 0.01 }));
  const line = speak(0.3, f, false);
  if (line && line.length > 8) covered++;
}
check(covered === LABELS.length, `여섯 조각 전부에 할 말이 있다 (${covered}/${LABELS.length})`);

/* ── 변이 검증 — 대사 표를 비우면 ④가 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const brokenSrc = SRC.slice(start, end).replace(/const CUT = \{[\s\S]*?\n    \};/, "const CUT = {};");
if (brokenSrc === SRC.slice(start, end)) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
const brokenSpeak = new Function("p", "factors", "pass", `${brokenSrc} return line;`);
const brokenLine = brokenSpeak(0.3, F(-0.25, 0.01, 0.01, 0.01, 0.01, 0.01), false);
check(!/경기가 아쉬웠네/.test(brokenLine),
  `변이 검증 — 대사 표를 비우면 무엇이 모자랐는지 말을 못 한다 (“${brokenLine}”)`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
