# 35 · engineer — ⚽ 더 윙어 II 실기기 확인 진입점 (`_check.html` 시나리오)

2026-08-28 · grow-engineer
근거: `41_inspector_engine-verify.md` §3 ⚪-24 · `32_director_match-screen.md` §6
앞 단계: `34_engineer_ace-fix.md`

> **커밋하지 않았습니다.** `beta/soccer/`·`tests/`는 한 글자도 안 건드렸어요.
> 공유 파일 둘(`scripts/make-fixtures.js` · `beta/_fixtures.js`)은 **더하기만** 했습니다
> (162줄 추가 · 1줄 삭제 — 그 1줄은 `generatedAt` 날짜예요).

---

## 0. 30초 요약

| | |
|---|---|
| 심은 시나리오 | **3개** — `winger2-match` · `winger2-def` · `winger2-bench` |
| 뽑는 법 | `node scripts/make-fixtures.js winger2` (**7초**) |
| 다른 게임 | 41개 그대로 (soccer 28 · rookie 8 · idol 5) — `readPrev` 병합이 살립니다 |
| 검증 | `check-page-test` ✅ · `tests/winger2/` **4종 전부 ✅** · smoke 9종 ✅ |
| 세이브 | **손으로 안 지었습니다** — jsdom에서 실제 버튼을 눌러 도달한 뒤 `localStorage`를 통째로 뜬 것 |
| 저장 키 | `winger2-save-v1-slots` **하나만** — 현행 더 윙어(`winger-save-v1`)와 안 섞입니다 |

---

## 1. 심은 시나리오

| id | 이모지 | 제목 | 무엇을 확인하러 가나 |
|---|---|---|---|
| `winger2-match` | 🔥 | 🎯 윙어 — K리그1 리그 경기 직전 | 경기 화면 · ⚽ 결정/🅰️ 전개 카드 · 🔥 순간 카드 · 추가시간 · 🏆 결승골 · ⏩ 빨리감기 · **결과 화면과 다음 버튼(F1)** |
| `winger2-def` | 🧱 | 🛡️ 수비수 — K리그1 리그 경기 직전 | 🧱 수비 카드 빈도 · 😣 실점 연출 · **"이기고 있으면 수비가 늘어난다"가 아님**(§5-3) |
| `winger2-bench` | 🪑 | 🪑 벤치 — 선발 확률 20% | 벤치 갈래 — **뛴 주와 대조하는 자리**(F1이 뛴 주에만 있었어요) · 👥 선발 % |

세 개 다 `소백 그린 · K리그1` 신인이고, 종합 48~51 · 실제 도달한 상태예요.

**왜 이 셋인가**

- director의 🎬 연출 칸(접전/대승/결승골/실점/내순간0회)은 **화면만 그 자리에서 돌려 보는 것**이라
  겹치지 않게, **게임을 통해 실제로 도달하는 상태**로 잡았습니다
- **포지션을 갈랐습니다** — 윙어는 결정·전개 카드가, 수비수는 수비 카드가 주로 열려요.
  §1에서 확인해야 할 카드 3종이 두 시나리오로 나뉩니다
- 벤치는 **F1의 대조군**이에요. 막다른 길이 뛴 주에만 있었고 벤치 갈래는 멀쩡했으니,
  둘을 나란히 눌러 봐야 "이제 양쪽 다 되는지"를 압니다

---

## 2. 🔴 경기를 **끝낸 뒤** 상태는 못 뜹니다 — 그리고 그게 맞습니다

요청하신 두 자리 중 **"경기 결과 화면"을 별도 세이브로 만들지 않았습니다.** 이유가 구조적이에요.

`scripts/make-fixtures.js`는 **통째로 동기 루프**입니다. v2 경기는 점진 확정이라
카드마다 `setTimeout`으로 넘어가는데, **동기 루프 안에서는 타이머가 한 번도 안 돕니다** —
Node 스택이 안 풀리니까요. 실제로 `playSeason`을 태워 보면 `screen-stage`에서
⏩ 버튼을 한 번 누르고 `disabled`가 되어 그대로 `false`를 반환합니다(무한 루프는 아니에요).

**대신 문 바로 앞까지 데려다 줍니다.** 세 시나리오 전부 `⚽ 경기하러 가기` **한 번**이면
경기 화면 → 결과 화면 → 다음 버튼까지 이어져요. `check` 문구에 그 순서를 적어 뒀습니다:

> 경기가 끝나면 **스코어·평점 요약**이 남고 아래 버튼이 **🏋️ 다음 경기 준비**로 바뀝니다 —
> **눌러서 실제로 넘어가는지** 꼭 봐주세요.

**이게 오히려 맞습니다.** 확인해야 할 것이 카드가 밀려 올라오는 리듬 · 순간 카드가 멈추는
느낌 · 다음 버튼이 실제로 먹히는지라, **전부 폰에서 손으로 눌러 봐야 하는 것들**이에요.
결과 화면만 담은 정적 세이브는 그걸 못 보여 줍니다.

