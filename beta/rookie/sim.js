/* ⚾ 더 드래프트 — 통합 리그 시뮬 엔진 (야구 전용, 1단계: 엔진만 · 게임엔 아직 안 붙어요)
 *
 * 팀마다 로스터(타자 9 + 선발 5 + 마무리 1)를 세우고 한 시즌을 통째로 굴려요.
 * 팀 득점은 로스터 레이팅에서 나오고(→ 승패 → 순위표), 개인 기록은 선수 능력치대로 쌓여요
 * (→ 개인 순위·타이틀). 모든 숫자가 한 시뮬에서 나와요.
 *
 * 설계·밸런스 목표: docs/rookie-integrated-sim.md
 *
 * ⚠️ 눈금은 **현재 RACE_ANCHOR(아케이드 스케일)에 맞춰요** — 실제 KBO가 아니라. 사람의 성적이
 * 미니게임에서 크게 나오니(탈삼진 400+ 등), 라이벌도 같은 눈금이라야 공정해요.
 * ⚠️ 전역 Math.random 안 써요 — 자체 시드 PRNG. (밸런스 시뮬 보호 · 재현)
 */
(function () {
  "use strict";

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function poisson(rng, mean) {
    if (mean <= 0) return 0;
    const L = Math.exp(-mean); let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  function gauss(rng, m, sd) {
    const u = Math.max(1e-9, rng()), v = rng();
    return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ── 튜닝 상수 (몬테카를로로 맞춘 값 — tests/rookie/sim-test.js가 지켜요) ──
  /* 팀 레이팅(승률)과 개인 스타성(1위권 수치)을 **일부러 갈라놔요**:
   *  · WIN_SPREAD 는 팀 평균 레이팅 폭 → 팀 승률 범위를 정해요 (좁게).
   *  · SKILL_SD 는 한 팀 안 선수 편차 → 스타의 1위권 수치를 정해요 (넓게).
   * 팀 off/def는 선수들의 **평균**이라 SKILL_SD를 키워도 팀 승률은 안 흔들려요. */
  const LG_RUNS = 4.6;         // 팀·경기당 평균 득점
  const WIN_SPREAD = 1.35;     // 팀 전력 → 팀 레이팅 폭 (승률 ~32~68% 목표)
  const SKILL_SD = 0.24;       // 한 팀 안 선수 편차 (스타 ↔ 백업)
  const SKILL_MIN = 0.5, SKILL_MAX = 1.7;
  // 타자 — 한 경기 성적 라인
  const BAT = { ab: 4.0, abSd: 0.9, avgBase: 0.238, avgSlope: 0.14, hrBase: 0.023, hrPow: 3.2, sbBase: 0.285 };
  // 투수 — 한 등판 성적 라인 (선발은 5경기당 1번). winGate·saveGate = 팀 승리가 개인 승/세이브로 붙는 비율
  const PIT = { rot: 5, ip: 6.0, ipSd: 1.1, kBase: 8.6, kSlope: 20, eraBase: 4.6, eraSlope: 4.0, closeMargin: 3, winGate: 0.72, saveGate: 0.62 };

  const teamRating = (str) => 1 + (str - 0.49) * WIN_SPREAD;
  const nm = (arr, i, fb) => (arr && arr[i]) || fb;

  /* 리그 로스터를 세워요. names = { batters:[...], pitchers:[...] } (유저 이름 풀; 없으면 별명). */
  function buildLeague(teamNames, strOf, seed, names) {
    const rng = mulberry32((seed >>> 0) || 1);
    names = names || {};
    let bi = 0, pi = 0;
    const teams = teamNames.map((name) => {
      const str = typeof strOf === "function" ? strOf(name) : 0.49;
      const rating = teamRating(str);
      const batters = [];
      for (let i = 0; i < 9; i++) {
        batters.push({
          name: nm(names.batters, bi++, `${name} 타자${i + 1}`), team: name,
          skill: clamp(gauss(rng, rating, SKILL_SD), SKILL_MIN, SKILL_MAX),
          ab: 0, hits: 0, hr: 0, sb: 0,
        });
      }
      const pitchers = [];
      for (let i = 0; i < PIT.rot; i++) {
        pitchers.push({
          name: nm(names.pitchers, pi++, `${name} 투수${i + 1}`), team: name, role: "sp",
          skill: clamp(gauss(rng, rating, SKILL_SD), SKILL_MIN, SKILL_MAX),
          ip: 0, k: 0, er: 0, wins: 0, gs: 0, saves: 0,
        });
      }
      pitchers.push({
        name: nm(names.pitchers, pi++, `${name} 마무리`), team: name, role: "cl",
        skill: clamp(gauss(rng, rating, SKILL_SD), SKILL_MIN, SKILL_MAX),
        ip: 0, k: 0, er: 0, wins: 0, gs: 0, saves: 0,
      });
      // 공격 레이팅 = 타선 평균, 수비 레이팅 = 선발진 평균 (리그 평균 ≈ 1.0)
      const off = batters.reduce((s, b) => s + b.skill, 0) / batters.length;
      const def = pitchers.slice(0, PIT.rot).reduce((s, p) => s + p.skill, 0) / PIT.rot;
      return { name, str, off, def, batters, pitchers, w: 0, l: 0, gi: 0 };
    });
    return { teams };
  }

  // 타자 9명의 그 경기 성적 라인을 쌓아요 (능력치대로 — 팀 득점과 산술로 안 맞아도 시즌 단위로 코히어런트).
  function accrueBatting(team, rng) {
    for (const b of team.batters) {
      const ab = Math.max(0, Math.round(gauss(rng, BAT.ab, BAT.abSd)));
      if (!ab) continue;
      const avg = clamp(BAT.avgBase + (b.skill - 1) * BAT.avgSlope, 0.18, 0.38);
      const hits = Math.min(ab, poisson(rng, ab * avg));
      const hr = Math.min(hits, poisson(rng, ab * BAT.hrBase * Math.pow(b.skill, BAT.hrPow)));
      const sb = poisson(rng, BAT.sbBase * b.skill);
      b.ab += ab; b.hits += hits; b.hr += hr; b.sb += sb;
    }
  }
  // 그날 선발(로테이션)의 성적 라인. 승리는 팀이 이긴 경기의 선발에게 (근사).
  function accruePitching(team, won, close, rng) {
    const sp = team.pitchers[team.gi % PIT.rot];
    team.gi++;
    sp.gs++;
    const ip = clamp(gauss(rng, PIT.ip, PIT.ipSd), 2, 9);
    sp.ip += ip;
    sp.k += poisson(rng, (PIT.kBase + (sp.skill - 1) * PIT.kSlope) / 9 * ip);
    const eraTrue = clamp(PIT.eraBase - (sp.skill - 1) * PIT.eraSlope, 1.3, 7);
    sp.er += poisson(rng, eraTrue / 9 * ip);
    if (won && rng() < PIT.winGate) sp.wins++;                          // 팀 승리의 일부만 선발 승으로
    if (won && close && rng() < PIT.saveGate) team.pitchers[PIT.rot].saves++;   // 마무리 세이브
  }

  function simGame(A, B, rng) {
    const eA = LG_RUNS * A.off / B.def, eB = LG_RUNS * B.off / A.def;
    let rA = poisson(rng, eA), rB = poisson(rng, eB);
    if (rA === rB) { if (rng() < 0.5) rA++; else rB++; }   // 무승부 없음 (연장)
    const aWin = rA > rB;
    if (aWin) { A.w++; B.l++; } else { B.w++; A.l++; }
    const close = Math.abs(rA - rB) <= PIT.closeMargin;
    accrueBatting(A, rng); accrueBatting(B, rng);
    accruePitching(A, aWin, close && aWin, rng);
    accruePitching(B, !aWin, close && !aWin, rng);
    return { rA, rB, aWin };
  }

  /* 한 시즌(팀당 games경기)을 굴려요. 10팀이면 서로 균등하게 붙어요.
   * 반환: { standings, batters, pitchers } — 이미 정렬은 부르는 쪽에서. */
  function simSeason(league, seed, games) {
    const rng = mulberry32((seed >>> 0) || 7);
    const T = league.teams, n = T.length;
    games = games || 144;
    // 각 팀이 games경기가 되도록 라운드로빈으로 상대를 번갈아요.
    const perOpp = Math.max(1, Math.round(games / (n - 1)));
    for (let round = 0; round < perOpp; round++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (T[i].w + T[i].l >= games || T[j].w + T[j].l >= games) continue;
          simGame(T[i], T[j], rng);
        }
      }
    }
    const batters = [], pitchers = [];
    for (const t of T) { for (const b of t.batters) batters.push(b); for (const p of t.pitchers) pitchers.push(p); }
    return {
      standings: T.map((t) => ({ name: t.name, w: t.w, l: t.l, str: t.str })).sort((a, b) => b.w - a.w || a.l - b.l),
      batters, pitchers,
    };
  }

  // 개인 기록 순위 — 부문별 정렬 (era·규정 이닝/타석 게이팅 포함).
  const avgOf = (b) => (b.ab ? b.hits / b.ab : 0);
  const eraOf = (p) => (p.ip ? p.er * 9 / p.ip : 99);
  function leaders(res, metric, games) {
    games = games || 144;
    if (metric === "avg") return res.batters.filter((b) => b.ab >= games * 2).map((b) => ({ ...b, v: avgOf(b) })).sort((a, b) => b.v - a.v);
    if (metric === "era") return res.pitchers.filter((p) => p.role === "sp" && p.ip >= games * 0.9).map((p) => ({ ...p, v: eraOf(p) })).sort((a, b) => a.v - b.v);
    if (metric === "saves") return res.pitchers.filter((p) => p.role === "cl").map((p) => ({ ...p, v: p.saves })).sort((a, b) => b.v - a.v);
    const pool = (metric === "wins" || metric === "k") ? res.pitchers.filter((p) => p.role === "sp") : res.batters;
    return pool.map((x) => ({ ...x, v: x[metric] || 0 })).sort((a, b) => b.v - a.v);
  }

  window.RookieSim = {
    buildLeague, simSeason, simGame, leaders, avgOf, eraOf,
    _c: { LG_RUNS, WIN_SPREAD, BAT, PIT, teamRating }, _mulberry32: mulberry32,
  };
})();
