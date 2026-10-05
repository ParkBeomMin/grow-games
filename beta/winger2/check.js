/* 🧪 더 윙어 II 확인 페이지(`check.html`) — 범민 님 요청: 「미니게임은 확인용페이지 · 각 상황들 확인필요한것도 바로 볼 수 있게」
 *
 * 🔒 지키는 것
 *  ① **게임 파일은 읽기만** — 판(`W2Moment`) · 엔진(`WingerEngine`) · 드라이버(`WingerLive`) · 장면(`W2Scenes` · `W2Scene`) ·
 *     로직(`W2Sheet` · `W2Story` · `W2Events` · `W2Film` · `W2Game`)의 **진짜 함수**를 그대로 불러요. 사본 산식 0.
 *     여기 있는 것은 「어떤 상태를 만들어 어느 함수에 넘기나」(가짜 세이브 · 장면에 넘기는 모양)뿐이에요.
 *  ② **진짜 세이브 0** — `check.html` 첫 스크립트가 이 페이지의 저장소를 메모리로 바꿔요. 가짜 상태는 `W2Game.newState`로 만들고
 *     게임의 `S`(세이브 대상)에는 안 넣어요(캐릭터 만들기 · 도입만 게임 입구를 메모리 저장소 위에서 진짜로 돌려요).
 *  ③ 판의 드라이버 순서는 `live.js`의 `mine`과 같아요 — 상황(`sit`) → 판 열기(`odds` · `judge`) → 판정 한 번 → 결과.
 *     판정은 엔진의 `judgeAtP(kind, autoP, 능력치, s)` — 경기 안의 `m.judgeFor`가 부르는 바로 그 함수예요. 판마다 시드를 고정해
 *     「같은 시드 · 같은 s → 같은 결과」를 게임과 비트 같게 재현해요.
 *  ④ 사용자 글자는 `textContent`로만 — innerHTML 0. */
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const E = window.WingerEngine, M = window.W2Moment, L = window.WingerLive, G = window.W2Game, Sc = window.W2Scenes;
  const SH = window.W2Sheet, ST = window.W2Story, EV = window.W2Events, F = window.W2Film, X = window.W2World;
  const clamp01 = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, ms) {
    for (let t = 0; t < (ms || 4000); t += 60) { const v = fn(); if (v) return v; await wait(60); }
    return null;
  }
  if (window.__w2memFail) {
    const w = $("ck-safe");
    w.classList.add("bad");
    w.textContent = "⚠️ 메모리 저장소로 못 바꿨어요 — 이 브라우저에선 이 페이지가 진짜 저장소를 쓸 수 있어요. 장면 보기를 멈춰 주세요.";
  }
  /* 토글 묶음 — 버튼 + aria-pressed */
  function seg(host, items, get, set) {
    const draw = () => host.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(get()))));
    items.forEach(([v, text]) => {
      const b = el("button", "ck-b", text);
      b.type = "button";
      b.dataset.v = String(v);
      b.addEventListener("click", () => { set(v); draw(); });
      host.appendChild(b);
    });
    draw();
  }

  // ═══════════════════════════════ 🎮 미니게임 연습 ═══════════════════════════════
  const P = { kind: "defend", seen: "rand", weak: "off", ab: "mid", seed: 7000 };
  const AB = { low: 40, mid: 55, high: 75 };
  const POS_OF = { goal: "fw", assist: "mf", defend: "df" };
  const T = { clear: { n: 0, hit: 0 }, dim: { n: 0, hit: 0 }, timeout: 0, n: 0 };
  seg($("ck-kind"), [["goal", "🥅 슈팅"], ["assist", "🅰️ 컷백"], ["defend", "🧱 막기"]], () => P.kind, (v) => { P.kind = v; });
  seg($("ck-seen"), [["rand", "무작위(반반)"], ["clear", "잘 보임"], ["dim", "흐림"]], () => P.seen, (v) => { P.seen = v; });
  seg($("ck-weak"), [["off", "끔"], ["0", "0단계"], ["1", "1단계"], ["2", "2단계"]], () => P.weak, (v) => { P.weak = v; });
  seg($("ck-ab"), [["low", `낮음 ${AB.low}`], ["mid", `보통 ${AB.mid}`], ["high", `높음 ${AB.high}`]], () => P.ab, (v) => { P.ab = v; });
  const condEl = $("ck-cond");
  const condText = () => {
    const g = G.gauge(Number(condEl.value));
    $("ck-condv").textContent = `${g.v} · ${g.label} · 🫀 ×${E.condMul(g.v).toFixed(3)}`;
  };
  condEl.addEventListener("input", condText);
  condText();

  let busy = false;
  async function playBoard() {
    if (busy) return;
    busy = true;
    const go = $("ck-play");
    go.disabled = true;
    const kind = P.kind;
    const pos = POS_OF[kind];
    const stats = {};
    SH.KEYS.forEach((k) => { stats[k] = AB[P.ab]; });
    const row = { me: true, pos, stats, name: "확인" };
    const cond = Number(condEl.value);
    /* 경기 하나의 중심 — `live.js` boardsOf와 같은 창구(`m.autoP(kind, 능력치)`) */
    const m = E.createMatch({ xi: [row], teamStr: 58, oppStr: 58, condition: cond });
    const ab = E.blendOf(row);
    const center = m.autoP(kind, ab);
    const weak = P.weak !== "off";
    const step = weak ? Number(P.weak) : 0;
    const sit = { weak, step, foot: L.footOf(weak, step), cond: E.condMul(cond) };
    const seed = ++P.seed;
    let got = null;
    const judge = (sv) => {
      if (!got) { const v = clamp01(Number(sv)); E._t.seed(seed); got = { s: v, j: E.judgeAtP(kind, center, ab, v) }; }
      return got.j;
    };
    const odds = (sv) => Math.round(100 * E.cardP(center, ab, clamp01(Number(sv))));
    if (kind === "defend" && P.seen !== "rand") M._t.pin({ seen: P.seen });
    const slot = $("ck-board");
    slot.textContent = "";
    $("ck-out").textContent = "";
    const d = await new Promise((done) => {
      try {
        M.play(slot, { kind, sit, odds, judge, foot: weak ? "L" : "R", keeper: "태오",
          fast: $("ck-fast").checked, still: $("ck-still").checked, wide: $("ck-wide").checked }, (j, dd) => done(dd || {}));
      } catch (e) { console.error(e); done({ err: String(e && e.message || e) }); }
    });
    const out = $("ck-out");
    if (d.err || !got) {
      out.textContent = `❌ 판이 판정을 안 했어요 ${d.err || ""}`;
    } else {
      const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : "—");
      const rows = [
        ["시드", `${seed} — 같은 시드 · 같은 s면 같은 결과(엔진 judgeAtP)`],
        ["중심 autoP", `${(center * 100).toFixed(1)}% · 능력치 ${ab.toFixed(1)}(${pos})`],
        ["기본 승산", `${odds(0.5 * sit.foot * sit.cond)}%${weak ? ` (약발 아니면 ${odds(0.5 * sit.cond)}%)` : ""}`],
        ["고른 칸", d.cell == null ? "— (시간 초과)" : `${d.cell + 1}번 → ${odds(got.s)}%`],
        ["s", `${f3(d.sBoard)} × 🦶 ${f3(sit.foot)} × 🫀 ${f3(sit.cond)} = ${f3(got.s)}${Math.abs((d.s || 0) - got.s) > 1e-12 ? " ⚠️ cb s 다름" : ""}`],
        ["정답 칸", kind === "defend" ? `${d.target + 1}번 · ${d.seen === "dim" ? "흐림" : "잘 보임"}` : "없음(감의 판)"],
        ["결과", `${got.j}${d.weak && got.j === "perfect" ? " · 🦶 약발로!" : ""}`],
        ["고름", `${d.ms}ms`],
      ];
      const dl = el("dl");
      rows.forEach(([k, v]) => { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); });
      out.appendChild(dl);
      if (kind === "defend") {
        T.n += 1;
        if (d.cell == null) T.timeout += 1;
        const b = T[d.seen === "dim" ? "dim" : "clear"];
        b.n += 1;
        if (d.cell === d.target) b.hit += 1;
        const pct = (x) => (x.n ? `${x.hit}/${x.n}(${Math.round((x.hit / x.n) * 100)}%)` : "0/0");
        $("ck-tally").textContent = `🧱 이 자리에서 맞힌 몫 — 잘 보임 ${pct(T.clear)} · 흐림 ${pct(T.dim)} · 시간 초과 ${T.timeout}/${T.n}`;
      }
    }
    go.textContent = "🔁 다시";
    go.disabled = false;
    busy = false;
  }
  $("ck-play").addEventListener("click", playBoard);

  // ═══════════════════════════════ 👁️ 상황 바로 보기 ═══════════════════════════════
  const WHO = { preset: "jiho", gender: "m" };
  const NAME = { jiho: { m: "지호", f: "지호" }, doyun: { m: "도윤", f: "도연" }, haram: { m: "하람", f: "하람" } };
  const PRE = ["jiho", "doyun", "haram"];
  const whoItems = [];
  PRE.forEach((p) => ["m", "f"].forEach((g) => whoItems.push([`${p}-${g}`, `${NAME[p][g]}(${g === "f" ? "여" : "남"})`])));
  seg($("ck-who"), whoItems, () => `${WHO.preset}-${WHO.gender}`, (v) => { const [p, g] = v.split("-"); WHO.preset = p; WHO.gender = g; });
  const who = () => `${WHO.preset}-${WHO.gender}`;
  const nm = () => NAME[WHO.preset][WHO.gender];
  const say = (t) => { $("ck-sout").textContent = t; };

  /* 🧩 가짜 상태 — 게임의 `newState`(진짜) 위에 그 장면에 필요한 사실만 얹어요. 게임의 `S`엔 안 넣어요 */
  function fakeS(o) {
    const S = G.newState({ preset: WHO.preset, gender: WHO.gender, name: nm(), pos: (o && o.pos) || "wg", foot: "R", no: 7, seed: 4242 });
    S.week = (o && o.week) || 1;
    return S;
  }
  const named = (S, c) => (c && c.who === `${S.preset}-${S.gender}` ? Object.assign({}, c, { name: S.name }) : c);
  /* 🏁 한 해를 뛴 판처럼 — 기록 · 대회 · 테스트를 얹고 몸(여섯 칸 같은 값)만 바꿔 **진짜 compute**가 그 구간을 내는 값을 찾아요 */
  function seasonS(week) {
    const S = fakeS({ week });
    Object.assign(S.record, { apps: 14, g: 3, a: 3, d: 18, sN: 14, sSum: 7.9, sAuto: 1 });
    S.world.cup = Object.assign({}, S.world.cup || {}, { done: true, stage: 2 });
    if (week >= 36) S.test = { tech: 4, rating: 7.1 };
    return S;
  }
  function tierS(tier) {
    const S = seasonS(36);
    for (let v = 40; v <= 100; v += 0.5) {
      SH.KEYS.forEach((k) => { S.stats[k] = v; });
      if (SH.compute(S, true).tier === tier) return S;
    }
    return null;
  }
  const TIER_OF_SID = { father: "mid", apply: "high", letter: "top" };
  function doorS(sid) {
    const S = tierS(TIER_OF_SID[sid]);
    if (!S) return null;
    S.story.open.push({ sid, ch: 2, at: 5, f: {} });
    S.story.door = true;
    return S;
  }

  /* 🎬 진짜 게임 입구(메모리 저장소) — 만들기 · 도입 */
  async function gameEntry(toIntro) {
    const wrap = $("ck-w2wrap");
    wrap.hidden = false;
    $("ck-w2note").textContent = toIntro ? "▶️ 게임 입구를 메모리 저장소 위에서 진짜로 돌려 도입까지 갔어요."
      : "✏️ 게임 입구를 메모리 저장소 위에서 진짜로 돌렸어요 — [🎬 시작]을 누르면 도입 한마디로 이어져요.";
    try { window.localStorage.clear(); } catch (e) { /* 메모리 */ }
    G._t.renderEntry();
    const nb = await until(() => document.querySelector("#w2 .w2-new"));
    if (!nb) { say("❌ 입구가 안 그려졌어요"); return; }
    nb.click();
    const idx = PRE.indexOf(WHO.preset) * 2 + (WHO.gender === "f" ? 2 : 1);
    const hero = await until(() => document.querySelector(`#w2-layer .w2o-pick .w2o-hero:nth-child(${idx})`));
    if (!hero) { say("❌ 카드 여섯이 안 떴어요"); return; }
    hero.click();
    const nameIn = await until(() => document.querySelector("#w2 .w2-name"));
    if (!nameIn) { say("❌ 만들기 화면이 안 떴어요"); return; }
    try { nameIn.scrollIntoView({ block: "start" }); } catch (e) { /* 옛 브라우저 */ }
    if (!toIntro) return;
    const click = (sel) => { const b = document.querySelector(sel); if (b) b.click(); };
    click('#w2 .w2-pos [data-v="wg"]');
    click('#w2 .w2-foot [data-v="R"]');
    click("#w2 .w2-start");
    const nx = await until(() => document.querySelector("#w2-layer .w2o-intro"));
    if (!nx) return;
    for (let i = 0; i < 4; i++) {
      if (document.querySelector("#w2-layer .w2o-say:not([hidden])")) break;
      const b = document.querySelector("#w2-layer .w2o-intro .w2o-next:not([hidden])");
      if (b) b.click();
      await wait(300);
    }
  }

  /* 🏟️ 경기 화면 — 진짜 드라이버(`WingerLive.play`) · 🤖 자동(약발 1단계라 「🦶 약발」 꼬리표가 붙을 수 있음) · 📋 약속 줄 */
  function matchView() {
    const S = fakeS({ week: 6 });
    const host = $("ck-match");
    host.textContent = "";
    const box = el("div", "w2-live");
    host.appendChild(box);
    try { box.scrollIntoView({ block: "start" }); } catch (e) { /* 옛 브라우저 */ }
    L.play(box, {
      xi: X.ourXI(S), teamStr: 58, oppStr: 58, condition: 51, homeName: "솔빛고", oppName: "해오름고", myName: S.name,
      foot: "R", pos: "wg", keeper: "태오", chibi: window.Art ? window.Art.chibi(who(), "base") : null,
      promiseLine: "📋 약속: 그 경기의 내 첫 순간을 살린다", scout: null, seed: 31337, auto: true, weak: 1,
    }).then(() => say("🏟️ 경기 끝 — 스코어보드 안 ⚙️ · 첫 내 순간 줄의 「📋 약속이 걸린 순간」 · 🤖 결과 줄의 「🦶 약발」")).catch((e) => say(`❌ ${e.message}`));
  }

  /* 🔔 업적 알림 여러 개 — ⚠️ 견본: 게임의 알림 줄(`game.js` 안 `drainNotes`)은 밖에 안 내놓아서, 같은 공용 `Fx.flash`와 알림 띠를
   *    게임의 시간 값(`W2Game.TUNE.NOTE_MS · NOTE_GAP`)으로 한 번에 하나씩 띄워요(engineer에게 창구를 부탁함) */
  async function notesView() {
    const names = (window.W2Ach && window.W2Ach.LIST ? window.W2Ach.LIST : []).slice(0, 5).map((a) => `🏅 ${a.name || a.id}`);
    let band = document.getElementById("w2-toast");
    if (!band) { band = el("p", "w2-toast"); band.id = "w2-toast"; band.setAttribute("role", "status"); document.body.appendChild(band); }
    const still = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches || G.settings.on("still"); } catch (e) { return false; } };
    for (const t of names) {
      band.textContent = t;
      band.classList.toggle("is-shown", still());
      if (!still() && window.Fx && window.Fx.flash) window.Fx.flash(t);
      await wait(G.TUNE.NOTE_MS);
      band.textContent = "";
      band.classList.remove("is-shown");
      await wait(G.TUNE.NOTE_GAP);
    }
  }

  const SCENES = [
    ["✏️ 캐릭터 만들기", "#13 능력치 배지 줄 · 「장기」 · 🎲 다시 뽑기 · 이름 🎲가 엄지 자리", () => gameEntry(false)],
    ["🗣️ 도입 한마디 셋", "#14 세 버튼이 한 화면에 · 고른 말투로 표정이 바뀜", () => gameEntry(true)],
    ["🤝 가족 카드", "#15 아버지 · 엄마 · 할머니 얼굴 · 「이 이야기의 문은 …에서 열려요」", () => {
      const S = fakeS({ week: 5 });
      const ppl = ST.people(S, 5);
      const opts = ppl.map((p) => ({ k: "who", who: p.who, note: p.note || null, label: `${p.key === "keeper" ? "🧤" : "🏠"} ${p.name}` }))
        .concat([{ k: "back", label: "돌아가기" }]);
      return Sc.card({ kind: "people", id: "people", title: "🤝 누구와 시간을 보낼까요?", body: "올해 끝까지 함께할 가족 이야기 — 하나만 고를 수 있어요",
        who: who(), name: S.name, mood: "base", bg: "bg-field", opts });
    }],
    ...["father", "apply", "letter"].map((sid) => [`🏠 가족 장면 — ${{ father: "🏭 아버지", apply: "🎓 엄마", letter: "✉️ 할머니" }[sid]}`,
      "#15 집 배경(치킨집 · 학원 방 · 바닷가 마당) · 가족 반신 · 도전 %", () => {
        const S = fakeS({ week: 5 });
        S.choice = { k: "people", who: "family", fam: sid };
        const c = EV.roll(S);
        if (!c) { say("이 주엔 그 장면이 안 떠요"); return null; }
        const shown = Object.assign({}, c);
        delete shown.u;
        return Sc.card(named(S, shown));
      }]),
    ["📋 중간 평가서 ① 17주", "#12 11월 문턱 자(중 · 상 · 최상 글자) · 빗금 · 「11월까지 훈련 N주 남음」", () => {
      const S = seasonS(17);
      S.world.cup = Object.assign({}, S.world.cup, { done: false });
      Object.assign(S.record, { apps: 6, g: 1, a: 1, d: 7, sN: 6, sSum: 3.4 });
      const c = SH.compute(S, false);
      return Sc.sheet(Object.assign({ final: false, doors: [], who: who() }, { week: S.week, cols: c.cols, total: c.total, open: c.open, T: c.T, coach: c.coach, memo: c.memo },
        { tier: null, tierName: null, title: "📋 중간 평가서 ①" }));
    }],
    ["📋 중간 평가서 ② 34주", "#12 반쯤 정해진 칸 「+1 아직」 · 테스트만 빗금", () => {
      const S = seasonS(34);
      const c = SH.compute(S, false);
      return Sc.sheet(Object.assign({ final: false, doors: [], who: who() }, { week: S.week, cols: c.cols, total: c.total, open: c.open, T: c.T, coach: c.coach, memo: c.memo },
        { tier: null, tierName: null, title: "📋 중간 평가서 ②" }));
    }],
    ...[["low", "하"], ["mid", "중"], ["high", "상"], ["top", "최상"]].map(([t, n]) => [`🏁 최종 평가서 「${n}」`, "구간 도장 · 스카우트 표정 · 이 구간의 제안", () => {
      const S = tierS(t);
      if (!S) { say(`「${n}」이 나오는 몸 값을 못 찾았어요`); return null; }
      return Sc.sheet(Object.assign({ title: "📋 스카우트 평가서" }, SH.compute(S, true)));
    }]),
    ...["father", "apply", "letter"].map((sid) => [`✉️ 문 — ${{ father: "🏭 중", apply: "🎓 상", letter: "🌏 최상" }[sid]}`,
      "봉투 두 장 · 고른 쪽 테두리 + 「이 길로 간다」", () => {
        const S = doorS(sid);
        if (!S) { say("그 구간을 못 만들었어요"); return null; }
        return Sc.doors(SH.doorsOf(S, TIER_OF_SID[sid]));
      }]),
    ...[["leave", "low", null], ["trainee", "mid", null], ["semi", "mid", "father"], ["pro2", "high", null], ["univ", "high", "apply"], ["pro1", "top", null], ["abroad", "top", "letter"]]
      .map(([id, t, sid]) => [`🎓 엔딩 — ${id}`, "#15 엔딩 배경 · 대사 · 「…기다려요」 한 줄(🔜 두 번 없음)", () => {
        const S = sid ? doorS(sid) : tierS(t);
        if (!S) { say("그 구간을 못 만들었어요"); return null; }
        const door = sid ? SH.doorOf(S) : null;
        return Sc.ending(SH.ending(S, t, door ? door.id : null));
      }]),
    ["🎬 졸업 필름", "장 순서 · 🏅 대표 업적 · 🖊️ 한마디 · 📤 공유(내려받기)", () => {
      const S = tierS("high");
      if (!S) return null;
      S.sheet = SH.compute(S, true);
      S.ending = SH.ending(S, "high", null);
      let film;
      try { film = F.build(S); } catch (e) { say(`❌ 필름 모델을 못 만들었어요 — ${e.message}`); return null; }
      return Sc.film(film);
    }],
    ["⚙️ 설정 · 🔬 베타 측정", "#8 #10 스위치 · 「다른 그로우 게임에도」 · ⏱️ 적용 시점 · 📋 복사(막히면 글이 골라짐)", () => Sc.settings()],
    ["🗑️ 지우기 두 번 확인", "#11 둘째 버튼이 다른 자리 · 연타로 안 지나감(이 페이지의 메모리만 지워요)", async () => {
      const p = Sc.settings();
      const b = await until(() => document.querySelector("#w2-layer .w2s-wipe-go"));
      if (b) { b.scrollIntoView({ block: "center" }); b.click(); }
      return p;
    }],
    ["🔔 업적 알림 여러 개", "#6 한 번에 하나 · 움직임 줄이기면 아래 띠(견본 — 게임 알림 줄과 같은 시간 값)", () => notesView()],
    ["🏟️ 경기 화면 — 📋 약속 · ⚙️ 자리", "#8 스코어보드 안 ⚙️ · 첫 내 순간 「📋 약속이 걸린 순간」 · 🤖 「🦶 약발」 — [🏁 경기 시작]을 눌러요", () => matchView()],
  ];
  const list = $("ck-scenes");
  SCENES.forEach(([title, look, fn]) => {
    const b = el("button", "ck-b ck-item");
    b.type = "button";
    b.appendChild(el("b", null, title));
    b.appendChild(el("span", null, `👁️ 볼 것: ${look}`));
    b.addEventListener("click", () => {
      say(`${title} — ${look}`);
      try { const r = fn(); if (r && r.catch) r.catch((e) => say(`❌ ${e.message}`)); } catch (e) { console.error(e); say(`❌ ${e.message}`); }
    });
    list.appendChild(b);
  });

  /* 🧪 검사 손잡이 */
  window.W2Check = { P, T, playBoard, scenes: SCENES.map((s) => s[0]), open: (i) => SCENES[i][2](), fakeS, tierS, WHO };
})();
