# 플레이어 피드백 대응 구현 계획 — 은퇴 확인 · 초반 경제 · 도움말

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플레이어가 보낸 피드백 3건(은퇴에 확인 절차 없음 · 초반에 돈이 안 모임 · 게임 내 설명 부재)을 해결한다.

**Architecture:** 도움말은 루트에 공용 `help.js`를 만들어 `window.Help.open(title, sections)` 하나만 노출하고(저장소의 `match.js`·`fx.js`와 같은 패턴), 기존 `.av-overlay` 모달 스타일을 재사용한다. 은퇴 확인창은 각 게임 `career.js`의 결산 버튼 한 곳에만 붙인다. 초반 경제는 ⚾ 더 루키의 대회 수당과 장비 가격 상수만 조정한다.

**Tech Stack:** 순수 HTML/CSS/JS. 빌드·의존성·모듈 시스템 없음. GitHub Pages 정적 서빙.

설계 스펙: `docs/superpowers/specs/2026-07-26-feedback-onboarding-design.md`

## Global Constraints

- **작업은 `beta/` 안에서만 한다.** 루트 게임 폴더는 건드리지 않는다.
- **이번에는 `promote.sh`와 `release.sh`를 실행하지 않는다.** 베타 반영까지가 이 계획의 끝이다. 상용 배포는 사용자가 브라우저로 확인한 뒤 별도로 진행한다.
- **의존성을 추가하지 않는다.** package.json·npm·CDN 스크립트·모듈 시스템 전부 금지. 새 공용 코드는 `window.*` 전역으로 노출한다.
- **정규시즌 경기 수(144)·경기당 클릭 수·훈련 횟수를 바꾸지 않는다.**
- **🦄 유니콘은 건드리지 않는다.** 방치형이라 은퇴·대회·상점 구조가 전부 다르다.
- **초반 경제 조정은 ⚾ 더 루키에만 적용한다.** 다른 게임은 대회·상점 구조가 달라 같은 숫자를 쓸 수 없다.
- Korean UI 문구, 기존 해요체.
- **줄 번호는 작업 시작 전 기준이다.** 앞 Task가 코드를 넣으면 밀린다. 대상은 함수 이름이나 고유 문자열로 찾는다.
- **커밋 메시지는 아래 두 줄로 끝난다.**
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
  ```

## 검증 방식

테스트 러너가 없고 넣지 않는다(승인된 결정). node의 `vm`으로 배포되는 코드를 직접 올려 실행한다.
테스트 파일은 저장소가 아니라 스크래치패드에 둔다.

**스크래치패드:** `/tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb/`

기존 스위트(가을야구 6종 + 환생)가 `../ps/`에 있고 전부 통과 상태다. **수정하거나 chmod 하지 말고 실행만 한다.**

## File Structure

| 파일 | 역할 | Task |
|---|---|---|
| `beta/help.js` | **신규.** 도움말 모달. `window.Help.open(title, sections)` | 1 |
| `beta/base.css` | 도움말 모달 스타일 (`.help-*`) | 1 |
| `beta/rookie/index.html` | `help.js` 로드 + HUD 2곳에 ❓ 버튼 | 2 |
| `beta/rookie/sw.js` | `ASSETS`에 `../help.js` | 2 |
| `beta/rookie/game.js` | 도움말 내용 + 버튼 연결 · 대회 수당 · 장비 가격 | 2, 5 |
| `beta/{idol,soccer,stock,dev,chef,stream}/{index.html,sw.js,game.js}` | 도움말 연결 | 3 |
| `beta/{7개}/career.js` | 은퇴 확인창 | 4 |

---

### Task 1: 공용 도움말 모달 `help.js`

**Files:**
- Create: `beta/help.js`
- Modify: `beta/base.css` (맨 아래에 추가)
- Test: `scratchpad/fb/test-help.js` (저장소 밖)

**Interfaces:**
- Consumes: 없음
- Produces: `window.Help.open(title, sections)`
  - `title`: 문자열
  - `sections`: `{ emoji, title, body }[]` — `body`의 `\n`은 줄바꿈으로 렌더된다
  - 반환값 없음. 이미 열려 있으면 아무 일도 하지 않는다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```bash
mkdir -p /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb
```

`scratchpad/fb/test-help.js`:

```js
/* help.js 검증 — 배포되는 파일을 node에서 그대로 올려 쓴다. */
const fs = require("fs");
const vm = require("vm");

const FILE = "/workspace/grow-games/beta/help.js";
let pass = 0, fail = 0;
const ck = (n, ok, d = "") => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); ok ? pass++ : fail++; };

// 최소 DOM 스텁 — appendChild된 요소를 그대로 붙잡아 검사한다.
function boot() {
  const added = [];
  const mk = () => {
    const el = {
      className: "", innerHTML: "", onclick: null, _listeners: {},
      addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); },
      remove() { const i = added.indexOf(this); if (i >= 0) added.splice(i, 1); },
      querySelector(sel) {
        // innerHTML에 그 클래스가 있으면 클릭 가능한 가짜 버튼을 돌려준다
        return this.innerHTML.includes(sel.replace(".", "")) ? { onclick: null } : null;
      },
    };
    return el;
  };
  const sb = {
    console,
    document: {
      createElement: mk,
      body: { appendChild: (el) => added.push(el) },
      querySelector: (sel) => added.find((e) => e.className.includes(sel.replace(".", ""))) || null,
    },
    window: {},
  };
  sb.globalThis = sb;
  vm.runInContext(fs.readFileSync(FILE, "utf8"), vm.createContext(sb), { filename: FILE });
  return { Help: sb.window.Help, added };
}

