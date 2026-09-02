/* ⚽ 더 윙어 II — 엔진을 node에서 그대로 굴리기 위한 공용 로더.
 *
 * 이 게임은 engineer가 엔진을 S·WingerSquad에서 떼어 **cfg로만 받게** 만들었어요
 * (13번 §10-3b). 그래서 이 저장소의 단골 함정 하나가 구조적으로 사라집니다 —
 * "소스에서 뜯어온 조각이 실제 배선과 다르다". **여기서는 진짜 엔진을 부릅니다.**
 *
 * 🔒 지키는 것 셋
 *   ① 직접 eval을 안 씁니다. new Function(...) + return이에요
 *      (직접 eval은 `const`가 eval 스코프에 갇혀 값이 늘 undefined가 됩니다)
 *   ② 문턱은 **검사에 직접 적습니다.** _t.K에서 읽어 오면 상수를 바꿔도
 *      검사가 따라가서 아무것도 안 잡혀요 (13번 §10-3 🚨)
 *   ③ 변이는 **반드시 적용됐는지 확인**합니다. 안 맞는 정규식으로 갈아치우면
 *      "변이했는데 초록불"이 되는데, 그건 변이 검증이 통째로 거짓이 되는 자리예요
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ENGINE = "/workspace/grow-games/beta/winger2/engine.js";
const SRC = fs.readFileSync(ENGINE, "utf8");

/* ═══════════════════════════════════════════════════════════════════════
 * 💥 **크래시는 초록불도 빨간불도 아닙니다** — 종료 코드로 갈라 줍니다
 *
 * 이 저장소에서 같은 사고가 **세 번** 났어요:
 *   ① 축구 검사 열 개가 여러 커밋 동안 스택만 뱉고 죽어 있었음
 *   ② 검사 D의 `ME_P : 1` 정규식 (42·43번)
 *   ③ 검사 E의 `NPC_SPOT : 1` 정규식 — **두 게이트째 안 돌았습니다** (45번)
 *
 * ②③은 둘 다 "변이 정규식이 소스 문자열에 의존한다"는 같은 뿌리예요.
 * 소스가 바뀌면 정규식이 안 걸리고, `load()`가 던지고, 파일이 그 자리에서 죽습니다.
 * 그런데 **모아 돌릴 때는 `❌ 실패 1건`으로만 보여서** *안 돈 것*과 *빨간불*이 구분이 안 돼요.
 *
 * 🔧 그래서 종료 코드를 나눕니다 — `_load.js`를 부르는 모든 검사에 자동으로 걸려요:
 *     0 = 통과 · 1 = 빨간불(검사가 돌았고 계약이 깨짐) · **2 = 💥 죽음(안 돌았음)**
 *
 * 모아 돌릴 때는 이렇게 갈라 보세요:
 *   red=0; dead=0
 *   for t in tests/winger2/*-test.js; do
 *     node "$t" >/dev/null 2>&1; c=$?
 *     [ $c -eq 1 ] && { echo "❌ $(basename $t)"; red=$((red+1)); }
 *     [ $c -ge 2 ] && { echo "💥 $(basename $t) — 안 돌았어요"; dead=$((dead+1)); }
 *   done; echo "빨간불 ${red}건 · 죽음 ${dead}건"
 *
 * 그리고 **정규식이 안 걸리는 것 자체를 검사로** 만드세요 — `mutsOK()`를 쓰면
 * 죽지 않고 ❌ 한 줄로 뜹니다(§ 아래). 죽는 것보다 그게 낫습니다. */
function die(e) {
  console.log(`\n💥 검사가 죽었어요 — 이건 초록불도 빨간불도 아닙니다 (안 돈 겁니다)`);
  console.log(`   ${e && e.stack ? e.stack : e}`);
  process.exit(2);
}
process.on("uncaughtException", die);
process.on("unhandledRejection", die);

/* 🔎 변이 정규식이 **지금 소스에 걸리는지** 미리 확인합니다. 던지지 않아요.
 * 돌려주는 것: 안 걸린 정규식의 목록(빈 배열이면 전부 걸림).
 * 검사 파일이 이걸 ❌ 한 줄로 찍으면, 소스가 바뀌었을 때 **죽는 대신 빨간불**이 됩니다. */
function mutsOK(table) {
  const bad = [];
  for (const [name, muts] of Object.entries(table)) {
    for (const [re] of muts) {
      const hit = SRC.match(re);
      if (!hit) bad.push(`${name}: ${re}`);
      else if (SRC.replace(re, "\u0000") === SRC) bad.push(`${name}(치환 무효): ${re}`);
    }
  }
  return bad;
}

/* muts = [[정규식, 바꿀 문자열], …]. 하나라도 안 걸리면 던집니다.
 * (던지는 건 그대로 둡니다 — 조용히 무변이로 통과하는 것보다 죽는 게 나아요.
 *  다만 위 `mutsOK()`로 **먼저 확인**하면 죽지 않고 빨간불로 뜹니다.) */
