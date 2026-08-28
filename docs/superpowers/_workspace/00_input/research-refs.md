# 더 윙어 v2 리서치 — 선수 설정 · 성장 · 연출 · 리텐션

조사일 2026-08-28 · 대상 저장소 `grow-games` (`soccer/`)
현재 상태 요약: 6스탯(⚽슛·🏃드리블·🎯패스·🛡️수비·🫀체력·⚡스피드) · 클래스 11단계 ·
시즌 칭호 12종 · 세부 자리 11개 · 주발/약발 · 월드컵 · 명예의 전당. 미니게임은 타이밍 바 위주.

---

## 1. 축구 선수 육성 게임의 "선수 설정" 관행

### 1-1. 각 게임이 시작할 때 실제로 물어보는 것

| 게임 | 시작 시 정하는 항목 | 비고 |
|---|---|---|
| **EA FC 25/26 Player Career** | 이름·포지션 → **키/몸무게**(무거우면 힘↑, 가벼우면 스프린트↑ — 실제 능력치 배분에 반영) → **플레이스타일**(34종 중 선택) → **아키타입(Origin Story)** 3종: Maverick(개인기·득점형) / Virtuoso(플레이메이커) / Heartbeat(수비·주장형) | 아키타입마다 **전용 목표와 퍽**이 따로 붙음 |
| **PES/위닝일레븐 Become a Legend** | 이름·실황용 호명·얼굴 → **선수 타입 7종**: All Rounder / Finisher / Conductor(패서) / Dribbling / Shooting Star(스피드) / Heavy Tank(피지컬) / Human Dynamo(활동량) | 타입이 초기 능력 배분 + 성장 편향을 동시에 결정 |
| **Football Manager (에디터·Create a Club)** | 기술/정신/신체 3분류 × 1~20 수치, **CA(현재능력)/PA(잠재능력)**, 포지션, **PPM(선호 플레이)**, **성격**(Ambition·Loyalty·Pressure·Professionalism·Sportsmanship·Temperament·Controversy 7개 히든) | 비워두면 CA·포지션 기준으로 자동 랜덤 배분 |
| **파워프로 サクセス (입부계)** | 이름 · **수비 포지션** · **주손(利き腕)** · 타격/투구 폼. **포지션과 주손은 시작 후 변경 불가** | 시작 전 "덱 편성"(이벤트 캐릭 5+1)과 "아이템 반입(최대 2개)"가 별도 레이어 |
| **파워사커(実況パワフルサッカー)** | 위 구조를 축구로 이식. 시작 시 포지션 선택이 **육성 결과 전체를 규정**(CF/CB/GK 우선도 논의가 공략의 중심) | 포지션별 육성론이 별개 문서로 존재할 만큼 갈래가 큼 |
| **New Star Soccer** | 16세, 최하위 리그에서 시작. 능력치는 미니게임 성적으로만 오름. **시작 선택은 거의 없고 "관계"가 그 자리를 대신함**(팀 동료·감독·연인·스폰서) | 시작 커스터마이즈를 줄이고 "커리어 중 선택"으로 옮긴 반대 사례 |
| **Retro Bowl** | 선수 생성 없음. 대신 **구단주·팬 지지도·코칭 크레딧**을 시작 조건으로 제시 | "설정"을 구단 쪽에 둔 사례 |
| **Football Chairman Pro** | 회장 역할. 팀·예산·구장만 고름. 경기는 **초기 Championship Manager식 텍스트 중계** | 텍스트 중계로만 20+시즌을 끌고 가는 검증된 사례 |

### 1-2. 파워프로 サクセス 육성 구조 (핵심, 구체적으로)

우리가 훔칠 가치가 가장 큰 구조입니다. 정리하면:

**(1) 준비 단계 — 게임이 시작되기 전에 이미 선택이 있다**
- **입부계**: 이름 / 포지션 / 주손 / 폼. 포지션·주손은 **되돌릴 수 없음**
- **덱 편성**: 보유 이벤트 캐릭 5 + 조력자 1 (시나리오에 따라 서포트 3 추가)
- **아이템 반입**: 최대 2개, 레어 아이템은 2개 이상 불가

**(2) 진행 — 주 단위 턴제 커맨드**

| 커맨드 | 효과 |
|---|---|
| 練習(연습) | 경험점 획득. **연습 장소가 6곳**, 장소마다 나오는 경험점 종류가 다름 |
| 休む(휴식) | 체력 대폭 회복 |
| 遊ぶ(놀기) | 체력 소폭 회복 + **やる気(의욕) 상승** |
| 通院(통원) | 병·상태이상 치료 |
| デート(데이트) | 체력·의욕 회복 + 경험점 + **금특(金特)** |
| 能力アップ | 모아둔 경험점을 **소비해서** 기초능력·특수능력으로 바꿈 |

**(3) 자원 3축**
- **경험점**: 근력 / 민첩(변화) / 기술 / 정신 (+투수는 변화구). 금특 필요 경험점은 이 4종 합으로 계산
- **체력**: 낮으면 부상 확률 상승 → 휴식 강제
- **의욕(やる気)**: 높으면 획득 경험점 증가

