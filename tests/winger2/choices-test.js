/* ⚽ 더 윙어 II 1막 v4 — 🃏 **이벤트 선택지 셋~넷** (47번 §1 · §2 카드 모양 · 45번 · 46번 §4 #2~#8 · J11~J13)
 *
 *   CH-1  카드 모양(47번 §2) — 진짜 1막 여러 판의 `choices`가 있는 카드 전부: `choices[i]` ↔ `opts[i]` 같은 자리 · 같은 `k` · `kind`
 *         (크게 big · 작게 small · 확정 sure · 이야기 talk) · 칸 3~4(둘은 「이야기 2장 약속 · 작게가 빠진」 경우만) · 「넘긴다」 0
 *   CH-2  작게의 %(#2) — 🎲 칸마다 `p` == clamp(50 + Σparts, 10, 90) · 작게 == min(90, 크게 + 5) · 작게 `parts`에 「작게 +5」 · 판정도 그 값(u × 100 < p)
 *   CH-3  판돈(#3) — 크게 ±1(능력치) · ±2(🤝) · 작게 ±0.5 · ±1 · 이기면 받는 만큼 지면 잃음(W = L) · 작게 판돈이 안 맞으면 작게 안 냄
 *   CH-4  확정 몫(#4) — 🌿 · 💬 몫은 🫀 +3 · 🤝 +1 · 약발 경험 +0.2 · 깃발 중 하나 · **능력치 0**(J13) · `lose` null ·
 *         잘리는 몫 0(🤝 6 · 컨디션 100 · 약발 2단계면 그 몫을 안 내놓고 `note`로 까닭) · 답하면 적힌 그대로 받음
 *   CH-5  이야기 결말(#5) — 작게를 고른 판의 이야기 기록 `r1` = "try"(작게 = 도전) · `r1k` = "small" · 가족 2장 문은 깃발 칸 하나
 *   CH-6  약속 작게(#6) — 이야기 2장 판돈 ⌊크게 ÷ 2⌋ · 0이면 작게 칸 없음 · 무작위 약속 작게 ±1
 *   CH-7  깃발(#7) — `S.evFlags` 같은 이름 한 번 · `act1.evFlags` 같음 · **점수 0**(깃발을 지워 다시 매겨도 평가서 같음) · 엔딩 줄 「그해, …」 · 필름 마지막 장 `year` 같은 글 · 깃발 0이면 둘 다 없음
 *   CH-8  옛 세이브의 두 칸 카드 — `choices` 없는 옛 카드(도전 · 넘긴다)는 그대로 답해짐 · 「넘긴다」 = 효과 0 · 진짜 화면이 옛 `opts` 두 칸을 그림
 *   CH-9  숫자 닻(#8) — 무작위 이벤트 판당 8.3~8.8장 · 🧮 최선 종류(46번 normRead) 크게 38 · 작게 31 · 확정 31%(늘 확정 판 · ±3.5 SE · 어느 하나 ≤ 60)
 *   + 변이: 작게 +5를 판정에서 뺌 · 작게 W ≠ L · 🤝 +1이 7로 · 작게를 확정으로 셈 · 판돈 0인데 작게 · 깃발이 점수에 닿음 · 옛 카드 넘긴다에 몫
 * 🔒 숫자는 47번 §1 · 46번 §2 · §4 — 박은 값
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 6분
 */
