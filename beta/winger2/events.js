/* ⚽ 더 윙어 II 1막 — 🎲 선택 이벤트 12종 · 📋 약속 · 🤝 감독 신뢰 · 확률 식(실력 + 상황)
 *
 * 설계: 12번 §7-1~§7-3 · 23번 §2(확률 식) · 21번 §5(약속 조건 하나) · ① 스펙 §2 · §3 · §6-4(모양)
 * 확정 계수: 24번 §2 — 조정될 값은 맨 위 `TUNE` 한 블록.
 *
 * ── 🔒 지키는 것 ────────────────────────────────────────────
 *  · **보이는 % = 판정 %** — 조각을 정수로 만들어 더해 `pct`를 **뜰 때 한 번** 얼리고, 판정 난수 `u`도
 *    뜰 때 한 번 얼려요(`u × 100 < pct`면 성공). 화면 조각(`parts`)의 합 + 50 = `pct`. 숨은 손 0.
 *  · **판돈은 한 축, W = L** → p* = 50%가 구성으로 서요. **안전(확정) = 효과 0**.
 *  · **잘리는 판돈은 내놓지 않아요** — 무작위 이벤트면 후보에서 빼고, 이야기 장이면 확정만 남겨요.
 *  · **이벤트는 문턱 · 경기력을 안 만져요**(평가서 구간 · 엔진 판정 창 · `buff`).
 *  · **약속은 다음 출전 경기의 실제 기록** — 새 난수 0 · % 기호 금지 · 한 번에 하나 · 1막이 끝나면 없던 일.
 *    조건은 하나 — 「그 경기의 내 첫 순간을 살린다」(27번 §5-1 — 판 수에서 떼어 냄).
 *  · **이야기 2장의 약속은 늘 고를 수 있어요** — 판돈 = min(2, 6 − |🤝|) · 0이면 이야기만 걸린 약속(27번 §6).
 *  · **상황 조각은 컨디션 · 휴식 · 능력치와 무관** — 이벤트 난수원에서 **주마다 한 번** 굴려요(선택과 무관한
 *    소비 · 24번 §0-1). 글은 까닭으로 읽히게 · 컨디션/휴식/능력치를 말하지 않게 · 사람은 틀 자리로(23번 §2-1).
 *  · 이벤트 난수는 **판 시드에서 주마다 갈라 낸 난수원** — 엔진 `_rng` · 연출 `fxRnd`와 따로(11번 #19).
 *  · 한 주에 한 장까지 · 이야기 장이 먼저 · 대회 주간 · 테스트 주 · 1주 · 36주엔 안 떠요.
 *
 * 다른 파일은 `window.W2Events`만 봐요. 카드는 **평문**이에요 — 그리는 쪽이 `textContent`로 넣어요. */
"use strict";

