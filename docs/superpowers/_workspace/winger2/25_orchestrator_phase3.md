# Phase 3 — 더 윙어 II 1막 구현 계약 (오케스트레이터 확정 · 2026-09-30)

engineer · director 에게 **같은 문장으로** 주는 문서다. 서브 에이전트끼리는 SendMessage 가 안 닿는다 — **조율은 오케스트레이터를 거친다.**
설계 정본과 부딪히면 **이 문서가 이긴다.**

## 0. 읽는 순서

| 문서 | 무엇 |
|---|---|
| `15_decisions.md` | 사용자 결정 — **다시 열지 않는다** |
| `12_designer_act1.md` | **설계 정본** — `[1차 수정]`·`[2차 수정]` 반영본. 수치는 §10, 저장은 §11, 경계면 초안은 §13 |
| `13_designer_gender.md` | 두 세계(남자부·여자부) — 이름표 · 문장 틀 · 성별 대칭 |
| `11_designer_engine-audit.md` | 엔진 네 조각 · 버릴 것 · 옛 검사 분류(§6) |
| `21_designer_act1-rev1.md` · `23_designer_act1-rev2.md` | 왜 바뀌었나(정본은 12번) |
| `22_balancer_act1-rev1.md` §2 | 확정 계수 · **`24_balancer_act1-rev2.md`**(마지막 재실측 — 진행 중. 도착하면 **바뀐 상수만** 오케스트레이터가 전달) |
| ① 코드(모양 참고 · 계수는 새로) | `git show 81318c8:beta/soccer/{events,story,book,achieve,film,scenes}.js` · 스펙 `docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md` §6-4 |

## 1. 첫 베타 범위

- 1막 한 판 전체: 입구 → **카드 고르기**(지호 남 · 지호 여 **둘만 열림**, 도윤 · 하람 카드 넷은 자물쇠 「다음 업데이트에서 만나요」) → 이름 · 포지션 넷 · 주발 → 🎬 도입 → 36주 → 🎯 공개 테스트 → 📋 평가서 → ✉️ 문 → 🎓 엔딩 → 🎬 졸업 필름 → 📖 도감
- **두 세계**(남자부 · 여자부 — 13번). 능력치 · 확률은 성별로 안 갈린다
- 🧱 수비 판(슈팅 코스 막기 — 12번 §4). 🥅 와 **같은 함수**(R4 — 구성으로 중립)
- 그림 **66장** — `scratchpad/winger2-art/webp/*.webp` 중 `.v1.` 이 붙지 않은 것, 그리고 `doyun-` · `haram-` · `mom-` · `grandma-` 로 시작하지 않는 것(다음 단계). 파일 이름이 곧 계약 키다(12번 §9-6)

## 2. 파일 담당

| 파일 | engineer | director |
|---|---|---|
| `beta/winger2/engine.js` | `COND_REF` **한 줄만**(80 → 51 · `:114`) — 나머지 0줄 | 읽기만 |
| `beta/winger-moment.js` | `opens` · `WORDS.defend` · 🏃 슈터 조각 · `opts.keeper` · 준비 화면 — **산식 0줄 · 🧱 는 🥅 와 같은 `runShotGrid` 를 부름 · 새 `Math.random` 소비 0** | 읽기만(🧱 겉옷 CSS 는 `style.css` 의 `.w2m-k-defend`) |
| `beta/winger2/match-scene.js` | 읽기만 | `lite` 정리 · 🧡 나 → 치비 말 · 킥오프 위 약속 줄 · 테스트 경기 스카우트 반신 자리 — **공개 API 이름 그대로** |
| `live.js`(새) · `world.js`(새) · `game.js`(새로 씀) · `events.js` · `story.js` · `achieve.js` · `book.js` · `sheet.js` · `film.js`(모델) | **전부** | 읽기만 |
| `art.js`(새) · `art/`(그림 66장 복사) · `scenes.js`(새) · `style.css`(새로 씀) | 읽기만 | **전부** |
| `beta/winger2/index.html` | **손대지 않는다** — 스크립트가 더 필요하면 오케스트레이터에게 | **전부**(아래 §4 스크립트 순서 그대로) |
| `sw.js` · `manifest.webmanifest` · 아이콘(있는 것 유지) | **전부** — 캐시 이름을 올리고 `ASSETS` 에 전용 js 전부 + `art/` 의 66장 | `theme_color` 는 director 의 `<meta name="theme-color">` 와 **같은 값**(director 가 정해 오케스트레이터에게) |
| 옛 파일 삭제 — `camp.js` · `career.js` · `char3d.js` · `cup.js` · `fever.js` · `grade.js` · `intro.js` · `prospect.js` · `squad.js` · `town.js` · `worldcup.js` · `vendor/` | **engineer 가 지운다**(`town.js` 의 90분 시계를 `live.js` 로 옮긴 뒤) | — |
| `beta/winger2/focus.js` | 🔴 **아무도 손대지 않는다** — 다른 세션의 미커밋 파일. `index.html` · `sw.js` 에서 참조하지 않는다 | 〃 |
| 공유 등록 지점 — `beta/index.html` 의 winger2 `save:` · `beta/cloud.js`(`SAVE` · `SUMMARY` · 도감 키) · `beta/_check.html` · `beta/_fixtures.js` · `scripts/make-fixtures.js` | **engineer — 짧게, Edit(부분 수정)만, 편집 직전에 다시 읽는다**(여러 게임이 같이 쓰는 파일) | 읽기만 |
| `tests/winger2/` | 쓰지 않는다(inspector 몫) — 빈 자리는 산출물에 「이 자리에 검사가 없다」로 | 〃 |

