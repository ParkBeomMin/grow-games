/* 🎯 ⚽ 더 윙어 II — **등급 셋(`hot` · `in` · 없음)이 한 주인을 쓰는가**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 이 파일이 생긴 이유 — **`w2m-cell-in`을 보는 검사가 0곳이었습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 2026-09-02, 📈 `rise`(곧 좋아질 칸)가 폐기되고 `in`(빈 곳에 닿는 칸)이 들어왔습니다(122번).
 * engineer가 **`in` 토글을 통째로 지워 봤는데 검사 28종 중 아무도 안 울었어요**(120번 §7).
 *   · `one-grid-test.js`는 **밝기(opacity)와 판정**을 봅니다 — 클래스는 안 봐요
 *   · `foot-map-test.js`는 `.w2m-half`(장식)를 봅니다
 * 🔴 그래서 «0점 칸에 테두리가 붙는» 상태로 나가도 아무도 안 잡습니다.
 *    그건 초보자에게 **「여기 눌러도 돼」라는 거짓말**이에요 — 이 판의 핵심 정보가
 *    「정답」이 아니라 **「이 칸은 0점」**이라고 설계가 못 박은 자리입니다(소스 주석).
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 값을 고치기 전에 여기부터 여세요
 * ═════════════════════════════════════════════════════════════════════════
 *
 * 「🎯 **화면 등급이 셋이고, `hot`과 `in`이 배타이며, 그 주인이 `TIER_S` 하나**인 세계」입니다.
 *
 *   · `hot`  s ≥ `TIER_S.perfect`      「지금 누르면 완벽」
 *   · `in`   0 < s < `TIER_S.perfect`  「빈 곳에 닿아요」  🔒 `hot`과 **겹치지 않습니다**
 *   · 없음   s = 0                     「키퍼 정면이거나 너무 멀어요」
 *   · `soon`은 **다른 축**(시간)이라 위 셋 어느 쪽과도 겹칩니다 — 여기서 안 봅니다
 *
 * ⚠️ **뒤집히면 이 파일이 옛 계약이 되는 판정**
 *   · *"`hot`과 `in`을 겹치게 하자"*(굵은 링 + 가는 테두리) → **T-1**이 옛 계약입니다
 *   · *"`in`을 0이 아니라 0.15부터 붙이자"* → **T-2**의 박아 둔 `IN_S`를 먼저 고치세요.
 *     🔑 그때는 «0점 칸에 테두리가 없다»가 «0.15 미만 칸에 테두리가 없다»로 바뀝니다
 *   · 🚨 **판정 대기 중 (2026-09-02 · designer 125번 §1-3) — 이 파일에서 가장 먼저 뒤집힐 자리입니다.**
 *     *"「완벽」 등급을 **그 판의 천장**의 종속값으로 두자"*
 *         `boardCeil = max over 칸  cellS(칸, oneAt(board, 0))`
 *         `perfect ⟺ s ≥ boardCeil × PERFECT_OF_CEIL` (0.9478)
 *     👉 들어오는 날 **T-2의 `PERF_S = 0.75`가 통째로 옛 계약**이 됩니다. 절대 문턱이 사라지고
 *        **판마다 다른 문턱**이 되니까요. 🔴 값을 0.9478로 바꾸는 게 아니라 **문장을 다시 써야** 해요 —
 *        「op ≥ 0.75」가 「op ≥ (그 판의 최대 op) × 0.9478」이 됩니다(관측만으로 쓸 수 있습니다:
 *        같은 프레임 여섯 칸의 최대 밝기를 판 시작에 한 번 재면 돼요).
 *     🟢 **T-1 · T-1b · T-3은 그대로 삽니다.** 배타도, 묘비도, 「한 주인」도 안 건드리는 변경이에요 —
 *        designer §1-3 ③이 *"`TIER` 자체를 상대화하므로 `:602`(표시)와 `:666`(문구)이 같은 함수를
 *        계속 읽는다"*고 못 박았습니다. 🔑 **T-3이 그 약속을 지키는 자리**입니다
 *   · *"📈 `rise`를 되살리자"* → **T-1b**(묘비)를 먼저 여세요. 🚨 소스가 못 박은 근거는
 *     `slide` 최대 < `cov1 − cov0`(16 < 24)이라는 **구조**예요 — 문턱을 내려서 되살리면
 *     되살아나는 건 클래스가 아니라 **「기다려」라는 거짓말**입니다
 *   · *"판 끝 문구를 화면 등급과 다르게 하자"* → **T-3**이 통째로 옛 계약입니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `momentDom`이 창에 실어요
 *   ② **문턱은 여기 박습니다**(`PERF_S = 0.75` · `IN_S = 0`). 🔴 `TIER_S`는 **안 내보내집니다** —
 *      내보내졌더라도 읽어 오면 안 돼요(상수를 바꿔도 검사가 따라가서 안 잡힙니다).
 *      🔑 **낱말은 소스에서** 가져옵니다(`W2Moment.WORDS`) — 문장을 베껴 적지 않아요
 *   ③ **화면을 통해** — 진짜 판을 띄우고 실기기 순서(pointerdown→pointerup→click)로 칸을 누릅니다
 *   ④ **시드 하나로 안 잽니다** — 판 24벌 × 종류 2 × 주발 2 × 컨디션 3
 *   ⑤ **기준선이 초록불인 것을 먼저 찍고** 변이를 겁니다. 그리고 **표본 바닥**을 박아 뒀어요 —
 *      세 등급이 다 안 나오면 배타·문턱 문장이 **아무것도 안 지킵니다**
 *
 * 📐 **문턱을 어디에 뒀나 — 두 줄을 먼저 적었습니다**
 *   ① **무엇과 견주는가**: 화면에 그려진 `opacity`(= 그 칸의 `s`)와 **박아 둔 0.75 / 0**
 *   ② **격자의 어느 칸에서 재는가**: 시드 24벌 × 시각 15점 × 6칸 = 2,160 표본
 *      실측 — `hot` **76** · `in` **760** · 0점 **1,324** · 겹침 **0** · `rise` **0**
 *      경계(±0.0006)에 앉은 표본은 **빼고 셉니다**: `opacity`가 `toFixed(3)`이라
 *      0.7495~0.7505가 전부 "0.750"으로 찍혀요. 🔒 잡음에 준 여유가 아니라 **자릿수**입니다.
 *   🌫️ **0으로 그려졌는데 `s`는 아직 0이 아닌 칸이 있습니다** — `s`가 연속으로 0까지
 *      내려가니 0 < s < 0.0005인 프레임은 **반드시** 생겨요(실측 1,325 중 1). 그래서 그 줄만
 *      **비율(2%)**로 박았습니다 — 0개로 못 박으면 고장이 아니라 **자릿수로** 빨간불이 납니다.
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가:
 *     ◎ 링과 테두리가 **눈에 구분되는지** · 무채색 하나로 세 채널이 읽히는지 ·
 *     `in` 칸이 «눌러도 되는 곳»으로 읽히는지 · 색약에서 갈리는지.
 *     🔒 `style.css`에 그 규칙이 **있는지**는 `one-grid-test.js` **G-6**이 봅니다(여기 아님).
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 */
"use strict";
const { momentDom, pressDom, momentMutsOK } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const PERF_S = 0.75;        // 🎯 `TIER_S.perfect` — 「지금 누르면 완벽」
const IN_S = 0;             // 🎯 `TIER_S.in` — 「빈 곳에 닿아요」의 아래끝
/* 🔑 `opacity`는 `toFixed(3)`으로 찍힙니다 — 그 **반올림 폭의 절반**이 경계 폭이에요. */
const AMBIG = 6e-4;
const SEEDS = [];
for (let i = 1; i <= 24; i++) SEEDS.push(i * 7 + 1);
const TIMES = [0, 150, 300, 450, 600, 750, 900, 1050, 1200, 1500, 1800, 2100, 2400, 2700, 3000];
/* 🔒 **표본 바닥** — 세 등급이 이만큼은 나와야 문장이 성립합니다.
 *    실측(시드 24벌 × 시각 15점 × 6칸 = 2,160): `hot` 76 · `in` 760 · 0점 1,324.
 *    바닥은 실측의 **1/3쯤**에 뒀어요 — 기준선 옆에 붙이면 `ONE_WIN`이 한 번 움직일 때
 *    **고장이 아니라 우연으로** 빨간불이 납니다(`fatigue` 여유 0.4% 사고와 같은 형태). */
