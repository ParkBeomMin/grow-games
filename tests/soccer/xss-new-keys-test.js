/* 🛡️ 새로 그리는 글자가 태그로 새지 않는가 — 명전 새 키 · 필름 · 공유 이미지 창 · 이벤트 창 · 결산 이야기 줄 (스펙 §2-10 · §9-C)
 *
 * 명예의 전당은 **남이 올린 값**을 그려요(원격 항목은 match.js scrub이 받을 때 한 번 씻지만, **로컬 명전에는 씻기 전 값**이
 * 있을 수 있어요 — career.js 주석). 그래서 그리는 자리마다 esc가 방어선이에요.
 * 이번 작업이 새로 그리는 자리: 명전 카드의 #번호 · 🏅 대표 업적 · 🏠 가장 오래 뛴 클럽 · 🧭 성향 · 🎯 최고의 한 수 · 🏅 딴 업적 수 ·
 * 목록의 대표 업적 배지 · 🎬 필름 전부(클럽·트로피·수상·이적·대표팀·이야기·점수 내역·한마디·표지) · 📤 이미지 창 ·
 * 🎲 이벤트 창(본문에 명단 이름·클럽 이름이 들어가요) · 결산의 📖 이야기 줄 · 🔢 선배 번호 버튼 ·
 * 👥 스쿼드 내 줄·준비 화면 이름 줄의 #번호(세이브의 S.no — 1~99 정수일 때만 그려요, ❌-2 수정 · 2026-09-29)
 *
 * 지키는 것 — 자리마다 **두 가지를 같이** 봐요
 *   ⓐ 태그가 DOM에 안 들어갔다(img·svg·script·iframe·on* 속성 0)
 *   ⓑ 🔒 **그 칸이 실제로 그려졌다**(씻긴 글자 「<img」가 화면 글자에 보인다) — 안 그려서 안 새는 건 통과가 아니에요
 *
 * 변이 — 그리는 길에서 esc를 **하나씩** 빼고 페이지를 다시 세워, 그 자리가 빨간불이 되는지 봐요
 *   (「esc 함수가 이스케이프한다」만 보면 부르지도 않는 esc를 지키게 돼요 — grow-test-writing)
 *   X8은 esc가 아니라 「1~99 정수일 때만」 거르기를 빼요(스쿼드 줄은 그 거르기가 방어예요)
 *
 * 경로는 게임 입구 그대로: 타이틀 🏛️ → 목록 카드 → 카드 레이어 → 🎬 필름 → 📤 / 이어하기 → 준비 화면 · 결산 화면 · 👥 스쿼드
 * 캔버스가 없는 jsdom이라 📤는 가짜 2D 문맥·toDataURL을 심어 ③ 이미지 창까지 가요(그림 자체는 👁️ 실기기 몫).
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const H = require("./_w1.js");
H.guardExit();

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const X = (tag) => `<img src=x class="xss" data-at="${tag}" onerror="window.__xss=1">`;

/* ---------- 심을 것 ---------- */
const FX = H.fixtures();
const slotOf = (id) => { const it = FX.items.find((x) => x.id === id); const sl = JSON.parse(it.keys["winger-save-v1-slots"]); const k = Object.keys(sl)[0]; return { k, S: sl[k], keys: it.keys }; };
function keysWith(id, patch) {
  const b = slotOf(id);
  patch(b.S);
  b.S.savedAt = b.S.betaAt = 1790000000000;           // 베타가 마지막으로 저장한 세이브 — onLoad가 안 치워요
  return Object.assign({}, b.keys, { "winger-save-v1-slots": JSON.stringify({ [b.k]: b.S }) });
}
const HOF_ID = "w1790000000001";
const entry = {
  id: HOF_ID, at: 1790000000001, game: "soccer", name: `이름${X("name")}`, pos: "fw", team: `팀${X("team")}`, seasons: 12,
  wins: 30, daesang: 2, bonsang: 3, rookie: 1, ballon: 0, goals: 120, assists: 40, defense: 10, apps: 400, finalOvr: 110,
  trans: 0, gen: 1, score: 2500, sv: 3, teamSeasons: 8, trophies: 4, leagues: `🇰🇷 K1${X("leagues")}`, peakLg: "🇰🇷 K리그1",
  country: "kr", title: "🌟", bestTitle: "🌟", grade: `🐐${X("grade")}`, wcWin: 0, wcApps: 0, wcBall: 0, wcBoot: 0, wcWall: 0,
  sent: true, word: `한마디${X("word")}`,
  // 🆕 이번 작업이 더한 키 — 남이 올린 값이라고 치고 태그를 넣어요
  no: `7${X("no")}`, rep: `g100${X("rep")}`, achN: `9${X("achN")}`, style: `reader${X("style")}`,
  best: { id: "p_weak", name: `🦶 반대발${X("best")}`, pct: `27${X("pct")}`, y: `6${X("besty")}` },
  home: { club: `클럽${X("home")}`, seasons: `8${X("homeN")}` },
};
const film = {
  v: 1, id: HOF_ID,
  head: { name: `이름${X("f-name")}`, pos: "fw", no: `10${X("f-no")}`, age: 32, club: `막클럽${X("f-club")}`, grade: `🐐${X("f-grade")}`,
    score: 2500, gen: 1, rep: "g100", flag: "🇰🇷" },
  ch: [{ club: `클럽A${X("ch-club")}`, lgs: [5, 4], y0: 1, y1: 6, apps: 200, g: 60, a: 20, d: 5,
    tro: [`3시즌 리그${X("ch-tro")} 우승`], aw: [`상${X("ch-aw")}`], back: false },
  { club: `클럽B${X("ch-club2")}`, lgs: [1], y0: 7, y1: 12, apps: 200, g: 60, a: 20, d: 5, tro: [], aw: [], back: false }],
  /* 이적 줄은 다음 장의 클럽 이름과 **같은 글자**여야 찾아져요(scenes.js moveHTML) — 그래서 같은 태그를 씁니다 */
  moves: [{ y: 6, to: `클럽B${X("ch-club2")}`, toLg: 1, fee: 4200 }],
  nat: { wc: [{ y: 3, r: `semi${X("wc-r")}`, g: 2, a: 1, apps: 5, aw: [`boot${X("wc-aw")}`], stay: false }] },
  hon: [{ y: 3, t: `리그${X("hon")} 우승` }],
  awards: [{ label: `🥇 골든부츠${X("aw-label")}`, n: 2 }],
  body: { from: null, to: { shoot: 100, pass: 90, dribble: 80, defense: 50, stamina: 70, speed: 60 }, best: 5, max: 118.4, trans: 0, weak: [3, 6] },
  pick: { style: { k: "reader", name: `🧮 성향${X("st-name")}`, line: `근거${X("st-line")}` },
    best: null, luck: { n: 20, exp: 10.2, got: 12 },
    bright: { y: 9, club: `빛난클럽${X("br-club")}`, lg: 1, g: 31, a: 5, d: null, aw: [`수상${X("br-aw")}`], hype: 9.1 } },
  ends: [{ sid: "abroad", end: "learned", name: `결말${X("end")}`, y: 5 }],
  parts: [{ k: "fan", label: `⭐ 명성${X("part")}`, n: 900, v: 54 }],
  ach: [{ id: "g100", y: 5 }], word: `한마디${X("f-word")}`,
};

