/* ⚽ 더 윙어 II — 🔥 순간 카드 미니게임 4종 (`beta/winger-moment.js`)
 *
 * 🔴 **이 파일이 생기기 전까지 `winger-moment.js`를 보는 검사가 0건이었습니다.**
 *    `grep -rln 'winger-moment\|W2Moment' tests/`가 빈 결과였어요 —
 *    **판정 창 산식을 아무렇게나 바꿔도 전 검사가 초록불**이었습니다.
 *
 * 여기서 지키는 것 다섯
 *   A. 🎯 `s` 산식의 **모양 계약** — 넷이 같은 자를 쓴다 (`s = 1 − 오차/판정창`)
 *   B. 🎚️ **판정 창은 🫀 컨디션 · 🦶 주발 · ♿ 확대 셋에만 반응한다**
 *      🚨 **능력치는 안 실립니다** — 넣으면 빨간불 (설계 §4-5 · engineer 50번 §3)
 *   C. 🔒 **판정을 이 파일이 만들지 않는다** — `s`를 엔진에 되돌려 묻는다
 *   D. 🔗 판정 창 상수의 **유효 조건** — 그 값을 만든 상수가 그대로인가
 *   E. 📐 **넷이 같은 `sBar` 형태를 쓴다** — 값이 아니라 **구조**로 재는 형평 (balancer 25)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 **E[s]의 「절대값」은 계약이 아닙니다. 「차이」만 계약입니다.** (2026-09-02 · designer)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 예전에 이 자리에 이렇게 적어 뒀었어요 —
 * *"engineer는 0.522/0.522/0.521/**0.537**, 나는 0.558/0.655/0.559/**0.510**.
 *   겨냥 전략 하나로 0.13이 움직이니 밴드를 못 박는다."*
 *
 * 🔑 **그 물음이 잘못 세워져 있었습니다.** *"어느 쪽이 맞나"*가 아니라 **셋 다 맞아요** —
 *    셋 다 **「그 모델」을 잰 값**이고, 그중 무엇도 **이 게임의 난이도가 아닙니다.**
 *    모델의 치우침은 **절대값에는 그대로 남고, 차이에서는 상쇄됩니다.**
 *
 * 🔒 그래서 계약을 이렇게 바꿉니다:
 *    **「같은 모델 · 같은 판(CRN)으로 잰 옛 ↔ 새 E[s] 차이」만 계약이 됩니다.**
 *    🧱 차단의 그 계약은 `block-test.js` C가 잽니다 (`BLK_WIN`이 종속값인 근거예요).
 *
 * 🔴 **딸려서 무너진 것 하나** — designer §4-3의 *"넷의 평균이 폭 0.017이라 원칙 ④를 만든다"*도
 *    **한 모델의 성질**입니다(제 모델에선 폭 **0.145**). 넷의 형평을 그 값으로 지키면
 *    **모델을 바꾸는 순간 계약이 뒤집혀요 — 이번이 세 번째입니다.**
 *    👉 **값이 아니라 구조로 지킵니다**: 「넷이 같은 `sBar` 형태를 쓰고, 창이 `mul`에 같은
 *       비율로 반응한다」. 그게 아래 **E**예요. 구조는 모델을 안 탑니다.
 *
 * ⚠️ 그래도 **D**는 남깁니다 — 측정은 못 해도 **유효 조건**은 지킬 수 있어요.
 *    상수가 움직이면 *"E[s]를 다시 재세요"*라고 빨간불이 뜹니다.
 *
 * 🎲 시드를 박았으니 결정론적입니다. ⏱️ 1초 안에 끝나요.
 */
"use strict";
const fs = require("fs");
const { loadMoment, momentMutsOK, MSRC } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const near = (a, b, eps) => Math.abs(a - b) <= eps;

/* 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * (정규식이 안 걸리면 `load()`가 던져 파일이 죽어요. 이 저장소에서 세 번 난 사고입니다.) */
const MUT = {
  /* ⓐ 판정 창 산식을 흔듭니다 — 창을 두 배로 */
  WIN2: [[/const sBar = \(err, win\) => clamp\(1 - err \/ Math\.max\(win, 1e-6\), 0, 1\);/,
    "const sBar = (err, win) => clamp(1 - err / Math.max(win * 2, 1e-6), 0, 1);"]],
  /* ⓑ 🦶 주발을 판정 창에서 뺍니다 */
  NOFOOT: [[/const winMul = \(cond, foot\) => condOf\(cond\) \* \(wideOn\(\) \? WIDE : 1\) \* \(foot \|\| 1\);/,
    "const winMul = (cond, foot) => condOf(cond) * (wideOn() ? WIDE : 1);"]],
  /* ⓒ 🫀 컨디션을 뺍니다 */
  NOCOND: [[/const winMul = \(cond, foot\) => condOf\(cond\) \* \(wideOn\(\) \? WIDE : 1\) \* \(foot \|\| 1\);/,
    "const winMul = (cond, foot) => (wideOn() ? WIDE : 1) * (foot || 1);"]],
  /* ⓓ 🔴 **능력치를 판정 창에 넣습니다** — 상용 `miniZone(stat)`의 그 형태
   *    (창이 능력치를 타면 E[s]가 능력치마다 달라지고, `_t.skill = 0.5`로 잰 곡선이 통째로 움직여요) */
  ABILITY: [[/const winMul = \(cond, foot\) => condOf\(cond\) \* \(wideOn\(\) \? WIDE : 1\) \* \(foot \|\| 1\);/,
    "const winMul = (cond, foot, ab) => condOf(cond) * (wideOn() ? WIDE : 1) * (foot || 1)"
    + " * (1 + (((ab == null ? 70 : ab) - 70) / 300));"],
    [/ {6}const mul = winMul\(ctx\.condition, l\.strong \? STRONG : WEAK\);/,
      "      const mul = winMul(ctx.condition, l.strong ? STRONG : WEAK, ctx.ability);"],
    /* 🥅 2026-09-02 — **자유 좌표가 격자가 되면서 이 줄이 통째로 없어졌습니다**(113번).
     *    옛 겨냥: `const s = sOne(margin, winMul(ctx.condition, strong ? STRONG : WEAK));`
     *    🔴 그 줄이 사라진 것을 **0번이 잡았고, 이 파일은 `loadMoment`에서 죽었습니다**(exit 2) —
     *       빨간불이 아니라 죽음이라 C·D·E가 통째로 안 돌았어요. 정규식을 새 자리로 옮깁니다.
     *    🔑 옮긴 자리는 **창 배수를 만드는 줄**이에요. 겨누는 것은 그대로
     *       *"능력치가 판정 창에 실리나"*입니다 — 이름이 아니라 **형태**를 따라갔습니다. */
    [/ {4}const cellMul = \(cx\) => winMul\(ctx\.condition, cx === 50 \? 1 : \(\(cx > 50\) === right \? STRONG : WEAK\)\);/,
      "    const cellMul = (cx) => winMul(ctx.condition, cx === 50 ? 1 : ((cx > 50) === right ? STRONG : WEAK), ctx.ability);"],
    [/ {4}const mul = winMul\(ctx\.condition, 1\);/,
      "    const mul = winMul(ctx.condition, 1, ctx.ability);"]],
  /* ⓔ 🧱 **읽기가 판정 창을 못 정하게** 합니다 — 셋을 다 1.00으로.
   *    🔴 옛 변이는 죽은 `sBlk(pick,truth)`(정확 1 · 인접 `BLK.part` · 반대 0)를 겨눴어요.
   *       그 형태가 통째로 폐기되면서(104번 §1) 정규식이 안 걸렸고, **0번 검사가 잡았습니다.**
   *       같은 자리를 새 형태로 다시 겨눕니다. */
  BLKFLAT: [[/const BLK_READ = \{ exact: 1\.00, near: 0\.45, opp: 0\.15 \};/,
    "const BLK_READ = { exact: 1.00, near: 1.00, opp: 1.00 };"]],
  /* ⓕ 📐 **한 종만 다른 곡선을 쓰게** 합니다 — 넷의 형평이 값이 아니라 구조라는 걸 재는 자리 */
  CURVE1: [[/const sKp = \(gap, mul\) => \(gap < 0 \? 0 : sBar\(gap, KP\.win \* mul\)\);/,
    "const sKp = (gap, mul) => (gap < 0 ? 0 : Math.pow(sBar(gap, KP.win * mul), 2));"]],
  /* ⓖ 📐 🧱만 **창이 mul에 안 반응**하게 — 차단이 컨디션·♿를 다시 안 타게 됩니다 */
  BLKNOMUL: [[/const blkWin = \(pick, truth, mul\) => BLK_WIN \* BLK_READ\[blkRead\(pick, truth\)\] \* mul;/,
    "const blkWin = (pick, truth, mul) => BLK_WIN * BLK_READ[blkRead(pick, truth)];"]],
};

