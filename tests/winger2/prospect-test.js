/* ⚽ 더 윙어 II — 🌱 선수 설정 (나이 축 · 성장타입 · 유망주 3택)
 *
 * 🔴 **이 파일이 생기기 전까지 `beta/winger2/prospect.js`를 보는 검사가 한 줄도 없었습니다.**
 *    engineer가 변이 아홉을 실제 소스에 넣고 돌렸는데 **일곱이 안 잡혔어요**
 *    (`54_engineer_prospect.md` §4). 잡힌 둘은 "페이지가 아예 안 뜬다"였습니다 —
 *    등록 지점은 지켜지는데 **동작을 보는 눈이 없었어요.**
 *
 *    그중 가장 뼈아픈 것: **결산 성장·노쇠를 통째로 지워도 초록불**이었습니다.
 *    `award`·`league`가 `finishYear`를 **돌리기는 하는데 능력치를 안 봅니다.**
 *
 * 여기서 메우는 일곱 (engineer §4의 A~G 순서 그대로)
 *   A 세 장의 스탯 총합이 **정확히 같은가**       (원칙 ④ — 한 장이 그냥 좋으면 선택이 아니에요)
 *   B 노쇠가 **능력치에 비례**하는가              (옛 일률 −rand(0.6,1.8)로 되돌리면 빨간불)
 *   C 리롤 상한 2회                              (게임 입구를 통해 실제 버튼을 눌러서)
 *   D 나이가 흐르는가                             (유스 해넘이 · startPrep **양쪽**)
 *   E 성장타입 3종의 곡선이 **서로 다른가**
 *   F 옛 세이브가 **회춘하지 않는가**
 *   G 결산 성장·노쇠가 **실제로 능력치를 움직이는가**  ← 지금 가장 큰 구멍
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚨 **계수는 아직 제안입니다. 절대값을 안 박습니다.**
 * ─────────────────────────────────────────────────────────────────────────
 * `AGE_GAIN 0.32` · `AGE_PEN 12` · `AGE_TRADE 0`은 balancer 실측 ③ 전이고,
 * designer가 설계 3건(나이 반대급부 · 성장타입 중립 · 은퇴 문턱)을 다시 보는 중이에요.
 * 그래서 여기서 보는 건 전부 **관계**입니다 —
 *   *"세 장이 서로 같은가"* · *"비가 정확히 2인가"* · *"오르다 꺾이는가"* · *"셋이 서로 다른가"*.
 * 상수를 바꿔도 **관계가 살아 있으면 안 걸리고, 형태가 무너지면 걸립니다.**
 * 🔗 계수 자체는 H가 **유효 조건**으로만 묶어 둡니다(33-B 방식) — 움직이면 "다시 재세요".
 *
 * 🖥️ `prospect.js`는 game.js의 전역(S · rand · STAT_DEFS · POS_INFO …)과 `WingerSquad`에
 *    기대어 있어서 **페이지째 띄워 진짜 함수를 부릅니다.** 산식을 떼어 오면 그 전역들을
 *    제가 다시 지어내게 되고, 그게 *"경로가 다른 시뮬레이터"*예요.
 *
 * ⏱️ 약 6초.
 */
"use strict";
const { bootPage, pageMutsOK } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const near = (a, b, eps) => Math.abs(a - b) <= eps;

/* 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * (안 걸리면 `bootPage`가 던져 파일이 죽어요. 이 저장소에서 세 번 난 사고입니다.) */
const MUT = {
  /* A 세 장의 총합을 제각각으로 — 원칙 ④ 정면 위반 */
  POOL_VARY: { "prospect.js": [[/stats: spread\(POOL, posKey, focus, shapeKey\),/,
    "stats: spread(POOL + i * 18, posKey, focus, shapeKey),"]] },
  /* B·G 나이곡선을 능력치에서 떼어 냄 — 성장도 노쇠도 사라집니다.
   * (2026-08-29 재구조화: `S.stats`가 **정점 기준값**이 되고 `nowStats`가 곡선을 곱해요.
   *  옛 `growthDelta`/`AGE_GAIN`이 사라진 자리라 변이도 그 형태를 따라갑니다.) */
  NO_CURVE: { "prospect.js": [[/ {4}for \(const k of keys\) out\[k\] = \(src\[k\] == null \? mean : src\[k\]\) \* c;/,
    "    for (const k of keys) out[k] = (src[k] == null ? mean : src[k]);"]] },
  /* D 🔴 birthday를 proYear 뒤로 되돌림 — 2026-08-29에 났던 그 결함 */
  OLD_ORDER: { "career.js": [[/ {4}WingerProspect\.birthday\(S\);\n {4}S\.proYear \+= 1;/,
    "    S.proYear += 1;\n    WingerProspect.birthday(S);"]] },
  /* C 리롤 무제한으로 되돌림 */
  REROLL_INF: { "prospect.js": [[/const REROLL_MAX = 2;/, "const REROLL_MAX = 999;"]] },
  /* D-1 유스 해넘이에서 나이를 안 먹음 · D-2 startPrep에서 안 먹음 */
  NO_BDAY_YOUTH: { "game.js": [[/ {4}WingerProspect\.birthday\(S\);/, "    /* 나이 안 먹음 */"]] },
  NO_BDAY_PRO: { "career.js": [[/ {4}WingerProspect\.birthday\(S\);/, "    /* 나이 안 먹음 */"]] },
  /* 38 🔴 **계단의 짝을 지움** — 짝이 없으면 계단의 불균형이 그대로 드러납니다 */
  NEUTRAL_OFF: { "prospect.js": [[/const TRAIN_NEUTRAL = \{[^}]*\};/,
    "const TRAIN_NEUTRAL = { early: 1, normal: 1, late: 1 };"]] },
  /* 38 🔴 **트레이드오프 손잡이로 부활** — 짝 위에 세기 배수를 또 얹습니다.
   * (`train` 칸이 사라졌으니 **이름으로는 못 잡아요** — 형태로 잡습니다) */
  BLOOM: { "prospect.js": [[/ {4}return \(n == null \? 1 : n\) \* trainStep\(ageOf\(st\), peakAgeOf\(st\)\);/,
    "    const bloom = { early: 1.18, normal: 1, late: 0.86 }[t.id] || 1;\n"
    + "    return bloom * (n == null ? 1 : n) * trainStep(ageOf(st), peakAgeOf(st));"]] },
  /* E 조숙 곡선을 보통과 같게 — 성장타입 선택이 무의미해짐 */
  SAME_CURVE: { "prospect.js": [[/ {4}return pieceAt\(g\.pts, a - \(shift \|\| 0\)\);/,
    "    return pieceAt(NORMAL.pts, a - (shift || 0));"]] },
  /* F 옛 세이브가 18세로 회춘 — 나이 되짚기 제거 */
  NO_BACKFILL: { "prospect.js": [[/ {4}const youth = Math\.max\(0, \(S0\.year \|\| 1\) - 1\);\n {4}const pro = Math\.max\(0, S0\.proYear \|\| 0\);\n {4}return START_AGE \+ youth \+ pro;/,
    "    return START_AGE;"]] },

};

