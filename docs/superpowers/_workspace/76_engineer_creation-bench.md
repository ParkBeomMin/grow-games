# 구현 — ⚽ 더 윙어 II · 🧬 선수 만들기(조립대)

2026-08-30 · grow-engineer
입력: `74_designer_player-creation.md` (개정판 · ③-C · ④-B) · `75_balancer_creation-sim.md` ·
`73_director_prospect-card.md` · 조율자 지시 2건(정책 보류 → 확정)

> **엔진·곡선·등급 7단계·`SAVE_KEY`·세이브 스키마는 한 줄도 안 건드렸습니다.**
> 바뀐 건 **「같은 생성기를 어떻게 보여주고 어떻게 다시 굴리게 하는가」**뿐이에요.

건드린 파일: `beta/winger2/prospect.js` · `game.js` · `index.html` · `style.css`
⚠️ **커밋하지 않았습니다.** `beta/winger2/focus.js`(미완성 고아 파일)는 안 건드렸어요.

---

## 1. 무엇을 했나 — designer 순서 2·3·4

| # | 무엇 | 상태 |
|---|---|---|
| **2** | 🧬 조립대 화면 (3택 → 한 명) | ✅ |
| **3** | 🎲 **♾️ 무제한** 다시 뽑기 + 📊 「지금 ↔ 표준」 2열 시트 | ✅ |
| **4** | ✏️ 이름·🦶 주발을 **흐름의 맨 앞**으로 | ✅ |
| — | 🎲가 🎁를 굴리던 **배선 끊기**(`rollTalents`) | ✅ |
| ~~5~~ | 📏 키 · `HEIGHT_SHAPE` · 셋 잠금 | **안 했습니다** (자리만 비워 뒀어요) |
| ~~3-B~~ | ⭐ 잠재력 총합 고정 | **안 했습니다** (실측 D″ 뒤 · 곡선을 흔드는 변경은 한 번에 하나씩) |

### 정책 갈아끼움 이력 (같은 세션 안에서 두 번 바뀜)

`예산 2 + ↩️ 되돌리기` → **`♾️ 무제한 + 되돌리기 없음`**.
되돌리기 코드와 `UNDO_ON` 플래그는 **남기지 않고 지웠습니다** — designer 판정이 확정이라
쓰지 않는 분기를 남기면 그게 다음 사람에게 *"고를 수 있는 정책"*으로 읽힙니다.
되돌아갈 필요가 생기면 `REROLL_MAX`가 유한값을 받는 자리로 그대로 남아 있어요
(`render()`의 `Number.isFinite(REROLL_MAX)` 갈래 + `.pb-pip` ●○ 렌더가 **살아 있습니다**).

---

## 2. 흐름이 바뀌었습니다

```
전:  타이틀 → 🏟️ 유스 → 🎯 포지션 → 🌱 유망주 3택 → ✏️ 이름·🦶 주발(입단하기) → 메인
후:  타이틀 → ✏️ 이름·🦶 주발(다음) → 🏟️ 유스 → 🎯 포지션 → 🧬 조립대(이 선수로 시작) → 메인
```

**이름이 먼저 붙은 뒤에 몸을 굴려야 「내 선수의 몸」이 됩니다**(74번 「위험」의 마지막 줄).

| 자리 | 전 | 후 |
|---|---|---|
| 타이틀 `btn-new` | `renderMarkets()` + `screen-agency` | `screen-name` (이름 칸을 기본값으로 채움) |
| `renderMarkets()` 호출 | `btn-new` | **`btn-name-next`** |
| 입단 실행 | `btn-start`(이름 화면) | **`startCareer()`** — 조립대 `btn-prospect-start`가 부름 |
| `btn-back-first`(유스) | 타이틀 | **이름 화면** |
| `btn-back-name` | 유망주 화면 | **타이틀** |
| 🎲 랜덤 이름 | `randomPlayerName(chosenMarket)` | `randomPlayerName(null)` — **유스를 아직 안 골랐어요** |

