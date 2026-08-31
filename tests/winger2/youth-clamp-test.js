/* ⚽ 더 윙어 II — 📐 **비율 clamp가 유스 창의 어디에 닿는가** (N-3 · N-4)
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-08-31 · engineer 84번 §3-1b·§3-1c·§6-3 · designer 87번)
 *
 *   · 유스 카드의 중심은 `YOUTH_CARD_P[kind] × clamp(overall() ÷ PEER_REF[무대], 0.60, 1.40)`
 *   · 🔴 **비율이 clamp에 「붙어 사는」 상태가 되면 축이 통째로 죽습니다.**
 *     성공률 값만 보면 정상으로 보이는 자리예요 — N-1(중립점)도 N-2(기울기)도 못 잡습니다.
 *     기준선 근처에 아무도 없어도 **그 점에서의 중립성은 그대로 성립**하니까요
 *   · ⚠️ **아래 clamp는 1년차 최하위권에 「일부러」 닿습니다** — 1년차에 카드가 거의 안 되는
 *     판을 막는 **설계된 바닥**이에요. 거기까지 "안 걸린다"로 쓰면 검사가 바로 빨간불입니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **백분위로 재지 않습니다** (designer 87번)
 * ─────────────────────────────────────────────────────────────────────────
 * 처음 자는 `25~75% 백분위가 기준선을 감싸는가`였는데 designer가 **자가 틀렸다**고 판정했어요:
 *
 *   > N-4가 지키려는 실패는 **「clamp에 붙어 축이 죽음」**인데 **백분위는 분포 모양에 흔들린다.**
 *   > 등급 D 바닥이 그 증거고 등급 문턱이 바뀌면 또 흔들린다 — **재려던 것과 다른 걸 재는 자**다.
 *
 * ✅ 그래서 **「clamp가 실제로 물렸는가」**를 셉니다. 자르기 전 비율(`overall()÷ref`)과
 *    실제로 쓰인 비율(`autoP ÷ YOUTH_CARD_P[kind]`)이 **다르면 그 카드는 clamp에 닿은 것**이에요.
 *    🔒 이 자는 **clamp 폭을 모르고도** 잽니다 — 그래서 `YOUTH_SPAN`을 소스에서 안 읽어요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 것들
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`
 *   ② **게임 입구를 통해** 실제 버튼으로 36턴을 굴려요. 🏆 평가전 5회(15경기)와
 *      🔥 프로 도전(4라운드)에서 **진짜로 온 카드**만 셉니다 — 궤적을 지어내지 않아요
 *   ③ **문턱(2% · 10% · 0.75~1.25 · 16%)은 여기 박습니다.** `YOUTH_SPAN`·`PEER_REF`를
 *      소스에서 **읽지 않아요**
 *   ④ **시드 하나로 안 잽니다** — 20벌씩 세 블록으로 나눠 **블록별 값을 함께 찍습니다**
 *   ⑤ 종료 코드 3갈래 · 0번 변이 등록 검사
 *
 * ⏱️ 약 2분.
 */
"use strict";
const { bootPage, pageMutsOK } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 **문턱은 여기 박습니다** — 소스에서 안 읽어요
 * ══════════════════════════════════════════════════════════════ */
