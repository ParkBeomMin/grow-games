/* 🏘️ ⚽ 더 윙어 II — 동네 축구가 **게임을 세게도 약하게도 만들지 않는다** (T-1 · T-4)
 *
 * 🔴 **이 파일이 생기기 전까지 이 자리를 지키는 검사가 0건이었습니다.**
 *    engineer가 원칙 ⑩으로 동네를 하나씩 되돌려 봤는데 **여섯 변이가 전부 안 잡혔어요**
 *    (`91_engineer_hometown.md` §5). 밴드를 옮겨도·배수 표를 비대칭으로 만들어도
 *    검사 14종이 전부 초록불이었습니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-08-31 · designer 85번 · 87번 「동네 전용 상수 폐기」 · engineer 91번)
 *
 *   · 🏘️ 동네는 🧬 조립대 **앞**이라 **모든 플레이어가 정확히 같은 몸**으로 뜁니다
 *     (`WingerProspect.evenStats()`). 그래서 **능력치도 포지션도 안 탑니다** — T-1b가 그걸 봐요
 *   · 🏟️ 제안이 닿는 축은 **`spot` 하나뿐**입니다. `growth`·`debut`은 비트 단위 불변
 *     — 그건 이 파일이 아니라 **`town-test.js` T-2**가 봅니다(경로가 달라요)
 *   · 📣 배수 다섯 칸(0.90 / 0.95 / 1.00 / 1.05 / 1.10)과 밴드(0~1 / 2~4 / 5~6)와
 *     흔들림(0.25 / 0.50 / 0.25)은 **독립된 세 값이 아니라 한 대칭의 세 조각**이에요.
 *     하나만 옮기면 그 순간 중립이 깨집니다 (`NPC_SPOT` 사고의 형태)
 *   · 🔑 **새 밸런스 상수 0개** — `PEER_REF.town`을 재사용합니다
 *
 * ⚠️ **「동네가 능력치를 타야 한다」는 판정이 다시 나오면 T-1b가 통째로 뒤집힙니다.**
 *    그때는 값을 고치지 말고 이 파일을 먼저 여세요 — 지켜야 할 것 자체가 바뀐 거예요.
 * ⚠️ **밴드·배수·흔들림 중 하나라도 설계가 바뀌면 T-1의 ±0.5%가 옛 계약이 됩니다.**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(±0.5% · 0.90 · 1.10 · ±2%)은 여기 박습니다.** `_t.OFFER`·`_t.SHAKE`에서
 *      읽어 오면 표를 통째로 갈아도 검사가 따라가서 **아무것도 안 잡혀요**
 *   ③ **산식은 게임의 함수를 그대로 부릅니다** — `_t.rollOffers` · `_t.judgeFor` · `_t.PTS`.
 *      점수 산식을 여기 베껴 적지 않아요 (베끼면 소스가 바뀌어도 안 잡힙니다)
 *   ④ **시드 하나로 안 잽니다** — 시드 다섯으로 재고, 시드마다 따로 찍습니다
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인합니다 (안 걸리면 ❌ 한 줄, 죽지 않아요)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 📏 왜 ±0.5%인가 — 밴드와 기준선 사이의 여유를 먼저 쟀습니다
 * ─────────────────────────────────────────────────────────────────────────
 *   기준선(시드 5개 · 각 20,000판)  1.00021 ~ 1.00057   → 벗어남 ≤ **0.057%**
 *   시드 간 1σ                        ≈ 0.00016          → ±0.5%는 **31σ**
 *   🧪 M-C  밴드를 0~2로              0.98923            → **−1.08%** (문턱의 2.2배)
 *   🧪 M-C2 흔들림을 0.10/0.50/0.40   1.01547            → **+1.55%** (문턱의 3.1배)
 *
 *   문턱이 기준선(0.057%)과 변이(1.08%) **사이**에 있고 양쪽에 안 붙어 있습니다.
 *   🚨 조이지 마세요 — 0.1%로 조이면 시드 잡음이 검사를 흔듭니다.
 *   🚨 풀지도 마세요 — 1.0%로 풀면 M-C가 그대로 지나갑니다.
 *
 * ⏱️ 약 40초 걸려요.
 */
