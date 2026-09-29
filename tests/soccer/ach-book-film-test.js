/* 🏅 업적 · 🧭 성향 · 🎬 필름 · 📖 도감 장부 (스펙 §3-9 · §5-1 ~ §5-8 · §9-A 14 ~ 18 · 25번 §2-1)
 *
 * A. 🧮 「둘 다」 — 확률형 결정 ≥ 12 · 읽기 일치 ≥ 80%여도 **50 아래에서 참은 결정 < 3 또는 50 위에서 건 결정 < 3이면 🧮 아님**
 *    · evLog의 pct/alt가 §6-1 뜻대로(진짜 이벤트 창에서 답한 줄 — 도전을 골랐으면 pct = 그 칸 % · 안 골랐으면 pct null ·
 *      alt = 내놓은 도전 칸의 최고 % · 도전 칸이 없었으면 alt 없음)
 * B. 업적 멱등 · 조용한 소급 — 옛 세이브(S.ach 없음)를 이어하기로 열어 **결산까지 실제로** 굴리면 첫 판정은 전부 late:true로 조용히,
 *    결산 화면에 「🏅 지난 기록으로 업적 N개를 채웠어요」 한 줄. 같은 세이브로 판정을 세 번 해도 개수·장부가 그대로.
 *    새 선수(S.ach = {})의 첫 판정은 late:false
 *    ⚠️ 「새 id도 조용히」는 ①에서는 검사를 만들 수 없어요(업적 표가 한 번에 생겨 「새 id」가 없어요 — engineer 30번 「결정 필요」 2)
 * C. 대표 업적 — 진행 중에는 딴 것만 setRep · 모르는 id·안 딴 id는 거절 · 은퇴 뒤 [남기기](leave)는 올라가기 전(sent === false)에만,
 *    올라간 뒤에는 거절(대표·한마디 그대로) · 필름에 없는 업적을 대표로 못 넣는다
 * D. 필름 옛 세이브 — 확인용 세이브 soccer-report(6시즌 · 이적 4번 · 계약금·소속 칸 없는 옛 기록)에 월드컵 기록 없음 ·
 *    S.origin 없음 · 이상한 트로피 글자를 얹고 **🎓 은퇴 버튼**으로 필름까지: 예외 0 · 없는 장 생략(🌏 대표팀 없음 · 입단 때 칸 없음 ·
 *    계약금 없는 이적은 「(계약금 …)」 없이) · 🌟 가장 빛난 시즌(25번 §2-1) · 점수 내역 칸의 합 == 보이는 커리어 점수
 * E. 도감 장부 — 두 키 합집합(n은 큰 쪽 · at은 작은 쪽) · 쓸 때 둘 다 · 장부 없는 꾸러미를 베타 writeKeys가 받아
 *    `-book`을 지워도 그림자로 되살아남 · 클라우드 키는 `-book`만(그림자는 안 올라감) · `__proto__` 같은 키는 안 받음 ·
 *    정규식을 지나는 `constructor`·`toString`은 자기 칸으로만 합쳐지고 물려받은 값에 n·at을 안 쓴다(❌-1 수정의 두 겹 — 40번)
 *
 * 변이
 *   A1 🧮 규칙에서 「둘 다 3번 이상」을 지운다        → A 빨간불
 *   A2 alt를 최고가 아니라 최저로 적는다              → A 빨간불
 *   B1 check()의 「이미 딴 것 건너뛰기」를 지운다      → B 빨간불(장부가 판정마다 늘어요)
 *   C1 leave()의 「올라간 뒤 거절」을 지운다           → C 빨간불
 *   D1 필름의 🌟 가장 빛난 시즌을 빼먹는다             → D 빨간불
 *   D2 옛 은퇴식 한마디 칸을 되살린다(#hof-word 둘)     → D 빨간불
 *   E1 장부 합칠 때 n을 더한다(큰 쪽 대신)             → E 빨간불
 *   E2 칸 사전을 보통 객체({})로 되돌린다               → E 사전 방어 빨간불(constructor·toString이 Object에 n·at을 써요)
 *   E3 id 정규식을 옛것(`/^[a-z0-9_:]{1,40}$/i`)으로      → E "__proto__" 줄 빨간불
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const H = require("./_w1.js");
H.guardExit();

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const MUTS = {
  A1: { file: "achieve.js", muts: [[/readOk \/ n >= TH\.READ && heldLow >= TH\.BOTH && betHigh >= TH\.BOTH\)/, "readOk / n >= TH.READ)"]] },
  A2: { file: "events.js", muts: [[/log\.alt = Math\.max\(\.\.\.tries\.map\(\(x\) => x\.pct\)\);/, "log.alt = Math.min(...tries.map((x) => x.pct));"]] },
  B1: { file: "achieve.js", muts: [[/if \(S\.ach\[d\.id\]\) continue;/, ""]] },
  C1: { file: "career.js", muts: [[/if \(!e \|\| e\.sent !== false\) return false;/, "if (!e) return false;"]] },
  D1: { file: "film.js", muts: [[/bright: best \? null : bright\(years\)/, "bright: null"]] },
  D2: { file: "career.js", muts: [[/if \(!filmOn\) \{\n      const wordBox/, "if (true) {\n      const wordBox"]] },
  E1: { file: "book.js", muts: [[/had\.n = Math\.max\(had\.n, c\.n\);/, "had.n = had.n + c.n;"]] },
  /* ❌-1 수정의 두 겹(2026-09-29 engineer) — 하나씩 되돌려요 */
  E2: { file: "book.js", muts: [[/const dict = \(\) => Object\.create\(null\);/, "const dict = () => ({});"]] },
  E3: { file: "book.js", muts: [[/const ID_RE = \/\^\[a-z0-9\]\[a-z0-9_:\]\{0,39\}\$\/i;/, "const ID_RE = /^[a-z0-9_:]{1,40}$/i;"]] },
};
const FX = H.fixtures();
const keysOf = (id) => FX.items.find((x) => x.id === id).keys;
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));
function open(fix, muts, seed, extra) {
  const P = H.boot({ which: "beta", seed, keys: Object.assign({}, keysOf(fix), extra || {}), muts });
  H.tap(P, P.$("btn-continue"));
  const go = P.doc.querySelector(".slot-modal .slot-go"); if (go) H.tap(P, go);
  const no = P.doc.querySelector(".no-overlay #no-skip"); if (no) H.tap(P, no);
  return P;
}

