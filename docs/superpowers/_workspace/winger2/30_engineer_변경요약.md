# Phase 3 — 더 윙어 II 1막 게임 로직 (engineer · 진행 메모 → 변경 요약)

> 2026-09-30 시작 · 10-02 재개 · grow-engineer · 계약 정본 `25_orchestrator_phase3.md` · 설계 정본 `12_designer_act1.md`
> ✅ **끝남** — engineer의 25번 §7 순서를 끝까지 마쳤고, 재개 때 받은 일 셋(대칭 검사 감도 · director 부탁 · 마무리 절)도 끝냈어요. 커밋 · `git add` 하지 않았어요.

## ▶️ 멈춘 지점의 처리 (9-30 일시정지 → 10-02 재개)

- **① 성별 대칭 검사의 감도: 확인됨.** 그대로 두면 남 = 여 **3/3**이에요. 여자부일 때만 세계 굴림 **앞에서** 한 번 더 뽑게 바꾸면 남 = 여 **0/3**으로 빨강이 나요(시드 11 · 22 · 33). 그래서 「같은 시드 · 같은 손이면 남녀 숫자가 한 톨도 안 다르다」는 결과를 **증거로 씁니다.**
  - 앞서 돌린 변이(이름을 세계 난수원에서 뽑기)가 초록이었던 까닭도 확인했어요. 이름 뽑기(`world.js:244`)가 세계 굴림(`world.js:192`~) **뒤**에 있고, 그 뒤로 세계 난수원을 쓰는 곳이 없어서 결합이 생기지 않았어요.
- **② director 부탁(31번 §2): 넣었어요.** 📮 넷(`pos` · 카드 `name` · 필름 `ach` · 준비 화면 종류 클래스)과 §5의 확인 페이지 칸이에요. 자세한 것은 아래 「E. director에게 전할 것」에 있어요.
- **③ 마무리 절: 아래 A~G.**

## 진행 메모 (시간순)

- [시작] 정의 · 스킬(`grow-new-game` · `grow-repo-ops`) · 25 → 15 → 12 → 13 → 11 → 21 · 23 → 22 §2 · 24(진행 중) 읽음
- balancer 모델 코드(`scratchpad/winger2-bal/lib/act2.js`)를 읽고 **구조를 그대로** 옮기기로 함 — 한 주의 순서(고르기 → 그 주의 카드 → 경기) · 대회 회복(두 번째 경기부터 +10) · 이벤트 한도(무작위 ≤ 10 · 합 18 · 남은 장 자리 먼저) · 🔥 3라운드 고정 · 약속 조건 하나 · 평점(옛 `RATE` 모양 · b 64/64/64/65)
- `git status` 시작 시점: 내가 안 만든 것 = `beta/winger2/focus.js`(손대지 않음) · `docs/superpowers/_workspace/winger2/` · director가 만드는 `beta/winger2/art/`
- `engine.js:114` `COND_REF` 80 → **51**(한 줄) — `condMul(51) = 1` · 80 → 1.087 · 30 → 0.937 확인
- `beta/winger-moment.js` 🧱 배선 — `opens` = `WORDS`에 자기 칸이 있는 종류 · `WORDS.defend`(12번 §4-3 낱말 표) · 🏃 슈터 조각(`board.side` — 새 굴림 0) · `opts.keeper`(이스케이프) · 준비 화면 열쇠 🥅 `w2v2-shot` · 🧱 `w2v2-cover` · 머리 주석을 새 규칙으로 다시 씀(원칙 ⑨). 산식 0줄
- 새 파일: `live.js`(드라이버) · `world.js` · `events.js` · `story.js` · `achieve.js` · `book.js` · `sheet.js` · `film.js` · `game.js`(새로 씀)
- 24번 확정 상수(오케스트레이터 전달 두 번) 반영 — Mₑ 13장(`s_slot1`은 포지션별 −48.00 · −54.93 · −52.27 · −64.00) · 몸 점수표 A 4.45 · S 4.55(88 위 평평) · 테스트 기준선 56.0 · `allc` 56 · `rested` ≥ 80 · 🧭 문턱 10 · 7 · 3 · 2.28 · 25 · 12
- 🧪 스크래치 장치(임시 `W2Scenes` 스텁)로 1막을 끝까지 굴림 — 막힘 0 · 오류 0. **성별 대칭**(같은 시드 · 같은 손 · 남/여) 시드 셋 모두 숫자 한 톨도 안 다름 · 같은 판 두 번도 같음
- 🧪 **게임 ↔ 실측 장치(act2.js) 분포 대조** — 첫 대조는 150판 ↔ 450판, 큰 대조는 아래 C-2
- 🧪 진짜 `match-scene.js`(director) + 진짜 판으로 수비수 리그 경기 — 🧱 판이 경기 안에서 열림(`w2m-k-defend` · 🏃 슈터 · 「🧤 태오가 가까운 쪽을…」) · 시계 1′→93′(추가시간 90+3′) · 세대 끊김 0
- 🧪 director의 진짜 `scenes.js` · `art.js`까지 얹어 1막 끝까지(여자부 수비수 · 남자부 윙어) — 오버레이 7종(pick · intro · grade · card · sheet · ending · film) 막힘 0 · 콘솔 오류 0 · 명전 항목 1줄
- 공유 등록 지점: `beta/cloud.js`(`SAVE` → `winger2-save-v2` · `SUMMARY` 새 모양 · `keysOf`에 `winger2-book`) · `beta/index.html`(`save:`) · `beta/_check.html`(판 셋 · 🧱 칸 · 옛 흐름 칸 넷을 1막 한 칸으로) · `scripts/make-fixtures.js`(`makeWinger2` 새로 — match · def · cup · test) · `beta/_fixtures.js`(winger2 네 칸 다시 뜸 · 옛 세 칸 치움)
- 옛 파일 삭제 — `camp` · `career` · `char3d` · `cup` · `fever` · `grade` · `intro` · `prospect` · `squad` · `town` · `worldcup`(.js) · `vendor/`. `focus.js`는 안 건드림
- `sw.js` — `CACHE` `winger2-v2` · `ASSETS` 전용 js 13 + 공용 8 + 그림 66(`art/`) — 목록 ↔ 디스크 대조 누락 0
- [10-02 재개] 대칭 검사 감도 확인(위) → director 부탁 반영(E) → 이 마무리 절

---

## A. 만든 것 · 남은 것 (25번 §7 순서)

| 순서 | 상태 | 파일 |
|---|---|---|
| `live.js`(엔진 + 90분 시계 — `town.js`에서 뽑음) + `world.js` + 최소 `game.js` → 입구에서 경기 한 판 | ✅ | `live.js` · `world.js` · `game.js` |
| 🧱 판 | ✅ | `beta/winger-moment.js`(배선만 · 산식 0줄) |
| 36주 루프 · 성장 · 컨디션 · 등급 | ✅ | `game.js`(`TUNE` · `ZONES` · `effOf` · `gauge` · `stepsOf`) |
| 공개 테스트 · 평가서 · 문 · 엔딩 | ✅ | `sheet.js` · `game.js`(`test` · `final`) |
| ① 이식(이벤트 · 이야기 · 업적 · 도감 · 필름) | ✅ | `events.js` · `story.js` · `achieve.js` · `book.js` · `film.js` |
| `act1` 얼림 · 등록 지점 | ✅ | `sheet.js` `freeze` · 등록 지점은 G |
| 옛 파일 삭제 · `sw.js` | ✅ | G |

- **engineer 몫으로 남은 것: 없어요.**
- 다른 사람 몫:
  - inspector — `tests/winger2/` 옮기기(D의 「검사가 없는 자리」 · 깨진 옛 검사)
  - director — 실기기 확인(31번 §4)

## B. `#w2` 안에서 쓰는 `w2-` 클래스 (director가 이걸로 꾸밉니다)

화면은 세 칸이고 모두 `.w2-screen`이에요. 화면마다 아래 클래스를 써요.

**입구 `#w2-entry`**
- 머리: `w2-title` · `w2-sub` · `w2-count`(이 게임을 한 사람 수 · 원격이 꺼지면 숨김)
- 버튼 묶음: `w2-entry-acts`
- 세이브 카드: `w2-save` · 졸업한 세이브는 `w2-save-grad`를 더함 · 안에 `w2-save-name` · `w2-save-meta`
- 버튼: 모두 `w2-btn` · 주 버튼은 `w2-btn-primary`를 더함
  - 종류: `w2-continue` · `w2-film-again` · `w2-new` · `w2-book` · `w2-help` · `w2-cloud`
- 그 밖:
  - `w2-alumni` — 졸업생 한 줄
  - `w2-opts` > `w2-opt` — 체크박스 id `w2-auto` · `wide-judge`
  - `w2-error` — 화면 조각이 안 왔을 때 · `role=alert` · `#w2` 맨 앞에 붙음

**만들기 `#w2-entry.w2-create`**
- `w2-create-title`
- `w2-field` > `w2-field-label` · `w2-name`(input) · `w2-no`(번호 input)
- 버튼 묶음 `w2-seg`(`role=group`) — 포지션은 `w2-pos`, 주발은 `w2-foot`을 더함
  - 안의 버튼 `w2-seg-btn`(`aria-pressed` · `data-v`)
- `w2-form-msg` — 검증 문구
- `w2-start` · `w2-back`

**주간 `#w2-home`**
- `w2-portrait` — director의 `portrait()`가 **자식을 통째로** 채움
- 머리 `w2-head` > `w2-week` · `w2-next`(다음 경기 글) · `w2-note`(그 주 안내 · 여러 줄)
- 컨디션 게이지 `w2-gauge`
  - 속성: `data-zone` = `exhausted` · `tired` · `normal` · `good` · `peak` · `role=meter` · `aria-value*`
  - 안: `w2-gauge-bar` · `w2-gauge-text`
- 훈련 `w2-train` > `w2-tbtn`(`data-k` = `shoot` · `pass` · `dribble` · `defense` · `stamina` · `speed`)
  - 안: `w2-tbtn-name` · `w2-tbtn-grade` · `w2-tbtn-bar`(안의 `i` 폭) · `w2-tbtn-eff`
- `w2-acts` > `w2-rest` · `w2-people`
- 기록 접이 `w2-panel`(`details`) > `w2-rec` · `w2-table`(리그 표는 `w2-league`를 더함)
  - 행: `w2-me` · `w2-ace-team` · 칸 `w2-rank`