⚠️ `screen-prospect`·`screen-name`의 **id는 그대로**입니다 (`BACK_SAFE`·`show()`가 가리켜요).
화면의 성격만 「유망주 3택」 → 「선수 만들기」로 바뀌었습니다.

---

## 3. `prospect.js` — API가 바뀌었습니다

| 사라짐 | 대신 | 왜 |
|---|---|---|
| `rollCards(marketId, pos)` | **`rollBuild(marketId, pos)`** | 3택 폐기. 한 명만 만듭니다 |
| `CARDS = 3` | — | 〃 |
| `cardName()` | 이름 화면의 🎲 | 한 명이라 중복 방지가 필요 없어요 |
| — (없던 것) | **`rollShape(marketId, pos)`** | 📊 배분 한 벌 — **🎲가 굴리는 유일한 것** |
| `rollTalents`가 `rollCards` **안** | **`rollTalents`를 밖으로 · `open()`에서 한 번** | 🔴 **새던 자리** |
| — | **`evenStats()`** | 📊 「표준」 — 총합 194를 고르게 나눈 자 |
| `REROLL_MAX = 2` | **`REROLL_MAX = Infinity`** | designer 판정 ③-C |
| `setIdx` · `bindSwipe` · `TONE`/`MARK` · 점·화살표 | `bindDragGuard()` | 선수가 하나라 넘길 게 없어요 |

```js
window.WingerProspect = {
  …,
  rollShape, rollBuild, rollTalents, applyCard, open,
  POOL, REROLL_MAX, evenStats,
  _t: { spread, pickW, pieceAt, trainStep, TRAIN_NEUTRAL, YOUTH_FOCUS, STAT_LO, STAT_HI, state },
}
// open(market, pos, { name, foot }, onPick(build, talents, used), onBack)
// _t.state() → { market, pos, who, talents, build, used, onPick }   ← `cards`가 없습니다
```

### 🎲가 굴리는 것 / 안 굴리는 것

```
🎲 doReroll()  →  rollShape()  →  build.stats · build.shapeKey        ← 이게 전부입니다
🔒 안 굴림      →  talents · growthType · hint · trait · flaw · age
```

`applyCard(st, card, rerolls)`의 **인자 모양·세이브 필드는 그대로**입니다
(`S.age` `S.growthType` `S.peakShift` `S.flaw` `S.traits` `S.traitSlots` `S.rerolls` `S.lowApps` `S.hotRun`).
**새 필드 0개 · 마이그레이션 없음.** `S.rerolls`만 값의 범위가 넓어졌어요(무제한이라).

### 분포는 그대로입니다 (3장 → 1명으로 줄여도 주변분포가 안 변합니다)

| 축 | 전 (3장) | 후 (1명) | 결과 |
|---|---|---|---|
| 🗣️ 코멘트 | 카드마다 다른 힌트 + 셔플 | `pick(HINTS)` 균등 | 성장타입 주변분포 **34.4 / 31.1 / 34.4로 동일** |
| 편중 스탯 | 6칸에서 비복원 3개 | `pick(6칸)` | 균등 동일 |
| ⭐ 특능 · 🩹 결함 | 비복원 3개 | `pick()` | 균등 동일 |

---

## 4. 남긴 클래스 이름 — **director가 이어받는 자리**

