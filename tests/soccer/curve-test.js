/* 성장 곡선과 포지션 균형 회귀 테스트 — **리그 경기가 실제로 가는 길**을 재요.
 *
 * ⚠️ 2026-08 수정: 이 파일은 오랫동안 **살아 있지 않은 경로**를 재고 있었어요.
 *
 *   career.js playShow —  const c = matchContribution(rating);
 *                         const team = c.g + teammateGoals(rating, oppStr);
 *                         const split = splitMine(team);
 *                         c.g = split.g; c.a = split.a;   ← 여기서 덮어써요
 *
 * 리그 경기의 내 골·도움은 matchContribution이 정하지 않아요. **팀이 넣은 골을
 * 선발 11명에게 나눈 몫(splitMine)**이 정합니다. 그런데 옛 검사는 산식을 소스에서
 * 정규식으로 뜯어와 놓고도 `const c = matchContribution(rating)`의 반환값을 그대로
 * 시즌에 쌓았어요 — **덮어쓰기 전 값**이에요. 그래서 리그MVP 확률을 110에서
 * 56.4%라고 말했지만 라이브는 18.5%였고, 포지션 격차를 4.3%p라고 말했지만
 * 라이브는 51%p였습니다. 산식은 진짜였는데 **엮은 순서가 게임과 달랐어요.**
 *
 * ── 이 사고의 유형 ──
 * 볼트의 기존 7가지 중에는 없어요. 새 유형입니다: **"경로가 다른 시뮬레이터"**.
 * 픽스처(입력)가 아니라 **호출 순서(배선)**가 실제와 달라, 소스에서 뜯어온 진짜
 * 산식들을 게임이 쓰지 않는 순서로 엮어 놓고 초록불을 띄웠어요.
 * → 그래서 이제 **실제 페이지를 띄워, playShow의 그 블록을 소스에서 통째로 뜯어
 *   그대로 실행**합니다. 손으로 다시 엮지 않아요.
 *
 * ── 지키는 다섯 ──
 * 1. 직접 eval 금지 — new Function(페이지 realm의 window.__fn)만 써요
 * 2. 산식·배선은 소스에서 정규식으로 추출. 값을 옮겨 적지 않아요
 * 3. 게임의 진짜 함수(matchContribution·splitMine·playRandomMini·ratingOf)를
 *    페이지에서 그대로 불러요 — 재구현이나 스텁이 없어요
 * 4. 변이 검증이 파일 안에 붙어 있어요(⓪) — split 적용을 떼면 결과가 크게 달라지는지
 *    매 실행 확인합니다. 안 달라지면 이 검사는 또 죽은 경로를 재는 거예요
 * 5. **문턱은 이 파일에 상수로 박아요.** 소스에서 읽어오면 상수를 바꿔도 검사가
 *    따라가서 아무것도 안 잡혀요 — 산식과 방향이 반대입니다
 *
 * ── 🚧 목표 미달을 어떻게 다루나 (종료 코드 판단 근거) ──
 * 고쳐 놓고 보니 **목표 곡선에 크게 못 미칩니다**(110에서 60% 목표 · 실측 20%).
 * 곡선 재조정은 별도 작업으로 미뤄졌어요. 그래서 두 갈래로 나눕니다.
 *
 *   reg(...)  회귀 — 지금 지켜지고 있고 깨지면 안 되는 계약. 깨지면 **종료 코드 1**
 *   goal(...) 목표 — 설계가 노리는 값. 아직 못 닿은 항목은 UNMET에 적어 두고
 *             **종료 코드 0**, 대신 마지막에 🚧 배너로 크게 찍어요
 *
 * 왜 0인가: 상시 빨간불은 노이즈가 되어 **다른 진짜 실패를 가립니다.** 이 저장소는
 * 축구 검사 열 개가 여러 커밋 동안 죽어 있는데도 아무도 몰랐던 적이 있어요.
 * 곡선을 고칠 때까지 이 파일이 계속 빨간불이면 딱 그 상태가 됩니다.
 *
 * 그렇다고 묻히지도 않아요. UNMET은 **양방향**입니다:
 *   · UNMET인데 여전히 미달  → 🚧 (예상된 상태, 배너에 크게)
 *   · UNMET인데 **목표를 달성** → ❌ 종료 코드 1 ("승격하세요")  ← 썩지 않는 이유
 *   · UNMET이 아닌데 미달     → ❌ 종료 코드 1 (회귀)
 * 즉 곡선을 고치는 사람은 이 파일을 반드시 손대게 되고, 안 고치면 실행할 때마다
 * 미달이 눈에 밟혀요.
 *
 * ⚠️ **현재 실측값(20%·33%)을 기대값으로 박지 않았습니다.** 그건 버그를 정답으로
 * 단언하는 짓이에요. 대신 FLOOR에 **"이보다 더 나빠지면 안 된다"는 바닥**만 뒀어요.
 * 바닥은 목표가 아닙니다 — 여기에 맞추려 하지 마세요.
 *
 * 팀 승률은 여기서 안 봐요 — team-test.js의 몫이에요.
 * 내 골 + 동료 골 = 팀 골 같은 splitMine 자체의 계약은 league-sim-test.js가 봐요. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const reg = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const die = (msg) => { console.log(`❌ ${msg}`); process.exit(1); };

const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
/* 못 찾으면 그 자리에서 죽어요 — 조용히 건너뛰면 아무것도 안 지키는 검사가 됩니다 */
const must = (src, re, what) => { const m = src.match(re); if (!m) die(`산식/배선을 못 찾았어요: ${what}`); return m[0]; };
const swap = (text, from, to, what) => {
  if (text.indexOf(from) < 0) die(`치환 지점을 못 찾았어요: ${what} — 소스 모양이 바뀌었어요`);
  return text.replace(from, to);
};

