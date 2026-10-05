/* ⚽ 더 윙어 II 1막 v2 — ⚙️ **설정** · 🔬 **베타 측정** (38번 계약 14 · 17 · §6 14-a · 29번 §4 · 39번 §2)
 *
 *   SE-1  `W2Game.settings` 모양 — `list()` 다섯 칸(auto · fast · wide · still · buzz) · 칸마다 k · label · desc · on · shared · applies · locked ·
 *         `shared`는 🤖 · ♿ 둘만 · `set` → `on`이 따라옴(켜고 끄기 두 번)
 *   SE-2  8종 공유 키 이름 그대로 — `set("auto")` → `grow-auto-mini` · `set("wide")` → `grow-wide-judge` (값 "1" / "0")
 *   SE-3  `wipe()`는 II 키만 — II 키 열둘은 사라지고 · 다른 7종의 키 · 8종 공유 키 · 클라우드 키는 **바이트 그대로** · 돌려준 목록 == 지운 키
 *   SE-4  1막 한 판을 끝까지 돈 기기의 `winger2…` 키가 **모두** 지우기 목록에 있음(빠뜨린 II 키 0)
 *   BM-1  🔬 손으로 둔 판만 셈 — 손 한 판의 `boardStats()` 칸이 판 스텁이 받은 판(경기 종류 무관 — 리그 · 대회 · 연습 · 테스트 · 승부차기)과 같음 ·
 *         🤖 자동 한 판이면 모두 0
 *   BM-2  새 판을 시작해도 누적 — `newState` · 새 판 길이 `winger2-boards`를 안 건드림(지우는 자리는 `wipe` 하나 · 정적) · `wipe`가 지움
 *   BM-3  `GROW_ENV.beta`가 아니면 칸 0 · 베타면 📋 한 줄 글의 `raw` == `boardStats()`
 *   BM-4  `ms`는 판정에 안 쓰임 — 같은 칸을 0.3초 · 3.5초에 골라도 `sBoard` · `s` 비트 같음(🧱 · 🥅 · 🅰️)
 *   + 변이: 지우기 목록에 공유 키 `grow-auto-mini` · 지우기 목록에서 `winger2-boards` 빠짐 · 🤖 판도 셈 · 베타 아니어도 칸 · 판 값이 ms를 봄
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 몇 분
 */
"use strict";
const { bootPage, pageMutsOK, wait } = require("./_load.js");
const { boot, runAct, lsDump } = require("./_act.js");
const { boardEnv } = require("./_board.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const II = ["winger2-save-v2", "winger2-save-v2-slots", "winger2-alumni", "winger2-films", "winger2-book", "winger2-book-shadow", "winger2-grads",
  "winger2-create", "winger2-fast", "winger2-still", "winger2-buzz", "winger2-boards"];
const OTHER = { "grow-auto-mini": "1", "grow-wide-judge": "0", "grow-hof-v1": "[{\"g\":\"soccer\"}]", "winger-save-v1-slots": "{\"a\":1}", "winger-save-v1": "{}",
  "rookie-save-v1": "{}", "grow-cloud-v1": "{\"t\":1}", "winger2x-other": "keep" };
