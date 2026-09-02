/* 프로 선수 활동 · 명예의 전당 · 배틀 아레나 — 더 윙어 확장
 * game.js의 전역(S, $, rand, randInt, pick, clamp, shuffle, show, save, clearSave,
 * STAT_DEFS, POS_INFO, overall)을 사용하므로 game.js 뒤에 로드해야 해요. */
"use strict";

window.WingerCareer = (() => {
  const HOF_KEY = "grow-hof-v1";
  const BATTLE_KEY = "grow-battle-winger2-v1";

  /* 경기 평점 — 예전에는 myScore를 10으로 나눠서 능력치 60이면 이미 10.0 만점이었어요.
   * 그 위로는 아무리 키워도 평점도 MOM도 성적도 같아서, 이 게임의 천장이 여기였습니다.
   * 나누는 값을 키우고 팬덤 기여에 상한을 걸어 5.0~10.0으로 펼쳤어요.
   * matchContribution의 perf도 전원 최대치(1.6)로 죽어 있었는데 같이 살아납니다. */
  const FAN_CAP = 12;
  const RATING_DIV = 14;

  /* 경기 평점(1~10). clutch()는 전역 S의 재능·초월을 읽어요.
   * 리그 페널티는 clamp **안쪽**에서 빼요 — 밖에서 빼면 하한 1이 안 지켜져요. */
  /* 경기력 — "오늘 이 선수가 얼마나 좋은 상태인가". 골·도움·수비 **셋 다**에
   * 곱해지는 값이라, 여기에 한 스탯이 무겁게 실리면 그 스탯만 올려도 나머지
   * 축까지 같이 올라가요. 실제로 그랬습니다:
   *
   *   예전 (주스탯 0.32 · 체력 0.22 · 공격3종평균 0.20)
   *     공격수 총 스탯 400을 슛에 몰면 시즌 188골 · 도움 32 · 수비 26
   *     고르게 나누면                    51골 · 도움 26 · 수비 22
   *   → **몰빵이 모든 축에서 이겼어요.** 수비 스탯은 아예 식에 없었고요.
   *
   * 지금은 종합(5스탯 평균)이 뼈대예요. 어느 축이 세냐는 아래 matchContribution이
   * 정합니다 — 경기력과 축을 분리해야 "슛만 올렸는데 수비도 는다"가 안 생겨요.
   *
   * 약점 페널티: 가장 낮은 칸이 평균의 75%에 못 미치면 그만큼 깎아요.
   * 상대는 제일 약한 곳을 파고듭니다. 이게 없으면 한 칸만 키우는 게 언제나 정답이에요.
   *
   *   지금 (종합 0.50 · 주스탯 0.14 · 체력 0.10 · 약점 페널티)
   *     몰빵 117골 · 도움 24 · 수비 20   |   균형 51골 · 도움 27 · 수비 22
   *   → 전문화는 여전히 골에서 크게 이기지만, 도움·수비는 균형이 가져가요. */
  /* penalty — **리그 벌점**을 밖에서 넘길 수 있어요. 안 넘기면 지금 리그 것이에요.
   * 🌏 월드컵은 클럽 리그가 아니라 0을 넘겨요 — 난이도는 국가 전력이 싣습니다. */
  function ratingOf(stats, pos, condition, fandom, penalty) {
    const WEAK_BAR = 0.75;   // 평균의 이만큼에 못 미치는 칸이 약점이에요
    const WEAK_PEN = 0.45;
    const main = POS_INFO[pos].stat;
    /* ⚠️ 여기 스탯을 **손으로 적으면** 새 축이 들어올 때 조용히 빠져요.
     * 실제로 ⚡ 스피드를 넣었더니 종합에는 들어가는데 경기력에는 안 닿았습니다 —
     * 스피드를 140까지 올려도 평점이 6.37에서 꿈쩍도 안 했어요.
     * STAT_KEYS 하나만 보게 해서 축이 늘면 저절로 따라오게 합니다. */
    const vals = STAT_KEYS.map((k) => stats[k]).filter((v) => v != null);
    const all = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    const low = Math.min(...vals);
    const weak = Math.max(0, all * WEAK_BAR - low) * WEAK_PEN;
    /* ⭐ 재능은 **그 능력치가 하는 일에** 붙어요.
     *
     * 예전에는 `… * clutch(main)` 하나였어요 — 주 스탯의 별만 평점에 작용하고,
     * 나머지 넷의 별은 훈련 효율 말고는 아무 데도 안 쓰였습니다. "각 스탯에 따라
     * 달라져야 하는 거 아냐?"라는 물음이 정확히 그 자리예요.
     * 이제 각 항이 자기 별을 달고 갑니다 — 전체 평균 항은 다섯 별의 평균으로요. */
    const talAvg = STAT_KEYS.reduce((a, k) => a + clutch(k), 0) / STAT_KEYS.length;
    const myScore =
      (all * 0.50 * talAvg + stats[main] * 0.14 * clutch(main)
        + stats.stamina * 0.10 * clutch("stamina") - weak) +
      condition / 8 + Math.min((fandom || 0) / 45, FAN_CAP) + rand(-5, 5) + 20;
    /* 🎖️ 시즌 칭호(👑 리그의 지배자·🏆 챔피언·🏅 발롱도르)가 평점에 붙어요.
     * clamp **안쪽**에서 더해요 — 밖에서 더하면 상한 10이 안 지켜집니다. */
    const pen = penalty == null ? leagueOf(S).penalty : penalty;
    const rating = clamp(myScore / RATING_DIV - pen + buffSum("rate"), 1, 10);
    return rating;
  }

  /* 포지션별 축 — 골·도움·수비 성공을 포지션에 맞게 묶어요.
   * 수비수의 골 가중치가 높은 건 세트피스 득점이 실제로 희소하고 가치가 크기 때문이에요.
   * n은 정규화 계수예요. 수비수는 시즌 수비 성공이 68회인데 공격수는 골이 31개라,
   * 그대로 더하면 포지션이 곧 유불리가 됩니다. 시뮬레이션으로 잡은 값이에요. */
  /* ⚽ ①-G 확정 (24번 최종). `ASSIST_P2` 0.48 · `NPC_SPOT` 3.05/6.50/4.90 위에서
   * 네 n을 다시 잡았어요 — **`AXIS_OFF` 2.35와 한 벌이라 따로 넣으면 곡선이 무너집니다.**
   * 🛡️ df의 d는 여전히 **차단**이에요 — 무실점은 부문상(리그 분위수) 축이고
   * hype는 절대값의 로그라 서로 다른 축입니다(§1-3 · designer 판정). */
  const POS_AXIS = {
    fw: { g: 1.0, a: 0.5, d: 0.15, n: 1.072 },
    wg: { g: 0.8, a: 0.8, d: 0.15, n: 0.967 },
    mf: { g: 0.5, a: 1.0, d: 0.30, n: 0.873 },
    df: { g: 2.0, a: 1.0, d: 0.55, n: 0.794 },
  };
  const AXIS_K = 3.00;
  /* 경기 수를 12 → 38로 올리면서 시즌 축이 3.23배가 됐어요. log가 AXIS_K(3.00)로
   * 곱해지므로 hype가 3.52 올라갑니다 — 그만큼 offset을 올려 수상 문턱
   * (MVP 5.5 · 베스트11 4.5 · 신인왕 3)의 의미를 그대로 지켜요.
   *
   * ⚽ 득점 눈금(GOAL_SCALE 0.33)을 넣으면서 한 번 더 내렸어요.
   *
   * ⚠️ 산술만 믿으면 틀립니다. 축이 0.33배면 -3.33이라고 계산했는데, **승부처
   * 극장골(+1)은 눈금을 안 타요.** 실제 시즌 축은 0.33배가 아니라 0.44배쯤이
   * 됩니다. 그래서 실측으로 잡았어요 — AXIS_OFF를 5.0·5.4·5.8로 놓고 15시즌
   * 커리어를 굴려 리그MVP 횟수를 눈금 바꾸기 전과 맞춰 봤습니다.
   * 최종값은 curve-test의 리그MVP 확률 밴드로 잡았어요 — 그게 이 게임의 계약이에요.
   *   AXIS_OFF 4.4 → 능력치 90에서 MVP 45.5% (밴드 8~25%) · 너무 헐거움
   *   AXIS_OFF 5.0 → 3.0 / 17.4 / 57.1 / 81.2 / 92.2% (능력치 70~150) ✔ 전부 밴드 안
   *   AXIS_OFF 5.4 → 능력치 110에서 32.2% (밴드 45~72%) · 너무 빡빡함
   * 그 뒤 승부처 보상을 포지션별로 나누면서(극장골/도움/차단) 축이 또 움직여
   * 4.8로 다시 잡았어요 — 2.6 / 17.6 / 61.2 / 86.1 / 95.6%.
   * **생산량을 바꿀 때 이 값을 같이 안 옮기면 수상이 통째로 사라지거나 쏟아져요.** */
  /* ⚽ v2 — 점진 확정 엔진이 생산량을 통째로 바꿔서 **다시 잡은 값**이에요.
   * 4.8 → 1.90(21번, 당시 `NPC_SPOT` 단일 7.00) → 2.00(22번) → **2.35**(23번 ①-G).
   * ⚠️ 생산량을 바꿀 때 이 값을 같이 안 옮기면 수상이 통째로 사라지거나 쏟아져요. */
  /* ⚽ ①-G 확정 — 2.00 → 2.35. 위 POS_AXIS.n 넷과 **한 벌이라 따로 넣으면 안 돼요.**
   * 🎖️ 칭호 버프가 카드 엔진에 연결되면서(§2-7b) 곡선의 **허리가 밀렸습니다** —
   * 리그MVP가 능력치 90~110에서 +4.8~+7.9%p (70에서 +1.1 · 130~150은 이미 90%대라 +0.6~3.6).
   * 2.35가 그걸 받는 값이에요. 버프 배선을 끊으면 이 값도 같이 되돌려야 합니다. */
  const AXIS_OFF = 2.35;

  /* ---------- ⭐ 경기 평점 — 실제 축구 평점처럼 ----------
   *
   * 실제 평점 업체는 **그 경기에 일어난 일**만 봅니다. 선수가 얼마나 잘하는
   * 선수인지는 안 봐요 — 능력치 130짜리가 아무것도 못 하면 5점대고, 무명이
   * 두 골 넣으면 8점대입니다. 여기 값도 그 관행을 그대로 옮긴 거예요.
   *
   *   골 +1.0 · 도움 +0.7 · 수비 성공 +0.2 · 승리 +0.25 · 무실점 +0.1~0.45
   *
   * 예전에는 `능력치 평점 × 10`이 뼈대였고 경기는 그 위에 얹는 보정이었어요.
   * 그래서 능력치 130이 0골 0도움으로 6.9를, 능력치 50이 2골 넣고 6.5를
   * 받았습니다 — 화면에는 "그날 누가 잘했나"가 아니라 "누가 센 선수인가"가
   * 떠 있었던 거예요. 능력치는 이제 **골이 더 많이 들어가게 하는 것**으로만
   * 평점에 닿아요. 실제 축구와 같은 경로입니다.
   *
   * b는 아무 일도 없던 90분의 평점이에요. 골·도움 값은 포지션이 달라도
   * 거의 같아야 해요 — 실제로도 미드필더의 골이 공격수의 골보다 싸지 않아요.
   * 수비 성공(d)과 무실점(cs)만 포지션을 크게 탑니다.
   *
   * ⚠️ 이 게임은 한 경기 득점이 실제 축구보다 훨씬 많아요(공격수 평균 1.8골).
   * 그래서 시즌 평균이 6.4(하위 리그) ~ 8.1(최상위)로 실제보다 높게 나옵니다.
   * 값을 낮춰 평균을 맞추면 "1골 = +1.0"이라는 알아볼 수 있는 눈금이 깨져요.
   * 눈금을 지키고 득점 빈도는 백로그(경기당 골 과다)에서 따로 다룹니다.
   *
   * 실측(각 4만 경기, 리그를 능력치에 맞춰 세움) — 평균 순위와 MOM 비율은
   * 바꾸기 전과 거의 같아요. 명성·승격 사다리가 안 흔들린다는 뜻이에요:
   *   K3 공격수  평균순위 8.19 → 7.64 · MOM  1% →  1% · 평균평점 6.42
   *   K1 공격수            6.60 → 6.48 ·      6% →  6% ·          7.13
   *   PL 공격수            4.68 → 4.74 ·     22% → 21% ·          8.09
   *   PL 수비수            5.19 → 5.57 ·     14% →  9% ·          7.69 */
  const RATE = {
    /* ⚽ v2 — b(아무 일 없던 90분)만 **+10** 했어요. 카드가 8칸이라 한 경기에 일어나는
     * 사건 수가 줄어 평점이 6.0으로 내려갑니다. **골·도움 값은 안 건드려요** —
     * b만 옮기면 "골 +1.0"이라는 알아볼 수 있는 눈금이 그대로 살아 있어요. */
    fw: { b: 64, g: 10, a: 7.0, d: 2.0, cs: 1.0, cc: 0.5 },
    wg: { b: 64, g: 10, a: 7.5, d: 2.4, cs: 1.5, cc: 0.8 },
    mf: { b: 64, g: 10, a: 7.5, d: 2.8, cs: 2.5, cc: 1.5 },
    df: { b: 65, g: 12, a: 8.0, d: 3.6, cs: 4.5, cc: 3.5 },
  };
  const RATE_RESULT = 2.5;   // 승 +0.25 / 패 −0.25
  const RATE_CONCEDE = 3;    // 이만큼 실점하면 수비 쪽에 감점이 붙어요

  /* 같은 종류가 쌓이면 값이 줄어요 — 네 번째 골은 첫 골만큼 평점을 못 올려요.
   *
   * ⚠️ 예전에는 골마다 +1.0씩 그대로 더했어요. 이 게임은 득점이 실제 축구보다
   * 훨씬 많아서(공격수 경기당 1.8골) **만점이 흔해졌습니다.** 실측:
   *   챔피언십 — 평점 10.0이 12.7% · 한 라운드에 10.0이 둘 이상 33.3%
   *   프리미어리그 — 22.4% · 64.3%
   * 실제 평점 업체에서 10.0은 리그 전체에서 시즌에 한두 번 나오는 값이에요.
   *
   * 화면에는 "⚽ 골 3 +2.39"처럼 **합쳐서** 뜨니까 내역이 안 지저분해요.
   * 사후에 눌러 담는 방식(soft cap)은 "그날의 흐름 −1.5" 같은 정체불명 항목이
   * 생겨서 안 썼어요 — 줄어드는 이유가 화면에 설명돼야 합니다. */
  const RATE_DECAY = 0.78;
  const credit = (n, unit) =>
    n <= 0 ? 0 : unit * (1 - Math.pow(RATE_DECAY, n)) / (1 - RATE_DECAY);

  /* 진 경기의 상한. 팀이 졌는데 만점은 실제로 거의 안 나와요 —
   * 개인 퍼포먼스를 재는 값이라 최고 평점은 받을 수 있지만 10.0은 다릅니다. */
  const RATE_LOSS_CAP = 95;

  /* 평점을 만든 항목들(×10). 화면에 그대로 펼쳐 보여줘요 —
   * 숫자만 던지면 "왜 이 평점이야?"에 답할 수가 없어요. */
  function ratingParts(info, pos, momAdj) {
    const r = RATE[pos] || RATE.fw;
    const conceded = info.oppGoals || 0;
    const out = [{ label: "기본", v: r.b }];
    if (info.myGoals) out.push({ label: `⚽ 골 ${info.myGoals}`, v: credit(info.myGoals, r.g) });
    if (info.assists) out.push({ label: `🅰️ 도움 ${info.assists}`, v: credit(info.assists, r.a) });
    if (info.defense) out.push({ label: `🛡️ 수비 ${info.defense}`, v: credit(info.defense, r.d) });
    if (info.res === "W") out.push({ label: "팀 승리", v: RATE_RESULT });
    else if (info.res === "L") out.push({ label: "팀 패배", v: -RATE_RESULT });
    if (conceded === 0) out.push({ label: "무실점", v: r.cs });
    else if (conceded >= RATE_CONCEDE) out.push({ label: `${conceded}실점`, v: -r.cc });
    if (momAdj) out.push({ label: momAdj > 0 ? "결정적 순간 성공" : "결정적 순간 실패", v: momAdj });
    return out;
  }

  /* 한 경기 평점(×10). 능력치도 컨디션도 명성도 안 봅니다 — info만 봐요.
   * 마지막 흔들림은 심판·해설의 눈이라고 보면 돼요(실제 평점도 업체마다 갈려요). */
  function matchRating(info, pos, momAdj) {
    const v = ratingParts(info, pos, momAdj).reduce((a, p) => a + p.v, 0) + rand(-4, 4);
    return info.res === "L" ? Math.min(v, RATE_LOSS_CAP) : v;
  }

  /* 평점 내역 한 줄. 흔들림은 합에서 역산해 남김없이 보여줘요 —
   * 항목을 다 더해도 화면 숫자와 안 맞으면 그게 더 이상해 보입니다. */
  function ratingWhyHTML(score, info, pos, momAdj) {
    const parts = ratingParts(info, pos, momAdj);
    const sum = parts.reduce((a, p) => a + p.v, 0);
    // 10점 상한에 걸린 경기도 항목 합이 화면 숫자와 맞아야 해요 — 상한 뒤의 값으로 역산해요
    const shown = clamp(score / 10, 1, 10);
    const flow = shown * 10 - sum;
    const one = (label, v, first) =>
      `<span class="rw-item"><b>${label}</b> ${first ? "" : v >= 0 ? "+" : "−"}${Math.abs(v / 10).toFixed(2)}</span>`;
    const body = parts.map((p, i) => one(p.label, p.v, i === 0)).join("")
      + one("그날의 흐름", flow, false);
    return `<details class="rate-why"><summary>⭐ 평점 ${shown.toFixed(1)} — 어떻게 나왔나</summary>`
      + `<div class="rw-body">${body}</div></details>`;
  }

  // 시즌 축 점수. 옛 세이브에는 집계 필드가 없을 수 있어서 전부 || 0으로 받아요.
  function posAxis(act, pos) {
    const x = POS_AXIS[pos] || POS_AXIS.fw;
    const a = act || {};
    return ((a.goals || 0) * x.g + (a.assists || 0) * x.a + (a.defense || 0) * x.d) * x.n;
  }

  // 내장 봇 상대 (전부 가상의 선수)
  const GHOSTS = [
    { id: "wg1", name: "레전드 스트라이커 골머신", bp: 690 },
    { id: "wg2", name: "월드클래스 PM 매직풋", bp: 640 },
    { id: "wg3", name: "철벽 수비수 더월", bp: 560 },
    { id: "wg4", name: "득점왕 해트트릭", bp: 470 },
    { id: "wg5", name: "라이벌 윙어 스피드킹", bp: 400 },
    { id: "wg6", name: "베테랑 캡틴 리더", bp: 330 },
    { id: "wg7", name: "괴물 신인 라이징", bp: 260 },
    { id: "wg8", name: "무명 유망주 벤치", bp: 180 },
  ];

  /* 🛡️ 명예의 전당 카드는 **남이 올린 값**을 innerHTML로 그려요. match.js가 받는
   * 길에서 한 번 씻지만, 그리는 자리에서도 막습니다 — 로컬에 남은 옛 항목과
   * 씻기 전에 저장된 값이 있으니까요. 방어선은 둘이라야 하나가 새도 버팁니다. */
  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const loadHof = () => JSON.parse(localStorage.getItem(HOF_KEY) || "[]");
  const saveHof = (list) => localStorage.setItem(HOF_KEY, JSON.stringify(list));

  /* 아직 안 올린 헌액을 원격으로 보내요.
   * `sent`가 **정확히 false**인 것만 봅니다 — 이 칸이 없는 옛 항목은 만들 때
   * 이미 올라갔어요. undefined를 "안 올림"으로 보면 올릴 수 없는 항목(같은 id는
   * 덮어쓸 수 없어요)을 열 때마다 다시 두드리게 됩니다. */
  async function flushHof() {
    if (!window.Match) return;
    const list = loadHof();
    let changed = false;
    for (const e of list) {
      if (e.game !== "winger2" || e.sent !== false) continue;
      if (await window.Match.submitHof("winger2", e)) { e.sent = true; changed = true; }
    }
    if (changed) saveHof(list);
  }
  const loadBattle = () => JSON.parse(localStorage.getItem(BATTLE_KEY) || "{}");
  // 대전 기록도 백업 대상(keysOf)이에요. touch()로 표시해두지 않으면 다음 pull에
  // 조용히 덮여 사라져요.
  const saveBattle = (d) => {
    localStorage.setItem(BATTLE_KEY, JSON.stringify(d));
    if (window.Cloud) Cloud.touch();
  };
  const bpOf = (score, ovr) => Math.round(score * 0.4 + ovr * 3);

  // ---------- 엔딩 훅 ----------
  /* opts.keepSave — 🌱 유스 재계약처럼 엔딩 뒤에도 이어갈 길이 남은 경우예요.
   * 여기서 clearSave()를 부르면 '한 시즌 더 뛰기'를 누르기도 전에 기록이 사라져요.
   * 그래도 '기록 남기고 마무리'는 그대로 둬요 — 연장을 안 쓰고 끝낼 수 있어야 해요.
   * (enshrine()이 자기 안에서 clearSave()를 부르니 마무리 경로는 그대로 정리돼요.) */
  function onEnding(canGoPro, captain, opts) {
    const keepSave = !!(opts && opts.keepSave);
    /* opts.weakestClub — 📞 타 구단 스카우트로 올라온 경우예요.
     * 데뷔 클럽을 뽑지 않고 그 리그 최약체 하나로 고정해요. */
    const weakest = !!(opts && opts.weakestClub);
    /* opts.startLeague — 📹 세미프로 입단으로 올라온 경우예요. 사다리 맨 아래에서 시작해요.
     * 어느 엔딩인지는 game.js의 엔딩 분기가 정해서 넘겨줘요. 여기서 다시 판정하지 않아요. */
    const startLeague = opts && opts.startLeague != null ? opts.startLeague : null;
    const actions = document.querySelector("#screen-ending .draft-actions");
    document.getElementById("btn-go-debut")?.remove();
    document.getElementById("btn-idol-retire")?.remove();
    const btn = document.createElement("button");
    if (canGoPro) {
      save();
      btn.id = "btn-go-debut";
      btn.className = "btn btn-primary";
      btn.textContent = "⚽ 프로 커리어 시작!";
      btn.onclick = () => enterCareer(captain, weakest, startLeague);
    } else {
      btn.id = "btn-idol-retire";
      btn.className = "btn btn-ghost";
      btn.textContent = "🏛️ 기록 남기고 마무리";
      btn.onclick = () => enshrine();
      if (keepSave) save();
      else clearSave();
    }
    actions.prepend(btn);
  }

  // ---------- 프로 활동 ----------
  /* 데뷔 클럽은 그 리그의 하위 DEBUT_POOL개에서만 뽑아요.
   * 6개 전부에서 뽑던 시절에는 전력 52~78로 갈려서 첫 시즌 팀 성적이 운이었고,
   * 신인이 우승 후보 클럽에서 시작하는 것도 어색했어요. 올라가는 건 이적으로 해요. */
  const DEBUT_POOL = 3;
  function debutClubs(id) {
    const list = leagueRoster(id).slice().sort((a, b) => a.str - b.str);
    return list.slice(0, DEBUT_POOL);
  }

  /* 📞 타 구단 스카우트 경로만 쓰는 데뷔 클럽이에요.
   * debutClubs는 전력 오름차순이라 맨 앞이 그 리그 최약체예요. 뽑지 않고 하나로 고정해요 —
   * 프로 무대에 서긴 했지만 출발이 제일 나쁜 자리라는 걸 클럽으로 말해줍니다. */
  function weakestClub(id) {
    return debutClubs(id)[0];
  }

  function enterCareer(captain, weakest, startLeague) {
    S.phase = "winger2-pro";
    /* 데뷔 클럽은 소속 리그(기본 1부)에서 뽑아요. 이름과 전력을 함께 받아 둡니다 —
     * 전력은 동료 득점·실점에만 쓰이고 개인 수상에는 안 닿아요.
     *
     * startLeague를 받으면 거기서 출발해요 — 📹 세미프로 입단이 K리그3을 넘겨줘요.
     * 값은 leagueOf에 태워서 걸러요. 모르는 id가 들어와도 K리그1로 막혀요. */
    S.league = leagueOf(startLeague != null ? { league: startLeague } : S).id;
    const debutClub = weakest ? weakestClub(S.league) : pick(debutClubs(S.league));
    S.group = debutClub.name;
    S.clubStr = debutClub.str;
    S.center = !!captain;
    S.proYear = 0;
    // 데뷔 시즌부터 정착 기간을 세요 (갓 입단해서 첫 시즌에 승격하는 건 이상해요).
    // ⚠️ S.proYear를 0으로 세운 **뒤에** 잡아야 해요 — 앞에 두면 undefined가 들어갑니다.
    S.leagueSince = 0;
    /* daesangW · bonsangW는 리그격을 곱해 쌓는 가중 수상 카운터예요.
     * 옛 카운터(daesang · bonsang)는 화면에 "MVP 3회"처럼 횟수로 보여주는 데 그대로 써요. */
    S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, daesangW: 0, bonsangW: 0, rookie: 0, sales: 0, goals: 0, assists: 0, defense: 0, apps: 0, teamW: 0, teamD: 0, teamL: 0 ,
      /* 🔥 순간 카드 3종별 시도(t)/성공(p) — 시즌 요약이 "이번 시즌 순간 카드 55회"를
       * 찍어요. 옛 세이브에는 이 칸이 없어서 읽는 쪽이 기본값을 줍니다(마이그레이션 없음). */
      moments: { g: { t: 0, p: 0 }, a: { t: 0, p: 0 }, d: { t: 0, p: 0 } } };
    S.proLog = [];
    if (window.Stats) Stats.log("debut", { group: S.group, center: !!captain });
    startPrep();
  }

  function proLog(msg) {
    S.proLog.unshift(`[${S.proYear}시즌] ${msg}`);
    S.proLog = S.proLog.slice(0, 30);
  }

  function startPrep() {
    /* 🎂 시즌이 하나 넘어가면 한 살. 유스의 해넘이(game.js)와 **같은 자**를 써요 —
     * 두 곳에서 따로 세면 반드시 어긋납니다.
     * ⚠️ **`S.proYear`를 올리기 전에** 부릅니다. 뒤에 두면 나이 칸이 없는 옛 세이브가
     *    되짚기(`proYear`에서 계산) + 한 살로 **두 살**을 먹어요 (21 → 23). */
    WingerProspect.birthday(S);
    S.proYear += 1;
    S.camp = 3;
    S.condition = 80;
    S.activity = null;
    S.pendingShow = false;
    proLog(`⚽ ${S.proYear}시즌 시작! 전반기 리그를 준비해요.`);
    save();
    renderPrep();
    show("screen-pro");
  }

  /* 🎬 연출 줄 세우기 — 한 순간에 여럿을 부르면 겹쳐서 뭘 받았는지 안 보여요.
   *
   * 결산의 우승·수상은 이미 줄을 서 있었는데, **이적은 그 밖에서 따로 터졌어요** —
   * 💼 이적 축하와 🎒 적응으로 배운 능력치가 같은 순간에 겹쳤고, 결산 직후에
   * 이적하면 아직 도는 중인 수상 연출과도 부딪혔습니다(제보).
   * 여기 한 통로로 모아요. 앞선 줄이 아직 안 끝났으면 그 뒤에 이어 붙입니다. */
  const FX_GAP = 1700;
  let fxFreeAt = 0;
  function queueFx(list) {
    if (!window.Fx || !list || !list.length) return;
    const now = Date.now();
    let at = Math.max(0, fxFreeAt - now);
    for (const [kind, text, sel] of list) {
      const delay = at;
      setTimeout(() => {
        if (kind === "flash") Fx.flash(text);
        else Fx.celebrate(kind, text, sel);
      }, delay);
      at += FX_GAP;
    }
    fxFreeAt = now + at;
  }

  // ---------- 시즌 활동 (전/후반기 × 리그 6라운드) ----------
  const CB_PER_YEAR = 2;
  /* 한 시즌 38경기 — 실제 K리그1과 같아요. 예전에는 12경기(전반 6 + 후반 6)라
   * 실제의 3분의 1도 안 됐고, 한 경기 운이 시즌을 통째로 흔들었어요.
   * ⚠️ 리그마다 다르게 하지 않고 상수로 둡니다 — tests/soccer의 여러 테스트가
   * 이 상수를 소스에서 읽어 시즌을 굴려요. 함수로 바꾸면 테스트는 12경기로
   * 굴리는데 게임은 38경기로 돌아 기대값이 통째로 어긋납니다. */
  const WEEKS_PER_CB = 19;

  /* 🎂 선수 생애 주기 — **시즌 번호가 아니라 나이가 축입니다** (§6-4 · prospect.js).
   *
   * 폐기한 것 셋. 전부 `proYear`(몇 번째 시즌인가)로 사람의 몸을 판정했어요:
   *   · `CAREER_MAX = 15`   15시즌 고정 은퇴 → **나이 상한 + 은퇴 제안**
   *   · `GROW_UNTIL = 4`    1~4시즌만 성장(그 뒤 정체) → **나이곡선. 정체 구간 없음**
   *   · `DECLINE_FROM = 11` 11시즌부터 일률 노쇠 → **곡선이 내려가는 만큼, 능력치에 비례**
   *
   * ⚠️ 이름만 바꿔 되살리지 마세요. 폐기 이유는 상수 이름이 아니라 **형태**예요 —
   *    "몇 번째 시즌인가"로 성장·노쇠·은퇴를 재던 것 자체가 폐기 대상입니다.
   *    재능도 포지션도 성장타입도 안 보던 자리라, 40이든 130이든 똑같이 깎였어요.
   *
   * 나이·성장타입·은퇴 판정은 전부 prospect.js가 한곳에서 봅니다. */
  const CB_LABELS = ["전반기", "후반기"];
  const cbLabel = (n) => CB_LABELS[n - 1] || `${n}차`;

  /* 🏆 리그 순위표 — 예전에는 내 팀 성적(teamW/D/L)만 쌓고 다른 팀 기록이 없어서
   * 순위표를 만들 수가 없었어요. 리그의 6팀을 시즌 내내 함께 굴립니다.
   * ⚠️ S.league은 이미 '리그 ID'라 이름이 겹쳐요. 표는 S.table에 둡니다. */
  /* 🫀 **체력이 지치는 속도를 줄여요.**
   *
   * 여태 컨디션 소모가 전부 고정 난수였어요 — 능력치를 하나도 안 봤습니다.
   * 그래서 능력치 설명은 "지구력"인데 지구력이 지치는 속도와 무관했고,
   * 체력을 올릴 이유가 평점 계수 하나뿐이라 **주스탯만 밀고 나머지 방치**가
   * 최적이었어요(백로그 2026-08-05 · "체력이 높아도 컨디션이 덜 줄지 않는다").
   *
   * 이제 체력이 소모를 깎아요. 상한은 30%예요 — 그 이상이면 휴식이라는 선택지가
   * 사라져요. 최소 1은 남겨서 "아무리 체력이 좋아도 공짜는 아니다"를 지킵니다.
   *   체력  50 → -13%   ·  100 → -27%   ·  130 → -30%(상한)
   *
   * ⚠️ 축구에만 넣어요. 7종이 각자 제 파일에 같은 줄을 갖고 있어서, 게임마다
   * 시즌당 훈련 횟수가 달라 영향도 달라요(⚾ 144경기 · ⚽ 38경기).
   * 다른 게임은 그 게임의 곡선을 따로 재고 나서 옮겨요. */
  const WEAR_CAP = 0.30, WEAR_DIV = 370;
  // 🎂 지치는 것도 **지금 몸**이 정해요 — 서른다섯의 체력은 스물다섯의 체력이 아닙니다
  const wear = (base) => Math.max(1, Math.round(base * (1 - Math.min(WEAR_CAP, WingerProspect.nowStats(S).stamina / WEAR_DIV))));

  function initTable() {
    const list = leagueRoster(leagueOf(S).id);
    // gf/ga — 득점·실점. 개인 기록이 이 스코어에서 나와요(득실차도 순위에 씁니다)
    const rows = list.map((c) => ({ name: c.name, str: c.str, w: 0, d: 0, l: 0, gf: 0, ga: 0 }));
    /* 승격·이적으로 내 클럽이 목록에 없을 수 있어요(applyPromotion은 리그만 바꾸고
     * 클럽 이름은 그대로 둬요). 그때 **덧붙이면 팀이 7개가 됩니다.**
     *
     * ⚠️ 홀수가 되면 매 라운드 한 팀이 짝을 못 지어 쉬어요. 실제로 순위표의
     * 경기 수가 26·22·22·23·19처럼 제각각으로 벌어졌습니다(제보).
     * 승격은 누군가 내려갔다는 뜻이니, **가장 약한 팀을 밀어내고 그 자리에** 들어가요.
     * 리그 팀 수가 시즌마다 그대로 유지되고, 짝도 항상 맞습니다. */
    if (S.group && !rows.some((r) => r.name === S.group)) {
      let out = 0;
      for (let i = 1; i < rows.length; i++) if (rows[i].str < rows[out].str) out = i;
      rows.splice(out, 1, { name: S.group, str: clubStrOf(S), w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    }
    // 어떤 이유로든 홀수면 제일 약한 팀을 빼요 — 쉬는 팀이 생기는 걸 막습니다
    if (rows.length % 2 === 1) {
      let out = 0;
      for (let i = 1; i < rows.length; i++) if (rows[i].str < rows[out].str) out = i;
      if (rows[out].name !== S.group) rows.splice(out, 1);
      else rows.splice(rows.findIndex((r) => r.name !== S.group), 1);
    }
    S.table = { y: S.proYear, league: leagueOf(S).id, rows };
  }
  // 프로 단계인가. 값은 "winger2-pro"예요 — 한 곳에서만 적어 두고 여기를 씁니다.
  const isPro = () => S.phase === "winger2-pro";
  const tableReady = () => S.table && S.table.y === S.proYear && S.table.league === leagueOf(S).id;

  /* 한 라운드 결과를 표에 반영해요. 내 경기 결과를 먼저 넣고, 남은 팀들을 짝지어
   * 굴립니다 — 짝을 지어야 승과 패의 총합이 맞아 표가 말이 돼요.
   *
   * 그 라운드에 각 팀이 뭘 했는지를 { 팀이름: "W"|"D"|"L" }로 돌려줘요.
   * 평점 순위표가 이걸 봐서 라이벌 점수에 반영합니다 — 예전에는 순위표와
   * 평점표가 서로를 안 봐서, 라이벌 클럽이 지든 이기든 그 선수 평점이 똑같았어요.
   * 팀이 홀수라 짝이 안 맞으면 한 팀은 그 라운드를 쉬어요(키가 안 담겨요). */
  /* 🏆 한 라운드 — **스코어까지** 굴려요.
   *
   * 예전에는 승·무·패만 굴렸어요. 그래서 팀 성적과 개인 기록이 서로 모르는
   * 사이였습니다 — 우리 팀이 3:0으로 이겼는데 우리 팀 선수 골 합이 1일 수 있었어요.
   * 이 저장소가 계속 앓아 온 "표시와 판정이 서로 다른 것을 본다"의 마지막 자리예요
   * (🌏 월드컵에서는 이미 고쳤습니다 — "4:2로 이겼는데 상대 골 합이 3").
   *
   * 이제 **골을 먼저 굴리고 승패를 거기서 읽어요.** 그 골이 그대로 그 클럽 선수들의
   * 기록이 됩니다(leagueRound). 내 경기는 굴리지 않아요 — 중계에 뜬 실제 스코어를 써요.
   *
   * 돌려주는 것: { [클럽]: { res, gf, ga } } */
  const GOAL_G0 = 1.45, GOAL_GK = 0.03;      // 전력 70 → 한 경기 1.15골 (컵·유스가 아직 씁니다)
  const clubGoals = (str) => poissonish(Math.max(0.15, GOAL_G0 + ((str || 70) - 70) * GOAL_GK));

  /* ---------- ⚽ v2 · 엔진 어댑터 ----------
   *
   * WingerEngine은 전역(S · WingerSquad)을 안 읽어요 — 화면 없이 node에서 곡선을
   * 재려면 그래야 합니다(13번 §10). 그 대신 여기서 명단을 엔진이 아는 모양으로 바꿔요.
   *
   * 나는 6스탯을, 동료·경쟁자는 str 한 값을 넘깁니다. 엔진이 포지션별 blend로 읽어요 —
   * 미드필더라면 패스에 0.60이 걸려서, 패스를 올린 만큼 전개 카드 주인공 확률이 올라요.
   * 현행 splitMine은 종합만 봐서 **패스가 도움에 전혀 안 닿았습니다**(라이브 확인된 결함). */
  function engRow(x) {
    return {
      name: x.me ? S.name : x.name,
      pos: x.pos || "mf",
      slot: (window.WingerSquad ? WingerSquad.slotOf(x) : null) || {},
      me: !!x.me,
      /* 🎂 **지금 실력**을 넘겨요 — `S.stats`는 정점 기준값이라 그대로 주면
       * 열아홉과 서른셋이 같은 선수가 됩니다 (동료는 `str`에 이미 자기 곡선이 들어 있어요). */
      stats: x.me ? WingerProspect.nowStats(S) : null,
      str: x.str,
      /* 🦶 약발 배수는 나에게만 있어요(동료는 약발 칸이 없습니다).
       * 엔진이 골·도움 카드에만 겁니다 — 태클에 발이 갈리지는 않아요. */
      foot: x.me ? footMul() : 1,
      /* 🎖️ 시즌 칭호·🎉 피버 버프 (13번 §2-7b).
       *
       * 🔴 여태 **리그 경기에 하나도 안 닿았어요.** `buffMul`을 부르는 곳이
       * `matchContribution` 하나뿐인데 v2 리그는 카드 엔진을 씁니다 — 🥇 골든부츠 위너 ·
       * 🏅 발롱도르 위너 · 🌏 월드컵 위너까지 칭호 여덟 개의 g·a·d가 38라운드에서
       * 통째로 죽어 있었습니다(닿는 건 🏆 컵뿐이었어요). 🎉 피버도 같이 죽었고요.
       *
       * 🚨 **나에게만 실어요** — 칭호는 내 커리어가 쌓은 것이고 NPC에게는 그 개념이 없어요.
       * ⚠️ **이미 곱한 수**를 넘깁니다. 엔진은 전역(S·buffMul)을 안 읽어요(§10-3b) —
       *    화면 없이 node에서 곡선을 재려면 그래야 합니다.
       * ⚠️ `moment`(승부처 성공 +%p)는 여기가 아니라 **미니게임 판정 창**에 붙어요(§4-5).
       *    `rate`·`train`도 각자 제자리가 따로 있습니다. 여기는 g·a·d 셋뿐이에요. */
      buff: x.me ? { g: buffMul("g"), a: buffMul("a"), d: buffMul("d") } : null,
      row: x,
    };
  }
  // 클럽별 선발 11명. 우리 팀은 **그 경기에 실제로 뛴 11명**이에요(leagueXI가 가려 줍니다)
  function clubRows() {
    const by = {};
    if (!window.WingerSquad) return by;
    for (const { club, p } of WingerSquad.leagueXI()) (by[club] = by[club] || []).push(engRow(p));
    return by;
  }
  /* 그 라운드에 누가 무엇을 했나 — **명단 줄 객체**를 열쇠로 씁니다.
   * recordRound가 채우고 leagueRound가 씁니다. 이름으로 모으면 동명이인이 한 사람이 돼요. */
  let _roundCredits = null;
  function addCredit(row, g, a, d) {
    if (!_roundCredits || !row) return;
    const c0 = _roundCredits.get(row) || { g: 0, a: 0, d: 0 };
    c0.g += g || 0; c0.a += a || 0; c0.d += d || 0;
    _roundCredits.set(row, c0);
  }
  const putGoals = (list) => {
    for (const { scorer, assister } of list || []) {
      if (scorer) addCredit(scorer.row, 1, 0, 0);
      if (assister) addCredit(assister.row, 0, 1, 0);
    }
  };
  function recordRound(myOpp, res, myGf, myGa, mine) {
    if (!tableReady()) initTable();
    /* ⚽ v2 — 다른 클럽 경기도 **같은 8칸 카드 루프**를 돕니다(13번 §2-9).
     * 닫힌 형태 λ 근사는 폐기했어요 — 능력치가 높을수록 평균이 −9.4%까지 어긋났습니다.
     * 리그 6팀 × 선발 11명 = 66명이 같은 루프를 돌아요. 라운드당 24회 · 시즌 912회라
     * 브라우저에서 사실상 0이에요. 이래야 **"나와 경쟁자의 유일한 차이는 미니게임을
     * 실제로 하느냐"**가 문자 그대로 참이 됩니다. */
    const XI = clubRows();
    _roundCredits = new Map();
    /* 내 경기에서 나온 기록 — 중계에 뜬 그대로예요. 같은 라운드를 두 번 세지 않아요.
     * mine.oppDone이 참이면 상대 클럽 몫도 여기 이미 들어 있다는 뜻이라, 아래에서
     * 다시 나누지 않습니다(🪑 벤치인 주가 그 경우예요 — 두 클럽을 한 루프로 굴려요). */
    for (const m of (mine && mine.mates) || []) addCredit((m.row && m.row.row) || m.row, m.g, m.a, m.d);
    const rows = S.table.rows;
    const find = (n) => rows.find((r) => r.name === n);
    const me = find(S.group), op = find(myOpp);
    const out = {};
    const put = (row, name, gf, ga) => {
      if (row) { row.gf = (row.gf || 0) + gf; row.ga = (row.ga || 0) + ga; }
      out[name] = { res: gf > ga ? "W" : gf < ga ? "L" : "D", gf, ga };
    };
    if (me && op) {
      /* 내 경기는 **중계에 뜬 스코어 그대로**예요. 여기서 다시 굴리면 화면과
       * 순위표가 다른 말을 합니다. 옛 세이브 대비로 값이 없으면 승패에서 지어내요. */
      const gf = myGf != null ? myGf : (res === "W" ? 2 : res === "L" ? 0 : 1);
      const ga = myGa != null ? myGa : (res === "W" ? 0 : res === "L" ? 2 : 1);
      if (res === "W") { me.w += 1; op.l += 1; }
      else if (res === "L") { me.l += 1; op.w += 1; }
      else { me.d += 1; op.d += 1; }
      me.gf = (me.gf || 0) + gf; me.ga = (me.ga || 0) + ga;
      op.gf = (op.gf || 0) + ga; op.ga = (op.ga || 0) + gf;
      out[S.group] = { res, gf, ga };
      out[myOpp] = { res: res === "W" ? "L" : res === "L" ? "W" : "D", gf: ga, ga: gf };
    }
    /* 남은 팀을 짝지어 굴려요.
     * 팀 수가 홀수면 한 팀이 남는데, 무작위로 두면 특정 팀만 계속 쉬어서
     * 경기 수가 벌어져요. **지금까지 제일 많이 뛴 팀**을 쉬게 해서 간격을 좁힙니다.
     * (initTable이 짝수를 지키니 평소엔 여기까지 안 와요 — 옛 세이브 대비예요) */
    const rest = shuffle(rows.filter((r) => r !== me && r !== op));
    if (rest.length % 2 === 1) {
      let most = 0;
      const gp = (r) => r.w + r.d + r.l;
      for (let i = 1; i < rest.length; i++) if (gp(rest[i]) > gp(rest[most])) most = i;
      rest.splice(most, 1);
    }
    for (let i = 0; i + 1 < rest.length; i += 2) {
      const a = rest[i], b = rest[i + 1];
      /* 홈 이점 없이 전력만 봐요. 스코어와 개인 기록이 **한 루프에서 같이** 나오니
       * "팀은 3:0인데 선수 골 합이 1"이 구조적으로 불가능해집니다. */
      const r = WingerEngine.autoMatch({
        xiA: XI[a.name] || [], xiB: XI[b.name] || [], strA: a.str, strB: b.str,
      });
      const ga2 = r.gf, gb2 = r.ga;
      if (ga2 > gb2) { a.w += 1; b.l += 1; }
      else if (ga2 < gb2) { b.w += 1; a.l += 1; }
      else { a.d += 1; b.d += 1; }
      put(a, a.name, ga2, gb2);
      put(b, b.name, gb2, ga2);
      putGoals(r.goalsA); putGoals(r.goalsB);
      for (const [er, n] of r.defA) addCredit(er.row, 0, 0, n);
      for (const [er, n] of r.defB) addCredit(er.row, 0, 0, n);
    }
    /* 🏟️ 내 경기의 상대 클럽 — **스코어는 중계에 뜬 값**이라 다시 굴리지 않고
     * STEP 3 무게로 나누기만 해요. 굴리면 화면과 순위표가 다른 말을 합니다.
     *
     * 🅰️ 전력비(atkW)를 함께 넘겨요 — 엔진이 그 값으로 pBig을 세워 전개/결정 출신을
     * 나눕니다. 안 넘기면 늘 대등한 두 팀(0.5)으로 보는데, 이 자리는 **언제나
     * 내 상대**라 그 치우침이 평균으로 안 씻겨요 (13번 §2-8b (3) · 게이트 ①-G G-4). */
    if (op && XI[myOpp] && !(mine && mine.oppDone)) {
      const g = out[myOpp] ? out[myOpp].gf : 0;
      const sO = op.str || 70, sM = (me && me.str) || 70;
      putGoals(WingerEngine.shareByWeight(XI[myOpp], g, "goal", sO / (sO + sM)));
      const stops = (mine && mine.oppStops) || 0;
      for (const { scorer } of WingerEngine.shareByWeight(XI[myOpp], stops, "defend")) addCredit(scorer.row, 0, 0, 1);
    }
    return out;
  }

  const RES_KO = { W: "승", D: "무", L: "패" };

  /* 순위는 승점 → **득실차** → 다득점 순이에요(실제 리그와 같아요).
   * 득실 칸이 없는 옛 세이브는 0으로 읽혀서, 그때는 예전처럼 승-패로 갈려요. */
  const tableRows = () => (S.table ? S.table.rows : [])
    .map((r) => ({ ...r, pts: r.w * 3 + r.d, gp: r.w + r.d + r.l,
      gf: r.gf || 0, ga: r.ga || 0, gd: (r.gf || 0) - (r.ga || 0) }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
      || (b.w - b.l) - (a.w - a.l) || a.name.localeCompare(b.name));

  function tableHTML() {
    const rows = tableRows();
    return `<table class="rank-table"><thead><tr><th>#</th><th>팀</th><th>경기</th><th>승무패</th><th>득실</th><th>승점</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.name === S.group ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td><td>${r.gp}</td><td>${r.w}-${r.d}-${r.l}</td>`
      + `<td class="tb-gd">${r.gd > 0 ? "+" : ""}${r.gd}</td><td>${r.pts}</td></tr>`).join("")}</tbody></table>`;
  }
  const myTableRank = () => {
    const rows = tableRows();
    const i = rows.findIndex((r) => r.name === S.group);
    return i < 0 ? rows.length : i + 1;
  };

  /* 🔺🔻 팀 승강제 — 리그 순위표 1위면 위로, 꼴찌면 아래로 내 팀이 통째로 움직여요.
   *
   * 개인 이적 사다리(PROMOTE_HYPE)와는 **다른 축**이에요.
   * 그건 "내가 좋은 제안을 받아 클럽을 옮기는 것", 이건 "내 클럽이 리그를 오르내리는 것".
   * 둘이 섞이면 사다리가 두 번 작동해서 한 시즌에 두 단계를 뛰어넘어요.
   *
   * 사다리가 **둘**이에요. 국내(K리그3 → K리그2 → K리그1)와 유럽(유로파 → 챔스).
   * 유럽 무대는 실제로는 리그가 아니라 컵 대회지만, 이 게임은 이미 '소속 리그'로
   * 모델링해 놨어요 — 클럽 목록도 순위표도 국내 리그와 똑같이 굴러갑니다.
   * 그래서 승강제만 없으면 유럽에 간 순간 팀 성적이 아무 데도 안 닿았어요.
   *
   * **사다리는 나라마다 하나씩이고 서로 안 이어져요.** 잉글랜드 최하위가 이탈리아로
   * 가지 않아요 — 실제로도 강등은 그 나라 리그 안에서만 일어납니다.
   * 나라를 옮기는 건 오직 이적 사다리(PROMOTE_HYPE)뿐이에요.
   *
   * 각 나라의 맨 위에서 1위면 올라갈 데가 없으니 **리그 우승**이고,
   * 맨 아래에서 꼴찌면 내려갈 데가 없어 아무 일도 안 일어나요.
   *
   * ⚠️ id는 옛 세이브가 가리키는 값이라 순서와 무관해요. 여기 배열의 **순서**가
   * 그 나라 안의 오름차순이에요(아래 → 위). 전역 난이도는 LEAGUES의 tier가 따로 봅니다. */
  const COUNTRY_TIERS = {
    kr: [5, 4, 1],    // 🇰🇷 한국 3부 → 2부 → 1부
    jp: [6, 7],       // 🇯🇵 일본 2부 → 1부
    br: [8, 9],       // 🇧🇷 브라질 2부 → 1부
    it: [10, 11],     // 🇮🇹 이탈리아 2부 → 1부
    en: [2, 3],       // 🇬🇧 챔피언십 → 프리미어리그 (옛 유로파·챔피언스리그 자리)
  };
  const ladderOf = (id) => {
    for (const k of Object.keys(COUNTRY_TIERS)) if (COUNTRY_TIERS[k].includes(id)) return COUNTRY_TIERS[k];
    return null;
  };
  /* 승격 문턱. 순위만 보면 사다리가 죽어요 — 실측하니 내 승률 60%에서 시즌의 91.5%가
   * 1위였습니다. 팀 성적이 사실상 내 성적이라(내 골이 곧 팀 득점) 잘하는 선수는
   * 매 시즌 1위를 해요. 승점 차를 걸어도 75% 승률에서 98.8%라 소용이 없었어요.
   *
   * 그래서 **내 실력과 무관한 축**을 겁니다 — 승격한 리그에는 최소 두 시즌 머물러요.
   * 실제로도 갓 승격한 팀이 곧바로 또 올라가는 일은 드물어요.
   * K리그3에서 K리그1까지 최소 6시즌이 걸려, 개인 이적 사다리(PROMOTE_HYPE)가
   * 여전히 '빠른 길'로 남습니다. **강등에는 안 걸어요** — 위험은 바로 와야 무섭습니다.
   * (이 문장이 오래 주석에만 있었어요. 코드는 강등에도 걸고 있었습니다) */
  /* 🏆 우승 상금 — **리그 격이 곱해져요.**
   *
   * 예전에는 리그 우승·승격에 상금이 아예 없었고(트로피만 남았어요), 컵 우승만
   * 900만 정액이었어요. 그래서 K리그3 컵과 프리미어리그 컵이 같은 값이었습니다.
   * 위로 갈수록 판이 커지는 게 이 게임의 사다리라, 상금도 같은 축을 타야 해요.
   *
   * 크기 기준: 한 시즌 총수입이 대략 3,000~5,000만이에요(경기 수당 + 결산 수입).
   * 프리미어리그 우승 4,320만은 한 시즌치와 맞먹고, K리그3 승격 495만은
   * 장비 한 티어 값에 못 미쳐요 — 위로 갈수록 값어치가 커지는 게 보입니다. */
  const TITLE_PRIZE = 1800;   // 사다리 꼭대기에서 1위 (리그 우승)
  const PROMO_PRIZE = 900;    // 승격 — 그 리그에서 1위를 했다는 뜻이에요
  const CUP_PRIZE = 1500;     // 컵 우승
  const CUP_ROUND_PRIZE = 90; // 컵 라운드마다 붙는 수당
  const prizeOf = (base, lgId) => {
    const lg = LEAGUES.find((l) => l.id === lgId);
    return Math.round(base * (lg ? lg.prestige : 1));
  };

  /* 🔺 승격은 **1위면 끝**이에요. 조건을 걸지 않습니다.
   *
   * 예전에는 둘이 걸려 있었어요 — 2위와 승점 차 8점 이상(PROMO_GAP), 그리고
   * 승격/이적 뒤 2시즌 정착(PROMO_SETTLE). 그런데 리그를 우승하고도 아무 일이
   * 안 일어나는 시즌이 생겼고(제보: 세리에B 1위인데 그대로), 왜 막혔는지도
   * 화면에 안 나왔습니다. 1위는 1위예요 — 그 자리에서 올라갑니다. */

  /* 리그 명단을 세이브에서 읽어요 (game.js의 clubsIn). 이 파일 안에서는
   * S가 전역이라 인자 없이 부릅니다. */
  const leagueRoster = (id) => clubsIn(id, S);

  /* 🌍 승강 — 내 클럽과 상대 리그의 한 팀이 자리를 맞바꿔요.
   *
   *   올라갈 때: 위 리그의 **최약체**가 내가 있던 리그로 내려와요
   *   내려갈 때: 아래 리그의 **최강**이 내가 있던 리그로 올라가요
   *
   * 실제 승강과 같은 그림이고, 무엇보다 **양쪽 리그의 팀 수가 그대로**예요.
   * 팀 수가 흔들리면 순위표가 홀수가 되고 매 라운드 한 팀이 쉽니다.
   * 바뀐 명단만 S.world에 남겨요 — 안 건드린 리그는 CLUBS 그대로예요. */
  function swapLeagues(fromId, toId, kind) {
    const fromList = leagueRoster(fromId).slice();
    const toList = leagueRoster(toId).slice();
    const meIdx = fromList.findIndex((c) => c.name === S.group);
    const me = meIdx >= 0
      ? fromList[meIdx]
      : { name: S.group, str: clubStrOf(S) };     // 옛 세이브 — 목록에 없던 유령 클럽
    if (meIdx >= 0) fromList.splice(meIdx, 1);

    // 자리를 내주는 팀 — 올라갈 때는 위 리그 최약체, 내려갈 때는 아래 리그 최강
    let swapIdx = 0;
    for (let i = 1; i < toList.length; i++) {
      const better = kind === "up" ? toList[i].str < toList[swapIdx].str : toList[i].str > toList[swapIdx].str;
      if (better) swapIdx = i;
    }
    const other = toList[swapIdx];
    if (other) { toList.splice(swapIdx, 1); fromList.push(other); }
    toList.push({ name: me.name, str: S.clubStr });

    S.world = S.world || {};
    S.world[fromId] = fromList.map((c) => ({ name: c.name, str: c.str }));
    S.world[toId] = toList.map((c) => ({ name: c.name, str: c.str }));
    if (other) proLog(`🔁 ${other.name}이(가) ${LEAGUES.find((l) => l.id === fromId).name}(으)로 자리를 바꿨어요`);
  }

  /* 🏆 우승 기록 — 트로피 목록과 **리그 격 가중 카운터**를 함께 세워요.
   *
   * 커리어 점수는 가중 카운터(ringW)를 봅니다. K리그3 우승과 프리미어리그 우승이
   * 같은 값이면 위로 올라가지 않는 쪽이 이득이 돼요 — 실제로 그런 상태였습니다.
   *
   * 가중 카운터가 없던 옛 세이브는 지금까지 쌓인 트로피를 1부 기준(×1)으로 세고
   * 이어붙여요. 0에서 시작하면 새 우승 하나 때문에 지난 우승이 통째로 사라집니다. */
  /* weight — 커리어 점수에 실을 가중치를 밖에서 정할 수 있어요.
   * 🌏 월드컵 우승은 **0**을 넘겨요. 점수는 SCORE_W.wc 한 곳으로 몰아서
   * 손잡이를 하나로 유지합니다 — 양쪽에 실리면 조절할 곳이 둘이 돼요. */
  function addTrophy(title, leagueId, weight) {
    S.trophies = S.trophies || [];
    if (S.trophies.includes(title)) return false;
    S.trophies.push(title);
    S.career = S.career || {};
    const before = S.career.ringW != null ? S.career.ringW : S.trophies.length - 1;
    const lg = LEAGUES.find((l) => l.id === leagueId) || leagueOf(S);
    S.career.ringW = before + (weight == null ? lg.prestige : weight);
    return true;
  }

  function applyPromotion() {
    if (!tableReady()) return null;
    const rows = tableRows();
    if (rows.length < 3) return null;
    const rank = myTableRank();
    const ladder = ladderOf(leagueOf(S).id);
    if (!ladder) return null;                // 사다리에 없는 리그는 그대로 둬요
    const at = ladder.indexOf(leagueOf(S).id);

    /* 🔻 강등 면제는 **프로 데뷔 시즌 한 번뿐**이에요. 갓 입단한 선수의 첫 시즌이
     * 강등으로 끝나는 건 과하니까요. (이 함수는 시즌 기록을 쌓기 전에 돌아서,
     * years가 비어 있으면 그게 데뷔 시즌이에요)
     *
     * ⚠️ 예전에는 정착 기간이 강등에도 걸려 있었어요. 그 값(leagueSince)은
     * 이적으로도 새로 서서, 프리미어리그로 이적한 선수는 꼴찌를 해도 두 시즌
     * 동안 안 내려갔습니다 — 올라가서 버티는 긴장이 통째로 없었던 거예요. */
    // 세이브에 career가 없으면(있을 수 없는 상태) 면제를 켜지 않아요 — 조용히 규칙이 죽는 걸 막아요
    const debutSeason = !!(S.career && Array.isArray(S.career.years) && S.career.years.length === 0);

    /* 사다리 맨 위(K리그1 · 챔피언스리그)에서 1위면 올라갈 데가 없어요.
     * 승격 대신 **리그 우승**이에요. 아무 일도 안 일어나면 1위를 해도 화면에 남는 게 없습니다. */
    // 사다리 맨 위 1위는 그 자리가 우승이에요 — 방금 올라왔어도 우승은 우승이죠
    if (rank === 1 && at === ladder.length - 1) {
      addTrophy(`${S.proYear}시즌 ${leagueOf(S).name} 우승`, leagueOf(S).id);
      const prize = Math.round(prizeOf(TITLE_PRIZE, leagueOf(S).id) * traitMul(S, "money"));
      S.money = (S.money || 0) + prize;
      proLog(`🏆 ${leagueOf(S).name} 우승! 우승 상금 +${prize}만`);
      return { kind: "title", from: leagueOf(S).name, to: leagueOf(S).name, rank, prize };
    }

    let to = null, kind = null;
    if (rank === 1 && at < ladder.length - 1) {
      to = ladder[at + 1]; kind = "up";     // 1위면 올라가요. 다른 조건은 없어요
    } else if (rank === rows.length && at > 0) {
      // 사다리 안에서만 내려가요. 맨 아래(K리그3)는 갈 데가 없어요.
      if (debutSeason) return null;                   // 데뷔 시즌 한 번만 면제예요
      to = ladder[at - 1]; kind = "down";
    }
    if (to == null) return null;

    const from = leagueOf(S).name;
    const fromId = leagueOf(S).id;
    /* 클럽 전력도 함께 움직여요. 승격하면 상위 리그에서는 하위권, 강등되면
     * 하위 리그에서는 상위권이 되는 게 자연스러워요. */
    const list = clubsIn(to);
    if (list.length) {
      const ref = kind === "up" ? list[list.length - 1] : list[0];
      S.clubStr = ref ? ref.str : S.clubStr;
    }
    /* 🌍 자리를 **맞바꿔요** — 내가 올라가면 그 리그의 한 팀이 내려옵니다.
     * 예전에는 내 리그 값만 바꾸고 명단은 그대로라, 내 클럽이 새 리그 목록에
     * 없는 유령 상태가 됐어요. */
    swapLeagues(fromId, to, kind);
    S.league = to;
    S.table = null;                          // 새 리그에서 표를 다시 만들어요
    S.leagueSince = S.proYear;               // 이 리그에 들어온 시즌
    /* 승격은 **떠나는 리그에서 1위**를 했다는 뜻이라 그 리그 기준으로 줘요.
     * 도착 리그 기준으로 주면 올라간 보상을 미리 당겨 받는 셈이 됩니다. */
    let prize = 0;
    if (kind === "up") {
      /* 승격도 **그 리그 1위**라 우승이에요. 예전에는 트로피를 안 남겨서,
       * 결산에는 "리그 우승!"이라 뜨는데 명예의 전당에는 아무것도 안 남았어요. */
      addTrophy(`${S.proYear}시즌 ${from} 우승`, fromId);
      prize = Math.round(prizeOf(PROMO_PRIZE, fromId) * traitMul(S, "money"));
      S.money = (S.money || 0) + prize;
      proLog(`🔺 ${from} 우승으로 승격! 우승 상금 +${prize}만`);
    }
    return { kind, from, to: leagueOf(S).name, rank, prize };
  }

  /* ---------- 🥇 개인 순위 (득점·도움·수비) ----------
   *
   * 리그의 모든 선발이 시즌 내내 함께 쌓아요. 부문상은 이 표의 1위에게 갑니다 —
   * 화면에 보이는 경쟁이 곧 수상 판정이에요. 예전에는 랜덤 문턱이라
   * 표와 수상이 서로 모르는 사이였습니다. */
  /* 경쟁자의 포지션 — 평점을 나와 **같은 산식**으로 매기려면 필요해요.
   * (수비수의 수비 성공과 공격수의 골이 같은 표에서 공정하게 겨루도록) */
  const RACE_POS = { st: "fw", st2: "fw", wg: "wg", am: "mf", mf: "mf", cb: "df", cb2: "df", ut: "mf" };



  /* 진행 중이던 세이브에는 경쟁자 명단이 없어요 — 시즌 시작(initActivity)에만
   * 만들어지거든요. 그대로 두면 순위표가 아예 안 뜨고, 시즌이 끝날 때까지
   * 부문상도 못 받아요.
   *
   * 그릴 때 비어 있으면 채워 넣되, **이미 치른 경기 수만큼 미리 굴려 둬요.**
   * 0골에서 시작하면 내가 20골인데 1위가 0골인 표가 나와서 경쟁이 안 됩니다.
   * (평점 칸도 같은 방식으로 메워요) */
  /* 개인 순위가 **명단 한 벌**을 보게 되면서, 옛 세이브에는 그 기록이 없어요.
   * 마이그레이션은 안 해요 — 읽는 쪽에서 **이미 치른 라운드만큼 다시 굴려** 메웁니다
   * (g/a/d/평점을 메우던 방식 그대로예요). 한 시즌에 한 번만 돌아요.
   *
   * 옛 세이브의 act.race(여덟 명)는 그냥 버려요. 같은 사람의 기록이 두 벌로 남는
   * 것이 이 저장소가 계속 앓아 온 병이라, 여기서 한 벌로 정리합니다. */
  function ensureLeagueRecords() {
    const act = S.activity;
    if (!act || !window.WingerSquad) return;
    /* 🧯 출전 수 바로잡기는 **따로 도장을 찍어요.** 2.50.0에서 시작한 시즌은
     * raceFilled가 이미 찍혀 있어서, 그 안에 두면 영영 안 돌아요. */
    if (!act.appsFixed) { act.appsFixed = true; repairApps(); save(); }
    if (act.raceFilled) return;
    act.raceFilled = true;
    if (act.race) delete act.race;
    const played = act.apps || 0;
    /* ⚠️ **우리 팀은 빼고** 비어 있는지 봐요. 우리 팀 선발은 출전 수가 이미
     * 쌓여 있어서, 전체로 보면 "비어 있지 않다"가 나옵니다 — 그러면 다른
     * 클럽 88명이 영원히 0으로 남아요(이어하던 세이브에서 실제로 그랬습니다:
     * 41경기를 치렀는데 기록 있는 사람이 우리 팀 14명뿐이었어요). */
    const xi = WingerSquad.leagueXI();
    const blank = xi.every(({ club, p }) => club === S.group || !(p.apps || 0));
    if (played && blank) {
      const skip = new Set(xi.filter(({ p }) => (p.apps || 0) > 0).map(({ p }) => p));
      for (let i = 0; i < played; i++) leagueRound(null, skip);
    }
    save();
  }

  /* 🧯 출전 수가 **치러진 라운드보다 많은** 줄을 바로잡아요.
   *
   * 2.50.0 전에는 우리 팀 출전 수를 두 곳에서 세서 최대 두 배가 됐어요
   * (제보: 26라운드 시즌인데 동료가 47경기). 그 시즌을 이어서 하는 사람은
   * 시즌이 끝날 때까지 그 숫자를 보게 됩니다.
   *
   * 세이브를 고치지 않는 게 규칙이지만, 이건 **틀린 값을 지우는 것**이라
   * 읽는 쪽에서 한 번만 깎아요. 진짜 값은 알 수 없으니 **가능한 최대치**(치러진
   * 라운드 수)로 맞춥니다 — 넘을 수 없는 숫자니까요.
   * 골·도움·수비는 안 건드려요. 그쪽은 두 번 안 셌어요(출전 수만 두 곳에서 셌습니다). */
  function repairApps() {
    const act = S.activity;
    if (!act || !window.WingerSquad) return;
    const rounds = ((act.cb || 1) - 1) * WEEKS_PER_CB + (act.week || 0);
    if (rounds <= 0) return;
    let fixed = 0;
    const sq = S.squads || {};
    for (const club of Object.keys(sq)) {
      for (const x of sq[club]) {
        if (x.me) continue;
        if ((x.apps || 0) > rounds) { x.apps = rounds; fixed += 1; }
      }
    }
    if (fixed) proLog(`🧯 출전 기록을 바로잡았어요 (${fixed}명 · 이번 시즌 ${rounds}라운드)`);
  }

  /* 🥇 한 라운드 — **리그의 모든 선발**이 자기 경기를 치러요.
   *
   * 예전에는 시즌 초에 뽑은 여덟 명만 굴렸어요. 그러면 다른 클럽의 아홉 번째
   * 선수는 아무리 잘해도 표에 못 올라옵니다 — 명단 화면에는 있는데 순위표에는
   * 없는 사람이 88명이었어요(제보: "전체 리그 선수들 대상으로 다 해야 해").
   *
   * 기록은 **명단 한 벌에만** 쌓아요(S.squads). 예전에는 같은 사람의 기록이
   * race와 squads 두 벌로 있어서 우리 팀만 손으로 맞춰 주고 있었습니다.
   *
   * 우리 팀은 여기서 **굴리지 않아요** — 내가 뛴 그 경기의 값(중계에 뜬 골)이
   * applyMateGoals로 들어옵니다. 굴리면 같은 라운드를 두 번 세요.
   * 🌏 월드컵의 advanceOthers(skip)와 같은 규칙이에요.
   *
   * 역할은 포지션에서 정해요 — 센터백에게 스트라이커 생산량을 물리면 안 되니까요. */
  const ROLE_BY_POS = { fw: ["st", "st2"], wg: ["wg"], mf: ["am", "mf", "ut"], df: ["cb", "cb2"] };
  const roleOf = (x) => {
    if (!x.role) {
      const keys = ROLE_BY_POS[x.pos] || ["ut"];
      const want = pick(keys);
      x.role = (RACE_ROLES.find((r) => r.key === want) || RACE_ROLES[0]).key;
    }
    return RACE_ROLES.find((r) => r.key === x.role) || RACE_ROLES[0];
  };
  function leagueRound(roundRes, skip) {
    if (!window.WingerSquad) return [];
    const out = [];
    for (const { club, p } of WingerSquad.leagueXI()) {
      if (p.me) continue;                       // 내 기록은 S.activity에 따로 쌓여요
      /* 🧯 옛 세이브를 메울 때는 **이미 기록이 있는 사람을 건너뛰어요.**
       * 우리 팀 동료는 markApps·동료 골로 진짜 기록이 쌓여 있어서, 여기서 또
       * 돌리면 출전 수가 두 배가 됩니다. 건너뛸 사람은 메우기 **전에** 정해요 —
       * 돌면서 정하면 첫 바퀴에 생긴 기록 때문에 둘째 바퀴부터 다 건너뜁니다. */
      if (skip && skip.has(p)) continue;
      const mine = club === S.group;
      p.apps = (p.apps || 0) + 1;
      const def = roleOf(p);
      /* ⚽ v2 — 골·도움·차단을 **여기서 굴리지 않아요.** recordRound의 카드 루프가
       * 이미 다 정했습니다(13번 §2-9). 여기서 또 굴리면 같은 라운드를 두 번 세요.
       *
       * 🧯 옛 세이브 메우기(roundRes 없이 부를 때)는 채울 기록이 없으니 0이에요 —
       * winger2는 새 저장 키라 그 갈래를 탈 세이브가 아직 없습니다. */
      const cr = (_roundCredits && _roundCredits.get(p)) || { g: 0, a: 0, d: 0 };
      p.g = (p.g || 0) + cr.g;
      p.a = (p.a || 0) + cr.a;
      p.d = (p.d || 0) + cr.d;
      out.push({ p, club, mine, role: def.name, dg: cr.g, da: cr.a, dd: cr.d });
    }
    /* ⭐ 평점은 **골을 나눈 다음에** 매겨요. 먼저 매기면 그 경기에 한 일을 못 봐요.
     * 실점도 실제 스코어(ga)를 씁니다 — 지어내지 않아요. */
    for (const r of out) {
      const info0 = (roundRes && roundRes[r.club]) || null;
      const res = info0 ? info0.res : pick(["W", "D", "L"]);
      const info = { myGoals: r.dg, assists: r.da, defense: r.dd, res,
        oppGoals: info0 ? info0.ga : raceConceded(res) };
      /* 🛡️ 무실점 경기 — 🛡️ 철벽상의 **주축**이에요 (13번 §2-8b (4)).
       * 평점이 무실점 보너스를 읽는 그 값(info.oppGoals)을 그대로 봐요 —
       * 따로 세면 결산에 뜬 스코어와 순위표가 다른 말을 합니다.
       * 옛 세이브에 이 칸이 없어도 읽는 쪽이 || 0으로 받습니다(마이그레이션 안 해요). */
      if (!info.oppGoals) r.p.cs = (r.p.cs || 0) + 1;
      const score = matchRating(info, r.p.pos || "mf", 0);
      r.p.rate = (r.p.rate || 0) + clamp(score / 10, 1, 10);
      r.score = score;
      r.res = res;
    }
    return out;
  }


  /* ---------- 🗑️ v2에서 폐기한 것 (13번 §2-10) ----------
   *
   * splitMine · myTeamGoals · shareGoals · MY_P · ACE_W · GOAL_W · ASSIST_W ·
   * MAKER_W · ASSIST_P2 — **전부 여기 있었고 전부 지웠어요.** STEP 1~4가 대체합니다.
   *
   * 표 값(GOAL_W · ASSIST_W · ASSIST_P2)은 engine.js로 옮겨 갔어요. **두 곳에 두면
   * 반드시 어긋나서** 여기서는 지웠습니다.
   *
   * 왜 폐기했나 — 결함이 둘이었어요(inspector가 라이브에서 찾은 것):
   *   ① 도움 몫 식 `(overall/70)^1.2`에 **패스 스탯이 없어서**, 미드필더가 주 스탯을
   *      특화하면 축이 오히려 줄었어요(×0.978). **키울수록 손해**였습니다.
   *   ② `c.def`만 splitMine을 안 타서 **수비수가 자기 축을 통째로** 가져갔어요
   *      (능력치 110에서 차단 몫 56.8% vs 윙어 3.0%).
   * 둘 다 "같은 자로 재지 않아서" 생긴 결함이에요. v2는 골·도움·차단 셋 다
   * STEP 3이라는 **하나의 무게 식**을 지나서 이 형태가 재발할 수 없습니다.
   *
   * 에이스 계단(`iAmAce ? ACE_W : 1`)도 폐기했어요 — 축이 70→90에서 2.8배 튀는
   * 주범이었고, engine.js의 `SPOT` / `NPC_SPOT`(카드 종류별 셋)으로 바뀌었습니다.
   * ⚠️ **여기 값을 적어 두지 마세요** — 두 곳에 두면 반드시 어긋납니다. engine.js가 정본이에요. */

  // 우리 팀 선발 이름 — 경기 중 '동료의 골'에 붙일 이름이에요
  const mateNames = () => (window.WingerSquad
    ? WingerSquad.startingXI().filter((x) => !x.me).map((x) => x.name) : []);

  /* 경기에서 동료가 넣은 골을 그 선수의 시즌 기록으로 옮겨요.
   *
   * 우리 팀 선수는 **나와 같은 경기를 뛴 사람**이에요. 그 경기에서 실제로 나온
   * 골만 세야 화면(중계)과 표(개인 순위)가 같은 것을 봅니다. 그래서 굴린 값(dg)을
   * 물리고 중계에 뜬 골 수로 바꿔요 — 안 그러면 같은 라운드를 두 번 세게 됩니다.
   * 다른 클럽 선수는 내가 볼 수 없는 경기라 굴린 값을 그대로 써요. */
  /* 🗑️ applyMateGoals도 폐기했어요 — 동료 골·도움·차단이 이제 recordRound의
   * credits 한 자리로 들어옵니다. 이름으로 찾아 얹던 자리라 동명이인이 섞였어요. */

  /* 경쟁자 실점 — 소속 클럽의 그 라운드 결과에서 짐작해요. 실제로 굴리지는
   * 않으니(순위표는 승패만 굴려요) 결과에 어울리는 값을 뽑습니다.
   *
   * ⚠️ 폭이 **내 실점 분포와 같아야** 해요. 평점은 무실점 보너스와 대량 실점
   * 감점을 보는데, 경쟁자만 적게 먹는 걸로 잡으면 같은 표에서 내가 늘 손해를 봅니다.
   * 팀 결과를 전력 대 전력으로 바꾸면서 내 실점이 크게 늘었어요 —
   * 실측(승/무/패 평균) — 팀 결과를 전력으로 가르면서 2.05/3.19/4.58까지 올라갔다가,
   * 득점 눈금(GOAL_SCALE)을 넣으면서 0.65 / 1.18 / 2.52로 돌아왔어요.
   * 아래 폭이 그 평균과 맞아요 (0.5 / 1.0 / 2.5). */
  const raceConceded = (res) => (res === "W" ? randInt(0, 1) : res === "L" ? randInt(1, 4) : randInt(0, 2));



  /* 나를 끼워 정렬한 순위.
   * key — "g" 득점 · "a" 도움 · "d" 무실점 경기 · "p" 공격포인트 · "r" 평균평점 · "m" MOM
   *
   * 🛡️ key "d"는 **무실점 경기 수**예요 (13번 §2-8b (4) · 게이트 ①-G의 G-5).
   * 차단 횟수였던 것을 바꿨습니다 — 기회가 **상대 공격 장면**에서 나와서
   * *"가장 잘 막는 수비수"*가 아니라 *"가장 자주 두들겨 맞는 팀의 수비수"*가 1위였어요.
   * 실측: 능력치를 110 → 150으로 올려도 리그 1위 차단은 50.1 → 50.6으로 거의 고정이라,
   * 🛡️ 철벽상 수상률이 **0%**였습니다(원칙 ⑤ — 축을 잘못 고르면 능력치가 안 실려요).
   * 차단은 **동점일 때 타이브레이커**로 남습니다.
   *
   * ⚠️ key 문자는 "d" 그대로 둡니다 — 옛 세이브가 가리키는 값은 아니지만(탭은 저장
   * 안 해요), RACE_TABS·raceValue·raceTop("d")가 같은 문자를 봐야 해요. */
  function raceRank(key) {
    const act = S.activity;
    const apps = (act && act.apps) || 0;
    /* ⚠️ 평균 평점은 **그 사람이 뛴 경기 수**로 나눠요. 예전에는 경쟁자도 내
     * 출전 수로 나눴는데, 이제 사람마다 출전 수가 달라요(로테이션·부상 없이도
     * 선발이 매 경기 다시 뽑히니까요). 남의 경기 수로 나누면 벤치를 오간 선수의
     * 평균이 실제보다 낮게 뜹니다. */
    const avgOf = (x, n) => (n ? (x.rate || 0) / n : 0);
    const val = (x) => key === "p" ? (x.g || 0) + (x.a || 0)
      : key === "r" ? x.avg
      // MOM은 내 줄이 act.wins, 다른 선수는 mom에 쌓여요 — 같은 이름으로 읽어요
      : key === "m" ? (x.m != null ? x.m : x.mom || 0)
      // 🛡️ 수비 부문의 주축은 무실점 경기 수예요 (위 주석)
      : key === "d" ? (x.cs || 0)
      : x[key] || 0;
    /* 🛡️ 무실점이 같으면 **차단이 많은 쪽**이 앞이에요. 다른 부문에는 타이브레이커가
     * 없어요 — 무실점은 상한이 38이라 동점이 훨씬 자주 나옵니다. */
    const tie = (x) => (key === "d" ? (x.d || 0) : 0);
    const me = { name: S.name, club: S.group, role: null, me: true,
      g: (act && act.goals) || 0, a: (act && act.assists) || 0, d: (act && act.defense) || 0,
      cs: (act && act.cs) || 0,
      rate: (act && act.ratingSum) || 0, m: (act && act.wins) || 0, apps,
      pop: clamp(overall(), 40, 95) };
    /* 🥇 **리그의 모든 선수**가 이 표에 들어와요.
     *
     * 예전에는 시즌 초에 실력으로 뽑은 여덟 명만 굴려서, 다른 클럽의 아홉 번째
     * 선수는 아무리 잘해도 못 올라왔어요 — 명단 화면에는 있는데 순위표에는 없는
     * 사람이 88명이었습니다(제보: "전체 리그 선수들 대상으로 다 해야 해").
     * 이제 기록이 명단 한 벌에만 있으니 여기서 그대로 읽어 세워요. */
    const sq = window.WingerSquad ? WingerSquad.ensureSquads() : {};
    /* 표에 들어오는 사람 — **지금 선발이거나, 이번 시즌에 한 경기라도 뛴 사람.**
     * 한 번도 안 뛴 벤치까지 넣으면 0으로 채운 줄이 수십 개 붙어서 표가 아니게 되고,
     * 반대로 출전 기록만 보면 **개막 직후에 나 혼자만 뜹니다**(실제로 그랬어요).
     * 로테이션으로 벤치에 앉은 사람도 그동안의 기록은 그대로 남아요. */
    const inXI = new Set();
    if (window.WingerSquad) for (const { p } of WingerSquad.leagueXI()) inXI.add(p);
    const others = [];
    for (const club of Object.keys(sq)) {
      for (const x of sq[club]) {
        if (x.me) continue;
        if (!inXI.has(x) && !(x.apps || 0)) continue;
        /* 역할 이름(스트라이커·센터백…)은 명단 줄에 적힌 키에서 꺼내요.
         * 아직 한 경기도 안 뛴 사람은 키가 없어서 포지션에서 정해 줍니다. */
        const rl = RACE_ROLES.find((r) => r.key === x.role);
        const R = rl || roleOf(x);
        others.push({ name: x.name, club, role: R.name, key: R.key, pos: x.pos, pop: clamp(x.str, 40, 95),
          g: x.g || 0, a: x.a || 0, d: x.d || 0, cs: x.cs || 0,
          rate: x.rate || 0, mom: x.mom || 0, apps: x.apps || 0 });
      }
    }
    const rows = others.concat([me]).map((x) => ({ ...x, avg: avgOf(x, x.apps), v: 0 }))
      .map((x) => ({ ...x, v: val(x) }));
    /* 개막 전에는 실력 순으로 세워요.
     *
     * 기록 순으로 두면 전부 0이라 아무렇게나 늘어서고, 동점 규칙 때문에
     * **내가 1위**로 뜹니다 — 한 경기도 안 뛰었는데 득점왕처럼 보여요.
     *
     * ⚠️ "아무도 기록이 없으면"으로 판정하면 안 돼요. 결산을 안 거치고 넘어온
     * 옛 세이브에는 **지난 시즌 기록이 남아 있어서**(실측: 69명 중 12명) 그 판정이
     * 거짓이 됩니다. **시즌이 진행 중인가(act)**를 직접 봐요. */
    if (!act || rows.every((x) => !(x.apps || 0))) {
      return rows.sort((x, y) => (y.pop || 0) - (x.pop || 0));
    }
    // 동점이면 내 줄을 앞에 둬요 — 실제로도 공동 득점왕은 둘 다 받아요
    return rows.sort((x, y) => y.v - x.v || tie(y) - tie(x) || (x.me ? -1 : 1));
  }

  // 내가 그 부문 1위인가 — 부문상 판정이 이걸 봐요
  const raceTop = (key) => { const r = raceRank(key)[0]; return !!(r && r.me); };

  /* 🥇 개인 순위표 — 부문 탭 하나에 그 부문 숫자 하나.
   *
   * 처음엔 한 표에 다섯 칸(⚽🅰️🛡️⭐🏅)을 다 띄우고 탭으로 정렬만 바꿨어요.
   * 그런데 그러면 **탭을 만든 이유가 없어져요** — 한 번에 하나를 묻는 장치인데
   * 답이 다섯 개씩 딸려 나오고, 폰에서는 7칸이 들어가느라 글자만 작아집니다.
   * 지금은 고른 부문 숫자 하나만 보여주고 그 폭을 이름·소속에 줘요.
   * 다른 기록이 궁금하면 탭을 누르면 돼요.
   *
   * 1위에 붙는 👑은 그 부문 수상자예요 — 부문상 판정이 이 표의 1위를 봅니다. */
  const RACE_TABS = [
    ["g", "⚽ 득점", "골"], ["a", "🅰️ 도움", "도움"], ["d", "🛡️ 무실점", "무실점"],
    ["p", "🎯 공격P", "공격P"], ["r", "⭐ 평점", "평균 평점"], ["m", "🏅 MOM", "MOM"],
  ];
  /* 고른 탭은 세이브에 안 넣어요 — 화면 상태일 뿐이고, 세이브에 새 칸을 늘리면
   * 클라우드 동기화까지 건드리게 됩니다. 앱을 다시 열면 ⭐ 평점으로 돌아와요. */
  let raceKey = "r";
  const raceTab = (k) => RACE_TABS.find(([x]) => x === k) || RACE_TABS[4];
  const raceLabel = (k) => raceTab(k)[1];
  const raceUnit = (k) => raceTab(k)[2];
  /* ⚠️ 표에 뜨는 값과 부문상 판정(raceRank의 val)이 **같은 것을 봐야** 해요.
   * 정렬은 무실점으로 하고 표에는 차단을 띄우면, 이 게임이 계속 앓아 온
   * "표시와 판정이 서로 다른 것을 본다"가 그대로 재발합니다. */
  const raceValue = (r, k) => k === "r" ? (r.avg || 0).toFixed(2)
    : k === "m" ? (r.m != null ? r.m : r.mom || 0)
    : k === "p" ? (r.g || 0) + (r.a || 0)
    : k === "d" ? (r.cs || 0)
    : r[k] || 0;

  function raceHTML() {
    const ranked = raceRank(raceKey);
    if (!ranked.length) return "";
    /* 🏷️ 칭호를 같이 보여줘요 — 이 표가 "다른 팀 선수는 어느 급인가"를 볼 수 있는
     * 유일한 자리인데, 여태 이름과 소속뿐이라 다 같은 선수로 보였어요.
     * 내 줄은 종합, 경쟁자는 pop을 종합 눈금으로 옮긴 값(raceStr)을 씁니다. */
    const pres = leagueOf(S).prestige;
    const strOf = (r) => (r.me ? overall() : raceStr(r.pop, pres));
    // 개막 전에는 👑을 안 붙여요 — 시즌이 시작도 안 했는데 1위는 없어요
    const opening = !S.activity || ranked.every((x) => !(x.apps || 0));
    const line = (r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td>`
      + `<td>${r.name}<span class="ch-club"><b class="ch-title">${titleOf(strOf(r))}</b> · ${r.club || "-"}${r.role ? ` · ${r.role}` : ""}</span></td>`
      + `<td class="rc-v">${!opening && i === 0 ? "👑" : ""}${raceValue(r, raceKey)}</td></tr>`;
    const myIdx = ranked.findIndex((x) => x.me);
    const shown = ranked.slice(0, 5);
    const pinned = myIdx >= 5
      ? `<tr class="hof-gap-row"><td colspan="3">⋯</td></tr>` + line(ranked[myIdx], myIdx)
      : "";
    const tabs = RACE_TABS.map(([k, label]) =>
      `<button type="button" class="race-tab${k === raceKey ? " on" : ""}" data-k="${k}">${label}</button>`).join("");
    return `<div class="race-tabs">${tabs}</div>`
      + `<table class="rank-table season-standings race-table">`
      + `<thead><tr><th>#</th><th>선수</th><th>${raceUnit(raceKey)}</th></tr></thead>`
      + `<tbody>${shown.map(line).join("")}${pinned}</tbody></table>`
      + (opening
        ? `<div class="race-note">개막 전이라 실력 순이에요</div>`
        : `<div class="race-note">👑 이 부문 1위 — 시즌이 끝나면 부문상을 받아요</div>`);
  }

  /* 표를 그리고 탭을 배선해요. 탭을 누르면 정렬만 바꿔 다시 그립니다 —
   * ⚠️ 여기서 renderPrep을 부르면 안 돼요. <details>가 접히면서 표가 사라져요. */
  function renderRace() {
    const body = $("pro-race-body");
    if (!body) return;
    body.innerHTML = raceHTML();
    const sum = $("pro-race-sum");
    if (sum) {
      const list = raceRank(raceKey);
      const mine = list.findIndex((x) => x.me) + 1;
      const top = list[0];
      const me = list[mine - 1];
      /* 개막 전에는 순위를 말하지 않아요 — 시즌이 시작도 안 했는데 "1위"는 거짓말이에요 */
      sum.textContent = (!S.activity || list.every((x) => !(x.apps || 0)))
        /* "선발 N명"은 **지금 선발**을 세요 — 표에는 지난 시즌 기록만 남은
         * 로테이션 선수도 섞여 있어서, 표 줄 수로 세면 숫자가 들쭉날쭉해요. */
        ? `🥇 개인 순위 — 개막 전 (리그 선발 ${window.WingerSquad
            ? Math.max(0, WingerSquad.leagueXI().length - 1) : 0}명)`
        : `🥇 개인 순위 — ${raceLabel(raceKey)} ${mine}위 (${me ? raceValue(me, raceKey) : 0})`
          + `${top && !top.me ? ` · 1위 ${top.name} ${raceValue(top, raceKey)}` : " · 내가 1위!"}`;
    }
    for (const b of body.querySelectorAll(".race-tab")) {
      b.onclick = (ev) => { ev.preventDefault(); raceKey = b.dataset.k; renderRace(); };
    }
  }

  function initActivity() {
    /* 👥 새 시즌 — 동료들의 시즌 기록을 비워요 (명단은 그대로).
     * 결산에서 이미 비웠지만, **결산을 안 거친 옛 세이브**를 위해 여기도 남겨 둬요.
     * 두 번 불러도 같은 결과라 안전합니다. */
    if (window.WingerSquad) WingerSquad.resetSeason();
    initTable();
    S.activity = {
      cb: 1, cbTotal: CB_PER_YEAR,
      week: 0, weekTotal: WEEKS_PER_CB,
      wins: 0, sales: 0, hypeSum: 0, cbHype: 0, cbWins: 0,
      goals: 0, assists: 0, defense: 0, apps: 0, teamW: 0, teamD: 0, teamL: 0,
      opp: pick(oppClubs(S)),
      /* 🥇 경쟁자 — 개인 순위도, 경기 후 평점표도 **리그 명단 한 벌**을 써요.
       * 예전에는 명단이 둘(rivals · race)로 갈려 있어서 득점왕이 평점표에 없었어요. */
      raceFilled: true,        // 기록은 명단(S.squads)에 쌓아요 — 여기엔 안 둡니다
    };
  }

  function afterPrep() {
    if (S.camp > 0) { renderPrep(); return; }
    /* 🌏 월드컵 훈련 턴이 끝났어요 — 경기 시작 버튼만 남겨요.
     * 상태는 S.wc.ready 하나뿐이라 대회가 끝나면(S.wc = null) 같이 사라집니다. */
    if (S.wc) { S.wc.ready = true; save(); renderPrep(); show("screen-pro"); return; }
    /* 🏆 컵 준비가 끝나면 **시작 버튼**을 띄워요. 리그 경기도 준비가 끝나면
     * "경기하러 가기"를 누르는데, 컵만 마지막 훈련을 누르는 순간 그대로 8강으로
     * 넘어갔어요 — 훈련하려던 손이 그대로 경기 시작이 됩니다.
     * 이 갈림이 없으면 리그 경기가 한 판 더 열려요(시즌은 이미 끝났는데도요). */
    if (S.cupPrep) { S.cupReady = true; save(); renderPrep(); show("screen-pro"); return; }
    if (!S.activity) initActivity();
    else if (S.activity.week >= S.activity.weekTotal) {
      S.activity.cb += 1;
      S.activity.week = 0;
      S.activity.cbHype = 0;
      S.activity.cbWins = 0;
    }
    S.pendingShow = true;
    save();
    renderPrep();
    show("screen-pro");
  }

  /* 🏷️ 칭호 승급·강등 — 종합은 훈련·장비·각성·노쇠 어디서든 움직여요. 자리마다
   * 검사를 심으면 하나를 빠뜨리는 순간 "올랐는데 아무 말도 없는" 칭호가 됩니다.
   * 그려질 때 한 번만 봐요.
   *
   * ⚠️ 옛 세이브에는 S.titleIdx가 없어요. 마이그레이션하지 않고, 처음 볼 때
   * 조용히 지금 칭호로 맞춰 둡니다 — 안 그러면 이어하기만 했는데 "승급!"이 떠요. */
  function checkTitle() {
    const idx = titleIdx(overall());
    const had = S.titleIdx;
    S.titleIdx = idx;
    S.career = S.career || {};
    if (S.career.bestTitle == null || idx > S.career.bestTitle) S.career.bestTitle = idx;
    if (had == null || idx === had) return;
    if (idx > had) {
      /* 승급 명성 보너스 — 위 칭호일수록 세상이 더 크게 알아봐요.
       * 한 번뿐이라(같은 칭호로 두 번 못 올라와요) 명성 곡선을 흔들지 않아요. */
      const fan = 25 * idx;
      S.fandom = Math.max(0, (S.fandom || 0) + fan);
      proLog(`🏷️ 칭호 승급 — ${titleAt(idx)}! 명성 +${fan} · 수당 ×${titlePayMul(idx).toFixed(2)}`);
      queueFx([["award", `🏷️ ${titleAt(idx)}!`]]);
    } else {
      /* 내려갈 때는 명성을 깎지 않아요 — 이미 노쇠 벌점이 따로 걸려 있어요.
       *
       * ⚠️ 문구가 상황을 봐야 해요. 🔮각성·🌠초월은 능력치를 30~60으로 되돌리는
       * **투자**인데, 거기에 "기량이 떨어졌어요"가 뜨면 잘하려고 한 행동에 벌을
       * 주는 것처럼 읽혀요(제보). 각성 직후에는 다시 만드는 중이라고 적어요. */
      proLog(S.awakenAt === S.stages
        ? `🔮 각성으로 몸을 다시 만드는 중이에요 — 지금은 ${titleAt(idx)} · 수당 ×${titlePayMul(idx).toFixed(2)}`
        : `🕯️ 기량이 떨어졌어요 — ${titleAt(idx)} · 수당 ×${titlePayMul(idx).toFixed(2)}`);
    }
    save();
  }

  /* 📍 내 자리 — 목업처럼 필드 위에 격자를 놓고 내가 설 자리를 밝혀요.
   * 자리는 포지션 안에서만 나뉘어요(넷은 그대로예요). 그래서 격자도 내 포지션
   * 줄만 채우고 나머지는 흐리게 둡니다 — "내가 갈 수 있는 자리"가 한눈에 보여요. */
  function slotFieldHTML() {
    if (!window.WingerSquad) return "";
    const me = WingerSquad.squadOf(S.group).find((x) => x.me);
    /* 🪑 **선발이 아니면 자리가 없어요.** slotOf는 못 찾으면 포지션 첫 자리를
     * 돌려주는데, 그걸 그대로 그리면 벤치인데도 CAM에 서 있는 것처럼 보여요. */
    const starting = WingerSquad.isStarter && WingerSquad.isStarter();
    const now = starting ? WingerSquad.slotOf(me) : null;
    const mine = WingerSquad.slotsOf(S.pos);
    const want = S.wantSlot || null;
    const rows = [];
    for (const p of ["fw", "wg", "mf", "df"]) {
      for (const sl of WingerSquad.slotsOf(p)) {
        const on = p === S.pos;
        const here = on && !!now && sl.key === now.key;
        rows.push({ sl, on, here, want: on && want === sl.key });
      }
    }
    /* 줄(row)로 묶어서 실제 배치처럼 세워요 — 앞선이 위, 수비가 아래예요 */
    const byRow = {};
    for (const r of rows) (byRow[r.sl.row] = byRow[r.sl.row] || []).push(r);
    const body = Object.keys(byRow).sort((a, b) => a - b).map((k) =>
      `<div class="pf-row">${byRow[k]
        .sort((a, b) => a.sl.col - b.sl.col)
        .map((r) => (r.on
          /* 내 포지션 자리는 **누를 수 있어요.** 목업의 격자가 보기만 하는 그림이면
           * 자리 효과가 그냥 노이즈로 읽혀요 — 고를 수 있어야 선택이 됩니다. */
          ? `<button type="button" class="pf-slot on${r.here ? " here" : ""}${r.want ? " want" : ""}"`
            + ` data-slot="${r.sl.key}" title="${r.sl.name}">${r.sl.key}</button>`
          : `<span class="pf-slot" title="${r.sl.name}">${r.sl.key}</span>`))
        .join("")}</div>`).join("");
    /* 원하는 자리를 못 받았으면 **누가 가져갔는지** 적어요. 이유가 안 보이면
     * "눌렀는데 안 되네"가 되고, 그건 고를 수 없는 것과 같아요. */
    let note;
    if (!now) {
      const wantName = want ? (WingerSquad.slotByKey(want) || {}).name : null;
      note = `🪑 이번 경기는 벤치예요`
        + `${wantName ? ` — 노리는 자리는 <b>${wantName}</b>` : " — 자리를 눌러서 고를 수 있어요"}`;
    } else if (want && want !== now.key) {
      const taker = (WingerSquad.matchXI() || [])
        .find((x) => !x.me && x.pos === S.pos && x.slot === want);
      const wantName = (WingerSquad.slotByKey(want) || {}).name || want;
      note = `📍 <b>${now.name}</b> — ${wantName} 자리는 `
        + `${taker ? `<b>${taker.name}</b>(실력 ${Math.round(taker.str)})가` : "다른 선수가"} 맡았어요`;
    } else {
      const fit = now && now.side !== "C"
        ? (mainFoot() === now.side ? " · 🦶 발이 맞아요" : " · 🦶 반대발 자리예요")
        : "";
      note = `📍 <b>${now ? now.name : posName(S.pos)}</b>`
        + `${want ? "" : ` · ${posName(S.pos)} ${mine.length}자리 — 눌러서 고를 수 있어요`}${fit}`;
    }
    return `<div class="pos-field"><div class="pf-grid">${body}</div>`
      + `<div class="pf-note">${note}</div></div>`;
  }
  const posName = (p) => (POS_INFO[p] || {}).name || p;

  /* 🦶 주발·약발 — 발 두 개를 나란히 두고 그 발의 숫자를 적어요.
   * 주발은 늘 10이에요(자기 발이니까요). 약발만 1~10으로 움직입니다. */
  function footHTML() {
    const main = mainFoot(), weak = weakFoot();
    const foot = (side) => {
      const isMain = side === main;
      const v = isMain ? 10 : weak;
      return `<div class="foot ${isMain ? "main" : "weak"}" title="${FOOT_KO[side]}${isMain ? " · 주발" : " · 약발"}">`
        + `<span class="foot-ico">${side === "L" ? "🦶" : "🦶"}</span><b>${v}</b></div>`;
    };
    const mul = footMul();
    return `<div class="feet">${foot("L")}${foot("R")}</div>`
      /* ⚠️ 퍼센트가 **약발에서 왔다는 걸** 적어요. 그냥 "골·도움 -2%"라고만 두면
       * 주발(왼/오른) 때문인 것처럼 읽혀요 — 주발은 지금 아무것도 안 합니다
       * (제보: "주발이 영향주는 건 뭐야??"). 주발은 세부 포지션이 들어올 때
       * 좌우 자리 궁합으로 쓰기로 했어요. */
      + `<div class="foot-note">${FOOT_KO[main]}잡이 · 약발 ${weak}/10`
      + `${Math.abs(mul - 1) > 0.001 ? ` → 골·도움 ${mul >= 1 ? "+" : ""}${Math.round((mul - 1) * 100)}%` : ""}</div>`;
  }

  function renderPrep() {
    checkTitle();
    $("pro-name").textContent = `${S.name} (${POS_INFO[S.pos].name})`;
    /* 👕 미니 유니폼 — 유스 홈과 **같은 함수·같은 색 변수**로 그립니다.
     * 🔴 CSS예요. HUD에서 WebGL이 돌면 안 됩니다(`style.css`의 `.w2-hudkit` 주석). */
    try { if (window.WingerProspect) WingerProspect.paintJersey($("pro-kit"), S); } catch (e) {}
    // 리그 이름을 함께 보여줘요 — 승격·강등하면 여기가 바뀌는 게 제일 먼저 눈에 띄어야 해요
    $("pro-team").textContent =
      `${leagueOf(S).flag} ${S.group}${S.center ? " · 주장" : ""} · ${leagueOf(S).name}`
      /* 🎂 "몇 번째 시즌 / 몇 시즌까지"가 아니라 **나이**를 적어요.
       * 은퇴가 나이로 정해지니 남은 시간을 재는 자도 나이여야 합니다. */
      + `${traitOf(S).tag ? ` · ${traitOf(S).tag}` : ""} · ${S.proYear}시즌 · 만 ${WingerProspect.ageOf(S)}세`
      /* 🏷️ 칭호 — 경쟁자들에게 붙는 것과 **같은 자**로 잽니다. 내 종합만 덩그러니
       * 있으면 그 숫자가 이 리그에서 어느 급인지 알 길이 없어요. */
      /* 최고 클래스를 같이 적어요. 각성으로 능력치를 되돌리면 클래스가 내려가는데,
       * 지금 값만 보이면 "여기까지 갔었다"가 통째로 사라져 손해만 남아 보여요. */
      + ` · 종합 ${Math.round(overall())} ${titleOf(overall())}`
      + `${S.career && S.career.bestTitle != null && S.career.bestTitle > titleIdx(overall())
          ? ` (최고 ${titleAt(S.career.bestTitle)})` : ""}`;
    $("pro-turn").textContent = S.activity
      ? `${cbLabel(S.activity.cb)} · R${S.activity.week}/${S.activity.weekTotal} · MOM ${S.activity.wins}회`
      : `시즌 준비 ${3 - S.camp}/3`;
    /* 칭호의 효과를 돈 줄에 붙여요 — 칭호만 띄우면 "그래서 뭐가 좋은데"가 남아요.
     * ×1.00(🪑 벤치 자원)일 때는 안 붙여요. 아무 일도 안 하는 배수를 늘 띄우면
     * 화면만 시끄러워집니다. */
    const payMul = titlePayMul(titleIdx(overall()));
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`
      + (payMul > 1 ? ` · 수당 ×${payMul.toFixed(2)}` : "");
  $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    /* 🌏 월드컵 — 테마는 **S.wc에서 파생**시켜요(켜고 끄는 게 아니라). 끄는 쪽을
     * 한 경로라도 놓치면 리그로 돌아왔는데 화면이 월드컵인 채로 남는데, CSS는
     * 이 저장소의 자동 검증 사각지대라 기계가 못 잡아요. 파생이면 자기 복구형입니다.
     * 초대장은 후반기 준비 화면에서 문턱을 넘는 순간 떠요(래칫 — 한 번 넘으면 안 뺏겨요). */
    if (window.WingerWorldCup && isPro()) {
      WingerWorldCup.themeSync();
      /* ⚠️ 초대장을 띄운 뒤에도 **렌더를 계속해요.** 여기서 return 하면 준비 화면이
       * 반쯤 그려진 채로 남아, 오버레이를 닫았을 때 훈련 버튼이 없는 화면을 봅니다.
       * 오버레이는 위에 뜨는 모달이지 화면을 대신하는 게 아니에요. */
      WingerWorldCup.checkInvite();
    }

    /* 🎖️ 이번 시즌 칭호 — 지난 시즌에 받아 온 거예요. 효과가 경기에 붙으니
     * 경기 화면으로 가기 전에 항상 보여야 해요. 없으면 줄 자체를 감춰요. */
    const buffs = activeBuffs(S);
    const bbox = $("pro-buffs");
    if (bbox) {
      bbox.hidden = buffs.length === 0;
      bbox.innerHTML = buffs.length
        ? `<span class="buff-head">🎖️ ${S.proYear}시즌 칭호</span>`
          + buffs.map((t) => `<span class="buff-chip" title="${t.need}">${t.name}<b>${t.desc}</b></span>`).join("")
        : "";
    }

    /* 🌏 월드컵 배지 — 월드컵 시즌에만 한 줄. 남은 리그가 "월드컵을 향한 일정"으로
     * 읽히게 하는 것이 이 줄의 일이에요. */
    const wcBox = $("pro-wc");
    if (wcBox) {
      const html = (window.WingerWorldCup && isPro()) ? WingerWorldCup.badgeHTML() : "";
      wcBox.hidden = !html;
      wcBox.innerHTML = html;
    }

    /* 🏆 리그 순위표 — 시즌 중에만 보여줘요. 접어둬서 훈련 화면이 길어지지 않게 합니다.
     * "리그 경기중인데 리그 팀 순위표를 볼 수가 없네"에서 나왔어요. */
    const tbl = $("pro-table");
    /* 시즌 준비 중에도 보여줘요. 표는 원래 시즌이 시작될 때 만들어져서, 승격 직후
     * 준비 화면에서는 "내가 어느 리그에 왔는지"를 볼 방법이 없었어요.
     * 아직 없으면 새 리그의 표를 미리 만들어 둡니다 (전부 0경기로 시작해요). */
    /* ⚠️ 값은 "winger2-pro"예요 (career.js:127에서 그렇게 넣습니다).
     * 여기서 "pro"와 비교하고 있어서 **이 줄이 한 번도 안 돌았어요** —
     * 2.28.0에 넣은 "시즌 준비 중에도 순위표를 보여준다"가 내내 죽어 있었습니다.
     * 개인 순위를 붙이면서 같은 자리에 걸려 드러났어요. */
    if (isPro() && !tableReady()) { initTable(); save(); }
    /* 🌏 대회 중에는 이 자리가 **우리 조**를 봐요. 리그 순위표가 그대로 떠 있으면
     * 화면이 딴 데를 보고 있는 겁니다 — 지금 치르는 건 리그가 아니에요. */
    if (S.wc && window.WingerWorldCup) {
      tbl.hidden = false;
      $("pro-table-sum").textContent = WingerWorldCup.groupSumText();
      $("pro-table-body").innerHTML = WingerWorldCup.tableHTML();   // 조별리그면 조 순위, 토너먼트면 대진표
    } else if (tableReady()) {
      tbl.hidden = false;
      const rows = tableRows();
      const me = rows.find((r) => r.name === S.group);
      const played = me ? me.w + me.d + me.l : 0;
      $("pro-table-sum").textContent = played
        ? `🏆 ${leagueOf(S).name} ${myTableRank()}위 · ${me.w}승 ${me.d}무 ${me.l}패 · 승점 ${me.pts}`
        : `🏆 ${leagueOf(S).name} — 개막 전 (${tableRows().length}팀)`;
      $("pro-table-body").innerHTML = tableHTML();
    } else {
      tbl.hidden = true;
    }

    /* 👥 스쿼드는 레이어로 띄워요(버튼은 HUD에). 여기서는 **선발인지 벤치인지만**
     * 버튼에 적어요 — 그게 매 경기 알아야 하는 한 줄이고, 명단 전체는 눌러서 봐요. */
    const sqBtn = $("btn-squad-pro");
    /* 🌏 대회 중에는 **클럽 선발 확률이 아무 의미가 없어요** — 지금 뛰는 건
     * 대표팀이니까요. 같은 자리를 우리 조로 바꿔 씁니다. */
    if (sqBtn && S.wc && window.WingerWorldCup) {
      sqBtn.hidden = false;
      sqBtn.textContent = "🌏 우리 조";
      sqBtn.onclick = () => WingerWorldCup.openGroup();
    } else if (sqBtn && window.WingerSquad && isPro() && S.group) {
      sqBtn.hidden = false;
      /* 준비 화면에서는 **확정이 아니라 확률**을 보여줘요. 선발은 경기 시작 때
       * 다시 뽑히니, 여기서 "선발"이라고 못 박으면 화면이 거짓말을 하게 돼요. */
      const L = WingerSquad.myLine();
      sqBtn.textContent = `👥 선발 ${Math.round(L.odds * 100)}%`;
      sqBtn.onclick = () => WingerSquad.openSquad();
    } else if (sqBtn) {
      sqBtn.hidden = true;
    }

    /* 🥇 개인 순위 — 시즌 중에만 보여줘요. 득점왕 경쟁이 눈에 보여야
     * "한 골 더"에 이유가 생겨요. 부문상이 이 표 1위한테 갑니다. */
    const race = $("pro-race");
    ensureLeagueRecords();            // 옛 세이브에도 명단 기록을 채워요
    /* 🌏 대회 중에는 **대회 개인 기록**을 봐요. 리그 득점왕 표를 그대로 두면
     * 국대 골이 거기 섞인 것처럼 읽혀요(실제로는 안 섞이지만, 화면이 그렇게
     * 보이면 그게 곧 제보가 됩니다). */
    if (S.wc && window.WingerWorldCup) {
      race.hidden = false;
      $("pro-race-sum").textContent = "🥇 월드컵 개인 순위";
      const drawWcRace = () => {
        $("pro-race-body").innerHTML = WingerWorldCup.raceHTML();
        /* 부문 탭은 그릴 때마다 새로 만들어져요 — 그릴 때마다 다시 물려 줘야
         * 두 번째 클릭부터 죽지 않아요(리그 개인 순위와 같은 방식이에요). */
        WingerWorldCup.wireFaceTabs($("pro-race-body"), drawWcRace);
      };
      drawWcRace();
    } else if (S.activity && S.activity.apps != null) {
      race.hidden = false;
      ensureLeagueRecords();
      renderRace();
    } else if (isPro()) {
      /* 🥇 시즌 준비 중에는 S.activity가 아예 없어요 — 시즌이 시작될 때 만들어지거든요.
       * 그대로 두면 준비 화면 내내 개인 순위가 **통째로 사라져** "왜 안 보이지"가 됩니다.
       *
       * 여기에 "시즌이 시작되면 …와 겨뤄요" 같은 안내를 적어 뒀었는데, 굳이 없어도
       * 되는 문구였어요(제보). 이제 개인 순위가 **리그 명단**을 읽으니 개막 전에도
       * 표를 그대로 그릴 수 있습니다 — 설명 대신 **누구와 겨루는지 보여줘요.**
       * 아직 아무 기록도 없으니 그때는 실력 순으로 세웁니다(raceRank). */
      race.hidden = false;
      renderRace();
    } else {
      race.hidden = true;
    }

    const stats = $("pro-stats");
    stats.innerHTML = "";
    /* 📊 레이더 + 🦶 발 — 숫자 막대만 있으면 "이 선수가 어떤 모양인가"가 안 읽혀요.
     * 막대는 그대로 둬요 — 🔮 각성·🌠 초월 버튼이 거기 붙어 있고, 정확한 값도
     * 막대 쪽에서 봅니다. 레이더는 **한눈에 보는 모양**을 맡아요.
     * radar.js는 8종이 함께 쓰는 파일이라 여기서 새로 만들지 않습니다. */
    const shape = document.createElement("div");
    shape.className = "stat-shape";
    shape.innerHTML = `<canvas class="stat-radar" width="240" height="240"></canvas>`
      + `<div class="foot-box">${footHTML()}${isPro() ? slotFieldHTML() : ""}</div>`;
    stats.appendChild(shape);
    for (const b of shape.querySelectorAll(".pf-slot.on")) {
      b.onclick = () => {
        /* 이미 고른 자리를 다시 누르면 놓아요 — 감독에게 맡기는 상태로 돌아가요 */
        WingerSquad.wantSlot(S.wantSlot === b.dataset.slot ? null : b.dataset.slot);
        WingerSquad.rollLineup();
        renderPrep();
      };
    }
    if (window.Radar) {
      /* 상한이 초월로 늘어나요 — 눈금을 고정하면 130짜리가 칸을 뚫고 나가요.
       * 지금 상한 중 가장 큰 값에 맞춰 그립니다. */
      const max = Math.max(...STAT_DEFS.map((d) => statCap(d.key)));
      Radar.draw(shape.querySelector(".stat-radar"), STAT_DEFS, S.stats, {
        max, stroke: "#6ee7a0", fill: "rgba(110, 231, 160, 0.22)",
      });
    }
    for (const d of STAT_DEFS) {
      const v = Math.round(S.stats[d.key]);
      const tv = S.talents[d.key], tl = transLv(d.key);
      const stars = talentStarStr(tv) + (isTalentMax(tv) ? (tl ? ` <span class="tr">✨${tl}</span>` : " MAX") : "");
      const row = document.createElement("div");
      row.className = "stat-row" + (window.W2Grade ? " graded" : "");
      /* 📊 유스와 **같은 자**를 씁니다 — 프로에서 등급이 갑자기 바뀌면
       * 승급 카드가 거짓말이 돼요 (grade.js §어떤 값을 등급으로 옮기는가). */
      const gradeHTML = window.W2Grade ? W2Grade.partHTML(S.stats[d.key])
        : `<div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>`;
      row.innerHTML = `
        <span class="stat-name">${d.emoji} ${d.name}</span>
        ${gradeHTML}
        <span class="stat-val${v >= statCap(d.key) ? " max" : ""}" title="상한 ${statCap(d.key)}">${v}</span>
        <span class="stat-pot" title="잠재력 — 별이 많을수록 훈련 효율이 높아요">${stars}</span>`;
      if (v >= 100) {
        const aw = document.createElement("button");
        aw.className = "mini-btn awaken-btn" + (v >= statCap(d.key) ? " ready" : "");
        aw.textContent = isTalentMax(tv) ? "🌠 초월" : "🔮 각성";
        aw.onclick = () => { if (awakenTalent(d.key, proLog)) renderPrep(); };
        row.appendChild(aw);
      }
      stats.appendChild(row);
    }
    // 🎉 승급 감지 — 프로 훈련·벤치 주·각성이 전부 이 화면을 다시 그려요
    if (window.W2Grade) W2Grade.tick(S, STAT_DEFS, POS_INFO[S.pos].stat);

    if (S.wc) {
      $("pro-camp-title").textContent = S.wc.ready
        ? `🌏 대표팀 훈련 완료 — 경기를 시작하세요!`
        : `🌏 월드컵 소집 중 — 대표팀 훈련 ${S.camp}회 남음`;
    } else
    $("pro-camp-title").textContent = S.pendingShow
      ? (S.activity.week === 0
        ? `⚽ ${cbLabel(S.activity.cb)} 리그 준비 완료 — 경기를 시작하세요!`
        : `🔔 킥오프! R${S.activity.week + 1} 경기를 시작하세요`)
      : (S.cupReady
        ? `🏆 ${cupName()} 8강 준비 완료 — 경기를 시작하세요!`
        : S.cupPrep
        // 🏆 컵 준비는 리그와 다른 자리예요 — 뭘 앞두고 훈련하는지 알려줘야 해요
        ? `🏆 ${cupName()} 8강 준비 — 남은 훈련 ${S.camp}회, 끝나면 단판 토너먼트!`
        : S.activity
          ? `시즌 중 — 다음 경기 전 훈련 ${S.camp}회 남음`
          : `시즌 준비 — 남은 훈련 ${S.camp}회, 끝나면 리그 개막!`);
    const box = $("pro-actions");
    box.innerHTML = "";
    for (const d of STAT_DEFS) {
      const btn = document.createElement("button");
      // 상한에 닿으면 훈련해도 오르지 않아요 — 각성/초월로 바꿔줍니다
      if (atCap(d.key)) {
        const tmax = isTalentMax(S.talents[d.key]);
        const pct = Math.round((tmax ? transP(transLv(d.key)) : awakenP(Math.round(S.stats[d.key]))) * 100);
        btn.dataset.key = d.key;
        btn.className = "action-btn awaken-act";
        btn.innerHTML = `<span class="a-emoji">${tmax ? "🌠" : "🔮"}</span>${d.name} ${tmax ? "초월 각성" : "재능 각성"}<span class="a-sub">상한 ${statCap(d.key)} 도달 · 성공률 ${pct}%</span>`;
        btn.onclick = () => { if (awakenTalent(d.key, proLog)) renderPrep(); };
      } else {
        btn.dataset.key = d.key;
        btn.className = "action-btn";
        btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
        btn.onclick = () => prepAction(d);
      }
      box.appendChild(btn);
    }
    box.appendChild(makeAdSlotButton(renderPrep));
    const rest = document.createElement("button");
    rest.className = "action-btn rest";
    rest.dataset.key = "__rest";
    rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 회복</span>`;
    rest.onclick = () => prepAction(null);
    box.appendChild(rest);

    /* 🌏 월드컵 훈련 턴이 끝났으면 훈련을 잠그고 경기 버튼만 남겨요.
     * 컵의 cupReady와 같은 자리·같은 모양이에요. */
    if (S.wc && S.wc.ready && window.WingerWorldCup) {
      box.querySelectorAll(".action-btn").forEach((b) => {
        if (!b.classList.contains("ad-slot")) b.disabled = true;
      });
      box.appendChild(WingerWorldCup.startButton(seasonEnd));
    }

    /* 🏆 컵 준비가 끝났으면 훈련을 잠그고 시작 버튼만 남겨요.
     * 리그의 "경기하러 가기"와 같은 자리·같은 모양이에요. */
    if (S.cupReady) {
      box.querySelectorAll(".action-btn").forEach((b) => {
        if (!b.classList.contains("ad-slot")) b.disabled = true;
      });
      const cupGo = document.createElement("button");
      cupGo.className = "action-btn rest go-game";
      cupGo.innerHTML = `<span class="a-emoji">🏆</span>${cupName()} 8강 시작`
        + `<span class="a-sub">단판 토너먼트 — 지면 끝이에요</span>`;
      cupGo.onclick = () => { S.cupPrep = false; S.cupReady = false; save(); startCup(); };
      box.appendChild(cupGo);
    }

    if (S.pendingShow) {
      box.querySelectorAll(".action-btn").forEach((b) => {
        if (!b.classList.contains("ad-slot")) b.disabled = true;
      });
      const go = document.createElement("button");
      go.className = "action-btn rest go-game";
      go.innerHTML = S.activity.week === 0
        ? `<span class="a-emoji">⚽</span>${cbLabel(S.activity.cb)} 개막전<span class="a-sub">전술 미팅 → 킥오프</span>`
        : `<span class="a-emoji">🔔</span>리그 경기<span class="a-sub">R${S.activity.week + 1}/${S.activity.weekTotal} 주간 활약 경쟁</span>`;
      go.onclick = playShow;
      box.appendChild(go);
    }

    $("pro-log").innerHTML = (S.proLog || [])
      .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
      .join("");
  }

  function prepAction(def) {
    // 상한에 닿았으면 훈련은 턴만 소모돼요 — 각성으로 돌려줍니다
    if (def && atCap(def.key)) { if (awakenTalent(def.key, proLog)) renderPrep(); return; }
    if (def) {
      /* 🏋️ 훈련 상승폭 — 성장타입 × **정점 나이 기준** 효율 (prospect.js `trainMul`).
       * 옛것은 `proYear <= 4 ? 1.1 : ...`이라 조숙도 만성도 같은 자리에서 꺾였어요. */
      const yearMod = WingerProspect.trainMul(S);
      const failP = S.condition < 40 ? 0.15 : 0.07;
      if (Math.random() < failP) {
        const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
        S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
        S.condition = clamp(S.condition - wear(randInt(6, 10)), 0, 100);
        proLog(`😵 ${def.name} 훈련이 꼬였어요… -${loss.toFixed(1)}`);
      actFx(def.key, "-" + loss.toFixed(1), true);
        S.camp -= 1;
        save();
        afterPrep();
        return;
      }
      const condMod = S.condition >= 70 ? 1.1 : S.condition >= 40 ? 1.0 : 0.6;
      /* 🌍 지금 뛰는 나라가 훈련에 얹혀요 — 🇯🇵는 전반적으로, 🇧🇷·🇮🇹는 잘 가르치는
       * 능력치 하나에만. 어느 리그에 머물지가 수상 값어치만의 문제가 아니게 됩니다. */
      const natMul = traitMul(S, "train") * traitFocusMul(S, def.key);
      // 🌟 신인왕 칭호가 훈련 상승폭에 붙어요 (그 한 시즌만)
      let gain = rand(1.8, 3.6) * S.talents[def.key] * yearMod * condMod * natMul * buffMul("train");
      if (S.stats[def.key] >= 100) gain *= 0.5;
      gain = Math.round(gain * 10) / 10;
      S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, statCap(def.key));
      S.condition = clamp(S.condition - wear(randInt(10, 16)), 0, 100);
      const natTag = natMul > 1.01 ? ` ${leagueOf(S).flag}` : "";
      proLog(`${def.emoji} ${def.name} 훈련 +${gain.toFixed(1)}${natTag} (${Math.round(S.stats[def.key])})`);
      actFx(def.key, "+" + gain.toFixed(1));
    } else {
      const heal = Math.round(randInt(25, 40) * traitMul(S, "rest"));
      S.condition = clamp(S.condition + heal, 0, 100);
      proLog(`🛌 컨디션 회복 +${heal}${traitMul(S, "rest") > 1.01 ? ` ${leagueOf(S).flag}` : ""} (${Math.round(S.condition)})`);
    }
    S.camp -= 1;
    save();
    afterPrep();
  }

  // ---------- 리그 경기 (주 1회, 주간 활약 경쟁) ----------
  /* 평점은 10점 만점이에요.
   * 순위 점수(score)에는 결정적 순간 보정(±8)과 흔들림(±4)이 평점 뒤에 얹혀서
   * 최대 112까지 올라가요. 그건 MOM 순위를 가리는 값이지 평점이 아닌데,
   * 그대로 10으로 나눠 보여줘서 10.7 같은 평점이 찍혔어요.
   * 순서는 원래 점수로 가리고, 보여줄 때만 10점으로 맞춥니다. */
  /* 주간 평점 순위. 상위 5명만 보여주되, 내가 5위 밖이면 내 줄을 아래에 붙여요 —
   * 예전에는 5위 밖이면 내 평점이 아예 안 보여서 "몇 점 받았는지"를 알 수가 없었어요. */
  function chartHTML(rows, top) {
    const N = top || 5;
    const shown = rows.slice(0, N);
    const myIdx = rows.findIndex((r) => r.me);
    /* 소속 옆의 승·무·패는 **그 라운드 그 클럽의 결과**예요. 라이벌 점수가 이걸 보고
     * 오르내리니 근거가 화면에 있어야 해요 — 없으면 순위가 왜 뒤집혔는지 알 수가 없어요.
     * 한 글자 inline이라 줄을 새로 만들지 않아요. */
    const line = (r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td>`
      + `<td class="ch-club">${r.club || (r.me ? S.group : "-")}`
      + `${r.res ? `<span class="ch-res r-${r.res.toLowerCase()}">${RES_KO[r.res] || ""}</span>` : ""}`
      + `${r.role ? `<span class="ch-role">${r.role}</span>` : ""}</td>`
      + `<td>${clamp(r.score / 10, 1, 10).toFixed(1)}</td></tr>`;
    const pinned = myIdx >= N
      ? `<tr class="hof-gap-row"><td colspan="4">⋯</td></tr>` + line(rows[myIdx], myIdx)
      : "";
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>선수</th><th>소속</th><th>평점</th></tr></thead>
      <tbody>${shown.map(line).join("")}${pinned}</tbody></table>`;
  }

  function playShow() {
    const act = S.activity;
    act.opp = pick(oppClubs(S)); // 이번 상대 — 같은 리그에서 내 클럽을 빼고 뽑아요
    /* 🪑 선발은 **경기마다 다시 뽑아요.** 실력이 주지만 그날 몸 상태와 흔들림이
     * 얹혀서, 경계에 있으면 이번 주에 뛰고 다음 주에 앉을 수 있어요. */
    if (window.WingerSquad) {
      /* 🪑 선발은 **그 라운드에 한 번만** 뽑아요.
       * 이 화면은 다시 들어올 수 있어요(앱을 껐다 켜거나 중간에 나갔다 오면
       * S.pendingShow가 살아 있어서 "경기하러 가기"가 또 떠요). 그때마다 다시
       * 굴리면 같은 라운드의 선발이 계속 바뀝니다. */
      if (act.xiWeek !== act.week) WingerSquad.rollLineup();
      if (!WingerSquad.isStarter()) { benchShow(act); return; }
      /* ⚠️ **출전 수는 여기서 세지 않아요.** 화면을 열 때 세면 다시 들어올 때마다
       * 또 세어져서, 12라운드인데 동료 출전 수가 20이 됩니다(제보: "김우진은
       * 어떻게 경기수가 20이지"). 내 출전 수(act.apps)와 **같은 자리**에서 세요. */
    }
    $("stage-title").textContent = `⚽ ${S.proYear}시즌 ${cbLabel(act.cb)} — ${S.group}`;
    $("stage-round").textContent = `R${act.week + 1}/${act.weekTotal} 리그 · vs ${act.opp}`;
    show("screen-stage");

    const oppStr = clubStrByName(act.opp, S);
    ensureLeagueRecords();   // 명단이 있어야 동료가 골을 넣어요
    runV2Match(act, oppStr);
  }

  /* ---------- 🎬 v2 경기 드라이버 ----------
   *
   * 엔진은 카드를 **한 장씩** 냅니다. 마지막 카드 전까지 스코어가 미확정이에요 —
   * 그래서 화면이 "이미 정해진 결과를 재생"하는 게 아니라 같이 진행합니다.
   *
   * 화면은 director의 match-scene.js(window.W2Scene)가 그려요. 딜레이·타이핑·골 연출이
   * 전부 그쪽에 있고, push()가 돌려주는 Promise를 여기서 기다립니다.
   * (붙기 전에 쓰던 최소 피드 fallbackLine은 지웠어요 — 이제 안 지나가는 갈래예요.)
   *
   * ⚠️ 미니게임은 반드시 click에서 열어요. pointerdown 핸들러 안에서 화면을 갈아치우고
   *    그 자리에 새 클릭 대상을 그리면 손을 뗄 때 그게 click을 받아 **즉시 두 번 먹힙니다.** */
  const CARD_DELAY = { near: 900, far: 350 };   // 1점 차 이내 · 3점 차 이상 (13번 §5-5)
  /* 결과 요약이 들어갈 자리. 현행 soccer는 MatchSim이 경기 화면을 그릴 때 이 칸을 같이
   * 만들었는데(game.js) v2 화면(W2Scene)에는 없어요 — 없으면 여기서 만듭니다.
   * #stage-card 안에 넣어서 다음 경기의 mount가 통째로 지우게 둡니다. */
  function resultSlot() {
    let el = $("stage-result");
    if (!el) {
      el = document.createElement("div");
      el.id = "stage-result";
      ($("stage-card") || document.body).appendChild(el);
    }
    return el;
  }
  function runV2Match(act, oppStr) {
    const xi = (window.WingerSquad ? WingerSquad.matchXI() : []).map(engRow);
    const m = WingerEngine.createMatch({
      xi, homeName: S.group, oppName: act.opp,
      teamStr: clubStrOf(S), oppStr, condition: S.condition,
    });
    const scene = window.W2Scene || null;
    const host = $("stage-card");
    if (scene && scene.mount) scene.mount(host, { home: S.group, away: act.opp, myName: S.name });
    else if (host) host.innerHTML = "";

    /* ⏩ 경기 중에는 그 버튼이 **빨리감기**예요.
     *
     * ⚠️ 이 줄이 없으면 **지난 라운드의 "다음 경기 준비"가 그대로 살아 있습니다** —
     * 경기 중에 누르면 라운드가 두 번 넘어가요. 화면(#stage-card)은 갈아 끼웠는데
     * 버튼은 그 바깥의 고정 자리라 안 지워집니다.
     *
     * ⚠️ click으로 겁니다. pointerdown 핸들러에서 화면을 갈아치우고 그 자리에 새
     * 클릭 대상을 그리면 손 뗄 때 그게 click을 받아 즉시 두 번 먹혀요.
     *
     * ⏩는 **연출만** 짧게 해요 — 순간 카드는 그대로 열립니다. 개입을 확률 굴림으로
     * 대체하면 게임이 사라져요(현행 더 윙어가 그랬습니다). */
    const fastBtn = $("btn-stage-next");
    if (fastBtn) {
      fastBtn.onclick = null;
      if (scene && scene.fast) {
        fastBtn.hidden = false; fastBtn.disabled = false; fastBtn.textContent = "⏩ 빨리감기";
        fastBtn.onclick = () => { scene.fast(); fastBtn.disabled = true; };
      } else { fastBtn.hidden = true; }
    }

    const step = () => {
      let card;
      try { card = m.next(); } catch (e) { console.error(e); card = null; }
      if (!card) return done();
      /* 🔥 내 순간 카드 — 판정이 아직 안 들어온 카드예요.
       *
       * 🤖 경기 자동 진행이 켜져 있으면 미니게임을 **아예 안 열고** 지금의 확률
       * 굴림(autoJudge)을 그대로 씁니다. ⏩ 빨리감기와는 다른 자리예요 —
       * ⏩는 연출만 짧게 하고 개입은 유지합니다(설계 §5-5). */
      if (m.pending) {
        const mini = WingerEngine.getMini();
        const slot = (scene && scene.momentSlot && scene.momentSlot()) || $("stage-moment");
        /* 🧱 **수비는 미니게임을 안 엽니다** (117번 §6 · c안). 아래 `m.autoJudge()`가
         * `judgeAt(kind, 0.5)`이고 `cardP(autoP, a, 0.5) = autoP`라, **결과가 자동 갈래와
         * 정의상 같아요** — 육성(`autoP`가 내 수비 능력치를 탑니다)은 그대로 살고 조작만 빠집니다.
         * 🔒 **「카드」로 부르지 않습니다** — 손잡이처럼 보이는데 아무것도 안 하면 노이즈예요.
         * 🔓 수비용 격자가 생기면 이 한 줄에서 `&& m.pendingKind !== "defend"`만 빼면 됩니다. */
        if (mini && slot && !autoMiniOn() && m.pendingKind !== "defend") {
          if (scene && scene.push) scene.push(card);
          mini(slot, {
            kind: m.pendingKind, moment: card.moment, condition: S.condition,
            foot: mainFoot(),                        // 🦶 주발 쪽 코스가 판정 창 +25%예요
            /* 조작 성공도 s → 판정. 산식(§2-6)은 엔진 안에 있어요 —
             * 미니게임은 조작만 재고, 확률로 옮기는 일은 엔진이 합니다. */
            judge: (s) => m.judgeFor(s),
          }, (judge) => { m.resolve(judge); draw(card); });
          return;
        }
        m.resolve(m.autoJudge());
      }
      draw(card);
    };
    const draw = (card) => {
      const shown = scene && scene.push ? scene.push(card) : null;
      const gap = Math.abs(card.score[0] - card.score[1]) >= 3 ? CARD_DELAY.far : CARD_DELAY.near;
      /* 화면이 "다 그렸어요"를 thenable로 돌려주면 그걸 기다려요.
       * 안 돌려주면 위 딜레이를 씁니다 — 양쪽 다 되게 두면 화면이 먼저 붙어도 안 깨져요. */
      if (shown && typeof shown.then === "function") shown.then(step, step);
      else setTimeout(step, gap);
    };
    const done = () => {
      const info = m.result();
      if (scene && scene.summary) scene.summary({ mineCards: info.mineCards, mineSuccess: info.mineSuccess });
      /* 🔴 proMatchFinalize는 **{resultHTML, nextLabel, nextFn}을 돌려주는 함수**예요.
       * 반환값을 버리면 스코어·평점 순위·수당 요약이 안 그려지고, 무엇보다 버튼에
       * 아무것도 안 물려서 **경기가 끝난 뒤 아무 데도 갈 수 없습니다**(막다른 길).
       * 🪑 벤치 갈래(benchShow)는 버튼을 직접 물리는데 **뛴 주만** 빠져 있었어요 —
       * v2.48.0의 pendingShow 사고와 같은 모양(여러 입구 중 하나만 빠짐)입니다. */
      const out = proMatchFinalize(act, info);
      if (!out) return;
      resultSlot().innerHTML = out.resultHTML;
      const b = $("btn-stage-next");
      if (b) { b.hidden = false; b.disabled = false; b.textContent = out.nextLabel; b.onclick = out.nextFn; }
    };
    step();
  }

  /* 🪑 벤치인 주 — 경기는 팀만 치르고 나는 훈련장에 남아요.
   *
   * "선발이 아니면 스탯을 랜덤하게 하나 올려주면 되지 않을까"라는 제안 그대로예요.
   * 결장이 곧 성장 정지가 되면 벤치는 그냥 벌이 되고, 그건 이탈로 이어져요.
   *
   * 리그는 나 없이도 굴러가야 해요 — 우리 팀 결과는 **전력 대 전력**으로 뽑고
   * (내 활약이 없으니 평점 항은 중간값 6.5로 둬요), 순위표와 경쟁자 명단도
   * 똑같이 한 라운드를 진행합니다. 안 그러면 벤치인 주만 리그가 멈춰요. */
  function benchShow(act) {
    const oppStr = clubStrByName(act.opp, S);
    /* 🪑 내가 없는 주도 **같은 카드 루프**로 굴려요 — 나만 명단에서 빠집니다.
     * 예전에는 벤치인 주만 다른 자(teammateGoals)라서 팀 득점이 뚝 떨어졌어요. */
    ensureLeagueRecords();
    const benchXI = (window.WingerSquad ? WingerSquad.matchXI() : []).filter((x) => !x.me).map(engRow);
    const oppXI = (window.WingerSquad ? WingerSquad.startingXIOf(act.opp) : []).map(engRow);
    const r0 = WingerEngine.autoMatch({
      xiA: benchXI, xiB: oppXI, strA: clubStrOf(S), strB: oppStr,
    });
    const mates = r0.gf, conceded = r0.ga;
    const res = mates > conceded ? "W" : mates < conceded ? "L" : "D";
    /* 우리 팀 몫은 여기서 나온 것 그대로 넘겨요 — recordRound가 나머지 클럽을 굴립니다.
     * 상대 클럽 몫은 recordRound가 스코어(out[opp].gf)로 나눠 줘요. */
    /* 두 클럽을 한 루프로 굴렸으니 **양쪽 기록을 다 넘겨요** — oppDone으로
     * recordRound가 상대 몫을 다시 나누지 않게 막습니다(두 번 세면 골이 두 배예요). */
    const mm = new Map();
    const bump2 = (er, k, n) => { const v = mm.get(er) || { row: er, g: 0, a: 0, d: 0 }; v[k] += n; mm.set(er, v); };
    for (const { scorer, assister } of r0.goalsA.concat(r0.goalsB)) {
      bump2(scorer, "g", 1);
      if (assister) bump2(assister, "a", 1);
    }
    for (const [er, n] of r0.defA) bump2(er, "d", n);
    for (const [er, n] of r0.defB) bump2(er, "d", n);
    const roundRes = recordRound(act.opp, res, mates, conceded,
      { mates: Array.from(mm.values()), oppDone: true });
    leagueRound(roundRes);                      // 리그 전 선발이 그 라운드를 치러요
    const grew = WingerSquad.benchTurn();
    const L = WingerSquad.myLine();

    act.week += 1;
    if (res === "W") act.teamW = (act.teamW || 0) + 1;
    else if (res === "D") act.teamD = (act.teamD || 0) + 1;
    else act.teamL = (act.teamL || 0) + 1;
    S.fandom = Math.max(0, (S.fandom || 0) - randInt(0, 3));   // 안 뛰면 조금씩 잊혀요
    /* ⚠️ **경기를 치렀다는 표시를 여기서도 내려야 해요.** 이 줄이 없으면 벤치인 주에
     * `pendingShow`가 켜진 채로 남고, 다음 준비 화면이 "훈련 2회 남음"이라고 적어
     * 놓고도 훈련 버튼 여섯 개를 전부 잠가 버려요. 눌러도 아무 일이 안 나서 화면이
     * 통째로 먹통으로 읽힙니다(제보: "벤치일 때 누르면 반응 없는데").
     * 뛴 주에는 proMatchFinalize가 같은 일을 해요 — 벤치 갈래만 빠져 있었습니다. */
    S.pendingShow = false;
    proLog(`🪑 ${act.opp}전 결장 — 훈련장에서 ${grew.name} +${grew.gain.toFixed(1)}`
      + ` · 🛌 컨디션 ${Math.round(grew.cond)}`);
    save();

    $("stage-title").textContent = `⚽ ${S.proYear}시즌 ${cbLabel(act.cb)} — ${S.group}`;
    $("stage-round").textContent = `R${act.week}/${act.weekTotal} 리그 · vs ${act.opp}`;
    $("stage-card").innerHTML = `
      <div class="bench-card">
        <div class="draft-emoji">🪑</div>
        <div class="draft-title">이번 주는 벤치예요</div>
        ${WingerSquad.benchReason(L)}
        <div class="ms-final ${res === "W" ? "win" : res === "L" ? "lose" : ""}">
          ${S.group} ${mates} : ${conceded} ${act.opp} · ${RES_LABEL[res]} (나 없이)</div>
        <div class="tour-pts">${grew.emoji} 훈련장에서 <b>${grew.name} +${grew.gain.toFixed(1)}</b>
          · 🛌 컨디션 <b>${Math.round(grew.cond)}</b></div>
      </div>`;
    /* ⚠️ #stage-result는 건드리지 않아요 — 그 요소는 **MatchSim이 경기 화면을
     * 그릴 때 만드는** 것이라, 벤치 화면(여기)에서는 아직 없습니다.
     * 없는 걸 만지다 함수가 그 자리에서 죽었고, 그래서 리그 경기 버튼을 눌러도
     * 아무 반응이 없었어요(제보). 벤치 카드는 위에서 이미 다 그렸습니다. */
    /* 다음 화면은 **경기를 뛴 주와 같은 갈래**를 따라요 — 반기가 끝났으면 다음
     * 반기 준비, 리그가 끝났으면 컵이나 결산. 벤치라고 흐름이 달라지면 안 돼요. */
    const cbDone = act.week >= act.weekTotal;
    let nextLabel, nextFn;
    if (!cbDone) {
      nextLabel = `🏋️ 다음 경기 준비 (R${act.week + 1})`;
      nextFn = () => { S.camp = 2; save(); renderPrep(); show("screen-pro"); };
    } else if (act.cb < act.cbTotal) {
      nextLabel = `⚽ ${cbLabel(act.cb + 1)} 준비하기`;
      nextFn = () => { S.camp = 3; save(); renderPrep(); show("screen-pro"); };
    } else if (cupEntry()) {
      nextLabel = `🏆 ${cupName()} 준비하기`;
      nextFn = () => { S.camp = CUP_CAMP; S.cupPrep = true; save(); renderPrep(); show("screen-pro"); };
    } else {
      nextLabel = "🏁 시즌 결산";
      nextFn = seasonEnd;
    }
    const btn = $("btn-stage-next");
    if (btn) {
      btn.hidden = false; btn.disabled = false;
      btn.textContent = nextLabel;
      btn.onclick = nextFn;
    }
    show("screen-stage");
  }

  // 프로 경기 결과 반영 (MOM 평점 순위 + 보상 + 다음 진행)
  /* 🏅 MOM 절대 문턱 — 그 라운드 리그 최고 평점이면서 이 값 이상일 때만 (13번 §2-8).
   *
   * v2는 카드가 8칸이라 **평점 분산이 작아** 상위 선수가 라운드 최고를 더 자주
   * 가져갑니다 — 실측에서 K1 기준 현행 6% → 12%였어요.
   * 🏆 명예의 전당은 `grow-hof-v1`으로 **8종이 공유하는 표**입니다. v2 선수만 MOM이
   * 두 배면 같은 순위표에서 v2가 상위를 잡아먹어요. 의도한 설계가 아니라 구조의
   * 부산물이고, 부산물을 남기면 나중에 원인을 못 찾습니다.
   *
   * 손잡이 둘 중 문턱을 씁니다 — RATE의 흔들림 폭을 넓히는 쪽은 **평점 전체가 흔들려**
   * 🔥 물오른 폼·전당 점수·승격이 같이 움직여요. 문턱 하나가 더 국소적이에요.
   * ⚠️ 7.6은 제안값입니다. balancer 실측 ①에서 K1 기준 6% 근처가 되는 값으로 확정하세요. */
  /* ⚠️ 7.6은 사실상 안 물렸어요 — 능력치 110에서 MOM이 8.9%였습니다(목표 6%).
   * 22번에서 8.30으로 잡았고, ①-G 계수 한 벌(23번 재측정)에서 **8.40**으로 다시 잡았어요 —
   * 🎖️ 칭호 버프가 카드 엔진에 붙으면서 평점이 올라 문턱이 헐거워졌습니다. 목표 밴드 5~8%. */
  const MOM_MIN = 8.40;
  function proMatchFinalize(act, info) {
    /* ⚽ v2 — 승부처 보정(momAdj)은 **0입니다.**
     * v1은 90분 끝에 승부처가 딱 한 번 있었고 그 성패를 평점에 ±0.8로 얹었어요.
     * v2는 순간 카드가 경기당 0.7~2.3회고, 그 결과가 이미 골·도움·차단으로
     * 평점에 들어갑니다 — 여기서 또 얹으면 **같은 일을 두 번 세요.**
     * RATE의 b(+10)도 그 구조에서 다시 잡힌 값이에요.
     * ⚠️ 설계 문서에 이 항의 처리가 없어서 제가 0으로 뒀습니다 — 보고서 §설계 질문 ③. */
    const momAdj = 0;
    /* 🔥 순간 카드 집계 — 카드 3종별 시도/성공 (13번 §9-1 S.career.moments).
     * 옛 카운터가 없으면 0에서 시작해요(마이그레이션하지 않습니다). */
    const mo = S.career.moments || (S.career.moments = { g: { t: 0, p: 0 }, a: { t: 0, p: 0 }, d: { t: 0, p: 0 } });
    for (const key of ["g", "a", "d"]) {
      const src = (info.moments && info.moments[key]) || { t: 0, p: 0 };
      const dst = mo[key] || (mo[key] = { t: 0, p: 0 });
      dst.t = (dst.t || 0) + src.t;
      dst.p = (dst.p || 0) + src.p;
    }
    /* 실제 축구 평점과 같은 자로 잽니다 — 능력치는 안 보고 그 경기에 일어난
     * 일만 봐요. 값의 근거와 실측은 matchRating(위쪽)에 적어 뒀어요. */
    const myRankScore = matchRating(info, S.pos, momAdj);
    /* ⚠️ 순위표를 **먼저** 굴려요. 그래야 그 라운드에 각 클럽이 뭘 했는지가 나오고,
     * 라이벌 점수가 그걸 볼 수 있어요. 예전에는 순위 행을 다 만든 뒤에 굴려서
     * 둘이 같은 라운드를 보면서도 서로 모르는 사이였습니다. */
    ensureLeagueRecords();              // 명단이 있어야 카드 루프가 돌아요
    /* ⚽ v2 — 내 경기에서 나온 동료 기록(info.mates)과 상대 수비 몫(info.oppStops)을
     * 함께 넘겨요. recordRound가 나머지 클럽을 같은 카드 루프로 굴려서
     * **스코어와 개인 기록을 한 자리에서** 냅니다. */
    const roundRes = recordRound(act.opp, info.res, info.teamGoals, info.oppGoals, info);
    const scored = leagueRound(roundRes);
    const rows = [
      { name: S.name, club: S.group, score: myRankScore, me: true, res: info.res },
      /* 라이벌 줄이 개인 순위와 **같은 명단**이에요. 예전에는 명단이 둘로 갈려 있어서
       * 득점 1위가 경기 후 평점표에 아예 안 나왔습니다.
       * res는 그 라운드 소속 클럽의 결과예요 — 내가 이긴 팀 선수는 같이 떨어져요. */
      ...scored.map(({ p, club, role, score, res }) => ({
        name: p.name, club, role, res, score,
      })),
    ].sort((a, b) => b.score - a.score);
    const rank = rows.findIndex((r) => r.me) + 1;
    const won = rank === 1;
    /* 표가 9줄에서 67줄이 됐어요(리그 전 선발). "3위 안"을 그대로 두면 사실상
     * 닿을 수 없는 문턱이 되니, 예전과 **같은 비율**(상위 3분의 1)로 봅니다. */
    const topThird = rank <= Math.ceil(rows.length / 3);
    /* 🏅 MOM 횟수도 명단에 쌓아요 — 개인 순위에서 "이 선수가 몇 번 최고였나"를 봐요.
     * ⚽ v2 — **절대 문턱을 함께 봅니다**(MOM_MIN). 라운드 최고여도 평점이 그 아래면
     * 그 라운드에는 MOM이 없어요. 나에게도 똑같이 적용됩니다(won 판정과 별개예요). */
    const momOk = rows[0].score >= MOM_MIN * 10;
    if (momOk && !won) { const top = scored.find(({ score }) => score === rows[0].score); if (top) top.p.mom = (top.p.mom || 0) + 1; }
    /* 표가 **9줄에서 67줄로** 늘었어요(리그 전 선발). 순위를 그대로 빼면
     * 눈금이 통째로 무너지니, **가운데에서 얼마나 떨어졌나를 비율로** 봅니다.
     * 폭은 예전과 같게 맞췄어요 — 예전엔 (5.5 − 순위) × 0.35라 대략 ±1.4였습니다.
     * 이렇게 두면 앞으로 리그 규모가 또 바뀌어도 눈금이 안 흔들려요. */
    const mid = (rows.length + 1) / 2;
    const HYPE_SPAN = 2.8;
    /* ⚽ v2 — 승부처 가감(±0.5)도 뺐어요. 순간 카드의 성패는 이미 평점에 들어가고,
     * 평점이 순위를 정하고, 순위가 hype를 정합니다 — 여기서 또 얹으면 세 번 세요. */
    const hypeDelta = ((mid - rank) / Math.max(1, rows.length - 1)) * HYPE_SPAN;

    act.apps = (act.apps || 0) + 1;
    /* 👥 동료 출전 수는 **leagueRound가 세요** — 리그 전 선발을 한 바퀴 돌면서
     * 거기서 한 번만 셉니다. 여기서 markApps를 또 부르면 우리 팀만 두 번 세어져요
     * (제보: "김우진은 어떻게 경기수가 20이지" — 12라운드에 20경기였습니다). */
    // 시즌 평균 평점 — 기록 화면에 보여줘요
    act.ratingSum = (act.ratingSum || 0) + clamp(myRankScore / 10, 1, 10);
    act.goals = (act.goals || 0) + info.myGoals;
    act.assists = (act.assists || 0) + info.assists;
    act.defense = (act.defense || 0) + info.defense;
    /* 🛡️ 무실점 경기 — 🛡️ 철벽상의 주축이에요 (13번 §2-8b (4)).
     * 🪑 벤치인 주에는 안 세요 — *"내가 **선발로 뛴** 경기 중 팀 무실점"*이 축이에요. */
    if (!info.oppGoals) act.cs = (act.cs || 0) + 1;
    if (info.res === "W") act.teamW = (act.teamW || 0) + 1;
    else if (info.res === "D") act.teamD = (act.teamD || 0) + 1;
    else act.teamL = (act.teamL || 0) + 1;

    act.week += 1;
    act.hypeSum += hypeDelta;
    act.cbHype += hypeDelta;
    let pay = 30, dFan;
    if (won) {
      act.wins += 1; act.cbWins += 1; S.career.wins += 1;
      pay += 100; dFan = randInt(10, 18);
    } else if (topThird) {
      dFan = randInt(4, 9);
    } else {
      dFan = randInt(-3, 3);
    }
    S.fandom = Math.max(0, (S.fandom || 0) + dFan);
    /* 🏷️ 칭호가 곧 몸값이에요 — 수당은 여태 30만원 고정이라 실력과 아무 관계가
     * 없던 자리였어요. 골·평점·수상·명성은 이미 종합이 굴리니 거기에 또 곱하면
     * 같은 축을 두 번 세는 셈이라, 새 축인 돈에 걸었습니다. */
    pay = Math.round(pay * titlePayMul(titleIdx(overall())));
    // 🌍 나라 특색 — 🇬🇧 잉글랜드는 돈이 도는 리그예요 (계약금에도 같은 배수가 붙어요)
    pay = Math.round(pay * traitMul(S, "money"));
    S.money = (S.money || 0) + pay;
    /* ⚡ 실전 성장 — 낮은 확률로 경기에서 뭔가를 깨쳐요.
     * 훈련만으로 크는 게 아니라 경기가 선수를 키운다는 감각을 주려는 거예요.
     * 잘한 경기일수록 확률이 올라가요. 상한에 닿은 능력치는 대상에서 빼요.
     *
     * ⚠️ 예전에는 후보에서 **아무거나** 뽑았어요. 1골 0도움 0수비인 경기에서
     * 수비가 오르니 "경기가 선수를 키운다"가 아니라 그냥 랜덤 보너스로 보였습니다.
     * 이제 그 경기에 실제로 한 일이 무게가 돼요 — 골을 넣었으면 슛, 도움이면 패스,
     * 몸으로 막았으면 수비 쪽으로 기울어요.
     *
     * 바닥 무게(GROW_BASE)를 남겨 두는 이유: 90분을 뛴 이상 아무 일도 없던 칸이
     * 절대 안 오르는 건 과해요. 다만 한 일이 있으면 그쪽이 훨씬 무거워집니다.
     * 체력은 이벤트가 없어서 바닥 무게만 조금 높게 둡니다 — 뛴 것 자체가 근거예요. */
    /* 🦶 약발은 **훈련이 아니라 경기에서** 붙어요. 골·도움이 난 경기에서만,
     * 그것도 낮은 확률로 한 칸이에요 — 반대발로 차야 했던 장면을 겪은 값이에요.
     * 훈련 버튼으로 만들면 훈련 총량이 늘어 성장 곡선이 통째로 움직입니다. */
    const FOOT_GROW_P = 0.06;
    if (S.foot && S.foot.weak < 10 && (info.myGoals + info.assists) > 0
        && Math.random() < FOOT_GROW_P * (info.myGoals + info.assists)) {
      S.foot.weak += 1;
      proLog(`🦶 반대발로 해낸 장면이 남았어요 — 약발 ${S.foot.weak}/10`);
    }
    const GROW_BASE = 0.5;
    const growWeight = {
      shoot: GROW_BASE + info.myGoals * 3,
      pass: GROW_BASE + info.assists * 3,
      // 돌파는 골·도움 장면을 만드는 과정이라 둘 다에서 조금씩 와요
      dribble: GROW_BASE + (info.myGoals + info.assists) * 1.2,
      defense: GROW_BASE + info.defense * 2,
      stamina: 1,
      /* ⚡ 스피드는 **돌파에서 와요** — 제치고 나가는 장면이 남는 거예요.
       * 체력처럼 바닥 무게만 두면 90분을 뛴 것만으로 스피드가 늘어서 이상해요. */
      speed: GROW_BASE + (info.myGoals + info.assists) * 0.8,
    };
    /* 계기를 문구로도 남겨요. 왜 그게 올랐는지 화면에서 읽혀야 해요 —
     * 지금까지는 "실전에서 수비를 깨쳤어요"만 떠서 근거를 알 수가 없었어요. */
    const GROW_WHY = {
      shoot: info.myGoals > 0 ? "골을 넣은 감각이 남아" : "",
      pass: info.assists > 0 ? "도움 장면의 시야가 붙어" : "",
      dribble: info.myGoals + info.assists > 0 ? "돌파가 통한 게 남아" : "",
      defense: info.defense > 0 ? "몸으로 막아낸 게 남아" : "",
      stamina: "",
      speed: info.myGoals + info.assists > 0 ? "제치고 나간 장면이 남아" : "",
    };
    /* 활약이 클수록 확률도 올라가요. 승패도 봅니다 — 이긴 경기에서 더 배워요.
     * posAxis를 쓰면 포지션 보정이 자동으로 붙어 수비수가 손해 보지 않아요. */
    const didAxis = posAxis({ goals: info.myGoals, assists: info.assists, defense: info.defense }, S.pos);
    const growP = clamp(
      0.06
      + (topThird ? 0.06 : 0)
      // ⚽ v2 — 순간 카드를 하나라도 성공한 경기 (13번 §7-4 "순간 카드에서 한 일이 무게")
      + ((info.mineSuccess || 0) > 0 ? 0.05 : 0)
      + (info.res === "W" ? 0.03 : info.res === "L" ? -0.02 : 0)
      + Math.min(0.05, didAxis * 0.03),
      0.02, 0.25
    );
    if (Math.random() < growP) {
      const pool = STAT_DEFS.filter((d) => !atCap(d.key));
      const total = pool.reduce((sum, d) => sum + growWeight[d.key], 0);
      if (pool.length && total > 0) {
        let roll = Math.random() * total;
        let d = pool[pool.length - 1];
        for (const cand of pool) { roll -= growWeight[cand.key]; if (roll < 0) { d = cand; break; } }
        const gain = Math.round(rand(0.4, 1.4) * S.talents[d.key] * 10) / 10;
        S.stats[d.key] = clamp(S.stats[d.key] + gain, 0, statCap(d.key));
        const why = GROW_WHY[d.key];
        proLog(`⚡ ${why ? why + " " : "실전에서 "}${d.name}을(를) 깨쳤어요! +${gain.toFixed(1)} (${Math.round(S.stats[d.key])})`);
        queueFx([["flash", `⚡ ${d.name} +${gain.toFixed(1)}`]]);
      }
    }
    S.condition = clamp(S.condition - wear(randInt(3, 6)), 0, 100);
    S.pendingShow = false;

    const cbDone = act.week >= act.weekTotal;
    let extraLine = "";
    if (cbDone) {
      const cbSales = Math.max(1, Math.round(S.fandom * 0.05 + act.cbWins * 6 + act.cbHype * 4 + rand(-4, 4)));
      act.sales += cbSales;
      extraLine = `<div class="tour-pts">⚽ ${cbLabel(act.cb)} 종료 — MOM ${act.cbWins}회 · 공격포인트 ${cbSales}P</div>`;
    }
    save();

    const scoreClass = info.res === "W" ? "win" : info.res === "L" ? "lose" : "";
    const resultHTML = `
      <div class="ms-final ${scoreClass}">${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${RES_LABEL[info.res]}</div>
      <div class="tour-vs">${won ? "🏅 MOM!" : `평점 ${rank}위`} <span class="${won ? "win" : ""}">${S.name}</span> · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense}</div>
      ${ratingWhyHTML(myRankScore, info, S.pos, momAdj)}
      ${chartHTML(rows)}
      <div class="tour-pts">💰 경기 수당 +${pay}만 · ${dFan >= 0 ? `⭐ 명성 +${dFan}` : `📉 명성 ${dFan}`}</div>
      ${extraLine}`;

    let nextLabel, nextFn;
    if (!cbDone) {
      nextLabel = `🏋️ 다음 경기 준비 (R${act.week + 1})`;
      nextFn = () => { S.camp = 2; save(); renderPrep(); show("screen-pro"); };
    } else if (act.cb < act.cbTotal) {
      nextLabel = `⚽ ${cbLabel(act.cb + 1)} 준비하기`;
      nextFn = () => { S.camp = 3; save(); renderPrep(); show("screen-pro"); };
    } else if (cupEntry()) {
      /* 🏆 리그가 끝나면 컵이에요. 4위 안에 들어야 나갈 수 있어요 —
       * 그래야 마지막 라운드가 5월의 평범한 경기와 달라집니다.
       *
       * ⚠️ **대회 준비 턴을 줘요.** 예전에는 리그 마지막 경기 결과에서 버튼 하나로
       * 바로 8강이었어요 — 반기가 바뀔 때는 3턴을 주는데 컵에는 0턴이었고,
       * 컨디션도 리그 마지막 경기 직후라 바닥이었습니다. 시즌의 절정인데
       * 준비할 틈이 없었어요. */
      nextLabel = `🏆 ${cupName()} 준비하기`;
      nextFn = () => { S.camp = CUP_CAMP; S.cupPrep = true; save(); renderPrep(); show("screen-pro"); };
    } else {
      nextLabel = "🏁 시즌 결산";
      nextFn = seasonEnd;
    }
    return { resultHTML, nextLabel, nextFn };
  }

  /* ---------- 🏆 컵 대회 ----------
   *
   * 리그 38라운드가 끝나면 바로 결산이라 시즌에 절정이 없었어요. 야구는 가을야구가
   * 정규시즌 내내 목표가 되어 주는데, 축구는 리그 순위가 곧 끝이었습니다.
   *
   * 리그와 다른 점 둘:
   *  · **1부와 2부가 같은 대진**이에요. 리그에서는 절대 안 만나는 조합이 나와요.
   *  · **단판**이에요. 38경기에서는 묻히는 한 판 운이 여기서는 안 묻혀요.
   *
   * 참가는 **리그 4위 안**이에요. 전 팀이 나가면 리그 순위가 컵에 아무 영향을 안 줘서
   * 시즌 중 긴장이 사라집니다. 못 들면 그냥 결산이에요 — 아쉬움도 같이 남겨요.
   *
   * 승부차기 실행은 cup.js(window.SoccerCup)에 있어요. 여기는 대진과 세이브만 봐요 —
   * 세이브를 만지는 코드는 한곳에 모읍니다. */
  const CUP_SPOTS = 4;                        // 리그마다 몇 위까지 나가나
  const CUP_CAMP = 2;                         // 컵 8강 전에 주는 훈련·휴식 턴
  const cupName = () => (window.SoccerCup ? SoccerCup.nameOf(leagueOf(S).country) : "컵 대회");
  const cupRounds = () => (window.SoccerCup ? SoccerCup.ROUNDS : ["8강", "4강", "결승"]);

  // 컵에 나갈 수 있나 — 리그 표가 있고 내 순위가 CUP_SPOTS 안이어야 해요
  function cupEntry() {
    if (!window.SoccerCup || !tableReady()) return false;
    return myTableRank() <= CUP_SPOTS;
  }

  /* 대진 상대 — 내 나라의 **다른 리그**에서도 데려와요. 같은 리그 팀만 모으면
   * 리그 경기와 상대가 똑같아서 컵이 그냥 3경기 더가 됩니다.
   * 같은 나라 리그가 하나뿐이면(있을 수 있어요) 내 리그에서만 채워요. */
  function cupField() {
    const myLg = leagueOf(S);
    const mates = leagueRoster(myLg.id).filter((c) => c.name !== S.group);
    const others = LEAGUES.filter((l) => l.country === myLg.country && l.id !== myLg.id);
    /* ⚠️ 예전에는 다른 리그 클럽을 **전부 모아 전력 상위 4팀**을 뽑았어요.
     * 그러면 하부에 있을수록 최상위 리그 강팀만 만납니다 — K리그3 소속이면
     * 8강 상대 넷이 전부 K리그1(78·71·66·62)이었어요. 자이언트 킬링이 아니라 벽이고,
     * 반대로 K리그1은 하부 팀만 만나 너무 쉬웠습니다.
     *
     * 이제 **리그마다 골고루** 뽑아요. 실제 FA컵 8강도 1부·2부가 섞이지
     * 한쪽으로 쏠리지 않아요. 자리가 남으면 위 리그부터 한 팀씩 더 채웁니다. */
    const perLeague = Math.max(1, Math.floor(CUP_SPOTS / Math.max(1, others.length)));
    const byLeague = others.map((l) => leagueRoster(l.id).slice()
      .sort((a, b) => b.str - a.str).slice(0, perLeague).map((c) => ({ ...c, lg: l })));
    const up = byLeague.flat();
    // 남는 자리는 위 리그(tier 큰 쪽)부터 다음 순위 팀으로 채워요
    const rest = others.slice().sort((a, b) => b.tier - a.tier)
      .flatMap((l) => leagueRoster(l.id).slice().sort((a, b) => b.str - a.str)
        .slice(perLeague).map((c) => ({ ...c, lg: l })));
    while (up.length < CUP_SPOTS && rest.length) up.push(rest.shift());
    const mine = mates.sort((a, b) => b.str - a.str).slice(0, CUP_SPOTS - 1)
      .map((c) => ({ ...c, lg: myLg }));
    return shuffle(mine.concat(up.slice(0, CUP_SPOTS)));
  }

  function startCup() {
    S.cup = { round: 0, name: cupName(), field: cupField().map((c) => ({ name: c.name, str: c.str, lg: c.lg.short })) };
    save();
    // 신규 기능이라 참가율부터 봐야 해요 — 리그 4위 안이 얼마나 자주 나오나
    if (window.Stats) Stats.log("cup", { act: "enter", y: S.proYear, lg: S.league, name: S.cup.name });
    cupMatch();
  }

  // 이번 라운드 상대 하나를 뽑아요 (뽑힌 팀은 대진에서 빠져요)
  function cupDraw() {
    const f = S.cup.field;
    if (!f.length) return null;
    const i = Math.floor(Math.random() * f.length);
    return f.splice(i, 1)[0];
  }

  function cupMatch() {
    const rounds = cupRounds();
    const opp = cupDraw();
    /* 대진이 비었어요 — 있을 수 없는 상태지만, 예전에는 여기서 **없는 함수**
     * (cupFinish)를 불러 그 자리에서 죽었습니다. 컵을 접고 결산으로 보내요. */
    if (!opp) { S.cup = null; save(); seasonEnd(); return; }
    S.cup.opp = opp;
    save();
    $("stage-title").textContent = `🏆 ${S.cup.name} ${rounds[S.cup.round]}`;
    $("stage-round").textContent = `${S.group} vs ${opp.name} (${opp.lg}) · 단판`;
    show("screen-stage");

    const rating = ratingOf(WingerProspect.nowStats(S), S.pos, S.condition, S.fandom);
    const c = matchContribution(rating);
    /* 컵 상대는 그 팀 전력을 그대로 물려요. 리그와 같은 산식이라 따로 보정하지
     * 않습니다 — 예전에는 "상대가 더 세면 +1 실점"이라는 손보정이 붙어 있었어요. */
    const mates = Math.max(teammateGoals(rating, opp.str), c.a);   // 🅰️ 내 도움만큼은 동료가 넣었어요
    const oppGoals = deriveOppGoals(rating, WingerProspect.nowStats(S).defense, opp.str, c.g + c.a + mates);
    MatchSim.run({
      home: S.group, away: opp.name, myName: S.name,
      goals: c.g, assists: c.a, defense: c.def, oppGoals, rating, mateCount: mates,
      mates: mateNames(),
      finalize: (info) => cupFinalize(info),
    });
  }

  /* ⚠️ MatchSim.run의 finalize는 **{resultHTML, nextLabel, nextFn}을 돌려줘야** 해요.
   * 처음엔 여기서 DOM을 직접 그리고 아무것도 안 돌려줬는데, MatchSim이
   * out.resultHTML을 읽다가 그 자리에서 죽어 결과 화면이 통째로 안 나왔습니다.
   * 리그 경기(proMatchFinalize)와 같은 모양을 지켜요. */
  function cupFinalize(info) {
    const rounds = cupRounds();
    const label = rounds[S.cup.round];
    S.condition = clamp(S.condition - wear(randInt(3, 6)), 0, 100);
    /* 컵 경기도 시즌 기록에 넣어요 — 안 넣으면 결승까지 가서 넣은 골이
     * 연도별 표에서 사라져요. 평점 평균에도 같이 들어갑니다.
     * ⚠️ 평점은 리그 경기와 **같은 자**로 재요. 예전에는 여기만 능력치 평점을
     * 그대로 넣어서, 컵에서 해트트릭을 해도 시즌 평균이 안 움직였습니다. */
    const rateScore = matchRating(info, S.pos, 0);
    const rateShown = clamp(rateScore / 10, 1, 10);
    const act = S.activity;
    if (act) {
      act.goals = (act.goals || 0) + info.myGoals;
      act.assists = (act.assists || 0) + info.assists;
      act.defense = (act.defense || 0) + info.defense;
      /* 🛡️ **컵 무실점은 세지 않아요** (13번 §2-8b (9) · 게이트 G-8 실측).
       *
       * 컵은 아직 v1 산식(`deriveOppGoals`)이라 무실점 비율이 리그보다 **+60.5~+198.5%**
       * 높습니다. 골·도움·차단은 이미 그 비대칭 위에서 곡선이 잡혔지만 🛡️ 무실점은
       * **지금 새로 세우는 축**이라 부채를 처음부터 안 집니다.
       * *"네 축이 같은 자"*보다 *"컵과 리그가 같은 자"*가 더 근본이에요 — 앞은 축 사이의
       * 일관성이고 뒤는 **같은 축 안**의 일관성입니다.
       *
       * 🔓 **컵을 카드 엔진으로 옮기면 되살립니다**(§11 순서 1의 미완 항목).
       * ⚠️ 그때까지 화면에 분모(출전 수)를 함께 띄우면 안 돼요 — `apps`는 컵을 세는데
       *    `cs`는 안 세니 *"12경기 중 무실점 4"*가 거짓말이 됩니다.
       *    `raceRank`는 값만 정렬해서 분모가 필요 없어요. */
      act.apps = (act.apps || 0) + 1;
      act.ratingSum = (act.ratingSum || 0) + rateShown;
    }
    save();
    const head = `<div class="ms-final ${info.res === "W" ? "win" : info.res === "L" ? "lose" : ""}">`
      + `${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${S.cup.name} ${label}</div>`
      + `<div class="tour-vs"><span>${S.name}</span> · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense}</div>`
      + ratingWhyHTML(rateScore, info, S.pos, 0);

    // 비기면 승부차기 — 컵은 단판이라 무승부가 없어요
    if (info.res === "D") {
      return {
        resultHTML: head + `<div class="tour-line">비겼어요 — 승부차기로 갑니다</div><div id="pk-box"></div>`,
        nextLabel: "⚽ 승부차기 시작",
        nextFn: () => {
          const btn = $("btn-stage-next");
          if (btn) btn.hidden = true;
          SoccerCup.shootout(document.getElementById("pk-box"), {
            myName: S.group, oppName: S.cup.opp.name,
            shoot: WingerProspect.nowStats(S).shoot, oppStr: S.cup.opp.str,
            /* 동료 키커 — 개인 순위 명단에서 우리 팀 선수를 데려와요.
             * 예전에는 다섯 번을 전부 내가 찼어요("1번 (나) · 2번 (나) …"). */
            mates: mateNames(), myStr: clubStrOf(S),
            onDone: (win) => { if (btn) btn.hidden = false; cupAdvance(win, head, true); },
          });
        },
      };
    }
    return cupNext(info.res === "W", head, false);
  }

  /* 다음 화면을 정해요. 경기 직후에는 MatchSim에 돌려주고(cupFinalize),
   * 승부차기 뒤에는 직접 그려요(cupAdvance) — 같은 계산을 두 군데서 안 하려고 나눴어요. */
  function cupNext(win, head, viaPk) {
    const rounds = cupRounds();
    const label = rounds[S.cup.round];
    const pk = viaPk ? " (승부차기)" : "";
    if (!win) {
      const money = Math.round(prizeOf(CUP_ROUND_PRIZE * (S.cup.round + 1), S.league) * traitMul(S, "money"));
      S.money = (S.money || 0) + money;
      if (window.Stats) Stats.log("cup", { act: "out", y: S.proYear, round: label, pk: !!viaPk, name: S.cup.name });
      S.cup = null;
      save();
      return {
        resultHTML: head + `<div class="tour-line">💧 ${label}에서 탈락${pk}…</div>`
          + `<div class="tour-pts">💰 대회 수당 +${money}만</div>`,
        nextLabel: "🏁 시즌 결산", nextFn: seasonEnd,
      };
    }
    S.cup.round += 1;
    if (S.cup.round >= rounds.length) return cupWin(head, pk);
    save();
    return {
      resultHTML: head + `<div class="tour-line">🎉 ${label} 통과${pk}!</div>`,
      nextLabel: `🏆 ${rounds[S.cup.round]} 진출`, nextFn: cupMatch,
    };
  }

  function cupWin(head, pk) {
    const money = Math.round(prizeOf(CUP_PRIZE, S.league) * traitMul(S, "money"));
    const fan = randInt(25, 45);
    S.money = (S.money || 0) + money;
    S.fandom = Math.max(0, (S.fandom || 0) + fan);
    addTrophy(`${S.proYear}시즌 ${S.cup.name} 우승`, leagueOf(S).id);
    const name = S.cup.name;
    if (window.Stats) Stats.log("cup", { act: "win", y: S.proYear, pk: !!pk, name });
    S.cup = null;
    save();
    queueFx([["champion", `🏆 ${name} 우승!`]]);
    return {
      resultHTML: (head || "") + `<div class="tour-line">🏆 <b>${name} 우승!!</b>${pk || ""}</div>`
        + `<div class="tour-pts">💰 우승 상금 +${money}만 · ⭐ 명성 +${fan}</div>`,
      nextLabel: "🏁 시즌 결산", nextFn: seasonEnd,
    };
  }

  // 승부차기가 끝난 뒤 — 직접 그려요 (MatchSim은 이미 끝났어요)
  function cupAdvance(win, head, viaPk) {
    const out = cupNext(win, head, viaPk);
    const box = document.getElementById("stage-result") || $("stage-card");
    box.innerHTML = out.resultHTML;
    const btn = $("btn-stage-next");
    if (btn) { btn.hidden = false; btn.disabled = false; btn.textContent = out.nextLabel; btn.onclick = out.nextFn; }
  }

  // ---------- 시즌 결산 ----------
  /* 🌏 시즌의 끝 — **단일 관문**이에요.
   *
   * finishYear로 들어가는 입구가 다섯 곳이나 됩니다(리그 종료·벤치 주 종료·컵 탈락·
   * 컵 우승·컵 대진 방어). 다섯 곳에 각각 월드컵 분기를 심으면 **반드시 하나가 샙니다** —
   * v2.48.0이 정확히 그 사고였어요(벤치 갈래에만 pendingShow 해제가 빠졌습니다).
   * 그래서 다섯 입구를 이 함수 하나로 모으고, 월드컵 여부는 여기서만 봅니다. */
  function seasonEnd() {
    if (window.WingerWorldCup && WingerWorldCup.due()) { WingerWorldCup.enter(finishYear); return; }
    finishYear();
  }

  function finishYear() {
    /* 📈 동료들도 한 살 먹어요 — **결산을 그리기 전에** 늙어야 그 시즌 팀 소식을
     * 결산에 적을 수 있어요. 한 시즌에 한 번만 도는 건 ageSquads가 스스로 지켜요. */
    if (window.WingerSquad) WingerSquad.ageSquads();
    const act = S.activity;
    /* 🗑️ **나이 벌점을 폐기했습니다.** 옛 `(proYear - 11 + 1) * 0.8`도, 그걸 나이 눈금으로
     * 옮긴 `AGE_PEN`도 없어요.
     *
     * 이제 `overall()`이 곡선만큼 내려가고 그게 생산량(골·도움·수비)을 통해 축에 이미
     * 들어옵니다. 벌점을 또 걸면 **나이를 두 번 세는** 겁니다 — 훈련 배수 ×1.18/×0.86을
     * 지운 것과 **같은 근거**예요 (§7-1 ①).
     * ⚠️ engineer 판단입니다. designer 확인이 필요한 자리로 56번 보고서에 적었어요.
     * ⚠️ `agePen = 0`을 남겨 두지 않았습니다 — 늘 0인 항은 "배너만 뜨고 아무 일도
     *    안 하는 칭호"와 같은 자리라, 다음 사람이 살아 있는 손잡이로 오해해요. */
    /* 연말 평가는 이제 축이 해요. 예전에는 hypeSum(순위 기반)이라
     * 1위를 하는 순간 천장에 붙어서 능력치를 더 올려도 결과가 같았어요.
     * 축은 골·도움·수비 성공 개수라 상한이 없어요. 후반에 기하급수로 커지니
     * 로그로 잽니다 — 선형이면 10년차에 hype가 수백이 돼요.
     * hypeSum은 경기 화면 순위 연출에 그대로 남아 있어요.
     *
     * 리그격(prestige)을 축에 곱해요 — 같은 성적이라도 위 리그에서 낸 게 값어치가 커요.
     * 평점 페널티가 성적 자체를 깎으니, 이 둘이 맞물려 "실력이 되면 통하고
     * 아니면 못 버틴다"는 도박이 돼요.
     *
     * 아래 hype 줄과 수상 판정 블록은 여러 회귀 테스트가 소스에서 통째로 떼어 굴려요.
     * 그래서 리그를 지역 변수로 묶지 않고 매번 leagueOf(S)로 읽어요 —
     * 묶으면 떼어낸 조각이 밖에서 안 돌아서 테스트가 통째로 죽습니다. */
    const hype = clamp(Math.log(Math.max(1, posAxis(act, S.pos) * leagueOf(S).prestige)) * AXIS_K - AXIS_OFF, -1.5, 12);
    const wins = act.wins;
    const sales = act.sales;
    const dFan = Math.round(hype * 10 + wins * 3 - (hype < 0 ? 15 : 0));
    S.fandom = Math.max(0, S.fandom + dFan);
    // 수상은 '리그 내 상대 비교' — 가상 경쟁자들의 활약과 겨뤄 최고면 수상해요.
    // (압도적인 시즌은 랜덤에 밀려 상을 놓치지 않아요)
    const awards = [];
    /* 경쟁 강도 — 수상 문턱과 라이벌 분포에 함께 곱해요. K리그1은 1이라 항등이에요.
     * 셋(신인왕·리그MVP·베스트11)이 같은 bar를 써야 상끼리 앞뒤가 맞아요.
     * 하나만 고치면 "베스트11은 못 받는데 MVP는 받는" 역전이 납니다. */
    const bar = barOf(S);
    if (S.proYear === 1 && hype >= 3 * bar) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(1.5 * bar, 4.2 * bar)));
      if (hype >= bestRookie) { awards.push("신인왕"); S.career.rookie += 1; }
    }
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5 * bar, 7.8 * bar)));
    if (hype >= 5.5 * bar && hype >= leagueBest) {
      awards.push("리그MVP");
      /* 리그격만큼 가중해서 따로 쌓아요. 빅클럽에서 받은 상이 더 값어치를 갖습니다.
       * 안 그러면 안전하게 1부에 머문 커리어가 명예의 전당에서 앞서요.
       *
       * 가중 카운터가 없던 옛 세이브는 그동안 받은 상을 1부 기준(×1)으로 세고 이어붙여요.
       * 로드할 때 마이그레이션하는 게 아니라, 새 상을 받는 이 순간에만 이어붙입니다 —
       * 0에서 시작하면 새 상 하나 때문에 지난 상이 통째로 사라져요. */
      S.career.daesangW = (S.career.daesangW != null ? S.career.daesangW : S.career.daesang) + leagueOf(S).prestige;
      S.career.daesang += 1;
    }
    /* 베스트11은(는) 리그MVP과(와) 별개로 판정해요.
     * 예전에는 else if라서 리그MVP을(를) 받으면 베스트11을(를) 아예 못 받았어요.
     * 가장 잘한 시즌이 오히려 상을 덜 받는 역전이 났습니다. */
    /* 🥈 문턱 셋(4.5 · 4.2 · 6.2 → **5.8 · 5.5 · 8.0**)은 **한 벌**입니다 (2026-08-29 · 실측 5-j).
     *
     * 유효 능력치 90에서 수상률이 **97.1%**였어요. 능력치 90에서 97%면 그건 상이 아니고,
     * 베스트11은 칭호(`g·a·d +5%`)를 주니 **모두가 항상 다는 버프**가 됩니다 —
     * 칭호 체계의 뜻이 죽어요. 만 38세 노장이 98.7%로 계속 받던 것도 같은 뿌리입니다
     * (`agePen`을 되살려 가리는 게 아니라 **문턱 자체를 고칩니다**).
     *
     * ⚠️ **따로 넣으면 안 고쳐집니다** — 하한만 94.3% · 상한만 67.5% · 셋 다 넣어야 48.9%.
     *
     * 🚫 **상한을 8.5 이상으로 올리지 마세요.** 능력치 130에서 리그MVP와 **역전**이 납니다
     *    (베스트11 89.8% vs MVP 91.4%). 상들의 문턱이 서로의 격을 뒤집는 자리예요 —
     *    옛 `else if` 사고(*"MVP를 받으면 베스트11을 아예 못 받는다"*)와 **형태는 달라도
     *    결과가 같습니다.** 위 리그MVP 문턱(5.5 · 3.5~7.8)과 **함께** 봐야 해요. */
    if (hype >= 5.8 * bar) {
      const posBar = rand(5.5 * bar, 8.0 * bar);
      // 베스트11도 같은 방식으로 리그격만큼 가중해요 (바로 위 리그MVP 주석 참고).
      if (hype >= posBar) { awards.push("베스트11"); S.career.bonsangW = (S.career.bonsangW != null ? S.career.bonsangW : S.career.bonsang) + leagueOf(S).prestige; S.career.bonsang += 1; }
    }
    /* ⚽ 축구 전용 부문상 — 포지션마다 노릴 트로피가 하나씩 생겨요.
     * 문턱은 12경기 시즌의 실측 생산량으로 잡았어요 (능력치 100·평점 6.5 기준):
     *   공격수 골 60.6 · 미드필더 도움 53.8 · 수비수 수비 132.1 · 윙어 공격P 91.8 (38경기)
     * 좋은 시즌이면 닿고 평범하면 안 닿는 자리예요. bar를 곱해 리그 경쟁 강도를 반영해요. */
    /* ⚽ 부문상 — **개인 순위 1위**면 받아요.
     *
     * 예전에는 `if (골 >= rand(51,72) * bar)`처럼 랜덤 문턱이었어요. 리그에 몇 골을
     * 넣은 선수가 있는지 게임이 몰라서, 화면에 뜨는 득점 순위와 수상이 서로 모르는
     * 사이가 됩니다 — 이 게임에서 여러 번 반복된 병이에요.
     * 이제 시즌 내내 보던 그 경쟁의 결과가 그대로 상이 돼요.
     *
     * 리그 격은 경쟁자 생산량(raceLam)에 이미 실려 있어요. 하부 리그에서는
     * 상을 쓸어 담지만 값어치(prestige)가 작고, 상위 리그에서는 하나도 어렵습니다 —
     * bar를 따로 곱하면 같은 축을 두 번 거는 셈이라 여기서는 안 씁니다.
     *
     * 한 경기도 안 치른 시즌에는 부문상을 건너뜁니다 —
     * 없는 경쟁을 이겼다고 할 수는 없어요. */
    if ((act.apps || 0) > 0 && window.WingerSquad) {
      ensureLeagueRecords();
      if (raceTop("g")) awards.push("골든부츠");
      if (raceTop("a")) awards.push("플레이메이커");
      /* 🛡️ 철벽상은 **무실점 경기 수** 1위예요 (13번 §2-8b (4) · 게이트 ①-G의 G-5).
       * 차단 횟수 1위였을 때는 약팀 수비수가 유리해서 수상률이 0%였습니다 — raceRank 주석 참고. */
      if (raceTop("d")) awards.push("철벽상");
      if (raceTop("p")) awards.push("공격포인트왕");
    }
    /* 📕 **여기서 그 시즌 기록을 닫아요.**
     * 예전에는 다음 시즌이 시작될 때(initActivity) 지웠어요. 그러면 결산과
     * 다음 시즌 준비 화면 사이 내내 개인 순위에 **지난 시즌 기록이 그대로** 남아서,
     * 개막 전인데 득점왕이 있는 표가 뜹니다(제보로 확인했어요 — 69명 중 12명에게
     * 지난 시즌 출전 기록이 남아 있었습니다).
     * 부문상 판정(바로 위)이 끝난 다음이라 상은 그대로 나가요. */
    if (window.WingerSquad) WingerSquad.resetSeason();
    /* 🏅 발롱도르 — 리그 최고를 넘어 세계 최고예요.
     * 리그MVP를 받은 시즌 중에서도, 리그격(prestige)을 곱한 값이 문턱을 넘어야 해요.
     * 하부 리그에서 아무리 잘해도 안 되고, 빅클럽에서 압도해야 닿습니다. */
    /* ⚠️ **리그 격을 두 번 세면 안 돼요.** hype에는 이미 격이 들어 있어요
     * (log(posAxis × prestige) × AXIS_K). 여기서 또 × prestige를 하면 격이
     * 로그로 한 번, 선형으로 또 한 번 실려서 상위 리그에서는 리그MVP만 받으면
     * 사실상 자동이 됩니다.
     *
     * 제보: "2부리그에서 뛰고 성적이 엄청 좋았던 것도 아닌 것 같은데 발롱도르를
     * 받았어." 실측해 보니 🇬🇧 챔피언십에서 2골 6도움 69수비(평점 6.8)로
     * **통과율 100%**였어요. 격을 한 번만 세면 0%가 됩니다.
     *
     * 고친 뒤 실측 (리그MVP를 받은 시즌 기준)
     *   제보 사례(챔피언십)        0%
     *   45골 15도움 압도 · PL     16% · 세리에A 4% · 그 아래 0%
     *   110수비 압도 · PL         37% · 챔피언십 14% · K리그1 0%
     * 주석이 원래 말하던 "하부 리그에서 아무리 잘해도 안 되고, 빅클럽에서
     * 압도해야 닿는다"가 이제 실제로 그렇게 돼요. */
    if (awards.includes("리그MVP") && hype >= rand(9, 13)) {
      awards.push("발롱도르");
      S.career.ballon = (S.career.ballon || 0) + 1;
    }
    /* 🔺🔻 팀 승강제 — 수상까지 끝난 뒤에 판정해요 (수상은 그 시즌 리그 기준이라야 맞아요).
     * ⚠️ applyPromotion이 S.league을 바꿔요. 시즌 기록에는 **치른 리그**를 남겨야
     * 지난 시즌 화면이 새 리그로 바뀌지 않아요 — 이적 표시에서 겪은 것과 같은 함정이에요. */
    const leaguePlayed = S.league;
    /* ⚠️ 순위는 **applyPromotion보다 먼저** 읽어요. 승격·강등이 일어나면
     * S.table을 null로 지우거든요 — 그 뒤에 읽으면 늘 null입니다.
     * (아래 Stats.log도 그래서 여태 승격한 시즌의 rank를 못 남기고 있었어요) */
    const finalRank = tableReady() ? myTableRank() : null;
    const finalTeams = tableReady() ? tableRows().length : null;
    const move = applyPromotion();
    if (move && window.Stats) {
      Stats.log("promo", { y: S.proYear, kind: move.kind, from: leaguePlayed, to: S.league });
    }
    if (move) {
      proLog(move.kind === "title" ? `🏆 ${move.from} 우승!! 리그 정상에 섰어요`
        : move.kind === "up" ? `🔺 리그 우승! ${move.from} → ${move.to} 승격!!`
        : `🔻 최하위… ${move.from} → ${move.to} 강등`);
    }
    S.career.sales += sales;
    const gg = act.goals || 0, ga = act.assists || 0, gd = act.defense || 0, apps = act.apps || 0;
    S.career.goals = (S.career.goals || 0) + gg;
    S.career.assists = (S.career.assists || 0) + ga;
    S.career.defense = (S.career.defense || 0) + gd;
    S.career.apps = (S.career.apps || 0) + apps;
    S.career.teamW = (S.career.teamW || 0) + (act.teamW || 0);
    S.career.teamD = (S.career.teamD || 0) + (act.teamD || 0);
    S.career.teamL = (S.career.teamL || 0) + (act.teamL || 0);
    /* 연출은 하나씩 줄 세워요. 한 번에 부르면 겹쳐서 뭘 받았는지 안 보여요
     * — ⚾ 더 드래프트에서 2.11.2에 같은 문제를 고쳤습니다.
     *
     * ⚠️ 🏆 우승 연출이 이 줄 밖(applyPromotion)에서 **즉시** 터지고 있었어요.
     * 수상은 0ms부터 1700ms 간격으로 뜨니 첫 상과 정확히 겹쳤습니다(제보).
     * 우승도 같은 줄에 세워서 앞에 놓아요 — 제일 큰 소식이 먼저 와야 하고요. */
    const fxQueue = [];
    if (move && move.kind === "title") fxQueue.push(["champion", `🏆 ${move.from} 우승!`]);
    else if (move && move.kind === "up") fxQueue.push(["champion", `🔺 ${move.to} 승격!`]);
    for (const a of awards) fxQueue.push(["award", `🎖️ ${a}!`]);
    queueFx(fxQueue);
    /* club·league — 그 시즌에 뛴 소속을 결산 시점에 그냥 적어요. 여기 적힌 값이 정본이에요.
     * 이 필드가 생기기 전에 쌓인 옛 항목에는 club이 없어요. 그건 읽는 쪽(fillClubs)이
     * S.moves에서 역산해 메워요 — 세이브는 고치지 않아요(클라우드 동기화와 부딪혀요). */
    // 평균 평점 — 골·도움만으로는 안 드러나는 '꾸준함'을 보여줘요
    const avgRating = apps ? Math.round(((act.ratingSum || 0) / apps) * 10) / 10 : null;
    /* 🎖️ 다음 시즌 칭호 — 이 시즌에 해낸 일로 정해요.
     * 판정은 **수상 목록과 승강 결과를 그대로** 읽습니다(AWARD_BUFF).
     * 지난 시즌 것은 여기서 통째로 갈려요 — 유지하려면 그 성적을 또 내야 해요. */
    const nextBuffs = [];
    for (const a of awards) {
      const id = AWARD_BUFF[a];
      if (id && !nextBuffs.includes(id)) nextBuffs.push(id);
    }
    if (avgRating != null && avgRating >= HOT_FORM_BAR) nextBuffs.push("hot");
    if (move && (move.kind === "title" || move.kind === "up")) nextBuffs.push("champ");
    if (move && move.kind === "down") nextBuffs.push("revenge");
    /* 🌏 월드컵 우승 — **wcHist에 남은 결과를 그대로 읽어요.**
     * 조건을 여기서 다시 계산하면 결산에 뜬 결과와 칭호가 어긋납니다
     * (AWARD_BUFF가 수상 목록을 그대로 읽는 것과 같은 이유예요). */
    if (((S.wcHist || []).filter((h) => h.y === S.proYear)[0] || {}).result === "champion") {
      nextBuffs.push("wcwin");
    }
    S.buffs = nextBuffs;
    S.buffY = S.proYear + 1;
    S.career.years.push({ y: S.proYear, hype: Math.round(hype * 10) / 10, wins, sales, dFan, awards, goals: gg, assists: ga, defense: gd, apps, avg: avgRating, club: S.group, league: leaguePlayed, rank: finalRank, teams: finalTeams, promo: move ? move.kind : null, promoTo: move ? move.to : null, prize: move && move.prize ? move.prize : 0 });
    /* 리그·나라·순위를 함께 남겨요. 나라별 리그를 11개 만들어 놓고 **어느 리그에서
     * 몇 시즌을 뛰는지** 데이터가 없었어요 — "새 리그가 실제로 쓰이나"를 물을 수가
     * 없었습니다. 지금은 시뮬레이션으로만 판단하고 있어요. */
    if (window.Stats) Stats.log("year_end", {
      y: S.proYear, wins, sales, goals: gg, assists: ga,
      lg: leaguePlayed, ctry: leagueOf({ league: leaguePlayed }).country,
      rank: finalRank, hype: Math.round(hype * 10) / 10,
    });
    /* 🗑️ **시즌 결산 자동 성장/노쇠 단계가 없어졌습니다.**
     *
     * 폐기한 형태: `proYear <= 4 ? +rand(0,1)*talent : proYear >= 11 ? -rand(0.6, 1.8)`
     *   ⓐ 5~10시즌이 통째로 **정체 구간**이었고
     *   ⓑ 노쇠가 **일률**이라 능력치 40과 130이 똑같이 깎였어요.
     *
     * 지금은 `S.stats`가 **정점 기준값**이고 지금 실력은 `nowStats`가 곡선을 곱해 냅니다.
     * `startPrep`이 나이를 한 살 올리면 그 순간 실력이 따라 움직여요 — 여기서 할 일이
     * 없습니다. **정체 구간이 구조적으로 생길 수가 없어요.**
     *
     * ⚠️ 여기에 다시 `S.stats`를 더하거나 깎지 마세요. 정점 기준값에 곡선을 누적하면
     *    그 값이 더는 기준값이 아니게 되고, 유망주 카드가 약속한
     *    *"시간이 지나면 같아져요"*가 깨집니다. */
    /* 🕯️ 출전이 적은 시즌 · 🔥 잘한 시즌을 세요.
     * 앞은 은퇴 제안의 조건이고, 뒤는 3시즌 연속 평점 7.0↑이면 **정점 나이 +1**이에요
     * (§7-1 — 성장타입은 고정 라벨이 아닙니다). */
    if (WingerProspect.seasonTally(S, apps, avgRating)) {
      proLog(`🌟 전성기가 늦춰졌어요 — 정점 나이가 ${WingerProspect.peakAgeOf(S)}세가 됩니다`);
    }
    const income = sales * 3 + wins * 40;
    S.money = (S.money || 0) + income;
    S.activity = null;
    S.pendingShow = false;
    save();
    // 결산이 끝난 뒤에 올려요. save()보다 먼저 부르면 collect()가 **지난 시즌** 상태를
    // 담아 올리고 dirty=0 · 새 도장까지 찍어요. 바로 뒤 save()가 dirty를 다시 세워도
    // 방금 켜진 2분 잠금에 막혀서, 다른 기기는 한 시즌 전 상태를 받게 돼요.
    if (window.Cloud) Cloud.mark();
    yearReport();
  }

  /* 🔁 이적 이력 한 줄. S.moves를 읽는 유일한 곳이에요 — 안 읽으면 옮겨 다닌 커리어가
   * 결산에도 은퇴식에도 안 남아서, 이적이 그냥 숫자만 바꾸는 버튼이 돼요.
   * 리그를 옮긴 이적은 어느 리그로 갔는지도 붙여요. 같은 "A→B"라도 국내 이동과
   * 빅클럽행은 전혀 다른 사건이라서요. */
  function moveLog(st) {
    const mv = (st && st.moves) || [];
    if (!mv.length) return "";
    return mv.map((m) => {
      const to = LEAGUES.find((l) => l.id === m.toLg);
      const tag = (to && m.fromLg !== m.toLg) ? `(${to.name})` : "";
      return `${m.y}시즌 ${m.from}→${m.to}${tag}`;
    }).join(" · ");
  }

  /* 연도별 표의 소속 칸 — ⚾ 더 드래프트(beta/rookie/game.js의 shortTeam)와 같은 방식으로
   * 칸이 좁으니 이름을 줄여요. 다만 이 게임 클럽명은 "FC 노바"·"AC 리베라"처럼 약칭이
   * 앞에 붙기도 해서, 첫 낱말만 자르는 rookie 방식 그대로 쓰면 "FC"만 남아 못 알아봐요.
   * 그래서 FC·AC 토큰은 건너뛰고 의미 있는 낱말을 4자로 잘라요. CLUBS 전체를 확인해서
   * 이 자르기로 같은 리그 안 클럽끼리 겹치지 않는 걸 미리 확인했어요. */
  function shortClub(name) {
    if (!name) return "-";
    const parts = String(name).split(" ").filter((p) => p !== "FC" && p !== "AC");
    return (parts[0] || name).slice(0, 4);
  }

  /* 시즌 y에 뛴 소속을 S.moves에서 역산해요.
   *
   * moveToClub이 **시즌 S.proYear가 끝난 오프시즌**에 { y: S.proYear, from, to, … }를
   * 쌓아요. 축구에는 시즌 중 이적이 없어요(설계에서 뺐어요). 그래서 시즌 y의 소속은
   *   ① move.y < y인 **마지막** 이적의 to (리그는 toLg)
   *   ② 그런 이적이 없으면 **첫 이적의 from** (리그는 fromLg) — y 이후에만 옮겼다는 뜻
   *   ③ S.moves가 비어 있으면 지금 소속(st.group / st.league) — 한 번도 안 옮긴 커리어
   * 예요. 근거가 아무것도 없으면(이적 이력도 없고 group도 없는 깨진 세이브) null을
   * 돌려주고, 그 칸만 '-'로 남아요.
   *
   * 옛 세이브도 이 방식이면 표가 채워져요. club을 결산 때 적기 시작한 건 최근이라,
   * 진행 중인 커리어는 그 전 시즌 기록에 club이 없어서 여섯 줄이 전부 '-'였어요. */
  function clubOfYear(y, st) {
    const mv = ((st && st.moves) || []).filter((m) => m && m.y != null && m.to != null);
    let last = null;
    for (const m of mv) if (m.y < y && (!last || m.y >= last.y)) last = m;
    if (last) return { club: last.to, league: last.toLg };
    let first = null;
    for (const m of mv) if (m.from != null && (!first || m.y < first.y)) first = m;
    if (first) return { club: first.from, league: first.fromLg };
    const g = st && st.group;
    return { club: g != null ? g : null, league: st && st.league };
  }

  /* 표를 그릴 때만 쓰는 사본이에요 — S.career.years를 다시 쓰지 않아요(마이그레이션 아님).
   * club이 적혀 있으면 그게 정본이라 손대지 않고, 빈 항목만 역산으로 메워요. */
  function fillClubs(years, st) {
    return (years || []).map((x) => {
      if (!x || x.club != null) return x;
      const g = clubOfYear(x.y, st);
      if (g.club == null) return x;   // 메울 근거가 없어요 — clubCell이 '-'로 그려요
      return Object.assign({}, x, { club: g.club, league: x.league != null ? x.league : g.league });
    });
  }

  /* 시즌 표의 소속 칸 하나. x.club은 결산 시점에 적힌 값이거나 fillClubs가 역산해 채운
   * 값이에요 — 둘 다 없으면(근거 없는 깨진 세이브) '-'로 그려요(던지지 않아요).
   * 리그가 바뀐 시즌은 리그도 짧게 붙여요(LEAGUES[].short) — 같은 리그 안 이적과
   * 리그를 옮긴 이적은 전혀 다른 사건이라서요. */
  /* 이적 제안 카드에 적을 그 클럽의 리그 내 순위.
   *
   * 다른 리그는 시즌을 굴리지 않아요(순위표는 내 리그 것만 있어요). 그래서
   * **전력 순서**로 자리를 매깁니다 — 표기도 "전력 N위"라고 정직하게 써요.
   * 내가 지금 뛰는 리그는 실제 순위표가 있으니 그걸 그대로 씁니다.
   * 전력만 보고는 "3부의 최강"과 "1부의 최약체"를 구분하기 어려웠어요. */
  function clubStanding(club, leagueId) {
    const list = leagueRoster(leagueId);
    if (!list.length) return null;
    if (leagueId === S.league && tableReady()) {
      const rows = tableRows();
      const i = rows.findIndex((r) => r.name === club.name);
      if (i >= 0) return { rank: i + 1, teams: rows.length, real: true };
    }
    const sorted = list.slice().sort((x, y) => y.str - x.str);
    const i = sorted.findIndex((c) => c.name === club.name);
    return i < 0 ? null : { rank: i + 1, teams: list.length, real: false };
  }
  const standingText = (st) => st
    ? `${st.real ? "지난 시즌" : "전력"} ${st.rank}위/${st.teams}` : "";

  function clubCell(x, prev) {
    if (x.club == null) return `<td>-</td>`;
    const hasPrev = !!prev && prev.club != null;
    const movedClub = hasPrev && prev.club !== x.club;
    const movedLeague = hasPrev && prev.league !== x.league;
    const lg = LEAGUES.find((l) => l.id === x.league);
    /* ⚠️ 리그 태그(.yr-lg)와 팀 순위(.yr-rank)는 **다른 칸**이에요.
     * 처음엔 한 span에 "K3 3위"처럼 붙였는데, .yr-lg는 "리그를 옮긴 시즌에만 뜬다"가
     * 규칙이라 순위가 매 시즌 붙으면서 그 규칙이 통째로 깨졌어요. */
    const lgTag = movedLeague && lg ? `<span class="yr-lg">${lg.short}</span>` : "";
    const rankTag = x.rank ? `<span class="yr-rank">${x.rank}위</span>` : "";
    return `<td class="yr-club${movedClub ? " moved" : ""}" title="${x.club}">${shortClub(x.club)}${lgTag}${rankTag}</td>`;
  }

  /* 시즌 표의 성적 칸 하나 — ⚾ 더 드래프트(beta/rookie/career.js:1023, 시즌·나이·성적·WAR)와
   * 같은 방식으로 여러 지표를 한 칸에 합쳐요. 폭 28~34px에 이모지 헤더(🅰️도움·🛡️수비)를
   * 얹었더니 실기기에서 헤더가 세로로 쪼개졌어요(도/움, 수/비) — 칼럼을 7개에서 4개로
   * 줄이고 골·도움·수비를 이 칸 하나로 합쳐서 없애요. 출전은 항상 12라 표에서 뺐어요 —
   * 결산 카드 상단 줄(draft-team)과 통산 요약(draft-summary)에 이미 나와 있어서 안 사라져요. */
  function statCell(x) {
    const g = x.goals != null ? x.goals : "-";
    const a = x.assists != null ? x.assists : "-";
    const d = x.defense != null ? x.defense : "-";
    // 평균 평점 — 골·도움만으로는 안 드러나는 꾸준함이 보여요. 옛 기록에는 없어서 "-"로 둡니다.
    return `<td class="yr-stat">${g}골 ${a}도움 ${d}수비</td><td class="yr-avg">${x.avg != null ? x.avg.toFixed(1) : "-"}</td>`;
  }

  /* 그 시즌이 어땠는지 한마디. **리그 안 기준**이에요.
   *
   * inLeague = hype - K·ln(리그 격) — 리그 격이 곱해지기 전의 값이에요.
   * K리그1(격 1.00)에서는 hype와 같아서, 그때 잡아 둔 문턱이 그대로 살아 있어요.
   *   5년차 실측(K리그1): 능력치 50→3.8 · 70→5.3 · 90→6.4 · 110→7.4 · 130→7.9
   *
   * 수상 개수도 봐요. 상을 셋 넘게 받은 시즌이 "아쉽다"고 뜨면 화면이 자기모순이에요. */
  function seasonTitle(y) {
    const lg = leagueOf({ league: y.league || S.league });
    const inLeague = (y.hype || 0) - AXIS_K * Math.log(lg.prestige || 1);
    const awards = (y.awards || []).length;
    if (inLeague >= 7.6 || awards >= 4) return "리그를 지배한 시즌!";
    if (inLeague >= 6.0 || awards >= 2) return "제 몫을 해낸 시즌";
    if (inLeague >= 3.5 || awards >= 1) return "아쉬움이 남는 시즌";
    return "혹독한 시즌…";
  }

  function yearReport() {
    const y = S.career.years[S.career.years.length - 1];
    // 그릴 때만 소속을 메운 사본을 써요 — 세이브(S.career.years)는 그대로 둬요.
    const slice = fillClubs(S.career.years.slice(-8), S);
    const rows = slice.map((x, i) =>
      `<tr><td>${x.y}시즌</td>${clubCell(x, slice[i - 1])}${statCell(x)}<td>${x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    /* 🎓 은퇴 — 시즌 수가 아니라 **나이**로 봅니다 (§6-4).
     *   · forcedRetire  — 나이 상한. 더 뛸 시즌이 없어요
     *   · suggestRetire — 곡선이 문턱 밑이고 출전이 적은 시즌이 연달았을 때. **제안**이에요 */
    const forcedRetire = WingerProspect.mustRetire(S);
    const suggestRetire = WingerProspect.suggestRetire(S);
    const myAge = WingerProspect.ageOf(S);
    const cr = S.career;
    $("career-title").textContent = `📊 ${y.y}시즌 결산`;
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚽</div>
      <div class="draft-title">${
        /* ⚠️ 시즌 문구는 **그 리그 안에서 얼마나 잘했나**로 봐요.
         *
         * 예전에는 hype를 그대로 썼는데, hype는 명예의 전당 가치라 리그 격이
         * 곱해져 있어요. 그래서 K리그3에서 "리그를 지배한 시즌"을 보려면 299골이
         * 필요했습니다(프리미어리그는 69골). 실제로 75골 16도움에 신인왕·리그MVP·
         * 베스트11·골든부츠·공격포인트왕 5관왕인데 "아쉬움이 남는 시즌"이 떴어요 —
         * 수상 문턱은 bar로 리그 안 기준인데 문구만 절대 기준이라 생긴 모순이에요.
         *
         * 리그 격을 도로 나눠서(= K·ln(prestige)를 빼서) 리그 안 눈금으로 되돌려요.
         * 문턱은 K리그1(prestige 1.00) 기준이라 그때 값이 그대로 유지됩니다.
         * 수상도 함께 봐요 — 상을 쓸어 담은 시즌이 "아쉽다"고 뜨면 안 돼요. */
        seasonTitle(y)
      }</div>
      <div class="draft-team">${leagueOf({ league: y.league || S.league }).flag} ${y.club || S.group} · ${leagueOf({ league: y.league || S.league }).name} · 전력 ${clubStrOf(S)}${y.rank ? ` · 리그 <b>${y.rank}위</b>${y.teams ? `/${y.teams}팀` : ""}` : ""} · ${y.apps || 0}경기 ⚽${y.goals || 0}골 🅰️${y.assists || 0}도움 🛡️${y.defense || 0} · MOM ${y.wins}회${y.avg != null ? ` · 평균 평점 ${y.avg.toFixed(1)}` : ""}</div>
      ${y.promo ? `<div class="hint">${
        y.promo === "title" ? `🏆 <b>${y.promoTo} 우승!</b> 리그 정상에 섰어요${y.prize ? ` · 💰 우승 상금 +${y.prize}만` : ""}`
        : y.promo === "up" ? `🔺 <b>리그 우승!</b> ${(y.y || 0) + 1}시즌부터 <b>${y.promoTo}</b>에서 뜁니다${y.prize ? ` · 💰 우승 상금 +${y.prize}만` : ""}`
        : `🔻 최하위로 강등… ${(y.y || 0) + 1}시즌부터 <b>${y.promoTo}</b>에서 다시 시작해요`}</div>` : ""}
      ${y.club && y.club !== S.group ? `<div class="hint">🔁 <b>${S.group}</b>로 이적했어요 — ${(y.y || 0) + 1}시즌부터 새 팀에서 뜁니다</div>` : ""}
      ${/* 🌏 월드컵 — **뽑혔든 안 뽑혔든** 한 줄이 있어야 해요.
          이게 없으면 컵이 끝나고 아무 말 없이 결산으로 넘어와서, 플레이어는
          "발탁이 안 돼서 그런 건가?"만 하게 됩니다(제보). 미발탁도 결과예요.
          reportLine이 문턱·깜짝 발탁 가능성·우승국까지 담아 줍니다. */
        (window.WingerWorldCup && WingerWorldCup.reportLine())
          ? `<div class="wc-report">${WingerWorldCup.reportLine()}</div>` : ""}
      ${/* 🗞️ 팀 소식 — 동료가 크고, 부진하고, 은퇴해요. 이게 없으면 명단이
          조용히 바뀌어서 "언제 사람이 바뀌었지?"가 됩니다. */
        (window.WingerSquad && WingerSquad.newsLine())
          ? `<div class="hint squad-news">${WingerSquad.newsLine()}</div>` : ""}
      ${moveNote ? `<div class="hint learn">${moveNote}</div>` : ""}
      ${/* 🎖️ 이 시즌에 받은 칭호 — 다음 시즌 경기에 붙어요. 결산에서 보여줘야
          "이번 시즌을 잘 치르면 다음 시즌이 편해진다"가 눈에 들어와요. */
        (S.buffs || []).length
          ? `<div class="hint buff-next">🎖️ <b>${(S.proYear || 0) + 1}시즌 칭호</b> — `
            + S.buffs.map((id) => { const t = seasonTitleOf(id); return t ? `${t.name} <span class="bn-eff">${t.desc}</span>` : ""; })
              .filter(Boolean).join(" · ") + `</div>`
          : `<div class="hint buff-next dim">🎖️ 다음 시즌 칭호 없음 — 부문 1위·수상·우승·승격 중 하나를 해내면 다음 시즌 경기에 효과가 붙어요</div>`}
      <table class="season-table season-soccer"><thead><tr><th>시즌</th><th>소속</th><th>성적</th><th>평점</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="draft-summary">
        프로 통산 ${cr.years.length}시즌 · 출전 ${cr.apps || 0} · ⚽ ${cr.goals || 0}골 · 🅰️ ${cr.assists || 0}도움 · 🛡️ ${cr.defense || 0} · 🏅 MOM ${cr.wins}회<br/>
        🏆 MVP ${cr.daesang} · 베스트11 ${cr.bonsang}${cr.rookie ? " · 신인왕" : ""} · ⭐ 명성 ${Math.round(S.fandom)}<br/>
        ${forcedRetire ? `만 ${myAge}세 — 더 뛸 시즌이 없어요. 아름다운 마무리를…`
          : suggestRetire ? `🕯️ 만 ${myAge}세 · 출전이 줄었어요 — 은퇴를 생각해 볼 때입니다 (더 뛰어도 돼요)`
          : myAge > WingerProspect.peakAgeOf(S) ? `🕯️ 전성기가 지났어요 — 만 ${myAge}세, 몸이 예전 같지 않습니다`
          : "다음 시즌도 계속 뛸 수 있어요!"}
      </div>`;
    moveNote = null;   // 한 번만 보여줘요 — 다음에 결산을 열면 안 뜹니다
    const act = $("career-actions");
    act.innerHTML = "";
    if (!forcedRetire) {
      const next = document.createElement("button");
      next.className = "btn btn-primary";
      next.textContent = `⚽ ${S.proYear + 1}시즌 시작`;
      next.onclick = startPrep;
      act.appendChild(next);
      /* 💼 이적은 오프시즌에만 열려요. 마지막 시즌(강제 은퇴)에는 갈 다음 시즌이
       * 없으니 안 띄우고, 한 오프시즌에 두 번 옮기지도 못하게 막아요. */
      if (canTransfer(S)) {
        const tf = document.createElement("button");
        tf.id = "btn-transfer";
        tf.className = "btn btn-ghost";
        tf.textContent = "💼 이적 제안 보기";
        tf.onclick = renderTransfer;
        act.appendChild(tf);
      }
    }
    const ret = document.createElement("button");
    ret.className = "btn btn-ghost";
    ret.textContent = "🎓 은퇴하기";
    ret.onclick = () => {
      if (!confirm(
        `🎓 여기서 커리어를 마칠까요?\n\n` +
        `· 명예의 전당에 기록이 남아요\n` + retireSummary() +
        `· 등급: ${(() => {
          const sc = careerScore();
          const nx = nextGrade(sc);
          /* 점수와 다음 등급까지 남은 거리를 같이 보여줘요. 되돌릴 수 없는 선택이니
           * "한 시즌 더 뛰면 위로 올라가나"를 여기서 판단할 수 있어야 해요. */
          return `${gradeOfScore(sc)} (${sc}점${nx ? ` · ${nx.name}까지 ${nx.need}점` : " · 최고 등급"})`;
        })()}\n\n` +
        `⚠️ 되돌릴 수 없어요.\n\n진행할까요?`
      )) return;
      enshrine();
    };
    act.appendChild(ret);
    if (window.Ads) window.Ads.display($("ad-career"));
    show("screen-career");
  }

  // ---------- 💼 이적 ----------
  /* 오프시즌(시즌 결산)에서만 열려요. 축이 둘인데 서로 겹치지 않아요.
   *
   *  · 같은 리그 이적 — 클럽 전력이 동료 득점·실점에 작용해요. 우승과 팀 성적의 축이에요.
   *  · 상위 리그 이적 — 평점 페널티와 수상 가치가 움직여요. 개인 커리어의 축이에요.
   *
   * 실측으로 갈라진 값이에요. 전력을 50에서 90으로 올리면 팀 승률이 12~29%p 오르는데
   * 리그MVP 확률은 1.3%p 안에서만 움직여요. 리그를 올리면 정반대예요.
   * 그래서 카드에 평점 페널티와 수상 가치를 숫자로 적어요 — 이게 도박의 크기라
   * 감추면 "왜 갑자기 무너졌는지" 모르는 채로 올라가게 돼요. */
  const TRANSFER_MIN_YEAR = 2;               // 같은 리그 이적도 2년차부터 열려요

  /* 승격 문턱 — "그 리그의 제안이 오는 직전 시즌 hype"예요. 키는 리그 id고,
   * 순서는 id가 아니라 tier예요 (id는 옛 세이브가 가리키는 값이라 순서와 무관해요).
   *
   * 5단 전부를 덮어요. 하부 리그에 문턱이 없으면 need가 Infinity가 돼서
   * 📹 세미프로로 시작한 선수가 영원히 K리그3에 갇혀요 — 사다리가 통째로 죽습니다.
   * 맨 아래(K리그3)는 위에서 내려오는 길뿐이라 문턱이 쓰일 자리가 없지만,
   * 표에 빠져 있으면 "빠뜨린 건지 없는 건지"가 안 보여서 0으로 적어 둡니다.
   *
   * 값은 감이 아니라 실측이에요. hype는 리그마다 눈금이 달라요 — 축에 prestige를
   * 곱하니 같은 성적이라도 K리그3(0.55)에서는 K리그1보다 1.8쯤 낮게 나옵니다.
   * 그래서 문턱을 '그 리그에서 그 hype를 중앙값으로 내는 능력치'로 환산해서 잡았어요.
   * (5년차·컨디션 80·명성 900 · 포지션 4종 × 400시즌)
   *
   *   K리그3 → K리그2   2.5 — 능력치 51
   *   K리그2 → K리그1   4.5 — 능력치 61
   *   K리그1 → 유로파    5.5 — 능력치 69
   *   유로파 → 챔피언스  6.5 — 능력치 88 (K리그1 눈금 기준)
   *
   * 능력치로 환산하면 51 → 61 → 69 → 88로 단조 증가해요. 하부에서 위로 가는 게
   * K리그1에서 유로파로 가는 것보다 확실히 쉽다는 뜻이고, tests/soccer/promote-test.js가
   * 이 순서를 지킵니다. 위쪽 둘(5.5·6.5)은 이적 작업에서 잡은 값 그대로예요. */
  /* 리그 11개로 늘면서 칸을 나눴어요. tier 순으로 단조 증가해야 해요.
   *
   * ⚠️ 위쪽 칸 간격을 0.15에서 0.39로 넓혔어요. ⚽ 득점 눈금(GOAL_SCALE)을 넣으면서
   * 골 수가 작아졌고, 포아송의 상대 분산이 커져서 **시즌 hype의 편차가 넓어졌습니다** —
   * 능력치 70의 최고 시즌이 6.32 → 6.96으로 뛰었어요. 칸이 0.15씩이면 그 흔들림에
   * 리그 서너 개가 통째로 묻혀서, "위로 갈수록 필요 능력치가 는다"가 깨집니다
   * (실측: J1 67.5 < 브라질B 67.6처럼 뒤집혔어요).
   *
   * 지금 눈금(K리그1 기준 시즌 hype): 능력치 70 중앙 5.65 · 최고 6.96 /
   * 능력치 90 중앙 6.60 · 상위1% 7.49 / 능력치 110 중앙 7.37 · 상위1% 8.03.
   * 프리미어리그 7.60은 **능력치 110의 좋은 시즌**이라야 닿고, 능력치 70은
   * 아무리 잘해도 못 닿아요 — tests/soccer/transfer-test.js가 그걸 지킵니다. */
  const PROMOTE_HYPE = { 5: 0, 4: 2.5, 1: 4.5, 6: 5.45, 8: 5.81, 7: 6.18, 9: 6.54, 10: 6.91, 2: 7.27, 11: 7.64, 3: 8.00 };
  const OFFERS_PER_LEAGUE = 2;               // 리그마다 제안 수

  /* 계약금 — 리그 격과 클럽 전력에서 뽑아요. 격은 거듭제곱(FEE_PRESTIGE_POW)으로 실어요.
   * 리그를 올리는 이적이 눈에 띄게 큰 돈이어야 "지금 갈까"가 고민이 돼요.
   * 10만 단위로 끊어 읽기 좋게 합니다.
   *
   * 여기에 세 가지를 겁니다. 안 걸면 이적이 그냥 돈줄이 돼요 —
   * 같은 리그 안에서 A↔B를 오가기만 해도 매 오프시즌 계약금이 들어왔어요.
   *
   *  · 리그를 내려가면 계약금이 크게 줄어요. 몸값이 떨어지는 일이니까요.
   *  · 한 번 떠난 클럽으로 돌아갈 땐 계약금이 없어요. 왕복으로 두 번 받는 길을 막습니다.
   *  · 이적을 거듭할수록 줄어요. 매년 새 클럽으로 갈아타는 무한 급전도 막아야 해요.
   *
   * 이 셋이 다 있어야 막혀요. 돌아가는 이적만 0으로 하면 6개 클럽을 한 바퀴 도는
   * 우회로가 남고, 감가만 걸면 왕복이 여전히 조금씩 벌어요. */
  const DOWNGRADE_FEE = 0.3;   // 리그를 한 단계 내려갈 때마다 곱해요
  /* 낙폭에 상한을 둬요. 리그가 5개에서 11개로 늘면서 tier 차가 최대 10이 됐고,
   * 0.3^10은 0.0000059라 계약금이 통째로 0원이 됩니다("계약금 없음"으로 찍혀요).
   * 한 단계 0.3은 그대로 두되(하향 이적은 확실히 손해여야 해요), 세 단계에서 멈춰요 —
   * 0.3^3 = 0.027이면 이미 충분히 아프고, 그 아래는 0과 구별이 안 돼요. */
  const DOWNGRADE_MAX = 3;
  const LOYALTY_FEE = 0.75;    // 지금까지 한 이적 횟수만큼 거듭제곱으로 곱해요

  /* 리그격을 몇 제곱으로 실을지예요. 원래 세제곱이었는데 제곱으로 낮췄어요.
   *
   * 5단 사다리를 만들며 챔피언스리그의 prestige가 1.80 → 2.40으로 올랐어요.
   * 계약금이 prestige의 세제곱이라 그것만으로 최상위 계약금이 2.37배가 됐습니다.
   * 실측(K리그3 시작 · 사다리 끝까지 오르는 정책 · 12시즌 8판):
   *   · 뛰어서 버는 돈은 12시즌에 1.5억쯤이에요 (K리그1 붙박이 기준).
   *   · 그런데 챔피언스리그 계약금 한 장이 1.4억이 나왔어요 — 버튼 한 번이
   *     커리어 전체를 뛴 것과 맞먹고, 커리어 총수입의 73%가 이적에서 나왔어요.
   *     계약금에 브레이크 셋을 건 이유(이적이 그냥 돈줄이 되면 안 된다)가 무너집니다.
   *
   * 2.40의 제곱(5.76)이 1.80의 세제곱(5.83)과 거의 같아요. 그래서 제곱으로 낮추면
   * K리그1(격 1.00이라 원래 안 변함)과 챔피언스리그가 **둘 다** 예전 크기로 돌아와요.
   * 계수(0.22)를 대신 깎으면 K리그1 이적까지 41%로 쪼그라들어서, 사다리 아래쪽
   * 계약금이 경기 수당 한 판(30만) 수준으로 내려앉습니다.
   * 실측 후: 커리어 총수입 1.22억 · 최대 계약금 7560만. tests/soccer/fee-test.js가 못 박아요. */
  const FEE_BASE = 0.22;         // 클럽 전력의 제곱에 곱해요
  const FEE_PRESTIGE_POW = 2;    // 리그격을 이만큼 거듭제곱해서 실어요

  // 예전에 떠나온 클럽인가요. 이적 기록의 '떠난 곳'으로 봐요.
  const leftBefore = (st, name) => ((st && st.moves) || []).some((m) => m.from === name);

  function transferFee(club, league, st) {
    const state = st || S;
    const moves = (state && state.moves) || [];
    // 한 번 떠난 클럽은 다시 계약금을 주지 않아요. 돌아오는 건 자유지만 공짜예요.
    if (leftBefore(state, club.name)) return 0;
    /* 낙폭은 tier로 봐요. id는 옛 세이브가 가리키는 값이라 순서와 무관해요 —
     * id로 빼면 K리그1(id 1)에서 K리그3(id 5)으로 내려가는 게 drop 0이 돼서
     * 하향 이적인데도 계약금이 한 푼도 안 깎여요. */
    const drop = Math.min(DOWNGRADE_MAX, Math.max(0, leagueOf(state).tier - league.tier));
    /* ⚠️ 나라 특색(🇬🇧 수입 +35%)은 여기 안 겁니다. 계약금은 낙폭·재이적·감가
     * 세 브레이크로 조심스럽게 잡아 둔 자리고, tests/soccer/fee-test.js가
     * "리그격을 정확히 2제곱으로 싣는가"로 폭주를 막고 있어요. 여기에 곱셈을
     * 하나 더 얹으면 그 측정이 2.34제곱으로 읽혀 가드가 흐려집니다.
     * 🇬🇧의 수입 특색은 매 경기 수당에만 붙어요 — 그쪽이 브레이크가 없는 자리예요. */
    const base = club.str * club.str * FEE_BASE * Math.pow(league.prestige, FEE_PRESTIGE_POW);
    return Math.round(
      (base * Math.pow(DOWNGRADE_FEE, drop) * Math.pow(LOYALTY_FEE, moves.length)) / 10
    ) * 10;
  }

  // 계약금이 0이면 "0만"이라고 적지 않아요 — 왜 0인지가 안 보이면 고장으로 읽혀요.
  const feeText = (fee, back) =>
    fee > 0 ? `계약금 ${fmtMoney(fee)}` : `계약금 없음${back ? " (떠났던 클럽)" : ""}`;

  // 직전 시즌 hype. 이번 결산에서 방금 쌓은 값이에요.
  function lastHype(st) {
    const ys = (st && st.career && st.career.years) || [];
    return ys.length ? (ys[ys.length - 1].hype || 0) : 0;
  }
  // 한 오프시즌에 두 번 옮기지는 못해요. 이적 기록의 연차로 봐요.
  const movedThisYear = (st) => ((st && st.moves) || []).some((m) => m.y === st.proYear);
  const canTransfer = (st) => !!st && (st.proYear || 0) >= TRANSFER_MIN_YEAR && !movedThisYear(st);

  /* 갈 수 있는 리그마다 클럽을 OFFERS_PER_LEAGUE개씩 뽑아요.
   * 아래로 내려오는 이적은 언제든 가능해요 — 못 버티고 돌아오는 길을 막으면
   * 도전 자체를 안 하게 돼요. 위로 갈 때만 직전 시즌 hype 문턱을 봐요. */
  function transferOffers(st) {
    const state = st || S;
    if (!canTransfer(state)) return [];
    const cur = leagueOf(state);
    const hype = lastHype(state);
    const list = [];
    for (const lg of LEAGUES) {
      /* 위·아래는 tier로 봐요. id는 옛 세이브가 가리키는 값이라 순서와 무관해요 —
       * id로 비교하면 하부 리그(id 4·5)가 맨 위로 읽혀서 K리그3에서 챔피언스리그 제안이
       * 문턱 없이 쏟아져요. 문턱이 빠진 리그(need == null)는 위로 못 올라가요 —
       * PROMOTE_HYPE는 5단 전부를 덮으니 지금은 걸릴 일이 없지만, 표에서 한 줄이
       * 사라지면 그 리그가 막다른 길이 되는 걸 이 방어선이 조용히 대신 막아 줍니다. */
      const need = PROMOTE_HYPE[lg.id];
      if (lg.tier > cur.tier && hype < (need == null ? Infinity : need)) continue;
      const pool = clubsIn(lg.id, state).filter((c) => c.name !== state.group);
      for (const club of shuffle(pool.slice()).slice(0, OFFERS_PER_LEAGUE)) {
        list.push({ club, league: lg, fee: transferFee(club, lg, state), back: leftBefore(state, club.name) });
      }
    }
    return list;
  }

  /* 도박의 크기 — 평점에서 빼는 값과 수상 가치에 곱하는 값이에요.
   *
   * 하부 리그는 페널티가 0이라 숫자만 적으면 "공짜로 갈 수 있는 곳"으로 읽혀요.
   * 실제 대가는 수상 가치(prestige < 1)예요 — 상은 쉽게 받지만 명예의 전당 점수가
   * 작아요. 그래서 위로 가는 카드와 아래로 가는 카드에 각각 한 마디를 붙여 둡니다. */
  const riskText = (lg) => {
    const pen = lg.penalty > 0 ? `평점 -${lg.penalty.toFixed(1)}` : "평점 그대로";
    const note = lg.penalty > 0 ? " · 버티면 값어치가 커요"
      : lg.prestige < 1 ? " · 상은 쉬워도 값어치가 작아요" : "";
    /* 🌍 나라 특색도 카드에 적어요. 안 적으면 "왜 이 리그에 머물지"를 화면에서
     * 알 방법이 없어서, 결국 수상 값어치 하나만 보고 고르게 됩니다. */
    const t = COUNTRY_TRAIT[lg.country];
    const nat = t && t.tag ? ` · ${t.tag}` : "";
    return `${pen} · 수상 가치 ×${lg.prestige.toFixed(2)}${note}${nat}`;
  };

  // 리그는 언제나 tier 순으로 늘어놔요 — 화면이 곧 사다리라야 위아래가 읽혀요.
  const byTier = () => LEAGUES.slice().sort((a, b) => a.tier - b.tier);

  function renderTransfer() {
    const cur = leagueOf(S);
    $("transfer-title").textContent = `💼 이적 제안 — ${S.proYear}시즌 오프시즌`;
    /* 문턱은 '지금보다 위'만 적어요. 5단 전부를 적으면 이미 지나온 리그의 문턱까지
     * 줄줄이 붙어서 정작 다음 칸이 어디인지가 안 보여요. */
    const upper = byTier().filter((l) => l.tier > cur.tier && PROMOTE_HYPE[l.id] != null);
    const gate = upper.map((l) => `${l.name} ${PROMOTE_HYPE[l.id]}`).join(" · ");
    const gateLine = upper.length
      ? `직전 시즌 평가 <b>${lastHype(S).toFixed(1)}</b> — 위 리그 제안은 평가가 이만큼 돼야 와요 (${gate}).`
      : `직전 시즌 평가 <b>${lastHype(S).toFixed(1)}</b> — 여기가 사다리의 꼭대기예요. 더 올라갈 리그는 없어요.`;
    $("transfer-now").innerHTML =
      `지금은 <b>${cur.flag} ${S.group}</b> (${cur.name} · 전력 ${clubStrOf(S)}) 소속이에요.<br/>`
      + `${gateLine}<br/>`
      + `아래 리그로 내려가는 이적은 언제든 할 수 있어요 — 대신 계약금이 크게 줄어요.<br/>`
      + `한 번 떠난 클럽으로 돌아갈 땐 계약금이 없고, 이적을 거듭할수록 계약금이 깎여요.`;
    const box = $("transfer-list");
    box.innerHTML = "";
    const offers = transferOffers(S);
    if (!offers.length) {
      box.innerHTML = `<p class="hint">올해는 들어온 제안이 없어요.</p>`;
    }
    /* 리그 묶음은 tier 순으로 그려요 — 아래 리그도 위 리그와 똑같은 형식이라
     * 사다리 한 칸씩 오르내리는 게 화면에서 그대로 보여야 해요. */
    for (const lg of byTier()) {
      const mine = offers.filter((o) => o.league.id === lg.id);
      if (!mine.length) continue;
      const group = document.createElement("div");
      // 위·아래 표시도 tier로 봐요 — transferOffers와 같은 기준이어야 해요.
      const dir = lg.tier > cur.tier ? "up" : lg.tier < cur.tier ? "down" : "same";
      group.className = `tf-group ${dir}`;
      group.dataset.league = String(lg.id);
      group.dataset.tier = String(lg.tier);
      const head = document.createElement("div");
      head.className = "tf-head";
      const arrow = dir === "up" ? "▲ 위 리그" : dir === "down" ? "▼ 아래 리그" : "지금 리그";
      head.innerHTML = `<span class="tf-lg">${lg.flag} ${lg.name} <small>${arrow}</small></span><span class="tf-risk">${riskText(lg)}</span>`;
      group.appendChild(head);
      for (const o of mine) {
        const card = document.createElement("button");
        card.className = `tf-card ${dir}`;
        card.dataset.club = o.club.name;
        card.dataset.league = String(lg.id);
        card.dataset.tier = String(lg.tier);
        card.dataset.fee = String(o.fee);
        /* 카드마다 리그 이름·페널티·수상 가치를 다시 적어요. 헤더에만 있으면
         * 스크롤하다 카드만 보고 누르는 사람에게는 안 보여요. 리그가 5개로 늘어난 뒤로는
         * "이 카드가 어느 리그 것인지"부터 안 보이는 게 제일 위험해요. */
        card.innerHTML = `
          <span class="tf-top"><span class="tf-name">${o.club.name}</span><span class="tf-str">전력 ${o.club.str}</span></span>
          <span class="tf-sub"><span class="tf-rank">🏟️ ${standingText(clubStanding(o.club, lg.id)) || "순위 정보 없음"}</span></span>
          <span class="tf-sub"><span class="tf-lg">${lg.flag} ${lg.name}</span><span class="tf-fee">${feeText(o.fee, o.back)}</span></span>
          <span class="tf-sub"><span class="tf-risk">${riskText(lg)}</span></span>`;
        card.onclick = () => acceptOffer(o);
        group.appendChild(card);
      }
      box.appendChild(group);
    }
    show("screen-transfer");
  }

  /* 소속을 바꾸고 이적 기록을 남겨요. 리그·전력이 함께 바뀌어야
   * 다음 시즌 상대(oppClubs)와 동료 득점·실점이 새 클럽 기준으로 굴러가요. */
  /* 🎒 이적 적응 — 새 팀에 가면 **낮은 확률로** 하나를 배워요.
   *
   * 그냥 공짜 보너스로 두면 "이적은 무조건 이득"이 돼서 지금의 도박 구조가
   * 흐려져요(위 리그는 평점 페널티를 안고 가는 선택이에요). 그래서 두 가지로 묶었어요.
   *
   *   ① 확률은 **얼마나 높이 올라갔나**를 봐요. 같은 리그 안 이적은 배울 게 적고,
   *      위 리그로 갈수록 커집니다. 내려가면 제일 낮아요.
   *   ② 오르는 칸은 **가는 나라가 잘 가르치는 것**이에요 —
   *      🇧🇷 드리블 · 🇮🇹 수비. 그 외 나라는 내 포지션 주 스탯이에요.
   *      나라 특색(COUNTRY_TRAIT)이 훈련 배수로만 쓰이고 있었는데,
   *      "왜 이 나라로 가나"에 이유를 하나 더 얹어요.
   *
   * 크기는 한 경기 실전 성장(rand(0.4,1.4) × 재능)보다 크고, 한 시즌 훈련보다는
   * 훨씬 작아요. 이적을 갈아타는 이유가 되면 안 되고, 갔을 때 반가운 정도예요.
   *
   * ⚠️ 상한에 닿은 칸은 대상에서 빼요 — 안 그러면 "배웠는데 숫자가 그대로"가 돼요. */
  let moveNote = null;            // 방금 이적에서 배운 것 — 결산 화면에 한 번 보여주고 지워요
  /* 실측 — 실제로 일어나는 이적(1~3티어 상승)에서 18 · 26 · 34%예요.
   * 경기당 실전 성장(6~25%)과 같은 결이라 "낮은 확률로 하나 배운다"로 읽혀요.
   * 한 티어 이적 1회 기댓값 0.5p, 열 번 갈아타도 5p 안팎 — 한 시즌 실전 성장(5.3p)
   * 수준이에요. 이적을 갈아타는 이유가 되면 안 되고, 갔을 때 반가운 정도입니다. */
  const MOVE_LEARN_BASE = 0.10;   // 같은 리그로 옮길 때
  const MOVE_LEARN_STEP = 0.08;   // 티어 한 칸 올라갈 때마다
  const MOVE_LEARN_MAX = 0.40;

  function moveLearnP(fromLg, toLg) {
    const a = LEAGUES.find((l) => l.id === fromLg), b = LEAGUES.find((l) => l.id === toLg);
    if (!a || !b) return MOVE_LEARN_BASE;
    return clamp(MOVE_LEARN_BASE + (b.tier - a.tier) * MOVE_LEARN_STEP, 0.05, MOVE_LEARN_MAX);
  }

  /* 그 나라가 잘 가르치는 칸. 없으면 내 포지션 주 스탯이에요. */
  function moveLearnKey(league) {
    const t = COUNTRY_TRAIT[league.country] || {};
    const key = t.focus || POS_INFO[S.pos].stat;
    return atCap(key) ? null : key;
  }

  /* 이적 직후에 굴려요. 배웠으면 그 문구를 돌려주고, 아니면 null이에요. */
  function moveLearn(fromLg, league) {
    if (Math.random() >= moveLearnP(fromLg, league.id)) return null;
    const key = moveLearnKey(league);
    if (!key) return null;
    const d = (Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos]).find((x) => x.key === key);
    if (!d) return null;
    const gain = Math.round(rand(1.2, 3.2) * (S.talents[key] || 1) * 10) / 10;
    S.stats[key] = clamp(S.stats[key] + gain, 0, statCap(key));
    const t = COUNTRY_TRAIT[league.country] || {};
    const why = t.focus === key
      ? `${league.flag} ${league.name}의 방식이 몸에 붙어`
      : "새 팀 훈련에 적응하며";
    return `🎒 ${why} ${d.name}을(를) 배웠어요! +${gain.toFixed(1)} (${Math.round(S.stats[key])})`;
  }

  function moveToClub(club, league, bonus) {
    const from = S.group;
    const prevLeague = S.league || 1;
    const prevBack = leftBefore(S, club.name);   // 기록을 쌓기 전에 봐요
    S.group = club.name;
    S.clubStr = club.str;
    S.league = league.id;
    S.leagueSince = S.proYear;               // 이적으로 리그가 바뀌어도 정착 기간을 새로 세요
    S.money = (S.money || 0) + (bonus || 0);
    if (!Array.isArray(S.moves)) S.moves = [];
    S.moves.push({ y: S.proYear, from, to: club.name, fromLg: prevLeague, toLg: league.id });
    proLog(`💼 ${from} → ${club.name} 이적! (${league.name} · ${feeText(bonus || 0, prevBack)})`);
    /* 🎒 적응 — S.league을 새 리그로 바꾼 **뒤에** 굴려요. atCap·statCap이
     * 초월 단계를 보는데 그건 소속과 무관하지만, 문구에 새 리그 이름이 들어가요. */
    const learned = moveLearn(prevLeague, league);
    if (learned) {
      proLog(learned);
      queueFx([["flash", learned.replace(/^🎒 /, "🎒 ")]]);
    }
    if (window.Stats) Stats.log("transfer", { y: S.proYear, from, to: club.name, fromLg: prevLeague, toLg: league.id, learn: learned ? 1 : 0 });
    save();
    return learned;
  }

  function acceptOffer(o) {
    /* 적응으로 배운 게 있으면 결산 화면에 한 줄로 남겨요. 프로 로그(proLog)에만
     * 남기면 결산으로 넘어가는 순간 안 보여서 "아무 일도 없었다"로 읽혀요. */
    moveNote = moveToClub(o.club, o.league, o.fee);
    /* 💼 이적 축하가 먼저, 🎒 적응으로 배운 것은 그 뒤에 와요 — moveToClub이
     * 같은 줄에 넣어 뒀으니 여기서 앞에 끼워 넣으면 순서가 뒤집혀요.
     * 그래서 moveToClub보다 **먼저** 부르지 않고, 큐가 알아서 잇게 둡니다. */
    queueFx([["award", `💼 ${o.club.name} 이적!`]]);
    yearReport();   // 결산으로 돌아가요 — 새 소속으로 다시 그려져요
  }

  // ---------- 명예의 전당 ----------
  /* 🏛️ 커리어 등급 — 은퇴할 때 남는 평가예요. 지금 실력을 재는 클래스(titleOf)나
   * 시즌 성적으로 받는 칭호(SEASON_TITLES)와는 또 다른, 평생치 축입니다.
   *
   * 12단계예요. 예전에는 6단계라 커리어의 절반이 "🌟 한 시대를 풍미한 선수" 하나에
   * 몰렸어요 — 능력치 85로 15시즌을 뛴 커리어와 110으로 뛴 커리어가 같은 이름을
   * 받았습니다. 문턱은 아래 careerScore의 실측 분포 위에 얹었어요. */
  const CAREER_GRADES = [
    [4200, "🌍 축구사를 다시 쓴 선수"],
    [3400, "🐐 축구 역사에 남을 레전드"],
    [2800, "🏆 시대를 지배한 선수"],
    [2300, "👑 세계가 인정한 선수"],
    [1850, "⭐ 모두가 아는 이름"],
    [1400, "🌟 한 시대를 풍미한 선수"],
    [1050, "🏅 리그의 상징"],
    [800, "💪 리그를 대표한 선수"],
    [550, "🎽 팀의 기둥"],
    [300, "🧢 꾸준했던 주전"],
    [150, "🔄 스쿼드의 한 자리"],
    [0, "🌱 짧지만 빛났던 커리어"],
  ];
  const gradeOfScore = (sc) =>
    (CAREER_GRADES.find(([bar]) => sc >= bar) || CAREER_GRADES[CAREER_GRADES.length - 1])[1];

  /* 다음 등급까지 얼마나 남았나. 12단계로 잘게 나눈 이상, "지금 어디쯤이고 조금만
   * 더 하면 뭐가 되는지"가 보여야 나눈 값을 합니다. 꼭대기면 null이에요. */
  function nextGrade(sc) {
    const at = CAREER_GRADES.findIndex(([bar]) => sc >= bar);
    if (at <= 0) return null;                      // 이미 맨 위
    const [bar, name] = CAREER_GRADES[at - 1];
    return { name, need: bar - sc };
  }

  /* 커리어 점수의 가중치.
   *
   * ⚠️ 예전 산식은 명성 ×0.5 · MOM ×6이 전체의 3분의 2를 차지했어요. 둘 다
   * **약한 리그일수록 쉽게 쌓이는** 값이라 순서가 뒤집혀 있었습니다 —
   * 실측(10시즌 · 30회): 같은 능력치 130으로 K리그3에 눌러앉으면 4173점,
   * 프리미어리그까지 올라가면 2572점. 올라가는 게 손해였어요.
   * 게다가 분포의 **바닥이 946점**이라 850점 문턱은 사실상 전원 레전드였습니다.
   *
   * 지금은 업적이 중심이에요. 상과 우승은 리그 격을 곱한 가중 카운터로 세고,
   * 가장 높이 오른 리그 자체에도 점수를 줍니다. 명성·MOM은 남겨 두되 비중을
   * 8분의 1로 낮췄어요 — 없애면 무관중 커리어와 슈퍼스타가 같아집니다.
   *
   * 다시 잰 분포(15시즌 · 25회 평균 · 우승도 팀 승률로 함께 굴려서):
   *   능력 60  K리그3 641 · K리그1 625 · 챔피언십 625 · 프리미어리그 621
   *   능력 85  K리그3 1559 · K리그1 1639 · 챔피언십 1280 · 프리미어리그 1035
   *   능력 110 K리그3 2209 · K리그1 2414 · 챔피언십 2447 · 프리미어리그 2330
   *   능력 130 K리그3 2455 · K리그1 2688 · 챔피언십 3197 · 프리미어리그 3661
   * 전체 폭은 534~4779. 잘할수록, 그리고 위로 갈수록 커집니다.
   * (확인용 세이브로 15시즌을 완주시킨 실제 커리어는 K리그1 트로피 29개에 3871점)
   * 등급 문턱(CAREER_GRADES)은 이 분포 위에 얹었어요. */
  const SCORE_W = {
    ballon: 220,  // 🏅 발롱도르 — 그 해 세계 최고 한 명
    dae: 90,      // 🏆 리그MVP (리그 격 가중)
    bon: 30,      // 🎖️ 베스트11 (리그 격 가중)
    rookie: 30,   // 🌟 신인왕
    ring: 45,     // 🏆 우승 (리그 격 가중)
    mom: 1.5,     // 🏅 MOM
    fan: 0.06,    // ⭐ 명성
    year: 6,      // 뛴 시즌
    peak: 260,    // 가장 높이 오른 리그 — K리그1(격 1.00)을 0으로 둔 초과분
    center: 30,   // 주장
    trans: 25,    // 🌠 초월 단계
    /* 🌏 월드컵 우승 — **게임 최고의 단일 업적**이에요. 발롱도르(220)보다 위에 둡니다.
     * 4년에 한 번뿐이라 커리어에 3~4번의 기회밖에 없고, 실측으로 종합 120이
     * 커리어 4번 안에 한 번 드는 확률이 62%예요.
     * ⚠️ 트로피 가중(addTrophy)에는 **0**을 넘겨요 — 점수가 양쪽에 실리면
     * 조절할 손잡이가 둘이 됩니다. 여기 하나로 몰아 둡니다. */
    wc: 320,
    /* 🏆 대회 개인상 — 팀 성적과 **다른 축**이에요. 우승 없이도 이름을 남길 수
     * 있어야 해서 따로 셉니다. 골든볼이 리그MVP(90×격)보다 위, 발롱도르(220)보다
     * 아래예요 — 4년에 한 번뿐이지만 한 대회의 상이니까요. */
    wcBall: 150, wcBoot: 100, wcWall: 100,
  };

  /* 가장 높이 오른 리그의 격. 시즌 기록에 남은 리그를 전부 훑어요 —
   * 지금 어디에 있는지만 보면, 프리미어리그에서 뛰다 강등돼 마친 커리어가
   * 하부 리그에서만 뛴 커리어와 같아집니다. */
  function peakPrestige() {
    const ys = (S.career && S.career.years) || [];
    const ps = ys
      .map((y) => (LEAGUES.find((l) => l.id === y.league) || {}).prestige)
      .filter((p) => p != null);
    ps.push(leagueOf(S).prestige);
    return Math.max(...ps);
  }

  function careerScore() {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    /* 가중 카운터가 없는 옛 세이브는 가중 없이(1부 기준) 계산해요. 마이그레이션하지
     * 않습니다. 1부만 뛴 커리어는 prestige가 1이라 두 경로의 값이 같아요. */
    const dae = c.daesangW != null ? c.daesangW : (c.daesang || 0);
    const bon = c.bonsangW != null ? c.bonsangW : (c.bonsang || 0);
    const ring = c.ringW != null ? c.ringW : (S.trophies ? S.trophies.length : 0);
    const W = SCORE_W;
    return Math.round(
      (c.ballon || 0) * W.ballon + dae * W.dae + bon * W.bon + (c.rookie || 0) * W.rookie +
      ring * W.ring + (c.wins || 0) * W.mom + (S.fandom || 0) * W.fan +
      (c.years ? c.years.length : 0) * W.year +
      Math.max(0, peakPrestige() - 1) * W.peak +
      (S.center ? W.center : 0) + transTotal() * W.trans +
      (c.wcWin || 0) * W.wc + (c.wcBall || 0) * W.wcBall + (c.wcBoot || 0) * W.wcBoot
      + (c.wcWall || 0) * W.wcWall
    );
  }

  /* 🏛️ 명예의 전당에 이미 올라간 기록은 **옛 눈금**으로 매겨졌어요.
   * 세이브를 고치지 않는 게 이 저장소의 규칙이라, 읽는 쪽에서 환산합니다.
   * 2.11 실측 평균비(옛 2659 : 새 1260)로 나눠요 — 한 표에서 순위를 겨루니
   * 눈금이 섞이면 옛 기록이 영원히 위를 차지합니다. */
  const SCORE_V = 2;          // 지금 눈금의 판 번호 — 새 기록에는 entry.sv로 남겨요
  const OLD_SCORE_DIV = 2.1;
  const hofScore = (e) => (e && e.sv >= SCORE_V ? e.score : Math.round((e.score || 0) / OLD_SCORE_DIV));

  /* 🗓️ 언제 헌액됐나 — 새 항목은 `at`에 적어요.
   *
   * 옛 항목에는 그 칸이 없지만 **id가 `"w" + Date.now()`라 시각이 이미 들어 있어요.**
   * 그래서 "옛 기록은 전부 한 덩어리"로 밀어 넣지 않고 거기서 꺼내 씁니다 —
   * 세이브를 고치지 않는다는 규칙은 그대로예요(읽는 쪽에서만 해석해요).
   * 다른 판에서 온 항목이라 못 읽으면 그때만 🕰️ 그 이전으로 모읍니다. */
  const HOF_T0 = Date.UTC(2020, 0, 1);   // 이 시리즈가 없던 시각은 시각이 아니에요
  function hofAt(e) {
    if (!e) return null;
    const raw = e.at != null ? Number(e.at) : Number(String(e.id || "").replace(/\D/g, ""));
    if (!Number.isFinite(raw) || raw < HOF_T0 || raw > Date.now() + 864e5) return null;
    return raw;
  }
  const PAST_KEY = "past";
  function hofMonth(e) {
    const t = hofAt(e);
    if (t == null) return { key: PAST_KEY, label: "🕰️ 그 이전", short: "🕰️ 그 이전" };
    const d = new Date(t);
    const m = d.getMonth() + 1;
    return {
      key: `${d.getFullYear()}-${String(m).padStart(2, "0")}`,
      label: `${d.getFullYear()}년 ${m}월`,
      short: `${String(d.getFullYear()).slice(2)}.${String(m).padStart(2, "0")}`,
    };
  }
  const hofDateText = (e) => {
    const t = hofAt(e);
    if (t == null) return "";
    const d = new Date(t);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  // ---------- 🧬 환생 ----------
  // 은퇴(명예의 전당 등록)와 달리, 기록은 남기지 않고 유산만 다음 세대에 넘겨요.
  /* 🧬 환생 자격 — 아래 중 하나라도 이루면 열려요.
   * 은퇴는 언제나 가능하니 못 채워도 커리어가 막히지는 않아요.
   * 초월은 시간이 아니라 투자를 요구해서(스탯 상한 + 판정 통과) 1단계로 둬요. */
  const REBIRTH_NEED = { win: 3, top: 3, trans: 1 };
  function rebirthReady() {
    const c = S.career || {};
    return (c.wins || 0) >= REBIRTH_NEED.win
      || (c.daesang || 0) >= REBIRTH_NEED.top
      || transTotal() >= REBIRTH_NEED.trans;
  }
  function rebirthHint() {
    const c = S.career || {};
    // ⚠️ c.wins는 MOM 횟수예요. 예전에는 '🏆 우승'이라고 적혀 있어서 판정과 표시가 어긋났어요.
    return `🏅 MOM ${c.wins || 0}/${REBIRTH_NEED.win} · 🎖️ 리그MVP ${c.daesang || 0}/${REBIRTH_NEED.top} · 🌠 초월 ${transTotal()}/${REBIRTH_NEED.trans} — 하나만 채우면 열려요`;
  }

  function rebirth(team) {
    if (!rebirthReady()) {
      alert(`🧬 아직 환생할 수 없어요.\n\n${rebirthHint()}\n\n기록을 남기고 끝내려면 '은퇴'를 선택하세요.`);
      return;
    }
    const sc = careerScore();
    /* 유산은 옛 눈금으로 재요 — 점수 산식을 바꿨다고 환생 보상까지 줄면
     * 이번 작업과 상관없는 축이 조용히 깎입니다. */
    const gain = legacyGain(sc * OLD_SCORE_DIV);
    const L = loadLegacy();
    const nextPts = L.pts + gain, nextGen = L.gen + 1;
    const before = legacyTalentBonus(L.pts), after = legacyTalentBonus(nextPts);
    if (!confirm(
      `🧬 여기서 커리어를 마치고 다음 세대에 물려줄까요?\n\n` +
      `· 유산 +${gain} (누적 ${nextPts})\n` +
      `· 다음 세대 시작 재능 +${before.toFixed(2)} → +${after.toFixed(2)}\n` +
      `· 시작 자금 ${fmtMoney(legacyMoneyBonus(nextPts))}\n` +
      `· ${nextGen + 1}세로 새로 시작해요\n\n` +
      `⚠️ 명예의 전당에는 남지 않아요. 기록을 남기려면 '은퇴'를 선택하세요.\n\n진행할까요?`
    )) return;
    saveLegacy({ pts: nextPts, gen: nextGen });
    if (window.Stats) Stats.log("rebirth", { gen: nextGen, pts: nextPts, score: sc });
    clearSave();
    if (window.Cloud) Cloud.mark();
    alert(
      `🧬 ${S.name}의 커리어가 막을 내렸어요.\n\n` +
      `유산 ${gain}을 남겨 누적 ${nextPts}이 됐습니다.\n` +
      `이제 ${nextGen + 1}세가 더 높은 재능으로 출발해요!`
    );
    // 전송이 끝나야 '올렸음' 도장이 찍혀요. 안 기다리고 새로고침하면 keepalive 덕에
    // 요청은 살아남아도 도장은 안 찍혀서, 혼자 쓰는 기기인데도 다음 실행에 충돌 화면이
    // 떠요. settle()은 상한이 있어 네트워크가 느려도 오래 붙잡지 않아요.
    if (window.Cloud && window.Cloud.settle) Cloud.settle().then(() => location.reload());
    else location.reload();
  }

  /* 마지막 소속에서 몇 시즌을 뛰었나.
   *
   * 예전 은퇴식은 "${마지막 클럽}에서 ${통산 시즌}시즌을 뛰었어요"였어요. 다섯 시즌
   * 만에 옮겨 온 클럽인데 10시즌을 뛴 것처럼 적혔습니다 — 화면이 이적 기록과
   * 서로 모르는 사이였어요. 시즌 기록에 남은 소속을 세서 맞춥니다. */
  /* 🌍 밟아 온 리그 — 명예의 전당에서 "이 선수가 어디까지 갔나"를 볼 수 있어야 해요.
   * 이름·시즌·점수만 있으면 K리그3 붙박이와 프리미어리그를 밟은 커리어가 똑같아 보입니다.
   * 시즌 기록의 리그를 순서대로 훑되 **연달아 같은 리그는 접어요**
   * (K3 K3 K3 K1 K1 → K리그3 → K리그1). 옛 항목은 소속을 fillClubs로 메웁니다. */
  function leaguePath(st) {
    const ys = fillClubs(((st && st.career && st.career.years) || []), st);
    const out = [];
    for (const y of ys) {
      const lg = LEAGUES.find((l) => l.id === (y && y.league));
      if (!lg || (out.length && out[out.length - 1].id === lg.id)) continue;
      out.push(lg);
    }
    if (!out.length) out.push(leagueOf(st));
    return out;
  }
  const leaguePathText = (st) => leaguePath(st).map((l) => `${l.flag} ${l.short}`).join(" → ");
  const peakLeague = (st) => leaguePath(st).slice().sort((a, b) => b.prestige - a.prestige)[0];

  function seasonsAtClub(st, club) {
    const ys = fillClubs(((st && st.career && st.career.years) || []), st);
    return ys.filter((y) => y && y.club === club).length;
  }

  /* 🎓 은퇴 확인창에 넣을 요약. 되돌릴 수 없는 선택이라 뭐가 남는지 보여줘요. */
  function retireSummary() {
    const c = S.career || {};
    /* ⚠️ c.wins는 **MOM 횟수**예요. 우승이 아닙니다.
     * 예전에는 여기와 환생 안내가 "🏆 우승 96"이라고 적었어요 — 한 시즌에 38경기니
     * MOM을 96번 받는 건 있을 수 있지만, 우승 96회는 있을 수 없는 숫자였습니다.
     * 진짜 우승 횟수는 트로피 목록(S.trophies)이에요. */
    const awards = [
      (S.trophies || []).length ? `🏆우승 ${(S.trophies || []).length}` : "",
      (c.ballon || 0) ? `🏅발롱도르 ${c.ballon}` : "",
      (c.daesang || 0) ? `🎖️리그MVP ${c.daesang}` : "",
      (c.bonsang || 0) ? `🥈베스트11 ${c.bonsang}` : "",
      (c.rookie || 0) ? "🌟신인왕" : "",
      (c.wins || 0) ? `🏅MOM ${c.wins}` : "",
      /* 🌏 월드컵 — 우승은 물론이고 **출전**도 적어요. 4년에 한 번뿐이라
       * 나갔다는 것만으로도 커리어의 한 줄입니다. */
      (c.wcWin || 0) ? `🌏월드컵 우승 ${c.wcWin}` : "",
      (c.wcBall || 0) ? `🏅골든볼 ${c.wcBall}` : "",
      (c.wcBoot || 0) ? `🥇골든부츠 ${c.wcBoot}` : "",
      (c.wcWall || 0) ? `🛡️골든월 ${c.wcWall}` : "",
      (c.wcApps || 0) ? `🌏월드컵 ${c.wcApps}회 출전` : "",
    ].filter(Boolean).join(" · ");
    const years = (c.years || []).length;
    const here = seasonsAtClub(S, S.group);
    const moves = moveLog(S);
    return `    ${S.name} · ${years}년차`
      + (here && here < years ? ` (${S.group} ${here}시즌)` : "") + `\n`
      + (awards ? `    ${awards}\n` : "    수상 기록 없음\n")
      + (moves ? `    🔁 이적 ${(S.moves || []).length}회 — ${moves}\n` : "");
  }

  /* 🖊️ **은퇴 한마디** — 헌액할 때 선수가 남기는 한 줄이에요.
   *
   * 커리어 숫자는 다 남는데 **그 커리어가 어땠는지는 아무도 안 적었어요.**
   * 명예의 전당이 성적표만 있고 목소리가 없는 표였습니다.
   *
   * ⚠️ 이건 **다른 사람에게 보이는 글**이에요. 그래서 세 가지를 지킵니다.
   *   · 길이를 자르고(WORD_MAX), 줄바꿈·제어문자를 지워요 — 카드 한 줄에 들어가야 해요
   *   · 태그로 쓰이는 글자를 지워요 — match.js가 또 씻고, 그리는 쪽에서 또 이스케이프해요
   *   · **안 써도 돼요.** 비워 두면 그 줄이 아예 안 그려집니다 (빈 따옴표는 더 쓸쓸해요)
   * 가리는 손잡이는 관리 화면에 있어요 — 공개되는 글이라 지울 방법이 있어야 합니다. */
  const WORD_MAX = 60;
  const cleanWord = (v) => String(v == null ? "" : v)
    .replace(/[\u0000-\u001f\u007f]/g, " ")        // 줄바꿈·제어문자
    .replace(/[<>&"'`\\]/g, "")                     // 태그로 쓰이는 글자
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, WORD_MAX);

  function enshrine() {
    const c = S.career || { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0 };
    const score = careerScore();
    const moves = moveLog(S);   // S를 비우기 전에 뽑아 둬요
    const youth = marketOf().name;   // 🤝 조기 계약 줄이 씁니다 — 여기서 같이 뽑아 둬요
    const entry = {
      id: "w" + Date.now(),
      /* 🗓️ 헌액 시각 — 명예의 전당을 달별로 나누는 기준이에요. id에서도 꺼낼 수
       * 있지만 id는 "겹치지 않는 이름"이 본업이라, 뜻이 있는 값은 제 칸에 둡니다. */
      at: Date.now(),
      game: "winger2",
      name: S.name,
      pos: S.pos,
      /* 🗺️ 자란 곳 — 🏛️ **지역별 기록**이 여기서 나옵니다 (`WingerIntro.topOf`).
       * ⚠️ 옛 헌액에는 이 칸이 없어요. 읽는 쪽이 그냥 안 걸리게 두면 됩니다(마이그레이션 없음). */
      origin: (S.origin || ""),
      /* 🤝 조기 계약 시점 — `"e"`/`"m"`, 안 했으면 `""`.
       * 🔑 **기록이 곧 효과입니다** (79번 「기록이 효과」 · designer 93번 §18 수정 ③).
       *    승낙은 📣 주목에서 **+0.166%p**밖에 안 움직여요 — 그 결정이 어디에도 안 남으면
       *    **정말로 0.166%p짜리 결정**이 됩니다. 남는 자리가 있어야 고른 것이 살아요.
       * ⚠️ 옛 헌액에는 이 칸이 없어요. 읽는 쪽이 그냥 안 걸리게 둡니다(마이그레이션 없음). */
      signedAt: (S.signedAt || ""),
      team: S.group || marketOf().name,
      seasons: c.years ? c.years.length : 0,
      wins: c.wins, daesang: c.daesang, bonsang: c.bonsang, rookie: c.rookie,
      /* 🏅 발롱도르는 은퇴식에만 있고 명예의 전당 항목에는 없었어요 — 커리어에서
       * 가장 큰 상인데 카드에서 사라졌습니다. 옛 항목에는 없으니 읽는 쪽에서 건너뛰어요. */
      ballon: c.ballon || 0,
      goals: (c.goals || 0) + ((S.youth && S.youth.g) || 0),
      assists: (c.assists || 0) + ((S.youth && S.youth.a) || 0),
      /* 🛡️ 수비도 남겨요 — 통산 기록에 골·도움만 있어서 수비수의 커리어가
       * 헌액 카드에서 통째로 안 보였어요(제보). 옛 항목에는 없으니 읽는 쪽에서 건너뜁니다. */
      defense: (c.defense || 0) + ((S.youth && S.youth.def) || 0),
      apps: (c.apps || 0) + (S.stages || 0),
      finalOvr: Math.round(overall()),
      trans: transTotal(),
      gen: loadLegacy().gen + 1,
      score,
      sv: SCORE_V,          // 점수 눈금 판 번호 — 없으면 옛 눈금으로 보고 환산해요
      teamSeasons: seasonsAtClub(S, S.group),
      trophies: (S.trophies || []).length,
      leagues: leaguePathText(S),                                  // 🌍 밟아 온 리그
      peakLg: `${peakLeague(S).flag} ${peakLeague(S).name}`,        // 가장 높이 오른 리그
      country: leagueOf(S).country,
      /* 🏷️ 칭호는 두 개를 남겨요. 그만둘 때의 실력(title)과 커리어에서 가장 높이
       * 올랐던 자리(bestTitle)예요. 노쇠하면 칭호가 내려가니 마지막 값만 남기면
       * "전성기에 세계 최고였다"는 사실이 통째로 사라집니다. */
      title: titleOf(overall()),
      bestTitle: titleAt(c.bestTitle != null ? c.bestTitle : titleIdx(overall())),
      /* 🌏 월드컵 챔피언은 등급 줄에 서픽스로 붙여요 — 등급 **문턱**은 안 움직이고
       * 표기만 얹습니다(초월 서픽스 선례). */
      grade: gradeOfScore(score) + (transTotal() ? ` · ${transcendTitle(transTotal())}` : "")
        + ((c.wcWin || 0) ? ` · 🌏 월드컵 챔피언` : ""),
      wcWin: c.wcWin || 0, wcApps: c.wcApps || 0,
      wcBall: c.wcBall || 0, wcBoot: c.wcBoot || 0, wcWall: c.wcWall || 0,
      nextGrade: nextGrade(score),
    };
    /* ⚠️ **바로 안 올려요.** hof 표에는 UPDATE 정책이 없어서(읽기·넣기만 열려 있어요)
     * 같은 id로 다시 올려도 **덮어쓸 수가 없습니다.** 아무나 남의 헌액을 고칠 수 있게
     * 되는 게 싫어서 일부러 그렇게 둔 거예요. 그래서 🖊️ 한마디를 받고 **한 번에**
     * 올립니다. `sent: false`는 "아직 안 올린 항목"이라는 표시예요 —
     * 이 칸이 없는 옛 항목은 그때 이미 올라간 것이라 건드리지 않아요. */
    entry.sent = false;
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
    if (window.Stats) Stats.log("retire", {
      years: entry.seasons, wins: entry.wins, score: entry.score,
      // "어디까지 갔나" 분포를 보려면 마지막 리그와 트로피 수가 있어야 해요
      lg: S.league, ctry: leagueOf(S).country, trophies: (S.trophies || []).length, pos: S.pos,
    });
    clearSave();
    if (window.Cloud) Cloud.mark();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚽</div>
      <div class="draft-title">${entry.name}, 그라운드와 작별</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons
        /* ⚠️ 마지막 클럽에서 뛴 시즌과 통산 시즌은 다른 숫자예요. 예전에는 통산을
         * 클럽 옆에 적어서, 5시즌 만에 옮겨 온 클럽인데 10시즌을 뛴 게 됐습니다. */
        ? `통산 <b>${entry.seasons}시즌</b>${entry.teamSeasons && entry.teamSeasons < entry.seasons
            ? ` · 마지막 ${entry.team}에서 ${entry.teamSeasons}시즌` : ` — ${entry.team} 원클럽맨`}`
        : "프로 무대 대신 다른 길을 택했어요."}</div>
      <div class="hint">🏷️ 최고 ${entry.bestTitle}${entry.bestTitle !== entry.title ? ` · 은퇴 시 ${entry.title}` : ""} · 마지막 종합 ${entry.finalOvr}</div>
      <div class="hint lg-path">🌍 ${entry.leagues}${entry.leagues.includes("→") ? ` · 최고 ${entry.peakLg}` : ""}</div>
      ${moves ? `<div class="hint move-log">🔁 이적 이력 — ${moves}</div>` : ""}
      ${/* 🤝 조기 계약 — 안 했으면 줄 자체를 안 그려요(빈 줄은 "기록이 없다"와 "0"을 섞습니다). */
        SIGN_STAGE[entry.signedAt]
          ? `<div class="hint sign-note">🤝 ${SIGN_STAGE[entry.signedAt]} 때 ${esc(youth)}가 먼저 도장을 찍었어요</div>` : ""}
      <div class="draft-summary">
        통산 ${entry.apps}경기(유스 포함) ⚽ ${entry.goals}골 · 🅰️ ${entry.assists}도움 · 🛡️ ${entry.defense}수비<br/>
        🏆 우승 ${entry.trophies} · 🏅 발롱도르 ${c.ballon || 0} · 🎖️ 리그MVP ${entry.daesang} · 🥈 베스트11 ${entry.bonsang}${entry.rookie ? " · 🌟 신인왕" : ""}<br/>
        🏅 MOM ${entry.wins}회<br/>
        커리어 점수 <b>${entry.score}</b>${entry.nextGrade ? ` · ${entry.nextGrade.name}까지 ${entry.nextGrade.need}점이었어요` : " · 더 오를 곳이 없는 자리예요"}<br/>
        명예의 전당에 영구 기록됐어요
      </div>`;
    moveNote = null;   // 한 번만 보여줘요 — 다음에 결산을 열면 안 뜹니다
    const act = $("career-actions");
    act.innerHTML = "";
    /* 🖊️ 한마디는 **카드를 보고 나서** 씁니다 — 자기 커리어를 읽은 뒤라야 할 말이 생겨요.
     * 그래서 헌액은 이미 끝나 있고, 남기면 같은 id로 다시 올려 덮어씁니다(upsert). */
    const wordBox = document.createElement("div");
    wordBox.className = "hof-word-box";
    wordBox.innerHTML = `
      <div class="hof-word-title">🖊️ 마지막으로 한마디 남기고 갈까요?</div>
      <div class="hof-word-sub">명예의 전당 카드에 함께 남아요 · 안 써도 괜찮아요</div>
      <input id="hof-word" type="text" maxlength="${WORD_MAX}" placeholder="예) 후회 없이 뛰었습니다" />
      <button class="mini-btn" id="btn-hof-word">남기기</button>
      <div class="hof-word-done" id="hof-word-done"></div>`;
    act.appendChild(wordBox);
    const wordInput = $("hof-word");
    const wordDone = $("hof-word-done");
    $("btn-hof-word").onclick = () => {
      const word = cleanWord(wordInput.value);
      if (!word) { wordDone.textContent = "한 글자라도 적어 주세요."; return; }
      entry.word = word;
      /* 로컬 기록에도 같이 넣어요 — 명예의 전당은 로컬과 원격을 겹쳐 보여줘서,
       * 한쪽에만 넣으면 내 화면과 남의 화면이 다른 말을 합니다. */
      const list = loadHof();
      const at = list.findIndex((x) => x.id === entry.id);
      if (at >= 0) list[at] = entry; else list.push(entry);
      saveHof(list);
      flushHof();                       // 한마디까지 담아서 **한 번에** 올라가요
      wordInput.value = word;
      wordInput.disabled = true;
      $("btn-hof-word").disabled = true;
      wordDone.textContent = `“${word}” — 카드에 남겼어요`;
    };
    const hofBtn = document.createElement("button");
    hofBtn.className = "btn btn-primary";
    hofBtn.textContent = "🏛️ 명예의 전당 보기";
    hofBtn.onclick = showHof;              // showHof가 안 올린 항목을 올려요
    act.appendChild(hofBtn);
    S = null;
    const again = document.createElement("button");
    again.className = "btn btn-ghost";
    again.textContent = "🔁 새 선수 키우기";
    /* 한마디를 안 쓰고 바로 나가는 사람이 훨씬 많아요 — 여기서도 올려 보내요.
     * 못 올려도 `sent: false`로 남아서 다음에 명예의 전당을 열 때 다시 갑니다. */
    again.onclick = () => { flushHof().finally(() => location.reload()); };
    act.appendChild(again);
    show("screen-career");
  }

  async function showHof() {
    const box = $("hof-list");
    box.innerHTML = `<p class="hint">불러오는 중…</p>`;
    show("screen-hof");
    if (window.Match) await window.Match.backfillHof();
    await flushHof();                      // 은퇴식에서 못 올린 게 있으면 여기서 올라가요
    const local = loadHof().filter((e) => e.game === "winger2");
    const localIds = new Set(local.map((e) => e.id));
    let list = local, global = false;
    const remote = window.Match ? await window.Match.fetchHof("winger2") : null;
    if (remote && remote.length) {
      global = true;
      const seen = new Set();
      list = [];
      for (const e of [...remote, ...local]) {
        if (!e || seen.has(e.id)) continue;
        seen.add(e.id);
        list.push(e);
      }
    }
    list.sort((a, b) => hofScore(b) - hofScore(a));
    hofShown = 20;
    hofTab = "all";
    hofAll = list;
    hofMine = localIds;
    drawHof();
  }

  /* 🗓️ 달 탭 — 명예의 전당이 한 줄로만 쌓이면 "이번 달에 누가 들어왔나"를 볼 수가
   * 없어요. 달로 나누되 **순위 자체는 건드리지 않아요** — 고른 칸 안에서 점수 순으로
   * 다시 번호를 매깁니다. 전체 탭은 예전 그대로예요. */
  function hofTabs() {
    const seen = new Map();
    for (const e of hofAll) {
      const m = hofMonth(e);
      if (!seen.has(m.key)) seen.set(m.key, { ...m, n: 0 });
      seen.get(m.key).n += 1;
    }
    const months = [...seen.values()]
      .filter((m) => m.key !== PAST_KEY)
      .sort((a, b) => (a.key < b.key ? 1 : -1));
    const past = seen.get(PAST_KEY);
    return [{ key: "all", short: "전체", label: "전체", n: hofAll.length }]
      .concat(months, past ? [past] : []);
  }

  // 더 보기로 20명씩 늘리고, 내 기록이 목록 밖이면 하단에 고정해서 보여줘요
  let hofShown = 20;
  let hofTab = "all";
  let hofAll = [];
  let hofMine = new Set();
  function drawHof() {
    const box = $("hof-list");
    const localIds = hofMine;
    const tabs = hofTabs();
    // 고른 탭이 사라졌으면(목록이 바뀌었으면) 전체로 되돌려요
    if (!tabs.some((t) => t.key === hofTab)) hofTab = "all";
    const list = hofTab === "all" ? hofAll : hofAll.filter((e) => hofMonth(e).key === hofTab);
    box.innerHTML = "";
    if (tabs.length > 2) {
      const bar = document.createElement("div");
      bar.className = "hof-tabs";
      bar.innerHTML = tabs.map((t) =>
        `<button type="button" class="hof-tab${t.key === hofTab ? " on" : ""}" data-k="${t.key}">${t.short} <span>${t.n}</span></button>`).join("");
      bar.addEventListener("click", (ev) => {
        const b = ev.target.closest(".hof-tab");
        if (!b) return;
        hofTab = b.dataset.k;
        hofShown = 20;
        drawHof();
      });
      box.appendChild(bar);
    }
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = hofAll.length ? "이 달에는 아무도 없어요." : "아직 아무도 없어요. 첫 전설이 되어보세요!";
      box.appendChild(p);
      return;
    }
    const myIdx = list.findIndex((x) => localIds.has(x.id));
    const view = list.slice(0, hofShown).map((e, i) => ({ e, i }));
    if (myIdx >= hofShown) view.push({ gap: true }, { e: list[myIdx], i: myIdx });
    view.forEach(({ e, i, gap }) => {
      if (gap) { const gp = document.createElement("div"); gp.className = "hof-gap"; gp.textContent = "⋯"; box.appendChild(gp); return; }
      const div = document.createElement("div");
      div.className = "hof-card" + (localIds.has(e.id) ? " me" : "");
      div.innerHTML = `
        <div class="hof-face-emoji">⚽</div>
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.gen > 1 ? `<span class="hof-gen">${e.gen}세</span> ` : ""}${esc(e.name)} <span class="hof-grade">${esc(e.grade)}</span></div>
          ${esc(e.team)} · ${e.seasons}시즌${e.goals != null ? ` · ⚽${e.goals} 🅰️${e.assists || 0}${e.defense != null ? ` 🛡️${e.defense}` : ""}` : ""} · 🏅MOM ${e.wins} · 🏆${e.daesang + e.bonsang} · 점수 ${hofScore(e)}
          ${/* 🌍 밟아 온 리그 — 옛 항목에는 없어요(읽는 쪽에서 건너뜁니다). */
            e.leagues ? `<div class="hof-lg">🌍 ${esc(e.leagues)}</div>` : ""}
          ${/* 🖊️ 한마디 — 카드를 안 열어도 보여야 이 칸이 살아 있어요 */
            e.word ? `<div class="hof-word">🖊️ “${esc(e.word)}”</div>` : ""}
          ${/* 🌏 월드컵 — 이 필드도 나중에 생겼어요. 없으면 줄 자체를 안 그려요. */
            e.wcApps ? `<div class="hof-lg">🌏 월드컵 ${e.wcApps}회`
              + `${e.wcWin ? ` · 🏆 우승 ${e.wcWin}` : ""}`
              + `${e.wcBall ? ` · 🏅 골든볼 ${e.wcBall}` : ""}`
              + `${e.wcBoot ? ` · 🥇 골든부츠 ${e.wcBoot}` : ""}`
              + `${e.wcWall ? ` · 🛡️ 골든월 ${e.wcWall}` : ""}</div>` : ""}
        </div>
        <div class="hof-more">›</div>`;
      // 카드를 누르면 그 선수의 커리어를 펼쳐요 (제보: "명전에서 선수 클릭 시 기록을 레이어로")
      div.onclick = () => openHofCard(e, i + 1, localIds.has(e.id));
      box.appendChild(div);
    });
    const left = list.length - Math.min(list.length, hofShown);
    if (left > 0) {
      const more = document.createElement("button");
      more.className = "mini-btn rank-more";
      more.textContent = `▾ 더 보기 (${left}명 남음)`;
      more.onclick = () => { hofShown += 20; drawHof(); };
      box.appendChild(more);
    }
  }

  /* 🏛️ 헌액 카드 — 카드 한 줄에 다 못 적은 것을 펼쳐 보여줘요.
   * base.css의 .av-overlay/.av-modal 껍데기를 빌려 씁니다(스쿼드 레이어와 같은 방식).
   * **옛 항목에는 없는 칸이 많아요.** 없으면 줄을 아예 안 그립니다 — 0으로 채우면
   * "기록이 없다"와 "0이었다"가 같은 얼굴이 돼요. */
  function openHofCard(e, rank, mine) {
    if (document.querySelector(".hof-overlay")) return;
    // 값은 전부 씻어서 넣어요 — 라벨(k)은 코드가 쓰는 말이라 그대로 둡니다
    const row = (k, v) => (v ? `<div class="hofd-row"><span>${k}</span><b>${esc(v)}</b></div>` : "");
    const awards = [
      e.trophies ? `🏆 우승 ${e.trophies}` : "",
      e.ballon ? `🏅 발롱도르 ${e.ballon}` : "",
      e.daesang ? `🎖️ 리그MVP ${e.daesang}` : "",
      e.bonsang ? `🥈 베스트11 ${e.bonsang}` : "",
      e.rookie ? "🌟 신인왕" : "",
      e.wins ? `🏅 MOM ${e.wins}` : "",
    ].filter(Boolean).join(" · ");
    const wc = [
      e.wcApps ? `🌏 출전 ${e.wcApps}회` : "",
      e.wcWin ? `🏆 우승 ${e.wcWin}` : "",
      e.wcBall ? `🏅 골든볼 ${e.wcBall}` : "",
      e.wcBoot ? `🥇 골든부츠 ${e.wcBoot}` : "",
      e.wcWall ? `🛡️ 골든월 ${e.wcWall}` : "",
    ].filter(Boolean).join(" · ");
    const wrap = document.createElement("div");
    wrap.className = "av-overlay hof-overlay";
    wrap.innerHTML = `<div class="av-modal hofd-modal">
      <div class="hofd-head">
        <div class="hofd-emoji">⚽</div>
        <div class="hofd-name">${e.gen > 1 ? `<span class="hof-gen">${e.gen}세</span> ` : ""}${esc(e.name)}${mine ? ` <span class="hofd-me">내 선수</span>` : ""}</div>
        <div class="hofd-grade">${esc(e.grade)}</div>
        <div class="hofd-rank">${hofTab === "all" ? "전체" : hofTabs().find((t) => t.key === hofTab).label} ${rank}위 · 커리어 점수 ${hofScore(e)}</div>
      </div>
      <div class="hofd-body">
        ${row("🏷️ 최고 클래스", e.bestTitle)}
        ${row("🏷️ 은퇴 시", e.bestTitle && e.title && e.bestTitle !== e.title ? e.title : "")}
        ${row("💪 마지막 종합", e.finalOvr)}
        ${row("⚽ 포지션", (POS_INFO[e.pos] || {}).name)}
        ${row("🏟️ 마지막 클럽", e.team + (e.teamSeasons && e.teamSeasons < e.seasons ? ` (${e.teamSeasons}시즌)` : ""))}
        ${row("📅 통산", e.seasons ? `${e.seasons}시즌${e.apps ? ` · ${e.apps}경기` : ""}` : "")}
        ${row("📊 통산 기록", e.goals != null
          ? `⚽ ${e.goals}골 · 🅰️ ${e.assists || 0}도움${e.defense != null ? ` · 🛡️ ${e.defense}수비` : ""}` : "")}
        ${/* 🤝 조기 계약 — 🔒 **클라우드에서 온 값을 그대로 안 그립니다.** `SIGN_STAGE`에
             있는 두 글자만 나가요(화이트리스트). `row`가 또 이스케이프합니다 — 둘 다 해야
             하나가 새도 버팁니다. 옛 헌액에는 이 칸이 없어 그냥 줄이 안 그려집니다. */
          row("🤝 조기 계약", SIGN_STAGE[e.signedAt] || "")}
        ${row("🌍 밟아 온 리그", e.leagues)}
        ${row("⛰️ 최고 리그", e.leagues && e.leagues.includes("→") ? e.peakLg : "")}
        ${row("🏆 수상", awards)}
        ${row("🌏 월드컵", wc)}
        ${row("🔮 초월", e.trans ? `${e.trans}회` : "")}
        ${row("🗓️ 헌액", hofDateText(e))}
        ${/* 🖊️ 한마디 — 없는 항목이 훨씬 많아요(나중에 생긴 칸이라). 없으면 줄을 안 그려요. */
          e.word ? `<div class="hofd-word">🖊️ “${esc(e.word)}”</div>` : ""}
      </div>
      <div class="av-actions"><button class="btn btn-primary" id="btn-hofd-close">닫기</button></div>
    </div>`;
    wrap.addEventListener("click", (ev) => { if (ev.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
    document.getElementById("btn-hofd-close").onclick = () => wrap.remove();
  }

  // ---------- 랜덤 매칭 (공용 ../match.js — Supabase 연동) ----------
  const GAME_ID = "winger2";
  const matchEnabled = () => !!(window.Match && window.Match.enabled());
  function submitProfile(f, rating, w, l) {
    if (window.Match) window.Match.submit(GAME_ID, { name: f.name, bp: f.bp, rating, w, l });
  }
  async function fetchRoster() {
    return window.Match ? window.Match.roster(GAME_ID) : null;
  }

  // ---------- 배틀 아레나 (경기 대결) ----------
  const BATTLE_TXT = [
    "전방 압박으로 주도권을 잡아요! 🔥",
    "환상적인 개인기로 수비를 벗겨내요 🏃",
    "날카로운 침투 패스가 이어져요 🎯",
    "골문 앞 혼전, 몸을 사리지 않아요 💪",
    "경기 막판, 극적인 결승골! ⚽",
  ];

  function fighters() {
    const list = [];
    if (S && S.name) {
      const years = S.career && S.career.years ? S.career.years.length : 0;
      list.push({
        id: "cur-" + S.name,
        name: `${S.name} (현역)`,
        bp: Math.round(overall() * 3 + (S.fandom || 0) * 0.15 + years * 8),
      });
    }
    for (const e of loadHof().filter((x) => x.game === "winger2")) {
      list.push({ id: e.id, name: e.name, bp: bpOf(hofScore(e), e.finalOvr) });
    }
    return list;
  }

  let battleReturn = "screen-title";
  function showBattle(returnTo) {
    if (returnTo) battleReturn = returnTo;
    if (!S) {
      const sv = localStorage.getItem(SAVE_KEY);
      if (sv) S = JSON.parse(sv);
    }
    const list = fighters();
    const setup = $("battle-setup");
    if (!list.length) {
      setup.innerHTML = `<p class="hint">대결할 선수가 없어요.<br/>먼저 유망주를 키우면 현역이든 은퇴 후든 언제든 참전할 수 있어요!</p>`;
    } else {
      setup.innerHTML = `
        <div class="battle-row">
          <label>내 선수</label>
          <select id="battle-me">${list.map((f, i) => `<option value="${i}">${f.name} · 경기력 ${f.bp}</option>`).join("")}</select>
          <button class="btn btn-primary" id="btn-fight">🎲 랜덤 매칭 시작</button>
          <p class="av-note">${matchEnabled() ? "🌍 전 세계 플레이어 풀에서 실력이 비슷한 상대를 찾아요" : "🤖 오프라인 모드 — 매칭 서버 연결 전까진 봇과 매칭돼요"}</p>
        </div>`;
      $("btn-fight").onclick = async () => {
        if (battling) return;
        battling = true;
        const btn = $("btn-fight");
        btn.disabled = true;
        btn.textContent = "🔍 상대 찾는 중…";
        try {
          const me = list[+$("battle-me").value];
          const roster = await fetchRoster();
          let opp;
          const pool = (roster || []).filter((r) => !r.mine);
          if (pool.length) {
            pool.sort((a, b) => Math.abs(a.bp - me.bp) - Math.abs(b.bp - me.bp));
            const o = pick(pool.slice(0, 6));
            opp = { id: "r-" + o.id, name: o.name, bp: o.bp, remote: true };
          } else {
            const g = pick(GHOSTS);
            opp = { ...g, name: `${g.name} (봇)` };
          }
          btn.textContent = "⚔️ 배틀 진행 중…";
          fight(me, opp);   // 잠금은 finishFight에서 풀어요
        } catch (e) {
          resetFightBtn();   // 실패해도 다시 시도할 수 있게 잠금은 풀어줘요
          throw e;           // 원인은 삼키지 않고 그대로 드러내요
        }
      };
    }
    // 배틀 도중에 나갔다 다시 들어와도 잠긴 채로 남지 않게 초기화해요.
    clearInterval(battleTimer);
    battling = false;
    $("battle-view").innerHTML = "";
    renderRanking();
    show("screen-battle");
  }

  let battleTimer = null;
  // 매칭 요청부터 결과 표시까지 버튼을 잠가요. 안 잠그면 배틀 연출(약 3초) 중에
  // 다시 눌려서 진행 중이던 배틀이 결과 없이 사라져요.
  let battling = false;
  function resetFightBtn() {
    battling = false;
    const btn = $("btn-fight");
    if (btn) { btn.disabled = false; btn.textContent = "🎲 랜덤 매칭 시작"; }
  }
  function fight(me, opp) {
    const p = clamp(0.5 + (me.bp - opp.bp) / 700, 0.08, 0.92);
    const win = Math.random() < p;
    if (window.Stats) Stats.log("battle", { win, remote: !!opp.remote });
    let a, b;
    if (win) { a = randInt(1, 4); b = randInt(0, Math.max(0, a - 1)); }
    else { b = randInt(1, 4); a = randInt(0, Math.max(0, b - 1)); }

    $("battle-view").innerHTML = `<div class="tour-card"><div class="pbp" id="battle-pbp"></div><div id="battle-result"></div></div>`;
    const feeds = [
      { text: `⚔️ ${me.name} vs ${opp.name} — 매치 킥오프!` },
      ...shuffle([...BATTLE_TXT]).slice(0, 3).map((t) => ({ text: t })),
      { text: `📢 경기 종료 — ${a} : ${b}`, cls: win ? "good" : "bad" },
    ];
    let idx = 0;
    clearInterval(battleTimer);
    battleTimer = setInterval(() => {
      if (idx >= feeds.length) {
        clearInterval(battleTimer);
        finishFight(me, opp, win, a, b);
        return;
      }
      const f = feeds[idx++];
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("battle-pbp").appendChild(div);
    }, 550);
  }

  function finishFight(me, opp, win, a, b) {
    const data = loadBattle();
    data.records = data.records || {};
    const rec = (id, name, base, ghost) =>
      data.records[id] || (data.records[id] = { name, rating: base, w: 0, l: 0, ghost });
    const rm = rec(me.id, me.name, 1000, false);
    const ro = rec(opp.id, opp.name, opp.bp ? 900 + Math.round(opp.bp / 4) : 1000, !opp.remote);
    const expected = 1 / (1 + Math.pow(10, (ro.rating - rm.rating) / 400));
    const delta = Math.round(24 * ((win ? 1 : 0) - expected));
    rm.rating += delta;
    ro.rating -= delta;
    if (win) { rm.w++; ro.l++; } else { rm.l++; ro.w++; }
    saveBattle(data);
    submitProfile(me, rm.rating, rm.w, rm.l);
    $("battle-result").innerHTML = `
      <div class="tour-vs">${win ? `${me.name} 승리! 🎉` : `${opp.name} 승리… 💧`} <span class="score-final">${a} : ${b}</span></div>
      <div class="tour-pts">레이팅 ${delta >= 0 ? "+" : ""}${delta} → ${rm.rating}</div>`;
    resetFightBtn();
    renderRanking();
  }

  async function renderRanking() {
    let rows = [];
    let global = false;
    const roster = await fetchRoster();
    if (roster && roster.length) {
      global = true;
      rows = roster.map((p) => ({
        id: p.id,
        name: p.name,
        rating: p.rating || 1000,
        w: p.w || 0,
        l: p.l || 0,
        ghost: !p.mine,
      }));
    } else {
      const data = loadBattle();
      rows = Object.entries(data.records || {}).map(([id, r]) => ({ id, ...r }));
      for (const g of GHOSTS) {
        if (!rows.find((r) => r.id === g.id)) {
          rows.push({ id: g.id, name: `${g.name} (봇)`, rating: 900 + Math.round(g.bp / 4), w: 0, l: 0, ghost: true });
        }
      }
    }
    rows.sort((x, y) => y.rating - x.rating);
    rankShown = 15;
    drawRanking(rows, global);
  }

  // 더 보기로 15명씩 늘리고, 내 순위가 목록 밖이면 하단에 고정해서 보여줘요
  let rankShown = 15;
  function drawRanking(rows, global) {
    const myIdx = rows.findIndex((r) => !r.ghost);
    const row = (r, i) => `<tr class="${r.ghost ? "" : "me"}"><td>${i + 1}</td><td>${r.name}</td><td>${r.w}승 ${r.l}패</td><td>${r.rating}</td></tr>`;
    const shown = rows.slice(0, rankShown).map(row).join("");
    const pinned = myIdx >= rankShown ? `<tr class="hof-gap-row"><td colspan="4">⋯</td></tr>` + row(rows[myIdx], myIdx) : "";
    const left = rows.length - Math.min(rows.length, rankShown);
    $("battle-rank").innerHTML = `
      <h2 class="rank-title">🏅 ${global ? "글로벌" : "로컬"} 배틀 랭킹 <span class="rank-total">${rows.length}명</span></h2>
      <table class="rank-table"><thead><tr><th>#</th><th>선수</th><th>전적</th><th>레이팅</th></tr></thead>
      <tbody>${shown}${pinned}</tbody></table>
      ${left > 0 ? `<button class="mini-btn rank-more" id="btn-rank-more">▾ 더 보기 (${left}명 남음)</button>` : ""}`;
    const mb = $("btn-rank-more");
    if (mb) mb.onclick = () => { rankShown += 15; drawRanking(rows, global); };
  }

  // ---------- 초기화 ----------
  $("btn-hof")?.addEventListener("click", showHof);
  $("btn-battle")?.addEventListener("click", () => showBattle("screen-title"));
  $("btn-battle-main")?.addEventListener("click", () => showBattle("screen-main"));
  $("btn-battle-pro")?.addEventListener("click", () => showBattle("screen-pro"));
  // 💼 남는다 — 아무것도 바꾸지 않고 결산으로 돌아가요
  $("btn-transfer-stay")?.addEventListener("click", () => yearReport());
  $("btn-hof-back")?.addEventListener("click", () => show("screen-title"));
  $("btn-battle-back")?.addEventListener("click", () => show(battleReturn));

  /* 🌏 월드컵에 필요한 도구만 넘겨요. worldcup.js는 career.js 안쪽을 모르고,
   * career.js는 대회 진행을 모르는 채로 서로를 부릅니다. */
  if (window.WingerWorldCup) {
    WingerWorldCup.init({
      proLog, queueFx, addTrophy, ratingOf, matchRating, raceConceded,
      renderPrep, leagueOf,
    });
  }

  return {
    onEnding,
    refreshPro: renderPrep,
    showHof,
    showBattle,
    showActivity: () => {
      /* 🏆 컵을 치르던 중에 앱을 닫았으면 거기서 이어요. 이 줄이 없으면
       * 남은 라운드가 통째로 사라지고 트로피도 못 받아요 — 컵은 시즌 끝의
       * 세 판이라 중간에 끊기면 그 시즌이 그냥 없어진 것처럼 보입니다. */
      /* 🌏 월드컵을 치르던 중이었으면 준비 화면으로 돌아와요. 경기는 원자적이라
       * (중간 상태를 저장하지 않아요) S.camp와 S.wc.ready가 상태를 다 담습니다. */
      if (S.wc && window.WingerWorldCup && WingerWorldCup.resume(finishYear)) return;
      if (S.cup && window.SoccerCup) { cupMatch(); return; }
      if (S.camp > 0 || S.activity || S.pendingShow) { renderPrep(); show("screen-pro"); }
      else if (S.career && S.career.years.length) yearReport();
      else { renderPrep(); show("screen-pro"); }
    },
    transferOffers,
    moveToClub,
    _t: {
      ratingOf, FAN_CAP, RATING_DIV, POS_AXIS, posAxis, AXIS_K, AXIS_OFF,
      RATE, RATE_RESULT, RATE_CONCEDE, ratingParts, matchRating, ratingWhyHTML,
      RACE_POS, leagueRound, ensureLeagueRecords, raceConceded, mateNames, MOM_MIN,
      playShow, benchShow, runV2Match, proMatchFinalize, CARD_DELAY,
      recordRound, initTable, tableRows, tableHTML, clubGoals, engRow, clubRows,
      raceRank, raceTop,
      LEAGUES, leagueOf, barOf, CLUBS, clubStrOf, debutClubs, DEBUT_POOL, weakestClub,
      cupEntry, cupName, CUP_SPOTS, myTableRank, applyPromotion,
      TRANSFER_MIN_YEAR, PROMOTE_HYPE, OFFERS_PER_LEAGUE, transferFee, transferOffers, canTransfer,
      DOWNGRADE_FEE, LOYALTY_FEE, leftBefore, moveLog, careerScore, shortClub, clubCell,
      clubOfYear, fillClubs, enshrine, cleanWord, WORD_MAX, esc, flushHof,
      state: () => S,
    },
  };
})();
