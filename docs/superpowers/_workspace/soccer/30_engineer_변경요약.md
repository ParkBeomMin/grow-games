# engineer 변경 요약 — ⚽ 더 윙어 운영판 고도화 ① (Phase 3 로직)

작성 2026-09-29 · 기준 스펙 `docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md` + `25_orchestrator_phase3.md`
**점진적으로 적는다** — 조각이 끝날 때마다 아래에 더한다.

## 0. 시작 전 상태

- `git status --short`: 남의 변경 `?? beta/winger2/focus.js` (손대지 않음) · 스펙·작업 문서(미추적)
- director는 아직 `beta/soccer/`에 새 파일을 만들지 않은 상태에서 시작
- **기준선**(바꾸기 전): `node tests/smoke-test.js beta` 종료 0 · `tests/soccer/*.js` **63종 전부 종료 0**(총 418초 — `wc-bench-test` 128초가 가장 김)

## 1. 먼저 알릴 것 (조각과 무관)

- **베타와 운영판은 실제로는 로컬 세이브를 공유하지 않는다.** `beta/env.js`가 `/beta/` 경로에서 `localStorage`를 `beta::` 접두사로 감싼다
  (`beta/soccer/index.html`이 `../env.js`를 가장 먼저 읽는다). 15번 문서의 「같은 브라우저 localStorage」 전제와 다르다.
  다만 `S.betaAt` 장치는 여전히 쓸모가 있다 — ① 격리가 실패하는 브라우저(env.js가 try/catch로 조용히 넘어감) ② **승격 뒤** 옛 판이 캐시된 기기와 새 판 기기가
  클라우드로 같은 세이브를 주고받을 때 ③ 운영판 코드로 베타 세이브를 여는 검사(§9-D). 그래서 스펙대로 구현했다. 설계를 바꿀 일은 아니고 사실 확인용이다
- 검사 하네스가 페이지를 `https://x.test/beta/soccer/`로 띄우면 같은 이유로 `grow-auto-mini`가 안 읽혀 승부처가 자동으로 안 끝난다 — 기존 검사처럼 `/soccer/` 주소로 띄울 것(inspector 참고)

---

## ①-a 선택 이벤트 — ✅ 완료

### 바꾼 파일 · 함수

| 파일:자리 | 무엇 | 스펙 |
|---|---|---|
| `beta/soccer/events.js` (새) | `window.WingerEvents` — 유스 4 · 프로 17 · 블록(§3-3 순서 그대로) · 확률(조각 정수 반올림 뒤 합) · 잘림 · 약속 · 🤝 · 평소 컨디션 · `onLoad` · 판정 규칙 문장 | §3 · §6-1 · §6-4 · §7 |
| `beta/soccer/book.js` (새) | `window.WingerBook` — `load()`(두 키 합집합 · n 큰 쪽 · at 작은 쪽) · `mark(kind, id)`(두 키에 쓰고 `Cloud.touch()`) | §3-9 · §6-2 |
| `game.js` `save()` | `S.betaAt = S.savedAt` 한 줄 | §6-1 |
| `game.js` `resumeSlot()` | `S = sl[id]` 뒤(`fillStats` 다음) `WingerEvents.onLoad(S)` — 정리했으면 바로 `save()` | §6-1 |
| `game.js` `maybeEvent()` | 끝의 `pick(events)()`를 **같은 난수 한 번**(`Math.floor(Math.random() * events.length)`)으로 풀고, 0·1·4·6이면 `WingerEvents.youth(i, m)` | §3-4 · §6-8 |
| `game.js` `doTraining()` | `buffMod = S.buff === true ? (S.buffX \|\| 1.5) : 1.0` · 쓰면 `S.buff = false` + `delete S.buffX` | §3-4 · §9-B |
| `game.js` `awakenTalent()`·`transcend()` | 참을 돌려주는 자리(시도) 둘에 `WingerEvents.awake(key)`(프로에서만 — events.js가 봐요) | §6-8 |
| `game.js` `renderMain()` 끝 | `WingerEvents.draw()` | §3-4 · §6-5 |
| `game.js` `renderRecordTabs()`·`renderRecord()` | 탭 목록을 조립 — ⚽ 커리어 · 🌏 월드컵(겪었을 때만) · 📖 도감(`WingerScenes.bookTab`이 있을 때) · 🏅 업적(`achTab` + `WingerAch`가 있을 때). 탭이 하나뿐이면 줄을 감춤 | §3-9 · §5-8 |
| `game.js` `newState()` | `S.origin = { stats 사본, talents 사본, weak }` (①-c 재료 — 난수 안 씀, 일찍 심음) | §6-1 |
| `game.js` `showEnding()` | `S.youthEnd` — 분기가 세운 플래그 그대로(🌱·🎒는 둘 다 canExtend라 분기의 emoji로 가름) (①-c 재료) | §6-1 |
| `game.js` `openHelp()` | 🎲 「선택 이벤트와 약속」 섹션 = `WingerEvents.rules()`와 같은 문장 — **💾 기록 보관 앞에** 끼움(마지막 섹션 규칙 · `help-section-test`) | §6-7 |
| `career.js` `renderPrep()` | 초대장 블록 바로 뒤 `WingerEvents.block()` · 함수 끝 `WingerEvents.draw()` | §3-3 · §6-8 |
| `career.js` `checkTitle()` | 승급이면 `evMem.classUp = true` · `S.career.maxOvr` 갱신(**`enterCareer`가 0으로 연 커리어만** — 아래 「정한 것」) | §6-8 |
| `career.js` `enterCareer()` | `S.career`에 `maxOvr: 0` | §6-1 |
| `career.js` `playShow()` | 선발일 때 `#stage-promise`에 `promiseLine(act.opp)` (MatchSim 뒤에 채움 — 칸이 `#stage-card` 밖이라 안 지워짐) | §3-6 · §6-6 |
| `career.js` `proMatchFinalize()` | `ratingSum` 바로 뒤 `WingerEvents.league(info, 표시 평점, won)` → 약속 판정 한 줄을 결과 HTML에 · `markFeat`(🆕 `S.career.hat`·`perfect`) · 띠 지우기 | §3-6 · §6-8 |
| `career.js` `benchShow()` 머리 | `WingerEvents.bench()` | §6-8 |
| `career.js` `cupFinalize()` | 표시 평점 뒤 `markFeat` | §6-8 |
| `career.js` `finishYear()` | `S.pendingShow = false` 뒤 · `save()` 앞에 `WingerEvents.yearEnd()`(약속 만료 → ①-b 이야기 결말 → ①-c 업적). 시뮬레이터는 `Cloud.mark()` 뒤였지만 상태로는 같은 자리고, 저장 전이라 결과가 바로 남는다 | §6-8 |
| `career.js` `moveToClub()` | `S.moves` 새 항목에 `fee: bonus \|\| 0` | §6-1 |
| `career.js` 반환 | 공개 `queueFx` · `_t`에 `proLog`·`seasonsAtClub`·`lastHype`·`WEEKS_PER_CB` | §3-10 |
| `squad.js` | `trustEvOf()`(y가 이번 시즌일 때만) · `myBonus().trust = trustOf() + trustEvOf()` · `squadHTML` 내역 줄 「🤝 감독 신뢰 ±N」(두 신뢰의 **합**, 0이면 안 적음) · 내 줄 `#번호`(있을 때만) · 반환에 `trustEvOf` | §3-7 · §6-7 |
| `sw.js` | `CACHE` `soccer-v27` · `ASSETS`에 새 파일 여섯 | §6-7 |
| `beta/cloud.js` `keysOf` | `if (game === "soccer") out.push(s + "-book");` 한 줄 | §6-7 |

