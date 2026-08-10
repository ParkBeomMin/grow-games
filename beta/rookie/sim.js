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

  /* forced — 'A'/'B'면 그 팀이 이긴 걸로 못 박아요. 내가 뛴 경기는 실제 결과(미니게임)가
   * 정본이라, 시뮬이 그걸 덮지 않게 하려고요. 점수는 승패에 맞게 뒤집어 맞춰요. */
  function simGame(A, B, rng, forced, skipStats) {
    const eA = LG_RUNS * A.off / B.def, eB = LG_RUNS * B.off / A.def;
    let rA = poisson(rng, eA), rB = poisson(rng, eB);
    if (rA === rB) { if (rng() < 0.5) rA++; else rB++; }   // 무승부 없음 (연장)
    if (forced && ((forced === "A") !== (rA > rB))) { const t = rA; rA = rB; rB = t; }
    const aWin = rA > rB;
    if (aWin) { A.w++; B.l++; } else { B.w++; A.l++; }
    const close = Math.abs(rA - rB) <= PIT.closeMargin;
    /* 🧾 점수는 위에서 정해졌어요. 그 점수를 **타석 단위로 재현**해서 기록을 쌓아요 —
     * 중계에서 본 타석이 곧 순위표의 기록이에요(따로 굴리지 않아요). */
    const spA = A.pitchers[A.gi % PIT.rot], spB = B.pitchers[B.gi % PIT.rot];
    A.gi++; B.gi++; spA.gs++; spB.gs++;
    const logA = [], logB = [];
    let iA = 0, iB = 0;
    const runsA = spreadRuns(rA, rng), runsB = spreadRuns(rB, rng);
    if (skipStats) {   // 내가 뛴 경기는 중계(game.js)가 이미 타석을 적립했어요 — 두 번 세지 않아요
      if (aWin && rng() < PIT.winGate) spA.wins++;
      if (!aWin && rng() < PIT.winGate) spB.wins++;
      if (close && rng() < PIT.saveGate) (aWin ? A : B).pitchers[PIT.rot].saves++;
      return { rA, rB, aWin, logA, logB };
    }
    const SP_INN = 6;      // 선발은 6이닝까지 — 그 뒤는 불펜이라 개인 기록에 안 붙여요
    /* 팀 실점은 팀 전력이 정해요. 그 안에서 **그 투수가 팀 평균보다 나은 만큼** 덜 받아요 —
     * 안 그러면 모든 선발의 자책이 팀 값으로 뭉쳐서 평균자책 순위가 안 생겨요. */
    const erkA = clamp(A.def / (spA.skill || 1), 0.5, 1.7);
    const erkB = clamp(B.def / (spB.skill || 1), 0.5, 1.7);
    for (let inn = 0; inn < 9; inn++) {
      const pOnA = inn < SP_INN ? spB : null, pOnB = inn < SP_INN ? spA : null;
      const pa = playInning(runsA[inn], rng, A.batters, iA, pOnA || spB);
      if (pa) { creditPAs(pa, pOnA, erkB); iA += pa.length; logA.push({ inn: inn + 1, pas: pa }); }
      const pb = playInning(runsB[inn], rng, B.batters, iB, pOnB || spA);
      if (pb) { creditPAs(pb, pOnB, erkA); iB += pb.length; logB.push({ inn: inn + 1, pas: pb }); }
    }
    if (aWin && rng() < PIT.winGate) spA.wins++;
    if (!aWin && rng() < PIT.winGate) spB.wins++;
    if (close && rng() < PIT.saveGate) (aWin ? A : B).pitchers[PIT.rot].saves++;
    // 도루는 타석 밖 사건이라 따로 굴려요 (타석 재현에는 안 담겨요)
    for (const t of [A, B]) for (const b of t.batters) if (!b.me) b.sb = (b.sb || 0) + poisson(rng, BAT.sbBase * b.skill);
    return { rA, rB, aWin, logA, logB };
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

  /* ---------- 🧾 타석 단위 이닝 재현 (play-by-play) ----------
   * 이 게임의 점수·승패는 이미 밸런스가 잡힌 모델이 정해요. 여기서는 그 결과를 **바꾸지 않고**,
   * "그 이닝에 N점이 어떻게 났는지"를 타석 시퀀스로 채워 넣어요.
   *   · 득점 합계가 목표(runsTarget)와 **정확히 같을 때까지만** 채택해요 → 총점이 안 흔들려요.
   *   · 그래서 누가 1루에 있다가 홈을 밟았는지를 엔진이 알게 돼요(다이아몬드가 진짜로 움직여요).
   * 난수는 넘겨받은 시드 PRNG만 써요 — 전역 Math.random을 쓰지 않아요. */
  /* 타석 결과 확률 — 타자 skill과 상대 투수 skill의 비로 움직여요.
   * 스타 타자가 실제로 더 치고, 좋은 투수가 실제로 더 잡아야 순위표가 납득돼요. */
  /* ⚠️ 홈런 확률이 유난히 낮아 보여도 맞아요. 이닝을 **목표 득점과 정확히 같을 때까지**
   * 다시 굴리는 방식이라(밸런스 보호), 한 방에 점수를 맞추는 홈런이 자연히 많이 뽑혀요.
   * 그 편향까지 포함해 실측(sim-test)으로 맞춘 값이에요 — 감으로 올리지 마세요. */
  const PA_BASE = { hr: 0.0098, triple: 0.004, double: 0.033, single: 0.097, walk: 0.066 };
  const K_SHARE = 0.34;         // 아웃 중 삼진 비율 (투수 skill로 오르내려요)
  function paProbs(bs, ps) {
    const f = clamp((bs || 1) / (ps || 1), 0.78, 1.30);
    const hr = PA_BASE.hr * Math.pow(f, 2.3);
    const tr = PA_BASE.triple * f;
    const db = PA_BASE.double * Math.pow(f, 1.15);
    const sg = PA_BASE.single * f;
    const bb = PA_BASE.walk * Math.pow(f, 0.5);
    const out = Math.max(0.06, 1 - (hr + tr + db + sg + bb));
    return [["homer", hr, 4], ["triple", tr, 3], ["double", db, 2], ["single", sg, 1], ["walk", bb, 1], ["out", out, 0]];
  }
  const PA_TEXT = {
    homer: ["담장을 넘기는 홈런", "큼지막한 아치", "완벽하게 걷어올린 홈런"],
    triple: ["우중간을 가르는 3루타", "펜스를 맞히는 3루타"],
    double: ["좌중간 2루타", "빠지는 2루타", "가르는 2루타"],
    single: ["중전 안타", "좌전 안타", "우전 안타", "빗맞은 내야안타"],
    walk: ["볼넷", "풀카운트 끝 볼넷", "몸에 맞는 공"],
    k: ["삼진", "루킹 삼진", "헛스윙 삼진"],
    out: ["유격수 땅볼", "중견수 뜬공", "2루수 땅볼", "1루수 파울플라이", "3루수 직선타"],
  };

  /* 한 이닝을 타석 단위로 굴려요. lineup은 선수 객체 배열(skill·이름), pit은 상대 선발.
   * 반환의 pas 하나하나가 곧 기록이에요 — 부르는 쪽이 creditPAs로 적립해요. */
  function tryInning(rng, lineup, startIdx, pit) {
    const bases = [null, null, null];
    const ps = (pit && pit.skill) || 1;
    let outs = 0, runs = 0, i = startIdx || 0;
    const pas = [];
    while (outs < 3 && pas.length < 22) {
      const who = lineup[i % lineup.length]; i++;
      const probs = paProbs(who && who.skill, ps);
      let r = rng(), acc = 0, kind = "out", adv = 0;
      for (const [k, p, a] of probs) { acc += p; if (r < acc) { kind = k; adv = a; break; } }
      const scored = [];
      if (adv === 0) {
        outs++;
        // 아웃 중 일부는 삼진 — 투수가 좋을수록 많아요
        if (rng() < clamp(K_SHARE * ps, 0.15, 0.62)) kind = "k";
      } else {
        for (let bI = 2; bI >= 0; bI--) {
          if (!bases[bI]) continue;
          const to = bI + adv;
          if (to >= 3) { scored.push(bases[bI]); runs++; } else { bases[to] = bases[bI]; }
          bases[bI] = null;
        }
        if (adv >= 4) { scored.push(who); runs++; }
        else bases[adv - 1] = who;
      }
      const pool = PA_TEXT[kind] || PA_TEXT.out;
      pas.push({
        who: (who && who.name) || String(who), kind, outs, runs,
        scored: scored.map((x) => (x && x.name) || String(x)),
        bases: bases.map((x) => (x ? ((x && x.name) || String(x)) : null)),
        text: pool[Math.floor(rng() * pool.length)],
        _b: who, _p: pit,
      });
    }
    return { pas, runs };
  }
  /* 목표 득점과 **정확히 같은** 이닝이 나올 때까지 다시 굴려요.
   * 못 맞추면 null — 부르는 쪽이 예전 요약 한 줄로 떨어지면 돼요(안전). */
  function playInning(runsTarget, rng, lineup, startIdx, pit) {
    let names = lineup;
    if (!names || !names.length) names = ["1번타자", "2번타자", "3번타자", "4번타자", "5번타자", "6번타자", "7번타자", "8번타자", "9번타자"];
    // 문자열 배열로 들어오면 균일 능력치 선수로 감싸요 (고교 경기 등)
    if (typeof names[0] === "string") names = names.map((n) => ({ name: n, skill: 1 }));
    for (let t = 0; t < 400; t++) {
      const got = tryInning(rng, names, startIdx || 0, pit);
      if (got.runs === runsTarget) return got.pas;
    }
    return null;
  }
  /* 🧾 타석들을 **그대로 기록에 적립**해요 — 중계에서 본 것과 순위표가 100% 같아지는 자리예요.
   * skipMe면 내 자리(me:true)는 건너뛰어요 — 내 기록은 실제 플레이가 정본이니까요. */
  function creditPAs(pas, pit, erK) {
    if (!pas) return;
    let outs = 0;
    for (const p of pas) {
      const b = p._b;
      if (b && typeof b === "object" && !b.me) {
        if (p.kind !== "walk") b.ab = (b.ab || 0) + 1;
        if (p.kind === "single" || p.kind === "double" || p.kind === "triple" || p.kind === "homer") b.hits = (b.hits || 0) + 1;
        if (p.kind === "homer") b.hr = (b.hr || 0) + 1;
      }
      if (p.kind === "k" || p.kind === "out") outs++;
    }
    const pitcher = pit || (pas[0] && pas[0]._p);
    if (pitcher && typeof pitcher === "object" && !pitcher.me) {
      pitcher.ip = (pitcher.ip || 0) + outs / 3;
      pitcher.k = (pitcher.k || 0) + pas.filter((p) => p.kind === "k").length;
      pitcher.er = (pitcher.er || 0) + (pas.length ? pas[pas.length - 1].runs : 0) * (erK || 1);
    }
  }
  // 그 경기 득점을 이닝별로 흩뿌려요 (9이닝). 합계는 그대로예요.
  function spreadRuns(total, rng, innings) {
    const n = innings || 9, out = new Array(n).fill(0);
    for (let i = 0; i < total; i++) out[Math.floor(rng() * n)]++;
    return out;
  }

  window.RookieSim = {
    buildLeague, simSeason, simGame, leaders, avgOf, eraOf,
    playInning, tryInning, creditPAs, spreadRuns, paProbs, PA_TEXT,
    _c: { LG_RUNS, WIN_SPREAD, BAT, PIT, teamRating }, _mulberry32: mulberry32,
  };
})();
