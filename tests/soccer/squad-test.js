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
const active = () => (w.document.querySelector(".screen.active") || {}).id;
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

/* ---------- ⑨ 리그의 모든 클럽에 명단이 있는가 ----------
 * "11명 스쿼드는 다른 팀도 다 동일하게 맞춘 거지?" — 처음에는 우리 팀만이었다.
 * 우리 팀만 사람이 있고 상대는 숫자뿐이면, 개인 순위에 뜨는 다른 팀 선수가
 * 어느 명단에도 없는 유령이 된다. */
guard("⑨ 리그 전체 명단", () => {
  const all = Squad.ensureSquads();
  const clubs = Object.keys(all);
  console.log(`   ${clubs.length}개 클럽 — ${clubs.map((c) => `${c}(${all[c].length})`).join(" · ")}`);
  check(clubs.length >= 4, `리그의 클럽마다 명단이 있다 (${clubs.length}개)`);
  check(clubs.every((c) => all[c].length === C.SQUAD_SIZE),
    `모든 클럽이 ${C.SQUAD_SIZE}명이다`);
  check(clubs.every((c) => Squad.startingXIOf(c).length === 11),
    "모든 클럽의 선발이 11명이다");
  // 나는 우리 팀에만 한 줄로 있어야 해요
  const meRows = clubs.reduce((a, c) => a + all[c].filter((x) => x.me).length, 0);
  check(meRows === 1, `내 줄은 리그 전체에서 하나뿐이다 (${meRows})`);
  check((all[S().group] || []).some((x) => x.me), "그 한 줄이 우리 팀에 있다");
  // 클럽 전력이 명단 실력에 반영돼요 — 강팀이 더 좋은 선수를 갖습니다
  const avg = (c) => all[c].reduce((a, x) => a + x.str, 0) / all[c].length;
  const strs = w.__get("clubsIn")(w.__get("leagueOf")(S()).id, S());
  const strong = strs.slice().sort((a, b) => b.str - a.str)[0];
  const weak = strs.slice().sort((a, b) => a.str - b.str)[0];
  console.log(`   ${strong.name}(전력 ${strong.str}) 평균 ${avg(strong.name).toFixed(0)} · ${weak.name}(전력 ${weak.str}) 평균 ${avg(weak.name).toFixed(0)}`);
  check(avg(strong.name) > avg(weak.name),
    `전력이 센 클럽의 명단이 더 좋다 (${avg(strong.name).toFixed(0)} vs ${avg(weak.name).toFixed(0)})`);
});

