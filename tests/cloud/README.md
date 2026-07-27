# 클라우드 세이브 검증

이 저장소에는 테스트 러너가 없어요. 각 파일이 그냥 node 스크립트예요.

```bash
npm i jsdom --prefix tests/cloud     # 처음 한 번만
for f in tests/cloud/*-test.js tests/cloud/cloud-manual-check.js; do node "$f" || break; done
node tests/cloud/dom-test.js "$PWD/beta/rookie"
doppler run -- bash tests/cloud/server-e2e.sh    # 실서버 (선택)
```

| 파일 | 무엇을 보나 |
|---|---|
| `cloud-test.js` | 기기 토큰, 게임별 키 목록, 수집·복원 왕복 |
| `cloud-sync-test.js` | 5.3절 동기화 판정 분기 |
| `cloud-ui-test.js` | 연동 모달, 코드 발급, 클립보드 |
| `cloud-behavior-test.js` | 화면에서 고른 결과가 localStorage에 정확히 반영되는지 |
| `cloud-manual-check.js` | 실제 저장 모양(슬롯 맵·평키)으로 만든 픽스처 검증 |
| `cloud-regression-test.js` | 기존 플레이어 업그레이드 경로 (도장 없는 세이브) · savedAt으로 최신을 가려 자동으로 맞추는 갈래 |
| `cloud-writer-test.js` | 서버가 알려주는 "이 행을 쓴 기기"(mine) — 자기 자신과 충돌하지 않는지 |
| `career-cloud-test.js` | 결산·은퇴·환생에서 mark()가 최신 상태를 올리는지 |
| `cloud-pushall-test.js` | 코드 발급 시 8종을 다 올리는지, 결정 중인 게임은 건너뛰는지 |
| `cloud-link-screen-test.js` | 연동 화면이 빈 상태·충돌 없음·충돌 있음에 맞게 바뀌는지 |
| `cloud-wire-test.js` | 8종이 브라우저 순서대로 로드됐을 때 실제로 동작하는지 |
| `help-section-test.js` | 7종 도움말에 기록 보관 절이 그려지는지 |
| `dom-test.js` | 루키 경기 흐름 회귀 (클라우드와 무관한 기존 검증) |
| `server-e2e.sh` | **실서버 RPC** — 코드 재사용·재발급 무효화·RLS 잠금 |

## 주의

**픽스처는 반드시 디스크의 실제 저장 모양으로 만드세요.** 7종은 `<SAVE_KEY>-slots`
슬롯 맵을 쓰고 유니콘만 평평한 키를 씁니다. 구현이 기대하는 모양으로 픽스처를 만들면
검증이 구현을 따라 하기만 해서, 기능이 완전히 죽어 있는데도 통과합니다. 실제로 두 번 겪었어요.

**`cloud_meta`·`cloud_pull` 스텁에는 `mine`이 있습니다.** 진짜 서버는 행마다
`{"game":"beta:rookie","updated":"…","mine":true}`처럼 "이 행을 마지막으로 올린 게
당신인가"를 실어 보내요. 칸을 빼면 `false`로 읽혀서(= 남이 쓴 행) 예전 갈래가 돕니다.
이 기기가 올린 행을 흉내 낼 거면 반드시 `mine: true`를 넣으세요 —
안 넣으면 진짜로는 안 일어나는 상황을 검증하게 돼요.

**jsdom 검증은 fetch를 스텁해서 서버 동작을 못 봅니다.** 코드가 재사용 가능한지,
재발급이 옛 코드를 죽이는지 같은 건 서버 상태라 `server-e2e.sh`에서만 확인돼요.
스키마를 건드렸다면 그쪽도 꼭 돌려주세요.

CSS 렌더링은 여기서 확인할 수 없어요. 배포 후 실기기로 봐야 합니다.