```
#prospect-body.card.pbench[aria-live=polite]
 └ .pb-head            → .pc-silhouette.hair-N · .pc-id > .pc-name · .pb-meta
 └ .pb-slot.pc-now      [data-slot="1"] → .pc-cap · .pc-radar-box > canvas.pc-radar (300×260)
 └ .pb-slot.pc-grades   [data-slot="2"] → .pcg-cap · .pcg-row(.is-top) > .pcg-name · .pcg-star
                                          · .stat-grade · .pcg-bar > .pcg-fill · .pcg-val
 └ .pb-slot.pb-gift     [data-slot="3"] → .pcg-cap > .pb-lock · .pc-hint · .pc-trait · .pc-flaw
#prospect-budget.pb-budget → .pb-bud-lab · .pb-pips > .pb-pip(.on) · .pb-bud-note
#prospect-sheet.pc-sheet   → .pcs-panel > .pcs-head · #prospect-compare · #prospect-talent
                              · .pc-tools > #btn-sheet-reroll · #btn-sheet-keep
버튼: #btn-prospect-reroll · #btn-prospect-compare · #btn-prospect-start · #btn-back-prospect
```

- 🎬 **`.pb-slot`이 「0.6초씩 순서대로 굴러 채워지는」 자리**예요(`data-slot` 순서).
  지금은 **자리 표시만** 했습니다 — 연출과 `prefers-reduced-motion` 갈래는 director 몫입니다.
- 📏 **키는 `.pb-meta`(🔒 잠긴 사실 줄)에 `🎂 17세` 옆으로 합류합니다.** 지금은 나이·주발만 있어요.
- `.pb-pip` ●○은 **예산이 유한할 때만** 그려집니다. 지금(무제한)은 안 나와요 — CSS는 살아 있습니다.
- 🖐️ 12px 드래그 문턱은 `#screen-prospect` 전체에 한 번 겁니다(`bindDragGuard`) —
  좌우 스와이프는 사라졌지만 **세로 스크롤**이 있어서 그대로 남겼어요.
- 🎲는 `click`에서만 화면을 갈아치웁니다(`pointerdown` 금지 — 원칙 ⑥).

**살려 쓴 것**: 잠재력 바(`.pcg-fill` · 값 ÷ 54 절대 자) · 캡션 `🌱 출발점 …` ·
⭐ 강조(`.is-top`) · 레이더 300×260 `max: 44` · 등급 6줄 `W2Grade` · `.pcs-*` 시트 골격.
**버린 것**: 스와이프 · `●○○`(`.pc-dot`) · ‹ ›(`.pc-arrow`) · `.prospect-grid` 캐러셀 ·
`.pc-mark`/`.pc-tap` · `.pick-recap`.

---

## 5. 직접 잰 것

| 무엇 | 결과 |
|---|---|
| `rollShape` **10만 회** 총합 | **194 하나뿐 · 194가 아닌 비율 0.0000%** |
| 게임 입구를 통해 🎲 **300번** | 총합 전부 194 · 서로 다른 모양 300/300 · `used` 300 |
| 그 300번 동안 🔒 | `talents` · `growthType` · `hint` · `trait` · `flaw` **한 글자도 안 바뀜** |
| 📊 표준 | `{33,33,32,32,32,32}` = **194** (자가 굴림과 같은 총합) |
| 시트 | 2열(`🧒지금` · `📊표준`) · 7행 · 시트 안 🎲는 **시트를 연 채** 다시 그림 |
| 입단 | `S.name` `S.foot.main` `S.age 17` `S.rerolls` `Σstats 194` · `__errs` 0건 |
| `smoke-test beta` | 9/9 ✅ |
| `check-page-test` | ✅ 전부 통과 |

---

## 6. 🔴 inspector에게 — **검사가 없는 자리 셋** (원칙 ⑩)

원칙 ⑩대로 넣은 것을 되돌려 봤습니다. **셋 다 아무도 안 잡습니다.**

| 변이 | 무엇을 깼나 | 잡히나 |
|---|---|---|
| **M1** | `spread(POOL + rand(-18,18), …)` — **총합 고정을 깸** | 🔴 **9개 검사 전부 기준선과 동일** |
| **M2** | `doReroll()`에 `draw.talents = rollTalents(draw.pos)` 추가 — 🎲가 **잠재력까지** 굴림 | 🔴 **안 잡힘** |
| **M3** | `doReroll()`에 `draw.build.growthType = pick(GROWTH_TYPES).id` 추가 | 🔴 **안 잡힘** |

