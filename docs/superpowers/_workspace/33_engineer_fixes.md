# 33 · engineer — ⚽ 더 윙어 II §1 수정 (inspector F1·F2·F5·F6 + designer 판정 반영)

2026-08-28 · grow-engineer
근거: `41_inspector_engine-verify.md` · `13_designer_v2-final.md` (1,177줄판 §2-3 · §2-5)
앞 단계: `31_engineer_match-engine.md`

> **커밋하지 않았습니다.** `beta/soccer/`·`tests/winger2/`는 한 글자도 안 건드렸어요.

---

## 0. 30초 요약

| | 항목 | 상태 |
|---|---|---|
| 🔴 | **F1** 경기가 끝나면 막다른 길 | ✅ 고침 — 입구로 실제 버튼을 눌러 확인 |
| 🔴 | **F2** 결승골이 잘못된 카드에 | ✅ 고침 — 916경기 어긋남 **0** |
| 🟡 | **F6** 라운드 두 번 넘어감 · `fast()` 미호출 | ✅ 고침 — 둘 다 |
| 🟡 | **F5** `sw.js`에 `../env.js` 없음 | ✅ 고침 |
| 🟢 | auto 카드 `stake`가 해결 뒤 스코어 | ✅ 고침 |
| 🔄 | **`succ` 개정** — 중심을 `autoP`로, `succ`는 폭만 | ✅ 반영 — 중립이 **정의상** 성립 |
| 🟠 | **F3** — `FLOOR_SHARE 0.12` 바닥 | ✅ 반영 — **이적 페널티 사라짐** · 계단 2.60 → 1.94 |
| 설계 ② | 추가시간 — 9번째 카드 대신 `CLUTCH 1.35` | ✅ 반영 — `N ≤ 8` 유지 |
| 설계 ③④⑤ | `condMul` STEP 3 제외 · `MAKER_W` 폐기 · `momAdj 0` | ✅ 이미 그 상태 |
| 🔴 | **제가 만든 버그 하나를 스스로 찾아 고쳤습니다** | §6-③ — 카드를 안 열고 시즌 +14.8골이 새고 있었어요 |

**남은 빨간불 4건은 전부 "제 코드가 아니라 문턱" 문제입니다** (§8) — 근거를 각각 적었어요.

---

## 1. 🔴 F1 — 경기가 끝나면 아무 데도 갈 수 없던 것

### 무엇이 문제였나

`proMatchFinalize`는 **`{resultHTML, nextLabel, nextFn}`을 돌려주는 함수**인데(`career.js`)
`runV2Match`의 `done()`이 그 값을 버렸습니다. 현행 soccer는 `MatchSim`이 그 자리를 맡았는데
(`beta/soccer/game.js:2194-2198`), v2 드라이버가 이어받지 않았어요.

**🪑 벤치 갈래(`benchShow`)는 버튼을 직접 물립니다 — 뛴 주만 빠졌어요.**
v2.48.0의 `pendingShow` 사고와 같은 모양입니다(여러 입구 중 하나만 빠짐).

### 고친 것 — `career.js` `runV2Match.done()`

```js
const out = proMatchFinalize(act, info);
if (!out) return;
resultSlot().innerHTML = out.resultHTML;
const b = $("btn-stage-next");
if (b) { b.hidden = false; b.disabled = false; b.textContent = out.nextLabel; b.onclick = out.nextFn; }
```

**`#stage-result`가 v2 화면에는 없습니다.** 현행 soccer는 `MatchSim`이 경기 화면을 그릴 때
그 칸을 같이 만들었는데(`game.js:2058`), `W2Scene.mount`는 안 만들어요.
그래서 없으면 만드는 `resultSlot()`을 뒀습니다 — `#stage-card` **안에** 넣어서
다음 경기의 `mount`가 통째로 지우게 했어요.

