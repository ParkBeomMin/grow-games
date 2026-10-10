/* ⚽ 더 윙어 II 1막 — 👯 **짝 검사** R8 · R9 (22번 §4-6 · R8 · R9 · 24번 §4-6 · 26번 §2)
 *
 * 같은 판 번호(시드)로 **한 가지만** 바꾼 두 판을 견줍니다 — 바꾼 것 밖의 점수가 **비트 같아야** 해요(실측 어긋남 0).
 *   R8  🎲 **선택만** — 「늘 안전」 ↔ 「🤝 판돈 도전은 걸고 · 약속은 늘 · 깃발은 늘 · 🌿 🤝 +1도 받음」.
 *       🔄 v4(47번 · J13): 「넘긴다(효과 0)」 칸이 없어짐 — 「늘 안전」 쪽은 **몫을 안 받는 검사용 손**(🌿 · 💬를 고르되 고르기 직전에
 *       그 칸을 옛 「넘긴다」로 바꿈 · zero-test와 같은 손 · 46번 §4 #1)으로 잼. 🌿 확정의 🫀 몫은 컨디션을 움직여 「밖」이라 안 받음
 *       능력치 판돈이 걸린 도전은 둘 다 안 걸어요(그건 선택이 **직접** 움직이는 칸이라 「밖」이 아니에요).
 *       → 능력치 · 기록 · 경기 · 테스트 · 평가서 칸 다섯 · 합계 · 구간이 비트 같음(🤝 · 이야기 결말 · 엔딩 문만 달라도 됨)
 *   R9  🎯 **테스트만** — 11월 테스트 주의 손만 0.95 ↔ 0.05(나머지 주는 같은 손)
 *       → 능력치 · 공식 기록이 비트 같음 · A 판에 B 판 테스트만 갈아 끼우면 B 평가서와 비트 같음 · 보이는 테스트 밖 칸은 0.1 안
 *       (10-03 결정 ①의 최대 나머지법 — 남는 0.1이 칸 사이를 옮겨 갈 수 있어 「보이는 값 비트 같음」 대신 이 셋으로)
 *   + 변이: 약속 성공이 컨디션에 샘(R8) · 테스트 연습경기가 공식 기록에 샘(R9)
 * 🌍 바뀌지 않는 까닭(세계): 경기 난수원은 판 시드 × 경기 열쇠로 **경기마다 새로**(`world.js` `engineSeed`) — 앞의 선택이
 *    난수 소비를 밀지 않아요. 🤝 신뢰는 평가서에 0(23번 §7). 이 둘 중 하나가 깨지면 이 짝이 먼저 갈려요.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 1분
 */
