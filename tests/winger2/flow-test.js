/* ⚽ 더 윙어 II 1막 — 🚶 **흐름** — 입구부터 도감까지 **진짜 화면을 눌러** 완주 (25번 §1 · 12번 §5-5 · 26번 §2)
 *
 * 진짜 `index.html`(스크립트 순서 그대로) · 진짜 오버레이(`scenes.js`) · 진짜 경기 화면(`match-scene.js`) · 진짜 판(`winger-moment.js`) —
 * 갈아 끼우는 것 없이 **사람이 누를 버튼만** 눌러요(눌러 보내는 이벤트는 실기기 순서 pointerdown → pointerup → click).
 *   F-1  👥 카드 여섯 — **지호 남 · 여만 열림** · 도윤 · 하람(넷)은 잠김(「다음 업데이트」) · 잠긴 카드를 눌러도 안 넘어감
 *   F-2  🏁 입구 → 카드 → 만들기 → 🎬 도입 → 36주 → 🎯 테스트 → 📋 평가서 → (✉️ 문) → 🎓 엔딩 → 🎬 필름 → 입구 → 📖 도감을 **완주**
 *   F-2b ✉️ 문 — 「중」 구간에 깃발을 세운 판에서 진짜 봉투 화면(고르기 → [이 길로 간다])을 눌러 문 엔딩으로
 *        — 세이브에 졸업(`act1` · `hofDone`) · 필름이 저장됨 · 명전 한 줄 · 도감 다섯 칸 · 본 엔딩이 도감에 「본 것」으로
 *   F-3  🔢 **필수 입력 수를 셉니다** — 누른 것 전부(사람이 안 누르면 안 넘어가는 것만 누름) · 설계 어림(12번 §5-5 「약 150~200」)과 나란히 보고
 *   + 변이: 도윤 카드가 열림(F-1) · 필름 [닫기]가 안 닫힘(F-2 — 멈춤)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 3분
 */
"use strict";
const { pageMutsOK, wait } = require("./_load.js");
const { boot, runAct, tap } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const DESIGN = [150, 200];          // 12번 §5-5 어림(제안 — 실측 전) — 판정이 아니라 나란히 적는 값
const MUT = {
  UNLOCK: { "game.js": [[/doyun: \{ name: \{ m: "도윤", f: "도연" \}, line: "차분하고 계산적 — 숫자로 생각하는 선수예요", open: false \},/,
    'doyun: { name: { m: "도윤", f: "도연" }, line: "차분하고 계산적 — 숫자로 생각하는 선수예요", open: true },']] },
  FILMSTUCK: { "scenes.js": [[/closeB\.addEventListener\("click", \(\) => finish\("close"\)\);/, ""]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}

async function flow(muts, stall, opt) {
  const env = boot(Object.assign({ seed: 909, pos: "wg", gender: "f", realScenes: true, realMoment: true, muts }, opt || {}));
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
    out.hof = JSON.parse(w.localStorage.getItem("grow-hof-v1") || "[]").filter((x) => x && x.id === S.id).length;
  }
  w.close();
  return out;
}

(async () => {
  const f = await flow(null);
  /* F-1 */
  const open = f.pick.filter((p) => !p.locked).map((p) => `${p.name}${/w-f/.test(p.world) ? "(여)" : "(남)"}`);
  const locked = f.pick.filter((p) => p.locked).length;
  check(f.pick.length === 6 && open.length === 2 && open.every((x) => /^지호/.test(x)) && locked === 4 && /다음 업데이트/.test(f.lockToast) && f.lockStill,
    `F-1. 👥 카드 ${f.pick.length}장 — 열린 카드 ${open.join(" · ")} · 잠긴 카드 ${locked}장 · 잠긴 카드를 누르면 「${f.lockToast}」 그대로 머묾`);
  /* F-2 */
  const S = f.S || {};
  check(f.r.done && S.hofDone === true && !!S.act1 && S.week === 36 && !!S.test && !!S.sheet && !!S.ending && f.film && f.hof === 1 && f.tabs === 5 && f.endSeen >= 1 && f.bookClosed,
    `F-2. 🏁 진짜 화면으로 완주 — 36주 · 테스트(기술 ${S.test ? S.test.tech : "?"}/6) · 평가서 「${S.sheet ? S.sheet.tierName || S.sheet.tier : "?"}」 · 엔딩 ${S.ending ? S.ending.id : "?"} · 필름 저장 ${f.film ? "됨" : "안 됨"} · 명전 ${f.hof}줄 · 도감 ${f.tabs}칸 · 본 엔딩 ${f.endSeen}개 · 도감 닫힘 ${f.bookClosed ? "✓" : "✗"}`
    + (f.r.done ? "" : `\n     🔴 멈춤: ${f.r.stuck}`));
  /* F-2b — ✉️ 문까지 — 「중」 구간에 깃발을 세운 판(🤖 자동 · 시드 901 · 윙어 · 여)에서 진짜 봉투 화면을 눌러 문 엔딩으로 */
  {
    const d = await flow(null, 3000, { seed: 901, pos: "wg", gender: "f", auto: true });
    const Sd = d.S || {};
    const doorClicks = (d.clicks["문 고르기"] || 0) + (d.clicks["문 확정"] || 0);
    check(d.r.done && doorClicks === 2 && Sd.ending && Sd.ending.door === true && Sd.ending.id === "semi" && Sd.sheet && Sd.sheet.tier === "mid",
      `F-2b. ✉️ 문 — 평가서 「${Sd.sheet ? Sd.sheet.tierName || Sd.sheet.tier : "?"}」 · 깃발을 세운 판에서 진짜 봉투 화면을 골라 누르고 [이 길로 간다](${doorClicks}번) → 문 엔딩 ${Sd.ending ? Sd.ending.id : "?"}${Sd.ending && Sd.ending.door ? "(문)" : ""}`
      + (d.r.done ? "" : `\n     🔴 멈춤: ${d.r.stuck}`));
  }
  /* F-3 */
  const total = Object.values(f.clicks).reduce((a, b) => a + b, 0);
  const rows = Object.entries(f.clicks).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ");
  check(f.r.done && total > 0, `F-3. 🔢 필수 입력 **${total}번** (설계 어림 ${DESIGN[0]}~${DESIGN[1]} · ${total < DESIGN[0] ? "어림보다 적음" : total > DESIGN[1] ? "어림보다 많음" : "어림 안"})\n     ${rows}`);
  /* 🧪 변이 */
  if (fail === 0) {
    const m1 = await flow(MUT.UNLOCK, 600);
    const open1 = m1.pick.filter((p) => !p.locked).length;
    check(open1 !== 2, `변이-UNLOCK(도윤 카드가 열림) → F-1이 빨간불 (열린 카드 ${open1}장)`);
    const m2 = await flow(MUT.FILMSTUCK, 600);
    check(!m2.r.done, `변이-FILMSTUCK(필름 [닫기]가 안 닫힘) → F-2가 빨간불 (${m2.r.stuck || "완주함"})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
