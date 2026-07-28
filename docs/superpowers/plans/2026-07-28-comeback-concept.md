# 🎤 컴백 컨셉 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development

**Goal:** 컴백마다 컨셉을 고르게 하고, 시즌 유행에 따라 그 선택의 값이 달라지게 한다.

**Architecture:** `beta/idol/career.js` 안에 `CONCEPTS` 표를 두고, 판매량 산식이
고른 컨셉의 가중치를 읽는다. 컴백이 시작될 때 유행·식상을 굴려 `act`에 저장하고,
컨셉이 안 정해진 상태에서는 음방 무대로 못 가게 막는다.

**Tech Stack:** 바닐라 JS classic script. 빌드 없음. 테스트는 node + jsdom (`tests/idol/`).

## Global Constraints

- **`beta/` 안에서만 작업한다.** 상용(`idol/`)은 건드리지 않는다.
- 스펙: `docs/superpowers/specs/2026-07-28-comeback-concept-design.md` — 수치는 여기가 정본이다.
- 판매량 계수는 **`0.72`**, 유행 **`1.18`**, 식상 **`0.85`**. 시뮬레이션으로 잡은 값이라 임의로 바꾸지 않는다.
- **기존 저장 데이터를 마이그레이션하지 않는다.** 읽는 쪽에서 기본값(청량, trend 1)을 준다.
- 새 산식은 `S.stats`만 읽는다. `POS_INFO`나 주 스탯 개념을 끌어오지 않는다.
- 테스트는 **소스에서 산식을 추출**하거나 **게임 입구를 통해 실행**한다.
  값을 복사해 적은 테스트는 반려 대상이다.
- `eval("const x = …")`은 선언이 eval 스코프에 갇힌다. **반드시 `new Function(...)` + `return`** 을 쓴다.
- 각 태스크 끝에 `tests/idol/*.js` 전부와 `node --check`를 돌린다.

---

### Task 1: CONCEPTS 표와 판매량 산식

**Files:**
- Modify: `beta/idol/career.js` (상단 상수부, `weeklyChart()` 안 `cbSales` 블록 — 현재 443~445행)
- Create: `tests/idol/concept-test.js`

**Interfaces:**
- Produces: `CONCEPTS` (배열), `conceptOf(act)` (→ 컨셉 객체), `trendMul(concept, act)` (→ 배수),
  `expectedSales(stats, concept, fandom, cbWins)` (→ 편차·유행 뺀 기댓값). 넷 다 `_t`로 노출한다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/idol/concept-test.js`

`beta/idol/career.js`를 jsdom에 올려 `Career._t`에서 함수를 꺼내 검사한다.
기존 `tests/idol/tour-test.js`가 같은 방식을 쓰니 그 파일의 부트스트랩을 그대로 따른다.

검사 항목:
1. `CONCEPTS`가 4개이고 id가 `cool`/`fierce`/`emo`/`teen`이다.
2. 각 컨셉의 가중치 합이 스펙 표와 일치한다 (청량 1.8, 강렬 2.0, 감성 1.8, 하이틴 2.0).
3. `conceptOf({})` → 청량 (옛 세이브 기본값).
4. `conceptOf({ concept: "emo" })` → 감성.
5. `conceptOf({ concept: "없는거" })` → 청량 (깨진 값 방어).
6. `trendMul(감성, { hot: "emo", cold: "teen" })` === `1.18`.
7. `trendMul(하이틴, { hot: "emo", cold: "teen" })` === `0.85`.
8. `trendMul(청량, { hot: "emo", cold: "teen" })` === `1`.
9. **같은 컨셉이 유행이자 식상일 때** `trendMul(감성, { hot: "emo", cold: "emo" })` === `1`.
10. `trendMul(청량, {})` === `1` (옛 세이브).
11. 보컬 150·나머지 60인 스탯에서 `expectedSales`가 감성 > 청량이다.
12. 댄스 150·나머지 60에서 청량 > 감성이다.
13. `expectedSales`는 팬덤이 오르면 단조 증가한다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/idol/concept-test.js
```
Expected: FAIL — `CONCEPTS is not defined` 또는 `_t.conceptOf is not a function`

- [ ] **Step 3: 구현**

`beta/idol/career.js` 상단 상수부(`FANDOM_CAP` 근처)에 넣는다.

