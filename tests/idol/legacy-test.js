/* 진행 중인 캐릭터가 이번 변경으로 갑자기 나빠지지 않는지.
 *
 * 축을 새 필드로 만들지 않고 이미 누적되던 S.career.sales와 그해 act.sales를
 * 그대로 쓰기 때문에, 원래 문제가 없어야 한다. 하지만 "없을 것이다"와 "없다"는
 * 다르므로 실제로 확인한다.
 *
 * 진짜 위험은 저장 구조가 아니라 **숫자의 범위**다. 옛 세이브의 act.sales는
 * 옛 산식(fandom*0.05 + cbWins*6 + cbHype*4)이 만든 값인데, 새 hype 산식은
 * 그 값에 로그를 씌운 뒤 8을 뺀다. 옛 범위가 그 오프셋 아래면 진행 중이던
 * 아이돌이 업데이트 한 번에 무명이 된다 — hype<0이면 연말 팬덤이 -15 깎인다.
 * 그게 이 파일이 막으려는 유일한 사고다.
 *
 * 그래서 절대값이 아니라 **회귀**를 잰다. 같은 세이브를 옛 산식과 새 산식으로
 * 각각 평가해, 새 쪽이 더 나쁘지 않은지 본다. 옛 산식은 작업 트리에 이미 없으니
 * 아래에 역사 기록(279be1c beta/idol/career.js)으로 박아둔다. 새 산식은 소스에서
 * 정규식으로 뽑는다 — 복사하면 원본과 어긋나도 초록이 뜬다.
 *
 * 직접 eval("const x = …")은 선언이 eval 자기 스코프에 갇혀 항상 undefined가
 * 되니 new Function(...)으로 감싸 return 한다 — axis-test.js와 같은 방식이다. */
"use strict";
const fs = require("fs");
const PATH = "/workspace/grow-games/beta/idol/career.js";
const SRC = fs.readFileSync(PATH, "utf8");

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

