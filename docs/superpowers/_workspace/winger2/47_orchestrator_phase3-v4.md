# Phase 3 v4 — 이벤트 선택지 셋~넷 (오케스트레이터 · 2026-10-10)

44번을 잇고, 부딪히면 이 문서가 이긴다. 설계 `45_designer_event-choices.md`(이벤트 전체 표 · 카드 모양 · 문구) · 실측 `46_balancer_event-choices.md`(§2 계수 · §4 회귀 8) · 결정 15번 J11 · J12 · J13.

## 1. 확정 계수 — 46번 §2(숫자는 이 표만)

| 이름 | 값 | 담당 |
|---|---|---|
| `T1 · T2 · T3` | **67.4 · 60.3 · 53.7**(새 기준 판 「늘 확정」) | engineer `sheet.js` |
| 🌿 확정 몫(카드마다 45번 표의 하나) | 🫀 **+3** · 🤝 **+1** · 약발 경험 **+0.2** · 깃발 — **능력치 몫 없음**(46번 둘째 값 ② · J13) | engineer `events.js` |
| 🎲 작게 | 확률 조각 **+5** · 판돈 **½** | engineer |
| 🎲 크게 | 지금 도전 그대로 | — |
| 💬 이야기 | 45번 표 그대로(깃발 + 작은 몫 — 🫀 몫이면 +3) | engineer |
| 업적 라벨 | `allc` 드묾 · `rested` 귀함 · `gift` 드묾 | engineer `achieve.js` |
| 그대로 | `n_pos` · 관리 칸 · 약발 · 그 밖 43번 | — |

- 45번 표에서 확정 몫이 「능력치 +0.2」인 카드는 같은 카드의 다른 높이 밖 몫(🤝 · 깃발 · 약발 경험)으로 바꿈 — 45번 §(둘째 값 ②)
- 「보이는 값 = 판정 값」: 선택지마다 확률 조각 줄(기본 50 · 실력 · 상황 · 🎲 작게 +5) · 확정은 「확정」 꼬리표 + 받는 몫

## 2. 담당

| 무엇 | engineer | director |
|---|---|---|
| 이벤트 데이터 · 판정 · 몫 · 깃발(`act1.evFlags`) · 옛 세이브(선택지 둘이던 진행 중 카드) | **전부**(`events.js` · `story.js` · `game.js` · `sheet.js` · `achieve.js`) | 읽기만 |
| 카드 화면(셋~넷 · 각 2줄 · 52px · 320 × 568 스크롤 없음) · 확정 꼬리표 · 💬 표시 | 계약(아래 모양)만 | **전부**(`scenes.js` · `style.css`) |

카드 모양(engineer → director): `card.choices = [{ k, kind: "big" | "small" | "sure" | "talk", label, desc, p | null, parts: [{ name, v }], win: [{ stat|cond|trust|weak|flag, v }], lose: [...] | null, note }]` — 지금 두 칸 모양의 확장. 고른 결과는 지금처럼 `k`.

규칙 38번 §4 그대로. 산출물 30 · 31번 「v4」 절. inspector 는 46번 §4 + 그림 162장 · `boundary` 옮김.
