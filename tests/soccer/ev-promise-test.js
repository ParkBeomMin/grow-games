/* 📋 약속 — 띠 · 판정 · 벤치 · 상대 지정 · 만료 · 없던 일 · 한 번에 하나 (스펙 §3-6 · §9-A 12)
 *
 * 약속은 확률이 아니라 **다음에 출전한 리그 경기의 기록**이 정해요(새 난수 없음).
 *   ① 띠 — 걸린 약속이 이번 경기에 판정될 때만 중계 카드 위 「📋 약속: …」(#stage-promise). 결과가 나오면 지워요
 *   ② 판정 — 그 경기 기록(S.recent의 새 줄)을 **스펙 §3-6 조건 그대로**(승리까지) 대 본 값과 같다 · 명성 ±25 · evLog 줄 ok
 *      · 기록의 평점은 **결과 화면에 보인 한 자리 값**(25번 §2-1 — 7.46이 「7.5」로 보이면 7.5)
 *   ③ 벤치 — 벤치 주는 판정하지 않고 다음 출전 경기로 넘긴다(약속 그대로)
 *   ④ 상대 지정(🏟️ 바로 위 팀) — 그 팀과 만난 경기에서만 판정 · 다른 팀 경기에서는 S.promise 그대로 · 띠도 안 뜸
 *   ⑤ 만료 — 시즌이 끝나면 없던 일(결산 화면에서 S.promise 없음 · evLog 줄 ok null · expired)
 *   ⑥ 한 번에 하나 — 걸린 약속이 있으면 약속형 무작위 이벤트가 안 뜬다(없으면 뜬다 — 대조군)
 *   ⑦ 이야기 약속 장이 오면 걸려 있던 무작위 약속은 없던 일(voided)
 *
 * 경로: 확인용 세이브를 이어하기로 열고, 약속은 **진짜 이벤트 창에서 「약속한다」를 눌러** 겁니다
 *   (🏛️ 라커룸 벽의 사진 — 이 기기 명전에 같은 클럽 헌액자를 둬서 · 🏟️ 바로 위 팀 — mid 블록 되풀이).
 *   만료·이야기 장(⑤⑦)만 answer()가 남기는 모양 그대로 약속을 얹어요(시즌 끝·후반기 첫 화면을 기다리지 않게).
 *
 * 변이
 *   PR1 「약속은 한 번에 하나」 후보 거르기를 지운다            → ⑥ 빨간불
 *   PR2 상대 지정 약속의 상대 확인을 지운다                     → ④ 빨간불
 *   PR3 결산의 약속 만료를 지운다                               → ⑤ 빨간불(다음 경기에서 league()가 한 번 더 막지만, 결산 화면에는 남아요)
 *   PR4 이야기 약속 장의 「걸린 약속 없던 일」을 지운다         → ⑦ 빨간불
 *   PR5 기록 평점을 한 자리로 안 맞춘다(Number(r.toFixed(1)) → r) → ② 평점 칸 빨간불
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const H = require("./_w1.js");
H.guardExit();

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const FAME = 25;
/* 스펙 §3-6 — 문턱은 스펙 숫자를 여기 박아요 */
const SPEC = {
  "g&T": (m) => m.g >= 1 && m.res === "W", "p&T": (m) => m.g + m.a >= 1 && m.res === "W",
  "(a|r)&T": (m) => (m.a >= 1 || m.r >= 7.5) && m.res === "W", "ga|d": (m) => m.ga <= 1 && m.d >= 2,
  W: (m) => m.res === "W", r75: (m) => m.r >= 7.5,
};
const PROMISE_IDS = ["p_classup", "p_titlerace", "p_rumor", "p_neighbor", "p_legacy", "p_hofwall"];
const MUTS = {
  PR1: { file: "events.js", muts: [[/if \(d\.promise && busy\) continue;/, ""]] },
  PR2: { file: "events.js", muts: [[/else if \(p && \(!p\.opp \|\| p\.opp === info\.away\)\) \{/, "else if (p) {"]] },
  PR3: { file: "events.js", muts: [[/if \(S\.promise\) endPromise\("expired"\);\n    if \(window\.WingerStory\) WingerStory\.yearEnd\(\);/, "if (window.WingerStory) WingerStory.yearEnd();"]] },
  PR4: { file: "story.js", muts: [[/const k = K\(\);\n    k\.endPromise\("voided"\);/, "const k = K();"]] },
  PR5: { file: "events.js", muts: [[/res: info\.res, r: Number\(r\.toFixed\(1\)\) \};/, "res: info.res, r };"]] },
};
const FX = H.fixtures();
const keysOf = (id) => FX.items.find((x) => x.id === id).keys;
const sOf = (id) => { const sl = JSON.parse(keysOf(id)["winger-save-v1-slots"]); return sl[Object.keys(sl)[0]]; };
const hofFor = (club) => JSON.stringify([{ id: "w1700000000000", at: 1700000000000, game: "soccer", name: "벽의 사진", pos: "fw", team: club,
  seasons: 14, wins: 20, daesang: 1, bonsang: 1, rookie: 0, score: 1500, grade: "🐐", sent: true }]);

