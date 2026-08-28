/* ⚽ 더 윙어 II — 경기 엔진 계약 검사
 *
 * 설계: docs/superpowers/_workspace/13_designer_v2-final.md §2 · §9 · §10
 * 구현: beta/winger2/engine.js (window.WingerEngine)
 *
 * 지키는 것
 *   ①  시드 재현성 — 같은 시드는 같은 경기. 이게 없으면 모든 회귀 검사가 표본 수로 버텨야 해요
 *   ②  엔진의 모든 굴림이 _rng 하나를 지나간다 (Math.random 직접 호출 0건)
 *   ③  옛 세이브 — speed 없는 stats로 무게가 유한하고, **|| 0이 아니라 나머지 평균**
 *   ④  화면(match-scene.js)이 읽는 카드 필드가 전부 온다 · undefined/NaN 0건
 *   ⑤  N ≤ 8 불변 · 3점 차면 6장에서 끊김 (설계 §3-1 · 검사 20번)
 *   ⑥  카드 score = 그 시점 확정 스코어 · 마지막 = result()  (화면이 자체 누적하지 않아요)
 *   ⑦  🏆 결승골 — **독립 오라클**과 대조 (엔진 출력을 정답으로 삼지 않습니다)
 *   ⑧  기준점 — condMul(80) = 1.0000 · sc(70) = 1.0000
 *   ⑨  _t.K가 소스의 상수와 같다 (대조용. 문턱은 아래에 직접 적습니다)
 *   ⑩  🔒 AXIS_K 잠금 — 3.00에서 바뀌면 빨간불
 *
 * ⚠️ 문턱은 전부 **이 파일에 직접 적었습니다.** _t.K에서 읽어 오면 상수를 바꿔도
 *    검사가 따라가서 아무것도 안 잡혀요 (13번 §10-3).
 */
"use strict";
const fs = require("fs");
const { load, xiOf, statsOf, play } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const near = (a, b, eps) => Math.abs(a - b) <= eps;

const E = load();

/* ---------- ① 시드 재현성 ---------- */
{
  const cfg = () => ({ xi: xiOf("wg", 110, 70), oppName: "상대", teamStr: 70, oppStr: 62, condition: 74 });
  const run = (seed) => { E._t.seed(seed); E._t.skill = 0.5; return E._t.playMatch(cfg()).cards; };
  const a = JSON.stringify(run(12345));
  const b = JSON.stringify(run(12345));
  const c = JSON.stringify(run(12346));
  check(a === b, "같은 시드는 같은 경기를 낸다 (카드 종류·결과·분·스코어 전부)");
  check(a !== c, "다른 시드는 다른 경기를 낸다 (seed()가 실제로 물린다)");

  // 시드를 박고 20경기를 이어 돌려도 재현되나 — 상태가 경기 사이에 새지 않아야 해요
  const twenty = (seed) => {
    E._t.seed(seed); E._t.skill = 0.5;
    let s = "";
    for (let i = 0; i < 20; i++) s += JSON.stringify(E._t.playMatch(cfg()).cards);
    return s;
  };
  check(twenty(777) === twenty(777), "20경기를 이어 돌려도 시드 하나로 재현된다");
}

