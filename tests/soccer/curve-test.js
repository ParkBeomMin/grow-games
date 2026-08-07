/* 성장 곡선과 포지션 균형 회귀 테스트 — 이 작업의 안전망이에요.
 *
 * 앞선 네 커밋(평점 천장 제거 · 윙어 드리블 반영 · 동료 득점 · 포지션별 축)은
 * 각자 자기 조각만 봐요. 정작 "능력치를 올리면 상이 늘어나는가", "포지션을 골랐다는
 * 이유만으로 유불리가 생기지 않는가"를 지키는 검사가 없었어요. POS_AXIS의 정규화
 * 계수 n은 감이 아니라 시뮬레이션으로 잡은 측정값인데, 누가 df.n을 만져도 아무도
 * 못 잡습니다. 그걸 잡는 게 이 파일이에요.
 *
 * 산식은 전부 소스에서 정규식으로 뽑아요 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 떠요.
 * 직접 eval(`const x = …`)은 쓰지 않아요. 선언이 eval 자기 스코프에 갇혀서 바깥으로
 * 새지 않고, 산식을 뭘로 바꾸든 undefined가 나와 테스트가 통과해버려요.
 * 그래서 new Function으로 감싸 return 해요.
 *
 * 한 시즌(12경기)을 통째로 굴려요. 평점(career.js) → 경기 기여(game.js) → 결정적
 * 순간(극장골) → 시즌 축 → hype → 수상 판정까지가 한 사슬이라, 중간 어디가 끊겨도
 * 여기서 잡혀요. 시즌 길이도 소스에서 뽑은 CB_PER_YEAR × WEEKS_PER_CB를 써요.
 *
 * 결정적 순간을 빼먹으면 안 돼요. proMatchFinalize가 act.goals에 더하는 건
 * info.myGoals이고, 거기에는 승부처 perfect 한 골이 이미 얹혀 있어요. 그 골도
 * POS_AXIS의 골 가중치를 그대로 먹기 때문에 포지션 균형에 크게 작용해요.
 *
 * 팀 승률은 여기서 안 봐요 — team-test.js의 몫이에요. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const parts = {
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  poissonish: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  matchContribution: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  // MatchSim.finish의 info 블록 — 승부처 극장골이 내 골에 얹히는 규칙이 여기 있어요
  /* ⚠️ info 블록은 바깥 스코프의 mateGoals(중계에서 골 넣은 우리 팀 선수 이름)를 봐요.
   * 여기서는 경기 화면을 안 그리니 빈 배열을 미리 깔아 둡니다. */
  infoBlock: grab(GAME, /const info = \{[\s\S]*?\n {6}\};/),
  fanCap: grab(SRC, /const FAN_CAP = [^;]+;/),
  ratingDiv: grab(SRC, /const RATING_DIV = [^;]+;/),
  ratingOf: grab(SRC, /function ratingOf\(stats, pos, condition, fandom\) \{[\s\S]*?\n {2}\}/),
  posAxisTable: grab(SRC, /const POS_AXIS = \{[\s\S]*?\n {2}\};/),
  axisK: grab(SRC, /const AXIS_K = [^;]+;/),
  axisOff: grab(SRC, /const AXIS_OFF = [^;]+;/),
  posAxis: grab(SRC, /function posAxis\(act, pos\) \{[\s\S]*?\n {2}\}/),
  cbPerYear: grab(SRC, /const CB_PER_YEAR = [^;]+;/),
  weeksPerCb: grab(SRC, /const WEEKS_PER_CB = [^;]+;/),
  /* agePen은 노쇠 시작 시즌(DECLINE_FROM)을 읽어요 — 상수까지 같이 떼어 와야 굴러가요.
   * 따로 안 떼면 ReferenceError로 죽습니다(조용히 통과하지는 않아요). */
  ageConst: grab(SRC, /const DECLINE_FROM = [^;]+;/),
  agePen: grab(SRC, /const agePen = [^;]+;/),
  hype: grab(SRC, /const hype = clamp\([^;]+;/),
  // 수상 판정 — 신인왕 · 리그MVP · 베스트11 세 블록을 통째로 떼어 와요
  awards: grab(SRC, /const awards = \[\];[\s\S]*?"베스트11"[^\n]*\n {4}\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const axisSrc = [parts.posAxisTable, parts.axisK, parts.axisOff, parts.posAxis].join("\n");
/* 리그 티어(game.js)는 '있으면 넣는다'. 평점과 hype 둘 다 리그를 읽어서 없으면
 * ReferenceError가 나요. 아래 S에는 league를 안 넣으니 1부가 되고, 1부는 penalty 0 ·
 * prestige 1이라 이 파일의 곡선 밴드가 그대로예요 — league-test ⑥의 약속이에요. */
const leagueSrc = [
  grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  // barOf — 수상 판정이 리그의 경쟁 강도(bar)를 이걸로 읽어요
  grab(GAME, /function barOf\(st\) \{[\s\S]*?\n\}/),
].filter(Boolean).join("\n");
const POS_INFO = new Function(`${parts.posInfo} return POS_INFO;`)();

/* 한 시즌(12경기)을 굴려 시즌 집계(act)를 내요. 실제 playShow와 같은 순서로
 * 평점 → 경기 기여 → 결정적 순간을 돌리고, 극장골이 내 골에 얹히는 규칙은
 * MatchSim의 info 블록을 그대로 실행해서 가져와요. 승부처 판정은 게임 자체의
 * 자동 판정(autoRes)을 써요 — 사람이 미니게임을 직접 하는 경우의 대역이에요.
 * 팀 스코어(h·a·res)는 이 테스트가 안 보는 값이라 자리만 채워요. */
const seasonFn = new Function("S", "clamp", "rand", `
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.poissonish} ${parts.matchContribution} ${parts.autoRes}
  ${leagueSrc}
  ${parts.fanCap} ${parts.ratingDiv} ${parts.ratingOf}
  ${parts.cbPerYear} ${parts.weeksPerCb}
  const home = "우리", away = "상대", h = 0, a = 0, res = "D";
  const posStat = POS_INFO[S.pos].stat;
  const act = { goals: 0, assists: 0, defense: 0, apps: 0, hypeSum: 0, wins: 0, sales: 0 };
  const games = CB_PER_YEAR * WEEKS_PER_CB;
  for (let i = 0; i < games; i++) {
    const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom);
    const c = matchContribution(rating);
    const goals = c.g, assists = c.a, defense = c.def;
    const momentRes = autoRes(S.stats[posStat]);
    const mateGoals = [];
    ${parts.infoBlock}
    act.goals += info.myGoals;
    act.assists += info.assists;
    act.defense += info.defense;
    act.apps += 1;
  }
  return act;
`);

// 시즌 결산 — 축 → hype → 수상 판정. 전부 소스에서 뽑은 그대로예요.
const yearFn = new Function("S", "act", "clamp", "rand", `
  ${leagueSrc}
  ${axisSrc}
  ${parts.ageConst}
  ${parts.agePen}
  ${parts.hype}
  ${parts.awards}
  return { hype, awards, axis: posAxis(act, S.pos) };
`);

const POS = ["fw", "wg", "mf", "df"];
const POS_NAME = { fw: "공격수", wg: "윙어", mf: "미드필더", df: "수비수" };

/* 능력치 프로필 두 가지.
 * - flat: 다섯 스탯을 전부 같은 값으로 둬요. 설계 문서의 곡선 표가 이 조건이에요.
 * - main: 주 스탯에 몰고 나머지를 낮게 둬요(설계 문서의 "주 스탯 160 + 나머지 90").
 *   실제 플레이어는 주 스탯에 투자하니까요. 이 프로필이 있어야 "윙어의 드리블이
 *   골·도움에 반영되는가"를 볼 수 있어요 — flat에서는 shoot과 dribble이 같은 값이라
 *   드리블 반영을 통째로 꺼도 결과가 한 톨도 안 변해요. */
const MAIN_UP = 1.45, SUB_DOWN = 0.8;
function statsOf(pos, stat, mode) {
  const main = POS_INFO[pos].stat, out = {};
  for (const k of ["shoot", "pass", "dribble", "defense", "stamina"])
    out[k] = mode === "flat" ? stat : stat * (k === main ? MAIN_UP : SUB_DOWN);
  return out;
}

/* 5년차 · 컨디션 80 · 명성은 FAN_CAP에 걸릴 만큼 충분히 높게 둬요.
 * 재능은 1.3 균일이라 clutch 보정이 1.0이에요 — 포지션 간 비교를 흐리지 않아요. */
function seasonOnce(pos, stat, mode) {
  const S = {
    pos, stats: statsOf(pos, stat, mode),
    talents: { shoot: 1.3, pass: 1.3, dribble: 1.3, defense: 1.3, stamina: 1.3 },
    trans: {}, condition: 80, fandom: 900, proYear: 5,
    career: { rookie: 0, daesang: 0, bonsang: 0 },
  };
  const act = seasonFn(S, clamp, rand);
  return { ...yearFn(S, act, clamp, rand), act };
}

const N = Number(process.env.CURVE_N || 6000);
function measure(pos, stat, mode) {
  let mvp = 0, best11 = 0, axis = 0, g = 0, a = 0, d = 0;
  for (let i = 0; i < N; i++) {
    const y = seasonOnce(pos, stat, mode);
    if (y.awards.includes("리그MVP")) mvp++;
    if (y.awards.includes("베스트11")) best11++;
    axis += y.axis; g += y.act.goals; a += y.act.assists; d += y.act.defense;
  }
  return { mvp: mvp / N, best11: best11 / N, axis: axis / N, g: g / N, a: a / N, d: d / N };
}

const t0 = Date.now();
const FLAT_STATS = [70, 90, 110, 130, 150];
const MAIN_STATS = [110, 130];
const flat = {}, mainly = {};
for (const stat of FLAT_STATS) { flat[stat] = {}; for (const p of POS) flat[stat][p] = measure(p, stat, "flat"); }
for (const stat of MAIN_STATS) { mainly[stat] = {}; for (const p of POS) mainly[stat][p] = measure(p, stat, "main"); }

const avg = (row, key) => POS.reduce((s, p) => s + row[p][key], 0) / POS.length;
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const spread = (row, key) => {
  const vs = POS.map((p) => row[p][key]);
  return Math.max(...vs) - Math.min(...vs);
};

console.log(`=== 5년차 리그MVP 확률 — 능력치 균등 (칸당 ${N}시즌) ===`);
console.log(`  능력치 | ${POS.map((p) => POS_NAME[p].padStart(7)).join(" | ")} |  평균 |   격차`);
for (const stat of FLAT_STATS) {
  const cells = POS.map((p) => pct(flat[stat][p].mvp).padStart(7)).join(" | ");
  console.log(`  ${String(stat).padStart(6)} | ${cells} | ${pct(avg(flat[stat], "mvp")).padStart(5)} | ${(spread(flat[stat], "mvp") * 100).toFixed(1)}%p`);
}
// 빨간불이 떴을 때 어디서 벌어졌는지 바로 보이도록 시즌 산출량도 같이 찍어요
console.log(`=== 시즌 평균 산출 (능력치 110, 균등) — 골 · 도움 · 수비 성공 · 축 ===`);
for (const p of POS) {
  const r = flat[110][p];
  console.log(`  ${POS_NAME[p].padStart(5)} | ⚽ ${r.g.toFixed(1).padStart(5)} · 🅰️ ${r.a.toFixed(1).padStart(5)} · 🛡️ ${r.d.toFixed(1).padStart(5)} · 축 ${r.axis.toFixed(1)}`);
}

// ① 곡선 — 능력치별 5년차 리그MVP 확률이 설계 범위 안에 있다
const BAND = { 70: [0, 0.08], 90: [0.08, 0.25], 110: [0.45, 0.72], 130: [0.78, 0.95], 150: [0.90, 1.00] };
for (const stat of FLAT_STATS) {
  const [lo, hi] = BAND[stat];
  const v = avg(flat[stat], "mvp");
  check(v >= lo && v <= hi, `능력치 ${stat}: 리그MVP 확률이 ${pct(lo)}~${pct(hi)}다 (${pct(v)})`);
}

// ② 단조 증가 — 능력치를 올렸는데 상이 안 늘면 성장이 멈춘 거예요
{
  const seq = [70, 90, 110, 130].map((s) => avg(flat[s], "mvp"));
  let mono = true;
  for (let i = 1; i < seq.length; i++) if (!(seq[i] > seq[i - 1] + 0.02)) mono = false;
  check(mono, `리그MVP 확률이 70 < 90 < 110 < 130으로 오른다 (${seq.map(pct).join(" → ")})`);
}

/* ③ 포지션 균형 — 이 테스트의 본체예요.
 * 포지션을 골랐다는 이유만으로 리그MVP 확률이 갈리면 안 돼요. 설계 문서의 측정값은
 * 3%p 안쪽이고, 난수 여유를 둬 10%p로 잡아요. 통과시키려고 이 범위를 넓히면
 * 이 테스트는 아무것도 안 지켜요. */
for (const stat of [70, 90, 110, 130]) {
  const g = spread(flat[stat], "mvp");
  const detail = POS.map((p) => `${POS_NAME[p]} ${pct(flat[stat][p].mvp)}`).join(" · ");
  check(g <= 0.10, `능력치 ${stat}: 네 포지션의 리그MVP 확률 격차가 10%p 이내다 (${(g * 100).toFixed(1)}%p — ${detail})`);
}

/* ③-B 포지션 균형 — 주 스탯에 투자한 결과가 포지션마다 돌아온다.
 * 자기 주 스탯을 키웠는데 시즌 축이 오히려 줄면 그 포지션은 구조적으로 망가진 거예요.
 * 윙어가 정확히 그랬어요(드리블이 골·도움 판정에 안 들어가서 몰빵할수록 나빠졌어요).
 * 균등 프로필에서는 다섯 스탯이 같은 값이라 이 결함이 아예 안 보여요. */
console.log(`=== 주 스탯 특화(주 스탯 ×${MAIN_UP} · 나머지 ×${SUB_DOWN})의 시즌 축 변화 ===`);
for (const stat of MAIN_STATS) {
  let ok = true;
  const detail = POS.map((p) => {
    const lo = flat[stat][p].axis, hi = mainly[stat][p].axis;
    if (!(hi > lo)) ok = false;
    return `${POS_NAME[p]} ${lo.toFixed(1)}→${hi.toFixed(1)}(×${(hi / lo).toFixed(3)})`;
  }).join(" · ");
  console.log(`  능력치 ${stat} — ${detail}`);
  check(ok, `능력치 ${stat}: 네 포지션 모두 주 스탯 특화가 시즌 축을 늘린다`);
}

// ④ 중간 등급이 받쳐준다 — 약한 선수가 아무 상도 못 받으면 게임을 그만둬요
{
  const v = avg(flat[70], "best11");
  const detail = POS.map((p) => `${POS_NAME[p]} ${pct(flat[70][p].best11)}`).join(" · ");
  check(v >= 0.35, `능력치 70에서 베스트11 확률이 35% 이상이다 (평균 ${pct(v)} — ${detail})`);
}

// ⑤ 150에서도 축이 계속 자란다 — 확률은 100%에서 포화하니 축 자체를 봐요
{
  let ok = true;
  const detail = POS.map((p) => {
    const lo = flat[130][p].axis, hi = flat[150][p].axis;
    if (!(hi > lo)) ok = false;
    return `${POS_NAME[p]} ${lo.toFixed(1)}→${hi.toFixed(1)}`;
  }).join(" · ");
  check(ok, `능력치 150의 시즌 축 평균이 130보다 크다 (${detail})`);
}

console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
console.log(fail ? `❌ ${fail}건 실패` : "✅ 통과");
process.exit(fail ? 1 : 0);
