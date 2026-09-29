/* 🧮 점수의 내역 — 펼친 칸을 더하면 **옛 careerScore**와 정확히 같은가 (스펙 §5-5 · §9-A 4)
 *
 * 필름의 점수는 careerScore() 그대로예요(결정 8). careerScoreParts()가 그걸 칸으로 펼쳐 보여 줘요.
 * 새 careerScore()가 칸의 합을 돌려주게 바뀌었으니 **새 것끼리 견주면 늘 같아요** — 그래서 반드시
 * **옛 식**(이번 작업 전의 한 줄 합 — 아래 OLD_SCORE에 사본으로 박았어요)과 견줘요.
 *
 * 지키는 것(전 격자 — 가중 카운터가 있는 세이브 · 없는 옛 세이브 · 명성 소수 · 초월 · 월드컵 · 주장)
 *   ① 새 careerScore() === 옛 식            — 명예의 전당 점수·정렬이 한 점도 안 움직인다
 *   ② Σ careerScoreParts().v === 옛 식       — 보이는 칸을 더하면 보이는 점수가 된다(최대 나머지법 — 25번 §2-1 수용)
 *   ③ 칸의 v는 전부 정수 · 기여가 0인 칸은 없다(있는 만큼만)
 *
 * 변이
 *   M1 careerScore의 🎗️ 주장 칸을 지운다 → ①② 빨간불이어야 해요
 *      (engineer 확인: 이 변이에 기존 hof-test·title-test는 **초록 그대로** — 이 파일이 유일한 방어예요)
 *   M2 careerScoreParts의 나머지 나누기를 지운다(내림만) → ② 빨간불이어야 해요
 *
 * 「어느 세계에서 성립하는 문장인가」: **점수 칸이 15개(발롱도르 … 골든월)인 세계**의 계약이에요.
 *   칸을 새로 더하는 판정(예: ② 병역)이 나오면 OLD_SCORE 사본도 그 판정 전 식으로 다시 박으세요 —
 *   사본을 새 식으로 바꾸면 이 검사는 새 것끼리 견주게 돼서 아무것도 안 지켜요.
 *
 * 산식은 소스(beta/soccer/career.js)에서 정규식으로 뜯어 new Function으로 굴려요. 직접 eval은 안 써요.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const fs = require("fs");
const H = require("./_w1.js");
H.guardExit();

const SRC = fs.readFileSync("/workspace/grow-games/beta/soccer/career.js", "utf8");
const LIVE = fs.readFileSync("/workspace/grow-games/soccer/career.js", "utf8");
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

/* ── 옛 식 사본 — 이번 작업 전(HEAD · 운영판 soccer/career.js) careerScore 본문 그대로.
 * ⚠️ **되살리라는 뜻이 아니에요.** 새 식이 이 값과 같아야 한다는 대조군이에요. 고치지 마세요. */
const OLD_SCORE = `
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    const dae = c.daesangW != null ? c.daesangW : (c.daesang || 0);
    const bon = c.bonsangW != null ? c.bonsangW : (c.bonsang || 0);
    const ring = c.ringW != null ? c.ringW : (S.trophies ? S.trophies.length : 0);
    const W = SCORE_W;
    return Math.round(
      (c.ballon || 0) * W.ballon + dae * W.dae + bon * W.bon + (c.rookie || 0) * W.rookie +
      ring * W.ring + (c.wins || 0) * W.mom + (S.fandom || 0) * W.fan +
      (c.years ? c.years.length : 0) * W.year +
      Math.max(0, peakPrestige() - 1) * W.peak +
      (S.center ? W.center : 0) + transTotal() * W.trans +
      (c.wcWin || 0) * W.wc + (c.wcBall || 0) * W.wcBall + (c.wcBoot || 0) * W.wcBoot
      + (c.wcWall || 0) * W.wcWall
    );`;

const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
const RE = {
  W: /const SCORE_W = \{[\s\S]*?\n  \};/,
  score: /function careerScore\(\) \{[\s\S]*?\n  \}/,
  parts: /function careerScoreParts\(\) \{[\s\S]*?\n  \}/,
};
const MUT = {
  M1: [/\n\s*\{ k: "center", label: "🎗️ 주장", n: S\.center \? 1 : 0, v: S\.center \? W\.center : 0 \},/, ""],
  M2: [/for \(let j = 0; left > 0 && j < order\.length; j\+\+, left--\) out\[order\[j\]\[1\]\]\.v \+= 1;/, ""],
};

console.log("=== 0. 변이 등록 · 뜯을 자리 ===");
const miss = Object.entries(MUT).filter(([, [re]]) => !re.test(SRC)).map(([k]) => k);
check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(", ")}` : ""}`);
const parts0 = { W: grab(SRC, RE.W), score: grab(SRC, RE.score), parts: grab(SRC, RE.parts) };
const lost = Object.entries(parts0).filter(([, v]) => !v).map(([k]) => k);
if (lost.length) { console.log(`💥 소스에서 못 찾았어요: ${lost.join(", ")}`); process.exit(2); }