function load(muts) {
  let src = SRC;
  for (const [re, rep] of muts || []) {
    const before = src;
    src = src.replace(re, rep);
    if (src === before) throw new Error(`변이가 소스에 안 걸렸어요 — ${re}`);
  }
  const win = {};
  // Math를 감싸서 넘겨요 — 엔진이 _rng 밖에서 Math.random을 부르는지 셉니다
  const counter = { random: 0 };
  const MathShim = Object.create(Math);
  MathShim.random = function () { counter.random += 1; return Math.random(); };
  const E = new Function("window", "Math", `${src}\nreturn window.WingerEngine;`)(win, MathShim);
  E.__mathRandomCalls = counter;
  return E;
}

/* ---------- 명단 픽스처 ----------
 * ⚠️ 실제 디스크의 명단과 **같은 모양**이어야 해요 (career.js engRow):
 *   { name, pos, slot:{g,a,d}, me, stats|null, str, foot }
 * 자리 결(slot)은 정규화 IIFE가 평균 1을 지키니 여기서는 1로 둡니다.
 * 동료 전력은 squad.js의 STR_SPREAD(±14)와 같은 폭으로 흩뿌려요 — 고정 패턴이라 재현됩니다. */
const FORMATION = { fw: 2, wg: 2, mf: 4, df: 3 };
const SPREAD = [-11, 7, -3, 13, -8, 2, 10, -14, 5, -6, 9];
const statsOf = (a) => ({ shoot: a, pass: a, dribble: a, defense: a, stamina: a, speed: a });

/* 🔴 **고정 SPREAD는 재현성을 주는 대신 아티팩트를 하나 만듭니다.**
 *
 * 배열이 `fw fw wg wg mf mf mf mf df df df` 순서로 그대로 붙어서, mateBase 70이면
 *   fw 59 · 77   wg 67 · **83**   mf 62 · 72 · 80 · 56   df 75 · 64 · 79
 * 가 **언제나** 나와요. `ACE_POOL.goal`이 `["fw","wg"]`가 된 뒤로는
 * `aceOf`가 능력치 최대 한 명을 고르니 **골 에이스가 100% 윙어**가 됩니다.
 * 실제 게임(`STR_SPREAD ±14` 무작위)에서는 **50.1%**예요 — 픽스처가 그 최악만 봅니다.
 * (`ACE_POOL.goal`이 `["fw"]`였을 때는 에이스 위치가 spread와 무관해서 없던 함정이에요.)
 *
 * 볼트의 **"픽스처가 디스크와 다른 모양이면 없는 병이 보인다"** 그 자리입니다 —
 * 실제로 `award-test.js` B-2가 이것 때문에 빨간불이었고, 코드는 멀쩡했어요.
 *
 * 🔧 그래서 **spin**을 받습니다.
 *   · `spin`을 안 주면 **예전 그대로**예요 (고정 SPREAD). 기존 검사의 기준선이 안 흔들립니다
 *   · `spin`이 숫자면 그 시드로 SPREAD를 **섞습니다**. 여러 spin을 돌리면
 *     명단 폭의 앙상블이 되어 실제 게임의 분포에 가까워져요
 *
 * ⚠️ **에이스가 누구인지가 결과를 가르는 검사**(포지션 분포·부문상)는 반드시 앙상블로
 *    보세요. 한 벌만 보면 그 한 벌의 우연을 재게 됩니다. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function spreadFor(spin) {
  if (spin == null) return SPREAD;
  const r = mulberry32(spin >>> 0);
  const out = SPREAD.slice();
  for (let i = out.length - 1; i > 0; i--) {           // Fisher-Yates
    const j = Math.floor(r() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

/* 🧍 **나 없는 선발 11명** — 열한 명 전부가 명단 폭을 그대로 받습니다.
 *
 * 🔴 검사들이 `xiOf(...)`로 만든 뒤 내 줄을 `me:false · str = base`로 바꿔 쓰고 있었는데,
 *    그러면 그 자리 하나만 **폭 없이 평평한 base**가 됩니다. 공격수 자리를 그렇게 쓰면
 *    fw는 {70, 폭 하나}인데 wg는 {폭, 폭}이라 **골 에이스가 wg로 기웁니다**
 *    (실측: fw 37.2% / wg 62.8% — 실제 게임은 50 대 50이에요).
 *    고정 SPREAD의 "골 에이스 100% 윙어"만큼은 아니지만 **같은 종류의 함정**이라 없앱니다.
 * ⚠️ `spin`을 주면 앙상블이 됩니다. 에이스가 누구인지가 결과를 가르는 검사에서는 꼭 쓰세요. */
function xiAll(mateBase, spin) {
  const base = mateBase == null ? 70 : mateBase;
  const sp = spreadFor(spin);
  const rows = [];
  let i = 0;
  for (const p of ["fw", "wg", "mf", "df"]) {
    for (let j = 0; j < FORMATION[p]; j++) {
      rows.push({ name: `P${i}`, pos: p, slot: { g: 1, a: 1, d: 1 }, me: false,
        str: Math.max(25, Math.min(99, base + sp[i % sp.length])) });
      i += 1;
    }
  }
  return rows;
}

function xiOf(pos, ability, mateBase, spin) {
  const base = mateBase == null ? 70 : mateBase;
  const sp = spreadFor(spin);
  const rows = [];
  let i = 0;
  for (const p of ["fw", "wg", "mf", "df"]) {
    for (let j = 0; j < FORMATION[p]; j++) {
      rows.push({ name: `P${i}`, pos: p, slot: { g: 1, a: 1, d: 1 }, me: false,
        str: Math.max(25, Math.min(99, base + sp[i % sp.length])) });
      i += 1;
    }
  }
  const at = rows.findIndex((r) => r.pos === pos);
  rows[at] = { name: "나", pos, slot: { g: 1, a: 1, d: 1 }, me: true, stats: statsOf(ability), foot: 1 };
  return rows;
}

