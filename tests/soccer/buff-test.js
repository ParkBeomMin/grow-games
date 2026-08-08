/* 🎖️ 시즌 칭호 — 받아서 다는 것이고, 경기에 실제로 붙는가.
 *
 * 제보: "내가 생각했던 칭호는 시즌마다나 일시적으로나 받아서 경기할 때 좀 더
 * 영향력이 있게 하고 싶었던 거야."
 *
 * 그 전의 칭호(PLAYER_TITLES · 11단계)는 능력치에서 자동으로 나오는 라벨이라
 * 받는 것도 아니고 경기에도 관여하지 않았다. 그건 '클래스'로 두고, 시즌 성적으로
 * 받아서 다음 시즌 경기에만 붙는 걸 따로 만들었다.
 *
 * 이런 장치에서 조용히 죽는 자리는 늘 같다.
 *   · 화면에는 칭호가 떠 있는데 산식에는 안 들어간다 (표시와 판정이 다른 것을 봄)
 *   · 지난 시즌 칭호가 안 지워져서 한 번 잘하면 평생 간다
 *   · 결산에 뜬 수상 이름과 칭호 판정이 쓰는 이름이 어긋난다
 * 그래서 이 파일은 산식을 소스에서 떼어 **실제로 굴려서** 차이를 잰다.
 *
 * 지키는 것:
 *   ① 표가 성하다 — id 중복 없음, 효과 종류가 전부 아는 것, 설명이 비어 있지 않음
 *   ② 유효기간 — buffY가 지금 시즌과 같을 때만 든다 (지난 시즌 것은 사라진다)
 *   ③ 종류별 합계에 상한이 걸린다
 *   ④ 결산이 실제로 push하는 수상 이름과 칭호 대응표(AWARD_BUFF)가 맞물린다
 *   ⑤ 경기에 실제로 붙는다 — 골·평점·승부처가 칭호만큼 올라간다
 *   ⑥ 칭호가 없으면 예전과 한 톨도 안 달라진다
 *   ⑦ 변이 검증 — 산식에서 칭호 항을 빼면 ⑤가 무너진다
 *   ⑧ 화면 — 결산에 '다음 시즌 칭호'가, 준비 화면에 칩이 그려진다
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");

const parts = {
  // 재능이 능력치마다 따로 붙어요 — ratingOf가 STAT_KEYS를 훑어요
  statKeys: grab(GAME, /const STAT_KEYS = \[[^\]]*\];/),
  goalScale: grab(GAME, /const GOAL_SCALE = [^;]+;/),
  buffFns: grab(GAME, /const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/),
  posInfo: grab(GAME, /const POS_INFO = \{[\s\S]*?\n\};/),
  clutchScale: grab(GAME, /const CLUTCH_SCALE = [^;]+;/),
  transLv: grab(GAME, /const transLv = [^;]+;/),
  clutch: grab(GAME, /function clutch\(key\) \{[\s\S]*?\n\}/),
  poissonish: grab(GAME, /function poissonish\(lam\) \{[\s\S]*?\n\}/),
  matchContribution: grab(GAME, /function matchContribution\(rating\) \{[\s\S]*?\n\}/),
  autoRes: grab(GAME, /function autoRes\(stat\) \{[\s\S]*?\n\}/),
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  leagueOf: grab(GAME, /function leagueOf\(st\) \{[\s\S]*?\n\}/),
  fanCap: grab(SRC, /const FAN_CAP = [^;]+;/),
  ratingDiv: grab(SRC, /const RATING_DIV = [^;]+;/),
  ratingOf: grab(SRC, /function ratingOf\([^)]*\) \{[\s\S]*?\n {2}\}/),
  // 결산이 칭호를 정하는 블록 — 실제로 굴려서 수상 → 칭호 대응을 본다
  decide: grab(SRC, /const nextBuffs = \[\];[\s\S]*?S\.buffY = S\.proYear \+ 1;/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const B = new Function(`${parts.statKeys}
  ${parts.goalScale}
  ${parts.buffFns}
  return { SEASON_TITLES, BUFF_CAP, AWARD_BUFF, HOT_FORM_BAR, seasonTitleOf, activeBuffs, buffSum, buffMul };`)();

// ---------- ① 표가 성하다 ----------
guard("① 표", () => {
  const ids = B.SEASON_TITLES.map((t) => t.id);
  check(new Set(ids).size === ids.length, `id가 겹치지 않는다 (${ids.length}개)`);
  check(ids.length >= 8, `칭호가 8개 이상이다 (${ids.length}개)`);
  const kinds = new Set();
  let bad = [];
  for (const t of B.SEASON_TITLES) {
    if (!t.name || !t.need || !t.desc) bad.push(t.id);
    for (const k of Object.keys(t.eff || {})) kinds.add(k);
    if (!t.eff || !Object.keys(t.eff).length) bad.push(t.id + "(효과 없음)");
  }
  check(bad.length === 0, `이름·조건·설명·효과가 다 있다 (빈 것: ${bad.join(", ") || "없음"})`);
  const unknown = [...kinds].filter((k) => B.BUFF_CAP[k] == null);
  check(unknown.length === 0,
    `효과 종류가 전부 상한표에 있다 (상한 없는 종류: ${unknown.join(", ") || "없음"})`);
  console.log(`   효과 종류 — ${[...kinds].join(" · ")}`);
});

// ---------- ② 유효기간 ----------
guard("② 유효기간", () => {
  const st = { proYear: 7, buffs: ["boot", "ruler"], buffY: 7 };
  check(B.activeBuffs(st).length === 2, `그 시즌에는 들린다 (${B.activeBuffs(st).map((t) => t.name).join(" · ")})`);
  check(B.activeBuffs({ ...st, proYear: 8 }).length === 0,
    "다음 시즌이 되면 저절로 빠진다 — 유지하려면 그 성적을 또 내야 해요");
  check(B.activeBuffs({ ...st, buffs: undefined }).length === 0, "칭호가 없는 세이브는 빈 목록이다");
  check(B.activeBuffs({ proYear: 3 }).length === 0, "옛 세이브(칭호 칸 자체가 없음)도 안 던진다");
  check(B.activeBuffs({ ...st, buffs: ["없는칭호"] }).length === 0,
    "모르는 id는 조용히 버린다 — 옛 세이브가 못 읽는 칭호를 갖고 있어도 안 죽어요");
});

// ---------- ③ 상한 ----------
guard("③ 상한", () => {
  const all = B.SEASON_TITLES.map((t) => t.id);
  const st = { proYear: 1, buffs: all, buffY: 1 };
  let over = [];
  for (const k of Object.keys(B.BUFF_CAP)) {
    const raw = B.SEASON_TITLES.reduce((a, t) => a + (t.eff[k] || 0), 0);
    const got = B.buffSum(k, st);
    console.log(`   ${k} — 전부 달면 ${raw.toFixed(2)} → 상한 적용 ${got.toFixed(2)} (상한 ${B.BUFF_CAP[k]})`);
    if (got > B.BUFF_CAP[k] + 1e-9) over.push(k);
  }
  check(over.length === 0, `종류별 합계가 상한을 안 넘는다 (넘은 것: ${over.join(", ") || "없음"})`);
  check(B.buffMul("g", { proYear: 1 }) === 1, "칭호가 없으면 배수가 정확히 1이다");
});

/* ---------- ④ 수상 이름과 칭호 판정이 맞물리는가 ----------
 * 결산이 awards에 넣는 문자열을 소스에서 그대로 긁어 온다. 대응표(AWARD_BUFF)의
 * 키가 그중에 없으면, 그 칭호는 **영원히 안 나오는 칭호**다. 화면에는 표가 있는데
 * 아무도 못 받는 상태 — 이 게임에서 여러 번 나온 병이다. */
