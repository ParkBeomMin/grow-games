/* ⚽ 더 윙어 II — 🏟️ **학교 경기 화면이 성적에 안 닿는다** (`beta/winger2/town.js`)
 *
 * engineer가 105번 §6에서 *"검사가 없는 자리 셋"*으로 넘긴 자리입니다. 셋 다
 * **변이해도 검사 4종이 전부 초록불**이었어요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔩 설계의 못 — *"스코어와 승패는 `spotMul`에 한 톨도 안 닿는다"* (설계 §3-3)
 * ─────────────────────────────────────────────────────────────────────────
 * 🏟️ 경기 화면은 **이미 나온 판정을 읽기만** 합니다. 새 굴림이 0이고, 스코어는
 * 화면에만 살아요. 편차 `d`(→ `spotMul` → 🏟️ 제안 등급)로는 **한 톨도 안 갑니다.**
 *
 * 🔴 그런데 이 못을 지키는 검사가 **0건**이었습니다. engineer 실측:
 *
 *   | 변이 | 결과 |
 *   |---|---|
 *   | M-D `state.score += p` → `+ (골이면 1)` | school ✅ town ✅ town-neutral ✅ youth-moment ✅ |
 *   | M-F 화면 교체 가드 제거                  | 4종 전부 ✅ |
 *   | M-G `let hg = 0` → `let hg = state.cards`| 4종 전부 ✅ |
 *
 * 🔑 **왜 안 잡혔나**: `town-neutral-test`는 `_t.judgeFor`·`_t.PTS`로 아크를
 *    **재구성**해서 `land()`를 **안 지납니다.** 스코어가 `land()` 안에서 새는데
 *    거기를 안 지나가니 보일 수가 없어요.
 *    → **이 검사는 게임 입구(타이틀)에서 진짜 버튼을 눌러 `land()`를 지납니다.**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 재는 방법 — **값이 아니라 관계로**
 * ─────────────────────────────────────────────────────────────────────────
 *   A. 편차 `d`가 **판정만의 함수**다 — `rows()`의 판정으로 재구성한 값과 비트 단위 일치
 *      A-2는 못을 **정면으로** 박습니다: 🏟️ 승패를 뒤집어도(`GOAL_BY` 변이) `d`가 안 변한다
 *   B. 한 단계의 피드 안에서 ⏱️ 분이 **되돌아가지 않는다** (단조 증가)
 *   C. 단계 끝 🏁 스코어가 **그 단계의 판정으로 정확히 재구성**된다
 *
 * 📐 `PTS`·`GOAL_BY`는 **산식**이라 소스에서 정규식으로 뽑습니다 (값을 베껴 적지 않아요).
 *    문턱이 아니에요 — 점수표가 정당하게 바뀌어도 「안 샌다」는 계약은 그대로 성립해야 합니다.
 *
 * 🌍 이 계약이 서 있는 세계:
 *   「🏟️ 경기 화면이 **표시 전용**인 세계」의 문장입니다. *"이겼는데 아무 일도 없다"*는
 *   압박이 반드시 오는데, **승패에 보상을 붙이기로 판정이 바뀌면 A-2부터 다시 보세요.**
 *   그때도 A-1(판정만의 함수)은 **어느 경로로 얼마나 새는지**를 드러내 줍니다.
 *
 * ⏱️ 약 40초 걸려요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, pageMutsOK, townAuto, tapFoot, pickOrigin, passEarly, seedBoth, PAGE_DIR }
  = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 🔒 문턱은 **검사에 박습니다** — 단계별 카드 수는 계약이에요 (초 2 · 중 3 · 고 3). */
const STAGE_N = { e: 2, m: 3, h: 3 };
const SEEDS = [7, 42, 1201];

/* 📐 산식은 **소스에서 뽑습니다.** 값을 베껴 적으면 점수표가 바뀔 때 검사가 거짓말을 해요. */
const TOWN_SRC = fs.readFileSync(path.join(PAGE_DIR, "town.js"), "utf8");
const PTS = (() => {
  const m = TOWN_SRC.match(/const PTS = (\{[^}]*\});/);
  return m ? new Function(`return ${m[1]};`)() : null;
})();
const GOAL_BY = (() => {
  const m = TOWN_SRC.match(/const GOAL_BY = (\{.*\});/);
  return m ? new Function(`return ${m[1]};`)() : null;
})();