const RUNS = 60;              // 한 벌 = 게임 입구 → 36턴 → 🏆 평가전 15경기 → 🔥 프로 도전 4라운드
const BLOCK = 20;             // 블록별로 나눠 찍습니다 (한 덩어리로 보면 흔들림이 안 보여요)
const MUT_RUNS = 10;          // 변이는 효과가 커서 적게 굴려도 갈립니다
const MID_MAX = 0.02;         // N-3: 2년차 이후 무대에서 clamp 접촉률 상한 (실측 0.0%)
const HI_MAX = 0.10;          // N-4a: 위 clamp 접촉률 상한 (designer 계약 · 실측 0.0%)
const MED_BAND = [0.75, 1.25];// N-4b: 중앙값 비율 (designer 계약 · 실측 🏆 0.865 · 🔥 0.972)
/* 🚧 N-4c — designer 계약은 **아래 접촉 ≤10%**인데 실측이 그 위에 붙어 있습니다.
 *    ⚠️ **현재값을 「정답」으로 단언하지 않습니다.** 여기는 *"여기까지는 알려진 상태"*예요.
 *    · 회귀 상한 `LO_CAP` — 이보다 나빠지면 ❌ (실측 10.0% · 20벌 블록 8.0~11.3%)
 *    · 승격 문턱 `LO_GOAL` — 이보다 좋아지면 ❌로 **"이제 designer 계약(≤10%)으로 올리세요"**
 *      (양방향이라 고치는 사람이 반드시 이 파일을 봅니다) */
const LO_CAP = 0.16;
const LO_GOAL = 0.06;
const DESIGNER_LO = 0.10;     // designer가 적은 계약값 — 기록용이지 판정에 안 씁니다
const POS = "wg";
const TRAIN_KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const REST_AT = 40;
/* 🗓️ 2년차 이후 무대 — N-3이 보는 자리입니다 (1년차는 **설계된 바닥**이라 뺍니다) */
const MID_STAGES = ["eval 2년6월", "eval 2년12월", "eval 3년6월", "survival 3년12월"];

/* ══════════════════════════════════════════════════════════════
 * 🧪 탐침·변이 — **0번이 먼저 소스와 대조합니다**
 * ══════════════════════════════════════════════════════════════ */
const AUTOP_LINE = / {2}const autoP = youthAutoP\(kind, overall\(\), ev && ev\.kind === "survival" \? PEER_REF\.survival : PEER_REF\.eval\);/;
/* 📸 **계측 탐침** — 동작을 안 바꿉니다. 그 줄 뒤에 한 줄을 덧붙여
 *    「자르기 전 비율」과 「실제로 쓰인 중심」을 함께 걷어요. */
const PROBE = { "game.js": [[
  new RegExp(`(${AUTOP_LINE.source})`),
  `$1\n  if (window.__probe) window.__probe.push({ stage: ev && ev.kind, year: S.year, month: S.month, x: overall(), ref: ev && ev.kind === "survival" ? PEER_REF.survival : PEER_REF.eval, autoP: autoP, base: YOUTH_CARD_P[kind] });`,
]] };
/* 🔬 **측정 변이** — 🔥 프로 도전의 라운드 판정을 늘 통과시킵니다.
 *    ⚠️ 카드의 중심은 **한 글자도 안 바꿉니다.** 바꾸는 것은 *"몇 라운드를 관측하느냐"*뿐이에요.
 *    안 걸면 1라운드에서 탈락한 벌만 표본에 남아 **잘 큰 쪽으로 치우칩니다**(생존 편향).
 *    engineer도 같은 이유로 이 변이를 썼어요 (84번 §3-3 각주). */
const ALLPASS = { "game.js": [[/ {4}const pass = Math\.random\(\) < p;/, "    const pass = true;"]] };

const MUT = {
  /* 🔴 clamp를 유스 창 한가운데로 좁힘 — **모두가 clamp에 붙어 축이 죽는** 그 모양 */
  TIGHT_SPAN: { "game.js": [[/^const YOUTH_SPAN = \[0\.60, 1\.40\];/m, "const YOUTH_SPAN = [0.95, 1.05];"]] },
  /* 🔴 기준선을 아래로 — 유스 전체가 **위 clamp에 붙습니다** */
  REF20: { "game.js": [[/^ {2}eval: 32\.0,/m, "  eval: 20.0,"]] },
  /* 🔴 기준선을 위로 — 유스 전체가 **아래 clamp에 붙습니다** */
  REF50: { "game.js": [[/^ {2}eval: 32\.0,/m, "  eval: 50.0,"]] },
};

