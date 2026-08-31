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
function bootPage(opts) {
  const o = opts || {};
  const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
  const muts = o.muts || {};
  const applied = {};
  const PRE = `window.fetch=()=>Promise.reject(new Error("off"));
window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};
window.alert=()=>{};window.confirm=()=>false;
window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message||e.error));});
` + Object.entries(o.keys || {}).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("");
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
/* 🏘️ 동네 화면에 서 있으면 [다음]을 눌러 끝까지 지나갑니다. 동네가 없으면 아무것도 안 해요.
 * 돌려주는 값: 지나간 카드 수 (0이면 동네 화면이 아니었다는 뜻) */
function passTown(W, press, restore) {
  const D = W.document;
  let n = 0;
  for (let g = 0; g < 8; g++) {
    const cur = D.querySelector(".screen.active");
    if (!cur || cur.id !== "screen-town") break;
    const b = D.getElementById("btn-town-next");
    if (!b || b.disabled || b.classList.contains("hidden")) break;
    press(b, "🏘️ 동네 다음");
    n += 1;
  }
  if (restore) restore();
  return n;
}

module.exports = { load, mutsOK, xiOf, xiAll, statsOf, play, spreadFor, SRC, ENGINE,
  bootPage, pageMutsOK, PAGE_DIR, townAuto, passTown,
  loadMoment, momentMutsOK, MSRC, MOMENT };