/* ══════════════════════════════════════════════════════════════
 * 🔎 0. 변이 정규식이 지금 소스에 걸리나 — 다른 무엇보다 먼저
 * ══════════════════════════════════════════════════════════════ */
{
  const bad = pageMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 beta/winger2/에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}

const W = bootPage();
const P = W.WingerProspect;
check(!!P && W.__errs.length === 0,
  `페이지가 오류 없이 뜨고 WingerProspect가 있다${W.__errs.length ? ` — ${W.__errs[0]}` : ""}`);

/* 세이브 하나 만들기 — 진짜 기본값 모양으로 (직접 손으로 세우지 않아요) */
const mkSave = (over) => Object.assign({
  age: 20, growthType: "normal", peakShift: 0, year: 1, proYear: 1,
  stats: { shoot: 60, pass: 60, dribble: 60, defense: 60, stamina: 60, speed: 60 },
  talents: { shoot: 1, pass: 1, dribble: 1, defense: 1, stamina: 1, speed: 1 },
}, over || {});

/* ══════════════════════════════════════════════════════════════
 * A. 🃏 **세 장의 스탯 총합이 정확히 같다** (원칙 ④)
 *
 * 한 장이 그냥 좋으면 **선택이 아니라 정답**이 됩니다. 카드 3택의 존재 이유가 사라져요.
 * 🚨 `POOL`(194)을 소스에서 읽지 않습니다 — *"세 장이 서로 같은가"*만 보면
 *    상수를 바꿔도 관계가 지켜지는지 그대로 잡혀요 (§10-3의 그 규칙).
 * ══════════════════════════════════════════════════════════════ */
const MARKETS = Object.keys(P._t.YOUTH_FOCUS);
const POSES = Object.keys(W.__get("POS_INFO"));
function sumsOf(Pr, rolls) {
  const bad = [];
  let n = 0, minS = Infinity, maxS = -Infinity;
  for (let i = 0; i < rolls; i++) {
    const m = MARKETS[i % MARKETS.length], pos = POSES[i % POSES.length];
    const r = Pr.rollCards(m, pos);
    const tot = r.cards.map((c) => Object.values(c.stats).reduce((a, b) => a + b, 0));
    minS = Math.min(minS, ...tot); maxS = Math.max(maxS, ...tot);
    n += 1;
    if (new Set(tot).size !== 1) bad.push(`${m}/${pos}: [${tot.join(", ")}]`);
  }
  return { bad, n, minS, maxS };
}
{
  const r = sumsOf(P, 1200);
  check(r.bad.length === 0,
    `A-1. 🃏 세 장의 스탯 총합이 **정확히 같다** — ${r.n}판 × ${MARKETS.length}유스 × ${POSES.length}포지션`
    + ` (총합 ${r.minS}~${r.maxS})`
    + (r.bad.length ? `\n     🔴 다른 판 ${r.bad.length}개: ${r.bad.slice(0, 2).join(" · ")}` : ""));

  /* ⭐ 잠재력도 세 장이 공유해야 합니다 — 장마다 굴리면 재능만으로 한 장이 좋아져요 */
  let tBad = 0;
  for (let i = 0; i < 300; i++) {
    const rr = P.rollCards(MARKETS[i % MARKETS.length], POSES[i % POSES.length]);
    if (rr.talents && Array.isArray(rr.talents) && rr.talents.length > 1
      && new Set(rr.talents.map((t) => JSON.stringify(t))).size !== 1) tBad += 1;
  }
  check(tBad === 0, `A-2. ⭐ 잠재력은 세 장이 **공유**한다 (장마다 굴리면 재능만으로 한 장이 좋아져요)`);

  /* 그리고 세 장이 **서로 달라야** 합니다 — 총합만 같고 똑같으면 그것도 선택이 아니에요 */
  let sameShape = 0;
  for (let i = 0; i < 300; i++) {
    const rr = P.rollCards(MARKETS[i % MARKETS.length], POSES[i % POSES.length]);
    const sig = rr.cards.map((c) => JSON.stringify(c.stats));
    if (new Set(sig).size !== rr.cards.length) sameShape += 1;
  }
  check(sameShape === 0, `A-3. 🃏 총합은 같아도 **분포는 서로 다르다** (같으면 고를 이유가 없어요)`);

  /* 🧪 변이 — 총합을 제각각으로 */
  const MW = bootPage({ muts: MUT.POOL_VARY["prospect.js"] ? MUT.POOL_VARY : null });
  const mr = sumsOf(MW.WingerProspect, 40);
  check(mr.bad.length > 0,
    `A-변이. 세 장의 총합을 제각각으로 만들면 → 빨간불 (${mr.bad.length}/${mr.n}판이 다름 · 예 ${mr.bad[0]})`);
  MW.close();
}

/* ══════════════════════════════════════════════════════════════
 * B. 📉 **지금 실력 = 정점 기준값 × 나이곡선** (2026-08-29 재구조화)
 *
 * 🔄 구조가 바뀌었습니다 — 옛 `growthDelta`(결산마다 `S.stats`를 깎던 것)가 사라지고,
 *    `S.stats`는 **정점 기준값**으로 굳고 `nowStats`가 나이곡선을 곱해 지금 실력을 냅니다.
 *    NPC(`squad.js`)와 같은 모델이 됐어요 — designer ⓑ안입니다.
 *
 * 🚨 그래도 지켜야 하는 **관계는 그대로**예요:
 *    노쇠가 **능력치에 비례**해야 합니다. 옛 일률(−rand(0.6,1.8))은 40이든 130이든
 *    똑같이 깎았어요. 비례면 **많이 가진 사람이 많이 잃습니다.**
 *    상수를 안 읽고도 잡히는 형태: **120의 지금 실력 ÷ 60의 지금 실력 = 정확히 2**.
 * ══════════════════════════════════════════════════════════════ */