/* n경기를 굴려 집계합니다. 시드를 박으니 결과가 완전히 재현돼요. */
function play(E, pos, ability, opt) {
  const o = opt || {};
  const n = o.n || 1000;
  E._t.seed(o.seed == null ? 7 : o.seed);
  E._t.skill = o.skill == null ? 0.5 : o.skill;
  const acc = { g: 0, a: 0, d: 0, cards: 0, success: 0, tg: 0, og: 0, n, matches: [] };
  for (let i = 0; i < n; i++) {
    const r = E._t.playMatch({
      xi: xiOf(pos, ability, o.mateBase),
      oppName: "상대", teamStr: o.teamStr == null ? 70 : o.teamStr,
      oppStr: o.oppStr == null ? 70 : o.oppStr, condition: o.condition == null ? 80 : o.condition,
    });
    acc.g += r.myGoals; acc.a += r.assists; acc.d += r.defense;
    acc.cards += r.mineCards; acc.success += r.mineSuccess;
    acc.tg += r.teamGoals; acc.og += r.oppGoals;
    if (o.keep) acc.matches.push(r);
  }
  acc.perMatch = { g: acc.g / n, a: acc.a / n, d: acc.d / n, cards: acc.cards / n, og: acc.og / n, tg: acc.tg / n };
  acc.season = { g: acc.perMatch.g * 38, a: acc.perMatch.a * 38, d: acc.perMatch.d * 38 };
  return acc;
}

/* ═══════════════════════════════════════════════════════════════════════
 * 🔥 `beta/winger-moment.js` — 미니게임 4종을 **브라우저 없이** 부르기
 *
 * 판정 산식(`s` → perfect/ok/miss)은 엔진에 있고, 이 파일이 내는 건 **조작 성공도 `s`**
 * 하나뿐이에요. `_t`에 `sCut/sOne/sKp/sBlk/winMul/rollBlock`이 나와 있어서
 * **그 파일의 함수를 그대로** 부를 수 있습니다 — 산식을 베껴 적지 않아요.
 *
 * `window`·`document`·`localStorage`를 자리만 채워 줍니다:
 *   · `document`는 `getElementById → null`만 있으면 돼요 (♿ 체크박스 배선이 조용히 넘어갑니다)
 *   · `localStorage`는 ♿ 판정 창 확대(`grow-wide-judge`)를 켜고 끄는 창구예요
 *   · `window.WingerEngine`을 넣어야 🫀 컨디션(`condMul`)이 진짜로 걸립니다 —
 *     안 넣으면 `condOf`가 1로 떨어져 **컨디션 검사가 아무것도 안 지켜요**
 * ═══════════════════════════════════════════════════════════════════════ */
const MOMENT = "/workspace/grow-games/beta/winger-moment.js";
const MSRC = fs.readFileSync(MOMENT, "utf8");

function loadMoment(muts, opt) {
  const o = opt || {};
  let src = MSRC;
  for (const [re, rep] of muts || []) {
    const before = src;
    src = src.replace(re, rep);
    if (src === before) throw new Error(`winger-moment.js에 변이가 안 걸렸어요 — ${re}`);
  }
  const store = { "grow-wide-judge": o.wide ? "1" : "0" };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  const win = { WingerEngine: o.engine || load() };
  const doc = { getElementById: () => null, readyState: "complete", addEventListener() {} };
  /* 🔒 직접 eval을 안 씁니다 — const가 eval 스코프에 갇혀 값이 늘 undefined가 돼요. */
  const M = new Function("window", "document", "localStorage",
    `${src}\nreturn window.W2Moment;`)(win, doc, localStorage);
  M.__store = store;
  M.__win = win;
  return M;
}
/* 변이 정규식이 winger-moment.js에 걸리는지 미리 확인 — 죽지 않고 목록을 돌려줍니다. */
function momentMutsOK(table) {
  const bad = [];
  for (const [name, muts] of Object.entries(table || {})) {
    for (const [re] of muts) {
      if (!MSRC.match(re)) bad.push(`${name}: ${re}`);
      else if (MSRC.replace(re, "\u0000") === MSRC) bad.push(`${name}(치환 무효): ${re}`);
    }
  }
  return bad;
}

/* ═══════════════════════════════════════════════════════════════════════
 * 🖥️ 페이지를 JSDOM에 띄웁니다 — **진짜 게임 코드를 그대로** 부르려고요
 *
 * `prospect.js`는 game.js의 전역(S · rand · STAT_DEFS · POS_INFO …)과 `WingerSquad`에
 * 기대어 있어서, 산식만 떼어 오면 **그 전역들을 제가 다시 지어내게** 됩니다 —
 * 그게 이 저장소가 여러 번 데인 *"경로가 다른 시뮬레이터"*예요. 페이지째 띄웁니다.
 *
 *   opts.muts     { "prospect.js": [[정규식, 바꿀문자열], …], "career.js": […] }
 *                 파일별로 넣어요. **안 걸리면 던집니다.**
 *   opts.keys     localStorage에 심을 것 (없으면 새 게임으로 시작)
 *   opts.wide 등  그 밖은 안 씁니다
 *
 * 🔒 `window.__get(name)`으로 game.js의 최상위 const(전역에 안 붙는 것)를 꺼낼 수 있어요.
 * ═══════════════════════════════════════════════════════════════════════ */
