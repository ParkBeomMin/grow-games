/* ⚽ 더 윙어 II — 🧱 차단 **2단 국면** (`beta/winger-moment.js` · 2026-09-01 개편)
 *
 *   1단계 읽기   `.w2m-block`   · 🔒 정지 · 무제한 · 재촉 연출 금지 · 방향 버튼 셋
 *   2단계 타이밍 `.w2m-block2`  · 상대가 지나감 · 버튼 하나(`.w2m-blk-go`) · 겨냥 없음
 *
 *       s = sBar( |상대 위치 − 차단 지점|, BLK_WIN × BLK_READ[읽기결과] × mul )
 *
 * 여기서 지키는 것 넷
 *   A. 🔒 **1단계에 초읽기가 없다** — 붙는 순간 정확히 ⚾ 볼카운트가 됩니다
 *   B. 🔀 **국면이 화면으로 갈린다** — `.w2m-block` → `.w2m-block2` 클래스 교체
 *   C. 📏 **`BLK_WIN`은 종속값이다** — 옛↔새 짝지은 E[s] 차이로 **관계**를 잽니다
 *   D. 🎯 **읽기가 결과에 실린다** — 같은 손인데 읽기 하나로 갈립니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 **`cb`로 판정을 재지 마세요.** `ender`가 **620ms 뒤에** 부릅니다.
 *    그 시점에 재면 **변이해도 언제나 0회**라 초록불이에요 — engineer가 실제로
 *    두 번 걸린 자리입니다(106번 §4). 판정은 `ender`가 **곧바로** 붙이는
 *    `.w2m-hit` 클래스로 봅니다. 이 파일은 전부 그걸로 재요.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **이중 탭은 여기서 안 잽니다.** `gate`는 미니게임 **넷이 다 쓰는 자리**라
 *    `minigame-tap-test.js`로 따로 세웠어요 — 여기 끼워 넣으면 차단을 고쳤을 때
 *    나머지 셋의 신호가 같이 사라집니다.
 *
 * 🎲 `winger-moment.js`는 엔진 `_rng`를 **한 번도 안 지납니다** — 자기 `Math.random()`을
 *    직접 불러요. 그래서 C는 전역 `Math.random`을 시드 난수로 갈아 끼웁니다.
 * ⏱️ 3초쯤 걸려요 (1단계 무제한 확인에 실제로 기다립니다).
 */
"use strict";
const { loadMoment, momentMutsOK, momentDom, pressDom, MSRC } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * (정규식이 안 걸리면 그 변이 검사는 **초록불이 아니라 "안 도는" 상태**예요.
 *  실제로 `MUT.BLKFLAT`이 그 상태로 있다가 계약이 뒤집힐 때 드러났습니다.) */
const MUT = {
  /* ⓐ 🔴 **1단계에 초읽기를 붙입니다** — designer가 이름 붙인 「볼카운트화」.
   *    화면도 바뀌고 시간이 다 되면 자동으로 판정이 나요. */
  COUNTDOWN: [[/    const gate2 = newGate\(\);\n    let picked = false;/,
    '    const gate2 = newGate();\n    let picked = false;\n'
    + '    let __left = 3;\n'
    + '    const __tk = setInterval(() => { if (picked || ctx.done) { clearInterval(__tk); return; }\n'
    + '      __left -= 1; const l = wrap.querySelector(".tm-label");\n'
    + '      if (l) l.textContent = "🧱 어디로 파고들까요? (" + __left + ")";\n'
    + '      if (__left <= 0) { clearInterval(__tk); picked = true; ender(wrap, ctx)(0, "⏰ 시간 초과"); } }, 300);']],
  /* ⓑ 국면이 화면으로 안 갈립니다 — `.w2m-block`이 2단계에도 그대로 남아요.
   *    style.css의 *"`.w2m-block`에는 움직이는 것을 하나도 넣지 마세요"*가 2단계에 걸립니다. */
  NOSWAP: [[/    wrap\.classList\.remove\("w2m-block"\);\n/, ""]],
  /* ⓒ `BLK_READ`를 무력화 — 읽기가 판정 창을 못 정합니다 */
  READFLAT: [[/const BLK_READ = \{ exact: 1\.00, near: 0\.45, opp: 0\.15 \};/,
    "const BLK_READ = { exact: 1.00, near: 1.00, opp: 1.00 };"]],
  /* ⓓ `BLK_WIN`을 옛 표의 절대값 0.537에 맞췄던 값으로 — C가 잡아야 합니다 */
  WIN1569: [[/const BLK_WIN = 14\.2;/, "const BLK_WIN = 15.69;"]],
  /* ⓔ 2단계가 **안 움직입니다** — 상대가 제자리면 타이밍이 사라지고 아무 때나 만점 */
  FROZEN: [[/      pos \+= dt \* speed;\n/, "      pos += dt * 0;\n"]],
};