/* ---------- A ---------- */
function styleCases(muts) {
  const P = H.boot({ which: "beta", seed: 1, muts });
  const A = P.w.WingerAch;
  const st = (log) => ({ evLog: log, career: { years: [] }, stats: { shoot: 50, pass: 50, dribble: 50, defense: 50, stamina: 50, speed: 50 }, pos: "fw" });
  const bet = (pct, ok) => ({ id: "p_weak", y: 1, k: "try", pct, ok });
  const held = (alt) => ({ id: "p_booth", y: 1, k: "safe", pct: null, ok: null, alt });
  const R = {
    allBet: A.style(st(Array.from({ length: 12 }, (_, i) => bet(55 + (i % 5), i % 2 === 0)))).k,            // 건 결정만 12(참은 결정 0)
    twoHeld: A.style(st(Array.from({ length: 10 }, (_, i) => bet(60, i % 2 === 0)).concat([held(30), held(40)]))).k,
    both: A.style(st(Array.from({ length: 9 }, (_, i) => bet(60, i % 2 === 0)).concat([held(30), held(40), held(45)]))).k,
    lowRead: A.style(st(Array.from({ length: 6 }, (_, i) => bet(40, i % 2 === 0)).concat(Array.from({ length: 6 }, () => held(60))))).k,
  };
  P.close();
  return R;
}
/* 진짜 이벤트 창에서 답한 evLog 줄 — pre 블록 되풀이(soccer-veteran) · 정책 난수로 아무 칸 */
function logShape(muts) {
  const P = open("soccer-veteran", muts, 3);
  const base = JSON.stringify(P.S());
  const rnd = H.mulberry32(77);
  const out = { n: 0, bad: [], tried: 0, held: 0, noTry: 0, twoTry: 0 };
  for (let k = 0; k < 900; k++) {
    const S = JSON.parse(base);
    S.evSlot = null; S.evSeason = null; S.ev = null; S.fandom = 800 + Math.floor(rnd() * 8000);
    S.buffs = ["boot"]; S.buffY = S.proYear;
    /* 판마다 반은 🌍 1장(도전 칸이 **둘**) — 도전 칸이 하나면 최고 %와 최저 %가 같아 alt의 뜻을 못 가려요 */
    if (k % 2 === 0) S.story = { on: { abroad: { ch: 0, y0: S.proYear, f: { country: "it" } } }, done: [], seen: { "abroad:it": 1 } };
    P.set("S", S);
    P.w.WingerCareer.refreshPro();
    const ev = P.w.WingerEvents.pending();
    if (!ev) continue;
    const ov = P.doc.querySelector(".ev-overlay");
    const i = Math.floor(rnd() * ev.opts.length);
    const n0 = (P.S().evLog || []).length;
    H.tap(P, ov.querySelector(`.ev-opt[data-i="${i}"]`));
    const ok = ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok);
    const l = (P.S().evLog || [])[n0];
    const o = ev.opts[i], tries = ev.opts.filter((x) => x.k === "try");
    out.n++;
    let fine;
    if (o.k === "try") { out.tried++; fine = l.pct === o.pct && l.alt === undefined && typeof l.ok === "boolean"; }
    else if (tries.length) { out.held++; if (tries.length > 1 && tries[0].pct !== tries[1].pct) out.twoTry++; fine = l.pct === null && l.alt === Math.max(...tries.map((x) => x.pct)); }
    else { out.noTry++; fine = l.pct === null && l.alt === undefined; }
    if (!fine && out.bad.length < 2) out.bad.push(`${ev.id} 고른 ${o.k} · 줄 ${JSON.stringify(l)} · 도전 칸 ${tries.map((x) => x.pct).join(",")}`);
    if (!fine) out.badN = (out.badN || 0) + 1;
  }
  out.err = P.errors.slice();
  P.close();
  return out;
}

