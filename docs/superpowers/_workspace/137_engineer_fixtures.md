# 구현 — 🧰 픽스처 생성기 되살리기 + 🗣️ 🎯 자리 화면 문구

2026-09-03 · grow-engineer
입력: `136_inspector_arc4.md` §5 · §11 · §13 · `tests/winger2/bench-test.js` **G-0 · G-1**

> 🔴 **커밋 안 했습니다.**
> ⚠️ `git status`의 `beta/winger2/focus.js`는 **남의 것(추적 안 되는 새 파일)**이라
> 손대지도, 커밋에 넣지도 않았습니다.
> 🔒 **`tests/` 0줄 · `engine.js` 0줄 · `prospect.js` 0줄 · `intro.js` 0줄 · 다른 7종 0줄.**
> 🔒 확정 계수(`CHILD_CAP_STEP 1.5` · `raceTop`의 `&& r.v > 0` · `TAL_SHIFT`·`GROW_TILT`·
> `FOCUS_W_HELD`)는 **한 글자도 안 건드렸습니다.**

---

## 0. 요약

| | |
|---|---|
| **①** | ✅ **`bench-test` G-1 초록불** — `newPlayer()`가 🦶 주발 · 🗺️ 동네 · 🧒 어린 시절 네 해를 지납니다 (§1) |
| **②** | ✅ **파일 전체 async 전환은 안 했습니다.** 🧒 620ms **그 구간만** 타이머를 즉시 실행으로 바꿨어요 — 근거는 §1-2 |
| **③** | ✅ **다른 7개 게임 안 깨졌습니다** — soccer · idol · rookie 픽스처 재생성 결과 §2 |
| **④** | 🔴 **`winger2-bench`는 아직 안 뽑힙니다 — 뿌리가 다릅니다** (흐름이 아니라 **밸런스**). 판단이 필요해서 **안 고치고 적습니다** (§3) |
| **⑤** | 🚨 **픽스처를 다시 뽑으면 `town-test` T-3a~d가 빨간불이 됩니다** — 그 검사가 **「낡은 픽스처」를 옛 세이브 표본으로** 쓰고 있어요 (§4). **`tests/` 금지라 적기만 합니다** |
| **⑥** | ✅ **문구 고쳤습니다** — 주인을 `goPosition()` 하나로 모았습니다 (§5). 정확한 문장은 §5-1 |
| **⑦** | 🟡 **`focus.js`는 안 건드렸습니다** — 남의 파일이라 배선도 `sw.js`도 손 안 댔어요 (§6) |
| **⑧** | ✅ **되돌려 빨간불 확인** (§7) · 🧪 **`tests/winger2/` 33종 전부 초록불** (§2-3) |

---

## 0-1. 고친 파일 — **셋뿐입니다**

| 파일 | 무엇 | 줄 |
|---|---|---|
| `scripts/make-fixtures.js` | `newPlayer()`가 🦶·🗺️·🧒를 지납니다 · `fastEcho()` 신설 · 옛 주석 다시 쓰기 | +77 −13 |
| `beta/winger2/game.js` | `position-hint` 문구를 **`goPosition()`으로 옮기고** 사실을 고침 | +11 −3 |
| `beta/winger2/town.js` | **주석만** — 단계 표의 🎯 자리 순서가 옛말이었어요 (원칙 ⑨) | +9 −2 |

⚠️ **`scripts/`는 공유 폴더**라 `newPlayer()` 한 함수와 그 바로 위 헬퍼 하나로 끝냈습니다.
다른 게임의 생성 경로에는 **한 줄도 안 넣었어요** (§1-3).

---

## 1. 🧰 `scripts/make-fixtures.js` — `newPlayer()`

### 1-1. 무엇이 바뀌었나

`newPlayer()`가 **2026-09-03 흐름**을 그대로 걷습니다:

```
btn-new → (이름) btn-name-next
  → 🦶 #screen-foot .foot-card[data-foot="R"] → btn-foot-next
  → 🗺️ #origin-cities .om-city[data-id="seoul"] → btn-origin-next
  → 🧒 #screen-child  .card[data-child="ball"]
     #screen-child2 .card[data-child="fin"]
     #screen-child3 .card[data-child="gn"]
     #screen-child4 .card[data-child="h1"]
  → 🎯 #position-list .card[data-pos="${pos}"]
  → 🏫 btn-town-next ×2 → 📨 btn-early-next
  → 🏫 btn-town-next ×3 → 📨 btn-early-next
  → 🏫 btn-town-next ×3
  → 🏟️ #agency-list .card → btn-prospect-start
```

🔑 **초등부 2장이 다시 들어왔습니다.** 옛 생성기는 🦶·🗺️를 건너뛰고 🎯 자리를 바로 눌러서
`schoolN`이 **6**이었어요(그 우회를 주석이 *"편차 밴드는 중립이라 곡선을 안 움직입니다"*로
정당화하고 있었습니다). 이제 **여덟 판을 다 뜁니다 — `schoolN` 8.**

🔑 **선택자에 따옴표가 들어가는 줄은 백틱으로 적었습니다.** `bench-test` G-0의 추출 정규식이
`querySelector("… [data-foot="R"] …")`의 **첫 `"`에서 잘라** 엉뚱한 선택자를 뜯어가요.
백틱 갈래(`querySelector(\`…\`)`)만 온전히 뜯립니다. **이건 함정이라 주석에 적어 뒀습니다.**

🗺️ 서울을 **`#origin-map .om-do`가 아니라 `#origin-cities .om-city`**로 눌렀습니다 —
광역시 8곳은 지도에 **핀만** 있고 탭은 옆 목록이 받아요(`intro.js` §🗺️). 그리고 목록 쪽은
`<button>`이라 jsdom에서 `.click()`이 그대로 먹습니다(`<path>`에는 `click()`이 없어요).

### 1-2. 🔴 **왜 async 전환을 「안」 했는가**

inspector가 지적한 그 자리 — 🧒 네 화면은 `setTimeout(() => done(key), 620)`(`intro.js`
`ECHO_MS`)으로 넘어갑니다. 이 스크립트는 통째로 동기라 그 620ms를 못 기다려요.

`newPlayer()`를 async로 바꾸면 **전이 폐포가 이만큼**입니다:

```
newPlayer → soccerDebut · idolDebut(그리고 rookieDebut 계열)
          → makeSoccer{Transfer,Promote,Report,Aging,HofMonths,Wc,Bench,Callup,Final,
                        Veteran,Cup,Judge,Nation,Chart,PromoRelegation,Ending}
          → measureEnding · endingCandidates · resumeSaved …
          → 파일 맨 아래 `if (want(...)) makeX();` **32줄의 최상위 실행부**
```

**⚽ 더 윙어 II 한 게임 때문에 나머지 일곱의 생성 경로를 전부 흔듭니다.** `await` 하나를
빠뜨리면 `try/catch`가 rejection을 못 받아 **조용히 다음 시드로 넘어가는** 새 실패 모양이
생기고요. 그래서 inspector가 함께 적어 준 두 번째 길을 **범위를 최대한 좁혀** 썼습니다:

```js
function fastEcho(P) {
  const w = P.w;
  const real = w.setTimeout;
  w.setTimeout = function (fn) { if (typeof fn === "function") fn(); return 0; };
  return () => { w.setTimeout = real; };
}
```

🔒 **켜져 있는 구간은 🧒 네 번의 탭 사이뿐입니다.** 그 구간에 걸리는 타이머는
`intro.js:526`의 620ms **하나**예요 — `show()`가 부르는 🎉 피버는 `setInterval`이라
안 걸리고(`fever.js:222`), 🏟️ 경기 연출은 `slowEcho()`로 되돌린 **뒤에** 옵니다.
inspector가 경고한 *"경기 연출까지 즉시 실행"*이 이 되돌림 한 줄에 걸려 있습니다.