- 아래 띠 `w2-foot` · `w2-home-exit`
  - ⚠️ `w2-foot`은 만들기 화면의 주발 묶음(`w2-seg w2-foot`)과 **이름이 같아요.** director가 `#w2-home .w2-foot`으로 범위를 좁혀 꾸몄어요(확인).

**경기 `#w2-match`**
- 머리 `w2-match-head`
- 경기 자리 `w2-live` — `live.js`가 채움
  - `w2-live-scene` — director의 `W2Scene.mount`
  - `w2-live-bar` > `w2-live-go`(`w2-btn w2-btn-primary` · 🏁 경기 시작) · `w2-live-fast`
- 경기 뒤 `w2-after`
  - `w2-after-score`에 결과를 `w2-res-W` · `w2-res-D` · `w2-res-L`로 더함
  - `w2-after-rating` · `w2-after-lines` · `w2-after-next`
  - [다음 →] 버튼 `w2-next` — ⚠️ 홈의 「다음 경기」 글과 같은 이름이라, director가 화면별로 범위를 좁혀 꾸밈
- 기술 테스트 `w2-tech` > `w2-tech-head` · `w2-tech-slot` · `w2-tech-res`
  - 결과는 `w2-tech-perfect` · `w2-tech-ok` · `w2-tech-miss`로 더함
- 승부차기 `w2-pk` > `w2-pk-head` · `w2-pk-board` · `w2-pk-list` · `w2-pk-score`
  - 킥 한 줄 `w2-pk-kick` — 누가 찼나 `w2-pk-us` · `w2-pk-them` · 결과 `w2-pk-ok` · `w2-pk-no`
- 대회 조 순위표 `w2-cup-table`

**판(`beta/winger-moment.js`)**
- 준비 화면 `w2m-ready`와 본 판 `w2m-oneone` 둘 다 종류 클래스 `w2m-k-goal` · `w2m-k-assist` · `w2m-k-defend`를 입어요(준비 화면은 10-02에 더함).
- 🏃 슈터는 `w2m-shooter`이고 방향은 `w2m-shooter-l` · `w2m-shooter-r`이에요.

**`#app` 감싸기:** 영향이 없어요. 내 코드가 찾는 것은 `#w2`(`game.js:170`) 하나와, 그 안에 내가 그리는 `#wide-judge`(`winger-moment.js:861`)뿐이에요. `#app` · `#w2-layer`는 찾지 않아요.

## C. 확인한 것 · 확인 못 한 것

**확인한 것** — 모두 저장소 밖 스크래치 장치(`scratchpad/eng/`)로 돌렸어요.
1. **성별 대칭:** 같은 시드 · 같은 손이면 남 = 여예요(시드 셋 3/3 · 같은 판 두 번도 같음).
   - **감도:** 여자부에만 세계 굴림 한 번을 더하면 0/3이 나와요.
   - 비교한 값: 능력치 · 기록 · 경기별 점수와 평점 · 평가서 총점 · 엔딩 · 리그 개인 기록
2. **게임 ↔ 실측 장치(act2.js) 분포 대조.** 정책은 고른 훈련 · 50 밑 휴식 · 🤖 · 늘 안전 · 사람 2 · 3 · 32주예요.
   - 윙어(게임 400판 ↔ 장치 1200판)
     - 여섯 평균 55.990 ↔ 55.989 · 공식 경기 13.35 ↔ 13.35 · 평균 평점 6.736 ↔ 6.739
     - 무작위 이벤트 8.77 ↔ 8.84 · 🔥 열림 .427 ↔ .432 · 대회 첫 경기 컨디션 54 ↔ 54
     - 평가서 총점 55.81 ↔ 55.67 · 구간(하/중/상/최상) 30.8/42.0/22.5/4.8 ↔ 29.9/44.1/21.4/4.6
   - 수비수(300 ↔ 900): 총점 56.14 ↔ 55.61 · 구간 30.7/39.3/23.7/6.3 ↔ 32.6/40.7/21.1/5.7 · 📍 결말 44.3/38.3/17.3 ↔ 44.7/39.2/16.1
   - ⚠️ 윙어 📍 결말(took/pair/gave)은 42.3/35.8/22.0 ↔ 35.8/42.8/21.4로 갈려요. 비교하는 평점이 다르기 때문이에요(F-3).
3. **진짜 `match-scene.js` + 진짜 판(jsdom)**
   - 수비수 경기에서 🧱 판이 열려요.
   - 시계는 1′부터 93′까지 가고, 세대 끊김은 0이에요.
4. **진짜 `scenes.js` · `art.js`까지 얹어 1막 끝까지(jsdom) — 다섯 판**
   - 판: 여자부 수비수 · 남자부 윙어 · 10-02에 여자부 수비수 · 남자부 윙어 · 여자부 미드필더
   - 오버레이 8종(pick · intro · grade · card · sheet · doors · ending · film)이 막힘 없이 뜨고, 콘솔 오류는 0이에요.
5. **director 부탁(10-02)**
   - `pos`
     - 「나」 말 자리가 수비수 30/40 · 공격수 72/46으로 서요.
     - 35주 테스트 경기도 수비수 30/40 · 미드필더 48/36 · 윙어 64/76이에요.
   - 준비 화면 클래스: `tm-box w2m-ready w2m-k-defend` · `… w2m-k-goal`
   - 필름 `ach`
     - 🏅 버튼이 5 · 10 · 7개 그려져요(딴 업적 수 그대로).
     - 기본이 아닌 업적을 골라 봤어요. `S.rep` · 저장한 필름의 `head.rep` · 명전 `rep`이 모두 고른 값이고, 한마디도 필름에 남아요.
   - 카드 `name`: 주인공 카드 그림 19장의 대체 문구가 「강민서 — 평온」이에요(「지호」 0장). NPC 14장은 그대로예요.
6. **확인 페이지 🟩 경기 화면 칸(Chromium · playwright · 390px)**
   - 실점 칸: 수비수 자리 · 치비 그림(720px 로드)이 보이고, 🧱 준비 화면(`w2m-k-defend`) → 본 판 · 슈터 → 판정 → 결과 줄까지 이어져요.
   - 접전 칸: 치비 그림과 📋 약속 줄이 보여요.
   - 결승골 칸: 스카우트석 그림(480px 로드)이 보여요.
   - 페이지 오류 0
7. **저장 검증:** 세이브의 `preset`이 `constructor` · `__proto__` · `toString`이면 거절해요(10-02에 고침 · E-7).
8. **저장소 검사**
   - `node tests/smoke-test.js beta` — ✅ 9 · 끝 코드 0
   - `tests/check-page-test.js` — 🟩 덱 검사 셋은 ✅예요. 실패는 지운 `town.js`를 읽는 한 곳뿐이에요(D-2).
   - 옛 `tests/winger2/`에서 통과하던 다섯(`check-w2m` · `minigame-tap` · `moment` · `neutral` · `seed-split`)을 10-02 변경 뒤 다시 돌렸어요. 모두 끝 코드 0 · ❌ 0이에요.
9. **문법과 목록**
   - `node --check` — 내 JS 15개 모두 통과
   - `sw.js`의 `ASSETS` 93개 ↔ 디스크: 빠짐 0 · `focus.js` 안 넣음

**확인 못 한 것**
- 실기기(폰) 전부 — director 31번 §4 목록
- 아무 시점에서나 새로고침했을 때의 복원(경기 중 · 카드 중 · 오버레이 중) — 원자성은 코드로 지켰지만 전수로 돌려 보지는 않았어요.
- 확인 페이지의 winger2 픽스처 네 칸을 **브라우저에서 눌러** 게임으로 들어가는 길 — 픽스처는 게임을 실제로 굴려 떴지만, 다시 심어 여는 것은 안 해 봤어요.
- 클라우드 왕복 · 원격 명전 제출 — 베타는 원격이 꺼져 있어요.

## D. 「검사가 없는 자리」 — inspector가 이어받을 것

1. **성별 대칭** — 같은 시드 · 같은 손이면 남녀 숫자가 같다. 장치는 `scratchpad/eng/sym-mut.js`에 있어요(감도 확인됨).
2. **컨디션과 효율**
   - 보이는 효율 = 적용되는 효율(`effOf`가 반올림한 값을 그대로 씀)
   - 효율은 훈련 **−10 전** 컨디션에서 정해져요.
   - 게이지 구간은 `ZONES` 표 하나에서 나와요.
3. **카드 단계의 원자성**
   - 굴림과 `ph` 저장이 한 덩어리예요.
   - `u`(판정 난수)는 화면에 안 넘어가요.
   - 고른 칸 번호가 이상하면 확정 칸으로 받아요.
4. **🧱 판**
   - `opens("defend")`가 참이에요.
   - 🏃 슈터 조각에 새 `Math.random`이 0이에요.
   - `keeper` 이름을 이스케이프해요.
   - 준비 열쇠는 `w2v2-shot` · `w2v2-cover`이고, 준비 화면도 `w2m-k-{kind}`을 입어요.
   - ⚠️ 옛 `one-grid` G-10(「🧱은 판이 없다」)은 이제 **반대가 맞아요.**
5. **약속** — **다음 공식 경기 하나**에서만 판정해요(살린 순간 ≥ 1 · 테스트 경기 제외).
6. **📍 자리 집계** — 6~25주 · 대회 포함 · 화면에 보이는 한 자리 평점으로 비교해요(F-3).
7. **🔥 맞수** — 11주에 열려요(M ≥ 1 · S − M ≤ 1 · 리그만). 🤖 자동 주간에는 얼굴을 숨겨요.
8. **사람 이야기 마감** — 25 · 32 · 33 · 34주
9. **대회** — +10 회복은 **두 번째 경기부터**예요. `cupFirstCond`(업적 `rested`)는 첫 경기 컨디션이에요.
10. **승부차기** — 내 킥이 솜씨(`sSum` · `sN`)와 `pkGoal`에 들어가요.
11. **공개 테스트** — 기술 판의 포지션별 종류 · `TEST_REF` 56.0 · 연습경기는 공식 기록 밖이에요.
12. **평가서**
    - 다섯 칸 · 구간 문턱 69.93 · 60.37 · 51.31
    - 문(주인공별 깃발) · 엔딩 표 · 「감독 의견 · 점수 0」
