/* ⚡ 실전 성장 — 경기가 선수를 키우는가 (더 윙어의 같은 기능을 야구로 옮겼어요)
 *
 * 낮은 확률로 경기에서 한 단계 깨쳐요. 여기서 못 박는 건 넷이에요.
 *   ① 확률이 활약·승패를 따라 움직인다 (잘한 경기에서 더 배워요)
 *   ② 무게가 그 경기에 실제로 한 일을 따라간다 (안타→타격, 홈런→파워, 삼진→구위…)
 *   ③ 한 시즌 기대 성장이 두세 점에 머문다 — 야구는 144~162경기라, 축구(38경기)와
 *      같은 확률이면 네 배로 자라 훈련이 무의미해져요. 그 함정을 실측으로 막아요.
 *   ④ 정규시즌·가을야구 **둘 다**에서 굴린다 (호출부가 살아 있다)
 *
 * 산식은 소스에서 그대로 떼어다 굴려요 — 값을 옮겨 적지 않아요(league-test와 같은 방식).
 * STAT_DEFS도 game.js에서 떼어 와요. 손으로 지으면 실제 능력치 목록과 어긋나서
 * "픽스처가 다른 모양" 함정에 빠져요. */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/rookie";
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const mm = src.match(re); if (!mm) throw new Error(`소스에서 못 찾음: ${re}`); return mm[0]; };
const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ── 진짜 산식을 소스에서 떼어 와요 ──────────────────────────────
const STAT_DEFS_SRC = grab(GAME, /const STAT_DEFS = \{[\s\S]*?\n\};/);
// MATCH_GROW 선언부터 matchGrowth 함수 끝까지 한 덩어리
const gStart = SRC.indexOf("const MATCH_GROW = {");
const gAnchor = SRC.indexOf("Fx.flash(`⚡ ${d.name} +${gain.toFixed(1)}`);", gStart);
const growBlock = SRC.slice(gStart, SRC.indexOf("\n  }", gAnchor) + 4);
check(gStart > 0 && growBlock.includes("function matchGrowth"), "career.js에서 실전 성장 산식을 떼어 왔다");

/* S와 STAT_DEFS·헬퍼를 파라미터로 받는 공장. Math도 넘겨서 Math.random까지 씨앗으로
 * 묶어요 — matchGrowth가 발동·가중 뽑기에 Math.random을 직접 쓰거든요. */
function makeEnv(S, seed) {
  const M = Object.assign(Object.create(Math), { random: mulberry32(seed) });
  const rand = (a, b) => a + M.random() * (b - a);
  const clamp = (v, a, b) => M.min(b, M.max(a, v));
  const statCap = () => 130;
  const atCap = (key) => M.round(S.stats[key]) >= statCap(key);
  const logs = [];
  const proLog = (m) => logs.push(m);
  const factory = new Function("S", "clamp", "rand", "atCap", "statCap", "proLog", "window", "Math",
    STAT_DEFS_SRC + "\n" + growBlock +
    "\n return { MATCH_GROW, growWeightOf, growWhyOf, growPOf, matchGrowth };");
  return { api: factory(S, clamp, rand, atCap, statCap, proLog, {}, M), logs };
}
const mkS = (pos, stat, talent) => {
  const keys = pos === "batter"
    ? ["contact", "power", "run", "defense", "stamina"]
    : ["velocity", "control", "breaking", "defense", "stamina"];
  const S = { pos, stats: {}, talents: {} };
  for (const k of keys) { S.stats[k] = stat; S.talents[k] = talent; }
  return S;
};

