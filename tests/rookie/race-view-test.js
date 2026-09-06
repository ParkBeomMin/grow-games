/* 🏅 개인 타이틀 레이스 목표판 — 화면이 수상과 같은 잣대를 쓰는가
 *
 * 설계: docs/superpowers/_workspace/rookie/10_designer_race-goal.md (Codex gpt-6-astra)
 *
 * 이 화면은 순위를 **새로 만들지 않아요.** `raceRank()`가 준 줄을 읽어 설명만 붙입니다.
 * 화면이 제 순위를 따로 계산하기 시작하면 "화면에선 1위인데 상은 안 옴"이 되고,
 * 그게 이 게임에서 가장 신뢰를 깎는 버그예요 (중계=기록 100% 일치 계약과 같은 뿌리).
 *
 * 지키는 것:
 *   ⓿ 변이 정규식이 소스에 실제로 걸린다
 *   ① 규정 자격을 하나로 뽑았는데 **옛 조건과 결과가 같다** (리팩터링 회귀)
 *   ② 격차의 방향과 자릿수 — 자책만 반대, 반올림으로 동률을 만들지 않음
 *   ③ 규정까지 남은 양 — 타수는 그대로, 이닝은 아웃 단위 ⅓·⅔
 *   ④ 개막 전·순위 없음·시즌 종료의 처리
 *   ⑤ 화면 — 카드가 **실제로 그려지고**, 탭이 **실제로 먹고**, 남의 이름이 **이스케이프**되고,
 *      그리는 동안 save()·전역 난수를 **한 번도 안 쓴다**
 *   ⑥ 변이 검증 — 위 단언들이 진짜 무언가를 잡는가
 *
 * 🔒 문턱(규정 타석 = total×2, 규정 이닝 = total×0.9)은 **검사에 상수로 박습니다.**
 *    소스에서 읽어오면 상수를 바꿔도 따라가서 아무것도 안 잡혀요.
 *
 * 종료 코드 — 0 통과 · 1 빨간불 · 2 💥 검사가 아예 안 돌았음
 */
"use strict";
const fs = require("fs");

const BASE = process.env.ROOKIE || "/workspace/grow-games/beta/rookie";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");

let pass = 0, fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); ok ? pass++ : fail++; };
const group = (t) => console.log(`\n— ${t}`);

/* ── ⓿ 변이 등록 검사 ──────────────────────────────────────────────
 * ⑥의 변이는 소스 문자열을 정규식으로 바꿉니다. 구현이 그 문자열을 바꾸면 변이가 조용히
 * 죽고, 그러면 ⑥은 "안 잡힌다"를 못 보고 초록불이 돼요. 그래서 무엇보다 먼저 대조합니다. */
