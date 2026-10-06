/* ⚽ 더 윙어 II 1막 v3 — 🤖 **자동 판 표시 · 🫀 관리 줄 · 옛 세이브** (44번 §1 · 계약 3′ · 7′ · 17 · 세이브 줄 · 30번 v3 「skill → care」)
 *
 * 🪦 옛 뜻(v2): 🎮 솜씨 칸 글에 🤖 판 수를 적음(「🧱 막기 판 N번(🤖 k) · 읽기 ±ρ̂ · 포지션 보정 ×k」) · 필름 = 「🎮 」 + 그 글.
 *    사라진 까닭: 44번 §1 · J9 · J10 — 판 셋이 모두 감이라 손의 몫이 0 · 솜씨 칸 퇴역 → 평가서가 🤖를 셀 까닭이 없음.
 * 🔄 남는 뜻 · 새 검사:
 *   AM-1  🤖 표시가 판 기록에 맞게 남음 — 세 갈래(🤖 내내 · 17주부터 🤖 · 손 내내): 판의 `auto` = 그 경기를 시작할 때의 🤖 설정 ·
 *         🔬 `boardStats` 판 수 = 사람이 실제로 둔 판(🤖 0) — 베타 측정이 사람 판만 모으는 근거(43번 §4 #8)
 *   AM-2  필름 「몸의 기록」 관리 줄 == 「🫀 」 + 평가서 관리 칸 글(한 곳에서 나옴) — 세 갈래 · 진짜 `scenes.js`가 그 글을 그림
 *   AM-3  옛 v2 세이브(`cSum` · `cN` 없음 · 얼린 중간 평가서 · 평가서에 `skill` 칸) — 18주에서 이어 하면:
 *         `loadSave()`가 `cSum` · `cN` 0으로 읽음 · 관리 칸은 **이어 한 뒤의 공식 경기만**으로 0에서 차오름 · 얼린 17주 평가서(`skill` 칸)는 그대로 ·
 *         다 끝난 옛 판(평가서 `skill`)의 필름은 「🎮 」 + 그 글(안 깨짐)
 *   + 변이: live.js가 🤖 표시를 안 담 · 필름이 따로 적음 · 옛 세이브의 앞 경기를 지어내 셈 · 필름이 옛 `skill` 칸을 못 읽음
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 3분
 */
"use strict";
const { pageMutsOK, bootPage, wait } = require("./_load.js");
const { boot, runAct, lsDump } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const MUT = {
  LIVE_UNMARK: { "live.js": [[/return \{ kind, s: v, sBoard: 0\.5, judge: m\.judgeFor\(v\), auto: true,/, "return { kind, s: v, sBoard: 0.5, judge: m.judgeFor(v), auto: false,"]] },
  FILM_OWN: { "film.js": [[/sk \? `\$\{sk\.k === "care" \? "🫀" : "🎮"\} \$\{sk\.note\}` : "🫀 평가서 전이에요"\]/, 'sk ? `🫀 경기 날 컨디션 ${skd.avg}` : "🫀 평가서 전이에요"]']] },
  RECOUNT: { "game.js": [[/s\.record = Object\.assign\(blankRecord\(\), s\.record \|\| \{\}\);/, "s.record = Object.assign(blankRecord(), s.record || {}); if (!s.record.cN) { s.record.cN = s.record.apps; s.record.cSum = 50 * s.record.apps; }"]] },
  FILM_SKILLBLIND: { "film.js": [[/c\.k === "care" \|\| c\.k === "skill"/, 'c.k === "care"']] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const pol = (autoFrom) => ({ home: (S, env) => {
  if (autoFrom != null && S.week >= autoFrom) env.w.localStorage.setItem("grow-auto-mini", "1");
  return S.cond < 50 ? { k: "rest" } : { k: "train", stat: K6[S.week % 6] };
} });
async function one(seed, mode, muts) {
  const env = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], realScene: false, muts, auto: mode === "auto",
    operator: "normal", policy: pol(mode === "mixed" ? 17 : null) });
  const r = await runAct(env);
  const S = r.S;
  const human = env.seen.boards.filter((b) => b.slot).length;               // 판 스텁까지 온 판 = 사람이 둔 판
  const liveAuto = env.seen.live.flatMap((m) => m.info.boards.map((b) => [m.week, !!b.auto]));
  const st = env.w.W2Game.boardStats();
  const film = env.w.W2Film.build(S);
  const care = S.sheet.cols.find((c) => c.k === "care");
  const out = { S, done: r.done, human, liveAuto, statN: st.block.n + st.shot.n + st.cut.n, careNote: care && care.note,
    film: (film.ch.find((c) => c.k === "body") || { lines: [] }).lines[1] };
  env.w.close();
  return out;
}
async function cases(muts) { return { auto: await one(301, "auto", muts), mixed: await one(302, "mixed", muts), human: await one(303, "human", muts) }; }
const am1 = (R) => {
  const bad = [];
  for (const [name, x] of Object.entries(R)) {
    if (!x.done) { bad.push(`${name}: 졸업까지 못 감`); continue; }
    const wrong = x.liveAuto.filter(([w, a]) => a !== (name === "auto" || (name === "mixed" && w >= 17)));
    if (wrong.length) bad.push(`${name}: 판 🤖 표시가 설정과 어긋난 판 ${wrong.length}`);
    if (x.statN !== x.human) bad.push(`${name}: boardStats ${x.statN} ≠ 사람이 둔 판 ${x.human}`);
  }
  if (!(R.auto.statN === 0 && R.human.statN > 0 && R.mixed.statN > 0 && R.mixed.statN < R.human.statN + 40)) bad.push(`갈래 크기 — 🤖 ${R.auto.statN} · 섞임 ${R.mixed.statN} · 손 ${R.human.statN}`);
  return bad;
};
const am2 = (R) => Object.entries(R).filter(([, x]) => !x.careNote || x.film !== `🫀 ${x.careNote}`).map(([n, x]) => `${n}: 필름 「${x.film}」 ≠ 「🫀 ${x.careNote}」`);

