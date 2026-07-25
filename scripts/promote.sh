#!/usr/bin/env bash
# beta/ 에서 검증된 내용을 상용(루트)으로 반영해요.
# beta/ 안의 모든 것을 루트로 복사합니다 (삭제는 하지 않음 — scripts/README/.git 안전).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -d beta ] || { echo "❌ beta/ 폴더가 없어요. 먼저 scripts/sync-beta.sh 를 실행하세요."; exit 1; }
echo "▶ beta/ → 상용(루트) 반영 중…"
cp -a beta/. ./
echo "✅ 완료. 변경사항 확인 후 커밋/푸시:"
echo "   git status --short"
echo "   git add -A && git commit -m 'release: promote beta → prod' && git push origin main"