"use strict";
const { bootPage, pageMutsOK } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const NEUTRAL = 1.000;      // 🎯 동네를 얹어도 기댓값이 안 움직인다
const EPS = 0.005;          // ±0.5% (위 표 참고 — 조이지도 풀지도 마세요)
const FLOOR = 0.90;         // 🔒 바닥 (「주목 배수 하한」이지 「동네 페널티」가 아니에요)
const CEIL = 1.10;          // 🔒 천장
const SYM_EPS = 0.02;       // 흔들림 좌우 대칭 — 1σ ≈ 0.55%라 ±2%는 3.6σ
const SCORE_MIN = 0, SCORE_MAX = 6;   // 🏘️ 세 판 × (perfect 2 · ok 1 · miss 0)
const N = 20000;            // 시드당 동네 판수
const SEEDS = [11, 23, 37, 41, 59];   // 🎲 시드 하나로 안 잽니다
const POSES = ["fw", "wg", "mf", "df"];

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **M-C — 밴드를 `0~2 / 3~4 / 5~6`으로.** engineer가 되돌렸을 때 안 잡히던 변이예요.
   *    중립 점수 분포가 3점 축 대칭이라 `0~1`과 `5~6`이 같은 무게(3/18)인데,
   *    `0~2`로 넓히면 아래쪽만 7/18이 되어 **기댓값이 통째로 내려앉습니다.** */
  M_C_BAND: { "town.js": [[/score <= 1 \? NEUTRAL_TIER - 1/, "score <= 2 ? NEUTRAL_TIER - 1"]] },
  /* 🔴 **M-C2 — 흔들림을 한쪽만 키웁니다.** 좌우 대칭이라 기댓값을 안 움직이는 게
   *    ±1칸의 계약인데, 한쪽만 키우면 그건 흔들림이 아니라 **난이도 조정**이에요. */
  M_C2_SHAKE: { "town.js": [[/\[\[-1, 0\.25\], \[0, 0\.50\], \[1, 0\.25\]\]/, "[[-1, 0.10], [0, 0.50], [1, 0.40]]"]] },
  /* 🔴 **M-C3 — 바닥을 0.80으로.** *"못했으면 더 아프게"* 는 언제든 오는 압박이고,
   *    그 순간 회복 경로가 사라집니다(= 처벌의 정의 · 설계 §3-3 ①). */
  M_C3_FLOOR: { "town.js": [[/\{ mul: 0\.90, star: "☆"/, '{ mul: 0.80, star: "☆"']] },
  /* 🔴 **M-G — `clamp`를 빼고 흔들림을 ±2로.** 표 밖 칸을 집어 배수가 사라집니다. */
  M_G_NOCLAMP: { "town.js": [
    [/const tier = clamp\(base \+ d, 0, OFFER\.length - 1\);/, "const tier = base + d;"],
    [/\[\[-1, 0\.25\], \[0, 0\.50\], \[1, 0\.25\]\]/, "[[-2, 0.25], [0, 0.50], [2, 0.25]]"],
  ] },
};

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
const mutOK = (name) => pageMutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ── 🎲 시드를 박습니다. 엔진은 로드 시점에 `Math.random`을 잡아 두므로
 *    (`let _rng = Math.random;`) **`_t.seed()`를 반드시 불러야** 판정이 재현돼요.
 *    페이지의 `Math.random`만 갈면 `rollOffers`만 걸리고 판정은 안 걸립니다. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 🏘️ 동네 한 판을 **게임의 함수 그대로** 굴립니다 — 점수 산식을 베끼지 않아요.
 *   · `_t.judgeFor(key, {pos}).judge(0.5)`  = 자동 진행이 부르는 **그 갈래**(중립 조작)
 *   · `_t.PTS[판정]`                        = 게임이 점수를 매기는 **그 표**
 *   · `_t.rollOffers(점수)`                 = 5곳이 손을 드는 **그 함수**
 * 🔴 `_t.OFFER`·`_t.SHAKE`는 **안 읽습니다** — 그게 지금 검사 대상이라서요. */
function harness(muts) {
  const W = bootPage({ muts });
  const T = W.WingerTown, E = W.WingerEngine;
  if (!T || !T._t || !E || !E._t) { W.close(); throw new Error("WingerTown._t / WingerEngine._t 창구가 없어요"); }
  const MK = W.__get("MARKETS");
  return {
    W, T, MK,
    seed: (s) => { E._t.seed(s); W.Math.random = mulberry32((s ^ 0x9e3779b9) >>> 0); },
    /* 중립 조작(s = 0.5)으로 세 장을 굴려 0~6점을 냅니다 */
    townScore: (judges) => judges.reduce((a, j) => a + (T._t.PTS[j.judge(0.5)] || 0), 0),
    judges: (pos) => T._t.CARDS.map((c) => T._t.judgeFor(c.key, { pos })),
    close: () => W.close(),
  };
}

