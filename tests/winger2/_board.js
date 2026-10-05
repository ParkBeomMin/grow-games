/* ⚽ 더 윙어 II 1막 v2 — 🎮 **새 판 셋**(🥅 슈팅 · 🅰️ 컷백 · 🧱 막기) 검사 장치 · 절 묶음 (2026-10-05 · inspector)
 *
 * 정본: 38번 §2 계약 3′ · §5(칸 값) · §6 3′-a~f · 37번 §4(1~4 · 7 · 12) · 36번 §16-5 · 31번 v2-5(검사 창구 `W2Moment._t`)
 * 진짜 `beta/winger-moment.js`를 jsdom에 싣고(엔진 함께) **가상 시계**로 돌립니다 — `setTimeout` · `performance.now`를 검사가 쥠
 * (4초 · 5.2초 같은 제한을 실제로 기다리지 않고, 「몇 ms 뒤에 끝났나」를 그대로 잽니다).
 * 옛 판 검사 일곱(mirror · one-grid · ceil-perfect · tier-in · moment · minigame-tap · raf)이 이 파일의 절을 나눠 부릅니다.
 * 🔒 절마다 **기준선 초록 → 파일 안 변이 빨강**. 칸 값 · 시간은 38번 §5 · 37번 §2 숫자를 박은 값으로 씁니다.
 */
"use strict";
const { momentDom, pressDom, momentMutsOK } = require("./_load.js");

const HIT = 0.80, MISS = 0.44, FLAT = 0.5, PICK_MS = 4000, WIDE_MS = 5200, FAST_MS = 400;   // 🔒 38번 §5 · 36번 §7-1
const KINDS = ["goal", "assist", "defend"];
const close9 = (a, b) => Math.abs(a - b) < 1e-9;

/* 🧪 판 하나를 가상 시계 위에 엽니다 */
function boardEnv(muts) {
  const W = momentDom(muts || []);
  const q = []; let now = 1000, id = 0, randomCalls = 0;
  W.setTimeout = (fn, ms, ...a) => { const t = { id: ++id, at: now + (Number(ms) || 0), fn, a, ms: Number(ms) || 0 }; q.push(t); return t.id; };
  W.clearTimeout = (i) => { const k = q.findIndex((t) => t.id === i); if (k >= 0) q.splice(k, 1); };
  W.performance.now = () => now;
  W.requestAnimationFrame = (cb) => W.setTimeout(() => cb(now), 16);
  const rnd = W.Math.random;
  W.Math.random = () => { randomCalls += 1; return rnd(); };
  const advance = (ms) => {
    const end = now + ms;
    for (;;) {
      q.sort((x, y) => x.at - y.at || x.id - y.id);
      const t = q[0];
      if (!t || t.at > end) break;
      q.shift(); now = t.at; t.fn(...t.a);
    }
    now = end;
  };
  const host = W.document.getElementById("host");
  /* 판 열기 — ready(▶️)까지 눌러 판을 띄움. `o.ready === false`면 ▶️ 앞에서 멈춤 */
  function open(kind, o) {
    const opt = o || {};
    host.innerHTML = "";
    const judgeCalls = [];
    let res = null, resAt = null;
    const judge = opt.judge || ((s) => { judgeCalls.push(s); return s >= 0.6 ? "perfect" : s >= 0.4 ? "ok" : "miss"; });
    const t0 = now;
    W.W2Moment.play(opt.slot === null ? null : host, Object.assign({
      kind, sit: opt.sit || { weak: false, step: 0, foot: 1, cond: 1 },
      odds: opt.odds || ((s) => Math.round(100 * s)), judge, foot: "R", keeper: "태오",
      fast: !!opt.fast, still: !!opt.still, wide: !!opt.wide,
    }, opt.extra || {}), (j, d) => { res = { j, d }; resAt = now; });
    if (opt.ready !== false && opt.slot !== null) {
      const go = host.querySelector(".w2m-go");
      if (go) pressDom(W, go);
    }
    const openedAt = now;
    return {
      host, judgeCalls, t0, openedAt,
      cells: () => [...host.querySelectorAll(".w2m-cell")],
      pick(i, wait) { advance(wait == null ? 500 : wait); const c = host.querySelectorAll(".w2m-cell")[i]; if (c) pressDom(W, c); },
      finish(ms) { advance(ms == null ? 20000 : ms); return res; },
      get res() { return res; }, get resAt() { return resAt; },
    };
  }
  return { W, open, advance, get now() { return now; }, get randomCalls() { return randomCalls; } };
}

