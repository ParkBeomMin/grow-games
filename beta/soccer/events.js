/* 🎲 선택 이벤트 — 유스 네 칸 · 프로 17종 · 📋 약속 · 🤝 감독 신뢰 · 평소 컨디션.
 *
 * 설계: docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md §3 (계수는 §7)
 *
 * ── 지키는 것 ──
 *  · **늘 안전 == 현행** — 유스의 확정은 옛 maybeEvent 효과 그대로, 프로의 확정은 효과 0이에요.
 *    이벤트 난수(블록 굴림 · 후보 뽑기 · 판정 u)는 **`api._rng` 하나로만** 뽑아요 — 게임 난수를
 *    한 톨도 안 써요. 검사가 이 틈에 시드 난수를 갈라 끼울 수 있어요(기본은 Math.random).
 *  · **보이는 % = 판정 %** — 조각을 **각각 정수로 반올림한 뒤 더해** `pct`를 한 번 얼리고, 화면과 판정이
 *    그 필드 하나를 읽어요. 판정 난수 `u`도 뜰 때 한 번 굴려 얼려요(`u × 100 < pct`면 성공).
 *    연속 실패 보호 · 행운 보정 · 뜻밖의 반전 같은 숨은 손은 없어요.
 *  · **판돈은 한 축, W = L** — 그래서 손익분기 p* = 50%가 구성으로 서요. 적용하면 칩과 다른 값이 되는
 *    판돈(상한 · 바닥에 걸리는 것)은 무작위 이벤트면 후보에서 빼요.
 *  · **이벤트는 문턱을 안 만져요** — 월드컵 소집 · 이적 문턱 · 수상 판정 · 클래스 문턱은 효과 대상이 아니에요.
 *
 * game.js의 전역(S, clamp, pick, overall, STAT_DEFS, POS_INFO, statCap, talentStars, raceStr, leagueOf,
 * LEAGUES, activeBuffs, titleIdx, titleAt, titlePayMul, traitMul, loadLegacy, fmtMoney, save, renderMain)과
 * WingerCareer · WingerSquad를 쓰므로 career.js 뒤에 로드해야 해요. */
"use strict";

