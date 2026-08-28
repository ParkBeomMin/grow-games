---
name: grow-match-feel
description: "DOM과 CSS만으로 스포츠 경기의 박진감과 캐릭터를 만드는 기법 카탈로그. 경기 화면 연출, 골 세리머니, 순간 카드, CSS 픽셀 아바타, 세로 화면 레이아웃, 접근성(prefers-reduced-motion)을 다룬다. '박진감이 없다', '밋밋하다', '경기 화면 개편', '골 연출', '캐릭터/아바타', '연출 강화', '키우는 맛' 요청에 반드시 사용할 것."
---

# 경기 연출 — DOM과 CSS만으로

캔버스도 스프라이트 시트도 사운드도 없습니다.
게임 엔진이 없는 게 아니라, **그것 없이 되는 방법**이 이 문서입니다.

FM은 20년 넘게 텍스트 중계만으로 굴러갑니다. 텍스트 중계는 빈약함의 표시가 아니라
**의도적 선택으로 성립**해요. 다만 그러려면 지켜야 할 것들이 있습니다.

## 1. 결정적 장면만 보여준다

90분을 전부 재생하면 **"빨리감기"를 누르는 게 언제나 합리적**이 됩니다.
FM의 Key Moments처럼 한 경기를 **6~8개의 순간 카드**로 압축하세요.

- 카드 하나 = `분 · 상황 · 결과` 3줄
- 내 선수가 관여한 카드만 확대 표시
- 전반 종료에 **하프타임 카드** (점유율·슛·내 평점 3개만)

## 2. 밀도의 차이가 긴장을 만든다

전부 타이핑 연출을 넣으면 지루해집니다. **승부처 카드만** 한 자씩(40~60ms/자), 나머지는 즉시.

카드 간 딜레이를 상황에 따라 바꾸세요 (`setTimeout` 값 하나면 됩니다):

```js
const delay = (score, min) => {
  const gap = Math.abs(score.h - score.a);
  if (gap === 0 || (gap === 1 && min >= 70)) return 1400;   // 팽팽하면 늘려서 조인다
  if (gap >= 3) return 420;                                  // 갈렸으면 빨리 넘긴다
  return 780;
};
```

## 3. 주스(Juice) — 플래시 · 흔들림 · 떠오르는 숫자 · 파티클

같은 게임에 연출만 얹어도 체감이 급변합니다.

**이 저장소에 이미 있는데 안 쓰는 것**: `fx.js`가 `confetti`/`burst`/`flash`/`celebrate`를
제공하는데 **골에 한 번도 연결이 안 됐습니다.** 골 연출의 전부가 92px 띠 테두리가
0.55초 깜박이는 것이었어요. 가장 값싼 개선이 거기 비어 있습니다.

```css
/* 골 — 셰이크 + 팀 컬러 플래시 + 스케일업 */
@keyframes goalShake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px); }  35% { transform: translateX(5px); }
  55% { transform: translateX(-3px); }  75% { transform: translateX(2px); }
}
@keyframes goalFlash {
  0% { opacity: 0; }  20% { opacity: .55; }  100% { opacity: 0; }
}
@keyframes goalPop {
  0% { transform: scale(.4); opacity: 0; }
  45% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.msim.goal { animation: goalShake .42s ease; }
.goal-veil { position: absolute; inset: 0; background: var(--accent);
             pointer-events: none; animation: goalFlash .5s ease; }
.goal-word { animation: goalPop .45s cubic-bezier(.2,1.4,.4,1); }
```

실점은 **회색 플래시 + 짧은 좌우 흔들림**으로 대비를 주세요. 같은 강도로 주면
골의 무게가 사라집니다.

## 4. `prefers-reduced-motion`은 축약 대상이 아닙니다

흔들림·플래시는 어지럼증과 광과민성 발작을 유발할 수 있습니다.

```css
@media (prefers-reduced-motion: reduce) {
  .msim.goal, .goal-veil, .goal-word, .pitch { animation: none !important; transition: none !important; }
  .goal-veil { display: none; }
}
```

연출을 끄더라도 **정보는 남아야 합니다** — 골이 들어간 사실은 텍스트로 계속 보여야 해요.

## 5. 성능 — `transform`과 `opacity`만 애니메이션한다

`left`/`top`/`box-shadow`/`width`를 애니메이션하면 레이아웃과 페인트를 매 프레임 다시 돌립니다.
저사양 폰에서 버벅여요.

## 6. 캐릭터를 CSS로 그리기

### box-shadow 픽셀아트 — `<div>` 하나로 스프라이트

이미지도 캔버스도 없이 스프라이트가 됩니다.

```js
// 팔레트 + 16×16 격자 → box-shadow 문자열
const PAL = { ".": null, "s": "var(--skin)", "h": "var(--hair)", "k": "var(--kit)", "b": "#1a1a1a" };
const px = (grid, unit = 4) => grid.flatMap((row, y) =>
  [...row].map((c, x) => PAL[c] && `${x * unit}px ${y * unit}px 0 ${PAL[c]}`)
).filter(Boolean).join(",");

el.style.boxShadow = px(SPRITE_IDLE);
el.style.width = el.style.height = "4px";
```

- `transform: scale(3)`으로 확대 (레이아웃을 안 건드립니다)
- 애니메이션은 keyframes로 `box-shadow` 문자열을 교체 — 프레임 2~3개면 충분합니다.
  단 5번 원칙 때문에 **자주 도는 애니메이션에는 쓰지 마세요.** 세리머니처럼 한 번 도는 것에만