// ---------- 1) 저장 구조를 건드리지 않았는지 ----------
check(!/S\.career\.axis|S\.axis|axisScore/.test(SRC), "새 저장 필드를 만들지 않았다");
check(/S\.career\.sales \+= sales;/.test(SRC), "S.career.sales 누적이 그대로다");
check(/years\.push\(\{ y: S\.proYear[^}]*sales/.test(SRC), "연차 기록에 sales가 그대로 남는다");

/* 옛 initActivity가 만들던 필드 (279be1c). 새 코드가 이 목록에 없는 act.* 를 읽으면
 * 업데이트 직후 활동 중이던 세이브에서 undefined가 나온다 — 마이그레이션이 필요해진다.
 * concept·hot·cold는 컴백 컨셉(Task 1)이 추가한 새 필드지만, conceptOf·trendMul이
 * 없는 값을 각각 청량(cool)·배수 1로 방어하도록 짜여 있어 마이그레이션이 필요
 * 없다 — 그래서 화이트리스트에 같이 넣는다.
 * rumor(Task 3)도 같은 이유다. 컨셉 선택 화면이 `act.rumor || []`로 받아서, 소문이
 * 없는 옛 세이브는 배지 없는 카드 4장과 "소문이 잠잠해요" 안내를 보게 된다 —
 * 그 경로는 concept-test.js가 실제 화면에서 확인한다. */
const OLD_ACT_FIELDS = ["cb", "cbTotal", "week", "weekTotal", "wins", "sales", "hypeSum", "cbHype", "cbWins", "rivals", "concept", "hot", "cold", "rumor"];
const DOM = ["innerHTML", "appendChild", "textContent", "className", "style"];  // yearReport의 동명 지역변수는 DOM 엘리먼트다
const readFields = [...new Set((SRC.match(/\bact\.[a-zA-Z]+/g) || []).map((s) => s.slice(4)))].filter((f) => !DOM.includes(f));
const unknown = readFields.filter((f) => !OLD_ACT_FIELDS.includes(f));
check(unknown.length === 0,
  `활동 객체에서 옛 세이브에 없는 필드를 읽지 않는다 (${unknown.length ? "새 필드: " + unknown.join(", ") : readFields.length + "개 전부 옛 세이브에 있음"})`);

// ---------- 새 산식 추출 ----------
const grab = (re, label) => { const m = SRC.match(re); if (!m) { console.log(`❌ ${label} 산식을 못 찾았어요`); process.exit(1); } return m[0]; };
const nHypeS = grab(/const hype = clamp\([^;]+;/, "hype");
// 컴백 컨셉(Task 1) 이후 cbSales는 CONCEPTS/conceptOf/trendMul/expectedSales를 함께 쓴다.
// act에 concept이 없으면 conceptOf가 청량(cool) 기본값을 준다 — 옛 세이브와 같은 조건.
const nConceptsS = grab(/const CONCEPTS = \[[\s\S]*?\n  \];/, "CONCEPTS");
const nSalesKS = grab(/const SALES_K = [^;]+;/, "SALES_K");
const nTrendHotS = grab(/const TREND_HOT = [^;]+;/, "TREND_HOT");
const nTrendColdS = grab(/const TREND_COLD = [^;]+;/, "TREND_COLD");
const nConceptOfS = grab(/function conceptOf\(act\) \{[\s\S]*?\n  \}/, "conceptOf");
const nTrendMulS = grab(/function trendMul\(concept, act\) \{[\s\S]*?\n  \}/, "trendMul");
const nExpectedSalesS = grab(/function expectedSales\(stats, concept, fandom, cbWins\) \{[\s\S]*?\n  \}/, "expectedSales");
const nSalesS = grab(/const concept = conceptOf\(act\);\s*const cbSales = [^;]+;/, "cbSales");
const nScoreS = grab(/const myScore =[\s\S]*?;\n/, "myScore");
const nCapS = grab(/const FANDOM_CAP = [^;]+;/, "FANDOM_CAP");
const nRivalS = grab(/function rollRivals\(\)[\s\S]*?\n  \}/, "rollRivals");
const nYearFanS = grab(/const dFan = Math\.round\([^;]+;/, "연말 dFan");
const nWeekFanS = SRC.match(/dFan = randInt\([^)]*\)/g);
const CB = Number(grab(/const CB_PER_YEAR = (\d+);/, "CB_PER_YEAR").match(/\d+/)[0]);
const WK = Number(grab(/const WEEKS_PER_CB = (\d+);/, "WEEKS_PER_CB").match(/\d+/)[0]);
if (!nWeekFanS || nWeekFanS.length !== 3) { console.log("❌ 주간 팬덤 증감이 3갈래가 아니에요"); process.exit(1); }

const newHype = new Function("act", "agePen", "clamp", `${nHypeS} return hype;`);
const newSales = new Function("S", "act", "rand",
  `${nConceptsS} ${nSalesKS} ${nTrendHotS} ${nTrendColdS}
   ${nConceptOfS} ${nTrendMulS} ${nExpectedSalesS} ${nSalesS} return cbSales;`);
const newScore = new Function("S", "POS_INFO", "clutch", "miniBonus", "rand", `${nCapS} ${nScoreS} return myScore;`);
const yearFan = new Function("hype", "wins", `${nYearFanS} return dFan;`);   // 옛/새가 같은 식이다
const weekFan = nWeekFanS.map((s) => new Function("randInt", `let dFan; ${s}; return dFan;`));

/* ---------- 옛 산식 (역사 기록: 279be1c beta/idol/career.js) ----------
 * 작업 트리엔 이미 없다. 옛 세이브가 들고 있는 숫자를 만들어내는 유일한 근거라
 * 여기 남긴다. 주간 팬덤 증감과 연말 dFan은 그때와 지금이 같아서 소스에서 뽑아 쓴다.
 * 옛 주간 점수는 지금과 딱 하나 다르다 — 팬덤 항에 상한(FANDOM_CAP)이 없었다. */
const oldScore = (S, POS, clutch, miniBonus) =>
  (S.stats[POS[S.pos].stat] * 0.32 +
   S.stats.charm * 0.22 +
   ((S.stats.vocal + S.stats.dance + S.stats.rap) / 3) * 0.2) * clutch(POS[S.pos].stat) +
  S.condition / 8 + (S.fandom || 0) / 45 + miniBonus + rand(-5, 5);
const oldSales = (S, act) =>
  Math.max(1, Math.round(S.fandom * 0.05 + act.cbWins * 6 + act.cbHype * 4 + rand(-4, 4)));
const oldHype = (act, agePen) => clamp(act.hypeSum / 2.2 - agePen, -1.5, 12);
const oldRivals = () => Array.from({ length: 8 }, () => ({ pop: rand(52, 88) }));   // 연차 성장이 없었다

// ---------- 2) 새 hype가 0을 넘는 판매량 경계 ----------
const zeroAt = (agePen) => {
  let lo = 1, hi = 1e5;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (newHype({ sales: m }, agePen, clamp) < 0) lo = m; else hi = m; }
  return hi;
};
console.log(`\n· 새 hype가 0을 넘는 판매량 경계: 1~7년차 ${zeroAt(0).toFixed(0)}만 · 10년차 ${zeroAt(2.4).toFixed(0)}만`);

