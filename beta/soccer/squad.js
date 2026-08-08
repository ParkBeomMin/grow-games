/* 👥 스쿼드 — 우리 팀에 실제로 사람이 있게 하는 파일이에요.
 *
 * 예전에는 팀이라는 게 숫자 몇 개뿐이었어요. 동료 골은 이름 없이 굴렀고,
 * 중계에 뜨는 이름은 **개인 순위 8명 중 우리 클럽 소속인 한두 명**에게서
 * 빌려 썼습니다("한 팀에 선수는 11명으로 있는 거 맞지?" — 아니었어요).
 *
 * 이제 **리그의 모든 클럽**이 선발 11 + 벤치 5, 16명씩 갖습니다.
 * 우리 팀만 사람이 있고 상대는 숫자뿐이면, 개인 순위에 뜨는 다른 팀 선수와
 * 그 팀의 실제 명단이 또 서로 모르는 사이가 돼요 — 이 저장소의 단골 병이에요.
 *   · 선발은 **포지션 자리마다 실력 순**으로 정해져요. 내 종합이 그 경쟁에 들어가요.
 *   · 선발이 아니면 경기를 못 뛰어요. 대신 그 주에 능력치 하나가 올라요 —
 *     "결장 = 성장 정지"가 되면 벤치는 그냥 벌이 되고, 그건 이탈로 이어져요.
 *   · 동료 골은 **선발 명단에서** 포지션 가중으로 뽑아 그 선수 기록에 쌓여요.
 *
 * 이 구조가 만드는 것: 약팀으로 가면 선발이 쉽고 강팀에 가면 벤치를 각오해야
 * 해요. 이적이 "어느 리그로"만이 아니라 "뛸 수 있느냐"의 문제가 됩니다.
 *
 * game.js의 전역(S, rand, randInt, clamp, pick, shuffle, overall, clubStrOf,
 * statCap, POS_INFO, STAT_DEFS, randomPlayerName, MARKETS)을 쓰므로
 * game.js 뒤에 로드해야 해요. */
"use strict";