const PAGE_DIR = "/workspace/grow-games/beta/winger2";

/* ═══════════════════════════════════════════════════════════════════════
 * ⏱️ **페이지 앞에 심는 preamble — 여기 한 벌만 있습니다** (2026-09-02 · 109번)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 🔴 **가짜 rAF가 미니게임을 통째로 얼렸습니다.** 이렇게 돼 있었어요:
 *
 *     window.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
 *
 * `winger-moment.js`의 판 넷은 전부 `last = nowMs()`(= performance.now, 큰 값)로
 * 시작해서 `dt = Math.min((t - last) / 1000, 0.05)`로 움직입니다. `t`가 늘 **0**이면
 *   ① 첫 프레임 dt가 **크게 음수** → 위치가 음수로 튀고
 *   ② 그 뒤로는 `last`도 0이라 dt가 **영원히 0** → **상대가 얼어붙습니다.**
 *
 * 그런데 **화면은 멀쩡히 그려져서 아무 검사도 안 울었어요.** 실측(109번 §2):
 *
 *   | 판 | 가짜 rAF | 진짜 시계 |
 *   |---|---|---|
 *   | 🏃 컷인   | 607ms 만에 **즉시 실패**, 갭이 `translateX(0.00%)`에 고정 (위치 1종) | 3155ms, 위치 396종 |
 *   | 🥅 1대1   | **안 끝남**, 키퍼가 `scaleX(0.2400)`에 고정 | 4005ms에 스스로 끝남, 412종 |
 *   | 🎯 킬패스 | **안 끝남**, 동료가 `translateX(7.15%)`에 고정 | 위치 398종 |
 *   | 🧱 차단   | **안 끝남**, 러너가 **`translateX(-4.13%)`**(음수!) — `.w2m-blk-go`를 904번 보고도 안 끝남 | 2264ms에 스스로 끝남, 282종 |
 *
 * `-4.13%`가 ①의 물증이고, 「904번 봤는데 안 끝남」이 *"1.7초 뒤 스스로 끝난다"*가
 * 거짓이었다는 물증입니다.
 *
 * 🔒 **그래서 preamble을 여기 한 벌만 둡니다.** 예전에는 같은 문자열이 **네 벌**
 *    (`_load.js` · `wiring-test.js` · `league-test.js` · `award-test.js`)이었고,
 *    `wiring-test.js` 한 벌만 고쳐진 채 **셋이 얼어붙은 판정 위에서 돌았어요.**
 *    복붙본이 하나라도 남으면 같은 일이 또 납니다 — `tests/winger2/raf-test.js`가
 *    **새 복붙본이 생기면 빨간불**을 냅니다.
 *
 * ⚠️ 시계는 **`performance.now()`**를 그대로 넘깁니다(가상 시계가 아니에요).
 *    `winger-moment.js`의 `nowMs()`가 같은 창의 `performance.now()`를 쓰니까
 *    **두 시계가 같은 시간축 위에 섭니다.** 가상 시계를 쓰려면 `performance.now`도
 *    같이 갈아야 하는데, 그러면 `setTimeout`(실시간)과 어긋나요.
 *    ⏳ 대가는 **벽시계**입니다 — 판이 진짜로 1.7~4초씩 걸려요. 그게 정상입니다.
 *
 *   opt.fastTimers  setTimeout을 0ms로 뭉갭니다 (rAF의 물리는 그대로 실시간이에요 —
 *                   `ender`의 620ms 같은 **지연만** 없앱니다) */
