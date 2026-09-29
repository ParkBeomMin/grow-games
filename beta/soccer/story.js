/* 📖 이야기 4편 — 🌍 낯선 땅 · 📍 자리 전쟁 · 🕯️ 선배의 마지막 시즌 · 🔥 한 끗 레이스.
 *
 * 설계: docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md §4
 *
 * ── 지키는 것 ──
 *  · 장은 **블록 자리에서만** 떠요 — 무작위 이벤트보다 먼저, 한 블록에 한 장. 확인 순서 🌍 → 📍 → 🕯️ → 🔥
 *    (먼저 맞는 한 편의 장만 뜨고 그 블록은 끝나요). 굴림은 events.js의 블록 한 곳이 불러요.
 *  · 결말은 **그동안의 선택·판정·실제 기록**에서 규칙으로 — 숨은 굴림이 없고, 규칙표는 빈칸이 없어요
 *    (위에서부터 첫 번째 줄이 결말이에요 — 마지막 줄이 나머지를 받아요).
 *  · 동시에 열린 이야기는 최대 2편 · 📍·🔥은 여는 블록에서 「뜬 수 + 남은 장 + 2 ≤ 5」일 때만 열어요(장 자리를 먼저 잡아요).
 *  · 1장의 「참음」과 「걸었다가 실패」는 다른 결말이에요.
 *  · 은퇴·환생·운영판 정리 때 열린 이야기는 흐지부지(방어)로 닫아요. 🔥은 흐지부지 결말이 없어서 **결말 없이 없애요**
 *    (치르지도 않은 레이스를 도감·업적에 넣지 않아요 — 25번 1).
 *
 * 세이브 S.story = { on: { [sid]: { ch, y0, f, openKey? } }, done: [{ sid, end, y, name, who? }], seen: { "abroad:{나라}": 1 }, raceY }
 *   f(내부 — 화면은 안 읽어요): 🌍 { country, pick, ok, p2 } · 📍 { rival, me, him, rounds, cb, ch1Week, p2 }
 *                               🕯️ { name, pick, ok, p2 } · 🔥 { key, top, club, gap0, finRank, finGap, p2 }
 *
 * game.js · career.js · events.js 뒤에 로드해야 해요(WingerEvents.kit을 써요). */
"use strict";

