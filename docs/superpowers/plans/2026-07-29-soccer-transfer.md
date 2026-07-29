# ⚽ 축구 이적 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development

**Goal:** 리그 티어(국내 → 유럽 → 빅클럽)와 클럽 전력을 세우고, 오프시즌에 이적할 수 있게 한다.

**Architecture:** `beta/soccer/career.js`에 `LEAGUES`·`CLUBS` 표를 두고, 리그는 평점 페널티와 수상 가치에, 클럽 전력은 팀 성적(동료 득점·실점)에 작용한다. 두 축이 서로 다른 질문에 답한다.

**Tech Stack:** 바닐라 JS classic script. 빌드 없음. 테스트는 node (`tests/soccer/`, 이미 5종 있음).

## Global Constraints

- **`beta/soccer/` 안에서만 작업한다.** 상용(`soccer/`)과 다른 게임은 건드리지 않는다.
- 스펙: `docs/superpowers/specs/2026-07-29-soccer-transfer.md` — 수치는 여기가 정본이다.
- 리그 상수: `penalty` 0 / 1.6 / 2.8, `prestige` 1.00 / 1.35 / 1.80. **시뮬레이션으로 잡은 값이라 바꾸지 않는다.**
- **성장 곡선 작업의 상수를 건드리지 않는다** — `FAN_CAP`(12)·`RATING_DIV`(14)·`AXIS_K`(3.00)·`AXIS_OFF`(4.19)·`POS_AXIS`·`TEAMMATE_GOALS`.
- **기존 저장 데이터를 마이그레이션하지 않는다.** `S.league`는 없으면 `1`, `S.clubStr`은 없으면 `70`, `S.moves`는 없으면 `[]`.
- **강등·방출·시즌 중 이적·협상은 안 넣는다.** 스펙의 "하지 않는 것"을 지킨다.
- 테스트는 **소스에서 산식을 정규식으로 추출**한다. 값을 복사해 적은 테스트는 반려 대상이다.
- **`eval("const x = …")`을 쓰지 마라.** `new Function(...)` + `return`을 쓴다.
- 주석·문구는 한국어 존댓말(`~해요`), 기존 파일 어투를 따른다.
- 기존 `tests/soccer/*.js` 5종이 **끝까지 초록**이어야 한다. 리그 기본값(1부)에서 곡선이 안 변해야 한다는 뜻이다.

---

### Task 1: 리그 티어 — 평점 페널티와 수상 가치

**Files:**
- Modify: `beta/soccer/game.js` (`LEAGUES`·`leagueOf` — **`career.js`가 IIFE라 여기 둬야 한다**)
- Modify: `beta/soccer/career.js` (`ratingOf(...)`, `hype` 산식)
- Create: `tests/soccer/league-test.js`

**Interfaces:**
- Produces: `LEAGUES` (배열), `leagueOf(S)` (→ 리그 객체, 기본 1부). 둘 다 `_t`로 노출.

- [ ] **Step 1: 실패하는 테스트 작성**

검사 항목:
1. `LEAGUES`가 3개이고 `penalty`가 `0`/`1.6`/`2.8`, `prestige`가 `1.00`/`1.35`/`1.80`이다.
2. `leagueOf({})` → 1부 (옛 세이브).
3. `leagueOf({ league: 3 })` → 3부. `leagueOf({ league: 99 })` → 1부 (깨진 값 방어).
4. **평점 페널티가 실제로 작용한다** — 같은 능력치에서 3부 평균 평점이 1부보다 2.5 이상 낮다.
5. **리그격이 hype에 작용한다** — 같은 축 점수에서 3부 hype가 1부보다 높다.
6. **1부에서는 아무것도 안 바뀐다** — 리그 도입 전과 평점·hype가 같다.
   (`penalty` 0, `prestige` 1이라 항등이어야 한다.)