const RAF_SHIM = `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(typeof performance!=="undefined"&&performance.now?performance.now():Date.now()),0);`;
function pagePre(keys, opt) {
  const o = opt || {};
  return `window.fetch=()=>Promise.reject(new Error("off"));
${RAF_SHIM}window.scrollTo=()=>{};
window.alert=()=>{};window.confirm=()=>false;
`   + (o.fastTimers ? `(function(){var st=window.setTimeout;window.setTimeout=function(fn,ms){return st(fn,0);};})();\n` : "")
    + `window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message||e.error));});\n`
    + Object.entries(keys || {}).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("");
}
function bootPage(opts) {
  const o = opts || {};
  const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
  const muts = o.muts || {};
  const applied = {};
  const PRE = pagePre(o.keys, o);
  /* 🔴 **`index.html` 자신도 변이 대상입니다.** 예전에는 `<script src>`로 실린 .js만
   *    갈아치웠는데, 그러면 `muts["index.html"]`을 넘겨도 **조용히 아무 일도 안 일어나요**
   *    — `pageMutsOK`는 디스크에서 읽어 "걸린다"고 답하니 0번 검사도 초록불입니다.
   *    (실제로 🏘️ 동네 건너뛰기 버튼 변이가 그 상태로 「안 잡힘」을 냈습니다.)
   *    ⚠️ 마크업을 갈 때는 스크립트 태그를 인라인으로 바꾸기 **전**에 갈아야 해요. */
  let rawHtml = fs.readFileSync(path.join(PAGE_DIR, "index.html"), "utf8");
  for (const [re, rep] of muts["index.html"] || []) {
    const before = rawHtml;
    rawHtml = rawHtml.replace(re, rep);
    if (rawHtml === before) throw new Error(`index.html에 변이가 안 걸렸어요 — ${re}`);
    applied["index.html"] = (applied["index.html"] || 0) + 1;
  }
  const html = rawHtml
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const f = path.resolve(PAGE_DIR, src.split("?")[0]);
      if (!fs.existsSync(f)) return "";
      let code = fs.readFileSync(f, "utf8");
      const base = path.basename(f);
      for (const [re, rep] of muts[base] || []) {
        const before = code;
        code = code.replace(re, rep);
        if (code === before) throw new Error(`${base}에 변이가 안 걸렸어요 — ${re}`);
        applied[base] = (applied[base] || 0) + 1;
      }
      return `<script>\n${code}\n</script>`;
    })
    .replace("</head>", `<script>${PRE}</script></head>`)
    .replace("</body>", `<script>window.__get=(n)=>eval(n);</script></body>`);
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/winger2/" });
  const w = dom.window;
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };
  w.__applied = applied;

  /* ═══════════════════════════════════════════════════════════════════
   * 💥 **`W.close()` 뒤에 늦게 도는 콜백이 검사를 통째로 죽이는 자리** — 여기서 한 번에 막습니다
   * ═══════════════════════════════════════════════════════════════════
   * jsdom은 `close()` 뒤에 창 안의 `document`를 **`undefined`로 만듭니다.** 그런데
   * `bootPage`가 심어 둔 `fetch`는 **즉시 거절**이라, 그 `.catch`가 창을 닫은 **뒤에**
   * 돌면 `cloud.js`의 `syncPill`이 `document.body`를 읽다 `TypeError`로 던져요
   * (`syncPill → syncEnd → index.html:234`). 그 던짐은 `uncaughtException`이라
   * `die()`가 받아 **종료 코드 2(💥 안 돌았음)**가 됩니다 — 초록불도 빨간불도 아니에요.
   *
   * 🔴 **창마다 따로 피하지 않습니다.** 예전에는 검사가 각자
   *    `W.Cloud.touch = () => {}` · `W.fetch = () => new Promise(() => {})`로 무력화했는데,
   *    그러면 **그 줄을 안 적은 검사가 그대로 죽습니다**(engineer도 실측 스크립트에서
   *    같은 자리를 만나 「창을 안 닫는 것」으로 피했어요 — 96번 §5-4).
   *
   * 🔧 두 겹으로 막아요:
   *   ① ☁️ 클라우드 전송을 먼저 끕니다 — 새로 시작되는 왕복이 없어집니다
   *   ② **진짜 close는 한 틱 뒤에** 합니다. 이미 예약된 마이크로태스크(`.catch` 등)는
   *      `setImmediate`보다 **먼저** 도니까, 그때 `document`가 아직 살아 있어요.
   * 🔒 세이브 내용에도, 화면에도 손대지 않습니다 — **닫는 순서만** 바꿉니다. */
  const rawClose = w.close.bind(w);
  let closed = false;
  w.close = () => {
    if (closed) return;
    closed = true;
    try { if (w.Cloud) { w.Cloud.touch = () => {}; w.Cloud.pushAll = () => {}; } } catch (e) { /* 이미 죽은 창 */ }
    try { w.fetch = () => new Promise(() => {}); } catch (e) { /* 이미 죽은 창 */ }
    setImmediate(() => { try { rawClose(); } catch (e) { /* 이미 닫힘 */ } });
  };
  return w;
}
/* 변이 정규식이 그 파일에 걸리는지 미리 확인 — 죽지 않고 목록을 돌려줍니다. */
function pageMutsOK(table) {
  const bad = [];
  for (const [name, byFile] of Object.entries(table || {})) {
    for (const [file, muts] of Object.entries(byFile)) {
      const src = fs.readFileSync(path.join(PAGE_DIR, file), "utf8");
      for (const [re] of muts) {
        if (!src.match(re)) bad.push(`${name} → ${file}: ${re}`);
        else if (src.replace(re, "\u0000") === src) bad.push(`${name} → ${file}(치환 무효): ${re}`);
      }
    }
  }
  return bad;
}

