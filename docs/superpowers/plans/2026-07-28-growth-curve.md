# 성장 곡선 구현 계획 (아이돌 먼저)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이돌의 연말 평가를 순위 기반에서 **초동 판매량**이라는 고유 축으로 옮겨, 능력치를 올린 만큼 결과가 계속 좋아지게 한다. 그다음 월드투어를 후반 목표로 얹는다.

**Architecture:** 지금은 `hype`(순위 누적) → `sales`(파생) 순서다. 이걸 뒤집어 `sales`(능력치에서 직접) → `hype`(sales의 로그) 순서로 만든다. 순위는 회차 연출로 남기고 연말 평가에서만 뺀다. `S.career.sales`가 이미 누적되고 있어 새 저장 필드가 필요 없다.

**Tech Stack:** 바닐라 JS (빌드 없음), node 스크립트 검증, jsdom

## Global Constraints

- 설계 근거는 `docs/superpowers/specs/2026-07-27-growth-curve-design.md`. 충돌 시 스펙이 우선한다.
- **베타에만 작업한다.** `beta/` 밖(루트) 파일은 절대 건드리지 않는다.
- **이번 계획은 아이돌만 건드린다.** 나머지 5종과 `rookie`·`unicorn`은 손대지 않는다.
- 저장 데이터에 **새 필드를 만들지 않는다.** `S.career.sales`·`S.career.years[].sales`·`S.fandom`을 그대로 쓴다. 진행 중인 캐릭터가 축 도입으로 갑자기 나빠지면 안 된다.
- 빌드 도구·번들러·npm 의존성을 추가하지 않는다.
- 주석과 사용자 문구는 한국어, 기존 파일의 "~요" 말투.
- 밸런스 수치는 전부 시뮬레이션으로 맞춘다. 감으로 정하지 않는다.
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## File Structure

| 파일 | 책임 |
|---|---|
| `beta/idol/career.js` (수정) | 판매량 산식, hype 산식, 라이벌 성장, 월드투어 |
| `beta/idol/index.html` (수정) | 월드투어 화면 |
| `beta/base.css` (수정) | 월드투어 전용 스타일 |
| `tests/idol/` (신규) | 곡선 시뮬레이션과 jsdom 검증 |

---

### Task 1: 판매량을 능력치에서 직접 뽑는다

**Files:**
- Modify: `beta/idol/career.js:349`
- Test: `tests/idol/axis-test.js` (신규)

**Interfaces:**
- Produces: 컴백 종료 시 `cbSales`가 능력치·팬덤에서 직접 나온다. `hype`에 의존하지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/idol/axis-test.js`:

```js
/* 축(초동 판매량)이 능력치에서 직접 자라는지 본다.
 * 지금은 hype에서 파생돼서, 능력치를 올려도 hype가 천장에 붙으면 같이 멈춘다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");

// 산식만 떼어내 실행한다 (원본과 어긋나면 의미가 없으니 복사가 아니라 추출)
const m = SRC.match(/const cbSales = [^;]+;/);
if (!m) { console.log("❌ cbSales 산식을 못 찾았어요"); process.exit(1); }

const rand = (a, b) => a + Math.random() * (b - a);
const calc = (S, act) => {
  let cbSales;
  eval(m[0]);
  return cbSales;
};

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// 능력치만 다르고 나머지가 같은 두 상황
const mk = (stat) => ({
  S: { fandom: 1000, stats: { vocal: stat, dance: stat, rap: stat, charm: stat, stamina: stat } },
  act: { cbWins: 6, cbHype: 8 },
});
const avg = (stat, n = 400) => {
  let s = 0;
  for (let i = 0; i < n; i++) { const x = mk(stat); s += calc(x.S, x.act); }
  return s / n;
};

const lo = avg(70), hi = avg(130);
check(hi > lo * 1.3, `능력치 130이 70보다 판매량이 30% 넘게 많다 (${lo.toFixed(0)} → ${hi.toFixed(0)})`);
check(!/cbHype/.test(m[0]), `판매량이 hype에 의존하지 않는다 — "${m[0]}"`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node tests/idol/axis-test.js`
Expected: FAIL — 두 단언 모두 빨강. 지금 산식은 `act.cbHype * 4`를 쓰고 능력치가 안 들어간다.

- [ ] **Step 3: 산식 교체**

`beta/idol/career.js:349`를 아래로 바꾼다.

```js
        /* 초동 판매량 — 이 게임의 고유 축이에요.
         * 예전에는 hype에서 파생됐는데, hype가 순위 기반이라 천장에 붙으면
         * 판매량도 같이 멈췄어요. 이제 능력치에서 직접 자라요.
         *   매력 → 화제성, 무대 완성도(보컬·댄스·랩) → 음악적 완성도,
         *   팬덤 → 초동을 받쳐주는 고정층
         * 상한이 없어서 능력치를 올린 만큼 계속 커져요. */
        const stage = (S.stats.vocal + S.stats.dance + S.stats.rap) / 3;
        const cbSales = Math.max(1, Math.round(
          S.stats.charm * 0.55 + stage * 0.75 + S.fandom * 0.05 + act.cbWins * 4 + rand(-4, 4)
        ));
