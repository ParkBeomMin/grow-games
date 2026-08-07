/* 🏆 우승 상금 — 리그 우승·승격·컵 우승에 상금이 붙는가.
 *
 * 요청: "리그 우승, 컵 우승하면 보너스 상금 같은 게 있어야 할 것 같은데."
 *
 * 없었다. 리그 우승(사다리 꼭대기 1위)과 승격은 **트로피만** 남고 돈은 0이었다.
 * 컵 우승만 900만 정액이라 K리그3 컵과 프리미어리그 컵이 같은 값이었다.
 * 위로 갈수록 판이 커지는 게 이 게임의 사다리인데 상금만 그 축을 안 탔다.
 *
 * 지키는 것:
 *   ① 리그 우승·승격·컵 우승 모두 돈이 실제로 들어온다
 *   ② 리그 격이 곱해진다 — 위 리그일수록 크다 (단조 증가)
 *   ③ 승격 상금은 **떠나는 리그** 기준이다 (올라간 보상을 미리 당겨 받으면 안 된다)
 *   ④ 강등에는 우승 상금이 없다
 *   ⑤ 🇬🇧 수입 +35% 특색이 상금에도 붙는다 (다른 보상과 같은 규칙)
 *   ⑥ 시즌 기록에 남아서 결산을 다시 열어도 보인다
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
  title: grab(SRC, /const TITLE_PRIZE = [^;]+;/),
  promo: grab(SRC, /const PROMO_PRIZE = [^;]+;/),
  cup: grab(SRC, /const CUP_PRIZE = [^;]+;/),
  cupRound: grab(SRC, /const CUP_ROUND_PRIZE = [^;]+;/),
  prizeOf: grab(SRC, /const prizeOf = \(base, lgId\) => \{[\s\S]*?\n  \};/),
  apply: grab(SRC, /function applyPromotion\(\) \{[\s\S]*?\n  \}/),
  swap: grab(SRC, /function swapLeagues\(fromId, toId, kind\) \{[\s\S]*?\n  \}/),
  roster: grab(SRC, /const leagueRoster = \(id\) => clubsIn\(id, S\);/),
  tiers: grab(SRC, /const COUNTRY_TIERS = \{[\s\S]*?\n  \};/),
  ladderOf: grab(SRC, /const ladderOf = \(id\) => \{[\s\S]*?\n  \};/),
  gap: grab(SRC, /const PROMO_GAP = [^;]+;/),
  settle: grab(SRC, /const PROMO_SETTLE = [^;]+;/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  clubs: grab(GAME, /const CLUBS = \{[\s\S]*?\n\};/),
  clubsIn: grab(GAME, /function clubsIn\(id, st\) \{[\s\S]*?\n\}/),
  clubStrOf: grab(GAME, /function clubStrOf\(st\) \{[\s\S]*?\n\}/),
  trait: grab(GAME, /const COUNTRY_TRAIT = \{[\s\S]*?\n\};/),
  traitOf: grab(GAME, /function traitOf\(st\) \{[\s\S]*?\n\}/),
  traitMul: grab(GAME, /const traitMul = \(st, key\) => \{[\s\S]*?\n\};/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

const LEAGUES = new Function(`${parts.leagues} return LEAGUES;`)();
const byTier = LEAGUES.slice().sort((a, b) => a.tier - b.tier);
const NM = (id) => (LEAGUES.find((l) => l.id === id) || {}).name || `id ${id}`;

/* applyPromotion을 통째로 굴린다 — 상금이 S.money에 실제로 꽂히는지 본다. */
const run = new Function(
  "S", "rowsIn", "rankIn", "clamp",
  `${parts.leagues}
   ${parts.clubs}
   const leagueOf = (st) => LEAGUES.find((l) => l.id === ((st && st.league) || 1)) || LEAGUES[0];
   const tableReady = () => true;
   const tableRows = () => rowsIn;
   const myTableRank = () => rankIn;
   ${parts.tiers}
   ${parts.ladderOf}
   ${parts.title}\n${parts.promo}\n${parts.cup}\n${parts.cupRound}\n${parts.prizeOf}
   ${parts.gap}
   ${parts.settle}
   ${parts.clubsIn}
   ${parts.clubStrOf}
   ${parts.trait}\n${parts.traitOf}\n${parts.traitMul}
   ${parts.roster}
   const proLog = () => {};
   ${parts.swap}
   ${parts.apply}
   const move = applyPromotion();
   return { move, money: S.money || 0 };`
);
const state = (league) => ({
  league, proYear: 9, leagueSince: 0, group: "레알 몬테", clubStr: 70,
  trophies: [], money: 0, career: { years: [{ y: 8 }] },
});
const table = (gap) => [
  { name: "나", pts: 60 }, { name: "B", pts: 60 - gap },
  { name: "C", pts: 40 }, { name: "D", pts: 30 }, { name: "E", pts: 20 }, { name: "F", pts: 10 },
];

