# ⚽ 하부 리그 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development

**Goal:** K리그3·K리그2를 더해 5단 사다리를 만들고, 📹 세미프로 입단이 K리그3에서 프로를 시작하게 한다.

**Architecture:** `LEAGUES`에 `tier`(순서)와 `bar`(경쟁 강도)를 더한다. **기존 `id` 1/2/3은 절대 안 바꾼다** — 옛 세이브가 엉뚱한 리그로 가는 걸 막는 유일한 방법이다.

**Tech Stack:** 바닐라 JS classic script. 빌드 없음. 테스트는 node (`tests/soccer/` 12종 있음).

## Global Constraints

- **`beta/soccer/` 안에서만 작업한다.** 상용(`soccer/`)과 다른 게임은 건드리지 않는다.
- 스펙: `docs/superpowers/specs/2026-07-29-soccer-lower-leagues.md` — 설계는 여기가 정본이다.
- **기존 `LEAGUES`의 `id` 1(K리그1)·2(유로파)·3(챔스)를 바꾸지 않는다.** 새 리그는 새 id를 받는다.
  순서는 새 필드 `tier`로 표현한다. `S.league`를 마이그레이션하지 않는다.
- **성장 곡선 상수를 건드리지 않는다** — `FAN_CAP`·`RATING_DIV`·`AXIS_K`(3.00)·`AXIS_OFF`(4.19)·`POS_AXIS`·`TEAMMATE_GOALS`.
- **`penalty`는 위쪽에만 쓴다.** 하부 리그의 `penalty`는 0이다. 아래로 갈 때 평점 보너스를 줘도 `perf` 상한(1.6)에 막혀 효과가 없다는 걸 이미 확인했다.
- **실제 구단명·리그명을 쓰지 않는다.** 이 저장소는 상표를 전부 가상 명칭으로 바꿨다.
- 테스트는 **소스에서 추출**하거나 **게임 입구를 통해** 실행한다. 값을 복사해 적은 테스트는 반려 대상이다.
- **`eval("const x = …")`을 쓰지 마라.** `new Function(...)` + `return`을 쓴다.
- 기존 `tests/soccer/*.js` 12종과 `tests/cloud/*.js`가 **끝까지 초록**이어야 한다.
  K리그1이 기본값이라 거기서는 아무것도 안 바뀌어야 한다는 뜻이다.
- 주석·문구는 한국어 존댓말(`~해요`).

---

### Task 1: 5단 리그와 `bar`

**Files:**
- Modify: `beta/soccer/game.js` (`LEAGUES`, `leagueOf`)
- Modify: `beta/soccer/career.js` (수상 판정 세 곳 — 434·438·453행 근처)
- Create: `tests/soccer/ladder-test.js`

**Interfaces:**
- Produces: `LEAGUES`에 `tier`·`bar` 추가, 새 리그 2종. `leagueOf`는 그대로.
  `barOf(st)` (→ 경쟁 강도, 기본 1.0)를 `_t`로 노출.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/soccer/ladder-test.js`

검사 항목:
1. `LEAGUES`가 5개이고 `tier`가 1~5로 겹치지 않는다.
2. **`id` 1·2·3의 이름·`penalty`·`prestige`가 지금과 같다.** 소스에서 뽑아 비교하지 말고,
   `id: 1`의 `tier`가 3이고 `penalty`가 0, `id: 2`의 `tier`가 4, `id: 3`의 `tier`가 5임을 확인한다.
   **이게 옛 세이브를 지키는 검사다.**
3. 하부 리그 2종의 `penalty`가 0이고 `prestige` < 1, `bar` < 1이다.
4. `tier` 순서대로 `bar`가 단조 증가한다.
5. `leagueOf({})` → K리그1 (`id` 1). `leagueOf({ league: 3 })` → 챔스.
6. **수상 문턱에 `bar`가 실제로 작용한다** — 같은 hype에서 K리그3의 리그MVP 확률이 K리그1보다 높다 (각 4000회).
7. **베스트11·신인왕도 같이 스케일한다** — 셋 다 `bar`를 쓴다. 하나만 고치면 상끼리 앞뒤가 안 맞는다.
8. **목표 사다리** — `리그MVP 확률 × prestige`가 최대인 리그가
   능력치 70에서 K리그3, 90에서 K리그2, 130에서 유로파, 150에서 챔피언스리그다.
   (110은 K리그1 또는 유로파 — 둘 중 하나면 통과.) 칸당 4000시즌.
   **이게 이 태스크의 핵심 검사다.**
9. 각 구간에서 최적 리그의 가치가 차선보다 **10% 이상** 높다. 붙어 있으면 고민할 근거가 없다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/ladder-test.js
```
Expected: FAIL — `LEAGUES`가 3개, `tier`·`bar` 없음

