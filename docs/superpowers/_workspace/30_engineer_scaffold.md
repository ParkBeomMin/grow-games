# 30 · engineer — ⚽ 더 윙어 II 1차 §0 (폴더 신설 + 등록 지점)

2026-08-28 · grow-engineer
근거: `13_designer_v2-final.md` §1 · `grow-new-game` 스킬 체크리스트

> **범위**: 배선만. 게임 산식·계수는 한 줄도 안 건드렸어요.
> `beta/winger2/`의 게임 내용은 아직 `beta/soccer/`와 같습니다 — 다음 단계에서 갈아엎어요.
> **커밋하지 않았습니다.** 파일만 만들어 뒀어요.

---

## 1. 체크리스트 항목별 완료 여부

### §1 폴더

| | 항목 | 상태 |
|---|---|---|
| ✅ | `cp -a beta/soccer beta/winger2` | 완료 (베타 안에서만 작업) |

### §2 게임 안쪽 (6개)

| | 항목 | 상태 | 값 |
|---|---|---|---|
| ✅ | `index.html` `<title>` | 완료 | `더 윙어 II ⚽ 축구선수 키우기` |
| ✅ | `index.html` `<meta name="theme-color">` | 완료 | `#0b1e14` — 매니페스트 `theme_color`와 **일치 확인** |
| ✅ | `index.html` `apple-mobile-web-app-title` | 완료 | `더 윙어 II` — 매니페스트 `short_name`과 **일치 확인** |
| ✅ | 타이틀 화면 `<h1>` | 완료 | `더 윙어 II` |
| ✅ | 스타일·스크립트 순서 | 손대지 않음 (복사본 그대로 유지) | |
| ✅ | `game.js` `SAVE_KEY` | 완료 | `"winger2-save-v1"` — 기존 `winger-save-v1` 잔존 **0건** |
| ✅ | `game.js` `LEGACY_KEY` | 자동 파생 | `SAVE_KEY + "-legacy"` → `winger2-save-v1-legacy` (설계 §9와 일치) |
| ✅ | `Stats.init` / `Cloud.init` | 완료 | 둘 다 `"winger2"` |
| ✅ | `Help.open` 제목 | 완료 | `"⚽ 더 윙어 II 도움말"` |
| ✅ | `manifest.webmanifest` | 완료 | `name` `더 윙어 II — 축구선수 키우기` · `short_name` `더 윙어 II` |
| ✅ | `icon-192.png` · `icon-512.png` | 완료 | `beta/soccer/` 것을 그대로 복사 (지시대로) |
| ✅ | `sw.js` `CACHE` | 완료 | `"winger2-v1"` + `startsWith("winger2-")` 짝 맞춤 |
| ✅ | `sw.js` `ASSETS` | 완료 | 파일 목록과 **양방향 대조 통과** (아래 §3) |
| ✅ | `sw.js` `fetch(..., { cache: "no-cache" })` | 유지 | |

**게임 키로 함께 갈아 끼운 것** (같은 이름을 쓰는 자리라 빠뜨리면 상용 데이터에 섞입니다)

| 값 | 전 | 후 | 왜 |
|---|---|---|---|
| `Match.register` / `Match.count` | `"soccer"` | `"winger2"` | 서버 `players` 표. 안 바꾸면 **상용 더 윙어의 플레이어 수·랭킹에 베타가 섞여요** |
| HOF 항목 `game:` · `submitHof` · `fetchHof` | `"soccer"` | `"winger2"` | 공용 `grow-hof-v1`·서버 `hof` 표를 `game`으로 가릅니다 |
| `GAME_ID` (배틀 아레나) | `"soccer"` | `"winger2"` | 별도 리더보드 |
| `BATTLE_KEY` | `grow-battle-soccer-v1` | `grow-battle-winger2-v1` | `cloud.js` `BATTLE`과 짝 |
| `fever.js` `GAME` · `KEY` | `"soccer"` · `grow-fever-soccer` | `"winger2"` · `grow-fever-winger2` | |
| `S.phase` | `"soccer-pro"` | `"winger2-pro"` | `cloud.js` `SUMMARY.winger2`가 읽는 값. 새 저장 키라 **옛 세이브 영향 0** |

### §3 등록 지점 9곳

