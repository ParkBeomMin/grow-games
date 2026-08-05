/* 라이벌 평점이 그 라운드 소속 클럽 결과를 따라가는지 본다.
 *
 * 예전에는 라이벌 점수가 `pop + rand(-8, 8)`뿐이라, 그 클럽이 지든 이기든
 * 선수 평점이 똑같았다. 리그 순위표와 평점표가 같은 라운드를 보면서 서로 몰랐다.
 *
 * 여기서 재는 건 세 가지다.
 *   ① 이긴 클럽 선수가 진 클럽 선수보다 확실히 높게 나온다
 *   ② 그래도 명성(pop)이 뒤집히기만 하는 게 아니다 — 강한 선수는 여전히 강하다
 *   ③ recordRound가 그 라운드 결과를 실제로 돌려준다 (승-패 총합이 맞는다)
 *
 * 무게식·판정식은 소스에서 정규식으로 뽑아 그대로 실행한다. 값을 옮겨 적지 않는다.
 */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/soccer/career.js", "utf8");
const grab = (re) => { const m = SRC.match(re); return m ? m[0] : null; };

const parts = {
  adj: grab(/const rivalResAdj = [^;]+;/),
  pull: grab(/const RIVAL_POP_PULL = [^;]+;/),
  record: grab(/function recordRound\(myOpp, res\) \{[\s\S]*?\n  \}/),
  rows: grab(/const rows = \[\s*\{ name: S\.name[\s\S]*?\]\.sort\([^;]*\);/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const shuffle = (xs) => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ③ recordRound가 라운드 결과를 돌려준다 ─────────────────────────
const TEAMS = ["레알 몬테", "AC 리베라", "카스텔 FC", "베르단 SC", "노르드 유나이티드", "블랙이글스"];
const runRecord = new Function(
  "S", "myOpp", "res", "clamp", "shuffle", "Math",
  `const tableReady = () => true;
   const initTable = () => {};
   ${parts.record}
   return recordRound(myOpp, res);`
);
const mkS = () => ({ group: "레알 몬테", table: { rows: TEAMS.map((n) => ({ name: n, str: 55, w: 0, d: 0, l: 0 })) } });

let sumOK = true, meOK = true, oppOK = true;
for (let i = 0; i < 500; i++) {
  const S = mkS();
  const out = runRecord(S, "AC 리베라", "W", clamp, shuffle, Math);
  const vals = Object.values(out);
  if (vals.filter((v) => v === "W").length !== vals.filter((v) => v === "L").length) sumOK = false;
  if (out["레알 몬테"] !== "W") meOK = false;
  if (out["AC 리베라"] !== "L") oppOK = false;
}
check(meOK, "내 클럽 결과가 그대로 담긴다");
check(oppOK, "내가 이긴 상대 클럽은 패로 담긴다");
check(sumOK, "승과 패의 총합이 맞는다 (짝을 지어 굴린다)");

// 6팀이면 3경기 = 6팀 전부 결과가 있다
const full = runRecord(mkS(), "AC 리베라", "W", clamp, shuffle, Math);
check(Object.keys(full).length === TEAMS.length, `6팀 전부 결과가 나온다 (${Object.keys(full).length}팀)`);

// ── ①② 라이벌 점수가 결과를 따라간다 ──────────────────────────────
/* 점수식도 소스에서 뽑는다 — 흔들림 폭(±6)을 여기 옮겨 적으면 원본이 바뀌어도
 * 초록이 뜬다. 실제로 그 폭이 MOM 균형을 잡는 값이라 조용히 어긋나면 안 된다. */
const scoreExpr = grab(/score: 70 \+ \(r\.pop - 70\) \* RIVAL_POP_PULL \+ rand\([^)]*\) \+ rivalResAdj\(roundRes\[r\.club\]\),/);
if (!scoreExpr) { console.log("❌ 라이벌 점수식을 못 찾았어요"); process.exit(1); }
const rivalScore = new Function(
  "r", "roundRes", "rand",
  `${parts.adj}
   ${parts.pull}
   const o = { ${scoreExpr} };
   return o.score;`
);
const N = 20000;
const avg = (pop, res) => {
  let s = 0;
  for (let i = 0; i < N; i++) s += rivalScore({ pop, club: "X" }, { X: res }, rand);
  return s / N;
};
const win = avg(70, "W"), draw = avg(70, "D"), loss = avg(70, "L");
console.log(`   명성 70 라이벌 평균 점수 — 승 ${win.toFixed(1)} · 무 ${draw.toFixed(1)} · 패 ${loss.toFixed(1)}`);
check(win - loss > 14, `승리 클럽 선수가 패배 클럽 선수보다 14점 넘게 높다 (${(win - loss).toFixed(1)}점)`);
check(Math.abs(draw - 70) < 1, `무승부는 명성 그대로다 (${draw.toFixed(1)})`);

/* 흔들림이 너무 크면 결과가 묻히고, 너무 작으면 라이벌 순위가 매 라운드 똑같아진다.
 * 폭이 결과 보정보다 지나치게 크지 않은지만 본다 (MOM 균형이 여기 달려 있다). */
const noise = Number((scoreExpr.match(/rand\(-([\d.]+),/) || [])[1]);
check(noise > 0 && noise <= 6.5, `순수 흔들림이 ±${noise}로 억제돼 있다 (결과가 묻히지 않게)`);

/* ② 결과가 명성을 어디까지 이기는지 — 개별 표본으로 몇 번 뒤집히는지 센다.
 * 평균만 보면 흔들림이 안 보인다.
 *
 * 예전에는 "명성 15 차이는 한 판으로 안 뒤집힌다"를 지켰는데, 그게 화면에서
 * **5:2로 이긴 경기의 상위 5명 중 4명이 진 팀 선수**로 나오는 원인이었다.
 * 축구 평점은 그날 경기를 재는 값이라 결과가 그만큼 무거워야 한다.
 * 다만 명성 폭 전체(52 ↔ 88)까지 뒤집히면 라이벌이라는 말이 무의미해진다 —
 * 거기가 경계다. */
const flipRate = (popA, resA, popB, resB) => {
  let f = 0;
  for (let i = 0; i < N; i++) {
    if (rivalScore({ pop: popB, club: "B" }, { B: resB }, rand)
      > rivalScore({ pop: popA, club: "A" }, { A: resA }, rand)) f++;
  }
  return f / N * 100;
};
const near = flipRate(75, "L", 70, "W");     // 명성 5 차이 — 붙어 있는 라이벌
const mid = flipRate(85, "L", 70, "W");      // 명성 15 차이
const far = flipRate(88, "L", 52, "W");      // 명성 폭 전체
console.log(`   결과로 뒤집히는 비율 — 명성 5차 ${near.toFixed(1)}% · 15차 ${mid.toFixed(1)}% · 최대차 ${far.toFixed(1)}%`);
check(near > 70, `붙어 있는 라이벌(명성 5차)은 결과로 거의 뒤집힌다 (${near.toFixed(1)}%)`);
check(mid > 40, `명성 15 차이도 결과로 자주 뒤집힌다 (${mid.toFixed(1)}%)`);
check(far < 30, `명성 폭 전체(52↔88)까지는 한 판으로 안 뒤집힌다 (${far.toFixed(1)}%)`);

/* ── 변이 검증 — 결과 보정을 빼면 ①이 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const flat = new Function("r", "rand", "return r.pop + rand(-8, 8);");
let fw = 0, fl = 0;
for (let i = 0; i < N; i++) { fw += flat({ pop: 70 }, rand); fl += flat({ pop: 70 }, rand); }
const flatGap = Math.abs(fw - fl) / N;
check(flatGap < 8, `변이 검증 — 결과 보정을 빼면 승패 차이가 ${flatGap.toFixed(2)}점으로 사라진다`);

// ── 순위 행이 res를 실제로 들고 다니는지 (화면의 승/무/패 딱지 근거) ──
const buildRows = new Function(
  "S", "act", "myRankScore", "info", "roundRes", "rand", "rivalResAdj",
  `${parts.pull}
   ${parts.rows}
   return rows;`
);
// rand는 인자로 넘겨야 해요 — 안 그러면 rivalResAdj 안에서 바깥 rand를 못 봐요
const adjFn = new Function("rand", `${parts.adj} return rivalResAdj;`)(rand);
const built = buildRows(
  { name: "리오" },
  { rivals: [{ name: "밀란 피셔", club: "AC 리베라", role: "에이스", pop: 80 }] },
  70, { res: "W" }, { "AC 리베라": "L" }, rand, adjFn
);
check(built.find((r) => r.me).res === "W", "내 줄에도 결과가 담긴다");
check(built.find((r) => !r.me).res === "L", "라이벌 줄에 그 클럽 결과가 담긴다");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
