# ⚾ 더 드래프트 해외 진출 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development

**Goal:** KBO → 일본 리그 → 메이저리그 3단 사다리를 만들고, 포스팅으로 올라갈 수 있게 한다.

**Architecture:** 리그 난이도는 **`oppStr`에 얹는다.** 상위 리그에서는 모든 상대가 그만큼 세고, 그러면 타율·방어율이 내려가 WAR이 낮아지고 수상이 자연히 어려워진다. 축구처럼 문턱(`bar`)을 따로 만들지 않는다.

**Tech Stack:** 바닐라 JS classic script. 빌드 없음. 테스트는 node (`tests/rookie/` 신규).

## Global Constraints

- **`beta/rookie/` 안에서만.** 상용(`rookie/`)과 다른 게임은 건드리지 않는다.
- 스펙: `docs/superpowers/specs/2026-07-30-rookie-overseas.md` — 설계는 여기가 정본이다.
- **`id`는 옛 세이브가 가리킬 값이라 나중에 안 바꾼다. 순서는 `tier`다.**
  축구에서 `id`로 순서를 판단해 사고가 났다.
- **기존 저장 데이터를 마이그레이션하지 않는다.** `S.league`가 없으면 KBO(`oppUp` 0)다.
- **실제 구단명·리그명을 쓰지 않는다.** 이 저장소는 상표를 전부 가상 명칭으로 바꿨다.
- **강등·방출을 넣지 않는다.**
- 테스트는 **소스에서 추출**하거나 **게임 입구를 통해** 실행한다. 값을 복사해 적은 테스트는 반려 대상이다.
- **`eval("const x = …")`을 쓰지 마라.** `new Function(...)` + `return`을 쓴다.
- `node tests/smoke-test.js beta`·`root`, `tests/cloud/`, `tests/check-page-test.js` 전부 통과.
- 주석·문구는 한국어 존댓말(`~해요`).

---

### Task 1: 리그 표와 난이도 — 이 작업의 뿌리

**Files:**
- Modify: `beta/rookie/game.js` (`LEAGUES`·`leagueOf`·`oppStr` 소비처)
- Modify: `beta/rookie/career.js` (`teamStrOf` 넘기는 곳)
- Create: `tests/rookie/league-test.js`

**Interfaces:**
- Produces: `LEAGUES`(3종, `id`·`tier`·`name`·`short`·`flag`·`oppUp`·`prestige`), `leagueOf(st)`.
  `_t`로 노출. `_t`가 없으면 `beta/soccer/career.js`처럼 새로 만든다.

**난이도가 들어갈 자리는 이미 있다.**

```js
// game.js:1469 — 타격
const hitP = clamp(0.16 + S.stats.contact / 800 - (oppStr() - 0.49) * 0.55, 0.10, 0.46)
// game.js:283 — 투구 위기
const hold = clamp(0.02 + S.stats.control / 300 - (oppStr - 0.49) * 0.6, …)
```

`proBatterGame`이 `oppStr: teamStrOf(opp)`를 넘기고 주석에 "상대가 강할수록 치기 어렵고
막기 어려워요"라고 적혀 있다. **거기에 `leagueOf(S).oppUp`을 더한다.**

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/rookie/`를 새로 만든다. **`tests/soccer/rating-test.js`의 부트스트랩 관례를 따르라**
(정규식 추출 + `new Function`, 전역 `S` 주입).

검사 항목:
1. `LEAGUES`가 3개이고 `tier`가 1·2·3으로 겹치지 않는다.
2. **`id: 1`(KBO)의 `oppUp`이 0, `prestige`가 1이다.** 옛 세이브가 안 튄다는 뜻이다.
3. `leagueOf({})` → KBO. `leagueOf({ league: 99 })` → KBO (깨진 값 방어).
4. `tier` 순서대로 `oppUp`과 `prestige`가 단조 증가한다.
5. **난이도가 타격에 실제로 작용한다** — 같은 능력치에서 메이저의 안타 확률이 KBO보다 낮다.
6. **투구에도 작용한다** — 위기 상황 실점이 메이저에서 더 많다.
7. **`hitP` 하한(0.10)에 붙지 않는다** — 능력치 40~130 전 구간에서 메이저 안타 확률이
   0.115 이상이다. **여기 붙으면 난이도가 더 안 올라가고 그게 축구의 평점 천장과 같은 실패다.**
8. **KBO에서는 아무것도 안 바뀐다** — 리그 도입 전과 `hitP`·실점이 같다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/rookie/league-test.js
```

