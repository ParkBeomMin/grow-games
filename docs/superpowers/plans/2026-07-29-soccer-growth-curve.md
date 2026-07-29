# ⚽ 축구 성장 곡선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development

**Goal:** 축구의 천장(경기 평점 상한)을 없애고, 이미 집계 중인 골·어시·수비를 포지션별 축으로 묶어 연말 평가에 연결한다.

**Architecture:** `beta/soccer/game.js`의 `matchContribution`과 `beta/soccer/career.js`의 평점 산출·`hype` 산식을 고친다. 새 저장 필드를 만들지 않는다 — 필요한 집계는 이미 `act`에 있다.

**Tech Stack:** 바닐라 JS classic script. 빌드 없음. 테스트는 node + jsdom (`tests/soccer/` 신규).

## Global Constraints

- **`beta/soccer/` 안에서만 작업한다.** 상용(`soccer/`)과 다른 게임은 건드리지 않는다.
- 스펙: `docs/superpowers/specs/2026-07-29-soccer-growth-curve.md` — 수치는 여기가 정본이다.
- 상수: `FAN_CAP = 12`, `RATING_DIV = 14`, `AXIS_K = 3.00`, `AXIS_OFF = 3.80`.
  포지션 축 가중치와 정규화 계수도 스펙 표가 정본이다. **시뮬레이션으로 잡은 값이라 임의로 바꾸지 않는다.**
- **기존 저장 데이터를 마이그레이션하지 않는다.** `act.goals`/`assists`/`defense`/`apps`는 이미 있고 `|| 0` 방어도 이미 있다.
- **`matchScoreline`과 유스 경기(`renderStageSim`)는 건드리지 않는다.** 평점이 흘러가는 건 의도된 것이다.
- 테스트는 **소스에서 산식을 추출**하거나 **게임 입구를 통해 실행**한다. 값을 복사해 적은 테스트는 반려 대상이다.
- **`eval("const x = …")`을 쓰지 마라.** 선언이 eval 스코프에 갇혀 `undefined`가 된다. 반드시 `new Function(...)` + `return`.
- 주석·문구는 한국어 존댓말(`~해요`), 기존 파일 어투를 따른다.
- `tests/soccer/`는 **새로 만든다.** `tests/idol/`의 부트스트랩 관례를 따른다.

---

### Task 1: 경기 평점 재조정

**Files:**
- Modify: `beta/soccer/career.js` (현재 261~266행, `myScore`와 `rating`)
- Create: `tests/soccer/rating-test.js`

**Interfaces:**
- Produces: 상수 `FAN_CAP`(12) · `RATING_DIV`(14). `_t`로 `ratingOf(stats, pos, condition, fandom)` 노출.
  `_t`가 없으면 `tests/idol/`처럼 새로 만든다.

이 태스크가 이 작업의 뿌리다. 지금 능력치 60부터 평점이 10.0 상한에 붙어서, 그 위로는
평점도 MOM도 성적도 전부 같다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/soccer/rating-test.js`

`beta/soccer/career.js`에서 `myScore`·`rating` 산식을 정규식으로 추출해 `new Function`으로 실행한다.

검사 항목:
1. 평점이 능력치에 따라 **단조 증가**한다 (40 < 60 < 80 < 100 < 120, 각 2000회 평균).
2. 능력치 40에서 평균 평점이 4.5~5.5 범위다.
3. 능력치 80에서 6.7~7.5 범위다.
4. 능력치 120에서 8.9~9.7 범위다.
5. **능력치 60과 130의 평균 평점 차이가 3.0 이상이다.** (지금은 0에 가깝다 — 이게 천장이다.)
6. 팬덤 상한 — 팬덤 900과 팬덤 100000의 평균 평점 차이가 0.2 미만이다.
7. 평점이 1~10 범위를 벗어나지 않는다 (20000회).

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/rating-test.js
```
Expected: FAIL — 5번(60과 130의 차이가 0에 가까움), 3·4번도 실패

- [ ] **Step 3: 구현**

`beta/soccer/career.js` 상단 상수부에 넣는다.

```js
/* 경기 평점 — 예전에는 myScore를 10으로 나눠서 능력치 60이면 이미 10.0 만점이었어요.
 * 그 위로는 아무리 키워도 평점도 MOM도 성적도 같아서, 이 게임의 천장이 여기였습니다.
 * 나누는 값을 키우고 팬덤 기여에 상한을 걸어 5.0~10.0으로 펼쳤어요.
 * matchContribution의 perf도 전원 최대치(1.6)로 죽어 있었는데 같이 살아납니다. */
const FAN_CAP = 12;
const RATING_DIV = 14;
```

