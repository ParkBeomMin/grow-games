/* 🎒 이적 적응 — 새 팀에 가면 낮은 확률로 하나 배우는가.
 *
 * 요청: "이적할 때 낮은 확률로 스탯 올려주는 건 어때?"
 *
 * 그냥 공짜 보너스로 두면 **"이적은 무조건 이득"**이 돼서 지금의 도박 구조가
 * 흐려진다(위 리그는 평점 페널티를 안고 가는 선택이다). 그래서 둘로 묶었다.
 *   ① 확률은 얼마나 높이 올라갔나를 본다 — 같은 리그는 낮고, 위로 갈수록 커진다
 *   ② 오르는 칸은 가는 나라가 잘 가르치는 것이다 (🇧🇷 드리블 · 🇮🇹 수비)
 *
 * 지키는 것:
 *   ① 위로 갈수록 확률이 오르고, 내려가면 바닥이다
 *   ② "낮은 확률"이다 — 실제로 일어나는 이적(1~3티어)에서 절반을 안 넘는다
 *   ③ 나라 특색이 있는 리그는 그 칸이 오른다
 *   ④ 상한에 닿은 칸은 안 고른다 ("배웠는데 숫자가 그대로"를 막는다)
 *   ⑤ 크기가 한 시즌 훈련을 대신할 정도는 아니다
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 실행한다. 직접 eval은 쓰지 않는다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  base: grab(SRC, /const MOVE_LEARN_BASE = [^;]+;/),
  step: grab(SRC, /const MOVE_LEARN_STEP = [^;]+;/),
  max: grab(SRC, /const MOVE_LEARN_MAX = [^;]+;/),
  pFn: grab(SRC, /function moveLearnP\(fromLg, toLg\) \{[\s\S]*?\n  \}/),
  keyFn: grab(SRC, /function moveLearnKey\(league\) \{[\s\S]*?\n  \}/),
  learnFn: grab(SRC, /function moveLearn\(fromLg, league\) \{[\s\S]*?\n  \}/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  trait: grab(GAME, /const COUNTRY_TRAIT = \{[\s\S]*?\n\};/),
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  statDefs: grab(GAME, /const STAT_DEFS = \[[\s\S]*?\n\];/),
  statCap: grab(GAME, /const statCap = [^;]+;/),
  atCap: grab(GAME, /const atCap = [^;]+;/),
  statBase: grab(GAME, /const STAT_CAP = [^;]+;/),
  transStep: grab(GAME, /const TRANS_CAP_STEP = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

const LEAGUES = new Function(`${parts.leagues} return LEAGUES;`)();
const byTier = LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const nameOf = (id) => (LEAGUES.find((l) => l.id === id) || {}).short || `id ${id}`;

const probFn = new Function("LEAGUES", "clamp",
  `${parts.base}\n${parts.step}\n${parts.max}\n${parts.pFn}\n return moveLearnP;`)(LEAGUES, clamp);

// ── ① 위로 갈수록 오르고, 내려가면 바닥이다
{
  const from = byTier[2];
  const ups = [1, 2, 3, 4].map((n) => probFn(from.id, byTier[2 + n].id));
  console.log(`   ${from.short}에서 한/두/세/네 칸 올라갈 때 — ${ups.map((p) => `${Math.round(p * 100)}%`).join(" · ")}`);
  check(ups.every((v, i) => i === 0 || v > ups[i - 1]), "높이 올라갈수록 배울 확률이 커진다");
  const down = probFn(from.id, byTier[0].id), same = probFn(from.id, from.id);
  console.log(`   같은 리그 ${Math.round(same * 100)}% · 두 칸 내려갈 때 ${Math.round(down * 100)}%`);
  check(down < same, `내려가면 같은 리그보다도 낮다 (${Math.round(down * 100)}% < ${Math.round(same * 100)}%)`);
  check(same < ups[0], "같은 리그 이적보다 승격 이적이 더 배운다");
}

// ── ② "낮은 확률"이다 — 실제로 일어나는 이적에서 절반을 안 넘는다
{
  const real = [];
  for (let i = 0; i < byTier.length; i++) {
    for (let n = 1; n <= 3 && i + n < byTier.length; n++) real.push(probFn(byTier[i].id, byTier[i + n].id));
  }
  const worst = Math.max(...real);
  check(worst < 0.5, `1~3티어 상승 이적의 확률이 전부 50% 미만이다 (최대 ${Math.round(worst * 100)}%)`);
  const cap = new Function(`${parts.max} return MOVE_LEARN_MAX;`)();
  check(probFn(byTier[0].id, byTier[byTier.length - 1].id) <= cap + 1e-9,
    `최하위 → 최상위 점프도 상한(${Math.round(cap * 100)}%)을 안 넘는다`);
}

/* ③④⑤ 실제로 굴려 본다. S는 인자로 넘겨 떼어 온 조각들이 그 S를 보게 한다. */
const mkLearn = (S) => new Function(
  "S", "clamp", "rand", "LEAGUES",
  `${parts.trait}
   ${parts.posInfo}
   ${parts.statDefs}
   ${parts.statBase}
   ${parts.transStep}
   ${parts.transLv}
   ${parts.statCap}
   ${parts.atCap}
   ${parts.base}\n${parts.step}\n${parts.max}
   ${parts.pFn}
   ${parts.keyFn}
   ${parts.learnFn}
   return { moveLearn, moveLearnKey };`
)(S, clamp, rand, LEAGUES);

const mkS = (over = {}) => ({
  pos: "fw",
  stats: { shoot: 60, pass: 60, dribble: 60, defense: 60, stamina: 60 },
  talents: { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 },
  trans: {}, league: byTier[2].id, ...over,
});

