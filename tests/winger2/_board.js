/* ⚽ 더 윙어 II 1막 v2 — 🎮 **새 판 셋**(🥅 슈팅 · 🅰️ 컷백 · 🧱 막기) 검사 장치 · 절 묶음 (2026-10-05 · inspector)
 *
 * 정본: 44번(v3 — 38번보다 우선) · 38번 §2 계약 3′ · §6 3′-a~f · 37번 §4(1~4 · 7 · 12) · 43번 §4 #1 · #2 · 31번 v2-5(검사 창구 `W2Moment._t`)
 * 진짜 `beta/winger-moment.js`를 jsdom에 싣고(엔진 함께) **가상 시계**로 돌립니다 — `setTimeout` · `performance.now`를 검사가 쥠
 * (4초 · 5.2초 같은 제한을 실제로 기다리지 않고, 「몇 ms 뒤에 끝났나」를 그대로 잽니다).
 * 옛 판 검사 일곱(mirror · one-grid · ceil-perfect · tier-in · moment · minigame-tap · raf)이 이 파일의 절을 나눠 부릅니다.
 * 🔒 절마다 **기준선 초록 → 파일 안 변이 빨강**. 칸 값 · 시간은 38번 §5 · 37번 §2 숫자를 박은 값으로 씁니다.
 */
"use strict";
const { momentDom, pressDom, momentMutsOK } = require("./_load.js");

const FLAT = 0.5, FAST_MS = 400;   // 🔒 44번 §1(판 셋 모두 여섯 칸 0.5 · 시간 제한 없음) · 36번 §7-1
/* 🪦 v3 퇴역(44번 §1 · J9 「🧱도 감」): 🧱 정답 0.80 · 나머지 0.44 · 흐림 50% · 4초(♿ 5.2초) · 시간 초과 · 디딤발 단서 —
 *    그 뜻을 지키던 절(B-1의 0.80/0.44 · B-3 보임 · B-4 거짓 0 = 공의 길 = 디딤발 · B-6 시간 초과)은 아래 새 뜻으로 바꿈 */
const ORD = ["첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째"];
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
const BLOCK4S = [[/const opened = nowMs\(\);\n(\s+)let picked = false;/, 'const opened = nowMs();\n$1let picked = false; if (B.kind === "defend") setTimeout(() => choose(0), 4000);']];

/* B-1 여섯 칸 0.5(37번 §4 #1 → 44번 §1) — 판 셋 모두 여섯 칸 0.5 · 실제로 고른 칸의 `sBoard` */
SECTIONS["B-1"] = {
  title: "여섯 칸 0.5 — 🥅 · 🅰️ · 🧱 판 셋 모두 여섯 칸 0.5(v3 · 🧱 0.80 / 0.44 퇴역)",
  muts: { BLK80: [[/const values = \(\) => \[0, 1, 2, 3, 4, 5\]\.map\(\(\) => TUNE\.FLAT\);/, "const values = () => [0, 1, 2, 3, 4, 5].map((i) => (i === 0 ? 0.80 : 0.44));"]] },
  run(muts) {
    const E = boardEnv(muts);
    const V = E.W.W2Moment._t.values;
    const bad = [];
    const v = V("defend", 0);
    if (JSON.stringify(v) !== JSON.stringify([FLAT, FLAT, FLAT, FLAT, FLAT, FLAT])) bad.push(`values ${v.join(",")}`);
    for (const kind of KINDS) for (let i = 0; i < 6; i++) {
      E.W.W2Moment._t.seed(100 + i);
      const b = E.open(kind);
      b.pick(i);
      const r = b.finish();
      if (!r || !close9(r.d.sBoard, FLAT)) bad.push(`${kind} 칸 ${i}: sBoard ${r && r.d.sBoard}`);
    }
    return { ok: bad.length === 0, msg: "칸 값 표 · 실제 판 18번(판 셋 × 칸 여섯) — 모두 0.5", bad };
  },
};

