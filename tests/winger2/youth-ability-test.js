/* ⚽ 더 윙어 II — ⚔️ **유스 카드의 중심이 능력치를 타는가** (N-1 · N-1b · N-2 · N-3b)
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-08-31 · engineer 84번 §6-3 · designer 86·87번)
 *
 *   · 유스 카드의 중심은 **상수가 아닙니다**:
 *       autoP = YOUTH_CARD_P[kind] × clamp( overall() ÷ PEER_REF[무대], 0.60, 1.40 )
 *   · **자는 `overall()`(6칸 평균)입니다** — `blendOf`(포지션 혼합)가 아니에요.
 *     `blendOf` 자 위에서는 **중립화 상수가 애초에 존재할 수 없습니다**(84번 §2-3 ①):
 *     고루 훈련 31.0 ↔ 몰빵 45.5라 기준선을 어디에 잡든 그 선택이 곧 정책 난이도예요.
 *   · 기준선은 **무대마다 다릅니다** — 🏆 평가전은 같은 나이의 또래, 🔥 프로 도전은
 *     3년을 다 채운 유망주들과 겨룹니다.
 *
 * 🔴 **여기 있던 옛 계약 `A-1`은 「폐기」가 아니라 「쪼개기」였습니다** (84번 §6-2b).
 *    옛 한 문장 *"s=0.5에서 perfect = miss — **모든 능력치에서**"* 에는 계약이 둘 묶여 있었어요:
 *      · **중립성** (원칙 ④) — 🟢 **살아 있습니다.** 여기 N-1이 그대로 이어받아요
 *      · **"모든 능력치에서"** — 🔴 이번에 깬 것은 이쪽뿐입니다
 *    ⚠️ 문서에서 「A-1 폐기」만 읽고 **중립성까지 버리지 마세요.**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 **값이 아니라 관계로 씁니다 — 다만 「어느 세계의 관계」인지 적어 둡니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 「A(22세) === B(26세)」가 **배수 없는 세계의 관계**여서 틀렸던 전례가 있어요.
 * 그래서 이 파일의 관계들이 서 있는 전제를 적습니다:
 *
 *   ① `outcome()`이 ⚽🅰️ 세 갈래(`miss = (1−p)/2`) · 🧱 두 갈래인 표 위에서만
 *      *"중립 = perfect 빈도 = miss 빈도"* 가 성립합니다. 표가 바뀌면 N-1부터 다시 보세요
 *   ② `cardP`의 중심이 `autoP`이고 폭이 `half(ability)`인 구조 위에서만
 *      *"perfect 빈도 = autoP"* (N-0)가 성립합니다
 *   ③ 🔴 **기준선(32.0 · 36.5)은 「36턴 성장 분포」라는 한 함수의 세 점**이에요.
 *      훈련 산식·등급 문턱·등급 ±1칸 매핑·`YOUTH_CARD_P`가 바뀌면 **표 전체가 움직입니다.**
 *      그때 이 파일의 `REF`도 같이 고쳐야 해요 — **한 칸만 고치지 마세요**(84번 §3-3e)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 것들
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **진짜 `playYouthMoment`를 부릅니다** (🤖 자동 진행 갈래 `cb(judge(0.5), T)`).
 *      산식 사본을 안 지어요
 *   ③ **게임 입구를 통해** 실제 버튼으로 🏆 평가전 · 🔥 프로 도전 화면까지 갑니다.
 *      `ev`를 손으로 만들지 않아요 — 그러면 무대 구분이 **검사가 지어낸 것**이 됩니다
 *   ④ **문턱(0.025 · 0.08 · 0.02)과 기준선(32.0 · 36.5)은 여기 박습니다.**
 *      🔒 `PEER_REF`·`YOUTH_SPAN`을 소스에서 **읽지 않아요** — 읽으면 상수를 바꿔도
 *      검사가 따라가서 아무것도 안 잡힙니다
 *   ⑤ **측정 조건을 검사가 스스로 찍습니다** — 그 칸에서 게임이 실제로 쓴
 *      `overall()`·`ref`·`autoP`·`ability`를 계측 탐침으로 걷어서 출력해요
 *   ⑥ **시드 하나로 안 잽니다** — 엔진 난수(`_t.seed`)를 시드마다 다시 박습니다
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 * ⏱️ 약 60초.
 */
"use strict";
const { bootPage, pageMutsOK, passTown } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 **문턱·기준선은 여기 박습니다** — 소스에서 안 읽어요
 * ══════════════════════════════════════════════════════════════ */
const N = 40000;          // 칸마다 굴리는 횟수
const BAND = 0.025;       // N-1: |perfect − miss| 문턱
/* 📏 여유를 눈에 보이게 둡니다 (N-1 기준):
 *   · 잡음 1σ = √(Var)/√N — ⚽🅰️(p≈⅓) 0.0041 · 🧱(p≈0.5) 0.0050
 *     → 0.025는 **5σ 넘게** 떨어져 있어요
 *   · 변이(기준선 32 → 24 / 34)는 |Δ| 0.15 / 0.05라 문턱의 2~6배예요
 *   ⚠️ 문턱을 기준선 쪽으로 더 조이지 마세요 — "가끔 빨간불 뜨는 검사"가 되면
 *      사람이 그 옆의 진짜 실패를 못 봅니다. */
const SIGMA_MIN = 4;

/* 🎯 **무대별 기준선 — 계약값입니다.** 소스의 `PEER_REF`를 읽지 않아요.
 * 🔴 소스가 이 값에서 멀어지면 **N-1이 빨간불이 되는 게 맞습니다** (그게 이 검사의 일이에요).
 * ⚠️ 이 값은 84번 §3-3f·§3-3g의 A/B 브래킷으로 확정된 **종속값**입니다 — 위 「전제 ③」 참고. */