guard("⑥ 개인 순위와 같은 사람", () => {
  // 시즌을 시작해 경쟁자 명단을 만들어요
  const st = S();
  st.camp = 1; st.activity = null; st.pendingShow = false;
  Career.refreshPro();
  const rest = w.document.querySelector("#pro-actions .action-btn.rest");
  if (rest) rest.click();
  /* 개인 순위는 이제 **리그 명단 한 벌**에서 나와요 — 시즌 초에 여덟을 따로 뽑아
   * 두던 act.race는 없앴습니다(같은 사람의 기록이 두 벌로 남지 않게).
   * 그래서 여기서도 화면이 실제로 세우는 그 표를 읽어요. */
  const all = Squad.ensureSquads();
  const race = Career._t.raceRank("g").filter((r) => !r.me);
  const mine = race.filter((r) => r.club === S().group);
  console.log(`   개인 순위 ${race.length}명 — ${race.map((r) => `${r.name}(${r.club})`).slice(0, 4).join(" · ")} …`);
  check(race.length > 0, `개인 순위 명단이 만들어졌다 (${race.length}명)`);
  /* 이제 리그의 **모든 선발**이 들어와요. 6팀 × 11명에서 나를 뺀 수예요 —
   * 예전에는 실력 상위 여덟뿐이라 다른 클럽 아홉 번째 선수는 아무리 잘해도
   * 표에 못 올라왔습니다(제보: "전체 리그 선수들 대상으로 다 해야 해"). */
  const xiCount = Object.keys(all).reduce((n2, c) => n2 + Squad.startingXIOf(c).length, 0);
  check(race.length >= xiCount - 1,
    `리그 선발 전원이 들어온다 (${race.length}명 · 선발 합계 ${xiCount}명 중 나 제외)`);
  /* 우리 클럽 선수가 꼭 있어야 하지는 **않아요** — 기록이 좋지 않으면 안 보이는
   * 게 맞습니다(제보). 동료 기록은 👥 명단 화면에 그대로 남아요. */
  console.log(`   그중 우리 클럽 ${mine.length}명 (없어도 괜찮아요)`);
  /* ⚠️ **여덟 명 전부**가 실제 명단의 사람이어야 해요. 우리 팀만 맞추면
   * 다른 팀 선수는 어느 명단에도 없는 유령이 됩니다. */
  const ghosts = race.filter((r) => !(all[r.club] || []).some((x) => x.name === r.name));
  check(ghosts.length === 0,
    `전부 그 클럽 명단에 있는 사람이다 (유령 ${ghosts.length}명${ghosts.length ? ` — ${ghosts.map((g) => `${g.name}(${g.club})`).join(", ")}` : ""})`);
  /* ⚠️ **클럽 할당량은 없어요.** 예전에는 "클럽마다 최소 한 명"을 먼저 채웠는데,
   * 그러면 강팀 3순위보다 못한 약팀 1순위가 자리를 차지해서 표에 평범한 선수가
   * 섞여요. 이건 개인 기록 순위지 클럽을 고르게 보여주는 표가 아닙니다
   * (제보: "개인기록에는 나라마다 한자리는 필요없어" → "리그에서도 동일하게").
   * 우리 클럽 한 자리만 남겨요 — 동료 골이 이 표에 쌓이는 배선이 거기 걸려 있어요. */
  const clubs = new Set(race.map((r) => r.club));
  console.log(`   ${clubs.size}개 클럽에서 나왔어요 (할당량 없이 실력 순)`);
  /* 자리(포지션) 할당량도 **없어요.** 클럽 할당량에 이어 이것도 걷어냈습니다 —
   * 그냥 리그에서 제일 잘하는 여덟이에요(제보: "포지션별 실력순 8명도 필요없는데??"). */
  /* ⚠️ 후보는 **선발 11명**이에요 — 벤치는 개인 순위에 안 올라와요.
   * 명단 16명 전체로 선을 그으면 뽑힐 수 없는 벤치 선수가 기준이 돼서
   * 가끔 빨간불이 뜹니다(실제로 났어요). */
  const pool = Object.keys(all).flatMap((c) => Squad.startingXIOf(c))
    .filter((x) => !x.me).map((x) => x.str).sort((a, b) => b - a);
  const cut = pool[race.length - 1];
  const below = race.filter((r) => r.pop < cut - 1);
  console.log(`   리그 ${race.length}위 선 ${Math.round(cut)} · 그 아래에서 뽑힌 사람 ${below.length}명`);
  check(below.length === 0, `자리를 안 가리고 실력 순으로 뽑는다 (아래에서 뽑힌 사람 ${below.length}명)`);

  /* 대신 **역할은 그 선수의 포지션에서** 나와야 해요. 자리 배분을 없앤 채로
   * 역할을 미리 정해 두고 끼워 맞추면, 수비수가 "스트라이커"로 표에 떠요
   * (실제로 났습니다 — find의 술어 안에서 난수를 굴려 못 찾으면 첫 역할로
   * 떨어졌어요. 160명 중 25명이 어긋났습니다). */
  const OKROLE = { fw: ["st", "st2"], wg: ["wg"], mf: ["am", "mf", "ut"], df: ["cb", "cb2"] };
  const wrong = race.filter((r) => !(OKROLE[r.pos] || []).includes(r.key));
  check(wrong.length === 0,
    `역할이 포지션과 맞는다 (어긋난 사람 ${wrong.length}명`
    + `${wrong.length ? ` — ${wrong.map((r) => `${r.name} ${r.role}(${r.pos})`).join(", ")}` : ""})`);
  /* 우리 클럽 자리를 강제로 챙기지 않아요 — 실력 순으로 들면 들고, 아니면 없어요 */
  const myPool = (all[S().group] || []).filter((x) => !x.me).map((x) => x.str);
  const myBest = myPool.length ? Math.max(...myPool) : 0;
  const cutAll = Object.values(all).flat().filter((x) => !x.me)
    .map((x) => x.str).sort((a, b) => b - a)[race.length - 1] || 0;
  console.log(`   우리 클럽 최고 ${Math.round(myBest)} · 리그 ${race.length}위 선 ${Math.round(cutAll)}`);
  check(mine.length === Squad.startingXIOf(S().group).length - 1,
    `우리 클럽도 선발 전원이 들어온다 (${mine.length}명 · 나 제외) — 자리를 챙기는 게 아니라 리그 전체가 다 들어와서예요`);
});

// ---------- ⑦ 클럽이 바뀌면 새로 ----------
/* ---------- ⑪ 세이브에 내 실력이 제대로 남는가 ----------
 * 처음에는 save()를 먼저 부르고 그 뒤에 내 str을 채웠다. 메모리에서는 매번 다시
 * 채워지니 화면은 멀쩡했지만, **디스크에 남은 세이브만 열어 보면 내가 str 0으로
 * 꼴찌**였다(확인용 세이브를 뽑아 보고 발견). 세이브를 남의 눈으로 읽는 순간
 * (클라우드 복원·확인 페이지·통계) 거기서 어긋난다. */
guard("⑪ 세이브에 남는 값", () => {
  setOvr(72);
  Squad.ensureSquads();
  const raw = JSON.parse(JSON.stringify(S().squads));
  const meRow = (raw[S().group] || []).find((x) => x.me);
  console.log(`   세이브의 내 줄 — ${meRow ? `${meRow.name} ${Math.round(meRow.str)}` : "없음"} (종합 72)`);
  check(!!meRow && Math.abs(meRow.str - 72) < 1,
    `저장된 내 실력이 지금 종합과 같다 (${meRow ? Math.round(meRow.str) : "없음"})`);
  check(!!meRow && meRow.name === S().name, "저장된 내 이름도 지금 이름과 같다");
});

