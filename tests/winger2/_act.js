/* ⚽ 더 윙어 II 1막 — **한 판을 입구부터 졸업까지** 굴리는 장치 (2026-10-02 · inspector)
 *
 * 🚪 **게임 입구를 통과합니다** — `beta/winger2/index.html`을 진짜 스크립트 순서로 띄우고(`_load.js` `bootPage`)
 *    입구의 [🆕 새로 시작] → 👥 카드 → ✏️ 만들기 폼 → 36주를 **진짜 버튼을 눌러** 지나갑니다.
 *    눌러 보내는 이벤트는 실기기 순서 그대로(`pointerdown` → `pointerup` → `click`).
 *
 * 🧩 갈아 끼우는 것은 **사람 쪽 두 자리**뿐이에요(게임 로직은 한 줄도 안 바꿔요):
 *   ① 🖼️ `W2Scenes`(director의 오버레이) — `realScenes: false`면 **정책 함수가 고르는 스텁**으로.
 *      오버레이는 「사람이 탭해야 풀리는 Promise」라 스텁이 그 탭을 대신합니다. 호출은 전부 `seen`에 남아요
 *   ② 🥅 `W2Moment.play`(판) — `hand(kind)`를 주면 **그 `s`를 낸 것으로** 엔진 창구(`opts.judge`)에 묻습니다.
 *      🔒 `opens`는 **진짜 것을 그대로** 둡니다 — 「판을 여는가」의 주인은 하나(`winger-moment.js`)
 *   🔒 `realScenes: true`면 진짜 `scenes.js`를 띄우고 **오버레이의 버튼을 눌러** 지나갑니다(`flow-test`).
 *
 * 🎲 판 시드 — 게임은 새 판을 만들 때 **한 번만** 기기 난수(`crypto.getRandomValues`)를 씁니다.
 *    그 자리에 정한 시드를 물립니다(그 뒤 판정 흐름의 모든 굴림이 이 시드에서 갈라져요 — `world.js` `SALT`).
 *
 * ⏱️ `fastTimers` — `setTimeout`을 0ms로 뭉갭니다. 경기 시계(`MIN_MS`)·연출 지연만 없어지고
 *    **틱의 개수 · 순서는 그대로**예요(`clock-test`가 그걸 따로 지킵니다).
 *
 * 🔒 이 파일은 **문턱을 하나도 갖지 않습니다** — 굴리고 관측만 돌려줘요. 판정은 각 검사가.
 */
"use strict";
const path = require("path");
const { bootPage, wait } = require("./_load.js");

const KEYS6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];

/* 🖱️ 실기기 순서 — pointerdown → pointerup → click */
function tap(w, el) {
  for (const t of ["pointerdown", "pointerup", "click"]) {
    const e = new w.MouseEvent(t, { bubbles: true, cancelable: true });
    el.dispatchEvent(e);
  }
}

/* 🗓️ 기본 손 — 엔지니어 · balancer 장치의 「보통 판」과 같은 모양(50 밑이면 쉼 · 여섯을 돌아가며 ·
 *    2주 가족 · 3주 키퍼 · 32주 가족) — 🔒 **문턱이 아니라 정책**이에요. 검사는 결과의 **관계**만 봅니다. */
function defaultPolicy(over) {
  const P = Object.assign({ restTh: 50, people: { 2: "family", 3: "keeper", 32: "family" }, train: "even",
    tryAt: 50, promise: true, flag: true }, over || {});
  let idx = 0;
  P.home = P.home || ((S) => {
    const pw = P.people[S.week];
    if (pw && S.__ppl && S.__ppl.indexOf(pw) >= 0) return { k: "people", who: pw };
    if (S.cond < P.restTh) return { k: "rest" };
    if (P.train === "focus") {
      const main = S.__main;
      const k = main.find((x) => S.stats[x] < 100) || KEYS6.find((x) => S.stats[x] < 100);
      return { k: "train", stat: k };
    }
    for (let t = 0; t < 6; t++) {
      const c = KEYS6[(idx + t) % 6];
      if (S.stats[c] < 100) { idx = (idx + t + 1) % 6; return { k: "train", stat: c }; }
    }
    return { k: "rest" };
  });
  P.card = P.card || ((c) => {
    if (!c.opts || !c.opts.length) return 0;
    const f = c.opts.findIndex((x) => x.k === "flag");
    if (f >= 0 && P.flag) return f;
    const t = c.opts.findIndex((x) => x.k === "try");
    if (t >= 0 && c.opts[t].pct >= P.tryAt) return t;
    const p = c.opts.findIndex((x) => x.k === "promise");
    if (p >= 0 && P.promise) return p;
    /* 🔄 v4(47번 · J13): 「넘긴다」가 없어짐 — 걸지 않는 손은 🌿 확정 → 💬 이야기(옛 카드면 넘긴다)로. 안 고치면 첫 칸(🎲 크게)으로 떨어져
     *    「보통 판」이 늘 도전하는 판이 돼요 */
    const s = ["cert", "talk", "safe", "ok"].map((k) => c.opts.findIndex((x) => x.k === k)).find((i) => i >= 0);
    return s != null ? s : 0;
  });
  P.doors = P.doors || ((d) => d[d.length - 1].id);
  P.film = P.film || (() => ({ word: "", go: "close" }));
  return P;
}

