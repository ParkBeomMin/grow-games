/* ⚽ 더 윙어 II — ⏱️ **rAF 계약** (`beta/winger-moment.js` 판 넷 + 검사 하네스의 시계)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚨 이 검사가 생긴 이유 — **가짜 시계 위에서 여덟 달치 검사가 초록불이었습니다**
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 검사 하네스가 페이지 앞에 이 한 줄을 심고 있었어요:
 *
 *     window.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
 *
 * `winger-moment.js`의 판 넷은 전부 `last = nowMs()`(= `performance.now()`, 큰 값)로
 * 시작해서 `dt = Math.min((t - last) / 1000, 0.05)`로 움직입니다. `t`가 **늘 0**이면
 *   ① 첫 프레임 dt가 **크게 음수** → 위치가 음수로 튀고
 *   ② 그 뒤로는 `last`도 0이라 dt가 **영원히 0** → **상대가 얼어붙습니다.**
 *
 * 🔴 그런데 **화면은 멀쩡히 그려집니다.** 상자도 뜨고 버튼도 있고 클래스도 다 맞아요.
 *    얼어붙은 건 `pos` 하나뿐인데 판정이 그 `pos`로 나니까 **판정만 조용히 s = 0**이 되고,
 *    마크업을 읽는 검사들은 전부 초록불이었습니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 📏 실측 (109번 §2 · 시드 8벌)
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   | 판        | 진짜 시계                        | 가짜 시계 `cb(0)`                |
 *   |-----------|----------------------------------|----------------------------------|
 *   | 🏃 컷인   | 8/8 끝남 · 3153±2ms · 위치 497±8 | 8/8 끝남 · **612ms** · **위치 1** |
 *   | 🥅 1대1   | 8/8 끝남 · 4010±1ms · 위치 503±6 | **0/8 끝남** · **위치 1**         |
 *   | 🎯 킬패스 | 8/8 끝남 · 6609±2ms · 위치 543±44| **0/8 끝남** · **위치 1**         |
 *   | 🧱 차단   | 8/8 끝남 · 2139±89ms · 위치 320±21| **0/8 끝남** · **위치 1**        |
 *
 * 🔑 **컷인은 「끝남」으로는 안 잡힙니다** — 가짜 시계에서도 끝나요(오히려 612ms 만에
 *    *즉시 실패*합니다. `pos <= 0`이 매 프레임 참이라 왕복수가 프레임마다 오르거든요).
 *    그래서 **두 문장을 판마다 나란히** 둡니다:
 *      A. 판이 **움직인다** (서로 다른 위치 ≥ 40)   ← 넷 다 잡힙니다
 *      B. 판이 **스스로 끝난다** (12초 안)          ← 1대1·킬패스·차단이 잡힙니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 📐 문턱을 어디에 뒀나 — **기준선 옆에 붙이지 않았습니다**
 * ─────────────────────────────────────────────────────────────────────────
 *   · 위치 **40**: 기준선 최저 296(차단), 변이 1. 기준선까지 7.4배 · 변이까지 40배.
 *     가장 큰 1σ가 44(킬패스)이니 기준선 최저에서 **5.8σ** 떨어져 있어요.
 *   · 종료 **12,000ms**: 기준선 최대 6,611ms(킬패스). 1σ 최대 89ms이니 **60σ**.
 *     `KP.life`를 좀 늘려도 안 흔들리고, 얼어붙으면 확실히 걸립니다.
 *   🔒 **둘 다 검사에 박은 상수**입니다 — 소스에서 읽어 오면 상수를 바꿔도 따라가서
 *      아무것도 안 잡혀요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🌍 이 계약이 서 있는 세계
 * ─────────────────────────────────────────────────────────────────────────
 * 「판이 실시간으로 움직인다」는 **`winger-moment.js`가 rAF의 `t`로 물리를 도는 세계**의
 * 문장입니다. 판을 프레임 수로 돌리거나(dt를 안 쓰거나) 가상 시계로 갈아타는 판정이
 * 나오면 **이 검사부터 다시 보세요.** 그때는 「위치가 늘어난다」가 여전히 맞지만
 * 「12초 안에 끝난다」의 근거(실시간 life)가 사라집니다.
 *
 * ⏱️ 약 70초 걸려요 — 판을 **진짜 시간만큼** 돌리기 때문입니다. 그게 정상이에요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { RAF_SHIM, PAGE_DIR } = require("./_load.js");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 🔒 문턱은 **여기 박습니다.** 소스에서 읽어 오면 안 잡혀요. */
