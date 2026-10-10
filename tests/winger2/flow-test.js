/* ⚽ 더 윙어 II 1막 — 🚶 **흐름** — 입구부터 도감까지 **진짜 화면을 눌러** 완주 (25번 §1 · 12번 §5-5 · 26번 §2)
 *
 * 진짜 `index.html`(스크립트 순서 그대로) · 진짜 오버레이(`scenes.js`) · 진짜 경기 화면(`match-scene.js`) · 진짜 판(`winger-moment.js`) —
 * 갈아 끼우는 것 없이 **사람이 누를 버튼만** 눌러요(눌러 보내는 이벤트는 실기기 순서 pointerdown → pointerup → click).
 *   F-1  👥 카드 여섯 — v2: **여섯 다 열림 · 외형만**(38번 §1 · 15-a — 첫 묶음은 지호 남 · 여만 열렸음) · 카드가 돌려주는 것은 `{ preset, gender }`
 *   F-1b ✏️ 만들기 — 진짜 만들기 화면에서 능력치 · 「합 288」 · 장기 한 줄 · 다시 뽑기 (3)을 보고 포지션 · 주발 · 번호를 고름 · 도입 한마디 셋에서 하나
 *   F-2  🏁 입구 → 카드 → 만들기 → 🎬 도입 → 36주 → 🎯 테스트 → 📋 평가서 → (✉️ 문) → 🎓 엔딩 → 🎬 필름 → 입구 → 📖 도감을 **완주**
 *   F-2b ✉️ 문 — 따라간 가족 이야기의 문 구간(v4: 🏭 아버지 · 「중」)에 닿은 판에서 진짜 봉투 화면(고르기 → [이 길로 간다])을 눌러 문 엔딩으로
 *        — 세이브에 졸업(`act1` · `hofDone`) · 필름이 저장됨 · 졸업 줄(`winger2-grads`) 한 줄 · 도감 다섯 칸 · 본 엔딩이 도감에 「본 것」으로
 *   F-3  🔢 **필수 입력 수를 셉니다** — 누른 것 전부(사람이 안 누르면 안 넘어가는 것만 누름) · 설계 어림(12번 §5-5 「약 150~200」) · 첫 묶음 **196번**과 나란히 보고
 *   + 변이: 도윤 · 하람 카드가 잠김(F-1) · 필름 [닫기]가 안 닫힘(F-2 — 멈춤)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 3분
 */
