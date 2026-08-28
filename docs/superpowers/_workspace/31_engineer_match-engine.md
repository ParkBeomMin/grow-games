# 31 · engineer — ⚽ 더 윙어 II 1차 §1 (점진 확정 경기 엔진)

2026-08-28 · grow-engineer
근거: `13_designer_v2-final.md` §2 · §3 · §9 · §10 · `21_balancer_revised-engine.md`
앞 단계: `30_engineer_scaffold.md` (등록 10지점)

> **범위**: 경기 엔진 + 배선. 미니게임 4종·골 연출·유망주 3택·특능은 다음 단계예요.
> **커밋하지 않았습니다.** `git status`는 작업 시작 때와 같은 목록이고, 제가 새로
> 만지거나 만든 건 `beta/winger2/` 안뿐입니다.

---

## 0. 30초 요약

| | |
|---|---|
| 새 파일 | **`beta/winger2/engine.js`** (`window.WingerEngine`) — 점진 확정 엔진 |
| 지운 것 | `splitMine` · `shareGoals` · `myTeamGoals` · `applyMateGoals` · `MY_P` · `ACE_W` · `GOAL_W` · `ASSIST_W` · `MAKER_W` · `ASSIST_P2` (전부 `career.js`) |
| 안 지운 것 | `deriveOppGoals` · `matchContribution` · `teammateGoals` (`game.js`) — 🏆 컵 · 🌏 월드컵 · 🏫 유스가 아직 씁니다 (§5-③) |
| 배선 | `playShow` → 새 드라이버 `runV2Match` · `benchShow` · `recordRound` · `leagueRound` · `proMatchFinalize` |
| 시드 창구 | `WingerEngine._t.seed(n)` / `unseed()` / `skill` / `playMatch(cfg)` / `autoMatch` / `K` |
| 검증 | 문법 · smoke(9종) · check-page · cloud 2종 · **JSDOM으로 winger2를 실제로 띄워 4포지션 경기 완주** |
| 🔴 판단이 필요한 것 | **6건** — §4에 있습니다. 그중 3건은 실측 ① 게이트 **전에** 답이 필요해요 |

---

## 1. 만든 것

### 1-1. `beta/winger2/engine.js` — 전용 파일

**공유 파일은 한 글자도 안 건드렸습니다** (`timing.js` · `base.css` · `cloud.js` · `match.js` · `help.js`).
엔진을 `career.js` 안에 넣지 않은 이유는 셋이에요.

1. `career.js`는 이미 3,800줄이고, 경기 산식이 UI·이적·수상과 한 파일에 섞여 있어요
2. 엔진이 **전역(`S` · `WingerSquad`)을 안 읽습니다** — 전부 `cfg`로 받아요.
   그래야 node에서 화면 없이 곡선을 잽니다 (§10 요구사항)
3. director의 `match-scene.js`와 파일이 안 겹쳐요

```js
WingerEngine.createMatch(cfg)   // 내 경기 — 스텝 머신
WingerEngine.autoMatch(cfg)     // NPC 클럽 대 NPC 클럽 — 같은 8칸 루프
WingerEngine.shareByWeight(xi, n, kind)   // 스코어가 이미 정해진 클럽의 몫 나누기
WingerEngine.succ / sc / mid / condMul / blendOf / K
WingerEngine.setMini(fn) / getMini()
WingerEngine._t = { seed, unseed, skill, playMatch, autoMatch, K }
```

### 1-2. STEP 1~4 — 설계 그대로

| STEP | 구현 | 확인 |
|---|---|---|
| 1 장면 배분 | `sceneOf(atkW, defW)` — **스코어를 안 봅니다** | `SCENE_ATK 0.72` |
| 2 빅찬스 | `isBig(atkW, k, n, behind, cond)` — `BIG_BASE × edge × urgency × condMul` | `condMul(80) = 1.0000` ✅ |
| 3 주인공 | `weightOf(row, kind, ace, hits)` — 골·도움·차단이 **하나의 무게 식**을 지나갑니다 | |
| 4 갈림 | `pFinish` · `pConcede` — 둘 다 `sc(주인공)`을 탑니다 | `sc(70) = 1.0000` ✅ |

`CON × defW`는 1로 clamp했어요 (`Math.min(1, CON * defW)`).

