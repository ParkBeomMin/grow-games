# Phase 3 v2 — 1막 둘째 묶음 구현 계약 (오케스트레이터 · 2026-10-04)

engineer · director 에게 **같은 문장으로** 주는 문서다. 서브 에이전트끼리는 SendMessage 가 안 닿는다 — **조율은 오케스트레이터를 거친다.** 첫 묶음 계약 `25_orchestrator_phase3.md`(§8 포함)를 그대로 잇고, 부딪히면 **이 문서가 이긴다.**

## 0. 무엇을 짓나 — 읽는 순서

| 문서 | 무엇 |
|---|---|
| `15_decisions.md` | 사용자 결정 — I · J(판 횟수) · C(캐릭터) · L · S(설정) · P1 · P2 · J1~J8 · 이름 교체 · 다시 열지 않음 |
| `27_designer_moments.md` | 경기당 판 2~3번 · 최소 1번 · 상한 4 · 간격 15분 · 엔진 `createMatch` 15줄 · 약속 「첫 순간」 · 이야기 2장 약속 대칭 축소 |
| `29_designer_act1-rev3.md` | 📍 「같은 장면」 집계(엔진 `autoP` 한 줄) · 수비수 가중 · 몸 꼭대기 · 테스트 칸 · **캐릭터 만들기**(카드 = 외형 · 시작 능력치 랜덤 · 다시 뽑기 3 · 이름 🎲 · 말투) · **가족 셋 · 이야기로 고름(P1 가)** · **약발 키우기(P2 가)** · **⚙️ 설정 레이어** · `act1` 새 칸 여덟 · 졸업 줄 점수 · `winger2-grads` |
| `36_designer_moment-board-rev.md`(**§16 이 앞 절보다 우선**) | **새 판 셋**(🥅 감 · ⚡ 감 · 🧱 디딤발) · 약발 · 컨디션은 그 순간의 상황 · 🎮 솜씨 칸(🧱만 · 포지션 보정 k) · 중간 평가서 「아직」 · 계약 3 바뀜(§8-1) |
| `37_balancer_boards.md` | 새 판 재실측 — **확정 계수는 아래 §5 표만 본다**(37번 §2와 같음) · §4 inspector 회귀 목록 |
| `33_이름표대조.md` + 15번 | 이름 🎲 표의 교체 17개 |
| `scratchpad/winger2-art/webp/` | 새 그림 50장(아래 §3) · 검수 `logs/qa.md` |

## 1. 파일 담당

| 파일 | engineer | director |
|---|---|---|
| `beta/winger2/engine.js` | 27번 15줄 + 29번 `autoP` 한 줄 — **그 밖 0줄** | 읽기만 |
| `beta/winger2/live.js` | **전부** — 판 횟수 규칙 · 상황 `sit` 굴림(따로 난수원) · `odds` · `judge` 한 번 · `boards` 기록 · 머리 없는 길 | 읽기만 |
| `beta/winger-moment.js` | 읽기만 | **전부 — 새 판 셋**(36번 §2 · §7 · §8-1 계약 그대로). 🔒 판은 받은 `sit` · `odds` · `judge`만 쓰고 **배수 · 승산을 스스로 셈하지 않음**. 칸 값(🧱 정답 0.80 · 나머지 0.44 · 🥅 · ⚡ 0.5)은 맨 위 `TUNE`에 출처 주석과 함께. 연출 난수는 판정 난수와 따로(`fx-count` 계약 — 경기 화면 `Math.random` 0) |
| `game.js` · `world.js` · `events.js` · `story.js` · `achieve.js` · `book.js` · `sheet.js` · `film.js` | **전부** — 캐릭터 만들기 로직(시작 능력치 · 다시 뽑기 · 이름 표 · 말투) · 가족 이야기 · 약발 훈련 칸 · `W2Game.settings` · 중간 평가서 `open` · 솜씨 칸 · 졸업 줄 점수 · `act1` 새 칸 · 이름 교체 | 읽기만 |
| `scenes.js` · `style.css` · `art.js` · `art/` · `index.html` · `match-scene.js` | 읽기만 | **전부** — 카드 고르기(외형만 · 성격 줄 뺌 · 여섯 다 열림) · 만들기 화면 꾸밈 · ⚙️ 설정 레이어 · 중간 평가서 「11월 문턱 자 + 아직 빗금」 · 가족 장면 · 새 그림 50장 키 |
| `sw.js` · `manifest` · 공유 등록 지점 | **전부** — 캐시 이름 올림 · `ASSETS`에 새 그림 | `theme-color` 그대로 |
| `beta/winger2/focus.js` | 🔴 아무도 손대지 않음 | 〃 |
| `tests/` | 쓰지 않음(inspector) | 〃 |

