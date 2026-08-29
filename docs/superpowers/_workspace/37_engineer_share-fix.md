# 37 · engineer — `shareByWeight`를 같은 자로 (게이트 ①-G · G-4 선행)

designer 판정 3건을 받아 처리했습니다. **바꾼 것은 하나뿐이에요.**

| designer 판정 | 한 일 |
|---|---|
| ① `POS_AXIS`는 차단을 계속 본다 | **아무것도 안 했습니다.** 36번에서 안 건드린 게 맞았어요 |
| ② `shareByWeight`를 고쳐라 — 새 상수 없이 | **`engine.js` · `career.js` 정정** ← 이번 범위 |
| ③ 컵 무실점은 센다 | **그대로 뒀습니다.** 36번에서 넣은 한 줄 유지 |

계수는 이번에도 **한 개도 안 바꿨습니다** (`BIG_BASE` · `ASSIST_P2` · `NPC_SPOT` · `SPOT` · `POS_AXIS` 전부 그대로).
`beta/soccer/`는 안 건드렸고, 커밋 안 했습니다.

---

## ② `shareByWeight` — pBig으로 전개/결정을 사후 재구성

### 무엇이 문제였나 (36번에서 보고 → designer가 성질을 다시 봄)

리그 6팀이 라운드마다 **세 갈래**로 나뉩니다. 내 클럽은 카드(`createMatch`), 다른 4팀은
`autoMatch`, 그리고 **내 경기의 상대 클럽 한 팀**만 `shareByWeight`예요.
G-3으로 앞의 둘을 맞췄더니 세 번째만 `ASSIST_P2` 고정(0.75)으로 남았습니다.

designer가 짚은 결정타 — 이건 **계통 오차**입니다. 이 길로 가는 클럽은 무작위로 뽑히는 게
아니라 **언제나 내 상대**예요. 즉 *"내 상대 클럽 선수만 구조적으로 도움이 덜 나온다"*가 되고,
경기 수를 늘려도 평균으로 안 씻깁니다.

### 어떻게 고쳤나 — **새 상수를 들이지 않았습니다**

개별 골이 🅰️ 전개에서 났는지 ⚽ 결정에서 났는지는 여기서 알 수 없습니다(스코어만 넘어와요).
**하지만 분포는 엔진이 이미 압니다** — STEP 2의 `pBig = BIG_BASE × edge`가 그 값이에요.
골마다 그 확률로 굴려 사후에 나눕니다.

```js
const pBig = clamp(BIG_BASE * ((atkW == null ? 0.5 : atkW) / 0.5), 0, 1);
…
const big = chance(pBig);
const { who } = pickActor(xi, big ? "goal" : "assist", hits);
if (big) { /* ⚽ 결정 — 주인공이 넣고 ASSIST_P2로 도움자 지명 */ }
else     { /* 🅰️ 전개 — 주인공이 도움, 마무리는 `g` 무게로 나머지에서 */ }
hits.set(scorer, (hits.get(scorer) || 0) + 1);   // 🥵 fatigue는 넣은 사람에게
```

`autoMatch`·`createMatch.autoAttack`과 **줄 대 줄로 같은 모양**입니다.
🧱 `"defend"` 갈래는 손대지 않았어요 — 차단 한 명만 뽑고 fatigue도 안 올립니다(예전 그대로).

### 🔴 `atkW`를 한 개 넘기게 했습니다 — 이유가 실측에 있어요

`shareByWeight(xi, count, kind, atkW)`. **네 번째 인자는 선택**이고, 없으면 0.5(대등한 두 팀)입니다.
호출부(`career.js` `recordRound`)가 순위표 행의 전력으로 `op.str / (op.str + me.str)`을 넘겨요.

인자를 늘린 게 최소 개입 원칙에 걸려서 **안 넘기면 어떻게 되는지 실측했습니다** —
`autoMatch`가 같은 클럽·같은 전력에서 내는 도움÷골과 대조(각 3만 경기):