> ⚠️ **나중에 경기 뒤 상태(시즌 결산·이적 등)가 필요해지면 이 스크립트를 async로 바꿔야 합니다.**
> `makeWinger2` 주석에 그 조건을 적어 뒀어요. 지금 바꾸지 않은 건 공유 파일이고
> soccer·idol·rookie 시나리오 41개가 전부 그 동기 흐름 위에 있어서예요 —
> **짧게 끝내라**는 규칙을 지켰습니다.

---

## 3. 손으로 안 지었다는 증거

```js
soccerDebut(P, "pro", "pos", 0, C.pos);       // 유스 3년 → 프로 도전 4라운드 → 데뷔 (전부 실제 클릭)
for (…) { if (…go-game) break; doAct(P, "#pro-actions .action-btn", "pos"); }   // 준비 턴 소진
…
keys: snapshot(P)                              // localStorage를 통째로
```

- `newPlayer` → `youthUntilSurvival` → `survivalRound` ×4 → `btn-go-debut` — **전부 실제 버튼**
- 게임 모듈이 실제로 실렸는지 그 자리에서 확인합니다 —
  `WingerSquad` · **`WingerEngine`** · **`W2Scene`** 셋 다 없으면 시드를 버려요
- 조건에 안 맞는 시드는 버리고 다음 시드로 갑니다 (`이번 주가 벤치라 경기 화면을 못 봐요` 등)

**딱 한 곳만 손으로 건드립니다** — `winger2-bench`의 `st.condition = 34`.
`soccer-bench`가 쓰는 것과 **같은 방법**이고 이유도 같아요: 선발 확률이 0%면
*"매 경기 다시 뽑힌다"*를 못 보여 줘서 **15~45% 구간**을 찾습니다(뽑힌 값 20%).
컨디션은 게임 안에서 휴식·훈련으로 늘 오르내리는 값이라, 실제 게임이 만들지 않는 조합이 아니에요.

---

## 4. 검증

```
$ node scripts/make-fixtures.js winger2
⚽ 더 윙어 II — 🎯 윙어 — 리그 경기 직전
  · 시드 1120982980: 이번 주가 벤치라 경기 화면을 못 봐요
  ✅ winger2-match — 🎯 윙어 — K리그1 리그 경기 직전
⚽ 더 윙어 II — 🛡️ 수비수 — 리그 경기 직전
  ✅ winger2-def — 🛡️ 수비수 — K리그1 리그 경기 직전
⚽ 더 윙어 II — 🪑 벤치인 주
  · 시드 1066994070: 선발 확률이 구간 밖이에요 (0%)
  ✅ winger2-bench — 🪑 벤치 — 선발 확률 20%

📦 beta/_fixtures.js — 시나리오 44개 (7초)
```

| 검사 | 결과 |
|---|---|
| `node tests/check-page-test.js` | ✅ **전부 통과** — winger2 세 장이 실제로 그려집니다 |
| └ 항목별 | `winger2-match/def/bench` × (확인할 것 · 눌러야 하는 것 · 세이브 키 · 게임 이름) 전부 ✅ |
| `tests/winger2/wiring-test.js` | ✅ — `_fixtures.js에 winger2 시나리오가 있다` 초록 (inspector가 굳힌 검사) |
| `tests/winger2/` 4종 | ✅ **engine · mutation · neutral · wiring 전부 통과** |
| `node tests/smoke-test.js beta` | ✅ 9종 |
| 다른 게임 시나리오 | soccer 28 · rookie 8 · idol 5 — **41개 그대로** |
| 저장 키 | 세 장 다 `winger2-save-v1-slots` 하나뿐 ✅ (현행 더 윙어와 안 섞임) |

⚠️ **`scripts/make-fixtures.js`나 산식을 고치면 다시 뽑아야 합니다** —
`node scripts/make-fixtures.js winger2` 한 줄이고 7초예요.
미니게임 4종(`winger-moment.js`)이 붙으면 순간 카드가 자동 판정이 아니게 되니
그때 `winger2-match`의 `check` 문구도 같이 고쳐 주세요(지금은 *"아직 미니게임이 없어서
자동으로 판정되고 넘어갑니다"*라고 적혀 있어요).

---

## 5. 건드린 파일

```
scripts/make-fixtures.js   makeWinger2(kind) 추가 · ORDER 3줄 · 실행부 3줄   (공유 · 더하기만)
beta/_fixtures.js          자동 생성 (winger2 3장 추가 · 나머지 41장 그대로)  (공유 · 자동 생성)
docs/superpowers/_workspace/35_engineer_fixtures.md
```

**손대지 않은 것**: `beta/soccer/` · `beta/winger2/`(이번엔 코드 변경 없음) ·
`beta/_check.html`(winger2가 이미 등록돼 있었어요) · `tests/` 전부 · `OPEN-ITEMS.md`

```bash
git add scripts/make-fixtures.js beta/_fixtures.js \
        docs/superpowers/_workspace/35_engineer_fixtures.md
```

---

## 관련

- 진입점 부재 보고: `41_inspector_engine-verify.md` §3 ⚪-24
- 실기기 확인 항목: `32_director_match-screen.md` §6 (20항목) · `41_inspector` §3 (4항목)
- 앞 단계: `34_engineer_ace-fix.md`
- 다음: 범민 님 실기기 확인 → 부문상 게이트 ①-G (designer)
