/* ⚽ 더 윙어(운영판 고도화 ①) 검사 공용 — 페이지 띄우기 · 시드 가르기 · 실제 버튼 드라이버 · 비교 사진.
 *
 * 이 파일은 검사가 아니에요(직접 돌리면 아무것도 안 하고 0으로 끝나요). `*-test.js`가 require해요.
 * 2026-09-29 inspector — 스펙 `docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md` §9.
 *
 * 🔒 지키는 것
 *   ① **게임 입구로 들어가서 진짜 버튼을 눌러요.** 함수를 직접 부르지 않아요(드라이버가 화면을 보고 버튼을 골라요)
 *   ② **난수원을 갈라요** — 게임 = `Math.random`(시드) · 이벤트 = `WingerEvents._rng`(seed ^ 0x9E3779B9) ·
 *      정책(드라이버의 선택) = seed ^ 0x85EBCA6B. 같은 시드면 두 흐름이 lockstep이 돼요(CLAUDE.md 9번)
 *   ③ 변이는 **걸렸는지 확인**해요 — 안 걸리면 던져요. `mutMisses()`로 먼저 보면 죽지 않고 ❌ 한 줄이에요
 *   ④ 종료 코드 셋 — 0 통과 · 1 빨간불 · **2 💥 죽음(안 돌았음)** — `guardExit()`
 *   ⑤ 페이지 주소는 `/soccer/` — `/beta/`면 env.js가 localStorage를 `beta::`로 감싸 자동 진행 설정을 못 읽어요
 *
 * 「현행」은 운영판 `soccer/`예요 — 이번 작업이 안 건드렸고 HEAD의 `beta/soccer/`와 같아요(inspector가 md5로 대조). */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { JSDOM, VirtualConsole } = require("/workspace/grow-games/tests/cloud/jsdom.js");

const ROOT = "/workspace/grow-games";
const DIRS = { beta: path.join(ROOT, "beta/soccer"), live: path.join(ROOT, "soccer") };
const EV_SALT = 0x9E3779B9, POL_SALT = 0x85EBCA6B;
const split = (seed, salt) => (seed ^ salt) >>> 0;

