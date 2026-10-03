/* ⚽ 더 윙어 II 1막 — 🤖 **자동 판 표시** (25번 §8 「검증(40번) 뒤 확정한 것」 ② · 30번 §H 10-03 · 23번 §8)
 *
 * 결정: 🤖 자동 판의 솜씨 메모에 **자동이었다는 사실**을 적는다(점수 4.0 · 산식 그대로). 평가서 메모와 필름 「몸의 기록」 판 줄이 **같은 규칙**.
 *   규칙(박은 글 — 소스에서 안 읽음)
 *     판 0번      평가서 「아직 둔 판이 없어요 — 평균 0.50으로 셈해요」 · 필름 「판 0번 — 둔 판이 없어요」
 *     모두 자동   「판 N번 · 모두 🤖 자동 · 평균 X」          (필름은 「평균 s̄ X」)
 *     섞임        「판 N번(🤖 k) · 평균 X」
 *     사람만      「판 N번 · 평균 X」
 *     옛 세이브(`sAuto` 없음)는 **사람만**으로 읽음
 *   AM-1  진짜 판 세 갈래 — 🤖 내내(모두) · 17주부터 🤖(섞임) · 사람 손 내내(사람만): **🤖 수 k = 판 수 − 사람이 실제로 둔 판**(판 스텁이 센 수)
 *         · 승부차기 내 킥도 같은 셈(🤖 판에서 승부차기가 난 판을 훑어 찾음)
 *   AM-2  평가서 메모와 필름 판 줄이 **같은 규칙** — 다섯 경우(세 갈래 + 판 0번 + 옛 세이브)에서 둘 다 위 글과 글자 그대로 · 진짜 `scenes.js`가 그 줄을 그림
 *   AM-3  옛 세이브 — `sAuto`를 지운 세이브는 평가서 · 필름 모두 사람만 글 · `loadSave()`가 `sAuto` 0으로 읽음
 *   + 변이(파일 안): 메모가 🤖을 모름 · 필름만 (🤖 k)를 뺌 · 모든 판을 🤖으로 셈 · live.js가 🤖 표시를 안 담 · 옛 세이브를 모두 🤖으로 읽음 · 승부차기 🤖을 안 셈
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 1분
 */
