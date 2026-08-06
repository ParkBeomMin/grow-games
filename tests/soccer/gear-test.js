/* 🛍️ 장비 효과가 각성·초월 뒤에도 남는지 본다.
 *
 * 제보: "장비를 사면 장비 효과는 계속 있는 거지? 각성 실패하면 스탯 줄어들잖아,
 *        그때도 장비 효과는 있는 거지?"
 *
 * 없었다. 장비는 살 때 `S.stats[key] += bonus` 한 번이 전부고, 따로 저장되는
 * '효과 층'이 없다. 그런데 각성·초월은 `S.stats[key] = randInt(30, 60)`으로
 * **덮어쓴다.** 장비로 올린 몫이 같이 사라지는데 S.gear에는 소유 기록이 남아
 * 다시 살 수도 없었다 — 돈만 날린 셈이다.
 * 한 칸을 풀장비(3+5+8+12+16)로 채웠으면 각성 한 번에 44가 증발한다.
 * 각성은 반복하는 엔드게임이라 할수록 손해가 쌓인다.
 *
 * 지키는 것:
 *   ① 장비 총합을 소유 기록에서 정확히 되읽는다
 *   ② 각성·초월로 수치를 되돌릴 때 장비 몫이 얹힌다 (성공·실패 모두)
 *   ③ 그래도 상한은 안 넘는다
 *   ④ 장비가 없으면 예전과 똑같다 (없던 보너스가 생기지 않는다)
 *   ⑤ 각성·초월 다섯 갈래 **전부** 이 경로를 탄다 — 하나만 빠뜨려도 그 길로 증발한다
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 실행한다. 직접 eval은 쓰지 않는다.
 */
"use strict";
const fs = require("fs");
const GAME = fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8");
const grab = (re) => { const m = GAME.match(re); return m ? m[0] : null; };