/* AM-3 — 옛 v2 세이브를 18주에서 이어 하기 */
async function am3(muts) {
  const A = boot({ seed: 404, pos: "wg", realScene: false, operator: "normal" });
  await runAct(A, { until: (S) => S.week >= 18 && S.ph === 0, stall: 400 });
  const keys = lsDump(A.w);
  A.w.close();
  const sv = JSON.parse(keys["winger2-save-v2"]);
  const appsBefore = sv.record.apps;
  delete sv.record.cSum; delete sv.record.cN;
  /* v2가 얼린 17주 평가서 — 관리 칸 자리에 옛 🎮 솜씨 칸(그 시점의 사실) */
  const OLDNOTE = "🧱 막기 판 6번(🤖 1) · 읽기 +0.04 · 포지션 보정 ×1.24 · 8번까지는 모자란 판을 🤖로 채워 셈";
  for (const m of sv.mid || []) for (const c of m.cols) if (c.k === "care") Object.assign(c, { k: "skill", label: "🎮 솜씨", v: 4.6, note: OLDNOTE, detail: { n: 6, auto: 1 } });
  keys["winger2-save-v2"] = JSON.stringify(sv);
  const B = boot({ seed: 404, pos: "wg", realScene: false, operator: "normal", keys, muts });
  const loaded = B.w.W2Game.loadSave();
  const rb = await runAct(B, { entry: "continue" });
  const S = rb.S;
  const offAfter = B.seen.live.filter((m) => m.week !== 35);
  const avg = offAfter.reduce((a, m) => a + m.cfg.condition, 0) / offAfter.length;
  const care = S.sheet.cols.find((c) => c.k === "care");
  const m17 = (S.mid || []).find((m) => m.week === 17);
  const kept = !!m17 && m17.cols.some((c) => c.k === "skill" && c.note === OLDNOTE) && !m17.cols.some((c) => c.k === "care");
  /* 다 끝난 옛 판 — 평가서 칸이 `skill`이면 필름이 그 글을 「🎮 」로 */
  const oldEnd = JSON.parse(JSON.stringify(S));
  for (const c of oldEnd.sheet.cols) if (c.k === "care") Object.assign(c, { k: "skill", label: "🎮 솜씨", note: OLDNOTE });
  let oldFilm = null;
  try { oldFilm = B.w.W2Film.build(oldEnd).ch.find((c) => c.k === "body").lines[1]; } catch (e) { oldFilm = `💥 ${e.message}`; }
  B.w.close();
  return { m17, done: rb.done, loaded0: !!loaded && loaded.record.cN === 0 && loaded.record.cSum === 0, appsBefore, offAfter: offAfter.length, games: care.detail.games,
    v: care.v, want: 10 * Math.min(1, Math.max(0, (avg - 20) / 50)), kept, oldFilm, OLDNOTE };
}