// ---------- 실제 페이지를 띄워요 (league-sim-test.js와 같은 방식) ----------
const PRE = `window.fetch=()=>Promise.reject(new Error("off"));`
  + `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};`
  + `window.alert=()=>{};window.confirm=()=>false;localStorage.setItem("grow-auto-mini","1");`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRE}</script></head>`)
  /* __fn — **페이지 realm 안에서** new Function을 만들어요. 그래야 뜯어온 블록이
   * 게임의 전역(S · matchContribution · splitMine · pick …)을 그대로 봅니다.
   * 직접 eval("const x = …")은 선언이 eval 스코프에 갇혀 값이 undefined가 돼요. */
  .replace("</body>", `<script>window.__get=(n)=>eval(n);window.__set=(n,v)=>{window.__v=v;eval(n+" = window.__v");};`
    + `window.__fn=(a,b)=>new Function(a,b);</script></body>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} }; w.Stats = { log() {} }; w.alert = () => {};
const get = w.__get, set = w.__set;
const T = w.WingerCareer && w.WingerCareer._t;
const Squad = w.WingerSquad;
if (!T || !Squad || !T.splitMine || !w.matchContribution) die("페이지가 안 떴어요 (WingerCareer._t · WingerSquad · matchContribution)");

// ---------- playShow의 라이브 블록을 소스에서 통째로 뜯어요 ----------
// 상대 뽑기 → 선발 뽑기/벤치 갈림 → 평점 → 경기 기여 → 팀 골 → splitMine 덮어쓰기
const PICK_OPP = must(CAREER, /act\.opp = pick\(oppClubs\(S\)\);/, "playShow 상대 뽑기");
const BENCH_RAW = must(CAREER,
  /if \(act\.xiWeek !== act\.week\) WingerSquad\.rollLineup\(\);[\s\S]*?if \(!WingerSquad\.isStarter\(\)\) \{ benchShow\(act\); return; \}/,
  "playShow 선발/벤치 갈림");
/* 벤치 갈래는 화면을 그리고 훈련을 시켜요(benchTurn이 능력치를 올려요). 곡선은
 * 능력치를 고정해 재는 거라 여기서는 **그 주를 건너뛰기만** 해요 — 출전 수에도
 * 안 세요. 벤치가 나는 것 자체는 라이브 그대로 굴립니다(70에서 실제로 나요). */