const MUT = {
  WIPE_SHARED: { "game.js": [[/CREATE_KEY, FAST_KEY, STILL_KEY, BUZZ_KEY, BOARDS_KEY\];/, "CREATE_KEY, FAST_KEY, STILL_KEY, BUZZ_KEY, BOARDS_KEY, AUTO_KEY];"]] },
  WIPE_NOBOARDS: { "game.js": [[/CREATE_KEY, FAST_KEY, STILL_KEY, BUZZ_KEY, BOARDS_KEY\];/, "CREATE_KEY, FAST_KEY, STILL_KEY, BUZZ_KEY];"]] },
  COUNT_AUTO: { "game.js": [[/if \(!b \|\| b\.auto\) return;/, "if (!b) return;"]] },
  BETA_ANY: { "scenes.js": [[/if \(!\(window\.GROW_ENV && window\.GROW_ENV\.beta\) \|\| !g/, "if (!g"]] },
};
const MS_MUT = [[/const sBoard = timeout \? 0 : B\.vals\[i\];/, "const sBoard = timeout ? 0 : B.vals[i] * (nowMs() - opened > 1000 ? 0.9 : 1);"]];
{
  const bad = pageMutsOK(MUT).concat(require("./_load.js").momentMutsOK({ MS_JUDGE: MS_MUT }));
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
async function page(muts, keys) {
  const W = bootPage({ fastTimers: true, muts, keys });
  for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
  return W;
}
async function se3(muts) {
  const keys = Object.assign({}, OTHER);
  for (const k of II) keys[k] = k === "winger2-save-v2" ? "{\"v\":0}" : "{}";
  const W = await page(muts, keys);
  const before = lsDump(W);
  let gone = [];
  try { gone = W.W2Game.settings.wipe(); } catch (e) { gone = [`💥 ${e.message}`]; }
  const after = lsDump(W);
  W.close();
  const leftII = II.filter((k) => k in after);
  const touched = Object.keys(OTHER).filter((k) => after[k] !== before[k]);
  const gotSet = JSON.stringify([...gone].sort()), wantSet = JSON.stringify(Object.keys(before).filter((k) => !(k in after)).sort());
  return { leftII, touched, listOk: gotSet === wantSet, gone };
}
const HAND = (s) => Object.assign({ seed: s, pos: ["fw", "df", "mf"][s % 3], operator: "normal", realScene: false });
async function bm1(muts, auto) {
  const env = boot(Object.assign(HAND(3301), { muts, auto }));
  await runAct(env);
  const st = env.w.W2Game.boardStats();
  const B = env.seen.boards.filter((b) => b.kind === "defend"), Sh = env.seen.boards.filter((b) => b.kind === "goal"), C = env.seen.boards.filter((b) => b.kind === "assist");
  const want = {
    block: { n: B.length, clear: B.filter((b) => b.seen === "clear").length, clearHit: B.filter((b) => b.seen === "clear" && b.cell != null && b.cell === b.target).length,
      dim: B.filter((b) => b.seen === "dim").length, dimHit: B.filter((b) => b.seen === "dim" && b.cell != null && b.cell === b.target).length,
      timeout: B.filter((b) => b.cell == null).length, sSum: B.reduce((a, b) => a + b.sBoard, 0) },
    shot: { n: Sh.length }, cut: { n: C.length },
  };
  const weeks = new Set(env.seen.boards.map((b) => b.week));
  const ls = lsDump(env.w);
  env.w.close();
  const diffs = [];
  for (const g of Object.keys(want)) for (const f of Object.keys(want[g])) if (Math.abs(st[g][f] - want[g][f]) > 1e-4) diffs.push(`${g}.${f} ${st[g][f]} ≠ ${want[g][f]}`);
  return { st, want, diffs, weeks, ls, total: env.seen.boards.length };
}
async function bm3(muts, beta) {
  const st = { block: { n: 7, clear: 4, clearHit: 2, dim: 3, dimHit: 1, timeout: 1, sSum: 3.82, msSum: 9100 }, shot: { n: 5, msSum: 4000 }, cut: { n: 2, msSum: 1500 } };
  const W = await page(muts, { "winger2-boards": JSON.stringify(st) });
  W.GROW_ENV = { beta };
  W.W2Scenes.settings();
  for (let i = 0; i < 100 && !W.document.querySelector(".w2s-panel"); i++) await wait(5);
  const box = W.document.querySelector(".w2s-beta");
  const ta = box && box.querySelector(".w2s-copytext");
  let raw = null;
  if (ta) { const m = ta.value.match(/\| raw (\{.*\})$/); raw = m ? JSON.parse(m[1]) : null; }
  const bs = W.W2Game.boardStats();
  const panel = !!W.document.querySelector(".w2s-panel");
  W.close();
  return { box: !!box, panel, same: raw != null && JSON.stringify(raw) === JSON.stringify(bs), raw };
}

(async () => {
  /* SE-1 · SE-2 */
  {
    const W = await page(null, {});
    const S = W.W2Game.settings;
    const L = S.list();
    const FIELDS = "applies,desc,k,label,locked,on,shared";
    const shapeOk = L.length === 5 && L.map((x) => x.k).join() === "auto,fast,wide,still,buzz" && L.every((x) => Object.keys(x).sort().join() === FIELDS)
      && L.filter((x) => x.shared).map((x) => x.k).join() === "auto,wide";
    let flip = true;
    for (const k of ["auto", "fast", "wide", "still", "buzz"]) for (const v of [true, false, true]) { S.set(k, v); if (S.on(k) !== v || S.list().find((x) => x.k === k).on !== v) flip = false; }
    check(shapeOk && flip && typeof S.wipe === "function", `SE-1. ⚙️ \`settings\` 모양 — list 다섯 칸(${L.map((x) => x.k).join(" · ")}) · 칸마다 ${FIELDS.replace(/,/g, " · ")} · shared = 🤖 · ♿ · set → on이 따라옴`);
    S.set("auto", true); S.set("wide", false);
    const a1 = W.localStorage.getItem("grow-auto-mini"), w0 = W.localStorage.getItem("grow-wide-judge");
    S.set("auto", false); S.set("wide", true);
    const a0 = W.localStorage.getItem("grow-auto-mini"), w1 = W.localStorage.getItem("grow-wide-judge");
    check(a1 === "1" && a0 === "0" && w1 === "1" && w0 === "0", `SE-2. 🔗 8종 공유 키 이름 그대로 — 🤖 → \`grow-auto-mini\`(${a1}/${a0}) · ♿ → \`grow-wide-judge\`(${w1}/${w0})`);
    W.close();
  }
  /* SE-3 */
  const r3 = await se3(null);
  check(r3.leftII.length === 0 && r3.touched.length === 0 && r3.listOk, `SE-3. 🗑️ \`wipe()\`는 II 키 ${II.length}개만 — 남은 II 키 ${r3.leftII.length} · 바뀐 다른 키 ${r3.touched.length}(다른 게임 · 공유 \`grow-auto-mini\` · \`grow-wide-judge\` · \`grow-hof-v1\` · 클라우드 · 이름이 비슷한 \`winger2x-other\`) · 돌려준 목록 == 지운 키 ${r3.listOk}`
    + (r3.leftII.length || r3.touched.length ? `\n     🔴 ${r3.leftII.concat(r3.touched).join(" · ")}` : ""));
  /* BM-1 · SE-4 */
  const h = await bm1(null, false);
  const a = await bm1(null, true);
  const allZero = (st) => Object.values(st).every((g) => Object.values(g).every((v) => v === 0));
  const kinds = [...new Set([...h.weeks])].length;
  check(h.diffs.length === 0 && h.total > 30 && allZero(a.st), `BM-1. 🔬 손으로 둔 판만 셈 — 손 한 판(판 ${h.total}번 · ${kinds}개 주 · 테스트 · 승부차기 포함)의 \`boardStats()\` == 판이 받은 판(🧱 ${h.want.block.n} · 🥅 ${h.want.shot.n} · 🅰️ ${h.want.cut.n} · 맞힘 · 흐림 · 시간 초과 · Σ판 값) · 🤖 자동 한 판은 모두 0`
    + (h.diffs.length ? `\n     🔴 ${h.diffs.slice(0, 3).join(" · ")}` : "") + (allZero(a.st) ? "" : `\n     🔴 🤖 ${JSON.stringify(a.st)}`));
  {
    const ii = Object.keys(h.ls).filter((k) => /^winger2/.test(k)).concat(Object.keys(a.ls).filter((k) => /^winger2/.test(k)));
    const miss = [...new Set(ii)].filter((k) => !II.includes(k));
    check(miss.length === 0 && ii.length > 0, `SE-4. 🧹 1막 두 판(손 · 🤖)을 끝까지 돈 기기의 \`winger2…\` 키 ${new Set(ii).size}개가 모두 지우기 목록에 — 빠진 키 ${miss.length}` + (miss.length ? `\n     🔴 ${miss.join(" · ")}` : ""));
  }
  /* BM-2 — 정적 */
  {
    const src = require("fs").readFileSync(require("path").join(require("./_load.js").PAGE_DIR, "game.js"), "utf8");
    const rm = [...src.matchAll(/removeItem\(([A-Z_]+|"[^"]+")\)/g)].map((m) => m[1]);
    const ns = src.slice(src.indexOf("function newState"), src.indexOf("function newState") + 4000);
    const ok = !rm.includes("BOARDS_KEY") && !/BOARDS_KEY/.test(ns) && /BOARDS_KEY\];/.test(src);
    const w = await se3(null);
    check(ok && !w.leftII.includes("winger2-boards"), `BM-2. ➕ 새 판을 시작해도 누적 — \`winger2-boards\`를 지우는 곳은 \`wipe\` 목록 하나(\`removeItem\` 직접 0 · \`newState\` 0) · \`wipe\`가 지움`);
  }
  /* BM-3 */
  const b1 = await bm3(null, true), b0 = await bm3(null, false);
  check(b1.box && b1.same && b0.panel && !b0.box, `BM-3. 🧪 베타면 🔬 칸 · 📋 한 줄 글의 raw == \`boardStats()\`(${b1.same}) · 베타가 아니면 칸 0(${b0.box ? "있음 🔴" : "없음"})`);
  /* BM-4 */
  const ms = (muts) => {
    const bad = [];
    for (const kind of ["defend", "goal", "assist"]) for (let c = 0; c < 6; c++) {
      const vals = [];
      for (const wt of [300, 3500]) {
        const E = boardEnv(muts);
        E.W.W2Moment._t.seed(700 + c);                       // 같은 판(정답 칸 · 단서)을 두 시간에
        const b = E.open(kind, { sit: { weak: false, step: 0, foot: 1, cond: 1 } });
        b.pick(c, wt);
        const r = b.finish();
        vals.push(r ? [r.d.sBoard, r.d.s, r.d.cell] : null);
        E.close && E.close();
      }
      if (JSON.stringify(vals[0]) !== JSON.stringify(vals[1])) bad.push(`${kind}#${c} ${JSON.stringify(vals)}`);
    }
    return bad;
  };
  const m4 = ms(null);
  check(m4.length === 0, `BM-4. ⏱️ \`ms\`는 판정에 안 쓰임 — 같은 판(같은 시드) 셋 × 칸 여섯을 0.3초 · 3.5초에 골라도 sBoard · s · 칸 비트 같음` + (m4.length ? `\n     🔴 ${m4.slice(0, 3).join(" · ")}` : ""));
  if (fail === 0) {
    const x1 = await se3(MUT.WIPE_SHARED);
    check(x1.touched.includes("grow-auto-mini"), `변이-WIPE_SHARED(지우기 목록에 공유 \`grow-auto-mini\`) → SE-3이 빨간불`);
    const x2 = await se3(MUT.WIPE_NOBOARDS);
    check(x2.leftII.includes("winger2-boards"), `변이-WIPE_NOBOARDS(지우기 목록에서 \`winger2-boards\` 빠짐) → SE-3 · BM-2가 빨간불`);
    const x3 = await bm1(MUT.COUNT_AUTO, true);
    check(!allZero(x3.st), `변이-COUNT_AUTO(🤖 판도 셈) → BM-1이 빨간불 (🧱 ${x3.st.block.n})`);
    const x4 = await bm3(MUT.BETA_ANY, false);
    check(x4.box, `변이-BETA_ANY(베타가 아니어도 칸) → BM-3이 빨간불`);
    const x5 = ms(MS_MUT);
    check(x5.length > 0, `변이-MS_JUDGE(판 값이 고른 시간을 봄 — 1초 넘으면 ×0.9) → BM-4가 빨간불 (${x5.length}/18)`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