### 정한 것(스펙 안에서 모양만 고른 자리 — 결정이 아님, 확인용)

1. **표시 평점은 화면에 적힌 한 자리 숫자로 판정·기록한다** — `S.recent[].r`과 약속 `평점 7.5`, 업적 `perfect`(10.0)가 `Number(r.toFixed(1))`을 본다.
   스펙은 `r = clamp(myRankScore / 10, 1, 10)`(반올림 전)이라고 식을 적고 「표시 평점」이라 불렀다. 결과 화면은 `toFixed(1)`로 보여서, 7.46이 「7.5」로 보이는데
   약속 「평점 7.5」가 실패하면 **보이는 숫자와 판정이 어긋난다**(§2-2의 사촌). 시뮬레이터와 다른 것은 [7.45, 7.5)·[9.95, 10) 띠뿐이다. **오케스트레이터 확인 권장**
2. **`S.career.maxOvr`는 처음부터 센 커리어에만** — 도중에 세기 시작하면 지난 전성기를 모르고 「최고 종합」을 낮게 적는다(보이는 숫자가 거짓). 옛 커리어는 칸이 없어 필름이 클래스 이름만 그린다(스펙 §6-1 「없으면 클래스 이름만」 그대로)
3. **유스 로그는 이벤트가 뜬 달로 적는다** — 답하는 사이 `advanceMonth`가 달을 넘겨도 옛 코드와 같은 자리·같은 글자(확정이면 옛 문구 그대로)
4. **`S.ev.title`·`body`·`label`은 평문**(태그 없음) — 그리는 쪽이 통째로 `esc`한다(director `scenes.js`가 이미 그렇게 함). 🏛️ 헌액자 이름은 받는 길에서 `cleanWord`로 씻고 20자로 자른다
5. **약속 조건 문구는 한 벌** — `WingerEvents.condText(kind)`로 내보냄. director의 `scenes.js` 표(`COND`)와 **같은 글자**로 맞춰 두었다(director가 「로직이 문구를 내 주기」를 요청 — 다음 손질에서 `condText`로 바꾸면 두 벌이 사라진다)
6. 약속 선택지의 `label`은 「약속한다」 — 조건 문구는 화면이 `cond.kind`로 따로 적으므로 두 번 안 보이게. `answer()`의 `line`에는 칩 글자를 안 넣는다(화면이 `applied`로 칩을 그림)
7. `p_hofwall`은 명전 항목 중 **`game === "soccer"`**만 본다(명전 키가 8종 공용이라)
8. 모르는 약속 조건(`cond.kind`)은 판정하지 않고 없던 일(`voided`) — 덜 주지, 더 빼앗지 않는다

### 기존 검사 — 설계 때문에 기대가 바뀌는 자리(inspector 몫)

- `tests/soccer/wc-select-test.js` ⑨-b — 「탭이 둘이다」 · 「월드컵을 겪은 적이 없으면 탭 줄을 감춘다」. 스펙 §3-9 · §5-8이 기록 화면에 📖 도감 · 🏅 업적 탭을 요구하므로
  `scenes.js`가 로드되면 탭이 셋(업적 탭은 ①-c에서 넷)이 되고, 월드컵이 없어도 탭 줄이 보인다. 코드가 아니라 기대가 바뀐 것
- `tests/cloud/cloud-wire-test.js` — 「soccer: `#btn-cloud`가 `#btn-hof` 바로 다음」. director가 `index.html`에 넣은 `#btn-book`이 둘 사이에 있다(내 파일 아님 — 오케스트레이터가 director와 조율)
- `tests/cloud/career-cloud-test.js` — 「rookie: 결산 함수가 끝까지 돈다」 실패. ⚾ rookie 쪽이라 이 작업과 무관(`beta/rookie/`는 HEAD 그대로 — soccer의 `finishYear` 부분은 통과)

### 내가 직접 돌려 본 것(스크래치 — `tests/`에 안 남김)