/* ══════════════════ 절 ══════════════════ */
const SECTIONS = {};

/* B-1 여섯 칸 평균(37번 §4 #1) — 판이 쓰는 칸 값 함수(`_t.values`)와 실제로 고른 칸의 `sBoard` */
SECTIONS["B-1"] = {
  title: "여섯 칸 평균 0.5 — 🥅 · 🅰️ 여섯 칸 0.5 · 🧱 정답 0.80 + 나머지 0.44 × 5",
  muts: { MISS45: [[/READ_MISS: 0\.44,/, "READ_MISS: 0.45,"]] },
  run(muts) {
    const E = boardEnv(muts);
    const V = E.W.W2Moment._t.values;
    const bad = [];
    for (const kind of KINDS) for (let t = 0; t < 6; t++) {
      const v = V(kind, t);
      const mean = v.reduce((a, b) => a + b, 0) / 6;
      if (!close9(mean, 0.5)) bad.push(`${kind}/${t}: 평균 ${mean}`);
      const want = kind === "defend" ? v.map((x, i) => (i === t ? HIT : MISS)) : v.map(() => FLAT);
      if (JSON.stringify(v) !== JSON.stringify(want)) bad.push(`${kind}/${t}: ${v.join(",")}`);
    }
    /* 실제 판 — 칸마다 눌러 `sBoard` == 표 */
    for (const kind of KINDS) for (let i = 0; i < 6; i++) {
      E.W.W2Moment._t.seed(100 + i);
      const b = E.open(kind);
      b.pick(i);
      const r = b.finish();
      const want = kind === "defend" ? (r && r.d.target === i ? HIT : MISS) : FLAT;
      if (!r || !close9(r.d.sBoard, want)) bad.push(`${kind} 칸 ${i}: sBoard ${r && r.d.sBoard} ≠ ${want}`);
    }
    return { ok: bad.length === 0, msg: `칸 값 표 3종 × 정답 6 · 실제 판 18번 — 평균 0.5 · 🧱 0.80 / 0.44`, bad };
  },
};