### 1-2b. 🪤 **주석에 「누르는 줄」의 모양을 적으면 없는 버튼이 순서에 끼어듭니다**

작업하다 직접 밟았습니다. G-0의 추출기는 **주석과 코드를 안 가려요.** 제가
*"이런 모양으로 적지 마세요"*라는 **경고를 예시와 함께** 주석에 적었더니, 그 예시가
**26번째 단계**로 뜯겨 나왔습니다(다행히 화면에 없는 선택자라 건너뛰어졌지만요).

```
#btn-new → #x → #btn-name-next → …        ← `#x`가 제 주석에서 나왔습니다
```

👉 예시를 지워 **25단계**로 되돌렸습니다. 🔑 이 함수의 주석에는 **선택자 문자열을 쓰지 마세요.**

---

### 1-3. 다른 게임은 어떻게 안 건드려지나

**게임 이름으로 안 가릅니다** — 🦶·🗺️·🧒 선택자가 soccer·idol·rookie에는 없어서
`querySelector`가 `null`이고, `if (…)` 안에서 통째로 건너뜁니다. 기존 갈림
(`nameFirst` · `townFirst`)도 그대로 두었습니다.

---

## 2. ✅ 8종 다시 만들어지는가 — **실제로 돌려서 확인했습니다**

### 2-1. ⚽ 더 윙어 II

```
⚽ 더 윙어 II — 🎯 윙어 — 리그 경기 직전
  ✅ winger2-match — 🎯 윙어 — K리그1 리그 경기 직전
⚽ 더 윙어 II — 🛡️ 수비수 — 리그 경기 직전
  ✅ winger2-def — 🛡️ 수비수 — K리그1 리그 경기 직전
⚽ 더 윙어 II — 🪑 벤치인 주
  ❌ 조건에 맞는 상태를 못 만들었어요 (winger2-bench)     ← §3
📦 시나리오 44개 (37초)
```

🔬 **뽑힌 세이브를 열어 봤습니다** — 「닿았다」가 아니라 **「무엇이 심겼나」**를 봅니다:

| | `childPicks` | `schoolN` | `townScore` | `origin` | `foot.main` |
|---|---|---|---|---|---|
| `winger2-match` | `["ball","fin","gn","h1"]` **4개** | **8** | 9 | `seoul` | `R` |
| `winger2-def` | `["ball","fin","gn","h1"]` **4개** | **8** | 8 | `seoul` | `R` |

🔑 **`childPicks`가 4개라는 것이 `fastEcho`가 실제로 돈 증거입니다.**
620ms를 못 기다리면 초1 하나만 담기거나 `[]`가 돼요.
그리고 **`schoolN` 8** — 옛 생성기의 6판짜리 우회가 사라졌습니다.

### 2-2. 나머지 7종

| 게임 | 결과 |
|---|---|
| ⚽ 축구(soccer) | ✅ **시나리오별로 전부 뽑힙니다** — transfer · promote · youth-ext · semipro · report · cup · callup · bench · wc-invite · wc-rookie · wc-luck · final · nation-kr · promo 확인 |
| 🎤 아이돌(idol) | ✅ **5/5** — concept · reveal · report · tour · standings |
| ⚾ 야구(rookie) | ✅ **8/8** — milestone · posting · posting-locked · cont-series · abroad-report · retire · titlerace · titlerace-pit (148초) |
| 📈 주식 · 💻 개발 · 🍳 요리 · 📺 방송 · 🦄 | 픽스처가 없는 게임이라 생성 대상이 아닙니다 — **`smoke-test`로 확인** (아래) |

```
node tests/smoke-test.js beta   → ✅ 9/9 (rookie soccer winger2 idol stock dev chef stream unicorn)
node tests/check-page-test.js   → ✅ 전부 통과
node tests/winger2/town-test.js → ✅ 통과 (30줄)
```

### 2-3. 🧪 `tests/winger2/` **33종 전부 초록불**

파일 하나씩 종료 코드로 갈라 돌렸습니다 (0 = 통과 · 1 = 빨간불 · 2 = 💥 안 돎):

```
✅ award  bench  ceil-perfect  check-w2m  child-arc  child-cap  child  creation
✅ engine  foot-map  foot-next  grade  league  minigame-tap  moment  mutation
✅ neutral  offer  one-grid  prospect  raf  school-scene  school  seed-split
✅ tier-in  town-neutral  town  wiring  worldcup  youth-ability  youth-card
✅ youth-clamp  youth-moment
                                       → 초록 33 · 빨간불 0 · 죽음 0