13. **한 번만 일어나는 것**
    - `act1` 얼림
    - 명전 한 번 INSERT · 한마디 씻기(`clean` 60자)
    - 고른 대표 업적 · 한마디가 저장한 필름에도 남음
14. **필름 모델**
    - `ach`는 **딴 것만** 담아요.
    - 대표 업적은 `head.rep` 한 곳이에요(마지막 장 `rep` 없음).
    - 기록이 없는 칸은 `null`이에요(0이 아님).
15. **도감** — 두 키(`winger2-book` · `-shadow`)를 합쳐요. 합칠 때 `n`은 큰 쪽 · `at`은 작은 쪽이에요. 모양이 다른 id(`__proto__` 등)는 거절해요.
16. **세이브 검증** — `preset` · `pos` · `week` · `v`를 봐요. 프로토타입 이름은 거절해요.
17. **주인공 카드의 `name`** — `who`가 주인공일 때만 붙고, NPC 카드에는 안 붙어요.
18. **목록과 등록 지점**
    - `sw.js` `ASSETS` ↔ 디스크
    - `cloud.js` `keysOf`(`winger2-book`) · `SUMMARY`
    - `make-fixtures.js` winger2 네 칸
19. **`live.js` 시계 계약**
    - 시계가 줄을 추월하지 않아요.
    - 세대 가드는 `match-scene.js` 한 곳이에요.
    - 90′ 줄이 그려진 뒤에 풀리고, 안전망 타임아웃은 0이에요.
    - 흐름 줄은 결정적이에요(판정 난수 0).
    - 화면이 없으면 화면 없이 끝까지 돌아요.
    - `pos`는 화면에만 가요.
20. **허브 색인(10-02 후속)**
    - `winger2-save-v2-slots`가 저장마다 세이브와 맞아요(이름 · 라벨 · `savedAt`).
    - 세이브 쓰기에 실패하면 색인은 그대로예요. 못 읽는 세이브면 입구가 색인을 지워요.
    - 허브 이어하기 카드는 이름과 진행 글자를 이스케이프해요.

**깨진 저장소 검사(계약된 변경의 결과)**
- 🆕 **`tests/cloud/cloud-wire-test.js` · `tests/cloud/help-section-test.js`의 winger2 칸(10-02에 찾음).** HEAD(옛 II)에서는 둘 다 통과했어요. 1막으로 다시 쓰면서 깨졌어요. 자세한 것은 아래 「10-02 후속」에 있어요.
- `tests/check-page-test.js` — 지운 `winger2/town.js`를 읽어서 죽어요. 앞의 덱 검사 셋은 통과해요. 죽는 자리는 「덱 카드가 소스가 만들 수 있는 모양인가」 검사예요. 이 검사는 옛 학교 모드의 `CARDS` · `PLAYABLE`(`town.js`)과 옛 `game.js`의 `YOUTH_CARD_KIND`를 읽는데, 둘 다 1막에 없는 개념이에요. 그래서 1막 엔진(`engine.js`)이 내는 카드 종류와 `live.js`의 흐름 줄(`_t.FLOW_LINE`)을 기준으로 다시 써야 해요.
- 옛 `tests/winger2/` 끝 코드(9-30 기준)
  - 2(못 돎 · 지운 파일 참조): award · bench · child-arc · child-cap · child · clock · creation · engine · flow90 · foot-map · foot-next · grade · league · odds · offer · prospect · school-scene · school · town-neutral · town
  - 124(시간 초과): fx-count · pitch · raf · tier-in
  - 1(단언 실패): ceil-perfect(C-3 — 옛 `COND_REF` 80 기준) · mutation(정규식이 `COND_REF = 80`을 찾음) · one-grid(G-10 · G-6d)
  - 0(통과): check-w2m · minigame-tap · moment · neutral · seed-split(10-02에 다시 0)
  - wiring · worldcup · youth-* 넷은 끝 코드를 못 읽었어요.

## E. director에게 전할 것 (31번 §2 · §5에 대한 답)

1. **📮 넷을 넣었어요.**
   - `pos` — `live.js`가 `W2Scene.mount`에 `pos`를 넘겨요. `game.js`의 리그 · 대회 · 테스트 경기 길 모두 `S.pos`를 줘요.
   - 카드 `name` — 주인공이 나오는 카드(이벤트 · 결과 · 이야기 결말 · 사람 고르기)에 플레이어 이름을 넣어요. NPC 카드에는 안 넣어요.
   - 필름 `ach: [{ id, name, tier }]` — 이 선수가 딴 업적이고, 순서는 업적 정의 순이에요.
   - 준비 화면 `w2m-k-{kind}` — 산식 · 난수 소비 0줄이에요(`ready()`가 `info.kind`를 받아 클래스만 더함).
2. **🏅 대표 업적은 `head.rep` 한 곳이에요.** 마지막 장의 `rep`은 뺐어요.
   - 필름에서 고른 대표 업적과 한마디는 명전에 올릴 때 **저장해 둔 필름에도** 써요. 그래서 「🎬 졸업 필름 다시 보기」가 고른 그대로 보여요.
   - 「다시 보기」에서 고친 것은 저장하지 않아요. 명전은 한 번만 올라가요.
3. **🏃 `.w2m-shooter`** — 이미 그 이름이에요(+ 방향 `-l` · `-r`). 바꿀 것 없어요.
4. **확인 페이지(§5)**
   - 「🖼️ 장면 바로 보기」 칸은 **안 만들었어요.** 까닭은 둘이에요.
     - 픽스처 `winger2-test`(35주 직전)가 이미 기술 판 → 연습경기(스카우트석) → 평가서 → 문 → 엔딩 → 필름을 **진짜 데이터로** 한 번에 보여 줘요.
     - 손으로 적은 견본 인자는 모델이 바뀌어도 조용히 남아요. §5 견본의 몸 칸 `max: 45`부터 실제(40.95)와 달라요.
   - 대신 §5 끝 문단대로 🟩 경기 화면 칸 셋에 새 인자를 얹었어요. 접전에는 치비 + 📋 약속 줄, 결승골에는 스카우트석, 실점에는 `pos: "df"` + 치비예요.
   - 판 부르는 순서를 게임 드라이버(`live.js`)와 같게 맞췄어요(`push`가 돌려준 판 자리 → 판정 → `push`). 옛 주석이 지운 `career.js`를 가리키고 있었어요.
5. **확인 페이지의 낡은 것(남김)**
   - 🟩 칸의 🏫 school · 🌊 flow 덱이 옛 `lite: true`를 넘겨요(지금은 무시됨). 주석도 「학교 모드」를 설명해요.
   - 덱 카드의 `moment` 이름(killpass · cutin · block)은 되돌려 줄 뿐 판을 고르지 않아요.
   - 두 칸 모두 「판이 카드를 따라가나」를 보는 데 여전히 쓸모 있어서 지우지 않았어요.
6. **모양 메모**
   - ending · film의 `name`은 맨 이름이고 이모지는 `emoji` 칸에 따로 있어요.
   - intro `lines`는 `{ mood, text, speaker?, typed? }`예요.
   - portrait에 `name` · `week`가 같이 가요.
   - 평가서 몸 칸 `max`는 40.95예요.
7. **10-02에 하나 더 고쳤어요(보고만).** 세이브의 `preset`을 `PRESETS[s.preset]`로 검사하고 있어서 `constructor` 같은 프로토타입 이름이 통과했어요. `hasOwnProperty`로 바꿨어요.

## F. 사용자 판단이 필요한 것

1. **학교 이름 목록**(`world.js` `SCHOOLS`)을 실재 학교와 대조하지 않았어요. 실재 학교 이름과 겹쳐도 되는지 봐 주세요.
2. **번호를 잃은 동안 `S.no`는 `null`이에요.**
   - 📍 「번호를 되찾은 날」 전에는 필름 `head.no`도 `null`이고, 3년 달던 번호는 `noOrig`로 남아요.
   - 명전에는 `no`가 없으면 `noOrig`를 올려요.
3. **📍 자리 집계는 화면에 보이는 한 자리 평점으로 비교해요.** 장치는 소수 평점으로 비교해요.
   - 윙어 took이 장치보다 +6.5%p예요(42.3 ↔ 35.8).
   - 장치도 한 자리로 반올림하면 38.1/38.8/23.2라 남은 차이는 표본 오차(약 1.5σ) 안이에요. 수비수는 차이가 작아요.
   - 「보이는 숫자로 진다」를 지키려고 고른 것인데, 소수로 바꾸는 건 한 줄이에요.
4. **`winger2-films`(필름) · `winger2-alumni`(졸업생)는 클라우드 백업을 안 해요.** 기념품이라 이 기기에만 두었어요. 백업할지 정해 주세요. 도감 `winger2-book`은 백업해요.
5. **허브(`beta/index.html`)의 이어하기 카드**는 `-slots` 키를 읽어서, 슬롯 없는 winger2 세이브(`winger2-save-v2`)는 허브 이어하기에 안 떠요. 게임 입구에서는 떠요.
6. **업적 희귀도 표**는 22 · 23번 기준이에요. 24번 새 격자 달성률이 오면 `achieve.js`의 `TUNE.TIER` 표만 바꾸면 돼요.

## G. 지운 파일 · 등록 지점 · 고친 파일

- **지운 파일(rm · git 아님):**
  - `beta/winger2/` 아래 — `camp.js` · `career.js` · `char3d.js` · `cup.js` · `fever.js` · `grade.js` · `intro.js` · `prospect.js` · `squad.js` · `town.js` · `worldcup.js`
  - `vendor/` — `README.md` · `three.LICENSE` · `three.module.min.js`
  - 옛 코드는 `git show HEAD:beta/winger2/<파일>`로 볼 수 있어요. balancer 스크래치의 `load.js`가 지운 `career.js`를 읽으니, 다시 돌릴 땐 이 길로 가져와야 해요.
- **등록 지점(짧게 · Edit만)**
  - `beta/cloud.js` — 저장 키 · `keysOf` · `SUMMARY`
  - `beta/index.html` — `save:`
  - `beta/_check.html` — 판 셋(🧱 칸) · 1막 한 판 칸 · 🟩 덱 새 인자 · 판 부르는 순서
  - `scripts/make-fixtures.js` — `makeWinger2`
  - `beta/_fixtures.js` — 다시 뜸
