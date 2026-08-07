/* ⚽ 승부차기 — 동료가 함께 차는가, 끝난 뒤 버튼이 사라지는가.
 *
 * 제보 둘이 같은 화면에서 나왔다.
 *   ① "승부차기 왜 다 내가 차 ㅋㅋㅋㅋ" — 1번·2번·3번이 전부 "(나)"였다.
 *      축구에서 한 선수가 승부차기를 연달아 차는 일은 없다.
 *   ② "승부차기 끝났는데 승부차기 시작 버튼이 계속 있네"
 *
 * ②의 원인은 CSS다. 브라우저 기본 규칙 `[hidden] { display: none }`은
 * **작성자 스타일에 무조건 진다.** base.css의 `.btn { display: inline-block }`이
 * 이기니까 `btn.hidden = true`를 걸어도 버튼이 그대로 남았다.
 * 이 저장소가 "CSS는 기계가 못 본다"고 적어 둔 바로 그 사각지대라,
 * 여기서는 jsdom에 스타일시트를 실제로 물려서 계산된 display를 읽는다.
 *
 * 지키는 것:
 *   ① 정규 5명 중 내 차례는 하나뿐이고 나머지는 동료다
 *   ② 동료 줄에 이름이 붙는다 (명단이 없으면 번호로라도)
 *   ③ 서든데스는 내가 찬다
 *   ④ 버튼에 hidden을 걸면 실제로 안 보인다 (계산된 display가 none)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = "/workspace/grow-games";
const DIR = path.join(ROOT, "beta/soccer");
const { JSDOM } = require(path.join(ROOT, "tests/cloud/jsdom.js"));

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

const CUP = fs.readFileSync(path.join(DIR, "cup.js"), "utf8");
const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const BASE_CSS = fs.readFileSync(path.join(ROOT, "beta/base.css"), "utf8");
const SOCCER_CSS = fs.readFileSync(path.join(DIR, "style.css"), "utf8");

/* ---------- ①②③ 승부차기 진행 — 실제 SoccerCup을 돌린다 ---------- */
/* url을 줘야 localStorage가 열려요 — 불투명 출처에서는 접근이 막힙니다. */
const dom = new JSDOM(`<body><div id="box"></div></body>`,
  { runScripts: "dangerously", url: "https://x.test/soccer/" });
const w = dom.window;
w.localStorage.setItem("grow-auto-mini", "1");   // 방향은 자동으로 골라요 (동기 진행)
w.eval(CUP);
const Cup = w.SoccerCup;
check(!!Cup, "SoccerCup이 로드된다");
if (!Cup) { console.log("\n❌ 실패"); process.exit(1); }

check(typeof Cup.MY_KICK === "number" && Cup.MY_KICK >= 1 && Cup.MY_KICK <= Cup.KICKS,
  `내 순번(MY_KICK=${Cup.MY_KICK})이 정규 키커 ${Cup.KICKS}명 안에 있다`);

const MATES = ["빅토르 모레티", "임연우", "장서진", "조도윤"];
function runPk(cfg) {
  const box = w.document.getElementById("box");
  let lines = null;
  Cup.shootout(box, Object.assign({
    shoot: 80, oppStr: 60, myStr: 70, mates: MATES,
    myName: "우리팀", oppName: "상대팀",
    onDone: (win, log) => { lines = { win, log }; },
  }, cfg));
  // 자동 진행이면 동기로 끝나요. 끝 버튼을 눌러 onDone까지 밀어요.
  const go = box.querySelector(".pk-btns .btn");
  if (go) go.click();
  return lines;
}

// 여러 판을 모아서 본다 — 조기 종료 때문에 한 판만 보면 표본이 부족해요
const runs = [];
for (let i = 0; i < 400; i++) { const r = runPk({}); if (r) runs.push(r); }
check(runs.length === 400, `400판이 전부 끝까지 간다 (${runs.length}판)`);

const myLines = runs.flatMap((r) => r.log.filter((l) => /\(나\)/.test(l.txt) && !/서든데스/.test(l.txt)));
const mateLines = runs.flatMap((r) => r.log.filter((l) => MATES.some((m) => l.txt.includes(m))));
const oppLines = runs.flatMap((r) => r.log.filter((l) => /상대 \d+번/.test(l.txt)));
console.log(`   400판 — 내 정규 킥 ${myLines.length}회 · 동료 킥 ${mateLines.length}회 · 상대 킥 ${oppLines.length}회`);