/* ═══════════════════════════════════════════════════════════════════════
 * 🎲 **난수원이 둘입니다 — 시드를 「갈라서」 겁니다** (2026-09-02 · 109번 · designer §18-5 ③)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 이 페이지에는 난수원이 **둘**이에요:
 *   ① `W.Math.random`      — 화면·동네·학교·제안이 직접 부릅니다
 *   ② `WingerEngine._t.seed()` — 엔진이 로드 때 `let _rng = Math.random`으로
 *      **함수를 잡아 두기 때문에** ①만 갈아서는 판정에 안 걸려요. 따로 걸어야 합니다.
 *
 * 🔴 **그런데 둘에 같은 시드를 걸면 lockstep이 납니다.**
 *    `engine.js`의 `mulberry32`와 검사 쪽 `mulberry32`가 **같은 알고리즘**이라,
 *    같은 시드면 **앞 1,000개가 1000/1000 완전히 일치**합니다 (109번 §4 실측).
 *    그러면 소비량까지 맞아떨어지는 자리에서 **보폭이 같아져** 두 흐름이 함께 움직여요 —
 *    balancer 실측에서 그 상태의 첫 측정이 **부호가 뒤집힌 값**을 냈습니다.
 *
 * ⚠️ **이건 잡음이 아니라 편향이라 표본을 늘려도 안 없어집니다.** 시드를 갈라야 사라져요.
 *
 * 🔒 그래서 시드를 **한 군데서** 가릅니다. 드라이버마다 손으로 두 줄을 적으면
 *    한 벌만 안 갈린 채로 남아요 — 그게 방금 rAF에서 겪은 일입니다(복붙본 넷 중 하나만 수정).
 *    `seed-split-test.js`가 **두 스트림 앞 1,000개가 일치하면 빨간불**을 냅니다.
 *
 * 🌍 이 계약이 서 있는 세계:
 *   「난수원이 **둘 이상**인 세계」의 문장입니다. 엔진이 `_rng`를 로드 시점에 안 잡고
 *   매번 `Math.random`을 부르도록 바뀌면 난수원이 **하나**가 되고, 그때는 가르는 것이
 *   아니라 **`_t.seed()`를 아예 안 부르는 것**이 맞습니다 — 이 함수부터 다시 보세요.
 *
 *   돌려주는 값: 되감을 수 있는 흐름 `{ i, fn }` — `i`를 옮기면 같은 자리로 돌아가요.
 *   opt.engine === false 면 ②를 안 겁니다 (D-0a처럼 **일부러 빼서** 재는 검사용). */
const SEED_SPLIT = 0x9E3779B9;                 // 황금비 — 시드를 가르는 데만 씁니다
function seedBoth(W, seed, opt) {
  const o = opt || {};
  const base = mulberry32(seed >>> 0);
  const buf = [];
  const s = { i: 0 };
  s.fn = () => { if (s.i >= buf.length) buf.push(base()); return buf[s.i++]; };
  W.Math.random = s.fn;
  if (o.engine !== false && W.WingerEngine && W.WingerEngine._t) {
    W.WingerEngine._t.seed((seed ^ SEED_SPLIT) >>> 0);
  }
  return s;
}

/* ═══════════════════════════════════════════════════════════════════════
 * 🏘️ **동네 축구를 지나가는 드라이버** (2026-08-31 · 85번 「순-B」)
 *
 * 흐름이 바뀌었습니다 — `타이틀 → ✏️ 이름 → 📍 자리 → 🏘️ 동네 → 🏟️ 입단 제안 → 🧬 조립대`.
 * 📍 자리를 누르면 **곧바로 동네 순간 카드 3장**이 열려요. 조립대까지 가려면 그 셋을
 * 지나야 합니다.
 *
 * ⚠️ **`townAuto(W)`를 자리 누르기 「전」에 부르세요.** 첫 카드는 `WingerTown.open`이
 *    불리는 순간 바로 열립니다 — 그 뒤에 켜면 이미 진짜 미니게임이 떠 있어요.
 * 🤖 자동 진행은 `s = 0.5` **중립 조작**이에요. 판정 산식을 우회하는 게 아니라
 *    게임이 이미 갖고 있는 갈래(`autoMiniOn`)를 그대로 씁니다.
 * ♻️ 돌려받은 함수를 부르면 **원래 설정으로 되돌아갑니다** — 진짜 미니게임을 재는
 *    검사(youth-moment-test)가 이 뒤에 이어지니 켜 둔 채로 두면 안 돼요. */
function townAuto(W) {
  const prev = W.localStorage.getItem("grow-auto-mini");
  W.localStorage.setItem("grow-auto-mini", "1");
  return () => W.localStorage.setItem("grow-auto-mini", prev == null ? "0" : prev);
}
/* ═══════════════════════════════════════════════════════════════════════
 * 📨 **조기 제안 화면을 지나갑니다 — 반드시 「거절」입니다** (2026-09-01 · 98번)
 * ═══════════════════════════════════════════════════════════════════════
 * 🏫 초등·중등이 끝날 때마다 `screen-agency`가 **조기 제안 모드**로 한 번씩 섭니다.
 * 드라이버가 이걸 모르면 그 자리에서 **멈춰요** — 검사 9종이 그래서 💥로 죽었습니다.
 *
 * 🔴🔴 **`#agency-list`의 카드를 누르면 안 됩니다. 그건 「🤝 예비 계약」(승낙)이에요.**
 *    승낙하면 🏟️ 최종 제안에 **그 한 곳만** 옵니다 — `#agency-list`가 **1장**이 되어
 *    「5곳이 전부 온다」 위에 선 검사들이 통째로 어긋나요.
 *    ✅ 눌러야 하는 건 **`#btn-early-next`(🙅 거절하고 계속 뛸래요)** 하나뿐입니다.
 *
 * 🔑 **「조기 화면인가」를 화면 id로 판단하지 않습니다** — 최종도 `screen-agency`거든요.
 *    **`#btn-early-next`가 안 감춰져 있는가**로 봅니다. 그게 조기 모드의 표식이에요
 *    (`renderMarkets`가 최종 모드에서 이 버튼을 다시 감춥니다).
 *
 * 돌려주는 값: 거절을 눌렀으면 true. */