"use strict";
const { pageMutsOK, bootPage, wait } = require("./_load.js");
const { boot, runAct, lsDump } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const MUT = {
  SHEET_BLIND: { "sheet.js": [[/const sAuto = Math\.min\(sN, Math\.max\(0, Math\.floor\(Number\(rec\.sAuto\)\) \|\| 0\)\);/, "const sAuto = 0;"]] },
  FILM_MIX: { "film.js": [[/: `판 \$\{sN\}번\$\{sAuto > 0 \? `\(🤖 \$\{sAuto\}\)` : ""\} · 평균 s̄ \$\{avg\.toFixed\(2\)\}`\] \},/, ": `판 ${sN}번 · 평균 s̄ ${avg.toFixed(2)}`] },"]] },
  COUNT_ALL: { "game.js": [[/R\.sN \+= 1; if \(b\.auto\) R\.sAuto \+= 1; \}/, "R.sN += 1; R.sAuto += 1; }"]] },
  LIVE_UNMARK: { "live.js": [[/boards\.push\(\{ kind, s: 0\.5, judge: j, auto: true \}\);/, "boards.push({ kind, s: 0.5, judge: j, auto: false });"]] },
  OLD_AS_AUTO: { "sheet.js": [[/const sAuto = Math\.min\(sN, Math\.max\(0, Math\.floor\(Number\(rec\.sAuto\)\) \|\| 0\)\);/, "const sAuto = Math.min(sN, Math.max(0, rec.sAuto == null ? sN : Math.floor(Number(rec.sAuto)) || 0));"]],
    "film.js": [[/const sAuto = Math\.min\(sN, Math\.max\(0, Math\.floor\(Number\(rec\.sAuto\)\) \|\| 0\)\);/, "const sAuto = Math.min(sN, Math.max(0, rec.sAuto == null ? sN : Math.floor(Number(rec.sAuto)) || 0));"]] },
  PK_UNCOUNTED: { "game.js": [[/R\.sN \+= 1; if \(got\.auto\) R\.sAuto \+= 1;/, "R.sN += 1;"]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
/* 🔒 규칙 — 결정의 글 그대로 */
const want = (n, k, avg) => {
  if (n === 0) return { sheet: "아직 둔 판이 없어요 — 평균 0.50으로 셈해요", film: "판 0번 — 둔 판이 없어요" };
  const a = avg.toFixed(2);
  if (k >= n) return { sheet: `판 ${n}번 · 모두 🤖 자동 · 평균 ${a}`, film: `판 ${n}번 · 모두 🤖 자동 · 평균 s̄ ${a}` };
  return { sheet: `판 ${n}번${k > 0 ? `(🤖 ${k})` : ""} · 평균 ${a}`, film: `판 ${n}번${k > 0 ? `(🤖 ${k})` : ""} · 평균 s̄ ${a}` };
};
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
/* 세이브만 보고 고르는 손 · `autoFrom`주부터 🤖을 켬(기기 설정 `grow-auto-mini` — 경기마다 읽어요) */
const pol = (autoFrom) => ({ home: (S, env) => {
  if (autoFrom != null && S.week >= autoFrom) env.w.localStorage.setItem("grow-auto-mini", "1");
  return S.cond < 50 ? { k: "rest" } : { k: "train", stat: K6[S.week % 6] };
} });
/* 한 판 — 평가서 메모 · 필름 판 줄 · 사람이 실제로 둔 판(공식 경기 + 승부차기 · 테스트 주 빼고) */
async function one(seed, mode, muts) {
  const env = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], realScene: false, muts, auto: mode === "auto",
    hand: () => 0.7, policy: pol(mode === "mixed" ? 17 : null) });
  const r = await runAct(env);
  const S = r.S;
  const human = env.seen.boards.filter((b) => b.week !== 35).length;
  const film = env.w.W2Film.build(S);
  const out = { S, done: r.done, human, n: S.record.sN, k: S.record.sAuto, avg: S.record.sN ? S.record.sSum / S.record.sN : 0,
    sheet: S.sheet.cols.find((c) => c.k === "skill").note, film: (film.ch.find((c) => c.k === "body") || { lines: [] }).lines[1],
    pk: S.record.pkN || 0, keys: lsDump(env.w), w: env.w };
  return out;
}
async function cases(muts, pkSeed) {
  const res = {};
  res.auto = await one(301, "auto", muts);
  res.mixed = await one(302, "mixed", muts);
  res.human = await one(303, "human", muts);
  if (pkSeed != null) res.pk = await one(pkSeed, "auto", muts);
  for (const v of Object.values(res)) v.w.close();
  return res;
}
const am1 = (R) => {
  const bad = [];
  const expectK = { auto: (x) => x.n, mixed: (x) => x.n - x.human, human: () => 0, pk: (x) => x.n };
  for (const [name, x] of Object.entries(R)) {
    if (!x.done) { bad.push(`${name}: 졸업까지 못 감`); continue; }
    if (x.k !== expectK[name](x)) bad.push(`${name}: 🤖 ${x.k} ≠ 판 ${x.n} − 사람이 둔 판 ${x.human}`);
  }
  if (R.mixed && !(R.mixed.k > 0 && R.mixed.k < R.mixed.n)) bad.push(`mixed: 섞이지 않음(🤖 ${R.mixed.k}/${R.mixed.n})`);
  return bad;
};
const am2 = (R) => {
  const bad = [];
  for (const [name, x] of Object.entries(R)) {
    const w = want(x.n, Math.min(x.n, x.k || 0), x.avg);
    if (x.sheet !== w.sheet) bad.push(`${name} 평가서 「${x.sheet}」 ≠ 「${w.sheet}」`);
    if (x.film !== w.film) bad.push(`${name} 필름 「${x.film}」 ≠ 「${w.film}」`);
  }
  return bad;
};

