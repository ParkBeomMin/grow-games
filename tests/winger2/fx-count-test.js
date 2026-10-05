/* ⚽ 더 윙어 II — 🎲 **연출이 판정 난수원을 안 건드린다** (`beta/winger2/match-scene.js`)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **왜 이 파일이 필요한가** — 「값이 아무 데도 안 가는 굴림」도 결합입니다
 * ─────────────────────────────────────────────────────────────────────────
 * 🟩 판이 살아나면서 `setPitch()`가 **점 열한 개의 자리를 굴려** 뽑습니다.
 * 그 굴림이 판정 난수원(`WingerEngine`의 `_rng`)이나 `Math.random()`을 쓰면,
 * **값이 화면 밖으로 한 톨도 안 나가도** 뒤 카드의 판정 굴림이 통째로 밀려요.
 * 🔴 그리고 **소비량이 카드 성적을 타면** 같은 시드에서도 판이 갈립니다 —
 *    `youth-moment` B-0(🦶 주발만 뒤집어 견주는 검사)이 실제로 그렇게 갈렸어요.
 *
 * 🔑 **지금 「고정 22번」인 것을 재는 게 아닙니다.** 다음 사람이 `setPitch`에 한 줄
 *    더할 때 **소리 없이 깨지는가**를 재는 거예요. 증상은 몇 판 뒤에 전혀 다른 얼굴로 나옵니다.
 *
 * 🌍 **이 파일의 계약이 서 있는 세계**
 *   「난수원이 **셋**인 세계」입니다 — ① 판정 `_rng` ② 화면·동네의 `Math.random()`
 *   ③ 연출 전용 `fxRnd`(`match-scene.js`의 32bit 카운터). 연출은 ③만 씁니다.
 *   · **`fxRnd`를 없애고 `Math.random()`으로 돌아가는 판정이 나오면** X-1부터 다시 보세요.
 *   · **포메이션이 바뀌면**(선발 11명이 아니게 되면) X-4의 값 20이 먼저 빨간불입니다 —
 *     그때 고칠 곳은 이 검사이지 `dotShift`가 아니에요.
 *
 * 🔒 소스 문자열을 세지 않습니다. engineer가 146번 §4-2 ⑨에서 못 박은 자리예요 —
 *    *"`Math.random()`이 파일에 6번 나오는데 호출은 2번이고 나머지 4번은 「쓰지 마세요」라고
 *    적은 주석입니다."* 👉 **호출을 가로채서** 셉니다.
 *
 * ⏱️ 약 140초 걸려요 (격자 312칸 × 기준선 + 변이 5벌 · X-6은 타이핑을 진짜로 칩니다).
 */
"use strict";
const { bootPage, pageMutsOK } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* 🔒 **문턱·계약은 검사에 박습니다** (소스에서 읽어 오면 값을 바꿔도 검사가 따라가요) */
const FX_PER_PITCH = 22;   // ⚽ 공 2 (`rx`·`ry`) + 🏃 점 20
const FX_PER_DOTS = 20;    // 🧤 키퍼 2명 × 1 + 필드 9명 × 2 (선발 11명)
const SLOTS = 11;          // `HOME_ROWS` 6(나 포함) + `AWAY_ROWS` 5

/* 격자 — 🔴 **한 칸으로 재지 않습니다.** `kind`·`result`·`flow`·`phase`가
 * 각각 다른 `if`를 지나가서, 한 조합만 보면 다른 갈래의 굴림이 안 보입니다. */
const KINDS = ["goal", "assist", "defend", "filler", "kick", "half", "end"];
const RESULTS = [undefined, "goal", "assist", "shot", "save", "concede"];
const FLOWS = [undefined, "a", "h", "mid"];
const MINE_KINDS = ["goal", "assist", "defend"];

/* ══════════════════════════════════════════════════════════════
 * 🔬 계측 (변이가 아니에요) · 🔴 변이
 * ══════════════════════════════════════════════════════════════ */