const parts = {
  tiers: grab(/const GEAR_TIERS = \[[\s\S]*?\n\];/),
  bonus: grab(/function gearBonus\(key\) \{[\s\S]*?\n\}/),
  reset: grab(/const resetStat = \(key, lo, hi\) =>[^;]+;/),
  statCap: grab(/const statCap = [^;]+;/),
  transLv: grab(/const transLv = [^;]+;/),
  statBase: grab(/const STAT_CAP = [^;]+;/),
  transStep: grab(/const TRANS_CAP_STEP = [^;]+;/),
  awaken: grab(/function awakenTalent\(key, logFn\) \{[\s\S]*?\n\}/),
  transcend: grab(/function transcend\(key, d, v, logFn\) \{[\s\S]*?\n\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

const TIERS = new Function(`${parts.tiers} return GEAR_TIERS;`)();
const FULL = TIERS.reduce((a, t) => a + t.bonus, 0);

/* 소스의 gearBonus·resetStat을 그대로 굴린다. S는 인자로 넘겨 클로저로 잡게 한다. */
const mk = (S) => new Function(
  "S", "clamp", "randInt",
  `${parts.tiers}
   ${parts.statBase}
   ${parts.transStep}
   ${parts.transLv}
   ${parts.statCap}
   ${parts.bonus}
   ${parts.reset}
   return { gearBonus, resetStat };`
)(S, clamp, randInt);

const gearOf = (key, tiers) => {
  const g = {};
  for (const t of TIERS.slice(0, tiers)) g[`${key}-${t.n}`] = true;
  return g;
};

// ── ① 장비 총합을 소유 기록에서 되읽는다
{
  const api = mk({ gear: gearOf("shoot", TIERS.length), trans: {} });
  check(api.gearBonus("shoot") === FULL,
    `풀장비 슛의 보너스가 ${FULL}이다 (${TIERS.map((t) => t.bonus).join("+")} · 실제 ${api.gearBonus("shoot")})`);
  check(api.gearBonus("pass") === 0, `안 산 칸은 0이다 (${api.gearBonus("pass")})`);
  const half = mk({ gear: gearOf("shoot", 2), trans: {} });
  check(half.gearBonus("shoot") === TIERS[0].bonus + TIERS[1].bonus,
    `2티어까지만 샀으면 그만큼만이다 (${half.gearBonus("shoot")})`);
  check(mk({ trans: {} }).gearBonus("shoot") === 0, "옛 세이브(S.gear 없음)에서도 안 죽는다");
}

// ── ②③ 되돌릴 때 장비 몫이 얹히고, 상한은 안 넘는다
{
  const S = { gear: gearOf("shoot", TIERS.length), trans: {} };
  const api = mk(S);
  const cap = new Function("S", `${parts.statBase} ${parts.transStep} ${parts.transLv} ${parts.statCap} return statCap("shoot");`)(S);
  let lo = 999, hi = -1;
  for (let i = 0; i < 20000; i++) { const v = api.resetStat("shoot", 30, 50); if (v < lo) lo = v; if (v > hi) hi = v; }
  console.log(`   풀장비(+${FULL}) 각성 실패 뒤 수치 — ${lo} ~ ${hi} (장비 없으면 30~50 · 상한 ${cap})`);
  check(lo >= 30 + FULL, `바닥이 장비만큼 올라간다 (${lo} ≥ ${30 + FULL})`);
  check(hi <= cap, `상한(${cap})은 안 넘는다 (${hi})`);

  // 성공 갈래(45~60)도 같은 경로다
  let lo2 = 999;
  for (let i = 0; i < 20000; i++) { const v = api.resetStat("shoot", 45, 60); if (v < lo2) lo2 = v; }
  check(lo2 >= 45 + FULL, `각성 성공 갈래도 장비가 얹힌다 (${lo2} ≥ ${45 + FULL})`);
}

// ── ④ 장비가 없으면 예전과 똑같다
{
  const api = mk({ trans: {} });
  let lo = 999, hi = -1;
  for (let i = 0; i < 20000; i++) { const v = api.resetStat("shoot", 30, 50); if (v < lo) lo = v; if (v > hi) hi = v; }
  check(lo === 30 && hi === 50, `장비가 없으면 30~50 그대로다 (${lo}~${hi}) — 없던 보너스가 생기지 않는다`);
}

// ── ⑤ 다섯 갈래가 전부 resetStat을 탄다
{
  const both = `${parts.awaken}\n${parts.transcend}`;
  const rawResets = (both.match(/S\.stats\[key\] = randInt\(/g) || []).length;
  const viaReset = (both.match(/S\.stats\[key\] = resetStat\(/g) || []).length;
  console.log(`   각성·초월의 수치 초기화 — resetStat ${viaReset}곳 · 날것 randInt ${rawResets}곳`);
  check(rawResets === 0,
    "각성·초월 어디에도 randInt로 직접 덮어쓰는 자리가 없다 — 한 곳만 빠져도 그 길로 장비가 증발해요");
  check(viaReset === 5,
    `다섯 갈래(각성 성공·실패2·초월 성공·실패)가 모두 resetStat을 탄다 (${viaReset}곳)`);
}

/* ── 변이 검증 — 장비 항을 빼면 ②가 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
{
  const broken = parts.reset.replace("randInt(lo, hi) + gearBonus(key)", "randInt(lo, hi)");
  if (broken === parts.reset) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
  const api = new Function(
    "S", "clamp", "randInt",
    `${parts.tiers}\n${parts.statBase}\n${parts.transStep}\n${parts.transLv}\n${parts.statCap}\n`
    + `${parts.bonus}\n${broken}\n return resetStat;`
  )({ gear: gearOf("shoot", TIERS.length), trans: {} }, clamp, randInt);
  let lo = 999;
  for (let i = 0; i < 20000; i++) { const v = api("shoot", 30, 50); if (v < lo) lo = v; }
  check(lo < 30 + FULL,
    `변이 검증 — 장비 항을 빼면 바닥이 ${lo}로 돌아간다 (풀장비인데 ${FULL}이 증발)`);
}

/* 안내 문구 — 각성 창에 장비가 남는다고 적혀 있어야 해요.
 * "사라진다"고 믿고 각성을 피하면 콘텐츠가 통째로 죽어요. */
check(/🛍️ 장비 \+\$\{gearBonus\(key\)\}는 그대로 남아요/.test(GAME),
  "각성·초월 확인 창이 장비가 남는다고 알려준다");
check(/atCap\(d\.key\)/.test(GAME) && /이미 상한/.test(GAME),
  "상한에서 장비를 사면 지금은 수치가 안 오른다고 미리 알려준다 (돈만 나가는 걸 조용히 두지 않아요)");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