| | 지점 | 상태 | 내용 |
|---|---|---|---|
| ✅ | `beta/index.html` `GAMES` | 완료 | `{ slug: "winger2", … save: "winger2-save-v1" }` |
| ✅ | `beta/index.html` **하드코딩된 게임 수** | 완료 | `<b>7</b>` → `<b>8</b>` (눈에 안 띄는 자리, 지적하신 곳) |
| ✅ | `beta/stats/index.html` `GAMES` | 완료 | `winger2: "⚽ 더 윙어 II"` |
| ✅ | `beta/cloud.js` **4곳 전부** | 완료 | `SAVE`(26) · `BATTLE`(31) · `SUMMARY`(799) · `LABEL`(815) — grep 4건 확인 |
| ✅ | `tests/smoke-test.js` `GAMES` | 완료 | + `BETA_ONLY` 표시 (아래 §4-①) |
| ✅ | `tests/cloud/cloud-wire-test.js` | 완료 | |
| ✅ | `tests/cloud/help-section-test.js` | 완료 | |
| ✅ | `scripts/sync-beta.sh` `CONTENT` | 완료 | `… soccer winger2 unicorn …` |
| ✅ | `beta/_check.html` `GAME_ORDER` | 완료 | `["rookie","soccer","winger2","idol"]` + `GAME_NAME`·`GAME_TAB`도 |
| ⏸️ | `scripts/make-fixtures.js` | **보류** | 시나리오는 게임 로직이 확정된 뒤에 뽑습니다 (§5-①) |
| ⏸️ | 루트 `index.html` · `stats/index.html` · `cloud.js` · `README.md` | **보류** | 상용 승격 시점 항목 (§5-②) |

### §4 추가로 찾은 지점 (스킬 체크리스트에 없던 것)

| | 지점 | 상태 | 왜 |
|---|---|---|---|
| ✅ | `tests/idol/tour-mech-test.js:208` `GAMES` | 완료 | "아이돌 말고는 `tour-stage.js`를 안 내려받는다"는 **격리 검증**의 대상 목록이 하드코딩이에요. winger2를 안 넣으면 이 게임만 검사에서 빠집니다 |
| ✅ | `tests/rookie/post-mech-test.js` | 손댈 것 없음 | `readdirSync(beta)`로 자동 탐색이라 winger2가 이미 대상에 들어가요 (실행해서 확인) |

---

## 2. 검증 결과

| 검사 | 결과 |
|---|---|
| `node tests/smoke-test.js beta` | ✅ **통과** — `✅ beta/winger2` 포함 9종, exit 0 |
| `node tests/smoke-test.js root` | ✅ 통과 — `⏭️ 상용/winger2 — 아직 베타 전용이에요`, exit 0 |
| `node tests/check-page-test.js` | ✅ **통과**, exit 0 |
| `node tests/cloud/cloud-wire-test.js` | ✅ 통과 — winger2 6항목 전부 초록. `Cloud.init에 올바른 키 전달 — 기대: "winger2" / 받음: "winger2"`, `grow-cloud-dirty-winger2 = "1"` |
| `node tests/cloud/help-section-test.js` | ✅ 통과 — winger2 10항목, 도움말 8섹션 렌더 |
| `tests/cloud/*.js` 12종 | ✅ 11종 통과 / ❌ 1종 — **아래 참고** |
| `tests/idol/tour-mech-test.js` | ✅ 통과 (winger2 추가 후) |
| `tests/rookie/post-mech-test.js` | ✅ 통과 (몬테카를로라 5분 넘게 걸려요 — 타임아웃을 넉넉히 주세요) |
| `tests/soccer/*` · `tests/rookie/*` · `tests/idol/*` 전량 | ⏳ **검증 불가 — 시간 초과** (10분 안에 못 끝냄). 다만 `beta/soccer/`·`beta/rookie/`·`beta/idol/`을 **한 글자도 안 건드렸으므로** 영향 없음 |

### ❌ `tests/cloud/career-cloud-test.js` — **제 변경과 무관한 기존 빨간불입니다**

```
❌ rookie: 결산 함수가 끝까지 돈다 (Cannot read properties of undefined (reading 'length'))
```

근거 세 가지:

1. 이 검사는 `beta/<게임>/career.js`만 읽어요. 제가 고친 파일(`beta/cloud.js`·`beta/index.html`·
   `beta/stats/index.html`·`beta/_check.html`)은 **한 개도 안 읽습니다.**
2. `CAREER=/workspace/grow-games`(상용)로 돌리면 **✅ 통과**합니다 → `beta/rookie/career.js`가
   상용과 다르고, 그쪽에 있는 문제예요.
3. `git status --short -- beta/rookie/`가 비어 있어요 → 이미 커밋된 베타 상태입니다.