- **이 단계에서 고친 파일 전체**
  - `beta/winger2/` 아래 — `live.js` · `world.js` · `game.js` · `events.js` · `story.js` · `achieve.js` · `book.js` · `sheet.js` · `film.js`(새로 만듦) · `engine.js`(`COND_REF` 한 줄) · `sw.js`
  - 그 밖 — `beta/winger-moment.js` · `beta/cloud.js` · `beta/index.html` · `beta/_check.html` · `beta/_fixtures.js` · `scripts/make-fixtures.js`
  - 10-02에 고친 것은 `live.js` · `game.js` · `film.js` · `winger-moment.js` · `_check.html` · 이 문서예요.
- **안 건드린 것:** `focus.js`(수정 시각 8-29 그대로) · director 파일(`index.html` · `art.js` · `art/` · `scenes.js` · `style.css` · `match-scene.js`) · 운영 `soccer/` · 베타 `beta/soccer/` · 루트 공용 파일
- **24번 상수:** 24번 §2 확정값을 `TUNE` 블록에만 넣었고, 출처 주석은 「24번 §2」예요. `s_slot1`의 포지션별 Mₑ도 넣었어요. 공격수 −48.00 · 윙어 −54.93 · 미드필더 −52.27 · 수비수 −64.00이에요.

## H. 10-02 후속 — F 답 반영 · 허브 이어하기 · 희귀도 표

**F 답(오케스트레이터)**
1. 학교 이름: 오케스트레이터가 대조하고, 겹치면 바꿀 이름을 받아요. 그때까지 그대로예요.
2. `S.no` null: 받아들여짐.
3. 한 자리 평점 비교: 받아들여짐.
4. 필름 · 졸업생 백업: 운영 승격 전에 사용자에게 물어요. 지금은 그대로예요.
5. 허브 이어하기: 고쳤어요(아래).
6. 희귀도 표: 24번 R10으로 바꿨어요(아래).

**고친 것**
- `beta/winger2/game.js` — 허브 이어하기 색인 `winger2-save-v2-slots`
  - 모양은 `{ main: { name, label, savedAt } }`이고, 라벨은 「1막 N주」 · 「졸업」이에요.
  - 세이브가 **써졌을 때만** 같이 써요. 못 쓰면 색인을 지워요(틀린 카드보다 빈자리).
  - 입구가 열릴 때 세이브에 맞춰요. 못 읽는 세이브면 지우고, 색인 없는 옛 세이브나 클라우드로 받은 세이브면 다시 써요.
  - 새 판은 첫 저장에서 색인을 덮어써요. 게임 안에 따로 지우는 길은 없어요.
- `beta/index.html`(허브)
  - `progressLabel` 맨 앞에 `if (st.label) return st.label;`을 넣었어요.
  - 🔴 이어하기 카드의 이름과 진행 글자를 이스케이프했어요(`esc` — `& < > " '`). 다른 게임 카드도 같은 줄이라 함께 안전해졌어요.
- `beta/cloud.js` — `SUMMARY.winger2`가 `label`을 먼저 읽어요.
  - 클라우드 요약은 슬롯 맵을 먼저 읽어서, 이걸 안 고치면 색인을 받은 뒤 모든 세이브가 「1막 1주」로 보였을 거예요.
  - 색인 없는 옛 세이브는 전처럼 「1막 N주」 · 「1막 졸업 · 2막 대기」예요.
  - 색인이 있으면 졸업은 「졸업」으로만 보여요(「2막 대기」가 빠짐).
  - `keysOf`는 원래 `<세이브>-slots`를 담고 있어서 색인도 백업돼요.
- `beta/winger2/achieve.js` — `TUNE.TIER`를 24번 R10(새 격자 16칸 평균)과 문턱으로 맞췄어요.
  - 바뀐 것은 `longshot` 하나예요(전설 → 귀함 · 8.9%).
  - 기기 장부 업적 셋(`trio` · `all7` · `six`)은 R10 밖이라 전설 그대로예요.
- `beta/_fixtures.js` — winger2 네 칸을 다시 떴어요. 칸마다 색인 키가 들어갔고, 색인과 세이브가 맞아요.

**확인**
- 허브(Chromium · 390px)
  - 평범한 이름: 야구 「김야구 · 2년차」와 축구 「박윙어 · 프로 3년차」의 HTML이 고치기 전과 **같아요**. 바뀐 것은 II 줄의 「1년차」 → 「1막 11주」뿐이에요.
  - HTML 이름: II 이름 `<img src=x onerror=alert(1)>`, 라벨 `<b onmouseover=…>`, 다른 게임 이름 `<svg onload=…>`가 **글자 그대로** 보여요. 들어간 요소 0 · 대화상자 0이에요.
  - 고치기 전에는 같은 데이터로 alert 3번이 실제로 떴어요(재현 확인).
- 색인(jsdom · 1막 끝까지)
  - 저장마다 대조 66번, 어긋남 0
  - 졸업 뒤 「졸업」 · 세이브 쓰기 실패 뒤 색인 그대로
  - 못 읽는 세이브 → 색인 지움 · 다시 정상 세이브 → 입구가 다시 씀
  - 새 판 → 새 이름 「1막 3주」
- 클라우드 요약: 색인 있음 「1막 11주」 · 「졸업」 / 색인 없음 「1막 11주」 · 「1막 졸업 · 2막 대기」
- 희귀도: 24번 문서의 R10 표를 읽어 문턱으로 다시 매기면 28개 모두 일치해요(어긋남 0). `longshot`을 전설로 되돌리는 변이를 넣으면 어긋남 1로 잡혀요.
- 저장소 검사
  - `smoke-test.js beta` — ✅ 9 · 끝 코드 0
  - `check-page-test.js` — 픽스처 네 칸 ✅. 실패는 전부터 있던 `town.js` 한 건뿐이에요.

**🆕 찾은 것 — 결정이 필요해요: 8종 배선 검사 둘이 winger2에서 깨져 있어요**

`grow-new-game` 체크리스트의 `tests/cloud/cloud-wire-test.js` · `tests/cloud/help-section-test.js`예요. HEAD(옛 II)에서는 둘 다 **통과**했어요(HEAD를 스크래치에 풀어 돌려 확인). 1막으로 다시 쓴 뒤로 winger2 칸만 실패해요. 9-30에 이 둘을 안 돌려서 지금 찾았어요.

| 검사 | 기대 | 지금 1막 | 까닭 |
|---|---|---|---|
| Cloud.init 실행 | 페이지를 읽는 동안 `Cloud.init("winger2")` | 0회 | `boot()`가 `DOMContentLoaded`를 기다려요. 브라우저에서는 불리지만, 검사는 읽자마자 세요 |
| `#btn-cloud` | id가 있고 `#btn-hof` 바로 다음 | 없음 | 입구를 `game.js`가 그려요. 버튼은 `.w2-cloud`(☁️ 기록 연동)이고 명전 버튼은 없어요(12번에도 없음) |
| 전역 `save()` · `S` | `window.save()` → 클라우드 dirty | 없음 | `game.js`가 IIFE(`W2Game._t.save`)예요 |
| 전역 `openHelp()` | 도움말 모달이 열림 | 없음 | 같은 까닭 |
| 「💾 기록 보관」 문구 | 「이 기기의 브라우저에 저장되고」 · 「🔗 기록 연동」 | 다른 문구 | 내 도움말은 「저장돼요」 · 「☁️ 기록 연동」 |

- 기능은 브라우저에서 살아 있어요. 클라우드 init · 저장 dirty · 연동 버튼 · 도움말 모두 돌아가요.
- 깨진 것은 **8종 공통 모양**이에요. 그래서 고치는 길이 둘이에요.
  - **ⓐ 코드를 맞춤(engineer · `game.js`)**
    - 다섯 줄 안팎: 바로 부팅 · `window.save` · `window.openHelp` 노출 · 버튼 id와 문구 · 「🔗 기록 연동」 표준 문구
    - 명전 버튼(`#btn-hof`)은 1막 설계에 없어서 새로 들여야 해요.
    - 전역 `S`도 검사가 직접 써요.
  - **ⓑ 검사를 1막 모양으로 옮김(inspector)**
    - `W2Game._t.save` · `.w2-cloud` · `DOMContentLoaded` 뒤에 세기
- 셋째 길도 있어요. 문구만 8종 표준(「🔗 기록 연동」 · 「저장되고, 서버에도 자동 백업돼요」)으로 맞추는 거예요. 사용자에게 보이는 일관성이라 ⓐ·ⓑ와 상관없이 할 만해요.
- 지시를 받으면 할게요.
- **결정(오케스트레이터): ⓐ·ⓑ를 섞음 — 반영했어요.**
  - `game.js` 도움말 「💾 기록 보관」을 8종 표준 문구로 바꿨어요. 「저장되고, 서버에도 자동 백업돼요」 · 「🔗 기록 연동」 세 줄에 이 게임 한 줄(「경기 도중에 닫으면…」)을 더했어요.
  - 입구 연동 버튼을 「🔗 기록 연동」 · id `#btn-cloud`로 맞췄어요. 클래스 `w2-cloud`와 자리(도움말 다음)는 그대로예요.
  - 명전 버튼 · 전역 `save`/`S`/`openHelp` · 부팅 시점은 **안 바꿨어요**(결정대로).
  - 확인(Chromium · 진짜 입구)
    - `#btn-cloud` 1개 · 누르면 `.cloud-overlay`가 열려요.
    - 도움말 마지막 절이 표준 문구로 그려져요. 페이지 오류 0이에요.
  - 두 검사의 winger2 칸은 아직 구조 검사(부팅 전 `Cloud.init` · 전역 `save`/`openHelp`)에서 실패해요. 이건 inspector가 1막 모양으로 옮겨요.
  - 이 뒤로 `game.js`는 건드리지 않아요(director의 36주 실행).