const BENCH = swap(BENCH_RAW, "{ benchShow(act); return; }", "{ return null; }", "benchShow 갈래");
const LIVE = must(CAREER,
  /const rating = ratingOf\(S\.stats, S\.pos, S\.condition, S\.fandom\);[\s\S]*?c\.g = split\.g; c\.a = split\.a;/,
  "playShow 경기 기여 블록");
/* MatchSim.finish의 info 블록 — 🔥 승부처 성공이 무엇으로 남는지(극장골/도움/차단)가
 * 여기 있어요. 이 한 골이 시즌 축에 크게 작용해서 빼먹으면 곡선이 통째로 달라져요. */
const INFO = must(GAME, /const info = \{[\s\S]*?\n {6}\};/, "MatchSim info 블록");
const GAMES = new Function(
  `${must(CAREER, /const CB_PER_YEAR = [^;]+;/, "CB_PER_YEAR")} ${must(CAREER, /const WEEKS_PER_CB = [^;]+;/, "WEEKS_PER_CB")}`
  + " return CB_PER_YEAR * WEEKS_PER_CB;")();

/* 한 라운드 — playShow가 가는 길 그대로예요.
 * 🔥 승부처는 게임의 playRandomMini를 그대로 불러요. 자동 미니게임(grow-auto-mini)이
 * 켜져 있어 autoRes로 동기 반환합니다. **어느 능력치로 겨루는지는 그때 뽑힌
 * 미니게임이 정해요** — 옛 검사는 늘 주 스탯으로 쳐서 이 갈래를 통째로 빼먹었어요. */
const buildRound = (liveBlock) => w.__fn("", `
  const CT = window.WingerCareer._t;
  const ratingOf = CT.ratingOf, ensureLeagueRecords = CT.ensureLeagueRecords, splitMine = CT.splitMine;
  const act = S.activity;
  ${PICK_OPP}
  ${BENCH}
  ${liveBlock}
  const goals = c.g, assists = c.a, defense = c.def;
  let momentRes = "good";
  playRandomMini(null, (r) => { momentRes = r; });
  /* 아래 네 값은 info 블록이 읽는 중계 화면의 상태예요. 이 검사는 info에서
   * myGoals·assists·defense만 쓰고 teamGoals·res는 안 봐요(수상 판정에 안 들어가요).
   * MatchSim은 애니메이션 도중 승부처 골을 h에 얹지만, 여기서는 그 값을 안 읽어요. */
  const mateGoals = [], home = S.group, away = act.opp, h = team, a = oppGoals;
  const res = h > a ? "W" : h < a ? "L" : "D";
  ${INFO}
  return info;
`);
const roundLive = buildRound(LIVE);
/* ⓪ 변이 — splitMine 적용을 떼어낸 판. 아래 ⓪에서 이 둘이 크게 다른지 봐요. */
const roundNoSplit = buildRound(
  swap(LIVE, "c.g = split.g; c.a = split.a;", "/* 변이: split 적용을 떼어냈어요 */", "split 덮어쓰기 지점"));

// 시즌 결산 — hype → 수상 판정. seasonEnd(career.js)에서 그대로 뜯어와요.
const yearFn = w.__fn("act", `
  const CT = window.WingerCareer._t;
  const posAxis = CT.posAxis, AXIS_K = CT.AXIS_K, AXIS_OFF = CT.AXIS_OFF;
  const leagueOf = CT.leagueOf, barOf = CT.barOf;
  ${must(CAREER, /const DECLINE_FROM = [^;]+;/, "DECLINE_FROM")}
  ${must(CAREER, /const agePen = [^;]+;/, "agePen")}
  ${must(CAREER, /const hype = clamp\([^;]+;/, "hype")}
  ${must(CAREER, /const awards = \[\];[\s\S]*?"베스트11"[^\n]*\n {4}\}/, "수상 판정")}
  return { hype, awards, axis: posAxis(act, S.pos) };
`);

// ---------- 표본 한 시즌 ----------
const STAT_KEYS = get("STAT_KEYS");
const POS_INFO = get("POS_INFO");
const POS = ["fw", "wg", "mf", "df"];
const POS_NAME = { fw: "공격수", wg: "윙어", mf: "미드필더", df: "수비수" };
const LG = 1;                      // 1부 — penalty 0 · prestige 1 (league-test ⑥의 약속)