## 3. 경계면 계약 — 이름과 모양

12번 §13-2 의 1~9 를 그대로 쓰고, 아래로 보충·확정한다.

| # | 계약 | 모양 |
|---|---|---|
| 1 | 카드(엔진 → 화면) | 엔진 필드 그대로 + 드라이버가 채우는 `flow`(`"a"`·`"h"`·`"mid"` — filler 만) · `text` |
| 2 | 경기 화면 열기 | `W2Scene.mount(host, { home, away, myName, chibi, promiseLine, scout })` — `chibi` 는 `Art.chibi(who, "base")` 의 경로 · `promiseLine` 문자열 또는 `null` · `scout` 는 테스트 경기면 `Art.src("scout","interest")`, 아니면 `null` |
| 3 | 판 열기 | `W2Moment.play(slot, { kind, moment, condition, foot, judge, keeper })` — `kind` 에 `"defend"` 가 들어온다 · 판은 `s` 만 내고 `judge(s)` 로 엔진에 묻는다 |
| 4 | 경기 한 판 | `WingerLive.play(host, cfg) → Promise<info>` — `info` = 엔진 `result()` + `{ rating, promise: { ok } \| null, saved, boards: [{ kind, s, judge }] }` |
| 5 | 초상 | `Art.src(who, mood)` · `Art.chibi(who, pose)` · `Art.bg(id)` → 상대 경로 문자열. `who` ∈ `jiho-m` · `jiho-f` · `coach` · `minjae` · `taeo` · `seheon` · `minseo` · `seoa` · `gaeun` · `scout` · `dad`(첫 베타). 없는 조합은 `base` 로, 그것도 없으면 `null`(화면이 이름 글자로 대신 그린다 — 깨진 그림 금지) |
| 6 | 이벤트 · 이야기 카드 | ① 스펙 §6-4 모양 + `who` · `mood` · `bg` + **`parts: [{ k: "skill", v }, { k: "sit", v, text }]`**(23번 §2 — 정수, 합 + 50 = `pct`, 화면 글자 == 판정 값) |
| 7 | 평가서 | `{ cols: [{ k, label, v, max, note }], total, tier, doors: [{ id, label, open }], memo, coach: { mood, line } }` — `cols` 는 몸 · 솜씨 · 기록 · 무대 · 테스트 다섯(**추천서는 없다** — 22번 R8 둘째 값). `coach.line` 옆에 「점수 0」을 적는다(23번 §7) |
| 8 | 엔딩 · 필름 | 엔딩 `{ id, tier, next, lines: [] }` · 필름 = ① film 모양 + 1막 장(봄 · 여름 · 가을) · 장마다 `bg` · 「몸의 기록」 장에 **「훈련 N주 · 휴식 M주」**와 **「판 N번 · 평균 s̄ 0.00」** 한 줄씩(23번 §8) |
| 9 | 세이브 | **engineer 소유** — director 는 인자로 받은 객체만 읽는다(세이브 · 전역 상태 직접 접근 금지) |
| 10 | 장면 API(director → engineer 가 부름) | `window.W2Scenes` — `pick(cards) → Promise<{ preset, gender }>`(카드 여섯 · 잠긴 카드 표시) · `intro(ctx) → Promise` · `portrait(slot, { who, mood, bg })` · `card(card) → Promise<pickIndex>`(이벤트 · 이야기 · 🤝 사람) · `grade({ k, label, from, to }) → Promise` · `sheet(sheet) → Promise`(중간 · 최종) · `doors(doors) → Promise<doorId>` · `ending(ending) → Promise` · `film(film) → Promise` · `book(book) → Promise`. 오버레이는 `#w2-layer` 에 그리고, **사용자 탭(`click`)으로만** Promise 를 푼다(`pointerdown` 안에서 화면을 갈지 않는다 — ① 교훈) |
| 11 | 컨디션 게이지 | engineer 가 **판정과 같은 표 하나**로 `{ v, zone, label, mul }` 을 내고 화면은 그것만 그린다(23번 · 21번 §2-1 — 다섯 구간 · 51 = 「보통」 무채색 · ×1.00). 화면이 구간 문턱을 따로 갖지 않는다 |
| 12 | 훈련 버튼 | `{ k, label, grade, next, eff }` — `eff` 는 버튼에 「효율 ×0.52」로 보이는 값 == 성장에 곱해지는 값 |
| 13 | 화면 뼈대(DOM) | `index.html` 몸통 = `<div id="w2"></div><div id="w2-layer"></div>`. engineer 는 `#w2` 안에 화면을 그린다 — 입구 `#w2-entry` · 주간 `#w2-home`(위 ⅓ 은 `.w2-portrait` 칸 — director 의 `portrait()` 가 채움) · 경기 `#w2-match`. engineer 가 쓰는 클래스는 모두 `w2-` 접두사이고 **목록을 30번 산출물에 적는다** — director 는 그 목록으로 꾸민다(먼저 끝난 쪽이 기다리지 않게: director 는 §7 순서대로 경기 · 장면 · 그림부터) |

