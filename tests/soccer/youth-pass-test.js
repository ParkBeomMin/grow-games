/* 🎓 유스 라운드 통과 판정이 **그 경기**를 보는지 본다.
 *
 * 제보: 0:3으로 지고 경기 평점 D에 0골 0도움 0수비인데 "통과! 🎉"가 떴다.
 *
 * 원인은 판정식에 그 경기가 아예 없던 것이다 —
 * 능력치·유스 국적·명성·컨디션·라운드만 봤고, 경기와 닿은 건 결정적 순간
 * 미니게임(±0.06)뿐이었다. 2.26.0에서 고친 프로 경기 평점과 같은 계열이다
 * (결과가 원인을 안 본다).
 *
 * 여기서 지키는 것:
 *   ① 같은 능력치라도 잘한 경기가 확실히 더 통과한다
 *   ② 승패도 남는다
 *   ③ 그래도 능력치가 죽지 않는다 — 판단만으로 다 되면 육성이 무의미해진다
 *   ④ 활약 보너스에 상한이 있다 (한 경기 대박이 라운드를 건너뛰면 안 된다)
 *
 * 판정식은 소스에서 정규식으로 뽑아 그대로 실행한다. 값을 옮겨 적지 않는다.
 */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8");
const grab = (re) => { const m = SRC.match(re); return m ? m[0] : null; };

const parts = {
  markets: grab(/const MARKETS = \[[\s\S]*?\n\];/),
  gradePass: grab(/const GRADE_PASS = \{[^}]*\};/),
  doneCap: grab(/const DONE_PASS_CAP = [^;]+;/),
  gradeP: grab(/const gradeP = GRADE_PASS\[fg\.g\] \|\| 0;/),
  resultP: grab(/const resultP = info\.res === "W"[^;]+;/),
  doneP: grab(/const doneP = Math\.min\(DONE_PASS_CAP[^;]+;/),
  /* doneP가 득점 눈금으로 나눠요 — 같이 안 떼면 ReferenceError로 죽습니다 */
  goalScale: grab(/const GOAL_SCALE = [^;]+;/),
  factors: grab(/const factors = \[[\s\S]*?\n    \];/),
  p: grab(/const p = clamp\(0\.51 \+ factors[^;]+;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* 통과 확률 하나를 계산한다. 화면 없이 식만 굴린다. */
const passP = new Function(
  "m", "fg", "info", "overall", "S", "ev", "momentBonus", "clamp",
  `${parts.gradePass}
   ${parts.doneCap}
   ${parts.gradeP}
   ${parts.resultP}
   ${parts.goalScale}
   ${parts.doneP}
   ${parts.factors}
   ${parts.p}
   return p;`
);
const MARKETS = new Function(`${parts.markets} return MARKETS;`)();
const KR = MARKETS.find((x) => x.id === "k");

const call = (ov, grade, res, goals, assists, defense, mom) => passP(
  KR, { g: grade }, { res, myGoals: goals, assists, defense },
  () => ov, { fandom: 0, condition: 80 }, { round: 0 },
  mom === "up" ? 0.06 : mom === "down" ? -0.06 : 0, clamp
);

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ① 제보 그 경기 — 평점 D · 0:3 패배 · 무공
const reported = call(45, "D", "L", 0, 0, 0);
const same = call(45, "S", "W", 1, 1, 2);
console.log(`   능력치 45 — 평점 D 무공 패배 ${(reported * 100).toFixed(0)}% · 평점 S 활약 승리 ${(same * 100).toFixed(0)}%`);
check(reported < 0.35, `평점 D로 0:3 패배하면 통과가 어렵다 (${(reported * 100).toFixed(0)}%)`);
check(same - reported > 0.3,
  `같은 능력치라도 경기에 따라 30%p 넘게 갈린다 (${((same - reported) * 100).toFixed(0)}%p)`);

// ── ② 등급이 단조로 작용한다
const byGrade = ["D", "C", "B", "A", "S"].map((g) => call(60, g, "D", 0, 0, 0));
console.log(`   등급별 (능력치 60 · 무승부 · 무공) — ${["D", "C", "B", "A", "S"].map((g, i) => `${g} ${(byGrade[i] * 100).toFixed(0)}%`).join(" · ")}`);
check(byGrade.every((v, i) => i === 0 || v > byGrade[i - 1]), "등급이 오를수록 통과 확률이 오른다");

// ── ③ 승패도 남는다
const w = call(60, "B", "W", 0, 0, 0), l = call(60, "B", "L", 0, 0, 0);
check(w > l, `이긴 경기가 진 경기보다 통과가 쉽다 (${(w * 100).toFixed(0)}% vs ${(l * 100).toFixed(0)}%)`);

// ── ④ 능력치가 죽지 않는다
const weak = call(45, "B", "D", 0, 0, 0), strong = call(85, "B", "D", 0, 0, 0);
check(strong - weak > 0.25,
  `능력치도 크게 남는다 (${(weak * 100).toFixed(0)}% → ${(strong * 100).toFixed(0)}%) — 경기만으로 다 되면 육성이 죽는다`);

// ── ⑤ 활약 보너스에 상한이 있다
const huge = call(60, "B", "D", 9, 9, 9), modest = call(60, "B", "D", 2, 1, 1);
const cap = new Function(`${parts.doneCap} return DONE_PASS_CAP;`)();
check(huge - modest <= cap + 1e-9,
  `한 경기 대박이 무한정 쌓이지 않는다 (상한 ${cap} · 실측 차 ${(huge - modest).toFixed(3)})`);

/* ── 변이 검증 — 그 경기 항을 전부 빼면 ①이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
/* 그 경기 항(첫 조각)을 0으로 만들면 ①이 무너져야 한다. */
const brokenP = parts.p.replace("0.51 + factors", "0.51 + factors.slice(1)");
if (brokenP === parts.p) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
const brokenPass = new Function(
  "m", "fg", "info", "overall", "S", "ev", "momentBonus", "clamp",
  `${parts.gradePass}\n${parts.doneCap}\n${parts.gradeP}\n${parts.resultP}\n${parts.goalScale}\n${parts.doneP}\n${parts.factors}\n${brokenP}\n return p;`
);
const brokenReported = brokenPass(KR, { g: "D" }, { res: "L", myGoals: 0, assists: 0, defense: 0 },
  () => 45, { fandom: 0, condition: 80 }, { round: 0 }, 0, clamp);
const brokenSame = brokenPass(KR, { g: "S" }, { res: "W", myGoals: 1, assists: 1, defense: 2 },
  () => 45, { fandom: 0, condition: 80 }, { round: 0 }, 0, clamp);
check(Math.abs(brokenSame - brokenReported) < 1e-9,
  `변이 검증 — 그 경기 항을 빼면 D 무공 패배와 S 활약 승리가 ${(brokenReported * 100).toFixed(0)}%로 똑같아진다`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
