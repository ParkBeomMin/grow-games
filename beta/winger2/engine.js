/* ⚽ 더 윙어 II — 점진 확정 경기 엔진
 *
 * 설계: docs/superpowers/_workspace/13_designer_v2-final.md §2 · §3 · §10
 * 계수 원본: 21_balancer_revised-engine.md §확정 계수 갱신
 *
 * ── 무엇이 달라졌나 ──
 * 현행 ⚽ 더 윙어는 경기를 **먼저 다 정하고** 그걸 중계처럼 재생했어요.
 * (splitMine · deriveOppGoals · holdConceded — 셋 다 여기서 폐기합니다.)
 * v2는 **카드마다 그 자리에서 굴려요.** 마지막 카드 전까지 스코어가 미확정이에요.
 *
 * ── 이 파일이 하는 일 ──
 *   createMatch(cfg)   내 경기 한 판 (스텝 머신 — 화면이 한 장씩 받아 갑니다)
 *   autoMatch(cfg)     NPC 클럽 대 NPC 클럽 한 판 (같은 8칸 루프, 화면 없음)
 *   shareByWeight()    스코어가 이미 정해진 클럽의 골을 STEP 3 무게로 나눠요
 *                      (도움은 pBig로 전개/결정을 사후 재구성 — autoMatch와 같은 자)
 *
 * ── 이 파일이 **안 하는** 일 ──
 * DOM을 만들지 않습니다. 전역(S · WingerSquad)을 읽지 않아요 — 전부 cfg로 받습니다.
 * 그래야 node에서 화면 없이 돌려 곡선을 잴 수 있어요(§10 시드 주입 창구).
 *
 * ⚠️ 이 파일은 winger2 전용이에요. timing.js·match.js·base.css에 넣지 마세요 —
 *    그건 8개 게임이 전부 내려받습니다.
 */
"use strict";