**(4) 증폭 장치 — "그냥 연습"과 "잘 짠 연습"의 차이를 만드는 것**
- **태그(タッグ)**: 같은 연습 칸에 이벤트 캐릭이 함께 있으면 경험점 배증. **스페셜 태그**는 훨씬 더 큼
- **동료가 많은 칸 + 고의욕**이면 획득 경험점 증가
- **합숙**: 2학년 11월~3학년 3월 특정 주간에 **기재 레벨이 최대치(9)로 고정**, 타교 라이벌과 SP 태그 가능 → 효율 급상승
- **라이벌 대결**: 라이벌이 있는 연습을 고르면 대결 발생, 이기면 경험점·아이템. 라이벌마다 나오는 경험점 종류가 다름
- **천재 각성(天才覚醒)**: 극히 드물게 발생(또는 "천재의 입부계" 아이템으로 확정) → 능력이 대폭 상승
- **개안(開眼)**: 경험점 10,000점 이상일 때 사용 가능. **500점 소비 → 랜덤 금특의 "코츠" 획득**(기본 2회까지)
- **계승선수**: 등록한 계승 선수가 금특을 갖고 있으면 연습 중 코츠를 전수받을 수 있음

**(5) 특수능력 / 금특(金特)**
- 파란 특능(하위) / **금특(상위)** / **무지개특(虹特, 真·초특수능력)** 3단 위계
- 금특은 **이벤트 캐릭의 이벤트를 완주**해야 얻음. 마지막 선택지에 따라 **어떤 금특이 나오는지 갈림**
- **至高金特**: 특정 포지션으로 사쿠세스를 시작해야만 얻을 수 있음 → **시작 선택이 엔드콘텐츠 보상과 직결**
- 파워사커(축구판) 금특 실례: 両利き(양발) / ダイナモ / ライジングボルト / クモ男 / エースキラー / 電光石火 / シャットアウト / ドライブシュート / ド根性

**(6) 종료 조건과 평가**
- 4개 섹션 전부 클리어 필요. **고시엔에서 패배하면 사쿠세스 종료**
- 시합 출전에는 **감독 평가**를 일정 이상 올려야 함
- 종료 시 기초능력 + 특수능력을 합산한 **사정(査定)**으로 선수 랭크 결정 → 팀 랭크·메달·챌린지 보상으로 흘러감

**(7) 능력 표기**
- 실제 수치는 1~100(내부 255단계)이지만 화면에는 **G~S 알파벳**으로 보여줌
- 파워(타력) 기준 예: S 220~255 / A 140~219 / B 110~139 / C 95~109 / D 80~94 / E 65~79 / F 20~64 / G 0~19
- **구간이 균등하지 않음** — A 구간이 압도적으로 넓고 S는 좁음. "S를 봤다"는 사건이 되도록 설계됨

### 1-3. 우마무스메 育成 — 사쿠세스의 현대화 버전

| 요소 | 메커니즘 |
|---|---|
| **인자(因子) 계승** | 육성 시작 시 + 클래식 4월 + 시니어 4월, **총 3번**의 계승 이벤트. 부모 2명의 인자를 물려받음 |
| 인자 4종 | **청인자**(스탯, 3번 모두 발동) / **적인자**(적성 — 코스·거리·각질) / **녹인자**(고유 스킬, ★3 이상만) / **백인자**(레이스·스킬·시나리오, 랜덤 ★3까지) |
| 적성 | 시작 시 A까지, 계승으로 **최대 S까지** 확장 가능 |
| 상성(相性) | 육성 대상과 계승 부모의 상성이 **이중동그라미(◎◎)**면 인자 획득량 급증 |

→ **한 번의 육성이 끝나도 그 선수가 다음 육성의 "재료"가 된다.** 이게 우마무스메가
사쿠세스보다 리텐션이 압도적으로 높은 이유입니다.

### 1-4. 사례 — 메커니즘 — 적용

| 사례 | 메커니즘 | 우리에게 적용한다면 |
|---|---|---|
| **파워프로 입부계** | 이름·포지션·주손을 정하고 **되돌릴 수 없다**고 명시. 되돌릴 수 없어서 선택이 무거워짐 | 더 윙어는 이미 주발이 불변. 여기에 **포지션(4종)·세부 자리 선호**를 입단 화면으로 끌어올려 "이건 못 바꿔요" 문구를 붙이면 첫 화면의 무게가 생김 |
| **EA FC 아키타입 3종(Maverick/Virtuoso/Heartbeat)** | 선택이 **초기 능력이 아니라 목표와 퍽을 바꿈**. 마베릭은 슛 시도가 많아야 포인트가 쌓임 | **커리어 성향 3택**: 🔥해결사(골 관련 승부처 +, 시즌 목표=득점) / 🎼지휘자(도움·평점, 목표=공격P) / 🧱심장(수비·출전수, 목표=평점 안정). 성향별로 시즌 목표와 칭호 획득 문턱이 달라짐 |
| **PES 선수 타입 7종** | 이름 하나로 초기 스탯 배분 + 성장 편향을 동시에 표현 | 6스탯 초기 배분 프리셋 7종. 총합은 동일, **분포만 다름**(합이 같으니 밸런스 사고가 안 남 — 세부 자리 가중 평균 1 규칙과 같은 원리) |
| **FM 성격 7개 히든 스탯** | Professionalism이 훈련 성장률을, Ambition이 연봉·출전 요구를 좌우 | 🧠**기질** 1개만 도입: 프로의식(훈련 상승폭) · 야망(이적 제안 빈도·연봉 요구) · 담력(승부처 성공률). 3개면 충분하고, 화면엔 이름표 하나만 노출 |
| **파워프로 至高金特(포지션 한정 금특)** | 특정 포지션으로 시작해야만 얻는 최상위 특능 | **자리 전용 특능**: LW만 얻는 「역발 컷인」, CDM만 얻는 「후방의 지휘자」. 재시작 동기가 생김 |
| **우마무스메 인자 계승** | 은퇴한 캐릭이 다음 육성의 시작 스탯·적성으로 들어감 | 이미 있는 **명예의 전당을 "계승"으로 연결**. 헌액 선수 1명을 "롤모델"로 지정하면 새 커리어가 그 선수 6스탯의 일정 %를 초기 보정으로 받음 |
| **New Star Soccer 관계 축** | 동료·감독·연인·스폰서 4축을 에너지로 관리. 동료 호감이 낮으면 **패스를 안 준다** | 이미 있는 컨디션·훈련과 겹치지 않는 새 축 하나: **🤝동료 신뢰**. 낮으면 도움 기댓값이 깎이고, 높으면 세부 자리 경쟁에서 유리 |