const MIN_HOT = 25;
const MIN_IN = 240;
const MIN_ZERO = 440;
/* 🌫️ **자릿수에 먹히는 회색 지대 — 0으로 그려졌는데 `s`는 아직 0이 아닌 칸.**
 *    키퍼가 각을 지우며 `s`가 **연속으로** 0까지 내려가니, 0 < s < 0.0005인 프레임은
 *    **반드시 생깁니다**(`opacity`가 `toFixed(3)`이라 "0.000"으로 찍혀요).
 *    🔴 그래서 「0점 칸에 테두리 0개」로 못 박으면 **고장이 아니라 자릿수로** 빨간불이 납니다.
 *    🔒 대신 **비율**로 박습니다 — 실측 0.08%(1 / 1,325) · 변이(`IN_ALL`) 100%.
 *       문턱 2%는 그 사이 어디쯤이고, 어느 쪽에도 안 붙였어요. */
const GREY_RATE = 0.02;
/* 👆 T-3이 누르는 순간들. **셋 이상**이라야 「화면 = 판 끝 문구」가 한 순간의 우연이 아니에요 */
const PRESS_T = [0, 400, 900, 1600];
/* 🔒 눌러 본 표본에서도 **세 등급이 다 나와야** T-3이 뭔가를 봅니다.
 *    실측(24벌 × 4시각 = 96판): 완벽 8 · 스침 40 · 0점 48. 바닥은 그 절반쯤 —
 *    `hot`은 칸의 3.5%뿐이라 **누를 칸을 등급별로 고르지 않으면** 완벽이 2판까지 떨어집니다. */
