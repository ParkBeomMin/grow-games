/* 🎬 은퇴 필름 — 모델 만들기(build) · 이 기기에 저장(put) · 꺼내기(get).
 *
 * 설계: docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md §5-6 (모델) · §6-2 (키)
 * 그리기와 공유 이미지(drawCard · share)는 scenes.js가 이 객체에 붙여요 — 이 파일이 먼저 로드돼야 해요.
 *
 * ── 지키는 것 ──
 *  · **있는 만큼만** 담아요 — 기록이 없는 칸은 0이 아니라 null이에요(「기록이 없다」와 「0이었다」가 같은 얼굴이면 안 돼요).
 *  · 옛 세이브에서도 예외 없이 만들어져야 해요 — 소속이 없는 시즌 · 이상한 트로피 글자 · wcHist 없음 · S.origin·fee 없음.
 *  · 필름은 기념품이라 **이 기기에만** 남겨요(최근 20편) — 명전 항목에는 요약 키만 실려요.
 *
 * game.js · career.js · achieve.js · story.js 뒤에 로드해야 해요. */
"use strict";

window.WingerFilm = (() => {
  const KEY = SAVE_KEY + "-films";
  const KEEP = 20;
  const TRO_RE = /^(\d+)시즌 (.+) 우승$/;
  const CT = () => (window.WingerCareer && WingerCareer._t) || {};
  const numOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  /* 프로 트로피를 시즌별로 — 형식이 다른 글자(유스 「1위」·깨진 값)는 건너뛰어요 */
  function trophies(st) {
    const out = [];
    for (const t of Array.isArray(st.trophies) ? st.trophies : []) {
      const m = TRO_RE.exec(String(t));
      if (m) out.push({ y: +m[1], t: `${m[2]} 우승`, club: m[2] !== "월드컵" });
    }
    return out.sort((a, b) => a.y - b.y);
  }

  /* 클럽마다 한 장 — 연달아 같은 클럽인 시즌을 묶어요. 소속을 모르는 시즌은 「소속 기록 이전」 한 블록(club null) */
  function chapters(years, hon) {
    const ch = [];
    const sum = (cur, k, v) => { if (typeof v === "number") cur[k] = (cur[k] || 0) + v; };
    for (const y of years) {
      if (!y) continue;
      const club = y.club != null ? y.club : null;
      let cur = ch[ch.length - 1];
      if (!cur || cur.club !== club) {
        cur = { club, lgs: [], y0: y.y, y1: y.y, apps: null, g: null, a: null, d: null, tro: [], aw: [],
          back: club != null && ch.some((x) => x.club === club) };   // 친정 복귀
        ch.push(cur);
      }
      cur.y1 = y.y;
      if (y.league != null && cur.lgs[cur.lgs.length - 1] !== y.league) cur.lgs.push(y.league);
      sum(cur, "apps", y.apps); sum(cur, "g", y.goals); sum(cur, "a", y.assists); sum(cur, "d", y.defense);
      if (Array.isArray(y.awards)) cur.aw.push(...y.awards);
    }
    for (const c of ch) {
      c.tro = hon.filter((h) => h.club && h.y >= c.y0 && h.y <= c.y1).map((h) => `${h.y}시즌 ${h.t}`);
    }
    return ch;
  }

  /* 개인상 합계(트로피 진열장) — 있는 것만 */
  function awards(st, years) {
    const c = st.career || {};
    const seasons = (name) => years.filter((y) => y && Array.isArray(y.awards) && y.awards.includes(name)).length;
    return [
      ["🏅 발롱도르", c.ballon], ["🏆 리그MVP", c.daesang], ["🥈 베스트11", c.bonsang], ["🌟 신인왕", c.rookie],
      ["🥇 골든부츠", seasons("골든부츠")], ["🎯 플레이메이커", seasons("플레이메이커")], ["🛡️ 철벽상", seasons("철벽상")],
      ["📈 공격포인트왕", seasons("공격포인트왕")], ["🏅 MOM", c.wins],
      ["🌏 골든볼", c.wcBall], ["🌏 골든부츠", c.wcBoot], ["🌏 골든월", c.wcWall],
    ].filter(([, n]) => typeof n === "number" && n > 0).map(([label, n]) => ({ label, n }));
  }

  /* 🌟 가장 빛난 시즌 — 시즌 평가(hype)가 가장 큰 시즌(같으면 늦은 시즌). 최고의 한 수가 없을 때 대신 그려요(스펙 §5-4).
   * 모양 { y, club, lg, g, a, d, aw, hype } — 기록이 없는 칸은 null. 평가가 적힌 시즌이 없으면 null */
  function bright(years) {
    let best = null;
    for (const y of years) {
      if (!y || typeof y.hype !== "number") continue;
      if (!best || y.hype >= best.hype) best = y;
    }
    return best ? {
      y: best.y, club: best.club != null ? best.club : null, lg: best.league != null ? best.league : null,
      g: numOrNull(best.goals), a: numOrNull(best.assists), d: numOrNull(best.defense),
      aw: Array.isArray(best.awards) ? best.awards.slice() : [], hype: best.hype,
    } : null;
  }

  /* 필름 모델 — S가 살아 있을 때(clearSave 전) 불러요. entry(명전 항목)를 주면 id·이름표·점수·등급을 거기서 받아
   * 명전과 같은 값을 써요. 안 주면 지금 세이브에서 계산해요. 화면은 **이 모델만** 읽어요. */
  function build(st, entry) {
    const e = entry || {};
    const T = CT();
    const c = st.career || {};
    const pro = st.phase === "soccer-pro";
    const years = T.fillClubs ? T.fillClubs(Array.isArray(c.years) ? c.years : [], st) : (c.years || []);
    const hon = trophies(st);
    const A = window.WingerAch;
    const score = e.score != null ? e.score : pro && T.careerScore ? T.careerScore() : null;
    const market = MARKETS.find((m) => m.id === st.market);
    const log = Array.isArray(st.evLog) ? st.evLog : [];
    return {
      v: 1,
      id: e.id || null,
      head: {
        name: st.name, pos: st.pos,
        no: Number.isInteger(st.no) && st.no >= 1 && st.no <= 99 ? st.no : null,   // 1~99 정수만(세이브는 안 씻어요)
        age: 17 + years.length + (st.campDone ? 1 : 0),        // 은퇴 나이(17 + 시즌, 특훈 +1)
        club: e.team || st.group || null,
        grade: e.grade || (score != null && T.gradeOfScore ? T.gradeOfScore(score) : null),
        score, gen: e.gen || (loadLegacy().gen || 0) + 1,
        rep: A ? A.repOf(st) : null,
        flag: market ? market.emoji : null,                    // 유스 국기(공유 이미지)
      },
      ch: chapters(years, hon),
      moves: (Array.isArray(st.moves) ? st.moves : []).filter((m) => m && m.y != null)
        .map((m) => ({ y: m.y, to: m.to, toLg: m.toLg, fee: numOrNull(m.fee) })),
      nat: { wc: (Array.isArray(st.wcHist) ? st.wcHist : []).filter((h) => h && h.y != null)
        .map((h) => ({ y: h.y, r: h.result, g: numOrNull(h.g), a: numOrNull(h.a), apps: numOrNull(h.apps),
          aw: Array.isArray(h.awards) ? h.awards.slice() : [], stay: !!h.stay })) },
      hon: hon.map(({ y, t }) => ({ y, t })),
      awards: awards(st, years),
      body: {
        from: st.origin && st.origin.stats ? { ...st.origin.stats } : null,
        to: { ...(st.stats || {}) },
        best: numOrNull(c.bestTitle),
        max: typeof c.maxOvr === "number" && c.maxOvr > 0 ? Math.round(c.maxOvr * 10) / 10 : null,
        trans: pro ? transTotal() : 0,
        weak: st.origin && st.foot ? [st.origin.weak, st.foot.weak] : null,
      },
      /* 🧭 선택의 기록 — 🎯 최고의 한 수(성공 확률 40% 이하 도전 성공)가 없으면 🌟 가장 빛난 시즌(bright)을 대신 실어요.
       * 🎲 기록이 없는 옛 세이브는 늘 bright 쪽이고, 성향은 규칙 6~10으로만 나와요(오케스트레이터 확정 — 30번 문서) */
      pick: A ? (() => {
        const best = log.length ? A.bestMove(st) : null;
        return { style: A.style(st), best, luck: log.length ? A.luck(st) : null, bright: best ? null : bright(years) };
      })() : null,
      ends: ((st.story && Array.isArray(st.story.done)) ? st.story.done : [])
        .map((d) => ({ sid: d.sid, end: d.end, name: d.name || d.end, y: d.y })),
      parts: pro && T.careerScoreParts ? T.careerScoreParts() : [],
      ach: Object.entries(st.ach || {}).map(([id, v]) => ({ id, y: (v && v.y) || 0 })),
      word: null,
    };
  }

  function readAll() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      return o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch { return {}; }
  }
  /* 저장 — 최근 20편만 남겨요(오래된 것부터 버려요). 기념품이라 저장 공간이 모자라면 조용히 넘어가요 */
  function put(film) {
    if (!film || !film.id) return false;
    const all = readAll();
    delete all[film.id];
    all[film.id] = film;
    const ids = Object.keys(all);
    while (ids.length > KEEP) delete all[ids.shift()];
    try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
  }
  function get(id) {
    const f = readAll()[id];
    return f && typeof f === "object" && f.head ? f : null;
  }

  return { build, get, put, KEY };
})();