## 4. `index.html` 스크립트 순서 (director 가 이대로 쓴다)

`../env.js`(**반드시 최상단**) → 공용 `../radar.js` · `../timing.js` · `../match.js` · `../cloud.js` · `../stats.js` · `../fx.js` · `../ads.js` · `../help.js`(지금 `index.html` 563~571줄과 같은 순서) → `engine.js` → `../winger-moment.js` → `match-scene.js` → `art.js` → `scenes.js` → `live.js` → `world.js` → `events.js` → `story.js` → `achieve.js` → `book.js` → `sheet.js` → `film.js` → `game.js`(**맨 끝 — 입구**) → `navigator.serviceWorker.register("sw.js")`

- `<head>` 의 공용 조각(분석 스크립트 태그 등)은 **지금 것 그대로** 둔다 — 베타에서는 `../env.js` 가 원격 기록을 끈다. 바꾸는 것은 `<title>` · `<meta name="description">` · `theme-color` · 화면 뼈대뿐
- 옛 `char3d.js`(`type="module"`) 줄과 옛 게임 스크립트 줄은 없앤다

**engineer 보충**: `beta/cloud.js` 의 winger2 칸 — `SAVE` 를 `winger2-save-v2` 로, `SUMMARY`(지금 `s.phase === "winger2-pro"` 를 읽음)를 새 세이브 모양(1막 N주 · 엔딩)으로. `beta/index.html` 의 `save:` 도 `winger2-save-v2`. 옛 v1 세이브는 옮기지 않는다(마이그레이션 없음 — 결정 6)

## 5. 수치

- **12번 §10 이 정본**(22번 확정 계수가 이미 들어가 있음). 요약: `COND_REF` 51 · `ACT1_SPOT` 1.275 · 1.120 · 0.904 · 1.071 · `n_pos`(경기당) 55.91 · 54.24 · 55.82 · 47.05 · `b` 64 · 64 · 64 · 65 · `T` 69.93 · 60.37 · 51.31 · 효율 상한 1.10 · 추천서 없음 · `allc` 56 · λ 1 · k′ = k × 2 · 실력 조각 ±10 · 상황 조각 {−12, −6, 0, +6, +12} · 몸 점수표 A 4.45 · S 4.55
- 🔒 **조정될 수 있는 상수는 파일마다 맨 위 한 블록**(`const TUNE = Object.freeze({ … })`)에 모으고 값마다 출처 주석(「22번 §2」 · 「23번 §4」). 24번이 오면 **그 블록만** 고친다. `Mₑ` 13칸은 24번에서 새 정의(보통 판 평균)로 다시 나온다 — 그때까지 12번 값을 쓰고 주석에 「24번 대기」
- 난수: 엔진 `_rng` · 연출 `fxRnd` · 이벤트 난수원(상황 조각도 여기서 **뜰 때 한 번**)은 **따로**. 판정 흐름에 `Math.random` · `Date` 를 새로 넣지 않는다(시드 재현 · 11번 §7-3)