const MIN_PRESS_EACH = 5;

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 — **0번이 먼저 소스와 대조합니다**
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 T-M1 — `in` 토글을 **통째로 끕니다.** engineer가 120번 §7에서 실제로 해 본 흠이에요.
   *    🔑 밝기도 판정도 그대로라 `one-grid-test`는 **전부 초록불**입니다. */
  IN_OFF: [[/c\.el\.classList\.toggle\("w2m-cell-in", !hot && v > TIER_S\.in\);/,
    'c.el.classList.toggle("w2m-cell-in", false);']],
  /* 🔴 T-M2 — `in`을 **늘 켭니다.** `hot`과 겹치고, **0점 칸에도 테두리**가 붙어요 —
   *    「여기 눌러도 돼」라는 거짓말이 여섯 칸 전부에 뜹니다. */
  IN_ALL: [[/c\.el\.classList\.toggle\("w2m-cell-in", !hot && v > TIER_S\.in\);/,
    'c.el.classList.toggle("w2m-cell-in", true);']],
  /* 🔴 T-M3 — 배타만 깹니다(`!hot`을 뺌). 0점 칸은 그대로예요 —
   *    **T-1만** 물고 T-2의 「0점 칸」 줄은 안 물어야 합니다(어느 문장이 무엇을 지키는지 갈라집니다). */
  IN_OVERLAP: [[/c\.el\.classList\.toggle\("w2m-cell-in", !hot && v > TIER_S\.in\);/,
    'c.el.classList.toggle("w2m-cell-in", v > TIER_S.in);']],
  /* 🔴 T-M4 — 🪦 **`rise`를 되살립니다.** 소스가 묘비까지 세운 자리예요. */
  RISE_BACK: [[/ {8}c\.el\.classList\.toggle\("w2m-cell-soon", v2 < v - 0\.08\);/,
    '        c.el.classList.toggle("w2m-cell-soon", v2 < v - 0.08);\n'
    + '        c.el.classList.toggle("w2m-cell-rise", v2 > v + 0.02);']],
  /* 🔴 T-M5 — 🔗 **문턱을 내립니다**(`TIER_S.perfect` 0.75 → 0.35).
   *    🔑 `paint()`도 `end()`도 **같은 주인**을 읽으니 T-3은 여전히 초록불이에요 —
   *       이걸 잡는 건 **박아 둔 0.75**뿐입니다(T-2). 🔒 값을 정규식에 안 박습니다. */
  PERFECT_LOW: [[/const TIER_S = \{ perfect: [\d.]+, in: [\d.]+ \};/,
    "const TIER_S = { perfect: 0.35, in: 0 };"]],
  /* 🔴 T-M6 — 🗣️ **판 끝 「문구」만 제 문턱을 갖습니다.** 화면은 «완벽»이라 그려 놓고
   *    말은 «스쳤어요»가 됩니다. `w2m-t-*` 등급은 안 갈려요 — **낱말 줄만** 물어야 합니다. */
  END_WORD_OWN: [[/ {6}end\(s, s >= TIER_S\.perfect \?/, "      end(s, s >= 0.45 ?"]],
  /* 🔴 T-M7 — 🎖️ **판 끝 「등급」만 제 문턱을 갖습니다**(`w2m-t-perfect` 상자 색).
   *    낱말은 안 갈려요 — 같은 판에서 상자 색과 문구가 갈라집니다. */
  TIER_OWN: [[/const TIER = \(s\) => \(s >= TIER_S\.perfect \? "perfect" : s > TIER_S\.in \? "ok" : "miss"\);/,
    'const TIER = (s) => (s >= 0.45 ? "perfect" : s > 0 ? "ok" : "miss");']],
};

