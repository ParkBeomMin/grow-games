# 통계 대시보드 — 게임별 탭 분리

작성일: 2026-07-26
대상 파일: `stats/index.html` (단일 파일, HTML+CSS+JS 인라인)

## 1. 배경과 목표

`/stats/` 대시보드가 8개 게임의 모든 지표를 한 페이지에 세로로 쌓아 보여준다.
현재 렌더되는 섹션 수는 최대 28개다.

| 블록 | 렌더 함수 | 섹션 수 |
|---|---|---|
| 전역 KPI 7개 | `load()` 인라인 | 1 |
| 최근 방문 추이 (전 게임 합산) | `dailySection` | 1 |
| 게임별 선택 분포 + 포지션 분포 | `choiceSection` | 최대 14 |
| 유니콘 전용 (창업가 KPI·단계·Exit·TOP5) | `unicornSection` | 최대 4 |
| 게임별 이벤트 퍼널 | `funnelSection` | 최대 8 |

목표는 **게임별 탭을 도입해 한 번에 보이는 섹션을 3~6개로 줄이는 것**이다.
지표 계산 로직과 숫자는 바뀌지 않는다. 보여주는 방식만 바꾼다.

### 이 작업이 가능한 이유

- `stats_summary` · `stats_choices` · `stats_daily` 세 뷰 모두 `game` 컬럼을 갖고 있고,
  `hof` 테이블도 `game`을 가져온다. **Supabase SQL 변경 없이 클라이언트 필터링만으로 충분하다.**
- 특히 `stats_daily`는 게임별 방문 데이터를 갖고 있는데 현재 `dailySection`이 이를 무시하고
  전부 합산한다. 이번에 게임별 방문 추이를 새로 살린다.
- `.tabs` / `.tab` CSS가 33~35줄에 이미 정의돼 있으나 어디서도 사용되지 않는다. 이를 재사용한다.

## 2. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| 탭 구성 | 게임 8개만. "전체" 탭 없음 |
| 전역 KPI | 탭 위에 항상 표시 (문서 흐름상 상단, sticky 아님) |
| 방문 추이 | 합산은 상단 고정 영역, 게임별은 각 탭 안. 둘 다 |
| 모바일 탭 배치 | 가로 스크롤 칩 (허브 `index.html:53` `.continue-row` 패턴) |
| 탭 바 고정 | 탭 바만 `position: sticky; top: 0` |
| 빈 데이터 게임 | 탭 8개는 항상 표시. 내용이 없으면 빈 상태 안내 카드 |
| 탭 상태 유지 | URL 해시 (`/stats/#rookie`) |
| 기본 탭 | `GAMES`의 첫 키 (`rookie`). 해시가 없거나 모르는 값이면 여기로 폴백 |
| 데이터 로딩 | 진입 시 1회 fetch 후 캐시. 탭 전환은 네트워크 요청 0회 |
| 파일 구조 | 단일 파일 유지 (441줄 → 약 500줄) |

## 3. 화면 구조

`#content` 하나였던 영역을 셋으로 나눈다.

```html
<div class="wrap" id="wrap" hidden>
  <h1>📊 통계 대시보드</h1>
  <p class="sub">… 🎮게임으로 · ↻새로고침 · 🔒잠그기</p>

  <div id="overview"></div>            <!-- 전역 KPI 7개 + 합산 방문 추이 -->
  <nav class="tabs" id="tabs"></nav>   <!-- 가로 스크롤 칩 8개 -->
  <div id="panel"></div>               <!-- 활성 게임 섹션들 -->
</div>
```

기존 `<div id="content">`는 제거한다.

### 왜 KPI는 sticky가 아닌가

KPI 7칸은 모바일에서 두 줄을 차지한다. 탭 바까지 합쳐 고정하면 화면 절반이 헤더가 된다.
KPI는 문서 흐름 그대로 두어 스크롤하면 올라가게 하고, **탭 바만 고정**한다.

### 활성 탭 스크롤

해시로 8번째 탭에 직접 진입하면 해당 칩이 가로 스크롤 밖에 있다.
렌더 후 활성 칩에 `scrollIntoView({ inline: "center", block: "nearest" })`를 호출한다.

## 4. 데이터 흐름과 상태