/* B-2 🥅 · 🅰️ 평평(37번 §4 #2 · 36번 §16-5) — 손 · 🤖 같은 `s` · 시간 제한 없음 · 🅰️ 고르기 전 수비 0 */
SECTIONS["B-2"] = {
  title: "🥅 · 🅰️ 평평 — 같은 상황이면 손 · 🤖의 `s` 비트 같음 · 시간 제한 없음 · 🅰️ 고르기 전 그림에 수비 0",
  muts: {
    ONE55: [[/\.map\(\(i\) => \(kind === "defend" \? \(i === target \? TUNE\.READ_HIT : TUNE\.READ_MISS\) : TUNE\.FLAT\)\);/,
      '.map((i) => (kind === "defend" ? (i === target ? TUNE.READ_HIT : TUNE.READ_MISS) : (i === 2 ? 0.55 : TUNE.FLAT)));']],
    CUT4S: [[/B\.limit = B\.kind === "defend" \?/, 'B.limit = B.kind !== "goal" ?'], [/if \(B\.kind === "defend"\) \{\n(\s+)\/\* ⏳/, 'if (B.kind !== "goal") {\n$1/* ⏳']],
  },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    const sit = { weak: true, step: 1, foot: 0.88, cond: 0.93 };
    for (const kind of ["goal", "assist"]) {
      const auto = (() => { const b = E.open(kind, { slot: null, sit }); return b.res; })();
      for (let i = 0; i < 6; i++) {
        const b = E.open(kind, { sit });
        b.pick(i);
        const r = b.finish();
        if (!r || r.d.s !== auto.d.s) bad.push(`${kind} 칸 ${i}: 손 s ${r && r.d.s} ≠ 🤖 ${auto.d.s}`);
      }
      const w = E.open(kind);
      w.finish(60000);
      if (w.res) bad.push(`${kind}: 60초 안 고르는데 판이 혼자 끝남(시간 제한)`);
    }
    {
      const b = E.open("assist");
      const def = b.host.querySelectorAll(".w2m-def, .w2m-opp, [class*='def'], .a-opp").length;
      if (def) bad.push(`🅰️ 고르기 전 그림에 수비 ${def}`);
    }
    return { ok: bad.length === 0, msg: "🥅 · 🅰️ 칸 여섯 × 상황(약발 1단계 · 🫀 0.93)에서 손 s == 🤖 s · 60초 기다려도 판이 안 끝남 · 🅰️ 수비 그림 0", bad };
  },
};

/* B-3 보임이 값을 안 바꿈(37번 §4 #3) — 🧱 정답 칸이면 `clear` · `dim` 같은 `sBoard` */
SECTIONS["B-3"] = {
  title: "보임이 값을 안 바꿈 — 🧱 정답 칸 `sBoard`가 `clear` · `dim`에서 같음 · 흐림은 반쯤",
  muts: { DIM70: [[/const sBoard = timeout \? 0 : B\.vals\[i\];/, 'const sBoard = timeout ? 0 : (B.seen === "dim" && i === B.target ? 0.70 : B.vals[i]);']] },
  run(muts) {
    const E = boardEnv(muts);
    const by = { clear: new Set(), dim: new Set() }, miss = { clear: new Set(), dim: new Set() };
    let dim = 0, n = 0;
    for (let seed = 1; seed <= 120; seed++) {
      E.W.W2Moment._t.seed(seed * 7919);
      const b = E.open("defend");
      const clue = b.host.querySelector(".w2m-clue").textContent;
      const tgt = ["첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째"].findIndex((w) => clue.indexOf(`${w} 길`) >= 0);
      const pickHit = seed % 2 === 0;
      b.pick(pickHit ? tgt : (tgt + 1) % 6);
      const r = b.finish();
      n += 1; if (r.d.seen === "dim") dim += 1;
      (pickHit ? by : miss)[r.d.seen].add(r.d.sBoard);
    }
    const bad = [];
    if ([...by.clear].join() !== String(HIT) || [...by.dim].join() !== String(HIT)) bad.push(`정답 칸 clear ${[...by.clear]} · dim ${[...by.dim]}`);
    if ([...miss.clear].join() !== String(MISS) || [...miss.dim].join() !== String(MISS)) bad.push(`다른 칸 clear ${[...miss.clear]} · dim ${[...miss.dim]}`);
    if (dim < n * 0.35 || dim > n * 0.65) bad.push(`흐림 ${dim}/${n}`);
    return { ok: bad.length === 0, msg: `🧱 판 ${n}번 — 정답 칸 0.80 · 다른 칸 0.44가 보임과 무관 · 흐림 ${dim}/${n}(≈ 반 · 38번 §5 50%)`, bad };
  },
};