guard("④ 수상 ↔ 칭호", () => {
  const pushed = [...SRC.matchAll(/awards\.push\("([^"]+)"\)/g)].map((m) => m[1]);
  check(pushed.length >= 5, `결산이 넣는 수상 이름을 소스에서 뽑았다 (${pushed.join(" · ")})`);
  const stray = Object.keys(B.AWARD_BUFF).filter((k) => !pushed.includes(k));
  check(stray.length === 0,
    `대응표의 수상 이름이 전부 실제로 주어지는 상이다 (없는 상: ${stray.join(", ") || "없음"})`);
  /* ⚠️ 반대 방향도 봐야 해요. 🥈 베스트11이 대응표에서 빠져 있어서 **그 상만
   * 칭호가 없었어요**(제보). 상은 받는데 다음 시즌에 아무것도 안 붙는 자리였습니다. */
  const orphan = pushed.filter((k) => !B.AWARD_BUFF[k]);
  check(orphan.length === 0,
    `결산에서 주는 상이 전부 칭호로 이어진다 (칭호 없는 상: ${orphan.join(", ") || "없음"})`);
  const mapped = Object.values(B.AWARD_BUFF);
  const missingTitle = mapped.filter((id) => !B.seasonTitleOf(id));
  check(missingTitle.length === 0,
    `대응표가 가리키는 칭호가 전부 표에 있다 (없는 칭호: ${missingTitle.join(", ") || "없음"})`);

  // 판정 블록을 실제로 굴려 본다 — 상을 쓸어 담은 시즌과 강등된 시즌
  const decide = new Function("S", "awards", "avgRating", "move", "AWARD_BUFF", "HOT_FORM_BAR",
    `${parts.decide}\n return S.buffs;`);
  const sweep = decide({ proYear: 5 }, ["리그MVP", "베스트11", "골든부츠", "공격포인트왕", "발롱도르"],
    8.1, { kind: "title" }, B.AWARD_BUFF, B.HOT_FORM_BAR);
  console.log(`   상을 쓸어 담은 시즌 → ${sweep.map((id) => B.seasonTitleOf(id).name).join(" · ")}`);
  check(sweep.includes("boot") && sweep.includes("ruler") && sweep.includes("ballon"),
    "부문상·MVP·발롱도르가 각각 칭호가 된다");
  check(sweep.includes("hot"), `시즌 평균 평점 ${B.HOT_FORM_BAR} 이상이면 🔥 물오른 폼이 붙는다`);
  check(sweep.includes("champ"), "우승하면 🏆 챔피언이 붙는다");
  check(new Set(sweep).size === sweep.length, "같은 칭호가 두 번 들어가지 않는다");

  const down = decide({ proYear: 5 }, [], 5.4, { kind: "down" }, B.AWARD_BUFF, B.HOT_FORM_BAR);
  console.log(`   강등된 시즌 → ${down.map((id) => B.seasonTitleOf(id).name).join(" · ") || "없음"}`);
  check(down.length === 1 && down[0] === "revenge",
    "강등된 시즌에는 🕯️ 설욕의 각오만 붙는다 — 최악의 시즌에도 손잡이 하나는 있어야 해요");

  const quiet = decide({ proYear: 5 }, [], 6.2, null, B.AWARD_BUFF, B.HOT_FORM_BAR);
  check(quiet.length === 0, "아무것도 못 한 시즌에는 칭호가 없다 — 그냥 주는 게 아니에요");

  const st = { proYear: 5 };
  decide(st, ["골든부츠"], 6.0, null, B.AWARD_BUFF, B.HOT_FORM_BAR);
  check(st.buffY === 6, `칭호는 **다음** 시즌 것으로 찍힌다 (${st.proYear}시즌 결산 → ${st.buffY}시즌)`);
});

/* ---------- ⑤⑥⑦ 경기에 실제로 붙는가 ---------- */
const engine = (extra) => new Function("S", "clamp", "rand", `
  ${parts.statKeys}
  ${parts.goalScale}
  ${extra || parts.buffFns}
  ${parts.posInfo} ${parts.clutchScale} ${parts.transLv} ${parts.clutch}
  ${parts.leagues} ${parts.leagueOf}
  ${parts.poissonish} ${parts.matchContribution} ${parts.autoRes}
  ${parts.fanCap} ${parts.ratingDiv} ${parts.ratingOf}
  return { ratingOf, matchContribution, autoRes };`);

const STATS = ["shoot", "pass", "dribble", "defense", "stamina"];
function measure(api, buffs, n) {
  const S = {
    pos: "fw", league: 1, proYear: 5, condition: 80, fandom: 900,
    stats: {}, talents: {}, trans: {}, buffs: buffs || undefined, buffY: buffs ? 5 : undefined,
  };
  for (const k of STATS) { S.stats[k] = 85; S.talents[k] = 1.3; }
  const fns = api(S, clamp, rand);
  let g = 0, a = 0, d = 0, rate = 0, perfect = 0;
  for (let i = 0; i < n; i++) {
    const r = fns.ratingOf(S.stats, S.pos, S.condition, S.fandom);
    rate += r;
    const c = fns.matchContribution(r);
    g += c.g; a += c.a; d += c.def;
    if (fns.autoRes(S.stats.shoot) === "perfect") perfect += 1;
  }
  return { g: g / n, a: a / n, d: d / n, rate: rate / n, perfect: perfect / n };
}

/* ⚽ 득점 눈금(GOAL_SCALE)이 들어가면서 한 경기 골이 2.2 → 0.7로 줄었어요.
 * 같은 표본 수로는 상대 오차가 세 배가 돼서 ±3.5% 문턱을 그냥 스칩니다.
 * 문턱을 넓히는 대신 표본을 늘려요 — 문턱을 넓히면 검사가 무뎌져요. */
const N = 140000;
guard("⑤ 경기 효과", () => {
  const api = engine();
  const base = measure(api, null, N);
  const boot = measure(api, ["boot"], N);
  const ruler = measure(api, ["ruler"], N);
  const hot = measure(api, ["hot"], N);
  const wall = measure(api, ["wall"], N);
  const maker = measure(api, ["maker"], N);
  const pct = (x, b) => ((x / b - 1) * 100).toFixed(1);
  console.log(`   기준        골 ${base.g.toFixed(3)} 도움 ${base.a.toFixed(3)} 수비 ${base.d.toFixed(3)} 평점 ${base.rate.toFixed(3)} 승부처 ${(base.perfect * 100).toFixed(1)}%`);
  console.log(`   🥇 골든부츠  골 ${boot.g.toFixed(3)} (${pct(boot.g, base.g)}%)`);
  console.log(`   🎯 도우미    도움 ${maker.a.toFixed(3)} (${pct(maker.a, base.a)}%)`);
  console.log(`   🛡️ 수비수    수비 ${wall.d.toFixed(3)} (${pct(wall.d, base.d)}%)`);
  console.log(`   👑 지배자    평점 ${ruler.rate.toFixed(3)} (+${(ruler.rate - base.rate).toFixed(3)})`);
  console.log(`   🔥 물오른 폼 승부처 ${(hot.perfect * 100).toFixed(1)}% (+${((hot.perfect - base.perfect) * 100).toFixed(1)}%p)`);

  const want = (id, k) => B.seasonTitleOf(id).eff[k];
  const near = (got, exp, tol) => Math.abs(got - exp) <= tol;
  check(near(boot.g / base.g - 1, want("boot", "g"), 0.035),
    `🥇 골든부츠가 골을 표에 적힌 만큼 올린다 (기대 +${(want("boot", "g") * 100).toFixed(0)}% · 실측 ${pct(boot.g, base.g)}%)`);
  check(near(maker.a / base.a - 1, want("maker", "a"), 0.035),
    `🎯 리그 최고 도우미가 도움을 올린다 (기대 +${(want("maker", "a") * 100).toFixed(0)}% · 실측 ${pct(maker.a, base.a)}%)`);
  check(near(wall.d / base.d - 1, want("wall", "d"), 0.035),
    `🛡️ 리그 최고 수비수가 수비를 올린다 (기대 +${(want("wall", "d") * 100).toFixed(0)}% · 실측 ${pct(wall.d, base.d)}%)`);
  check(near(ruler.rate - base.rate, want("ruler", "rate"), 0.06),
    `👑 리그의 지배자가 평점을 올린다 (기대 +${want("ruler", "rate")} · 실측 +${(ruler.rate - base.rate).toFixed(3)})`);
  check(near(hot.perfect - base.perfect, want("hot", "moment"), 0.02),
    `🔥 물오른 폼이 승부처 성공률을 올린다 (기대 +${(want("hot", "moment") * 100).toFixed(0)}%p · 실측 +${((hot.perfect - base.perfect) * 100).toFixed(1)}%p)`);
  // 엉뚱한 축은 안 건드려요 — 골 칭호가 수비까지 올리면 표가 거짓말이 돼요
  check(near(boot.d / base.d - 1, 0, 0.035),
    `🥇 골든부츠는 수비를 안 건드린다 (${pct(boot.d, base.d)}%)`);
});

guard("⑥ 칭호가 없으면 그대로", () => {
  const api = engine();
  const a = measure(api, null, N), b = measure(api, [], N);
  check(Math.abs(a.g / b.g - 1) < 0.03 && Math.abs(a.rate - b.rate) < 0.04,
    `빈 칭호 목록은 아무 일도 안 한다 (골 ${a.g.toFixed(3)} vs ${b.g.toFixed(3)} · 평점 ${a.rate.toFixed(3)} vs ${b.rate.toFixed(3)})`);
  // 지난 시즌 칭호는 붙지 않아요 (②의 산식을 경기 쪽에서 다시 확인)
  const stale = measure((S, c, r) => {
    S.buffs = ["boot", "ballon"]; S.buffY = S.proYear - 1;
    return engine()(S, c, r);
  }, null, N);
  check(Math.abs(stale.g / a.g - 1) < 0.03,
    `지난 시즌 칭호는 경기에 안 붙는다 (${stale.g.toFixed(3)} vs ${a.g.toFixed(3)})`);
});

/* ---------- ⑦ 변이 검증 — 산식에서 칭호 항을 빼면 ⑤가 무너져야 한다 ---------- */
guard("⑦ 변이 검증", () => {
  const dead = parts.buffFns
    .replace(/function buffSum\(kind, st\) \{[\s\S]*?\n\}/, "function buffSum() { return 0; }")
    .replace(/const buffMul = [^;]+;/, "const buffMul = () => 1;");
  check(dead !== parts.buffFns, "변이 치환이 실제로 일어났다");
  const api = engine(dead);
  const base = measure(api, null, N);
  const boot = measure(api, ["boot"], N);
  const ruler = measure(api, ["ruler"], N);
  console.log(`   효과를 죽이면 — 골 ${base.g.toFixed(3)} → ${boot.g.toFixed(3)} · 평점 ${base.rate.toFixed(3)} → ${ruler.rate.toFixed(3)}`);
  check(Math.abs(boot.g / base.g - 1) < 0.03 && Math.abs(ruler.rate - base.rate) < 0.04,
    "칭호 항을 빼면 칭호를 달아도 아무 변화가 없다 — ⑤가 진짜 그 항을 재고 있어요");
});

// ---------- ⑧ 화면 ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  localStorage.setItem("grow-auto-mini", "1");
`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
html = html.replace("</body>", `<script>
  window.__get = (n) => eval(n);
  window.__set = (n, v) => { window.__v = v; eval(n + " = window.__v"); };
</script></body>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
const $ = (id) => w.document.getElementById(id);
const Career = w.WingerCareer;
check(!!Career && !!Career._t, "WingerCareer 모듈이 페이지에서 로드된다");
if (!Career || !Career._t) { console.log("\n❌ 실패"); process.exit(1); }

guard("⑧ 화면", () => {
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const S = Career._t.state();
  S.proYear = 5; S.camp = 3; S.activity = null; S.pendingShow = false;

  // 칭호가 없으면 줄 자체가 없어요
  S.buffs = []; S.buffY = 5;
  Career.refreshPro();
  check($("pro-buffs").hidden, "칭호가 없으면 준비 화면에 칭호 줄이 아예 없다");

  S.buffs = ["boot", "ruler"]; S.buffY = 5;
  Career.refreshPro();
  const row = $("pro-buffs");
  const chips = Array.from(row.querySelectorAll(".buff-chip")).map((e) => e.textContent);
  console.log(`=== ⑧ 준비 화면 칭호 줄 — ${chips.join(" / ")} ===`);
  check(!row.hidden && chips.length === 2, `단 칭호가 칩으로 그려진다 (${chips.length}개)`);
  for (const id of ["boot", "ruler"]) {
    const t = B.seasonTitleOf(id);
    check(chips.some((c) => c.includes(t.name)), `${t.name} 칩이 있다`);
    check(chips.some((c) => c.includes(t.desc)), `그 칩에 효과(${t.desc})가 같이 적혀 있다`);
  }

  // 지난 시즌 것이면 화면에서도 사라져요 — 산식과 화면이 같은 규칙을 봐야 해요
  S.buffY = 4;
  Career.refreshPro();
  check($("pro-buffs").hidden, "지난 시즌 칭호는 화면에서도 사라진다");

  // 결산 — 다음 시즌 칭호를 알려줘요
  S.buffs = ["champ", "hot"]; S.buffY = 6;
  S.camp = 0;
  S.career.years = [{ y: 5, hype: 6, wins: 3, sales: 0, dFan: 0, awards: ["베스트11"],
    goals: 20, assists: 8, defense: 5, apps: 30, avg: 7.6 }];
  Career.showActivity();
  const card = $("career-card").textContent.replace(/\s+/g, " ");
  console.log(`=== ⑧ 결산 — "${(card.match(/🎖️[^🔁]*/) || [""])[0].slice(0, 90)}" ===`);
  check(card.includes("6시즌 칭호"), "결산이 다음 시즌 칭호를 알려준다");
  check(card.includes(B.seasonTitleOf("champ").name) && card.includes(B.seasonTitleOf("hot").name),
    "받은 칭호가 이름으로 다 적힌다");
  check(card.includes(B.seasonTitleOf("champ").desc), "효과도 같이 적힌다");

  S.buffs = [];
  Career.showActivity();
  const none = $("career-card").textContent.replace(/\s+/g, " ");
  check(/다음 시즌 칭호 없음/.test(none),
    "못 받은 시즌에는 '없음'과 받는 법을 알려준다 — 조용히 비워두면 기능이 있는 줄도 몰라요");
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