console.log("=== 모달 생성 ===");
{
  const { Help, added } = boot();
  ck("window.Help.open이 함수", typeof Help.open === "function");
  Help.open("⚾ 도움말", [
    { emoji: "🏋️", title: "훈련", body: "매달 훈련해요" },
    { emoji: "💰", title: "돈", body: "대회 수당\n연봉" },
  ]);
  ck("오버레이가 body에 붙음", added.length === 1, `${added.length}개`);
  const html = added[0].innerHTML;
  ck("제목이 들어감", html.includes("⚾ 도움말"));
  ck("절 2개가 모두 렌더", html.includes("훈련") && html.includes("돈"));
  ck("이모지가 들어감", html.includes("🏋️") && html.includes("💰"));
  ck("body의 줄바꿈이 <br>로", html.includes("대회 수당<br>연봉"), html.match(/대회 수당.{0,8}/)?.[0]);
  ck("닫기 버튼이 있음", html.includes("help-close"));
  ck("av-overlay 스타일 재사용", added[0].className.includes("av-overlay"));
}

console.log("\n=== 중복 열기 방지 ===");
{
  const { Help, added } = boot();
  Help.open("A", [{ emoji: "1", title: "t", body: "b" }]);
  Help.open("B", [{ emoji: "2", title: "t", body: "b" }]);
  ck("두 번 열어도 하나만", added.length === 1, `${added.length}개`);
  ck("먼저 연 것이 유지됨", added[0].innerHTML.includes("A"));
}

console.log("\n=== HTML 이스케이프 ===");
{
  const { Help, added } = boot();
  Help.open("<script>x</script>", [{ emoji: "&", title: "<b>제목</b>", body: "a<c" }]);
  const html = added[0].innerHTML;
  ck("제목의 태그가 이스케이프됨", !html.includes("<script>"), html.slice(0, 60));
  ck("절 제목의 태그가 이스케이프됨", html.includes("&lt;b&gt;제목&lt;/b&gt;"));
  ck("앰퍼샌드 이스케이프", html.includes("&amp;"));
  ck("본문의 부등호 이스케이프", html.includes("a&lt;c"));
}

console.log("\n=== 빈 입력 ===");
{
  const { Help, added } = boot();
  Help.open("빈 도움말", []);
  ck("절이 없어도 열림", added.length === 1);
  ck("닫기 버튼은 여전히 있음", added[0].innerHTML.includes("help-close"));
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass}건 통과 / ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb
node test-help.js
```

기대: `ENOENT: no such file or directory ... beta/help.js`

- [ ] **Step 3: `help.js`를 만든다**

`beta/help.js`:

```js
/* ❓ 공용 도움말 모달 — match.js·fx.js처럼 전역으로 노출해요.
 * base.css의 .av-overlay / .av-modal 스타일을 그대로 재사용해요.
 *
 *   Help.open("⚾ 더 루키 도움말", [
 *     { emoji: "🏋️", title: "훈련과 컨디션", body: "매달 훈련이나 휴식을 골라요.\n컨디션이 낮으면 부상 위험이 커져요." },
 *   ]);
 */
(function () {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const nl = (s) => esc(s).replace(/\n/g, "<br>");

  function open(title, sections) {
    // 이미 열려 있으면 겹쳐 열지 않아요.
    if (document.querySelector(".help-overlay")) return;

    const ov = document.createElement("div");
    ov.className = "av-overlay help-overlay";
    ov.innerHTML = `
      <div class="av-modal help-modal">
        <p class="av-title">${esc(title)}</p>
        <div class="help-body">${(sections || []).map((s) => `
          <section class="help-sec">
            <h4>${esc(s.emoji)} ${esc(s.title)}</h4>
            <p>${nl(s.body)}</p>
          </section>`).join("")}</div>
        <div class="av-actions"><button class="btn btn-ghost help-close">닫기</button></div>
      </div>`;

    const close = () => ov.remove();
    const btn = ov.querySelector(".help-close");
    if (btn) btn.onclick = close;
    // 모달 바깥을 눌러도 닫혀요.
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    document.body.appendChild(ov);
  }

  window.Help = { open };
})();
```

- [ ] **Step 4: 스타일을 추가한다**

`beta/base.css` 맨 아래에 넣는다. `.av-modal`이 `text-align: center`라 본문만 왼쪽 정렬로 되돌린다.

```css
/* ❓ 도움말 모달 — .av-modal 위에 얹어 본문만 읽기 좋게 만들어요 */
.help-modal { width: 420px; max-width: 92vw; text-align: left; }
.help-body { max-height: 62vh; overflow-y: auto; padding: 2px 2px 6px; }
.help-sec { margin-bottom: 14px; }
.help-sec:last-child { margin-bottom: 4px; }
.help-sec h4 { font-size: .92rem; color: var(--cream); margin-bottom: 4px; font-weight: 400; font-family: "Jua", sans-serif; }
.help-sec p { font-size: .82rem; color: var(--dim); line-height: 1.65; }
```

- [ ] **Step 5: 통과를 확인한다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb
node test-help.js
```

기대: `PASS: N건 통과 / 0건 실패` — **실패 0건만 본다.**

- [ ] **Step 6: 커밋**