const MOVE_MIN = 40;        // 서로 다른 위치가 이만큼은 나와야 「움직인다」
const END_MS = 12000;       // 이 안에 스스로 끝나야 합니다
const GAMES = ["cutin", "oneone", "killpass", "block"];
const KO = { cutin: "🏃 컷인", oneone: "🥅 1대1", killpass: "🎯 킬패스", block: "🧱 차단" };

/* 🔴 **변이 = 옛 가짜 시계 그대로.** 이 문자열이 곧 「고치기 전」입니다. */
const FAKE_SHIM = `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);`;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dom(shim, seed) {
  const d = new JSDOM("<!doctype html><body><div id=host></div></body>",
    { runScripts: "dangerously", pretendToBeVisual: true });
  const W = d.window;
  W.eval(shim);
  W.Math.random = mulberry32(seed);
  W.eval(fs.readFileSync(path.join(PAGE_DIR, "engine.js"), "utf8"));
  W.eval(fs.readFileSync("/workspace/grow-games/beta/winger-moment.js", "utf8"));
  return W;
}
/* 🖱️ 실기기 순서 그대로 — pointerdown → pointerup → click 셋 다. */
const press = (W, el) => {
  for (const t of ["pointerdown", "pointerup", "click"]) {
    const e = new W.Event(t, { bubbles: true, cancelable: true });
    e.clientX = 10; e.clientY = 10;
    el.dispatchEvent(e);
  }
};

/* 판 하나를 열고 **아무 조작도 안 한 채** 지켜봅니다.
 * 🔑 준비 화면(▶️ 시작)과 🧱 1단계(방향 읽기)는 **조작이 필요한 자리**라 지나갑니다 —
 *    거기서 멈추면 「안 움직인다」가 되어 얼어붙음과 구분이 안 돼요. */
async function watch(shim, moment, seed, budget) {
  const W = dom(shim, seed);
  const host = W.document.getElementById("host");
  let done = null;
  W.W2Moment.play(host, { moment, kind: "goal", condition: 80, foot: "R" }, (j) => { done = j; });
  await wait(15);
  const go = host.querySelector(".w2m-go");
  if (!go) throw new Error(`${moment}: ▶️ 준비 화면(.w2m-go)이 안 떴어요`);
  press(W, go);
  await wait(15);
  const dir = host.querySelector(".w2m-dir");        // 🧱 차단만 1단계가 있어요
  if (dir) { press(W, dir); await wait(15); }
  const t0 = Date.now();
  const seen = new Set();
  while (Date.now() - t0 < budget && !done) {
    const el = host.querySelector(".w2m-blk-run, .w2m-gap, .w2m-run, .w2m-keeper-body");
    if (el && el.style.transform) seen.add(el.style.transform);
    await wait(4);
  }
  const ms = Date.now() - t0;
  try { W.close(); } catch (e) { /* 이미 닫힘 */ }
  return { ended: !!done, ms, pos: seen.size };
}

