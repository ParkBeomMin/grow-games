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

# ---- 베타 전용 파일 — 절대 상용으로 안 나가요 ----------------------------
# beta/_check.html 은 시나리오를 누르면 localStorage 세이브를 통째로 덮어써요.
# 이게 상용에 나가면 진짜 플레이어의 캐릭터가 날아갑니다. _fixtures.js 도 한 짝이에요.
# 규칙은 "밑줄(_)로 시작하는 beta/ 최상위 파일"이에요 — 새 확인용 도구를 _로 시작하는
# 이름으로 두면 여기를 다시 안 고쳐도 자동으로 막혀요.
BETA_ONLY_GLOB='_*'
is_beta_only() { case "$(basename "$1")" in _*) return 0 ;; *) return 1 ;; esac; }

# beta/와 상용이 다른 파일 목록 (상용에만 있는 것은 무시해요 — README·VERSION 등)
# 베타 전용 파일은 목록에서도 빼요. 보이면 언젠가 누가 넘깁니다.
# ⚠️ diff는 차이를 찾으면 종료 코드 1을 돌려줍니다. set -e·pipefail 아래에서는
# 그게 실패로 잡혀서 함수가 첫 파이프라인에서 죽어요 — 실제로 --all이 아무것도
# 복사하지 않고 조용히 끝나는 사고가 났습니다. `|| true`로 종료 코드를 삼킵니다.
changed() {
  local raw
  raw="$(diff -rq beta . -x beta -x .git -x scripts -x docs -x .superpowers -x CHANGELOG.md -x "$BETA_ONLY_GLOB" 2>/dev/null || true)"
  printf '%s\n' "$raw" | sed -n 's|^Files beta/\(.*\) and \./.* differ$|\1|p'
  printf '%s\n' "$raw" | sed -n 's|^Only in beta\(.*\): \(.*\)$|\1/\2|p' | sed 's|^/||'
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
  # 통째 복사에서도 베타 전용 파일은 빼요 — cp -a beta/. ./ 는 _check.html까지 들고 갔어요.
  # cp -a ./idol "$ROOT/" 는 $ROOT/idol이 이미 있으면 $ROOT/idol/idol을 만들어요.
  # 내용만 덮어써야 하니 디렉터리는 `src/.` 형태로 넘깁니다.
  ( cd beta && for e in *; do
      case "$e" in _*) continue ;; esac
      [ -e "$e" ] || continue
      if [ -d "$e" ]; then mkdir -p "$ROOT/$e" && cp -a "$e/." "$ROOT/$e/"
      else cp -a "$e" "$ROOT/$e"; fi
      echo "   · $e"
    done )
  for f in beta/_*; do
    [ -e "$f" ] || continue
    echo "   🚫 제외(베타 전용): ${f#beta/}"
  done
else
  for t in "$@"; do
    if is_beta_only "$t"; then
      echo "🚫 $t 는 베타 전용이라 상용으로 못 넘겨요."
      echo "   확인용 도구예요 — 누르면 세이브를 덮어씁니다. 상용에 나가면 플레이어 기록이 날아가요."
      exit 1
    fi
    [ -e "beta/$t" ] || { echo "❌ beta/$t 가 없어요."; exit 1; }
    mkdir -p "$(dirname "$t")"
    cp -a "beta/$t" "$(dirname "$t")/"
    echo "   · $t"
  done
fi

echo
echo "✅ 반영 완료. 변경사항 확인 후 커밋:"
git status --short
