/* 🧒 ⚽ 더 윙어 II — **초등학교 1학년 화면** (총량 불변 · 고른 칸만 먼저 자람 · 옛 세이브 중립)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 이 파일이 생긴 이유 — **초1 화면을 보는 검사가 0곳이었습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * 2026-09-02, 🗺️ 지도와 🏫 초등부 **사이**에 화면이 하나 들어왔습니다(117번 §2-3 · 120번 §2).
 * 화면 하나 · 3택 · [다음] 없음 · 탭 하나가 고르기 겸 넘김.
 * 🔴 그런데 이 화면과 `CHILD_FOCUS`를 보는 검사가 **0곳**이었어요. 그 상태로는
 *   · 세 갈래가 **칸을 겹치게** 되어도 (= 어떤 갈래가 공짜로 유리해져도)
 *   · `childFocus`가 **아무 데도 안 닿게** 되어도 (= 고르기가 장식이 되어도)
 *   · 옛 세이브(`childPicks` 없음)가 **중립이 아니게** 되어도
 * 아무도 안 웁니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 값을 고치기 전에 여기부터 여세요
 * ═════════════════════════════════════════════════════════════════════════
 *
 * 「🧒 **한 해(초1)만 고르고, 총량은 안 바뀌며, 바뀌는 것은 「어느 칸이 먼저 자라나」뿐**인 세계」.
 *
 *   · `CHILD_FOCUS` 세 갈래가 여섯 칸을 **2 + 2 + 2로 정확히** 나눕니다 (합집합 6 · 겹침 0)
 *     🔑 **그 성질이 「어느 갈래도 공짜로 유리하지 않다」를 「구조로」 만듭니다.**
 *     겹치면 겹친 칸이 두 갈래에서 밀려 그 칸을 쓰는 포지션이 유리해져요.
 *   · `spread()`가 `focus`를 `indexOf`로 봐서 **같은 칸이 두 번 들어가도 한 번만** 곱해집니다
 *     🔑 그래서 **초2·초3이 없습니다** — 같은 걸 또 고르면 값이 **정확히 0**이에요.
 *     🔴 초2를 짓는 판정이 나오면 «같은 걸 두 번 고르면 달라지는» 구조가 **먼저**입니다.
 *   · 총합은 언제나 `POOL`이라 `overall()`(= 총합 ÷ 6)이 **조합에 무관하게 한 값**입니다
 *   · 🔒 `S.childPicks`는 **길이 1짜리 배열**이고, 읽는 쪽 기본값은 `[]`입니다
 *     (초2·초3이 열릴 자리 — 그때도 세이브 스키마가 안 바뀌게)
 *
 * ⚠️ **뒤집히면 이 파일이 옛 계약이 되는 판정**
 *   · *"고르면 총량도 늘려 주자"* → **C-2**가 통째로 옛 계약입니다. 그 순간 「고르기」가
 *     모양이 아니라 **세지는 손잡이**가 돼요(102번 §5 ⓑ와 같은 형태)
 *   · *"갈래를 넷으로 늘리자"* → **C-1**의 「2+2+2 · 겹침 0」이 성립할 수 없습니다.
 *     칸이 여섯인데 갈래가 넷이면 반드시 겹쳐요 — 여기부터 여세요
 *   · *"초1에도 [다음]을 붙이자"* → **C-4**의 탭 수가 하나 늘고 `foot-next-test` N-8의
 *     7도 8이 됩니다. 🔒 **셋이 한 흐름을 봅니다**(N-8 · `town-test` DECISIONS_BEFORE_CARD · 여기)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 페이지를 통째로 싣습니다
 *   ② **`CHILD_FOCUS`·`POOL`은 소스에서 가져오고**(베껴 적지 않아요),
 *      **문턱(효과 크기·표본 바닥)은 여기 박습니다**
 *   ③ **게임 입구를 통해** — C-4는 타이틀에서 출발해 실제 카드를 눌러 도달합니다
 *   ④ **시드 하나로 안 잽니다** — 5시장 × 4포지션 × 400굴림 × 4갈래 = 32,000굴림
 *   ⑤ **기준선이 초록불인 것을 먼저 찍고** 변이를 겁니다.
 *      그리고 C-4는 **「도달했는가」가 아니라 「눌렀는가」**를 셉니다 —
 *      안 눌러도 흐름이 끝까지 밀리면 그게 「자가 복구가 실패를 삼킴」이에요
 *
 * 📐 **문턱을 어디에 뒀나 — 두 줄을 먼저 적었습니다**
 *   ① **무엇과 견주는가** — 같은 시장·같은 포지션에서 **고른 갈래 ↔ 아무것도 안 고른 판**의
 *      「그 갈래가 미는 두 칸의 평균 합」. 🔒 절대값이 아니라 **차이**입니다.
 *   ② **격자의 어느 칸에서 재는가** — 5시장 × 4포지션 전부를 훑습니다.
 *      🔴 한 시장에서만 재면 `YOUTH_FOCUS`와 겹치는 자리에서 값이 달라져요
 *      (예: 🇧🇷 `br`은 이미 `dribble`·`shoot`을 밀어서 `ball`의 한계 효과가 작습니다).
 *   실측 Δ — ball +7.60 · body +7.70 · eye +6.43   →  바닥 **3.0**(실측의 절반쯤)
 *   되돌리면(`childFocus` → 늘 `[]`) Δ가 **0**이라 사이가 넓습니다.
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가:
 *     카드 셋이 «셋 중 하나»로 읽히는지 · 620ms가 「방금 고른 것을 읽기에」 충분한지 ·
 *     문구가 여덟 살의 하루로 읽히는지 · `.child-place`/`.child-story`/`.child-echo`의 모양.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 */