const INS = { "match-scene.js": [
  /* 🎲 `fxRnd` 호출을 **가로채서** 셉니다 */
  [/  function fxRnd\(\) \{/, '  function fxRnd() {\n    try { window.__fxN = (window.__fxN || 0) + 1; } catch (e) { /* 닫힌 창 */ }'],
  /* ⏱️ `setPitch` 한 번의 시작점 */
  [/  function setPitch\(card, phase\) \{\n    if \(!S \|\| !S\.pitchEl\) return;/,
    '  function setPitch(card, phase) {\n    if (!S || !S.pitchEl) return;\n    const __fxA = (window.__fxN || 0);'],
  /* 🏃 점 자리 뽑기가 시작되는 자리 */
  [/^    const dir = side === "a" \? 1 : side === "h" \? -1 : 0;$/m,
    '    const __fxD = (window.__fxN || 0);\n    const dir = side === "a" ? 1 : side === "h" ? -1 : 0;'],
  /* 🎆 골 파티클(`burst`)이 실제로 불렸는지 셉니다 — X-1이 그 갈래를 **지났는지**의 증거(1막에선 모든 경기의 골) */
  [/  function burst\(target, emojis, n, far\) \{/, '  function burst(target, emojis, n, far) {\n    try { window.__burstN = (window.__burstN || 0) + 1; } catch (e) { /* 닫힌 창 */ }'],
  /* 📋 한 줄로 적습니다 — 공 부분과 점 부분을 **갈라서** */
  [/^    S\.pitchEl\.classList\.toggle\("mine", !!card\.mine && phase !== "close"\);$/m,
    '    (window.__pitch = window.__pitch || []).push({ kind: card.kind, result: card.result,'
    + ' flow: card.flow, phase: phase, slots: (S.slots || []).length,'
    + ' dot: (window.__fxN || 0) - __fxD, total: (window.__fxN || 0) - __fxA });\n'
    + '    S.pitchEl.classList.toggle("mine", !!card.mine && phase !== "close");'],
] };
/* 🎲 엔진의 판정 난수원 — **호출을 가로채서** 셉니다 (그리고 변이가 쓸 창구도 냅니다) */
const INS_ENG = { "engine.js": [[/^  const rnd = \(\) => _rng\(\);$/m,
  '  const rnd = () => { try { window.__rngN = (window.__rngN || 0) + 1; } catch (e) { /* 닫힌 창 */ } return _rng(); };\n'
  + '  try { window.__engRnd = rnd; } catch (e) { /* 닫힌 창 */ }']] };

const MUT = {
  /* 🔴 ⓐ **예전 상태로 되돌립니다** — 공 굴림 두 개를 `if`·`?:` **안**으로.
   *    골 카드는 0번, 놓친 카드는 1~2번이라 **소비량이 판정 결과를 탑니다.** */
  "M-IFROLL": { "match-scene.js": [
    [/^    const rx = fxRnd\(\), ry = fxRnd\(\);$/m, "    const rx = 0.5, ry = 0.5;"],
    [/at = f \? \[f\[0\] \+ \(rx \* 2 - 1\) \* f\[1\], null, ""\] : \[38 \+ rx \* 24, null, ""\];/,
      'at = f ? [f[0] + (fxRnd() * 2 - 1) * f[1], null, ""] : [38 + fxRnd() * 24, null, ""];'],
    [/const y = at\[1\] == null \? 26 \+ ry \* 48 : at\[1\];/,
      "const y = at[1] == null ? 26 + fxRnd() * 48 : at[1];"]] },
  /* 🔴 ⓑ 점 자리 뽑기에 **결과를 타는 굴림**을 한 줄 넣습니다 (다음 사람이 저지를 실수 그대로) */
  "M-DOTROLL": { "match-scene.js": [[/^      const \[dx, dy\] = dotShift\(sl\.x, sl\.y, sl\.role, sl\.home, at\[0\], y, dir\);$/m,
    '      if (card.result === "goal") fxRnd();\n'
    + "      const [dx, dy] = dotShift(sl.x, sl.y, sl.role, sl.home, at[0], y, dir);"]] },
  /* 🔴 ⓒ 흔들림 하나를 `Math.random()`으로 — 🎲 **①번 난수원**을 건드립니다 */
  "M-MATHRND": { "match-scene.js": [[/^    dx \+= \(fxRnd\(\) \* 2 - 1\) \* JX;$/m,
    "    dx += (Math.random() * 2 - 1) * JX;"]] },
  /* 🔴 ⓓ 흔들림 하나를 **엔진의 판정 난수원**으로 — 🎲 ②번을 건드립니다 */
  "M-ENGRND": { "match-scene.js": [[/^    dy \+= \(fxRnd\(\) \* 2 - 1\) \* JY;$/m,
    "    dy += ((window.__engRnd ? window.__engRnd() : fxRnd()) * 2 - 1) * JY;"]] },
  /* 🔴 ⓕ 🎆 **골 파티클을 옛 공용 `Fx.burst`처럼 `Math.random`으로** — 1막에서 `lite`가 사라져 **모든 경기**의 골이
   *    이 길을 지납니다(director 31번 §1). 옛 II는 학교(`lite`)만 피했어요 → X-1이 빨간불이어야 합니다 */
  "M-BURSTRND": { "match-scene.js": [[/const a = \(i \/ n\) \* Math\.PI \* 2 \+ \(i % 2\) \* 0\.26;/,
    "const a = Math.random() * Math.PI * 2;"]] },
  /* 🔴 ⓔ ⌨️ 타이핑 문장이 **판정 결과를 타게** 만듭니다 — 글자 수가 갈리면 굴림 수도 갈려요 */
  "M-STAKERES": { "match-scene.js": [[/^    const tail = STAKE_TAIL\[card\.stakeKey\] \|\| fallbackTail\(card\.kind, d\);$/m,
    '    const tail = (STAKE_TAIL[card.stakeKey] || fallbackTail(card.kind, d)) + (card.result || "");']] },
};
const withIns = (name) => ({
  "match-scene.js": [...INS["match-scene.js"], ...((MUT[name] || {})["match-scene.js"] || [])],
  "engine.js": [...INS_ENG["engine.js"]],
});

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — 실제 `W2Scene`을 띄우고 카드를 **진짜 `push()`로** 밀어 넣습니다
 * ══════════════════════════════════════════════════════════════
 * 🔑 게임 아크를 지나지 않는 이유: 한 아크는 카드 여덟 장이라 `result`·`flow`·`phase`의
 *    격자를 **한 칸도 못 채웁니다**(「커버리지가 난수에 걸림」). 여기서는 **504칸을 전부**
 *    지나가야 해서 화면을 직접 몰아요 — 대신 `bootPage`로 **디스크의 진짜 페이지**를 띄웁니다.
 * 🔒 그리고 「배선이 살아 있는가」는 `flow90-test`·`pitch-test`가 아크로 따로 지킵니다. */
async function drive(name, opt) {
  const o = opt || {};
  const W = bootPage({ muts: withIns(name) });
  const D = W.document;
  /* ⏳ **페이지 부팅이 끝난 뒤에** 셉니다(2026-10-02 · 1막) — 1막 `game.js`는 입구를 `DOMContentLoaded` 뒤에 그리고
   *    그때 공용 `Stats.init`이 기기 id를 `Math.random`으로 두 번 뽑아요. 옛 입구는 실을 때 곧바로 부팅해서
   *    세기 **전에** 끝났는데, 이제는 세는 **도중에** 끼어듭니다 — 경기 화면의 굴림이 아니에요(판정 흐름 밖).
   *    🔒 기다리는 신호는 벽시계가 아니라 **입구가 그려졌는가**예요. */
  for (let i = 0; i < 400 && !D.querySelector("#w2-entry"); i++) await new Promise((r) => setTimeout(r, 5));
  const Scene = W.W2Scene;
  if (!Scene || !Scene.mount) throw new Error("W2Scene이 안 실렸어요");
  const host = D.createElement("div");
  D.body.appendChild(host);
  /* 🔄 2026-10-02 (1막) — 옛 `lite`(🏫 학교 모드)는 **없어졌습니다**(director가 `match-scene.js`에서 지움 · 25번 §2).
   *    그래서 이 격자는 이제 **1막의 모든 경기**와 같은 화면이에요 — 골 파티클 · 배너까지 지납니다. */
  Scene.mount(host, { home: "우리 학교", away: "상대 학교", myName: "나" });
  if (!o.slow) Scene.fast();
  /* 🎲 ①번 난수원 — **호출을 가로채서** 셉니다 (소스 문자열이 아니라) */
  let mathN = 0;
  const rawRandom = W.Math.random;
  W.Math.random = function () { mathN += 1; return rawRandom(); };
  W.__rngN = 0;
  W.__fxN = 0;
  W.__burstN = 0;
  W.__pitch = [];

  const push = (c) => Scene.push(c, null);
  if (o.pro) {
    /* ⌨️ X-6 — 🏟️ 프로 경기의 타이핑. `result`만 갈아 가며 **여는 줄**을 재요 */
    for (const r of RESULTS) {
      const before = W.__fxN;
      await push({ kind: "goal", result: r, min: 30, score: [1, 1], stakeKey: "lead",
        text: "x", mine: true });
      o.rec.push({ result: String(r), fx: W.__fxN - before,
        text: String((D.querySelectorAll(".w2-card.mine .w2-body")[o.rec.length] || {}).textContent || "") });
    }
  } else {
    for (const k of KINDS) for (const r of RESULTS) for (const f of FLOWS) {
      await push({ kind: k, result: r, flow: f, min: 30, score: [1, 1], text: "한 줄" });
    }
    /* 🔥 내 순간 — `openMoment` + `closeMoment`로 `setPitch`를 **두 번** 지납니다 */
    for (const k of MINE_KINDS) for (const r of RESULTS) for (const f of FLOWS) {
      await push({ kind: k, result: r, flow: f, min: 30, score: [1, 1], text: "한 줄",
        mine: true, judge: "perfect", stakeKey: "lead" });
    }
  }
  const out = { pitch: W.__pitch.slice(), mathN, rngN: W.__rngN || 0, fxN: W.__fxN, bursts: W.__burstN || 0 };
  W.close();
  return out;
}

const uniq = (a) => [...new Set(a)];

(async () => {
  /* ══════════ 0. 계측·변이 정규식이 지금 소스에 걸리는가 ══════════ */
  {
    /* 🔴🔴 **계측 정규식이 안 걸리면 💥(종료 코드 2)로 죽습니다 — 빨간불이 아닙니다.**
     *
     * `setPitch`는 오늘 하루에만 **두 번** 갈렸어요. 정규식이 조용히 안 맞게 되면
     * `window.__pitch`가 **빈 배열**이 되고, 아래 X-1~X-5는 전부 «0건 위반»으로
     * **초록불**이 납니다 — 「도달 경로가 조용히 죽음」(CLAUDE.md 마지막 줄) 그대로예요.
     * 🔒 **0건을 「어긋남 없음」으로 읽지 않습니다.** 계측이 죽으면 검사가 죽어야 합니다.
     * 🔑 변이 정규식은 다릅니다 — 그건 ❌(1)로 충분해요. 검사는 돌았고 변이만 못 건 거니까요. */
    const insBad = pageMutsOK({ INS, INS_ENG });
    if (insBad.length) {
      console.log(`\n💥 **계측 정규식이 소스에 안 걸립니다 — 이건 초록불도 빨간불도 아닙니다**`);
      insBad.forEach((b) => console.log(`   · ${b}`));
      console.log(`   🔑 \`match-scene.js\`의 \`setPitch\`·\`fxRnd\` 또는 \`engine.js\`의 \`rnd()\`가 갈렸어요.`);
      console.log(`      계측을 못 심으면 아래 문장들이 **빈 배열을 보고 전부 초록불**이 납니다.`);
      process.exit(2);
    }
    const bad = pageMutsOK(MUT);
    const n = Object.values(Object.assign({ INS, INS_ENG }, MUT))
      .reduce((a, t) => a + Object.values(t).reduce((b, m) => b + m.length, 0), 0);
    check(bad.length === 0,
      `0-1. 🔴 계측·변이 정규식 ${n}개가 지금 소스에 전부 걸린다 (계측 ${insBad.length === 0 ? "✔" : "💥"} · 변이 ${bad.length === 0 ? "✔" : "🔴"})`
      + (bad.length ? `\n     🔴 **안 걸린 변이 ${bad.length}개 — 그 변이 검사는 "안 도는" 상태예요**`
        + bad.map((b) => `\n       · ${b}`).join("") : ""));
    if (bad.length) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
  }

  const base = await drive(null);
  const P = base.pitch;

  /* ══════════ X-0. 격자를 실제로 다 지났는가 ══════════
   * 🔴 **「됐는가」가 아니라 「하려고 했는가」를 셉니다.** 아무것도 안 밀어 넣어도
   *    아래 X-1~X-4는 전부 «0건 위반»으로 초록불이 나요. */
  {
    const want = KINDS.length * RESULTS.length * FLOWS.length
      + MINE_KINDS.length * RESULTS.length * FLOWS.length * 2;      // 🔥 내 순간은 2번
    check(P.length === want && P.length > 0,
      `X-0. 🧪 격자를 실제로 다 지났다 — \`setPitch\` **${P.length}회** (계약 ${want}회)`
      + `\n     🔎 kind ${KINDS.length} × result ${RESULTS.length} × flow ${FLOWS.length}`
      + ` + 🔥 내 순간 ${MINE_KINDS.length} × ${RESULTS.length} × ${FLOWS.length} × 2(open·close)`
      + `\n     phase 종류: ${uniq(P.map((x) => x.phase)).join(" · ")}`
      + (P.length === want ? "" : `\n     🔴 한 장도 안 밀었거나 도중에 멈췄어요 — 아래 문장들은 지금 아무것도 안 지킵니다`));
  }

  /* ══════════ X-1. 🎲 `Math.random()` 호출 0 — 🔄 **「학교 경기만」에서 「모든 경기」로 넓혔습니다**(26번 §5) ══════════
   * 옛 전제는 「🏫 학교(`lite`)만 0번」이었어요 — 프로 경기는 골마다 공용 `Fx.burst`가 `Math.random`을 먹었습니다.
   * 1막엔 `lite`가 없고 director가 파티클을 **굴림 0**으로 바꿔(번호로 각도) 이제 **모든 경기 0번**이 계약이에요.
   * 🔒 「골 연출을 실제로 지났나」를 같이 셉니다 — 파티클이 한 번도 안 불렸으면 이 0은 **공짜**예요. */
  check(base.bursts > 0,
    `X-1a. 🎆 격자가 골 연출을 **실제로 지났다** — 파티클(\`burst\`) ${base.bursts}회 (0이면 X-1이 골 갈래를 안 잰 것)`);
  check(base.mathN === 0,
    `X-1. 🎲 화면을 그리는 동안 **\`Math.random()\` 호출이 0번** — ${base.mathN}번 (1막 모든 경기 · 골 파티클 포함)`
    + `\n     🔒 소스 문자열이 아니라 **호출을 가로채서** 셉니다 (파일에 6번 나오지만 4번은 "쓰지 마세요" 주석이에요)`
    + (base.mathN === 0 ? "" : `\n     🔴 연출이 ①번 난수원을 씁니다 — 뒤 카드의 판정 굴림이 통째로 밀려요`));

  /* ══════════ X-2. 🎲 엔진의 판정 난수원 `_rng` 호출 0 ══════════ */
  check(base.rngN === 0,
    `X-2. 🎲 화면을 그리는 동안 **엔진 \`_rng\` 호출이 0번** — ${base.rngN}번`
    + `\n     🔒 \`engine.js\`의 \`rnd()\`를 가로채서 셉니다 (변이 M-ENGRND가 이 자가 살아 있는지 증명해요)`
    + (base.rngN === 0 ? "" : `\n     🔴 연출이 판정 난수원을 씁니다 — 같은 시드가 다른 경기를 냅니다`));

  /* ══════════ X-3. 🎲 `setPitch` 한 번의 소비량이 **모든 칸에서 같다** ══════════ */
  {
    const tot = uniq(P.map((x) => x.total));
    const same = tot.length === 1;
    /* 🔑 어느 칸에서 갈리는지 보여 줍니다 — 「갈렸다」만으로는 고칠 데를 못 찾아요 */
    const byRes = {}, byFlow = {}, byKind = {}, byPhase = {};
    for (const x of P) {
      (byRes[String(x.result)] = byRes[String(x.result)] || new Set()).add(x.total);
      (byFlow[String(x.flow)] = byFlow[String(x.flow)] || new Set()).add(x.total);
      (byKind[x.kind] = byKind[x.kind] || new Set()).add(x.total);
      (byPhase[x.phase] = byPhase[x.phase] || new Set()).add(x.total);
    }
    const spread = (m) => Object.entries(m).map(([k, v]) => `${k}:${[...v].join("/")}`).join(" · ");
    check(same,
      `X-3. 🎲 **\`setPitch\` 한 번의 굴림 수가 카드 내용을 안 탄다** — 관측된 값 ${tot.join(" · ")} (한 종류여야 합니다)`
      + `\n     🔎 격자 — kind ${spread(byKind)}`
      + `\n              result ${spread(byRes)}`
      + `\n              flow ${spread(byFlow)} · phase ${spread(byPhase)}`
      + (same ? "" : `\n     🔴 **소비량이 카드 성적을 탑니다** — 값이 아무 데도 안 가도 뒤 카드의 판정 굴림이 밀려요.`
        + ` \`fxRnd()\`를 \`if\`·\`?:\` **안**에서 부르는 자리를 찾으세요`));

    /* 🔒 **값**도 같이 박습니다 — 관계만 보면 22가 30이 되어도 조용히 통과해요.
     * 🌍 이 값이 서 있는 세계: 「선발 ${SLOTS}명 + 공 하나」입니다. 포메이션이 바뀌면
     *    여기가 먼저 빨간불이고, 고칠 곳은 **이 검사**이지 `dotShift`가 아닙니다. */
    check(same && tot[0] === FX_PER_PITCH,
      `X-3b. 🔒 그 값이 **${FX_PER_PITCH}**이다 — ⚽ 공 2 + 🏃 점 ${FX_PER_DOTS}`
      + (same && tot[0] === FX_PER_PITCH ? "" :
        `\n     🔴 관측 ${tot.join("/")} ≠ ${FX_PER_PITCH} — 포메이션이나 공 굴림이 바뀌었는지 보세요 (바뀐 게 맞으면 이 검사의 상수를 고치세요)`));
  }

  /* ══════════ X-4. 🏃 점 자리 뽑기 부분이 **분기 밖**에 있다 ══════════ */
  {
    const dot = uniq(P.map((x) => x.dot));
    const slots = uniq(P.map((x) => x.slots));
    const ok = dot.length === 1 && dot[0] === FX_PER_DOTS && slots.length === 1 && slots[0] === SLOTS;
    check(ok,
      `X-4. 🏃 **점 자리 뽑기의 굴림이 ${FX_PER_DOTS}번 고정** — 관측 ${dot.join("/")} · 겹 ${slots.join("/")}개`
      + `\n     🔎 ${FX_PER_DOTS} = 🧤 키퍼 2명 × 1 + 필드 ${SLOTS - 2}명 × 2. \`dotShift\`의 굴림이 \`if\` **바깥**에 있어야 나오는 값이에요`
      + (ok ? "" : `\n     🔴 갈렸습니다 — 점 하나를 조건부로 굴리는 줄이 들어왔는지 보세요 (변이 M-DOTROLL이 그 모양입니다)`));
  }

  /* ══════════ X-5. 🔥 카드 한 장이 지나는 `setPitch` 횟수도 고정 ══════════ */
  {
    const plain = P.filter((x) => x.phase === "plain").length;
    const open = P.filter((x) => x.phase === "open").length;
    const close = P.filter((x) => x.phase === "close").length;
    const ok = open === close && open === MINE_KINDS.length * RESULTS.length * FLOWS.length
      && plain === KINDS.length * RESULTS.length * FLOWS.length;
    check(ok,
      `X-5. 🔥 **내 순간은 \`setPitch\`를 두 번**(open·close), 나머지는 한 번 — plain ${plain} · open ${open} · close ${close}`
      + `\n     🔒 \`card.mine\`은 **판정 전에** 정해지는 값이라 이 횟수도 성적을 안 탑니다`
      + (ok ? "" : `\n     🔴 짝이 안 맞아요 — \`setPitch\`를 건너뛰는 갈래가 생겼는지 보세요 (그러면 굴림 수가 카드마다 달라집니다)`));
  }

  /* ══════════ X-6. ⌨️ 🏟️ 프로 경기의 타이핑도 성적을 안 탄다 ══════════
   * 🏫 학교는 `lite`라 타이핑을 아예 안 칩니다. 🏟️ 프로 경기에서는 **글자마다** 굴려요 —
   * 그 문장(`stakeLine`)이 판정 결과를 타면 소비량이 카드 성적을 탑니다.
   * 🔒 **여는 줄만** 잽니다(`judge`를 안 줘서 `openMoment`에서 멈춰요). */
  {
    const rec = [];
    await drive(null, { pro: true, slow: true, rec });
    const fx = uniq(rec.map((x) => x.fx));
    const txt = uniq(rec.map((x) => x.text));
    /* 🔴 **「환경이 우연히 막아 줌」을 막습니다** — `Scene.fast()`가 켜져 있으면 타이핑이
     *    아예 안 돌아서 굴림이 언제나 `setPitch`의 ${FX_PER_PITCH}번뿐이에요. 그러면 이 문장은
     *    **글자 수를 한 번도 안 재고** 초록불이 납니다. 「쳤는가」를 먼저 셉니다. */
    const typed = fx.length === 1 && fx[0] > FX_PER_PITCH;
    const ok = typed && txt.length === 1 && rec.length === RESULTS.length;
    check(ok,
      `X-6. ⌨️ **여는 줄이 판정 결과를 안 탄다** — \`result\`를 ${rec.length}가지로 갈아도 굴림 ${fx.join("/")} · 문장 ${txt.length}종`
      + `\n     🔎 측정 조건 — 1막 경기(옛 \`lite\` 없음) · **\`fast\`를 끄고**(안 그러면 타이핑이 아예 안 돕니다) · \`openMoment\`까지만`
      + `\n     🔒 굴림이 ${FX_PER_PITCH}번(= \`setPitch\`만)이면 **한 글자도 안 친 것**이라 통과로 안 셉니다`
      + `\n     "${txt[0] || ""}"`
      + (typed ? "" : `\n     🔴 타이핑이 안 돌았어요 (굴림 ${fx.join("/")}) — 이 문장은 지금 아무것도 안 지킵니다`)
      + (txt.length === 1 ? "" : `\n     🔴 여는 줄이 **판정 뒤에나 알 수 있는 것**을 말하고 있어요 — \`stakeLine\`을 보세요`));
  }

  /* ══════════════════════════════════════════════════════════════
   * 🔴 변이 검증 — **무엇을 망가뜨리면 어느 문장이 빨간불인가**
   * ══════════════════════════════════════════════════════════════ */
  {
    const probe = async (name, opt) => {
      const o = opt || {};
      if (o.pro) {
        const rec = [];
        const r = await drive(name, { pro: true, slow: true, rec });
        return { "X-6": uniq(rec.map((x) => x.fx)).length === 1 && uniq(rec.map((x) => x.text)).length === 1,
          raw: rec.map((x) => `${x.result}:${x.fx}`).join(" ") };
      }
      const r = await drive(name);
      const tot = uniq(r.pitch.map((x) => x.total));
      const dot = uniq(r.pitch.map((x) => x.dot));
      return {
        "X-1": r.mathN === 0, "X-2": r.rngN === 0,
        "X-3": tot.length === 1, "X-4": dot.length === 1 && dot[0] === FX_PER_DOTS,
        raw: `총량 ${tot.sort((a, b) => a - b).join("/")} · 점 ${dot.sort((a, b) => a - b).join("/")}`
          + ` · Math.random ${r.mathN} · _rng ${r.rngN}`,
      };
    };
    /* `red` = **반드시** 빨간불 · `also` = **딸려 오는 것이 정상**(이유를 옆에 적습니다).
     * 🔒 둘 다 아닌 문장이 빨간불이면 성질이 다른 것이 한 문장에 묶였다는 뜻이에요. */
    const WANT = {
      /* 🔑 공 굴림을 `if` 안으로 되돌리면 **총량만** 갈립니다 — 점 부분은 그대로 ${FX_PER_DOTS}예요.
       *    그래서 X-3과 X-4가 **서로 다른 것을 지킨다**는 게 여기서 증명됩니다. */
      "M-IFROLL": { red: ["X-3"], also: [] },
      /* 🔑 반대로 점 부분에 조건부 굴림을 넣으면 X-4가 물고, 총량도 같이 갈려 X-3이 따라옵니다 */
      "M-DOTROLL": { red: ["X-3", "X-4"], also: [] },
      /* 🔑 `fxRnd()` 한 줄을 **다른 난수원으로 갈아치우는** 변이라 그 자리의 `fxRnd` 굴림이
       *    하나 줄어듭니다 — 점 부분이 ${FX_PER_DOTS} → 11이 되어 X-4가 딸려 와요.
       *    「연출이 남의 난수원을 쓴다」의 뿌리는 X-1·X-2가 가리킵니다. */
      "M-MATHRND": { red: ["X-1"], also: ["X-4"] },
      "M-ENGRND": { red: ["X-2"], also: ["X-4"] },
      /* 🔑 파티클은 `setPitch` 밖이라 X-3·X-4는 그대로여야 해요 — 「모든 경기 0번」(X-1)만 뭅니다 */
      "M-BURSTRND": { red: ["X-1"], also: [] },
    };
    for (const [name, w] of Object.entries(WANT)) {
      const got = await probe(name);
      const red = ["X-1", "X-2", "X-3", "X-4"].filter((k) => !got[k]);
      const miss = w.red.filter((k) => !red.includes(k));
      const extra = red.filter((k) => !w.red.includes(k) && !w.also.includes(k));
      const ok = miss.length === 0 && extra.length === 0;
      check(ok, `변이-${name} → **${w.red.join(" · ")}**이 빨간불`
        + (w.also.length ? ` (딸려 오는 것이 정상: ${w.also.join(" · ")})` : "")
        + `\n     실제로 빨간불: ${red.length ? red.join(" · ") : "🔴 없음 — 이 변이가 아무 데도 안 걸립니다"} · ${got.raw}`
        + (miss.length ? `\n     🔴 **안 잡힌 것: ${miss.join(" · ")}** — 그 문장은 지금 아무것도 안 지킵니다` : "")
        + (extra.length ? `\n     🔴 **뜻밖에 같이 무너진 것: ${extra.join(" · ")}** — 딸려 오는 게 맞으면 \`also\`에 **이유와 함께** 적으세요` : ""));
    }
    const s = await probe("M-STAKERES", { pro: true });
    check(!s["X-6"], `변이-M-STAKERES → **X-6이 빨간불**이어야 한다 — 여는 줄에 \`result\`를 붙이면 글자 수가 갈립니다`
      + `\n     굴림: ${s.raw}`
      + (s["X-6"] ? `\n     🔴 안 잡혔어요 — 타이핑이 지금 아예 안 도는지(fast·lite·reduced) 보세요` : ""));
  }

  /* ══════════ X-7. 🎮 v2 — **새 판이 열린 진짜 경기**에서도 `Math.random` 0(39번 §1 · 38번 §1 「경기 화면 Math.random 0 — 새 판 연출 포함」) ══════════
   * 진짜 페이지 · 진짜 오버레이 · 진짜 `match-scene.js` · **진짜 `winger-moment.js`**로 1막 첫 경기 넷을 사람처럼 눌러(판 준비 ▶️ · 칸)
   * **경기 동안**(`WingerLive.play`가 불려 풀릴 때까지)의 `Math.random` 호출을 셉니다. 경기 밖(승급 카드의 공용 `Fx.burst`)은 셈 밖이에요.
   * 변이 BRAND — 판 연출 난수 하나를 `Math.random`으로(`winger-moment.js`) → 빨간불 */
  {
    const { boot: boot7, runAct: run7 } = require("./_act.js");
    async function inMatch(muts) {
      const env = boot7({ seed: 2027, pos: "df", gender: "f", realScenes: true, realMoment: true, fastTimers: "keep-long", muts });
      const w = env.w;
      let active = false, n = 0, matches = 0, boards = 0;
      const raw = w.Math.random;
      w.Math.random = function () { if (active) n += 1; return raw(); };
      const rawPlay = w.WingerLive.play;
      w.WingerLive.play = (host, cfg) => { active = true; matches += 1; return rawPlay(host, cfg).then((info) => { active = false; boards += (info.boards || []).filter((b) => !b.auto).length; return info; }); };
      await run7(env, { until: (S) => S.week >= 13, stall: 3000 });
      w.close();
      return { n, matches, boards };
    }
    const r7 = await inMatch(null);
    check(r7.matches >= 4 && r7.boards >= 6 && r7.n === 0, `X-7. 🎮 새 판이 열린 진짜 경기 ${r7.matches}판(사람이 둔 판 ${r7.boards}번) 동안 \`Math.random\` **${r7.n}번**`);
    const bad7 = pageMutsOK({ BRAND: { "winger-moment.js": [[/B\.r = \[fx\(\), fx\(\), fx\(\), fx\(\)\];/, "B.r = [Math.random(), fx(), fx(), fx()];"]] } });
    if (bad7.length) check(false, `X-7 변이 정규식이 안 걸림 — ${bad7.join(" · ")}`);
    else {
      const m7 = await inMatch({ "winger-moment.js": [[/B\.r = \[fx\(\), fx\(\), fx\(\), fx\(\)\];/, "B.r = [Math.random(), fx(), fx(), fx()];"]] });
      check(m7.n > 0, `변이-BRAND(판 연출 난수 하나를 \`Math.random\`으로) → X-7이 빨간불 (${m7.n}번)`);
    }
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
