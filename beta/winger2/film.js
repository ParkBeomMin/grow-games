/* ⚽ 더 윙어 II 1막 — 🎬 졸업 필름(모델) · 이 기기에 저장 · 꺼내기
 *
 * 설계: 12번 §7-6 · 25번 §3 계약 8(①의 film 모양 + 1막 장 봄 · 여름 · 가을 · 장마다 `bg` ·
 *       「몸의 기록」 장에 「훈련 N주 · 휴식 M주」 · 관리 한 줄 — 23번 §8. 관리 줄은 **평가서 🫀 관리 칸 글 그대로**(44번 · 42번 §3)
 *       (🧱 막기 판 N번(🤖 k) · 읽기 ± · 포지션 보정 — 36번 §16-3 · 보이는 값 = 판정 값))
 * 그리기와 공유 이미지(`drawCard` · `share`)는 director의 `scenes.js`가 붙여요 — 여기는 **모델만**.
 * `ach` = 이 선수가 딴 업적 [{ id, name, tier }] — 🏅 대표 업적 고르기 · 공유 이미지(31번 §2). 고른 것은 `head.rep` 한 곳에만.
 *
 * ── 🔒 지키는 것 ──
 *  · **있는 만큼만** — 기록이 없는 칸은 0이 아니라 `null`(「없다」와 「0이었다」가 같은 얼굴이면 안 돼요).
 *  · 필름은 기념품이라 **이 기기에만**(`winger2-films` · 최근 20편) — 2막이 생기면 1막 필름이 은퇴 필름의 첫 장이에요.
 *  · 화면은 **이 모델만** 읽어요(세이브를 직접 안 읽음 — 25번 §3 계약 9). */
"use strict";