window.WingerStory = (() => {
  // ---------- 확정 계수 (스펙 §7-2) ----------
  const STORY_MAX = 2;
  const SEASON_CAP = 5;
  const ABROAD_LOW = 6.45;                         // 🌍 그 시즌 리그 평균 평점이 이 아래면 「창밖의 계절」
  const SLOT_ODDS = 0.5, SLOT_RANGE = 5, SLOT_CH2 = 5, SLOT_WIN = 10, SLOT_TAKEN = 3;
  const RACE_OPEN_WEEK = 10, RACE_LAST_WEEK = 17;  // 🔥 후반기 week 10~17(시즌 마지막 mid 블록 18에서는 안 열어요)
  const RACE_GAP_MIN = 0.10, RACE_GAP = 0.15;
  const SENIOR_AGE = 35;                           // 이번 시즌 끝에 은퇴(RETIRE_AGE 36)

  const COUNTRY = {
    kr: { name: "한국", scene: "🇰🇷 회복 루틴 — 훈련보다 회복을 먼저 챙기는 팀이에요. 얼음물·마사지·잠까지 시간표가 있어요." },
    jp: { name: "일본", scene: "🇯🇵 시스템 훈련 — 훈련 시간표가 분 단위로 짜여 있어요. 모두가 같은 동작을 백 번씩 되풀이해요." },
    br: { name: "브라질", scene: "🇧🇷 길거리 풋살 — 훈련이 끝나면 동료들이 풋살장으로 몰려가요. 발끝 기술로 말을 걸어요." },
    it: { name: "이탈리아", scene: "🇮🇹 수비 미팅 — 경기 영상을 멈춰 가며 수비 위치를 하나하나 짚는 미팅이 길어요." },
    en: { name: "잉글랜드", scene: "🇬🇧 돈이 도는 라커룸 — 계약금과 스폰서 얘기가 오가요. 실력보다 이름값을 먼저 봐요." },
  };

  /* 결말 이름 — id는 출하 뒤 안 바꿔요(도감 장부 · 업적이 가리켜요). 🌍 learned의 「그 나라」는 닫을 때 나라 이름으로 채워요 */
  const LIST = [
    { sid: "abroad", emoji: "🌍", name: "낯선 땅", ends: [
      { id: "window", name: "창밖의 계절" }, { id: "learned", name: "그 나라의 축구를 입은 선수" },
      { id: "persuaded", name: "내 축구로 설득한 선수" }, { id: "tried", name: "부딪혀 본 첫해" },
      { id: "bloom", name: "두 번째 해에 핀 꽃" }, { id: "fizzle", name: "짐도 다 못 푼 이야기" }] },
    { sid: "slot", emoji: "📍", name: "자리 전쟁", ends: [
      { id: "won", name: "자리를 되찾은 날" }, { id: "both", name: "둘이 선 자리" },
      { id: "bench", name: "벤치에서 쓴 계절" }, { id: "fizzle", name: "주인이 떠난 경쟁" }] },
    { sid: "senior", emoji: "🕯️", name: "선배의 마지막 시즌", ends: [
      { id: "lastpass", name: "마지막 패스" }, { id: "dawn", name: "새벽을 물려받다" },
      { id: "missed", name: "따라가지 못한 새벽" }, { id: "handshake", name: "악수로 끝난 계절" },
      { id: "fizzle", name: "떠나온 팀의 은퇴식" }] },
    { sid: "race", emoji: "🔥", name: "한 끗 레이스", ends: [
      { id: "crown", name: "왕관을 빼앗다" }, { id: "close2", name: "한 끗의 2위" }, { id: "far", name: "멀어진 왕관" }] },
  ];
  const def = (sid) => LIST.find((s) => s.sid === sid);
  const endName = (sid, end) => ((def(sid) || { ends: [] }).ends.find((e) => e.id === end) || {}).name || end;
  /* 🕯️ 선배의 등번호 — 이름에서 **늘 같은 번호**를 지어요(같은 이름이면 같은 번호 · 1~99 · 난수 없음).
   * 동료에겐 번호 칸이 없어서(충돌을 안 봐요) 이름이 번호를 정해요. 1장부터 글에 보여서,
   * 결말 화면의 「물려받기」가 처음 보는 번호가 아니에요(오케스트레이터 결정 — 25번 §2-1). */
  function seniorNo(name) {
    let h = 2166136261;
    for (const ch of String(name == null ? "" : name)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
    return (h % 99) + 1;
  }

  // ---------- 작은 도구 ----------
  const K = () => WingerEvents.kit;
  const CT = () => (window.WingerCareer && WingerCareer._t) || {};
  const isPro = () => !!S && S.phase === "soccer-pro";
  const proLog = (msg) => { if (CT().proLog) CT().proLog(msg); };
  function book(st) {
    if (!st.story || typeof st.story !== "object") st.story = { on: {}, done: [], seen: {} };
    const b = st.story;
    if (!b.on || typeof b.on !== "object") b.on = {};
    if (!Array.isArray(b.done)) b.done = [];
    if (!b.seen || typeof b.seen !== "object") b.seen = {};
    return b;
  }
  const openCount = (st) => Object.keys(book(st).on).length;
  /* 이번 시즌 남은 장 — 무작위 이벤트가 그 자리를 비워 둬요(🌍은 다음 시즌 몫이면 빼요) */
  function left() {
    if (!isPro()) return 0;
    let n = 0;
    for (const [sid, s] of Object.entries(book(S).on)) {
      if (sid === "abroad" && s.y0 !== S.proYear) continue;
      n += Math.max(0, 2 - (s.ch || 0));
    }
    return n;
  }
  const seatFor = (need) => S.evSeason.n + left() + need <= SEASON_CAP;
  function openStory(sid, data) {
    const b = book(S);
    if (b.on[sid] || openCount(S) >= STORY_MAX) return false;
    b.on[sid] = Object.assign({ ch: 0, y0: S.proYear }, data);
    return true;
  }
  /* 닫기 — 결말은 세이브(done)와 이 기기 장부(end) 둘 다에 남아요 */
  function close(st, sid, end, extra) {
    const b = book(st);
    delete b.on[sid];
    const name = extra && extra.name ? extra.name : endName(sid, end);
    const row = Object.assign({ sid, end, y: st.proYear || 0, name },
      extra && extra.who ? { who: extra.who } : {}, extra && extra.no ? { no: extra.no, mate: extra.mate } : {});
    b.done.push(row);
    if (window.WingerBook) WingerBook.mark("end", `${sid}:${end}`);
    const d = def(sid) || { emoji: "📖", name: String(sid) };   // 모르는 편(깨진 세이브)이어도 닫기는 끝까지 가요
    if (st === S) {
      proLog(`📖 ${d.emoji} ${d.name} — 「${name}」`);
      if (end !== "fizzle" && window.WingerCareer && WingerCareer.queueFx) WingerCareer.queueFx([["flash", `📖 「${name}」`]]);
      // 🏅 이야기 결말 업적(첫 번째 결말 · 다섯 개의 결말)은 결말이 정해질 때 봐요
      if (isPro() && window.WingerAch) WingerAch.announce(WingerAch.check("story"));
    }
    return row;
  }

  /* 도전 칸 — 판돈이 잘리면 명성 ±25로 바꿔요(칩도 바뀌어요). 명성도 잘리면 **그 칸만** 빼요(장은 건너뛰지 않아요) */
  function chapterTry(pid, label, x, win, lose, usual, tag) {
    const k = K();
    let o = k.tryOpt(pid, label, x, win, lose, usual);
    if (!k.fits(o.win) || !k.fits(o.lose)) {
      o = k.tryOpt(pid, label, x, { fame: k.STAKE.fame }, { fame: -k.STAKE.fame }, usual);
      if (!k.fits(o.win) || !k.fits(o.lose)) return null;
    }
    return Object.assign(o, { tag });
  }
  const safeTag = (label, tag) => Object.assign(K().safe(label), { tag });
  function show(id, sid, ch, title, body, opts) {
    K().present({ id, sid, ch, title, body, opts: opts.filter(Boolean) });
  }
  /* 약속 장 — 걸려 있던 약속은 **없던 일**이 돼요(한 번에 하나 · 결말이 2장에 기대는 편이 있어요) */
  function promiseChapter(id, sid, title, body, opp) {
    const k = K();
    k.endPromise("voided");
    show(id, sid, 2, title, body, [k.safe("넘긴다"), k.promOpt(k.posKind(), opp)]);
  }

  // ---------- 장 — 블록마다 한 번(events.js roll이 불러요). 장을 띄웠으면 true ----------
  function chapter(kind, key, usual) {
    if (!isPro()) return false;
    const k = K();
    const on = book(S).on;
    const act = S.activity;
    // 🌍 낯선 땅 — 1장은 이적 다음 시즌 pre, 2장은 그 시즌 전반기 week 8 이상 첫 mid
    if (on.abroad) {
      const s = on.abroad;
      if (s.ch === 0 && kind === "pre" && S.proYear === s.y0) {
        s.ch = 1;
        const t = COUNTRY_TRAIT[s.f.country] || {};
        const lk = t.focus || k.mainKey();
        const ld = k.statDef(lk);
        show("s_abroad1", "abroad", 1, "그 나라의 방식", (COUNTRY[s.f.country] || {}).scene || "낯선 리그의 첫 시즌이에요.", [
          chapterTry("s_abroad1_learn", "🧭 이 나라의 방식을 배운다", { label: `${ld.name} 재능`, v: 5 * k.stars(lk) },
            { stat: { k: lk, v: k.STAKE.stat } }, { stat: { k: lk, v: -k.STAKE.stat } }, usual, "learn"),
          chapterTry("s_abroad1_persuade", "🎯 내 축구로 설득한다", { label: "종합", v: 0.6 * (overall() - k.lgBase()) },
            { trust: k.STAKE.trust }, { trust: -k.STAKE.trust }, usual, "persuade"),
          safeTag("🐢 천천히", "slow"),
        ]);
        return true;
      }
      if (s.ch === 1 && kind === "mid" && S.proYear === s.y0 && act && act.cb === 1 && act.week >= 8) {
        s.ch = 2;
        promiseChapter("s_abroad2", "abroad", "첫 고비",
          `${(COUNTRY[s.f.country] || {}).name || "낯선"} 리그에서 반 시즌 — 첫 고비가 왔어요. 다음 경기가 이 나라에서의 자리를 정해요.`);
        return true;
      }
    }
    /* 📍 자리 전쟁 — ⓐ 찜한 자리를 같은 동료가 3라운드 연속(h2·mid) · ⓑ 후반기 첫 화면에 선발 확률 < 50% · 실력 ±5 동료.
     * **2장이 설 블록이 남을 때만** 열어요(오케스트레이터 결정 — 25번 §2-2 「2장·집계가 설 자리가 없으면 안 연다」,
     * 🔥의 「마지막 mid 블록 제외」와 같은 원리). 2장은 「1장 week + 5」 이상인 같은 반기 mid 블록이고, 집계는 그 반기
     * 마지막 라운드(19번째)에서 닫히니 이야기가 열려 있는 마지막 mid 블록은 week 18(= 반기 라운드 수 − 1)이에요 —
     * 그래서 1장 week + 5 ≤ 18, 곧 **week ≤ 13**. 휴식기 블록({y}:1:19)도 여기서 빠져요.
     * ⓑ는 h2(week 0)에서만 열려 늘 자리가 있어요. ⓐ는 사라지지 않아요 — 연속 수(slotBy)가 그대로라 다음 블록(h2)에서 다시 봐요 */
    if (!on.slot && (kind === "h2" || kind === "mid") && act && act.week + SLOT_CH2 <= (CT().WEEKS_PER_CB || 19) - 1 && window.WingerSquad) {
      const rival = slotRival(kind);
      if (rival && seatFor(2) && openStory("slot", { f: { rival: rival.name, me: 0, him: 0, rounds: 0, cb: act.cb, ch1Week: act.week } })) {
        const s = book(S).on.slot;
        s.ch = 1;
        const slots = WingerSquad.slotsOf(S.pos).map((x) => x.key);
        const from = S.wantSlot && slots.includes(S.wantSlot) ? S.wantSlot : slots[0];
        const to = slots.find((x) => x !== from);
        const ovr = overall();
        show("s_slot1", "slot", 1, "격자의 한 칸",
          `같은 ${POS_INFO[S.pos].name} ${rival.name} — 실력 ${Math.round(rival.str)}. 격자의 한 칸을 두고 매주 겨뤄요.`, [
            chapterTry("s_slot1", "📌 그 칸을 끝까지 노린다", { label: "실력 차", v: 2 * (ovr - rival.str) },
              { trust: k.STAKE.trust }, { trust: -k.STAKE.trust }, usual, "target"),
            /* 🔀 거래 — 찜한 자리를 옆 칸으로. 그 칸의 결을 받고 찜한 칸의 결을 내줘요. 선발 여부는 안 바뀌어요 */
            to ? { k: "deal", label: "🔀 옆 칸으로 비킨다", tag: "aside", fx: { slotTo: to, slotFrom: from } } : null,
            safeTag("🙂 그대로 둔다", "stay"),
          ]);
        return true;
      }
    }
    if (on.slot) {
      const s = on.slot;
      if (s.ch === 1 && kind === "mid" && act && act.cb === s.f.cb && act.week >= s.f.ch1Week + SLOT_CH2) {
        s.ch = 2;
        promiseChapter("s_slot2", "slot", "맞대결 주간",
          `동료 ${s.f.rival} — 격자의 그 칸을 두고 겨룬 지 다섯 라운드. 감독이 이번 주를 지켜본대요.`);
        return true;
      }
    }
    // 🕯️ 선배의 마지막 시즌 — 같은 포지션의 만 35세 동료(명단 순서의 첫 사람)
    if (!on.senior && kind === "pre" && window.WingerSquad) {
      const old = WingerSquad.squadOf(S.group).find((x) => !x.me && x.age === SENIOR_AGE && x.pos === S.pos);
      if (old && openStory("senior", { f: { name: old.name } })) {
        const s = book(S).on.senior;
        s.ch = 1;
        show("s_senior1", "senior", 1, "새벽의 운동장",
          `#${seniorNo(old.name)} ${old.name} 선배(35세) — 이번 시즌이 마지막이래요. 매일 새벽 혼자 운동장을 돌아요.`, [
            chapterTry("s_senior1", "🌅 따라 나간다", { label: "체력", v: 0.5 * (S.stats.stamina - k.lgBase()) },
              { stat: { k: "stamina", v: k.STAKE.stat } }, { stat: { k: "stamina", v: -k.STAKE.stat } }, usual, "follow"),
            safeTag("🏠 내 방식대로", "own"),
          ]);
        return true;
      }
    }
    if (on.senior && on.senior.ch === 1 && kind === "h2") {
      const s = on.senior;
      s.ch = 2;
      promiseChapter("s_senior2", "senior", "은퇴 발표",
        `#${seniorNo(s.f.name)} ${s.f.name} 선배 — 은퇴를 발표했어요. 동료들이 선배에게 승리를 바치자고 해요.`);
      return true;
    }
    // 🔥 한 끗 레이스 — 후반기 week 10~17 · 내 부문 2위 · 1위(다른 클럽)와 격차 10~15% · 시즌 한 번
    if (!on.race && kind === "mid" && act && act.cb === 2 && act.week >= RACE_OPEN_WEEK && act.week <= RACE_LAST_WEEK
        && book(S).raceY !== S.proYear && CT().raceRank) {
      const rk = raceKeyOf(S.pos);
      const rank = CT().raceRank(rk);
      const mi = rank.findIndex((x) => x.me);
      const gap = rank[0] && rank[0].v > 0 && rank[1] ? (rank[0].v - rank[1].v) / rank[0].v : 1;
      if (mi === 1 && gap >= RACE_GAP_MIN && gap <= RACE_GAP && rank[0].club !== S.group && seatFor(2)
          && openStory("race", { f: { key: rk, top: rank[0].name, club: rank[0].club, gap0: gap } })) {
        book(S).raceY = S.proYear;
        const s = book(S).on.race;
        s.openKey = key;
        s.ch = 1;
        const mk = k.mainKey();
        show("s_race1", "race", 1, "👑 한 칸 아래",
          `${RACE_LABEL[rk]} 순위 2위 — 👑 1위 ${rank[0].name}(${rank[0].club}) ${rank[0].v} · 나 ${rank[1].v}.`, [
            chapterTry("s_race1", "📼 그 선수의 경기를 돌려 본다", { label: `${k.statDef(mk).name} 재능`, v: 5 * k.stars(mk) },
              { stat: { k: mk, v: k.STAKE.stat } }, { stat: { k: mk, v: -k.STAKE.stat } }, usual, "study"),
            safeTag("🙂 내 경기에 집중한다", "focus"),
          ]);
        return true;
      }
    }
    if (on.race && on.race.ch === 1 && kind === "mid" && act && act.cb === 2 && key !== on.race.openKey) {
      const s = on.race;
      s.ch = 2;
      promiseChapter("s_race2", "race", "맞대결",
        `👑 ${s.f.top}의 ${s.f.club} — 그 팀과 만나는 경기가 다가와요.`, s.f.club);
      return true;
    }
    return false;
  }
  const raceKeyOf = (pos) => (pos === "mf" ? "a" : pos === "df" ? "d" : "g");
  const RACE_LABEL = { g: "⚽ 득점", a: "🅰️ 도움", d: "🛡️ 수비" };
  /* 📍 상대 — ⓐ가 먼저(찜한 자리를 3라운드 연속 가져간 그 동료), 아니면 h2의 ⓑ(실력이 가장 가까운 같은 포지션 동료) */
  function slotRival(kind) {
    const sq = WingerSquad.squadOf(S.group);
    const by = WingerEvents.mem().slotBy;
    if (by && by.n >= SLOT_TAKEN) {
      const r = sq.find((x) => !x.me && x.name === by.name);
      if (r) return r;
    }
    if (kind !== "h2" || WingerSquad.myLine().odds >= SLOT_ODDS) return null;
    const ovr = overall();
    return sq.filter((x) => !x.me && x.pos === S.pos && Math.abs(x.str - ovr) <= SLOT_RANGE)
      .sort((a, b) => Math.abs(a.str - ovr) - Math.abs(b.str - ovr))[0] || null;
  }

  // ---------- 답 · 판정 · 집계 ----------
  /* 1장의 고른 것과 판정을 남겨요(결말이 읽어요) — events.js answer가 불러요 */
  function answered(ev, o, ok) {
    const s = book(S).on[ev.sid];
    if (!s || ev.ch !== 1) return;
    if (ev.sid === "abroad" || ev.sid === "senior") { s.f.pick = o.tag || null; s.f.ok = ok; }
  }
  // 2장 약속이 판정됐어요
  function judged(id, ok) {
    const sid = { s_abroad2: "abroad", s_slot2: "slot", s_senior2: "senior", s_race2: "race" }[id];
    const s = sid && book(S).on[sid];
    if (s) s.f.p2 = ok;
  }
  /* 📍 라운드마다 — 뛴 주(played)·벤치 주(bench) 둘 다 여기서 한 번(스펙 §2-9).
   * ⓐ의 연속 수(evMem.slotBy)와 열린 📍의 집계(1장 뒤 **같은 반기**의 라운드)를 같이 세요. */
  function tally(kind) {
    if (!isPro() || !window.WingerSquad) return;
    const act = S.activity;
    const xi = WingerSquad.matchXI();
    const m = WingerEvents.mem();
    const taker = S.wantSlot ? xi.find((x) => !x.me && x.pos === S.pos && x.slot === S.wantSlot) : null;
    m.slotBy = !taker ? null : m.slotBy && m.slotBy.name === taker.name
      ? { name: taker.name, n: m.slotBy.n + 1 } : { name: taker.name, n: 1 };
    const s = book(S).on.slot;
    if (!s || s.ch < 1 || !act || act.cb !== s.f.cb) return;
    s.f.rounds += 1;
    if (s.f.rounds <= SLOT_WIN) {
      if (kind === "played") s.f.me += 1;
      if (xi.some((x) => !x.me && x.name === s.f.rival)) s.f.him += 1;
    }
    // 10라운드 또는 그 반기 끝에서 닫아요
    if (s.f.rounds >= SLOT_WIN || act.week + 1 >= (CT().WEEKS_PER_CB || 19)) closeSlot();
  }
  function closeSlot() {
    const s = book(S).on.slot;
    if (!s) return;
    const d = s.f.me - s.f.him;
    const end = d >= 3 ? "won" : Math.abs(d) <= 2 && s.f.me >= 3 && s.f.him >= 3 ? "both" : "bench";
    close(S, "slot", end);
  }
  /* 🔥 결산 **앞**(resetSeason 전) — 최종 순위와 1위와의 차이를 적어 둬요. 결말은 수상 표로 정해요 */
  function preReset() {
    if (!isPro() || !CT().raceRank) return;
    const s = book(S).on.race;
    if (!s) return;
    const rank = CT().raceRank(s.f.key);
    const mi = rank.findIndex((x) => x.me);
    s.f.finRank = mi + 1;
    s.f.finGap = mi >= 1 ? rank[0].v - rank[mi].v : 0;
  }
  /* 시즌 결산 — 그 시즌에 닫히는 이야기의 결말(규칙표 위에서부터 첫 줄) */
  function yearEnd() {
    if (!isPro()) return;
    const on = book(S).on;
    const yr = (S.career && S.career.years || [])[S.career.years.length - 1] || {};
    if (on.abroad && S.proYear >= on.abroad.y0) {
      const s = on.abroad;
      /* 1장이 끝내 안 떴으면(규칙상 드묾) 흐지부지로 닫아요 — 열린 채 남아 두 편 자리를 막지 않게 */
      if (s.ch < 1) close(S, "abroad", "fizzle");
      else {
        const avg = yr.avg;   // 0.1 반올림 · 출전 0이면 null — 문턱 6.45에서는 반올림 전과 판정이 같아요
        const f = s.f;
        const end = avg == null || avg < ABROAD_LOW ? "window"
          : f.pick === "learn" && f.ok === true ? "learned"
          : f.pick === "persuade" && f.ok === true ? "persuaded"
          : f.pick === "learn" || f.pick === "persuade" ? "tried"
          : "bloom";
        close(S, "abroad", end, end === "learned"
          ? { name: `${(COUNTRY[f.country] || {}).name || "그 나라"}의 축구를 입은 선수` } : null);
      }
    }
    if (on.slot) closeSlot();
    if (on.senior && on.senior.ch >= 1) {
      const f = on.senior.f;
      const end = f.p2 === true ? "lastpass"
        : f.pick === "follow" && f.ok === true ? "dawn"
        : f.pick === "follow" ? "missed"
        : "handshake";
      // 은퇴 소식에 그 이름이 있으면 문구에 써요(만 35세는 시즌 끝에 은퇴해요)
      const gone = ((S.squadNews || {}).gone || []).some((g) => g.name === f.name);
      // no·mate — 결말 화면의 「선배 번호 물려받기」가 읽어요(mate = 선배 이름 — 은퇴 소식과 상관없이 늘)
      close(S, "senior", end, Object.assign({ no: seniorNo(f.name), mate: f.name }, gone ? { who: f.name } : {}));
    }
    if (on.race) {
      const f = on.race.f;
      const aw = { g: "골든부츠", a: "플레이메이커", d: "철벽상" }[f.key];
      const end = (yr.awards || []).includes(aw) ? "crown"
        : f.finRank === 2 && f.finGap <= 2 ? "close2"
        : "far";
      close(S, "race", end);
    }
  }
  /* 방어 — 열린 이야기를 흐지부지로 닫아요(은퇴 · 환생 · 운영판 정리). 🔥은 결말 없이 없애요.
   * 닫은 게 있으면 true */
  function closeAll(st) {
    if (!st || !st.story || !st.story.on) return false;
    const sids = Object.keys(st.story.on);
    for (const sid of sids) {
      if (sid === "race") delete st.story.on.race;
      else close(st, sid, "fizzle");
    }
    return sids.length > 0;
  }
  /* 🌍 이적 — 리그의 나라가 바뀌었고 그 나라로는 처음이면 열어요(이적 다음 시즌이 y0).
   * **연 때만** seen에 적어요 — 막혀서 못 연 나라는 다음 이적 때 다시 봐요. */
  function onMove(prevLeagueId, league) {
    if (!isPro()) return;
    const a = LEAGUES.find((l) => l.id === prevLeagueId);
    if (!a || !league || a.country === league.country) return;
    const b = book(S);
    const seenKey = `abroad:${league.country}`;
    if (b.seen[seenKey]) return;
    if (openStory("abroad", { y0: S.proYear + 1, f: { country: league.country } })) b.seen[seenKey] = 1;
  }

  // ---------- 화면이 읽는 것 ----------
  function open() {
    if (!S || !S.story || !S.story.on) return [];
    return Object.entries(S.story.on).map(([sid, s]) => ({ sid, name: (def(sid) || {}).name || sid, ch: s.ch || 0, of: 2 }));
  }
  function ends(sid) {
    const d = def(sid);
    if (!d) return [];
    const b = window.WingerBook ? WingerBook.load().end : {};
    return d.ends.map((e) => {
      const c = b[`${sid}:${e.id}`];
      return { id: e.id, name: c ? e.name : null, n: c ? c.n : 0 };
    });
  }
  /* 결산 화면 한 줄 — 그 시즌에 닫힌 결말들(흐지부지 포함) */
  function lines(y) {
    if (!S || !S.story || !Array.isArray(S.story.done)) return [];
    return S.story.done.filter((d) => d.y === y).map((d) => {
      const x = def(d.sid) || { emoji: "📖", name: d.sid };
      const who = d.who ? ` — ${d.no ? `#${d.no} ` : ""}${d.who} 선배의 은퇴` : "";
      return `${x.emoji} ${x.name}${who} — 「${d.name || endName(d.sid, d.end)}」`;
    });
  }
  /* 🔢 「선배 번호 물려받기」를 내놓을까 — 그 시즌 🕯️ 결말(흐지부지 말고)이 있고 **내 번호와 다를 때만**.
   * 돌려주는 것 { no, mate } | null. 고르면 부르는 쪽이 setNo(no)로 저장해요(범위·검증 그대로) */
  function inheritNo(y) {
    if (!S || !S.story || !Array.isArray(S.story.done)) return null;
    const d = S.story.done.find((x) => x.sid === "senior" && x.y === y && x.end !== "fizzle" && Number.isInteger(x.no));
    return d && d.no !== S.no ? { no: d.no, mate: d.mate || d.who || "선배" } : null;
  }

  return {
    LIST, open, ends,
    // ---- 훅(events.js · career.js가 불러요) ----
    chapter, left, answered, judged, tally, preReset, yearEnd, onMove, lines, inheritNo, seniorNo,
    closeAll: (st) => closeAll(st || S),
    onLoad: (st) => closeAll(st),
  };
})();