```

- [ ] **Step 4: 통과 확인**

Run: `cd /workspace/grow-games && node tests/idol/axis-test.js`
Expected: 두 단언 모두 ✅

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/idol/career.js tests/idol/axis-test.js
git commit -m "$(cat <<'EOF'
feat(베타/아이돌): 초동 판매량을 능력치에서 직접 뽑아요

예전에는 hype에서 파생됐어요. hype가 순위 기반이라 천장에 붙으면
판매량도 같이 멈춰서, 능력치를 더 올릴 이유가 없었어요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: hype를 판매량에서 뽑는다

**Files:**
- Modify: `beta/idol/career.js:389`
- Test: `tests/idol/curve-test.js` (신규)

**Interfaces:**
- Consumes: Task 1의 `cbSales`
- Produces: `hype`가 그해 판매량의 로그 스케일. 능력치 150에서도 계속 오른다.

- [ ] **Step 1: 곡선 검증 스크립트 작성**


> ⚠️ **산식을 떼어내 실행하는 방법에 주의.** 직접 `eval("const x = …")`은
> `const`/`let`이 eval 자신의 스코프에 갇혀 바깥 변수로 안 나온다. Task 1에서
> 실제로 걸렸다. `new Function(...)`으로 감싸 값을 `return` 받아야 한다.
> `tests/idol/axis-test.js`가 그렇게 되어 있으니 **그 파일을 먼저 읽고 같은 방식을 쓸 것.**

`tests/idol/curve-test.js`:

```js
/* 목표 곡선(스펙 4.5)과 대조한다.
 *   능력치 70 → 대상 5% 안팎 / 90 → 25% / 110 → 60% / 130 → 85% / 150 → 계속 오름
 * 핵심은 마지막 줄이다. 지금은 90부터 76%로 평평하다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const salesM = SRC.match(/const stage = [^;]+;\s*const cbSales = [^;]+;/);
const hypeM = SRC.match(/const hype = clamp\([^;]+;/);
if (!salesM || !hypeM) { console.log("❌ 산식을 못 찾았어요"); process.exit(1); }

function year(stat, fandom) {
  const S = { fandom, stats: { vocal: stat, dance: stat, rap: stat, charm: stat, stamina: stat }, proYear: 5 };
  let total = 0;
  for (let cb = 0; cb < 2; cb++) {
    const act = { cbWins: Math.round(rand(2, 6)) };
    let stage, cbSales;
    eval(salesM[0]);
    total += cbSales;
  }
  const act = { sales: total };
  const agePen = 0;
  let hype;
  eval(hypeM[0]);
  return hype;
}
const dae = (h) => { const lb = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8))); return h >= 5.5 && h >= lb; };

const TARGET = { 70: [0, 15], 90: [12, 40], 110: [45, 75], 130: [70, 95] };
let fail = 0, prev = -1;
console.log("능력치  대상%   목표      hype");
for (const stat of [70, 90, 110, 130, 150]) {
  const fandom = stat * 25;
  let d = 0, hs = 0; const N = 3000;
  for (let i = 0; i < N; i++) { const h = year(stat, fandom); hs += h; if (dae(h)) d++; }
  const pct = Math.round(d / N * 100), hy = hs / N;
  const t = TARGET[stat];
  const ok = !t || (pct >= t[0] && pct <= t[1]);
  if (!ok) fail++;
  console.log(`${String(stat).padStart(5)}  ${String(pct).padStart(4)}%  ${t ? `${t[0]}~${t[1]}%` : "  오름  "}  ${hy.toFixed(1)}  ${ok ? "✅" : "❌"}`);
  if (hy <= prev) { console.log(`   ❌ 능력치 ${stat}에서 hype가 안 올랐어요 (${prev.toFixed(1)} → ${hy.toFixed(1)})`); fail++; }
  prev = hy;
}
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 목표 곡선에 맞아요");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node tests/idol/curve-test.js`
Expected: FAIL — 아직 `hype`가 `act.hypeSum`을 쓰므로 `act.sales`를 안 본다.

- [ ] **Step 3: hype 산식 교체**

`beta/idol/career.js:389`를 아래로 바꾼다.

```js
    /* 연말 평가는 그해 초동 판매량이 정해요.
     * 순위(hypeSum)는 회차 화면의 긴장감으로 남기고 여기서는 안 써요 —
     * 순위는 1위 위가 없어서 본질적으로 천장이 있거든요.
     * 판매량은 상한이 없지만 후반에 기하급수로 커지니 로그로 눌러요.
     * 선형으로 재면 10년차에 hype가 수백이 돼요. */
    const hype = clamp(Math.log(Math.max(1, act.sales)) * 2.4 - 6.2 - agePen, -1.5, 12);