```js
/* 컴백 컨셉 — 같은 능력치라도 어느 컨셉으로 나가느냐가 초동을 가릅니다.
 * 가중치는 스펙(docs/superpowers/specs/2026-07-28-comeback-concept-design.md)이 정본이에요.
 * v는 편차예요. 강렬이 가장 크고(±28%) 청량이 가장 작아요(±10%). */
const CONCEPTS = [
  { id: "cool",   emoji: "💧", name: "청량",   desc: "댄스 중심 · 안정적",
    w: { dance: 1.0, charm: 0.5, vocal: 0.2, rap: 0.1 }, v: 0.10 },
  { id: "fierce", emoji: "🔥", name: "강렬",   desc: "랩·댄스 중심 · 편차가 커요",
    w: { rap: 0.8, dance: 0.7, charm: 0.4, vocal: 0.1 }, v: 0.28 },
  { id: "emo",    emoji: "🌙", name: "감성",   desc: "보컬 중심",
    w: { vocal: 1.1, charm: 0.5, dance: 0.2, rap: 0.0 }, v: 0.12 },
  { id: "teen",   emoji: "✨", name: "하이틴", desc: "매력 중심",
    w: { charm: 1.1, dance: 0.5, vocal: 0.3, rap: 0.1 }, v: 0.18 },
];
const SALES_K = 0.72;    // 시뮬레이션으로 잡은 값 — 곡선이 여기 걸려 있어요
const TREND_HOT = 1.18;
const TREND_COLD = 0.85;

// 옛 세이브에는 concept이 없어요. 편차가 가장 작은 청량을 기본으로 둡니다.
function conceptOf(act) {
  return CONCEPTS.find((c) => c.id === (act && act.concept)) || CONCEPTS[0];
}

// 같은 컨셉이 유행이자 식상으로 뽑히면 상쇄돼요 (배수 없음)
function trendMul(concept, act) {
  if (!act || !act.hot || act.hot === act.cold) return 1;
  if (concept.id === act.hot) return TREND_HOT;
  if (concept.id === act.cold) return TREND_COLD;
  return 1;
}

// 편차와 유행 배수를 뺀 기댓값 — 컨셉 선택 화면에 보여줄 숫자예요
function expectedSales(stats, concept, fandom, cbWins) {
  let base = 0;
  for (const k in concept.w) base += (stats[k] || 0) * concept.w[k];
  return Math.max(1, Math.round(base * SALES_K + (fandom || 0) * 0.05 + (cbWins || 0) * 4));
}
```

`weeklyChart()`의 `cbSales` 블록을 교체한다. **`const stage = ...` 줄도 같이 지운다** (더 안 쓴다).

```js
        /* 초동 판매량 — 이 게임의 고유 축이에요.
         * 능력치에서 직접 자라고 상한이 없어요. 컨셉이 어느 능력치를 볼지 정하고,
         * 시즌 유행이 배수를 얹어요. 편차는 컨셉마다 달라요. */
        const concept = conceptOf(act);
        const cbSales = Math.max(1, Math.round(
          expectedSales(S.stats, concept, S.fandom, act.cbWins) *
          trendMul(concept, act) * (1 + rand(-concept.v, concept.v))
        ));
        act.sales += cbSales;
        extraLine = `<div class="tour-pts">💿 ${act.cb}차 컴백 종료 · ${concept.emoji} ${concept.name} — 1위 ${act.cbWins}회 · 초동 ${cbSales}만 장</div>`;
```

`_t`에 노출한다 (현재 `_t: { tourGrade, tourReady, tourCities }`).

```js
    _t: { tourGrade, tourReady, tourCities, CONCEPTS, conceptOf, trendMul, expectedSales },
```

- [ ] **Step 4: 초록불 + 회귀**

```bash
node tests/idol/concept-test.js
for t in tests/idol/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/idol/career.js
```
Expected: 전부 ok

- [ ] **Step 5: 변이 검증**

`SALES_K`를 `0.72` → `1.2`로 잠깐 바꾸고 `concept-test.js`를 돌린다.
**11·12·13번이 여전히 통과해도 괜찮다** (상대 비교라서). 대신 `expectedSales(보컬150…, 감성, 0, 0)`의
절대값을 한 번 출력해 계수가 실제로 반영되는지 눈으로 확인하고 되돌린다.
되돌린 뒤 전체 테스트를 다시 돌린다.

- [ ] **Step 6: 커밋**

