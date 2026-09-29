# Phase 3 — 오케스트레이터가 engineer·director 에게 같은 문장으로 주는 것 (2026-09-29)

**구현 기준은 하나다: `docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md`(이하 「스펙」).**
§6 경계면 계약이 이름·모양의 정본이고, §7 이 확정 계수, §8 이 순서, §9 가 inspector 검사 목록이다.
아래는 스펙 위에 오케스트레이터가 확정한 것 셋이다 — 스펙과 부딪히면 **이 문서가 이긴다.**

## 1. 설계자가 올린 결정 둘 — 설계자 선택대로 확정

- **스펙 §11 #8 (🔥 방어 닫기)**: 운영판이 낀 세이브(`S.betaAt !== S.savedAt`)에서 열린 🔥 은 **결말 없이 없앤다**(도감 결말·`end1`·`end5` 에 안 들어간다). 나머지 이야기는 흐지부지(방어)로 닫는다
- **스펙 §11 #12 (조각 반올림)**: 확률 조각을 **먼저 정수로 반올림한 뒤 더한다**(유스·프로 모두). 화면에 보이는 조각의 합 == 표시 % == 판정 %. 시뮬레이터와 도전 하나당 ±1%p 이하 차이는 알고 간다

## 2. 파일 담당 변경 — `index.html` 은 director 가 전부

병렬로 도는 두 에이전트가 같은 파일을 동시에 고치면 한쪽 수정이 덮일 수 있다. 그래서 스펙 §6-7 의 `index.html` 줄을 이렇게 바꾼다:

| 파일 | engineer | director |
|---|---|---|
| `beta/soccer/index.html` | **손대지 않는다** | **전부** — 새 `<section>` 둘(📖 도감 · 🎬 필름) · 타이틀 「📖 도감」 버튼 · 경기 화면 `#stage-promise` 자리 · **새 `<script>` 여섯 줄을 `career.js` 줄 바로 뒤에 이 순서로: `events.js` · `story.js` · `book.js` · `achieve.js` · `film.js` · `scenes.js`** |

나머지 파일 담당은 스펙 §6-7 그대로다(engineer: `events.js`·`story.js`·`book.js`·`achieve.js`·`film.js`·`game.js`·`career.js`·`squad.js`·`sw.js`·`beta/cloud.js` 한 줄 / director: `scenes.js`·`style.css`·`index.html`·`beta/_check.html`).
**서로의 파일은 읽기만 한다.** 필요한 게 상대 파일에 있으면 오케스트레이터에게 알린다(서브 에이전트끼리는 SendMessage 가 안 닿는다 — 조율은 오케스트레이터를 거친다).

## 2-1. 구현 뒤 확정한 것 (2026-09-29, engineer·director 보고를 받고)

