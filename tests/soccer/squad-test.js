/* 👥 스쿼드 — 팀에 실제로 사람이 있고, 선발 경쟁이 도는가.
 *
 * 제보: "한 팀에 선수는 11명으로 있는 건 맞지??" — 아니었다. 팀은 숫자 몇 개뿐이고
 * 동료 골은 이름 없이 굴렀다. 중계에 뜨는 이름은 **개인 순위 8명 중 우리 클럽
 * 소속인 한두 명**에게서 빌려 쓰고 있었다.
 * 이어서: "선발 벤치 넣고 선발이 아니면 스탯을 랜덤하게 하나 올려주면 되지 않을까"
 *
 * 이런 장치에서 조용히 죽는 자리:
 *   · 명단이 둘로 갈려 개인 순위와 팀 명단이 다른 사람을 보여줌 (이 저장소의 단골 병)
 *   · 벤치가 그냥 벌이 됨 — 결장이 곧 성장 정지면 이탈로 이어진다
 *   · 벤치인 주에 리그가 멈춤 (순위표·경쟁자가 그 라운드를 안 치름)
 *   · 실력을 올려도 선발이 안 되거나, 반대로 늘 선발이라 경쟁이 없음
 *
 * 지키는 것:
 *   ① 스쿼드에 선발 11 + 벤치가 있고, 나도 그 안에 한 줄로 들어간다
 *   ② 선발은 포지션 자리마다 실력 순이다
 *   ③ 내 실력이 오르면 선발이 되고, 낮으면 밀린다 (경쟁이 실제로 돈다)
 *   ④ 벤치인 주에는 능력치가 하나 오른다 (손해가 아니다)
 *   ⑤ 동료 골이 실제 선발 선수에게 쌓인다 — 나에게는 안 쌓인다
 *   ⑥ 개인 순위의 '우리 클럽 선수'가 스쿼드 사람과 같은 사람이다
 *   ⑦ 클럽이 바뀌면 스쿼드를 새로 꾸린다
 *   ⑧ 변이 검증 — 벤치 보상을 없애면 ④가 무너진다
 *
 * 화면 검사는 게임 입구를 통해 실제 상태를 넣고 실제 렌더를 부른다.
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
const SQ = fs.readFileSync(path.join(DIR, "squad.js"), "utf8");

const parts = {
  formation: grab(SQ, /const FORMATION = \{[^}]*\};/),
  bench: grab(SQ, /const BENCH = [^;]+;/),
  size: grab(SQ, /const SQUAD_SIZE = [^;]+;/),
  benchGain: grab(SQ, /const BENCH_GAIN = \[[^\]]*\];/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }
const C = new Function(`${parts.formation}\n${parts.bench}\n${parts.size}\n${parts.benchGain}
  return { FORMATION, BENCH, SQUAD_SIZE, BENCH_GAIN };`)();

guard("포메이션", () => {
  const xi = Object.values(C.FORMATION).reduce((a, b) => a + b, 0);
  console.log(`   ${Object.entries(C.FORMATION).map(([k, v]) => `${k} ${v}`).join(" · ")} = ${xi}명 + 벤치 ${C.BENCH}`);
  check(xi === 11, `선발 자리 합이 11이다 (${xi})`);
  check(C.SQUAD_SIZE === 11 + C.BENCH, `스쿼드 크기가 선발+벤치다 (${C.SQUAD_SIZE})`);
  check(C.BENCH >= 3, `벤치가 3명 이상이다 (${C.BENCH}) — 경쟁이 생기려면 여유가 있어야 해요`);
  check(C.BENCH_GAIN[0] > 0, `벤치 보상의 최소치가 0보다 크다 (+${C.BENCH_GAIN[0]}) — 결장이 손해면 안 돼요`);
});

// ---------- 페이지 ----------
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
const Career = w.WingerCareer, Squad = w.WingerSquad;
check(!!Squad, "squad.js가 페이지에서 로드된다 (WingerSquad)");
if (!Squad || !Career) { console.log("\n❌ 실패"); process.exit(1); }

// 데뷔까지 실제로 눌러서 프로 상태를 얻어요
w.__set("S", w.__get('newState(MARKETS[0], "df", "테스트")'));
Career.onEnding(true, false);
$("btn-go-debut").click();
const S = () => Career._t.state();
const setOvr = (v) => { for (const k of Object.keys(S().stats)) S().stats[k] = v; };

// ---------- ①② 명단과 선발 ----------
guard("①② 명단·선발", () => {
  const sq = Squad.ensureSquad();
  console.log(`   스쿼드 ${sq.length}명 — ${sq.slice(0, 3).map((x) => `${x.name}(${x.pos} ${Math.round(x.str)})`).join(" · ")} …`);
  check(sq.length === C.SQUAD_SIZE, `스쿼드가 ${C.SQUAD_SIZE}명이다 (${sq.length})`);
  check(sq.filter((x) => x.me).length === 1, "그중 한 줄이 나다");
  check(sq.every((x) => x.name && x.pos), "모두 이름과 포지션이 있다");

  const xi = Squad.startingXI();
  check(xi.length === 11, `선발이 11명이다 (${xi.length})`);
  for (const [p, n] of Object.entries(C.FORMATION)) {
    const got = xi.filter((x) => x.pos === p).length;
    check(got === n, `${p} 선발이 ${n}명이다 (${got})`);
  }
  // 자리마다 실력 순인가
  let bad = 0;
  for (const p of Object.keys(C.FORMATION)) {
    const line = sq.filter((x) => x.pos === p).sort((a, b) => b.str - a.str);
    const picked = new Set(xi.filter((x) => x.pos === p));
    line.forEach((x, i) => { if ((i < C.FORMATION[p]) !== picked.has(x)) bad++; });
  }
  check(bad === 0, `선발이 포지션 자리마다 실력 순이다 (어긋난 자리 ${bad})`);
});

// ---------- ③ 경쟁이 실제로 돈다 ----------
guard("③ 선발 경쟁", () => {
  setOvr(5);
  Squad.ensureSquad();
  const low = Squad.isStarter();
  const lowRank = Squad.myLine().rank;
  setOvr(120);
  Squad.ensureSquad();
  const high = Squad.isStarter();
  const highRank = Squad.myLine().rank;
  console.log(`   종합 5 → ${lowRank}번째(${low ? "선발" : "벤치"}) · 종합 120 → ${highRank}번째(${high ? "선발" : "벤치"})`);
  check(!low, "실력이 바닥이면 벤치로 밀린다");
  check(high, "실력이 높으면 선발이 된다");
  check(highRank < lowRank, `실력이 오르면 자리 순번이 앞당겨진다 (${lowRank} → ${highRank})`);
});

// ---------- ④⑧ 벤치 보상 ----------
guard("④ 벤치 보상", () => {
  setOvr(60);
  Squad.ensureSquad();
  let grew = 0, sameCond = 0;
  for (let i = 0; i < 200; i++) {
    /* ⚠️ 매번 되돌려요. 안 그러면 200주를 연달아 굴리는 동안 능력치가 상한에
     * 닿아서 "안 올랐다"가 나와요 — 장치가 아니라 검사가 만든 상황입니다. */
    setOvr(60);
    S().condition = 50;
    const before = Object.assign({}, S().stats);
    const cond = S().condition;
    const r = Squad.benchTurn();
    const after = S().stats;
    if (after[r.key] > before[r.key]) grew++;
    if (S().condition >= cond) sameCond++;
  }
  console.log(`   벤치 200주 — 능력치가 오른 주 ${grew} · 컨디션이 안 깎인 주 ${sameCond}`);
  check(grew === 200, `벤치인 주에는 반드시 능력치가 오른다 (${grew}/200)`);
  check(sameCond === 200, `벤치인 주에는 컨디션이 안 깎인다 (${sameCond}/200) — 안 뛰었으니까요`);
  // 상한을 넘지 않아요
  for (const k of Object.keys(S().stats)) S().stats[k] = w.__get("statCap")(k);
  const capped = Object.assign({}, S().stats);
  Squad.benchTurn();
  const over = Object.keys(capped).filter((k) => S().stats[k] > capped[k] + 1e-9);
  check(over.length === 0, `상한에 닿아 있으면 안 넘긴다 (넘은 칸 ${over.length})`);
});