function nowRatio(Pr, age) {
  const mk = (v) => Pr.nowStats({ age, growthType: "normal", peakShift: 0,
    stats: { shoot: v, pass: v, dribble: v, defense: v, stamina: v, speed: v } }).shoot;
  const a = mk(60), b = mk(120);
  return { a, b, ratio: a === 0 ? NaN : b / a, curve: Pr.curveAt("normal", age, 0) };
}
{
  const peak = P.peakAgeOf(mkSave({ growthType: "normal" }));
  const old = nowRatio(P, 34), young = nowRatio(P, 20), atPeak = nowRatio(P, peak);
  check(near(old.ratio, 2, 1e-9) && near(young.ratio, 2, 1e-9),
    `B-1. 📉 지금 실력이 **정점 기준값에 정확히 비례**한다 — 120 ÷ 60 = ${old.ratio.toFixed(6)} (정확히 2)`
    + `\n     👉 많이 가진 사람이 많이 잃어요. 옛 일률(−rand(0.6,1.8))이면 비가 1이 아니게 됩니다`);
  check(atPeak.a > old.a && atPeak.a > young.a,
    `B-2. 📉 **정점(${peak}세)에서 가장 높고 그 앞뒤로 낮다** — 20세 ${young.a.toFixed(1)} · ${peak}세 ${atPeak.a.toFixed(1)} · 34세 ${old.a.toFixed(1)}`);
  check(near(atPeak.curve, 1, 1e-9),
    `B-3. 📉 정점의 곡선값이 **정확히 1**이다 — S.stats가 "정점 기준값"이라는 뜻이에요 (${atPeak.curve.toFixed(6)})`);
  /* 옛 세이브에 없는 스탯 칸은 **나머지 평균**으로 채워야 해요 (`|| 0`이면 갑자기 약해집니다) */
  const partial = P.nowStats({ age: peak, growthType: "normal",
    stats: { shoot: 80, pass: 80, dribble: 80, defense: 80, stamina: 80 } });   // speed 없음
  check(near(partial.speed, 80, 1e-6),
    `B-4. 📉 없는 스탯 칸을 **나머지 평균**으로 채운다 (speed 없는 옛 세이브 → ${partial.speed.toFixed(2)}) — || 0이면 0이 됩니다`);

  const MW = bootPage({ muts: MUT.NO_CURVE });
  const m = nowRatio(MW.WingerProspect, 34);
  check(!(m.a < 60 * 0.999),
    `B-변이. 나이곡선을 지금 실력에서 떼면 → 빨간불 (34세인데 60이 그대로 ${m.a.toFixed(2)} — 노쇠가 사라졌어요)`);
  MW.close();
}

/* ══════════════════════════════════════════════════════════════
 * E. 📈 **성장타입 3종의 곡선이 서로 다르다**
 *
 * ⚠️ designer가 성장타입 중립(만성이 두 축 모두에서 이김)을 다시 보는 중이라
 *    **값 기반 검사는 안 만듭니다.** 셋이 **서로 다른가**와 **정점 나이 순서**만 봐요 —
 *    구조가 바뀌어도 이 둘은 성립해야 합니다.
 * ══════════════════════════════════════════════════════════════ */
function curveSig(Pr) {
  const ids = Pr.GROWTH_TYPES.map((g) => g.id);
  const at = (id) => [18, 22, 27, 31, 35, 38].map((a) => Pr.curveAt(id, a, 0));
  return { ids, sig: ids.map(at) };
}
{
  const { ids, sig } = curveSig(P);
  const uniq = new Set(sig.map((v) => v.map((x) => x.toFixed(4)).join(","))).size;
  check(uniq === ids.length,
    `E-1. 📈 성장타입 ${ids.length}종의 곡선이 **서로 다르다** (${ids.join(" / ")})`
    + `\n     ${ids.map((id, i) => `${id} [${sig[i].map((v) => v.toFixed(2)).join(" ")}]`).join("\n     ")}`);
  /* 정점 나이 순서 — 조숙 < 보통 < 만성. 이름이 뜻하는 바예요 */
  const peaks = ids.map((id) => P.peakAgeOf(mkSave({ growthType: id })));
  check(peaks[0] < peaks[1] && peaks[1] < peaks[2],
    `E-2. 📈 정점 나이가 **조숙 < 보통 < 만성** (${ids.map((id, i) => `${id} ${peaks[i]}세`).join(" · ")})`);
  /* 🔄 2026-08-29 재구조화 — **훈련 배수(`train`)가 폐기됐습니다.**
   * 이제 상쇄 장치는 **곡선의 교차** 하나예요: 조숙은 어릴 때 높고 늙어서 낮고,
   * 만성은 그 반대. 어느 한 타입이 두 끝 모두에서 이기면 **좋은 타입이 생깁니다**
   * (engineer §2-②가 잡았던 그 문제). 그래서 **부등호가 뒤집히는지**를 봅니다. */
  const young18 = ids.map((id) => P.curveAt(id, 18, 0));
  const old38 = ids.map((id) => P.curveAt(id, 38, 0));
  check(young18[0] > young18[1] && young18[1] > young18[2]
    && old38[2] > old38[1] && old38[1] > old38[0],
    `E-3. 📈 **곡선이 교차한다** — 18세는 조숙>보통>만성 [${young18.map((v) => v.toFixed(2)).join(" ")}] ·`
    + ` 38세는 만성>보통>조숙 [${old38.map((v) => v.toFixed(2)).join(" ")}]`
    + `\n     👉 한 타입이 **두 끝 모두에서 이기면** 좋은 타입이 생깁니다 (engineer §2-②의 그 자리예요)`);
  /* 셋 다 정점에서 정확히 1 — `S.stats`가 "정점 기준값"이라는 뜻이 세 타입에 똑같이 서야 해요 */
  const peakVals = P.GROWTH_TYPES.map((g) => P.curveAt(g.id, g.peak, 0));
  check(peakVals.every((v) => near(v, 1, 1e-9)),
    `E-4. 📈 세 타입 모두 **정점의 곡선값이 정확히 1** (${peakVals.map((v) => v.toFixed(4)).join(" / ")})`
    + ` — 안 그러면 같은 총합의 카드가 타입만으로 세집니다`);

  const MW = bootPage({ muts: MUT.SAME_CURVE });
  const m = curveSig(MW.WingerProspect);
  check(new Set(m.sig.map((v) => v.join(","))).size < m.ids.length,
    `E-변이. 곡선 셋을 같게 만들면 → 빨간불 (서로 다른 곡선 ${new Set(m.sig.map((v) => v.join(","))).size}종)`);
  MW.close();
}

/* ══════════════════════════════════════════════════════════════
 * F. 👴 **옛 세이브가 회춘하지 않는다**
 *
 * `S.age` 칸이 없는 세이브는 `year`·`proYear`로 되짚어야 해요.
 * 회춘하면 노쇠가 통째로 사라지고 은퇴가 안 옵니다 — **마이그레이션 없이** 읽는 쪽이 채웁니다.
 * ══════════════════════════════════════════════════════════════ */