/* ---------- B ---------- */
function oldSaveAch(muts) {
  // soccer-veteran(13시즌 · S.ach 없음)을 결산까지 진짜로 굴려요
  const P = open("soccer-veteran", muts, 4);
  const had = P.S().ach;
  const D = H.makeDriver(P, { ev: H.EV.safe, move: 0 });
  D.run({ until: () => P.active() === "screen-career", max: 6000 });
  const S = P.S();
  const ach = S.ach || {};
  const ids = Object.keys(ach);
  const lateAll = ids.length > 0 && ids.every((id) => ach[id].late === true);
  const line = Array.from(P.doc.querySelectorAll("#career-card .ach-season")).map((x) => x.textContent).join(" | ");
  const book0 = JSON.stringify(P.w.WingerBook.load().ach);
  const A = P.w.WingerAch;
  const again = [A.check("season"), A.check("story"), A.check("retire")];
  const book1 = JSON.stringify(P.w.WingerBook.load().ach);
  const out = { had: had === undefined, n: ids.length, lateAll, line, again: again.map((x) => x.length), same: Object.keys(P.S().ach).length === ids.length, bookSame: book0 === book1, err: P.errors.slice() };
  P.close();
  return out;
}
function freshAch() {
  const P = H.boot({ which: "beta", seed: 12 });
  const D = H.makeDriver(P, { pos: "fw", market: 0, name: "새내기", ev: H.EV.safe });
  D.run({ until: (S) => S.phase === "soccer-pro" && S.proYear >= 1 && P.active() === "screen-career", max: 20000 });
  const ach = P.S().ach || {};
  const out = { n: Object.keys(ach).length, late: Object.values(ach).filter((v) => v.late).length, line: Array.from(P.doc.querySelectorAll("#career-card .ach-season")).map((x) => x.textContent).join(" | "), err: P.errors.slice() };
  P.close();
  return out;
}