- **마지막 수정 둘(10-02) — 끝냈어요.**
  - 🏫 `world.js` `SCHOOLS`에서 12개를 바꿨어요(32번 · 25번 §8). 다솜→도란 · 가람→미리내 · 라온→꽃샘 · 도담→느티 · 소담→살구 · 아라→높새 · 마루→큰들 · 이음→들샘 · 새길→들녘 · 해밀→언덕 · 새봄→단비 · 은하→잎새예요.
    - 길이 38과 순서는 그대로예요.
    - 같은 시드로 지금 코드와 옛 이름으로 되돌린 코드를 돌리면 숫자가 한 톨도 안 달라요(남 · 여 각 1판).
    - 옛 이름은 `beta/` · `scripts/` · `tests/`에 0건이에요.
    - 픽스처 네 칸을 다시 떴어요.
  - 🏅 `game.js` `final()`의 업적 알림을 **필름이 끝난 뒤**로 미뤘어요.
    - 판정 시점은 그대로이고, 알림 대기열은 세이브(`S.achPend`)에 둬요.
    - 진짜 장면 조각으로 1막 끝까지(여 수비수 · 남 윙어) 돌렸어요. 36주 알림 2개 = 36주에 딴 업적 2개, 엔딩 · 필름 위 알림 0, 전체 알림 수 = 딴 업적 수였어요.
    - 필름 도중에 닫았다가 다시 열면 알림이 필름 뒤에 그대로 떠요.
  - 이 뒤로 내 파일은 건드리지 않아요(inspector 차례).
- **40번 뒤 셋(10-03) — 끝냈어요.**
  - **E-1** `_check.html`의 W2 덱 하프타임 다섯 장에서 `poss` · `shots` · `rating`을 뺐어요(1막 엔진 half 카드 = `score`뿐). 옛 「🏫 학교 `lite` · `town.js`」 주석도 1막 말로 고쳤어요. `check-page-test` 종료 코드 **0**이에요.
  - **평가서 화면 한 자리** `sheet.js`
    - `tenths()`가 합계를 원래 합의 반올림으로 정하고, 칸은 내림한 뒤 0.1을 나머지가 큰 칸부터 나눠요. 그래서 칸 합 = 합계예요.
    - 구간은 그 합계(0.1 단위 정수로 견줌)로 갈라요. 문턱은 `T: { top: 69.9, high: 60.4, mid: 51.3 }`이고 주석은 「24번 §2를 화면 한 자리로」예요. 문턱은 화면 어디에도 안 그려요.
    - 확인: 1막 8판에서 `compute` 24번을 대조했어요. 칸 합 = 반올림 합계 · 칸마다 원래 값과 0.1 안 · 0.1을 받은 칸이 나머지 큰 칸 · 구간 = 한 자리 문턱, 모두 어긋남 0이에요.
    - inspector `visible-test`는 V-4 ✅이고, V-4b는 「0.1 갈리는 평가서」 **0/60**(전 20/60)이에요.
  - **🤖 솜씨 메모**
    - `live.js` 판 기록에 `auto`를 달았어요(🤖거나 판 자리를 못 받은 칸). `game.js`는 `record.sAuto`로 세요(공식 경기 · 승부차기 내 킥).
    - `sheet.js` 메모는 모두 자동이면 「판 N번 · 모두 🤖 자동 · 평균 0.50」, 섞였으면 「판 N번(🤖 k) · 평균 0.00」이에요. 점수와 산식은 그대로예요.
    - 확인: 섞인 판(20주부터 🤖)에서 「판 31번(🤖 17)」이 나왔고, N − 🤖 = 사람이 실제로 연 판 14예요.
    - 필름 「몸의 기록」의 「판 N번 · 평균 s̄」 줄은 23번 §8 문구라 **안 바꿨어요**(바꿀지는 오케스트레이터 판단).
  - 픽스처 네 칸을 다시 떴어요(중간 평가서가 새 반올림 · `sAuto`).
  - inspector 검사 중 **결정 때문에 다시 적어야 하는 곳**
    - `sheet-test`: P-5 문턱(69.93 → 69.9 등)과 변이 RECO · TIER 닻
    - `visible-test`: 변이 M_TOTAL · M_TRUST 닻(옛 `const total = r2(cols.reduce…` 줄이 없어짐)
- **필름 판 줄(10-03 결정) — 바꿨어요.**
  - `film.js` 「몸의 기록」 판 줄에 평가서 메모와 같은 규칙으로 🤖 표시를 달았어요. 23번 §8의 「평균 s̄」는 그대로예요.
    - 모두 자동: 「판 N번 · 모두 🤖 자동 · 평균 s̄ 0.50」
    - 섞임: 「판 N번(🤖 k) · 평균 s̄ …」
    - 사람만: 「판 N번 · 평균 s̄ …」
  - `boards`에 `auto`도 넣었어요. 확인: 다섯 경우(자동 · 섞임 · 사람만 · 판 0번 · `sAuto` 없는 옛 세이브)를 모델로 만들어 진짜 `scenes.js`로 그렸고, 모두 그 줄이 그대로 그려졌어요.
  - inspector `boundary-test` K-8이 옛 줄(「판 N번 · 평균 s̄」)을 그대로 찾으니, 같은 규칙으로 다시 적어야 해요.
- **업적 알림 겹침 · 움직임 줄이기(10-03 실기기 피드백) — 고쳤어요(`game.js`만 · 공용 `fx.js`는 그대로).**
  - **알림 줄:** 한 번에 하나만 띄워요. 공용 `Fx.flash`가 1.6초 뒤 지우니, 그 뒤 0.25초 틈을 두고 다음을 띄워요(`TUNE.NOTE_MS` · `NOTE_GAP`).
    - 한꺼번에 넷 이상이면 둘을 보이고 「🏅 그 밖에 N개 — 📖 도감에서」 한 줄로 묶어요(`NOTE_BUNDLE` 4 · `NOTE_SHOW` 2).
    - 엔딩 · 필름 오버레이(`#w2-layer .w2o-ending` · `.w2o-film`)가 열려 있으면 닫힐 때까지 기다려요.
    - 저장 실패 경고도 같은 줄을 타요.
  - **♿ 새 요소:** `<p id="w2-toast" class="w2-toast" role="status" aria-live="polite">`(`body` 끝)
    - 알림 글을 늘 여기에도 써서 스크린리더가 읽어요.
    - 움직임 줄이기면 `Fx.flash`가 아무것도 안 띄우니, 이 띠에 **`.is-shown`**을 붙여 화면 아래 움직임 없는 띠로 보여요.
    - 기본 모양은 `game.js`가 넣는 `:where()` 규칙(특이도 0)이라 **director의 `.w2-toast` · `.w2-toast.is-shown` 규칙이 언제나 이겨요**. 꾸밀 클래스는 `w2-toast` · `is-shown`이에요.
  - 판정 · 개수 · 저장(`S.achPend`)은 그대로예요.
  - 확인(Chromium · 진짜 타이머)
    - 2개 · 5개를 한꺼번에: 가운데 알림이 동시에 최대 1개예요. 순서대로 떴고, 5개는 「첫 골망 → 해트트릭 → 그 밖에 3개」였어요.
    - 움직임 줄이기: 가운데 알림 0, 띠가 보이고(화면 안) 같은 순서예요.
    - 띠는 `role=status/polite`이고, 가짜 필름 오버레이가 열린 2.5초 동안 알림 0이었어요.
    - 1막 끝까지 두 판(jsdom · 진짜 장면) 막힘 0 · 오류 0이었어요. 한 판은 21주에 넷을 한꺼번에 따서 묶음 한 줄이 나왔어요.
- **경기 시계 I(10-03 · 15번 I 사용자 결정) — 넣었어요.**
  - `live.js` `TUNE.MIN_MS`를 90에서 **250**으로 바꿨어요(90분 ≈ 22.5초). ⏩ · 🤖는 간격 0 그대로이고, 틱 개수 · 순서 · 판정과는 무관해요.
  - 확인(Chromium · 진짜 타이머 · 6주 리그 경기)
    - 🏁부터 결과까지 36.0초예요. 판 2번 응답 1.5초를 빼면 34.5초로, 시계 22.5초에 카드 그리기 약 12초가 더해진 값이에요. 마지막 시계는 90′이에요.
    - ⏩를 누르면 4.1초(판 빼고 2.7초)에 끝나요.
  - inspector 검사는 그대로 초록이에요: `clock-test` 21/0 · `flow90-test` 15/0 · `wiring-test` 20/0 · `check-page` 0.
  - 90ms라는 숫자는 **글자로만** 남았어요. 판정은 없어요.
    - `tests/winger2/clock-test.js:124`(메시지 「경기 1분 = 90ms」)
    - `tests/winger2/_act.js:359`(주석 「한 판 8초 남짓」)
  - `_check.html`의 시계 주석 셋(`town.js` · 90ms)은 `live.js` · `MIN_MS`로 고쳤어요. 같은 파일 757~787줄에는 옛 🏫 덱의 내력 주석(`town.js`)이 아직 남아 있어요.

---

# v2 — 1막 둘째 묶음 (engineer · 2026-10-04 · 계약 정본 `38_orchestrator_phase3-v2.md`)

> ✅ **끝남(2026-10-04)** — 진행 메모 · 새 클래스 목록 뒤에 바꾼 것 · 계약 대비 · 직접 확인한 것 · 회귀 검사 · 남은 것 · director에게 전할 것. 커밋 · `git add` 하지 않았어요.

## v2 진행 메모 (시간순)

