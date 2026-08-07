/* 윙어의 드리블이 경기 성적(골·도움)에 반영되는지 본다.
 *
 * matchContribution은 골은 슛, 어시는 패스, 수비는 수비로만 굴렸다. 드리블은
 * 어디에도 안 들어갔다. 그런데 드리블은 윙어의 주 스탯이라, 윙어만 자기 주
 * 스탯에 투자할수록 성적이 나빠지는 구조적 결함이 있었다 (도달 가능 범위에서
 * 재보니 85% → 32%).
 *
 * 산식은 전부 소스에서 정규식으로 뽑는다 — 값을 옮겨 적으면 원본이 바뀌어도
 * 초록이 뜬다. 직접 eval(`const x = …`)은 쓰지 않는다. 선언이 eval 자기
 * 스코프에 갇혀서 바깥으로 새지 않고, 산식을 뭘로 바꾸든 undefined가 나와
 * 테스트가 통과해버린다. 그래서 new Function으로 감싸 return 한다.
 *
 * matchContribution은 clutch()와 마찬가지로 전역 S(pos·stats)를 읽는다.
 * 그래서 new Function은 S를 파라미터로 받고, 추출한 함수 선언들이 그 S를
 * 클로저로 잡도록 감싼 뒤 마지막에 matchContribution(rating)을 호출해 반환한다. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const grab = (src, re) => { const mm = src.match(re); return mm ? mm[0] : null; };

const parts = {
  poissonish: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  /* 🎖️ 시즌 칭호 — matchContribution·ratingOf·autoRes가 buffMul/buffSum을 봐요.
   * 같이 안 떼어 오면 ReferenceError로 죽습니다(조용히 통과하지는 않아요).
   * 이 검사들은 칭호가 없는 상태(S.buffs 없음)를 보니 배수는 전부 1이 나와요 —
   * 칭호가 붙었을 때의 동작은 tests/soccer/buff-test.js가 봅니다. */
  goalScale: grab(GAME, /const GOAL_SCALE = [^;]+;/),
  buffFns: grab(GAME, /const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/),
  matchContribution: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const contribFn = new Function("S", "rating", "clamp", `
  ${parts.poissonish}
  ${parts.goalScale}
  ${parts.buffFns}
  ${parts.matchContribution}
  return matchContribution(rating);
`);

// pos: 포지션, over: 오버라이드할 스탯(주 스탯 등)
function contribOnce(pos, over = {}, rating = 7) {
  const stats = { shoot: 60, pass: 60, dribble: 60, defense: 60, stamina: 60, ...over };
  const S = { pos, stats };
  return contribFn(S, rating, clamp);
}

// n회 반복해 g/a/def 합을 낸다
function sums(pos, over, n) {
  let g = 0, a = 0, def = 0;
  for (let i = 0; i < n; i++) {
    const c = contribOnce(pos, over);
    g += c.g; a += c.a; def += c.def;
  }
  return { g, a, def };
}

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// ① 윙어 — 드리블만 60 → 160으로 올리면 골+어시 합이 늘어야 한다 (지금은 결함으로 차이가 없다)
{
  const n = 5000;
  const lo = sums("wg", { dribble: 60 }, n);
  const hi = sums("wg", { dribble: 160 }, n);
  const loSum = lo.g + lo.a, hiSum = hi.g + hi.a;
  check(hiSum > loSum * 1.15,
    `윙어: 드리블 60→160일 때 골+어시 합이 늘어난다 (${n}회, ${loSum} → ${hiSum})`);
}

/* ② 다른 포지션은 드리블을 올려도 자기 축이 거의 안 변해야 한다.
 *
 * ⚠️ 문턱이 ±3%에서 ±8%로 넓어졌어요. 스탯 몰빵을 억제하려고
 * ratingOf가 5스탯 평균을 보고, matchContribution도 축마다 종합을 20%
 * 섞기 때문(AXIS_MIX)이에요. **어떤 스탯이든 모든 축을 조금씩 올립니다.**
 * 그게 의도예요 — 여기서 지키는 건 "드리블은 윙어에게만 주효하다"이지
 * "드리블이 다른 포지션에 0이다"가 아닙니다.
 * 실제로 윙어는 32% 오르고 나머지는 3% 안팎이라 구분이 뚜렷해요. */
{
  const n = 20000;
  const lo = sums("fw", { dribble: 60 }, n);
  const hi = sums("fw", { dribble: 160 }, n);
  const diff = Math.abs(hi.g - lo.g) / Math.max(1, lo.g);
  check(diff <= 0.08,
    `공격수: 드리블 60→160이어도 골이 ±8% 이내로 유지된다 (${n}회, ${lo.g} → ${hi.g}, 차이 ${(diff * 100).toFixed(1)}%)`);
}

// ③ 미드필더·수비수 — 드리블을 올려도 각자의 주력 산출이 안 변해야 한다
{
  const n = 20000;
  const loMf = sums("mf", { dribble: 60 }, n);
  const hiMf = sums("mf", { dribble: 160 }, n);
  const diffMf = Math.abs(hiMf.a - loMf.a) / Math.max(1, loMf.a);
  check(diffMf <= 0.08,
    `미드필더: 드리블 60→160이어도 어시가 ±8% 이내로 유지된다 (${n}회, ${loMf.a} → ${hiMf.a}, 차이 ${(diffMf * 100).toFixed(1)}%)`);

  const loDf = sums("df", { dribble: 60 }, n);
  const hiDf = sums("df", { dribble: 160 }, n);
  const diffDf = Math.abs(hiDf.def - loDf.def) / Math.max(1, loDf.def);
  check(diffDf <= 0.08,
    `수비수: 드리블 60→160이어도 수비가 ±8% 이내로 유지된다 (${n}회, ${loDf.def} → ${hiDf.def}, 차이 ${(diffDf * 100).toFixed(1)}%)`);
}

// ④ 윙어 — 슛만 올려도 골이 늘어야 한다 (드리블 반영이 슛을 밀어내지 않았다)
{
  const n = 20000;
  const lo = sums("wg", { shoot: 60 }, n);
  const hi = sums("wg", { shoot: 160 }, n);
  check(hi.g > lo.g * 1.15,
    `윙어: 슛 60→160이면 골이 늘어난다 (${n}회, ${lo.g} → ${hi.g})`);
}

// ⑤ 네 포지션 모두 — 자기 주 스탯을 올리면 각자의 주력 산출이 늘어난다
{
  const n = 20000;
  const cases = [
    { pos: "fw", stat: "shoot", pick: (c) => c.g, label: "공격수 골" },
    { pos: "mf", stat: "pass", pick: (c) => c.a, label: "미드필더 어시" },
    { pos: "df", stat: "defense", pick: (c) => c.def, label: "수비수 수비" },
    { pos: "wg", stat: "dribble", pick: (c) => c.g + c.a, label: "윙어 골+어시" },
  ];
  for (const { pos, stat, pick, label } of cases) {
    const lo = sums(pos, { [stat]: 60 }, n);
    const hi = sums(pos, { [stat]: 160 }, n);
    check(pick(hi) > pick(lo) * 1.1,
      `${label}: 주 스탯 60→160이면 늘어난다 (${n}회, ${pick(lo)} → ${pick(hi)})`);
  }
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
