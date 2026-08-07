/* 경쟁자 평점이 그 라운드 소속 클럽 결과를 따라가는지 본다.
 *
 * 예전에는 경쟁자 점수가 `명성 + 랜덤`뿐이라, 그 클럽이 지든 이기든 평점이
 * 똑같았다. 리그 순위표와 평점표가 같은 라운드를 보면서 서로 몰랐다.
 *
 * 지금은 경쟁자도 **나와 같은 matchRating**을 쓴다 — 그 라운드에 굴린 골·도움·
 * 수비에 소속 클럽의 승패와 실점이 함께 들어간다.
 *
 * 여기서 재는 건 세 가지다.
 *   ① 이긴 클럽 선수가 진 클럽 선수보다 확실히 높게 나온다
 *   ② 그래도 활약이 묻히지 않는다 — 골을 넣은 선수는 여전히 높다
 *   ③ recordRound가 그 라운드 결과를 실제로 돌려준다 (승-패 총합이 맞는다)
 *
 * 무게식·판정식은 소스에서 정규식으로 뽑아 그대로 실행한다. 값을 옮겨 적지 않는다.
 */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/soccer/career.js", "utf8");
const grab = (re) => { const m = SRC.match(re); return m ? m[0] : null; };

const GAME = fs.readFileSync("/workspace/grow-games/beta/soccer/game.js", "utf8");
const grabG = (re) => { const m = GAME.match(re); return m ? m[0] : null; };
const parts = {
  record: grab(/function recordRound\(myOpp, res\) \{[\s\S]*?\n  \}/),
  rows: grab(/const rows = \[\s*\{ name: S\.name[\s\S]*?\]\.sort\([^;]*\);/),
  rateTbl: grab(/const RATE = \{[\s\S]*?\n  \};/),
  rateRes: grab(/const RATE_RESULT = [^;]+;/),
  rateCon: grab(/const RATE_CONCEDE = [^;]+;/),
  decay: grab(/const RATE_DECAY = [^;]+;/),
  credit: grab(/const credit = \(n, unit\) =>[\s\S]*?;\n/),
  lossCap: grab(/const RATE_LOSS_CAP = [^;]+;/),
  ratePartsFn: grab(/function ratingParts\(info, pos, momAdj\) \{[\s\S]*?\n  \}/),
  rateFn: grab(/function matchRating\(info, pos, momAdj\) \{[\s\S]*?\n  \}/),
  conceded: grab(/const raceConceded = [^;]+;/),
  raceRate: grab(/function raceRate\(roundRes, deltas\) \{[\s\S]*?\n  \}/),
  racePos: grab(/const RACE_POS = \{[^}]*\};/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
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

// ── ①② 경쟁자 평점이 결과를 따라간다 ──────────────────────────────
/* 평점식·실점 짐작식을 소스에서 그대로 뽑아 굴린다. 값을 옮겨 적지 않는다. */
const rateOf = new Function(
  "info", "pos", "clamp", "rand",
  `${parts.rateTbl}
   ${parts.rateRes}
   ${parts.rateCon}
   ${parts.decay}
   ${parts.credit}
   ${parts.lossCap}
   ${parts.ratePartsFn}
   ${parts.rateFn}
   return matchRating(info, pos, 0);`
);
const conceded = new Function("randInt", `${parts.conceded} return raceConceded;`)(randInt);

const N = 20000;
const avg = (res, ev) => {
  let s = 0;
  for (let i = 0; i < N; i++) {
    s += rateOf({ myGoals: ev.g, assists: ev.a, defense: ev.d, res, oppGoals: conceded(res) }, "fw", clamp, rand);
  }
  return s / N;
};
const EV = { g: 1, a: 0, d: 1 };
const win = avg("W", EV), draw = avg("D", EV), loss = avg("L", EV);
console.log(`   1골 1수비 선수 평균 점수 — 승 ${(win / 10).toFixed(2)} · 무 ${(draw / 10).toFixed(2)} · 패 ${(loss / 10).toFixed(2)}`);
check(win > draw && draw > loss, `승 > 무 > 패 순으로 갈린다 (${(win / 10).toFixed(2)} · ${(draw / 10).toFixed(2)} · ${(loss / 10).toFixed(2)})`);
check(win - loss > 5, `이긴 클럽 선수가 진 클럽 선수보다 0.5점 넘게 높다 (${((win - loss) / 10).toFixed(2)}점)`);

/* ② 결과가 활약을 덮어버리면 안 된다 — 0골로 이긴 선수보다 2골 넣고 진 선수가 높아야 한다.
 * 실제 축구 평점도 그렇다. 패배 보정이 골 하나보다 무거우면 표가 승패표가 돼버린다. */
const quietWin = avg("W", { g: 0, a: 0, d: 0 });
const bigLoss = avg("L", { g: 2, a: 0, d: 0 });
console.log(`   0골 승리 ${(quietWin / 10).toFixed(2)} · 2골 패배 ${(bigLoss / 10).toFixed(2)}`);
check(bigLoss > quietWin, `2골 넣고 진 선수가 0골로 이긴 선수보다 높다 (${(bigLoss / 10).toFixed(2)} > ${(quietWin / 10).toFixed(2)})`);

/* ③ 실점이 평점에 남는다 — 무실점 승리와 3실점 승리가 갈려야 한다 (수비수에서 가장 크게). */
const cleanDf = (() => { let s = 0; for (let i = 0; i < N; i++) s += rateOf({ myGoals: 0, assists: 0, defense: 3, res: "W", oppGoals: 0 }, "df", clamp, rand); return s / N; })();
const leakDf = (() => { let s = 0; for (let i = 0; i < N; i++) s += rateOf({ myGoals: 0, assists: 0, defense: 3, res: "W", oppGoals: 3 }, "df", clamp, rand); return s / N; })();
check(cleanDf - leakDf > 5, `수비수는 무실점 승리가 3실점 승리보다 0.5점 넘게 높다 (${((cleanDf - leakDf) / 10).toFixed(2)}점)`);

/* ④ 짐작한 실점이 결과와 어울린다 — 이긴 클럽 선수가 대량 실점 경기를 뛰지는 않는다. */
let winLeak = 0, lossLeak = 0;
for (let i = 0; i < N; i++) { if (conceded("W") >= 3) winLeak++; if (conceded("L") >= 3) lossLeak++; }
check(winLeak === 0 && lossLeak > 0,
  `이긴 클럽의 실점은 3점 미만이고 진 클럽은 대량 실점이 나온다 (승 ${winLeak}회 · 패 ${lossLeak}회)`);

/* ── 변이 검증 — 승패 보정을 빼면 ①이 무너져야 한다. */
const flatRes = parts.rateRes.replace(/= [\d.]+;/, "= 0;");
const flatRate = new Function(
  "info", "pos", "clamp", "rand",
  `${parts.rateTbl}\n${flatRes}\n${parts.rateCon}\n${parts.decay}\n${parts.credit}\n${parts.lossCap}\n${parts.ratePartsFn}\n${parts.rateFn}\n` +
  `return matchRating(info, pos, 0);`
);
let fw2 = 0, fl2 = 0;
for (let i = 0; i < N; i++) {
  fw2 += flatRate({ myGoals: 1, assists: 0, defense: 1, res: "W", oppGoals: 1 }, "fw", clamp, rand);
  fl2 += flatRate({ myGoals: 1, assists: 0, defense: 1, res: "L", oppGoals: 1 }, "fw", clamp, rand);
}
const flatGap = Math.abs(fw2 - fl2) / N;
check(flatGap < 1, `변이 검증 — 승패 보정을 빼면 차이가 ${(flatGap / 10).toFixed(3)}점으로 사라진다`);

// ── 순위 행이 res를 실제로 들고 다니는지 (화면의 승/무/패 딱지 근거) ──
const buildRows = new Function(
  "S", "scored", "myRankScore", "info",
  `${parts.rows}
   return rows;`
);
const built = buildRows(
  { name: "리오", group: "레알 몬테" },
  [{ r: { name: "밀란 피셔", club: "AC 리베라", role: "에이스" }, score: 70, res: "L" }],
  85, { res: "W" }
);
check(built.find((r) => r.me).res === "W", "내 줄에도 결과가 담긴다");
check(built.find((r) => !r.me).res === "L", "경쟁자 줄에 그 클럽 결과가 담긴다");

/* ── 경쟁자와 내가 **같은 산식**을 쓰는지 — 명단을 합친 이유가 여기 있다.
 * 눈금이 갈리면 득점 1위가 평점표에서 사라지는 예전 증상이 그대로 돌아온다. */
check(/matchRating\(info, r\.pos \|\| "mf", 0\)/.test(parts.raceRate),
  "경쟁자 평점도 나와 같은 matchRating으로 매긴다");
check(/roundRes\[r\.club\]/.test(parts.raceRate),
  "경쟁자 평점이 그 라운드 소속 클럽 결과를 본다");

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