window.W2Events = (() => {
  /* 🎚️ 조정될 수 있는 상수 — 이 블록만 고칩니다(25번 §5). */
  const TUNE = Object.freeze({
    EV_P: 0.41,              // 21번 §2-3 · 24번 §2 — 고르기 주마다 무작위 이벤트가 뜰 확률
    CAP_ALL: 18,             // 12번 §7-2 — 1막 합 상한(이야기 장 + 무작위)
    CAP_RANDOM: 10,          // 〃 — 무작위 이벤트 상한(기말고사 포함)
    TRUST_CAP: 6,            // 12번 §7-2 — 🤝 −6~+6
    TRUST_STAKE: 2,          // 12번 §7-3 — 🤝 판돈 ±2
    STAT_STAKE: 1,           // 21번 §3-4 · 24번 §2 — 능력치 판돈 ±1
    PCT_LO: 10, PCT_HI: 90,  // 12번 §7-1 — 표시 %의 바닥 · 천장
    SKILL_CAP: 10,           // 23번 §2-2 · 24번 §2 — 실력 조각 상한 ±10(원칙 ④의 천장)
    K_MUL: 2,                // 22번 · 24번 §2 — k′ = 표의 k × 2
    SIT: [-12, -6, 0, 6, 12],// 23번 §2 · 24번 §2 — 상황 조각 다섯 칸 · 각 ⅕
    /* 🔗 Mₑ — **보통 판에서 그 카드가 뜬 순간 k′·X의 평균**(24번 §2 새 정의). 확률 식의 다른 항이 바뀌면 다시 잼.
     * 🔒 `s_slot1`만 **포지션별**이에요(24번 §2-4 계수 패치 — X가 {rival}와의 차라 포지션마다 자리가 달라요).
     *    나머지 12장은 포지션 사이 차이가 ±0.05 안이거나 기준 밖이라 한 값이에요. */
    M: {
      a_call: -6.17, a_video: -7.28, a_helper: -6.26, a_weakfoot: -7.28, a_night: -4.86, a_boots: -8.68,
      a_tackle: -7.30, a_exam: -7.67, a_camp: -5.95,
      s_slot1: { fw: -48.00, wg: -54.93, mf: -52.27, df: -64.00 },
      s_senior1: -10.33, s_fam1: -10.76, s_race1: -54.15,
    },
  });
  /* 🔗 리그 기준 — 권역 리그 평균 전력(우리 58 · 52 · 55 · 58 · 61 · 66 → 58.33 · 12번 §7-3) */
  const leagueBase = () => {
    const T = window.W2World.TUNE;
    const all = [T.US_STR].concat(T.LEAGUE_STR);
    return all.reduce((a, b) => a + b, 0) / all.length;
  };

  const W = () => window.W2World;
  const SH = () => window.W2Sheet;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mainOf = (S) => window.WingerEngine.K.BLEND[S.pos][0];
  const statsAvg = (S) => SH().KEYS.reduce((a, k) => a + S.stats[k], 0) / 6;
  /* 실력 재료 X — 12번 §7-3 표의 「X (k)」 */
  const XOF = {
    main: (S) => S.stats[mainOf(S)] - leagueBase(), overall: (S) => statsAvg(S) - leagueBase(),
    pass: (S) => S.stats.pass - leagueBase(), dribble: (S) => S.stats.dribble - leagueBase(),
    shoot: (S) => S.stats.shoot - leagueBase(), speed: (S) => S.stats.speed - leagueBase(),
    defense: (S) => S.stats.defense - leagueBase(), stamina: (S) => S.stats.stamina - leagueBase(),
    rival: (S) => S.stats[mainOf(S)] - S.world.ours.find((x) => x.role === "rival").str,
    ace: (S) => S.stats[mainOf(S)] - W().aceRow(S).str,
  };
  const XLABEL = { main: "주 능력치", overall: "종합", pass: "패스", dribble: "드리블", shoot: "슈팅", speed: "스피드",
    defense: "수비", stamina: "체력", rival: "{rival}와의 차", ace: "{ace}와의 차" };

  /* 사람 이름 틀 — 세계가 채워요(13번 §4-4). 짝 이름은 받침이 같아 조사가 성별로 안 갈려요.
   * 🏠 가족은 누구나 셋(29번 §3-2 · P1 (가)) — `{family}`는 **따라간 가족 이야기의 사람**, 아직이면 「가족」 */
  const FAMILY = { father: { who: "dad", name: "아버지" }, apply: { who: "mom", name: "엄마" }, letter: { who: "grandma", name: "할머니" } };
  const famOf = (S) => { const sid = window.W2Story ? window.W2Story.famSid(S) : null; return sid ? FAMILY[sid] || null : null; };
  function vars(S) {
    const w = W();
    const rival = S.world.ours.find((x) => x.role === "rival");
    return { me: S.name, no: S.noOrig != null ? S.noOrig : S.no, rival: w.short(rival.name), keeper: w.short(S.world.keeper.name),
      ace: w.short(w.aceRow(S).name), family: (famOf(S) || { name: "가족" }).name, coach: "강 감독" };
  }
  const fillS = (S, t, extra) => W().fill(t, Object.assign(vars(S), extra || {}));
  const meWho = (S) => `${S.preset}-${S.gender === "f" ? "f" : "m"}`;
  /* 🤝 감독 반신의 표정 — +4↑ `smile` · −4↓ `stern` · 그 사이 `base`(12번 §7-2 · 23번 §7) */
  const coachMood = (S) => SH().coachOf(S).mood;

  /* ---------- 🎲 이벤트 12종(12번 §7-3) ----------
   * `sit`: 상황 조각의 글 — −12 · 0 · +12는 카드마다, ±6은 공통 문장(23번 §2-1이 허용).
   * `safe`가 없으면 기본 「넘긴다」. `stake`: "trust" 또는 능력치 키("main"이면 주 능력치). */
  const SIT_COMMON = { "-6": "조금 어긋난 날", "6": "괜찮은 날" };
  const EVENTS = [
    { id: "a_call", cat: "slot", emoji: "📍", name: "감독의 호출", who: "coach", bg: "bg-locker",
      elig: (S, w) => W().LEAGUE_WEEKS.includes(w),
      body: "강 감독이 라커룸으로 {me|를} 불렀어요. 「이번 경기, 네게 맡길 역할이 하나 있다.」",
      safe: "무난하게 가겠다고 한다", try: "맡겠다고 한다", stake: "trust", x: "main", k: 0.6,
      sit: { "-12": "상대가 그 역할을 막을 수비를 따로 붙인대요", 0: "평소 같은 경기 주예요", 12: "{rival|가} 그 역할이면 네가 맞다고 거들어요" } },
    { id: "a_video", cat: "slot", emoji: "📍", name: "비디오 분석실", who: "coach", bg: "bg-locker",
      elig: (S) => !!(S.evMem && S.evMem.last && (S.evMem.last.res === "L" || S.evMem.last.un > 0)),
      body: "비디오 분석실 화면에 지난 경기의 {me} 장면이 멈춰 있어요.",
      safe: "듣기만 한다", try: "먼저 말씀드린다", stake: "trust", x: "overall", k: 0.6,
      sit: { "-12": "감독의 표정이 오늘따라 굳어 있어요", 0: "평소처럼 조용한 분석실이에요", 12: "{keeper|가} 옆에서 고개를 끄덕여 줘요" } },
    { id: "a_helper", cat: "slot", emoji: "📍", name: "1학년 훈련 도우미", who: "rival", bg: "bg-field",
      elig: (S, w) => w >= 6 && w <= 24,
      body: "감독이 1학년 훈련을 도울 3학년을 찾아요. 1학년 줄 맨 앞에 {rival|가} 서 있어요.",
      safe: "사양한다", try: "맡는다", stake: "trust", x: "pass", k: 0.5,
      sit: { "-12": "1학년들이 오늘따라 말을 안 들어요", 0: "평소의 훈련장이에요", 12: "{rival|가} 먼저 공을 받아 시범을 도와요" } },
    { id: "a_weakfoot", cat: "body", emoji: "🦶", name: "반대발 주간", who: "coach", bg: "bg-field",
      elig: () => true,
      body: "코치가 한 주 동안 반대발만 쓰는 과제를 내밀어요.",
      try: "한 주 반대발로만", stake: "dribble", x: "dribble", k: 0.5,
      sit: { "-12": "비가 와서 공이 자꾸 미끄러져요", 0: "평소의 훈련 주예요", 12: "{keeper|가} 공을 받아 주며 박자를 세 줘요" } },
    { id: "a_night", cat: "body", emoji: "🦶", name: "불 꺼진 운동장", who: "me", bg: "bg-field",
      elig: () => true,
      body: "모두 돌아간 운동장, 골대 하나에만 불이 남았어요. 슈팅 백 개를 채우고 갈까요?",
      try: "남는다", stake: "shoot", x: "shoot", k: 0.5,
      sit: { "-12": "가로등 하나가 나갔어요", 0: "평소의 밤이에요", 12: "{rival|가} 말없이 공을 주워 줘요" } },
    { id: "a_boots", cat: "body", emoji: "🦶", name: "새 축구화 길들이기", who: "me", bg: "bg-field",
      elig: () => true,
      body: "새 축구화가 발에 아직 안 맞아요. 전력 질주로 길들일까요?",
      try: "전력 질주를 두 배로", stake: "speed", x: "speed", k: 0.5,
      sit: { "-12": "비가 와서 트랙이 미끄러워요", 0: "평소의 트랙이에요", 12: "{keeper|가} 초시계를 들고 기록을 재 줘요" } },
    { id: "a_tackle", cat: "body", emoji: "🦶", name: "혼자 남은 태클 연습", who: "me", bg: "bg-field",
      elig: () => true,
      body: "수비 훈련이 끝났는데 태클 더미가 그대로 서 있어요.",
      try: "남는다", stake: "defense", x: "defense", k: 0.5,
      sit: { "-12": "잔디가 젖어 발이 자꾸 미끄러져요", 0: "평소의 훈련장이에요", 12: "{keeper|가} 공을 몰고 와 상대가 되어 줘요" } },
    { id: "a_exam", cat: "school", emoji: "🏫", name: "기말고사 주간", who: "me", bg: "bg-locker",
      elig: (S, w) => w === 16,
      body: "기말고사 주간이에요. 훈련은 자율 — 시험만 챙길까요, 둘 다 할까요?",
      safe: "시험에 집중한다", try: "시험도 훈련도", stake: "stamina", x: "stamina", k: 0.5,
      sit: { "-12": "시험 범위가 생각보다 넓어요", 0: "평소의 시험 주간이에요", 12: "{keeper|가} 필기를 나눠 줘요" } },
    { id: "a_camp", cat: "school", emoji: "🏫", name: "여름 전지훈련 첫날", who: "coach", bg: "bg-field",
      elig: (S, w) => w >= 22 && w <= 24,
      body: "여름 전지훈련 첫날. 해가 뜨기도 전에 운동장 불이 켜졌어요.",
      safe: "따라간다", try: "가장 먼저 나가고 가장 늦게 들어온다", stake: "main", x: "overall", k: 0.6,
      sit: { "-12": "장마 끝 무더위가 한창이에요", 0: "평소의 전지훈련이에요", 12: "{rival|가} 먼저 나와 몸을 풀고 있어요" } },
    { id: "a_scout", cat: "promise", emoji: "🏟️", name: "관중석의 낯선 사람", who: "scout", bg: "bg-field", promise: true,
      elig: (S, w) => W().LEAGUE_WEEKS.includes(w) && !((S.evMem && S.evMem.scout) || [])[w < 20 ? 0 : 1],
      body: "관중석에 클립보드를 든 낯선 사람이 앉았대요 — 스카우트라는 소문이에요." },
    { id: "a_family", cat: "promise", emoji: "🏟️", name: "관중석의 가족", who: "family", bg: "bg-field", promise: true,
      elig: (S, w) => W().LEAGUE_WEEKS.includes(w),
      body: "{family|가} 이번 경기를 처음 보러 온대요." },
    { id: "a_rematch", cat: "promise", emoji: "🏟️", name: "지난 패배의 상대", who: "me", bg: "bg-field", promise: true,
      elig: (S, w) => {
        const i = W().LEAGUE_WEEKS.indexOf(w);
        if (i < 5) return false;
        const o = W().oppOf(S, w);
        return !!o && S.world.league.lostTo.indexOf(o.oid) >= 0;
      },
      body: "이번 상대는 전반기에 졌던 {opp}예요." },
  ];
  const byId = (id) => EVENTS.find((e) => e.id === id) || null;
  /* 📖 도감이 읽는 목록 — cat: slot 📍 자리와 감독 · body 🦶 몸과 기술 · school 🏫 학교 · promise 🏟️ 경기 앞 약속 */
  const LIST = EVENTS.map((e) => ({ id: e.id, name: e.name, emoji: e.emoji, cat: e.cat }));

  /* ---------- 판돈 ---------- */
  function fits(S, stake) {
    const T = TUNE;
    if (stake === "trust") { const t = Number(S.trust) || 0; return t + T.TRUST_STAKE <= T.TRUST_CAP && t - T.TRUST_STAKE >= -T.TRUST_CAP; }
    const v = S.stats[stake];
    return v + T.STAT_STAKE <= 100 && v - T.STAT_STAKE >= 0;
  }
  function stakeFx(S, stake, sign) {
    return stake === "trust" ? { trust: sign * TUNE.TRUST_STAKE } : { stat: stake, v: sign * TUNE.STAT_STAKE };
  }
  function chips(fx) {
    if (!fx) return [];
    if (fx.trust) return [{ emoji: "🤝", text: `감독 신뢰 ${fx.trust > 0 ? "+" : "−"}${Math.abs(fx.trust)}`, good: fx.trust > 0 }];
    if (fx.stat) {
      const d = SH().STAT[fx.stat];
      return [{ emoji: d.emoji, text: `${d.name} ${fx.v > 0 ? "+" : "−"}${Math.abs(fx.v)}`, good: fx.v > 0 }];
    }
    return [];
  }

  /* ---------- 선택지 ---------- */
  const safeOpt = (label) => ({ k: "safe", label });
  /* 도전 — `pct = clamp(50 + 실력 + 상황, 10, 90)` · 실력 = clamp(round(k′·X − Mₑ), ±10)(23번 §2 · 24번 §2) */
  function tryOpt(S, id, label, x, k, stake, sit, sitText) {
    const Mv = TUNE.M[id];
    const Me = Mv && typeof Mv === "object" ? (Mv[S.pos] != null ? Mv[S.pos] : 0) : (Mv || 0);
    const skill = clamp(Math.round(k * TUNE.K_MUL * XOF[x](S) - Me), -TUNE.SKILL_CAP, TUNE.SKILL_CAP) || 0;   // −0 → 0
    const pct = clamp(50 + skill + sit, TUNE.PCT_LO, TUNE.PCT_HI);
    const st = stake === "main" ? mainOf(S) : stake;
    const win = stakeFx(S, st, 1), lose = stakeFx(S, st, -1);
    return { k: "try", label, pct, stake: st,
      parts: [{ k: "skill", v: skill, label: `실력(${fillS(S, XLABEL[x])})` }, { k: "sit", v: sit, label: "상황", text: sitText }],
      win, lose, chips: { win: chips(win), lose: chips(lose) } };
  }
  /* 📋 약속 — % 기호 없이 「최근 N경기 중 M번」(사실)만(12번 §6-4) · 조건은 **첫 순간**(27번 §5-1).
   * 근거는 `recent[].f1`(그 경기 첫 내 순간을 살렸나)만 셉니다 — 없는 경기(옛 세이브)는 N에도 안 넣어요(27번 §8) */
  const PROMISE_TEXT = "그 경기의 내 첫 순간을 살린다";
  function refOf(S) {
    const rec = (Array.isArray(S.recent) ? S.recent : []).filter((m) => m && typeof m.f1 === "boolean");
    const hit = rec.filter((m) => m.f1).length;
    return { hit, of: rec.length,
      text: rec.length ? `최근 ${rec.length}경기 중 ${hit}번 해냈어요` : "기록이 아직 없어요" };
  }
  /* `size` = 🤝 판돈의 크기(없으면 2) — 이야기 2장은 min(2, 6 − |🤝|)로 줄여 늘 고를 수 있게(27번 §6-3).
   * 0이면 **이야기만 걸린 약속**(칩 · 효과 없음) — 보이는 칩 = 실제로 적용되는 크기 */
  function promOpt(S, size) {
    const sz = size == null ? TUNE.TRUST_STAKE : Math.max(0, Math.min(TUNE.TRUST_STAKE, Math.floor(size)));
    const win = sz > 0 ? { trust: sz } : null, lose = sz > 0 ? { trust: -sz } : null;
    return { k: "promise", label: "약속한다", cond: { text: PROMISE_TEXT }, ref: refOf(S),
      stake: sz > 0 ? "trust" : null, win, lose, chips: { win: chips(win), lose: chips(lose) },
      note: sz > 0 ? null : "이번 약속엔 🤝이 걸리지 않아요 — 이야기만 걸려요" };
  }
  const sitText = (S, def, v) => {
    const t = def && def[String(v)] != null ? def[String(v)] : SIT_COMMON[String(v)] || "평소의 날이에요";
    return fillS(S, t);
  };
  /* 카드 한 장 — 🔒 `u`와 `pct`를 여기서 얼려요. 그리는 쪽이 읽는 모양(25번 §3 계약 6) */
  function card(S, base, opts, draws) {
    return Object.assign({ kind: "event", w: S.week, u: draws.u, sit: draws.sit }, base, { opts });
  }
  const whoOf = (S, who) => (who === "me" ? meWho(S) : who === "rival" ? S.world.rivalWho
    : who === "family" ? (famOf(S) || FAMILY.father).who : who === "keeper" ? S.world.keeper.who : who);   // 가족이 아직이면 아버지 그림(우리 집 — 29번 §3-2)
  function eventCard(S, d, draws) {
    const extra = {};
    if (d.id === "a_rematch") extra.opp = W().oppOf(S, S.week).name;
    const who = whoOf(S, d.who);
    const mood = who === "coach" ? coachMood(S) : who === meWho(S) ? (d.promise ? "fire" : "base") : "base";
    const base = { id: d.id, title: `${d.emoji} ${d.name}`, body: fillS(S, d.body, extra), who, mood, bg: d.bg };
    if (d.promise) return card(S, base, [safeOpt("넘긴다"), promOpt(S)], draws);
    return card(S, base, [safeOpt(d.safe || "넘긴다"),
      tryOpt(S, d.id, d.try, d.x, d.k, d.stake, draws.sit, sitText(S, d.sit, draws.sit))], draws);
  }

  /* ---------- 🎲 이 주의 카드 — 이야기 장이 먼저, 남는 자리에서 무작위(12번 §7-2) ----------
   * 🔒 굴림 셋(rRoll · rPick · u) + 상황 하나는 **주마다 늘** 뽑아요 — 카드가 뜨든 안 뜨든, 무엇을 고르든
   *    소비가 같아요(24번 §0-1). 다시 열어도 같은 주는 같은 값이에요. */
  function draws(S, w) {
    const X = W();
    const er = X.rngOf(S.seed, w, X.SALT.event);
    const rRoll = er(), rPick = er(), u = er();
    const sr = X.rngOf(S.seed, w, X.SALT.sit);
    const sit = TUNE.SIT[Math.floor(sr() * TUNE.SIT.length)];
    return { rRoll, rPick, u, sit };
  }
  function roll(S) {
    const w = S.week;
    if (w === 1 || w === 35 || w === 20 || w === 21 || w >= 36) return null;
    const dr = draws(S, w);
    const ST = window.W2Story;
    const ch = ST ? ST.chapter(S, w, dr) : null;
    if (ch) { S.evCount = (Number(S.evCount) || 0) + 1; S.chCount = (Number(S.chCount) || 0) + 1; return ch; }
    const T = TUNE;
    S.evRnd = Number(S.evRnd) || 0;
    if (w === 16) {                                   // 🏫 기말고사 — 고정 주(개인 이야기 장이 이 주를 잡으면 안 떠요)
      const d = byId("a_exam");
      if (!fits(S, d.stake)) return null;
      S.evRnd += 1; S.evCount = (Number(S.evCount) || 0) + 1;
      return eventCard(S, d, dr);
    }
    const left = ST ? ST.left(S) : 0;
    if (S.evRnd >= T.CAP_RANDOM) return null;
    if (S.evRnd + (Number(S.chCount) || 0) + left >= T.CAP_ALL) return null;   // 남은 이야기 장 자리를 먼저 잡아요
    if (dr.rRoll >= T.EV_P) return null;
    const used = Array.isArray(S.evIds) ? S.evIds : [];
    const cands = EVENTS.filter((d) => d.id !== "a_exam"
      && (d.id === "a_scout" || used.indexOf(d.id) < 0)
      && d.elig(S, w)
      && !(d.promise && S.promise)
      && fits(S, d.promise ? "trust" : (d.stake === "main" ? mainOf(S) : d.stake)));
    if (!cands.length) return null;
    const d = cands[Math.floor(dr.rPick * cands.length)];
    S.evIds = used.concat(d.id === "a_scout" && used.indexOf("a_scout") >= 0 ? [] : [d.id]);
    if (d.id === "a_scout") { mem(S).scout = mem(S).scout || [false, false]; mem(S).scout[w < 20 ? 0 : 1] = true; }
    S.evRnd += 1; S.evCount = (Number(S.evCount) || 0) + 1;
    return eventCard(S, d, dr);
  }
  function mem(S) {
    if (!S.evMem || typeof S.evMem !== "object") S.evMem = { last: null, scout: [false, false] };
    return S.evMem;
  }

  /* ---------- 답하기 — 판돈은 **답하는 순간** 적용(뒤로 미룬 판돈 없음 · 12번 §6-4) ----------
   * 돌려주는 것: 결과 카드(같은 모양 · 닫기 하나) — 그리는 쪽은 다른 카드와 똑같이 그려요. */
  function apply(S, fx) {
    if (!fx) return;
    if (fx.trust) S.trust = clamp((Number(S.trust) || 0) + fx.trust, -TUNE.TRUST_CAP, TUNE.TRUST_CAP);
    if (fx.stat) S.stats[fx.stat] = clamp(S.stats[fx.stat] + fx.v, 0, 100);
  }
  function answer(S, i) {
    const ev = S.ev;
    const o = ev && Array.isArray(ev.opts) ? ev.opts[i] : null;
    if (!o) return null;
    S.ev = null;
    if (!Array.isArray(S.evLog)) S.evLog = [];
    if (!S.evSeen || typeof S.evSeen !== "object") S.evSeen = {};
    const log = { id: ev.id, w: ev.w, k: o.k, pct: o.k === "try" ? o.pct : null, ok: null, sit: ev.sit };
    const t = ev.opts.find((x) => x.k === "try");
    if (o.k !== "try" && t) log.alt = t.pct;
    S.evLog.push(log);
    S.evSeen[ev.id] = (S.evSeen[ev.id] || 0) + 1;
    let ok = null, fx = null, line = "", mood = "base";
    if (o.k === "try") {
      ok = ev.u * 100 < o.pct;
      log.ok = ok;
      fx = ok ? o.win : o.lose;
      apply(S, fx);
      line = ok ? "도전이 통했어요" : "이번엔 뜻대로 안 됐어요";
      mood = ok ? "smile" : "down";
    } else if (o.k === "promise") {
      S.promise = { id: ev.id, w: ev.w, win: o.win, lose: o.lose };
      line = "다음 경기에서 정해져요";
      mood = "fire";
    } else if (o.k === "flag") {
      line = o.note || "";
    } else {
      line = "아무 일 없이 지나가요";
    }
    if (ev.sid && window.W2Story) window.W2Story.answered(S, ev, o, ok);
    if (window.W2Book) window.W2Book.mark("ev", ev.id);
    return { kind: "result", id: ev.id, sid: ev.sid || null, title: ev.title, body: line, ok,
      chips: chips(fx), who: meWho(S), mood, bg: ev.bg, opts: [{ k: "ok", label: "확인" }] };
  }

  /* ---------- 📋 약속 판정 — 공식 경기 한 판이 끝난 뒤(리그 · 대회 · 연습경기는 아님) ----------
   * `first` = 그 경기 첫 내 순간을 살렸나(1 · 0) · null이면(내 순간이 없던 경기) 없던 일(27번 §8) */
  function judge(S, first) {
    const p = S.promise;
    if (!p) return null;
    if (first !== 0 && first !== 1) {
      endAct(S);
      return { ok: null, text: "📋 약속 — 이번 경기엔 내 순간이 없어 없던 일이 됐어요", chips: [] };
    }
    const ok = first === 1;
    apply(S, ok ? p.win : p.lose);
    S.promise = null;
    for (let i = (S.evLog || []).length - 1; i >= 0; i--) {
      const l = S.evLog[i];
      if (l.id === p.id && l.k === "promise" && l.ok == null) { l.ok = ok; break; }
    }
    if (ok) S.promKept = (Number(S.promKept) || 0) + 1;
    if (/^s_/.test(p.id) && window.W2Story) window.W2Story.judged(S, p.id, ok);
    return { ok, text: `📋 약속 「${PROMISE_TEXT}」 — ${ok ? "지켰어요!" : "못 지켰어요"}`, chips: chips(ok ? p.win : p.lose) };
  }
  /* 경기 화면 킥오프 위 한 줄 — 이번 경기에 판정될 약속이 있을 때만(25번 §3 계약 2) */
  const promiseLine = (S) => (S.promise ? `📋 약속: ${PROMISE_TEXT}` : null);
  /* 1막이 끝나면 걸린 약속은 없던 일(효과 0) */
  function endAct(S) {
    if (!S.promise) return;
    for (let i = (S.evLog || []).length - 1; i >= 0; i--) {
      const l = S.evLog[i];
      if (l.id === S.promise.id && l.k === "promise" && l.ok == null) { l.expired = true; break; }
    }
    S.promise = null;
  }

  /* ---------- 📐 판정 규칙 쪽(도감) — ①의 문장을 1막에 맞게(12번 §7-7) ---------- */
  const RULES = [
    "성공 확률은 화면에 적힌 숫자 그대로예요. 이벤트가 뜰 때 0~99 중 숫자 하나를 뽑아 두고, 도전을 고르면 그 숫자가 적힌 확률보다 작을 때 성공해요. 숨은 보정은 없어요.",
    "확률은 기본 50에 실력(±10까지)과 그날의 상황(−12 · −6 · 0 · +6 · +12 중 하나)을 더한 값이에요. 상황은 이벤트가 뜰 때 한 번 정해지고 컨디션 · 휴식 · 능력치와는 상관없어요 — 아무리 잘 키워도 확실한 도전은 없어요.",
    "도전은 판돈이 늘 한 가지라 얻는 것과 잃는 것이 같은 크기예요 — 성공 확률이 50%를 넘으면 걸 만해요. 넘기면 아무 일도 없어요.",
    "📋 약속은 확률이 아니라 다음 공식 경기가 정해요 — 그 경기의 내 첫 순간을 살리면(골 · 골문 안 슛 · 도움 · 막음) 지킨 거예요. 적힌 숫자는 최근 경기에서 첫 순간을 살린 기록이에요.",
    "이야기의 약속은 늘 고를 수 있어요 — 🤝이 끝에 가까우면 판돈이 남은 만큼으로 줄어요(얻는 것과 잃는 것은 늘 같은 크기).",
    "📍 번호 집계 — 내 판마다, 같은 장면을 {rival|가} 맡았다면 해냈을 확률을 더해 견줘요. 내가 해낸 수와의 차가 쌓이고, 번호 결정전 뒤 +1.5 이상이면 번호를 되찾아요.",
    "한 주에 카드는 한 장까지예요. 이야기의 다음 장이 먼저 자리를 잡고, 대회 주간 · 테스트 주에는 이벤트가 뜨지 않아요.",
    "🤝 감독 신뢰는 평가서 점수에 들어가지 않아요 — 감독의 얼굴과 말, 엔딩 한 줄, 그리고 다음 이야기로 이어져요.",
  ];
  /* 판이 있으면 사람 이름을 채우고, 없으면(도감을 판 밖에서 열 때) 「경쟁자」로 */
  const rules = (S) => RULES.map((t) => (S && S.world ? fillS(S, t) : W().fill(t, { rival: "경쟁자" })));

  return { TUNE, LIST, EVENTS, FAMILY, roll, answer, judge, promiseLine, endAct, rules, chips, fits, mem, draws,
    kit: { safeOpt, tryOpt, promOpt, card, fillS, meWho, whoOf, coachMood, vars, PROMISE_TEXT, sitText } };
})();