/* ══════════════════════════════════════════════════════════════
 * 🔎 0. 변이 정규식이 지금 소스에 걸리나 — 다른 무엇보다 먼저
 * ══════════════════════════════════════════════════════════════ */
{
  const bad = momentMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, m) => a + m.length, 0);
  check(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 beta/winger-moment.js에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}

const M = loadMoment();
const T = M._t;
const K = T.K;

/* ══════════════════════════════════════════════════════════════
 * A. 🎯 `s` 산식의 모양 계약 — **넷이 같은 자를 씁니다**
 *   설계 §4-4 ①이 *"난이도를 한자리에서 견줄 수 있어야 한다"*고 한 근거예요.
 *   모양이 다르면 폭(±5%p)을 재는 것 자체가 성립 안 합니다.
 * ══════════════════════════════════════════════════════════════ */
{
  /* ① 공통 모양 — 오차 0이면 1 · 오차 = 창이면 0 · 그 사이 단조감소 · [0,1] 밖으로 안 나감 */
  const shape = [
    ["sBar", (e, w) => T.sBar(e, w), 10],
    ["🏃 sCut", (e) => T.sCut(e, 1), K.CUT.win],
    /* 🥅 2026-09-02 — **드디어 여기 합류했습니다**(113번 격자 개편).
     *    그전에는 `sOne(margin, mul)`이 *"여유가 클수록 좋다 · need 이상이면 1 · 몸 안이면 0"*
     *    이라 **오차 기준의 이 모양이 아니었어요.** 지금은 `sOne(err, mul)`로 🏃와 같은 꼴입니다. */
    ["🥅 sOne", (e) => T.sOne(e, 1), K.ONE_WIN],
    ["🎯 sKp", (e) => T.sKp(e, 1), K.KP.win],
  ];
  const bad = [];
  for (const [name, f, win] of shape) {
    if (!near(f(0, win), 1, 1e-12)) bad.push(`${name}: 오차 0에서 ${f(0, win)} ≠ 1`);
    if (!near(f(win, win), 0, 1e-12)) bad.push(`${name}: 오차 = 창에서 ${f(win, win)} ≠ 0`);
    if (!near(f(win * 2, win), 0, 1e-12)) bad.push(`${name}: 창을 넘어도 0이 아니에요`);
    let prev = 2;
    for (let e = 0; e <= win * 1.2; e += win / 40) {
      const v = f(e, win);
      if (v > prev + 1e-12) bad.push(`${name}: 오차 ${e.toFixed(2)}에서 되레 올라갔어요`);
      if (v < -1e-12 || v > 1 + 1e-12) bad.push(`${name}: ${v}가 [0,1] 밖`);
      prev = v;
    }
  }
  check(bad.length === 0,
    `A-1. 넷이 같은 모양 **s = 1 − 오차 ÷ 판정창** — 0에서 1 · 창에서 0 · 단조감소 · [0,1] 안`
    + (bad.length ? ` — ${bad.slice(0, 3).join(" · ")}` : ""));

  /* ② 🎯 라인을 넘었으면 0 — "실패는 0"이 공통 규칙이에요 */
  check(T.sKp(-0.001, 1) === 0 && T.sKp(-50, 1) === 0,
    `A-3. 🎯 오프사이드 라인을 넘었으면 s = 0`);

  /* 🚨 **A-2 · A-4는 2026-09-02에 지웠습니다 — 되살리지 마세요**(113번 §8-1).
   *    · A-2 *"🥅 키퍼 몸 안(여유 < 0)이면 s = 0"*
   *    · A-4 *"🥅 여유가 `ONE.need` 이상이면 s = 1"*
   *    둘 다 **자유 좌표 시절 `sOne(margin, mul)`의 갈래**였고, 격자 개편에서 그 형태가
   *    통째로 폐기됐어요(`ONE.need`도 같이 죽었습니다). 지금 `sOne`은 **오차 하나만 보는**
   *    🏃와 같은 꼴이라, 그 갈래를 다시 단언하면 **폐기한 형태를 검사가 지키게** 됩니다
   *    — 「폐기는 이름이 아니라 형태」의 그 자리예요.
   * ✅ **대신 A-1이 🥅를 넷째로 받았습니다.** 지키는 문장이 줄지 않았습니다:
   *    「오차 0에서 1 · 창에서 0 · 그 사이 단조감소 · [0,1] 안」을 🥅도 이제 통과해야 해요.
   * 🌍 이 판단이 서 있는 세계: 「🥅가 **오차 기준 격자**인 세계」.
   *    자유 좌표로 되돌리는 판정이 나오면 A-1의 🥅 줄부터 다시 보세요. */

  /* ③ 🧱 차단 — **읽기는 이제 `s`가 아니라 「판정 창의 폭」을 정합니다** (104번 §2-2).
   *
   * 🔴 **옛 `sBlk(pick,truth)`(정확 1 · 인접 0.24 · 반대 0)는 죽었습니다.** 여기서
   *    지키던 3단 이산 계약도 같이 죽었어요 — **이름이 아니라 형태를 버린 것**이라
   *    같은 계단을 다른 이름으로 되살리면 안 됩니다(원칙 ⑧).
   *
   * 지금 지키는 건 둘입니다:
   *   ㉮ `blkRead`의 **분류** — 가운데(1)가 끼면 「인접」, 좌↔우만 「반대」
   *   ㉯ `blkWin`의 **관계** — 창 = `BLK_WIN × BLK_READ[분류] × mul`. 값이 아니라 **관계**예요 */
  const cls = [[0, 0, "exact"], [1, 1, "exact"], [2, 2, "exact"],
    [0, 1, "near"], [1, 0, "near"], [1, 2, "near"], [2, 1, "near"],
    [0, 2, "opp"], [2, 0, "opp"]];
  const cBad2 = cls.filter(([p, t, w]) => T.blkRead(p, t) !== w)
    .map(([p, t, w]) => `(${p}→${t}) ${T.blkRead(p, t)}≠${w}`);
  check(cBad2.length === 0,
    `A-5. 🧱 읽기 분류 — 정타 exact · 가운데가 끼면 near · 좌↔우만 opp`
    + (cBad2.length ? ` — ${cBad2.join(" ")}` : ""));

  /* ㉯ **종속값은 관계로** — `blkWin`을 값으로 안 적고 `BLK_WIN·BLK_READ·mul`의 곱으로 봅니다.
   *    셋 중 무엇을 바꿔도 창이 **따라 움직여야** 해요. 안 따라가면 빨간불입니다. */
  const wBad = [];
  for (const [pk, tr, key] of cls) {
    for (const mul of [0.8, 1, 1.35]) {
      const want = K.BLK_WIN * K.BLK_READ[key] * mul;
      if (!near(T.blkWin(pk, tr, mul), want, 1e-12)) {
        wBad.push(`(${pk}→${tr}, mul ${mul}) ${T.blkWin(pk, tr, mul)}≠${want}`);
      }
    }
  }
  check(wBad.length === 0,
    `A-6. 🧱 판정 창 = BLK_WIN × BLK_READ[읽기] × mul — **관계로** 지킵니다 (27가지)`
    + (wBad.length ? ` — ${wBad.slice(0, 3).join(" · ")}` : ""));

  /* ㉰ 읽기가 **실제로 차이를 만드나** — 정타 > 인접 > 반대, 그리고 **반대도 0이 아님**.
   *    🔑 반대가 0이면 *"역동작에 걸렸는데 발을 뻗어 걷어냈어요"*가 사라지고
   *       손잡이가 아무것도 안 하는 구간이 생깁니다(원칙 ③). */
  const wE = T.blkWin(0, 0, 1), wN = T.blkWin(0, 1, 1), wO = T.blkWin(0, 2, 1);
  check(wE > wN && wN > wO && wO > 0,
    `A-7. 🧱 잘 읽을수록 창이 넓다 — 정타 ${wE.toFixed(2)}% > 인접 ${wN.toFixed(2)}% > 반대 ${wO.toFixed(2)}%`
    + ` (**반대도 0이 아니에요**)`);

  /* 🧪 변이 — 창을 두 배로 흔들면 s가 통째로 올라가야 합니다 */
  const W = loadMoment(MUT.WIN2);
  const before = T.sCut(6, 1), after = W._t.sCut(6, 1);
  check(after > before + 0.1,
    `A-변이. 판정 창 산식을 흔들면(창 ×2) s가 바뀐다 — 같은 오차 6에서 ${before.toFixed(3)} → **${after.toFixed(3)}**`);
  const B = loadMoment(MUT.BLKFLAT);
  const bE = B._t.blkWin(0, 0, 1), bO = B._t.blkWin(0, 2, 1);
  check(!(bE > bO),
    `A-변이. 🧱 BLK_READ를 셋 다 1.00으로 하면 → 빨간불 (정타 ${bE.toFixed(2)}% = 반대 ${bO.toFixed(2)}%`
    + ` — 읽어도 창이 안 넓어지면 1단계가 통째로 장식이 돼요)`);
}