### 1-3. 지시하신 세 가지, 실제로 어떻게 했나

**① 도움 몫은 STEP 3의 전개 카드 무게 비율입니다**

```js
function assistShare(xi, me, hits) {          // engine.js
  const ace = aceOf(xi, "assist");
  let tot = 0, mine = 0;
  for (const x of xi) { const w = weightOf(x, "assist", ace, hits); tot += w; if (x === me) mine = w; }
  return tot > 0 ? mine / tot : 0;            // ← w_a(me) / Σ w_a(i)
}
```

`(overall/70)^1.2`는 **엔진 어디에도 없습니다.** 미드필더의 `blend`는 `패스×0.60 + 드리블×0.25 + 체력×0.15`라, 패스를 올리면 전개 카드 주인공 확률과 도움 몫이 **같이** 올라요. 결함 ①이 구조적으로 풀립니다.

**② `sc(x)`의 `abilityOf(x)`는 `blend`입니다**

```js
const sc = (ability) => mid(ability) / SC_REF;   // SC_REF = mid(70) → sc(70) = 1
```
`abilityOf(row)`는 내가 6스탯이면 포지션별 `blend`를, 동료·경쟁자면 `str`을 씁니다.
`overall()`은 엔진이 **한 번도 안 부릅니다** (grep으로 확인).

**③ `fatigue`는 STEP 3에 있고 골만 셉니다**

```js
* (1 / (1 + FAT * goals))     // goals = hits.get(row) — scoreGoal에서만 bump
```
`bump(row)`는 `scoreGoal()` 안 한 곳에서만 부릅니다. 도움·차단은 `credit()`으로 따로 쌓여서 `hits`에 안 들어가요.

### 1-4. 시드 주입 창구 (§10)

```js
let _rng = Math.random;                        // ⚠️ 바깥 스코프
const rnd = () => _rng();
const rand = (a, b) => a + rnd() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const chance = (p) => rnd() < p;
```

- `Math.random`을 **전역으로 안 갈아치웁니다** — `timing.js`·`cloud.js`가 같이 영향을 받아요
- `_rng`는 IIFE 바깥 스코프라 `return`의 `_t`에서 보입니다 (컴백 컨셉에서 정정한 자리)
- **엔진의 모든 굴림이 `rnd()` 하나를 지나갑니다.** `Math.random`은 engine.js에 0건
- 같은 시드 → 같은 경기 재현 확인 ✅ (카드 종류·결과·분이 완전 일치)

⚠️ `_t.K`는 **대조용**이에요. 검사는 여기서 문턱을 읽지 말고 소스에서 정규식으로 뽑거나 직접 적으세요 — 주석에도 적어 뒀습니다.

### 1-5. 경쟁자 66명 카드 루프 (§2-9)

`recordRound`가 남은 클럽을 짝지어 `WingerEngine.autoMatch`로 굴려요.
**스코어와 개인 기록이 한 루프에서 같이** 나옵니다 — `leagueRound`는 이제 굴리지 않고 그 결과를 얹기만 해요.

JSDOM으로 19라운드를 굴려 확인:
```
✅ 클럽 득점 = 선수 골 합 (어긋난 곳: 없음)
✅ 리그 득점 100 = 리그 실점 100
✅ 차단 기록이 쌓인다   ✅ 도움 기록이 쌓인다
```

내 경기의 상대 클럽만 예외입니다 — **스코어가 중계에 뜬 값**이라 다시 굴리면 화면과 순위표가 다른 말을 해요. `shareByWeight`로 나누기만 합니다(차단은 `info.oppStops` = 우리 공격이 무산된 장면 수).

### 1-6. 확정 계수 (§3-2)

| 자리 | 전 | 후 |
|---|---|---|
| `career.js` `AXIS_OFF` | 4.8 | **1.90** |
| `career.js` `POS_AXIS` `n` | 0.94 / 1.02 / 0.86 / 0.87 | **1.053 / 0.952 / 0.814 / 0.879** |
| `career.js` `RATE`의 `b` | 54/54/54/55 | **64/64/64/65** (골·도움 값은 안 건드림) |
| `career.js` `MOM_MIN` | 없음 | **7.6** (신규) |
| `squad.js` `FOOT_FIT` | 0.04 | **0.10** |
| `career.js` `AXIS_K` | 3.00 | **3.00 — 안 건드렸습니다** 🔒 |

