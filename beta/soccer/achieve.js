/* 🏅 업적 55 · 🧭 플레이 성향 11 · 🎯 최고의 한 수 — 「해낸 적이 있다」는 기록과 도감 칸뿐이에요.
 *
 * 설계: docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md §5-1 ~ §5-4 · §5-8
 *
 * ── 지키는 것 ──
 *  · **경기력에 아무것도 안 붙어요** — 🎖️ 시즌 칭호(경기 효과)·🏷️ 클래스(수당 배수)와 다른 셋째 물건이에요.
 *    판정은 세이브를 **읽기만** 하고 난수를 안 써요. 커리어 점수는 careerScore 그대로예요.
 *  · 희귀도는 **실측 달성률**(정책 넷 평균)로 배정한 정의 표의 한 칸이에요 — 세이브에 안 남겨요.
 *    ⚪ 흔함 ≥ 35% · 🔵 드묾 12~35% · 🟣 귀함 3~12% · 🟡 전설 < 3% (칸 수 22 · 20 · 5 · 8)
 *  · 판정은 **멱등** — 같은 조건을 여러 번 봐도 한 번만 따요(결산에 이르는 길이 여럿이에요).
 *  · 딴 업적은 세이브(S.ach)와 이 기기 장부(book.ach) 둘 다에 써요.
 *  · 옛 세이브(S.ach가 없음)의 첫 판정은 **조용히** — 이미 만족한 것을 late: true로 한꺼번에 채워요.
 *    새로 만든 선수는 newState가 S.ach = {}로 열어서 첫 결산부터 제대로 알려요.
 *
 * game.js · career.js · events.js · story.js · book.js 뒤에 로드해야 해요. */
"use strict";