- 유스 **늘 확정 == 현행**: `HEAD`의 `game.js` 대 새 `game.js`, 같은 시드(게임 난수) · 이벤트 난수 따로, 34개월 × 40시드 → **40/40 비트 동일**(능력치·명성·컨디션·🔥·돈·로그 글자·연월) · 물어본 이벤트 244건.
  변이(확정 +3 → +4) → 7/40으로 빨간불 ✅
- 프로 **늘 확정 == 현행**: `HEAD`의 `game.js`·`career.js`·`squad.js` 대 새 것, 실제 버튼으로 데뷔부터 첫 컵·월드컵 직전까지(이벤트 난수 0 — 블록마다 뜸, 시즌 상한 5) → **4/4 동일**(능력치·명성·돈·컨디션·활동·순위표·커리어·명단 전원·칭호·약발·트로피) · 이벤트 30건.
  변이(이벤트 난수를 `Math.random`으로) → 0/2 빨간불 ✅
- 실제 버튼 흐름: 시즌 첫 화면에선 안 굴림 · 준비 3턴 뒤 `pre` · 같은 블록 재그리기에 재굴림 없음(난수 3번 = 블록·후보·u) · 잘린 판돈(돈 0에서 🎙️) 후보 제외 · 도전 성공 적용·evLog ·
  🤝 `myBonus`·스쿼드 레이어 줄 · 벤치 12주 동안 약속 유지 · 출전 경기에서 띠 → 판정 → 결과 한 줄 → 띠 지움 · `onLoad` 정리 전부(§6-1 표) · `betaAt`

---

## ①-b 이야기 4편 — ✅ 완료(「선배 번호 물려받기」는 결정 뒤 붙임 — 맨 아래 절)

### 바꾼 파일 · 함수

| 파일:자리 | 무엇 | 스펙 |
|---|---|---|
| `beta/soccer/story.js` (새) | `window.WingerStory` — `LIST`(4편·결말 이름) · `open()` · `ends(sid)`(기기 장부 기준) · 훅 `chapter`·`left`·`answered`·`judged`·`tally`·`preReset`·`yearEnd`·`onMove`·`lines`·`closeAll`·`onLoad` | §4 · §6-4 |
| `events.js` `roll()` | 상한 확인 뒤 `WingerStory.chapter()`가 먼저(장이면 `n += 1`로 끝) · 「뜬 수 + `left()` ≥ 5」면 무작위 안 굴림 | §3-3 6·7 |
| `events.js` `answer()`·`league()`·`bench()`·`yearEnd()`·`onLoad()` | 1장 고른 것 기록 · 2장 약속 판정(`s_` id) · 📍 집계 · 결말 · 운영판 정리를 story.js에 넘김 | §4-1 |
| `career.js` `finishYear()` | `WingerSquad.resetSeason()` **바로 앞** `WingerStory.preReset()`(🔥 최종 순위·차이) | §6-8 |
| `career.js` `moveToClub()` | 끝(`save()` 앞) `WingerStory.onMove(prevLeague, league)` — 🌍 열기(연 때만 `seen`) | §4-2 |
| `career.js` `yearReport()` | 팀 소식 줄 뒤에 그 시즌 닫힌 결말 한 줄씩(`WingerStory.lines(y)` — 흐지부지 포함) | §4 |
| `career.js` `enshrine()` 머리 · `rebirth()` 확인 뒤 | `WingerStory.closeAll()` — 열린 이야기 흐지부지, 🔥은 결말 없이 없앰 | §4-1 3 · 25번 1 |

### 정한 것(확인용)

1. **📍 ⓐ가 ⓑ보다 먼저** — 같은 `h2`에 둘 다 맞으면 상대는 ⓐ(찜한 자리를 3라운드 연속 가져간 동료). 스펙은 두 여는 조건만 적었고 순서가 없다. ⓐ는 실측 밖(§9-G)이라 분포에 안 닿는다
2. **📍 ⓐ의 「가져간 동료」** = 그 라운드 `matchXI()` 중 `x.slot === S.wantSlot`인 같은 포지션 동료(준비 화면 격자 안내 `slotFieldHTML`과 같은 식). 내가 그 칸에 섰거나 찜한 칸이 없으면 `slotBy = null`
3. **🌍 1장이 끝내 안 뜬 채 y0 결산이 오면 흐지부지로 닫는다**(방어 — 규칙상 드묾: `pre`는 늘 오고 시즌 첫 블록이라 상한에 안 걸림). 열린 채 남으면 동시 2편 자리를 막는다. 시뮬레이터는 이 경우를 닫지 않았지만 한 번도 안 일어났다
4. **결말 기록에 `name`(과 🕯️의 `who`)을 같이 적는다** — `S.story.done[] = { sid, end, y, name, who? }`. 🌍 learned는 「이탈리아의 축구를 입은 선수」처럼 나라가 들어가야 하는데(§6-3 필름 예시) `done`에 나라가 없어서.
   `who` = 🕯️ 선배 이름 — **은퇴 소식(`squadNews.gone`)에 그 이름이 있을 때만**(스펙 §4-4 「있으면 문구에 쓴다」)
5. 이야기 장의 선택지 `label`에 스펙의 이모지(🧭·🎯·🐢·📌·🔀·🙂·🌅·🏠·📼)를 붙였다 · 2장(약속 장)의 확정은 「넘긴다」
6. 🌍 1장 장면 문구(나라 특색 다섯)·각 장 본문은 내가 썼다(§2-11 — 오프사이드 목록과 대조: 제목·사건 구성이 겹치는 것 없음)

### 결정 필요

