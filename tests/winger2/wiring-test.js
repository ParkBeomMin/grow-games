/* ⚽ 더 윙어 II 1막 — 🔌 **배선** (엔진 ↔ 드라이버 ↔ 화면) — 옛 `wiring-test`의 B · C · D · E를 1막으로
 *
 * 🔄 2026-10-02 · inspector — 11번 §6-C 「wiring B · C · D · E · A(sw.js 목록)는 새 목록으로」.
 *    A(서비스워커 목록)는 경계면 묶음과 한 몸이라 `boundary-test.js`로 옮겼어요. 옛 B는 `career.js`(지움)가 부르던
 *    화면 API를 봤는데, 1막에서 그 자리는 **드라이버 `live.js` 하나**예요(12번 §8-1).
 *   B-1  `live.js`가 부르는 `W2Scene.*` 이름 ⊆ `match-scene.js`가 내보내는 함수(이름이 갈리면 화면이 **조용히** 안 그려짐)
 *   B-2  `game.js`가 부르는 `W2Scenes.*`(오버레이 열 개) ⊆ `scenes.js`가 내보내는 함수
 *   B-3  `live.js` · `game.js`가 부르는 `W2Moment.*` ⊆ `winger-moment.js`가 내보내는 것
 *   B-4  🔥 판을 부르는 **순서와 모양**(계약 3) — 열기 `push(카드)` → `play(자리, { kind, moment, condition, foot, keeper, judge })`
 *        → 판정은 엔진 창구(`judge(s)` = `m.judgeFor(s)`) → 닫기 `push(같은 카드)`
 *   C    엔진의 `stakeKey` 8종 ↔ 화면의 문구 표 — 종류마다 문구가 있고 · 같은 카드 종류 안에서 서로 다르다
 *   D    🚪 **게임 입구에서 첫 리그 경기까지** 진짜 버튼으로 — 경기 화면 · 스코어 숫자 둘 · 사후 집계 줄 · 결과 · 평점 · [다음] · 오류 0
 *   E    카드 빈도가 **계단이 아니다** — 1막 눈금(능력치 40~100 · 5점 간격 · 포지션 넷 · 1막 `buff`)에서 이웃 칸 비 ≤ 1.35
 *   + 변이(파일 안) — 각각 제 문장이 빨간불
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { load, PAGE_DIR, BETA, bootPage, pageMutsOK, mutsOK, wait, xiOf, COND_NEUTRAL } = require("./_load.js");
const { liveMatch, boot, runAct, tap } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
const src = (f) => fs.readFileSync(path.join(PAGE_DIR, f), "utf8");

const MUT = {
  /* B-4 — 판에 키퍼 이름을 안 넘김(계약 3의 모양이 빠짐) */
  M_NOKEEPER: { "live.js": [[/foot: c\.foot === "L" \? "L" : "R", keeper: c\.keeper,/, 'foot: c.foot === "L" ? "L" : "R",']] },
  /* B-4 — 판이 낸 s를 엔진 창구 대신 폴백 판정으로(판정의 주인이 갈림) */
  M_JUDGE: { "live.js": [[/judge: \(s\) => m\.judgeFor\(s\),/, 'judge: (s) => (s >= 0.75 ? "perfect" : s >= 0.35 ? "ok" : "miss"),']] },
  /* C — 문구 표에서 한 칸을 지움(표에 없는 키는 조용히 다른 문구로 떨어져요) */
  M_STAKE: { "match-scene.js": [[/ {4}clincher: "쐐기를 박습니다",\n/, ""]] },
};
const MUT_ENG = { ACE_V0: [
  [/const pool = xi\.filter\(\(x\) => want\.indexOf\(x\.pos\) >= 0 && !x\.me\);\n {4}const list = pool\.length \? pool : xi\.filter\(\(x\) => !x\.me\);/,
    "const pool = xi.filter((x) => want.indexOf(x.pos) >= 0);\n    const list = pool.length ? pool : xi.slice();"],
  [/ {6}\* \(row === ace \? \(NPC_SPOT\[kind\] \|\| NPC_SPOT\.goal\) : 1\)\n {6}\* \(row\.me \? ME_P \* SPOT : 1\);/,
    "      * (row === ace ? (row.me ? SPOT : (NPC_SPOT[kind] || NPC_SPOT.goal)) : 1)\n      * (row.me ? ME_P : 1);"]] };
{
  const bad = pageMutsOK(MUT).concat(mutsOK(MUT_ENG));
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}