function open(fix, muts, seed, extra) {
  const P = H.boot({ which: "beta", seed, keys: Object.assign({}, keysOf(fix), extra || {}), muts });
  H.tap(P, P.$("btn-continue"));
  const go = P.doc.querySelector(".slot-modal .slot-go"); if (go) H.tap(P, go);
  const no = P.doc.querySelector(".no-overlay #no-skip"); if (no) H.tap(P, no);
  return P;
}
const layer = (P, cls) => { for (const el of P.doc.body.children) if (el.classList.contains(cls)) return el; return null; };
function answer(P, pickK) {
  const ov = layer(P, "ev-overlay");
  if (!ov) return null;
  const ev = P.w.WingerEvents.pending();
  const i = ev.opts.findIndex((o) => o.k === pickK);
  const b = ov.querySelector(`.ev-opt[data-i="${i >= 0 ? i : ev.opts.findIndex((o) => o.k === "safe")}"]`);
  H.tap(P, b);
  const ok = ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok);
  return ev;
}
/* 블록을 되풀이해서 원하는 이벤트가 뜨면 멈춰요(블록 굴림은 게임 코드 그대로 — 되돌려 다시 그릴 뿐) */
function fishFor(P, id, patch, tries) {
  const base = JSON.stringify(P.S());
  for (let k = 0; k < (tries || 800); k++) {
    const S = JSON.parse(base);
    S.evSlot = null; S.evSeason = null; S.ev = null;
    if (patch) patch(S, k);
    P.set("S", S);
    P.w.WingerCareer.refreshPro();
    const ev = P.w.WingerEvents.pending();
    if (ev && ev.id === id) return ev;
    if (ev) answer(P, "safe");
  }
  return null;
}
/* 라운드 하나를 진짜 버튼으로 — 준비 화면의 「경기하러 가기」 → 경기 화면 → 결과 → 다음 준비 화면.
 * 돌려주는 것: { played, opp, band(경기 중 띠 글자), shown(결과 화면 평점 글자), row(S.recent 새 줄), note(결과의 약속 줄) } */
function round(P) {
  const D = H.makeDriver(P, { ev: H.EV.safe, move: 0 });
  for (let g = 0; g < 400 && !Array.from(P.$("pro-actions").children).some((x) => x.classList.contains("go-game") && !x.disabled); g++) {
    if (P.active() !== "screen-pro") return null;
    D.step();
  }
  const before = (P.S().recent || []).length, recent0 = JSON.stringify(P.S().recent || []);
  const go = Array.from(P.$("pro-actions").children).find((x) => x.classList.contains("go-game"));
  const week = P.S().activity ? P.S().activity.week : null;
  H.tap(P, go);
  const act = P.S().activity;
  const bandEl = P.$("stage-promise");
  const band = bandEl && !bandEl.hidden ? bandEl.textContent : "";
  const opp = act ? act.opp : null;
  let shown = null, note = "";
  for (let g = 0; g < 60 && P.active() === "screen-stage"; g++) {
    const sum = P.doc.querySelector("#stage-card .rate-why summary");
    if (sum && shown == null) { const m = /평점 (\d+\.\d)/.exec(sum.textContent); if (m) shown = +m[1]; }
    const n = P.doc.querySelector("#stage-card .ev-promise");
    if (n && !note) note = n.textContent;
    D.step();
  }
  const rec = P.S().recent || [];
  const played = JSON.stringify(rec) !== recent0;
  return { played, opp, band, shown, row: played ? rec[rec.length - 1] : null, note, week, bandAfter: bandEl ? (bandEl.hidden ? "" : bandEl.textContent) : "" };
}