/* ---------- C · D — 은퇴해서 필름까지 ---------- */
async function retireFilm(muts) {
  const P = open("soccer-report", muts, 5);
  const S = P.S();
  delete S.wcHist; delete S.origin;
  S.trophies = (S.trophies || []).concat(["1위", "깨진 값", "12시즌 우승"]);
  if (S.career && S.career.years && S.career.years[0]) delete S.career.years[0].club;   // 소속 칸 없는 옛 시즌
  S.ach = { g100: { y: 3, at: 1, late: true }, apps500: { y: 5, at: 2, late: true } };
  P.w.save();
  P.w.WingerCareer.showActivity();
  /* 올라가는 길(Match.submitHof)은 꺼 둬요 — 은퇴 직후엔 sent:false로 남아야 [남기기]가 열려요 */
  const ret = Array.from(P.doc.querySelectorAll("#career-actions .btn")).find((b) => /은퇴하기/.test(b.textContent));
  P.w.__confirmYes = true;
  H.tap(P, ret);
  await tick(20);
  const body = P.$("film-body");
  const films = JSON.parse(P.w.localStorage.getItem("winger-save-v1-films") || "{}");
  const film = Object.values(films).pop();
  const txt = body ? body.textContent : "";
  const parts = body ? Array.from(body.querySelectorAll(".film-ptable tbody td")).map((td) => +td.textContent.replace(/[^\d-]/g, "")) : [];
  const foot = body && body.querySelector(".film-ptable tfoot td") ? +body.querySelector(".film-ptable tfoot td").textContent.replace(/[^\d-]/g, "") : null;
  const out = {
    screen: P.active(), film: !!film, nat: /🌏 대표팀/.test(txt), origin: /입단 때/.test(txt), bright: /🌟 가장 빛난 시즌/.test(txt),
    feeLine: Array.from(body ? body.querySelectorAll(".film-move") : []).map((x) => x.textContent), partsSum: parts.reduce((a, b) => a + b, 0), foot,
    score: film && film.head.score, err: P.errors.slice(),
    /* 🖊️ 한마디 칸은 문서에 **하나** — 필름 마지막 장에만. 옛 은퇴식 칸이 같은 id로 되살아나면 hof-word-test가
     * getElementById로 **숨은 옛 칸**을 누르고 초록불이 돼요(director 31번 「검사의 빈 자리」) */
    hofWord: { n: P.doc.querySelectorAll("#hof-word").length, inFilm: !!(body && body.querySelector("#hof-word")) },
  };
  // C — 대표 업적 잠금
  const hof = JSON.parse(P.w.localStorage.getItem("grow-hof-v1") || "[]");
  const e = hof.find((x) => x.game === "soccer");
  out.sent0 = e && e.sent;
  const L = P.w.WingerCareer.leave;
  out.leaveUnearned = await L(e.id, { rep: "ballon3" });            // 필름에 없는 업적
  out.repAfterUnearned = JSON.parse(P.w.localStorage.getItem("grow-hof-v1")).find((x) => x.id === e.id).rep;
  /* 올라간 걸로 치고(원격이 받아 준 뒤와 같은 상태) 다시 남기기 → 거절 */
  P.w.Match = Object.assign({}, P.w.Match || {}, { submitHof: async () => true, backfillHof: async () => {}, fetchHof: async () => [] });
  out.leave1 = await L(e.id, { rep: "apps500", word: "첫 한마디" });
  out.sent1 = JSON.parse(P.w.localStorage.getItem("grow-hof-v1")).find((x) => x.id === e.id).sent;
  out.leave2 = await L(e.id, { rep: "g100", word: "두 번째" });
  const e2 = JSON.parse(P.w.localStorage.getItem("grow-hof-v1")).find((x) => x.id === e.id);
  out.after = { rep: e2.rep, word: e2.word };
  P.close();
  return out;
}
function setRepCase() {
  const P = open("soccer-veteran", null, 6);
  const A = P.w.WingerAch;
  const S = P.S();
  S.ach = { g100: { y: 3, at: 1, late: false } };
  const r = { unknown: A.setRep("nope"), unearned: A.setRep("ballon3"), earned: A.setRep("g100"), rep: P.S().rep };
  P.close();
  return r;
}

