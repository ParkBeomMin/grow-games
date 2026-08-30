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
 * 여기서 메우는 것 (engineer §4의 A~G 순서 그대로 — A·C는 2026-08-30에 이사했어요)
 *   A 🚚 **`tests/winger2/bench-test.js`로 옮겼습니다** — 3택이 폐기되고 🧬 조립대가 됐어요
 *   B 노쇠가 **능력치에 비례**하는가              (옛 일률 −rand(0.6,1.8)로 되돌리면 빨간불)
 *   C 🚚 **`tests/winger2/bench-test.js`로 옮겼습니다** — 아래 「이사 간 자리」 참고
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
 * ─────────────────────────────────────────────────────────────────────────
 * 🚚 **이사 간 자리 — A절·C절** (2026-08-30 · 74번 판정 ③-C·⑤ · engineer 76번)
 * ─────────────────────────────────────────────────────────────────────────
 * 🌱 유망주 **3택**이 폐기되고 🧬 **조립대(선수 한 명 + ♾️ 무제한 다시 뽑기)**가 됐습니다.
 * `rollCards`가 사라져서 A절·C절이 **문법이 아니라 세계째로** 죽었어요:
 *
 *   · A-1 *"세 장의 총합이 **서로 같다**"*  → 선수가 하나라 견줄 상대가 없습니다.
 *     새 계약은 *"몇 번을 굴려도 **정확히 194**"*예요 — 비교가 아니라 **고정값**입니다
 *   · C절 *"두 번 쓰면 잠긴다 · 상한이 이 기능의 절반"*  → designer 판정이
 *     **정확히 그 문장을 뒤집었습니다.** 브레이크가 **횟수가 아니라 총합**이에요.
 *     `2`를 `Infinity`로 바꾸는 건 답이 아닙니다 — 지켜야 할 것 자체가 바뀌었어요
 *
 * 🔴 **그래서 값을 고치지 않고 파일을 옮겼습니다.** 둘 다
 *    **`tests/winger2/bench-test.js`**에 새 계약으로 다시 세웠어요 (B절·C절·D절).
 *    여기 남기면 *"옛 계약을 지키는 문법적으로 멀쩡한 검사"*가 됩니다.
 *
 * ⏱️ 약 6초.
 */
"use strict";
const fs = require("fs");
const { bootPage, pageMutsOK } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
/* 🚧 알려진 미달 — 종료 코드에 안 들어가지만 배너로 크게 찍습니다.
 * 상한은 `check`로 따로 걸어요: **현상은 기록하고 회귀는 잡습니다.** */