/* 사본이 **지금의 운영판**과 같은지 — 승격 전에만 볼 수 있어요(승격하면 운영판도 새 식이 돼요) */
{
  // 주석을 걷고 공백을 접어 견줘요(운영판 본문에는 옛 세이브 설명 주석이 한 덩어리 있어요)
  const norm = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/\s+/g, " ").trim();
  const liveBody = grab(LIVE, /function careerScore\(\) \{[\s\S]*?\n  \}/);
  if (liveBody && /return Math\.round\(\s*\(c\.ballon/.test(liveBody)) {
    check(norm(liveBody).includes(norm(OLD_SCORE)), "옛 식 사본이 운영판 soccer/career.js의 careerScore 본문과 글자까지 같다");
  } else {
    console.log("🚧 운영판이 이미 새 식이에요(승격 뒤) — 사본 대조는 건너뛰어요. 사본은 그대로 두세요(대조군이에요)");
  }
}

/* 한 벌 만들기 — src(변이 적용 가능)에서 뜯은 새 식 · 옛 식 사본을 같은 입력으로 */
function build(src) {
  const p = { W: grab(src, RE.W), score: grab(src, RE.score), parts: grab(src, RE.parts) };
  const neu = new Function("S", "peakPrestige", "transTotal",
    `${p.W}\n${p.score}\n${p.parts}\nreturn { score: careerScore(), parts: careerScoreParts() };`);
  const old = new Function("S", "peakPrestige", "transTotal", `${p.W}\n${OLD_SCORE}`);
  return { neu, old };
}

/* 격자 — 입력 칸마다 값 목록을 두고 시드 난수로 섞어 뽑아요(시드 넷 · 모양 둘: 가중 카운터 있음/없음) */
const PRESTIGE = [0.45, 0.55, 0.7, 0.85, 1, 1.15, 1.3, 1.45, 1.6];
function stateOf(r) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const legacy = r() < 0.3;                              // 가중 카운터가 없는 옛 세이브 모양
  const n = Math.floor(r() * 16);
  const wsum = (k) => { let s = 0; for (let i = 0; i < k; i++) s += pick(PRESTIGE); return s; };
  const dae = Math.floor(r() * 7), bon = Math.floor(r() * 12), tro = Math.floor(r() * 25);
  const career = {
    years: Array.from({ length: n }, (_, i) => ({ y: i + 1 })),
    ballon: r() < 0.3 ? Math.floor(r() * 5) : 0, daesang: dae, bonsang: bon, rookie: r() < 0.5 ? 1 : 0,
    wins: Math.floor(r() * 320), wcWin: Math.floor(r() * 3), wcBall: Math.floor(r() * 3), wcBoot: Math.floor(r() * 3),
    wcWall: Math.floor(r() * 2),
  };
  if (!legacy) { career.daesangW = wsum(dae); career.bonsangW = wsum(bon); career.ringW = r() < 0.8 ? wsum(tro) : null; }
  if (r() < 0.05) { delete career.years; }                  // 기록 칸이 통째로 없는 모양
  const S = {
    career, trophies: Array.from({ length: tro }, (_, i) => `${i + 1}시즌 우승`),
    fandom: r() < 0.5 ? Math.floor(r() * 20000) : r() * 20000,  // 소수 명성도
    center: r() < 0.3,
  };
  if (r() < 0.03) delete S.career;                          // 세이브에 커리어 칸이 없는 모양
  return { S, peak: pick(PRESTIGE), trans: Math.floor(r() * 13) };
}
function measure(src, N, seeds) {
  const { neu, old } = build(src);
  let d1 = 0, d2 = 0, nonInt = 0, zero = 0, n = 0;
  const ex = [];
  for (const seed of seeds) {
    const r = H.mulberry32(seed);
    for (let i = 0; i < N; i++) {
      const g = stateOf(r);
      const pp = () => g.peak, tt = () => g.trans;
      const o = old(g.S, pp, tt);
      const x = neu(JSON.parse(JSON.stringify(g.S)), pp, tt);
      const sum = x.parts.reduce((a, p) => a + p.v, 0);
      n++;
      if (x.score !== o) { d1++; if (ex.length < 2) ex.push(`점수 ${x.score} ≠ 옛 ${o}`); }
      if (sum !== o) { d2++; if (ex.length < 3) ex.push(`칸 합 ${sum} ≠ 옛 ${o}`); }
      if (x.parts.some((p) => !Number.isInteger(p.v))) nonInt++;
      if (x.parts.some((p) => p.v === 0)) zero++;
    }
  }
  return { n, d1, d2, nonInt, zero, ex };
}

const SEEDS = [11, 202, 5150, 31337];
const N = 25000;
console.log("=== ①②③ 전 격자 — 새 식 · 칸 합 · 옛 식 ===");
const base = measure(SRC, N, SEEDS);
console.log(`   측정 조건: 시드 ${SEEDS.join("/")} × ${N} = ${base.n}판 · 옛 세이브 모양(가중 카운터 없음) 30% · 명성 소수 50%`);
check(base.d1 === 0, `① 새 careerScore() === 옛 식 (어긋남 ${base.d1}/${base.n})${base.ex.length ? ` — ${base.ex[0]}` : ""}`);
check(base.d2 === 0, `② 보이는 칸의 합 === 옛 식 (어긋남 ${base.d2}/${base.n})`);
check(base.nonInt === 0 && base.zero === 0, `③ 칸은 전부 정수 · 0인 칸 없음 (소수 ${base.nonInt} · 0칸 ${base.zero})`);

console.log("=== 변이 검증 ===");
if (miss.length) {
  check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번 참고)");
} else {
  const m1 = measure(SRC.replace(MUT.M1[0], MUT.M1[1]), 4000, [11]);
  check(m1.d1 > 0 && m1.d2 > 0, `M1 🎗️ 주장 칸을 빼면 → ①② 빨간불 (새 식 어긋남 ${m1.d1} · 칸 합 어긋남 ${m1.d2} / ${m1.n})`);
  const m2 = measure(SRC.replace(MUT.M2[0], MUT.M2[1]), 4000, [11]);
  check(m2.d1 === 0 && m2.d2 > 0, `M2 나머지 나누기를 빼면 → ②만 빨간불 (새 식 어긋남 ${m2.d1} · 칸 합 어긋남 ${m2.d2} / ${m2.n})`);
}

console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