## 6. 작업 규칙

- **`beta/` 안에서만.** 운영 `soccer/` · 베타 `beta/soccer/` · 루트 공용 파일은 **절대 손대지 않는다**(더 윙어 1 은 지금 그대로 — 사용자 결정)
- **git 커밋 · 푸시 · `git add` 하지 않는다.** 커밋 범위는 오케스트레이터가 사용자에게 묻는다
- 여러 세션이 같은 워킹트리를 쓴다 — 시작 전 `git status --short`. 내가 안 만든 변경은 손대지 않는다
- **서로의 파일은 읽기만.** 필요한 게 상대 파일에 있으면 오케스트레이터에게 알린다
- 코드는 최소한으로 — 요청 안 한 추상화 · 헬퍼 · 설정 옵션 · 미래 대비 코드를 넣지 않는다. **단 검증 · 에러 처리 · 보안 · 접근성은 줄이지 않는다**(그림 대체 문구 `{이름} — {표정}` · `prefers-reduced-motion` · 손가락 크기 탭 · 사용자 문자열은 `textContent` 로 · `Number(null) === 0` 주의)
- 긴 작업을 전경에서 기다리지 않는다. 진행 메모를 산출물 문서에 점진적으로 쓴다
- 산출물: engineer → `docs/superpowers/_workspace/winger2/30_engineer_변경요약.md`(클래스 목록 · 지운 파일 · 등록 지점 · 「검사가 없는 자리」) / director → `31_director_화면.md`(**실기기 확인 목록 필수**)
- 확인용 임시 스크립트는 스크래치패드에. 저장소를 더럽히지 않는다

## 7. 만드는 순서

- **engineer**: `live.js`(엔진 + 90분 시계 — `town.js` 에서 뽑음) + `world.js` + 최소 `game.js` → **입구에서 경기 한 판이 끝까지 돈다** → 🧱 판 → 36주 루프 · 성장 · 컨디션 · 등급 → 공개 테스트 · 평가서 · 문 · 엔딩 → ① 이식(이벤트 · 이야기 · 업적 · 도감 · 필름) → `act1` 얼림 · 등록 지점 → 옛 파일 삭제 · `sw.js`
- **director**: `index.html` · `art.js` · 그림 66장 복사 → `style.css`(옛 `.w2-*` · `.w2m-*` 약 900줄 중 경기 · 판 몫 옮김 + 새 화면) → `match-scene.js` → 🧱 겉옷 → `scenes.js`(카드 고르기 · 도입 · 오버레이 · 승급 카드) → 평가서 · 문 · 엔딩 · 필름 · 도감 · 공유 카드 → engineer 클래스 목록이 오면 주간 화면 · 입구 꾸밈

## 8. 구현 뒤 확정한 것 (2026-10-02 · 30 · 31번 보고를 받고)

