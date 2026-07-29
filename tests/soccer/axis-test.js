/* 연말 평가(hype)가 '순위'가 아니라 '포지션별 축'에서 나오는지 본다.
 *
 * 예전 산식은 `clamp(act.hypeSum / 2.2 - agePen, -1.5, 12)`였다. hypeSum은 경기마다
 * 상대 4명과의 평점 순위로 쌓이는 값이라 1위를 하는 순간 천장에 붙는다. 능력치를 더
 * 올려도 순위는 이미 1위라 연말 평가가 그대로였다 — 축구의 성장 곡선이 여기서 멈췄다.
 * 골·도움·수비 성공은 이미 시즌·통산 모두 집계되고 있었는데 평가에 안 쓰였다.
 *
 * 산식은 전부 소스에서 정규식으로 뽑는다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
 * 직접 eval(`const x = …`)은 쓰지 않는다. 선언이 eval 자기 스코프에 갇혀서 바깥으로
 * 새지 않고, 산식을 뭘로 바꾸든 undefined가 나와 테스트가 통과해버린다.
 * 그래서 new Function으로 감싸 return 한다.
 *
 * ⑧⑨는 시즌 한 해를 통째로 굴린다. 평점(career.js) → 경기 기여(game.js) → 축 → hype
 * 까지가 한 사슬이라, 중간 어디가 끊겨도 여기서 잡힌다. 시즌 길이(12경기)도 소스에서
 * 뽑은 CB_PER_YEAR × WEEKS_PER_CB를 쓴다. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const grab = (src, re) => { const mm = src.match(re); return mm ? mm[0] : null; };

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const parts = {
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  poissonish: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  matchContribution: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  fanCap: grab(SRC, /const FAN_CAP = [^;]+;/),
  ratingDiv: grab(SRC, /const RATING_DIV = [^;]+;/),
  myScore: grab(SRC, /const myScore =[\s\S]*?;\n/),
  rating: grab(SRC, /const rating = clamp\(myScore[^;]+;/),
  cbPerYear: grab(SRC, /const CB_PER_YEAR = [^;]+;/),
  weeksPerCb: grab(SRC, /const WEEKS_PER_CB = [^;]+;/),
  agePen: grab(SRC, /const agePen = [^;]+;/),
  hype: grab(SRC, /const hype = clamp\([^;]+;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

/* 축 관련 상수·함수는 '있으면 넣는다'. 고치기 전에는 소스에 없는 이름이라 필수로 걸면
 * 테스트가 아예 못 돌아 빨간불의 내용을 볼 수 없다. 없으면 해당 검사만 실패시킨다.
 * 값은 절대 여기 옮겨 적지 않는다 — 소스에 적힌 그대로 실행한다. */
const axisParts = {
  POS_AXIS: grab(SRC, /const POS_AXIS = \{[\s\S]*?\n {2}\};/),
  AXIS_K: grab(SRC, /const AXIS_K = [^;]+;/),
  AXIS_OFF: grab(SRC, /const AXIS_OFF = [^;]+;/),
  posAxis: grab(SRC, /function posAxis\(act, pos\) \{[\s\S]*?\n {2}\}/),
};
const axisSrc = Object.values(axisParts).filter(Boolean).join("\n");
const axisMissing = Object.entries(axisParts).filter(([, v]) => !v).map(([k]) => k);

// ① 축 상수·함수가 존재한다
check(axisMissing.length === 0,
  axisMissing.length ? `${axisMissing.join(", ")} is not defined — career.js에 축이 없어요` : "POS_AXIS · AXIS_K · AXIS_OFF · posAxis가 career.js에 있다");

const SPEC = {
  fw: { g: 1.0, a: 0.5, d: 0.15, n: 1.00 },
  wg: { g: 0.8, a: 0.8, d: 0.15, n: 1.02 },
  mf: { g: 0.5, a: 1.0, d: 0.30, n: 0.88 },
  df: { g: 2.0, a: 1.0, d: 0.55, n: 0.76 },
};

