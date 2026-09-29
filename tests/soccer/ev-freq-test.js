/* 🗓️ 이벤트가 **언제 · 얼마나 자주** 뜨는가 — 빈도 · pre 자리 · 평소 컨디션 (스펙 §3-3 · §9-A 9 · 10 · 11)
 *
 * ① 빈도 — 실제 버튼으로 시즌을 끝까지 굴려(확인용 세이브 soccer-callup — 1시즌 개막 전에서 은퇴까지 · 무작위 답)
 *    시즌 평균 2.5~4.0 · 한 시즌 최대 5(이야기 장 포함 — §3-3 5번) · 컵·월드컵·특훈 중 0 · 블록 하나에 창 하나 이하 ·
 *    레이어가 둘 겹친 채 이벤트 창이 뜬 적 0
 * ② pre 자리 — 준비 3턴을 마친 첫 경기 직전(`activity`가 생긴 뒤, cb 1 · week 0)에서만.
 *    **시즌 첫 화면**(activity 없음 · 컨디션 80 고정)에서 뜬 창 0
 * ③ 같은 블록을 다시 그려도(renderPrep을 여러 번) 이벤트 난수를 다시 안 먹고 창이 새로 안 생긴다(S.evSlot)
 * ④ 평소 컨디션 — 블록 키가 처음 잡힐 때 한 번만 `평소 += (지금 − 평소) ÷ 8` · 그 블록 조각은 **갱신 전** 값 ·
 *    평소가 없으면 그 블록 컨디션에서 시작 · 월드컵 중에는 안 움직인다
 * ⑤ 모달 한 번에 하나 — 다른 레이어가 떠 있으면 이벤트 창은 기다렸다가 그게 닫히면 뜬다
 *
 * 문턱(스펙 §9-A 9 · §7-2): 시즌 평균 2.5~4.0(실측 3.07) · 최대 5 · USUAL_W 1/8 — 여기 박아요(소스에서 안 읽어요)
 *
 * 변이
 *   R1 blockOf가 시즌 첫 화면(activity 없음)도 pre로 읽게  → ② 빨간불(스펙 §9-A 10이 적은 변이)
 *   R2 block()의 `S.evSlot === key` 거르기를 지운다        → ③ 빨간불
 *   U1 그 블록 조각을 **갱신 뒤** 평소로 잰다              → ④ 빨간불(스펙 §9-A 11 변이 — 분포 대신 조각 값으로 바로 봐요)
 *   M1 이벤트 창의 「다른 레이어가 있으면 기다리기」를 지운다 → ⑤ 빨간불(모달 동시 둘 — 스펙 §9-A 9)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const path = require("path");
const H = require("./_w1.js");
H.guardExit();

const MEAN = [2.5, 4.0], MAX = 5, USUAL_W = 1 / 8;
const MUTS = {
  R1: { file: "events.js", muts: [[/if \(!act\) return \[null, null\];/, "if (!act) return [\"pre\", `${S.proYear}:pre`];"]] },
  R2: { file: "events.js", muts: [[/if \(!kind \|\| S\.evSlot === key\) return;/, "if (!kind) return;"]] },
  M1: { file: "scenes.js", muts: [[/if \(otherModal\("ev-overlay"\)\) \{ later\(eventOverlay\); return; \}/, ""]] },
  U1: { file: "events.js", muts: [[/const usual = typeof S\.condUsual === "number" \? S\.condUsual : S\.condition;\n    S\.condUsual = usual \+ \(S\.condition - usual\) \* USUAL_W;/,
    "const usual0 = typeof S.condUsual === \"number\" ? S.condUsual : S.condition;\n    S.condUsual = usual0 + (S.condition - usual0) * USUAL_W;\n    const usual = S.condUsual;"]] },
};
const FX = H.fixtures();
const keysOf = (id) => FX.items.find((x) => x.id === id).keys;

/* ---------- 자식: 커리어 한 판 ---------- */
const JOB = H.jobArg();
if (JOB) {
  const j = JOB;
  const P = H.boot({ which: "beta", seed: j.seed, keys: keysOf("soccer-callup"), muts: j.mut ? { "events.js": MUTS[j.mut].muts } : null });
  const layersSeen = [];
  let lastS = null;                     // 은퇴하면 S가 null이 돼요 — 마지막으로 본 선수를 쥐고 있어요(evLog를 세려고)
  const D = H.makeDriver(P, { pos: j.pos, ev: H.EV.random, move: 0.3, resume: true, wild: "go", retireAt: j.until || null });
  D.run({
    max: 90000,
    until: j.until ? (st) => st.phase === "soccer-pro" && st.proYear >= j.until && P.active() === "screen-career" : null,
    onStep: () => {
      const n = Array.from(P.doc.body.children).filter((x) => x.classList.contains("av-overlay")).length; if (n >= 2) layersSeen.push(n);
      const s = P.S(); if (s) lastS = s;
    },
  });
  const S = P.S() || lastS;
  const log = S ? S.evLog || [] : [];
  H.emit({ evs: D.evs.map((r) => ({ id: r.id, sid: r.sid, at: r.at, where: r.where })), perSeason: log.filter((l) => l.y > 0).reduce((m, l) => { m[l.y] = (m[l.y] || 0) + 1; return m; }, {}),
    seasons: S ? S.proYear : null, layers: layersSeen.length, errors: P.errors });
} else {
  let bad = 0, dead = 0;
  const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

  /* ---------- ③④ 블록 하나를 붙잡고 ---------- */
  function blockCase(muts, seed) {
    const P = H.boot({ which: "beta", seed, keys: keysOf("soccer-veteran"), muts });
    H.tap(P, P.$("btn-continue"));
    const go = P.doc.querySelector(".slot-modal .slot-go"); if (go) H.tap(P, go);
    const no = P.doc.querySelector(".no-overlay #no-skip"); if (no) H.tap(P, no);
    const E = P.w.WingerEvents;
    let calls = 0;
    const inner = E._rng;
    E._rng = () => { calls++; return inner(); };
    const base = JSON.stringify(P.S());
    const out = { reroll: 0, rerolls: [], upd: [], part: [], wc: null, fresh: [], err: [] };
    for (let k = 0; k < 120; k++) {
      const S = JSON.parse(base);
      const u0 = 30 + (k % 7) * 10, c = 20 + ((k * 37) % 81);
      const hasUsual = k % 3 !== 0;
      if (hasUsual) S.condUsual = u0; else delete S.condUsual;
      S.condition = c; S.evSlot = null; S.evSeason = null; S.ev = null;
      P.set("S", S);
      const c0 = calls;
      P.w.WingerCareer.refreshPro();                      // 블록 키가 처음 잡혀요
      const after1 = P.S().condUsual, ev = E.pending(), c1 = calls;
      const pre = hasUsual ? u0 : c;
      const want = pre + (c - pre) * USUAL_W;
      if (Math.abs(after1 - want) > 1e-9) out.upd.push(`평소 ${hasUsual ? u0 : "없음"} · 오늘 ${c} → ${after1} (기대 ${want})`);
      if (ev) {
        const t = ev.opts.find((o) => o.k === "try");
        const cp = t && t.parts.find((p) => p.usual != null);
        if (cp && cp.usual !== Math.round(pre)) out.part.push(`${ev.id} 조각의 평소 ${cp.usual} · 갱신 전 ${Math.round(pre)}`);
        if (t) out.fresh.push(cp ? cp.usual : null);
        const ov = P.doc.querySelector(".ev-overlay");
        const s = ov && ov.querySelector(".ev-opt.k-safe"); if (s) H.tap(P, s);
        const ok = ov && ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok);
      }
      // ③ 같은 블록을 다시 그리기 — 이벤트 난수 0 · 새 창 0 · 평소 그대로
      const c2 = calls, u2 = P.S().condUsual;
      for (let t = 0; t < 4; t++) P.w.WingerCareer.refreshPro();
      if (calls !== c2 || E.pending() || P.S().condUsual !== u2) { out.reroll++; if (out.rerolls.length < 2) out.rerolls.push(`다시 그린 뒤 난수 +${calls - c2} · 창 ${!!E.pending()} · 평소 ${u2} → ${P.S().condUsual}`); }
      void c0; void c1;
    }
    // ④ 월드컵 중에는 안 움직여요
    {
      const S = JSON.parse(base);
      S.condUsual = 50; S.condition = 90; S.evSlot = null; S.evSeason = null; S.ev = null;
      S.wc = { y: S.proYear, stage: 0, ready: false };
      P.set("S", S);
      try { P.w.WingerEvents.block(); } catch (e) { out.err.push(String(e)); }
      out.wc = P.S().condUsual;
    }
    out.err.push(...P.errors);
    P.close();
    return out;
  }

  /* ⑤ 모달 한 번에 하나 — 다른 레이어(🎉 피버 알림 같은 것)가 떠 있으면 이벤트 창은 **기다렸다가** 그게 닫히면 뜬다
   *    (scenes.js otherModal · MutationObserver — director 31번 「설계로 막은 것」). 안 기다리면 둘이 겹치고,
   *    안 뜨면 답 없이 「경기하러 가기」를 누를 수 있어요 */
  async function deferCase(muts) {
    const P = H.boot({ which: "beta", seed: 5, keys: keysOf("soccer-slot"), muts });
    H.tap(P, P.$("btn-continue"));
    const go = P.doc.querySelector(".slot-modal .slot-go"); if (go) H.tap(P, go);
    const fake = P.doc.createElement("div");
    fake.className = "av-overlay fever-overlay";
    fake.innerHTML = '<div class="av-modal"><button type="button">닫기</button></div>';
    P.doc.body.appendChild(fake);
    const S = P.S();
    S.ev = { id: "p_weak", sid: null, ch: null, at: { y: S.proYear, cb: 1, wk: 8 }, u: 0.5, title: "반대발 주간", body: "",
      opts: [{ k: "safe", label: "넘긴다", fx: {} }, { k: "try", label: "한 주 약발로만", fx: {}, win: { weak: 1 }, lose: { weak: -1 }, pct: 55,
        parts: [{ label: "기본", v: 50 }, { label: "약발", v: 5 }, { label: "컨디션", v: 0, usual: 70, now: 70 }] }] };
    P.w.WingerCareer.refreshPro();                 // 준비 화면 끝에서 draw() → eventOverlay()
    const layers = () => Array.from(P.doc.body.children).filter((x) => x.classList.contains("av-overlay")).length;
    const whileOther = { ev: !!P.doc.querySelector(".ev-overlay"), layers: layers() };
    fake.remove();
    await new Promise((r) => setTimeout(r, 30));   // MutationObserver 콜백
    const after = { ev: !!P.doc.querySelector(".ev-overlay"), layers: layers() };
    const e = P.errors.slice();
    P.close();
    return { whileOther, after, errors: e };
  }

  (async () => {
    console.log("=== 0. 변이 등록 ===");
    const miss = H.mutMisses(MUTS);
    check(miss.length === 0, `변이 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);

    const jobs = [
      { seed: 3101, pos: "fw" }, { seed: 3102, pos: "df" }, { seed: 3103, pos: "mf", until: 8 },
    ];
    if (!miss.length) jobs.push({ seed: 3104, pos: "wg", until: 3, mut: "R1" });
    const R = await H.runJobs(path.resolve(__filename), jobs, Number(process.env.W1_PAR) || 2);

    console.log("=== ① 빈도 · ② pre 자리 — 실제 버튼으로 시즌 끝까지 ===");
    const per = [], evs = [];
    let layers = 0; const errs = [];
    for (let i = 0; i < 3; i++) {
      const r = R[i];
      if (r.dead) { dead++; console.log(`💥 커리어 ${i} — ${r.dead.slice(0, 300)}`); continue; }
      const last = r.seasons;
      for (let y = 1; y <= last; y++) per.push(r.perSeason[y] || 0);
      evs.push(...r.evs.map((e) => Object.assign({ car: i }, e))); layers += r.layers; errs.push(...r.errors);
    }
    const mean = per.reduce((a, b) => a + b, 0) / Math.max(1, per.length);
    const max = Math.max(0, ...per);
    console.log(`   측정 조건: 확인용 세이브 soccer-callup에서 커리어 셋(공격수·수비수 은퇴까지 · 미드 8시즌) · 답은 정책 난수로 아무 칸 · 이적 30%`);
    console.log(`   시즌별 창 수: ${per.join(" ")} (시즌 ${per.length}개)`);
    check(per.length >= 30, `🔒 시즌을 충분히 굴렸다 (${per.length}시즌)`);
    check(mean >= MEAN[0] && mean <= MEAN[1], `시즌 평균 ${mean.toFixed(2)}건 — 합격 ${MEAN[0]}~${MEAN[1]}(실측 3.07)`);
    check(max <= MAX, `한 시즌 최대 ${max}건 ≤ ${MAX}`);
    const inTour = evs.filter((e) => e.at && e.at.y != null && (e.where.wc || e.where.cup || e.where.cupPrep || e.where.cupReady || e.where.screen !== "screen-pro"));
    check(inTour.length === 0, `컵·월드컵 중 · 경기 화면에서 뜬 창 0 (${inTour.length}${inTour.length ? ` — ${JSON.stringify(inTour[0].where)}` : ""})`);
    /* 🔥 특훈 — 이 판들은 프로 세이브에서 시작해서 유스 창을 안 만나요(🔒 「아무 일도 안 일어났다」를 통과로 안 세요).
     * 특훈 중 0은 **구조**예요 — camp.js는 maybeEvent·renderMain·WingerEvents를 안 불러요(유스 창은 renderMain 끝에서만 떠요).
     * 유스 창의 자리는 ev-neutral-test(새 선수 유스 36달)와 ev-pct-test(유스 네 칸)가 봐요 */
    const yEvs = evs.filter((e) => e.at && e.at.yr != null);
    if (yEvs.length) check(yEvs.every((e) => e.where.screen === "screen-main"), `유스 창은 유스 화면에서만 (유스 창 ${yEvs.length})`);
    else console.log("   🚧 유스 창 0 — 이 판들은 프로에서 시작해요. 특훈 중 0은 구조로(camp.js가 이벤트를 안 불러요)");
    const byBlock = {};
    for (const e of evs) if (e.at && e.at.y != null) { const k = `커리어${e.car} ${e.at.y}:${e.at.cb}:${e.at.wk}`; byBlock[k] = (byBlock[k] || 0) + 1; }
    const dup = Object.entries(byBlock).filter(([, n]) => n > 1);
    check(dup.length === 0, `블록 하나에 창 하나 이하 (블록 ${Object.keys(byBlock).length}개 · 겹친 블록 ${dup.length}${dup.length ? ` — ${dup[0][0]}` : ""})`);
    check(layers === 0 && evs.every((e) => e.where.layers <= 1), `레이어 둘이 겹친 순간 0 · 이벤트 창이 뜰 때 다른 레이어 0 (겹침 ${layers})`);
    const firstScreen = evs.filter((e) => e.at && e.at.y != null && !e.where.act);
    check(firstScreen.length === 0, `② 시즌 첫 화면(activity 없음)에서 뜬 창 0 (${firstScreen.length}) · pre 창 ${evs.filter((e) => e.at && e.at.cb === 1 && e.at.wk === 0).length}개는 전부 준비 3턴 뒤`);
    check(errs.length === 0, `페이지 안 예외 0${errs.length ? ` — ${errs[0].slice(0, 200)}` : ""}`);

    console.log("=== ③ 같은 블록 다시 그리기 · ④ 평소 컨디션 ===");
    const B = blockCase(null, 777);
    check(B.reroll === 0, `③ 같은 블록을 네 번 더 그려도 이벤트 난수·새 창·평소 변화 0 (어긋난 판 ${B.reroll}/120${B.rerolls.length ? ` — ${B.rerolls[0]}` : ""})`);
    check(B.upd.length === 0, `④ 블록마다 평소 += (지금 − 평소) ÷ 8 · 평소가 없으면 그 블록 컨디션에서 (어긋남 ${B.upd.length}${B.upd.length ? ` — ${B.upd[0]}` : ""})`);
    check(B.fresh.length >= 10 && B.part.length === 0, `④ 그 블록 조각의 「평소」는 갱신 **전** 값 (도전 창 ${B.fresh.length} · 어긋남 ${B.part.length}${B.part.length ? ` — ${B.part[0]}` : ""})`);
    check(B.wc === 50, `④ 월드컵 중에는 평소 컨디션이 안 움직인다 (50 → ${B.wc})`);
    check(B.err.length === 0, `③④ 페이지 안 예외 0${B.err.length ? ` — ${B.err[0].slice(0, 200)}` : ""}`);

    console.log("=== ⑤ 모달 한 번에 하나 — 다른 레이어가 닫히면 뜬다 ===");
    const F = await deferCase(null);
    check(!F.whileOther.ev && F.whileOther.layers === 1, `다른 레이어가 떠 있는 동안 이벤트 창 없음 (창 ${F.whileOther.ev} · 레이어 ${F.whileOther.layers})`);
    check(F.after.ev && F.after.layers === 1, `그 레이어가 닫히면 이벤트 창이 뜬다 (창 ${F.after.ev} · 레이어 ${F.after.layers})`);
    check(F.errors.length === 0, `⑤ 페이지 안 예외 0${F.errors.length ? ` — ${F.errors[0].slice(0, 200)}` : ""}`);

    console.log("=== 변이 검증 ===");
    if (miss.length) check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)");
    else {
      const m1 = await deferCase({ "scenes.js": MUTS.M1.muts });
      check(m1.whileOther.ev && m1.whileOther.layers >= 2, `M1 기다리기를 지우면 → ⑤ 빨간불 (다른 레이어 위에 창 ${m1.whileOther.ev} · 레이어 ${m1.whileOther.layers})`);
      const r1 = R[3];
      if (r1.dead) { dead++; console.log(`💥 R1 — ${r1.dead.slice(0, 300)}`); }
      else check(r1.evs.some((e) => e.at && e.at.y != null && !e.where.act), `R1 시즌 첫 화면도 pre로 → ② 빨간불 (첫 화면 창 ${r1.evs.filter((e) => e.at && e.at.y != null && !e.where.act).length})`);
      const r2 = blockCase({ "events.js": MUTS.R2.muts }, 777);
      check(r2.reroll > 0, `R2 evSlot 거르기를 지우면 → ③ 빨간불 (어긋난 판 ${r2.reroll})`);
      const u1 = blockCase({ "events.js": MUTS.U1.muts }, 777);
      check(u1.part.length > 0, `U1 조각을 갱신 뒤 평소로 재면 → ④ 빨간불 (어긋남 ${u1.part.length}/${u1.fresh.length})`);
    }
    console.log(dead ? `\n💥 죽은 판 ${dead}개` : bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
    process.exit(dead ? 2 : bad ? 1 : 0);
  })().catch(H.die);
}