// ── ① 돈이 실제로 들어온다 · ② 리그 격이 실린다
const topOf = (country) => byTier.filter((l) => l.country === country).pop();
{
  // 리그 우승 — 각 나라 사다리 꼭대기에서 1위
  const titles = [];
  for (const c of [...new Set(byTier.map((l) => l.country))]) {
    const lg = topOf(c);
    const S = state(lg.id);
    S.group = "레알 몬테";
    const r = run(S, table(12), 1, clamp);
    if (!r.move || r.move.kind !== "title") continue;
    titles.push({ lg, prize: r.move.prize, money: r.money });
    check(r.money > 0 && r.money === r.move.prize,
      `${lg.name} 우승 — 상금 ${r.move.prize}만이 실제로 들어온다 (보유 ${r.money}만)`);
  }
  check(titles.length >= 3, `여러 나라의 리그 우승을 확인했다 (${titles.length}개)`);
  const sorted = titles.slice().sort((a, b) => a.lg.prestige - b.lg.prestige);
  console.log(`   리그 우승 상금 — ${sorted.map((t) => `${t.lg.short} ${t.prize}만`).join(" · ")}`);
  check(sorted.every((t, i) => i === 0 || t.prize > sorted[i - 1].prize),
    "리그 격이 높을수록 우승 상금이 크다");
}

// ── ①②③ 승격
{
  const ups = [];
  for (const lg of byTier) {
    const S = state(lg.id);
    const r = run(S, table(12), 1, clamp);
    if (!r.move || r.move.kind !== "up") continue;
    ups.push({ from: lg, prize: r.move.prize, money: r.money });
    check(r.money === r.move.prize && r.money > 0,
      `${lg.name} → ${r.move.to} 승격 — 상금 ${r.move.prize}만이 들어온다`);
  }
  console.log(`   승격 상금 — ${ups.map((u) => `${u.from.short} ${u.prize}만`).join(" · ")}`);
  check(ups.length >= 3, `여러 리그의 승격을 확인했다 (${ups.length}개)`);
  // ③ 떠나는 리그 기준 — 도착 리그 기준이면 값이 더 컸을 것이다
  const base = new Function(`${parts.promo} return PROMO_PRIZE;`)();
  const prizeOf = new Function("LEAGUES", `${parts.prizeOf} return prizeOf;`)(LEAGUES);
  /* 나라 특색(🇬🇧 수입 +35%)이 함께 곱해져요 — 다른 보상과 같은 규칙이라 그대로 두고,
   * 여기서는 **어느 리그 기준인지**만 봅니다. */
  const TRAITS = new Function(`${parts.trait} return COUNTRY_TRAIT;`)();
  for (const u of ups) {
    const mul = (TRAITS[u.from.country] || {}).money || 1;
    check(u.prize === Math.round(Math.round(prizeOf(base, u.from.id)) * mul),
      `${u.from.short} 승격 상금이 **떠나는 리그** 기준이다 (${u.prize}만${mul !== 1 ? ` · 수입 ×${mul} 포함` : ""})`);
  }
}

