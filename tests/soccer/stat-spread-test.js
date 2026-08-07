/* 스탯을 한두 칸에 몰빵하는 게 언제나 정답이 되지 않는지 본다.
 *
 * 제보: "1,2개 스텟만 몰빵해서 올려도 경기결과가 잘 나오는 것 같아."
 * 총 스탯을 400으로 고정하고 재 보니 그대로였다.
 *
 *   예전 — 공격수 400을 전부 슛에:  시즌 188골 · 도움 32 · 수비 26
 *          고르게 80씩 나누면:        51골 · 도움 26 · 수비 22
 *   → 몰빵이 **모든 축에서** 이겼다. 도움도 수비도 더 잘했다.
 *
 * 원인은 두 겹이었다.
 *   ① ratingOf(경기력)에 주 스탯이 0.32로 실려 있었다. 이 값은 골·도움·수비
 *      **셋 다에 곱해지므로**, 슛만 올려도 수비 성공까지 같이 늘었다.
 *   ② 수비 스탯은 ratingOf에 아예 없었다 — 공격수에게 수비 투자는 가치가 0.
 *
 * 지키는 것:
 *   ① 경기력의 뼈대는 종합(5스탯 평균)이다 — 한 칸이 셋 다를 들어올리면 안 된다
 *   ② 어느 스탯이든 경기력에 닿는다 (수비 스탯이 죽은 칸이 아니다)
 *   ③ 약점이 있으면 깎인다 — 한 칸만 키우는 게 공짜가 아니다
 *   ④ 그래도 전문화는 자기 축에서 보상받는다 (특화를 죽이면 육성이 무의미해진다)
 *   ⑤ 몰빵은 자기 축 밖(도움·수비)에서 균형 배분에 밀린다
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
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  leagueOf: grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  fanCap: grab(SRC, /const FAN_CAP = [^;]+;/),
  ratingDiv: grab(SRC, /const RATING_DIV = [^;]+;/),
  ratingOf: grab(SRC, /function ratingOf\(stats, pos, condition, fandom\) \{[\s\S]*?\n {2}\}/),
  /* 🎖️ 시즌 칭호 — matchContribution·ratingOf·autoRes가 buffMul/buffSum을 봐요.
   * 같이 안 떼어 오면 ReferenceError로 죽습니다(조용히 통과하지는 않아요).
   * 이 검사들은 칭호가 없는 상태(S.buffs 없음)를 보니 배수는 전부 1이 나와요 —
   * 칭호가 붙었을 때의 동작은 tests/soccer/buff-test.js가 봅니다. */
  buffFns: grab(GAME, /const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/),
  contrib: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  poisson: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

const mkEngine = (ratingSrc) => new Function(
  "S", "clamp", "rand",
  `${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
   ${parts.leagues} ${parts.leagueOf}
   ${parts.fanCap} ${parts.ratingDiv}
   ${parts.buffFns}
   ${ratingSrc}
   ${parts.poisson}
   ${parts.contrib}
   return { ratingOf, matchContribution };`
);
const engine = mkEngine(parts.ratingOf);

const TALENTS = { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 };
const mkS = (stats, pos) => ({ stats, pos, talents: TALENTS, condition: 80, fandom: 0, transcend: {} });

/* 총 스탯 400을 고정하고 한 시즌(38경기)을 굴린다. */
const GAMES = 38, N = 300;
function season(stats, pos, eng) {
  const S = mkS(stats, pos);
  const api = eng(S, clamp, rand);
  let g = 0, a = 0, d = 0;
  for (let i = 0; i < GAMES; i++) {
    const c = api.matchContribution(api.ratingOf(stats, pos, S.condition, S.fandom));
    g += c.g; a += c.a; d += c.def;
  }
  return { g, a, d };
}
const avgSeason = (stats, pos, eng = engine) => {
  let g = 0, a = 0, d = 0;
  for (let i = 0; i < N; i++) { const s = season(stats, pos, eng); g += s.g; a += s.a; d += s.d; }
  return { g: g / N, a: a / N, d: d / N };
};