/* 필름이 있는 명전 항목 하나 + 대표 업적이 **알려진** id인 항목 하나(배지가 그려지는지 — ⓑ의 짝) */
const known = Object.assign({}, entry, { id: "w1790000000002", at: 1790000000002, name: "알려진대표", rep: "g100", no: 9, best: null, home: null, style: "reader", word: "" });
const HOF_KEYS = { "grow-hof-v1": JSON.stringify([entry, known]), "winger-save-v1-films": JSON.stringify({ [HOF_ID]: film }) };

/* ---------- 재기 ---------- */
const INJ = "img, svg, script, iframe, object, embed, [onerror], [onload], .xss";
const leaks = (root) => (root ? Array.from(root.querySelectorAll(INJ)).map((e) => e.getAttribute("data-at") || e.tagName.toLowerCase()) : ["(자리가 없어요)"]);
const shows = (root, frag) => !!root && root.textContent.includes(frag);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 3000)) { const v = fn(); if (v) return v; await tick(20); } return null; }

/* 캔버스 없는 jsdom — 📤를 ③ 이미지 창까지 보내려고 가짜 2D 문맥을 심어요(그림 내용은 👁️ 실기기) */
function fakeCanvas(w) {
  const ctx = new Proxy({}, { get: (t, k) => (k === "measureText" ? (s) => ({ width: String(s).length * 20 })
    : k === "createLinearGradient" ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
  w.HTMLCanvasElement.prototype.toBlob = undefined;
}

/* 한 판 — muts를 먹인 페이지에서 자리마다 재요. 돌려주는 것 { 자리: { leak: [...], drawn: bool } } */
async function measure(muts) {
  const out = {};
  // ① 명전 목록 · 카드 · 필름 · 📤
  {
    const P = H.boot({ which: "beta", seed: 1, keys: HOF_KEYS, muts });
    fakeCanvas(P.w);
    H.tap(P, P.$("btn-hof"));
    const cards = await until(() => { const l = P.doc.querySelectorAll("#hof-list .hof-card"); return l.length >= 2 ? l : null; });
    const list = P.$("hof-list");
    out["명전 목록(대표 업적 배지)"] = { leak: leaks(list), drawn: !!cards && !!list.querySelector(".ach-badge") };
    const mine = cards && Array.from(cards).find((c) => c.textContent.includes("이름"));
    if (mine) H.tap(P, mine);
    const card = await until(() => P.doc.querySelector(".hof-overlay"));
    out["명전 카드 새 키(#번호·🏠·🧭·🎯·🏅 수)"] = { leak: leaks(card),
      drawn: shows(card, `7${X("no")}`) && shows(card, `클럽${X("home")}`) && shows(card, `반대발${X("best")}`) && shows(card, `9${X("achN")}`) };
    out["명전 카드 — 모르는 대표 업적·성향은 안 그림"] = { leak: leaks(card), drawn: !!card && !card.querySelector(".ach-badge") && !shows(card, "reader") };
    const fb = card && card.querySelector("#btn-hofd-film");
    if (fb) H.tap(P, fb);
    const fbody = await until(() => (P.active() === "screen-film" ? P.$("film-body") : null));
    const fx = ["f-name", "f-no", "f-club", "f-grade", "ch-club", "ch-club2", "ch-tro", "ch-aw", "wc-r", "wc-aw", "hon", "aw-label",
      "st-name", "st-line", "br-club", "br-aw", "end", "part", "f-word"];
    const miss = fx.filter((t) => !shows(fbody, X(t)));
    const mv = fbody && fbody.querySelector(".film-move");
    if (!(mv && mv.textContent.includes(X("ch-club2")))) miss.push("이적 줄(💼 …로)");
    out["🎬 필름 전 장(표지·클럽·이적·대표팀·진열장·선택·이야기·내역·한마디)"] = { leak: leaks(fbody), drawn: !!fbody && miss.length === 0, note: miss.length ? `안 그려진 칸: ${miss.join(",")}` : "" };
    const sh = fbody && fbody.querySelector('[data-act="share"]');
    if (sh) H.tap(P, sh);
    const ov = await until(() => P.doc.querySelector(".share-overlay"), 4000);
    const img = ov && ov.querySelector("img.share-img");
    out["📤 이미지 창(alt)"] = { leak: ov ? leaks(ov).filter((x) => !(x === "img")) .concat(img && img.hasAttribute("onerror") ? ["onerror"] : []) : ["(창이 안 떴어요)"],
      drawn: !!img && (img.getAttribute("alt") || "").includes("<img") };
    out.__errors = (out.__errors || []).concat(P.errors);
    P.close();
  }
  // ② 결산 화면 — 📖 이야기 줄 · 🔢 선배 번호 버튼
  {
    const keys = keysWith("soccer-final", (S) => {
      S.no = 3;
      S.story = { on: {}, seen: {}, done: [{ sid: "senior", end: "handshake", y: S.proYear, name: `악수${X("line")}`, who: `선배${X("who")}`, no: 21, mate: `선배${X("mate")}` }] };
    });
    const P = H.boot({ which: "beta", seed: 2, keys, muts });
    H.tap(P, P.$("btn-continue"));
    const go = await until(() => P.doc.querySelector(".slot-modal .slot-go"));
    if (go) H.tap(P, go);
    const cc = await until(() => (P.active() === "screen-career" ? P.$("career-card") : null));
    out["결산 📖 이야기 줄 · 🔢 선배 번호"] = { leak: leaks(cc), drawn: shows(cc, `악수${X("line")}`) && shows(cc, `선배${X("mate")}`) };
    out.__errors = (out.__errors || []).concat(P.errors);
    P.close();
  }
  // ③ 준비 화면 — 🎲 이벤트 창 · 👥 스쿼드 내 줄 #번호
  {
    const keys = keysWith("soccer-slot", (S) => {
      S.no = `5${X("sq-no")}`;
      S.ev = { id: "p_mateslump", sid: null, ch: null, at: { y: S.proYear, cb: 1, wk: 8 }, u: 0.5, title: `제목${X("ev-title")}`,
        body: `동료 선수${X("ev-body")} — 요즘 부진해요.`,
        opts: [{ k: "safe", label: `넘긴다${X("ev-label")}`, fx: {} },
          { k: "promise", label: "약속한다", cond: { kind: "W" }, ref: { hit: 4, of: 10 }, opp: `상대${X("ev-opp")}`, win: { fame: 25 }, lose: { fame: -25 } },
          { k: "try", label: "같이 남는다", fx: {}, win: { trust: 2 }, lose: { trust: -2 }, pct: 55,
            parts: [{ label: "기본", v: 50 }, { label: `패스${X("ev-part")}`, v: 5 }, { label: "컨디션", v: 0, usual: 70, now: 70 }] }] };
    });
    const P = H.boot({ which: "beta", seed: 3, keys, muts });
    H.tap(P, P.$("btn-continue"));
    const go = await until(() => P.doc.querySelector(".slot-modal .slot-go"));
    if (go) H.tap(P, go);
    const ev = await until(() => P.doc.querySelector(".ev-overlay"));
    out["🎲 이벤트 창(제목·본문·선택지·상대·조각)"] = { leak: leaks(ev),
      drawn: ["ev-title", "ev-body", "ev-label", "ev-opp", "ev-part"].every((t) => shows(ev, X(t))) };
    if (ev) { H.tap(P, ev.querySelector('.ev-opt[data-i="0"]')); const ok = await until(() => ev.querySelector(".ev-ok")); if (ok) H.tap(P, ok); }
    const sq = P.$("btn-squad-pro");
    if (sq) H.tap(P, sq);
    const lay = await until(() => P.doc.querySelector(".squad-overlay"));
    /* 👥 번호는 **1~99 정수일 때만** 그려요(❌-2 수정 — squad.js · 이름 줄 career.js validNo). 깨진 번호는 새지도 그려지지도 않고,
     * 🔒 정수 번호는 그려져야 해요 — 안 그려서 안 새는 건 통과가 아니에요(같은 페이지에서 7로 바꿔 다시 열어요) */
    const tagged = { leak: leaks(lay), noEl: !!lay && !lay.querySelector(".sq-no"), name: (P.$("pro-name") || {}).textContent || "" };
    if (lay) lay.remove();
    if (P.S()) P.S().no = 7;
    P.w.WingerCareer.refreshPro();
    const sq2 = P.$("btn-squad-pro");
    if (sq2) H.tap(P, sq2);
    const lay2 = await until(() => P.doc.querySelector(".squad-overlay"));
    const good = { sq: lay2 && lay2.querySelector(".sq-no") ? lay2.querySelector(".sq-no").textContent : "", name: (P.$("pro-name") || {}).textContent || "" };
    out[SQUAD] = { leak: tagged.leak, drawn: tagged.noEl && !tagged.name.includes("<img") && good.sq === "#7" && / #7 /.test(good.name),
      note: `깨진 번호 — .sq-no ${tagged.noEl ? "없음" : "있음"} · 이름 줄 「${tagged.name}」 / 정수 7 — 「${good.sq}」 · 「${good.name}」` };
    out.__errors = (out.__errors || []).concat(P.errors);
    P.close();
  }
  return out;
}

/* ---------- 변이 — 그리는 길에서 esc 하나씩 빼기 ---------- */
const SQUAD = "👥 스쿼드 내 줄 · 이름 줄 #번호(세이브의 S.no)";
const MUTS = {
  X1: { what: "명전 카드 row()의 esc", file: "career.js", site: "명전 카드 새 키(#번호·🏠·🧭·🎯·🏅 수)",
    muts: [[/const row = \(k, v\) => \(v \? `<div class="hofd-row"><span>\$\{k\}<\/span><b>\$\{esc\(v\)\}<\/b><\/div>` : ""\);/,
      'const row = (k, v) => (v ? `<div class="hofd-row"><span>${k}</span><b>${v}</b></div>` : "");']] },
  X2: { what: "명전 카드 #번호의 esc", file: "career.js", site: "명전 카드 새 키(#번호·🏠·🧭·🎯·🏅 수)",
    muts: [[/<span class="hofd-no">#\$\{esc\(e\.no\)\}<\/span>/, '<span class="hofd-no">#${e.no}</span>']] },
  X3: { what: "필름 클럽 이름의 esc", file: "scenes.js", site: "🎬 필름 전 장(표지·클럽·이적·대표팀·진열장·선택·이야기·내역·한마디)",
    muts: [[/<b class="film-club">\$\{esc\(c\.club \|\| "소속 기록 이전"\)\}<\/b>/, '<b class="film-club">${c.club || "소속 기록 이전"}</b>']] },
  X4: { what: "필름 이야기 결말 이름의 esc", file: "scenes.js", site: "🎬 필름 전 장(표지·클럽·이적·대표팀·진열장·선택·이야기·내역·한마디)",
    muts: [[/「\$\{esc\(x\.name\)\}」 <span class="film-y">/, '「${x.name}」 <span class="film-y">']] },
  X5: { what: "이미지 창 alt의 esc", file: "scenes.js", site: "📤 이미지 창(alt)",
    muts: [[/alt="\$\{esc\(m\.name\)\}의 은퇴 카드"/, 'alt="${m.name}의 은퇴 카드"']] },
  X6: { what: "결산 이야기 줄의 esc", file: "career.js", site: "결산 📖 이야기 줄 · 🔢 선배 번호",
    muts: [[/`<div class="hint story-end">📖 \$\{esc\(l\)\}<\/div>`/, '`<div class="hint story-end">📖 ${l}</div>`']] },
  X7: { what: "이벤트 창 본문의 esc", file: "scenes.js", site: "🎲 이벤트 창(제목·본문·선택지·상대·조각)",
    muts: [[/\$\{esc\(ev\.body\)\.replace\(\/\\n\/g, "<br\/>"\)\}/, '${ev.body.replace(/\\n/g, "<br/>")}']] },
  X8: { what: "스쿼드 내 줄의 「1~99 정수일 때만」", file: "squad.js", site: SQUAD,
    muts: [[/const noTag = Number\.isInteger\(S\.no\) && S\.no >= 1 && S\.no <= 99 \?/, "const noTag = S.no ?"]] },
};

(async () => {
  console.log("=== 0. 변이 등록 ===");
  const miss = H.mutMisses(Object.fromEntries(Object.entries(MUTS).map(([k, m]) => [k, { file: m.file, muts: m.muts }])));
  check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);
  /* ✍️ 이름 칸(e.name)은 옛 기능이라 hof-word-test가 지켜요 — 여기선 새 키만 셉니다 */

  console.log("=== ⓐ 태그가 DOM에 안 들어간다 · ⓑ 그 칸이 실제로 그려졌다 ===");
  const base = await measure(null);
  const errs = base.__errors; delete base.__errors;
  for (const [site, r] of Object.entries(base)) {
    check(r.leak.length === 0, `${site} — 새는 태그 0${r.leak.length ? ` (새어 들어감: ${r.leak.join(",")})` : ""}`);
    check(r.drawn, `${site} — 🔒 그 칸이 실제로 그려졌다${site === SQUAD ? "(정수 번호는 그려지고 깨진 번호는 안 그려진다)" : "(씻긴 글자가 보인다)"}${r.note ? ` — ${r.note}` : ""}`);
  }
  check(errs.length === 0, `페이지 안 예외 0${errs.length ? ` — ${errs.slice(0, 2).join(" | ").slice(0, 300)}` : ""}`);

  console.log("=== 변이 검증 — esc를 하나씩 빼면 그 자리가 빨간불 ===");
  if (miss.length) { check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)"); }
  else {
    for (const [k, m] of Object.entries(MUTS)) {
      const r = await measure({ [m.file]: m.muts });
      delete r.__errors;
      const hit = r[m.site] && r[m.site].leak.length > 0;
      check(hit, `${k} ${m.what}를 빼면 → 「${m.site}」에 태그가 새어 들어간다 (${hit ? r[m.site].leak.join(",") : "안 샘 — 이 자리를 아무것도 안 지키고 있어요"})`);
    }
  }
  console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(bad ? 1 : 0);
})().catch(H.die);
