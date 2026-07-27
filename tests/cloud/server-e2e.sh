#!/usr/bin/env bash
# 실서버 RPC 검증. jsdom 검증은 fetch를 스텁하니까 서버 동작은 여기서만 확인돼요.
#
#   doppler run -- bash tests/cloud/server-e2e.sh
#
# 시험용 계정을 만들고 끝나면 지워요. 상용 데이터는 안 건드려요 (beta: 접두어 사용).
set -uo pipefail
: "${GROW_GAMES_SUPABASE_URL:?doppler run 으로 실행해주세요}"

Q() { curl -s -X POST "$GROW_GAMES_SUPABASE_URL/rest/v1/rpc/$1" \
  -H "apikey: $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" -d "$2"; }

FAIL=0
ok() { # ok <설명> <실제> <기대(부분일치)>
  if [[ "$2" == *"$3"* ]]; then printf '✅ %s\n' "$1"
  else printf '❌ %s\n   기대: %s\n   실제: %s\n' "$1" "$3" "$2"; FAIL=$((FAIL+1)); fi
}

S="e2e$(date +%s)"
A="${S}-aaaaaaaaaaaaaa"; B="${S}-bbbbbbbbbbbbbb"
C="${S}-cccccccccccccc"; D="${S}-dddddddddddddd"

Q cloud_push "{\"p_token\":\"$A\",\"p_game\":\"beta:rookie\",\"p_data\":{\"who\":\"A\"}}" >/dev/null
CODE1=$(Q cloud_issue "{\"p_token\":\"$A\"}" | tr -d '"')

ok "코드 형식 (4자씩 6묶음)" "$CODE1" "-"
ok "B가 코드로 연결"          "$(Q cloud_claim "{\"p_token\":\"$B\",\"p_code\":\"$CODE1\"}")" '"ok": true'
ok "같은 코드를 C도 재사용"    "$(Q cloud_claim "{\"p_token\":\"$C\",\"p_code\":\"$CODE1\"}")" '"ok": true'
ok "발급한 기기 자신은 거절"   "$(Q cloud_claim "{\"p_token\":\"$A\",\"p_code\":\"$CODE1\"}")" 'same_device'
ok "B가 A의 기록을 봄"        "$(Q cloud_pull "{\"p_token\":\"$B\",\"p_game\":\"beta:rookie\"}")" '"who": "A"'

Q cloud_push "{\"p_token\":\"$C\",\"p_game\":\"beta:rookie\",\"p_data\":{\"who\":\"C\"}}" >/dev/null
ok "C가 쓴 게 A에 보임 (계정 공유)" "$(Q cloud_pull "{\"p_token\":\"$A\",\"p_game\":\"beta:rookie\"}")" '"who": "C"'

CODE2=$(Q cloud_issue "{\"p_token\":\"$B\"}" | tr -d '"')
ok "재발급 후 옛 코드는 무효"  "$(Q cloud_claim "{\"p_token\":\"$D\",\"p_code\":\"$CODE1\"}")" 'not_found'
ok "새 코드는 유효"           "$(Q cloud_claim "{\"p_token\":\"$D\",\"p_code\":\"$CODE2\"}")" '"ok": true'

ok "짧은 토큰 거절"           "$(Q cloud_claim "{\"p_token\":\"x\",\"p_code\":\"$CODE2\"}")" 'bad_token'
ok "모르는 게임 거절"         "$(Q cloud_push "{\"p_token\":\"$A\",\"p_game\":\"evil\",\"p_data\":{}}")" '알 수 없는 게임'

for t in cloud_account cloud_device cloud_save cloud_code; do
  ok "RLS: $t 직접 조회 차단" "$(curl -s "$GROW_GAMES_SUPABASE_URL/rest/v1/$t?select=*&limit=1" \
    -H "apikey: $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY")" "[]"
done
ok "내부 헬퍼 호출 차단" "$(Q cloud_account_of "{\"p_token\":\"$A\"}")" 'permission denied'

# 시험 계정 정리 (service 키가 있을 때만)
if [ -n "${GROW_GAMES_SUPABASE_SECRET_KEY:-}" ]; then
  for tok in "$A" "$B" "$C" "$D"; do
    H=$(printf '%s' "$tok" | sha256sum | cut -d' ' -f1)
    ACC=$(curl -s "$GROW_GAMES_SUPABASE_URL/rest/v1/cloud_device?token_hash=eq.$H&select=account_id" \
      -H "apikey: $GROW_GAMES_SUPABASE_SECRET_KEY" -H "Authorization: Bearer $GROW_GAMES_SUPABASE_SECRET_KEY" \
      | grep -o '[0-9a-f-]\{36\}' | head -1)
    [ -n "$ACC" ] && curl -s -X DELETE "$GROW_GAMES_SUPABASE_URL/rest/v1/cloud_account?id=eq.$ACC" \
      -H "apikey: $GROW_GAMES_SUPABASE_SECRET_KEY" -H "Authorization: Bearer $GROW_GAMES_SUPABASE_SECRET_KEY" \
      -H "Prefer: return=minimal" >/dev/null
  done
  echo "🧹 시험 계정 정리 완료"
fi

echo
[ "$FAIL" -eq 0 ] && echo "✅ 서버 검증 통과" || echo "❌ $FAIL건 실패"
exit "$FAIL"