// ---------- 3) 옛 코드로 커리어를 굴려 진짜 옛 세이브를 만든다 ----------
/* 팬덤을 임의로 정하면 안 된다 — 옛 규칙으로 자란 팬덤이라야 그 세이브가 실제로
 * 들고 있는 조합이다. 그래서 데뷔부터 옛 산식으로 굴려 해마다 스냅샷을 남긴다. */
const POS_INFO = { vocal: { name: "보컬", stat: "vocal" } };
const clutch = () => 1;               // 재능이 기본값이면 1이다. 능력치 축만 본다
const COND = 70, START_FANDOM = 500;  // 활동 중 평균 컨디션 / 데뷔 시점 팬덤

function oldCareer(stat, years) {
  const S = { pos: "vocal", condition: COND, fandom: START_FANDOM, proYear: 0,
    stats: { vocal: stat, dance: stat, rap: stat, charm: stat, stamina: stat } };
  const snaps = [];
  for (let y = 1; y <= years; y++) {
    S.proYear = y;
    let wins = 0, sales = 0, hypeSum = 0;
    for (let cb = 1; cb <= CB; cb++) {
      const rivals = oldRivals();
      let cbWins = 0, cbHype = 0;
      for (let w = 0; w < WK; w++) {
        // 미니게임 보정: 대성공 10 / 보통 3 / 실패 -8 (playShow의 moment())
        const r = Math.random();
        const miniBonus = r < 0.25 ? 10 : r < 0.85 ? 3 : -8;
        const miniHype = miniBonus === 10 ? 0.5 : miniBonus === -8 ? -0.5 : 0;
        const my = oldScore(S, POS_INFO, clutch, miniBonus);
        const rows = [{ score: my, me: true }, ...rivals.map((x) => ({ score: x.pop + rand(-8, 8) }))]
          .sort((a, b) => b.score - a.score);
        const rank = rows.findIndex((x) => x.me) + 1;
        hypeSum += (5 - rank) * 0.35 + miniHype;
        cbHype += (5 - rank) * 0.35 + miniHype;
        let d;
        if (rank === 1) { wins++; cbWins++; d = weekFan[0](randInt); }
        else if (rank <= 3) d = weekFan[1](randInt);
        else d = weekFan[2](randInt);
        S.fandom = Math.max(0, S.fandom + d);
      }
      sales += oldSales(S, { cbWins, cbHype });
    }
    const agePen = y >= 8 ? (y - 7) * 0.8 : 0;
    const hOld = oldHype({ hypeSum }, agePen);          // 업데이트 전이었다면 받았을 평가
    const hNew = newHype({ sales }, agePen, clamp);     // 업데이트 후 그 세이브가 받는 평가
    // 같은 세이브를 새 산식이 처음부터 굴렸다면 나왔을 판매량 (부풀림 검사용)
    let ns = 0;
    for (let cb = 0; cb < CB; cb++) ns += newSales(S, { cbWins: Math.round(wins / CB) }, rand);
    snaps.push({ y, stat, sales, newSales: ns, wins, fandom: S.fandom, hOld, hNew,
      fanOld: yearFan(hOld, wins), fanNew: yearFan(hNew, wins) });
    S.fandom = Math.max(0, S.fandom + yearFan(hOld, wins));
  }
  return snaps;
}

