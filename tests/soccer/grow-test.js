/* ⚡ 실전 성장이 그 경기에 실제로 한 일을 따라가는지 본다.
 *
 * 증상: 1골 0도움 0수비인 경기에서 수비가 올랐다. 후보에서 아무거나 뽑고 있었다.
 *
 * 여기서 재는 건 "골을 넣으면 슛이 오르나"가 아니라 **분포**다.
 * 바닥 무게를 남겨 뒀으므로 관계없는 칸도 가끔은 오른다 — 그게 설계다.
 * 그러니 단정할 수 있는 건 "그 경기에 한 일 쪽이 확실히 더 자주 오른다"이다.
 *
 * 무게표·확률식은 소스에서 정규식으로 뽑아 그대로 실행한다. 값을 옮겨 적으면
 * 원본이 바뀌어도 초록이 뜬다. 직접 eval은 쓰지 않고 new Function으로 감싼다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");

const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  statDefs: grab(GAME, /const STAT_DEFS = \[[\s\S]*?\n\];/),
  posAxisTbl: grab(SRC, /const POS_AXIS = \{[\s\S]*?\n  \};/) || grab(GAME, /const POS_AXIS = \{[\s\S]*?\n\};/),
  posAxisFn: grab(SRC, /function posAxis\(act, pos\) \{[\s\S]*?\n  \}/),
  base: grab(SRC, /const GROW_BASE = [^;]+;/),
  weight: grab(SRC, /const growWeight = \{[\s\S]*?\n    \};/),
  growP: grab(SRC, /const growP = clamp\([\s\S]*?\n    \);/),
  didAxis: grab(SRC, /const didAxis = posAxis\([^;]+;/),
  // 뽑는 코드 자체도 소스에서 가져온다 — 여기가 바로 버그가 있던 자리다
  pick: grab(SRC, /let roll = Math\.random\(\) \* total;[\s\S]*?break; \} \}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* 한 경기를 넣으면 어떤 칸이 올랐는지 키를 돌려준다. 상한은 없다고 본다. */
const drawOnce = new Function(
  "info", "S", "clamp", "Math_",
  `${parts.statDefs}
   ${parts.posAxisTbl}
   ${parts.posAxisFn}
   ${parts.base}
   ${parts.weight}
   const pool = STAT_DEFS;
   const total = pool.reduce((sum, d) => sum + growWeight[d.key], 0);
   ${parts.pick}
   return d.key;`
);

/* 성장 확률은 이제 "상위 3분의 1(topThird)"을 봐요 — 개인 순위표가 9줄에서
 * 리그 전 선발 67줄로 늘면서, "3위 안"이 사실상 닿을 수 없는 문턱이 됐거든요.
 * 여기서는 그 참·거짓을 밖에서 넣어 줍니다. */
const growPOf = new Function(
  "info", "S", "rank", "topThird", "clamp",
  `${parts.posAxisTbl}
   ${parts.posAxisFn}
   ${parts.didAxis}
   ${parts.growP}
   return growP;`
);

const S = { pos: "fw" };
const N = 20000;
const tally = (info) => {
  const c = {};
  for (let i = 0; i < N; i++) { const k = drawOnce(info, S, clamp); c[k] = (c[k] || 0) + 1; }
  return c;
};
const pct = (c, k) => ((c[k] || 0) / N * 100);

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ① 범민 님이 본 그 경기 — 1골 0도움 0수비
const goalOnly = tally({ myGoals: 1, assists: 0, defense: 0 });
console.log(`   1골 0도움 0수비 → ${Object.keys(goalOnly).map((k) => `${k} ${pct(goalOnly, k).toFixed(1)}%`).join(" · ")}`);
check(pct(goalOnly, "shoot") > 40, `골만 넣은 경기는 슛이 가장 자주 오른다 (${pct(goalOnly, "shoot").toFixed(1)}%)`);
check(pct(goalOnly, "shoot") > pct(goalOnly, "defense") * 4,
  `수비보다 슛이 4배 넘게 자주 오른다 (슛 ${pct(goalOnly, "shoot").toFixed(1)}% vs 수비 ${pct(goalOnly, "defense").toFixed(1)}%)`);
