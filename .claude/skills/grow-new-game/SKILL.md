---
name: grow-new-game
description: "grow-games 저장소에 새 게임을 추가하거나 기존 게임을 새 슬러그로 분기할 때 쓰는 등록 체크리스트. '새 게임 만들기', 'v2 만들기', '게임 복제', '더 윙어 v2', 'winger2', '게임 폴더 신설', '슬러그 추가' 요청에 반드시 사용할 것. 폴더만 만들면 게임이 아무 데도 안 보이거나 클라우드 세이브에서만 조용히 빠지므로, 등록 지점을 전부 채우려면 이 체크리스트가 필요하다."
---

# 새 게임 추가 — 등록 체크리스트

폴더를 만드는 건 쉽습니다. **문제는 등록 지점이 아홉 군데로 흩어져 있고,
빠뜨려도 빨간불이 안 뜬다는 것**입니다. 조용히 없는 것처럼 굴어요.

아래에서 새 슬러그를 `{slug}`, 표시 이름을 `{게임명}`으로 씁니다.

## 0. 시작 전 30초

```bash
cd /workspace/grow-games
git fetch origin
git log --oneline -5                  # 누가 뭘 하고 있나
git log --oneline HEAD..origin/main   # 비어 있지 않으면 남이 올린 게 있음
git status --short                    # 내가 안 건드린 파일 = 다른 세션 작업 중
git log --oneline -- beta/            # 베타에만 있는 미승격 커밋
```

**여러 Claude 세션이 같은 워킹트리를 씁니다.** 내가 안 건드린 파일에 손대지 마세요.

## 1. 폴더 만들기 — 반드시 `beta/` 안에서

```bash
cp -a beta/soccer beta/{slug}     # soccer가 최신 구조입니다
```

상용 루트에 바로 만들지 않습니다. `beta/`가 스테이징이에요.

## 2. 게임 안쪽 (6개)

- [ ] **`beta/{slug}/index.html`**
  - `<title>` · `<meta name="description">` · `<link rel="icon">` 이모지
  - `<meta name="theme-color">` — **매니페스트 `theme_color`와 같은 값**
  - `<meta name="apple-mobile-web-app-title">` — **매니페스트 `short_name`과 반드시 동일**
    (어긋나서 안드로이드와 아이폰의 앱 이름이 달랐던 사고가 있습니다)
  - 스타일 순서 유지: `../base.css` → `style.css`
  - 스크립트 순서 유지: `../env.js`(**반드시 최상단**) → `../radar.js` → `../timing.js`
    → `../match.js` → `../cloud.js` → `../stats.js` → `../fx.js` → `../ads.js` → `../help.js`
    → 게임 전용 js → 마지막에 `navigator.serviceWorker.register("sw.js")`
- [ ] **`beta/{slug}/style.css`** — `:root` 색 변수만 갈아도 테마가 완성됩니다
- [ ] **`beta/{slug}/game.js`** — 데이터 테이블 교체 + **저장 키 신규 발급**
  ```js
  const SAVE_KEY = "{slug}-save-v1";   // ❌ 기존 키 재사용은 남의 세이브를 파괴합니다
  ```
- [ ] **게임 키를 전부 갈아끼우세요 — `SAVE_KEY` 하나로는 부족합니다.**
  `grep -rn "{원본slug}" beta/{slug}/` 로 **잔존 0건**을 확인하세요.
  실제로 걸리는 자리 (더 윙어 II 신설 때 확인된 목록):

  | 자리 | 안 바꾸면 |
  |---|---|
  | `Stats.init` · `Cloud.init` · `Help.open` | 통계·클라우드·도움말이 원본 게임으로 섞임 |
  | `Match.register` · `Match.count` | **베타 플레이가 상용의 플레이어 수·랭킹에 섞임** |
  | HOF `game:` · `submitHof` · `fetchHof` | **명예의 전당이 원본과 한 표에서 섞임** (`grow-hof-v1`은 8종 공유) |
  | `GAME_ID` · `BATTLE_KEY` | 배틀 아레나 기록이 섞임 |
  | fever `GAME` · `KEY` | 피버 이벤트가 원본 게임 것으로 붙음 |
  | `S.phase` (예: `"{slug}-pro"`) | 클라우드 `SUMMARY` 분기가 어긋남 |

  > 이건 조용히 실패하지 않습니다 — **더 나쁘게, 상용 데이터를 오염시킵니다.**
- [ ] **`beta/{slug}/manifest.webmanifest`** — `name` · `short_name` · `theme_color` · 아이콘
- [ ] **`beta/{slug}/icon-192.png` · `icon-512.png`** (`scripts/make-icons.py` 참고)
- [ ] **`beta/{slug}/sw.js`**
  ```js
  const CACHE = "{slug}-v1";   // 접두사가 activate의 startsWith("{slug}-")와 짝입니다
  const ASSETS = ["./", "./index.html", "./style.css", "./game.js", /* 전용 js 전부 */,
                  "./manifest.webmanifest",
                  "../base.css", "../radar.js", "../timing.js", "../match.js", "../help.js"];
  ```
  - **캐시 접두사는 게임마다 고유해야 합니다** — 겹치면 다른 게임 캐시를 지웁니다
  - **전용 js를 추가할 때마다 `ASSETS`에 손으로 넣으세요.** 자동 생성이 없습니다.
    빠뜨리면 온라인에선 멀쩡하고 **오프라인에서만** 깨집니다
  - `fetch(e.request, { cache: "no-cache" })` 옵션 유지 — 빼면 GitHub Pages의
    `max-age=600` 때문에 "고쳤는데 그대로"가 납니다

