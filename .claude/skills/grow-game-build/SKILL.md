---
name: grow-game-build
description: "grow-games 육성 게임을 설계·구현·검증하는 에이전트 팀 오케스트레이터. 새 게임 신설('더 윙어 v2', 'winger2', '새 게임 만들기'), 기존 게임 개편·기능 추가('경기 화면 바꾸자', '성장 시스템 개편', '선수 설정 구체화', '박진감 있게', '키우는 맛'), 밸런스 조정에 사용한다. 후속 작업에도 반드시 사용할 것 — '다시 실행', '재실행', '업데이트', '수정해줘', '보완', '이전 결과 기반으로', '{게임}의 {부분}만 다시', '설계만 고치자', '연출만 다시'. 단순 버그 수정이나 한 줄 질문은 직접 처리해도 된다."
---

# Grow Games 빌드 오케스트레이터

`/workspace/grow-games`의 육성 게임을 **설계 → 실측 → 구현 → 검증**으로 끌고 가는 조율 스킬.

## 실행 모드: 서브 에이전트 (파일 기반 전달 + SendMessage 교차검증)

> **이 환경에는 `TeamCreate`/`TaskCreate`가 없습니다.** `Agent`(백그라운드 병렬 실행)와
> `SendMessage`/`ListAgents`만 있어요. 그래서 팀 모드가 아니라 **서브 에이전트 + 파일 기반
> 전달**로 굴리고, 교차검증이 필요한 곳에서만 `SendMessage`로 이전 에이전트를 재개합니다.
>
> **모든 `Agent` 호출에 `model: "opus"`를 명시하세요.**

### ⚠️ 커스텀 에이전트 타입이 안 잡힐 때 (폴백)

`.claude/agents/`를 **방금 만들었거나 고친 직후에는 아직 안 잡힙니다.**
`Agent type 'grow-designer' not found`로 튕겨요. 잠시 뒤 자동으로 로드되지만
(실측: 하네스 구축 세션에서 몇 분 뒤 잡혔습니다), 그때까지 기다릴 이유는 없습니다.

**호출이 튕기면 그 자리에서 `general-purpose`로 바꾸고, 프롬프트 맨 앞에 정의를 읽는 지시를
넣으세요.** 역할·원칙·프로토콜이 그대로 살아납니다.

```
Agent(subagent_type: "general-purpose", model: "opus", prompt: `
먼저 /workspace/grow-games/.claude/agents/grow-designer.md 를 읽고,
거기 적힌 역할·작업 원칙·입출력 프로토콜을 그대로 따르세요. 그것이 당신의 정의입니다.

(이하 실제 작업 지시)
`)
```

**폴백으로 돌았다고 결과가 나쁜 게 아닙니다** — 정의를 읽는 경로가 한 단계 늘어난 것뿐이고,
같은 파일을 읽으니 역할·원칙이 그대로 살아납니다. 다음 호출에서 커스텀 타입이 잡히면
그때부터 그걸 쓰세요.

## 팀 구성

| 에이전트 | subagent_type | 역할 | 주 스킬 | 출력 |
|---|---|---|---|---|
| grow-designer | `grow-designer` | 시스템 설계, 설계 문서 | — | `docs/superpowers/_workspace/1N_designer_*.md` |
| grow-balancer | `grow-balancer` | 몬테카를로 실측, 계수 확정 | `grow-balance-sim` | `docs/superpowers/_workspace/2N_balancer_*.md` |
| grow-engineer | `grow-engineer` | 게임 로직 구현, 등록 지점 | `grow-new-game`·`grow-repo-ops` | `beta/{slug}/` + `docs/superpowers/_workspace/3N_engineer_*.md` |
| grow-director | `grow-director` | 경기 연출, 아바타, CSS | `grow-match-feel` | `beta/{slug}/style.css` 등 + `docs/superpowers/_workspace/3N_director_*.md` |
| grow-inspector | `grow-inspector` | 테스트, 경계면 교차 비교 | `grow-test-writing` | `tests/{slug}/` + `docs/superpowers/_workspace/4N_inspector_*.md` |

## 산출물이 놓이는 자리

이 저장소에는 이미 설계 문서의 관행적 자리가 있습니다. 새로 만들지 말고 거기에 맞추세요.

