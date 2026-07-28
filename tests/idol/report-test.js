/* 연말 결산 헤드라인이 그 해에 '실제로 성취한 것'(awards/wins)을 근거로 나오는지 본다.
 * hype 산식이 로그 기반으로 바뀌면서 값의 폭이 6.3~8.0으로 좁아졌고, 헤드라인은
 * 여전히 옛 hype 컷오프(6 / 3.5 / 1)를 쓰고 있어서 능력치 70짜리도 매번
 * "차트를 지배한 해!"가 뜬다 — 대상을 8%만 타는데도. 이 파일은 그 회귀를 잡는다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");

// yearReport()의 headline 삼항식만 떼어낸다. y.awards / y.wins / y.hype를 인자로 받는
// 함수로 감싸서 실행한다 (직접 eval은 렉시컬 스코프 문제로 못 씀 — axis-test.js 참고).
const m = SRC.match(/y\.awards\.includes\("대상"\)[\s\S]*?"혹독한 한 해…"/);
if (!m) { console.log("❌ headline 삼항식을 못 찾았어요"); process.exit(1); }

const headline = (y) => {
  const fn = new Function("y", `return (${m[0]});`);
  return fn(y);
};

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// 대상 받은 해 → 최상위 헤드라인
check(
  headline({ hype: 6.5, wins: 8, sales: 300, awards: ["대상"] }) === "차트를 지배한 해!",
  "대상 받은 해는 최상위 헤드라인"
);

// 본상만 받은 해 → 중간-좋음 헤드라인 (대상 해보다는 낮아야 함)
check(
  headline({ hype: 6.5, wins: 5, sales: 200, awards: ["본상"] }) === "탄탄한 활동을 이어간 해",
  "본상만 받은 해는 중간-좋음 헤드라인"
);

// 무관 — 상 없이 음방 1위는 많이 함 → 최상위 헤드라인이면 안 됨
check(
  headline({ hype: 6.4, wins: 6, sales: 250, awards: [] }) !== "차트를 지배한 해!",
  "상 없이 1위만 많은 해는 최상위 헤드라인이 아니다"
);

// 상 없음 + 1위도 없음 → 최악 헤드라인, 그리고 실제로 도달 가능해야 함
check(
  headline({ hype: 6.2, wins: 0, sales: 50, awards: [] }) === "혹독한 한 해…",
  "상도 1위도 없는 해는 혹독한 한 해로 나온다"
);

// 회귀 재현 사례: 능력치 70대가 매번 찍는 모양 (상 없음, 1위 소수, hype≈6.2)
check(
  headline({ hype: 6.2, wins: 2, sales: 60, awards: [] }) !== "차트를 지배한 해!",
  "능력치 70대 모양(무관·1위 소수·hype 6.2)은 '차트를 지배한 해!'가 아니다"
);

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