"use strict";
const { bootPage, pageMutsOK, townAuto, tapFoot, tapChild, pickOrigin, seedBoth }
  = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════ */
const N_KEYS = 3;           // 🧒 갈래 셋 (⚽ 공 · 🛡️ 몸 · 👀 눈)
const PER_KEY = 2;          // 🧒 갈래마다 미는 칸 둘 — 🔒 2 + 2 + 2가 여섯 칸을 정확히 덮습니다
const N_STATS = 6;          // 📊 능력치 여섯 칸
const ROLLS = 400;          // 🎲 시장·포지션 조합마다
const MIN_LIFT = 3.0;       // 📈 고른 두 칸의 평균 합이 이만큼은 올라야 (실측 +6.4 ~ +7.7)
const MAX_SPILL = 1.0;      // 📉 안 고른 칸은 **안 올라야** 합니다 (실측 −1.8 ~ −2.0)
const CARD_KEYS = ["ball", "body", "eye"];   // 🖥️ 화면에 서야 하는 카드 셋 (세이브가 가리키는 키)
const SEEDS = [11, 23, 37];

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 — **0번이 먼저 소스와 대조합니다**
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 C-M1 — 🧒 **갈래 둘이 한 칸을 겹칩니다.** 👀 눈이 `speed` 대신 `dribble`을 밀어요.
   *    🔑 총합은 여전히 194고 화면도 멀쩡합니다 — **겹침만** 생겨요.
   *    그 순간 `dribble`을 쓰는 포지션이 두 갈래에서 밀리고, `speed`는 아무도 안 밉니다. */
  OVERLAP: { "prospect.js": [[/eye: {2}\["pass", "speed"\]/, 'eye:  ["pass", "dribble"]']] },
  /* 🔴 C-M2 — 🧒 **고르기가 아무 데도 안 닿습니다.** 화면은 그대로 뜨고 620ms도 그대로예요 —
   *    바뀌는 건 «고른 것이 값에 닿느냐»뿐이라 **화면만 보는 검사는 전부 초록불**입니다. */
  NOFOCUS: { "prospect.js": [[/ {4}for \(const k of \(picks \|\| \[\]\)\) for \(const st of \(CHILD_FOCUS\[k\] \|\| \[\]\)\) out\.push\(st\);/,
    "    /* 🧪 기여 제거 */"]] },
  /* 🔴 C-M3 — 📀 **옛 세이브의 기본값이 중립이 아닙니다.** `childPicks`가 없던 세이브가
   *    갑자기 ⚽를 고른 것이 돼요 — 마이그레이션을 안 하기로 한 규칙의 정면입니다. */
  DEFAULT_BALL: { "game.js": [[/^let chosenChild = \[\];$/m, 'let chosenChild = ["ball"];']] },
  /* 🔴 C-M4 — 🖥️ **어느 카드를 눌러도 첫 갈래로 갑니다.** 화면은 셋을 보여 주고
   *    눌린 카드에 `on`도 붙는데, **넘어가는 값만** 첫 갈래예요 —
   *    「고른 것과 넘어간 것이 다른」 상태입니다. */
  PICK_FIRST: { "intro.js": [[/setTimeout\(\(\) => done\(c\.key\), ECHO_MS\);/,
    "setTimeout(() => done(CHILD_PICKS[0].key), ECHO_MS);"]] },
  /* 🔴 C-M5 — 🖥️ **카드를 두 장만 그립니다.** 갈래는 셋인데 화면은 둘이라
   *    한 갈래에 **닿을 길이 없어집니다**(값 쪽 검사는 전부 초록불). */
  TWO_CARDS: { "intro.js": [[/list\.innerHTML = CHILD_PICKS\.map\(\(c\) =>/,
    "list.innerHTML = CHILD_PICKS.slice(0, 2).map((c) =>"]] },
};

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버
 * ══════════════════════════════════════════════════════════════ */