{
  const table = Object.assign({ "0.PROBE": PROBE, "0.ALLPASS": ALLPASS }, MUT);
  const bad = pageMutsOK(table);
  const n = Object.values(table).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `0. 🔎 변이·탐침 정규식 ${n}개가 지금 beta/winger2/에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}
const mutOK = (name) => pageMutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 한 벌 = **게임 입구를 통해** 36턴을 실제 버튼으로 굴립니다
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function playthrough(seed, muts) {
  const game = PROBE["game.js"].concat(ALLPASS["game.js"], (muts && muts["game.js"]) || []);
  const W = bootPage({ muts: { "game.js": game }, keys: { "grow-auto-mini": "1" } });
  W.__probe = [];
  W.Math.random = mulberry32(seed);
  W.WingerEngine._t.seed(seed);      // 🎲 엔진 난수도 따로 박습니다 (_rng는 로드 때 잡혀요)
  const D = W.document;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what})`);
    for (const t of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true }));
    }
  };
  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  press(D.querySelector("#agency-list button"), "🏟️ 유스");
  press(D.querySelector(`#position-list .card[data-pos="${POS}"]`), `🎯 ${POS}`);
  press(D.getElementById("btn-prospect-start"), "btn-prospect-start");
  const S = () => W.__get("S");
  const screen = () => ((D.querySelector(".screen.active") || {}).id || "");
  let ti = 0, done = false;
  for (let guard = 0; guard < 300 && !done; guard++) {
    const go = D.querySelector(".go-game");
    if (go) {
      const kind = S().pendingStage.kind;
      press(go, `${kind} 출전`);
      for (let g = 0; g < 60; g++) {
        const nx = D.getElementById("btn-stage-next");
        if (!nx || nx.disabled) break;
        press(nx, nx.textContent);
        if (screen() !== "screen-stage") break;
      }
      if (kind === "survival") done = true;
      continue;
    }
    if (screen() !== "screen-main") break;
    /* 🏋️ **고루 훈련** — 6칸을 돌려가며, 컨디션이 낮으면 🛌 휴식.
     * ⚠️ 이건 **조작자 모델**이에요. 정책이 바뀌면 궤적이 바뀌고 이 파일의 실측도 바뀝니다 —
     *    그래서 아래 판정은 전부 **정책을 바꿔도 살아남을 폭**으로 잡았습니다(§ 문턱 주석). */
    const rest = S().condition < REST_AT;
    const btn = rest
      ? D.querySelector('#action-list .action-btn[data-key="__rest"]')
      : D.querySelector(`#action-list .action-btn[data-key="${TRAIN_KEYS[ti % 6]}"]`);
    if (!btn) break;
    if (!rest) ti += 1;
    press(btn, rest ? "🛌 휴식" : "🏋️ 훈련");
  }
  const out = { cards: W.__probe.slice(), errs: W.__errs.slice(), reached: done };
  W.close();
  return out;
}

/* 🔒 **clamp가 물렸나 — 폭을 모르고도 재는 자.**
 *    자르기 전 비율 `x/ref`와 실제로 쓰인 비율 `autoP/base`가 다르면 물린 겁니다. */
const raw = (c) => c.x / c.ref;
const eff = (c) => c.autoP / c.base;
const loHit = (c) => eff(c) > raw(c) + 1e-12;   // 아래 clamp가 끌어올림
const hiHit = (c) => eff(c) < raw(c) - 1e-12;   // 위 clamp가 끌어내림
const at = (c) => `${c.stage} ${c.year}년${c.month}월`;
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const pct = (x) => `${(100 * x).toFixed(1)}%`;