/* 중립 기댓값 한 벌 — 시드 하나 · N판 · 5곳 전부를 셉니다. */
function runNeutral(h, seed, pos, n) {
  h.seed(seed);
  const J = h.judges(pos);
  let sum = 0, cnt = 0;
  const dist = {};
  for (let i = 0; i < n; i++) {
    const sc = h.townScore(J);
    dist[sc] = (dist[sc] || 0) + 1;
    const off = h.T._t.rollOffers(sc);
    for (const m of h.MK) { sum += off[m.id].mul; cnt += 1; }
  }
  return { mean: sum / cnt, dist, n: cnt };
}

console.log("── 🎯 T-1. 동네를 얹어도 기댓값이 안 움직인다 ──");

const H = harness(null);
const baseMeans = SEEDS.map((s) => ({ seed: s, ...runNeutral(H, s, "wg", N) }));
const worst = baseMeans.reduce((a, b) =>
  (Math.abs(b.mean - NEUTRAL) > Math.abs(a.mean - NEUTRAL) ? b : a));
check(baseMeans.every((r) => Math.abs(r.mean - NEUTRAL) <= EPS),
  `T-1. 🎯 중립 조작(s = 0.5)에서 **E[spotMul] = ${NEUTRAL.toFixed(3)} ± ${(EPS * 100).toFixed(1)}%**`
  + ` — 시드 ${SEEDS.length}개 × ${N.toLocaleString()}판`
  + `\n     ${baseMeans.map((r) => `${r.seed}:${r.mean.toFixed(5)}`).join(" · ")}`
  + `\n     가장 벗어난 시드 ${worst.seed} → ${((worst.mean - NEUTRAL) * 100).toFixed(3)}% (문턱 ±${(EPS * 100).toFixed(1)}%)`);

/* 📊 측정 조건을 검사가 스스로 찍습니다 — 점수가 3점 축으로 대칭이 아니면
 *    T-1은 "우연히 1.000"일 수 있어요. 분포를 눈에 보이게 남깁니다. */
{
  /* 🎲 시드 하나로 안 잽니다 — 다섯 시드를 **합쳐서** 봅니다.
   *    한 시드(20,000판)면 1σ ≈ 0.37%라 문턱 2%가 5.4σ인데,
   *    합치면(100,000판) 1σ ≈ 0.17%로 **12σ**가 됩니다. */
  const d = {};
  for (const r of baseMeans) for (const k of Object.keys(r.dist)) d[k] = (d[k] || 0) + r.dist[k];
  const lowSide = (d[0] || 0) + (d[1] || 0), highSide = (d[5] || 0) + (d[6] || 0);
  const tot = Object.values(d).reduce((a, b) => a + b, 0);
  const gap = Math.abs(lowSide - highSide) / tot;
  check(gap <= SYM_EPS,
    `T-1a. 📊 중립 점수 분포가 **3점 축으로 대칭**이다 — P(0~1점) ≈ P(5~6점) (±${(SYM_EPS * 100).toFixed(0)}% · 시드 ${SEEDS.length}개 합산)`
    + `\n     ${[0, 1, 2, 3, 4, 5, 6].map((k) => `${k}점 ${((d[k] || 0) / tot * 100).toFixed(1)}%`).join(" · ")}`
    + `\n     아래 ${(lowSide / tot * 100).toFixed(2)}% ↔ 위 ${(highSide / tot * 100).toFixed(2)}% (차이 ${(gap * 100).toFixed(2)}%)`
    + `\n     🔑 T-1의 1.000은 우연이 아니라 **이 대칭**입니다 — 대칭이 깨지면 T-1도 같이 갑니다`);
}

/* 🔑 관계 검사 — 값을 베끼지 않습니다. **네 포지션이 서로 같아야** 해요. */
{
  const byPos = POSES.map((p) => ({ pos: p, ...runNeutral(H, SEEDS[0], p, N) }));
  const vals = byPos.map((r) => r.mean);
  const same = vals.every((v) => v === vals[0]);
  check(same,
    `T-1b. 🔒 **동네는 몸을 안 탑니다** — 같은 시드에서 포지션 4종의 기댓값이 **정확히 같다**`
    + `\n     ${byPos.map((r) => `${r.pos}:${r.mean.toFixed(5)}`).join(" · ")}`
    + (same
      ? `\n     (🧬 조립대 앞이라 전원이 \`evenStats()\`의 같은 몸이에요 — 능력치를 태울 축이 없습니다)`
      : `\n     🔴 포지션마다 다릅니다 — 동네가 능력치·포지션을 타기 시작했어요`));
}