- [ ] **Step 3: 구현**

```js
/* 리그 사다리 — tier가 순서예요. id는 옛 세이브가 가리키는 값이라 절대 안 바꿔요.
 *
 * bar는 경쟁 강도예요. 수상 문턱과 라이벌 분포에 함께 곱합니다.
 * 처음엔 prestige만으로 하부 리그를 표현하려 했는데, 그러면 축이 같이 줄어서
 * 하부가 오히려 더 어려워졌어요 (능력치 90에서 K3 1% 대 K1 14%).
 * 평점 보너스로 메우려 해도 perf = clamp(…, 0.15, 1.6)의 상한에 막혀요.
 * 하부 리그가 쉬운 건 내가 잘해서가 아니라 경쟁자가 약하기 때문이에요.
 *
 * penalty는 위쪽에만 써요. 아래로 갈 때 평점 보너스는 위 이유로 효과가 없어요. */
const LEAGUES = [
  { id: 5, tier: 1, name: "K리그3", short: "3부", flag: "🇰🇷", penalty: 0, prestige: 0.55, bar: 0.60 },
  { id: 4, tier: 2, name: "K리그2", short: "2부", flag: "🇰🇷", penalty: 0, prestige: 0.78, bar: 0.80 },
  { id: 1, tier: 3, name: "K리그1", short: "1부", flag: "🇰🇷", penalty: 0, prestige: 1.00, bar: 1.00 },
  { id: 2, tier: 4, name: "유로파리그", short: "유럽", flag: "🇪🇺", penalty: 1.6, prestige: 1.35, bar: 1.12 },
  { id: 3, tier: 5, name: "챔피언스리그", short: "빅클럽", flag: "🏆", penalty: 2.8, prestige: 1.80, bar: 1.22 },
];

function barOf(st) {
  const b = leagueOf(st).bar;
  return typeof b === "number" && isFinite(b) ? b : 1;
}
```

**`prestige`와 `bar` 값은 시험값이다.** Step 4에서 목표 사다리에 맞게 탐색한다.

`beta/soccer/career.js`의 수상 판정 세 곳에 `bar`를 곱한다.

```js
    const bar = barOf(S);
    if (S.proYear === 1 && hype >= 3 * bar) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(1.5 * bar, 4.2 * bar)));
      …
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5 * bar, 7.8 * bar)));
    if (hype >= 5.5 * bar && hype >= leagueBest) {
    …
    if (hype >= 4.5 * bar) {
      const posBar = rand(4.2 * bar, 6.2 * bar);
```

**`const bar = barOf(S);`를 한 번만 선언하고 세 곳이 같이 쓰게 하라.**
다만 이 저장소의 테스트들이 산식을 정규식으로 뽑아 합성 스코프에서 돌린다.
**`leagueBest`·`posBar`·`bestRookie` 줄의 형태를 크게 바꾸면 기존 테스트가 죽는다.**
바꾸기 전에 `tests/soccer/*.js`와 `tests/cloud/career-cloud-test.js`가
어떤 정규식으로 이 줄들을 뽑는지 확인하라.

- [ ] **Step 4: 계수 탐색**