function gather(n, muts, seed0) {
  const runs = [];
  for (let i = 0; i < n; i++) runs.push(playthrough((seed0 || 20000) + i * 7919, muts));
  return runs;
}
function stats(cards) {
  if (!cards.length) return { n: 0 };
  return { n: cards.length,
    lo: cards.filter(loHit).length / cards.length,
    hi: cards.filter(hiHit).length / cards.length,
    med: q(cards.map(eff), 0.5),
    ovr: cards.reduce((a, c) => a + c.x, 0) / cards.length };
}

const base = gather(RUNS);
const cards = base.flatMap((r) => r.cards);
const EV = cards.filter((c) => c.stage === "eval");
const SV = cards.filter((c) => c.stage === "survival");

/* ══════════════════════════════════════════════════════════════
 * A. 🚪 표본이 진짜인가 — **측정 조건을 검사가 스스로 찍습니다**
 * ══════════════════════════════════════════════════════════════ */
{
  const errs = base.flatMap((r) => r.errs);
  const reached = base.filter((r) => r.reached).length;
  check(reached === RUNS && errs.length === 0,
    `A-0. 🚪 ${RUNS}벌 전부 **게임 입구 → 36턴 → 🏆 평가전 → 🔥 프로 도전**까지 실제 버튼으로 도달 (${reached}/${RUNS})`
    + (errs.length ? `\n     🔴 페이지 오류 ${errs.length}건 — ${errs[0]}` : ""));
  const byStage = {};
  for (const c of cards) (byStage[at(c)] = byStage[at(c)] || []).push(c);
  const order = Object.keys(byStage).sort();
  check(EV.length >= RUNS * 15 * 0.9 && SV.length >= RUNS * 4 * 0.9,
    `A-1. 🧪 측정 조건 — 🏆 평가전 카드 ${EV.length}장(기대 ${RUNS * 15}) · 🔥 프로 도전 카드 ${SV.length}장(기대 ${RUNS * 4})`
    + `\n     ${order.map((k) => { const s = stats(byStage[k]); return `${k} n=${s.n} ovr ${s.ovr.toFixed(1)} 아래${pct(s.lo)} 위${pct(s.hi)}`; }).join("\n     ")}`);
  global.__byStage = byStage;
}

/* ══════════════════════════════════════════════════════════════
 * B. 📐 **N-3 — clamp가 유스 창의 「가운데」를 안 먹는다**
 *
 * 🔴 이게 이번 버그의 **재발 형태**입니다 (engineer 84번 §6-2 ③):
 *    위 clamp가 창 안으로 내려오면 *"훈련해도 안 나아진다"* 가 **잘 큰 쪽에서 다시 생깁니다.**
 *    성공률 값만 봐서는 정상으로 보여요.
 * ⚠️ 1년차는 뺍니다 — **아래 clamp는 1년차 최하위권에 일부러 닿는 설계된 바닥**이에요.
 *    (그 칸은 아래 D절이 따로 봅니다)
 * ══════════════════════════════════════════════════════════════ */
{
  const byStage = global.__byStage;
  const rows = MID_STAGES.map((k) => ({ k, s: stats(byStage[k] || []) }));
  const bad = rows.filter((r) => !(r.s.n > 0) || r.s.lo + r.s.hi > MID_MAX);
  check(bad.length === 0,
    `B-1. 📐 **N-3** — 2년차 이후 무대에서는 clamp가 **거의 안 물린다** (무대별 접촉률 ≤ ${pct(MID_MAX)})`
    + `\n     ${rows.map((r) => `${r.k}: n=${r.s.n} 접촉 ${pct((r.s.lo || 0) + (r.s.hi || 0))} (아래 ${pct(r.s.lo || 0)} · 위 ${pct(r.s.hi || 0)}) 중앙비율 ${Number(r.s.med).toFixed(3)}`).join("\n     ")}`
    + (bad.length ? `\n     🔴 창 가운데가 clamp에 물렸어요 — 잘 큰 쪽에서 "훈련해도 안 나아진다"가 재발합니다` : ""));
}

