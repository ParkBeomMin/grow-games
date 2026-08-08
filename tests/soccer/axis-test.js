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
  /* 🎖️ 시즌 칭호 — matchContribution·ratingOf·autoRes가 buffMul/buffSum을 봐요.
   * 같이 안 떼어 오면 ReferenceError로 죽습니다(조용히 통과하지는 않아요).
   * 이 검사들은 칭호가 없는 상태(S.buffs 없음)를 보니 배수는 전부 1이 나와요 —
   * 칭호가 붙었을 때의 동작은 tests/soccer/buff-test.js가 봅니다. */
  /* 🔥 승부처 성공이 무엇으로 남는지는 포지션이 정해요(극장골/도움/차단).
   * info 블록이 momentKind()를 부르니 같이 떼어 와야 굴러가요. */
  momentKind: grab(GAME, /const MOMENT_KIND = \{[^}]*\};\nconst momentKind = [^;]+;/),
  // 재능이 능력치마다 따로 붙어요 — ratingOf가 STAT_KEYS를 훑어요
  statKeys: grab(GAME, /const STAT_KEYS = \[[^\]]*\];/),
  goalScale: grab(GAME, /const GOAL_SCALE = [^;]+;/),
  buffFns: grab(GAME, /const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/),
  matchContribution: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  // MatchSim.finish의 info 블록 — 승부처 극장골이 내 골에 얹히는 규칙이 여기 있어요
  /* ⚠️ info 블록은 바깥 스코프의 mateGoals(중계에서 골 넣은 우리 팀 선수 이름)를 봐요.
   * 여기서는 경기 화면을 안 그리니 빈 배열을 미리 깔아 둡니다. */
  infoBlock: grab(GAME, /const info = \{[\s\S]*?\n {6}\};/),
  fanCap: grab(SRC, /const FAN_CAP = [^;]+;/),
  ratingDiv: grab(SRC, /const RATING_DIV = [^;]+;/),
  /* ⚠️ myScore 한 줄만 뽑으면 안 돼요 — 산식이 같은 함수 안의 all·low·weak를 봅니다.
   * ratingOf 본문을 통째로 가져와요(rating 선언과 return이 그 안에 있어요). */
  ratingBody: (() => {
    const fn = grab(SRC, /function ratingOf\([^)]*\) \{[\s\S]*?\n {2}\}/);
    return fn ? fn.replace(/^\s*function ratingOf\([^)]*\) \{/, "").replace(/\n {2}\}$/, "") : null;
  })(),
  cbPerYear: grab(SRC, /const CB_PER_YEAR = [^;]+;/),
  weeksPerCb: grab(SRC, /const WEEKS_PER_CB = [^;]+;/),
  /* agePen은 노쇠 시작 시즌(DECLINE_FROM)을 읽어요 — 상수까지 같이 떼어 와야 굴러가요.
   * 따로 안 떼면 ReferenceError로 죽습니다(조용히 통과하지는 않아요). */
  ageConst: grab(SRC, /const DECLINE_FROM = [^;]+;/),
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

/* 리그 티어(game.js)도 같은 규칙으로 '있으면 넣는다'. 평점과 hype 둘 다 리그를 읽어서
 * 없으면 ReferenceError가 난다. 아래 S에는 league를 안 넣으니 1부가 되고,
 * 1부는 penalty 0 · prestige 1이라 이 파일의 기대값이 그대로다 — league-test ⑥의 약속이다. */
const leagueSrc = [
  grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
].filter(Boolean).join("\n");

// ① 축 상수·함수가 존재한다
check(axisMissing.length === 0,
  axisMissing.length ? `${axisMissing.join(", ")} is not defined — career.js에 축이 없어요` : "POS_AXIS · AXIS_K · AXIS_OFF · posAxis가 career.js에 있다");