/* 💥 크래시는 초록불도 빨간불도 아니에요 — 2로 끝내요 */
function die(e) {
  console.log(`\n💥 검사가 죽었어요 — 이건 초록불도 빨간불도 아닙니다 (안 돈 겁니다)`);
  console.log(`   ${e && e.stack ? e.stack : e}`);
  process.exit(2);
}
function guardExit() {
  /* 닫은 jsdom 페이지의 늦은 콜백(cloud.js)이 사라진 document를 만지면 여기까지 와요 —
   * **스택에 x.test가 있는 것만** 삼키고 나머지는 죽여요(tests/check-page-test.js와 같은 규칙) */
  const handler = (e) => {
    if (String((e && e.stack) || "").includes("x.test")) return;
    die(e);
  };
  process.on("uncaughtException", handler);
  process.on("unhandledRejection", handler);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 소스 · 변이 ----------
const readSrc = (which, file) => fs.readFileSync(path.resolve(DIRS[which], file), "utf8");
/* muts = [[정규식|문자열, 바꿀 것], …] — 하나라도 안 걸리면 던져요(조용히 무변이로 도는 게 제일 나빠요) */
function applyMuts(src, muts, label) {
  let out = src;
  for (const [re, rep] of muts || []) {
    const before = out;
    out = out.replace(re, rep);
    if (out === before) throw new Error(`변이가 소스에 안 걸렸어요 — ${label}: ${re}`);
  }
  return out;
}
/* 0번 「변이 등록 검사」 — 던지지 않고 안 걸린 것의 목록을 돌려줘요.
 * table = { 이름: { which, file, muts } } */
function mutMisses(table) {
  const bad = [];
  for (const [name, t] of Object.entries(table)) {
    const src = readSrc(t.which || "beta", t.file);
    for (const [re] of t.muts) {
      const hit = typeof re === "string" ? src.includes(re) : re.test(src);
      if (!hit) bad.push(`${name}: ${re}`);
    }
  }
  return bad;
}

// ---------- 페이지 ----------
/* opt = { which: "beta"|"live", seed, keys: {k: v}, muts: { "events.js": [[re, rep]] }, drop: ["achieve.js"],
 *         keepFx, keepCloud, url } */
function boot(opt) {
  const o = Object.assign({ which: "beta", seed: 1 }, opt || {});
  const DIR = DIRS[o.which];
  const muts = o.muts || {};
  const drop = new Set(o.drop || []);
  let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
    .replace(/<script async src="https:[^"]+"><\/script>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(DIR, src);
      if (!fs.existsSync(p) || drop.has(src)) return "";
      let body = fs.readFileSync(p, "utf8");
      if (muts[src]) body = applyMuts(body, muts[src], src);
      return `<script>\n${body}\n</script>`;
    })
    .replace(/<script>if \("serviceWorker"[^<]*<\/script>/, "");
  for (const f of Object.keys(muts)) {
    if (!new RegExp(`<script src="${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`).test(
      fs.readFileSync(path.join(DIR, "index.html"), "utf8"))) throw new Error(`변이 대상 파일이 페이지에 없어요 — ${f}`);
  }
  html = html.replace("</body>", `<script>window.__get=(n)=>eval(n);`
    + `window.__set=(n,v)=>{window.__v=v;eval(n+" = window.__v");};</script></body>`);
  const game = mulberry32(o.seed >>> 0);
  const calls = { game: 0 };
  /* 페이지 안의 예외는 node로 안 올라와요 — 클릭 처리기에서 던지면 jsdom이 콘솔로만 알려요.
   * 그래서 **모아 둡니다**(P.errors). 「예외 0」은 이 목록으로 재요. 캔버스 미구현 알림만 빼요 */
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/Not implemented/.test(String(e && e.message))) errors.push(`jsdom: ${e && e.message}${e && e.detail ? ` — ${e.detail.stack || e.detail}` : ""}`); });
  vc.on("error", (...a) => errors.push(`console.error: ${a.map((x) => (x && x.stack) || String(x)).join(" ")}`));
  const dom = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true, url: o.url || "https://x.test/soccer/", virtualConsole: vc,
    beforeParse(w) {
      w.Math.random = () => { calls.game += 1; return game(); };
      w.fetch = () => Promise.reject(new Error("off"));
      /* 🔴 rAF에 0을 넘기면 움직이는 판이 얼어요 — 진짜 시계를 넘겨요 */
      w.requestAnimationFrame = (cb) => setTimeout(() => cb(w.performance.now()), 0);
      w.scrollTo = () => {};
      w.alert = () => {};
      w.__confirmYes = true;
      w.confirm = () => !!w.__confirmYes;
      w.localStorage.setItem("grow-auto-mini", "1");
      for (const [k, v] of Object.entries(o.keys || {})) w.localStorage.setItem(k, v);
    },
  });
  const w = dom.window;
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };
  /* 연출(fx.js)은 꽃가루 자리를 Math.random으로 정해요 — **게임 난수를 먹어요.** 비트 대조에서 연출 차이가
   * 게임 흐름을 밀지 않게 난수를 안 쓰는 빈 연출로 바꿔요(연출은 판정에 안 닿아요) */
  if (!o.keepFx) w.Fx = { flash() {}, celebrate() {}, burst() {}, tap() {} };
  if (w.WingerEvents) w.WingerEvents._rng = mulberry32(split(o.seed >>> 0, EV_SALT));
  const doc = w.document;
  const $ = (id) => doc.getElementById(id);
  const screens = Array.from(doc.querySelectorAll("section.screen"));
  const P = {
    which: o.which, seed: o.seed, dom, w, doc, $, calls, errors,
    S: () => w.__get("S"),
    set: (n, v) => w.__set(n, v),
    get: (n) => w.__get(n),
    active: () => { for (const el of screens) if (el.classList.contains("active")) return el.id; return ""; },
    close() { try { w.close(); } catch { /* 닫는 중 남은 콜백은 무시 */ } },
  };
  return P;
}

/* 실기기 이벤트 순서 — pointerdown → pointerup → click (개수만이 아니라 순서도) */
function tap(P, el) {
  for (const type of ["pointerdown", "pointerup"]) {
    el.dispatchEvent(new P.w.Event(type, { bubbles: true, cancelable: true }));
  }
  el.dispatchEvent(new P.w.MouseEvent("click", { bubbles: true, cancelable: true }));
}

// ---------- 이벤트 정책 ----------
const EV = {
  /* 늘 안전 — 확정을 골라요(📍 1장은 🔀 거래가 아니라 🙂 확정. 스펙 §4-3 「늘 안전은 🙂를 고른다」) */
  safe: (ev) => ev.opts.findIndex((o) => o.k === "safe"),
  /* 늘 도전 — 도전이 있으면 도전(여럿이면 첫 칸), 없으면 약속, 그것도 없으면 확정 */
  bold: (ev) => {
    let i = ev.opts.findIndex((o) => o.k === "try");
    if (i < 0) i = ev.opts.findIndex((o) => o.k === "promise");
    return i < 0 ? ev.opts.findIndex((o) => o.k === "safe") : i;
  },
  /* 무작위 — 정책 난수로 아무 칸 */
  random: (ev, rnd) => Math.floor(rnd() * ev.opts.length),
};