| 무엇 | 어디 |
|---|---|
| 중간 산출물 (설계 초안·실측 로그·검증 보고) | `docs/superpowers/_workspace/` |
| 확정 스펙 | `docs/superpowers/specs/{YYYY-MM-DD}-{주제}-design.md` |
| 구현 계획 | `docs/superpowers/plans/{YYYY-MM-DD}-{주제}.md` |
| 판단 기록 (왜 이렇게 했나) | 옵시디언 `Grow Games/설계/` · `분석/` |
| 시뮬레이션 스크립트 | 스크래치패드 (저장소를 더럽히지 않습니다) |

`docs/superpowers/_workspace/`는 밑줄로 시작해 기존 `plans/`·`specs/`와 섞이지 않습니다.
게임 코드 폴더 밖이라 **다른 세션의 `git status`를 어지럽히지도 않아요.**

## Phase 0: 컨텍스트 확인

```bash
ls docs/superpowers/_workspace/ 2>/dev/null
```

| 상태 | 실행 모드 |
|---|---|
| `docs/superpowers/_workspace/` 없음 | **초기 실행** — Phase 1로 |
| 있음 + 부분 수정 요청 | **부분 재실행** — 해당 에이전트만 재호출. 프롬프트에 이전 산출물 경로를 넣어 "읽고 그 부분만 고치라"고 지시 |
| 있음 + 새 주제 | **새 실행** — `docs/superpowers/_workspace/`를 `docs/superpowers/_workspace_{YYYYMMDD_HHMMSS}/`로 옮기고 Phase 1 |

부분 재실행에서는 **이미 합의된 결정을 다시 열지 마세요.** 전체를 다시 쓰면
사용자가 확정한 것이 조용히 뒤집힙니다.

## Phase 1: 준비

1. **저장소 점검** (`grow-repo-ops` 30초 절차)
   ```bash
   git fetch origin && git log --oneline -5 && git status --short
   git log --oneline HEAD..origin/main
   ```
   내가 안 건드린 파일이 떠 있으면 **다른 세션이 작업 중**입니다. 그 파일은 손대지 마세요.

2. **볼트 읽기** — `/opt/data/obsidian-vault/Grow Games/`
   - `index.md` — 어디까지 왔는지
   - `받은 것/백로그 — 미룬 결정.md` — **이미 "안 하기로" 정한 것을 다시 제안하지 않으려고**
   - `받은 것/기능 아이디어.md` — 범민 님이 새로 적은 것이 있는지
   - `개념집/개념집 — {게임}.md` · 관련 `설계/`·`분석/`

3. `docs/superpowers/_workspace/` 생성, 입력 자료를 `docs/superpowers/_workspace/00_input/`에

4. **결정이 갈리는 지점은 이 단계에서 사용자에게 묻습니다.**
   게임 설계는 되돌리는 비용이 커서, 중간에 방향이 바뀌면 실측부터 다시 해야 해요.

## Phase 2: 설계 → 실측 루프

**순차 의존이라 병렬로 못 돌립니다.**

1. `Agent(subagent_type: "grow-designer", model: "opus")` — 설계 문서 작성
2. 산출물을 읽고 사용자에게 **핵심 판단 지점만** 요약 보고
3. `Agent(subagent_type: "grow-balancer", model: "opus")` — 설계의 수치를 실측
4. balancer의 판정:
   - **통과** → Phase 3
   - **계수 조정 필요** → balancer가 확정 계수를 내고 Phase 3
   - **설계 재검토 필요** → `SendMessage`로 designer를 재개해 설계를 고치고 3번으로 되돌아감
     (최대 2회. 세 번째에도 안 되면 **멈추고 사용자에게 판단 요청**)

> **designer가 정한 수치는 실측 전까지 전부 제안입니다.**
> balancer가 "이 산식으로는 목표에 못 갑니다"라고 하면 그게 맞습니다 —
> 설계자를 맞춰주려고 표본을 고르거나 조건을 좁히지 마세요.

## Phase 3: 구현 (병렬)

engineer(로직)와 director(연출)는 영역이 달라 **동시에 돌립니다.**
단일 메시지에서 두 `Agent`를 호출하세요.