- [11:24 UTC] 읽음: 38 → 15(C · S · P1 · P2 · J1~J8 · 이름 교체 · 「새 판 재실측 뒤」) → 27 → 29 → 36(§16 우선) → 37 §2 · §4 → 33 · 34 R10 표 · 28 R10 표. balancer 장치(`scratchpad/winger2-bal/lib/act2.js` · `snap29/winger2/engine.js`)를 읽고 엔진 16줄 · 상황 굴림 · `q` · ρ의 모양을 그대로 옮기기로 함
- [11:30] director 쪽 세부 다섯(판 열기 값 · null slot · 설정 · 만들기 · 중간 평가서)을 "main"에 보냄 → 38번 §6에 그대로 적힘
- [11:35] `engine.js` — 27번 규칙 셋(최소 1 · 상한 4 · 간격 15) + 29번 `autoP` 한 줄. balancer 사본 `snap29/engine.js`와 **300 / 300 비트 같음**(포지션 넷 × 75경기 · 같은 시드 · 같은 입력) · 판 0번 경기 0 · 5번 이상 0 · 간격 15 미만 0
- [11:45] `live.js` 새로 — 상황 굴림(🦶 ⅓ · 따로 난수원 `SALT.board`) · `odds` · `judge` 한 번 · `boards[]`(sBoard · cell · target · seen · weak · q · ms) · `first`(첫 내 순간) · 머리 없는 길도 `W2Moment.play(null, …)` · 판은 부를 때마다 전역에서 찾음
- [11:50] `world.js`(ACT1_SPOT · RATE_B · 시작 능력치 1점 × 48 · 이름 🎲 표 교체 17 · 새 소금 둘) · `sheet.js`(n_pos · T · READ_K · 솜씨 칸 · 몸 꼭대기 · 테스트 0~4 · 수비수 가중 · 중간 평가서 `open` · `left` · 문 = 가족 이야기 · 말투 · `act1` 새 칸) · `events.js`(약속 「첫 순간」 · 가족 셋 · 2장 판돈) · `story.js`(가족 셋 고르기 · 📍 「같은 장면」 · RACE_N 0) · `achieve.js`(34번 표 + g7 귀함) · `book.js`(문 힌트)
- [12:05] `game.js` — 만들기(🎲 능력치 · 다시 뽑기 3 · 장기 · 이름 🎲 · `winger2-create`) · 도입 말투 · 🦶 약발 훈련 · 🤝 가족 셋 · 설정 API · 🔬 boardStats · 졸업 줄(`winger2-grads` · 점수 ×10) · 지우기 epoch · HELP
- [12:10] `film.js`(판 줄 = 평가서 솜씨 칸 글 · 마지막 줄 일곱 엔딩) · `cloud.js`(keysOf `winger2-grads` · 졸업 요약) · `sw.js`(`winger2-v3` · 그림 120 — 목록 ↔ 디스크 누락 0)
- [12:15] 스텁 장면으로 1막 끝까지 셋(남 윙어 🤖 · 여 수비수 손 · 남 공격수 손) — 오류 0 · 중간 평가서 `open` · `left` 17 → 2 · act1 새 칸 일곱 · 졸업 줄 1(grow-hof-v1 0) · boardStats 쌓임

- [12:20] director 확인 뒤 고칠 것 둘(오케스트레이터 전달) — ① 중간 평가서 「아직」 칸 `col.note`에서 앞부분 「아직 · 최대 N — 」를 뺌(값 칸이 `col.open`으로 이미 그림 → 「7월 말 전국대회」 · 「11월 공개 테스트」 · 「… 권역 리그 우승 +1 아직」만) ② 알림 띠 `stillMotion()`이 기기 설정만 보던 것 → `settingOn("still")`(기기 설정 **또는** ⚙️ 🎞️ 움직임 줄이기 — 켠 사람에게도 같은 띠)
- [12:40] 확인 페이지(`_check.html`) 판 칸을 새 계약으로 · 🦶 약발 배수를 `live.js` `footOf` 한 곳으로 · ♿ · 🎞️는 판을 열 때마다 읽음 · 「양발」 한 줄(해설 · 필름 · 엔딩) · 📍 줄을 한 자리로 접어 셈 · 회귀 검사 34개 + 스모크 + 확인 페이지 돌림
- [12:50] 승부차기 판의 🤖 값을 **그 경기를 시작할 때의 값**으로(경기 중에 ⚙️에서 켰다 꺼도 그 경기 · 그 승부차기는 같은 값 — 「다음 경기부터」) · 픽스처 4칸 다시 뽑음(v2 세이브 모양 · 중간 평가서 글)

### v2 — `#w2` 안에서 새로 쓰는 `w2-` 클래스 (director가 꾸밈)

**만들기 `#w2-entry.w2-create`**(위에서 아래 순서)
- `w2-create-title` · 칸 머리 `w2-field-label`(「🎲 시작 능력치」 · 「🎯 포지션 — 능력치를 보고 골라요」 · 「🦶 주발」)
- 능력치 `w2-roll`(`role=group`) > 줄 `w2-roll-row[data-k]` 여섯
  - 안: `w2-roll-name`(「⚽ 슈팅」) · `w2-roll-grade`(등급 글자) · `w2-roll-bar`(안의 `i` 폭 = 값%) · `w2-roll-v`(값) · `w2-roll-badge`
  - `w2-roll-badge`는 포지션을 고르기 전엔 `hidden` · 고르면 그 포지션이 쓰는 셋에만 「주 60%」 · 「25%」 · 「15%」
- `w2-roll-sum`(「합 288 · 누구나 같아요」 · `aria-live`) · `w2-roll-best`(「⚡ 스피드가 장기예요」 · 1위 − 2위 ≥ 3이면 「…뚜렷한 장기예요」)
- `w2-btn w2-reroll`(「🎲 다시 뽑기 (3)」 — 남은 수 · 0이면 `disabled`)
- 포지션 `w2-seg w2-pos` · 주발 `w2-seg w2-foot` > `w2-seg-btn[aria-pressed][data-v]`(v1 그대로)
- 이름 `w2-name-row` > `w2-field`(라벨 + `input.w2-name`) + `w2-btn w2-name-roll`(🎲 · `aria-label` 「이름 무작위로 고르기」)
- 등번호 `w2-field` > `input.w2-no` · `w2-form-msg` · `w2-btn w2-btn-primary w2-start` · `w2-btn w2-back`(v1 그대로)

**주간 `#w2-home`** — 더한 것 둘
- `.w2-head` 안 `w2-footline`(「🦶 오른발 · 약발 1단계」 — 2단계면 「(양발)」)
- `.w2-train` 일곱째 칸 `w2-tbtn w2-tbtn-weak[data-k="weak"]`(안은 다른 훈련 칸과 같은 `w2-tbtn-name` · `-grade`(「1단계」 · 「양발」) · `-bar` · `-eff`) — 2단계면 `disabled`

**뺀 것** — 입구의 `w2-opts` · `w2-opt` · `#w2-auto` · `#wide-judge` 체크박스(⚙️ 설정 레이어로). `#btn-cloud`는 입구에 그대로.
**오른쪽 위 고정 요소** — engineer 화면엔 없어요(⚙️와 안 겹침). 아래 고정은 `#w2-toast`(알림 띠 · 움직임 줄이기 때만 보임) 하나.

## v2 — 바꾼 것

| 파일 | 바꾼 것 |
|---|---|
| `engine.js` | 27번 15줄(장면을 킥오프에 미리 굴림 · 1~6번 카드의 마지막 장면에 내 판 하나 보장 · 상한 4 · 간격 15분) + 29번 `autoP(kind, ab)` 한 줄. **그 밖 0줄** |
| `live.js` | 판 셋의 드라이버 — 상황 굴림(🦶 ⅓ · 상황 난수원은 엔진 열과 따로 `SALT.board`) · `odds`(정수 %) · `judge` 한 번 · `info.boards`(`kind · s · sBoard · judge · auto · cell · target · seen · weak · step · q · ms`) · `info.first`(첫 내 순간) · 머리 없는 길도 `W2Moment.play(null, …)`(부를 때마다 전역에서 찾음) · 화면 길에서 판 자리가 없으면 🤖 · `footOf(weak, step)` 내보냄 · `still` · `wide`는 함수면 판마다 읽음 · 약발 2단계 「양발」 해설 한 줄(경기당 한 번) |
| `world.js` | `ACT1_SPOT` · `RATE_B`(38번 §5) · 시작 능력치 `rollStart(seed, k)`(40 + 1점 × 48 · 꼭대기 56) · 이름 🎲 `HERO_NAMES`(남녀 24씩 · 33번 교체 17 · 학교 · 역할 이름과 안 겹침) · `rollName` · 소금 `start` · `board` · 열쇠 `start(k)` · `heroName(n)` · 조사 「라면」 |
| `events.js` | 약속 = 「그 경기의 내 첫 순간을 살린다」(`judge(S, first)` — 내 순간이 없으면 없던 일) · 가족 셋(`FAMILY` · `famOf`) · 2장 약속 판돈 = min(2, 6 − \|🤝\|) · 0이면 이야기만 걸린 약속 · 규칙 글 |
| `story.js` | 가족 이야기 셋을 🤝 사람에서 고름(P1 (가) — 2~30주 세 얼굴 + 문 구간 `note` · 고르면 그 사람만) · 📍 「같은 장면」 `tally(S, boards)`(한 자리로 접어 Δ · 집계 = 경기 줄의 합) · `SLOT_LINE` 1.5 · `RACE_N` 0 · 결말에 `r1` · `ok1` |
| `sheet.js` | 38번 §5 표 전부(`N_POS` · `T` · `READ_K` · 몸 꼭대기 · 테스트 0~4 · 수비수 가중 0.55) · 🎮 솜씨 칸(공식 경기 🧱만 · ρ = s_board − 0.5 · 바닥 8 · k) · 중간 평가서(`tier` 없음 · `open` · `T` · 몸 칸 `left`) · 문 = 가족 이야기(`doorOf`) · `waitOf`(일곱 엔딩의 마지막 줄) · 말투 `VOICE` · `voiceOf` · `freeze` 새 칸(`family` · `origin` · `doorWhy` · `stats0` · `rerolls` · `weak` · `voice`) · 엔딩 「양발」 줄 |
| `achieve.js` | 34번 표 + **`g7` 귀함** · `family` · `next` 조건 글 |
| `book.js` | 엔딩 힌트에 문을 여는 가족 이야기(🏭 아버지 · 🎓 엄마 · ✉️ 할머니) |
| `film.js` | 몸 장의 판 줄 = **평가서 솜씨 칸 글 그대로** · 「훈련 N주(🦶 약발 M주)」 · 양발 줄 · 마지막 장 = `waitOf` |
| `game.js` | 만들기(🎲 능력치 · 다시 뽑기 3 · `winger2-create` · 장기 · 배지 · 이름 🎲 · 포지션 · 주발 기본값 없음) · 카드 = 외형만(여섯 다 열림) · 도입 「우리 집」 + 한마디 셋 → `voice` · 🦶 약발 훈련(일곱째 칸 · 2.0마다 한 단계 · 2단계에서 닫힘 · 선수 칸 한 줄 · 반짝 알림) · 🤝 가족 셋 · `W2Game.settings`(`list` · `on` · `set` · `wipe` — 지운 뒤 늦게 끝나는 단계는 epoch로 멈춤) · `W2Game.boardStats()` · 경기 칸 `liveCfg`(상황 난수원 · 약발 · 민재 실력 · 설정) · 기술 테스트 · 승부차기 판(같은 계약 · 그 자리의 상황 열쇠) · `official()`(🧱만 솜씨 재료 · `f1` · 📍 줄 · 🎮 줄) · 중간 · 최종 평가서 · 졸업 줄 `winger2-grads`(점수 × 10 · `grow-hof-v1` · `submitHof` 안 부름) · 졸업생 목록은 `act1`이면 모두 · 도움말 · 내보내기 `settings` · `help` · `boardStats` |
| `sw.js` | 캐시 `winger2-v3` · 그림 120장(새 54장) — 목록 ↔ 디스크 어긋남 0 · `focus.js` 없음 |
| `beta/cloud.js` | `keysOf`에 `winger2-grads`(도감 키 줄은 그대로 두고 한 줄 더) · 요약 「1막 졸업 · 2막 대기」(졸업이면 모두) |
| `beta/_check.html` | 판 칸 이름 = 판의 `WORDS` 제목(🥅 슈팅 · 🅰️ 컷백 · 🧱 슛 막기) · 「🦶 상황」 칸(주발 · 약발 0 · 1 · 2단계) · 새 계약으로 엶(`sit` · `odds` · `judge` 한 번 — 엔진 · `live.js` 함수 그대로) · 결과 줄 「판 값 × 🦶 × 🫀 = s → 승산 → 판정 · 칸 · 정답 · 흐림 · ms」 · 시나리오 덱의 내 판도 새 계약(판정은 덱이 적어 둔 결과) |