---

## 2. "키우는 맛"을 만드는 성장 시스템 설계 패턴

### 2-1. 성장 곡선 — 早熟/晩成

파워프로는 성장 타입을 **초조숙 / 조숙 / 보통 / 만성 / 초만성 5종**으로 두고,
**쇠퇴 시작 나이**를 다르게 잡습니다.

| 타입 | 쇠퇴 시작 | 대가 |
|---|---|---|
| 超早熟 | 약 24세 | 능력 상승 속도가 가장 빠름 |
| 早熟 | 약 27세 | |
| 普通 | 31세(35세부터 급락) | 기준 |
| 晩成 | 약 33세 | 상승 속도가 느려짐 |
| 超晩成 | 약 36세 | 가장 느리게 오름 |

**핵심은 트레이드오프입니다.** 만성으로 만들면 오래 가지만 **오르는 속도가 떨어집니다.**
그냥 좋은 타입이 없어요. 그리고 페넌트 모드에서는 주전으로 계속 기용하면
**조숙이 보통·만성으로 바뀌기도 합니다** — 타입이 고정 라벨이 아니라 플레이로 움직입니다.

### 2-2. 잠재력의 "안개" — FM의 마스킹

- 남의 선수 능력치는 **범위로 표시**됨: "테크닉 11~16"
- 스타 레이팅도 지식도가 낮으면 **범위**로 나옴. 금색=확정, 은색=아래 범위, 흰색=잠재 최대치
- **어린 선수는 아무리 스카우트해도 잠재 별에 범위가 남음**
- 스카우트의 JPA(현재능력 판단)/JPP(잠재력 판단) 능력치가 정확도를 좌우

→ 성장 시스템의 재미 중 절반은 **모른다는 것**에서 옵니다.

### 2-3. 숫자가 오르는 걸 감정으로 바꾸는 법

- 매끄럽고 연속적인 성장은 만족스럽지 않다. **불연속적인 레벨업 순간**이 효과적이다
- **30~90초마다 긍정 피드백, 10~15분마다 큰 마일스톤**. 노력 3 : 보상 1 비율이 기준선
- **수직 성장(수치 상승)** 과 **수평 성장(선택지 확장)** 을 같이 써야 파워크립 없이 성장감이 유지됨
- 파워프로의 G~S 알파벳처럼 **구간을 불균등하게** 자르면 등급 상승이 사건이 됨

### 2-4. 사례 — 메커니즘 — 적용

| 사례 | 메커니즘 | 우리에게 적용한다면 |
|---|---|---|
| **파워프로 성장타입 5종** | 조숙일수록 빨리 오르고 빨리 꺾임. 좋은 타입이 없는 트레이드오프 | 더 윙어는 이미 동료에게 나이곡선(18세 0.68 → 27세 1.00 → 35세 0.82)이 있음. **내 선수에게도 성장타입 3~5종**을 주고 그 곡선의 정점 나이와 상승폭을 함께 흔들기. 조숙=22세 정점·훈련 상승폭 ×1.2, 만성=30세 정점·×0.85 |
| **페넌트에서 조숙→만성 변화** | 계속 기용하면 타입이 좋아질 수 있음 | 성장타입을 **완전 고정하지 않기**. 3시즌 연속 평점 7.0↑이면 정점 나이 +1 같은 소폭 이동. "관리하면 오래 간다"는 서사가 생김 |
| **FM 능력치 마스킹(11~16 범위)** | 모르는 값을 범위로 보여줌 | **잠재력(peak)을 숫자로 안 보여주기.** 입단 초기엔 「⭐⭐~⭐⭐⭐⭐」처럼 범위, 시즌이 지날수록 범위가 좁아지다가 27세에 확정. 지금 클래스 11단계 라벨이 이미 있으니 그 눈금을 재사용 |
| **파워프로 G~S 불균등 구간** | A 구간이 넓고 S는 좁음. 등급 상승이 드묾 | 6스탯 각각에 **등급 라벨**을 붙이기. 클래스는 종합용이니, 스탯 개별은 F~S 7단계. 구간을 불균등하게 — S는 상위 3%만 |
| **파워프로 개안(경험점 10,000 → 500 소비 → 랜덤 금특 코츠, 2회까지)** | 축적한 자원을 **도박성 교환**에 쓰게 함 | 시즌 종료 시 남은 훈련 포인트를 「🎲 각성 시도」로 소비 → 랜덤 특능 1개. 회수 제한(시즌당 2회)이 핵심 |
| **파워프로 금특 이벤트 완주 + 마지막 선택지 분기** | 특능이 "구매"가 아니라 **이야기의 결말**로 옴 | 시즌 중 3~4회 뜨는 **커리어 이벤트 체인**. 마지막 선택지에 따라 다른 특능. (더 윙어는 이미 "감독 한마디"·"헌액 한마디" 텍스트 자산이 있음 — 그 톤을 그대로 씀) |
| **EA FC PlayStyles 34종 + PlayStyles+** | 같은 트레잇의 **금색 상위 티어**가 따로 존재. 소수만 보유 | 특능을 **일반/금(⭐)** 2티어로. 금 특능은 커리어당 3개 이하만 가능 → 빌드 선택이 생김 |
| **레벨업 불연속성 원칙(30~90초 피드백)** | 매끈한 증가 대신 문턱을 넘는 순간을 만들기 | 훈련 결과를 소수점으로 흘리지 말고 **"⚽ 슛 C → C+ 승급!"** 카드로 끊어 보여주기. 실제 내부 수치는 그대로 연속이어도 됨 |
| **수직 + 수평 성장 병행** | 수치만 올리면 물림 | 수직=6스탯, 수평=**특능·세부 자리 해금·전술 역할**. 시즌마다 "새로 할 수 있게 된 것"이 하나는 있어야 함 |