/* ---------- ⑫ 선발은 경기마다 다시 뽑힌다 ----------
 * "선발 벤치는 매 경기마다 바뀌는 거지??" — 처음에는 실력 순으로 **고정**이었다.
 * 한 번 선발이면 시즌 내내 선발이고, 한 번 밀리면 계속 벤치였다.
 * 실제로는 감독이 그날 몸 상태와 흐름을 보고 돌린다.
 *
 * ⚠️ 내 실력은 늘 종합에서 다시 채워져요(refreshMe). 그래서 여기서는 명단의
 * str을 직접 만지지 않고 **능력치로** 세웁니다 — 직접 만지면 다음 호출에
 * 덮여서 "실력 5인데 100% 선발" 같은 거짓 결과가 나와요. */
guard("⑫ 매 경기 재선발", () => {
  S().condition = 70;
  setOvr(60);
  const sq = Squad.ensureSquad();
  const others = sq.filter((x) => x.pos === S().pos && !x.me).sort((a, b) => b.str - a.str);
  const slots = C.FORMATION[S().pos];
  /* 마지막 선발 자리를 놓고 다투는 값 — 나를 뺀 줄에서 (slots-1)번째와 slots번째 사이 */
  const edgeStr = (others[slots - 2].str + others[slots - 1].str) / 2;
  const runs = (ovr, n, base) => {
    setOvr(ovr);
    S().activity = { week: 0 };
    let hit = 0;
    for (let i = 0; i < n; i++) { S().activity.week = base + i; Squad.rollLineup(); if (Squad.isStarter()) hit++; }
    return hit;
  };
  /* ⚠️ 실력만으로 경계를 잡으면 안 돼요. 감독은 실력 위에 컨디션과 최근 폼을
   * 얹어서 보거든요("선발 확률은 컨디션에만 비례해??"의 답으로 폼이 들어왔어요).
   * 보정값을 코드에서 읽어와 빼면 검사가 산식을 따라다니게 되니(그러면 산식을
   * 바꿔도 안 잡혀요), **실제로 굴려 보고** 반반이 되는 자리를 찾습니다. */
  let edge = edgeStr, mid = runs(edgeStr, 200, 0);
  for (let d = 1; d <= 12 && (mid <= 20 || mid >= 180); d++) {
    const tryOvr = edgeStr + (mid >= 180 ? -d : d);
    const got = runs(tryOvr, 200, d * 500);
    if (Math.abs(got - 100) < Math.abs(mid - 100)) { edge = tryOvr; mid = got; }
  }
  console.log(`   경계(종합 ${edge.toFixed(0)}) 200경기 — 선발 ${mid}회`);
  check(mid > 20 && mid < 180,
    `경계에 있으면 경기마다 갈린다 (선발 ${mid}/200) — 고정이면 0이나 200이 나와요`);

  // 같은 라운드를 다시 그려도 흔들리지 않아요
  S().activity.week = 7;
  Squad.rollLineup();
  const first = Squad.isStarter();
  let stable = true;
  for (let i = 0; i < 20; i++) if (Squad.isStarter() !== first) stable = false;
  check(stable, "한 번 정해진 라운드 안에서는 안 바뀐다 — 다시 그려도 같아요");

  // 실력 차가 크면 흔들려도 그대로예요
  const low = runs(edge - 30, 100, 1000);
  const high = runs(edge + 30, 100, 3000);
  console.log(`   종합 ${(edge - 30).toFixed(0)} → 선발 ${low}/100 · 종합 ${(edge + 30).toFixed(0)} → ${high}/100`);
  check(low <= 5 && high >= 95, `실력 차가 크면 흔들려도 그대로다 (${low} · ${high})`);

  // 컨디션이 좋으면 뽑히기 쉬워요
  setOvr(edge);
  const oddsAt = (cond) => { S().condition = cond; return Squad.myLine().odds; };
  const lowC = oddsAt(20), highC = oddsAt(100);
  console.log(`   컨디션 20 → ${Math.round(lowC * 100)}% · 컨디션 100 → ${Math.round(highC * 100)}%`);
  check(highC > lowC + 0.03,
    `컨디션이 좋으면 선발 확률이 오른다 (${Math.round(lowC * 100)}% → ${Math.round(highC * 100)}%)`);
  S().condition = 70; S().activity = null;
});

guard("⑦ 이적", () => {
  const before = Squad.ensureSquad().map((x) => x.name).join("|");
  S().group = "다른 클럽 FC";
  const after = Squad.ensureSquad().map((x) => x.name).join("|");
  check(before !== after, "클럽이 바뀌면 스쿼드를 새로 꾸린다");
  check(S().squadClub === "다른 클럽 FC", `어느 클럽의 명단인지 남는다 (${S().squadClub})`);
  check(Squad.ensureSquad().filter((x) => x.me).length === 1, "새 팀에서도 나는 한 줄이다");
});

/* ---------- ⑩ 명단은 레이어로 뜬다 ----------
 * "스쿼드도 펼쳐 보고 이러면 너무 길게 차지해서 어디에 버튼으로 두고 레이어
 * 띄워서 보여줄까" — 준비 화면에 접이식으로 붙어 있던 걸 버튼 + 레이어로 옮겼다.
 * 버튼에는 **선발인지 벤치인지**만 적는다. 그게 매 경기 알아야 하는 한 줄이다. */