7. **도박 구조** — 능력치 90에서 리그MVP 확률이 1부 ≥ 3부이고, 능력치 130에서 3부 > 1부다.
   각 3000시즌. **이게 이 태스크의 핵심 검사다.**

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/league-test.js
```
Expected: FAIL — `LEAGUES is not defined`

- [ ] **Step 3: 구현**

```js
/* 리그 티어 — 축구 커리어의 핵심 서사는 리그를 옮기는 거예요.
 * penalty는 경기 평점에서 빼고, prestige는 축에 곱해요.
 *
 * 난이도를 곱셈이 아니라 평점에서 빼는 게 핵심이에요.
 * perf = clamp((rating - 5) / 4 + 0.6, 0.15, 1.6)이 평점의 비선형 함수라,
 * 평점을 깎으면 약한 선수가 훨씬 크게 무너져요. 강한 선수는 상한 근처라 덜 다칩니다.
 * 곱셈으로 해봤더니 순효과가 균일해서 능력치와 무관하게 올라갈수록 유리했어요. */
const LEAGUES = [
  { id: 1, name: "K리그",       short: "국내",   flag: "🇰🇷", penalty: 0,   prestige: 1.00 },
  { id: 2, name: "유로파리그",   short: "유럽",   flag: "🇪🇺", penalty: 1.6, prestige: 1.35 },
  { id: 3, name: "챔피언스리그", short: "빅클럽", flag: "🏆", penalty: 2.8, prestige: 1.80 },
];

function leagueOf(st) {
  return LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
}
```

`ratingOf(...)`에 페널티를 넣는다. **`clamp` 안쪽에서 빼야 한다** — 밖에서 빼면 하한 1이 안 지켜진다.

```js
  return clamp(myScore / RATING_DIV - leagueOf(S).penalty, 1, 10);
```

`hype` 산식에 리그격을 곱한다.

```js
    const hype = clamp(Math.log(Math.max(1, posAxis(act, S.pos) * leagueOf(S).prestige)) * AXIS_K - AXIS_OFF - agePen, -1.5, 12);
```

`_t`에 `LEAGUES`·`leagueOf`를 더한다.

- [ ] **Step 4: 초록불 + 회귀**

```bash
for t in tests/soccer/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/soccer/career.js
```

**기존 5종이 전부 초록이어야 한다.** 1부가 기본값이라 아무것도 안 바뀌어야 한다.
깨지면 페널티/리그격이 1부에서 항등이 아닌 것이다 — 검사 6번이 잡는다.

- [ ] **Step 5: 변이 검증**

| 변조 | 실패해야 하는 검사 |
|---|---|
| `penalty`를 전부 0으로 | 4·7 |
| `prestige`를 전부 1로 | 5·7 |
| `leagueOf`가 항상 3부 반환 | 6 + 기존 5종 |

- [ ] **Step 6: 커밋**

```bash
git add beta/soccer/career.js tests/soccer/league-test.js
git commit -m "feat(베타/축구): 리그 티어 — 평점 페널티와 수상 가치"
```

---

### Task 2: 클럽 전력 — 팀 성적에만 작용

**Files:**
- Modify: `beta/soccer/career.js` (`CLUBS` 표), `beta/soccer/game.js` (`teammateGoals`, `deriveOppGoals`)
- Create: `tests/soccer/club-test.js`

**Interfaces:**
- Consumes: Task 1의 `LEAGUES`
- Produces: `CLUBS` (리그 id → 클럽 배열), `clubStrOf(S)` (→ 전력, 기본 70). `_t`로 노출.

**클럽 전력은 개인 수상에 안 닿는다.** 팀 성적(동료 득점·실점)에만 작용한다.
같은 리그 안에서 전력 좋은 팀으로 가면 팀은 더 이기지만 내 수상 확률은 그대로다.

- [ ] **Step 1: 실패하는 테스트 작성**

검사 항목:
1. `CLUBS`에 리그 1·2·3 키가 있고 각각 6개 이상이며, 모든 클럽이 `name`과 `str`(40~95)을 갖는다.
2. 리그가 높을수록 평균 전력이 높다 (1부 < 2부 < 3부).
3. `clubStrOf({})` → 70 (옛 세이브).
4. **전력이 동료 득점에 작용한다** — 전력 90 팀이 전력 50 팀보다 동료 골이 많다 (각 5000경기).
5. **전력이 실점에 작용한다** — 전력 90 팀이 전력 50 팀보다 실점이 적다.
6. **전력이 내 골·도움·수비에는 안 닿는다** — 전력 50과 90에서 `matchContribution` 결과가 같다 (±3%).
7. **전력이 리그MVP 확률에 안 닿는다** — 전력 50과 90에서 차이가 5%p 이내다. 각 3000시즌.
   **이게 두 축이 안 겹친다는 증명이다.**
8. `clubStrOf`가 없거나 깨진 값이어도 던지지 않는다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/club-test.js
```