---

## 3. DOM/CSS만으로 만드는 스포츠 경기 연출

### 3-1. 텍스트 중계를 박진감 있게 — 검증된 기법

**"주스(Juice)" 4종 세트** (GDC 2012 *Juice it or lose it*, Jonasson & Purho):
플래시 · 흔들림 · 떠오르는 숫자 · 사운드 · 파티클. 텍스트 게임에 바로 적용 가능한 형태는:

- **타이핑 연출**: 글자를 한 자씩 출력 + 글자마다 짧은 진동/소리
- **오답에 흔들림, 정답에 바운스**
- **데미지 숫자 팝업** — 우리 경우 "골! +1", "평점 +0.3"
- **스크린 셰이크**는 즉각 피드백 수단 중 가장 흔하고 효과적

**Football Manager의 하이라이트 철학**:
- 「Commentary only」 모드 = 작은 창에 텍스트만. 이것만으로 20년 넘게 굴러감
- **Key Moments만 보여주기 / 확장 하이라이트** 중 선택 가능
- FM26의 **Dynamic Highlight Mode** — 상황에 따라 하이라이트 밀도를 바꿔 서스펜스를 조절
- 하이라이트 **사이사이에 Match Overview 화면**을 끼워 경기 흐름을 요약

**Football Chairman Pro**: 초기 챔피언십 매니저식 텍스트 중계로 수십 시즌을 끌고 감.
텍스트 중계는 빈약함의 표시가 아니라 **의도적 선택으로 성립**한다는 증거.

**A Dark Room / Universal Paperclips / Candy Box**:
DOM 텍스트만으로 만든 게임인데 4~12시간을 버팀. 공통 설계는
**① 미니멀 인터페이스 ② 시스템이 튜토리얼 없이 시간에 따라 스스로 드러남
③ 버튼과 섹션이 하나씩 늘어나는 것 자체가 보상.**

### 3-2. 선수 캐릭터를 CSS로 그리기

- **box-shadow 픽셀아트**: `<div>` 하나 + `box-shadow`에 좌표별 색을 콤마로 나열하면
  이미지·캔버스·JS 없이 스프라이트가 됨. `transform: scale(3)`로 확대.
  16×16이면 최대 256개 그림자 — Sass/JS 생성 권장. 애니메이션은 keyframes로 box-shadow 교체
- **페이퍼돌 레이어드 아바타**: 몸/머리/헤어/유니폼을 **같은 크기의 투명 PNG(또는 SVG)로 겹침**.
  겹치지 않는 파츠(눈·코·입)는 z-index 관리조차 필요 없음
- **DiceBear**: 오픈소스 SVG 아바타 라이브러리, 61종 스타일.
  **seed 문자열이 같으면 항상 같은 아바타** → 이미지 저장 없이 문자열만 보관.
  JS 라이브러리/HTTP API 모두 제공. `avataaars` 스타일이 헤어·의상·표정 조합형
- Mana Seed 「Character Base」 계열처럼 **동일 레이아웃 시트**를 쓰면 런타임 교체가 자유로움

### 3-3. 모바일 세로 화면 축구 UI

- **세로 우선은 근거가 있음**: 영상 사이트에서도 82.5%가 세로로 잡고 봄
- **FotMob**: 클린한 UI·빠른 파악 우선. 경기 통계 페이지에 **누적 xG 타임라인 그래프**와 슛맵
- **Sofascore**: 히트맵·라이브 매치 애니메이션·심층 통계. 통계 밀도 우선
- 세로 스포츠 UI의 공통 패턴: **카드형 세로 피드 스크롤 · 초대형 스코어 표시 ·
  팀 컬러 액센트 · 본문 텍스트 최소화 · 엄지 도달 범위 내비게이션**
- 세로 영상 중계 패턴: **상단 1/3은 전경(맥락), 하단 2/3은 확대 화면(액션)**
  → 우리 화면에 그대로 대응: 상단=스코어보드/시간, 하단=중계 피드
- **FM Mobile의 Match Day**: 세로 화면에서 텍스트 하이라이트 + 요약 화면을 번갈아 보여주는 구조

### 3-4. 사례 — 메커니즘 — 적용