```
   load()  ← 진입 시 1회, ↻새로고침 버튼
     │
     ├─ fetch ×4 (stats_summary / stats_choices / stats_daily / hof)
     │
     ▼
   STATE = { summary, choices, daily, hofRows, hofByGame, hofTotal }
     │
     ├──▶ renderOverview()   → #overview   (전체 합산, 탭과 무관)
     ├──▶ renderTabs()       → #tabs       (8개 고정)
     └──▶ renderPanel()      → #panel      (activeGame 것만)

   탭 클릭 ─▶ location.hash = game
                    │
              hashchange ─▶ activeGame 갱신 ─▶ renderPanel()   (네트워크 0회)
```

모듈 스코프 상태는 둘뿐이다.

```js
let STATE = null;        // fetch 결과 캐시
let activeGame = null;   // 현재 탭 (GAMES의 키)
```

### 해시 처리

```js
const GAME_KEYS = Object.keys(GAMES);
const gameFromHash = () => {
  const h = decodeURIComponent(location.hash.replace(/^#/, ""));
  return GAMES[h] ? h : GAME_KEYS[0];
};
```

탭 클릭 핸들러는 **`location.hash`만 바꾸고 렌더하지 않는다.** 렌더는 `hashchange` 리스너가 전담한다.
클릭 · 뒤로가기 · 링크 진입 세 경로가 모두 같은 코드를 타므로 상태가 어긋날 여지가 없다.

이미 활성인 탭을 다시 클릭하면 해시가 변하지 않아 `hashchange`가 발생하지 않는다.
재렌더할 이유가 없으므로 의도된 동작이다.

### 새로고침

`$("refresh").onclick = load;`는 그대로 둔다. `load()`가 `activeGame`을 건드리지 않으므로
보던 탭이 유지된 채 데이터만 갱신된다.

## 5. 렌더 함수 재구성

기존 함수 4개에서 **내부의 게임 루프만 걷어내고 `game` 인자를 받게** 좁힌다.
막대 그리기(`bar`) · 집계 로직 · 정렬 순서 · 라벨 매핑(`POS`, `EVENT_LABEL`, `CHOICE_ALIAS`)은 건드리지 않는다.

| 함수 | 현재 | 변경 |
|---|---|---|
| `dailySection(rows)` | 전 게임 합산 | `dailySection(rows, game)` — `game`이 `null`이면 지금처럼 합산(→ `#overview`), 값이 있으면 `r.game === game`으로 필터(→ `#panel`) |
| `choiceSection(rows)` | 내부에서 `GAMES` 8개 루프 | `choiceSection(rows, game)` — 루프 삭제, 해당 게임만 |
| `funnelSection(rows, hofByGame)` | 내부에서 `GAMES` 8개 루프 | `funnelSection(rows, hofByGame, game)` — 루프 삭제 |
| `unicornSection(hofRows)` | 이미 유니콘 전용 | 시그니처 유지. `game === "unicorn"`일 때만 호출 |

### 패널 조립 순서

```
[일반 게임 7종]            [🦄 유니콘]
📅 방문 추이               📅 방문 추이
🗺️ 배경 선택 분포          🏢 창업가 기록 (KPI 4개)
🧢 포지션 분포             📊 최고 단계 분포
📈 이벤트별 발생           🚀 Exit 횟수 분포
                          🏆 최고 기록 TOP 5
                          📈 이벤트별 발생
```

### 섹션 제목에서 게임 이름 제거

현재 제목은 `⚾ 더 루키 · 지역 선택 분포` 형태다. 탭이 이미 게임을 나타내므로 중복이다.
게임 이름 접두사를 떼고 `🗺️ 배경 선택 분포`로 짧게 만든다.

### 배경 선택 분포 라벨 통일

`choiceSection` 134줄의 `game === "rookie" ? "지역 선택 분포" : "소속사 선택 분포"` 분기를 제거하고
**전 게임 `배경 선택 분포`로 통일**한다.

이유: 📈 더 인베스터의 실제 선택지는 국장/미장/일본장(시장)이고 ⚽ 더 윙어는 유스팀인데
둘 다 "소속사"로 표시되고 있다. README도 이를 통칭 "배경"이라 부른다.
어차피 제목 줄을 수정하므로 함께 정리한다.

### 이벤트 퍼널의 명전 인원 표시