`POS_SLOTS` + 정규화 IIFE · `FORMATION`은 **원래 자리에 그대로** 있습니다(soccer에서 복사돼 온 그대로). 옮길 필요가 없었어요.

---

## 2. 설계와 다르게 구현한 것 — **전부 여기 있습니다**

### 2-1. STEP 3에 `condMul`을 **안 걸었습니다** (문서 안의 모순)

§2-4의 산식 줄에는 `condMul(i)`가 있는데, **§2-7의 표가 그걸 명시적으로 뺐습니다** — *"~~STEP 3 `wMe`~~ **뺐습니다.** 컨디션이 낮다고 감독이 덜 쓰는 건 선발/벤치 결정에서 이미 처리돼요 — 이중 계상입니다"*.

**§2-7을 따랐습니다.** 이유가 붙어 있고 나중에 쓰인 판단이라서요. `condMul`은 STEP 2(`pBig`)에만 걸립니다. 미니게임 판정 창은 `winger-moment.js`가 붙을 때 두 번째 자리가 돼요.
→ **designer 확인 필요** (§4-①)

### 2-2. `MAKER_W`를 **안 썼습니다** (§3-2와 §2-4가 어긋납니다)

- §2-4의 산식에는 스포트라이트 자리가 **하나**입니다 — `(isAce(i) ? spotOf(i) : 1)`
- §2-10은 `ACE_W` 계단을 폐기하고 `SPOT 4.00` / `NPC_SPOT 7.00`으로 대체한다고 합니다
- 그런데 §3-2는 `MAKER_W`를 *"그대로 — STEP 3의 `posW`로 씁니다"*라고 적어 뒀어요

**`MAKER_W`(3.0)는 `ACE_W`(2.6)의 도움판 쌍둥이**입니다 — 현행 코드에서 둘은 같은 자리(클럽의 한 명에게 걸리는 계단)에 있어요. 그래서 **`ACE_W` 폐기가 `MAKER_W`도 함께 덮는다**고 읽고, 카드 종류마다 에이스를 따로 뽑아 `SPOT`/`NPC_SPOT` 하나만 걸었습니다.

```js
const ACE_POOL = { goal: ["fw"], assist: ["mf", "wg"], defend: ["df"] };
```

**다른 읽기도 가능합니다** — `ASSIST_W × MAKER_W`를 `posW`로 곱하고 그 위에 `SPOT`/`NPC_SPOT`을 또 거는 것. 그러면 도움이 훨씬 더 몰려요. balancer의 `SPOT`/`NPC_SPOT` 실측은 **골 기준**(내 130골 18.7 · 골든부츠)이라 어느 쪽으로 잡았는지 표에서 못 읽었습니다.
→ **balancer 확인 필요** (§4-②)

### 2-3. `momAdj`(승부처 평점 보정)를 **0으로 뒀습니다**

v1은 90분 끝에 승부처가 **딱 한 번** 있었고 그 성패를 평점에 ±0.8, hype에 ±0.5로 얹었어요.
v2는 순간 카드가 경기당 0.7~2.3회고 **그 결과가 이미 골·도움·차단으로 평점에 들어갑니다.** 여기서 또 얹으면 같은 일을 두 번 세요 — 그리고 `RATE`의 `b`(+10)는 그 구조에서 다시 잡힌 값이에요.

설계 문서에 이 항의 처리가 없어서 **0으로 뒀습니다.** 계수를 새로 만들지 않는 쪽을 골랐어요.
→ **balancer 확인 필요** (§4-③) — `RATE`의 `b` 재적합 때 `momAdj`가 들어 있었는지에 따라 갈립니다

`실전 성장` 확률의 `momentRes === "perfect" ? 0.05`는 `mineSuccess > 0 ? 0.05`로 옮겼습니다 (§7-4 *"순간 카드에서 한 일이 무게"*).

### 2-4. 추가시간 카드를 **안 넣었습니다**

§5-5는 *"추가시간 90+1~5분. **1점 차일 때만** 카드가 하나 더"*라고 적었는데, §3-1은 `N_MIN/N_MAX = 6/8`을 못박고 balancer가 그 위에서 곡선을 잡았어요. 9번째 카드는 **생산량을 늘려 곡선을 움직입니다.**

