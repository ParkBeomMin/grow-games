/* ⚾ 더 루키 가을야구 — 대진 구성과 시리즈 판정
 *
 * 화면을 모르는 계산만 담아요. career.js가 이 결과를 그려요.
 * 실제 KBO 구조를 따라요: 5팀 진출, 와일드카드 → 준PO → PO → 한국시리즈.
 */
(function () {
  "use strict";

  // 시리즈 승리에 필요한 승수
  const NEED = { wc: 2, semi: 3, po: 3, ks: 4 };
  // 시리즈 최대 경기 수 (와일드카드는 4위가 1승 안고 시작해서 2경기)
  const MAX_GAMES = { wc: 2, semi: 5, po: 5, ks: 7 };
  const LABEL = { wc: "와일드카드", semi: "준플레이오프", po: "플레이오프", ks: "한국시리즈" };

  // 순위 → 그 팀이 처음 나서는 라운드
  const roundOfRank = (rank) =>
    rank >= 4 ? "wc" : rank === 3 ? "semi" : rank === 2 ? "po" : "ks";

  // a는 항상 상위 시드예요. aHead는 와일드카드 4위가 안고 시작하는 승수(1).
  const mkSeries = (round, a, b, aHead) => ({
    round, a, b,
    aw: aHead || 0, bw: 0,
    need: NEED[round],
    done: false, winner: null,
  });

  /* 최종 순위(승수 내림차순)와 내 팀 이름을 받아 대진표를 만들어요.
   * 내 팀이 6위 이하면 null이에요 — 가을야구가 없어요. */
  function buildBracket(standings, myTeam) {
    const rank = standings.findIndex((t) => t.name === myTeam) + 1;
    if (rank < 1 || rank > 5) return null;
    const at = (r) => standings[r - 1].name;
    return {
      series: [
        mkSeries("wc", at(4), at(5), 1),   // 4위가 1승 안고 시작
        mkSeries("semi", at(3), null, 0),  // 상대는 와일드카드 승자
        mkSeries("po", at(2), null, 0),    // 상대는 준PO 승자
        mkSeries("ks", at(1), null, 0),    // 상대는 PO 승자
      ],
      myTeam,
      myRank: rank,
      myRound: roundOfRank(rank),
    };
  }

  /* 한 경기 결과를 시리즈에 반영해 새 객체를 돌려줘요 (원본은 그대로).
   * aWon이 true면 상위 시드가 이긴 거예요. 이미 끝난 시리즈면 그대로 돌려줘요. */
  function advanceSeries(series, aWon) {
    if (series.done) return { ...series };
    const s = { ...series };
    if (aWon) s.aw += 1; else s.bw += 1;
    if (s.aw >= s.need) { s.done = true; s.winner = s.a; }
    else if (s.bw >= s.need) { s.done = true; s.winner = s.b; }
    return s;
  }

  /* NPC끼리의 시리즈를 팀 강도로 끝까지 돌려요.
   * str은 initSeason이 팀마다 부여하는 0.36~0.62 값이에요.
   * 상위 시드에 홈 어드밴티지 0.04를 얹어요. */
  function simSeries(round, aName, bName, strA, strB, aHead) {
    // 계수와 홈 어드밴티지는 2000시즌 시뮬로 맞췄어요. 1위가 시리즈 하나만 이기면 되는
    // 구조라 이 값에서도 1위 우승률이 60% 근처예요 — 더 낮추면 팀 전력이 무의미해져요.
    const p = Math.max(0.2, Math.min(0.8, 0.5 + (strA - strB) * 0.6 + 0.02));
    let s = mkSeries(round, aName, bName, aHead);
    // 최대 경기 수만큼만 돌아요 — 어떤 경우에도 무한루프가 안 나요.
    for (let i = 0; i < MAX_GAMES[round] && !s.done; i++) {
      s = advanceSeries(s, Math.random() < p);
    }
    return s;
  }

  /* 끝난 시리즈의 승자를 바로 다음 라운드의 b 자리에 채운 새 배열을 돌려줘요. */
  function feedWinner(series) {
    const out = series.map((s) => ({ ...s }));
    for (let i = 0; i + 1 < out.length; i++) {
      if (out[i].done && out[i + 1].b == null) out[i + 1].b = out[i].winner;
    }
    return out;
  }

  window.Postseason = { NEED, MAX_GAMES, LABEL, roundOfRank, buildBracket, advanceSeries, simSeries, feedWinner };
})();