```bash
git add beta/idol/career.js tests/idol/concept-test.js
git commit -m "feat(베타/아이돌): 컴백 컨셉 4종과 판매량 산식"
```

---

### Task 2: 시즌 유행 굴리기와 업계 소문

**Files:**
- Modify: `beta/idol/career.js` — `initActivity()` (현재 102행), `afterPrep()`의 컴백 롤오버 (현재 115~121행)
- Modify: `tests/idol/concept-test.js` (검사 추가)

**Interfaces:**
- Consumes: Task 1의 `CONCEPTS`
- Produces: `rollTrend()` → `{ hot, cold, rumor }`. `hot`/`cold`는 컨셉 id 문자열,
  `rumor`는 **컨셉 id 2개 배열이며 반드시 `hot`을 포함**한다. `_t`에 노출.
  컴백이 시작되면 `act.concept`은 `null`, `act.hot`/`act.cold`/`act.rumor`는 채워져 있다.

**설계 의도 — 이걸 어기면 기능이 죽는다:**
플레이어는 **고르기 전에 `rumor` 2종만 본다.** `hot`/`cold`는 고른 뒤에 공개된다.
소문 안에 진짜 유행이 반드시 들어 있어서 "반반 확률에 걸까"라는 판단이 성립한다.

- [ ] **Step 1: 실패하는 테스트 추가**

`concept-test.js`에 붙인다:

14. `rollTrend()`를 300회 굴려 `hot`·`cold`가 항상 `CONCEPTS`의 id다.
15. 300회 중 `hot`이 4종 전부 최소 한 번은 나온다 (한쪽으로 고정되지 않았다).
16. **300회 전부** `rumor`의 길이가 2이고, 두 값이 서로 다르고, `rumor`가 `hot`을 포함한다.
17. 300회 중 `rumor[0] === hot`인 경우와 `rumor[1] === hot`인 경우가 **둘 다 나온다.**
    (순서가 고정이면 첫 칸만 보고 정답을 알 수 있어서 소문이 무의미해진다.)
18. **게임 입구를 통해** 확인한다 — jsdom에 `beta/idol/index.html`을 띄우고
    `Career.showActivity()`로 진입, 🛌 휴식으로 연습 턴을 소진해 컴백이 시작되면
    `Career._t.state().activity`에 `hot`·`cold`·`rumor`가 있고 `concept`은 `null`이다.
    (`_t.state`가 없으면 여기서 같이 추가한다. `tests/idol/standings-test.js`가
    같은 방식으로 입구를 통해 도는 예시다 — 그 부트스트랩을 재사용한다.)
19. 첫 컴백이 끝나고 두 번째 컴백이 시작되면 `hot`·`cold`·`rumor`가 **다시 굴려지고**
    `concept`이 `null`로 돌아간다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/idol/concept-test.js
```
Expected: FAIL — `_t.rollTrend is not a function`

- [ ] **Step 3: 구현**

```js
/* 컴백마다 유행 하나, 식상 하나를 굴려요. 같은 게 뽑히면 상쇄돼서 배수가 안 붙어요.
 * rumor는 고르기 전에 보여줄 후보 2종이에요. 진짜 유행이 반드시 들어 있어서
 * 플레이어는 반반 확률에 걸지 말지를 판단하게 돼요.
 * 전부 공개하면 정답이 확정돼 고민이 사라지고, 전부 감추면 유행이 순수 운이 됩니다. */
function rollTrend() {
  const hot = CONCEPTS[randInt(0, CONCEPTS.length - 1)].id;
  const cold = CONCEPTS[randInt(0, CONCEPTS.length - 1)].id;
  let other;
  do { other = CONCEPTS[randInt(0, CONCEPTS.length - 1)].id; } while (other === hot);
  // 진짜 유행이 항상 앞에 오면 첫 칸만 보고 답을 알아요. 순서를 섞습니다.
  const rumor = Math.random() < 0.5 ? [hot, other] : [other, hot];
  return { hot, cold, rumor };
}
```

`randInt`의 상한이 포함인지 **반드시 소스에서 확인**하고 맞춰 쓴다.
포함이 아니면 하이틴이 절대 안 뽑힌다. 테스트 15번이 이걸 잡는다.

`initActivity()`:

```js
  function initActivity() {
    const tr = rollTrend();
    S.activity = {
      cb: 1, cbTotal: CB_PER_YEAR,
      week: 0, weekTotal: WEEKS_PER_CB,
      wins: 0, sales: 0, hypeSum: 0, cbHype: 0, cbWins: 0,
      concept: null, hot: tr.hot, cold: tr.cold, rumor: tr.rumor,
      rivals: rollRivals(),
    };
  }