"use strict";
const { pageMutsOK } = require("./_load.js");
const { boot, runAct } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const MUT = {
  /* R8 — 약속을 지키면 컨디션 +5(선택의 효과가 🤝 밖으로 샘) */
  PROM_COND: { "events.js": [[/if \(ok\) S\.promKept = \(Number\(S\.promKept\) \|\| 0\) \+ 1;/, "if (ok) { S.promKept = (Number(S.promKept) || 0) + 1; S.cond = Math.min(100, S.cond + 5); }"]] },
  /* R9 — 테스트의 기술 점수가 무대 칸에 샘(재료는 그대로 · 값만 샘 — ③이 잡아야) */
  TEST_STAGE: { "sheet.js": [[/\(leagueWin \? T\.LEAGUE_WIN_PT : 0\)\);/, "(leagueWin ? T.LEAGUE_WIN_PT : 0) + (S.test && S.test.rating != null ? (Number(S.test.tech) || 0) * 0.2 : 0));"]] },
  /* R9 — 테스트 연습경기가 공식 기록에 들어감 */
  TEST_REC: { "game.js": [[/R\.gAll \+= info\.myGoals; R\.aAll \+= info\.assists; R\.momP \+= info\.mineSuccess;\n(\s+)if \(info\.rating > R\.rMax\) R\.rMax = info\.rating;\n\s+if \(info\.myGoals >= 3\) R\.hat \+= 1;\n\s+S\.test =/,
    "R.gAll += info.myGoals; R.aAll += info.assists; R.momP += info.mineSuccess;\n$1R.apps += 1; R.g += info.myGoals; R.a += info.assists; R.d += info.defense;\n$1if (info.rating > R.rMax) R.rMax = info.rating;\n$1if (info.myGoals >= 3) R.hat += 1;\n$1S.test ="]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
/* 0️⃣ 몫을 안 받는 손 — 🌿 · 💬를 고르고(`zero` 표시) 답하기 직전에 그 칸을 옛 「넘긴다」로 */
let wantZero = false;
const SAFE = (c) => {
  const o = c.opts || [];
  const s = o.findIndex((x) => x.k === "safe" || x.k === "ok"); if (s >= 0) return s;
  const z = o.findIndex((x) => x.k === "cert" || x.k === "talk"); if (z >= 0) { wantZero = true; return z; }
  return 0;
};
const zeroHand = (env) => {
  const EV = env.w.W2Events, raw = EV.answer;
  EV.answer = (S, i) => {
    if (wantZero && S.ev && S.ev.opts[i]) { S.ev.opts = S.ev.opts.slice(); S.ev.opts[i] = { k: "safe", label: S.ev.opts[i].label }; }
    wantZero = false;
    return raw(S, i);
  };
};
const TRUSTY = (c) => {
  const o = c.opts || [];
  const f = o.findIndex((x) => x.k === "flag"); if (f >= 0) return f;
  const p = o.findIndex((x) => x.k === "promise"); if (p >= 0) return p;
  const t = o.findIndex((x) => x.k === "try" && x.stake === "trust"); if (t >= 0) return t;
  const ct = o.findIndex((x) => x.k === "cert" && x.fx && Object.keys(x.fx).join() === "trust"); if (ct >= 0) return ct;   // 🌿 🤝 +1만
  return SAFE(c);
};
const core = (S) => ({ stats: S.stats, rec: ["apps", "g", "a", "d", "cs", "sN", "sSum"].map((k) => S.record[k]), games: S.games.filter((g) => g.t !== "T"),
  cols: S.sheet.cols.map((c) => [c.k, c.v]), total: S.sheet.total, tier: S.sheet.tier, test: S.test && [S.test.tech, S.test.rating] });

async function one(seed, opt) {
  const env = boot(Object.assign({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], gender: seed % 3 ? "m" : "f", realScene: false }, opt));
  zeroHand(env);
  const r = await runAct(env);
  const S = r.S, seen = env.seen;
  env.w.close();
  return { S, seen, done: r.done };
}

(async () => {
  const SEEDS = [61, 62, 63, 64, 65, 66, 67, 68];
  /* ══════════ R8 ══════════ */
  async function r8(muts) {
    const bad = [];
    let trustDiff = 0, cards = 0, dead = 0;
    for (const seed of SEEDS) {
      const a = await one(seed, { auto: true, muts, policy: { card: SAFE } });
      const b = await one(seed, { auto: true, muts, policy: { card: TRUSTY } });
      if (!a.done || !b.done) { dead += 1; continue; }
      cards += b.S.evLog.filter((l) => l.k === "promise" || l.k === "try" || l.k === "cert").length;
      if (a.S.trust !== b.S.trust) trustDiff += 1;
      const A = core(a.S), B = core(b.S);
      for (const k of Object.keys(A)) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) bad.push(`#${seed} ${k}`);
    }
    return { bad, trustDiff, cards, dead };
  }
  const b8 = await r8(null);
  check(b8.dead === 0 && b8.bad.length === 0 && b8.trustDiff >= SEEDS.length / 2 && b8.cards >= 20,
    `R8. 🎲 선택만 바꾼 짝 ${SEEDS.length}쌍 — 능력치 · 공식 기록 · 경기 · 테스트 · 평가서 칸 · 합계 · 구간이 비트 같다 (🤝 판돈 도전 · 약속을 건 수 ${b8.cards} · 🤝이 갈린 짝 ${b8.trustDiff} · 어긋남 ${b8.bad.length})`
    + (b8.bad.length ? `\n     🔴 ${b8.bad.slice(0, 4).join(" · ")}` : ""));

  /* ══════════ R9 ══════════ */
  /* R9 — 25번 §8(10-03) 결정 ① 뒤: 칸 값은 **최대 나머지법**으로 0.1을 나눠요. 테스트 칸의 원래 값이 바뀌면 남는 0.1이
   *    다른 칸으로 옮겨 갈 수 있어서(그 칸의 원래 값은 그대로) 「보이는 칸 값의 비트 같음」은 결정과 함께 못 서요.
   *    그래서 뜻(테스트 밖으로 새지 않음)을 세 자리에서 봅니다:
   *      ① 재료 — 능력치 · 공식 기록 · 경기가 비트 같음
   *      ② 갈아 끼우기 — A 판 세이브에 B 판의 테스트만 넣어 평가서를 매기면 **B 판 평가서와 비트 같음**(칸 · 합계 · 구간)
   *      ③ 보이는 테스트 밖 칸은 서로 **0.1 안**(남는 0.1의 자리만 바뀜 — 그 이상은 새는 것) */
  const sheetOf = (src) => new Function("window", `${src}\nreturn window.W2Sheet;`)({});
  const SSRC = require("fs").readFileSync(require("path").join(require("./_load.js").PAGE_DIR, "sheet.js"), "utf8");
  async function r9(muts) {
    const bad = [];
    let testDiff = 0, dead = 0, moved = 0;
    const SH = sheetOf(((muts && muts["sheet.js"]) || []).reduce((x, [re, rep]) => x.replace(re, rep), SSRC));
    for (const seed of SEEDS) {
      const run = async (h35) => {
        let env = null;
        const r = await (async () => {
          env = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], gender: seed % 3 ? "m" : "f", realScene: false, muts,
            hand: () => (env && env.w.W2Game && env.w.W2Game._t.S && env.w.W2Game._t.S.week === 35 ? h35 : 0.5) });
          return runAct(env);
        })();
        env.w.close();
        return r;
      };
      const a = await run(0.95), b = await run(0.05);
      if (!a.done || !b.done) { dead += 1; continue; }
      const A = core(a.S), B = core(b.S);
      if (JSON.stringify(A.test) !== JSON.stringify(B.test)) testDiff += 1;
      for (const k of ["stats", "rec", "games"]) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) bad.push(`#${seed} ${k}`);
      const swapped = SH.compute(Object.assign(JSON.parse(JSON.stringify(a.S)), { test: JSON.parse(JSON.stringify(b.S.test)) }), true);
      const pick = (x) => JSON.stringify([x.cols.map((c) => [c.k, c.v]), x.total, x.tier]);
      if (pick(swapped) !== pick(b.S.sheet)) bad.push(`#${seed} 갈아 끼운 평가서 ${pick(swapped)} ≠ B ${pick(b.S.sheet)}`);
      const cut = (cols) => cols.filter(([k]) => k !== "test");
      const ca = cut(A.cols), cb = cut(B.cols);
      const far = ca.filter(([k, v], i) => Math.abs(Math.round(v * 10) - Math.round(cb[i][1] * 10)) > 1);
      if (far.length) bad.push(`#${seed} 테스트 밖 칸이 0.1 넘게 움직임 ${JSON.stringify(ca)} ↔ ${JSON.stringify(cb)}`);
      if (JSON.stringify(ca) !== JSON.stringify(cb)) moved += 1;
    }
    return { bad, testDiff, dead, moved };
  }
  const b9 = await r9(null);
  check(b9.dead === 0 && b9.bad.length === 0 && b9.testDiff >= SEEDS.length / 2,
    `R9. 🎯 테스트 주의 손만 0.95 ↔ 0.05로 바꾼 짝 ${SEEDS.length}쌍 — ① 능력치 · 공식 기록 · 경기 비트 같음 ② A 판에 B 판 테스트만 갈아 끼우면 B 평가서와 비트 같음 ③ 보이는 테스트 밖 칸은 0.1 안 (테스트가 갈린 짝 ${b9.testDiff} · 남는 0.1이 옮겨 간 짝 ${b9.moved} · 어긋남 ${b9.bad.length})`
    + (b9.bad.length ? `\n     🔴 ${b9.bad.slice(0, 4).join(" · ")}` : ""));

  /* ══════════ 🧪 변이 ══════════ */
  if (fail === 0) {
    const m8 = await r8(MUT.PROM_COND);
    check(m8.bad.length > 0, `변이-PROM_COND(약속을 지키면 컨디션 +5) → R8이 빨간불 (어긋남 ${m8.bad.length} — ${m8.bad.slice(0, 3).join(" · ")})`);
    const m9 = await r9(MUT.TEST_REC);
    check(m9.bad.length > 0, `변이-TEST_REC(테스트 연습경기가 공식 기록에) → R9가 빨간불 (어긋남 ${m9.bad.length})`);
    const m9b = await r9(MUT.TEST_STAGE);
    check(m9b.bad.length > 0, `변이-TEST_STAGE(테스트 기술 점수가 무대 칸에 샘) → R9가 빨간불 (어긋남 ${m9b.bad.length} — ${m9b.bad.slice(0, 1).join("")})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
