# Phase 3 v5 — 11대11 · 포메이션 · 살아 있는 라이벌 · 선발 판단 (오케스트레이터 · 2026-10-12)

47번(v4)을 잇고, 부딪히면 **이 문서가 이긴다.** 설계 `48_designer_formation.md`(§12가 앞 절을 이김) · `50_designer_living-rivals.md`(§11 · §12가 앞 절을 이김) · 실측 `49_balancer_formation.md` · `51_balancer_living-rivals.md` **「v4」 절** · 결정 15번 J14~J19 + 끝의 「오케스트레이터 몫」 넷.

## 1. 확정 계수 — 숫자는 **51번 v4-3 표 하나**만

- 여기에 베끼지 않는다(표가 갈라짐). 51번 v4-3 · 회귀는 v4-4(15항목)
- 요점: `n_pos` 40.31 · 36.42 · 34.56 · 43.33 · T **66.9 · 60.0 · 53.4** · 상성 c 0.03 · `ACT1_SPOT` 7.598 · 6.532 · 4.343 · 6.948 · `RIVAL_PLUS` 퇴역 · 선발 판단 `W_TRUST` 0.5 · `W_COND` 0.1 · `W_WEAK` 1.5 · `BENCH_GAP` 3.5 · 기회 주기 연속 1 · `SUB_MIN` 60 · `ACE_PLUS` 윙어 +2 · 에이스는 늘 내 포지션 자리 · 또래 수 2 · 2 · 5 · 5 · 교체 경기는 6장 끊기 없음
- 받아들인 ❌(보고만): F9 「늘 약함」 윙 · 수 · F5-b 대충 · F5-a 대충 · K5 ①

## 2. 담당

| 무엇 | engineer | director |
|---|---|---|
| 포메이션 넷 `FORMS`(필드 10 + 키퍼) · `formOf` · 감독 「줄의 폼」 규칙 · 상대 팀 포메이션(판 시드) · 엔진 `form` 배수(없으면 옛 판과 비트 같음) · 리그 다른 경기 같은 식 · 엔진 `onMin` | **전부**(`world.js` · `engine.js` · `live.js`) | 읽기만 |
| 또래 곡선 · 「한 명 더」 · 선발 판단 ①②③ · 기회 주기 · `teamRival` · 리그 라이벌 · `S.rivalLog` · J19 선 자리 기록 칸 · 민재/민서 = 이야기 인물(`role: "number"` · 곡선) · 📍 `q` · Mₑ `s_slot1` · 세이브 마이그레이션 | **전부**(`world.js` · `game.js` · `sheet.js` · `events.js` · `story.js` · `achieve.js` · `film.js`) | 읽기만 |
| 경기 판 11대11 **세로**(48번 §4) · `FORMS` 좌표 읽기 · 우리 ● · 상대 ◆ · 키퍼 표식 · 나(치비) · 흐름 꼬리표 · `fxRnd` 42번 · 움직임 줄이기 | 계약(아래)만 | **전부**(`match-scene.js` · `style.css`) |
| 경기 전 카드(양쪽 포메이션 · 상성 · 배수 · 감독 한 줄 · 선발 판단 줄 + 조각 · 「이 경기 기록은 ○○로 셈해요」) · 평가서 자리별 표 · 주간 화면 라이벌 줄 · 확인 페이지 견본 | 데이터 · 문구 | **화면 전부**(`scenes.js` · `style.css` · `check.js`) |

계약(engineer → director):
- `info.form = { us, them, m, why }` — `why` = 감독 줄의 폼 한 줄 그대로
- `info.pick = { k: 1|2|3, at, d, parts: [{ name, v }], rival: { name, grade } }` — 조각은 정수로 먼저 반올림해 더함(조각 합 = Δ)
- `FORMS[이름] = [[x, y, role], …]` 11개(키퍼 첫 줄) · 세로 좌표 · `role`로 `LINE` 고름(윙백 0.8 추가)
- 판에 서는 나 = `info.pick.at` 자리

## 3. 규칙

38번 §1 · §4 그대로 — `beta/` 안에서만 · 커밋 · 푸시 · `git add` 금지 · **`focus.js` 손대지 않음** · 서로의 파일은 읽기만 · 조율은 "main"으로. 프로토타입 `/workspace/the-winger/`는 읽기만(코드 베끼지 않음). 실명 금지. 산출물은 30 · 31번 아래 「v5」 절. 그림이 더 필요하면 director가 먼저 "main"에 말함(Codex 생성은 오케스트레이터).