- [ ] **Step 3: 구현**

`beta/soccer/career.js`에 클럽 표를 둔다. 기존 `OPP_CLUBS` 8개를 리그별로 재배치하고
이름을 늘린다. **실제 구단명을 쓰지 마라** — 이 저장소는 상표를 전부 가상 명칭으로 바꿨다.

```js
/* 클럽 — 전력(str)은 팀 성적에만 작용해요. 개인 수상에는 안 닿습니다.
 * 같은 리그 안에서 전력 좋은 팀으로 가면 팀은 더 이기지만 내 수상 확률은 그대로예요.
 * 이게 리그 이적(개인 커리어)과 명확히 구분되는 지점이에요. */
const CLUBS = {
  1: [
    { name: "FC 노바", str: 78 }, { name: "레인저스", str: 71 },
    { name: "선더볼트", str: 66 }, { name: "블랙이글스", str: 62 },
    { name: "시티즌", str: 57 }, { name: "포레스트 FC", str: 52 },
  ],
  2: [
    { name: "레알 몬테", str: 84 }, { name: "아틀레티코 델", str: 79 },
    { name: "노르드 위니온", str: 74 }, { name: "올림피코 베라", str: 70 },
    { name: "스타디온 루체", str: 65 }, { name: "AC 리베라", str: 61 },
  ],
  3: [
    { name: "인터 아우로라", str: 93 }, { name: "바이언 슈타트", str: 90 },
    { name: "로열 알비온", str: 87 }, { name: "파리 셀레스트", str: 84 },
    { name: "밀란 코로나", str: 81 }, { name: "이베리아 솔", str: 78 },
  ],
};

function clubStrOf(st) {
  const v = st && st.clubStr;
  return typeof v === "number" && isFinite(v) ? clamp(v, 40, 95) : 70;
}
```

`beta/soccer/game.js`의 `teammateGoals`에 전력을 곱한다.

```js
function teammateGoals(rating) {
  // 전력 70이 기준이에요. 좋은 팀은 동료가 더 넣습니다.
  const strF = clubStrOf(S) / 70;
  const base = (TEAMMATE_GOALS[S.pos] ?? 0.6) * (0.6 + (rating - 5) * 0.14) * strF;
  return poissonish(Math.max(0, base));
}
```

`deriveOppGoals`에서 전력을 빼준다.

```js
function deriveOppGoals(rating, defStat) {
  // 전력 70이 기준이에요. 좋은 팀은 덜 먹습니다.
  const strAdj = (clubStrOf(S) - 70) / 100;
  const base = 2.4 - (rating - 5) * 0.28 - (defStat / 100) * 1.4 - strAdj + rand(-0.3, 0.9);
  return Math.max(0, Math.min(4, Math.round(base)));
}
```

**`CLUBS`와 `clubStrOf`는 `game.js`에 둔다.** 확인해봤다 —
`index.html`이 `game.js` → `career.js` 순으로 싣고 **`career.js`는 IIFE**라
그 안의 선언은 `game.js`에서 안 보인다. `teammateGoals`·`deriveOppGoals`가
`game.js`에 있으므로 `clubStrOf`도 거기 있어야 한다.