const REF = { eval: 32.0, survival: 36.5 };

/* 📈 N-2가 훑는 **유스 창** — 84번 §3-1b 실측(🇰🇷 · wg · 고루 훈련 · 80벌)의
 * 1년 6월 평균 23.2 → 🔥 프로 도전 평균 36.3. 검사에 박습니다. */
const WIN = [23.2, 36.3];
const GAIN_MIN = 0.08;    // N-2: 그 창에서 ⚽ perfect가 최소 이만큼 벌어져야 해요 (실측 +0.136)
const STAGE_MIN = 0.02;   // N-1b: 같은 능력치에서 두 무대의 perfect 빈도 차이 하한
/* 🎛️ N-3b: 조작 폭(`±2·half`)이 0이나 1에 **안 잘려야** 합니다. 여유 하한. */
const ROOM = 0.02;
/* 🧪 유스 **밖**까지 일부러 밀어 보는 `S.stats` 값 — clamp가 중심을 잡아 주는지 봐요.
 *    (유스 안에서 엔진이 보는 `overall()`은 18~45입니다) */
const LEVELS = [30, 90, 200, 400];
const KINDS = [["g", "⚽ 결정"], ["a", "🅰️ 전개"], ["d", "🧱 수비"]];
const SEEDS = [11, 23, 37];
const POS = "wg";
const TRAIN_KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const REST_AT = 40;       // 🛌 컨디션이 이 밑이면 쉬어요 (고루 훈련 모델 · 84번 §3-1b와 같은 궤적)

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — **0번이 먼저 소스와 대조합니다.**
 *    (정규식이 안 걸리면 그 변이 검사는 "안 돈" 상태예요 — 초록불이 아닙니다)
 * ══════════════════════════════════════════════════════════════ */
const AUTOP_LINE = / {2}const autoP = youthAutoP\(kind, overall\(\), ev && ev\.kind === "survival" \? PEER_REF\.survival : PEER_REF\.eval\);/;
/* 📸 **계측 탐침** — 동작을 안 바꿉니다. 그 줄 **뒤에** 한 줄을 덧붙여
 *    게임이 실제로 쓴 값을 그대로 걷어 와요 (측정 조건을 검사가 스스로 찍습니다). */
const PROBE = { "game.js": [[
  new RegExp(`(${AUTOP_LINE.source})`),
  `$1\n  if (window.__probe) window.__probe.push({ stage: ev && ev.kind, x: overall(), ref: ev && ev.kind === "survival" ? PEER_REF.survival : PEER_REF.eval, autoP: autoP, base: YOUTH_CARD_P[kind], ability: ability });`,
]] };

const MUT = {
  /* 🔴 **M1 — 옛 버그 복원.** 중심을 상수로 되돌립니다 (개정 전과 동작 동일).
   *    36턴을 훈련해도 카드가 안 나아지던 그 상태예요 — 옛 `A-1`이 이걸 **계약으로 단언**했습니다. */
  CONST: { "game.js": [[AUTOP_LINE, "  const autoP = YOUTH_CARD_P[kind];"]] },
  /* 🔴 **M2 — 기준선을 하나로 합침.** 🔥 프로 도전 통과율이 +46%로 되살아납니다(84번 §3-3d) */
  ONE_REF: { "game.js": [[/^ {2}survival: 36\.5,/m, "  survival: 32.0,"]] },
  /* 🔴 **M3 — clamp를 풀어 축이 폭주.** 중심이 0/1에 닿아 **조작 폭이 통째로 잘립니다** */
  WIDE_SPAN: { "game.js": [[/^const YOUTH_SPAN = \[0\.60, 1\.40\];/m, "const YOUTH_SPAN = [0.20, 5.00];"]] },
  /* 🔴 **M4 — 자를 `overall()` 대신 `blendOf`로.** designer 판정의 결정적 근거가
   *    *"`blendOf` 자 위에서는 중립화 상수가 애초에 존재할 수 없다"* 였어요.
   *    (`ability`가 바로 그 `blendOf` 값입니다 — 같은 줄 위에 이미 있어요) */
  BLEND_RULER: { "game.js": [[AUTOP_LINE,
    '  const autoP = youthAutoP(kind, ability, ev && ev.kind === "survival" ? PEER_REF.survival : PEER_REF.eval);']] },
  /* 🔴 N-1 전용 — 기준선을 아래/위로 옮기면 32.0에서 중립이 깨집니다 */
  REF24: { "game.js": [[/^ {2}eval: 32\.0,/m, "  eval: 24.0,"]] },
  REF34: { "game.js": [[/^ {2}eval: 32\.0,/m, "  eval: 34.0,"]] },
  /* 🔴 N-2 변이 B — 비율 clamp를 [1,1]로 닫으면 축이 죽습니다 (중심이 다시 상수) */
  FLAT_SPAN: { "game.js": [[/^const YOUTH_SPAN = \[0\.60, 1\.40\];/m, "const YOUTH_SPAN = [1, 1];"]] },
};