```
Agent(subagent_type: "grow-engineer", model: "opus", prompt: "…설계 경로 + 확정 계수…")
Agent(subagent_type: "grow-director", model: "opus", prompt: "…설계 경로 + 화면 요구…")
```

### ⚠️ 서브 에이전트끼리는 `SendMessage`가 안 닿습니다

`Agent`로 띄운 서브 에이전트는 이름이 없고 `agentId`만 있는데, **서로의 ID를 모릅니다.**
"둘이 SendMessage로 맞추세요"라고만 지시하면 한쪽이 "이름 미해결"로 튕겨서
당신에게 합의안을 보내옵니다 (실제로 겪었습니다).

**그래서 경계면 계약은 띄우기 전에 당신이 확정해 양쪽 프롬프트에 같은 내용으로 박습니다.**

띄우기 전 체크:

1. **경계면 계약을 뽑는다** — 로직이 만드는 객체의 필드 이름·모양·전달 순서.
   designer 확정본의 director 절에 대개 이미 있습니다. 없으면 designer에게 먼저 물으세요
2. **파일 담당을 나눈다** — 같은 파일을 둘이 잡으면 충돌합니다.
   `index.html`처럼 양쪽이 만져야 하는 파일은 **줄 단위로** 쪼개세요
   (예: `<meta name="theme-color">`는 director, 스크립트 태그는 engineer)
3. **양쪽 프롬프트에 1·2를 같은 문장으로** 넣는다

**그럼에도 조율이 필요하면 당신이 중개합니다.** 한쪽이 보낸 합의안을 다른 쪽에 전달하고,
회신을 다시 돌려주세요. 에이전트들에게 "조율은 오케스트레이터를 거친다"고 미리 알리면
헛된 시도를 안 합니다.

> **왜 이게 중요한가** — 로직이 만드는 이름과 화면이 읽는 이름이 어긋나는 것은
> 한쪽만 봐서는 절대 안 보입니다. 양쪽 다 "올바르게" 구현돼 있고 연결 지점에서만 어긋나요.
> 이걸 나중에 발견하면 양쪽을 다 고쳐야 합니다.

## Phase 4: 점진 QA

**전체 완성 후 한 번이 아니라, 각 모듈이 끝날 때마다** inspector를 붙입니다.
초기 경계면 불일치가 후속 작업에 전파되면 수정 비용이 커집니다.

### 🚨 구현자와 검증자를 같은 파일 위에서 동시에 돌리지 마세요

**검증이 움직이는 표적을 잽니다.** 실제로 겪었습니다 — engineer가 `engine.js`를 고치는 동안
inspector가 그 파일로 스트레스 검사를 돌렸고, **20/20 실패**가 났습니다.
코드 결함이 아니라 소스가 그 사이에 바뀐 것이었어요.

이건 에이전트 잘못이 아니라 **오케스트레이터의 조율 실수**입니다. 지킬 것:

- 구현이 **끝난 뒤에** 검증을 띄웁니다. 병렬로 돌릴 거면 **다른 파일 위에서만**
  (예: engineer가 `engine.js`, director가 `style.css`)
- 검증 결과가 **재현되지 않거나 이상하게 나쁘면**, 먼저 `git status`와 파일 수정 시각을 보세요.
  그 다음에 코드를 의심합니다
- 부득이 겹치면 검증자에게 **"지금 X가 이 파일을 고치는 중"**이라고 알리세요.
  그러면 검증자가 원인을 코드에서 찾느라 시간을 안 씁니다

```
Agent(subagent_type: "grow-inspector", model: "opus", prompt: "…대상 모듈 + 검증 범위…")
```

inspector가 실패를 보고하면:
- 해당 에이전트를 `SendMessage`로 재개해 수정 (파일:줄번호 + 무엇이 어긋났는지 + 재현 방법)
- **경계면 이슈는 양쪽 모두에게** 알립니다. 한쪽만 고치면 반대로 어긋나요
- 수정 후 **inspector가 다시 실행해 확인**합니다. 보고만 보고 통과로 옮기지 마세요

## Phase 5: 통합 검증

```bash
node tests/smoke-test.js beta
node tests/check-page-test.js
red=0; for t in tests/*/*.js; do node "$t" >/dev/null 2>&1 || { echo "❌ $t"; red=$((red+1)); }; done; echo "실패 ${red}건"
```

