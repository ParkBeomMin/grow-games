---
name: grow-repo-ops
description: "grow-games의 저장소 운영 절차 — 여러 세션이 같은 워킹트리를 쓸 때의 안전 규칙, 베타→상용 승격(promote.sh), 릴리스(release.sh), 롤백, sync-beta 주의점, 세이브 데이터 규약. 커밋·배포·승격·릴리스·롤백을 하거나 '상용에 반영', '배포하자', '베타 올리기', '버전 올리기' 요청이 나올 때 반드시 사용할 것."
---

# 저장소 운영

**이 저장소는 여러 Claude 세션이 같은 워킹트리·같은 `main`을 씁니다.**
아래는 실제로 사고가 난 뒤에 만든 규칙이에요. 추상적인 주의가 아닙니다.

## 0. 작업 시작할 때 30초

```bash
cd /workspace/grow-games
git fetch origin
git log --oneline -5                  # 누가 뭘 하고 있나
git log --oneline HEAD..origin/main   # 비어 있지 않으면 남이 뭔가 올렸다
git status --short                    # 내가 안 건드린 파일이 있나
git log --oneline -- beta/            # 베타에만 있는 미승격 커밋
```

**`git status`에 내가 안 건드린 파일이 떠 있으면 다른 세션이 작업 중입니다.
손대지도, 커밋에 넣지도 마세요.**

## 1. `git add`는 반드시 경로를 명시

```bash
git add beta/winger2/ tests/winger2/    # ✅
git add -A                              # ❌
git commit -a                           # ❌
```

**실제 사고**: 한 세션의 커밋이 다른 세션이 편집 중이던 `beta/_check.html` 380줄을
통째로 담아갔습니다. 남의 커밋은 다시 쓸 수 없어서 그대로 둘 수밖에 없었어요.

## 2. 영역 나누기 — 공유 파일이 문제입니다

게임 폴더(`soccer/` · `rookie/` · `idol/` …)는 서로 독립이라 안 부딪힙니다.

| 공유 (조심) | 전용 (안전) |
|---|---|
| `timing.js` · `base.css` · `cloud.js` · `match.js` · `help.js` | `beta/tour-stage.js` (아이돌만) |
| `beta/_check.html` · `beta/_fixtures.js` · `scripts/` | `beta/post-stage.js` (야구만) |

**공유 파일을 건드릴 땐 짧게 끝내세요.** 오래 잡고 있으면 부딪힙니다.
새 기능은 **전용 파일로 빼는 게 최선**입니다 — 미니게임 작업이 한 번도 안 부딪힌 게
그 설계 덕분이에요. `timing.js`는 8개 게임이 전부 내려받으니 거기 넣지 마세요.

## 3. 베타 → 상용

| | 주소 | 실체 |
|---|---|---|
| 상용 | `parkbeommin.github.io/grow-games/` | 저장소 루트 |
| 베타 | `…/grow-games/beta/` | 같은 `main`의 `beta/` 폴더 |

`env.js`가 경로에 `/beta/`가 있으면 `localStorage`를 `beta::` 접두사로 감싸고
원격 기록(Supabase·GA)을 끕니다. 상용 세이브·명예의 전당·통계가 오염되지 않아요.

```bash
# 1) 무엇이 상용과 다른지 먼저 본다 (인자 없이 = 목록만)
bash scripts/promote.sh

# 2) 검증 끝난 것만 골라서 반영
bash scripts/promote.sh winger2/game.js winger2/style.css   # ✅
bash scripts/promote.sh --all                               # ❌ 절대 금지

# 3) 경로 명시 커밋
git add winger2/ index.html && git commit -m "🚀 상용 반영 — …"

# 4) 릴리스 (VERSION + CHANGELOG + push)
bash scripts/release.sh 2.54.0 "⚽ {요약}"
```

### `promote.sh --all`을 쓰지 않는 이유

**검증 안 끝난 남의 베타 작업까지 상용으로 나갑니다.**
스크립트 주석에 *"실제로 한 번 나갔고, 두 번은 손으로 막았습니다"*라고 적혀 있어요.

### `beta/_*`는 상용에 안 나갑니다

밑줄로 시작하는 `beta/` 최상위 파일은 `promote.sh`가 차단합니다.
`_check.html`은 누르면 localStorage 세이브를 통째로 덮어쓰기 때문이에요 —
상용에 나가면 진짜 플레이어 캐릭터가 날아갑니다.

> **GitHub Pages는 Jekyll이 밑줄 파일을 404로 만들어서 `.nojekyll`이 필요합니다.**
> 안전장치와 정면으로 부딪혔던 자리예요.