const table = axisParts.POS_AXIS ? new Function(`${axisParts.POS_AXIS} return POS_AXIS;`)() : null;
const posAxisFn = axisSrc && axisParts.posAxis
  ? new Function("act", "pos", `${axisSrc} return posAxis(act, pos);`)
  : null;

// ② 네 포지션이 모두 있고 g·a·d·n을 갖는다 + 값이 스펙 표와 같다
if (!table) {
  check(false, "POS_AXIS 표를 읽지 못했어요 (①이 먼저 통과해야 해요)");
} else {
  let shapeOk = true, valOk = true;
  for (const [pos, want] of Object.entries(SPEC)) {
    const got = table[pos];
    if (!got || ["g", "a", "d", "n"].some((k) => typeof got[k] !== "number")) { shapeOk = false; continue; }
    for (const k of ["g", "a", "d", "n"]) if (Math.abs(got[k] - want[k]) > 1e-9) valOk = false;
  }
  check(shapeOk, "POS_AXIS에 fw·wg·mf·df가 있고 각각 g·a·d·n을 갖는다");
  check(valOk, `POS_AXIS 값이 스펙 표와 같다 (${Object.keys(SPEC).map((p) => `${p} ${table[p] ? [table[p].g, table[p].a, table[p].d, table[p].n].join("/") : "없음"}`).join(", ")})`);
}

// ③ posAxis가 골·어시·수비 각각에 대해 단조 증가한다
if (!posAxisFn) {
  check(false, "posAxis를 읽지 못했어요 (①이 먼저 통과해야 해요)");
} else {
  let mono = true;
  const detail = [];
  for (const pos of Object.keys(SPEC)) {
    for (const key of ["goals", "assists", "defense"]) {
      const seq = [0, 5, 10, 20, 40].map((v) => posAxisFn({ goals: 3, assists: 3, defense: 3, [key]: v }, pos));
      for (let i = 1; i < seq.length; i++) if (!(seq[i] > seq[i - 1])) { mono = false; detail.push(`${pos}.${key}`); break; }
    }
  }
  check(mono, `posAxis가 골·어시·수비 각각에 대해 단조 증가한다${detail.length ? ` (실패: ${detail.join(", ")})` : ""}`);

  // ④ 옛 세이브 방어 — 집계 필드가 없어도 던지지 않고 0 이상을 준다
  let safeOk = true, safeMsg = "";
  try {
    const v0 = posAxisFn({}, "fw");
    const v1 = posAxisFn(undefined, "mf");
    safeOk = v0 >= 0 && v1 >= 0;
    safeMsg = `${v0}, ${v1}`;
  } catch (e) { safeOk = false; safeMsg = e.message; }
  check(safeOk, `posAxis({}, "fw")·posAxis(undefined, "mf")가 던지지 않고 0 이상을 준다 (${safeMsg})`);

  // ⑤ 표에 없는 포지션도 던지지 않는다
  let gkOk = true, gkMsg = "";
  try {
    const v = posAxisFn({ goals: 2, assists: 2, defense: 20 }, "gk");
    gkOk = Number.isFinite(v) && v >= 0;
    gkMsg = String(v);
  } catch (e) { gkOk = false; gkMsg = e.message; }
  check(gkOk, `표에 없는 포지션("gk")을 줘도 던지지 않는다 (${gkMsg})`);
}

/* hype 산식 — S(pos·proYear)와 act를 받아 실행한다.
 * 축이 아직 없으면 axisSrc가 비고, 옛 산식(hypeSum 기반)이 그대로 돌아간다. */
const hypeFn = new Function("S", "act", "clamp", `
  ${axisSrc}
  ${parts.agePen}
  ${parts.hype}
  return hype;
`);
// hypeSum은 일부러 고정해둔다 — 연말 평가가 순위 누적이 아니라 축에서 나와야 하니까.
const hypeOf = (act, pos, proYear = 5) => hypeFn({ pos, proYear }, { hypeSum: 8, ...act }, clamp);