/* 🔴 변이 셋 — engineer가 105번 §6에 적은 그대로입니다. */
const MUT = {
  /* ⓐ 🏟️ 스코어가 편차 d로 샙니다 */
  "M-D": { "town.js": [[/      state\.score \+= p;/,
    '      state.score += p + ((GOAL_BY[c.key] || {})[r] === "us" ? 1 : 0);']] },
  /* ⓑ 화면이 갈린 뒤에도 옛 단계의 카드가 피드로 들어옵니다 */
  "M-F": { "town.js": [[/        if \(myGen !== sceneGen\) return null;\n/, ""]] },
  /* ⓒ 단계 스코어가 0으로 안 돌아갑니다 */
  "M-G": { "town.js": [[/    let hg = 0, ag = 0;/, "    let hg = state.cards, ag = 0;"]] },
  /* 🔩 A-2 전용 — **판정은 그대로 두고 승패만 뒤집습니다.** 못을 정면으로 재는 자리예요 */
  "FLIP": { "town.js": [[/  const GOAL_BY = \{ g: \{ perfect: "us" \}, a: \{ perfect: "us" \}, d: \{ miss: "them" \} \};/,
    '  const GOAL_BY = { g: { perfect: "them" }, a: { perfect: "them" }, d: { miss: "us" } };']] },
};

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 학교 경기에 닿습니다
 * ══════════════════════════════════════════════════════════════
 * 🔑 `land()`를 **반드시 지나야** 합니다 — 스코어가 새는 자리가 거기예요.
 *    산식만 떼어 재구성하면 (town-neutral-test가 그렇습니다) 이 셋이 안 보입니다.
 * ⏳ 피드는 **async 큐**로 그려져요. 고정 sleep을 박으면 느린 판에서 헛빨간불이 나니
 *    **「더 안 늘어날 때까지」**를 기다립니다.
 * 🔴 **「두 번 같으면 안정」으로 재면 안 됩니다** — 큐가 아직 시작도 안 한 0줄에서
 *    곧바로 0 === 0이 되어 **늘 빈 화면을 보고 통과**합니다.
 *    ⏳ 먼저 **뜸을 들이고**, 그 다음 세 번 연속 같을 때만 안정으로 봅니다. */
const GRACE = 120;                     // 🔒 검사에 박은 값 — 큐가 첫 줄을 그릴 틈
async function settle(D) {
  const n = () => D.querySelectorAll("#town-scene .w2-feed .w2-min").length;
  await wait(GRACE);
  let prev = -1, hold = 0;
  for (let i = 0; i < 200; i++) {
    const c = n();
    hold = c === prev ? hold + 1 : 0;
    if (hold >= 3) return c;
    prev = c;
    await wait(15);
  }
  return prev;
}

