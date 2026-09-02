/* ⚽ 더 윙어 II — 🎚️ 유스 순간 카드의 **세기 손잡이(`YOUTH_CARD_P`)가 중립인가**
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 2026-08-31에 **한 번 뒤집혔습니다**
 * ═════════════════════════════════════════════════════════════════════════
 *
 * 🪦 **옛 세계 (2026-08-30 · engineer 80번 §2)**
 *    > *"유스 카드의 중심 `autoP`는 **상수**다. 능력치는 `half(a)`(조작 폭)에만 남는다."*
 *    이 파일의 옛 `A-1`은 그 문장을 **모든 능력치에서** 지키고 있었어요.
 *
 * 🔴 **그런데 그건 「고칠 버그」였습니다** (engineer 84번 · designer 86·87번).
 *    36턴을 훈련해도 유스 카드가 안 나아지던 상태였고, **옛 `A-1`이 그 상태를 계약으로
 *    단언**하고 있었어요 — CLAUDE.md 표의 *「버그를 정답으로 단언」* 그 칸입니다.
 *    되돌리면 초록불, 고치면 빨간불이었습니다.
 *
 * ✅ **새 세계 (지금)**
 *      autoP = YOUTH_CARD_P[kind] × clamp( overall() ÷ PEER_REF[무대], 0.60, 1.40 )
 *    → **중심이 능력치를 탑니다.**
 *
 * 🔑 **옛 `A-1`은 「폐기」가 아니라 「쪼개기」였습니다** (84번 §6-2b · designer가 못박음).
 *    한 문장에 계약이 둘 묶여 있었어요:
 *      · **중립성** — 기준선에 선 유망주는 등급 ±1칸 기댓값이 0  🟢 **살아 있습니다**(원칙 ④)
 *      · **"모든 능력치에서"**                                   🔴 이번에 깬 것은 이쪽뿐
 *    ⚠️ 「A-1 폐기」로만 기억하면 다음 사람이 **중립성까지 버립니다.**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🧭 **이 파일이 지금 맡는 것 — `YOUTH_CARD_P` 한 표뿐입니다**
 * ─────────────────────────────────────────────────────────────────────────
 * `YOUTH_CARD_P`는 **balancer의 세기 손잡이**예요 (`PEER_REF`는 손잡이가 아닙니다 —
 * 중립화 상수입니다). 이 표가 움직이면 유스 곡선이 통째로 따라옵니다.
 *
 *   · 능력치 축(N-1 · N-1b · N-2 · N-3b · N-5)은 **`youth-ability-test.js`**가 봅니다
 *   · clamp 접촉(N-3 · N-4)은 **`youth-clamp-test.js`**가 봅니다
 *   · 승부처가 v2 카드로 열리는 배선은 **`youth-moment-test.js`**가 봅니다
 *
 * 🪦 **옛 `M-P3`(PRO_CENTER)은 여기서 은퇴했습니다.**
 *    *"폐기된 「프로의 중심」(`mid(a)`)을 유스에 되살리면 빨간불"* 이라는 변이였는데,
 *    그 변이가 지키던 문장(*"중심은 능력치를 안 탄다"*)이 **이번에 뒤집혔어요.**
 *    지금 지켜야 하는 것은 *"중심이 능력치를 탄다"*이고, **자가 맞는가**는
 *    `youth-ability-test.js`의 M4(`blendOf` 자로 갈아치우기)가 봅니다.
 *    🔴 되살리지 마세요 — 되살리면 **고친 것을 되돌려야 초록불**이 되는 상태로 돌아갑니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 것들
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`
 *   ② **진짜 `playYouthMoment`를 부릅니다** (🤖 자동 진행 갈래 `cb(judge(0.5), T)`)
 *   ③ **게임 입구를 통해** 실제 버튼으로 🏆 평가전 무대까지 갑니다
 *   ④ **문턱(0.025)과 기준선(32.0)은 여기 박습니다** — `PEER_REF`를 소스에서 안 읽어요
 *   ⑤ **시드 하나로 안 잽니다** — 엔진 난수(`_t.seed`)를 시드마다 박습니다
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 * ⏱️ 약 20초.
 */
