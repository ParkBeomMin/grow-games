/* ⚽ 더 윙어 II — 🎲 **난수원 둘의 시드가 갈려 있는가** (lockstep)
 *
 * ⚠️ **`raf-test.js`와 묶지 않았습니다.** 저건 시계, 이건 난수예요 — 성질이 다른 것을
 *    한 검사에 묶으면 한쪽을 고친 뒤에도 빨간불이라 사람이 파일 전체를 안 보게 됩니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🚨 무엇이 문제였나 — designer §18-5의 **세 번째 얼굴**
 * ─────────────────────────────────────────────────────────────────────────
 * 두 갈래가 함께 움직이는(lockstep) 형태가 이 저장소에서 세 번 나왔어요:
 *   ① **소비량**으로 결합 — 한쪽이 더 뽑으면 다른 쪽 자리가 밀립니다
 *   ② **참조 시점**으로 안 갈림 — `engine.js`가 로드 때 `let _rng = Math.random`으로
 *      함수를 잡아 둬서, 나중에 `Math.random`을 갈아도 판정엔 안 걸려요
 *   ③ 🆕 **시드**로 결합 — **두 난수원에 같은 시드를 걸면 보폭까지 같아집니다**
 *
 * ③의 실측(109번 §4):
 *   `engine.js`의 `mulberry32`와 검사 쪽 `mulberry32`가 **같은 알고리즘**이라
 *   같은 시드면 **앞 1,000개가 1000/1000 완전히 일치**합니다.
 *   balancer가 그 상태에서 잰 첫 값이 **부호가 뒤집혀** 나왔어요.
 *   🔴 **잡음이 아니라 편향이라 표본을 늘려도 안 없어집니다.** 갈라야 사라져요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 그래서 재는 것
 * ─────────────────────────────────────────────────────────────────────────
 *   A. `seedBoth`가 심은 **두 흐름을 실제로 1,000개씩 뽑아** 견줍니다 — 일치하면 빨간불
 *   B. 🔴 변이: 시드를 안 가르면 → **1000/1000 일치**가 되어 A가 빨간불인가
 *   C. 드라이버가 **손으로 두 줄을 적지 않았는가** (소스 가드) — 한 벌만 안 갈린 채
 *      남는 게 이 저장소의 단골이에요 (rAF preamble 넷 중 하나만 고쳐졌던 것과 같은 형태)
 *
 * 🔑 A는 **엔진의 `_rng`를 변이로 꺼내서** 봅니다. 검사 쪽 `mulberry32`끼리 견주면
 *    *"엔진도 같은 알고리즘일 것"*이라는 **안 적힌 가정** 위에 서게 되는데,
 *    그 가정이 조용히 깨지면 A가 아무것도 안 지켜요. 진짜 엔진 흐름을 뽑습니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🌍 이 계약이 서 있는 세계
 * ─────────────────────────────────────────────────────────────────────────
 * 「시드를 갈라야 한다」는 **난수원이 둘 이상인 세계**의 문장입니다.
 * `engine.js`가 `_rng`를 로드 시점에 안 잡고 매번 `Math.random`을 부르도록 바뀌면
 * 난수원이 **하나**가 되고, 그때 맞는 답은 「가른다」가 아니라
 * **「`_t.seed()`를 아예 안 부른다」**예요 — 그러면 이 검사부터 다시 보세요.
 * (`_load.js`의 `seedBoth` 머리말에 같은 말을 적어 뒀습니다.)
 *
 * ⏱️ 2초 안에 끝나요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { load, mutsOK, seedBoth, SEED_SPLIT, mulberry32 } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* 🔒 문턱은 **검사에 박습니다.** 「앞 1,000개」가 designer가 정한 계약이에요. */
const N = 1000;
const SEEDS = [1, 7, 42, 4321, 1234567];

/* 🔓 엔진의 `_rng`를 꺼내는 변이. **값을 안 바꿉니다** — 창구만 하나 냅니다.
 *    `mutsOK`가 「지금 소스에 걸리는지」를 먼저 확인하니, 소스가 바뀌면
 *    이 검사는 **죽는 대신 ❌ 한 줄**로 뜹니다. */