지금은 `end` 카드의 분 표시로만 추가시간을 냅니다 (`min: 91~94` when 1점 차 이내).
→ **designer·balancer 확인 필요** (§4-④). 넣기로 하면 실측 ①을 다시 돌려야 해요

### 2-5. 🅰️ 전개 카드의 `ok`/`miss` 배분 — 자동 갈래에 맞췄습니다

§2-6이 *"`ok`/`miss` 배분은 director·engineer가 판정 창 설계에서 정하되 `perfect` 비율이 표와 같아야"*라고 맡겨 주셔서, **자동 갈래와 기댓값이 맞도록** 나눴습니다 (inspector 검사 10번 (라′) 중립).

```js
🧱 수비 — miss가 곧 실점이니  P(miss) = pConcede
🅰️ 전개 — 골은 perfect+ok니   P(ok)   = pFinish − perfect
⚽ 결정 — ok(슛 시도)도 miss(무위)도 기록이 안 남아요. 배분은 연출 몫이라 반씩
```

**여기서 하나가 안 맞습니다.** 🅰️ 전개 카드의 **도움**은 두 갈래가 다릅니다:
- 카드 갈래(내가 주인공) — `P(내 도움) = perfect ≈ 0.46`
- 자동 갈래(동료가 주인공) — `P(내 도움) = ASSIST_P2 × 내 도움 몫`

같은 능력치·같은 조작 0.5에서 **카드 갈래가 4~5배 많습니다.** 이건 §2-6의 표(`perfect → 동료 골 + 내 도움`)를 문자 그대로 지키면 피할 수 없는 결과예요 — 표를 지키면 중립이 깨지고, 중립을 지키면 표를 못 지킵니다.

**표를 지켰습니다.** 표가 더 명시적인 규범이고, "내가 킬패스를 성공하면 도움"이 게임의 약속이라서요.
→ **balancer 판정 필요** (§4-⑤) — 검사 10번의 문턱(±3%)이 이 항목에 대해 성립하지 않을 수 있어요

### 2-6. `STEP 1`의 `teamAtk` / `oppDef`는 **클럽 전력**입니다

설계가 이 넷을 정의하지 않았어요. `teamAtk = teamDef = 우리 클럽 전력`, `oppAtk = oppDef = 상대 전력`으로 뒀습니다 → `atkW = us/(us+them)`, `defW = 1 − atkW`, 대등하면 `edge = 1.0` ✅.

**내 능력치를 `teamAtk`에 얹지 않았습니다.** 현행 `myTeamGoals`는 `TEAM_MY_K × (overall−70)`을 더했지만, v2는 내 능력치가 STEP 3(`pMe`)과 `sc()`에 이미 실려 있어서 여기서 또 얹으면 이중 계상이에요.
→ 결과: 능력치를 올려도 **팀 승률이 오르긴 오릅니다**(내가 카드를 더 많이 이겨서). 실측에서 fw 능력치 70 → 150에 승률 30% → 49%.

### 2-7. 동료·경쟁자의 능력치 폭은 현행 그대로 (40~95)

`blendOf`가 `stats`가 없는 줄은 `clamp(str, 40, 95)`로 읽습니다 — 현행 `splitMine`·`shareGoals`와 같은 폭이에요. **나만 40~220**입니다(현행도 `clamp(overall(), 40, 220)`이었어요). 이걸 통일하면 내 성장이 천장을 만나서 안 통일했습니다.

### 2-8. 우리 팀 동료도 **도움을 받습니다** (현행에는 없던 것)

현행은 `shareGoals`가 우리 클럽을 건너뛰고 `applyMateGoals`가 골만 얹어서, **우리 클럽 동료는 시즌 도움이 영원히 0**이었어요. 다른 5개 클럽은 도움이 쌓이니 리그 도움왕 경쟁에서 우리 팀만 빠져 있었습니다.

v2는 내 경기의 자동 카드에서 동료끼리도 도움을 나눠 가집니다 — 6개 클럽이 같은 눈금이 돼요.
**곡선을 움직이는 변경입니다**(내 도움왕 확률이 조금 내려가요). 결함을 이어받지 않는 쪽을 골랐는데, 되돌리길 원하시면 `autoAttack`의 `else if (chance(ASSIST_P2))` 갈래 하나를 지우면 됩니다.

---