> ⚠️ **M1이 특히 큽니다.** 무제한 굴림에서 **총합 고정이 유일한 브레이크**인데
> 지금 그걸 지키는 검사가 **한 줄도 없습니다.** 옛 A-1(*"세 장의 총합이 같다"*)이
> `rollCards`와 함께 죽었고, 그 자리를 대신할 검사가 아직 없어요.
>
> **총합은 소스에서 읽지 말고 검사에 `194`를 직접 적으세요** — designer/조율자 지시입니다.
> 제안: `rollShape` 10만 회 → 전부 194. 변이는 `POOL` 194 → 200 · `if (!room.length) break;` 제거.

### 그리고 **어긋난 검사 둘 — 저는 안 고쳤습니다**

지시대로 손대지 않았습니다. **구현자가 검사를 고치면 「초록불인데 아무것도 안 지키는」 상태가 됩니다.**

**① `tests/winger2/prospect-test.js` — exit 2 (죽음)**

```
❌ 0. 변이 정규식 15개 중 안 걸린 것 2개
   · REROLL_INF      → /const REROLL_MAX = 2;/           (지금 `= Infinity`)
   · CARD_AGE_SPREAD → / {6}const age = CARD_AGE;/       (3장 루프가 사라져 들여쓰기 4칸)
💥 TypeError: Pr.rollCards is not a function   (prospect-test.js:137 · sumsOf)
```

| 검사 | 무엇을 재고 있었나 | 새 세계에서 |
|---|---|---|
| A-1 | 세 장의 총합이 **서로 같다** | 🔴 **「총합이 정확히 194」로 다시 겨눠야 합니다** (M1이 이 자리) |
| A-2 | ⭐ 잠재력을 세 장이 공유 | ♻️ **「🎲 전후로 `talents`가 같은 객체」**로 (M2가 이 자리) |
| A-3 | 세 장의 분포가 서로 다르다 | ♻️ **「🎲를 N번 굴리면 모양이 매번 다르다」**로 |
| 42 / 42-2 | 1000판 × 3장이 전부 17세 · 총합 하나 | ♻️ `rollBuild` N회로 (`c.age`는 그대로 `CARD_AGE`) |
| C-1~C-6 · C-변이 | 🎲 리롤 **상한 2회** | 🔴 **세계가 뒤집혔습니다** — 이제 **무제한이 설계**예요. `disabled`를 지키던 검사가 **거꾸로** 됩니다 |
| H-1 | `REROLL_MAX: 2` | 🔴 **`Infinity`로** (그리고 왜 안전한지 근거를 옆에 — 총합 고정) |
| 0번 변이표 | 위 정규식 2개 | 🔴 다시 겨눠야 안 도는 상태가 풀립니다 |

⚠️ **C 절은 「값이 바뀐 것」이 아니라 「어느 세계의 문장인지」가 바뀐 자리입니다.**
*"상한이 이 기능의 절반"*이라고 적혀 있는데, designer 판정이 **정확히 그 문장을 뒤집었어요** —
브레이크가 **횟수가 아니라 총합**입니다. 값만 바꾸면 검사가 옛 계약을 지킵니다.

**② `tests/winger2/grade-test.js` — exit 2 (죽음)**

```
💥 Error: 누를 버튼이 없어요 — 화면이 예상과 달라졌습니다
   grade-test.js:154  toProspect() → D.querySelector("#agency-list button, …")
```