## v2 — 계약 대비 (38번)

| 계약 | 상태 |
|---|---|
| 3′ 판 열기 | ✔ `W2Moment.play(slot, { kind, sit, odds, judge, foot, keeper, fast, still, wide }, cb)` — 경기 안(`live.js`) · 기술 테스트 · 승부차기(`game.js` `board`) · 확인 페이지 셋 다 같은 모양. `judge` 두 번째 부름은 첫 결과 · 판이 던지면 🤖 · `foot` = 차는 발(약발 상황이면 드라이버가 뒤집어 넘김) |
| 4′ 경기 한 판 | ✔ `info.boards` · `info.saved` · `info.first` · 27번 규칙(머리 없는 길 4×80경기: 0판 0 · 5판+ 0 · 경기당 2.27~2.52) |
| 7′ 평가서 | ✔ 중간 `{ final: false, week, cols, total, tier: null, open, T, coach, memo }` · 아직 칸 `col.open` · 몸 칸 `col.left`(17주 17 → 34주 2) · 솜씨 칸 글 「🧱 막기 판 14번(🤖 2) · 읽기 +0.07 · 포지션 보정 ×1.21」(앞의 「🎮 솜씨 5.7 — 」는 화면이 붙임) |
| 14 설정 | ✔ 38번 §6 14-a 그대로 · `wipe()`는 II 키 12개만(공유 키 · 클라우드 사본 안 지움) · 🤖 · ⏩는 경기 시작 때 · ♿ · 🎞️는 판을 열 때마다 읽음 |
| 15 만들기 | ✔ 카드 `{ preset, gender }` → 능력치 굴림(판 시드 · k번째 뽑기 — `newState`가 화면 값을 믿지 않고 다시 굴림) · 장기 한 줄 · 이름 🎲 · 포지션은 능력치 뒤 · `intro(ctx)`의 `choices` → 고른 `k`(안 돌려주면 외형 기본 말투) |
| 16 초상 키 | (director) — `sw.js` 목록에 54장 · engineer가 부르는 키는 `{preset}-{g}` · `dad` · `mom` · `grandma` · `bg-home-jiho`(도입 — 29번 §3 「우리 집」 한 곳) |
| 17 베타 측정 | ✔ `boardStats()` — 손으로 둔 판만(🤖 빼고 · 경기 · 기술 테스트 · 승부차기 모두) · 이 기기 누적 `winger2-boards` · `wipe()`가 지움 · 지우기 뒤 늦게 끝난 판은 안 셈 |
| §5 계수 | ✔ 표 그대로(코드 자리마다 「37번 §2 · 38번 §5」 주석). 🦶 2단계 0.95 꼭대기 포함 |
| §6 3′-a~e · 14-a · 15-a · 7′-a · 사람 카드 | ✔ — 단, 🅰️ 컷백의 이모지는 판 제목(director `WORDS`)에 맞춰 화면 글 · 도움말 · 경기 줄 모두 🅰️(36번 · 38번 글의 ⚡는 ⚡ 스피드와 겹침) |
| 29번 §7-2 `act1` | ✔ 새 칸 일곱(`family` · `origin` · `doorWhy` · `stats0` · `rerolls` · `weak` · `voice`) + 있는 칸 그대로 — `side`는 P2 (나)일 때만이라 없음 |

## v2 — 직접 확인한 것

- `node --check` — 내 파일 전부(`engine` · `live` · `world` · `events` · `story` · `sheet` · `achieve` · `book` · `film` · `game` · `sw` · `cloud`) + `_check.html` 인라인 스크립트
- 엔진: balancer 사본 `snap29/engine.js`와 300 / 300 비트 같음
- 1막 끝까지(스텁 장면 · 오류 0) 다섯 판 — 남 윙어 🤖 · 여 수비수 손 · 남 공격수 손 · 여 미드필더(도연 · 엄마 이야기 · 약발 훈련) 손 · 남 수비수(하람 · 할머니 이야기) 🤖 · 남 윙어(하람 · 약발) 손
  - 문 = 가족 이야기: 엄마 → 🎓 univ(「상」) · `doorWhy { story: "apply", r1: "try", ok1: true }`
  - 마지막 줄: 「🔜 이 선수는 2막을 기다려요」 · 「🎓 대학 리그에서 …」 · 「🏭 공장 팀에서 …」 · 「🎒 다시 공을 잡을 날을 기다려요」
  - 졸업 줄 `winger2-grads` 1 · 점수 = 합 × 10(530 · 566 · 594 · 575 · 539 · 499) · `grow-hof-v1` 0
- 진짜 `scenes.js`(director 작업 중 사본) + 진짜 `match-scene.js`로 1막 끝까지 — 오류 0 · 오버레이 일곱 종
- 만들기 화면(남 · 여): 합 288 · 40~56 · 다시 뽑기 (3) → (0) disabled · 넷째 누름 무시 · 새로 고침 = 같은 모양 · 같은 남은 수 · 깨진 `winger2-create` → 새 시드 · 포지션 배지(미드필더: 패스 주 60% · 드리블 25% · 체력 15%) · 이름 🎲 표 안의 이름 · 주발 기본값 없음 · 빈 번호 막힘 · `newState` 능력치 = 화면 · 시작하면 `winger2-create` 지움 · 남녀 같은 시드 = 같은 능력치
- 🦶 약발: 0 → 1(9주) → 2(18주) · 2단계 칸 `disabled` · 반짝 알림 둘 · 판의 `sit.foot` 0.75 · 0.88 · 약발 상황 몫 0.31~0.35 · 약발 상황이면 차는 발이 반대
- 「양발」 해설: 2단계 · 약발 상황이 있던 경기 6/6에 한 줄씩 · 0 · 1단계 0줄
- 머리 없는 길(보통 손 · 4 × 80경기): 경기당 판 fw 2.52 · wg 2.50 · mf 2.27 · df 2.42 · 🧱 몫 .36 · .35 · .46 · .61 · ρ 평균 +0.04 ~ +0.09(설계 +0.07) · `W2Moment.play` 778번 = 판 778개
- 확인 페이지(진짜 Chromium · director의 지금 판): 판 셋 × (주발 · 약발 1단계) — 머리 「기본 승산 52 → 49%」 · 결과 줄 · 오류 0 / 시나리오 덱 일곱 끝까지 · 오류 0
- 경기 줄: 「📍 같은 장면 4번 — 나 2번 해냄 · 민서라면 1.4번 → +0.6(번호 집계 +1.8)」 · 「🎮 🧱 막기 판 2번(🤖 1) · 읽기 +0.12 · 🥅 1번 · 🅰️ 1번」 · 받침 있는 이름은 「준혁이라면」
- 업적 알림: 엔딩 업적 둘(grad · door)이 필름 뒤 하나씩 — 둘째는 1.85초 뒤(아래 achieve-test 참고)

## v2 — 회귀 검사 (돌려 보기만 · 검사 파일은 안 고침)

`tests/winger2/` 34개 + 스모크 + 확인 페이지. **engineer 탓으로 깨진 것은 하나(FE-3 — 고침)**, 나머지는 계약이 바꾼 모양 · director 작업 중인 파일 · 검사 시점 문제예요.