window.WingerEngine = (() => {
  /* ---------- 🎲 난수 — 🔒 엔진의 모든 굴림이 이 하나를 지나갑니다 ----------
   *
   * ⚠️ Math.random을 전역으로 갈아치우지 않아요. timing.js·cloud.js가 같이 영향을 받습니다.
   * ⚠️ _rng는 **바깥 스코프**에 둡니다. 함수 안에 두면 아래 return의 _t에서 안 보여요
   *    (컴백 컨셉 구현에서 정정한 자리예요 — 계획이 지목한 곳이 함수 안이었습니다). */
  let _rng = Math.random;
  const rnd = () => _rng();
  const rand = (a, b) => a + rnd() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const chance = (p) => rnd() < p;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  /* 32bit 결정론적 PRNG. 같은 시드는 같은 경기를 냅니다 —
   * 점진 확정은 매번 결과가 달라서 이게 없으면 회귀 검사가 표본 수로 버텨야 해요. */
  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 📐 확정 계수 (§3-1) ----------
   * ⚠️ 검사는 이 표에서 문턱을 읽어 오면 안 돼요. 소스에서 정규식으로 뽑거나
   *    검사에 직접 적으세요 — 상수를 바꿔도 검사가 따라가면 아무것도 안 지킵니다(§10-3). */
  const SCENE_ATK = 0.72;    // STEP 1 — 카드가 공/수 장면일 확률 (나머지는 중립 필러)
  const BIG_BASE = 0.45;     // STEP 2 — 빅찬스 기본 확률
  const FAT = 0.55;          // STEP 3 — 1/(1 + FAT × 그 경기에 그 사람이 넣은 골)
  const URG = 0.18;          // STEP 2 — 뒤지면 찬스가 늘어나요
  /* ⏱️ 마지막 카드가 1점 차 이내면 그 카드가 추가시간(90+1~5분)이 되고 결정적 장면이
   * 될 확률이 올라가요 (13번 §2-3 · 2026-08-28 판정).
   *
   * §5-5의 "1점 차일 때 카드가 하나 더"는 **안 넣습니다** — 9번째 카드는 생산량을
   * 늘려 곡선을 통째로 움직여요(N_MAX 8이 balancer가 곡선을 잡은 전제예요).
   * 카드 수를 안 늘리니 영향이 이 상수 하나로 통제됩니다.
   *
   * `urgency`는 **뒤질 때만** 걸리는데 이건 **1점 차로 앞설 때도** 걸려요.
   * 마지막 카드가 상대 공격 장면이면 🧱 수비 카드가 그대로 열리니 수비수도 이 순간을 받습니다.
   *
   * ⚠️ **1.35가 아니라 1.25입니다** (2026-08-28 확정). 1.35는 시즌 골 +3.6%로 ±3% 밴드를
   * 아슬하게 넘었어요. ±3%는 임의로 정한 게 아니라 **(라′) 중립 기준을 이어받은 것**이고
   * 그 밴드가 곧 원칙 ④의 운영 정의라, **밴드를 넓히지 않는 쪽**을 골랐습니다 —
   * 이 저장소가 데인 자리(골든부츠 43% → 60%)가 정확히 *"조금인데 뭐 어때"*였어요.
   *
   * `clutch`의 값어치는 **세기가 아니라 존재**입니다. 화면에서 느끼는 건 배수가 아니라
   * `90+3분` 표시와 타이핑 연출이에요. 1.25도 `urgency` 최대치(1.36)와 비슷한 크기라
   * 효과가 죽지 않습니다. */
  const CLUTCH = 1.25;
  const FIN = 0.884;         // STEP 4 — 자동 마무리
  const CON = 1.111;         // STEP 4 — 자동 실점. CON × defW는 1로 clamp
  const ME_P = 1.80;         // STEP 3 — 내 무게에만
  const SPOT = 4.00;         // STEP 3 — **나는 늘** 이걸 받아요 (에이스 여부와 무관 · aceOf 주석)
  /* STEP 3 — 각 클럽 에이스(내 클럽 포함)에게. **나는 후보에서 빠집니다**(aceOf 주석).
   *
   * 🔴 **카드 종류마다 값이 다릅니다.** 에이스는 `aceOf(xi, kind)`로 종류마다 따로
   * 뽑히니(골 에이스 · 도움 에이스 · 수비 에이스), 배수도 종류마다예요.
   *
   * ⚠️ **이 분할을 지우지 마세요.** 13번 §2-8b (2)가 한 번 "폐기"로 적혔다가 되살아난
   * 자리예요 — 폐기 근거였던 *"단일 2.90으로 내리는 것과 같다"*가 **요약 착오**였습니다
   * (23번 balancer 정정: 후보 D는 G만 2.90이고 A·D는 7.00이었어요).
   * 실제로 단일 2.90으로 두면 게이트 곡선이 **13.7/44.9/82.2/97.6/99.6**으로 무너집니다.
   *
   * 셋이 하는 일이 서로 달라요 —
   *   G  리그 **득점** 1위를 정합니다 → 🥇 골든부츠 문턱
   *   A  리그 **도움** 1위를 정합니다 → 🎯 플레이메이커 문턱
   *   D  리그 **차단** 1위를 정합니다 → 🛡️ 철벽상의 **타이브레이커**
   *      (무실점은 클럽 기록이라 여기 안 닿는다고 봤는데, 후보 D-1이 무실점 격차를
   *       좁히면서 **차단 타이브레이커가 실제 판정자**가 됐어요 — 10 → 1에서 8% → 29%)
   *
   * 🚨 `SPOT`은 **안 쪼갭니다.** 내 쪽을 종류별로 다르게 주면 *"내가 어느 종류의
   * 에이스냐"*로 포지션 유불리가 생겨요. 경쟁자 쪽만 쪼개면 리그 분포만 움직입니다. */
  const NPC_SPOT = { goal: 3.05, assist: 6.50, defend: 4.90 };
  /* 🔻 내 몫의 **바닥** (13번 §2-4 · 2026-08-28 판정 · inspector F3).
   *
   * SPOT은 승자독식 계단이라 세 증상이 한 원인에서 나왔어요 —
   * ① 능력치 5점에 카드 빈도 2.6배 ② 강팀으로 이적하면 카드가 1/3 ③ 능력치 70에서 검사 13번 미달.
   *
   * 그런데 그 노브에 목표가 **둘** 묶여 있습니다 —
   *   ⓐ 리그 득점 분포(골이 소수에게 몰려야 골든부츠가 성립)  ⓑ 내 조작량
   * **둘을 나눕니다.** ⓐ는 SPOT/NPC_SPOT 계단이 계속 맡고, ⓑ는 이 바닥이 맡아요.
   * 바닥은 **아래쪽에서만** 작동합니다 — 능력치 110의 몫 0.25는 안 건드리고 70의 0.06만 올려요.
   *
   * 🚨 **경쟁자에게는 절대 걸지 마세요.** 걸면 리그 득점이 다시 11명에게 흩어져
   * 골든부츠가 무너집니다 (career.js가 적어 둔 ACE_W의 원래 목적). */
  const FLOOR_SHARE = 0.12;  // 22번 확정 — 0~0.20 전 구간이 네 조건을 통과해서 안전망으로 남깁니다
  const N_MIN = 6, N_MAX = 8;
  const COND_K = 0.30;       // 컨디션 기울기
  const COND_REF = 80;       // c* — 새 커리어·시즌 리셋이 둘 다 80이에요 (§2-7, 잠정값)
  /* 🅰️ ⚽ 결정 장면의 골에 도움이 붙을 확률.
   * ⚠️ **이 값이 곧 리그 도움÷골이 아닙니다.** 🅰️ 전개 장면의 골에는 도움이 늘 붙어요 —
   * 리그 값은 `P(전개) × 1 + P(결정) × ASSIST_P2`입니다. 그래서 감도가 절반쯤이에요.
   * 0.75 → 0.48은 23번 후보 D 실측(도움÷골 0.749~0.759 · 밴드 0.70~0.80 중앙). */
  const ASSIST_P2 = 0.48;
  const GOAL_GAP = 3;        // |스코어차| 이 값 이상이면 6장에서 끊어요

  /* 📍 포지션 가중 — 이게 없으면 센터백이 스트라이커만큼 골을 넣습니다.
   * career.js:929·939 · game.js matchContribution의 D에서 **표 값만** 승계했어요. */
  const GOAL_W = { fw: 1.0, wg: 0.75, mf: 0.4, df: 0.12 };
  const ASSIST_W = { mf: 1.0, wg: 0.9, fw: 0.5, df: 0.2 };
  const DEF_W = { df: 2.3, mf: 1.2, wg: 0.5, fw: 0.45 };
  const POS_W = { goal: GOAL_W, assist: ASSIST_W, defend: DEF_W };
  const SLOT_KEY = { goal: "g", assist: "a", defend: "d" };

  /* 🧬 능력치 혼합 — **포지션마다 주 스탯이 다릅니다** (§2-4).
   * 미드필더의 S1이 패스라, 패스를 올린 만큼 전개 카드의 주인공이 될 확률이 직접 올라요.
   * 현행 splitMine의 (overall/70)^1.2는 **종합만 봐서 패스가 도움에 안 닿았습니다** —
   * 미드필더가 주 스탯을 특화하면 축이 오히려 줄어드는(×0.978) 결함의 원인이에요. */
  const BLEND = {
    fw: ["shoot", "speed", "dribble"],
    wg: ["dribble", "speed", "pass"],
    mf: ["pass", "dribble", "stamina"],
    df: ["defense", "stamina", "speed"],
  };
  const BLEND_W = [0.60, 0.25, 0.15];

  /* 🎮 카드 종류 × 포지션 → 미니게임 (§4-3).
   * 표에 없는 칸(예: 수비수의 결정 카드)은 그 종류의 대표 게임으로 떨어뜨려요 —
   * 빈도표(§5-2)를 보면 실제로 드물지만 0은 아닙니다. */
  const MINI = {
    goal: { fw: ["oneone", "cutin"], wg: ["cutin", "oneone"], mf: ["oneone"], df: ["oneone"] },
    assist: { mf: ["killpass"], wg: ["killpass", "cutin"], fw: ["killpass"], df: ["killpass"] },
    defend: { df: ["block"], mf: ["block"], wg: ["block"], fw: ["block"] },
  };

  /* ---------- 🎯 능력치 곡선과 카드 성공률 (§2-5 · §2-6) ----------
   *
   * ⚠️ **둘을 헷갈리지 마세요. 자리가 다릅니다.**
   *
   *   mid(a) / succ(a, s)  능력치 곡선. `sc(x)`가 이걸 씁니다 — 자동 확률(pFinish·pConcede)이
   *                        능력치를 타게 하는 항이에요. **카드 성공률의 중심이 아닙니다.**
   *   cardP(autoP, a, s)   카드 한 장의 사건 확률. **중심은 자동 확률**이고 succ의 폭만 씁니다.
   *
   * 2026-08-28 개정 전에는 카드의 중심도 `mid(a)`가 정했어요. 그러면 **카드 갈래와 자동
   * 갈래가 반드시 어긋납니다** — 두 곳에서 실제로 터졌습니다(🅰️ 전개 도움 4~6배 ·
   * 🧱 수비 실점이 능력치 150에서 −9.8%). 중심을 자동 확률에 넘기면 s=0.5에서
   * **모든 능력치에 대해 정의상** 같아져요.
   *
   * `mid(a)`가 남아 있는 이유: §2-5의 `sc(x) = succ(a, 0.5) / succ(70, 0.5)`가 이걸 씁니다.
   * 여기서 없애면 자동 확률이 능력치를 아예 안 타게 돼 수비수 성장 축이 죽어요
   * (§2-5의 🔒 절이 그 이유를 적어 뒀습니다). **폐기된 건 "카드의 중심" 자리뿐입니다.**
   *
   * 능력치 40 최고조작이 능력치 120 최악조작을 넘는 건 여전히 **의도한 것**이에요 —
   * 원칙 ⑥의 검증은 회당이 아니라 **커리어 20시즌 총량**으로 합니다. */
  const lerp = (x, x0, y0, x1, y1) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  function mid(a) {
    const v = Math.max(40, a);
    if (v <= 80) return lerp(v, 40, 0.35, 80, 0.49);
    if (v <= 120) return lerp(v, 80, 0.49, 120, 0.66);
    // 120 위는 상한 0.90으로 완만히 — 능력치를 계속 올려도 회당 성공률이 폭주하지 않아요
    return 0.90 - (0.90 - 0.66) * Math.exp(-(v - 120) / 60);
  }
  function half(a) {
    const v = Math.max(40, a);
    if (v <= 80) return lerp(v, 40, 0.17, 80, 0.19);
    if (v <= 120) return lerp(v, 80, 0.19, 120, 0.20);
    return 0.20;
  }
  /* 능력치 곡선 위의 값. `sc(x)`가 s=0.5로 부릅니다. */
  function succ(ability, s) {
    const m = mid(ability), h = half(ability);
    return clamp(m + 2 * h * (s - 0.5), m - h, m + h);
  }
  /* 🎯 카드 한 장의 **사건 확률** (§2-6 개정판).
   *
   *   P(사건 | 카드) = clamp(autoP(me) + 2*half(a)*(s − 0.5), 0, 1)
   *
   * **s = 0.5에서 P = autoP** — 중립이 정의상, 모든 능력치에서 성립합니다.
   * 조작이 흔드는 폭(±half)은 그대로예요.
   *
   * ⚠️ clamp에 걸리는 칸이 생기면 **중심을 옮기지 말고 half(a)를 줄이세요** —
   * 중립이 중심에 걸려 있습니다 (실측 ①-K). */
  const cardP = (autoP, ability, s) => clamp(autoP + 2 * half(ability) * (s - 0.5), 0, 1);
  /* 🔒 자동 확률도 그 장면 주인공의 능력치를 탑니다. **이건 필수예요.**
   *
   * 자동을 상수로 두면 능력치가 두 번 실려요 — 카드는 능력치를 타는데 자동은 안 타니
   * 그 차이가 통째로 새 생산량이 됩니다(능력치 150에서 도움 +44% · 차단 +84%).
   * 반대로 카드에서 능력치를 빼면 **차단에 능력치가 안 실려 수비수 성장 축이 죽어요.**
   * 현행 deriveOppGoals도 이미 ((defStat||40)−60)/CONC_DEF로 수비 능력치를 봅니다 —
   * 새 발명이 아니라 되살리는 거예요. */
  const SC_REF = mid(70);
  const sc = (ability) => mid(ability) / SC_REF;

  /* ---------- 🫀 컨디션 — 두 곳에만 겁니다 (§2-7) ----------
   * ① STEP 2 pBig — 지쳐 있으면 찬스가 덜 와요
   * ② 미니게임 판정 창 — 지쳐 있으면 판정이 좁아져요 (winger-moment.js가 씁니다)
   *
   * ⚠️ STEP 3 무게에는 **안 겁니다.** 컨디션이 낮다고 감독이 덜 쓰는 건 선발/벤치
   *    결정에서 이미 처리돼요 — 여기서 또 걸면 이중 계상입니다(§2-7).
   *    §2-4의 산식 줄에는 condMul(i)가 남아 있지만 §2-7이 그걸 명시적으로 뺐어요. */
  const condMul = (cond) =>
    (1 - (COND_K * COND_REF) / 100) + COND_K * (clamp(cond == null ? COND_REF : cond, 0, 100) / 100);

  /* ---------- 🧮 STEP 3 — 무게 ----------
   *
   * 선수 한 줄(row)의 모양:
   *   { name, pos, slot: {g,a,d}, me: bool, stats: {…}|null, str: 85, foot: 1.0 }
   * stats가 있으면 blend로, 없으면 str로 능력치를 읽어요(동료·경쟁자는 str 한 값뿐이에요).
   */

  /* 🔴 스탯 읽기는 **반드시 이 형태**입니다 (§9-2 규칙 6).
   * S.stats.speed는 나중에 추가된 스탯이에요. undefined × 0.25 = NaN → 무게가 NaN →
   * **그 선수는 영원히 순간 카드를 못 받습니다.** 소리 없이 무명이 돼요.
   * || 0 으로 채우면 안 됩니다 — 0은 종합을 끌어내려 그 선수를 갑자기 약하게 만들어요.
   * 나머지 평균으로 채우면 (합 + 평균) ÷ (n+1) = 평균이라 소수점까지 안 흔들립니다. */
  function statReader(stats) {
    const have = Object.keys(stats || {}).filter((k) => typeof stats[k] === "number" && isFinite(stats[k]));
    const avg = have.length ? have.reduce((a, k) => a + stats[k], 0) / have.length : 40;
    return (k) => (stats && typeof stats[k] === "number" && isFinite(stats[k]) ? stats[k] : avg);
  }
  function blendOf(row) {
    if (!row.stats) {
      // 동료·경쟁자는 str 한 값뿐이에요. 현행과 같은 폭(40~95)으로 읽어요.
      return clamp(row.str == null ? 70 : row.str, 40, 95);
    }
    const st = statReader(row.stats);
    const keys = BLEND[row.pos] || BLEND.mf;
    return clamp(keys.reduce((a, k, i) => a + st(k) * BLEND_W[i], 0), 40, 220);
  }
  // 능력치는 한 줄에 한 번만 재요 — 카드마다 다시 재면 8배 느리고 값도 같아요
  const abilityOf = (row) => (row._ab != null ? row._ab : (row._ab = blendOf(row)));

  /* 🌟 스포트라이트 — **나는 늘 `SPOT`, 경쟁자 클럽의 에이스는 늘 `NPC_SPOT`입니다.**
   *
   * 🚨 **둘은 배타적이지 않아요.** 에이스 후보에서 **나를 뺍니다** — 그래야 21번 §①-A-5가
   * `SPOT 4.00` · `NPC_SPOT`(당시 단일 7.00)을 잡을 때 쓴 구조와 같아집니다:
   * *"`NPC_SPOT`은 내 클럽 에이스에게도 걸려서 **나와 같은 8칸을 놓고 겨룹니다**."*
   *
   * ⚠️ 나를 후보에 넣으면 **클럽마다 에이스 한 명인 승자독식**이 되고, 내가 팀 최강을
   * 넘는 순간 나는 `SPOT × ME_P = 7.2`를 얻으면서 경쟁자의 `NPC_SPOT`이 통째로
   * 사라집니다. 그게 designer가 §2-10에서 **폐기했다고 적은 바로 그 계단**이에요 —
   * 상수 이름만 `ACE_W` → `SPOT`으로 바뀐 채 남아 있었습니다.
   * 실측: 축이 fw 75→80에서 **×2.7** · mf 80→85에서 **×3.0**으로 튀고,
   * 계단의 위치를 **동료 전력이** 정해서 이적 페널티·저연차 붕괴·위쪽 압축이 전부 거기서 났어요.
   * **계수로는 못 고칩니다** — 70을 5%에 놓으면 90이 자동으로 100%가 됩니다.
   *
   * 나를 뺀 구조에서 곡선 최대 오차가 29.1%p → **2.3%p**(역대 최소)로 내려왔습니다.
   *
   * ⚠️ `SPOT 4.00`이 `NPC_SPOT.assist`(6.50)보다 작은 게 이상해 보이지만 맞아요 —
   * 둘은 독립 노브가 아닙니다. `NPC_SPOT`은 **내 클럽 에이스에게도** 걸려서 나와 같은
   * 8칸을 놓고 겨루니, 올리면 내 생산량이 함께 깎여요. 그래서 *"경쟁자 1위를 올리는 것"*과
   * *"내 것을 깎는 것"*이 한 손잡이입니다 — 부문상은 그 **비**로 갈리고요. */
  /* 🌟 두 풀이 **일부러 겹쳐 있습니다** — `goal`에 `wg`, `assist`에 `fw`
   * (13번 §2-8b (8) · 게이트 G-7).
   *
   * 예전에는 `goal: ["fw"]` · `assist: ["mf","wg"]`로 **안 겹쳐서**, 리그에
   * *"골과 도움을 둘 다 하는 사람"*이 **구조적으로 없었어요** — 리그 1위 골 22.5 ·
   * 1위 도움 22.8인데 1위 공격P가 **29.7뿐**이라 📈 공격포인트왕이 51%로 혼자 떴습니다.
   * 두 축을 잘하는 사람이 없으니 공격P 1위 문턱이 저절로 낮았던 거예요.
   *
   * ⚠️ **풀을 통째로 합치면 안 됩니다** — 실측에서 `GOAL_W`가 낮은 mf까지 골 에이스가
   * 되어 골 축이 무너져요(골든부츠 52%). 한 자리씩만 넣습니다.
   *
   * 🔴 **"에이스가 되기 어렵다"가 근거가 아닙니다.** `aceOf`는 능력치 최대 한 명을
   * 그냥 고르고 `GOAL_W`·`ASSIST_W`를 **보지 않아요.** fw 2 · wg 2 · mf 4니 에이스
   * 자리는 대체로 반반입니다. 축을 지키는 건 **에이스가 아닌 나머지의 무게 합**이에요 —
   *
   *   🅰️ 도움 축(에이스 배수 `NPC_SPOT.assist` · `ASSIST_W` mf 1.0 · wg 0.9 · fw 0.5)
   *     에이스가 mf면 — mf 넷 `1.0×6.50 + 1.0×3` = **9.50**  vs  fw 둘 **1.00**
   *     에이스가 fw면 — mf 넷 **4.00**  vs  fw 둘 `0.5×6.50 + 0.5` = **3.75**
   *   어느 쪽이 에이스든 mf가 앞섭니다. `ASSIST_W`가 두 배인 데다 **머릿수가 넷 대 둘**이라
   *   골 풀(fw 2 : wg 2)보다 여유가 큽니다.
   *
   * ⚠️ 이 풀을 건드리면 **`NPC_SPOT_A`·`ASSIST_P2`·`AXIS_OFF`가 따라 움직여요.**
   *   위 무게 합에 에이스 배수가 그대로 들어가 있는 게 보이시죠 — 한 벌입니다. */
  const ACE_POOL = { goal: ["fw", "wg"], assist: ["mf", "wg", "fw"], defend: ["df"] };
  function aceOf(xi, kind) {
    const want = ACE_POOL[kind] || [];
    const pool = xi.filter((x) => want.indexOf(x.pos) >= 0 && !x.me);
    const list = pool.length ? pool : xi.filter((x) => !x.me);
    if (!list.length) return null;
    return list.reduce((a, b) => (abilityOf(a) >= abilityOf(b) ? a : b), list[0]);
  }

  /* w(i) — 이 장면의 주인공이 될 무게.
   * 골·도움·차단 셋 다 **이 하나의 식**을 지나갑니다. 현행에서 c.def만 splitMine을
   * 안 타서 수비수가 자기 축을 통째로 가져가던 결함이 여기서 구조적으로 사라져요. */
  function weightOf(row, kind, ace, hits) {
    const posw = (POS_W[kind] || GOAL_W)[row.pos];
    const slot = row.slot || {};
    const sk = SLOT_KEY[kind] || "g";
    const goals = (hits && hits.get(row)) || 0;
    return (posw == null ? 0.4 : posw)
      * (slot[sk] || 1)
      * (abilityOf(row) / 70)
      /* 🦶 약발 배수는 **골·도움에만** 붙어요 — 반대발로 차야 하는 상황에서 갈리니까요.
       * 태클에 발이 갈리지는 않습니다(현행 matchContribution과 같은 규칙). */
      * (kind === "defend" || row.foot == null ? 1 : row.foot)
      /* 🎖️ 시즌 칭호·🎉 피버 버프 (13번 §2-7b). 개념집이 *"효과가 붙는 자리는 전부
       * 경기 안"*이라고 적어 둔 그 자리예요 — 여기 없으면 칭호 여덟 개의 g·a·d가
       * **리그 38라운드에서 통째로 죽습니다**(닿는 건 🏆 컵뿐이었어요).
       *
       * 🚨 **나에게만 붙습니다.** 부르는 쪽(engRow)이 내 줄에만 buff를 실어 줘요 —
       * 칭호는 내 커리어가 쌓은 것이고 NPC에게는 그 개념이 없습니다.
       * ⚠️ 엔진은 전역(S·buffMul)을 안 읽어요(§10-3b). **이미 곱해진 수**로 받습니다. */
      * ((row.buff && row.buff[sk]) || 1)
      /* 🥵 fatigue — **그 경기에 그 사람이 넣은 골만** 셉니다.
       * 도움까지 세면 전개 카드가 결정 카드를 −4% 잡아먹어요.
       * STEP 2가 아니라 여기 있는 이유: pBig는 장면의 속성이고 이건 사람의 속성이라,
       * 경쟁자 11명을 함께 굴릴 때 STEP 2에서는 정의가 안 됩니다(주인공을 아직 모르니까요). */
      * (1 / (1 + FAT * goals))
      /* 🌟 경쟁자 에이스는 늘 NPC_SPOT[카드 종류] · 나는 늘 SPOT
       * (배타적이지 않아요 — aceOf 주석 참고. ace 자체가 kind마다 다른 사람입니다).
       * ⚠️ ME_P는 **평평한 배수**로 둡니다(`(blend/70) × 1.8`). 21번 모델은 지수였지만
       * 지수로 두면 능력치 130에서 95.0%로 목표(85%)를 10%p 넘어요 —
       * 설계 §2-4가 적은 형태(평평한 배수)가 실측에서도 더 좋습니다. */
      * (row === ace ? (NPC_SPOT[kind] || NPC_SPOT.goal) : 1)
      * (row.me ? ME_P * SPOT : 1);
  }
  /* floor — **내 무게에만** 바닥을 깝니다(FLOOR_SHARE). 경쟁자 루프에서는 절대 켜지 마세요. */
  function pickActor(xi, kind, hits, floor) {
    const ace = aceOf(xi, kind);
    let tot = 0;
    const ws = xi.map((x) => { const w = Math.max(0, weightOf(x, kind, ace, hits)); tot += w; return w; });
    if (floor && tot > 0) {
      const i = xi.findIndex((x) => x.me);
      const want = FLOOR_SHARE * tot;
      if (i >= 0 && ws[i] < want) { tot += want - ws[i]; ws[i] = want; }
    }
    if (!(tot > 0)) return { who: xi[0] || null, share: 1 };
    let t = rnd() * tot;
    for (let i = 0; i < xi.length; i++) { t -= ws[i]; if (t <= 0) return { who: xi[i], share: ws[i] / tot }; }
    return { who: xi[xi.length - 1], share: ws[ws.length - 1] / tot };
  }
  /* 🗑️ assistShare(내 도움 몫 = w_a(me)/Σw_a(i))는 폐기했어요 (2026-08-28 판정).
   * 전개 장면은 **이미 주인공을 뽑은 뒤**라 몫을 또 곱하면 지명을 두 번 셉니다. */

  /* ---------- 🏷️ 무엇이 걸렸나 (§5-1) ----------
   * 같은 미니게임이 결정에도 전개에도 열리므로, 화면 첫 줄이 이걸 밝혀야 해요.
   * ko는 화면 문구 · key는 화면이 문자열 비교를 안 하게 두는 코드예요. */
  function stakeOf(kind, us, them) {
    const d = us - them;
    if (kind === "goal" || kind === "assist") {
      if (d <= -2) return { key: "comeback", ko: "만회" };
      if (d === -1) return { key: "equalize", ko: "동점" };
      if (d === 0) return { key: "lead", ko: "리드" };
      return { key: "clincher", ko: "쐐기" };
    }
    if (kind === "defend") {
      if (d >= 2) return { key: "holdBig", ko: "추격 저지" };
      if (d === 1) return { key: "holdLead", ko: "동점 저지" };
      if (d === 0) return { key: "holdDraw", ko: "실점 저지" };
      return { key: "holdGap", ko: "추가 실점 저지" };
    }
    return null;
  }

  const FILLER = [
    "중원 싸움이 뜨거워요",
    "빠른 템포로 공이 오갑니다",
    "양 팀 압박이 매섭습니다",
    "관중석이 들썩여요",
    "측면에서 계속 기회를 노려요",
    "잠시 숨을 고르는 시간이에요",
  ];

  /* ---------- 🎬 카드 한 장 ----------
   * 화면(W2Scene)이 읽는 필드는 director와 맞춘 이름이에요. 바꾸려면 양쪽을 같이 고치세요. */
  function blankCard(k, n, min, kind) {
    return {
      k, n, min, kind,
      mine: false, moment: null, big: false, clutch: false,
      stake: null, stakeKey: null,
      result: "none", by: null, pos: null,
      goalBy: null, assistBy: null,
      judge: null,
      credit: { g: 0, a: 0, d: 0 },
      score: [0, 0],
      decisive: false, goAhead: false,
      text: "",
    };
  }

  /* 카드가 놓일 분(') — 결과와 무관해서 미리 정해 둡니다. 단조증가를 지켜요. */
  function minutesFor(n) {
    const out = [];
    let last = 0;
    for (let k = 1; k <= n; k++) {
      const base = Math.round((90 * k) / (n + 1));
      const m = clamp(Math.round(base + rand(-3, 3)), last + 1, 89);
      out.push(m);
      last = m;
    }
    return out;
  }

  /* ---------- ⚙️ 한 장면을 푸는 공통 로직 ----------
   * 내 경기(createMatch)와 NPC 경기(autoMatch)가 **같은 함수**를 지나갑니다.
   * 그래야 "나와 경쟁자의 유일한 차이는 미니게임을 실제로 하느냐"가 문자 그대로 참이 돼요. */

  // STEP 1 — 이 장면의 주인은 누구인가. ⚠️ 스코어를 보지 않습니다 (§2-2 · §5-3)
  function sceneOf(atkW, defW) {
    const s = atkW + defW;
    const pA = s > 0 ? (SCENE_ATK * atkW) / s : SCENE_ATK / 2;
    const pD = s > 0 ? (SCENE_ATK * defW) / s : SCENE_ATK / 2;
    const r = rnd();
    if (r < pA) return "atk";
    if (r < pA + pD) return "def";
    return "neu";
  }
  // 마지막 카드 · 1점 차 이내면 추가시간이에요
  const isClutch = (k, n, diff) => k === n && Math.abs(diff) <= 1;
  // STEP 2 — 결정적 장면(빅찬스)인가. 우리 공격 장면일 때만 굴려요
  function isBig(atkW, k, n, behind, cond, clutchOn) {
    const edge = atkW / 0.5;
    const urgency = 1 + URG * Math.max(0, behind) * (k / n);
    return chance(clamp(BIG_BASE * edge * urgency * (clutchOn ? CLUTCH : 1) * condMul(cond), 0, 1));
  }
  // STEP 4 — 자동 마무리 / 자동 실점
  const pFinish = (atkW, ability) => clamp(FIN * atkW * sc(ability), 0, 1);
  const pConcede = (defW, ability) => {
    const base = Math.min(1, CON * defW);   // ⚠️ CON × defW를 1로 clamp
    return clamp(1 - (1 - base) * sc(ability), 0, 1);
  };

  /* 카드 사건 확률 → 판정 셋 (§2-6 개정판의 표).
   *
   * | 판정 | ⚽ 결정 | 🅰️ 전개 | 🧱 수비 |
   * | perfect | 내 골 | 동료 골 + 내 도움 | 실점 안 함 |
   * | ok      | 슛 시도(기록 없음) | **무위** | 실점 안 함 |
   * | miss    | 무위 | 무위 | **실점** |
   *
   * 🔴 🅰️ 전개의 `ok`가 **골을 주면 안 됩니다.** 자동 갈래에서 *골*과 *내 도움*은
   *    같은 사건이라, ok가 골을 주면 도움 중립은 맞아도 **골 중립이 깨져요.**
   * 🧱 수비는 P(사건)이 **막을 확률**이에요 — 중립이 걸리는 자리가 `miss`(실점)입니다.
   *    막으면 perfect로 둡니다(읽기 게임이라 맞히거나 못 맞히거나예요).
   * ⚽ 결정의 ok/miss는 둘 다 기록이 안 남아 **배분이 연출 몫**이라 반씩 나눕니다. */
  function outcome(kind, p) {
    const r = rnd();
    if (kind === "defend") return r < p ? "perfect" : "miss";
    if (r < p) return "perfect";
    return r < p + (1 - p) / 2 ? "ok" : "miss";
  }

  /* 🎯 조작 성공도 s(0~1) → 판정 — **중심(autoP)은 부르는 쪽이 줍니다.**
   *
   *     P(사건 | 카드) = clamp( autoP + 2*half(a)*(s − 0.5), 0, 1 )
   *
   * 산식이 사는 자리는 **여기 한 곳뿐**이에요. 프로 경기는 createMatch가 그 경기의
   * 전력·능력치에서 autoP를 뽑아 부르고(judgeAt), ⚔️ 유스 평가전은 유스의 중심 확률로
   * 부릅니다(game.js). 사본을 두면 두 갈래가 조용히 어긋나요 —
   * §2-6이 고친 게 정확히 그 사고(🅰️ 전개 도움 4~6배 · 🧱 수비 실점 −9.8%)입니다. */
  const judgeAtP = (kind, autoP, ability, s) => outcome(kind, cardP(autoP, ability, clamp(s, 0, 1)));

  /* ---------- 🎮 미니게임 창구 ----------
   * fn(container, opts, cb) → cb("perfect" | "ok" | "miss"). timing.js와 같은 모양이에요.
   * 아직 winger-moment.js가 없으면 null이고, 그때는 자동 판정으로 돕니다. */
  let _mini = null;
  const setMini = (fn) => { _mini = typeof fn === "function" ? fn : null; };
  const getMini = () => _mini;
  /* null이면 실제 조작 · 0~1이면 succ(ability, skill)로 자동 판정 (balancer·inspector용) */
  let _skill = null;

  /* ---------- 🏟️ 내 경기 — 스텝 머신 ----------
   *
   * const m = WingerEngine.createMatch(cfg);
   * let c;  while ((c = m.next())) { … c.mine이면 미니게임 뒤 m.resolve(판정) … }
   *
   * next()는 자동 카드면 **확정된 채로**, 내 카드면 **미확정(judge:null)으로** 돌려줍니다.
   * 내 카드에서 resolve() 전에 next()를 또 부르면 예외를 던져요 — 조용히 어긋나면
   * "화면과 판정이 서로 다른 것을 본다"가 되고, 그게 이 저장소의 단골 사고예요.
   *
   * cfg = { xi, oppName, teamStr, oppStr, condition }
   *   xi — 우리 선발 11명 (내 줄은 me:true). 상대 선수는 이름을 안 씁니다.
   */
  function createMatch(cfg) {
    const c = cfg || {};
    const xi = (c.xi || []).slice();
    const me = xi.find((x) => x.me) || null;
    for (const x of xi) x._ab = null;          // 능력치 캐시는 경기마다 새로
    const us0 = c.teamStr == null ? 70 : c.teamStr;
    const them0 = c.oppStr == null ? us0 : c.oppStr;
    /* 전력만 봐요 — 내 능력치는 STEP 3(pMe)과 sc()에 이미 실려 있어요.
     * 여기에 또 얹으면 이중 계상입니다. */
    const atkW = us0 / (us0 + them0);
    const defW = them0 / (them0 + us0);
    const cond = c.condition;

    let n = randInt(N_MIN, N_MAX);
    const mins = minutesFor(n);
    const hits = new Map();                    // 그 경기에 각자 넣은 골 (fatigue용)
    const cards = [];
    let k = 0, us = 0, them = 0, lastMin = 90;
    let pending = null, halfDone = false, kicked = false, ended = false;
    let mineCards = 0, mineSuccess = 0;
    const moments = { g: { t: 0, p: 0 }, a: { t: 0, p: 0 }, d: { t: 0, p: 0 } };

    /* 이 경기에 누가 무엇을 했나 — **줄 객체를 열쇠로** 씁니다.
     * 이름으로 모으면 동명이인이 한 사람이 돼요(명단은 이름을 안 가려요). */
    const led = new Map();
    function credit(row, key) {
      if (!row) return;
      const c0 = led.get(row) || { g: 0, a: 0, d: 0 };
      c0[key] += 1;
      led.set(row, c0);
    }
    const bump = (row) => hits.set(row, ((hits.get(row) || 0) + 1));
    const nameOf = (row) => (row ? row.name : null);

    function finishCard(card) {
      card.score = [us, them];
      card.stake = card.stake || null;
      cards.push(card);
      /* |스코어차| ≥ 3이면 6장에서 끊어요 — 이미 끝난 경기예요.
       * 이미 6장을 넘겼으면 지금 카드에서 끊습니다. */
      if (Math.abs(us - them) >= GOAL_GAP) n = Math.min(n, Math.max(N_MIN, card.k));
      return card;
    }

    // 우리 공격 장면이 골로 이어졌을 때 — 넣은 사람과 도움을 정합니다
    function scoreGoal(card, scorer, assister) {
      us += 1;
      bump(scorer);
      credit(scorer, "g");
      if (assister) credit(assister, "a");
      card.goalBy = nameOf(scorer);
      card.assistBy = nameOf(assister);
      if (scorer && scorer.me) card.credit.g = 1;
      if (assister && assister.me) card.credit.a = 1;
      card.goAhead = us === them + 1;
    }

    /* 🅰️ 도움이 기록되는 두 경로 — **장면의 성격이 다릅니다** (§2-5).
     *
     *   🅰️ 전개 장면 = "찬스를 **만드는**" 장면 → 성공하면 **주인공에게 항상** 도움
     *   ⚽ 결정 장면 = "넣는" 장면            → 골이 나면 ASSIST_P2 확률로 `a` 무게 지명
     *
     * 🔴 전개 장면에 ASSIST_P2 × 몫을 곱하면 안 됩니다. 그건 "동료가 넣은 골에 내가
     * 어시스트로 붙을 확률"인데, 전개 장면은 **이미 내가 만드는 사람으로 뽑힌 뒤**예요 —
     * 몫을 또 곱하면 주인공 지명을 두 번 셉니다(카드/자동이 4~6배 어긋났던 원인). */
    const nameAssister = (scorer) => {
      if (!chance(ASSIST_P2)) return null;
      const rest = xi.filter((x) => x !== scorer);
      return rest.length ? pickActor(rest, "assist", hits).who : null;
    };
    function autoAttack(card, kind, who) {
      if (!chance(pFinish(atkW, abilityOf(who)))) { card.result = "none"; card.judge = "miss"; return; }
      card.judge = "perfect";
      let scorer = who, assister = null;
      if (kind === "goal") {
        assister = nameAssister(who);                 // 주인공이 넣고, 도움자를 따로 지명해요
      } else {
        /* 주인공은 **만드는 사람**이에요 — 마무리는 `g` 무게로 다른 사람이 합니다.
         *
         * ⚠️ **나는 마무리 후보에서 뺍니다.** 넣으면 내가 **카드를 한 장도 안 열고**
         * 골을 얻어요 — 능력치 130 공격수에서 시즌 +14.8골이 그렇게 새어 나갔습니다.
         * ⚽ 결정 장면에서 동료가 주인공이면 내가 절대 못 넣는 것과 같은 규칙이에요.
         * (도움은 다릅니다 — §2-5가 "득점자 제외"라고 명시해서 나도 지명 대상입니다.) */
        const rest = xi.filter((x) => x !== who && !x.me);
        scorer = rest.length ? pickActor(rest, "goal", hits).who : who;
        assister = scorer === who ? null : who;
      }
      scoreGoal(card, scorer, assister);
      card.result = assister && assister.me ? "assist" : "goal";
    }

    function autoDefend(card, who) {
      if (chance(pConcede(defW, abilityOf(who)))) {
        them += 1;
        card.result = "concede"; card.judge = "miss";
      } else {
        card.result = "save"; card.judge = "perfect";
        credit(who, "d");
        if (who && who.me) card.credit.d = 1;
      }
    }

    function openMine(card, kind) {
      card.mine = true;
      mineCards += 1;
      const pool = (MINI[kind] || {})[card.pos] || (MINI[kind] || {}).mf || ["oneone"];
      card.moment = pool[Math.floor(rnd() * pool.length)];
      pending = { card, kind };
      return card;
    }

    /* 내 카드의 판정을 넣습니다. 화면이 미니게임을 돌린 뒤 부르거나,
     * 미니게임이 아직 없으면 next()가 자동 판정으로 스스로 부릅니다. */
    function resolve(judge) {
      if (!pending) throw new Error("resolve(): 지금은 판정을 기다리는 카드가 없어요");
      const { card, kind } = pending;
      pending = null;
      const j = judge === "perfect" || judge === "ok" || judge === "miss" ? judge : "miss";
      card.judge = j;
      const slot = kind === "goal" ? moments.g : kind === "assist" ? moments.a : moments.d;
      slot.t += 1;
      if (j === "perfect") { slot.p += 1; mineSuccess += 1; }

      if (kind === "goal") {
        // perfect → 내 골 · ok → 슛 시도(기록 없음) · miss → 무위
        // 내 골에도 동료 도움이 붙어요 — 자동 갈래와 같은 규칙이라야 리그 도움÷골이 섭니다
        if (j === "perfect") { scoreGoal(card, me, nameAssister(me)); card.result = "goal"; }
        else card.result = j === "ok" ? "shot" : "none";
      } else if (kind === "assist") {
        /* perfect → 동료 골 + 내 도움 · ok·miss → **둘 다 무위** (연출만 달라요).
         * 🔴 ok가 골을 주면 안 됩니다 — 자동 갈래에서 골과 내 도움은 **같은 사건**이라
         * ok가 골을 주면 도움 중립은 맞아도 골 중립이 깨져요 (§2-6 개정판). */
        if (j !== "perfect") card.result = "none";
        else {
          const mates = xi.filter((x) => x !== me);
          const who = mates.length ? pickActor(mates, "goal", hits).who : me;
          scoreGoal(card, who, me);
          card.result = "assist";
        }
      } else {
        // perfect·ok → 실점 안 함 · miss → 실점
        if (j === "miss") { them += 1; card.result = "concede"; }
        else { card.result = "save"; credit(me, "d"); card.credit.d = 1; }
      }
      return finishCard(card);
    }

    /* 🎯 조작 성공도 s(0~1) → 이 카드의 판정 (§2-6).
     *
     *   P(사건 | 카드) = clamp(autoP(me) + 2*half(a)*(s − 0.5), 0, 1)
     *
     * **미니게임이 내는 것은 s 하나뿐이고, 확률로 옮기는 일은 여기서 합니다.**
     * autoP는 그 경기의 전력(atkW·defW)과 내 능력치에서 나오는 값이라 미니게임이
     * 알 수가 없어요. 미니게임이 제 손으로 판정을 만들면 **카드 갈래가 자동 갈래와
     * 어긋납니다** — §2-6 개정이 고친 바로 그 자리예요. */
    function judgeAt(kind, s) {
      const ab = abilityOf(me);
      // 🧱 수비의 autoP는 **막을 확률**이에요 (중립이 걸리는 자리가 실점이라서요)
      const autoP = kind === "defend" ? 1 - pConcede(defW, ab) : pFinish(atkW, ab);
      return judgeAtP(kind, autoP, ab, s);
    }

    /* 미니게임이 아직 안 붙었거나 _t.skill이 켜져 있을 때의 자동 판정.
     * 화면이 setMini로 진짜 미니게임을 끼워 넣으면 이 갈래는 안 지나갑니다. */
    const autoJudge = (kind) => judgeAt(kind, _skill == null ? 0.5 : _skill);

    function build() {
      k += 1;
      /* ⏱️ 마지막 카드가 1점 차 이내면 **추가시간**이에요 — 분도 90+1~5로 바뀝니다.
       * 카드를 하나 더 만들지 않고 이 카드의 무게만 올려요(§2-3). */
      const clutchOn = isClutch(k, n, us - them);
      const card = blankCard(k, n, clutchOn ? 90 + randInt(1, 5) : mins[k - 1], "filler");
      card.clutch = clutchOn;
      if (clutchOn) lastMin = card.min;
      const scene = sceneOf(atkW, defW);
      if (scene === "neu") {
        card.text = FILLER[Math.floor(rnd() * FILLER.length)];
        return finishCard(card);
      }
      /* 🏷️ 무엇이 걸렸나는 **카드를 풀기 전** 스코어로 잽니다.
       * 푼 뒤에 재면 "이걸 넣으면 동점입니다"가 이미 넣은 뒤의 스코어를 보게 돼요 —
       * 지금은 화면이 auto 카드의 stake를 안 쓰지만, 쓰기 시작하는 순간 거짓말이 됩니다. */
      if (scene === "atk") {
        const big = isBig(atkW, k, n, them - us, cond, clutchOn);
        const kind = big ? "goal" : "assist";
        card.kind = kind; card.big = big;
        const sa = stakeOf(kind, us, them);
        if (sa) { card.stake = sa.ko; card.stakeKey = sa.key; }
        const { who } = pickActor(xi, kind, hits, true);   // ← 내 몫에만 바닥
        card.by = nameOf(who); card.pos = who ? who.pos : null;
        if (who && who.me) return openMine(card, kind);
        autoAttack(card, kind, who);
        return finishCard(card);
      }
      card.kind = "defend";
      const sd = stakeOf("defend", us, them);
      if (sd) { card.stake = sd.ko; card.stakeKey = sd.key; }
      const { who } = pickActor(xi, "defend", hits, true);   // ← 내 몫에만 바닥
      card.by = nameOf(who); card.pos = who ? who.pos : null;
      if (who && who.me) return openMine(card, "defend");
      autoDefend(card, who);
      return finishCard(card);
    }

    function next() {
      if (pending) throw new Error("next(): 앞 카드의 판정(resolve)이 아직 안 들어왔어요");
      if (ended) return null;
      if (!kicked) {
        kicked = true;
        const c0 = blankCard(0, n, 0, "kick");
        c0.text = `${c.oppName || "상대"}와의 경기가 시작됩니다`;
        return finishCard(c0);
      }
      // 🥅 하프타임 — 45분을 넘기는 첫 카드 앞에 한 장
      if (!halfDone && (k >= n || mins[k] > 45)) {
        halfDone = true;
        const h = blankCard(k, n, 45, "half");
        h.text = "하프타임";
        h.score = [us, them];
        cards.push(h);
        return h;
      }
      if (k >= n) {
        ended = true;
        // 종료 휘슬은 마지막 카드보다 앞설 수 없어요 (추가시간 카드가 90+n이라)
        const e = blankCard(k, n, Math.max(90, lastMin), "end");
        e.text = "삐— 경기 종료 휘슬";
        e.score = [us, them];
        markDecisive();
        cards.push(e);
        return e;
      }
      const card = build();
      /* _t.skill이 켜져 있으면(balancer·inspector) 여기서 바로 자동 판정해요.
       * 실제 플레이에서는 미니게임을 열지 말지를 **화면 쪽 드라이버가** 정합니다 —
       * 엔진이 정하면 미니게임이 붙는 날 엔진도 같이 고쳐야 해요. */
      if (pending && _skill != null) resolve(autoJudge(pending.kind));
      return card;
    }

    /* 🏆 결승골 — 경기가 끝나야 알 수 있어요.
     * 카드가 열릴 때는 goAhead(그 순간 앞서 나간 골)만 참이고, decisive는 여기서 채웁니다.
     * 화면이 카드 시점에 축포를 터뜨리면 나중에 동점이 됐을 때 이미 터진 뒤라,
     * 결승골 연출은 end 카드에서 해요.
     *
     * ⚠️ 정의는 축구 그대로 — **이긴 팀의 (진 팀 최종 점수 + 1)번째 골**이에요.
     * 예전에는 스코어를 훑으며 `lead === 1`인 카드를 잡았는데 그 조건을 **실점 카드도
     * 만족**해서, 진 경기에서 내 골에 결승골이 붙었어요
     * (판정 930경기 중 186건 어긋남 · 진 경기 축포 3.9% · 이긴 경기 5.4%는 조용함). */
    function markDecisive() {
      if (us === them) return;
      const weWon = us > them;
      const need = (weWon ? them : us) + 1;      // 진 팀 최종 점수 + 1
      let n0 = 0;
      for (const cd of cards) {
        const ours = cd.result === "goal" || cd.result === "assist";
        const theirs = cd.result === "concede";
        if (weWon ? ours : theirs) { n0 += 1; if (n0 === need) { cd.decisive = true; return; } }
      }
    }

    function result() {
      const my = (me && led.get(me)) || { g: 0, a: 0, d: 0 };
      /* 동료 기록은 **줄 객체와 함께** 돌려줘요. 이름으로 넘기면 동명이인이 한 사람이
       * 되고, 부르는 쪽이 명단에서 다시 찾느라 한 번 더 어긋날 자리가 생깁니다. */
      const mates = [];
      for (const [row, v] of led) if (row !== me) mates.push({ row, g: v.g, a: v.a, d: v.d });
      return {
        myGoals: my.g, assists: my.a, defense: my.d,
        /* 결과 요약이 `${info.home} 2 : 1 ${info.away}`로 그려요 —
         * 없으면 화면에 "undefined 2 : 1 undefined"가 뜹니다. */
        home: c.homeName || "우리 팀", away: c.oppName || "상대",
        teamGoals: us, oppGoals: them,
        res: us > them ? "W" : us < them ? "L" : "D",
        mineCards, mineSuccess, moments, mates, cards,
        /* 우리 공격이 무산된 장면 수 — **상대 수비수가 막아낸 것**이에요.
         * 상대 클럽 선수의 차단 기록이 여기서 나옵니다(부르는 쪽이 나눠 줘요). */
        oppStops: cards.filter((cd) => (cd.kind === "goal" || cd.kind === "assist")
          && (cd.result === "none" || cd.result === "shot")).length,
        decisive: (cards.find((cd) => cd.decisive) || {}).goalBy || null,
      };
    }

    return {
      next, resolve, result, cards,
      /* 미니게임이 아직 안 붙은 카드를 자동으로 판정할 때 쓰는 값이에요.
       * 드라이버가 m.resolve(m.autoJudge())로 부릅니다. */
      autoJudge: () => (pending ? autoJudge(pending.kind) : "miss"),
      /* 🎮 미니게임이 낸 조작 성공도 s(0~1)를 지금 열린 카드의 판정으로 옮겨요.
       * 화면은 `m.resolve(m.judgeFor(s))`로 부릅니다. */
      judgeFor: (s) => (pending ? judgeAt(pending.kind, s) : "miss"),
      get pendingKind() { return pending ? pending.kind : null; },
      get n() { return n; },
      get score() { return [us, them]; },
      get pending() { return pending ? pending.card : null; },
    };
  }

  /* ---------- 🥇 경쟁자도 같은 8칸 루프를 돕니다 (§2-9) ----------
   * 닫힌 형태 λ 근사는 폐기했어요 — 능력치가 높을수록 평균 −9.4% · 분산 0.66까지
   * 어긋났습니다. 리그 6팀 × 선발 11명 = 66명이 같은 루프를 돌아요.
   * 라운드당 24회 · 시즌 912회라 브라우저에서 사실상 0이에요.
   *
   * 두 클럽을 **한 경기 안에서 마주 세웁니다.** A의 공격 장면에서는 A가 골을 노리고,
   * A의 수비 장면에서는 B가 노리되 **A의 수비수가 그 장면을 맡아요** — 그래야 수비
   * 기록이 쌓입니다. 내 경기와 같은 산식이에요.
   *
   * 돌려주는 것: { gf, ga, goals: [{scorer, assister}…], defense: Map(row → 차단 수) } */
  function autoMatch(cfg) {
    const c = cfg || {};
    const A = (c.xiA || []).slice(), B = (c.xiB || []).slice();
    for (const x of A) x._ab = null;
    for (const x of B) x._ab = null;
    const sA = c.strA == null ? 70 : c.strA, sB = c.strB == null ? 70 : c.strB;
    const atkW = sA / (sA + sB), defW = sB / (sA + sB);
    let n = randInt(N_MIN, N_MAX);
    const hitsA = new Map(), hitsB = new Map();
    const goalsA = [], goalsB = [];
    const defA = new Map(), defB = new Map();
    let ga = 0, gb = 0;

    /* ⚠️ 수비 쪽 무게(defW)는 **일부러 안 받습니다.** 한 장면에 굴림은 하나라
     * 여기서 쓸 데가 없어요 — 인자로 남겨 두면 `pf * pc`가 되돌아오는 길이 열립니다. */
    const oneWay = (xi, other, hits, hitsO, aw, k, behind, goals, defOther, clutchOn) => {
      const big = isBig(aw, k, n, behind, null, clutchOn);
      const kind = big ? "goal" : "assist";
      const { who } = pickActor(xi, kind, hits);
      if (!who) return 0;
      // 수비 장면은 상대 쪽에서 한 명이 맡아요 — 차단 기록이 그쪽에 쌓입니다
      const guard = other.length ? pickActor(other, "defend", hitsO).who : null;
      const pf = pFinish(aw, abilityOf(who));
      /* 🔴 **한 장면에 굴림은 하나입니다** (§2-5 STEP 4 · §2-10의 네 번째 냄새).
       *
       * 예전에는 `chance(pf * pc)`였어요 — 바로 위 주석이 *"두 번 굴리면 골이 반으로
       * 줄어요"*라고 막으려던 그 일을 **코드가 하고 있었습니다.** `createMatch`는
       * 칸마다 우리 팀에서 한 명만 봐요: 우리 공격 칸이면 `pFinish` 하나, 상대 공격
       * 칸이면 `pConcede` 하나. 곱이 되는 형태는 설계 어디에도 없습니다.
       *
       * 증거 — 리그 6팀 무실점이 `18.6 / 18.1 / 18.4 / [10.8] / 17.7 / 17.4`
       * (대괄호가 내 클럽)이었고, 무실점률이 createMatch 22.6% vs autoMatch 52.5%였어요.
       * **내 클럽만 다른 산식으로 실점**하고 있었습니다.
       *
       * ⚠️ 이 형태가 남기는 비대칭 — **경쟁자 수비수의 개인 능력치는 여기 안 실립니다.**
       * 경쟁자 클럽의 무실점은 클럽 전력만 가르고, 내 클럽은 거기에 내 수비 카드가
       * 더해져요. designer가 **명시하고 2차로 넘긴** 자리예요(칸마다 관점을 굴리는 형태).
       * `guard`는 그대로 뽑습니다 — 막아낸 장면의 🧱 차단 기록이 거기서 나와요. */
      if (chance(pf)) {
        /* 🅰️ 장면의 성격은 **카드 갈래(createMatch.autoAttack)와 똑같이** 읽어요 (§2-5).
         *
         *   🅰️ 전개 장면 = 찬스를 **만드는** 장면 → 주인공은 **도움**, 마무리는 `g` 무게로 따로
         *   ⚽ 결정 장면 = 넣는 장면            → 주인공이 넣고 도움자를 ASSIST_P2로 지명
         *
         * 🔴 예전에는 전개 장면에서도 주인공을 **득점자**로 넣었어요. 나와 경쟁자가
         * 다른 규칙을 쓰면 리그 도움이 통째로 비어서, 내가 가만히 있어도 🎯 플레이메이커가
         * 들어옵니다 — §2-9·§2-10이 없애려던 바로 그 병이에요.
         *
         * ⚠️ createMatch는 마무리 후보에서 **나**를 빼지만(카드를 안 열고 골을 얻어서),
         * 이 루프에는 내가 없으니 그 조건이 필요 없어요. */
        let scorer = who, assister = null;
        if (kind === "goal") {
          if (chance(ASSIST_P2)) {
            const mates = xi.filter((x) => x !== who);
            if (mates.length) assister = pickActor(mates, "assist", hits).who;
          }
        } else {
          const rest = xi.filter((x) => x !== who);
          scorer = rest.length ? pickActor(rest, "goal", hits).who : who;
          assister = scorer === who ? null : who;
        }
        /* 🥵 fatigue는 **넣은 사람**에게 쌓여요 — createMatch의 bump(scorer)와 같은 자리예요.
         * 지명이 다 끝난 뒤에 올립니다(먼저 올리면 같은 장면의 지명이 자기 피로를 봐요). */
        hits.set(scorer, (hits.get(scorer) || 0) + 1);
        goals.push({ scorer, assister });
        return 1;
      }
      if (guard) defOther.set(guard, (defOther.get(guard) || 0) + 1);
      return 0;
    };

    for (let k = 1; k <= n; k++) {
      const scene = sceneOf(atkW, defW);
      if (scene === "neu") continue;
      const clutchOn = isClutch(k, n, ga - gb);
      if (scene === "atk") ga += oneWay(A, B, hitsA, hitsB, atkW, k, gb - ga, goalsA, defB, clutchOn);
      else gb += oneWay(B, A, hitsB, hitsA, defW, k, ga - gb, goalsB, defA, clutchOn);
      if (Math.abs(ga - gb) >= GOAL_GAP) n = Math.min(n, Math.max(N_MIN, k));
    }
    return { gf: ga, ga: gb, goalsA, goalsB, defA, defB };
  }

  /* 몫이 **이미 정해진** 클럽의 골(또는 차단)을 STEP 3 무게로 나눠요.
   * 내 경기의 상대 클럽이 그 경우예요 — 스코어는 중계에 뜬 값이라 다시 굴리면
   * 화면과 순위표가 다른 말을 합니다(이 저장소가 계속 앓아 온 자리).
   *
   * kind "goal"이면 도움도 함께 붙여요. "defend"면 차단 한 명만 뽑습니다.
   * atkW는 그 클럽의 공격 쪽 무게예요(없으면 0.5 — 대등한 두 팀).
   *
   * 🅰️ **도움은 `autoMatch`·`createMatch`와 같은 규칙으로 붙습니다.**
   *
   * 골 하나하나가 🅰️ 전개에서 났는지 ⚽ 결정에서 났는지는 여기서 알 수 없어요 —
   * 스코어만 넘어오니까요. 그런데 **분포는 엔진이 이미 압니다**: STEP 2의
   * pBig(= `BIG_BASE × edge`)가 그 값이에요. 골마다 그 확률로 굴려 사후에 나눕니다.
   * *"골 중 몇 %를 전개 출신으로 볼 것인가"를 새로 정하지 않아요* — 새 상수가 없습니다.
   *
   * 🔴 예전에는 여기서 **모든 골에 ASSIST_P2만** 걸었어요. 그러면 이 길로 가는 클럽만
   * 도움이 덜 나옵니다. 그리고 이 길로 가는 클럽은 **언제나 내 경기의 상대**라
   * 무작위 오차가 아니라 **계통 오차**예요 — 평균으로 안 씻깁니다.
   * 리그 6팀이 세 갈래(카드 · autoMatch · 여기)로 나뉘어도 **자는 하나**라야 해요.
   *
   * ⚠️ urgency(뒤지면 찬스가 는다)와 추가시간 가중은 **그 시점 스코어를 봐야** 아는
   * 값이라 여기서는 못 씁니다. 그만큼 결정 쪽이 아주 조금 낮게 잡혀요. */
  function shareByWeight(xi, count, kind, atkW) {
    const out = [];
    if (!xi || !xi.length || !(count > 0)) return out;
    for (const x of xi) x._ab = null;
    const defend = kind === "defend";
    const hits = new Map();
    const pBig = clamp(BIG_BASE * ((atkW == null ? 0.5 : atkW) / 0.5), 0, 1);
    for (let i = 0; i < count; i++) {
      if (defend) {
        // 🧱 차단은 한 명만 뽑아요. 🥵 fatigue는 **골만** 세니 여기서는 안 올립니다
        const { who } = pickActor(xi, "defend", hits);
        if (!who) break;
        out.push({ scorer: who, assister: null });
        continue;
      }
      const big = chance(pBig);
      const { who } = pickActor(xi, big ? "goal" : "assist", hits);
      if (!who) break;
      let scorer = who, assister = null;
      if (big) {
        if (chance(ASSIST_P2)) {
          const mates = xi.filter((x) => x !== who);
          if (mates.length) assister = pickActor(mates, "assist", hits).who;
        }
      } else {
        // 🅰️ 전개 출신 — 주인공은 만드는 사람이고 마무리는 `g` 무게로 다른 사람이에요
        const rest = xi.filter((x) => x !== who);
        scorer = rest.length ? pickActor(rest, "goal", hits).who : who;
        assister = scorer === who ? null : who;
      }
      // 🥵 fatigue는 넣은 사람에게 — createMatch의 bump(scorer) · autoMatch와 같은 자리예요
      hits.set(scorer, (hits.get(scorer) || 0) + 1);
      out.push({ scorer, assister });
    }
    return out;
  }

  const K = {
    SCENE_ATK, BIG_BASE, FAT, URG, FIN, CON, ME_P, SPOT, NPC_SPOT,
    N_MIN, N_MAX, COND_K, COND_REF, ASSIST_P2, GOAL_GAP, CLUTCH, FLOOR_SHARE,
    GOAL_W, ASSIST_W, DEF_W, BLEND, BLEND_W,
  };

  return {
    createMatch, autoMatch, shareByWeight, setMini, getMini,
    succ, cardP, sc, mid, half, condMul, blendOf, K,
    /* 🔓 경기 밖(⚔️ 유스 평가전)에서도 **같은 산식·같은 표**를 쓰라고 냅니다.
     *   judgeAtP  s → 판정 (§2-6). 중심만 부르는 쪽이 줘요
     *   MINI      카드 종류 × 포지션 → 미니게임 (§4-3). 사본을 만들면 표가 갈라져요 */
    judgeAtP, MINI,

    /* ---------- 🧪 시드 주입 창구 (§10) ----------
     * 점진 확정은 매 경기 결과가 달라요. 고정 시드가 없으면 회귀 검사가 표본 수로
     * 버텨야 하고, 그러면 느립니다.
     *
     * ⚠️ 검사가 _t.K에서 문턱을 읽으면 안 됩니다 — 상수를 바꿔도 검사가 따라가서
     *    아무것도 안 잡혀요. _t.K는 "엔진이 실제로 쓰는 값"과 "소스의 상수"가 같은지
     *    대조하는 용도로만 쓰세요. 기준값은 소스에서 정규식으로 뽑거나 검사에 직접 적습니다. */
    _t: {
      seed(n) { _rng = mulberry32(n >>> 0); },
      unseed() { _rng = Math.random; },
      get skill() { return _skill; },
      set skill(v) { _skill = v == null ? null : clamp(v, 0, 1); },
      /* 한 경기를 끝까지 — 화면 없이. 내 카드는 skill(없으면 0.5)로 자동 판정합니다. */
      playMatch(cfg) {
        const m = createMatch(cfg);
        while (m.next()) if (m.pending) m.resolve(m.autoJudge());
        return m.result();
      },
      autoMatch,
      K,
    },
  };
})();