## 2. 경계면 계약 — 바뀌거나 새로 생긴 것만(나머지는 25번 §3 그대로)

| # | 계약 | 모양 |
|---|---|---|
| 3′ | 판 열기 | `W2Moment.play(slot, { kind, sit, odds, judge, foot, keeper, fast, still, wide }, cb)` → `cb(judge, { s, sBoard, cell, target, seen, weak, ms })` — **36번 §8-1 그대로 + `ms`**(판이 열린 뒤 고를 때까지 · 시간 초과면 제한 시간 · 🤖 판은 0 — §17 베타 측정용, 판정에 안 씀). `judge(s)`는 고른 순간 정확히 한 번 · 결과를 받아 모션을 그림 |
| 4′ | 경기 한 판 | `info.boards: [{ kind, s, sBoard, judge, auto, cell, target, seen, weak }]` · `info.saved` · 판 수 규칙(27번) |
| 7′ | 평가서 | 중간이면 `tier` 없음 · 칸마다 `open`(남은 최대) · **몸 칸에 `left`(11월 공개 테스트 전까지 남은 훈련 주 수 — director 가 「11월까지 훈련 N주 남음」 한 줄로 · 사실 · 점수 0 · 15번 R21)** · 🎮 솜씨 칸 글 「🎮 솜씨 5.7 — 🧱 막기 판 14번(🤖 2) · 읽기 +0.07 · 포지션 보정 ×1.21」(36번 §16 — §5-1보다 우선) |
| 14 | 설정 | `W2Game.settings = { list() → [{ k, label, desc, on, shared }], on(k), set(k, v), wipe() }`(29번 §4) — director 의 ⚙️ 레이어는 이것만 부름. 8종 공유 키(`grow-auto-mini` · `grow-wide-judge`)는 이름 그대로 · `shared: true`면 「이 기기의 다른 그로우 게임에도 같이 적용돼요」 |
| 15 | 만들기 | 카드 = `{ preset, gender }`(외형만) → engineer 가 시작 능력치를 굴려 보여 줌(다시 뽑기 3 · 판 시드) · 「장기」 한 줄 · 이름 🎲 · 포지션은 능력치를 본 뒤 · 말투(도입 마지막 한마디) |
| 16 | 초상 키 | 새 50장 — `doyun-m-*` · `doyun-f-*` · `haram-m-*` · `haram-f-*`(기준 · 표정 6 · 치비 4) · `mom-smile` · `mom-worry` · `grandma-smile` · `grandma-worry` · `bg-home-doyun` · `bg-home-haram` · `end-univ` · `end-abroad` — 파일 이름이 곧 키 |
| 17 | 베타 측정(15번 J8 — 실기기 사람 `s̄`) | engineer: 손으로 둔 판(🤖 자동 빼고 · 경기 종류 무관)을 판 종류마다 모음 — `W2Game.boardStats() → { block: { n, clear, clearHit, dim, dimHit, timeout, sSum, msSum }, shot: { n, msSum }, cut: { n, msSum } }`(`sSum` = Σ`sBoard` — 상황 배수 전 판 값) · 이 기기 누적(따로 키 · 새 판을 시작해도 남음 · `settings.wipe()`가 지움) / director: ⚙️ 레이어에 `GROW_ENV.beta`일 때만 「🔬 베타 측정」 칸 — 판마다 `n` · 🧱 평균 판 값 · 맞힌 몫(잘 보임 · 흐림) · 시간 초과 몫 · 평균 고름 시간 + 「📋 복사」(한 줄 글 · 클립보드 실패하면 글을 골라 둠) — 운영(베타 아님)에선 칸 0 |

