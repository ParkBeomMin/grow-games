/* 월드투어가 몇 년차에 열리는지 잰다. 목표는 강하게 키운 플레이어 기준 6~8년차다.
 *
 * Task 5의 TOUR_DAESANG · TOUR_FANDOM은 아무도 재보지 않은 임시값이었다. 여기서
 * 실제 산식으로 재서 확정한다.
 *
 * 손으로 쓴 성장 모델은 믿지 않는다 — 스펙 5.2에 적힌 대로, 예전 시뮬레이션은
 * 대상 2회를 8~9년차로 봤는데 제보자는 4년차에 이미 2회였다. 모델이 보수적이었던
 * 거다. 그래서 이 파일은 성장률을 가정하지 않고 **게임의 연습 산식(prepAction)을
 * 그대로 떼어내 턴 단위로 굴린다**. 플레이어 유형의 차이는 성장률 상수가 아니라
 * "턴을 어디에 쓰느냐"(어떤 스탯을 연습하나 · 언제 쉬나 · 장비를 사나)로 낸다.
 *
 * 경로는 weekly-test.js와 같다:
 *   라이벌 → 주간 점수 → 1위 → 초동 판매량 → hype → 수상 → 팬덤 → 다음 해
 * 여기에 연습 턴과 연말 스탯 변화까지 붙여 데뷔부터 은퇴(10년차)까지 굴린다.
 *
 * 산식은 전부 정규식으로 소스에서 뽑는다 (복사하면 원본과 어긋나도 초록이 뜬다).
 * 직접 eval("const x = …")은 선언이 eval 자기 스코프에 갇혀 항상 undefined가 되니
 * new Function(...)으로 감싸고 return 한다 — axis-test.js와 같은 방식이다. */