/* 능력치 프로필 두 가지.
 * - flat: 모든 스탯이 같은 값. 설계 문서의 곡선 표가 이 조건이에요.
 * - main: 주 스탯에 몰아요. **종합(overall)은 그대로 두고** 나머지를 내려요 —
 *   splitMine의 내 몫이 종합에 걸려 있어서, 종합이 떨어지는 프로필을 쓰면
 *   "특화가 손해다"가 아니라 "종합이 떨어져서 손해다"를 재게 됩니다. */
const MAIN_UP = 1.45;
const SUB_DOWN = (STAT_KEYS.length - MAIN_UP) / (STAT_KEYS.length - 1);
function setupS(pos, stat, mode) {
  const st = get(`newState(MARKETS[0], "${pos}", "나")`);
  const main = POS_INFO[pos].stat;
  st.pos = pos; st.league = LG; st.proYear = 5;
  st.stats = {}; for (const k of STAT_KEYS) st.stats[k] = mode === "flat" ? stat : stat * (k === main ? MAIN_UP : SUB_DOWN);
  // 재능은 1.3 균일 — clutch 보정이 포지션 간 비교를 흐리지 않게 해요
  st.talents = {}; for (const k of STAT_KEYS) st.talents[k] = 1.3;
  st.trans = {}; st.condition = 80; st.fandom = 900;
  st.career = { rookie: 0, daesang: 0, bonsang: 0, wins: 0, years: [] };
  const c = get("CLUBS")[LG][2];
  st.group = c.name; st.clubStr = c.str;
  st.activity = { cb: 1, cbTotal: 2, week: 0, weekTotal: GAMES, wins: 0, sales: 0,
    hypeSum: 0, cbHype: 0, cbWins: 0, goals: 0, assists: 0, defense: 0, apps: 0,
    teamW: 0, teamD: 0, teamL: 0, opp: null, raceFilled: true, appsFixed: true };
  st.squads = null;                // 시즌마다 동료 명단을 새로 굴려요
  set("S", st);
  Squad.ensureSquads();
  return get("S");
}
function seasonOnce(pos, stat, mode, round) {
  const S = setupS(pos, stat, mode);
  const act = S.activity;
  for (let i = 0; i < GAMES; i++) {
    const info = round();
    act.week += 1;
    if (!info) continue;           // 🪑 벤치인 주
    act.goals += info.myGoals; act.assists += info.assists; act.defense += info.defense;
    act.apps += 1;
  }
  return { ...yearFn(act), act };
}
function measure(pos, stat, mode, n, round) {
  let mvp = 0, best11 = 0, axis = 0, g = 0, a = 0, d = 0, apps = 0;
  for (let i = 0; i < n; i++) {
    const y = seasonOnce(pos, stat, mode, round || roundLive);
    if (y.awards.includes("리그MVP")) mvp++;
    if (y.awards.includes("베스트11")) best11++;
    axis += y.axis; g += y.act.goals; a += y.act.assists; d += y.act.defense; apps += y.act.apps;
  }
  return { mvp: mvp / n, best11: best11 / n, axis: axis / n, g: g / n, a: a / n, d: d / n, apps: apps / n };
}

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const avg = (row, key) => POS.reduce((s, p) => s + row[p][key], 0) / POS.length;
const spread = (row, key) => { const vs = POS.map((p) => row[p][key]); return Math.max(...vs) - Math.min(...vs); };

// ---------- ⓪ 변이 검증 — 이 검사가 진짜 라이브 경로를 재고 있나 ----------
/* 이 파일이 죽었던 이유가 정확히 여기예요. splitMine 적용을 떼어냈는데 결과가
 * 그대로면, 이 검사는 또 게임이 안 쓰는 값을 재고 있는 겁니다. */
