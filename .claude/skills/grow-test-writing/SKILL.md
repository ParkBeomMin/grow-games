---
name: grow-test-writing
description: "grow-games의 테스트 작성 관례와 함정 방어. 테스트 러너가 없고 브라우저 코드를 node로 굴리는 이 저장소의 표준형(정규식 추출 + new Function + 변이 검증 + jsdom 부트스트랩)을 담는다. 테스트를 쓰거나 고칠 때, '검증해줘', '테스트 추가', '테스트가 통과하는데 안 된다', '회귀 방지' 요청에 반드시 사용할 것."
---

# 테스트 작성

테스트 러너가 없습니다. 각 파일이 그냥 node 스크립트예요.
**테스트는 항상 `beta/` 소스를 읽습니다.**

당신이 막아야 할 것은 버그가 아니라 **아무것도 안 지키면서 초록불인 검사**입니다.
이 저장소에서 여덟 번 넘게 나왔고 매번 모양이 달랐습니다.

## 반드시 지키는 다섯

1. **`new Function(...)` + `return`.** 직접 `eval` 금지
2. **산식은 소스에서 정규식으로 추출.** 값을 복사해 적지 않기
3. **게임 입구를 통해** 실제 버튼을 눌러 도달하기
4. **변이 검증** — 고치기 전에 빨간불이 뜨는지 반드시 확인. 안 잡히면 검사를 고칠 것
5. **실기기 이벤트 순서**를 그대로 보내기 (`pointerdown` → `pointerup` → `click`)

> **방향이 반대인 것 하나** — 산식은 소스에서 뜯어오고, **문턱은 테스트에 상수로 박습니다.**
> 문턱을 소스에서 읽어오면 상수를 바꿔도 검사가 따라가서 아무것도 안 잡혀요.

## 표준형 (a) — 산식 검증

```js
/* ⚡ {무엇을 지키는지 한 줄}
 *
 * 증상: {어떤 버그였나}
 *
 * 지키는 것:
 *   ① {단언 1}
 *   ② {단언 2}
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 실행한다. 값을 옮겨 적으면 원본이 바뀌어도
 * 초록이 뜬다. 직접 eval은 쓰지 않고 new Function으로 감싼다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/{game}";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");

const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  weight: grab(SRC, /const growWeight = \{[\s\S]*?\n    \};/),
  pick:   grab(SRC, /let roll = Math\.random\(\) \* total;[\s\S]*?break; \} \}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const drawOnce = new Function("info", "S", "clamp", `
  ${parts.weight}
  const pool = STAT_DEFS;
  const total = pool.reduce((sum, d) => sum + growWeight[d.key], 0);
  ${parts.pick}
  return d.key;
`);

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ① {제목}
const N = 20000;
// ... 측정 ...
check(pct > 40, `골만 넣은 경기는 슛이 가장 자주 오른다 (${pct.toFixed(1)}%)`);

/* ── 변이 검증 — 무게를 무시하고 균등하게 뽑으면 반드시 빨간불이 떠야 한다.
 * 이게 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const flatDraw = new Function("info", "S", "clamp", `
  const pool = STAT_DEFS;
  return pool[Math.floor(Math.random() * pool.length)].key;
`);
// ... 균등 추첨으로 ①이 무너지는지 ...
check(flatPct < 40, `변이 검증 — 균등 추첨이면 슛이 ${flatPct.toFixed(1)}%로 떨어져 ①이 무너진다`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
```

**메시지는 한국어 평서형 + 실측값 괄호.** "수비보다 슛이 4배 넘게 자주 오른다 (슛 62.3% vs 수비 8.1%)"

## 표준형 (b) — jsdom 부트스트랩

화면·배선·도달 가능성을 볼 때. `<script src>`를 인라인해 **로드 순서를 살립니다.**

