/* 💾 베타와 운영판이 같은 세이브를 두 방향으로 주고받아도 안전한가 (스펙 §2-8 · §6-1 · §9-D)
 *
 * 로컬은 env.js가 베타를 `beta::`로 가르지만(25번 §2-1 정정), **승격 직후 옛 캐시 판과 새 판이 클라우드로 섞이는 경우**와
 * 격리가 실패하는 브라우저를 위해 스펙대로 둔 방어예요. 운영판 코드 = `soccer/`(이번 작업이 안 건드린 현행).
 *
 * ① 베타 → 운영판 — 베타가 **실제로 만든** 세이브를 운영판 코드로 열어 굴려요
 *   ①-a 유스 🔥 도전 성공 직후(S.buff = true · S.buffX = 2.0) → 운영판 첫 훈련 배수 1.5 ≤ 베타가 줬을 2.0
 *   ①-b 유스 🔥 도전 실패 직후(S.buff = false)             → 운영판 첫 훈련 배수 1.0 ≤ 베타가 줬을 1.0
 *   ①-c 시즌 중 진행 상태가 가득한 세이브(떠 있는 S.ev · 걸린 약속 · 최근 10경기 · 평소 컨디션 · 🤝 · 열린 이야기 넷)
 *       → 운영판으로 한 시즌 넘게: 예외 0 · 능력치·돈·명성·컨디션·약발에 NaN·음수·범위 밖 0 · 운영판 저장 뒤에도 베타 새 칸이 남는다(JSON 왕복)
 *   ①-d 약발 1 · 명성 0 · 돈 0으로 내려간 선수 → 운영판이 굴려도 약발 ≥ 1 · NaN 0
 *   ①-e 새 키(no·rep·achN·style·best·home)가 붙은 명전 항목 → 운영판 명전 목록·카드가 그린다(예외 0)
 * ② 운영판 → 베타
 *   ②-a 운영판이 세운 S.buff = true 위에 묵은 S.buffX 2.0 → 베타가 열면 **1.5**(묵은 2.0이 안 살아남음)
 *   ②-b ①-c를 운영판이 한 시즌 넘게 굴린 세이브를 베타가 다시 열면 §6-1 표대로 정리 —
 *       S.ev 없앰 · 약속 없던 일(evLog 줄 voided) · 최근 10경기 비움 · 평소 컨디션 없앰 · 이야기는 흐지부지(🔥은 결말 없이 없앰) ·
 *       쌓이는 기록(evLog·evSeen·ach·장부)은 그대로 · 그 뒤 한 시즌: 예외 0 · 약속이 두 번 판정되지 않음 · 업적이 두 번 안 들어감
 *   ②-c 베타끼리(운영판이 안 낀 세이브) — 떠 있는 S.ev를 다시 열어도 **같은 u**(「될 때까지 새로고침」 불가 — §3-1)
 *
 * 변이
 *   B1 베타가 S.buff를 숫자로 적기(S.buff = fx.buff)          → ①-b 빨간불(운영판이 1.0을 참으로 읽어 공짜 1.5)
 *   B2 onLoad의 S.betaAt 비교를 지우기(정리를 안 함)          → ②-a · ②-b 빨간불(묵은 buffX·약속·최근 10경기·S.ev가 살아남음)
 *   B3 save()의 `S.betaAt = S.savedAt`를 지우기               → ②-c 빨간불(베타끼리인데 운영판이 낀 것으로 읽어 떠 있는 이벤트를 치움)
 *
 * 훈련 배수는 운영판·베타 game.js의 buffMod 줄 뒤에 **관측 한 줄**(window.__buffMod)만 심어 읽어요 — 동작은 안 바꿔요.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const H = require("./_w1.js");
H.guardExit();

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const SLOTS = "winger-save-v1-slots";

/* 관측 줄 — 배수를 계산한 바로 뒤에 값만 남겨요 */
const PROBE = {
  live: [[/const buffMod = S\.buff \? 1\.5 : 1\.0;/, "$& window.__buffMod = buffMod;"]],
  beta: [[/const buffMod = S\.buff === true \? \(S\.buffX \|\| 1\.5\) : 1\.0;/, "$& window.__buffMod = buffMod;"]],
};
const MUTS = {
  B1: { file: "events.js", muts: [[/S\.buff = fx\.buff > 1;/, "S.buff = fx.buff;"]] },
  B2: { file: "events.js", muts: [[/if \(!st \|\| st\.betaAt === st\.savedAt\) return false;/, "if (!st || true) return false;"]] },
  B3: { file: "game.js", muts: [[/\n  S\.betaAt = S\.savedAt;/, "\n"]] },
};