```

- [ ] **Step 4: 곡선 맞추기**

Run: `cd /workspace/grow-games && node tests/idol/curve-test.js`

계수 `2.4`와 `-6.2`를 조정해 목표 구간에 넣는다. **감으로 고치지 말고 스크립트를 반복 실행해 맞춘다.** 마지막 줄(150에서도 hype가 오르는가)이 가장 중요하다.

Expected: 모든 줄 ✅

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/idol/career.js tests/idol/curve-test.js
git commit -m "$(cat <<'EOF'
feat(베타/아이돌): 연말 평가를 순위가 아니라 판매량으로

순위는 1위 위가 없어서 본질적으로 천장이 있어요. 그래서 능력치 90·110·130이
대상 확률 75·76·76%로 같았어요. 이제 그해 판매량의 로그로 재요.

순위는 회차 화면의 긴장감으로 그대로 남겨요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 라이벌이 해마다 강해진다

**Files:**
- Modify: `beta/idol/career.js:90-92`
- Test: `tests/idol/rival-test.js` (신규)

**Interfaces:**
- Consumes: `S.proYear`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/idol/rival-test.js`:

```js
/* 라이벌이 해마다 강해지는지. 멈춰 있으면 뒤처져야 후반에도 키울 이유가 남는다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");
const m = SRC.match(/function rollRivals\(\)[\s\S]*?\n  \}/);
if (!m) { console.log("❌ rollRivals를 못 찾았어요"); process.exit(1); }

const rand = (a, b) => a + Math.random() * (b - a);
const RIVAL_GROUPS = ["A", "B", "C", "D", "E"];
let S;
const rollRivals = new Function("rand", "RIVAL_GROUPS", "getS", `${m[0]}; return () => { S = getS(); return rollRivals(); };`)(rand, RIVAL_GROUPS, () => S);

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const avgPop = (yr) => {
  S = { proYear: yr };
  let s = 0, n = 400;
  for (let i = 0; i < n; i++) s += rollRivals().reduce((a, r) => a + r.pop, 0) / RIVAL_GROUPS.length;
  return s / n;
};

const y1 = avgPop(1), y5 = avgPop(5), y9 = avgPop(9);
check(Math.abs(y1 - 70) < 3, `1년차는 지금과 같다 (${y1.toFixed(1)})`);
check(y5 > y1 * 1.08, `5년차가 1년차보다 8% 넘게 강하다 (${y1.toFixed(1)} → ${y5.toFixed(1)})`);
check(y9 > y5, `9년차가 5년차보다 강하다 (${y5.toFixed(1)} → ${y9.toFixed(1)})`);
check(y9 < y1 * 1.4, `9년차가 1년차의 1.4배를 넘지 않는다 — 너무 가파르면 중위권이 무너져요 (${(y9 / y1).toFixed(2)}배)`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node tests/idol/rival-test.js`
Expected: FAIL — 2·3번째 단언이 빨강. 지금은 연차와 무관하게 `rand(52, 88)`이다.