`playShow()`의 261~266행:

```js
    const myScore =
      (S.stats[POS_INFO[S.pos].stat] * 0.32 +
      S.stats.stamina * 0.22 +
      ((S.stats.shoot + S.stats.pass + S.stats.dribble) / 3) * 0.2) * clutch(POS_INFO[S.pos].stat) +
      S.condition / 8 + Math.min((S.fandom || 0) / 45, FAN_CAP) + rand(-5, 5) + 20;
    const rating = clamp(myScore / RATING_DIV, 1, 10);
```

**`clutch(...)`를 빼먹지 마라.** 원본에 있다.

- [ ] **Step 4: 초록불 + 회귀**

```bash
node tests/soccer/rating-test.js
node --check beta/soccer/career.js
```

- [ ] **Step 5: 변이 검증**

`RATING_DIV`를 10으로 되돌리고 테스트를 돌린다. **5번이 반드시 실패해야 한다.**
`FAN_CAP`을 `1e9`로 바꾸면 6번이 실패해야 한다. 둘 다 확인하고 원복한다.

- [ ] **Step 6: 커밋**

```bash
git add beta/soccer/career.js tests/soccer/rating-test.js
git commit -m "fix(베타/축구): 경기 평점 천장 제거 — 능력치 60부터 10.0에 붙던 문제"
```

---

### Task 2: 윙어의 드리블을 성적에 반영

**Files:**
- Modify: `beta/soccer/game.js` (`matchContribution`, 현재 939행)
- Create: `tests/soccer/position-test.js`

**Interfaces:**
- Consumes: Task 1의 평점
- Produces: `matchContribution`의 동작 변경. 시그니처는 그대로.

`matchContribution`이 골은 슛, 어시는 패스, 수비는 수비로만 굴린다. **드리블은 어디에도 안 들어간다.**
그런데 드리블은 윙어의 주 스탯이다. 그래서 윙어만 자기 주 스탯에 투자할수록 나빠진다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/soccer/position-test.js`

`beta/soccer/game.js`에서 `poissonish`와 `matchContribution`을 추출해 실행한다.

검사 항목:
1. 윙어에서 **드리블만 올리면 골+어시 합이 늘어난다** — 드리블 60일 때와 160일 때를 각 5000회 비교.
   (지금은 차이가 없다. 이게 결함이다.)
2. 공격수는 드리블을 올려도 골이 안 변한다 (±3% 이내). 윙어만 바뀌어야 한다.
3. 미드필더·수비수도 마찬가지로 안 변한다.
4. 윙어에서 슛만 올려도 골이 늘어난다 (드리블 반영이 슛을 밀어내지 않았다).
5. 네 포지션 모두 능력치를 올리면 각자의 주력 산출(fw 골, mf 어시, df 수비)이 늘어난다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/position-test.js
```
Expected: FAIL — 1번 (윙어의 드리블이 아무 영향이 없음)

- [ ] **Step 3: 구현**

`beta/soccer/game.js`의 `matchContribution`:

```js
function matchContribution(rating) {
  const perf = clamp((rating - 5) / 4 + 0.6, 0.15, 1.6);
  /* 윙어는 돌파로 기회를 만들어요. 골·도움 판정에 드리블이 함께 작용합니다.
   * 예전에는 드리블이 어디에도 안 들어가서, 윙어만 자기 주 스탯에 투자할수록
   * 성적이 나빠졌어요 (도달 가능 범위에서 재보니 85% → 32%). */
  const isWg = S.pos === "wg";
  const gStat = isWg ? (S.stats.shoot || 40) * 0.6 + (S.stats.dribble || 40) * 0.4 : (S.stats.shoot || 40);
  const aStat = isWg ? (S.stats.pass || 40) * 0.6 + (S.stats.dribble || 40) * 0.4 : (S.stats.pass || 40);
  const shootF = gStat / 100;
  const passF = aStat / 100;
  const defF = (S.stats.defense || 40) / 100;
  const G = { fw: 1.05, wg: 0.75, mf: 0.5, df: 0.14 };
  const A = { mf: 0.95, wg: 0.85, fw: 0.55, df: 0.28 };
  const D = { df: 2.3, mf: 1.2, wg: 0.5, fw: 0.45 };
  const gLam = (G[S.pos] ?? 0.4) * perf * (0.55 + shootF);
  const aLam = (A[S.pos] ?? 0.4) * perf * (0.55 + passF);
  const dLam = (D[S.pos] ?? 0.6) * perf * (0.55 + defF);
  return { g: poissonish(gLam), a: poissonish(aLam), def: poissonish(dLam) };
}
```

