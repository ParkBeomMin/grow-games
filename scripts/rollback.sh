#!/usr/bin/env bash
# 상용(루트)을 특정 시점으로 되돌려요. 태그·브랜치·커밋 해시 아무거나 됩니다.
#
#   scripts/rollback.sh v1.0.0        # 태그 (원격에 없어도 로컬에 있으면 OK)
#   scripts/rollback.sh 1e960bd       # 커밋 해시 — 태그 없이도 동작
#   scripts/rollback.sh               # 인자 없이 실행하면 릴리스 목록을 보여줘요
#
# · beta/ 와 scripts/ 는 건드리지 않아요 (작업 중인 베타가 날아가지 않게).
# · --dry-run 을 붙이면 무엇이 바뀔지 보여주기만 하고 파일은 그대로 둬요.
# · 작업 트리만 바꿔요. 실제 반영은 직접 커밋/푸시해야 합니다.
set -euo pipefail

REF=""; DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    *) REF="$a" ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

show_releases() {
  echo "릴리스 커밋 (VERSION이 바뀐 지점):"
  git log --format='  %h  %s' -- VERSION | head -20
  local tags; tags="$(git tag -l --sort=-v:refname | tr '\n' ' ')"
  [ -n "$tags" ] && echo "로컬 태그: $tags"
  [ -f CHANGELOG.md ] && echo "자세한 목록: CHANGELOG.md"
}

if [ -z "$REF" ]; then
  echo "사용법: scripts/rollback.sh <태그 | 커밋 해시> [--dry-run]"
  echo
  show_releases
  exit 1
fi

git rev-parse -q --verify "$REF^{commit}" >/dev/null || {
  echo "❌ '$REF' 를 찾을 수 없어요 (태그·브랜치·커밋 해시 모두 가능)."
  echo
  show_releases
  exit 1
}

# 상용 대상 = beta/ · scripts/ 를 제외한 추적 파일
EXCLUDE='^(beta/|scripts/)'
ref_files()  { git ls-tree -r --name-only "$REF" | grep -Ev "$EXCLUDE" | sort; }
head_files() { git ls-tree -r --name-only HEAD   | grep -Ev "$EXCLUDE" | sort; }

echo "▶ 상용을 $(git log -1 --format='%h %s' "$REF") 시점으로 되돌립니다"
[ "$DRY" = 1 ] && echo "  (--dry-run: 파일은 바꾸지 않아요)"

mapfile -t RESTORE < <(ref_files)
mapfile -t REMOVE  < <(comm -13 <(ref_files) <(head_files))

# 1) 그 시점 내용으로 복원
if [ ${#RESTORE[@]} -gt 0 ]; then
  echo "  · 복원 ${#RESTORE[@]}개 파일"
  [ "$DRY" = 1 ] || git checkout "$REF" -- "${RESTORE[@]}"
fi

# 2) 그 시점 이후에 추가된 상용 파일은 제거 (checkout은 삭제를 못 해요)
if [ ${#REMOVE[@]} -gt 0 ]; then
  printf '  · 제거 %d개 파일\n' "${#REMOVE[@]}"
  printf '      %s\n' "${REMOVE[@]}"
  if [ "$DRY" != 1 ]; then
    rm -f -- "${REMOVE[@]}"
    find . -type d -empty -not -path './.git/*' -not -path './beta/*' -delete 2>/dev/null || true
  fi
fi

if [ "$DRY" = 1 ]; then
  echo "✅ 미리보기 끝 — 실제로 적용하려면 --dry-run 없이 다시 실행하세요."
  exit 0
fi

echo "✅ 작업 트리 반영 완료. 확인 후 커밋/푸시하세요:"
echo "   git status --short"
echo "   git add -A && git commit -m 'revert: 상용을 $REF 으로 롤백' && git push origin main"
