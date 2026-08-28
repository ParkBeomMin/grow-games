/* ⚽ 더 윙어 II — (라′) 중립 검사
 *
 * 지키는 계약 한 줄:
 *   **조작 숙련도 0.5에서, 내가 카드를 여는 것과 동료가 자동으로 처리하는 것의
 *   기댓값이 같아야 한다.** (설계 §2-5 · §12-5 검사 10번)
 * 다르면 그 차이가 통째로 새 생산량이 됩니다 — 실제로 두 번 터졌어요
 * (🅰️ 전개 도움 4~6배 · 🧱 수비 실점 능력치 150에서 −9.8%).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚨 밴드가 왜 이 모양인지 — **조이지 마세요.** 조이면 상시 빨간불이 됩니다.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * designer가 §12-5에서 밴드를 ±1%p로 조였는데, **칸별로는 실행 불가능합니다.**
 * 22번 balancer가 필요 표본을 직접 계산했어요:
 *
 *   ±1%p를 1σ로 세우려면  칸당 카드 ≈ 25,000장   (그래도 32% 확률로 헛빨간불)
 *   ±1%p를 2σ로           ≈ 100,000장            (60칸이면 3칸이 헛빨간불)
 *   ±1%p를 3σ로           ≈ 220,000장
 *
 * 가장 성긴 칸(df70 ⚽ 결정)이 경기당 0.14장이라, 3σ를 칸별로 세우려면
 * **60칸에 1억 경기**가 필요합니다. 검사로 못 씁니다.
 *
 * 그래서 셋으로 나눴습니다:
 *
 *   ① 정의 검사 (표본 0)   cardP(p, a, 0.5) === p 를 **정확히** 봅니다.
 *                          개정 뒤 중립은 정의상 참이라 몬테카를로가 필요 없어요.
 *                          **이게 본체입니다.** 중심이 autoP에서 벗어나면 여기서 즉시 갈립니다.
 *   ② 배선 검사 (합산)     60칸을 **합쳐서** ±0.3%p. 카드 109만 장에서 1σ ≈ 0.047%p니까
 *                          ±0.3%p는 6σ예요. 배선이 끊기면 확실히 잡히고, 잡음으로는 안 뜹니다.
 *   ③ 칸별 검사           ±3%p (카드 ≥7,000장 · 1σ ≈ 0.6%p → 5σ).
 *                          **한 칸만 어긋나는 결함**을 잡는 자리예요 — 합산에서는
 *                          df70 ⚽ 결정 한 칸이 전체의 0.6%밖에 안 돼서 10%p가 틀려도
 *                          합산은 0.06%p만 움직입니다. 그래서 칸별이 따로 필요합니다.
 *
 * ⚠️ **②의 ±0.3%p와 ③의 ±3%p는 서로 다른 이유로 그 값입니다.** ③을 ②에 맞춰
 *    조이면 잡음을 결함으로 읽게 되고, ②를 ③에 맞춰 풀면 배선 결함을 놓칩니다.
 *    실제로 여기 있던 옛 검사가 능력치 3칸 × 3,700장에서 ±3%를 봤는데 1σ가 ±2.7%p였어요 —
 *    시드에 따라 −6.3 / +1.5 / −3.0 / −0.7 / −0.4%로 갈렸고, 게이트를 한 번 헛되이 막았습니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔬 재는 법 — 자기 자신과 비교하지 않습니다
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   관측값 : 엔진이 **실제로 연 카드**의 judge === "perfect" 비율 (몬테카를로)
 *   기댓값 : 자동 확률 식(pFinish · pConcede)을 **engine.js 소스에서 정규식으로 뜯어**
 *            new Function으로 다시 세워 밖에서 계산합니다. _t.K를 안 씁니다.
 *   그리고 그 뜯어온 식이 **진짜 자동 갈래와 맞는지**를 ⓶에서 따로 실측해 못박습니다
 *   (동료 전력을 45~95로 갈아 가며 동료 카드의 judge를 셉니다).
 *   → 식이 틀리면 ⓶가, 카드 갈래가 틀리면 ⓷·⓸가 빨간불입니다.
 *
 * 🎲 시드를 박았으니 완전히 결정론적입니다. ⏱️ 약 15초 걸려요.
 */
"use strict";
const fs = require("fs");
const { load, xiOf } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════ 산식 추출 — 못 뜯으면 그 자리에서 던집니다 ══════════
 * 조용히 못 뜯고 지나가면 "초록불인데 아무것도 안 지키는 검사"가 됩니다. */
