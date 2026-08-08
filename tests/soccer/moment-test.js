/* 🔥 승부처 — 포지션에 맞는 장면이 오고, 성공이 맞는 자리에 남는가.
 *
 * 제보 둘:
 *   "수비수로 1군 콜업 대기로 들어가서 스탯은 수비 위주로 올리고 있는데
 *    골을 많이 넣어서 MOM이 되고 이러는데 이게 맞나?"
 *   "수비수일 때 미니게임도 골 넣는 미니게임인 거 같은데 포지션별로 최적화해줘야 할 듯"
 *
 * 실측으로 확인된 화면: 슛 36 · 수비 95인 수비수가 6경기 6골로 리그 득점 2위.
 * 원인은 하나였다. 승부처 성공(perfect)이 **포지션과 무관하게 내 골 +1**이었고,
 * ⚽ 득점 눈금(GOAL_SCALE 0.33)이 들어가면서 산식이 뽑는 골이 확 줄어
 * 이 한 골이 득점의 거의 전부가 됐다 —
 * 실측 극장골 비중: 공격수 68% · 미드필더 81% · **수비수 95%**.
 * 중계도 "번개 같은 반응으로 실점을 막았다" 바로 다음 줄에 "극장골!!"이라 적어
 * 화면 안에서 스스로 모순이었다.
 *
 * 지키는 것:
 *   ① 승부처 성공이 붙는 자리가 포지션마다 다르다 (극장골 / 도움 / 차단)
 *   ② 수비수의 승부처 성공은 팀 골이 아니라 **실점 차단**이다
 *   ③ 포지션마다 오는 미니게임이 다르고, 수비수에게 슛 장면이 안 온다
 *   ④ 미니게임이 겨루는 능력치가 그 장면과 맞는다 (수비수의 1:1은 수비)
 *   ⑤ 결과 대사가 그 장면과 맞는다 (수비 장면에 "골망을 흔드는 슛" 금지)
 *   ⑥ 실제로 굴려서 — 수비수가 골을 거의 안 넣는다
 *   ⑦ 변이 검증 — 포지션 구분을 빼면 ⑥이 무너진다
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 실행한다. 직접 eval은 안 쓴다.
 */
"use strict";
const fs = require("fs");
const B = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(B + "/career.js", "utf8");
const GAME = fs.readFileSync(B + "/game.js", "utf8");
const grab = (s, re) => { const m = s.match(re); return m ? m[0] : null; };
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