- [ ] **Step 3: 구현**

`beta/idol/career.js`의 `rollRivals`를 바꾼다.

```js
  function rollRivals() {
    // 해마다 3%씩 강해져요. 멈춰 있으면 밀리지만, 성실히 키우면 계속 앞서요.
    // 5%로 하면 9년차에 중위권이 무너져요 (시뮬레이션으로 확인했어요).
    const grow = 1 + Math.max(0, (S.proYear || 1) - 1) * 0.03;
    return RIVAL_GROUPS.map((name) => ({ name, pop: rand(52, 88) * grow }));
  }
```

- [ ] **Step 4: 통과 확인**

Run: `cd /workspace/grow-games && node tests/idol/rival-test.js`
Expected: 네 단언 모두 ✅

- [ ] **Step 5: 곡선 재확인**

라이벌이 강해지면 1위 횟수가 줄고, 그게 판매량(`act.cbWins * 4`)에 영향을 준다.

```bash
cd /workspace/grow-games
node tests/idol/curve-test.js
```
Expected: 여전히 목표 구간 안. 벗어나면 Task 2의 계수를 다시 맞춘다.

- [ ] **Step 6: 커밋**

```bash
cd /workspace/grow-games
git add beta/idol/career.js tests/idol/rival-test.js
git commit -m "$(cat <<'EOF'
feat(베타/아이돌): 라이벌이 해마다 3%씩 강해져요

예전엔 매년 rand(52,88)로 똑같이 굴려서 플레이어만 성장했어요.
이제 멈춰 있으면 밀려요. 5%는 9년차에 중위권이 무너져서 3%로 잡았어요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 기존 저장 데이터가 안 나빠지는지 확인

**Files:**
- Test: `tests/idol/legacy-test.js` (신규)

새 필드를 만들지 않았으므로 마이그레이션 코드는 없다. **정말 없어도 되는지 확인하는 태스크다.**

- [ ] **Step 1: 검증 스크립트 작성**


> ⚠️ **산식을 떼어내 실행하는 방법에 주의.** 직접 `eval("const x = …")`은
> `const`/`let`이 eval 자신의 스코프에 갇혀 바깥 변수로 안 나온다. Task 1에서
> 실제로 걸렸다. `new Function(...)`으로 감싸 값을 `return` 받아야 한다.
> `tests/idol/axis-test.js`가 그렇게 되어 있으니 **그 파일을 먼저 읽고 같은 방식을 쓸 것.**

`tests/idol/legacy-test.js`:

```js
/* 진행 중인 캐릭터가 이번 변경으로 갑자기 나빠지지 않는지.
 * 축을 새 필드로 만들지 않고 이미 누적되던 S.career.sales와
 * 그해 act.sales를 그대로 쓰기 때문에, 원래 없어야 할 문제다.
 * 하지만 "없을 것이다"와 "없다"는 다르므로 실제로 확인한다. */
