#!/usr/bin/env bash
# 상용(루트) → beta/ 로 복사해 베타를 최신 상용 기준으로 맞춰요.
# (새 기능 작업 전이나, 상용에 직접 반영한 핫픽스를 베타에 재반영할 때 사용)
#
#   scripts/sync-beta.sh           # 안전 검사 후 동기화
#   scripts/sync-beta.sh --force   # 검사를 무시하고 덮어쓰기
#
# 이 스크립트는 beta/를 상용으로 덮어써요. beta/에 아직 상용에 안 나간 작업이
# 있으면 그게 사라집니다. 실제로 다른 세션 작업을 한 번 날린 적이 있어서,
# 그럴 상황이면 멈추고 먼저 알려줘요.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

# ⚠️ 새 공유 파일을 beta/에 만들면 **여기에도 넣어야** 해요.
# 안 넣으면 상용에 그 파일이 없어서 지금 당장은 조용하지만, 그 게임이 승격된 뒤
# 누가 이걸 돌리면 **베타 것만 남고 상용과 갈라진 채 아무도 모릅니다.**
# (winger-moment.js가 실제로 그 상태였어요 — 검사가 찾아 줬습니다.)
CONTENT="rookie idol stock dev chef stream soccer winger2 unicorn stats index.html env.js match.js stats.js ads.js fx.js help.js base.css timing.js radar.js winger-moment.js manifest.webmanifest sw.js icon-192.png icon-512.png"

# beta/에만 있는 변경을 먼저 찾아요 — 덮어쓰면 사라지는 것들이에요
LOST=""
for item in $CONTENT; do
  [ -e "beta/$item" ] || continue
  [ -e "$item" ] || continue
  diff -rq "$item" "beta/$item" >/dev/null 2>&1 || LOST="$LOST $item"
done

if [ -n "$LOST" ] && [ "$FORCE" -eq 0 ]; then
  echo "🛑 beta/에 상용과 다른 내용이 있어요. 덮어쓰면 사라져요:"
  for item in $LOST; do echo "   · $item"; done
  echo
  echo "먼저 확인하세요:  diff -u <경로> beta/<경로>"
  echo "검증이 끝난 거면:  scripts/promote.sh <경로>"
  echo "정말 버릴 거면:    scripts/sync-beta.sh --force"
  exit 1
fi

mkdir -p beta
for item in $CONTENT; do
  [ -e "$item" ] && cp -a "$item" beta/
done
echo "✅ 상용 → beta/ 동기화 완료. 이제 beta/ 안에서 수정하고 /beta/ 에서 확인하세요."