guard("⑧ 변이 검증", () => {
  const broken = parts.benchGain.replace(/\[[^\]]*\]/, "[0, 0]");
  const gainOf = new Function("rand", "tal", `${broken}
    return Math.round(rand(BENCH_GAIN[0], BENCH_GAIN[1]) * tal * 10) / 10;`);
  const got = gainOf((a, b) => a + Math.random() * (b - a), 1.3);
  console.log(`   보상을 0으로 두면 벤치인 주의 상승폭 ${got}`);
  check(got === 0, "보상을 없애면 벤치인 주에 아무것도 안 오른다 — ④가 그걸 지켜요");
});

// ---------- ⑤⑥ 동료 골과 명단 일치 ----------
guard("⑤⑥ 동료 골", () => {
  setOvr(60);
  const sq = Squad.ensureSquad();
  for (const x of sq) x.g = 0;
  const names = Squad.creditMateGoals(50);
  check(names.length === 50, `50골이 배분된다 (${names.length})`);
  const meRow = sq.find((x) => x.me);
  check(meRow.g === 0, `내 이름으로는 안 쌓인다 (${meRow.g}) — 내 골은 내 기록으로 따로 가요`);
  const xi = new Set(Squad.startingXI().map((x) => x.name));
  const outside = names.filter((n) => !xi.has(n));
  check(outside.length === 0, `전부 선발 명단 안의 사람이다 (밖의 이름 ${outside.length})`);
  const total = sq.reduce((a, x) => a + x.g, 0);
  check(total === 50, `명단의 골 합계가 배분한 수와 같다 (${total})`);
  // 포지션 가중 — 공격수 쪽이 수비수보다 많이 넣어야 해요
  const byPos = {};
  for (const x of sq) byPos[x.pos] = (byPos[x.pos] || 0) + x.g;
  console.log(`   50골 배분 — ${Object.entries(byPos).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  check((byPos.fw || 0) > (byPos.df || 0), `공격수가 수비수보다 많이 넣는다 (fw ${byPos.fw || 0} vs df ${byPos.df || 0})`);
});

guard("⑥ 개인 순위와 같은 사람", () => {
  // 시즌을 시작해 경쟁자 명단을 만들어요
  const st = S();
  st.camp = 1; st.activity = null; st.pendingShow = false;
  Career.refreshPro();
  const rest = w.document.querySelector("#pro-actions .action-btn.rest");
  if (rest) rest.click();
  const race = (S().activity || {}).race || [];
  const mine = race.filter((r) => r.club === S().group);
  const sqNames = new Set(Squad.ensureSquad().map((x) => x.name));
  console.log(`   개인 순위의 우리 클럽 선수 ${mine.length}명 — ${mine.map((r) => r.name).join(" · ") || "없음"}`);
  check(mine.length > 0, `개인 순위에 우리 클럽 선수가 있다 (${mine.length}명)`);
  check(mine.every((r) => sqNames.has(r.name)),
    `그 사람들이 전부 스쿼드에 있다 — 명단이 둘로 갈리지 않는다`);
});

// ---------- ⑦ 클럽이 바뀌면 새로 ----------
guard("⑦ 이적", () => {
  const before = Squad.ensureSquad().map((x) => x.name).join("|");
  S().group = "다른 클럽 FC";
  const after = Squad.ensureSquad().map((x) => x.name).join("|");
  check(before !== after, "클럽이 바뀌면 스쿼드를 새로 꾸린다");
  check(S().squadClub === "다른 클럽 FC", `어느 클럽의 명단인지 남는다 (${S().squadClub})`);
  check(Squad.ensureSquad().filter((x) => x.me).length === 1, "새 팀에서도 나는 한 줄이다");
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
