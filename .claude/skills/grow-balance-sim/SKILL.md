---
name: grow-balance-sim
description: "grow-games의 밸런스를 몬테카를로로 실측하는 절차와 코드 템플릿. 성장 곡선·수상 확률·생산량 분포를 재거나, 계수를 바꾸거나, 새 배수·가중·트레잇을 도입할 때 반드시 사용할 것. '밸런스 확인', '곡선 재기', '수치 조정', '이 값이 맞나', '너무 쉽다/어렵다', '수상 확률', '성장 속도' 요청에 사용한다. 이 저장소는 밸런스를 감이 아니라 실측으로 잡는다."
---

# 밸런스 실측

**이 저장소의 철칙: 밸런스 수치는 감이 아니라 몬테카를로 실측으로 잡는다.**
바꿀 땐 곡선을 다시 재고 근거를 남깁니다.

## 순서

1. **의존 관계를 먼저 적는다** — 이 계수를 바꾸면 무엇이 같이 움직이는가
2. **중립 검증** — 새 축이 기본 상태의 기댓값을 흔들지 않는가
3. **곡선 측정** — 능력치 구간별로
4. **옛 세이브 검증** — 새 필드가 `undefined`일 때 무너지지 않는가
5. **장기 드리프트** — 누적되는 값은 20시즌 굴려 보기
6. **근거 기록**

## 1. 산식은 소스에서 뜯어온다 — 값을 복사하지 않는다

값을 옮겨 적으면 원본이 바뀌어도 시뮬레이션이 옛 값을 계속 잽니다.

```js
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  rateTbl: grab(SRC, /const RATE = \{[\s\S]*?\n  \};/),
  axisTbl: grab(SRC, /const POS_AXIS = \{[\s\S]*?\n  \};/),
  axisK:   grab(SRC, /const AXIS_K = [^;]+;/),
  axisOff: grab(SRC, /const AXIS_OFF = [^;]+;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`);
  process.exit(1);   // 손으로 옮겨 적어 진행하지 마세요 — 여기가 함정입니다
}
```

**정규식이 안 맞으면 그 자리에서 멈추고 보고하세요.** 게임이 움직이면 뜯어오는 범위도
따라 움직여야 합니다 — 이걸 안 해서 축구 검사 열 개가 여러 커밋 동안 죽어 있었습니다.

## 2. 직접 `eval` 금지 — `new Function` + `return`

```js
// ❌ 선언이 eval 스코프에 갇혀 값이 항상 undefined. 산식을 뭘로 바꾸든 통과합니다
eval(parts.axisK); console.log(AXIS_K);

// ✅
const hypeOf = new Function("act", "pos", "prestige", "clamp", `
  ${parts.axisTbl}
  ${parts.axisK}
  ${parts.axisOff}
  const axis = POS_AXIS[pos];
  const raw = (act.g * axis.g + act.a * axis.a + act.d * axis.d) / axis.n;
  return clamp(Math.log(Math.max(1, raw * prestige)) * AXIS_K - AXIS_OFF, -1.5, 12);
`);
```

## 3. 중립 검증 — 여기가 빨간불이면 아래는 볼 것도 없다

새 배수·가중·트레잇을 도입하면, **아무 효과도 없는 기본 상태에서 이전과 같은 값이
나오는지** 먼저 재세요.

세부 자리를 넣을 때 가중의 평균을 1로 안 맞춰 **골든부츠 수상률이 43% → 60%로 튀었습니다.**
자리를 얹는 것만으로 그 포지션이 세지면 안 되니까요.

```js
// 새 가중표의 평균이 1인지
for (const pos of ["fw", "wg", "mf", "df"]) {
  const slots = SLOTS.filter((s) => s.pos === pos);
  for (const key of ["g", "a", "d"]) {
    const avg = slots.reduce((sum, s) => sum + s[key], 0) / slots.length;
    console.log(`${pos}.${key} 평균 ${avg.toFixed(4)}`, Math.abs(avg - 1) < 1e-6 ? "✅" : "❌");
  }
}
```

## 4. 곡선 측정

```js
const N = 20000;   // 최소. 3%p 수준의 차이를 보려면 더 필요합니다
const CURVE = [70, 90, 110, 130, 150];

