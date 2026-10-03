/* ⚽ 더 윙어 II 1막 — 💾 **세이브** (12번 §11 · 21번 §10 · 결정 6 · 25번 §8 · 26번 §2)
 *
 *   SV-1  새로 고침 — 열 군데(주 시작 · 📍 1장 · 🔥 판정 주 · 중간 평가서 · 대회 · 이야기 결말 · 테스트 · 마지막 주 · **경기 도중** 둘)에서
 *         창을 닫고 [▶️ 이어하기] → **같은 주에서** 이어지고 · 끝까지 간 판의 모든 숫자가 한 번도 안 닫은 판과 비트 같다
 *         · 경기 도중에 닫으면 그 경기는 처음부터 다시(같은 결과) — 도움말 「💾 기록 보관」의 약속
 *   SV-2  `winger2-save-v2` 왕복 — 저장된 글 → `loadSave()` → 다시 글이 **같은 글**(읽는 쪽 기본값이 멀쩡한 세이브를 안 바꿈)
 *   SV-3  🧊 `act1` 얼림 — 엔딩 · 구간 · 평가서 · 능력치 · 이야기 결말 · **🤝 신뢰**가 세이브와 같고, 필름 앞에서 닫았다 이어도 같은 `act1`
 *         · 새 판을 시작하면 2막을 기다리는 졸업생(`winger2-alumni`)에 그 `act1`이 그대로 옮겨짐
 *   SV-4  🏆 기기 명전 — `grow-hof-v1`에 `{ game: "winger2", v: 2, kind: "act1" }` 한 줄 · 엔딩 · 구간 · 합계 · 업적 수가 세이브와 같음
 *   SV-5  옛 세이브 — `winger2-save-v1`(옛 열쇠)은 **읽지도 지우지도 않음**(마이그레이션 없음) · 새 열쇠에 `v: 1` 모양이 있으면 이어하기가 안 뜸
 *   + 변이(파일 안)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 1분
 */