// ⑥ hype가 축에서 나온다 — 골을 2배로 늘리면 hype가 오른다
{
  const base = { goals: 12, assists: 8, defense: 10 };
  const lo = hypeOf(base, "fw");
  const hi = hypeOf({ ...base, goals: 24 }, "fw");
  check(hi > lo + 0.2, `공격수: 골 12→24면 hype가 오른다 (${lo.toFixed(2)} → ${hi.toFixed(2)})`);

  const dLo = hypeOf({ goals: 2, assists: 5, defense: 40 }, "df");
  const dHi = hypeOf({ goals: 2, assists: 5, defense: 80 }, "df");
  check(dHi > dLo + 0.2, `수비수: 수비 성공 40→80이면 hype가 오른다 (${dLo.toFixed(2)} → ${dHi.toFixed(2)})`);
}

// ⑦ 순위 연출은 그대로 — hypeSum 누적을 지우면 경기 화면이 깨진다
check(/act\.hypeSum \+=/.test(SRC) && /act\.cbHype \+=/.test(SRC),
  "act.hypeSum · act.cbHype 누적이 남아 있다 (경기 화면 순위 연출)");

/* ⑧⑨ 시즌 시뮬레이션 — 능력치만 주면 12경기를 굴려 시즌 집계를 낸다.
 * 평점·경기 기여·시즌 길이 전부 소스에서 뽑은 그대로 쓴다. */
const seasonFn = new Function("S", "clamp", "rand", "condition", "fandom", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.poissonish} ${parts.matchContribution}
  ${parts.fanCap} ${parts.ratingDiv} ${parts.cbPerYear} ${parts.weeksPerCb}
  const stats = S.stats, pos = S.pos;
  let goals = 0, assists = 0, defense = 0;
  const games = CB_PER_YEAR * WEEKS_PER_CB;
  for (let i = 0; i < games; i++) {
    ${parts.myScore}
    ${parts.rating}
    const c = matchContribution(rating);
    goals += c.g; assists += c.a; defense += c.def;
  }
  return { goals, assists, defense, apps: games };
`);

function meanHype(pos, stat, n = 800) {
  const talents = { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 };
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const stats = { shoot: stat, pass: stat, dribble: stat, defense: stat, stamina: stat };
    const S = { pos, stats, talents, trans: {}, condition: 80, fandom: 400 };
    sum += hypeOf(seasonFn(S, clamp, rand, 80, 400), pos);
  }
  return sum / n;
}

// ⑧ 성장이 이어진다 — 능력치 70과 130의 연말 평가 차이가 충분히 벌어진다
{
  const lo = meanHype("fw", 70), hi = meanHype("fw", 130);
  check(hi - lo >= 2.0, `공격수: 능력치 70과 130의 시즌 평균 hype 차이가 2.0 이상이다 (${lo.toFixed(2)} → ${hi.toFixed(2)}, 차이 ${(hi - lo).toFixed(2)})`);
}

/* ⑨ 포지션 형평 — 이 작업에서 가장 중요한 성질이다.
 * 정규화 계수 n이 없으면 수비수는 시즌 수비 성공이 68회, 공격수는 골이 31개라
 * 그대로 더하는 순간 포지션 선택이 곧 유불리가 된다. */
console.log("=== ⑨ 포지션별 시즌 평균 hype (800시즌) ===");
{
  let worst = 0;
  for (const stat of [90, 110, 130]) {
    const got = ["fw", "wg", "mf", "df"].map((p) => [p, meanHype(p, stat)]);
    const vals = got.map(([, v]) => v);
    const spread = Math.max(...vals) - Math.min(...vals);
    worst = Math.max(worst, spread);
    console.log(`  능력치 ${stat} → ${got.map(([p, v]) => `${p} ${v.toFixed(2)}`).join(" · ")} (편차 ${spread.toFixed(2)})`);
  }
  check(worst <= 0.25, `네 포지션의 시즌 평균 hype 편차가 모든 구간에서 0.25 이내다 (최대 ${worst.toFixed(2)})`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
