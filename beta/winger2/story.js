/* ⚽ 더 윙어 II 1막 — 📖 이야기 6편(공유 셋 + 가족 셋 중 하나) · 한 판에 넷까지
 *
 *   📍 slot   번호의 주인        — 1주 늘 열림 · 1장 6주(도전) · 2장 25주(약속) · 결말 25주 경기 뒤(「같은 장면」 집계 D)
 *   🔥 race   이웃 학교 에이스   — 11주 한 번 판정(나 M ≥ 1 · 에이스 S − M ≤ 0) · 2장 29주(약속) · 결말 34주
 *   🕯️ senior 마지막 공          — 🤝 사람 → {keeper}(3~31주) · 2장 33주(약속) · 결말 33주 경기 뒤
 *   🏠 가족 — 🏭 father(아버지) · 🎓 apply(엄마) · ✉️ letter(할머니) — 🤝 사람에서 **한 사람**을 고름(2~30주) ·
 *            나머지 둘은 그 판에서 닫힘 · 2장 32주(깃발 — 판정 없음)
 *
 * 설계: 12번 §7-4 · 21번 §4(🔥 둘만의 기록) · 13번 §4-4(틀 자리 · 성별 낱말 없음) · 27번 §6(2장 약속 판돈) ·
 *       29번 §2-2(📍 「같은 장면」) · §3-2(가족 셋 · P1 (가)) · 36번 §3-5(`q`에 같은 상황) · ① 스펙 §4(모양)
 *
 * ── 🔒 지키는 것 ────────────────────────────────────────────
 *  · **이야기는 여는 순간 자기 2장 자리까지 잡아요 — 자리가 없으면 안 열어요.** 1막의 2장 자리는 고정 주라
 *    여는 마감(🕯️ 31주 · 🏠 30주)이 곧 규칙이에요(12번 §7-2).
 *  · **자동 장이 선 주(📍 6 · 25 · 🔥 11 · 29 · 🕯️ 33)엔 🤝 사람 버튼에 이야기 얼굴이 안 떠요** —
 *    한 주 한 장 규칙이 여는 판을 몰래 깎지 않게(21번 §4-1).
 *  · **결말은 규칙표로 빈칸 없이**(위에서부터 첫 번째) — 숨은 굴림 0. 1장의 「참음」과 「걸었다가 실패」는 다른 결말.
 *  · 가족 이야기 2장은 **판정이 없는 선택** — 문은 확률이 아니라 **마음**으로 열어요(문 = 고른 이야기 + 깃발 + 11월 구간).
 *  · 🔥은 **둘만의 기록**(리그 경기만) — 리그 66명 순위가 아니에요.
 *  · 사람 이름은 **틀 자리**(`{rival}` · `{keeper}` · `{ace}` · `{me}` · `{family}`)로만. */
"use strict";