## 3. 그림 인계

- `scratchpad/winger2-art/webp/` 에서 **`.v1.` 이 들어간 파일과 `doyun-base.webp` · `haram-base.webp`(옛 이름 — `doyun-m-base` · `haram-m-base`와 바이트까지 같은 사본)를 빼고** 아직 `beta/winger2/art/`에 없는 것을 복사합니다 — **54장** = 새로 50장 + 첫 묶음 때 빼 둔 `doyun-m-base` · `haram-m-base` · `mom-base` · `grandma-base` 넷(이제 쓰임). 복사는 director 몫 · `sw.js` `ASSETS`는 engineer 몫
- 도연(도윤 여)은 **곧은 턱선 보브 + 일자 앞머리** 2판입니다(1판 픽시컷은 썸네일에서 남자 지호와 겹쳐 버림)

## 4. 작업 규칙

25번 §6 그대로 — `beta/` 안에서만 · 커밋 · 푸시 · `git add` 금지 · 서로의 파일은 읽기만 · 코드는 최소한(검증 · 에러 처리 · 보안 · 접근성은 줄이지 않음) · 긴 작업은 백그라운드 · 산출물 engineer → `30_engineer_변경요약.md` 아래에 「v2」 절 / director → `31_director_화면.md` 아래에 「v2」 절(실기기 확인 목록 필수)

## 5. 확정 계수 — 37번 §2 · 사용자 J7 · J8(2026-10-04)

숫자는 **이 표만** 봅니다(37번 §2와 같음). 🔶 = 실기기 사람 `s̄` 뒤 다시 맞출 값 — 코드에서 한 곳(`TUNE` · 상수)에 모으고 출처 주석(「37번 §2」).

| 이름 | 값 | 자리 | 담당 |
|---|---|---|---|
| `COND_REF` | 51 그대로 | `engine.js` | 안 건드림 |
| `ACT1_SPOT` | 8.151 · 6.910 · 4.637 · 7.642 그대로 | `world.js` | engineer |
| `n_pos`(경기당 · 상한 40) | **39.83 · 36.36 · 34.46 · 37.24**(34번 36.50 · 33.40 · 31.71 · 34.11에서 바뀜) | `sheet.js` | engineer |
| `RATE_B` | 62 · 61 · 62 · 62 그대로 | `world.js` | engineer |
| 구간 문턱 `T1 · T2 · T3` 🔶 | **64.4 · 57.4 · 50.8** — 구간은 **보이는 한 자리 총점**으로 판정(보이는 값 = 판정 값) | `sheet.js` | engineer |
| `READ_K` 🆕 | **1.2045 · 1.2412 · 0.9942 · 0.7360**(공격수 · 윙어 · 미드필더 · 수비수) | `sheet.js` | engineer |
| 🎮 솜씨 칸 | `clamp(4.0 + 20 × k × Σρ ÷ max(n, 8), 0, 10)` · ρ = `s_board` − 0.5 · **공식 경기 🧱 판만**(🤖 ρ 0 · 시간 초과 ρ −0.5) · 🥅 · ⚡ · 승부차기 킥 · 기술 테스트 · 연습경기 빠짐 · 🤖만이면 4.0 | `sheet.js` · `game.js` | engineer |
| 🧱 칸 값 · 흐림 몫 🔶 | 정답 **0.80** · 나머지 **0.44** · 흐림 50% | `winger-moment.js` `TUNE` | director |
| 🥅 · ⚡ 칸 값 | 여섯 칸 **0.5** · 시간 제한 없음 · ⚡ 고르기 전 그림에 수비 0 | `winger-moment.js` `TUNE` | director |
| 🦶 약발 상황 | 판의 ⅓(판마다 독립 · 상황 난수원은 엔진 열과 따로) · **`🦶 = min(0.95, 0.75 + 0.13 × 약발 단계)`** → 0 · 1 · 2단계 0.75 · 0.88 · 0.95 | `live.js` | engineer |
| 🫀 | `condMul(그 경기 날 컨디션)` · `s = clamp(s_board × 🦶 × 🫀)` · 🤖도 같은 상황 | `live.js` | engineer |
| 📍 `q` | `cardP(autoP(kind, 민재), 민재 실력, 0.5 × 🦶(약발 0단계))` · 민재 🫀 1 · `SLOT_LINE` 1.5 · `RIVAL_PLUS` 6 · 수비수 가중 0.55 × 3 · `RACE_N` 0 그대로 | `game.js` · `world.js` | engineer |
| Mₑ | 24번 13칸 + `s_slot1` 포지션별 그대로 | `events.js` · `story.js` | engineer |
| λ · 몸 꼭대기 · 테스트 | λ 1 · 몸 (77, 5.06) · (88, 6.10) · 테스트 0~4(기술 1.6 · 연습경기 2.4) 그대로 | `sheet.js` | engineer |
| 시작 능력치(J6) | 1점 × 48 · 다시 뽑기 3 · 「장기」 한 줄(점수 0) | `game.js` | engineer |
| 업적 희귀도 | **`g7` 드묾 → 귀함**(하나만) · 나머지 34번 표 | `achieve.js` `TIER` | engineer |

