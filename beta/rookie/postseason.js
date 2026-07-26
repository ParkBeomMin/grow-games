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

  window.Postseason = { NEED, MAX_GAMES, LABEL, roundOfRank, buildBracket };
})();