/* ══════════════════════════════════════════════════════════════
 * 🎬 판 하나 — **시계를 얼린 채** (one-grid-test와 같은 방식)
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BASE = 1e5;
async function open(o) {
  const W = momentDom(o.muts);
  W.Math.random = mulberry32(o.seed);
  let clk = BASE;
  W.performance.now = () => clk;
  /* 🔒 rAF에 **`nowMs()`와 같은 값**을 물립니다 — 그림과 판정이 같은 순간이에요 */
  W.requestAnimationFrame = (cb) => W.setTimeout(() => cb(clk), 0);
  const st = W.setTimeout;
  W.setTimeout = (fn) => st(fn, 0);
  const host = W.document.getElementById("host");
  W.W2Moment.play(host, { moment: "oneone", kind: o.kind || "goal",
    condition: o.cond == null ? 80 : o.cond, foot: o.foot || "R" }, () => {});
  await wait(6);
  /* ▶️ 준비 화면을 **게임이 여는 문으로** 지납니다 */
  const go = host.querySelector(".w2m-go");
  if (go) { pressDom(W, go); await wait(6); }
  return { W, host,
    words: () => W.W2Moment.WORDS[o.kind || "goal"],
    at: async (ms) => { clk = BASE + ms; await wait(6); },
    close: () => { try { W.close(); } catch (e) { /* 이미 닫힘 */ } } };
}
/* 🔎 화면이 지금 말하는 것 — 밝기와 **등급 클래스**를 전부 화면에서 읽습니다 */
const cellsOf = (h) => Array.from(h.host.querySelectorAll(".w2m-cell")).map((c) => ({
  i: Number(c.dataset.i),
  op: Number(c.querySelector(".w2m-cell-lit").style.opacity),
  strong: c.classList.contains("w2m-strong"),      // 🦶 주발 쪽 절반의 칸인가
  hot: c.classList.contains("w2m-cell-hot"),
  inn: c.classList.contains("w2m-cell-in"),
  rise: c.classList.contains("w2m-cell-rise"),
  el: c,
}));

/* 🎲 판 24벌의 조건 — 🔒 **격자 한 칸으로 재지 않습니다**(종류·주발·컨디션을 같이 씁니다) */
const KINDS = ["goal", "assist"], FEET = ["R", "L"], CONDS = [55, 80, 95];
const caseOf = (s, i) => ({ seed: s, kind: KINDS[i % 2], foot: FEET[(i >> 1) % 2], cond: CONDS[i % 3] });

/* ══════════════════════════════════════════════════════════════
 * 🔬 A. 프레임 쓸기 — 등급 클래스를 화면에서 세어 옵니다
 * ══════════════════════════════════════════════════════════════ */
