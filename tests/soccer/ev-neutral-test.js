/* ⚖️ 늘 안전 == 현행 — 확정만 고르는 커리어가 **운영판 코드(`soccer/`)** 와 한 톨도 안 다른가 (스펙 §9-A 1 · 3)
 *
 * 스펙 §2-1 「중립은 정의로」 — 유스의 확정 = 옛 maybeEvent 효과 그대로, 프로의 확정 = 효과 0.
 * 그래서 「늘 확정만 고르는 커리어 == 현행 커리어」가 **구성으로** 서야 해요. 이 파일이 그걸 봅니다.
 *
 * 「현행」 = 운영판 `soccer/` — 이번 작업이 안 건드렸고 HEAD의 `beta/soccer/`와 md5가 같아요.
 *   ⚠️ 그래서 **이 검사의 대조군은 운영판이 바뀌는 순간(승격) 새 판이 돼요.** 승격 뒤에는 운영판 == 베타라
 *   늘 초록이에요 — 그때는 이 파일의 대조군을 「승격 전 운영판 사본」으로 옮기거나, 다음 개편의 현행으로 다시 잡으세요.
 *   (「어느 세계에서 성립하는 문장인가」: **베타가 운영판보다 앞서 있는 세계**의 계약이에요)
 *
 * 지키는 것
 *   ① 새 선수 — 같은 시드 · 같은 버튼 순서로 두 판(운영판 / 베타)을 **데뷔부터 은퇴까지** 굴려
 *      걸음마다 핵심 칸(능력치·명성·돈·컨디션·활동·트로피 …)이 같고, 시즌 결산마다 세이브 전체(새 칸 뺌)가 같고,
 *      명예의 전당 항목(새 키 뺌)이 같다. 이적·월드컵·컵·특훈이 섞이게 정책을 짰어요
 *   ② 옛 세이브(새 칸이 하나도 없는 확인용 세이브 — 유스 · 시즌 중 · 결산 중 · 은퇴 직전 · 월드컵)를 이어서 굴려도 같다
 *   ③ 게임 난수를 먹은 횟수가 같다(이벤트는 WingerEvents._rng만 써야 해요)
 *   ④ 페이지 안 예외 0
 *
 * 변이 — 이게 안 잡히면 위 초록불은 아무것도 안 지키는 거예요
 *   M1 유스 🧑‍🏫 확정 효과 +3 → +4 (스펙 §9-A 1이 적은 변이) → 빨간불이어야 해요
 *   M2 이벤트 난수를 게임 난수에서 뽑기(`_rng` 대신 Math.random) → 빨간불이어야 해요
 *
 * 측정 조건: 게임 = Math.random(시드) · 이벤트 = seed ^ 0x9E3779B9 · 정책 = seed ^ 0x85EBCA6B(_w1.js 한 군데서 가름).
 *   연출(fx.js)은 난수를 안 쓰는 빈 연출로 바꿔요 — 꽃가루 자리를 Math.random으로 정해서 게임 난수를 먹어요.
 *   이벤트 정책 = 늘 확정(📍 1장은 🔀 거래가 아니라 🙂 — 스펙 §4-3) · 등번호 창은 「건너뛰기」.
 *   비교에서 빼는 칸 = 이번 작업이 새로 만든 칸(§6-1) + proLog(새 줄이 붙고 30줄로 잘려요) + savedAt(시각).
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) */
"use strict";
const path = require("path");
const H = require("./_w1.js");
H.guardExit();

const MUT = {
  M1: { file: "events.js", muts: [[/const base = \{ stat: \{ k: d\.key, v: 3 \} \};/, "const base = { stat: { k: d.key, v: 4 } };"]] },
  M2: { file: "events.js", muts: [[/const rng = \(\) => api\._rng\(\);/, "const rng = () => Math.random();"]] },
};

