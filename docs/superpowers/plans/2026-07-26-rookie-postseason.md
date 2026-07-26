# 더 루키 가을야구 · 한국시리즈 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ⚾ 더 루키에 팀 순위표를 노출하고, 정규시즌 뒤에 실제 KBO 구조의 가을야구(와일드카드 → 준PO → PO → 한국시리즈)를 붙인다.

**Architecture:** 대진 구성과 시리즈 판정은 화면을 모르는 순수 함수로 `rookie/postseason.js`에 분리하고 `window.Postseason`으로 노출한다(저장소의 `match.js`·`fx.js`와 같은 패턴). `career.js`는 그 결과를 그리고 기존 경기 연출을 재사용한다. 순수 함수라 브라우저 없이 node로 검증할 수 있다.

**Tech Stack:** 순수 HTML/CSS/JS. 빌드·의존성·모듈 시스템 없음. GitHub Pages 정적 서빙.

설계 스펙: `docs/superpowers/specs/2026-07-26-rookie-postseason-design.md`

## Global Constraints

- **작업은 `beta/rookie/` 안에서만 한다.** 루트 `rookie/`는 Task 8의 `promote.sh`가 덮어쓴다. 직접 수정 금지.
- **의존성을 추가하지 않는다.** package.json·npm·CDN 스크립트 전부 금지. 모듈 시스템도 없다 — 전역 `window.*` 패턴을 쓴다.
- **정규시즌 144경기, 경기당 클릭 수, 훈련 횟수를 바꾸지 않는다.** 명시적으로 범위 밖이다.
- **다른 6개 게임(idol·stock·soccer·dev·chef·stream)을 건드리지 않는다.**
- **기존 명예의 전당 데이터를 마이그레이션하지 않는다.** `S.career.rings`는 이미 있는 필드다.
- Korean UI 문구, 기존 해요체 유지.
- **모든 줄 번호는 작업 시작 전 원본 기준이다.** 앞 Task가 코드를 넣으면 밀린다. 대상은 함수 이름으로 찾는다.
- **커밋 메시지는 아래 두 줄로 끝난다.**
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
  ```
  이 저장소엔 git 신원이 설정돼 있으니(`Claude <noreply@anthropic.com>`) 평소대로 `git commit`하면 된다.

## 검증 방식

이 저장소에는 테스트 러너가 없고 넣지 않는다(승인된 결정). 대신:

- **Task 1~2의 순수 함수는 진짜 TDD가 된다.** `postseason.js`가 `window.Postseason`에 붙으므로 node에서 `window` 스텁 하나로 그대로 불러 쓸 수 있다. 테스트 파일은 저장소에 넣지 않고 스크래치패드에 둔다(배포물에 죽은 파일을 넣지 않기 위해서다).
- Task 3~6의 화면 연동은 node 스텁으로 상태 전이를 검증하고, 시각 확인은 사용자가 브라우저에서 한다.

**스크래치패드 경로:** `/tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps/`

## File Structure

| 파일 | 역할 | 작업 |
|---|---|---|
| `beta/rookie/postseason.js` | **신규.** 대진 구성·시리즈 판정 순수 로직. `window.Postseason` | Task 1~2 |
| `beta/rookie/index.html` | 순위표 `<details>` 블록 추가, `postseason.js` 로드 | Task 3 |
| `beta/rookie/career.js` | 순위표 렌더, 포스트시즌 진행·경기·결산 연동 | Task 3~6 |
| `beta/rookie/style.css` | 순위표 접이식 블록 스타일 | Task 3 |
| `beta/rookie/sw.js` | `ASSETS`에 `./postseason.js` 추가 | Task 3 |
| `VERSION` / `CHANGELOG.md` | `release.sh`가 갱신 | Task 8 |

`.rank-table` 스타일은 `base.css:376`에 이미 있어 새로 만들지 않는다.

---

### Task 1: `buildBracket` — 순위 → 대진표

**Files:**
- Create: `beta/rookie/postseason.js`
- Test: `/tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps/test-bracket.js` (저장소 밖)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `window.Postseason.NEED` — `{ wc: 2, semi: 3, po: 3, ks: 4 }`
  - `window.Postseason.LABEL` — `{ wc: "와일드카드", semi: "준플레이오프", po: "플레이오프", ks: "한국시리즈" }`
  - `window.Postseason.MAX_GAMES` — `{ wc: 2, semi: 5, po: 5, ks: 7 }`
  - `window.Postseason.buildBracket(standings, myTeam)` → `Bracket | null`
    - `standings`: `{name, w, l}[]`, **승수 내림차순 정렬된 상태로 받는다**
    - `Bracket`: `{ series: Series[], myTeam, myRank, myRound }`
    - `Series`: `{ round, a, b, aw, bw, need, done, winner }` — `a`는 항상 상위 시드, `b`는 하위 시드(아직 안 정해졌으면 `null`)
    - 내 팀이 6위 이하면 `null`
  - `window.Postseason.roundOfRank(rank)` → `"wc" | "semi" | "po" | "ks"`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```bash
mkdir -p /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
```

`scratchpad/ps/test-bracket.js`:

```js
/* buildBracket 검증 — beta/rookie/postseason.js 를 node에서 그대로 불러 쓴다. */
const fs = require("fs");
const vm = require("vm");

const FILE = "/workspace/grow-games/beta/rookie/postseason.js";
const sandbox = { window: {}, Math, console };
sandbox.globalThis = sandbox;
vm.runInContext(fs.readFileSync(FILE, "utf8"), vm.createContext(sandbox), { filename: FILE });
const P = sandbox.window.Postseason;

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  ok ? pass++ : fail++;
};

// 10팀 최종 순위 (승수 내림차순)
const TEAMS = ["LG 트윈스", "삼성 라이온즈", "한화 이글스", "두산 베어스", "KIA 타이거즈",
               "롯데 자이언츠", "SSG 랜더스", "KT 위즈", "NC 다이노스", "키움 히어로즈"];
const standings = TEAMS.map((name, i) => ({ name, w: 90 - i * 5, l: 54 + i * 5 }));

console.log("=== 순위별 대진 ===");
{
  const b = P.buildBracket(standings, TEAMS[0]);      // 1위
  check("1위 → 한국시리즈부터", b.myRound === "ks", b && b.myRound);
  check("1위가 KS의 상위 시드", b.series[3].a === TEAMS[0]);
  check("1위 myRank=1", b.myRank === 1);
}
{
  const b = P.buildBracket(standings, TEAMS[1]);      // 2위
  check("2위 → PO부터", b.myRound === "po", b && b.myRound);
  check("2위가 PO의 상위 시드", b.series[2].a === TEAMS[1]);
}
{
  const b = P.buildBracket(standings, TEAMS[2]);      // 3위
  check("3위 → 준PO부터", b.myRound === "semi", b && b.myRound);
  check("3위가 준PO의 상위 시드", b.series[1].a === TEAMS[2]);
}
{
  const b = P.buildBracket(standings, TEAMS[3]);      // 4위
  check("4위 → 와일드카드부터", b.myRound === "wc", b && b.myRound);
  check("4위가 WC의 상위 시드", b.series[0].a === TEAMS[3]);
  check("4위는 1승 안고 시작", b.series[0].aw === 1, `aw=${b.series[0].aw}`);
  check("5위는 0승에서 시작", b.series[0].bw === 0, `bw=${b.series[0].bw}`);
}
{
  const b = P.buildBracket(standings, TEAMS[4]);      // 5위
  check("5위 → 와일드카드부터", b.myRound === "wc", b && b.myRound);
  check("5위가 WC의 하위 시드", b.series[0].b === TEAMS[4]);
  check("5위여도 4위의 1승 어드밴티지는 그대로", b.series[0].aw === 1);
}
{
  check("6위는 진출 없음", P.buildBracket(standings, TEAMS[5]) === null);
  check("10위는 진출 없음", P.buildBracket(standings, TEAMS[9]) === null);
  check("없는 팀은 null", P.buildBracket(standings, "없는팀") === null);
}

