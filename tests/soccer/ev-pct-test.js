/* 🎯 보이는 % = 판정 % — 이벤트 창에 적힌 「성공 N%」가 그대로 판정인가 (스펙 §2-2 · §3-1 · §3-2 · §9-A 5 · 6)
 *
 * 스펙 §2-2: 정수 pct를 **한 번** 계산해 얼리고, 화면과 판정이 그 필드 하나를 읽는다. 판정 난수 u도 뜰 때 한 번 굴려 얼린다
 * (u × 100 < pct면 성공). 연속 실패 보호·행운 보정·"뜻밖의 반전" 같은 **숨은 손 0**.
 *
 * 지키는 것 — **화면에 그려진 글자**에서 읽어요(S.ev를 믿지 않아요)
 *   ① DOM의 「성공 N%」 == S.ev.opts[i].pct                    (화면이 다른 숫자를 적으면 빨간불)
 *   ② DOM의 조각 줄에 조각마다 「이름 ±v」가 있고, 조각 합 == pct (유스는 10~90에서 잘린 경우만 다르고, 그땐 「잘려」 문구)
 *   ③ 판정(결과 창의 ✅/❌ · evLog.ok) == (얼린 u × 100 < **화면의** N)      — 어긋남 0 (독립 재계산)
 *   ④ 대량 표본 이항 검정 — 구간별로 성공 횟수가 Σ(N/100) 안(|z| ≤ 3.5) · 전체도
 *   ⑤ 약속 칸에는 % 기호가 없다 · 「최근 N경기 중 k번」이 **스펙 §3-6 조건 그대로**(승리까지) S.recent를 센 값이다
 *      (기록이 없으면 「기록이 아직 없어요」 — 옛 세이브라 판마다 0~10경기를 스펙 모양으로 채워 두 갈래를 다 봐요)
 *   ⑥ 유스 네 칸도 ①②③(10~90에서 잘린 판까지 — 「잘려」 문구)
 *
 * 변이
 *   P1 판정에 +5(u×100 < pct + 5)            → ③④ 빨간불
 *   P2 u를 한쪽으로 기울이기(min(rng, rng))   → ③은 통과(화면·판정이 같은 u를 봐요) · **④만** 빨간불 — 이항 검정이 살아 있다는 증거
 *   P3 화면만 +1(「성공 N+1%」)                → ① 빨간불
 *   P4 실력 조각만 +1                         → ② 빨간불
 *   P5 약속 칸에 비율(%)을 적기                → ⑤ 빨간불
 *   P6 공격수 약속 조건에서 「그리고 승리」를 뺀다 → ⑤ 근거 숫자 빨간불(「최근 N경기 중 k번」이 판정과 다른 조건을 세요)
 *
 * 측정 조건: 프로 = 확인용 세이브 soccer-veteran(13시즌 · 명성 7,674 · 백두 시티)을 이어하기로 연 뒤,
 *   pre 블록을 되풀이해요 — 판마다 세이브를 되돌리고(같은 선수) 컨디션 20~100 · 평소 30~95 · 명성 800~9,000을 정책 난수로 흔들어
 *   조각이 ±10·±15 끝까지 닿게 해요. 이 기기 명전에 같은 클럽 헌액자를 하나 두어 🏛️ 약속형도 뜨게 해요.
 *   이벤트 난수 = WingerEvents._rng(시드 가름) · 블록 굴림은 게임 코드 그대로(renderPrep → block) · 누르는 건 진짜 버튼.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const H = require("./_w1.js");
H.guardExit();

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const Z_MAX = 3.5;          // 이항 검정 문턱 — 여섯 번(구간 다섯 + 전체) 봐도 우연 빨간불 ≈ 0.3%

const MUTS = {
  P1: { file: "events.js", muts: [[/ok = ev\.u \* 100 < o\.pct;/, "ok = ev.u * 100 < o.pct + 5;"]] },
  P2: { file: "events.js", muts: [[/u: rng\(\), title: def\.title,/, "u: Math.min(rng(), rng()), title: def.title,"]] },
  P3: { file: "scenes.js", muts: [[/성공 <b>\$\{o\.pct\}%<\/b>/, "성공 <b>${o.pct + 1}%</b>"]] },
  P4: { file: "events.js", muts: [[/\{ label: x\.label, v: skill \},/, "{ label: x.label, v: skill + 1 },"]] },
  P5: { file: "scenes.js", muts: [[/`최근 \$\{num\(r\.of\)\}경기 중 \$\{num\(r\.hit\)\}번`/, "`최근 ${num(r.of)}경기 중 ${num(r.hit)}번 (${Math.round(100 * r.hit / r.of)}%)`"]] },
  P6: { file: "events.js", muts: [[/test: \(m\) => m\.g >= 1 && m\.res === "W" \}/, 'test: (m) => m.g >= 1 }']] },
};

const FX = H.fixtures();
const vet = (() => { const it = FX.items.find((x) => x.id === "soccer-veteran"); return it.keys; })();
const vetS = (() => { const sl = JSON.parse(vet["winger-save-v1-slots"]); return sl[Object.keys(sl)[0]]; })();
const HOF = JSON.stringify([{ id: "w1700000000000", at: 1700000000000, game: "soccer", name: "라커룸의 사진", pos: "fw",
  team: vetS.group, seasons: 14, wins: 20, daesang: 1, bonsang: 1, rookie: 0, score: 1500, grade: "🐐", sent: true }]);

const sgn = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "±0");
/* 스펙 §3-6 약속 조건 — 문턱(골 1 · 평점 7.5 · 실점 1 · 수비 2)은 스펙 숫자를 여기 박아요 */
const SPEC_COND = {
  "g&T": (m) => m.g >= 1 && m.res === "W",
  "p&T": (m) => m.g + m.a >= 1 && m.res === "W",
  "(a|r)&T": (m) => (m.a >= 1 || m.r >= 7.5) && m.res === "W",
  "ga|d": (m) => m.ga <= 1 && m.d >= 2,
  W: (m) => m.res === "W",
  r75: (m) => m.r >= 7.5,
};
/* S.recent 한 줄 — 스펙 §6-1 모양 { g, a, d, ga, res, r }(r은 화면에 보이는 한 자리 평점) */
const recentRow = (rnd) => ({ g: Math.floor(rnd() * 3), a: Math.floor(rnd() * 3), d: Math.floor(rnd() * 5), ga: Math.floor(rnd() * 4),
  res: ["W", "D", "L"][Math.floor(rnd() * 3)], r: Math.round((5 + rnd() * 4.9) * 10) / 10 });
