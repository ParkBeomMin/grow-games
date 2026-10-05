/* ⚽ 더 윙어 II 1막 v2 — 🔢 **판 횟수** (27번 §3-3 · §7-0 · 38번 §1 · 15번 J · 39번 §2)
 *
 *   MC-1  엔진 — 모든 경기에서 내 판 **최소 1 · 상한 4 · 같은 경기 두 판 사이 ≥ 15분**
 *         (포지션 넷 × 전력 58:58 · 58:78(약) · 78:58(강 · 대승으로 일찍 끊김) · 능력치 40 · 56 · 90 · 컨디션 30 · 51 · 80)
 *   MC-2  보통 칸(58:58 · 능력치 56 · 컨디션 51 · 1막 buff)의 경기당 판 **2~3**(15번 J · 27번 R2 ②)
 *   MC-3  진짜 1막 한 판(리그 · 대회 · 연습경기) — 판 0번인 경기 0 · 상한 · 간격 위반 0
 *   MC-4  엔진 바뀐 줄 = 27번 §3-3 표 아홉 자리(새 11 · 바꿈 4 — `pickMine` 줄 나눔은 engineer 몫) + 29번 `autoP` 한 줄 — **그 밖 0줄**
 *         (`git diff HEAD -- engine.js`의 주석 · 빈 줄을 뺀 줄이 모두 허용 목록에 · 허용 목록 항목이 모두 나타남 · 판정 함수 0줄)
 *   + 변이: `MOMENT_CAP` 99 · `MOMENT_GAP` 0 · 최소 1번 줄을 지움(27번 §7-0 변이 칸 그대로)
 * 🔒 상한 4 · 간격 15 · 2~3은 27번 · 15번 J의 숫자 — 박은 값(엔진 상수를 읽지 않음)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 약 1분
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { load, mutsOK, PAGE_DIR } = require("./_load.js");
const { boot, runAct } = require("./_act.js");
const { execSync } = require("child_process");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const CAP = 4, GAP = 15, AVG = [2.0, 3.0];
const MUT = {
  CAP99: [[/const MOMENT_CAP = 4, MOMENT_GAP = 15;/, "const MOMENT_CAP = 99, MOMENT_GAP = 15;"]],
  GAP0: [[/const MOMENT_CAP = 4, MOMENT_GAP = 15;/, "const MOMENT_CAP = 4, MOMENT_GAP = 0;"]],
  NOMIN: [[/ {6}if \(me && mineCards === 0 && card\.k === slot\) return \{ who: me \};\n/, ""]],
};
{
  const bad = mutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 engine.js에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const WSRC = fs.readFileSync(path.join(PAGE_DIR, "world.js"), "utf8");
const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];

function mc1(E, n) {
  const X = new Function("window", `${WSRC}\nreturn window.W2World;`)({ WingerEngine: E });
  const bad = { zero: 0, cap: 0, gap: 0 };
  let matches = 0, sum = 0, avgCell = null;
  for (const pos of ["fw", "wg", "mf", "df"]) for (const [ts, os] of [[58, 58], [58, 78], [78, 58]]) for (const ab of [40, 56, 90]) for (const cond of [30, 51, 80]) {
    let cell = 0, cn = 0;
    for (let w = 0; w < n; w++) {
      const S = { pos, name: "나", stats: Object.fromEntries(K6.map((k) => [k, ab])), world: X.create(9000 + w, pos, "m") };
      E._t.seed(w * 131 + ab + ts); E._t.skill = 0.5;
      const r = E._t.playMatch({ xi: X.ourXI(S), teamStr: ts, oppStr: os, condition: cond });
      const mins = r.cards.filter((c) => c.mine).map((c) => c.min).sort((a, b) => a - b);
      matches += 1; cell += mins.length; cn += 1;
      if (mins.length === 0) bad.zero += 1;
      if (mins.length > CAP) bad.cap += 1;
      for (let i = 1; i < mins.length; i++) if (mins[i] - mins[i - 1] < GAP) { bad.gap += 1; break; }
    }
    if (ts === 58 && os === 58 && ab === 56 && cond === 51) avgCell = Object.assign(avgCell || {}, { [pos]: cell / cn });
    sum += cell;
  }
  return { bad, matches, mean: sum / matches, avgCell };
}

(async () => {
  const N = 60;
  const b = mc1(load(), N);
  const okAvg = b.avgCell && Object.values(b.avgCell).every((v) => v >= AVG[0] && v <= AVG[1]);
  check(b.bad.zero === 0 && b.bad.cap === 0 && b.bad.gap === 0, `MC-1. 🔢 엔진 경기 ${b.matches.toLocaleString("en-US")}판(포지션 4 × 전력 3 × 능력치 3 × 컨디션 3 × ${N}) — 판 0번 ${b.bad.zero} · 상한 ${CAP} 넘김 ${b.bad.cap} · 간격 ${GAP}분 미만 ${b.bad.gap}`);
  check(okAvg, `MC-2. ⚖️ 보통 칸(58:58 · 56 · 51)의 경기당 판 ${b.avgCell ? Object.entries(b.avgCell).map(([p, v]) => `${p} ${v.toFixed(2)}`).join(" · ") : "?"} ⊂ ${AVG[0]}~${AVG[1]}(15번 J)`);
  /* MC-3 — 진짜 한 판 */
  {
    const bad = [];
    let games = 0;
    for (const [seed, pos] of [[2101, "fw"], [2102, "df"], [2103, "mf"]]) {
      const env = boot({ seed, pos, operator: "normal", realScene: false });
      await runAct(env);
      for (const m of env.seen.live) {
        games += 1;
        const mins = (m.info.cards || []).filter((c) => c.mine).map((c) => c.min).sort((a, x) => a - x);
        if (!mins.length) bad.push(`${seed} ${m.week}주 판 0`);
        if (mins.length > CAP) bad.push(`${seed} ${m.week}주 판 ${mins.length}`);
        for (let i = 1; i < mins.length; i++) if (mins[i] - mins[i - 1] < GAP) bad.push(`${seed} ${m.week}주 간격 ${mins[i] - mins[i - 1]}분`);
      }
      env.w.close();
    }
    check(bad.length === 0 && games >= 40, `MC-3. 🏟️ 진짜 1막 세 판의 경기 ${games}번(리그 · 대회 · 연습경기) — 판 0번 · 상한 · 간격 위반 ${bad.length}` + (bad.length ? `\n     🔴 ${bad.slice(0, 3).join(" · ")}` : ""));
  }
  /* MC-4 — 엔진 바뀐 줄 */
  const ALLOW = [
    [/^\+\s*const MOMENT_CAP = 4, MOMENT_GAP = 15;/, "1 계수"],
    [/^\+\s*const scenes = \[\]; for \(let i = 0; i < n; i\+\+\) scenes\.push\(sceneOf\(atkW, defW\)\);/, "2 장면 미리"],
    [/^\+\s*let slot = 0; for \(let i = Math\.min\(6, n\); i >= 1; i--\)/, "3 최소 1번 자리"],
    [/^\+\s*if \(!slot\) \{ scenes\[5\] = rnd\(\) < atkW \? "atk" : "def"; slot = 6; \}/, "4 빈틈"],
    [/^-\s*let mineCards = 0, mineSuccess = 0;$/, "5 −"], [/^\+\s*let mineCards = 0, mineSuccess = 0, lastMine = -Infinity;$/, "5 +"],
    [/^-\s*const scene = sceneOf\(atkW, defW\);$/, "6 −"], [/^\+\s*const scene = scenes\[k - 1\];$/, "6 +"],
    [/^-\s*const \{ who \} = pickActor\(xi, (kind|"defend"), hits, true\);/, "7 −"], [/^\+\s*const \{ who \} = pickMine\((kind|"defend"), card\);/, "7 +"],
    [/^\+\s*(function pickMine\(kind, card\) \{|const me = xi\.find\(\(x\) => x\.me\);|if \(me && mineCards === 0 && card\.k === slot\) return \{ who: me \};|const off = mineCards >= MOMENT_CAP \|\| card\.min - lastMine < MOMENT_GAP;|if \(!off\) return pickActor\(xi, kind, hits, true\);|const pool = xi\.filter\(\(x\) => !x\.me\);|return pool\.length \? pickActor\(pool, kind, hits, false\) : pickActor\(xi, kind, hits, true\);|\})$/, "8 pickMine"],
    [/^-\s*mineCards \+= 1;$/, "9 −"], [/^\+\s*mineCards \+= 1; lastMine = card\.min;$/, "9 +"],
    [/^\+\s*autoP: \(kind, ab\) => \(kind === "defend" \? 1 - pConcede\(defW, ab\) : pFinish\(atkW, ab\)\),/, "29 autoP"],
  ];
  const mc4 = (diff) => {
    const lines = diff.split("\n").filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
      .filter((l) => { const b = l.slice(1).trim(); return b && !/^(\/\*|\*|\/\/)/.test(b); });
    const stray = lines.filter((l) => !ALLOW.some(([re]) => re.test(l)));
    const missing = ALLOW.filter(([re]) => !lines.some((l) => re.test(l))).map(([, n]) => n);
    return { n: lines.length, stray, missing };
  };
  const DIFF = execSync("git diff HEAD -- beta/winger2/engine.js", { cwd: path.join(PAGE_DIR, "..", ".."), encoding: "utf8" });
  {
    const r = mc4(DIFF);
    check(r.stray.length === 0 && r.missing.length === 0, `MC-4. ✂️ 엔진 바뀐 줄(주석 · 빈 줄 빼고) ${r.n}줄이 모두 27번 §3-3 아홉 자리 + 29번 autoP — 그 밖 ${r.stray.length}줄 · 빠진 자리 ${r.missing.length}` + (r.stray.length || r.missing.length ? `\n     🔴 ${r.stray.slice(0, 3).concat(r.missing).join(" · ")}` : ""));
  }
  if (fail === 0) {
    check(mc4(DIFF + "\n+    const judgeTweak = 1;\n").stray.length > 0, "변이-STRAY(엔진에 다른 줄 하나) → MC-4가 빨간불");
    const c = mc1(load(MUT.CAP99), N);
    check(c.bad.cap > 0, `변이-CAP99(상한 99) → MC-1이 빨간불 (상한 넘김 ${c.bad.cap})`);
    const g = mc1(load(MUT.GAP0), N);
    check(g.bad.gap > 0, `변이-GAP0(간격 0) → MC-1이 빨간불 (간격 위반 ${g.bad.gap})`);
    const z = mc1(load(MUT.NOMIN), N);
    check(z.bad.zero > 0, `변이-NOMIN(최소 1번 줄을 지움) → MC-1이 빨간불 (판 0번 경기 ${z.bad.zero})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