console.log("\n=== 대진표 형태 ===");
{
  const b = P.buildBracket(standings, TEAMS[0]);
  check("시리즈 4개", b.series.length === 4, `${b.series.length}개`);
  check("라운드 순서 wc→semi→po→ks",
    b.series.map((s) => s.round).join(",") === "wc,semi,po,ks",
    b.series.map((s) => s.round).join(","));
  check("상위 시드 배치 (3·2·1위)",
    b.series[1].a === TEAMS[2] && b.series[2].a === TEAMS[1] && b.series[3].a === TEAMS[0]);
  check("아직 안 정해진 상대는 null",
    b.series[1].b === null && b.series[2].b === null && b.series[3].b === null);
  check("need가 라운드별로 맞음",
    b.series.map((s) => s.need).join(",") === "2,3,3,4",
    b.series.map((s) => s.need).join(","));
  check("전부 미결 상태", b.series.every((s) => !s.done && s.winner === null));
}

console.log("\n=== 내 팀은 대진에 정확히 한 번 ===");
for (let rank = 1; rank <= 5; rank++) {
  const me = TEAMS[rank - 1];
  const b = P.buildBracket(standings, me);
  const n = b.series.filter((s) => s.a === me || s.b === me).length;
  check(`${rank}위 — 등장 1회`, n === 1, `${n}회`);
}

console.log("\n=== roundOfRank ===");
check("1위→ks", P.roundOfRank(1) === "ks");
check("2위→po", P.roundOfRank(2) === "po");
check("3위→semi", P.roundOfRank(3) === "semi");
check("4위→wc", P.roundOfRank(4) === "wc");
check("5위→wc", P.roundOfRank(5) === "wc");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass}건 통과 / ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
node test-bracket.js
```

기대: `ENOENT: no such file or directory ... beta/rookie/postseason.js` — 파일이 아직 없어서 나는 실패다.

- [ ] **Step 3: `postseason.js`를 만든다**

`beta/rookie/postseason.js`:

```js
/* ⚾ 더 루키 가을야구 — 대진 구성과 시리즈 판정
 *
 * 화면을 모르는 계산만 담아요. career.js가 이 결과를 그려요.
 * 실제 KBO 구조를 따라요: 5팀 진출, 와일드카드 → 준PO → PO → 한국시리즈.
 */
(function () {
  "use strict";

  // 시리즈 승리에 필요한 승수
  const NEED = { wc: 2, semi: 3, po: 3, ks: 4 };
  // 시리즈 최대 경기 수 (와일드카드는 4위가 1승 안고 시작해서 2경기)
  const MAX_GAMES = { wc: 2, semi: 5, po: 5, ks: 7 };
  const LABEL = { wc: "와일드카드", semi: "준플레이오프", po: "플레이오프", ks: "한국시리즈" };

  // 순위 → 그 팀이 처음 나서는 라운드
  const roundOfRank = (rank) =>
    rank >= 4 ? "wc" : rank === 3 ? "semi" : rank === 2 ? "po" : "ks";

  // a는 항상 상위 시드예요. aHead는 와일드카드 4위가 안고 시작하는 승수(1).
  const mkSeries = (round, a, b, aHead) => ({
    round, a, b,
    aw: aHead || 0, bw: 0,
    need: NEED[round],
    done: false, winner: null,
  });

  /* 최종 순위(승수 내림차순)와 내 팀 이름을 받아 대진표를 만들어요.
   * 내 팀이 6위 이하면 null이에요 — 가을야구가 없어요. */
  function buildBracket(standings, myTeam) {
    const rank = standings.findIndex((t) => t.name === myTeam) + 1;
    if (rank < 1 || rank > 5) return null;
    const at = (r) => standings[r - 1].name;
    return {
      series: [
        mkSeries("wc", at(4), at(5), 1),   // 4위가 1승 안고 시작
        mkSeries("semi", at(3), null, 0),  // 상대는 와일드카드 승자
        mkSeries("po", at(2), null, 0),    // 상대는 준PO 승자
        mkSeries("ks", at(1), null, 0),    // 상대는 PO 승자
      ],
      myTeam,
      myRank: rank,
      myRound: roundOfRank(rank),
    };
  }

  window.Postseason = { NEED, MAX_GAMES, LABEL, roundOfRank, buildBracket };
})();
```

- [ ] **Step 4: 통과를 확인한다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
node test-bracket.js
```

기대: `PASS: N건 통과 / 0건 실패` — **실패가 0건인지만 본다.** 건수는 테스트를 손대면 바뀐다.

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/rookie/postseason.js
git commit -m "$(cat <<'EOF'
feat(루키): 가을야구 대진 구성 — buildBracket

실제 KBO 구조(5팀 진출, 와일드카드→준PO→PO→한국시리즈)로 대진을 만들어요.
화면을 모르는 순수 함수라 node로 그대로 검증돼요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 2: `advanceSeries` · `simSeries` — 시리즈 판정

**Files:**
- Modify: `beta/rookie/postseason.js`
- Test: `scratchpad/ps/test-series.js` (저장소 밖)

**Interfaces:**
- Consumes: Task 1의 `NEED`, `MAX_GAMES`, `mkSeries`, `Series` 형태
- Produces:
  - `Postseason.advanceSeries(series, aWon)` → 새 `Series` (원본 불변). `aWon`이 `true`면 상위 시드 승리
  - `Postseason.simSeries(round, aName, bName, strA, strB, aHead)` → `done: true`인 `Series`
  - `Postseason.feedWinner(series)` → 끝난 시리즈의 승자를 다음 라운드 `b` 자리에 채운 새 배열

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`scratchpad/ps/test-series.js`:

```js
/* advanceSeries / simSeries / feedWinner 검증 */
const fs = require("fs");
const vm = require("vm");

const FILE = "/workspace/grow-games/beta/rookie/postseason.js";
const sandbox = { window: {}, Math, console };
sandbox.globalThis = sandbox;
vm.runInContext(fs.readFileSync(FILE, "utf8"), vm.createContext(sandbox), { filename: FILE });
const P = sandbox.window.Postseason;

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  ok ? pass++ : fail++;
};

const TEAMS = ["LG 트윈스", "삼성 라이온즈", "한화 이글스", "두산 베어스", "KIA 타이거즈",
               "롯데 자이언츠", "SSG 랜더스", "KT 위즈", "NC 다이노스", "키움 히어로즈"];
const standings = TEAMS.map((name, i) => ({ name, w: 90 - i * 5, l: 54 + i * 5 }));
const wc = () => P.buildBracket(standings, TEAMS[3]).series[0];   // 4위 시점의 WC
const semi = () => P.buildBracket(standings, TEAMS[2]).series[1]; // 준PO (b는 null)
const ks = () => P.buildBracket(standings, TEAMS[0]).series[3];   // KS

console.log("=== 와일드카드 — 4위는 1승, 5위는 2연승 ===");
{
  const s = P.advanceSeries(wc(), true);    // 4위가 1차전 승
  check("4위 1차전 승 → 즉시 종료", s.done === true);
  check("4위 1차전 승 → 4위 진출", s.winner === TEAMS[3], s.winner);
  check("스코어 2-0", s.aw === 2 && s.bw === 0, `${s.aw}-${s.bw}`);
  check("경기는 1경기만 치러짐", s.aw + s.bw - 1 === 1, `${s.aw + s.bw - 1}경기`);
}
{
  const g1 = P.advanceSeries(wc(), false);  // 4위가 1차전 패
  check("4위 1차전 패 → 아직 미결", g1.done === false, `done=${g1.done}`);
  check("스코어 1-1", g1.aw === 1 && g1.bw === 1, `${g1.aw}-${g1.bw}`);
  const g2 = P.advanceSeries(g1, true);     // 4위가 2차전 승
  check("4위 2차전 승 → 4위 진출", g2.done && g2.winner === TEAMS[3], g2.winner);
}
{
  const g1 = P.advanceSeries(wc(), false);
  const g2 = P.advanceSeries(g1, false);    // 5위 2연승
  check("5위 2연승 → 5위 진출", g2.done && g2.winner === TEAMS[4], g2.winner);
  check("스코어 1-2", g2.aw === 1 && g2.bw === 2, `${g2.aw}-${g2.bw}`);
}

console.log("\n=== 5전 3선승 ===");
for (const [label, wins] of [["3-0", [1,1,1]], ["3-1", [1,0,1,1]], ["3-2", [1,0,1,0,1]]]) {
  let s = semi();
  let games = 0;
  for (const w of wins) { s = P.advanceSeries(s, !!w); games++; }
  check(`${label} 종료`, s.done === true, `done=${s.done}`);
  check(`${label} 승자는 상위 시드`, s.winner === TEAMS[2], s.winner);
  check(`${label} 경기 수 ${games}`, s.aw + s.bw === games, `${s.aw + s.bw}`);
}
{
  let s = semi();
  for (let i = 0; i < 5; i++) s = P.advanceSeries(s, true);   // 종료 후에도 계속 넣어봄
  check("3승에서 멈춤 (4승 안 나옴)", s.aw === 3, `aw=${s.aw}`);
}

console.log("\n=== 7전 4선승 ===");
for (const [label, wins] of [["4-0", [1,1,1,1]], ["4-3", [1,0,1,0,1,0,1]]]) {
  let s = ks();
  for (const w of wins) s = P.advanceSeries(s, !!w);
  check(`${label} 종료`, s.done === true);
  check(`${label} 스코어`, `${s.aw}-${s.bw}` === label, `${s.aw}-${s.bw}`);
}
{
  let s = ks();
  for (let i = 0; i < 9; i++) s = P.advanceSeries(s, true);
  check("4승에서 멈춤", s.aw === 4, `aw=${s.aw}`);
}

console.log("\n=== 불변성 ===");
{
  const orig = semi();
  const snapshot = JSON.stringify(orig);
  P.advanceSeries(orig, true);
  check("원본이 바뀌지 않음", JSON.stringify(orig) === snapshot);
}

console.log("\n=== simSeries ===");
{
  let strongWins = 0;
  const N = 1000;
  let allDone = true, overLimit = 0;
  for (let i = 0; i < N; i++) {
    const s = P.simSeries("ks", "강팀", "약팀", 0.62, 0.36, 0);
    if (!s.done) allDone = false;
    if (s.aw + s.bw > P.MAX_GAMES.ks) overLimit++;
    if (s.winner === "강팀") strongWins++;
  }
  check("항상 done으로 끝남", allDone);
  check("최대 경기 수를 넘지 않음", overLimit === 0, `${overLimit}건 초과`);
  check(`강팀이 유의미하게 자주 이김 (${strongWins}/${N})`, strongWins > N * 0.6, `${(strongWins/N*100).toFixed(1)}%`);
}
{
  let aWins = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) if (P.simSeries("ks", "A", "B", 0.5, 0.5, 0).winner === "A") aWins++;
  check(`동급이면 5할 근처 (${aWins}/${N})`, aWins > N * 0.4 && aWins < N * 0.65, `${(aWins/N*100).toFixed(1)}%`);
}
{
  let over = 0;
  for (let i = 0; i < 1000; i++) {
    const s = P.simSeries("wc", "4위", "5위", 0.5, 0.5, 1);
    if (s.aw + s.bw - 1 > P.MAX_GAMES.wc) over++;
  }
  check("와일드카드는 최대 2경기", over === 0, `${over}건 초과`);
}

console.log("\n=== feedWinner ===");
{
  const b = P.buildBracket(standings, TEAMS[0]);
  let series = b.series.slice();
  series[0] = P.advanceSeries(series[0], true);      // WC를 4위 승리로 종료
  series = P.feedWinner(series);
  check("WC 승자가 준PO의 b로 들어감", series[1].b === TEAMS[3], String(series[1].b));
  check("그 뒤 라운드는 아직 null", series[2].b === null && series[3].b === null);
  check("원본 배열 불변", b.series[1].b === null);
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass}건 통과 / ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
node test-series.js
```

기대: `TypeError: P.advanceSeries is not a function`

- [ ] **Step 3: 세 함수를 추가한다**

`beta/rookie/postseason.js`의 `window.Postseason = ...` 줄 **바로 위**에 넣는다.

```js
  /* 한 경기 결과를 시리즈에 반영해 새 객체를 돌려줘요 (원본은 그대로).
   * aWon이 true면 상위 시드가 이긴 거예요. 이미 끝난 시리즈면 그대로 돌려줘요. */
  function advanceSeries(series, aWon) {
    if (series.done) return { ...series };
    const s = { ...series };
    if (aWon) s.aw += 1; else s.bw += 1;
    if (s.aw >= s.need) { s.done = true; s.winner = s.a; }
    else if (s.bw >= s.need) { s.done = true; s.winner = s.b; }
    return s;
  }

  /* NPC끼리의 시리즈를 팀 강도로 끝까지 돌려요.
   * str은 initSeason이 팀마다 부여하는 0.36~0.62 값이에요.
   * 상위 시드에 홈 어드밴티지 0.04를 얹어요. */
  function simSeries(round, aName, bName, strA, strB, aHead) {
    const p = Math.max(0.2, Math.min(0.8, 0.5 + (strA - strB) * 1.2 + 0.04));
    let s = mkSeries(round, aName, bName, aHead);
    // 최대 경기 수만큼만 돌아요 — 어떤 경우에도 무한루프가 안 나요.
    for (let i = 0; i < MAX_GAMES[round] && !s.done; i++) {
      s = advanceSeries(s, Math.random() < p);
    }
    return s;
  }

  /* 끝난 시리즈의 승자를 바로 다음 라운드의 b 자리에 채운 새 배열을 돌려줘요. */
  function feedWinner(series) {
    const out = series.map((s) => ({ ...s }));
    for (let i = 0; i + 1 < out.length; i++) {
      if (out[i].done && out[i + 1].b == null) out[i + 1].b = out[i].winner;
    }
    return out;
  }
```

그리고 노출 줄을 바꾼다.

```js
  window.Postseason = { NEED, MAX_GAMES, LABEL, roundOfRank, buildBracket, advanceSeries, simSeries, feedWinner };
```

- [ ] **Step 4: 통과를 확인한다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
node test-series.js && node test-bracket.js
```

기대: 두 스위트 모두 `PASS ... 0건 실패`.

`simSeries`의 `for` 루프가 `MAX_GAMES[round]`번만 도는데 항상 `done`으로 끝나는 이유: 5전 3선승은 5경기 안에 반드시 한쪽이 3승에 도달하고, 7전 4선승도 7경기 안에 4승이 나온다. 와일드카드는 4위가 1승을 안고 있어 2경기 안에 한쪽이 2승이 된다. 테스트의 "항상 done으로 끝남"이 이걸 지킨다.

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/rookie/postseason.js
git commit -m "$(cat <<'EOF'
feat(루키): 시리즈 판정 — advanceSeries · simSeries · feedWinner

와일드카드는 4위가 1승을 안고 시작해요. 4위는 2경기 중 1승이면 진출하고
5위는 2연승해야 해요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 3: 순위표 노출

**Files:**
- Modify: `beta/rookie/index.html` (`#screen-pro`의 `.gauges` 아래, 스크립트 로드)
- Modify: `beta/rookie/style.css` (접이식 블록 스타일)
- Modify: `beta/rookie/sw.js` (`ASSETS`)
- Modify: `beta/rookie/career.js` (`renderPro`, `seasonReport`)

**Interfaces:**
- Consumes: 기존 `standingsHTML()`, `myRank()` (수정하지 않는다)
- Produces: `renderStandings()` — `#pro-standings` 블록을 갱신하는 함수. Task 5의 `renderPost()`도 호출한다.

- [ ] **Step 1: `postseason.js`를 로드하고 순위표 자리를 만든다**