/* ---------- E ---------- */
function bookCase(muts) {
  /* `"__proto__"` 키는 **문자열로** 넣어요 — 객체 글자로 적으면 JS가 프로토타입으로 읽어 키가 안 생겨요.
   * 다른 기기의 장부는 JSON.parse로 들어오고, JSON.parse는 "__proto__"를 **자기 칸**으로 만들어요 */
  /* `constructor`·`toString`은 **정규식을 지나는 이름**이에요(첫 글자 영숫자). 칸 사전이 보통 객체면 물려받은 값
   * (Object 함수 · Object.prototype.toString)을 「이미 있는 칸」으로 읽어 거기에 n·at을 써요 — 사전 쪽 방어만 이걸 막아요 */
  const P = H.boot({ which: "beta", seed: 7, muts, keys: {
    "winger-save-v1-book": `{"v":1,"ev":{"p_gap":{"n":3,"at":200},"__proto__":{"n":9,"at":1},"constructor":{"n":4,"at":40},"toString":{"n":2,"at":20}},"end":{},"ach":{"g100":{"n":1,"at":50}},"pend":[]}`,
    "winger-book-shadow": JSON.stringify({ v: 1, ev: { p_gap: { n: 5, at: 100 }, p_weak: { n: 2, at: 300 }, constructor: { n: 6, at: 60 }, toString: { n: 1, at: 10 } },
      end: { "abroad:learned": { n: 1, at: 10 } }, ach: {}, pend: [] }),
  } });
  const B = P.w.WingerBook;
  const out = {};
  const b0 = B.load();
  out.union = { gap: b0.ev.p_gap, weak: b0.ev.p_weak, end: b0.end["abroad:learned"], ach: b0.ach.g100 };
  /* 🔒 `__proto__` — 받지 않아야 해요(book.js 주석이 그렇게 약속해요). 받으면 load()의 합치기가 **Object.prototype**에 n·at을 써요 */
  out.proto = { own: Object.prototype.hasOwnProperty.call(b0.ev, "__proto__"), n: P.get("({}).n"), at: P.get("({}).at") };
  /* 🔒 사전 방어 — 정규식을 지나는 이름은 **보통 id처럼 자기 칸으로** 합쳐져야 해요(n 큰 쪽 · at 작은 쪽) · 물려받은 것엔 아무것도 안 써요 */
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null;
  out.dict = { ctor: own(b0.ev, "constructor"), str: own(b0.ev, "toString"),
    objN: P.get("Object.n"), objAt: P.get("Object.at"), tsN: P.get("Object.prototype.toString.n"), tsAt: P.get("Object.prototype.toString.at") };
  B.mark("ev", "constructor");
  const k0 = JSON.parse(P.w.localStorage.getItem("winger-save-v1-book"));
  out.dict.marked = k0.ev.constructor ? k0.ev.constructor.n : null;
  out.dict.objN2 = P.get("Object.n");
  B.mark("ev", "p_gap");
  const k = JSON.parse(P.w.localStorage.getItem("winger-save-v1-book")), sh = JSON.parse(P.w.localStorage.getItem("winger-book-shadow"));
  out.both = { key: k.ev.p_gap, shadow: sh.ev.p_gap };
  // 장부를 모르는 옛 판이 올린 꾸러미(-book 없음)를 베타 클라우드가 받으면 -book을 지워요
  const C = P.w.Cloud && P.w.Cloud._t;
  out.cloudKeys = C ? C.keysOf("soccer") : [];
  const slots = P.w.localStorage.getItem("winger-save-v1-slots") || "{}";
  if (C) C.writeKeys("soccer", { "winger-save-v1-slots": slots });
  out.keyGone = P.w.localStorage.getItem("winger-save-v1-book") === null;
  const b1 = B.load();
  out.revive = { gap: b1.ev.p_gap, weak: b1.ev.p_weak };
  B.mark("ev", "p_weak");
  out.rewritten = P.w.localStorage.getItem("winger-save-v1-book") !== null;
  out.bad = B.mark("ev", "__proto__") === false && B.mark("xx", "p_gap") === false;
  out.err = P.errors.slice();
  P.close();
  return out;
}