`prestige`와 `bar`만 움직여 목표 사다리(검사 8·9)를 맞춘다.
`penalty`·`AXIS_K`·`AXIS_OFF`·`POS_AXIS`는 건드리지 않는다.

이미 확인된 것:
- `bar` 0.60/0.80/1.00/**1.12**/**1.22** · `prestige` 0.55/0.75/1.00/**1.35**/**1.80**
  → 챔피언스리그가 끝내 최적이 안 된다 (130에서 K1·유로파가 0.86, 챔스 0.63)
- `bar` …/**1.02**/**1.06** · `prestige` …/**1.40**/**2.00**
  → 능력치 90부터 챔스가 최적이다. 너무 후하다

**답은 그 사이에 있다.** 그리드로 훑어라.

- [ ] **Step 5: 초록불 + 회귀**

```bash
for t in tests/soccer/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
for t in tests/cloud/*.js; do node "$t" >/dev/null || echo "FAIL $t"; done
node --check beta/soccer/game.js && node --check beta/soccer/career.js
```

**기존 12종이 전부 초록이어야 한다.** K리그1의 `bar`가 1이라 항등이다.

- [ ] **Step 6: 변이 검증**

| 변조 | 실패해야 하는 검사 |
|---|---|
| `bar`를 전부 1로 | 6·8 |
| 신인왕·베스트11에서 `bar` 제거 (MVP만 남김) | 7 |
| `id: 1`의 `tier`를 1로 | 2 |
| `prestige`를 전부 1로 | 8·9 |

- [ ] **Step 7: 커밋**

```bash
git add beta/soccer/game.js beta/soccer/career.js tests/soccer/ladder-test.js
git commit -m "feat(베타/축구): 5단 리그 사다리 — 하부 리그와 경쟁 강도(bar)"
```

---

### Task 2: 하부 클럽과 세미프로 엔딩

**Files:**
- Modify: `beta/soccer/game.js` (`CLUBS`에 하부 2종, `showEnding`의 📹 분기)
- Modify: `beta/soccer/career.js` (`enterCareer`가 시작 리그를 받게)
- Create: `tests/soccer/semipro-test.js`

**Interfaces:**
- Consumes: Task 1의 `LEAGUES`
- Produces: `CLUBS`에 id 4·5 키. `enterCareer(captain, weakest, startLeague)`.

- [ ] **Step 1: 실패하는 테스트 작성**

**게임 입구를 통해 검사한다.** `tests/soccer/scout-path-test.js`가 유스 3년을 실제 클릭으로
소화하고 서바이벌 결과를 `Math.random` 범위로 고정하는 방법을 쓴다. **그 부트스트랩을 재사용하라.**

