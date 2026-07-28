/* 주간 차트 승률 — 이 게임에서 실제로 매주 돌아가는 경로다.
 *
 * 여기가 사각지대였다. 판매량(axis)·수상 곡선(curve)·헤드라인(report)은 다 검사했는데,
 * 정작 그 앞단인 weeklyChart()의 점수 산식은 아무도 안 돌려봤다. 그래서
 * "라이벌이 해마다 3%씩 강해진다"를 넣고도, 팬덤 항에 상한이 없어서 훈련을 아예
 * 멈춘 플레이어가 해마다 라이벌을 **더 크게** 따돌리는 상태를 못 잡았다.
 *
 * 이 파일은 실제 커리어를 통째로 굴린다 — 능력치를 고정한 채 9년 × 2컴백 × 6주를
 * 돌면서 매주 순위를 매기고, 팬덤을 그 결과대로 불리고, 연말 결산까지 반영한다.
 * 산식은 전부 소스에서 정규식으로 뽑아 쓴다 (복사하면 원본과 어긋나도 초록이 뜬다).
 * 직접 eval("const x = …")은 선언이 eval 자기 스코프에 갇혀서 항상 undefined가 되니
 * new Function(...)으로 감싸고 return 한다 — axis-test.js와 같은 방식이다. */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/idol/career.js", "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------- 산식 추출 ----------
const capM = SRC.match(/const FANDOM_CAP = [^;]+;/);
const scoreM = SRC.match(/const myScore =[\s\S]*?;\n/);
const rivalM = SRC.match(/function rollRivals\(\)[\s\S]*?\n  \}/);
const salesM = SRC.match(/const stage = [^;]+;\s*const cbSales = [^;]+;/);
const hypeM = SRC.match(/const hype = clamp\([^;]+;/);
const weekFanM = SRC.match(/dFan = randInt\([^)]*\)/g);
const yearFanM = SRC.match(/const dFan = Math\.round\([^;]+;/);
const missing = Object.entries({ capM, scoreM, rivalM, salesM, hypeM, weekFanM, yearFanM })
  .filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 산식을 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }
if (weekFanM.length !== 3) { console.log(`❌ 주간 팬덤 증감이 3갈래가 아니에요 (${weekFanM.length}개)`); process.exit(1); }

// 재능이 기본값(1.3)이면 clutch는 1이다. 능력치 축만 보려고 1로 고정한다.
const clutch = () => 1;
const POS_INFO = { vocal: { name: "보컬", stat: "vocal" } };
const RIVAL_GROUPS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];

const scoreFn = new Function("S", "POS_INFO", "clutch", "miniBonus", "rand",
  `${capM[0]} ${scoreM[0]} return myScore;`);
const rollRivals = new Function("rand", "RIVAL_GROUPS",
  `let S; ${rivalM[0]}; return (s) => { S = s; return rollRivals(); };`)(rand, RIVAL_GROUPS);
const salesFn = new Function("S", "act", "rand", `${salesM[0]} return cbSales;`);
const hypeFn = new Function("act", "agePen", "clamp", `${hypeM[0]} return hype;`);
const yearFanFn = new Function("hype", "wins", `${yearFanM[0]} return dFan;`);
const weekFanFn = weekFanM.map((s) => new Function("randInt", `let dFan; ${s}; return dFan;`));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// ---------- 1) 팬덤 항이 실제로 포화하는가 ----------
/* 팬덤은 활동만 해도 저절로 쌓인다. 여기에 상한이 없으면 능력치가 축이 아니라
 * '오래 버티기'가 축이 된다 — 예전 버그가 정확히 그거였다. */
const flat = (fandom) => {
  const S = { pos: "vocal", condition: 70, fandom,
    stats: { vocal: 100, dance: 100, rap: 100, charm: 100, stamina: 100 } };
  let s = 0; const N = 4000;
  for (let i = 0; i < N; i++) s += scoreFn(S, POS_INFO, clutch, 0, rand);
  return s / N;
};
const s0 = flat(0), sBig = flat(1e6), sHuge = flat(1e9);
check(sBig - s0 < 20, `팬덤이 무한히 커져도 점수 기여가 20점을 못 넘는다 (+${(sBig - s0).toFixed(1)})`);
check(Math.abs(sHuge - sBig) < 1, `팬덤 100만과 10억의 점수 차가 없다 — 포화했다 (${(sHuge - sBig).toFixed(2)})`);

// ---------- 2) 실제 커리어를 굴려 주간 1위 비율 표를 만든다 ----------
const CONDITION = 70;   // 활동 중 평균적인 컨디션 (연습·무대로 오르내리는 값의 중간)
const CB_PER_YEAR = 2, WEEKS_PER_CB = 6, YEARS = 9;
const START_FANDOM = 500;   // 데뷔 시점 팬덤 (연습생 단계에서 쌓고 오는 값)