/* 설계 문서(docs/superpowers/specs/2026-07-29-soccer-growth-curve.md)의 포지션 축 표예요.
 * 여기만 소스에서 뽑지 않고 손으로 적어요 — "소스가 문서와 같은가"를 보는 검사라
 * 소스에서 뽑아 오면 자기 자신과 비교하는 꼴이 돼요. 소스를 고쳤으면 문서와 이 표를
 * 같이 고쳐야 해요.
 *
 * 정규화 계수 n은 두 번 재보정했어요.
 * ① 2026-07-29 — 첫 캘리브레이션이 승부처 극장골(MatchSim.finish가 myGoals에 얹는
 *    perfect 한 골)을 시뮬레이션에서 빠뜨렸어요. 그 골도 POS_AXIS의 골 가중치를
 *    그대로 먹는데, 수비수는 골 가중치가 2.0이라 시즌 5~6개가 그대로 이득이 됐어요.
 * ② ⚽ 득점 눈금(GOAL_SCALE 0.33)을 넣으면서 — 골·도움·수비는 0.33배가 됐는데
 *    **극장골은 눈금을 안 타요.** 그래서 극장골의 상대 비중이 세 배가 됐고,
 *    골 가중치가 큰 수비수가 다시 앞서 나갔습니다(hype 편차 0.71).
 *    아래 값은 그 상태에서 다시 잰 거예요 — 편차 0.71 → 0.16. */
const SPEC = {
  fw: { g: 1.0, a: 0.5, d: 0.15, n: 0.94 },
  wg: { g: 0.8, a: 0.8, d: 0.15, n: 1.02 },
  mf: { g: 0.5, a: 1.0, d: 0.30, n: 0.86 },
  df: { g: 2.0, a: 1.0, d: 0.55, n: 0.87 },
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
  ${leagueSrc}
  ${axisSrc}
  ${parts.ageConst}
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
 * 평점·경기 기여·승부처·시즌 길이 전부 소스에서 뽑은 그대로 쓴다.
 *
 * 승부처(극장골)를 빼먹으면 안 된다. proMatchFinalize가 act.goals에 더하는 건
 * MatchSim.finish의 info.myGoals이고, 거기에는 승부처가 perfect일 때 한 골이 이미
 * 얹혀 있다. 그 골도 POS_AXIS의 골 가중치를 그대로 먹기 때문에, 골 가중치가 2.0인
 * 수비수에게 특히 크게 작용한다. 처음에는 이 한 줄이 빠져 있어서 이 테스트와
 * curve-test.js가 서로 모순되는 정규화 계수를 요구했다.
 *
 * 그래서 curve-test.js의 시즌 시뮬레이션과 같은 방식으로 굴린다 — 승부처 판정은
 * 게임 자체의 자동 판정(autoRes)을 쓰고, 극장골이 내 골에 얹히는 규칙은 info 블록을
 * 그대로 실행해서 가져온다. 두 파일이 같은 세계를 재야 하니 이 순서가 같아야 한다
 * (이 저장소에는 테스트 헬퍼 모듈 관례가 없어서 두 벌로 둔다).
 * 팀 스코어(h·a·res)는 이 테스트가 안 보는 값이라 자리만 채운다. */
const seasonFn = new Function("S", "clamp", "rand", "condition", "fandom", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.momentKind}
  ${parts.statKeys}
  ${parts.goalScale}
  ${parts.buffFns}
  ${parts.poissonish} ${parts.matchContribution} ${parts.autoRes}
  ${leagueSrc}
  ${parts.fanCap} ${parts.ratingDiv} ${parts.cbPerYear} ${parts.weeksPerCb}
  const stats = S.stats, pos = S.pos;
  const posStat = POS_INFO[pos].stat;
  const home = "우리", away = "상대", h = 0, a = 0, res = "D";
  const act = { goals: 0, assists: 0, defense: 0 };
  const games = CB_PER_YEAR * WEEKS_PER_CB;
  for (let i = 0; i < games; i++) {
    const rating = (() => { ${parts.ratingBody} })();
    const c = matchContribution(rating);
    const goals = c.g, assists = c.a, defense = c.def;
    const momentRes = autoRes(stats[posStat]);
    const mateGoals = [];
    ${parts.infoBlock}
    act.goals += info.myGoals;
    act.assists += info.assists;
    act.defense += info.defense;
  }
  return { goals: act.goals, assists: act.assists, defense: act.defense, apps: games };
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