// ── ④ 강등에는 우승 상금이 없다
{
  const lg = byTier[byTier.length - 1];
  const S = state(lg.id);
  const r = run(S, table(0), 6, clamp);
  check(r.move && r.move.kind === "down", `강등이 일어난다 (${r.move ? r.move.kind : "안 일어남"})`);
  check(r.money === 0 && !r.move.prize, `강등에는 상금이 없다 (${r.money}만)`);
}

// ── ⑤ 🇬🇧 수입 특색이 상금에도 붙는다
{
  const TRAIT = new Function(`${parts.trait} return COUNTRY_TRAIT;`)();
  const moneyCountry = Object.keys(TRAIT).find((c) => TRAIT[c].money);
  check(!!moneyCountry, `수입 특색이 있는 나라가 있다 (${moneyCountry})`);
  const lg = topOf(moneyCountry);
  const mul = TRAIT[moneyCountry].money;
  const S = state(lg.id);
  const r = run(S, table(12), 1, clamp);
  const prizeOf = new Function("LEAGUES", `${parts.prizeOf} return prizeOf;`)(LEAGUES);
  const baseTitle = new Function(`${parts.title} return TITLE_PRIZE;`)();
  const plain = Math.round(prizeOf(baseTitle, lg.id));
  console.log(`   ${lg.name}(${moneyCountry}, 수입 ×${mul}) 우승 — ${r.move.prize}만 (특색 없으면 ${plain}만)`);
  check(r.move.prize === Math.round(plain * mul),
    `수입 특색 ×${mul}가 우승 상금에도 붙는다 (${r.move.prize}만)`);
}

// ── ⑥ 시즌 기록에 남는다 · 결산 화면에 뜬다
check(/prize: move && move\.prize \? move\.prize : 0/.test(SRC),
  "시즌 기록에 상금이 남는다 — 결산을 다시 열어도 보여요");
check(/💰 우승 상금 \+\$\{y\.prize\}만/.test(SRC), "결산 화면이 그 값을 그린다");

// ── 컵 상금도 리그 격을 탄다
{
  const cupLine = grab(SRC, /const money = Math\.round\(prizeOf\(CUP_PRIZE, S\.league\) \* traitMul\(S, "money"\)\);/);
  check(!!cupLine, "컵 우승 상금이 리그 격과 수입 특색을 본다");
  const roundLine = grab(SRC, /const money = Math\.round\(prizeOf\(CUP_ROUND_PRIZE \* \(S\.cup\.round \+ 1\)[^;]+;/);
  check(!!roundLine, "컵 라운드 수당도 리그 격을 본다");
  const prizeOf = new Function("LEAGUES", `${parts.prizeOf} return prizeOf;`)(LEAGUES);
  const baseCup = new Function(`${parts.cup} return CUP_PRIZE;`)();
  const lo = prizeOf(baseCup, byTier[0].id), hi = prizeOf(baseCup, byTier[byTier.length - 1].id);
  console.log(`   컵 우승 상금 — ${byTier[0].short} ${lo}만 · ${byTier[byTier.length - 1].short} ${hi}만`);
  check(hi > lo * 2, `최상위 컵이 최하위 컵보다 두 배 넘게 크다 (${lo} → ${hi})`);
}

/* ── 변이 검증 — 리그 격을 곱하지 않으면 ②가 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
{
  const flat = parts.prizeOf.replace("base * (lg ? lg.prestige : 1)", "base");
  if (flat === parts.prizeOf) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
  const fn = new Function("LEAGUES", `${flat} return prizeOf;`)(LEAGUES);
  const base = new Function(`${parts.title} return TITLE_PRIZE;`)();
  check(fn(base, byTier[0].id) === fn(base, byTier[byTier.length - 1].id),
    "변이 검증 — 리그 격을 빼면 K리그3 우승과 프리미어리그 우승이 같은 값이 된다");
}

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