check(pct(goalOnly, "defense") > 0,
  `그래도 수비가 아주 안 오르지는 않는다 — 90분을 뛰었으니까 (${pct(goalOnly, "defense").toFixed(1)}%)`);

// ── ② 도움만 한 경기
const assistOnly = tally({ myGoals: 0, assists: 2, defense: 0 });
check(pct(assistOnly, "pass") > pct(assistOnly, "shoot"),
  `도움만 한 경기는 패스가 슛보다 자주 오른다 (패스 ${pct(assistOnly, "pass").toFixed(1)}% vs 슛 ${pct(assistOnly, "shoot").toFixed(1)}%)`);

// ── ③ 수비만 한 경기
const defOnly = tally({ myGoals: 0, assists: 0, defense: 4 });
check(pct(defOnly, "defense") > pct(defOnly, "shoot") * 3,
  `수비만 한 경기는 수비가 슛보다 3배 넘게 오른다 (수비 ${pct(defOnly, "defense").toFixed(1)}% vs 슛 ${pct(defOnly, "shoot").toFixed(1)}%)`);

// ── ④ 아무 일도 없던 경기는 어느 쪽으로도 기울지 않는다
const nothing = tally({ myGoals: 0, assists: 0, defense: 0 });
const spread = Math.max(...Object.values(nothing)) / Math.min(...Object.values(nothing));
check(spread < 2.6, `무득점·무수비 경기는 특정 칸으로 몰리지 않는다 (최대/최소 ${spread.toFixed(2)}배)`);

// ── ⑤ 확률이 결과와 활약을 본다
const p = (info, rank) => growPOf(info, S, rank, rank <= 3, clamp);
const dull = p({ myGoals: 0, assists: 0, defense: 0, res: "L", momentRes: "miss" }, 9);
const great = p({ myGoals: 2, assists: 1, defense: 1, res: "W", momentRes: "perfect" }, 1);
console.log(`   확률 — 진 경기 무활약 ${(dull * 100).toFixed(1)}% · 이긴 경기 대활약 ${(great * 100).toFixed(1)}%`);
check(great > dull * 2, `활약한 승리가 무활약 패배보다 2배 넘게 자주 성장한다`);
check(dull > 0, `못한 경기도 0은 아니다 (${(dull * 100).toFixed(1)}%)`);
check(great <= 0.25 + 1e-9, `상한을 넘지 않는다 (${(great * 100).toFixed(1)}%)`);

const win = p({ myGoals: 1, assists: 0, defense: 0, res: "W", momentRes: null }, 4);
const loss = p({ myGoals: 1, assists: 0, defense: 0, res: "L", momentRes: null }, 4);
check(win > loss, `같은 활약이면 이긴 경기가 더 자주 성장한다 (${(win * 100).toFixed(1)}% vs ${(loss * 100).toFixed(1)}%)`);

/* ── 변이 검증 — 무게를 무시하고 균등하게 뽑으면 반드시 빨간불이 떠야 한다.
 * 이게 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const flatDraw = new Function(
  "info", "S", "clamp",
  `${parts.statDefs}
   const pool = STAT_DEFS;
   return pool[Math.floor(Math.random() * pool.length)].key;`
);
let flatShoot = 0;
for (let i = 0; i < N; i++) if (flatDraw({ myGoals: 1, assists: 0, defense: 0 }, S, clamp) === "shoot") flatShoot++;
const flatPct = flatShoot / N * 100;
check(flatPct < 40, `변이 검증 — 균등 추첨으로 되돌리면 슛이 ${flatPct.toFixed(1)}%로 떨어져 ①이 무너진다`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