```

`afterPrep()`의 롤오버:

```js
    else if (S.activity.week >= S.activity.weekTotal) {
      // 다음 컴백 시작 — 컨셉을 다시 고르고 유행도 새로 굴려요
      const tr = rollTrend();
      S.activity.cb += 1;
      S.activity.week = 0;
      S.activity.cbHype = 0;
      S.activity.cbWins = 0;
      S.activity.concept = null;
      S.activity.hot = tr.hot;
      S.activity.cold = tr.cold;
      S.activity.rumor = tr.rumor;
      S.activity.rivals = rollRivals();
    }
```

`_t`에 `rollTrend`와 `state: () => S`를 더한다.

- [ ] **Step 4: 초록불 + 회귀**

```bash
node tests/idol/concept-test.js
for t in tests/idol/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/idol/career.js
```

- [ ] **Step 5: 커밋**

```bash
git add beta/idol/career.js tests/idol/concept-test.js
git commit -m "feat(베타/아이돌): 컴백마다 시즌 유행·식상과 업계 소문 굴리기"
```

---

### Task 3: 컨셉 선택 화면 (소문만 보인다)

**Files:**
- Modify: `beta/idol/index.html` (새 화면 `screen-concept` 추가)
- Modify: `beta/idol/style.css` (`.concept-*` 클래스)
- Modify: `beta/idol/career.js` (`renderConcept()`, 음방 무대 라우팅 게이트)
- Modify: `tests/idol/concept-test.js`

**Interfaces:**
- Consumes: Task 1의 `conceptOf`/`expectedSales`, Task 2의 `act.rumor`/`act.concept`
- Produces: 화면 id `screen-concept`, 카드 클래스 `.concept-card`(각각 `data-cid` 속성),
  소문 배지 `.concept-rumor`

**절대 하면 안 되는 것:**
이 화면에서 `trendMul`을 부르지 않는다. `act.hot`/`act.cold`를 읽지도, 표시하지도 않는다.
**여기서 확정 유행이 새어 나가면 이 설계 전체가 무의미해진다.**
예상 판매량도 배수를 빼고 순수 기댓값(`expectedSales`)만 보여준다.

- [ ] **Step 1: 실패하는 테스트 추가**

**전부 게임 입구를 통해서만 검사한다.** 함수를 직접 부르지 않는다.

20. 컴백 시작 후 `renderPrep()` 화면에서 음방 무대 액션(`.go-game`)을 누르면
    `screen-concept`가 보이고 `screen-stage`는 안 보인다.
21. `.concept-card`가 4개다.
22. `.concept-rumor`가 붙은 카드가 **정확히 2개**이고, 그 `data-cid` 집합이 `act.rumor`와 같다.
23. **정보 누설 방지** — `screen-concept`의 `textContent` 전체에 `act.cold`의 컨셉 이름이
    (그게 `act.rumor`에 없는 한) 등장하지 않는다. `hot`을 가리키는 문구도 없다.
24. 각 카드의 예상 판매량 텍스트가 `expectedSales(...)`와 **정확히 일치한다**
    (배수가 곱해져 있으면 실패한다). **소스에서 뽑은 함수로 계산해 비교한다. 숫자를 적어두지 않는다.**
25. 카드를 클릭하면 `act.concept`이 그 카드의 `data-cid`가 된다.
26. 컨셉을 고른 뒤 다시 진입하면 **선택 화면을 건너뛴다.**
27. `act.concept`이 이미 있는 옛 세이브 상태로 진입하면 선택 화면이 안 뜬다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/idol/concept-test.js
```
Expected: FAIL — `screen-concept` 없음

- [ ] **Step 3: HTML**

`beta/idol/index.html`에서 `screen-stage` 바로 앞에 넣는다. 기존 화면들의
껍데기 구조(`<section class="screen" id="...">`)를 그대로 따른다.

```html
    <section class="screen" id="screen-concept" hidden>
      <h2 id="concept-title">🎬 컴백 컨셉 정하기</h2>
      <div class="concept-rumor-line" id="concept-rumor-line"></div>
      <div class="concept-list" id="concept-list"></div>
    </section>
```