/* ══════════════════════════════════════════════════════════════
 * 🔎 0. 변이 정규식이 지금 소스에 걸리나 — 다른 무엇보다 먼저
 * ══════════════════════════════════════════════════════════════ */
{
  const bad = momentMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, m) => a + m.length, 0);
  check(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 beta/winger-moment.js에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}

const M = loadMoment();
const T = M._t, K = T.K;

/* ──────────────────────────────────────────────────────────────
 * 🖥️ 한 판을 진짜 DOM에서 열고, 1단계까지 데려다 놓습니다.
 *    🔑 **게임의 입구를 그대로 지납니다** — `play()` → 준비 화면 ▶️ 시작 → 1단계.
 *       산식만 떼어 부르면 배선이 죽어도 초록불이 돼요.
 * ────────────────────────────────────────────────────────────── */
async function openPhase1(W, opt) {
  const D = W.document;
  const host = D.createElement("div");
  D.body.appendChild(host);
  const seen = { cb: 0, last: null };
  W.W2Moment.play(host, Object.assign({ moment: "block", kind: "defend", condition: 80, foot: "R" }, opt || {}),
    (j, d) => { seen.cb += 1; seen.last = { j, d }; });
  const go = host.querySelector(".w2m-go");
  if (!go) throw new Error("준비 화면(.w2m-go)이 안 떴어요 — 배선이 끊겼습니다");
  pressDom(W, go);
  await wait(25);
  return { host, seen };
}
/* 🔒 판정이 났는지는 **`.w2m-hit`**로 봅니다 (`cb`는 620ms 뒤예요) */
const judged = (host) => !!host.querySelector(".w2m-hit");

