/* ⚽ 더 윙어 II 1막 — ⛓️ **사슬** — 중립화 상수들이 서로를 따라 움직이는가 (20번 §4-2~4 · 22번 §4 · 24번 §4 · 26번 §2)
 *
 * 1막 수치의 사슬(12번 §8-2 🔗): **`COND_REF`(머리)** → `ACT1_SPOT`(포지션 넷의 경기당 순간을 맞춤) → `n_pos`(기록 칸을 맞춤) → `b` · `T`.
 * 🔒 **값을 박지 않습니다 — 관계만**(스킬 「종속값은 관계로」). 값은 balancer가 재고, 검사는 「맞춘 것이 아직 맞는가」를 봐요.
 *   A-1  `ACT1_SPOT` — 11월 기준 능력치(56) · 58:58 · 컨디션 51에서 **포지션 넷의 경기당 내 순간이 서로 ±10% 안**
 *   A-2  `buff`(내 줄의 `ACT1_SPOT`)를 빼면 → **±10%가 깨지고 공격수가 가장 먼저 무너진다**(20번 §4-2 「1.40 → 1.20」)
 *   C-1  `COND_REF` 사슬 — 머리를 옮기면(51 → 80 · 30) **A-1이 재는 관계가 예측한 쪽으로 움직인다**(종속이 살아 있다)
 *        80이면 경기 날 51이 덜 좋은 날이 되어 빅찬스(⚽ 결정)가 줄고 → 결정 카드를 먹는 공격수가 미드필더보다 순간을 덜 받아요
 *   R-1  `n_pos` — 능력치 고정 50 · 70 · 90에서 **네 포지션의 ⚽ 기록 칸이 서로 ±5% 안**(평가서와 같은 함수로 셈)
 *   R-2  `w_cs`(무실점 가중) = 0 — 무실점 수만 바꿔도 기록 칸이 **한 톨도 안 움직인다**(설계 빈칸을 조용히 채우지 않게 · 20번 §4-3)
 *   + 변이: `buff` 제거(A-2) · `condMul`을 빅찬스에서 뺌(C-1이 「안 움직임」으로 빨간불) · `n_pos` 넷을 같게(R-1) · 기록 칸에 무실점 항(R-2)
 *
 * 🌍 **이 사슬이 서 있는 세계** — 「1막 명단 = 나 + 우리 학교 동료 10(그중 내 포지션 첫 빈칸이 {rival} · 전력 +6)」(`world.js` `create`).
 *    `ACT1_SPOT`은 그 명단 위에서 잰 값이라 **검사도 진짜 `W2World.create` · `ourXI`로** 명단을 만듭니다(픽스처 명단으로 재면 다른 세계예요).
 *    명단 모양 · `FORMATION` · 포지션 무게 · `SPOT` · `NPC_SPOT` · `FLOOR_SHARE`가 움직이면 A-1이 먼저 웁니다 — 그건 「다시 재세요」 신호예요.
 * 🎲 세계 시드 · 엔진 시드를 고정(CRN) — 머리만 바꿔 견줄 때 차이가 잡음에 안 묻혀요. ⏱️ 약 40초.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { load, mutsOK, PAGE_DIR, mutsOKIn } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const WSRC = fs.readFileSync(path.join(PAGE_DIR, "world.js"), "utf8");
const SSRC = fs.readFileSync(path.join(PAGE_DIR, "sheet.js"), "utf8");
const worldOf = (E, src) => new Function("window", `${src}\nreturn window.W2World;`)({ WingerEngine: E });
const sheetOf = (src) => new Function("window", `${src}\nreturn window.W2Sheet;`)({});
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const POS = ["fw", "wg", "mf", "df"];

/* 🔒 문턱 — 여기 박습니다(값은 20번 §4에서) */
const SPOT_BAND = 10;   // % — A-1 (28번 R2 ⑤ 「같은 칸 최대 ÷ 최소 ≤ 1.2」의 관계 · v2 실측 0.49%)
/* 🔄 v2 다시 유도 — A-2: buff를 빼면 28번 전엔 벌어짐 11%(±10% 밖)였으나 27번 규칙이 판을 눌러 **5.6%**(공격수가 가장 낮음은 그대로).
 *    ±10%는 설계 합격선이라 A-1에 그대로 두고, A-2는 「buff가 대등을 떠받친다」를 기준선과의 관계로 봅니다:
 *    벌어짐이 기준선(0.49%)의 **5배 넘게**(표본 잡음 σ ≈ 0.38% — 9,000판 · 판 SD ≈ 0.9) · 공격수가 가장 먼저 무너짐 · 평균이 30% 넘게 떨어짐 */