const gaps = [];
const note = (msg) => { console.log(`🚧 ${msg}`); gaps.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;

/* 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * (안 걸리면 `bootPage`가 던져 파일이 죽어요. 이 저장소에서 세 번 난 사고입니다.) */
const MUT = {
  /* 🚚 `POOL_VARY`(총합 깨기)는 **bench-test.js의 `POOL_LOOSE`**로 옮겼습니다 —
   * 옛 정규식은 3장 루프의 `i`를 쓰고 있어서 루프가 사라지자 ReferenceError가 됐어요. */
  /* B·G 나이곡선을 능력치에서 떼어 냄 — 성장도 노쇠도 사라집니다.
   * (2026-08-29 재구조화: `S.stats`가 **정점 기준값**이 되고 `nowStats`가 곡선을 곱해요.
   *  옛 `growthDelta`/`AGE_GAIN`이 사라진 자리라 변이도 그 형태를 따라갑니다.) */
  NO_CURVE: { "prospect.js": [[/ {4}for \(const k of keys\) out\[k\] = \(src\[k\] == null \? mean : src\[k\]\) \* c;/,
    "    for (const k of keys) out[k] = (src[k] == null ? mean : src[k]);"]] },
  /* D 🔴 birthday를 proYear 뒤로 되돌림 — 2026-08-29에 났던 그 결함 */
  OLD_ORDER: { "career.js": [[/ {4}WingerProspect\.birthday\(S\);\n {4}S\.proYear \+= 1;/,
    "    S.proYear += 1;\n    WingerProspect.birthday(S);"]] },
  /* 🚚 `REROLL_INF`(리롤 상한)은 **bench-test.js의 `REROLL_CAP`**으로 옮기면서
   * **방향이 뒤집혔습니다** — 이제 무제한이 설계라 「상한을 도로 채우는 것」이 변이예요. */
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
  /* 40 🔴 **정점 가드 제거** — 오르막에서도 은퇴 제안이 뜹니다 */
  NO_GUARD: { "prospect.js": [[/ {4}&& ageOf\(st\) > peakAgeOf\(st\)[^\n]*\n/, ""]] },
  /* 40b 🔴 **문턱만 되돌림** — 만성이 영영 제안을 못 받습니다 */
  OLD_CURVE: { "prospect.js": [[/const RETIRE_CURVE = 0\.78;/, "const RETIRE_CURVE = 0.75;"]] },
  /* 42 🔴 **만들어지는 나이를 다시 흩뜨림**
   * (3장 루프가 사라져 `const age = CARD_AGE;`가 `rollBuild`의 `age: CARD_AGE,`가 됐어요) */
  CARD_AGE_SPREAD: { "prospect.js": [[/ {6}age: CARD_AGE,/, "      age: CARD_AGE + randInt(0, 2),"]] },
  /* 42b 🔴 **NPC에게만 안 걺** — 다른 팀을 str 순으로 되돌려 「나만 특혜」로 만듭니다.
   * designer가 🚨 *"NPC에게도 똑같이 걸어라"*라고 못박은 자리인데, 어기면 아무 신호가 없었어요. */
  ME_ONLY: { "squad.js": [[/ {6}const line = sq\.filter\(\(x\) => x\.pos === p\)\.sort\(\(a, b\) => pickWeight\(b\) - pickWeight\(a\)\);/,
    "      const line = sq.filter((x) => x.pos === p).sort((a, b) => b.str - a.str);"]] },
  /* 41·42b 🔴 **YOUTH_BONUS를 통째로 제거** */
  NO_YOUTH: { "squad.js": [[/const YOUTH_BONUS = \{[^}]*\};/, "const YOUTH_BONUS = {};"]] },
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
 * A. 🚚 **이사 갔습니다 → `tests/winger2/bench-test.js`**
 *
 * 옛 A절: *"세 장의 스탯 총합이 **서로 같다**"* (`rollCards` 3장 비교)
 * 새 계약: *"몇 번을 굴려도 **정확히 194**"* (`rollShape` · 🧬 조립대 한 명)
 *
 * 🔴 **비교에서 고정값으로 바뀐 자리예요.** 선수가 하나라 "서로 같다"는 성립하지 않고,
 *    ♾️ 무제한 리롤에서는 **총합이 유일한 브레이크**라 값 자체를 박아야 합니다.
 *    `bench-test.js` B-1(10만 회) · C-1(게임 입구 300굴림)이 그 자리입니다.
 * ══════════════════════════════════════════════════════════════ */
const MARKETS = Object.keys(P._t.YOUTH_FOCUS);
const POSES = Object.keys(W.__get("POS_INFO"));

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
 * C. 🚚 **이사 갔습니다 → `tests/winger2/bench-test.js`**
 *
 * 🌍 **여기는 값이 아니라 세계가 뒤집힌 자리입니다.**
 *
 *   옛 C절이 지키던 문장: *"두 번 쓰면 잠긴다"* · *"상한이 이 기능의 절반입니다"*
 *   지금의 판정(74번 ③-C):  **♾️ 무제한.** 브레이크는 **횟수가 아니라 총합 고정**
 *
 * 🔴 그래서 `2`를 `Infinity`로 바꾸는 건 답이 아니에요 — 그러면
 *    **문법적으로 멀쩡하고 변이도 걸리는데 지키는 문장이 틀린** 검사가 됩니다.
 *    (⚽ 더 윙어 II에서 이미 한 번 그렇게 뒤집혔어요: 기준선 ❌ · 변이 ✅)
 *
 * 새 계약은 `bench-test.js`에 있습니다:
 *   C-1 🎲 300굴림이 **전부 총합 194**        ← 진짜 브레이크
 *   C-2 **화면이 찍는 합**도 매 굴림 194
 *   C-3 굴릴 때마다 **모양은 실제로 달라진다** (🎲가 죽어도 총합은 194예요)
 *   C-4 ${ROLLS}번 눌러도 **안 잠긴다** (무제한 **정책**의 문장 — 예산이 돌아오면 여기부터)
 *   D-1~4 🔒 ⭐ 잠재력 · 🧬 성장타입 · 🎁 타고난 것 · 🎂 나이는 **안 굴러간다**
 * ══════════════════════════════════════════════════════════════ */

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
 * 40 · 40b · 47. 🕯️ **은퇴 제안은 「문턱 + 방향 가드」 한 벌입니다**
 *
 * 🔴 designer 판정 (2026-08-29): 은퇴 제안이 **내리막에서만** 떠야 합니다.
 *    *"아직 안 여문 만 19세 만성에게 은퇴를 권하는"* 화면이 나오면 안 돼요.
 *
 * 🚨 **둘을 따로 넣으면 각각 다르게 고장납니다** — engineer가 2×2로 확인했어요:
 *
 *    | 세계 | 🌱 조숙 | 🌿 보통 | 🌳 만성 |
 *    |---|---|---|---|
 *    | ✅ 0.78 + 가드 | 34세 | 36세 | 37세 |
 *    | 가드만 뺌      | 34세 | ❌ **19세** | ❌ **19~22세** |
 *    | 문턱만 되돌림  | 35세 | 37세 | ❌ **영영 안 뜸** |
 *
 * 그래서 **두 방향을 다 봅니다** — 오르막에 안 뜨는가(40) · 그래도 결국 뜨는가(40b).
 * 하나만 걸면 나머지 하나가 조용히 무너져요.
 * ══════════════════════════════════════════════════════════════ */
const RETIRE_ALL_BY = 37;   // 세 타입 전부 이 나이까지는 제안이 떠야 합니다 (designer 표)
function retireScan(Pr) {
  return Pr.GROWTH_TYPES.map((g) => {
    const peak = Pr.peakAgeOf({ growthType: g.id, peakShift: 0 });
    const up = [];      // 오르막(정점 이하)에서 뜬 나이
    let first = null;   // 처음 뜬 나이
    for (let a = 19; a < Pr.RETIRE_AGE; a++) {
      const on = Pr.suggestRetire({ age: a, growthType: g.id, peakShift: 0, lowApps: Pr.LOW_RUN });
      if (on && a <= peak) up.push(a);
      if (on && first == null) first = a;
    }
    return { id: g.id, name: g.name, peak, up, first };
  });
}
{
  const R = retireScan(P);
  const upBad = R.filter((r) => r.up.length);
  check(upBad.length === 0,
    `40. 🕯️ **오르막(정점 이하)에서는 은퇴 제안이 0건** — 세 타입 × 만 19세~정점`
    + `\n     ${R.map((r) => `${r.name}(정점 ${r.peak}) 첫 제안 만 ${r.first == null ? "없음" : `${r.first}세`}`).join(" · ")}`
    + (upBad.length ? `\n     🔴 오르막에 뜬 것: ${upBad.map((r) => `${r.name} ${r.up.join(",")}세`).join(" · ")}` : ""));

  check(R.every((r) => r.first != null && r.first <= RETIRE_ALL_BY),
    `40b. 🕯️ 세 타입 **전부** 만 ${RETIRE_ALL_BY}세까지는 제안이 뜬다`
    + ` (${R.map((r) => `${r.name} ${r.first == null ? "**영영 안 뜸**" : `${r.first}세`}`).join(" · ")})`
    + `\n     👉 안 뜨는 타입이 있으면 그 커리어는 **강제 은퇴(${P.RETIRE_AGE}세)로만** 끝납니다`);

  /* 47. 🔗 문턱이 **앵커의 종속값**인가 — 세기 손잡이가 아니라 "정점의 몇 할 아래"예요.
   * 앵커를 옮기면 문턱도 따라 옮겨야 합니다. 값이 아니라 **끼여 있는지**를 봅니다. */
  const lateAt = (a) => P.curveAt("late", a, 0);
  check(lateAt(RETIRE_ALL_BY) < P.RETIRE_CURVE && P.RETIRE_CURVE <= lateAt(RETIRE_ALL_BY - 1),
    `47. 🔗 문턱이 **가장 늦게 피는 타입의 앵커 사이에 끼여 있다** — `
    + `만성 ${RETIRE_ALL_BY}세 ${lateAt(RETIRE_ALL_BY).toFixed(3)} < **${P.RETIRE_CURVE}** ≤ ${RETIRE_ALL_BY - 1}세 ${lateAt(RETIRE_ALL_BY - 1).toFixed(3)}`
    + `\n     👉 앵커를 옮기면 이 문턱도 **따라 옮겨야** 합니다 (세기 손잡이가 아니에요)`);

  /* 🧪 변이 — 한 벌에서 한쪽씩 빼면 **서로 다르게** 고장나야 합니다 */
  const b1 = pageMutsOK({ NO_GUARD: MUT.NO_GUARD });
  if (b1.length) {
    check(false, `40-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${b1.join(", ")}`);
  } else {
    const MW = bootPage({ muts: MUT.NO_GUARD });
    const m = retireScan(MW.WingerProspect);
    const up = m.filter((r) => r.up.length);
    check(up.length > 0,
      `40-변이. **정점 가드를 빼면** → 빨간불 (오르막 제안: ${up.map((r) => `${r.name} 만 ${r.up[0]}~${r.up[r.up.length - 1]}세`).join(" · ")})`);
    MW.close();
  }
  const b2 = pageMutsOK({ OLD_CURVE: MUT.OLD_CURVE });
  if (b2.length) {
    check(false, `40b-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${b2.join(", ")}`);
  } else {
    const MW = bootPage({ muts: MUT.OLD_CURVE });
    const m = retireScan(MW.WingerProspect);
    const never = m.filter((r) => r.first == null || r.first > RETIRE_ALL_BY);
    check(never.length > 0,
      `40b-변이. **문턱만 0.75로 되돌리면** → 빨간불 (${never.map((r) => `${r.name} ${r.first == null ? "영영 안 뜸" : `${r.first}세`}`).join(" · ")})`
      + `\n     👉 같은 한 벌인데 **빠진 쪽에 따라 다르게** 고장납니다`);
    MW.close();
  }
}

/* ══════════════════════════════════════════════════════════════
 * 42. 🎂 **카드 나이가 셋 다 같다** — 나이를 카드 칸에서 뺐습니다
 *
 * 🔴 *"시간은 다른 무엇으로도 못 삽니다."* 나이가 카드마다 다르면 어린 카드는
 *    **남은 시즌이 더 많다**는 이득을 얻는데, 그걸 스탯으로 되갚을 방법이 없어요.
 *    그래서 나이를 칸에서 빼고, 반대급부는 **성장타입**이 집니다(H-2).
 *
 * 🚨 **동시에 원칙 ④가 안 깨졌는지도 봅니다** — 나이를 고정하면서 총합이 흐트러지면
 *    한 문제를 다른 문제로 바꾼 것뿐이에요.
 * ══════════════════════════════════════════════════════════════ */
function cardAges(Pr, rolls) {
  const ages = new Set(), sums = new Set();
  for (let i = 0; i < rolls; i++) {
    const c = Pr.rollBuild(MARKETS[i % MARKETS.length], POSES[i % POSES.length]);
    ages.add(c.age);
    sums.add(Object.values(c.stats).reduce((a, b) => a + b, 0));
  }
  return { ages: [...ages].sort((a, b) => a - b), sums: [...sums].sort((a, b) => a - b) };
}
{
  const r = cardAges(P, 1000);
  check(r.ages.length === 1 && r.ages[0] === P.CARD_AGE,
    `42. 🎂 1000명이 **전부 만 ${P.CARD_AGE}세** (나온 나이: ${r.ages.join(", ")})`);
  /* 🔗 나이를 고정하면서 총합이 흐트러지면 한 문제를 다른 문제로 바꾼 것뿐이에요.
   * ⚠️ 값(194)을 지키는 건 `bench-test.js` B-1입니다 — 여기서는 **"하나뿐"**만 봐요
   *    (같은 값을 두 파일에 박으면 옮길 때 한쪽만 고쳐집니다). */
  check(r.sums.length === 1,
    `42-2. 🃏 나이를 고정해도 **총합은 여전히 하나** (${r.sums.join(", ")}) — 원칙 ④가 안 깨졌어요`
    + `\n     👉 그 값이 194인지는 bench-test.js B-1이 봅니다`);

  /* 🔴 **카드 나이는 데뷔 나이를 정합니다** — 유스가 3년이라 `카드 + 3 = 데뷔`예요.
   * designer가 2026-08-29에 18 → 17로 정정했습니다: 18이면 데뷔가 만 21세가 되는데
   * **balancer 측정이 전부 만 20세 기준**이라 기존 곡선이 통째로 어긋났어요.
   * 값이 아니라 **관계**를 봅니다 — 카드 나이 + 유스 = 데뷔. */
  const YOUTH_YEARS = 3;
  const DEBUT_AGE = 20;
  const debutNow = P.CARD_AGE + YOUTH_YEARS;
  check(debutNow === DEBUT_AGE,
    `42-3. 🎂 카드 ${P.CARD_AGE}세 + 유스 ${YOUTH_YEARS}년 = **데뷔 만 ${debutNow}세**`
    + (debutNow === DEBUT_AGE
      ? ` (balancer 측정 기준 ${DEBUT_AGE}세와 같아요)`
      : `\n     🔴 balancer 측정은 전부 **만 ${DEBUT_AGE}세 기준**입니다 — 지금은 만 ${debutNow}세라`
        + ` 27번의 곡선 실측이 **통째로 다른 조합**을 잰 게 됩니다`
        + `\n     👉 카드 나이를 **${DEBUT_AGE - YOUTH_YEARS}세**로 두면 맞습니다 (유스가 ${YOUTH_YEARS}년이라 카드 + ${YOUTH_YEARS} = 데뷔)`));
  /* 그리고 실제로 그 나이가 되는지 — 유스 해넘이 3번을 진짜 `birthday`로 */
  const st3 = { age: P.CARD_AGE, year: 1, proYear: 0 };
  for (let i = 0; i < YOUTH_YEARS; i++) { st3.year += 1; P.birthday(st3); }
  check(P.ageOf(st3) === DEBUT_AGE,
    `42-4. 🎂 유스 ${YOUTH_YEARS}년을 **진짜 birthday로** 흘리면 만 ${P.ageOf(st3)}세가 된다`
    + (P.ageOf(st3) === DEBUT_AGE ? "" : ` — 목표 ${DEBUT_AGE}세 (42-3과 같은 뿌리예요)`));

  const b = pageMutsOK({ CARD_AGE_SPREAD: MUT.CARD_AGE_SPREAD });
  if (b.length) {
    check(false, `42-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${b.join(", ")}`);
  } else {
    const MW = bootPage({ muts: MUT.CARD_AGE_SPREAD });
    const m = cardAges(MW.WingerProspect, 200);
    check(m.ages.length > 1,
      `42-변이. 만들어지는 나이를 다시 흩뜨리면 → 빨간불 (나온 나이: ${m.ages.join(", ")})`);
    MW.close();
  }
}

/* ══════════════════════════════════════════════════════════════
 * 41 · 42b. 🌱 **YOUTH_BONUS — 어린 선수에게 자리를 조금 더**
 *
 * 🔴 늦게 피는 타입은 데뷔 무렵 실력이 낮아 **선발에 못 듭니다.** 못 뛰면 성장도 못 하고,
 *    그게 *"만성을 고른 사람은 커리어 앞부분을 통째로 잃는"* 자리였어요.
 *    그래서 **선발 경쟁 무게에만** 나이 보정을 겁니다 — 생산량은 곡선이 그대로 정하니
 *    **세게 만드는 게 아니라 기회를 주는 것**이에요.
 *
 * 🚨 **designer가 못박은 것**: *"NPC에게도 똑같이 걸어라. 나만 받으면 그건 특혜다."*
 *    engineer가 되돌려 보니 **NPC에게만 안 걸어도 아무도 안 잡았습니다** —
 *    *"나와 경쟁자가 다른 자를 쓴다"*는 이 저장소의 단골 병인데 신호가 없었어요.
 *    42b가 그 자리입니다.
 *
 * ⚠️ **값을 안 박습니다** — `YOUTH_BONUS` 크기는 balancer 5-i 대기예요.
 *    보는 건 **관계**뿐입니다: *"어릴수록 크다"* · *"22세부터 0"* · *"NPC도 같은 자"*.
 * ══════════════════════════════════════════════════════════════ */
{
  const Q = W.WingerSquad;
  const row = (age, str, pos) => ({ name: `t${str}_${age}`, pos: pos || "fw", str, age, me: false });

  /* ① 어릴수록 크고, 어느 나이부터는 0 — 나이가 **단조**로 실립니다 */
  const AGES = [18, 19, 20, 21, 22, 26, 34];
  const muls = AGES.map((a) => Q.youthMul(row(a, 60)));
  check(muls.every((v, i) => i === 0 || v <= muls[i - 1] + 1e-12) && muls[0] > 1 && muls[muls.length - 1] === 1,
    `41-1. 🌱 나이 보정이 **어릴수록 크고 결국 0이 된다** — `
    + AGES.map((a, i) => `${a}세 ${muls[i].toFixed(3)}`).join(" · "));
  const zeroAt = AGES.find((a, i) => muls[i] === 1);
  check(zeroAt != null && zeroAt <= 22,
    `41-2. 🌱 만 ${zeroAt}세부터는 보정이 **없다** — 어른이 되면 실력으로만 겨룹니다`);

  /* ② 무게에 **곱해질 뿐** 실력을 바꾸지 않는다 — "세게 만드는 게 아니라 기회를 주는 것" */
  const r18 = row(18, 55), r26 = row(26, 60);
  check(Q.pickWeight(r18) === r18.str * Q.youthMul(r18) && r18.str === 55,
    `41-3. 🌱 보정은 **선발 무게에만** 걸리고 str는 안 건드린다 (str ${r18.str} · 무게 ${Q.pickWeight(r18).toFixed(2)})`);

  /* ③ 🚨 **NPC도 같은 자** — 다른 팀 선발을 실제로 뽑아 봅니다.
   * 실력이 낮은 18세가 실력이 높은 26세를 제치고 선발에 들어야 해요
   * (60 × 1.00 = 60.0 < 55 × 1.18 = 64.9). */
  function npcPick(win) {
    const Q2 = win.WingerSquad, S2 = win.WingerCareer._t.state();
    const sq = Q2.ensureSquads();
    const club = Object.keys(sq).find((c) => c !== S2.group);
    const base = sq[club].find((x) => x.pos === "fw");
    sq[club] = sq[club].filter((x) => x.pos !== "fw").concat([
      { ...base, name: "늙고강함", str: 60, age: 26 },
      { ...base, name: "어리고약함", str: 55, age: 18 },
      { ...base, name: "들러리", str: 30, age: 30 },
    ]);
    return Q2.startingXIOf(club).filter((x) => x.pos === "fw").map((x) => x.name);
  }
  const wS = openSave();
  const picked = npcPick(wS);
  check(picked[0] === "어리고약함",
    `42b. 🚨 **NPC도 나와 같은 자를 쓴다** — 다른 팀에서도 실력이 낮은 18세(55×1.18=64.9)가`
    + ` 26세(60×1.00=60.0)를 제치고 먼저 뽑힌다 (선발 fw: ${picked.join(" · ")})`
    + `\n     👉 우리 팀만 어린 선수를 밀어주면 그건 **특혜**입니다 (designer 판정)`);
  wS.close();

  /* 🧪 변이 ① — 다른 팀만 str 순으로 되돌리면(나만 특혜) 빨간불 */
  const b1 = pageMutsOK({ ME_ONLY: MUT.ME_ONLY });
  if (b1.length) {
    check(false, `42b-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${b1.join(", ")}`);
  } else {
    const MW = openSave(MUT.ME_ONLY);
    const m = npcPick(MW);
    check(m[0] !== "어리고약함",
      `42b-변이. **NPC에게만 안 걸면**(다른 팀을 str 순으로) → 빨간불 (선발 fw: ${m.join(" · ")})`
      + `\n     👉 지금까지 이 변이는 **아무도 안 잡았습니다**`);
    MW.close();
  }

  /* 🧪 변이 ② — 보정을 통째로 지우면 41-1이 빨간불 */
  const b2 = pageMutsOK({ NO_YOUTH: MUT.NO_YOUTH });
  if (b2.length) {
    check(false, `41-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${b2.join(", ")}`);
  } else {
    const MW = bootPage({ muts: MUT.NO_YOUTH });
    const mm = AGES.map((a) => MW.WingerSquad.youthMul(row(a, 60)));
    check(!(mm[0] > 1),
      `41-변이. 🌱 YOUTH_BONUS를 통째로 지우면 → 빨간불 (18세 보정 ${mm[0]})`);
    MW.close();
  }

  /* ④ 🎯 **신인 데뷔 시즌 출전** — designer 목표가 2026-08-29에 정정됐습니다
   *
   * 🔴 **15경기로 재지 마세요.** 그 값이 원래 있던 자리는 둘뿐이에요 —
   *    🌫️ 잠재력 안개(*"그 시즌 15경기 이상일 때만 폭이 좁혀짐"*)와
   *    🕯️ 은퇴 조건(*"2시즌 연속 15경기 미만"*).
   *    **신인이 첫 시즌부터 주전의 40%를 뛰어야 한다는 근거는 어디에도 없습니다.**
   *
   *      신인 데뷔 시즌 출전 목표 = 38라운드의 **30% 이상 (11.4경기)**
   *
   * 🔬 재는 법 — **진짜 `rollLineup`을 굴립니다.** 살아 있는 `lineupScore`·`myBonus`·
   *    `ensureSquads`를 그대로 부르고, 데뷔 클럽 셋(52/57/62)을 전부 봐요.
   *    🌳 만성 · 정점 기준값 71.9 · **만 20세**(카드 17 + 유스 3년) — 27번과 같은 눈금입니다. */
  const DEBUT_BAR = 11.4;          // 38라운드의 30%. 문턱은 검사에 박습니다
  const SEASONS = 150;             // 클럽당. fw는 자리가 2개뿐이라 표본이 작으면 크게 흔들려요
  function debutApps(win) {
    const Q2 = win.WingerSquad, CT2 = win.WingerCareer._t, S2 = CT2.state();
    const clubs = CT2.debutClubs(S2);
    const out = {};
    for (const pos of ["fw", "wg", "mf", "df"]) {
      const per = clubs.map((c) => {
        S2.group = c.name; S2.pos = pos; S2.age = 20;
        S2.growthType = "late"; S2.peakShift = 0; S2.condition = 80;
        for (const k of Object.keys(S2.stats)) S2.stats[k] = 71.9;
        let tot = 0;
        for (let n = 0; n < SEASONS; n++) {
          S2.squads = null; Q2.ensureSquads();
          for (let r = 0; r < 38; r++) {
            if (S2.activity) S2.activity.xiWeek = -1;
            Q2.rollLineup();
            if (Q2.isStarter()) tot += 1;
          }
        }
        return { club: c, v: tot / SEASONS };
      });
      out[pos] = { per, avg: per.reduce((a, b) => a + b.v, 0) / per.length };
    }
    return out;
  }
  const wA = openSave();
  const A = debutApps(wA);
  const POS4 = ["fw", "wg", "mf", "df"];
  const allAvg = POS4.reduce((a, p) => a + A[p].avg, 0) / POS4.length;
  console.log(`   🎯 신인 데뷔 출전 (만성 · 만 20세 · ${SEASONS}시즌/클럽)`);
  for (const p of POS4) {
    console.log(`      ${p} 평균 ${A[p].avg.toFixed(1)} — 클럽별 ${A[p].per.map((x) => `${x.club.str} ${x.v.toFixed(1)}`).join(" · ")}`);
  }
  check(allAvg >= DEBUT_BAR,
    `41-4. 🎯 신인 데뷔 시즌 출전이 **38의 30%(${DEBUT_BAR}경기) 이상** — 4포지션 평균 **${allAvg.toFixed(1)}**`
    + `\n     🚫 **15경기로 재지 마세요** — 그건 🌫️ 안개·🕯️ 은퇴의 선이지 출전 목표가 아닙니다 (designer 2026-08-29)`);

  /* 🚧 포지션별로 보면 ⚔️ 공격수가 바에 걸쳐 있습니다.
   * ⚠️ **제 하네스와 engineer 하네스가 서로 다른 답을 냅니다** — 바가 그 사이에 있어요.
   * 그래서 **회귀로 안 겁니다.** 절대값은 balancer 커리어 앙상블(5-i)이 확정할 자리예요.
   * 대신 **상한**을 걸어 더 나빠지면 잡습니다 — 현상은 기록하고 회귀는 잡아요. */
  const FW_FLOOR = 7;            // 이보다 더 나빠지면 빨간불 (상한이지 목표가 아니에요)
  const fw = A.fw;
  if (fw.avg >= DEBUT_BAR) {
    check(true, `41-5. ⚔️ 공격수 칸도 ${DEBUT_BAR}경기를 넘었다 (${fw.avg.toFixed(1)}) — 🎉 바에 걸치던 게 해소됐어요`);
  } else {
    note(`41-5. ⚔️ **공격수 칸이 바에 걸쳐 있습니다** — 평균 ${fw.avg.toFixed(1)} vs 목표 ${DEBUT_BAR}`
      + `\n        클럽별 ${fw.per.map((x) => `전력 ${x.club.str} → ${x.v.toFixed(1)}경기`).join(" · ")}`
      + `\n        engineer 하네스는 **12.8로 통과**라고 잽니다 — 바가 두 하네스 사이에 있어요`
      + `\n        👉 자리가 **2개뿐**이고 그 2자리 경쟁자가 팀 최상위입니다.`
      + ` 보너스 크기가 아니라 **포지션별 자리 수** 문제로 보여요`
      + `\n        👉 절대값은 **balancer 5-i(커리어 앙상블)**가 확정합니다`);
  }
  check(fw.avg >= FW_FLOOR,
    `41-5-상한. ⚔️ 공격수 출전이 더 나빠지지 않았다 — ${fw.avg.toFixed(1)} ≥ ${FW_FLOOR} (상한이지 목표가 아니에요)`);
  check(["wg", "mf", "df"].every((p) => A[p].avg >= DEBUT_BAR),
    `41-6. 🏃🎯🛡️ 나머지 세 포지션은 ${DEBUT_BAR}경기를 넘는다`
    + ` (${["wg", "mf", "df"].map((p) => `${p} ${A[p].avg.toFixed(1)}`).join(" · ")})`);

  /* ══════════════════════════════════════════════════════════════
   * 41b. 🔗 **최악 조합 하한 — balancer 자 위에서만 뜻이 있습니다**
   *
   * designer 확정: 🌳 만성 · ⚔️ 공격수 · 전력 62 클럽이 **7경기 이상**.
   * *"8.0이 6.0이 되면 「버틴다」가 아니라 「안 준다」입니다."*
   *
   * 🔴 **그 8.0을 제 자로는 못 잽니다.** balancer가 두 하네스가 갈린 원인을 분해했어요:
   *      ① 정점 기준값을 시즌 **끝** 값(71.9)으로 고정 — 실제 개막은 **46.9**이고
   *         훈련 78턴이 경기 사이에 끼어 **시즌 내내 자랍니다**
   *      ② `S.activity.ratingSum` 미설정 → 폼 **−3** (실제 데뷔 평점 6.60~6.72라 폼은 +0.2)
   *    제 자를 ②까지 고쳐도 전력 62에서 **3.7**입니다 — ①(시즌 중 성장)이 남아요.
   *    그걸 재현하려면 **커리어 앙상블을 다시 짓는 것**이고, 그건 balancer의 자예요.
   *
   * 🔧 그래서 **절대값을 다시 재지 않습니다.** 대신 `league-test` 33-B와 같은 방식으로
   *    **그 측정이 유효한 조건**을 지킵니다 — 하나라도 움직이면 8.0은 무효예요.
   * ══════════════════════════════════════════════════════════════ */
  const WORST_FLOOR = 7;          // designer 확정 하한 (balancer 자로 지금 8.0)
  const WORST_AT = {              // 그 8.0을 잰 조건 — 하나라도 바뀌면 다시 재야 합니다
    카드나이더하기유스: 20,        // 데뷔 만 20세
    공격수자리: 2,                 // FORMATION.fw — 경쟁률의 뿌리
    데뷔클럽전력: [52, 57, 62],    // DEBUT_POOL 하위 3팀
    나이보정18: 0.18,              // YOUTH_BONUS[18]
  };
  {
    const CT3 = wA.WingerCareer._t, Q3 = wA.WingerSquad;
    const strs = CT3.debutClubs(CT3.state()).map((c) => c.str);
    const got = {
      카드나이더하기유스: wA.WingerProspect.CARD_AGE + 3,
      공격수자리: Q3.FORMATION.fw,
      데뷔클럽전력: strs,
      나이보정18: Q3.YOUTH_BONUS[18],
    };
    const off = Object.keys(WORST_AT).filter((k) => JSON.stringify(got[k]) !== JSON.stringify(WORST_AT[k]))
      .map((k) => `${k} ${JSON.stringify(got[k])}≠${JSON.stringify(WORST_AT[k])}`);
    check(off.length === 0,
      `41b. 🔗 **최악 조합 하한(${WORST_FLOOR}경기)이 유효한 조건이 그대로다** — balancer 자로 지금 8.0`
      + (off.length
        ? `\n     🔴 움직인 것: ${off.join(" · ")}`
          + `\n     👉 balancer에게 **5-i 최악 조합 재측정**을 요청하세요 — 8.0은 지금 무효입니다`
        : `\n     (데뷔 만 ${got.카드나이더하기유스}세 · ⚔️ 자리 ${got.공격수자리}개 · 데뷔 클럽 ${strs.join("/")} · 🌱 18세 +${(got.나이보정18 * 100).toFixed(0)}%)`)
      + `\n     👉 여유가 **1경기뿐**입니다 — designer: *"8.0이 6.0이 되면 「버틴다」가 아니라 「안 준다」"*`);

    /* 제 자로는 **관계만** 봅니다 — 절대값은 다르지만 순서는 같아야 해요.
     * 클럽이 셀수록 덜 뛰고, ⚔️ 공격수가 가장 적게 뜁니다. 뒤집히면 그건 다른 고장이에요. */
    const fwPer = A.fw.per.map((x) => x.v);
    check(fwPer[0] > fwPer[1] && fwPer[1] > fwPer[2],
      `41b-2. 📉 **클럽이 셀수록 덜 뛴다** — ${A.fw.per.map((x) => `전력 ${x.club.str} → ${x.v.toFixed(1)}`).join(" · ")}`);
    check(POS4.every((p) => p === "fw" || A.fw.avg < A[p].avg),
      `41b-3. ⚔️ **공격수가 네 포지션 중 가장 적게 뛴다** (${POS4.map((p) => `${p} ${A[p].avg.toFixed(1)}`).join(" · ")})`
      + `\n     👉 자리가 2개뿐이라 생기는 구조예요 — 뒤집히면 자리 수가 바뀐 겁니다`);
  }
  wA.close();
}

/* ══════════════════════════════════════════════════════════════
 * 43. 🥈 **베스트11의 축이 성적에 단조증가한다**
 *
 * ⚠️ **값을 안 박습니다** — 베스트11 문턱은 balancer 5-j 전이에요.
 *    수상률 자체는 커리어 몬테카를로라 여기서 못 잽니다(46번 §6과 같은 자리).
 *
 * 대신 그 판정이 **서는 전제**를 굳힙니다. 베스트11은 리그 분위수 판정이고 그 축은
 * `posAxis(활동, 포지션)`이에요 — *"더 잘한 시즌이 축이 더 크다"*가 깨지면
 * 문턱을 어디에 놓든 단조증가가 안 섭니다.
 *
 * 🚨 이 자리가 실제로 무너진 전례가 있습니다 — 현행 상용의 `splitMine`에서
 *    **미드필더가 패스를 특화하면 축이 오히려 줄었어요**(×0.978 · OPEN-ITEMS 결함 ①).
 *    형태만 보면 안 보이고 **부호를 직접 재야** 잡힙니다.
 * ══════════════════════════════════════════════════════════════ */
{
  const wB = openSave();
  const posAxis = wB.WingerCareer._t.posAxis;
  const POS4 = ["fw", "wg", "mf", "df"];
  const AXES = ["goals", "assists", "defense"];
  const base = { goals: 10, assists: 10, defense: 10 };
  const bad = [];
  for (const pos of POS4) {
    for (const k of AXES) {
      const lo = posAxis(base, pos);
      const hi = posAxis({ ...base, [k]: base[k] + 10 }, pos);
      if (!(hi > lo)) bad.push(`${pos}/${k}: ${lo.toFixed(2)} → ${hi.toFixed(2)}`);
    }
  }
  check(bad.length === 0,
    `43-1. 🥈 축이 **골·도움·차단 셋 다에 단조증가**한다 (4포지션 × 3축 = 12칸)`
    + (bad.length ? `\n     🔴 안 오른 칸: ${bad.join(" · ")}` : "")
    + `\n     👉 여기가 뒤집히면 **잘할수록 손해**가 됩니다 (상용 splitMine에서 실제로 났던 일)`);

  /* 전체 성적을 통째로 올리면 축도 커져야 합니다 — 한 축만 보면 상쇄가 숨어요 */
  const grow = POS4.map((pos) => {
    const v = [1, 2, 3].map((m) => posAxis({ goals: 10 * m, assists: 10 * m, defense: 10 * m }, pos));
    return { pos, v, ok: v[0] < v[1] && v[1] < v[2] };
  });
  check(grow.every((g) => g.ok),
    `43-2. 🥈 성적을 통째로 키우면 축도 커진다 — `
    + grow.map((g) => `${g.pos} ${g.v.map((x) => x.toFixed(0)).join("→")}`).join(" · "));

  /* 🧪 변이 — 한 축의 가중을 음수로 만들면 43-1이 잡아야 합니다 */
  const MNEG = { "career.js": [[/ {4}fw: \{ g: 1\.0, a: ([\d.]+), d: ([\d.]+), n: ([\d.]+) \},/,
    "    fw: { g: 1.0, a: -$1, d: $2, n: $3 },"]] };
  const bm = pageMutsOK({ NEG: MNEG });
  if (bm.length) {
    check(false, `43-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${bm.join(", ")}`);
  } else {
    const MW = openSave(MNEG);
    const mAxis = MW.WingerCareer._t.posAxis;
    const lo = mAxis(base, "fw"), hi = mAxis({ ...base, assists: base.assists + 10 }, "fw");
    check(!(hi > lo),
      `43-변이. 한 축의 가중을 음수로 만들면 → 빨간불 (fw 도움 +10에서 ${lo.toFixed(2)} → ${hi.toFixed(2)})`);
    MW.close();
  }
  wB.close();
}

/* ══════════════════════════════════════════════════════════════
 * 44. 🥈 **상들의 문턱이 서로의 격을 역전시키면 안 된다** (§2-10 여섯 번째 냄새)
 *
 * 🔴 designer가 §2-10에 새 냄새로 승격한 자리예요.
 *    볼트의 옛 `else if` 사고(*"대상을 받으면 본상을 건너뛴다"*)와 **형태는 다른데 결과가 같습니다** —
 *    거기는 분기, 여기는 **문턱 배치**. 낮은 상(🥈 베스트11)이 높은 상(🏆 리그MVP)보다
 *    받기 어려워지면 등급이 뒤집혀요.
 *
 * 🔬 재는 법 — **여섯 상수를 소스에서 각각 뜯습니다.** 검사에 값을 안 박아요.
 *    `AXIS_OFF`나 `bar`가 움직여도 **관계는 그대로 유효**합니다 (둘 다 `× bar`라서요).
 *
 *      🏆 리그MVP  : hype ≥ mvpGate·bar  그리고  **N개 뽑기의 최대** rand(mvpLo·bar, mvpHi·bar)
 *      🥈 베스트11 : hype ≥ bonGate·bar  그리고  **한 번** 뽑기 rand(bonLo·bar, bonHi·bar)
 *
 * 🔑 **낮은 상이 더 쉬운 이유는 「한 번만 뽑기」입니다** — 문턱은 오히려 더 높아요(5.8 > 5.5).
 *    MVP가 여섯 번 중 최대와 겨루기 때문에 실질 요구치가 훨씬 높습니다.
 *    그 구조가 사라지면 문턱을 어디에 놓아도 등급이 안 섭니다 — 44-2가 그 자리예요.
 * ══════════════════════════════════════════════════════════════ */
const CEIL_TOL = 0.2;      // 상한 여유 — engineer 제안. 지금 8.0 ≤ 7.8 + 0.2 (딱 경계예요)
const FLIP_CAP = 0.15;     // 역전 창의 깊이 상한 (지금 0.080 · 상한 8.5면 0.233)
{
  const CSRC = fs.readFileSync("/workspace/grow-games/beta/winger2/career.js", "utf8");
  const grab = (re, name) => {
    const m = CSRC.match(re);
    if (!m) throw new Error(`career.js에서 ${name}을(를) 못 뜯었어요 — 정규식을 고치세요`);
    return m;
  };
  const mvp = grab(/const leagueBest = Math\.max\(\.\.\.Array\.from\(\{ length: (\d+) \}, \(\) => rand\(([\d.]+) \* bar, ([\d.]+) \* bar\)\)\);/, "리그MVP 뽑기");
  const mvpG = grab(/if \(hype >= ([\d.]+) \* bar && hype >= leagueBest\)/, "리그MVP 문턱");
  const bon = grab(/if \(hype >= ([\d.]+) \* bar\) \{\n\s*const posBar = rand\(([\d.]+) \* bar, ([\d.]+) \* bar\);/, "베스트11 한 벌");
  const N = Number(mvp[1]), mvpLo = Number(mvp[2]), mvpHi = Number(mvp[3]), mvpGate = Number(mvpG[1]);
  const bonGate = Number(bon[1]), bonLo = Number(bon[2]), bonHi = Number(bon[3]);
  console.log(`   🥈 뜯어온 문턱 — 🏆 MVP: 게이트 ${mvpGate} · rand(${mvpLo}, ${mvpHi})의 최대 ${N}개`
    + `  ·  🥈 베스트11: 게이트 ${bonGate} · rand(${bonLo}, ${bonHi}) 한 번`);

  /* ── 44-1. 상한 관계 (engineer 제안 형태) ── */
  check(bonHi <= mvpHi + CEIL_TOL,
    `44-1. 🥈 베스트11 상한이 🏆 리그MVP 상한을 **의미 있게 넘지 않는다** — ${bonHi} ≤ ${mvpHi} + ${CEIL_TOL}`
    + `\n     👉 상수를 검사에 안 박습니다. 둘 다 소스에서 뜯어 **서로 비교**해요 —`
    + ` \`AXIS_OFF\`가 움직여도 이 관계는 유효합니다`);

  /* ── 44-2. 등급이 서는 **구조** — MVP만 여러 번 뽑기의 최대와 겨룬다 ── */
  check(N >= 2 && /const posBar = rand\([^)]*\);/.test(CSRC) && !/posBar = Math\.max/.test(CSRC),
    `44-2. 🥈 **MVP만 ${N}개 뽑기의 최대**와 겨루고 베스트11은 **한 번**만 뽑는다`
    + `\n     👉 문턱은 베스트11이 더 높아요(${bonGate} > ${mvpGate}). **낮은 상이 더 쉬운 이유는 여기**입니다 —`
    + ` 이 구조가 사라지면 문턱을 어디에 놓아도 등급이 안 섭니다`);

  /* ── 44-3. 🚧 **역전 창** — 해석적으로 계산합니다 (표본 0)
   * 두 확률 다 닫힌 형태예요:
   *   P(베스트11 | h) = [h ≥ bonGate] × clamp((h − bonLo)/(bonHi − bonLo), 0, 1)
   *   P(MVP      | h) = [h ≥ mvpGate] × clamp((h − mvpLo)/(mvpHi − mvpLo), 0, 1)^N
   * (h = hype ÷ bar. `bar`가 약분돼서 리그가 어디든 같습니다.) */
  const cl = (v) => Math.max(0, Math.min(1, v));
  const pBon = (h, hi) => (h < bonGate ? 0 : cl((h - bonLo) / (hi - bonLo)));
  const pMvp = (h) => (h < mvpGate ? 0 : Math.pow(cl((h - mvpLo) / (mvpHi - mvpLo)), N));
  /* ⚠️ **게이트 구간(h < bonGate)은 빼고 봅니다.** 거기서는 🥈가 아직 안 열려서
   *    0 vs 아주 작은 값이 되는데, 그건 *"문턱이 더 높다"*는 설계 그대로예요
   *    (그 구간 끝의 🏆 확률은 아래 gateEdge로 찍습니다).
   *    진짜 문제는 **둘 다 열린 뒤 상한 때문에 생기는 창**입니다. */
  function flipWindow(hi) {
    let worst = Infinity, at = 0, from = null, to = null;
    for (let h = bonGate; h <= 12; h += 0.005) {
      const d = pBon(h, hi) - pMvp(h);
      if (d < worst) { worst = d; at = h; }
      if (d < -1e-9) { if (from === null) from = h; to = h; }
    }
    return { worst: -worst, at, from, to };
  }
  const gateEdge = pMvp(bonGate) * 100;   // 게이트 구간 끝의 🏆 확률
  const F0 = flipWindow(bonHi);
  const tbl = [6.0, 6.5, 7.0, 7.5, 7.8, 8.0, 8.3].map((h) =>
    `${h}: ${(pBon(h, bonHi) * 100).toFixed(0)}/${(pMvp(h) * 100).toFixed(0)}`).join(" · ");
  console.log(`      hype/bar별 🥈/🏆 확률 — ${tbl}`);
  if (F0.from === null) {
    check(true, `44-3. 🥈 어떤 hype에서도 **역전이 없다** — 🎉 얇던 자리가 해소됐어요`);
  } else {
    note(`44-3. 🥈 **좁은 역전 창이 이미 있습니다** — hype/bar **${F0.from.toFixed(2)} ~ ${F0.to.toFixed(2)}**`
      + ` (가장 깊은 곳 ${(F0.worst * 100).toFixed(1)}%p @ ${F0.at.toFixed(2)})`
      + `\n        🏆 MVP가 ${mvpHi}에서 100%에 닿는데 🥈 베스트11은 ${bonHi}까지 못 닿아서 생기는 창이에요`
      + `\n        (게이트 구간 ${mvpGate}~${bonGate}은 뺐습니다 — 거기 🏆 확률은 최대 ${gateEdge.toFixed(1)}%로 설계 그대로예요)`
      + `\n        👉 **유효 능력치 150이 여기 걸립니다** — engineer 실측 평균 hype **8.30**,`
      + ` 베스트11 98.2% vs MVP 97.8%로 **여유 0.4%p**입니다`
      + `\n        👉 지금은 hype 분포가 이 창을 거의 안 밟아서 통합 수상률에서는 안 보여요.`
      + ` MVP 문턱이나 \`AXIS_OFF\`가 움직이면 **여기가 먼저 뒤집힙니다**`);
  }
  check(F0.worst <= FLIP_CAP,
    `44-3-상한. 🥈 역전 창이 더 깊어지지 않았다 — ${(F0.worst * 100).toFixed(1)}%p ≤ ${(FLIP_CAP * 100).toFixed(0)}%p`
    + ` (상한이지 목표가 아니에요)`);

  /* 🧪 변이 — 상한을 8.5로 올리면 역전이 실제로 납니다
   * (engineer 실측: 130에서 80.6% vs 86.4% · 150에서 92.2% vs 97.4%) */
  const MUT_CEIL = { "career.js": [[/const posBar = rand\(([\d.]+) \* bar, ([\d.]+) \* bar\);/,
    "const posBar = rand($1 * bar, 8.5 * bar);"]] };
  const bad = pageMutsOK({ CEIL: MUT_CEIL });
  if (bad.length) {
    check(false, `44-변이가 **안 돌았습니다** — 정규식이 소스와 안 맞아요: ${bad.join(", ")}`);
  } else {
    const F1 = flipWindow(8.5);
    check(!(8.5 <= mvpHi + CEIL_TOL) && F1.worst > FLIP_CAP,
      `44-변이. 🥈 베스트11 상한을 **8.5로 올리면** → 빨간불`
      + ` (44-1: 8.5 > ${mvpHi} + ${CEIL_TOL} · 44-3-상한: 역전 창이 ${(F0.worst * 100).toFixed(1)}%p → **${(F1.worst * 100).toFixed(1)}%p**,`
      + ` hype ${F1.from.toFixed(2)}부터 뒤집힙니다)`);
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
  /* 🌍 `REROLL_MAX`는 **2 → Infinity**로 바뀌었습니다 (2026-08-30 · 74번 판정 ③-C).
   *    ⚠️ 값만 갈아 끼운 게 아니에요 — **무엇이 브레이크인가**가 바뀐 자리입니다.
   *    옛 세계: 횟수가 브레이크 (예산 2회 + ↩️ 되돌리기)
   *    지금:     **`POOL` 고정이 브레이크** · 횟수는 무제한
   *    🔴 그래서 `POOL`이 이 표에서 움직이면 **무제한이 즉시 사고**가 됩니다 —
   *       `REROLL_MAX`가 움직이는 것보다 훨씬 큰 일이에요 (bench-test.js B·C절 참고). */
  const WANT = { POOL: 194, REROLL_MAX: Infinity,
    RETIRE_AGE: 38, RETIRE_CURVE: 0.78, LOW_APPS: 15, LOW_RUN: 2,
    PEAK_SHIFT_MAX: 2, HOT_RUN: 3, HOT_BAR: 7.0, START_AGE: 18 };
  const off = Object.entries(WANT).filter(([k, v]) => P[k] !== v).map(([k, v]) => `${k} ${P[k]}≠${v}`);
  check(off.length === 0,
    `H-1. 🔗 나이·유망주 계수 ${Object.keys(WANT).length}개가 **제안값 그대로다**`
    + (off.length
      ? `\n     🔴 움직인 것: ${off.join(" · ")}`
        + `\n     👉 balancer에게 **실측 ③(곡선 다섯 점 · c* · 커리어 길이)** 재측정을 요청하세요.`
        + `\n        AGE_PEN은 hype에 직접 들어가 AXIS_OFF 2.35 위의 곡선을 흔듭니다`
      : ` (POOL ${P.POOL} · 🎲 ${P.REROLL_MAX === Infinity ? "♾️ 무제한" : P.REROLL_MAX}`
        + ` · 은퇴 ${P.RETIRE_AGE}세/${P.RETIRE_CURVE} · 정점 이동 ${P.PEAK_SHIFT_MAX} — 전부 **제안**이에요)`));

  /* 🟠 알려진 미달 — designer가 보는 중인 셋. 값이 아니라 **상태**를 적어 둡니다. */
  /* 🔄 **반대급부가 나이 칸에서 성장타입 칸으로 옮겨갔습니다** (2026-08-29 · 59번 §1-③).
   *
   * 카드 나이가 **18세로 고정**되면서 *"어린 카드가 그냥 좋다"*(engineer §2-①)가
   * 구조적으로 사라졌어요 — **시간은 다른 무엇으로도 못 사니까** 나이를 칸에서 뺀 겁니다.
   * 그 대신 반대급부는 **성장타입**이 집니다: 같은 18세·같은 잠재 총합인데
   * 늦게 피는 타입일수록 **지금 레이더가 작아** 보여요.
   *
   * ⚠️ 옛 H-2는 `cardShown`에 **17세와 19세를 손으로 넣어** 재고 있었습니다 —
   *    이제 **일어날 수 없는 조합**이에요. 검사가 게임에 없는 상황을 재면 안 됩니다. */
  {
    const mk = (t) => ({ age: P.CARD_AGE, growthType: t,
      stats: { shoot: 60, pass: 60, dribble: 60, defense: 60, stamina: 60, speed: 60 } });
    const shown = P.GROWTH_TYPES.map((g) => ({
      g, sum: Object.values(P.cardShown(mk(g.id))).reduce((a, b) => a + b, 0) }));
    const by = Object.fromEntries(shown.map((x) => [x.g.id, x.sum]));
    check(by.early > by.normal && by.normal > by.late,
      `H-2. 🌱 **같은 18세·같은 잠재 총합인데 성장타입이 지금 크기를 가른다** — `
      + shown.map((x) => `${x.g.name} ${x.sum.toFixed(0)}`).join(" · ")
      + ` (${(by.early / by.late).toFixed(2)}배)`
      + `\n     👉 반대급부가 **나이 칸에서 성장타입 칸으로** 옮겨간 자리예요.`
      + ` 나이로는 못 사고(시간은 못 삽니다), 대신 "늦게 피는 만큼 지금 작다"로 값을 치릅니다`);
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

if (gaps.length) {
  const bar = "━".repeat(72);
  console.log(`\n${bar}\n🚧 알려진 미달 ${gaps.length}건 — 검사는 초록불이지만 목표에는 못 닿았어요`);
  console.log(`   (절대값이 하네스에 따라 갈리는 자리라 종료 코드에서 뺐습니다. 위 주석 참고)\n${bar}`);
  for (const g of gaps) console.log(`   🚧 ${g}`);
  console.log(bar);
}
console.log(fail ? `\n❌ ${fail}건 실패` : (gaps.length ? `\n✅ 회귀 검사 통과 · 🚧 알려진 미달 ${gaps.length}건 — 종료 코드 0` : "\n✅ 통과"));
process.exit(fail ? 1 : 0);
