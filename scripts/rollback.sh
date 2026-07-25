#!/usr/bin/env bash
# 상용(루트)을 특정 릴리스 태그 시점으로 되돌려요.
#
#   scripts/rollback.sh v1.0.0
#
# · beta/ 와 scripts/ 는 건드리지 않아요 (작업 중인 베타가 날아가지 않게).
# · 작업 트리만 바꿔요. 실제 반영은 직접 커밋/푸시해야 합니다.
# · 태그에 없던 파일(그 뒤에 새로 나간 게임 등)은 상용에서 제거돼요.
set -euo pipefail

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "사용법: scripts/rollback.sh <태그>"
  echo "사용 가능한 태그:"
  git tag -l --sort=-v:refname | sed 's/^/  /'
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git rev-parse -q --verify "refs/tags/$TAG" >/dev/null || {
  echo "❌ '$TAG' 태그가 없어요."; git tag -l | sed 's/^/  /'; exit 1;
}

# 상용 대상 = beta/ · scripts/ 를 제외한 추적 파일
EXCLUDE='^(beta/|scripts/)'
tag_files()  { git ls-tree -r --name-only "$TAG" | grep -Ev "$EXCLUDE" | sort; }
head_files() { git ls-tree -r --name-only HEAD  | grep -Ev "$EXCLUDE" | sort; }

echo "▶ 상용을 $TAG 시점으로 되돌립니다"

# 1) 태그 시점 내용으로 복원
mapfile -t RESTORE < <(tag_files)
if [ ${#RESTORE[@]} -gt 0 ]; then
  git checkout "$TAG" -- "${RESTORE[@]}"
  echo "  · 복원 ${#RESTORE[@]}개 파일"
fi

# 2) 태그 이후에 추가된 상용 파일은 제거 (checkout은 삭제를 못 해요)
mapfile -t REMOVE < <(comm -13 <(tag_files) <(head_files))
if [ ${#REMOVE[@]} -gt 0 ]; then
  printf '  · 제거 %d개 파일\n' "${#REMOVE[@]}"
  printf '      %s\n' "${REMOVE[@]}"
  rm -f -- "${REMOVE[@]}"
  # 빈 디렉터리 정리
  find . -type d -empty -not -path './.git/*' -not -path './beta/*' -delete 2>/dev/null || true
fi

echo "✅ 작업 트리 반영 완료. 확인 후 커밋/푸시하세요:"
echo "   git status --short"
echo "   git add -A && git commit -m 'revert: 상용을 $TAG 으로 롤백' && git push origin main"