```bash
cd /workspace/grow-games
git add beta/help.js beta/base.css
git commit -m "$(cat <<'EOF'
feat(도움말): 공용 도움말 모달 help.js

match.js·fx.js와 같은 전역 노출 패턴이에요. 기존 .av-overlay 모달을
재사용해서 새 CSS는 본문 정렬과 스크롤 정도예요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 2: ⚾ 더 루키에 도움말 붙이기

**Files:**
- Modify: `beta/rookie/index.html` (스크립트 로드 + HUD 2곳)
- Modify: `beta/rookie/sw.js` (`ASSETS`)
- Modify: `beta/rookie/game.js` (내용 정의 + 버튼 연결)
- Test: `scratchpad/fb/test-help-content.js`

**Interfaces:**
- Consumes: Task 1의 `window.Help.open(title, sections)`
- Produces: `HELP_SECTIONS` — `{ emoji, title, body }[]`, `game.js` 안의 상수. Task 3이 다른 게임에서 같은 이름으로 각자 정의한다

- [ ] **Step 1: 스크립트를 로드하고 HUD에 버튼을 넣는다**

`beta/rookie/index.html`에서 `<script src="game.js"></script>` **바로 위**에 넣는다.

```html
  <script src="../help.js"></script>
```

그리고 `id="btn-home-main"` 버튼 줄 **바로 위**에 넣는다.

```html
          <button class="mini-btn hud-battle" id="btn-help-main">❓ 도움말</button>
```

`id="btn-home-pro"` 버튼 줄 **바로 위**에도 넣는다.

```html
          <button class="mini-btn hud-battle" id="btn-help-pro">❓ 도움말</button>
```

- [ ] **Step 2: 서비스워커 캐시 목록에 넣는다**

`beta/rookie/sw.js`의 `ASSETS` 배열에 `"../help.js"`를 추가한다. `"../match.js"` 바로 뒤에 둔다.
빠뜨리면 오프라인에서 `Help is not defined`가 난다.

- [ ] **Step 3: 내용을 정의하고 버튼에 연결한다**

`beta/rookie/game.js` 맨 아래에 넣는다.

```js
// ---------- ❓ 도움말 ----------
const HELP_SECTIONS = [
  { emoji: "🏋️", title: "훈련과 컨디션", body:
    "매달 훈련이나 휴식을 골라요. 훈련은 능력치를 올리고 컨디션을 깎아요.\n" +
    "컨디션이 낮은 채로 계속 훈련하면 부상 위험이 커져요. 무리하지 말고 쉬어 가세요." },
  { emoji: "⭐", title: "재능과 각성", body:
    "능력치 옆의 별은 훈련 효율이에요. 별이 많을수록 같은 훈련으로 더 많이 올라요.\n" +
    "능력치 100을 넘으면 '한계 돌파' 구간이라 훈련 효율이 절반이 되고, 그때부터 🔮각성으로\n" +
    "재능을 올릴 수 있어요. 상한(130)까지 채우면 훈련 대신 각성만 남아요.\n" +
    "재능이 최대가 되면 🌠초월로 상한 자체를 6씩 올려요 — 성공할수록 어려워지지만\n" +
    "명예의 전당 점수가 크게 붙어요." },
  { emoji: "🏆", title: "대회와 드래프트", body:
    "고교 3년 동안 대회가 6번 열려요(6월 황금사자기 · 8월 청룡기).\n" +
    "성적이 스카우트 주목도를 올려요. 3학년이 끝나면 주목도와 종합 능력치를 함께 봐서\n" +
    "드래프트 지명이 갈려요 — 대회 성적만큼 평소 훈련도 중요해요.\n" +
    "지명되면 프로 무대로, 아니면 고교에서 커리어가 끝나요." },
  { emoji: "🎓", title: "은퇴와 환생", body:
    "둘 다 커리어를 마치지만 남기는 게 달라요.\n" +
    "🎓은퇴는 🏛️명예의 전당에 기록을 남겨요. 전 세계 플레이어와 순위를 겨뤄요.\n" +
    "🧬환생은 기록 대신 유산을 남겨, 다음 캐릭터가 더 높은 재능과 시작 자금으로 출발해요.\n" +
    "환생은 🏆우승 3회 · 🎖️MVP 3회 · 🌠초월 1단계 중 하나를 이뤄야 열려요." },
  { emoji: "💰", title: "돈 벌기와 쓰기", body:
    "고교 때는 대회 수당이, 프로에서는 경기 수당과 시즌 연봉이 들어와요.\n" +
    "🛍️상점에서 장비를 사면 능력치가 바로 올라요. 등급은 순서대로만 살 수 있어요.\n" +
    "30분마다 🎁특훈으로 무료 훈련을 한 번 받을 수 있어요." },
];

function openHelp() {
  if (window.Help) window.Help.open("⚾ 더 루키 도움말", HELP_SECTIONS);
}
$("btn-help-main")?.addEventListener("click", openHelp);
$("btn-help-pro")?.addEventListener("click", openHelp);
```

- [ ] **Step 4: 검증한다**

`scratchpad/fb/test-help-content.js`:

```js
/* 게임별 도움말 연결 검증 — 마크업과 상수를 실제 파일에서 확인한다. */
const fs = require("fs");
let pass = 0, fail = 0;
const ck = (n, ok, d = "") => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); ok ? pass++ : fail++; };