(async () => {
  /* ══════════ 0. 하네스가 심는 시계가 「진짜」인가 ══════════
   * 🔑 문자열을 눈으로 보는 게 아니라 **불러서 t를 받아 봅니다.** 낱말 검사는
   *    배선이 죽어도 통과해요 — 이 저장소가 여러 번 데인 자리입니다. */
  {
    const d = new JSDOM("<!doctype html><body>", { runScripts: "dangerously", pretendToBeVisual: true });
    const W = d.window;
    W.eval(RAF_SHIM);
    const ts = await new Promise((res) => {
      const got = [];
      const step = () => W.requestAnimationFrame((t) => {
        got.push(t);
        if (got.length >= 6) res(got); else setTimeout(step, 12);
      });
      step();
    });
    const moving = new Set(ts.map((t) => Math.round(t))).size >= 4;
    check(moving && ts[0] > 0,
      `0-1. ⏱️ \`pagePre\`의 rAF가 **흐르는 시계**를 넘긴다 — t = [${ts.slice(0, 4).map((t) => t.toFixed(1)).join(", ")} …]`
      + (moving ? "" : `\n     🔴 t가 안 움직여요. \`cb(0)\`으로 돌아갔는지 \`_load.js\`의 RAF_SHIM을 보세요`));
    /* `nowMs()`와 **같은 시간축**이어야 dt가 맞아요 — 다른 축이면 첫 dt가 또 음수가 됩니다 */
    const skew = Math.abs(ts[ts.length - 1] - W.performance.now());
    check(skew < 1000,
      `0-2. ⏱️ 그 시계가 \`performance.now()\`와 **같은 시간축**에 있다 (차이 ${skew.toFixed(0)}ms)`
      + `\n     🔑 \`winger-moment.js\`의 \`nowMs()\`가 performance.now예요 — 축이 다르면 첫 dt가 음수가 됩니다`);
    try { W.close(); } catch (e) { /* noop */ }
  }

  /* ══════════ A. 기준선 — 판 넷이 움직이고 스스로 끝난다 ══════════ */
  const base = {};
  for (const g of GAMES) {
    const rs = [];
    for (const s of [1201, 7717]) rs.push(await watch(RAF_SHIM, g, s, END_MS + 500));
    base[g] = rs;
    const pos = rs.map((r) => r.pos);
    const ms = rs.map((r) => r.ms);
    check(pos.every((p) => p >= MOVE_MIN),
      `A-${g}-1. ${KO[g]}가 **움직인다** — 서로 다른 위치 ${pos.join(" · ")} ≥ ${MOVE_MIN}`
      + (pos.every((p) => p >= MOVE_MIN) ? "" :
        `\n     🔴 위치가 하나면 **얼어붙은 겁니다.** 판정이 그 자리의 값으로만 나요 (s가 늘 같습니다)`));
    check(rs.every((r) => r.ended),
      `A-${g}-2. ${KO[g]}가 **${END_MS / 1000}초 안에 스스로 끝난다** — ${ms.map((m) => `${m}ms`).join(" · ")}`
      + (rs.every((r) => r.ended) ? "" :
        `\n     🔴 안 끝나면 드라이버가 그 자리에서 헛돕니다 (\`.w2m-blk-go\`를 904번 보고도 못 끝낸 전례)`));
  }

  /* ══════════ B. 🔴 변이 — 옛 가짜 시계로 되돌리면 빨간불인가 ══════════
   * 이게 없으면 A는 아무것도 안 지킵니다. **넷 다** 얼어붙어야 해요. */
  {
    const mut = {};
    for (const g of GAMES) mut[g] = await watch(FAKE_SHIM, g, 1201, END_MS + 500);
    const frozen = GAMES.filter((g) => mut[g].pos < MOVE_MIN);
    check(frozen.length === GAMES.length,
      `변이-1. 🔴 rAF를 \`cb(0)\`으로 되돌리면 **네 판이 다 얼어붙는다** → A-*-1이 빨간불`
      + `\n     ${GAMES.map((g) => `${KO[g]} 위치 ${mut[g].pos}`).join(" · ")}`
      + (frozen.length === GAMES.length ? "" :
        `\n     🔴 안 얼어붙은 판이 있어요 — A-*-1이 그 판에서는 **아무것도 안 지킵니다**`));
    const stuck = GAMES.filter((g) => !mut[g].ended);
    check(stuck.length >= 3,
      `변이-2. 🔴 그 상태에서 **${stuck.length}판이 ${END_MS / 1000}초 안에 안 끝난다** → A-*-2가 빨간불`
      + `\n     안 끝난 판: ${stuck.map((g) => KO[g]).join(" · ") || "(없음)"}`
      + `\n     🔑 ${KO.cutin}은 변이해도 **끝납니다**(612ms 만에 즉시 실패) — 그래서 위치 문장이 따로 있어요`);
  }

  /* ══════════ C. 🔒 복붙본이 다시 생기지 않았는가 ══════════
   * 🔴 예전에는 같은 preamble이 **네 벌**이었고, 한 벌만 고쳐진 채 셋이 얼어붙은
   *    판정 위에서 돌았습니다. 복붙본이 하나라도 생기면 같은 일이 또 나요. */
  {
    const dir = "/workspace/grow-games/tests/winger2";
    /* 🔑 **주석은 안 셉니다.** `_load.js`는 옛 가짜 줄을 머리말에 「이랬어요」로 적어 두고
     *    있어서, 낱말로 세면 그 설명이 위반으로 잡혀요.
     * 🔑 **`window.`으로 시작하는 것만** 셉니다 — 그게 페이지 앞에 심는 preamble의 모양이에요.
     *    `block-test.js`처럼 **이미 뜬 창**의 `W.requestAnimationFrame`을 감싸 세는 건
     *    계측이지 시계 정의가 아니라서, 여기 걸리면 안 됩니다. */
    const code = (s) => s.split("\n")
      .filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).join("\n");
    const RE = /window\.requestAnimationFrame\s*=/;    // ⚠️ /g를 붙이면 lastIndex가 남아 한 번씩 걸러집니다
    /* 🔴 `raf-test.js`(이 파일)는 **변이용 가짜 시계를 일부러 갖고 있습니다** — 빼요. */
    const bad = fs.readdirSync(dir)
      .filter((f) => f.endsWith(".js") && f !== "_load.js" && f !== "raf-test.js")
      .filter((f) => RE.test(code(fs.readFileSync(path.join(dir, f), "utf8"))));
    check(bad.length === 0,
      `C-1. 🔒 winger2 검사에 rAF **복붙본이 없다** — preamble은 \`_load.js\`의 \`pagePre()\` 한 벌`
      + (bad.length ? `\n     🔴 복붙본: ${bad.join(", ")} — \`pagePre(keys)\`로 바꾸세요` : ""));
    /* `_load.js` 안에도 두 벌이 생기면 안 돼요 */
    const n = (code(fs.readFileSync(path.join(dir, "_load.js"), "utf8"))
      .match(/window\.requestAnimationFrame\s*=/g) || []).length;
    check(n === 1, `C-2. 🔒 \`_load.js\` 안에도 rAF **정의**가 한 군데뿐이다 (${n}군데 · 주석 제외)`);
  }

  /* ══════════ 🚧 D. 알려진 미달 — ⚽ v1(soccer) 검사는 아직 가짜 시계입니다 ══════════
   *
   * `beta/timing.js`(8개 게임이 전부 내려받는 파일)에도 **똑같은 산식**이 있어요:
   *     let last = performance.now(); … const dt = Math.min((now - last) / 1000, 0.05);
   * 그리고 `sweeps >= 4`면 자동 miss — 🏃 컷인과 **같은 형태**라 가짜 시계에서는
   * 곧바로 miss로 떨어집니다.
   *
   * 🚧 지금 크기를 **상한으로 박고, 더 나빠지면 빨간불**로 둡니다. 여기서 소리내어
   *    빨간불을 내면 "저건 원래 빨간불이야"가 되어 이 파일 전체가 신호를 잃어요.
   * 📌 **soccer 쪽을 고치면 이 문장을 A·B와 합치세요** — 상한을 0으로 내리고
   *    C-1의 검사 범위를 `tests/` 전체로 넓히면 됩니다. */
  {
    const CAP = 11;                                   // 🚧 2026-09-02 실측치
    const sdir = "/workspace/grow-games/tests/soccer";
    const hits = fs.existsSync(sdir) ? fs.readdirSync(sdir).filter((f) => f.endsWith(".js"))
      .filter((f) => /requestAnimationFrame=\(cb\)=>setTimeout\(\(\)=>cb\(0\)/.test(
        fs.readFileSync(path.join(sdir, f), "utf8"))) : [];
    if (hits.length > CAP) {
      check(false, `D-1. 🔴 ⚽ v1 가짜 시계가 **늘었습니다** — ${hits.length}개 > 상한 ${CAP}\n     ${hits.join(", ")}`);
    } else if (hits.length === 0) {
      check(false, `D-1. 🎉 ⚽ v1도 다 고쳐졌어요 — **이 🚧 문장을 지우고 C-1의 범위를 tests/ 전체로 넓히세요**`);
    } else {
      console.log(`🚧 D-1. ⚽ v1(soccer) 검사 ${hits.length}개가 아직 가짜 시계입니다 (상한 ${CAP} — 늘면 빨간불)`);
      console.log(`     \`beta/timing.js\`에 같은 dt 산식이 있어요. winger2 밖이라 여기서는 빨간불을 안 냅니다.`);
    }
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