### 폴더 통째 승격의 중첩 함정

`promote.sh <폴더>`의 명시 대상 분기는 `cp -a "beta/$t" "$(dirname "$t")/"`인데,
GNU `cp`는 **대상 디렉터리가 이미 있으면 그 안으로** 복사합니다 (`./winger2/winger2`).
새 게임 첫 승격은 루트에 폴더가 없어 안전하지만, **두 번째부터는 파일 단위로 승격**하고
직후 `git status --short`로 중첩이 생기지 않았는지 확인하세요.

## 4. `sync-beta.sh` — 베타를 통째로 덮어씁니다

베타에 미승격 작업이 있으면 전부 사라집니다. 실제로 한 세션이 다른 세션의 베타 전용
작업(도움말 모달·은퇴 확인창)을 날린 적이 있어요.

다행히 스크립트가 사전 diff 검사를 하고 차이가 있으면 `🛑`로 멈춥니다.
`--force`는 정말 버릴 때만.

```bash
git log --oneline -- beta/    # 먼저 확인. 미승격 커밋이 있으면 promote 후에 sync
bash scripts/sync-beta.sh
```

**`CONTENT` 목록(`scripts/sync-beta.sh:18`)에 없는 폴더는 복사되지 않습니다.**
새 게임을 만들면 반드시 추가하세요 — 가장 조용한 실패입니다.

## 5. 릴리스는 한 번에 한 세션만

`VERSION`·`CHANGELOG.md`가 유일한 진짜 경합 지점입니다.

```bash
git fetch origin && git log --oneline HEAD..origin/main
```

**비어 있지 않으면 남이 뭔가 올린 겁니다.** 배포 전에 확인하고, 배포는 짧게 끝내세요.

> 태그는 보조 수단입니다. 자동화 환경의 git 프록시가 태그 push를 403으로 막아서
> `release.sh`는 태그를 로컬에만 만들고 `git push origin main`만 합니다.
> 버전의 진짜 기준은 `VERSION` 파일 + `CHANGELOG.md`의 커밋 해시예요.

## 6. 롤백

```bash
bash scripts/rollback.sh <해시> --dry-run
bash scripts/rollback.sh <해시>
```

`beta/`와 `scripts/`는 건드리지 않고 **루트(상용)만** 되돌립니다.
작업 트리만 바꾸므로 확인 후 직접 커밋/푸시하세요.

## 7. 저장 데이터 규약

**마이그레이션하지 않습니다.** 새 필드는 읽는 쪽에서 기본값을 줘요.

```js
const lg = LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
```

**리그·티어 같은 `id`는 옛 세이브가 가리키는 값이라 안 바꿉니다.**
순서가 필요하면 `tier` 같은 새 필드를 더하세요 — 축구에서 `id`로 순서를 판단해 사고가 났습니다.

가중 카운터를 더할 땐 **옛 카운터를 이어받으세요.**

```js
// ❌ 옛 세이브가 새 상을 받는 순간 지난 상이 전부 사라져요
S.career.mvpW = (S.career.mvpW || 0) + prestige;
// ✅
S.career.mvpW = (S.career.mvpW != null ? S.career.mvpW : S.career.mvp) + prestige;
```

## 8. 배포 전 검증

```bash
node tests/smoke-test.js beta
node tests/smoke-test.js root
node tests/check-page-test.js
red=0; for t in tests/*/*.js; do node "$t" >/dev/null 2>&1 || { echo "❌ $t"; red=$((red+1)); }; done; echo "실패 ${red}건"
```

**종료 코드를 보세요.** "✅ 통과"만 읽으면 스택만 뱉고 죽은 검사가 지나갑니다.

**CSS는 기계가 못 봅니다.** 배포 전 실기기 확인 항목을 목록으로 남기세요.

## 9. 볼트 기록

작업이 끝나면 옵시디언 `Grow Games/`에 기록합니다.

- 설계 판단 → `설계/설계 — {주제}.md`
- 실측 → `분석/분석 — {주제}.md`
- 안 하기로 한 것 → `받은 것/백로그 — 미룬 결정.md` (**판단이 바뀔 조건**을 같이)
- 처리한 아이디어 → `받은 것/기능 아이디어.md`의 `## ✅ 처리한 것`으로 이동
- 릴리스 → `운영/릴리스 기록.md`

**볼트를 수정한 뒤에는 반드시 동기화** (모든 수정을 마친 뒤 마지막에 한 번만):

```bash
python3 /opt/data/scripts/obsidian-api-client.py on
sleep 60
python3 /opt/data/scripts/obsidian-api-client.py off
```