const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));
function resume(P) {
  H.tap(P, P.$("btn-continue"));
  const go = P.doc.querySelector(".slot-modal .slot-go");
  if (go) H.tap(P, go);
  return P.active();
}
const slotJSON = (P) => P.w.localStorage.getItem(SLOTS);
const slotS = (json) => { const o = JSON.parse(json); return o[Object.keys(o)[0]]; };
const withProbe = (which, extra) => {
  const m = {};
  m["game.js"] = PROBE[which].concat(extra && extra["game.js"] ? extra["game.js"] : []);
  for (const [f, v] of Object.entries(extra || {})) if (f !== "game.js") m[f] = v;
  return m;
};
/* 범위 검사 — 운영판이 굴린 뒤 */
function ranges(S, P) {
  const out = [];
  const cap = (k) => P.get(`statCap("${k}")`);
  for (const [k, v] of Object.entries(S.stats || {})) if (!Number.isFinite(v) || v < 0 || v > cap(k) + 1e-9) out.push(`stats.${k}=${v}`);
  for (const k of ["money", "fandom"]) if (!Number.isFinite(S[k]) || S[k] < 0) out.push(`${k}=${S[k]}`);
  if (!Number.isFinite(S.condition) || S.condition < 0 || S.condition > 100) out.push(`condition=${S.condition}`);
  if (S.foot && (!Number.isInteger(S.foot.weak) || S.foot.weak < 1 || S.foot.weak > 10)) out.push(`foot.weak=${S.foot.weak}`);
  return out;
}

/* ---------- 유스 🔥 — 베타에서 **실제로** 도전을 눌러 성공/실패 직후 세이브를 만들어요 ----------
 * 새 선수로 들어가 훈련을 눌러요. 🔥 또래의 골 영상이 뜨면 u를 보고(뜰 때 얼린 값) 원하는 결과면 도전을 누르고,
 * 아니면 되돌려 다시 눌러요. 결과가 나온 뒤의 슬롯을 그대로 가져가요(answer가 저장까지 해요). */