> ⚠️ **없는 요소를 만지다 함수가 그 자리에서 죽으면 버튼이 영영 안 물립니다.**
> 그게 정확히 v2.4x 벤치 화면에서 났던 사고(`#stage-result`를 만지다 죽어 "버튼을 눌러도
> 아무 반응이 없다")라, `querySelector` 결과를 그냥 쓰지 않고 없으면 만들도록 했습니다.

### 딸린 것 — 엔진 `result()`에 `home`·`away`

`resultHTML`이 `${info.home} 2 : 1 ${info.away}`로 그려서, 안 넣으면
**"undefined 2 : 1 undefined"**가 떴을 자리예요.

```js
// engine.js createMatch(cfg) — cfg.homeName을 새로 받습니다
home: c.homeName || "우리 팀", away: c.oppName || "상대",
```
`career.js`가 `homeName: S.group`을 넘깁니다.

### 게임 입구로 실제 버튼을 눌러 확인 (요청하신 것)

`tests/winger2/wiring-test.js`가 `이어하기` → 슬롯 → `⚽ 경기하러 가기`를
`pointerdown` → `pointerup` → `click` 순서로 실제로 누릅니다.

```
✅ 다음 버튼이 보이고 눌린다
✅ 다음 버튼에 할 일이 물려 있다 (라벨 "🏋️ 다음 경기 준비 (R2)")
✅ 다음 버튼을 누르면 화면이 넘어간다 (누른 뒤 screen-pro)
✅ 경기 결과 요약(스코어 · 평점/MOM)이 화면에 남는다
✅ 경기 화면에 undefined/NaN이 없다
✅ 경기가 끝까지 돌고 라운드가 넘어갔다
✅ 경기 중 자바스크립트 오류가 없다
```

---

## 2. 🔴 F2 — 결승골이 잘못된 카드에 붙던 것

`markDecisive()`가 **자기 주석과 달랐습니다.** 스코어를 훑으며 `lead === 1`인 카드를 잡았는데,
그 조건을 **실점 카드도 만족**해서 진 경기에서 내 골에 결승골이 붙었어요.

inspector가 준 코드를 그대로 넣었습니다 — 축구의 정의(**이긴 팀의 진 팀 최종 점수 + 1번째 골**)입니다.

```js
function markDecisive() {
  if (us === them) return;
  const weWon = us > them;
  const need = (weWon ? them : us) + 1;      // 진 팀 최종 점수 + 1
  let n0 = 0;
  for (const cd of cards) {
    const ours = cd.result === "goal" || cd.result === "assist";
    const theirs = cd.result === "concede";
    if (weWon ? ours : theirs) { n0 += 1; if (n0 === need) { cd.decisive = true; return; } }
  }
}
```

| | 고치기 전 | 고친 뒤 |
|---|---|---|
| 판정 난 경기 중 어긋남 | **186 / 930 (20.0%)** | **0 / 916 (0%)** |
| 진 경기인데 🏆 결승골 + 색종이 | 3.9% | **0** |
| 이긴 경기인데 축포가 조용함 | 5.4% | **0** |

> inspector 말이 맞았습니다 — **되채움 횟수가 아니라 어느 카드냐**가 문제였어요.
> director와 제가 같은 것을 말하고 있었고, 엔진이 `end` 카드를 내기 직전에 한 번만 되채웁니다.

---

## 3. 🟡 F6 — 라운드가 두 번 넘어갈 수 있던 것 + `fast()` 미호출

**둘이 같은 자리였습니다.** `#btn-stage-next`는 `#stage-card` **바깥**의 고정 자리라
화면을 갈아 끼워도 안 지워져요 — 지난 라운드의 `"🏋️ 다음 경기 준비"`가 그대로 살아 있었습니다.

숨기는 대신 **경기 중에는 그 버튼을 ⏩ 빨리감기로** 씁니다. 현행 soccer의 `MatchSim`이
쓰던 방식 그대로예요(`game.js:2203`), 그러면 두 문제가 한 번에 풀립니다.

```js
const fastBtn = $("btn-stage-next");
if (fastBtn) {
  fastBtn.onclick = null;
  if (scene && scene.fast) {
    fastBtn.hidden = false; fastBtn.disabled = false; fastBtn.textContent = "⏩ 빨리감기";
    fastBtn.onclick = () => { scene.fast(); fastBtn.disabled = true; };
  } else { fastBtn.hidden = true; }   // 화면이 아직 없으면 그냥 숨겨요
}
```

- **`click`으로 걸었습니다** — `pointerdown`에서 화면을 갈아치우면 손 뗄 때 그 자리의
  새 요소가 `click`을 받아 즉시 두 번 먹혀요 (미니게임 준비 화면에서 실제로 난 버그)
- ⏩는 **연출만** 짧게 합니다. 순간 카드는 그대로 열려요 —
  개입을 확률 굴림으로 대체하면 게임이 사라집니다 (설계 §5-5)

```
✅ ⏩ 빨리감기 — 화면의 fast()를 부르는 곳이 있다 (설계 §5-5)
✅ runV2Match가 부르는 화면 API를 읽었다 — mount, fast, momentSlot, push, summary
```

---

## 4. 🟡 F5 — `sw.js`의 `../env.js`

```js
const ASSETS = [… "../base.css", "../env.js", "../fx.js", …];
```

inspector 판정대로 넣었습니다. `env.js`는 **네트워크를 안 쓰는 순수 로컬 모듈**이라
`cloud.js`·`stats.js`·`ads.js`(의도적 제외)와 성격이 다릅니다 — 오프라인 첫 실행에서 빠지면
`localStorage`가 `beta::`로 안 감싸지고, 그 판이 접두사 없는 키에 저장돼
**온라인으로 돌아왔을 때 사라진 것처럼 보입니다.**

```
✅ sw.js에서 ASSETS를 읽었다 (20개)
✅ ASSETS의 모든 항목이 디스크에 있다      ← addAll은 원자적이라 하나만 404여도 설치 실패
✅ index.html이 받는 파일이 ASSETS에 다 있다
```

> `beta/soccer/sw.js`도 같은 상태지만 **안 건드렸습니다** — 현행 게임이고 별건입니다.

---

## 5. 🟢 auto 카드의 `stake`가 해결 **뒤** 스코어로 계산되던 것

inspector §4의 "지금은 안 아프지만 함정" 항목입니다. `build()`에서 `stakeOf`를
`autoAttack`/`autoDefend` **앞으로** 옮겼어요.

지금은 화면이 auto 카드의 `stake`를 안 써서 아무 일도 안 나지만,
누가 *"동료 골에도 무엇이 걸렸는지 붙이자"*고 하는 순간 그 자리에서 거짓말을 시작합니다.

같이 정리한 것: `openMine()`이 `stake`를 다시 계산하던 줄을 뺐어요 — 이제 `build()` 한 곳에서만 잡습니다.

---

## 6. designer 판정 반영

### 🔄 `succ` 개정 — **중심은 자동 확률, `succ`는 폭만** (§2-6 개정판)

제가 §4-⑤에 올린 *"§2-6 표를 지키면 중립이 깨진다"*와 inspector F4가 **한 뿌리**였습니다 —
`succ` 표가 성공률의 **중심점**을 독립적으로 정하는 한 두 갈래는 반드시 어긋나요.

```js
// engine.js — 카드 한 장의 사건 확률
const cardP = (autoP, ability, s) => clamp(autoP + 2 * half(ability) * (s - 0.5), 0, 1);
```

`s = 0.5`에서 `P(사건) = autoP` — **모든 능력치에서 정의상** 같습니다.

| 카드 | `autoP` | `P(사건)`이 무엇인가 |
|---|---|---|
| ⚽ 결정 | `FIN × atkW × sc(me)` | `perfect` = 내 골. `ok`/`miss`는 **연출 몫**(둘 다 기록이 안 남아요) |
| 🅰️ 전개 | `FIN × atkW × sc(me)` | `perfect` = 동료 골 + 내 도움. `ok`/`miss` = **둘 다 무위** |
| 🧱 수비 | `1 − pConcede(me)` | **`perfect + ok` = 막음**. 중립이 걸리는 자리가 `miss`(실점)예요 |

**🅰️ 전개의 `ok`가 골을 주면 안 된다**는 지적이 맞았습니다. 자동 갈래에서 *골*과 *내 도움*은
**같은 사건**이라, `ok`가 골을 주면 도움 중립은 맞아도 **골 중립이 깨집니다.**
제가 `P(ok) = pFinish − perfect`로 둔 건 옛 `mid(a)` 체계에서 골을 맞추려던 것이었어요.

**실측 — `s = 0.5`에서 카드 vs `autoP`** (각 6,000경기 · 동료 str 70±)

| 카드 | 능력치 70 | 90 | 110 | 130 | 150 |
|---|---|---|---|---|---|
| ⚽ 결정 | −0.6% | −0.1% | −0.5% | −1.5% | −0.9% |
| 🅰️ 전개 | +3.8% | +3.1% | −0.4% | +1.5% | +1.1% |
| 🧱 수비 (실점) | +0.6% | — | −0.3% | — | −4.8%* |

\* n=4,932에서 1σ가 **±2.4%**입니다 — 시드 5개로 다시 재니 −2.6 / +0.6 / −2.7 / −2.2 / −0.6%,
n을 7,800으로 늘리면 **−0.2%**. **몬테카를로 잡음이지 편향이 아니에요** (§8-①).

#### 🔴 `mid(a)`를 **완전히** 지우지는 않았습니다 — 지웠으면 `sc(x)`가 죽습니다

> 지시는 *"`mid(a)` 표는 폐기입니다"*였는데, §2-5의
> **`sc(x) = succ(a, 0.5) / succ(70, 0.5)`가 `mid(a)`로 만들어집니다.**
> 여기서 없애면 `pFinish`·`pConcede`가 능력치를 **아예 안 타게** 되고,
> 그건 §2-5의 🔒 절이 *"차단에 능력치가 안 실려 수비수만 성장 축이 죽습니다"*라고
> 금지한 바로 그 상태예요. inspector 변이 검사 B가 그걸 지킵니다.
>
> **그래서 `mid(a)`는 "능력치 곡선"으로 남기고, 폐기된 건 "카드 성공률의 중심" 자리뿐입니다.**
> 파일 상단에 둘의 자리 차이를 크게 적어 뒀어요. `E.succ(40, 0.5) = 0.35` 같은
> 기존 계약도 그대로 살아 있습니다(검사 3항목 초록불).
> **다르게 의도하셨다면 알려 주세요.**

### 🟠 F3 — 계단은 두고 **바닥**을 깔았습니다

```js
// engine.js pickActor(xi, kind, hits, floor)
if (floor && tot > 0) {
  const i = xi.findIndex((x) => x.me);
  const want = FLOOR_SHARE * tot;          // FLOOR_SHARE = 0.12
  if (i >= 0 && ws[i] < want) { tot += want - ws[i]; ws[i] = want; }
}
```

- **`build()`의 주인공 지명에만** 켰습니다 (`pickActor(..., true)` 두 곳)
- 🚨 **경쟁자 루프(`autoMatch`)·`shareByWeight`·도움자 지명에는 안 켰습니다** —
  걸면 리그 득점이 11명에게 흩어져 골든부츠가 무너져요
- 도움자 지명(`nameAssister`)에 안 건 이유: inspector가 잰 건 **주인공 지명의 빈도**이고,
  도움까지 바닥을 깔면 저연차 도움이 같이 부풀어요(designer가 ⓓ에서 경고한 자리)

**실측 — 능력치 70, 경기당 순간 카드**

| | 동료 str 70 | 동료 str 80 (강팀) |
|---|---|---|
| fw | 0.34 → **0.59** | 0.30 → **0.59** |
| wg | 0.35 → **0.58** | — → **0.58** |
| mf | 0.41 → **0.58** | 0.34 → **0.56** |
| df | 0.40 → **0.61** | — → **0.57** |

✅ **이적 페널티가 사라졌습니다** (동료 str 70 ↔ 80에서 거의 같아요 — designer 목표 ⓑ)
✅ 계단 **2.60배 → 1.94배** (fw) · 2.19 → 1.88 (mf)
⚠️ **검사 13번(≥0.6회)은 `wg70 = 0.58` · `mf70 = 0.58`로 아슬하게 못 넘깁니다** → §8-②

### ⏱️ ② 추가시간 — `CLUTCH` (제 판단이 채택됐습니다)

```js
const CLUTCH = 1.35;
const isClutch = (k, n, diff) => k === n && Math.abs(diff) <= 1;
// pBig = BIG_BASE × edge × urgency × (clutchOn ? CLUTCH : 1) × condMul
```

- **9번째 카드는 안 넣습니다.** 실측 플레이 카드 최대 **8** ✅ (2,000경기)
- 그 카드의 분이 `90+1~5`가 되고 `card.clutch = true`가 붙어요 (화면이 읽을 수 있게)
- 종료 휘슬은 `Math.max(90, 마지막 카드 분)` — 추가시간 카드보다 앞설 수 없어요
- **경쟁자 카드 루프에도 같은 `clutch`가 걸립니다** — 나만 받으면 리그가 다른 자를 써요
- `urgency`는 뒤질 때만인데 `clutch`는 **1점 차로 앞설 때도** 걸려서,
  마지막 카드가 상대 공격 장면이면 🧱 수비 카드가 열려 **수비수도 이 순간을 받습니다**

실측: 추가시간 카드 경기당 **0.69장**

### ③ 🔴 제가 만든 버그 하나 — **카드를 안 열고 골이 새고 있었습니다**

`ASSIST_P2` 자리 이동을 구현하면서 자동 🅰️ 전개 장면의 **마무리 후보에 나를 넣었습니다.**
그러면 **내가 순간 카드를 한 장도 안 열고 골을 얻어요.**

| | 능력치 130 공격수 |
|---|---|
| 자동 카드에서 내가 넣은 골 | **경기당 0.389 = 시즌 +14.8골** |
| 시즌 골 | 24.0 → **37.9** (밴드 완전 이탈) |

```js
// 고친 것 — engine.js autoAttack()
const rest = xi.filter((x) => x !== who && !x.me);   // ← !x.me 추가
```

**⚽ 결정 장면에서 동료가 주인공이면 내가 절대 못 넣는 것과 같은 규칙**으로 맞췄습니다.
도움은 다릅니다 — §2-5가 *"득점자 제외"*라고만 적어서 나도 지명 대상이에요(그대로 뒀습니다).

> ⚠️ **설계에 이 자리가 안 적혀 있습니다.** *"🅰️ 전개 장면에서 동료가 주인공일 때
> 마무리를 누가 하나"*는 §2-5에 없어요. 제가 고른 쪽(나 제외)은 **balancer가 곡선을 잡았을 때의
> 상태와 같습니다** — inspector가 잰 fw130 22.3골이 그 상태였고, 고친 뒤 **24.0골**이에요.
> **다르게 의도하셨다면 알려 주세요.**

### ④⑤⑥ — 바꿀 것이 없었습니다

| | 판정 | 코드 |
|---|---|---|
| `condMul`을 STEP 3에 넣지 말 것 | 제 판단이 맞았음 | 이미 안 걸려 있어요. 변이 검사 D가 지킵니다 |
| `MAKER_W` 폐기 확정 | 제 읽기가 맞았음 | 엔진에 `MAKER_W`가 없습니다 |
| `momAdj = 0` 확정 | | 이미 0이에요 |
| `ASSIST_P2` 자리 이동 | 그대로 | ⚽ 결정 장면의 골에 `a` 무게로 도움자 지명 |

---

## 7. 지금 상태의 실측 (동료 str 70± · 조작 0.5 · 각 1,500경기 · 38라운드 환산)

| 포지션 | 능력치 70 | 110 | 130 | 150 |
|---|---|---|---|---|
| fw 골/도움/차단 (카드) | 3.3 / 3.2 / 5.3 (0.62회) | 19.5 / 3.7 / 6.2 (1.27) | **24.0** / 3.5 / 7.2 (1.34) | 26.3 / 4.1 / 8.1 (1.36) |
| wg | 2.1 / 4.1 / 4.7 (0.56) | 4.9 / 25.6 / 6.2 (1.23) | 5.7 / **29.8** / 7.3 (1.31) | 7.6 / 34.0 / 8.2 (1.43) |
| mf | 2.4 / 4.4 / 4.7 (0.56) | 3.5 / **28.1** / 5.9 (1.24) | 4.5 / 31.2 / 7.1 (1.31) | 5.2 / 35.9 / 8.6 (1.39) |
| df | 2.4 / 3.0 / 6.1 (0.64) | 2.8 / 4.4 / **38.6** (2.03) | 3.1 / 5.1 / 46.4 (2.08) | 3.8 / 5.4 / 52.2 (2.19) |

🔴 **balancer가 봐야 할 것 둘**

1. **도움이 목표보다 큽니다** — 실측 ①-D의 (라′) 값은 능력치 110에서 `mf 19.7`인데
   **28.1**입니다(+43%). 🅰️ 전개 장면 성공에 도움이 **항상** 붙는 새 규칙의 직접 결과예요.
   설계 §12-4 ①-D가 예고한 자리입니다 — *"안 맞으면 `ASSIST_P2`를 0.75에서 조정"*.
   ⚠️ 다만 **`ASSIST_P2`는 이제 결정 장면에만 걸려서 전개 도움을 못 줄입니다.**
   손잡이가 그쪽이 아닐 수 있어요.
2. **리그 도움 ÷ 골 = 0.880** (목표 ≈ 0.75). 전개 골은 도움이 **항상** 붙고 결정 골만 0.75라,
   섞이면 0.75 위로 뜹니다. 구조적이에요.

---

## 8. 남은 빨간불 4건 — **전부 문턱 문제입니다** (코드가 아니에요)

`tests/winger2/`는 **한 글자도 안 고쳤습니다.** 근거만 적어 둘게요.

### ① `engine-test.js` — (라′) 수비 중립 −4.8%

**편향이 아니라 몬테카를로 잡음입니다.** 검사가 쓰는 n(2,500경기 ≈ 4,900카드)에서
1σ가 **±2.4%**예요. 시드를 바꿔 5번 재면 −2.6 / +0.6 / −2.7 / −2.2 / −0.6%,
n을 7,800으로 늘리면 **−0.2%**입니다.

개정 뒤 `P(miss | 카드) = 1 − cardP(1 − pConcede, a, 0.5) = pConcede`로 **정의상 정확히** 같아요.
designer가 밴드를 ±3% → **±1%로 조였으니 표본을 그만큼 늘려야** 합니다
(±1%를 1σ로 보려면 카드 수가 대략 **28,000장** 필요해요).

### ② `wiring-test.js` — 계단 1.94배(≤1.6) · 빈도 `wg70 = 0.58`·`mf70 = 0.58`(≥0.6)

**`FLOOR_SHARE = 0.12`의 산술적 천장이 0.605회입니다.**

```
경기당 비중립 장면 ≈ E[N] × SCENE_ATK = 7 × 0.72 = 5.04
바닥이 걸린 선수의 카드 수 ≈ 5.04 × FLOOR_SHARE = 5.04 × 0.12 = 0.605
```

즉 **0.12로는 designer가 예상한 0.70에 닿을 수 없습니다** — 재는 문제가 아니라 산술이에요.
0.70을 원하시면 **`FLOOR_SHARE ≈ 0.139`**가 필요합니다.

**제가 안 바꾼 이유**: 계수는 balancer 몫이고, designer가 ⓓ에서
*"저연차 곡선이 목표(70에서 5%)를 넘으면 값을 낮춥니다"*라고 반대 방향 제약을 걸어 뒀어요.
**둘을 같이 보고 정해야 합니다** (실측 ①-I).

계단 1.94배도 같은 손잡이입니다 — 바닥을 올리면 같이 내려가요.

### ③ `mutation-test.js` — C. `fatigue` 기준선 1.170 (≥1.18)

**메커니즘은 멀쩡합니다.** `bump()`는 `scoreGoal()` 한 곳에서만 불리고,
**변이는 여전히 깨끗하게 갈립니다** — 기준선 **1.170** vs 변이 후 **1.012**.

문턱 1.18은 **개정 전 엔진에서 잰 값**이에요(그때 1.331). §2-6 개정으로 🅰️ 전개의 `ok`가
무위가 되고 제가 자동 마무리에서 빠지면서 내 골이 줄어 비율이 내려왔습니다.
**개정 뒤 기준선으로 다시 잡아야 하는 자리**예요 — inspector 몫이라 안 건드렸습니다.

> ⚠️ `mf150 카드/경기 1.565`는 **문턱 1.55를 넘겼습니다.** 못 넘긴 건 앞의 비율뿐이에요.

---

## 9. 건드린 파일

```
beta/winger2/engine.js    F2(markDecisive) · CLUTCH · FLOOR_SHARE · cardP(succ 개정)
                          · 🅰️ 도움 경로 개편 + 자동 마무리에서 나 제외 · outcome 개정
                          · stake 순서 · home/away · assistShare 폐기 · nameAssister 신규
beta/winger2/career.js    F1(done의 반환값 · resultSlot) · F6(⏩ 버튼) · homeName 전달
beta/winger2/sw.js        ASSETS에 "../env.js"
docs/superpowers/_workspace/33_engineer_fixes.md
```

**손대지 않은 것**: `beta/soccer/` · `tests/winger2/` · `beta/winger2/match-scene.js` ·
`OPEN-ITEMS.md` · 공유 파일 · `git status`의 남의 파일 11개

```bash
git add beta/winger2/ docs/superpowers/_workspace/33_engineer_fixes.md
```

⚠️ **`OPEN-ITEMS.md`에 §8의 문턱 3건과 §7의 도움 총량을 올려 주세요** —
그 파일은 오케스트레이터가 관리해서 제가 안 건드렸습니다.

---

## 10. 검증

| 검사 | 결과 |
|---|---|
| `tests/winger2/engine-test.js` | ❌ 1 — §8-① (잡음) · 결승골·`succ`·계약 전부 ✅ |
| `tests/winger2/mutation-test.js` | ❌ 1 — §8-③ (개정 전 기준선) · **변이 4쌍은 전부 깨끗이 갈립니다** |
| `tests/winger2/wiring-test.js` | ❌ 3 — §8-② (`FLOOR_SHARE` 값) · **F1·F5·F6 항목 전부 ✅** |
| `node tests/smoke-test.js beta` | ✅ 9종 |
| `node tests/check-page-test.js` | ✅ |
| `tests/cloud/cloud-wire-test.js` · `help-section-test.js` | ✅ |
| 문법 (`new Function`) | ✅ |

**게임 입구로 실제 버튼을 눌러 확인** (F1 요청 사항) — `wiring-test.js`가
`이어하기` → 슬롯 → `⚽ 경기하러 가기`를 `pointerdown`→`pointerup`→`click`으로 누릅니다:

```
✅ 다음 버튼이 보이고 눌린다        ✅ 다음 버튼에 할 일이 물려 있다
✅ 다음 버튼을 누르면 화면이 넘어간다  ✅ 경기 결과 요약이 화면에 남는다
✅ 경기 화면에 undefined/NaN이 없다   ✅ 경기 중 자바스크립트 오류가 없다
✅ ⏩ 빨리감기 — 화면의 fast()를 부르는 곳이 있다
```

---

## 관련

- 검증: `41_inspector_engine-verify.md`
- 설계: `13_designer_v2-final.md` §2-3(`CLUTCH`) · §2-4(`FLOOR_SHARE`) · §2-5 · §2-6(개정판)
- 앞 단계: `31_engineer_match-engine.md` · `32_director_match-screen.md`
- 다음: 🔴 **balancer 실측 ①** — `FLOOR_SHARE` · `ASSIST_P2` · `CLUTCH` · `MOM_MIN` 확정