`game.js`의 전역은 `career.js`에서 보이므로, `transferOffers`(Task 3)도
`CLUBS`를 문제없이 읽는다. **Task 1의 `LEAGUES`·`leagueOf`도 같은 이유로
`game.js`에 두는 게 맞다 — Task 1이 `career.js`에 뒀다면 여기서 옮겨라.**

- [ ] **Step 4: 초록불 + 회귀**

```bash
for t in tests/soccer/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/soccer/career.js && node --check beta/soccer/game.js
```

기본 전력이 70이라 기존 테스트는 안 변해야 한다.

- [ ] **Step 5: 변이 검증**

| 변조 | 실패해야 하는 검사 |
|---|---|
| `strF`를 1로 고정 | 4 |
| `strAdj`를 0으로 고정 | 5 |
| `clubStrOf`를 `matchContribution`에도 곱하기 | **6·7** |

- [ ] **Step 6: 커밋**

```bash
git add beta/soccer/career.js beta/soccer/game.js tests/soccer/club-test.js
git commit -m "feat(베타/축구): 클럽 전력 — 동료 득점과 실점에 작용"
```

---

### Task 3: 이적 화면

**Files:**
- Modify: `beta/soccer/index.html` (새 화면 `screen-transfer`), `beta/soccer/style.css`, `beta/soccer/career.js`
- Create: `tests/soccer/transfer-test.js`

**Interfaces:**
- Consumes: Task 1·2
- Produces: `transferOffers(S)` (→ 제안 배열), `moveToClub(club, league, bonus)`.
  화면 id `screen-transfer`, 카드 클래스 `.tf-card`(`data-club`·`data-league` 속성).

- [ ] **Step 1: 실패하는 테스트 작성**

**게임 입구를 통해 검사한다.** `tests/idol/`의 jsdom 부트스트랩 관례를 따른다.

검사 항목:
1. 1년차에는 이적 버튼이 안 보인다 (같은 리그 이적도 2년차부터).
2. 2년차 결산 화면에 이적 버튼이 있고, 누르면 `screen-transfer`가 보인다.
3. 제안에 **현재 소속 클럽이 안 들어간다.**
4. 직전 시즌 hype가 5.5 미만이면 2부 제안이 **안 온다.**
5. hype 5.5 이상이면 2부 제안이 온다. 6.5 이상이면 3부도 온다.
6. **3부에 있으면 1·2부 제안도 온다** (아래로 내려오는 이적은 언제든 가능).
7. 카드에 **평점 페널티와 수상 가치가 숫자로 표시된다** (`-1.6`, `×1.35`).
   도박의 크기라 감추면 안 된다.
8. 카드를 누르면 `S.group`·`S.league`·`S.clubStr`이 바뀌고 `S.moves`에 한 줄이 쌓인다.
9. "남는다"를 누르면 아무것도 안 바뀐다.
10. 이적 후 결산으로 돌아가고, 다음 시즌이 새 클럽에서 시작된다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/transfer-test.js
```

- [ ] **Step 3: 구현**

자격 상수:

```js
const TRANSFER_MIN_YEAR = 2;    // 같은 리그 이적 가능 연차
const PROMOTE_HYPE = { 2: 5.5, 3: 6.5 };   // 이 리그의 제안이 오는 직전 시즌 hype
const OFFERS_PER_LEAGUE = 2;    // 리그마다 제안 수
```

`transferOffers(S)`는 갈 수 있는 리그마다 클럽 `OFFERS_PER_LEAGUE`개를 뽑는다.
현재 소속 클럽은 뺀다. 계약금은 리그와 전력에서 계산한다.

화면은 리그별로 묶어서 보여주고, 상위 리그 그룹 헤더에 페널티와 수상 가치를 적는다.

```
🇪🇺 유로파리그   평점 -1.6 · 수상 가치 ×1.35
```

`moveToClub`은 `S.group`·`S.league`·`S.clubStr`을 바꾸고 `S.moves`에 기록을 남긴다.

```js
    S.moves.push({ y: S.proYear, from, to: club.name, fromLg: prevLeague, toLg: league.id });