(async () => {
  console.log("=== 0. 변이 등록 ===");
  const miss = H.mutMisses(MUTS);
  check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);

  console.log("=== A. 🧮 「둘 다」 · evLog pct/alt ===");
  const A = styleCases(null);
  check(A.allBet !== "reader" && A.twoHeld !== "reader" && A.both === "reader" && A.lowRead !== "reader",
    `🧮 — 건 결정만 12 → ${A.allBet} · 참은 결정 2 → ${A.twoHeld} · 둘 다 3↑ → ${A.both} · 읽기 50% → ${A.lowRead}`);
  const L = logShape(null);
  check(L.tried >= 20 && L.held >= 20 && L.twoTry >= 20 && (L.badN || 0) === 0, `evLog pct/alt — 도전 ${L.tried} · 참음(도전 칸 있음) ${L.held}(그중 도전 칸 둘 ${L.twoTry}) · 도전 칸 없음 ${L.noTry} · 어긋남 ${L.badN || 0}${L.bad.length ? ` — ${L.bad[0]}` : ""}`);

  console.log("=== B. 업적 멱등 · 조용한 소급 ===");
  const B = oldSaveAch(null);
  check(B.had && B.n >= 5 && B.lateAll, `옛 세이브(S.ach 없음) 첫 결산 — ${B.n}개 전부 late:true`);
  check(new RegExp(`지난 기록으로 업적 ${B.n}개를 채웠어요`).test(B.line) && !/이번 시즌 업적/.test(B.line), `결산 화면 한 줄만 — 「${B.line}」`);
  check(B.again.every((n) => n === 0) && B.same && B.bookSame, `같은 세이브로 판정 세 번 더 — 새로 딴 것 ${B.again.join("/")} · 개수 그대로 · 장부 그대로`);
  const F = freshAch();
  check(F.late === 0, `새 선수의 첫 결산 — late 0 (딴 것 ${F.n} · 「${F.line || "줄 없음"}」)`);
  check(B.err.concat(F.err).length === 0, "B 페이지 안 예외 0");
  console.log("   🚧 「새 id도 조용히」 — ①은 업적 표가 한 번에 생겨 「새 id」가 없어요. ②에서 표 판 번호(S.achV 같은 칸)가 생기면 검사를 만드세요");

  console.log("=== C. 대표 업적 ===");
  const R = setRepCase();
  check(R.unknown === false && R.unearned === false && R.earned === true && R.rep === "g100", `진행 중 setRep — 모르는 id ${R.unknown} · 안 딴 id ${R.unearned} · 딴 id ${R.earned}(S.rep ${R.rep})`);
  const D = await retireFilm(null);
  check(D.sent0 === false && D.leaveUnearned === true && D.repAfterUnearned !== "ballon3", `은퇴 직후 sent:false · 필름에 없는 업적은 대표로 못 넣음 (대표 ${D.repAfterUnearned})`);
  check(D.leave1 === true && D.sent1 === true && D.leave2 === false && D.after.rep === "apps500" && D.after.word === "첫 한마디",
    `올라간 뒤(sent) 다시 남기기 거절 — 1차 ${D.leave1} · 2차 ${D.leave2} · 대표 ${D.after.rep} · 한마디 「${D.after.word}」`);

  console.log("=== D. 필름 옛 세이브 ===");
  check(D.screen === "screen-film" && D.film && D.err.length === 0, `🎓 은퇴 → 필름 화면 · 예외 0 (${D.screen}${D.err.length ? ` — ${D.err[0].slice(0, 200)}` : ""})`);
  check(!D.nat && !D.origin, `없는 장은 생략 — 🌏 대표팀 ${D.nat ? "있음" : "없음"} · 「입단 때」 칸 ${D.origin ? "있음" : "없음"}`);
  check(D.feeLine.length > 0 && D.feeLine.every((t) => !/계약금/.test(t)), `계약금 없는 옛 이적은 「(계약금 …)」 없이 (${D.feeLine.slice(0, 2).join(" / ")})`);
  check(D.bright, "🌟 가장 빛난 시즌 — 최고의 한 수가 없는 옛 세이브에 그려진다(25번 §2-1)");
  check(D.foot === D.score && D.partsSum === D.score, `점수 내역 — 칸의 합 ${D.partsSum} == 표의 커리어 점수 ${D.foot} == 필름 점수 ${D.score}`);
  check(D.hofWord.n === 1 && D.hofWord.inFilm, `🖊️ 한마디 칸은 문서에 하나 · 필름 안에 (${D.hofWord.n}개 · 필름 안 ${D.hofWord.inFilm})`);

  console.log("=== E. 도감 장부 ===");
  const E = bookCase(null);
  check(E.union.gap && E.union.gap.n === 5 && E.union.gap.at === 100 && E.union.weak && E.union.end && E.union.ach,
    `합집합 — p_gap n ${E.union.gap && E.union.gap.n}(큰 쪽) · at ${E.union.gap && E.union.gap.at}(작은 쪽) · 한쪽에만 있는 칸도`);
  check(!E.proto.own && E.proto.n === undefined && E.proto.at === undefined,
    `다른 기기 장부의 "__proto__" 키를 안 받는다 — 자기 칸 ${E.proto.own} · 불러온 뒤 ({}).n = ${E.proto.n} · ({}).at = ${E.proto.at}`);
  const Dd = E.dict;
  check(!!Dd.ctor && Dd.ctor.n === 6 && Dd.ctor.at === 40 && !!Dd.str && Dd.str.n === 2 && Dd.str.at === 10,
    `사전 방어 — "constructor"·"toString"은 보통 id처럼 **자기 칸**으로 합쳐진다 (constructor n ${Dd.ctor && Dd.ctor.n} · at ${Dd.ctor && Dd.ctor.at} · toString n ${Dd.str && Dd.str.n} · at ${Dd.str && Dd.str.at})`);
  check(Dd.objN === undefined && Dd.objAt === undefined && Dd.tsN === undefined && Dd.tsAt === undefined && Dd.objN2 === undefined && Dd.marked === 7,
    `사전 방어 — 물려받은 값(Object · Object.prototype.toString)에 n·at을 안 쓴다 (Object.n ${Dd.objN} · toString.n ${Dd.tsN} · mark 뒤 Object.n ${Dd.objN2} · constructor 칸 ${Dd.marked})`);
  check(E.both.key.n === 6 && E.both.shadow.n === 6, `쓸 때 둘 다 — 본 키 ${E.both.key.n} · 그림자 ${E.both.shadow.n}`);
  check(E.cloudKeys.includes("winger-save-v1-book") && !E.cloudKeys.includes("winger-book-shadow"), `클라우드 키 — ${E.cloudKeys.join(", ")}`);
  check(E.keyGone && E.revive.gap && E.revive.gap.n === 6 && E.revive.weak && E.rewritten, `장부 없는 꾸러미로 -book이 지워져도(${E.keyGone}) 그림자로 되살아나고 다음 쓰기에 다시 올라간다`);
  check(E.bad, `mark — 모르는 종류(xx)와 "__proto__" id는 안 쓴다 (false여야 해요)`);
  check(E.err.length === 0, `E 페이지 안 예외 0${E.err.length ? ` — ${E.err[0].slice(0, 200)}` : ""}`);

  console.log("=== 변이 검증 ===");
  if (miss.length) check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)");
  else {
    const a1 = styleCases({ "achieve.js": MUTS.A1.muts });
    check(a1.allBet === "reader" || a1.twoHeld === "reader", `A1 「둘 다」를 지우면 → A 빨간불 (건 결정만 → ${a1.allBet} · 참은 결정 2 → ${a1.twoHeld})`);
    const a2 = logShape({ "events.js": MUTS.A2.muts });
    check((a2.badN || 0) > 0, `A2 alt를 최저로 → A 빨간불 (어긋남 ${a2.badN || 0})`);
    const b1 = oldSaveAch({ "achieve.js": MUTS.B1.muts });
    check(!(b1.again.every((n) => n === 0) && b1.bookSame), `B1 이미 딴 것을 안 건너뛰면 → B 빨간불 (다시 딴 것 ${b1.again.join("/")} · 장부 ${b1.bookSame ? "그대로" : "늘어남"})`);
    const c1 = await retireFilm({ "career.js": MUTS.C1.muts });
    check(c1.leave2 === true || c1.after.rep !== "apps500", `C1 올라간 뒤 거절을 지우면 → C 빨간불 (2차 ${c1.leave2} · 대표 ${c1.after.rep})`);
    const d1 = await retireFilm({ "film.js": MUTS.D1.muts });
    check(!d1.bright, `D1 🌟를 빼먹으면 → D 빨간불 (${d1.bright ? "보임" : "안 보임"})`);
    const d2 = await retireFilm({ "career.js": MUTS.D2.muts });
    check(d2.hofWord.n > 1, `D2 옛 은퇴식 한마디 칸을 되살리면 → D 빨간불 (#hof-word ${d2.hofWord.n}개)`);
    const e1 = bookCase({ "book.js": MUTS.E1.muts });
    check(!(e1.union.gap && e1.union.gap.n === 5), `E1 n을 더하면 → E 빨간불 (p_gap n ${e1.union.gap && e1.union.gap.n})`);
    const e2 = bookCase({ "book.js": MUTS.E2.muts });
    const e2red = !(e2.dict.ctor && e2.dict.ctor.n === 6) || e2.dict.objN !== undefined || e2.dict.tsN !== undefined;
    check(e2red, `E2 사전만 보통 객체로 되돌리면 → 사전 방어 빨간불 (Object.n ${e2.dict.objN} · toString.n ${e2.dict.tsN} · constructor 자기 칸 ${!!e2.dict.ctor})`);
    const e3 = bookCase({ "book.js": MUTS.E3.muts });
    check(e3.proto.own || !e3.bad, `E3 정규식만 옛것으로 되돌리면 → "__proto__" 줄 빨간불 (자기 칸 ${e3.proto.own} · mark 거절 ${e3.bad})`);
  }
  console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(bad ? 1 : 0);
})().catch(H.die);