- [ ] **Step 4: CSS**

`beta/idol/style.css` 끝에 붙인다. 이 저장소의 CSS는 러너가 못 잡으므로
기존 `.standings-box`·`.tour-*` 규칙의 색·간격 관례를 그대로 따라간다.

```css
.concept-rumor-line { text-align: center; margin: 8px 0 14px; font-size: 14px; opacity: .85; }
.concept-list { display: flex; flex-direction: column; gap: 10px; }
.concept-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: 2px solid rgba(255,255,255,.12); border-radius: 12px; cursor: pointer;
  background: rgba(255,255,255,.04); text-align: left; width: 100%; color: inherit; font: inherit; }
.concept-card:hover { border-color: rgba(255,255,255,.3); }
.concept-card .c-emoji { font-size: 26px; }
.concept-card .c-name { font-weight: 700; }
.concept-card .c-desc { font-size: 13px; opacity: .7; }
.concept-card .c-sales { margin-left: auto; font-weight: 700; white-space: nowrap; }
.concept-rumor { border-color: #c9a227; }
.concept-badge { font-size: 12px; padding: 2px 7px; border-radius: 999px; margin-left: 6px;
  background: #c9a227; color: #1c1503; }
```

- [ ] **Step 5: `renderConcept()`**

`beta/idol/career.js`에 넣는다.

```js
  /* 컴백 시작 전 컨셉 고르기 — 소문 2종만 보여줘요.
   * 확정 유행(act.hot)은 여기서 절대 읽지 않아요. 고른 뒤에 공개됩니다.
   * 예상 판매량에도 유행 배수를 얹지 않아요. 아직 확정이 아니니까요. */
  function renderConcept() {
    const act = S.activity;
    const rumor = act.rumor || [];
    const names = rumor
      .map((id) => CONCEPTS.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => `${c.emoji} ${c.name}`);
    $("concept-title").textContent = `🎬 ${S.proYear}년차 ${act.cb}차 컴백 — 컨셉 정하기`;
    $("concept-rumor-line").innerHTML = names.length === 2
      ? `🗣 업계 소문: 이번 시즌은 <b>${names[0]}</b> 아니면 <b>${names[1]}</b> 이 온대요`
      : `🗣 이번 시즌은 소문이 잠잠해요`;

    $("concept-list").innerHTML = CONCEPTS.map((c) => {
      const est = expectedSales(S.stats, c, S.fandom, act.cbWins);
      const isRumor = rumor.includes(c.id);
      return `<button class="concept-card ${isRumor ? "concept-rumor" : ""}" data-cid="${c.id}">
        <span class="c-emoji">${c.emoji}</span>
        <span><span class="c-name">${c.name}${isRumor ? `<span class="concept-badge">🗣 소문</span>` : ""}</span><br><span class="c-desc">${c.desc}</span></span>
        <span class="c-sales">~ ${est}만 장</span>
      </button>`;
    }).join("");

    $("concept-list").querySelectorAll(".concept-card").forEach((el) => {
      el.onclick = () => {
        S.activity.concept = el.dataset.cid;
        save();
        renderReveal();          // Task 4에서 만들어요
        show("screen-reveal");
      };
    });
  }
```

**Task 4를 아직 안 만들었다면** 이 단계에서는 `renderReveal()` 대신 무대로 바로 넘기고,
Task 4에서 두 줄을 바꾼다. 무대를 그리는 기존 함수의 **정확한 이름을 소스에서 확인**한다 —
음방 무대 액션이 지금 무엇을 부르는지 보고 그것과 같게 쓴다.

- [ ] **Step 6: 라우팅 게이트**

음방 무대 액션(`renderPrep()`의 `.go-game` 핸들러, 현재 207행 근처)이
무대를 그리기 전에 컨셉을 확인하게 한다.

```js
      if (!S.activity.concept) { renderConcept(); show("screen-concept"); return; }
```

**이 한 줄이 게이트 전부다.** 다른 진입 경로를 새로 만들지 않는다.

- [ ] **Step 7: 초록불 + 회귀**

```bash
node tests/idol/concept-test.js
for t in tests/idol/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/idol/career.js
```