**종료 코드를 보세요.** "✅ 통과"만 읽으면 스택만 뱉고 죽은 검사가 지나갑니다.

새 게임이면 **등록 지점 교차 확인**:
```bash
grep -rn "{slug}" beta/index.html stats/index.html cloud.js \
  tests/smoke-test.js tests/cloud/cloud-wire-test.js scripts/sync-beta.sh beta/_check.html
```
`cloud.js`는 **4곳 전부**에 나와야 합니다.

## Phase 6: 보고와 기록

1. **사용자에게 보고** — 반드시 세 갈래로 구분:
   - ✅ 통과 (기계가 확인함)
   - ❌ 실패 / 미완료
   - 👁️ **검증 불가 — 실기기로 봐야 하는 것** (CSS·레이아웃·색·애니메이션)

   "검증 불가"를 "통과"에 섞지 마세요. 그게 초록불 거짓말입니다.

2. **커밋** — 경로 명시. `git add -A`·`git commit -a` 금지
3. **볼트 기록** (`grow-repo-ops` 9절) — 설계/분석/백로그/기능 아이디어 갱신 후
   **마지막에 한 번만** 동기화 (on → 60초 → off)
4. `docs/superpowers/_workspace/`는 **보존합니다** (사후 검증·감사 추적용)

## 상용 배포는 이 스킬이 하지 않습니다

`promote.sh`·`release.sh`는 **사용자가 실기기로 확인한 뒤** 판단할 일입니다.
CSS를 기계가 못 보는 저장소에서 검증 없이 승격하면 안 돼요.
배포 절차가 필요하면 `grow-repo-ops`를 따르되, 승격 대상은 사용자가 지정합니다.

## 에러 핸들링

| 상황 | 전략 |
|---|---|
| 에이전트 1개 실패 | 1회 재시도. 재실패 시 **누락을 명시하고** 나머지로 진행 |
| designer ↔ balancer 루프 3회 초과 | 멈추고 사용자에게 판단 요청 (양쪽 측정값을 나란히) |
| 다른 세션이 같은 파일 작업 중 | 그 파일을 피해 진행하고, 못 피하면 **멈추고 보고** |
| 테스트 빨간불 | 테스트를 고치기 전에 **코드가 틀렸을 가능성을 먼저** 봅니다 |
| 변이 검증이 안 잡힘 | 그 테스트는 실패입니다. 통과로 세지 말고 고치세요 |
| 설계가 백로그의 "안 하기로"와 충돌 | 그 문서의 **판단이 바뀔 조건**이 충족됐는지 확인하고 근거와 함께 사용자에게 |
| 산식을 소스에서 못 뜯어옴 | 그 자리에서 멈추고 보고. 값을 손으로 옮겨 적어 진행 금지 |

## 테스트 시나리오

**정상 흐름**
1. 사용자가 "더 윙어 v2에 성장타입을 넣자"고 요청
2. Phase 1 — 볼트에서 백로그·성장 곡선 분석을 읽고, `docs/superpowers/_workspace/` 생성
3. Phase 2 — designer가 성장타입 3종 설계 → balancer가 20,000 표본으로 곡선 측정 →
   "조숙 타입이 목표보다 12%p 후함" 판정 → 계수 조정 → 통과
4. Phase 3 — engineer가 `beta/winger2/career.js`에 구현, director가 승급 카드 연출 (병렬)
5. Phase 4 — inspector가 회귀 테스트 작성 + 변이 검증 + 옛 세이브 경계면 확인
6. Phase 5 — 전체 검증, 종료 코드 확인
7. Phase 6 — 통과/실패/**실기기 확인 필요** 세 갈래 보고 + 볼트 기록

**에러 흐름**
1. Phase 2에서 balancer가 "이 산식으로는 150에서 평평해집니다" 판정
2. `SendMessage`로 designer 재개 → 축을 누적형으로 교체한 설계 수정본
3. 재실측 — 이번엔 통과
4. Phase 3에서 director의 골 연출이 `pointerdown` 안에서 화면을 갈아치우는 것을 inspector가 발견
5. 양쪽(engineer·director)에 알리고 `click`으로 옮김 → inspector 재실행해 확인
6. 최종 보고에 "골 연출 실기기 확인 필요 (셰이크 강도·감속 기기)" 명시