const SRC = fs.readFileSync("/workspace/grow-games/beta/winger2/engine.js", "utf8");
const grab = (re, name) => {
  const m = SRC.match(re);
  if (!m) throw new Error(`engine.js에서 ${name}을(를) 못 뜯었어요 — 정규식을 고치세요 (조용히 넘어가면 안 됩니다)`);
  return m;
};
const P = {
  clamp: grab(/ {2}const clamp = [^\n]+\n/, "clamp")[0],
  lerp: grab(/ {2}const lerp = [^\n]+\n/, "lerp")[0],
  mid: grab(/ {2}function mid\(a\) \{[\s\S]*?\n {2}\}\n/, "mid()")[0],
  scRef: grab(/ {2}const SC_REF = mid\(70\);\n/, "SC_REF")[0],
  sc: grab(/ {2}const sc = \(ability\) => mid\(ability\) \/ SC_REF;\n/, "sc()")[0],
  FIN: grab(/ {2}const FIN = ([\d.]+);/, "FIN")[1],
  CON: grab(/ {2}const CON = ([\d.]+);/, "CON")[1],
  pFinish: grab(/ {2}const pFinish = [^\n]+\n/, "pFinish()")[0],
  pConcede: grab(/ {2}const pConcede = \(defW, ability\) => \{[\s\S]*?\n {2}\};\n/, "pConcede()")[0],
  atkW: grab(/ {4}const atkW = ([^;]+);/, "atkW")[1],
  defW: grab(/ {4}const defW = ([^;]+);/, "defW")[1],
};
/* 🔒 직접 eval을 안 씁니다 — `const`가 eval 스코프에 갇혀 값이 늘 undefined가 돼요. */
const T = new Function(`
${P.clamp}${P.lerp}${P.mid}${P.scRef}${P.sc}
  const FIN = ${P.FIN}; const CON = ${P.CON};
${P.pFinish}${P.pConcede}
  return { pFinish, pConcede, wOf: (us0, them0) => ({ atk: ${P.atkW}, def: ${P.defW} }) };
`)();

const E = load();
/* 픽스처는 teamStr = oppStr = 70이라 atkW = defW = 0.5입니다 — 소스에서 뜯은 식으로 확인해요. */
const W = T.wOf(70, 70);
check(W.atk === 0.5 && W.def === 0.5, `픽스처(전력 70:70)의 atkW/defW가 0.5다 (${W.atk} / ${W.def})`);

/* 카드 한 장의 기댓값. 🧱 수비는 P(사건)이 **막을 확률**이라 자리가 뒤집혀요. */
const expected = (kind, ab) => (kind === "defend" ? 1 - T.pConcede(W.def, ab) : T.pFinish(W.atk, ab));

/* ══════════════════════════════════════════════════════════════
 * ① 정의 검사 — 표본 0. **중립의 본체입니다.**
 *   P(사건 | 카드) = clamp(autoP + 2·half(a)·(s − 0.5), 0, 1)
 *   s = 0.5면 둘째 항이 0이라 **모든 능력치에서 정확히** autoP입니다.
 *   ε 없이 === 로 봅니다 — 근사가 아니라 항등식이에요.
 * ══════════════════════════════════════════════════════════════ */
const ABILITIES = [40, 55, 70, 90, 110, 130, 150, 190, 220];
const PROBS = [0, 0.05, 0.2, 0.35, 0.5, 0.6032, 0.8, 0.95, 1];
function definitionOff(Eng) {
  const bad = [];
  for (const a of ABILITIES) for (const p of PROBS) {
    const got = Eng.cardP(p, a, 0.5);
    if (got !== p) bad.push(`cardP(${p}, ${a}, 0.5) = ${got}`);
  }
  return bad;
}
{
  const bad = definitionOff(E);
  check(bad.length === 0,
    `① 정의 — cardP(p, a, 0.5) === p 가 ${ABILITIES.length}×${PROBS.length}칸에서 정확히 성립한다`
    + (bad.length ? ` — 어긋남 ${bad.length}칸: ${bad.slice(0, 3).join(" · ")}` : ""));

  /* 🧪 변이 — 2026-08-28 개정 **전의 그 버그**를 그대로 되돌립니다.
   * 카드의 중심을 autoP가 아니라 능력치 곡선 succ(a, s)가 정하던 형태예요.
   * 그러면 카드 갈래와 자동 갈래가 반드시 어긋납니다. */
  const M = load([[
    /const cardP = \(autoP, ability, s\) => clamp\(autoP \+ 2 \* half\(ability\) \* \(s - 0\.5\), 0, 1\);/,
    "const cardP = (autoP, ability, s) => clamp(succ(ability, s), 0, 1);",
  ]]);
  const mb = definitionOff(M);
  check(mb.length > 0,
    `①-변이. 카드의 중심을 succ(a, s)로 되돌리면 빨간불이 된다 (어긋난 칸 ${mb.length} · 예: ${mb[0] || "없음"})`);
}