async function sweep(muts) {
  const acc = { hot: 0, inn: 0, zero: 0, both: 0, rise: 0, ambig: 0,
    drawnZero: 0, inOnZero: 0, hotOnZero: 0, hotWrong: 0, inWrong: 0, n: 0,
    /* 🦶 **주발 / 약발을 갈라서 셉니다** (2026-09-02 · balancer 124번).
     * 🚨 `hot ⟺ mul · tight ≥ 24/23`이라 **약발 쪽 칸에서는 닫힌 식으로 절대 안 열립니다** —
     *    컨디션 100에도, ♿ 확대를 켜도요. 한쪽만 재면 **100%나 0%**가 나와요.
     * 🔒 여기서 그 비를 **단언하지 않습니다** — designer/balancer가 판정 중인 축이라
     *    검사가 먼저 굳히면 다음 판정이 나올 때 이 파일이 옛 계약이 됩니다.
     *    **측정 조건으로 찍기만** 합니다(다음 사람이 왜 76인지 알 수 있게). */
    hotStrong: 0, hotWeak: 0, cellStrong: 0, cellWeak: 0, ex: [] };
  for (let i = 0; i < SEEDS.length; i++) {
    const c = caseOf(SEEDS[i], i);
    const h = await open({ ...c, muts });
    for (const t of TIMES) {
      await h.at(t);
      for (const cell of cellsOf(h)) {
        acc.n += 1;
        if (cell.rise) acc.rise += 1;
        if (cell.hot && cell.inn) {
          acc.both += 1;
          if (acc.ex.length < 6) acc.ex.push(`겹침 시드${c.seed} ${t}ms 칸${cell.i} op=${cell.op}`);
        }
        if (cell.strong) acc.cellStrong += 1; else acc.cellWeak += 1;
        if (cell.hot) { acc.hot += 1; if (cell.strong) acc.hotStrong += 1; else acc.hotWeak += 1; }
        else if (cell.inn) acc.inn += 1;
        else acc.zero += 1;
        /* 🌫️ **밝기 0으로 그려진 칸** — 「이 칸은 0점」이라고 말하는 자리예요.
         *    🔒 `hot`은 **한 톨도 허용 안 합니다**(op 0인데 s ≥ 0.75는 자릿수로 못 생겨요).
         *    🔒 테두리는 **비율**로 봅니다 — 위 `GREY_RATE` 주석의 이유. */
        if (cell.op <= IN_S) {
          acc.drawnZero += 1;
          if (cell.hot) {
            acc.hotOnZero += 1;
            if (acc.ex.length < 6) acc.ex.push(`0점에 ◎ 시드${c.seed} ${t}ms 칸${cell.i}`);
          } else if (cell.inn) {
            acc.inOnZero += 1;
            if (acc.ex.length < 6) acc.ex.push(`0점에 테두리 시드${c.seed} ${t}ms 칸${cell.i}`);
          }
          continue;
        }
        /* 🔗 박아 둔 문턱과 대조 — 경계(±AMBIG)에 앉은 표본은 **빼고** 셉니다 */
        if (Math.abs(cell.op - PERF_S) < AMBIG) { acc.ambig += 1; continue; }
        const wantHot = cell.op >= PERF_S;
        if (cell.hot !== wantHot) {
          acc.hotWrong += 1;
          if (acc.ex.length < 6) acc.ex.push(`hot 어긋남 시드${c.seed} ${t}ms 칸${cell.i} op=${cell.op} hot=${cell.hot}`);
        }
        if (cell.inn !== !wantHot) {
          acc.inWrong += 1;
          if (acc.ex.length < 6) acc.ex.push(`in 어긋남 시드${c.seed} ${t}ms 칸${cell.i} op=${cell.op} in=${cell.inn}`);
        }
      }
    }
    h.close();
  }
  return acc;
}
/* 📐 문장 셋 — **변이 검증이 같은 함수를 씁니다**(기준선과 다른 자를 대면 안 잡혀요) */
const T1 = (a) => ({ ok: a.both === 0 && a.hot >= MIN_HOT && a.inn >= MIN_IN && a.zero >= MIN_ZERO });
const T1b = (a) => ({ ok: a.rise === 0 });
const greyRate = (a) => (a.drawnZero ? a.inOnZero / a.drawnZero : 0);
const T2 = (a) => ({ ok: a.hotWrong === 0 && a.inWrong === 0 && a.hotOnZero === 0
  && greyRate(a) <= GREY_RATE
  && a.hot >= MIN_HOT && a.inn >= MIN_IN && a.zero >= MIN_ZERO });

/* ══════════════════════════════════════════════════════════════
 * 🔬 B. 눌러 봅니다 — **화면 등급 ↔ 판 끝 등급·문구**
 * ══════════════════════════════════════════════════════════════
 * 🔑 문턱을 여기서 한 번도 안 씁니다. **두 관측값끼리** 견줘요 —
 *    「그 칸에 붙어 있던 클래스」와 「판이 끝나며 붙인 `w2m-t-*` + 낱말」.
 *    🔒 그래서 `TIER_S`를 통째로 갈아도 **이 문장은 초록불이어야** 맞습니다
 *       (그건 T-2가 잡는 몫이에요 — 한 계약에 주인은 하나). */