const PEEK = [[/      unseed\(\) \{ _rng = Math\.random; \},/,
  "      unseed() { _rng = Math.random; }, rnd() { return _rng(); },"]];

/* 엔진에 시드를 걸고 앞 n개를 뽑습니다 — **진짜 `_rng`**에서요. */
function engineDraws(seed, n) {
  const E = load(PEEK);
  E._t.seed(seed >>> 0);
  const out = [];
  for (let i = 0; i < n; i++) out.push(E._t.rnd());
  return out;
}
const agree = (a, b) => a.reduce((k, v, i) => k + (v === b[i] ? 1 : 0), 0);

/* ══════════ 0. 변이 정규식이 지금 소스에 걸리는가 ══════════ */
{
  const bad = mutsOK({ PEEK });
  check(bad.length === 0,
    `0. 🔓 \`_rng\`를 꺼내는 정규식이 지금 \`beta/winger2/engine.js\`에 걸린다`
    + (bad.length ? `\n     🔴 **안 걸립니다 — 아래 A·B는 지금 "안 도는" 상태예요**`
      + bad.map((b) => `\n       · ${b}`).join("") : ""));
  if (bad.length) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
}

/* ══════════ A. `seedBoth`가 두 흐름을 가른다 ══════════ */
{
  const rows = SEEDS.map((s) => {
    /* 진짜 `seedBoth`를 씁니다 — 여기서 시드를 다시 계산해 적으면 **자기 자신과 비교**예요 */
    const fake = { Math: {}, WingerEngine: null };
    const st = seedBoth(fake, s, { engine: false });
    const mathDraws = []; for (let i = 0; i < N; i++) mathDraws.push(st.fn());
    const eng = engineDraws((s ^ SEED_SPLIT) >>> 0, N);
    return { s, same: agree(mathDraws, eng) };
  });
  const worst = Math.max(...rows.map((r) => r.same));
  check(worst < N,
    `A-1. 🎲 \`seedBoth\`의 두 흐름이 **앞 ${N}개에서 갈린다** — 시드별 일치 `
    + rows.map((r) => `${r.s}:${r.same}`).join(" · ")
    + (worst < N ? "" : `\n     🔴 **${N}/${N} 완전히 일치합니다 — lockstep이에요.** 보폭이 맞아 두 흐름이 함께 움직여요`));
  /* 「거의 안 겹친다」까지 봅니다 — 우연히 몇 개 겹치는 건 정상이에요(1/2^32꼴) */
  check(worst <= 2,
    `A-2. 🎲 겹치는 것이 거의 없다 (최대 ${worst}개 / ${N}) — 두 흐름이 **서로 무관**합니다`);
}

/* ══════════ B. 🔴 변이 — 시드를 안 가르면 빨간불인가 ══════════ */
{
  const rows = SEEDS.map((s) => {
    const m = mulberry32(s >>> 0);
    const mathDraws = []; for (let i = 0; i < N; i++) mathDraws.push(m());
    return { s, same: agree(mathDraws, engineDraws(s, N)) };   // 🔴 가르지 않고 같은 시드
  });
  const allLock = rows.every((r) => r.same === N);
  check(allLock,
    `변이-1. 🔴 시드를 **안 가르면** 두 흐름이 완전히 일치한다 → A-1이 빨간불`
    + `\n     ${rows.map((r) => `${r.s}:${r.same}/${N}`).join(" · ")}`
    + (allLock ? `\n     🔑 이게 designer §18-5 ③의 실물입니다 — balancer가 잰 부호 뒤집힘의 원인이에요`
      : `\n     🔴 안 일치합니다. 두 \`mulberry32\`가 이제 다른 알고리즘이면 **A는 아무것도 안 지켜요** —`
        + ` 이 검사가 서 있던 세계(§ 머리말)가 바뀐 겁니다`));
}

