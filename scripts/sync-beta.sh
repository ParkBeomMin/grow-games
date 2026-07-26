#!/usr/bin/env bash
# 상용(루트) → beta/ 로 복사해 베타를 최신 상용 기준으로 맞춰요.
# (새 기능 작업 전이나, 상용에 직접 반영한 핫픽스를 베타에 재반영할 때 사용)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
CONTENT="rookie idol stock dev chef stream soccer unicorn stats index.html env.js match.js stats.js ads.js fx.js base.css timing.js radar.js manifest.webmanifest sw.js icon-192.png icon-512.png"
mkdir -p beta
for item in $CONTENT; do
  [ -e "$item" ] && cp -a "$item" beta/
done
echo "✅ 상용 → beta/ 동기화 완료. 이제 beta/ 안에서 수정하고 /beta/ 에서 확인하세요."