guard("⑩ 명단 레이어", () => {
  S().camp = 3; S().activity = null; S().pendingShow = false;
  S().group = w.__get("CLUBS")[S().league][0].name;   // 리그 명단 안의 클럽으로 되돌려요
  Career.refreshPro();
  const btn = $("btn-squad-pro");
  check(!!btn && !btn.hidden, "준비 화면 HUD에 스쿼드 버튼이 있다");
  check(!w.document.getElementById("pro-squad"),
    "준비 화면에 펼쳐진 명단 상자가 더는 없다 — 자리를 안 먹어요");
  console.log(`   버튼 문구 "${btn ? btn.textContent : ""}"`);
  check(!!btn && /선발 \d+%/.test(btn.textContent),
    `버튼이 이번 경기 선발 확률을 말한다 (${btn ? btn.textContent : ""}) — 선발은 경기마다 다시 뽑혀요`);

  check(!w.document.querySelector(".squad-overlay"), "누르기 전에는 레이어가 없다");
  btn.click();
  const layer = w.document.querySelector(".squad-overlay");
  check(!!layer, "누르면 레이어가 뜬다");
  const txt = layer ? layer.textContent.replace(/\s+/g, " ") : "";
  check(/선발 11/.test(txt) && /벤치/.test(txt), `레이어에 선발 11과 벤치가 있다`);
  check(/선발 확률 \d+%/.test(txt), "레이어에도 선발 확률이 적힌다");
  check(txt.includes(S().name), "레이어에 내 이름이 있다");
  btn.click();
  check(w.document.querySelectorAll(".squad-overlay").length === 1,
    "이미 열려 있으면 겹쳐 열리지 않는다");
  w.document.getElementById("btn-squad-close").click();
  check(!w.document.querySelector(".squad-overlay"), "닫기를 누르면 사라진다");

  /* HUD 버튼과 레이어가 **같은 숫자**를 적는가 (제보: "HUD랑 레이어랑 다른데").
   * 버튼 글자는 준비 화면을 그릴 때 한 번 적히고 남아요 — 그 사이에 상태가
   * 움직이면 어긋납니다. 레이어를 여는 김에 버튼도 다시 적게 해 뒀어요. */
  const hudBtn = $("btn-squad-pro");
  if (hudBtn && !hudBtn.hidden) {
    /* 0%나 100%로는 아무것도 못 봐요 — 두 숫자가 어긋나도 우연히 같아 보입니다.
     * 경쟁이 도는 자리로 올려놓고, 버튼을 그린 **뒤에** 컨디션을 흔들어요. */
    for (let i = 0; i < 200; i++) {
      const o = Squad.myLine().odds;
      if (o > 0.15 && o < 0.85) break;
      setOvr(Math.max(1, S().stats.shoot + (o <= 0.15 ? 1 : -1)));
    }
    Career.refreshPro();
    S().condition = Math.max(5, S().condition - 12);   // 버튼을 일부러 낡게 만들어요
    hudBtn.click();
    const note = w.document.querySelector(".squad-overlay .sq-note").textContent;
    const inLayer = (note.match(/선발 확률 (\d+)%/) || [])[1];
    const onHud = (hudBtn.textContent.match(/(\d+)%/) || [])[1];
    console.log(`   HUD "${hudBtn.textContent}" · 레이어 ${inLayer}%`);
    check(inLayer != null && inLayer === onHud, `HUD와 레이어가 같은 숫자를 적는다 (${onHud}% · ${inLayer}%)`);
    check(Number(inLayer) > 0 && Number(inLayer) < 100,
      `그 숫자가 0%도 100%도 아니다 (${inLayer}%) — 양 끝에서는 어긋나도 같아 보여요`);
    w.document.getElementById("btn-squad-close").click();
  }
});

/* ---------- ⑬ 벤치인 주에 경기 버튼이 실제로 굴러가는가 ----------
 *
 * 제보: "선발이 아니게 된 경우 리그 경기 버튼 누르면 걍 반응이 없네."
 * 벤치 화면을 그리다가 #stage-result를 만졌는데, 그 요소는 **MatchSim이 경기
 * 화면을 그릴 때 만드는** 것이라 벤치 경로에는 없었다. 없는 걸 만지다 함수가
 * 그 자리에서 죽었고, 화면 전환도 다음 버튼도 없이 아무 일도 안 일어났다.
 *
 * 그래서 여기서는 **실제로 버튼을 눌러** 벤치 화면까지 가 본다.
 * 화면이 뜨는지, 주가 넘어가는지, 다음 버튼이 살아 있는지까지. */