```

🔑 **`bench-test`가 33종 중 하나로 통째로 초록불**입니다 — G-1이 남은 마지막 빨간불이었어요.

⚠️ 단, **`beta/_fixtures.js`를 되돌려 놓은 상태에서 잰 값**입니다. 다시 뽑은 채로 두면
`town-test`가 4줄 빨간불이 돼요 — **§4가 그 이야기입니다.**

---

### 2-4. 🟡 두 가지는 **제 변경과 무관한 기존 상태**입니다 — 적어만 둡니다

**ⓐ `node scripts/make-fixtures.js`(인자 없이 전부)는 힙이 터집니다**

```
FATAL ERROR: Ineffective mark-compacts near heap limit — JavaScript heap out of memory
```

`soccer` 그룹만 돌려도 🌏 월드컵 구간에서 같은 자리에서 죽습니다(exit 134).
🔑 그런데 **`soccer-wc-rookie` 하나만 돌리면 7초에 끝나요.** 즉 시나리오가 깨진 게 아니라
**한 프로세스에 jsdom 페이지가 쌓여서** node 기본 힙(≈2GB)을 넘는 것이고,
제가 건드린 곳(🦶·🗺️·🧒 세 화면)은 축구에 아예 없습니다.
👉 당장은 **게임/시나리오 단위로 나눠 돌리면** 전부 뽑힙니다. 고칠 때는
`--max-old-space-size`가 아니라 **페이지를 더 확실히 놓아 주는 쪽**이 맞아 보여요.

**ⓑ `soccer-chart`(⑧ 평점 순위표)는 원래 안 뽑힙니다**

```
· 시드 -383385517: 엔딩이 '프로 계약 성공'가 아니라 '유럽 빅클럽 입단!'이에요
❌ 조건에 맞는 상태를 못 만들었어요 (평점 순위표)
```

🔬 **커밋 `03453e3`의 원본 스크립트로도 글자 하나까지 같은 실패**입니다(직접 돌려 대조).
`_fixtures.js`에도 `soccer-chart` 항목이 원래 없어요. **제 변경과 무관합니다.**

---

## 3. 🔴 `winger2-bench`가 아직 안 뽑힙니다 — **뿌리가 흐름이 아니라 밸런스입니다**

`winger2-match` · `winger2-def`는 뽑힙니다. **`winger2-bench`만** 30시드를 다 쓰고 실패해요:

```
· 시드 1120982980: 선발 확률이 구간 밖이에요 (2%)
· 시드 1621898237: 선발 확률이 구간 밖이에요 (87%)
· 나머지 27시드: 0%   (1373875413은 100%)
```

`makeWinger2("bench")`는 **경기 직전 상태에서 `st.condition = 34`로 한 칸 낮춰**
선발 확률이 **15~45%**인 상태를 찾습니다(soccer-bench와 같은 방법). 그 구간이
*"선발은 매 경기 다시 뽑혀요"*를 폰에서 보여 줄 수 있는 유일한 자리예요.

🔬 **재 봤습니다** — 컨디션을 20~95로 훑고 `myLine()`을 그대로 부른 값입니다(시드 1120982980):

| 컨디션 | 20 | 34 | 45 | 55 | 65 | 75 | 85 | 95 |
|---|---|---|---|---|---|---|---|---|
| 선발 확률 | 0% | **2%** | 4% | 9% | **17%** | 23% | **30%** | 38% |

그 판의 공격수 줄: `50 · 49 · **43(나) · 38` — **2자리 중 3번째**, 컨디션 보정은
`cond −2.6`뿐입니다. 🔑 **컨디션이라는 손잡이가 이 격차를 못 덮습니다.**

📀 2026-08-30에 뽑힌 디스크의 `winger2-bench`는 **종합 51 · 컨디션 34 · 2자리 중 3번째 · 20%**였어요.
지금 같은 지점의 신인이 **종합 30~47**입니다. 그 사이에 🧬 조립대(총합 194) · 🏫 학교 아크 ·
🧒 어린 시절이 전부 들어왔고요.

### 🔴 그래서 제가 안 고칩니다

고치려면 셋 중 하나를 **정해야** 하는데, 셋 다 제 판단이 아닙니다:

1. **컨디션 34를 「구간에 드는 값」으로 바꾼다** (예: 65 → 17%) — 그런데 그러면
   *"🛌 휴식으로 컨디션을 올리면 선발 %가 오르는지 봐주세요"*라는 픽스처의 확인 문구가
   **이미 몸이 멀쩡한 선수**를 가리킵니다. 픽스처가 하는 이야기가 바뀌어요
2. **밴드 15~45%를 넓힌다** — 그건 *"매 경기 다시 뽑힌다"*의 정의를 바꾸는 일입니다
3. **신인의 팀 내 격차를 좁힌다** (`squad.js`의 `STR_SPREAD`·`FORM_SWING`) — 🔴 밸런스입니다

🚨 **그리고 이건 픽스처만의 문제가 아닐 수 있습니다.** 지금 신인의 선발 확률이
**0% 아니면 100%로 갈라져요.** 벤치 화면이 *"선발은 매 경기 다시 뽑혀요"*라고 말하는데,
신인 구간에서는 **거의 참이 아닙니다.** 👉 **balancer에게 넘깁니다.**

📀 그동안 `winger2-bench`는 **디스크의 2026-08-30판이 그대로 남습니다**
(`writeOut()`이 이번에 안 뽑은 시나리오를 살려 둡니다). 조용히 사라지지는 않아요.

---

## 4. 🚨 픽스처를 다시 뽑으면 `town-test` T-3이 빨간불이 됩니다 — **적기만 합니다**

🔴 **`tests/` 금지라 안 고쳤습니다.** 그런데 이건 반드시 알고 계셔야 해요.

`tests/winger2/town-test.js` T-3은 **`beta/_fixtures.js`의 winger2 항목을
「진짜 옛 세이브」 표본으로** 씁니다:

```js
const FX = (() => { … })().filter((x) => x.game === "winger2");
…
const noField = rows.every((r) => r.hadTown === false && r.hadN === false && r.hadMul === false);
check(noField, `T-3a. 📀 그 세이브들에 townScore·schoolN·spotMul 칸이 **없다** (= 진짜 옛 세이브다)`);
```

즉 **「그 픽스처가 낡아 있다」가 곧 그 검사의 전제**입니다. 제가 winger2 픽스처를
다시 뽑자마자 T-3a·T-3b·T-3c·T-3d **4줄이 빨간불**이 됐어요 — 새 세이브에는 그 칸이 있으니까요.

```
❌ T-3a. 📀 그 세이브들에 `townScore`·`schoolN`·`spotMul` 칸이 **없다** (= 진짜 옛 세이브다)
❌ T-3b / T-3c / T-3d
```

🔑 **두 요구가 정면으로 부딪힙니다:**

| | 요구 | 그러면 |
|---|---|---|
| `bench-test` G-1 | *"픽스처를 **다시 만들 수 있어야** 한다"* | 다시 뽑으면 T-3이 빨간불 |
| `town-test` T-3 | *"픽스처에 새 칸이 **없어야** 한다"* | 안 뽑아야 초록불 |

⚠️ 그래서 저는 **`beta/_fixtures.js`를 커밋된 상태로 되돌려 놓았습니다.**
「다시 만들어지는가」는 **검증했고**(§1·§2), 디스크는 안 갈아엎었어요. 어느 쪽으로 갈지는
제 판단이 아닙니다.

👉 **inspector에게** — T-3의 옛 세이브 표본은 **픽스처 파일이 아니라 검사 안의
손으로 적은 세이브 한두 개**여야 합니다. 지금 형태는 *"픽스처가 낡아 있어야 초록불"*이라,
§1이 고친 그 문제(**픽스처가 조용히 낡아 감**)를 **검사가 지키고 있는** 모양이에요.
CLAUDE.md 표의 **「버그를 정답으로 단언」**과 같은 자리입니다.

---

## 5. 🗣️ 🎯 자리 화면 문구

### 5-1. 정확한 문장

```js
`${chosenName}, 열한 살이에요. 5학년이 되면 첫 학교 대항전에 나가요 — 어느 자리에서 뛸까요?`
```

화면에 뜨는 모습: **`강민준, 열한 살이에요. 5학년이 되면 첫 학교 대항전에 나가요 — 어느 자리에서 뛸까요?`**

근거 셋:

| 조각 | 어디서 왔나 |
|---|---|
| **열한 살** | 🧒 초4 화면이 `초등학교 4학년 · 열한 살`(`intro.js` `CHILD_ARC`)이고 🎯 자리는 그 **바로 뒤**예요 |
| **5학년이 되면** | 다음이 🏫 초5 대항전입니다 (`goElementary`). 🔴 *"중학교"*가 아니에요 |
| **첫** | **초4까지는 경기가 없습니다**(범민 님 지시 · `game.js` §1588). 정말 첫 경기예요 |

🔒 **초등 점수·잘한 종류·추천은 한 글자도 안 넣었습니다** (70번 §8 (a)).

### 5-2. 🔑 주인을 한 군데로 모았습니다

`position-hint`를 적는 자리는 **한 군데뿐**이었지만, 그 한 군데가 **`btn-name-next` 핸들러**
(= 화면 **넷 앞**)였습니다. 그래서 흐름이 바뀌었을 때 **문구만 옛 순서에 남았어요.**
→ **화면을 여는 `goPosition()`으로 옮겼습니다.** `show("screen-position")`을 부르는 곳은
`game.js` 전체에서 그 한 줄뿐이라, 이제 **화면과 문구가 같이 움직입니다.**

### 5-3. 옛 주석도 같이 고쳤습니다 (원칙 ⑨)

`beta/winger2/town.js`의 단계 표가 🎯 포지션을 **초등부 「뒤」**에 두고 무대를
*"중학교 진학"*이라고 적고 있었습니다. 순서를 실제대로 고치고, 초등부의 「자리 안 봄」이
**「아직 안 골라서」가 아니라 「골랐어도 `ELEM_POS`로 덮어써서」**라는 지금 이유를 적었습니다.

---

## 6. 🟡 `beta/winger2/focus.js` — 안 건드렸습니다

`git status`에 **추적되지 않는 새 파일(`??`)**로 떠 있습니다 = **다른 세션이 작업 중**이에요.
배선도, `sw.js`의 `ASSETS`도 손대지 않았습니다. inspector가 적은 그대로입니다:

> 지금은 `index.html`이 안 싣는 고아 파일이라 무해하지만, 누가 배선하는 날
> `sw.js`를 같이 안 고치면 **오프라인에서만** 깨집니다.

👉 **그 파일을 배선하는 세션에게** — `index.html`에 `<script src>`를 더하는 커밋과
`sw.js`의 `ASSETS`에 한 줄 더하는 커밋은 **같은 커밋**이어야 합니다.

---

## 7. ✅ 되돌려 빨간불 확인 (원칙 ⑩)

| 고친 것 | 되돌리면 | 결과 |
|---|---|---|
| `newPlayer()`의 새 흐름 | 커밋 `03453e3`의 옛 `newPlayer()` | ❌ **`bench-test` G-1 빨간불** (`닿은 곳: screen-agency` · 건너뛴 것 `#agency-list .card` · `#btn-start`) — **작업 시작 시점의 기준선이 곧 변이 검증입니다** |
| `fastEcho()`의 되돌림 `slowEcho()` | 안 부르면 | 🔴 **검사가 없습니다** — G-1은 `newPlayer()`의 `.click()` 줄만 뜯어 **직접 눌러 보므로**, `fastEcho` 줄 자체는 재현본에 안 실립니다(§8-①) |
| 🎯 자리 문구 | *"중학교에 갑니다"*로 되돌림 | 🔴 **검사가 없습니다** — `tests/`에 `position-hint`를 읽는 줄이 **0건**입니다(§8-②) |