(async () => {
  /* ══════════════════════════════════════════════════════════════
   * A. 🔒 **1단계 — 정지 · 무제한 · 재촉 없음**
   *
   * 🔴 *"1단계에 초읽기를 붙이는 순간 정확히 ⚾ 볼카운트가 됩니다"* — 「타이밍처럼
   *    생겼는데 핵심이 안 누르기」라 세 번 고치고도 죽은 자리예요.
   *
   * 🔑 화면이 안 바뀌는 것만 보면 **안 보이는 초읽기**(자동 실패 타이머)를 놓칩니다.
   *    그래서 1단계 동안 **예약되는 타이머·rAF를 셉니다** — 0건이어야 해요.
   * ══════════════════════════════════════════════════════════════ */
  {
    const W = momentDom();
    const { host, seen } = await openPhase1(W);
    const b1 = host.querySelector(".w2m-block");
    check(!!b1 && host.querySelectorAll(".w2m-dir").length === 3,
      `A-1. 1단계 상자(.w2m-block)와 방향 버튼 셋이 떴다 (버튼 ${host.querySelectorAll(".w2m-dir").length}개)`);
    check(!host.querySelector(".w2m-lane") && !host.querySelector(".w2m-gap"),
      `A-2. 🔒 1단계에 **움직이는 것이 하나도 없다** — 레인도 주자도 없어요`);
    /* 읽을 것이 **둘**입니다 (🦶 주발 · 몸 방향의 세기). 칩이 둘로 갈려 있어야 해요 */
    check(host.querySelectorAll(".w2m-sig").length === 2,
      `A-3. 🔎 읽을 신호가 **둘**로 갈려 있다 (🦶 주발 · 몸 방향) — 한 문장에 붙이면 세기가 안 보여요`);
    check(!!host.querySelector(".w2m-tell-hi, .w2m-tell-lo"),
      `A-4. 몸 방향의 **세기**가 표시된다 (확실히 ↔ 살짝) — 이게 없으면 신호 하나짜리 판이에요`);

    const html0 = b1.innerHTML;
    /* ⏱️ 1단계가 도는 동안 **예약되는 타이머를 셉니다.** 화면이 안 바뀌어도 잡히게요 */
    let timers = 0;
    const st = W.setTimeout, si = W.setInterval, rf = W.requestAnimationFrame;
    W.setTimeout = function (...a) { timers += 1; return st.apply(W, a); };
    W.setInterval = function (...a) { timers += 1; return si.apply(W, a); };
    if (rf) W.requestAnimationFrame = function (...a) { timers += 1; return rf.apply(W, a); };
    await wait(1300);
    W.setTimeout = st; W.setInterval = si; if (rf) W.requestAnimationFrame = rf;

    const still = host.querySelector(".w2m-block");
    check(!!still && still.innerHTML === html0 && timers === 0 && !judged(host) && seen.cb === 0,
      `A-5. 🔒 **1단계는 무제한이다** — 1.3초 뒤에도 화면이 한 톨도 안 바뀌고,`
      + ` **타이머가 0건 예약**되고, 판정이 안 났다 (타이머 ${timers}건 · 판정 ${judged(host) ? "남" : "없음"})`);
  }
  /* 🧪 변이 ⓐ — 1단계에 초읽기를 붙이면 셋이 다 빨간불이 되어야 합니다 */
  {
    const W = momentDom(MUT.COUNTDOWN);
    const { host } = await openPhase1(W);
    const html0 = host.querySelector(".w2m-block").innerHTML;
    let timers = 0;
    const st = W.setTimeout, si = W.setInterval;
    W.setTimeout = function (...a) { timers += 1; return st.apply(W, a); };
    W.setInterval = function (...a) { timers += 1; return si.apply(W, a); };
    await wait(1300);
    W.setTimeout = st; W.setInterval = si;
    const b = host.querySelector(".w2m-block");
    const changed = !b || b.innerHTML !== html0;
    check(changed && timers > 0 && judged(host),
      `A-변이. 🔴 1단계에 초읽기를 붙이면 → 빨간불 (화면 바뀜 ${changed} · 타이머 ${timers}건 · 자동 판정 ${judged(host)})`
      + `\n     👉 셋 중 **타이머 세기**가 핵심이에요 — 화면을 안 바꾸는 조용한 자동 실패 타이머는 나머지 둘로 못 잡습니다`);
  }

  /* ══════════════════════════════════════════════════════════════
   * B. 🔀 **국면이 화면으로 갈린다**
   *    `style.css` 머리말 ⑥이 *"`.w2m-block`에는 움직이는 것을 하나도 넣지 마세요"*를
   *    지키고 있어서, 2단계가 그 선택자에 걸리면 **1단계의 계약을 2단계가 깹니다.**
   * ══════════════════════════════════════════════════════════════ */
  {
    const W = momentDom();
    const { host } = await openPhase1(W);
    pressDom(W, host.querySelector('.w2m-dir[data-i="1"]'));
    await wait(30);
    check(!host.querySelector(".w2m-block") && !!host.querySelector(".w2m-block2"),
      `B-1. 🔀 클래스가 **갈아 끼워진다** — .w2m-block 나감 · .w2m-block2 들어옴`);
    const win = host.querySelector(".w2m-blk-win");
    const w = win && parseFloat(win.style.width);
    check(!!win && w > 0,
      `B-2. 판정 창이 **인라인 style로** 그려진다 (폭 ${win ? win.style.width : "없음"}) —`
      + ` 🔑 보이는 폭이 곧 판정 창이라 CSS로 덮으면 화면과 판정이 갈라져요`);
    check(!!host.querySelector(".w2m-blk-run"),
      `B-3. 상대(.w2m-blk-run)가 그려진다`);
    check(host.querySelectorAll(".w2m-blk-go").length === 1
      && host.querySelectorAll(".w2m-dir").length === 0,
      `B-4. 2단계 버튼은 **하나**뿐이다 (겨냥 없음 · 방향 버튼 ${host.querySelectorAll(".w2m-dir").length}개)`
      + ` — 방향을 여기 되돌리면 넷이 다 같은 게임이 됩니다`);
    await wait(150);
    const tr = host.querySelector(".w2m-blk-run").style.transform;
    const at = tr && parseFloat((tr.match(/[\d.]+/) || [0])[0]);
    check(at > 0, `B-5. 2단계는 **움직인다** — 상대가 ${tr || "제자리"}`);
    /* 🔒 판정은 `.w2m-hit`로 (cb는 620ms 뒤예요) */
    pressDom(W, host.querySelector(".w2m-blk-go"));
    await wait(30);
    check(judged(host),
      `B-6. 🛡️ 막기를 누르면 **곧바로** 판정이 난다 (.w2m-hit) — 🔒 cb로 재면 620ms 뒤라 못 봐요`);
  }
  /* 🧪 변이 ⓑ — 클래스를 안 갈아끼우면 2단계가 `.w2m-block` 선택자에 걸립니다 */
  {
    const W = momentDom(MUT.NOSWAP);
    const { host } = await openPhase1(W);
    pressDom(W, host.querySelector('.w2m-dir[data-i="1"]'));
    await wait(30);
    check(!!host.querySelector(".w2m-block"),
      `B-변이. 🔴 클래스를 안 갈아끼우면 → 빨간불 (2단계가 아직 .w2m-block에 걸려요`
      + ` — style.css의 "움직이는 것 금지" 계약이 2단계에 걸립니다)`);
  }

  /* ── 🔀 안 누르면 스스로 끝난다 · 그리고 **그게 눌러서 끝난 것과 구별된다** ──
   * 🚨 이 구별이 없으면 **「자가 복구가 실패를 삼키는」** 자리가 생깁니다 —
   *    검사가 2단계를 한 번도 안 눌러도 1.7초 뒤 스스로 끝나서 흐름은 통과해요.
   *    `wiring-test.js`가 정확히 그 상태였습니다(106번 §6). */
  {
    const W = momentDom();
    const { host, seen } = await openPhase1(W);
    pressDom(W, host.querySelector('.w2m-dir[data-i="0"]'));
    await wait(2400);
    const res = host.querySelector(".w2m-res");
    const line = res ? res.textContent : (seen.last ? "지나감" : "");
    check(seen.cb === 1 && seen.last && seen.last.d.s === 0,
      `B-7. ⏳ 안 누르면 상대가 지나가고 **s = 0** (cb ${seen.cb}회 · s ${seen.last ? seen.last.d.s : "?"})`);
    check(/못 던졌|지나갔/.test(line) || (seen.last && seen.last.d.s === 0),
      `B-8. 🚨 **타임아웃으로 끝난 판이 눌러서 끝난 판과 구별된다** — s = 0 · "몸을 못 던졌어요"`
      + `\n     👉 이 구별이 검사의 생명줄이에요. 도달만 재면 **아무것도 안 눌러도** 통과합니다`);
    /* ⏱️ 2단계의 **최대 길이** — 상수에서 역산합니다 (관계). 문턱만 검사에 박아요 */
    const tMax = 100 / K.BLK_RUN.speed[0], tMin = 100 / K.BLK_RUN.speed[1];
    check(tMin >= 1.2 && tMax <= 2.0,
      `B-9. ⏱️ 2단계가 스스로 끝나기까지 **${tMin.toFixed(2)} ~ ${tMax.toFixed(2)}초** (100 ÷ BLK_RUN.speed)`
      + ` — 밴드 [1.2, 2.0]초. 🔑 길이는 소스에서 역산하고 **밴드만 검사에 박습니다**`);
  }

  /* ══════════════════════════════════════════════════════════════
   * C. 📏 **`BLK_WIN`은 종속값입니다** — 값이 아니라 **관계**로 잽니다
   *
   * ┌ 「이 계약이 서 있는 세계」 ─────────────────────────────────────────
   * │ 🔒 **모델로 잰 「절대값」은 계약이 아닙니다. 같은 모델로 잰 「차이」만 계약입니다.**
   * │    (2026-09-02 designer 판정 · `moment-test.js` 머리말 참고)
   * │    같은 판(CRN)·같은 조작자로 **옛 3단 이산 매핑**과 **새 2단 국면**을 나란히 재서,
   * │    평균이 그 자리에 붙들려 있는지만 봅니다. 조작자 모델의 치우침은
   * │    **차이에서 상쇄**되고 절대값에만 남아요.
   * │
   * │ 🔴 **「손이 무편향인 세계」의 계약입니다.** `BLK_WIN`은 *중심 겨냥* 모델에서
   * │    옛 평균을 되찾도록 역산한 값이에요. 편향 있는 손(+30ms · −30ms · 속도 오판)으로
   * │    재면 Δ가 **−0.024**로 벌어지는데, 그건 고장이 아니라 개편이 **손이라는 둘째 층**을
   * │    새로 만든 결과입니다(옛 매핑에는 손이 아예 없었어요).
   * │    ⚠️ 편향 모델로 이 검사를 다시 쓰면 `BLK_WIN`을 15.5쯤으로 밀어 올리게 되고,
   * │       그건 **무편향 손에게 창을 선물합니다.** 모델을 바꾸려면 여기부터 다시 보세요.
   * │
   * │ 🔴 **`BLK_READ`·`BLK_RUN`이 바뀌면 `BLK_WIN`도 따라 바뀌어야 합니다** —
   * │    그때 이 검사가 빨간불이 되는 건 **정상**이에요. "다시 역산하세요"라는 뜻입니다.
   * └────────────────────────────────────────────────────────────────
   *
   * 🔒 **옛 매핑은 소스에 없으니 검사가 들고 있습니다** (정확 1 · 인접 0.24 · 반대 0).
   *    `BLK.part = 0.24`는 폐기된 상수예요 — 되살리라는 뜻이 **아닙니다**(원칙 ⑧).
   *    여기 남는 이유는 오직 하나, **「개편 전과 같은가」를 물으려면 개편 전이 필요해서**입니다.
   * ══════════════════════════════════════════════════════════════ */
  {
    /* 🎲 시드 난수 — 시드 하나로 안 잽니다 */
    const mulberry32 = (a) => () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const OLD_PART = 0.24;                                   // 🪦 폐기된 `BLK.part`
    const sOld = (p, t) => (p === t ? 1 : (p === 1 || t === 1) ? OLD_PART : 0);

    /* 🧍 조작자 — 읽기 섞임 15/60/25(찍기·몸 방향만·겹쳐) · 손 σt 70ms · 통째로 놓침 3% ·
     *    겨냥은 **무편향 중심 겨냥**(위 「세계」 참고). 컨디션 80.
     * 🔒 산식은 **소스에서** 부릅니다 — `rollBlock`·`blkWin`·`sBar`·`winMul` 전부 디스크의 것.
     *    다시 만든 것은 `pos = speed × t` 하나이고, 소스가 `pos += dt * speed`(가속 없음)라 같아요. */
    const N = 60000;
    const SEEDS = [11, 22, 33, 44, 55];
    const measure = (Mod, seed) => {
      const t = Mod._t, k = t.K;
      const rnd = mulberry32(seed);
      const orig = Math.random;
      Math.random = rnd;                                     // 🎲 winger-moment.js는 이걸 직접 부릅니다
      try {
        const mul = t.winMul(80, 1);
        let so = 0, sn = 0;
        for (let i = 0; i < N; i++) {
          const footR = rnd() < 0.75;
          const r = t.rollBlock(footR);                      // 🔒 소스의 진짜 굴림
          const favorDir = footR ? 0 : 2;
          const u = rnd() * 100;
          const pick = u < 15 ? Math.floor(rnd() * 3)        // 🎲 찍기
            : u < 75 ? r.tell                                // 👀 몸 방향만
              : (r.hi ? r.tell : favorDir);                  // 🔎 겹쳐 읽기
          so += sOld(pick, r.truth);                         // 옛 매핑 — 읽기가 곧 s
          const speed = k.BLK_RUN.speed[0] + rnd() * (k.BLK_RUN.speed[1] - k.BLK_RUN.speed[0]);
          if (rnd() < 0.03) continue;                        // 통째로 놓침 → s = 0
          const z = Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
          const pos = speed * (k.BLK_RUN.mark / speed + (z * 70) / 1000);
          sn += t.sBar(Math.abs(pos - k.BLK_RUN.mark), t.blkWin(pick, r.truth, mul));
        }
        return { old: so / N, neu: sn / N };
      } finally { Math.random = orig; }
    };
    const deltas = (Mod) => SEEDS.map((s) => { const r = measure(Mod, s); return r.neu - r.old; });
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

    const d = deltas(M);
    const dm = avg(d);
    const worst = Math.max(...d.map(Math.abs));
    /* 🚨 **문턱은 검사에 박습니다** — 소스에서 읽어 오면 상수를 바꿔도 따라가서 안 잡혀요.
     * 📏 여유: 시드 5벌의 1σ가 **0.0010**이고 밴드가 0.005예요 (**≈5σ**).
     *    N을 줄이면 σ가 커집니다 — N=8,000이면 1σ가 0.0047이라 **밴드를 잡음이 흔듭니다.**
     *    N은 여유의 일부입니다. 줄이려면 σ를 다시 재고 밴드도 같이 넓히세요. */
    const BAND = 0.005;
    check(Math.abs(dm) <= BAND && worst <= BAND * 2,
      `C-1. 📏 옛 3단 이산 ↔ 새 2단 국면, **같은 판·같은 손**으로 잰 E[s] 차이가 ±${BAND} 안`
      + ` — Δ ${dm >= 0 ? "+" : ""}${dm.toFixed(4)} (시드 ${SEEDS.length}벌 · N=${N} · 최악 시드 |Δ| ${worst.toFixed(4)})`
      + (Math.abs(dm) <= BAND ? "" :
        `\n     🔴 **\`BLK_WIN\`을 다시 역산하세요.** 이건 난이도 손잡이가 아니라 평균을 붙드는 종속값이에요`
        + `\n        (\`BLK_READ\`·\`BLK_RUN\`을 건드렸다면 이 빨간불이 정상입니다)`));

    /* 🧪 변이 ⓓ — 옛 표의 절대값 0.537에 맞추려던 `BLK_WIN = 15.69`.
     *    🔑 **그 값이 틀렸다는 게 아니라, 「절대값에 맞추면」 여기서 갈린다**는 뜻이에요. */
    const dW = avg(deltas(loadMoment(MUT.WIN1569)));
    check(Math.abs(dW) > BAND,
      `C-변이. 🔴 \`BLK_WIN\`을 15.69로(옛 표의 **절대값** 0.537에 맞춤) → 빨간불`
      + ` (Δ ${dW >= 0 ? "+" : ""}${dW.toFixed(4)} · 밴드 ±${BAND})`
      + `\n     👉 절대값에 맞추면 조작자 모델의 치우침을 **실제 난이도로 굳혀 버립니다**`);

    /* 🧪 변이 ⓒ — `BLK_READ` 무력화. 창이 늘 최대라 평균이 통째로 올라가요 */
    const dR = avg(deltas(loadMoment(MUT.READFLAT)));
    check(Math.abs(dR) > BAND,
      `C-변이. 🔴 \`BLK_READ\`를 셋 다 1.00으로 → 빨간불 (Δ ${dR >= 0 ? "+" : ""}${dR.toFixed(4)})`);
  }

  /* ══════════════════════════════════════════════════════════════
   * D. 🎯 **읽기가 결과에 실린다** — 손을 고정하고 읽기만 갈랐을 때
   *
   * 🔑 지키는 것은 **순서와 부호**지 값이 아닙니다 (정타 > 인접 > 반대 > 0).
   *    값을 박으면 계수를 조금만 움직여도 우연으로 빨간불이 돼요.
   * 🔑 **반대로 읽어도 0이 아닙니다** — *"역동작에 걸렸는데 발을 뻗어 걷어냈어요"*.
   *    0이 되면 손잡이가 아무것도 안 하는 구간이 생깁니다(원칙 ③).
   * ══════════════════════════════════════════════════════════════ */
  {
    const mulberry32 = (a) => () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    /* 🔒 **같은 손**을 씁니다 — 시드가 같으므로 세 갈래가 **똑같은 시간 오차 열**을 받아요.
     *    그래야 갈린 이유가 「손」이 아니라 「읽기」임이 확실해집니다. */
    const armOf = (Mod, key, seed) => {
      const t = Mod._t, k = t.K;
      const rnd = mulberry32(seed);
      const mul = t.winMul(80, 1);
      const pair = { exact: [1, 1], near: [0, 1], opp: [0, 2] }[key];
      let acc = 0;
      const n = 40000;
      for (let i = 0; i < n; i++) {
        const speed = k.BLK_RUN.speed[0] + rnd() * (k.BLK_RUN.speed[1] - k.BLK_RUN.speed[0]);
        const z = Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
        const pos = speed * (k.BLK_RUN.mark / speed + (z * 70) / 1000);
        acc += t.sBar(Math.abs(pos - k.BLK_RUN.mark), t.blkWin(pair[0], pair[1], mul));
      }
      return acc / n;
    };
    const SEEDS = [7, 17, 27];
    const mean = (Mod, key) => SEEDS.reduce((a, s) => a + armOf(Mod, key, s), 0) / SEEDS.length;
    const e = mean(M, "exact"), nr = mean(M, "near"), op = mean(M, "opp");
    check(e > nr && nr > op && op > 0,
      `D-1. 🎯 **같은 손인데 읽기 하나로 갈린다** — 정타 ${e.toFixed(3)} > 인접 ${nr.toFixed(3)}`
      + ` > 반대 ${op.toFixed(3)} (**반대도 0이 아니에요**)`);
    check(e - op > 0.2,
      `D-2. 🎯 정타 − 반대의 폭이 넉넉하다 (${(e - op).toFixed(3)} > 0.2)`
      + ` — 판 하나 안에서 읽기가 **눈에 보여야** 1단계가 장식이 아니게 됩니다`);

    /* 🧪 변이 ⓒ — 읽기를 무력화하면 셋이 같아집니다 */
    const F = loadMoment(MUT.READFLAT);
    const fe = mean(F, "exact"), fo = mean(F, "opp");
    check(Math.abs(fe - fo) < 1e-9,
      `D-변이. 🔴 \`BLK_READ\`를 무력화하면 → 빨간불 (정타 ${fe.toFixed(3)} = 반대 ${fo.toFixed(3)}`
      + ` — 1단계를 아무렇게나 눌러도 결과가 같아져요)`);
  }

  /* ── 🧪 변이 ⓔ — 2단계가 안 움직이면 타이밍이 사라집니다 ── */
  {
    const W = momentDom(MUT.FROZEN);
    const { host } = await openPhase1(W);
    pressDom(W, host.querySelector('.w2m-dir[data-i="1"]'));
    await wait(200);
    const tr = host.querySelector(".w2m-blk-run").style.transform;
    const at = parseFloat((String(tr).match(/[\d.]+/) || [0])[0]);
    check(!(at > 0),
      `변이. 🔴 2단계 상대를 제자리에 묶으면 → 빨간불 (200ms 뒤에도 ${tr || "0%"}`
      + ` — 안 움직이면 「언제」가 사라지고 아무 때나 눌러도 같습니다)`);
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
