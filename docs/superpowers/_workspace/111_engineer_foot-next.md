# 111. 🦶 주발 화면에 「다음」 — 구현 변경 요약

**날짜** 2026-09-02 · **담당** engineer
**요청** 범민 님 — *"주발 선택하면 바로 다음으로 넘어가는데, 주발 고르고 다음 버튼 눌러야 넘어가게 해줘."*
**건드린 것** `beta/winger2/intro.js` · `beta/winger2/index.html` · `beta/winger2/style.css`
**안 건드린 것** `beta/winger2/game.js`(`chosenFoot` 기본값 `"R"` 그대로) · `tests/` · `docs/` 나머지 · `scripts/`

---

## 1. 무엇이 바뀌었나

| | 전 | 후 |
|---|---|---|
| 발을 탭하면 | `.on` + `.picked`가 붙고 **320ms 뒤 자동 전환**(♿ reduce면 즉시) | **고르기만** 합니다 — 화면은 그대로 |
| 넘기는 것 | 없음 (탭이 곧 답) | 🆕 `#btn-foot-next` |
| 고르기 전 | — | `disabled` · 「발을 골라 주세요」 |
| 고른 뒤 | — | 열림 · 「왼발로 갈게요」 / 「오른발로 갈게요」 |
| 되돌리기 | `← 뒤로`만 | `← 뒤로` + **화면에서 반대발 다시 탭** |

`.foot-bar`는 🗺️ 동네의 `.origin-bar`와 **같은 문법**입니다 — 뒤로는 붙박이,
[다음]이 남는 폭을 먹고, `disabled`는 `opacity .45`.

### 선택 표시 — 넷을 겹쳤습니다
바로 안 넘어가니 표시가 약하면 *"눌렸나?"*가 됩니다. 그래서:

1. 앰버 테두리 + 글로우 (`box-shadow` 기존 `.16` → `.28` + 바깥 글로우)
2. ⚽ 공이 발 앞으로 굴러들어옴 (기존)
3. 🆕 **`✓ 이 발` 배지** (`.foot-pick` — `opacity`로만 숨겨서 켜질 때 카드가 안 흔들려요)
4. 🆕 **안 고른 쪽을 흐리게** (`.foot-pair.chosen .foot-card:not(.on)`)
   → ④는 **고르기 전에는 안 걸립니다.** 두 장 다 멀쩡해야 「아직 안 골랐다」가 읽혀요.

♿ `aria-pressed`를 두 카드에 달았습니다. 화면이 안 바뀌니, 이게 없으면
낭독 사용자에게는 **아무 일도 안 일어난 화면**이 됩니다.
🖥️ 390 · 320 두 폭에서 헤드리스 렌더로 눈으로 확인했습니다.

---

## 2. 🔴 탭 수 — **5 → 6**입니다 (재서 확인)

요청대로 **재기만** 했습니다. 실제 창에서 눌러 센 값이에요:

```
1. 🚪 새로 시작   2. ✏️ 이름 다음   3. 🦶 오른발
4. 🆕 🦶 다음     5. 🗺️ 서울        6. 🗺️ 다음   → screen-town (stage: e)
➡️ 첫 순간 카드 앞의 탭 = 6
```

93번 §2-2의 **「5(여유 0)」는 이제 옛말**입니다 — `intro.js`의 `STEPS` 위 주석과
`index.html`의 `#screen-foot` 주석을 **그 자리에서 다시 썼습니다**(원칙 ⑨).
🔑 designer가 초1 아크를 새로 설계 중이라 **이 검산은 그쪽에서 다시 잡습니다.**
여기서 조용히 되돌리지 마세요.

---

## 3. 조용히 내린 판단 하나 — 되물어야 하면 말씀 주세요

**들어올 때는 늘 「안 고름」에서 시작합니다.** `openFoot(cur, done)`의 `cur`을 안 씁니다.

