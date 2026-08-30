/* ⚽ 더 윙어 II — 📊 능력치 등급(F~S) · XP 바 · 승급 카드
 *
 * ══════════════════════════════════════════════════════════════════════
 * 🔒 **여기는 표시 계층입니다. 능력치를 만들지도, 바꾸지도 않아요.**
 * ══════════════════════════════════════════════════════════════════════
 *
 * 61이 B든 C든 **계산에는 61이 그대로 들어갑니다.** 등급은 그 61을 사람이 읽는
 * 말로 옮기기만 해요. 그래서 이 파일은 `S`를 **읽기만** 하고, `S.stats`는 손대지
 * 않습니다 (`gradeSnap` 한 칸만 씁니다 — 아래 §승급 감지).
 *
 * 왜 만드나 (70번 설계 §문제 5):
 *   36턴 동안 화면에 흐르는 건 `슛 47.3` → `슛 50.1`뿐이었어요. 소수점이 흘러가는
 *   건 성장이 아니라 **노이즈**입니다. 등급은 그 흐름에 **문턱**을 세워서,
 *   *"넘었다"*는 사건을 만들어 줍니다.
 *
 * ─────────────────────────────────────────────────────────────────────
 * 📐 어떤 값을 등급으로 옮기는가 — **정점 기준값(`S.stats`)**
 * ─────────────────────────────────────────────────────────────────────
 * 이 게임에는 값이 두 가지예요 (`prospect.js` §지금 실력):
 *
 *   `S.stats`      = **정점 기준값**. 훈련·각성·장비가 올리는 건 이 값입니다
 *   지금 실력      = 정점 기준값 × 나이곡선   ← 경기 판정과 레이더가 보는 값
 *
 * 등급은 **정점 기준값**을 씁니다. 이유 셋:
 *
 *   ① **화면의 숫자와 어긋나면 안 돼요.** 능력치 화면이 `61`을 찍는데 등급이
 *      다른 값에서 나오면 `61 [E]` 같은 모순이 화면에 남습니다.
 *   ② **훈련이 등급을 밀어야 합니다.** 훈련이 올리는 건 정점 기준값이에요.
 *      지금 실력으로 등급을 매기면 나이 한 살이 훈련 여섯 달보다 커집니다 —
 *      그러면 승급 카드가 *"내가 한 일"*이 아니라 *"달력이 넘어간 일"*이 돼요.
 *   ③ **유망주 3장이 전부 `F`로 깔립니다.** 열여덟의 곡선이 0.56~0.84라
 *      18~54가 10~45로 눌려요. 그러면 카드를 못 고릅니다 (실측 확인).
 *
 * ─────────────────────────────────────────────────────────────────────
 * 📊 구간 — **7단계.** §7-3의 경계 여섯을 그대로 씁니다
 * ─────────────────────────────────────────────────────────────────────
 *
 *   F ~39 · E 40~57 · D 58~73 · C 74~89 · B 90~107 · A 108~127 · S 128↑
 *
 * 폭이 40 / 18 / 16 / 16 / 18 / 20으로 **불균등한 건 의도입니다** —
 * `S 128↑ = 상위 3%`(설계 §B-3)가 이 경계 위에 서 있어서, 균등하게 고치면 깨져요.
 *
 * 🗑️ **폐기: ± 세분 19단계** (2026-08-30 · 70번 갈래 F 판정).
 *    폐기 이유가 **이름이 아니라 형태**예요. 다른 이름으로 같은 계단을 되살리지 마세요:
 *
 *    ① **XP 바와 역할이 겹칩니다.** *"다음 칸까지 얼마나"*는 바가 이미 하는 말이에요
 *    ② 🔑 **폭 5~7에서는 XP 바가 바 노릇을 못 합니다.** 훈련 한 번이 `+2.2~4.2`라
 *       **한 번에 31~84%가 찼어요** — 진행이 보이는 게 아니라 뜁니다.
 *       폭 16~20이면 한 번에 11~26%로 **그제야 바다운 바**가 됩니다
 *    ③ **라벨은 문턱을, 바는 진행을** 맡습니다
 *
 *    그래서 *"세분하되 폭을 좀 넓히자"*도 같은 형태의 부활이에요. 세분 자체가 폐기입니다.
 *
 *    ⚠️ 이 표를 옮기면 **두 값이 동시에** 움직입니다 (36턴 총 획득 ≈ 100점이
 *       스타일과 무관하거든요 — `6칸 카드 ≈ 100 ÷ 평균 구간 폭`):
 *         · 주 스탯 승급 (현실적 스타일)  — 실측 기준선은 71번 문서 §6
 *         · 6칸 전체 승급 카드 장수
 *       바꾸면 **둘 다** 다시 재세요. 하나만 잡으면 다른 쪽이 샙니다.
 *
 * ─────────────────────────────────────────────────────────────────────
 * 🎉 승급 감지 — `S.gradeSnap`
 * ─────────────────────────────────────────────────────────────────────
 * 마이그레이션하지 않아요. 옛 세이브엔 `gradeSnap`이 없으니 **첫 렌더에서 조용히
 * 채우고 카드는 안 띄웁니다.** 그래야 옛 세이브를 열자마자 승급 카드가 쏟아지지 않아요.
 *
 * ⚠️ **저장하는 건 등급 「라벨」이지 배열 인덱스가 아닙니다.**
 *    한때 인덱스를 저장했는데, 등급표가 19칸에서 7칸으로 줄자 옛 세이브의 `13`이
 *    가리킬 자리가 없어졌어요. 라벨(`"C"`)은 표가 바뀌어도 뜻이 안 변하고,
 *    **모르는 라벨이면 조용히 다시 채웁니다** — 표를 갈아도 유령 카드가 안 떠요.
 *    (그래서 옛 세이브의 숫자 스냅샷도 자동으로 버려집니다.)
 *
 * 감지를 **화면 그리는 자리에** 붙인 이유: 능력치가 오르는 통로가 훈련·휴식·
 * 랜덤 이벤트·평가전·벤치 주·각성·초월로 일곱 군데예요. 일곱 곳에 손을 대면
 * 하나를 빠뜨립니다. 화면은 어느 통로로 올랐든 **반드시 다시 그려집니다.**
 */