// ---------- 드라이버 ----------
/* pol = { name, market(0~4), pos, ev(ev, rnd) → i, wild: "go"|"stay", ext: bool, move: 0~1(오프시즌 이적 확률),
 *         onEv(rec) — 답하기 직전·직후 기록을 받는 곳 }
 * 드라이버는 **지금 보이는 화면**만 보고 버튼 하나를 눌러요. 게임 함수는 안 불러요. */
function makeDriver(P, pol) {
  const w = P.w, doc = P.doc, $ = P.$;
  const rnd = mulberry32(split(P.seed >>> 0, POL_SALT));
  const log = [];          // 드라이버가 누른 것(오버레이 답 말고 **양쪽 판에 다 있는 조작**만)
  const evs = [];          // 답한 이벤트
  let retired = false;
  let askedMove = -1;
  let resumed = false;
  const S = () => P.S();
  const vis = (el) => el && !el.hidden && !el.disabled && !el.classList.contains("hidden");
  const click = (el) => tap(P, el);

  /* 훈련 칸 고르기 — 컨디션 문턱 아래면 휴식. 아니면 상한이 아닌 칸 중 정책 난수로(가장 낮은 칸 쪽으로 기울여) */
  function trainKey(st, restBelow, box) {
    if (st.condition < restBelow) return "__rest";
    const btns = Array.from($(box).children)
      .filter((b) => b.dataset && b.dataset.key && !b.disabled && b.dataset.key !== "__rest" && !b.classList.contains("awaken-act"));
    if (!btns.length) return "__rest";
    const sorted = btns.map((b) => b.dataset.key).sort((a, b) => (st.stats[a] || 0) - (st.stats[b] || 0));
    const r = rnd();
    return r < 0.6 ? sorted[0] : sorted[Math.floor(rnd() * sorted.length)];
  }
  function pressKey(box, key) {
    const b = Array.from($(box).children).find((x) => x.dataset && x.dataset.key === key);
    if (!b || b.disabled) return false;
    click(b);
    return true;
  }

  /* 레이어는 전부 body 바로 밑에 붙어요 — 문서 전체를 훑지 않고 body의 자식만 봐요(jsdom의 querySelector가 느려요) */
  const layer = (cls) => { for (const el of doc.body.children) if (el.classList.contains(cls)) return el; return null; };
  /* 오버레이 — 있으면 하나 처리하고 true */
  function overlay() {
    const ev = layer("ev-overlay");
    if (ev) {
      if (ev.dataset.state === "done") { click(ev.querySelector(".ev-ok")); return "ev-ok"; }
      const cur = w.WingerEvents && w.WingerEvents.pending();
      if (!cur) throw new Error("이벤트 창이 떠 있는데 S.ev가 없어요");
      const i = pol.ev ? pol.ev(cur, rnd) : EV.safe(cur);
      const btn = ev.querySelector(`.ev-opt[data-i="${i}"]`);
      if (!btn) throw new Error(`이벤트 창에 ${i}번 칸이 없어요 (${cur.id})`);
      const s0 = S();
      const rec = { id: cur.id, sid: cur.sid, ch: cur.ch, at: cur.at, u: cur.u, i, opt: JSON.parse(JSON.stringify(cur.opts[i])),
        opts: JSON.parse(JSON.stringify(cur.opts)), dom: pol.keepDom ? ev.innerHTML : undefined, before: pol.snapEv ? pol.snapEv(s0) : null,
        /* 뜬 자리 — 대회 중 0 · 모달 동시 둘 0을 재는 재료 */
        where: { screen: P.active(), wc: !!s0.wc, cup: !!s0.cup, cupPrep: !!s0.cupPrep, cupReady: !!s0.cupReady, act: !!s0.activity,
          layers: Array.from(doc.body.children).filter((x) => x.classList.contains("av-overlay")).length } };
      click(btn);
      const log2 = (S().evLog || [])[(S().evLog || []).length - 1];
      rec.log = log2 ? JSON.parse(JSON.stringify(log2)) : null;
      rec.after = pol.snapEv ? pol.snapEv(S()) : null;
      rec.result = ev.querySelector(".ev-result") ? ev.querySelector(".ev-result").textContent : "";
      evs.push(rec);
      if (pol.onEv) pol.onEv(rec, P);
      return "ev";
    }
    const no = layer("no-overlay");
    if (no) { click(no.querySelector("#no-skip")); return "no-skip"; }
    const wc = layer("wc-overlay");
    if (wc) {
      const ok = $("btn-wc-ok"), go = $("btn-wc-go"), stay = $("btn-wc-stay");
      if (ok) click(ok);
      else if (go && stay) click(pol.wild === "stay" ? stay : go);
      else wc.remove();
      log.push("wc");
      return "wc";
    }
    const t = layer("tap-overlay");
    if (t) { click($("btn-tap-auto")); log.push("tap-auto"); return "tap"; }
    const slo = layer("av-overlay");
    const sl = slo && slo.querySelector(".slot-modal .slot-go");
    if (sl) { click(sl); log.push("slot"); return "slot"; }
    const other = layer("av-overlay");
    if (other) {
      /* 모르는 레이어 — 닫기 버튼을 찾아 눌러요. 없으면 걷어요(뒤 화면이 막혀요) */
      const b = Array.from(other.querySelectorAll("button")).find((x) => !x.disabled && /닫기|확인|나중|괜찮/.test(x.textContent))
        || other.querySelector("button:not([disabled])");
      if (b) click(b); else other.remove();
      log.push(`layer:${other.className}`);
      return "layer";
    }
    return null;
  }

  function step() {
    const o = overlay();
    if (o) return o;
    const a = P.active();
    const st = S();
    if (a === "screen-title") {
      if (pol.resume && !resumed) { resumed = true; click($("btn-continue")); log.push("continue"); return "continue"; }
      if (st) throw new Error("타이틀인데 선수가 있어요");
      click($("btn-new")); log.push("new"); return "new";
    }
    if (a === "screen-agency") { click(doc.querySelectorAll("#agency-list .card")[pol.market || 0]); log.push("agency"); return "agency"; }
    if (a === "screen-position") { click(doc.querySelector(`#position-list .card[data-pos="${pol.pos || "fw"}"]`)); log.push("pos"); return "pos"; }
    if (a === "screen-name") {
      if (pol.name) $("input-name").value = pol.name;
      click($("btn-start")); log.push("start"); return "start";
    }
    if (a === "screen-main") {
      const go = Array.from($("action-list").children).find((x) => x.classList.contains("go-game"));
      if (vis(go)) { click(go); log.push("y-go"); return "y-go"; }
      const k = trainKey(st, 40, "action-list");
      if (!pressKey("action-list", k)) throw new Error(`유스 버튼이 없어요 (${k})`);
      log.push(`y:${k}`); return "y";
    }
    if (a === "screen-stage") {
      const pkb = $("pk-box");
      const pk = pkb && pkb.querySelector("button:not([disabled])");
      const n = $("btn-stage-next");
      if (pk && !vis(n)) { click(pk); log.push("pk"); return "pk"; }
      if (vis(n)) { click(n); log.push("next"); return "next"; }
      throw new Error("경기 화면에서 누를 게 없어요");
    }
    if (a === "screen-ending") {
      const deb = $("btn-go-debut"), ext = $("btn-youth-ext");
      if (ext && pol.ext && !st.campDone) { click(ext); log.push("ext"); return "ext"; }
      if (deb) { click(deb); log.push("debut"); return "debut"; }
      retired = true; log.push("quit"); return "end";
    }
    if (a === "screen-camp") {
      const done = $("btn-camp-done");
      if (done) { click(done); log.push("camp-done"); return "camp-done"; }
      const eff = $("btn-camp-effort");
      if (eff) { click(eff); log.push("camp-eff"); return "camp-eff"; }
      const stats = Array.from(doc.querySelectorAll("#camp-actions .camp-stat"));
      if (!stats.length) throw new Error("특훈 화면에서 누를 게 없어요");
      const low = stats.slice().sort((x, y) => (st.stats[x.dataset.key] || 0) - (st.stats[y.dataset.key] || 0))[0];
      click(low); log.push(`camp:${low.dataset.key}`); return "camp";
    }
    if (a === "screen-pro") {
      const go = Array.from($("pro-actions").children).find((x) => x.classList.contains("go-game"));
      if (vis(go)) { click(go); log.push("go"); return "go"; }
      const k = trainKey(st, 50, "pro-actions");
      if (!pressKey("pro-actions", k)) throw new Error(`준비 화면 버튼이 없어요 (${k})`);
      log.push(`p:${k}`); return "p";
    }
    if (a === "screen-career") {
      const btns = Array.from(doc.querySelectorAll("#career-actions .btn"));
      const next = btns.find((b) => /시즌 시작/.test(b.textContent));
      const tf = $("btn-transfer");
      if (next && tf && pol.move && askedMove !== st.proYear) {
        askedMove = st.proYear;             // 한 오프시즌에 한 번만 물어요(드라이버 쪽 기억 — 세이브는 안 만져요)
        if (rnd() < pol.move) { click(tf); log.push("tf"); return "tf"; }
      }
      if (next && !(pol.retireAt && st.proYear >= pol.retireAt)) {
        click(next); log.push("season"); return "season";
      }
      const ret = btns.find((b) => /은퇴하기/.test(b.textContent));
      if (!ret) {
        if (!st) { retired = true; return "end"; }
        throw new Error("결산 화면에 다음 버튼도 은퇴 버튼도 없어요");
      }
      P.w.__confirmYes = true;
      click(ret); log.push("retire");
      retired = true; return "retire";
    }
    if (a === "screen-transfer") {
      const cards = Array.from(doc.querySelectorAll("#screen-transfer .tf-card"));
      if (cards.length && rnd() < 0.85) { const c = cards[Math.floor(rnd() * cards.length)]; click(c); log.push(`move:${c.dataset.league}`); return "move"; }
      click($("btn-transfer-stay")); log.push("stay"); return "stay";
    }
    if (a === "screen-film" || a === "screen-hof") { retired = true; return "end"; }
    throw new Error(`모르는 화면이에요 — ${a}`);
  }

  /* 끝까지(은퇴·유스 탈락) 또는 until(st)가 참일 때까지 */
  function run(opt) {
    const o = opt || {};
    const max = o.max || 60000;
    for (let i = 0; i < max; i++) {
      if (retired) return "end";
      const st = S();
      if (o.until && st && o.until(st, P)) return "until";
      const what = step();
      if (o.onStep) o.onStep(what, P);
    }
    throw new Error("드라이버가 끝나지 않아요(상한)");
  }
  return { step, run, log, evs, rnd, get retired() { return retired; } };
}