/* ══════════════════════════════════════════════════════════════
 * B. 🎚️ 판정 창은 **무엇에 반응하나**
 *
 * 설계 §4-5의 판정 창 표에는 **🦶 주발과 🫀 컨디션뿐**이고 능력치가 없습니다.
 * 🚨 능력치는 이미 **두 번** 실려 있어요 — `autoP`의 중심(`sc`)과 조작 폭 `half(a)`.
 *    세 번째 경로를 얹으면 능력치가 높을수록 E[s] > 0.5가 되어
 *    **balancer가 `_t.skill = 0.5`로 잰 곡선이 통째로 움직입니다.**
 *    상용의 `miniZone(stat)`은 `autoP`가 능력치를 안 타던 **옛 모델**의 값이에요.
 * ══════════════════════════════════════════════════════════════ */
{
  const w = (c, f) => T.winMul(c, f);
  /* ① 🫀 컨디션 — condMul을 그대로 탑니다. 엔진의 진짜 함수와 대조해요 */
  const E = M.__win.WingerEngine;
  const cBad = [0, 40, 60, 80, 100].filter((c) => !near(w(c, 1), E.condMul(c), 1e-12))
    .map((c) => `${c}: ${w(c, 1)} ≠ condMul ${E.condMul(c)}`);
  check(cBad.length === 0,
    `B-1. 🫀 판정 창이 엔진의 condMul을 **그대로** 탄다 (60 → ${w(60, 1).toFixed(4)} · 80 → ${w(80, 1).toFixed(4)} · 100 → ${w(100, 1).toFixed(4)})`
    + (cBad.length ? ` — ${cBad.join(" · ")}` : ""));
  check(w(60, 1) < w(80, 1) && w(80, 1) < w(100, 1),
    `B-2. 🫀 지쳐 있으면 판정이 **좁아진다** (설계 §2-7)`);

  /* ② 🦶 주발 ±25% — 값을 검사에 직접 적습니다 (설계 §A-5 ③) */
  const FOOT = 0.25;
  check(near(w(80, K.STRONG) / w(80, 1), 1 + FOOT, 1e-12) && near(w(80, K.WEAK) / w(80, 1), 1 - FOOT, 1e-12),
    `B-3. 🦶 주발 쪽 +${FOOT * 100}% · 약발 쪽 −${FOOT * 100}% (주발 ${w(80, K.STRONG).toFixed(3)} · 약발 ${w(80, K.WEAK).toFixed(3)})`);

  /* ③ ♿ 판정 창 확대 — **성적 페널티가 없어야** 합니다. 접근성은 축약 대상이 아니에요 */
  const WD = loadMoment(null, { wide: true });
  check(WD._t.winMul(80, 1) > w(80, 1),
    `B-4. ♿ 확대를 켜면 판정 창이 넓어진다 (${w(80, 1).toFixed(2)} → ${WD._t.winMul(80, 1).toFixed(2)}) · 성적 페널티 없음`);
  check(near(WD._t.winMul(80, K.STRONG) / WD._t.winMul(80, 1), 1 + FOOT, 1e-12),
    `B-5. ♿를 켜도 🦶 주발 비가 그대로다 — 접근성이 다른 축을 안 흔듭니다`);

  /* ④ 🚨 **능력치가 안 실린다** — `winMul`은 (컨디션 · 주발 · ♿) 셋으로 완전히 결정됩니다.
   * 인자를 더 줘도, ctx에 능력치를 실어도 값이 한 톨도 안 움직여야 해요. */
  const extras = [undefined, 40, 70, 110, 150, 220, { ability: 150 }, "150"];
  const base = w(80, K.STRONG);
  const abBad = extras.filter((x) => T.winMul(80, K.STRONG, x) !== base);
  check(abBad.length === 0,
    `B-6. 🚨 판정 창에 **능력치가 안 실린다** — 셋째 인자를 무엇으로 줘도 ${base.toFixed(3)} 그대로`
    + ` (설계 §4-5의 표에 능력치가 없습니다)`);

  /* 🧪 변이 — 상용 miniZone(stat)처럼 능력치를 창에 넣습니다 (4곳 한 벌) */
  const AB = loadMoment(MUT.ABILITY);
  const a70 = AB._t.winMul(80, K.STRONG, 70), a150 = AB._t.winMul(80, K.STRONG, 150);
  check(a150 !== a70,
    `B-변이. winMul()에 능력치를 넣으면 → 빨간불 (능력치 70 ${a70.toFixed(3)} vs 150 **${a150.toFixed(3)}**`
    + ` — E[s]가 능력치마다 달라져 balancer 곡선이 통째로 움직여요)`);
  /* 그 변이가 실제로 `s`까지 번지는지도 봅니다 — 창만 바뀌고 s가 그대로면 반쪽이에요 */
  const s70 = AB._t.sCut(6, a70), s150 = AB._t.sCut(6, a150);
  check(s150 > s70 + 0.01,
    `B-변이. 그 변이가 s까지 번진다 — 같은 오차 6에서 ${s70.toFixed(3)} → ${s150.toFixed(3)}`);

  /* 🧪 변이 — 주발·컨디션을 각각 빼면 빨간불 (셋이 다 살아 있어야 해요) */
  const NF = loadMoment(MUT.NOFOOT);
  check(NF._t.winMul(80, K.STRONG) === NF._t.winMul(80, K.WEAK),
    `B-변이. 🦶 주발을 창에서 빼면 빨간불이 된다 (주발·약발이 ${NF._t.winMul(80, K.STRONG)}로 같아져요)`);
  const NC = loadMoment(MUT.NOCOND);
  check(NC._t.winMul(60, 1) === NC._t.winMul(100, 1),
    `B-변이. 🫀 컨디션을 창에서 빼면 빨간불이 된다 (60·100이 ${NC._t.winMul(60, 1)}로 같아져요)`);
}