window.WingerSquad = (() => {
  /* 4-4-2가 아니라 이 게임의 포지션 넷(공격수·윙어·미드필더·수비수)에 맞춘 배치예요.
   * 합이 11이에요 — 골키퍼는 이 게임에 없어요. */
  const FORMATION = { fw: 2, wg: 2, mf: 4, df: 3 };
  const BENCH = 5;
  const SQUAD_SIZE = 11 + BENCH;

  /* 동료 실력 — 클럽 전력을 가운데 두고 흩어져요. 폭이 좁으면 내 종합이 조금만
   * 올라도 늘 선발이 되고, 넓으면 운이 다 정합니다. ±14가 그 사이예요. */
  const STR_SPREAD = 14;

  const POS_KEYS = ["fw", "wg", "mf", "df"];
  const posName = (p) => (POS_INFO[p] || {}).name || p;

  /* 클럽 하나의 스쿼드를 꾸려요. base는 그 클럽의 전력이에요.
   * mine이면 내 자리 하나를 나로 바꿔요. */
  function rollSquad(base, mine) {
    const need = {};
    for (const p of POS_KEYS) need[p] = FORMATION[p];
    // 벤치 몫은 포지션에 고르게 흩뿌려요
    for (let i = 0; i < BENCH; i++) need[POS_KEYS[i % POS_KEYS.length]] += 1;
    if (mine) need[S.pos] = Math.max(need[S.pos], FORMATION[S.pos] + 1);   // 내 자리엔 경쟁자가 있어야 해요

    const list = [];
    for (const p of POS_KEYS) {
      for (let i = 0; i < need[p]; i++) {
        list.push({
          name: randomPlayerName(Math.random() < 0.55 ? null : MARKETS.find((m) => m.id === "eu")),
          pos: p, str: clamp(base + rand(-STR_SPREAD, STR_SPREAD), 25, 99),
          g: 0, a: 0, d: 0, apps: 0,
        });
      }
    }
    if (mine) {
      /* 내 자리 하나를 나로 바꿔요. 스쿼드에는 **나도 한 줄로** 들어가야
       * 선발 경쟁이 같은 표 안에서 벌어져요. */
      const at = list.findIndex((x) => x.pos === S.pos);
      list[at] = { me: true, name: S.name, pos: S.pos, str: 0, g: 0, a: 0, d: 0, apps: 0 };
    }
    return list.slice(0, SQUAD_SIZE);
  }

  /* 리그의 **모든 클럽** 명단을 세이브에 둬요. 리그나 내 클럽이 바뀌면 다시 꾸립니다.
   * 옛 세이브에는 아예 없어요 — 마이그레이션하지 않고 여기서 만듭니다.
   * 크기는 6팀 × 16명 = 96줄이라 세이브에 담아도 부담이 없어요. */
  function ensureSquads() {
    if (!S || !S.group) return {};
    const lg = leagueOf(S).id;
    if (!S.squads || S.squadsLeague !== lg || S.squadClub !== S.group) {
      const out = {};
      for (const c of clubsIn(lg, S)) out[c.name] = rollSquad(c.str, c.name === S.group);
      // 내 클럽이 리그 명단에 없는 옛 세이브 방어 — 없으면 만들어 둬요
      if (!out[S.group]) out[S.group] = rollSquad(clubStrOf(S), true);
      S.squads = out;
      S.squadsLeague = lg;
      S.squadClub = S.group;
      save();
    }
    // 내 줄의 실력은 늘 지금 종합이에요 (훈련·각성으로 계속 움직여요)
    for (const x of S.squads[S.group] || []) if (x.me) { x.str = overall(); x.name = S.name; }
    return S.squads;
  }
  const squadOf = (club) => ensureSquads()[club] || [];
  const ensureSquad = () => squadOf(S.group);        // 우리 팀

  /* 선발 11명 — 포지션 자리마다 실력 순이에요. */
  function startingXIOf(club) {
    const sq = squadOf(club);
    const out = [];
    for (const p of POS_KEYS) {
      const line = sq.filter((x) => x.pos === p).sort((a, b) => b.str - a.str);
      out.push(...line.slice(0, FORMATION[p]));
    }
    return out;
  }
  const startingXI = () => startingXIOf(S.group);
  const isStarter = () => startingXI().some((x) => x.me);

  /* 🥇 개인 순위에 올릴 리그의 얼굴들 — **각 클럽의 선발 중 실력 상위**예요.
   * 예전에는 이름을 새로 지어 8명을 만들었어요. 그러면 개인 순위에 뜬 그 선수가
   * 어느 팀 명단에도 없는 유령이 됩니다. 이제 실제 사람 중에서 뽑아요. */
  function leagueFaces(n) {
    const all = [];
    for (const club of Object.keys(ensureSquads())) {
      const xi = startingXIOf(club).filter((x) => !x.me).sort((a, b) => b.str - a.str);
      xi.forEach((x, i) => all.push({ club, player: x, seed: x.str - i * 2 }));
    }
    all.sort((a, b) => b.seed - a.seed);
    /* 클럽마다 최소 한 명씩 먼저 넣고, 남는 자리를 실력 순으로 채워요 —
     * 안 그러면 강팀 선수만 표를 채워서 "리그 경쟁"이 아니라 "그 팀 명단"이 돼요. */
    const out = [], used = new Set(), byClub = new Set();
    for (const cand of all) {
      if (byClub.has(cand.club)) continue;
      out.push(cand); used.add(cand.player); byClub.add(cand.club);
      if (out.length >= n) break;
    }
    for (const cand of all) {
      if (out.length >= n) break;
      if (used.has(cand.player)) continue;
      out.push(cand); used.add(cand.player);
    }
    return out.slice(0, n);
  }

  /* 내 자리 경쟁 — 같은 포지션에서 몇 등인가, 선발 자리는 몇 개인가. */
  function myLine() {
    const sq = ensureSquad();
    const line = sq.filter((x) => x.pos === S.pos).sort((a, b) => b.str - a.str);
    return { rank: line.findIndex((x) => x.me) + 1, of: line.length, slots: FORMATION[S.pos], line };
  }

  /* 🪑 벤치 주 — 경기를 못 뛴 대신 능력치 하나가 올라요.
   * 결장이 곧 성장 정지가 되면 벤치는 그냥 벌이 되고, 그건 이탈로 이어져요. */
  const BENCH_GAIN = [1.6, 3.2];
  function benchTurn() {
    const defs = Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos];
    const pool = defs.filter((d) => S.stats[d.key] < statCap(d.key));
    const d = pick(pool.length ? pool : defs);
    const gain = Math.round(rand(BENCH_GAIN[0], BENCH_GAIN[1]) * S.talents[d.key] * 10) / 10;
    S.stats[d.key] = clamp(S.stats[d.key] + gain, 0, statCap(d.key));
    S.condition = clamp(S.condition + randInt(4, 10), 0, 100);   // 안 뛰었으니 몸은 쉬어요
    return { key: d.key, name: d.name, emoji: d.emoji, gain };
  }

  /* 동료 골을 넣을 사람 — **선발 중에서** 포지션 가중으로 뽑아요.
   * 나는 빼요. 내 골은 이미 내 기록으로 따로 쌓입니다. */
  const SCORE_W = { fw: 1.0, wg: 0.75, mf: 0.4, df: 0.12 };
  function pickScorer() {
    const xi = startingXI().filter((x) => !x.me);
    if (!xi.length) return null;
    let total = 0;
    for (const x of xi) total += (SCORE_W[x.pos] || 0.4) * (x.str / 70);
    let r = Math.random() * total;
    for (const x of xi) {
      r -= (SCORE_W[x.pos] || 0.4) * (x.str / 70);
      if (r <= 0) return x;
    }
    return xi[xi.length - 1];
  }
  /* 이번 경기에서 동료가 넣은 골을 실제 선수에게 배분해요. 이름 배열을 돌려줘서
   * 중계가 그대로 쓰고, 그 선수의 시즌 기록에도 쌓입니다. */
  function creditMateGoals(n) {
    const names = [];
    for (let i = 0; i < n; i++) {
      const who = pickScorer();
      if (!who) break;
      who.g += 1;
      names.push(who.name);
    }
    return names;
  }
  // 선발이 한 경기를 치렀다고 표시해요 (명단 화면의 출전 수)
  function markApps() { for (const x of startingXI()) x.apps += 1; }

  /* 새 시즌 — 리그 전체의 시즌 기록만 비워요. 명단은 그대로예요. */
  function resetSeason() {
    if (!S.squads) return;
    for (const club of Object.keys(S.squads)) {
      for (const x of S.squads[club]) { x.g = 0; x.a = 0; x.d = 0; x.apps = 0; }
    }
  }

  // ---------- 화면 ----------
  function squadHTML() {
    const xi = startingXI();
    const inXI = new Set(xi);
    const sq = ensureSquad();
    const row = (x) => `<tr class="${x.me ? "me" : ""}">`
      + `<td>${x.name}${x.me ? " <b>(나)</b>" : ""}</td>`
      + `<td class="sq-pos">${posName(x.pos)}</td>`
      + `<td class="sq-str">${Math.round(x.str)}</td>`
      + `<td class="sq-rec">${x.apps ? `${x.apps}경기 ⚽${x.g}` : "-"}</td></tr>`;
    const group = (list) => list.map(row).join("");
    const bench = sq.filter((x) => !inXI.has(x)).sort((a, b) => b.str - a.str);
    const L = myLine();
    const head = `<tr><th>선수</th><th>포지션</th><th>실력</th><th>기록</th></tr>`;
    return `<div class="sq-note">${
      isStarter()
        ? `✅ <b>선발</b> — ${posName(S.pos)} ${L.slots}자리 중 ${L.rank}번째예요`
        : `🪑 <b>벤치</b> — ${posName(S.pos)} ${L.slots}자리인데 ${L.rank}번째예요.`
          + ` 실력을 올려 앞사람을 넘어야 뛸 수 있어요`}</div>`
      + `<table class="rank-table season-standings squad-table"><thead>${head}</thead>`
      + `<tbody><tr class="sq-sep"><td colspan="4">⚽ 선발 11</td></tr>${group(xi)}`
      + `<tr class="sq-sep"><td colspan="4">🪑 벤치 ${bench.length}</td></tr>${group(bench)}</tbody></table>`;
  }

  return {
    ensureSquads, ensureSquad, squadOf, startingXI, startingXIOf, leagueFaces,
    isStarter, myLine, benchTurn, creditMateGoals, markApps, resetSeason, squadHTML,
    FORMATION, BENCH, SQUAD_SIZE, BENCH_GAIN, SCORE_W,
    _t: { rollSquad, pickScorer },
  };
})();