## 3. 등록 지점 (여기를 빠뜨리면 조용히 사라집니다)

- [ ] **`beta/index.html`** — `GAMES` 배열에 추가 + `.hub-stats`의 하드코딩된 게임 수
  ```js
  { slug: "{slug}", emoji: "⚽", title: "{게임명}", sub: "…", genre: "…", save: "{slug}-save-v1" },
  ```
- [ ] **`stats/index.html`** — `GAMES` 매핑 (없으면 통계 대시보드 탭이 안 생깁니다)
- [ ] **`cloud.js` 4곳** — `SAVE` · `BATTLE` · `SUMMARY` · `LABEL`
      (**누락하면 그 게임만 클라우드 세이브에서 조용히 빠집니다**)
- [ ] **`tests/smoke-test.js`의 `GAMES`**
- [ ] **`tests/cloud/cloud-wire-test.js` · `tests/cloud/help-section-test.js`**
- [ ] **`tests/idx/tour-mech-test.js`의 하드코딩 `GAMES`**
      ("아이돌 말고는 `tour-stage.js`를 안 내려받는다"는 격리 검증 대상 목록.
      안 넣으면 새 게임만 그 검사에서 빠집니다.
      `tests/rookie/post-mech-test.js`는 `readdirSync`라 자동 포함됩니다)
- [ ] **`scripts/sync-beta.sh`의 `CONTENT`**
      (**누락하면 sync-beta가 이 폴더를 아예 안 복사합니다** — 가장 조용한 실패)
- [ ] **`beta/_check.html`의 `GAME_ORDER`**
      (없으면 `_fixtures.js`에 시나리오가 있어도 카드가 한 장도 안 그려집니다)
- [ ] **`scripts/make-fixtures.js`** — 확인용 세이브를 뽑을 거면 시나리오 추가 후
      `node scripts/make-fixtures.js {slug}`
- [ ] **루트 `index.html`** — 상용 승격 시점에 같이 (베타 확인 단계에서는 `beta/index.html`만)

## 4. 문서

- [ ] **`README.md`** 게임 목록 표에 행 추가 + 개수 갱신
- [ ] 옵시디언 `Grow Games/index.md` 게임 목록 — 볼트 수정 후 동기화 필요
      (`obsidian-api-client.py on` → 60초 → `off`)

## 5. 검증

```bash
node tests/smoke-test.js beta
node tests/check-page-test.js
red=0; for t in tests/{slug}/*.js; do node "$t" >/dev/null 2>&1 || { echo "❌ $t"; red=$((red+1)); }; done; echo "실패 ${red}건"
```

**종료 코드를 보세요.** 마지막 줄의 "✅ 통과"만 읽으면 스택만 뱉고 죽은 검사가 지나갑니다.

## 6. 커밋 — 경로 명시 필수

```bash
git add beta/{slug}/ beta/index.html cloud.js tests/{slug}/ tests/smoke-test.js scripts/sync-beta.sh
git commit -m "✨ {게임명} 베타 신설"
```

`git add -A`와 `git commit -a`는 **다른 세션이 편집 중인 파일을 딸려 갑니다.** 실제 사고예요.

## 확인: 등록이 실제로 먹혔는지

체크리스트를 채웠다고 믿지 말고 **교차 비교**하세요.

```bash
# 슬러그가 등록돼야 할 모든 자리에 실제로 있는지
grep -rn "{slug}" beta/index.html beta/stats/index.html beta/cloud.js \
  tests/smoke-test.js tests/cloud/cloud-wire-test.js tests/cloud/help-section-test.js \
  tests/idx/tour-mech-test.js scripts/sync-beta.sh beta/_check.html

# 원본 게임 키가 새 폴더에 남아 있지 않은지 (상용 데이터 오염 방지)
grep -rn "{원본slug}" beta/{slug}/ | grep -v "^Binary"   # → 0건이어야 합니다

# sw.js ASSETS ↔ 실제 파일 대조
ls beta/{slug}/*.js && grep -n "ASSETS" -A 8 beta/{slug}/sw.js
```

`cloud.js`는 **4곳 전부**에 나와야 합니다. 하나만 있으면 미완성입니다.

## 이름 규약

- **실제 상표명(구단·방송·브랜드)을 쓰지 않습니다.** 광고가 붙은 서비스라
  "비영리 팬 제작물" 항변이 약합니다. 리그 이름은 이미 결정된 예외입니다
- 사용자 문구·주석은 **한국어 존댓말(`~해요`)**
- `beta/_*` (밑줄 시작)는 베타 전용입니다 — `promote.sh`가 승격에서 막습니다.
  새 확인용 도구는 `_`로 시작하는 이름으로 두면 자동으로 걸러집니다