console.log("\n── 🔒 T-4. 바닥 0.90 · 천장 1.10을 안 벗어난다 ──");

/* 🔴 표본이 아니라 **정의역 전체**를 봅니다 — 동네 점수는 0~6, 그게 전부예요. */
function boundsOf(h, seeds, n) {
  let lo = Infinity, hi = -Infinity, bad = 0, hitLo = 0, hitHi = 0, tot = 0;
  const byScore = {};
  for (const s of seeds) {
    h.seed(s);
    for (let sc = SCORE_MIN; sc <= SCORE_MAX; sc++) {
      byScore[sc] = byScore[sc] || { lo: Infinity, hi: -Infinity };
      for (let i = 0; i < n; i++) {
        const off = h.T._t.rollOffers(sc);
        for (const m of h.MK) {
          const v = off[m.id] && off[m.id].mul;
          tot += 1;
          if (typeof v !== "number" || !isFinite(v)) { bad += 1; continue; }
          lo = Math.min(lo, v); hi = Math.max(hi, v);
          byScore[sc].lo = Math.min(byScore[sc].lo, v);
          byScore[sc].hi = Math.max(byScore[sc].hi, v);
          if (v === FLOOR) hitLo += 1;
          if (v === CEIL) hitHi += 1;
        }
      }
    }
  }
  return { lo, hi, bad, hitLo, hitHi, tot, byScore };
}

const B = boundsOf(H, SEEDS, 400);
check(B.bad === 0 && B.lo >= FLOOR && B.hi <= CEIL,
  `T-4. 🔒 점수 ${SCORE_MIN}~${SCORE_MAX} **전 구간**에서 배수가 [${FLOOR.toFixed(2)}, ${CEIL.toFixed(2)}]을 안 벗어난다`
  + ` (${B.tot.toLocaleString()}장)`
  + `\n     실제 폭 ${B.lo.toFixed(2)} ~ ${B.hi.toFixed(2)}`
  + (B.bad ? `\n     🔴 배수가 숫자가 아닌 장 ${B.bad}건 — 표 밖 칸을 집었어요(clamp가 없어졌나요?)` : ""));
check(B.hitLo > 0 && B.hitHi > 0,
  `T-4a. 🔒 바닥 ${FLOOR.toFixed(2)}·천장 ${CEIL.toFixed(2)}이 **실제로 닿는다** (닿은 장 ${B.hitLo} · ${B.hitHi})`
  + `\n     🔑 이게 없으면 T-4는 "아무 데도 안 닿아서 통과"입니다 — 측정 조건을 스스로 찍는 자리예요`
  + `\n     점수별 폭: ${Object.keys(B.byScore).map((k) => `${k}점 ${B.byScore[k].lo.toFixed(2)}~${B.byScore[k].hi.toFixed(2)}`).join(" · ")}`);

/* 🔑 관계 검사 — ±1칸이 **좌우 대칭**이라는 것이 중립의 기계장치입니다.
 *    배수 표를 안 읽고, 한 점수에서 나온 칸들의 **위/아래 개수**만 셉니다. */
{
  H.seed(SEEDS[1]);
  const SC = 3;                      // 클램프에 안 닿는 한가운데 점수
  const cnt = {};
  const M = 20000;
  for (let i = 0; i < M; i++) {
    const off = H.T._t.rollOffers(SC);
    for (const m of H.MK) { const t = off[m.id].tier; cnt[t] = (cnt[t] || 0) + 1; }
  }
  const tiers = Object.keys(cnt).map(Number).sort((a, b) => a - b);
  const mid = tiers[Math.floor(tiers.length / 2)];
  const below = tiers.filter((t) => t < mid).reduce((a, t) => a + cnt[t], 0);
  const above = tiers.filter((t) => t > mid).reduce((a, t) => a + cnt[t], 0);
  const tot = below + above + (cnt[mid] || 0);
  const gap = Math.abs(below - above) / tot;
  check(tiers.length === 3 && gap <= SYM_EPS,
    `T-4b. 🔒 ±1칸 흔들림이 **좌우 대칭**이다 — 점수 ${SC}에서 아래로 ${below} ↔ 위로 ${above}`
    + ` (차이 ${(gap * 100).toFixed(2)}% · 문턱 ${(SYM_EPS * 100).toFixed(0)}%)`
    + `\n     칸 ${tiers.join("/")} — ${tiers.map((t) => `${t}:${(cnt[t] / tot * 100).toFixed(1)}%`).join(" · ")}`
    + (tiers.length === 3 ? "" : `\n     🔴 칸이 3개가 아니에요 — 흔들림 폭이 바뀌었습니다`)
    + `\n     🔑 대칭이 곧 중립의 기계장치예요. 한쪽만 키우면 그건 흔들림이 아니라 **난이도 조정**입니다`);
}

