/* ⚽ 더 윙어 II 1막 v2 — ✏️ **캐릭터 만들기** (29번 §3-3 · §3-4 · 15번 J6 · 33번 · 39번 §2)
 *
 *   CR-1  🎲 시작 능력치 — 판 시드 2,000 × 뽑기 네 번(첫 모양 + 다시 뽑기 3): 합 **288** · 칸마다 40~56 · 같은 (시드, k)면 같은 모양 ·
 *         k가 다르면 대개 다른 모양(비율 ≥ 95%) · 포지션 · 성별 · 외형과 무관(`rollStart(seed, k)` 두 인자만 — 세계를 만든 뒤에도 같은 값)
 *   CR-2  🔢 다시 뽑기 상한 3 — 만들기 화면 · `newState` 둘 다 `TUNE.REROLLS`로 자름 · 저장된 k가 4면 받지 않음(정적 · 실제 페이지)
 *   CR-3  ⭐ 장기는 **점수 0** — `bestOf`는 글만 내고 상태 · 평가서에 안 들어감(정적: 결과가 `textContent`로만 쓰임 · 상태에 `best` 칸 없음)
 *   CR-4  🎲 이름 표 — 남 · 여 각 24 · 두 글자 · 서로 안 겹침 · 33번 대조로 **뺀 17개**가 표 · II 코드 어디에도 문자열로 0 ·
 *         바로 앞 이름은 다시 안 냄(2,000번)
 *   CR-5  🎯 순서 — 능력치를 보고 포지션(만들기 화면이 🎲 능력치 → 🎯 포지션 순서로 그려짐)
 *   + 변이: START_N 49(합 289) · rollStart가 Math.random · 이름 표에 「태윤」을 되살림 · rollName이 앞 이름을 안 거름
 * 🔒 288 · 40 · 56 · 3 · 24 · 17개 이름은 29번 · 33번 · 15번의 숫자 — 박은 값
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 몇 초
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { load, PAGE_DIR } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const WSRC = fs.readFileSync(path.join(PAGE_DIR, "world.js"), "utf8");
const GSRC = fs.readFileSync(path.join(PAGE_DIR, "game.js"), "utf8");
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const OLD = ["태윤", "태하", "성윤", "재원", "주호", "도훈", "우재", "건호", "원준", "재하", "윤성", "이나", "윤채", "다원", "지율", "지안", "나린"];
const MUT = {
  N49: [[/START_N: 48,/, "START_N: 49,"]],
  RANDOM: [[/const r = rngOf\(seed, KEY\.start\(k\), SALT\.start\);/, "const r = Math.random;"]],
  OLDNAME: [[/m: \["태언",/, 'm: ["태윤",']],
  NOPREV: [[/const list = HERO_NAMES\[g2\(g\)\]\.filter\(\(x\) => x !== prev\);/, "const list = HERO_NAMES[g2(g)];"]],
};
const W = (muts) => {
  let src = WSRC;
  for (const [re, to] of muts || []) { if (!re.test(src)) throw new Error(`변이 정규식이 안 걸림: ${re}`); src = src.replace(re, to); }
  return new Function("window", `${src}\nreturn window.W2World;`)({ WingerEngine: load() });
};
check(Object.values(MUT).every((m) => m.every(([re]) => re.test(WSRC))), "0. 변이 정규식이 지금 world.js에 전부 걸린다");

function cr1(X) {
  const bad = [];
  let diff = 0, pairs = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    const seen = [];
    for (let k = 0; k <= 3; k++) {
      const a = X.rollStart(seed * 7919, k), b = X.rollStart(seed * 7919, k);
      const sum = K6.reduce((t, x) => t + a[x], 0);
      if (sum !== 288) bad.push(`합 ${sum}`);
      if (K6.some((x) => a[x] < 40 || a[x] > 56)) bad.push(`범위 ${JSON.stringify(a)}`);
      if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`같은 (시드, k) 다른 값`);
      for (const s of seen) { pairs += 1; if (JSON.stringify(s) !== JSON.stringify(a)) diff += 1; }
      seen.push(a);
    }
    if (seed <= 50) {
      const before = JSON.stringify(X.rollStart(seed * 7919, 0));
      X.create(seed * 7919, ["fw", "df"][seed % 2], seed % 3 ? "m" : "f");
      if (JSON.stringify(X.rollStart(seed * 7919, 0)) !== before) bad.push(`세계를 만든 뒤 값이 바뀜`);
    }
  }
  return { bad, ratio: diff / pairs };
}
function cr4(X) {
  const bad = [];
  for (const g of ["m", "f"]) {
    const L = X.HERO_NAMES[g];
    if (L.length !== 24 || new Set(L).size !== 24 || L.some((x) => [...x].length !== 2)) bad.push(`${g} 표 ${L.length}개`);
    let prev = L[0];
    const r = X.rngOf(4242, X.KEY ? 930 : 930, 7);
    for (let i = 0; i < 2000; i++) { const n = X.rollName(g, prev, r); if (n === prev || !L.includes(n)) { bad.push(`${g} 앞 이름 ${prev} → ${n}`); break; } prev = n; }
  }
  const both = X.HERO_NAMES.m.filter((x) => X.HERO_NAMES.f.includes(x));
  if (both.length) bad.push(`남 · 여 겹침 ${both}`);
  const back = OLD.filter((x) => X.HERO_NAMES.m.includes(x) || X.HERO_NAMES.f.includes(x));
  if (back.length) bad.push(`뺀 이름이 표에 ${back}`);
  return bad;
}

const X = W();
{
  const r = cr1(X);
  check(r.bad.length === 0 && r.ratio >= 0.95, `CR-1. 🎲 시드 2,000 × 뽑기 4 — 합 288 · 40~56 · 같은 (시드, k) 같은 모양 · 서로 다른 모양 ${(r.ratio * 100).toFixed(1)}% · 세계와 무관` + (r.bad.length ? `\n     🔴 ${r.bad.slice(0, 3).join(" · ")}` : ""));
}
{
  const ok = /REROLLS: 3,/.test(GSRC)
    && /const k = Math\.min\(TUNE\.REROLLS, Math\.max\(0, Math\.floor\(Number\(o\.rerolls\)\) \|\| 0\)\);/.test(GSRC)
    && /c\.k >= 0 && c\.k <= TUNE\.REROLLS/.test(GSRC)
    && /const left = TUNE\.REROLLS - cs\.k;/.test(GSRC);
  check(ok, "CR-2. 🔢 다시 뽑기 상한 3 — `TUNE.REROLLS` 3 · `newState`가 k를 0~3으로 자름 · 저장된 만들기 상태 k > 3은 버림 · 남은 수 = 3 − k");
}
{
  const uses = [...GSRC.matchAll(/bestOf\(/g)].length;
  const ok = uses === 2 && /best\.textContent = bestOf\(stats\);/.test(GSRC) && !/\bbest\s*:/.test(GSRC.slice(GSRC.indexOf("function newState"), GSRC.indexOf("function newState") + 3000));
  check(ok, `CR-3. ⭐ 장기는 점수 0 — \`bestOf\` 쓰임 ${uses - 1}곳(\`textContent\`) · \`newState\`에 \`best\` 칸 없음`);
}
{
  const bad = cr4(X);
  const files = fs.readdirSync(PAGE_DIR).filter((f) => /\.(js|html|css)$/.test(f));
  const hits = [];
  for (const f of files) { const s = fs.readFileSync(path.join(PAGE_DIR, f), "utf8"); for (const n of OLD) if (new RegExp(`["'\`]${n}["'\`]`).test(s)) hits.push(`${f}:${n}`); }
  check(bad.length === 0 && hits.length === 0, `CR-4. 🎲 이름 표 남 · 여 각 24 · 두 글자 · 안 겹침 · 33번에서 뺀 17개가 표 · II 코드(${files.length}개 파일)에 0 · 앞 이름 안 냄(2,000번)` + (bad.length || hits.length ? `\n     🔴 ${bad.concat(hits).slice(0, 4).join(" · ")}` : ""));
}
{
  const body = GSRC.slice(GSRC.indexOf("function renderCreate"));
  const a = body.indexOf('"🎲 시작 능력치"'), b = body.indexOf('"🎯 포지션', a);
  check(a > 0 && b > a, `CR-5. 🎯 순서 — 만들기 화면이 🎲 시작 능력치를 먼저 · 🎯 포지션을 뒤에 그림`);
}
if (fail === 0) {
  check(cr1(W(MUT.N49)).bad.length > 0, "변이-N49(합 289) → CR-1이 빨간불");
  check(cr1(W(MUT.RANDOM)).bad.length > 0, "변이-RANDOM(rollStart가 Math.random) → CR-1이 빨간불");
  check(cr4(W(MUT.OLDNAME)).length > 0, "변이-OLDNAME(「태윤」을 되살림) → CR-4가 빨간불");
  check(cr4(W(MUT.NOPREV)).length > 0, "변이-NOPREV(앞 이름을 안 거름) → CR-4가 빨간불");
}
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