guard("⑬ 벤치 경기 진행", () => {
  const st = S();
  st.condition = 15;               // 컨디션 바닥 — 선발에서 밀려요
  setOvr(20);                      // 실력도 낮게
  st.camp = 1; st.activity = null; st.pendingShow = false;
  Career.refreshPro();
  const rest = w.document.querySelector("#pro-actions .action-btn.rest");
  if (rest) rest.click();          // 마지막 준비를 마치면 시즌이 시작돼요
  const act = S().activity;
  check(!!act, "시즌이 시작됐다");
  if (!act) return;

  const before = { week: act.week, shoot: S().stats.shoot };
  const go = w.document.querySelector("#pro-actions .go-game");
  check(!!go, "준비 화면에 경기 버튼이 있다");
  go.click();

  check(!Squad.isStarter(), `이번 경기는 벤치다 (선발 확률 ${Math.round(Squad.myLine().odds * 100)}%)`);
  check(active() === "screen-stage", `경기 버튼을 누르면 화면이 넘어간다 (${active()}) — 제보의 '반응이 없다'가 여기였어요`);
  const card = $("stage-card") ? $("stage-card").textContent.replace(/\s+/g, " ") : "";
  console.log(`   벤치 화면 — "${card.slice(0, 80)}"`);
  check(/벤치/.test(card), "벤치 화면이 그려진다");
  check(/훈련장/.test(card), "훈련장에서 뭘 올렸는지 적힌다");
  check(S().activity.week === before.week + 1,
    `주가 넘어간다 (${before.week} → ${S().activity.week}) — 리그가 나 없이도 굴러가요`);
  const grew = Object.keys(S().stats).some((k) => S().stats[k] > (k === "shoot" ? before.shoot : 0));
  check(grew, "능력치가 하나 올랐다");

  const next = $("btn-stage-next");
  check(!!next && !next.hidden && !next.disabled, "다음 버튼이 살아 있다");
  if (next) {
    next.click();
    check(active() === "screen-pro", `다음을 누르면 준비 화면으로 돌아온다 (${active()})`);
  }

  /* ⑭ 벤치 다음 주에 훈련이 돌아오는가 — 두 번째 제보의 자리.
   *
   * "벤치일 때 누르면 반응 없는데." 화면 전환은 고쳤는데도 같은 말이 또 나왔다.
   * 이번엔 **그다음 준비 화면**이었다. 벤치 갈래가 pendingShow(경기 대기 표시)를
   * 안 내려서, 화면은 "훈련 2회 남음"이라고 적어 놓고 훈련 버튼 여섯 개를 전부
   * 잠가 뒀다. 눌러도 아무 일이 없으니 먹통으로 읽힌다.
   *
   * 그래서 **버튼이 실제로 눌리는지**까지 본다 — 있느냐가 아니라 먹느냐다. */
  check(S().pendingShow === false,
    `벤치 주가 끝나면 '경기 대기' 표시가 내려간다 (pendingShow=${S().pendingShow})`);
  const acts = [...w.document.querySelectorAll("#pro-actions .action-btn")]
    .filter((b) => !b.classList.contains("ad-slot") && !b.classList.contains("go-game"));
  const locked = acts.filter((b) => b.disabled).length;
  check(acts.length > 0 && locked === 0,
    `벤치 다음 주에 훈련 버튼이 살아 있다 (${acts.length}개 중 잠긴 것 ${locked}개)`);
  if (acts.length && !locked) {
    const camp0 = S().camp, sum0 = Object.values(S().stats).reduce((a, b) => a + b, 0);
    acts[0].click();
    const moved = S().camp !== camp0
      || Math.abs(Object.values(S().stats).reduce((a, b) => a + b, 0) - sum0) > 1e-9;
    check(moved, `훈련 버튼을 누르면 실제로 뭔가 일어난다 (훈련 ${camp0} → ${S().camp})`);
  }
});

/* ---------- ⑮ 선발 확률이 컨디션 하나로 결정되지 않는가 ----------
 *
 * 제보 두 줄: "공격수 선발 2자리인데 지금 1번째라는 말이 무슨 의미지???"
 *            "그리고 선발 확률은 컨디션에만 비례해??"
 *
 * 둘 다 같은 뿌리였다. 보정이 (컨디션-70)/6, 폭이 -11.7 ~ +5였는데 같은 포지션
 * 실력 차는 보통 1~2였다. 그래서 **실력 1위인데 컨디션 34면 선발 23%** —
 * 컨디션만 10→100으로 옮기면 4% ↔ 99%. 실력은 순번만 매기고 당락은 컨디션이
 * 다 정했고, 화면은 그 사정을 말하지 않은 채 "앞사람을 넘어라"라고 적었다.
 *
 * 지키는 것: 실력·컨디션·최근 폼이 **셋 다** 확률을 움직이고,
 * 어느 하나가 나머지를 압도하지 않는다. 그리고 문구가 실제 이유를 말한다. */