| 전력 | `autoMatch` | ③ **atkW 넘김** | ③ 안 넘김(0.5 고정) |
|---|---|---|---|
| 70:70 | 0.881 | 0.888 (**+0.75%**) | 0.888 (+0.75%) |
| 85:55 | 0.858 | 0.864 (**+0.69%**) | 0.888 (**+3.46%**) ❌ |
| 55:85 | 0.907 | 0.912 (**+0.50%**) | 0.888 (−2.16%) |
| 95:45 | 0.843 | 0.847 (**+0.49%**) | 0.888 (**+5.36%**) ❌ |

**전력이 기울면 안 넘긴 쪽이 inspector 27번의 3% 문턱을 넘어갑니다.**
그리고 이 자리는 언제나 내 상대라, 강한 팀과 붙는 커리어일수록 그 치우침이 한 방향으로 쌓여요.
`atkW`는 새 상수가 아니라 **호출부가 이미 가진 값**이라 넘기는 쪽을 택했습니다.

### ⚠️ 설계와 다르게 한 것 — 없습니다. 다만 하나가 덜 옮겨졌어요

`isBig`은 `BIG_BASE × edge × **urgency** × (clutch ? CLUTCH : 1) × condMul`입니다.
`urgency`(뒤지면 찬스가 는다)와 추가시간 가중은 **그 시점 스코어를 봐야** 아는 값인데,
`shareByWeight`에는 최종 스코어만 넘어옵니다. 그래서 **`BIG_BASE × edge`까지만** 씁니다
(designer가 지정한 형태 그대로예요). 그만큼 결정 쪽이 아주 조금 낮게 잡혀서
③이 ②보다 도움÷골이 0.5~0.8% 높습니다 — 위 표의 잔차가 그거예요. 소스에 주석으로 남겼습니다.

---

## 🔬 세 갈래가 같은 자를 쓰나 — inspector 27번이 지킬 값

전력 70:70 · 각 2만 경기 · 시드 3.

| | 도움 ÷ 골 |
|---|---|
| ① 카드 (`createMatch`) | **0.877** |
| ② `autoMatch` | **0.879** |
| ③ `shareByWeight` | **0.887** |
| **세 갈래 최대 차** | **1.13%** (문턱 ≤3%) ✅ |

### 변이 검증 — 되돌리면 빨간불이 뜹니다 (원칙 ⑩)

③의 `const big = chance(pBig)`를 `const big = true`로 되돌려(= 모든 골을 결정 출신으로,
고치기 전과 같은 동작) 다시 쟀습니다:

| | 도움 ÷ 골 |
|---|---|
| ① 카드 | 0.877 |
| ② `autoMatch` | 0.879 |
| ③ `shareByWeight` (변이) | **0.748** ← `ASSIST_P2` 값 그대로 |
| **최대 차** | **17.59%** ❌ |

**1.13% ↔ 17.59%.** 3% 문턱이 통과도 하고 잡아내기도 합니다 — 여유가 크게 남아요.

> inspector께: 27번을 이 모양으로 잡으시면 됩니다. 변이는
> `/const big = chance\(pBig\);\n      const \{ who \} = pickActor\(xi, big \? "goal" : "assist", hits\);/`
> → `const big = true;` + `pickActor(xi, "goal", hits)`로 걸립니다. `_load.js`의 `muts`에 그대로 넣으면 돼요
> (**`_load.js`는 제가 안 건드렸습니다** — 임시 스크립트에서 확인만 했어요).
> **③은 `E.shareByWeight`로 바로 부를 수 있습니다** — `_t`를 안 거쳐도 공개 API예요.
> ①은 `playMatch`의 `cards`에서 `goalBy`/`assistBy`로 세면 카드 갈래만 걸러집니다.

---

## G-4를 위한 참고치 — **재지는 않았습니다**

실게임(JSDOM으로 게임 입구를 통해 12라운드 완주 · 한 시드)에서 리그 전체:

```
골 58 · 도움 52 · 도움÷골 0.897
```

표본이 작고 시드가 하나라 **판정이 아니라 방향 표시**입니다. G-4 밴드가 0.70~0.80이니
`ASSIST_P2`(현재 0.75)를 내리는 방향이 될 것 같아요 — **손대지 않았습니다.** balancer 몫입니다.