/* ══════════════════════════════════════════════════════════════
 * C. 🔒 **판정을 이 파일이 만들지 않는다** — `s`를 엔진에 되돌려 묻습니다
 *
 * 미니게임이 제 손으로 perfect/ok/miss를 만들면 그 중심이 `autoP`와 무관해지고
 * **카드 갈래가 자동 갈래와 어긋납니다** — §2-6 개정이 고친 바로 그 자리예요
 * (🅰️ 전개 도움 4~6배 · 🧱 수비 실점 능력치 150에서 −9.8%).
 * ══════════════════════════════════════════════════════════════ */
{
  /* ① 폴백 `loneJudge`는 **s만** 봅니다 — 능력치도 전력도 안 봐요 */
  check(T.loneJudge(1) === "perfect" && T.loneJudge(0) === "miss" && T.loneJudge(0.5) === "ok",
    `C-1. 폴백 판정(loneJudge)이 s만 보고 perfect/ok/miss를 낸다 — 단조 (1 → perfect · 0.5 → ok · 0 → miss)`);
  let mono = true, prev = "";
  const ORD = { miss: 0, ok: 1, perfect: 2 };
  for (let s = 0; s <= 1.0001; s += 0.01) {
    const j = T.loneJudge(s);
    if (prev && ORD[j] < ORD[prev]) mono = false;
    prev = j;
  }
  check(mono, `C-2. 폴백 판정이 s에 대해 단조다 (잘해서 손해 보는 구간이 없어요)`);

  /* ② 🔴 **`opts.judge`가 오면 그걸 씁니다** — 소스에서 그 자리를 뜯어 확인해요.
   * `career.js`가 `judge: (s) => m.judgeFor(s)`를 안 넘기면 폴백으로 떨어지는데,
   * 그건 §2-6이 고친 어긋남이 되살아나는 자리라 **배선 검사가 따로 필요합니다**
   * (`wiring-test.js` F가 봅니다). 여기서는 **우선순위**만 봐요. */
  const pick = MSRC.match(/toJudge:\s*([^\n]+)/);
  check(!!pick && /typeof o\.judge === "function"\s*\?\s*o\.judge\s*:\s*loneJudge/.test(pick[1]),
    `C-3. opts.judge가 오면 **그걸 먼저** 쓴다 (폴백은 없을 때만) — ${pick ? pick[1].trim() : "못 찾음"}`);

  /* ③ **판정과 표시가 같은 값을 본다** — 이 저장소의 단골 병이에요.
   * `cb(toJudge(X), { s: Y })`에서 X와 Y가 **같은 이름**이어야 합니다. 다르면
   * 화면의 정확도 막대와 실제 판정이 서로 다른 것을 보게 돼요.
   * 그리고 그 값은 **clamp를 지난 값**이어야 하고요.
   *
   * ⚠️ 이건 소스 문자열을 뜯는 검사라 **연출을 고치면 깨질 수 있습니다**
   *    (실제로 director가 `clamp(s,0,1)`을 `v`로 뽑아내면서 한 번 깨졌어요).
   *    이름은 안 보고 **X === Y**와 **clamp 경유**만 봅니다. */
  const endLine = MSRC.match(/ctx\.cb\(\s*ctx\.toJudge\(\s*([^)]+?)\s*\)\s*,\s*\{\s*s:\s*([^,}]+?)\s*[,}]/);
  const same = !!endLine && endLine[1].trim() === endLine[2].trim();
  const clamped = !!endLine
    && (/clamp\(/.test(endLine[1]) || new RegExp(`(const|let)\\s+${endLine[1].trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=\\s*clamp\\(`).test(MSRC));
  check(same && clamped,
    `C-4. 끝날 때 **판정과 표시가 같은 값**을 본다 · 그 값은 clamp를 지난다`
    + (endLine ? ` — toJudge(${endLine[1].trim()}) · s: ${endLine[2].trim()}${clamped ? " (clamp ✓)" : " (clamp를 못 찾았어요)"}`
      : " — cb 줄을 못 뜯었어요. 정규식을 고치세요"));
}