"use strict";
const { bootPage, pageMutsOK, passTown, seedBoth }
  = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 **문턱·기준선은 여기 박습니다** — 소스에서 안 읽어요
 * ══════════════════════════════════════════════════════════════ */
const N = 40000;
const BAND = 0.025;       // |perfect − miss| 문턱 (잡음 1σ의 5배)
const SIGMA_MIN = 4;
/* 🎯 🏆 평가전 기준선 — 여기서만 중립이 성립합니다 (`PEER_REF.eval`의 계약값) */
const REF_EVAL = 32.0;
const KINDS = [["g", "⚽ 결정"], ["a", "🅰️ 전개"], ["d", "🧱 수비"]];
const SEEDS = [11, 23, 37];
const POS = "wg";
const TRAIN_KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const REST_AT = 40;

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 — 0번이 먼저 소스와 대조합니다
 * ══════════════════════════════════════════════════════════════ */
const CARD_P_LINE = /const YOUTH_CARD_P = \{ goal: 1 \/ 3, assist: 1 \/ 3, defend: 0\.5 \};/;
const MUT = {
  /* 🔴 M-P1 — ⚽ 결정의 세기를 옮김. 등급 기댓값이 +0.175칸으로 기울어요 */
  P_GOAL: { "game.js": [[CARD_P_LINE, "const YOUTH_CARD_P = { goal: 0.45, assist: 1 / 3, defend: 0.5 };"]] },
  /* 🔴 M-P2 — 🧱 수비의 세기를 옮김 (이분이라 기울기가 더 큽니다) */
  P_DEFEND: { "game.js": [[CARD_P_LINE, "const YOUTH_CARD_P = { goal: 1 / 3, assist: 1 / 3, defend: 0.65 };"]] },
  /* 🔴 **M-P4 — v1 자동 판정(`autoRes`)으로 조용히 떨어집니다.**
   *    엔진이나 미니게임이 안 실렸을 때의 폴백인데, 늘 그리로 가면 판정 종류부터
   *    달라져요(`good`) — 유스 승부처가 통째로 v1으로 복귀한 겁니다. */
  FALLBACK: { "game.js": [[/ {2}if \(!E \|\| !E\.judgeAtP \|\| !M \|\| !M\.play\) \{ playRandomMini\(container, cb\); return; \}/,
    "  if (true) { playRandomMini(container, cb); return; }"]] },
};
{
  const bad = pageMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `0. 🔎 변이 정규식 ${n}개가 지금 beta/winger2/에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}
const mutOK = (name) => pageMutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해** 🏆 평가전 무대까지
 * ══════════════════════════════════════════════════════════════ */
/* 🎲 시드는 `_load.js`의 `seedBoth`가 **갈라서** 겁니다 — 두 난수원(`Math.random` ·
 * `WingerEngine._t`)에 같은 시드를 걸면 앞 1,000개가 **1000/1000 일치**해서 보폭이
 * 맞아 lockstep이 나요 (109번 §4 · `seed-split-test.js`가 지킵니다). */
function sweep(seed, muts) {
  const W = bootPage({ muts, keys: { "grow-auto-mini": "1" } });
  seedBoth(W, seed);              // 🎲 엔진 난수는 **갈린 시드로** 따로 박아야 걸려요 (_rng는 로드 때 잡힘)
  const D = W.document;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what})`);
    for (const t of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true }));
    }
  };
  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  /* 🏘️ 동네 3장 — 이 파일은 `grow-auto-mini`를 켜고 뜨므로 그대로 지나갑니다 (85번 「순-B」) */
  press(D.querySelector(`#position-list .card[data-pos="${POS}"]`), `📍 ${POS}`);
  passTown(W, press);
  press(D.querySelector("#agency-list button"), "🏟️ 입단 제안");
  press(D.getElementById("btn-prospect-start"), "btn-prospect-start");
  const S = () => W.__get("S");
  const screen = () => ((D.querySelector(".screen.active") || {}).id || "");
  /* 🏆 첫 평가전 버튼이 열릴 때까지 고루 훈련 — **그 무대에 들어간 채로** 멈춥니다
   *    (`ev`를 손으로 만들지 않아요 — 무대 구분은 게임의 `startEval`이 정합니다) */
  let ok = false, ti = 0;
  for (let guard = 0; guard < 60; guard++) {
    const go = D.querySelector(".go-game");
    if (go) { press(go, "🏆 평가전 출전"); ok = true; break; }
    if (screen() !== "screen-main") break;
    const rest = S().condition < REST_AT;
    const btn = rest
      ? D.querySelector('#action-list .action-btn[data-key="__rest"]')
      : D.querySelector(`#action-list .action-btn[data-key="${TRAIN_KEYS[ti % 6]}"]`);
    if (!btn) break;
    if (!rest) ti += 1;
    press(btn, rest ? "🛌 휴식" : "🏋️ 훈련");
  }
  const rows = [];
  let got = NaN;
  if (ok) {
    /* 🎚️ `overall()`이 정확히 기준선이 되게 맞춥니다 — `overall()`은 칸 값에 정비례해요 */
    const St = S(), ov = W.__get("overall");
    for (const k of Object.keys(St.stats)) St.stats[k] = 100;
    const c = ov() / 100;
    for (const k of Object.keys(St.stats)) St.stats[k] = REF_EVAL / c;
    got = ov();
    const play = W.__get("playYouthMoment");
    const E = W.WingerEngine;
    const ability = E.blendOf({ pos: St.pos, stats: W.WingerProspect.nowStats(St) });
    for (const [kindKey, label] of KINDS) {
      const cnt = { perfect: 0, ok: 0, miss: 0, other: 0 };
      for (let i = 0; i < N; i++) {
        play(null, (res) => { if (res in cnt) cnt[res] += 1; else cnt.other += 1; }, kindKey);
      }
      rows.push({ kindKey, label, ability, got,
        p: cnt.perfect / N, o: cnt.ok / N, m: cnt.miss / N, other: cnt.other });
    }
  }
  const errs = W.__errs.slice();
  W.close();
  return { ok, rows, errs, got };
}