- [ ] **Step 3: 구현**

```js
/* 리그 사다리 — tier가 순서예요. id는 옛 세이브가 가리키는 값이라 안 바꿔요.
 *
 * 난이도는 상대 수준(oppStr)에 얹어요. 축구는 평가가 순위 기반이라 경기 평점을
 * 깎았지만, 야구는 타율·홈런·방어율에서 평가가 나오니 상대를 세게 하면
 * 그 숫자가 자연히 내려가요. 실제로 벌어지는 일과도 같습니다 —
 * 메이저에서 타율이 떨어지는 건 투수가 좋기 때문이에요.
 *
 * WAR이 내려가면 수상이 자동으로 어려워지니 문턱(bar)을 따로 두지 않아요. */
const LEAGUES = [
  { id: 1, tier: 1, name: "KBO",        short: "국내",   flag: "🇰🇷", oppUp: 0,    prestige: 1.00 },
  { id: 2, tier: 2, name: "일본 리그",   short: "일본",   flag: "🇯🇵", oppUp: 0.06, prestige: 1.45 },
  { id: 3, tier: 3, name: "메이저리그",  short: "메이저", flag: "🇺🇸", oppUp: 0.13, prestige: 2.10 },
];
```

**`oppUp`·`prestige`는 시험값이다.** Step 4에서 실측해 맞춘다.

- [ ] **Step 4: 계수 실측**

**판단 기준은 수상 확률이 아니라 `수상 확률 × prestige`(명예의 전당 가치)다.**
상위 리그에서는 상을 덜 받지만 그 상이 크게 남는다.

목표: 평범한 능력치는 KBO가, 준정상급은 일본이, 정상급은 메이저가 최적.
**각 구간에서 최적 리그의 가치가 차선보다 10% 이상 높아야 한다.**

`oppUp`과 `prestige`만 움직인다. 타격·투구·WAR 산식은 건드리지 않는다.

- [ ] **Step 5: 초록불 + 회귀** → **Step 6: 변이 검증** → **Step 7: 커밋**

변이: `oppUp` 전부 0 → 5·6 실패 / `prestige` 전부 1 → 곡선 검사 실패 / `id:1`의 `oppUp`을 0.1로 → 8 실패

---

### Task 2: 해외 구단과 팀 승률

**Files:**
- Modify: `beta/rookie/career.js` (구단 목록, `teamStrOf`, `KBO_TEAMS` 쓰는 곳)
- Create: `tests/rookie/club-test.js`

**Interfaces:**
- Consumes: Task 1
- Produces: 리그별 구단 목록. `teamsOf(league)`.

- [ ] **Step 1: 실패하는 테스트 작성**

1. 리그마다 구단이 6곳 이상이고 이름이 겹치지 않는다.
2. 리그가 높을수록 평균 전력이 높다.
3. **실제 구단명이 없다** — 목록에 알려진 실제 구단 이름이 안 들어 있다.
4. **팀 승률이 30~85% 범위다** — 리그 × 능력치(평범/준정상/정상) 격자로 각 300시즌.
   **이 검사가 이 태스크의 본체다.**
5. 옛 세이브(`S.league` 없음)는 KBO 구단만 상대한다.

- [ ] **Step 2~3: 빨간불 → 구현**

**⚠️ 이 태스크에서 가장 위험한 지점이다.** `oppStr`은 팀 전력과 같은 통로라
리그 난이도가 `teamWinP`·`gameWinP`·`crisisRuns`·가을야구 대진까지 흘러간다.
**축구에서 같은 자리를 놓쳐 수비수 팀 승률이 7%가 된 적이 있다.**

**검사 4번이 30~85%를 벗어나면 멈추고 보고하라.** 범위를 넓히지 마라.

- [ ] **Step 4~6: 초록불 → 변이 검증 → 커밋**

---

### Task 3: 포스팅과 가을야구

**Files:**
- Modify: `beta/rookie/career.js` (자격 판정, 이적 화면, `Postseason` 라벨)
- Create: `tests/rookie/posting-test.js`

**Interfaces:**
- Consumes: Task 1·2
- Produces: `POST_GATE`(리그별 자격), `postingOffers(st)`, `moveToLeague(...)`