/* ══════════════════════════════════════════════════════════════
 * ② 뜯어온 자동 확률 식 ↔ **진짜 자동 갈래** 실측
 *   ①·③·④는 전부 이 식을 기댓값으로 씁니다. 식이 틀리면 셋 다 거짓이 돼요.
 *   그래서 동료 전력을 45~95로 갈아 가며 **동료가 처리한 카드**의 judge를 직접 셉니다.
 *   (동료·경쟁자는 blendOf가 40~95로 clamp해서 이 폭 밖은 실측이 안 됩니다.)
 *   문턱 ±1.5%p — 칸당 카드 1만~1.7만 장에서 1σ ≈ 0.45%p니까 3.3σ예요.
 * ══════════════════════════════════════════════════════════════ */
const ANCHOR_BAND = 1.5;   // %p — 문턱. 소스에서 읽지 않습니다
{
  const off = [];
  const line = [];
  for (const str of [45, 60, 70, 80, 95]) {
    E._t.seed(909); E._t.skill = 0.5;
    let an = 0, ao = 0, dn = 0, dok = 0;
    for (let i = 0; i < 8000; i++) {
      const xi = xiOf("fw", 90, 70);
      for (const x of xi) if (!x.me) x.str = str;
      const r = E._t.playMatch({ xi, oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
      for (const c of r.cards) {
        if (c.mine) continue;
        if (c.kind === "goal" || c.kind === "assist") { an += 1; if (c.judge === "perfect") ao += 1; }
        else if (c.kind === "defend") { dn += 1; if (c.judge === "perfect") dok += 1; }
      }
    }
    const da = 100 * (ao / an - expected("goal", str));
    const dd = 100 * (dok / dn - expected("defend", str));
    line.push(`str${str} 공격 ${da >= 0 ? "+" : ""}${da.toFixed(2)} 수비 ${dd >= 0 ? "+" : ""}${dd.toFixed(2)}`);
    if (Math.abs(da) > ANCHOR_BAND) off.push(`str${str} 공격 ${da.toFixed(2)}%p`);
    if (Math.abs(dd) > ANCHOR_BAND) off.push(`str${str} 수비 ${dd.toFixed(2)}%p`);
  }
  check(off.length === 0,
    `② 뜯어온 pFinish·pConcede가 진짜 자동 갈래와 맞는다 (±${ANCHOR_BAND}%p)${off.length ? ` — 어긋남: ${off.join(", ")}` : ""}`
    + `\n     ${line.join(" · ")}  (%p)`);
}

/* ══════════════════════════════════════════════════════════════
 * ③·④ 60칸 (4포지션 × 5능력치 × 3카드종류)
 *   df는 ⚽ 결정 카드가 경기당 0.14장으로 성겨서 더 많이 굴립니다 —
 *   그래야 칸별 밴드를 쓸 수 있는 7,000장이 모여요.
 * ══════════════════════════════════════════════════════════════ */
const SUM_BAND = 0.3;      // %p — 합산 (카드 ≈109만 장 · 1σ ≈ 0.047%p → 6σ)
const CELL_BAND = 3.0;     // %p — 칸별 (카드 ≥7,000장 · 1σ ≈ 0.6%p → 5σ)
const CELL_CARDS_MIN = 7000;
const SUM_CARDS_MIN = 1000000;
const POSITIONS = ["fw", "wg", "mf", "df"];
const LEVELS = [70, 90, 110, 130, 150];
const KINDS = ["goal", "assist", "defend"];
const MATCHES = { fw: 30000, wg: 30000, mf: 30000, df: 55000 };

function sweep(Eng, positions, matches) {
  const cells = [];
  let n = 0, obs = 0, exp = 0;
  for (const pos of positions) for (const ab of LEVELS) {
    /* 내 능력치가 픽스처의 6스탯 그대로 blend에 실리는지 먼저 확인해요 —
     * 여기가 어긋나면 기댓값을 엉뚱한 능력치로 계산하게 됩니다. */
    const meRow = xiOf(pos, ab, 70).find((x) => x.me);
    if (Eng.blendOf(meRow) !== ab) throw new Error(`픽스처의 blend가 ${ab}가 아니에요 — ${Eng.blendOf(meRow)}`);
    Eng._t.seed(2026); Eng._t.skill = 0.5;
    const tally = { goal: [0, 0], assist: [0, 0], defend: [0, 0] };
    const N = matches[pos];
    for (let i = 0; i < N; i++) {
      const r = Eng._t.playMatch({ xi: xiOf(pos, ab, 70), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
      for (const c of r.cards) {
        if (!c.mine || !tally[c.kind]) continue;
        tally[c.kind][0] += 1;
        if (c.judge === "perfect") tally[c.kind][1] += 1;
      }
    }
    for (const kind of KINDS) {
      const [cn, ok] = tally[kind];
      const e = expected(kind, ab);
      cells.push({ pos, ab, kind, n: cn, dev: 100 * (ok / cn - e) });
      n += cn; obs += ok; exp += e * cn;
    }
  }
  return { cells, n, dev: 100 * (obs - exp) / n };
}

{
  const t0 = Date.now();
  const R = sweep(E, POSITIONS, MATCHES);
  const thin = R.cells.filter((c) => c.n < CELL_CARDS_MIN);
  const over = R.cells.filter((c) => Math.abs(c.dev) > CELL_BAND);
  const worst = R.cells.slice().sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev))[0];

  /* 표본이 모자라면 **그것 자체가 빨간불**이어야 해요 — 조용히 밴드를 통과하면
   * "카드가 3장인데 편차 0%p라 초록"이 됩니다. */
  check(thin.length === 0 && R.n >= SUM_CARDS_MIN,
    `표본 — 60칸 전부 카드 ≥${CELL_CARDS_MIN}장 · 합산 ≥${(SUM_CARDS_MIN / 1e6).toFixed(0)}00만 장`
    + ` (합산 ${R.n.toLocaleString("en-US")}장 · 가장 성긴 칸 ${Math.min(...R.cells.map((c) => c.n)).toLocaleString("en-US")}장`
    + `${thin.length ? ` · 모자란 칸 ${thin.map((c) => `${c.pos}${c.ab}/${c.kind}`).join(" ")}` : ""})`);

  check(Math.abs(R.dev) <= SUM_BAND,
    `③ 배선 (합산 60칸) — 가중 평균 편차 ${R.dev >= 0 ? "+" : ""}${R.dev.toFixed(4)}%p (±${SUM_BAND}%p)`);

  check(over.length === 0,
    `④ 칸별 60칸 — 전부 ±${CELL_BAND}%p 안 (최대 ${worst.pos}${worst.ab}/${worst.kind} ${worst.dev >= 0 ? "+" : ""}${worst.dev.toFixed(2)}%p · 카드 ${worst.n.toLocaleString("en-US")}장)`
    + (over.length ? `\n     넘은 칸: ${over.map((c) => `${c.pos}${c.ab}/${c.kind} ${c.dev.toFixed(2)}%p`).join(" · ")}` : ""));
  console.log(`   (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
}

/* ══════════════════════════════════════════════════════════════
 * ③-변이 — 배선이 끊기면 합산이 빨간불인가
 *   정의 검사(①)는 cardP만 봅니다. **배선**은 autoJudge가 그 cardP에
 *   *내 능력치의* autoP를 넘겨 주느냐예요 — 거기서 끊으면 ①은 초록인 채로
 *   카드 갈래만 어긋납니다. 그 결함을 잡는 게 ③입니다.
 *
 *   ⚠️ 변이 데모는 4칸만 굴려서 표본이 작아요(≈4.7만 장 · 1σ ≈ 0.23%p).
 *      그래서 여기서는 밴드를 그 표본에 맞춰 ±1.0%p로 씁니다 —
 *      **본 검사의 ±0.3%p와 다른 값인 게 맞습니다.** 표본이 다르니까요.
 * ══════════════════════════════════════════════════════════════ */
const MUT_DEMO_BAND = 1.0;   // %p — 변이 데모 전용 (표본이 작아요)
{
  const DEMO = { fw: 10000, mf: 10000, df: 10000, wg: 10000 };
  const M = load([[
    /const autoP = kind === "defend" \? 1 - pConcede\(defW, ab\) : pFinish\(atkW, ab\);/,
    'const autoP = kind === "defend" ? 1 - pConcede(defW, 70) : pFinish(atkW, 70);',
  ]]);
  const R = sweep(M, ["fw", "df"], DEMO);
  check(Math.abs(R.dev) > MUT_DEMO_BAND,
    `③-변이. autoP가 내 능력치를 안 타게 하면 합산이 빨간불이 된다`
    + ` (편차 ${R.dev >= 0 ? "+" : ""}${R.dev.toFixed(2)}%p · 카드 ${R.n.toLocaleString("en-US")}장 · 데모 밴드 ±${MUT_DEMO_BAND}%p)`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