const BUFF_SPREAD_X = 5, BUFF_DROP = 0.30;
const NPOS_BAND = 5;    // % — R-1 (실측 2.4 · 2.5 · 3.3% · 표본 2만 4천 경기/칸)
/* 🔄 v2 다시 유도(39번 §1 · 30번 v2) — 27번 규칙(최소 1 · 상한 4 · 간격 15)이 경기당 판을 2.3~2.8로 눌러 사슬의 **크기**가 줄었어요.
 *    C-1 실측(공통 난수 · 기준 시드 셋 5000 · 6000 · 7000): 80이면 −0.34 · −0.37 · −0.81% · 30이면 +0.20 · +0.66 · +0.16% —
 *    방향은 셋 다 예측대로 · 크기만 2.5% → 0.2~0.8%. 변이(빅찬스에서 condMul을 뺌)는 공통 난수라 **정확히 0.00%**.
 *    → 선 0.1%: 실측 최소 0.16%보다 아래 · 변이 0보다 위(뜻 — 「머리를 옮기면 관계가 예측한 쪽으로 움직인다」 — 그대로) */
const CHAIN_MIN = 0.1;  // %

const MUT_W = { NOBUFF: [[/buff: \{ g: sp, a: sp, d: sp \} \};/, "buff: { g: 1, a: 1, d: 1 } };"]] };
const MUT_E = {
  REF80: [[/const COND_REF = \d+;/, "const COND_REF = 80;"]],
  REF30: [[/const COND_REF = \d+;/, "const COND_REF = 30;"]],
  NOCOND_BIG: [[/ \* \(clutchOn \? CLUTCH : 1\) \* condMul\(cond\), 0, 1\)\);/, " * (clutchOn ? CLUTCH : 1), 0, 1));"]],
};
const MUT_S = {
  NPOS_FLAT: [[/N_POS: \{ fw: [\d.]+, wg: [\d.]+, mf: [\d.]+, df: [\d.]+ \},/, "N_POS: { fw: 55, wg: 55, mf: 55, df: 55 },"]],
  WCS: [[/const raw = \(Number\(rec\.g\) \|\| 0\) \* ax\.g \+ \(Number\(rec\.a\) \|\| 0\) \* ax\.a \+ \(Number\(rec\.d\) \|\| 0\) \* ax\.d;/,
    "const raw = (Number(rec.g) || 0) * ax.g + (Number(rec.a) || 0) * ax.a + (Number(rec.d) || 0) * ax.d + (Number(rec.cs) || 0) * 0.5;"]],
};
{
  const bad = mutsOK(MUT_E).concat(mutsOKIn(WSRC, MUT_W, "world.js"), mutsOKIn(SSRC, MUT_S, "sheet.js"));
  check(bad.length === 0, `0. 변이 정규식 ${[MUT_E, MUT_W, MUT_S].reduce((a, t) => a + Object.values(t).reduce((b, m) => b + m.length, 0), 0)}개가 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const apply = (src, muts) => muts.reduce((s, [re, rep]) => s.replace(re, rep), src);

/* 포지션마다 — 진짜 1막 명단(세계 W벌 × 경기 M판) */
function spotProbe(E, X, base, W, M) {
  const out = {};
  for (const pos of POS) {
    let m = 0, n = 0;
    for (let w = 0; w < W; w++) {
      const S = { pos, name: "나", stats: Object.fromEntries(K6.map((k) => [k, 56])), world: X.create(base + w, pos, "m") };
      E._t.seed(base * 7 + w * 13); E._t.skill = 0.5;
      for (let i = 0; i < M; i++) { m += E._t.playMatch({ xi: X.ourXI(S), teamStr: 58, oppStr: 58, condition: 51 }).mineCards; n += 1; }
    }
    out[pos] = m / n;
  }
  return out;
}
const devOf = (o) => { const v = POS.map((p) => o[p]); const mean = v.reduce((a, b) => a + b, 0) / v.length; return { max: Math.max(...v.map((x) => Math.abs(x / mean - 1))) * 100, mean }; };
const fmt = (o, d) => POS.map((p) => `${p} ${o[p].toFixed(d || 3)}`).join(" · ");

/* 기록 칸 — 평가서와 **같은 함수**(`W2Sheet.compute`)에 경기당 기록을 넣어 셉니다(산식을 베끼지 않아요) */
function recProbe(E, X, SH, ab, W, M) {
  const out = {};
  for (const pos of POS) {
    let g = 0, a = 0, d = 0, n = 0;
    for (let w = 0; w < W; w++) {
      const S = { pos, name: "나", stats: Object.fromEntries(K6.map((k) => [k, ab])), world: X.create(3000 + w, pos, "m") };
      E._t.seed(91 + w * 17); E._t.skill = 0.5;
      for (let i = 0; i < M; i++) {
        const r = E._t.playMatch({ xi: X.ourXI(S), teamStr: 58, oppStr: [52, 55, 58, 61, 66][i % 5], condition: 51 });
        g += r.myGoals; a += r.assists; d += r.defense; n += 1;
      }
    }
    const sheet = SH.compute({ pos, stats: Object.fromEntries(K6.map((k) => [k, ab])), record: { apps: n, g, a, d, cs: 0, sN: 0 }, world: { cup: {} }, trust: 0 }, true);
    out[pos] = sheet.cols.find((c) => c.k === "record").v;
  }
  return out;
}

(async () => {
  /* ══════════ A-1 · A-2 ══════════ */
  const E = load();
  const X = worldOf(E, WSRC);
  const a1 = spotProbe(E, X, 1000, 300, 30);
  const d1 = devOf(a1);
  console.log(`   🔎 측정 조건 — 진짜 1막 명단(\`W2World.create\` · \`ourXI\`) 세계 300벌 × 30판 = 포지션마다 9,000판 · 능력치 여섯 모두 56 · 전력 58:58 · 컨디션 51 · s 0.5`);
  check(d1.max <= SPOT_BAND, `A-1. ⛓️ \`ACT1_SPOT\` — 포지션 넷의 경기당 내 순간이 서로 ±${SPOT_BAND}% 안 — ${fmt(a1)} (평균에서 최대 ${d1.max.toFixed(2)}%)`);
  const XN = worldOf(E, apply(WSRC, MUT_W.NOBUFF));
  const a2 = spotProbe(E, XN, 1000, 300, 30);
  const d2 = devOf(a2);
  const minPos = POS.slice().sort((p, q) => a2[p] - a2[q])[0];
  check(d2.max > BUFF_SPREAD_X * d1.max && d2.mean < (1 - BUFF_DROP) * d1.mean && minPos === "fw", `A-2. 🧪 \`buff\`를 빼면 → 벌어짐 ${d1.max.toFixed(2)}% → ${d2.max.toFixed(2)}%(> ${BUFF_SPREAD_X}배) · 평균 ${d1.mean.toFixed(2)} → ${d2.mean.toFixed(2)}(−${((1 - d2.mean / d1.mean) * 100).toFixed(0)}% · > ${BUFF_DROP * 100}%) · **공격수가 가장 먼저 무너진다**(가장 낮은 자리 ${minPos}) — ${fmt(a2)}`);

  /* ══════════ C-1 — 사슬의 머리 ══════════ */
  async function chain(engineMuts) {
    const E0 = load(engineMuts || []);
    const base = spotProbe(E0, worldOf(E0, WSRC), 5000, 300, 30);
    const E8 = load((engineMuts || []).concat(MUT_E.REF80));
    const hi = spotProbe(E8, worldOf(E8, WSRC), 5000, 300, 30);
    const E3 = load((engineMuts || []).concat(MUT_E.REF30));
    const lo = spotProbe(E3, worldOf(E3, WSRC), 5000, 300, 30);
    const r = (o) => o.fw / o.mf;
    return { d80: (r(hi) / r(base) - 1) * 100, d30: (r(lo) / r(base) - 1) * 100, base: r(base) };
  }
  const c1 = await chain(null);
  const okC = (c) => c.d80 <= -CHAIN_MIN && c.d30 >= CHAIN_MIN;
  check(okC(c1), `C-1. ⛓️ \`COND_REF\` 사슬이 살아 있다 — 머리를 51 → 80으로 옮기면 공격수/미드 순간 비가 ${c1.d80.toFixed(2)}% · 30으로 옮기면 ${c1.d30 >= 0 ? "+" : ""}${c1.d30.toFixed(2)}% (예측: 80이면 ↓ · 30이면 ↑ · |≥${CHAIN_MIN}%|)`
    + `\n     🔑 \`ACT1_SPOT\`은 \`COND_REF\` 51 위에서 잰 값이에요(12번 §8-2) — 머리가 움직이면 **이 관계가 따라 움직여야** 다시 잴 이유가 생깁니다`);
  const c2 = await chain(MUT_E.NOCOND_BIG);
  check(!okC(c2), `C-1-변이. 🧪 빅찬스 확률에서 \`condMul\`을 빼면 → 머리를 옮겨도 관계가 **안 움직여** C-1이 빨간불 (80: ${c2.d80.toFixed(2)}% · 30: ${c2.d30.toFixed(2)}%)`);

  /* ══════════ R-1 · R-2 ══════════ */
  const SH = sheetOf(SSRC);
  const rows = {};
  for (const ab of [50, 70, 90]) rows[ab] = recProbe(E, X, SH, ab, 600, 40);
  const devs = Object.fromEntries(Object.entries(rows).map(([ab, o]) => [ab, devOf(o).max]));
  console.log(`   🔎 측정 조건 — 진짜 1막 명단 · 세계 600벌 × 40판 = 칸마다 24,000판 · 상대 52/55/58/61/66 돌림 · 컨디션 51 · s 0.5 · 기록 칸은 \`W2Sheet.compute\`가 셈`);
  check(Object.values(devs).every((v) => v <= NPOS_BAND), `R-1. ⛓️ \`n_pos\` — 능력치 50 · 70 · 90에서 네 포지션의 ⚽ 기록 칸이 서로 ±${NPOS_BAND}% 안`
    + Object.entries(rows).map(([ab, o]) => `\n     능력치 ${ab}: ${fmt(o, 2)} (최대 ${devs[ab].toFixed(2)}%)`).join(""));
  {
    const SHm = sheetOf(apply(SSRC, MUT_S.NPOS_FLAT));
    const m = recProbe(E, X, SHm, 70, 300, 40);
    check(devOf(m).max > NPOS_BAND, `R-1-변이. 🧪 \`n_pos\` 넷을 같게(55) 하면 → R-1이 빨간불 (능력치 70: ${fmt(m, 2)} · 최대 ${devOf(m).max.toFixed(2)}%)`);
  }
  {
    /* 🔒 기록 칸이 **상한(40) 밑**인 판이어야 움직임을 볼 수 있어요 — 상한에 붙은 판은 무엇을 넣어도 40이라 R-2가 공짜로 참이 됩니다 */
    const S0 = { pos: "df", stats: Object.fromEntries(K6.map((k) => [k, 60])), record: { apps: 14, g: 1, a: 2, d: 8, cs: 0, sN: 0 }, world: { cup: {} }, trust: 0 };
    const vOf = (SHx, cs) => SHx.compute(Object.assign({}, S0, { record: Object.assign({}, S0.record, { cs }) }), true).cols.find((c) => c.k === "record").v;
    const same = [0, 3, 7, 14].map((cs) => vOf(SH, cs));
    check(same.every((v) => v === same[0]) && same[0] < 40, `R-2. ⛓️ \`w_cs\` = 0 — 무실점 수만 0 · 3 · 7 · 14로 바꿔도 기록 칸이 ${same.join(" · ")} (한 톨도 안 움직임 · 상한 40 밑의 판)`);
    const SHw = sheetOf(apply(SSRC, MUT_S.WCS));
    const moved = [0, 3, 7, 14].map((cs) => vOf(SHw, cs));
    check(!moved.every((v) => v === moved[0]), `R-2-변이. 🧪 기록 칸에 무실점 항을 넣으면 → R-2가 빨간불 (${moved.join(" · ")})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