검사 항목:
1. `CLUBS`에 리그 id 4·5 키가 있고 각각 6개 이상이며 `name`·`str`을 갖는다.
2. 하부 리그의 평균 전력이 K리그1보다 낮다.
3. **📹 세미프로 입단 엔딩에 "⚽ 프로 커리어 시작!" 버튼이 있다.**
4. 그 버튼을 누르면 `S.league`가 K리그3의 id가 되고 소속 클럽이 `CLUBS[K3]`에 있다.
5. **🎒 축구화를 잠시 벗다는 여전히 프로 버튼이 없다.** 진짜 엔딩이 하나는 남아야 한다.
6. 🌱 유스 재계약의 "한 시즌 더"와 📞 스카우트의 최약체 시작이 **여전히 동작한다** (회귀).

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/semipro-test.js
```

- [ ] **Step 3: 구현**

`CLUBS`에 하부 리그를 더한다. 이름은 가상으로 짓되 기존 1부 이름들과 결이 맞게.

`showEnding`의 📹 분기가 프로로 이어지게 한다. **📞 스카우트가 쓰는 플래그 방식을 그대로 따르라** —
엔딩 분기에서 플래그를 세워 `onEnding`에 넘긴다. 조건을 호출부에서 다시 계산하면 어긋난다.

`msg`도 고친다. 지금은 끝맺음 문장인데 이제 진짜로 이어진다.
**출발이 가장 아래라는 것도 함께 알려라.**

- [ ] **Step 4: 초록불 + 회귀**

```bash
for t in tests/soccer/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/soccer/game.js && node --check beta/soccer/career.js
```

- [ ] **Step 5: 커밋**

```bash
git add beta/soccer/ tests/soccer/semipro-test.js
git commit -m "feat(베타/축구): 📹 세미프로 입단이 K리그3에서 프로로 이어져요"
```

---

### Task 3: 승격과 이적 화면

**Files:**
- Modify: `beta/soccer/career.js` (`PROMOTE_HYPE`, `transferOffers`, `renderTransfer`)
- Modify: `tests/soccer/transfer-test.js`
- Create: `tests/soccer/promote-test.js`

**Interfaces:**
- Consumes: Task 1·2

하부 리그가 생기면 **아래에서 위로 올라오는 길이 주 서사**가 된다.

- [ ] **Step 1: 실패하는 테스트 작성**

검사 항목:
1. K리그3에 있으면 K리그2 제안이 온다 (문턱을 넘었을 때).
2. **내려가는 이적은 문턱 없이 언제든 가능하다** — K리그1에서 K리그3 제안이 온다.
3. `PROMOTE_HYPE`가 5단 전부를 덮는다. 어느 리그에서도 위로 갈 문턱이 정의돼 있다.
4. **강등이 없다** — 성적이 나빠도 리그가 자동으로 안 내려간다. 시즌을 여러 번 굴려 확인한다.
5. 이적 화면 카드에 리그 이름과 `prestige`·`penalty`가 **숫자로** 표시된다.
   하부 리그 카드에는 페널티 대신 수상 가치가 낮다는 게 보여야 한다.
6. 기존 이적 검사(같은 리그·상위 리그·계약금 왕복 차단)가 **전부 그대로 통과한다**.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/promote-test.js
```

- [ ] **Step 3: 구현**

`PROMOTE_HYPE`를 5단으로 늘린다. 하부에서 위로 가는 문턱은 K리그1보다 낮게 —
K리그3에서 K리그2로 가는 건 K리그1에서 유로파로 가는 것보다 쉬워야 한다.

**문턱은 `bar`가 곱해진 hype 눈금 위에서 정한다.** 하부 리그는 `bar`가 낮아
같은 실력이라도 hype가 다르게 나온다. 반드시 실측해서 잡아라.

이적 화면은 리그를 `tier` 순으로 묶어 보여준다. 지금 위쪽만 강조하는 구조라면
아래쪽도 같은 형식으로 보이게 한다.

- [ ] **Step 4: 초록불 + 회귀**

```bash
for t in tests/soccer/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
for t in tests/cloud/*.js; do node "$t" >/dev/null || echo "FAIL $t"; done
```

- [ ] **Step 5: 커밋**

```bash
git add beta/soccer/career.js tests/soccer/
git commit -m "feat(베타/축구): 하부 리그 승격과 이적 화면 5단 정리"
```

---

## 위험

- **옛 세이브의 `S.league`가 가장 위험하다.** `id` 1/2/3을 바꾸면 진행 중인 캐릭터가
  엉뚱한 리그로 간다. Task 1의 검사 2번이 이걸 지킨다. **절대 완화하지 마라.**
- **`bar`가 수상 판정 세 곳에 닿는다.** 하나만 고치면 상끼리 앞뒤가 안 맞는다.
  검사 7번이 잡는다.
- **기존 테스트들이 수상 판정 줄을 정규식으로 뽑는다.** 줄 형태를 크게 바꾸면 죽는다.
  바꾸기 전에 어떤 정규식이 걸려 있는지 확인하라.
- **CSS는 러너 사각지대다.** 이적 화면에 리그가 5개로 늘어난다. 실기기 확인이 필요하다.