/* B-4 거짓 0(37번 §4 #4) — 🧱 모든 결과에서 공의 길(`data-lane`) = 디딤발 길 = 단서 글 */
SECTIONS["B-4"] = {
  title: "거짓 0(🧱) — 맞힘 · 틀림 · 시간 초과 모든 결과에서 공의 길(`data-lane`) = 디딤발 길(`target`) = 단서 글",
  muts: { LIE: [[/d\.ball\.el\.dataset\.lane = String\(B\.target\);/, 'd.ball.el.dataset.lane = String(j === "miss" ? (B.target + 1) % 6 : B.target);']] },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    const ORD = ["첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째"];
    let n = 0;
    for (let seed = 1; seed <= 36; seed++) {
      E.W.W2Moment._t.seed(seed * 104729);
      const judge = (s) => ["perfect", "ok", "miss"][seed % 3];
      const b = E.open("defend", { judge });
      const clue = b.host.querySelector(".w2m-clue").textContent;
      const mode = seed % 3;
      if (mode < 2) b.pick(mode === 0 ? 0 : 5);          // 아무 칸 · 시간 초과(아래)
      let lane = null;
      for (let k = 0; k < 400 && !b.res; k++) {
        E.advance(25);
        const ball = b.host.querySelector(".w2m-ball[data-lane], [data-lane]");
        if (ball && lane == null) lane = Number(ball.dataset.lane);
      }
      const r = b.res;
      n += 1;
      if (!r) { bad.push(`#${seed} 판이 안 끝남`); continue; }
      if (lane !== r.d.target) bad.push(`#${seed} ${r.j}: 공의 길 ${lane} ≠ 디딤발 ${r.d.target}`);
      if (clue.indexOf(`${ORD[r.d.target]} 길`) < 0) bad.push(`#${seed}: 단서 「${clue}」 ≠ 길 ${r.d.target}`);
    }
    return { ok: bad.length === 0 && n === 36, msg: `🧱 판 ${n}번(완벽 · 괜찮음 · 놓침 × 고름 · 시간 초과) — 공의 길 = 디딤발 길 = 단서`, bad };
  },
};

/* B-5 굴림 한 번(37번 §4 #7 · 3′-c) — 판마다 `judge` 1번(시간 초과도) · cb의 판정 == judge가 낸 것 */
SECTIONS["B-5"] = {
  title: "굴림 한 번 — 판마다 `judge` 정확히 1번(고른 순간 · 시간 초과도 1번) · 판정은 드라이버가 낸 그대로",
  muts: { TWICE: [[/if \(first\) return first;\n/, ""], [/const j = B\.judge\(s\); {0,}(\/\/[^\n]*)?\n/, "const j0 = B.judge(s); const j = B.judge(s);\n"]] },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    let n = 0;
    for (const kind of KINDS) for (const mode of ["pick", "timeout"]) {
      if (mode === "timeout" && kind !== "defend") continue;
      for (let k = 0; k < 4; k++) {
        const calls = [];
        const out = ["perfect", "miss", "ok", "perfect"][k];
        const b = E.open(kind, { judge: (s) => { calls.push(s); return out; } });
        if (mode === "pick") b.pick(k);
        const r = b.finish();
        n += 1;
        if (calls.length !== 1 || !r || r.j !== out) bad.push(`${kind} ${mode} #${k}: judge ${calls.length}번 · 결과 ${r && r.j} ≠ ${out}`);
      }
    }
    const nullCalls = [];
    E.open("goal", { slot: null, judge: (s) => { nullCalls.push(s); return "ok"; } });
    if (nullCalls.length !== 1) bad.push(`slot null: judge ${nullCalls.length}번`);
    return { ok: bad.length === 0, msg: `판 ${n}번 + 머리 없는 길 1번 — judge 1번씩 · 판정 그대로`, bad };
  },
};

