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
const { bootPage, pageMutsOK, townAuto, tapFoot, tapChild, pickOrigin, passEarly, seedBoth, PAGE_DIR }
  = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 🔒 문턱은 **검사에 박습니다** — 단계별 카드 수는 계약이에요 (초 2 · 중 3 · 고 3). */
const STAGE_N = { e: 2, m: 3, h: 3 };
/* 🎲 **여덟 벌**입니다 (2026-09-02에 셋에서 늘렸어요).
 * 🔴 늘린 이유 — A-2b가 *"승패 뒤집기가 🏁 스코어를 실제로 갈랐나"*를 재는데,
 *    **골이 하나도 안 난 아크에서는 뒤집어도 0:0 → 0:0**이라 안 갈립니다.
 *    시드 셋 중 42번이 그런 판이어서 2/3이 됐어요 — **커버리지가 난수에 걸린** 모양입니다.
 * 🌍 **2026-09-02 오전까지**는 그 판이 더 흔했습니다: 🧱 수비가 `PLAYABLE`에서 빠지면서
 *    `GOAL_BY.d.miss = "them"`이 **닿을 수 없게** 됐고, 학교 경기가 늘 `N:0`으로 끝났어요.
 *    🔄 **그날 오후에 뒤집혔습니다** — 🅰️ 전개의 끊긴 패스가 역습 실점이 되면서
 *    (`GOAL_BY.a.miss = "them"` · 120번 §3-4) **상대도 넣습니다**(실측 24단계 중 13).
 *    🔑 그래서 「0:0인 아크」가 다시 드물어졌고, A-2b의 표본 바닥은 **여유가 늘었습니다.**
 *    🔒 시드를 여덟로 유지합니다 — 줄이면 그 판정이 또 뒤집힐 때 바닥에 붙어요.
 * 🔑 **문턱을 내리지 않고 표본을 키웠습니다** — 아래 A-2b는 「골이 난 판은 **전부** 갈렸다」에
 *    **더해** 「골이 난 판이 최소 `MIN_SCORING`벌」을 같이 봅니다. */
const SEEDS = [7, 42, 1201, 5, 88, 301, 777, 4242];
/* 🔒 문턱은 여기 박습니다 — 골이 난 아크가 이만큼은 나와야 A-2가 뜻을 가져요 */
const MIN_SCORING = 4;
/* 🥅 ⓸ **상대가 득점한 단계**의 바닥 — 실측 12 / 24(시드 8벌 × 단계 셋).
 *    🔒 실측의 절반에 뒀습니다. 되돌리면(`a.miss` 제거) **정확히 0**이라 사이가 넓어요 —
 *       기준선 옆에 붙이면 카드 뽑기가 한 번만 기울어도 **고장이 아니라 우연으로** 빨간불이 납니다. */
const MIN_CONCEDE = 6;
/* 🎬 B절 전용 — **셋**입니다. B는 시드마다 간격 두 벌씩(120·200ms) 아크를 굴려서
 * 여기를 늘리면 파일 전체가 곱으로 길어져요. B가 재는 것은 **세대가 갈리는 시점**이지
 * 판정 분포가 아니라, 표본을 키워도 문장이 안 세집니다 — A절과 갈라 둡니다. */
const B_SEEDS = [7, 42, 1201];

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
/* 🔄 **승패를 뒤집은 표를 소스에서 만듭니다** — 표를 베껴 적으면 칸이 하나 늘 때
 *    정규식이 조용히 안 걸려요(2026-09-02에 실제로 났습니다). */
const GOAL_RE = /const GOAL_BY = \{.*\};/;
const GOAL_FLIP = (TOWN_SRC.match(GOAL_RE) || [""])[0]
  .replace(/"us"/g, "\u0000").replace(/"them"/g, '"us"').replace(/\u0000/g, '"them"');