const numOf = (t) => { const m = /(-?\d+)/.exec(t || ""); return m ? +m[1] : NaN; };

/* 한 이벤트 창을 **화면에서** 읽어요 — 자리마다 어긋남을 세요 */
function readOverlay(P, stat, rnd) {
  const ov = P.doc.querySelector(".ev-overlay");
  const ev = P.w.WingerEvents.pending();
  if (!ov || !ev) return null;
  const opts = Array.from(ov.querySelectorAll(".ev-opt"));
  const tries = [];
  for (const b of opts) {
    const i = +b.dataset.i;
    const o = ev.opts[i];
    if (!o) { stat.shape++; continue; }
    if (o.k === "try") {
      const shown = numOf((b.querySelector(".ev-pct b") || {}).textContent);
      stat.shown++;
      if (shown !== o.pct) { stat.m1++; if (stat.ex1.length < 2) stat.ex1.push(`${ev.id} 화면 ${shown}% · 필드 ${o.pct}%`); }
      const pt = (b.querySelector(".ev-parts") || {}).textContent || "";
      const want = o.parts.map((p, j) => (j === 0 ? `${p.label} ${p.v}` : `${p.label} ${sgn(p.v)}`));
      if (!want.every((x) => pt.includes(x))) { stat.m2txt++; if (stat.ex2.length < 2) stat.ex2.push(`${ev.id} 「${pt}」에 ${want.join(" / ")}`); }
      const sum = o.parts.reduce((a, p) => a + p.v, 0);
      if (sum !== o.pct) {
        const cut = sum < 10 || sum > 90;
        if (!cut || o.pct !== Math.max(10, Math.min(90, sum)) || !/잘려/.test(pt)) { stat.m2++; if (stat.ex2.length < 3) stat.ex2.push(`${ev.id} 조각 합 ${sum} · pct ${o.pct}`); }
        else stat.cut++;
      }
      tries.push({ b, i, o, shown });
    } else if (o.k === "promise") {
      stat.prom++;
      const t = b.textContent;
      if (t.includes("%")) { stat.m5++; if (stat.ex5.length < 1) stat.ex5.push(t.slice(0, 120)); }
      /* 「최근 N경기 중 k번」 — **스펙 §3-6 표의 조건 그대로**(승리까지) 세어 본 값과 같아야 해요. 식을 여기 적은 건
       * 스펙 문장(문턱)이라서예요 — events.js의 COND를 읽어 오면 조건이 바뀌어도 따라가서 아무것도 안 잡혀요 */
      const m = /최근 (\d+)경기 중 (\d+)번/.exec(t);
      const rec = Array.isArray(P.S().recent) ? P.S().recent : [];
      if (!rec.length) { if (/기록이 아직 없어요/.test(t)) stat.refEmpty++; else stat.m5ref++; }
      else if (!m) stat.m5ref++;
      else {
        const want = rec.filter(SPEC_COND[o.cond.kind] || (() => false)).length;
        stat.refN++;
        if (+m[1] !== rec.length || +m[2] !== want) { stat.m5ref++; if (stat.ex5.length < 2) stat.ex5.push(`${o.cond.kind} 화면 ${m[1]}경기 중 ${m[2]}번 · 스펙 조건 ${rec.length}경기 중 ${want}번`); }
      }
    }
  }
  return { ov, ev, tries, pick: tries.length ? tries[Math.floor(rnd() * tries.length)] : null };
}
/* 도전을 누르고 결과 창을 읽어요 */
function pressTry(P, r, stat) {
  const u = r.ev.u;
  const before = (P.S().evLog || []).length;
  H.tap(P, r.pick.b);
  const v = r.ov.querySelector(".ev-verdict");
  const txt = v ? v.textContent : "";
  const okDom = /✅/.test(txt) ? true : /❌/.test(txt) ? false : null;
  const log = (P.S().evLog || [])[before];
  const want = u * 100 < r.pick.shown;
  stat.n++;
  if (okDom !== want || !log || log.ok !== want || log.pct !== r.pick.shown) {
    stat.m3++;
    if (stat.ex3.length < 2) stat.ex3.push(`${r.ev.id} u=${u.toFixed(4)} 화면 ${r.pick.shown}% → 결과 ${txt || "(없음)"} · evLog ${log ? log.ok : "-"}`);
  }
  stat.samples.push([r.pick.shown, okDom === true ? 1 : 0]);     // 화면의 %와 화면의 결과 — 이항 검정 재료
  const ok = r.ov.querySelector(".ev-ok");
  if (ok) H.tap(P, ok);
}
/* 이항 검정 — 구간별 z */
function binom(samples) {
  const bands = [[10, 35], [35, 45], [45, 55], [55, 65], [65, 91]];
  const z = (xs) => {
    const n = xs.length, obs = xs.reduce((a, [, k]) => a + k, 0), exp = xs.reduce((a, [p]) => a + p / 100, 0);
    const v = xs.reduce((a, [p]) => a + (p / 100) * (1 - p / 100), 0);
    return { n, obs, exp, z: v > 0 ? (obs - exp) / Math.sqrt(v) : 0 };
  };
  return { all: z(samples), bands: bands.map(([a, b]) => Object.assign({ a, b }, z(samples.filter(([p]) => p >= a && p < b)))) };
}
const blank = () => ({ n: 0, shown: 0, m1: 0, m2: 0, m2txt: 0, m3: 0, m5: 0, m5ref: 0, refN: 0, refEmpty: 0, prom: 0, cut: 0, shape: 0, samples: [], ex1: [], ex2: [], ex3: [], ex5: [], err: [] });

