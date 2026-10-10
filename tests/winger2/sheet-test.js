/* ⚽ 더 윙어 II 1막 — 📋 **스카우트 평가서** (22번 §4-2 · 3 · 24번 §4-4 · 12번 §6 · 25번 계약 7 · 26번 §2)
 *
 *   P-1  🫀 관리 칸(v3 · 44번 §1 · 43번 §4 #3 · J10) = `10 × clamp((c̄ − 20) ÷ 50, 0, 1) × λ` · c̄ = **공식 경기(리그 + 대회) 날 엔진에 넘긴 컨디션** 평균
 *        (연습경기 · 기술 테스트 뺌) · 0경기 0 — 산식 칸(표) + 진짜 한 판(엔진에 넘긴 값에서 다시 셈)
 *        🪦 옛 P-1(🎮 솜씨 칸 · READ_K · ρ · 바닥 8)과 P-1b(🤖만이면 4.0)는 44번 §1 퇴역 — 판 셋이 모두 감이라 손의 몫이 0(J9)
 *   P-2  ⚽ 기록 칸은 **경기당** — 같은 경기당 기록이면 경기 수가 두 배여도 칸이 같다(누적으로 되돌리면 🏆 대회 운이 기록 칸에 새요)
 *   P-3  🏋️ 몸 점수표(v2 · 34번 R15 둘째 값 · 38번 §5) — **88 위는 6.10으로 평평** · 77 = 5.06 · 문턱 사이는 선으로 · 줄지 않음
 *   P-4  칸은 **다섯**(몸 · 관리 · 기록 · 무대 · 테스트 — v3 `skill` → `care` · 43번 §4 #4 솜씨 칸 퇴역) — **추천서 칸 없음**(22번 R8 둘째 값)
 *   P-5  📏 구간 문턱 **67.4 · 60.3 · 53.7**(47번 §1 · 46번 §2 — 화면 한 자리 · 박은 값) · 문턱은 그 구간 · **0.1 아래**는 한 칸 아래
 *   P-6  📋 중간 평가서는 **그 시점의 사실만** — 17주엔 무대 · 테스트 0(대회 · 테스트 전) · 34주엔 무대가 대회 결과 · 테스트 0 · 다시 열어도 같은 장(얼림)
 *   P-7  ✉️ 문 · 엔딩 규칙표(v2 · 29번 §3-2 P1 (가)) — 문은 **따라간 가족 이야기**에 붙음(🏭 아버지 「중」 · 🎓 엄마 「상」 · ✉️ 할머니 「최상」 · 외형과 무관)
 *        · **그 구간에서만** 나오고 **깃발을 세웠을 때만** 열림 · 가족 이야기가 없으면 문 0 · 정확히 한 엔딩 · 숨은 굴림 0
 *   P-8  📋 중간 평가서(계약 7′ · 7′-a) — `tier` 없음 · 문 0 · 아직 칸 `open`(무대 10 · 테스트 4 — 끝나면 0) · 몸 칸 `left` = 11월 테스트 전까지
 *        **실제로 남은 훈련 주**(그 판에서 센 주) · `total` = 칸의 합(점수 0 · 아직 몫 안 더함)
 *   + 변이(파일 안)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { PAGE_DIR, pageMutsOK, mutsOKIn } = require("./_load.js");
const { boot, runAct, lsDump } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const SSRC = fs.readFileSync(path.join(PAGE_DIR, "sheet.js"), "utf8");
const sheetOf = (src) => new Function("window", `${src}\nreturn window.W2Sheet;`)({});
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
const T = { top: 67.4, high: 60.3, mid: 53.7 };   // 🔒 47번 §1 · 46번 §2(새 기준 판 「늘 확정」 · 화면 한 자리) · 박은 값
const COLS = ["body", "care", "record", "stage", "test"];
const CARE = (avg, n) => (n > 0 ? 10 * Math.min(1, Math.max(0, (avg - 20) / 50)) : 0);   // 🔒 44번 §1 산식 — 박은 꼴(λ 1)

const MUT_S = {
  CUMUL: [[/const perGame = games > 0 \? raw \/ games : 0;/, "const perGame = games > 0 ? raw / 14 : 0;"]],
  BODYUP: [[/\[77, 5\.06\], \[88, 6\.10\]\]/, "[77, 5.06], [88, 6.10], [100, 6.6]]"]],
  RECO: [[/ {4}const tier = final \? tierOf\(total\) : null;/, '    cols.push({ k: "reco", label: "✉️ 추천서", v: 0, max: 5, note: "" });\n    const tier = final ? tierOf(total) : null;']],
  TIER: [[/T: \{ top: 67\.4, high: 60\.3, mid: 53\.7 \},/, "T: { top: 67.4, high: 60.0, mid: 53.7 },"]],
  SPAN60: [[/CARE_LO: 20, CARE_SPAN: 50,/, "CARE_LO: 20, CARE_SPAN: 60,"]],
  SKILLBACK: [[/\{ k: "care", label: "🫀 관리"/, '{ k: "skill", label: "🎮 솜씨"']],
  MIDTIER: [[/const tier = final \? tierOf\(total\) : null;/, "const tier = tierOf(total);"]],
  MIDOPEN0: [[/for \(const c of cols\) if \(open\[c\.k\] > 0\) c\.open = open\[c\.k\];/, "/* 아직 칸 안 적음 */"]],
  DOOR: [[/open: !!\(S\.story && S\.story\.door\)/, "open: true"]],
};
const MUT_G = {
  STAGE_TBL: { "sheet.js": [[/STAGE_PTS: \[0, 3, 5, 7, 8, 10\],/, "STAGE_PTS: [0, 2, 4, 6, 8, 10],"]] },
  MID_NOFREEZE: { "game.js": [[/let m = \(S\.mid \|\| \[\]\)\.find\(\(x\) => x\.week === S\.week\);/, "let m = null;"]] },
  /* 43번 §4 #3 변이 — 연습경기 날 컨디션도 관리 칸에 */
  PRACTICE_IN: { "game.js": [[/const R = S\.record; {2,}(\/\/ 연습경기)/, "const R = S.record; R.cSum += S.cond; R.cN += 1; $1"]] } };
{
  const bad = mutsOKIn(SSRC, MUT_S, "sheet.js").concat(pageMutsOK(MUT_G));
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const apply = (src, muts) => muts.reduce((s, [re, rep]) => s.replace(re, rep), src);
const mkS = (o) => Object.assign({ pos: "wg", preset: "jiho", gender: "m", trust: 0, stats: Object.fromEntries(K6.map((k) => [k, 60])),
  record: { apps: 14, g: 3, a: 4, d: 6, cs: 2, sN: 0, sSum: 0 }, world: { cup: { done: false } }, leagueChamp: false, test: null, story: {} }, o);

(async () => {
  const SH = sheetOf(SSRC);
  /* ══════════ P-2 ══════════ */
  const p2 = (Sh) => {
    const bad = [];
    for (const pos of ["fw", "wg", "mf", "df"]) for (const [g, a, d] of [[3, 2, 4], [1, 5, 9], [6, 1, 2]]) {
      const one = Sh.compute(mkS({ pos, record: { apps: 12, g, a, d, sN: 0 } }), true).cols.find((c) => c.k === "record").v;
      const two = Sh.compute(mkS({ pos, record: { apps: 24, g: 2 * g, a: 2 * a, d: 2 * d, sN: 0 } }), true).cols.find((c) => c.k === "record").v;
      if (Math.abs(one - two) > 1e-9) bad.push(`${pos} ${g}/${a}/${d}: 12경기 ${one} ↔ 24경기 ${two}`);
    }
    return bad;
  };
  const b2 = p2(SH);
  check(b2.length === 0, `P-2. ⚽ 기록 칸은 **경기당** — 경기당 기록이 같으면 경기 수가 12 → 24여도 칸이 같다 (포지션 넷 × 기록 셋)` + (b2.length ? `\n     🔴 ${b2.slice(0, 3).join(" · ")}` : ""));
  check(p2(sheetOf(apply(SSRC, MUT_S.CUMUL))).length > 0, `변이-CUMUL(기록을 누적으로 — 경기 수에 비례) → P-2가 빨간불`);

  /* ══════════ P-3 ══════════ */
  const p3 = (Sh) => {
    const pts = [40, 45, 52, 60, 68, 77, 82, 88, 94, 100].map((v) => Sh.bodyPt(v));
    const mono = pts.every((p, i) => i === 0 || p >= pts[i - 1] - 1e-12);
    const flat = [88, 94, 100].every((v) => Math.abs(Sh.bodyPt(v) - 6.10) < 1e-9);
    const a77 = Math.abs(Sh.bodyPt(77) - 5.06) < 1e-9 && Math.abs(Sh.bodyPt(82.5) - (5.06 + 6.10) / 2) < 1e-9;
    /* 한 칸을 88에서 100까지 밀어도 몸 칸이 그대로 — 「몰빵의 반대 압력」(24번 §4-4 · 34번 R15) */
    const s88 = Sh.compute(mkS({ stats: Object.assign(Object.fromEntries(K6.map((k) => [k, 52])), { shoot: 88 }) }), true).cols[0].v;
    const s100 = Sh.compute(mkS({ stats: Object.assign(Object.fromEntries(K6.map((k) => [k, 52])), { shoot: 100 }) }), true).cols[0].v;
    return { ok: mono && flat && a77 && s88 === s100, pts, s88, s100 };
  };
  const b3 = p3(SH);
  check(b3.ok, `P-3. 🏋️ 몸 점수표 — 88 · 94 · 100에서 6.10으로 평평 · 77 = 5.06 · 82.5 = 5.58(선) · 줄지 않음 · 슈팅 88 → 100으로 밀어도 몸 칸 ${b3.s88} = ${b3.s100}`);
  check(!p3(sheetOf(apply(SSRC, MUT_S.BODYUP))).ok, `변이-BODYUP(88 위를 6.6까지 올림) → P-3이 빨간불`);

  /* ══════════ P-4 · P-5 ══════════ */
  const p4 = (Sh) => JSON.stringify(Sh.compute(mkS({}), true).cols.map((c) => c.k)) === JSON.stringify(COLS) && JSON.stringify(Sh.compute(mkS({}), false).cols.map((c) => c.k)) === JSON.stringify(COLS);
  check(p4(SH), `P-4. 📋 칸은 다섯 — ${COLS.join(" · ")} · **추천서 칸 없음**(중간 · 최종 둘 다)`);
  check(!p4(sheetOf(apply(SSRC, MUT_S.RECO))), `변이-RECO(추천서 칸을 되살림) → P-4가 빨간불`);
  check(!p4(sheetOf(apply(SSRC, MUT_S.SKILLBACK))), `변이-SKILLBACK(🎮 솜씨 칸을 남김 — 43번 §4 #4) → P-4가 빨간불`);
  /* P-4b — 퇴역한 재료를 안 읽음(43번 §4 #4): 평가서 소스(주석 밖)에 READ_K · SKILL_ · sSum · sN · sAuto 0 */
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const p4b = (src) => (code(src).match(/READ_K|SKILL_[A-Z]+|\bsSum\b|\bsN\b|\bsAuto\b/g) || []);
  check(p4b(SSRC).length === 0, `P-4b. 🪦 솜씨 칸 퇴역 — sheet.js 코드에 READ_K · SKILL_* · sSum · sN · sAuto 읽기 0 (${p4b(SSRC).join(",") || "없음"})`);
  check(p4b(SSRC.replace("const cN = Math.max(0,", "const sN = Number(rec.sN) || 0; const cN = Math.max(0,")).length > 0, `변이 — 평가서가 옛 \`rec.sN\`을 다시 읽으면 → P-4b가 빨간불`);
  /* P-1 산식 칸 — c̄ · 경기 수를 넣어 */
  const p1 = (Sh) => {
    const bad = [];
    for (const [avg, n] of [[10, 5], [20, 5], [45, 13], [56.38, 13], [70, 9], [95, 14], [60, 0]]) {
      const v = Sh.compute(mkS({ record: { apps: Math.max(n, 3), g: 1, a: 1, d: 1, cN: n, cSum: avg * n } }), true).cols.find((c) => c.k === "care").v;
      if (Math.abs(v - CARE(avg, n)) >= 0.1) bad.push(`c̄ ${avg} · ${n}경기: ${v} ≠ ${CARE(avg, n).toFixed(2)}`);
    }
    return bad;
  };
  const b1 = p1(SH);
  check(b1.length === 0, `P-1. 🫀 관리 칸 산식 — c̄ 10 · 20 · 45 · 56.38 · 70 · 95 · 0경기 → 0 · 0 · 5 · 7.3 · 10 · 10 · 0 = 10 × clamp((c̄ − 20) ÷ 50, 0, 1)` + (b1.length ? `\n     🔴 ${b1.join(" · ")}` : ""));
  check(p1(sheetOf(apply(SSRC, MUT_S.SPAN60))).length > 0, `변이-SPAN60(가득 문턱 70 → 80) → P-1이 빨간불`);
  /* 합계는 늘 0.1 단위라 문턱과 「0.1 아래」를 0.1 단위 정수로 만들어 넣어요(부동소수 69.80000000000001 없이) */
  const down = (x) => (Math.round(x * 10) - 1) / 10;
  const p5 = (Sh) => [[T.top, "top"], [down(T.top), "high"], [T.high, "high"], [down(T.high), "mid"], [T.mid, "mid"], [down(T.mid), "low"], [0, "low"], [100, "top"]]
    .every(([v, want]) => Sh.tierOf(v) === want);
  check(p5(SH), `P-5. 📏 구간 문턱 ${T.top} · ${T.high} · ${T.mid}(화면 한 자리) — 문턱은 그 구간 · 0.1 아래(${down(T.top)} · ${down(T.high)} · ${down(T.mid)})는 한 칸 아래`);
  check(!p5(sheetOf(apply(SSRC, MUT_S.TIER))), `변이-TIER(「상」 문턱을 60.0으로) → P-5가 빨간불`);

  /* ══════════ P-7 — 문 · 엔딩 규칙표(가족 이야기) ══════════ */
  /* 가족 이야기 sid는 `W2Story.famSid(S)`가 줘요 — 표만 보게 그 자리를 갈아 끼움(`S.__fam`) */
  const sheetFam = (src) => new Function("window", `${src}\nreturn window.W2Sheet;`)({ W2Story: { famSid: (S) => S.__fam || null } });
  const p7 = (Sh) => {
    const bad = [];
    const DOOR = { father: ["mid", "semi"], apply: ["high", "univ"], letter: ["top", "abroad"] };   // 🔒 29번 §3-2 — 박은 값
    const BASE = { top: "pro1", high: "pro2", mid: "trainee", low: "leave" };
    for (const fam of [null, "father", "apply", "letter"]) for (const preset of ["jiho", "doyun", "haram"]) for (const g of ["m", "f"])
      for (const tier of ["top", "high", "mid", "low"]) for (const flag of [false, true]) {
        const S = mkS({ preset, gender: g, story: { door: flag }, __fam: fam });
        const doors = Sh.doorsOf(S, tier);
        const [dt, did] = fam ? DOOR[fam] : [null, null];
        const want = fam && tier === dt ? [[BASE[tier], true], [did, flag]] : [[BASE[tier], true]];
        if (JSON.stringify(doors.map((d) => [d.id, d.open])) !== JSON.stringify(want)) bad.push(`${fam}·${preset}-${g} ${tier} 깃발 ${flag}: ${JSON.stringify(doors.map((d) => [d.id, d.open]))}`);
        for (const pick of doors.map((d) => d.id).concat([null])) {
          const e1 = Sh.ending(S, tier, pick), e2 = Sh.ending(S, tier, pick);
          const exp = fam && tier === dt && flag && pick === did ? did : BASE[tier];
          if (e1.id !== exp || JSON.stringify(e1) !== JSON.stringify(e2)) bad.push(`${fam}·${preset}-${g} ${tier} ${pick}: ${e1.id} ≠ ${exp}`);
          if (e1.tier !== tier) bad.push(`엔딩 구간 ${e1.tier} ≠ ${tier}`);
        }
      }
    return bad;
  };
  const b7 = p7(sheetFam(SSRC));
  check(b7.length === 0, `P-7. ✉️ 문 · 엔딩 규칙표 — 가족 이야기(없음 · 아버지 · 엄마 · 할머니) × 외형 셋 × 성별 × 네 구간 × 깃발 × 고른 문: 문은 **따라간 이야기의 구간에서만** · **깃발을 세웠을 때만** · 외형과 무관 · 이야기가 없으면 문 0 · 엔딩이 정확히 하나(숨은 굴림 0)` + (b7.length ? `\n     🔴 ${b7.slice(0, 3).join(" · ")}` : ""));
  check(p7(sheetFam(apply(SSRC, MUT_S.DOOR))).length > 0, `변이-DOOR(깃발 없이도 문이 열림) → P-7이 빨간불`);
  {
    /* 외형으로 문을 고르는 옛 규칙(29번 §8-0 변이) */
    const OLD = SSRC.replace(/const doorOf = \(S\) => \{ const sid = famSidOf\(S\); return sid \? DOOR\[sid\] \|\| null : null; \};/,
      'const doorOf = (S) => DOOR[{ jiho: "father", doyun: "apply", haram: "letter" }[S.preset]] || null;');
    check(OLD !== SSRC && p7(sheetFam(OLD)).length > 0, `변이-PRESET_DOOR(외형으로 문을 고름 — 옛 \`DOOR[preset]\`) → P-7이 빨간불`);
  }

  /* ══════════ P-8 — 중간 평가서(계약 7′) ══════════ */
  const p8 = (Sh) => {
    const bad = [];
    const cases = [
      [{ week: 17, world: { cup: { done: false } }, test: null }, { stage: 10, test: 4 }],
      [{ week: 34, world: { cup: { done: true, stage: 2, name: "푸른잔디배" } }, leagueChamp: false, test: null }, { stage: 0, test: 4 }],
    ];
    for (const [o, wantOpen] of cases) {
      const m = Sh.compute(mkS(o), false);
      const sum = Math.round(m.cols.reduce((a2, c) => a2 + c.v * 10, 0));
      if (m.tier !== null || (m.doors || []).length) bad.push(`${o.week}주 구간 ${m.tier} · 문 ${(m.doors || []).length}`);
      if (Math.round(m.total * 10) !== sum) bad.push(`${o.week}주 합계 ${m.total} ≠ 칸 합 ${sum / 10}`);
      for (const k of ["stage", "test"]) {
        const c = m.cols.find((x) => x.k === k);
        const got = c.open || 0;
        if (Math.abs(got - wantOpen[k]) > 1e-9) bad.push(`${o.week}주 ${k} 아직 ${got} ≠ ${wantOpen[k]}`);
      }
    }
    const f = Sh.compute(mkS({ test: { tech: 3, rating: 7 }, world: { cup: { done: true, stage: 1 } } }), true);
    if (!f.tier || f.cols.some((c) => c.open)) bad.push("최종 평가서에 구간이 없거나 아직 칸이 남음");
    return bad;
  };
  const b8 = p8(SH);
  check(b8.length === 0, `P-8. 📋 중간 평가서(7′) — 구간 도장 없음 · 문 0 · 아직 칸 \`open\` 17주 무대 10 · 테스트 4 / 34주(대회 뒤) 무대 0 · 테스트 4 · 합계 = 칸의 합 · 최종엔 구간 있고 아직 칸 없음` + (b8.length ? `\n     🔴 ${b8.join(" · ")}` : ""));
  check(p8(sheetOf(apply(SSRC, MUT_S.MIDTIER))).length > 0, `변이-MIDTIER(중간 평가서에 구간 도장) → P-8이 빨간불`);
  check(p8(sheetOf(apply(SSRC, MUT_S.MIDOPEN0))).length > 0, `변이-MIDOPEN0(아직 칸을 안 적음 — 0점처럼 보임) → P-8이 빨간불`);

  /* ══════════ P-1 · P-6 — 진짜 한 판 ══════════ */
  async function oneAct(muts, auto, hand) {
    const env = boot({ seed: 515, pos: "df", gender: "f", auto, muts, hand });
    const r = await runAct(env);
    const S = r.S;
    const official = env.seen.boards.filter((b) => b.week !== 35);
    const test = env.seen.boards.filter((b) => b.week === 35);
    env.w.close();
    return { S, official, test, sheet: S.sheet };
  }
  {
    /* P-1r — 진짜 한 판: 엔진에 넘긴 컨디션(공식 경기 = 연습경기 주 35 밖)에서 다시 셈 */
    const careRun = async (muts) => {
      const env = boot({ seed: 515, pos: "df", gender: "f", operator: "normal", muts });
      const rr = await runAct(env);
      const off = env.seen.live.filter((m) => m.week !== 35);
      const avg = off.reduce((a2, m) => a2 + m.cfg.condition, 0) / off.length;
      const c = rr.S.sheet.cols.find((x) => x.k === "care");
      env.w.close();
      return { off: off.length, avg, c, want: CARE(avg, off.length) };
    };
    const cr = await careRun(null);
    check(cr.c.detail.games === cr.off && Math.abs(cr.c.v - cr.want) < 0.1 && cr.off > 0,
      `P-1r. 🫀 진짜 한 판 — 공식 경기 ${cr.off}번에 엔진이 받은 컨디션 평균 ${cr.avg.toFixed(2)} → 관리 칸 ${cr.c.v} ≈ ${cr.want.toFixed(2)} · 칸 경기 수 ${cr.c.detail.games} · 글 「${cr.c.note}」`);
    const cm = await careRun(MUT_G.PRACTICE_IN);
    check(cm.c.detail.games !== cm.off, `변이-PRACTICE_IN(연습경기 날도 셈 — 43번 §4 #3) → P-1r이 빨간불 (칸 경기 수 ${cm.c.detail.games} ≠ 공식 ${cm.off})`);
    /* P-6 — 중간 평가서(대회가 조별을 넘은 판을 찾아서 — 무대 0끼리 견주면 「같다」가 공짜예요) */
    const STAGE = [0, 3, 5, 7, 8, 10];        // 🔒 21번 §3-3 — 박은 값
    let P6 = null;
    /* 🎲 자동 판(s 0.5)은 대회 16강이 20판에 3판꼴(실측) — 조별을 넘은 판이 나올 때까지 훑어요 */
    for (let seed = 515; seed < 555; seed++) {
      const weeks = [];
      const K = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
      const env6 = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], auto: true,
        policy: { home: (Sx) => { weeks.push(Sx.week); return Sx.cond < 50 ? { k: "rest" } : { k: "train", stat: K[Sx.week % 6] }; } } });
      const r6 = await runAct(env6);
      env6.w.close();
      /* 몸 칸 `left` — 그 주부터 11월 공개 테스트(35주)까지 **이 판에서 실제로 고르기를 한 주**의 수 */
      const leftReal = (w) => weeks.filter((x) => x >= w && x <= 35).length;
      if ((r6.S.world.cup.stage || 0) >= 1) { P6 = { seed, S: r6.S, leftReal }; break; }
      if (!P6) P6 = { seed, S: r6.S, weak: true, leftReal };
    }
    {
      const S6 = P6.S;
      const m17 = (S6.mid || []).find((m) => m.week === 17), m34 = (S6.mid || []).find((m) => m.week === 34);
      const v = (m, k) => m.cols.find((c) => c.k === k).v;
      const want34 = Math.min(10, STAGE[S6.world.cup.stage || 0] + (S6.leagueChamp ? 1 : 0));
      const ok6 = !P6.weak && !!m17 && !!m34 && v(m17, "stage") === 0 && v(m17, "test") === 0 && v(m34, "test") === 0 && v(m34, "stage") === want34
        && v(S6.sheet, "stage") === want34 && v(S6.sheet, "test") > 0;
      const lf = [m17, m34].map((m) => m && m.cols.find((c) => c.k === "body").left);
      const lw = [P6.leftReal(17), P6.leftReal(34)];
      check(lf[0] === lw[0] && lf[1] === lw[1] && lw[0] > lw[1], `P-8b. 🗓️ 몸 칸 \`left\` == 11월 공개 테스트 전까지 실제로 남은 훈련 주 — 17주 ${lf[0]} = ${lw[0]} · 34주 ${lf[1]} = ${lw[1]}(그 판에서 고르기를 한 주를 셈 · 15번 R21 · 계약 7′)`);
      check(ok6, `P-6. 📋 중간 평가서는 그 시점의 사실만(시드 ${P6.seed} · 대회 ${S6.world.cup.stage}단계${S6.leagueChamp ? " · 리그 우승" : ""}) — 17주: 무대 ${m17 ? v(m17, "stage") : "?"}(대회 전) · 테스트 ${m17 ? v(m17, "test") : "?"} · 34주: 무대 ${m34 ? v(m34, "stage") : "?"} = ${want34} · 테스트 ${m34 ? v(m34, "test") : "?"}(11월 전) · 최종: 무대 ${v(S6.sheet, "stage")} · 테스트 ${v(S6.sheet, "test")}`
        + (P6.weak ? "\n     🚧 시드 40판 모두 대회가 조별에서 끝남 — 무대 칸을 견줄 판이 없어요" : ""));
      if (ok6) {
        const envm = boot({ seed: P6.seed, pos: ["fw", "wg", "mf", "df"][P6.seed % 4], auto: true, muts: MUT_G.STAGE_TBL });
        const rm = await runAct(envm);
        envm.w.close();
        const mm = (rm.S.mid || []).find((m) => m.week === 34);
        check(!!mm && v(mm, "stage") !== want34, `변이-STAGE_TBL(16강 · 8강 · 4강을 한 점씩 내림) → P-6이 빨간불 (34주 무대 ${mm ? v(mm, "stage") : "?"} ≠ ${want34})`);
      }
      /* 🧊 다시 열어도 같은 장 — 17주 평가서 앞에서 창을 닫고 이어하기 → 같은 장 · 세이브에 그 주의 장이 **하나** */
      const freeze = async (muts) => {
        const pos = ["fw", "wg", "mf", "df"][P6.seed % 4];
        const A1 = boot({ seed: P6.seed, pos, auto: true, muts, policy: { sheetHang: (x) => !x.final } });
        await runAct(A1, { until: (S, e) => e.seen.sheet.length >= 1, stall: 300 });
        const first = A1.seen.sheet[0];
        const keys = lsDump(A1.w);
        A1.w.close();
        const B1 = boot({ seed: P6.seed, pos, auto: true, muts, keys, policy: { sheetHang: (x) => !x.final } });
        const rb = await runAct(B1, { entry: "continue", until: (S, e) => e.seen.sheet.length >= 1, stall: 300 });
        const again = B1.seen.sheet[0];
        const n17 = ((rb.S && rb.S.mid) || []).filter((m) => m.week === 17).length;
        B1.w.close();
        const pick = (x) => x && JSON.stringify([x.week, x.cols.map((c) => [c.k, c.v, c.note]), x.total, x.tier]);
        return { first, again, n17, same: !!first && !!again && pick(first) === pick(again) };
      };
      const fz = await freeze(null);
      check(fz.same && fz.n17 === 1, `P-6b. 🧊 17주 평가서 앞에서 닫고 이어하면 **같은 장**(합계 ${fz.first ? fz.first.total : "?"} ↔ ${fz.again ? fz.again.total : "?"}) · 세이브에 17주 장이 ${fz.n17}개`);
      const fzm = await freeze(MUT_G.MID_NOFREEZE);
      check(!(fzm.same && fzm.n17 === 1), `변이-MID_NOFREEZE(열 때마다 새로 매김) → P-6b가 빨간불 (17주 장 ${fzm.n17}개)`);
    }
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