/* 🧸 경기 화면 스텁 — `realScene: false`일 때만. 공개 API 이름은 `match-scene.js`와 같아요(계약 2). */
function stubScene(w) {
  let gen = 0, S = null;
  return {
    mount(host, c) { gen += 1; S = { c, fast: false }; host.innerHTML = '<div class="w2-scene"><div class="w2-feed"></div></div>'; },
    gen: () => gen,
    push: (card) => Promise.resolve(card.mine && card.judge == null ? w.document.createElement("div") : null),
    clock: (m, g) => g === gen,
    momentSlot: () => w.document.createElement("div"),
    summary() {}, fast() { if (S) S.fast = true; }, isFast: () => !!(S && S.fast), destroy() { S = null; },
  };
}

/* 🖐️ 판 손 스텁 — 계약 3′(38번 §2 · §6 3′-a~d)과 **같은 모양**으로 판을 흉내 냅니다(그림 0 · 판이 하는 일만).
 *   판이 하는 일: `s = clamp(sBoard × sit.foot × sit.cond)` → `judge(s)` 한 번 → `cb(judge, { s, sBoard, cell, target, seen, weak, ms })`
 *   손(둘 중 하나)
 *     o.hand(kind, opts) → 그 판에서 낸 **칸 값 `sBoard`**(0~1 · 숫자 그대로)
 *     o.operator "sloppy" · "normal" · "skilled" — 37번 §0-3 자리표 그대로: 🧱만 보임(흐림 반 · 판의 `TUNE.DIM`)을 굴린 뒤
 *       맞힘(서툰 ⅙ · ⅙ / 보통 0.48 · 0.24 / 능숙 0.86 · 0.58) · 칸 값은 판의 함수(`W2Moment._t.values`) 그대로(사본 0) · 🥅 · ⚡ 0.5
 *     둘 다 없으면 `sBoard` 0.5
 *   🎲 손의 난수는 판 시드에서 갈라 낸 줄기(mulberry32 — 판 · 엔진 · 상황 난수와 따로)
 *   `slot`이 null이면 진짜 판처럼 🤖(3′-d — `sBoard` 0.5 · `ms` 0 · 손은 안 씀) */