function backfill(Pr) {
  return {
    old: Pr.ageOf({ year: 3, proYear: 12 }),          // 유스 2년 + 프로 12시즌
    mid: Pr.ageOf({ year: 1, proYear: 5 }),
    fresh: Pr.ageOf({}),
    explicit: Pr.ageOf({ age: 29, year: 3, proYear: 12 }),
  };
}
{
  const b = backfill(P);
  const START = P.START_AGE;
  check(b.old === START + 2 + 12,
    `F-1. 👴 {year:3, proYear:12} → **${b.old}세** (시작 ${START} + 유스 2 + 프로 12) — 회춘 안 해요`);
  check(b.mid === START + 0 + 5 && b.fresh === START,
    `F-2. 👴 {year:1, proYear:5} → ${b.mid}세 · 빈 세이브 → ${b.fresh}세 (기본값)`);
  check(b.explicit === 29,
    `F-3. 👴 age 칸이 있으면 **그걸 그대로** 쓴다 (${b.explicit}세) — 되짚기가 덮어쓰지 않아요`);
  check(b.old > b.mid && b.mid > b.fresh,
    `F-4. 👴 오래 한 세이브일수록 나이가 많다 (${b.fresh} < ${b.mid} < ${b.old})`);

  const MW = bootPage({ muts: MUT.NO_BACKFILL });
  const m = backfill(MW.WingerProspect);
  check(m.old === START,
    `F-변이. 되짚기를 지우면 → 빨간불 (12시즌 세이브가 **${m.old}세로 회춘**합니다)`);
  MW.close();
}

/* ══════════════════════════════════════════════════════════════
 * C. 🎲 **리롤 상한 2회** — 게임 입구를 통해 실제 버튼을 눌러서
 *
 * 무제한 리롤은 **"타고난 것"을 지웁니다** — 마음에 들 때까지 돌리면 카드 3택이
 * 선택이 아니라 대기 시간이 돼요. 그래서 상한이 이 기능의 절반입니다.
 * 🖱️ 실기기 순서(pointerdown → pointerup → click)로 누릅니다.
 * ══════════════════════════════════════════════════════════════ */