const STATS = [50, 60, 70, 90, 110, 130];
const YEARS = 10, RUNS = 2000;
const all = [];   // 스냅샷 전부 (프로필 × 실행 × 연차)
for (const stat of STATS) for (let i = 0; i < RUNS; i++) all.push(...oldCareer(stat, YEARS));

const cell = (stat, y) => all.filter((s) => s.stat === stat && s.y === y);
const avg = (a, f) => a.reduce((p, c) => p + f(c), 0) / a.length;
const pctNeg = (a, k) => a.filter((s) => s[k] < 0).length / a.length;

console.log("\n=== 옛 코드로 자란 세이브를, 옛 평가 / 새 평가로 각각 매긴 결과 ===");
console.log("능력치 연차 |  팬덤  옛sales(최소~평균) | 옛hype  음수%  팬덤Δ | 새hype  음수%  팬덤Δ");
for (const stat of STATS) for (const y of [1, 3, 5, 7, 9]) {
  const a = cell(stat, y);
  console.log(`${String(stat).padStart(5)} ${String(y).padStart(2)}년 | ${String(Math.round(avg(a, (s) => s.fandom))).padStart(5)}` +
    `  ${String(Math.min(...a.map((s) => s.sales))).padStart(4)}~${String(Math.round(avg(a, (s) => s.sales))).padStart(4)}` +
    ` | ${avg(a, (s) => s.hOld).toFixed(2).padStart(6)} ${String(Math.round(pctNeg(a, "hOld") * 100)).padStart(4)}% ${String(Math.round(avg(a, (s) => s.fanOld))).padStart(5)}` +
    ` | ${avg(a, (s) => s.hNew).toFixed(2).padStart(6)} ${String(Math.round(pctNeg(a, "hNew") * 100)).padStart(4)}% ${String(Math.round(avg(a, (s) => s.fanNew))).padStart(5)}`);
}
console.log("");

// ---------- 4) 회귀가 없는지 — 이 파일의 핵심 ----------
check(all.every((s) => Number.isFinite(s.hNew)), `옛 판매량으로도 hype가 전부 유한하다 (${all.length}개 스냅샷)`);

/* (a) 새 평가에서 hype가 음수인 비율이, 옛 평가보다 늘어난 칸이 하나도 없어야 한다.
 *     늘어났다면 그 조합의 플레이어는 업데이트 때문에 팬덤을 잃는다. */
const worseNeg = [];
for (const stat of STATS) for (let y = 1; y <= YEARS; y++) {
  const a = cell(stat, y);
  if (pctNeg(a, "hNew") > pctNeg(a, "hOld") + 0.02) worseNeg.push(`${stat}/${y}년`);
}
check(worseNeg.length === 0,
  worseNeg.length ? `hype 음수가 늘어난 조합이 있다: ${worseNeg.join(", ")}`
                  : "hype가 음수로 떨어지는 비율이 어느 조합에서도 늘지 않았다");

/* (b) 한 판 단위로도 봐야 한다. 평균이 좋아져도, 옛 평가에선 팬덤이 안 깎이던 세이브가
 *     새 평가에서 깎이면 그 플레이어에겐 순손해다. 실제로 그런 칼날 케이스가 있다 —
 *     0으로 만들 수는 없으니(로그 곡선과 선형 곡선이 한 점에서 교차하니 당연하다),
 *     그 띠가 얼마나 좁고 얼마나 싼지를 못 박아둔다. 넓어지면 여기서 걸린다. */