/* B-6 시간 · ⏩ · 움직임 줄이기(37번 §4 #12) */
SECTIONS["B-6"] = {
  title: "시간 · ⏩ · 움직임 줄이기 — 🧱 4초(♿ 5.2초) 뒤 `s` 0 · `cell` null · judge 1번 · 🥅 · 🅰️는 시간 초과 없음 · ⏩ 0.4초 · 글 정보 같음",
  muts: {
    GOAL4S: [[/B\.limit = B\.kind === "defend" \?/, "B.limit = true ?"], [/if \(B\.kind === "defend"\) \{\n(\s+)\/\* ⏳/, 'if (true) {\n$1/* ⏳']],
    FASTSKIP: [[/const res = el\("p", `w2m-res \$\{j === "perfect" \? "w2m-good" : j === "ok" \? "w2m-mid" : "w2m-bad"\}`, plan\.text\);/,
      'const res = el("p", `w2m-res ${j === "perfect" ? "w2m-good" : j === "ok" ? "w2m-mid" : "w2m-bad"}`, B.fast ? "" : plan.text);']],
  },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    for (const [wide, lim] of [[false, PICK_MS], [true, WIDE_MS]]) {
      const calls = [];
      const b = E.open("defend", { wide, judge: (s) => { calls.push(s); return "miss"; } });
      const before = b.finish(lim - 10);
      if (before) bad.push(`🧱 ${lim}ms 전에 끝남`);
      const r = b.finish(30000);
      if (!r || r.d.cell !== null || r.d.sBoard !== 0 || r.d.s !== 0 || calls.length !== 1 || r.d.ms !== lim) bad.push(`🧱 시간 초과(${lim}): ${JSON.stringify(r && r.d)} · judge ${calls.length}`);
    }
    for (const kind of ["goal", "assist"]) { const b = E.open(kind); if (b.finish(60000)) bad.push(`${kind}: 시간 초과로 끝남`); }
    const texts = {};
    for (const mode of ["norm", "fast", "still"]) {
      E.W.W2Moment._t.seed(424242);
      const b = E.open("defend", { fast: mode === "fast", still: mode === "still", judge: () => "perfect" });
      b.pick(2);
      let resText = null, doneAt = null;
      const t1 = E.now;
      for (let k = 0; k < 2000 && !b.res; k++) { E.advance(5); const rt = b.host.querySelector(".w2m-res"); if (rt) resText = rt.textContent; }
      doneAt = E.now - t1;
      texts[mode] = { resText, doneAt };
    }
    if (!(texts.fast.doneAt <= FAST_MS + 30)) bad.push(`⏩ ${texts.fast.doneAt}ms(≤ ${FAST_MS})`);
    if (!(texts.norm.doneAt > FAST_MS * 2)) bad.push(`보통 ${texts.norm.doneAt}ms`);
    if (!texts.norm.resText || texts.fast.resText !== texts.norm.resText || texts.still.resText !== texts.norm.resText) bad.push(`결과 글 — 보통 「${texts.norm.resText}」 · ⏩ 「${texts.fast.resText}」 · 움직임 줄이기 「${texts.still.resText}」`);
    if (Math.abs(texts.still.doneAt - texts.norm.doneAt) > 30) bad.push(`움직임 줄이기 시간 ${texts.still.doneAt} ≠ 보통 ${texts.norm.doneAt}(같은 시각표에서 모션만 0)`);
    return { ok: bad.length === 0, msg: `🧱 4000 · 5200ms 정확히 끝남 · 🥅 · 🅰️ 60초에도 안 끝남 · ⏩ ${texts.fast.doneAt}ms · 보통 ${texts.norm.doneAt}ms = 움직임 줄이기 ${texts.still.doneAt}ms · 결과 글 셋 같음`, bad };
  },
};