(async () => {
  /* ══════════ B-1 · B-2 · B-3 — 부르는 이름 ⊆ 내보내는 이름(소스 ↔ 실제로 실린 창) ══════════ */
  {
    const W = bootPage({ fastTimers: true });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const LIVE = code(src("live.js")), GAME = code(src("game.js"));
    const uniq = (a) => [...new Set(a)];
    const sceneUse = uniq([...LIVE.matchAll(/\bScene\.(\w+)/g)].map((m) => m[1]));
    const scenesUse = uniq([...GAME.matchAll(/\bsc\("(\w+)"/g)].map((m) => m[1]));
    const momentUse = uniq([...LIVE.matchAll(/\bM\.(\w+)/g)].map((m) => m[1]).concat([...GAME.matchAll(/\bM\.(\w+)/g)].map((m) => m[1])));
    const miss = (names, obj) => names.filter((n) => !obj || typeof obj[n] !== "function");
    const m1 = miss(sceneUse, W.W2Scene), m2 = miss(scenesUse, W.W2Scenes), m3 = miss(momentUse, W.W2Moment);
    check(sceneUse.length >= 6 && m1.length === 0, `B-1. 🎬 드라이버가 부르는 화면 API ${sceneUse.length}개가 \`W2Scene\`에 다 있다 — ${sceneUse.join(" · ")}`
      + (m1.length ? `\n     🔴 없는 것: ${m1.join(" · ")} — 화면이 **조용히** 안 그려져요` : ""));
    check(scenesUse.length >= 9 && m2.length === 0, `B-2. 🖼️ 게임이 부르는 오버레이 ${scenesUse.length}개가 \`W2Scenes\`에 다 있다 — ${scenesUse.join(" · ")}`
      + (m2.length ? `\n     🔴 없는 것: ${m2.join(" · ")} — 게임이 그 자리에서 「화면 조각을 불러오지 못했어요」로 멈춰요` : ""));
    check(momentUse.length >= 2 && m3.length === 0, `B-3. 🥅 판 창구 ${momentUse.join(" · ")}가 \`W2Moment\`에 다 있다`
      + (m3.length ? `\n     🔴 없는 것: ${m3.join(" · ")}` : ""));
    /* 계약 10의 열 함수가 실제로 실린 창에 다 있는가(부르는 쪽이 아직 안 부르는 것까지) */
    const TEN = ["pick", "intro", "portrait", "card", "grade", "sheet", "doors", "ending", "film", "book"];
    check(TEN.every((n) => typeof W.W2Scenes[n] === "function"), `B-2b. 🖼️ 계약 10의 장면 API 열 개가 실린 창에 다 있다 — ${TEN.filter((n) => typeof W.W2Scenes[n] !== "function").join(" · ") || "빠짐 0"}`);
    W.close();
  }

  /* ══════════ B-4 — 판을 부르는 순서 · 모양 ══════════ */
  async function boardOrder(muts) {
    const rows = [];
    for (const seed of [11, 202, 777, 5150, 31337, 4242]) {
      const r = await liveMatch({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], muts, hand: (k) => (k === "defend" ? 0.9 : 0.1) });
      const L = r.log;
      const info = r.info;
      for (let i = 0; i < L.length; i++) {
        if (L[i].t !== "board") continue;
        const open = L.slice(0, i).reverse().find((x) => x.t === "push" && x.mine);
        const close = L.slice(i + 1).find((x) => x.t === "push" && x.mine);
        rows.push({ keys: L[i].keys, slot: L[i].slot, open: !!(open && !open.judged), close: !!(close && close.judged && close.min === (open || {}).min) });
      }
      /* 판정이 엔진 창구를 지났나 — 판이 낸 s · 판정을 엔진이 다시 낸 판정과 견줌(같은 시드 · 같은 s로 화면 없이) */
      if (info) {
        const h = await liveMatch({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], headless: true });
        rows.push({ engine: JSON.stringify((info.cards || []).filter((c) => c.mine).map((c) => c.judge)) });
        h.close();
      }
      r.close();
    }
    return rows;
  }
  const WANT_KEYS = "condition,foot,judge,keeper,kind,moment";
  const okB4 = (rows) => { const b = rows.filter((x) => x.keys); return b.length > 0 && b.every((x) => x.keys === WANT_KEYS && x.slot && x.open && x.close); };
  const rB4 = await boardOrder(null);
  const nb = rB4.filter((x) => x.keys).length;
  check(okB4(rB4), `B-4. 🔥 판을 부르는 **순서와 모양** — 열기 push → play(자리, { ${WANT_KEYS} }) → 닫기 push(같은 카드) · 판 ${nb}번`
    + (okB4(rB4) ? "" : `\n     🔴 ${rB4.filter((x) => x.keys && !(x.keys === WANT_KEYS && x.slot && x.open && x.close)).slice(0, 3).map((x) => JSON.stringify(x)).join(" · ")}`));
  /* B-4b — 판정의 주인은 엔진: 손이 0.1(공격) · 0.9(수비)인데 판정이 그 s의 「폴백 문턱」이 아니라 엔진 창구에서 왔는가 */
  async function judgeOwner(muts) {
    const out = { n: 0, fallbackLike: 0 };
    for (const seed of [11, 202, 777, 5150, 31337, 4242, 9, 64]) {
      const r = await liveMatch({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], muts, hand: () => 0.1 });
      for (const c of (r.info && r.info.cards) || []) if (c.mine) { out.n += 1; if (c.judge === "miss") out.fallbackLike += 1; }
      r.close();
    }
    return out;
  }
  {
    /* s = 0.1이면 폴백(`s ≥ .35`)은 늘 miss — 엔진 창구는 autoP를 중심으로 굴려 perfect · ok가 섞여요 */
    const j = await judgeOwner(null);
    check(j.n >= 5 && j.fallbackLike < j.n, `B-4b. ⚖️ **판정의 주인은 엔진**(\`m.judgeFor\`) — 손 s = 0.1인 판 ${j.n}번 중 miss ${j.fallbackLike}번(폴백 문턱이면 전부 miss)`);
    if (fail === 0) {
      const jm = await judgeOwner(MUT.M_JUDGE);
      check(jm.n > 0 && jm.fallbackLike === jm.n, `변이-M_JUDGE(판정을 폴백 문턱으로) → B-4b가 빨간불 (miss ${jm.fallbackLike}/${jm.n})`);
    }
  }
  if (okB4(rB4)) {
    const rm = await boardOrder(MUT.M_NOKEEPER);
    check(!okB4(rm), `변이-M_NOKEEPER(판에 키퍼 이름을 안 넘김) → B-4가 빨간불`);
  }

  /* ══════════ C — stakeKey 8종 ↔ 문구 ══════════ */
  async function stakePhrases(muts) {
    const E = load();
    const combos = new Map();
    E._t.seed(4242); E._t.skill = 0.5;
    for (let i = 0; i < 3000 && combos.size < 8; i++) {
      const pos = ["fw", "wg", "mf", "df"][i % 4];
      const r = E._t.playMatch({ xi: xiOf(pos, 56, 58, i), oppName: "상대", teamStr: 58, oppStr: 50 + (i % 5) * 4, condition: COND_NEUTRAL });
      for (const c of r.cards) if (c.stakeKey && !combos.has(c.stakeKey)) combos.set(c.stakeKey, { kind: c.kind, stakeKey: c.stakeKey });
    }
    const W = bootPage({ fastTimers: true, muts });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const host = W.document.createElement("div"); W.document.body.appendChild(host);
    W.W2Scene.mount(host, { home: "솔빛고", away: "한결고", myName: "윙어" });
    W.W2Scene.fast();
    const out = [];
    for (const { kind, stakeKey } of combos.values()) {
      await W.W2Scene.push({ min: 30, kind, mine: true, by: "윙어", score: [1, 1], stakeKey, judge: null, text: "" });
      const bodies = host.querySelectorAll(".w2-card.mine .w2-body");
      out.push({ kind, stakeKey, text: (bodies[bodies.length - 1] || {}).textContent || "" });
      W.W2Scene.closeMoment && await W.W2Scene.push(Object.assign({}, { min: 30, kind, mine: true, judge: "miss", result: "none" }), null);
    }
    W.close();
    return out;
  }
  const okC = (rows) => {
    if (rows.length < 8) return false;
    if (rows.some((r) => !r.text || /undefined|NaN/.test(r.text))) return false;
    for (const k of ["goal", "assist", "defend"]) {
      const t = rows.filter((r) => r.kind === k).map((r) => r.text);
      if (new Set(t).size !== t.length) return false;
    }
    return true;
  };
  const rc = await stakePhrases(null);
  check(okC(rc), `C. 🏷️ 엔진의 \`stakeKey\` ${rc.length}종(${[...new Set(rc.map((r) => r.stakeKey))].join(" · ")})마다 문구가 있고 같은 카드 종류 안에서 서로 다르다`
    + (okC(rc) ? "" : `\n     🔴 ${rc.map((r) => `${r.kind}/${r.stakeKey}: 「${r.text.slice(0, 30)}」`).join(" · ")}`));
  if (okC(rc)) check(!okC(await stakePhrases(MUT.M_STAKE)), `변이-M_STAKE(문구 표에서 clincher를 지움) → C가 빨간불 (조용히 「앞서 나갑니다」로 떨어져 lead와 겹침)`);

  /* ══════════ D — 입구에서 첫 리그 경기까지 ══════════ */
  {
    const env = boot({ seed: 2026, pos: "wg", gender: "f", name: "윙어" });
    const D0 = env.w.document;
    const r = await runAct(env, { until: (S, e) => !!e.w.document.querySelector("#w2-match .w2-after") });
    const D = D0;
    const match = D.querySelector("#w2-match");
    const live = match && match.querySelector(".w2-live");
    const feed = match ? match.querySelectorAll(".w2-feed .w2-card") : [];
    const nums = match ? Array.from(match.querySelectorAll(".w2-score b")).map((b) => Number(b.textContent)) : [];
    const txt = match ? match.textContent : "";
    const after = match && match.querySelector(".w2-after");
    const nextBtn = after && after.querySelector(".w2-after-next");
    const week0 = env.w.W2Game._t.S ? env.w.W2Game._t.S.week : null;
    check(r.done && !!match && !!live, `D-1. 🚪 입구 → 👥 → ✏️ → 🎬 → 🗓️ → ⚽ 첫 리그 경기 화면에 **진짜 버튼으로** 닿았다 (${week0}주 · 누른 것 ${JSON.stringify(r.clicks)})`);
    check(feed.length >= 6 && !!match.querySelector(".w2-tally"), `D-2. 📺 경기 화면에 줄이 그려지고(${feed.length}장) 🔥 사후 집계 줄이 남았다(사전에 약속하지 않고 사후에 셈)`);
    check(nums.length === 2 && nums.every(Number.isFinite) && !/undefined|NaN/.test(txt), `D-3. 🔢 스코어보드가 숫자 둘(${nums.join(":")}) · 화면에 undefined/NaN 0`);
    check(!!after && /\d+ : \d+/.test(after.textContent) && /평점 \d+\.\d/.test(after.textContent) && !!nextBtn && !nextBtn.disabled,
      `D-4. 🏁 경기 뒤 — 결과 줄 · ⭐ 평점 · [다음 →]가 보이고 눌린다 「${after ? after.querySelector(".w2-after-score").textContent : "없음"}」`);
    if (nextBtn) { tap(env.w, nextBtn); for (let i = 0; i < 400 && D.querySelector("#w2-match .w2-after"); i++) await wait(2); }
    const S2 = env.w.W2Game._t.S;
    check(!D.querySelector("#w2-match .w2-after") && S2 && (S2.week > week0 || D.querySelector("#w2-home")), `D-5. ➡️ [다음 →]을 누르면 넘어간다 (${week0}주 → ${S2 ? S2.week : "?"}주)`);
    check(env.w.__errs.length === 0, `D-6. 🧯 입구부터 첫 경기 뒤까지 자바스크립트 오류 0${env.w.__errs.length ? ` — ${env.w.__errs[0]}` : ""}`);
    env.w.close();
  }

  /* ══════════ E — 카드 빈도가 계단이 아니다(1막 눈금) ══════════ */
  const STEP_MAX = 1.35;
  async function stair(Eng) {
    const W = bootPage({ fastTimers: true });
    const SPOT = JSON.parse(JSON.stringify(W.W2World.TUNE.ACT1_SPOT));   // 🔗 1막의 실제 `buff`(중립화 상수) — 값이 아니라 **모양**을 봐요
    W.close();
    const out = {};
    for (const pos of ["fw", "wg", "mf", "df"]) {
      const sp = SPOT[pos];
      const v = [];
      for (let ab = 40; ab <= 100; ab += 5) {
        Eng._t.seed(31); Eng._t.skill = 0.5;
        let cards = 0;
        for (let i = 0; i < 1500; i++) cards += Eng._t.playMatch({ xi: xiOf(pos, ab, 58, i, { g: sp, a: sp, d: sp }), oppName: "상대", teamStr: 58, oppStr: 58, condition: COND_NEUTRAL }).mineCards;
        v.push([ab, cards / 1500]);
      }
      let mx = 1, at = 0;
      for (let i = 1; i < v.length; i++) { const r2 = v[i][1] / v[i - 1][1]; if (r2 > mx) { mx = r2; at = v[i][0]; } }
      out[pos] = { mx, at, line: v.map(([a, c]) => `${a}:${c.toFixed(2)}`).join(" ") };
    }
    return out;
  }
  const st = await stair(load());
  const okE = (o) => Object.values(o).every((x) => x.mx <= STEP_MAX);
  check(okE(st), `E. 🪜 카드 빈도가 **계단이 아니다** — 1막 눈금(능력치 40~100 · 5점 · 전력 58:58 · 컨디션 51 · 1막 buff) 이웃 칸 최대 비 ${Object.entries(st).map(([p, x]) => `${p} ${x.mx.toFixed(2)}@${x.at}`).join(" · ")} (≤${STEP_MAX})`);
  const stM = await stair(load(MUT_ENG.ACE_V0));
  check(!okE(stM), `변이-ACE_V0(🌟 에이스 후보에 나를 다시 넣음) → E가 빨간불 — ${Object.entries(stM).map(([p, x]) => `${p} ${x.mx.toFixed(2)}@${x.at}`).join(" · ")}`);

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