`beta/rookie/index.html`에서 `<script src="game.js"></script>` **바로 위**에 넣는다.

```html
  <script src="postseason.js"></script>
```

그리고 `#screen-pro` 안, `<div class="stats" id="pro-stats"></div>` **바로 위**에 넣는다.

```html
      <details class="standings-box" id="pro-standings" hidden>
        <summary id="pro-standings-sum"></summary>
        <div id="pro-standings-body"></div>
      </details>
```

`hidden`으로 시작한다 — 스프링캠프 중(`S.season`이 없을 때)에는 순위가 없기 때문이다.

- [ ] **Step 2: 서비스워커 캐시 목록에 새 파일을 넣는다**

`beta/rookie/sw.js` 3번째 줄을 찾는다.

```js
const ASSETS = ["./", "./index.html", "./style.css", "./game.js", "./career.js", "./manifest.webmanifest", "../base.css", "../timing.js", "../match.js"];
```

`"./postseason.js"`를 넣는다.

```js
const ASSETS = ["./", "./index.html", "./style.css", "./game.js", "./career.js", "./postseason.js", "./manifest.webmanifest", "../base.css", "../timing.js", "../match.js"];
```

빠뜨리면 오프라인에서 `Postseason is not defined`로 죽는다.

- [ ] **Step 3: 스타일을 추가한다**

`beta/rookie/style.css` 맨 아래에 넣는다.

```css
/* 📊 프로 화면 순위표 — 기본은 접혀 있어요 (펼치면 훈련 버튼이 화면 밖으로 밀려서요) */
.standings-box { margin: 0 0 10px; border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; }
.standings-box > summary { cursor: pointer; font-size: .85rem; color: var(--cream); list-style: none; }
.standings-box > summary::-webkit-details-marker { display: none; }
.standings-box > summary::before { content: "▸ "; color: var(--dim); }
.standings-box[open] > summary::before { content: "▾ "; }
```

`.rank-table` 자체는 `base.css:376`에 이미 있어 새로 만들지 않는다.

- [ ] **Step 4: `renderStandings()`를 추가하고 `renderPro`에서 부른다**

`career.js`의 `function myRank()` **바로 아래**에 넣는다.

```js
  // 📊 프로 화면의 접이식 순위표. 시즌 중이 아니면 숨겨요.
  function renderStandings() {
    const box = $("pro-standings");
    if (!box) return;
    if (!S.season) { box.hidden = true; return; }
    box.hidden = false;
    $("pro-standings-sum").textContent =
      `📊 ${myRank()}위 · ${S.season.teamW}승 ${S.season.teamL}패`;
    $("pro-standings-body").innerHTML = standingsHTML();
  }
```

그리고 `renderPro()` 안, `$("pro-money").textContent = ...` 줄 **바로 아래**에 호출을 넣는다.

```js
    renderStandings();
```

- [ ] **Step 5: 시즌 결산에도 최종 순위표를 보여준다**

결산 시점에는 `S.season`이 이미 `null`이라 `standingsHTML()`을 부를 수 없다. `finishSeason()`이
지우기 전에 스냅샷을 남겨야 한다.

**5a.** `finishSeason()`에서 `S.season = null;` **바로 위**에 넣는다.

```js
    // 결산 화면에서 보여줄 최종 순위표를 남겨둬요 (S.season을 곧 지우니까요)
    S.lastStandings = standingsHTML();
```

**5b.** `seasonReport()`에서 `$("career-card").innerHTML = ` 로 시작하는 템플릿 리터럴을 찾는다.
그 안의 `<table class="season-table season-career">` 로 시작하는 줄 **바로 위**에 순위표 블록을 끼운다.

바꾸기 전:

```js
      <div class="draft-team">${S.team} · ${s.line} · WAR ${s.war.toFixed(1)}</div>
      <table class="season-table season-career"><thead><tr><th>시즌</th><th>나이</th><th>성적</th><th>WAR</th></tr></thead><tbody>${rows}</tbody></table>
```

바꾼 뒤:

```js
      <div class="draft-team">${S.team} · ${s.line} · WAR ${s.war.toFixed(1)}</div>
      ${S.lastStandings ? `<div class="hint">📊 최종 순위</div>${S.lastStandings}` : ""}
      <table class="season-table season-career"><thead><tr><th>시즌</th><th>나이</th><th>성적</th><th>WAR</th></tr></thead><tbody>${rows}</tbody></table>
```

결산에서는 접지 않고 펼친 표 그대로 보여준다 — 가을야구 진출 여부를 납득시키는 화면이기 때문이다.

- [ ] **Step 6: 브라우저로 확인한다**

```bash
cd /workspace/grow-games && python3 -m http.server 8000
```

`http://localhost:8000/beta/rookie/` 에서:

| 확인 | 기대 |
|---|---|
| 스프링캠프 중 | 순위표 블록이 **안 보임** |
| 시즌 시작 후 프로 화면 | `▸ 📊 N위 · N승 N패` 한 줄, 접힌 상태 |
| 요약 줄 클릭 | 10팀 표가 펼쳐지고 내 팀이 강조됨(`.me`) |
| 경기 진행 후 | 승패와 순위가 갱신됨 |
| DevTools Console | 에러 없음 |

`Postseason` 전역이 실려 있는지도 콘솔에서 확인한다: `typeof Postseason` → `"object"`

- [ ] **Step 7: 커밋**

```bash
cd /workspace/grow-games
git add beta/rookie/
git commit -m "$(cat <<'EOF'
feat(루키): 프로 화면에 팀 순위표 노출

standingsHTML()이 있는데 아무도 부르지 않고 있었어요. 접이식으로 붙여서
요약 줄엔 순위와 승패만 보이고, 펼치면 10팀 표가 나와요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 4: 포스트시즌 진입과 자동 시뮬

**Files:**
- Modify: `beta/rookie/career.js`
- Test: `scratchpad/ps/test-flow.js`

**Interfaces:**
- Consumes: `Postseason.buildBracket`, `Postseason.simSeries`, `Postseason.feedWinner`, `Postseason.LABEL`, 기존 `playFeeds(title, feeds, onDone)`
- Produces:
  - `S.post` 상태 (스펙 5절 구조)
  - `enterPostseason()` — 정규시즌 종료 시 호출. 6위 이하면 `finishSeason()`으로 넘김
  - `advancePostseason()` — 대진을 진행. 내 차례면 `renderPost()`, 전부 끝나면 `finishSeason()`
  - `inPost()` — `!!(S.post && S.post.myRound && !S.post.eliminated)`

- [ ] **Step 1: `finishProGame`이 포스트시즌으로 넘기게 한다**

`career.js`의 `finishProGame` 안에서 아래를 찾는다.

```js
    if (sn.game >= sn.total) {
      return { extra, nextLabel: "🏁 시즌 결산", nextFn: finishSeason };
    }
```

바꾼다.

```js
    if (sn.game >= sn.total) {
      return { extra, nextLabel: "🍂 정규시즌 종료", nextFn: enterPostseason };
    }