```js
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
const PRE = `window.fetch=()=>Promise.reject(new Error("off"));`
  + `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};`
  + `window.alert=()=>{};window.confirm=()=>false;localStorage.setItem("grow-auto-mini","1");`;

let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRE}</script></head>`)
  .replace("</body>", `<script>window.__get=(n)=>eval(n);window.__set=(n,v)=>{window.__v=v;eval(n+" = window.__v");};</script></body>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/{game}/" });
const w = dom.window;
w.Ads = { display() {}, init() {} }; w.Stats = { log() {} };
const get = w.__get, set = w.__set;
```

**주의할 것들:**
- `__get`/`__set`은 **페이지 안에 심은** `eval`이라 최상위 `const`/`let`에 닿습니다.
  밖에서 `eval`하면 스코프가 달라 안 됩니다
- **jsdom URL이 중요합니다** — `https://x.test/{game}/`(접두사 없음) vs
  `https://x.test/beta/_check.html`(`beta::` 접두사). `env.js`가 이걸 보고 localStorage를
  감싸므로 어긋나면 조용히 실패합니다
- jsdom `localStorage`는 `Object.keys`로 안 훑어집니다 — `length`/`key(i)`로 읽으세요
- 페이지를 닫으면 `cloud.js`의 늦은 fetch 콜백이 사라진 document를 만져 터집니다 →
  **스택에 `x.test`가 있는 예외만** 삼키고 나머지는 그대로 죽이세요

## 실기기 이벤트 순서

```js
const tap = (el) => {
  for (const type of ["pointerdown", "pointerup", "click"]) {
    el.dispatchEvent(new w.Event(type, { bubbles: true }));
  }
};
```

`pointerdown` 하나만 보내면 안 잡힙니다. 준비 화면 도입 때 **24개 케이스가 전부
초록불이었는데** 실기기에서는 탭이 두 번 먹히고 있었어요. 순서를 그대로 보내니
24개가 전부 빨간불이 됐습니다.

## 남이 올린 값을 그리는 자리 (XSS)

변이 검증은 **그리는 길에서 이스케이프를 빼고 페이지를 다시 세워** 태그가 실제로
DOM에 들어가는지 봐야 합니다. "esc 함수가 이스케이프한다"만 보면
**부르지도 않는 esc**를 지키게 돼요.

## 시간이 지나면 틀려지는 검사

배포 시점에는 맞았는데 데이터가 자라면서 조용히 죽는 종류가 있습니다.
**의심할 자리: 고정 개수로 자르는 곳(상위 N), 문턱, 상한, 컷.**
분류가 걸린 값을 개수로 자르면 안 됩니다 — 분류 기준마다 뽑으세요.

## 변이가 소스에 안 걸리면 — 종료 코드를 셋으로 가르세요

**변이 검증은 소스 문자열을 정규식으로 잡아 바꿉니다. 구현이 그 문자열을 바꾸면 변이가
조용히 죽어요.** ⚽ 더 윙어 II에서 한 세션에 **두 번** 났습니다
(`ME_P : 1` → 모양 변경, `NPC_SPOT` → 숫자에서 객체로).

**"실패 1건"으로만 보이면 안 돈 것과 빨간불이 구분되지 않습니다.**

```
0  통과
1  빨간불 (검사가 무언가를 잡았다)
2  💥 죽음 (검사가 아예 안 돌았다)
```

그리고 **파일 맨 앞에 0번 「변이 등록 검사」**를 두세요 — 그 파일의 변이 정규식이
소스에 실제로 걸리는지 **다른 무엇보다 먼저** 대조합니다.
안 걸려도 죽지 말고, 그 줄만 ❌로 찍고 **나머지는 계속 돌게** 하세요.

```bash
red=0; dead=0
for t in tests/{game}/*-test.js; do
  node "$t" >/dev/null 2>&1
  case $? in
    0) ;;
    2) echo "💥 $(basename $t) — 안 돌았어요"; dead=$((dead+1)) ;;
    *) echo "❌ $(basename $t)"; red=$((red+1)) ;;
  esac
done
echo "빨간불 ${red}건 · 죽음 ${dead}건"
```

> **뿌리는 남습니다.** 정규식이 소스 문자열에 의존하는 한 구조적으로 반복돼요.
> 엔진이 **계수를 주입받는 형태**(`cfg`로만 받기)면 이 함정이 사라집니다 —
> 그게 안 되는 코드에서는 **"안 걸리는 순간 크게 보이게"까지가 한계**입니다.

## 검사가 무엇을 재고 있는지 스스로 찍게 하세요

**측정 조건을 결과 줄에 함께 출력하세요.**

```
측정 조건: _t.skill = 0.5 · 명단에 me 없음(순수 산식) · 전력 70:70 · N=20000 · 시드 11/202/5150/31337
시드별 [-14.70 -14.62 -14.31 -14.63]
```

⚽ 더 윙어 II에서 이게 없었으면 더 늦게 알았을 것이 있습니다 —
**어떤 검사가 조작 실력(`skill`)을 아예 안 타고 있었어요.** 명단에 내 선수가 없어서
판정 함수가 불리지도 않았는데, 값만 보면 정상으로 보였습니다.

찍어야 할 것: **표본 수 · 시드 · 무엇을 고정했는지 · 명단/입력의 성격**.
특히 **"이 검사는 X를 안 본다"**가 의도라면 그것도 적으세요.

> 조건이 안 적혀 있으면, 나중에 값이 흔들릴 때
> **코드가 변한 건지 조건이 변한 건지 아무도 못 가립니다.**

같은 이유로, **하나의 검사가 두 가지를 재고 있으면 갈라 두세요** —
"순수 산식 대칭"과 "실제 플레이"는 다른 질문이고, 섞으면 어느 쪽이 깨졌는지 안 보입니다.

## 사람의 조작을 검사로 굳히지 마세요

미니게임처럼 **사람이 하는 것**을 시뮬레이션으로 재면, 검사가 **코드가 아니라
당신이 지어낸 조작자 모델**을 잽니다.

⚽ 더 윙어 II에서 실측으로 드러났습니다 — 같은 σ의 조작자를 **겨냥 전략만 바꿔** 다시 짜니:

| | 🏃 | 🥅 | 🎯 | 🧱 | 폭 |
|---|---|---|---|---|---|
| 첫 모델 | 0.522 | 0.522 | 0.521 | 0.537 | 0.017 |
| 다시 짠 모델 | 0.558 | **0.655** | 0.559 | 0.510 | **0.145** |

*"빈 곳 한가운데를 겨냥"*으로 바꾼 것 하나로 0.52가 **0.66**이 됐습니다.
밴드가 ±5%p인데 조작자 모델 하나가 그걸 통째로 넘나듭니다.

**대신 「유효 조건」을 지키세요:**

- 그 값을 만든 **상수들을 pin**하고, 움직이면 *"다시 재세요"*로 빨간불
- 값이 아니라 **관계·부등호**로 지킬 수 있으면 그쪽을 쓰세요
  (예: 두 신호가 갈리는 조건 `a × b > c`)
- 실측값은 **"측정"이 아니라 "기록"**이라고 파일에 적으세요

> 같은 이유로, **밸런스 실측값도 검사에 그대로 박지 마세요.**
> 그건 balancer가 잰 것이고, 검사가 재현하려면 시뮬레이터를 새로 짜야 하는데
> 그게 곧 **"경로가 다른 시뮬레이터"**입니다.

## 시드 하나로 재지 마세요

**단일 시드는 신호가 아니라 잡음입니다.** 시드를 고정하면 재현은 되지만,
**그 시드에서만 통과하는 검사**가 됩니다.

⚽ 더 윙어 II에서 한 세션에 **두 번** 나왔습니다 —
실점 비대칭이 시드에 따라 −14.83 ~ −16.42%로 갈려 밴드를 넘나들었고,
도움비 검사는 시드 77에 고정돼 있어 **시드 5150에서 밴드를 넘는 걸 아무도 못 봤습니다.**

- **시드 서넛의 평균**으로 재고, 각 시드값도 함께 찍으세요 (부호가 갈리는지 보이게)
- 밴드를 넘나들면 **표본을 먼저 늘려** 보세요
  (실측: N 12,000에서 넘나들던 것이 20,000에서 전부 안쪽)
- 재현이 필요하면 시드를 고정하되, **고정한 그 시드가 대표값인지** 확인하세요

## 픽스처가 기울어 있지 않은지 검사하세요

픽스처는 **한 겹만 고쳐서는 안 됩니다.** 같은 게임에서 두 겹이 나왔어요 —
고정 `SPREAD`를 무작위로 바꿨는데도 **내 자리 한 칸만 평평하게** 두어
골 에이스가 윙어 62.8%로 기울어 있었습니다(실제 50.1%).

**픽스처 건강 자체를 검사로 만드세요** — 픽스처가 만드는 분포가 실제 게임의 분포와
같은 자리인지. 안 그러면 검사는 초록불인데 **실제와 다른 세계를 재고 있습니다.**

## ⚠️ 실행할 때 종료 코드를 보세요

```bash
# ❌ 크래시가 안 잡혀요
for t in tests/{game}/*.js; do node "$t" | tail -1; done

# ✅
red=0; for t in tests/{game}/*.js; do
  node "$t" >/dev/null 2>&1 || { echo "❌ $(basename $t)"; red=$((red+1)); }
done; echo "실패 ${red}건"
```

마지막 줄의 "✅ 통과"만 읽으면 **스택만 뱉고 죽은 검사가 조용히 지나갑니다.**
실제로 축구 검사 열 개가 여러 커밋 동안 죽어 있었어요.

## 전체 검증

```bash
node tests/smoke-test.js beta     # 8종이 실제로 로드되는지 (root도 가능)
node tests/check-page-test.js     # 확인 페이지 시나리오 도달
```

## 못 하는 것을 못 한다고 말하기

**CSS와 레이아웃은 검증 불가입니다.** jsdom에는 렌더 엔진이 없어 계산된 스타일을 못 봅니다.
칸이 겹치는지, 헤더가 세로로 쪼개지는지는 **폰으로 봐야 압니다.**

검증 보고서에서 **통과 / 실패 / 검증 불가**를 반드시 구분하세요.
"검증 불가"를 "통과"에 섞으면 그게 바로 초록불 거짓말입니다.
