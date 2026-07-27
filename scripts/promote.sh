#!/usr/bin/env bash
# beta/ 에서 검증된 것을 상용(루트)으로 반영해요.
#
#   scripts/promote.sh                    # 지금 beta/와 상용이 뭐가 다른지만 보여줘요
#   scripts/promote.sh rookie             # beta/rookie/ 전체를 반영
#   scripts/promote.sh rookie/career.js   # 파일 하나만 반영
#   scripts/promote.sh --all              # beta/ 전체 (검증 안 된 것까지 나가요)
#
# 대상을 반드시 적게 한 이유가 있어요. 예전에는 무조건 통째로 복사했는데,
# 다른 작업이 beta/에 얹혀 있으면 검증 안 된 그 작업까지 상용으로 딸려 나갔어요.
# 실제로 한 번 나갔고, 두 번은 손으로 막았습니다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -d beta ] || { echo "❌ beta/ 폴더가 없어요. 먼저 scripts/sync-beta.sh 를 실행하세요."; exit 1; }

# beta/와 상용이 다른 파일 목록 (상용에만 있는 것은 무시해요 — README·VERSION 등)
changed() {
  diff -rq beta . -x beta -x .git -x scripts -x docs -x .superpowers -x CHANGELOG.md 2>/dev/null \
    | sed -n 's|^Files beta/\(.*\) and \./.* differ$|\1|p'
  diff -rq beta . -x beta -x .git -x scripts -x docs -x .superpowers -x CHANGELOG.md 2>/dev/null \
    | sed -n 's|^Only in beta\(.*\): \(.*\)$|\1/\2|p' | sed 's|^/||'
}

if [ $# -eq 0 ]; then
  echo "▶ beta/ 에만 있는 변경 (상용에 아직 안 나간 것):"
  LIST="$(changed || true)"
  if [ -z "$LIST" ]; then
    echo "   (없음 — beta와 상용이 같아요)"
  else
    echo "$LIST" | sed 's/^/   · /'
    echo
    echo "이 중 검증이 끝난 것만 골라서 넘기세요:"
    echo "   scripts/promote.sh <경로> [경로...]"
    echo "다른 세션의 작업이 섞여 있을 수 있으니, 넘기기 전에 내용을 꼭 확인하세요:"
    echo "   diff -u <경로> beta/<경로>"
  fi
  exit 0
fi

if [ "$1" = "--all" ]; then
  echo "⚠️  beta/ 전체를 반영해요. 아래가 전부 상용으로 나갑니다:"
  changed | sed 's/^/   · /'
  echo
  cp -a beta/. ./
else
  for t in "$@"; do
    [ -e "beta/$t" ] || { echo "❌ beta/$t 가 없어요."; exit 1; }
    mkdir -p "$(dirname "$t")"
    cp -a "beta/$t" "$(dirname "$t")/"
    echo "   · $t"
  done
fi

echo
echo "✅ 반영 완료. 변경사항 확인 후 커밋:"
git status --short