game.js의 `chosenFoot` 기본값이 `"R"`이라 `cur`을 그대로 쓰면 **아무것도 안 골랐는데
오른발이 켜진 채 [다음]이 열려** 있습니다 — *"고르기 전엔 비활성"*이 깨져요.
`chosenFoot`을 `""`로 바꾸면 `game.js`의 세 소비 지점(prospect · town · `S.foot.main`)이
같이 흔들리는데, **초1 아크 재설계가 곧 오니 주변과 안 얽히게** 두는 쪽을 골랐습니다.

실제 동작 (실측):

| 길 | 결과 |
|---|---|
| ✏️ 이름 → 🦶 주발 (앞으로) | 아무것도 안 골라짐 · [다음] `disabled` ✅ |
| 🗺️ 동네에서 `← 뒤로` | **고름이 그대로 남음** ✅ (`show()`만 부르고 다시 안 그려요) |
| 🦶에서 `← 뒤로` → 이름 → 다음 | 다시 안 골라진 상태 ✅ |

---

## 4. 🔴 어긋난 검사 — **26종 중 7종** (안 고쳤습니다)

`tests/`는 손대지 않았습니다. **고치기 전 초록불이던 것을 확인**했고(`git stash` 후 재실행 → `rc=0`),
고친 뒤 빨간불이 뜹니다 — **이 영역은 검사가 보고 있습니다**(원칙 ⑩).

### (a) 뿌리 하나 — `tapFoot`이 [다음]을 안 누릅니다 · **사본이 셋입니다**

| 자리 | 지금 하는 일 |
|---|---|
| `tests/winger2/_load.js` L524 `tapFoot(W, press, foot)` | 발을 누르고 `for (let i = 0; i < 400 && cur() === "screen-foot"; i++)` |
| `tests/winger2/foot-map-test.js` L229 `tapFoot(h, foot)` | **같은 코드의 별도 사본** |
| `tests/winger2/youth-moment-test.js` L152 `toHome(h, o)` | **또 하나의 인라인 사본**(L167–171) |

셋 다 `🦶 발을 눌렀는데 화면이 안 넘어가요 — openFoot의 done 배선을 보세요`로 죽습니다.
**하나만 고치면 나머지 둘이 그대로 남습니다.**

🔑 **inspector의 판단이 이번에 값을 했습니다** — 320ms를 안 박아 뒀으니
*"화면이 바뀔 때까지"* 대기는 **그대로 두면 됩니다.** 그 앞에 한 줄만 더하면 돼요:

```js
press(D.getElementById("btn-foot-next"), "🦶 다음");   // ← 이 한 줄
for (let i = 0; i < 400 && cur() === "screen-foot"; i++) await wait(3);
```

⚠️ **탭 수를 세는 검사가 있다면** `tapFoot`이 press를 1회 → **2회**로 늘린다는 뜻입니다.

**이 하나 때문에 죽는 검사 6종** (다른 결함 아님):
`creation-test` · `offer-test` · `school-scene-test` · `school-test` · `town-test` · `youth-moment-test`
— 전부 종료 코드 **2**(💥 안 돌았음)입니다. 초록불도 빨간불도 아니에요.

### (b) 옛 계약을 지키는 검사 하나 — `foot-map-test.js` **F-0a**

```
❌ F-0a. 🔒 🦶 화면의 조작은 **발 두 짝 + ← 뒤로**뿐이다 — 「다음」이 없다(탭이 곧 답)
     화면 직속 버튼: foot-card · foot-card · btn-back-foot · btn-foot-next
```
`foot-map-test.js` L356 — `r.own.length === 3`을 단언합니다. **설계가 뒤집혔으니
검사가 옛 계약을 지키고 있는 상태**입니다(CLAUDE.md의 그 항목 그대로).
지금은 `4`가 맞고, 「다음」이 **있어야** 합니다.