async function tick() { await new Promise((r) => setTimeout(r, 0)); }
/* 프로 — pre 블록 되풀이 */
async function pro(muts, iters, seed) {
  const stat = blank();
  const P = H.boot({ which: "beta", seed, keys: Object.assign({}, vet, { "grow-hof-v1": HOF }), muts });
  const rnd = H.mulberry32(H.split(seed, H.POL_SALT));
  H.tap(P, P.$("btn-continue"));
  const go = P.doc.querySelector(".slot-modal .slot-go");
  if (go) H.tap(P, go);
  const no = P.doc.querySelector(".no-overlay #no-skip");       // 번호 없는 옛 세이브 — 이 pre에서 한 번 물어요(§5-9)
  if (no) H.tap(P, no);
  if (P.active() !== "screen-pro") { stat.err.push(`준비 화면에 못 왔어요(${P.active()})`); P.close(); return stat; }
  const base = JSON.stringify(P.S());
  for (let k = 0; k < iters; k++) {
    const S = JSON.parse(base);
    S.condition = 20 + Math.floor(rnd() * 81);
    S.condUsual = 30 + rnd() * 65;
    S.fandom = 800 + Math.floor(rnd() * 8200);
    S.evSlot = null; S.evSeason = null; S.ev = null;
    /* 최근 경기 — 옛 세이브라 비어 있어요. 판마다 0~10경기를 스펙 모양으로 채워 「최근 N경기 중 k번」 두 갈래를 다 봐요 */
    S.recent = Array.from({ length: Math.floor(rnd() * 11) }, () => recentRow(rnd));
    P.set("S", S);
    P.w.WingerCareer.refreshPro();              // 준비 화면을 다시 그려요 → renderPrep → block(§3-3) → 창
    const r = readOverlay(P, stat, rnd);
    if (!r) continue;
    if (r.pick) pressTry(P, r, stat);
    else {                                      // 약속·확정만 있는 창 — 확정으로 닫아요
      const s = r.ov.querySelector('.ev-opt.k-safe');
      if (s) { H.tap(P, s); const ok = r.ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok); }
    }
    if (k % 200 === 0) await tick();
  }
  stat.err.push(...P.errors);
  P.close();
  return stat;
}
/* 유스 — 네 칸(🧑‍🏫·📱·🔥·📉). 확인용 유스 세이브에서 능력치·명성을 높여 10~90에서 잘리는 판까지 닿게 해요 */
async function youth(muts, iters, seed) {
  const stat = blank();
  const it = FX.items.find((x) => x.id === "soccer-judge");
  const sl = JSON.parse(it.keys["winger-save-v1-slots"]); const key = Object.keys(sl)[0];
  const P = H.boot({ which: "beta", seed, keys: it.keys, muts });
  const rnd = H.mulberry32(H.split(seed, H.POL_SALT));
  H.tap(P, P.$("btn-continue"));
  const go = P.doc.querySelector(".slot-modal .slot-go");
  if (go) H.tap(P, go);
  if (P.active() !== "screen-main") { stat.err.push(`유스 화면에 못 왔어요(${P.active()})`); P.close(); return stat; }
  const base = JSON.stringify(P.S());
  for (let k = 0; k < iters; k++) {
    const S = JSON.parse(base);
    S.month = 3; S.pendingStage = null;          // 평가전 달이 아닌 때 — 「출전!」이 훈련 버튼을 잠그지 않게
    const hi = rnd() < 0.5;                       // 반은 잘리는 쪽(종합·명성이 높은 선수)으로
    for (const d of Object.keys(S.stats)) S.stats[d] = hi ? 85 + Math.floor(rnd() * 15) : 25 + Math.floor(rnd() * 50);
    S.fandom = hi ? 400 + Math.floor(rnd() * 600) : Math.floor(rnd() * 200);
    S.condition = 40 + Math.floor(rnd() * 60);
    S.ev = null;
    P.set("S", S);
    P.w.renderMain();
    const btns = Array.from(P.$("action-list").children).filter((b) => b.dataset && b.dataset.key && !b.disabled && !b.classList.contains("awaken-act"));
    if (!btns.length) continue;
    H.tap(P, btns[Math.floor(rnd() * btns.length)]);
    const r = readOverlay(P, stat, rnd);
    if (!r) continue;
    if (r.pick) pressTry(P, r, stat);
    if (k % 100 === 0) await tick();
  }
  stat.err.push(...P.errors);
  P.close();
  return stat;
}

