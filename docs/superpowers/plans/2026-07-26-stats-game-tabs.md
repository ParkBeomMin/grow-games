# 통계 대시보드 게임별 탭 분리 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/stats/` 대시보드를 게임별 탭으로 나눠, 한 번에 보이는 섹션을 최대 28개에서 3~6개로 줄인다.

**Architecture:** 진입 시 Supabase 뷰 4종을 1회 fetch해 모듈 스코프 `STATE`에 캐시하고, 전역 KPI와 합산 방문 추이는 `#overview`에 항상 렌더한다. 게임 8개 탭은 `#tabs`에 가로 스크롤 칩으로 고정 렌더하고, 활성 게임의 섹션만 `#panel`에 다시 그린다. 탭 상태는 URL 해시가 단일 진실 원천이고, 탭 전환에 네트워크 요청이 발생하지 않는다.

**Tech Stack:** 순수 HTML/CSS/JS (빌드 도구·프레임워크·패키지 매니저 없음), Supabase REST, PWA. 설계 스펙: `docs/superpowers/specs/2026-07-26-stats-game-tabs-design.md`

## Global Constraints

- **작업 파일은 `beta/stats/index.html` 하나다.** 루트 `stats/index.html`은 Task 8의 `promote.sh`가 덮어쓴다. 루트를 직접 수정하지 않는다.
- **의존성을 추가하지 않는다.** `package.json`, npm, CDN 스크립트 전부 금지. 이 저장소는 빌드 없이 GitHub Pages에서 그대로 서빙된다.
- **지표 계산 로직과 숫자를 바꾸지 않는다.** `bar()`, 집계식, 정렬 순서, `POS` / `EVENT_LABEL` / `CHOICE_ALIAS` / `UNI_STAGES` 매핑은 그대로 둔다. 이번 변경은 표시 구조만 다룬다.
- **Supabase SQL을 변경하지 않는다.** `SETUP_SQL` 상수도 그대로 둔다.
- **모든 커밋 메시지는 아래 두 줄로 끝난다.**
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
  ```
- **한국어 UI 문구를 쓴다.** 기존 문체(해요체)를 따른다.
- **이 문서의 모든 줄 번호는 작업 시작 전 원본 파일(441줄) 기준이다.** Task 1이 DOM에 2줄,
  Task 2가 상태·렌더 블록에 약 70줄을 넣으므로 이후 Task에서는 번호가 밀린다.
  **줄 번호는 위치를 가늠하는 참고로만 쓰고, 실제 대상은 함수 이름으로 찾는다**
  (`function choiceSection(`, `function funnelSection(` 등).

## 검증 방식에 대한 참고

이 저장소에는 `package.json`도 테스트 파일도 테스트 러너도 없다. 순수 정적 사이트이며,
설계 스펙 8절에서 **테스트 러너를 새로 들이지 않고 수동 브라우저 확인으로 검증**하기로 승인되었다.

따라서 각 Task의 "테스트" 단계는 자동화된 테스트 대신 **브라우저에서 실행하는 구체적 확인 절차**다.
각 절차는 실행할 명령, 열 URL, 볼 화면, 기대 결과를 명시한다.

**모든 Task의 검증에 필요한 준비:**

```bash
cd /workspace/grow-games
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000/beta/stats/` 를 연다.

> ⚠️ **대시보드는 비밀번호 게이트 뒤에 있다.** 소스에는 SHA-256 해시(`PW_HASH`)만 있고 평문은 없다.
> 검증하려면 사용자에게 비밀번호를 받아 입력해야 한다. 없으면 화면 확인이 불가능하므로,
> 코드 변경까지만 하고 검증을 사용자에게 넘긴다.
>
> 베타는 `env.js`가 localStorage를 `beta::` 네임스페이스로 격리하므로, 상용에서 이미 로그인했더라도
> `/beta/stats/` 에서 한 번 더 입력해야 한다. 정상 동작이다.

**베타에서도 실제 상용 데이터가 보인다.** `env.js`는 `stats.js`의 *기록*만 끄고 읽기는 막지 않는다.

## File Structure

| 파일 | 역할 | 이번 작업 |
|---|---|---|
| `beta/stats/index.html` | 대시보드 전체 (HTML+CSS+JS 인라인, 441줄) | **유일한 수정 대상.** 약 500줄이 된다 |
| `stats/index.html` | 상용 대시보드 | Task 8에서 `promote.sh`가 덮어씀. 직접 수정 금지 |
| `VERSION` | 상용 버전 | Task 8에서 `release.sh`가 `1.9.0` → `1.10.0` |
| `CHANGELOG.md` | 릴리스 이력 | Task 8에서 `release.sh`가 갱신 |

단일 파일을 유지한다 (스펙 10절). 441 → 약 500줄은 분리할 규모가 아니고, `sync-beta.sh` / `promote.sh` /
`sw.js` 어느 쪽도 파일이 늘어도 깨지지 않지만 실익이 없다.

`beta/stats/index.html` 안의 구조:

```
<style>          ...  .tabs / .tab  ← Task 1에서 칩 형태로
<body>
  #gate          ...  비밀번호 게이트 (건드리지 않음)
  #wrap
    #overview    ...  전역 KPI 7개 + 합산 방문 추이 + setupCard
    #tabs        ...  게임 8개 칩 (sticky)
    #panel       ...  활성 게임 섹션들
<script>
  상수           ...  GAMES / POS / CHOICE_ALIAS / EVENT_LABEL / UNI_STAGES (건드리지 않음)
  상태           ...  STATE / activeGame / gameFromHash        ← Task 2 신규
  섹션 빌더      ...  dailySection / choiceSection / unicornSection / funnelSection
                      → 전부 game 인자를 받도록 좁힘           ← Task 3~6
  렌더           ...  renderOverview / renderTabs / renderPanel ← Task 1~2 신규
  load()         ...  fetch → STATE → 렌더 3종
  sparkTooltip   ...  document 위임 (건드리지 않음)
  게이트         ...  (건드리지 않음)
```

---

### Task 1: 기준선 기록 + DOM/CSS 뼈대

화면에 보이는 결과가 **작업 전과 완전히 같아야 하는** 순수 구조 변경이다.
탭은 아직 렌더하지 않는다. 회귀 비교의 기준선을 먼저 확보하는 것이 이 Task의 핵심 목적이다.

**Files:**
- Modify: `beta/stats/index.html:33-35` (CSS `.tabs` / `.tab` / `.tab.on`)
- Modify: `beta/stats/index.html:73-78` (`#wrap` 내부 DOM)
- Modify: `beta/stats/index.html:273-321` (`load()` 안의 `$("content")` 참조)

**Interfaces:**
- Consumes: 없음 (첫 Task)
- Produces: DOM 요소 `#overview`, `#tabs`, `#panel`. 이후 모든 Task가 이 세 컨테이너에 렌더한다.
  `#content`는 더 이상 존재하지 않는다.

- [ ] **Step 1: 기준선 숫자를 기록한다**

브라우저에서 `http://localhost:8000/beta/stats/` 를 열고 비밀번호를 입력한다.
**작업 전** 상단 KPI 7개 값을 그대로 받아적는다. Task 7의 회귀 검증에서 이 값과 대조한다.

```
순 방문자        : ______
새 캐릭터        : ______
📲 앱 설치 수     : ______
📲 앱 사용 기기   : ______
배틀 횟수        : ______
은퇴 이벤트      : ______
🏛️ 명예의 전당    : ______
```

전체 페이지 스크린샷도 남긴다. 섹션 개수와 각 막대 그래프의 값을 나중에 비교할 근거가 된다.

- [ ] **Step 2: CSS를 칩 형태로 바꾼다**

`beta/stats/index.html` 33~35줄을 찾는다.

```css
    .tabs { display: flex; gap: 6px; margin-bottom: 16px; }
    .tab { flex: 1; padding: 9px; border: 1px solid var(--line); background: var(--bg2); color: var(--dim); border-radius: 10px; cursor: pointer; font-size: .9rem; }
    .tab.on { border-color: var(--accent); color: var(--accent); }
```

아래로 교체한다.

```css
    .tabs { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: thin; padding: 8px 4px; position: sticky; top: 0; z-index: 20; background: var(--bg); -webkit-overflow-scrolling: touch; }
    .tab { flex: 0 0 auto; white-space: nowrap; padding: 8px 14px; border: 1px solid var(--line); background: var(--bg2); color: var(--dim); border-radius: 999px; cursor: pointer; font-size: .88rem; }
    .tab.on { border-color: var(--accent); color: var(--accent); font-weight: 700; }
```

`z-index: 20`인 이유: `#gate`가 50, `.sparktip`(방문 추이 툴팁)이 40이다. 탭 바가 그보다 낮아야
툴팁을 가리지 않는다. `background: var(--bg)`가 없으면 sticky 상태에서 뒤 내용이 비쳐 보인다.

- [ ] **Step 3: DOM을 세 영역으로 나눈다**

73~78줄을 찾는다.

```html
  <div class="wrap" id="wrap" hidden>
    <h1>📊 통계 대시보드</h1>
    <p class="sub">키우기 시리즈 · <a class="home" href="../">🎮 게임으로</a> · <button class="refresh" id="refresh">↻ 새로고침</button> · <button class="refresh" id="lockout">🔒 잠그기</button></p>

    <div id="content"><p class="empty">불러오는 중…</p></div>
  </div>
```

아래로 교체한다.

```html
  <div class="wrap" id="wrap" hidden>
    <h1>📊 통계 대시보드</h1>
    <p class="sub">키우기 시리즈 · <a class="home" href="../">🎮 게임으로</a> · <button class="refresh" id="refresh">↻ 새로고침</button> · <button class="refresh" id="lockout">🔒 잠그기</button></p>

    <div id="overview"><p class="empty">불러오는 중…</p></div>
    <nav class="tabs" id="tabs" hidden></nav>
    <div id="panel"></div>
  </div>
```

`#tabs`에 `hidden`을 붙여 시작한다. Task 2에서 렌더에 성공했을 때만 벗긴다.

- [ ] **Step 4: `load()`가 `#overview`를 쓰도록 바꾼다**

`load()` 안의 `$("content")` 참조 3곳을 `$("overview")`로 바꾼다. 274줄, 288줄, 319줄이다.

```js
    async function load() {
      $("overview").innerHTML = `<p class="empty">불러오는 중…</p>`;
```

```js
      if (failed || !summary) {
        $("overview").innerHTML = setupCard("아직 집계 뷰가 없거나 접근할 수 없어요.");
        wireCopy();
        return;
      }
```

```js
      if (!summary.length) html = setupCard("뷰는 있는데 아직 수집된 데이터가 없어요.") + html;
      $("overview").innerHTML = html;
      wireCopy();
```

`load()`의 다른 부분은 이 Task에서 건드리지 않는다.

- [ ] **Step 5: 화면이 작업 전과 동일한지 확인한다**

브라우저를 새로고침한다 (`Cmd/Ctrl+Shift+R`로 캐시 무시 — `sw.js`가 네트워크 우선이라 보통 문제없지만 확실히).

기대 결과:
- KPI 7개 숫자가 **Step 1에 기록한 값과 정확히 일치**
- 모든 게임의 선택 분포 · 포지션 분포 · 이벤트 퍼널 · 유니콘 섹션이 이전과 같은 순서로 표시
- 탭 바는 **보이지 않음** (아직 `hidden`)
- DevTools Console에 에러 없음

한 곳이라도 다르면 진행하지 말고 원인을 찾는다. 이 Task는 화면 변화가 없어야 정상이다.

- [ ] **Step 6: 커밋**

```bash
cd /workspace/grow-games
git add beta/stats/index.html
git commit -m "$(cat <<'EOF'
refactor(통계): 대시보드 DOM을 overview/tabs/panel 세 영역으로 분리

화면 결과는 변화 없음. 탭 도입을 위한 구조 준비.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 2: 상태 · 해시 라우팅 · 탭 바

탭 8개가 뜨고 전환이 동작한다. 패널 내용은 아직 빈 상태 카드뿐이다
(섹션 빌더는 Task 3~6에서 하나씩 연결한다).

**Files:**
- Modify: `beta/stats/index.html` — `GAMES` 상수 바로 아래(89줄 다음)에 상태 블록 추가
- Modify: `beta/stats/index.html` — `load()`를 `STATE` 저장 + 렌더 3종 호출 구조로

**Interfaces:**
- Consumes: Task 1의 `#overview` / `#tabs` / `#panel`
- Produces:
  - `STATE` — `{ summary: Array, choices: Array, daily: Array, hofRows: Array|null, hofByGame: Object|null, hofTotal: number|null }` 또는 `null`
  - `activeGame` — `GAMES`의 키 문자열
  - `gameFromHash(): string`
  - `renderOverview(): void` — `#overview`에 KPI + 합산 방문 추이
  - `renderTabs(): void` — `#tabs`에 칩 8개
  - `renderPanel(): void` — `#panel`에 `activeGame` 섹션들
  - `emptyCard(game: string): string`

  Task 3~6은 `renderPanel()`의 `parts` 배열에 항목을 하나씩 추가한다.

- [ ] **Step 1: 상태 블록을 추가한다**

`GAMES` 상수(89줄) 바로 아래, `POS` 상수 앞에 넣는다.

```js
    // ---------- 탭 상태 ----------
    // URL 해시가 단일 진실 원천이에요. 클릭·뒤로가기·링크 진입이 모두 hashchange 한 곳을 타요.
    const GAME_KEYS = Object.keys(GAMES);
    let STATE = null;        // load()가 채우는 fetch 결과 캐시
    let activeGame = null;   // 현재 탭 (GAMES의 키)

    const gameFromHash = () => {
      const h = decodeURIComponent(location.hash.replace(/^#/, ""));
      return GAMES[h] ? h : GAME_KEYS[0];
    };
```

- [ ] **Step 2: 렌더 함수 3종을 추가한다**

`load()` 함수 **바로 앞**에 넣는다 (273줄 근처, `getHof()` 다음).

```js
    function emptyCard(game) {
      return `<section><h2>${GAMES[game]}</h2><p class="empty">아직 수집된 데이터가 없어요.<br>플레이어가 새 캐릭터를 만들면 여기에 분포와 퍼널이 뜨기 시작해요.</p></section>`;
    }

    // 전역 KPI + 합산 방문 추이 — 탭과 무관하게 항상 보여요.
    function renderOverview() {
      const summary = STATE.summary;
      const totalVisits = summary.filter((r) => r.event === "visit").reduce((a, r) => a + r.players, 0);
      const totalNew = summary.filter((r) => r.event === "new_player").reduce((a, r) => a + r.total, 0);
      const totalBattle = summary.filter((r) => r.event === "battle").reduce((a, r) => a + r.total, 0);
      const totalRetire = summary.filter((r) => r.event === "retire").reduce((a, r) => a + r.total, 0);
      const totalInstall = summary.filter((r) => r.event === "pwa_install").reduce((a, r) => a + r.total, 0);
      const totalPwaUsers = summary.filter((r) => r.event === "pwa_launch").reduce((a, r) => a + r.players, 0);
      const hofTotal = STATE.hofTotal;

      let html = `<div class="kpis">
        <div class="kpi"><div class="n">${totalVisits.toLocaleString()}</div><div class="l">순 방문자</div></div>
        <div class="kpi"><div class="n">${totalNew.toLocaleString()}</div><div class="l">새 캐릭터</div></div>
        <div class="kpi"><div class="n">${totalInstall.toLocaleString()}</div><div class="l">📲 앱 설치 수</div></div>
        <div class="kpi"><div class="n">${totalPwaUsers.toLocaleString()}</div><div class="l">📲 앱 사용 기기</div></div>
        <div class="kpi"><div class="n">${totalBattle.toLocaleString()}</div><div class="l">배틀 횟수</div></div>
        <div class="kpi"><div class="n">${totalRetire.toLocaleString()}</div><div class="l">은퇴 이벤트</div></div>
        ${hofTotal != null ? `<div class="kpi"><div class="n">${hofTotal.toLocaleString()}</div><div class="l">🏛️ 명예의 전당</div></div>` : ""}
      </div>
      ${hofTotal != null && hofTotal !== totalRetire
        ? `<p class="empty" style="margin:-12px 0 20px">ℹ️ 은퇴 이벤트(${totalRetire})는 통계 도입 이후 집계, 명예의 전당(${hofTotal})은 전체 은퇴자 명단이라 숫자가 달라요.</p>`
        : ""}`;

      html += dailySection(STATE.daily, null);

      if (!summary.length) html = setupCard("뷰는 있는데 아직 수집된 데이터가 없어요.") + html;
      $("overview").innerHTML = html;
      wireCopy();
    }

    function renderTabs() {
      $("tabs").innerHTML = GAME_KEYS.map((g) =>
        `<button type="button" class="tab${g === activeGame ? " on" : ""}" data-game="${g}">${GAMES[g]}</button>`
      ).join("");
      // 해시로 오른쪽 끝 탭에 바로 들어오면 칩이 스크롤 밖에 있어요.
      const on = $("tabs").querySelector(".tab.on");
      if (on) on.scrollIntoView({ inline: "center", block: "nearest" });
    }

    function renderPanel() {
      if (!STATE) return;
      const game = activeGame;
      const parts = [];   // Task 3~6에서 섹션이 하나씩 채워져요
      $("panel").innerHTML = parts.join("").trim() || emptyCard(game);
    }
```

`renderOverview()`가 `dailySection(STATE.daily, null)`을 부르는데, `dailySection`은 Task 3에서야
두 번째 인자를 받는다. 지금은 **여분의 인자가 무시되어** 기존 동작(전 게임 합산) 그대로다.
Task 3에서 `null` 분기가 실제 의미를 갖게 된다.

- [ ] **Step 3: 이벤트 리스너를 연결한다**

`$("refresh").onclick = load;` (333줄) 바로 아래에 넣는다.

```js
    // 탭 클릭은 해시만 바꿔요. 렌더는 hashchange 한 곳이 전담해서 경로가 하나로 모여요.
    $("tabs").addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (btn) location.hash = btn.dataset.game;
    });
    window.addEventListener("hashchange", () => {
      activeGame = gameFromHash();
      renderTabs();
      renderPanel();
    });
```

리스너는 `#tabs` 컨테이너에 붙는다. `renderTabs()`가 `innerHTML`로 자식을 갈아끼워도
컨테이너 자체는 그대로라 리스너가 유지된다.

- [ ] **Step 4: `load()`를 새 구조로 바꾼다**

273~321줄의 `load()` 전체를 아래로 교체한다.

```js
    async function load() {
      $("overview").innerHTML = `<p class="empty">불러오는 중…</p>`;
      $("tabs").hidden = true;
      $("panel").innerHTML = "";

      let summary, choices, daily, failed = false;
      try { summary = await getView("stats_summary"); } catch { failed = true; }
      try { choices = await getView("stats_choices"); } catch { failed = true; }
      try { daily = await getView("stats_daily"); } catch { failed = true; }
      const hofRows = await getHof();
      let hofTotal = null, hofByGame = null;
      if (hofRows) {
        hofByGame = {};
        for (const r of hofRows) hofByGame[r.game] = (hofByGame[r.game] || 0) + 1;
        hofTotal = hofRows.length;
      }

      if (failed || !summary) {
        // 집계 뷰가 없으면 탭이 의미 없어요 — 안내 카드만 남겨요.
        $("overview").innerHTML = setupCard("아직 집계 뷰가 없거나 접근할 수 없어요.");
        wireCopy();
        return;
      }

      STATE = { summary, choices: choices || [], daily: daily || [], hofRows, hofByGame, hofTotal };
      // 새로고침일 땐 보던 탭을 유지하고, 첫 진입이면 해시에서 읽어요.
      activeGame = activeGame || gameFromHash();

      renderOverview();
      $("tabs").hidden = false;
      renderTabs();
      renderPanel();
    }
```

- [ ] **Step 5: 탭 동작을 확인한다**

브라우저를 새로고침한다.

| 확인 | 기대 결과 |
|---|---|
| 상단 KPI | Task 1 Step 1에 기록한 값과 동일 |
| 합산 방문 추이 | 이전과 동일하게 `#overview`에 표시 |
| 탭 바 | 칩 8개 (`⚾ 더 루키` … `🦄 더 유니콘`), 첫 탭에 `on` 강조 |
| 탭 아래 | 빈 상태 카드 (`⚾ 더 루키` / "아직 수집된 데이터가 없어요…") — 섹션 미연결이라 정상 |
| 탭 클릭 | URL이 `.../#idol` 등으로 바뀌고 강조가 이동, 카드 제목이 해당 게임으로 |
| DevTools Network | 탭 클릭 시 **새 요청 0건** |
| 브라우저 폭 375px | 탭이 가로 스크롤됨, 세로로 뭉개지지 않음 |
| 페이지 스크롤 | 탭 바가 상단에 고정되고 뒤 내용이 비쳐 보이지 않음 |
| `#unicorn` 직접 입력 후 새로고침 | 유니콘 탭 활성 + 해당 칩이 화면 안으로 스크롤됨 |
| `#nonexistent` 입력 후 새로고침 | ⚾ 더 루키로 폴백 |
| 뒤로가기 | 직전 탭으로 복귀 |
| ↻ 새로고침 버튼 | 보던 탭 유지 |
| Console | 에러 없음 |

- [ ] **Step 6: 커밋**

```bash
cd /workspace/grow-games
git add beta/stats/index.html
git commit -m "$(cat <<'EOF'
feat(통계): 게임별 탭 바와 해시 라우팅 추가

fetch 결과를 STATE에 캐시하고 탭 전환은 재렌더만 해요 (네트워크 0회).
패널 섹션 연결은 후속 커밋에서.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 3: `dailySection`에 게임 인자 추가

`#overview`는 전 게임 합산, 각 탭은 그 게임만의 방문 추이를 보여준다.
`stats_daily` 뷰의 `game` 컬럼이 지금까지 쓰이지 않고 있었다.

**Files:**
- Modify: `beta/stats/index.html:214-235` (`dailySection`)
- Modify: `beta/stats/index.html` — `renderPanel()`의 `parts` 배열

**Interfaces:**
- Consumes: Task 2의 `STATE.daily`, `renderPanel()`, `activeGame`
- Produces: `dailySection(rows: Array, game: string|null): string`
  — `game`이 `null`이면 전 게임 합산, 문자열이면 해당 게임만. 데이터가 없으면 `""`

- [ ] **Step 1: `dailySection`을 교체한다**

214~235줄 전체를 아래로 바꾼다.

```js
    // game이 null이면 전 게임 합산(#overview), 게임 키면 그 게임만(#panel)이에요.
    function dailySection(rows, game) {
      const src = game ? rows.filter((r) => r.game === game) : rows;
      const byDay = {};
      for (const r of src) {
        byDay[r.day] = byDay[r.day] || { visits: 0, np: 0 };
        byDay[r.day].visits += r.visits || 0;
        byDay[r.day].np += r.new_players || 0;
      }
      const days = Object.keys(byDay).sort().slice(-14);
      if (!days.length) return "";
      const max = Math.max(...days.map((d) => byDay[d].visits), 1);
      const title = game
        ? "📅 방문 추이 (일별 순 방문 기기)"
        : "📅 최근 방문 추이 (전 게임 합산 · 일별 순 방문 기기)";
      return `<section><h2>${title}</h2>
        <p class="empty" style="margin:-6px 0 10px">막대를 누르거나 마우스를 올리면 상세 숫자를 볼 수 있어요</p>
        <div class="spark">${days.map((d) => {
          const v = byDay[d].visits;
          const np = byDay[d].np;
          const md = d.slice(5);
          const [, mo, da] = d.split("-");
          const h = Math.max(3, Math.round((v / max) * 90));
          const info = `${+mo}월 ${+da}일 · 방문 ${v}명 · 새 캐릭터 ${np}명`;
          return `<div class="col" tabindex="0" data-info="${info}"><div class="v">${v}</div><div class="b" style="height:${h}px"></div><div class="d">${md}</div></div>`;
        }).join("")}</div></section>`;
    }
```

바뀐 것은 세 줄뿐이다: `src` 필터 추가, `for (const r of rows)` → `for (const r of src)`,
제목의 `title` 분기. 막대 생성부는 그대로다.

- [ ] **Step 2: 패널에 연결한다**

`renderPanel()`의 `parts` 배열을 채운다.

```js
    function renderPanel() {
      if (!STATE) return;
      const game = activeGame;
      const parts = [
        dailySection(STATE.daily, game),
      ];
      $("panel").innerHTML = parts.join("").trim() || emptyCard(game);
    }
```

- [ ] **Step 3: 확인한다**

브라우저를 새로고침한다.

| 확인 | 기대 결과 |
|---|---|
| `#overview` 방문 추이 | 제목이 `📅 최근 방문 추이 (전 게임 합산 · 일별 순 방문 기기)`, **막대 값은 이전과 동일** |
| 탭 안 방문 추이 | 제목이 `📅 방문 추이 (일별 순 방문 기기)`, 값이 합산보다 작음 |
| 게임별 값 검산 | 같은 날짜에 대해 게임 8개 값의 합이 합산 그래프 값과 일치 (몇 개 날짜만 표본으로) |
| 툴팁 | 합산·게임별 양쪽에서 hover / 클릭 / Tab 키 포커스 모두 동작 |
| 탭 전환 후 툴팁 | 다른 탭으로 옮긴 뒤에도 툴팁이 정상 동작 (`sparkTooltip`이 `document` 위임이라 유지돼야 정상) |
| 데이터 없는 게임 탭 | 방문 추이가 없으면 빈 상태 카드 |

> 참고: 게임별 그래프는 그 게임에 **데이터가 있는 마지막 14일**을 보여준다. 게임마다 활동 일자가
> 달라서 합산 그래프와 X축 범위가 다를 수 있다. 기존 `slice(-14)` 동작을 그대로 따른 것이라 정상이다.

- [ ] **Step 4: 커밋**

```bash
cd /workspace/grow-games
git add beta/stats/index.html
git commit -m "$(cat <<'EOF'
feat(통계): 게임별 방문 추이 표시

stats_daily 뷰의 game 컬럼이 지금까지 쓰이지 않고 합산만 하고 있었어요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 4: `choiceSection`을 게임별로 좁히고 라벨 통일

**Files:**
- Modify: `beta/stats/index.html:125-147` (`choiceSection`)
- Modify: `beta/stats/index.html` — `renderPanel()`의 `parts` 배열

**Interfaces:**
- Consumes: Task 2의 `STATE.choices`, `renderPanel()`
- Produces: `choiceSection(rows: Array, game: string): string`
  — 배경 분포와 포지션 분포 **두 섹션을 한 문자열로** 반환한다. 데이터가 없으면 `""`
  (기존 fallback 카드를 반환하지 않는다 — Task 2의 `emptyCard`가 그 역할을 맡는다)

- [ ] **Step 1: `choiceSection`을 교체한다**

125~147줄 전체를 아래로 바꾼다.

```js
    // 배경 분포 + 포지션 분포를 한 문자열로 돌려줘요. 데이터가 없으면 빈 문자열이에요.
    function choiceSection(rows, game) {
      const g = rows.filter((r) => r.game === game && r.choice);
      if (!g.length) return "";

      const agg = {};
      for (const r of g) { const c = normChoice(r.choice); agg[c] = (agg[c] || 0) + r.n; }
      const items = Object.entries(agg).sort((a, b) => b[1] - a[1]);
      const max = items[0][1];
      let html = `<section><h2>🗺️ 배경 선택 분포</h2>${items.map(([k, v]) => bar(k, v, max)).join("")}</section>`;

      const pos = {};
      for (const r of g) if (r.pos) pos[r.pos] = (pos[r.pos] || 0) + r.n;
      const pi = Object.entries(pos).sort((a, b) => b[1] - a[1]);
      if (pi.length) {
        const pmax = pi[0][1];
        html += `<section><h2>🧢 포지션 분포</h2>${pi.map(([k, v]) => bar(POS[k] || k, v, pmax)).join("")}</section>`;
      }
      return html;
    }
```

세 가지가 바뀌었다.
1. `for (const game of Object.keys(GAMES))` 루프 제거 — 인자로 받은 게임 하나만 처리
2. 제목에서 게임 이름 접두사 제거. `game === "rookie" ? "지역 선택 분포" : "소속사 선택 분포"` 분기를
   없애고 **`🗺️ 배경 선택 분포`로 통일**. 📈 더 인베스터는 실제로 국장/미장/일본장(시장)이고
   ⚽ 더 윙어는 유스팀인데 둘 다 "소속사"로 잘못 표시되고 있었다. README도 이를 통칭 "배경"이라 부른다
3. 146줄의 fallback 카드(`html || "<section>…아직 새 캐릭터 데이터가 없어요</section>"`) 제거 →
   `""` 반환. 이게 남아 있으면 데이터 없는 탭에 "선택 분포 없음" 카드만 뜨고 진짜 빈 상태 안내가 나오지 않는다

- [ ] **Step 2: 패널에 연결한다**

```js
      const parts = [
        dailySection(STATE.daily, game),
        choiceSection(STATE.choices, game),
      ];
```

- [ ] **Step 3: 확인한다**

| 확인 | 기대 결과 |
|---|---|
| ⚾ 더 루키 탭 | `🗺️ 배경 선택 분포`에 서울 / 인천·경기 / 대전·충청 / 광주·전라 / 대구·경북 / 부산·경남, **막대 값이 작업 전 스크린샷과 동일** |
| 📈 더 인베스터 탭 | `🗺️ 배경 선택 분포`에 국장 / 미장 / 일본장. 이전엔 "소속사 선택 분포"였던 곳 |
| 🎤 더 트레이니 탭 | 소속사 5종(SW엔터 / 온리원컴퍼니 / 루나엔터 / 별빛엔터 / 개러지뮤직) |
| 포지션 분포 | 제목이 `🧢 포지션 분포`, 값이 이전과 동일. 게임에 맞는 라벨 (루키=타자/투수, 커밋=프론트엔드/백엔드/AI·데이터/데브옵스) |
| 🦄 더 유니콘 탭 | 배경·포지션 분포가 **없음** (창업 게임이라 `choice`가 비어 있음). 방문 추이만 표시 |
| 데이터 없는 게임 탭 | 빈 상태 카드 |
| 제목 | 어느 탭에서도 `⚾ 더 루키 · …` 같은 게임 이름 접두사가 없음 |

- [ ] **Step 4: 커밋**

```bash
cd /workspace/grow-games
git add beta/stats/index.html
git commit -m "$(cat <<'EOF'
feat(통계): 선택 분포를 탭별로 표시하고 라벨을 '배경'으로 통일

인베스터(시장)·윙어(유스팀)가 '소속사 선택 분포'로 잘못 표시되던 것도 함께 정리했어요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 5: `funnelSection`을 게임별로 좁히기

**Files:**
- Modify: `beta/stats/index.html:149-163` (`funnelSection`)
- Modify: `beta/stats/index.html` — `renderPanel()`의 `parts` 배열

**Interfaces:**
- Consumes: Task 2의 `STATE.summary`, `STATE.hofByGame`, `renderPanel()`
- Produces:
  - `FUNNEL_ORDER: string[]` — 이벤트 표시 순서 상수 (함수 밖으로 끌어올림)
  - `funnelSection(rows: Array, hofByGame: Object|null, game: string): string` — 데이터가 없으면 `""`

- [ ] **Step 1: `funnelSection`을 교체한다**

149~163줄 전체를 아래로 바꾼다.

```js
    // 퍼널 막대의 표시 순서예요. 예전엔 함수 안에서 매번 만들었어요.
    const FUNNEL_ORDER = ["visit", "pwa_install", "pwa_launch", "new_player", "draft", "debut", "ending", "pro_enter", "season_end", "year_end", "exit", "decacorn", "retire", "battle", "bonus"];

    function funnelSection(rows, hofByGame, game) {
      const g = rows.filter((r) => r.game === game);
      if (!g.length) return "";
      g.sort((a, b) => FUNNEL_ORDER.indexOf(a.event) - FUNNEL_ORDER.indexOf(b.event));
      const max = Math.max(...g.map((r) => r.total));
      const hofN = hofByGame ? (hofByGame[game] || 0) : null;
      return `<section class="funnel"><h2>📈 이벤트별 발생${hofN != null ? ` · 🏛️명전 ${hofN}명` : ""}</h2>${
        g.map((r) => bar(EVENT_LABEL[r.event] || r.event, r.total, max)).join("")
      }</section>`;
    }
```

바뀐 것: 게임 루프 제거, `order` 지역 변수를 `FUNNEL_ORDER` 상수로 끌어올림, 제목에서
게임 이름 접두사 제거 (`🏛️명전 N명` 부분은 유지).

`rows.filter(...)`가 새 배열을 반환하므로 `g.sort()`가 `STATE.summary`의 순서를 건드리지 않는다.

- [ ] **Step 2: 패널에 연결한다**

```js
      const parts = [
        dailySection(STATE.daily, game),
        choiceSection(STATE.choices, game),
        funnelSection(STATE.summary, STATE.hofByGame, game),
      ];
```

- [ ] **Step 3: 확인한다**

| 확인 | 기대 결과 |
|---|---|
| 각 게임 탭 맨 아래 | `📈 이벤트별 발생 · 🏛️명전 N명` 섹션 |
| 막대 값 | 작업 전 스크린샷의 해당 게임 퍼널과 **완전히 동일** |
| 막대 순서 | 방문 → 📲앱 설치 → 📲앱 실행 → 새 캐릭터 → … → 배틀 → 보너스 |
| 명전 인원 | 상단 KPI의 🏛️ 명예의 전당 합계가 게임 8개의 `🏛️명전 N명` 합과 일치 |
| 제목 | 게임 이름 접두사 없음 |

- [ ] **Step 4: 커밋**

```bash
cd /workspace/grow-games
git add beta/stats/index.html
git commit -m "$(cat <<'EOF'
feat(통계): 이벤트 퍼널을 탭별로 표시

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 6: `unicornSection`을 유니콘 탭으로

**Files:**
- Modify: `beta/stats/index.html:165-212` (`unicornSection`)
- Modify: `beta/stats/index.html` — `renderPanel()`의 `parts` 배열

**Interfaces:**
- Consumes: Task 2의 `STATE.hofRows`, `renderPanel()`
- Produces: `unicornSection(hofRows: Array|null): string` — 시그니처 유지.
  은퇴한 창업가가 없으면 안내 카드 대신 `""`를 반환하도록 바뀐다

- [ ] **Step 1: 빈 데이터 반환값을 바꾼다**

170줄을 찾는다.

```js
      if (!es.length) return `<section><h2>🦄 더 유니콘 · 창업가 기록</h2><p class="empty">아직 은퇴한 창업가가 없어요.</p></section>`;
```

아래로 바꾼다.

```js
      if (!es.length) return "";   // 빈 상태 안내는 renderPanel의 emptyCard가 맡아요
```

- [ ] **Step 2: 섹션 제목 4개에서 게임 이름 접두사를 뗀다**

| 줄 | 현재 | 변경 |
|---|---|---|
| 178 | `<h2>🦄 더 유니콘 · 창업가 기록</h2>` | `<h2>🏢 창업가 기록</h2>` |
| 192 | `<h2>🦄 더 유니콘 · 최고 단계 분포</h2>` | `<h2>📊 최고 단계 분포</h2>` |
| 202 | `<h2>🦄 더 유니콘 · Exit 횟수 분포</h2>` | `<h2>🚀 Exit 횟수 분포</h2>` |
| 208 | `<h2>🦄 더 유니콘 · 최고 기록 TOP ${top.length}</h2>` | `<h2>🏆 최고 기록 TOP ${top.length}</h2>` |

함수의 나머지(집계식, `UNI_STAGES` 순서, Exit 구간 나누기, TOP 5 정렬)는 건드리지 않는다.

- [ ] **Step 3: 패널에 연결한다**

`parts` 배열을 완성한다. 유니콘 섹션은 퍼널 **앞**에 온다.

```js
      const parts = [
        dailySection(STATE.daily, game),
        choiceSection(STATE.choices, game),
        game === "unicorn" ? unicornSection(STATE.hofRows) : "",
        funnelSection(STATE.summary, STATE.hofByGame, game),
      ];
```

- [ ] **Step 4: 확인한다**

| 확인 | 기대 결과 |
|---|---|
| 🦄 더 유니콘 탭 순서 | 📅 방문 추이 → 🏢 창업가 기록(KPI 4칸) → 📊 최고 단계 분포 → 🚀 Exit 횟수 분포 → 🏆 최고 기록 TOP 5 → 📈 이벤트별 발생 |
| 유니콘 KPI 4칸 | 🏛️ 은퇴 창업가 / 👑 데카콘 달성 / 🚀 평균 Exit / 🧾 최고 스톡옵션 — 값이 작업 전과 동일 |
| 최고 기록 문구 | 섹션 하단의 `최고 기록: 이름 · 등급` 유지 |
| **다른 게임 탭 7개** | 유니콘 섹션이 **어디에도 나타나지 않음** |
| 제목 | `🦄 더 유니콘 ·` 접두사 없음 |

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/stats/index.html
git commit -m "$(cat <<'EOF'
feat(통계): 유니콘 전용 지표를 유니콘 탭 안으로

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 7: 에러 경로 확인과 전체 회귀 검증

코드 변경이 없을 수도 있는 검증 전용 Task다. 상용에 올리기 전 마지막 관문이다.

**Files:**
- Modify: `beta/stats/index.html` (검증 중 문제가 발견된 경우에만)

**Interfaces:**
- Consumes: Task 1~6의 전체 결과
- Produces: 없음 (검증만)

- [ ] **Step 1: 집계 뷰 접근 실패 경로를 확인한다**

DevTools → Network → 우클릭 → **Block request URL**로 `*/rest/v1/stats_summary*`를 차단하고 새로고침한다.

| 확인 | 기대 결과 |
|---|---|
| 화면 | `⚙️ 통계 뷰 설정이 필요해요` 안내 카드 + SQL 블록 |
| **탭 바** | **보이지 않음** (`#tabs`가 `hidden`) |
| 패널 | 비어 있음 |
| 📋 SQL 복사 버튼 | 클릭하면 `✅ 복사됨!`으로 바뀜 |

확인 후 차단을 해제하고 새로고침해 정상 복구되는지 본다.

- [ ] **Step 2: 데이터 없는 게임 탭을 확인한다**

데이터가 아직 없는 게임 탭(있다면)을 눌러 빈 상태 카드가 뜨는지 본다.

없다면 임시로 만들어 확인한다. Console에서:

```js
STATE.choices = []; STATE.daily = []; STATE.summary = []; renderPanel();
```

기대 결과: `⚾ 더 루키` 제목 + "아직 수집된 데이터가 없어요. 플레이어가 새 캐릭터를 만들면
여기에 분포와 퍼널이 뜨기 시작해요." 확인 후 페이지를 새로고침해 원상복구한다.

- [ ] **Step 3: 스펙 8절 체크리스트 10항목을 전부 통과시킨다**

| # | 확인 | 통과 |
|---|---|---|
| 1 | 상단 KPI 7개가 **Task 1 Step 1 기록값과 완전히 동일** | ☐ |
| 2 | 탭 8개 존재, 375px 폭에서 가로 스크롤 | ☐ |
| 3 | 탭 클릭 시 해시 변경 + 패널 교체, **네트워크 요청 0회** | ☐ |
| 4 | `#unicorn` 직접 진입 → 유니콘 탭 활성 + 칩이 화면 안으로 스크롤 | ☐ |
| 5 | `#없는게임` → ⚾ 첫 탭 폴백 | ☐ |
| 6 | 뒤로가기 → 직전 탭 | ☐ |
| 7 | ↻ 새로고침 → 보던 탭 유지 | ☐ |
| 8 | 방문 추이 툴팁이 탭 전환 후에도 동작 (hover · 클릭 · Tab 포커스) | ☐ |
| 9 | 데이터 없는 게임 탭 → 빈 상태 카드 | ☐ |
| 10 | 스크롤 시 탭 바 상단 고정, 뒤 내용이 비쳐 보이지 않음 | ☐ |

추가로 게임 8개 탭을 하나씩 열어 각 막대 값을 Task 1의 작업 전 스크린샷과 대조한다.
**숫자가 하나라도 달라지면 안 된다.** 표시 구조만 바꾼 작업이다.

- [ ] **Step 4: 🔒 잠그기와 게이트를 확인한다**

`🔒 잠그기`를 눌러 게이트로 돌아가고, 비밀번호를 다시 입력해 정상 진입되는지 본다.
게이트 코드는 건드리지 않았지만 DOM을 바꿨으므로 확인한다.

- [ ] **Step 5: 문제가 있었다면 고치고 커밋**

10항목을 모두 통과했고 고칠 것이 없으면 이 Step은 건너뛴다.

```bash
cd /workspace/grow-games
git add beta/stats/index.html
git commit -m "$(cat <<'EOF'
fix(통계): 탭 분리 검증에서 발견된 문제 수정

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

---

### Task 8: 상용 반영과 릴리스

> ⚠️ **이 Task는 실제 서비스에 배포한다. 시작 전 사용자 확인을 받는다.**
> Task 7의 10항목이 전부 통과하지 않았으면 진행하지 않는다.

**Files:**
- Modify: `stats/index.html` (`promote.sh`가 `beta/`에서 복사)
- Modify: `VERSION` (`release.sh`가 `1.9.0` → `1.10.0`)
- Modify: `CHANGELOG.md` (`release.sh`가 갱신)

**Interfaces:**
- Consumes: Task 7을 통과한 `beta/stats/index.html`
- Produces: 상용 배포

- [ ] **Step 1: 상용에 반영한다**

```bash
cd /workspace/grow-games
bash scripts/promote.sh
git status --short
```

기대 결과: `M stats/index.html`. 다른 파일이 바뀌었다면 멈추고 원인을 확인한다
(`promote.sh`는 `beta/` 전체를 루트로 복사하므로, 베타에 다른 작업이 섞여 있었다면 함께 나간다).

- [ ] **Step 2: 루트와 베타가 같은지 확인한다**

```bash
diff stats/index.html beta/stats/index.html && echo "동일"
```

기대 결과: `동일`

- [ ] **Step 3: 커밋**

```bash
cd /workspace/grow-games
git add -A
git commit -m "$(cat <<'EOF'
release: promote beta → prod (통계 대시보드 게임별 탭)

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

- [ ] **Step 4: 릴리스**

기능 추가이므로 `1.9.0` → `1.10.0`이다.

```bash
cd /workspace/grow-games
bash scripts/release.sh 1.10.0 "통계 대시보드 게임별 탭 분리"
```

> ℹ️ README 104~106줄대로, 자동화 환경의 git 프록시는 태그 push를 403으로 거부한다.
> 태그가 실패해도 `VERSION`과 `CHANGELOG.md`는 정상 기록되므로 롤백에 지장이 없다.
> 태그가 필요하면 개인 PC에서 CHANGELOG의 해시로 나중에 만들면 된다.

- [ ] **Step 5: 상용을 확인한다**

`https://parkbeommin.github.io/grow-games/stats/` 를 열어 (GitHub Pages 배포에 1~2분 걸린다)
탭 8개가 뜨고 KPI 숫자가 베타와 같은지 본다.

문제가 있으면 README 108~114줄의 롤백 절차를 쓴다.

```bash
bash scripts/rollback.sh                     # 릴리스 목록
bash scripts/rollback.sh <해시> --dry-run    # 미리보기
bash scripts/rollback.sh <해시>              # 복원 (루트만, beta/는 안전)
```

- [ ] **Step 6: README를 갱신한다**

README 38~57줄의 "🗒️ 업데이트 / 개선 기록 → 신작 · 기능" 목록 맨 위에 한 줄 추가한다.

```markdown
- 📊 **통계 대시보드 게임별 탭** — 8개 게임 지표가 한 페이지에 28섹션까지 쌓이던 걸 게임별 탭으로 나눴어요. 전역 KPI와 전 게임 합산 방문 추이는 위에 고정되고, 탭을 누르면 그 게임의 방문 추이·배경/포지션 분포·이벤트 퍼널만 보여요. 탭은 URL에 남아서(`/stats/#rookie`) 새로고침해도 유지되고 링크로 바로 열 수 있어요
```

```bash
cd /workspace/grow-games
git add README.md
git commit -m "$(cat <<'EOF'
docs: README에 통계 대시보드 탭 분리 기록

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rbt44jF9sY5HVU25zvuoqq
EOF
)"
```

- [ ] **Step 7: 푸시**

```bash
cd /workspace/grow-games
git push origin main
```

---

## 스펙 대비 커버리지

| 스펙 절 | 담당 Task |
|---|---|
| 3. 화면 구조 (DOM 3분할, KPI 비sticky, scrollIntoView) | Task 1 Step 3, Task 2 Step 2 |
| 4. 데이터 흐름과 상태 (STATE, activeGame, 해시 단일 경로, 새로고침) | Task 2 Step 1·3·4 |
| 5. 렌더 함수 재구성 (4개 시그니처, 조립 순서, 제목·라벨) | Task 3~6 |
| 6. 빈 상태·에러 처리 (3층위, 하위 섹션 `""` 반환) | Task 2 Step 2(emptyCard) · Task 4 Step 1 · Task 6 Step 1 · Task 7 Step 1~2 |
| 7. CSS 변경 (칩화, sticky, z-index 20) | Task 1 Step 2 |
| 8. 검증 10항목 | Task 7 Step 3 |
| 9. 배포 (promote → release 1.10.0) | Task 8 |
| 10. 범위 밖 | 해당 작업 없음 (의도된 것) |