window.W2Film = (() => {
  const KEY = "winger2-films";
  const KEEP = 20;
  const SH = () => window.W2Sheet;
  const W = () => window.W2World;
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  /* 🗓️ 주 → 달(12번 §5-1 달력: 3월 1~5 · 4월 6~9 · 5월 10~13 · 6월 14~16 · 7월 17~20 · 8월 21~24 ·
   *    9월 25~28 · 10월 29~33 · 11월 34~36) */
  const MONTHS = [[3, 1], [4, 6], [5, 10], [6, 14], [7, 17], [8, 21], [9, 25], [10, 29], [11, 34]];
  function dateOf(w) {
    let m = MONTHS[0];
    for (const x of MONTHS) if (w >= x[1]) m = x;
    return { m: m[0], wk: w - m[1] + 1, text: `${m[0]}월 ${w - m[1] + 1}주` };
  }
  /* 한 철의 경기 — 전적 · 기록 · 가장 좋았던 경기 한 줄(평점이 가장 높은 경기 · 같으면 앞 경기) */
  function season(games) {
    if (!games.length) return null;
    const sum = (k) => games.reduce((a, x) => a + (Number(x[k]) || 0), 0);
    let best = null;
    for (const x of games) if (x.r != null && (!best || x.r > best.r)) best = x;
    return {
      games: games.length, w: games.filter((x) => x.res === "W").length, d: games.filter((x) => x.res === "D").length,
      l: games.filter((x) => x.res === "L").length, g: sum("g"), a: sum("a"), def: sum("d"),
      best: best ? { w: best.w, date: dateOf(best.w).text, opp: best.opp, gf: best.gf, ga: best.ga, g: best.g, a: best.a, d: best.d, r: best.r } : null,
    };
  }

  function build(S) {
    const g = S.gender === "f" ? "f" : "m";
    const who = `${S.preset}-${g}`;
    const games = Array.isArray(S.games) ? S.games : [];
    const league = games.filter((x) => x.t === "L");
    const cupGames = games.filter((x) => x.t === "C");
    const cup = S.world.cup;
    const X = W();
    const keeper = X.short(S.world.keeper.name);
    const rec = S.record || {};
    const st = S.stats || {}, st0 = S.statsAt0 || st;
    const ups = SH().KEYS.map((k) => ({ k, label: SH().STAT[k].name, emoji: SH().STAT[k].emoji,
      from: num(st0[k]), to: num(st[k]), g0: SH().grade(st0[k] || 0).g, g1: SH().grade(st[k] || 0).g }));
    /* 🫀 관리 줄 — 평가서 관리 칸과 **같은 글** — 따로 셈하지 않아요(옛 v2 세이브의 평가서면 `skill` 칸 글 그대로) */
    const sk = S.sheet && Array.isArray(S.sheet.cols) ? S.sheet.cols.find((c) => c.k === "care" || c.k === "skill") : null;
    const skd = (sk && sk.detail) || {};
    const A = window.W2Ach;
    const done = (S.story && S.story.done) || [];
    const lastLeague = league.find((x) => x.w === 33) || null;
    const E = S.ending || {};
    const head = {
      /* 🔢 `no` = 지금 번호(📍 「번호를 되찾은 날」이면 돌아온 번호 · 아니면 null — {rival}이 달고 있어요) · `noOrig` = 3년 달던 번호 */
      name: S.name, no: Number.isInteger(S.no) ? S.no : null, noOrig: Number.isInteger(S.noOrig) ? S.noOrig : null,
      pos: S.pos, posName: SH().POS[S.pos] || "",
      preset: S.preset, gender: g, who, school: S.world.school.team,
      ending: E.id ? { id: E.id, name: SH().endName(E.id, g, true), emoji: SH().END_EMO[E.id] || "🎓" } : null,
      tier: S.sheet ? S.sheet.tier : null, tierName: S.sheet ? S.sheet.tierName : null,
      rep: A ? A.repOf(S) : null,
    };
    const ch = [
      { k: "cover", title: "🎓 졸업 사진", bg: "bg-gate", who, mood: "moved" },
      { k: "spring", title: `🌸 봄 — ${S.world.league.name} 전반기`, bg: "bg-field", ...(season(league.filter((x) => x.w < 20)) || {}) },
      { k: "summer", title: `☀️ 여름 — ${cup.name}`, bg: "bg-cup", ...(season(cupGames) || {}),
        stage: cup.done ? cup.stage : null, stageName: cup.done ? X.STAGE_NAME[cup.stage] : null,
        pk: num(rec.pkN) != null && rec.pkN > 0 ? { n: rec.pkN, goal: Number(rec.pkGoal) || 0 } : null },
      { k: "autumn", title: `🍂 가을 — ${S.world.league.name} 후반기`, bg: "bg-field", ...(season(league.filter((x) => x.w > 20)) || {}),
        keeper: lastLeague ? `🕯️ ${keeper}의 마지막 경기 — ${lastLeague.gf} : ${lastLeague.ga}` : null },
      { k: "body", title: "🏋️ 몸의 기록", bg: "bg-field", ups,
        weeks: { train: Number(S.trainWeeks) || 0, rest: Number(S.restWeeks) || 0, weak: Number(S.weakWeeks) || 0 },
        care: { games: num(skd.games), avg: num(skd.avg) },
        lines: [`훈련 ${Number(S.trainWeeks) || 0}주(🦶 약발 ${Number(S.weakWeeks) || 0}주) · 휴식 ${Number(S.restWeeks) || 0}주`,
          sk ? `${sk.k === "care" ? "🫀" : "🎮"} ${sk.note}` : "🫀 평가서 전이에요"]
          .concat((Number(S.weak) || 0) >= 2 ? ["🦶 약발 2단계 — 양발로 졸업해요"] : []) },   // 29번 §3-6 (가)
      { k: "choice", title: "🧭 선택의 기록", bg: "bg-locker",
        style: A ? A.style(S) : null, best: A ? A.bestMove(S) : null, luck: A ? A.luck(S) : null },
      { k: "story", title: "📖 이야기", bg: "bg-locker",
        ends: done.map((d) => { const L = window.W2Story && window.W2Story.LIST.find((x) => x.sid === d.sid); return { sid: d.sid, end: d.end, name: d.name, emoji: L ? L.emoji : "📖", story: L ? L.name : d.sid }; }) },
      { k: "sheet", title: "📋 평가서", bg: "bg-test", cols: S.sheet ? S.sheet.cols : null,
        total: S.sheet ? S.sheet.total : null, tierName: S.sheet ? S.sheet.tierName : null },
      { k: "last", title: head.ending ? `${head.ending.emoji} ${head.ending.name}` : "🎓", bg: E.id ? `end-${E.id}` : "bg-gate", who, mood: E.mood || "moved",
        next: !!(E.id && SH().NEXT[E.id]), line: E.id ? SH().waitOf(E.id) : null,
        /* 🔖 그해의 한 장면 — 가장 늦게 세운 깃발 한 줄(45번 §3-2 ② · 수치 0 · 없으면 null) */
        year: window.W2Events && window.W2Events.flagYear ? window.W2Events.flagYear(S) : null },
    ].filter((c) => c.k === "cover" || c.k === "last" || c.k === "body" || c.k === "choice" || c.k === "sheet" || c.games || (c.k === "story" && c.ends.length));
    const ach = A ? A.LIST.filter((d) => S.ach && S.ach[d.id]).map((d) => ({ id: d.id, name: d.name, tier: d.tier })) : [];
    return { v: 1, id: S.id, at: Date.now(), head, ch, ach, word: null };
  }

  function readAll() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      return o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (e) { return {}; }
  }
  /* 저장 — 최근 20편만(오래된 것부터 버려요). 기념품이라 공간이 모자라면 조용히 넘어가요 */
  function put(film) {
    if (!film || !film.id) return false;
    const all = readAll();
    delete all[film.id];
    all[film.id] = film;
    const ids = Object.keys(all);
    while (ids.length > KEEP) delete all[ids.shift()];
    try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; }
  }
  function get(id) {
    const f = readAll()[id];
    return f && typeof f === "object" && f.head ? f : null;
  }

  return { build, get, put, dateOf, KEY };
})();