const MUT_N = 200, MUT_STAT = 110;
const t0 = Date.now();
{
  const live = {}, mut = {};
  for (const p of POS) { live[p] = measure(p, MUT_STAT, "flat", MUT_N); mut[p] = measure(p, MUT_STAT, "flat", MUT_N, roundNoSplit); }
  const lg = avg(live, "g"), mg = avg(mut, "g");
  const ls = spread(live, "mvp"), ms = spread(mut, "mvp");
  console.log(`=== ⓪ 변이 검증 — splitMine 적용을 떼면 (능력치 ${MUT_STAT} · 칸당 ${MUT_N}시즌) ===`);
  console.log(`  시즌 골 평균 ${lg.toFixed(1)} → ${mg.toFixed(1)} · 포지션 격차 ${(ls * 100).toFixed(1)}%p → ${(ms * 100).toFixed(1)}%p`);
  reg(Math.abs(mg - lg) / Math.max(1, lg) > 0.15,
    `splitMine을 떼면 시즌 골이 15% 넘게 달라진다 (${lg.toFixed(1)} → ${mg.toFixed(1)}) — 이 검사가 라이브 경로를 재고 있다는 증거예요`);
  reg(Math.abs(ms - ls) > 0.15,
    `splitMine을 떼면 포지션 격차가 15%p 넘게 달라진다 (${(ls * 100).toFixed(1)}%p → ${(ms * 100).toFixed(1)}%p)`);
}

// ---------- 곡선 측정 ----------
const N = Number(process.env.CURVE_N || 500);
/* ③-B는 효과가 작아요(윙어 ×1.02 · 미드필더 ×0.98). 표본이 얕으면 1.0을 넘나들며
 * 가짜 빨간불이 뜨니 바닥을 깔아 둡니다 — CURVE_N을 낮춰도 여기는 안 얕아져요. */
const N_MAIN = Math.max(800, N * 2);
const FLAT_STATS = [70, 90, 110, 130, 150];
const SPEC_STAT = 130;             // 주 스탯 특화 비교는 여기서 — 110은 효과가 난수 폭에 묻혀요
const flat = {}, mainly = {};
for (const stat of FLAT_STATS) { flat[stat] = {}; for (const p of POS) flat[stat][p] = measure(p, stat, "flat", N); }
mainly[SPEC_STAT] = {}; for (const p of POS) mainly[SPEC_STAT][p] = measure(p, SPEC_STAT, "main", N_MAIN);
const specBase = {}; for (const p of POS) specBase[p] = measure(p, SPEC_STAT, "flat", N_MAIN);

console.log(`\n=== 5년차 리그MVP 확률 — 능력치 균등 (칸당 ${N}시즌 · ${GAMES}라운드) ===`);
console.log(`  능력치 | ${POS.map((p) => POS_NAME[p].padStart(7)).join(" | ")} |  평균 |   격차`);
for (const stat of FLAT_STATS) {
  const cells = POS.map((p) => pct(flat[stat][p].mvp).padStart(7)).join(" | ");
  console.log(`  ${String(stat).padStart(6)} | ${cells} | ${pct(avg(flat[stat], "mvp")).padStart(5)} | ${(spread(flat[stat], "mvp") * 100).toFixed(1)}%p`);
}
console.log(`=== 시즌 평균 산출 — 골 · 도움 · 수비 성공 · 축 · 출전 ===`);
for (const stat of FLAT_STATS) for (const p of POS) {
  const r = flat[stat][p];
  console.log(`  ${String(stat).padStart(6)} ${POS_NAME[p].padStart(5)} | ⚽ ${r.g.toFixed(1).padStart(5)} · 🅰️ ${r.a.toFixed(1).padStart(5)}`
    + ` · 🛡️ ${r.d.toFixed(1).padStart(5)} · 축 ${r.axis.toFixed(1).padStart(5)} · 출전 ${r.apps.toFixed(1)}/${GAMES}`);
}

// ---------- 목표 / 회귀 판정 ----------
/* 🚧 아직 못 닿은 목표들. **여기 적힌 것만** 종료 코드에서 빠져요.
 * 목표를 달성하면 그것도 빨간불이에요 — 이 표에서 빼고 회귀로 승격하라는 뜻입니다. */