window.WingerEvents = (() => {
  // ---------- 확정 계수 (스펙 §7 — 한 벌이라 표 그대로예요) ----------
  const SLOT_P = { pre: 0.5, h2: 0.4, mid: 0.06 };   // 블록마다 뜰 확률
  const SEASON_CAP = 5;                                // 시즌 상한(이야기 장 포함)
  const TRUST_CAP = 4;                                 // 🤝 시즌 합 ±4
  const STAKE = { trust: 2, fame: 25, stat: 2, weak: 1 };
  const PCT_LO = 10, PCT_HI = 90;
  const SKILL_CAP = 10, COND_K = 0.8, COND_CAP = 15;
  const USUAL_W = 1 / 8;                               // 평소 컨디션이 블록마다 따라가는 몫
  const NEIGHBOR_LEFT = 5, NEIGHBOR_PTS = 3;
  const YOUTH_STAKE = { stat: 2.5, fame: 15, buffWin: 2.0, buffLose: 1.0 };
  /* Mₑ · Cδₑ — 도전 칸마다 한 벌(스펙 §7-3). 실측 시뮬레이터가 이 식 그대로 잰 값이라
   * 식의 다른 항(리그 기준 · 평소 컨디션 · USUAL_W)을 바꾸면 **다시 재야** 해요. */
  const M = {
    p_gap: 16.5, p_weak: 15.0, p_marked: 10.3, p_reborn: 25.0, p_benchseat: -2.1, p_dropzone: 14.0,
    p_agentfee: 152.8, p_momclip: 7.3, p_booth: 110.7, p_armband: 28.0, p_mateslump: 6.2,
    s_abroad1_learn: 15.0, s_abroad1_persuade: 15.6, s_slot1: 0.6, s_senior1: 5.5, s_race1: 15.0,
  };
  const CD = {
    p_benchseat: 15.3, p_agentfee: 22.1, p_armband: -3.4,
    s_abroad1_learn: -3.4, s_abroad1_persuade: -3.4, s_slot1: 3, s_senior1: -4,
  };

  // ---------- 작은 도구 ----------
  const rng = () => api._rng();
  const CT = () => (window.WingerCareer && WingerCareer._t) || {};
  const isPro = () => !!S && S.phase === "soccer-pro";
  const mainKey = () => POS_INFO[S.pos].stat;
  const statDef = (k) => STAT_DEFS.find((d) => d.key === k) || { key: k, name: k, emoji: "📈" };
  const lgBase = () => raceStr(70, leagueOf(S).prestige);   // 그 리그의 중간 선수를 내 눈금으로
  const stars = (k) => talentStars(S.talents[k]);
  const trustEv = () => (window.WingerSquad ? WingerSquad.trustEvOf() : 0);
  const proLog = (msg) => { if (CT().proLog) CT().proLog(msg); };
  const queueFx = (list) => { if (window.WingerCareer && WingerCareer.queueFx) WingerCareer.queueFx(list); };
  const sign = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v)}`;

  /* 직전 라운드 · MOM · 클래스 승급 · 각성 시도 · mid 블록 수를 기억하는 칸. 없으면 여기서 만들어요. */
  function mem() {
    if (!S.evMem || typeof S.evMem !== "object") {
      S.evMem = { last: null, mom: false, classUp: false, awake: null, n: 0, slotBy: null };
    }
    return S.evMem;
  }

  // ---------- 📋 약속 조건 ----------
  /* 조건마다 판정식과 문구를 **한 줄에** 둬요 — 「최근 10경기 중 N번」과 판정이 같은 식을 읽어야 해요.
   * 문구는 화면(오버레이 · 경기 띠 · 결과 줄)이 전부 condText로 여기서 받아 가요 — 두 벌로 적으면 어긋나요. */
  const COND = {
    "g&T": { text: "골 1 — 그리고 승리", test: (m) => m.g >= 1 && m.res === "W" },
    "p&T": { text: "공격포인트(골·도움) 1 — 그리고 승리", test: (m) => m.g + m.a >= 1 && m.res === "W" },
    "(a|r)&T": { text: "도움 1 또는 평점 7.5 — 그리고 승리", test: (m) => (m.a >= 1 || m.r >= 7.5) && m.res === "W" },
    "ga|d": { text: "팀 실점 1 이하 — 그리고 수비 2", test: (m) => m.ga <= 1 && m.d >= 2 },
    W: { text: "팀 승리", test: (m) => m.res === "W" },
    r75: { text: "평점 7.5 이상", test: (m) => m.r >= 7.5 },
  };
  const condText = (kind) => (COND[kind] ? COND[kind].text : null);
  const posKind = () => ({ fw: "g&T", wg: "p&T", mf: "(a|r)&T", df: "ga|d" }[S.pos] || "g&T");
  const refOf = (kind) => {
    const rec = Array.isArray(S.recent) ? S.recent : [];
    return { hit: rec.filter(COND[kind].test).length, of: rec.length };
  };

  // ---------- 선택지 ----------
  const safe = (label, fx) => ({ k: "safe", label, fx: fx || {} });
  /* 프로 도전 — 50 + 실력(±10) + 컨디션(±15). 조각마다 정수로 반올림한 뒤 더해요(25번 1).
   * usual — 이 블록의 **갱신 전** 평소 컨디션이에요. */
  function tryOpt(pid, label, x, win, lose, usual) {
    const skill = Math.round(clamp(x.v - (M[pid] || 0), -SKILL_CAP, SKILL_CAP)) || 0;
    const cond = Math.round(clamp((S.condition - usual - (CD[pid] || 0)) * COND_K, -COND_CAP, COND_CAP)) || 0;
    return {
      k: "try", label, fx: {}, win, lose,
      pct: clamp(50 + skill + cond, PCT_LO, PCT_HI),
      parts: [
        { label: "기본", v: 50 },
        { label: x.label, v: skill },
        { label: "컨디션", v: cond, usual: Math.round(usual), now: Math.round(S.condition) },
      ],
    };
  }
  /* 유스 도전 — 옛 식의 조각을 각각 정수로 반올림해 더하고 10~90에서 잘라요. fx는 기본 효과(= 확정 효과)예요. */
  function tryYouth(label, parts, win, lose, fx) {
    const ps = parts.map(([l, v]) => ({ label: l, v: Math.round(v) || 0 }));
    return { k: "try", label, fx: fx || {}, win, lose, parts: ps,
      pct: clamp(ps.reduce((a, p) => a + p.v, 0), PCT_LO, PCT_HI) };
  }
  /* 조건 문구는 label에 안 넣어요 — 화면이 cond.kind로 condText를 받아 따로 적어요(두 번 안 보이게) */
  function promOpt(kind, opp) {
    return {
      k: "promise", label: "약속한다",
      cond: { kind }, ref: refOf(kind), opp: opp || null,
      win: { fame: STAKE.fame }, lose: { fame: -STAKE.fame },
    };
  }

  // ---------- 판돈 — 잘리지 않는가 · 적용 ----------
  /* 적용하면 칩과 다른 값이 되는 판돈(성공·실패 둘 중 하나라도)은 잘린 판돈이에요(스펙 §3-8). */
  function fits(fx) {
    if (!fx) return true;
    if (fx.trust) { const v = trustEv() + fx.trust; if (v > TRUST_CAP || v < -TRUST_CAP) return false; }
    if (fx.fame && (S.fandom || 0) + fx.fame < 0) return false;
    if (fx.money && (S.money || 0) + fx.money < 0) return false;
    if (fx.stat) { const v = S.stats[fx.stat.k] + fx.stat.v; if (v > statCap(fx.stat.k) || v < 0) return false; }
    /* 약발이 0이 되면 운영판 weakFoot의 `|| FOOT_MID`가 5로 읽어요 — 1 밑으로는 안 내려가요 */
    if (fx.weak) { if (!S.foot) return false; const v = S.foot.weak + fx.weak; if (v > 10 || v < 1) return false; }
    return true;
  }
  function apply(fx) {
    if (!fx) return;
    if (fx.trust) S.trustEv = { y: S.proYear, v: clamp(trustEv() + fx.trust, -TRUST_CAP, TRUST_CAP) };
    if (fx.fame) S.fandom = Math.max(0, (S.fandom || 0) + fx.fame);
    if (fx.money) S.money = Math.max(0, (S.money || 0) + fx.money);
    if (fx.stat) S.stats[fx.stat.k] = clamp(S.stats[fx.stat.k] + fx.stat.v, 0, statCap(fx.stat.k));
    if (fx.weak && S.foot) S.foot.weak = clamp(S.foot.weak + fx.weak, 1, 10);
    /* 🔥 배수 — **S.buff는 참/거짓 그대로**예요(운영판이 `S.buff ? 1.5 : 1.0`으로 읽어요).
     * ×2.0만 새 칸 S.buffX에 둬요. 운영판은 그 칸을 몰라 1.5로 읽어요 — 덜 주지, 더 주지 않아요. */
    if (fx.buff != null) {
      S.buff = fx.buff > 1;
      if (fx.buff > 1.5) S.buffX = fx.buff; else delete S.buffX;
    }
    if (fx.slotTo && window.WingerSquad) WingerSquad.wantSlot(fx.slotTo);
  }
  // 칩에 보일 효과를 모아요(기본 효과 + 판돈)
  function merge(a, fx) {
    if (!fx) return a;
    for (const k of ["trust", "fame", "money", "weak"]) if (fx[k]) a[k] = (a[k] || 0) + fx[k];
    if (fx.stat) a.stat = a.stat && a.stat.k === fx.stat.k ? { k: fx.stat.k, v: a.stat.v + fx.stat.v } : { k: fx.stat.k, v: fx.stat.v };
    if (fx.buff != null) a.buff = fx.buff;
    if (fx.slotTo) { a.slotTo = fx.slotTo; a.slotFrom = fx.slotFrom; }
    return a;
  }

  // ---------- 칩 ----------
  function chips(fx) {
    const out = [];
    if (!fx) return out;
    if (fx.trust) out.push({ emoji: "🤝", text: `감독 신뢰 ${sign(fx.trust)}`, good: fx.trust > 0 });
    if (fx.fame) out.push({ emoji: "⭐", text: `명성 ${sign(fx.fame)}`, good: fx.fame > 0 });
    if (fx.money) out.push({ emoji: "💰", text: `${fx.money > 0 ? "+" : "−"}${fmtMoney(Math.abs(fx.money))}`, good: fx.money > 0 });
    if (fx.stat) {
      const d = statDef(fx.stat.k);
      out.push({ emoji: d.emoji, text: `${d.name} ${sign(Math.round(fx.stat.v * 10) / 10)}`, good: fx.stat.v > 0 });
    }
    if (fx.weak) out.push({ emoji: "🦶", text: `약발 ${sign(fx.weak)}`, good: fx.weak > 0 });
    if (fx.buff != null) out.push({ emoji: "🔥", text: `다음 훈련 ×${fx.buff.toFixed(1)}`, good: fx.buff > 1 });
    /* 📍 자리 거래 — 받는 결과 내주는 결을 함께 적어요(결이 같으면 안 적어요) */
    if (fx.slotTo && window.WingerSquad) {
      const a = WingerSquad.slotByKey(fx.slotFrom), b = WingerSquad.slotByKey(fx.slotTo);
      out.push({ emoji: "📍", text: `${fx.slotFrom || "-"} → ${fx.slotTo}`, good: null });
      if (a && b) {
        for (const [k, e] of [["g", "⚽"], ["a", "🅰️"], ["d", "🛡️"]]) {
          if (Math.abs(a[k] - b[k]) < 0.005) continue;
          out.push({ emoji: e, text: `×${a[k].toFixed(2)} → ×${b[k].toFixed(2)}`, good: b[k] > a[k] });
        }
      }
    }
    return out;
  }
  const chipsText = (fx) => chips(fx).map((c) => `${c.emoji} ${c.text}`).join(" · ");

  // ---------- 🏟️ 순위표에서 읽는 것 ----------
  const rows = () => (CT().tableRows ? CT().tableRows() : []);
  function roundsLeft(act) {
    const W = CT().WEEKS_PER_CB || 19;
    return act.cb === 1 ? W + (W - act.week) : W - act.week;
  }
  /* 순위표 바로 위 팀(내가 1위면 바로 아래 팀)과 승점 차 3 이내 · 5라운드 이상 남음.
   * ⚠️ 상대를 **미리 뽑지 않아요** — playShow가 경기 직전에 뽑는 순서를 그대로 두고 약속을 그 팀에 걸어요.
   * 블록 시점의 act.opp는 **지난** 경기 상대예요. */
  function neighbor() {
    const act = S.activity;
    if (!act || roundsLeft(act) < NEIGHBOR_LEFT) return null;
    const r = rows();
    const i = r.findIndex((x) => x.name === S.group);
    if (i < 0) return null;
    const t = i > 0 ? r[i - 1] : r[1];
    if (!t) return null;
    const gap = Math.abs(t.pts - r[i].pts);
    return gap <= NEIGHBOR_PTS ? { name: t.name, gap, above: i > 0 } : null;
  }
  // 한 단계 위 리그(tier + 1)의 이적 문턱
  function nextGate() {
    const cur = leagueOf(S);
    const nx = LEAGUES.find((l) => l.tier === cur.tier + 1);
    const need = nx && CT().PROMOTE_HYPE ? CT().PROMOTE_HYPE[nx.id] : null;
    return need == null ? null : { lg: nx, need };
  }
  /* 🏛️ 이 기기 명예의 전당에서 지금 클럽 출신 — 이름은 **받는 길에서 씻어요**(로컬에도 씻기 전 값이 있을 수 있어요).
   * 그리는 쪽(director)은 본문을 평문으로 다뤄 다시 이스케이프해요. */
  function hofMate() {
    try {
      const list = JSON.parse(localStorage.getItem("grow-hof-v1") || "[]");   // 8종이 같이 쓰는 명전 키
      const e = Array.isArray(list) ? list.find((x) => x && x.game === "soccer" && x.team === S.group) : null;
      const name = e && CT().cleanWord ? CT().cleanWord(e.name).slice(0, 20) : "";
      return name || null;
    } catch { return null; }
  }
  const slumpMate = () => ((S.squads && S.squads[S.group]) || []).find((x) => !x.me && (x.form || 0) < 0) || null;
  const markedBy = () => activeBuffs(S).find((b) => b.id === "boot" || b.id === "maker" || b.id === "point") || null;
  const lastMove = () => { const mv = Array.isArray(S.moves) ? S.moves : []; return mv[mv.length - 1] || null; };

  // ---------- 프로 이벤트 17종 (스펙 §3-5 — 제목·선택지 이름은 표 그대로) ----------
  /* cat — 도감 탭: slot 📍 자리와 감독 · body 🦶 몸과 기술 · voice 📰 바깥의 목소리 · promise 🏟️ 경기 앞 약속 · money 💼 돈과 계약
   * make(usual) → { body, opts } — body는 **평문**이에요(태그 없음). */
  const TR = STAKE.trust;
  const EVENTS = [
    { id: "p_gap", cat: "slot", emoji: "📍", name: "빈자리 하나", at: ["mid"],
      elig: () => mem().last === "played",
      make: (u) => ({
        body: "격자에서 옆 자리가 비었어요. 감독이 그 자리에 세울 사람을 찾고 있어요.",
        opts: [safe("제 자리를 지킨다"),
          tryOpt("p_gap", "그 자리에 서 본다", { label: statDef(mainKey()).name, v: 0.6 * (S.stats[mainKey()] - lgBase()) },
            { trust: TR }, { trust: -TR }, u)],
      }) },
    { id: "p_weak", cat: "body", emoji: "🦶", name: "반대발 주간", at: ["mid"],
      elig: () => !!S.foot && S.foot.weak >= 2 && S.foot.weak <= 9,
      make: (u) => ({
        body: "코치가 한 주 동안 반대발만 쓰는 과제를 내밀어요.",
        opts: [safe("넘긴다"),
          tryOpt("p_weak", "한 주 약발로만", { label: "약발", v: 2.5 * S.foot.weak }, { weak: STAKE.weak }, { weak: -STAKE.weak }, u)],
      }) },
    { id: "p_classup", cat: "promise", emoji: "🏷️", name: "급이 바뀐 첫 주", at: ["mid"], promise: true,
      elig: (c) => !!c.classUp,
      make: () => ({
        body: `새 클래스 — ${titleAt(S.titleIdx)}. 올라선 첫 주라 모두가 다음 경기를 지켜봐요.`,
        opts: [safe("넘긴다"), promOpt(posKind())],
      }) },
    { id: "p_marked", cat: "body", emoji: "🎖️", name: "칭호의 무게", at: ["pre", "h2"],
      elig: () => !!markedBy(),
      make: (u) => {
        const k = mainKey();
        return {
          body: `지난 시즌 ${markedBy().name} — 이번 시즌엔 상대가 수비를 둘씩 붙여요.`,
          opts: [safe("동료를 살린다"),
            tryOpt("p_marked", "그래도 뚫는다", { label: "종합", v: 0.8 * (overall() - lgBase()) },
              { stat: { k, v: STAKE.stat } }, { stat: { k, v: -STAKE.stat } }, u)],
        };
      } },
    { id: "p_reborn", cat: "body", emoji: "🔮", name: "다시 만드는 몸", at: ["mid"],
      /* 각성·초월을 **시도한** 뒤 mid 블록 3개 안 — 성공·실패 모두(어느 쪽이든 그 능력치가 다시 깎여요).
       * ⚠️ S.awakenAt === S.stages는 쓰지 않아요 — 프로에선 한 번 각성하면 영영 참이에요. */
      elig: () => { const a = mem().awake; return !!a && S.stats[a.key] != null && mem().n - a.n <= 3; },
      make: (u) => {
        const k = mem().awake.key, d = statDef(k);
        return {
          body: `각성 뒤로 ${d.name} 수치를 다시 쌓는 중이에요. 코치가 실전으로 바로 부딪혀 보자고 해요.`,
          opts: [safe("넘긴다"),
            tryOpt("p_reborn", "바로 실전 감각", { label: `${d.name} 재능`, v: 5 * stars(k) },
              { stat: { k, v: STAKE.stat } }, { stat: { k, v: -STAKE.stat } }, u)],
        };
      } },
    { id: "p_benchseat", cat: "slot", emoji: "🪑", name: "벤치에서 본 것", at: ["mid"],
      elig: () => mem().last === "bench",
      make: (u) => ({
        body: "지난 경기를 벤치에서 지켜봤어요. 밖에서 보니 보이는 게 있었어요.",
        opts: [safe("넘긴다"),
          tryOpt("p_benchseat", "감독에게 말한다", { label: "패스·수비", v: 0.6 * ((S.stats.pass + S.stats.defense) / 2 - lgBase()) },
            { trust: TR }, { trust: -TR }, u)],
      }) },
    { id: "p_titlerace", cat: "promise", emoji: "🔺", name: "한 경기의 무게", at: ["mid"], promise: true,
      elig: () => {
        const a = S.activity;
        if (!a || a.cb !== 2 || a.week < 12) return false;
        const r = rows(), me = r.find((x) => x.name === S.group);
        return !!me && r[0].pts - me.pts <= 3;
      },
      make: () => {
        const r = rows(), me = r.find((x) => x.name === S.group);
        return {
          body: r[0] === me ? "선두예요. 남은 경기 하나하나가 우승을 정해요."
            : `선두와 승점 ${r[0].pts - me.pts} 차이 — 한 경기가 순위를 바꿔요.`,
          opts: [safe("넘긴다"), promOpt("W")],
        };
      } },
    { id: "p_dropzone", cat: "slot", emoji: "🔻", name: "강등권의 라커룸", at: ["mid"],
      elig: () => {
        const a = S.activity, r = rows();
        if (!a || a.cb !== 2 || a.week < 6 || r.length < 2) return false;
        const i = r.findIndex((x) => x.name === S.group);
        return i >= r.length - 2;
      },
      make: (u) => ({
        body: "순위표 맨 아래가 가까워요. 라커룸 공기가 무거워요.",
        opts: [safe("넘긴다"),
          tryOpt("p_dropzone", "먼저 말을 꺼낸다", { label: "프로 경력", v: 2 * (S.proYear || 1) }, { trust: TR }, { trust: -TR }, u)],
      }) },
    { id: "p_rumor", cat: "voice", emoji: "📰", name: "한 칸 위의 문턱", at: ["pre", "h2"], promise: true,
      elig: () => {
        const g = nextGate();
        if (!g || !CT().lastHype) return false;
        const h = CT().lastHype(S);
        return h >= g.need - 0.4 && h < g.need;
      },
      make: () => {
        const g = nextGate();
        return {
          body: `이적 문턱 표에 ${g.lg.flag} ${g.lg.name} ${g.need}. 지난 시즌 평가는 ${CT().lastHype(S).toFixed(1)} — 한 뼘 모자라요. 기자들이 다음 경기를 보고 쓰겠대요.`,
          opts: [safe("넘긴다"), promOpt("r75")],
        };
      } },
    { id: "p_agentfee", cat: "money", emoji: "💼", name: "수수료", at: ["pre"],
      elig: () => { const m = lastMove(); return !!m && m.y === S.proYear - 1 && m.fee > 0; },
      make: (u) => {
        const fee = lastMove().fee, p = Math.round(fee * 0.1);
        return {
          body: `에이전트가 지난 이적 계약금 ${fmtMoney(fee)}에서 수수료를 더 달래요.`,
          opts: [safe("원래 계약대로"),
            tryOpt("p_agentfee", "직접 담판", { label: "명성", v: (S.fandom || 0) / 40 }, { money: p }, { money: -p }, u)],
        };
      } },
    { id: "p_momclip", cat: "voice", emoji: "🎬", name: "MOM 다음 날", at: ["mid"],
      elig: () => mem().last === "played" && !!mem().mom,
      make: (u) => ({
        body: "어제 MOM 장면이 퍼지고 있어요. 방송국에서 인터뷰를 청해요.",
        opts: [safe("넘긴다"),
          tryOpt("p_momclip", "방송 인터뷰", { label: "종합", v: 0.6 * (overall() - lgBase()) },
            { fame: STAKE.fame }, { fame: -STAKE.fame }, u)],
      }) },
    { id: "p_neighbor", cat: "promise", emoji: "🏟️", name: "바로 위 팀", at: ["mid"], promise: true,
      elig: () => !!neighbor(),
      make: () => {
        const t = neighbor();
        return {
          body: `순위표 바로 ${t.above ? "위" : "아래"} ${t.name} — 승점 ${t.gap} 차이예요. 그 팀과 만나는 날이 와요.`,
          opts: [safe("넘긴다"), promOpt(posKind(), t.name)],
        };
      } },
    { id: "p_legacy", cat: "promise", emoji: "🧬", name: "선대의 이름", at: ["pre"], promise: true,
      elig: () => (S.proYear || 0) <= 3 && (loadLegacy().gen || 0) >= 2,
      make: () => ({
        body: `${(loadLegacy().gen || 0) + 1}세 — 사람들이 내 이름보다 선대의 이름을 먼저 불러요.`,
        opts: [safe("넘긴다"), promOpt(posKind())],
      }) },
    { id: "p_hofwall", cat: "promise", emoji: "🏛️", name: "라커룸 벽의 사진", at: ["pre"], promise: true,
      elig: () => !!hofMate(),
      make: () => ({
        body: `라커룸 벽에 명예의 전당 ${hofMate()}의 사진이 걸려 있어요.`,
        opts: [safe("넘긴다"), promOpt(posKind())],
      }) },
    { id: "p_booth", cat: "money", emoji: "🎙️", name: "중계석 초대", at: ["pre", "h2"],
      elig: () => (S.fandom || 0) >= 800,
      make: (u) => {
        const p = 4 * Math.round(30 * titlePayMul(titleIdx(overall())) * traitMul(S, "money"));   // 수당 4경기치
        return {
          body: "경기 없는 주말, 생방송 해설 게스트로 불러요. 잘하면 출연료, 방송 사고가 나면 벌금이에요.",
          opts: [safe("사양한다"),
            tryOpt("p_booth", "마이크를 잡는다", { label: "명성", v: (S.fandom || 0) / 40 }, { money: p }, { money: -p }, u)],
        };
      } },
    { id: "p_armband", cat: "slot", emoji: "🎗️", name: "오늘의 완장", at: ["pre"],
      /* S.center(주장)는 **안 바꿔요** — 하루 완장은 신뢰만 움직여요 */
      elig: () => !S.center && !!CT().seasonsAtClub && CT().seasonsAtClub(S, S.group) >= 3,
      make: (u) => ({
        body: "오늘 주장이 빠져요. 감독이 하루 완장을 맡길 사람을 찾아요.",
        opts: [safe("넘긴다"),
          tryOpt("p_armband", "완장을 찬다", { label: "클럽 경력", v: 4 * CT().seasonsAtClub(S, S.group) }, { trust: TR }, { trust: -TR }, u)],
      }) },
    { id: "p_mateslump", cat: "slot", emoji: "🤝", name: "동료의 부진", at: ["mid"],
      elig: () => !!slumpMate(),
      make: (u) => ({
        body: `동료 ${slumpMate().name} — 요즘 부진해요. 훈련이 끝나도 혼자 남아 있어요.`,
        opts: [safe("넘긴다"),
          tryOpt("p_mateslump", "같이 남는다", { label: "패스", v: 0.5 * (S.stats.pass - lgBase()) }, { trust: TR }, { trust: -TR }, u)],
      }) },
  ];
  const YOUTH_LIST = [
    { id: "y_coach", emoji: "🧑‍🏫", name: "코치의 숙제" },
    { id: "y_clip", emoji: "📱", name: "연습 경기 하이라이트" },
    { id: "y_rival", emoji: "🔥", name: "또래의 골 영상" },
    { id: "y_blooper", emoji: "📉", name: "실수 장면이 돌아요" },
  ];
  const LIST = YOUTH_LIST.map((e) => ({ ...e, cat: "youth", youth: true }))
    .concat(EVENTS.map(({ id, name, emoji, cat }) => ({ id, name, emoji, cat, youth: false })));
  const emojiOf = (id) => (LIST.find((e) => e.id === id) || {}).emoji || "🎲";

  // ---------- 띄우기 ----------
  /* 떠 있는 이벤트를 만들어요. u는 **뜰 때 한 번** 굴려 얼려요 — 도전이 둘이면 같은 u를 써요. */
  function present(def) {
    const act = S.activity;
    S.ev = {
      id: def.id, sid: def.sid || null, ch: def.ch || null,
      at: { y: S.proYear, cb: act ? act.cb : null, wk: act ? act.week : null },
      u: rng(), title: def.title, body: def.body, opts: def.opts,
    };
    return S.ev;
  }

  /* ---------- 블록 — renderPrep 한 곳에서만 굴려요(스펙 §3-3) ----------
   * 경기 뒤 다음 화면을 여는 갈래가 다섯이 넘어요. 갈래마다 심으면 반드시 하나가 새니,
   * 준비 화면이 그려질 때 **지금이 어느 블록인지**를 보고 처음이면 한 번만 굴려요. */
  function blockOf() {
    const act = S.activity;
    if (!act) return [null, null];
    /* pre는 **준비 3턴을 마친 첫 경기 직전 화면**이에요. 시즌 첫 화면은 컨디션이 80으로 고정이라 안 써요. */
    if (act.cb === 1 && act.week === 0) return ["pre", `${S.proYear}:pre`];
    if (act.cb === 2 && act.week === 0) return ["h2", `${S.proYear}:h2`];
    /* mid — 라운드 뒤 첫 준비 화면(S.camp 2). 전반기 끝 휴식기 둘째 화면에서도 한 번 맞아요({y}:1:19) —
     * 실측 시뮬레이터가 이대로 쟀어요. */
    if (act.week >= 1 && S.camp === 2) return ["mid", `${S.proYear}:${act.cb}:${act.week}`];
    return [null, null];
  }
  function block() {
    if (!isPro() || S.wc || S.cupPrep || S.cupReady || S.cup) return;
    // 초대장이 먼저예요 — 두 모달을 겹치지 않아요(초대장을 닫으면 renderPrep이 다시 불려요)
    if (S.ev || document.querySelector(".wc-overlay")) return;
    const [kind, key] = blockOf();
    if (!kind || S.evSlot === key) return;
    S.evSlot = key;
    /* 평소 컨디션 — 이 블록의 조각은 **갱신 전** 값으로 재고, 굴렸든 안 굴렸든 한 번 따라가요 */
    const usual = typeof S.condUsual === "number" ? S.condUsual : S.condition;
    S.condUsual = usual + (S.condition - usual) * USUAL_W;
    if (!S.evSeason || S.evSeason.y !== S.proYear) S.evSeason = { y: S.proYear, n: 0, ids: [] };
    const m = mem();
    const classUp = m.classUp;
    if (kind === "mid") { m.n += 1; m.classUp = false; }
    roll(kind, key, usual, classUp);
    save();
  }
  function roll(kind, key, usual, classUp) {
    const season = S.evSeason;
    if (season.n >= SEASON_CAP) return;
    const story = window.WingerStory;
    // 이야기 장이 이 블록 차례면 그 장이 먼저예요 — 한 블록에 한 장
    if (story && story.chapter(kind, key, usual)) { season.n += 1; return; }
    /* 🔢 번호가 없는 세이브(옛 세이브 · 데뷔 때 고르기 전에 닫은 세이브)는 pre에서 한 번 물어요 —
     * **그 블록의 무작위 이벤트 대신**(굴림 없이 · 시즌 상한에 안 세요). 이야기 장이 이 pre를 차지했으면 위에서 끝나
     * 다음 pre로 미뤄져요(모달이 둘 겹치지 않게). */
    if (kind === "pre" && !S.no && window.WingerScenes && WingerScenes.numberPicker) { askNo = true; return; }
    // 장 자리를 먼저 잡아요 — 열린 이야기의 이번 시즌 남은 장만큼 비워 둬요
    if (season.n + (story ? story.left() : 0) >= SEASON_CAP) return;
    if (rng() >= SLOT_P[kind]) return;
    const busy = !!(S.promise && S.promise.y === S.proYear);   // 약속은 한 번에 하나
    const cands = [];
    for (const d of EVENTS) {
      if (!d.at.includes(kind) || season.ids.includes(d.id)) continue;
      if (d.promise && busy) continue;
      if (!d.elig({ classUp })) continue;
      const made = d.make(usual);
      if (made.opts.some((o) => o.k !== "safe" && (!fits(o.win) || !fits(o.lose)))) continue;
      cands.push({ d, made });
    }
    if (!cands.length) return;
    const seen = S.evSeen || {};
    const wts = cands.map((c) => 1 / (1 + (seen[c.d.id] || 0)));   // 자주 본 이벤트일수록 덜 나와요
    let r = rng() * wts.reduce((a, b) => a + b, 0), pk = cands[cands.length - 1];
    for (let i = 0; i < cands.length; i++) { r -= wts[i]; if (r < 0) { pk = cands[i]; break; } }
    season.ids.push(pk.d.id);
    season.n += 1;
    present({ id: pk.d.id, title: pk.d.name, body: pk.made.body, opts: pk.made.opts });
  }

  /* 떠 있는 이벤트를 그려요 — 준비 화면·유스 화면 끝에서 불러요. 오버레이는 화면을 대신하지 않아요.
   * 겹침(같은 이벤트 두 번 · 다른 모달이 떠 있을 때 기다리기)은 그리는 쪽(scenes.js)이 맡아요.
   * 🔢 등번호 — 데뷔 뒤 **첫 준비 화면**(1시즌 · 준비 3턴 전)이거나, 이 블록이 번호를 묻기로 했으면 고르기를 열어요. */
  let askNo = false;
  function draw() {
    const SC = window.WingerScenes;
    if (!S || !SC) return;
    if (S.ev) { if (SC.eventOverlay) SC.eventOverlay(); return; }
    const debut = isPro() && S.proYear === 1 && !S.activity && S.camp === 3 && !((S.career && S.career.years) || []).length;
    if ((askNo || debut) && !S.no && SC.numberPicker) SC.numberPicker();
    askNo = false;
  }

  // ---------- 🎓 유스 네 칸 — 옛 칸을 묻는 모양으로(스펙 §3-4) ----------
  /* i — 옛 maybeEvent가 뽑은 칸 번호(0 개인지도 · 1 하이라이트 · 4 라이벌 · 6 실수 짤).
   * 칸 뽑기는 옛 pick과 같은 난수 한 번이고(game.js), 🧑‍🏫 능력치 뽑기도 **옛 코드와 같은 순서로 게임 난수**를 써요.
   * 판정 u만 이벤트 난수예요. 흐름 줄 셋(2 · 3 · 5)은 옛 한 줄 그대로라 false를 돌려줘요. */
  function youth(i, m) {
    if (![0, 1, 4, 6].includes(i)) return false;
    const ovr = overall();
    const YS = YOUTH_STAKE;
    let id, body, opts;
    if (i === 0) {
      const d = pick(STAT_DEFS);
      const base = { stat: { k: d.key, v: 3 } };
      id = "y_coach";
      body = `코치가 「${d.name}」 숙제를 내줬어요.`;
      opts = [safe("받아들인다", base),
        tryYouth("두 배로 한다", [["기본", 48], ["컨디션", (S.condition - 50) * 0.5], ["체력", (S.stats.stamina - 35) * 0.6]],
          { stat: { k: d.key, v: YS.stat } }, { stat: { k: d.key, v: -YS.stat } }, base)];
    } else if (i === 1) {
      const base = { fame: Math.round(8 * m.spot) };
      id = "y_clip";
      body = "연습 경기 하이라이트가 화제예요.";
      opts = [safe("그대로 둔다", base),
        tryYouth("인터뷰까지 한다", [["기본", 51], ["종합", (ovr - 45) * 0.8], ["명성", Math.min((S.fandom || 0) / 20, 15)]],
          { fame: YS.fame }, { fame: -YS.fame }, base)];
    } else if (i === 4) {
      const main = statDef(mainKey());
      id = "y_rival";
      body = `같은 나이 ${POS_INFO[S.pos].name}의 골 영상이 돌아요.`;
      /* 🔥은 기본 효과 없이 배수를 바로 정해요 */
      opts = [safe("자극받는다", { buff: 1.5 }),
        tryYouth("그 팀 연습경기를 찾아간다", [["기본", 45], [main.name, (S.stats[main.key] - 40) * 0.5]],
          { buff: YS.buffWin }, { buff: YS.buffLose })];
    } else {
      const base = { fame: -10 };
      id = "y_blooper";
      body = "경기 실수 장면이 짤로 돌아요…";
      opts = [safe("그냥 둔다", base),
        tryYouth("해명 영상을 올린다", [["기본", 50], ["명성", Math.min((S.fandom || 0) / 25, 15)], ["종합", (ovr - 45) * 0.5]],
          { fame: YS.fame }, { fame: -YS.fame }, base)];
    }
    const title = YOUTH_LIST.find((e) => e.id === id).name;
    S.ev = { id, sid: null, ch: null, at: { yr: S.year, mo: S.month }, u: rng(), title, body, opts };
    return true;
  }
  /* 확정을 고르면 **옛 한 줄과 같은 글자**를 남겨요 — 늘 안전 == 현행이 로그까지 같게 */
  const YOUTH_SAFE_LOG = {
    y_coach: (fx) => `🧑‍🏫 감독님의 특별 개인지도! ${statDef(fx.stat.k).name} +3`,
    y_clip: (fx) => `📱 연습 경기 하이라이트가 화제! 명성 +${fx.fame}`,
    y_rival: () => "🔥 라이벌의 활약에 승부욕이 불타올라요! 다음 훈련 효율 1.5배",
    y_blooper: () => "📉 경기 실수 장면이 짤로 돌아요… 명성 -10",
  };
  /* 유스 로그는 **뜬 달**로 적어요. 답하는 사이 달이 넘어가도(advanceMonth) 옛 코드와 같은 자리·같은 달이에요.
   * (game.js addLog와 같은 모양이에요) */
  function youthLog(at, msg) {
    S.log = Array.isArray(S.log) ? S.log : [];
    S.log.unshift(`[${at.yr}년차 ${at.mo}월] ${msg}`);
    S.log = S.log.slice(0, 40);
  }

  // ---------- 답하기 ----------
  function answer(i) {
    const ev = S && S.ev;
    const o = ev && Array.isArray(ev.opts) ? ev.opts[i] : null;
    if (!o) return null;
    const pro = ev.at && ev.at.y != null;
    S.ev = null;
    if (!Array.isArray(S.evLog)) S.evLog = [];
    if (!S.evSeen || typeof S.evSeen !== "object") S.evSeen = {};
    const log = { id: ev.id, y: pro ? ev.at.y : 0, k: o.k, pct: o.k === "try" ? o.pct : null, ok: null };
    const tries = ev.opts.filter((x) => x.k === "try");
    /* 도전을 안 골랐으면 그때 내놓은 도전 칸의 **최고 %**를 남겨요(🧮 성향이 읽어요) */
    if (o.k !== "try" && tries.length) log.alt = Math.max(...tries.map((x) => x.pct));
    if (o.k === "promise") { log.ref = [o.ref.hit, o.ref.of]; if (o.opp) log.opp = 1; }
    S.evLog.push(log);
    S.evSeen[ev.id] = (S.evSeen[ev.id] || 0) + 1;

    // 기본 효과 먼저, 그다음 판돈 — 단계마다 상한·바닥으로 잘라요
    const applied = merge({}, o.fx);
    apply(o.fx);
    let ok = null;
    if (o.k === "try") {
      ok = ev.u * 100 < o.pct;
      log.ok = ok;
      const st = ok ? o.win : o.lose;
      merge(applied, st);
      apply(st);
    } else if (o.k === "promise") {
      S.promise = { id: ev.id, cond: { kind: o.cond.kind }, win: o.win, lose: o.lose, y: S.proYear, opp: o.opp || null };
    }
    if (ev.sid && window.WingerStory) WingerStory.answered(ev, o, ok);
    if (window.WingerBook) WingerBook.mark("ev", ev.id);

    /* 결과 한 줄 — 칩(applied)은 화면이 따로 그려서 여기엔 안 넣어요. 로그에는 칩까지 한 줄로 남겨요 */
    const fxText = chipsText(applied);
    const line = o.k === "try" ? (ok ? "도전이 통했어요" : "이번엔 뜻대로 안 됐어요")
      : o.k === "promise" ? `${o.opp ? `${o.opp}전` : "다음 출전 경기"}에서 정해져요`
      : fxText ? "" : "아무 일 없이 지나가요";
    const logLine = [o.k === "try" ? `${ok ? "성공" : "실패"}(성공 ${o.pct}%)` : "", line, fxText].filter(Boolean).join(" · ");
    if (pro) {
      proLog(`${ev.sid ? "📖" : emojiOf(ev.id)} ${ev.title} — ${o.label} · ${logLine}`);
    } else {
      youthLog(ev.at, o.k === "safe" && YOUTH_SAFE_LOG[ev.id] ? YOUTH_SAFE_LOG[ev.id](o.fx) : `${emojiOf(ev.id)} ${ev.title} — ${o.label} · ${logLine}`);
    }
    if (o.k === "try") queueFx([["flash", `${ok ? "✨" : "💧"} ${ev.title} — ${ok ? "성공" : "실패"}`]]);
    save();
    // 밑 화면을 다시 그려요 — 효과가 능력치·명성·선발 확률에 바로 보여야 해요
    if (pro) { if (window.WingerCareer && WingerCareer.refreshPro) WingerCareer.refreshPro(); }
    else if (typeof renderMain === "function") renderMain();
    return { ok, applied, line };
  }

  // ---------- 📋 약속의 판정 · 만료 ----------
  function promiseLog(p, st) {
    const list = Array.isArray(st.evLog) ? st.evLog : [];
    for (let i = list.length - 1; i >= 0; i--) {
      const l = list[i];
      if (l && l.id === p.id && l.k === "promise" && l.y === p.y && l.ok == null && !l.voided && !l.expired) return l;
    }
    return null;
  }
  /* 없던 일 — 효과 0 · 그 로그 줄은 ok: null에 까닭(voided | expired)을 남겨요 */
  function endPromise(why, st = S) {
    const p = st.promise;
    if (!p) return;
    const l = promiseLog(p, st);
    if (l) { l.ok = null; l[why] = true; }
    st.promise = null;
  }

  /* 리그 경기 한 판이 끝났어요(proMatchFinalize — 평점을 더한 바로 뒤).
   * r — 그 경기 표시 평점. **화면에 적힌 한 자리 숫자 그대로** 남겨요 — 7.46이 「7.5」로 보이는데
   * 약속 「평점 7.5」가 실패하면 보이는 숫자와 판정이 어긋나요.
   * 돌려주는 것 — 약속 판정 한 줄(없으면 "") — 결과 화면에 그대로 붙여요(평문). */
  function league(info, r, won) {
    if (!isPro()) return "";
    const row = { g: info.myGoals, a: info.assists, d: info.defense, ga: info.oppGoals, res: info.res, r: Number(r.toFixed(1)) };
    S.recent = (Array.isArray(S.recent) ? S.recent : []).concat([row]).slice(-10);
    const m = mem();
    m.last = "played";
    m.mom = !!won;
    let note = "";
    const p = S.promise;
    if (p && p.y !== S.proYear) endPromise("expired");
    else if (p && !COND[p.cond && p.cond.kind]) endPromise("voided");   // 모르는 조건은 판정하지 않아요(덜 주지, 더 뺏지 않아요)
    else if (p && (!p.opp || p.opp === info.away)) {
      // 상대가 정해진 약속은 그 팀과의 경기에서만 — 다른 팀 경기면 그대로 남아요
      const ok = COND[p.cond.kind].test(row);
      const l = promiseLog(p, S);
      if (l) l.ok = ok;
      S.promise = null;
      apply(ok ? p.win : p.lose);
      if (/^s_/.test(p.id) && window.WingerStory) WingerStory.judged(p.id, ok);
      note = `📋 약속 「${COND[p.cond.kind].text}」 — ${ok ? "지켰어요!" : "못 지켰어요"} · ${chipsText(ok ? p.win : p.lose)}`;
      proLog(note);
    }
    if (window.WingerStory) WingerStory.tally("played");
    return note;
  }
  /* 벤치 주 — 약속은 판정하지 않고 다음 출전 경기로 넘겨요(벌이 아니에요) */
  function bench() {
    if (!isPro()) return;
    const m = mem();
    m.last = "bench";
    m.mom = false;
    if (window.WingerStory) WingerStory.tally("bench");
  }
  // 각성·초월을 **시도했어요**(성공·실패 모두) — 프로에서만
  function awake(key) {
    if (!isPro()) return;
    mem().awake = { key, y: S.proYear, n: mem().n };
  }
  /* 시즌 결산(finishYear 끝) — 걸린 약속은 없던 일, 이야기는 결말로 */
  function yearEnd() {
    if (!isPro()) return;
    if (S.promise) endPromise("expired");
    if (window.WingerStory) WingerStory.yearEnd();
  }
  /* 경기 화면 띠 — 이번 상대에게 판정될 약속이 있을 때만 한 줄 */
  function promiseLine(opp) {
    const p = S && S.promise;
    if (!p || p.y !== S.proYear || !COND[p.cond && p.cond.kind]) return null;
    if (p.opp && p.opp !== opp) return null;
    return `📋 약속: ${COND[p.cond.kind].text}`;
  }

  /* ---------- 운영판이 낀 세이브 정리(스펙 §6-1) ----------
   * 베타는 저장할 때마다 S.betaAt = S.savedAt을 적어요. 둘이 다르면 **베타가 모르는 저장**이 끼었다는 뜻이에요.
   * 원칙: 덜 주지, 더 주지 않는다 · 보이는 숫자가 거짓이 되지 않는다.
   *   떠 있는 이벤트 · 걸린 약속 · 「최근 10경기」 · 평소 컨디션 · 🔥 ×2.0 → 없애요
   *   쌓이는 기록(evLog · evSeen · 업적 · 장부)은 그대로 둬요
   * 무언가 정리했으면 true — 부르는 쪽(resumeSlot)이 바로 저장해서 두 번 정리하지 않게 해요. */
  function onLoad(st) {
    if (!st || st.betaAt === st.savedAt) return false;
    let dirty = false;
    if (st.ev) { st.ev = null; dirty = true; }
    if (st.promise) { endPromise("voided", st); dirty = true; }
    if (Array.isArray(st.recent) && st.recent.length) { st.recent = []; dirty = true; }
    if (st.condUsual != null) { delete st.condUsual; dirty = true; }
    if (st.buffX != null) { delete st.buffX; dirty = true; }
    if (window.WingerStory && WingerStory.onLoad(st)) dirty = true;
    return dirty;
  }

  // ---------- 판정 규칙 쪽(도감 📐 — 스펙 §3-9 최종 문구) ----------
  const RULES = [
    "성공 확률은 화면에 적힌 숫자 그대로예요. 이벤트가 뜰 때 0~99 중 숫자 하나를 뽑아 두고, 도전을 고르면 그 숫자가 적힌 확률보다 작을 때 성공해요. 숨은 보정은 없어요.",
    "확률은 적힌 조각을 더한 값이에요. 프로에서는 기본 50에 실력(±10까지)과 컨디션(±15까지)을 더해요 — 아무리 강해도 확실한 도전은 없어요. 컨디션 조각은 평소보다 생생한지·지쳤는지를 봐요 — 늘 쉬는 선수도, 꾸준히 훈련하는 선수도 좋은 날과 나쁜 날을 똑같이 만나요.",
    "도전은 \"받는 것 + 판돈\"이에요. 판돈은 늘 한 가지라 얻는 것과 잃는 것이 같은 크기예요 — 성공 확률이 50%를 넘으면 걸 만해요.",
    "📋 약속은 확률이 아니라 다음 경기가 정해요. 적힌 숫자는 \"최근 경기에서 이만큼 해냈다\"는 기록이에요. 상대가 정해진 약속은 그 팀과 만나는 경기에서 정해요. 벤치면 다음 출전 경기로 넘어가고, 시즌이 끝나면 없던 일이 돼요.",
    "같은 이벤트는 한 시즌에 한 번까지예요. 자주 본 이벤트일수록 덜 나와요.",
    "월드컵·컵 대회 중에는 이벤트가 뜨지 않아요.",
  ];
  const rules = () => RULES.slice();

  const api = {
    LIST,
    pending: () => (S && S.ev) || null,
    answer, chips, rules, promiseLine, onLoad,
    condText,            // 📋 약속 조건의 우리 말(cond.kind → 문구) — 화면이 따로 적지 않게
    _rng: Math.random,   // 검사용 틈 — 이벤트 난수. 게임 코드는 이걸 바꾸지 않아요
    // ---- 훅 — career.js · game.js · story.js가 불러요(화면은 안 읽어요) ----
    block, draw, youth, league, bench, awake, yearEnd, mem,
    kit: { present, tryOpt, promOpt, posKind, fits, safe, endPromise, rng, mem, lgBase, stars, mainKey, statDef, STAKE, chipsText },
  };
  return api;
})();