// ---------- 비교 사진 ----------
/* 이번 작업이 **새로 만든** 세이브 칸 — 늘 안전 == 현행 비교에서는 빼요(스펙 §6-1).
 * proLog는 뺍니다: 이벤트 답·이야기 결말 줄이 새로 붙고 30줄로 잘려서 옛 줄이 밀려나요(뜻이 아니라 글 목록이에요) */
const NEW_KEYS = ["ev", "evLog", "evSeen", "evSlot", "evSeason", "evMem", "promise", "recent", "trustEv", "condUsual",
  "story", "ach", "rep", "no", "origin", "youthEnd", "buffX", "betaAt", "savedAt", "proLog"];
const NEW_CAREER = ["hat", "perfect", "maxOvr"];
function snap(st, keys) {
  if (!st) return "null";
  const c = JSON.parse(JSON.stringify(st));
  const drop = keys || NEW_KEYS;
  for (const k of drop) delete c[k];
  if (!keys) {
    if (c.career) for (const k of NEW_CAREER) delete c.career[k];
    if (Array.isArray(c.moves)) for (const m of c.moves) delete m.fee;
  }
  return JSON.stringify(c);
}
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
/* 두 사진이 다르면 어느 칸이 다른지 짧게 */
function diffKeys(a, b, pfx = "") {
  const out = [];
  const A = typeof a === "string" ? JSON.parse(a) : a, B = typeof b === "string" ? JSON.parse(b) : b;
  if (A === null || B === null || typeof A !== "object" || typeof B !== "object") {
    if (JSON.stringify(A) !== JSON.stringify(B)) out.push(`${pfx || "(값)"}: ${JSON.stringify(A)} ≠ ${JSON.stringify(B)}`.slice(0, 220));
    return out;
  }
  const keys = new Set(Object.keys(A).concat(Object.keys(B)));
  for (const k of keys) {
    if (JSON.stringify(A[k]) === JSON.stringify(B[k])) continue;
    if (A[k] && B[k] && typeof A[k] === "object" && typeof B[k] === "object" && out.length < 6) out.push(...diffKeys(A[k], B[k], `${pfx}${pfx ? "." : ""}${k}`));
    else out.push(`${pfx}${pfx ? "." : ""}${k}: ${JSON.stringify(A[k])} ≠ ${JSON.stringify(B[k])}`.slice(0, 220));
    if (out.length >= 8) break;
  }
  return out;
}

