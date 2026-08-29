/* ⚽ 더 윙어 II — 🔥 순간 카드 미니게임 4종 (`beta/winger-moment.js`)
 *
 * 🔴 **이 파일이 생기기 전까지 `winger-moment.js`를 보는 검사가 0건이었습니다.**
 *    `grep -rln 'winger-moment\|W2Moment' tests/`가 빈 결과였어요 —
 *    **판정 창 산식을 아무렇게나 바꿔도 전 검사가 초록불**이었습니다.
 *
 * 여기서 지키는 것 넷
 *   A. 🎯 `s` 산식의 **모양 계약** — 넷이 같은 자를 쓴다 (`s = 1 − 오차/판정창`)
 *   B. 🎚️ **판정 창은 🫀 컨디션 · 🦶 주발 · ♿ 확대 셋에만 반응한다**
 *      🚨 **능력치는 안 실립니다** — 넣으면 빨간불 (설계 §4-5 · engineer 50번 §3)
 *   C. 🔒 **판정을 이 파일이 만들지 않는다** — `s`를 엔진에 되돌려 묻는다
 *   D. 🔗 판정 창 상수의 **유효 조건** — E[s] ≈ 0.5를 만든 값이 그대로인가
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚪ **E[s] 자체는 여기서 안 잽니다. 왜 안 재는지 적어 둡니다.**
 * ─────────────────────────────────────────────────────────────────────────
 *
 * engineer가 잰 E[s]는 **0.522 / 0.522 / 0.521 / 0.537** (폭 0.017 → perfect 폭 0.6%p)이고,
 * 그 값은 **가상 조작자**(시간 오차 σ 70ms · 조준 오차 σ 3.5% · 놓침 3%)로 나온 값입니다.
 * 그 조작자의 **겨냥 전략**(어디를 노리고 언제 누르나)은 저장소에 없어요 — 문서에만 있습니다.
 *
 * 제가 같은 σ로 조작자를 다시 짜서 재 봤습니다 (`52_inspector_minigame-tests.md` §4):
 *
 *     🏃 0.558 · 🥅 **0.655** · 🎯 0.559 · 🧱 0.510   (폭 **0.145**)
 *
 * 🥅에서 *"빈 곳의 한가운데를 겨냥한다"*로 뒀더니 0.52가 0.66이 됐어요.
 * **σ는 같은데 겨냥 전략 하나로 0.13이 움직입니다.** 이 상태로 밴드를 박으면
 * 검사가 **코드가 아니라 제 조작자 모델**을 재게 됩니다 — 이 저장소가 여러 번 데인
 * *"픽스처가 다른 모양"*의 그 자리예요. 없는 병이 보이거나, 있는 병이 안 보입니다.
 *
 * → **E[s] 측정은 engineer/balancer 몫으로 넘깁니다.** 대신 **D**가 그 값을 만든
 *    판정 창·속도 상수를 통째로 묶어 지킵니다 — 하나라도 움직이면
 *    *"E[s]를 다시 재세요"*라고 빨간불이 떠요. 그게 지금 걸 수 있는 실질적 방어선입니다.
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
    [/const s = sOne\(margin, winMul\(ctx\.condition, strong \? STRONG : WEAK\)\);/,
      "const s = sOne(margin, winMul(ctx.condition, strong ? STRONG : WEAK, ctx.ability));"],
    [/ {4}const mul = winMul\(ctx\.condition, 1\);/,
      "    const mul = winMul(ctx.condition, 1, ctx.ability);"]],
  /* ⓔ 🧱 차단의 인접 점수를 정타와 같게 — 읽기의 의미가 사라집니다 */
  BLKFLAT: [[/const sBlk = \(pick, truth\) => \(pick === truth \? 1 : pick === 1 \|\| truth === 1 \? BLK\.part : 0\);/,
    "const sBlk = (pick, truth) => 1;"]],
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

  /* ② 🥅 키퍼 몸 안이면 0 · 🎯 라인을 넘었으면 0 — "실패는 0"이 넷의 공통 규칙이에요 */
  check(T.sOne(-1, 1) === 0 && T.sOne(-0.001, 1) === 0,
    `A-2. 🥅 키퍼 몸 안(여유 < 0)이면 s = 0 — 막힌 거예요`);
  check(T.sKp(-0.001, 1) === 0 && T.sKp(-50, 1) === 0,
    `A-3. 🎯 오프사이드 라인을 넘었으면 s = 0`);
  /* 🥅는 여유가 need 이상이면 만점 — 창을 넓히면 만점 문턱이 같이 넓어져야 해요 */
  check(T.sOne(K.ONE.need, 1) === 1 && T.sOne(K.ONE.need * 2, 1) === 1,
    `A-4. 🥅 여유가 ${K.ONE.need}%(ONE.need) 이상이면 s = 1`);

  /* ③ 🧱 차단 — 정타 1 · 인접 part · 정반대 0. 가운데(1)가 인접의 기준이에요 */
  const pairs = [[0, 0, 1], [1, 1, 1], [2, 2, 1], [0, 1, K.BLK.part], [1, 0, K.BLK.part],
    [1, 2, K.BLK.part], [2, 1, K.BLK.part], [0, 2, 0], [2, 0, 0]];
  const bBad = pairs.filter(([p, t, want]) => T.sBlk(p, t) !== want)
    .map(([p, t, want]) => `(${p}→${t}) ${T.sBlk(p, t)}≠${want}`);
  check(bBad.length === 0,
    `A-5. 🧱 정타 1 · 인접 ${K.BLK.part} · 정반대 0 (좌↔우는 몸을 못 걸쳐요)`
    + (bBad.length ? ` — ${bBad.join(" ")}` : ""));

  /* 🧪 변이 — 창을 두 배로 흔들면 s가 통째로 올라가야 합니다 */
  const W = loadMoment(MUT.WIN2);
  const before = T.sCut(6, 1), after = W._t.sCut(6, 1);
  check(after > before + 0.1,
    `A-변이. 판정 창 산식을 흔들면(창 ×2) s가 바뀐다 — 같은 오차 6에서 ${before.toFixed(3)} → **${after.toFixed(3)}**`);
  const B = loadMoment(MUT.BLKFLAT);
  check(!(B._t.sBlk(0, 2) === 0),
    `A-변이. 🧱 인접 점수를 정타와 같게 하면 빨간불이 된다 (정반대 ${B._t.sBlk(0, 2)} ≠ 0 — 읽기의 의미가 사라져요)`);
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
    "ONE.need": 26, "ONE.kw0": 12, "ONE.kw1": 36, "ONE.grow": 2400, "ONE.post": 3.5,
    "KP.win": 8, "KP.line": 92,
    "BLK.tellHi": 0.58, "BLK.tellLo": 0.24, "BLK.part": 0.24, "BLK.favor": 1.6, "BLK.hiP": 0.5,
    "FOOT_WIN": 0.25, "WIDE": 1.30,
  };
  const got = (k) => {
    if (k === "FOOT_WIN") return K.FOOT_WIN;
    if (k === "WIDE") return K.WIDE;
    const [g, f] = k.split(".");
    return K[g][f];
  };
  const off = Object.entries(WANT).filter(([k, v]) => got(k) !== v).map(([k, v]) => `${k} ${got(k)}≠${v}`);
  check(off.length === 0,
    `D-1. 🔗 E[s] ≈ 0.5를 만든 판정 창·속도 상수 ${Object.keys(WANT).length}개가 그대로다`
    + (off.length
      ? `\n     🔴 움직인 것: ${off.join(" · ")}`
        + `\n     👉 engineer에게 **E[s] 4종 재측정**을 요청하세요 (지금 0.522/0.522/0.521/0.537은 무효입니다).`
        + `\n        설계 §4-4 ①의 ±5%p ⇔ ΔE[s] 0.132 (half(70) = 0.19)`
      : ""));
  /* 속도 폭은 배열이라 따로 */
  check(K.KP.speed[0] === 22 && K.KP.speed[1] === 34 && K.CUT.lane[0] === 26 && K.CUT.lane[1] === 74,
    `D-2. 🔗 KP.speed [22,34] · CUT.lane [26,74]도 그대로다`);

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

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