🟢 **같은 파일의 F-1 · F-2 · F-3(판정 창 폭·좌우·색)은 전부 초록불입니다** —
마크업을 건드렸지만 판정 창 측정은 안 깨졌어요.

### (c) 🕳️ **검사가 없는 자리** — 검사는 제가 안 만듭니다

`tapFoot` 셋에 [다음] 한 줄을 더하면 7종이 다시 초록불이 되는데, 그 순간 **아무 검사도
안 보는 것**이 셋 남습니다.

**근거 ① — 검사가 그 값을 아예 안 읽습니다.** `tests/` 전체에서
`btn-foot-next`를 읽는 자리가 **0곳**이고, `.foot-card`를 읽는 다섯 자리는
**누르거나(`press`) 개수를 세거나 `data-foot`을 읽을 뿐** — `disabled` · `aria-pressed` ·
`.on` · `.picked`을 읽는 자리가 하나도 없습니다.
(`foot-map-test.js:403`의 `next.disabled`는 🗺️ **동네**의 `btn-origin-next`예요.)

**근거 ② — 지금 초록불인 19종은 🦶 화면을 열지도 않습니다.**
`screen-foot`·`foot-card`·`tapFoot`을 부르는 검사가 19종 중 **0종**입니다
(`bootPage`로 창만 띄우고 상태를 직접 심어요).

**근거 ③ — 변이가 실제로 물립니다.** `bootPage({ muts: { "intro.js": [...] } })`로 확인:

| 깨도 안 잡히는 것 | 변이 | 물림 확인 |
|---|---|---|
| **고르기 전에 [다음]이 열려 있음** | `next.disabled = !pick` → `= false` | ✅ 고르기 전 `disabled === false` |
| **발을 안 골라도 넘어감** | `if (pick) done(pick)` → `done(pick)` | ✅ (배선을 지우면 안 넘어감도 확인) |
| **`.on`/`.picked`이 두 장에 다 남음** | `toggle` → `add` | ✅ |

→ **inspector께**: F-0a를 `own.length === 4` + `btn-foot-next` 존재로 다시 쓰시면서,
위 세 줄을 지키는 단언을 같이 얹어 주세요. 특히 **① 고르기 전 `disabled`**와
**② 안 골랐을 때 안 넘어감**은 범민 님 요청의 본문이라 검사가 있어야 합니다.

### (d) 검사가 아닌 것 하나 — `scripts/w2-avatar-render.js`

director의 playwright 아바타 렌더 도구입니다. L89–90이
`await go('#screen-foot .foot-card[...]')` → `await leave("screen-foot")`라
**8초 timeout으로 죽습니다.** `scripts/`는 공유 영역이고 director 것이라 안 건드렸어요 —
`go("#btn-foot-next")` 한 줄이면 됩니다.

---

## 5. 검증

* ✅ `node tests/smoke-test.js beta` — 9/9 로드
* ✅ `node tests/check-page-test.js`
* ✅ `tests/winger2/` **19/26 초록** · 7종은 위 4절 (전부 `tapFoot` 사본 셋 + F-0a)
* ✅ **되돌려 확인**(원칙 ⑩) — 고치기 전 `foot-map-test`·`creation-test`가 `rc=0`이었어요.
  빨간불 7종은 제 변경이 만든 것이 맞습니다 — **이 영역은 검사가 보고 있습니다.**
* ✅ jsdom 실기기 순서(`pointerdown → pointerup → click`)로 직접 눌러 확인 —
  탭해도 1.2초 동안 안 넘어감 / [다음]에서 `screen-origin` 도착 / `chosenFoot`이 **마지막 고름**과 일치
* ✅ 헤드리스 렌더 390 · 320 — 고르기 전/후 두 장

⚠️ **커밋 안 했습니다.** `git status`에 designer의 `docs/superpowers/_workspace/112_designer_reboot.md`와
미완성 고아 `beta/winger2/focus.js`가 떠 있어요 — 둘 다 손대지 않았습니다.
