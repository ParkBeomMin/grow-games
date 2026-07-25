#!/usr/bin/env bash
# 릴리스 마무리 — VERSION 파일을 올리고 같은 이름의 태그를 만들어요.
#
#   scripts/release.sh 1.2.0 "더 유니콘 사명 입력"
#
# VERSION 파일은 일반 파일이라 항상 푸시돼요(상용 버전의 기준).
# 태그는 환경에 따라 푸시가 막힐 수 있어, 실패해도 로컬에는 남겨둡니다.
set -euo pipefail
VER="${1:-}"; MSG="${2:-릴리스 v$VER}"
[ -n "$VER" ] || { echo "사용법: scripts/release.sh <버전> [설명]"; echo "현재: $(cat VERSION 2>/dev/null || echo 없음)"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

echo "$VER" > VERSION
git add VERSION
git commit -m "release: v$VER — $MSG" || echo "  (VERSION 변경 없음 — 커밋 생략)"

git tag -a "v$VER" -m "릴리스 v$VER — $MSG" 2>/dev/null && echo "  · 태그 v$VER 생성" || echo "  · 태그 v$VER 이미 존재"

git push origin main
if git push origin "v$VER" 2>/dev/null; then
  echo "✅ v$VER 배포 완료 (태그 포함)"
else
  echo "⚠️  태그 푸시는 실패했어요(환경 제한). VERSION 파일은 반영됐습니다."
  echo "    로컬에서: git push origin v$VER"
fi