function boot(seed, muts) {
  const W = bootPage(muts ? { muts } : undefined);
  seedBoth(W, seed);
  const D = W.document;
  let taps = 0;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    taps += 1;
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  return { W, D, press, taps: () => taps,
    P: () => W.WingerProspect,
    S: () => W.__get("S"),
    active: () => (D.querySelector(".screen.active") || {}).id,
    close: () => W.close() };
}
/* 🚪 **게임 입구를 통해** 🧒 초1 화면 앞까지. 여기서 멈춥니다(화면을 그 자리에서 읽으려고요). */
async function toChild(h) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(h.W, h.press, "R");
  const back = townAuto(h.W);
  pickOrigin(h.W, h.press, "seoul");
  return back;
}
const sumOf = (o) => Object.keys(o).reduce((a, k) => a + o[k], 0);

/* 📊 갈래별 평균표 — 5시장 × 4포지션 × ROLLS */
function meansOf(h, picks) {
  const P = h.P();
  const MK = h.W.__get("MARKETS").map((m) => m.id);
  const POS = Object.keys(h.W.__get("POS_INFO"));
  const acc = {}, sums = new Set();
  let n = 0;
  for (const m of MK) for (const p of POS) for (let i = 0; i < ROLLS; i++) {
    const r = P.rollShape(m, p, picks);
    sums.add(sumOf(r.stats));
    for (const k of Object.keys(r.stats)) acc[k] = (acc[k] || 0) + r.stats[k];
    n += 1;
  }
  const mean = {};
  for (const k of Object.keys(acc)) mean[k] = acc[k] / n;
  return { mean, sums: [...sums], n, markets: MK.length, pos: POS.length };
}