/* B-2 손 ≡ 🤖 · 시간 제한 없음(37번 §4 #2 · 43번 §4 #1 · #2) — 판 셋 모두 */
SECTIONS["B-2"] = {
  title: "손 ≡ 🤖 — 판 셋 모두 같은 상황이면 손 · 🤖의 `s` 비트 같음 · 시간 제한 없음(🧱 포함) · 🅰️ 고르기 전 그림에 수비 0",
  muts: {
    ONE55: [[/const values = \(\) => \[0, 1, 2, 3, 4, 5\]\.map\(\(\) => TUNE\.FLAT\);/, "const values = () => [0, 1, 2, 3, 4, 5].map((i) => (i === 2 ? 0.55 : TUNE.FLAT));"]],
    BLOCK4S,
  },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    const sit = { weak: true, step: 1, foot: 0.88, cond: 0.93 };
    for (const kind of KINDS) {
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
    return { ok: bad.length === 0, msg: "판 셋 × 칸 여섯 × 상황(약발 1단계 · 🫀 0.93)에서 손 s == 🤖 s · 60초 기다려도 판이 안 끝남 · 🅰️ 수비 그림 0", bad };
  },
};

/* B-3 🧱 감(43번 §4 #2 · 44번 3′) — 단서 0: 디딤발 · 흐림 그림 0 · 단서 글 「없음」 · cb `target` · `seen` 늘 null · 안내 열쇠 `w2v5-block` */
SECTIONS["B-3"] = {
  title: "🧱 감 — 고르기 전 디딤발 · 흐림 · 길 표시 0 · 단서 글 「단서 없음」 · cb `target` · `seen` 늘 null(판 셋) · 처음 세 번 안내 열쇠 `w2v5-block`",
  muts: {
    TARGET: [[/B\.cb\(j, \{ s, sBoard, cell: i, target: null, seen: null, weak: B\.sit\.weak, ms \}\);/, 'B.cb(j, { s, sBoard, cell: i, target: i, seen: "clear", weak: B.sit.weak, ms });']],
    OLDKEY: [[/key: "w2v5-block",/, 'key: "w2v4-block",']],
  },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    for (let seed = 1; seed <= 24; seed++) for (const kind of KINDS) {
      E.W.W2Moment._t.seed(seed * 7919);
      const b = E.open(kind);
      const H = b.host;
      const clue = (H.querySelector(".w2m-clue") || {}).textContent || "";
      if (clue.indexOf("단서 없음") < 0) bad.push(`${kind} 단서 「${clue}」`);
      const stud = H.querySelectorAll(".a-leg, .a-legimg, .a-boot, .w2m-dim, [data-lane], .is-target").length;
      if (stud) bad.push(`${kind} 고르기 전 단서 그림 ${stud}`);
      if (kind === "defend" && ORD.some((w) => H.textContent.indexOf(`${w} 길`) >= 0)) bad.push("🧱 고르기 전 글에 길 이름");
      b.pick(seed % 6);
      const r = b.finish();
      if (!r || r.d.target !== null || r.d.seen !== null) bad.push(`${kind}: target ${r && r.d.target} · seen ${r && r.d.seen}`);
    }
    const key = E.W.W2Moment.WORDS && E.W.W2Moment.WORDS.defend && E.W.W2Moment.WORDS.defend.key;
    if (key !== "w2v5-block") bad.push(`🧱 안내 열쇠 ${key}`);
    return { ok: bad.length === 0, msg: "판 셋 × 시드 24 — 단서 그림 · 길 이름 0 · target · seen null · 🧱 열쇠 w2v5-block", bad: [...new Set(bad)] };
  },
};

/* B-4 🧱 결과 그림 = 판정(거짓 0의 새 뜻 · 42번 §2) — 막음은 「막았어요」 · 실점은 「들어갔어요」 · 해설의 길이 문장과 맞음
 *    (옛 뜻 「공의 길 = 디딤발 = 단서」는 디딤발 퇴역으로 사라짐 · 남는 거짓의 자리는 「그림 · 글이 판정과 어긋남」) */