기존 테스트 중 음방 무대로 바로 들어가던 것들이 깨질 수 있다.
**깨지면 그 테스트가 컨셉 화면을 통과하도록 고친다.** 게이트를 우회하게 고치지 않는다.

- [ ] **Step 8: 커밋**

```bash
git add beta/idol/index.html beta/idol/style.css beta/idol/career.js tests/idol/concept-test.js
git commit -m "feat(베타/아이돌): 컴백 컨셉 선택 화면 — 소문 2종만 보고 고르기"
```

---

### Task 4: 시즌 시작 — 유행 공개와 버프/너프

**Files:**
- Modify: `beta/idol/index.html` (새 화면 `screen-reveal`)
- Modify: `beta/idol/style.css` (`.reveal-*`)
- Modify: `beta/idol/career.js` (`renderReveal()`)
- Modify: `tests/idol/concept-test.js`

**Interfaces:**
- Consumes: Task 1의 `conceptOf`/`trendMul`, Task 2의 `act.hot`/`act.cold`
- Produces: 화면 id `screen-reveal`, 결과 박스 `#reveal-effect`,
  클래스 `.reveal-hit`(적중) / `.reveal-miss`(식상) / `.reveal-flat`(무난)

- [ ] **Step 1: 실패하는 테스트 추가**

게임 입구를 통해서만 검사한다.

28. 컨셉 카드를 클릭하면 `screen-reveal`이 보이고 `screen-stage`는 아직 안 보인다.
29. 고른 컨셉이 `act.hot`과 같으면(같도록 상태를 만든 뒤 진입) `#reveal-effect`에
    `.reveal-hit`이 붙고 텍스트에 `+18%`가 있다.
30. 고른 컨셉이 `act.cold`와 같으면 `.reveal-miss`가 붙고 `-15%`가 있다.
31. 둘 다 아니면 `.reveal-flat`이 붙고 `%` 표기가 없다.
32. `act.hot === act.cold`이고 그 컨셉을 골랐으면 `.reveal-flat`이다 (상쇄).
33. 공개 화면의 "시즌 시작" 버튼을 누르면 `screen-stage`로 넘어간다.

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/idol/concept-test.js
```

- [ ] **Step 3: HTML**

`screen-concept` 바로 뒤에 넣는다.

```html
    <section class="screen" id="screen-reveal" hidden>
      <h2 id="reveal-title">🎬 컴백 시작!</h2>
      <div class="reveal-trend" id="reveal-trend"></div>
      <div id="reveal-effect"></div>
      <button class="btn" id="btn-reveal-go">🎤 시즌 시작</button>
    </section>
```

- [ ] **Step 4: CSS**

```css
.reveal-trend { display: flex; gap: 14px; justify-content: center; margin: 10px 0 16px; font-size: 14px; }
#reveal-effect { border: 2px solid rgba(255,255,255,.15); border-radius: 12px;
  padding: 16px; text-align: center; margin-bottom: 16px; }