function youthRival(want, betaMuts, seed) {
  const P = H.boot({ which: "beta", seed, muts: withProbe("beta", betaMuts) });
  const D = H.makeDriver(P, { pos: "fw", market: 0, name: "배수" });
  D.run({ until: () => P.active() === "screen-main", max: 50 });
  const base = JSON.stringify(P.S());
  for (let k = 0; k < 3000; k++) {
    const S = JSON.parse(base);
    S.month = 2; S.pendingStage = null; S.condition = 90; S.buff = false; S.ev = null;
    P.set("S", S);
    P.w.renderMain();
    const b = Array.from(P.$("action-list").children).find((x) => x.dataset && x.dataset.key === "shoot");
    H.tap(P, b);
    const ev = P.w.WingerEvents.pending();
    if (!ev || ev.id !== "y_rival") continue;
    const i = ev.opts.findIndex((o) => o.k === "try");
    const win = ev.u * 100 < ev.opts[i].pct;
    if (win !== want) continue;
    const ov = P.doc.querySelector(".ev-overlay");
    H.tap(P, ov.querySelector(`.ev-opt[data-i="${i}"]`));
    const ok = ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok);
    const out = { json: slotJSON(P), S: JSON.parse(JSON.stringify(P.S())), errors: P.errors.slice(), tries: k + 1 };
    P.close();
    return out;
  }
  P.close();
  return null;
}
/* 운영판에서 첫 **성공한** 훈련의 배수 — 실패 갈래(부상·헛손질)는 배수를 안 써요 */
function firstBuffMod(which, json, extra) {
  const P = H.boot({ which, seed: 7, keys: { [SLOTS]: json }, muts: withProbe(which, extra) });
  const at = resume(P);
  let mod;
  for (let k = 0; k < 40 && mod === undefined; k++) {
    if (P.active() !== "screen-main") break;
    const ov = P.doc.querySelector(".ev-overlay");
    if (ov) { const s = ov.querySelector(".ev-opt.k-safe"); if (s) H.tap(P, s); const ok = ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok); continue; }
    const b = Array.from(P.$("action-list").children).find((x) => x.dataset && x.dataset.key === "pass" && !x.disabled);
    if (!b) break;
    const before = P.w.__buffMod;
    H.tap(P, b);
    if (P.w.__buffMod !== before) mod = P.w.__buffMod;
  }
  const S = P.S();
  const out = { mod, at, buffX: S ? S.buffX : undefined, errors: P.errors.slice(), json: slotJSON(P) };
  P.close();
  return out;
}