```

- [ ] **Step 2: 진입과 진행 함수를 추가한다**

`career.js`의 `function finishSeason(` **바로 위**에 넣는다.

```js
  const inPost = () => !!(S.post && S.post.myRound && !S.post.eliminated);

  /* 정규시즌이 끝나면 최종 순위로 가을야구 진출을 가려요. 6위 이하면 바로 결산이에요. */
  function enterPostseason() {
    const sn = S.season;
    const standings = [
      { name: S.team, w: sn.teamW, l: sn.teamL, str: 0.5 },
      ...sn.others.map((o) => ({ name: o.name, w: o.w, l: o.l, str: o.str })),
    ].sort((a, b) => b.w - a.w);

    const bracket = Postseason.buildBracket(standings, S.team);
    if (!bracket) {                       // 6위 이하 — 가을야구 없음
      S.post = null;
      save();
      playFeeds("🍂 가을야구", [
        { text: `정규시즌 ${myRank()}위 — 가을야구 진출에 실패했어요`, cls: "bad" },
        { text: "5위 안에 들어야 가을야구에 나갈 수 있어요" },
      ], finishSeason);
      return;
    }

    S.post = {
      series: bracket.series,
      myTeam: S.team,
      myRank: bracket.myRank,
      myRound: bracket.myRound,
      gameNo: 1,
      eliminated: false,
      wonKS: false,
      // 자동 시뮬에 쓸 팀 강도 (내 팀 것은 안 써요 — 내 경기는 직접 치르니까요)
      str: standings.reduce((m, t) => ((m[t.name] = t.str), m), {}),
      stats: S.pos === "batter"
        ? { ab: 0, hits: 0, hr: 0, sb: 0 }
        : { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 },
    };
    save();
    advancePostseason([{ text: `🍂 ${bracket.myRank}위로 가을야구에 진출했어요!`, cls: "good" }]);
  }

  /* 대진을 앞으로 굴려요. 내가 나설 시리즈를 만나면 멈추고 화면을 그려요.
   * 내가 안 낀 라운드는 팀 강도로 자동 판정해서 연출로 흘려보내요. */
  function advancePostseason(seed) {
    const P = S.post;
    const feeds = seed ? seed.slice() : [];

    for (;;) {
      P.series = Postseason.feedWinner(P.series);
      const idx = P.series.findIndex((s) => !s.done && s.b != null);
      if (idx < 0) break;                        // 남은 시리즈 없음 = 가을야구 종료

      const s = P.series[idx];
      const mine = !P.eliminated && (s.a === P.myTeam || s.b === P.myTeam);
      if (mine) {
        P.myRound = s.round;
        // 와일드카드는 4위가 1승을 안고 시작하니 그만큼 빼야 차수가 맞아요
        P.gameNo = s.aw + s.bw + 1 - (s.round === "wc" ? 1 : 0);
        save();
        const go = () => { renderPost(); show("screen-pro"); };
        if (feeds.length) playFeeds("🍂 가을야구", feeds, go); else go();
        return;
      }

      P.series[idx] = Postseason.simSeries(
        s.round, s.a, s.b, P.str[s.a], P.str[s.b], s.round === "wc" ? 1 : 0
      );
      const r = P.series[idx];
      feeds.push({ text: `${Postseason.LABEL[r.round]}  ${r.a} ${r.aw}-${r.bw} ${r.b} → ${r.winner} 진출` });
    }

    // 가을야구 종료 — 우승 여부를 확정하고 결산으로
    const ks = P.series[3];
    P.wonKS = !!(ks.done && ks.winner === P.myTeam);
    P.myRound = null;
    save();
    if (P.wonKS) feeds.push({ text: "🏆 한국시리즈 우승!! 헹가래의 주인공이 됐어요", cls: "good" });
    else if (ks.done) feeds.push({ text: `🏆 ${ks.winner}이(가) 한국시리즈 우승을 차지했어요` });
    if (feeds.length) playFeeds("🍂 가을야구", feeds, finishSeason); else finishSeason();
  }
```

- [ ] **Step 3: 상태 전이를 검증하는 테스트를 쓴다**

`scratchpad/ps/test-flow.js`:

```js
/* 대진 진행 로직 검증 — career.js의 advancePostseason이 쓰는 것과 같은
 * Postseason 함수들로, 5가지 순위 시나리오가 끝까지 굴러가는지 본다. */
const fs = require("fs");
const vm = require("vm");

const FILE = "/workspace/grow-games/beta/rookie/postseason.js";
const sandbox = { window: {}, Math, console };
sandbox.globalThis = sandbox;
vm.runInContext(fs.readFileSync(FILE, "utf8"), vm.createContext(sandbox), { filename: FILE });
const P = sandbox.window.Postseason;

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); ok ? pass++ : fail++; };

const TEAMS = ["A","B","C","D","E","F","G","H","I","J"];
const standings = TEAMS.map((name, i) => ({ name, w: 90 - i * 5, l: 54 + i * 5, str: 0.6 - i * 0.02 }));
const strOf = standings.reduce((m, t) => ((m[t.name] = t.str), m), {});

// career.js의 advancePostseason과 같은 순서로 굴리되, 내 경기도 자동 판정한다.
function runToEnd(myTeam, myWinsEveryGame) {
  const b = P.buildBracket(standings, myTeam);
  if (!b) return null;
  let series = b.series;
  let eliminated = false, rounds = 0;
  for (;;) {
    if (rounds++ > 10) throw new Error("무한루프");
    series = P.feedWinner(series);
    const idx = series.findIndex((s) => !s.done && s.b != null);
    if (idx < 0) break;
    const s = series[idx];
    const mine = !eliminated && (s.a === myTeam || s.b === myTeam);
    if (mine) {
      const iAmA = s.a === myTeam;
      let cur = s;
      while (!cur.done) cur = P.advanceSeries(cur, iAmA ? myWinsEveryGame : !myWinsEveryGame);
      series = series.map((x, i) => (i === idx ? cur : x));
      if (cur.winner !== myTeam) eliminated = true;
    } else {
      series = series.map((x, i) => (i === idx
        ? P.simSeries(s.round, s.a, s.b, strOf[s.a], strOf[s.b], s.round === "wc" ? 1 : 0)
        : x));
    }
  }
  return { series, eliminated, wonKS: series[3].done && series[3].winner === myTeam };
}

console.log("=== 다섯 순위 모두 끝까지 굴러가는가 (내가 전승) ===");
for (let rank = 1; rank <= 5; rank++) {
  const me = TEAMS[rank - 1];
  const r = runToEnd(me, true);
  check(`${rank}위 — 모든 시리즈 종료`, r.series.every((s) => s.done));
  check(`${rank}위 — 전승이면 우승`, r.wonKS === true, `wonKS=${r.wonKS}`);
}

console.log("\n=== 내가 전패하면 탈락하고 KS는 남이 우승 ===");
for (let rank = 1; rank <= 5; rank++) {
  const me = TEAMS[rank - 1];
  const r = runToEnd(me, false);
  check(`${rank}위 — 탈락 처리`, r.eliminated === true);
  check(`${rank}위 — 내 우승 아님`, r.wonKS === false);
  check(`${rank}위 — KS는 끝남`, r.series[3].done === true);
  check(`${rank}위 — KS 승자가 내가 아님`, r.series[3].winner !== me, String(r.series[3].winner));
}

console.log("\n=== 6위 이하는 대진 자체가 없음 ===");
for (let rank = 6; rank <= 10; rank++) {
  check(`${rank}위 → null`, P.buildBracket(standings, TEAMS[rank - 1]) === null);
}

console.log("\n=== 5위가 전승하면 15경기를 치름 (와카2 제외 최대 경로) ===");
{
  const r = runToEnd(TEAMS[4], true);
  const wc = r.series[0], semi = r.series[1], po = r.series[2], ks = r.series[3];
  check("5위가 WC 승자", wc.winner === TEAMS[4], String(wc.winner));
  check("준PO·PO·KS 모두 5위가 승자",
    semi.winner === TEAMS[4] && po.winner === TEAMS[4] && ks.winner === TEAMS[4]);
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass}건 통과 / ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 4: 테스트를 돌린다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
node test-flow.js
```

기대: `PASS: N건 통과 / 0건 실패` — 실패가 0건인지만 본다.

- [ ] **Step 5: 문법 검사**

```bash
cd /workspace/grow-games && node --check beta/rookie/career.js && echo "문법 OK"
```

`renderPost`가 아직 없어 실행 시엔 죽지만, 문법은 통과해야 한다. `renderPost`는 Task 5에서 만든다.

- [ ] **Step 6: 커밋**

```bash
cd /workspace/grow-games
git add beta/rookie/career.js
git commit -m "$(cat <<'EOF'
feat(루키): 가을야구 진입과 자동 시뮬

정규시즌 6위 이하면 바로 결산, 1~5위면 대진에 들어가요.
내가 안 낀 라운드는 팀 강도로 자동 판정해서 연출로 보여줘요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 5: 포스트시즌 경기 진행