async function pressProbe(muts) {
  const acc = { n: 0, perfect: 0, ok: 0, miss: 0, tierBad: 0, wordBad: 0, dead: 0, ex: [] };
  for (let i = 0; i < SEEDS.length; i++) {
    const c = caseOf(SEEDS[i], i);
    for (let k = 0; k < PRESS_T.length; k++) {
      const h = await open({ ...c, muts });
      await h.at(PRESS_T[k]);
      const cells = cellsOf(h);
      /* 👆 누를 칸을 **등급이 골고루 나오도록** 고릅니다.
       * 🔴 그냥 돌려 가며 고르면 «완벽»이 96판 중 **2판**밖에 안 나옵니다 — `hot`은
       *    전체 칸의 3.5%뿐이라(T-1 실측) 그 상태의 T-3은 «완벽» 쪽을 **아무것도 안 지켜요.**
       * 🔒 고르는 기준은 **화면 클래스**뿐이고, 견주는 것은 여전히 «클래스 ↔ 판 끝»입니다 —
       *    답을 미리 아는 게 아니라 **표본을 고르게 만드는** 것이에요. */
      const want = ["perfect", "ok", "miss"][(i + k) % 3];
      const gradeOf = (x) => (x.hot ? "perfect" : x.inn ? "ok" : "miss");
      const cell = cells.find((x) => gradeOf(x) === want) || cells[(i + k * 2) % cells.length];
      const was = gradeOf(cell);
      const wrap = h.host.querySelector(".w2m-oneone");
      pressDom(h.W, cell.el);
      /* 🔒 **동기로 읽습니다** — `ender`의 620ms가 0으로 뭉개져 있어 상자가 곧 사라져요 */
      const cls = wrap ? String(wrap.className) : "";
      const res = wrap ? wrap.querySelector(".w2m-res") : null;
      const line = res ? String(res.textContent || "") : "";
      const W = h.words();
      const got = cls.includes("w2m-t-perfect") ? "perfect"
        : cls.includes("w2m-t-ok") ? "ok" : cls.includes("w2m-t-miss") ? "miss" : null;
      acc.n += 1;
      acc[was] += 1;
      if (got == null) {
        acc.dead += 1;
        if (acc.ex.length < 6) acc.ex.push(`판이 안 끝났어요 시드${c.seed} ${PRESS_T[k]}ms`);
      } else {
        if (got !== was) {
          acc.tierBad += 1;
          if (acc.ex.length < 6) acc.ex.push(`등급 갈림 시드${c.seed} ${PRESS_T[k]}ms 칸${cell.i} 화면=${was} 판끝=${got} op=${cell.op}`);
        }
        /* 🗣️ 낱말도 같은 주인인가 — 🔒 **문장을 베껴 적지 않고 소스에서 가져옵니다** */
        const wantWord = was === "perfect" ? W.great : was === "ok" ? W.ok : null;
        const wordOK = wantWord != null
          ? line.indexOf(wantWord) === 0
          : (line.indexOf(W.onKeeper) === 0 || line.indexOf(W.far) === 0);
        if (!wordOK) {
          acc.wordBad += 1;
          if (acc.ex.length < 6) acc.ex.push(`낱말 갈림 시드${c.seed} ${PRESS_T[k]}ms 화면=${was} 문구="${line.slice(0, 24)}"`);
        }
      }
      h.close();
    }
  }
  return acc;
}
const T3 = (a) => ({ ok: a.tierBad === 0 && a.wordBad === 0 && a.dead === 0
  && a.perfect >= MIN_PRESS_EACH && a.ok >= MIN_PRESS_EACH && a.miss >= MIN_PRESS_EACH });