(async () => {
  console.log("=== 0. 변이 · 관측 줄 등록 ===");
  const miss = H.mutMisses(Object.assign({}, MUTS, {
    probeLive: { which: "live", file: "game.js", muts: PROBE.live }, probeBeta: { file: "game.js", muts: PROBE.beta } }));
  check(miss.length === 0, `변이·관측 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);
  if (miss.length) { console.log("\n❌ 등록이 안 맞아 나머지를 못 돌려요"); process.exit(1); }

  console.log("=== ①-a · ①-b 유스 🔥 — 베타가 만든 세이브를 운영판이 연다 ===");
  const win = youthRival(true, null, 101);
  const lose = youthRival(false, null, 102);
  check(!!win && win.S.buff === true && win.S.buffX === 2, `베타 🔥 도전 성공 직후 — S.buff ${win && win.S.buff} · S.buffX ${win && win.S.buffX} (되풀이 ${win && win.tries}번)`);
  check(!!lose && lose.S.buff === false && lose.S.buffX == null, `베타 🔥 도전 실패 직후 — S.buff ${lose && lose.S.buff} · S.buffX ${lose && lose.S.buffX}`);
  const opWin = win && firstBuffMod("live", win.json);
  const opLose = lose && firstBuffMod("live", lose.json);
  check(!!opWin && opWin.mod === 1.5, `①-a 운영판 첫 훈련 배수 ${opWin && opWin.mod} ≤ 베타가 줬을 2.0 (운영판은 참/거짓만 읽어 1.5)`);
  check(!!opLose && opLose.mod === 1.0, `①-b 운영판 첫 훈련 배수 ${opLose && opLose.mod} ≤ 베타가 줬을 1.0`);
  check(!!opWin && !!opLose && opWin.errors.concat(opLose.errors, win.errors, lose.errors).length === 0, "①-a·b 페이지 안 예외 0");

  console.log("=== ②-a 운영판이 세운 🔥 위에 묵은 buffX — 베타가 열면 1.5 ===");
  /* 베타 성공(buffX 2.0) → 운영판이 훈련으로 🔥를 쓰고(buffX는 몰라서 남아요) → 운영판 자신의 🔥 이벤트로 S.buff = true를 다시 세울 때까지 굴려요 */
  async function staleBuffX(betaMuts) {
    const P = H.boot({ which: "live", seed: 303, keys: { [SLOTS]: win.json } });
    resume(P);
    let got = null;
    const base0 = P.S();
    for (let k = 0; k < 400 && !got; k++) {
      const S = P.S();
      if (P.active() !== "screen-main") break;
      if (S.buff === true && S.buffX === 2 && k > 0 && S.__used) { got = slotJSON(P); break; }
      if (S.pendingStage) { const g = Array.from(P.$("action-list").children).find((x) => x.classList.contains("go-game")); if (g) { H.tap(P, g); const D = H.makeDriver(P, {}); D.run({ until: () => P.active() === "screen-main", max: 400 }); continue; } }
      const b = Array.from(P.$("action-list").children).find((x) => x.dataset && x.dataset.key === (S.condition < 40 ? "__rest" : "dribble") && !x.disabled);
      if (!b) break;
      const hadBuff = S.buff;
      H.tap(P, b);
      const S2 = P.S();
      if (hadBuff === true && S2.buff === false) S2.__used = true;          // 운영판 훈련이 🔥를 썼어요(buffX는 그대로)
      else if (S2.__used && S2.buff === true) { delete S2.__used; P.w.save(); got = slotJSON(P); }
    }
    const errs = P.errors.slice();
    P.close();
    void base0;
    if (!got) return { none: true, errs };
    const S = slotS(got);
    const r = firstBuffMod("beta", got, betaMuts);
    return { opS: S, beta: r, errs };
  }
  const st = await staleBuffX(null);
  check(!st.none, "운영판이 🔥를 쓴 뒤 자기 🔥 이벤트로 S.buff = true를 다시 세운 세이브를 만들었다(묵은 buffX 2.0 위에)");
  if (!st.none) {
    check(st.opS.buff === true && st.opS.buffX === 2 && st.opS.betaAt !== st.opS.savedAt,
      `  그 세이브 — S.buff ${st.opS.buff} · 묵은 S.buffX ${st.opS.buffX} · betaAt≠savedAt ${st.opS.betaAt !== st.opS.savedAt}`);
    check(st.beta.buffX == null && st.beta.mod === 1.5, `②-a 베타가 열면 묵은 buffX가 지워지고 첫 훈련 배수 1.5 (buffX ${st.beta.buffX} · 배수 ${st.beta.mod})`);
    check(st.errs.concat(st.beta.errors).length === 0, "②-a 페이지 안 예외 0");
  }

  console.log("=== ①-c · ②-b 시즌 중 진행 상태가 가득한 세이브 — 베타 → 운영판(한 시즌 넘게) → 베타 ===");
  /* 베타로 확인용 세이브(1시즌 시즌 중)를 이어 **늘 도전**으로 굴리다가, 떠 있는 이벤트 · 걸린 약속 · 최근 3경기 이상이 한꺼번에 있을 때 멈춰요 */
  const FX = H.fixtures();
  const slotKeys = FX.items.find((x) => x.id === "soccer-slot").keys;
  function betaInProgress(muts) {
    const P = H.boot({ which: "beta", seed: 505, keys: slotKeys, muts });
    const D = H.makeDriver(P, { pos: "mf", ev: H.EV.bold, resume: true });
    /* 떠 있는 이벤트와 걸린 약속이 **같은 순간**에 있는 일은 드물어요 — 약속은 다음 출전 경기에서 곧바로 판정되거든요
     * (실측: 늘 도전으로 은퇴까지 굴려도 한 번도 안 겹쳤어요). 그래서 떠 있는 이벤트 · 최근 3경기 · 평소 컨디션이 있는 순간에 멈추고,
     * 약속이 없으면 **answer()가 남기는 모양 그대로** 하나 얹어요(S.promise + evLog 줄 — ev-promise-test의 plant와 같아요) */
    D.run({ until: (S) => S.phase === "soccer-pro" && S.ev && S.ev.at && S.ev.at.y != null && (S.recent || []).length >= 3 && S.condUsual != null, max: 20000 });
    const S = P.S();
    if (!S) throw new Error("베타 진행 중 세이브를 못 만들었어요 — 떠 있는 이벤트·최근 3경기·평소 컨디션이 한꺼번에 있는 순간에 못 닿았어요");
    if (!S.promise) {
      S.promise = { id: "p_neighbor", cond: { kind: "(a|r)&T" }, win: { fame: 25 }, lose: { fame: -25 }, y: S.proYear, opp: "먼 클럽" };
      S.evLog = (S.evLog || []).concat([{ id: "p_neighbor", y: S.proYear, k: "promise", pct: null, ok: null, ref: [1, 3], opp: 1 }]);
    }
    /* 열린 이야기 넷 — 자연히 넷이 동시에 열리진 않아요(동시 2편 상한). **정리 코드가 편마다 닫는지** 보려고
     * story.js가 여는 모양 그대로(openStory: { ch, y0, f } · 🔥은 openKey)를 얹어요. 동시 2편 상한은 여는 쪽 규칙이라 정리와 무관해요 */
    S.story = S.story || { on: {}, done: [], seen: {} };
    S.story.on = S.story.on || {};
    S.story.on.abroad = { ch: 1, y0: S.proYear, f: { country: "it", pick: "learn", ok: true } };
    S.story.on.senior = { ch: 1, y0: S.proYear, f: { name: "선배", pick: "own", ok: null } };
    S.story.on.slot = { ch: 1, y0: S.proYear, f: { rival: "경쟁자", me: 1, him: 2, rounds: 3, cb: S.activity.cb, ch1Week: S.activity.week } };
    S.story.on.race = { ch: 1, y0: S.proYear, openKey: `${S.proYear}:2:12`, f: { key: "g", top: "왕관", club: "먼 클럽", gap0: 0.12 } };
    S.trustEv = { y: S.proYear, v: 2 };
    P.w.save();
    const out = { json: slotJSON(P), S: JSON.parse(JSON.stringify(P.S())), errors: P.errors.slice(),
      book: JSON.parse(P.w.localStorage.getItem("winger-save-v1-book") || "{}") };
    P.close();
    return out;
  }
  const bIn = betaInProgress(null);
  const bS = bIn.S;
  check(!!(bS.ev && bS.promise && bS.recent.length >= 3 && bS.condUsual != null && bS.betaAt === bS.savedAt),
    `베타가 만든 진행 중 세이브 — S.ev ${bS.ev && bS.ev.id} · 약속 ${bS.promise && bS.promise.id}${bS.promise && bS.promise.opp ? `(상대 ${bS.promise.opp})` : ""} · 최근 ${bS.recent.length}경기 · 평소 컨디션 ${bS.condUsual != null}`);
  /* 운영판이 그 세이브로 **다음 시즌 결산**까지 굴려요 */
  const op = (() => {
    const P = H.boot({ which: "live", seed: 606, keys: Object.assign({}, slotKeys, { [SLOTS]: bIn.json }) });
    const D = H.makeDriver(P, { pos: "mf", resume: true, move: 0 });
    const y0 = bS.proYear;
    D.run({ until: (S) => S.proYear >= y0 + 1 && P.active() === "screen-career", max: 20000 });
    const S = P.S();
    const out = { json: slotJSON(P), S: JSON.parse(JSON.stringify(S)), errors: P.errors.slice(), bad: ranges(S, P) };
    P.close();
    return out;
  })();
  check(op.errors.length === 0, `①-c 운영판이 한 시즌 넘게 굴려도 예외 0${op.errors.length ? ` — ${op.errors[0].slice(0, 200)}` : ""}`);
  check(op.bad.length === 0, `①-c 능력치·돈·명성·컨디션·약발에 NaN·음수·범위 밖 0${op.bad.length ? ` — ${op.bad.join(" · ")}` : ""}`);
  const KEEP = ["evLog", "evSeen", "evSlot", "evSeason", "evMem", "story", "trustEv", "ev", "promise", "recent", "condUsual", "betaAt"];
  const lost = KEEP.filter((k) => bS[k] !== undefined && op.S[k] === undefined);
  check(lost.length === 0 && op.S.betaAt !== op.S.savedAt, `①-c 운영판 저장 뒤에도 베타 새 칸이 남는다(JSON 왕복)${lost.length ? ` — 사라진 칸: ${lost.join(",")}` : ""} · 운영판 저장은 betaAt을 안 고쳐요`);

  function betaReopen(json, muts) {
    const P = H.boot({ which: "beta", seed: 707, keys: Object.assign({}, slotKeys, { [SLOTS]: json }), muts });
    const D = H.makeDriver(P, { pos: "mf", ev: H.EV.bold, resume: true, move: 0 });
    // 여는 순간 — 이어하기 → 슬롯 카드까지만(정리는 resumeSlot에서 끝나요)
    H.tap(P, P.$("btn-continue"));
    const go = P.doc.querySelector(".slot-modal .slot-go");
    if (go) H.tap(P, go);
    const S0 = JSON.parse(JSON.stringify(P.S()));
    const disk0 = slotS(slotJSON(P));
    const book0 = JSON.parse(P.w.localStorage.getItem("winger-save-v1-book") || "{}");
    // 그 뒤 한 시즌 — 약속 판정·업적을 봐요
    const y0 = S0.proYear;
    D.run({ until: (S) => S.proYear >= y0 + 1 && P.active() === "screen-career", max: 20000 });
    const S1 = JSON.parse(JSON.stringify(P.S()));
    const book1 = JSON.parse(P.w.localStorage.getItem("winger-save-v1-book") || "{}");
    const out = { S0, disk0, S1, book0, book1, errors: P.errors.slice(), proLog: (P.S().proLog || []).slice() };
    P.close();
    return out;
  }
  const re = betaReopen(op.json, null);
  const s0 = re.S0;
  const pLine = (S) => (S.evLog || []).filter((l) => l.k === "promise" && l.id === bS.promise.id && l.y === bS.promise.y);
  check(s0.ev == null, `②-b 떠 있던 이벤트를 없앤다 (S.ev ${s0.ev ? s0.ev.id : null})`);
  check(s0.promise == null && pLine(s0).some((l) => l.voided === true && l.ok == null), `②-b 걸린 약속은 없던 일 — evLog 줄 voided (${JSON.stringify(pLine(s0).slice(-1))})`);
  check(Array.isArray(s0.recent) && s0.recent.length === 0, `②-b 「최근 10경기」를 비운다 (${(s0.recent || []).length}경기 남음)`);
  check(s0.condUsual === undefined && s0.buffX === undefined, `②-b 평소 컨디션 · buffX를 없앤다 (condUsual ${s0.condUsual} · buffX ${s0.buffX})`);
  const on0 = Object.keys((s0.story || {}).on || {});
  const fizz = ((s0.story || {}).done || []).filter((d) => d.end === "fizzle").map((d) => d.sid).sort().join(",");
  check(on0.length === 0 && fizz === "abroad,senior,slot" && !((s0.story || {}).done || []).some((d) => d.sid === "race"),
    `②-b 열린 이야기 — 🌍·🕯️·📍은 흐지부지, 🔥은 결말 없이 없앰 (남은 편 ${on0.join(",") || "없음"} · 흐지부지 ${fizz})`);
  check((s0.evLog || []).length === (bS.evLog || []).length && JSON.stringify(s0.evSeen || {}) === JSON.stringify(bS.evSeen || {}),
    `②-b 쌓이는 기록은 그대로 — evLog ${(bS.evLog || []).length} → ${(s0.evLog || []).length}줄 · evSeen 같음`);
  /* 업적 — 있던 것은 **한 칸도 안 바뀌어요.** 이 세이브는 옛 세이브(S.ach 없음)라, 정리 중 이야기를 닫을 때 부르는 판정(check("story"))이
   * 첫 판정이 돼 이미 만족한 것을 **조용히(late)** 채울 수 있어요(스펙 §5-2 조용한 소급) — 그건 더해지는 것이지 바뀌는 게 아니에요 */
  const achKept = Object.keys(bS.ach || {}).every((id) => s0.ach && JSON.stringify(s0.ach[id]) === JSON.stringify(bS.ach[id]));
  const achAdded = Object.keys(s0.ach || {}).filter((id) => !(bS.ach || {})[id]);
  check(achKept && achAdded.every((id) => bS.ach ? false : s0.ach[id].late === true),
    `②-b 업적 — 있던 ${Object.keys(bS.ach || {}).length}개 그대로 · 새로 채운 ${achAdded.length}개는 ${bS.ach ? "없어야 해요" : "옛 세이브의 조용한 소급(late)"}`);
  check(re.disk0.ev == null && re.disk0.betaAt === re.disk0.savedAt, "②-b 정리한 뒤 곧바로 저장한다(다시 열어도 같은 정리를 또 안 해요)");
  const judged = pLine(re.S1).filter((l) => l.ok != null).length;
  check(judged === 0, `②-b 없던 일이 된 그 약속이 그 뒤에 판정되지 않는다 (판정된 줄 ${judged})`);
  const achDup = Object.keys(re.book0.ach || {}).filter((id) => bS.ach && bS.ach[id] && ((re.book1.ach || {})[id] || {}).n !== ((re.book0.ach || {})[id] || {}).n);
  check(achDup.length === 0, `②-b 이미 딴 업적이 장부에 두 번 안 들어간다${achDup.length ? ` — ${achDup.join(",")}` : ""}`);
  check(re.errors.length === 0, `②-b 다시 연 뒤 한 시즌 예외 0${re.errors.length ? ` — ${re.errors[0].slice(0, 200)}` : ""}`);

  console.log("=== ①-d 약발 1 · 명성 0 · 돈 0 ===");
  {
    const S = JSON.parse(JSON.stringify(bS));
    S.foot = Object.assign({ main: "R" }, S.foot || {}, { weak: 1 });
    S.fandom = 0; S.money = 0;
    S.savedAt = S.betaAt = 1790000000000;
    const k = Object.keys(JSON.parse(bIn.json))[0];
    const P = H.boot({ which: "live", seed: 808, keys: Object.assign({}, slotKeys, { [SLOTS]: JSON.stringify({ [k]: S }) }) });
    const D = H.makeDriver(P, { pos: "mf", resume: true, move: 0 });
    D.run({ until: (s) => s.proYear >= S.proYear + 1 && P.active() === "screen-career", max: 20000 });
    const r = ranges(P.S(), P);
    check(r.length === 0 && P.S().foot.weak >= 1 && P.errors.length === 0, `①-d 운영판이 한 시즌 넘게 굴려도 약발 ${P.S().foot.weak} ≥ 1 · 범위 밖 0 · 예외 0${r.length ? ` — ${r.join(",")}` : ""}`);
    P.close();
  }

  console.log("=== ①-e 새 키가 붙은 명전 항목 — 운영판이 그린다 ===");
  {
    const e = { id: "w1790000000009", at: 1790000000009, game: "soccer", name: "새키", pos: "mf", team: "소백 그린", seasons: 15, wins: 40,
      daesang: 3, bonsang: 4, rookie: 1, goals: 90, assists: 150, defense: 60, apps: 500, score: 3900, grade: "🐐", sent: true, leagues: "🇰🇷 K1",
      no: 10, rep: "a200", achN: 21, style: "reader", best: { id: "p_weak", name: "🦶 반대발 주간", pct: 27, y: 6 }, home: { club: "소백 그린", seasons: 11 } };
    const P = H.boot({ which: "live", seed: 9, keys: { "grow-hof-v1": JSON.stringify([e]) } });
    H.tap(P, P.$("btn-hof"));
    let card = null;
    for (let k = 0; k < 100 && !card; k++) { await tick(20); card = P.doc.querySelector("#hof-list .hof-card"); }
    if (card) H.tap(P, card);
    const ov = P.doc.querySelector(".hof-overlay");
    check(!!card && !!ov && ov.textContent.includes("새키") && P.errors.length === 0, `①-e 운영판 명전 목록·카드가 새 키 있는 항목을 그린다(예외 ${P.errors.length})`);
    P.close();
  }

  console.log("=== ②-c 베타끼리 — 떠 있는 이벤트를 다시 열어도 같은 u ===");
  function reopenSame(muts) {
    const P = H.boot({ which: "beta", seed: 505, keys: slotKeys, muts });
    const D = H.makeDriver(P, { pos: "mf", ev: H.EV.safe, resume: true });
    D.run({ until: (S) => S.phase === "soccer-pro" && !!S.ev, max: 20000 });
    const ev = JSON.parse(JSON.stringify(P.S().ev));
    const json = slotJSON(P);
    P.close();
    const Q = H.boot({ which: "beta", seed: 1, keys: Object.assign({}, slotKeys, { [SLOTS]: json }), muts });
    resume(Q);
    const ev2 = Q.S() && Q.S().ev;
    const shown = !!Q.doc.querySelector(".ev-overlay");
    Q.close();
    return { ev, ev2, shown };
  }
  const same = reopenSame(null);
  check(!!same.ev2 && same.ev2.u === same.ev.u && same.ev2.id === same.ev.id && same.shown,
    `②-c 다시 열면 같은 이벤트 · 같은 u(${same.ev && same.ev.u.toFixed(4)}) · 창이 다시 뜬다`);

  console.log("=== 변이 검증 ===");
  {
    // B1 — 베타가 S.buff를 숫자로 적으면 ①-b에서 운영판이 1.0을 참으로 읽어 1.5를 줘요
    const lose1 = youthRival(false, { "events.js": MUTS.B1.muts }, 102);
    const op1 = lose1 && firstBuffMod("live", lose1.json);
    check(!!op1 && op1.mod > 1.0, `B1 S.buff 숫자로 → ①-b 빨간불 (베타 S.buff ${lose1 && lose1.S.buff} → 운영판 배수 ${op1 && op1.mod} > 1.0)`);
    // B2 — onLoad가 정리를 안 하면 묵은 buffX·약속·최근 10경기·S.ev가 살아남아요
    const st2 = await staleBuffX({ "events.js": MUTS.B2.muts });
    check(!st2.none && (st2.beta.mod === 2 || st2.beta.buffX === 2), `B2 비교 지움 → ②-a 빨간불 (묵은 buffX ${st2.beta && st2.beta.buffX} · 배수 ${st2.beta && st2.beta.mod})`);
    const re2 = betaReopen(op.json, { "events.js": MUTS.B2.muts });
    check(re2.S0.ev != null || (re2.S0.recent || []).length > 0 || re2.S0.promise != null,
      `B2 비교 지움 → ②-b 빨간불 (S.ev ${re2.S0.ev ? "남음" : "없음"} · 최근 ${(re2.S0.recent || []).length}경기 · 약속 ${re2.S0.promise ? "남음" : "없음"})`);
    // B3 — 베타가 도장을 안 찍으면 베타끼리도 운영판이 낀 것으로 읽어 떠 있는 이벤트를 치워요
    const b3 = reopenSame({ "game.js": MUTS.B3.muts });
    check(!b3.ev2, `B3 save()의 도장 지움 → ②-c 빨간불 (다시 연 S.ev ${b3.ev2 ? b3.ev2.id : "사라짐"})`);
  }

  console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(bad ? 1 : 0);
})().catch(H.die);