/* 🔴 변이 셋 — engineer가 105번 §6에 적은 그대로입니다. */
const MUT = {
  /* ⓐ 🏟️ 스코어가 편차 d로 샙니다 */
  "M-D": { "town.js": [[/      state\.score \+= p;/,
    '      state.score += p + ((GOAL_BY[c.key] || {})[r] === "us" ? 1 : 0);']] },
  /* ⓑ 🎬 **끄는 줄** — 세대가 갈린 쓰기를 막는 자리. 소유자는 `match-scene.js`예요.
   *    🔴 engineer가 110번에서 `town.js`의 겹치는 확인을 **지우고** 여기 한 줄로 모았습니다
   *       (같은 결과를 내는 줄이 둘이면 하나를 지워도 증상이 0장 — CLAUDE.md 「방어가 겹침」).
   *    🔬 111번에서 **세는 자리를 그 갈래 안**에 넣었어요 — 밖에 조건을 한 줄 더 쓰면
   *       끄는 줄을 지워도 `drops`가 계속 올라가서 **「>0 ↔ 0」 방향이 사라집니다.** */
  "M-F": { "match-scene.js": [[/    if \(g != null && g !== _gen\) \{ _drops \+= 1; return; \}\n/, ""]] },
  /* 🐢 **계측 도구입니다 — 변이가 아니에요.** 그리기를 늦춰 「단계가 갈릴 때 아직 안 그려진
   *    카드」를 확실히 만듭니다. 🔑 **양쪽 팔에 똑같이** 걸어서 비교를 안 기울입니다.
   *    ⚠️ 지연을 **끄는 줄보다 앞**에 넣습니다 — 그래야 가드가 「쓰기 직전」의 세대를 보고,
   *       가드를 약하게 만드는 게 아니라 **가장 불리한 조건**에서 시험하는 게 됩니다. */
  "SLOW": { "match-scene.js": [[/  async function push\(card, g\) \{/,
    "  async function push(card, g) {\n    await new Promise((r) => setTimeout(r, 260));"]] },
  /* ⓒ 단계 스코어가 0으로 안 돌아갑니다 */
  "M-G": { "town.js": [[/    let hg = 0, ag = 0;/, "    let hg = state.cards, ag = 0;"]] },
  /* 🔩 A-2 전용 — **판정은 그대로 두고 승패만 뒤집습니다.** 못을 정면으로 재는 자리예요.
   * 🔴 **표를 베껴 적지 않습니다.** 2026-09-02에 `GOAL_BY.a`에 `miss: "them"`이 한 칸
   *    늘자 통문장 정규식이 **안 걸려 FLIP이 「안 도는」 상태**가 됐어요(0-2가 잡았습니다).
   * 🔒 그래서 **소스에서 뜯어 "us" ↔ "them"만 바꿉니다** — 칸이 늘어도 삽니다. */
  "FLIP": { "town.js": [[GOAL_RE, GOAL_FLIP]] },
  /* 🔴 ⓸ 전용 — 🅰️ **끊긴 패스의 역습 실점을 도로 막습니다**(그 칸 하나만 지워요).
   *    🔑 되돌리면 학교 경기가 다시 **늘 `N:0`**이 됩니다 — A-3이 그걸 봐야 해요. */
  "NO_CONCEDE": { "town.js": [[/a: \{ perfect: "us", miss: "them" \}/, 'a: { perfect: "us" }']] },
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

/* 🔑 `cadence`를 주면 **고정 간격**으로 누릅니다 (정착을 안 기다려요).
 * 🔴 **경합을 재려면 반드시 고정 간격이어야 합니다** — `settle()`로 큐를 다 비우면
 *    경합 자체가 안 일어나서 끄는 줄을 지워도 **0/5로 아무것도 안 잡혀요**
 *    (engineer 110번이 같은 자리를 짚었습니다. 스킬의 「settle()을 두 번 같으면
 *    안정으로 재지 마세요」와 같은 계열이에요). */
async function arc(seed, muts, cadence) {
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
    const rec = { start: null, mins: [], seen: [], fin: "" };
    if (cadence == null) await settle(D); else await wait(cadence);
    rec.start = mins().length;                        // 🔑 단계가 열릴 때 피드는 비어 있어야 해요
    for (let g = 0; g < 12; g++) {
      if (cur() !== "screen-town") break;
      const b = D.getElementById("btn-town-next");
      if (!b || b.disabled || b.classList.contains("hidden")) break;
      if (cadence == null) await settle(D); else await wait(cadence);
      rec.mins = mins();
      rec.seen.push(mins());
      press(b, "🏫 다음");
    }
    if (cadence == null) await settle(D); else await wait(cadence);
    rec.mins = mins();
    rec.seen.push(mins());
    const f = D.querySelector(".town-final");
    rec.fin = f ? String(f.textContent) : "";
    stages[id] = rec;
  }
  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(W, press, "R");
  const back = townAuto(W);
  pickOrigin(W, press, "seoul");
  await tapChild(W, press, "ball");                   // 🧒 초1 — `_load.js`의 한 벌
  await stage("e");
  passEarly(W, press);
  press(D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg");
  await stage("m");
  passEarly(W, press);
  await stage("h");
  if (back) back();
  const T = W.WingerTown;
  /* 🔬 **끄는 줄이 몇 장을 껐는가** — 창을 닫기 전에 읽습니다.
   *    누적이고 `mount()`·`destroy()`가 0으로 안 되돌려요(111번 engineer 결정).
   *    창마다 새로 뜨니 여기서는 **이 아크의 총합**입니다. */
  const drops = (W.W2Scene && W.W2Scene._t && W.W2Scene._t.drops) ? W.W2Scene._t.drops() : null;
  const out = { stages, drops, rows: T.rows().map((r) => ({ stage: r.stage, key: r.key, res: r.res })),
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
    /* 🔑 **변이가 실제로 승패를 갈랐는지** 확인 — 안 갈렸으면 A-2는 아무것도 안 지킵니다.
     * 🔴 **「전부 갈렸다」로는 못 잽니다** — 골이 하나도 안 난 아크는 0:0 → 0:0이라
     *    뒤집어도 같은 값이에요. 그건 고장이 아니라 **잴 것이 없는 판**입니다.
     *    그래서 ① **골이 난 판은 전부 갈렸는가** ② **골이 난 판이 충분한가**로 갈랐어요. */
    const scoring = SEEDS.filter((s) => (finOf(base[s].stages.h.fin) || [0, 0]).some((n) => n > 0));
    const scoringSplit = scoring.filter((s) => finDiff.includes(s));
    const b2 = scoringSplit.length === scoring.length && scoring.length >= MIN_SCORING;
    check(b2,
      `A-2b. 🔑 그 변이가 **🏁 스코어를 실제로 갈랐다** — 골이 난 판 **${scoring.length}벌**(바닥 ${MIN_SCORING}) 중 갈린 판 **${scoringSplit.length}벌**`
      + `\n     🔎 측정 조건 — 🏁 0:0인 아크는 뒤집어도 0:0이라 **잴 것이 없어서** 뺐습니다 (시드 ${SEEDS.length}벌 중 ${SEEDS.length - scoring.length}벌)`
      + `\n     ${SEEDS.map((s) => `${s}:${(finOf(base[s].stages.h.fin) || []).join(":")}→${(finOf(flip[s].stages.h.fin) || []).join(":")}`).join(" · ")}`
      + `\n     🌍 2026-09-02까지는 🧱이 \`PLAYABLE\`에서 빠져 \`GOAL_BY.d.miss\`가 **닿을 수 없었고**, 학교 경기가 늘 \`N:0\`이었어요.`
      + ` 🅰️ 끊긴 패스(\`a.miss\`)가 역습 실점이 되면서 **그 문장은 틀렸습니다** — 지금은 A-3이 「상대도 넣는다」를 봅니다`
      + (b2 ? "" :
        scoring.length < MIN_SCORING
          ? `\n     🔴 골이 난 판이 ${scoring.length}벌뿐이라 A-2가 "원래 같은 값"을 재고 있을 수 있어요 — **시드를 늘리세요**`
          : `\n     🔴 골이 났는데 안 갈린 판이 있어요 — 승패 뒤집기가 화면에 안 닿습니다`));
  }

  /* ══════════════════════════════════════════════════════════════════════
   * ⓸ A-3. 🥅 **상대도 넣습니다** — 학교 경기가 늘 `N:0`이 아니다
   * ══════════════════════════════════════════════════════════════════════
   * 🔴 **2026-09-02 이전에는 이게 거짓이었습니다.** 🧱 수비가 `PLAYABLE`에서 빠지면서
   *    실점으로 이어지는 유일한 칸(`GOAL_BY.d.miss`)이 **닿을 수 없게** 됐고,
   *    학교 경기는 여덟 판 내내 `N:0`으로 끝났어요 — **져 본 적이 없는 경기**였습니다.
   *    engineer가 🅰️ 전개의 끊긴 패스를 역습 실점(`a.miss = "them"`)으로 열었습니다(120번 §3-4).
   *
   * 🔑 **이 문장이 왜 A-2와 따로 서 있나** — A-2는 「승패가 `d`로 안 샌다」는 **변이**예요.
   *    변이는 «뒤집어도 d가 같은가»만 보니 **표에 실점 칸이 있는지는 안 봅니다.**
   *    그래서 `a.miss`를 지워도 A-2·A-2b는 **전부 초록불**입니다(실제로 확인했어요).
   *
   * 📐 문턱 두 줄:
   *   ① **무엇과 견주는가** — 「상대가 한 골이라도 넣은 단계」의 수. **화면의 🏁**을 읽습니다.
   *      🔴 검사가 디스크의 `GOAL_BY`로 다시 세면 변이를 걸어도 값이 안 움직여요 — 실제로
   *      처음에 그렇게 짜서 13 → 13으로 **아무것도 안 잡혔습니다.**
   *   ② **어느 칸에서 재는가** — 시드 8벌 × 단계 셋(e·m·h) = 24 단계. 실측 12.
   *      🔒 바닥은 **6**(실측의 절반) — 되돌리면 **정확히 0**이라 사이가 넓습니다.
   * 🌍 이 문장이 서 있는 세계: 「실점이 **내 카드의 `miss`에서만** 나오는 세계」입니다.
   *    🔴 상대 팀을 따로 굴리는 판정이 나오면(소스가 지금 금지한 자리) 여기부터 여세요. */
  {
    const STAGE_IDS = ["e", "m", "h"];
    /* 🔴 **재구성(`scoreOf`)이 아니라 화면의 🏁을 읽습니다.** `scoreOf`는 검사가 **디스크의**
     *    `GOAL_BY`로 다시 세는 자라서, 실점 칸을 지우는 변이를 걸어도 **값이 안 움직입니다**
     *    (처음에 그렇게 짜서 변이가 13 → 13으로 안 잡혔어요 — 「자기 자신과 비교」의 사촌).
     * 🔒 화면 🏁이 판정과 같다는 건 **C-1이 따로** 지킵니다 — 그래서 여기서 화면을 읽어도
     *    「연출이 판정과 갈라지는」 구멍이 안 생겨요(겹쳐 보기). */
    const conceded = (r) => STAGE_IDS.filter((id) => ((finOf(r.stages[id].fin) || [0, 0])[1] > 0)).length;
    const got = SEEDS.reduce((a, s) => a + conceded(base[s]), 0);
    const tot = SEEDS.length * STAGE_IDS.length;
    const ok = got >= MIN_CONCEDE;
    check(ok,
      `A-3. 🥅 **상대도 넣는다** — 상대가 득점한 단계 **${got} / ${tot}** (바닥 ${MIN_CONCEDE})`
      + `\n     🔎 측정 조건 — 시드 ${SEEDS.length}벌 × 단계 셋. 🏁은 **화면에서** 읽습니다(C-1이 화면 = 판정을 따로 지켜요)`
      + `\n     ${SEEDS.map((s) => `${s}:${STAGE_IDS.map((id) => (finOf(base[s].stages[id].fin) || []).join(":")).join(" ")}`).join(" · ")}`
      + `\n     🌍 실점은 **내 카드의 \`miss\`에서만** 납니다 — 상대를 따로 굴리는 판정이 나오면 이 문장부터 다시 보세요`
      + (ok ? "" : `\n     🔴 **학교 경기가 다시 \`N:0\`입니다** — 져 본 적이 없는 경기가 돼요. \`GOAL_BY\`의 실점 칸을 보세요`));

    /* 🧪 변이 — 🅰️ 실점 칸 하나를 지우면 **정확히 0**이어야 합니다 */
    const nc = {};
    for (const s of SEEDS) nc[s] = await arc(s, MUT.NO_CONCEDE);
    const got2 = SEEDS.reduce((a, s) => a + conceded(nc[s]), 0);
    check(got2 === 0,
      `변이-NO_CONCEDE → **A-3이 빨간불**이어야 한다 — 상대가 득점한 단계 ${got2} / ${tot}`
      + (got2 === 0 ? `\n     🔑 되돌리면 **정확히 0**이라 기준선(${got})과 사이가 넓습니다 — 문턱이 어느 쪽에도 안 붙었어요`
        : `\n     🔴 실점 칸을 지웠는데도 상대가 넣습니다 — 다른 경로가 생겼어요. A-3의 세계 문장을 다시 보세요`));
  }

  /* ══════════ ⓑ B. 세대가 갈리면 옛 카드가 새 피드에 안 써진다 ══════════
   *
   * 🔄 **이 자리는 한 번 「검증 불가」로 접었다가 다시 폈습니다.** 109번에서는 잡히는 창이
   *    60ms 하나뿐이었고, 창을 넓히면 **정상 코드도 샜어요**(가드가 안 닿는 둘째 경로).
   *    engineer가 110번에서 소유자를 `match-scene.js`의 `push` 맨 앞 **한 줄**로 모으고
   *    `town.js`의 겹치는 확인을 지운 뒤, **다시 재 보니 갈립니다:**
   *
   *   | 그리기 +260ms · 시드 5벌 | 누수(고침) | 누수(되돌림) | 기준선이 훑은 분 |
   *   |---|---|---|---|
   *   | 120ms | **0/5** | **5/5** | 5개 |
   *   | 150ms | **0/5** | **5/5** | 7개 |
   *   | 200ms | **0/5** | **5/5** | 10~12개 |
   *
   *   겹치는 구간이 **없습니다.** 그래서 이제 초록/빨강으로 넣습니다.
   *   ⚠️ **40ms·60ms는 뺐습니다** — 40ms는 양쪽 다 0/5(경합이 아예 안 남),
   *      60ms는 고친 코드가 **분을 한 톨도 안 그려서**(0줄) 기준선이 공짜로 참이 돼요.
   *      **변이가 잡히는 것만으로는 부족합니다 — 기준선도 뭔가를 봐야 합니다.**
   *
   * 📏 **재는 법: 「남의 분」이 섞였는가.** 🏫 초등부(n=2)의 분은 **30·60**,
   *    중·고등부(n=3)는 **23·45·68**이에요. 중등 피드의 `30'`은 **초등 카드**입니다.
   *    🔒 단조 증가로 안 재는 이유: m→h 누수는 분 집합이 같아 **순서로는 안 보입니다.**
   *
   * 🌍 이 계약이 서 있는 세계: 「단계마다 분이 **다르게** 배치되는 세계」예요
   *    (`minAt(i,n) = round(90(i+1)/(n+1))`). 초·중·고의 카드 수가 **같아지면**
   *    분 집합이 겹쳐 이 검사가 눈이 멉니다 — 그때는 세대 카운터로 갈아타세요(§B-3). */
  {
    /* 🔒 검사에 박은 간격입니다. **60ms는 뺐어요** — 거기서는 고친 코드가
     *    분을 **한 톨도 안 그려서**(0줄) B-1이 「남의 분이 없다」를 공짜로 참으로 만듭니다.
     *    변이는 60ms에서도 잡히지만, **기준선이 공짜면 그 판은 아무것도 안 지켜요.**
     *    120·200ms는 기준선이 5~12개를 실제로 훑고도 누수 0입니다 (B-2가 매번 확인). */
    const CAD = [120, 200];
    const OWN = { e: [30, 60], m: [23, 45, 68], h: [23, 45, 68] };
    const leaks = (r) => {
      const bad = [];
      for (const id of ["e", "m", "h"]) {
        for (const snap of r.stages[id].seen) {
          for (const v of snap) if (OWN[id].indexOf(v) < 0) bad.push(`${id}피드에 ${v}'`);
        }
      }
      return [...new Set(bad)];
    };
    const run = async (muts) => {
      const out = [];
      for (const cad of CAD) for (const sd of B_SEEDS) {
        const r = await arc(sd, muts, cad);
        const n = ["e", "m", "h"].reduce((a, id) =>
          a + r.stages[id].seen.reduce((b, snap) => b + snap.length, 0), 0);
        out.push({ sd, cad, leak: leaks(r), n, drops: r.drops });
      }
      return out;
    };
    /* 🐢 계측 지연은 **양쪽에 똑같이** — 비교를 기울이지 않습니다 */
    const good = await run({ "match-scene.js": MUT.SLOW["match-scene.js"] });
    const hit = good.filter((x) => x.leak.length);
    check(hit.length === 0,
      `B-1. 🎬 세대가 갈려도 **옛 단계 카드가 새 피드에 안 써진다** (${good.length}판 — 시드 ${B_SEEDS.length} × 간격 ${CAD.join("·")}ms)`
      + (hit.length ? hit.map((x) => `\n     🔴 시드${x.sd}/${x.cad}ms — ${x.leak.join(" · ")}`).join("")
        : ""));

    /* 🔑 **「아무 일도 안 일어났다」를 통과로 세지 않습니다.** B-1은 *"남의 분이 없다"*를
     *    재는 문장이라 **경합이 아예 안 일어나도 참**이에요.
     *
     * 🔬 111번부터 그걸 **추측이 아니라 수로** 봅니다 — `W2Scene._t.drops()`는
     *    `push`가 세대 불일치로 되돌아간 횟수예요. **끄는 줄 안에서** 세니까
     *    끄는 줄을 지우면 0이 됩니다(방향이 반대라 변이 검증이 저절로 따라옵니다).
     *
     * 🔒 **문턱은 `> 0`입니다. 값을 박지 마세요** — 기계마다 다릅니다
     *    (engineer 실측 4 · 여기 실측 5~6). 박으면 그 순간 헛빨간불이 나요.
     *
     * 🔑 예전엔 「B-1이 훑은 분의 개수」로 갈음했는데, 그건 **지연·간격·분 집합** 셋에
     *    기대는 대리값이었어요. `drops`는 셋 다 안 탑니다. 분 개수는 참고로만 찍어요. */
    const dr = good.map((x) => x.drops);
    const noCount = dr.some((d) => d == null);
    check(!noCount && dr.every((d) => d > 0),
      `B-2. 🔬 그 판들에서 **끄는 줄이 실제로 껐다** — 판마다 \`drops\` ${dr.join(" · ")} (문턱 > 0)`
      + `\n     참고: B-1이 훑은 분 ${good.map((x) => x.n).join(" · ")}`
      + (noCount ? `\n     🔴 \`W2Scene._t.drops\`가 없어요 — 계수기가 빠졌는지 보세요` : "")
      + (!noCount && dr.some((d) => d === 0)
        ? `\n     🔴 0인 판은 **경합이 안 일어난** 겁니다 — 그 판에서 B-1은 아무것도 안 지켜요` : ""));

    /* 🔴 변이 — 끄는 줄만 되돌리면 빨간불인가 */
    const mut = await run({ "match-scene.js": [...MUT.SLOW["match-scene.js"], ...MUT["M-F"]["match-scene.js"]] });
    const caught = mut.filter((x) => x.leak.length);
    const zeroed = mut.filter((x) => x.drops === 0);
    check(caught.length === mut.length,
      `변이-F. 🔴 \`match-scene.js\`의 **끄는 줄**을 되돌리면 → B-1이 빨간불 (${caught.length}/${mut.length}판)`
      + `\n     ${caught.slice(0, 3).map((x) => `시드${x.sd}/${x.cad}ms ${x.leak.join(",")}`).join(" · ")}`
      + (caught.length === mut.length ? "" :
        `\n     🔴 다 안 잡혔어요 — 간격이 이 판에서 안 맞습니다. B-1은 지금 **믿을 수 없어요**`));
    /* 🔬 계수기의 **방향**도 같이 뒤집혀야 합니다 — 세는 자리가 끄는 갈래 **안**이라
     *    줄을 지우면 0이 돼요. 밖으로 새어 나가 있으면 여기서 걸립니다. */
    check(zeroed.length === mut.length,
      `변이-Fb. 🔬 그때 \`drops\`가 **0으로 뒤집힌다** → B-2도 빨간불 (${zeroed.length}/${mut.length}판 · ${mut.map((x) => x.drops).join(" ")})`
      + (zeroed.length === mut.length ? "" :
        `\n     🔴 끄는 줄을 지웠는데도 \`drops\`가 올라갑니다 — **세는 자리가 그 갈래 밖**이에요.`
        + ` 그러면 B-2의 「>0 ↔ 0」 방향이 사라져 아무것도 안 지킵니다`));
  }

  /* ══════════ 🚧 B-3. `career.js`의 프로 경기 루프는 **아직 세대를 안 넘깁니다** ══════════
   *
   * engineer가 110번에서 **셋째 자리**로 넘긴 것입니다 — `push`는 이제 세대를 받는데
   * **부르는 쪽이 안 줍니다.** 안 주면 `g == null`이라 끄는 줄이 **그냥 통과**해요
   * (읽는 쪽 기본값이라 옛 갈래가 안 깨지는 대신, 그 갈래는 보호를 못 받습니다).
   *
   * 🔴 **이 검사는 그 자리를 못 봅니다** — 위 B는 🏫 학교 아크(`town.js`)를 몰고 가고
   *    프로 경기(`runV2Match`)는 안 지나거든요. 그래서 **호출부의 인자 수**로 봅니다.
   *
   * 🚧 지금 크기를 **상한으로 박고, 더 나빠지면 빨간불**입니다. 여기서 소리내어 빨간불을
   *    내면 "저건 원래 빨간불이야"가 되어 이 파일 전체가 신호를 잃어요.
   * 📌 **`career.js`가 `gen()`을 넘기게 되면 상한을 0으로 내리고 이 🚧를 지우세요.** */
  {
    const CAP = 2;                                   // 🚧 2026-09-02 실측 (career.js:1787 · 1802)
    const CAR = fs.readFileSync(path.join(PAGE_DIR, "career.js"), "utf8");
    const bare = (CAR.match(/scene\.push\(\s*card\s*\)/g) || []).length;
    if (bare > CAP) {
      check(false, `B-3. 🔴 세대를 **안 넘기는** \`scene.push\` 호출이 늘었습니다 — ${bare}곳 > 상한 ${CAP}`);
    } else if (bare === 0) {
      check(false, `B-3. 🎉 \`career.js\`도 세대를 넘깁니다 — **이 🚧를 지우고 B에 프로 경기 갈래를 더하세요**`);
    } else {
      console.log(`🚧 B-3. \`career.js\`의 \`scene.push(card)\` ${bare}곳이 아직 세대를 안 넘깁니다 (상한 ${CAP} — 늘면 빨간불)`);
      console.log(`     그 갈래는 끄는 줄이 \`g == null\`로 그냥 통과해요. 위 B는 🏫 학교 아크라 **그 자리를 못 봅니다.**`);
    }
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
    /* 🔑 변이-F는 **위 B 블록 안**에 있습니다 — 고정 간격 드라이버가 필요해서요. */
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