const OPERATOR = { sloppy: [1 / 6, 1 / 6], normal: [0.48, 0.24], skilled: [0.86, 0.58] };
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function boardStub(w, o, note) {
  const real = w.W2Moment;
  const T = (real && real._t) || {};
  /* 🔄 v3(44번 3′ · J9): 판 셋 모두 여섯 칸 0.5 · `target` · `seen` 늘 null — 조작자 자리표(맞힌 몫 · 흐림)는 뜻이 사라져
   *    「아무 칸이나 고름」만 남아요(`operator`는 칸을 고르는 난수만 씀). `hand`는 검사가 판 값을 일부러 줄 때 그대로 */
  const values = T.values || (() => [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const rnd = mulberry(((o.seed == null ? 1 : o.seed) ^ 0x2C1B3C6D) >>> 0);
  const h = OPERATOR[o.operator] || null;
  const clamp01 = (v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  return Object.assign({}, real, {
    play(slot, opts, cb) {
      const sit = opts.sit || {};
      const foot = Number.isFinite(sit.foot) && sit.foot > 0 ? sit.foot : 1, cond = Number.isFinite(sit.cond) && sit.cond > 0 ? sit.cond : 1;
      let sBoard = 0.5, cell = null, target = null, seen = null, ms = 0;
      if (slot) {
        if (typeof o.hand === "function") {
          sBoard = clamp01(Number(o.hand(opts.kind, opts)));
          cell = 0;
        } else if (h) {
          cell = Math.min(5, Math.floor(rnd() * 6));
          sBoard = values(opts.kind, null)[cell];
        } else { sBoard = 0.5; cell = 0; }
        ms = 1000;
      }
      const s = clamp01(sBoard * foot * cond);
      const j = opts.judge(s);
      const b = { kind: opts.kind, s, sBoard, judge: j, cell, target, seen, weak: !!sit.weak, step: sit.step || 0, foot, cond, slot: !!slot, odds: typeof opts.odds === "function" ? opts.odds(s) : null };
      if (note) note(b, opts, slot);
      Promise.resolve().then(() => cb(j, { s, sBoard, cell, target, seen, weak: !!sit.weak, ms }));
    },
  });
}

/* ═══════════════════════════════════════════════════════════════════
 * 🚀 boot — 페이지를 띄우고 사람 쪽 자리를 갈아 끼웁니다
 *   o.seed       판 시드(필수 — 재현)
 *   o.gender     "m" | "f"      o.preset "jiho"(첫 베타에서 열린 것)
 *   o.pos        "fw"·"wg"·"mf"·"df"   o.foot "L"|"R"   o.no 1~99   o.name
 *   o.auto       🤖 경기 판 자동(`grow-auto-mini` = "1")
 *   o.hand       (kind, info) → s ∈ [0,1] — 판의 손. 없으면 0.5
 *   o.realScenes · o.realScene  진짜 오버레이 · 진짜 경기 화면
 *   o.muts       파일별 변이(`bootPage` 그대로) · o.keys 미리 심을 localStorage
 *   o.policy     defaultPolicy(over)의 over
 * ═══════════════════════════════════════════════════════════════════ */
function boot(opt) {
  const o = Object.assign({ gender: "m", preset: "jiho", pos: "wg", foot: "R", no: 11, name: null }, opt || {});
  const keys = Object.assign({}, o.keys || {});
  if (o.auto) keys["grow-auto-mini"] = "1";
  const w = bootPage({ muts: o.muts, keys, fastTimers: o.fastTimers === undefined ? true : o.fastTimers, confirm: true, pageDir: o.pageDir });
  const seen = { pick: [], intro: [], portrait: 0, card: [], grade: [], sheet: [], doors: [], ending: [], film: [], book: [],
    order: [], flash: [], boards: [], live: [] };
  const P = defaultPolicy(o.policy);
  if (o.seed != null) {
    w.crypto.getRandomValues = (a) => { a[0] = o.seed >>> 0; return a; };
  }
  /* 🔔 업적 알림(`Fx.flash`) — **어느 장면 뒤에** 떴는지 남깁니다(엔딩 위에 겹치면 안 돼요 · 26번 §5) */
  if (w.Fx) {
    const raw = w.Fx.flash;
    w.Fx.flash = (t) => { seen.flash.push({ t: String(t), after: seen.order[seen.order.length - 1] || null }); try { if (raw) raw.call(w.Fx, t); } catch (e) { /* 장식 */ } };
  }
  const note = (k) => seen.order.push(k);
  if (!o.realScenes) {
    const S = () => w.W2Game._t.S;
    w.W2Scenes = {
      pick: (cards) => { note("pick"); seen.pick.push(JSON.parse(JSON.stringify(cards))); return Promise.resolve(o.pickAs || { preset: o.preset, gender: o.gender }); },
      intro: (ctx) => { note("intro"); seen.intro.push(JSON.parse(JSON.stringify(ctx))); return Promise.resolve(); },
      portrait: (slot, o2) => { seen.portrait += 1; (seen.portraits || (seen.portraits = [])).push(JSON.parse(JSON.stringify(o2 || {}))); },
      card: (c) => {
        note(`card:${c.kind}`);
        const copy = JSON.parse(JSON.stringify(c));
        copy.__week = S() ? S().week : null;
        seen.card.push(copy);
        if (c.kind === "people") {
          const want = String(o.__peopleWant || "");
          const [wk, wsid] = want.split(":");
          const i = c.opts.findIndex((x) => x.key === wk && (!wsid || x.sid === wsid));
          return Promise.resolve(i >= 0 ? i : c.opts.length - 1);
        }
        const pick = P.card(c, S());
        /* ⏸️ 정책이 `null`을 돌려주면 **사람이 그 카드 앞에서 창을 닫은 것** — 영영 안 풀립니다(새로고침 검사용) */
        return pick === null ? new Promise(() => {}) : Promise.resolve(pick);
      },
      grade: (g) => { note("grade"); seen.grade.push(g); return Promise.resolve(); },
      sheet: (s) => {
        note(s.final ? "sheet:final" : "sheet:mid"); seen.sheet.push(JSON.parse(JSON.stringify(s)));
        /* ⏸️ 정책 `sheetHang(s)`가 참이면 그 평가서 앞에서 창을 닫은 것 — 영영 안 풀림(얼림 검사용) */
        return P.sheetHang && P.sheetHang(s) ? new Promise(() => {}) : Promise.resolve();
      },
      doors: (d) => { note("doors"); seen.doors.push(JSON.parse(JSON.stringify(d))); return Promise.resolve(P.doors(d)); },
      ending: (e) => {
        note("ending");
        /* 🏅 엔딩 장면이 뜬 그 순간 세이브에 이미 든 업적 — 「판정은 엔딩 전에(그대로)」를 보는 자리 */
        seen.ending.push(Object.assign(JSON.parse(JSON.stringify(e)), { __ach: Object.keys((S() && S().ach) || {}) }));
        /* ⏸️ 정책 `endingHang`이 참이면 엔딩 장면에서 창을 닫은 것 */
        return P.endingHang ? new Promise(() => {}) : Promise.resolve();
      },
      film: (f) => {
        note("film"); seen.film.push(JSON.parse(JSON.stringify(f)));
        /* ⏸️ 정책 `filmHang`이 참이면 필름 앞에서 창을 닫은 것 — 영영 안 풀림(업적 알림 검사용) */
        return P.filmHang ? new Promise(() => {}) : Promise.resolve(P.film(f));
      },
      book: (b) => { note("book"); seen.book.push(JSON.parse(JSON.stringify(b))); return Promise.resolve(); },
    };
  }
  if (o.realScene === false) w.W2Scene = stubScene(w);
  /* 🎬 경기 화면을 열 때 넘긴 칸(계약 2)을 남깁니다 — 감싸기만 해요 */
  if (w.W2Scene && w.W2Scene.mount) {
    const rawMount = w.W2Scene.mount;
    seen.mounts = [];
    w.W2Scene.mount = (h, c) => { seen.mounts.push(Object.assign({ week: w.W2Game && w.W2Game._t.S ? w.W2Game._t.S.week : null }, JSON.parse(JSON.stringify(c || {})))); return rawMount(h, c); };
  }
  if (!o.realMoment) {
    w.W2Moment = boardStub(w, o, (b) => seen.boards.push(Object.assign(b, { week: w.W2Game && w.W2Game._t.S ? w.W2Game._t.S.week : null })));
  }
  /* ⚽ 경기 한 판의 결과(`WingerLive.play`가 돌려준 info)를 남깁니다 — 감싸기만 하고 그대로 넘겨요 */
  if (w.WingerLive) {
    const rawPlay = w.WingerLive.play;
    w.WingerLive.play = (host, cfg) => rawPlay(host, cfg).then((info) => {
      seen.live.push({ week: w.W2Game._t.S ? w.W2Game._t.S.week : null, info: JSON.parse(JSON.stringify(Object.assign({}, info, { mates: undefined, cards: (info.cards || []).map((c) => ({ kind: c.kind, mine: c.mine, judge: c.judge, result: c.result, min: c.min, credit: c.credit })) }))), cfg: { condition: cfg.condition, seed: cfg.seed, promiseLine: cfg.promiseLine, oppStr: cfg.oppStr } });
      return info;
    });
  }
  return { w, seen, o, P, tap: (el) => tap(w, el) };
}

/* 🖼️ 진짜 오버레이(`scenes.js`) · 진짜 판(`winger-moment.js`)을 **사람처럼 눌러** 지나갑니다(`realScenes: true`).
 *   맨 위 오버레이 하나만 봐요 — 고르는 것은 정책(`P`)과 같은 규칙을 **화면에 그려진 것**에서 읽어 정해요.
 *   돌려주는 것: 누른 것이 있으면 true */
async function overlay(env, D, press) {
  const { o, P } = env;
  /* 🥅 판 — 준비 ▶️ 한 번 · 칸 한 번(사람의 최소 입력) */
  const mgo = D.querySelector(".w2m-go");
  if (mgo && !mgo.disabled) { press(mgo, "판 준비"); return true; }
  const cells = D.querySelectorAll(".w2m-cell");
  if (cells.length) { press(cells[(env.cellAt = ((env.cellAt || 0) + 1)) % cells.length], "판 칸"); return true; }
  const layer = D.getElementById("w2-layer") || D.body;
  const all = layer.querySelectorAll(".w2o");
  const top = all[all.length - 1];
  if (!top) return false;
  const kind = (top.className.match(/w2o-(pick|intro|ending|card|grade|sheet|doors|film|book)\b/) || [])[1];
  if (kind === "pick") {
    const heroes = [...top.querySelectorAll(".w2o-hero")];
    env.pickSeen = env.pickSeen || heroes.map((b) => ({ locked: b.classList.contains("is-locked"), name: (b.querySelector(".w2o-hero-name") || {}).textContent, world: (b.querySelector(".w2o-hero-world") || {}).className }));
    /* 🔒 잠긴 카드를 한 번 눌러 봐요(한 번만) — 넘어가면 안 돼요 */
    const lockedB = heroes.find((b) => b.classList.contains("is-locked"));
    if (lockedB && !env.lockedTried) { env.lockedTried = true; tap(env.w, lockedB); env.lockToast = (top.querySelector(".w2o-toast") || {}).textContent || ""; env.lockStill = !!D.querySelector(".w2o-pick"); return true; }
    const want = heroes.find((b) => !b.classList.contains("is-locked") && (b.querySelector(".w2o-hero-world") || { className: "" }).className.indexOf(`w-${o.gender}`) >= 0);
    if (want) { press(want, "주인공 카드"); return true; }
    return false;
  }
  if (kind === "intro" || kind === "ending") {
    /* 🗣️ 도입 마지막 한마디 셋(15-a) — 정책 `voice`(0~2) · 없으면 첫째 */
    const say = [...top.querySelectorAll(".w2o-say-opt")];
    if (say.length) { press(say[Math.min(say.length - 1, Number(o.voice) || 0)], "도입 한마디"); return true; }
    const n = top.querySelector(".w2o-next");
    if (n && !n.hidden) { press(n, kind === "intro" ? "도입 대사" : "엔딩 대사"); return true; }
    return false;
  }
  if (kind === "card") {
    const opts = [...top.querySelectorAll(".w2o-opt")];
    if (!opts.length) { const ok = top.querySelector(".w2o-ok"); if (ok) { press(ok, "카드 닫기"); return true; } return false; }
    const k = (b) => (b.className.match(/\bk-(\w+)/) || [])[1];
    const pct = (b) => { const x = b.querySelector(".w2o-pct b"); return x ? parseInt(x.textContent, 10) : null; };
    /* 🤝 사람 카드 — 정책이 바란 사람(🏠 가족 · 🧤 키퍼) */
    const who = opts.filter((b) => k(b) === "who");
    if (who.length) {
      const [wk, wsid] = String(o.__peopleWant || "").split(":");
      const famName = wsid && env.w.W2Events && env.w.W2Events.FAMILY && env.w.W2Events.FAMILY[wsid] ? env.w.W2Events.FAMILY[wsid].name : null;
      const b = (wk === "keeper" ? who.find((x) => x.textContent.indexOf("🧤") >= 0)
        : who.find((x) => x.textContent.indexOf("🏠") >= 0 && (!famName || x.textContent.indexOf(famName) >= 0))) || who[0];
      press(b, "사람 고르기"); return true;
    }
    const pick = opts.find((b) => k(b) === "flag" && P.flag) || opts.find((b) => k(b) === "try" && pct(b) >= P.tryAt)
      || opts.find((b) => k(b) === "promise" && P.promise) || opts.find((b) => k(b) === "safe") || opts[0];
    press(pick, "카드 고르기"); return true;
  }
  if (kind === "grade" || kind === "sheet") {
    const ok = top.querySelector(".w2o-ok");
    if (ok) { press(ok, kind === "grade" ? "승급 카드" : "평가서"); return true; }
    return false;
  }
  if (kind === "doors") {
    const go = top.querySelector(".w2o-ok");
    if (go && !go.disabled) { press(go, "문 확정"); return true; }
    const ds = [...top.querySelectorAll(".w2o-door:not([disabled])")];
    if (ds.length) { press(ds[ds.length - 1], "문 고르기"); return true; }
    return false;
  }
  if (kind === "film") {
    const b = [...top.querySelectorAll(".w2f-acts button")].find((x) => x.textContent.indexOf("닫기") >= 0);
    if (b) { press(b, "필름 닫기"); return true; }
    return false;
  }
  if (kind === "book") {
    const ok = top.querySelector(".w2o-ok");
    if (ok) { press(ok, "도감 닫기"); return true; }
    return false;
  }
  return false;
}

/* 🏁 입구에서 졸업까지 — 화면에 뜬 것을 보고 누를 것을 누릅니다.
 *   돌려주는 것: { S, seen, clicks, ticks, done, stuck } — `done`이 거짓이면 **상한에 걸려 멈춘 것**(통과가 아님) */
async function runAct(env, opt) {
  const { w, seen, o, P } = env;
  const op = opt || {};
  const D = w.document;
  const clicks = {};
  const press = (el, label) => { clicks[label] = (clicks[label] || 0) + 1; tap(w, el); };
  /* 입구가 그려질 때까지(부팅은 `DOMContentLoaded` 뒤) */
  const entrySel = op.entry === "continue" ? "#w2-entry .w2-continue" : "#w2-entry .w2-new";
  for (let i = 0; i < 400 && !D.querySelector(entrySel); i++) await wait(5);
  const nb = D.querySelector(entrySel);
  if (!nb) return { S: null, seen, clicks, ticks: 0, done: false, stuck: `입구의 ${op.entry === "continue" ? "[▶️ 이어하기]" : "[🆕 새로 시작]"}이 안 그려졌어요` };
  press(nb, op.entry === "continue" ? "continue" : "new");
  let ticks = 0, last = "", same = 0;
  const CAP = op.cap || 60000;
  const en = (el) => el && !el.disabled;
  while (ticks < CAP) {
    ticks += 1;
    const S = w.W2Game._t.S;
    if (S && S.hofDone && !D.querySelector("#w2-layer .w2o")) break;
    if (op.until && S && op.until(S, env)) break;
    /* 🖼️ 진짜 오버레이는 **모달**이에요 — 떠 있으면 그것부터(밑의 홈 · [다음] 버튼은 사람 손이 안 닿아요) */
    if (o.realScenes && D.querySelector("#w2-layer .w2o, .w2m-go, .w2m-cell")) {
      if (await overlay(env, D, press)) { same = 0; await wait(1); continue; }
    }
    const create = D.querySelector("#w2-entry.w2-create");
    if (create && en(D.querySelector(".w2-start"))) {
      /* 🎲 만들기(계약 15) — 정책 `rerolls`번 다시 뽑기 · `nameRolls`번 이름 🎲(누른 수는 필수 입력에 안 셈 — 고를 수 있는 것) */
      for (let i = 0; i < (Number(o.rerolls) || 0); i++) { const rb = D.querySelector(".w2-reroll"); if (en(rb)) tap(w, rb); }
      for (let i = 0; i < (Number(o.nameRolls) || 0); i++) { const nb2 = D.querySelector(".w2-name-roll"); if (en(nb2)) tap(w, nb2); }
      seen.create = { stats: Object.fromEntries([...D.querySelectorAll(".w2-roll-row")].map((r) => [r.dataset.k, Number((r.querySelector(".w2-roll-v") || {}).textContent)])),
        sum: (D.querySelector(".w2-roll-sum") || {}).textContent, best: (D.querySelector(".w2-roll-best") || {}).textContent,
        reroll: (D.querySelector(".w2-reroll") || {}).textContent, name: (D.querySelector(".w2-name") || {}).value };
      const nm = D.querySelector(".w2-name");
      if (o.name != null) nm.value = o.name;
      press(D.querySelector(`.w2-pos [data-v="${o.pos}"]`), "pos");
      press(D.querySelector(`.w2-foot [data-v="${o.foot}"]`), "foot");
      const no = D.querySelector(".w2-no");
      no.value = String(o.no);
      no.dispatchEvent(new w.Event("input", { bubbles: true }));
      press(D.querySelector(".w2-start"), "start");
      await wait(1);
      continue;
    }
    if (D.querySelector("#w2-home") && en(D.querySelector(".w2-rest"))) {
      /* 🤝 이번 주에 사람 버튼이 떴나 — 떴을 때만 그 사람 이름표가 정책에 들어가요 */
      const Sx = Object.assign({}, S, { __ppl: D.querySelector(".w2-people") ? peopleKeys(w, S) : [],
        __main: w.WingerEngine.K.BLEND[S.pos] });
      const ch = P.home(Sx, env);
      if (ch.k === "people" && en(D.querySelector(".w2-people"))) {
        o.__peopleWant = ch.who;
        press(D.querySelector(".w2-people"), "people");
      } else if (ch.k === "rest" || ch.k === "people") {
        press(D.querySelector(".w2-rest"), "rest");
      } else {
        press(D.querySelector(`.w2-tbtn[data-k="${ch.stat}"]`), "train");
      }
      await wait(1);
      continue;
    }
    let did = false;
    for (const [sel, label] of [[".w2-live-go", "go"], [".w2-after-next", "after"], [".w2-next", "next"]]) {
      const el = D.querySelector(sel);
      if (en(el)) { press(el, label); did = true; break; }
    }
    if (!did && o.realScenes) did = await overlay(env, D, press);
    const sig = `${S ? S.week : 0}:${S ? S.ph : 0}:${seen.order.length}:${Object.values(clicks).reduce((a, b) => a + b, 0)}`;
    if (sig === last) same += 1; else { same = 0; last = sig; }
    if (same > (op.stall || 4000)) return { S, seen, clicks, ticks, done: false, stuck: `${sig}에서 ${same}틱 동안 아무 일도 안 일어났어요` };
    await wait(did ? 1 : 2);
  }
  const S = w.W2Game._t.S;
  return { S, seen, clicks, ticks, done: !!(S && (S.hofDone || (op.until && op.until(S, env)))), stuck: ticks >= CAP ? "상한" : null };
}
/* 🤝 그 주의 사람 — 게임이 쓰는 표(`W2Story.people`)를 그대로 부릅니다(베끼지 않아요) */
function peopleKeys(w, S) {
  /* 🏠 가족은 셋이 모두 key "family"(29번 P1 (가)) — 「family:<sid>」(father · apply · letter)로도 고를 수 있게 둘 다 적어요 */
  try { return w.W2Story.people(S, S.week).reduce((a, p) => a.concat(p.key === "family" && p.sid ? ["family", `family:${p.sid}`] : [p.key]), []); } catch (e) { return []; }
}

/* 🔢 숫자만 — 성별 대칭 · 짝 검사가 견주는 「판의 모든 숫자」(이름 · 그림 · 문장은 뺌) */
function numbersOf(S) {
  return {
    stats: S.stats, cond: S.cond, trust: S.trust, record: S.record,
    games: S.games.map((g) => [g.w, g.t, g.gf, g.ga, g.res, g.g, g.a, g.d, g.r, g.sv, g.rv == null ? null : g.rv]),
    sheet: S.sheet ? S.sheet.cols.map((c) => c.v).concat([S.sheet.total, S.sheet.tier]) : null,
    ending: S.ending ? [S.ending.id, S.ending.tier] : null,
    ach: Object.keys(S.ach || {}).sort(), evLog: (S.evLog || []).map((l) => [l.w, l.id, l.k, l.pct, l.ok, l.sit]),
    story: ((S.story && S.story.done) || []).map((d) => [d.sid, d.end, d.week]),
    table: S.world.league.table, cup: [S.world.cup.stage, S.world.cup.champ || null], ind: S.world.league.ind,
    weeks: [S.trainWeeks, S.restWeeks, S.peopleWeeks], test: S.test, mid: (S.mid || []).map((m) => [m.week, m.total, m.tier]),
    world: { ours: S.world.ours.map((x) => [x.id, x.pos, x.str]), league: S.world.league.teams.map((t) => [t.id, t.str, (t.xi || []).map((x) => x.str)]),
      rounds: S.world.league.rounds, groups: S.world.cup.groups.map((g) => g.map((t) => [t.id, t.str, t.xs || null])) },
  };
}

async function playAct(opt, runOpt) {
  const env = boot(opt);
  const r = await runAct(env, runOpt);
  r.env = env;
  return r;
}

/* ═══════════════════════════════════════════════════════════════════
 * ⚽ liveMatch — **경기 드라이버 하나**(`WingerLive.play` · 계약 4)를 진짜 화면(`W2Scene`) 위에서 한 판
 *   🔒 진짜 `index.html`(스크립트 순서 그대로) · 판 시드는 1막 세계(`W2World.create`)에서 · 내 줄은 `meRow` 그대로
 *   🔍 화면 API를 **감싸기만** 합니다(넘기는 값 · 돌려주는 값 그대로) — 부른 순서를 `log`에 남겨요
 *   o.seed · o.pos · o.stats(여섯 같은 값) · o.cond · o.oppStr · o.auto · o.fast · o.muts · o.hand(kind) → s
 *   o.realTimers  setTimeout을 안 뭉갭니다(벽시계 비교용 — 경기 1분 = 90ms라 한 판 8초 남짓)
 *   o.onClock(m, env)  시계 한 칸마다(세대 가드 검사가 다음 경기를 깔 때 씀)
 *   o.headless  화면 없이(`host` 없이) — 같은 드라이버의 화면 없는 길
 * ═══════════════════════════════════════════════════════════════════ */
async function liveMatch(opt) {
  const o = Object.assign({ seed: 777, pos: "wg", stat: 56, cond: 51, oppStr: 58, gender: "m" }, opt || {});
  const w = bootPage({ muts: o.muts, fastTimers: !o.realTimers, keys: o.auto ? { "grow-auto-mini": "1" } : {} });
  const D = w.document;
  for (let i = 0; i < 400 && !D.querySelector("#w2-entry"); i++) await wait(5);
  const X = w.W2World;
  const stats = {}; for (const k of KEYS6) stats[k] = o.stat;
  const S = { pos: o.pos, name: o.name || "윙어", stats, world: X.create(o.seed, o.pos, o.gender) };
  const log = [];
  const Sc = w.W2Scene;
  if (Sc && !o.headless) {
    const raw = { clock: Sc.clock, push: Sc.push, mount: Sc.mount, summary: Sc.summary, momentSlot: Sc.momentSlot, fast: Sc.fast };
    Sc.clock = (m, g) => { const r = raw.clock(m, g); log.push({ t: "clock", m, g, ok: r }); if (o.onClock) o.onClock(m, { w, log, Sc }); return r; };
    Sc.push = (card, g) => {
      const e = { t: "push", min: card.min, kind: card.kind, k: card.k, mine: !!card.mine, judged: card.judge != null, g, done: false, at: log.length };
      log.push(e);
      return Promise.resolve(raw.push(card, g)).then((v) => { e.done = true; log.push({ t: "pushed", ref: e }); return v; });
    };
    Sc.mount = (h, c) => { log.push({ t: "mount", cfg: JSON.parse(JSON.stringify(c)) }); return raw.mount(h, c); };
    Sc.summary = (r) => { log.push({ t: "summary", r }); return raw.summary(r); };
  }
  if (!o.realMoment) {
    w.W2Moment = boardStub(w, o, (b, opts, slot) => log.push(Object.assign({ t: "board", slot: !!slot, keys: Object.keys(opts).sort().join(",") }, b)));
  }
  const host = o.headless ? null : D.createElement("div");
  if (host) D.body.appendChild(host);
  const rr = X.rngOf(o.seed, 7000, X.SALT.rate);
  const cfg = {
    xi: X.ourXI(S), teamStr: X.TUNE.US_STR, oppStr: o.oppStr, condition: o.cond,
    homeName: "솔빛고", oppName: "한결고", myName: S.name, pos: o.pos, foot: "R", keeper: "태오",
    chibi: o.chibi === undefined ? "art/jiho-m-chibi-base.webp" : o.chibi, promiseLine: o.promiseLine || null, scout: null,
    seed: X.engineSeed(o.seed, 100), auto: !!o.auto, rate: (res) => X.rate(res, o.pos, rr),
  };
  let info = null, err = null, settled = false;
  const pr = w.WingerLive.play(host, cfg).then((v) => { info = v; settled = true; }, (e) => { err = e; settled = true; });
  if (host) {
    /* 🏁 [경기 시작] — 실기기 순서로 누릅니다(누르기 전엔 시계가 안 흘러요) */
    for (let i = 0; i < 400 && !host.querySelector(".w2-live-go"); i++) await wait(2);
    const go = host.querySelector(".w2-live-go");
    log.push({ t: "go", present: !!go, ticksBefore: log.filter((x) => x.t === "clock").length });
    if (o.fast && Sc && Sc.fast) Sc.fast();
    if (go) tap(w, go);
  }
  const CAP = o.cap || 20000;
  for (let i = 0; i < CAP && !settled; i++) await wait(o.realTimers ? 20 : 1);
  return { w, D, host, info, err, settled, log, cfg, S, close: () => w.close() };
}

/* 💾 이 창의 localStorage를 통째로(jsdom은 `Object.keys`로 안 훑어져요 — length/key(i)로) — 새로고침 검사가 새 창에 그대로 심어요 */
function lsDump(w) {
  const out = {};
  for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); out[k] = w.localStorage.getItem(k); }
  return out;
}

module.exports = { boot, runAct, playAct, defaultPolicy, numbersOf, tap, KEYS6, stubScene, liveMatch, lsDump };