**Files:**
- Modify: `beta/rookie/career.js`

**Interfaces:**
- Consumes: Task 4의 `S.post`, `inPost()`, `advancePostseason()`. 기존 `playProGame`, `proBatterGame`, `proPitcherGame`, `quickGame`, `finishProGame`, `renderPro`
- Produces:
  - `renderPost()` — 포스트시즌 중의 `screen-pro`를 그린다
  - `mySeries()` — 내가 치르는 현재 `Series`를 돌려준다
  - `postOpp()` — 현재 상대 팀 이름

- [ ] **Step 1: 현재 시리즈 헬퍼와 화면을 추가한다**

`career.js`의 `function advancePostseason(` **바로 위**에 넣는다.

```js
  const mySeries = () => (S.post ? S.post.series.find((s) => s.round === S.post.myRound) : null);
  const postOpp = () => { const s = mySeries(); return s ? (s.a === S.post.myTeam ? s.b : s.a) : ""; };

  /* 포스트시즌 중의 프로 화면. 시리즈 중엔 훈련이 없어요(실제로도 경기만 있어요).
   * 능력치·컨디션 표시는 renderPro와 같은 요소를 그대로 써요. */
  function renderPost() {
    const P = S.post, s = mySeries();
    const myW = s.a === P.myTeam ? s.aw : s.bw;
    const opW = s.a === P.myTeam ? s.bw : s.aw;
    const label = Postseason.LABEL[s.round];

    $("pro-name").textContent = `${S.name} (${S.pos === "batter" ? "타자" : "투수"})`;
    $("pro-team").textContent = `⚾ ${S.team} · ${S.role || ""} · ${S.age}세 · ${S.proYear}년차 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = `🍂 ${label} ${P.gameNo}차전`;
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
    $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    // 순위표 자리에 시리즈 현황을 보여줘요
    const box = $("pro-standings");
    box.hidden = false;
    box.open = true;
    $("pro-standings-sum").textContent = `🍂 ${label} · 시리즈 ${myW}-${opW}`;
    $("pro-standings-body").innerHTML = `<table class="rank-table"><tbody>${
      S.post.series.map((x) => {
        const line = x.done
          ? `${x.a} ${x.aw}-${x.bw} ${x.b} → ${x.winner}`
          : x.b == null ? `${x.a} vs (미정)` : `${x.a} ${x.aw}-${x.bw} ${x.b}`;
        return `<tr class="${x.round === P.myRound ? "me" : ""}"><td>${Postseason.LABEL[x.round]}</td><td>${line}</td></tr>`;
      }).join("")
    }</tbody></table>`;

    $("pro-stats").innerHTML = "";
    $("pro-camp-title").textContent = `${label} ${P.gameNo}차전 — ${S.team} vs ${postOpp()}`;
    const acts = $("pro-actions");
    acts.innerHTML = "";
    const go = document.createElement("button");
    go.className = "action-btn rest go-game";
    go.innerHTML = `<span class="a-emoji">⚾</span>경기 시작<span class="a-sub">시리즈 ${myW}-${opW} · ${s.need}선승제</span>`;
    go.onclick = playProGame;
    acts.appendChild(go);

    $("pro-log").innerHTML = (S.proLog || []).map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`).join("");
  }
```

- [ ] **Step 2: `playProGame`이 포스트시즌 상대와 단축 로테이션을 쓰게 한다**

`career.js`의 `function playProGame()`을 찾아 아래로 교체한다.

```js
  function playProGame() {
    const sn = S.season;
    const post = inPost();
    const opp = post ? postOpp() : nextOpp();
    const isBat = S.pos === "batter";
    let mode = "full";
    if (!isBat) {
      // 가을야구는 단축 로테이션이에요 — 선발은 4경기마다, 불펜은 등판 확률이 올라가요
      if (S.role === "선발 투수") {
        const n = post ? S.post.gameNo - 1 : sn.game;
        mode = n % (post ? 4 : 5) === 0 ? "full" : "bench";
      } else {
        const p = S.role === "마무리 투수" ? (post ? 0.70 : 0.55) : (post ? 0.60 : 0.45);
        mode = Math.random() < p ? "relief" : "bench";
      }
    }
    if (mode === "full") {
      if (isBat) proBatterGame(opp);
      else proPitcherGame(opp);
    } else {
      quickGame(mode, opp);
    }
  }
```

- [ ] **Step 3: `finishProGame`이 포스트시즌이면 시리즈를 굴리게 한다**

`career.js`의 `function finishProGame(win, perf) {` 바로 다음 줄에 분기를 넣는다. 기존 정규시즌 로직은 그대로 아래에 남긴다.

```js
  function finishProGame(win, perf) {
    if (inPost()) return finishPostGame(win, perf);
    const sn = S.season;
    // ... (기존 코드 그대로)
```

그리고 `finishProGame` **바로 아래**에 새 함수를 넣는다.

```js
  /* 포스트시즌 경기 결과 — 시리즈를 굴리고, 기록은 정규시즌과 분리해 쌓아요.
   * 실제 야구도 포스트시즌 타율을 정규시즌에 합치지 않아요. */
  function finishPostGame(win, perf) {
    const P = S.post;
    const idx = P.series.findIndex((s) => s.round === P.myRound);
    const before = P.series[idx];
    const iAmA = before.a === P.myTeam;
    P.series[idx] = Postseason.advanceSeries(before, iAmA ? win : !win);
    const s = P.series[idx];

    const t = P.stats;
    if (perf) {
      if (S.pos === "batter") {
        t.ab += perf.ab; t.hits += perf.hits; t.hr += perf.hr; t.sb += perf.sb;
      } else {
        t.ip += perf.ip; t.k += perf.k; t.er += perf.runs || 0; t.g += 1;
        if (S.role === "선발 투수" && win && perf.ip >= 5) t.wins += 1;
        if (S.role === "마무리 투수" && win) t.saves += 1;
      }
    }
    const pay = win ? 80 : 40;              // 가을야구 수당은 정규시즌의 두 배예요
    S.money = (S.money || 0) + pay;
    S.condition = clamp(S.condition - randInt(3, 6), 0, 100);

    const myW = iAmA ? s.aw : s.bw, opW = iAmA ? s.bw : s.aw;
    const extra = `<div class="tour-pts">💰 수당 +${pay}만 · 시리즈 ${myW}-${opW}</div>`;

    if (!s.done) {
      P.gameNo += 1;
      save();
      return { extra, nextLabel: `🍂 ${P.gameNo}차전으로`, nextFn: () => { renderPost(); show("screen-pro"); } };
    }

    // 시리즈 종료 — 라운드 사이엔 이동일·휴식일이 있어 컨디션이 회복돼요
    S.condition = clamp(S.condition + 15, 0, 100);
    if (s.winner !== P.myTeam) P.eliminated = true;
    P.gameNo = 1;
    save();
    const won = s.winner === P.myTeam;
    const label = Postseason.LABEL[s.round];
    return {
      extra,
      nextLabel: won ? "🍂 다음 라운드로" : "🏁 시즌 결산",
      nextFn: () => advancePostseason([
        { text: won ? `🎉 ${label} 승리! (${myW}-${opW})` : `😢 ${label} 탈락… (${myW}-${opW})`, cls: won ? "good" : "bad" },
      ]),
    };
  }
```

- [ ] **Step 4: 문법 검사와 브라우저 확인**

```bash
cd /workspace/grow-games && node --check beta/rookie/career.js && echo "문법 OK"
```

`http://localhost:8000/beta/rookie/` — 실제 144경기를 다 치르긴 어려우므로, DevTools 콘솔로 시즌 끝 직전 상태를 만들어 확인한다.

```js
// 현재 저장을 읽어 정규시즌 마지막 경기 직전으로 옮긴다
const K = Object.keys(localStorage).find((k) => k.includes("rookie-save"));
const s = JSON.parse(localStorage.getItem(K));
s.season.game = 143; s.pendingGame = true;
localStorage.setItem(K, JSON.stringify(s));
location.reload();
```