- **계약 13 한 겹 변경 수용** — director 가 `#w2` 를 `<main id="app">` 으로 감쌈. `ads.js` 하단 배너(결정 7)와 `base.css` 폭 규칙이 `#app` 에 걸려 있어서. `#w2` · `#w2-layer` 두 id 는 그대로라 engineer 코드에 영향 없음(engineer 확인)
- director → engineer 부탁 넷 반영: `W2Scene.mount` 에 `pos` · 준비 화면 `w2m-k-{kind}` · 필름 `ach: [{ id, name, tier }]` · 카드 `name`. `_check.html` 「장면 바로 보기」 칸은 만들지 않음(손으로 적은 견본 인자가 모델과 조용히 어긋남 — 픽스처가 진짜 데이터로 보여 줌)
- **평점 비교는 화면에 보이는 한 자리 값으로**(📍 자리 집계 포함) — 「보이는 숫자 = 판정 숫자」(① 에서 받아들인 원칙). 실측 장치와의 차(윙어 +6.5%p)는 장치도 반올림하면 표본 오차 안
- 번호를 잃은 동안 `S.no` 는 `null`(필름 `head.no` 도) · 명전은 `noOrig` 로 — 설계대로
- **허브 이어하기**: II 가 `winger2-save-v2-slots` 색인(`{ main: { name, label, savedAt } }`)을 쓰고, 허브 `progressLabel` 이 `st.label` 을 먼저 씀. 🔴 허브 카드가 `st.name` 을 **이스케이프 없이 `innerHTML`** 로 끼우던 기존 결함을 같이 고침(모든 게임 카드 — II 이름이 새로 그 경로로 들어가므로)
- 업적 희귀도 표는 24번 R10 새 격자 16칸 평균으로
- 필름 · 졸업생 기록의 클라우드 백업은 **운영 승격 전에 사용자에게** 묻는다(베타는 원격 기록이 꺼져 있음)
- 학교 이름 39개는 실재 고등학교와 대조 중(`32_학교이름대조.md`) — 겹치면 이름만 바꾼다
- **8종 배선 검사 둘(`cloud-wire` · `help-section`)이 1막 재작성으로 깨짐** → 섞어서 푼다: 사용자에게 보이는 것(도움말 「💾 기록 보관」 표준 문구 · 기록 연동 버튼 `#btn-cloud`)은 engineer 가 8종 표준에 맞추고, 구조 검사(전역 `save` · `S` · `openHelp` · 부팅 전 `Cloud.init` · 명전 버튼 순서)는 inspector 가 1막 모양(`W2Game._t` · 부팅 뒤 init)으로 옮긴다. **명전 버튼은 들이지 않는다**(1막 설계에 없음 — 졸업생 · 도감이 그 자리)
- 허브 이스케이프 결함은 **실제로 재현됨**(고치기 전 HTML 이름으로 경고창 3번) — 베타에서 고침, 운영 반영은 승격 때
- **학교 이름 대조 결과**(`32_학교이름대조.md` — 웹 검색 + NEIS 학교 기본정보): 39개 중 **10개가 실재 고등학교와 같음** → 검증된 대체 이름으로 바꾼다 — 다솜고 → **도란고** · 가람고 → **미리내고** · 라온고 → **꽃샘고** · 도담고 → **느티고** · 소담고 → **살구고** · 아라고 → **높새고** · 마루고 → **큰들고** · 이음고 → **들샘고** · 새길고 → **들녘고** · 해밀고 → **언덕고**. 실재 학교는 아니지만 다른 작품의 학교 이름인 둘도 바꾼다 — 새봄고(웹툰·드라마 「여신강림」) → **단비고** · 은하고(모바일 게임 외전) → **잎새고**(둘 다 같은 대조로 실재 학교 0곳인 예비 후보). 주인공 학교 **솔빛고는 유지**(같은 이름 고교 없음 · 중·초만 있음 — 「중·초만 있음」은 바꾸지 않는 기준). director 의 36주 확인이 끝난 뒤 적용한다(같은 파일 위 동시 작업 금지). ⚠️ 2027년 3월 개교 예정 경기 고교 여섯 곳은 정식 이름 미확정 — 운영 승격 전에 한 번 더 대조
- **검증(40번) 뒤 확정한 것 (2026-10-03)** — 게임 결함 0 · 실패 1(E-1 `_check.html` 하프타임 견본에 1막이 안 만드는 `poss` · `shots` · `rating`). 관찰 둘은 「보이는 값 = 판정 값」으로 정함: ① 평가서 칸 값은 **최대 나머지법**으로 배분해 보이는 칸의 합 == 보이는 합계(소수 한 자리), **구간도 보이는 합계로 판정** — 문턱을 한 자리로 69.9 · 60.4 · 51.3(24번 값에서 0.05 안 · 다시 안 잼) ② 🤖 자동 판의 솜씨 메모에 자동이었다는 사실을 적음(점수 4.0 · 산식 그대로). 「평소 컨디션」 검사(20번 §4-5)는 개념째 빠져 대상 없음
- **재검증(40번 2차 · 2026-10-03)** — 구현 실패 0 · 통합(smoke 0 · check-page 0 · 전체 루프 137/139 — 빨강 둘은 ⚾ `career-cloud`(HEAD 에서도 빨강 · 범위 밖)와 루프가 옛 R9 를 돈 `pair`(다시 적은 뒤 단독 0)). **R9 짝 검사의 옛 자는 최대 나머지법과 함께 설 수 없다**(테스트 칸만 바뀌어도 남는 0.1 배분이 바뀌어 테스트 밖 칸의 보이는 값이 0.1 움직임 — 8쌍 중 3쌍). 판정 재료는 비트 같고 구간은 합계로만 가르므로 새는 것이 아님 → inspector 가 다시 적은 자(① 재료 비트 같음 ② 테스트만 갈아 끼우면 상대 평가서와 비트 같음 ③ 보이는 테스트 밖 칸끼리 0.1 안)를 **오케스트레이터가 받아들임** — 사용자가 받아들인 원칙(보이는 값 = 판정 값)의 직접 귀결이라 따로 올리지 않는다