async function main() {
  console.log("── 🧒 C. 초등학교 1학년 화면 ──");

  /* ══════════ 0. 변이 정규식이 지금 소스에 걸리는가 ══════════ */
  {
    const bad = pageMutsOK(MUT);
    const n = Object.values(MUT).reduce((a, byFile) =>
      a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
    check(bad.length === 0,
      `C-0. 🧪 변이 정규식 ${n}개가 지금 \`beta/winger2/\`에 전부 걸린다`
      + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 "안 도는" 상태예요**`
        + bad.map((b) => `\n       · ${b}`).join("") : ""));
    if (bad.length) { console.log(`\n❌ 빨간불 ${fail}건`); process.exit(1); }
  }

  /* ══════════════════════════════════════════════════════════════════════
   * C-1. 🧩 **2 + 2 + 2 — 합집합 여섯 칸 · 겹침 0**
   * ══════════════════════════════════════════════════════════════════════
   * 🔑 이게 「어느 갈래도 공짜로 유리하지 않다」를 **구조로** 만드는 자리예요.
   *    겹치면 겹친 칸이 두 갈래에서 밀리고, 아무도 안 미는 칸이 생깁니다. */
  const h0 = boot(SEEDS[0]);
  {
    const F = h0.P()._t.CHILD_FOCUS;                    // 🔒 소스에서 가져옵니다(베껴 적지 않아요)
    const STATS = h0.W.__get("STAT_DEFS").map((d) => d.key);
    const keys = Object.keys(F);
    const all = keys.reduce((a, k) => a.concat(F[k]), []);
    const uniq = Array.from(new Set(all));
    const missing = STATS.filter((s) => uniq.indexOf(s) < 0);
    const dup = all.length - uniq.length;
    const sizes = keys.map((k) => F[k].length);
    const ok = keys.length === N_KEYS && sizes.every((n) => n === PER_KEY)
      && uniq.length === N_STATS && dup === 0 && missing.length === 0;
    check(ok,
      `C-1. 🧩 **\`CHILD_FOCUS\`가 여섯 칸을 ${PER_KEY}+${PER_KEY}+${PER_KEY}로 나눈다** — 갈래 ${keys.length} · 합집합 ${uniq.length} · 겹침 ${dup}`
      + `\n     ${keys.map((k) => `${k}: ${F[k].join(" + ")}`).join(" · ")}`
      + `\n     🔎 능력치 여섯 칸은 \`STAT_DEFS\`에서 읽습니다 — [${STATS.join(", ")}]`
      + (dup ? `\n     🔴 **겹칩니다** — 겹친 칸은 두 갈래에서 밀리고, 아무도 안 미는 칸이 생겨요` : "")
      + (missing.length ? `\n     🔴 아무도 안 미는 칸: ${missing.join(", ")}` : ""));
  }

  /* ══════════════════════════════════════════════════════════════════════
   * C-2. 📊 **총량이 안 바뀐다** — 바뀌는 것은 모양뿐
   * ══════════════════════════════════════════════════════════════════════
   * 🔒 **값이 아니라 관계로 씁니다** — 「합이 194다」가 아니라 「**갈래를 바꿔도 합이 같다**」예요.
   *    `POOL`은 밸런스 손잡이라 움직일 수 있고, 그때 이 문장은 그대로 살아 있어야 합니다.
   *    (참고로 지금 값은 아래 출력에 찍습니다 — 못 박지는 않아요) */
  const BRANCHES = [[], ["ball"], ["body"], ["eye"]];
  const M = BRANCHES.map((b) => ({ tag: b.length ? b[0] : "none", ...meansOf(h0, b) }));
  {
    const allSums = Array.from(new Set(M.reduce((a, m) => a.concat(m.sums), [])));
    const overalls = Array.from(new Set(allSums.map((s) => (s / N_STATS).toFixed(6))));
    const POOL = h0.P().POOL;
    const ok = allSums.length === 1 && overalls.length === 1 && allSums[0] === POOL;
    check(ok,
      `C-2. 📊 **갈래를 바꿔도 총합이 같다** — 서로 다른 총합 ${allSums.length}개 · \`overall()\` ${overalls.length}개`
      + `\n     🔎 측정 조건 — 갈래 ${BRANCHES.length} × 시장 ${M[0].markets} × 포지션 ${M[0].pos} × ${ROLLS}굴림 = **${M.reduce((a, m) => a + m.n, 0).toLocaleString()}굴림**`
      + `\n     총합 [${allSums.join(", ")}] (소스의 \`POOL\` ${POOL}) · \`overall()\` [${overalls.join(", ")}]`
      + `\n     🔒 「합이 ${POOL}이다」가 아니라 「**갈래를 바꿔도 같다**」를 봅니다 — \`POOL\`은 움직일 수 있는 손잡이예요`
      + (ok ? "" : `\n     🔴 **고르기가 모양이 아니라 「세지는 손잡이」가 됐습니다** — 그 순간 3택이 정답 하나짜리가 돼요`));
  }

  /* ══════════════════════════════════════════════════════════════════════
   * C-3. 📈 **고른 칸만 먼저 자란다** — 그리고 안 고른 칸은 안 오른다
   * ══════════════════════════════════════════════════════════════════════ */
  {
    const F = h0.P()._t.CHILD_FOCUS;
    const none = M[0].mean;
    const rows = [], bad = [];
    for (const k of Object.keys(F)) {
      const row = M.find((m) => m.tag === k);
      if (!row) { bad.push(`${k}: 표본 없음`); continue; }
      const own = F[k];
      const lift = own.reduce((a, s) => a + row.mean[s] - none[s], 0);
      const spill = Object.keys(none).filter((s) => own.indexOf(s) < 0)
        .map((s) => row.mean[s] - none[s]);
      const worst = Math.max(...spill);
      rows.push(`${k}(${own.join("+")}) Δ${lift >= 0 ? "+" : ""}${lift.toFixed(2)} · 다른 칸 최대 ${worst >= 0 ? "+" : ""}${worst.toFixed(2)}`);
      if (lift < MIN_LIFT) bad.push(`${k}: 오름 ${lift.toFixed(2)} < ${MIN_LIFT}`);
      if (worst > MAX_SPILL) bad.push(`${k}: 안 고른 칸이 ${worst.toFixed(2)} 올랐어요`);
    }
    check(bad.length === 0,
      `C-3. 📈 **고른 두 칸이 실제로 먼저 자란다** — 갈래 셋 전부 (바닥 +${MIN_LIFT} · 다른 칸 상한 +${MAX_SPILL})`
      + `\n     ${rows.join("\n     ")}`
      + `\n     🔎 측정 조건 — **아무것도 안 고른 판과 짝지은 차이**입니다(절대값이 아니에요).`
      + ` 5시장 전부를 훑어요 — 🇧🇷처럼 \`YOUTH_FOCUS\`와 겹치는 시장에서는 한계 효과가 작습니다`
      + `\n     🔒 총합이 고정이라 **고른 칸이 오르면 나머지는 내려갑니다** — 그게 「모양만 바뀐다」의 모습이에요`
      + (bad.length ? `\n     🔴 ${bad.join(" · ")}` : ""));
  }
  h0.close();

  /* ══════════════════════════════════════════════════════════════════════
   * C-4. 🖥️ **화면 — 게임 입구를 통해 실제로 눌러 봅니다**
   * ══════════════════════════════════════════════════════════════════════
   * 🔴 **「도달했는가」가 아니라 「눌렀는가」를 셉니다.** 탭 수를 안 보면, 카드 선택자가
   *    바뀌어 아무것도 안 눌러도 타임아웃·기본값이 흐름을 끝까지 밀어 **초록불**이 나요. */
  async function screenProbe(muts, want) {
    const h = boot(SEEDS[0], muts);
    const back = await toChild(h);
    const at = h.active();
    const cards = Array.from(h.D.querySelectorAll("#child-list .card[data-child]"));
    const keys = cards.map((c) => c.dataset.child);
    const before = h.taps();
    const kid = await tapChild(h.W, h.press, want || "eye");
    const tapped = h.taps() - before;
    /* 🔴 **게임이 실제로 받아 든 값을 읽습니다.** `tapChild`가 돌려주는 건 «내가 누르려 한 것»이라
     *    그걸 견주면 **자기 자신과 비교**예요 — 어느 카드를 눌러도 첫 갈래로 가는 흠(C-M4)이
     *    그 상태에서는 **안 잡힙니다**(실제로 안 잡혔습니다). */
    const stored = h.W.__get("chosenChild");
    const S = h.S();
    const out = { at, keys, tapped, kid, after: h.active(),
      stored: Array.isArray(stored) ? stored.slice() : stored,
      picks: S && Array.isArray(S.childPicks) ? S.childPicks.slice() : null };
    if (back) back();
    h.close();
    return out;
  }
  {
    /* 🔒 `S.childPicks`는 🏟️ 제안까지 가야 써집니다 — 여기서는 화면과 넘어간 값까지만 봅니다.
     *    세이브 기본값은 아래 C-5가 **읽는 쪽**에서 따로 봐요. */
    const r = await screenProbe(null, "eye");
    const sameKeys = r.keys.length === CARD_KEYS.length
      && CARD_KEYS.every((k, i) => r.keys[i] === k);
    const storedOK = Array.isArray(r.stored) && r.stored.length === 1 && r.stored[0] === "eye";
    const ok = r.at === "screen-child" && sameKeys && r.tapped === 1
      && storedOK && r.after !== "screen-child";
    check(ok,
      `C-4. 🖥️ **🗺️ 지도 다음이 🧒 초1이고, 누른 카드가 그대로 담긴다** — 도착 ${r.at} → ${r.after}`
      + `\n     카드 [${r.keys.join(", ")}] (계약 [${CARD_KEYS.join(", ")}]) · **탭 ${r.tapped}번**`
      + ` · 👀 \`eye\`를 눌렀더니 게임이 담은 것 **[${(r.stored || []).join(",")}]**`
      + `\n     🔒 견주는 것은 «누르려 한 것»이 아니라 **게임이 받아 든 \`chosenChild\`**예요 —`
      + ` 전자와 견주면 그건 자기 자신과 비교입니다`
      + `\n     🔴 「탭 > 0」을 같이 봅니다 — 안 누르고 지나가도 흐름이 끝까지 밀리면 그게 **자가 복구가 실패를 삼킴**이에요`
      + `\n     🔒 [다음]이 없어 탭이 **하나**입니다 — 둘이 되면 \`foot-next-test\` N-8의 7도 8이 돼야 해요`
      + (ok ? "" : `\n     🔴 계약과 다릅니다`));
  }

  /* ══════════════════════════════════════════════════════════════════════
   * C-5. 📀 **옛 세이브가 정확히 중립** — 마이그레이션하지 않습니다
   * ══════════════════════════════════════════════════════════════════════
   * 🔑 두 방향을 다 봅니다:
   *   ① 읽는 쪽 기본값이 `[]`이고, 빈 배열의 기여가 **정확히 0**인가
   *      (= 셋째 인자를 아예 안 넘긴 것과 **비트 단위로 같은가**)
   *   ② 화면에 도달하기 전 `chosenChild`가 **비어 있는가**
   *      🔴 여기에 기본값이 박히면 옛 세이브가 «⚽를 고른 것»이 됩니다. */
  {
    const h = boot(SEEDS[1]);
    const P = h.P(), T = P._t;
    /* ① 빈 배열 ↔ 인자 없음 ↔ 없는 필드 — 셋이 같은 굴림을 내야 합니다.
     * 🔒 **같은 자리에서** 견줍니다 — 굴릴 때마다 난수가 도니, 매 굴림 전에 흐름을 되감아요. */
    const s = seedBoth(h.W, SEEDS[1]);
    const at = s.i;
    const one = (arg) => { s.i = at; const r = P.rollShape("k", "wg", arg); return JSON.stringify(r); };
    const a = one([]), b = one(undefined), c = one(T.childFocus(undefined));
    const emptyOK = a === b && b === c;
    const deflt = h.W.__get("chosenChild");
    const bare = T.childFocus(undefined).length === 0 && T.childFocus([]).length === 0;
    const ok = emptyOK && bare && Array.isArray(deflt) && deflt.length === 0;
    check(ok,
      `C-5. 📀 **옛 세이브가 정확히 중립이다** — 빈 배열의 기여가 0 · \`chosenChild\` 기본값 [${(deflt || []).join(",")}]`
      + `\n     같은 자리에서 굴린 셋: \`[]\` ↔ 인자 없음 ↔ \`childFocus(undefined)\` — ${emptyOK ? "비트 단위로 같음 ✔" : "🔴 다름"}`
      + `\n     🔒 마이그레이션하지 않습니다(CLAUDE.md) — 새 필드는 **읽는 쪽**이 기본값을 줘요`
      + (ok ? "" : `\n     🔴 옛 세이브가 «무언가를 고른 것»이 됩니다 — 진행 중인 커리어가 조용히 갈려요`));
    h.close();
  }

  /* ══════════════════════════════════════════════════════════════════════
   * 🧪 변이 — **기준선이 초록불인 걸 위에서 먼저 찍고** 시작합니다
   * ══════════════════════════════════════════════════════════════════════ */
  console.log(`\n── 🧪 변이 — 되돌리면 정말 빨간불이 뜨는가 (기준선 ${fail === 0 ? "🟢 초록불" : `🔴 빨간불 ${fail}건`}) ──`);
  if (fail > 0) {
    console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다 — 위를 먼저 고치세요.");
  } else {
    /* C-1 · C-3은 굴림 쪽, C-4 · C-5는 화면·세이브 쪽 — **무엇이 무엇을 물어야 하는지**를 이름에 적습니다 */
    const focusOf = (muts) => {
      const h = boot(SEEDS[0], muts);
      const F = h.P()._t.CHILD_FOCUS;
      const STATS = h.W.__get("STAT_DEFS").map((d) => d.key);
      const all = Object.keys(F).reduce((a, k) => a.concat(F[k]), []);
      const uniq = Array.from(new Set(all));
      const r = { dup: all.length - uniq.length, uniq: uniq.length, stats: STATS.length };
      h.close();
      return r;
    };
    const liftOf = (muts) => {
      const h = boot(SEEDS[0], muts);
      const F = h.P()._t.CHILD_FOCUS;
      const none = meansOf(h, []).mean;
      const out = Object.keys(F).map((k) => {
        const m = meansOf(h, [k]).mean;
        return F[k].reduce((a, s) => a + m[s] - none[s], 0);
      });
      h.close();
      return out;
    };
    const CASES = [
      ["OVERLAP", "C-1", async (m) => { const r = focusOf(m); return r.dup > 0 || r.uniq < r.stats; }],
      ["NOFOCUS", "C-3", async (m) => liftOf(m).some((v) => v < MIN_LIFT)],
      ["PICK_FIRST", "C-4", async (m) => {
        const r = await screenProbe(m, "eye");
        return !(Array.isArray(r.stored) && r.stored.length === 1 && r.stored[0] === "eye");
      }],
      ["TWO_CARDS", "C-4", async (m) => (await screenProbe(m, "ball")).keys.length !== CARD_KEYS.length],
      ["DEFAULT_BALL", "C-5", async (m) => {
        const h = boot(SEEDS[1], m);
        const d = h.W.__get("chosenChild");
        h.close();
        return !(Array.isArray(d) && d.length === 0);
      }],
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
    /* 🔒 **반대 방향 하나** — `OVERLAP`은 총합에는 한 톨도 안 닿아야 합니다.
     *    겹침과 총량은 **다른 축**이라, 한 변이가 둘 다 물면 어느 쪽이 깨졌는지 못 가려요. */
    let stays = null, e2 = null;
    try {
      const h = boot(SEEDS[0], MUT.OVERLAP);
      const s = new Set();
      for (const b of BRANCHES) meansOf(h, b).sums.forEach((x) => s.add(x));
      h.close();
      stays = s.size === 1;
    } catch (e) { e2 = e; }
    check(stays === true,
      `변이-OVERLAP → **C-2는 초록불로 남아야** 한다 (겹침과 총량은 다른 축이에요)`
      + (e2 ? `\n     💥 ${e2.message}`
        : stays ? "" : `\n     🔴 겹치게 했더니 총합까지 갈렸어요 — 두 문장이 한 축을 보고 있습니다`));
  }

  console.log(`\n${fail ? `❌ 빨간불 ${fail}건` : "✅ 전부 통과"} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("💥", e && e.stack ? e.stack : e); process.exit(2); });