// ── ① 확률이 활약·승패를 따라 움직인다 ─────────────────────────
guard("확률", () => {
  const { api } = makeEnv(mkS("batter", 80, 1.2), 1);
  const big = api.growPOf({ hits: 4, hr: 2, sb: 2 }, true);
  const quiet = api.growPOf({ hits: 0, hr: 0, sb: 0 }, false);
  check(big > quiet * 2, `잘한 경기가 조용한 경기보다 확률이 훨씬 높다 (${(big * 100).toFixed(1)}% > ${(quiet * 100).toFixed(1)}% · ${(big / quiet).toFixed(1)}배)`);
  const won = api.growPOf({ hits: 1 }, true), lost = api.growPOf({ hits: 1 }, false);
  check(won > lost, `이긴 경기에서 더 배운다 (승 ${(won * 100).toFixed(1)}% > 패 ${(lost * 100).toFixed(1)}%)`);
  const lo = api.MATCH_GROW.lo, hi = api.MATCH_GROW.hi;
  check(quiet >= lo - 1e-9 && big <= hi + 1e-9, `확률이 [${(lo * 100).toFixed(1)}%, ${(hi * 100).toFixed(1)}%] 안에 갇힌다`);
  // 투수도 활약(삼진·무실점)이 확률을 올려요
  const pe = makeEnv(mkS("pitcher", 80, 1.2), 2).api;
  const dom = pe.growPOf({ ip: 7, k: 10, runs: 0 }, true), soft = pe.growPOf({ ip: 1, k: 0, runs: 3 }, false);
  check(dom > soft * 2, `투수 — 압도한 경기가 확률이 훨씬 높다 (${(dom * 100).toFixed(1)}% > ${(soft * 100).toFixed(1)}% · ${(dom / soft).toFixed(1)}배)`);
});

// ── ② 무게가 그 경기에 한 일을 따라간다 ────────────────────────
guard("무게", () => {
  const b = makeEnv(mkS("batter", 80, 1.2), 3).api;
  const top = (w) => Object.entries(w).sort((x, y) => y[1] - x[1])[0][0];
  check(top(b.growWeightOf({ hits: 3, hr: 0, sb: 0 })) === "contact", "안타만 친 경기 → 타격 무게가 가장 크다");
  check(top(b.growWeightOf({ hits: 0, hr: 2, sb: 0 })) === "power", "홈런 친 경기 → 파워 무게가 가장 크다");
  check(top(b.growWeightOf({ hits: 0, hr: 0, sb: 2 })) === "run", "도루한 경기 → 주루 무게가 가장 크다");
  const p = makeEnv(mkS("pitcher", 80, 1.2), 4).api;
  check(top(p.growWeightOf({ ip: 6, k: 9, runs: 2 })) === "velocity", "삼진 많은 경기 → 구위 무게가 가장 크다");
  check(p.growWeightOf({ ip: 6, k: 0, runs: 0 }).control > p.growWeightOf({ ip: 6, k: 0, runs: 3 }).control,
    "무실점일수록 제구 무게가 크다");
  // 왜 올랐는지 문구가 계기를 담아요
  check(/손맛/.test(b.growWhyOf({ hr: 1 }, "power")) && b.growWhyOf({ hr: 0 }, "power") === "",
    "홈런으로 파워가 오르면 '손맛' 문구가, 안 쳤으면 빈 문구가 붙는다");
});

// ── ③ 한 시즌 기대 성장이 두세 점에 머문다 (실측) ───────────────
guard("시즌 성장 폭", () => {
  const draw = (rnd, dist) => { let r = rnd(); for (const [v, p] of dist) { r -= p; if (r < 0) return v; } return dist[dist.length - 1][0]; };
  const perSeason = (pos, games, N) => {
    let sum = 0, procs = 0;
    for (let i = 0; i < N; i++) {
      const S = mkS(pos, 90, 1.2);
      const { api } = makeEnv(S, 5000 + i);
      const rnd = mulberry32(9000 + i);
      const before = { ...S.stats };
      for (let g = 0; g < games; g++) {
        const perf = pos === "batter"
          ? { ab: 4, hits: draw(rnd, [[0, .28], [1, .40], [2, .21], [3, .08], [4, .03]]), hr: draw(rnd, [[0, .84], [1, .14], [2, .02]]), sb: draw(rnd, [[0, .88], [1, .11], [2, .01]]) }
          : (() => { const ip = draw(rnd, [[1, .45], [2, .12], [5, .10], [6, .18], [7, .15]]); return { ip, k: Math.round(ip * (0.7 + rnd() * 0.6)), runs: Math.round(ip * (0.1 + rnd() * 0.5)) }; })();
        const b0 = JSON.stringify(S.stats);
        api.matchGrowth(perf, rnd() < 0.5);
        if (JSON.stringify(S.stats) !== b0) procs++;
      }
      sum += Object.keys(before).reduce((s, k) => s + (S.stats[k] - before[k]), 0);
    }
    return { pts: sum / N, procs: procs / N };
  };
  for (const [pos, games] of [["batter", 144], ["pitcher", 144], ["batter", 162], ["pitcher", 162]]) {
    const r = perSeason(pos, games, 200);
    console.log(`   ${pos} ${games}경기 | 시즌당 ${r.pts.toFixed(2)}점 · 발동 ${r.procs.toFixed(1)}회`);
    check(r.pts >= 2.0 && r.pts <= 5.0,
      `${pos} ${games}경기 — 시즌당 성장이 2~5점 안이다 (${r.pts.toFixed(2)}점) · 훈련을 대신하지 않아요`);
  }
});