| 사례 | 메커니즘 | 우리에게 적용한다면 |
|---|---|---|
| **FM 「Commentary only」 + Key Moments** | 전체를 보여주지 않고 **결정적 장면만** 텍스트로 뽑음 | 90분을 **6~8개의 순간 카드**로 압축. 각 카드는 `분 · 상황 · 결과` 3줄. 내 선수가 관여한 카드만 확대 표시 |
| **FM26 Dynamic Highlight Mode** | 상황에 따라 하이라이트 밀도를 바꿔 긴장을 조절 | 0-0이거나 1점 차 후반이면 **카드 간 딜레이를 늘리고** 문구를 길게, 3-0이면 빠르게 넘김. `setTimeout` 값 하나로 됨 |
| **FM26 하이라이트 사이의 Match Overview** | 장면 사이에 흐름 요약을 끼움 | 전반 종료 시 **하프타임 카드**: 점유율·슛·내 평점 3개만. 감독 한마디 자산 재활용 |
| **Juice it or lose it (플래시·셰이크·플로팅 숫자)** | 같은 게임에 연출만 얹어도 재미가 급증 | 골 = `body`에 0.3s 셰이크 + 팀 컬러 풀스크린 플래시 + "⚽ GOAL" 스케일업. 실점 = 회색 플래시 + 좌우 흔들림 (짧게). `prefers-reduced-motion` 존중 필수 |
| **타이핑 연출 + 글자마다 진동** | 한 자씩 출력이 긴장을 만듦 | 승부처 카드만 타이핑(40~60ms/자), 나머지는 즉시 표시. **전부 타이핑하면 지루해짐** — 밀도 차이가 핵심 |
| **box-shadow 픽셀아트** | div 1개로 스프라이트, 이미지 0 | 내 선수 실루엣 1개 + 골 세리머니 2~3프레임. 유니폼 색은 CSS 변수로 팀마다 교체 |
| **DiceBear 결정론적 seed** | seed 문자열 → 항상 같은 아바타 | 선수 ID를 seed로 써서 **동료·경쟁자 전원에게 얼굴**을 줌. 저장 데이터는 문자열 하나만 늘어남(마이그레이션 불필요 — 없으면 이름을 seed로) |
| **페이퍼돌 레이어드** | 같은 크기 레이어를 z-index로 겹침 | 헤어(6종)×피부(4종)×유니폼(팀 컬러 CSS 변수)만으로 조합 수 확보. 입단 화면의 "설정할 것"이 하나 늘어남 |
| **FotMob 누적 xG 타임라인** | 경기 흐름을 한 줄 그래프로 | 경기 후 **내 기여도 타임라인** 한 줄(SVG polyline 또는 flex div bar). 90분을 가로로, 관여 이벤트를 점으로 |
| **세로 영상 상1/3-하2/3 분할** | 맥락과 액션을 세로로 분리 | 상단 고정 스코어보드(sticky) + 하단 스크롤 중계 피드. 새 카드는 **아래에서 위로 push-in** |
| **A Dark Room의 점진적 UI 노출** | 버튼이 하나씩 늘어나는 것이 보상 | 시즌이 지날수록 화면 탭이 늘어나기(1시즌: 경기·훈련 → 3시즌: +이적 → 대표 발탁 후: +대표팀). **처음 화면을 일부러 비워두기** |

---

## 4. 짧은 세션 모바일 육성 게임의 리텐션 장치

### 4-1. 검증된 구조들

**Retro Bowl** — 세션 60초 미만 설계
- **코칭 크레딧(CC)** 단일 화폐. 획득 규칙이 명료: 팬 지지 0~33%+승=1CC / 33~66%+승=2CC /
  66~100%+승=3CC / **레트로볼 우승=10CC**
- CC 용도: 시설 업그레이드 · FA 영입 · 코치 고용
- **팬 지지도**가 CC 획득률을 좌우 → 지면 다음 시즌이 더 어려워지는 하강 나선(그래서 긴장)
- 팀 사기 7단계 라벨: Toxic / Bad / Poor / OK / Good / Great / Exceptional
- 공/수를 **별 5개(반 개 단위)** 로 표시
- **시즌 무제한** — 100시즌 넘긴 플레이어 존재
- 게임의 미덕은 "무엇이 본질이고 무엇을 빼도 되는지에 대한 거의 완벽한 이해"

**New Star Soccer** (BAFTA 2013 수상, 4.7/5 · 3만+ 리뷰)
- 90분을 다 하지 않고 **프리킥·결정적 찬스 등 "중요한 순간"만** 조작
- **에너지**가 훈련·관계관리·경기를 전부 소모 → 한 세션에 할 수 있는 게 제한됨
- 벤치에서 시작 → 평점을 쌓아야 출전 시간이 늘어남 (**출전권 자체가 보상**)
- 도박(카지노)·뇌물 같은 **위험한 선택지**가 세션마다 유혹으로 등장
- 은퇴하면 **커리어 점수**가 남아 다음 회차의 목표가 됨

**Football Chairman Pro** — 논리그에서 프리미어까지 **수십 시즌** 스팬.
자동으로 실수를 복구해주는 시스템이 없어 결정에 무게가 있음

**Rogue Legacy / Hades형 메타 프로그레션**
- 죽으면 **상속자 3명 중 1명 선택** — 각자 장점과 유전적 결함(예: 화면이 뒤집히는 현기증)
- 런에서 모은 금으로 **영구 업그레이드(성/거울)** → 다음 런이 확실히 유리
- "런 자체의 도전 + 세션을 넘어가는 장기 목표" 이중 구조가 「한 판 더」의 정체

**우마무스메** — 은퇴한 캐릭이 **인자로 다음 육성의 재료**가 됨 (§1-3)

**A Dark Room / Universal Paperclips** — 4~12시간 분량을
**시스템이 스스로 드러나는 방식**만으로 끌고 감