for (const ovr of CURVE) {
  let win = 0;
  for (let i = 0; i < N; i++) if (simulateSeason(ovr).award) win++;
  console.log(`능력치 ${ovr} → ${(win / N * 100).toFixed(1)}%`);
}
```

**목표 곡선** (`분석 — 순위 천장과 성장 곡선`의 합의된 기준):

| 능력치 | 최상위 상 확률 |
|---|---|
| 70 | 5% 안팎 |
| 90 | 25% 안팎 |
| 110 | 60% 안팎 |
| 130 | 85% 안팎 |
| 150 | **계속 오름** |

**150에서도 오르는 것이 핵심입니다.** 능력치를 90에서 150으로 올려도 76%로 평평했던
사고가 이 목표의 출발점이에요. 평평해지면 그 위로 키울 이유가 사라집니다.

> 확률은 100%를 못 넘으므로 아주 위쪽은 결국 완만해집니다.
> 그 구간은 후반 콘텐츠(대회·해금)가 받아야 합니다 — 계수로 뚫으려 하지 마세요.

## 5. 옛 세이브 검증 — 가장 큰 사고 유형

진행 중인 캐릭터가 새 산식에서 갑자기 무명이 되는 것. 새 필드를 `undefined`로 두고
산식을 통과시켜 보세요.

```js
const oldSave = { stats: {...}, career: {} };   // traits·growthType 등 새 필드 없음
const before = hypeOld(oldSave);
const after  = hypeNew(oldSave);
console.log(`옛 세이브: ${before.toFixed(2)} → ${after.toFixed(2)} (차이 ${(after-before).toFixed(2)})`);
```

차이가 크면 **읽는 쪽 기본값**을 조정하세요. 마이그레이션은 하지 않습니다.

> 없던 스탯을 추가할 때 나머지의 평균으로 채우면 종합이 안 흔들립니다 —
> `(합 + 평균) ÷ (n+1) = 평균`이라 소수점까지 그대로예요. 스피드를 넣을 때 쓴 방법입니다.

## 6. 장기 드리프트 — 누적되는 값은 20시즌 굴린다

동료 성장에서 신인 `peak`을 "지금 실력 ÷ 나이곡선"으로 되계산했더니
열여덟 신인의 peak이 클럽 전력의 1.47배가 되어 **20시즌에 리그 평균이 +13.8까지
부풀었습니다.** 눈금을 뒤집어(클럽 전력에서 굴리고 나이 분포로 되올림) +0.66으로 잡았어요.

```js
let league = initialLeague();
for (let y = 0; y < 20; y++) league = advanceSeason(league);
console.log(`20시즌 평균 이동: ${(avg(league) - avg(initialLeague())).toFixed(2)}`);
```

## 7. 하나만 바꾸고 잰다

두 계수를 같이 움직이면 어디서 틀어졌는지 못 찾습니다.
서로 얽힌 것은 **의존 관계를 먼저 적고** 순서대로 재세요.

축구의 실제 의존 사슬 (`game.js`의 `GOAL_SCALE` 주석):
```
GOAL_SCALE 변경 → 생산량 변화 → AXIS_OFF 재보정 필요 → 부문상 문턱 재보정 → 장비값 재보정
```

38라운드로 늘릴 때 `AXIS_OFF`(4.19 → 7.71) · 부문상 문턱 3배 · 장비값 3.2배가
**함께** 움직였습니다.

## 기록 형식

시뮬레이션 스크립트는 스크래치패드에 두고 (저장소를 더럽히지 않습니다),
결과는 `docs/superpowers/_workspace/{NN}_balancer_{주제}.md`에:

```markdown
# 실측 — {주제}

## 무엇을 쟀나
{파일:줄번호}의 {산식}을 정규식으로 뜯어와 굴렸어요. 표본 N=20,000.

## 의존 관계
{이 계수를 바꾸면 함께 움직이는 것}

## 중립 검증
{새 축이 기본 상태를 흔들지 않는지}

## 측정값
| 능력치 | 측정 | 목표 |
|---|---|---|

## 판정
통과 / 계수 조정 필요 / 설계 재검토 필요 — {근거}

## 확정 계수
{상수명} = {값}  ({파일:줄번호})
```

**목표에 도달하는 계수가 없으면 설계 문제입니다.** 계수를 억지로 짜내지 말고
designer에게 되돌리세요. 계수 하나가 여러 곡선을 동시에 흔들어 어느 쪽도 못 맞추면
무엇을 포기할지는 **사용자 판단**입니다 — 양쪽 측정값을 나란히 제시하세요.

## 실측 결과는 테스트로 굳힌다

잰 곡선이 회귀하지 않게 `tests/{game}/`에 회귀 테스트를 남기세요.
작성 방법은 `grow-test-writing` 스킬을 따릅니다.