const MUT = {
  gapDir:    [/const gapTo = \(other\) => \(lower \? rows\[myIndex\]\.v - other\.v : other\.v - rows\[myIndex\]\.v\);/,
              "const gapTo = (other) => (lower ? other.v - rows[myIndex].v : rows[myIndex].v - other.v);"],
  aheadRow:  [/const ahead = myIndex >= 1 \? rows\[myIndex - 1\] : null;/,
              "const ahead = myIndex >= 1 ? rows[0] : null;"],
  abNeed:    [/const ab = st\.ab \|\| 0, need = tot \* 2;/, "const ab = st.ab || 0, need = 0;"],
  totFix:    [/const tot = total \|\| 144;/, "const tot = 144;"],
  tinyGap:   [/gap\.toFixed\(3\) === "0\.000" \? "0\.001 미만 차이"/, 'gap.toFixed(3) === "0.000" ? "같은 기록이에요"'],
  escape:    [/\.replace\(\/\[&<>"'\]\/g,\n\s*\(c\) => \(\{[^}]*\}\[c\]\)\)/, ""],
  cardCall:  [/\+ raceProgressHTML\(prog, elig, raceKey\)/, '+ ""'],
  preseason: [/if \(done === 0\) return Object\.assign\(base, \{ mode: "preseason" \}\);/, ""],
};
let deadNeedle = 0;
group("⓿ 변이 등록");
for (const [name, [re]] of Object.entries(MUT)) {
  const ok = re.test(SRC);
  if (!ok) deadNeedle++;
  check(ok, `변이 «${name}» 정규식이 소스에 걸린다`);
}
if (deadNeedle) console.log("   🔴 위가 ❌면 ⑥은 **아무것도 안 지키고 있을 수 있어요.**");

/* ── career.js를 통째로 돌려 Career._t를 얻습니다 (posting-test와 같은 with(스코프) 방식) ── */
function load(mutations) {
  let src = SRC;
  for (const key of mutations || []) {
    const [re, to] = MUT[key];
    if (!re.test(src)) throw new Error(`변이 «${key}»가 안 걸렸어요`);
    src = src.replace(re, to);
  }
  const calls = { save: 0, random: 0 };
  const el = () => ({
    _html: "", dataset: {}, hidden: false, textContent: "", _listeners: [],
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    addEventListener(t, fn) { this._listeners.push([t, fn]); },
    querySelector() { return null; },
    focus() { this._focused = true; },
  });
  const nodes = {};
  const store = {
    // 🔗 sim.js와 game.js에서 오는 것만 최소로 세웁니다 — 나머지는 스텁이 받아요
    window: { RookieSim: { avgOf: (b) => (b.ab ? b.hits / b.ab : 0), eraOf: (p) => (p.ip ? (p.er * 9) / p.ip : 99) } },
    leagueOf: () => ({ id: 1, tier: 1, name: "KBO", short: "국내", flag: "🇰🇷", oppUp: 0, prestige: 1, games: 144 }),
    document: { createElement: el, body: el() },
    $: (id) => (nodes[id] = nodes[id] || el()),
    save: () => { calls.save++; },
    show: () => {}, clearSave: () => {},
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    rand: (a, b) => a + 0.5 * (b - a), randInt: (a, b) => Math.floor((a + b) / 2),
    pick: (a) => a[0], shuffle: (a) => a.slice(),
    S: {}, STAT_DEFS: {}, overall: () => 100,
  };
  const stub = function () { return undefined; };
  const scope = new Proxy(store, {
    has: () => true,
    get(t, k) {
      if (k === Symbol.unscopables) return undefined;
      if (k in t) return t[k];
      if (k in globalThis) return globalThis[k];
      return stub;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  // eslint-disable-next-line no-new-func
  new Function("scope", `with (scope) { ${src} }`)(scope);
  const C = store.window.Career;
  if (!C || !C._t || typeof C._t.raceProgressOf !== "function") {
    throw new Error("Career._t에서 목표판 함수를 못 찾았어요");
  }
  return { t: C._t, store, nodes, calls };
}

let base;
try { base = load(); } catch (e) { console.log(`💥 ${e.message}`); process.exit(2); }
const T = base.t;

/* ── ① 규정 자격 — 옛 조건과 결과가 같은가 ──────────────────────
 * 🔒 옛 조건을 **검사에 상수로 박아** 대조합니다. 리팩터링이 수상 여부를 바꾸면 빨간불. */
group("① 규정 자격 (옛 조건과 대조)");
const oldEligible = (st, metric, tot) =>
  metric === "avg" ? (st.ab || 0) >= tot * 2
    : metric === "era" ? (st.ip || 0) >= tot * 0.9 && ((st.er || 0) * 9) / Math.max(st.ip || 0, 1) > 0
      : true;
let same = 0, diff = 0;
for (const tot of [143, 144, 162]) {
  for (const metric of ["hits", "hr", "sb", "avg", "wins", "k", "era", "saves"]) {
    for (const st of [
      { ab: tot * 2 - 1, hits: 90, ip: tot * 0.9 - 0.1, er: 40 },
      { ab: tot * 2, hits: 90, ip: tot * 0.9, er: 40 },
      { ab: tot * 2 + 1, hits: 90, ip: tot * 0.9 + 0.1, er: 40 },
      { ab: tot * 2, hits: 90, ip: tot * 0.9, er: 0 },        // 자책 0
      {},                                                       // 빈 기록
    ]) {
      (oldEligible(st, metric, tot) === T.raceMyEligibility(st, metric, tot).eligible) ? same++ : diff++;
    }
  }
}
check(diff === 0, `옛 자격 조건과 새 helper가 ${same}건 전부 일치한다 (불일치 ${diff}건)`);
check(T.raceMyEligibility({ ab: 287 }, "avg", 144).missing === 1, "144경기·287타수는 1타수 부족이다");
check(T.raceMyEligibility({ ab: 323 }, "avg", 162).missing === 1, "162경기·323타수는 1타수 부족이다");
check(T.raceMyEligibility({ ab: 285 }, "avg", 143).missing === 1, "143경기·285타수는 1타수 부족이다");
check(T.raceMyEligibility({ ip: 200, er: 0 }, "era", 144).reason === "zero-era",
  "규정 이닝을 채워도 자책 0이면 기존처럼 집계에서 빠진다");

/* ── ② 격차 ── */
group("② 격차의 방향과 자릿수");
const rank = (vals) => vals.map((v, i) => (v.me ? { name: "나", team: "우리", me: true, v: v.v } : { name: `N${i}`, team: `T${i}`, v: v.v }));
const prog = (metric, vals, opt) => T.raceProgressOf(metric, rank(vals),
  { eligible: true }, (opt && opt.game) != null ? opt.game : 60, (opt && opt.total) || 144);

const hits = prog("hits", [{ v: 100 }, { v: 93 }, { v: 91, me: true }]);
check(hits.leaderGap === 9 && hits.aheadGap === 2, `안타 — 선두 9 · 앞 2 (${hits.leaderGap} · ${hits.aheadGap})`);
const era = prog("era", [{ v: 2.40 }, { v: 2.70 }, { v: 3.10, me: true }]);
check(Math.abs(era.leaderGap - 0.70) < 1e-9 && Math.abs(era.aheadGap - 0.40) < 1e-9,
  `자책 — 낮은 쪽이 위, 선두 0.70 · 앞 0.40 (${era.leaderGap.toFixed(2)} · ${era.aheadGap.toFixed(2)})`);
const tied = prog("hits", [{ v: 50, me: true }, { v: 50 }]);
check(tied.myIndex === 0 && tied.tiedFirst === true, "같은 원값이면 공동 선두로 본다");
const sole = prog("avg", [{ v: 0.31, me: true }]);
check(sole.soleEntrant === true && sole.leaderGap === 0, "집계 대상이 나뿐인 경우를 구분한다");
check(T.raceGapText("avg", 0.0004) === "0.001 미만 차이", "양수 0.0004는 동률이 아니라 «0.001 미만»이다");
check(T.raceGapText("era", 0.004) === "0.01 미만 차이", "자책 0.004도 «0.01 미만»이다");
check(T.raceGapText("hits", 0) === "같은 기록이에요", "정확히 같을 때만 동률이라고 말한다");
check(T.raceGapText("hits", 8) === "8안타 차이", `안타 격차 문구 (${T.raceGapText("hits", 8)})`);
// 🔒 입력을 얼려도 계산이 되는가 — 원본 배열을 정렬·수정하면 수상 판정이 흔들려요
const frozen = Object.freeze(rank([{ v: 10 }, { v: 5, me: true }]).map(Object.freeze));
let frozeOk = true;
try { T.raceProgressOf("hits", frozen, { eligible: true }, 10, 144); } catch (e) { frozeOk = false; }
check(frozeOk, "동결한 순위 배열을 건드리지 않는다 (정렬·수정 없음)");

/* ── ③ 규정까지 남은 양 ── */
group("③ 규정 안내 문구");
check(T.raceEligibilityText({ eligible: false, reason: "ab", missing: 38 }) === "순위에 들어가려면 38타수가 더 필요해요",
  "타수는 그대로 적는다");
check(T.raceEligibilityText({ eligible: false, reason: "ip", missing: 12 + 1 / 3 }).includes("12⅓이닝"),
  `이닝은 ⅓로 적는다 (${T.raceEligibilityText({ eligible: false, reason: "ip", missing: 12 + 1 / 3 })})`);
check(T.raceEligibilityText({ eligible: false, reason: "ip", missing: 12 + 2 / 3 }).includes("12⅔이닝"),
  "이닝은 ⅔도 적는다");
check(!T.raceEligibilityText({ eligible: false, reason: "ip", missing: 12.1 }).includes("12.1"),
  "«12.1이닝»처럼 소수로 적지 않는다 (야구에서 12.1은 12⅓을 뜻해요)");
check(T.raceEligibilityText({ eligible: false, reason: "zero-era" }).includes("무실점"), "자책 0은 이유를 설명한다");

/* ── ④ 상태 갈래 ── */
group("④ 개막 전 · 순위 없음 · 남은 경기");
check(prog("hits", [{ v: 0, me: true }, { v: 0 }], { game: 0 }).mode === "preseason",
  "개막 전에는 0안타 공동 선두를 선두라고 하지 않는다");
check(T.raceProgressOf("avg", [], { eligible: false, reason: "ab", missing: 5 }, 30, 144).mode === "unqualified",
  "규정 미달이면 순위 대신 규정 목표를 준다");
check(prog("hits", [{ v: 10 }], { game: 30 }).mode === "empty", "내 줄이 없으면 «비교할 기록 없음»이다");
check(prog("hits", [{ v: 5, me: true }], { game: 69 }).remaining === 75, "G69/144면 남은 75경기다");
check(prog("hits", [{ v: 5, me: true }], { game: 200 }).remaining === 0, "완료 경기가 총 경기를 넘으면 남은 0경기다");
check(prog("hits", [{ v: 5, me: true }], { game: 100, total: 162 }).remaining === 62, "162경기 리그도 저장된 total로 센다");

/* ── ⑤ 화면 — 진짜 그려지고, 진짜 먹는가 ── */
group("⑤ 화면과 배선");
function screen(mutations) {
  const L = load(mutations);
  const S = L.store.S;
  Object.assign(S, {
    name: "나", team: "한백 코메츠", pos: "batter", role: "타자", proYear: 3, league: 1,
    season: {
      game: 69, total: 144, teamW: 38, teamL: 31,
      others: [{ name: "가", w: 40, l: 29, str: 0.55 }, { name: "나", w: 30, l: 39, str: 0.45 }],
      stats: { ab: 300, hits: 91, hr: 12, sb: 5 },
      lg: { teams: [{ name: "달빛 <b>번개</b>", batters: [{ name: "강교타 & 아들", ab: 320, hits: 100, hr: 9, sb: 3 }], pitchers: [] }] },
    },
  });
  // 리그 로스터를 손으로 세웠으니 시뮬을 다시 돌릴 이유가 없어야 해요
  const realRandom = Math.random;
  Math.random = () => { L.calls.random++; return realRandom(); };
  try { L.t.renderStandings(); } finally { Math.random = realRandom; }
  return { L, html: L.nodes["pro-standings-body"]._html, body: L.nodes["pro-standings-body"] };
}
let sc;
try { sc = screen(); } catch (e) { console.log(`💥 화면을 세우지 못했어요 — ${e.message}`); process.exit(2); }
check(/race-goal/.test(sc.html), "목표 카드가 실제로 그려진다");
check(/현재 \d+위/.test(sc.html), `내 순위가 카드에 적힌다 (${(sc.html.match(/현재 \d+위[^<]*/) || [""])[0]})`);
check(/선두와 .*차이/.test(sc.html), "선두와의 격차가 적힌다");
check(/바로 앞/.test(sc.html), "바로 앞 선수가 적힌다");
check(sc.html.includes("&amp;") && !sc.html.includes("강교타 & 아들"),
  "남이 올린 이름의 &가 이스케이프된다");
check(sc.html.includes("&lt;b&gt;") && !sc.html.includes("<b>번개</b>"),
  "구단명에 섞인 태그가 텍스트로 남는다 (라이벌 이름은 유저 풀에서 와요)");
check(sc.L.calls.save === 0, `순위를 그리는 동안 save()를 안 부른다 (${sc.L.calls.save}회)`);
check(sc.L.calls.random === 0, `순위를 그리는 동안 전역 난수를 안 쓴다 (${sc.L.calls.random}회)`);
check(/aria-pressed="true"/.test(sc.html), "선택된 탭에 aria-pressed가 붙는다");

// 탭을 실제로 눌러 봅니다 — 위임 핸들러에 진짜 이벤트를 보냅니다
const wired = sc.body._listeners.filter(([t]) => t === "click");
check(wired.length === 1, `탭 클릭이 위임으로 한 번만 물려 있다 (${wired.length}개)`);
if (wired.length) {
  /* 🔒 속성 순서를 가정하지 않아요 — 버튼 태그를 통째로 읽어 그 안에서 둘 다 찾습니다.
   * (순서를 가정했다가 «이미 눌린 탭»을 골라 한 번 헛짚었어요) */
  const tabsOf = (html) => [...html.matchAll(/<button[^>]*class="race-tab[^"]*"[^>]*>/g)].map((m) => ({
    k: (/data-k="(\w+)"/.exec(m[0]) || [])[1],
    pressed: /aria-pressed="true"/.test(m[0]),
  }));
  const before = sc.html;
  const tabs = tabsOf(before);
  check(tabs.length >= 2, `부문 탭이 여럿 그려진다 (${tabs.map((t) => t.k).join(" · ")})`);
  check(tabs.filter((t) => t.pressed).length === 1, "눌린 탭이 정확히 하나다");
  const other = (tabs.find((t) => !t.pressed) || {}).k;
  let tapped = 0;
  wired[0][1]({ target: { closest: (sel) => (sel === ".race-tab" ? (tapped++, { dataset: { k: other } }) : null) } });
  const after = sc.body._html;
  const now = tabsOf(after).find((t) => t.pressed) || {};
  check(tapped === 1, `탭을 실제로 한 번 눌렀다 (${tapped}회)`);
  check(after !== before && now.k === other, `탭을 누르면 그 부문으로 바뀐다 (${tabs.find((t) => t.pressed).k} → ${now.k})`);
  check(sc.L.calls.save === 0, "탭을 눌러도 저장하지 않는다 (화면 상태예요)");
}

/* ── ⑥ 변이 검증 ──────────────────────────────────────────────── */
group("⑥ 변이 검증 — 위 단언이 진짜 무언가를 잡는가");
const mutCases = [
  ["gapDir", "자책 격차의 방향을 뒤집으면", () => {
    const m = load(["gapDir"]).t;
    const r = m.raceProgressOf("era", rank([{ v: 2.40 }, { v: 2.70 }, { v: 3.10, me: true }]), { eligible: true }, 60, 144);
    return !(Math.abs(r.leaderGap - 0.70) < 1e-9);
  }],
  ["aheadRow", "«바로 앞»을 무조건 선두로 바꾸면", () => {
    const m = load(["aheadRow"]).t;
    const r = m.raceProgressOf("hits", rank([{ v: 100 }, { v: 93 }, { v: 91, me: true }]), { eligible: true }, 60, 144);
    return r.aheadGap !== 2;
  }],
  ["abNeed", "규정 타석 문턱을 없애면", () => load(["abNeed"]).t.raceMyEligibility({ ab: 0 }, "avg", 144).eligible === true],
  ["totFix", "total을 144로 고정하면", () => {
    const m = load(["totFix"]).t;
    return m.raceMyEligibility({ ab: 323 }, "avg", 162).missing !== 1;
  }],
  ["tinyGap", "작은 격차를 동률로 뭉개면", () => load(["tinyGap"]).t.raceGapText("avg", 0.0004) === "같은 기록이에요"],
  ["preseason", "개막 전 가드를 지우면", () => {
    const m = load(["preseason"]).t;
    return m.raceProgressOf("hits", rank([{ v: 0, me: true }, { v: 0 }]), { eligible: true }, 0, 144).mode !== "preseason";
  }],
  ["escape", "이름 이스케이프를 지우면", () => screen(["escape"]).html.includes("<b>번개</b>")],
  ["cardCall", "목표 카드 렌더를 빼면", () => !/race-goal/.test(screen(["cardCall"]).html)],
];
for (const [key, label, run] of mutCases) {
  let caught = false;
  try { caught = !!run(); } catch (e) { caught = false; console.log(`   ⚠️ «${key}» 변이가 예외로 죽었어요 — ${e.message}`); }
  check(caught, `${label} 해당 단언이 빨간불이 된다 («${key}»)`);
}

console.log(fail ? `\n❌ ${fail}개 실패 (pass ${pass})` : `\n✅ 통과 (${pass})`);
process.exit(fail ? 1 : 0);