/* ══════════════════════════════════════════════════════════════
 * D. 🔗 판정 창·속도 상수의 **유효 조건** — E[s] ≈ 0.5를 만든 값인가
 *
 * ⚪ E[s]는 여기서 안 잽니다(파일 상단 참고 — 조작자 모델이 저장소에 없어요).
 *    대신 **그 값을 만든 상수를 통째로 묶어** 지킵니다. 하나라도 움직이면
 *    engineer가 잰 `0.522 / 0.522 / 0.521 / 0.537`은 **무효**예요.
 *    `league-test.js` 33-B와 같은 방식입니다 — 측정은 못 해도 **유효 조건은 지킵니다.**
 *
 * 🚨 값을 여기 **직접 적습니다.** 소스에서 읽어 오면 상수를 바꿔도 검사가 따라가서
 *    아무것도 안 잡혀요 (문턱은 박고 산식은 뜯어온다 — 그 규칙의 "박는" 쪽입니다).
 * ══════════════════════════════════════════════════════════════ */
{
  const WANT = {
    "CUT.win": 12, "CUT.speed": 118, "CUT.sweeps": 3,
    /* 🥅 2026-09-02 격자 개편 — `need`·`kw0`·`kw1`은 **죽었습니다**.
     *    새 값을 여기 **박습니다**(소스에서 읽어 오지 않아요). `kc`는 배열이라 D-2에 있어요.
     * 🚨 **이 자리는 하루에 두 번 움직였습니다.** 113번 §8-1이 알려 준
     *    `ONE.win 17 · cov1 17 · close 0.62`는 **몇 분 뒤 옛말**이 됐어요 —
     *    engineer가 「오차의 바닥」을 **몫 나누기에서 `CELL_FLOOR`로 옮겼거든요**
     *    (`cov1`이 17 → 34로 돌아오고 `ONE_CLOSE`가 0.62 → 0.45).
     *    🔑 **문서에서 베끼지 말고 그때의 소스에서 확인하세요.** 여기 값은 소스를 보고 적었습니다.
     * 🔒 손잡이 셋은 **따로** 씁니다 — 같은 표에 두면 무엇이 움직였는지 못 가려요:
     *    `ONE_WIN` 난이도 · `ONE_CLOSE` 공간↔시간 지분 · `CELL_FLOOR` s의 천장 */
    /* ═══ 🥅 2026-09-02 재측정 완료 — **한 벌로** 넣었습니다 (113번 §14) ═══
     * 🔴 **`ONE_WIN` 하나만 23으로 고치면 안 됐습니다.** 넷이 한 벌로 움직였어요:
     *      `CELL_FLOOR` (없음)→0.30 · `ONE.cov1` 17→34 · `ONE_CLOSE` 0.62→0.45 · `ONE_WIN` 17→23
     *    🔑 `ONE_WIN`이 커진 건 **「쉬워졌다」가 아닙니다** — `CELL_FLOOR`가 오차에 바닥
     *       (칸폭 20 × 0.30 = **6**)을 깔아서, **같은 난이도를 내려면 창이 그만큼 넓어야** 해요.
     *       바닥 없이 23이면 훨씬 쉬워집니다. **둘은 한 벌입니다.**
     * 📏 다시 잰 곡선(판 400 × 시드 3벌 · 옛 판과 **짝지은 차이**):
     *      서툰 +0.007 · **보통 ±0.000** · 능숙 −0.029   (계약 ① 「보통 ≤ 0.005」 충족)
     *      세 시드 −0.005 / +0.008 / −0.002
     * ⚠️ `ONE_WIN`은 `CELL_FLOOR`·`ONE.cells`에 **매달린 종속값**이에요. 셋 중 하나가 움직이면
     *    **표 한 줄을 통째로** 가져오세요 (기울기: d(보통)/d(ONE_WIN) ≈ +0.016 ·
     *    d(보통)/d(CELL_FLOOR) ≈ −0.9).
     * 🔴 **죽은 이름**: `ONE.need` · `ONE.kw0` · `ONE.kw1` · `ONE.win` · `ONE.close`
     *    (`win`·`close`는 **`ONE` 밖으로 나갔습니다** — 손잡이 셋을 같은 표에 안 두려고요) */
    "ONE.cells": 5, "ONE.cov0": 10, "ONE.cov1": 34,
    "ONE.grow": 2400, "ONE.life": 3400, "ONE.post": 3.5,
    "ONE_WIN": 23, "ONE_CLOSE": 0.45, "CELL_FLOOR": 0.30,
    "KP.win": 8, "KP.line": 92,
    "BLK.tellHi": 0.58, "BLK.tellLo": 0.24, "BLK.favor": 1.6, "BLK.hiP": 0.5,
    /* 🧱 2단 국면 (2026-09-01 개편) — `BLK.part`는 **죽었습니다**(3단 이산 매핑 폐기).
     * ⚠️ `BLK_WIN`은 **종속값**이라 여기서는 「움직였나」만 봅니다. *왜 그 값인가*는
     *    `block-test.js` C가 **관계로** 재요 (옛↔새 짝지은 E[s] 차이). 둘은 다른 검사예요 —
     *    여기가 빨간불이면 "재측정하세요", 거기가 빨간불이면 "값이 틀렸습니다"입니다. */
    "BLK_WIN": 14.2,
    "BLK_READ.exact": 1.00, "BLK_READ.near": 0.45, "BLK_READ.opp": 0.15,
    "BLK_RUN.mark": 70,
    "FOOT_WIN": 0.25, "WIDE": 1.30,
  };
  const got = (k) => {
    if (k.indexOf(".") < 0) return K[k];              // 최상위 손잡이 (ONE_WIN · CELL_FLOOR · …)
    const [g, f] = k.split(".");
    return K[g][f];
  };
  /* 🔒 **어느 축이 움직였는지를 말해 줍니다** (113번 §14-3).
   *    셋을 한 줄로 묶어 «움직였다»고만 하면, 다음 사람이 **무엇을 다시 재야 할지** 몰라요 —
   *    난이도(속도÷창) · 지분(공간↔시간) · 천장(바닥)은 **서로 다른 재측정**을 부릅니다. */
  const AXIS = {
    ONE_WIN: "🎚️ 난이도(속도 ÷ 창) — 곡선 전체를 다시 재세요",
    ONE_CLOSE: "⚖️ 공간 ↔ 시간 지분 — 「무엇으로 이기나」가 바뀝니다(난이도가 아니에요)",
    CELL_FLOOR: "🏔️ s의 천장 — **`ONE_WIN`이 여기 매달린 종속값**이라 표 한 줄을 통째로 가져오세요",
    "ONE.cells": "🔲 읽힘(칸 수) — 칸 폭이 바뀌면 🏔️ 바닥도 같이 움직입니다",
    "ONE.cov1": "🧤 좋은 지점이 움직이는 폭 — 너무 작으면 격자가 **버튼 하나**가 돼요",
  };
  const off = Object.entries(WANT).filter(([k, v]) => got(k) !== v).map(([k, v]) => `${k} ${got(k)}≠${v}`);
  const axes = Object.keys(AXIS).filter((k) => got(k) !== WANT[k]);
  check(off.length === 0,
    `D-1. 🔗 E[s] ≈ 0.5를 만든 판정 창·속도 상수 ${Object.keys(WANT).length}개가 그대로다`
    + (off.length
      ? `\n     🔴 움직인 것: ${off.join(" · ")}`
        + (axes.length ? `\n     🧭 **어느 축인가** — ${axes.map((k) => `${k}: ${AXIS[k]}`).join("\n        ")}` : "")
        + `\n     👉 engineer에게 **E[s] 4종 재측정**을 요청하세요.`
        + `\n     🔴 **한 손잡이만 되돌리지 마세요.** 2026-09-02에 넷이 한 벌로 움직였습니다 —`
        + ` \`ONE_WIN\`만 고쳤으면 \`CELL_FLOOR\`가 깐 바닥과 어긋나 곡선이 무너져요.`
        + `\n     🔒 재측정은 **절대값이 아니라 「바꾸기 전 ↔ 바꾼 뒤」 짝지은 차이**로 보고하세요 —`
        + `\n        절대값은 조작자 모델의 치우침을 그대로 물고 옵니다 (파일 머리말 참고).`
        + `\n        설계 §4-4 ①의 ±5%p ⇔ ΔE[s] 0.132 (half(70) = 0.19)`
      : ""));
  /* 속도 폭은 배열이라 따로 */
  check(K.KP.speed[0] === 22 && K.KP.speed[1] === 34 && K.CUT.lane[0] === 26 && K.CUT.lane[1] === 74
    && K.BLK_RUN.speed[0] === 58 && K.BLK_RUN.speed[1] === 74
    && K.ONE.kc[0] === 18 && K.ONE.kc[1] === 82
    && K.ONE.look === 450,
    `D-2. 🔗 KP.speed [22,34] · CUT.lane [26,74] · BLK_RUN.speed [58,74] · 🥅 ONE.kc [18,82] · 🔮 ONE.look 450도 그대로다`
    + `\n     🔑 **\`ONE.look\`은 D-1에 안 넣었습니다.** 🔮 미래 흘리기는 **화면 전용**이라`
    + ` \`s\`에 한 톨도 안 들어가요 — 움직여도 **곡선 재측정이 아닙니다**(113번 §14-3).`
    + `\n     D-1에 뒀다면 이 값이 바뀔 때 «E[s]를 다시 재세요»라는 **틀린 안내**가 떴을 거예요.`
    + ` 「s에 안 들어간다」 자체는 **\`one-grid-test.js\` G-7**이 관계로 지킵니다`);

  /* ══════ D-2a. 🏔️ **격자에는 「`s`의 천장」이 있어야 한다** ══════
   * (2026-09-02 · engineer 112번 §12 · 113번)
   *
   * 🔴 자유 좌표에서는 **손이 바닥을 만들었습니다** — 노린 곳에 정확히 못 맞으니까요.
   *    격자는 탭을 **칸 중심으로 스냅**해서 그 바닥을 지웠고, 오차가 **0을 지나갈 수** 있게 됐어요.
   *    `sBar(0, 창) = 1`이라 **창을 아무리 좁혀도 잘하는 사람은 만점**을 굽니다
   *    (실측: 능숙 E[s] 0.702 → **0.903**).
   *
   * 🚨 **이 문장은 하루에 한 번 갈아엎혔습니다 — 그게 이 주석의 요점이에요.**
   *    처음엔 「좋은 지점」을 거의 안 움직이게 해서(`cov1`을 17로 낮춰) 천장을 만들었고,
   *    113번 §8-1은 저에게 그 상태를 **부등호로 지켜 달라**고 했습니다:
   *        `(cov1 − cov0) / 2 < (100 / cells) / 4`
   *    🔴 그런데 engineer가 몇 분 뒤 **그 풀이를 되돌렸습니다** — 「좋은 지점」이 안 움직이면
   *       **어느 칸을 누를지가 고정**되어 격자가 버튼 하나가 되거든요.
   *       바닥은 이제 **`CELL_FLOOR`**가 따로 만듭니다(`cov1`은 34로 복귀).
   *    ⚠️ 그 부등호를 그대로 굳혔다면 **고친 코드 쪽이 빨간불**이 났을 겁니다
   *       (실제로 잠깐 그 상태였어요: 12.00 < 5.00 위반).
   *
   * ✅ 그래서 **값이 아니라 관계**로 씁니다 — 「천장이 있다」는 두 풀이 **어느 쪽에서도** 참이에요.
   *    · 칸 중심을 **정확히** 노려도(오차 0) `s`가 1이 아니다
   *    · 그 천장은 판정 창(`mul`)이 넓어지면 **같이 올라간다**
   * 🔑 산식은 **소스가 내보낸 `oneErr`**를 그대로 부릅니다(베껴 적지 않았어요).
   * 🌍 이 문장이 서 있는 세계: 「🥅가 **칸으로 스냅되는** 세계」. 자유 좌표로 되돌아가면
   *    손이 다시 바닥을 만드니 이 천장은 필요 없어집니다 — 그때 여기부터 다시 보세요. */
  const cellW = 100 / K.ONE.cells;
  const ceil1 = T.sOne(T.oneErr(cellW * 1.5, cellW * 1.5), 1);      // 오차 0을 노려도
  const ceil2 = T.sOne(T.oneErr(cellW * 1.5, cellW * 1.5), 1.3);    // 창이 넓어지면
  check(ceil1 < 1 - 1e-9 && ceil2 > ceil1 + 1e-9 && ceil1 > 0,
    `D-2a. 🏔️ **격자에는 \`s\`의 천장이 있다** — 칸 중심을 정확히 노려도 ${ceil1.toFixed(3)} (< 1)`
    + ` · 창을 1.3배로 넓히면 ${ceil2.toFixed(3)}로 **같이 올라간다**`
    + `\n     🔑 값이 아니라 **관계**입니다 — 「몫 나누기」로 풀든 \`CELL_FLOOR\`로 풀든 살아남아요`
    + `\n     ⚠️ 천장이 1이 되면 **능숙 E[s]가 0.90으로 되돌아갑니다**(실측). 0이면 격자가 아무것도 못 내요`
    + (ceil1 < 1 - 1e-9 && ceil2 > ceil1 + 1e-9 && ceil1 > 0 ? ""
      : `\n     🔴 천장 ${ceil1.toFixed(3)} → engineer에게 **E[s] 4종 재측정**을 요청하세요`));

  /* 🧪 변이 — 🏔️ 바닥을 0으로 지우면 천장이 1이 되어 빨간불 */
  {
    const MFL = [[/const CELL_FLOOR = 0\.30;/, "const CELL_FLOOR = 0;"]];
    const bad2 = momentMutsOK({ FLOOR0: MFL });
    if (bad2.length) {
      check(false, `D-2a변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${bad2.join(", ")}`);
    } else {
      const F = loadMoment(MFL)._t;
      const c0 = F.sOne(F.oneErr(cellW * 1.5, cellW * 1.5), 1);
      check(!(c0 < 1 - 1e-9),
        `D-2a변이. 🏔️ \`CELL_FLOOR\`를 0으로 지우면 → 빨간불 (천장 ${c0.toFixed(3)} — 칸 중심을 노리면 **만점**이에요)`
        + `\n     🔑 이게 능숙 E[s]를 0.702 → 0.903으로 올렸던 그 자리입니다`);
    }
  }

  /* 🧱 차단 — 겹쳐 읽기가 성립하는 **부등호**가 양쪽에서 뒤집히는가.
   * 이건 값이 아니라 **관계**예요 — 계수를 옮겨도 이 부등호가 살아 있으면 판이 성립합니다.
   * engineer가 여기서 한 번 갈아엎었어요(신호가 둘인 척하는 신호 하나짜리 판이었습니다). */
  const B = K.BLK;
  const hiBody = B.tellHi, hiFoot = B.favor * (1 - B.tellHi) / 2;
  const loBody = B.tellLo, loFoot = B.favor * (1 - B.tellLo) / 2;
  check(hiBody > hiFoot && loBody < loFoot,
    `D-3. 🧱 겹쳐 읽기가 성립한다 — 「확실히」는 몸 방향(${hiBody.toFixed(3)} > ${hiFoot.toFixed(3)}) ·`
    + ` 「살짝」은 주발 쪽(${loBody.toFixed(3)} < ${loFoot.toFixed(3)})이 정답`
    + `\n     👉 두 경우의 정답이 **서로 갈려야** 읽기가 판이 됩니다. 한쪽으로 몰리면`
    + ` "늘 같은 버튼"이 정답이 되어 신호 하나짜리 판이 돼요`);

  /* 🧪 변이 — favor를 키워 두 경우의 정답을 한쪽으로 몰면 빨간불 */
  const MFAV = [[/favor: 1\.6 \}/, "favor: 6.0 }"]];
  const bad = momentMutsOK({ FAVOR: MFAV });
  if (bad.length) {
    check(false, `D-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${bad.join(", ")}`);
  } else {
    const F = loadMoment(MFAV)._t.K.BLK;
    const h = F.tellHi, hf = F.favor * (1 - F.tellHi) / 2;
    const l = F.tellLo, lf = F.favor * (1 - F.tellLo) / 2;
    check(!(h > hf && l < lf),
      `D-변이. 🧱 favor를 키워 두 경우의 정답을 한쪽(주발)으로 몰면 → 빨간불`
      + ` (「확실히」 ${h.toFixed(3)} vs ${hf.toFixed(3)} — 몸 방향이 더 이상 정답이 아니에요)`);
  }
}