- **🕯️ 「선배 번호 물려받기」 = (나)** — 선배 이름에서 늘 같은 번호를 짓는다(결정적). **1장부터 이야기 글에 그 번호를 보인다**(「#N ○○ 선배」) — 처음 보는 번호를 물려받으면 물려받기가 아니다. 내 번호와 같으면 그 선택지를 내놓지 않는다
- **평점 판정은 화면에 보이는 한 자리 값**(`toFixed(1)`)으로 — 약속 「평점 7.5 이상」·업적 `perfect`. 보이는 숫자가 판정 숫자다
- **점수 내역은 최대 나머지법으로 정수 분배** — 보이는 칸의 합 == `careerScore`. 수용
- **📍 여는 조건 ⓐ 가 ⓑ 보다 먼저** · **옛 세이브도 `pick` 객체**(`{ style, best: null, luck: null, bright }`) — 수용(스펙 §5-6 「장 생략」 대신 🌟 가장 빛난 시즌을 그린다)
- **정정: 베타와 운영판은 로컬 세이브를 공유하지 않는다** — `beta/env.js` 가 베타의 localStorage 를 `beta::` 접두사로 격리한다(15번 「오케스트레이터 제약」의 전제는 틀렸다). `S.betaAt` 방어 장치는 격리가 실패하는 브라우저·승격 직후 옛 캐시 판과 새 판이 섞이는 경우를 위해 **스펙대로 둔다**
- 기존 검사 기준선(HEAD, 경로를 HEAD 사본으로 바꿔 실측): `wc-select`·`cloud-wire` 는 HEAD 초록 → **이번 변경 탓** · `career-cloud`(⚾ rookie 결산 `reading 'length'`)는 **HEAD 에서도 빨강 — 범위 밖, 손대지 않는다** · `apps-count` 는 HEAD 에서 4번 중 1번 다른 항목으로 빨강(**원래 흔들림**) + 지금은 등번호 창이 자동 진행을 막아 빨강

- **오케스트레이터가 직접 고친 한 줄**(engineer·director 모두 멈춘 뒤): `beta/soccer/career.js` `openHofCard` — 공유 버튼이 있을 때 `WingerFilm.prepare(film || e)` 로 미리 굽는다(iOS 사파리 제스처). 확인: 구문 · smoke beta · hof · hof-word · hof-twin 종료 코드 0

## 2-2. 검증(40번) 뒤 확정한 것 (2026-09-29)

- **📍 ⓐ 는 전반기 끝 휴식기 블록 `{y}:1:19` 에서 열지 않는다** — 거기서 열리면 한 라운드도 못 세고 장 자리만 잡다가 결산에서 닫힌다. 🔥 「시즌 마지막 mid 블록에서 안 연다」(사용자 결정)와 같은 원리: 2장·집계가 설 자리가 없으면 열지 않는다
- **📍 ⓐ 는 2장이 설 자리가 남을 때만 연다** — `act.week + SLOT_CH2 <= WEEKS_PER_CB − 1`(= week ≤ 13, 숫자는 식에서 나온다). 1:19 도 이 조건이 막는다. ⓑ 는 h2 week 0 에서만 열려 늘 자리가 남는다
- 결함 둘(engineer): `book.js` `__proto__` 키 통과(프로토타입 오염) · `squad.js:797` `#${S.no}` 무이스케이프 — **둘 다 수정됨**(정규식 첫 글자 영숫자 + `Object.create(null)` 사전 · 등번호는 1~99 정수일 때만 그린다 `validNo`)
- **범민 님 승인(2026-09-29): 「남은 수정과 전체 검사가 통과하면 바로 베타로 올려줘」** — 범위 밖 ⚾ `career-cloud-test` 는 예외. 하나라도 실패하면 올리지 않고 먼저 보고
- 스펙 §9-A 8 문구 정정: 「|격차| ≥ 10」 → 「컨디션 보정을 친 |격차| ≥ 12」(실측 근거)
- 범위 밖 관찰(볼트 버그 기록으로): `rebirth()` 를 부르는 화면 자리가 베타·운영판 모두 없다(환생 훅에 못 닿음 — `p_legacy`·`gen3` 사실상 0) · 운영판 `sw.js` `ASSETS` 에 공용 파일 다섯 누락 · `career-cloud-test`(⚾) HEAD 에서도 빨강

## 3. 작업 규칙

- **`beta/` 안에서만.** 운영 루트 `soccer/` · 루트 `cloud.js`·`match.js` 등은 **절대 손대지 않는다** — 운영 반영은 사용자가 실기기 확인 뒤 `promote.sh` 로 지정한다
- **git 커밋·푸시 하지 않는다.** 커밋 범위는 오케스트레이터가 사용자에게 묻는다
- 여러 세션이 같은 워킹트리를 쓴다 — 시작 전 `git fetch origin && git log --oneline -5 && git status --short`. **내가 안 만든 변경(예: `beta/winger2/focus.js`)은 손대지 않는다.** `beta/_check.html` 은 여러 게임이 같이 쓰는 파일이다 — director 는 짧게 끝내고, 편집 직전에 다시 읽는다
- 공유 파일을 고칠 땐 **Edit(부분 수정)** 만 — Write(통째 덮어쓰기) 금지
- **긴 작업을 전경에서 기다리지 않는다**(이번 작업에서 에이전트가 10분 무진행으로 한 번 멈췄다). 진행 메모를 산출물 문서에 점진적으로 쓴다
- 산출물: engineer → `docs/superpowers/_workspace/soccer/30_engineer_변경요약.md`, director → `docs/superpowers/_workspace/soccer/31_director_화면.md`(실기기 확인 목록 필수)
- 검사(tests/)는 쓰지 않는다 — inspector 몫. 검사의 빈 자리를 발견하면 산출물에 「이 자리에 검사가 없다」로 적는다