- [ ] **Step 4: 초록불 + 회귀**

```bash
node tests/soccer/position-test.js
node tests/soccer/rating-test.js
node --check beta/soccer/game.js
```

- [ ] **Step 5: 변이 검증**

`isWg`를 `false`로 고정하고 돌린다. 1번이 실패해야 한다. 원복한다.

- [ ] **Step 6: 커밋**

```bash
git add beta/soccer/game.js tests/soccer/position-test.js
git commit -m "fix(베타/축구): 윙어의 드리블이 골·도움에 반영되게"
```

---

### Task 3: 포지션별 축을 연말 평가에 연결

**Files:**
- Modify: `beta/soccer/career.js` (상수부, `hype` 산식 — 현재 348행)
- Create: `tests/soccer/axis-test.js`

**Interfaces:**
- Consumes: Task 1·2
- Produces: `POS_AXIS` (표), `posAxis(act, pos)` (→ 축 점수). 둘 다 `_t`로 노출.

축구는 **이미 골·어시스트·수비 성공·출전 수를 시즌·통산 모두 집계하고 있다.**
`hype`만 여전히 순위 기반이라 안 쓰일 뿐이다. 새로 만들 게 없다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/soccer/axis-test.js`

검사 항목:
1. `POS_AXIS`에 `fw`/`wg`/`mf`/`df` 넷이 있고 각각 `g`/`a`/`d`/`n`을 갖는다.
2. 값이 스펙 표와 일치한다 (fw 1.0/0.5/0.15/1.00, wg 0.8/0.8/0.15/1.02, mf 0.5/1.0/0.30/0.88, df 2.0/1.0/0.55/0.76).
3. `posAxis`가 골·어시·수비 각각에 대해 **단조 증가**한다.
4. `posAxis({}, "fw")`가 던지지 않고 0 이상을 준다 (옛 세이브 방어).
5. 없는 포지션(`"gk"`)을 줘도 던지지 않는다.
6. **hype가 축에서 나온다** — 골을 2배로 늘리면 hype가 오른다. 지금은 `act.hypeSum`만 본다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/soccer/axis-test.js
```
Expected: FAIL — `POS_AXIS is not defined`

- [ ] **Step 3: 구현**

`beta/soccer/career.js` 상단 상수부:

```js
/* 포지션별 축 — 골·도움·수비 성공을 포지션에 맞게 묶어요.
 * 수비수의 골 가중치가 높은 건 세트피스 득점이 실제로 희소하고 가치가 크기 때문이에요.
 * n은 정규화 계수예요. 수비수는 시즌 수비 성공이 68회인데 공격수는 골이 31개라,
 * 그대로 더하면 포지션이 곧 유불리가 됩니다. 시뮬레이션으로 잡은 값이에요. */
const POS_AXIS = {
  fw: { g: 1.0, a: 0.5, d: 0.15, n: 1.00 },
  wg: { g: 0.8, a: 0.8, d: 0.15, n: 1.02 },
  mf: { g: 0.5, a: 1.0, d: 0.30, n: 0.88 },
  df: { g: 2.0, a: 1.0, d: 0.55, n: 0.76 },
};
const AXIS_K = 3.00;
const AXIS_OFF = 3.80;

function posAxis(act, pos) {
  const x = POS_AXIS[pos] || POS_AXIS.fw;
  const a = act || {};
  return ((a.goals || 0) * x.g + (a.assists || 0) * x.a + (a.defense || 0) * x.d) * x.n;
}
```

`hype` 산식 (현재 348행):

```js
    /* 연말 평가는 이제 축이 해요. 예전에는 hypeSum(순위 기반)이라
     * 1위를 하는 순간 천장에 붙어서 능력치를 더 올려도 결과가 같았어요.
     * 축은 골·도움·수비 성공 개수라 상한이 없어요. 후반에 기하급수로 커지니
     * 로그로 잽니다 — 선형이면 10년차에 hype가 수백이 돼요. */
    const hype = clamp(Math.log(Math.max(1, posAxis(act, S.pos))) * AXIS_K - AXIS_OFF - agePen, -1.5, 12);
```

`agePen`의 정확한 이름과 위치를 소스에서 확인하고 맞춘다.

`_t`에 `POS_AXIS`, `posAxis`, `AXIS_K`, `AXIS_OFF`를 노출한다.