(async () => {
  const R = await cases(null);
  const b1 = am1(R);
  check(b1.length === 0, `AM-1. 🤖 세 갈래 — 판의 \`auto\` = 그 경기를 시작할 때의 🤖 설정 · 🔬 boardStats 판 수 = 사람이 둔 판(🤖 ${R.auto.statN} · 섞임 ${R.mixed.statN}/${R.mixed.human} · 손 ${R.human.statN}/${R.human.human})`
    + (b1.length ? `\n     🔴 ${b1.join(" · ")}` : ""));
  const b2 = am2(R);
  check(b2.length === 0, `AM-2. 🎬 필름 관리 줄 == 「🫀 」 + 평가서 관리 칸 글 — 세 갈래(「${R.human.careNote}」)` + (b2.length ? `\n     🔴 ${b2.join(" · ")}` : ""));
  {
    const W = bootPage({ fastTimers: true });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const layer = W.document.getElementById("w2-layer");
    const drawn = [];
    for (const x of [R.mixed, R.auto]) {
      const p1 = W.W2Scenes.sheet(Object.assign({ title: "📋 스카우트 평가서" }, x.S.sheet));
      await wait(2);
      drawn.push(layer.textContent.indexOf(x.careNote) >= 0);
      const ok = layer.querySelector(".w2o-ok"); if (ok) ok.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
      await p1;
      const p2 = W.W2Scenes.film(W.W2Film.build(x.S));
      await wait(2);
      drawn.push(layer.textContent.indexOf(x.film) >= 0);
      const close = [...layer.querySelectorAll(".w2f-acts button")].find((b) => b.textContent.indexOf("닫기") >= 0);
      if (close) close.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
      await p2;
    }
    W.close();
    check(drawn.every(Boolean), `AM-2b. 🖼️ 진짜 \`scenes.js\`가 그 글을 그대로 그림 — 평가서 관리 칸 · 필름 관리 줄 ${drawn.filter(Boolean).length}/4`);
  }
  const a3 = await am3(null);
  check(a3.done && a3.loaded0 && a3.games === a3.offAfter && a3.appsBefore > 0 && Math.abs(a3.v - a3.want) < 0.1 && a3.kept && a3.oldFilm === `🎮 ${a3.OLDNOTE}`,
    `AM-3. 🗃️ 옛 v2 세이브(18주 · 앞 공식 경기 ${a3.appsBefore}번 · cSum · cN 없음) — loadSave 0 · 0(${a3.loaded0}) · 관리 칸이 이어 한 뒤 공식 경기 ${a3.offAfter}번만 셈(칸 ${a3.games}번 · ${a3.v} ≈ ${a3.want.toFixed(2)}) · 얼린 17주 평가서의 🎮 칸 그대로(${a3.kept}) · 옛 평가서 필름 「${String(a3.oldFilm).slice(0, 30)}…」`);
  /* AM-3b — 진짜 scenes.js가 얼린 옛 평가서(🎮 솜씨 칸)를 그대로 그림(깨짐 · undefined · NaN 0) */
  {
    const W = bootPage({ fastTimers: true });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const layer = W.document.getElementById("w2-layer");
    const p = W.W2Scenes.sheet(Object.assign({ title: "📋 중간 평가서" }, a3.m17));
    await wait(2);
    const txt = layer.textContent;
    const ok = txt.indexOf(a3.OLDNOTE) >= 0 && txt.indexOf("🎮") >= 0 && !/undefined|NaN/.test(txt);
    const b = layer.querySelector(".w2o-ok"); if (b) b.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
    await p;
    W.close();
    check(ok, `AM-3b. 🖼️ 진짜 \`scenes.js\`가 얼린 옛 17주 평가서(🎮 솜씨 칸)를 그대로 그림 — 옛 글 · 🎮 있음 · undefined/NaN 0`);
  }
  if (fail === 0) {
    check(am1(await cases(MUT.LIVE_UNMARK)).length > 0, "변이-LIVE_UNMARK(live.js가 🤖 표시를 안 담) → AM-1이 빨간불");
    check(am2(await cases(MUT.FILM_OWN)).length > 0, "변이-FILM_OWN(필름이 평가서 글을 안 쓰고 따로 적음) → AM-2가 빨간불");
    const m3 = await am3(MUT.RECOUNT);
    check(m3.games !== m3.offAfter, `변이-RECOUNT(옛 세이브의 앞 경기를 지어내 셈) → AM-3이 빨간불 (칸 ${m3.games}번 ≠ ${m3.offAfter})`);
    const m4 = await am3(MUT.FILM_SKILLBLIND);
    check(m4.oldFilm !== `🎮 ${m4.OLDNOTE}`, `변이-FILM_SKILLBLIND(필름이 옛 \`skill\` 칸을 못 읽음) → AM-3이 빨간불 (「${String(m4.oldFilm).slice(0, 24)}」)`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