**베타 `rookie`에 이미 나 있던 빨간불이에요.** 제 작업 범위가 아니라 손대지 않았습니다.
inspector에게 넘겨 주시면 좋겠어요.

### 등록 교차 확인 (지시하신 grep)

```
beta/index.html        : GAMES 1건 + 게임 수 <b>8</b>
beta/stats/index.html  : GAMES 1건
beta/cloud.js          : 4건 ← SAVE · BATTLE · SUMMARY · LABEL 전부
tests/smoke-test.js    : GAMES + BETA_ONLY 2건
tests/cloud/cloud-wire-test.js   : 1건
tests/cloud/help-section-test.js : 1건
scripts/sync-beta.sh   : CONTENT 1건
beta/_check.html       : GAME_NAME · GAME_TAB · GAME_ORDER 3건
루트(index.html · stats/ · cloud.js · README) : 0건 ← 승격 단계 항목이라 의도한 상태
```

### 스스로 돌린 교차 확인 — "눈에 안 띄는 곳"

| 확인한 것 | 결과 |
|---|---|
| `beta/index.html`의 하드코딩된 게임 수 | ✅ 7 → 8 |
| `sw.js` `CACHE` 접두사 충돌 | ✅ 10개 전부 대조 — `chef-` `dev-` `idol-` `rookie-` `soccer-` `stock-` `stream-` `unicorn-` `hub-` `winger2-`, **겹치는 것 없음** |
| `sw.js` `ASSETS` ↔ 실제 파일 **양방향** | ✅ 일치 (스크립트로 대조 — 빠진 것도, 남는 것도 0) |
| 저장 키 접두사 충돌 (`winger-save-v1` ↔ `winger2-save-v1`) | ✅ 어느 쪽도 상대의 접두사가 아니라 슬롯 열거가 안 섞여요 |
| `cloud.js`의 `GAMES = Object.keys(SAVE)` | ✅ `SAVE`에 넣었으니 동기화 대상에 자동 포함 (여기가 진짜 관문이에요) |
| `beta/_check.html`에 fixture 없는 게임을 넣어도 되나 | ✅ `GAME_ORDER.filter(fixture가 있는 것만)` 구조라 **빈 탭이 안 생겨요.** 실제로 check-page-test 통과 |
| 다른 곳의 하드코딩된 8종 목록 | ✅ 저장소 전체 grep — `tests/idol/tour-mech-test.js` 하나 더 찾아서 채웠어요 (§1-4) |
| `beta/sw.js`(허브) | ✅ 게임 목록을 안 담아요 (`["./","./index.html","./base.css","./manifest.webmanifest"]`) — 손댈 것 없음 |
| 공용 파일 오염 | ✅ `timing.js`·`base.css`·`match.js`·`help.js`·`radar.js`·`fx.js`·`ads.js`·`env.js` **한 글자도 안 건드림** |

---

## 3. 판단이 필요해 스스로 정하지 않고 남긴 것

### ① 루트(상용) 등록은 안 했습니다

`cloud.js` · `stats/index.html` · `index.html` · `README.md`의 루트 사본에는 `winger2`를 **안 넣었어요.**

- 저장소 규칙이 *"작업은 항상 `beta/` 안에서"* 이고, 루트에 넣으면 검증 전 배선이 상용에 나갑니다.
- 지시하신 grep 명령은 루트 `cloud.js`·`stats/index.html` 경로였는데, **베타 사본에 넣었습니다.**
  베타 게임이 실제로 읽는 건 `beta/cloud.js`(`../cloud.js`)라 검증도 이쪽으로만 됩니다.
- 부작용 확인: 이제 `scripts/sync-beta.sh`가 `cloud.js`·`index.html`·`stats`를 "베타에만 있는 변경"으로
  잡고 멈춰요. **의도한 동작**이고(승격 안 된 베타 작업 보호), 스크립트가 안내 문구를 냅니다.
- 데이터 안전성 확인: 상용 `cloud.js`는 `winger2`를 모르니 그 행을 아예 안 건드려요.
  베타 세이브가 상용 동기화에 지워질 경로는 없습니다.

**다르게 원하시면 말씀해 주세요 — 루트에도 넣는 건 1분이면 됩니다.**

### ② `stats/index.html`의 `LEAGUE_NAME` · `LEAGUE_ORDER`에는 안 넣었습니다

지금은 winger2 리그 표가 soccer와 같지만, 설계 §12-3 (1)에서 **2차에 20팀 38라운드로 바꾸기로**
확정돼 있어요. 지금 복사해 두면 리그가 바뀌는 순간 통계가 조용히 갈라집니다.
**§2 리그 표가 확정되는 시점에 채우는 게 맞다고 판단했습니다.** 지금 넣어야 하면 알려주세요.