"use strict";
const { pageMutsOK, bootPage, wait } = require("./_load.js");
const { boot, runAct, lsDump } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const KIND = { try: "big", promise: "big", small: "small", promise_small: "small", cert: "sure", talk: "talk", flag: "sure" };
const CERT = { cond: 3, trust: 1, weak: 0.2 };
const MUT = {
  NO5: { "events.js": [[/ok = ev\.u \* 100 < o\.pct;/, 'ok = ev.u * 100 < (o.k === "small" ? o.pct - 5 : o.pct);']] },
  WL: { "events.js": [[/const lose = t\.stake === "trust" \? \{ trust: -sz \} : \{ stat: t\.stake, v: -sz \};/, 'const lose = t.stake === "trust" ? { trust: -sz * 2 } : { stat: t.stake, v: -sz * 2 };']] },
  TRUST7: { "events.js": [[/if \(\(Number\(S\.trust\) \|\| 0\) \+ T\.trust <= TUNE\.TRUST_CAP\) fx\.trust = T\.trust;/, "if (true) fx.trust = T.trust;"]] },
  SMALLSAFE: { "story.js": [[/st\.f\.r1 = o\.k === "try" \|\| o\.k === "small" \? "try" : "safe";/, 'st.f.r1 = o.k === "try" ? "try" : "safe";']] },
  PROM0: { "events.js": [[/if \(sz <= 0\) return null;/, "if (sz < 0) return null;"]] },
  FLAGSCORE: { "sheet.js": [[/const t10 = tenths\(\[body, care, record, stagePt, test\]\);/, "const t10 = tenths([body, care + ((S.evFlags || []).length ? 1 : 0), record, stagePt, test]);"]] },
  OLDSAFE: { "events.js": [[/line = "아무 일 없이 지나가요";/, 'line = "아무 일 없이 지나가요"; S.cond = Math.min(100, (Number(S.cond) || 0) + 3);']] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
/* 고르는 손 — 종류 하나를 먼저(없으면 다음) */
const pick = (order) => ({ card: (c) => {
  if (!c.opts || !c.opts.length) return 0;
  for (const k of order) { const i = c.opts.findIndex((x) => x.k === k); if (i >= 0) return i; }
  return 0;
} });
async function run(seed, order, muts, extra) {
  const env = boot(Object.assign({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], auto: true, realScene: false, muts, policy: pick(order) }, extra || {}));
  /* 🔍 답하는 순간의 얼린 u · 고른 칸(화면엔 u가 안 감 — 판정을 검산하려고 장치가 엿봄) */
  const ans = [];
  const EV = env.w.W2Events, raw = EV.answer;
  EV.answer = (S, i) => { const ev = S.ev; const o = ev && ev.opts[i]; if (o) ans.push({ id: ev.id, w: ev.w, u: ev.u, k: o.k, pct: o.pct }); return raw(S, i); };
  const r = await runAct(env);
  const out = { ans, S: r.S, done: r.done, cards: env.seen.card, film: env.seen.film[0] || null, w: env.w, keys: lsDump(env.w) };
  return out;
}
const close = (o) => o.w.close();
const fxOf = (list) => Object.fromEntries((list || []).map((x) => [x.stat ? "stat" : x.trust ? "trust" : x.cond ? "cond" : x.weak ? "weak" : "flag", x]));

function ch1to4(cards) {
  const bad = [], n = {};
  for (const c of cards.filter((x) => Array.isArray(x.choices))) {
    const C = c.choices, O = c.opts;
    n[C.length] = (n[C.length] || 0) + 1;
    if (C.length !== O.length) { bad.push(`${c.id}: choices ${C.length} ≠ opts ${O.length}`); continue; }
    if (O.some((o) => o.k === "safe")) bad.push(`${c.id}: 넘긴다 칸`);
    const two = C.length === 2 && O.some((o) => o.k === "promise") && !O.some((o) => o.k === "promise_small");
    if (!(C.length >= 3 && C.length <= 4) && !two) bad.push(`${c.id}: 칸 ${C.length}`);
    C.forEach((x, i) => {
      if (x.k !== O[i].k || x.kind !== KIND[x.k]) bad.push(`${c.id}#${i}: k ${x.k}/${O[i].k} kind ${x.kind}`);
      if (x.k === "try" || x.k === "small") {
        const sum = x.parts.reduce((a, p) => a + p.v, 0);
        if (x.p !== Math.min(90, Math.max(10, 50 + sum)) || x.p !== O[i].pct) bad.push(`${c.id}#${i}: p ${x.p} ≠ 50 + ${sum}`);
        const W = fxOf(x.win), L = fxOf(x.lose);
        const wv = W.stat ? W.stat.v : W.trust ? W.trust.v : null, lv = L.stat ? -L.stat.v : L.trust ? -L.trust.v : null;
        const want = x.k === "try" ? (W.trust ? 2 : 1) : (W.trust ? 1 : 0.5);
        if (wv !== want || lv !== want) bad.push(`${c.id}#${i} ${x.k}: 판돈 +${wv} / −${lv} ≠ ±${want}`);
      }
      if (x.k === "small") {
        const big = C.find((y) => y.k === "try");
        if (!big || x.p !== Math.min(90, big.p + 5) || !x.parts.some((p) => p.name === "작게" && p.v === 5)) bad.push(`${c.id}#${i}: 작게 ${x.p} ↔ 크게 ${big && big.p}`);
      }
      if (x.k === "cert" || x.k === "talk") {
        const F = fxOf(x.win);
        if (F.stat || x.lose !== null) bad.push(`${c.id}#${i}: 확정에 능력치 · 잃는 몫`);
        for (const [key, want] of Object.entries(CERT)) if (F[key] && F[key].v !== want) bad.push(`${c.id}#${i}: ${key} ${F[key].v} ≠ ${want}`);
        if (F.flag && F.flag.v !== 0) bad.push(`${c.id}#${i}: 깃발 값 ${F.flag.v}`);
      }
    });
  }
  return { bad, n };
}

(async () => {
  /* ── 진짜 판 여럿: 늘 크게 · 늘 작게 · 늘 확정 · 늘 이야기 ── */
  const R = [];
  for (const [seed, order] of [[901, ["try"]], [902, ["small", "promise_small", "try"]], [903, ["cert", "talk"]], [904, ["talk", "cert"]], [905, ["small", "promise_small", "cert"]], [906, ["promise", "cert"]]]) R.push(await run(seed, order));
  const all = R.flatMap((r) => r.cards);
  const c1 = ch1to4(all);
  check(c1.bad.length === 0 && Object.keys(c1.n).length > 0, `CH-1 · 2 · 3 · 4. 🃏 카드 ${Object.values(c1.n).reduce((a, b) => a + b, 0)}장(칸 수 ${JSON.stringify(c1.n)}) — choices ↔ opts 자리 · k · kind · 넘긴다 0 · 🎲 p = 50 + 조각 · 작게 = 크게 + 5 · 판돈 ±1 · ±2 / ±0.5 · ±1 · W = L · 확정 🫀 3 · 🤝 1 · 약발 0.2 · 깃발 0 · 능력치 0` + (c1.bad.length ? `\n     🔴 ${c1.bad.slice(0, 4).join(" · ")}` : ""));
  /* CH-2 판정 — 작게 판의 evLog: ok == (u × 100 < p) */
  const ch2 = (rs) => {
    const bad = []; let n = 0;
    for (const r of rs) for (const l of r.S.evLog || []) if (l.small && l.k === "try") {
      n += 1;
      const a = r.ans.find((x) => x.id === l.id && x.w === l.w && x.k === "small");
      if (!a || a.pct !== l.pct || l.ok !== (a.u * 100 < a.pct)) bad.push(`${l.id}@${l.w}`);
    }
    return { bad, n };
  };
  const k2 = ch2([R[1], R[4]]);
  check(k2.bad.length === 0 && k2.n > 0, `CH-2b. 🎲 작게 판정 — 작게를 고른 ${k2.n}번이 u × 100 < (보인 %)로 갈림`);
  /* CH-4 잘림 · CH-6 · CH-8 — 함수로(진짜 events.js) */
  const W = bootPage({ fastTimers: true });
  for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
  const EV = W.W2Events, K = EV.kit;
  const S0 = JSON.parse(R[2].keys["winger2-save-v2"]);
  const clip = (over, c) => K.sureOpt(Object.assign(JSON.parse(JSON.stringify(S0)), over), "cert", c);
  const cases = [
    [{ trust: 6 }, { label: "x", fx: "t" }, "trust"], [{ cond: 100 }, { label: "x", fx: "c" }, "cond"], [{ cond: 97 }, { label: "x", fx: "c" }, null],
    [{ weak: 2 }, { label: "x", fx: "wx" }, "weak"], [{ trust: 5 }, { label: "x", fx: "t" }, null],
  ];
  const b4 = [];
  for (const [over, c, cut] of cases) {
    const o = clip(over, c);
    if (cut && (o.fx[cut] || !o.note)) b4.push(`${JSON.stringify(over)}: 몫 ${JSON.stringify(o.fx)} · note ${o.note}`);
    if (!cut && (!Object.keys(o.fx).length || o.note)) b4.push(`${JSON.stringify(over)}: 안 잘려야 — ${JSON.stringify(o.fx)} · ${o.note}`);
  }
  check(b4.length === 0, `CH-4b. ✂️ 잘리는 몫 0 — 🤝 6 · 컨디션 100 · 약발 2단계면 몫을 안 내놓고 note로 · 🤝 5 · 컨디션 97은 그대로` + (b4.length ? `\n     🔴 ${b4.join(" · ")}` : ""));
  /* CH-6 약속 작게 */
  {
    const p2 = (big) => K.promSmall(S0, K.promOpt(S0, big), "작게 약속", true);
    const pr = K.promSmall(S0, K.promOpt(S0), "작게 약속", false);
    const ok6 = p2(2).win.trust === 1 && p2(3).win.trust === 1 && p2(1) === null && p2(0) === null && pr && pr.win.trust === 1 && pr.lose.trust === -1;
    check(ok6, `CH-6. 📋 약속 작게 — 이야기 2장 판돈 2 → ±1 · 1 · 0 → 작게 없음 · 무작위 약속 작게 ±1`);
  }
  /* CH-8 옛 두 칸 카드 */
  const oldCard = (Sx) => {
    const t = K.tryOpt(Sx, "a_rain", "도전", "shoot", 1, "shoot", 0, "평소");
    return { kind: "event", id: "a_rain", w: Sx.week, u: 0.5, sit: 0, title: "옛 카드", opts: [t, K.safeOpt("넘긴다")] };
  };
  const S8 = JSON.parse(JSON.stringify(S0));
  const before = JSON.stringify([S8.stats, S8.cond, S8.trust, S8.weakXp, S8.evFlags]);
  S8.ev = oldCard(S8);
  const res8 = EV.answer(S8, 1);
  const after = JSON.stringify([S8.stats, S8.cond, S8.trust, S8.weakXp, S8.evFlags]);
  check(!!res8 && before === after && S8.evLog[S8.evLog.length - 1].k === "safe", `CH-8. 🗃️ 옛 두 칸 카드(\`choices\` 없음) — 「넘긴다」 = 효과 0(능력치 · 컨디션 · 🤝 · 약발 · 깃발 그대로) · 기록 k "safe"`);
  {
    const p = W.W2Scenes.card(Object.assign({}, oldCard(S0)));
    await wait(5);
    const btns = W.document.querySelectorAll("#w2-layer button").length;
    const txt = W.document.getElementById("w2-layer").textContent;
    const b = [...W.document.querySelectorAll("#w2-layer button")].find((x) => /넘긴다/.test(x.textContent));
    if (b) b.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
    const got = await Promise.race([p, new Promise((r) => setTimeout(() => r("hang"), 500))]);
    check(/넘긴다/.test(txt) && /도전/.test(txt) && got === 1, `CH-8b. 🖼️ 진짜 \`scenes.js\`가 옛 두 칸 카드를 그림(버튼 ${btns}개 · 「넘긴다」 누름 → 인덱스 ${got})`);
  }
  W.close();
  /* CH-5 이야기 결말 — 작게를 고른 판: 🕯️ · 🏠 1장(s_senior1 · s_fam1)을 작게로 답했으면 결말 기록 r1 = "try" */
  const ch5 = (r) => {
    const SID = { s_senior1: "senior", s_fam1: null };
    const fam = r.w.W2Story.famSid(r.S);
    const smalls = (r.S.evLog || []).filter((l) => l.small && l.k === "try" && l.id in SID).map((l) => SID[l.id] || fam);
    const ds = r.S.story.done || [];
    const bad = smalls.filter((sid) => { const d = ds.find((x) => x.sid === sid); return !d || d.r1 !== "try"; });
    return { bad, n: smalls.length };
  };
  {
    const k5 = [R[1], R[4]].map(ch5);
    const fam2 = all.filter((c) => c.choices && c.opts.some((o) => o.k === "flag"));
    const famBad = fam2.filter((c) => c.opts.filter((o) => o.k === "flag").length !== 1).length;
    const nS = k5.reduce((a, x) => a + x.n, 0), bad = k5.flatMap((x) => x.bad);
    check(bad.length === 0 && nS > 0 && famBad === 0 && fam2.length > 0, `CH-5. 📖 이야기 결말 — 1장을 작게로 답한 ${nS}번의 결말 기록 r1 = "try"(작게 = 도전 · 결말이 새벽 / 못 따라감 쪽) · 가족 2장 ${fam2.length}장의 문 깃발 칸 하나` + (bad.length ? `\n     🔴 ${bad.join(" · ")}` : ""));
  }
  /* CH-7 깃발 */
  const ch7 = async (r) => {
    const S = r.S, bad = [];
    const fl = S.evFlags || [];
    if (new Set(fl).size !== fl.length) bad.push("같은 깃발 둘");
    if (!S.act1 || JSON.stringify(S.act1.evFlags) !== JSON.stringify(fl)) bad.push(`act1.evFlags ${S.act1 && JSON.stringify(S.act1.evFlags)}`);
    const Sx = JSON.parse(JSON.stringify(S)); Sx.evFlags = [];
    const a = r.w.W2Sheet.compute(S, true), b = r.w.W2Sheet.compute(Sx, true);
    if (JSON.stringify(a.cols.map((c) => c.v).concat(a.total)) !== JSON.stringify(b.cols.map((c) => c.v).concat(b.total))) bad.push("깃발이 점수에 닿음");
    const year = r.w.W2Events.flagYear(S);
    const last = r.film ? r.film.ch.find((c) => c.k === "last") : null;
    if ((last && last.year) !== (year || null)) bad.push(`필름 year ${last && last.year} ≠ ${year}`);
    const endHas = (S.ending.lines || []).some((l) => year && l === year);
    if (fl.length ? !(year && /^그해/.test(year) && endHas) : (year !== null || (S.ending.lines || []).some((l) => /^그해/.test(l)))) bad.push(`엔딩 줄 · 그해 ${year}`);
    return { bad, n: fl.length };
  };
  const f1 = await ch7(R[3]), f0 = await ch7(R[0]);
  check(f1.bad.length === 0 && f0.bad.length === 0 && f1.n > 0, `CH-7. 🔖 깃발 — 늘 💬 판 ${f1.n}개(같은 이름 한 번 · act1 같음 · 점수 0 · 엔딩 「그해, …」 = 필름 year) · 늘 크게 판 ${f0.n}개(그해 줄 없음 · year null)` + (f1.bad.concat(f0.bad).length ? `\n     🔴 ${f1.bad.concat(f0.bad).join(" · ")}` : ""));
  R.forEach(close);
  /* CH-9 숫자 닻 — 늘 확정 판 */
  const ch9 = async (N) => {
    const cls = { big: 0, small: 0, sure: 0 }, per = [];
    for (let i = 0; i < N; i++) {
      const r = await run(33001 + i * 11, ["flag", "cert", "talk"]);
      per.push(r.cards.filter((c) => c.kind === "event" && !c.sid).length);
      for (const c of r.cards.filter((c) => c.kind === "event" && c.choices)) {
        const big = c.choices.find((x) => x.k === "try"); if (!big) continue;
        const hasSmall = c.choices.some((x) => x.k === "small");
        cls[big.p >= 55 ? "big" : big.p >= 45 ? (hasSmall ? "small" : big.p >= 50 ? "big" : "sure") : "sure"] += 1;
      }
      close(r);
    }
    const tot = cls.big + cls.small + cls.sure;
    const m = per.reduce((a, b) => a + b, 0) / N, se = Math.sqrt(per.reduce((a, b) => a + (b - m) ** 2, 0) / (N - 1)) / Math.sqrt(N);
    return { m, se, sh: Object.fromEntries(Object.entries(cls).map(([k, v]) => [k, v / tot])), tot };
  };
  const a9 = await ch9(40);
  const SH = { big: 0.38, small: 0.31, sure: 0.31 };
  const shOk = Object.entries(SH).every(([k, want]) => Math.abs(a9.sh[k] - want) <= 3.5 * Math.sqrt(want * (1 - want) / a9.tot) && a9.sh[k] <= 0.6);
  check(a9.m >= 8.3 - 3.5 * a9.se && a9.m <= 8.8 + 3.5 * a9.se && shOk, `CH-9. ⚓ 늘 확정 40판 — 무작위 이벤트 판당 ${a9.m.toFixed(2)}±${(3.5 * a9.se).toFixed(2)}장(닻 8.3~8.8) · 🧮 최선 크게 ${(a9.sh.big * 100).toFixed(1)} · 작게 ${(a9.sh.small * 100).toFixed(1)} · 확정 ${(a9.sh.sure * 100).toFixed(1)}%(닻 38 · 31 · 31 · 🎲 카드 ${a9.tot}장)`);
  /* 🧪 변이 */
  if (fail === 0) {
    /* u가 [p − 5, p) 창에 드는 작게가 나올 때까지 판을 늘림(작게 하나에 5%꼴) */
    let x1 = { bad: [], n: 0 };
    for (let k = 0; k < 12 && !x1.bad.length; k++) { const m1 = await run(902 + k * 101, ["small", "promise_small", "try"], MUT.NO5); const y = ch2([m1]); close(m1); x1 = { bad: x1.bad.concat(y.bad), n: x1.n + y.n }; }
    check(x1.bad.length > 0, `변이-NO5(작게 +5를 판정에서 뺌 — 46번 §4 #2) → CH-2b가 빨간불 (${x1.bad.length}/${x1.n})`);
    const m2 = await run(901, ["try"], MUT.WL); const x2 = ch1to4(m2.cards); close(m2);
    check(x2.bad.length > 0, "변이-WL(작게 W ≠ L — #3) → CH-3이 빨간불");
    {
      const Wm = bootPage({ fastTimers: true, muts: MUT.TRUST7 });
      for (let i = 0; i < 400 && !Wm.document.querySelector("#w2-entry"); i++) await wait(5);
      const o = Wm.W2Events.kit.sureOpt(Object.assign(JSON.parse(JSON.stringify(S0)), { trust: 6 }), "cert", { label: "x", fx: "t" });
      Wm.close();
      check(!!o.fx.trust, "변이-TRUST7(🤝 6에서도 +1 — 7로 · #4) → CH-4b가 빨간불");
    }
    const m4 = await run(902, ["small", "promise_small", "try"], MUT.SMALLSAFE);
    const bad4 = ch5(m4).bad.length; close(m4);
    check(bad4 > 0, `변이-SMALLSAFE(작게를 확정으로 셈 — #5) → CH-5가 빨간불 (${bad4}장)`);
    {
      const Wm = bootPage({ fastTimers: true, muts: MUT.PROM0 });
      for (let i = 0; i < 400 && !Wm.document.querySelector("#w2-entry"); i++) await wait(5);
      const Km = Wm.W2Events.kit;
      const o = Km.promSmall(S0, Km.promOpt(S0, 1), "작게", true);
      Wm.close();
      check(o !== null, "변이-PROM0(판돈 0인데 작게를 냄 — #6) → CH-6이 빨간불");
    }
    const m6 = await run(904, ["talk", "cert"], MUT.FLAGSCORE); const x6 = await ch7(m6); close(m6);
    check(x6.bad.length > 0, `변이-FLAGSCORE(깃발이 점수에 닿음 — #7) → CH-7이 빨간불 (${x6.bad.join(" · ")})`);
    {
      const Wm = bootPage({ fastTimers: true, muts: MUT.OLDSAFE });
      for (let i = 0; i < 400 && !Wm.document.querySelector("#w2-entry"); i++) await wait(5);
      const Sx = JSON.parse(JSON.stringify(S0)); Sx.cond = 50;
      Sx.ev = oldCard(Sx);
      Wm.W2Events.answer(Sx, 1);
      Wm.close();
      check(Sx.cond !== 50, "변이-OLDSAFE(옛 카드 넘긴다에 몫) → CH-8이 빨간불");
    }
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