| 검사 | 결과 | 까닭 | 누가 |
|---|---|---|---|
| clock · credit · engine · flow90 · fx-count · gender · hub · league · neutral · pair · pitch · seed-split · situation · 스모크(`beta/winger2` ✅) | ✅ | — | — |
| fence FE-3 「cloud 도감 키」 | ❌ → ✅ | `keysOf`에서 도감 키 줄에 졸업 줄 키를 합쳐 정규식이 못 찾음 → 도감 줄은 그대로 두고 `winger2-grads`를 따로 한 줄 | engineer(고침) |
| achieve AC-4c · 4d | ❌ | **검사 시점** — 엔딩 업적이 둘(grad · door)이면 알림 줄이 하나씩이라 둘째는 1.85초 뒤예요. 검사가 `hofDone` 순간에 세서 7 ≠ 8. 200ms 뒤에 세면 8 = 8(필름 뒤 「첫 졸업」 → 「두 장의 편지」). v2에서 시드 777 판이 가족 이야기를 골라 문 엔딩에 닿으며 드러남 | inspector — 알림 줄이 빌 때까지 기다린 뒤 세기 |
| auto-mark AM-1~3 · 0 | ❌ | 솜씨 재료가 공식 경기 🧱만(36번 §16-3) · 메모 글이 계약 7′ 모양 | inspector |
| boundary K-W2 · K-5 · K-13 · K-8 | ❌ | 그림 120장(38번 §3) · `Art` 표(director) · `w2-footline` 옷 없음(director — 클래스 목록 전달) · 필름 판 줄 = 솜씨 칸 글 | inspector · director |
| chain A-2 · C-1 · mutation E-변이 fw · wiring 변이 ACE_V0 | ❌ | 27번 규칙(최소 1 · 상한 4 · 간격 15)이 판 수 분포를 눌러 변이의 크기가 문턱 아래로(에이스 변이 fw 1.34 · 문턱 1.35 · `COND_REF` 사슬 ±0.3%). 엔진은 balancer 사본과 비트 같음 | inspector(문턱 · 변이) |
| wiring B-4 · 변이 M_STAKE · 0 | ❌ | B-4는 판 열기 모양이 계약 3′로 바뀜 · M_STAKE는 문구 표(director 파일) | inspector |
| flow F-1 · F-2 · F-2b · 0 | ❌ | 카드 여섯 다 열림(38번 §1) · 졸업 줄은 `winger2-grads`(`grow-hof-v1` 0줄 — 29번 §5) · 문 = 가족 이야기(P1 (가)) · 새 문턱에서 시드 901이 「하」 · UNLOCK 정규식 | inspector |
| save SV-3b · SV-4 | ❌ | 졸업생 목록은 `act1`이면 모두 · 졸업 줄 `winger2-grads`(29번 §5) | inspector |
| sheet 0 · P-1 · P-3 · P-5 · P-7 · 변이 RECO | ❌ / 💥 | 38번 §5(몸 꼭대기 · 문턱) · 문 = 가족 이야기 · 솜씨 칸 `detail`이 `{ n, auto, rho, rhoHat, k }`(옛 `avg` 없음 — P-1이 `undefined.toFixed`로 죽음) | inspector |
| story Y-4 · Y-6 · 0 | ❌ | `RACE_N` 0(38번 §5) · 약속 = 첫 순간(27번 §8) | inspector |
| visible V-2 · V-4 · V-4b · V-4c · 0 | ❌ | 훈련 칸 일곱(🦶 약발) · 중간 평가서 `tier` 없음(계약 7′) · 화면 합계 읽기(director의 새 중간 평가서) | inspector · director |
| ceil-perfect · minigame-tap · mirror · moment · one-grid · raf · tier-in | ❌ / 💥 | 판 셋 새로(director `winger-moment.js`) — 옛 판의 변이 정규식 · 옛 종류(cutin · killpass · oneone 움직임) | inspector |
| 확인 페이지 | ❌ 1건 | 판 칸 이름 셋은 이제 판 제목과 같음 ✔. 남은 것: 검사가 옛 열기(`condition` · `moment` — `sit` · `odds` · `judge` 없음)로 🧱 판을 6ms 안에 세면 칸 0 · 감도 변이의 이름 정규식이 옛 「슛 코스 막기」 | inspector |

## v2 — 남은 것

- **`scripts/make-fixtures.js`의 winger2 안내 글**(루트 `scripts/` — 작업 규칙 밖이라 안 고침): 「🤖 입구의 자동 진행」 · 「가장 밝은 칸」 · 「🥅 상대 골문 6칸」 같은 옛 판 · 옛 입구 문구. 픽스처 자체는 새 코드로 다시 뽑음(4칸 모두 v2 세이브 — `statsAt0` 합 288 · `voice` · `weak` · 중간 평가서 `open` 글)
- 서버 졸업 줄(`W2Online` · `hof_grad` — 29번 §5 ③)은 이번 계약에 없음 → 기기 `winger2-grads`까지만. 「이름 공개를 끈 판은 익명」은 II에 이름 공개 칸이 없어 해당 없음
- `act1.side`(P2 (나))는 안 만듦 — P2 (가)로 정해짐
- 검사 갱신은 inspector 몫(위 표)

## v2 — director에게 전할 것

- 만들기 · 주간 화면의 새 클래스는 위 「`#w2` 안에서 새로 쓰는 `w2-` 클래스」 — **`w2-footline` 옷이 아직 없어** boundary K-13이 빨간불
- 엔딩 `ending.wait` · 필름 마지막 장 `line`은 이모지까지 든 완성 줄 — 앞에 🔜를 또 붙이지 않기
- 내 순간 카드에 `card.weak`(🦶 약발 상황) · `card.auto`(🤖)가 달려 와요 — 🤖 판 결과 줄 꼬리표에 쓸 수 있어요
- 도입 `ctx.lines`는 세 줄 · 마지막 한마디는 `ctx.choices`에만(`speaker` = 플레이어 이름) — 진짜 화면으로 1막 끝까지 돌려 `voice`가 고른 값(`calm`)으로 얼려지는 것 확인
- 약발 2단계면 경기 해설에 `kind: "filler"` 한 줄(「🦶 약발 쪽으로 온 공에도 {me}는 망설이지 않아요 — 이제 양발이에요」 · 경기당 한 번 · `flow` 없음)이 내 판 카드 바로 뒤에 와요
- 화면 글의 🅰️ 컷백 — 판 제목에 맞춰 engineer 글도 🅰️(⚡는 ⚡ 스피드와 겹침)
- 오른쪽 위 고정 요소: engineer 화면엔 없음(⚙️와 안 겹침) · 아래 고정은 `#w2-toast` 하나

---

# v3 — 판 셋 모두 감 · 🫀 관리 칸 (engineer · 2026-10-05~06 · 계약 정본 `44_orchestrator_phase3-v3.md`)

## v3 — 바꾼 것

| 파일 | 바꾼 것 |
|---|---|
| `sheet.js` | 🎮 솜씨 칸 → **🫀 관리 칸**(키 `care` · 라벨 「🫀 관리」 · `clamp((c̄ − 20) ÷ 50, 0, 1) × 10 × λ` · `CARE_LO` 20 · `CARE_SPAN` 50 · 0경기 0) · 글 「공식 경기 13번 · 경기 날 컨디션 평균 56(70이면 가득)」 · `detail { games, avg, full }` · **퇴역** `SKILL_*` · `READ_K` · ρ · 바닥 8 · `N_POS` 41.27 · 37.68 · 35.70 · 38.58 · `T` 66.4 · 59.4 · 52.8(🔶 뗌) · 중간 평가서 메모 「몸 · 관리 · 기록」 |
| `game.js` | `record.cSum` · `cN` — **공식 경기(리그 + 대회)** 날 엔진에 넘긴 컨디션(`playLive`가 `info.cond`로 붙임 · 연습경기 · 기술 테스트 · 승부차기는 안 셈) · `sSum` · `sN` · `sAuto`는 더 안 씀(칸만 남김) · 경기 끝 줄 「🫀 경기 날 컨디션 64」(🎮 줄 뺌) · `WEAK_XP` 1.5 · 설정 `wide`는 `list()`에서 `applies: false`(공유 키 · `on("wide")` · 지우기 목록 그대로) · `boardStats()` → 판 종류마다 `{ n, msSum, cells[6] }`(옛 모양이 남아 있어도 `n` · `msSum`만 읽음) · 도움말(판 셋 모두 감 · 「이 게임의 판엔 시간 제한이 없어요」 · 평가서 다섯 칸 · 설정 줄에서 ♿ 뺌) · 🤖 설명 글 |
| `live.js` | 🦶 약발 상황 몫 **0.4**(배수 그대로) |
| `achieve.js` | `promise3` · `league` → 전설 · `gift` → 귀함 |
| `film.js` | 몸 장의 둘째 줄 = 평가서 관리 칸 글(「🫀 …」) · `body.boards` → `body.care { games, avg }` |

## v3 — 세이브 `skill` → `care` (engineer가 정함)

- **다시 셈하지 않고 0에서 차오름.** 옛 v2 세이브엔 경기 날 컨디션 기록이 없어(`games`에 `cond` 없음) 되짚을 수 없어요. `loadSave`가 `blankRecord()`로 `cSum` · `cN`을 0으로 채우고, **다음 공식 경기부터** 셉니다(42번 §3-4 「섞임 대신 비어 있다 차오름」).
  - 공식 경기를 이미 뛴 옛 판이 `cN` 0이면 칸 글은 「다음 공식 경기부터 셈해요 — 이 판의 앞 경기엔 경기 날 컨디션 기록이 없어요」(0점이 왜 0인지 보이게).
- **이미 얼린 것은 그대로**: 옛 판의 `S.mid[]` · `S.sheet` · `act1.sheet`의 `skill` 칸은 고치지 않아요(그 시점의 사실 · `act1`은 한 번 얼림). 필름은 `care`가 없으면 `skill` 칸 글을 그대로 써요(🎮).
- `record.sSum` · `sN` · `sAuto`는 지우지 않고 안 읽어요. 옛 세이브의 `weakXp`는 새 1.5로 다시 나눠 단계를 읽어요(베타 — 오를 수만 있음).
- 베타 측정의 옛 `winger2-boards`(clear · sSum …)는 읽을 때 `n` · `msSum`만 살리고 `cells`는 0에서.

## v3 — 직접 확인한 것

- `node --check` — `sheet` · `game` · `live` · `achieve` · `film`
- 1막 끝까지(스텁 장면 · 오류 0) 둘 — 여 수비수 손 · 남 윙어 🤖: 관리 칸 7.3 = (56.38 − 20) ÷ 50 × 10 · `cN` 13 = 공식 경기 수 · 필름 「🫀 공식 경기 13번 · 경기 날 컨디션 평균 56(70이면 가득)」 · `boardStats` = `{ n, msSum, cells }`(손 판만 · 🤖 판 0)
- 픽스처 4칸 다시 뽑음(v3 세이브 — `cSum` · `cN`) · 회귀 검사 ✅ engine · gender · hub · fence · league · seed-split · situation · pair · fx-count · 스모크(`beta/winger2`)

## v3 — 남은 것 · director에게

- **director**: `scenes.js`의 `COL_EMO`에 `care: "🫀"`가 없어요(지금 `skill: "🎮"`만) — 평가서 칸 이모지 · 🔬 베타 측정 칸이 새 모양(`cells[6]` — 「가장 많이 고른 칸」)을 읽게 · ⚙️ 레이어가 `applies === false` 칸을 숨기게
- `sw.js`는 지시대로 안 만짐(새 그림 8장과 함께)
- 판의 `target` · `seen` 늘 `null`(3′)은 director 판의 몫 — 드라이버는 받은 그대로 기록
- 검사: 솜씨 칸 · `READ_K` · ρ · `sSum`을 보던 검사(auto-mark · sheet · boundary K-8 등)와 `boardStats` 옛 모양은 inspector 갱신 몫(43번 §4 목록)