### 4-2. 사례 — 메커니즘 — 적용

| 사례 | 메커니즘 | 우리에게 적용한다면 |
|---|---|---|
| **Retro Bowl 팬 지지도 → CC 배율** | 하나의 지표가 화폐 획득률을 직접 곱함. 지면 다음이 더 힘듦 | 더 윙어의 **클래스 → 수당 배수**가 이미 같은 구조. 여기에 **📣 팬심** 축을 하나 더: 시즌 목표 달성 여부로 오르내리고 **훈련 상승폭**에 곱해짐. 실력(클래스)과 다른 축이라 이중 계산이 아님 |
| **Retro Bowl 무제한 시즌 + 100시즌 기록** | 끝이 없어서 "다음 시즌"이 항상 있음 | 은퇴 후 **뉴게임+**: 명예의 전당에 헌액된 선수 1명을 "롤모델"로 선택 → 초기 6스탯 보정. (우마무스메 인자 + Rogue Legacy 상속자 결합) |
| **New Star Soccer 에너지** | 한 세션의 행동 수를 강제로 자름 → 다음 접속 이유 | 현재 컨디션 시스템을 **"이번 세션에 몇 번 훈련 가능"** 으로 전면화. 체력 스탯이 이미 컨디션 소모를 −30%까지 줄이니 배선은 있음 |
| **New Star Soccer 벤치 시작** | 출전권 자체가 첫 목표 | 이미 대표팀 선발 경쟁(78~91 확률 굴림)이 있음. **클럽 단계에도 같은 구조**를 앞당겨 신인 시즌에 적용하면 초반 목표가 명확해짐 |
| **Rogue Legacy 상속자 3택(장점+결함)** | 선택지마다 확실한 대가가 있음 | 새 커리어 시작 시 **유망주 3명 중 1택**: 각자 성장타입·초기 배분·특능 1개·**결함 1개**(예: 「유리몸」 부상 확률↑, 「욕심쟁이」 도움 −8%·골 +12%) |
| **Hades 거울(영구 업그레이드)** | 런 밖에서 쓰는 별도 화폐 | 은퇴할 때 커리어 성적을 **🏅 레거시 포인트**로 환산 → 다음 커리어의 영구 해금(새 리그, 새 성향, 새 특능 풀) |
| **Retro Bowl 별 5개 + 사기 7단계 라벨** | 수치 대신 라벨로 상태를 즉시 읽게 함 | 이미 클래스 11단계·칭호 12종 라벨 자산이 있음. **6스탯에도 F~S 라벨**을 붙여 통일 |
| **Football Chairman 수십 시즌 스팬** | 하위 리그→최상위의 긴 사다리 | 리그 승격 사다리가 이미 있음. **시즌 시작 화면에 "이번 시즌의 목표 3개"** 를 명시하고, 세션 종료 시 그 진척도만 보여주기 |
| **A Dark Room 점진적 시스템 노출** | 튜토리얼 없이 기능이 늘어남 | 신규 유저에게 처음 2시즌은 **훈련 3종·경기만**. 이후 시즌마다 새 시스템 1개씩 개방 |
| **레벨업 30~90초 / 마일스톤 10~15분 원칙** | 피드백 밀도 기준선 | 한 경기(=1세션 단위)에 **최소 3번의 시각적 보상**: 승부처 성공 / 스탯 등급 승급 / 시즌 목표 진척 |

---

## 🏆 더 윙어 v2에 즉시 훔쳐올 만한 아이디어 Top 12

우선순위 = (박진감·키우는 맛 개선폭) ÷ (구현 비용). 난이도는 이 저장소 기준(빌드 없음·DOM 위주).