H.close();

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — 고치기 전에 **빨간불이 뜨는지** 반드시 확인합니다
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");

function neutralUnder(name) {
  const h = harness(MUT[name]);
  const means = SEEDS.map((s) => runNeutral(h, s, "wg", N).mean);
  h.close();
  return means;
}

for (const [name, label] of [
  ["M_C_BAND", "🧪 **변이 M-C — 밴드를 `0~2 / 3~4 / 5~6`으로**"],
  ["M_C2_SHAKE", "🧪 **변이 M-C2 — 흔들림을 `0.10 / 0.50 / 0.40`으로(한쪽만 키움)**"],
]) {
  if (!mutOK(name)) { check(false, `${label}${MUT_DEAD}`); continue; }
  const means = neutralUnder(name);
  const out = means.filter((v) => Math.abs(v - NEUTRAL) > EPS);
  check(out.length === means.length,
    `${label} → T-1이 시드 ${means.length}개 **전부**에서 빨간불`
    + `\n     ${means.map((v) => `${v.toFixed(5)}(${((v - NEUTRAL) * 100).toFixed(2)}%)`).join(" · ")}`
    + (out.length === means.length
      ? `\n     ✔ 벗어난 폭이 문턱 ±${(EPS * 100).toFixed(1)}%의 ${(Math.abs(means[0] - NEUTRAL) / EPS).toFixed(1)}배 — 잡음이 아니라 신호예요`
      : `\n     🔴 아직 통과하는 시드가 ${means.length - out.length}개 — 그 시드에서는 아무것도 안 지키고 있어요`));
}

/* 🧪 M-C3 — 바닥을 0.80으로. T-4가 갈려야 합니다. */
if (!mutOK("M_C3_FLOOR")) check(false, `🧪 **변이 M-C3 — 바닥을 0.80으로**${MUT_DEAD}`);
else {
  const h = harness(MUT.M_C3_FLOOR);
  const b = boundsOf(h, [SEEDS[0]], 400);
  h.close();
  check(b.lo < FLOOR,
    `🧪 **변이 M-C3 — 바닥을 0.80으로** → T-4가 빨간불 (실제 폭 ${b.lo.toFixed(2)} ~ ${b.hi.toFixed(2)})`
    + (b.lo < FLOOR ? "" : `\n     🔴 바닥을 내렸는데 T-4가 아직 초록불이에요 — 아무것도 안 지키고 있습니다`));
}

/* 🧪 M-G — clamp를 빼고 흔들림을 ±2로. 표 밖 칸을 집어 배수가 사라집니다.
 * ⚠️ 이 변이는 **던질 수도 있어요**(`OFFER[tier]`가 undefined). 던지는 것도
 *    "빨간불"로 셉니다 — 다만 어느 쪽이었는지 화면에 적습니다. */
if (!mutOK("M_G_NOCLAMP")) check(false, `🧪 **변이 M-G — clamp 제거 + 흔들림 ±2**${MUT_DEAD}`);
else {
  let how = "", caught = false;
  try {
    const h = harness(MUT.M_G_NOCLAMP);
    const b = boundsOf(h, [SEEDS[0]], 200);
    h.close();
    caught = b.bad > 0 || b.lo < FLOOR || b.hi > CEIL;
    how = b.bad ? `배수가 사라진 장 ${b.bad}건` : `실제 폭 ${b.lo.toFixed(2)} ~ ${b.hi.toFixed(2)}`;
  } catch (e) {
    caught = true; how = `그 자리에서 던졌어요 — ${String(e.message).slice(0, 60)}`;
  }
  check(caught, `🧪 **변이 M-G — clamp 제거 + 흔들림 ±2** → T-4가 빨간불 (${how})`);
}

/* ---------- 마무리 ---------- */
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
console.log("\n✅ 통과");
process.exit(0);