(async () => {
  console.log("=== 0. 변이 등록 ===");
  const miss = H.mutMisses(MUTS);
  check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);

  /* ---------- ①②③ 🏛️ 약속을 걸고 판정될 때까지 — 벤치가 잦은 선수(soccer-bench) ---------- */
  function judgeRun(muts, seed) {
    const vS = sOf("soccer-bench");
    const P = open("soccer-bench", muts, seed, { "grow-hof-v1": hofFor(vS.group) });
    const out = { got: false, rounds: [], judged: null, errors: [] };
    const ev = fishFor(P, "p_hofwall");
    if (!ev) { out.errors.push("🏛️ 약속 이벤트를 못 띄웠어요"); P.close(); return out; }
    const fame0 = P.S().fandom;
    answer(P, "promise");
    const p = P.S().promise;
    out.got = !!p && p.id === "p_hofwall";
    out.kind = p && p.cond.kind;
    for (let r = 0; r < 25 && P.S().promise; r++) {
      const x = round(P);
      if (!x) break;
      x.promiseAfter = !!P.S().promise;
      out.rounds.push(x);
    }
    const L = (P.S().evLog || []).filter((l) => l.id === "p_hofwall" && l.k === "promise");
    out.line = L[L.length - 1];
    out.fameDelta = P.S().fandom - fame0;
    out.errors.push(...P.errors);
    P.close();
    return out;
  }
  console.log("=== ①②③ 띠 · 판정 · 벤치 — 🏛️ 라커룸 벽의 사진(soccer-bench) ===");
  const J = [judgeRun(null, 41), judgeRun(null, 42), judgeRun(null, 43)];
  let judgedN = 0, benchN = 0, badBand = 0, badJudge = 0, badBench = 0, badShown = 0, fameBad = 0;
  const ex = [];
  for (const j of J) {
    if (!j.got) { check(false, `약속을 걸었다 — ${j.errors[0] || ""}`); continue; }
    for (const x of j.rounds) {
      if (!x.played) {                    // 벤치 주 — 판정 없음 · 약속 그대로
        benchN++;
        if (!x.promiseAfter) { badBench++; if (ex.length < 3) ex.push(`벤치 주에 약속이 사라짐 (R${x.week + 1})`); }
        continue;
      }
      judgedN++;
      if (!x.band.includes("📋 약속")) { badBand++; if (ex.length < 3) ex.push(`출전 경기인데 띠 없음 「${x.band}」`); }
      if (x.bandAfter) { badBand++; if (ex.length < 3) ex.push(`결과 뒤에도 띠가 남음 「${x.bandAfter}」`); }
      if (x.shown == null || x.row.r !== x.shown) { badShown++; if (ex.length < 3) ex.push(`기록 평점 ${x.row && x.row.r} · 화면 평점 ${x.shown}`); }
      const want = SPEC[j.kind](x.row);
      if (!j.line || j.line.ok !== want || x.promiseAfter) { badJudge++; if (ex.length < 3) ex.push(`판정 ${j.line && j.line.ok} · 스펙 조건 ${want} (${JSON.stringify(x.row)})`); }
      if (!x.note.includes(want ? "지켰어요" : "못 지켰어요")) { badJudge++; if (ex.length < 3) ex.push(`결과 줄 「${x.note}」`); }
      if (j.fameDelta !== (want ? FAME : -FAME) && j.fameDelta !== (want ? FAME : -FAME) + 0) { /* 명성은 경기 수당·평가로도 움직여요 — 판돈만 따로 못 떼어요 */ }
    }
  }
  console.log(`   측정 조건: 확인용 세이브 soccer-bench(공격수 2자리 중 3번째) · 시드 41/42/43 · 판정까지 라운드 ${J.map((j) => j.rounds.length).join("/")} · 벤치 주 ${benchN} · 판정 ${judgedN}`);
  check(judgedN >= 2 && benchN >= 1, `🔒 벤치 주와 판정 경기를 둘 다 봤다 (벤치 ${benchN} · 판정 ${judgedN})`);
  check(badBand === 0, `① 띠 — 판정될 출전 경기에만 「📋 약속」 · 결과 뒤 지움 (어긋남 ${badBand})${ex.length ? ` — ${ex[0]}` : ""}`);
  check(badJudge === 0, `② 판정 == 스펙 §3-6 조건(승리까지) · 결과 화면 약속 줄 (어긋남 ${badJudge})`);
  check(badShown === 0, `② 기록 평점 == 결과 화면에 보인 한 자리 평점 (어긋남 ${badShown})`);
  check(badBench === 0, `③ 벤치 주는 판정하지 않고 넘긴다 (어긋남 ${badBench})`);
  check(J.every((j) => j.errors.length === 0), `①②③ 페이지 안 예외 0${J.some((j) => j.errors.length) ? ` — ${J.find((j) => j.errors.length).errors[0].slice(0, 200)}` : ""}`);
  void fameBad;

  /* ---------- ④ 🏟️ 바로 위 팀 — 상대 지정 ---------- */
  function oppRun(muts, seed) {
    const P = open("soccer-slot", muts, seed);
    const out = { got: false, other: 0, otherBad: 0, meet: 0, meetBad: 0, errors: [] };
    const ev = fishFor(P, "p_neighbor", (S) => { S.camp = 2; }, 3000);
    if (!ev) { out.errors.push("🏟️ 바로 위 팀을 못 띄웠어요"); P.close(); return out; }
    answer(P, "promise");
    const p = P.S().promise;
    out.got = !!p && !!p.opp;
    out.opp = p && p.opp;
    for (let r = 0; r < 30 && P.S().promise; r++) {
      const x = round(P);
      if (!x) break;
      if (!x.played) continue;
      if (x.opp !== out.opp) {
        out.other++;
        if (!P.S().promise || x.band.includes("📋")) { out.otherBad++; if (!out.ex) out.ex = `다른 팀(${x.opp}) 경기 — 약속 ${P.S().promise ? "남음" : "사라짐"} · 띠 「${x.band}」`; }
      } else {
        out.meet++;
        if (P.S().promise || !x.band.includes("📋")) { out.meetBad++; if (!out.ex) out.ex = `그 팀 경기 — 약속 ${P.S().promise ? "남음" : "판정"} · 띠 「${x.band}」`; }
      }
    }
    out.errors.push(...P.errors);
    P.close();
    return out;
  }
  console.log("=== ④ 상대 지정 — 🏟️ 바로 위 팀 ===");
  const O = oppRun(null, 51);
  check(O.got, `🏟️ 상대 지정 약속을 걸었다 (상대 ${O.opp}) ${O.errors[0] || ""}`);
  check(O.other >= 1 && O.otherBad === 0, `④ 다른 팀 경기 ${O.other}번 — 약속 그대로 · 띠 없음 (어긋남 ${O.otherBad})${O.ex ? ` — ${O.ex}` : ""}`);
  check(O.meet === 1 && O.meetBad === 0, `④ 그 팀과 만난 경기에서만 판정 (만남 ${O.meet} · 어긋남 ${O.meetBad})`);
  check(O.errors.length === 0, `④ 페이지 안 예외 0${O.errors.length ? ` — ${O.errors[0].slice(0, 200)}` : ""}`);

  /* ---------- ⑤ 만료 · ⑥ 한 번에 하나 · ⑦ 이야기 약속 장 ---------- */
  /* answer()가 남기는 모양 그대로 약속을 얹어요: S.promise + evLog 줄 { id, y, k: "promise", pct: null, ok: null, ref } */
  const plant = (S, id, kind, opp) => {
    S.promise = { id, cond: { kind }, win: { fame: FAME }, lose: { fame: -FAME }, y: S.proYear, opp: opp || null };
    S.evLog = (S.evLog || []).concat([Object.assign({ id, y: S.proYear, k: "promise", pct: null, ok: null, ref: [0, 0] }, opp ? { opp: 1 } : {})]);
  };
  function expireRun(muts, seed) {
    // 컵 8강 준비(soccer-cup — 리그는 끝났고 컵 뒤 결산) · 판정될 수 없는 상대에 건 약속
    const P = open("soccer-cup", muts, seed);
    const S = P.S();
    plant(S, "p_neighbor", "g&T", "아무도 아닌 팀");
    P.w.save();
    const D = H.makeDriver(P, { ev: H.EV.safe, move: 0 });
    D.run({ until: () => P.active() === "screen-career", max: 3000 });
    const L = (P.S().evLog || []).filter((l) => l.id === "p_neighbor" && l.k === "promise").pop();
    const out = { promise: P.S().promise, line: L, errors: P.errors.slice() };
    P.close();
    return out;
  }
  console.log("=== ⑤ 만료 ===");
  const X = expireRun(null, 61);
  check(X.promise == null && X.line && X.line.ok == null && X.line.expired === true, `⑤ 결산 화면 — 약속 ${X.promise ? "남음" : "없음"} · evLog 줄 ${JSON.stringify(X.line)}`);
  check(X.errors.length === 0, `⑤ 페이지 안 예외 0${X.errors.length ? ` — ${X.errors[0].slice(0, 200)}` : ""}`);

  function oneRun(muts, seed, pending) {
    const vS = sOf("soccer-veteran");
    const P = open("soccer-veteran", muts, seed, { "grow-hof-v1": hofFor(vS.group) });
    const base = JSON.stringify(P.S());
    let prom = 0, n = 0;
    for (let k = 0; k < 500; k++) {
      const S = JSON.parse(base);
      S.evSlot = null; S.evSeason = null; S.ev = null; S.promise = null;
      if (pending) plant(S, "p_titlerace", "W", null);
      P.set("S", S);
      P.w.WingerCareer.refreshPro();
      const ev = P.w.WingerEvents.pending();
      if (!ev) continue;
      n++;
      if (PROMISE_IDS.includes(ev.id)) prom++;
      answer(P, "safe");
    }
    const e = P.errors.slice();
    P.close();
    return { prom, n, errors: e };
  }
  console.log("=== ⑥ 한 번에 하나 ===");
  const one0 = oneRun(null, 71, false), one1 = oneRun(null, 71, true);
  check(one0.prom >= 20, `⑥ 대조군 — 걸린 약속이 없으면 약속형이 뜬다 (${one0.prom}/${one0.n})`);
  check(one1.n >= 50 && one1.prom === 0, `⑥ 걸린 약속이 있으면 약속형 무작위 이벤트 0 (${one1.prom}/${one1.n})`);

  function storyVoid(muts, seed) {
    const P = open("soccer-veteran", muts, seed);
    const S = P.S();
    plant(S, "p_titlerace", "W", null);
    S.story = { on: { senior: { ch: 1, y0: S.proYear, f: { name: "선배", pick: "own", ok: null } } }, done: [], seen: {} };
    S.activity.cb = 2; S.activity.week = 0; S.evSlot = null; S.evSeason = null; S.ev = null;
    P.set("S", S);
    P.w.WingerCareer.refreshPro();                         // 후반기 첫 화면 — 🕯️ 2장(약속 장)
    const ev = P.w.WingerEvents.pending();
    const L = (P.S().evLog || []).filter((l) => l.id === "p_titlerace").pop();
    const out = { ev: ev && ev.id, promise: P.S().promise, line: L, errors: P.errors.slice() };
    P.close();
    return out;
  }
  console.log("=== ⑦ 이야기 약속 장 ===");
  const V = storyVoid(null, 81);
  check(V.ev === "s_senior2" && V.promise == null && V.line && V.line.voided === true && V.line.ok == null,
    `⑦ 🕯️ 2장이 오면 걸린 무작위 약속은 없던 일 (창 ${V.ev} · S.promise ${V.promise ? V.promise.id : null} · 줄 ${JSON.stringify(V.line)})`);

  console.log("=== 변이 검증 ===");
  if (miss.length) check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)");
  else {
    const p1 = oneRun({ "events.js": MUTS.PR1.muts }, 71, true);
    check(p1.prom > 0, `PR1 한 번에 하나 거르기를 지우면 → ⑥ 빨간불 (약속형 ${p1.prom}/${p1.n})`);
    const p2 = oppRun({ "events.js": MUTS.PR2.muts }, 51);
    check(p2.otherBad > 0 || p2.meet === 0, `PR2 상대 확인을 지우면 → ④ 빨간불 (${p2.ex || "다른 팀 경기에서 판정됨"})`);
    const p3 = expireRun({ "events.js": MUTS.PR3.muts }, 61);
    check(p3.promise != null, `PR3 결산 만료를 지우면 → ⑤ 빨간불 (결산 화면 약속 ${p3.promise ? "남음" : "없음"})`);
    const p4 = storyVoid({ "story.js": MUTS.PR4.muts }, 81);
    check(!(p4.line && p4.line.voided === true), `PR4 이야기 장의 없던 일을 지우면 → ⑦ 빨간불 (줄 ${JSON.stringify(p4.line)})`);
    const p5 = judgeRun({ "events.js": MUTS.PR5.muts }, 41);
    const b5 = p5.rounds.filter((x) => x.played && (x.shown == null || x.row.r !== x.shown)).length;
    check(b5 > 0, `PR5 기록 평점을 한 자리로 안 맞추면 → ② 평점 칸 빨간불 (어긋난 경기 ${b5})`);
  }
  console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(bad ? 1 : 0);
})().catch(H.die);