- **약발 2단계 상한(오케스트레이터)**: 37번 둘째 값 13%p는 1단계까지만 쟀습니다(1막 「약발 먼저」 판 100% 1단계). 그대로 늘리면 2단계가 1.01(약발이 주발보다 나음)이라 36번 설계의 꼭대기 **0.95**로 묶습니다 — 2막 · R20 재보정 때 다시
- **J7 끝 조항은 자(측정)만** — 코드 0줄. inspector 는 37번 §4 회귀 목록 + K3를 「중앙값 ±1 ≥ 90 · 중앙값이 끝(최상 · 하)이면 끝 + 이웃 ≥ 85」로 봄
- **J8(받아들이고 실기기 뒤 다시)** — 손잡이 0. 대신 실기기 사람 `s̄`를 받을 길이 있어야 해서 §2-17 「🔬 베타 측정」을 이번 묶음에 넣음(베타는 원격 기록이 꺼져 있어 범민 님이 복사해 주는 방식)
- **R21(15번)** — §2-7′ `left` 한 줄 · **R20** — 13%p 적용한 채(실기기 뒤 다시)

## 6. 구현 중 맞춘 것 (engineer → 오케스트레이터 → director · 2026-10-04)

계약의 뜻은 그대로, 이름 · 모양만 정했습니다. inspector 는 이것도 계약으로 봅니다.