SECTIONS["B-4"] = {
  title: "거짓 0(🧱 v3) — 막음 = 「🧱 막았어요」 · 실점 = 「😣 …들어갔어요」 · 해설 「슛은 N째 길」이 문장과 맞음(몸으로 막음 · 같은 길 = 고른 길 / 다른 길 · 한 길 차이 ≠ 고른 길)",
  muts: { LIE: [[/const lane = j === "perfect" \? \(alt \? other : c\) : \(alt \? c : other\);/, "const lane = c;"]] },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    let n = 0;
    for (let seed = 1; seed <= 60; seed++) {
      E.W.W2Moment._t.seed(seed * 104729);
      const out = ["perfect", "ok", "miss"][seed % 3];
      const b = E.open("defend", { judge: () => out });
      const c = seed % 6;
      b.pick(c);
      let res = "", note = "";
      for (let k = 0; k < 800 && !b.res; k++) {
        E.advance(10);
        const rt = b.host.querySelector(".w2m-res"); if (rt) res = rt.textContent;
        const nt = b.host.querySelector(".w2m-note"); if (nt) note = nt.textContent;
      }
      n += 1;
      const lane = ORD.findIndex((w) => note.indexOf(`${w} 길`) >= 0);
      const okText = out === "perfect" ? /^🧱 막았어요/.test(res) : /^😣 .*들어갔어요/.test(res);
      if (!okText) bad.push(`#${seed} ${out}: 「${res}」`);
      if (lane < 0) { bad.push(`#${seed}: 해설 「${note}」`); continue; }
      if (/몸으로 막아|같은 길이었는데/.test(res) && lane !== c) bad.push(`#${seed}: 「${res}」인데 길 ${lane} ≠ 고른 ${c}`);
      if (/다른 길로|한 길 차이/.test(res) && lane === c) bad.push(`#${seed}: 「${res}」인데 길 ${lane} = 고른 ${c}`);
      if (/한 길 차이/.test(res) && Math.abs(lane - c) !== 1) bad.push(`#${seed}: 한 길 차이인데 ${lane} · ${c}`);
    }
    return { ok: bad.length === 0 && n === 60, msg: `🧱 판 ${n}번(완벽 · 괜찮음 · 놓침) — 결과 글이 판정과 같고 해설의 길이 문장과 맞음`, bad };
  },
};

/* B-5 굴림 한 번(37번 §4 #7 · 3′-c) — 판마다 `judge` 1번 · cb의 판정 == judge가 낸 것(v3: 시간 초과 길 퇴역) */
SECTIONS["B-5"] = {
  title: "굴림 한 번 — 판마다 `judge` 정확히 1번 · 판정은 드라이버가 낸 그대로(머리 없는 길 포함)",
  muts: { TWICE: [[/if \(first\) return first;\n/, ""], [/const j = B\.judge\(s\); {0,}(\/\/[^\n]*)?\n/, "const j0 = B.judge(s); const j = B.judge(s);\n"]] },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    let n = 0;
    for (const kind of KINDS) for (let k = 0; k < 4; k++) {
      const calls = [];
      const out = ["perfect", "miss", "ok", "perfect"][k];
      const b = E.open(kind, { judge: (s) => { calls.push(s); return out; } });
      b.pick(k);
      const r = b.finish();
      n += 1;
      if (calls.length !== 1 || !r || r.j !== out) bad.push(`${kind} #${k}: judge ${calls.length}번 · 결과 ${r && r.j} ≠ ${out}`);
    }
    const nullCalls = [];
    E.open("goal", { slot: null, judge: (s) => { nullCalls.push(s); return "ok"; } });
    if (nullCalls.length !== 1) bad.push(`slot null: judge ${nullCalls.length}번`);
    return { ok: bad.length === 0, msg: `판 ${n}번 + 머리 없는 길 1번 — judge 1번씩 · 판정 그대로`, bad };
  },
};