/* ══════════════════════════════════════════════════════════════
 * E. 📐 **넷이 같은 `sBar` 형태를 쓴다** — 값이 아니라 **구조**로 재는 형평
 *
 * 🔴 **이 자리는 세 번 뒤집혔습니다.** 넷의 형평을 지금까지 *"E[s] 평균이 서로 0.017 안"*
 *    으로 적어 왔는데, 그 0.017은 **한 조작자 모델의 성질**이에요 — 제 모델로 재면 0.145입니다.
 *    모델을 바꿀 때마다 계약이 뒤집히니 **값으로는 못 지킵니다.**
 *
 * 🔑 **대신 구조로 지킵니다.** 넷이 형평인 이유는 평균이 우연히 가까워서가 아니라,
 *    **같은 자를 쓰기 때문**이에요:
 *      ① 넷의 `s`가 전부 **`sBar` 한 함수**를 지난다
 *      ② 넷의 판정 창이 전부 **`상수 × mul`** 꼴이다 — `mul`에 **같은 비율**로 반응한다
 *      ③ 그래서 `s`는 넷 다 **`오차 ÷ 창` 하나만의 함수**이고, 그 함수가 서로 같다
 *    구조는 조작자 모델을 안 탑니다. 곡선을 다시 재도 살아남아요.
 *
 * ┌ 「이 계약이 서 있는 세계」 ─────────────────────────────────────────
 * │ **넷이 「어디를 겨눠 언제」라는 같은 장르를 쓰는 세계**의 계약입니다.
 * │ 🧱 차단이 2단 국면이 되면서 **드디어 `sBar`에 합류했어요**(2026-09-01) —
 * │ 그전까지는 3단 이산이라 이 검사에 못 들어왔습니다.
 * │ 🔴 어느 한 종이 일부러 **다른 장르**(예: 누적·연타·확률 굴림)로 바뀌는 판정이 나오면
 * │    **이 검사부터 다시 보세요.** 그때는 ③이 성립할 수 없고, ①②만 남습니다.
 * └────────────────────────────────────────────────────────────────
 * ══════════════════════════════════════════════════════════════ */
{
  /* ① 🔒 **소스에서 정규식으로 뜯습니다** — 값을 베껴 적지 않아요.
   *    넷의 산식 줄과 🧱 2단계 판정 줄이 전부 `sBar(`를 지나야 합니다. */
  const LINES = {
    "🏃 sCut": /const sCut = \(err, mul\) => ([^\n]+);/,
    "🥅 sOne": /const sOne = \(err, mul\) => ([^\n]+);/,
    "🎯 sKp": /const sKp = \(gap, mul\) => ([^\n]+);/,
    "🧱 blkWin": /const blkWin = \(pick, truth, mul\) => ([^\n]+);/,
    "🧱 2단계 판정": /const s = (sBar\(Math\.abs\(pos - mark\), half\));/,
    /* 🥅 2026-09-02 — 격자의 판정 한 줄. **판정도 그림도 이 줄을 지납니다**(113번).
     *    창을 좁히는 `tight`와 🦶·🫀·♿의 `c.mul`이 **곱해져 하나의 mul**로 들어가야
     *    넷이 같은 비율로 움직여요 — 그걸 E-3의 `* mul` 검사가 봅니다. */
    "🥅 격자 판정": /const cellS = \(c, a\) => (sOne\(oneErr\(c\.x, a\.best\), a\.tight \* c\.mul\));/,
  };
  const miss = [], noBar = [], noMul = [];
  const body = {};
  for (const [name, re] of Object.entries(LINES)) {
    const m = MSRC.match(re);
    if (!m) { miss.push(name); continue; }
    body[name] = m[1].trim();
    /* 🧱 blkWin은 창을 **만드는** 줄이라 sBar를 안 지납니다 — 그 창을 받아 쓰는
     *    「2단계 판정」 줄이 지나요. 나머지 셋은 자기 줄에서 지나야 합니다. */
    if (name !== "🧱 blkWin" && !/\b(sBar|sOne)\(/.test(m[1])) noBar.push(`${name}: ${m[1].trim()}`);
    /* ② 창이 `… * mul` 꼴인가 — `mul`에 **1차 비례**해야 넷이 같은 비율로 움직입니다.
     * 🥅 2026-09-02 — 격자 판정 줄은 `a.tight * c.mul`로 **점 찍힌 이름**을 곱합니다.
     *    그래서 `x.mul` 꼴도 받아요. 🔑 **받아 주는 것이 느슨해진 게 아닙니다** —
     *    `c.mul`(🦶·🫀·♿)을 그 줄에서 빼면 여기서 바로 빨간불이 나요(그게 이 줄의 계약이에요). */
    if (name !== "🧱 2단계 판정" && !/\*\s*(?:[\w.$]+\.)?mul\b/.test(m[1])) noMul.push(`${name}: ${m[1].trim()}`);
  }
  check(miss.length === 0,
    `E-1. 📐 넷의 산식 줄을 소스에서 전부 뜯었다 (${Object.keys(LINES).length}줄)`
    + (miss.length ? `\n     🔴 **못 뜯은 줄: ${miss.join(" · ")}** — 정규식이 소스와 안 맞아요.`
      + ` 이 검사는 지금 "안 도는" 상태입니다` : ""));
  check(noBar.length === 0,
    `E-2. 📐 넷의 \`s\`가 전부 **\`sBar\` 한 함수**를 지난다`
    + (noBar.length ? `\n     🔴 딴 곡선을 쓰는 것: ${noBar.join(" · ")}` : ""));
  check(noMul.length === 0,
    `E-3. 📐 넷의 판정 창이 전부 **\`상수 × mul\`** 꼴이다 — 🫀 컨디션·♿가 넷에 **같은 비율**로 걸립니다`
    + (noMul.length ? `\n     🔴 mul을 안 타는 것: ${noMul.join(" · ")}` : ""));

  /* ③ **`s`가 넷 다 「오차 ÷ 창」 하나만의 함수이고, 그 함수가 서로 같다.**
   *   같은 비율 r을 넷에 각각 먹여서 **같은 값**이 나오는지 봅니다.
   *   창 폭도 상수도 서로 다른데 r만 맞추면 값이 같아야 해요 — 그게 "같은 자"의 뜻입니다. */
  /* ⚠️ `mul`은 **1이 아니어야** ②가 진짜로 걸립니다.
   * 🥅 2026-09-02 — **여기가 깨끗해졌습니다.** 그전에는 sOne만 「여유」 기준이라
   *    `ONE.need - r * 창`으로 **뒤집어서** 먹여야 했고, 비율도 `1/mul`까지만 성립했어요.
   *    격자가 되면서 🥅가 🏃와 **완전히 같은 꼴**이라 이제 넷을 똑같이 먹입니다. */
  const mul = 0.85;
  const RMAX = 1 / mul - 1e-9;
  const winOf = {
    "🏃 sCut": K.CUT.win * mul,
    "🥅 sOne": K.ONE_WIN * mul,
    "🎯 sKp": K.KP.win * mul,
    "🧱 blk": T.blkWin(0, 1, mul),                     // 인접 읽기 — 정타·반대와 폭이 다릅니다
  };
  const sOf = {
    "🏃 sCut": (r) => T.sCut(r * winOf["🏃 sCut"], mul),
    "🥅 sOne": (r) => T.sOne(r * winOf["🥅 sOne"], mul),
    "🎯 sKp": (r) => T.sKp(r * winOf["🎯 sKp"], mul),
    "🧱 blk": (r) => T.sBar(r * winOf["🧱 blk"], winOf["🧱 blk"]),
  };
  const shapeBad = [];
  let pts = 0;
  for (let r = 0; r <= RMAX; r += 0.05) {
    pts += 1;
    const vals = Object.entries(sOf).map(([n, f]) => [n, f(r)]);
    const ref = vals[0][1];
    for (const [n, v] of vals.slice(1)) {
      if (!near(v, ref, 1e-9)) shapeBad.push(`r=${r.toFixed(2)}에서 ${n} ${v.toFixed(4)} ≠ ${vals[0][0]} ${ref.toFixed(4)}`);
    }
  }
  check(shapeBad.length === 0,
    `E-4. 📐 같은 비율(오차 ÷ 창)을 먹이면 **넷이 같은 값**을 낸다 — 창 폭이 서로 달라도요`
    + ` (비율 0 ~ ${RMAX.toFixed(2)} · ${pts}점 · **창을 넘는 구간까지**)`
    + (shapeBad.length ? `\n     🔴 ${shapeBad.slice(0, 3).join(" · ")}` : ""));

  /* ④ **창 비율** — `mul`을 흔들면 넷의 창이 **똑같은 배수**로 움직인다.
   *    이게 ♿ 확대·🫀 컨디션이 네 종의 형평을 안 깨뜨리는 근거예요. */
  const widthOf = (m) => ({
    "🏃 sCut": K.CUT.win * m, "🥅 sOne": K.ONE_WIN * m,
    "🎯 sKp": K.KP.win * m, "🧱 blk": T.blkWin(0, 1, m),
  });
  const ratioBad = [];
  for (const m of [0.8, 1.06, 1.3, 1.625]) {
    const a = widthOf(1), b = widthOf(m);
    for (const k of Object.keys(a)) {
      if (!near(b[k] / a[k], m, 1e-9)) ratioBad.push(`mul ${m}에서 ${k}가 ×${(b[k] / a[k]).toFixed(3)}`);
    }
  }
  check(ratioBad.length === 0,
    `E-5. 📐 mul을 흔들면 넷의 창이 **똑같은 배수**로 움직인다 (0.8 · 1.06 · 1.3 · 1.625)`
    + (ratioBad.length ? `\n     🔴 ${ratioBad.join(" · ")}` : ""));

  /* 🧪 변이 ⓕ — 🎯 한 종만 제곱 곡선으로. **소스 검사와 값 검사가 둘 다** 걸려야 해요 */
  const C1 = loadMoment(MUT.CURVE1);
  const srcHit = !/const sKp = \(gap, mul\) => \(gap < 0 \? 0 : sBar\(gap, KP\.win \* mul\)\);/
    .test(MSRC.replace(MUT.CURVE1[0][0], MUT.CURVE1[0][1]));
  const w3 = K.KP.win;
  const valHit = !near(C1._t.sKp(w3 * 0.5, 1), C1._t.sCut(K.CUT.win * 0.5, 1), 1e-9);
  check(srcHit && valHit,
    `E-변이. 🎯 한 종만 다른 곡선(제곱)을 쓰면 → 빨간불`
    + ` (소스 검사 ${srcHit ? "✓" : "✗"} · 값 검사 ${valHit ? "✓" : "✗"}`
    + ` — 같은 비율 0.5에서 🎯 ${C1._t.sKp(w3 * 0.5, 1).toFixed(3)} vs 🏃 ${C1._t.sCut(K.CUT.win * 0.5, 1).toFixed(3)})`);

  /* 🧪 변이 ⓖ — 🧱만 창이 mul에 안 반응. 🫀 컨디션·♿가 차단에서만 빠집니다.
   *    🔑 이게 *"차단이 처음으로 컨디션을 탑니다"*(106번 §3-5)를 지키는 자리예요 —
   *       옛 3단 이산 시절로 되돌아가는 형태입니다. */
  const NM = loadMoment(MUT.BLKNOMUL);
  check(NM._t.blkWin(0, 1, 1.3) === NM._t.blkWin(0, 1, 1),
    `E-변이. 🧱만 창이 mul에 안 반응하게 하면 → 빨간불`
    + ` (mul 1과 1.3이 ${NM._t.blkWin(0, 1, 1).toFixed(3)}로 같아져요 — 🫀 컨디션·♿가 차단에서만 빠집니다)`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