const parts = {
  // 재능이 능력치마다 따로 붙어요 — ratingOf가 STAT_KEYS를 훑어요
  statKeys: grab(GAME, /const STAT_KEYS = \[[^\]]*\];/),
  goalScale: grab(GAME, /const GOAL_SCALE = [^;]+;/),
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  poissonish: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  buffFns: grab(GAME, /const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/),
  contrib: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  momentKind: grab(GAME, /const MOMENT_KIND = \{[^}]*\};\nconst momentKind = [^;]+;/),
  momentFeed: grab(GAME, /const MOMENT_FEED = \{[\s\S]*?\n\};/),
  pool: grab(GAME, /const MINI_POOL = \{[\s\S]*?\n\};/),
  spec: grab(GAME, /const MINI_SPEC = \{[\s\S]*?\n\};/),
  miniSpec: grab(GAME, /function miniSpec\(mech\) \{[\s\S]*?\n\}/),
  infoBlock: grab(GAME, /const info = \{[\s\S]*?\n {6}\};/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  leagueOf: grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  fanCap: grab(SRC, /const FAN_CAP = [^;]+;/),
  ratingDiv: grab(SRC, /const RATING_DIV = [^;]+;/),
  ratingOf: grab(SRC, /function ratingOf\([^)]*\) \{[\s\S]*?\n {2}\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const POS = ["fw", "wg", "mf", "df"];
const POSN = { fw: "공격수", wg: "윙어", mf: "미드필더", df: "수비수" };
const T = new Function(`${parts.momentKind}\n${parts.momentFeed}\n${parts.pool}\n${parts.spec}
  return { MOMENT_KIND, MOMENT_FEED, MINI_POOL, MINI_SPEC };`)();

// ---------- ① 승부처가 붙는 자리 ----------
guard("① 붙는 자리", () => {
  const shown = POS.map((p) => `${POSN[p]} ${T.MOMENT_KIND[p]}`).join(" · ");
  console.log(`   ${shown}`);
  check(POS.every((p) => T.MOMENT_KIND[p]), "네 포지션에 모두 정의돼 있다");
  check(new Set(POS.map((p) => T.MOMENT_KIND[p])).size >= 3,
    `자리가 셋 이상으로 갈린다 (${[...new Set(POS.map((p) => T.MOMENT_KIND[p]))].join("·")}) — 하나면 옛날과 같아요`);
  check(T.MOMENT_KIND.df === "d", `수비수의 승부처는 수비로 남는다 (${T.MOMENT_KIND.df})`);
  check(T.MOMENT_KIND.fw === "g", `공격수의 승부처는 골로 남는다 (${T.MOMENT_KIND.fw})`);
  // 중계 문구도 자리마다 달라야 해요
  const feeds = Object.keys(T.MOMENT_FEED).map((k) => T.MOMENT_FEED[k]("나", "상대"));
  check(new Set(feeds).size === feeds.length, "중계 문구가 자리마다 다르다");
  check(!/극장골/.test(T.MOMENT_FEED.d("나", "상대")),
    `수비 성공에 "극장골"이라고 적지 않는다 (${T.MOMENT_FEED.d("나", "상대")})`);
});

// ---------- ③④⑤ 미니게임 ----------
guard("③④⑤ 미니게임", () => {
  const specOf = new Function("S", "mech", `${parts.posInfo}\n${parts.spec}\n${parts.miniSpec}
    return miniSpec(mech);`);
  const SHOOTY = /슛|슈팅|골망|골키퍼|크로스바|마무리/;
  for (const p of POS) {
    const pool = T.MINI_POOL[p];
    check(Array.isArray(pool) && pool.length >= 3, `${POSN[p]} — 미니게임이 3개 이상이다 (${pool ? pool.length : 0}개)`);
    const S = { pos: p, stats: { shoot: 36, pass: 26, dribble: 49, defense: 95, stamina: 73 } };
    const seen = pool.map((m) => {
      const { spec, val } = specOf(S, m);
      return { m, label: spec.label, val, txt: spec.txt };
    });
    console.log(`   ${POSN[p]} — ${seen.map((x) => `${x.m}(${x.val})`).join(" · ")}`);
    if (p === "df") {
      const shooty = seen.filter((x) => SHOOTY.test(x.label));
      check(shooty.length === 0,
        `수비수에게 슛 장면이 안 온다 (걸린 것: ${shooty.map((x) => x.m).join(",") || "없음"})`);
      const badTxt = seen.filter((x) => SHOOTY.test(x.txt.great));
      check(badTxt.length === 0,
        `수비수의 성공 대사에도 슛 얘기가 없다 (걸린 것: ${badTxt.map((x) => x.m).join(",") || "없음"})`);
      // 수비수의 1:1은 드리블이 아니라 수비로 겨뤄야 해요
      const duel = seen.find((x) => x.m === "duel");
      check(!duel || duel.val === S.stats.defense,
        `수비수의 1:1은 수비 능력치로 겨룬다 (${duel ? duel.val : "없음"} · 수비 ${S.stats.defense})`);
    }
    // 어떤 포지션이든 겨루는 능력치가 실제 값이어야 해요 (undefined·NaN 금지)
    check(seen.every((x) => typeof x.val === "number" && x.val > 0),
      `${POSN[p]} — 겨루는 능력치가 전부 실제 값이다`);
    check(seen.every((x) => x.txt && x.txt.ok && x.txt.great && x.txt.bad),
      `${POSN[p]} — 결과 대사 세 줄이 다 있다`);
  }
});

/* ---------- ②⑥⑦ 실제로 굴려서 ---------- */
const play = (kindSrc) => new Function("S", "clamp", "rand", "N", `
  ${parts.statKeys}
  ${parts.goalScale}\n${parts.posInfo}\n${parts.clutchScale}\n${parts.transLv}\n${parts.clutch}
  ${parts.poissonish}\n${parts.buffFns}\n${parts.contrib}\n${parts.autoRes}
  ${kindSrc}
  ${parts.leagues}\n${parts.leagueOf}\n${parts.fanCap}\n${parts.ratingDiv}\n${parts.ratingOf}
  const home = "우리", away = "상대", h = 0, a = 0, res = "D", mateGoals = [];
  let g = 0, as = 0, d = 0, perf = 0;
  for (let i = 0; i < N; i++) {
    const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom);
    const c = matchContribution(rating);
    const goals = c.g, assists = c.a, defense = c.def;
    const momentRes = autoRes(S.stats[POS_INFO[S.pos].stat]);
    if (momentRes === "perfect") perf++;
    ${parts.infoBlock}
    g += info.myGoals; as += info.assists; d += info.defense;
  }
  return { g: g / N, a: as / N, d: d / N, perf: perf / N };
`);
const now = play(parts.momentKind);
// 옛 방식 — 포지션과 무관하게 골 +1
const old = play(`const momentKind = () => "g";`);

const STATS = ["shoot", "pass", "dribble", "defense", "stamina"];
function run(fn, pos, stats, n) {
  const S = { pos, league: 1, proYear: 1, condition: 80, fandom: 300,
    stats: Object.assign({}, stats), talents: {}, trans: {} };
  for (const k of STATS) S.talents[k] = 1.2;
  return fn(S, clamp, rand, n);
}
// 제보 그대로의 능력치
const REPORTED = { shoot: 36, pass: 26, dribble: 49, defense: 95, stamina: 73 };

guard("②⑥ 실제 산출", () => {
  const r = run(now, "df", REPORTED, 40000);
  console.log(`   제보 상태(수비수 · 슛36 · 수비95) — 경기당 골 ${r.g.toFixed(3)} · 도움 ${r.a.toFixed(3)} · 수비 ${r.d.toFixed(2)} (승부처 성공 ${(r.perf * 100).toFixed(0)}%)`);
  console.log(`   6경기 환산 — 골 ${(r.g * 6).toFixed(1)}골 (제보 화면은 6골이었어요)`);
  check(r.g * 6 < 1.0,
    `수비 위주 수비수가 6경기에 1골도 못 넣는 게 보통이다 (${(r.g * 6).toFixed(2)}골)`);
  check(r.d > r.g * 10,
    `그 대신 수비가 압도적으로 많다 (수비 ${r.d.toFixed(2)} vs 골 ${r.g.toFixed(3)})`);

  // 균등 능력치로 포지션별 시즌 환산 — 포지션이 기록의 모양을 정해야 해요
  const flat = {};
  for (const k of STATS) flat[k] = 90;
  console.log("   같은 능력치 90 · 38경기 환산");
  const rows = {};
  for (const p of POS) {
    const q = run(now, p, flat, 20000);
    rows[p] = q;
    console.log(`     ${POSN[p]} — 골 ${(q.g * 38).toFixed(0)} · 도움 ${(q.a * 38).toFixed(0)} · 수비 ${(q.d * 38).toFixed(0)}`);
  }
  check(rows.fw.g > rows.df.g * 5, `공격수가 수비수보다 훨씬 많이 넣는다 (${(rows.fw.g * 38).toFixed(0)}골 vs ${(rows.df.g * 38).toFixed(0)}골)`);
  check(rows.mf.a > rows.fw.a, `미드필더가 공격수보다 도움이 많다 (${(rows.mf.a * 38).toFixed(0)} vs ${(rows.fw.a * 38).toFixed(0)})`);
  check(rows.df.d > rows.fw.d * 3, `수비수가 수비 기록이 압도적이다 (${(rows.df.d * 38).toFixed(0)} vs ${(rows.fw.d * 38).toFixed(0)})`);
});

guard("⑦ 변이 검증", () => {
  const r = run(old, "df", REPORTED, 40000);
  console.log(`   옛 방식(포지션 무관 골 +1) — 수비수 6경기 ${(r.g * 6).toFixed(1)}골 · 극장골 비중 ${(r.perf / (r.g || 1) * 100).toFixed(0)}%`);
  check(r.g * 6 >= 1.5,
    `옛 방식이면 수비 위주 수비수도 6경기에 여러 골을 넣는다 (${(r.g * 6).toFixed(1)}골) — 제보의 그 화면이에요`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
