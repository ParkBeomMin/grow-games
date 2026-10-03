/* ⚽ 더 윙어 II 1막 「마지막 한 해」 — 입구 · 세이브 · 36주 · 주간 고르기 · 성장 · 컨디션 · 경기 · 공개 테스트 · 졸업
 *
 * 설계 정본: 12번(`[1차 수정]`·`[2차 수정]` 반영본) · 13번(두 세계) · 계약 정본: 25번(파일 담당 · 경계면 · 수치)
 * 확정 계수: 24번 §2 — 조정될 값은 파일마다 맨 위 `TUNE` 한 블록(25번 §5).
 *
 * ── 한 판의 흐름(12번 §2-1) ────────────────────────────────
 *   입구 → 👥 카드 고르기(W2Scenes.pick) → ✏️ 이름 · 🎯 포지션 · 🦶 주발 · 🔢 번호 → 🎬 도입(W2Scenes.intro)
 *   → 36주[ 🗓️ 고르기 한 번 → (그 주의) 🎲 이벤트 · 📖 이야기 장 한 장까지 → (경기 주) ⚽ 90분 ]
 *   → 20·21주 🏆 대회 주간 → 35주 🎯 공개 테스트 → 36주 📋 평가서 → ✉️ 문 → 🎓 엔딩 → 🎬 졸업 필름
 *
 * ── 🔒 지키는 것 ────────────────────────────────────────────
 *  · **한 주의 순서는 실측 장치와 같아요** — 고르기(컨디션 변화) → 그 주의 카드 → 경기(컨디션 −12).
 *    훈련 효율은 **−10 전의 컨디션**으로 재요. 대회 주간은 두 번째 경기부터 +10 회복(22번 §0-1).
 *  · **보이는 값 = 들어가는 값** — 훈련 버튼의 「효율 ×0.52」가 곧 성장에 곱해지는 값이에요(25번 §3 계약 12).
 *    컨디션 게이지의 구간 · 배수도 **판정과 같은 표 하나**(`ZONES` · 엔진 `condMul`)에서 나와요(계약 11).
 *  · **세이브는 단계마다** — 경기는 원자적(중간에 닫으면 그 경기를 처음부터 · 같은 시드라 같은 흐름).
 *    단계의 효과를 적용하는 줄과 「다음 단계로」를 적는 줄은 **await 없이 붙어** 저장돼요 — 두 번 적용되지 않게.
 *  · **판정 흐름에 `Math.random` · `Date`가 없어요** — 모든 굴림은 판 시드(`S.seed`)에서 자리마다 갈라요.
 *    (시드를 처음 만들 때 한 번만 기기 난수를 써요.)
 *  · **세이브는 engineer 소유** — 화면(`W2Scenes`)은 인자로 받은 객체만 읽어요(계약 9). 카드의 판정 난수 `u`는
 *    화면에 안 넘겨요.
 *  · **클릭에서만 화면을 갈아요**(`pointerdown` 금지 — 원칙 ⑥).
 *  · 사람이 친 글자(이름 · 한마디)는 **받는 길목에서 씻고**(`W2World.clean`), 그리는 자리에서 `textContent`로.
 *  · `Number(null) === 0` 주의 — 무입력을 숫자로 접지 않아요(등번호는 `parseInt` + 범위 확인).
 *
 * 스크립트 순서(25번 §4): … → live.js → world.js → events.js → story.js → achieve.js → book.js → sheet.js → film.js → **game.js(맨 끝 — 입구)** */
"use strict";