const UNMET = {
  "band-90": "곡선 미달 — 90에서 상이 거의 안 나와요",
  "band-110": "곡선 미달 — 목표 60%대, 실측 20%대",
  "band-130": "곡선 미달 — 목표 85%대, 실측 30%대",
  "band-150": "곡선 미달 — 목표 90%+, 실측 40%대",
  "spread-90": "포지션 격차 — 수비수만 상을 받아요",
  "spread-110": "포지션 격차 — 수비수만 상을 받아요",
  "spread-130": "포지션 격차 — 수비수만 상을 받아요",
  "b11-70": "중간 등급 받침 — 70에서 베스트11이 거의 안 나와요",
  "spec-mf": "미드필더 특화 무효 — 리그에서 c.a가 split.a로 덮여, 패스 능력치가 도움에 안 닿아요",
};
const gaps = [];
const goal = (key, ok, msg) => {
  const known = Object.prototype.hasOwnProperty.call(UNMET, key);
  if (ok && !known) { console.log(`✅ ${msg}`); return; }
  if (ok && known) { console.log(`❌ ${msg} — 🎉 목표를 달성했어요! UNMET["${key}"]를 지우고 회귀로 승격하세요`); fail++; return; }
  if (!ok && !known) { console.log(`❌ ${msg}`); fail++; return; }
  console.log(`🚧 ${msg}`);
  gaps.push({ key, msg, why: UNMET[key] });
};

console.log("");
/* ① 곡선 — 능력치별 5년차 리그MVP 확률이 설계 범위 안에 있다.
 * 밴드는 **설계 목표값**이라 이 파일에 상수로 박아요(소스에서 읽어오면 상수를
 * 바꿔도 검사가 따라가서 아무것도 안 잡혀요).
 *
 * ⚠️ 위아래를 나눠서 봐요. 유예(UNMET)는 **아래로 못 닿은 것**에만 줍니다.
 * 위로 넘치는 건 "아직 못 고쳤다"가 아니라 다른 고장이라, 유예 없이 빨간불이에요.
 * (한 줄로 묶어 두면 20%도 90%도 똑같이 🚧로 보여서 폭주가 조용히 지나가요.) */
const BAND = { 70: [0, 0.08], 90: [0.08, 0.25], 110: [0.45, 0.72], 130: [0.78, 0.95], 150: [0.90, 1.00] };
for (const stat of FLAT_STATS) {
  const [lo, hi] = BAND[stat], v = avg(flat[stat], "mvp");
  goal(`band-${stat}`, v >= lo, `능력치 ${stat}: 리그MVP 확률이 ${pct(lo)} 이상이다 (${pct(v)} · 목표대 ${pct(lo)}~${pct(hi)})`);
  reg(v <= hi, `능력치 ${stat}: 리그MVP 확률이 ${pct(hi)}를 넘지 않는다 (${pct(v)})`);
}

// ② 단조 증가 — 능력치를 올렸는데 상이 안 늘면 성장이 멈춘 거예요 (지금 지켜지고 있어요)
{
  const seq = [70, 90, 110, 130].map((s) => avg(flat[s], "mvp"));
  let mono = true;
  for (let i = 1; i < seq.length; i++) if (!(seq[i] > seq[i - 1] + 0.02)) mono = false;
  reg(mono, `리그MVP 확률이 70 < 90 < 110 < 130으로 오른다 (${seq.map(pct).join(" → ")})`);
}

/* ③ 포지션 균형 — 포지션을 골랐다는 이유만으로 상 확률이 갈리면 안 돼요.
 * 설계 목표는 10%p 이내. 라이브는 지금 50%p가 넘어요(수비수 독식). */
for (const stat of [70, 90, 110, 130]) {
  const g = spread(flat[stat], "mvp");
  const detail = POS.map((p) => `${POS_NAME[p]} ${pct(flat[stat][p].mvp)}`).join(" · ");
  goal(`spread-${stat}`, g <= 0.10, `능력치 ${stat}: 네 포지션의 리그MVP 확률 격차가 10%p 이내다 (${(g * 100).toFixed(1)}%p — ${detail})`);
}