function passEarly(W, press) {
  const D = W.document;
  const cur = D.querySelector(".screen.active");
  if (!cur || cur.id !== "screen-agency") return false;
  const b = D.getElementById("btn-early-next");
  if (!b || b.disabled || b.classList.contains("hidden")) return false;
  press(b, "🙅 조기 제안 거절");
  return true;
}

/* 🏘️/🏫 학교 화면에 서 있으면 [다음]을 눌러 끝까지 지나갑니다. 없으면 아무것도 안 해요.
 * 📨 사이에 낀 조기 제안 화면은 **거절로** 지나갑니다 (위 `passEarly`).
 * 돌려주는 값: 지나간 카드 수 (0이면 학교 화면이 아니었다는 뜻) */
function passTown(W, press, restore) {
  const D = W.document;
  let n = 0;
  for (let g = 0; g < 24; g++) {
    const cur = D.querySelector(".screen.active");
    if (cur && cur.id === "screen-town") {
      const b = D.getElementById("btn-town-next");
      if (!b || b.disabled || b.classList.contains("hidden")) break;
      press(b, "🏫 다음");
      n += 1;
      continue;
    }
    /* 📨 조기 제안이면 거절하고 계속 뜁니다. 아니면 여기서 끝이에요. */
    if (!passEarly(W, press)) break;
  }
  if (restore) restore();
  return n;
}

/* ═══════════════════════════════════════════════════════════════════════
 * 🏫 **초·중·고 학교 아크를 지나가는 드라이버** (2026-09-01 · 93번 §5 · 96번)
 *
 * 흐름이 또 바뀌었습니다 —
 *   `타이틀 → ✏️ 이름 → 🦶 주발 → 🗺️ 동네 → 🏫 초등부(2) → 🎯 자리 → 🏫 중등부(3) → 🏫 고등부(3) → 🏟️ 제안`
 *
 * 🔴 **`passTown`(옛 3장 드라이버)은 그대로 둡니다.** 그건 🎯 자리 카드를 곧바로 눌러
 *    🦶 주발·🗺️ 동네·🏫 초등부를 **건너뛰고** 중·고등 6장만 지나는 길이라, 그 위에 선
 *    검사 여섯(bench·grade·worldcup·youth-*)의 기준선이 안 흔들려요.
 *    🔑 **아크 전체(8장)를 재려면 반드시 `passArc`를 쓰세요** — `passTown`으로는
 *    초등 2장이 통째로 안 들어옵니다(그게 96번 §5-2 T-5의 「6장」이었어요).
 *
 * ⏳ **🦶 주발은 320ms 뒤에 넘어갑니다** — 그래서 이 드라이버들은 **async**예요.
 *    ⚠️ 320ms를 박지 않습니다. **「화면이 바뀔 때까지」**를 기다려요(♿ reduce면 즉시입니다). */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 🦶 발을 누르고 화면이 넘어갈 때까지 기다립니다. */
async function tapFoot(W, press, foot) {
  const D = W.document;
  const cur = () => (D.querySelector(".screen.active") || {}).id;
  press(D.querySelector(`#screen-foot .foot-card[data-foot="${foot === "L" ? "L" : "R"}"]`),
    `🦶 ${foot === "L" ? "왼발" : "오른발"}`);
  for (let i = 0; i < 400 && cur() === "screen-foot"; i++) await wait(3);
  if (cur() === "screen-foot")
    throw new Error("🦶 발을 눌렀는데 화면이 안 넘어가요 — openFoot의 done 배선을 보세요");
}
/* 🗺️ 지역 하나를 골라 [다음]. 🏞️ 도는 지도 폴리곤 · 🏙️ 광역시는 옆 목록입니다. */
function pickOrigin(W, press, id) {
  const D = W.document;
  const el = D.querySelector(`#origin-map .om-do[data-id="${id}"]`)
    || D.querySelector(`#origin-cities .om-city[data-id="${id}"]`);
  press(el, `🗺️ ${id}`);
  press(D.getElementById("btn-origin-next"), "🏫 초등부로");
}
/* 🏫 **지금 서 있는 그 단계**의 카드를 끝까지 누릅니다. 단계가 끝나면 화면이 바뀌므로
 * 저절로 멈춰요. 돌려주는 값: 지나간 카드 수와 카드마다 읽은 `data-stage`. */
function passStage(W, press, max) {
  const D = W.document;
  const seen = [];
  for (let g = 0; g < (max || 12); g++) {
    const cur = D.querySelector(".screen.active");
    if (!cur || cur.id !== "screen-town") break;
    const b = D.getElementById("btn-town-next");
    if (!b || b.disabled || b.classList.contains("hidden")) break;
    seen.push(cur.dataset.stage || "?");
    press(b, "🏫 다음");
  }
  return seen;
}
/* 🏫 **아크 전체**를 지나 🏟️ 제안 화면까지. 게임 입구(타이틀)에서 출발합니다.
 *
 *   돌려주는 것: { stages, cards, screens, early }
 *     stages   카드마다 읽은 `data-stage` — 계약은 `e e m m m h h h`
 *     screens  지나온 화면들 (연달아 같은 화면은 한 번만)
 *     early    📨 조기 제안을 **거절로** 지난 단계들 — 계약은 `["e", "m"]`
 *
 * 🔴 **조기 제안은 늘 「거절」입니다.** 승낙하면 최종 제안에 한 곳만 와서 그 위에 선
 *    검사들이 통째로 어긋나요 (`passEarly` 주석 참고). 🤝 승낙 갈래를 재는 검사는
 *    `offer-test.js`가 **따로** 몰고 갑니다.
 *
 * ⚠️ `townAuto`는 **🗺️ 지역 [다음]을 누르기 전**에 켜세요 — 초등 첫 카드는
 *    `openStage`가 불리는 순간 바로 열립니다. */