`funnelSection`은 제목에 `· 🏛️명전 N명`을 덧붙인다. 게임 이름 접두사만 제거하고
이 부분은 유지한다 (`📈 이벤트별 발생 · 🏛️명전 8명`).

## 6. 빈 상태 · 에러 처리

실패가 세 층위로 갈린다. 현재 코드는 둘만 다루므로 하나를 새로 넣는다.

| 상황 | 판정 | 화면 |
|---|---|---|
| 뷰가 없거나 접근 불가 | `failed \|\| !summary` | `#overview`에 기존 `setupCard()`. **`#tabs`·`#panel`은 `hidden`** |
| 뷰는 있는데 전체 0행 | `!summary.length` | `setupCard()` + 그 아래 정상 UI (현재 동작 유지) |
| **이 게임만 0행** | 패널 섹션이 전부 빈 문자열 | **신규** — 빈 상태 카드 |

빈 상태 카드 문구:

```
🍜 더 셰프
아직 수집된 데이터가 없어요.
플레이어가 새 캐릭터를 만들면 여기에 분포와 퍼널이 뜨기 시작해요.
```

### 하위 섹션은 예외 없이 빈 문자열을 반환해야 한다

패널 레벨 빈 상태 판정이 성립하려면 각 섹션이 데이터가 없을 때 `""`를 반환해야 한다.
현재 두 군데가 어긋나 있어 함께 고친다.

- **`choiceSection` 146줄** — `html || "<section>…아직 새 캐릭터 데이터가 없어요</section>"`로
  자체 fallback 카드를 반환한다. 게임별로 좁히면 이 fallback을 **패널 레벨로 올려야** 한다.
  그렇지 않으면 데이터 없는 탭에 "선택 분포 없음" 카드만 덜렁 뜨고 진짜 빈 상태 안내가 나오지 않는다.
- **`unicornSection` 170줄** — 은퇴자가 없으면 "아직 은퇴한 창업가가 없어요" 카드를 반환한다.
  이것도 `""`로 낮춰 패널 레벨에 맡긴다.

`dailySection`(222줄 `if (!days.length) return ""`)과 `funnelSection`(162줄 `return html`, 빈 경우 `""`)은
이미 빈 문자열을 반환하므로 그대로 둔다.

### 패널 조립

`choiceSection`은 현재도 배경 분포와 포지션 분포 **두 섹션을 한 문자열로** 반환한다.
이 구조를 유지하므로 조립은 네 조각이다.

```js
const parts = [
  dailySection(STATE.daily, game),
  choiceSection(STATE.choices, game),          // 배경 분포 + 포지션 분포
  game === "unicorn" ? unicornSection(STATE.hofRows) : "",
  funnelSection(STATE.summary, STATE.hofByGame, game),
];
$("panel").innerHTML = parts.join("").trim() || emptyCard(game);
```

## 7. CSS 변경

33~35줄의 기존 `.tabs` / `.tab`을 칩 형태로 고친다.

| 속성 | 현재 | 변경 | 이유 |
|---|---|---|---|
| `.tabs` `overflow-x` | 없음 | `auto` | 8개 가로 스크롤 |
| `.tabs` `position` | 없음 | `sticky; top: 0` + `background: var(--bg)` | 긴 패널을 훑는 동안 탭 유지. 배경이 없으면 뒤 내용이 비쳐 보인다 |
| `.tab` `flex` | `1` | `0 0 auto` + `white-space: nowrap` | 8등분 압축 대신 내용 폭만큼 |
| `.tab` `border-radius` | `10px` | `999px` | 허브 `.chip`과 톤 통일 |

```css
.tabs {
  display: flex; gap: 6px; margin-bottom: 16px;
  overflow-x: auto; scrollbar-width: thin;
  padding: 8px 4px;
  position: sticky; top: 0; z-index: 20;
  background: var(--bg);
  -webkit-overflow-scrolling: touch;
}
.tab {
  flex: 0 0 auto; white-space: nowrap;
  padding: 8px 14px; border: 1px solid var(--line);
  background: var(--bg2); color: var(--dim);
  border-radius: 999px; cursor: pointer; font-size: .88rem;
}
.tab.on { border-color: var(--accent); color: var(--accent); font-weight: 700; }
```