const GAMES = process.argv.slice(2);
for (const g of GAMES) {
  const dir = `/workspace/grow-games/beta/${g}`;
  const html = fs.readFileSync(`${dir}/index.html`, "utf8");
  const sw = fs.readFileSync(`${dir}/sw.js`, "utf8");
  const js = fs.readFileSync(`${dir}/game.js`, "utf8");
  console.log(`\n=== ${g} ===`);
  ck("help.js 로드", html.includes('src="../help.js"'));
  ck("help.js가 game.js보다 먼저", html.indexOf('"../help.js"') < html.indexOf('"game.js"'));
  ck("HUD 버튼 2개", (html.match(/id="btn-help-/g) || []).length === 2,
    `${(html.match(/id="btn-help-/g) || []).length}개`);
  ck("sw.js ASSETS에 등록", /ASSETS = \[[^\]]*\.\.\/help\.js/.test(sw));
  ck("HELP_SECTIONS 정의", /const HELP_SECTIONS = \[/.test(js));
  ck("버튼 두 개 모두 연결", (js.match(/btn-help-(main|pro)/g) || []).length === 2);
  // 상수를 실제로 평가해 모양을 확인한다
  const m = js.match(/const HELP_SECTIONS = \[[\s\S]*?\n\];/);
  ck("HELP_SECTIONS 파싱 가능", !!m);
  if (m) {
    const secs = eval(m[0].replace("const HELP_SECTIONS =", "(") + ")");
    ck("절이 5개", secs.length === 5, `${secs.length}개`);
    ck("모든 절에 emoji·title·body", secs.every((s) => s.emoji && s.title && s.body));
    ck("빈 body 없음", secs.every((s) => s.body.trim().length > 20));
  }
}
console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass}건 통과 / ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
```

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb
node test-help-content.js rookie
node test-help.js
cd /workspace/grow-games && node --check beta/rookie/game.js && echo "문법 OK"
```

기대: 두 스위트 모두 실패 0건, 문법 OK.

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/rookie/
git commit -m "$(cat <<'EOF'
feat(도움말): 더 루키에 ❓ 도움말 버튼과 내용

훈련·재능·대회·은퇴와 환생·돈 다섯 절이에요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 3: 나머지 6개 게임에 도움말 붙이기

**Files:**
- Modify: `beta/{idol,soccer,stock,dev,chef,stream}/{index.html,sw.js,game.js}`

**Interfaces:**
- Consumes: Task 1의 `window.Help.open`, Task 2가 확립한 `HELP_SECTIONS` 형태
- Produces: 없음

- [ ] **Step 1: 여섯 게임에 같은 배선을 넣는다**

각 게임에서 Task 2의 Step 1~2와 **똑같이** 한다.

- `index.html`: `<script src="game.js">` 바로 위에 `<script src="../help.js"></script>`
- `index.html`: `id="btn-home-main"` 줄 위에 `<button class="mini-btn hud-battle" id="btn-help-main">❓ 도움말</button>`
- `index.html`: `id="btn-home-pro"` 줄 위에 `<button class="mini-btn hud-battle" id="btn-help-pro">❓ 도움말</button>`
- `sw.js`: `ASSETS`에 `"../help.js"` 추가

- [ ] **Step 2: 게임별 내용을 넣는다**

여섯 게임 모두 **1·2·4·5번째 절과 `openHelp` 배선이 완전히 동일하다.** 게임마다 다른 것은
모달 제목과 3번째 절뿐이다. 아래 표의 값을 그대로 쓴다 — 문구를 새로 지어내지 않는다.

| 게임 | 모달 제목 |
|---|---|
| idol | `🎤 더 트레이니 도움말` |
| soccer | `⚽ 더 윙어 도움말` |
| stock | `📈 더 인베스터 도움말` |
| dev | `💻 더 커밋 도움말` |
| chef | `🍜 더 셰프 도움말` |
| stream | `📺 더 스트리머 도움말` |

3번째 절은 게임별로 아래를 그대로 쓴다.

```js
// idol
  { emoji: "🎤", title: "무대와 데뷔 서바이벌", body:
    "연습생 3년 동안 무대에 서며 실력과 인지도를 쌓아요.\n" +
    "3년이 끝나면 데뷔 서바이벌에서 그동안의 성과가 갈려요.\n" +
    "통과하면 데뷔해서 컴백 활동을 이어가고, 아니면 연습생으로 커리어가 끝나요." },

// soccer
  { emoji: "⚽", title: "경기와 프로 계약", body:
    "유스 3년 동안 경기에 나서며 실력과 주목도를 쌓아요.\n" +
    "3년이 끝나면 그동안의 성과로 프로 계약이 갈려요.\n" +
    "계약하면 리그 커리어를 이어가고, 아니면 유스에서 커리어가 끝나요." },

// stock
  { emoji: "📈", title: "매매와 전업 전향", body:
    "월급쟁이로 3년 동안 투자하며 실력과 자산을 쌓아요.\n" +
    "3년이 끝나면 그동안의 성과로 전업 전향이 갈려요.\n" +
    "전향하면 전업투자자로 이어가고, 아니면 여기서 커리어가 끝나요.\n" +
    "등장하는 종목은 전부 가상이고 투자 조언이 아니에요." },

// dev
  { emoji: "💻", title: "프로젝트와 취업", body:
    "코딩 왕초보로 3년 동안 프로젝트를 쌓으며 실력과 평판을 올려요.\n" +
    "3년이 끝나면 그동안의 성과로 취업이 갈려요.\n" +
    "합격하면 개발자 커리어를 이어가고, 아니면 여기서 커리어가 끝나요." },

// chef
  { emoji: "🍜", title: "대회와 주방 입성", body:
    "주방 막내로 3년 동안 요리 대회에 나서며 실력과 평판을 쌓아요.\n" +
    "3년이 끝나면 그동안의 성과로 주방 입성이 갈려요.\n" +
    "들어가면 셰프 커리어를 이어가고, 아니면 여기서 커리어가 끝나요." },

// stream
  { emoji: "📺", title: "방송과 전업 전향", body:
    "시청자 0명에서 3년 동안 방송하며 실력과 인지도를 쌓아요.\n" +
    "3년이 끝나면 그동안의 성과로 전업 전향이 갈려요.\n" +
    "전향하면 전업 스트리머로 이어가고, 아니면 여기서 커리어가 끝나요." },
```

`game.js` 맨 아래에 아래를 넣는다. **3번째 절과 제목만 위 표·코드로 갈아 끼우고 나머지는 그대로다.**
아래는 idol이 완성된 형태다.

```js
// ---------- ❓ 도움말 ----------
const HELP_SECTIONS = [
  { emoji: "🏋️", title: "훈련과 컨디션", body:
    "매달 훈련이나 휴식을 골라요. 훈련은 능력치를 올리고 컨디션을 깎아요.\n" +
    "컨디션이 낮은 채로 계속 훈련하면 탈이 나요. 무리하지 말고 쉬어 가세요." },
  { emoji: "⭐", title: "재능과 각성", body:
    "능력치 옆의 별은 훈련 효율이에요. 별이 많을수록 같은 훈련으로 더 많이 올라요.\n" +
    "능력치 100을 넘으면 '한계 돌파' 구간이라 훈련 효율이 절반이 되고, 그때부터 🔮각성으로\n" +
    "재능을 올릴 수 있어요. 상한(130)까지 채우면 훈련 대신 각성만 남아요.\n" +
    "재능이 최대가 되면 🌠초월로 상한 자체를 6씩 올려요 — 성공할수록 어려워지지만\n" +
    "명예의 전당 점수가 크게 붙어요." },
  { emoji: "🎤", title: "무대와 데뷔 서바이벌", body:
    "연습생 3년 동안 무대에 서며 실력과 인지도를 쌓아요.\n" +
    "3년이 끝나면 데뷔 서바이벌에서 그동안의 성과가 갈려요.\n" +
    "통과하면 데뷔해서 컴백 활동을 이어가고, 아니면 연습생으로 커리어가 끝나요." },
  { emoji: "🎓", title: "은퇴와 환생", body:
    "둘 다 커리어를 마치지만 남기는 게 달라요.\n" +
    "🎓은퇴는 🏛️명예의 전당에 기록을 남겨요. 전 세계 플레이어와 순위를 겨뤄요.\n" +
    "🧬환생은 기록 대신 유산을 남겨, 다음 캐릭터가 더 높은 재능과 시작 자금으로 출발해요.\n" +
    "환생은 🏆우승 3회 · 🎖️대상 3회 · 🌠초월 1단계 중 하나를 이뤄야 열려요." },
  { emoji: "💰", title: "돈 벌기와 쓰기", body:
    "활동 수당과 정산으로 돈이 들어와요.\n" +
    "🛍️상점에서 장비를 사면 능력치가 바로 올라요. 등급은 순서대로만 살 수 있어요.\n" +
    "30분마다 🎁특훈으로 무료 훈련을 한 번 받을 수 있어요." },
];

function openHelp() {
  if (window.Help) window.Help.open("🎤 더 트레이니 도움말", HELP_SECTIONS);
}
$("btn-help-main")?.addEventListener("click", openHelp);
$("btn-help-pro")?.addEventListener("click", openHelp);
```

**주의:** 환생 버튼은 지금 더 루키에만 있지만, 게이트 로직은 6개 게임에도 들어 있고 나중에 버튼이 붙는다. 그래서 은퇴·환생 절은 여섯 게임에도 그대로 넣는다.

- [ ] **Step 3: 검증한다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb
node test-help-content.js idol soccer stock dev chef stream
cd /workspace/grow-games
for g in idol soccer stock dev chef stream; do node --check beta/$g/game.js || echo "$g 실패"; done
echo "문법 전부 OK"
```

기대: 실패 0건, 문법 전부 OK.

- [ ] **Step 4: 커밋**

```bash
cd /workspace/grow-games
git add beta/
git commit -m "$(cat <<'EOF'
feat(도움말): 나머지 6개 게임에도 ❓ 도움말

같은 다섯 절 뼈대에 게임별 용어만 바꿨어요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 4: 은퇴 확인창 (7개 게임)

**Files:**
- Modify: `beta/{rookie,idol,soccer,stock,dev,chef,stream}/career.js`
- Test: `scratchpad/fb/test-retire-confirm.js`

**Interfaces:**
- Consumes: 각 게임의 `careerScore()`, `gradeOfScore()`, `S.career`
- Produces: `retireSummary()` — 확인창에 넣을 요약 문자열. 게임별로 필드명이 다르다

- [ ] **Step 1: 요약 함수와 확인창을 추가한다**

각 게임 `career.js`에서 `function enshrine(` **바로 위**에 넣는다.

**⚾ 더 루키 (rookie)** — 필드가 `rings`/`mvp`/`gg`/`roy`, 시즌 수는 `c.seasons.length`:

```js
  /* 🎓 은퇴 확인창에 넣을 요약. 되돌릴 수 없는 선택이라 뭐가 남는지 보여줘요. */
  function retireSummary() {
    const c = S.career || {};
    const awards = [
      (c.rings || 0) ? `🏆우승 ${c.rings}` : "",
      (c.mvp || 0) ? `🎖️MVP ${c.mvp}` : "",
      (c.gg || 0) ? `🧤GG ${c.gg}` : "",
      (c.roy || 0) ? "🌟신인왕" : "",
    ].filter(Boolean).join(" · ");
    const seasons = (c.seasons || []).length;
    return `    ${S.name} · ${seasons}시즌 · WAR ${(c.warSum || 0).toFixed(1)}\n`
      + (awards ? `    ${awards}\n` : "    수상 기록 없음\n");
  }
```

**나머지 6개 (idol · soccer · stock · dev · chef · stream)** — 필드가 `wins`/`daesang`/`bonsang`/`rookie`, 연차는 `c.years.length`:

```js
  /* 🎓 은퇴 확인창에 넣을 요약. 되돌릴 수 없는 선택이라 뭐가 남는지 보여줘요. */
  function retireSummary() {
    const c = S.career || {};
    const awards = [
      (c.wins || 0) ? `🏆우승 ${c.wins}` : "",
      (c.daesang || 0) ? `🎖️대상 ${c.daesang}` : "",
      (c.bonsang || 0) ? `🏅본상 ${c.bonsang}` : "",
      (c.rookie || 0) ? "🌟신인상" : "",
    ].filter(Boolean).join(" · ");
    const years = (c.years || []).length;
    return `    ${S.name} · ${years}년차\n`
      + (awards ? `    ${awards}\n` : "    수상 기록 없음\n");
  }
```

- [ ] **Step 2: 결산 화면의 은퇴 버튼에만 확인창을 건다**

각 게임 `career.js`에서 결산 화면의 은퇴 버튼을 찾는다. ⚾ 더 루키는 `ret.onclick = () => enshrine(S.team);`, 나머지 6개는 `ret.onclick = () => enshrine();`이다.

**rookie:**

```js
    ret.onclick = () => {
      if (!confirm(
        `🎓 여기서 커리어를 마칠까요?\n\n` +
        `· 명예의 전당에 기록이 남아요\n` + retireSummary() +
        `· 등급: ${gradeOfScore(careerScore())}\n\n` +
        `⚠️ 되돌릴 수 없어요. 유산을 남기려면 '환생'을 선택하세요.\n\n진행할까요?`
      )) return;
      enshrine(S.team);
    };
```

**나머지 6개** — 마지막 줄만 `enshrine();`으로 다르다:

```js
    ret.onclick = () => {
      if (!confirm(
        `🎓 여기서 커리어를 마칠까요?\n\n` +
        `· 명예의 전당에 기록이 남아요\n` + retireSummary() +
        `· 등급: ${gradeOfScore(careerScore())}\n\n` +
        `⚠️ 되돌릴 수 없어요. 유산을 남기려면 '환생'을 선택하세요.\n\n진행할까요?`
      )) return;
      enshrine();
    };
```

**드래프트 미지명(또는 각 게임의 서바이벌 탈락) 경로의 은퇴 버튼은 건드리지 않는다.** 그 버튼이 만들어지는 시점엔 이미 `clearSave()`가 끝나 되돌아갈 커리어가 없고, 취소하면 기록조차 못 남긴 채 끝난다. 확인창을 붙이면 오조작을 막는 게 아니라 기록을 잃을 길을 새로 만드는 셈이다.

- [ ] **Step 3: 검증한다**

`scratchpad/fb/test-retire-confirm.js`:

```js
/* 은퇴 확인창 검증 — 배포되는 career.js의 retireSummary를 실제로 실행한다. */
const fs = require("fs");
const vm = require("vm");
let pass = 0, fail = 0;
const ck = (n, ok, d = "") => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); ok ? pass++ : fail++; };
const blk = (s, m) => { const i = s.indexOf(m); let d = 0;
  for (let j = s.indexOf("{", i); j < s.length; j++) { if (s[j]==="{") d++; else if (s[j]==="}") { d--; if (!d) return s.slice(i, j+1); } } };

const ROOKIE = { name: "rookie", fields: { rings: 2, mvp: 1, gg: 3, roy: 1, warSum: 40.9, seasons: [1,2,3,4,5] }, expect: ["🏆우승 2", "🎖️MVP 1", "🧤GG 3", "🌟신인왕", "5시즌", "40.9"] };
const OTHER = (g) => ({ name: g, fields: { wins: 4, daesang: 2, bonsang: 1, rookie: 1, years: [1,2,3] }, expect: ["🏆우승 4", "🎖️대상 2", "🏅본상 1", "🌟신인상", "3년차"] });
const CASES = [ROOKIE, ...["idol","soccer","stock","dev","chef","stream"].map(OTHER)];

for (const c of CASES) {
  const src = fs.readFileSync(`/workspace/grow-games/beta/${c.name}/career.js`, "utf8");
  console.log(`\n=== ${c.name} ===`);
  ck("결산 은퇴 버튼에 confirm", /ret\.onclick = \(\) => \{\s*if \(!confirm\(/.test(src));
  ck("취소하면 enshrine 안 부름", /if \(!confirm\([\s\S]*?\)\) return;\s*\n\s*enshrine\(/.test(src));
  ck("환생을 안내함", src.includes("유산을 남기려면 '환생'을 선택하세요"));

  const ctx = vm.createContext({ console, S: { name: "테스트선수", career: c.fields } });
  vm.runInContext(blk(src, "function retireSummary(") + "\nglobalThis.__f = retireSummary;", ctx);
  const out = ctx.__f();
  for (const e of c.expect) ck(`요약에 ${e}`, out.includes(e), out.replace(/\n/g, " | "));

  // 수상이 없는 경우
  ctx.S.career = c.name === "rookie" ? { seasons: [], warSum: 0 } : { years: [] };
  ck("무관 커리어는 '수상 기록 없음'", ctx.__f().includes("수상 기록 없음"), ctx.__f().replace(/\n/g, " | "));
}
console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass}건 통과 / ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
```

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb
node test-retire-confirm.js
cd /workspace/grow-games
for g in rookie idol soccer stock dev chef stream; do node --check beta/$g/career.js || echo "$g 실패"; done
echo "문법 전부 OK"
```

또한 미지명 경로가 그대로인지 확인한다 — ⚾ 더 루키 기준:

```bash
grep -n 'btn.onclick = () => enshrine(null)' beta/rookie/career.js
```

기대: 한 줄이 그대로 남아 있다(확인창 없이).

- [ ] **Step 4: 커밋**

```bash
cd /workspace/grow-games
git add beta/
git commit -m "$(cat <<'EOF'
fix(은퇴): 시즌 결산의 은퇴 버튼에 확인창 추가 (7개 게임)

환생에만 confirm이 있고 은퇴는 클릭 즉시 실행돼서, 나란히 있는 두 버튼 중
하나만 되돌릴 기회가 있었어요. 남을 기록을 요약해 보여주고 확인을 받아요.

드래프트 미지명 경로의 은퇴 버튼은 그대로 뒀어요. 그 시점엔 이미 저장이
지워져 되돌아갈 커리어가 없고, 취소하면 기록조차 못 남기게 돼요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 5: ⚾ 더 루키 초반 경제

**Files:**
- Modify: `beta/rookie/game.js` (대회 수당 · 우승 보너스 · `GEAR_TIERS`)
- Test: `scratchpad/fb/test-economy.js`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (상수 조정)

- [ ] **Step 1: 대회 수당을 올린다**

`beta/rookie/game.js`에서 찾는다.

```js
      const pay = win ? 60 + tour.round * 25 : 25;
```

바꾼다.

```js
      // 고교 3년 총수입이 장비 최하 등급에도 못 미치던 걸 올렸어요 (플레이어 피드백)
      const pay = win ? 120 + tour.round * 50 : 50;
```

그리고 우승 보너스를 찾는다.

```js
        S.money = (S.money || 0) + 300;
```

바꾼다.

```js
        S.money = (S.money || 0) + 600;
```

- [ ] **Step 2: 장비 가격을 내린다**

`beta/rookie/game.js`의 `GEAR_TIERS`를 바꾼다. **보너스 수치와 등급 V 가격은 그대로 둔다.**

```js
const GEAR_TIERS = [
  { n: "I", bonus: 3, price: 300 },
  { n: "II", bonus: 5, price: 900 },
  { n: "III", bonus: 8, price: 2500 },
  { n: "IV", bonus: 12, price: 9000 },
  { n: "V", bonus: 16, price: 25000 },
];
```

- [ ] **Step 3: 검증한다**

`scratchpad/fb/test-economy.js`:

```js
/* 초반 경제 검증 — 배포되는 game.js의 실제 상수로 계산한다. */
const fs = require("fs");
const src = fs.readFileSync("/workspace/grow-games/beta/rookie/game.js", "utf8");
let pass = 0, fail = 0;
const ck = (n, ok, d = "") => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); ok ? pass++ : fail++; };

// 실제 소스에서 수당 식과 장비 표를 뽑는다
const payM = src.match(/const pay = win \? (\d+) \+ tour\.round \* (\d+) : (\d+);/);
ck("수당 식을 찾음", !!payM, payM && payM[0]);
const [, base, step, lose] = payM.map(Number);
const champM = src.match(/S\.money = \(S\.money \|\| 0\) \+ (\d+);/);
ck("우승 보너스를 찾음", !!champM, champM && champM[0]);
const champBonus = Number(champM[1]);

const tiers = [...src.matchAll(/\{ n: "(I{1,3}|IV|V)", bonus: (\d+), price: (\d+) \}/g)]
  .map((m) => ({ n: m[1], bonus: +m[2], price: +m[3] }));
ck("장비 5등급을 찾음", tiers.length === 5, `${tiers.length}개`);

const w = (r) => base + r * step;
const total = (roundsWon) => { let s = 0; for (let r = 0; r < roundsWon; r++) s += w(r); return s; };
const early = (total(0) + lose) * 6;              // 1회전 탈락 × 6대회
const mid = (total(2) + lose) * 6;                // 4강 탈락 × 6대회
const champ = (total(4) + champBonus) * 6;        // 전승 우승 × 6대회

let cum = 0;
const cumPrices = tiers.map((t) => (cum += t.price));
const buyable = (m) => { let n = 0; cumPrices.forEach((c) => { if (m >= c) n++; }); return n ? tiers[n - 1].n : "없음"; };

console.log("\n=== 고교 3년 총수입 ===");
console.log(`  1회전 탈락 ${early}만 → 장비 ${buyable(early)}`);
console.log(`  4강 탈락   ${mid}만 → 장비 ${buyable(mid)}`);
console.log(`  전승 우승  ${champ}만 → 장비 ${buyable(champ)}`);
console.log(`\n  장비 누적: ${cumPrices.join(" / ")}만`);

console.log("");
ck("1회전 탈락 300만", early === 300, `${early}만`);
ck("4강 탈락 2,040만", mid === 2040, `${mid}만`);
ck("전승 우승 8,280만", champ === 8280, `${champ}만`);
ck("1회전 탈락도 등급 I을 살 수 있음", buyable(early) === "I", buyable(early));
ck("4강 탈락은 등급 II", buyable(mid) === "II", buyable(mid));
ck("전승은 등급 III", buyable(champ) === "III", buyable(champ));
ck("장비 누적이 300/1200/3700/12700/37700", cumPrices.join(",") === "300,1200,3700,12700,37700", cumPrices.join(","));
ck("등급 V 단가는 25,000만 그대로", tiers[4].price === 25000, `${tiers[4].price}만`);
ck("보너스 수치는 3/5/8/12/16 그대로", tiers.map((t) => t.bonus).join(",") === "3,5,8,12,16", tiers.map((t) => t.bonus).join(","));
ck("고교 최대 수입이 프로 한 시즌(11,820만)보다 적음", champ < 11820, `${champ} < 11820`);

console.log(`\n${fail === 0 ? "PASS" : "FAIL"}: ${pass}건 통과 / ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
```

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb
node test-economy.js
cd /workspace/grow-games && node --check beta/rookie/game.js && echo "문법 OK"
```

기대: 실패 0건.

**주의:** 우승 보너스 정규식 `S.money = (S.money || 0) + (\d+);`가 파일 안에서 여러 번 일치할 수 있다. 테스트가 첫 일치를 쓰므로, 값이 600이 아닌 다른 숫자로 나오면 대회 우승 보너스가 아닌 다른 줄을 잡은 것이다. 그럴 땐 정규식을 `S.trophies.push` 근처로 좁힌다.

- [ ] **Step 4: 커밋**

```bash
cd /workspace/grow-games
git add beta/rookie/game.js
git commit -m "$(cat <<'EOF'
balance(루키): 초반 경제 — 대회 수당 2배 · 초반 장비 인하

고교 3년 동안 1회전 탈락형이 벌 수 있는 돈이 150만인데 장비 최하 등급이
500만이라, 3년을 플레이하고 아무것도 못 사는 구간이 있었어요 (플레이어 피드백).

대회 수당을 2배로 올리고 장비 I~IV를 내렸어요. 등급 V는 그대로 두어
후반 목표는 유지하고, 고교 최대 수입(8,280만)은 프로 한 시즌(11,820만)보다
여전히 적어 프로 진입의 도약감도 남겨요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 6: 전체 검증 — 베타까지만

> ⚠️ **`promote.sh`와 `release.sh`를 실행하지 않는다.** 상용 배포는 사용자가 브라우저로 확인한 뒤 별도로 진행한다.

**Files:**
- 없음 (검증 전용. 문제가 나오면 해당 파일 수정)

**Interfaces:**
- Consumes: Task 1~5의 전체 결과
- Produces: 없음

- [ ] **Step 1: 이번 작업의 스위트를 모두 돌린다**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/fb
node test-help.js
node test-help-content.js rookie idol soccer stock dev chef stream
node test-retire-confirm.js
node test-economy.js
```

기대: 네 스위트 모두 실패 0건.

- [ ] **Step 2: 기존 스위트가 깨지지 않았는지 확인한다**

가을야구와 환생 스위트는 `../ps/`에 있다. **수정하지 말고 실행만 한다.**

```bash
cd /tmp/claude-0/-workspace/c93e1bae-79b7-4a9a-b506-33a0444c7720/scratchpad/ps
for f in test-bracket test-series test-flow test-career-flow test-postgame test-resume test-rebirth; do
  echo -n "$f: "; node $f.js | tail -1
done
```

기대: 일곱 스위트 모두 실패 0건.

- [ ] **Step 3: 문법과 범위를 확인한다**

```bash
cd /workspace/grow-games
for g in rookie idol soccer stock dev chef stream; do
  node --check beta/$g/game.js && node --check beta/$g/career.js || echo "$g 실패"
done
node --check beta/help.js && echo "문법 전부 OK"

# 루트 게임 폴더가 그대로인지 (이번엔 promote 안 함)
git status --short | grep -v '^ M beta/\|^?? beta/\|^ M docs/' || echo "beta/ 밖 변경 없음"
```

기대: 문법 전부 OK. `beta/` 밖 변경 없음.

- [ ] **Step 4: 사용자에게 브라우저 확인을 요청한다**

```bash
cd /workspace/grow-games && python3 -m http.server 8000
```

아래를 사용자가 확인한다.

| # | 확인 | 어디서 |
|---|---|---|
| 1 | HUD에 `❓ 도움말` 버튼이 보이고, **HUD가 너무 길어지지 않았는지** | `/beta/rookie/` 메인·프로 화면 |
| 2 | ❓를 누르면 모달이 뜨고 다섯 절이 읽히는지. 닫기와 바깥 탭으로 닫히는지 | 같은 곳 |
| 3 | 시즌 결산에서 `🎓 은퇴하기`를 누르면 확인창이 뜨고, 취소하면 아무 일도 안 일어나는지 | 프로 시즌 결산 |
| 4 | 확인창의 요약(시즌 수·WAR·수상)이 실제 기록과 맞는지 | 같은 곳 |
| 5 | 고교 대회 수당이 늘어난 게 체감되는지, 상점에서 등급 I을 살 수 있는지 | 고교 단계 |
| 6 | 다른 게임(🎤 더 트레이니 등)에서도 ❓가 뜨고 내용이 그 게임 용어인지 | `/beta/idol/` |

**1번이 이번 작업에서 가장 불확실한 항목이다.** `.hud-right`가 세로 스택이라 버튼이 5개가 되면서 HUD가 한 줄 길어진다. 답답하면 가로 배치로 바꿔야 하는데, 그건 `base.css` 전역 변경이라 별건으로 다룬다.

- [ ] **Step 5: 확인 결과에 따라 정리**

문제가 없으면 이 계획은 여기서 끝난다. 상용 배포는 사용자 판단으로 별도 진행한다.

문제가 있으면 고치고 Step 1~3을 다시 돌린다.

---

## 스펙 대비 커버리지

| 스펙 절 | 담당 Task |
|---|---|
| 2. 은퇴 확인창 (결산 버튼에만, 요약 포함) | Task 4 |
| 2. 드래프트 미지명 경로는 제외 | Task 4 Step 2 + Step 3의 grep 확인 |
| 3. 초반 경제 (수당 2배 · 장비 인하) | Task 5 |
| 4. 도움말 구조 (`help.js`, `window.Help.open`) | Task 1 |
| 4. 내용 5절 · 게임별 배선 · `sw.js` 등록 | Task 2 (루키), Task 3 (나머지 6개) |
| 4. HUD 배치 확인 | Task 6 Step 4 (사용자 확인) |
| 5. 범위 밖 (유니콘·타 게임 경제·튜토리얼·HUD 가로배치) | 해당 작업 없음 (의도됨) |
| 6. 검증 | Task 1·2·4·5 (자동), Task 6 (통합 + 브라우저) |
| 7. 베타까지만 | Task 6 (promote·release 없음) |