"use strict";
const fs = require("fs");
const path = "/workspace/grow-games/beta/idol/career.js";
const SRC = fs.readFileSync(path, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// 저장 구조를 건드리지 않았는지
check(!/S\.career\.axis|S\.axis|axisScore/.test(SRC), "새 저장 필드를 만들지 않았다");
check(/S\.career\.sales \+= sales;/.test(SRC), "S.career.sales 누적이 그대로다");
check(/years\.push\(\{ y: S\.proYear[^}]*sales/.test(SRC), "연차 기록에 sales가 그대로 남는다");

// 5년차 진행 중인 세이브를 흉내 내 연말을 돌려도 터지지 않는지
const hypeM = SRC.match(/const hype = clamp\([^;]+;/);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const act = { sales: 180 };      // 옛 산식으로 쌓인 값의 범위
const agePen = 0;
let hype;
eval(hypeM[0]);
check(Number.isFinite(hype), `옛 판매량으로도 hype가 정상 (${hype.toFixed(1)})`);
check(hype > 0, `옛 판매량 180이 음수로 떨어지지 않는다 (${hype.toFixed(1)})`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실행**

Run: `cd /workspace/grow-games && node tests/idol/legacy-test.js`

Expected: 다섯 단언 모두 ✅.

**마지막 두 줄이 빨간색이면 멈춘다.** 옛 세이브의 판매량 범위가 새 hype 산식에서
음수로 떨어진다는 뜻이고, 그러면 진행 중인 캐릭터가 갑자기 무명이 된다.
그 경우 Task 2의 `-6.2` 오프셋을 낮춰 옛 범위를 받아주도록 고친다.

- [ ] **Step 3: 실제 게임 흐름 회귀**

```bash
cd /workspace/grow-games
node --check beta/idol/career.js
node --check beta/idol/game.js
```
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
cd /workspace/grow-games
git add tests/idol/legacy-test.js
git commit -m "$(cat <<'EOF'
test(베타/아이돌): 진행 중인 캐릭터가 축 변경으로 나빠지지 않는지

새 저장 필드를 안 만들었으니 원래 문제가 없어야 하는데,
"없을 것이다"와 "없다"는 달라서 실제로 확인해요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 월드투어 — 열림 조건과 상태

**Files:**
- Modify: `beta/idol/career.js`
- Test: `tests/idol/tour-test.js` (신규)

**Interfaces:**
- Produces: `tourReady()` · `S.tour` · `S.career.tours`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/idol/tour-test.js`:

```js
/* 월드투어 열림 조건과 진행. 열림 수치는 임시라, 여기서는 "조건이 동작하는지"만 본다.
 * 몇 년차에 열리는지는 Task 7의 페이싱 검증에서 잰다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");
const m = SRC.match(/function tourReady\(\)[\s\S]*?\n  \}/);
if (!m) { console.log("❌ tourReady를 못 찾았어요"); process.exit(1); }

let S;
const tourReady = new Function("getS", `${m[0].replace(/\bS\./g, "getS().")}; return tourReady;`)(() => S);

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const mk = (dae, fandom) => ({ career: { daesang: dae, tours: 0 }, fandom });

S = mk(0, 0);      check(!tourReady(), "갓 데뷔하면 안 열린다");
S = mk(2, 3000);   check(!tourReady(), "대상 2회 · 팬덤 3000으로는 안 열린다");
S = mk(3, 0);      check(tourReady(), "대상 3회면 열린다");
S = mk(0, 8000);   check(tourReady(), "팬덤 8000이면 열린다");
S = mk(3, 8000);   check(tourReady(), "둘 다면 당연히 열린다");

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node tests/idol/tour-test.js`
Expected: FAIL — `tourReady를 못 찾았어요`

- [ ] **Step 3: 구현**

`beta/idol/career.js`의 `finishYear` 앞에 추가한다.

```js
  /* 🌏 월드투어 — 정상에 오른 뒤에만 열리는 후반 목표예요.
   * 상을 노린 육성과 팬덤을 노린 육성 둘 다 길이 되게 '또는'으로 뒀어요.
   *
   * ⚠️ 이 수치는 임시예요. 너무 쉽게 열리면 후반 목표가 아니라 그냥 다음
   * 단계가 되고, 다 본 뒤에 할 게 없어져요. 강하게 키운 플레이어 기준
   * 6~8년차에 열리도록 Task 7에서 다시 잽니다. */
  const TOUR_DAESANG = 3;
  const TOUR_FANDOM = 8000;
  function tourReady() {
    return (S.career.daesang || 0) >= TOUR_DAESANG || (S.fandom || 0) >= TOUR_FANDOM;
  }

  // 도시 수는 팬덤이 정해요 — 4곳에서 시작해 8곳까지 늘어나요
  function tourCities() {
    return clamp(4 + Math.floor((S.fandom || 0) / 4000), 4, 8);
  }
```

`beta/idol/career.js:62`의

```js
S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0 };
```

를 아래로 바꾼다.

```js
S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0, tours: 0 };
```

**이미 진행 중인 캐릭터는 `tours`가 `undefined`다.** 읽는 쪽에서 `(S.career.tours || 0)`로
받아야 한다. 마이그레이션 코드를 넣지 않는다 — 없어도 되는 값이다.

- [ ] **Step 4: 통과 확인**

Run: `cd /workspace/grow-games && node tests/idol/tour-test.js`
Expected: 다섯 단언 모두 ✅

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/idol/career.js tests/idol/tour-test.js
git commit -m "$(cat <<'EOF'
feat(베타/아이돌): 월드투어 열림 조건

대상 3회 또는 팬덤 8000. 상을 노린 육성과 팬덤을 노린 육성 둘 다
길이 되게 '또는'으로 뒀어요. 수치는 임시라 페이싱 검증에서 다시 재요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 월드투어 — 진행과 등급

**Files:**
- Modify: `beta/idol/career.js`, `beta/idol/index.html`, `beta/base.css`
- Test: `tests/idol/tour-run-test.js` (신규)

**Interfaces:**
- Consumes: Task 5의 `tourReady()` · `tourCities()`
- Produces: 도시별 진행, 투어 등급(S/A/B/C), 팬덤·수익 반영

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/idol/tour-run-test.js`:

```js
/* 투어를 끝까지 돌려 등급과 보상이 나오는지. 실패해도 커리어가 안 끝나는지. */
"use strict";
const fs = require("fs");
const SP = "/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

const dom = new JSDOM(fs.readFileSync("/workspace/grow-games/beta/idol/index.html", "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = require("path").resolve("/workspace/grow-games/beta/idol", src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  }), { runScripts: "dangerously", url: "https://x.test/idol/" });
const w = dom.window;

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

check(!!w.Career, "Career 모듈이 로드된다");
check(typeof w.Career._t?.tourGrade === "function", "tourGrade가 노출된다");

const g = w.Career._t.tourGrade;
check(g(1.0) === "S", `전 도시 만석이면 S (${g(1.0)})`);
check(g(0.5) === "C" || g(0.5) === "B", `절반이면 B~C (${g(0.5)})`);
check(g(0) === "C", `아무도 안 오면 C (${g(0)})`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node tests/idol/tour-run-test.js`
Expected: FAIL — `tourGrade가 노출된다`가 빨강

- [ ] **Step 3: 등급 산출 구현**

```js
  /* 투어 등급 — 전체 도시의 평균 객석 점유율로 매겨요.
   * 실패해도 커리어가 끝나지 않아요. 다음 해에 다시 도전할 수 있어요. */
  function tourGrade(fillRate) {
    if (fillRate >= 0.95) return "S";
    if (fillRate >= 0.80) return "A";
    if (fillRate >= 0.60) return "B";
    return "C";
  }
```

아이돌의 `Career`는 지금 `_internals` 같은 시험용 창구가 없다(루키에만 있다).
파일 끝의 `return {...}`에 **`_t: { tourGrade, tourReady, tourCities },`** 를 추가해
검증이 산식을 직접 부를 수 있게 한다. 다른 내부 함수는 노출하지 않는다.

- [ ] **Step 4: 도시별 진행 화면**

`beta/idol/index.html`에 화면을 추가한다.

```html
    <!-- 🌏 월드투어 -->
    <section class="screen" id="screen-tour">
      <h2>🌏 월드투어</h2>
      <p class="tour-round" id="tour-city"></p>
      <div class="tour-card">
        <div class="pbp" id="tour-log"></div>
        <div id="tour-moment"></div>
        <div id="tour-result"></div>
      </div>
      <button class="btn btn-primary" id="btn-tour-go">공연하기 🎤</button>
    </section>
```

`career.js`에 진행 함수를 넣는다. 도시마다 `playRandomMini`를 한 번 돌리고,
결과가 객석 점유율을 정한다. 전 도시를 마치면 등급을 내고 `S.career.tours += 1`.

- [ ] **Step 5: CSS**

`beta/base.css`에 추가한다.

```css
/* 🌏 월드투어 — 도시별 객석 게이지 */
.tour-fill { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
.tour-fill .bar { flex: 1; }
.tour-grade { font-family: "Jua", sans-serif; font-size: 2.4rem; color: var(--accent); text-align: center; margin: 10px 0; }
```

- [ ] **Step 6: 통과 확인**

```bash
cd /workspace/grow-games
node tests/idol/tour-run-test.js
node --check beta/idol/career.js
```
Expected: 전부 ✅

- [ ] **Step 7: 커밋**

```bash
cd /workspace/grow-games
git add beta/idol/ beta/base.css tests/idol/tour-run-test.js
git commit -m "$(cat <<'EOF'
feat(베타/아이돌): 월드투어 진행과 등급

도시를 4~8곳 돌면서 도시마다 미니게임을 한 번 해요.
평균 객석 점유율로 S/A/B/C 등급이 나오고 명예의 전당에 남아요.
실패해도 커리어가 안 끝나요. 다음 해에 다시 도전할 수 있어요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 페이싱 검증과 베타 배포

**Files:**
- Test: `tests/idol/pacing-test.js` (신규)

- [ ] **Step 1: 페이싱 검증 스크립트**


> ⚠️ **산식을 떼어내 실행하는 방법에 주의.** 직접 `eval("const x = …")`은
> `const`/`let`이 eval 자신의 스코프에 갇혀 바깥 변수로 안 나온다. Task 1에서
> 실제로 걸렸다. `new Function(...)`으로 감싸 값을 `return` 받아야 한다.
> `tests/idol/axis-test.js`가 그렇게 되어 있으니 **그 파일을 먼저 읽고 같은 방식을 쓸 것.**

`tests/idol/pacing-test.js`:

```js
/* 월드투어가 몇 년차에 열리는지. 목표는 강하게 키운 플레이어 기준 6~8년차다.
 * Task 5의 수치는 임시였고, 여기서 실제 산식으로 재서 확정한다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const salesM = SRC.match(/const stage = [^;]+;\s*const cbSales = [^;]+;/);
const hypeM = SRC.match(/const hype = clamp\([^;]+;/);
const dRe = SRC.match(/const TOUR_DAESANG = (\d+);/);
const fRe = SRC.match(/const TOUR_FANDOM = (\d+);/);
const NEED_D = +dRe[1], NEED_F = +fRe[1];

function career(growth) {
  let stat = 45, fandom = 0, dae = 0;
  for (let yr = 1; yr <= 12; yr++) {
    const S = { fandom, proYear: yr, stats: { vocal: stat, dance: stat, rap: stat, charm: stat, stamina: stat } };
    let total = 0;
    for (let cb = 0; cb < 2; cb++) {
      const act = { cbWins: Math.round(rand(2, 6)) };
      let stage, cbSales; eval(salesM[0]); total += cbSales;
    }
    const act = { sales: total }, agePen = yr >= 8 ? (yr - 7) * 0.8 : 0;
    let hype; eval(hypeM[0]);
    const lb = Math.max(...Array.from({ length: 6 }, () => rand(3.5, 7.8)));
    if (hype >= 5.5 && hype >= lb) dae++;
    fandom = Math.max(0, fandom + Math.round(hype * 10));
    if (dae >= NEED_D || fandom >= NEED_F) return yr;
    stat = Math.min(150, stat + growth);
  }
  return 99;
}

let fail = 0;
console.log(`열림 조건: 대상 ${NEED_D}회 또는 팬덤 ${NEED_F}`);
for (const [label, g, lo, hi] of [["강하게(+14/년)", 14, 5, 9], ["보통(+10/년)", 10, 7, 12]]) {
  const runs = Array.from({ length: 300 }, () => career(g)).filter((y) => y < 99);
  const avg = runs.length ? runs.reduce((a, b) => a + b, 0) / runs.length : 99;
  const ok = runs.length > 150 && avg >= lo && avg <= hi;
  if (!ok) fail++;
  console.log(`${label.padEnd(16)} 평균 ${avg.toFixed(1)}년차 (도달 ${runs.length}/300) 목표 ${lo}~${hi} ${ok ? "✅" : "❌"}`);
}
console.log(fail ? "\n❌ 조건 수치를 조정하세요" : "\n✅ 페이싱 적절");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실행하고 수치 확정**

Run: `cd /workspace/grow-games && node tests/idol/pacing-test.js`

빨간색이면 Task 5의 `TOUR_DAESANG` · `TOUR_FANDOM`을 조정하고 다시 돌린다.
**확정한 뒤 스펙 5.2의 "이 숫자는 임시다" 문단을 실제 값으로 갱신한다.**

- [ ] **Step 3: 전체 검증**

```bash
cd /workspace/grow-games
for f in tests/idol/*.js; do printf "%-28s " "$(basename $f)"; node "$f" >/dev/null 2>&1 && echo "통과" || echo "❌"; done
node tests/cloud/dom-test.js "$PWD/beta/rookie" 2>&1 | grep -v scrollTo | tail -1
for f in beta/idol/*.js; do node --check "$f" || echo "FAIL $f"; done
```
Expected: 아이돌 검증 전부 통과, 루키 회귀도 통과(안 건드렸으므로), 구문 오류 없음

- [ ] **Step 4: 루트 오염 확인**

```bash
cd /workspace/grow-games
git status --short | grep -v "^ M beta/\|^?? tests/\|^ M docs/" || echo "베타·검증·문서 밖 변경 없음"
```
Expected: `베타·검증·문서 밖 변경 없음`

- [ ] **Step 5: 베타 배포**

```bash
cd /workspace/grow-games
doppler run -- git fetch origin main
git log --oneline HEAD..origin/main
```

원격에 새 커밋이 있으면 리베이스하고 검증을 전부 다시 돌린다. 없으면:

```bash
cd /workspace/grow-games
doppler run -- git push origin main
```

- [ ] **Step 6: 배포 확인**

```bash
cd /workspace/grow-games
until curl -s https://parkbeommin.github.io/grow-games/beta/idol/career.js | grep -q tourReady; do sleep 10; done
B=https://parkbeommin.github.io/grow-games/beta
printf "월드투어:     %s\n" "$(curl -s $B/idol/career.js | grep -c tourReady)"
printf "판매량 축:    %s\n" "$(curl -s $B/idol/career.js | grep -c 'S.stats.charm \* 0.55')"
printf "상용 미반영:  %s (0이어야 함)\n" "$(curl -s https://parkbeommin.github.io/grow-games/idol/career.js | grep -c tourReady)"
```

Expected: 베타는 1 이상, 상용은 0.

---

## Self-Review

**스펙 커버리지**

| 스펙 절 | 담당 |
|---|---|
| 4.2 아이돌 축 = 초동 판매량 | Task 1 |
| 4.3 hype를 축에서 뽑기 | Task 2 |
| 4.5 목표 곡선 | Task 2 Step 4, `curve-test.js` |
| 라이벌 3% 성장 | Task 3 |
| 4.6 기존 저장 데이터 | Task 4 |
| 5.2 열림 조건 | Task 5 |
| 5.3 구조·등급 | Task 6 |
| 5.2 수치 확정 | Task 7 Step 2 |

**이번 계획에서 다루지 않는 스펙 항목** (의도적)

- 4.2의 나머지 5종(주식·개발자·셰프·스트리머·축구). 아이돌이 통하는지 본 뒤 별도 계획.
- 4.4의 축구 포지션별 축. 위와 같음.

**타입 일관성:** `tourReady()`·`tourCities()`·`tourGrade(fillRate)`는 Task 5-6에서 정의하고 Task 7이 읽는다. `cbSales`는 Task 1이 만들고 Task 2가 `act.sales`로 누적된 값을 쓴다.

**알려진 위험**

1. **Task 2의 계수는 반복 조정이 필요하다.** 로그 스케일 오프셋은 한 번에 맞기 어렵다. 스크립트를 여러 번 돌리는 걸 전제로 한다.
2. **Task 4가 빨간색이면 멈춰야 한다.** 옛 세이브의 판매량이 새 산식에서 음수로 떨어지면 진행 중인 캐릭터가 갑자기 무명이 된다. 그건 이 계획에서 가장 큰 사고다.
3. **Task 3이 Task 2의 곡선을 흔든다.** 라이벌이 강해지면 1위 횟수가 줄고 판매량에 영향을 준다. Task 3 Step 5에서 반드시 재확인한다.
4. **월드투어 화면은 CSS 검증 불가.** 배포 후 실기기 확인이 필요하다.