| 줄 | 지금 | 왜 어긋났나 |
|---|---|---|
| `toProspect` (154) | `btn-new` → `#agency-list button` → `[data-pos]` | 🔴 **`renderMarkets()`가 `btn-name-next`로 옮겨가** `#agency-list`가 비어 있습니다. `btn-new` → **`btn-name-next`** 한 단계를 끼워 주세요 |
| `toMain` (160) | `.prospect-card[idx]` → `btn-start` | 🔴 둘 다 없습니다 → **`btn-prospect-start`** 하나로 끝납니다 |
| `drawProbe` (498~) | `.prospect-card` 3장 · `_t.state().cards` | 🔴 `cards`가 없습니다 → **`_t.state().build`** 한 명 |
| E-2 (allSame < 40%) | *"세 장이 전부 같은 글자로 깔리는 판"* | 🔴 **선수가 하나라 성립하지 않습니다.** 세계가 바뀐 자리예요 — E-1(등급이 `build.stats`와 맞는가)과 `MUT.CARD_SHOWN` 변이는 **그대로 유효**합니다 |

⚠️ **`const g = W2Grade.of(card.stats[d.key]);`는 글자 그대로 남겼습니다** — `MUT.CARD_SHOWN` 정규식이 그대로 걸립니다.

**🚧 그리고 74번이 짚은 「검사가 없는 자리」는 아직 그대로입니다** —
*"화면이 수치를 말하면 그 수치를 읽는 코드가 있어야 한다"*. ①-1(`42ea10d`)로 문구는 고쳤지만
그걸 지키는 검사는 없습니다. `S.traits`·`S.flaw`는 여전히 **커리어 한 벌 동안 읽기 0회**예요.

---

## 7. designer / balancer에게

- ✅ **`POOL = 194` 고정을 지켰습니다.** `spread()`는 총합을 **첫 인자로 받으니**,
  💥 대박이 총합을 흔드는 형태로 확정되면 `rollShape` 한 줄만 바뀝니다.
- 🔴 **⭐ 잠재력 총합 고정(3-B)은 손대지 않았습니다.** `rollTalents`는
  `rand(0.8,1.45) + legacy` · `t[주스탯] ≥ 1.05` 그대로예요 —
  하한·바닥·`talentStars` 눈금이 **한 벌**이라 실측 D″ 없이는 못 움직입니다.
- ⚠️ **💥 대박의 인지 장치가 지금은 📊 시트뿐입니다.** 「지금 ↔ 표준」 표에서
  *"표준보다 긴 칸이 있으면 그만큼 다른 칸을 내준 것"*이라고 캡션이 말합니다.
  ⭐ 잠재력 총합 고정이 들어오면 **시트에 ⭐ 줄이 하나 더 필요**할 것 같습니다 — 그건 designer 판정입니다.
- 🟡 **`S.rerolls`의 범위가 넓어졌습니다** (무제한이라 300도 들어갑니다).
  지금 이 값을 읽는 코드는 없지만, *"몇 번 굴려 만든 선수인가"*를 어디선가 쓰게 되면
  **상한 없는 수**라는 걸 알고 쓰세요.

## 8. 안 한 것

| 안 한 것 | 왜 |
|---|---|
| 📏 키 · `HEIGHT_SHAPE` · 🎯 포지션 순서 이동 | 이번 범위 밖(5번). `.pb-meta`에 자리만 비워 뒀습니다 |
| ⭐ 잠재력 총합 고정 | 실측 D″ 전. **곡선을 흔드는 변경은 한 번에 하나씩** |
| ⭐ 특능 엔진 · 🎁를 🎲 대상에 | 이번 범위 밖(6번) |
| 🔥 트라이아웃 | 이번 범위 밖 |
| 어긋난 검사 둘 고치기 | 🔴 **구현자가 고치면 안 되는 자리**입니다 (위 §6) |
| `UNDO_ON` 같은 정책 분기 남기기 | 판정이 확정이라 **쓰지 않는 분기를 안 남깁니다.** 되돌아갈 자리는 `REROLL_MAX`의 유한 갈래로 살아 있어요 |
| 🎬 슬롯 굴림 연출 | director 몫 — `.pb-slot[data-slot]`만 남겼습니다 |