/* ══════════════════════════════════════════════════════════════
 * C. 🎯 **N-4a·N-4b — 위 clamp 접촉률 · 중앙값 비율** (designer 계약)
 * ══════════════════════════════════════════════════════════════ */
{
  const S = { "🏆 평가전": stats(EV), "🔥 프로 도전": stats(SV) };
  const hiBad = Object.entries(S).filter(([, s]) => !(s.hi <= HI_MAX));
  check(hiBad.length === 0,
    `C-1. 🎯 **N-4a 위 clamp 접촉률 ≤ ${pct(HI_MAX)}**`
    + `\n     ${Object.entries(S).map(([k, s]) => `${k} ${pct(s.hi)} (n=${s.n})`).join(" · ")}`
    + (hiBad.length ? `\n     🔴 ${hiBad.map(([k, s]) => `${k} ${pct(s.hi)}`).join(" | ")}` : ""));
  const medBad = Object.entries(S).filter(([, s]) => !(s.med >= MED_BAND[0] && s.med <= MED_BAND[1]));
  check(medBad.length === 0,
    `C-2. 🎯 **N-4b 중앙값 비율 ${MED_BAND[0]} ~ ${MED_BAND[1]}**`
    + `\n     ${Object.entries(S).map(([k, s]) => `${k} ${Number(s.med).toFixed(3)} (평균 overall ${s.ovr.toFixed(1)})`).join(" · ")}`
    + (medBad.length ? `\n     🔴 ${medBad.map(([k, s]) => `${k} ${Number(s.med).toFixed(3)}`).join(" | ")}` : ""));
}

