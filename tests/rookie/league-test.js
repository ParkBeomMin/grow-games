/* ⚾ 리그 사다리 — 상위 리그로 갈수록 상대가 세지고 수상 가치가 커지는지 봐요.
 *
 * 더 드래프트는 시리즈에서 가장 깊은 게임인데 후반 목표가 없었어요. 8년차 FA로
 * 강팀에 가는 게 끝이었죠. KBO 커리어의 가장 큰 사건인 해외 진출이 게임에 없었어요.
 *
 * ⚽ 축구와 결정적으로 다른 점: 축구는 평가가 순위 기반이라 경기 평점을 깎았지만,
 * 야구는 평가가 타율·홈런·방어율에서 나와요. 그래서 상대 수준(oppStr)만 올리면
 * 그 숫자가 자연히 내려갑니다. 실제로 벌어지는 일과도 같아요 —
 * 메이저에서 타율이 떨어지는 건 투수가 좋기 때문이죠.
 * WAR이 내려가면 MVP·골든글러브가 자동으로 어려워지니, 축구에서 필요했던
 * 문턱(bar)을 여기서는 두지 않아요.
 *
 * 산식은 전부 소스에서 정규식으로 뽑아요 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 떠요.
 * 직접 eval(`const x = …`)은 쓰지 않아요. 선언이 eval 자기 스코프에 갇혀서 바깥으로
 * 새지 않고, 산식을 뭘로 바꾸든 undefined가 나와 테스트가 통과해버려요.
 * 그래서 new Function으로 감싸 return 합니다.
 *
 * 타석·위기 판정은 clutch()에 기대고, clutch는 전역 S(talents·trans)를 읽어요.
 * 그래서 아래 new Function들은 S를 파라미터로 받아 떼어 온 선언이 그 S를 잡게 감쌌어요
 * (tests/soccer/rating-test.js가 같은 문제를 이렇게 풀어놨어요).
 *
 * LEAGUES·leagueOf는 game.js에 둬요. career.js는 IIFE라 그 안의 선언이 밖으로 안 새는데,
 * 다음 단계에서 game.js 쪽(구단 전력·화면)도 리그를 읽어야 하기 때문이에요. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/rookie";
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const grab = (src, re) => { const mm = src.match(re); return mm ? mm[0] : null; };

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
// 아직 없는 이름을 쓰는 검사는 던지면서 죽어요. 그 자체가 실패지, 테스트 중단은 아니에요.
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

/* 리그가 붙기 전에도 돌아가야 하는 조각들이에요. 이건 없으면 테스트를 못 여니 필수예요. */
const parts = {
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  crisisRuns: grab(GAME, /function crisisRuns\(res, oppStr, lgUp\) \{[\s\S]*?\n\}/),
  outTxt: grab(GAME, /const OUT_TXT = \[[\s\S]*?\n\];/),
  hitP: grab(GAME, /const hitP = clamp\([\s\S]*?;/),
  // 타석 판정 한 덩어리 — 안타·홈런·도루가 한 곳에 있어서 통째로 떼어 와 돌려요
  doResBat: grab(GAME, /const doRes = \(res\) => \{[\s\S]*?\n {6}\};/),
  // 시즌 결산의 WAR 산식과 수상 판정 — 난이도가 여기까지 흘러야 사다리가 성립해요
  warBlock: grab(SRC, /let line, raw, war;[\s\S]*?\n {4}war = Math\.round\(war \* 10\) \/ 10;/),
  awards: grab(SRC, /const awards = \[\];[\s\S]*?"골든글러브"\);[^\n]*\n {4}\}/),
  // 투수 등판 — 이닝과 탈삼진은 스탯이 정하고, 실점만 위기 판정이 정해요
  pitIp: grab(SRC, /const ip = clamp\(4 \+[^;]+;/),
  pitK: grab(SRC, /const kBase = clamp\([^;]+;/),
  pitCrisisCnt: grab(SRC, /const crisisCnt = randInt\([^;]+;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

/* 리그 조각은 '있으면 넣는다'예요. 아직 없는 이름을 필수로 걸면 고치기 전에는
 * 테스트가 아예 못 돌아 빨간불의 내용을 볼 수 없어요. 없으면 그 이름을 쓰는 검사가
 * ReferenceError로 떨어지고, 그게 우리가 보고 싶은 빨간불이에요.
 * 값은 절대 여기 옮겨 적지 않아요 — 소스에 적힌 그대로 실행합니다. */
const leagueParts = {
  LEAGUES: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  leagueOf: grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  // oppFor — 팀 전력에 리그 난이도를 얹어 타석·위기 판정에 넘기는 통로예요
  oppFor: grab(SRC, /function oppFor\(name\) \{[\s\S]*?\n {2}\}/),
  /* 위기 실점 '크기'에 리그 난이도를 거는 계수예요. 이게 없으면 상위 리그에서
   * 실투(miss) 분기가 KBO와 한 톨도 안 달라져서 투수가 리그를 못 느껴요. */
  crisisK: grab(GAME, /const CRISIS_LEAGUE_K = [^;]+;/),
  crisisCap: grab(GAME, /const CRISIS_LEAGUE_CAP = [^;]+;/),
};
const leagueMissing = Object.entries(leagueParts).filter(([, v]) => !v).map(([k]) => k);
const leagueSrc = [leagueParts.LEAGUES, leagueParts.leagueOf].filter(Boolean).join("\n");
// crisisRuns 본문이 읽는 상수예요. 없으면 그 이름을 쓰는 검사가 ReferenceError로 떨어지고,
// 그게 우리가 보고 싶은 빨간불이에요 (값은 절대 여기 옮겨 적지 않아요).
const crisisConsts = [leagueParts.crisisK, leagueParts.crisisCap].filter(Boolean).join("\n");

check(leagueMissing.length === 0,
  leagueMissing.length
    ? `${leagueMissing.join(" · ")} is not defined — 리그가 아직 없어요`
    : "LEAGUES · leagueOf · CRISIS_LEAGUE_K가 game.js에, oppFor가 career.js에 있다");

const table = leagueParts.LEAGUES ? new Function(`${leagueParts.LEAGUES} return LEAGUES;`)() : null;
const byTier = (table || []).slice().sort((a, b) => a.tier - b.tier);
// 화면 문구는 소스의 리그 이름을 그대로 써요 — 여기 옮겨 적으면 이름이 바뀌어도 안 들켜요
const L = (tier) => {
  const l = byTier.find((x) => x.tier === tier);
  // 표가 없으면 여기서 던져요. 안 그러면 빈 배열 위를 도는 검사들이 조용히 초록으로 떠요.
  if (!l) throw new Error(`tier ${tier} 리그가 없어요`);
  return l;
};
const NAME = (tier) => L(tier).name;

const leagueOfFn = leagueParts.leagueOf ? new Function("st", `${leagueSrc} return leagueOf(st);`) : null;
/* oppFor는 career.js의 IIFE 안에 있어서 teamStrOf·S를 클로저로 읽어요.
 * 떼어 온 뒤 그 두 이름을 파라미터로 넣어 같은 모양을 만들어요. */
const oppForFn = leagueParts.oppFor
  ? new Function("S", "teamStrOf", `${leagueSrc} ${leagueParts.oppFor} return oppFor;`)
  : null;

// ① 리그 표 — 3단 사다리고 tier가 겹치지 않아요
guard("리그 표", () => {
  check(table.length === 3, `LEAGUES가 3개다 (${table.length}개)`);
  const tiers = table.map((l) => l.tier).sort((a, b) => a - b);
  check(tiers.join(",") === "1,2,3", `tier가 1·2·3으로 겹치지 않는다 (${tiers.join("·")})`);
  const ids = table.map((l) => l.id);
  check(new Set(ids).size === ids.length, `id가 겹치지 않는다 (${ids.join("·")})`);
  check(table.every((l) => l && l.name && l.short && l.flag),
    `리그마다 name · short · flag가 있다 (${table.map((l) => `${l.flag}${l.name}`).join(" · ")})`);
  check(table.every((l) => typeof l.oppUp === "number" && typeof l.prestige === "number"),
    "리그마다 oppUp · prestige가 숫자다");
  /* 실제 리그명을 쓰지 않아요 — 이 저장소는 상표를 전부 가상 명칭으로 바꿨어요.
   * KBO만 이미 코드에 있던 이름이라 그대로 둡니다. */
  const real = ["NPB", "일본프로야구", "메이저리그", "MLB", "내셔널리그", "아메리칸리그", "퍼시픽리그", "센트럴리그"];
  const hit = table.filter((l) => real.some((r) => l.name.includes(r))).map((l) => l.name);
  check(hit.length === 0, `실제 리그명을 쓰지 않는다 (${hit.length ? hit.join("·") : "없음"})`);
});

// ② KBO는 항등원이다 — 진행 중인 캐릭터의 성적이 안 튀어야 해요
guard("KBO 기본값", () => {
  const kbo = table.find((l) => l.id === 1);
  check(!!kbo && kbo.oppUp === 0, `id 1의 oppUp이 0이다 (${kbo ? kbo.oppUp : "없음"})`);
  check(!!kbo && kbo.prestige === 1, `id 1의 prestige가 1이다 (${kbo ? kbo.prestige : "없음"})`);
  check(!!kbo && kbo.tier === 1, `id 1이 사다리의 맨 아래(tier 1)다 (tier ${kbo ? kbo.tier : "없음"})`);
});

// ③ 옛 세이브 방어 — S.league가 없거나 깨져 있으면 KBO예요 (마이그레이션을 하지 않아요)
guard("리그 조회", () => {
  check(leagueOfFn({}).id === 1, `leagueOf({})가 KBO다 (id ${leagueOfFn({}).id})`);
  check(leagueOfFn(undefined).id === 1, `leagueOf(undefined)가 KBO다 (id ${leagueOfFn(undefined).id})`);
  check(leagueOfFn({ league: 99 }).id === 1, `leagueOf({league:99})가 KBO로 막힌다 (id ${leagueOfFn({ league: 99 }).id})`);
  const broken = [0, -1, "3", null, NaN, {}].map((v) => leagueOfFn({ league: v }).id);
  check(broken.every((id) => id === 1), `깨진 league 값이 전부 KBO로 막힌다 (${broken.join("·")})`);
  const ok = table.map((l) => leagueOfFn({ league: l.id }).id);
  check(ok.every((id, i) => id === table[i].id), `지정한 리그는 그대로 돌려준다 (${ok.join("·")})`);
});

// ④ 사다리 — tier 순서대로 상대가 세지고 수상 가치가 커져요. 순서는 id가 아니라 tier예요
guard("사다리", () => {
  if (byTier.length !== 3) throw new Error("리그 표가 없어요");
  const ups = byTier.map((l) => l.oppUp), pres = byTier.map((l) => l.prestige);
  let upOk = true, prOk = true;
  for (let i = 1; i < byTier.length; i++) {
    if (!(ups[i] > ups[i - 1])) upOk = false;
    if (!(pres[i] > pres[i - 1])) prOk = false;
  }
  check(upOk, `tier 순서대로 oppUp이 커진다 (${ups.join(" < ")})`);
  check(prOk, `tier 순서대로 prestige가 커진다 (${pres.join(" < ")})`);
});

/* ---------- 산식 실행기 ---------- */

const hitPFn = new Function("S", "oppStr", "clamp", `
  ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.hitP}
  return hitP;
`);
const autoResFn = new Function("S", "stat", "clamp", `${parts.autoRes} return autoRes(stat);`);
/* 위기 판정 — 세 번째 인자가 리그 난이도예요(팀 전력과 갈라져 있어요).
 * 안 넘기면 KBO(0)와 같아야 해서, 인자 개수까지 소스 그대로 흉내내요. */
const crisisFn = new Function("S", "res", "oppStr", "lgUp", "clamp", "rand", "randInt", `
  ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${crisisConsts}
  ${parts.crisisRuns}
  return lgUp === undefined ? crisisRuns(res, oppStr) : crisisRuns(res, oppStr, lgUp);
`);
/* 타석 한 번 — 소스의 doRes를 그대로 돌려요. 화면·연출에 닿는 이름만 빈 껍데기로 채워요. */
const abFn = new Function("S", "perf", "story", "res", "clamp", "rand", "randInt", "pick", `
  ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.outTxt}
  const i = 0;
  const applyStep = () => {};
  const resume = () => {};
  const oppStr = () => S.__opp;
  ${parts.doResBat}
  doRes(res);
`);
const seasonEndFn = new Function("S", "t", "clamp", "rand", `
  ${parts.warBlock}
  ${parts.awards}
  return { war, awards };
`);
const pitStartFn = new Function("S", "clamp", "randInt", `${parts.pitIp} ${parts.pitK} return { ip, kBase };`);

const batState = (stat, over = {}) => ({
  pos: "batter", proYear: 5, condition: 80, trans: {},
  stats: { contact: stat, power: stat, run: stat, defense: stat, stamina: stat },
  talents: { contact: 1.3, power: 1.3, run: 1.3, defense: 1.3, stamina: 1.3 },
  career: { roy: 0, mvp: 0, gg: 0 }, __opp: 0.49, ...over,
});
const pitState = (stat, over = {}) => ({
  pos: "pitcher", role: "선발 투수", proYear: 5, condition: 80, trans: {},
  stats: { velocity: stat, control: stat, breaking: stat, defense: stat, stamina: stat },
  talents: { velocity: 1.3, control: 1.3, breaking: 1.3, defense: 1.3, stamina: 1.3 },
  career: { roy: 0, mvp: 0, gg: 0 }, ...over,
});

/* 리그 평균 상대예요. game.js가 "안 넘기는 경로는 리그 평균(0.49)으로 봅니다"라고
 * 적어둔 그 값이고, teamStrOf가 뽑는 0.38~0.60의 한가운데이기도 해요. */
const AVG_OPP = 0.49;
const oppAt = (tier, base = AVG_OPP) => base + L(tier).oppUp;

// ⑤ 난이도가 타격에 실제로 작용한다 — 같은 능력치인데 위 리그에서 덜 맞아요
guard("타격 난이도", () => {
  const STATS = [70, 100, 130];
  if (byTier.length !== 3) throw new Error("리그 표가 없어요");
  console.log("=== ⑤ 리그별 안타 확률(hitP · 리그 평균 상대) ===");
  let downAll = true;
  for (const st of STATS) {
    const row = byTier.map((l) => hitPFn(batState(st), () => oppAt(l.tier), clamp));
    console.log(`  능력치 ${String(st).padStart(3)} | ${row.map((v, i) => `${NAME(byTier[i].tier)} ${v.toFixed(4)}`).join(" · ")}`);
    for (let i = 1; i < row.length; i++) if (!(row[i] < row[i - 1])) downAll = false;
  }
  check(downAll, `tier가 올라갈수록 안타 확률이 내려간다 (능력치 ${STATS.join("·")} 전부)`);
  const top = hitPFn(batState(110), () => oppAt(3), clamp);
  const kbo = hitPFn(batState(110), () => oppAt(1), clamp);
  check(top < kbo * 0.9,
    `능력치 110에서 ${NAME(3)} 안타 확률이 ${NAME(1)}보다 10% 넘게 낮다 (${kbo.toFixed(4)} → ${top.toFixed(4)})`);
});

/* ⑥ 투구에도 작용한다 — 같은 위기인데 위 리그에서 더 실점해요.
 *
 * 예전에는 리그 난이도가 hold(완전 봉쇄 확률)에만 걸려서 실점 '크기'가 리그와
 * 무관했어요. 특히 실투(miss) 분기는 randInt(1,3) 고정이라 대륙 리그가 KBO와
 * 한 톨도 안 달랐고, 위기 한 번당 실점이 2%밖에 안 늘었어요. 그게 투수의 WAR
 * 하락폭을 타자의 1/12로 만든 원인이에요.
 * 이제 lgUp이 실점 크기에도 걸리니, 옆칸끼리도 눈에 보이게 벌어져야 해요. */
guard("투구 난이도", () => {
  const N = Number(process.env.CRISIS_N || 200000);
  if (byTier.length !== 3) throw new Error("리그 표가 없어요");
  const mean = (stat, tier) => {
    const S = pitState(stat);
    let s = 0;
    for (let i = 0; i < N; i++) {
      s += crisisFn(S, autoResFn(S, stat, clamp), oppAt(tier), L(tier).oppUp, clamp, rand, randInt);
    }
    return s / N;
  };
  console.log(`=== ⑥ 위기 한 번당 평균 실점 (리그별 ${N}회) ===`);
  let upAll = true;
  for (const st of [70, 110, 130]) {
    const row = byTier.map((l) => mean(st, l.tier));
    console.log(`  능력치 ${String(st).padStart(3)} | ${row.map((v, i) => `${NAME(byTier[i].tier)} ${v.toFixed(4)}`).join(" · ")}`);
    for (let i = 1; i < row.length; i++) if (!(row[i] > row[i - 1])) upAll = false;
    if (st === 110) {
      check(row[2] > row[0] * 1.10,
        `능력치 110의 ${NAME(3)} 위기 실점이 ${NAME(1)}보다 10% 넘게 많다 (${row[0].toFixed(4)} → ${row[2].toFixed(4)})`);
    }
  }
  check(upAll, "tier가 올라갈수록 위기 실점이 많아진다 (능력치 70·110·130 전부, 옆칸끼리도)");

  /* 실점 '크기'에 실제로 걸렸는지 직접 물어봐요. hold만 건드리는 구현이면
   * 막아낸 위기(0실점)의 비율만 바뀌고, 무너진 위기의 평균 크기는 그대로예요.
   * 그 상태가 정확히 이 태스크 전의 버그라, 여기가 되돌아가는 걸 막는 자리예요. */
  const sizeOf = (tier) => {
    const S = pitState(110);
    let s = 0, n = 0;
    for (let i = 0; i < N; i++) {
      const r = crisisFn(S, autoResFn(S, 110, clamp), oppAt(tier), L(tier).oppUp, clamp, rand, randInt);
      if (r > 0) { s += r; n++; }
    }
    return s / n;
  };
  const sz = byTier.map((l) => sizeOf(l.tier));
  console.log(`  무너진 위기의 평균 실점 크기 | ${sz.map((v, i) => `${NAME(byTier[i].tier)} ${v.toFixed(4)}`).join(" · ")}`);
  check(sz[2] > sz[0] * 1.10,
    `${NAME(3)}는 무너진 위기의 실점 크기 자체가 ${NAME(1)}보다 10% 넘게 크다 (${sz[0].toFixed(4)} → ${sz[2].toFixed(4)})`);
});

/* ⑦ hitP 하한(0.10)에 붙지 않는다 — 이 태스크에서 가장 위험한 자리예요.
 *
 * oppUp을 크게 잡으면 약한 타자의 hitP가 하한에 눌려서, 거기서부터는 난이도를
 * 아무리 올려도 결과가 같아져요. ⚽ 축구의 평점 천장(clamp(myScore/10, 1, 10)이
 * 능력치 60부터 상한에 붙던 것)이 정확히 그 실패였어요. */
guard("하한 천장", () => {
  const STATS = [];
  for (let s = 40; s <= 130; s += 10) STATS.push(s);
  const row = STATS.map((s) => hitPFn(batState(s), () => oppAt(3), clamp));
  console.log(`=== ⑦ ${NAME(3)} 안타 확률 (능력치 40~130 · 리그 평균 상대) ===`);
  console.log(`  ${STATS.map((s, i) => `${s}:${row[i].toFixed(3)}`).join(" · ")}`);
  const lo = Math.min(...row);
  check(lo >= 0.115, `능력치 40~130 전 구간에서 ${NAME(3)} 안타 확률이 0.115 이상이다 (최저 ${lo.toFixed(4)})`);

  /* 하한에 눌렸는지 직접 물어봐요 — 난이도를 1.5배로 키웠을 때 값이 더 내려가야 해요.
   * 하한에 붙어 있으면 두 값이 같아지고, 그게 "난이도가 더 안 올라가는" 상태예요. */
  const harder = STATS.map((s) => hitPFn(batState(s), () => AVG_OPP + L(3).oppUp * 1.5, clamp));
  const stuck = STATS.filter((s, i) => !(harder[i] < row[i]));
  check(stuck.length === 0,
    `난이도를 1.5배로 키우면 전 구간에서 안타 확률이 더 내려간다 (하한에 눌린 능력치 ${stuck.length ? stuck.join("·") : "없음"})`);

  /* 최악의 상대까지 봐요. teamStrOf의 드리프트 상한이 0.63이라 그게 리그 최강팀이에요.
   * 능력치 60 아래는 프로 1군에 설 수준이 아니라 여기서 빼요 — 실제로 하한에 닿는
   * 조합이 남아 있으면 어디까지가 안전한지 이 줄이 알려줘요. */
  const WORST = 0.63;
  const worstStats = STATS.filter((s) => s >= 60);
  const worst = worstStats.map((s) => hitPFn(batState(s), () => oppAt(3, WORST), clamp));
  const floored = worstStats.filter((s, i) => worst[i] <= 0.1001);
  console.log(`  리그 최강팀(전력 ${WORST}) 상대: ${worstStats.map((s, i) => `${s}:${worst[i].toFixed(3)}`).join(" · ")}`);
  check(floored.length === 0,
    `능력치 60 이상은 리그 최강팀을 만나도 하한에 안 닿는다 (닿은 능력치 ${floored.length ? floored.join("·") : "없음"})`);
});

/* ⑧ KBO에서는 아무것도 안 바뀐다 — oppUp 0이라 항등이어야 해요.
 * 진행 중인 캐릭터의 성적이 안 튄다는 뜻이고, 기존 저장 데이터를 마이그레이션하지
 * 않기로 한 근거이기도 해요. 평균이 아니라 한 톨까지 같아야 합니다. */
guard("KBO 항등", () => {
  // 난이도 항이 실제로 들어 있어야 해요. 안 넣고 통과하는 걸 막는 자리예요.
  check(/leagueOf\([^)]*\)\.oppUp/.test(leagueParts.oppFor || ""),
    "oppFor에 leagueOf(...).oppUp 항이 들어 있다");
  // 그리고 그 통로를 타석·위기 판정이 실제로 써야 해요
  check((SRC.match(/oppStr: oppFor\(opp\)/g) || []).length === 2,
    `타자·투수 경기가 oppStr로 oppFor(opp)를 넘긴다 (${(SRC.match(/oppStr: oppFor\(opp\)/g) || []).length}곳)`);
  check(!/oppStr: teamStrOf\(/.test(SRC), "리그를 안 거치는 옛 통로(oppStr: teamStrOf)가 남아 있지 않다");
  /* 🌏 실점 크기 쪽 통로(lgUp)는 팀 전력이 섞이지 않은 '리그 난이도만'이어야 해요.
   * 여기에 oppFor(팀 전력 + 리그)를 넘기면 KBO에서 강팀을 만날 때도 실점이 커져서
   * 이미 맞춰둔 팀 전력 밸런스가 흔들려요. 그래서 모양까지 못 박아요. */
  check(/crisisRuns\(res, oppFor\(opp\), leagueOf\(S\)\.oppUp\)/.test(SRC),
    "구원 등판 위기가 팀 전력(oppFor)과 리그 난이도(leagueOf(S).oppUp)를 갈라서 넘긴다");
  check(/lgUp: leagueOf\(S\)\.oppUp/.test(SRC),
    "선발 등판이 lgUp으로 leagueOf(S).oppUp을 넘긴다");
  check(/crisisRuns\(res, oppStr\(\), lgUp\(\)\)/.test(GAME),
    "선발 위기 판정이 crisisRuns(res, oppStr(), lgUp())을 부른다");
  check(!/lgUp: oppFor\(|crisisRuns\([^)]*oppFor\(opp\)\s*\)/.test(SRC),
    "lgUp 자리에 팀 전력이 섞인 값(oppFor)이 들어가 있지 않다");
  // 그리고 crisisRuns가 그 인자를 실제로 실점 크기에 써야 해요
  check(/CRISIS_LEAGUE_K/.test(parts.crisisRuns) && /runs \+= 1/.test(parts.crisisRuns),
    "crisisRuns가 리그 난이도로 실점을 키우는 항을 갖고 있다");
  /* 순위표·팀 승률은 teamStrOf 그대로여야 해요. 거기까지 oppUp을 얹으면
   * 리그를 옮긴 순간 우리 팀 승률이 같이 무너져요 (축구에서 그 자리를 놓쳐
   * 수비수 팀 승률이 7%가 된 적이 있어요). */
  check(/const teamBonus = \(teamStrOf\(S\.team\) - 0\.49\)/.test(SRC),
    "팀 승률(teamWinP)은 oppUp이 안 섞인 teamStrOf를 쓴다");

  const teamStr = { "가": 0.42, "나": 0.49, "다": 0.58 };
  const teamStrOf = (n) => teamStr[n];
  const kboS = { league: 1 }, oldS = {};
  let bad = 0;
  for (const n of Object.keys(teamStr)) {
    if (oppForFn(kboS, teamStrOf)(n) !== teamStrOf(n)) bad++;
    if (oppForFn(oldS, teamStrOf)(n) !== teamStrOf(n)) bad++;   // 옛 세이브(league 없음)
  }
  check(bad === 0, `KBO·옛 세이브의 상대 수준이 teamStrOf와 한 톨까지 같다 (어긋난 값 ${bad}건)`);

  /* 씨앗 고정 난수 — 리그를 거친 값과 안 거친 값에 똑같은 난수를 똑같은 순서로 먹여요.
   * crisisRuns는 randInt만이 아니라 Math.random()도 직접 부르니 그것까지 갈아끼워야 해요.
   * 안 그러면 두 쪽이 서로 다른 난수를 먹고 '항등'을 영영 못 보여줍니다. */
  let seed = 0;
  const seeded = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const fRand = (a, b) => a + seeded() * (b - a);
  const fInt = (a, b) => Math.floor(fRand(a, b + 1));
  const realRandom = Math.random;
  Math.random = seeded;
  let hBad = 0, cBad = 0;
  try {
    for (let i = 0; i < 3000; i++) {
      const stat = 30 + (i % 130), name = ["가", "나", "다"][i % 3];
      const bS = batState(stat), pS = pitState(stat);
      const withL = oppForFn(kboS, teamStrOf)(name), noL = teamStrOf(name);
      if (hitPFn(bS, () => withL, clamp) !== hitPFn(bS, () => noL, clamp)) hBad++;
      for (const res of ["perfect", "good", "miss"]) {
        // 리그를 거친 값 · 안 거친 값 · 리그 인자를 아예 안 넘긴 옛 호출부, 셋이 같아야 해요
        seed = i + 1; const a = crisisFn(pS, res, withL, L(1).oppUp, clamp, fRand, fInt);
        seed = i + 1; const b = crisisFn(pS, res, noL, undefined, clamp, fRand, fInt);
        seed = i + 1; const c = crisisFn(pS, res, withL, undefined, clamp, fRand, fInt);
        if (a !== b || a !== c) cBad++;
      }
    }
  } finally { Math.random = realRandom; }
  check(hBad === 0, `KBO 안타 확률이 리그 도입 전과 한 톨까지 같다 (3000회, 어긋난 값 ${hBad}건)`);
  check(cBad === 0, `KBO 위기 실점이 리그 도입 전과 한 톨까지 같다 (9000회, 어긋난 값 ${cBad}건)`);

  /* 값이 같은 것만으로는 부족해요. KBO에서 난수를 '한 번 더' 뽑으면 그 뒤로 이어지는
   * 경기의 모든 판정이 예전과 어긋납니다 — 값은 같은데 세계가 달라져요.
   * 그래서 위기 한 번이 소비하는 난수 개수까지 못 박아요.
   * 실투(miss)는 randInt 한 번, 퍼펙트는 봉쇄 판정 한 번, '좋음'은 봉쇄 판정 뒤
   * 뚫렸을 때만 randInt가 붙어 한 번 또는 두 번이에요. */
  let calls = 0;
  const counted = () => { calls++; return seeded(); };
  const cRand = (a, b) => a + counted() * (b - a);
  const cInt = (a, b) => Math.floor(cRand(a, b + 1));
  const WANT = { perfect: [1], good: [1, 2], miss: [1] };
  const realRandom2 = Math.random;
  Math.random = counted;
  let nBad = 0, nUp = 0;
  try {
    for (let i = 0; i < 2000; i++) {
      const pS = pitState(40 + (i % 100));
      for (const res of ["perfect", "good", "miss"]) {
        seed = i + 1; calls = 0;
        const r0 = crisisFn(pS, res, AVG_OPP, L(1).oppUp, clamp, cRand, cInt);
        const base = calls;
        if (!WANT[res].includes(base)) nBad++;
        /* 상대 수준은 그대로 두고 리그 난이도만 바꿔요 — 앞부분 판정이 똑같은 난수를
         * 똑같이 먹으니, 늘어난 개수가 곧 '한 방 더' 판정 하나예요.
         * 막아낸 위기(0실점)에는 안 붙어야 해요. */
        seed = i + 1; calls = 0;
        crisisFn(pS, res, AVG_OPP, L(3).oppUp, clamp, cRand, cInt);
        if (calls !== base + (r0 > 0 ? 1 : 0)) nUp++;
      }
    }
  } finally { Math.random = realRandom2; }
  check(nBad === 0, `KBO 위기 한 번이 예전과 똑같은 개수의 난수만 쓴다 (6000회, 어긋난 경우 ${nBad}건)`);
  check(nUp === 0, `상위 리그는 무너진 위기에서만 난수를 한 번 더 쓴다 (6000회, 어긋난 경우 ${nUp}건)`);

  /* 팀 전력의 효과는 그대로여야 해요 — KBO 안에서 약팀·평균·강팀을 만날 때의 차이는
   * 리그가 붙기 전과 같은 값이어야 합니다. 위의 항등 검사가 한 톨까지 같음을 보였으니,
   * 여기서는 그 차이가 실제로 살아 있는지(0으로 뭉개지지 않았는지)를 봐요. */
  const CN = Number(process.env.CRISIS_N || 200000) / 4;
  const kboMean = (str) => {
    const pS = pitState(110);
    let s = 0;
    for (let k = 0; k < CN; k++) s += crisisFn(pS, autoResFn(pS, 110, clamp), str, L(1).oppUp, clamp, rand, randInt);
    return s / CN;
  };
  const weak = kboMean(0.38), mid = kboMean(0.49), strong = kboMean(0.63);
  console.log(`  KBO 팀 전력별 위기 실점 | 약팀 ${weak.toFixed(4)} · 평균 ${mid.toFixed(4)} · 강팀 ${strong.toFixed(4)}`);
  check(weak < mid && mid < strong,
    `KBO 안에서 상대가 강할수록 위기 실점이 많다 (${weak.toFixed(4)} < ${mid.toFixed(4)} < ${strong.toFixed(4)})`);
});

/* ⑨ 목표 곡선 — 이 태스크의 핵심이에요.
 *
 * "실력이 되면 올라가는 게 이득, 안 되면 손해"가 지켜져야 해요.
 * 판단 기준은 수상 확률이 아니라 수상 확률 × prestige(명예의 전당 가치)예요.
 * 상위 리그에서는 상을 덜 받지만 그 상이 크게 남아요.
 *
 * 한 시즌(144경기)을 통째로 굴려요 — 타석 판정(game.js) → 시즌 누적 → WAR →
 * 수상 판정(career.js)까지가 한 사슬이라 중간을 흉내내면 의미가 없어요.
 * 수상 확률은 '한 시즌에 상을 하나라도 받을 확률'이에요(5년차라 신인왕은 안 나와요). */
const SEASON_TOTAL = 144;
function batterSeason(stat, tier) {
  const S = batState(stat);
  // 상대 9팀 — teamStrOf가 뽑는 분포(0.38~0.60)를 그대로 흉내내요
  const pool = Array.from({ length: 9 }, () => Math.round(rand(0.38, 0.60) * 1000) / 1000);
  const t = { ab: 0, hits: 0, hr: 0, sb: 0 };
  const story = { ourInn: Array(9).fill(0) };
  for (let g = 0; g < SEASON_TOTAL; g++) {
    S.__opp = pool[Math.floor(g / 3) % 9] + L(tier).oppUp;   // 3연전 단위로 상대가 바뀌어요
    const abs = randInt(3, 5);
    const perf = { ab: abs, hits: 0, hr: 0, sb: 0 };
    for (let a = 0; a < abs; a++) abFn(S, perf, story, autoResFn(S, stat, clamp), clamp, rand, randInt, pick);
    t.ab += perf.ab; t.hits += perf.hits; t.hr += perf.hr; t.sb += perf.sb;
  }
  return { ...seasonEndFn(S, t, clamp, rand), avg: t.hits / t.ab };
}

/* 투수 시즌도 통째로 굴려요. 선발은 로테이션 간격마다 등판하고, 등판마다 위기가
 * 두세 번 옵니다. 시즌 실점은 전부 그 위기에서 나와요 — 다른 실점 경로가 없어요.
 * 그래서 리그 난이도가 위기 판정에 안 닿으면 투수는 리그를 아예 못 느낍니다.
 *
 * 로테이션 간격·위기 횟수는 소스에서 뽑아 써요. 여기 옮겨 적으면 career.js가
 * 바뀌어도 초록이 떠요. 승수만 상수로 둡니다 — 팀 승률은 리그와 무관해서
 * 세 리그에 똑같이 얹히고, 리그 사이의 '차이'를 재는 데는 영향이 없어요. */
const ROT = Number((SRC.match(/n % \(post \? \d+ : (\d+)\) === 0/) || [])[1] || 0);
const WIN_IP = Number((SRC.match(/win && perf\.ip >= (\d+)/) || [])[1] || 0);
check(ROT > 0 && WIN_IP > 0, `선발 로테이션 간격(${ROT || "못 찾음"})과 승리 요건 이닝(${WIN_IP || "못 찾음"})을 소스에서 읽었다`);
const crisisCntFn = new Function("randInt", `${parts.pitCrisisCnt} return crisisCnt;`);
const TEAM_WIN = 0.55;
function pitcherSeason(stat, tier) {
  const S = pitState(stat);
  const pool = Array.from({ length: 9 }, () => Math.round(rand(0.38, 0.60) * 1000) / 1000);
  const up = L(tier).oppUp;
  const t = { ip: 0, k: 0, er: 0, wins: 0, saves: 0, g: 0 };
  for (let g = 0; g < SEASON_TOTAL; g++) {
    if (g % ROT !== 0) continue;                       // 로테이션이 도는 날만 등판해요
    const oppTeam = pool[Math.floor(g / 3) % 9];       // 3연전 단위로 상대가 바뀌어요
    const { ip, kBase } = pitStartFn(S, clamp, randInt);
    let runs = 0;
    const cnt = crisisCntFn(randInt);
    // 상대 수준에는 리그가 섞여 있고(oppFor), 실점 크기에는 리그 몫만 따로 걸려요
    for (let c = 0; c < cnt; c++) runs += crisisFn(S, autoResFn(S, stat, clamp), oppTeam + up, up, clamp, rand, randInt);
    t.ip += ip; t.k += kBase; t.er += runs; t.g += 1;
    if (Math.random() < TEAM_WIN && ip >= WIN_IP) t.wins += 1;
  }
  return { ...seasonEndFn(S, t, clamp, rand), era: (t.er * 9) / Math.max(t.ip, 1) };
}
const seasonOf = (kind, stat, tier) => (kind === "bat" ? batterSeason(stat, tier) : pitcherSeason(stat, tier));

/* 능력치 구간과 그때 최적이어야 하는 리그예요. 상한(STAT_CAP)이 130이라
 * 150은 초월로만 닿는 자리 — 대륙이 이득이 되는 지점이 후반 목표가 돼요.
 * 타자와 투수가 '같은' 사다리를 가져야 해요. 한쪽만 맞으면 포지션이 정답을 갈라요. */
const BANDS = [
  { stat: 100, want: 1, label: "평범" },
  { stat: 110, want: 1, label: "평범" },
  { stat: 130, want: 2, label: "준정상급" },
  { stat: 150, want: 3, label: "정상급" },
];
const LEAGUE_N = Number(process.env.LEAGUE_N || 3000);
const LEAGUE_SEED = Number(process.env.LEAGUE_SEED || 20260731);

/* 칸당 시즌 수. 가장 빠듯한 칸(능력치 110의 KBO ↔ 열도)이 24% 대 13%라
 * 그냥 굴리면 비율의 표준오차가 2000시즌에서 7%나 돼요 — 목표선(10%)에 1σ밖에
 * 안 남아서 열 번에 한 번쯤 난수로 뒤집혔어요.
 *
 * 그래서 세 리그에 '같은 난수'를 먹여요(공통 난수). 시즌 번호마다 씨앗을 고정하면
 * 상대 9팀도, 판정의 앞부분도 리그끼리 같아져서, 남는 차이가 곧 리그 난이도의 효과예요.
 * 우리가 재는 건 리그 사이의 '차이'라 이렇게 하면 훨씬 적은 표본으로 같은 정밀도를
 * 얻고, 덤으로 실행할 때마다 값이 같아 재현이 됩니다. */
function cellsFor(kind, stat) {
  let seed = 0;
  const seeded = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const realRandom = Math.random;
  return byTier.map((l) => {
    let any = 0, war = 0, m = 0;
    // 🏛️ 상별로도 세어요 — 명예의 전당 점수는 상마다 배점이 달라서(⑫가 그걸 씁니다)
    const byAward = {};
    Math.random = seeded;
    try {
      for (let i = 0; i < LEAGUE_N; i++) {
        seed = (LEAGUE_SEED + Math.imul(stat, 1000003) + Math.imul(i, 2654435761)) >>> 0;
        const r = seasonOf(kind, stat, l.tier);
        war += r.war;
        m += kind === "bat" ? r.avg : r.era;
        if (r.awards.length) any++;
        for (const a of r.awards) byAward[a] = (byAward[a] || 0) + 1;
      }
    } finally { Math.random = realRandom; }
    const pOf = (a) => (byAward[a] || 0) / LEAGUE_N;
    return { p: any / LEAGUE_N, war: war / LEAGUE_N, m: m / LEAGUE_N, val: (any / LEAGUE_N) * l.prestige,
      league: l, pAward: { MVP: pOf("MVP"), 골든글러브: pOf("골든글러브"), 신인왕: pOf("신인왕") } };
  });
}
/* 사다리 한 판 — 능력치 구간마다 '수상 확률 × prestige'가 가장 큰 리그가
 * 목표 리그여야 하고, 차선보다 10% 넘게 높아야 해요. */
function checkLadder(kind, label) {
  const rows = [];
  console.log(`  능력치 | ${byTier.map((l) => `${l.name}(×${l.prestige})`.padStart(22)).join(" | ")} | 최적`);
  for (const b of BANDS) {
    const cells = cellsFor(kind, b.stat);
    rows.push({ band: b, cells });
    const best = cells.reduce((bi, c, i) => (c.val > cells[bi].val ? i : bi), 0);
    const second = cells.reduce((bi, c, i) => (i !== best && c.val > cells[bi].val ? i : bi), best === 0 ? 1 : 0);
    console.log(`  ${String(b.stat).padStart(6)} | ${cells.map((c) =>
      `${kind === "bat" ? "." + (c.m * 1000).toFixed(0) : c.m.toFixed(2)} W${c.war.toFixed(2)} ${(c.p * 100).toFixed(1)}%→${c.val.toFixed(2)}`
        .padStart(22)).join(" | ")} | ${NAME(byTier[best].tier)}`);
    check(byTier[best].tier === b.want,
      `${label} ${b.label}(능력치 ${b.stat})은 ${NAME(b.want)}가 최적이다 (실제 ${NAME(byTier[best].tier)})`);
    check(cells[best].val > cells[second].val * 1.1,
      `  └ 차선(${NAME(byTier[second].tier)})보다 10% 넘게 높다 (${cells[best].val.toFixed(2)} vs ${cells[second].val.toFixed(2)})`);
  }
  return rows;
}

let batRows = null, pitRows = null;

guard("목표 곡선", () => {
  const t0 = Date.now();
  console.log(`=== ⑨ 타자 — 수상 확률 × prestige = 명예의 전당 가치 (칸당 ${LEAGUE_N}시즌) ===`);
  batRows = checkLadder("bat", "🧢 타자");
  console.log(`  ⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
});

/* ⑩ 투수도 같은 사다리를 가진다.
 *
 * 리그 난이도가 실점 크기에 안 걸렸을 때는 투수의 최적 리그가 전 구간에서
 * 대륙이었어요 — 성적이 거의 안 떨어지는데 prestige만 커지니까요.
 * 해외 진출이 도박이 아니라 그냥 정답이 되는 상태고, 사다리가 무너진 거예요. */
guard("투수 목표 곡선", () => {
  const t0 = Date.now();
  console.log(`=== ⑩ 투수 — 수상 확률 × prestige = 명예의 전당 가치 (칸당 ${LEAGUE_N}시즌) ===`);
  pitRows = checkLadder("pit", "⚾ 투수");
  console.log(`  ⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
});

/* ⑪ 투수의 WAR 하락폭이 타자와 같은 크기다 — 이 태스크가 고친 바로 그 지점이에요.
 *
 * 고치기 전에는 능력치 100에서 타자가 -1.8, 투수가 -0.15였어요(12배 차이).
 * 정확히 같을 필요는 없지만, 자릿수가 달라지면 포지션에 따라 해외 진출의 의미가
 * 완전히 달라져 버려요. 그래서 '같은 크기'를 비율로 못 박아요. */
guard("투수 WAR 하락폭", () => {
  if (!batRows || !pitRows) throw new Error("앞의 곡선 검사가 값을 못 만들었어요");
  console.log(`=== ⑪ ${NAME(1)} → ${NAME(3)} WAR 하락폭 ===`);
  console.log(`  능력치 |    타자 |    투수 | 투수/타자`);
  let ok = true, small = false;
  for (let i = 0; i < BANDS.length; i++) {
    const bd = batRows[i].cells[0].war - batRows[i].cells[2].war;
    const pd = pitRows[i].cells[0].war - pitRows[i].cells[2].war;
    const ratio = pd / bd;
    console.log(`  ${String(BANDS[i].stat).padStart(6)} | ${bd.toFixed(2).padStart(7)} | ${pd.toFixed(2).padStart(7)} | ${ratio.toFixed(2).padStart(9)}`);
    if (!(ratio >= 0.5 && ratio <= 2.0)) ok = false;
    if (pd < 1.0) small = true;
  }
  check(ok, "능력치 구간마다 투수의 WAR 하락폭이 타자의 0.5~2.0배 안에 있다");
  check(!small, `투수의 WAR 하락폭이 전 구간에서 1.0 이상이다 (${NAME(3)}행이 실제로 아프다)`);
});

/* ⑫ 명예의 전당 **점수**로 다시 잰 사다리 — 가중을 걸고 나서 곡선이 유지되는지.
 *
 * ⑨⑩은 '상을 하나라도 받을 확률 × 위세'로 재요. 그건 설계가 정한 판단 기준이고
 * 리그 계수(oppUp·prestige)를 그 자로 잡았어요. 그런데 실제 커리어 점수는
 * 상마다 배점이 달라요(MVP가 골든글러브보다 훨씬 커요). 그래서 '상 하나라도'로는
 * 초록인데 점수로는 다를 수 있고, 그 어긋남을 눈에 보이게 두는 게 이 칸이에요.
 *
 * 배점은 여기 옮겨 적지 않아요 — career.js의 careerScore를 그대로 돌려서
 * '가중 카운터를 1 올리면 점수가 얼마 오르는지'를 물어봅니다.
 * 시뮬레이션은 ⑨⑩이 이미 돌린 결과(batRows·pitRows)를 다시 써요. 공짜예요. */
guard("점수로 다시 잰 사다리", () => {
  if (!batRows || !pitRows) throw new Error("앞의 곡선 검사가 값을 못 만들었어요");
  const awardWSrc = grab(SRC, /  const awardW = [^;]+;/);
  const scoreSrc = grab(SRC, /  function careerScore\(\) \{[\s\S]*?\n {2}\}/);
  if (!awardWSrc || !scoreSrc) throw new Error("careerScore·awardW를 소스에서 못 찾았어요");
  const scoreOf = new Function("career", `
    const S = { career, trophies: [], scout: 0 };
    const transTotal = () => 0;
    ${awardWSrc}
    ${scoreSrc}
    return careerScore();`);
  const ZERO = { seasons: [], warSum: 0, rings: 0, mvp: 0, gg: 0, roy: 0 };
  const base = scoreOf(ZERO);
  // 상 한 번의 배점 — 가중 카운터를 1 올려서 점수가 얼마 오르는지 직접 물어봐요
  const PT = { MVP: 0, 골든글러브: 0, 신인왕: 0 };
  for (const [a, k] of [["MVP", "mvpW"], ["골든글러브", "ggW"], ["신인왕", "royW"]]) {
    PT[a] = scoreOf({ ...ZERO, [k]: 1 }) - base;
  }
  check(Object.values(PT).every((v) => v > 0),
    `careerScore가 세 상의 가중 카운터를 전부 읽는다 (MVP ${PT.MVP} · 골든글러브 ${PT.골든글러브} · 신인왕 ${PT.신인왕})`);
  const PT_WAR = scoreOf({ ...ZERO, warSum: 1 }) - base;
  check(PT_WAR > 0, `WAR 1이 남기는 점수도 소스에서 읽었다 (${PT_WAR}점)`);

  // 한 시즌이 명예의 전당 점수에 남기는 기댓값이에요. 가중을 끄면(위세 1) 옛 계산이에요.
  const seasonVal = (cell, on) =>
    (cell.pAward.MVP * PT.MVP + cell.pAward.골든글러브 * PT.골든글러브 + cell.pAward.신인왕 * PT.신인왕)
    * (on ? cell.league.prestige : 1);

  for (const [rows, label] of [[batRows, "🧢 타자"], [pitRows, "⚾ 투수"]]) {
    console.log(`=== ⑫ ${label} — 한 시즌이 남기는 커리어 점수 (상 몫) ===`);
    console.log(`  능력치 | ${byTier.map((l) => `${l.name}(×${l.prestige})`.padStart(16)).join(" | ")} | 최적 | 가중 없을 때`);
    for (const r of rows) {
      const on = r.cells.map((c) => seasonVal(c, true));
      const off = r.cells.map((c) => seasonVal(c, false));
      const bi = on.reduce((b, v, i) => (v > on[b] ? i : b), 0);
      const oi = off.reduce((b, v, i) => (v > off[b] ? i : b), 0);
      console.log(`  ${String(r.band.stat).padStart(6)} | ${on.map((v) => v.toFixed(2).padStart(16)).join(" | ")} | ${NAME(byTier[bi].tier).padEnd(8)} | ${NAME(byTier[oi].tier)}`);

      // ⓐ 가중이 없으면 어느 구간에서도 나갈 이유가 없어요 — 그게 이 태스크의 이유예요
      check(byTier[oi].tier === 1,
        `  ${label} 능력치 ${r.band.stat} — 가중이 없으면 ${NAME(1)}가 최적이다 (실제 ${NAME(byTier[oi].tier)})`);
      // ⓑ 아랫칸(평범)이 무너지면 안 돼요 — "무조건 나가는 게 이득"이 되면 사다리가 아니에요
      if (r.band.want === 1) {
        check(byTier[bi].tier === 1,
          `  ${label} ${r.band.label}(능력치 ${r.band.stat})은 점수로도 ${NAME(1)}가 최적이다 (실제 ${NAME(byTier[bi].tier)})`);
      }
      // ⓒ 초월 구간(150)은 점수로도 대륙이 KBO를 이겨야 해요 — 후반 목표가 그거예요
      if (r.band.want === 3) {
        check(on[2] > on[0],
          `  ${label} ${r.band.label}(능력치 ${r.band.stat})은 점수로도 ${NAME(3)}가 ${NAME(1)}보다 크다 (${on[2].toFixed(2)} vs ${on[0].toFixed(2)})`);
      }
      // ⓓ 가중은 위 리그만 키워요 — KBO 값은 한 톨도 안 움직여야 해요 (위세 1)
      check(Math.abs(on[0] - off[0]) < 1e-9,
        `  ${label} 능력치 ${r.band.stat} — ${NAME(1)} 값은 가중 전후가 같다 (${on[0].toFixed(4)} vs ${off[0].toFixed(4)})`);
    }
  }

  /* warSum까지 가중했다면 어떻게 됐을지 — **안 걸기로 한 근거**예요.
   *
   * warSum은 상과 달리 리그와 무관하게 매 시즌 쌓이는 큰 항이라, 거기에 위세를 곱하면
   * 난이도로 깎아둔 WAR을 스스로 되돌려요. 아래 표를 보면 아랫칸(평범)의 최적이
   * KBO를 벗어납니다 — "실력이 되면 올라가는 게 이득"이 "무조건 나가는 게 이득"이 돼요.
   * 그래서 careerScore는 상에만 위세를 겁니다 (tests/rookie/hof-test.js ⑧이 구조를 지켜요). */
  console.log(`=== ⑫ warSum까지 가중했다면 (안 하기로 한 근거 · WAR 1점 = ${PT_WAR}점) ===`);
  for (const [rows, label] of [[batRows, "🧢 타자"], [pitRows, "⚾ 투수"]]) {
    let broke = false;
    for (const r of rows) {
      const on = r.cells.map((c) => c.war * PT_WAR * c.league.prestige + seasonVal(c, true));
      const bi = on.reduce((b, v, i) => (v > on[b] ? i : b), 0);
      console.log(`  ${label} ${String(r.band.stat).padStart(4)} | ${on.map((v) => v.toFixed(1).padStart(8)).join(" | ")} | 최적 ${NAME(byTier[bi].tier)} (목표 ${NAME(r.band.want)})`);
      if (r.band.want === 1 && byTier[bi].tier !== 1) broke = true;
    }
    check(broke, `  ${label} — warSum까지 가중하면 평범 구간의 최적이 ${NAME(1)}를 벗어난다 (그래서 안 걸어요)`);
  }

  /* ⚠️ 남는 어긋남 — 상 배점이 MVP에 몰려 있어서, '상 하나라도'로 잰 ⑨⑩과
   * 점수로 잰 ⑫가 준정상급(130) 근처에서 갈려요. MVP 확률이 위 리그에서 가장 빨리
   * 떨어지거든요. 리그 계수도 배점도 이 태스크의 범위 밖이라 값을 옮기지 않고,
   * '얼마나 붙어 있는지'만 적어 둡니다 — 다음에 손댈 때 여기가 출발점이에요. */
  console.log("=== ⑫ 준정상급(130) 어긋남 — 상 배점이 MVP에 몰려 있어서 생겨요 ===");
  for (const [rows, label] of [[batRows, "🧢 타자"], [pitRows, "⚾ 투수"]]) {
    const r = rows.find((x) => x.band.stat === 130);
    const on = r.cells.map((c) => seasonVal(c, true));
    console.log(`  ${label} | ${NAME(1)} ${on[0].toFixed(2)} · ${NAME(2)} ${on[1].toFixed(2)} (${(on[1] / on[0]).toFixed(2)}배)`);
    check(on[1] > on[0] * 0.95,
      `  ${label} 준정상급(130)에서 ${NAME(2)}가 점수로도 ${NAME(1)}에 붙어 있다 (${(on[1] / on[0]).toFixed(2)}배)`);
  }
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