function toProspect(win) {
  const $ = (id) => win.document.getElementById(id);
  const press = (el) => {
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = win.PointerEvent || win.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  press($("btn-new"));
  press(win.document.querySelector("#agency-list button, .agency-card, [data-market]"));
  press(win.document.querySelector("[data-pos]"));
  return { $, press, active: () => (win.document.querySelector(".screen.active") || {}).id };
}
{
  const { $, press, active } = toProspect(W);
  check(active() === "screen-prospect" && W.document.querySelectorAll(".prospect-card").length === 3,
    `C-1. 🎲 새 게임 → 에이전시 → 포지션 → **유망주 3택**에 도달한다 (${active()} · 카드 ${W.document.querySelectorAll(".prospect-card").length}장)`);

  const rb = $("btn-prospect-reroll");
  const sig = () => Array.from(W.document.querySelectorAll(".prospect-card")).map((b) => b.textContent).join("|");
  const before = sig();
  check(!!rb && !rb.disabled && /2/.test(rb.textContent),
    `C-2. 🎲 리롤 버튼이 **2회 남음**으로 시작한다 ("${rb ? rb.textContent : "없음"}")`);
  press(rb);
  const after1 = sig();
  check(after1 !== before, `C-3. 🎲 리롤을 누르면 세 명이 **실제로 새로 뽑힌다**`);
  check(!rb.disabled && /1/.test(rb.textContent), `C-4. 🎲 한 번 쓰면 1회 남음 ("${rb.textContent}")`);
  press(rb);
  check(rb.disabled, `C-5. 🎲 **두 번 쓰면 잠긴다** ("${rb.textContent}" · disabled ${rb.disabled})`);
  const after2 = sig();
  press(rb);
  check(sig() === after2, `C-6. 🎲 잠긴 뒤에 눌러도 **안 바뀐다** (무제한으로 새는 길이 없어요)`);

  /* 🧪 변이 — 무제한으로 되돌리면 두 번 써도 안 잠깁니다 */
  const MW = bootPage({ muts: MUT.REROLL_INF });
  const m = toProspect(MW);
  const mrb = m.$("btn-prospect-reroll");
  m.press(mrb); m.press(mrb);
  check(!mrb.disabled,
    `C-변이. 리롤을 무제한(999)으로 되돌리면 → 빨간불 (두 번 쓰고도 disabled ${mrb.disabled} · "${mrb.textContent}")`);
  MW.close();
}

/* ══════════════════════════════════════════════════════════════
 * D · G. 🎂 나이가 흐르는가 · 📊 결산 성장·노쇠가 **능력치를 움직이는가**
 *
 * 🔴 **G가 지금 가장 큰 구멍이었습니다.** `award`·`league` 검사가 `finishYear`를
 *    돌리기는 하는데 **능력치를 안 봐서**, 결산 성장·노쇠를 통째로 지워도 초록불이었어요.
 *
 * ⚠️ `finishYear`·`startPrep`은 `career.js` IIFE 안에 있어 밖에서 못 부릅니다.
 *    그래서 **`_t`에 이름만 더하는 접근용 변이**를 씁니다 — 동작은 한 글자도 안 바꿔요.
 *    (산식을 떼어 오면 그 전역들을 제가 다시 지어내게 됩니다.)
 * ══════════════════════════════════════════════════════════════ */
const EXPOSE = { "career.js": [[/ {6}state: \(\) => S,/, "      state: () => S, finishYear, startPrep,"]] };
const FX = (() => {
  const fs2 = require("fs");
  const src = fs2.readFileSync("/workspace/grow-games/beta/_fixtures.js", "utf8");
  const m = src.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
  const F = m ? new Function(`return ${m[1]};`)() : null;
  return F && F.items.find((x) => x.id === "winger2-match");
})();
if (!FX) { console.log("❌ winger2 확인용 세이브를 못 찾았어요 (beta/_fixtures.js)"); process.exit(1); }

function openSave(extraMuts) {
  const muts = Object.assign({}, EXPOSE);
  for (const [f, list] of Object.entries(extraMuts || {})) {
    muts[f] = (muts[f] || []).concat(list);
  }
  const win = bootPage({ muts, keys: FX.keys });
  win.document.getElementById("btn-continue").click();
  const go = win.document.querySelector(".slot-modal .slot-go");
  if (go) go.click();
  return win;
}
/* 20시즌을 굴려 능력치 합의 궤적을 뽑습니다 — 진짜 finishYear·startPrep을 부릅니다. */
function trajectory(win, seasons) {
  const CT = win.WingerCareer._t, S0 = CT.state();
  S0.age = 20;                                  // 출발선을 못박아요 (되짚기와 섞이지 않게)
  /* `finishYear`는 끝나면서 `S.activity`를 비웁니다(다음 시즌 준비). 여러 시즌을 이어
   * 굴리려면 **그 시즌의 활동 기록**을 다시 놓아 줘야 해요 — 픽스처가 들고 있던 모양
   * 그대로 복사해 씁니다. 제가 지어낸 모양이 아니라 **디스크에서 온 모양**이에요. */
  const ACT = JSON.parse(JSON.stringify(S0.activity || {}));
  /* 🔄 `S.stats`는 이제 **정점 기준값**이라 나이로 안 움직여요. 궤적은 `nowStats`에 있습니다. */
  const sum = () => Object.values(win.WingerProspect.nowStats(S0)).reduce((a, b) => a + b, 0);
  const out = [{ age: win.WingerProspect.ageOf(S0), sum: sum() }];
  for (let i = 0; i < seasons; i++) {
    S0.activity = JSON.parse(JSON.stringify(ACT));
    CT.finishYear();
    CT.startPrep();
    out.push({ age: win.WingerProspect.ageOf(S0), sum: sum() });
  }
  return out;
}
{
  /* ── D. 🎂 나이가 흐르는가 ── */
  const w1 = openSave();
  const CT1 = w1.WingerCareer._t, S1 = CT1.state();
  S1.age = 24;
  const a0 = w1.WingerProspect.ageOf(S1);
  CT1.startPrep();
  const a1 = w1.WingerProspect.ageOf(S1);
  check(a1 === a0 + 1,
    `D-1. 🎂 시즌이 넘어가면 나이가 **정확히 +1** (${a0} → ${a1})`);

  const MW = openSave(MUT.NO_BDAY_PRO);
  const S2 = MW.WingerCareer._t.state();
  S2.age = 24;
  MW.WingerCareer._t.startPrep();
  check(MW.WingerProspect.ageOf(S2) === 24,
    `D-변이. startPrep에서 나이를 안 먹게 하면 → 빨간불 (${MW.WingerProspect.ageOf(S2)}세 그대로)`);
  MW.close();

  /* 🎂 **age 칸이 없는 옛 세이브** — 여기가 2026-08-29에 결함이 나온 자리예요.
   *
   * 🔴 예전에는 `startPrep`이 `proYear`를 올린 **뒤에** `birthday`를 불렀는데,
   *    `ageOf`의 되짚기(`START_AGE + 유스 + proYear`)가 그 `proYear`를 다시 세서
   *    **한 시즌에 두 살**을 먹었습니다 (21 → 23).
   *
   * ⚠️ **손으로 그 순서를 재현하지 않습니다.** 고침이 "순서 바꾸기"라 재현본은
   *    고친 뒤에도 옛 순서를 그대로 돌려서 **영영 빨간불**이 돼요 —
   *    검사가 코드가 아니라 제 재현본을 재게 됩니다.
   *    **진짜 `startPrep`을 부릅니다** (게임 입구를 통해). */
  const wOld = openSave();
  const CTo = wOld.WingerCareer._t, So = CTo.state();
  delete So.age;                                  // 옛 세이브 모양으로
  const Po = wOld.WingerProspect;
  const o0 = Po.ageOf(So);
  CTo.startPrep();
  const o1 = Po.ageOf(So);
  CTo.startPrep();
  const o2 = Po.ageOf(So);
  check(o1 === o0 + 1 && o2 === o0 + 2,
    `D-2. 🎂 **age 칸이 없는 옛 세이브도** 진짜 startPrep에서 한 시즌에 한 살만 먹는다`
    + ` (${o0} → ${o1} → ${o2})`
    + (o1 === o0 + 1 ? "" :
      `\n     🔴 **한 시즌에 ${o1 - o0}살입니다.** startPrep이 proYear를 올린 뒤 birthday를 부르면`
      + `\n        ageOf의 되짚기가 그 proYear를 다시 셉니다 — birthday를 **먼저** 부르세요`));
  wOld.close();

  /* 🧪 변이 — 순서를 옛날로 되돌리면 두 살을 먹어야 합니다.
   * (재현본이 아니라 **진짜 startPrep**이 두 살을 먹는지 봅니다.) */
  const wRev = openSave(MUT.OLD_ORDER);
  const CTr = wRev.WingerCareer._t, Sr = CTr.state();
  delete Sr.age;
  const r0 = wRev.WingerProspect.ageOf(Sr);
  CTr.startPrep();
  const r1 = wRev.WingerProspect.ageOf(Sr);
  check(r1 !== r0 + 1,
    `D-2-변이. birthday를 proYear 뒤로 되돌리면 → 빨간불 (${r0} → **${r1}**, 한 시즌에 ${r1 - r0}살)`);
  wRev.close();

  /* 🔁 그리고 **순서에 기대지 않는 형태**로 한 번 더 못박습니다.
   * `birthday`가 나이 칸을 확정하고 나면, 그 뒤에 시즌 번호를 어떻게 올리든
   * 나이는 안 움직여야 해요. 이 불변식이 서 있으면 **어느 순서로 불러도 안전**합니다 —
   * `game.js`의 유스 해넘이(`S.year += 1` · `birthday`)도 같은 자리에 있어요. */
  const P1 = P;
  const st = { year: 3, proYear: 1 };              // age 칸 없음
  const b0 = P1.ageOf(st);
  P1.birthday(st);
  const b1 = P1.ageOf(st);
  st.proYear += 1; st.year += 1;                   // 그 뒤 시즌·연차가 올라가도
  const b2 = P1.ageOf(st);
  check(b1 === b0 + 1 && b2 === b1,
    `D-3. 🎂 birthday가 나이 칸을 확정한 뒤에는 **시즌 번호가 나이에 안 닿는다**`
    + ` (${b0} → ${b1} → 시즌+1·연차+1 뒤에도 ${b2})`
    + `\n     👉 이 불변식이 서 있으면 **birthday를 어느 순서로 불러도 안전**해요 —`
    + ` 유스 해넘이(game.js)도 같은 자리입니다`);
  w1.close();
}
{
  /* ── G. 📊 **20시즌 궤적이 오르다 꺾이는가** ──
   * 🔴 engineer가 "결산 성장·노쇠를 통째로 제거"해도 **아무도 안 잡았던** 자리예요.
   *    `award`·`league`가 `finishYear`를 돌리기는 하는데 **능력치를 안 봅니다.**
   *    재구조화 뒤에는 궤적이 `nowStats`에 있으니 거기를 봅니다 —
   *    진짜 `finishYear`·`startPrep`을 돌려 나이를 흘리고, 그 나이의 지금 실력을 잽니다. */
  const wg = openSave();
  const win2Retire = wg.WingerProspect.RETIRE_AGE;
  const tr = trajectory(wg, 20);
  const sums = tr.map((x) => x.sum);
  const peakAt = sums.indexOf(Math.max(...sums));
  const moved = Math.max(...sums) - Math.min(...sums);
  check(moved > 1,
    `G-1. 📊 20시즌을 굴리면 지금 실력이 **실제로 움직인다** (합 ${Math.min(...sums).toFixed(1)} ~ ${Math.max(...sums).toFixed(1)})`);
  check(peakAt > 0 && peakAt < sums.length - 1,
    `G-2. 📊 궤적이 **오르다 꺾인다** — ${tr[peakAt].age}세에 정점 (${peakAt}시즌째)`
    + `\n     ${tr.filter((_, i) => i % 4 === 0).map((x) => `${x.age}세 ${x.sum.toFixed(0)}`).join(" → ")}`);
  check(sums[sums.length - 1] < Math.max(...sums),
    `G-3. 📊 마지막에는 정점보다 낮다 (${sums[sums.length - 1].toFixed(1)} < ${Math.max(...sums).toFixed(1)}) — 노쇠가 살아 있어요`);
  const ages = tr.map((x) => x.age);
  check(ages.every((a, i) => i === 0 || a === ages[i - 1] + 1),
    `G-4. 🎂 20시즌 내내 한 해에 한 살씩 (${ages[0]} → ${ages[ages.length - 1]}세)`
    + `\n     ⚠️ ${win2Retire}세를 넘겨 굴린 건 **궤적을 보려고 은퇴 화면을 안 거친** 것이지`
    + ` 은퇴가 안 걸린다는 뜻이 아니에요 (mustRetire는 H-5가 봅니다)`);
  wg.close();

  const MW = openSave(MUT.NO_CURVE);
  const mt = trajectory(MW, 20).map((x) => x.sum);
  const mMoved = Math.max(...mt) - Math.min(...mt);
  check(!(mMoved > 1),
    `G-변이. 나이곡선을 지금 실력에서 떼면 → 빨간불 (20시즌 동안 합 변화 ${mMoved.toFixed(2)})`);
  MW.close();
}

/* ══════════════════════════════════════════════════════════════
 * 38. 🏋️ **훈련 총량이 세 성장타입에서 같다** — 형태로 폐기 (§2-10)
 *
 * 🔴 engineer가 되돌려 확인한 자리예요. 성장타입별 훈련 배수를 **이름만 바꿔** 부활시키면
 *    (`train` → `bloom`) 아무도 안 잡았습니다. `train` 칸이 사라졌으니 **이름으로는 못 잡아요.**
 *
 * ⚠️ **2026-08-29 저녁, 이 검사를 한 번 다시 썼습니다.** 처음엔
 *    *"훈련 효율은 정점으로부터의 거리만 본다"*로 잡았는데, 그 형태를 **설계가 의도적으로
 *    떠났습니다** — engineer가 `TRAIN_NEUTRAL`(조숙 1.226 · 보통 1.000 · 만성 0.839)을
 *    되살렸어요. 만들자마자 제 검사가 빨간불을 냈고, **소스를 읽어 보니 회귀가 아니라 판단**이었습니다.
 *
 *    ┌ 지운 것: *"조숙은 훈련이 빠르다"* 라는 **세기 손잡이** (`train`)
 *    └ 되살린 것: 계단의 **짝** — 손으로 고른 값이 아니라 계단에서 **역산한 종속값**
 *         TRAIN_NEUTRAL[t] = Σ trainStep(a, peak(보통)) ÷ Σ trainStep(a, peak(t))
 *
 *    계단(1.1 / 1.0 / 0.7 / 0.45)이 **정점 기준**이라 정점이 이른 타입은 계단을 일찍
 *    내려갑니다 — 짝이 없으면 훈련 총량이 **81.5 / 100 / 119.2**로 갈려요.
 *    상쇄되고 있던 게 아니라 **상쇄하고 있던** 것이었습니다.
 *
 * 🚨 그래서 검사가 봐야 하는 형태는 *"거리만 본다"*가 아니라 **"총량이 같다"**입니다.
 *      · 세기 손잡이가 어떤 이름으로 돌아와도 → 총량이 갈림 → 빨간불
 *      · 계단·정점을 바꾸고 **역산을 안 하면** → 총량이 갈림 → 빨간불
 *        (소스 주석이 *"바꾸면 여기를 다시 역산해야 해요"*라고 적어 둔 그 자리예요)
 *      · 제대로 역산한 새 값은 → 통과 (**눈금을 박지 않았으니** 구조가 바뀌어도 살아남습니다)
 * ══════════════════════════════════════════════════════════════ */
/* 배 — 세 타입 훈련 총량의 최대/최소 비. engineer 58번 규격 ≤3%.
 * ⚠️ 재는 자는 **최대 ÷ 최소**입니다 (engineer 58번은 다른 눈금으로 0.01% / 18.90%라고 적었어요 —
 *    가리키는 현상은 같습니다). 실측 **1.0002배** · `TRAIN_NEUTRAL`을 1.0으로 되돌리면 **1.462배**.
 * 밴드 3%는 balancer가 계단 눈금을 재조정할 때의 반올림 여유예요 —
 * 기준선에서 150배 위, 잡아야 할 것(1.462)에서 15배 아래입니다. */
const TRAIN_BAND = 1.03;
const CAREER_AGES = [20, 37];   // 데뷔 ~ 은퇴 직전. 총량을 재는 구간이에요
function trainTotals(Pr) {
  return Pr.GROWTH_TYPES.map((g) => {
    let sum = 0;
    for (let a = CAREER_AGES[0]; a <= CAREER_AGES[1]; a++) {
      sum += Pr.trainMul({ age: a, growthType: g.id, peakShift: 0 });
    }
    return { id: g.id, name: g.name, sum };
  });
}
{
  const T = trainTotals(P);
  const vals = T.map((x) => x.sum);
  const ratio = Math.max(...vals) / Math.min(...vals);
  check(ratio <= TRAIN_BAND,
    `38-1. 🏋️ **훈련 총량이 세 타입에서 같다** (${CAREER_AGES[0]}~${CAREER_AGES[1]}세) — `
    + T.map((x) => `${x.name} ${x.sum.toFixed(3)}`).join(" · ")
    + ` · 최대/최소 **${ratio.toFixed(4)}배** (≤${TRAIN_BAND})`
    + `\n     👉 여기가 갈리면 성장타입이 **세기 손잡이**가 됩니다 — 트레이드오프는 곡선이 맡아요`);

  /* ── 38-2. 🏋️ **계단은 거리만 본다** — 등식이 아니라 **비가 일정한가**로 ──
   *
   * ⚠️ 타입별 **상수**는 허용합니다(그게 `TRAIN_NEUTRAL`이에요). 안 되는 건
   *    **계단 자체가 타입을 보는 것**입니다. 그러면 같은 거리인데 타입마다 모양이 달라져요.
   *    그래서 `trainMul(t, 정점+d) ÷ trainMul(보통, 26+d)`가 **d와 무관하게 한 값**이어야 합니다.
   *    (등식으로 잡으면 상수가 되살아난 지금 세계에서는 성립할 수 없어요 — §5 참고) */
  const peakOf = (id) => P.GROWTH_TYPES.find((g) => g.id === id).peak;
  const DIST = [-8, -6, -4, -2, -1, 0, 1, 2, 3, 5, 7, 9];
  const rOff = [];
  const rShow = [];
  for (const g of P.GROWTH_TYPES) {
    const rs = DIST.map((d) => P.trainMul({ age: peakOf(g.id) + d, growthType: g.id, peakShift: 0 })
      / P.trainMul({ age: peakOf("normal") + d, growthType: "normal", peakShift: 0 }));
    const uniq = new Set(rs.map((v) => v.toFixed(9)));
    rShow.push(`${g.name} ${rs[0].toFixed(3)}${uniq.size === 1 ? "" : ` (${uniq.size}종!)`}`);
    if (uniq.size !== 1) rOff.push(`${g.name}: [${rs.map((v) => v.toFixed(3)).join(" ")}]`);
  }
  check(rOff.length === 0,
    `38-2. 🏋️ **계단은 거리만 본다** — 보통 대비 비가 거리 ${DIST.length}칸에서 **하나의 값** (${rShow.join(" · ")})`
    + (rOff.length ? `\n     🔴 흔들린 것: ${rOff.join(" · ")}` : "")
    + `\n     👉 타입별 **상수**는 괜찮아요. **계단이 타입을 보면** 안 됩니다`);

  /* ── 38-3. 🔗 **상수가 계단의 종속값인가** ──
   *
   * `TRAIN_NEUTRAL`은 손으로 고른 값이 아니라 계단에서 **역산한 값**입니다:
   *     TRAIN_NEUTRAL[t] = Σ trainStep(a, peak(보통)) ÷ Σ trainStep(a, peak(t))
   *
   * ⚠️ 이건 `_t.TRAIN_NEUTRAL`을 **읽습니다.** 그런데 *"문턱을 코드에서 읽어오는"* 함정이
   *    아니에요 — 소스의 상수를 **살아 있는 `trainStep`에서 계산한 값**과 대조하니
   *    **둘 중 하나만 바뀌면 잡힙니다.** 계단만 고치고 상수를 안 고치면 빨간불이에요.
   *    (소스 주석이 *"계단을 바꾸면 여기를 다시 역산해야 해요"*라고 적어 둔 그 자리) */
  const DERIVE_EPS = 0.005;
  {
    const step = P._t.trainStep, NEU = P._t.TRAIN_NEUTRAL;
    const sumStep = (id) => {
      let t = 0;
      for (let a = CAREER_AGES[0]; a <= CAREER_AGES[1]; a++) t += step(a, peakOf(id));
      return t;
    };
    const base = sumStep("normal");
    const off = P.GROWTH_TYPES.map((g) => ({ g, want: base / sumStep(g.id), got: NEU[g.id] }))
      .filter((x) => !(Math.abs(x.got - x.want) <= DERIVE_EPS));
    const line = P.GROWTH_TYPES.map((g) => `${g.name} ${NEU[g.id]} vs ${(base / sumStep(g.id)).toFixed(4)}`).join(" · ");
    check(off.length === 0,
      `38-3. 🔗 상수가 **살아 있는 trainStep에서 역산한 값**과 맞는다 (차 ≤${DERIVE_EPS}) — ${line}`
      + (off.length
        ? `\n     🔴 어긋남: ${off.map((x) => `${x.g.name} ${x.got} ≠ ${x.want.toFixed(4)}`).join(" · ")}`
          + `\n     👉 계단(눈금·구간)이나 정점 나이를 바꿨으면 **TRAIN_NEUTRAL을 다시 역산**하세요 — 직접 튜닝하지 마세요`
        : ""));

    /* 🧪 계단만 흔들면 역산이 어긋나야 합니다 — 종속값 계약이 살아 있다는 증명 */
    const MSTEP = { "prospect.js": [[/ {4}age <= peak - 4 \? 1\.1 : age <= peak \+ 1 \? 1\.0 : age <= peak \+ 4 \? 0\.7 : 0\.45;/,
      "    age <= peak - 6 ? 1.1 : age <= peak + 1 ? 1.0 : age <= peak + 2 ? 0.7 : 0.45;"]] };
    const badS = pageMutsOK({ STEP: MSTEP });
    if (badS.length) {
      check(false, `38-3-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${badS.join(", ")}`);
    } else {
      const MW = bootPage({ muts: MSTEP });
      const MP = MW.WingerProspect, mstep = MP._t.trainStep, mNEU = MP._t.TRAIN_NEUTRAL;
      const msum = (id) => { let t = 0; for (let a = CAREER_AGES[0]; a <= CAREER_AGES[1]; a++) t += mstep(a, peakOf(id)); return t; };
      const mbase = msum("normal");
      const drift = MP.GROWTH_TYPES.some((g) => Math.abs(mNEU[g.id] - mbase / msum(g.id)) > DERIVE_EPS);
      check(drift,
        `38-3-변이. **계단만 고치고 상수를 안 고치면** → 빨간불`
        + ` (${MP.GROWTH_TYPES.map((g) => `${g.name} ${mNEU[g.id]} vs ${(mbase / msum(g.id)).toFixed(4)}`).join(" · ")})`);
      MW.close();
    }
  }

  /* 🧪 변이 ① — 계단의 **짝을 지우면** 계단의 불균형이 그대로 드러납니다 */
  const bad1 = pageMutsOK({ NEUTRAL_OFF: MUT.NEUTRAL_OFF });
  if (bad1.length) {
    check(false, `38-변이①가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${bad1.join(", ")}`);
  } else {
    const MW = bootPage({ muts: MUT.NEUTRAL_OFF });
    const m = trainTotals(MW.WingerProspect).map((x) => x.sum);
    const mr = Math.max(...m) / Math.min(...m);
    check(mr > TRAIN_BAND,
      `38-변이①. 계단의 **짝을 지우면** → 빨간불 (총량 [${m.map((v) => v.toFixed(2)).join(" ")}] · 비 **${mr.toFixed(3)}배**)`
      + `\n     👉 계단이 정점 기준이라 정점이 이른 타입은 계단을 일찍 내려갑니다`);
    MW.close();
  }

  /* 🧪 변이 ② — 세기 배수를 **이름만 바꿔**(bloom) 짝 위에 또 얹으면.
   * 이름으로 잡는 검사였다면 여기서 통과해 버려요. */
  const bad2 = pageMutsOK({ BLOOM: MUT.BLOOM });
  if (bad2.length) {
    check(false, `38-변이②가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${bad2.join(", ")}`);
  } else {
    const MW = bootPage({ muts: MUT.BLOOM });
    const m = trainTotals(MW.WingerProspect).map((x) => x.sum);
    const mr = Math.max(...m) / Math.min(...m);
    check(mr > TRAIN_BAND,
      `38-변이②. 세기 배수를 **이름만 바꿔**(bloom) 부활시키면 → 빨간불 (비 **${mr.toFixed(3)}배**)`
      + `\n     👉 이름이 아니라 **형태**를 보기 때문에 잡힙니다 (§2-10)`);
    MW.close();
  }
}

/* ══════════════════════════════════════════════════════════════
 * 🔗 H. 계수의 **유효 조건** — 값이 아직 제안이라 묶어만 둡니다 (33-B 방식)
 *
 * `AGE_GAIN` · `AGE_PEN` · `AGE_TRADE`는 balancer 실측 ③ **전**이에요.
 * 여기서 문턱을 박으면 balancer가 값을 정하는 순간 상시 빨간불이 됩니다.
 * 대신 **지금 값을 적어 두고, 움직이면 "곡선을 다시 재세요"**라고 알려요.
 * ══════════════════════════════════════════════════════════════ */
{
  const WANT = { POOL: 194, REROLL_MAX: 2,
    RETIRE_AGE: 38, RETIRE_CURVE: 0.75, LOW_APPS: 15, LOW_RUN: 2,
    PEAK_SHIFT_MAX: 2, HOT_RUN: 3, HOT_BAR: 7.0, START_AGE: 18 };
  const off = Object.entries(WANT).filter(([k, v]) => P[k] !== v).map(([k, v]) => `${k} ${P[k]}≠${v}`);
  check(off.length === 0,
    `H-1. 🔗 나이·유망주 계수 ${Object.keys(WANT).length}개가 **제안값 그대로다**`
    + (off.length
      ? `\n     🔴 움직인 것: ${off.join(" · ")}`
        + `\n     👉 balancer에게 **실측 ③(곡선 다섯 점 · c* · 커리어 길이)** 재측정을 요청하세요.`
        + `\n        AGE_PEN은 hype에 직접 들어가 AXIS_OFF 2.35 위의 곡선을 흔듭니다`
      : ` (POOL ${P.POOL} · 은퇴 ${P.RETIRE_AGE}세/${P.RETIRE_CURVE} · 정점 이동 ${P.PEAK_SHIFT_MAX} — 전부 **제안**이에요)`));

  /* 🟠 알려진 미달 — designer가 보는 중인 셋. 값이 아니라 **상태**를 적어 둡니다. */
  /* 🔄 나이 반대급부(engineer §2-①)는 **ⓑ안으로 해소**됐습니다 —
   * 카드 스탯이 **정점 기준값**이 되고 화면은 `cardShown`이 곡선을 곱해 보여줘요.
   * 그래서 어린 카드는 총합이 같아도 **지금은 약하게** 보입니다. 그 관계를 봅니다. */
  {
    const mk = (age) => ({ age, growthType: "normal",
      stats: { shoot: 60, pass: 60, dribble: 60, defense: 60, stamina: 60, speed: 60 } });
    const s17 = P.cardShown(mk(17)).shoot, s19 = P.cardShown(mk(19)).shoot;
    check(s19 > s17,
      `H-2. 🎂 **총합이 같아도 어린 카드가 지금은 약하게 보인다** — 17세 ${s17.toFixed(1)} < 19세 ${s19.toFixed(1)}`
      + `\n     👉 engineer §2-①("어린 카드가 그냥 좋다")이 designer ⓑ안으로 해소된 자리예요.`
      + ` 총합(A-1)은 같고 **지금 실력**이 나이를 탑니다`);
    check(P.ageNote(17) !== P.ageNote(19) && P.ageNote(18) !== P.ageNote(17),
      `H-2b. 🗣️ 나이마다 **다른 안내 문구**가 나간다 — 약한 이유를 밝혀야 노이즈가 안 돼요 (원칙 ③)`);
  }
  /* ⚠️ **정점 뒤부터** 찾아야 합니다 — 어린 선수는 곡선이 원래 낮아요(만성 18세 0.629).
   *    18세부터 세면 "만성이 18세에 은퇴 대상"이라는 거짓말이 나옵니다. */
  const retire = P.GROWTH_TYPES.map((g) => {
    const st = mkSave({ growthType: g.id });
    let a = P.peakAgeOf(st);
    while (a <= P.RETIRE_AGE && P.curveAt(g.id, a, 0) >= P.RETIRE_CURVE) a += 1;
    return { id: g.id, peak: P.peakAgeOf(st), at: a <= P.RETIRE_AGE ? a : null };
  });
  const reach = retire.filter((r) => r.at != null);
  check(reach.length >= 1,
    `H-3. 🟠 은퇴 제안 곡선 문턱(${P.RETIRE_CURVE}) 도달 나이 — **정점 뒤부터** 세어요`
    + `\n     ${retire.map((r) => `${r.id}(정점 ${r.peak}) ${r.at == null ? "**영영 안 닿음**" : `${r.at}세`}`).join(" · ")}`
    + `\n     👉 안 닿는 타입은 ${P.RETIRE_AGE}세 강제 은퇴로만 끝납니다 (engineer §2-③ · designer 판단 대기)`);
  /* 🎉 2026-08-29 — **해소돼서 회귀로 승격했습니다.**
   * 예전에는 조숙만 0.75 밑으로 내려가 보통·만성은 은퇴 제안이 영영 안 떴어요
   * (engineer §2-③). 새 곡선에서는 셋 다 닿습니다 — 이제 **깨지면 빨간불**입니다. */
  check(reach.length === P.GROWTH_TYPES.length,
    `H-4. 👴 **성장타입 셋 다** 은퇴 제안이 뜬다 (${reach.length}/${P.GROWTH_TYPES.length}종)`
    + ` — engineer §2-③("조숙에게만 걸린다")이 해소된 자리예요`);

  /* 은퇴 경계 — 값이 아니라 **관계**를 봅니다. 강제와 제안이 겹치면 안 돼요. */
  check(P.mustRetire({ age: P.RETIRE_AGE }) && !P.mustRetire({ age: P.RETIRE_AGE - 1 }),
    `H-5. 👴 강제 은퇴가 정확히 ${P.RETIRE_AGE}세부터다 (${P.RETIRE_AGE - 1}세는 아직 뜁니다)`);
  check(!P.suggestRetire({ age: P.RETIRE_AGE, lowApps: 9 }),
    `H-6. 👴 강제 은퇴 나이에서는 **제안이 안 뜬다** (둘이 겹치면 화면이 두 번 묻습니다)`);
  /* ⚠️ 나이를 손으로 박지 않습니다 — 곡선이 바뀌면 그 나이가 옮겨가요.
   * H-3이 계산한 **문턱 도달 나이**를 그대로 씁니다. */
  const r0 = retire.find((r) => r.at != null);
  const below = { age: r0.at, growthType: r0.id };
  check(P.curveAt(r0.id, r0.at, 0) < P.RETIRE_CURVE
    && !P.suggestRetire(Object.assign({ lowApps: 0 }, below))
    && P.suggestRetire(Object.assign({ lowApps: P.LOW_RUN }, below)),
    `H-7. 👴 제안은 **곡선 + 출전 부진이 겹쳐야** 뜬다`
    + ` (${r0.id} ${r0.at}세 · 곡선 ${P.curveAt(r0.id, r0.at, 0).toFixed(3)} < ${P.RETIRE_CURVE} · 부진 ${P.LOW_RUN}시즌 연속)`
    + `\n     👉 곡선만으로는 안 떠요 — 잘 뛰고 있으면 나이가 많아도 제안이 안 나갑니다`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
