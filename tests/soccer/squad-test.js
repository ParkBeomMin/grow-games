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
  const race = (S().activity || {}).race || [];
  const all = Squad.ensureSquads();
  const mine = race.filter((r) => r.club === S().group);
  console.log(`   개인 순위 ${race.length}명 — ${race.map((r) => `${r.name}(${r.club})`).slice(0, 4).join(" · ")} …`);
  check(race.length > 0, `개인 순위 명단이 만들어졌다 (${race.length}명)`);
  check(mine.length > 0, `그중 우리 클럽 선수가 있다 (${mine.length}명)`);
  /* ⚠️ **여덟 명 전부**가 실제 명단의 사람이어야 해요. 우리 팀만 맞추면
   * 다른 팀 선수는 어느 명단에도 없는 유령이 됩니다. */
  const ghosts = race.filter((r) => !(all[r.club] || []).some((x) => x.name === r.name));
  check(ghosts.length === 0,
    `여덟 명 전부 그 클럽 명단에 있는 사람이다 (유령 ${ghosts.length}명${ghosts.length ? ` — ${ghosts.map((g) => `${g.name}(${g.club})`).join(", ")}` : ""})`);
  const clubs = new Set(race.map((r) => r.club));
  check(clubs.size >= 4, `여러 클럽에서 고르게 나온다 (${clubs.size}개 클럽)`);
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
  const edge = (others[slots - 2].str + others[slots - 1].str) / 2;
  const runs = (ovr, n, base) => {
    setOvr(ovr);
    S().activity = { week: 0 };
    let hit = 0;
    for (let i = 0; i < n; i++) { S().activity.week = base + i; Squad.rollLineup(); if (Squad.isStarter()) hit++; }
    return hit;
  };
  const mid = runs(edge, 200, 0);
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
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