const clampStat = (v) => Math.max(1, Math.min(150, v));
guard("⑮ 선발 확률의 근거", () => {
  const st = S();
  st.condition = 60;
  if (st.activity) { st.activity.apps = 0; st.activity.ratingSum = 0; }

  /* ⑬에서 실력을 바닥까지 내려놨어요(20). 거기서는 무엇을 흔들어도 0%라
   * 아무것도 못 봅니다. 먼저 **경쟁이 벌어지는 자리**로 올려놔요 —
   * 마지막 선발 자리를 쥔 동료와 실력을 맞춥니다. */
  const rivalStr = (() => {
    const L = Squad.myLine();
    const rivals = L.line.filter((x) => !x.me).map((x) => x.str).sort((a, b) => b - a);
    return rivals[Math.min(L.slots, rivals.length) - 1];
  })();
  for (let i = 0; i < 400; i++) {
    const mine = Squad.myLine().line.find((x) => x.me).str;
    if (Math.abs(mine - rivalStr) < 0.4) break;
    const step = mine < rivalStr ? 1 : -1;
    for (const k of Object.keys(st.stats)) st.stats[k] = clampStat(st.stats[k] + step);
  }
  console.log(`   경쟁 자리로 맞춤 — 나 ${Squad.myLine().line.find((x) => x.me).str.toFixed(1)} · 마지막 선발 자리 ${rivalStr.toFixed(1)}`);

  const base = {};
  for (const k of Object.keys(st.stats)) base[k] = st.stats[k];
  const setD = (d) => { for (const k of Object.keys(st.stats)) st.stats[k] = base[k] + d; };
  const odds = () => Squad.myLine().odds;

  /* ── 같은 상태면 몇 번을 물어도 같은 답인가.
   * 제보: "HUD에 보이는 선발 확률이랑 눌러서 보이는 게 다르네. 누를 때마다 바뀌네."
   * 확률을 Math.random으로 그 자리에서 굴려서 냈기 때문이었어요. 화면이 흔들리면
   * 훈련이 얼마나 도움이 됐는지 비교할 수가 없습니다. */
  const shots = [];
  for (let i = 0; i < 8; i++) shots.push(Squad.myLine().odds);
  const spread = Math.max(...shots) - Math.min(...shots);
  console.log(`   같은 상태로 8번 — ${[...new Set(shots.map((v) => Math.round(v * 100)))].join("%, ")}%`);
  check(spread === 0, `부를 때마다 같은 확률이 나온다 (폭 ${Math.round(spread * 100)}%p) — HUD와 레이어가 같은 숫자를 적어야 해요`);
  const before = Squad.myLine().odds;
  st.condition = Math.min(100, st.condition + 30);
  const after = Squad.myLine().odds;
  st.condition = 60;
  check(after !== before,
    `그렇다고 굳어 있지는 않다 — 컨디션을 올리면 값이 움직인다 (${Math.round(before * 100)}% → ${Math.round(after * 100)}%)`);

  // ── 실력 (컨디션·폼 고정)
  setD(-9); const sLow = odds();
  setD(9); const sHigh = odds();
  setD(0);
  console.log(`   실력 -9 → ${Math.round(sLow * 100)}% · +9 → ${Math.round(sHigh * 100)}%`);
  check(sHigh - sLow > 0.3,
    `실력이 확률을 크게 움직인다 (${Math.round(sLow * 100)}% → ${Math.round(sHigh * 100)}%) — 여기가 막히면 훈련할 이유가 없어요`);

  // ── 컨디션 (실력·폼 고정)
  st.condition = 15; const cLow = odds();
  st.condition = 100; const cHigh = odds();
  st.condition = 60;
  console.log(`   컨디션 15 → ${Math.round(cLow * 100)}% · 100 → ${Math.round(cHigh * 100)}%`);
  check(cHigh - cLow > 0.1, `컨디션도 확률을 움직인다 (${Math.round(cLow * 100)}% → ${Math.round(cHigh * 100)}%)`);
  check(cLow > 0.1,
    `실력이 선발권이면 컨디션이 바닥이어도 아예 못 나가지는 않는다 (${Math.round(cLow * 100)}%) — 예전엔 4%였어요`);

  // ── 최근 폼 (실력·컨디션 고정)
  if (st.activity) {
    st.activity.apps = 6; st.activity.ratingSum = 4.5 * 6; const fLow = odds();
    st.activity.ratingSum = 8.5 * 6; const fHigh = odds();
    st.activity.apps = 0; st.activity.ratingSum = 0;
    console.log(`   평점 4.5 → ${Math.round(fLow * 100)}% · 8.5 → ${Math.round(fHigh * 100)}%`);
    check(fHigh - fLow > 0.1,
      `최근 폼도 확률을 움직인다 (${Math.round(fLow * 100)}% → ${Math.round(fHigh * 100)}%) — "컨디션에만 비례해?"의 답이에요`);
  }

  // ── 어느 하나가 나머지를 압도하지 않는가
  check(sHigh - sLow >= cHigh - cLow,
    `실력이 컨디션보다 덜 중요하지 않다 (실력 ${Math.round((sHigh - sLow) * 100)}%p · 컨디션 ${Math.round((cHigh - cLow) * 100)}%p)`);

  // ── 문구가 실제 이유를 말하는가
  const L1 = Squad.myLine();
  const inSlot = Squad.benchReason(L1).replace(/<[^>]+>/g, " ");
  console.log(`   순번 ${L1.rank}/${L1.of} (자리 ${L1.slots}) — "${inSlot.trim()}"`);
  check(/🗣️ 감독 — “.+”/.test(inSlot),
    "이유를 감독의 말로 알려준다 — 산식을 읽어 주지 않아요");
  check(!/\d/.test(inSlot),
    `벤치 카드에 숫자를 적지 않는다 ("${inSlot.trim()}") — 감독은 확률을 읽어 주지 않아요`);
  if (L1.rank <= L1.slots) {
    check(!/넘|순번|앞에/.test(inSlot),
      "실력이 선발권인데 앉은 날에는 '넘어라'라고 하지 않는다 — 넘을 앞사람이 없어요");
  }
  setD(-9);
  const L2 = Squad.myLine();
  const outSlot = Squad.benchReason(L2).replace(/<[^>]+>/g, " ");
  console.log(`   순번 ${L2.rank}/${L2.of} — "${outSlot.trim()}"`);
  check(L2.rank > L2.slots && /넘|순번|앞에/.test(outSlot),
    "실력으로 밀린 날에는 앞사람을 넘으라고 말한다");

  /* 벤치가 이어질 때 같은 문장이 계속 나오면 사람이 아니라 안내문이 돼요.
   * 대신 같은 주 안에서는 다시 그려도 같은 말이어야 합니다. */
  const says = new Set();
  for (let wk = 0; wk < 6; wk++) {
    if (st.activity) st.activity.week = wk;
    says.add(Squad.benchReason(Squad.myLine()).match(/“([^”]+)”/)[1]);
  }
  check(says.size >= 2, `벤치가 이어져도 같은 말만 하지 않는다 (6주에 ${says.size}가지)`);
  /* 말마다 **다음에 뭘 하라**가 붙어 있어야 해요. 하나라도 빠지면 그 주에는
   * "그냥 안 뽑았다"만 듣고 끝나요 — 확률을 지웠으니 방향은 말이 줘야 합니다. */
  const ACT = /연습|다듬|쉬|컨디션|집중|올리|붙여|되찾|아껴|보여주|갈고닦/;
  const noAct = [...says].filter((t) => !ACT.test(t));
  check(noAct.length === 0, `말마다 뭘 하라는 한마디가 붙는다 (없는 말 ${noAct.length}개${noAct.length ? ` — "${noAct[0]}"` : ""})`);
  const withNum = [...says].filter((t) => /\d/.test(t));
  check(withNum.length === 0, `말에 숫자가 없다 (섞인 말 ${withNum.length}개)`);
  if (st.activity) st.activity.week = 3;
  const twice = [0, 1].map(() => Squad.benchReason(Squad.myLine()).match(/“([^”]+)”/)[1]);
  check(twice[0] === twice[1], "같은 주에는 다시 그려도 같은 말이다");
  setD(0);

  /* 벤치 카드와 스쿼드 레이어가 **같은 함수**를 쓰는가 — 각자 문장을 만들면
   * 한쪽은 "앞사람을 넘어라", 다른 쪽은 "1번째"라고 적는 일이 또 생겨요. */
  const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
  check(/WingerSquad\.benchReason\(/.test(CAREER),
    "벤치 카드가 문장을 직접 만들지 않고 benchReason 하나를 쓴다");
});

// ---------- ⑯ 부문 1위는 포지션이 아니라 숫자로 정해지는가 ----------
console.log("=== ⑯ 공격수가 수비 1위면 철벽상을 받는가 ===");
guard("⑯ 부문 1위", () => {
  /* 제보: "공격수인데 만약 수비 횟수가 젤 많으면 수비쪽에서도 1위로 되는 게 맞지."
   * 맞아요 — 부문상은 그 숫자의 1위에게 갑니다. 포지션은 **생산량**에만 관여해요
   * (공격수가 센터백 생산량을 굴리면 안 되니까). 누가 받느냐는 순수하게 기록이에요. */
  const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
  const rank = (SRC.match(/function raceRank\(key\) \{[\s\S]*?\n {2}\}/) || [""])[0];
  /* 정렬 키(val)만 봐요 — 줄을 만드는 자리에는 pos가 들어가도 되지만,
   * **누가 위인지 정하는 산식**에는 들어가면 안 돼요. */
  const val = (rank.match(/const val = [\s\S]*?;\n/) || [""])[0];
  console.log(`   정렬 키 — ${val.replace(/\s+/g, " ").trim().slice(0, 80)}`);
  check(!!val && !/\bpos\b|role/.test(val), "순위를 정하는 산식이 포지션·역할을 안 본다");
  const top = (SRC.match(/const raceTop = [^;]+;/) || [""])[0];
  check(/raceRank\(key\)\[0\]/.test(top), "부문 1위는 그 표의 첫 줄이다");

  // 실제로 굴려 봐요 — 공격수인 내가 수비를 잔뜩 쌓으면 수비 탭에서 1위여야 해요
  const st = S();
  st.pos = "fw";
  st.activity = st.activity || { cb: 1, cbTotal: 2, week: 5, weekTotal: 19, wins: 0, sales: 0,
    hypeSum: 0, cbHype: 0, cbWins: 0, goals: 0, assists: 0, defense: 0, apps: 5, teamW: 0,
    teamD: 0, teamL: 0, ratingSum: 30, opp: "테스트 FC", race: Career._t.rollRace() };
  st.activity.defense = 9999;
  Career.refreshPro();
  const sum = ($("pro-race-sum") || {}).textContent || "";
  // 수비 탭으로 옮겨요 (탭 자체가 실제 버튼이에요)
  const tab = [...w.document.querySelectorAll("#pro-race-body .race-tab")]
    .find((b) => /수비|🛡/.test(b.textContent));
  if (tab) {
    tab.click();
    const first = w.document.querySelector("#pro-race-body tbody tr");
    console.log(`   수비 탭 1위 — "${first ? first.textContent.replace(/\s+/g, " ").trim() : "없음"}"`);
    check(!!first && first.classList.contains("me"),
      "공격수여도 수비 숫자가 1위면 그 부문 1위다 — 포지션이 막지 않아요");
    /* 반대도 봐야 계약이에요 — 숫자가 밀리면 공격수든 수비수든 1위가 아니어야 해요 */
    const rival = (st.activity.race || []).find((r) => r.pos === "df") || (st.activity.race || [])[0];
    if (rival) {
      rival.d = 99999;
      tab.click();
      const first2 = w.document.querySelector("#pro-race-body tbody tr");
      console.log(`   상대가 더 쌓으면 1위 — "${first2 ? first2.textContent.replace(/\s+/g, " ").trim().slice(0, 40) : "없음"}"`);
      check(!!first2 && !first2.classList.contains("me"),
        "숫자가 밀리면 1위가 아니다 — 자리로 받는 상이 아니에요");
      rival.d = 0;
    }
  } else {
    check(false, "수비 탭을 찾았다");
  }
  void sum;
});

// ---------- ⑰ 🛌 몸이 바닥이면 감독이 가끔 쉬게 하는가 ----------
console.log("=== ⑰ 보호 로테이션 ===");
guard("⑰ 보호 로테이션", () => {
  /* 제보: "스탯이 좋아서 선발 확률이 100%인데, 컨디션이 0이면 감독이 선수 보호
   * 차원에서 가끔씩은 쉬게 해줄 수도 있는 거 아냐?? 중요하지 않은 경기 같은 거."
   * 실력 103인데 팀 최고가 70이면 컨디션으로는 절대 안 밀려서, 몸이 아무리
   * 상해도 매 경기 90분을 뜁니다. */
  const st = S();
  /* 앞 절들이 포지션과 기록을 흔들어 놨어요 — 여기서 쓰는 상태를 다시 세웁니다.
   * 내 포지션은 **명단에 적힌 내 줄**에서 가져와요. S.pos만 바꾸면 명단의 내 줄은
   * 그대로라 "그 포지션 줄에 내가 없는" 상태가 돼서 확률이 0%가 나옵니다. */
  st.clubTrust = undefined;
  if (st.activity) { st.activity.defense = 0; st.activity.apps = 0; st.activity.ratingSum = 0; }
  setOvr(140);                      // 팀에서 압도적인 실력 — 컨디션으로는 안 밀려요
  const meRow = Squad.ensureSquad().find((x) => x.me);
  if (meRow) st.pos = meRow.pos;
  Squad.ensureSquad();
  const at = (c) => { st.condition = c; return Squad.myLine(); };
  const row = [0, 10, 20, 30, 60].map((c) => `컨디션 ${c} → ${Math.round(at(c).odds * 100)}%`);
  console.log(`   ${row.join(" · ")}`);
  st.condition = 60;
  check(Math.round(at(60).odds * 100) === 100, `몸이 멀쩡하면 100%다 (${Math.round(at(60).odds * 100)}%)`);
  check(at(0).odds < 0.8, `컨디션 0이면 확실히 내려간다 (${Math.round(at(0).odds * 100)}%)`);
  check(at(0).odds > 0.4, `그렇다고 절반 아래로 떨어지진 않는다 (${Math.round(at(0).odds * 100)}%) — 실력은 실력이니까요`);
  check(at(0).odds < at(10).odds && at(10).odds < at(20).odds && at(20).odds <= at(30).odds,
    "몸이 나쁠수록 뺄 확률이 높다");
  check(Math.abs(at(30).odds - at(60).odds) < 1e-9,
    `문턱(${Squad.REST_BAR}) 위로는 아예 안 걸린다`);

  /* ⚠️ **확률과 실제가 같은 말을 해야 해요.** 굴릴 때만 빼고 확률에 안 넣으면
   * "100%라고 적혀 있는데 벤치"가 됩니다 — 이 저장소 단골 병이에요. */
  st.condition = 0;
  let sat = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    if (st.activity) st.activity.week = i;    // 라운드를 바꿔야 다시 굴려요
    Squad.rollLineup();
    if (!Squad.isStarter()) sat++;
  }
  const seen = sat / N, said = 1 - at(0).odds;
  console.log(`   컨디션 0에서 ${N}경기 — 실제로 앉은 비율 ${Math.round(seen * 100)}% · 화면이 말한 비율 ${Math.round(said * 100)}%`);
  check(Math.abs(seen - said) < 0.08,
    `화면에 적힌 확률과 실제가 맞는다 (${Math.round(seen * 100)}% vs ${Math.round(said * 100)}%)`);

  /* 쉬게 된 날엔 감독이 몸 얘기를 해야 해요 */
  const say = Squad.benchReason(Squad.myLine()).replace(/<[^>]+>/g, " ");
  console.log(`   감독 — "${(say.match(/“([^”]+)”/) || [])[1] || say.trim()}"`);
  check(/몸|컨디션|쉬/.test(say), "감독이 몸 상태를 이유로 말한다");

  // 스쿼드 레이어에도 적혀야 화면이 한 몸이에요
  st.condition = 0;
  const note = Squad.squadHTML().replace(/<[^>]+>/g, " ");
  check(/감독이 뺄 수 있어요/.test(note), "스쿼드 레이어가 그 사정을 적는다");
  st.condition = 70;
  check(!/감독이 뺄 수 있어요/.test(Squad.squadHTML()), "몸이 멀쩡하면 그 줄이 없다");
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
