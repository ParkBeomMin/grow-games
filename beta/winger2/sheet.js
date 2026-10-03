/* ⚽ 더 윙어 II 1막 — 📋 스카우트 평가서 · 구간 · ✉️ 문 · 🎓 엔딩 7 · `act1` 얼림 · 🔢 등급
 *
 * 설계: 12번 §6(평가서 · 문 · 엔딩) · §10 · §11-2(`act1`) · 13번 §4-3(여자부 이름) · 23번 §7(감독 의견)
 * 확정 계수: 24번 §2(= 22번 §2 + 몸 점수표 꼭대기 · 테스트 기준선) — 조정될 값은 맨 위 `TUNE` 한 블록.
 *
 * ── 🔒 지키는 것 ────────────────────────────────────────────
 *  · **보이는 값 = 판정 값** — 칸마다 재료를 그대로 펼쳐요(`detail`). 합과 내역이 **같은 함수**에서 나와요.
 *  · **높이는 육성, 문은 선택** — 문은 같은 구간 안의 옆 문일 뿐 높이를 안 바꿔요(12번 §6-2).
 *  · **엔딩 규칙표에 빈칸 · 숨은 굴림이 없어요** — 네 구간 × (문을 고름 / 그 외)가 정확히 한 엔딩.
 *  · 🤝 감독 신뢰는 **점수 0**(23번 §7) — 평가서 맨 아래 「감독 의견」 한 줄로만, 옆에 「점수 0」.
 *  · **중간 평가서는 그 시점의 사실만** — 11월 구간의 예측 · 확률을 적지 않아요(12번 §6-4).
 *  · 엔딩 `id`는 성별로 안 갈려요 — 이름 · 문장만 `gender`를 따라가요(13번 §4-3).
 *  · 🎓 `act1`은 1막 끝에 **한 번** 채우고 다시 안 써요(2막의 입구 — 12번 §11-2). */
"use strict";