| 확인 | 기대 |
|---|---|
| 마지막 경기 후 | 버튼이 `🍂 정규시즌 종료` |
| 5위 안이면 | `🍂 N위로 가을야구에 진출했어요!` + 자동 시뮬 연출 |
| 6위 이하면 | `가을야구 진출에 실패했어요` 후 바로 결산 |
| 포스트시즌 화면 | `🍂 준플레이오프 1차전`, 대진표가 펼쳐진 채 표시, 훈련 버튼 없음 |
| 경기 진행 | 시리즈 스코어가 올라감 |
| 시리즈 승리 | `🎉 준플레이오프 승리!` 후 다음 라운드 |
| 시리즈 패배 | `😢 … 탈락` 후 결산 |

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/rookie/career.js
git commit -m "$(cat <<'EOF'
feat(루키): 포스트시즌 경기 진행

정규시즌과 같은 연출을 쓰되 상단이 라운드·시리즈 스코어로 바뀌어요.
투수는 단축 로테이션(선발 4경기마다, 불펜 등판 확률 상향)이고,
기록은 정규시즌과 분리해서 쌓아요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 6: 우승 판정 교체와 이어하기

**Files:**
- Modify: `beta/rookie/career.js`

**Interfaces:**
- Consumes: Task 4~5의 `S.post`, `inPost()`
- Produces: 없음 (기존 `finishSeason`·`showPro` 수정)

- [ ] **Step 1: 주사위를 실제 우승으로 바꾼다**

`career.js`의 `finishSeason` 안에서 아래 줄을 찾는다.

```js
    const champ = (rank === 1 && Math.random() < 0.6) || (rank > 1 && rank <= 3 && Math.random() < 0.22);
```

바꾼다.

```js
    // 한국시리즈를 실제로 이겼을 때만 우승이에요 (예전엔 순위로 주사위를 굴렸어요)
    const champ = !!(S.post && S.post.wonKS);
```

- [ ] **Step 2: 결산에 포스트시즌 성적을 한 줄 넣고 `S.post`를 정리한다**

`finishSeason` 안에서 `S.post`도 정리한다. **순서가 중요하다** — `champ`(Step 1)가 이미 위에서
`S.post.wonKS`를 읽은 뒤여야 하고, `postStatLine()`도 `S.post = null` 전에 불러야 한다.

Task 3 Step 5a에서 넣은 `S.lastStandings` 줄이 이미 여기 있다. **그 줄을 지우지 말고** 아래처럼 만든다.

```js
    // 결산 화면에서 보여줄 최종 순위표를 남겨둬요 (S.season을 곧 지우니까요)
    S.lastStandings = standingsHTML();
    S.season = null;
    S.pendingGame = false;
    const postLine = postStatLine();     // S.post를 지우기 전에 문구를 만들어요
    S.post = null;
    save();
```

그리고 `finishSeason` **바로 위**에 문구 함수를 넣는다.

```js
  /* 포스트시즌 성적 한 줄. 정규시즌 기록과 합치지 않아요. */
  function postStatLine() {
    const P = S.post;
    if (!P || !P.stats) return "";
    const t = P.stats;
    if (S.pos === "batter") {
      if (!t.ab) return "";
      return `🍂 가을야구 ${t.ab}타수 ${t.hits}안타${t.hr ? ` ${t.hr}홈런` : ""} (타율 ${(t.hits / t.ab).toFixed(3).slice(1)})`;
    }
    if (!t.g) return "";
    return `🍂 가을야구 ${t.g}경기 ${t.ip}이닝 ${t.k}탈삼진 ${t.er}자책`;
  }
```

`finishSeason`이 만드는 `feeds` 배열에서, `🏁 정규시즌 종료` 항목 **바로 뒤**에 넣는다.

```js
    if (postLine) feeds.push({ text: postLine });
```

- [ ] **Step 3: 이어하기가 포스트시즌을 알게 한다**

`career.js` 맨 아래 `showPro:` 를 찾는다.

```js
    showPro: () => {
      if ((S.season && S.pendingGame) || S.camp > 0) { renderPro(); show("screen-pro"); }
      else if (S.season) runSeason();
      else seasonReport();
    },
```

바꾼다.

```js
    showPro: () => {
      // 가을야구 도중에 나갔다 와도 그 자리에서 이어져요
      if (inPost()) { renderPost(); show("screen-pro"); }
      else if ((S.season && S.pendingGame) || S.camp > 0) { renderPro(); show("screen-pro"); }
      else if (S.season) runSeason();
      else seasonReport();
    },
```

- [ ] **Step 4: 확인한다**

```bash
cd /workspace/grow-games && node --check beta/rookie/career.js && echo "문법 OK"
grep -c 'Math.random() < 0.6' beta/rookie/career.js   # 기대: 0
grep -c 'S.post = null' beta/rookie/career.js          # 기대: 2 (미진출 경로 + finishSeason)
```

브라우저에서 Task 5의 콘솔 트릭으로 시즌 끝까지 가서:

| 확인 | 기대 |
|---|---|
| 한국시리즈 우승 후 결산 | `🏆 한국시리즈 우승!!` + 🏛️ 명전 기록에 우승 1회 반영 |
| 탈락 후 결산 | 우승 문구 없음 |
| 타자로 가을야구를 뛰었으면 | `🍂 가을야구 N타수 N안타 (타율 .xxx)` 한 줄 |
| **정규시즌 타율** | 가을야구 성적이 **섞이지 않음** |
| 가을야구 도중 새로고침 | 같은 라운드·차수에서 이어짐 |
| 6위 이하 시즌 | `S.post`가 `null`, 결산에 가을야구 줄 없음 |

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/rookie/career.js
git commit -m "$(cat <<'EOF'
feat(루키): 우승을 한국시리즈 결과로 판정

예전엔 1위 60% / 2~3위 22% 주사위로 우승을 정했어요.
이제 7전 4선승을 실제로 이겨야 우승이에요. 우승이 훨씬 귀해져요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 7: 밸런스 검증

**Files:**
- Test: `scratchpad/ps/test-balance.js`

**Interfaces:**
- Consumes: `Postseason` 전체
- Produces: 없음 (검증 전용. 문제가 나오면 `simSeries`의 확률식을 조정)

- [ ] **Step 1: 순위별 우승 확률을 뽑는다**

`scratchpad/ps/test-balance.js`:

```js
/* 순위별 우승 확률 — 1위가 가장 높고 5위가 가장 낮아야 한다.
 * 내 팀도 NPC와 같은 강도로 두고 1000시즌을 굴린다. */
const fs = require("fs");
const vm = require("vm");

const FILE = "/workspace/grow-games/beta/rookie/postseason.js";
const sandbox = { window: {}, Math, console };
sandbox.globalThis = sandbox;
vm.runInContext(fs.readFileSync(FILE, "utf8"), vm.createContext(sandbox), { filename: FILE });
const P = sandbox.window.Postseason;

const TEAMS = ["A","B","C","D","E","F","G","H","I","J"];
// 상위 팀일수록 강하게 — initSeason의 rand(0.36, 0.62) 범위를 흉내낸다
const standings = TEAMS.map((name, i) => ({ name, w: 90 - i * 5, l: 54 + i * 5, str: 0.62 - i * 0.026 }));
const strOf = standings.reduce((m, t) => ((m[t.name] = t.str), m), {});

function runSeason(myTeam) {
  const b = P.buildBracket(standings, myTeam);
  if (!b) return false;
  let series = b.series, guard = 0;
  for (;;) {
    if (guard++ > 10) throw new Error("무한루프");
    series = P.feedWinner(series);
    const idx = series.findIndex((s) => !s.done && s.b != null);
    if (idx < 0) break;
    const s = series[idx];
    series = series.map((x, i) => (i === idx
      ? P.simSeries(s.round, s.a, s.b, strOf[s.a], strOf[s.b], s.round === "wc" ? 1 : 0)
      : x));
  }
  return series[3].winner === myTeam;
}

const N = 2000;
console.log(`=== 순위별 한국시리즈 우승 확률 (${N}시즌) ===`);
const rates = [];
for (let rank = 1; rank <= 5; rank++) {
  let wins = 0;
  for (let i = 0; i < N; i++) if (runSeason(TEAMS[rank - 1])) wins++;
  const pct = wins / N * 100;
  rates.push(pct);
  console.log(`  ${rank}위: ${pct.toFixed(1)}%  ${"█".repeat(Math.round(pct / 2))}`);
}

let fail = 0;
const check = (n, ok, d = "") => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); if (!ok) fail++; };
console.log("");
check("순위가 높을수록 우승 확률이 높다", rates.every((r, i) => i === 0 || r <= rates[i - 1] + 3),
  rates.map((r) => r.toFixed(1)).join(" ≥ "));
check("1위 우승 확률이 30~65% 사이", rates[0] >= 30 && rates[0] <= 65, `${rates[0].toFixed(1)}%`);
check("5위도 0%는 아님", rates[4] > 0.5, `${rates[4].toFixed(1)}%`);
check("합이 100% 근처 (한 시즌에 우승은 한 팀)",
  Math.abs(rates.reduce((a, b) => a + b, 0) - 100) < 25,
  `${rates.reduce((a, b) => a + b, 0).toFixed(1)}%`);

console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: 돌려서 결과를 본다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
node test-balance.js
```