## 3. 저장 데이터 — 마이그레이션 없음

| 필드 | 어디서 | 읽는 쪽 기본값 |
|---|---|---|
| `S.career.moments` | `proMatchFinalize` | `{ g:{t:0,p:0}, a:{t:0,p:0}, d:{t:0,p:0} }` — 없으면 그 자리에서 만들어요 |

- **`schemaVersion` 안 만들었습니다.** `id`도 하나도 안 바꿨어요
- 스탯 읽기는 §9-2 규칙 6대로 **나머지 평균**입니다. `|| 0` 안 씁니다:
  ```js
  function statReader(stats) {
    const have = Object.keys(stats || {}).filter((k) => typeof stats[k] === "number" && isFinite(stats[k]));
    const avg = have.length ? have.reduce((a, k) => a + stats[k], 0) / have.length : 40;
    return (k) => (stats && typeof stats[k] === "number" && isFinite(stats[k]) ? stats[k] : avg);
  }
  ```
  검증: `speed` 없는 stats(전부 80) → `blend = 80` · 한 경기 완주 · **NaN 0건** ✅
  `stats`가 빈 객체여도 40으로 떨어지고 안 죽어요 ✅
- 가중 카운터를 새로 더한 곳은 없습니다(`moments`는 새 축이라 이어받을 옛 카운터가 없어요)

---

## 4. 🔴 판단이 필요합니다 — 제가 정하지 않았습니다

| # | 항목 | 누구에게 | 언제까지 |
|---|---|---|---|
| ① | **STEP 3에 `condMul`을 거나** — §2-4 산식과 §2-7 표가 어긋납니다. §2-7을 따랐어요 | designer | 실측 ① **전에** |
| ② | **`MAKER_W`를 `posW`에 곱하나** — §3-2와 §2-4가 어긋납니다. 안 곱했어요 | balancer | 실측 ① **전에** |
| ③ | **`momAdj`를 0으로 둔 게 맞나** — `RATE`의 `b` 재적합 때 이 항이 들어 있었나요 | balancer | 실측 ① **전에** |
| ④ | **추가시간 카드(9번째)를 넣나** — 넣으면 생산량이 늘어 곡선이 움직여요 | designer·balancer | 실측 ① 결과 보고 |
| ⑤ | **🅰️ 전개 카드의 도움이 두 갈래에서 4~5배 다릅니다** — §2-6 표를 지키면 피할 수 없어요. 검사 10번의 ±3%가 이 항목에서 성립하지 않을 수 있습니다 | balancer·inspector | 실측 ① 결과 보고 |
| ⑥ | **`MOM_MIN 7.6`은 제안값 그대로** 넣었습니다 — K1 기준 6% 근처가 되는 값으로 확정해 주세요 | balancer | 실측 ① |

---

## 5. 안 한 것 (범위 밖 · 의도적)

| # | 무엇 | 왜 |
|---|---|---|
| ① | **미니게임 4종** (`winger-moment.js`) | 다음 단계. **인터페이스만 뚫어 뒀습니다** — `WingerEngine.setMini(fn)`, `fn(container, opts, cb)` → `cb("perfect"\|"ok"\|"miss")`. 지금은 `m.autoJudge()`(조작 0.5)로 돕니다. ⚠️ 그 파일을 만들 때 **`sw.js`의 `ASSETS`에 손으로** 넣으세요 |
| ② | **경기 화면** (`match-scene.js`) | director 몫. `runV2Match`가 `window.W2Scene`을 찾아 쓰고, 없으면 최소 피드로 돕니다. **그 파일이 붙으면 `fallbackLine`을 지워 주세요** — 주석에 적어 뒀어요 |
| ③ | **🏆 컵 · 🌏 월드컵 · 🏫 유스 경기** | 아직 `matchContribution` + `deriveOppGoals` + `MatchSim`을 씁니다. 설계 §11의 1차 순서가 **리그 경기 엔진**만 §1에 뒀어요. ⚠️ **지금 winger2는 리그와 컵이 다른 산식으로 돕니다** — 곡선을 잴 때 리그만 재세요 |
| ④ | **나이 축 · 성향 · 특능 · 유망주** | §11의 4~7번. `traitMul`·`trustMul`은 STEP 3에서 **1로 두고** 자리만 비워 뒀습니다(값이 0인 배선을 만들지 않았어요) |
| ⑤ | **`tests/winger2/`** | inspector 몫. `_t` 창구는 전부 열어 뒀습니다 — `WingerCareer._t`에 `playShow`·`benchShow`·`runV2Match`·`proMatchFinalize`·`engRow`·`clubRows`·`MOM_MIN`·`CARD_DELAY`를 추가했어요 |
| ⑥ | **`beta/winger2/index.html`의 `theme-color` · `manifest.webmanifest`** | **director 담당으로 합의**했습니다. 손대지 않았어요 |