---

## 8. 🔴 검사의 빈 자리 — **제가 안 만들었습니다. 적어서 넘깁니다**

(검사를 직접 쓰면 변이 검증 없는 검사가 되고, 그게 바로 초록불 함정입니다.)

**① `bench-test` G-1은 🧒 어린 시절을 「지나지 않고도」 초록불입니다**
G-1은 `newPlayer()`에서 **`.click()` 줄만** 뜯어 동기 루프로 눌러 봅니다. 그래서
🧒 초1을 누른 뒤의 **620ms를 안 기다리고**, 초2·초3·초4 카드는 아직 DOM에 없어
**셋 다 조용히 건너뜁니다**(그래도 🎯 자리 카드부터는 다시 눌려서 `screen-main`에 닿아요).
🔑 **즉 G-1은 「생성기가 어린 시절을 실제로 지나는가」를 안 봅니다.**
👉 `S.childPicks.length === 4`와 `S.schoolN === 8`을 **생성기가 만든 세이브에서** 보는 줄이
   있어야 그 자리가 지켜집니다. (§2의 확인은 제가 손으로 한 것이라 다음에 안 남아요.)

**② 🎯 자리 화면 문구를 읽는 검사가 0건입니다**
inspector가 *"designer가 정하면 `child-arc-test`에 A-2 옆 한 줄로 굳히겠다"*고 하셨죠.
문장은 §5-1에 정확히 적었습니다. 굳힐 때 **초4 화면의 `열한 살`과 이 문장의 나이가
같은지**를 두 값의 **관계**로 보시면(둘 다 소스에서 뜯어서) 나이가 또 옮겨가도 안 죽습니다.

**③ `town-test` T-3은 「픽스처가 낡아 있어야」 초록불입니다** — §4.

---

## 9. 👉 넘기는 것

**inspector에게**
1. 🔴 **`town-test` T-3의 옛 세이브 표본을 픽스처 파일에서 떼어 주세요** (§4)
2. 🔴 **`bench-test` G-1이 🧒 어린 시절을 안 봅니다** — 세이브의 `childPicks`·`schoolN`으로 (§8-①)
3. 🟡 🎯 자리 문구 한 줄 (§8-② · 문장은 §5-1)

**balancer에게**
4. 🔴 **신인의 선발 확률이 0% 아니면 100%로 갈립니다** (§3). 벤치 화면이 *"매 경기 다시 뽑혀요"*라고
   말하는 구간이 실제로 있는지 재 주세요 — 없으면 `winger2-bench` 픽스처는 만들 수 없습니다

**designer에게**
5. 🟡 §5-1의 문장이 낱말 계약에 맞는지 봐 주세요 (지어낸 게 아니라 화면 셋에서 뜯었습니다)
