/* ⚾ 더 드래프트 — 리그 선수 명단 (야구 전용, 다른 게임과 공유하지 않아요)
 *
 * 팀마다 간판 타자·투수를 한 명씩 만들어 둬요. 개인 기록 순위(career.js의 raceHTML)가
 * "각 팀의 실제 선수"와 겨루는 것처럼 보이게 하려고요 — 더 윙어(soccer/squad.js)와 같은 결이에요.
 *
 * 이름은 난수가 아니라 **팀 이름 + 연차로 정해요**(시드 PRNG). 그래야
 *   ① 전역 Math.random을 한 톨도 안 써서 밸런스 시뮬(post-mech ⑤)이 안 흔들리고
 *   ② 같은 시즌엔 늘 같은 명단이라 새로고침해도 안 바뀌어요.
 *
 * 실제 선수명은 쓰지 않아요 — 성 + 야구스러운 이름 조각을 붙인 가상 이름이에요.
 */
(function () {
  "use strict";

  // 32비트 시드 PRNG — career.js·테스트의 것과 같은 식이에요.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // 문자열 → 32비트 해시 (팀 이름을 시드로 쓰려고요)
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* 실제 선수명을 피하려고 **야구 별명**으로 지어요 — 성 + 두 글자 야구 단어.
   * 기존 라이벌 이름(강태풍·이대포·최강속…)과 같은 결이에요. 무작위 실명 충돌을 막아요. */
  const SUR = ["강", "이", "박", "최", "정", "김", "윤", "장", "임", "조", "한", "서", "신", "권", "황", "안", "송", "류", "홍", "문", "차", "노", "구", "표"];
  const WORD = [
    "태풍", "대포", "홈런", "강속", "교타", "일발", "노히", "수호", "쾌속", "폭투",
    "방망", "수문", "강타", "광속", "거포", "총알", "벼락", "폭격", "명중", "만루",
    "담장", "송곳", "철벽", "불꽃", "승부", "회오리", "야포", "결정", "칼날", "질풍",
  ];

  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  function nameFrom(rng) {
    return pick(SUR, rng) + pick(WORD, rng);
  }

  /* 한 팀의 간판 선수 두 명(타자·투수)을 만들어요.
   *   pop  — 0..1 강함. 팀 전력(teamStr, 0.36~0.63)을 0.4~1.0으로 늘린 값이에요.
   *   jit  — 종목별 들쭉날쭉(0.82~1.15). 이게 있어야 홈런 순위와 도루 순위 차례가 달라져요.
   * batKeys/pitKeys의 순서대로 종목 지터를 붙여요. */
  const BAT_KEYS = ["hits", "hr", "sb", "avg"];
  const PIT_KEYS = ["wins", "k", "era", "saves"];

  function starOf(rng, cls, pop) {
    const keys = cls === "batter" ? BAT_KEYS : PIT_KEYS;
    const jit = {};
    for (const k of keys) jit[k] = 0.82 + rng() * 0.33;   // 0.82~1.15
    return { name: nameFrom(rng), cls, pop, jit };
  }

  /* 팀 목록 → { 팀이름: { pop, batter, pitcher } }. seed는 연차예요(같은 연차 = 같은 명단). */
  function build(teams, strOf, seed) {
    const out = {};
    for (const team of teams) {
      const rng = mulberry32((hash(team) ^ Math.imul(seed >>> 0, 2654435761)) >>> 0);
      const str = typeof strOf === "function" ? strOf(team) : 0.49;
      const pop = Math.max(0.4, Math.min(1, (str - 0.34) / 0.30));   // 0.36→0.07.. 0.64→1.0 근처
      out[team] = {
        pop,
        batter: starOf(rng, "batter", pop),
        pitcher: starOf(rng, "pitcher", pop),
      };
    }
    return out;
  }

  window.RookieSquad = { build, nameFrom, _mulberry32: mulberry32, _hash: hash, BAT_KEYS, PIT_KEYS };
})();