const sd = (p) => Math.sqrt((p < 0.4 ? 2 / 3 : 1) / N);
const fmt = (r) => `${r.label} ovr${r.got.toFixed(1)}: p${r.p.toFixed(4)} o${r.o.toFixed(4)} m${r.m.toFixed(4)} Δ${(r.p - r.m >= 0 ? "+" : "")}${(r.p - r.m).toFixed(4)}${r.other ? ` · 다른 판정 ${r.other}건` : ""}`;

/* ══════════════════════════════════════════════════════════════
 * Y. 🎯 기준선에서의 **중립** — M-P1·M-P2의 술어입니다
 *
 * 🔒 이 술어는 `youth-ability-test.js`의 N-1과 **같은 문장**이에요.
 *    여기서는 그걸 **`YOUTH_CARD_P`를 흔들었을 때 무너지는지** 보는 데 씁니다.
 * ══════════════════════════════════════════════════════════════ */
const base = SEEDS.map((seed) => Object.assign({ seed }, sweep(seed)));
{
  const errs = base.flatMap((b) => b.errs);
  check(base.every((b) => b.ok) && errs.length === 0,
    `Y-0. 🚪 게임 입구 → 🏠 훈련장 → 🏆 **평가전 무대에 실제 버튼으로 도달** (시드 ${SEEDS.join(" ")})`
    + (errs.length ? `\n     🔴 페이지 오류 — ${errs[0]}` : "")
    + (base.every((b) => b.ok) ? "" : "\n     🔴 .go-game이 안 떴어요"));

  const bad = [];
  let worst = 0;
  for (const b of base) for (const r of b.rows) {
    const d = Math.abs(r.p - r.m);
    if (d > worst) worst = d;
    if (d > BAND) bad.push(`시드${b.seed} ${fmt(r)}`);
    if (r.other) bad.push(`시드${b.seed} ${r.label}: perfect/ok/miss 아닌 판정 ${r.other}건`);
  }
  check(bad.length === 0 && base.every((b) => b.ok),
    `Y-1. 🎯 **기준선(overall() = ${REF_EVAL})에서 perfect 빈도 = miss 빈도** — ${base.length * KINDS.length}칸 전부 |Δ| ≤ ${BAND}`
    + `\n     (= 등급 ±1칸 기댓값 0. **값을 베껴 적지 않고 굴려서** 확인했어요 · 칸마다 ${N}회)`
    + `\n     ⚠️ **"모든 능력치에서"가 아닙니다** — 그 반쪽은 2026-08-31에 폐기됐어요 (파일 머리말)`
    + `\n     최대 |Δ| = ${worst.toFixed(4)}`
    + (bad.length ? `\n     🔴 넘긴 칸 ${bad.length}개:\n       ${bad.slice(0, 6).join("\n       ")}` : ""));

  const s1 = Math.max(sd(1 / 3), sd(0.5));
  check(BAND >= SIGMA_MIN * s1,
    `Y-2. 📏 문턱 ${BAND}이 잡음 1σ(${s1.toFixed(4)})의 **${(BAND / s1).toFixed(1)}배** (≥${SIGMA_MIN}배)`
    + ` — 실측 최대 |Δ|는 ${(worst / s1).toFixed(1)}σ였어요`);
  console.log(`     기준선(시드 ${SEEDS[0]} · 능력치 ${base[0].rows.length ? base[0].rows[0].ability.toFixed(0) : "?"}):`
    + `\n       ${base[0].rows.map(fmt).join("\n       ")}`);
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — **고치기 전에 빨간불이 뜨는지**
 *    기준선 Y-1과 **같은 술어**를 그대로 다시 겁니다.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
function mutCheck(name, tag, why, want) {
  if (!mutOK(name)) { check(false, `${tag}. 🧪 ${why}${MUT_DEAD}`); return; }
  const { rows } = sweep(SEEDS[0], MUT[name]);
  const over = rows.filter((r) => Math.abs(r.p - r.m) > BAND || r.other > 0);
  const mx = rows.length ? Math.max(...rows.map((r) => Math.abs(r.p - r.m))) : NaN;
  const hit = rows.length > 0 && (want ? want(rows, over) : over.length > 0);
  check(hit,
    `${tag}. 🧪 ${why} → Y-1이 빨간불 (넘긴 칸 ${over.length}/${rows.length} · 최대 |Δ| ${mx.toFixed(4)})`
    + (hit ? "" : `\n     🔴 변이를 넣었는데 Y-1이 **아직 초록불** — 중립성을 아무것도 안 지키고 있어요`
      + `\n       ${rows.map(fmt).join("\n       ")}`));
}
/* 🔒 **"그 종류만 무너지는가"까지 봅니다.** 기준선에서 나머지 두 종류는 중립이 그대로예요 —
 *    한 손잡이가 다른 손잡이의 곡선을 끌고 가면 그것도 결함입니다. */
mutCheck("P_GOAL", "M-P1", "⚽ 결정의 세기를 1/3 → **0.45**로 옮김",
  (rows, over) => over.length > 0 && over.every((r) => r.kindKey === "g"));
mutCheck("P_DEFEND", "M-P2", "🧱 수비의 세기를 0.5 → **0.65**로 옮김",
  (rows, over) => over.length > 0 && over.every((r) => r.kindKey === "d"));
mutCheck("FALLBACK", "M-P4", "**v1 자동 판정(`autoRes`)으로 조용히 떨어짐** — 판정 종류부터 달라져요",
  (rows, over) => over.length > 0);

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