function career(stat) {
  const S = { pos: "vocal", condition: CONDITION, fandom: START_FANDOM, proYear: 0,
    stats: { vocal: stat, dance: stat, rap: stat, charm: stat, stamina: stat } };
  const winRate = [];
  for (let y = 1; y <= YEARS; y++) {
    S.proYear = y;
    let wins = 0, weeks = 0, sales = 0;
    for (let cb = 1; cb <= CB_PER_YEAR; cb++) {
      const rivals = rollRivals(S);   // 컴백마다 지금 연차로 다시 뽑는다
      let cbWins = 0;
      for (let w = 0; w < WEEKS_PER_CB; w++) {
        // 미니게임 보정: 대성공 10 / 보통 3 / 실패 -8 (playShow의 moment())
        const r = Math.random();
        const miniBonus = r < 0.25 ? 10 : r < 0.85 ? 3 : -8;
        const my = scoreFn(S, POS_INFO, clutch, miniBonus, rand);
        const rows = [{ score: my, me: true }, ...rivals.map((x) => ({ score: x.pop + rand(-8, 8) }))]
          .sort((a, b) => b.score - a.score);
        const rank = rows.findIndex((x) => x.me) + 1;
        weeks++;
        let d;
        if (rank === 1) { wins++; cbWins++; d = weekFanFn[0](randInt); }
        else if (rank <= 3) d = weekFanFn[1](randInt);
        else d = weekFanFn[2](randInt);
        S.fandom = Math.max(0, S.fandom + d);
      }
      sales += salesFn(S, { cbWins }, rand);
    }
    const agePen = y >= 8 ? (y - 7) * 0.8 : 0;
    S.fandom = Math.max(0, S.fandom + yearFanFn(hypeFn({ sales }, agePen, clamp), wins));
    winRate.push(wins / weeks);
  }
  return winRate;
}

const STATS = [70, 90, 110, 130];
const SHOW = [1, 5, 9];
const N = 300;
const table = {};
for (const stat of STATS) {
  const sum = new Array(YEARS).fill(0);
  for (let i = 0; i < N; i++) { const c = career(stat); for (let y = 0; y < YEARS; y++) sum[y] += c[y]; }
  table[stat] = sum.map((v) => Math.round(v / N * 100));
}
console.log("\n능력치 | " + SHOW.map((y) => `${y}년차`).join(" | ") + "   (주간 1위 비율)");
for (const stat of STATS) {
  console.log(`${String(stat).padStart(5)}  | ` + SHOW.map((y) => `${String(table[stat][y - 1]).padStart(4)}%`).join(" | "));
}
console.log("");

const at = (stat, y) => table[stat][y - 1];

// 부호 검사 — 이게 뒤집혀 있던 버그다. 능력치를 고정하면(=훈련을 멈추면)
// 라이벌이 자라는 만큼 해마다 밀려야 한다.
for (const stat of STATS) {
  check(at(stat, 9) <= at(stat, 1),
    `능력치 ${stat}: 제자리에 있으면 후반에 밀린다 (1년차 ${at(stat, 1)}% → 9년차 ${at(stat, 9)}%)`);
}

// 중위권은 커리어 후반에 실제로 좁혀져야 한다 (안 그러면 후반에 키울 이유가 없다)
check(at(90, 1) >= 55 && at(90, 1) <= 90, `중위권(90) 1년차는 절반쯤 이긴다 (${at(90, 1)}%)`);
check(at(90, 5) >= 20 && at(90, 5) <= 65, `중위권(90) 5년차에 눈에 띄게 줄어든다 (${at(90, 5)}%)`);
check(at(90, 9) <= 25, `중위권(90) 9년차는 거의 못 이긴다 (${at(90, 9)}%)`);
check(at(90, 1) - at(90, 9) >= 30, `중위권은 커리어 동안 30%p 이상 좁혀진다 (${at(90, 1) - at(90, 9)}%p)`);

// 잘 키운 아이돌은 끝까지 강하다 (밸런스를 잡는다고 상위권까지 죽이면 안 된다)
check(SHOW.every((y) => at(130, y) >= 85), `상위권(130)은 9년 내내 강하다 (${SHOW.map((y) => at(130, y) + "%").join(" / ")})`);
check(at(110, 1) >= 90, `잘 키운 축(110) 1년차는 거의 다 이긴다 (${at(110, 1)}%)`);
check(at(110, 9) >= 35, `잘 키운 축(110)은 9년차에도 절반 가까이 이긴다 (${at(110, 9)}%)`);
check(at(110, 9) <= 85, `잘 키운 축(110)도 9년차엔 무적은 아니다 (${at(110, 9)}%)`);

// 하위권은 애초에 1위를 못 한다
check(at(70, 1) <= 25, `하위권(70)은 1년차부터 1위가 드물다 (${at(70, 1)}%)`);
check(at(70, 9) <= 5, `하위권(70)은 9년차엔 사실상 못 이긴다 (${at(70, 9)}%)`);

// 어느 연차에서든 능력치가 높을수록 잘 이긴다 (축이 능력치다)
for (const y of SHOW) {
  const row = STATS.map((s) => at(s, y));
  const mono = row.every((v, i) => i === 0 || v >= row[i - 1]);
  check(mono, `${y}년차: 능력치가 높을수록 승률이 높다 (${row.map((v) => v + "%").join(" ≤ ")})`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