/* 확인용 시나리오(_fixtures.js) — 만든 판(make-fixtures.js)이 HEAD 코드라 **새 칸이 하나도 없는 옛 세이브**예요 */
function fixtures() {
  const src = fs.readFileSync(path.join(ROOT, "beta/_fixtures.js"), "utf8");
  const m = src.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
  return new Function(`return ${m[1]};`)();
}

module.exports = {
  ROOT, DIRS, EV_SALT, POL_SALT, split, die, guardExit, mulberry32, readSrc, applyMuts, mutMisses,
  boot, tap, EV, makeDriver, NEW_KEYS, NEW_CAREER, snap, md5, diffKeys, fixtures,
};

// ---------- 병렬 — 커리어 하나가 jsdom에서 1분 가까이 걸려요. 자식 프로세스로 나눠 굴려요 ----------
/* 검사 파일이 자기 자신을 `W1_JOB=<json>`으로 다시 띄우면 그 판 하나만 굴리고 `@@W1@@{json}` 한 줄로 결과를 내요.
 * 자식이 죽으면(💥) 그 판은 { dead: 사유 }로 돌아와요 — 부르는 쪽이 죽음으로 세야 해요(빨간불로 세면 안 돼요). */
function jobArg() {
  if (!process.env.W1_JOB) return null;
  try { return JSON.parse(process.env.W1_JOB); } catch { return null; }
}
/* ⚠️ 파이프로 큰 줄을 쓰고 바로 process.exit하면 **잘려요**(실측: 20만 자에서 끊김). 다 쓴 뒤에 끝내요 */
function emit(obj, code) {
  process.stdout.write(`\n@@W1@@${JSON.stringify(obj)}\n`, () => process.exit(code || 0));
}
function runJobs(file, jobs, par) {
  const { spawn } = require("child_process");
  const K = Math.max(1, par || Number(process.env.W1_PAR) || 3);
  return new Promise((resolve) => {
    const out = new Array(jobs.length);
    let next = 0, live = 0, done = 0;
    const launch = () => {
      while (live < K && next < jobs.length) {
        const i = next++;
        live++;
        const ch = spawn(process.execPath, [file], { env: Object.assign({}, process.env, { W1_JOB: JSON.stringify(jobs[i]) }) });
        let buf = "", err = "";
        ch.stdout.on("data", (d) => { buf += d; });
        ch.stderr.on("data", (d) => { err += d; });
        ch.on("close", (code) => {
          const m = buf.split("\n").filter((l) => l.startsWith("@@W1@@")).pop();
          try { out[i] = m ? JSON.parse(m.slice(6)) : { dead: `출력 없음 (종료 ${code}) ${(buf + err).slice(-600)}` }; }
          catch (e) { out[i] = { dead: `출력을 못 읽었어요 — ${e.message}` }; }
          live--; done++;
          if (done === jobs.length) resolve(out); else launch();
        });
      }
    };
    if (!jobs.length) resolve(out); else launch();
  });
}
/* 명전 항목 — 이번 작업이 더한 키와 시각(id·at)을 빼고 견줘요 */
const HOF_NEW = ["no", "rep", "achN", "style", "best", "home", "id", "at", "sent", "word"];
function hofSnap(w) {
  let list = [];
  try { list = JSON.parse(w.localStorage.getItem("grow-hof-v1") || "[]"); } catch { list = []; }
  return JSON.stringify(list.filter((e) => e && e.game === "soccer").map((e) => {
    const c = Object.assign({}, e);
    for (const k of HOF_NEW) delete c[k];
    return c;
  }));
}
/* 한 걸음마다 가볍게 — 흐름이 어디서 갈라졌는지 찾는 데 써요(전체 사진은 체크포인트에서만) */
function core(st) {
  if (!st) return "null";
  const a = st.activity;
  return JSON.stringify([st.phase, st.year, st.month, st.proYear, st.stats, st.fandom, st.money, st.condition, st.camp,
    st.group, st.league, a ? [a.cb, a.week, a.apps, a.goals, a.assists, a.defense, a.opp, a.xi] : null, st.buff, st.trophies]);
}
module.exports.jobArg = jobArg;
module.exports.emit = emit;
module.exports.runJobs = runJobs;
module.exports.hofSnap = hofSnap;
module.exports.core = core;