async function arc(seed, muts) {
  const W = bootPage(muts ? { muts } : undefined);
  seedBoth(W, seed);
  const D = W.document;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what})`);
    /* 🖱️ 실기기 순서 그대로 — pointerdown → pointerup → click 셋 다 */
    for (const t of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true }));
    }
  };
  const mins = () => Array.from(D.querySelectorAll("#town-scene .w2-feed .w2-min"))
    .map((x) => parseInt(String(x.textContent).replace(/\D/g, ""), 10));
  const cur = () => (D.querySelector(".screen.active") || {}).id;
  const stages = {};
  async function stage(id) {
    const rec = { start: null, mins: [], fin: "" };
    await settle(D);
    rec.start = mins().length;                        // 🔑 단계가 열릴 때 피드는 비어 있어야 해요
    for (let g = 0; g < 12; g++) {
      if (cur() !== "screen-town") break;
      const b = D.getElementById("btn-town-next");
      if (!b || b.disabled || b.classList.contains("hidden")) break;
      await settle(D);
      rec.mins = mins();
      press(b, "🏫 다음");
    }
    await settle(D);
    rec.mins = mins();
    const f = D.querySelector(".town-final");
    rec.fin = f ? String(f.textContent) : "";
    stages[id] = rec;
  }
  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(W, press, "R");
  const back = townAuto(W);
  pickOrigin(W, press, "seoul");
  await stage("e");
  passEarly(W, press);
  press(D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg");
  await stage("m");
  passEarly(W, press);
  await stage("h");
  if (back) back();
  const T = W.WingerTown;
  const out = { stages, rows: T.rows().map((r) => ({ stage: r.stage, key: r.key, res: r.res })),
    score: T.score(), cards: T.cards(), dev: T.deviation() };
  W.close();
  return out;
}

/* 🔒 편차를 **판정만으로** 다시 셉니다 — 스코어·승패는 여기 한 톨도 안 들어와요. */
const devOf = (rows) => rows.reduce((a, r) => a + (PTS[r.res] != null ? PTS[r.res] : 0), 0) - rows.length;
/* 🏁 그 단계의 🏟️ 스코어를 판정으로 다시 셉니다. */
const scoreOf = (rows, id) => {
  let hg = 0, ag = 0;
  for (const r of rows) {
    if (r.stage !== id) continue;
    const side = (GOAL_BY[r.key] || {})[r.res];
    if (side === "us") hg += 1; else if (side === "them") ag += 1;
  }
  return [hg, ag];
};
const finOf = (txt) => {
  const m = String(txt).match(/(\d+)\s*:\s*(\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
};

(async () => {
  /* ══════════ 0. 산식과 변이 정규식이 지금 소스에 걸리는가 ══════════ */
  {
    check(!!PTS && !!GOAL_BY,
      `0-1. 📐 \`town.js\`에서 산식을 뽑았다 — PTS ${JSON.stringify(PTS)} · GOAL_BY ${JSON.stringify(GOAL_BY)}`
      + (PTS && GOAL_BY ? "" : `\n     🔴 정규식이 안 걸려요 — 아래는 전부 "안 도는" 상태입니다`));
    const bad = pageMutsOK(MUT);
    const n = Object.values(MUT).reduce((a, t) => a + Object.values(t).reduce((b, m) => b + m.length, 0), 0);
    check(bad.length === 0,
      `0-2. 🔴 변이 정규식 ${n}개가 지금 \`beta/winger2/town.js\`에 전부 걸린다`
      + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 "안 도는" 상태예요**`
        + bad.map((b) => `\n       · ${b}`).join("") : ""));
    if (!PTS || !GOAL_BY || bad.length) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
  }

  const base = {};
  for (const s of SEEDS) base[s] = await arc(s, null);

  /* ══════════ ⓐ A. 편차 `d`가 판정만의 함수다 ══════════ */
  {
    const rows = SEEDS.map((s) => ({ s, d: base[s].dev, re: devOf(base[s].rows),
      res: base[s].rows.map((r) => r.res[0]).join("") }));
    const ok = rows.every((r) => r.d === r.re);
    check(ok,
      `A-1. 🔩 편차 \`d\`가 **판정만의 함수**다 — 아크를 굴려 얻은 d와 판정 재구성이 일치`
      + rows.map((r) => `\n     시드 ${r.s}: d=${r.d} 재구성=${r.re} [${r.res}]`).join("")
      + (ok ? "" : `\n     🔴 어긋납니다 — 🏟️ 스코어나 승패가 \`d\`로 새고 있어요 (설계 §3-3의 못)`));

    /* 🔩 못을 정면으로: **판정은 그대로 두고 승패만 뒤집어도** d가 안 변해야 합니다 */
    const flip = {};
    for (const s of SEEDS) flip[s] = await arc(s, MUT.FLIP);
    const sameRes = SEEDS.every((s) =>
      base[s].rows.map((r) => r.res).join() === flip[s].rows.map((r) => r.res).join());
    const sameDev = SEEDS.every((s) => base[s].dev === flip[s].dev);
    const finDiff = SEEDS.filter((s) => base[s].stages.h.fin !== flip[s].stages.h.fin);
    check(sameRes && sameDev,
      `A-2. 🔩 **🏟️ 승패를 뒤집어도 \`d\`가 안 변한다** — \`GOAL_BY\`를 반대로 걸고 같은 아크를 굴림`
      + SEEDS.map((s) => `\n     시드 ${s}: d ${base[s].dev} → ${flip[s].dev}`
        + ` · 🏁 "${(finOf(base[s].stages.h.fin) || []).join(":")}" → "${(finOf(flip[s].stages.h.fin) || []).join(":")}"`).join("")
      + (sameRes ? "" : `\n     🔴 판정 시퀀스까지 갈렸어요 — 변이가 난수를 건드립니다. 이 문장은 지금 무효예요`)
      + (sameDev ? "" : `\n     🔴 **승패가 \`d\`로 샙니다.** 🏟️ 제안 등급(spotMul)이 경기 결과를 타요`));
    /* 🔑 **변이가 실제로 승패를 갈랐는지** 확인 — 안 갈렸으면 A-2는 아무것도 안 지킵니다 */
    check(finDiff.length === SEEDS.length,
      `A-2b. 🔑 그 변이가 **🏁 스코어를 실제로 갈랐다** (${finDiff.length}/${SEEDS.length} 시드)`
      + (finDiff.length === SEEDS.length ? "" :
        `\n     🔴 승패가 안 갈렸으면 A-2는 "원래 같은 값"을 재고 있어요 — 껍데기입니다`));
  }

  /* ══════════ 🚧 ⓑ B. 피드 섞임 — **지금 형태로는 검증 불가입니다** ══════════
   *
   * 🔴 **초록불로 넣지 않았습니다.** 재 봤더니 이 자리는 *"검사를 쓰면 되는 문제"*가
   *    아니라 **경합(race)**이라, 어떤 문턱을 골라도 둘 중 하나가 됩니다:
   *
   *   | 누르는 간격 | 정상 | M-F(가드 제거) |
   *   |---|---|---|
   *   | 40ms  | ✔ | **✔ (안 잡힘)** |
   *   | 60ms  | ✔ | ❌ 잡힘 |
   *   | 90ms  | ✔ | **✔ (안 잡힘)** |
   *   | 120ms | ✔ | **✔ (안 잡힘)** |
   *
   *   🔑 **잡히는 창이 60ms 하나뿐이고 앞뒤로 30ms면 사라집니다.** 이걸 그대로 넣으면
   *      느린 판에서는 아무것도 안 지키고(초록불), 빠른 판에서는 우연히 빨간불이 떠요 —
   *      이 저장소가 「가끔 빨간불 뜨는 검사」로 배워 안 보게 되는 바로 그 형태입니다.
   *
   * 🔬 창을 넓히려고 그리기를 260ms 늦춰 봤더니(`Scene.push` 앞에 지연) **정상 코드도
   *    샙니다** — 시드 5벌 전부, 두 간격 전부:
   *
   *     정상(느림 없음)   e[30 30 60 60] m[23 23 45 45 68 68] h[23 23 45 45 68 68]  ✔
   *     정상 + 느린 그리기 e[30]          m[**30 30** 23]        h[23 23 23]          ❌
   *     M-F + 느린 그리기 e[30]          m[**30 30** 23]        h[**60** 23 23 23]   ❌
   *
   *   🏫 초등부(n=2)의 분은 30·60, 중·고등(n=3)은 23·45·68이에요. **중등 피드의 30'은
   *      초등 카드입니다.** `town.js`의 `if (myGen !== sceneGen) return null;`은
   *      **아직 시작 안 한** 그리기만 버려요 — 이미 `Scene.push` 안으로 들어간 것은
   *      `mount()`가 새로 깐 피드에 그대로 씁니다. **가드가 닿지 않는 두 번째 경로**예요.
   *
   * 📮 그래서 **engineer에게 넘깁니다** — 검사가 아니라 이음매가 필요합니다:
   *    `W2Scene.push`가 **쓰기 직전에** 세대를 다시 보게 하면(또는 `mount()`가 옛 세대의
   *    남은 그리기를 무효로 만들면) 경합이 사라지고, 그때 이 자리는 **결정적으로**
   *    검사할 수 있습니다.
   * 📌 그 이음매가 생기면 **여기에 B를 채우고 이 🚧를 지우세요.**
   *    (재현 스크립트: `scratchpad/insp-raf/probe-slow.js` — 느림 지연 + 가드 제거를 켜고 끕니다)
   *
   * ⚠️ **「검증 불가」를 「통과」에 섞지 않습니다.** 아래 한 줄은 종료 코드를 안 바꿔요. */
  {
    console.log("🚧 B. 🎬 피드 섞임(ⓑ)은 **경합이라 검증 불가**입니다 — 잡히는 창이 60ms 하나뿐이고,");
    console.log("     창을 넓히면 정상 코드도 샙니다(가드가 안 닿는 둘째 경로). engineer에게 넘겼어요.");
  }

  /* ══════════ ⓒ C. 단계 스코어가 단계마다 0에서 시작한다 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) {
      for (const id of ["e", "m", "h"]) {
        const got = finOf(base[s].stages[id].fin);
        const want = scoreOf(base[s].rows, id);
        if (!got) { bad.push(`시드${s}/${id}: 🏁 최종 스코어를 못 읽었어요 ("${base[s].stages[id].fin}")`); continue; }
        if (got[0] !== want[0] || got[1] !== want[1]) {
          bad.push(`시드${s}/${id}: 화면 ${got.join(":")} ≠ 판정 재구성 ${want.join(":")}`);
        }
        if (got[0] + got[1] > STAGE_N[id]) {
          bad.push(`시드${s}/${id}: 골 합 ${got[0] + got[1]}이 그 단계 카드 수 ${STAGE_N[id]}보다 많아요`);
        }
      }
    }
    check(bad.length === 0,
      `C-1. 🏁 단계 끝 스코어가 **그 단계의 판정으로 정확히 재구성**된다 (누적이 아니에요)`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("")
        : `\n     ${SEEDS.map((s) => `시드${s}: ${["e", "m", "h"].map((id) => `${id} ${finOf(base[s].stages[id].fin).join(":")}`).join(" · ")}`).join("\n     ")}`));
  }

  /* ══════════ 🔴 변이 검증 — 셋이 각각 **자기 문장만** 빨간불로 만드는가 ══════════
   * 🔑 「빨간불이 뜬다」로 끝내지 않고 **어느 문장이** 뜨는지 봅니다. 셋이 서로의
   *    문장까지 무너뜨리면 어느 계약이 무엇을 지키는지 알 수 없어요. */
  {
    const probe = async (name) => {
      const r = await arc(SEEDS[0], MUT[name]);
      const devOK = r.dev === devOf(r.rows);
      const finOK = ["e", "m", "h"].every((id) => {
        const g = finOf(r.stages[id].fin), w = scoreOf(r.rows, id);
        return g && g[0] === w[0] && g[1] === w[1];
      });
      return { devOK, finOK, r };
    };
    const d = await probe("M-D");
    check(!d.devOK && d.finOK,
      `변이-D. 🔴 \`state.score += p\`에 골을 더하면 → **A-1만** 빨간불`
      + `\n     d=${d.r.dev} 재구성=${devOf(d.r.rows)} · A-1 ${d.devOK ? "초록(🔴 안 잡힘)" : "빨간불 ✔"}`);
    /* 🚧 변이-F는 없습니다 — 위 B가 검증 불가라 **지킬 문장이 없어요.**
     *    변이만 남기면 "빨간불인데 아무도 안 보는 검사"가 됩니다. */
    const g = await probe("M-G");
    check(g.devOK && !g.finOK,
      `변이-G. 🔴 \`let hg = 0\`을 누적으로 바꾸면 → **C-1만** 빨간불`
      + `\n     🏁 ${["e", "m", "h"].map((id) => `${id} ${(finOf(g.r.stages[id].fin) || []).join(":")}`).join(" · ")}`
      + ` (판정 재구성 ${["e", "m", "h"].map((id) => `${id} ${scoreOf(g.r.rows, id).join(":")}`).join(" · ")})`
      + `\n     A-1 ${g.devOK ? "초록 ✔" : "🔴 같이 무너짐"}`
      + ` · C-1 ${g.finOK ? "초록(🔴 안 잡힘)" : "빨간불 ✔"}`);
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