window.WingerAch = (() => {
  const CT = () => (window.WingerCareer && WingerCareer._t) || {};
  const TIERS = ["흔함", "드묾", "귀함", "전설"];
  const RANK = { 흔함: 1, 드묾: 2, 귀함: 3, 전설: 4 };
  const HOME = { k: "kr", jp: "jp", br: "br", af: "en", eu: "it" };   // 유스(시장 id) → 나라
  const TRO_RE = /^(\d+)시즌 (.+) 우승$/;                              // 프로 트로피 — 유스 「1위」는 빠져요
  const TOP4 = ["champion", "final", "semi"];

  /* 판정 재료 — 한 번 모아서 표 전체가 같은 값을 봐요 */
  function facts() {
    const c = S.career || {};
    const pro = S.phase === "soccer-pro";
    const years = CT().fillClubs ? CT().fillClubs(c.years || [], S) : (c.years || []);
    const lg = (id) => LEAGUES.find((l) => l.id === id);
    const lgs = years.map((y) => lg(y.league)).filter(Boolean);
    const clubs = years.map((y) => y.club).filter((x) => x != null);
    const perClub = {};
    for (const cl of clubs) perClub[cl] = (perClub[cl] || 0) + 1;
    const moves = Array.isArray(S.moves) ? S.moves : [];
    const tro = (S.trophies || []).filter((t) => TRO_RE.test(t));
    const hist = Array.isArray(S.wcHist) ? S.wcHist : [];
    const done = ((S.story && S.story.done) || []).filter((d) => d.end !== "fizzle");
    const log = Array.isArray(S.evLog) ? S.evLog : [];
    return { c, pro, years, lgs, clubs, perClub, moves, tro, hist, done, log };
  }
  // 같은 시즌 리그 우승 + 컵 우승 + 🌏 월드컵 우승
  function treble(f) {
    const cups = window.SoccerCup ? Object.values(SoccerCup.CUPS) : [];
    const by = {};
    for (const t of f.tro) {
      const m = t.match(TRO_RE);
      const y = +m[1], name = m[2];
      const s = by[y] || (by[y] = { lg: false, cup: false });
      if (cups.includes(name)) s.cup = true;
      else if (name !== "월드컵") s.lg = true;
    }
    return Object.entries(by).some(([y, v]) => v.lg && v.cup && f.hist.some((h) => h.y === +y && h.result === "champion"));
  }
  const wcYears = () => {
    const out = [];
    const max = CT().CAREER_MAX || 15;
    if (window.WingerWorldCup) for (let y = 1; y <= max; y++) if (WingerWorldCup.isWcYear(y)) out.push(y);
    return out;
  };
  const score = (f) => (f.pro && CT().careerScore ? CT().careerScore() : 0);

  /* 업적 표 — id·조건은 출하 뒤 안 바꿔요(명전 rep · 도감 장부가 가리켜요). tier는 실측(스펙 §5-1) */
  const G = { rec: "기록", trip: "여정", award: "수상", nat: "대표팀", story: "이야기", legacy: "유산" };
  const DEFS = [
    // ⚽ 기록 (12)
    { id: "g100", group: G.rec, tier: "흔함", name: "백 번째 골망", cond: "프로 통산 골 100", test: (f) => (f.c.goals || 0) >= 100 },
    { id: "g400", group: G.rec, tier: "드묾", name: "골의 역사", cond: "프로 통산 골 400", test: (f) => (f.c.goals || 0) >= 400 },
    { id: "a80", group: G.rec, tier: "흔함", name: "여든 번의 선물", cond: "프로 통산 도움 80", test: (f) => (f.c.assists || 0) >= 80 },
    { id: "a200", group: G.rec, tier: "드묾", name: "패스의 역사", cond: "프로 통산 도움 200", test: (f) => (f.c.assists || 0) >= 200 },
    { id: "d500", group: G.rec, tier: "드묾", name: "오백 번의 저지", cond: "프로 통산 수비 500", test: (f) => (f.c.defense || 0) >= 500 },
    { id: "d1000", group: G.rec, tier: "드묾", name: "성벽", cond: "프로 통산 수비 1,000", test: (f) => (f.c.defense || 0) >= 1000 },
    { id: "s_g45", group: G.rec, tier: "드묾", name: "마흔다섯 골의 시즌", cond: "한 시즌 골 45", test: (f) => f.years.some((y) => (y.goals || 0) >= 45) },
    { id: "s_a20", group: G.rec, tier: "드묾", name: "스무 개의 선물", cond: "한 시즌 도움 20", test: (f) => f.years.some((y) => (y.assists || 0) >= 20) },
    { id: "s_d80", group: G.rec, tier: "드묾", name: "여든 번 막은 시즌", cond: "한 시즌 수비 80", test: (f) => f.years.some((y) => (y.defense || 0) >= 80) },
    { id: "apps500", group: G.rec, tier: "흔함", name: "오백 경기", cond: "프로 경기 500", test: (f) => (f.c.apps || 0) >= 500 },
    { id: "hat", group: G.rec, tier: "흔함", name: "해트트릭", cond: "리그·컵 한 경기 3골", test: (f) => (f.c.hat || 0) >= 1 },
    { id: "perfect", group: G.rec, tier: "흔함", name: "10.0", cond: "리그·컵 평점 10.0 경기", test: (f) => (f.c.perfect || 0) >= 1 },
    // 🗺️ 여정 (15)
    { id: "abroad", group: G.trip, tier: "흔함", name: "첫 여권 도장", cond: "유스 국적이 아닌 나라의 리그에서 한 시즌",
      test: (f) => f.lgs.some((l) => l.country !== (HOME[S.market] || "kr")) },
    { id: "pl", group: G.trip, tier: "드묾", name: "꼭대기 리그", cond: "🇬🇧 프리미어리그에서 한 시즌", test: (f) => f.years.some((y) => y.league === 3) },
    { id: "five", group: G.trip, tier: "전설", name: "다섯 나라의 잔디", cond: "다섯 나라의 리그에서 뛰기", test: (f) => new Set(f.lgs.map((l) => l.country)).size >= 5 },
    { id: "krall", group: G.trip, tier: "흔함", name: "한국 축구 일주", cond: "K리그3·2·1 전부에서 한 시즌",
      test: (f) => [5, 4, 1].every((id) => f.years.some((y) => y.league === id)) },
    { id: "climb", group: G.trip, tier: "귀함", name: "바닥에서 꼭대기로", cond: "K리그3에서 데뷔해 프리미어리그까지",
      test: (f) => f.years.length > 0 && f.years[0].league === 5 && f.years.some((y) => y.league === 3) },
    { id: "oneclub", group: G.trip, tier: "흔함", name: "원클럽", cond: "이적 없이 10시즌", test: (f) => f.pro && f.moves.length === 0 && f.years.length >= 10 },
    { id: "loyal5", group: G.trip, tier: "흔함", name: "다섯 번의 개막", cond: "한 클럽에서 5시즌", test: (f) => Object.values(f.perClub).some((n) => n >= 5) },
    { id: "nomad", group: G.trip, tier: "드묾", name: "여섯 번째 유니폼", cond: "프로 클럽 다섯 곳", test: (f) => new Set(f.clubs).size >= 5 },
    { id: "home", group: G.trip, tier: "귀함", name: "돌아온 등번호", cond: "떠났던 클럽으로 이적",
      test: (f) => f.moves.some((m, i) => f.moves.slice(0, i).some((p) => p.from === m.to)) },
    { id: "promo3", group: G.trip, tier: "흔함", name: "세 번의 승격", cond: "승격 세 번", test: (f) => f.years.filter((y) => y.promo === "up").length >= 3 },
    { id: "bounce", group: G.trip, tier: "드묾", name: "한 시즌 만의 귀환", cond: "강등 다음 시즌 바로 승격",
      test: (f) => f.years.some((y, i) => i > 0 && f.years[i - 1].promo === "down" && y.promo === "up") },
    { id: "bigclub", group: G.trip, tier: "전설", name: "👑 스무 살의 계약서", cond: "유스 엔딩 👑 유럽 빅클럽 입단", test: () => S.youthEnd === "big" },
    { id: "semi_top", group: G.trip, tier: "귀함", name: "📹 세미프로의 기적", cond: "📹 세미프로에서 시작해 발롱도르",
      test: (f) => S.youthEnd === "semi" && (f.c.ballon || 0) >= 1 },
    { id: "camp", group: G.trip, tier: "흔함", name: "🔥 한 해 더", cond: "1년 특훈을 거쳐 프로로", test: (f) => f.pro && !!S.campDone },
    { id: "full15", group: G.trip, tier: "흔함", name: "열다섯 번의 시즌", cond: "15시즌 완주", test: (f) => f.years.length >= 15 },
    // 🏆 수상 (11)
    { id: "rookie", group: G.award, tier: "흔함", name: "🌟 신인왕", cond: "신인왕", test: (f) => (f.c.rookie || 0) >= 1 },
    { id: "mvp1", group: G.award, tier: "흔함", name: "👑 리그의 주인", cond: "리그MVP", test: (f) => (f.c.daesang || 0) >= 1 },
    { id: "mvp5", group: G.award, tier: "드묾", name: "다섯 번의 왕관", cond: "리그MVP 다섯 번", test: (f) => (f.c.daesang || 0) >= 5 },
    { id: "ballon1", group: G.award, tier: "귀함", name: "🏅 세계 최고의 해", cond: "발롱도르", test: (f) => (f.c.ballon || 0) >= 1 },
    { id: "ballon3", group: G.award, tier: "전설", name: "세 번의 세계", cond: "발롱도르 세 번", test: (f) => (f.c.ballon || 0) >= 3 },
    { id: "boot5", group: G.award, tier: "흔함", name: "🥇 득점왕 다섯 번", cond: "골든부츠 다섯 시즌",
      test: (f) => f.years.filter((y) => (y.awards || []).includes("골든부츠")).length >= 5 },
    { id: "sweep", group: G.award, tier: "드묾", name: "쓸어 담은 시즌", cond: "한 시즌 수상 다섯", test: (f) => f.years.some((y) => (y.awards || []).length >= 5) },
    { id: "treble", group: G.award, tier: "드묾", name: "한 해의 세 트로피", cond: "같은 시즌 리그 우승 + 컵 우승 + 🌏 월드컵 우승", test: treble },
    { id: "trophy10", group: G.award, tier: "흔함", name: "진열장이 모자라", cond: "프로 트로피 열 개", test: (f) => f.tro.length >= 10 },
    { id: "wclass", group: G.award, tier: "흔함", name: "🌟 월드클래스", cond: "클래스 🌟 월드클래스 도달",
      test: (f) => (f.c.bestTitle != null ? f.c.bestTitle : -1) >= titleIdx(106) },
    { id: "god", group: G.award, tier: "전설", name: "🏆 축구의 신", cond: "클래스 🏆 축구의 신 도달",
      test: (f) => (f.c.bestTitle != null ? f.c.bestTitle : -1) >= titleIdx(155) },
    // 🌏 대표팀 (8)
    { id: "wc_first", group: G.nat, tier: "흔함", name: "첫 소집", cond: "월드컵 출전", test: (f) => (f.c.wcApps || 0) >= 1 },
    { id: "wc_win2", group: G.nat, tier: "흔함", name: "🌏 두 번의 정상", cond: "월드컵 우승 두 번", test: (f) => (f.c.wcWin || 0) >= 2 },
    { id: "wc_ball2", group: G.nat, tier: "흔함", name: "🏅 두 번의 골든볼", cond: "월드컵 골든볼 두 번", test: (f) => (f.c.wcBall || 0) >= 2 },
    { id: "wc_boot2", group: G.nat, tier: "드묾", name: "🥇 두 번의 골든부츠", cond: "월드컵 골든부츠 두 번", test: (f) => (f.c.wcBoot || 0) >= 2 },
    { id: "wc_four", group: G.nat, tier: "드묾", name: "네 번의 여름", cond: "월드컵 네 대회 모두 4강 이상",
      test: (f) => { const ys = wcYears(); return ys.length > 0 && ys.every((y) => f.hist.some((h) => h.y === y && TOP4.includes(h.result))); } },
    /* 🌱 와일드카드 — 나중 소집이 S.wcWild를 지우므로 **그 시즌 결산 때** 판정해요(when "season"만) */
    { id: "wc_wild", group: G.nat, tier: "전설", name: "🌱 와일드카드", cond: "유망주 와일드카드로 월드컵 출전",
      test: (f, when) => when === "season" && S.wcWild === S.proYear && f.hist.some((h) => h.y === S.proYear && h.result !== "none") },
    { id: "wc_stay", group: G.nat, tier: "드묾", name: "클럽을 택한 봄", cond: "대표팀 소집을 고사하고 클럽에 남기", test: (f) => f.hist.some((h) => h.stay) },
    { id: "wc_lucky", group: G.nat, tier: "전설", name: "🎲 깜짝 발탁", cond: "문턱 아래에서 깜짝 발탁", test: () => S.wcLucky != null },
    // 📖 이야기 (4)
    { id: "end1", group: G.story, tier: "흔함", name: "첫 번째 결말", cond: "이야기 결말 하나(흐지부지 말고)", test: (f) => f.done.length >= 1 },
    { id: "end5", group: G.story, tier: "드묾", name: "다섯 개의 결말", cond: "이야기 결말 다섯(흐지부지 말고)", test: (f) => f.done.length >= 5 },
    { id: "promise10", group: G.story, tier: "전설", name: "지킨 약속", cond: "📋 약속 열 번 지키기",
      test: (f) => f.log.filter((l) => l.k === "promise" && l.ok === true).length >= 10 },
    { id: "longshot", group: G.story, tier: "귀함", name: "한 수", cond: "성공 확률 30% 이하 도전 성공",
      test: (f) => f.log.some((l) => l.k === "try" && l.ok === true && l.pct != null && l.pct <= 30) },
    // 🎓 유산 (5)
    { id: "legend", group: G.legacy, tier: "흔함", name: "🐐 전설의 줄", cond: "커리어 점수 3,400(🐐 등급)", test: (f) => score(f) >= 3400 },
    { id: "history", group: G.legacy, tier: "드묾", name: "🌍 축구사", cond: "커리어 점수 4,200(🌍 등급)", test: (f) => score(f) >= 4200 },
    { id: "gen3", group: G.legacy, tier: "드묾", name: "🧬 삼대째", cond: "유산 세대 3", test: () => (loadLegacy().gen || 0) >= 3 },
    { id: "trans12", group: G.legacy, tier: "전설", name: "✨ 초월자", cond: "초월 12단계", test: (f) => f.pro && transTotal() >= 12 },
    /* 처음 약발 2에서 10까지 — S.origin이 없는(옛) 세이브는 판정하지 않아요 */
    { id: "twofoot", group: G.legacy, tier: "드묾", name: "🦶 만든 양발", cond: "약발 2로 시작해 10까지",
      test: () => !!S.origin && S.origin.weak === 2 && !!S.foot && S.foot.weak >= 10 },
  ];
  const LIST = DEFS.map(({ id, name, cond, group, tier }) => ({ id, name, cond, group, tier }));
  const defOf = (id) => DEFS.find((d) => d.id === id) || null;
  const tierOf = (id) => { const d = defOf(id); return d ? d.tier : null; };

  /* 판정 — when ∈ "season" | "story" | "retire" | "rebirth" → 새로 딴 id 목록.
   * 옛 세이브의 첫 판정은 late: true로 조용히 채워요(그 개수는 결산 한 줄이 따로 말해요). */
  function check(when) {
    if (!S) return [];
    const first = !S.ach || typeof S.ach !== "object";
    if (first) S.ach = {};
    const f = facts();
    const got = [];
    for (const d of DEFS) {
      if (S.ach[d.id]) continue;
      if (!d.test(f, when)) continue;
      S.ach[d.id] = { y: S.proYear || 0, at: Date.now(), late: first };
      if (window.WingerBook) WingerBook.mark("ach", d.id);
      got.push(d.id);
    }
    return got;
  }
  /* 새로 딴 업적 연출 — 한 칸씩 줄 세워요(수상·이적 연출과 안 겹치게). 조용한 소급(late)은 한 줄로만 */
  const TIER_ICON = { 흔함: "⚪", 드묾: "🔵", 귀함: "🟣", 전설: "🟡" };
  function announce(ids) {
    if (!ids || !ids.length || !S || !S.ach || !window.WingerCareer || !WingerCareer.queueFx) return;
    const late = ids.filter((id) => S.ach[id] && S.ach[id].late);
    const list = ids.filter((id) => !late.includes(id)).map((id) => {
      const d = defOf(id);
      return ["award", `🏅 ${TIER_ICON[d.tier]} ${d.name}`];
    });
    if (late.length) list.unshift(["flash", `🏅 지난 기록으로 업적 ${late.length}개를 채웠어요`]);
    WingerCareer.queueFx(list);
  }
  /* 🏅 대표 업적 — 고른 것(S.rep)이 딴 것이면 그것, 아니면 딴 것 중 **가장 드문 것**(같으면 가장 최근) */
  function repOf(st) {
    const ach = (st && st.ach) || {};
    if (st && st.rep && ach[st.rep] && defOf(st.rep)) return st.rep;
    let best = null;
    for (const id of Object.keys(ach)) {
      const d = defOf(id);
      if (!d) continue;
      const a = ach[id], b = best && ach[best];
      if (!best || RANK[d.tier] > RANK[tierOf(best)]
          || (RANK[d.tier] === RANK[tierOf(best)] && ((a.at || 0) > (b.at || 0) || ((a.at || 0) === (b.at || 0) && (a.y || 0) > (b.y || 0))))) best = id;
    }
    return best;
  }
  /* 진행 중에만, 딴 것만 — 은퇴 뒤에는 WingerCareer.leave로 골라요 */
  function setRep(id) {
    if (!S || !S.ach || !S.ach[id] || !defOf(id)) return false;
    S.rep = id;
    save();
    return true;
  }

  /* ---------- 🧭 플레이 성향 11 — 규칙으로, 위에서부터 첫 번째(스펙 §5-3) ----------
   * 1~5는 🎲 기록(evLog)이 있어야 해요(옛 세이브는 6부터). 무작위 없음 — 언제 계산해도 같은 성향이에요. */
  const TH = { MIN_DEC: 12, READ: 0.8, BOTH: 3, MIN_TRY: 8, LUCK: 2.5, BOLD: 0.65, CAUTIOUS: 0.30,
    HEART_RATIO: 0.7, HEART_MIN: 8, NOMAD_CLUBS: 5, NOMAD_NAT: 3, CLIMB_FROM: 2, CLIMB_TO: 9, ONE: 25, EVEN: 12 };
  const STYLES = {
    reader: "🧮 숫자를 읽은 선수", lucky: "🍀 공이 따라준 선수", rain: "🌧️ 비를 맞으며 뛴 선수",
    bold: "🎲 판을 키운 선수", cautious: "🛡️ 돌다리를 두드린 선수", heart: "🏠 한 팀의 심장",
    nomad: "🧳 짐 푸는 게 익숙한 선수", stairs: "📈 계단을 한 칸씩", onething: "🎯 한 가지를 끝까지",
    even: "⚖️ 빈틈없는 선수", ground: "⚽ 그라운드의 선수",
  };
  const fix1 = (v) => Math.round(v * 10) / 10;
  function style(st) {
    const log = Array.isArray(st.evLog) ? st.evLog : [];
    // 확률형 결정 = 도전 선택지가 있던 결정(도전을 골랐든 안 골랐든)
    const prob = log.filter((l) => l.k === "try" || l.alt != null);
    const tries = log.filter((l) => l.k === "try");
    const n = prob.length;
    const readOk = prob.filter((l) => (l.k === "try" ? l.pct >= 50 : l.alt < 50)).length;
    const heldLow = prob.filter((l) => l.k !== "try" && l.alt < 50).length;     // 50 아래에서 참은 결정
    const betHigh = tries.filter((l) => l.pct >= 50).length;                     // 50 위에서 건 결정
    const exp = tries.reduce((a, l) => a + l.pct / 100, 0);
    const got = tries.filter((l) => l.ok === true).length;
    const years = CT().fillClubs ? CT().fillClubs(((st.career && st.career.years) || []), st) : ((st.career && st.career.years) || []);
    const perClub = {};
    for (const y of years) if (y.club != null) perClub[y.club] = (perClub[y.club] || 0) + 1;
    const top = Object.entries(perClub).sort((a, b) => b[1] - a[1])[0] || null;
    const lgOf = (y) => LEAGUES.find((l) => l.id === y.league) || {};
    const clubs = Object.keys(perClub).length;
    const nats = new Set(years.map((y) => lgOf(y).country).filter(Boolean)).size;
    const tiers = years.map((y) => lgOf(y).tier || 0);
    const s = st.stats || {};
    const main = POS_INFO[st.pos] ? POS_INFO[st.pos].stat : "shoot";
    const others = STAT_KEYS.filter((k) => k !== main);
    const rest = others.reduce((a, k) => a + (s[k] || 0), 0) / others.length;
    const vals = STAT_KEYS.map((k) => s[k] || 0);
    const pick = (k, line) => ({ k, name: STYLES[k], line });
    if (n >= TH.MIN_DEC && readOk / n >= TH.READ && heldLow >= TH.BOTH && betHigh >= TH.BOTH) {
      return pick("reader", `확률 50% 위에서 ${betHigh}번 걸고, 아래에선 ${heldLow}번 참았어요`);
    }
    if (tries.length >= TH.MIN_TRY && got - exp >= TH.LUCK) return pick("lucky", `보인 확률대로면 ${fix1(exp)}번, 실제로 ${got}번 성공했어요`);
    if (tries.length >= TH.MIN_TRY && got - exp <= -TH.LUCK) return pick("rain", `보인 확률대로면 ${fix1(exp)}번, 실제로 ${got}번 성공했어요`);
    if (n >= TH.MIN_DEC && tries.length / n >= TH.BOLD) return pick("bold", `결정 ${n}번 중 ${tries.length}번 도전`);
    if (n >= TH.MIN_DEC && tries.length / n <= TH.CAUTIOUS) return pick("cautious", `결정 ${n}번 중 ${tries.length}번 도전`);
    if (top && years.length >= TH.HEART_MIN && top[1] / years.length >= TH.HEART_RATIO) {
      return pick("heart", `${years.length}시즌 중 ${top[1]}시즌을 ${top[0]}에서`);
    }
    if (clubs >= TH.NOMAD_CLUBS || nats >= TH.NOMAD_NAT) return pick("nomad", `클럽 ${clubs}곳 · 나라 ${nats}곳`);
    if (tiers.length && tiers[0] <= TH.CLIMB_FROM && Math.max(...tiers) >= TH.CLIMB_TO) {
      const a = lgOf(years[0]), b = LEAGUES.find((l) => l.tier === Math.max(...tiers)) || {};
      return pick("stairs", `${a.flag || ""} ${a.short || ""}에서 ${b.flag || ""} ${b.short || ""}까지`.replace(/\s+/g, " ").trim());
    }
    if (years.length && (s[main] || 0) - rest >= TH.ONE) return pick("onething", `주 능력치가 나머지 평균보다 ${Math.round((s[main] || 0) - rest)} 높아요`);
    if (years.length && Math.max(...vals) - Math.min(...vals) <= TH.EVEN) return pick("even", `가장 높은 능력치와 낮은 능력치의 차이 ${Math.round(Math.max(...vals) - Math.min(...vals))}`);
    return pick("ground", "");
  }
  /* 🎯 최고의 한 수 — 성공한 **도전** 중 표시 %가 가장 낮은 것(같으면 늦은 시즌) — 40% 이하일 때만. 약속은 후보가 아니에요 */
  const BEST_MOVE_PCT = 40;
  function bestMove(st) {
    const log = Array.isArray(st.evLog) ? st.evLog : [];
    let best = null;
    for (const l of log) {
      if (l.k !== "try" || l.ok !== true || l.pct == null || l.pct > BEST_MOVE_PCT) continue;
      if (!best || l.pct < best.pct || (l.pct === best.pct && (l.y || 0) >= (best.y || 0))) best = l;
    }
    if (!best) return null;
    const ev = window.WingerEvents && WingerEvents.LIST.find((e) => e.id === best.id);
    const st2 = window.WingerStory && /^s_(\w+?)\d$/.exec(best.id);
    const story = st2 && WingerStory.LIST.find((s) => s.sid === st2[1]);
    const name = ev ? `${ev.emoji} ${ev.name}` : story ? `${story.emoji} ${story.name}` : best.id;
    return { id: best.id, name, pct: best.pct, y: best.y || 0 };
  }
  /* 🍀 기대 대비 — 보인 확률대로면 몇 번, 실제로 몇 번 */
  function luck(st) {
    const tries = (Array.isArray(st.evLog) ? st.evLog : []).filter((l) => l.k === "try" && l.pct != null);
    if (!tries.length) return null;
    return { n: tries.length, exp: fix1(tries.reduce((a, l) => a + l.pct / 100, 0)), got: tries.filter((l) => l.ok === true).length };
  }

  return { LIST, check, tierOf, repOf, setRep, TIERS, TIER_ICON, style, bestMove, luck, STYLES, announce };
})();