/* ══════════════════════════════════════════════════════════════════════ */
async function main() {
  console.log("── 🎯 T. 등급 셋 — `hot` · `in` · 없음이 한 주인을 쓰는가 ──");

  /* ══════════ 0. 변이 정규식이 지금 소스에 걸리는가 ══════════ */
  const bad = momentMutsOK(MUT);
  const nMut = Object.values(MUT).reduce((a, m) => a + m.length, 0);
  check(bad.length === 0,
    `T-0. 🔴 변이 정규식 ${nMut}개가 지금 \`beta/winger-moment.js\`에 전부 걸린다`
    + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 "안 도는" 상태예요**`
      + bad.map((b) => `\n       · ${b}`).join("") : ""));
  if (bad.length) { console.log(`\n❌ 빨간불 ${fail}건`); process.exit(1); }

  const a = await sweep(null);
  const r1 = T1(a), r1b = T1b(a), r2 = T2(a);
  check(r1.ok,
    `T-1. 🎯 **\`hot\`과 \`in\`이 배타다** — 겹친 표본 ${a.both}개 / ${a.n}`
    + `\n     실측 — \`hot\` ${a.hot}(바닥 ${MIN_HOT}) · \`in\` ${a.inn}(바닥 ${MIN_IN}) · 0점 ${a.zero}(바닥 ${MIN_ZERO})`
    + `\n     🔎 측정 조건 — 시드 ${SEEDS.length}벌 × 시각 ${TIMES.length}점 × 6칸 · 종류 2 · 주발 2 · 컨디션 3`
    + `\n     🌫️ 0으로 그려진 칸 ${a.drawnZero}개 (그중 테두리 ${a.inOnZero}개 — T-2가 비율로 봅니다)`
    + `\n     🦶 **주발 / 약발을 갈라서** — \`hot\`이 뜬 칸 주발 ${a.hotStrong} / 약발 ${a.hotWeak}`
    + ` (표본 주발 ${a.cellStrong} · 약발 ${a.cellWeak})`
    + `\n        🚨 \`hot ⟺ mul · tight ≥ 24/23\`이라 **약발 쪽은 닫힌 식으로 안 열립니다**(balancer 124번) —`
    + ` 한쪽만 재면 100%나 0%가 나와요. 🔒 그 비는 **여기서 단언하지 않습니다**(designer 판정 중)`
    + (a.both ? `\n     🔴 **한 칸에 굵은 링과 가는 테두리가 같이 뜹니다** — 두 채널이 같은 말을 두 번 해요` : "")
    + (r1.ok ? "" : a.both ? "" : `\n     🔴 등급 하나가 표본에 거의 안 나옵니다 — 배타 문장이 **아무것도 안 지키는** 상태예요`)
    + (a.ex.length ? `\n     ${a.ex.join("\n     ")}` : ""));
  check(r1b.ok,
    `T-1b. 🪦 **\`w2m-cell-rise\`가 한 번도 안 뜬다** — 뜬 표본 ${a.rise}개 / ${a.n}`
    + `\n     🌍 소스가 세운 묘비: \`slide\` 최대 < \`cov1 − cov0\`(16 < 24)이라 「기다리면 좋아지는 칸」이`
    + `\n        **구조적으로 없습니다.** 되살리려면 그 부등호를 먼저 깨야 하고, 그러면 「빨리 차라」가 죽어요`
    + (r1b.ok ? "" : `\n     🔴 **되살아났습니다 — 클래스가 아니라 「기다려」라는 거짓말이 돌아온 거예요**`));
  check(r2.ok,
    `T-2. 🔗 **등급이 박아 둔 문턱과 일치한다** — \`hot\` ⟺ op ≥ ${PERF_S} · \`in\` ⟺ ${IN_S} < op < ${PERF_S}`
    + `\n     어긋남 — hot ${a.hotWrong} · in ${a.inWrong} · **0점 칸에 ◎ ${a.hotOnZero}**`
    + `\n     🌫️ 0으로 그려진 칸 ${a.drawnZero}개 중 테두리가 붙은 것 ${a.inOnZero}개`
    + ` = ${(greyRate(a) * 100).toFixed(2)}% (상한 ${(GREY_RATE * 100).toFixed(0)}%)`
    + `\n        🔑 \`s\`가 **연속으로** 0까지 내려가니 0 < s < 0.0005인 프레임은 반드시 생깁니다 —`
    + ` 0개로 못 박으면 **자릿수로** 빨간불이 나요`
    + `\n     🔒 경계(±${AMBIG})에 앉아 뺀 표본 ${a.ambig}개 — \`opacity\`가 \`toFixed(3)\`이라 생기는 자릿수예요`
    + `\n     🔒 문턱을 \`TIER_S\`에서 읽어 오지 않습니다 — 읽어 오면 상수를 바꿔도 안 잡혀요`
    + (greyRate(a) > GREY_RATE ? `\n     🔴 **0점 칸에 테두리가 붙습니다** — 초보자에게 「여기 눌러도 돼」라는 거짓말이에요` : "")
    + (a.ex.length ? `\n     ${a.ex.join("\n     ")}` : ""));

  const b = await pressProbe(null);
  const r3 = T3(b);
  check(r3.ok,
    `T-3. 🔗 **화면 등급과 판 끝(상자 색 · 낱말)이 같은 주인을 쓴다** — ${b.n}판을 실제로 눌러 봄`
    + `\n     실측 — 화면이 «완벽» ${b.perfect} · «스침» ${b.ok} · «0점» ${b.miss} (각 바닥 ${MIN_PRESS_EACH})`
    + `\n     어긋남 — 상자 등급 ${b.tierBad} · 낱말 ${b.wordBad} · 판이 안 끝남 ${b.dead}`
    + `\n     🔒 여기서 문턱을 **한 번도 안 씁니다** — 두 관측값(클래스 ↔ \`w2m-t-*\`·낱말)끼리만 견줘요.`
    + `\n        그래서 \`TIER_S\`를 통째로 갈아도 이 문장은 초록불이어야 맞습니다(그건 T-2의 몫)`
    + (b.tierBad ? `\n     🔴 «완벽»이라 그려 놓고 상자는 다른 색입니다` : "")
    + (b.wordBad ? `\n     🔴 «완벽»이라 그려 놓고 «스쳤어요»라고 말합니다` : "")
    + (b.ex.length ? `\n     ${b.ex.join("\n     ")}` : ""));

  /* ══════════════════════════════════════════════════════════════════════
   * 🧪 변이 — **기준선이 초록불인 걸 위에서 먼저 찍고** 시작합니다
   * ══════════════════════════════════════════════════════════════════════ */
  console.log(`\n── 🧪 변이 — 되돌리면 정말 빨간불이 뜨는가 (기준선 ${fail === 0 ? "🟢 초록불" : `🔴 빨간불 ${fail}건`}) ──`);
  if (fail > 0) {
    console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다 — 위를 먼저 고치세요.");
  } else {
    const CASES = [
      ["IN_OFF", "T-2", async (m) => !T2(await sweep(m)).ok],
      ["IN_ALL", "T-1", async (m) => !T1(await sweep(m)).ok],
      ["IN_ALL", "T-2", async (m) => !T2(await sweep(m)).ok],
      /* 🔑 배타만 깬 변이는 **T-1만** 물어야 합니다 — T-2의 「0점 칸」 줄은 안 물어요.
       *    어느 문장이 무엇을 지키는지 갈라 두면, 하나가 죽어도 다른 하나가 남습니다. */
      ["IN_OVERLAP", "T-1", async (m) => !T1(await sweep(m)).ok],
      ["RISE_BACK", "T-1b", async (m) => !T1b(await sweep(m)).ok],
      ["PERFECT_LOW", "T-2", async (m) => !T2(await sweep(m)).ok],
      ["END_WORD_OWN", "T-3", async (m) => !T3(await pressProbe(m)).ok],
      ["TIER_OWN", "T-3", async (m) => !T3(await pressProbe(m)).ok],
    ];
    for (const [name, guard, bites] of CASES) {
      let hit = null, err = null;
      try { hit = await bites(MUT[name]); } catch (e) { err = e; }
      check(hit === true,
        `변이-${name} → **${guard}가 빨간불**이어야 한다`
        + (err ? `\n     💥 변이를 걸었더니 검사가 죽었습니다: ${err.message}`
          + `\n     🔑 죽는 건 초록불도 빨간불도 아니에요 — 문장이 아니라 드라이버가 걸린 겁니다`
          : hit ? "" : `\n     🔴 **안 잡혔습니다 — ${guard}는 아무것도 안 지키고 있어요.** 검사를 고치세요`));
    }
    /* 🔒 **반대 방향도 한 번** — `TIER_S`를 통째로 내려도 T-3은 **초록불이어야** 합니다.
     *    (한 주인을 쓰는 한 화면과 판 끝은 같이 움직여요 — 이게 «한 주인»의 뜻입니다) */
    let stays = null, e2 = null;
    try { stays = T3(await pressProbe(MUT.PERFECT_LOW)).ok; } catch (e) { e2 = e; }
    check(stays === true,
      `변이-PERFECT_LOW → **T-3은 초록불로 남아야** 한다 (한 주인이면 둘이 같이 움직여요)`
      + (e2 ? `\n     💥 ${e2.message}`
        : stays ? "" : `\n     🔴 문턱만 옮겼는데 화면과 판 끝이 갈라졌습니다 — **주인이 둘**이에요`));
  }

  console.log(`\n${fail ? `❌ 빨간불 ${fail}건` : "✅ 전부 통과"} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("💥", e && e.stack ? e.stack : e); process.exit(2); });