---

## 6. 검증

### 6-1. 돌린 것

| 검사 | 결과 |
|---|---|
| 문법 (`new Function`으로 4개 파일) | ✅ |
| `node tests/smoke-test.js beta` | ✅ 9종 |
| `node tests/check-page-test.js` | ✅ |
| `tests/cloud/cloud-wire-test.js` · `help-section-test.js` | ✅ |
| **JSDOM으로 winger2를 실제로 띄워 4포지션 경기 완주** | ✅ (아래) |
| 시드 재현 | ✅ 같은 시드 → 카드 종류·결과·분이 완전 일치 |
| 옛 세이브(`speed` 없음) NaN | ✅ 0건 |

**JSDOM 배선 검사** (`playShow`가 가는 길 그대로 — 게임 입구를 통해):
```
✅ engine.js가 페이지에 로드된다
✅ runV2Match가 배선돼 있다
✅ 클럽 득점 = 선수 골 합 (어긋난 곳: 없음)
✅ 리그 득점 100 = 리그 실점 100
✅ 차단 기록이 쌓인다      ✅ 도움 기록이 쌓인다
✅ fw — 경기가 끝까지 돌고 proMatchFinalize가 불린다
   → 골 1 도움 0 차단 0 · 순간 {"g":{"t":2,"p":1},"a":{...},"d":{...}}
✅ wg / mf / df — 같음
```
스크립트는 스크래치패드에만 뒀습니다(`tests/`에 안 넣었어요 — 검사 작성은 inspector 몫이고, **변이 검증이 없는 검사를 저장소에 남기면 그게 바로 "초록불인데 아무것도 안 지키는 검사"**가 됩니다).

### 6-2. 엔진 단독 실측 (각 2,000경기 · 시드 고정 · 조작 0.5 · 클럽을 능력치에 맞춰 세움)

**balancer의 곡선 검증이 아니라 "엔진이 사람처럼 도는가"를 본 값입니다.** 실측 ①은 balancer 몫이에요.

| 포지션 | 능력치 | 내 골 | 도움 | 차단 | 순간 카드 |
|---|---|---|---|---|---|
| fw | 70 / 110 / 130 / 150 | 0.33 / 0.47 / 0.57 / 0.61 | 0.07 / 0.09 / 0.12 / 0.14 | 0.04 / 0.04 / 0.07 / 0.07 | 0.85 / 0.90 / 0.99 / 1.03 |
| wg | 70 / 110 / 130 / 150 | 0.06 / 0.09 / 0.12 / 0.14 | 0.57 / 0.79 / 0.91 / 0.91 | 0.04 / 0.05 / 0.07 / 0.10 | 0.86 / 0.95 / 1.06 / 1.08 |
| mf | 70 / 110 / 130 / 150 | 0.04 / 0.05 / 0.07 / 0.07 | 0.18 / 0.85 / 0.93 / 1.06 | 0.09 / 0.12 / 0.17 / 0.20 | 0.44 / 1.01 / 1.15 / 1.26 |
| df | 70 / 110 / 130 / 150 | 0.01 / 0.01 / 0.02 / 0.02 | 0.04 / 0.06 / 0.09 / 0.10 | 0.66 / 0.96 / 1.18 / 1.34 | 1.50 / 1.65 / 1.75 / 1.86 |

읽을 것 셋:

1. **전 포지션·전 능력치에서 단조증가**입니다 (검사 2번·13번의 뼈대)
2. **순간 카드 빈도가 §5-2 실측표보다 낮습니다** — 특히 능력치 70 mf가 0.44 (설계표 0.88).
   제 픽스처는 6스탯이 전부 같은 값이라 `blend`가 평평하고, 동료 `str`도 한 값으로 고정이에요.
   **실제 명단은 `STR_SPREAD ±14`로 흩어집니다** — 그래서 이 표는 balancer의 실측표를 대체하지 못해요.
   ⚠️ **실측 ①에서 검사 13번(≥ 0.6회/경기)을 반드시 다시 재 주세요.**