`z-index`는 20으로 둔다. 게이트(`#gate`)가 50, 방문 추이 툴팁(`.sparktip`)이 40이므로
탭 바가 그 아래에 놓여 툴팁을 가리지 않는다.

## 8. 검증

이 저장소에는 `package.json`도 테스트 파일도 없다. 순수 정적 사이트이므로 테스트 러너를
새로 들이지 않고 수동 확인 체크리스트로 검증한다.

```bash
python3 -m http.server 8000   # → http://localhost:8000/beta/stats/
```

| # | 확인 항목 |
|---|---|
| 1 | **상단 KPI 7개 숫자가 변경 전과 완전히 동일** ← 회귀 검증의 핵심 |
| 2 | 탭 8개 전부 존재, 375px 폭에서 가로 스크롤 동작 |
| 3 | 탭 클릭 → 해시 변경 + 패널 교체, **네트워크 요청 0회** (DevTools Network) |
| 4 | `#unicorn` 직접 진입 → 유니콘 탭 활성 + 칩이 화면 안으로 스크롤됨 |
| 5 | `#없는게임` → ⚾ 첫 탭으로 폴백 |
| 6 | 뒤로가기 → 직전 탭 |
| 7 | ↻ 새로고침 → **보던 탭 유지** |
| 8 | 방문 추이 막대 툴팁이 탭 전환 후에도 동작 (hover · 탭 · 키보드 focus) |
| 9 | 데이터 없는 게임 탭 → 빈 상태 카드 |
| 10 | 스크롤 시 탭 바가 상단 고정, 뒤 내용이 비쳐 보이지 않음 |

1번은 작업 전 화면을 스크린샷으로 남겨 대조한다.

8번이 중요한 이유: `sparkTooltip`(337~383줄)은 `document`에 이벤트를 위임하므로 재렌더에 영향받지 않아야
정상이다. 이것이 "전부 미리 렌더하고 CSS로 숨기는" 방식 대신 재렌더 방식을 택한 근거이기도 하다
(숨겨진 패널의 `.spark .col`도 선택자에 잡혀 `getBoundingClientRect()`가 엉뚱한 좌표를 반환한다).

## 9. 배포

루트와 `beta/`의 stats 파일이 현재 완전히 동일하므로 `sync-beta.sh`는 건너뛴다.

```bash
# 1) beta/stats/index.html 수정 → /beta/stats/ 에서 8절 체크리스트
# 2) 상용 반영
bash scripts/promote.sh
git add -A && git commit -m "feat(통계): 게임별 탭으로 분리"
# 3) 릴리스 — 기능 추가이므로 1.9.0 → 1.10.0
bash scripts/release.sh 1.10.0 "통계 대시보드 게임별 탭 분리"
```

베타에서 게이트 비밀번호를 한 번 더 입력하게 되는데 정상이다. `env.js`가 localStorage를
`beta::` 네임스페이스로 격리하므로 `beta::grow-stats-auth`에 따로 저장된다.

`env.js`는 `stats.js`의 **기록**만 끄고 읽기는 막지 않으므로, 베타에서도 상용 데이터
그대로로 검증할 수 있다.

## 10. 범위 밖 / 알려진 이슈

- **Supabase 뷰 변경** — 세 뷰 모두 이미 `game` 컬럼이 있어 필요 없다.
- **파일 분리** — 441줄에서 약 500줄로 늘지만 단일 파일을 유지한다. 배포와 베타 동기화가 단순하다.
  (`sync-beta.sh`는 `stats` 폴더째 복사하고 `sw.js`는 네트워크 우선이므로 파일을 늘려도 동작하지만,
  이 규모에서 분리할 실익이 없다.)
- **부분 fetch 실패 처리** — 현재 `load()` 287줄이 `if (failed || !summary)`라
  `stats_daily` 하나만 실패해도 화면 전체가 `setupCard()`로 대체된다. 기존부터 있던 거친 처리이며
  이번 작업으로 악화되지는 않는다. 다만 게임별 방문 추이가 추가되면서 `daily` 의존도가 커지므로
  **알려진 이슈로 기록해 둔다.** 별건으로 다룬다.
- **게임 추가 자동화** — `GAMES` 상수(89줄)에 한 줄 추가하면 탭이 자동으로 늘어난다. 추가 작업 불필요.
- **지표 계산 변경** — 없다. 숫자는 전부 그대로다.