window.W2Sheet = (() => {
  /* 🎚️ 조정될 수 있는 상수 — 이 블록만 고칩니다(25번 §5). */
  const TUNE = Object.freeze({
    /* 🏋️ 몸 — 한 능력치의 점수를 문턱 사이에서 **선으로** 이음(40 밑 0 · **88 위는 S 값으로 평평**) */
    BODY_PTS: [[40, 0], [45, 1.2], [52, 2.6], [60, 3.5], [68, 4.2], [77, 4.45], [88, 4.55]],   // 24번 §2
    BODY_MUL: 1.5,                                   // 21번 §3-3 — 여섯 점수 합 × 1.5(칸 폭 45 설계)
    LAMBDA: 1,                                       // 24번 §2 — 품질 배율 λ(몸 · 솜씨 칸을 함께)
    SKILL_LO: 0.30, SKILL_SPAN: 0.50, SKILL_MAX: 10, // 21번 §3-3 — 🎮 솜씨 10 × clamp((s̄ − .30) ÷ .50)
    N_POS: { fw: 55.91, wg: 54.24, mf: 55.82, df: 47.05 },   // 24번 §2 — ⚽ 기록 경기당 원점수에 곱함(🔗 중립화)
    REC_MAX: 40,                                     // 21번 §3-3 — 기록 칸 상한
    STAGE_PTS: [0, 3, 5, 7, 8, 10],                  // 21번 §3-3 — 조별 · 16강 · 8강 · 4강 · 준우승 · 우승
    LEAGUE_WIN_PT: 1, STAGE_MAX: 10,                 // 〃 — 권역 리그 우승 +1 · 상한 10
    TEST_TECH: 2.8, TEST_MATCH: 4.2,                 // 21번 §2-3 · 24번 §2 — 🎯 테스트 0~7(기술 0~2.8 · 연습경기 0~4.2)
    T: { top: 69.9, high: 60.4, mid: 51.3 },         // 24번 §2를 화면 한 자리로(69.93 · 60.37 · 51.31) — 구간은 **화면의 합계**로 갈라요
    TRUST_LINE: 4,                                   // 23번 §7 — 감독 의견 한 줄이 갈리는 🤝(±4)
    TEST_REF: 56.0,                                  // 24번 §2 — 기술 판 중심의 능력치 기준선
    TEST_P: { goal: 1 / 3, assist: 1 / 3, defend: 1 / 2 },   // 12번 §5-4 — 🔗 판 한 번 기댓값 1점(포지션 무관)
  });
  /* 📐 기록 가중 — 옛 `career.js` `POS_AXIS`의 g · a · d 그대로(22번 §2-1 「기록 가중」 · `w_cs` 0) */
  const AXIS = { fw: { g: 1.0, a: 0.5, d: 0.15 }, wg: { g: 0.8, a: 0.8, d: 0.15 }, mf: { g: 0.5, a: 1.0, d: 0.30 }, df: { g: 2.0, a: 1.0, d: 0.55 } };

  /* ---------- 🔢 등급 F~S — 불균등 구간(12번 §10-1) · 칸마다 「+」가 한 번(승급 카드 13칸) ----------
   * 🔒 「+」는 그 등급 구간의 **가운데**부터예요(D 52~60 → D+ 56 — `allc` 「여섯 모두 D+(56)」과 같은 자). */
  const GRADES = [["F", -Infinity], ["F+", 42.5], ["E", 45], ["E+", 48.5], ["D", 52], ["D+", 56], ["C", 60], ["C+", 64],
    ["B", 68], ["B+", 72.5], ["A", 77], ["A+", 82.5], ["S", 88], ["S+", 94]];
  function grade(v) {
    let i = 0;
    for (let k = 1; k < GRADES.length; k++) if (v >= GRADES[k][1]) i = k;
    const next = GRADES[i + 1] || null;
    const lo = Number.isFinite(GRADES[i][1]) ? GRADES[i][1] : 40;
    return { g: GRADES[i][0], i, next: next ? next[0] : null, at: next ? next[1] : null,
      p: next ? Math.min(1, Math.max(0, (v - lo) / (next[1] - lo))) : 1 };
  }
  const STAT = {
    shoot: { emoji: "⚽", name: "슈팅" }, pass: { emoji: "🎯", name: "패스" }, dribble: { emoji: "🌀", name: "드리블" },
    defense: { emoji: "🛡️", name: "수비" }, stamina: { emoji: "🫀", name: "체력" }, speed: { emoji: "⚡", name: "스피드" },
  };
  const KEYS = Object.keys(STAT);
  const POS = { fw: "공격수", wg: "윙어", mf: "미드필더", df: "수비수" };
  const r2 = (v) => Math.round(v * 100) / 100;
  /* 🔢 화면 한 자리(0.1 단위 정수) — 합계는 원래 합을 반올림하고, 칸은 내림한 뒤 남는 0.1을 **나머지가 큰 칸부터**
   *    하나씩(같으면 앞 칸) 줘요. 그래서 칸 숫자를 더하면 화면의 합계와 정확히 같아요(보이는 값 = 판정 값). */
  function tenths(vals) {
    const x = vals.map((v) => Math.round(v * 1e7) / 1e6);       // 10배 — 부동소수 찌꺼기(39.9999…)는 떼고
    const base = x.map(Math.floor);
    let left = Math.round(x.reduce((a, b) => a + b, 0)) - base.reduce((a, b) => a + b, 0);
    const order = x.map((_, i) => i).sort((i, j) => (x[j] - base[j]) - (x[i] - base[i]) || i - j);
    for (const i of order) { if (left <= 0) break; base[i] += 1; left -= 1; }
    return base;
  }

  function bodyPt(v) {
    const P = TUNE.BODY_PTS;
    if (!(v > P[0][0])) return 0;
    for (let k = 1; k < P.length; k++) {
      if (v <= P[k][0]) {
        const [x0, y0] = P[k - 1], [x1, y1] = P[k];
        return y0 + ((v - x0) / (x1 - x0)) * (y1 - y0);
      }
    }
    return P[P.length - 1][1];
  }

  /* ---------- 📋 평가서 — 칸 다섯 + 감독 의견(점수 0) ----------
   * `final`이 거짓이면 **중간 평가서**(그 시점까지의 기록으로) — 테스트 · 대회가 아직이면 0점과 그 까닭을 적어요. */
  function compute(S, final) {
    const T = TUNE;
    const lam = T.LAMBDA;
    const rec = S.record || {};
    // 🏋️ 몸
    const parts = KEYS.map((k) => {
      const v = Number(S.stats && S.stats[k]) || 0;
      return { k, label: `${STAT[k].emoji} ${STAT[k].name}`, v: Math.round(v * 10) / 10, grade: grade(v).g, pt: r2(bodyPt(v)) };
    });
    const bodySum = parts.reduce((a, p) => a + bodyPt(Number(S.stats[p.k]) || 0), 0);
    const body = bodySum * T.BODY_MUL * lam;
    const bodyMax = KEYS.length * T.BODY_PTS[T.BODY_PTS.length - 1][1] * T.BODY_MUL * lam;
    // 🎮 솜씨 — 공식 경기에서 내가 둔 판(승부차기 내 킥 포함 · 연습경기 · 기술 판 제외) · 판이 없으면 0.5
    const sN = Number(rec.sN) || 0;
    const sBar = sN > 0 ? (Number(rec.sSum) || 0) / sN : 0.5;
    const sAuto = Math.min(sN, Math.max(0, Math.floor(Number(rec.sAuto)) || 0));   // 그중 🤖 자동(사람이 안 둔 판 · s = 0.5)
    const skill = T.SKILL_MAX * Math.min(1, Math.max(0, (sBar - T.SKILL_LO) / T.SKILL_SPAN)) * lam;
    // ⚽ 기록 — 포지션 축 원점수의 **경기당** 평균(리그 + 대회) × n_pos · 상한 40
    const ax = AXIS[S.pos] || AXIS.fw;
    const games = Number(rec.apps) || 0;
    const raw = (Number(rec.g) || 0) * ax.g + (Number(rec.a) || 0) * ax.a + (Number(rec.d) || 0) * ax.d;
    const perGame = games > 0 ? raw / games : 0;
    const record = Math.min(T.REC_MAX, (T.N_POS[S.pos] || 50) * perGame);
    // 🏆 무대 — 전국대회 도달 + 권역 리그 우승
    const cup = (S.world && S.world.cup) || {};
    const cupDone = !!cup.done;
    const leagueWin = !!S.leagueChamp;
    const stagePt = Math.min(T.STAGE_MAX, (cupDone ? T.STAGE_PTS[cup.stage || 0] : 0) + (leagueWin ? T.LEAGUE_WIN_PT : 0));
    // 🎯 테스트 — 기술 판(0~6점) + 연습경기 평점
    const tst = S.test || {};
    const tested = tst.rating != null;
    const tech = tested ? (Number(tst.tech) || 0) * T.TEST_TECH / 6 : 0;
    const match = tested ? Math.min(T.TEST_MATCH, Math.max(0, (Number(tst.rating) - 1) * T.TEST_MATCH / 9)) : 0;
    const test = tech + match;

    const W = window.W2World;
    const stageName = W ? W.STAGE_NAME[cup.stage || 0] : "";
    /* 🔢 칸 · 합계 · 구간을 **화면 한 자리**로 — 화면에 보이는 합계가 곧 구간을 가르는 값이에요 */
    const t10 = tenths([body, skill, record, stagePt, test]);
    const total = t10.reduce((a, b) => a + b, 0) / 10;
    const cols = [
      { k: "body", label: "🏋️ 몸", v: t10[0] / 10, max: r2(bodyMax),
        note: `여섯 능력치 점수 합 ${r2(bodySum)} × ${T.BODY_MUL}`, detail: { parts } },
      { k: "skill", label: "🎮 솜씨", v: t10[1] / 10, max: T.SKILL_MAX * lam,
        note: sN === 0 ? "아직 둔 판이 없어요 — 평균 0.50으로 셈해요"
          : sAuto >= sN ? `판 ${sN}번 · 모두 🤖 자동 · 평균 ${sBar.toFixed(2)}`
            : `판 ${sN}번${sAuto > 0 ? `(🤖 ${sAuto})` : ""} · 평균 ${sBar.toFixed(2)}`,
        detail: { n: sN, auto: sAuto, avg: r2(sBar) } },
      { k: "record", label: "⚽ 기록", v: t10[2] / 10, max: T.REC_MAX,
        note: games > 0 ? `${games}경기 · 경기당 ${perGame.toFixed(2)}` : "아직 공식 경기가 없어요",
        detail: { games, g: Number(rec.g) || 0, a: Number(rec.a) || 0, d: Number(rec.d) || 0, perGame: r2(perGame) } },
      { k: "stage", label: "🏆 무대", v: t10[3] / 10, max: T.STAGE_MAX,
        note: (cupDone ? `${cup.name || "전국대회"} ${stageName}` : "7월 말 전국대회 전이에요") + (leagueWin ? " · 권역 리그 우승 +1" : ""),
        detail: { stage: cupDone ? cup.stage || 0 : null, league: leagueWin } },
      { k: "test", label: "🎯 테스트", v: t10[4] / 10, max: T.TEST_TECH + T.TEST_MATCH,
        note: tested ? `기술 ${Number(tst.tech) || 0}/6점 · 연습경기 평점 ${Number(tst.rating).toFixed(1)}` : "11월 공개 테스트 전이에요",
        detail: tested ? { tech: Number(tst.tech) || 0, rating: Number(tst.rating) } : null },
    ];
    const tier = tierOf(total);
    return { final: !!final, week: S.week, cols, total, tier, tierName: TIER_NAME[tier],
      coach: coachOf(S), doors: final ? doorsOf(S, tier) : [],
      memo: final ? "" : "지금까지의 기록으로 매긴 점수예요 — 11월엔 달라질 수 있어요",
      who: S.preset && S.gender ? `${S.preset}-${S.gender}` : null };
  }
  const TIER_NAME = { top: "최상", high: "상", mid: "중", low: "하" };
  /* 0.1 단위 정수로 견줘요 — 69.9와 699/10이 부동소수로 갈리지 않게 */
  const tierOf = (total) => {
    const t = Math.round(Number(total) * 10), at = (x) => t >= Math.round(x * 10), T = TUNE.T;
    return at(T.top) ? "top" : at(T.high) ? "high" : at(T.mid) ? "mid" : "low";
  };
  /* 📝 감독 의견 — 🤝 구간의 문장 한 줄 · **점수 0**(23번 §7) · 반신 표정도 같은 구간에서 */
  function coachOf(S) {
    const t = Number(S.trust) || 0;
    const L = TUNE.TRUST_LINE;
    return t >= L ? { mood: "smile", line: "추천합니다", score: 0 }
      : t <= -L ? { mood: "stern", line: "태도에 물음표가 있습니다", score: 0 }
        : { mood: "base", line: "무난합니다", score: 0 };
  }

  /* ---------- ✉️ 문 — 같은 높이의 두 번째 제안(12번 §6-2 · 13번 §4-3) ---------- */
  const DOOR = {
    jiho: { tier: "mid", id: "semi", base: "trainee" },
    doyun: { tier: "high", id: "univ", base: "pro2" },
    haram: { tier: "top", id: "abroad", base: "pro1" },
  };
  const BASE_OF = { top: "pro1", high: "pro2", mid: "trainee", low: "leave" };
  const OFFER = {
    m: { pro1: "🏟️ 1부 구단 우선지명", pro2: "🏟️ 2부 구단 입단", trainee: "🌱 연습생 계약", abroad: "🌏 해외 유스 아카데미",
      univ: "🎓 대학 축구부(장학)", semi: "🏭 아버지가 뛰던 공장 팀(세미프로)", leave: "🎒 다음 길을 찾아요" },
    f: { pro1: "🏟️ 여자 1부 드래프트 1순위", pro2: "🏟️ 여자 1부 드래프트 뒤 라운드 지명", trainee: "🌱 드래프트 밖 테스트 입단",
      abroad: "🌏 해외 여자 클럽 아카데미", univ: "🎓 여자 대학 축구부(장학)", semi: "🏭 그 공장에 새로 생긴 여자팀", leave: "🎒 다음 길을 찾아요" },
  };
  const gOf = (S) => (S.gender === "f" ? "f" : "m");
  /* 그 구간의 제안 목록 — 문이 있는 주인공 · 그 구간이면 둘(문은 깃발을 세웠을 때만 열림) · 아니면 하나 */
  function doorsOf(S, tier) {
    const g = gOf(S);
    const d = DOOR[S.preset];
    const base = BASE_OF[tier];
    const out = [{ id: base, label: OFFER[g][base], open: true }];
    if (d && d.tier === tier) out.push({ id: d.id, label: OFFER[g][d.id], open: !!(S.story && S.story.door) });
    return out;
  }
  /* 🎓 엔딩 규칙표 — 위에서부터 첫 번째(12번 §6-3). `doorId`는 사람이 고른 제안(없으면 기본 문) */
  function endingId(S, tier, doorId) {
    const d = DOOR[S.preset];
    if (d && d.tier === tier && S.story && S.story.door && doorId === d.id) return d.id;
    return BASE_OF[tier];
  }
  const NEXT = { pro1: "pro1", pro2: "pro2", trainee: "trainee", abroad: "abroad" };   // 2막으로 이어지는 넷
  const END_EMO = { pro1: "🏟️", abroad: "🌏", pro2: "🏟️", univ: "🎓", trainee: "🌱", semi: "🏭", leave: "🎒" };
  const END_NAME = {
    m: { pro1: "우선지명", abroad: "바다 건너 첫 계약", pro2: "2부의 부름", univ: "두 번째 운동장",
      trainee: "번외의 계약", semi: "아버지의 운동장", leave: "공을 내려놓은 날" },
    f: { pro1: "드래프트 1순위", abroad: "바다 건너 첫 계약", pro2: "드래프트의 부름", univ: "두 번째 운동장",
      trainee: "번외의 계약", semi: "아버지의 운동장", leave: "공을 내려놓은 날" },
  };
  /* 엔딩 이름 — `bare`면 이모지 없이(화면 조각이 이모지를 따로 붙여요 — `emoji` 칸) */
  const endName = (id, g, bare) => {
    const nm = END_NAME[g === "f" ? "f" : "m"][id] || id;
    return bare || !END_EMO[id] ? nm : `${END_EMO[id]} ${nm}`;
  };
  /* 🗣️ 엔딩 문장 — ⑴ 세계 ⑵ 포지션 ⑶ 공유 이야기 결말 ⑷ 감독의 배웅(🤝) ⑸ 주인공 말투(12번 §6-3 · 23번 §7).
   * 🔒 사람 이름은 틀 자리(`{keeper}` · `{rival}` · `{ace}` · `{me}`)로만 — 성별 낱말 없음(13번 §4-4).
   * 🎒 「공을 내려놓은 날」은 **벌이 아니라 결말**이에요 — 이유는 그해의 평가이지 성별이 아니에요. */
  const END_LINE = {
    m: {
      pro1: "1부 구단이 가장 먼저 {me|를} 불렀어요. 계약서 위에 펜 한 자루와 접힌 유니폼이 놓여 있어요.",
      abroad: "바다 건너 아카데미에서 답장이 왔어요. 창밖의 비행기가 {me|를} 기다리고 있어요.",
      pro2: "2부 구단의 아침 훈련장, 서리 낀 잔디 위에 {me|가} 첫 발자국을 찍어요.",
      univ: "벚꽃이 핀 대학 운동장 — {me|는} 두 번째 길 위에서 다시 뛰기 시작해요.",
      trainee: "번호 없는 훈련복과 가방 하나. 숙소 이층 침대에서 {me|는} 다음 테스트를 기다려요.",
      semi: "아버지가 뛰던 그 공장 옆 운동장. 일하며 뛰는 팀에서 {me|는} 다시 공을 차요.",
      leave: "해 질 녘 동네 운동장, 벤치 위에 공이 하나 남았어요. 올해의 평가는 여기까지였어요.",
    },
    f: {
      pro1: "여자 1부 드래프트, 첫 줄에서 {me|를} 불렀어요. 계약서 위에 펜 한 자루와 접힌 유니폼이 놓여 있어요.",
      abroad: "바다 건너 여자 클럽 아카데미에서 답장이 왔어요. 창밖의 비행기가 {me|를} 기다리고 있어요.",
      pro2: "드래프트 뒤 라운드에서 이름이 불렸어요. 서리 낀 훈련장 잔디 위에 {me|가} 첫 발자국을 찍어요.",
      univ: "벚꽃이 핀 대학 운동장 — {me|는} 두 번째 길 위에서 다시 뛰기 시작해요.",
      trainee: "드래프트 밖 테스트로 들어간 숙소, 이층 침대에서 {me|는} 다음 기회를 기다려요.",
      semi: "아버지가 뛰던 그 공장에 새로 생긴 여자팀. 일하며 뛰는 팀에서 {me|는} 다시 공을 차요.",
      leave: "해 질 녘 동네 운동장, 벤치 위에 공이 하나 남았어요. 올해의 평가는 여기까지였어요.",
    },
  };
  const POS_LINE = {
    fw: "골문 앞 그 자리는 앞으로도 {me|가} 설 곳이에요.",
    wg: "측면을 가르던 발은 다음 무대에서도 그 선을 따라 달려요.",
    mf: "한가운데서 공을 나누던 눈은 다음 무대에서도 앞을 봐요.",
    df: "최종 수비 라인 그 자리 — {me|는} 다음 무대에서도 골문 앞을 지켜요.",
  };
  const COACH_BYE = {
    smile: "강 감독이 추천서를 건네며 어깨를 두드려요. 「가서 보여 줘라.」",
    stern: "강 감독이 짧게 고개만 끄덕여요. 「다음엔 더 믿게 해 줘.」",
    base: "강 감독이 교문 앞에서 손을 흔들어요. 「몸 관리 잘하고.」",
  };
  const VOICE = { jiho: "「됐어, 한 번 더!」", doyun: "「…괜찮아. 다음 무대에서도 계산대로 간다.」", haram: "「에이~ 괜찮아 괜찮아. 재밌으면 끝까지지.」" };
  function ending(S, tier, doorId) {
    const g = gOf(S);
    const id = endingId(S, tier, doorId);
    const W = window.W2World;
    const vars = { me: S.name, keeper: W ? W.short(S.world.keeper.name) : "", rival: "", ace: "" };
    const lines = [W ? W.fill(END_LINE[g][id], vars) : END_LINE[g][id]];
    if (id !== "leave") lines.push(W ? W.fill(POS_LINE[S.pos] || POS_LINE.fw, vars) : POS_LINE[S.pos]);
    const done = (S.story && S.story.done) || [];
    if (done.some((d) => d.sid === "senior" && d.end === "gift")) lines.push(W ? W.fill("관중석 맨 앞줄에서 {keeper|가} 두 손을 흔들어요.", vars) : "");
    lines.push(COACH_BYE[coachOf(S).mood]);
    lines.push(VOICE[S.preset] || VOICE.jiho);
    return { id, tier, tierName: TIER_NAME[tier], next: NEXT[id] || null, name: endName(id, g, true), emoji: END_EMO[id] || "🎓", gender: g, bg: `end-${id}`,
      who: `${S.preset}-${g}`, mood: id === "leave" || !NEXT[id] ? "moved" : "smile", lines: lines.filter(Boolean) };
  }

  /* ---------- 🧊 `act1` — 1막이 끝날 때 한 번 채워 얼리는 요약(12번 §11-2 · 13번 §7) ---------- */
  function freeze(S, filmId) {
    const W = window.W2World;
    const ace = W ? W.aceRow(S) : null;
    const rival = S.world.ours.find((x) => x.role === "rival");
    return {
      ending: S.ending.id, next: NEXT[S.ending.id] || null, tier: S.ending.tier, door: !!S.ending.door,
      preset: S.preset, gender: gOf(S), name: S.name, pos: S.pos, foot: S.foot, no: S.no,
      trust: Number(S.trust) || 0,
      stats: Object.assign({}, S.stats),
      school: { name: S.world.school.name, colors: S.world.school.colors.slice() },
      rivals: {
        rival: rival ? { name: rival.name, pos: rival.pos, str: rival.str } : null,
        ace: ace ? { name: ace.name, school: S.world.league.teams[S.world.league.teams.length - 1].name, pos: ace.pos, str: ace.str } : null,
      },
      stories: ((S.story && S.story.done) || []).map((d) => ({ sid: d.sid, end: d.end })),
      sheet: S.sheet ? { cols: S.sheet.cols.map((c) => ({ k: c.k, v: c.v })), total: S.sheet.total } : null,
      record: Object.assign({}, S.record, { moments: undefined }),
      filmId: filmId || null,
      age: Number(S.age) || 18,
    };
  }

  /* 🎯 기술 테스트 판 — 포지션에 맞는 판 셋(12번 §5-4) */
  const TECH = { fw: ["goal", "goal", "goal"], wg: ["goal", "goal", "goal"], mf: ["assist", "assist", "defend"], df: ["defend", "defend", "defend"] };
  const techCenter = (kind, blend) => TUNE.TEST_P[kind] * Math.min(1.4, Math.max(0.6, blend / TUNE.TEST_REF));

  return { TUNE, AXIS, GRADES, STAT, KEYS, POS, grade, bodyPt, compute, tierOf, TIER_NAME, coachOf,
    DOOR, doorsOf, endingId, ending, endName, END_EMO, NEXT, freeze, TECH, techCenter };
})();