const flipped = all.filter((s) => s.fanOld >= 0 && s.fanNew < 0);
const gained  = all.filter((s) => s.fanOld < 0 && s.fanNew >= 0);
const flipRate = flipped.length / all.length;
console.log(`\n· 팬덤이 깎이게 된 세이브 ${flipped.length}건 (${(flipRate * 100).toFixed(3)}%) ↔ 안 깎이게 된 세이브 ${gained.length}건 (${(gained.length / all.length * 100).toFixed(2)}%)`);
if (flipped.length) {
  const rg = (f) => `${Math.min(...flipped.map(f))}~${Math.max(...flipped.map(f))}`;
  console.log(`  뒤집힌 띠: 능력치 ${rg((s) => s.stat)} · ${rg((s) => s.y)}년차 · 옛 hype ${Math.min(...flipped.map((s) => s.hOld)).toFixed(2)}~${Math.max(...flipped.map((s) => s.hOld)).toFixed(2)} · 손해 팬덤 ${rg((s) => s.fanOld - s.fanNew)}`);
}
check(flipRate < 0.002, `팬덤이 깎이게 되는 세이브가 0.2% 미만이다 (${(flipRate * 100).toFixed(3)}%)`);
check(gained.length > flipped.length * 20,
  `팬덤이 안 깎이게 된 세이브가 그 반대보다 훨씬 많다 (${gained.length}건 ↔ ${flipped.length}건)`);
/* 문턱은 관측값에 딱 맞추지 않고 산식에서 뽑은 여유값을 쓴다 — 몇 건짜리 표본이라
 * 실행마다 흔들리는데, 딱 맞추면 곡선이 안 변해도 빨간불이 켜진다.
 *   · 뒤집히려면 새 hype<0, 즉 판매량 < 76만이어야 한다. 옛 판매량은
 *     fandom*0.05를 컴백마다 깔고 가니 팬덤 500이면 그것만으로 50만이다.
 *     남는 여유가 26만뿐이라 cbHype는 3.3을 못 넘고, 옛 hype(=hypeSum/2.2)는
 *     노화 페널티를 빼기 전에도 3을 못 넘는다. → 문턱 3.0
 *   · 손해는 10*(옛hype - 새hype) + 15이고 새 hype는 -1.5에서 걸리니
 *     옛 hype 3.0 · 새 hype -1.5에서 최대 60이다. → 문턱 60 */
check(flipped.every((s) => s.hOld < 3),
  `뒤집히는 건 옛 평가에서도 이미 0 언저리였던 세이브뿐이다 (옛 hype 최대 ${flipped.length ? Math.max(...flipped.map((s) => s.hOld)).toFixed(2) : "-"} < 3)`);
check(flipped.every((s) => s.stat < 90),
  `제대로 키운 아이돌(능력치 90+)은 한 건도 뒤집히지 않는다 (뒤집힌 최고 능력치 ${flipped.length ? Math.max(...flipped.map((s) => s.stat)) : "-"})`);
check(flipped.every((s) => s.fanOld - s.fanNew <= 60),
  `뒤집혀도 손해가 그 해 팬덤 60 이내다 (최대 ${flipped.length ? Math.max(...flipped.map((s) => s.fanOld - s.fanNew)) : 0})`);

/* (c) 평균 팬덤 증감도 어느 칸에서든 나빠지면 안 된다. */
const worseFan = [];
for (const stat of STATS) for (let y = 1; y <= YEARS; y++) {
  const a = cell(stat, y);
  if (avg(a, (s) => s.fanNew) < avg(a, (s) => s.fanOld) - 40) worseFan.push(`${stat}/${y}년`);
}
check(worseFan.length === 0,
  worseFan.length ? `연말 팬덤 증감이 크게 나빠진 조합: ${worseFan.join(", ")}`
                  : "연말 팬덤 증감이 어느 조합에서도 크게 나빠지지 않았다");

/* (d) 제대로 키운 아이돌(능력치 90+)이 한창때(3~7년차)에 업데이트를 맞아도
 *     전환 그 해에 본상 문턱(4.5)은 넘어야 한다. hype가 떨어지긴 해도
 *     "하루아침에 무명"은 아니라는 뜻이다.
 *     8년차 이상은 뺀다 — 거기서 hype가 주저앉는 건 노화 페널티 때문이고,
 *     옛 산식에도 똑같이 있던 성질이라 이번 변경과 무관하다 (Task 2에서 확인됨).
 *     그 구간은 위 (a)(c)의 회귀 검사가 대신 지킨다. */