```

- [ ] **Step 4: 초록불 + 회귀**

```bash
for t in tests/soccer/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/soccer/career.js
```

- [ ] **Step 5: 커밋**

```bash
git add beta/soccer/index.html beta/soccer/style.css beta/soccer/career.js tests/soccer/transfer-test.js
git commit -m "feat(베타/축구): 오프시즌 이적 — 같은 리그와 상위 리그"
```

---

### Task 4: 명예의 전당 리그 가중과 기록 표시

**Files:**
- Modify: `beta/soccer/career.js` (`careerScore`, 연말 결산, 은퇴 요약)
- Create: `tests/soccer/hof-test.js`

**Interfaces:**
- Consumes: Task 1~3

빅클럽에서 받은 상이 국내에서 받은 것보다 값어치를 갖게 한다.
**안 그러면 안전하게 1부에 머문 플레이어가 순위에서 앞섭니다.**

- [ ] **Step 1: 실패하는 테스트 작성**

검사 항목:
1. 3부에서 리그MVP 1회가 1부에서 1회보다 커리어 점수가 높다.
2. 배수가 `prestige`와 같다 — 3부 MVP 1회의 기여가 1부의 **1.8배**다.
3. 베스트11도 같은 방식으로 가중된다.
4. **옛 세이브 방어** — 가중 필드가 없으면 옛 방식(가중 없음)으로 계산하고 던지지 않는다.
5. 리그를 안 옮긴 1부 커리어는 점수가 **변하지 않는다** (`prestige` 1이라 항등).
6. 결산 화면에 현재 리그와 클럽이 표시된다.
7. 이적 이력이 있으면 은퇴 요약에 나온다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/hof-test.js
```

- [ ] **Step 3: 구현**

**새 카운터를 더한다. 옛 카운터는 남긴다.**

```js
      awards.push("리그MVP");
      S.career.daesang += 1;
      // 리그격만큼 가중해서 따로 쌓아요. 빅클럽에서 받은 상이 더 값어치를 갖습니다.
      S.career.daesangW = (S.career.daesangW || 0) + lg.prestige;
```

`careerScore()`에서 가중 카운터를 우선 쓰되 없으면 옛 카운터로 떨어진다.

```js
    // daesangW가 없는 옛 세이브는 가중 없이 계산해요. 마이그레이션하지 않습니다.
    const dae = c.daesangW != null ? c.daesangW : c.daesang;
    const bon = c.bonsangW != null ? c.bonsangW : c.bonsang;
```

결산 화면 `draft-team` 줄에 리그와 전력을 넣는다.

- [ ] **Step 4: 초록불 + 회귀**

```bash
for t in tests/soccer/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/soccer/career.js
```

- [ ] **Step 5: 변이 검증**

| 변조 | 실패해야 하는 검사 |
|---|---|
| `daesangW`를 `+= 1`로 (가중 제거) | 1·2 |
| `careerScore`가 항상 `c.daesang`을 쓰게 | 1·2 |
| `c.daesangW != null` 방어 제거 | 4 |

- [ ] **Step 6: 커밋**

```bash
git add beta/soccer/career.js tests/soccer/hof-test.js
git commit -m "feat(베타/축구): 명예의 전당에 리그격 가중"
```

---

## 위험

- **Task 1의 평점 페널티가 `deriveOppGoals`와 `matchScoreline`에도 흘러간다.**
  상위 리그에서 팀 승률이 무너질 수 있다. **Task 2 뒤에 리그·포지션별 팀 승률을 재고
  30~85% 범위인지 확인하라.** 벗어나면 멈추고 보고하라.
- **기존 5종 테스트가 끝까지 초록이어야 한다.** 1부가 기본값이라 아무것도 안 바뀌어야 한다.
  깨지면 어딘가 항등이 아닌 것이다.
- **`clubStrOf`의 로드 순서.** `career.js`와 `game.js` 중 어디에 두느냐가 갈린다.
  소스에서 확인하고 결정하라.
- **CSS는 러너 사각지대다.** 이적 화면은 실기기 확인이 필요하다.