/* B-7 계약 3′ 모양 · 판은 셈하지 않음(3′-a · b · d · e) */
SECTIONS["B-7"] = {
  title: "계약 3′ — `cb(judge, { s, sBoard, cell, target, seen, weak, ms })` · `s = clamp(sBoard × sit.foot × sit.cond)` · 화면 % = `odds`가 준 정수 · `slot` null → 🤖 · `opens`",
  muts: {
    OWNMUL: [[/const s = clamp01\(sBoard \* B\.sit\.foot \* B\.sit\.cond\);/, "const s = clamp01(sBoard * B.sit.foot);"]],
    OWNODDS: [[/const base = pct\(B, 0\.5 \* F \* C\);/, "const base = Math.round(100 * 0.5 * F * C) + 1;"]],
  },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    const KEYS = "cell,ms,s,sBoard,seen,target,weak";
    const sits = [{ weak: false, step: 0, foot: 1, cond: 1.1 }, { weak: true, step: 1, foot: 0.88, cond: 0.9 }, { weak: true, step: 2, foot: 0.95, cond: 1.147 }];
    const odds = (s) => Math.round(37 + 41 * s);             // 아무 함수 — 화면이 이 값을 그대로 쓰는가
    for (const kind of KINDS) for (const sit of sits) for (let i = 0; i < 3; i++) {
      const b = E.open(kind, { sit, odds });
      const head = (b.host.querySelector(".w2m-odds") || {}).textContent || "";
      const want = odds(Math.min(1, 0.5 * sit.foot * sit.cond));
      if (head.indexOf(`${want}%`) < 0) bad.push(`${kind} 머리 「${head}」에 ${want}% 없음`);
      if (sit.weak && head.indexOf(`${odds(Math.min(1, 0.5 * sit.cond))} → ${want}%`) < 0) bad.push(`${kind} 약발 화살표 「${head}」`);
      b.pick(i);
      const r = b.finish();
      if (!r || Object.keys(r.d).sort().join() !== KEYS) { bad.push(`${kind}: cb 칸 ${r && Object.keys(r.d).sort().join()}`); continue; }
      if (!close9(r.d.s, Math.min(1, Math.max(0, r.d.sBoard * sit.foot * sit.cond)))) bad.push(`${kind}: s ${r.d.s} ≠ ${r.d.sBoard} × ${sit.foot} × ${sit.cond}`);
      if (r.d.weak !== sit.weak) bad.push(`${kind}: weak`);
    }
    const nb = E.open("defend", { slot: null, sit: sits[1] });
    const d = nb.res && nb.res.d;
    if (!d || d.sBoard !== 0.5 || d.ms !== 0 || d.cell !== null || !close9(d.s, 0.5 * 0.88 * 0.9)) bad.push(`slot null: ${JSON.stringify(d)}`);
    const O = E.W.W2Moment.opens;
    if (!(O("goal") && O("assist") && O("defend") && !O("oneone") && !O("x"))) bad.push("opens");
    return { ok: bad.length === 0, msg: "판 셋 × 상황 셋 × 칸 셋 — cb 칸 일곱 · s 곱 · 머리 % = odds · 약발 화살표 앞 = odds(0.5 × 🫀) · slot null 🤖 · opens 셋", bad };
  },
};

/* B-8 탭 — click만 · ▶️ 꼬리(손가락 탭 0.35초) 버림 · 키보드 1~6 */
SECTIONS["B-8"] = {
  title: "탭 — `pointerdown`만으로는 안 고름 · `click`으로 고름 · 판이 뜬 뒤 0.35초 안의 손가락 탭은 버림 · 키보드 1~6",
  muts: { ARM0: [[/if \(e\.detail > 0 && nowMs\(\) - opened < TUNE\.ARM_MS\) return;/, ""]] },
  run(muts) {
    const E = boardEnv(muts);
    const W = E.W;
    const bad = [];
    { const b = E.open("goal"); E.advance(500); b.cells()[1].dispatchEvent(new W.Event("pointerdown", { bubbles: true })); b.finish(5000); if (b.res) bad.push("pointerdown만으로 골라짐"); }
    { const b = E.open("goal"); E.advance(100); b.cells()[1].dispatchEvent(new W.MouseEvent("click", { bubbles: true, detail: 1 })); if (b.host.querySelector(".is-pick")) bad.push("0.1초 손가락 탭이 골라짐(▶️ 꼬리)"); E.advance(500); b.cells()[1].dispatchEvent(new W.MouseEvent("click", { bubbles: true, detail: 1 })); if (!b.finish(20000)) bad.push("0.6초 손가락 탭이 안 골라짐"); }
    { const b = E.open("assist"); E.advance(500); W.document.dispatchEvent(new W.KeyboardEvent("keydown", { key: "3", bubbles: true })); const r = b.finish(20000); if (!r || r.d.cell !== 2) bad.push(`키보드 3 → 칸 ${r && r.d.cell}`); }
    return { ok: bad.length === 0, msg: "pointerdown 0 · 0.1초 손가락 탭 버림 · 0.6초 탭 고름 · 키보드 「3」 → 칸 2", bad };
  },
};