"use strict";
const fs = require("fs");
const DIR = "/workspace/grow-games/beta/idol";
const SRC = fs.readFileSync(`${DIR}/career.js`, "utf8");
const GAME = fs.readFileSync(`${DIR}/game.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------- 산식 추출 ----------
const M = {
  cap:      SRC.match(/const FANDOM_CAP = [^;]+;/),
  score:    SRC.match(/const myScore =[\s\S]*?;\n/),
  rival:    SRC.match(/function rollRivals\(\)[\s\S]*?\n  \}/),
  // 컴백 컨셉(Task 1) 이후 cbSales는 CONCEPTS/conceptOf/trendMul/expectedSales를 함께 쓴다.
  // act에 concept이 없으면 conceptOf가 청량(cool) 기본값을 준다.
  concepts:   SRC.match(/const CONCEPTS = \[[\s\S]*?\n  \];/),
  salesK:     SRC.match(/const SALES_K = [^;]+;/),
  trendHot:   SRC.match(/const TREND_HOT = [^;]+;/),
  trendCold:  SRC.match(/const TREND_COLD = [^;]+;/),
  conceptOf:  SRC.match(/function conceptOf\(act\) \{[\s\S]*?\n  \}/),
  trendMul:   SRC.match(/function trendMul\(concept, act\) \{[\s\S]*?\n  \}/),
  expectedSales: SRC.match(/function expectedSales\(stats, concept, fandom, cbWins\) \{[\s\S]*?\n  \}/),
  sales:    SRC.match(/const concept = conceptOf\(act\);\s*const cbSales = [^;]+;/),
  hype:     SRC.match(/const hype = clamp\([^;]+;/),
  agePen:   SRC.match(/const agePen = S\.proYear >= 8[^;]+;/),
  yearFan:  SRC.match(/const dFan = Math\.round\([^;]+;/),
  daesang:  SRC.match(/const leagueBest = [^;]+;\s*if \(hype >= [\d.]+ && hype >= leagueBest\) \{[\s\S]*?\n    \}/),
  yearMod:  SRC.match(/const yearMod = S\.proYear[^;]+;/),
  failP:    SRC.match(/const failP = [^;]+;/),
  loss:     SRC.match(/const loss = Math\.round\(rand\(0\.5, 1\.5\) \* 10\) \/ 10;/),
  condMod:  SRC.match(/const condMod = [^;]+;/),
  gain:     SRC.match(/let gain = rand\(1\.8, 3\.6\)[^;]+;\s*if \(S\.stats\[def\.key\] >= 100\) gain \*= 0\.5;\s*gain = Math\.round\(gain \* 10\) \/ 10;/),
  trainCd:  SRC.match(/S\.condition = clamp\(S\.condition - randInt\(10, 16\), 0, 100\);/),
  failCd:   SRC.match(/S\.condition = clamp\(S\.condition - randInt\(6, 10\), 0, 100\);/),
  restCd:   SRC.match(/S\.condition = clamp\(S\.condition \+ randInt\(25, 40\), 0, 100\);/),
  showCd:   SRC.match(/S\.condition = clamp\(S\.condition - randInt\(3, 6\), 0, 100\);/),
  yearStat: SRC.match(/if \(S\.proYear <= 3\) S\.stats\[d\.key\][\s\S]*?else if \(S\.proYear >= 8\) S\.stats\[d\.key\] = [^;]+;/),
  weekFan:  SRC.match(/dFan = randInt\([^)]*\)/g),
  income:   SRC.match(/const income = sales \* 3 \+ wins \* 40;/),
  tourD:    SRC.match(/const TOUR_DAESANG = (\d+);/),
  tourF:    SRC.match(/const TOUR_FANDOM = (\d+);/),
  ready:    SRC.match(/const TOUR_DAESANG[\s\S]*?function tourReady\(\)[\s\S]*?\n  \}/),
  cities:   SRC.match(/const TOUR_CITY_STEP[\s\S]*?function tourCities\(\)[\s\S]*?\n  \}/),
  grade:    SRC.match(/function tourGrade\(fillRate\)[\s\S]*?\n  \}/),
  tourMul:  SRC.match(/const TOUR_MUL = \{[^}]+\};/),
  // 🔥 강행군 — 컨디션 소모·기세·취소가 객석에 얹혀서, 투어 보상이 팬덤 곡선에 되먹임된다
  tourNums: SRC.match(/const TOUR_DRAIN = [\s\S]*?const TOUR_FULL = [^;]+;/),
  condMul:  SRC.match(/function tourCondMul\(cond\)[\s\S]*?\n  \}/),
  drain:    SRC.match(/function tourDrain\(i, n\)[\s\S]*?\n  \}/),
  cancel:   SRC.match(/function tourCancelChance\(cond\)[\s\S]*?\n  \}/),
  /* 🌏 한 도시는 세 무대(오프닝·킬링파트·앵콜)예요 — 객석 산식이 세 판정을
   * 가중합(game.js의 tourSetBase)한 값을 base로 받아요. 세 조각을 다 떼어 와요. */
  fill:     SRC.match(/const base = tourSetBase\(results\);[\s\S]*?const fill = clamp\([^;]+;/),
  stages:   GAME.match(/const TOUR_STAGES = \[[\s\S]*?\n\];/),
  resVal:   GAME.match(/const TOUR_RES_VAL = \{[^}]+\};/),
  setBase:  GAME.match(/function tourSetBase\(results\) \{[\s\S]*?\n\}/),
  tourRew:  SRC.match(/const dFan = Math\.max\(0, Math\.round\(n \* avg \* 60 \* mul\)\);\s*const income = Math\.max\(0, Math\.round\(n \* avg \* 1200 \* mul\)\);/),
  statCap:  GAME.match(/const STAT_CAP = (\d+);/),
  clutch:   GAME.match(/function clutch\(key\) \{[\s\S]*?\n\}/),
  gear:     GAME.match(/const GEAR_TIERS = \[[\s\S]*?\];/),
  roll:     GAME.match(/stats\[d\.key\] = randInt\((\d+), (\d+)\);/),
};
const missing = Object.entries(M).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }
if (M.weekFan.length !== 3) { console.log(`❌ 주간 팬덤 증감이 3갈래가 아니에요 (${M.weekFan.length}개)`); process.exit(1); }

const NEED_D = +M.tourD[1], NEED_F = +M.tourF[1];
const STAT_CAP = +M.statCap[1];
const STAT_KEYS = ["vocal", "dance", "rap", "charm", "stamina"];
const POS_INFO = { vocal: { name: "보컬", stat: "vocal" } };
const RIVAL_GROUPS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
const CB_PER_YEAR = 2, WEEKS_PER_CB = 6, LAST_YEAR = 10;   // 10년차에 강제 은퇴

const GEAR_TIERS = new Function(`${M.gear[0]} return GEAR_TIERS;`)();
const clutchOf = new Function("S", "clamp", "transLv", "TALENT_MAX", "CLUTCH_SCALE",
  `${M.clutch[0]} return clutch;`);
const scoreFn = new Function("S", "POS_INFO", "clutch", "miniBonus", "rand",
  `${M.cap[0]} ${M.score[0]} return myScore;`);
const rollRivalsFn = new Function("rand", "RIVAL_GROUPS",
  `let S; ${M.rival[0]}; return (s) => { S = s; return rollRivals(); };`)(rand, RIVAL_GROUPS);
const salesFn = new Function("S", "act", "rand",
  `${M.concepts[0]} ${M.salesK[0]} ${M.trendHot[0]} ${M.trendCold[0]}
   ${M.conceptOf[0]} ${M.trendMul[0]} ${M.expectedSales[0]} ${M.sales[0]} return cbSales;`);
const agePenFn = new Function("S", `${M.agePen[0]} return agePen;`);
const hypeFn = new Function("act", "agePen", "clamp", `${M.hype[0]} return hype;`);
const yearFanFn = new Function("hype", "wins", `${M.yearFan[0]} return dFan;`);
const daesangFn = new Function("S", "hype", "awards", "rand", `${M.daesang[0]} return awards;`);
const weekFanFn = M.weekFan.map((s) => new Function("randInt", `let dFan; ${s}; return dFan;`));
const yearStatFn = new Function("S", "d", "rand", "clamp", "statCap",
  `${M.yearStat[0]} return S.stats[d.key];`);
const trainFn = new Function("S", "def", "rand", "randInt", "clamp", "statCap", "Math_random", `
  ${M.yearMod[0]}
  ${M.failP[0]}
  if (Math_random() < failP) {
    ${M.loss[0]}
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
    ${M.failCd[0]}
    return -loss;
  }
  ${M.condMod[0]}
  ${M.gain[0]}
  S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, statCap(def.key));
  ${M.trainCd[0]}
  return gain;`);
const restFn = new Function("S", "randInt", "clamp", `${M.restCd[0]} return S.condition;`);
const showCdFn = new Function("S", "randInt", "clamp", `${M.showCd[0]} return S.condition;`);
const incomeFn = new Function("sales", "wins", `${M.income[0]} return income;`);
let READY_S;
const tourReady = new Function("getS", `${M.ready[0].replace(/\bS\./g, "getS().")}; return tourReady;`)(() => READY_S);
// tourCities는 바깥에 선언된 TOUR_FANDOM을 클로저로 본다 — 값을 넣어줘야 한다
const tourCities = new Function("getS", "clamp", "TOUR_FANDOM",
  `${M.cities[0].replace(/\bS\./g, "getS().")}; return tourCities;`)(() => READY_S, clamp, NEED_F);
const tourGrade = new Function(`${M.grade[0]} return tourGrade;`)();
const TOUR_MUL = new Function(`${M.tourMul[0]} return TOUR_MUL;`)();
const TOURN = new Function(`${M.tourNums[0]}
  return { TOUR_DRAIN, TOUR_RAMP, TOUR_START_MIN, TOUR_REST_SHOW, TOUR_DANGER, TOUR_HYPE_STEP, TOUR_HYPE_MAX, TOUR_FULL };`)();
const tourCondMul = new Function("clamp", `${M.condMul[0]} return tourCondMul;`)(clamp);
const tourDrain = new Function("rand", "TOUR_DRAIN", "TOUR_RAMP",
  `${M.drain[0]} return tourDrain;`)(rand, TOURN.TOUR_DRAIN, TOURN.TOUR_RAMP);
const tourCancel = new Function("clamp", "TOUR_DANGER",
  `${M.cancel[0]} return tourCancelChance;`)(clamp, TOURN.TOUR_DANGER);
/* 🌏 세 무대의 판정을 하나의 base로 합치는 산식 — game.js에서 통째로 떼어 온다.
 * 가중치를 손으로 베껴 두면 game.js를 고칠 때 여기만 옛 숫자로 남는다. */
const tourSetBase = new Function("rand", `${M.stages[0]}
  ${M.resVal[0]}
  ${M.setBase[0]} return tourSetBase;`)(rand);
const TOUR_STAGES = new Function(`${M.stages[0]} return TOUR_STAGES;`)();

/* 객석 산식은 tour(컨디션·기세)를 클로저로 본다 — 그 객체를 넣어줘야 한다.
 * 소스에서 통째로 떼어 오니 base·condMul·hype의 조합이 원본과 어긋날 수 없다. */
const fillFn = new Function("results", "tourSetBase", "S", "rand", "clamp", "tour", "tourCondMul", "TOUR_HYPE_MAX", "TOUR_HYPE_STEP",
  `${M.fill[0]} return fill;`);
const tourRewFn = new Function("n", "avg", "mul", `${M.tourRew[0]} return { dFan, income };`);

/* 투어 한 번을 도시 단위로 굴린다. 예전에는 도시별 객석을 독립적으로 뽑아
 * 평균만 냈는데, 지금은 컨디션이 도시를 거치며 깎이고 기세가 이어지니
 * 순서대로 굴려야 값이 맞다. 취소(객석 0)도 여기서 나온다.
 * 쉬어가기 정책은 "취소만 피할 만큼 쉰다" — 화면에서 선택지가 뜨는 조건보다
 * 보수적이라, 성실한 플레이어의 하한을 잡는다. */
function simTour(S, n) {
  const tour = { cond: clamp(Math.max(S.condition || 0, TOURN.TOUR_START_MIN), 0, 100), streak: 0, fills: [] };
  for (let i = 0; i < n; i++) {
    if (tour.cond < TOURN.TOUR_DANGER + 6) {          // 🛌 하루 쉬어가기
      tour.cond = clamp(tour.cond + randInt(26, 38), 0, 100);
      tour.fills.push(rand(0.26, 0.42));
      tour.streak = 0;
      continue;
    }
    tour.cond = clamp(tour.cond - tourDrain(i, n), 0, 100);
    if (Math.random() < tourCancel(tour.cond)) { tour.fills.push(0); tour.streak = 0; continue; }
    /* 한 도시에서 세 무대를 연달아 한다 — 무대마다 따로 판정을 굴린다.
     * 판정 확률은 예전과 같게 두고, 합치는 일은 game.js의 가중치가 한다. */
    const results = TOUR_STAGES.map((st) => {
      const r = Math.random();
      return { key: st.key, res: r < 0.25 ? "perfect" : r < 0.85 ? "good" : "miss" };
    });
    const fill = fillFn(results, tourSetBase, S, rand, clamp, tour, tourCondMul, TOURN.TOUR_HYPE_MAX, TOURN.TOUR_HYPE_STEP);
    tour.fills.push(fill);
    tour.streak = fill >= TOURN.TOUR_FULL ? tour.streak + 1 : 0;
  }
  return tour.fills.reduce((a, b) => a + b, 0) / n;
}

// 초월(transcend)은 이 시뮬에서 다루지 않는다 — 스탯을 45~60으로 되돌리는
// 엔드게임 도박이라, 투어를 여는 최단 경로에는 아무도 안 쓴다.
const statCap = () => STAT_CAP;
const transLv = () => 0;

// ---------- 플레이어 유형 ----------
/* 차이는 성장률 상수가 아니라 플레이 방식이다.
 *  - 강하게: 축이 되는 스탯(포지션·매력·무대)만 판다. 컨디션이 떨어지면 바로 쉬어
 *            연습 배수(condMod 1.1)와 실패율(0.07)을 최선으로 유지한다. 정산금은
 *            바로 축 스탯 장비에 넣는다. 재능은 다시 뽑기로 좋은 값을 골라 왔다.
 *  - 보통:   다섯 스탯을 고르게 돌린다(체력은 판매량·주간 점수에 안 들어간다).
 *            컨디션이 바닥을 친 뒤에야 쉬어서 0.6배 연습을 자주 한다. 장비도
 *            다섯 스탯에 흩뿌린다. 재능은 뽑은 대로 쓴다. */
const AXIS = ["charm", "vocal", "dance", "rap"];
const ARCHETYPES = [
  {
    label: "강하게(최적화)", restAt: 45,
    train: AXIS, gearOrder: AXIS,
    talent: () => ({ vocal: 1.45, charm: 1.4, dance: 1.3, rap: 1.3, stamina: 0.95 }),
    debut: () => ({ base: randInt(52, 62), fandom: 500, money: 800 }),
  },
  {
    label: "보통", restAt: 40,
    train: STAT_KEYS, gearOrder: STAT_KEYS,
    talent: () => { const t = {}; for (const k of STAT_KEYS) t[k] = rand(0.9, 1.3); t.vocal = Math.max(t.vocal, 1.05); return t; },
    debut: () => ({ base: randInt(40, 50), fandom: 350, money: 500 }),
  },
];

// ---------- 커리어 한 판 ----------
function runCareer(A) {
  const d = A.debut();
  const S = {
    pos: "vocal", proYear: 0, condition: 80, camp: 0, fandom: d.fandom, money: d.money,
    stats: {}, talents: A.talent(), gear: {}, trans: {},
    career: { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0, tours: 0 },
  };
  for (const k of STAT_KEYS) S.stats[k] = d.base + randInt(-4, 4);
  S.stats[S.pos] += 8;   // rollStats의 포지션 보정
  const clutch = clutchOf(S, clamp, transLv, 1.8, 0.12);
  READY_S = S;
  const out = { year: 0, path: "-", dae: 0, fandom: 0, daeAt: 0, cities: [] };

  let rot = 0;
  const runCamp = () => {
    while (S.camp > 0) {
      if (S.condition < A.restAt) restFn(S, randInt, clamp);
      else {
        // 상한에 닿은 스탯은 연습해도 안 오른다(턴만 소모) — 다음 스탯으로 돌린다
        let def = null;
        for (let i = 0; i < A.train.length; i++) {
          const k = A.train[(rot + i) % A.train.length];
          if (Math.round(S.stats[k]) < statCap(k)) { def = { key: k }; rot = (rot + i + 1) % A.train.length; break; }
        }
        if (def) trainFn(S, def, rand, randInt, clamp, statCap, Math.random);
        else restFn(S, randInt, clamp);
      }
      S.camp -= 1;
    }
  };

  for (let y = 1; y <= LAST_YEAR; y++) {
    // startPrep
    S.proYear = y; S.camp = 3; S.condition = 80;
    const act = { cb: 1, wins: 0, sales: 0, cbWins: 0, rivals: rollRivalsFn(S) };
    runCamp();

    for (let cb = 1; cb <= CB_PER_YEAR; cb++) {
      if (cb > 1) { act.cb = cb; act.cbWins = 0; act.rivals = rollRivalsFn(S); S.camp = 3; runCamp(); }
      for (let w = 1; w <= WEEKS_PER_CB; w++) {
        // 매 무대 미니게임: 대성공 10 / 보통 3 / 실패 -8 (playShow의 moment())
        const r = Math.random();
        const miniBonus = r < 0.25 ? 10 : r < 0.85 ? 3 : -8;
        const my = scoreFn(S, POS_INFO, clutch, miniBonus, rand);
        const rows = [{ score: my, me: true }, ...act.rivals.map((x) => ({ score: x.pop + rand(-8, 8) }))]
          .sort((a, b) => b.score - a.score);
        const rank = rows.findIndex((x) => x.me) + 1;
        let pay = 30, dFan;
        if (rank === 1) { act.wins++; act.cbWins++; S.career.wins++; pay += 100; dFan = weekFanFn[0](randInt); }
        else if (rank <= 3) dFan = weekFanFn[1](randInt);
        else dFan = weekFanFn[2](randInt);
        S.fandom = Math.max(0, S.fandom + dFan);
        S.money += pay;
        showCdFn(S, randInt, clamp);
        if (w < WEEKS_PER_CB) { S.camp = 2; runCamp(); }
      }
      act.sales += salesFn(S, act, rand);
    }

    // finishYear
    const hype = hypeFn(act, agePenFn(S), clamp);
    S.fandom = Math.max(0, S.fandom + yearFanFn(hype, act.wins));
    const awards = daesangFn(S, hype, [], rand);
    S.career.sales += act.sales;
    S.career.years.push({ y, hype, wins: act.wins, sales: act.sales, awards });
    for (const key of STAT_KEYS) yearStatFn(S, { key }, rand, clamp, statCap);
    S.money += incomeFn(act.sales, act.wins);

    // 연말 정산금으로 장비 구입 (openShop) — 가장 싼 티어부터 채운다
    let bought = true;
    while (bought) {
      bought = false;
      for (const k of A.gearOrder) {
        const owned = GEAR_TIERS.filter((t) => S.gear[`${k}-${t.n}`]).length;
        const tier = GEAR_TIERS[owned];
        if (tier && S.money >= tier.price) {
          S.money -= tier.price;
          S.gear[`${k}-${tier.n}`] = true;
          S.stats[k] = clamp(S.stats[k] + tier.bonus, 0, statCap(k));
          bought = true;
        }
      }
    }

    // yearReport에서 월드투어 버튼이 뜨는 시점 = tourReady()가 처음 참이 되는 해
    if (tourReady()) {
      if (!out.year) { out.year = y; out.path = S.career.daesang >= NEED_D ? "대상" : "팬덤"; out.daeAt = S.career.daesang; }
      // 열린 해부터는 해마다 한 번씩 투어를 돈다 (도시 수·보상이 팬덤에 다시 얹힌다)
      const n = tourCities();
      const avg = simTour(S, n);
      const rew = tourRewFn(n, avg, TOUR_MUL[tourGrade(avg)]);
      S.fandom += rew.dFan;
      S.money += rew.income;
      S.career.tours += 1;
      out.cities.push(n);
    }
  }
  out.dae = S.career.daesang;
  out.fandom = Math.round(S.fandom);
  if (!out.year) out.year = 99;
  return out;
}

// ---------- 측정 ----------
const N = 500;
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

console.log(`열림 조건: 대상 ${NEED_D}회 또는 팬덤 ${NEED_F} (${N}판씩 · 10년차 강제 은퇴)\n`);

const res = {};
for (const A of ARCHETYPES) {
  const runs = Array.from({ length: N }, () => runCareer(A));
  const open = runs.filter((r) => r.year < 99);
  const yrs = open.map((r) => r.year).sort((a, b) => a - b);
  const avg = yrs.length ? yrs.reduce((a, b) => a + b, 0) / yrs.length : 99;
  const mean = (f, a = runs) => a.reduce((x, r) => x + f(r), 0) / (a.length || 1);
  res[A.label] = {
    avg, med: yrs.length ? yrs[yrs.length >> 1] : 99, min: yrs[0] || 99, open: open.length,
    early: runs.filter((r) => r.year <= 4).length,
    dae: open.filter((r) => r.path === "대상").length,
    maxCity: Math.max(0, ...runs.map((r) => Math.max(0, ...r.cities))),
    endFandom: mean((r) => r.fandom), endDae: mean((r) => r.dae),
  };
  const hist = {};
  for (const r of runs) hist[r.year] = (hist[r.year] || 0) + 1;
  const line = Array.from({ length: LAST_YEAR }, (_, i) => i + 1)
    .map((y) => `${y}년:${String(hist[y] || 0).padStart(3)}`).join(" ");
  const R = res[A.label];
  console.log(A.label);
  console.log(`  ${line}  못 엶:${hist[99] || 0}`);
  console.log(`  평균 ${R.avg.toFixed(1)}년차 · 중앙값 ${R.med}년차 · 최속 ${R.min}년차 · 열림 ${R.open}/${N}`);
  console.log(`  경로: 대상 ${R.dae} / 팬덤 ${R.open - R.dae}` +
    ` · 은퇴 시점 평균 팬덤 ${Math.round(R.endFandom)} · 통산 대상 ${R.endDae.toFixed(1)}회` +
    ` · 투어 최대 도시 ${R.maxCity}곳\n`);
}

const hard = res["강하게(최적화)"], mid = res["보통"];

// ---------- 목표: 강하게 키운 플레이어 기준 6~8년차 ----------
check(hard.avg >= 6 && hard.avg <= 8, `강하게 키우면 6~8년차에 열린다 (평균 ${hard.avg.toFixed(1)}년차)`);
check(hard.med >= 6 && hard.med <= 8, `중앙값도 6~8년차다 (${hard.med}년차)`);
check(hard.open >= N * 0.9, `강하게 키우면 거의 모든 판이 열린다 (${hard.open}/${N})`);
check(hard.early <= N * 0.02, `4년차 이전에 열리는 판은 드물다 (${hard.early}/${N})`);

// 후반 목표라는 성질 — 보통으로 키우면 늦거나 못 본다. 다만 아예 죽은 콘텐츠도 아니다.
check(mid.avg > hard.avg + 1, `보통으로 키우면 훨씬 늦게 열린다 (${mid.avg.toFixed(1)}년차 vs ${hard.avg.toFixed(1)}년차)`);
check(mid.open >= N * 0.3, `보통으로도 은퇴 전에 열리는 판이 있다 (${mid.open}/${N})`);
check(mid.open <= N * 0.95, `보통으로는 못 여는 판도 있다 (${N - mid.open}/${N} 못 엶)`);

// 두 조건이 둘 다 살아 있어야 한다 (or로 둔 이유)
check(hard.dae > 0 && hard.open - hard.dae > 0,
  `대상 경로와 팬덤 경로가 둘 다 실제로 쓰인다 (대상 ${hard.dae} / 팬덤 ${hard.open - hard.dae})`);
check(NEED_F <= hard.endFandom, `팬덤 기준이 실제 도달 범위 안이다 (기준 ${NEED_F} ≤ 은퇴 평균 ${Math.round(hard.endFandom)})`);

// 도시 수 4~8도 실제로 늘어나야 한다 (안 늘면 4곳짜리 상수와 같다)
check(hard.maxCity >= 6, `투어 도시가 후반에 실제로 늘어난다 (최대 ${hard.maxCity}곳)`);

console.log(fail ? "\n❌ 조건 수치를 조정하세요" : "\n✅ 페이싱 적절");
process.exit(fail ? 1 : 0);