| # | 맞춘 것 |
|---|---|
| 3′-a | `sit = { weak, step, foot, cond }` — `sit.foot` = 🦶 **배수**(약발 상황이면 `min(0.95, 0.75 + 0.13 × step)`, 아니면 1) · `sit.cond` = 🫀 배수. 판은 `s = clamp(sBoard × sit.foot × sit.cond, 0, 1)` 곱하기만. ⚠️ `opts.foot`(차는 발 `"L"` · `"R"` — 약발 상황이면 드라이버가 이미 반대 발로 넘김, 판에서 다시 뒤집지 않음)과 이름이 겹침 — 36번 §8-1 이름 그대로 |
| 3′-b | `odds(s)` → **정수 %(0~100)** = `round(100 × cardP(그 판의 중심, 능력치, s))` · 기본 승산 = `odds(clamp(0.5 × foot × cond))` · 약발 화살표 앞 = `odds(clamp(0.5 × cond))` |
| 3′-c | `judge(s)` → `"perfect"` · `"ok"` · `"miss"` · 두 번째 부르면 첫 결과를 그대로(새 굴림 0) |
| 3′-d | **`slot`이 `null`이면** 판을 그리지 않고 곧바로 🤖처럼(`sBoard` 0.5 · `judge` 한 번 · `cb`, `ms` 0) — 머리 없는 길도 같은 `W2Moment.play`를 부름 · 판이 던지면 드라이버가 🤖로 받음 · 시간 초과면 `cell` null · `sBoard` 0 |
| 14-a | `list()` 칸에 `applies` · `locked` 더함 · 키: `auto`(`grow-auto-mini` · 공유) · `fast`(`winger2-fast`) · `wide`(`grow-wide-judge` · 공유) · `still`(`winger2-still` · 기기가 움직임 줄이기면 `locked`) · `buzz`(`winger2-buzz` · 기본 켜짐) · `wipe()` → 지운 키 목록 · 도움말 `W2Game.help()` · 입구의 🤖 · ♿ 체크박스는 설정으로 옮김 · `#btn-cloud`는 입구에 그대로(8종 표준) |
| 15-a | 카드 고르기는 `{ preset, gender }`만 돌려줌(여섯 다 열림) · **만들기 화면 DOM은 engineer**가 `#w2` 안에 그리고 클래스 목록을 30번에 적음 — director 는 `style.css`로 꾸밈 · 도입 `intro(ctx)`에 `ctx.choices = [{ k: "hot" \| "calm" \| "play", text, mood }]` — director 가 셋 중 고르게 그려 고른 `k`를 돌려줌(안 돌려주면 기본값) |
| 7′-a | 중간 평가서 `{ final: false, week, cols, total, tier: null, open: { stage: 10, test: 4 }, T: { top: 64.4, high: 57.4, mid: 50.8 } }` · 아직 칸은 `col.open` · 몸 칸 `col.left` · `total` = 끝난 칸의 합(한 자리) |
| — | 🤝 사람 카드: 가족 셋 `dad` · `mom` · `grandma` + 태오 · 선택지마다 `note`(「🎓 이 이야기의 문은 평가서 「상」에서 열려요」) · 카드 몸 「올해 끝까지 함께할 이야기 — 하나만 고를 수 있어요」 |
| 3′-e | (director) 판 머리 = `odds(clamp(0.5 × foot × cond))` · 🫀 꼬리표 = `odds(clamp(0.5 × foot × cond)) − odds(clamp(0.5 × foot))`(1%p 이상일 때만) · 「🦶 약발로!」 = `sit.weak && judge === "perfect"` · 판이 열린 동안 `<html>`에 `w2-board-open` · 판 연출 난수는 판 안의 따로 난수원(`Math.random` 0 · 엔진 `_rng` 0 · 경기 화면 `fxRnd` 0) |
| 14-b | (director) ⚙️ 버튼은 `scenes.js`가 스스로 붙임 — `body` 직속 · 오른쪽 위 고정 · 44px · `aria-label="설정"` · `html.w2-lock` · `w2-board-open` 동안 숨김 · `W2Scenes.settings()`가 레이어를 엶 · 레이어가 부르는 것은 `W2Game.settings` · `help` · `boardStats`(베타만) · `Cloud.openModal`뿐 · 진동은 골 · 내 막음 |
| 3′-f | (director → 오케스트레이터가 받음) 🧱 **흐림**은 36번 문장(「뒤꿈치와 앞코 끝만 보임」)과 달리 **가리개를 정답과 무관하게 늘 같은 자리**에 둠 → 「뒤쪽 반이 가려지고 앞코 쪽 반만 보임」. 까닭: 가리개 자리가 정답마다 바뀌면 그 자리가 둘째 단서가 됨. 가리킨 길 · 칸 값 · 흐림 몫 50%는 그대로 — 흐림이 너무 쉬운지는 🔬 베타 측정의 잘 보임 ↔ 흐림 맞힌 몫으로 보고 36번 §14-4대로 흐림 몫만 옮김 |