| # | 아이디어 | 출처 | 왜 지금 | 난이도 |
|---|---|---|---|---|
| **1** | **경기를 "순간 카드 6~8장"으로 재구성** — 스코어보드 sticky 상단, 카드가 아래에서 push-in. 승부처 카드만 타이핑 연출(40~60ms/자), 나머지는 즉시 | FM Commentary only / Key Moments · 세로 UI 상1/3-하2/3 | 박진감 부족의 **주원인**. 텍스트 자산은 이미 다 있고 출력 방식만 바꾸는 일 | **중** |
| **2** | **골 = 셰이크 + 팀컬러 플래시 + 스케일업, 실점 = 회색 플래시** (`prefers-reduced-motion` 존중) | Juice it or lose it | CSS keyframes 3개. **비용 대비 체감이 가장 큼** | **하** |
| **3** | **6스탯 개별 F~S 등급 라벨 + 승급 카드** ("⚽ 슛 C → C+ 승급!"). 구간은 불균등하게(S는 상위 3%) | 파워프로 G~S 표기 · 레벨업 불연속성 | 지금은 숫자만 올라가서 감정이 안 붙음. 내부 수치는 안 건드림 | **하** |
| **4** | **입단 화면에 성향 3택**(해결사/지휘자/심장) — 초기 스탯이 아니라 **시즌 목표와 칭호 문턱**을 바꿈 | EA FC Origin Story 아키타입 | "선수 설정"이 약하다는 문제의 정면 해결. 칭호 시스템이 이미 있어서 배선이 짧음 | **중** |
| **5** | **성장타입 3~5종**(조숙~만성) — 정점 나이와 훈련 상승폭의 트레이드오프. 동료용 나이곡선을 내 선수에게도 적용 | 파워프로 成長タイプ | 동료 나이곡선 코드가 이미 있음. **몬테카를로 재측정 필수**(CLAUDE.md 규칙) | **중** |
| **6** | **잠재력 안개** — peak을 숫자 대신 클래스 범위(⭐⭐~⭐⭐⭐⭐)로 보여주고 시즌마다 좁혀서 27세에 확정 | FM 능력치 마스킹 / 스타 레이팅 범위 | "모른다"가 만드는 몰입. 클래스 11단계 라벨을 그대로 재사용 | **중** |
| **7** | **유망주 3명 중 1택** (성장타입 + 초기 배분 + 특능 1 + **결함 1**) | Rogue Legacy 상속자 | 첫 화면이 선택으로 시작됨. 결함이 있어야 선택이 무거워짐 | **중** |
| **8** | **특능(트레잇) 시스템 도입 — 일반/금(⭐) 2티어, 금특은 커리어당 3개 한도.** 자리 전용 특능 포함 | 파워프로 金特·至高金特 · EA FC PlayStyles+ | 지금 가장 비어 있는 "수평 성장" 축. 시즌 칭호와 키(`g`/`a`/`d`/`rate`/`moment`/`train`)를 공유하면 배선 재활용 | **상** |
| **9** | **커리어 이벤트 체인 → 마지막 선택지가 특능을 가름** (시즌당 3~4회) | 파워프로 금특 이벤트 완주 분기 | 특능이 "구매"가 아니라 이야기로 옴. 감독 한마디·헌액 한마디의 문체 자산을 그대로 씀 | **상** |
| **10** | **DiceBear seed 아바타 + box-shadow 픽셀 실루엣** — 선수 ID를 seed로, 유니폼 색은 CSS 변수 | DiceBear · CSS 픽셀아트 · 페이퍼돌 | 명단·경쟁자·헌액 카드 전부가 살아남. 저장 데이터는 문자열 하나(없으면 이름을 seed → 마이그레이션 불필요) | **중** |
| **11** | **뉴게임+ 계승** — 은퇴 시 성적을 🏅레거시 포인트로 환산, 헌액 선수 1명을 롤모델로 지정해 초기 보정 + 영구 해금 | 우마무스메 인자 계승 · Hades 거울 | 은퇴가 **끝이 아니라 다음 판의 입구**가 됨. 명예의 전당이 이미 있어서 절반은 만들어져 있음 | **상** |
| **12** | **시즌 시작 = 목표 3개 제시, 세션 종료 = 진척도 요약 카드** + 신규 2시즌은 기능을 잠가두고 시즌마다 1개씩 개방 | Retro Bowl 시즌 구조 · A Dark Room 점진 노출 | "한 판 더"의 가장 값싼 장치. 목표 3개는 성향(#4)과 연동하면 공짜로 다양해짐 | **하** |

### 착수 순서 제안

- **1주차 (난이도 하 3개)**: #2 골 연출 → #3 스탯 등급 라벨 → #12 시즌 목표 카드
  → 여기까지만 해도 "박진감 + 키우는 맛"의 체감이 크게 달라짐. 저장 데이터 변경 없음
- **2주차**: #1 순간 카드 재구성 (경기 화면 전면 개편이므로 단독으로)
- **3주차 이후**: #4 성향 → #5 성장타입 → #6 잠재력 안개 (셋 다 몬테카를로 재측정 필요)
- **장기**: #8 특능 → #9 이벤트 체인 → #11 뉴게임+ (새 저장 필드. 읽는 쪽 기본값 규칙 준수)

### 구현 시 이 저장소 규칙과의 충돌 지점

- **#8·#9·#11은 새 저장 필드**를 만듭니다. 마이그레이션 없이 **읽는 쪽에서 기본값**을 주세요
  (`(S.career.traits || [])`). 가중 카운터를 더할 땐 옛 카운터 이어받기
- **#5 성장타입 / #6 잠재력**은 밸런스를 흔듭니다. **몬테카를로 실측 후 근거 기록** — 세부 자리
  가중 평균 1 규칙 때문에 골든부츠 수상률이 43%→60%로 튄 전례가 있음
- **#1·#2·#10은 `soccer/` 전용 파일**에 넣으세요. `timing.js`·`base.css`는 8개 게임 공용이라
  건드리면 안 됩니다. 새 기능은 전용 파일로 빼는 게 이 저장소의 검증된 방식

---

## 출처

**선수 설정 · 육성 구조**
- [パワプロアプリ サクセスとは？流れやコマンド — GameWith](https://xn--odkm0eg.gamewith.jp/article/show/327274)
- [【パワプロ2026】サクセスの攻略一覧 — ゲームエイト](https://game8.jp/pawapuro2026-2027/788146)
- [【パワプロ2026】サクセスで入手できる金特・コツ — ゲームエイト](https://game8.jp/pawapuro2026-2027/789270)
- [パワプロシリーズの特殊能力 — アニヲタWiki](https://w.atwiki.jp/aniwotawiki/pages/57529.html)
- [255段階時の数値とアルファベット — 旧パワめも](https://pawa.ldblog.jp/archives/52849980.html)
- [パワサカ 特殊能力一覧 — qoly](https://game.qoly.jp/category/pawasoccer/tokusyu-nouryoku/)
- [【パワサカ】ポジション別育成論 — GameWith](https://pawasoccer.gamewith.jp/article/show/46866)
- [Become a Legend — PES Wiki (Neoseeker)](https://pes.neoseeker.com/wiki/Become_a_Legend)
- [EA SPORTS FC 25 Pitch Notes — Career Mode Deep Dive](https://www.ea.com/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-career-mode-deep-dive)
- [EA FC 25 Player Career Mode Guide (Origin Story) — KeenGamer](https://www.keengamer.com/articles/guides/ea-sports-fc-25-player-career-mode-guide-level-up-fast-origin-story-live-start/)
- [FC 25 PlayStyles Explained — FIFA U Team](https://fifauteam.com/fc-25-playstyles-guide/)
- [Football Manager Player Attributes Explained — Passion4FM](https://www.passion4fm.com/football-manager-player-attributes/)
- [Football Manager Player Traits (PPM) — Passion4FM](https://www.passion4fm.com/football-manager-player-traits/)
- [Guide to Player Personalities on Football Manager — FM Scout](https://www.fmscout.com/a-guide-to-player-personalities-football-manager.html)

**성장 시스템**
- [成長タイプ早見表 — パワプロ雑記帳](https://sisterion2.hatenadiary.jp/entry/2020/04/05/000000)
- [パワプロ2022 ペナント攻略 〜成長タイプについて〜 — note](https://note.com/marker810/n/nbf2b8f708244)
- [【ウマ娘】因子（因子継承）の仕組み — 神ゲー攻略](https://kamigame.jp/umamusume/page/154134787475434233.html)
- [【ウマ娘】継承の相性と因子継承の仕組み — アルテマ](https://altema.jp/umamusume/keisyou)
- [All you need to know about STAR RATINGS on Football Manager — Passion4FM](https://www.passion4fm.com/football-manager-guide-star-ratings/)
- [Football Manager Current and Potential Ability Guide — FM Scout](https://www.fmscout.com/a-football-manager-current-and-potential-ability-guide.html)
- [RPG Stat Systems Explained — StraySpark](https://www.strayspark.studio/blog/rpg-stat-systems-character-progression-design)
- [Game Progression System Design: Levels & Tournaments](https://gtstu.com/game-progression-system-design-keep-players-hooked/)

**DOM/CSS 연출**
- [Where Storytelling Evolves: FM26's Match Day Experience — Football Manager](https://www.footballmanager.com/fm26/features/where-storytelling-evolves-fm26s-match-day-experience)
- [Match Day — Football Manager Mobile 2026 Manual (Sports Interactive)](https://community.sports-interactive.com/sigames-manual/football-manager-mobile-2026/match-day-r5263/)
- [Where Does Game Feel Come From: Flash, Shake, Floating Text — BetterLink Blog](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)
- [Making a Game Feel "Juicy" with Simple Effects — Medium](https://resprawn.medium.com/when-you-play-a-great-game-it-feels-good-d23761b6eccf)
- [Fun Times With CSS Pixel Art — CSS-Tricks](https://css-tricks.com/fun-times-css-pixel-art/)
- [CSS Pixel Art — Box-Shadow Technique, 22 Effects with Code — DEV](https://dev.to/abduarrahman/css-pixel-art-box-shadow-technique-22-effects-with-code-2e6m)
- [DiceBear — Open Source Avatar Library & API](https://www.dicebear.com/introduction/)
- [Avataaars – Avatar Style — DiceBear](https://www.dicebear.com/styles/avataaars/)
- [Make a Dress-up game using Javascript, HTML and CSS — Stashable](https://stashable.wordpress.com/2018/12/30/make-a-dress-up-game-using-javascript-html-and-css/)
- [The Odometer Effect (without JavaScript) — Frontend Masters](https://frontendmasters.com/blog/the-odometer-effect-in-css/)
- [Meet the moment with vertical live sports for mobile — Wildmoka](https://www.wildmoka.com/resources/meet-the-moment-with-vertical-live-sports-for-mobile)
- [Clean App Design Inspiration: FotMob — DesignRush](https://www.designrush.com/best-designs/apps/soccer-scores-pro-fotmob)
- [Best Live Score Apps 2026: Sofascore vs FotMob 비교](https://insideformation.com/blog/best-livescore-apps-2026-comparison)

**리텐션**
- [Coaching Credits — Retro Bowl Wiki](https://retro-bowl.fandom.com/wiki/Coaching_Credits)
- [Rob's Complete Guide to Retro Bowl: The Front Office](https://robwritesaboutwhatever.com/2021/04/15/robs-complete-guide-to-retro-bowl-part-1-how-to-build-a-winning-front-office/)
- [Retro Bowl's addictive simplicity — GamesRadar+](https://www.gamesradar.com/retro-bowls-addictive-simplicity-makes-it-one-of-the-best-sports-games-in-recent-years/)
- [From 'Retro Bowl' To 'Retro Goal' — Nintendo Life](https://www.nintendolife.com/features/from-retro-bowl-to-retro-goal-how-new-star-games-returned-to-its-grass-roots)
- [New Star Soccer — Wikipedia](https://en.wikipedia.org/wiki/New_Star_Soccer)
- [Tips and Tricks for beginners — New Star Soccer Wiki](https://new-star-soccer.fandom.com/wiki/Tips_and_Tricks_for_beginners)
- [Indie Initiative: Football Chairman Pro — MoGi](https://mogi-group.com/indie-initiative-football-chairman-pro/)
- [Rogue Legacy 2 is the perfect 'one more' game — Digital Trends](https://www.digitaltrends.com/gaming/rogue-legacy-2-impressions/)
- [From Progress Quest to Universal Paperclip: The History of incremental games — Medium](https://medium.com/@touloutoumou/from-progress-quest-to-universal-paperclip-the-history-of-free-incremental-games-3c96bfeaa918)
