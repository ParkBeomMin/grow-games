/* ⚽ 더 윙어 II 1막 — 🏅 업적 31 · 🧭 플레이 성향 · 🎯 최고의 한 수 · 🍀 기대 대비
 *
 * 설계: 12번 §7-5 · §7-6 · 21번 §6 · 23번 §5 · 13번 §7-3(`six`) · ① `achieve.js` 모양
 * 확정 문턱: 24번 §2(`allc` 56 · `rested` 대회 첫 경기 컨디션 ≥ 80 · 🧭 문턱) — 조정될 값은 `TUNE` 한 블록.
 *
 * ── 🔒 지키는 것 ────────────────────────────────────────────
 *  · **경기력에 아무것도 안 붙어요** — 업적 버프 없음. 판정은 세이브를 **읽기만**(난수 0) · **멱등**.
 *  · 딴 업적은 세이브(`S.ach`)와 **기기 장부**(`W2Book` ach) 둘 다에 남아요.
 *  · 대표 업적 하나(기본값 = 가장 드문 것 · 같으면 가장 최근).
 *  · 🧭 성향은 **규칙으로, 위에서부터 첫 번째** — 무작위 없음(언제 계산해도 같은 성향). */
"use strict";

window.W2Ach = (() => {
  /* 🎚️ 조정될 수 있는 상수 — 이 블록만 고칩니다(25번 §5). */
  const TUNE = Object.freeze({
    ALLC: 56,                 // 24번 §2 — `allc` 여섯 모두 D+(56) 이상
    RESTED: 80,               // 24번 §2 — `rested` 대회 첫 경기 컨디션 「최상」(80↑)
    S_AT: 88,                 // 12번 §10-1 — S 문턱(`s1` · `onething`)
    ONETHING_REST: 60,        // 12번 §7-5 — `onething` 나머지 평균 D 이하(= C 문턱 60 밑)
    R9: 9.0, G7: 7, A7: 7, MOM10: 10, CS5: 5, WALL3: 3, HAT: 3, PROMISE3: 3, LONGSHOT: 40,   // 12번 §7-5 · 21번 §6
    /* 🧭 성향 문턱 — 24번 §2 */
    STYLE: { MIN_DEC: 10, MIN_TRY: 7, BOTH: 3, LUCK: 2.28, ONE: 25, EVEN: 12, READ: 0.8, BOLD: 0.65, CAUTIOUS: 0.30 },
    BEST_PCT: 40,             // ① §5-4 — 🎯 최고의 한 수(성공한 도전 중 표시 % ≤ 40)
    /* 희귀도 — 문턱 흔함 ≥ 35 · 드묾 12~35 · 귀함 3~12 · 전설 < 3(12번 §7-5) · 판 2.5 · 새 집계 · 시작 랜덤 뒤의 표:
     *   28번 R10 표 → 34번(`number` 흔함 → 드묾 · `allc` 드묾 → 귀함) → 37번 §2 · 38번 §5(`g7` 드묾 → 귀함 하나만)
     *   → 43번 §2-2 · 44번 §1(`promise3` · `league` 귀함 → 전설 · `gift` 드묾 → 귀함)
     * 흔함 grad · story1 · family · g1 · mom10 · winner · next
     * 드묾 s1 · onething · rested · a7 · door · race · number
     * 귀함 r9 · cs5 · wall3 · qf · longshot · crown · pk · allc · g7 · gift
     * 전설 hat · cup · promise3 · league
     * 기기 장부 업적 셋(`trio` · `all7` · `six`)은 판 하나로 못 재서(R10 밖) 전설로 둬요. */
    TIER: {
      grad: "흔함", story1: "흔함", family: "흔함", g1: "흔함", mom10: "흔함", winner: "흔함", next: "흔함",
      s1: "드묾", onething: "드묾", rested: "드묾", a7: "드묾", door: "드묾", race: "드묾", number: "드묾",
      r9: "귀함", cs5: "귀함", wall3: "귀함", qf: "귀함", longshot: "귀함", crown: "귀함", pk: "귀함",
      allc: "귀함", g7: "귀함", gift: "귀함",
      hat: "전설", cup: "전설", promise3: "전설", league: "전설", trio: "전설", all7: "전설", six: "전설",
    },
  });
  const T = TUNE;
  const DOOR_ENDS = ["semi", "univ", "abroad"];
  const NEXT_ENDS = ["pro1", "pro2", "trainee", "abroad"];
  const rec = (S) => S.record || {};
  const done = (S) => (S.story && Array.isArray(S.story.done) ? S.story.done : []);
  const stat = (S) => S.stats || {};
  const KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
  const mainOf = (S) => (window.WingerEngine ? window.WingerEngine.K.BLEND[S.pos][0] : "shoot");
  const restAvg = (S) => { const m = mainOf(S); const o = KEYS.filter((k) => k !== m); return o.reduce((a, k) => a + (stat(S)[k] || 0), 0) / o.length; };
  const grads = () => (window.W2Book ? window.W2Book.load().grad : {});

  /* 31개 — group: 기록 · 무대 · 이야기 · 엔딩 · 몸(12번 §7-5 표 그대로) */
  const DEFS = [
    { id: "g1", group: "기록", name: "첫 골망", cond: "첫 골", test: (S) => (rec(S).gAll || 0) >= 1 },
    { id: "hat", group: "기록", name: "해트트릭", cond: "한 경기 골 3", test: (S) => (rec(S).hat || 0) >= 1 },
    { id: "r9", group: "기록", name: "9점의 경기", cond: "평점 9.0 이상", test: (S) => (rec(S).rMax || 0) >= T.R9 },
    { id: "cs5", group: "기록", name: "다섯 번의 무실점", cond: "내가 뛴 무실점 경기 5", test: (S) => (rec(S).cs || 0) >= T.CS5 },
    { id: "wall3", group: "기록", name: "세 번의 벽", cond: "한 경기 🧱 막음 3", test: (S) => (rec(S).wall3 || 0) >= 1 },
    { id: "g7", group: "기록", name: "일곱 골의 해", cond: "1막 골 7", test: (S) => (rec(S).gAll || 0) >= T.G7 },
    { id: "a7", group: "기록", name: "일곱 번의 선물", cond: "도움 7", test: (S) => (rec(S).aAll || 0) >= T.A7 },
    { id: "mom10", group: "기록", name: "열 번의 순간", cond: "판 성공(완벽) 10", test: (S) => (rec(S).momP || 0) >= T.MOM10 },
    { id: "qf", group: "무대", name: "전국 8강", cond: "전국대회 8강", test: (S) => (S.world && S.world.cup.stage) >= 2 },
    { id: "cup", group: "무대", name: "여름의 왕", cond: "전국대회 우승", test: (S) => (S.world && S.world.cup.stage) === 5 },
    { id: "league", group: "무대", name: "권역의 왕", cond: "권역 리그 우승", test: (S) => !!S.leagueChamp },
    { id: "pk", group: "무대", name: "11미터", cond: "승부차기 내 킥 성공", test: (S) => (rec(S).pkGoal || 0) >= 1 },
    { id: "winner", group: "무대", name: "결승골", cond: "결승골의 골 또는 도움", test: (S) => (rec(S).winner || 0) >= 1 },
    { id: "crown", group: "무대", name: "부문 1위", cond: "권역 리그 내 부문 1위", test: (S) => !!S.crown },
    { id: "story1", group: "이야기", name: "첫 결말", cond: "이야기 하나를 끝까지", test: (S) => done(S).length >= 1 },
    { id: "number", group: "이야기", name: "돌아온 번호", cond: "「번호를 되찾은 날」", test: (S) => done(S).some((d) => d.sid === "slot" && d.end === "took") },
    { id: "race", group: "이야기", name: "에이스의 자리", cond: "🔥 「에이스의 자리」", test: (S) => done(S).some((d) => d.sid === "race" && d.end === "ace") },
    { id: "gift", group: "이야기", name: "마지막 선물", cond: "🕯️ 「마지막 선물」", test: (S) => done(S).some((d) => d.sid === "senior" && d.end === "gift") },
    { id: "promise3", group: "이야기", name: "세 번 지킨 약속", cond: "약속 3번 지키기", test: (S) => (Number(S.promKept) || 0) >= T.PROMISE3 },
    { id: "longshot", group: "이야기", name: "한 수", cond: `표시 % ${T.LONGSHOT} 이하 도전 성공`,
      test: (S) => (S.evLog || []).some((l) => l.k === "try" && l.ok === true && l.pct != null && l.pct <= T.LONGSHOT) },
    { id: "family", group: "이야기", name: "집으로 가는 길", cond: "가족 이야기 2장까지",
      test: (S) => done(S).some((d) => ["father", "apply", "letter"].indexOf(d.sid) >= 0 && d.ch >= 2) },
    { id: "grad", group: "엔딩", name: "첫 졸업", cond: "1막을 마침", test: (S) => !!S.ending },
    { id: "next", group: "엔딩", name: "이어지는 이야기", cond: "프로로 이어지는 엔딩", test: (S) => !!S.ending && NEXT_ENDS.indexOf(S.ending.id) >= 0 },
    { id: "door", group: "엔딩", name: "두 장의 편지", cond: "문을 골라 들어감", test: (S) => !!S.ending && DOOR_ENDS.indexOf(S.ending.id) >= 0 },
    { id: "trio", group: "엔딩", name: "세 사람의 졸업", cond: "주인공 셋 모두 1막을 마침(이 기기)",
      test: () => { const g = grads(); return ["jiho", "doyun", "haram"].every((p) => g[`${p}-m`] || g[`${p}-f`]); } },
    { id: "all7", group: "엔딩", name: "일곱 개의 봄", cond: "엔딩 7 모두(이 기기)",
      test: () => { const B = window.W2Book ? window.W2Book.load() : { end: {} }; return ["pro1", "abroad", "pro2", "univ", "trainee", "semi", "leave"].every((id) => B.end[id]); } },
    { id: "six", group: "엔딩", name: "여섯 장의 졸업 사진", cond: "주인공 셋 × 남·여 여섯 판 모두(이 기기)",
      test: () => { const g = grads(); return ["jiho", "doyun", "haram"].every((p) => g[`${p}-m`] && g[`${p}-f`]); } },
    { id: "s1", group: "몸", name: "첫 S", cond: "능력치 하나 S", test: (S) => KEYS.some((k) => (stat(S)[k] || 0) >= T.S_AT) },
    { id: "allc", group: "몸", name: "빈틈없는 몸", cond: `여섯 모두 D+(${T.ALLC}) 이상`, test: (S) => KEYS.every((k) => (stat(S)[k] || 0) >= T.ALLC) },
    { id: "onething", group: "몸", name: "한 가지를 끝까지", cond: "주 능력치 S · 나머지 평균 D 이하",
      test: (S) => (stat(S)[mainOf(S)] || 0) >= T.S_AT && restAvg(S) < T.ONETHING_REST },
    { id: "rested", group: "몸", name: "가득 찬 여름", cond: "대회 첫 경기를 컨디션 「최상」(80↑)으로",
      test: (S) => S.cupFirstCond != null && S.cupFirstCond >= T.RESTED },
  ];
  const LIST = DEFS.map((d) => ({ id: d.id, group: d.group, name: d.name, cond: d.cond, tier: T.TIER[d.id] || "흔함" }));
  const defOf = (id) => DEFS.find((d) => d.id === id) || null;
  const tierOf = (id) => (defOf(id) ? T.TIER[id] || "흔함" : null);
  const RANK = { 흔함: 0, 드묾: 1, 귀함: 2, 전설: 3 };
  const TIER_ICON = { 흔함: "⚪", 드묾: "🔵", 귀함: "🟣", 전설: "🟡" };

  /* 새로 딴 업적 [id] — 멱등(이미 딴 건 다시 안 셈). 세이브 · 기기 장부 둘 다에 남겨요 */
  function check(S) {
    if (!S) return [];
    if (!S.ach || typeof S.ach !== "object") S.ach = {};
    const got = [];
    for (const d of DEFS) {
      if (S.ach[d.id]) continue;
      let ok = false;
      try { ok = !!d.test(S); } catch (e) { ok = false; }
      if (!ok) continue;
      S.ach[d.id] = { w: S.week || 0, at: Date.now() };
      if (window.W2Book) window.W2Book.mark("ach", d.id);
      got.push(d.id);
    }
    return got;
  }
  /* 🏅 대표 업적 — 고른 것(`S.rep`)이 딴 것이면 그것, 아니면 딴 것 중 **가장 드문 것**(같으면 가장 최근) */
  function repOf(S) {
    const ach = (S && S.ach) || {};
    if (S && S.rep && ach[S.rep] && defOf(S.rep)) return S.rep;
    let best = null;
    for (const id of Object.keys(ach)) {
      if (!defOf(id)) continue;
      if (!best || RANK[tierOf(id)] > RANK[tierOf(best)]
        || (RANK[tierOf(id)] === RANK[tierOf(best)] && (ach[id].at || 0) >= (ach[best].at || 0))) best = id;
    }
    return best;
  }
  function setRep(S, id) {
    if (!S || !S.ach || !S.ach[id] || !defOf(id)) return false;
    S.rep = id;
    return true;
  }

  /* ---------- 🧭 플레이 성향 — 1막 순서(21번 §2-4 · 22번 R12 ⓒ): 🧮 · 🍀 · 🌧️ · 🎯 · 🎲 · 🛡️ · ⚖️ · ⚽ ---------- */
  const STYLES = {
    reader: "🧮 숫자를 읽은 선수", lucky: "🍀 공이 따라준 선수", rain: "🌧️ 비를 맞으며 뛴 선수",
    onething: "🎯 한 가지를 끝까지", bold: "🎲 판을 키운 선수", cautious: "🛡️ 돌다리를 두드린 선수",
    even: "⚖️ 빈틈없는 선수", ground: "⚽ 그라운드의 선수",
  };
  const fix1 = (v) => Math.round(v * 10) / 10;
  function style(S) {
    const Y = T.STYLE;
    const log = Array.isArray(S.evLog) ? S.evLog : [];
    const prob = log.filter((l) => l.k === "try" || l.alt != null);   // 확률형 결정(도전 선택지가 있던 결정)
    const tries = log.filter((l) => l.k === "try");
    const n = prob.length;
    const readOk = prob.filter((l) => (l.k === "try" ? l.pct >= 50 : l.alt < 50)).length;
    const heldLow = prob.filter((l) => l.k !== "try" && l.alt < 50).length;
    const betHigh = tries.filter((l) => l.pct >= 50).length;
    const exp = tries.reduce((a, l) => a + l.pct / 100, 0);
    const got = tries.filter((l) => l.ok === true).length;
    const s = stat(S);
    const vals = KEYS.map((k) => s[k] || 0);
    const pick = (k, line) => ({ k, name: STYLES[k], line });
    if (n >= Y.MIN_DEC && readOk / n >= Y.READ && heldLow >= Y.BOTH && betHigh >= Y.BOTH) {
      return pick("reader", `확률 50% 위에서 ${betHigh}번 걸고, 아래에선 ${heldLow}번 참았어요`);
    }
    if (tries.length >= Y.MIN_TRY && got - exp >= Y.LUCK) return pick("lucky", `보인 확률대로면 ${fix1(exp)}번, 실제로 ${got}번 성공했어요`);
    if (tries.length >= Y.MIN_TRY && got - exp <= -Y.LUCK) return pick("rain", `보인 확률대로면 ${fix1(exp)}번, 실제로 ${got}번 성공했어요`);
    if ((s[mainOf(S)] || 0) - restAvg(S) >= Y.ONE) return pick("onething", `주 능력치가 나머지 평균보다 ${Math.round((s[mainOf(S)] || 0) - restAvg(S))} 높아요`);
    if (n >= Y.MIN_DEC && tries.length / n >= Y.BOLD) return pick("bold", `결정 ${n}번 중 ${tries.length}번 도전`);
    if (n >= Y.MIN_DEC && tries.length / n <= Y.CAUTIOUS) return pick("cautious", `결정 ${n}번 중 ${tries.length}번 도전`);
    if (Math.max(...vals) - Math.min(...vals) <= Y.EVEN) return pick("even", `가장 높은 능력치와 낮은 능력치의 차이 ${Math.round(Math.max(...vals) - Math.min(...vals))}`);
    return pick("ground", "");
  }
  /* 🎯 최고의 한 수 — 성공한 **도전** 중 표시 %가 가장 낮은 것(같으면 늦은 주) · 40% 이하일 때만 */
  function bestMove(S) {
    let best = null;
    for (const l of Array.isArray(S.evLog) ? S.evLog : []) {
      if (l.k !== "try" || l.ok !== true || l.pct == null || l.pct > T.BEST_PCT) continue;
      if (!best || l.pct < best.pct || (l.pct === best.pct && (l.w || 0) >= (best.w || 0))) best = l;
    }
    if (!best) return null;
    const ev = window.W2Events && window.W2Events.LIST.find((e) => e.id === best.id);
    const m = /^s_(\w+?)\d$/.exec(best.id);
    const sid = m ? (m[1] === "fam" && window.W2Story ? window.W2Story.famSid(S) : m[1]) : null;
    const st = sid && window.W2Story ? window.W2Story.LIST.find((x) => x.sid === sid) : null;
    return { id: best.id, name: ev ? `${ev.emoji} ${ev.name}` : st ? `${st.emoji} ${st.name}` : best.id, pct: best.pct, w: best.w || 0 };
  }
  /* 🍀 기대 대비 — 보인 확률대로면 몇 번, 실제로 몇 번 */
  function luck(S) {
    const tries = (Array.isArray(S.evLog) ? S.evLog : []).filter((l) => l.k === "try" && l.pct != null);
    if (!tries.length) return null;
    return { n: tries.length, exp: fix1(tries.reduce((a, l) => a + l.pct / 100, 0)), got: tries.filter((l) => l.ok === true).length };
  }

  return { TUNE, LIST, check, tierOf, repOf, setRep, TIER_ICON, style, bestMove, luck, STYLES };
})();