"use strict";
const { pageMutsOK, wait } = require("./_load.js");
const { boot, runAct, tap } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const DESIGN = [150, 200];          // 12번 §5-5 어림(제안 — 실측 전) — 판정이 아니라 나란히 적는 값
const MUT = {
  RELOCK: { "game.js": [[/name: PRESETS\[p\]\.name\[g\], locked: false \}\);/, 'name: PRESETS[p].name[g], locked: p !== "jiho", lockText: "다음 업데이트에서 만나요" });']] },
  FILMSTUCK: { "scenes.js": [[/closeB\.addEventListener\("click", \(\) => finish\("close"\)\);/, ""]] },
  /* 🔄 v2 — 얼린 act1에서 문 이유가 빠짐 */
  NODOORWHY: { "sheet.js": [[/doorWhy: S\.ending\.door && fam \?/, "doorWhy: false && fam ?"]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}

async function flow(muts, stall, opt) {
  /* ⏱️ "keep-long" — 🧱 판의 4초 제한은 그대로(뭉개면 판이 열리자마자 시간 초과) · 나머지 기다림은 0 */
  const env = boot(Object.assign({ seed: 909, pos: "wg", gender: "f", realScenes: true, realMoment: true, muts, fastTimers: "keep-long", voice: 1,
    /* 🔄 v3 — 44번 새 T(66.4 · 59.4 · 52.8)에서 시드 909는 「상」(59.5) → 🎓 엄마 문(「상」)으로 옮겼음.
     * 🔄 v4 — 47번 새 T(67.4 · 60.3 · 53.7) · 보통 손이 「넘긴다」 대신 🌿 확정을 고름 → 같은 판이 「중」(59.8)에 닿아 엄마 문이 안 열림(엔딩 trainee · 규칙대로).
     *    가족 이야기는 점수에 0이라(엄마 · 아버지 판 모두 59.8 — 검사가 잼) 문 구간이 「중」인 🏭 아버지로 되돌림. 59.8은 T2 60.3 아래 0.5 */
    policy: { people: { 2: "family:father", 3: "keeper", 32: "family:father" } } }, opt || {}));
  const r = await runAct(env, { stall: stall || 3000 });
  const S = r.S, w = env.w, D = w.document;
  const out = { r, S, pick: env.pickSeen || [], lockToast: env.lockToast || "", lockStill: !!env.lockStill, clicks: Object.assign({}, r.clicks) };
  if (r.done) {
    for (let i = 0; i < 300 && !D.querySelector("#w2-entry .w2-book"); i++) await wait(5);
    const bk = D.querySelector("#w2-entry .w2-book");
    if (bk) {
      tap(w, bk); out.clicks["도감 열기"] = 1;
      for (let i = 0; i < 300 && !D.querySelector(".w2o-book"); i++) await wait(5);
      const b = D.querySelector(".w2o-book");
      out.tabs = b ? b.querySelectorAll("[role=tab]").length : 0;
      const endTab = b && b.querySelector('[role=tab][data-k="end"]');
      if (endTab) { tap(w, endTab); await wait(5); out.endSeen = b.querySelectorAll(".w2b-pane li.is-seen").length; out.endText = (b.querySelector(".w2b-pane") || {}).textContent || ""; }
      const close = b && b.querySelector(".w2o-ok");
      if (close) { tap(w, close); out.clicks["도감 닫기"] = 1; }
      await wait(5);
      out.bookClosed = !D.querySelector(".w2o-book");
    }
    out.film = !!(w.W2Film && S && w.W2Film.get(S.id));
    out.hof = JSON.parse(w.localStorage.getItem("winger2-grads") || "[]").filter((x) => x && x.id === S.id).length;
    out.hof8 = JSON.parse(w.localStorage.getItem("grow-hof-v1") || "[]").filter((x) => x && x.id === S.id).length;
    out.create = env.seen.create || null;
  }
  w.close();
  return out;
}

(async () => {
  const f = await flow(null);
  /* F-1 */
  const open = f.pick.filter((p) => !p.locked).map((p) => `${p.name}${/w-f/.test(p.world) ? "(여)" : "(남)"}`);
  const locked = f.pick.filter((p) => p.locked).length;
  check(f.pick.length === 6 && open.length === 6 && locked === 0,
    `F-1. 👥 카드 ${f.pick.length}장 — 열린 카드 ${open.join(" · ")} · 잠긴 카드 ${locked}장(v2 · 여섯 다 열림)`);
  const cr = f.create || {};
  const cv = Object.values(cr.stats || {});
  check(cv.length === 6 && cv.reduce((a, b) => a + b, 0) === 288 && /합 288/.test(cr.sum || "") && /장기/.test(cr.best || "") && /다시 뽑기 \(3\)/.test(cr.reroll || "") && (f.clicks["도입 한마디"] || 0) === 1,
    `F-1b. ✏️ 진짜 만들기 화면 — 능력치 ${cv.join(" · ")}(합 ${cv.reduce((a, b) => a + b, 0)}) · 「${cr.sum}」 · 「${cr.best}」 · 「${cr.reroll}」 · 도입 한마디 ${f.clicks["도입 한마디"] || 0}번`);
  /* F-2 */
  const S = f.S || {};
  check(f.r.done && S.hofDone === true && !!S.act1 && S.week === 36 && !!S.test && !!S.sheet && !!S.ending && f.film && f.hof === 1 && f.hof8 === 0 && f.tabs === 5 && f.endSeen >= 1 && f.bookClosed,
    `F-2. 🏁 진짜 화면으로 완주 — 36주 · 테스트(기술 ${S.test ? S.test.tech : "?"}/6) · 평가서 「${S.sheet ? S.sheet.tierName || S.sheet.tier : "?"}」 · 엔딩 ${S.ending ? S.ending.id : "?"} · 필름 저장 ${f.film ? "됨" : "안 됨"} · 졸업 줄 ${f.hof}줄(8종 명전 ${f.hof8}줄) · 도감 ${f.tabs}칸 · 본 엔딩 ${f.endSeen}개 · 도감 닫힘 ${f.bookClosed ? "✓" : "✗"}`
    + (f.r.done ? "" : `\n     🔴 멈춤: ${f.r.stuck}`));
  /* F-2b — ✉️ 문까지 — 같은 완주 판(시드 909 · 2주 🤝 아버지 이야기 · 32주 깃발)이 문 구간(「중」)에 닿아 진짜 봉투 화면을 지남
   *    (v2: 문은 외형이 아니라 따라간 가족 이야기에 붙음 — 29번 §3-2 P1 (가). v3 엄마(「상」) → v4 아버지(「중」) — 위 `flow` 주석) */
  {
    const doorClicks = (f.clicks["문 고르기"] || 0) + (f.clicks["문 확정"] || 0);
    check(f.r.done && doorClicks === 2 && S.ending && S.ending.door === true && S.ending.id === "semi" && S.sheet && S.sheet.tier === "mid"
      && (S.story.done || []).some((d) => d.sid === "father")
      /* 얼린 `act1`의 문 이유(29번 §5 · 38번 계약 4′): 가족 dad · 뿌리 shop · doorWhy.story = father */
      && !!S.act1 && S.act1.family === "dad" && S.act1.origin === "shop" && !!S.act1.doorWhy && S.act1.doorWhy.story === "father",
      `F-2b. ✉️ 문 — 🏭 아버지 이야기를 따라간 판이 평가서 「${S.sheet ? S.sheet.tierName || S.sheet.tier : "?"}」(${S.sheet ? S.sheet.total : "?"}) · 진짜 봉투 화면을 골라 누르고 [이 길로 간다](${doorClicks}번) → 문 엔딩 ${S.ending ? S.ending.id : "?"}${S.ending && S.ending.door ? "(문)" : ""} · act1 문 이유 ${S.act1 && S.act1.doorWhy ? JSON.stringify(S.act1.doorWhy) : "없음 🔴"}`);
  }
  /* F-3 */
  const total = Object.values(f.clicks).reduce((a, b) => a + b, 0);
  const rows = Object.entries(f.clicks).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ");
  check(f.r.done && total > 0, `F-3. 🔢 필수 입력 **${total}번** (설계 어림 ${DESIGN[0]}~${DESIGN[1]} · ${total < DESIGN[0] ? "어림보다 적음" : total > DESIGN[1] ? "어림보다 많음" : "어림 안"} · 첫 묶음 196번 대비 ${total - 196 >= 0 ? "+" : ""}${total - 196})\n     ${rows}`);
  /* 🧪 변이 */
  if (fail === 0) {
    const m1 = await flow(MUT.RELOCK, 600);
    const open1 = m1.pick.filter((p) => !p.locked).length;
    check(open1 !== 6, `변이-RELOCK(도윤 · 하람 카드를 다시 잠금) → F-1이 빨간불 (열린 카드 ${open1}장)`);
    const m2 = await flow(MUT.FILMSTUCK, 600);
    check(!m2.r.done, `변이-FILMSTUCK(필름 [닫기]가 안 닫힘) → F-2가 빨간불 (${m2.r.stuck || "완주함"})`);
    const m3 = await flow(MUT.NODOORWHY, 600);
    const S3 = m3.S || {};
    check(!(S3.act1 && S3.act1.doorWhy), `변이-NODOORWHY(act1 문 이유가 빠짐) → F-2b가 빨간불 (문 이유 ${S3.act1 ? JSON.stringify(S3.act1.doorWhy) : "act1 없음"})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