const pct = (a, q) => { const t = a.slice().sort((x, z) => x - z); return t[Math.floor(t.length * q)]; };
const prime = all.filter((s) => s.stat >= 90 && s.y >= 3 && s.y <= 7).map((s) => s.hNew);
check(pct(prime, 0.10) >= 4.5,
  `능력치 90+ · 한창때(3~7년차)는 전환 그 해에도 본상 문턱을 넘는다 (하위 10% 지점 ${pct(prime, 0.10).toFixed(2)} ≥ 4.5)`);

/* 노화 구간은 옛 산식 대비로만 본다 — 절대 수준이 낮은 건 원래 그랬다. */
const oldAged = all.filter((s) => s.stat >= 90 && s.y >= 8).map((s) => s.hOld);
const newAged = all.filter((s) => s.stat >= 90 && s.y >= 8).map((s) => s.hNew);
console.log(`· 노화 구간(능력치 90+, 8~10년차) hype 중앙값: 옛 ${pct(oldAged, 0.5).toFixed(2)} → 새 ${pct(newAged, 0.5).toFixed(2)} (노화 페널티는 옛 산식에도 있던 성질)`);

/* (e) 반대쪽도 막는다. 옛 판매량이 새 기준보다 부풀어 있으면
 *     업데이트 직후 한 해만 공짜 대상이 쏟아진다. */
const inflated = all.filter((s) => s.sales > s.newSales * 1.2).length / all.length;
check(inflated < 0.05,
  `옛 판매량이 새 기준보다 부풀어 있지 않다 (20% 이상 높은 경우 ${(inflated * 100).toFixed(1)}%)`);

/* 그리고 평가 자체가 갑자기 후해져도 안 된다. 옛 세이브가 옛 평가보다 크게 높은
 * hype를 받으면 업데이트 직후 한 해만 공짜 대상이 쏟아진다 — 아래로 무너지는 것과
 * 똑같이 곡선을 망가뜨린다. 지금 가장 후해지는 칸도 +1.3을 안 넘는다(약체의 회복분). */
let kindest = { d: -Infinity, k: "" };
for (const stat of STATS) for (let y = 1; y <= YEARS; y++) {
  const a = cell(stat, y);
  const d = avg(a, (s) => s.hNew) - avg(a, (s) => s.hOld);
  if (d > kindest.d) kindest = { d, k: `${stat}/${y}년차` };
}
check(kindest.d < 2.5,
  `새 평가가 옛 평가보다 갑자기 후해지지 않는다 (가장 후한 칸 ${kindest.k} +${kindest.d.toFixed(2)} < 2.5)`);

// ---------- 5) 섞인 연차 표가 읽히는지 ----------
/* S.career.years[]에는 옛 산식으로 쓴 해와 새 산식으로 쓴 해가 같이 남고,
 * 연말·은퇴 화면이 그걸 한 표에 그린다. 판매량 칸이 업데이트 후 줄어들면
 * 플레이어는 자기가 손해 봤다고 읽는다. 그 방향만은 막는다. */
const shrink = [];
for (const stat of STATS) for (const y of [3, 5, 7]) {
  const a = cell(stat, y);
  const jump = avg(a, (s) => s.newSales) / avg(a, (s) => s.sales);
  if (jump < 1) shrink.push(`${stat}/${y}년 ×${jump.toFixed(2)}`);
}
console.log("\n· 표의 경계(마지막 옛 해 → 첫 새 해) 판매량 배율 — 5년차 세이브 기준");
console.log("  " + STATS.map((stat) => {
  const a = cell(stat, 5);
  return `능력치 ${stat} ×${(avg(a, (s) => s.newSales) / avg(a, (s) => s.sales)).toFixed(2)}`;
}).join(" · "));
check(shrink.length === 0,
  shrink.length ? `새 산식으로 쓴 해가 옛 해보다 판매량이 줄어드는 조합: ${shrink.join(", ")}`
                : "표에서 새 산식으로 쓴 해가 옛 해보다 판매량이 줄지 않는다");

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