/* B-9 연출 난수 — 판 전용 `fx` · `Math.random` 0 · 판 하나에 4번 고정(결과 · 종류를 안 탐) */
SECTIONS["B-9"] = {
  title: "연출 난수 — `Math.random` 0 · 판 전용 `fx`(같은 씨앗이면 같은 정답 길 · 보임 — 고른 칸 · 결과와 무관 · 판 하나 4번)",
  muts: { RND: [[/B\.r = \[fx\(\), fx\(\), fx\(\), fx\(\)\];/, "B.r = [Math.random(), fx(), fx(), fx()];"]] },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    const r0 = E.randomCalls;
    const seq = (judgeOut, cell) => {
      E.W.W2Moment._t.seed(31337);
      const out = [];
      for (let k = 0; k < 4; k++) {
        const b = E.open(k % 3 === 0 ? "goal" : "defend", { judge: () => judgeOut });
        b.pick(cell);
        const r = b.finish();
        out.push(r.d.target == null ? "-" : `${r.d.target}${r.d.seen}`);
      }
      return out.join(",");
    };
    const a = seq("perfect", 0), b2 = seq("miss", 4);
    if (a !== b2) bad.push(`같은 씨앗인데 결과 · 고른 칸에 따라 정답 길이 갈림: ${a} ↔ ${b2}`);
    if (E.randomCalls !== r0) bad.push(`Math.random ${E.randomCalls - r0}번`);
    return { ok: bad.length === 0, msg: `판 8번 — Math.random ${E.randomCalls - r0}번 · 같은 씨앗 → 같은 정답 길 · 보임(${a})`, bad };
  },
};

/* 🏃 절 묶음 실행 — 기준선 → 변이(절마다) · 종료 코드 0/1/2 */
async function runSections(ids, label) {
  let fail = 0;
  const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
  try {
    const allMuts = {};
    for (const id of ids) for (const [k, v] of Object.entries(SECTIONS[id].muts || {})) allMuts[`${id}-${k}`] = v;
    const bad0 = momentMutsOK(allMuts);
    check(bad0.length === 0, `0. 변이 정규식 ${Object.keys(allMuts).length}개가 지금 beta/winger-moment.js에 전부 걸린다` + (bad0.length ? bad0.map((b) => `\n       · ${b}`).join("") : ""));
    for (const id of ids) {
      const S = SECTIONS[id];
      const r = S.run([]);
      check(r.ok, `${id}. ${S.title}\n     ${r.msg}` + (r.bad.length ? `\n     🔴 ${r.bad.slice(0, 4).join(" · ")}` : ""));
      if (!r.ok || bad0.length) continue;
      for (const [k, m] of Object.entries(S.muts || {})) {
        let red;
        try { red = !S.run(m).ok; } catch (e) { red = true; }
        check(red, `변이-${k} → ${id}가 빨간불`);
      }
    }
  } catch (e) {
    console.log(`💥 ${e && e.stack ? e.stack : e}`);
    process.exit(2);
  }
  console.log(fail ? `\n❌ ${fail}건 실패 (${label})` : `\n✅ 통과 (${label})`);
  process.exit(fail ? 1 : 0);
}

module.exports = { boardEnv, SECTIONS, runSections, HIT, MISS, FLAT, PICK_MS, WIDE_MS };