/* B-6 시간 · ⏩ · 움직임 줄이기(37번 §4 #12 → v3: 시간 초과 퇴역) */
SECTIONS["B-6"] = {
  title: "시간 · ⏩ · 움직임 줄이기 — 판 셋 모두 시간 초과 없음(`wide`를 넘겨도 무시) · ⏩ 0.4초 · 움직임 줄이기는 같은 시각표 · 결과 글 같음",
  muts: {
    BLOCK4S,
    FASTSKIP: [[/const res = el\("p", `w2m-res \$\{j === "perfect" \? "w2m-good" : j === "ok" \? "w2m-mid" : "w2m-bad"\}`, plan\.text\);/,
      'const res = el("p", `w2m-res ${j === "perfect" ? "w2m-good" : j === "ok" ? "w2m-mid" : "w2m-bad"}`, B.fast ? "" : plan.text);']],
  },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    for (const kind of KINDS) for (const wide of [false, true]) { const b = E.open(kind, { wide }); if (b.finish(60000)) bad.push(`${kind}${wide ? " · wide" : ""}: 시간 초과로 끝남`); }
    const texts = {};
    for (const mode of ["norm", "fast", "still"]) {
      E.W.W2Moment._t.seed(424242);
      const b = E.open("defend", { fast: mode === "fast", still: mode === "still", judge: () => "perfect" });
      b.pick(2);
      let resText = null;
      const t1 = E.now;
      for (let k = 0; k < 2000 && !b.res; k++) { E.advance(5); const rt = b.host.querySelector(".w2m-res"); if (rt) resText = rt.textContent; }
      texts[mode] = { resText, doneAt: E.now - t1 };
    }
    if (!(texts.fast.doneAt <= FAST_MS + 30)) bad.push(`⏩ ${texts.fast.doneAt}ms(≤ ${FAST_MS})`);
    if (!(texts.norm.doneAt > FAST_MS * 2)) bad.push(`보통 ${texts.norm.doneAt}ms`);
    if (!texts.norm.resText || texts.fast.resText !== texts.norm.resText || texts.still.resText !== texts.norm.resText) bad.push(`결과 글 — 보통 「${texts.norm.resText}」 · ⏩ 「${texts.fast.resText}」 · 움직임 줄이기 「${texts.still.resText}」`);
    if (Math.abs(texts.still.doneAt - texts.norm.doneAt) > 30) bad.push(`움직임 줄이기 시간 ${texts.still.doneAt} ≠ 보통 ${texts.norm.doneAt}`);
    return { ok: bad.length === 0, msg: `판 셋 × (wide 없음 · 있음) 60초에도 안 끝남 · ⏩ ${texts.fast.doneAt}ms · 보통 ${texts.norm.doneAt}ms = 움직임 줄이기 ${texts.still.doneAt}ms · 결과 글 셋 같음`, bad };
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
      if (r.d.target !== null || r.d.seen !== null) bad.push(`${kind}: target · seen이 null이 아님(44번 3′)`);
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

/* B-9 연출 난수 — 판 전용 `fx` · `Math.random` 0 · 같은 씨앗 · 같은 고름 · 같은 판정이면 같은 결과 그림 */
SECTIONS["B-9"] = {
  title: "연출 난수 — `Math.random` 0 · 판 전용 `fx`(같은 씨앗 · 고름 · 판정이면 결과 글 · 해설 같음)",
  muts: { RND: [[/B\.r = \[fx\(\), fx\(\), fx\(\), fx\(\)\];/, "B.r = [Math.random(), fx(), Math.random(), Math.random()];"]] },
  run(muts) {
    const E = boardEnv(muts);
    const bad = [];
    const r0 = E.randomCalls;
    const seq = () => {
      E.W.W2Moment._t.seed(31337);
      const out = [];
      for (let k = 0; k < 6; k++) {
        const b = E.open(KINDS[k % 3], { judge: () => ["perfect", "miss"][k % 2] });
        b.pick(k);
        let t = "";
        for (let q = 0; q < 800 && !b.res; q++) { E.advance(10); const rt = b.host.querySelector(".w2m-res"); const nt = b.host.querySelector(".w2m-note"); if (rt) t = rt.textContent + "|" + (nt ? nt.textContent : ""); }
        out.push(t);
      }
      return out.join(" / ");
    };
    const a = seq(), b2 = seq();
    if (a !== b2) bad.push("같은 씨앗 · 같은 고름인데 결과 그림이 갈림");
    if (E.randomCalls !== r0) bad.push(`Math.random ${E.randomCalls - r0}번`);
    return { ok: bad.length === 0, msg: `판 12번 — Math.random ${E.randomCalls - r0}번 · 같은 씨앗 → 같은 결과`, bad };
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

module.exports = { boardEnv, SECTIONS, runSections, FLAT };