/* ══════════ C. 🔒 드라이버가 손으로 두 줄을 적지 않았는가 ══════════
 * 🔴 **한 벌만 안 갈린 채 남는 것**이 이 저장소의 단골이에요 — rAF preamble이 넷 중
 *    하나만 고쳐진 채 여덟 달을 갔습니다. 시드도 같은 길을 갈 수 있어요. */
{
  const dir = "/workspace/grow-games/tests/winger2";
  /* ⚠️ 주석은 안 셉니다 — 「이렇게 하지 마세요」라고 적어 둔 설명이 위반으로 잡혀요 */
  const code = (s) => s.split("\n").filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).join("\n");
  /* 🔑 **이 파일은 뺍니다** — 변이-1이 일부러 안 가른 짝을 갖고 있어요 */
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith("-test.js") && f !== "seed-split-test.js");
  const bad = [];
  for (const f of files) {
    const src = code(fs.readFileSync(path.join(dir, f), "utf8"));
    /* `_t.seed(X)`를 직접 부르면서 그 창의 `Math.random`도 손으로 심는 파일 */
    const seedsEngine = /\bW?\.?WingerEngine\._t\.seed\s*\(/.test(src) || /\b_t\.seed\s*\(/.test(src);
    const seedsMath = /\bMath\.random\s*=\s*mulberry32\s*\(/.test(src);
    if (!(seedsEngine && seedsMath)) continue;
    /* 갈랐다는 표시(`^ 0x9e3779b9` 또는 `SEED_SPLIT`)가 있으면 통과 */
    const split = /\^\s*0x9[eE]3779[bB]9/.test(src) || /SEED_SPLIT/.test(src);
    if (!split) bad.push(f);
  }
  check(bad.length === 0,
    `C-1. 🔒 두 난수원을 **손으로 같이 심는 드라이버가 없다** — 심으려면 \`seedBoth\`를 쓰세요`
    + (bad.length ? `\n     🔴 ${bad.join(", ")}\n     시드를 안 가르면 앞 ${N}개가 완전히 일치합니다 (변이-1이 그걸 보여줘요)`
      : ` (검사 ${files.length}개를 훑음)`));
  /* 🔄 2026-10-02 (1막으로 옮기며 · inspector) — 옛 C-2는 「`seedBoth`를 쓰는 드라이버가 5개 이상」이었어요.
   *    1막 게임은 **스스로** 판 시드에서 경기마다 엔진 시드를 갈라 겁니다(`world.js` `engineSeed` — 아래 D) — 검사가
   *    두 흐름을 손으로 심을 일이 거의 없어져 「사용처 5개」는 **문턱이 아니라 우연**이 됐습니다.
   *    🔒 대신 **감지기 자체의 감도**를 봅니다 — 안 가른 두 줄을 넣은 가짜 파일을 C-1의 자로 재면 잡혀야 해요.
   *    (그래야 「위반 0건」이 **공짜로 참**이 아닙니다 — 스킬 「소스를 읽어 세는 문장은 감도를 따로」) */
  const fakeBad = code("W.Math.random = mulberry32(seed);\nW.WingerEngine._t.seed(seed);\n");
  const fakeGood = code("W.Math.random = mulberry32(seed);\nW.WingerEngine._t.seed((seed ^ 0x9E3779B9) >>> 0);\n");
  const flags = (src) => (/\bW?\.?WingerEngine\._t\.seed\s*\(/.test(src) || /\b_t\.seed\s*\(/.test(src))
    && /\bMath\.random\s*=\s*mulberry32\s*\(/.test(src) && !(/\^\s*0x9[eE]3779[bB]9/.test(src) || /SEED_SPLIT/.test(src));
  check(flags(fakeBad) && !flags(fakeGood),
    `C-2. 🔬 C-1의 자가 **실제로 거른다** — 안 가른 두 줄을 넣은 가짜 파일 ${flags(fakeBad) ? "✔ 잡힘" : "🔴 안 잡힘"} · 가른 파일 ${flags(fakeGood) ? "🔴 잡힘" : "✔ 통과"}`);
}

/* ══════════ D. 🎲 **1막 게임의 난수원이 서로 갈려 있는가** (2026-10-02 · inspector · 11번 §7-3 #19 · 25번 §5) ══════════
 * 1막엔 난수원이 **여럿**이에요 — 판 시드 하나에서 자리마다 소금(`SALT`)으로 갈라 냅니다(`world.js`):
 *   엔진(경기마다 `engineSeed`) · 🎲 이벤트 · 🌦️ 상황 조각 · 🏫 세계 모양 · 🏷️ 이름 · ⭐ 평점 · 🎯 테스트 · 🥅 승부차기
 * 🔴 두 자리의 소금이 같으면 **같은 수열**이 나와 두 축이 함께 움직입니다(lockstep — 위 A·B와 같은 병).
 *    특히 🌦️ 상황 조각은 「이벤트 난수원에서 **따로** 굴린다」가 계약이에요(23번 §2 · 24번 §0-1 소금 `0x2545F491`).
 * 🔒 엔진 쪽은 **진짜 `_rng`**를 꺼내 봅니다(위 PEEK) — 검사 쪽 `mulberry32`끼리 견주면 안 적힌 가정 위에 서요.
 * 🧪 변이: 상황 조각의 소금을 이벤트와 같게 → D-1이 빨간불이어야 합니다. */
{
  const WSRC = fs.readFileSync("/workspace/grow-games/beta/winger2/world.js", "utf8");
  const loadWorld = (src) => new Function("window", `${src}\nreturn window.W2World;`)({});
  const drawsOf = (X, seed, key) => {
    const out = {};
    const take = (r) => { const a = []; for (let i = 0; i < N; i++) a.push(r()); return a; };
    for (const nm of ["event", "sit", "world", "name", "rate", "test", "pk"]) out[nm] = take(X.rngOf(seed, key, X.SALT[nm]));
    out.engine = engineDraws(X.engineSeed(seed, key), N);
    return out;
  };
  const worstPair = (X) => {
    let worst = 0, at = "";
    for (const seed of SEEDS) for (const key of [0, 6, 100, 400]) {
      const d = drawsOf(X, seed, key);
      const names = Object.keys(d);
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
        const k = agree(d[names[i]], d[names[j]]);
        if (k > worst) { worst = k; at = `${names[i]}↔${names[j]} @ 시드 ${seed} · 자리 ${key}`; }
      }
    }
    return { worst, at };
  };
  const X0 = loadWorld(WSRC);
  const salts = Object.values(X0.SALT);
  const base = worstPair(X0);
  check(new Set(salts).size === salts.length && base.worst <= 2,
    `D-1. 🎲 1막의 난수원 ${Object.keys(X0.SALT).length + 0}자리(엔진 · 이벤트 · 상황 · 세계 · 이름 · 평점 · 테스트 · 승부차기)가 **서로 갈린다** — 소금 ${salts.length}개가 모두 다름 · 짝마다 앞 ${N}개 중 최대 일치 ${base.worst}개${base.at ? ` (${base.at})` : ""}`
    + `\n     🔎 측정 조건 — 시드 ${SEEDS.join("/")} × 자리 0 · 6 · 100 · 400 · 엔진은 진짜 \`_rng\`(PEEK)`);
  /* 🧪 변이 — 상황 조각의 소금을 이벤트와 같게 */
  const MUT_SIT = [/sit: 0x2545f491,/, "sit: 0x85ebca6b,"];
  const hit = MUT_SIT[0].test(WSRC);
  const m = hit ? worstPair(loadWorld(WSRC.replace(MUT_SIT[0], MUT_SIT[1]))) : null;
  check(hit && m.worst === N,
    `D-변이. 🔴 상황 조각의 소금을 이벤트와 같게 하면 → 두 흐름이 **${m ? m.worst : "?"}/${N}** 일치(lockstep) → D-1이 빨간불`
    + (hit ? "" : `\n     🔴 변이 정규식이 \`world.js\`에 안 걸려요 — 그 변이는 **안 도는** 상태입니다`));
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