- 16×16이면 그림자가 최대 256개라 **문자열은 생성해서 넣으세요.** 손으로 적지 않습니다

### 페이퍼돌 레이어드 — 조합으로 수를 벌기

몸/머리/헤어/유니폼을 같은 크기 레이어로 겹칩니다.

```css
.avatar { position: relative; width: 48px; height: 64px; }
.avatar > * { position: absolute; inset: 0; }
/* 유니폼 색은 팀마다 CSS 변수로 */
.avatar[data-team] { --kit: var(--team-kit, var(--accent)); }
```

헤어 6종 × 피부 4종 × 유니폼(팀 컬러) 만으로도 조합이 충분히 나옵니다.
겹치지 않는 파츠(눈·코·입)는 z-index 관리조차 필요 없어요.

### ⚠️ 외부 CDN 아바타(DiceBear 등)에 의존하지 않습니다

오프라인 PWA가 깨집니다. `sw.js`에 캐시를 넣어도 첫 로드는 네트워크가 필요하고,
축구 유니폼 느낌도 안 나요.

### 저장 데이터

아바타 파츠는 **새 필드**입니다. 마이그레이션하지 말고 읽는 쪽에서 기본값을 주세요.
없으면 이름을 seed로 삼아 결정론적으로 뽑으면 옛 세이브도 얼굴을 갖습니다.

```js
const seedOf = (p) => p.avatar || p.name;   // 옛 세이브는 이름이 곧 seed
```

## 7. 세로 화면 레이아웃

세로 스포츠 UI의 검증된 패턴: **상단 1/3은 맥락, 하단 2/3은 액션.**

```css
.msim { display: flex; flex-direction: column; min-height: 100%; }
.scoreboard { position: sticky; top: 0; z-index: 2; background: var(--bg2); }
.pbp { flex: 1; overflow-y: auto; }
```

- 초대형 스코어 표시 · 팀 컬러 액센트 · 본문 텍스트 최소화
- 새 카드는 **아래에서 위로 push-in**
- 버튼은 엄지 도달 범위(화면 하단)에

## 8. 점진적 노출 — 처음 화면을 일부러 비워둔다

A Dark Room이 4~12시간을 끄는 방식은 **버튼이 하나씩 늘어나는 것 자체가 보상**이기 때문입니다.

- 1시즌: 경기 · 훈련만
- 3시즌: + 이적
- 대표 발탁 후: + 대표팀

튜토리얼 없이 시스템이 스스로 드러납니다.

## 9. 숫자가 오르는 것을 감정으로 바꾸기

매끄러운 연속 증가는 만족스럽지 않습니다. **불연속적인 문턱을 넘는 순간**이 필요해요.

- 훈련 결과를 소수점으로 흘리지 말고 **"⚽ 슛 C → C+ 승급!"** 카드로 끊어 보여주기
  (내부 수치는 그대로 연속이어도 됩니다)
- 등급 구간은 **불균등하게** — 최상위는 좁게 잡아야 "S를 봤다"가 사건이 됩니다
- 한 경기(=1세션 단위)에 **최소 3번의 시각적 보상**: 승부처 성공 / 등급 승급 / 목표 진척

## 10. 색은 절대색이 아니라 테마 변수로

`:root`의 `--bg --bg2 --field --line --accent --accent2 --sky --text --dim`을 쓰세요.
절대색을 박으면 그 화면만 다른 게임 색이 됩니다 — 아이돌에서 실제로 겪었습니다.

## 11. 새 연출은 게임 전용 파일에

`base.css`는 8개 게임이 전부 내려받습니다. 새 게임의 연출은 그 게임의 `style.css`로.
`timing.js`도 마찬가지 — 전용 미니게임은 별도 파일로 뺐고(`tour-stage.js`·`post-stage.js`),
그 설계 덕분에 미니게임 작업이 한 번도 다른 세션과 안 부딪혔습니다.

## ⚠️ CSS는 이 저장소의 검증 사각지대입니다

jsdom에는 렌더 엔진이 없어 **계산된 스타일을 못 봅니다.**
칸이 겹치는지, 헤더가 세로로 쪼개지는지는 **폰으로 봐야 압니다.**

그래서 만든 화면은 반드시:
1. `beta/_check.html`에 도달 시나리오를 넣어 **눌러서 볼 수 있게** 하고
2. 산출물에 **"실기기 확인 필요" 목록**을 명시하세요

CSS가 초록불이라는 말은 이 저장소에 존재하지 않습니다.

## 설계할 때 걸리는 함정 둘

**① 화면이 만드는 기대와 메커닉의 핵심이 어긋나면 고쳐서 될 일이 아닙니다.**
날아오는 공 + 스윙 버튼은 누구나 타이밍 게임으로 읽는데 핵심이 "안 누르는 게 수"였던
미니게임을 세 번 고치고 결국 버렸습니다. 타이밍처럼 보이면 타이밍이어야 해요.

**② `pointerdown` 핸들러 안에서 화면을 갈아치우고 그 자리에 새 클릭 대상을 그리지 마세요.**
손을 뗄 때 브라우저가 그 지점의 새 요소로 `click`을 보내 **즉시 두 번 먹힙니다.**
화면 교체는 `click`에서 하세요.
