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
  const P = { kind: "defend", weak: "off", ab: "mid", seed: 7000 };
  const AB = { low: 40, mid: 55, high: 75 };
  const POS_OF = { goal: "fw", assist: "mf", defend: "df" };
  /* 고른 칸 분포 — 판 셋 모두 감이라 「맞힌 몫」은 없어요. 이 자리에서 고른 칸(1~6번)만 세요(베타 측정 `cells`와 같은 뜻) */
  const KINDS = [["goal", "🥅 슈팅"], ["assist", "🅰️ 컷백"], ["defend", "🧱 막기"]];
  const T = { goal: [0, 0, 0, 0, 0, 0], assist: [0, 0, 0, 0, 0, 0], defend: [0, 0, 0, 0, 0, 0] };
  const tally = () => {
    $("ck-tally").textContent = `고른 칸(1~6번) — ${KINDS.map(([k, t]) => `${t} ${T[k].join("·")}`).join(" | ")}`;
  };
  seg($("ck-kind"), KINDS, () => P.kind, (v) => { P.kind = v; });
  tally();
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
    const slot = $("ck-board");
    slot.textContent = "";
    $("ck-out").textContent = "";
    const d = await new Promise((done) => {
      try {
        M.play(slot, { kind, sit, odds, judge, foot: weak ? "L" : "R", keeper: WHO.gender === "f" ? "서아" : "태오", world: WHO.gender, me: who(),
          fast: $("ck-fast").checked, still: $("ck-still").checked }, (j, dd) => done(dd || {}));
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
        ["고른 칸", Number.isInteger(d.cell) ? `${d.cell + 1}번 → ${odds(got.s)}%(어느 칸이든 같아요)` : "—"],
        ["s", `${f3(d.sBoard)} × 🦶 ${f3(sit.foot)} × 🫀 ${f3(sit.cond)} = ${f3(got.s)}${Math.abs((d.s || 0) - got.s) > 1e-12 ? " ⚠️ cb s 다름" : ""}`],
        ["단서", `없음(감의 판) · target ${d.target} · seen ${d.seen}`],
        ["결과", `${got.j}${d.weak && got.j === "perfect" ? " · 🦶 약발로!" : ""}`],
        ["고름", `${d.ms}ms`],
      ];
      const dl = el("dl");
      rows.forEach(([k, v]) => { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); });
      out.appendChild(dl);
      if (Number.isInteger(d.cell) && d.cell >= 0 && d.cell < 6) { T[kind][d.cell] += 1; tally(); }
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
    Object.assign(S.record, { apps: 14, g: 3, a: 3, d: 18, cN: 14, cSum: 14 * 62 });
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

  /* 🎲 v4 이벤트 카드(47번 §2 `card.choices`) — ① 견본: 45번 §4 표의 문구 · 숫자를 그대로 옮긴 모양 시험(판정 0 · 고르면 닫힘만)
   *    ② 엔진: 진짜 `W2Events.roll`을 주마다 돌려 선택지가 셋 이상인 카드가 처음 뜨는 판을 보여 줘요(engineer 데이터가 들어온 뒤) */
  const part = (name, v, text) => (text ? { name, v, text } : { name, v });
  const SAMPLE = {
    night: { title: "🦶 불 꺼진 운동장", body: "다들 돌아간 운동장에 골대 하나에만 불이 남아 있다. 공 자루가 발밑에 있다.", who: "me", mood: "fire", bg: "bg-dawn",
      choices: [
        { k: "try", kind: "big", label: "남아서 백 개", p: 60, parts: [part("실력(슈팅)", 4), part("상황", 6, "바람이 잔잔한 밤이에요")], win: [{ stat: "shoot", v: 1 }], lose: [{ stat: "shoot", v: -1 }] },
        { k: "small", kind: "small", label: "오십 개만", p: 65, parts: [part("실력(슈팅)", 4), part("상황", 6, "바람이 잔잔한 밤이에요"), part("작게", 5)], win: [{ stat: "shoot", v: 0.5 }], lose: [{ stat: "shoot", v: -0.5 }] },
        { k: "cert", kind: "sure", label: "들어가서 쉰다", p: null, win: [{ cond: true, v: 3 }] },
        { k: "talk", kind: "talk", label: "{rival}에게 같이 하자고 한다", p: null, win: [{ trust: true, v: 1 }, { flag: "night_rival", v: 0 }] },
      ] },
    boots: { title: "🦶 새 축구화 길들이기", body: "새 축구화가 아직 발에 딱딱하다. 경기까지는 나흘.", who: "me", mood: "base", bg: "bg-field",
      choices: [
        { k: "try", kind: "big", label: "전력 질주를 두 배로", p: 41, parts: [part("실력(스피드)", -3), part("상황", -6)], win: [{ stat: "speed", v: 1 }], lose: [{ stat: "speed", v: -1 }] },
        { k: "small", kind: "small", label: "가볍게 조깅으로 길들인다", p: 46, parts: [part("실력(스피드)", -3), part("상황", -6), part("작게", 5)], win: [{ stat: "speed", v: 0.5 }], lose: [{ stat: "speed", v: -0.5 }] },
        { k: "cert", kind: "sure", label: "경기 날까지 아껴 둔다", p: null, win: [{ cond: true, v: 3 }, { flag: "boots_saved", v: 0 }] },
      ] },
    weak: { title: "🦶 반대발 주간", body: "코치가 이번 주는 반대발 주간이라고 했다. 주발을 쓰면 휘슬이 울린다. 다들 공이 엉뚱한 데로 간다.", who: "coach", mood: "stern", bg: "bg-field",
      choices: [
        { k: "try", kind: "big", label: "한 주 반대발로만", p: 72, parts: [part("실력(드리블)", 10), part("상황", 12)], win: [{ stat: "dribble", v: 1 }], lose: [{ stat: "dribble", v: -1 }] },
        { k: "cert", kind: "sure", label: "훈련 끝나고 30분만 반대발", p: null, win: [{ weak: true, v: 0.2 }] },
        { k: "cert2", kind: "sure", label: "주발을 더 다듬는다", p: null, win: [{ cond: true, v: 3 }] },
        { k: "talk", kind: "talk", label: "코치에게 이유를 묻는다", p: null, win: [{ trust: true, v: 1 }, { flag: "weak_why", v: 0 }] },
      ] },
    promise: { title: "🏟️ 다시 만난 상대", body: "지난번에 진 상대와 다음 경기에서 다시 만난다. 감독이 한마디를 기다린다.", who: "coach", mood: "base", bg: "bg-locker",
      choices: [
        { k: "promise", kind: "big", label: "약속한다", p: null, desc: "최근 3경기 중 2번 해냈어요", win: [{ trust: true, v: 2 }], lose: [{ trust: true, v: -2 }] },
        { k: "promise_small", kind: "small", label: "할 수 있는 만큼 해 보겠다고 한다", p: null, desc: "최근 3경기 중 2번 해냈어요", win: [{ trust: true, v: 1 }], lose: [{ trust: true, v: -1 }] },
        { k: "cert", kind: "sure", label: "평소처럼 준비한다", p: null, win: [], note: "감독은 이미 너를 믿어요" },
      ] },
  };
  function sampleCard(k) {
    const S = fakeS({ week: 9 });
    const c = JSON.parse(JSON.stringify(SAMPLE[k]));
    c.kind = "event";
    c.who = c.who === "me" ? who() : c.who;
    c.choices.forEach((o) => { o.label = o.label.replace("{rival}", S.world && S.world.rivalWho === "minseo" ? "차민서" : "차민재"); });
    return Sc.card(named(S, c)).then((i) => say(`고른 칸: ${i + 1}번(${c.choices[i].kind}) — 견본이라 판정 0`));
  }
  function engineCard() {
    for (let seed = 1; seed < 40; seed++) {
      const S = G.newState({ preset: WHO.preset, gender: WHO.gender, name: nm(), pos: "wg", foot: "R", no: 7, seed });
      for (let w = 2; w < 35; w++) {
        S.week = w;
        let c = null;
        try { c = EV.roll(S); } catch (e) { say(`❌ 엔진 카드 — ${e.message}`); return null; }
        if (c && Array.isArray(c.choices) && c.choices.length >= 3) {
          const shown = Object.assign({}, c);
          delete shown.u;
          say(`🎲 엔진 카드 — 시드 ${seed} · ${w}주 · ${c.id || ""} · 선택지 ${c.choices.length}개`);
          return Sc.card(named(S, shown));
        }
      }
    }
    say("엔진 카드에 선택지 셋 이상(`choices`)이 아직 없어요 — engineer의 v4 데이터가 들어오면 떠요");
    return null;
  }

  const SCENES = [
    ["🎲 이벤트 카드 — 선택지 넷(견본)", "v4 · 🎲 크게 · 🎲 작게(「작게 +5」) · 🌿 확정 · 💬 이야기 · 각 2줄 · 320 × 568에서 스크롤 없음 · 키보드 1~4", () => sampleCard("night")],
    ["🎲 이벤트 카드 — 선택지 셋(견본)", "v4 · 🎲 둘 + 🌿 확정(🫀 · 🔖) · 확률 조각 줄 합 = %", () => sampleCard("boots")],
    ["🎲 이벤트 카드 — 반대발 주간(견본)", "v4 · 🎲 하나 · 🌿 둘 · 💬 · 본문 두 줄 넘치면 「…더 보기」", () => sampleCard("weak")],
    ["🏟️ 이벤트 카드 — 약속 셋(견본)", "v4 · 📋 약속(% 없음 · 「최근 N경기 중 M번」) · 작게 · 잘린 몫(🌿 몫 없이 note만)", () => sampleCard("promise")],
    ["🎲 이벤트 카드 — 엔진(진짜 데이터)", "v4 · `W2Events.roll`이 낸 첫 셋~넷 카드 그대로", () => engineCard()],
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
      Object.assign(S.record, { apps: 6, g: 1, a: 1, d: 7, cN: 6, cSum: 6 * 58 });
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