/* ══════════════════════════════════════════════════════════════
 * D. 🚧 **N-4c 아래 clamp 접촉률 — designer 계약(≤10%)에 여유가 없습니다**
 *
 * 🔴 **이 칸은 「통과」가 아니라 「알려진 상태」로 둡니다.**
 *    designer가 어림한 5%도, engineer가 60벌로 잰 7.7%도 아니고, 여기 60벌 실측은 **≈10%**예요.
 *    문턱 바로 위아래에 붙어 있어서 그대로 걸면 **고장이 아니라 우연으로 빨간불**이 됩니다.
 *
 * 📌 **접촉은 거의 전부 1년차입니다** (아래 표가 그걸 찍어요) — 즉 **설계된 바닥이 일하는 것**이지
 *    축이 죽는 신호가 아닙니다. 다만 ⚠️ **훈련 산식이 초반을 낮추면 이 칸이 먼저 움직여요.**
 *
 * 🔧 그래서 **양방향**으로 둡니다:
 *    · > ${LO_CAP} → ❌ 회귀 (더 나빠졌습니다)
 *    · ≤ ${LO_GOAL} → ❌ **승격하세요** — designer 계약 ≤10%를 여유 있게 지키게 됐으니
 *      이 절을 지우고 C절에 `아래 ≤ 0.10` 한 줄로 합치세요
 *    · 그 사이 → 🚧 (종료 0, 그러나 눈에 보이게)
 * ══════════════════════════════════════════════════════════════ */
{
  const s = stats(EV);
  const blocks = [];
  for (let i = 0; i < RUNS; i += BLOCK) {
    const c = base.slice(i, i + BLOCK).flatMap((r) => r.cards).filter((x) => x.stage === "eval");
    blocks.push(stats(c).lo);
  }
  const y1 = EV.filter((c) => c.year === 1);
  const y2 = EV.filter((c) => c.year !== 1);
  const line = `실측 ${pct(s.lo)} (20벌 블록: ${blocks.map(pct).join(" · ")})`
    + `\n     · 1년차 카드 ${y1.length}장 중 접촉 ${pct(stats(y1).lo)} · 2년차 이후 ${y2.length}장 중 ${pct(stats(y2).lo)}`
    + `\n     · designer 계약은 ≤${pct(DESIGNER_LO)}인데 실측이 그 위에 붙어 있어요 — **문턱을 더 조이지 마세요**`;
  if (s.lo > LO_CAP) {
    check(false, `D-1. ❌ **N-4c 회귀** — 아래 clamp 접촉률이 상한 ${pct(LO_CAP)}을 넘었습니다\n     ${line}`);
  } else if (s.lo <= LO_GOAL) {
    check(false, `D-1. ❌ **N-4c 승격하세요** — 아래 접촉률이 ${pct(LO_GOAL)} 밑으로 내려왔습니다`
      + `\n     ${line}`
      + `\n     🔧 이제 designer 계약(≤${pct(DESIGNER_LO)})을 여유 있게 지킵니다.`
      + ` **이 D절을 지우고 C절에 「아래 clamp 접촉률 ≤ ${DESIGNER_LO}」 한 줄로 합치세요.**`);
  } else {
    console.log(`🚧 D-1. **N-4c 아래 clamp 접촉률 — 알려진 상태** (회귀 상한 ${pct(LO_CAP)} · 승격 문턱 ${pct(LO_GOAL)})`
      + `\n     ${line}`
      + `\n     ⚠️ 이 줄은 **"이게 맞다"가 아니라 "여기까지는 알려진 상태"**입니다.`
      + ` 값을 움직일지 문턱을 다시 정할지는 designer·engineer의 몫이에요.`);
  }
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — **고치기 전에 빨간불이 뜨는지**
 *    기준선 B-1·C-1·C-2와 **같은 술어**를 그대로 다시 겁니다.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
function mutCheck(name, tag, why, want) {
  if (!mutOK(name)) { check(false, `${tag}. 🧪 ${why}${MUT_DEAD}`); return; }
  const runs = gather(MUT_RUNS, MUT[name], 31000);
  const cs = runs.flatMap((r) => r.cards);
  const ev = cs.filter((c) => c.stage === "eval");
  const byStage = {};
  for (const c of cs) (byStage[at(c)] = byStage[at(c)] || []).push(c);
  const mid = MID_STAGES.map((k) => ({ k, s: stats(byStage[k] || []) }));
  const res = {
    n3: mid.some((r) => !(r.s.n > 0) || r.s.lo + r.s.hi > MID_MAX),
    n4a: !(stats(ev).hi <= HI_MAX),
    n4b: !(stats(ev).med >= MED_BAND[0] && stats(ev).med <= MED_BAND[1]),
    lo: stats(ev).lo, hi: stats(ev).hi, med: stats(ev).med,
    mid: mid.map((r) => `${r.k} 접촉 ${pct((r.s.lo || 0) + (r.s.hi || 0))}`).join(" · "),
  };
  const hit = want(res);
  check(hit,
    `${tag}. 🧪 ${why} → 빨간불`
    + `\n     N-3 ${res.n3 ? "❌" : "🟢"} (${res.mid})`
    + ` | N-4a 위 ${pct(res.hi)} ${res.n4a ? "❌" : "🟢"} | N-4b 중앙 ${Number(res.med).toFixed(3)} ${res.n4b ? "❌" : "🟢"}`
    + ` | 아래 ${pct(res.lo)}`
    + (hit ? "" : `\n     🔴 변이를 넣었는데 **아직 초록불** — 이 검사가 그 실패를 안 잡습니다`));
}
mutCheck("TIGHT_SPAN", "M-C1",
  "**YOUTH_SPAN = [0.95, 1.05]** — 모두가 clamp에 붙어 축이 죽는 그 모양",
  (r) => r.n3);
mutCheck("REF20", "M-C2",
  "🏆 평가전 기준선 32.0 → **20.0** — 유스 전체가 위 clamp에 붙음",
  (r) => r.n3 && r.n4a && r.n4b);
mutCheck("REF50", "M-C3",
  "🏆 평가전 기준선 32.0 → **50.0** — 유스 전체가 아래 clamp에 붙음",
  (r) => r.n3 && r.n4b);

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