- **🕯️ 「선배 번호 물려받기」** — 스펙 §4-4 · §5-9는 「결말 화면에 선배 번호 물려받기(효과 0 — `S.no`만 바뀐다)」라고 하면서, 같은 절에 「**동료에겐 번호가 없다**(충돌을 안 본다)」고 적었다.
  선배에게 번호가 없으니 **어느 번호로 바뀌는지**가 정해져 있지 않다. 고를 수 있는 모양 셋:
  (가) 등번호 고르기 오버레이(`WingerScenes.numberPicker()`)를 한 번 더 연다 — 사실상 「번호 바꾸기」 한 번
  (나) 선배 이름에서 결정적으로 번호를 지어(해시 → 1~99) 「선배의 #N 물려받기」 — 난수 없이 늘 같은 번호지만, 그 번호는 그때 처음 보인다
  (다) 선배가 그 포지션 추천 첫 번호(`noSuggest(pos)[0]`)를 달고 있었다고 본다
  → **결정 (나)로 닫힘 — 맨 아래 「🕯️ 선배 번호 물려받기」 절**

### 내가 직접 돌려 본 것(스크래치)

- 결말표 전수 대조(모든 1장 선택 × 판정 × 2장 × 평점/집계 조합 → 규칙과 정확히 한 결말): 🌍 36/36 · 🕯️ 27/27 · 🔥 54/54 · 📍 121/121
- 여는 조건: 🌍 이적으로 열림(`y0` = 다음 시즌 · `seen`) → 다음 시즌 `pre`에 1장(선택 셋, 도전 둘이 같은 `u`) → week 7 mid 없음 · week 8 mid에 2장 + **걸려 있던 무작위 약속 없던 일(`voided`)** ·
  🕯️ 같은 포지션 만 35세 → `pre` 1장 · 같은 `pre`에 🌍 1장이면 🌍 먼저·🕯️ 안 열림 · 📍 ⓑ `h2` 1장(📌·🔀 거래 칩·🙂) · 두 자리 없으면(뜬 수 4) 안 열림 · 동시 2편이면 안 열림 ·
  📍 2장 = 1장 week + 5 · 집계 10라운드(뛴 주·벤치 주 모두)에서 닫힘 · 🔥 week 18 mid 안 열림 · week 12에 1장(1위 = 다른 클럽) · 여는 블록 키에서는 2장 없음 · 다음 mid에 2장(상대 지정 약속 = 1위의 클럽) ·
  1위가 동료면 안 열림 · `closeAll` — 🌍 흐지부지 · 🔥 결말 없이 사라짐

---

## ①-c 업적 · 성향 · 필름 · 대표 업적 · 등번호 — ✅ 완료

### 바꾼 파일 · 함수

| 파일:자리 | 무엇 | 스펙 |
|---|---|---|
| `beta/soccer/achieve.js` (새) | `window.WingerAch` — `LIST`(55 · group · tier — 흔함 22 · 드묾 20 · 귀함 5 · 전설 8) · `check(when)`(멱등 · S.ach + 장부 · 옛 세이브 첫 판정 `late`) · `tierOf` · `repOf`(고른 것 → 가장 드문 것 → 가장 최근) · `setRep`(딴 것만 · 진행 중) · `style(st)`(🧭 11 규칙 · 근거 한 줄) · `bestMove(st)`(🎯 ≤ 40%) · `luck(st)`(🍀) · `announce(ids)`(연출 줄 세우기) · `STYLES`·`TIER_ICON` | §5-1 ~ §5-4 · §5-8 |
| `beta/soccer/film.js` (새) | `window.WingerFilm` — `build(S, entry?)`(모델 §5-6 · 있는 만큼만 · 옛 세이브 예외 0) · `put(film)`(기기 키 `winger-save-v1-films`, 최근 20편) · `get(id)` | §5-6 · §6-2 |
| `career.js` `careerScore()` | 칸 배열(`parts`)을 **옛 식과 같은 순서로** 더해 `Math.round` — `careerScore.parts`에 내역을 남김(그래서 `title-test`가 떼어 가는 본문만으로도 돈다) | §5-5 |
| `career.js` `careerScoreParts()` (새) | 칸마다 정수(내림)로 나누고 **반올림 나머지가 큰 칸부터 1점씩** — Σv === careerScore 정확히 · 기여 0인 칸은 뺌 | §5-5 · §9-A 4 |
| `career.js` `enshrine()` | 맨 앞 `WingerStory.closeAll()` · `WingerAch.check("retire")` → 명전 항목에 요약 키(`no`·`rep`·`achN`·`style`·`best`·`home`) → 쌍둥이 정리 뒤 `WingerFilm.build(S, entry)`·`put` → `clearSave`·`S = null`(지금 순서 그대로) → **필름이 열리면 옛 한마디 칸은 안 그림**(같은 `#hof-word`가 둘이 되지 않게) → `WingerScenes.openFilm(film, { final: true, entryId })`(실패하면 은퇴식 화면 그대로) | §5-6 · §6-3 |
| `career.js` `leave(entryId, { rep, word })` (새) | `sent === false`인 항목에만 · rep는 업적 표에 있고 **그 필름의 딴 업적**인 것만 · word는 `cleanWord` · 기기 필름에도 반영 · `flushHof()` 한 번 | §6-4 |
| `career.js` `noSuggest(pos)` · `setNo(n)` (새) | 공격수 9·19·20 · 윙어 7·11·17 · 미드 8·10·6 · 수비 4·5·3 · 1~99 정수만 · 저장 | §5-9 |
| `career.js` `homeClub()` (새) | 가장 오래 뛴 클럽 `{ club, seasons }`(fillClubs로 메워 셈) | §6-3 |
| `career.js` `finishYear()` | `WingerEvents.yearEnd()` 다음 `WingerAch.announce(WingerAch.check("season"))` | §5-2 |
| `career.js` `yearReport()` | 결말 줄 뒤 `achLine(season)` — 「🏅 이번 시즌 업적 — 🔵 …」 · 조용한 소급이면 「🏅 지난 기록으로 업적 N개를 채웠어요」 | §5-2 |
| `career.js` `rebirth()` | 확인 뒤 `WingerAch.check("rebirth")`(도감 장부에 남음 · 필름 없음) | §5-2 · §5-6 |
| `career.js` `renderPrep()` | 이름 줄 `이름 #번호 (포지션)` | §5-9 |
| `career.js` `openHofCard()` | 이름 옆 `#번호` · 대표 업적 배지(`WingerScenes.badge` — 모르는 id는 "") · 🏠 가장 오래 뛴 클럽 · 🧭 성향 · 🎯 최고의 한 수 · 🏅 딴 업적 줄(없으면 안 그림, 값은 전부 `esc`) · 「🎬 필름」(이 기기에 필름이 있을 때만) · 「📤 공유 이미지」(내 항목 — 필름이 있으면 필름, 없으면 명전 항목으로) | §5-6 · §5-7 · §5-8 |
| `career.js` `drawHof()` | 목록 줄의 이름 옆에도 대표 업적 배지 | §5-8 |
| `story.js` `close()` | 결말이 정해질 때 `WingerAch.announce(WingerAch.check("story"))` · 모르는 편(깨진 세이브)도 닫기가 끝까지 가게 | §5-2 |
| `events.js` `roll()`·`draw()` | 번호 없는 세이브의 `pre` 블록은 **무작위 이벤트 대신**(굴림 없이 · 상한에 안 셈) 등번호를 묻는다(이야기 장이 그 `pre`를 차지하면 다음 `pre`로) · 데뷔 뒤 첫 준비 화면(1시즌 · 준비 3턴 전 · 시즌 기록 없음)에서도 묻는다 | §5-9 |
| `game.js` `newState()` | `ach: {}` — 새 선수는 첫 결산부터 제대로 알림(이 칸이 없는 세이브만 옛 세이브의 조용한 소급) | §5-2 |
| `game.js` `renderRecord()` | 📊 기록 머리 줄 「🏅 대표 업적 {배지}」 | §5-8 |
| `game.js` `openHelp()` | 🏅 「업적과 대표 업적」 섹션 — 「🎖️ 시즌 칭호와 다른 물건이에요」 포함, 💾 기록 보관 앞 | §5-8 |
| `career.js` 반환 | 공개 `leave`·`noSuggest`·`setNo` · `_t`에 `CAREER_MAX`·`careerScoreParts`·`gradeOfScore`(achieve.js·film.js가 읽음) | §6-4 |

