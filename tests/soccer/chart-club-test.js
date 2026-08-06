/* 경기 결과의 평점 순위표에 경쟁자 '소속'이 실제로 찍히는지 본다.
 *
 * 증상: 내 줄만 클럽이 나오고 상위 5명은 전부 "-"였다.
 * 원인은 표를 그리는 쪽이 아니라 **행을 만드는 쪽**이었다.
 * 명단에 club이 제대로 있어도, 순위 행을 만드는 map이
 * name과 score만 옮겨서 club·role이 그 자리에서 버려졌다.
 *
 * 그래서 두 조각을 함께 실행한다 — 행을 만드는 식과 그리는 식.
 * 하나만 봤으면 "그리는 쪽은 r.club을 쓰고 있으니 맞다"로 초록이 떴을 것이다.
 *
 * 산식·템플릿은 전부 소스에서 정규식으로 뽑는다. 직접 eval은 쓰지 않고
 * new Function으로 감싸 return 한다 (선언이 eval 스코프에 갇히는 문제).
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");

const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  rows: grab(SRC, /const rows = \[\s*\{ name: S\.name[\s\S]*?\]\.sort\([^;]*\);/),
  /* ⚠️ `const line = (r, i) =>`를 파일 전체에서 찾으면 안 돼요 — 개인 순위표
   * (raceHTML)에도 같은 이름의 화살표가 있고 그게 파일 앞쪽이라 **그쪽이 먼저
   * 잡힙니다.** 실제로 내 줄이 "-"에 점수 undefined로 나왔고, 표식으로 좁히니
   * 이번엔 두 함수를 걸쳐 잡아 구문이 깨졌어요.
   * **chartHTML 안에서만** 찾습니다 — 범위를 먼저 좁히는 게 정답이에요. */
  line: (() => {
    const fn = grab(SRC, /function chartHTML\(rows, top\) \{[\s\S]*?\n  \}/);
    return fn ? grab(fn, /const line = \(r, i\) =>[\s\S]*?<\/tr>`;/) : null;
  })(),
  resKo: grab(SRC, /const RES_KO = \{[^}]*\};/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const rand = () => 0;   // 흔들림을 죽여 순위를 결정적으로 만든다

/* 그 라운드를 치른 경쟁자 8명 — raceRate가 돌려주는 모양 그대로.
 * 점수를 내 점수보다 확실히 높게 둬서 경쟁자가 상위 5칸을 차지하게 한다. */
const RIVALS = [
  { name: "밀란 피셔",   role: "에이스 스트라이커", pop: 88, club: "AC 리베라" },
  { name: "빅토르 라이너", role: "월드클래스 MF",    pop: 86, club: "노르드 유나이티드" },
  { name: "서선우",      role: "철벽 수비수",      pop: 84, club: "카스텔 FC" },
  { name: "레안 뒤몽",    role: "득점왕 후보",      pop: 82, club: "AC 리베라" },
  { name: "니코 린드블롬", role: "라이벌 윙어",      pop: 80, club: "베르단 SC" },
  { name: "김도현",      role: "베테랑 캡틴",      pop: 78, club: "카스텔 FC" },
  { name: "파블로 세라",  role: "괴물 신인",        pop: 76, club: "노르드 유나이티드" },
  { name: "이준석",      role: "국대 주전",        pop: 74, club: "베르단 SC" },
];
const SCORED = RIVALS.map((r, i) => ({ r, score: 88 - i * 2, res: "D" }));

const run = new Function(
  "S", "scored", "myRankScore", "info", "clamp",
  `${parts.resKo}
   ${parts.rows}
   ${parts.line}
   return rows.slice(0, 5).map(line).join("");`
);

const S = { name: "리오", group: "레알 몬테" };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const html = run(S, SCORED, 34, { res: "L" }, clamp);

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// 상위 5명이 전부 라이벌인지 먼저 확인한다 — 아니면 아래 검사가 의미를 잃는다
check(!html.includes("리오"), "상위 5칸이 전부 경쟁자다 (내 줄이 안 섞였다)");

// ① 핵심 — 라이벌 소속이 그대로 찍힌다
SCORED.slice(0, 5).forEach(({ r }) => {
  check(html.includes(r.club), `${r.name}의 소속 "${r.club}"이 표에 있다`);
});

// ② 빈 칸("-")이 하나도 없다. 이게 화면에서 실제로 보이던 증상이다
const dashes = (html.match(/class="ch-club">-/g) || []).length;
check(dashes === 0, `소속이 "-"인 줄이 없다 (지금 ${dashes}줄)`);

// ③ 역할 딱지도 같은 map을 타고 온다 — 함께 버려졌었다
check(html.includes("에이스 스트라이커"), "역할 딱지도 살아 있다");

// ④ 내 줄은 S.group으로 떨어진다 (라이벌과 달리 club을 안 들고 다닌다)
const mine = run(S, [], 34, { res: "W" }, clamp);
check(mine.includes("레알 몬테"), "내 줄은 S.group으로 채워진다");

/* 변이 검증 — club을 안 옮기는 옛 map으로 바꾸면 반드시 빨간불이 떠야 한다.
 * 이게 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
/* ⚠️ map이 여러 줄이라 한 줄짜리 정규식으로는 안 잡힌다 — 조용히 치환에 실패하면
 * 변이 검증이 "무너지지 않았다"고 말하는 셈이라, 치환이 실제로 됐는지도 확인한다. */
const brokenRows = parts.rows.replace(
  /\.\.\.scored\.map\(\(\{ r, score, res \}\) => \(\{[\s\S]*?\}\)\),/,
  "...scored.map(({ r, score }) => ({ name: r.name, score })),"
);
if (brokenRows === parts.rows) { console.log("❌ 변이 치환이 안 됐어요 — 정규식이 소스와 안 맞아요"); process.exit(1); }
const brokenRun = new Function(
  "S", "scored", "myRankScore", "info", "clamp",
  `${parts.resKo}
   ${brokenRows}
   ${parts.line}
   return rows.slice(0, 5).map(line).join("");`
);
const brokenHTML = brokenRun(S, SCORED, 34, { res: "L" }, clamp);
const brokenDashes = (brokenHTML.match(/class="ch-club">-/g) || []).length;
check(brokenDashes === 5, `변이 검증 — 옛 map을 넣으면 5줄 모두 "-"로 무너진다 (${brokenDashes}줄)`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