const BUDGET = 400;
const KEYS = ["shoot", "pass", "dribble", "defense", "stamina"];
const MAIN = { fw: "shoot", mf: "pass", df: "defense", wg: "dribble" };
const flat = () => { const o = {}; for (const k of KEYS) o[k] = BUDGET / KEYS.length; return o; };
const dump = (pos) => {
  const o = {}; for (const k of KEYS) o[k] = 40;
  o[MAIN[pos]] = BUDGET - 40 * (KEYS.length - 1);
  return o;
};

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ② 어느 스탯이든 경기력에 닿는다 (수비 스탯이 죽은 칸이 아니다)
const api = engine(mkS(flat(), "fw"), clamp, rand);
const rateAvg = (stats, pos) => {
  let s = 0;
  for (let i = 0; i < 20000; i++) s += api.ratingOf(stats, pos, 80, 0);
  return s / 20000;
};
const baseStats = () => ({ shoot: 80, pass: 80, dribble: 80, defense: 80, stamina: 80 });
for (const k of KEYS) {
  const up = baseStats(); up[k] = 140;
  const lo = rateAvg(baseStats(), "fw"), hi = rateAvg(up, "fw");
  check(hi - lo > 0.15,
    `공격수도 ${k}를 올리면 경기력이 오른다 (${lo.toFixed(2)} → ${hi.toFixed(2)}) — 예전엔 수비가 정확히 0이었어요`);
}

// ── ③ 약점이 있으면 깎인다
const even = baseStats();
const holed = { shoot: 130, pass: 80, dribble: 80, defense: 30, stamina: 80 };  // 총합 동일
const evenR = rateAvg(even, "fw"), holedR = rateAvg(holed, "fw");
console.log(`   총합 400 — 고르게 ${evenR.toFixed(2)} · 슛에 몰고 수비를 비우면 ${holedR.toFixed(2)}`);
check(holedR < evenR,
  `약점을 만들면 경기력이 오히려 떨어진다 (${holedR.toFixed(2)} < ${evenR.toFixed(2)})`);

// ── ①④⑤ 시즌 성적으로 확인
for (const pos of ["fw", "mf", "df"]) {
  const D = avgSeason(dump(pos), pos), F = avgSeason(flat(), pos);
  const axis = { fw: "g", mf: "a", df: "d" }[pos];
  const off = pos === "df" ? "g" : "d";   // 자기 축이 아닌 곳
  console.log(`   ${pos} — 몰빵 ⚽${D.g.toFixed(0)} 🅰️${D.a.toFixed(0)} 🛡️${D.d.toFixed(0)}`
    + ` · 균형 ⚽${F.g.toFixed(0)} 🅰️${F.a.toFixed(0)} 🛡️${F.d.toFixed(0)}`);
  // ④ 전문화는 자기 축에서 보상받는다
  check(D[axis] > F[axis] * 1.3,
    `${pos}: 몰빵이 자기 축에서는 확실히 앞선다 (${D[axis].toFixed(0)} vs ${F[axis].toFixed(0)}) — 특화를 죽이면 육성이 무의미해져요`);
  // ⑤ 자기 축 밖에서는 균형에 밀린다 — 예전에는 여기서도 몰빵이 이겼어요
  check(F[off] >= D[off],
    `${pos}: 자기 축 밖(${off})은 균형 배분이 앞선다 (${F[off].toFixed(0)} ≥ ${D[off].toFixed(0)})`);
}

/* ── 변이 검증 — 옛 산식(주 스탯 0.32 · 체력 0.22 · 공격3종 0.20)으로 되돌리면
 * ⑤가 무너져야 한다. 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const OLD = `function ratingOf(stats, pos, condition, fandom) {
  const myScore =
    (stats[POS_INFO[pos].stat] * 0.32 +
    stats.stamina * 0.22 +
    ((stats.shoot + stats.pass + stats.dribble) / 3) * 0.2) * clutch(POS_INFO[pos].stat) +
    condition / 8 + Math.min((fandom || 0) / 45, FAN_CAP) + rand(-5, 5) + 20;
  return clamp(myScore / RATING_DIV - leagueOf(S).penalty, 1, 10);
}`;
const oldEngine = mkEngine(OLD);
const oldD = avgSeason(dump("fw"), "fw", oldEngine), oldF = avgSeason(flat(), "fw", oldEngine);
console.log(`   변이(옛 산식) fw — 몰빵 🛡️${oldD.d.toFixed(0)} vs 균형 🛡️${oldF.d.toFixed(0)}`);
check(oldD.d > oldF.d,
  `변이 검증 — 옛 산식에서는 슛만 올린 선수가 수비까지 더 잘했다 (${oldD.d.toFixed(0)} > ${oldF.d.toFixed(0)})`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