**자격**

| 경로 | 자격 |
|---|---|
| KBO → 일본 리그 | 4년차 이상 + 직전 시즌 WAR 4.0 이상 |
| 일본 리그 → 메이저리그 | 직전 시즌 WAR 4.5 이상 |
| KBO → 메이저리그 (직행) | 7년차 이상 + 직전 시즌 WAR 5.5 이상 |

**직행이 가장 어렵고 일본을 거치면 문턱이 낮아진다** — 실제 커리어 경로와 같다.
**돌아오는 이적은 문턱이 없다.**

**가을야구 — 여기서 결정한다**

`Postseason`이 KBO 전용 구조(준PO·PO·한국시리즈)다.
**구조는 그대로 두고 라벨만 리그별로 바꾼다.** 새 대진 방식을 만들지 마라.

- KBO → 한국시리즈
- 일본 리그 → 일본시리즈
- 메이저리그 → 월드시리즈

라벨 매핑 한 곳으로 끝나야 한다. **구조를 건드리면 이 태스크가 통제를 벗어난다.**

- [ ] **Step 1: 실패하는 테스트 작성**

**게임 입구를 통해 검사한다.**

1. 3년차·WAR 3.0이면 **어떤 해외 제안도 안 온다.**
2. 4년차·WAR 4.0이면 일본 제안이 오고 **메이저는 안 온다.**
3. 7년차·WAR 5.5면 메이저 직행 제안이 온다.
4. 일본 소속·WAR 4.5면 메이저 제안이 온다 (KBO 직행보다 쉽다).
5. **돌아오는 이적은 문턱 없이 언제든 가능하다.**
6. 이적하면 `S.league`·`S.team`이 바뀌고 이력이 남는다.
7. **강등이 없다** — 성적이 나빠도 리그가 자동으로 안 내려간다. 여러 시즌 굴려 확인.
8. 화면 카드에 **`oppUp`이 성적에 어떻게 작용하는지 숫자로** 보인다.
9. **가을야구 라벨이 리그별로 다르다** (한국시리즈 / 일본시리즈 / 월드시리즈).
10. 기존 FA·트레이드가 **그대로 동작한다** (회귀).

- [ ] **Step 2~5**

---

### Task 4: 명예의 전당 리그 가중

**Files:**
- Modify: `beta/rookie/career.js` (수상 판정, `careerScore`)
- Create: `tests/rookie/hof-test.js`

**⚠️ 축구에서 낸 버그를 반복하지 마라.**

`(mvpW || 0) + prestige`로 쓰면 **옛 세이브가 새 상을 받는 순간 지난 상이 사라진다**
(MVP 4회 세이브가 5번째를 받으면 200점 → 50점). **옛 카운터를 1배로 세어 이어붙여라.**

- [ ] **Step 1: 실패하는 테스트 작성**

1. 메이저 MVP 1회가 KBO 1회보다 커리어 점수가 높고, 배수가 `prestige`와 같다.
2. 골든글러브·신인왕도 같은 방식으로 가중된다.
3. **옛 세이브 방어** — 가중 필드가 없으면 옛 방식으로 계산하고 던지지 않는다.
4. **옛 세이브가 새 상을 받아도 점수가 안 떨어진다.** ← 축구에서 낸 버그
5. KBO만 뛴 커리어는 점수가 **변하지 않는다** (`prestige` 1이라 항등).
6. 결산·은퇴 화면에 현재 리그가 표시된다.

- [ ] **Step 2~5**

---

## 위험

- **`oppStr`이 팀 전력과 같은 통로다.** Task 2의 검사 4번이 유일한 안전망이다.
- **`hitP` 하한 0.10.** Task 1의 검사 7번이 잡는다. 붙으면 난이도가 안 올라간다.
- **야구는 전용 테스트가 하나도 없다.** `tests/rookie/`를 처음 만드는 것이라
  부트스트랩이 틀리면 전부 무의미해진다. `tests/soccer/`의 관례를 반드시 따를 것.
- **가을야구 구조를 건드리면 범위를 벗어난다.** 라벨만 바꾼다.
- **WAR은 이 게임의 고유 축이고 잘 돌아간다.** 리그 계수가 그걸 흔들지 않게 재는 것이
  일의 대부분이다.