⚠️ G-4를 잴 때 알아야 할 것: 이제 도움÷골이 `ASSIST_P2`와 **같지 않습니다.**
`P(전개 출신) × 1 + P(결정 출신) × ASSIST_P2`예요. `ASSIST_P2`를 1%p 내려도
도움÷골은 약 0.5%p만 움직입니다 — 손잡이의 감도가 절반쯤으로 줄었어요.
`BIG_BASE`를 올리면 결정 비중이 늘어 도움÷골이 내려가지만, **`BIG_BASE`는 카드 빈도와
빅찬스 곡선을 통째로 옮기니** G-4의 손잡이로는 `ASSIST_P2`가 맞습니다(설계 지정 그대로).

---

## ① `POS_AXIS` — 안 건드렸습니다

designer 판정을 받아 `posAxis`의 `a.defense`(차단)를 그대로 뒀습니다.
`POS_AXIS.df.n = 0.816`도 그대로예요. G-6은 재산정이 아니라 회귀 확인이라고 이해했습니다.

inspector 28번(*"`posAxis`가 차단을 본다"*)이 이 자리를 못박아 주면 좋겠어요 —
지금은 소스에 그렇게 되어 있을 뿐, 검사가 지키고 있지 않습니다.

## ③ 컵 무실점 — 그대로 뒀습니다

`cupFinalize`의 `if (!info.oppGoals) act.cs = (act.cs || 0) + 1;` 유지.
36번에 적었던 *"한 줄만 지우면 됩니다"*는 **철회합니다** — 무실점만 빼면 철벽상 하나만
다른 규칙이 되고, 그게 designer가 지적한 그대로예요.

G-8(컵이 아직 v1 `deriveOppGoals`를 쓰는 문제)은 **재기만** 하라고 하셔서 손대지 않았습니다.
balancer가 잴 때 필요한 자리를 적어 둡니다 —

- 컵 실점: `career.js`의 `deriveOppGoals(rating, S.stats.defense, opp.str, c.g + c.a + mates)`
- 리그 실점: 카드 엔진의 `pConcede(defW, ability)` — 내 🧱 수비 카드가 직접 문턱을 옮겨요
- 비교할 값: **무실점 비율**(경기 중 `oppGoals === 0`의 비). 리그 쪽 참고치는 36번 표에 있습니다
  (능력치 110 df에서 10.7/38 ≈ **28%**)
- 시즌당 컵 경기 수는 `cupRounds()`가 정합니다 — 그만큼이 `act.cs`에 섞여요

---

## 이번에 바꾼 파일

| 파일 | 무엇 |
|---|---|
| `beta/winger2/engine.js` | `shareByWeight`에 pBig 갈래 + `atkW` 인자(선택) · 주석 |
| `beta/winger2/career.js` | `recordRound`의 호출부가 `op.str/(op.str+me.str)`을 넘김 |

`shareByWeight`의 호출부는 저장소에 **이 둘뿐**입니다(`grep`으로 확인).
`tests/winger2/engine-test.js:61`이 3인자로 부르는데, 4번째가 선택이라 그대로 돕니다.

## 검사

| | |
|---|---|
| `tests/winger2/` 4종 | **전부 초록불** |
| `node tests/smoke-test.js beta` | 9종 ✅ |
| `node tests/check-page-test.js` | ✅ |
| G-5 실게임 확인(12라운드 완주) | ✅ 12항목 전부 — 36번과 같은 결과 |

**여전히 `tests/winger2/`는 이번 변경을 하나도 안 봅니다.** 세 갈래 대조(27번)가 없으면
`shareByWeight`를 통째로 되돌려도 초록불이에요. inspector 작업을 기다립니다.

## ⚠️ 저장소 상태

`git status`에 제가 안 건드린 파일이 떠 있습니다 — **다른 세션 작업이라 손대지 않았습니다.**

```
M .claude/agents/grow-engineer.md
M CLAUDE.md
M docs/superpowers/_workspace/13_designer_v2-final.md   ← designer가 §2-8b 정정 중
?? .gitignore · ?? scripts/shoot.js
```

제가 바꾼 것은 `beta/winger2/{engine,career,game,squad}.js` 넷과
`docs/superpowers/_workspace/3{6,7}_engineer_*.md` 둘뿐입니다.