기대: 네 항목 모두 `PASS`. 1위가 가장 높고 5위가 가장 낮은 완만한 내림차순.

**실패하면** `postseason.js`의 `simSeries` 안 확률식을 조정한다.

```js
const p = Math.max(0.2, Math.min(0.8, 0.5 + (strA - strB) * 1.2 + 0.04));
```

- 1위 확률이 65%를 넘으면 → 계수 `1.2`를 낮춘다(예: `0.9`)
- 5위가 0.5% 미만이면 → 계수를 더 낮추거나 홈 어드밴티지 `0.04`를 줄인다

조정한 뒤 Task 2의 `test-series.js`도 다시 돌려 깨지지 않았는지 확인한다.

- [ ] **Step 3: 전체 스위트를 한 번에 돌린다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
for f in test-bracket test-series test-flow test-balance; do echo "--- $f ---"; node $f.js | tail -1; done
```

기대: 네 줄 모두 `PASS`.

- [ ] **Step 4: 조정이 있었으면 커밋**

확률식을 안 건드렸으면 이 Step은 건너뛴다.

```bash
cd /workspace/grow-games
git add beta/rookie/postseason.js
git commit -m "$(cat <<'EOF'
balance(루키): 가을야구 시리즈 확률식 조정

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 8: 상용 반영과 릴리스

> ⚠️ **실제 서비스에 배포한다. 시작 전 사용자 확인을 받는다.**
> Task 3·5·6의 브라우저 확인이 끝나지 않았으면 진행하지 않는다.

**Files:**
- Modify: `rookie/*` (`promote.sh`가 `beta/`에서 복사)
- Modify: `VERSION`, `CHANGELOG.md` (`release.sh`)
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1~7을 통과한 `beta/rookie/`
- Produces: 상용 배포

- [ ] **Step 1: `beta/`와 루트의 차이가 rookie뿐인지 확인한다**

`promote.sh`는 `beta/` 전체를 루트로 복사한다. 다른 작업이 섞여 있으면 함께 나간다.

```bash
cd /workspace/grow-games
for item in rookie idol stock dev chef stream soccer unicorn stats index.html env.js match.js stats.js ads.js fx.js base.css timing.js radar.js manifest.webmanifest sw.js; do
  [ -e "$item" ] && [ -e "beta/$item" ] && ! diff -rq "$item" "beta/$item" > /dev/null 2>&1 && echo "차이: $item"
done
echo "(rookie만 나오면 안전)"
```

- [ ] **Step 2: 원격을 먼저 받아 리베이스한다**

이 저장소는 다른 곳에서도 푸시된다. 상용 반영 전에 최신을 받는다.

```bash
cd /workspace/grow-games
doppler run -- bash -c 'git config credential.helper "!f(){ echo username=x; echo password=$GITHUB_TOKEN; };f"; git fetch -q origin main && git rebase origin/main; s=$?; git config --unset credential.helper; exit $s'
git log --oneline -3 | cat
```

충돌이 나면 멈추고 사용자에게 보고한다.

- [ ] **Step 3: 상용에 반영한다**

```bash
cd /workspace/grow-games
bash scripts/promote.sh
git status --short
diff -rq rookie beta/rookie && echo "루트 == 베타 동일"
```

기대: `rookie/` 아래 파일들만 `M`/`??`. `rookie/postseason.js`는 새 파일이라 `??`로 나온다.

- [ ] **Step 4: README를 갱신한다**

`README.md`의 `### 신작 · 기능` 목록 맨 위에 넣는다.

```markdown
- 🍂 **가을야구 · 한국시리즈(더 루키)** — 정규시즌 144경기가 끝나면 5위까지 가을야구에 나가요. 실제 KBO대로 와일드카드(4위가 1승 안고 시작) → 준PO → PO → 한국시리즈 순이고, 내가 안 낀 라운드는 자동으로 치러져 상대가 정해져요. 우승은 이제 순위로 굴리는 주사위가 아니라 7전 4선승을 실제로 이겨야 해요. 📊 팀 순위표도 프로 화면에서 접었다 펼 수 있어요
```

- [ ] **Step 5: 커밋하고 릴리스한다**

버전은 **현재 `VERSION` + 마이너**다. `cat VERSION`으로 확인해서 정한다(계획 작성 시점엔 2.3.1이었으므로 2.4.0).

```bash
cd /workspace/grow-games
cat VERSION
git add -A
git commit -m "$(cat <<'EOF'
release: promote beta → prod (더 루키 가을야구·한국시리즈)

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
doppler run -- bash -c 'git config credential.helper "!f(){ echo username=x; echo password=$GITHUB_TOKEN; };f"; bash scripts/release.sh 2.4.0 "더 루키 가을야구·한국시리즈"; s=$?; git config --unset credential.helper; exit $s'
```

- [ ] **Step 6: 상용을 확인한다**

```bash
until [ "$(curl -s https://parkbeommin.github.io/grow-games/VERSION)" = "2.4.0" ]; do sleep 5; done
curl -s https://parkbeommin.github.io/grow-games/rookie/postseason.js | head -3
```

기대: `VERSION`이 `2.4.0`, `postseason.js`가 서빙됨.

문제가 있으면 `bash scripts/rollback.sh <릴리스 커밋>`으로 되돌린다.

---

## 스펙 대비 커버리지

| 스펙 절 | 담당 Task |
|---|---|
| 2. 순위표 노출 (프로 화면 접이식, 시즌 결산) | Task 3 |
| 3. 진출 규칙과 대진 (5팀, 와카 1승 어드밴티지) | Task 1, 검증은 Task 2 |
| 3. 내가 없는 라운드 자동 시뮬 | Task 4 |
| 4. 포스트시즌 경기 진행 (같은 연출) | Task 5 |
| 4. 투수 단축 로테이션 (선발 4경기, 불펜 60%/70%) | Task 5 Step 2 |
| 4. 기록 분리 | Task 5 Step 3, Task 6 Step 2 |
| 4. 시리즈 중 훈련 없음 · 라운드 사이 컨디션 +15 | Task 5 Step 1(훈련 없음), Step 3(회복) |
| 5. `S.post` 저장 구조 · 이어하기 | Task 4 Step 2, Task 6 Step 3 |
| 6. 우승 판정 교체 · `S.post` 정리 순서 | Task 6 Step 1~2 |
| 7. 순수 함수 분리 | Task 1~2 |
| 8. 검증 | Task 1·2·4·7 (자동), Task 3·5·6 (브라우저) |
| 9. 배포 | Task 8 |