window.W2Grade = (() => {
  "use strict";

  /* 등급표 — `min`은 **그 등급이 시작되는 값**이에요.
   * ⚠️ `label`이 세이브(`gradeSnap`)에 그대로 들어갑니다. **글자를 바꾸지 마세요** —
   *    바꾸면 옛 세이브가 그 칸을 못 알아보고 승급 카드를 한 번 건너뜁니다. */
  const GRADES = [
    { label: "F", min: 0 },
    { label: "E", min: 40 },
    { label: "D", min: 58 },
    { label: "C", min: 74 },
    { label: "B", min: 90 },
    { label: "A", min: 108 },
    { label: "S", min: 128 },   // 🏆 상위 3% — 여기가 사건이어야 해요
  ];
  const rankOf = (lab) => GRADES.findIndex((g) => g.label === lab);

  /* 🔢 등급을 매기는 값은 **화면에 찍히는 정수**입니다.
   * 능력치 화면이 `Math.round(S.stats[k])`를 찍는데 등급만 소수로 재면
   * `40 [F]`처럼 경계에서 한 칸 어긋나요. 같은 자를 씁니다. */
  function shownOf(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  function indexOf(v) {
    const n = shownOf(v);
    if (n == null) return null;
    let i = 0;
    while (i + 1 < GRADES.length && n >= GRADES[i + 1].min) i += 1;
    return i;
  }

  /* 한 칸의 등급·XP를 통째로 돌려줘요.
   *   cur / need — **다음 등급까지 남은 거리**. 단위는 능력치 1점이에요
   *   pct        — XP 바의 폭 (0~100)
   *   top        — S 구간. 위가 없으니 `need`가 null이고 바는 꽉 찹니다 */
  function of(v) {
    const i = indexOf(v);
    if (i == null) return null;
    const g = GRADES[i], nx = GRADES[i + 1] || null;
    const n = shownOf(v);
    const cur = n - g.min;
    const need = nx ? nx.min - g.min : null;
    return {
      i, label: g.label, base: g.label, shown: n,
      lo: g.min, hi: nx ? nx.min - 1 : null,
      next: nx ? nx.label : null,
      cur, need,
      pct: need ? Math.max(0, Math.min(100, (cur / need) * 100)) : 100,
      top: !nx,
    };
  }

  const label = (v) => { const g = of(v); return g ? g.label : "—"; };

  /* ═══ 승급 감지 ═══
   * 돌려주는 것: 이번에 올라간 칸들. **내려간 칸은 안 돌려주되 스냅샷은 갱신**해요
   * (훈련 실패로 내려갔다가 다시 올라오면 그건 다시 승급이 맞습니다).
   *
   * `mainKey`를 받는 건 **무게를 나누기 위해서**예요 — 주 스탯의 승급은
   * *"내 무기가 컸다"*고, 나머지는 *"넓게 컸다"*입니다. 연출은 director 몫이라
   * 여기서는 `main: true`만 달아 줍니다. */
  function sync(st, defs, mainKey) {
    if (!st || !st.stats || !Array.isArray(defs)) return [];
    const snap = st.gradeSnap || (st.gradeSnap = {});
    const ups = [];
    for (const d of defs) {
      const i = indexOf(st.stats[d.key]);
      if (i == null) continue;
      const wasRank = rankOf(snap[d.key]);
      snap[d.key] = GRADES[i].label;
      /* 처음 보는 칸(옛 세이브 · 옛 19단계의 숫자 스냅샷)은 **조용히 채우기만** 해요 */
      if (wasRank < 0 || i <= wasRank) continue;
      ups.push({
        key: d.key, name: d.name, emoji: d.emoji,
        from: GRADES[wasRank].label, to: GRADES[i].label,
        main: d.key === mainKey,
      });
    }
    return ups;
  }

  /* ═══ 화면 ═══
   * 🎬 **최소한만 합니다. 연출은 director 몫이에요.**
   * 클래스 이름을 남겨 두니 style.css에서 그대로 잡으면 됩니다:
   *   .stat-grade / .g-F .g-E .g-D .g-C .g-B .g-A .g-S / .bar-fill.xp / .stat-xp
   *   .grade-up-layer / .grade-up-card(.has-main) / .gu-row(.gu-main)
   *   .gu-stat / .gu-from / .gu-arrow / .gu-to / .gu-say */

  /* ⚠️ 등급 라벨은 이 파일 안의 상수라 안전하지만, 능력치 **이름**은 호출자가
   * 넘겨줍니다. 지금은 STAT_DEFS(코드 상수)뿐이어도, 남이 올린 값이 이 자리에
   * 들어오는 날을 대비해 **그리는 자리에서 이스케이프**해 둬요. */
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  /* 능력치 한 줄의 **등급 + XP 바** 조각. 이름·숫자·잠재력 별은 호출자가 붙여요
   * (능력치 화면과 유망주 카드가 서로 다른 것을 곁들이니까요). */
  function partHTML(v) {
    const g = of(v);
    if (!g) return "";
    const tip = g.top
      ? `최고 등급 S에 닿았어요`
      : `다음 등급 ${g.next}까지 ${g.need - g.cur}`;
    return `<span class="stat-grade g-${esc(g.base)}" title="${esc(tip)}">${esc(g.label)}</span>`
      + `<div class="bar xp-bar" title="${esc(tip)}"><div class="bar-fill xp" style="width:${g.pct.toFixed(1)}%"></div></div>`
      + `<span class="stat-xp">${g.top ? "MAX" : `${g.cur}/${g.need}`}</span>`;
  }

  let layer = null;
  /* ⚠️ **한 턴에 두 칸이 올라도 카드는 한 장입니다.**
   * 예전엔 칸마다 한 장씩 쌓았는데, 2.6초짜리가 둘이면 손이 5.2초 멈춰요.
   * 한 장에 두 줄로 넣습니다. */
  function showUps(ups) {
    if (!ups || !ups.length || typeof document === "undefined") return;
    if (!layer || !layer.isConnected) {
      layer = document.createElement("div");
      layer.className = "grade-up-layer";
      layer.setAttribute("aria-live", "polite");
      document.body.appendChild(layer);
    }
    const hasMain = ups.some((u) => u.main);
    const card = document.createElement("div");
    card.className = "grade-up-card" + (hasMain ? " has-main" : "");
    card.innerHTML = ups.map((u) => `<span class="gu-row${u.main ? " gu-main" : ""}">`
      + `<span class="gu-stat">${esc(u.emoji)} ${esc(u.name)}</span>`
      + `<span class="gu-from">${esc(u.from)}</span>`
      + `<span class="gu-arrow">→</span>`
      + `<span class="gu-to">${esc(u.to)}</span>`
      + `<span class="gu-say">${u.main ? "🎉 승급!" : "승급!"}</span>`
      + `</span>`).join("");
    layer.appendChild(card);
    setTimeout(() => card.remove(), 2600);
  }

  /* 화면을 다시 그릴 때 한 줄로 부르는 자리 — 감지하고 카드까지 띄웁니다. */
  function tick(st, defs, mainKey) {
    const ups = sync(st, defs, mainKey);
    showUps(ups);
    return ups;
  }

  return { GRADES, of, label, indexOf, sync, tick, showUps, partHTML };
})();