{
  const table = Object.assign({ "0.PROBE": PROBE }, MUT);
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
 * 🕹️ 드라이버 — **게임 입구를 통해** 무대까지 실제 버튼으로 갑니다
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boot(seed, muts) {
  const all = { "game.js": PROBE["game.js"].concat((muts && muts["game.js"]) || []) };
  for (const f of Object.keys(muts || {})) if (f !== "game.js") all[f] = muts[f];
  /* 🤖 자동 진행 — `playYouthMoment`가 `cb(judge(0.5), T)`로 즉시 답하는 그 갈래예요.
   *    **중립(s = 0.5)이 걸려 있는 자리**입니다. */
  const W = bootPage({ muts: all, keys: { "grow-auto-mini": "1" } });
  W.__probe = null;
  W.Math.random = mulberry32(seed);
  /* 🎲 **엔진 난수를 따로 박습니다.** `_rng`는 엔진이 뜰 때 `Math.random`을 잡아 두므로
   *    나중에 `W.Math.random`을 갈아 끼워도 판정 굴림에는 안 걸려요 — 여기서 박아야 합니다. */
  W.WingerEngine._t.seed(seed);
  const D = W.document;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
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
  return { W, D, press, S: () => W.__get("S"),
    screen: () => ((D.querySelector(".screen.active") || {}).id || "") };
}

/* 🏠 훈련장에서 **고루 훈련**(6칸 돌려가며 · 컨디션이 낮으면 🛌 휴식)으로 턴을 씁니다.
 * `want`가 나오는 대회 버튼을 만나면 그 무대에 **들어간 채로** 멈춰요 — `ev`가 살아 있는 자리입니다.
 * ⚠️ **`ev`를 손으로 만들지 않습니다.** 무대 구분은 게임의 `startEval`/`startSurvival`이 정해요. */
function driveTo(h, want) {
  let ti = 0;
  for (let guard = 0; guard < 300; guard++) {
    const go = h.D.querySelector(".go-game");
    if (go) {
      const kind = h.S().pendingStage.kind;
      h.press(go, `${kind} 출전`);
      if (kind === want) return true;          // 🎬 무대 화면에 선 채로 멈춥니다
      for (let g = 0; g < 60; g++) {           // 그 대회를 끝까지 눌러 넘겨요
        const nx = h.D.getElementById("btn-stage-next");
        if (!nx || nx.disabled) break;
        h.press(nx, nx.textContent);
        if (h.screen() !== "screen-stage") break;
      }
      continue;
    }
    if (h.screen() !== "screen-main") return false;
    const rest = h.S().condition < REST_AT;
    const btn = rest
      ? h.D.querySelector('#action-list .action-btn[data-key="__rest"]')
      : h.D.querySelector(`#action-list .action-btn[data-key="${TRAIN_KEYS[ti % 6]}"]`);
    if (!btn) return false;
    if (!rest) ti += 1;
    h.press(btn, rest ? "🛌 휴식" : "🏋️ 훈련");
  }
  return false;
}

/* 🎚️ `overall()`이 정확히 `target`이 되도록 `S.stats`를 맞춥니다.
 * `nowStats`가 6칸에 같은 곡선을 곱할 뿐이라 **`overall()`은 칸 값에 정비례**해요 —
 * 한 점만 재면 필요한 값이 바로 나옵니다. (맞았는지는 돌려주는 값으로 확인해요) */
function setOverall(W, target) {
  const S = W.__get("S"), ov = W.__get("overall");
  for (const k of Object.keys(S.stats)) S.stats[k] = 100;
  const c = ov() / 100;
  for (const k of Object.keys(S.stats)) S.stats[k] = target / c;
  return ov();
}
const setLevel = (W, level) => {
  const S = W.__get("S");
  for (const k of Object.keys(S.stats)) S.stats[k] = level;
  return W.__get("overall")();
};

/* 한 칸을 N번 굴려 판정 빈도를 셉니다.
 * 📸 첫 한 번만 탐침을 켜서 **게임이 실제로 쓴 조건**(overall·ref·autoP·ability)을 걷어요. */
function cell(W, kindKey, n) {
  const play = W.__get("playYouthMoment");
  W.__probe = [];
  play(null, () => {}, kindKey);
  const cond = W.__probe[W.__probe.length - 1] || {};
  W.__probe = null;
  const c = { perfect: 0, ok: 0, miss: 0, other: 0 };
  for (let i = 0; i < n; i++) {
    play(null, (res) => { if (res in c) c[res] += 1; else c.other += 1; }, kindKey);
  }
  return { cond, n, p: c.perfect / n, o: c.ok / n, m: c.miss / n, other: c.other };
}

/* 무대 하나에서, 지정한 `overall()` 점들의 모든 카드 종류를 재요 */
function sweep(seed, stage, points, muts, n, kinds) {
  const h = boot(seed, muts);
  const ok = driveTo(h, stage);
  const rows = [];
  if (ok) {
    for (const target of points) {
      const got = setOverall(h.W, target);
      for (const [kindKey, label] of (kinds || KINDS)) {
        rows.push(Object.assign({ kindKey, label, target, got },
          cell(h.W, kindKey, n == null ? N : n)));
      }
    }
  }
  const errs = h.W.__errs.slice();
  h.W.close();
  return { ok, rows, errs, stage };
}

const sd = (p) => Math.sqrt((p < 0.4 ? 2 / 3 : 1) / N);   // |perfect−miss|의 1σ 어림
const fmt = (r) =>
  `${r.label} ovr${r.got.toFixed(1)}(→${r.cond.ref}) autoP ${Number(r.cond.autoP).toFixed(4)}`
  + ` | p${r.p.toFixed(4)} o${r.o.toFixed(4)} m${r.m.toFixed(4)} Δ${(r.p - r.m >= 0 ? "+" : "")}${(r.p - r.m).toFixed(4)}`;

/* ══════════════════════════════════════════════════════════════
 * A. 🏆 평가전 무대 — 기준선(32.0)에서의 **중립성** (N-1)
 * ══════════════════════════════════════════════════════════════ */
const evalBase = SEEDS.map((seed) => Object.assign({ seed }, sweep(seed, "eval", [REF.eval])));
{
  const errs = evalBase.flatMap((b) => b.errs);
  check(evalBase.every((b) => b.ok),
    `A-0. 🚪 게임 입구 → 🏠 훈련장 → 🏆 **평가전 무대에 실제 버튼으로 도달** (시드 ${SEEDS.join(" ")})`
    + (evalBase.every((b) => b.ok) ? "" : "\n     🔴 .go-game이 안 떴어요 — 화면이 예상과 달라졌습니다"));
  check(errs.length === 0, `A-0b. 페이지가 오류 없이 뜬다${errs.length ? ` — ${errs[0]}` : ""}`);

  /* 🧪 측정 조건 — 게임이 실제로 그 기준선을 썼나 (검사가 스스로 찍습니다) */
  const conds = evalBase.flatMap((b) => b.rows.map((r) => r.cond));
  check(conds.length > 0 && conds.every((c) => c.stage === "eval"),
    `A-0c. 🧪 측정 조건 — 카드가 **🏆 평가전 무대(ev.kind="eval")에서** 왔다`
    + `\n     게임이 쓴 기준선: ${Array.from(new Set(conds.map((c) => c.ref))).join(" / ")}`
    + ` · overall(): ${Array.from(new Set(evalBase[0].rows.map((r) => r.got.toFixed(2)))).join(" / ")}`);

  const bad = [];
  let worst = 0, worstRow = null;
  for (const b of evalBase) {
    for (const r of b.rows) {
      const d = Math.abs(r.p - r.m);
      if (d > worst) { worst = d; worstRow = { seed: b.seed, r }; }
      if (d > BAND) bad.push(`시드${b.seed} ${fmt(r)}`);
      if (r.other) bad.push(`시드${b.seed} ${r.label}: perfect/ok/miss 아닌 판정 ${r.other}건`);
    }
  }
  check(bad.length === 0 && evalBase.every((b) => b.ok),
    `A-1. 🎯 **N-1 중립점** — overall() = ${REF.eval}(🏆 평가전 기준선)에서 perfect 빈도 = miss 빈도`
    + `\n     (= 등급 ±1칸 기댓값 0. **값을 베껴 적지 않고 굴려서** 확인했어요 · 칸마다 ${N}회 × 시드 ${SEEDS.length})`
    + `\n     최대 |Δ| = ${worst.toFixed(4)} ≤ ${BAND}${worstRow ? ` @ 시드${worstRow.seed} ${worstRow.r.label}` : ""}`
    + (bad.length ? `\n     🔴 넘긴 칸 ${bad.length}개:\n       ${bad.slice(0, 6).join("\n       ")}` : ""));

  const s1 = Math.max(sd(1 / 3), sd(0.5));
  check(BAND >= SIGMA_MIN * s1,
    `A-2. 📏 문턱 ${BAND}이 잡음 1σ(${s1.toFixed(4)})의 **${(BAND / s1).toFixed(1)}배** (≥${SIGMA_MIN}배)`
    + ` — 실측 최대 |Δ|는 ${(worst / s1).toFixed(1)}σ였어요`);

  /* 🔒 **배선 관계** — perfect 빈도는 `autoP` 그 자체여야 합니다.
   *    (⚽🅰️ `outcome`은 r<p일 때 perfect · 🧱도 r<p라 **양쪽 다 perfect 빈도 = p**)
   *    🔴 `autoP`를 계산해 놓고 `judge`가 딴 값을 쓰면 여기서 잡힙니다. */
  const wired = [];
  for (const b of evalBase) for (const r of b.rows) {
    if (Math.abs(r.p - r.cond.autoP) > BAND) wired.push(`시드${b.seed} ${r.label}: p ${r.p.toFixed(4)} ≠ autoP ${Number(r.cond.autoP).toFixed(4)}`);
  }
  check(wired.length === 0,
    `A-3. 🔒 **N-0 배선** — perfect 빈도가 게임이 계산한 \`autoP\` 그 값이다 (중심이 실제로 판정에 실렸나)`
    + (wired.length ? `\n     🔴 ${wired.slice(0, 3).join(" | ")}` : ""));

  /* 🔒 엔진 `outcome` 표의 **모양 계약** — 값이 아니라 형태예요 (옛 A-4 그대로) */
  const shape = [];
  for (const b of evalBase) for (const r of b.rows) {
    if (r.kindKey === "d") {
      if (r.o !== 0) shape.push(`🧱에 ok가 ${r.o.toFixed(4)} (읽기 게임이라 이분이어야 해요)`);
      if (Math.abs(r.p + r.m - 1) > 1e-9) shape.push(`🧱 perfect+miss ≠ 1 (${(r.p + r.m).toFixed(4)})`);
    } else {
      if (r.o <= 0) shape.push(`${r.label}에 ok가 0 (세 갈래여야 해요)`);
      if (Math.abs(r.m - (1 - r.p) / 2) > BAND) shape.push(`${r.label} miss ≠ (1−perfect)/2`);
    }
  }
  check(shape.length === 0,
    `A-4. 🔒 엔진 outcome 표의 **모양** — ⚽🅰️는 세 갈래에 miss = (1−perfect)/2 · 🧱은 두 갈래`
    + (shape.length ? `\n     🔴 ${Array.from(new Set(shape)).slice(0, 4).join(" | ")}` : ""));

  console.log(`     기준선(시드 ${SEEDS[0]}):\n       ${evalBase[0].rows.map(fmt).join("\n       ")}`);
}

/* ══════════════════════════════════════════════════════════════
 * B. 🎭 **N-1b 무대 구분** — 🏆 평가전과 🔥 프로 도전은 **다른 자**를 씁니다
 *
 * 🌍 이 절이 서 있는 전제: 🔥 프로 도전은 36턴을 다 채운 유망주들과 겨루므로
 *    기준선이 위(36.5)에 있습니다. 자 하나로 둘을 재면 프로 도전이 **+46% 쉬워져요**(84번 §3-3d).
 * ══════════════════════════════════════════════════════════════ */
const survBase = SEEDS.slice(0, 2).map((seed) =>
  Object.assign({ seed }, sweep(seed, "survival", [REF.survival, REF.eval])));
{
  check(survBase.every((b) => b.ok),
    `B-0. 🚪 게임 입구 → **36턴 고루 훈련 → 🔥 프로 도전 무대까지 실제 버튼으로 도달** (시드 ${SEEDS.slice(0, 2).join(" ")})`
    + (survBase.every((b) => b.ok) ? "" : "\n     🔴 🔥 프로 도전 버튼까지 못 갔어요"));
  const conds = survBase.flatMap((b) => b.rows.map((r) => r.cond));
  check(conds.length > 0 && conds.every((c) => c.stage === "survival"),
    `B-0b. 🧪 측정 조건 — 카드가 **🔥 프로 도전 무대(ev.kind="survival")에서** 왔다`
    + `\n     게임이 쓴 기준선: ${Array.from(new Set(conds.map((c) => c.ref))).join(" / ")}`);

  /* B-1. 🔥 프로 도전 기준선(36.5)에서의 중립성 — N-1의 두 번째 점 */
  const bad = [];
  let worst = 0;
  for (const b of survBase) for (const r of b.rows) {
    if (r.target !== REF.survival) continue;
    const d = Math.abs(r.p - r.m);
    if (d > worst) worst = d;
    if (d > BAND) bad.push(`시드${b.seed} ${fmt(r)}`);
  }
  check(bad.length === 0 && survBase.every((b) => b.ok),
    `B-1. 🎯 **N-1 중립점(🔥 프로 도전)** — overall() = ${REF.survival}에서 perfect 빈도 = miss 빈도`
    + `\n     최대 |Δ| = ${worst.toFixed(4)} ≤ ${BAND}`
    + (bad.length ? `\n     🔴 넘긴 칸 ${bad.length}개:\n       ${bad.slice(0, 4).join("\n       ")}` : ""));

  /* B-2. 🎭 **같은 능력치에서 두 무대의 중심이 다르다** — 값이 아니라 **비율**로 봅니다.
   *      perfect 빈도 = autoP이고 autoP ∝ 1/기준선이므로,
   *        (🏆 평가전 perfect) ÷ (🔥 프로 도전 perfect) = 36.5 ÷ 32.0 = 1.1406
   *      🌍 이 관계는 **「두 무대가 서로 다른 기준선을 쓰는 세계」**의 문장이에요.
   *         무대 구분이 폐기되면 이 줄부터 다시 보세요. */
  const want = REF.survival / REF.eval;
  const pairs = [];
  for (const b of survBase) {
    const e = evalBase.find((x) => x.seed === b.seed);
    for (const [kindKey, label] of KINDS) {
      const sv = b.rows.find((r) => r.kindKey === kindKey && r.target === REF.eval);
      const ev = e && e.rows.find((r) => r.kindKey === kindKey);
      if (sv && ev && sv.p > 0) pairs.push({ seed: b.seed, label, ratio: ev.p / sv.p, ev: ev.p, sv: sv.p });
    }
  }
  const off = pairs.filter((x) => Math.abs(x.ratio - want) > 0.03);
  const gapOK = pairs.every((x) => x.ev - x.sv > STAGE_MIN);
  check(pairs.length > 0 && off.length === 0 && gapOK,
    `B-2. 🎭 **N-1b 무대 구분** — 같은 overall()(${REF.eval})에서`
    + ` 🏆 평가전 perfect ÷ 🔥 프로 도전 perfect = **${want.toFixed(4)}** (= ${REF.survival} ÷ ${REF.eval}) ± 0.03`
    + `\n     실측: ${pairs.map((x) => `${x.label} ${x.ratio.toFixed(3)}`).join(" · ")}`
    + `\n     (두 무대의 perfect 차이도 전부 > ${STAGE_MIN}: ${pairs.map((x) => (x.ev - x.sv).toFixed(3)).join(" · ")})`
    + (off.length ? `\n     🔴 비율이 어긋난 칸: ${off.map((x) => `${x.label} ${x.ratio.toFixed(3)}`).join(" | ")}` : "")
    + (gapOK ? "" : `\n     🔴 두 무대의 중심이 사실상 같아요 — 자 하나로 둘을 재고 있습니다`));
  console.log(`     🔥 프로 도전(시드 ${SEEDS[0]}):\n       ${survBase[0].rows.map(fmt).join("\n       ")}`);
}

/* ══════════════════════════════════════════════════════════════
 * C. 📈 **N-2 축이 산다** — overall()이 오르면 perfect 빈도가 오른다
 *    🔴 이번 버그(36턴을 훈련해도 카드가 안 나아짐)를 잡는 자리입니다.
 * ══════════════════════════════════════════════════════════════ */
const AXIS_PTS = [WIN[0], 26.0, 29.0, 32.0, 34.0, WIN[1]];
const AXIS_KINDS = [["g", "⚽ 결정"], ["d", "🧱 수비"]];
function axisRows(seed, muts) {
  return sweep(seed, "eval", AXIS_PTS, muts, N, AXIS_KINDS).rows;
}
/* 한 종류의 창 양끝 상승폭 · 단조성 */
function axisStat(rows, kindKey) {
  const a = rows.filter((r) => r.kindKey === kindKey).sort((x, y) => x.target - y.target);
  const gain = a.length ? a[a.length - 1].p - a[0].p : 0;
  let drops = 0;
  for (let i = 1; i < a.length; i++) if (a[i].p < a[i - 1].p - 3 * sd(a[i].p)) drops += 1;
  return { a, gain, drops };
}
const axisBase = SEEDS.slice(0, 2).map((seed) => ({ seed, rows: axisRows(seed) }));
{
  const rep = [];
  let bad = 0;
  for (const b of axisBase) for (const [kindKey, label] of AXIS_KINDS) {
    const st = axisStat(b.rows, kindKey);
    rep.push(`시드${b.seed} ${label} ${st.a.map((r) => r.p.toFixed(3)).join(" → ")} (Δ+${st.gain.toFixed(3)}${st.drops ? ` · 뒤집힘 ${st.drops}` : ""})`);
    if (st.drops > 0) bad += 1;
    if (kindKey === "g" && st.gain < GAIN_MIN) bad += 1;
  }
  check(bad === 0,
    `C-1. 📈 **N-2 축이 산다** — 유스 창 overall() ${WIN[0]} → ${WIN[1]}에서`
    + ` ⚽ perfect가 **최소 +${GAIN_MIN}** 오르고, 중간에 **뒤집히지 않는다**`
    + `\n     ${rep.join("\n     ")}`
    + (bad ? `\n     🔴 축이 죽었거나 단조가 깨졌어요 — 36턴을 훈련해도 카드가 안 나아집니다` : ""));
}

/* ══════════════════════════════════════════════════════════════
 * D. 🎛️ **N-3b 조작 폭이 안 잘린다** — clamp가 중심을 잡아 주는 이유
 *
 * 🌍 전제: `cardP = clamp(autoP + 2·half(a)·(s−0.5), 0, 1)`. 중심이 0이나 1에 닿으면
 *    조작 폭이 **통째로 잘려서** 잘하든 못하든 결과가 같아집니다(engine.js §2-6).
 *    그래서 **유스 밖 능력치까지 밀어도** 중심이 폭을 먹지 않아야 해요.
 * 🔒 엔진의 진짜 `cardP`를 부릅니다 — 산식 사본을 안 지어요.
 * ══════════════════════════════════════════════════════════════ */
function roomRows(seed, muts) {
  const h = boot(seed, muts);
  const ok = driveTo(h, "eval");
  const out = [];
  if (ok) {
    const E = h.W.WingerEngine;
    for (const level of LEVELS) {
      const got = setLevel(h.W, level);
      for (const [kindKey, label] of KINDS) {
        const c = cell(h.W, kindKey, 1).cond;
        out.push({ level, kindKey, label, got, autoP: c.autoP, ability: c.ability,
          hi: E.cardP(c.autoP, c.ability, 1), lo: E.cardP(c.autoP, c.ability, 0) });
      }
    }
  }
  h.W.close();
  return out;
}
const roomBase = roomRows(SEEDS[0]);
{
  const bad = roomBase.filter((r) => r.hi > 1 - ROOM || r.lo < ROOM);
  const abil = Array.from(new Set(roomBase.map((r) => Math.round(r.ability)))).sort((a, b) => a - b);
  check(roomBase.length > 0 && bad.length === 0,
    `D-1. 🎛️ **N-3b 조작 폭** — S.stats ${LEVELS.join("/")}(= 유스 밖까지)에서도`
    + ` s=1의 중심이 ${1 - ROOM} 아래 · s=0의 중심이 ${ROOM} 위`
    + `\n     🧪 측정 조건 — 능력치를 실제로 훑었다: ${abil.join(" → ")}`
    + `\n     ${roomBase.filter((r) => r.kindKey !== "a").map((r) => `${r.label}·stats${r.level}(ovr${r.got.toFixed(0)}) autoP ${Number(r.autoP).toFixed(3)} → s0 ${r.lo.toFixed(3)} / s1 ${r.hi.toFixed(3)}`).join("\n     ")}`
    + (bad.length ? `\n     🔴 조작 폭이 잘린 칸 ${bad.length}개: ${bad.slice(0, 3).map((r) => `${r.label}·stats${r.level} s0 ${r.lo.toFixed(3)} s1 ${r.hi.toFixed(3)}`).join(" | ")}` : ""));
}

/* ══════════════════════════════════════════════════════════════
 * E. 🧭 **N-5 자가 훈련 「배분」이 아니라 「총량」을 본다** — designer 판정의 결정적 근거
 *
 * 🌍 **이 절이 서 있는 전제**: 유스의 자는 **훈련 총량**(`overall()` = 6칸 평균)입니다.
 *    designer 판정(86번)의 결정적 근거가
 *      *"`blendOf` 자 위에서는 **중립화 상수가 애초에 존재할 수 없다**"*
 *    였어요 — 기준선을 고루(31.0)로 잡든 몰빵(45.5)으로 잡든 **그 선택이 곧 정책 난이도**라
 *    "아무도 세지거나 약해지지 않는 점"이 없습니다.
 *
 * 🔒 **표본을 늘려 버티지 않고 짝으로 잽니다.** 훈련 **총량이 똑같은** 두 벌을 만들어요:
 *      · 고루 : 6칸이 모두 같은 값
 *      · 몰빵 : 주 스탯에 **총량의 5/6**, 나머지 다섯 칸이 1/6을 나눠 가짐
 *    두 벌의 `overall()`은 **정의상 같습니다.** 그러니 중심도 같아야 해요.
 *
 * 🔴 **「유스는 총량, 프로는 특화」가 뒤집히면 이 절부터 다시 보세요.**
 *    유스에서도 특화를 보상하기로 판정이 바뀌면 이 문장은 성립하지 않습니다.
 *    (그때 `blendOf`로 돌아가려면 **중립점을 어디에 둘지**부터 답이 있어야 해요)
 * ══════════════════════════════════════════════════════════════ */
const POLICY_BAND = 0.05;   // 두 배분의 카드 중심 차이 허용폭 (실측 0.000 · M4에서 +12%)
/* 🎚️ `overall()`이 `target`이 되도록 맞추되, 총량을 **주 스탯 쪽으로 몰아** 담습니다.
 *    `spike = 1`이면 고루, `spike = 5`면 주 스탯 한 칸이 총량의 5/6이에요. */
function setShape(W, target, spike) {
  const S = W.__get("S"), ov = W.__get("overall");
  const main = W.__get("POS_INFO")[S.pos].stat;
  const keys = Object.keys(S.stats);
  for (const k of keys) S.stats[k] = 100;
  const c = ov() / 100;                       // overall()은 칸 값에 정비례해요
  const L = target / c;                       // 고루였을 때의 한 칸 값
  const tot = L * keys.length;
  for (const k of keys) S.stats[k] = k === main ? tot * spike / 6 : tot * (6 - spike) / 5 / 6;
  return { got: ov(), main };
}
function policyRows(seed, muts) {
  const h = boot(seed, muts);
  const ok = driveTo(h, "eval");
  const out = [];
  if (ok) {
    for (const [name, spike] of [["고루", 1], ["몰빵", 5]]) {
      const { got, main } = setShape(h.W, REF.eval, spike);
      for (const [kindKey, label] of KINDS) {
        const r = cell(h.W, kindKey, N);
        out.push(Object.assign({ name, spike, main, kindKey, label, got }, r));
      }
    }
  }
  const errs = h.W.__errs.slice();
  h.W.close();
  return { ok, rows: out, errs };
}
function polGap(rows) {
  const gaps = [];
  for (const [kindKey, label] of KINDS) {
    const a = rows.find((r) => r.name === "고루" && r.kindKey === kindKey);
    const b = rows.find((r) => r.name === "몰빵" && r.kindKey === kindKey);
    if (a && b && a.cond.autoP > 0) gaps.push({ label, g: b.cond.autoP / a.cond.autoP - 1, a, b });
  }
  return gaps;
}
const polBase = policyRows(SEEDS[0]);
{
  const gaps = polGap(polBase.rows);
  const bad = gaps.filter((x) => Math.abs(x.g) > POLICY_BAND);
  const tot = polBase.rows.filter((r) => r.kindKey === "g");
  check(polBase.ok && gaps.length > 0 && bad.length === 0,
    `E-1. 🧭 **N-5 배분 중립** — 훈련 **총량이 같으면** 배분이 달라도 카드 중심이 같다 (±${POLICY_BAND * 100}%)`
    + `\n     🧪 측정 조건 — 두 벌의 overall(): ${tot.map((r) => `${r.name} ${r.got.toFixed(2)}`).join(" / ")}`
    + ` (주 스탯 ${tot.length ? tot[0].main : "?"})`
    + ` · 같은 벌의 blendOf: ${tot.map((r) => `${r.name} ${Number(r.cond.ability).toFixed(1)}`).join(" / ")}`
    + `\n     중심 차이: ${gaps.map((x) => `${x.label} ${(x.g * 100 >= 0 ? "+" : "")}${(x.g * 100).toFixed(2)}%`).join(" · ")}`
    + (bad.length ? `\n     🔴 자가 **훈련 배분**을 보고 있어요 — 그 자 위에는 중립화 상수를 놓을 자리가 없습니다` : ""));

  /* E-2. 🎯 **중립점이 두 배분 모두에서 성립한다** — A-1의 술어를 배분 축으로 한 번 더.
   *      🔴 `blendOf` 자에서는 **어느 배분에서도 중립이 아니게** 됩니다
   *         (바닥 40에 눌려 비율이 늘 1.25 이상) — 그게 "중립화할 점 자체가 없다"의 실측 모양이에요. */
  const off = polBase.rows.filter((r) => Math.abs(r.p - r.m) > BAND);
  check(polBase.ok && polBase.rows.length > 0 && off.length === 0,
    `E-2. 🎯 **N-5b 중립점이 배분과 무관하게 성립** — 고루·몰빵 두 벌 모두 overall() = ${REF.eval}에서 |Δ| ≤ ${BAND}`
    + `\n     ${polBase.rows.map((r) => `${r.name}·${r.label} autoP ${Number(r.cond.autoP).toFixed(4)} Δ${(r.p - r.m >= 0 ? "+" : "")}${(r.p - r.m).toFixed(4)}`).join("\n     ")}`
    + (off.length ? `\n     🔴 ${off.length}칸이 중립이 아니에요` : ""));
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — **고치기 전에 빨간불이 뜨는지**
 *    기준선과 **같은 술어**를 그대로 다시 겁니다.
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");

/* N-1의 술어 — 🏆 평가전 기준선에서 |perfect − miss| ≤ BAND */
function n1Red(name, tag, why) {
  if (!mutOK(name)) { check(false, `${tag}. 🧪 ${why}${MUT_DEAD}`); return; }
  const { rows } = sweep(SEEDS[0], "eval", [REF.eval], MUT[name]);
  const over = rows.filter((r) => Math.abs(r.p - r.m) > BAND);
  const mx = Math.max(...rows.map((r) => Math.abs(r.p - r.m)));
  check(over.length > 0,
    `${tag}. 🧪 ${why} → A-1(N-1 중립점)이 빨간불 (넘긴 칸 ${over.length}/${rows.length} · 최대 |Δ| ${mx.toFixed(4)})`
    + (over.length ? "" : `\n     🔴 변이를 넣었는데 A-1이 **아직 초록불** — 중립성을 아무것도 안 지키고 있어요`
      + `\n       ${rows.map(fmt).join("\n       ")}`));
}

/* N-2의 술어 — 창 양끝 ⚽ 상승폭 ≥ GAIN_MIN 이고 단조 */
function n2Red(name, tag, why) {
  if (!mutOK(name)) { check(false, `${tag}. 🧪 ${why}${MUT_DEAD}`); return; }
  const rows = axisRows(SEEDS[0], MUT[name]);
  const st = axisStat(rows, "g");
  check(st.gain < GAIN_MIN,
    `${tag}. 🧪 ${why} → C-1(N-2 축이 산다)이 빨간불 (⚽ 상승폭 ${st.gain.toFixed(4)} < ${GAIN_MIN})`
    + `\n     ${st.a.map((r) => r.p.toFixed(3)).join(" → ")}`
    + (st.gain < GAIN_MIN ? "" : `\n     🔴 변이를 넣었는데 축이 **아직 살아 있어요** — C-1이 이 변이를 안 잡습니다`));
}

/* N-1b의 술어 — 두 무대의 perfect 비율이 36.5/32.0 */
function n1bRed(name, tag, why) {
  if (!mutOK(name)) { check(false, `${tag}. 🧪 ${why}${MUT_DEAD}`); return; }
  const sv = sweep(SEEDS[0], "survival", [REF.eval], MUT[name]);
  const evl = sweep(SEEDS[0], "eval", [REF.eval], MUT[name]);
  const want = REF.survival / REF.eval;
  const got = KINDS.map(([k]) => {
    const a = evl.rows.find((r) => r.kindKey === k), b = sv.rows.find((r) => r.kindKey === k);
    return a && b && b.p > 0 ? a.p / b.p : NaN;
  });
  const red = got.some((g) => !(Math.abs(g - want) <= 0.03));
  check(sv.ok && evl.ok && red,
    `${tag}. 🧪 ${why} → B-2(N-1b 무대 구분)가 빨간불`
    + ` (비율 ${got.map((g) => (isFinite(g) ? g.toFixed(3) : "?")).join(" · ")} vs 계약 ${want.toFixed(3)})`
    + (red ? "" : `\n     🔴 변이를 넣었는데 무대 구분이 **아직 살아 있는 것처럼 보입니다**`));
}

/* N-3b의 술어 — 조작 폭이 안 잘림 */
function n3bRed(name, tag, why) {
  if (!mutOK(name)) { check(false, `${tag}. 🧪 ${why}${MUT_DEAD}`); return; }
  const rows = roomRows(SEEDS[0], MUT[name]);
  const bad = rows.filter((r) => r.hi > 1 - ROOM || r.lo < ROOM);
  check(rows.length > 0 && bad.length > 0,
    `${tag}. 🧪 ${why} → D-1(N-3b 조작 폭)이 빨간불 (잘린 칸 ${bad.length}/${rows.length})`
    + (bad.length ? `\n     예: ${bad.slice(0, 2).map((r) => `${r.label}·stats${r.level} s0 ${r.lo.toFixed(3)} s1 ${r.hi.toFixed(3)}`).join(" | ")}`
      : `\n     🔴 변이를 넣었는데 D-1이 **아직 초록불** — clamp가 하는 일을 아무것도 안 지키고 있어요`));
}

/* N-5의 술어 — 두 정책의 카드 중심 차이가 밴드 안 */
function n5Red(name, tag, why) {
  if (!mutOK(name)) { check(false, `${tag}. 🧪 ${why}${MUT_DEAD}`); return; }
  const r0 = policyRows(SEEDS[0], MUT[name]);
  const gaps = polGap(r0.rows);
  const bad = gaps.filter((x) => Math.abs(x.g) > POLICY_BAND);
  const off = r0.rows.filter((r) => Math.abs(r.p - r.m) > BAND);
  check(gaps.length > 0 && bad.length > 0 && off.length > 0,
    `${tag}. 🧪 ${why} → E-1·E-2(N-5 배분 중립)가 빨간불`
    + ` (중심 차이 ${gaps.map((x) => `${(x.g * 100).toFixed(1)}%`).join(" · ")} > ±${POLICY_BAND * 100}% · 중립 아닌 칸 ${off.length}/${r0.rows.length})`
    + (bad.length ? "" : `\n     🔴 변이를 넣었는데 E-1이 **아직 초록불** — 자가 정책을 타는지를 아무것도 안 보고 있어요`));
}

n2Red("CONST", "M1", "**옛 버그 복원** — 중심을 상수로 되돌림 (36턴을 훈련해도 카드가 안 나아짐)");
n1bRed("ONE_REF", "M2", "**기준선을 하나로 합침** — 🔥 프로 도전이 +46% 쉬워지던 상태");
n3bRed("WIDE_SPAN", "M3", "**clamp를 0.60~1.40 → 0.20~5.00** — 축이 폭주해 조작 폭이 잘림");
n1Red("BLEND_RULER", "M4", "**자를 `overall()` 대신 `blendOf`로** — 정책에 좌우되는 자 (중립점이 사라짐)");
n2Red("BLEND_RULER", "M4b", "**자를 `blendOf`로** — 유스 창에서는 바닥 40에 눌려 축이 통째로 죽음");
n5Red("BLEND_RULER", "M4c", "**자를 `blendOf`로** — 같은 훈련 총량인데 **배분만으로** 중심이 달라지고, 어느 배분도 중립이 아님");
n1Red("REF24", "M5", "🏆 평가전 기준선 32.0 → **24.0**");
n1Red("REF34", "M6", "🏆 평가전 기준선 32.0 → **34.0**");
n2Red("FLAT_SPAN", "M7", "**YOUTH_SPAN = [1, 1]** — 비율 clamp를 닫아 중심이 다시 상수가 됨");

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