#reveal-effect .r-head { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
#reveal-effect .r-sub { font-size: 14px; opacity: .8; }
.reveal-hit { border-color: #ff8a3d; background: rgba(255,138,61,.12); }
.reveal-miss { border-color: #5b7bb5; background: rgba(91,123,181,.12); }
.reveal-flat { border-color: rgba(255,255,255,.15); }
```

- [ ] **Step 5: `renderReveal()`**

```js
  /* 컨셉을 고른 뒤 확정 유행을 공개해요. 여기서 처음으로 act.hot/act.cold를 보여줍니다.
   * 배수는 trendMul이 정본이에요 — 화면에서 다시 계산하지 않아요. */
  function renderReveal() {
    const act = S.activity;
    const c = conceptOf(act);
    const hot = CONCEPTS.find((x) => x.id === act.hot);
    const cold = CONCEPTS.find((x) => x.id === act.cold);
    const same = act.hot === act.cold;
    const mul = trendMul(c, act);

    $("reveal-title").textContent = `${c.emoji} ${c.name} 컨셉으로 컴백!`;
    $("reveal-trend").innerHTML = same || !hot || !cold
      ? `<span>이번 시즌은 뚜렷한 유행이 없었어요</span>`
      : `<span>🔥 유행 <b>${hot.emoji} ${hot.name}</b></span>
         <span>❄️ 식상 <b>${cold.emoji} ${cold.name}</b></span>`;

    const box = $("reveal-effect");
    if (mul > 1) {
      box.className = "reveal-hit";
      box.innerHTML = `<div class="r-head">🔥 트렌드 적중!</div>
        <div class="r-sub">이번 컴백 초동 판매량 <b>+18%</b></div>`;
    } else if (mul < 1) {
      box.className = "reveal-miss";
      box.innerHTML = `<div class="r-head">❄️ 한물간 컨셉…</div>
        <div class="r-sub">이번 컴백 초동 판매량 <b>-15%</b></div>`;
    } else {
      box.className = "reveal-flat";
      box.innerHTML = `<div class="r-head">🎬 무난한 시즌이에요</div>
        <div class="r-sub">유행을 타지도, 밀리지도 않아요</div>`;
    }
  }
```

`btn-reveal-go` 핸들러는 다른 버튼들과 같은 자리(파일 하단 이벤트 등록부)에 단다.
무대를 그리는 기존 함수를 부르고 `show("screen-stage")` 한다.

- [ ] **Step 6: 초록불 + 회귀**

```bash
node tests/idol/concept-test.js
for t in tests/idol/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/idol/career.js
```

Task 3에서 무대로 바로 넘겼다면 여기서 `renderReveal()` + `show("screen-reveal")`로 바꾼다.

- [ ] **Step 7: 커밋**

```bash
git add beta/idol/index.html beta/idol/style.css beta/idol/career.js tests/idol/concept-test.js
git commit -m "feat(베타/아이돌): 시즌 시작 시 유행 공개와 버프·너프 화면"
```

---

### Task 5: 컴백 내내 컨셉과 버프를 화면에 남기기

**Files:**
- Modify: `beta/idol/career.js` (`renderStage()` 헤더 — 현재 334행)
- Modify: `tests/idol/concept-test.js`

**Interfaces:**
- Consumes: Task 1~4 전부

- [ ] **Step 1: 실패하는 테스트 추가**

34. 무대 화면 `#stage-round` 텍스트에 고른 컨셉 이름이 들어 있다.
35. 유행에 적중한 상태로 무대에 들어가면 `#stage-round`에 `+18%`가 있다.
36. 식상이면 `-15%`가 있다. 무난하면 `%` 표기가 없다.
37. 컴백이 끝나면 결과 줄(`#cb-result`)에 컨셉 이름이 있다. (Task 1에서 이미 넣었다 — 확인만.)

- [ ] **Step 2: 빨간불 확인**

```bash
node tests/idol/concept-test.js
```

- [ ] **Step 3: 구현**

현재 334행:

```js
    $("stage-round").textContent = `W${act.week + 1}/${act.weekTotal} 음악방송`;
```

바꾼다:

```js
    const c = conceptOf(act);
    const mul = trendMul(c, act);
    const buff = mul > 1 ? " · 🔥 +18%" : mul < 1 ? " · ❄️ -15%" : "";
    $("stage-round").textContent = `W${act.week + 1}/${act.weekTotal} 음악방송 · ${c.emoji} ${c.name}${buff}`;
```

- [ ] **Step 4: 초록불 + 회귀**

```bash
node tests/idol/concept-test.js
for t in tests/idol/*.js; do node "$t" >/dev/null && echo "ok $t" || echo "FAIL $t"; done
node --check beta/idol/career.js
```

- [ ] **Step 5: 커밋**

```bash
git add beta/idol/career.js tests/idol/concept-test.js
git commit -m "feat(베타/아이돌): 무대 화면에 컨셉과 유행 버프 표시"
```

---

## 위험

- **Task 3에서 확정 유행이 새면 설계가 죽는다.** 선택 화면은 `act.rumor`만 읽어야 한다.
  테스트 23·24번이 이걸 잡는다.
- **Task 3의 게이트가 기존 테스트를 깬다.** 그게 정상이다. 게이트를 우회하도록
  고치면 기능이 죽은 채로 초록불이 뜬다 — 이 저장소에서 이미 겪은 실패다.
- **CSS는 러너 사각지대다.** 배포 후 실기기 확인이 필요하다.
- **`randInt`의 상한 포함 여부**를 확인하지 않으면 하이틴이 절대 안 뽑힌다.
  Task 2 테스트 15번이 이걸 잡는다.
- **저연차 곡선이 목표보다 후하다** (70에서 11%, 목표 5%). 이번 범위에서는 안 건드린다.
  실기기 확인 후 따로 본다.