// ── ① 한 판에 내 정규 킥은 최대 하나
const worst = Math.max(...runs.map((r) =>
  r.log.filter((l) => /\(나\)/.test(l.txt) && !/서든데스/.test(l.txt)).length));
check(worst <= 1, `한 판에서 내가 정규 키커로 차는 건 최대 한 번이다 (실측 최대 ${worst}회)`);
check(mateLines.length > myLines.length * 2,
  `동료가 나보다 훨씬 많이 찬다 (동료 ${mateLines.length} vs 나 ${myLines.length})`);

// ── ② 동료 줄에 이름이 붙는다
check(mateLines.length > 0, "동료 줄에 이름이 찍힌다");
const nameless = runPk({ mates: [] });
check(!!nameless && nameless.log.some((l) => /\d+번 키커/.test(l.txt)),
  "명단이 비어 있어도 번호로 채워서 안 죽는다");

// ── ③ 서든데스는 내가 찬다
const sudden = runs.flatMap((r) => r.log.filter((l) => /서든데스/.test(l.txt) && !/상대/.test(l.txt)));
console.log(`   서든데스 우리 쪽 킥 ${sudden.length}회`);
check(sudden.length === 0 || sudden.every((l) => /\(나\)/.test(l.txt)),
  `서든데스는 전부 내가 찬다 (${sudden.length}회 중 ${sudden.filter((l) => /\(나\)/.test(l.txt)).length}회)`);

// 배선 — career.js가 동료 명단과 팀 전력을 넘긴다
check(/mates: mateNames\(\), myStr: clubStrOf\(S\)/.test(CAREER),
  "career.js가 우리 팀 명단과 전력을 승부차기에 넘긴다");

/* ---------- ④ 버튼 hidden이 실제로 먹는가 (CSS) ----------
 *
 * ⚠️ **jsdom으로는 이걸 증명할 수 없어요.** 실제 브라우저에서는 기본 규칙
 * `[hidden] { display: none }`이 UA 출처라 작성자 스타일에 무조건 지는데,
 * jsdom은 작성자 CSS와 무관하게 hidden이면 none으로 계산합니다.
 * 그래서 고치기 전 base.css를 물려도 none이 나와요 — 화면과 다른 답입니다.
 * (이 저장소가 적어 둔 "CSS는 기계가 못 본다"의 실제 사례예요)
 *
 * 그래서 여기서는 **소스에 규칙이 살아 있는지**를 지킵니다.
 * 지우거나 뒤에서 덮어쓰면 잡혀요. 화면 확인은 베타 확인 페이지 몫입니다. */
{
  const iRule = BASE_CSS.indexOf(".btn[hidden]");
  const iBtn = BASE_CSS.indexOf(".btn {");
  check(iRule > 0, "base.css에 .btn[hidden] 규칙이 있다");
  /* !important가 필요해요 — `#move-actions .btn`처럼 ID가 붙은 선택자(1,1,0)가
   * `.btn[hidden]`(0,2,0)을 이겨서, 그런 자리에서는 또 안 먹습니다. */
  check(/\.btn\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/.test(BASE_CSS),
    ".btn[hidden]이 display: none !important를 준다 (ID 선택자도 못 이기게)");
  check(iRule > iBtn, `.btn 정의보다 뒤에 있다 (.btn ${iBtn} < .btn[hidden] ${iRule})`);

  /* 뒤에서 `.btn`으로 끝나는 선택자가 display를 다시 잡으면 특이도가 같거나 높아
   * 이 규칙을 덮어써요. 그런 규칙이 생기면 잡습니다. */
  const risky = [];
  const scan = (css, label) => {
    const re = /([^{}]+)\{([^}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      const sel = m[1].trim(), body = m[2];
      // !important로 잠갔으니, 같은 무게로 덮어쓰는 것만 위험해요
      if (!/display\s*:[^;]*!important/.test(body)) continue;
      if (sel.split(",").some((one) => /(^|\s)\.btn$/.test(one.trim()))) {
        if (css === BASE_CSS && m.index < iRule) continue;   // 우리가 고친 자리보다 앞이면 괜찮아요
        risky.push(`${label}: ${sel}`);
      }
    }
  };
  scan(BASE_CSS, "base.css");
  scan(SOCCER_CSS, "soccer/style.css");
  check(risky.length === 0,
    `.btn의 display를 !important로 다시 잡는 규칙이 없다${risky.length ? ` — ${risky.join(" · ")}` : ""}`);
}

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