// ── ③ 나라 특색이 있는 리그는 그 칸이 오른다
{
  const TRAIT = new Function(`${parts.trait} return COUNTRY_TRAIT;`)();
  const focused = Object.entries(TRAIT).filter(([, t]) => t.focus);
  check(focused.length >= 2, `특색 칸이 있는 나라가 둘 이상이다 (${focused.map(([c, t]) => `${c}:${t.focus}`).join(" · ")})`);
  for (const [country, t] of focused) {
    const lg = byTier.filter((l) => l.country === country).pop();
    const S = mkS();
    const api = mkLearn(S);
    check(api.moveLearnKey(lg) === t.focus,
      `${lg.name}(${country})으로 가면 ${t.focus}를 배운다 (${api.moveLearnKey(lg)})`);
  }
  // 특색이 없는 나라는 내 포지션 주 스탯
  const plain = byTier.find((l) => !(TRAIT[l.country] || {}).focus);
  const POS_INFO = new Function(`${parts.posInfo} return POS_INFO;`)();
  for (const pos of ["fw", "mf", "df"]) {
    const api = mkLearn(mkS({ pos }));
    check(api.moveLearnKey(plain) === POS_INFO[pos].stat,
      `${plain.name}처럼 특색이 없으면 ${pos}의 주 스탯(${POS_INFO[pos].stat})을 배운다 (${api.moveLearnKey(plain)})`);
  }
}

// ── ④ 상한에 닿은 칸은 안 고른다
{
  const cap = new Function("S", `${parts.statBase} ${parts.transStep} ${parts.transLv} ${parts.statCap} return statCap("shoot");`)(mkS());
  const S = mkS({ stats: { shoot: cap, pass: 60, dribble: 60, defense: 60, stamina: 60 } });
  const api = mkLearn(S);
  const plainLg = byTier.find((l) => !(new Function(`${parts.trait} return COUNTRY_TRAIT;`)()[l.country] || {}).focus);
  check(api.moveLearnKey(plainLg) === null,
    `주 스탯이 상한(${cap})이면 아무것도 안 배운다 — "배웠는데 숫자가 그대로"를 막아요`);
  let moved = false;
  for (let i = 0; i < 3000; i++) if (api.moveLearn(byTier[0].id, plainLg)) moved = true;
  check(!moved, "상한이면 3000번 굴려도 문구가 안 뜬다");
}

// ── ⑤ 크기 — 한 번 배울 때, 그리고 커리어 전체 기댓값
{
  const dest = byTier[3];
  const S = mkS();
  const api = mkLearn(S);
  let hits = 0, total = 0, lo = 99, hi = 0;
  const N = 40000;
  for (let i = 0; i < N; i++) {
    S.stats.shoot = 60; S.stats.dribble = 60; S.stats.defense = 60;
    const before = { ...S.stats };
    const msg = api.moveLearn(byTier[2].id, dest);
    if (!msg) continue;
    hits++;
    const key = Object.keys(S.stats).find((k) => S.stats[k] !== before[k]);
    const gain = S.stats[key] - before[key];
    total += gain; if (gain < lo) lo = gain; if (gain > hi) hi = gain;
  }
  const rate = hits / N, avg = total / hits;
  console.log(`   한 칸 올라가는 이적 — ${(rate * 100).toFixed(1)}%로 배우고, 배우면 +${lo.toFixed(1)}~${hi.toFixed(1)} (평균 +${avg.toFixed(2)})`);
  check(hits > 0, "실제로 배우는 판이 나온다");
  check(lo >= 1 && hi <= 6, `한 번에 오르는 폭이 1~6 안이다 (${lo.toFixed(1)}~${hi.toFixed(1)})`);
  /* 이적 열 번을 갈아타도 한 시즌 실전 성장(≈5p) 언저리여야 해요.
   * 이걸 넘으면 "훈련 대신 이적을 반복한다"가 최적 전략이 됩니다. */
  const tenMoves = rate * avg * 10;
  console.log(`   이적 10회 기댓값 ${tenMoves.toFixed(1)}p (참고: 한 시즌 실전 성장 ≈ 5p)`);
  check(tenMoves < 9, `이적을 반복해도 훈련을 대신하지 못한다 (10회 ${tenMoves.toFixed(1)}p)`);
}

// ── 배선 — 이적이 실제로 이 함수를 부르고, 결과를 화면에 남긴다
check(/const learned = moveLearn\(prevLeague, league\);/.test(SRC),
  "moveToClub이 이적 직후 적응을 굴린다");
check(/moveNote = moveToClub\(o\.club, o\.league, o\.fee\)/.test(SRC),
  "이적 수락이 그 결과를 받아 둔다");
check(/\$\{moveNote \? `<div class="hint learn">\$\{moveNote\}<\/div>` : ""\}/.test(SRC),
  "결산 화면에 한 줄로 뜬다 — 프로 로그에만 남기면 넘어가는 순간 안 보여요");
check(/moveNote = null;\s*\/\/ 한 번만/.test(SRC), "그 줄은 한 번만 보여주고 지운다");

/* ── 변이 검증 — 티어 항을 빼면 ①이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
{
  const broken = parts.pFn.replace("(b.tier - a.tier) * MOVE_LEARN_STEP", "0");
  if (broken === parts.pFn) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
  const fn = new Function("LEAGUES", "clamp",
    `${parts.base}\n${parts.step}\n${parts.max}\n${broken}\n return moveLearnP;`)(LEAGUES, clamp);
  check(fn(byTier[2].id, byTier[6].id) === fn(byTier[2].id, byTier[0].id),
    "변이 검증 — 티어 항을 빼면 올라가든 내려가든 확률이 같아진다");
}

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