3. 내 골 130 fw가 경기당 0.57 → **38라운드 21.7골** (balancer 목표 18.7). 밴드 위쪽이에요.
   위 ①~③의 판단(특히 `momAdj`·`MAKER_W`)이 여기를 움직입니다

### 6-3. 안 돌린 것

`tests/soccer/*` 60여 개 — **`beta/soccer/`를 한 글자도 안 건드렸으므로** 영향 범위 밖입니다.
(`tests/soccer/curve-test.js`는 inspector가 작업 중인 파일이라 손대지 않았어요.)

---

## 7. 건드린 파일 전체

**새로 만든 것**
```
beta/winger2/engine.js                              (신규 · 전용)
docs/superpowers/_workspace/31_engineer_match-engine.md
```

**고친 것 (전부 `beta/winger2/` 안)**
```
beta/winger2/career.js     엔진 어댑터 · recordRound · leagueRound · playShow(runV2Match)
                           · benchShow · proMatchFinalize · 확정 계수 4건 · 폐기 6함수
beta/winger2/squad.js      FOOT_FIT 0.04 → 0.10
beta/winger2/index.html    <script src="engine.js"> 한 줄
beta/winger2/sw.js         ASSETS에 "./engine.js"
```

**손대지 않은 남의 작업** (`git status`에 떠 있지만 제 것이 아닙니다)
```
CLAUDE.md · .claude/ · .gitignore · scripts/shoot.js
tests/soccer/curve-test.js
beta/_check.html · beta/cloud.js · beta/index.html · beta/stats/index.html
scripts/sync-beta.sh · tests/smoke-test.js · tests/cloud/*.js · tests/idol/tour-mech-test.js
                                                          (← 이 여덟은 30번에서 제가 고친 등록 지점)
```

**커밋 안 했습니다.** 커밋하실 때 경로를 적어 주세요 — `git add -A`는 위 넷을 딸려 갑니다.

```bash
git add beta/winger2/ docs/superpowers/_workspace/31_engineer_match-engine.md
```

---

## 8. director와 맞춘 카드 객체 (오케스트레이터 경유)

director가 낸 이름을 **그대로 채택**했습니다. 다른 곳만 적어요 — 자세한 건 회신 메시지에 있습니다.

| 필드 | 값 |
|---|---|
| `kind` | `"goal"` · `"assist"` · `"defend"` · `"filler"` · `"half"` · `"end"` · `"kick"` — **셋 다 엔진이 냅니다** |
| `score` | `[우리, 상대]` — **카드마다** 그 시점 확정 스코어 |
| `stake` / `stakeKey` | 한국어 문구 / 코드. **문자열 비교는 `stakeKey`로** |
| `by` / `pos` | 그 카드의 **주인공**. 골 넣은 사람은 `goalBy`, 도움은 `assistBy` |
| `result` | `"goal"` · `"assist"` · `"shot"` · `"save"` · `"concede"` · `"none"` |
| `goAhead` | 그 순간 앞서 나간 골 — **카드 시점에 참** |
| `decisive` | 결승골 — **경기가 끝날 때 되채워집니다.** 연출은 `end` 카드에서 |
| `credit` | `{g, a, d}` — 이 카드로 **내가** 얻은 것 |
| `min` | `end` 카드는 1점 차 이내면 `91~94` (추가시간 표시) |

드라이버(`career.js`의 `runV2Match`)가 부르는 것:
```js
W2Scene.mount(container, { home, away, myName })
W2Scene.push(card)        // thenable을 돌려주면 그걸 기다립니다 (권장)
W2Scene.summary({ mineCards, mineSuccess })
W2Scene.momentSlot()      // 선택. 없으면 #stage-moment
```

---

## 관련

- 설계: `13_designer_v2-final.md` §2 · §3 · §9 · §10
- 계수 원본: `21_balancer_revised-engine.md`
- 앞 단계: `30_engineer_scaffold.md`
- 다음: 🔴 **실측 ①** (balancer) — 위 §4의 판단 6건이 그 앞에 있습니다