window.W2Story = (() => {
  /* 🎚️ 조정될 수 있는 상수 — 이 블록만 고칩니다(25번 §5). */
  const TUNE = Object.freeze({
    SLOT1: 6, SLOT2: 25,           // 12번 §7-4 — 📍 1장 · 2장(결정전) 주
    RACE_OPEN: 11, RACE2: 29, RACE_END: 34,   // 21번 §4-1 — 🔥 여는 주 · 두 번째 맞대결 · 결말 주
    RACE_N: 0,                     // 21번 §4-1 · 28번 둘째 값 · 38번 §5 — 11주에 S − M ≤ N이면 엶
    RACE_CLOSE: 1,                 // 〃 — 「한 끗의 거리」 0 ≤ S − M ≤ 1
    SLOT_LINE: 1.5,                // 29번 §2-2 · 38번 §5 — 📍 D ≥ +1.5 되찾음 · ≤ −1.5 넘겨줌 · 그 사이 둘이 선 양 날개
    SENIOR2: 33, SENIOR_FROM: 3, SENIOR_LAST: 31,   // 12번 §7-4 — 🕯️ 2장 · 여는 주 3~31
    FAM2: 32, FAM_FROM: 2, FAM_LAST: 30,            // 12번 §7-4 — 🏠 2장 · 여는 주 2~30
    FAM_HINT: 25,                  // 12번 §7-4 — 「{family}와 이야기할 시간이 얼마 안 남았어요」 한 줄
  });

  const W = () => window.W2World;
  const EV = () => window.W2Events;
  const K = () => window.W2Events.kit;
  const FAM_SIDS = ["father", "apply", "letter"];
  /* 결말 이름 — `id`는 출하 뒤 안 바꿔요(도감 장부 · 업적이 가리켜요) */
  const LIST = [
    { sid: "slot", emoji: "📍", name: "번호의 주인", ends: [
      { id: "took", name: "번호를 되찾은 날" }, { id: "pair", name: "둘이 선 양 날개" }, { id: "gave", name: "넘겨준 번호" }] },
    { sid: "race", emoji: "🔥", name: "이웃 학교 에이스", ends: [
      { id: "ace", name: "에이스의 자리" }, { id: "close", name: "한 끗의 거리" }, { id: "far", name: "다음 무대의 약속" }] },
    { sid: "senior", emoji: "🕯️", name: "마지막 공", ends: [
      { id: "gift", name: "마지막 선물" }, { id: "dawn", name: "새벽을 나눈 친구" },
      { id: "missed", name: "따라가지 못한 새벽" }, { id: "shake", name: "악수로 끝난 계절" }] },
    { sid: "father", emoji: "🏭", name: "아버지의 운동장", family: true, ends: [
      { id: "number", name: "아버지의 등번호" }, { id: "grounds", name: "각자의 운동장" }] },
    { sid: "apply", emoji: "🎓", name: "두 장의 원서", family: true, ends: [
      { id: "second", name: "두 번째 길을 남긴 선수" }, { id: "single", name: "한 길만 본 선수" }] },
    { sid: "letter", emoji: "✉️", name: "바다 건너 온 편지", family: true, ends: [
      { id: "crossed", name: "바다를 건넌 답장" }, { id: "drawer", name: "서랍 속의 편지" }] },
  ];
  const def = (sid) => LIST.find((s) => s.sid === sid) || null;
  const endName = (sid, end) => ((def(sid) || { ends: [] }).ends.find((e) => e.id === end) || {}).name || end;

  /* ---------- 세이브의 이야기 칸 — 읽는 쪽 기본값 ---------- */
  function book(S) {
    if (!S.story || typeof S.story !== "object") S.story = { open: [], done: [], seen: {}, door: null };
    const b = S.story;
    if (!Array.isArray(b.open)) b.open = [];
    if (!Array.isArray(b.done)) b.done = [];
    if (!b.seen || typeof b.seen !== "object") b.seen = {};
    return b;
  }
  const openOf = (S, sid) => book(S).open.find((o) => o.sid === sid) || null;
  const everOpened = (S, sid) => !!openOf(S, sid) || book(S).done.some((d) => d.sid === sid);
  /* 🏠 따라간 가족 이야기 — 연(또는 닫은) 셋 중 하나 · 아직 안 골랐으면 null(29번 §3-2) */
  const famSid = (S) => FAM_SIDS.find((sid) => everOpened(S, sid)) || null;
  /* 📍은 1주에 늘 열려요(훅) — 새 판을 만들 때 부릅니다 */
  function start(S) {
    const b = book(S);
    if (!everOpened(S, "slot")) b.open.push({ sid: "slot", ch: 0, at: 1, f: { d: 0, on: false } });
  }
  /* 남은 장 수 — 무작위 이벤트가 그 자리를 비워 둬요(실측 장치 `remaining`과 같은 셈) */
  function left(S) {
    let n = 0;
    const slot = openOf(S, "slot");
    if (slot) n += slot.ch < 1 ? 2 : slot.ch < 2 ? 1 : 0;
    else if (!everOpened(S, "slot")) n += 2;
    for (const sid of ["senior", "race", famSid(S)]) { const o = sid ? openOf(S, sid) : null; if (o) n += Math.max(0, 2 - o.ch); }
    return n;
  }
  /* 🔥 11주에 열릴 판인가 — 🔒 리그 3라운드(10주)까지의 **둘만의 기록**으로 */
  function raceWouldOpen(S) {
    if (everOpened(S, "race")) return false;
    const X = W();
    const M = X.recOf(S, "me"), Sx = X.recOf(S, X.aceRow(S).id);
    return M >= 1 && Sx - M <= TUNE.RACE_N;
  }
  /* 이 주가 자동 장의 주인가 — 🤝 사람 버튼의 이야기 얼굴을 가려요 */
  function autoWeek(S, w) {
    if (w === TUNE.SLOT1 || w === TUNE.SLOT2) return true;
    if (w === TUNE.RACE_OPEN && raceWouldOpen(S)) return true;
    const race = openOf(S, "race"), senior = openOf(S, "senior");
    if (w === TUNE.RACE2 && race && race.ch === 1) return true;
    if (w === TUNE.SENIOR2 && senior && senior.ch === 1) return true;
    return false;
  }
  /* 🤝 사람 — 이 주에 이야기 장이 준비된 사람(없으면 버튼이 안 떠요 · 12번 §5-2).
   * 🏠 가족 이야기를 아직 안 골랐으면 **세 얼굴**(아버지 · 엄마 · 할머니) — 얼굴 밑에 그 이야기의 문이 열리는 구간 한 줄 */
  function people(S, w) {
    if (autoWeek(S, w)) return [];
    const out = [];
    const fsid = famSid(S);
    if (!fsid && w >= TUNE.FAM_FROM && w <= TUNE.FAM_LAST) {
      for (const sid of FAM_SIDS) {
        const F = EV().FAMILY[sid];
        out.push({ key: "family", who: F.who, name: F.name, sid, note: `${def(sid).emoji} 이 이야기의 문은 평가서 「${FAM_TEXT[sid].tierName}」에서 열려요` });
      }
    }
    const fam = fsid ? openOf(S, fsid) : null;
    if (fam && fam.ch === 1 && w === TUNE.FAM2) { const F = EV().FAMILY[fsid]; out.push({ key: "family", who: F.who, name: F.name, sid: fsid }); }
    if (!everOpened(S, "senior") && w >= TUNE.SENIOR_FROM && w <= TUNE.SENIOR_LAST) {
      out.push({ key: "keeper", who: S.world.keeper.who, name: W().short(S.world.keeper.name), sid: "senior" });
    }
    return out;
  }
  /* 🗓️ 홈의 사실 한 줄 — 25주 가족 마감(마감을 모르고 지나가지 않게 · 원칙 ③) */
  function notes(S, w) {
    const out = [];
    if (w === TUNE.FAM_HINT && !famSid(S)) {
      out.push(K().fillS(S, "{family|와} 이야기할 시간이 얼마 안 남았어요"));
    }
    return out;
  }

  /* ---------- 장 카드 ---------- */
  const storyCard = (S, dr, base, opts) => Object.assign(K().card(S, base, opts, dr), { kind: "story" });
  /* 도전 칸 — 🔒 판돈이 잘리면 **이야기 장은 확정만** 남겨요(무작위 이벤트는 후보에서 빼는 것과 달라요 · 22번 §0-1) */
  function tryChapter(S, dr, id, label, x, k, stake, sit) {
    const st = stake === "main" ? window.WingerEngine.K.BLEND[S.pos][0] : stake;
    if (!EV().fits(S, st)) return null;
    return K().tryOpt(S, id, K().fillS(S, label), x, k, stake, dr.sit, K().sitText(S, sit, dr.sit));
  }
  /* 2장 약속 — **늘 고를 수 있어요**: 판돈 = min(2, 6 − |🤝|) · 0이면 이야기만 걸린 약속(27번 §6-3) */
  const promChapter = (S) => K().promOpt(S, Math.min(EV().TUNE.TRUST_STAKE, EV().TUNE.TRUST_CAP - Math.abs(Number(S.trust) || 0)));
  const recLine = (S) => {
    const X = W();
    return { M: X.recOf(S, "me"), S: X.recOf(S, X.aceRow(S).id), cat: ["골", "도움", "수비"][X.catOf(S.pos)] };
  };
  const FAM_TEXT = {
    father: {
      t1: "주말 조기축구", b1: "아버지가 가게 문을 일찍 닫았어요. 「조기축구에 한 명이 비는데, 올래?」",
      try1: "⚽ 아버지 팀 아저씨들과 뛴다", safe1: "🍗 가게를 돕는다", x: "overall", k: 0.6, stake: "main",
      sit: { "-12": "비 온 뒤라 동네 운동장이 진흙밭이에요", 0: "평소의 주말 아침이에요", 12: "아저씨들이 {me|를} 가운데 세워 줘요" },
      t2: "아버지의 부탁",
      b2: { m: "「공장 팀 감독이 네 얘기를 하더라. 테스트 날짜를 받아 둘까?」", f: "「그 공장에 여자팀이 새로 생겼대. 테스트 날짜를 받아 둘까?」" },
      flag: "🏭 테스트 날짜를 받아 둔다", safe2: "🏟️ 프로만 본다", tierName: "중", bg: "bg-home-jiho",
      endFlag: "number", endElse: "grounds",
    },
    apply: {
      t1: "노트 한 권", b1: "엄마가 책상 위에 펼쳐 둔 경기 노트를 발견했어요.",
      try1: "📓 밤새 정리한 경기 노트를 보여 드린다", safe1: "🏃 오늘은 말하지 않는다", x: "pass", k: 0.5, stake: "pass",
      sit: { "-12": "엄마가 학원 일로 몹시 바쁜 밤이에요", 0: "평소의 저녁이에요", 12: "엄마가 먼저 노트를 넘겨 봐요" },
      t2: "원서 마감", b2: { m: "「원서 마감이 이번 주야. 한 장 써 둘래?」", f: "「원서 마감이 이번 주야. 한 장 써 둘래?」" },
      flag: "🎓 원서를 쓴다", safe2: "⚽ 프로 테스트에만 건다", tierName: "상", bg: "bg-home-doyun",
      endFlag: "second", endElse: "single",
    },
    letter: {
      t1: "영상 한 편 더", b1: "바다 건너 아카데미에서 편지가 왔대요. 「영상을 더 보내 줄 수 있나요?」",
      try1: "🎥 새 영상을 찍어 보낸다", safe1: "🌊 할머니 일을 돕는다", x: "dribble", k: 0.5, stake: "dribble",
      sit: { "-12": "바닷바람이 거세 공이 자꾸 떠요", 0: "평소의 노을이에요", 12: "동네 아이들이 공을 주워 와 줘요" },
      t2: "답장", b2: { m: "「그쪽에서 답장을 기다린다더라.」", f: "「그쪽에서 답장을 기다린다더라.」" },
      flag: "✉️ 답장을 보낸다", safe2: "📦 편지를 접어 둔다", tierName: "최상", bg: "bg-home-haram",
      endFlag: "crossed", endElse: "drawer",
    },
  };

  /* 이 주의 장 — 🔒 확인 순서는 실측 장치(`chapterFor`)와 같아요: 🤝 가족 → 🤝 {keeper} → 📍 → 🕯️ 2장 → 🔥 2장 → 🔥 열기 */
  function chapter(S, w, dr) {
    const b = book(S);
    const choice = S.choice || {};
    const who = choice.k === "people" ? choice.who : null;
    const fill = (t) => K().fillS(S, t);
    /* 🏠 고른 가족 이야기 — 이미 열었으면 그것, 아직이면 이번 주 🤝에서 고른 것(셋 중 하나만) */
    const fsid = famSid(S) || (FAM_SIDS.indexOf(choice.fam) >= 0 ? choice.fam : null);
    const FT = fsid ? FAM_TEXT[fsid] : null;
    const F = fsid ? EV().FAMILY[fsid] : null;
    if (who === "family" && fsid) {
      if (!everOpened(S, fsid) && w >= TUNE.FAM_FROM && w <= TUNE.FAM_LAST) {
        b.open.push({ sid: fsid, ch: 1, at: w, f: {} });
        return storyCard(S, dr, { id: "s_fam1", sid: fsid, ch: 1, title: `${def(fsid).emoji} ${FT.t1}`, body: fill(FT.b1),
          who: F.who, mood: "base", bg: FT.bg }, [K().safeOpt(FT.safe1), tryChapter(S, dr, "s_fam1", FT.try1, FT.x, FT.k, FT.stake, FT.sit)].filter(Boolean));
      }
      const fam = openOf(S, fsid);
      if (fam && fam.ch === 1 && w === TUNE.FAM2) {
        fam.ch = 2;
        const note = `이 문은 평가서가 「${FT.tierName}」일 때 열려요`;
        return storyCard(S, dr, { id: "s_fam2", sid: fsid, ch: 2, title: `${def(fsid).emoji} ${FT.t2}`,
          body: FT.b2[S.gender === "f" ? "f" : "m"], who: F.who, mood: "worry", bg: FT.bg },
        [{ k: "flag", label: FT.flag, note }, K().safeOpt(FT.safe2)]);
      }
    }
    if (who === "keeper" && !everOpened(S, "senior") && w >= TUNE.SENIOR_FROM && w <= TUNE.SENIOR_LAST) {
      b.open.push({ sid: "senior", ch: 1, at: w, f: {} });
      return storyCard(S, dr, { id: "s_senior1", sid: "senior", ch: 1, title: "🕯️ 새벽 운동장",
        body: fill("{keeper|가} 새벽마다 혼자 운동장을 돈대요. 「마지막 해니까.」"),
        who: S.world.keeper.who, mood: "base", bg: "bg-dawn" },
      [K().safeOpt("🏠 내 방식대로 한다"), tryChapter(S, dr, "s_senior1", "🌅 따라 나간다", "stamina", 0.5, "stamina",
        { "-12": "새벽 공기가 유난히 차가워요", 0: "평소의 새벽이에요", 12: "{keeper|가} 보온병을 두 개 챙겨 왔어요" })].filter(Boolean));
    }
    const slot = openOf(S, "slot");
    if (w === TUNE.SLOT1 && slot && slot.ch === 0) {
      slot.ch = 1; slot.f.on = true;
      return storyCard(S, dr, { id: "s_slot1", sid: "slot", ch: 1, title: "📍 번호 앞에서",
        body: fill("3년 달던 {no}번이 {rival}의 등에 붙어 있어요. {rival|가} 한쪽 입꼬리만 올려요."),
        who: S.world.rivalWho, mood: "smirk", bg: "bg-locker" },
      [K().safeOpt("🙂 신경 쓰지 않는다"), tryChapter(S, dr, "s_slot1", "📌 실력으로 되찾겠다고 말한다", "rival", 2, "trust",
        { "-12": "감독이 {rival}의 훈련을 칭찬한 날이에요", 0: "평소의 라커룸이에요", 12: "{keeper|가} 옆에서 네 편을 들어 줘요" })].filter(Boolean));
    }
    if (w === TUNE.SLOT2 && slot && slot.ch === 1) {
      slot.ch = 2;
      return storyCard(S, dr, { id: "s_slot2", sid: "slot", ch: 2, title: "📍 번호 결정전",
        body: fill("후반기 첫 경기 — 감독이 번호를 두고 한마디 했어요. 「오늘 보고 정한다.」 {rival|도} 이 말을 들었어요."),
        who: S.world.rivalWho, mood: "base", bg: "bg-locker" }, [K().safeOpt("넘긴다"), promChapter(S)].filter(Boolean));
    }
    const senior = openOf(S, "senior");
    if (w === TUNE.SENIOR2 && senior && senior.ch === 1) {
      senior.ch = 2;
      return storyCard(S, dr, { id: "s_senior2", sid: "senior", ch: 2, title: fill("🕯️ {keeper}의 마지막 경기"),
        body: fill("오늘이 {keeper}의 마지막 리그 경기예요. 장갑을 맞부딪치는 소리가 라커룸에 울려요. 「{keeper}에게 바치는 경기」로 할까요?"),
        who: S.world.keeper.who, mood: "fire", bg: "bg-field" }, [K().safeOpt("넘긴다"), promChapter(S)].filter(Boolean));
    }
    const race = openOf(S, "race");
    if (w === TUNE.RACE2 && race && race.ch === 1) {
      race.ch = 2;
      const r = recLine(S);
      return storyCard(S, dr, { id: "s_race2", sid: "race", ch: 2, title: "🔥 두 번째 맞대결",
        body: fill(`{ace}의 학교와 다시 만나는 날이에요. 리그 ${r.cat} 기록은 {ace} ${r.S} · {me} ${r.M}.`),
        who: S.world.aceWho, mood: "base", bg: "bg-field" }, [K().safeOpt("넘긴다"), promChapter(S)].filter(Boolean));
    }
    if (w === TUNE.RACE_OPEN && raceWouldOpen(S)) {
      const r = recLine(S);
      b.open.push({ sid: "race", ch: 1, at: w, f: { M11: r.M, S11: r.S } });
      return storyCard(S, dr, { id: "s_race1", sid: "race", ch: 1, title: "🔥 첫 맞대결 다음 날",
        body: fill(`어제 {ace|는} 우리 골문 앞에서도 여유로웠어요. 리그 ${r.cat} 기록은 {ace} ${r.S} · {me} ${r.M} — 한 끗 차예요.`),
        who: S.world.aceWho, mood: "base", bg: "bg-field" },
      [K().safeOpt("🙂 내 경기에 집중한다"), tryChapter(S, dr, "s_race1", "📼 {ace}의 경기를 돌려 본다", "ace", 1, "main",
        { "-12": "{ace}의 학교가 경기 영상을 잠가 뒀대요", 0: "평소의 비디오실이에요", 12: "{rival|가} 영상 파일을 구해 왔어요" })].filter(Boolean));
    }
    return null;
  }

  /* 답했어요 — 결말 규칙이 읽는 재료만 적어요 */
  function answered(S, ev, o, ok) {
    const st = openOf(S, ev.sid);
    if (!st) return;
    if (ev.id === "s_senior1" || ev.id === "s_fam1") { st.f.r1 = o.k; st.f.ok = ok; }
    if (ev.id === "s_fam2") { st.f.flag = o.k === "flag"; if (st.f.flag) book(S).door = true; }
  }
  /* 📋 이야기 약속의 판정 — 🕯️ 2장만 결말이 읽어요 */
  function judged(S, id, ok) {
    if (id === "s_senior2") { const st = openOf(S, "senior"); if (st) st.f.p2 = !!ok; }
  }
  /* 📍 집계 — 「같은 장면, {rival}라면」(29번 §2-2): 공식 경기마다(리그 + 대회) 내 판마다
   *    Δ = 해냄(⚽ 골 · 🅰️ 도움 · 🧱 막음 — `perfect`) − q(같은 장면을 {rival}가 맡았다면 해냈을 확률 · 같은 상황).
   * 🔒 경기 합을 **소수 한 자리**로 반올림해 쌓아요(0.1 단위 정수로 — 보이는 값 = 판정 값 · 집계는 화면 숫자의 합).
   * 돌려주는 것: 그 경기 줄에 쓸 사실 `{ n, made, exp, d, D }` · 창 밖이면 null */
  function tally(S, boards) {
    const st = openOf(S, "slot");
    if (!st || !st.f.on) return null;
    const bs = (boards || []).filter((x) => x && typeof x.q === "number" && Number.isFinite(x.q));
    const made = bs.filter((x) => x.judge === "perfect").length;
    /* 🔒 보이는 값 = 판정 값 — 「{rival}라면 X번」을 한 자리로 먼저 접고, 그 접은 값으로 Δ를 셈(경기 줄의 「나 − X = ±d」가 늘 맞고 ·
     *    경기 줄의 d를 더하면 집계 D와 같아요 · 29번 §2-2) */
    const e10 = Math.round(bs.reduce((a, x) => a + x.q, 0) * 10);
    const d10 = made * 10 - e10;
    st.f.d = (Math.round((Number(st.f.d) || 0) * 10) + d10) / 10;
    return { n: bs.length, made, exp: e10 / 10, d: d10 / 10, D: st.f.d };
  }

  /* ---------- 결말 — 규칙표(위에서부터 첫 번째) ---------- */
  function endOf(S, sid) {
    const st = openOf(S, sid);
    const f = (st && st.f) || {};
    if (sid === "slot") {   // 0.1 단위 정수로 견줘요 — 1.5와 15/10이 부동소수로 갈리지 않게
      const d10 = Math.round((Number(f.d) || 0) * 10), L10 = Math.round(TUNE.SLOT_LINE * 10);
      return d10 >= L10 ? "took" : d10 <= -L10 ? "gave" : "pair";
    }
    if (sid === "race") {
      const r = recLine(S);
      return r.M > r.S ? "ace" : r.S - r.M <= TUNE.RACE_CLOSE ? "close" : "far";
    }
    if (sid === "senior") return f.p2 ? "gift" : f.r1 === "try" ? (f.ok ? "dawn" : "missed") : "shake";
    const FT = FAM_TEXT[sid];
    return f.flag ? FT.endFlag : FT.endElse;
  }
  const END_TEXT = {
    "slot:took": { mood: "shock", t: "감독이 {no}번 유니폼을 {me}에게 다시 건넸어요. {rival|가} 처음으로 놀란 얼굴을 해요." },
    "slot:pair": { mood: "grin", t: "번호는 그대로지만 — 이제 {rival|와} {me|는} 양 날개에 나란히 서요." },
    "slot:gave": { mood: "smirk", t: "{no}번은 {rival}의 것으로 남았어요. 그래도 {me|는} 자기 자리에서 뛰었어요." },
    "race:ace": { mood: "respect", t: "리그가 끝났어요 — 둘의 기록에서 {me|가} 앞섰어요. {ace|가} 짧게 고개를 끄덕여요." },
    "race:close": { mood: "respect", t: "리그가 끝났어요 — {ace|와}의 차이는 딱 한 끗이었어요." },
    "race:far": { mood: "base", t: "리그가 끝났어요 — {ace|는} 저만치 앞에 있어요. 다음 무대에서 다시 만나기로 해요." },
    "senior:gift": { mood: "tears", t: "마지막 경기가 끝나고 {keeper|가} 장갑으로 눈가를 문질러요. 「최고의 선물이었어.」" },
    "senior:dawn": { mood: "grin", t: "새벽 운동장을 함께 돈 날들이 남았어요. {keeper|가} 손을 흔들어요." },
    "senior:missed": { mood: "base", t: "새벽을 끝까지 따라가진 못했어요. 그래도 {keeper|는} 웃으며 마지막 경기를 마쳤어요." },
    "senior:shake": { mood: "tears", t: "각자의 방식으로 보낸 한 해 — 마지막 경기 뒤, {keeper|와} 굳게 악수를 나눠요." },
    "father:number": { mood: "smile", t: "아버지가 공장 팀 테스트 날짜를 달력에 동그라미 쳐 뒀어요." },
    "father:grounds": { mood: "smile", t: "아버지는 가게에서, {me|는} 운동장에서 — 각자의 자리에서 뛰어요." },
    "apply:second": { mood: "smile", t: "원서 한 장이 책상 서랍에 들어갔어요. 두 번째 길이 남았어요." },
    "apply:single": { mood: "worry", t: "원서는 쓰지 않았어요. {me|는} 한 길만 보기로 했어요." },
    "letter:crossed": { mood: "smile", t: "답장이 바다를 건너갔어요. 할머니가 우체국 앞에서 손을 흔들어요." },
    "letter:drawer": { mood: "worry", t: "편지는 곱게 접혀 서랍 속에 들어갔어요." },
  };
  /* 닫기 — 결말은 세이브(done)와 이 기기 장부(end) 둘 다에 남아요 · 결말 카드 하나를 돌려줘요 */
  function close(S, sid) {
    const b = book(S);
    const st = openOf(S, sid);
    if (!st) return null;
    const end = endOf(S, sid);
    b.open = b.open.filter((o) => o !== st);
    const name = endName(sid, end);
    /* 1장의 고름 · 결과를 남겨 둬요 — 문 엔딩의 까닭(`act1.doorWhy` · 29번 §7-2)이 닫힌 뒤에도 읽어요 */
    b.done.push({ sid, end, week: S.week, name, ch: st.ch, r1: st.f.r1 || null, ok1: typeof st.f.ok === "boolean" ? st.f.ok : null });
    if (window.W2Book) window.W2Book.mark("end", `${sid}:${end}`);
    const d = def(sid);
    const T = END_TEXT[`${sid}:${end}`] || { mood: "base", t: "" };
    const who = sid === "slot" ? S.world.rivalWho : sid === "race" ? S.world.aceWho : sid === "senior" ? S.world.keeper.who
      : (EV().FAMILY[sid] || EV().FAMILY.father).who;
    return { kind: "story-end", sid, end, title: `${d.emoji} ${d.name}`, body: `「${name}」`, line: K().fillS(S, T.t),
      who, mood: T.mood, bg: sid === "race" ? "bg-cup" : sid === "senior" ? "bg-field" : sid === "slot" ? "bg-locker" : (FAM_TEXT[sid] || {}).bg,
      opts: [{ k: "ok", label: "확인" }] };
  }
  /* 그 주의 끝에 닫을 이야기 — 📍 25주 경기 뒤 · 🏠 32주 · 🕯️ 33주 경기 뒤 · 🔥 34주 */
  function closeDue(S, w) {
    const out = [];
    const want = [];
    if (w === TUNE.SLOT2) want.push("slot");
    if (w === TUNE.FAM2 && famSid(S)) want.push(famSid(S));
    if (w === TUNE.SENIOR2) want.push("senior");
    if (w === TUNE.RACE_END) want.push("race");
    for (const sid of want) { const c = openOf(S, sid) ? close(S, sid) : null; if (c) out.push(c); }
    return out;
  }
  /* 1막 끝 — 아직 열린 이야기가 있으면 규칙표대로 닫아요(방어 · 보통은 비어 있어요) */
  function endAct(S) { return book(S).open.slice().map((o) => close(S, o.sid)).filter(Boolean); }
  /* 📖 도감 — 이 기기에서 본 결말(못 본 건 이름 대신 null) */
  function ends(sid) {
    const B = window.W2Book ? window.W2Book.load() : { end: {} };
    return ((def(sid) || { ends: [] }).ends).map((e) => {
      const c = B.end[`${sid}:${e.id}`];
      return { id: e.id, name: c ? e.name : null, n: c ? c.n : 0 };
    });
  }

  return { TUNE, LIST, FAM_SIDS, start, left, people, notes, autoWeek, raceWouldOpen, chapter, answered, judged, tally,
    closeDue, endAct, ends, endOf, famSid, openOf, everOpened };
})();