### ③ 테마 색은 soccer와 같은 `#0b1e14`을 그대로 뒀습니다

설계 문서에 색 지정이 없어요. 제가 임의로 정하면 director의 몫을 가져가는 셈이라 그대로 뒀습니다.
**허브 카드·PWA 아이콘이 더 윙어와 구분이 안 갑니다** — director가 §5에서 정해 주시면 반영할게요.

### ④ `beta/winger-moment.js`는 아직 안 만들었습니다

설계 §1이 지정한 미니게임 전용 파일이에요. 미니게임 4종은 다음 단계라 **`sw.js` `ASSETS`에도 아직 없어요.**
⚠️ **그 파일을 만들 때 `beta/winger2/sw.js`의 `ASSETS`에 `"../winger-moment.js"`를 손으로 넣어야 합니다.**
빠뜨리면 온라인에선 멀쩡하고 오프라인에서만 깨져요.

### ⑤ `tests/soccer/*`를 가리키는 주석이 winger2에 그대로 남아 있어요

`beta/winger2/game.js:94`·`career.js:367,2639,2652,2691,2708` 등이 `tests/soccer/…가 지킵니다`라고
말하는데, winger2에는 그 검사가 없습니다. **다음 단계에서 이 코드가 통째로 갈리므로 지금은 뒀어요.**
갈아엎을 때 같이 정리하거나, `tests/winger2/`가 생기면 가리키는 곳을 바꾸면 됩니다.

### ⑥ 피버 이벤트는 winger2에서 열 수 없어요

`stats/index.html`의 관리 화면이 `FEVER_GAME = "soccer"` 하나만 다뤄요.
winger2는 `game=eq.winger2`로 조회해 늘 빈 결과라 **조용히 아무 일도 안 일어납니다**(에러 없음).
1차 범위 밖이라 그대로 뒀습니다.

---

## 4. `tests/smoke-test.js`에 손댄 이유 (공용 파일)

`GAMES`에 `winger2`만 넣으면 `node tests/smoke-test.js root`가 없는 폴더를 읽다가 **그대로 죽습니다**
(`readFileSync`가 try 밖이에요). 그래서 3줄을 더했어요.

```js
const BETA_ONLY = ["winger2"];
…
if (!base && BETA_ONLY.includes(g)) { console.log(`⏭️  상용/${g} — 아직 베타 전용이에요`); continue; }
```

- **왜 전용 파일로 못 뺐나**: 이 검사의 게임 목록 자체가 등록 지점이에요. 목록을 다른 파일로 빼면
  등록 지점이 하나 더 늘어납니다.
- **왜 조용히 건너뛰지 않았나**: `⏭️` 줄을 반드시 찍어요. 아무 말 없이 넘어가면 "초록불인데 아무것도
  안 지키는 검사"가 됩니다. 승격하면 `BETA_ONLY`에서 빼야 한다고 주석에 적어 뒀어요.

---

## 5. 건드린 파일 전체

**새로 만든 것**

```
beta/winger2/  (13개 — camp.js career.js cup.js fever.js game.js icon-192.png icon-512.png
                index.html manifest.webmanifest squad.js style.css sw.js worldcup.js)
docs/superpowers/_workspace/30_engineer_scaffold.md
```

**고친 것 (전부 등록 한 줄씩)**

```
beta/_check.html   beta/cloud.js   beta/index.html   beta/stats/index.html
scripts/sync-beta.sh
tests/smoke-test.js   tests/cloud/cloud-wire-test.js   tests/cloud/help-section-test.js
tests/idol/tour-mech-test.js
```

**손대지 않은 남의 작업** (`git status`에 떠 있지만 제 것이 아닙니다)

```
CLAUDE.md   tests/soccer/curve-test.js   .gitignore   scripts/shoot.js   .claude/
```

**커밋 안 했습니다.** 커밋할 때는 반드시 경로를 적어 주세요 — `git add -A`는 위 네 개를 딸려 갑니다.

```bash
git add beta/winger2/ beta/_check.html beta/cloud.js beta/index.html beta/stats/index.html \
        scripts/sync-beta.sh tests/smoke-test.js tests/cloud/cloud-wire-test.js \
        tests/cloud/help-section-test.js tests/idol/tour-mech-test.js \
        docs/superpowers/_workspace/30_engineer_scaffold.md
```