/* ---------- ② Math.random 직접 호출 0건 ----------
 * 문자열로 grep하지 않습니다 — 주석에 적혀 있어도 통과하니까요.
 * Math를 감싸서 넘기고 **실제로 몇 번 불리는지** 셉니다. */
{
  const E2 = load();
  E2._t.seed(4242); E2._t.skill = 0.5;
  E2.__mathRandomCalls.random = 0;
  for (let i = 0; i < 50; i++) {
    E2._t.playMatch({ xi: xiOf("mf", 100, 70), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
    E2._t.autoMatch({ xiA: xiOf("fw", 90, 70), xiB: xiOf("df", 90, 66), strA: 70, strB: 66 });
    E2.shareByWeight(xiOf("fw", 90, 70), 2, "goal");
  }
  check(E2.__mathRandomCalls.random === 0,
    `엔진의 모든 굴림이 _rng 하나를 지나간다 (Math.random 직접 호출 ${E2.__mathRandomCalls.random}건)`);
  E2._t.unseed();
  E2.__mathRandomCalls.random = 0;
  E2._t.playMatch({ xi: xiOf("mf", 100, 70), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
  check(E2.__mathRandomCalls.random > 0, "unseed()하면 Math.random으로 돌아간다");
}

/* ---------- ③ 옛 세이브 — speed 없는 stats (설계 §9-2 규칙 6 · 검사 5번) ----------
 * `|| 0`으로 채우면 종합이 내려가 그 선수가 갑자기 약해져요.
 * 나머지 평균으로 채우면 (합 + 평균) ÷ (n+1) = 평균이라 소수점까지 안 흔들립니다. */
{
  const old = { shoot: 80, pass: 80, dribble: 80, defense: 80, stamina: 80 };   // speed 없음
  const b = E.blendOf({ pos: "fw", stats: old });
  check(near(b, 80, 1e-9), `speed 없는 stats(전부 80)의 blend가 정확히 80 — 나머지 평균 (실제 ${b})`);
  // || 0 이었다면 80×0.60 + 0×0.25 + 80×0.15 = 60 이 나와요
  check(b > 70, "|| 0으로 채우지 않는다 (0으로 채우면 60이 나옵니다)");

  const mixed = { shoot: 120, pass: 60, dribble: 90, defense: 70, stamina: 100 }; // speed 없음
  const bm = E.blendOf({ pos: "wg", stats: mixed });
  const avg = (120 + 60 + 90 + 70 + 100) / 5;         // 88 — speed 자리에 들어갈 값
  const want = 90 * 0.60 + avg * 0.25 + 60 * 0.15;    // wg: 드리블·스피드·패스
  check(near(bm, want, 1e-9), `섞인 옛 stats도 나머지 평균으로 채운다 (${bm.toFixed(4)} = ${want.toFixed(4)})`);

  // 실제로 한 경기를 완주해도 NaN이 안 나야 해요
  const xi = xiOf("mf", 100, 70);
  xi.find((x) => x.me).stats = old;
  E._t.seed(9); E._t.skill = 0.5;
  const r = E._t.playMatch({ xi, oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
  const nums = [r.myGoals, r.assists, r.defense, r.teamGoals, r.oppGoals, r.mineCards];
  check(nums.every((v) => Number.isFinite(v)), "speed 없는 stats로 한 경기를 완주해도 NaN이 안 난다");

  // stats가 빈 객체여도 죽지 않아야 해요 (아주 옛 세이브)
  let died = null;
  try {
    const xi2 = xiOf("df", 70, 70);
    xi2.find((x) => x.me).stats = {};
    E._t.seed(9);
    E._t.playMatch({ xi: xi2, oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
  } catch (e) { died = e.message; }
  check(died === null, `stats가 빈 객체여도 안 죽는다${died ? ` — ${died}` : ""}`);
}

/* ---------- ③-b 변이 검증 — 나머지 평균을 `|| 0`으로 되돌리면 빨간불이어야 ---------- */
{
  const M = load([[
    /return \(k\) => \(stats && typeof stats\[k\] === "number" && isFinite\(stats\[k\]\) \? stats\[k\] : avg\);/,
    'return (k) => ((stats && stats[k]) || 0);',
  ]]);
  const b = M.blendOf({ pos: "fw", stats: { shoot: 80, pass: 80, dribble: 80, defense: 80, stamina: 80 } });
  check(near(b, 60, 1e-9), `변이 검증 — 나머지 평균을 || 0으로 바꾸면 blend가 60으로 떨어진다 (실제 ${b})`);
}

/* ---------- ④~⑥ 카드 계약 · N 불변 · 스코어 ----------
 * 화면(match-scene.js)이 읽는 이름을 여기 그대로 적습니다. 한쪽만 고치면
 * **화면이 조용히 아무것도 안 그려요** — 이 저장소의 단골 버그예요. */
{
  const KINDS = ["kick", "goal", "assist", "defend", "filler", "half", "end"];
  const RESULTS = ["goal", "assist", "shot", "save", "concede", "none"];
  let bad = 0, badN = 0, badScore = 0, badCut = 0, maxPlay = 0, badText = 0;
  E._t.seed(31337); E._t.skill = 0.5;
  for (let i = 0; i < 400; i++) {
    const pos = ["fw", "wg", "mf", "df"][i % 4];
    const r = E._t.playMatch({ xi: xiOf(pos, 70 + (i % 5) * 20, 70), oppName: "상대",
      teamStr: 70, oppStr: 55 + (i % 3) * 15, condition: 40 + (i % 7) * 10 });
    let us = 0, them = 0, plays = 0, gapSeen = false;
    for (const c of r.cards) {
      if (KINDS.indexOf(c.kind) < 0) bad += 1;
      if (!Number.isFinite(c.min) || c.min < 0 || c.min > 95) bad += 1;
      if (RESULTS.indexOf(c.result) < 0) bad += 1;
      if (!Array.isArray(c.score) || c.score.length !== 2
        || !Number.isFinite(c.score[0]) || !Number.isFinite(c.score[1])) bad += 1;
      if (typeof c.mine !== "boolean" || typeof c.decisive !== "boolean" || typeof c.goAhead !== "boolean") bad += 1;
      if (!c.credit || !Number.isFinite(c.credit.g) || !Number.isFinite(c.credit.a) || !Number.isFinite(c.credit.d)) bad += 1;
      // 화면이 문자열 비교를 하는 자리 — stakeKey는 코드여야 하고 한국어면 안 돼요
      if (c.stakeKey != null && !/^[a-zA-Z]+$/.test(c.stakeKey)) bad += 1;
      // 필러·킥오프·하프타임·종료는 화면이 text를 그대로 그립니다 — 비면 빈 줄이 떠요
      if ((c.kind === "filler" || c.kind === "kick" || c.kind === "half" || c.kind === "end") && !c.text) badText += 1;
      if (c.kind !== "half" && c.kind !== "end" && c.kind !== "kick") plays += 1;
      // 카드 score가 그 시점 확정 스코어인가 — 화면은 자체로 안 셉니다
      if (c.result === "goal" || c.result === "assist") us += 1;
      if (c.result === "concede") them += 1;
      if (c.kind !== "half" && (c.score[0] !== us || c.score[1] !== them)) badScore += 1;
      if (Math.abs(c.score[0] - c.score[1]) >= 3) gapSeen = true;
    }
    if (plays > 8) badN += 1;
    if (gapSeen && plays > 8) badCut += 1;
    if (plays > maxPlay) maxPlay = plays;
    if (r.teamGoals !== us || r.oppGoals !== them) badScore += 1;
  }
  check(bad === 0, `카드가 화면이 읽는 필드를 전부 갖춘다 (어긋난 칸 ${bad}개)`);
  check(badText === 0, `킥오프·필러·하프타임·종료 카드에 text가 있다 (빈 것 ${badText}개)`);
  check(badScore === 0, `카드 score가 그 시점 확정 스코어이고 result()와 맞는다 (어긋난 곳 ${badScore}개)`);
  check(badN === 0, `N ≤ 8 불변 — 카드가 9장이 되지 않는다 (최대 ${maxPlay}장 · 넘은 경기 ${badN})`);
}

/* ---------- ⑦ 🏆 결승골 — 독립 오라클과 대조 ----------
 * 엔진 출력을 정답으로 삼으면 "자기 자신과 비교"가 됩니다.
 * 축구의 결승골 정의를 검사가 **직접** 계산해서 대조해요:
 *   이긴 팀의 (진 팀 최종 점수 + 1)번째 골. */
{
  E._t.seed(555); E._t.skill = 0.5;
  let decided = 0, wrong = 0, none = 0, onConcedeWhileWinning = 0, ex = null;
  for (let i = 0; i < 1200; i++) {
    const r = E._t.playMatch({ xi: xiOf("fw", 110, 70), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
    if (r.teamGoals === r.oppGoals) continue;
    decided += 1;
    const weWon = r.teamGoals > r.oppGoals;
    const need = (weWon ? r.oppGoals : r.teamGoals) + 1;
    let seen = 0, truth = null;
    for (const c of r.cards) {
      const ours = c.result === "goal" || c.result === "assist";
      const theirs = c.result === "concede";
      if (weWon ? ours : theirs) { seen += 1; if (seen === need) { truth = c; break; } }
    }
    const flagged = r.cards.filter((c) => c.decisive);
    if (flagged.length === 0) { none += 1; continue; }
    if (flagged.length !== 1 || flagged[0] !== truth) {
      wrong += 1;
      if (weWon && flagged[0] && flagged[0].result === "concede") onConcedeWhileWinning += 1;
      if (!ex) ex = { score: `${r.teamGoals}:${r.oppGoals}`,
        seq: r.cards.filter((c) => ["goal", "assist", "concede"].indexOf(c.result) >= 0)
          .map((c) => c.result + (c.decisive ? "◀결승골" : "")).join(" ") };
    }
  }
  check(wrong === 0,
    `🏆 결승골이 축구의 정의와 맞는다 — 이긴 팀의 (진 팀 점수+1)번째 골`
    + ` (판정 난 ${decided}경기 중 어긋남 ${wrong} · 미표기 ${none}`
    + ` · **이긴 경기인데 실점 카드에 붙음 ${onConcedeWhileWinning}**)`
    + (ex ? `\n     예: ${ex.score} — ${ex.seq}` : ""));
}

/* ---------- ⑧ 기준점 ---------- */
{
  check(near(E.condMul(80), 1, 1e-9), `condMul(80) = 1.0000 (실제 ${E.condMul(80).toFixed(6)})`);
  check(near(E.sc(70), 1, 1e-9), `sc(70) = 1.0000 (실제 ${E.sc(70).toFixed(6)})`);
  // §2-6 표 — succ의 중앙값. 값은 설계표에서 그대로 옮겨 적었습니다
  check(near(E.succ(40, 0.5), 0.35, 0.005), `succ(40, 0.5) ≈ 0.35 (실제 ${E.succ(40, 0.5).toFixed(3)})`);
  check(near(E.succ(80, 0.5), 0.49, 0.005), `succ(80, 0.5) ≈ 0.49 (실제 ${E.succ(80, 0.5).toFixed(3)})`);
  check(near(E.succ(120, 0.5), 0.66, 0.005), `succ(120, 0.5) ≈ 0.66 (실제 ${E.succ(120, 0.5).toFixed(3)})`);
  check(E.succ(40, 1) > E.succ(120, 0), "능력치 40 최고조작이 능력치 120 최악조작을 넘는다 (§2-6 — 의도한 것)");
}

/* ---------- ⑨ _t.K ↔ 소스 상수 (대조용) ----------
 * ⚠️ 문턱을 K에서 읽는 게 아니라, **아래에 직접 적은 값**과 K를 맞춰 봅니다.
 *    설계 §3-1 표에서 옮겨 적은 값이에요. 계수를 바꾸려면 이 줄도 같이 고치게 됩니다. */
{
  const WANT = { SCENE_ATK: 0.72, BIG_BASE: 0.45, FAT: 0.55, URG: 0.18, FIN: 0.884,
    CON: 1.111, ME_P: 1.80, SPOT: 4.00, NPC_SPOT: 7.00, N_MIN: 6, N_MAX: 8,
    COND_K: 0.30, COND_REF: 80, ASSIST_P2: 0.75, GOAL_GAP: 3,
    /* 22번 확정 (2026-08-28). CLUTCH는 1.35 → 1.25로 내렸어요 — 1.35는 시즌 골 +3.6%로
     * (라') 중립이 이어받은 ±3% 밴드를 넘습니다. FLOOR_SHARE는 0~0.20 전 구간이
     * 네 조건을 통과해서 안전망으로 0.12에 남겼습니다. */
    CLUTCH: 1.25, FLOOR_SHARE: 0.12 };
  const off = Object.entries(WANT).filter(([k, v]) => E.K[k] !== v).map(([k, v]) => `${k} ${E.K[k]}≠${v}`);
  check(off.length === 0, `확정 계수가 설계 §3-1 표와 같다${off.length ? ` — ${off.join(", ")}` : ""}`);
  // 포지션 가중 — 이게 없으면 센터백이 스트라이커만큼 골을 넣습니다
  check(E.K.GOAL_W.fw > E.K.GOAL_W.wg && E.K.GOAL_W.wg > E.K.GOAL_W.mf && E.K.GOAL_W.mf > E.K.GOAL_W.df,
    "GOAL_W가 fw > wg > mf > df 순서다");
  check(E.K.ASSIST_W.mf >= E.K.ASSIST_W.wg && E.K.ASSIST_W.wg > E.K.ASSIST_W.fw,
    "ASSIST_W가 mf ≥ wg > fw 순서다");
  check(E.K.DEF_W.df > E.K.DEF_W.mf && E.K.DEF_W.mf > E.K.DEF_W.wg,
    "DEF_W가 df > mf > wg 순서다");
  // blend의 주 스탯 — 미드필더가 패스를 올리면 전개 카드 주인공 확률이 직접 올라야 해요 (결함 ①)
  check(E.K.BLEND.mf[0] === "pass" && E.K.BLEND.df[0] === "defense"
    && E.K.BLEND.fw[0] === "shoot" && E.K.BLEND.wg[0] === "dribble",
    "blend의 S1이 포지션마다 맞다 (mf=패스 · df=수비 · fw=슛 · wg=드리블)");
  check(E.K.BLEND_W[0] === 0.60 && E.K.BLEND_W[1] === 0.25 && E.K.BLEND_W[2] === 0.15,
    "blend 가중이 0.60 / 0.25 / 0.15");
}

/* ---------- ⑨-b 🅰️ 패스가 도움에 닿는다 (라이브 결함 ①이 v2에서 풀렸나) ----------
 * 현행 splitMine의 도움 몫 식에는 **패스 스탯이 없어서** 미드필더가 주 스탯을
 * 특화하면 축이 오히려 줄었어요(×0.978 — 키울수록 손해). v2는 blend가 받습니다. */
{
  const flat = play(E, "mf", 100, { n: 1500, seed: 88 });
  const E2 = load();
  const spec = (() => {                       // 총합은 같고 패스만 특화
    const xi = xiOf("mf", 100, 70);
    xi.find((x) => x.me).stats = { shoot: 80, pass: 160, dribble: 90, defense: 90, stamina: 90, speed: 90 };
    E2._t.seed(88); E2._t.skill = 0.5;
    let a = 0;
    for (let i = 0; i < 1500; i++) {
      const xi2 = xiOf("mf", 100, 70);
      xi2.find((x) => x.me).stats = { shoot: 80, pass: 160, dribble: 90, defense: 90, stamina: 90, speed: 90 };
      a += E2._t.playMatch({ xi: xi2, oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 }).assists;
    }
    return a / 1500 * 38;
  })();
  check(spec > flat.season.a * 1.10,
    `패스를 특화한 미드필더의 시즌 도움이 늘어난다 (평평 ${flat.season.a.toFixed(1)} → 패스특화 ${spec.toFixed(1)})`);
}

/* ---------- ⑩-a (라′) 중립 — **tests/winger2/neutral-test.js로 옮겼습니다** ----------
 *
 * 여기 있던 검사는 능력치 3칸 × 2,500경기(≈3,700장)에서 ±3%를 봤는데,
 * 그 표본의 1σ가 **±2.7%p**였어요. 밴드가 잡음보다 겨우 컸습니다 —
 * 시드를 바꾸면 −6.3 / +1.5 / −3.0 / −0.7 / −0.4%로 갈렸어요(22번 §①-C-①).
 * **잡음을 결함으로 읽던 검사**였고, 실제로 게이트를 한 번 헛되이 막았습니다.
 *
 * 새 자리는 셋으로 나눠 놨습니다 (22번 balancer 권고 그대로):
 *   ① 정의 검사 (표본 0)  cardP(p, a, 0.5) === p — 중립의 **본체**예요
 *   ② 배선 검사 (합산)    60칸을 합쳐 ±0.3%p
 *   ③ 칸별 검사          ±3%p (카드 ≥7,000장)
 *
 * 이 파일은 0.5초 안에 끝나야 해서 무거운 몬테카를로를 여기 두지 않습니다.
 *   node tests/winger2/neutral-test.js   (≈15초) */

/* ---------- ⑩ 🔒 AXIS_K 잠금 (검사 9번) ----------
 * AXIS_K는 hype와 승격 문턱 **양쪽**에서 ln(prestige)에 곱합니다.
 * 3.00 → 7.00으로 올리면 PL 소속인 것만으로 hype가 +6.13이 되어
 * **성적이 아니라 소속이 상을 정하게 돼요.** 값은 여기 직접 적습니다. */
{
  const CAREER = fs.readFileSync("/workspace/grow-games/beta/winger2/career.js", "utf8");
  const m = CAREER.match(/const AXIS_K\s*=\s*([\d.]+)/);
  check(!!m && Number(m[1]) === 3.00,
    `🔒 AXIS_K = 3.00 (실제 ${m ? m[1] : "못 찾음"}) — 리그 격에 곱해집니다. 올리면 소속이 상을 정해요`);
  /* 🔢 아래 네 값은 **22번 실측 ①에서 확정한 값**입니다 (2026-08-28).
   * 🌟 에이스 구조 수정(나를 후보에서 뺌) 위에서 재적합한 값이라, 그 구조가 되돌아가면
   * 전부 틀린 값이 됩니다 — mutation-test.js E가 그 구조 회귀를 지킵니다.
   *
   * ⚠️ 값을 검사에 **직접 적습니다.** 소스에서 읽어 오면 상수를 바꿔도 검사가 따라가서
   *    아무것도 안 잡혀요. 계수를 옮기려면 이 줄도 같이 고치게 되는 게 맞습니다. */
  const off = CAREER.match(/const AXIS_OFF\s*=\s*([\d.]+)/);
  check(!!off && Number(off[1]) === 2.00,
    `AXIS_OFF = 2.00 (실제 ${off ? off[1] : "못 찾음"}) — 22번 §확정 계수. V1 구조에서 재적합`);
  const pos = CAREER.match(/const POS_AXIS = \{[\s\S]*?\n {2}\};/);
  /* ⚠️ df.n 0.816은 **철벽상 축을 「차단 횟수」로 잡은 값**이에요.
   *    부문상 게이트(①-G · designer §12-4b G-1~G-7)에서 축을 「무실점 경기 수」로 바꾸면
   *    이 값을 **그 게이트에서 다시 잡아야 합니다.** 지금은 0.816이 맞습니다. */
  const want = { fw: 1.128, wg: 0.957, mf: 0.815, df: 0.816 };
  const gotN = {};
  if (pos) for (const [, k, v] of pos[0].matchAll(/(\w+):\s*\{[^}]*n:\s*([\d.]+)/g)) gotN[k] = Number(v);
  const bad = Object.entries(want).filter(([k, v]) => gotN[k] !== v).map(([k, v]) => `${k} ${gotN[k]}≠${v}`);
  check(bad.length === 0, `POS_AXIS의 n이 설계 §3-2 표와 같다${bad.length ? ` — ${bad.join(", ")}` : ""}`);
  const rate = CAREER.match(/const RATE = \{[\s\S]*?\n {2}\};/);
  const bs = rate ? Array.from(rate[0].matchAll(/b:\s*(\d+)/g)).map((x) => Number(x[1])) : [];
  check(bs.length >= 4 && bs.slice(0, 4).join(",") === "64,64,64,65",
    `RATE의 b가 64/64/64/65 (실제 ${bs.slice(0, 4).join("/") || "못 찾음"})`);
  /* 🏅 MOM_MIN 8.30 — 22번 확정. 7.6은 **사실상 안 물리는 문턱**이었어요
   * (라운드 최고 평점이 거의 항상 7.6을 넘어서 7.0과 8.9%로 같았습니다).
   * 8.30에서 능력치 110 MOM 6.2% (목표 6%).
   * ⚠️ 이 값은 RATE의 b와 🌟 에이스 구조 **둘 다**에 딸려 있습니다 — 둘 중 하나가 움직이면 다시 재세요.
   * ⚪ 여기서 지키는 건 **상수 자리**뿐입니다. "K리그1 능력치 110에서 MOM 5~8%"라는
   *    행동 검사(22번 inspector 항목 24)는 career.js의 리그·평점·MOM 판정을 통째로
   *    굴려야 해서 아직 안 만들었어요 — 42번 보고서에 미굳힘으로 남겼습니다. */
  const mom = CAREER.match(/const MOM_MIN\s*=\s*([\d.]+)/);
  check(!!mom && Number(mom[1]) === 8.30,
    `MOM_MIN = 8.30 (실제 ${mom ? mom[1] : "못 찾음"}) — 22번 §확정 계수 (능력치 110에서 MOM 6.2%)`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
