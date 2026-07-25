#!/usr/bin/env bash
# 릴리스 마무리 — VERSION 갱신 → 커밋 → CHANGELOG에 커밋 해시 기록 → 푸시.
#
#   scripts/release.sh 1.2.1 "유니콘 밸런스 조정"
#
# 이 작업 환경의 git 프록시는 브랜치 ref만 허용하고 태그 push는 403으로 막아요.
# 그래서 버전의 기준은 VERSION 파일 + CHANGELOG의 커밋 해시입니다.
# (태그는 로컬에만 만들어 두고, 원격 반영은 개인 PC에서 하면 돼요)
set -euo pipefail

VER="${1:-}"; MSG="${2:-}"
if [ -z "$VER" ]; then
  echo "사용법: scripts/release.sh <버전> [설명]"
  echo "현재 버전: $(cat VERSION 2>/dev/null || echo 없음)"
  exit 1
fi
MSG="${MSG:-릴리스 v$VER}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

echo "$VER" > VERSION
git add VERSION
git commit -m "release: v$VER — $MSG" || { echo "❌ VERSION 변경이 없어요. 버전을 올려주세요."; exit 1; }

SHA="$(git rev-parse --short HEAD)"

# CHANGELOG 표 맨 위에 이번 릴리스를 끼워 넣어요 (롤백 대상이 항상 남게)
if [ -f CHANGELOG.md ]; then
  awk -v ver="$VER" -v sha="$SHA" -v msg="$MSG" '
    !ins && /^\|---\|---\|---\|$/ { print; printf "| **%s** | `%s` | %s |\n", ver, sha, msg; ins=1; next }
    { print }
  ' CHANGELOG.md > CHANGELOG.tmp && mv CHANGELOG.tmp CHANGELOG.md
  git add CHANGELOG.md
  git commit -m "docs: CHANGELOG에 v$VER ($SHA) 기록" || true
fi

# 태그는 로컬에만 (원격 푸시는 환경에 따라 막힘)
git tag -a "v$VER" -m "릴리스 v$VER — $MSG" 2>/dev/null && echo "  · 로컬 태그 v$VER 생성" || echo "  · 태그 v$VER 이미 존재"

git push origin main
echo
echo "✅ v$VER 배포 완료 — 릴리스 커밋 $SHA"
echo "   롤백:      bash scripts/rollback.sh $SHA"
echo "   태그 반영: (개인 PC에서) git tag -a v$VER $SHA -m '릴리스 v$VER' && git push origin v$VER"