async function passArc(W, press, opt) {
  const o = opt || {};
  const D = W.document;
  const cur = () => (D.querySelector(".screen.active") || {}).id;
  const screens = [];
  const mark = () => { const id = cur(); if (screens[screens.length - 1] !== id) screens.push(id); };
  mark();
  press(D.getElementById("btn-new"), "btn-new");
  mark();
  press(D.getElementById("btn-name-next"), "btn-name-next");
  mark();
  await tapFoot(W, press, o.foot || "R");
  mark();
  const back = o.auto === false ? null : townAuto(W);
  pickOrigin(W, press, o.origin || "seoul");
  mark();
  const stages = passStage(W, press);                       // 🏫 초등부
  const early = [];
  if (passEarly(W, press)) early.push("e");                 // 📨 초등 뒤 — **거절**
  mark();
  if (cur() === "screen-position")
    press(D.querySelector(`#position-list .card[data-pos="${o.pos || "wg"}"]`), `🎯 ${o.pos || "wg"}`);
  stages.push(...passStage(W, press));                      // 🏫 중등부
  if (passEarly(W, press)) early.push("m");                 // 📨 중등 뒤 — **거절**
  mark();
  stages.push(...passStage(W, press));                      // 🏫 고등부
  if (back) back();
  return { stages, cards: stages.length, screens, early };
}


/* ═══════════════════════════════════════════════════════════════════════
 * 🖥️ **진짜 DOM 위의 `W2Moment`** — 미니게임 넷을 실기기 순서로 눌러 보는 자리
 *
 * `loadMoment()`는 `document.getElementById → null`만 있는 가짜 창이라 화면을 못 그려요.
 * 여기서는 jsdom을 띄우고 `engine.js` → `winger-moment.js`를 **디스크 그대로** 싣습니다.
 *
 * 🔴 **`press()`가 세 이벤트를 같은 요소에 보내면 이중 탭이 재현이 안 됩니다.**
 *    실제 브라우저는 손 뗄 때 `click`을 **「그 지점에 지금 있는 요소」**에게 보냅니다 —
 *    `pointerdown`이 화면을 갈아치웠으면 click은 **새로 생긴 버튼**에게 가요.
 *    그 경로를 재현하는 것이 `pressRetarget(oldEl, newSel)`입니다.
 * ═══════════════════════════════════════════════════════════════════════ */
function momentDom(muts) {
  const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
  let mom = MSRC;
  for (const [re, rep] of muts || []) {
    const before = mom;
    mom = mom.replace(re, rep);
    if (mom === before) throw new Error(`winger-moment.js에 변이가 안 걸렸어요 — ${re}`);
  }
  const dom = new JSDOM("<!doctype html><body><div id=host></div></body>",
    { runScripts: "outside-only", pretendToBeVisual: true });
  const W = dom.window;
  W.eval(fs.readFileSync(path.join(PAGE_DIR, "engine.js"), "utf8"));
  W.eval(mom);
  return W;
}

/* 🖱️ 실기기 순서 그대로 — pointerdown → pointerup → click 셋 다.
 *    하나만 보내던 검사가 24개 케이스를 놓친 전례가 있어요. */
function pressDom(W, el) {
  for (const t of ["pointerdown", "pointerup", "click"]) {
    const e = new W.Event(t, { bubbles: true, cancelable: true });
    e.clientX = 10; e.clientY = 10;
    el.dispatchEvent(e);
  }
}

/* 🖱️🖱️ **브라우저의 click 재타겟** — 이중 탭이 진짜로 나는 경로예요.
 *    `pointerdown`/`pointerup`은 **옛 요소**에, `click`은 **그 자리에 새로 생긴 요소**에.
 *    `newSel`을 못 찾으면 던집니다 — 조용히 아무 일도 안 일어나면 초록불이 되니까요. */
function pressRetarget(W, oldEl, root, newSel) {
  for (const t of ["pointerdown", "pointerup"]) {
    oldEl.dispatchEvent(new W.Event(t, { bubbles: true, cancelable: true }));
  }
  const fresh = root.querySelector(newSel);
  if (!fresh) throw new Error(`재타겟할 새 요소를 못 찾았어요 — ${newSel}`);
  fresh.dispatchEvent(new W.Event("click", { bubbles: true, cancelable: true }));
  return fresh;
}

module.exports = { load, mutsOK, xiOf, xiAll, statsOf, play, spreadFor, SRC, ENGINE,
  bootPage, pageMutsOK, PAGE_DIR, pagePre, RAF_SHIM, seedBoth, SEED_SPLIT, mulberry32,
  townAuto, passTown,
  wait, tapFoot, pickOrigin, passStage, passEarly, passArc,
  loadMoment, momentMutsOK, MSRC, MOMENT,
  momentDom, pressDom, pressRetarget };