- [ ] **Step 4: 초록불 + 회귀**

```bash
for t in tests/soccer/*.js; do node "$t" && echo "ok $t" || echo "FAIL $t"; done
node --check beta/soccer/career.js
```

- [ ] **Step 5: 커밋**

```bash
git add beta/soccer/career.js tests/soccer/axis-test.js
git commit -m "feat(베타/축구): 연말 평가를 포지션별 축에서 뽑기"
```

---

### Task 4: 곡선과 포지션 균형 회귀 테스트

**Files:**
- Create: `tests/soccer/curve-test.js`

**Interfaces:**
- Consumes: Task 1~3 전부

이 태스크가 이 작업의 안전망이다. **포지션 정규화 계수가 감이 아니라 측정값이라는 걸
테스트가 지켜야 한다.** 아이돌에서 "초록불인데 아무것도 검증하지 않는 테스트"가 여섯 번 나왔다.

- [ ] **Step 1: 테스트 작성** — `tests/soccer/curve-test.js`

`career.js`와 `game.js`에서 필요한 조각을 전부 추출해 한 시즌(12경기)을 굴린다.
**절대 값을 복사해 적지 마라.** `poissonish`·`matchContribution`·평점 산식·`posAxis`·`hype`·수상 판정을 전부 소스에서 뽑는다.

검사 항목:
1. **곡선** — 능력치를 전부 같은 값으로 두고 5년차 리그MVP 확률:

   | 능력치 | 허용 범위 |
   |---|---|
   | 70 | 0~8% |
   | 90 | 8~25% |
   | 110 | 45~72% |
   | 130 | 78~95% |
   | 150 | 90~100% |

2. **단조 증가** — 70 < 90 < 110 < 130.
3. **포지션 균형 (가장 중요)** — 각 능력치 구간에서 네 포지션의 리그MVP 확률
   최대·최소 차이가 **10%p 이내**다. (측정값은 3%p지만 난수 여유를 둔다.)
4. **중간 등급이 받쳐준다** — 능력치 70에서 베스트11 확률이 35% 이상이다.
   (약한 선수가 아무 상도 못 받으면 이탈한다.)
5. **150에서도 축이 계속 자란다** — 축 점수 평균이 130보다 크다.
   (확률은 100%에서 포화하므로 축 자체를 본다.)

- [ ] **Step 2: 초록불 확인**

```bash
node tests/soccer/curve-test.js
```

- [ ] **Step 3: 변이 검증 — 이 단계를 건너뛰지 마라**

아래를 하나씩 넣고 **각각 어떤 검사가 실패하는지 기록**한 뒤 원복한다.

| 변조 | 실패해야 하는 검사 |
|---|---|
| `RATING_DIV` 14 → 10 | 1·2 (곡선이 평평해짐) |
| `AXIS_K` 3.00 → 1.5 | 1 |
| `POS_AXIS.df.n` 0.76 → 1.0 | **3** (수비수만 유리해짐) |
| `POS_AXIS.df.g` 2.0 → 0.2 | **3** |
| `matchContribution`의 `isWg` → `false` | **3** (윙어가 불리해짐) |

**하나라도 통과하면 그 검사는 아무것도 안 지키고 있는 것이다.** 검사를 고쳐라.

- [ ] **Step 4: 커밋**

```bash
git add tests/soccer/curve-test.js
git commit -m "test(축구): 성장 곡선과 포지션 균형 회귀 테스트"
```

---

## 위험

- **Task 1이 이 작업에서 가장 위험하다.** `rating`은 `matchContribution`,
  `matchScoreline`, MOM 순위표, `deriveOppGoals` 네 곳이 쓴다. 하나라도 놓치면 경기가 어긋난다.
  팀 승률·실점은 측정해본 결과 오히려 개선된다(승률이 76~81% 고정에서 49~81%로 펼쳐짐).
  **그래도 Task 1 뒤에 한 시즌을 실제로 굴려보고 승률이 30~85% 범위인지 확인하라.**
- **저연차가 목표보다 빡빡하다** (70에서 리그MVP 1%). 베스트11이 받쳐주지만
  실기기 확인이 필요하다. 이번 범위에서 계수를 더 만지지 않는다.
- **CSS는 러너 사각지대다.** 이번 작업은 화면을 안 건드리지만 평점 표시 숫자가 바뀐다.
- **축구는 기존 테스트가 하나도 없다.** `tests/soccer/`를 처음 만드는 것이라
  부트스트랩이 틀리면 전부 무의미해진다. `tests/idol/`의 관례를 반드시 따를 것.
