/* 📖 이야기 4편 — 결말표 · 여는 규칙 · 닫힘 · 🕯️ 선배 번호 (스펙 §4 · §9-A 13 · 25번 §2-1)
 *
 * A. 결말표 — 모든 (1장 선택 × 판정 × 2장 × 평점·집계) 조합을 **스펙 §4 표**(아래 SPEC_END — 표를 그대로 옮겼어요)와 대조해
 *    정확히 그 결말이 나오는가. 결말은 story.js yearEnd()가 정해요(결산의 훅 — 스펙 §6-8)
 *    🌍 선택 셋 × 판정 × 2장 × 평균 평점(없음 · 6.44 · 6.45 · 7.2) · 1장이 끝내 안 뜬 편은 흐지부지(방어)
 *    🕯️ 선택 둘 × 판정 × 2장 · 🔥 부문 셋 × 부문상 × 최종 순위 × 1위와 차이 · 📍 d = me − him (0~10 × 0~10)
 * B. 닫힘 100% — 은퇴(🎓 버튼)하면 열린 🌍·🕯️·📍은 흐지부지로 닫히고(도감 장부 end +1) 🔥은 결말 없이 사라진다
 *    (환생은 화면에서 닿는 버튼이 없어요 — 보고서 👁️. 운영판 정리는 save-share-test가 봐요)
 * C. 여는 규칙 — 블록을 붙잡고(renderPrep → block — 게임 코드 그대로) 조건을 바꿔 가며
 *    C1 🕯️ pre에서 같은 포지션 만 35세 동료가 있으면 연다 · 글에 「#N 이름 선배」(N = 이름에서 지은 번호)
 *    C2 확인 순서 — 🌍 1장이 차지한 pre에는 🕯️이 안 열린다
 *    C3 🔥 후반기 mid에서 week 10~17에만 연다(9·18에는 안 연다 — 루프 결정)
 *    C4 🔥 1위가 우리 팀 동료면 안 연다
 *    C5 두 자리가 없으면(뜬 수 + 남은 장 + 2 > 5) 📍·🔥을 안 연다 · 있으면 연다
 *    C6 장 자리를 먼저 잡는다 — 뜬 수 + 남은 장 ≥ 5면 무작위 이벤트 0(대조군: 하나 적으면 뜬다)
 *    C7 📍 ⓑ h2에서 선발 확률 < 50% · 실력 ±5 동료가 있으면 연다(선발 확률이 높으면 안 연다)
 *    C8 한 블록 한 장 — 같은 h2에 📍 ⓑ가 열리면 🕯️ 2장은 그 시즌 없다(스펙 §4-1 · §11 #27)
 *    C9 📍 ⓐ는 2장이 설 자리가 남을 때만(25번 §2-2 — week + 5 ≤ 18 → week ≤ 13) — 전반기 week 14 · 15 · 18 · 휴식기 1:19에서
 *       안 열고, 1:19에서 못 연 ⓐ는 h2에서 연다. week 13에 열면 2장이 **week 18 블록에 실제로** 뜬다(진짜 버튼으로 라운드를 치러요)
 * D. 🕯️ 선배 번호 — 같은 이름 = 같은 번호(1~99) · 결산의 「물려받기」는 내 번호와 다를 때만 · 누르면 S.no가 바뀌고 저장된다
 *
 * ⚠️ 결말 **분포**(결말마다 ≥ 3% · 한 결말 ≤ 60%)는 여기서 안 재요 — 정책 모델의 값이라(grow-test-writing 「모델로 잰 값은
 *    절대값을 계약으로 삼지 않기」) 20·24번 시뮬레이터가 12,000 커리어로 잰 것이 근거예요. 여기는 **규칙이 표와 같은가**만 봐요.
 *
 * 변이
 *   ST1 🌍 「부딪혀 본 첫해(tried)」 줄을 지운다 → A 빨간불(실패가 🐢 결말로 새요 — 스펙 §9-A 13이 적은 변이)
 *   ST2 🕯️ 「따라가지 못한 새벽(missed)」 줄을 지운다 → A 빨간불(실패가 🏠 결말로)
 *   ST3 📍 「둘이 선 자리」의 「둘 다 3번 이상」을 지운다 → A 빨간불
 *   ST4 🔥 여는 마지막 주 17 → 18                       → C3 빨간불
 *   ST5 은퇴의 열린 이야기 닫기를 지운다                  → B 빨간불
 *   SN1 선배 번호 버튼의 「내 번호와 다를 때만」을 지운다   → D 빨간불
 *   ST6 📍 여는 조건을 옛 조건(`act.week < 19` — 반기에 라운드가 남기만 하면)으로 → C9 빨간불(week 14~18에서 열림)
 *   ST7 📍 여는 조건을 통째로 뺀다                          → C9 빨간불(휴식기 1:19에서 열림)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const H = require("./_w1.js");
H.guardExit();

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const ABROAD_LOW = 6.45;

/* 스펙 §4 결말표 — 위에서부터 첫 번째 줄. 문턱(6.45 · 3 · 2)은 스펙 숫자 */
const SPEC_END = {
  abroad: (f, avg) => (avg == null || avg < ABROAD_LOW ? "window" : f.pick === "learn" && f.ok === true ? "learned"
    : f.pick === "persuade" && f.ok === true ? "persuaded" : f.pick === "learn" || f.pick === "persuade" ? "tried" : "bloom"),
  senior: (f) => (f.p2 === true ? "lastpass" : f.pick === "follow" && f.ok === true ? "dawn" : f.pick === "follow" ? "missed" : "handshake"),
  race: (f, awards) => (awards.includes({ g: "골든부츠", a: "플레이메이커", d: "철벽상" }[f.key]) ? "crown" : f.finRank === 2 && f.finGap <= 2 ? "close2" : "far"),
  slot: (f) => { const d = f.me - f.him; return d >= 3 ? "won" : Math.abs(d) <= 2 && f.me >= 3 && f.him >= 3 ? "both" : "bench"; },
};
const MUTS = {
  ST1: { file: "story.js", muts: [[/\n\s*: f\.pick === "learn" \|\| f\.pick === "persuade" \? "tried"/, ""]] },
  ST2: { file: "story.js", muts: [[/\n\s*: f\.pick === "follow" \? "missed"/, ""]] },
  ST3: { file: "story.js", muts: [[/Math\.abs\(d\) <= 2 && s\.f\.me >= 3 && s\.f\.him >= 3 \? "both"/, 'Math.abs(d) <= 2 ? "both"']] },
  ST4: { file: "story.js", muts: [[/RACE_LAST_WEEK = 17;/, "RACE_LAST_WEEK = 18;"]] },
  ST5: { file: "career.js", muts: [[/  function enshrine\(\) \{\n    \/\/ 📖 열린 이야기는 흐지부지로 닫아요\(방어 — 🔥은 결말 없이 없어져요\)\n    if \(window\.WingerStory\) WingerStory\.closeAll\(\);/,
    "  function enshrine() {"]] },
  SN1: { file: "story.js", muts: [[/return d && d\.no !== S\.no \? \{/, "return d ? {"]] },
  /* 📍 여는 자리(25번 §2-2) — 옛 조건(그 반기에 라운드가 남기만 하면)으로 되돌리기 · 조건을 통째로 빼기 */
  ST6: { file: "story.js", muts: [[/act\.week \+ SLOT_CH2 <= \(CT\(\)\.WEEKS_PER_CB \|\| 19\) - 1/, "act.week < (CT().WEEKS_PER_CB || 19)"]] },
  ST7: { file: "story.js", muts: [[/act\.week \+ SLOT_CH2 <= \(CT\(\)\.WEEKS_PER_CB \|\| 19\) - 1/, "true"]] },
};
const FX = H.fixtures();
const keysOf = (id) => FX.items.find((x) => x.id === id).keys;
function open(fix, muts, seed, extra) {
  const P = H.boot({ which: "beta", seed, keys: Object.assign({}, keysOf(fix), extra || {}), muts });
  H.tap(P, P.$("btn-continue"));
  const go = P.doc.querySelector(".slot-modal .slot-go"); if (go) H.tap(P, go);
  const no = P.doc.querySelector(".no-overlay #no-skip"); if (no) H.tap(P, no);
  return P;
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

/* ---------- A. 결말표 ---------- */
function endTable(muts) {
  const P = open("soccer-veteran", muts, 5);
  const base = JSON.stringify(P.S());
  const St = P.w.WingerStory;
  const cases = [];
  for (const pick of ["learn", "persuade", "slow"]) for (const ok of pick === "slow" ? [null] : [true, false])
    for (const p2 of [true, false, undefined]) for (const avg of [null, 6.44, 6.45, 7.2]) cases.push({ sid: "abroad", f: { country: "it", pick, ok, p2 }, avg, ch: 2 });
  cases.push({ sid: "abroad", f: { country: "br" }, avg: 7.0, ch: 0, want: "fizzle" });          // 1장이 끝내 안 뜬 편(방어)
  for (const pick of ["follow", "own"]) for (const ok of pick === "own" ? [null] : [true, false])
    for (const p2 of [true, false, undefined]) cases.push({ sid: "senior", f: { name: "선배", pick, ok, p2 }, ch: 2 });
  for (const key of ["g", "a", "d"]) for (const aw of [true, false]) for (const finRank of [1, 2, 3]) for (const finGap of [0, 2, 3])
    cases.push({ sid: "race", f: { key, top: "왕관", club: "먼 클럽", gap0: 0.12, finRank, finGap }, aw, ch: 2 });
  for (let me = 0; me <= 10; me++) for (let him = 0; him <= 10; him++) cases.push({ sid: "slot", f: { rival: "경쟁자", me, him, rounds: 5, cb: 2, ch1Week: 3 }, ch: 1 });
  const bad0 = [];
  for (const c of cases) {
    const S = JSON.parse(base);
    S.story = { on: { [c.sid]: { ch: c.ch, y0: S.proYear, f: c.f } }, done: [], seen: {} };
    const aw = { g: "골든부츠", a: "플레이메이커", d: "철벽상" };
    S.career.years.push({ y: S.proYear, avg: c.avg === undefined ? 7.0 : c.avg, awards: c.sid === "race" && c.aw ? [aw[c.f.key]] : ["베스트11"] });
    S.activity = null;                                    // 결산 자리(슬롯 집계가 다음 라운드를 기다리지 않게)
    P.set("S", S);
    St.yearEnd();
    const got = (P.S().story.done.slice(-1)[0] || {}).end || null;
    const want = c.want || (c.sid === "abroad" ? SPEC_END.abroad(c.f, c.avg) : c.sid === "senior" ? SPEC_END.senior(c.f)
      : c.sid === "race" ? SPEC_END.race(c.f, P.S().career.years.slice(-1)[0].awards) : SPEC_END.slot(c.f));
    const left = Object.keys(P.S().story.on).length;
    if (got !== want || left !== 0) bad0.push(`${c.sid} ${JSON.stringify(c.f)}${c.avg !== undefined ? ` 평균 ${c.avg}` : ""} → ${got} (표: ${want})${left ? " · 안 닫힘" : ""}`);
  }
  const out = { n: cases.length, bad: bad0, err: P.errors.slice() };
  P.close();
  return out;
}

/* ---------- B. 은퇴 — 열린 이야기 닫기 ---------- */
async function retireClose(muts) {
  const P = open("soccer-final", muts, 6);
  const S = P.S();
  S.story = { on: {
    abroad: { ch: 1, y0: S.proYear, f: { country: "it", pick: "learn", ok: true } },
    senior: { ch: 1, y0: S.proYear, f: { name: "선배", pick: "own", ok: null } },
    slot: { ch: 1, y0: S.proYear, f: { rival: "경쟁자", me: 1, him: 1, rounds: 2, cb: 2, ch1Week: 5 } },
    race: { ch: 1, y0: S.proYear, openKey: `${S.proYear}:2:12`, f: { key: "g", top: "왕관", club: "먼 클럽", gap0: 0.12 } },
  }, done: [], seen: {} };
  P.w.save();
  const book0 = P.w.WingerBook.load();
  const ret = Array.from(P.doc.querySelectorAll("#career-actions .btn")).find((b) => /은퇴하기/.test(b.textContent));
  P.w.__confirmYes = true;
  if (ret) H.tap(P, ret);
  await tick(30);
  const book1 = P.w.WingerBook.load();
  const d = (k) => ((book1.end[k] || {}).n || 0) - ((book0.end[k] || {}).n || 0);
  const films = JSON.parse(P.w.localStorage.getItem("winger-save-v1-films") || "{}");
  const film = Object.values(films).pop();
  const out = { clicked: !!ret, fizzle: { abroad: d("abroad:fizzle"), senior: d("senior:fizzle"), slot: d("slot:fizzle") },
    race: Object.keys(book1.end).filter((k) => k.startsWith("race:")).map((k) => d(k)).reduce((a, b) => a + b, 0),
    filmEnds: film ? (film.ends || []).map((e) => `${e.sid}:${e.end}`).sort().join(",") : null, err: P.errors.slice() };
  P.close();
  return out;
}

/* ---------- C. 여는 규칙 — 블록을 붙잡고 ---------- */
function blockAt(P, base, patch) {
  const S = JSON.parse(base);
  S.evSlot = null; S.ev = null;
  if (!S.evSeason || S.evSeason.y !== S.proYear) S.evSeason = { y: S.proYear, n: 0, ids: [] };
  patch(S);
  P.set("S", S);
  P.w.WingerCareer.refreshPro();
  return P.w.WingerEvents.pending();
}
function opening(muts) {
  const out = { err: [] };
  const P = open("soccer-veteran", muts, 8);
  const base0 = P.S();
  const me = base0.pos;
  const mates = base0.squads[base0.group].filter((x) => !x.me && x.pos === me);
  const senior = mates[0];
  const base = JSON.stringify(base0);
  const St = P.w.WingerStory;
  // C1 🕯️ — 같은 포지션 만 35세 동료
  const ev1 = blockAt(P, base, (S) => { S.squads[S.group].find((x) => x.name === senior.name).age = 35; S.story = { on: {}, done: [], seen: {} }; });
  out.c1 = { id: ev1 && ev1.id, body: ev1 && ev1.body, no: St.seniorNo(senior.name), name: senior.name };
  const ev1b = blockAt(P, base, (S) => { S.squads[S.group].forEach((x) => { if (!x.me) x.age = Math.min(x.age, 33); }); S.story = { on: {}, done: [], seen: {} }; });
  out.c1none = ev1b ? ev1b.id : null;
  // C2 🌍 1장이 차지한 pre — 🕯️ 안 열림
  const ev2 = blockAt(P, base, (S) => {
    S.squads[S.group].find((x) => x.name === senior.name).age = 35;
    S.story = { on: { abroad: { ch: 0, y0: S.proYear, f: { country: "br" } } }, done: [], seen: { "abroad:br": 1 } };
  });
  out.c2 = { id: ev2 && ev2.id, seniorOpen: !!P.S().story.on.senior };
  // C3~C5 🔥 — 내 부문(공격수 골) 2위 · 1위와 격차 ~11%
  const raceState = (S, week, opts) => {
    const o = opts || {};
    S.story = { on: {}, done: [], seen: {} };
    S.activity.cb = 2; S.activity.week = week; S.camp = 2; S.activity.apps = week + 19;
    S.activity.goals = 17;
    const all = [];
    for (const [club, list] of Object.entries(S.squads)) for (const x of list) if (!x.me) { x.g = Math.min(x.g || 0, 10); x.apps = Math.max(x.apps || 0, 5); all.push([club, x]); }
    const top = all.find(([club, x]) => (o.mate ? club === S.group : club !== S.group) && x.pos === "fw");
    top[1].g = 19;                                         // (19 − 17) ÷ 19 = 10.5%
    if (o.n != null) S.evSeason = { y: S.proYear, n: o.n, ids: [] };
  };
  out.c3 = {};
  for (const w of [9, 10, 17, 18]) { const ev = blockAt(P, base, (S) => raceState(S, w)); out.c3[w] = ev ? ev.id : null; }
  out.c4 = (() => { const ev = blockAt(P, base, (S) => raceState(S, 12, { mate: true })); return ev ? ev.id : null; })();
  out.c5 = { n3: (() => { const ev = blockAt(P, base, (S) => raceState(S, 12, { n: 3 })); return ev ? ev.id : null; })(),
    n4: (() => { const ev = blockAt(P, base, (S) => raceState(S, 12, { n: 4 })); return ev ? ev.id : null; })() };
  // C6 장 자리 — 🌍이 열려 있고(남은 장 1) h2에서 무작위 이벤트가 뜨는지(뜬 수 3 → 뜸 · 4 → 0)
  const seat = (n) => {
    let rand = 0, tries = 0;
    for (let k = 0; k < 150; k++) {
      const ev = blockAt(P, base, (S) => {
        S.story = { on: { abroad: { ch: 1, y0: S.proYear, f: { country: "it", pick: "slow", ok: null } } }, done: [], seen: {} };
        S.activity.cb = 2; S.activity.week = 0; S.evSeason = { y: S.proYear, n, ids: [] };
      });
      tries++;
      if (ev && !ev.sid) rand++;
      if (ev) { const ov = P.doc.querySelector(".ev-overlay"); const s = ov && ov.querySelector(".ev-opt.k-safe"); if (s) H.tap(P, s); const ok = ov && ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok); }
    }
    return { rand, tries };
  };
  out.c6 = { n3: seat(3), n4: seat(4) };
  // C7 📍 ⓑ — h2 · 선발 확률 < 50% · 실력 ±5 같은 포지션 동료
  const slotState = (S, low) => {
    S.story = { on: {}, done: [], seen: {} };
    S.activity.cb = 2; S.activity.week = 0; S.condition = low ? 25 : 90;
    const ovr = P.get("overall()");
    const line = S.squads[S.group].filter((x) => !x.me && x.pos === S.pos);
    line.forEach((x, i) => { x.str = low ? ovr + 12 + i : ovr - 30 - i; x.age = 28; });
    if (low) line[line.length - 1].str = ovr + 3;
  };
  out.c7 = { low: (() => { const ev = blockAt(P, base, (S) => slotState(S, true)); return ev ? ev.id : null; })(),
    high: (() => { const ev = blockAt(P, base, (S) => slotState(S, false)); return ev ? ev.id : null; })() };
  // C8 한 블록 한 장 — 🕯️ 1장이 열린 채 같은 h2에 📍 ⓑ
  const ev8 = blockAt(P, base, (S) => {
    slotState(S, true);
    S.story.on.senior = { ch: 1, y0: S.proYear, f: { name: senior.name, pick: "own", ok: null } };
  });
  out.c8 = { id: ev8 && ev8.id, seniorCh: P.S().story.on.senior ? P.S().story.on.senior.ch : null };
  /* C9 📍 ⓐ — **2장이 설 자리가 남을 때만** 연다(25번 §2-2: week + 5 ≤ 반기 라운드 수 − 1 = 18 → week ≤ 13).
   *    찜한 자리를 같은 동료가 3라운드 연속 가져간 상태(evMem.slotBy n 3)로 전반기 mid 블록 week 13 · 14 · 15 · 18 ·
   *    휴식기 블록 {y}:1:19 · 그다음 후반기 첫 화면(h2)을 차례로 본다. 「안 열림」은 창 id가 아니라 **S.story.on.slot이 없는가**로 재요
   *    (그 블록에 무작위 이벤트가 뜰 수도 있어서요) */
  const slots0 = P.w.WingerSquad.slotsOf(base0.pos).map((x) => x.key);
  const aState = (S, cb, week) => {
    S.story = { on: {}, done: [], seen: {} };
    S.activity.cb = cb; S.activity.week = week; S.camp = 2;
    S.wantSlot = slots0[0];
    S.evMem = Object.assign({ last: "played", mom: false, classUp: false, awake: null, n: 20 }, S.evMem || {}, { slotBy: { name: senior.name, n: 3 } });
  };
  const opened = (cb, week) => { const ev = blockAt(P, base, (S) => aState(S, cb, week)); return { id: ev ? ev.id : null, on: !!P.S().story.on.slot }; };
  out.c9 = {};
  for (const w of [13, 14, 15, 18, 19]) out.c9[w] = opened(1, w);
  out.c9.h2 = opened(2, 0);                                  // 1:19에서 못 연 ⓐ는 후반기 첫 화면에서 다시 봐요(연속 수 그대로)
  out.c9.h13 = opened(2, 13);
  out.c9.h14 = opened(2, 14);
  out.err = P.errors.slice();
  P.close();
  return out;
}

/* C9-b week 13에 열면 2장이 **week 18 블록에 실제로** 뜬다 — 열린 뒤로는 진짜 버튼으로 14~19라운드를 치러요(집계가 돌아요) */
function slotCh2(muts) {
  const P = open("soccer-veteran", muts, 18);
  const S = P.S();
  const mate = S.squads[S.group].find((x) => !x.me && x.pos === S.pos);
  const slots = P.w.WingerSquad.slotsOf(S.pos).map((x) => x.key);
  S.story = { on: {}, done: [], seen: {} };
  S.activity.cb = 1; S.activity.week = 13; S.camp = 2; S.evSlot = null; S.ev = null;
  S.evSeason = { y: S.proYear, n: 0, ids: [] };
  S.wantSlot = slots[0];
  S.evMem = Object.assign({ last: "played", mom: false, classUp: false, awake: null, n: 20 }, S.evMem || {}, { slotBy: { name: mate.name, n: 3 } });
  P.set("S", S);
  P.w.WingerCareer.refreshPro();
  const first = P.w.WingerEvents.pending();
  const D = H.makeDriver(P, { ev: H.EV.safe, move: 0 });
  D.run({ until: (st) => !st.activity || st.activity.cb > 1 || st.activity.week >= 19, max: 6000 });
  const ch2 = D.evs.filter((e) => e.id === "s_slot2").map((e) => `${e.at.cb}:${e.at.wk}`);
  const done = ((P.S() || {}).story || { done: [] }).done.filter((d) => d.sid === "slot").map((d) => d.end);
  const out = { first: first && first.id, ch2, done, err: P.errors.slice() };
  P.close();
  return out;
}

/* ---------- D. 🕯️ 선배 번호 ---------- */
async function seniorNoCase(muts, mineSame) {
  const P = open("soccer-final", muts, 9);
  const St = P.w.WingerStory;
  const S = P.S();
  const name = "한결 선배님";
  const N = St.seniorNo(name);
  S.no = mineSame ? N : (N % 99) + 1;
  S.story = { on: {}, done: [{ sid: "senior", end: "handshake", y: S.proYear, name: "악수로 끝난 계절", no: N, mate: name }], seen: {} };
  P.w.save();
  P.w.WingerCareer.showActivity();                 // 결산 화면을 다시 그려요(이어하기와 같은 길)
  const btn = P.$("btn-senior-no");
  const out = { N, shown: !!btn, text: btn ? btn.textContent : "" };
  if (btn && !mineSame) {
    H.tap(P, btn);
    out.after = { no: P.S().no, disabled: btn.disabled, text: btn.textContent };
    const disk = JSON.parse(P.w.localStorage.getItem("winger-save-v1-slots"));
    out.disk = disk[Object.keys(disk)[0]].no;
    // 다시 열면(같은 결산) 버튼 없음
    const json = P.w.localStorage.getItem("winger-save-v1-slots");
    P.close();
    const Q = H.boot({ which: "beta", seed: 10, keys: Object.assign({}, keysOf("soccer-final"), { "winger-save-v1-slots": json }), muts });
    H.tap(Q, Q.$("btn-continue"));
    const go = Q.doc.querySelector(".slot-modal .slot-go"); if (go) H.tap(Q, go);
    out.reopen = !!Q.$("btn-senior-no");
    out.err = Q.errors.slice();
    Q.close();
    return out;
  }
  out.err = P.errors.slice();
  P.close();
  return out;
}

(async () => {
  console.log("=== 0. 변이 등록 ===");
  const miss = H.mutMisses(MUTS);
  check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);

  console.log("=== A. 결말표 — 모든 조합이 스펙 §4 표의 그 결말 ===");
  const A = endTable(null);
  check(A.n >= 200 && A.bad.length === 0, `조합 ${A.n}개 전부 표와 같은 결말 · 전부 닫힘 (어긋남 ${A.bad.length}${A.bad.length ? ` — ${A.bad[0]}` : ""})`);
  check(A.err.length === 0, `A 페이지 안 예외 0${A.err.length ? ` — ${A.err[0].slice(0, 200)}` : ""}`);

  console.log("=== B. 은퇴 — 열린 이야기 닫기 ===");
  const B = await retireClose(null);
  check(B.clicked && B.fizzle.abroad === 1 && B.fizzle.senior === 1 && B.fizzle.slot === 1, `🎓 은퇴하면 🌍·🕯️·📍 흐지부지로 닫힘 — 도감 장부 +1씩 (${JSON.stringify(B.fizzle)})`);
  check(B.race === 0 && B.filmEnds === "abroad:fizzle,senior:fizzle,slot:fizzle", `🔥은 결말 없이 사라짐(장부 +${B.race}) · 필름 이야기 장 「${B.filmEnds}」`);
  check(B.err.length === 0, `B 페이지 안 예외 0${B.err.length ? ` — ${B.err[0].slice(0, 200)}` : ""}`);

  console.log("=== C. 여는 규칙 ===");
  const C = opening(null);
  check(C.c1.id === "s_senior1" && C.c1.body.includes(`#${C.c1.no} ${C.c1.name} 선배`) && C.c1none !== "s_senior1",
    `C1 🕯️ 만 35세 같은 포지션 동료 → pre에 1장 · 글에 「#${C.c1.no} ${C.c1.name} 선배」 (없으면 ${C.c1none || "안 뜸"})`);
  check(C.c2.id === "s_abroad1" && !C.c2.seniorOpen, `C2 🌍 1장이 차지한 pre에는 🕯️이 안 열린다 (창 ${C.c2.id} · 🕯️ ${C.c2.seniorOpen ? "열림" : "안 열림"})`);
  check(C.c3[9] !== "s_race1" && C.c3[10] === "s_race1" && C.c3[17] === "s_race1" && C.c3[18] !== "s_race1",
    `C3 🔥 week 10~17에서만 (9: ${C.c3[9]} · 10: ${C.c3[10]} · 17: ${C.c3[17]} · 18: ${C.c3[18]})`);
  check(C.c4 !== "s_race1", `C4 🔥 1위가 우리 팀 동료면 안 연다 (${C.c4})`);
  check(C.c5.n3 === "s_race1" && C.c5.n4 !== "s_race1", `C5 두 자리 — 뜬 수 3이면 연다(${C.c5.n3}) · 4면 안 연다(${C.c5.n4})`);
  check(C.c6.n3.rand >= 20 && C.c6.n4.rand === 0, `C6 장 자리 먼저 — 뜬 수 3 + 남은 장 1 → 무작위 ${C.c6.n3.rand}/${C.c6.n3.tries} · 4 + 1 → 무작위 ${C.c6.n4.rand}/${C.c6.n4.tries}`);
  check(C.c7.low === "s_slot1" && C.c7.high !== "s_slot1", `C7 📍 ⓑ 선발 확률 < 50%면 h2에 1장(${C.c7.low}) · 높으면 안 연다(${C.c7.high})`);
  check(C.c8.id === "s_slot1" && C.c8.seniorCh === 1, `C8 같은 h2 — 📍 1장이 뜨고 🕯️은 1장에 머문다 (창 ${C.c8.id} · 🕯️ ${C.c8.seniorCh}장)`);
  const c9 = C.c9;
  const fmt9 = (k) => `${k}: ${c9[k].on ? "열림" : "안 열림"}`;
  check(c9[13].on && c9[13].id === "s_slot1", `C9 📍 ⓐ 전반기 week 13 — 연다(2장 자리 week 18이 남아요) (${fmt9(13)} · 창 ${c9[13].id})`);
  check(!c9[14].on && !c9[15].on && !c9[18].on, `C9 전반기 week 14 · 15 · 18 — 안 연다 (${[14, 15, 18].map(fmt9).join(" · ")})`);
  check(!c9[19].on, `C9 휴식기 블록 {y}:1:19 — 안 연다 (${fmt9(19)})`);
  check(c9.h2.on && c9.h2.id === "s_slot1", `C9 1:19에서 못 연 ⓐ는 후반기 첫 화면(h2)에서 연다 — 연속 수 그대로 (${fmt9("h2")})`);
  check(c9.h13.on && !c9.h14.on, `C9 후반기도 같은 규칙 — week 13 ${c9.h13.on ? "열림" : "안 열림"} · week 14 ${c9.h14.on ? "열림" : "안 열림"}`);
  const S2 = slotCh2(null);
  check(S2.first === "s_slot1" && S2.ch2.length === 1 && S2.ch2[0] === "1:18", `C9-b week 13에 열면 2장이 week 18 블록에 실제로 뜬다 — 진짜 버튼으로 14~19라운드 (1장 ${S2.first} · 2장 ${S2.ch2.join(",") || "안 뜸"} · 결말 ${S2.done.join(",") || "-"})`);
  check(S2.err.length === 0, `C9-b 페이지 안 예외 0${S2.err.length ? ` — ${S2.err[0].slice(0, 200)}` : ""}`);
  check(C.err.length === 0, `C 페이지 안 예외 0${C.err.length ? ` — ${C.err[0].slice(0, 200)}` : ""}`);

  console.log("=== D. 🕯️ 선배 번호 ===");
  {
    const P = H.boot({ which: "beta", seed: 1 });
    const St = P.w.WingerStory;
    const r = H.mulberry32(99);
    const syl = "가나다라마바사아자차카타파하김이박최정강조윤장임";
    let det = 0, range = 0; const seen = new Set();
    for (let i = 0; i < 2000; i++) {
      const nm = Array.from({ length: 2 + Math.floor(r() * 3) }, () => syl[Math.floor(r() * syl.length)]).join("");
      const a = St.seniorNo(nm), b = St.seniorNo(nm);
      if (a !== b) det++;
      if (!Number.isInteger(a) || a < 1 || a > 99) range++;
      seen.add(a);
    }
    check(det === 0 && range === 0 && seen.size >= 90, `같은 이름 = 같은 번호 · 1~99 정수 (어긋남 ${det} · 범위 밖 ${range} · 나온 번호 ${seen.size}가지)`);
    P.close();
  }
  const D1 = await seniorNoCase(null, false);
  check(D1.shown && D1.text.includes(`#${D1.N}`), `결산 — 내 번호와 다르면 「물려받기」 버튼 (${D1.text})`);
  check(!!D1.after && D1.after.no === D1.N && D1.disk === D1.N && D1.after.disabled, `누르면 S.no = ${D1.N} · 저장됨(${D1.disk}) · 버튼 잠김`);
  check(D1.reopen === false, `다시 열면(같은 결산) 버튼이 안 뜬다 (${D1.reopen})`);
  const D2 = await seniorNoCase(null, true);
  check(!D2.shown, `내 번호와 같으면 버튼을 안 내놓는다 (${D2.shown})`);
  check(D1.err.length === 0 && D2.err.length === 0, "D 페이지 안 예외 0");

  console.log("=== 변이 검증 ===");
  if (miss.length) check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)");
  else {
    for (const k of ["ST1", "ST2", "ST3"]) {
      const r = endTable({ [MUTS[k].file]: MUTS[k].muts });
      check(r.bad.length > 0, `${k} 결말 줄을 흐트리면 → A 빨간불 (어긋남 ${r.bad.length} — ${r.bad[0] || ""})`);
    }
    const c4 = opening({ "story.js": MUTS.ST4.muts });
    check(c4.c3[18] === "s_race1", `ST4 여는 마지막 주 17 → 18 → C3 빨간불 (week 18: ${c4.c3[18]})`);
    const c6 = opening({ "story.js": MUTS.ST6.muts });
    check(c6.c9[14].on || c6.c9[15].on || c6.c9[18].on, `ST6 옛 조건(반기에 라운드가 남기만 하면)으로 → C9 빨간불 (week 14 ${c6.c9[14].on ? "열림" : "안 열림"} · 18 ${c6.c9[18].on ? "열림" : "안 열림"})`);
    const c7 = opening({ "story.js": MUTS.ST7.muts });
    check(c7.c9[19].on, `ST7 조건을 통째로 빼면 → 휴식기 1:19에서 열려 C9 빨간불 (${c7.c9[19].on ? "열림" : "안 열림"})`);
    const b5 = await retireClose({ "career.js": MUTS.ST5.muts });
    check(b5.fizzle.abroad === 0, `ST5 은퇴의 이야기 닫기를 지우면 → B 빨간불 (흐지부지 ${JSON.stringify(b5.fizzle)})`);
    const d6 = await seniorNoCase({ "story.js": MUTS.SN1.muts }, true);
    check(d6.shown, `SN1 「내 번호와 다를 때만」을 지우면 → D 빨간불 (같은 번호인데 버튼 ${d6.shown})`);
  }
  console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(bad ? 1 : 0);
})().catch(H.die);