// ── ④ 무게가 결과로도 드러난다 · 상한은 빠진다 · 호출부가 살아 있다 ──
guard("결과·상한·배선", () => {
  // 안타만 나는 시즌은 타격이 다른 스탯보다 훨씬 많이 오른다
  let contactSum = 0, otherSum = 0;
  for (let i = 0; i < 120; i++) {
    const S = mkS("batter", 90, 1.2);
    const { api } = makeEnv(S, 7000 + i);
    for (let g = 0; g < 144; g++) api.matchGrowth({ ab: 4, hits: 2, hr: 0, sb: 0 }, true);
    contactSum += S.stats.contact - 90;
    otherSum += (S.stats.power - 90) + (S.stats.run - 90);
  }
  check(contactSum > otherSum * 1.5,
    `안타만 나는 시즌은 타격이 파워·주루보다 훨씬 오른다 (타격 ${(contactSum / 120).toFixed(1)} vs 파워+주루 ${(otherSum / 120).toFixed(1)})`);

  // 상한(130)에 닿은 능력치는 안 오르고, 다 닿았으면 성장도 없다
  const S = mkS("batter", 130, 1.2);
  const { api, logs } = makeEnv(S, 42);
  for (let g = 0; g < 400; g++) api.matchGrowth({ ab: 4, hits: 3, hr: 1, sb: 1 }, true);
  check(Object.values(S.stats).every((v) => v <= 130), "상한에 닿은 능력치는 더 안 오른다");
  check(logs.length === 0, "다 상한이면 성장도 안 나고 로그도 안 남는다");

  // 성공 로그의 모양 — 상한 안 닿은 선수에서 한 번 강제로 발동
  const S2 = mkS("batter", 80, 1.2);
  const forced = makeEnv(S2, 3);   // 씨앗을 여러 개 돌려 반드시 한 번은 발동시켜요
  let got = "";
  for (let s = 0; s < 60 && !got; s++) {
    const e = makeEnv(mkS("batter", 80, 1.2), 100 + s);
    for (let g = 0; g < 20 && !got; g++) { e.api.matchGrowth({ ab: 4, hits: 2, hr: 1, sb: 0 }, true); if (e.logs.length) got = e.logs[0]; }
  }
  check(/⚡/.test(got) && /깨쳤어요! \+[\d.]+/.test(got), `성공하면 '⚡ …깨쳤어요! +X' 로그가 남는다 ("${got}")`);

  // ④ 정규시즌·가을야구 둘 다에서 실제로 굴려요 (배선이 죽어 있으면 장식이에요)
  const proSeg = SRC.slice(SRC.indexOf("function finishProGame"), SRC.indexOf("function finishPostGame"));
  const postSeg = SRC.slice(SRC.indexOf("function finishPostGame"), SRC.indexOf("function playFeeds"));
  check(/matchGrowth\(perf, win\)/.test(proSeg), "정규시즌 종료(finishProGame)에서 matchGrowth를 부른다");
  check(/matchGrowth\(perf, win\)/.test(postSeg), "가을야구 종료(finishPostGame)에서도 matchGrowth를 부른다");
});

console.log(fail ? `\n❌ ${fail}개 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