### 정한 것(확인용)

1. **점수 내역의 정수 나누기** — 스펙은 「Σv === 옛 careerScore」. 칸 값은 소수(가중 카운터 × 계수)라, 그대로 두면 합이 반올림 전 값이고 칸마다 반올림하면 합이 1~2점 어긋난다.
   그래서 내림한 뒤 **반올림 나머지가 큰 칸부터 1점씩**(최대 나머지법) — 보이는 칸을 더하면 보이는 점수가 정확히 나온다(§11 #12의 「보이는 조각 합 = 표시」와 같은 결)
2. **필름 모델에 `head.flag`(유스 국기)와 `awards: [{ label, n }]`(개인상 합계)를 더했다** — 스펙 §5-6의 장 3(「개인상 합계」)·§5-7(「유스 국기」)이 요구하는데 모델 표에 칸이 없었다.
   director의 `scenes.js`가 이 두 이름으로 읽고 있어(계약 추가 요청) 그 이름에 맞췄다. `nat.wc[]`에는 `stay`도 싣는다(director가 읽음)
3. **`WingerFilm.build(S, entry)`** — 스펙 모양 `build(S)`에 둘째 인자(명전 항목)를 더했다. id·마지막 클럽·등급(초월·월드컵 꼬리표 포함)·점수·세대를 명전과 **같은 값**으로 받으려고. 안 주면 세이브에서 계산한다(검사가 `build(S)`로 불러도 된다)
4. ~~🎲 기록이 없는 세이브는 `pick: null`~~ → **바뀜**: 오케스트레이터 요청으로 옛 세이브도 `pick = { style, best: null, luck: null, bright }`(아래 「계약 추가」 절). 명전 `style`은 규칙 6~10으로 계산해 싣는다
5. `S.story.done`의 결말 중 **흐지부지도 필름 「이야기」 장에 싣는다**(「닫은 결말들」) — 업적 `end1`·`end5`는 흐지부지를 안 센다(스펙 그대로)
6. 은퇴 나이 = 17 + 프로 시즌 수 + (특훈 1) · 필름 `body.max`는 소수 한 자리 · 명전 `best`는 최고의 한 수가 없으면 `null`
7. `leave`의 대표 업적 검증 — 업적 표에 있는 id **그리고** 그 필름의 딴 업적(필름이 없으면 표에 있는지만)

### 결정 필요

- **「새 id는 다음 판정 때 조용히」(스펙 §5-2)** — ①에는 새 id가 없어서(55개가 한 번에 생김) 지금은 「S.ach가 없는 세이브의 첫 판정」만 조용히 한다.
  업적 표가 늘면(② 🎖️ 병역 6) **세이브가 어느 판의 표로 판정됐는지**를 알아야 새 id와 「이번 시즌에 딴 것」을 가를 수 있다 — 세이브에 표 판 번호(예 `S.achV`) 한 칸이 필요하다.
  ②에서 칸을 더해도 된다(그 칸이 없는 세이브 = ① 표로 판정됨). 지금 미리 넣지 않았다(미래 대비 코드). **inspector의 「새 id도 조용히」 검사는 ①에서는 만들 수 없다**(지운 id를 「이번 시즌에 딴 것」과 구별할 근거가 없다)

---

## 계약 추가(오케스트레이터 중개 — director 요청) — ✅ 반영

| 무엇 | 모양 | 자리 |
|---|---|---|
| **`film.pick.bright`** (필수) — 🎯 최고의 한 수가 없을 때 대신 그리는 「🌟 가장 빛난 시즌」(스펙 §5-4) | `{ y, club, lg, g, a, d, aw, hype }` — `y` 시즌 · `club` 그 시즌 소속(fillClubs로 메움, 모르면 null) · `lg` 리그 id · `g`/`a`/`d` 그 시즌 골·도움·수비(기록 없으면 null) · `aw` 그 시즌 수상 이름 배열 · `hype` 시즌 평가. **고르는 법**: `years[].hype`가 가장 큰 시즌(같으면 늦은 시즌). 평가가 적힌 시즌이 없으면 `null`. `best`가 있으면 `bright`는 `null`(둘 중 하나만) | `film.js` `bright()` |
| `film.pick`이 **옛 세이브에서도 객체** | `{ style, best: null, luck: null, bright }` — 「옛 세이브는 늘 이쪽」(§5-4)을 그리려면 `pick`이 있어야 해서. 성향은 🎲 기록이 없으면 규칙 6~10으로만 나온다. 🎲 기록이 있으면 `{ style, best, luck, bright }` | `film.js` `build()` |
| `openFilm(film, { final, entryId, sent })` (선택) | `sent` = 명전 항목이 이미 올라갔는지(`entry.sent !== false` — 쌍둥이 헌액이면 true) | `career.js` `enshrine()` |
| 공개 이름 유지 | `WingerEvents.condText(kind)` · `WingerAch.STYLES` — 화면이 읽는 이름이라 안 바꾼다(스펙 §6-4 표에 올려 두길 권함) | — |

- ⚠️ 스펙 §5-6 장 5 표의 「옛 세이브 → 장 생략」과 달라졌다(옛 세이브도 🧭 성향 + 🌟 가장 빛난 시즌이 장 5에 실린다). 오케스트레이터 요청(§5-4 「옛 세이브는 늘 이쪽」)을 따른 것 — 장을 그릴지는 director가 `pick`을 보고 정한다
- director 문서의 (선택) `WingerFilm.prepare(model)`은 `scenes.js`가 `window.WingerFilm`에 붙이지 않아(지금은 `drawCard`·`share`만) 명전 카드에서 부를 수 없다 — 붙이면 `openHofCard`에서 한 줄로 미리 구울 수 있다
- director가 적은 「은퇴 직후 ☁️ 클라우드 권유 창이 필름 위에 겹침」 — `enshrine()`의 `Cloud.mark()` 시점 문제(공용 파일 동작이라 사람 판단 — 안 바꿨다)

---

## 기존 검사 — 마지막 실행(①-c까지 · `pick.bright` 반영 뒤 은퇴 관련 재실행 포함) · 종료 코드 기준

| 무엇 | 결과 |
|---|---|
| `node tests/smoke-test.js beta` | **0** |
| `node tests/check-page-test.js` | **0** |
| `tests/soccer/*.js` 63종 | **61종 0 · 2종 1** — `apps-count-test` · `wc-select-test` (아래 — 둘 다 설계로 바뀐 기대) |
| `tests/cloud/*-test.js` 12종 | **10종 0 · 2종 1** — `career-cloud-test`(⚾ rookie 쪽 · 이 작업과 무관) · `cloud-wire-test`(director의 `#btn-book` 자리) |

### 빨간불 넷 — 코드가 아니라 기대가 바뀐 자리(inspector · 오케스트레이터 몫)

1. **`tests/soccer/apps-count-test.js` ①·⑤** — 확인용 세이브 `soccer-veteran`은 **번호가 없는 옛 세이브가 `pre` 블록(1반기 0주·경기 직전)에 서 있는** 모양이라, 스펙 §5-9대로 여는 즉시 🔢 등번호 고르기(`.no-overlay`)가 뜬다.
   검사의 「레이어가 뜨면 첫 버튼을 누른다」 루프가 **추천 번호 버튼(고르기만 하고 닫지 않음)**을 4,000번 눌러 0라운드로 끝난다.
   → 확인: 검사 사본에서 `.no-overlay #no-skip`만 눌러 주면 **전부 통과**(스크래치). 검사가 새 모달을 닫는 법을 알아야 한다(또는 director가 첫 버튼을 닫는 버튼으로)
2. **`tests/soccer/wc-select-test.js` ⑨-b** — 「탭이 둘이다」 · 「월드컵을 겪은 적이 없으면 탭 줄을 감춘다」. 스펙 §3-9 · §5-8의 📖 도감 · 🏅 업적 탭 때문에 탭이 넷이고, 월드컵이 없어도 탭 줄이 보인다
3. `tests/cloud/cloud-wire-test.js` — 「soccer: `#btn-cloud`가 `#btn-hof` 바로 다음」. director가 `index.html`에 넣은 `#btn-book`이 둘 사이
4. `tests/cloud/career-cloud-test.js` — 「rookie: 결산 함수가 끝까지 돈다」. `beta/rookie/`는 이 작업에서 안 건드렸다(HEAD 그대로) — 원래부터 빨간 것

### 마지막으로 직접 잰 것(스크래치 · ①-a~①-c 전부 붙은 상태)

- 늘 확정 == 현행 — 유스 **40/40 비트 동일**(244건) · 프로 **6/6 동일**(45건, 시즌 상한 5까지 이벤트를 억지로 띄움 · 이야기·업적·필름 코드 포함 — 「B 켠 것 == 끈 것」도 이 대조 안에 들어 있다)
- 빈도(§9-A 9) — 실제 버튼 12시즌: 시즌 평균 **3.17**(실측 3.07 · 합격 2.5~4.0) · 최대 **5** · 대회 중 **0** · 모달 동시 둘 **0**
- API(§6-4) 이름 전부 있음 · 이벤트 21(유스 4 · 프로 17 — 분류 5·3·2·5·2) · 업적 55(22·20·5·8) · 이야기 4

### 검사가 없는 자리(inspector에게 — 변이로 확인한 것 포함)

- **§9-A 4 점수 내역** — `careerScore`에서 칸 하나(주장)를 빼는 변이를 넣어도 `title-test`·`hof-test`는 **초록 그대로**(직접 확인). 내 대조(옛 식 사본 vs 새 식 · 20만 격자)는 59,888/200,000 어긋남으로 잡았다 — 스펙 예고대로 새 검사가 필요
- **§9-A 1 늘 안전 == 현행** — 기존 검사에 없음. 내 스크래치(유스 40시드 비트 동일 · 프로 6시드 동일)가 변이(확정 +3→+4 · 이벤트 난수를 `Math.random`으로)를 잡는 것까지 확인. 하네스 요령: 게임 난수는 `window.Math.random` 교체, 이벤트 난수는 `WingerEvents._rng` 교체 · 옛 코드는 `git show HEAD:beta/soccer/{game,career,squad}.js`로 같은 페이지에 끼움 · 주소는 `/soccer/`(베타 경로면 `env.js`가 `beta::`로 감싸 `grow-auto-mini`를 못 읽음)
- **§9-B 🔥 배수** — `S.buff`/`S.buffX`/훈련 소비를 보는 검사 없음(`buff-test`는 시즌 칭호 쪽)
- **§6-1 `onLoad`** — `S.betaAt !== S.savedAt` 정리 표 전부 · 정리 뒤 곧바로 저장(두 번 정리 안 함) — 검사 없음
- **약속** — 띠(`#stage-promise`) · 출전 경기 판정 · 벤치 주 넘김 · 상대 지정 · 시즌 끝 만료 · 이야기 약속 장이 오면 무작위 약속 없던 일 — 검사 없음
- **평점 표시 반올림** — 약속 「평점 7.5 이상」·업적 `perfect`가 `Number(r.toFixed(1))`을 보는 것(7.46 → 「7.5」 성공) — 검사 없음
- **🤝** — `myBonus().trust`에 `S.trustEv` 합 · 스쿼드 레이어 줄 — `squad-test`는 신뢰를 안 봄
- **명전 새 키 XSS** — `no` · `best.name` · `home.club` · `style`을 명전 카드가 `esc`로 그리는지(`hof-word-test`는 이름·한마디만)
- **📖 장부** — 합집합(n 큰 쪽 · at 작은 쪽) · 그림자 생존 · `__proto__` 같은 키 거절 — 검사 없음(스크래치로 확인)
- **업적** — 멱등 · 새 선수는 `late:false` · 옛 세이브 첫 판정 `late:true` · `leave` 뒤 대표 잠금 — 검사 없음(스크래치로 확인)
- **필름 옛 세이브** — 소속 없는 시즌 · 이상한 트로피 · wcHist·origin·fee 없음으로 예외 0 — 검사 없음(스크래치로 확인)

## 결정 필요(모음)

1. ~~🕯️ 「선배 번호 물려받기」가 어느 번호인가~~ — **(나)로 결정·반영**(맨 아래 절)
2. **「새 id는 다음 판정 때 조용히」** — 업적 표가 느는 ②에서 세이브의 「판정한 표 판 번호」 한 칸이 필요(지금은 필요 없음 — ①-c 절)
3. ~~(확인 권장)~~ **넷 다 수용됨**(25번 §2-1) — **표시 평점을 화면 숫자로 판정**(①-a 「정한 것」 1) · **점수 내역 최대 나머지법**(①-c 「정한 것」 1) · **📍 ⓐ가 ⓑ보다 먼저**(①-b 「정한 것」 1) · **옛 세이브 `pick`도 객체**(계약 추가 절)

---

## 🕯️ 선배 번호 물려받기 — ✅ 반영(오케스트레이터 결정 (나) · 25번 §2-1)

| 파일:자리 | 무엇 |
|---|---|
| `story.js` `seniorNo(name)` (새) | 이름에서 **늘 같은 번호** — FNV-1a(코드 포인트) → `h % 99 + 1`. 같은 이름이면 같은 번호 · 1~99 정수 · 난수 없음(2,000 이름 → 99가지 모두 나옴) |
| `story.js` 1장·2장 글 | 「`#N 이름 선배(35세) — …`」 · 「`#N 이름 선배 — 은퇴를 발표했어요 …`」 — **1장부터 번호가 보인다** |
| `story.js` `yearEnd()`·`close()` | 🕯️ 결말 기록에 `no`(선배 번호)·`mate`(선배 이름, 은퇴 소식과 상관없이) — `S.story.done[] = { sid, end, y, name, who?, no?, mate? }` |
| `story.js` `lines()` | 결산 결말 줄 「🕯️ 선배의 마지막 시즌 — #N 이름 선배의 은퇴 — 「결말」」 |
| `story.js` `inheritNo(y)` (새) | 그 시즌 🕯️ 결말(흐지부지 말고)이 있고 **`no !== S.no`일 때만** `{ no, mate }`, 아니면 `null` |
| `career.js` `yearReport()` | 결말 줄 바로 뒤 버튼 「🔢 이름 선배의 #N 물려받기」(`#btn-senior-no`, 기존 `.mini-btn`) → 누르면 `setNo(no)`(범위·검증 그대로 · 저장) · 버튼 잠금 「✅ 이제 #N — 이름 선배의 번호를 달고 뛰어요」 · proLog 한 줄 · `queueFx` 한 칸. 결말 줄은 이제 `esc`로 그린다 |

- 버튼은 **그 시즌 결산 화면에만** — 다음 시즌 결산에는 안 뜬다(결말의 `y`가 다름). 앱을 다시 열어 같은 결산을 보면 아직 안 받았을 때만 다시 뜬다
- 흐지부지(떠나온 팀의 은퇴식)에는 안 내놓는다(은퇴·환생·운영판 정리 때라 결산 화면이 없다)
- 확인(스크래치 · 실제 페이지): 1장·2장 글에 번호 · 결말 기록 · 결말 줄 · 버튼 → `S.no` 바뀜 → 저장 → 다시 열면 버튼 없음 · 흐지부지·지난 시즌이면 버튼 없음 — 전부 ✅.
  다시 돌린 기존 검사 — `buff`·`record-club`·`career-column`·`hof-word`·`title`·`transfer` 전부 0 · `smoke beta` 0
- 검사가 없는 자리: 번호 결정성(같은 이름 → 같은 번호) · 「내 번호와 같으면 안 내놓음」 · 누른 뒤 저장 — inspector 몫

---

## 검증 결함 수정(inspector `40_inspector_검증.md` ❌-1 · ❌-2 · ❌-3) — ✅ 반영

| 결함 | 파일:자리 | 무엇 |
|---|---|---|
| ❌-1 `__proto__` 오염(중간) | `book.js` `ID_RE` · `blank()` | ① 정규식 첫 글자를 영숫자로(`/^[a-z0-9][a-z0-9_:]{0,39}$/i`) — `__proto__` 같은 밑줄 이름은 받는 길(`load`)·쓰는 길(`mark`) 둘 다에서 떨어진다 ② 칸 사전 `ev`·`end`·`ach`를 **`Object.create(null)`**로 — `constructor`·`toString`처럼 정규식을 지나는 이름도 물려받은 값을 「이미 있는 칸」으로 읽지 않는다(자기 칸으로만 남음, 오염 없음). 파일 주석을 실제 동작대로 고쳤다 |
| ❌-2 스쿼드 `#번호` esc 없음(낮음) | `squad.js` `squadHTML` · `career.js` `validNo`(새) · `renderPrep` 이름 줄 · `enshrine` 명전 `no` · `setNo` · `film.js` `head.no` | `S.no`는 **1~99 정수일 때만** 그리고·싣는다(숫자는 태그가 될 수 없음). 넣는 길(`setNo`)과 읽는 길이 같은 검사(`validNo`)를 본다 — 명전 항목은 남의 화면에 그려지니 정수만 올린다 |
| ❌-3 📍 ⓐ가 `{y}:1:19`에서 열림(설계 빈칸 — 결정 반영) | `story.js` `chapter()` 📍 여는 조건 | `act.week < WEEKS_PER_CB`(그 반기에 남은 라운드가 있을 때만). ⓐ의 연속 수(`slotBy`)는 그대로라 후반기 첫 화면(h2)에서 다시 본다 |

### 다른 이야기 훑기 — 「한 라운드도 못 세는 블록에서 열림」 같은 모양
- 🌍(이적으로 열림 · 장은 pre·mid · 약속 판정) · 🕯️(pre에 열림 · 2장 h2 · 결산에서 결말) · 🔥(week 10~17 · 수상 표로 결말)은 **라운드를 세지 않아** 같은 모양이 없다. 📍 ⓑ는 h2(week 0)에서만 열린다 → 남은 모양은 📍 ⓐ 하나였다
- ~~남는 질문 — 📍 ⓐ week 14~18~~ → **결정 반영(25번 §2-2)**: 📍는 **2장이 설 블록이 남을 때만** 연다 — `story.js` 조건 `act.week + SLOT_CH2 <= WEEKS_PER_CB − 1`(**week ≤ 13**; 집계가 반기 19번째 라운드에서 닫혀 이야기가 열린 마지막 mid 블록이 week 18이라서). 확인: 열리는 마지막 주 13 · week 13에 열면 2장이 week 18 블록에 실제로 옴 · ⓑ(h2 = week 0)는 2장 자리(week 5) 늘 있음 · 옛 조건(`< 19`)으로 되돌리면 14~18에서 열려 빨간불 · `story-test` 0 · `smoke beta` 0

### 검사(종료 코드)
| 검사 | 결과 |
|---|---|
| `node tests/soccer/ach-book-film-test.js` | **0** — E의 두 줄(「"__proto__" 키를 안 받는다」 · 「mark — "__proto__" id는 안 쓴다」) 초록 |
| `node tests/soccer/xss-new-keys-test.js` | **0** — 🚧 「👥 스쿼드 내 줄 #번호 — 새는 태그 0」 |
| `node tests/soccer/story-test.js` | **0** |
| `node tests/smoke-test.js beta` | **0** |

### 되돌려 본 것(원칙 ⑩ — 스크래치)
- ❌-1: 검사 하네스(`_w1.js`)로 `book.js`에 변이 — **정규식만 되돌리면** E 두 줄이 다시 빨강(자기 칸 true · `mark` true) · **둘 다 되돌리면** `({}).n = NaN`·`({}).at = 1` 오염 재현 · **사전만 되돌리면**(`{}`) 「constructor」 키가 **`Object.n = NaN`**을 쓴다 → 사전 쪽 방어도 실제로 일하고 있다
- ❌-3: 조건을 빼면 1:19에서 다시 열리고 h2에서 안 열림(빨강) · 조건이 있으면 1:19 안 열림 · 연속 수 유지 · h2에서 ⓐ로 열림 · 전반기 1:5에서는 그대로 연다
- ❌-2: 세이브의 `S.no`에 태그 → 스쿼드·이름 줄에 `#` 없음(태그 0) · 정수면 그대로

### 검사가 없는 자리(inspector에게)
- **📖 장부의 사전 방어** — `constructor`·`toString` 같은 키로 Object 함수·`Object.prototype.toString`이 오염되는지(E는 `__proto__`만 봄 — 사전만 되돌린 변이를 못 잡음)
- **📍 1:19** — 결정이 났으니 `story-test.js` C에 한 줄(1:19에서 안 열림 · h2에서 다시 봄)