"use strict";
const { pageMutsOK, wait } = require("./_load.js");
const { boot, runAct, lsDump, numbersOf, defaultPolicy, tap } = require("./_act.js");
const DEF_CARD = defaultPolicy({}).card;          // 기본 손의 카드 답 — 닫는 자리만 다르고 나머지 입력은 같게

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const SAVE_KEY = "winger2-save-v2", OLD_KEY = "winger2-save-v1", HOF_KEY = "grow-hof-v1", ALUMNI_KEY = "winger2-alumni";   // 🔒 결정 6 · 12번 §11
const MUT = {
  /* SV-1 — 이어하기가 다음 단계로 건너뜀(그 주의 남은 단계를 하나 빠뜨림) */
  SKIP: { "game.js": [[/acts\.append\(card, btn\("w2-btn-primary w2-continue", "▶️ 이어하기", \(\) => \{ S = sv; run\(\); \}\)\);/,
    'acts.append(card, btn("w2-btn-primary w2-continue", "▶️ 이어하기", () => { S = sv; S.ph += 1; run(); }));']] },
  /* SV-2 — 읽는 쪽이 컨디션을 반올림해 들임 */
  ROUND: { "game.js": [[/s\.cond = typeof s\.cond === "number" && isFinite\(s\.cond\) \? s\.cond : TUNE\.COND_START;/, 's.cond = typeof s.cond === "number" && isFinite(s.cond) ? Math.round(s.cond + 0.5) : TUNE.COND_START;']] },
  /* SV-3 — 🤝 신뢰가 얼린 칸에서 빠짐 */
  NOTRUST: { "sheet.js": [[/ {6}trust: Number\(S\.trust\) \|\| 0,\n/, ""]] },
  /* SV-4 — 명전 줄이 옛 판(v 1) */
  HOF1: { "game.js": [[/const entry = \{ id: S\.id, at: Date\.now\(\), game: GAME, v: 2, kind: "act1",/, 'const entry = { id: S.id, at: Date.now(), game: GAME, v: 1, kind: "act1",']] },
  /* SV-5 — 옛 열쇠를 읽어 옮김(마이그레이션) */
  MIGRATE: { "game.js": [[/try \{ s = JSON\.parse\(localStorage\.getItem\(SAVE_KEY\)\); \} catch \(e\) \{ return null; \}/,
    'try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (!s && localStorage.getItem("winger2-save-v1")) { s = Object.assign(JSON.parse(localStorage.getItem("winger2-save-v1")), { v: 2 }); localStorage.removeItem("winger2-save-v1"); } } catch (e) { return null; }']] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const SEED = 4242, POS = "mf";
/* 🔒 손은 **세이브만 보고** 고릅니다 — 정책이 제 안에 기억(돌림 순번 등)을 가지면 닫았다 연 판에서 다른 입력이 들어가요 */
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const POL = { home: (S) => { const pw = { 2: "family", 3: "keeper", 32: "family" }[S.week]; if (pw && S.__ppl && S.__ppl.indexOf(pw) >= 0) return { k: "people", who: pw };
  return S.cond < 50 ? { k: "rest" } : { k: "train", stat: K6[S.week % 6] }; } };
const full = (S) => JSON.stringify([numbersOf(S), S.stats, S.record, S.games, S.evLog, S.story.done, S.world.league.table, S.world.league.ind, S.world.cup.stage, S.trust, S.ending, S.mid]);

async function straight(muts) {
  const env = boot({ seed: SEED, pos: POS, auto: true, realScene: false, muts, policy: POL });
  const r = await runAct(env);
  const out = { S: r.S, keys: lsDump(env.w), done: r.done, seen: env.seen };
  env.w.close();
  return out;
}
/* 어디서 닫나 — `until(S, env)` · 닫은 뒤 이어하기 */
async function reopen(name, until, muts, hang) {
  const A = boot({ seed: SEED, pos: POS, auto: true, realScene: false, muts, policy: Object.assign({}, POL, hang || {}) });
  await runAct(A, { until, stall: 400 });
  const keys = lsDump(A.w);
  const midMatch = A.seen.mounts && A.seen.mounts.length > A.seen.live.length;
  A.w.close();
  const saved = JSON.parse(keys[SAVE_KEY] || "null");
  const B = boot({ seed: SEED, pos: POS, auto: true, realScene: false, muts, keys, policy: POL });
  let firstWeek = null;
  const r = await runAct(B, { entry: "continue", until: (S) => { if (firstWeek == null) firstWeek = S.week; return false; } });
  const out = { name, saved, firstWeek, S: r.S, done: r.done, midMatch, live: B.seen.live, missed: !!(saved && saved.hofDone) };
  B.w.close();
  return out;
}
const POINTS = [
  ["3주 시작", (S) => S.week === 3],
  ["6주 📍 1장 앞", (S, e) => S.week === 6 && e.seen.card.some((c) => c.id === "s_slot1")],
  ["8주 경기 도중", (S, e) => e.seen.mounts && e.seen.mounts.some((m) => m.week === 8) && !e.seen.live.some((l) => l.week === 8)],
  ["11주 🔥 판정 주", (S) => S.week === 11],
  ["17주 중간 평가서", (S, e) => S.week === 17 && e.seen.sheet.length >= 1],
  ["20주 대회 도중", (S, e) => S.week === 20 && e.seen.mounts && e.seen.mounts.filter((m) => m.week === 20).length >= 2 && e.seen.live.filter((l) => l.week === 20).length === 1],
  /* 🔒 스텁 장면은 바로 풀려서 그 사이에 틱이 안 와요 — **그 장면 앞에서 멈춰 세운 뒤**(정책 hang) 닫습니다 */
  ["25주 이야기 결말 카드", (S, e) => e.seen.card.some((c) => c.kind === "story-end" && c.__week === 25),
    { card: (c, S) => (c.kind === "story-end" && S && S.week === 25 ? null : DEF_CARD(c, S)) }],
  ["33주 리그 끝", (S) => S.week === 33],
  ["35주 테스트", (S) => S.week === 35],
  ["36주 최종 평가서", (S, e) => e.seen.sheet.some((x) => x.final), { sheetHang: (x) => x.final }],
];

(async () => {
  const base = await straight(null);
  check(base.done, `SV-0. 🏁 한 번도 안 닫은 판(시드 ${SEED} · ${POS} · 🤖)이 졸업까지 갔다`);
  const F0 = full(base.S);
  /* ══════════ SV-1 ══════════ */
  async function sv1(muts, pts) {
    const bad = [];
    let mid = 0;
    for (const [name, until, hang] of pts) {
      const r = await reopen(name, until, muts, hang);
      if (r.midMatch) mid += 1;
      if (r.missed) { bad.push(`${name}: 💥 검사 장치가 그 자리에서 못 멈춤(졸업까지 가 버림)`); continue; }
      if (!r.done) { bad.push(`${name}: 이어서 졸업까지 못 감`); continue; }
      if (!r.saved || r.firstWeek !== r.saved.week) bad.push(`${name}: 저장 ${r.saved && r.saved.week}주 → 이어하기 ${r.firstWeek}주`);
      if (full(r.S) !== F0) bad.push(`${name}: 끝난 판의 숫자가 다름`);
    }
    return { bad, mid };
  }
  const s1 = await sv1(null, POINTS);
  check(s1.bad.length === 0 && s1.mid >= 2, `SV-1. 🔄 ${POINTS.length}군데에서 닫고 이어하기(경기 도중 ${s1.mid}번 포함) — 같은 주에서 이어지고 · 졸업한 판의 숫자가 한 번도 안 닫은 판과 비트 같다`
    + (s1.bad.length ? `\n     🔴 ${s1.bad.slice(0, 4).join(" · ")}` : ""));

  /* ══════════ SV-2 — 왕복 ══════════ */
  async function sv2(muts) {
    const bad = [];
    for (const wk of [5, 18, 30]) {
      const A = boot({ seed: SEED, pos: POS, auto: true, realScene: false, muts, policy: POL });
      await runAct(A, { until: (S) => S.week === wk });
      A.w.W2Game._t.save();
      const text = A.w.localStorage.getItem(SAVE_KEY);
      const back = A.w.W2Game.loadSave();
      A.w.close();
      if (JSON.stringify(back) !== JSON.stringify(JSON.parse(text))) bad.push(`${wk}주`);
    }
    const g = JSON.parse(base.keys[SAVE_KEY]);
    return { bad, finalOk: g.v === 2 && g.act1 && g.hofDone === true };
  }
  const s2 = await sv2(null);
  check(s2.bad.length === 0 && s2.finalOk, `SV-2. 💾 \`${SAVE_KEY}\` 왕복 — 5 · 18 · 30주의 저장 글 → \`loadSave()\` → 같은 글 · 졸업한 세이브는 \`v: 2\` · \`act1\` · \`hofDone\`` + (s2.bad.length ? `\n     🔴 ${s2.bad.join(" · ")}` : ""));

  /* ══════════ SV-3 — act1 얼림 · 졸업생 ══════════ */
  async function sv3(muts) {
    const b = muts ? await straight(muts) : base;
    const S = b.S, a = S.act1 || {};
    const same = a.ending === S.ending.id && a.tier === S.ending.tier && a.trust === S.trust && a.sheet && a.sheet.total === S.sheet.total
      && JSON.stringify(a.stats) === JSON.stringify(S.stats) && JSON.stringify(a.stories) === JSON.stringify(S.story.done.map((d) => ({ sid: d.sid, end: d.end })));
    /* 필름 앞에서 닫고 이어하기 */
    const A = boot({ seed: SEED, pos: POS, auto: true, realScene: false, muts, policy: Object.assign({ filmHang: true }, POL) });
    await runAct(A, { until: (Sx, e) => e.seen.film.length >= 1, stall: 300 });
    const keys = lsDump(A.w);
    A.w.close();
    const frozen = (JSON.parse(keys[SAVE_KEY] || "{}") || {}).act1;   // 필름 앞에서 저장된 그 판의 act1(판 id · 필름 id는 판마다 새로 — 같은 판끼리 견줘요)
    const B = boot({ seed: SEED, pos: POS, auto: true, realScene: false, muts, keys, policy: POL });
    const rb = await runAct(B, { entry: "continue" });
    const again = rb.S.act1;
    /* 새 판 — 졸업생(입구의 [🆕 새로 시작] → 카드 → 만들기 폼을 직접 눌러요 · `runAct`는 졸업한 판을 보면 멈추니까요) */
    const D = B.w.document;
    for (let i = 0; i < 300 && !D.querySelector("#w2-entry .w2-new"); i++) await wait(5);
    let alumni = null, started = false;
    const nb = D.querySelector("#w2-entry .w2-new");
    if (nb) {
      tap(B.w, nb);
      for (let i = 0; i < 300 && !D.querySelector(".w2-start"); i++) await wait(5);
      if (D.querySelector(".w2-start")) {
        tap(B.w, D.querySelector('.w2-pos [data-v="fw"]'));
        tap(B.w, D.querySelector('.w2-foot [data-v="L"]'));
        const no = D.querySelector(".w2-no"); no.value = "10"; no.dispatchEvent(new B.w.Event("input", { bubbles: true }));
        tap(B.w, D.querySelector(".w2-start"));
        for (let i = 0; i < 300 && !(B.w.W2Game._t.S && B.w.W2Game._t.S.id !== rb.S.id); i++) await wait(5);
        started = !!(B.w.W2Game._t.S && B.w.W2Game._t.S.id !== rb.S.id);
      }
      alumni = JSON.parse(B.w.localStorage.getItem(ALUMNI_KEY) || "null");
    }
    B.w.close();
    const al = Array.isArray(alumni) ? alumni[alumni.length - 1] : null;
    /* 옮겨진 졸업생 = 이 판(B)의 얼린 act1 그대로 + 판 id · 저장 시각 */
    const moved = started && (!rb.S.act1.next ? alumni === null || (Array.isArray(alumni) && alumni.length === 0)
      : !!al && al.id === rb.S.id && JSON.stringify(Object.assign({}, al, { id: undefined, savedAt: undefined })) === JSON.stringify(Object.assign({}, rb.S.act1, { id: undefined, savedAt: undefined })));
    return { same, again: !!frozen && JSON.stringify(again) === JSON.stringify(frozen), moved, a, next: a.next, started };
  }
  const s3 = await sv3(null);
  check(s3.same && s3.again, `SV-3. 🧊 \`act1\` — 엔딩 ${s3.a.ending} · 구간 ${s3.a.tier} · 합계 ${s3.a.sheet && s3.a.sheet.total} · 🤝 ${s3.a.trust} · 능력치 · 이야기 결말이 세이브와 같고, 필름 앞에서 닫았다 이어도 같은 \`act1\``);
  check(s3.moved, `SV-3b. 🎓 새 판을 시작하면 ${s3.next ? `2막으로 이어지는 졸업생(\`${ALUMNI_KEY}\`)에 그 \`act1\`(🤝 포함)이 옮겨짐` : "1막 완결 엔딩이라 졸업생 칸은 그대로"}`);

  /* ══════════ SV-4 — 기기 명전 ══════════ */
  const sv4 = (b) => {
    const list = JSON.parse(b.keys[HOF_KEY] || "[]");
    const mine = list.filter((x) => x && x.id === b.S.id);
    const e = mine[0] || {};
    return { ok: mine.length === 1 && e.game === "winger2" && e.v === 2 && e.kind === "act1" && e.ending === b.S.ending.id && e.tier === b.S.sheet.tier
      && e.total === b.S.sheet.total && e.achN === Object.keys(b.S.ach || {}).length, e };
  };
  const h4 = sv4(base);
  check(h4.ok, `SV-4. 🏆 기기 명전 \`${HOF_KEY}\`에 이 판 한 줄 — game ${h4.e.game} · v ${h4.e.v} · kind ${h4.e.kind} · 엔딩 ${h4.e.ending} · 구간 ${h4.e.tier} · 합계 ${h4.e.total} · 업적 ${h4.e.achN}개`);

  /* ══════════ SV-5 — 옛 세이브 ══════════ */
  async function sv5(muts) {
    const OLD = JSON.stringify({ name: "옛 선수", age: 17, stats: { shoot: 70 }, money: 1200, week: 5, season: 2 });
    const env = boot({ seed: SEED, pos: POS, auto: true, realScene: false, muts, keys: { [OLD_KEY]: OLD }, policy: POL });
    for (let i = 0; i < 300 && !env.w.document.querySelector("#w2-entry .w2-new"); i++) await wait(5);
    const cont1 = !!env.w.document.querySelector("#w2-entry .w2-continue");
    await runAct(env, { until: (S) => S.week === 3 });
    const oldAfter = env.w.localStorage.getItem(OLD_KEY);
    env.w.close();
    /* 새 열쇠에 v:1 모양 */
    const env2 = boot({ seed: SEED, pos: POS, auto: true, realScene: false, muts, keys: { [SAVE_KEY]: JSON.stringify(Object.assign(JSON.parse(base.keys[SAVE_KEY]), { v: 1, hofDone: false, act1: null })) } });
    for (let i = 0; i < 300 && !env2.w.document.querySelector("#w2-entry .w2-new"); i++) await wait(5);
    const cont2 = !!env2.w.document.querySelector("#w2-entry .w2-continue");
    env2.w.close();
    return { ok: !cont1 && oldAfter === OLD && !cont2, cont1, untouched: oldAfter === OLD, cont2 };
  }
  const s5 = await sv5(null);
  check(s5.ok, `SV-5. 🗃️ 옛 열쇠 \`${OLD_KEY}\` — 이어하기 ${s5.cont1 ? "🔴 뜸" : "안 뜸"} · 새 판을 굴린 뒤에도 옛 글 ${s5.untouched ? "그대로" : "🔴 바뀜/지워짐"} / 새 열쇠의 \`v: 1\` 모양 — 이어하기 ${s5.cont2 ? "🔴 뜸" : "안 뜸"}`);

  /* ══════════ 🧪 변이 ══════════ */
  if (fail === 0) {
    const m1 = await sv1(MUT.SKIP, POINTS.slice(0, 3));
    check(m1.bad.length > 0, `변이-SKIP(이어하기가 단계 하나를 건너뜀) → SV-1이 빨간불 (${m1.bad.length}군데 — ${m1.bad.slice(0, 2).join(" · ")})`);
    const m2 = await sv2(MUT.ROUND);
    check(m2.bad.length > 0, `변이-ROUND(읽는 쪽이 컨디션을 반올림) → SV-2가 빨간불 (${m2.bad.join(" · ")})`);
    const m3 = await sv3(MUT.NOTRUST);
    check(!(m3.same && m3.again), `변이-NOTRUST(🤝이 얼린 칸에서 빠짐) → SV-3이 빨간불`);
    const m4 = await straight(MUT.HOF1);
    check(!sv4(m4).ok, `변이-HOF1(명전 줄이 v 1) → SV-4가 빨간불`);
    const m5 = await sv5(MUT.MIGRATE);
    check(!m5.ok, `변이-MIGRATE(옛 열쇠를 읽어 옮김) → SV-5가 빨간불 (이어하기 ${m5.cont1 ? "뜸" : "안 뜸"} · 옛 글 ${m5.untouched ? "그대로" : "지워짐"})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