/* ---------- 자식: 판 하나 ---------- */
const JOB = H.jobArg();
if (JOB) {
  const j = JOB;
  /* 변이는 이름으로 받아요 — 정규식은 JSON을 못 건너요(실측: {}가 돼서 조용히 안 걸렸어요) */
  const P = H.boot({ which: j.which, seed: j.seed, keys: j.keys, muts: j.mut ? { "events.js": MUT[j.mut].muts } : null });
  const D = H.makeDriver(P, { pos: j.pos, market: j.market, name: "중립", ev: H.EV.safe, move: j.move, ext: j.ext,
    wild: j.wild, resume: !!j.keys, retireAt: j.retireAt });
  const steps = [], cps = [];
  const OVERLAY = new Set(["ev", "ev-ok", "no-skip"]);   // 베타에만 있는 조작 — 걸음 수에 안 세요
  /* 걸음마다 **그 조작을 누르기 직전**의 상태를 찍어요. 유스 이벤트는 행동 직후 생기고 답할 때 효과가 붙어서
   * (스펙 §3-4 — 답하기 전에는 모달이 「출전!」까지 가려요), 행동 **직후**에 찍으면 운영판(즉시 적용)과
   * 한 걸음 어긋나 보여요. 다음 조작 직전이면 두 판 다 효과가 붙은 뒤예요 — 게임이 실제로 보는 상태예요 */
  let pre = H.md5(H.core(P.S()));
  D.run({
    max: 80000,
    /* until — 숫자면 그 시즌 결산 화면에서 멈춰요 · "youth"면 유스 엔딩 화면에서 멈춰요 */
    until: j.until === "youth" ? () => P.active() === "screen-ending"
      : j.until ? (st) => st.phase === "soccer-pro" && st.proYear >= j.until && P.active() === "screen-career" : null,
    onStep: (what) => {
      if (!OVERLAY.has(what)) {
        steps.push(pre);
        if (what === "season" || what === "debut" || what === "retire") cps.push({ tag: `${what}@${steps.length}`, s: H.snap(P.S()) });
      }
      pre = H.md5(H.core(P.S()));
    },
  });
  cps.push({ tag: "end", s: H.snap(P.S()) });
  cps.push({ tag: "hof", s: H.hofSnap(P.w) });
  /* 사진 전체는 W1_DIFF=1일 때만 실어 보내요 — 커리어 하나에 수 MB라 자식 여럿이면 메모리가 모자라요(실측: 스왑으로 25분) */
  const out = { steps, cps: cps.map((c) => ({ tag: c.tag, h: H.md5(c.s), s: process.env.W1_DIFF ? c.s : undefined })), log: D.log, errors: P.errors,
    evs: D.evs.length, rng: P.calls.game, which: j.which };
  P.close();
  H.emit(out);
} else {

/* ---------- 부모 ---------- */
let bad = 0, dead = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

/* 0번 — 변이 정규식이 **지금 소스에 걸리는가**. 안 걸리면 변이가 조용히 죽어서 아래 「빨간불 확인」이 거짓이 돼요 */
console.log("=== 0. 변이 등록 — 변이가 소스에 걸리는가 ===");
const miss = H.mutMisses(MUT);
check(miss.length === 0, `변이 정규식이 전부 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);

const FX = H.fixtures();
const fxKeys = (id) => { const it = FX.items.find((x) => x.id === id); return it ? it.keys : null; };

/* 새 선수 — 포지션·유스·이적 성향을 갈라서(시드 하나 · 격자 한 칸으로 재지 않아요) */
const FRESH = [
  { seed: 20260929, pos: "fw", market: 0, move: 0.35, ext: true, wild: "go" },
  { seed: 777001, pos: "df", market: 3, move: 0.5, ext: false, wild: "stay", until: 7 },
  { seed: 4242, pos: "mf", market: 1, move: 0.25, ext: true, wild: "go", until: 4 },
];
/* 옛 세이브 — 새 칸이 하나도 없는 확인용 세이브(make-fixtures.js가 HEAD 코드로 만든 것) */
const OLD = [
  { id: "soccer-judge", what: "유스 3년차 12월(프로 도전 직전)", until: 2 },
  { id: "soccer-slot", what: "1시즌 시즌 중(8경기)", until: 2 },
  { id: "soccer-cup", what: "1시즌 결산 중(컵 8강 준비)", until: 2 },
  { id: "soccer-wc-invite", what: "7시즌 전반기 막바지(월드컵 초대장 앞)", until: 8 },
  { id: "soccer-veteran", what: "13시즌 개막 직전 — 은퇴까지", until: null },
  { id: "soccer-final", what: "15시즌 결산 — 은퇴 직전", until: null },
];

(async () => {
  const jobs = [];
  const pairs = [];
  for (const f of FRESH) {
    const base = { seed: f.seed, pos: f.pos, market: f.market, move: f.move, ext: f.ext, wild: f.wild, until: f.until || null };
    pairs.push({ label: `새 선수 ${f.pos} · 유스 ${f.market} · 시드 ${f.seed}${f.until ? ` (${f.until}시즌까지)` : " (은퇴까지)"}`, a: jobs.length, b: jobs.length + 1, kind: "fresh" });
    jobs.push(Object.assign({ which: "live" }, base), Object.assign({ which: "beta" }, base));
  }
  for (const o of OLD) {
    const keys = fxKeys(o.id);
    if (!keys) { check(false, `확인용 세이브 ${o.id}가 _fixtures.js에 있다`); continue; }
    for (const seed of (o.id === "soccer-judge" ? [31, 5150] : [31])) {
      const base = { seed, keys, pos: "fw", market: 0, move: 0.3, ext: true, wild: "go", until: o.until };
      pairs.push({ label: `옛 세이브 ${o.id} — ${o.what} · 시드 ${seed}`, a: jobs.length, b: jobs.length + 1, kind: "old" });
      jobs.push(Object.assign({ which: "live" }, base), Object.assign({ which: "beta" }, base));
    }
  }
  /* 변이 — 유스만(M1) · 유스 + 2시즌(M2). 시드 넷(🧑‍🏫 개인지도는 달마다 30% × 1/7이라 시드 하나로는 안 나올 수 있어요) */
  const mutPairs = [];
  if (!miss.length) {
    for (const seed of [11, 12, 13, 14]) {
      mutPairs.push({ m: "M1", seed, a: jobs.length, b: jobs.length + 1 });
      jobs.push({ which: "live", seed, pos: "fw", market: 0, ext: false, until: "youth" },
        { which: "beta", seed, pos: "fw", market: 0, ext: false, until: "youth", mut: "M1" });
    }
    for (const seed of [21]) {
      mutPairs.push({ m: "M2", seed, a: jobs.length, b: jobs.length + 1 });
      jobs.push({ which: "live", seed, pos: "wg", market: 2, until: 2 },
        { which: "beta", seed, pos: "wg", market: 2, until: 2, mut: "M2" });
    }
  }
  const t0 = Date.now();
  const R = await H.runJobs(path.resolve(__filename), jobs, Number(process.env.W1_PAR) || 2);
  console.log(`   (판 ${jobs.length}개 · ${Math.round((Date.now() - t0) / 1000)}초)`);

  const firstDiff = (x, y) => {
    const n = Math.min(x.steps.length, y.steps.length);
    for (let i = 0; i < n; i++) if (x.steps[i] !== y.steps[i]) return i;
    return x.steps.length === y.steps.length ? -1 : n;
  };
  const same = (x, y) => {
    if (firstDiff(x, y) !== -1) return false;
    if (x.cps.length !== y.cps.length) return false;
    return x.cps.every((c, i) => c.h === y.cps[i].h);
  };
  const explain = (x, y) => {
    const i = firstDiff(x, y);
    if (i >= 0) return `걸음 ${i}에서 갈라짐 — 운영판 [${x.log.slice(Math.max(0, i - 3), i + 1).join(" ")}] · 베타 [${y.log.slice(Math.max(0, i - 3), i + 1).join(" ")}]`;
    const k = x.cps.findIndex((c, j) => !y.cps[j] || c.h !== y.cps[j].h);
    if (k >= 0) return `체크포인트 ${x.cps[k].tag}에서 다름${x.cps[k].s ? ` — ${H.diffKeys(x.cps[k].s, (y.cps[k] || {}).s || "{}").join(" · ")}` : " (W1_DIFF=1로 다시 돌리면 어느 칸인지 보여요)"}`;
    return "";
  };

  console.log("=== ① 새 선수 · ② 옛 세이브 — 늘 확정 == 운영판 ===");
  let evSeen = 0, stepsSeen = 0;
  for (const p of pairs) {
    const x = R[p.a], y = R[p.b];
    if (x.dead || y.dead) { dead++; console.log(`💥 ${p.label} — 판이 죽었어요: ${(x.dead || y.dead).slice(0, 400)}`); continue; }
    const ok = same(x, y);
    evSeen += y.evs; stepsSeen += y.steps.length;
    check(ok, `${p.label} — 걸음 ${y.steps.length} · 결산 ${y.cps.length - 2} · 베타가 답한 이벤트 ${y.evs}건 · 게임 난수 ${x.rng}/${y.rng}${ok ? "" : ` — ${explain(x, y)}`}`);
    check(x.rng === y.rng, `${p.label} — 게임 난수를 먹은 횟수가 같다 (운영판 ${x.rng} · 베타 ${y.rng})`);
    const errs = x.errors.concat(y.errors);
    check(errs.length === 0, `${p.label} — 페이지 안 예외 0${errs.length ? ` — ${errs.slice(0, 2).join(" | ").slice(0, 300)}` : ""}`);
  }
  /* 🔒 「아무 일도 안 일어났다」를 통과로 세지 않아요 — 베타가 실제로 이벤트를 만나고 답했어야 비교가 뭔가를 본 거예요 */
  check(evSeen >= 60, `측정 조건 — 베타가 늘 확정으로 답한 이벤트가 충분하다 (${evSeen}건 · 걸음 ${stepsSeen})`);

  console.log("=== 변이 검증 — 이게 안 잡히면 위 초록불은 아무것도 안 지켜요 ===");
  for (const m of ["M1", "M2"]) {
    const list = mutPairs.filter((q) => q.m === m);
    if (!list.length) { check(false, `${m} — 변이가 소스에 안 걸려 못 돌렸어요(0번 참고)`); continue; }
    let caught = 0, ran = 0;
    for (const q of list) {
      const x = R[q.a], y = R[q.b];
      if (x.dead || y.dead) { dead++; console.log(`💥 ${m} 시드 ${q.seed} — 판이 죽었어요: ${(x.dead || y.dead).slice(0, 300)}`); continue; }
      ran++;
      if (!same(x, y)) caught++;
    }
    const what = m === "M1" ? "유스 🧑‍🏫 확정 +3 → +4" : "이벤트 난수를 게임 난수에서";
    check(ran > 0 && caught > 0, `${m}(${what}) → 빨간불 (시드 ${ran}개 중 ${caught}개에서 어긋남)`);
  }

  console.log(dead ? `\n💥 죽은 판 ${dead}개 — 안 돈 것이 있어요` : bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(dead ? 2 : bad ? 1 : 0);
})().catch(H.die);
}