(async () => {
  console.log("=== 0. 변이 등록 ===");
  const miss = H.mutMisses(MUTS);
  check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);

  console.log("=== 프로 — pre 블록 되풀이 ===");
  const A = await pro(null, 3200, 90210);
  const bA = binom(A.samples);
  console.log(`   측정 조건: 되풀이 3,200번 · 도전 ${A.n}번 · 약속 칸 ${A.prom}개 · 시드 90210 · 창의 도전 칸을 정책 난수로 하나 골라 눌렀어요`);
  check(A.n >= 900, `🔒 도전을 충분히 눌렀다 (${A.n}번 — 적으면 아래는 잴 수 없었던 거예요)`);
  check(A.m1 === 0, `① 화면의 「성공 N%」 == S.ev pct (어긋남 ${A.m1}/${A.shown})${A.ex1.length ? ` — ${A.ex1[0]}` : ""}`);
  check(A.m2 === 0 && A.m2txt === 0, `② 조각 줄에 조각마다 「이름 ±v」 · 조각 합 == pct (어긋남 ${A.m2} · 글자 ${A.m2txt})${A.ex2.length ? ` — ${A.ex2[0]}` : ""}`);
  check(A.m3 === 0, `③ 판정 == (u × 100 < 화면의 N) — 결과 창 · evLog 둘 다 (어긋남 ${A.m3}/${A.n})${A.ex3.length ? ` — ${A.ex3[0]}` : ""}`);
  console.log(`   구간별: ${bA.bands.map((b) => `[${b.a},${b.b}) n=${b.n} 성공 ${b.obs}/기대 ${b.exp.toFixed(1)} z=${b.z.toFixed(2)}`).join(" · ")}`);
  const bandBad = bA.bands.filter((b) => b.n >= 50 && Math.abs(b.z) > Z_MAX);
  check(bandBad.length === 0 && Math.abs(bA.all.z) <= Z_MAX, `④ 이항 검정 — 구간마다 |z| ≤ ${Z_MAX} · 전체 z=${bA.all.z.toFixed(2)} (성공 ${bA.all.obs}/기대 ${bA.all.exp.toFixed(1)})`);
  check(bA.bands.filter((b) => b.n >= 50).length >= 4, `🔒 이항 검정 구간이 넓게 찼다 (n ≥ 50인 구간 ${bA.bands.filter((b) => b.n >= 50).length}/5)`);
  check(A.prom >= 30 && A.m5 === 0, `⑤ 약속 칸에 % 기호 없음 (약속 칸 ${A.prom}개 · % ${A.m5})`);
  check(A.refN >= 30 && A.refEmpty >= 3 && A.m5ref === 0,
    `⑤ 「최근 N경기 중 k번」 == 스펙 조건(승리까지)으로 센 값 · 기록 없으면 「기록이 아직 없어요」 (센 칸 ${A.refN} · 빈 기록 ${A.refEmpty} · 어긋남 ${A.m5ref})${A.ex5.length ? ` — ${A.ex5[0]}` : ""}`);
  check(A.err.length === 0, `페이지 안 예외 0${A.err.length ? ` — ${A.err.slice(0, 2).join(" | ").slice(0, 300)}` : ""}`);

  console.log("=== ⑥ 유스 네 칸 ===");
  const Y = await youth(null, 1500, 4711);
  console.log(`   측정 조건: 훈련 1,500번 · 도전 ${Y.n}번 · 10~90에서 잘린 판 ${Y.cut}번 · 시드 4711`);
  check(Y.n >= 60 && Y.cut >= 5, `🔒 유스 도전과 잘린 판을 충분히 봤다 (도전 ${Y.n} · 잘림 ${Y.cut})`);
  check(Y.m1 === 0 && Y.m2 === 0 && Y.m2txt === 0 && Y.m3 === 0,
    `유스 ①②③ — 화면 % · 조각(잘리면 「잘려」 문구) · 판정 (어긋남 ${Y.m1}/${Y.m2}/${Y.m2txt}/${Y.m3})${Y.ex2.concat(Y.ex3).length ? ` — ${Y.ex2.concat(Y.ex3)[0]}` : ""}`);
  check(Y.err.length === 0, `유스 — 페이지 안 예외 0${Y.err.length ? ` — ${Y.err[0].slice(0, 200)}` : ""}`);

  console.log("=== 변이 검증 ===");
  if (miss.length) check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)");
  else {
    const m1 = await pro({ "events.js": MUTS.P1.muts }, 500, 90210);
    check(m1.m3 > 0, `P1 판정에 +5 → ③ 빨간불 (어긋남 ${m1.m3}/${m1.n})`);
    const m2 = await pro({ "events.js": MUTS.P2.muts }, 1200, 90210);
    const b2 = binom(m2.samples);
    check(m2.m3 === 0 && Math.abs(b2.all.z) > Z_MAX, `P2 u를 기울이면 → ③은 초록(어긋남 ${m2.m3}) · ④만 빨간불 (z=${b2.all.z.toFixed(1)}, 성공 ${b2.all.obs}/기대 ${b2.all.exp.toFixed(1)})`);
    const m3 = await pro({ "scenes.js": MUTS.P3.muts }, 200, 90210);
    check(m3.m1 > 0, `P3 화면만 +1 → ① 빨간불 (어긋남 ${m3.m1}/${m3.shown})`);
    const m4 = await pro({ "events.js": MUTS.P4.muts }, 200, 90210);
    check(m4.m2 > 0, `P4 실력 조각만 +1 → ② 빨간불 (어긋남 ${m4.m2})`);
    const m5 = await pro({ "scenes.js": MUTS.P5.muts }, 400, 90210);
    check(m5.m5 > 0, `P5 약속 칸에 비율(%) → ⑤ 빨간불 (% 들어간 칸 ${m5.m5}/${m5.prom})`);
    const m6 = await pro({ "events.js": MUTS.P6.muts }, 600, 90210);
    check(m6.m5ref > 0, `P6 공격수 약속 조건에서 「그리고 승리」를 빼면 → ⑤ 근거 숫자 빨간불 (어긋남 ${m6.m5ref}/${m6.refN})`);
  }
  console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(bad ? 1 : 0);
})().catch(H.die);