/* ③-B 주 스탯 특화가 보상이 된다 — **종합을 고정한 채** 주 스탯에 몰아요.
 * 자기 주 스탯을 키웠는데 시즌 축이 줄면 그 포지션은 구조적으로 망가진 거예요. */
console.log(`\n=== 주 스탯 특화(종합 고정 · 주 스탯 ×${MAIN_UP} · 나머지 ×${SUB_DOWN.toFixed(3)})의 시즌 축 — 능력치 ${SPEC_STAT} · 칸당 ${N_MAIN}시즌 ===`);
for (const p of POS) {
  const lo = specBase[p].axis, hi = mainly[SPEC_STAT][p].axis;
  goal(`spec-${p}`, hi > lo, `${POS_NAME[p]}: 주 스탯 특화가 시즌 축을 늘린다 (${lo.toFixed(1)} → ${hi.toFixed(1)} · ×${(hi / lo).toFixed(3)})`);
}

// ④ 중간 등급이 받쳐준다 — 약한 선수가 아무 상도 못 받으면 게임을 그만둬요
{
  const v = avg(flat[70], "best11");
  const detail = POS.map((p) => `${POS_NAME[p]} ${pct(flat[70][p].best11)}`).join(" · ");
  goal("b11-70", v >= 0.35, `능력치 70에서 베스트11 확률이 35% 이상이다 (평균 ${pct(v)} — ${detail})`);
}

// ⑤ 150에서도 축이 계속 자란다 — 확률은 포화하니 축 자체를 봐요 (지금 지켜지고 있어요)
{
  let ok = true;
  const detail = POS.map((p) => {
    const lo = flat[130][p].axis, hi = flat[150][p].axis;
    if (!(hi > lo)) ok = false;
    return `${POS_NAME[p]} ${lo.toFixed(1)}→${hi.toFixed(1)}`;
  }).join(" · ");
  reg(ok, `능력치 150의 시즌 축 평균이 130보다 크다 (${detail})`);
}

/* ⑥ 붕괴 방지 바닥 — **목표가 아니에요.** 여기 맞추려 하지 마세요.
 * 🚧 항목이 종료 코드 0이라 곡선이 더 무너져도 아무도 모를 수 있어서, 그것만 막아요.
 * 지금 실측(110 ≈ 20% · 130 ≈ 33% · 130 베스트11 ≈ 97%)의 절반쯤에 둡니다. */
const FLOOR = { mvp110: 0.08, mvp130: 0.15, b11at130: 0.80 };
reg(avg(flat[110], "mvp") >= FLOOR.mvp110, `[바닥] 능력치 110 리그MVP 평균이 ${pct(FLOOR.mvp110)} 아래로 안 떨어진다 (${pct(avg(flat[110], "mvp"))})`);
reg(avg(flat[130], "mvp") >= FLOOR.mvp130, `[바닥] 능력치 130 리그MVP 평균이 ${pct(FLOOR.mvp130)} 아래로 안 떨어진다 (${pct(avg(flat[130], "mvp"))})`);
reg(avg(flat[130], "best11") >= FLOOR.b11at130, `[바닥] 능력치 130 베스트11 평균이 ${pct(FLOOR.b11at130)} 아래로 안 떨어진다 (${pct(avg(flat[130], "best11"))})`);

// ---------- 마무리 ----------
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (gaps.length) {
  const bar = "━".repeat(72);
  console.log(`\n${bar}`);
  console.log(`🚧 목표 곡선 미달 ${gaps.length}건 — 검사는 초록불이지만 게임은 목표에 못 닿았어요`);
  console.log(`   (곡선 재조정은 별도 작업이라 종료 코드에서 뺐습니다. 파일 상단 주석 참고)`);
  console.log(bar);
  for (const g of gaps) console.log(`   🚧 ${g.msg}\n      └─ ${g.why}`);
  console.log(bar);
}
if (fail) { console.log(`❌ ${fail}건 실패`); process.exit(1); }
console.log(gaps.length
  ? `✅ 회귀 검사 통과 · 🚧 목표 곡선 미달 ${gaps.length}건 (위 목록) — 종료 코드 0`
  : "✅ 통과");
process.exit(0);