window.W2Game = (() => {
  /* 🎚️ 조정될 수 있는 상수 — 이 블록만 고칩니다(25번 §5). */
  const TUNE = Object.freeze({
    START_STAT: 48,          // 12번 §8-2 — 시작 능력치(여섯 모두 · 주인공 · 포지션 · 성별 무관)
    STAT_MAX: 100,           // 12번 §5-2 — 1막 상한
    COND_START: 80,          // 12번 §11-1 — 컨디션 시작값
    TRAIN_UP: 4.0,           // 24번 §2 — 훈련 한 번 +4.0 × 효율
    EFF_FLOOR: 20, EFF_SPAN: 60, EFF_MIN: 0.10, EFF_MAX: 1.10,   // 24번 §2 — 효율 clamp((c − 20) ÷ 60, 0.10, 1.10)
    COND_TRAIN: -10, COND_REST: 25, COND_PEOPLE: -3, COND_MATCH: -12,   // 12번 §10-1
    CUP_RECOVER: 10,         // 21번 §2-3 · 24번 §2 — 대회 주간 경기 사이 회복(두 번째 경기부터)
    NAME_MAX: 8,             // 입력 칸 — 한글 8자
  });
  /* 🫀 컨디션 구간 — 엔진 중립(`COND_REF` 51)에 맞춘 다섯(21번 §2-1 · 12번 §5-2) · 51은 가운데 「보통」 무채색 */
  const ZONES = [
    { lo: 0, zone: "exhausted", label: "지침" }, { lo: 30, zone: "tired", label: "처짐" },
    { lo: 45, zone: "normal", label: "보통" }, { lo: 60, zone: "good", label: "좋음" }, { lo: 80, zone: "peak", label: "최상" },
  ];
  const SAVE_KEY = "winger2-save-v2";         // 결정 6 — 세이브 키만 새로(게임 키 `winger2`는 그대로)
  const ALUMNI_KEY = "winger2-alumni";        // 12번 §11-3 — 2막을 기다리는 졸업생(최근 10명 · `act1`만)
  const SLOTS_KEY = SAVE_KEY + "-slots";      // 🏠 허브 이어하기 색인 — 허브(`beta/index.html`)는 `<세이브 키>-slots`만 읽어요
  const HOF_KEY = "grow-hof-v1";              // 8종 공유 명예의 전당 — 1막 졸업 항목 `v: 2` · `kind: "act1"`
  const AUTO_KEY = "grow-auto-mini", WIDE_KEY = "grow-wide-judge";   // 8종 공유 기기 키 — 그대로
  const GAME = "winger2";

  const E = () => window.WingerEngine;
  const X = () => window.W2World;
  const SH = () => window.W2Sheet;
  const EV = () => window.W2Events;
  const ST = () => window.W2Story;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const r2 = (v) => Math.round(v * 100) / 100;
  const autoOn = () => { try { return localStorage.getItem(AUTO_KEY) === "1"; } catch (e) { return false; } };
  const flash = (t) => { if (window.Fx && window.Fx.flash) window.Fx.flash(t); };

  /* ---------- 👥 주인공 카드 여섯(13번 §2-1) — 첫 베타는 지호 남 · 여 둘만(25번 §1) ---------- */
  const PRESETS = {
    jiho: { name: { m: "지호", f: "지호" }, line: "뜨겁고 곧장 — 먼저 뛰고 나중에 생각해요", open: true },
    doyun: { name: { m: "도윤", f: "도연" }, line: "차분하고 계산적 — 숫자로 생각하는 선수예요", open: false },
    haram: { name: { m: "하람", f: "하람" }, line: "느긋하고 장난스러움 — 재밌으면 끝까지 가요", open: false },
  };
  const POS_NO = { fw: 9, wg: 7, mf: 8, df: 4 };      // 12번 §3-3 — 포지션 기본 번호

  /* ---------- 💾 세이브 — `winger2-save-v2`(12번 §11) · 마이그레이션 없음 · 읽는 쪽 기본값 ---------- */
  let S = null;
  const blankRecord = () => ({ apps: 0, g: 0, a: 0, d: 0, cs: 0, rSum: 0, moments: { g: { t: 0, p: 0 }, a: { t: 0, p: 0 }, d: { t: 0, p: 0 } },
    hat: 0, perfect: 0, sSum: 0, sN: 0, sAuto: 0, gAll: 0, aAll: 0, momP: 0, rMax: 0, wall3: 0, winner: 0, pkN: 0, pkGoal: 0 });
  function seedNew() {
    try {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0] >>> 0;
    } catch (e) { return Math.floor(Math.random() * 4294967296) >>> 0; }
  }
  function newState(o) {
    const seed = Number.isInteger(o.seed) ? o.seed >>> 0 : seedNew();
    const stats = {};
    for (const k of SH().KEYS) stats[k] = TUNE.START_STAT;
    const now = Date.now();
    const st = {
      v: 2, id: `w2-${now.toString(36)}${(seed % 1296).toString(36)}`, createdAt: now, savedAt: now, act: 1, seed,
      preset: o.preset, gender: o.gender === "f" ? "f" : "m", name: o.name, pos: o.pos, foot: o.foot === "L" ? "L" : "R",
      no: o.no, noOrig: o.no,
      stats, statsAt0: Object.assign({}, stats), cond: TUNE.COND_START, week: 1, ph: 0, choice: null,
      world: X().create(seed, o.pos, o.gender),
      record: blankRecord(), recent: [], games: [], trust: 0,
      ev: null, evCount: 0, evRnd: 0, chCount: 0, evIds: [], evMem: { last: null, scout: [false, false] }, evLog: [], evSeen: {},
      promise: null, promKept: 0,
      story: { open: [], done: [], seen: {}, door: null },
      ach: {}, rep: null, mid: [], sheet: null, ending: null, age: 18, act1: null,
      trainWeeks: 0, restWeeks: 0, peopleWeeks: 0, cupGames: 0, cupFirstCond: null, test: null,
      leagueChamp: false, crown: false, q: [],
    };
    ST().start(st);
    return st;
  }
  /* 읽는 쪽 기본값 — 모양이 깨졌으면 null(깨진 세이브를 연 채로 굴리지 않아요) */
  function loadSave() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
    if (!s || typeof s !== "object" || s.v !== 2 || !s.world || !s.stats || !Object.prototype.hasOwnProperty.call(PRESETS, s.preset)
      || ["fw", "wg", "mf", "df"].indexOf(s.pos) < 0 || !(Number.isInteger(s.week) && s.week >= 1 && s.week <= 36)) return null;
    s.act = s.act || 1;
    s.gender = s.gender === "f" ? "f" : "m";
    s.ph = Number.isInteger(s.ph) && s.ph >= 0 ? s.ph : 0;
    s.record = Object.assign(blankRecord(), s.record || {});
    for (const k of SH().KEYS) if (!(typeof s.stats[k] === "number" && isFinite(s.stats[k]))) s.stats[k] = TUNE.START_STAT;
    s.statsAt0 = s.statsAt0 || Object.assign({}, s.stats);
    s.cond = typeof s.cond === "number" && isFinite(s.cond) ? s.cond : TUNE.COND_START;
    s.recent = Array.isArray(s.recent) ? s.recent : [];
    s.games = Array.isArray(s.games) ? s.games : [];
    s.q = Array.isArray(s.q) ? s.q : [];
    s.trust = Number(s.trust) || 0;
    s.noOrig = s.noOrig != null ? s.noOrig : s.no;
    return s;
  }
  function save() {
    if (!S) return;
    S.savedAt = Date.now();
    let ok = true;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { ok = false; flash("⚠️ 저장 공간이 모자라 저장하지 못했어요"); }
    if (ok) writeIndex(S);                                       // 세이브가 써졌을 때만 — 색인이 세이브를 앞서지 않게
    if (window.Cloud && window.Cloud.touch) window.Cloud.touch();
  }
  /* 🏠 허브 이어하기 색인 `{ main: { name, label, savedAt } }` — 세이브가 있으면 그 세이브로 쓰고, 없거나 못 읽으면 지워요
   * (허브에 유령 카드가 안 남게). 못 쓰면 지워서 **틀린 카드보다 빈자리**가 되게 해요. */
  function writeIndex(sv) {
    try {
      if (sv) localStorage.setItem(SLOTS_KEY, JSON.stringify({ main: { name: sv.name, label: sv.act1 ? "졸업" : `1막 ${sv.week}주`, savedAt: sv.savedAt || 0 } }));
      else localStorage.removeItem(SLOTS_KEY);
    } catch (e) {
      try { localStorage.removeItem(SLOTS_KEY); } catch (e2) { /* 다음 저장 때 맞춰요 */ }
    }
  }

  /* ---------- 🫀 컨디션 · 🏋️ 훈련 효율 — 판정과 같은 표 하나 ---------- */
  const effOf = (c) => r2(clamp((c - TUNE.EFF_FLOOR) / TUNE.EFF_SPAN, TUNE.EFF_MIN, TUNE.EFF_MAX));
  function gauge(c) {
    const v = Math.round(clamp(Number(c) || 0, 0, 100));
    let z = ZONES[0];
    for (const x of ZONES) if (v >= x.lo) z = x;
    return { v, zone: z.zone, label: z.label, mul: r2(E().condMul(v)), eff: effOf(v) };
  }
  const who = () => `${S.preset}-${S.gender}`;
  /* 🪪 주인공이 나오는 카드엔 이 선수 이름을 — 그림 대체 문구가 「지호 — 웃음」이 아니라 플레이어 이름으로(31번 §2) */
  const named = (c) => (c && c.who === who() ? Object.assign({}, c, { name: S.name }) : c);
  const keeperShort = () => X().short(S.world.keeper.name);
  const Art = () => window.Art || null;
  const chibiOf = (w) => { try { return Art() && Art().chibi ? Art().chibi(w, "base") : null; } catch (e) { return null; } };
  const scoutArt = () => { try { return Art() && Art().src ? Art().src("scout", "interest") : null; } catch (e) { return null; } };

  /* ---------- 🎬 화면 조각(director) — `W2Scenes` ----------
   * 🔒 없으면 게임을 **조용히 넘기지 않고** 멈춰서 알려요(선택을 대신 해 주면 안 돼요 — 성별 · 문 · 카드). */
  function sc(name, ...args) {
    const W2 = window.W2Scenes;
    const f = W2 && W2[name];
    if (typeof f !== "function") {
      fail(`화면 조각(${name})을 불러오지 못했어요 — 새로고침해 주세요`);
      return new Promise(() => {});
    }
    try { return Promise.resolve(f.apply(W2, args)); } catch (e) {
      console.error(e);
      fail("화면을 그리다 문제가 생겼어요 — 새로고침해 주세요");
      return new Promise(() => {});
    }
  }
  function fail(msg) {
    const box = root();
    if (!box) return;
    const p = document.createElement("p");
    p.className = "w2-error";
    p.setAttribute("role", "alert");
    p.textContent = `⚠️ ${msg}`;
    box.prepend(p);
  }

  /* ---------- 🧱 DOM 도구 — 글자는 textContent로 ---------- */
  const root = () => document.getElementById("w2");
  function h(tag, cls, text, attrs) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    if (attrs) for (const k of Object.keys(attrs)) el.setAttribute(k, attrs[k]);
    return el;
  }
  function btn(cls, text, onClick, attrs) {
    const b = h("button", `w2-btn ${cls || ""}`.trim(), text, Object.assign({ type: "button" }, attrs || {}));
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }
  function screen(id) {
    const r = root();
    if (!r) return null;
    r.innerHTML = "";
    const s = h("section", "w2-screen", null, { id });
    r.appendChild(s);
    try { window.scrollTo(0, 0); } catch (e) { /* 안 되는 환경도 있어요 */ }
    return s;
  }
  /* 한 번만 풀리는 탭 — 두 번 눌러도 한 번(원칙 ⑥ · click만) */
  const once = (buttons) => new Promise((resolve) => {
    let done = false;
    for (const [b, v] of buttons) b.addEventListener("click", () => {
      if (done || b.disabled) return;
      done = true;
      for (const [x] of buttons) x.disabled = true;
      resolve(v);
    });
  });

  /* ================================================================
   * 🚪 입구 `#w2-entry`
   * ================================================================ */
  function renderEntry() {
    const s = screen("w2-entry");
    if (!s) return;
    s.append(h("h1", "w2-title", "더 윙어 II"), h("p", "w2-sub", "1막 — 마지막 한 해"));
    const count = h("p", "w2-count");
    count.hidden = true;
    s.appendChild(count);
    if (window.Match && window.Match.enabled && window.Match.enabled() && window.Match.count) {
      window.Match.count(GAME).then((n) => {
        if (n) { count.textContent = `⚽ 지금까지 ${Number(n).toLocaleString()}명의 선수가 그라운드를 밟았어요`; count.hidden = false; }
      }).catch(() => {});
    }
    const sv = loadSave();
    writeIndex(sv);                                              // 클라우드로 받은 세이브 · 못 읽는 세이브 · 색인 전 세이브도 여기서 맞춰요
    const acts = h("div", "w2-entry-acts");
    const done = !!(sv && sv.act1 && sv.hofDone);   // 졸업 필름까지 끝났나(필름 도중에 닫았으면 이어서 마저 봐요)
    if (sv && !done) {
      const card = h("div", "w2-save");
      card.append(h("b", "w2-save-name", sv.name), h("span", "w2-save-meta",
        `${SH().POS[sv.pos]} · ${sv.week}주 · ${window.W2Film.dateOf(sv.week).text}`));
      acts.append(card, btn("w2-btn-primary w2-continue", "▶️ 이어하기", () => { S = sv; run(); }));
    } else if (done) {
      const card = h("div", "w2-save w2-save-grad");
      card.append(h("b", "w2-save-name", `🎓 ${sv.name}`), h("span", "w2-save-meta",
        `${SH().endName(sv.act1.ending, sv.gender)}${sv.act1.next ? " · 2막을 기다리는 선수" : " · 1막으로 완결"}`));
      acts.append(card);
      const f = window.W2Film.get(sv.id);
      if (f) acts.append(btn("w2-film-again", "🎬 졸업 필름 다시 보기", () => sc("film", f)));
    }
    acts.append(btn(sv && !done ? "w2-new" : "w2-btn-primary w2-new", "🆕 새로 시작", () => startNew(sv)));
    acts.append(btn("w2-book", "📖 도감", openBook), btn("w2-help", "❓ 도움말", openHelp));
    /* 🔗 기록 연동 — 8종과 같은 이름 · id(`#btn-cloud`)예요. 도움말 「💾 기록 보관」이 이 이름으로 안내해요 */
    if (window.Cloud && window.Cloud.openModal) acts.append(btn("w2-cloud", "🔗 기록 연동", () => window.Cloud.openModal(), { id: "btn-cloud" }));
    s.appendChild(acts);
    const al = alumni();
    if (al.length) s.appendChild(h("p", "w2-alumni", `🎓 2막을 기다리는 선수 ${al.length}명 — 2막이 열리면 여기서 이어가요`));
    s.appendChild(optsBox());
  }
  /* ⚙️ 기기 설정 두 칸 — 🤖 경기 판 자동(`s = 0.5` · 편의 기능이지 벌이 아니에요) · ♿ 판정 넓게(성적 페널티 없음) */
  function optsBox() {
    const box = h("div", "w2-opts");
    const mk = (id, key, text) => {
      const lab = h("label", "w2-opt");
      const c = h("input", null, null, { type: "checkbox", id });
      try { c.checked = localStorage.getItem(key) === "1"; } catch (e) { c.checked = false; }
      c.addEventListener("change", () => { try { localStorage.setItem(key, c.checked ? "1" : "0"); } catch (e) { /* 못 써도 넘어가요 */ } });
      lab.append(c, h("span", null, text));
      return lab;
    };
    box.append(mk("w2-auto", AUTO_KEY, "🤖 경기 판을 자동으로(조작 없이 중립)"), mk("wide-judge", WIDE_KEY, "♿ 판정 창 넓게(+30%)"));
    return box;
  }
  function alumni() {
    try { const a = JSON.parse(localStorage.getItem(ALUMNI_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }

  /* 🆕 새 판 — 2막을 기다리는 졸업생은 `winger2-alumni`로 옮겨요(`act1`만 · 12번 §11-3) */
  async function startNew(prev) {
    if (prev && !(prev.act1 && prev.hofDone) && window.confirm && !window.confirm("진행 중인 1막을 지우고 새로 시작할까요?")) return;
    const cards = [];
    for (const p of ["jiho", "doyun", "haram"]) for (const g of ["m", "f"]) {
      const P = PRESETS[p];
      cards.push({ preset: p, gender: g, who: `${p}-${g}`, name: P.name[g], line: P.line, locked: !P.open,
        lockText: P.open ? null : "다음 업데이트에서 만나요" });
    }
    const got = await sc("pick", cards);
    const ok = got && PRESETS[got.preset] && PRESETS[got.preset].open && (got.gender === "m" || got.gender === "f");
    if (!ok) { renderEntry(); fail("고를 수 있는 카드가 아니었어요 — 다시 골라 주세요"); return; }
    const made = await renderCreate(got.preset, got.gender);
    if (!made) { renderEntry(); return; }
    if (prev && prev.act1 && prev.act1.next) {
      const al = alumni().concat([Object.assign({ id: prev.id, savedAt: prev.savedAt }, prev.act1)]).slice(-10);
      try { localStorage.setItem(ALUMNI_KEY, JSON.stringify(al)); } catch (e) { /* 못 써도 새 판은 시작해요 */ }
    }
    S = newState(made);
    save();
    if (window.Match && window.Match.register) window.Match.register(GAME, S.name);
    if (window.Stats && window.Stats.log) window.Stats.log("new_player", { preset: S.preset, g: S.gender, pos: S.pos });
    run();
  }
  /* ✏️ 이름 · 🎯 포지션 · 🦶 주발 · 🔢 번호 — 포지션 · 주발은 **기본값 없이** 고르게 해요(고른 게 판을 가르니까요) */
  function renderCreate(preset, gender) {
    const s = screen("w2-entry");
    s.classList.add("w2-create");
    s.appendChild(h("h2", "w2-create-title", "✏️ 선수 만들기"));
    const nameLab = h("label", "w2-field");
    const name = h("input", "w2-name", null, { type: "text", maxlength: String(TUNE.NAME_MAX), autocomplete: "off" });
    name.value = PRESETS[preset].name[gender];
    nameLab.append(h("span", null, "이름"), name);
    const posBox = h("div", "w2-seg w2-pos", null, { role: "group", "aria-label": "포지션" });
    const footBox = h("div", "w2-seg w2-foot", null, { role: "group", "aria-label": "주발" });
    const noLab = h("label", "w2-field");
    const no = h("input", "w2-no", null, { type: "number", min: "1", max: "99", inputmode: "numeric" });
    noLab.append(h("span", null, "등번호"), no);
    const msg = h("p", "w2-form-msg", "", { "aria-live": "polite" });
    const go = btn("w2-btn-primary w2-start", "🎬 시작");
    const back = btn("w2-back", "← 다시 고르기");
    let pos = null, foot = null, noTouched = false;
    no.addEventListener("input", () => { noTouched = true; });
    const seg = (box, list, onPick) => list.forEach(([v, text]) => {
      const b = btn("w2-seg-btn", text, () => {
        box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        onPick(v);
      }, { "aria-pressed": "false", "data-v": v });
      box.appendChild(b);
    });
    seg(posBox, [["fw", "⚽ 공격수"], ["wg", "🌀 윙어"], ["mf", "🎯 미드필더"], ["df", "🧱 수비수"]], (v) => {
      pos = v;
      if (!noTouched) no.value = String(POS_NO[v]);
    });
    seg(footBox, [["L", "🦶 왼발"], ["R", "🦶 오른발"]], (v) => { foot = v; });
    s.append(nameLab, h("p", "w2-field-label", "🎯 포지션"), posBox, h("p", "w2-field-label", "🦶 주발"), footBox, noLab, msg, go, back);
    return new Promise((resolve) => {
      back.addEventListener("click", () => resolve(null));
      go.addEventListener("click", () => {
        const nm = X().clean(name.value, TUNE.NAME_MAX);
        const raw = String(no.value).trim();
        const n = /^\d{1,2}$/.test(raw) ? parseInt(raw, 10) : NaN;          // 🔒 빈칸을 0으로 접지 않아요
        if (!nm) { msg.textContent = "이름을 한 글자 이상 적어 주세요"; name.focus(); return; }
        if (!pos) { msg.textContent = "포지션을 골라 주세요"; return; }
        if (!foot) { msg.textContent = "주발을 골라 주세요"; return; }
        if (!(Number.isInteger(n) && n >= 1 && n <= 99)) { msg.textContent = "등번호는 1~99 사이 숫자예요"; no.focus(); return; }
        go.disabled = true;
        resolve({ preset, gender, name: nm, pos, foot, no: n });
      });
    });
  }

  /* ================================================================
   * 🗓️ 36주 — 주마다 단계 목록(`S.ph`가 다음 단계를 가리켜요)
   * ================================================================ */
  const LEAGUE = () => X().LEAGUE_WEEKS;
  function stepsOf(w) {
    if (w === 20) return ["cup"];
    if (w === 21) return ["ko"];
    if (w === 36) return ["final"];
    const out = [];
    if (w === 1) out.push("intro");
    if (w === 34) out.push("close");                 // 🔥 결말(34주)
    if (w === 17 || w === 34) out.push("mid");       // 📋 중간 평가서 ① · ②
    out.push("choose");
    if (w !== 1 && w !== 35) out.push("card");
    if (LEAGUE().indexOf(w) >= 0) out.push("match");
    if (w === 35) out.push("test");
    if (w === 25 || w === 32 || w === 33) out.push("close");   // 📍 25 · 🏠 32 · 🕯️ 33(리그 끝)
    return out;
  }
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    try {
      for (;;) {
        if (S.act1 && S.hofDone) { running = false; renderEntry(); return; }
        const steps = stepsOf(S.week);
        if (S.ph >= steps.length) {
          S.week += 1; S.ph = 0; S.choice = null;
          save();
          continue;
        }
        const was = `${S.week}:${S.ph}`;
        await STEP[steps[S.ph]]();
        if (!running) return;                        // 🚪 입구로 나갔어요(또는 졸업 — 입구가 이미 그려졌어요)
        if (`${S.week}:${S.ph}` === was) { running = false; return; }   // 화면이 갈려 경기가 끊겼어요 — 다음 진입에서 이 단계부터
      }
    } catch (e) {
      console.error(e);
      running = false;
      fail("진행 중에 문제가 생겼어요 — 새로고침하면 이 주의 처음부터 이어가요");
    }
  }
  /* 쌓아 둔 카드(이야기 결말 등)를 하나씩 — 다시 열어도 남은 것부터(`S.q`) */
  async function drainQ() {
    while (S.q && S.q.length) {
      await sc("card", named(S.q[0]));
      S.q.shift();
      save();
    }
  }
  const announce = (ids) => {
    for (const id of ids || []) {
      const d = window.W2Ach.LIST.find((x) => x.id === id);
      if (d) flash(`🏅 ${window.W2Ach.TIER_ICON[d.tier] || ""} ${d.name}`);
    }
  };
  const achCheck = () => { announce(window.W2Ach.check(S)); save(); };

  const STEP = {
    /* 🎬 도입 — 같은 사건(3년 달던 번호가 1학년 {rival}에게)을 주인공마다 다른 자리에서(12번 §3-3) */
    async intro() {
      await sc("intro", introCtx());
      S.no = null;                       // 번호를 잃었어요 — 📍 「번호를 되찾은 날」이면 돌아와요(`noOrig`는 그대로)
      S.ph += 1; save();
    },
    /* 📋 중간 평가서 — **그 시점의 사실**만(12번 §6-4) · 한 번 얼려 두고 다시 열면 같은 장 */
    async mid() {
      let m = (S.mid || []).find((x) => x.week === S.week);
      if (!m) {
        const c = SH().compute(S, false);
        m = { week: S.week, cols: c.cols, total: c.total, tier: c.tier, coach: c.coach, memo: c.memo };
        S.mid = (S.mid || []).concat([m]);
        save();
      }
      await sc("sheet", Object.assign({ final: false, doors: [], who: who() }, m, { tierName: SH().TIER_NAME[m.tier],
        title: `📋 중간 평가서 ${S.week === 17 ? "①" : "②"}` }));
      S.ph += 1; save();
    },
    /* 🗓️ 고르기 한 번 — 훈련(여섯) · 🛌 휴식 · 🤝 사람 */
    async choose() {
      const choice = await renderHome();
      if (!choice) return;
      const before = choice.k === "train" ? SH().grade(S.stats[choice.stat]).g : null;
      if (choice.k === "train") {
        const e = effOf(S.cond);                                   // 🔒 −10 **전**의 컨디션 · 버튼에 적힌 그 값
        S.stats[choice.stat] = r2(Math.min(TUNE.STAT_MAX, S.stats[choice.stat] + TUNE.TRAIN_UP * e));
        S.cond = clamp(S.cond + TUNE.COND_TRAIN, 0, 100);
        S.trainWeeks += 1;
      } else if (choice.k === "rest") {
        S.cond = clamp(S.cond + TUNE.COND_REST, 0, 100);
        S.restWeeks += 1;
      } else {
        S.cond = clamp(S.cond + TUNE.COND_PEOPLE, 0, 100);
        S.peopleWeeks += 1;
      }
      S.choice = choice;
      S.ph += 1; save();
      if (choice.k === "train") await gradeCard(choice.stat, before);
      achCheck();
    },
    /* 🎲📖 그 주의 카드 한 장 — 이야기 장이 먼저(12번 §7-2) · 🔒 굴림과 「다음 단계」가 한 덩어리로 저장돼요 */
    async card() {
      if (!S.ev) {
        S.ev = EV().roll(S);
        if (!S.ev) { S.ph += 1; save(); return; }
        save();
      }
      const ev = S.ev;
      const shown = Object.assign({}, ev);
      delete shown.u;                                             // 판정 난수는 화면에 안 넘겨요
      let i = await sc("card", named(shown));
      if (!(Number.isInteger(i) && i >= 0 && i < ev.opts.length)) {
        console.error("W2Scenes.card(): 고른 칸이 이상해요 — 확정으로 받아요", i);
        i = Math.max(0, ev.opts.findIndex((o) => o.k === "safe"));
      }
      const o = ev.opts[i];
      const stat = o.k === "try" && o.stake !== "trust" ? o.stake : null;
      const before = stat ? SH().grade(S.stats[stat]).g : null;
      const res = EV().answer(S, i);
      S.ph += 1; save();
      if (res) await sc("card", named(res));
      if (stat) await gradeCard(stat, before);
      achCheck();
    },
    /* ⚽ 권역 리그 한 판 */
    async match() {
      const w = S.week;
      const o = X().oppOf(S, w);
      const ri = X().roundOf(w);
      const key = X().KEY.league(ri, 0);
      const head = `🏟️ ${S.world.league.name} ${ri + 1}라운드 · ${o.home ? "홈" : "원정"} — vs ${o.name}${o.ace ? " 🔥" : ""}`;
      const { info, rr, host } = await playLive(key, { oppName: o.name, oppStr: o.str, head });
      if (!info) return;
      const rivalR = rivalRating(info, rr);
      X().afterOurLeague(S, w, info);                              // 🔒 엔진 난수원을 이어 써요 — 남의 경기보다 먼저
      const others = X().otherLeague(S, w);
      const lines = official(info, { t: "L", opp: o.name, rivalR });
      S.cond = clamp(S.cond + TUNE.COND_MATCH, 0, 100);
      S.ph += 1; save();
      achCheck();
      const T = S.world.league.teams;
      if (others.length) lines.push(`같은 라운드 — ${others.map((m) => `${T[m.x].name} ${m.gf} : ${m.ga} ${T[m.y].name}`).join(" · ")}`);
      await afterBlock(host, info, lines);
    },
    /* 🏆 대회 주간 ① — 조별 3경기(두 번째부터 +10 회복) → 조 2위까지 16강 */
    async cup() {
      const C = S.world.cup;
      if (!C.auto) { X().cupGroupsAuto(S); C.auto = true; save(); }
      const games = X().ourGroupGames(S);
      for (let n = 0; n < games.length; n++) {
        const gm = games[n];
        if (C.res[gm.key]) continue;
        const head = `🏆 ${C.name} 조별 ${n + 1}차전 — vs ${gm.opp.name}`;
        const r = await cupLive(gm.engineKey, gm.opp, head);
        if (!r.info) return;
        const info = r.info;
        const lines = official(info, { t: "C", opp: gm.opp.name, rivalR: rivalRating(info, r.rr) });
        C.res[gm.key] = gm.usFirst ? { a: "US", b: gm.opp.id, ga: info.teamGoals, gb: info.oppGoals, winA: info.teamGoals > info.oppGoals }
          : { a: gm.opp.id, b: "US", ga: info.oppGoals, gb: info.teamGoals, winA: info.oppGoals > info.teamGoals };
        save();
        achCheck();
        await afterBlock(r.host, info, lines);
      }
      const tb = X().groupTable(S, 0);
      const rank = tb.findIndex((t) => t.id === "US") + 1;
      if (!C.groupDone) {
        C.groupDone = true;
        if (rank <= 2) C.stage = 1; else { C.stage = 0; C.out = true; C.done = true; }
      }
      S.ph += 1; save();
      achCheck();
      await cupTable(tb, rank);
    },
    /* 🏆 대회 주간 ② — 16강부터 단판(비기면 🥅 승부차기 — 내 킥은 첫 번째 한 번만 판) */
    async ko() {
      const C = S.world.cup;
      if (!C.bracket) { C.bracket = X().bracket(S); C.ko = []; save(); }
      for (let rd = C.ko.length; rd < 4; rd++) {
        const pairs = rd === 0 ? C.bracket : C.ko[rd - 1].next;
        if (!pairs || !pairs.length) break;
        const res = pairs.map(([a, b], i) => (a === "US" || b === "US" ? null
          : X().autoCup(S, X().cupTeam(S, a), X().cupTeam(S, b), X().KEY.ko(rd, i), true)));
        const i = res.indexOf(null);
        if (i < 0) { C.ko.push({ rd, res, next: nextPairs(res) }); save(); continue; }
        const [a, b] = pairs[i];
        const opp = X().cupTeam(S, a === "US" ? b : a);
        const key = X().KEY.ko(rd, i);
        const r = await cupLive(key, opp, `🏆 ${C.name} ${X().KO_NAME[rd]} — vs ${opp.name}`);
        if (!r.info) return;
        const info = r.info;
        const lines = official(info, { t: "C", opp: opp.name, rivalR: rivalRating(info, r.rr) });
        let win = info.teamGoals > info.oppGoals, pk = null;
        if (info.teamGoals === info.oppGoals) {
          pk = await shootout(r.host, key);
          win = pk.winA;
          lines.push(`🥅 승부차기 ${pk.a} : ${pk.b} — ${win ? "이겼어요!" : "졌어요"} · 내 킥 ${pk.mine ? "⚽ 성공" : "😣 실패"}`);
        }
        const usA = a === "US";
        res[i] = { a, b, ga: usA ? info.teamGoals : info.oppGoals, gb: usA ? info.oppGoals : info.teamGoals,
          winA: usA ? win : !win, pk: pk ? (usA ? [pk.a, pk.b] : [pk.b, pk.a]) : null };
        if (win) C.stage = rd + 2; else { C.out = true; C.done = true; }
        if (win && rd === 3) C.done = true;
        C.ko.push({ rd, res, next: nextPairs(res) });
        save();
        achCheck();
        await afterBlock(r.host, info, lines.concat([C.out ? `🏆 ${C.name} — 여기까지(${X().STAGE_NAME[C.stage]})`
          : rd === 3 ? `🏆 ${C.name} 우승!` : `🏆 ${X().KO_NAME[rd + 1]} 진출!`]));
      }
      C.done = true;
      const fin = C.ko[C.ko.length - 1];
      const r0 = fin && fin.res.length === 1 ? fin.res[0] : null;
      C.champ = r0 ? (r0.winA ? r0.a : r0.b) : null;
      S.ph += 1; save();
      achCheck();
      const champ = C.champ ? X().cupTeam(S, C.champ) : null;
      await notice("🏆 대회가 끝났어요", `${C.name} 우승 — ${champ ? champ.name : "?"} · 우리는 ${X().STAGE_NAME[C.stage]}`);
    },
    /* 🎯 11월 공개 테스트 — 기술 판 3번 + 연습경기 90분(12번 §5-4) · 평가서 🎯 칸(가장 작은 몫) */
    async test() {
      const host = matchShell(`🎯 ${S.world.test.name}`);
      const slot = h("div", "w2-tech");
      host.parentNode.insertBefore(slot, host);
      const kinds = SH().TECH[S.pos] || SH().TECH.fw;
      const blend = E().blendOf({ pos: S.pos, stats: S.stats });
      let pts = 0;
      const techBoards = [];
      for (let i = 0; i < kinds.length; i++) {
        slot.innerHTML = "";
        slot.appendChild(h("p", "w2-tech-head", `🎯 기술 테스트 ${i + 1}/${kinds.length}`));
        const at = h("div", "w2-tech-slot");
        slot.appendChild(at);
        const kind = kinds[i];
        const center = SH().techCenter(kind, blend);
        E()._t.seed(X().engineSeed(S.seed, X().KEY.tech(i)));
        const got = await board(at, kind, (s) => E().judgeAtP(kind, center, blend, s));
        const p = got.judge === "perfect" ? 2 : got.judge === "ok" ? 1 : 0;
        pts += p;
        techBoards.push({ kind, s: got.s, judge: got.judge });
        slot.appendChild(h("p", `w2-tech-res w2-tech-${got.judge}`,
          `${got.judge === "perfect" ? "✨ 완벽" : got.judge === "ok" ? "🙂 괜찮아요" : "😣 아쉬워요"} +${p}점`));
        await tapNext(slot, i + 1 < kinds.length ? "다음 판 →" : "연습경기로 →");
      }
      slot.remove();
      const rr = X().rngOf(S.seed, X().KEY.rate(X().KEY.test), X().SALT.rate);
      const info = await window.WingerLive.play(host, {
        xi: X().testXI(S), teamStr: X().TUNE.TEST_STR, oppStr: X().TUNE.TEST_STR, condition: S.cond,
        homeName: "선발팀 A", oppName: "선발팀 B", myName: S.name, pos: S.pos, foot: S.foot, keeper: null,
        chibi: chibiOf(who()), promiseLine: null, scout: scoutArt(),
        seed: X().engineSeed(S.seed, X().KEY.test), auto: autoOn(), rate: (res) => X().rate(res, S.pos, rr),
      });
      if (!info) return;
      const R = S.record;                                         // 연습경기 — 공식 기록 밖(업적 g1 · g7 · a7 · hat · r9 · mom10만)
      R.gAll += info.myGoals; R.aAll += info.assists; R.momP += info.mineSuccess;
      if (info.rating > R.rMax) R.rMax = info.rating;
      if (info.myGoals >= 3) R.hat += 1;
      S.test = { tech: pts, techBoards, rating: info.rating, g: info.myGoals, a: info.assists, d: info.defense };
      S.games.push({ w: S.week, t: "T", opp: "선발팀 B", gf: info.teamGoals, ga: info.oppGoals, res: info.res,
        g: info.myGoals, a: info.assists, d: info.defense, r: info.rating, sv: info.saved });
      S.cond = clamp(S.cond + TUNE.COND_MATCH, 0, 100);
      S.ph += 1; save();
      achCheck();
      await afterBlock(host, info, [`🎯 기술 테스트 ${pts}/6점 · 연습경기 평점 ${info.rating.toFixed(1)}`, "📋 스카우트 평가서는 다음 주에 나와요"]);
    },
    /* 📍🏠🕯️🔥 이야기 결말(과 리그 끝 · 33주) — 🔒 닫기와 카드 쌓기를 한 덩어리로 저장해요(다시 열면 남은 카드부터) */
    async close() {
      if (S.closed !== S.week) {
        if (S.week === 33) {
          S.leagueChamp = X().table(S)[0].k === 0;
          S.crown = X().ranking(S)[0].me === true;
        }
        const cards = ST().closeDue(S, S.week);
        for (const c of cards) if (c.sid === "slot" && c.end === "took") S.no = S.noOrig;
        S.q = (S.q || []).concat(cards);
        S.closed = S.week;
        save();
        achCheck();
      }
      await drainQ();
      S.ph += 1; save();
    },
    /* 📋 → ✉️ → 🎓 → 🎬 — 한 번씩 얼려요(다시 열면 같은 평가서 · 같은 엔딩) */
    async final() {
      if (!S.sheet) {
        EV().endAct(S);
        S.q = (S.q || []).concat(ST().endAct(S));
        S.sheet = SH().compute(S, true);
        save();
      }
      await drainQ();
      await sc("sheet", Object.assign({ title: "📋 스카우트 평가서" }, S.sheet));
      if (!S.ending) {
        const doors = S.sheet.doors || [];
        let pick = doors[0] ? doors[0].id : null;
        if (doors.length > 1 && doors.every((d) => d.open)) {
          const got = await sc("doors", doors);
          pick = doors.some((d) => d.id === got && d.open) ? got : doors[0].id;
        }
        const end = SH().ending(S, S.sheet.tier, pick);
        const d = SH().DOOR[S.preset];
        S.ending = Object.assign({}, end, { door: !!(d && end.id === d.id) });
        if (window.W2Book) { window.W2Book.mark("end", end.id, S.gender); window.W2Book.mark("grad", who()); }
        save();
        /* 🏅 판정은 여기서(그대로) · 알림은 **필름이 끝난 뒤** — 엔딩 장면 위에 1.6초 겹치지 않게(31번 §5).
         *    세이브에 남겨 둬서 필름 도중에 닫았다 열어도 알림 개수가 그대로예요 */
        S.achPend = (Array.isArray(S.achPend) ? S.achPend : []).concat(window.W2Ach.check(S));
        save();
        if (window.Stats && window.Stats.log) window.Stats.log("ending", { id: end.id, tier: end.tier, total: S.sheet.total });
      }
      await sc("ending", S.ending);
      let film = window.W2Film.get(S.id);
      if (!S.act1 || !film) {
        film = window.W2Film.build(S);
        window.W2Film.put(film);
        if (!S.act1) S.act1 = SH().freeze(S, film.id);
        save();
      }
      const out = await sc("film", film);
      announce(Array.isArray(S.achPend) ? S.achPend : []);
      S.achPend = [];                                             // enshrine이 저장해요
      enshrine(out);
    },
  };

  /* 🔢 승급 카드 — 등급 글자가 **오르는** 순간(「⚽ 슈팅 C → C+」 · 12번 §5-2) */
  async function gradeCard(k, before) {
    const after = SH().grade(S.stats[k]).g;
    if (before == null || after === before) return;
    const iOf = (g) => SH().GRADES.findIndex((x) => x[0] === g);
    if (iOf(after) <= iOf(before)) return;
    const d = SH().STAT[k];
    await sc("grade", { k, label: `${d.emoji} ${d.name}`, from: before, to: after });
  }

  /* ---------- ⚽ 경기 공통 ---------- */
  function matchShell(head) {
    const s = screen("w2-match");
    s.appendChild(h("p", "w2-match-head", head));
    const live = h("div", "w2-live");
    s.appendChild(live);
    return live;
  }
  async function playLive(key, o) {
    const host = matchShell(o.head);
    const rr = X().rngOf(S.seed, X().KEY.rate(key), X().SALT.rate);
    const info = await window.WingerLive.play(host, {
      xi: X().ourXI(S), teamStr: X().TUNE.US_STR, oppStr: o.oppStr, condition: o.condition != null ? o.condition : S.cond,
      homeName: S.world.school.name, oppName: o.oppName, myName: S.name, pos: S.pos, foot: S.foot, keeper: keeperShort(),
      chibi: chibiOf(who()), promiseLine: EV().promiseLine(S), scout: null,
      seed: X().engineSeed(S.seed, key), auto: autoOn(), rate: (res) => X().rate(res, S.pos, rr),
    });
    return { info, rr, host };
  }
  /* 🏆 대회 경기 — 🔒 회복(+10)은 **두 번째 경기부터** · 경기가 끝나야 반영(원자적 — 다시 열면 회복 전 컨디션에서 다시) */
  async function cupLive(key, opp, head) {
    const cond = S.cupGames > 0 ? clamp(S.cond + TUNE.CUP_RECOVER, 0, 100) : S.cond;
    const r = await playLive(key, { oppName: opp.name, oppStr: opp.str, head, condition: cond });
    if (!r.info) return r;
    if (S.cupGames === 0) S.cupFirstCond = cond;
    S.cupGames += 1;
    S.cond = clamp(cond + TUNE.COND_MATCH, 0, 100);
    return r;
  }
  /* 📍 {rival}의 평점 — 같은 경기 · 같은 평점 난수원의 **두 번째** 값(내 평점 다음) */
  function rivalRating(info, rr) {
    const m = (info.mates || []).find((x) => x.row && x.row.id === "R") || { g: 0, a: 0, d: 0 };
    return X().rate({ myGoals: m.g, assists: m.a, defense: m.d, res: info.res, oppGoals: info.oppGoals }, S.pos, rr);
  }
  /* 공식 경기 한 판의 뒤처리(리그 · 대회) — 기록 · 최근 10경기 · 약속 · 📍 집계 · 직전 경기 메모 · 판 */
  function official(info, o) {
    const R = S.record;
    R.apps += 1; R.g += info.myGoals; R.a += info.assists; R.d += info.defense;
    R.gAll += info.myGoals; R.aAll += info.assists; R.momP += info.mineSuccess;
    if (info.oppGoals === 0) R.cs += 1;
    R.rSum = r2(R.rSum + info.rating);
    if (info.rating > R.rMax) R.rMax = info.rating;
    if (info.myGoals >= 3) R.hat += 1;
    if (info.defense >= 3) R.wall3 += 1;
    if (info.rating >= 10) R.perfect += 1;
    for (const k of ["g", "a", "d"]) { R.moments[k].t += info.moments[k].t; R.moments[k].p += info.moments[k].p; }
    for (const b of info.boards) { R.sSum = Math.round((R.sSum + b.s) * 1e6) / 1e6; R.sN += 1; if (b.auto) R.sAuto += 1; }   // 🤖 = 사람이 안 둔 판
    const dec = (info.cards || []).find((c) => c.decisive);
    if (dec && (dec.credit.g || dec.credit.a)) R.winner += 1;
    const un = (info.cards || []).filter((c) => c.mine).length - info.saved;
    S.recent = S.recent.concat([{ g: info.myGoals, a: info.assists, d: info.defense, ga: info.oppGoals, res: info.res, r: info.rating, sv: info.saved }]).slice(-10);
    S.games.push({ w: S.week, t: o.t, opp: o.opp, gf: info.teamGoals, ga: info.oppGoals, res: info.res,
      g: info.myGoals, a: info.assists, d: info.defense, r: info.rating, sv: info.saved, rv: o.rivalR });
    EV().mem(S).last = { res: info.res, un };
    const lines = [];
    const pr = EV().judge(S, info.saved);
    if (pr) lines.push(`${pr.text}${pr.chips.length ? ` · ${pr.chips.map((c) => `${c.emoji} ${c.text}`).join(" ")}` : ""}`);
    const d = ST().tally(S, info.rating, o.rivalR);
    const slot = ST().openOf(S, "slot");
    if (slot && slot.f.on) {
      const rn = X().short(S.world.ours.find((x) => x.role === "rival").name);
      lines.push(`📍 ${rn} 평점 ${o.rivalR.toFixed(1)} — ${d > 0 ? "이번엔 내가 앞섰어요" : d < 0 ? "이번엔 뒤졌어요" : "같았어요"}(번호 집계 ${slot.f.d > 0 ? "+" : ""}${slot.f.d})`);
    }
    if (info.boards.length) {
      const avg = info.boards.reduce((a, b) => a + b.s, 0) / info.boards.length;
      lines.push(`🎮 판 ${info.boards.length}번 · 평균 ${avg.toFixed(2)}`);
    }
    return lines;
  }
  /* 🎮 판 하나(경기 밖 — 🎯 기술 테스트 · 🥅 승부차기 내 킥) — 🤖 자동이면 중립 s = 0.5 */
  function board(at, kind, judge) {
    const M = window.W2Moment;
    if (autoOn() || !M || !M.play || (M.opens && !M.opens(kind))) return Promise.resolve({ s: 0.5, judge: judge(0.5), auto: true });
    return new Promise((done) => M.play(at, { kind, moment: "oneone", condition: S.cond, foot: S.foot, keeper: keeperShort(), judge },
      (j, d) => done({ s: d && Number.isFinite(d.s) ? d.s : 0.5, judge: j })));
  }
  /* 🥅 승부차기 — 양 팀 5명씩 · 내 킥은 첫 번째 한 번만 판(12번 §5-3) · 🎮 솜씨에 들어가요(22번 §0-1) */
  async function shootout(host, key) {
    const box = h("div", "w2-pk");
    box.appendChild(h("p", "w2-pk-head", "🥅 승부차기 — 첫 번째 키커는 나예요"));
    const at = h("div", "w2-pk-board");
    box.appendChild(at);
    host.appendChild(box);
    const blend = E().blendOf({ pos: S.pos, stats: S.stats });
    E()._t.seed(X().engineSeed(S.seed, X().KEY.pkKick(key)));
    const got = await board(at, "goal", (s) => E().judgeAtP("goal", X().TUNE.PK_P, blend, s));
    at.remove();
    const mine = got.judge === "perfect";
    const R = S.record;
    R.pkN += 1; if (mine) R.pkGoal += 1;
    R.sSum = Math.round((R.sSum + got.s) * 1e6) / 1e6; R.sN += 1; if (got.auto) R.sAuto += 1;
    const pk = X().shootout(X().rngOf(S.seed, X().KEY.pk(key), X().SALT.pk), () => mine);
    const ol = h("ol", "w2-pk-list");
    for (const k of pk.kicks) {
      ol.appendChild(h("li", `w2-pk-kick ${k.side === "A" ? "w2-pk-us" : "w2-pk-them"} ${k.ok ? "w2-pk-ok" : "w2-pk-no"}`,
        `${k.side === "A" ? "우리" : "상대"} ${k.i + 1}번${k.mine ? "(나)" : ""} ${k.ok ? "⚽" : "❌"}`));
    }
    box.append(ol, h("p", "w2-pk-score", `${pk.a} : ${pk.b}`));
    return Object.assign(pk, { mine });
  }
  const nextPairs = (res) => {
    const winners = res.map((r) => (r.winA ? r.a : r.b));
    if (winners.length <= 1) return null;
    const out = [];
    for (let k = 0; k < winners.length; k += 2) out.push([winners[k], winners[k + 1]]);
    return out;
  };
  /* 90′ 뒤 — 결과 · 평점 · 약속 · 집계 줄 + [다음] */
  function afterBlock(host, info, lines) {
    const box = h("div", "w2-after");
    const res = info.res === "W" ? "이겼어요!" : info.res === "D" ? "비겼어요" : "졌어요";
    box.append(h("p", `w2-after-score w2-res-${info.res}`, `${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} — ${res}`),
      h("p", "w2-after-rating", `⭐ 내 평점 ${Number(info.rating).toFixed(1)}`));
    const ul = h("ul", "w2-after-lines");
    for (const t of lines) if (t) ul.appendChild(h("li", null, t));
    box.appendChild(ul);
    const next = btn("w2-btn-primary w2-after-next", "다음 →");
    box.appendChild(next);
    host.appendChild(box);
    try { next.scrollIntoView({ block: "nearest" }); } catch (e) { /* 안 되는 환경도 있어요 */ }
    return once([[next, true]]);
  }
  function tapNext(el, text) {
    const b = btn("w2-btn-primary w2-next", text);
    el.appendChild(b);
    return once([[b, true]]);
  }
  function cupTable(tb, rank) {
    const s = screen("w2-match");
    s.appendChild(h("p", "w2-match-head", `🏆 ${S.world.cup.name} — 1조 최종 순위`));
    const t = h("table", "w2-table w2-cup-table");
    const hr = h("tr");
    for (const c of ["순위", "학교", "승점", "득실", "득점"]) hr.appendChild(h("th", null, c, { scope: "col" }));
    t.appendChild(hr);
    tb.forEach((x, i) => {
      const tr = h("tr", x.id === "US" ? "w2-me" : null);
      for (const c of [String(i + 1), x.name, String(x.pts), String(x.gf - x.ga), String(x.gf)]) tr.appendChild(h("td", null, c));
      t.appendChild(tr);
    });
    s.append(t, h("p", "w2-note", rank <= 2 ? "🎉 조 2위 안 — 16강에 올랐어요!" : "조별 리그에서 여름이 끝났어요. 가을 리그가 남았어요."));
    return tapNext(s, "다음 →");
  }
  const notice = (title, body) => sc("card", { kind: "notice", id: "notice", title, body, opts: [{ k: "ok", label: "확인" }] });

  /* ================================================================
   * 🗓️ 주간 화면 `#w2-home` — 위 ⅓ 반신(director의 portrait) · 아래 버튼 여덟
   * ================================================================ */
  function nextMatchText() {
    const w = S.week;
    if (LEAGUE().indexOf(w) >= 0) {
      const o = X().oppOf(S, w);
      return `이번 주말 🏟️ ${S.world.league.name} ${X().roundOf(w) + 1}라운드 — vs ${o.name}${o.ace ? " 🔥" : ""}`;
    }
    if (w === 35) return `이번 주 🎯 ${S.world.test.name}`;
    const nw = LEAGUE().concat([20, 35]).filter((x) => x > w).sort((a, b) => a - b)[0];
    if (!nw) return "";
    const what = nw === 20 ? `🏆 ${S.world.cup.name}` : nw === 35 ? `🎯 ${S.world.test.name}` : `🏟️ vs ${X().oppOf(S, nw).name}`;
    return `다음 경기까지 ${nw - w}주 — ${what}`;
  }
  /* 반신 표정 — 🔒 판정에 한 톨도 안 닿는 표시(12번 §5-2) */
  function moodNow() {
    if (S.cond < 45) return "tired";
    const last = S.games.length ? S.games[S.games.length - 1] : null;
    if (last && last.w >= S.week - 2) {
      if (last.res === "W" || last.g > 0 || last.sv > 0) return "smile";
      if (last.res === "L") return "down";
    }
    return "base";
  }
  /* 🏋️ 훈련 버튼 여섯 — `{ k, label, grade, next, eff }`(25번 §3 계약 12) · `next` = 다음 등급까지 막대(0~1) */
  function trainButtons() {
    const g = gauge(S.cond);
    return SH().KEYS.map((k) => {
      const d = SH().STAT[k];
      const gr = SH().grade(S.stats[k]);
      return { k, label: `${d.emoji} ${d.name}`, grade: gr.g, next: r2(gr.p), eff: g.eff, v: Math.round(S.stats[k] * 10) / 10, to: gr.next };
    });
  }
  function renderHome() {
    const s = screen("w2-home");
    const portrait = h("div", "w2-portrait");
    s.appendChild(portrait);
    sc("portrait", portrait, { who: who(), mood: moodNow(), bg: "bg-field", name: S.name, week: S.week });
    const g = gauge(S.cond);
    const head = h("div", "w2-head");
    head.append(h("p", "w2-week", `${S.week}주 · ${window.W2Film.dateOf(S.week).text}`), h("p", "w2-next", nextMatchText()));
    const gz = h("div", "w2-gauge", null, { "data-zone": g.zone, role: "meter", "aria-valuemin": "0", "aria-valuemax": "100",
      "aria-valuenow": String(g.v), "aria-label": `컨디션 ${g.v} · ${g.label}` });
    const bar = h("i", "w2-gauge-bar");
    bar.style.width = `${g.v}%`;
    gz.append(bar, h("span", "w2-gauge-text", `🫀 컨디션 ${g.v} · ${g.label} · 경기 ×${g.mul.toFixed(2)}`));
    head.appendChild(gz);
    const notes = [];
    if (S.week === 1) notes.push("훈련은 컨디션이 좋을수록 크게 늘어요 — 버튼의 「효율 ×」가 곧 늘어나는 양이에요");
    for (const t of ST().notes(S, S.week)) notes.push(t);
    for (const t of notes) head.appendChild(h("p", "w2-note", t));
    s.appendChild(head);
    const grid = h("div", "w2-train");
    const pairs = [];
    for (const t of trainButtons()) {
      const b = btn("w2-tbtn", null, null, { "data-k": t.k,
        "aria-label": `${t.label} 훈련 — 지금 ${t.grade}(${t.v}) · 효율 ×${t.eff.toFixed(2)}` });
      const barW = h("span", "w2-tbtn-bar");
      const fillBar = h("i");
      fillBar.style.width = `${Math.round(t.next * 100)}%`;
      barW.appendChild(fillBar);
      b.append(h("span", "w2-tbtn-name", t.label), h("b", "w2-tbtn-grade", t.grade), barW, h("span", "w2-tbtn-eff", `효율 ×${t.eff.toFixed(2)}`));
      grid.appendChild(b);
      pairs.push([b, { k: "train", stat: t.k }]);
    }
    s.appendChild(grid);
    const acts = h("div", "w2-acts");
    const rest = btn("w2-rest", null, null, { "aria-label": `휴식 — 컨디션 +${TUNE.COND_REST}` });
    rest.append(h("span", null, "🛌 휴식"), h("small", null, `컨디션 +${TUNE.COND_REST}`));
    acts.appendChild(rest);
    pairs.push([rest, { k: "rest" }]);
    const ppl = ST().people(S, S.week);
    let pplBtn = null;
    if (ppl.length) {
      pplBtn = btn("w2-people", null, null, { "aria-label": `사람 — 이야기가 준비된 사람 ${ppl.length}명` });
      pplBtn.append(h("span", null, "🤝 사람"), h("small", null, `(${ppl.length})`));
      acts.appendChild(pplBtn);
    }
    s.appendChild(acts);
    s.appendChild(panel());
    const foot = h("div", "w2-foot");
    foot.append(btn("w2-help", "❓ 도움말", openHelp), btn("w2-home-exit", "🚪 입구로", () => { running = false; renderEntry(); }));
    s.appendChild(foot);
    return new Promise((resolve) => {
      let done = false;
      const take = (v) => {
        if (done) return;
        done = true;
        s.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        resolve(v);
      };
      for (const [b, v] of pairs) b.addEventListener("click", () => take(v));
      if (pplBtn) pplBtn.addEventListener("click", async () => {
        if (done) return;
        const opts = ppl.map((p) => ({ k: "who", who: p.who, key: p.key, label: `${p.key === "keeper" ? "🧤" : "🏠"} ${p.name}` }))
          .concat([{ k: "back", label: "돌아가기" }]);
        const i = await sc("card", { kind: "people", id: "people", title: "🤝 누구와 시간을 보낼까요?",
          body: `그 사람의 이야기가 열려요 · 컨디션 ${TUNE.COND_PEOPLE}`, who: who(), name: S.name, mood: "base", bg: "bg-field", opts });
        const o = Number.isInteger(i) ? opts[i] : null;
        if (o && o.k === "who") take({ k: "people", who: o.key });
      });
    });
  }
  /* 📊 기록 · 순위표 — 접힘(기본은 닫힘 · 고르기 화면을 가리지 않게) */
  function panel() {
    const d = h("details", "w2-panel");
    d.appendChild(h("summary", null, "📊 기록 · 순위표"));
    const R = S.record;
    const avg = R.apps ? (R.rSum / R.apps).toFixed(2) : "—";
    d.appendChild(h("p", "w2-rec", `공식 ${R.apps}경기 · ⚽ ${R.g} · 🅰️ ${R.a} · 🧱 ${R.d} · 평균 평점 ${avg} · 🤝 감독 신뢰 ${S.trust > 0 ? "+" : ""}${S.trust}`));
    const t = h("table", "w2-table w2-league");
    const hr = h("tr");
    for (const c of ["순위", "학교", "승점", "득실"]) hr.appendChild(h("th", null, c, { scope: "col" }));
    t.appendChild(hr);
    X().table(S).forEach((x, i) => {
      const tr = h("tr", x.k === 0 ? "w2-me" : x.k === X().TUNE.LEAGUE_STR.length ? "w2-ace-team" : null);
      for (const c of [String(i + 1), x.name, String(x.pts), String(x.gf - x.ga)]) tr.appendChild(h("td", null, c));
      t.appendChild(tr);
    });
    d.appendChild(t);
    const cat = ["골", "도움", "수비"][X().catOf(S.pos)];
    const rk = X().ranking(S);
    const me = rk.findIndex((x) => x.me);
    const top = rk.slice(0, 3).map((x, i) => `${i + 1}. ${x.name}(${x.team}) ${x.v}`).join(" · ");
    d.appendChild(h("p", "w2-rank", `리그 ${cat} 순위 — ${top} · 나 ${me + 1}위(${rk[me].v})`));
    return d;
  }

  /* ---------- 🎬 도입 ctx(12번 §3-3) — 플레이 문장만 포지션 넷으로 갈려요 ---------- */
  /* 표정은 놀람 → 결의(지호) · 평온(도윤) · 웃음(하람) — 12번 §3-3. 마지막 줄이 주인공의 말투예요 */
  const INTRO = {
    jiho: { bg: "bg-home-jiho", place: "치킨집 배달 오토바이 뒤", after: "fire",
      lines: ["배달 오토바이 뒤에서 단톡방을 열었어요. 새 명단 사진이 올라와 있어요.", "{no}번 옆에 적힌 이름 — 1학년 {rival}.", "{posLine}", "…다시 가져오면 되지."] },
    doyun: { bg: "bg-home-doyun", place: "학원 창가", after: "base",
      lines: ["학원 창가, 멀리 운동장 조명이 보여요. 휴대폰에 명단 사진이 떠요.", "{no}번 옆에 적힌 이름 — 1학년 {rival}.", "{posLine}", "번호는 숫자일 뿐이야. …그래도."] },
    haram: { bg: "bg-home-haram", place: "할머니 댁 평상", after: "smile",
      lines: ["할머니 댁 평상, 바닷바람이 불어요. 명단 사진이 늦게 도착했어요.", "{no}번 옆에 적힌 이름 — 1학년 {rival}.", "{posLine}", "에이, 번호가 날 뛰게 하는 건 아니잖아? …아, 좀 아깝다."] },
  };
  const POS_LINE = { fw: "3년 동안 골문 앞 그 자리에서 달던 번호예요.", wg: "3년 동안 측면을 가르며 달던 번호예요.",
    mf: "3년 동안 한가운데 그 자리에서 달던 번호예요.", df: "3년 동안 최종 수비 라인 그 자리에서 달던 번호예요." };
  function introCtx() {
    const I = INTRO[S.preset] || INTRO.jiho;
    const rival = S.world.ours.find((x) => x.role === "rival");
    const vars = { no: S.noOrig, rival: X().short(rival.name), me: S.name, posLine: POS_LINE[S.pos] };
    const text = (t) => X().fill(X().fill(t, { posLine: vars.posLine }), vars);
    const last = I.lines.length - 1;
    return { who: who(), preset: S.preset, gender: S.gender, name: S.name, no: S.noOrig, pos: S.pos, posName: SH().POS[S.pos],
      rival: X().short(rival.name), rivalWho: S.world.rivalWho, bg: I.bg, place: I.place,
      /* 줄마다 { mood, text } — 마지막 줄은 주인공이 말하는 줄(`speaker` · 타이핑) */
      lines: I.lines.map((t, i) => (i === last ? { mood: I.after, text: text(t), speaker: S.name, typed: true }
        : { mood: "surprise", text: text(t) })),
      school: S.world.school.team, league: S.world.league.name };
  }

  /* ---------- 🏛️ 명예의 전당 — 1막 졸업 항목(`v: 2` · `kind: "act1"` · 한 번의 INSERT · 결정 6) ----------
   * 🔒 필름 화면이 `{ word, rep }`로 풀리면 한마디 · 대표 업적을 담아 **한 번에** 올려요(UPDATE 없음).
   *    한마디는 받는 길목에서 씻어요 — 남의 브라우저에서 그려지는 값이에요(원칙 ⑦). 베타는 원격이 꺼져 있어요. */
  function enshrine(out) {
    running = false;
    if (S.hofDone) { renderEntry(); return; }
    const word = out && typeof out === "object" ? X().clean(out.word, 60) : "";
    if (out && out.rep) window.W2Ach.setRep(S, out.rep);
    const entry = { id: S.id, at: Date.now(), game: GAME, v: 2, kind: "act1",
      name: X().clean(S.name, TUNE.NAME_MAX), pos: S.pos, g: S.gender, preset: S.preset,
      no: Number.isInteger(S.no) ? S.no : Number.isInteger(S.noOrig) ? S.noOrig : null,
      ending: S.ending.id, tier: S.sheet.tier, total: S.sheet.total, team: S.world.school.name,
      rep: window.W2Ach.repOf(S), achN: Object.keys(S.ach || {}).length, word, sent: false };
    /* 🎬 고른 대표 업적 · 한마디를 저장해 둔 필름에도 — 「다시 보기」가 고른 그대로 보여요 */
    const film = window.W2Film.get(S.id);
    if (film) { film.head.rep = entry.rep; film.word = word || null; window.W2Film.put(film); }
    try {
      const list = JSON.parse(localStorage.getItem(HOF_KEY) || "[]");
      const arr = Array.isArray(list) ? list.filter((x) => !(x && x.id === entry.id)) : [];
      arr.push(entry);
      localStorage.setItem(HOF_KEY, JSON.stringify(arr));
    } catch (e) { /* 명전은 기념이에요 — 못 써도 판은 끝나요 */ }
    S.hofDone = true;
    save();
    if (window.Match && window.Match.submitHof) {
      window.Match.submitHof(GAME, entry).then((ok) => {
        if (!ok) return;
        try {
          const list = JSON.parse(localStorage.getItem(HOF_KEY) || "[]");
          const e = Array.isArray(list) ? list.find((x) => x && x.id === entry.id) : null;
          if (e) { e.sent = true; localStorage.setItem(HOF_KEY, JSON.stringify(list)); }
        } catch (e) { /* 다음에 다시 올라가요 */ }
      }).catch(() => {});
    }
    renderEntry();
    if (out && out.go === "new") startNew(loadSave());      // 🎬 필름의 「🔁 새 선수 키우기」
  }

  /* ---------- 📖 도감 ---------- */
  function openBook() {
    const B = window.W2Book ? window.W2Book.load() : { ev: {}, end: {}, ach: {}, grad: {} };
    return sc("book", {
      events: EV().LIST.map((e) => Object.assign({}, e, { n: (B.ev[e.id] && B.ev[e.id].n) || 0 })),
      stories: ST().LIST.map((x) => ({ sid: x.sid, emoji: x.emoji, name: x.name, preset: x.preset || null, ends: ST().ends(x.sid) })),
      endings: window.W2Book ? window.W2Book.endings() : [],
      ach: window.W2Ach.LIST.map((a) => Object.assign({}, a, { got: !!B.ach[a.id], n: (B.ach[a.id] && B.ach[a.id].n) || 0 })),
      grads: Object.keys(B.grad || {}),
      rules: EV().rules(),
    });
  }

  /* ---------- ❓ 도움말(공유 help.js) ---------- */
  const HELP = [
    { emoji: "🗓️", title: "한 해 36주", body: "고3의 한 해예요. 매주 한 번 — 훈련(여섯 중 하나) · 🛌 휴식 · 🤝 사람 중 하나를 골라요.\n경기가 있는 주는 고른 뒤 주말에 경기를 해요. 7월 말엔 전국대회, 11월엔 공개 테스트가 있어요." },
    { emoji: "🫀", title: "컨디션과 훈련 효율", body: "훈련은 컨디션을 10 쓰고, 컨디션이 좋을수록 크게 늘어요.\n버튼에 적힌 「효율 ×」가 곧 늘어나는 양이에요 — 지친 채 훈련하면 거의 안 늘어요. 쉬어야 커요.\n경기 날 컨디션은 찬스가 오는 빈도와 판의 판정 창에도 닿아요." },
    { emoji: "🥅", title: "경기의 판", body: "내 순간이 오면 판이 열려요. 골문 6칸 중 가장 밝은 칸을 한 번 누르세요.\n⚽ 결정 · 🅰️ 전개는 상대 골문, 🧱 수비는 우리 골문이에요 — 우리 키퍼가 가까운 쪽을 막으니 먼 쪽 빈 곳으로 몸을 던져요.\n판은 손의 정확도만 재고, 골이 들어갔는지는 경기가 정해요." },
    { emoji: "🎲", title: "이벤트와 약속", body: "화면에 적힌 확률이 곧 판정이에요. 도전은 얻는 것과 잃는 것이 같아서 50%를 넘으면 걸 만해요.\n📋 약속은 다음 공식 경기에서 내 순간을 한 번 이상 살리면 지킨 거예요." },
    { emoji: "📋", title: "평가서와 엔딩", body: "11월에 스카우트 평가서가 나와요 — 몸 · 솜씨 · 기록 · 무대 · 테스트 다섯 칸.\n키운 만큼 높은 구간에 서고, 구간이 엔딩을 정해요. 주인공마다 가족 이야기가 여는 「문」이 하나 있어요." },
    /* 💾 8종 표준 문구 그대로(베타는 `env.js`가 원격을 꺼도 — 운영에서의 실제 동작과 같은 말) + 이 게임의 한 줄 */
    { emoji: "💾", title: "기록 보관", body: "기록은 이 기기의 브라우저에 저장되고, 서버에도 자동 백업돼요.\n"
      + "기기를 바꾸거나 브라우저 데이터를 지우면 이 기기의 기록은 사라져요.\n"
      + "타이틀 화면의 🔗 기록 연동에서 코드를 복사해 두면 새 기기에서 그대로 이어받을 수 있어요.\n"
      + "경기 도중에 닫으면 그 경기는 처음부터 다시 해요." },
  ];
  function openHelp() { if (window.Help && window.Help.open) window.Help.open("⚽ 더 윙어 II 도움말", HELP); }

  /* ---------- 🚀 시작 ---------- */
  function boot() {
    if (!root()) return;
    renderEntry();
    if (window.Stats && window.Stats.init) window.Stats.init(GAME);
    if (window.Cloud && window.Cloud.init) window.Cloud.init(GAME);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  return { TUNE, ZONES, SAVE_KEY, gauge, effOf, stepsOf, newState, loadSave,
    _t: { get S() { return S; }, set S(v) { S = v; }, run, save, official, STEP, trainButtons, renderEntry } };
})();