(async () => {
  /* 🥅 🤖 판에서 승부차기가 난 시드를 훑어 찾음(내 킥도 🤖으로 셈하는지) */
  let pkSeed = null;
  for (let seed = 7001; seed < 7121 && pkSeed == null; seed += 1) {
    const env = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], realScene: false, auto: true });
    const r = await runAct(env);
    if (r.S && r.S.record.pkN > 0) pkSeed = seed;
    env.w.close();
  }
  const R = await cases(null, pkSeed);
  const b1 = am1(R);
  check(b1.length === 0, `AM-1. 🤖 세 갈래 — 모두(🤖 ${R.auto.k}/${R.auto.n}) · 섞임(🤖 ${R.mixed.k}/${R.mixed.n} = 판 − 사람이 둔 ${R.mixed.human}) · 사람만(🤖 ${R.human.k}/${R.human.n})`
    + (R.pk ? ` · 승부차기 판(시드 ${pkSeed} · 내 킥 ${R.pk.pk}번 · 🤖 ${R.pk.k}/${R.pk.n})` : "") + (b1.length ? `\n     🔴 ${b1.join(" · ")}` : ""));
  if (pkSeed == null) console.log("🚧 AM-1. 🤖 판 120개를 훑어도 승부차기가 안 났어요 — 승부차기 내 킥의 🤖 셈은 이번에 못 봤어요");

  /* 판 0번 · 옛 세이브 — 함수로(진짜 sheet.js · film.js) */
  const W = bootPage({ fastTimers: true });
  for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
  const zeroS = JSON.parse(R.human.keys["winger2-save-v2"]);
  Object.assign(zeroS.record, { sN: 0, sSum: 0, sAuto: 0 });
  const zero = { n: 0, k: 0, avg: 0, sheet: W.W2Sheet.compute(zeroS, true).cols.find((c) => c.k === "skill").note,
    film: W.W2Film.build(zeroS).ch.find((c) => c.k === "body").lines[1] };
  const oldS = JSON.parse(R.mixed.keys["winger2-save-v2"]);
  delete oldS.record.sAuto;
  const old = { n: oldS.record.sN, k: 0, avg: oldS.record.sSum / oldS.record.sN, sheet: W.W2Sheet.compute(oldS, true).cols.find((c) => c.k === "skill").note,
    film: W.W2Film.build(oldS).ch.find((c) => c.k === "body").lines[1] };
  const b2 = am2(Object.assign({}, R, { zero, old }));
  check(b2.length === 0, `AM-2. 📋🎬 평가서 메모와 필름 판 줄이 같은 규칙 — 다섯 경우 글자 그대로\n     모두 「${R.auto.sheet}」 · 섞임 「${R.mixed.sheet}」 · 사람만 「${R.human.sheet}」 · 판 0번 「${zero.film}」 · 옛 세이브 「${old.sheet}」`
    + (b2.length ? `\n     🔴 ${b2.slice(0, 3).join(" · ")}` : ""));
  /* 진짜 scenes.js가 그 줄을 그리는가 — 섞임 · 모두 자동(평가서 칸 메모 · 필름 판 줄) */
  {
    const layer = W.document.getElementById("w2-layer");
    const drawn = [];
    for (const x of [R.mixed, R.auto]) {
      const S = x.S;
      const p1 = W.W2Scenes.sheet(Object.assign({ title: "📋 스카우트 평가서" }, S.sheet));
      await wait(2);
      drawn.push(layer.textContent.indexOf(x.sheet) >= 0);
      const ok = layer.querySelector(".w2o-ok"); if (ok) ok.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
      await p1;
      const p2 = W.W2Scenes.film(W.W2Film.build(S));
      await wait(2);
      drawn.push(layer.textContent.indexOf(x.film) >= 0);
      const close = [...layer.querySelectorAll(".w2f-acts button")].find((b) => b.textContent.indexOf("닫기") >= 0);
      if (close) close.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
      await p2;
    }
    check(drawn.every(Boolean), `AM-2b. 🖼️ 진짜 \`scenes.js\`가 그 글을 그대로 그림 — 섞임 · 모두 자동의 평가서 메모 · 필름 판 줄 ${drawn.filter(Boolean).length}/4`);
  }
  /* AM-3 — 옛 세이브를 게임이 읽으면 */
  {
    const st = JSON.parse(R.mixed.keys["winger2-save-v2"]);
    delete st.record.sAuto;
    st.hofDone = false;
    const W2 = bootPage({ fastTimers: true, keys: { "winger2-save-v2": JSON.stringify(st) } });
    for (let i = 0; i < 400 && !W2.document.querySelector("#w2-entry"); i++) await wait(5);
    const sv = W2.W2Game.loadSave();
    W2.close();
    check(!!sv && sv.record.sAuto === 0 && old.sheet === want(old.n, 0, old.avg).sheet, `AM-3. 🗃️ 옛 세이브(\`sAuto\` 없음) — \`loadSave()\`가 🤖 ${sv && sv.record.sAuto}로 읽고 · 평가서 · 필름이 사람만 글(「${old.sheet}」)`);
  }
  W.close();

  /* ══════════ 🧪 변이 ══════════ */
  if (fail === 0) {
    const m1 = await cases(MUT.SHEET_BLIND, null);
    check(am2(m1).length > 0, `변이-SHEET_BLIND(평가서 메모가 🤖을 모름) → AM-2가 빨간불 (${am2(m1).slice(0, 1).join("")})`);
    const m2 = await cases(MUT.FILM_MIX, null);
    check(am2(m2).length > 0, `변이-FILM_MIX(필름만 (🤖 k)를 뺌) → AM-2가 빨간불 (${am2(m2).slice(0, 1).join("")})`);
    const m3 = await cases(MUT.COUNT_ALL, null);
    check(am1(m3).length > 0, `변이-COUNT_ALL(모든 판을 🤖으로 셈) → AM-1이 빨간불 (${am1(m3).slice(0, 1).join("")})`);
    const m4 = await cases(MUT.LIVE_UNMARK, null);
    check(am1(m4).length > 0, `변이-LIVE_UNMARK(live.js가 🤖 표시를 안 담) → AM-1이 빨간불 (${am1(m4).slice(0, 1).join("")})`);
    {
      const W3 = bootPage({ fastTimers: true, muts: MUT.OLD_AS_AUTO });
      for (let i = 0; i < 400 && !W3.document.querySelector("#w2-entry"); i++) await wait(5);
      const oS = JSON.parse(R.mixed.keys["winger2-save-v2"]);
      delete oS.record.sAuto;
      const note = W3.W2Sheet.compute(oS, true).cols.find((c) => c.k === "skill").note;
      W3.close();
      check(note !== want(oS.record.sN, 0, oS.record.sSum / oS.record.sN).sheet, `변이-OLD_AS_AUTO(옛 세이브를 모두 🤖으로 읽음) → AM-3이 빨간불 (「${note}」)`);
    }
    if (pkSeed != null) {
      const env = await one(pkSeed, "auto", MUT.PK_UNCOUNTED);
      env.w.close();
      check(env.k !== env.n, `변이-PK_UNCOUNTED(승부차기 🤖 킥을 안 셈) → AM-1이 빨간불 (🤖 ${env.k}/${env.n})`);
    }
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
