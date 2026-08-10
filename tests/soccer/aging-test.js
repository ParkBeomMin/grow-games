/* 📈 동료도 크고 늙어요 — 리그가 흘러가지 않으면서 사람은 움직이는가.
 *
 * 요청: "우리 팀·다른 팀 선수 능력치가 경기와 시즌을 거치며 변해야 한다.
 * 내가 각성에 실패하면 실력이 잠깐 줄듯, 다른 선수에게도 같은 일이 있으면 좋겠다.
 * 각 리그 수준에 맞게 타팀 선수 능력치가 잘 밸런싱되어 있는지도 확인."
 *
 * 여기서 가장 무서운 건 **인플레이션**이에요. 모두가 조금씩만 자라도 20시즌이면
 * 리그가 통째로 올라가서, 클럽 전력(= 리그 수준)과 명단이 서로 다른 말을 하게 됩니다.
 * 이 저장소가 반복해서 앓은 "표시와 판정이 서로 다른 것을 본다"의 밸런스판이에요.
 *
 * 지키는 것:
 *   ① 첫 시즌 명단 평균 = 클럽 전력 (나이를 넣어도 눈금이 안 밀린다)
 *   ② 20시즌을 굴려도 리그 평균이 제자리 (인플레도 디플레도 없다)
 *   ③ 리그 수준이 그대로 보존된다 — 약한 클럽이 강한 클럽을 추월하지 않는다
 *   ④ 사람은 실제로 움직인다 — 한 시즌만 지나도 순위가 바뀐다
 *   ⑤ 어리면 크고 늙으면 준다
 *   ⑥ 서른여섯이면 은퇴하고 그 자리에 신인이 들어온다 (팀 크기는 그대로)
 *   ⑦ 📉 부진·🔥 상승세는 **그 시즌만** 간다
 *   ⑧ 옛 세이브(나이 없음)를 열어도 실력이 안 바뀐다
 *   ⑨ 이적해도 다른 팀 명단이 리셋되지 않는다 — 몇 시즌 지켜본 유망주가 안 사라져요
 *   ⑩ 한 시즌에 한 번만 늙는다 (결산에 이르는 길이 여럿이에요)
 *   ⑪ 변이 검증 — 은퇴·신인 교체를 빼면 ②가 무너진다
 *
 * 실제 페이지를 띄워 WingerSquad를 그대로 굴립니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  window.alert = () => {};
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
w.alert = () => {};
const Sq = w.WingerSquad;
const get = w.__get, set = w.__set;
check(!!Sq && typeof Sq.ageSquads === "function", "명단 모듈이 페이지에서 로드된다");
if (!Sq) { console.log("\n❌ 실패"); process.exit(1); }

const CLUBS = get("CLUBS");
const LG = 1;                                  // K리그1
const clubs = () => get(`clubsIn(${LG}, S)`);

/* 세이브 하나를 세워요. 실제 새 게임과 같은 입구(newState)를 지나요 —
 * 손으로 지어낸 모양은 디스크의 진짜 모양과 어긋나기 쉬워요. */
function fresh(clubIdx) {
  const st = get(`newState(MARKETS[0], "fw", "나")`);
  st.pos = "fw";
  st.league = LG;
  st.proYear = 1;
  const c = CLUBS[LG][clubIdx == null ? 0 : clubIdx];
  st.group = c.name;
  st.clubStr = c.str;
  set("S", st);
  Sq.ensureSquads();
  return get("S");
}
const avgOf = (list) => list.filter((x) => !x.me).reduce((a, x) => a + x.str, 0) / list.filter((x) => !x.me).length;
const leagueAvg = (S) => {
  const names = Object.keys(S.squads);
  return names.reduce((a, n) => a + avgOf(S.squads[n]), 0) / names.length;
};

// ---------- ① 첫 시즌 눈금 ----------
console.log("=== ① 첫 시즌 명단 평균 = 클럽 전력 ===");
{
  /* ⚠️ **최대 편차를 보면 안 돼요.** 15명 × ±14 표본이라 한 팀의 평균은 원래 ±6쯤
   * 흔들려요. 봐야 하는 건 **치우침**이에요 — 여러 판을 모으면 0으로 모여야 합니다. */
  let bias = 0, n = 0;
  const lines = [];
  for (let t = 0; t < 40; t++) {
    const S = fresh(0);
    for (const c of clubs()) {
      bias += avgOf(S.squads[c.name]) - c.str; n++;
      if (t === 0) lines.push(`${c.name} ${c.str} → ${avgOf(S.squads[c.name]).toFixed(1)}`);
    }
  }
  lines.forEach((l) => console.log(`   ${l}`));
  console.log(`   40판 × 6팀 평균 치우침 ${(bias / n).toFixed(2)}`);
  check(Math.abs(bias / n) < 1,
    `나이를 넣어도 명단 평균이 클럽 전력에 맞는다 (치우침 ${(bias / n).toFixed(2)}) — peak을 되계산했으면 여기가 무너져요`);
}

// ---------- ②③ 20시즌 ----------
console.log("=== ②③ 20시즌을 굴려도 ===");
{
  const N = 60, YEARS = 20;
  let dSum = 0, dMax = 0, orderKept = 0;
  let sample = null;
  for (let t = 0; t < N; t++) {
    const S = fresh(0);
    const before = leagueAvg(S);
    const beforeOrder = clubs().slice().sort((a, b) => b.str - a.str).map((c) => c.name);
    for (let y = 0; y < YEARS; y++) { S.proYear = y + 1; Sq.ageSquads(); }
    const after = leagueAvg(S);
    dSum += after - before;
    if (Math.abs(after - before) > Math.abs(dMax)) dMax = after - before;
    const afterOrder = Object.keys(S.squads).sort((a, b) => avgOf(S.squads[b]) - avgOf(S.squads[a]));
    // 클럽 순서가 대체로 지켜지는가 — 1위 클럽이 그대로 1위인지로 봐요
    if (afterOrder[0] === beforeOrder[0]) orderKept++;
    if (t === 0) sample = { before, after, beforeOrder, afterOrder, S };
  }
  console.log(`   리그 평균 ${sample.before.toFixed(1)} → ${sample.after.toFixed(1)} (한 판)`);
  console.log(`   ${N}판 평균 이동 ${(dSum / N).toFixed(2)} · 가장 큰 이동 ${dMax.toFixed(2)}`);
  check(Math.abs(dSum / N) < 1.5,
    `20시즌 뒤에도 리그 평균이 제자리다 (평균 ${(dSum / N).toFixed(2)}) — 인플레도 디플레도 없어요`);
  console.log(`   최강 클럽 유지 ${orderKept}/${N}판`);
  check(orderKept / N > 0.5,
    `리그 수준이 보존된다 (최강 클럽이 ${Math.round(orderKept / N * 100)}%에서 그대로 최강)`);
}

// ---------- ④ 사람은 움직인다 ----------
console.log("=== ④ 한 시즌만 지나도 ===");
{
  const S = fresh(0);
  const my = S.squads[S.group].filter((x) => !x.me);
  const before = my.map((x) => ({ name: x.name, str: x.str }));
  S.proYear = 2; Sq.ageSquads();
  const after = new Map(S.squads[S.group].filter((x) => !x.me).map((x) => [x.name, x.str]));
  let moved = 0, same = 0;
  for (const b of before) {
    const a = after.get(b.name);
    if (a == null) { moved++; continue; }        // 은퇴했으면 그것도 움직임이에요
    if (Math.abs(a - b.str) > 0.05) moved++; else same++;
  }
  console.log(`   15명 중 움직인 사람 ${moved} · 그대로 ${same}`);
  check(moved >= 10, `대부분이 움직인다 (${moved}/15) — 여태 이 값은 0이었어요`);
  const changed = before.slice(0, 3).map((b) => `${b.name} ${b.str.toFixed(1)}→${(after.get(b.name) || 0).toFixed(1)}`);
  console.log(`   ${changed.join(" · ")}`);
}

// ---------- ⑤ 어리면 크고 늙으면 준다 ----------
console.log("=== ⑤ 나이 곡선 ===");
{
  const curve = Sq.ageCurve;
  console.log(`   18세 ${curve(18).toFixed(2)} · 23세 ${curve(23).toFixed(2)} · 27세 ${curve(27).toFixed(2)}`
    + ` · 31세 ${curve(31).toFixed(2)} · 35세 ${curve(35).toFixed(2)}`);
  check(curve(18) < curve(23) && curve(23) < curve(27), "정점 전까지는 오른다");
  check(curve(27) === 1, "정점이 1이다 — peak이 곧 그 선수의 최고치예요");
  check(curve(31) < curve(27) && curve(35) < curve(31), "정점을 넘으면 내려간다");
  // 실제 명단에서도 그런가 — 나이를 고정해 굴려요
  const S = fresh(0);
  const base = S.clubStr;
  const at = (age) => {
    let sum = 0;
    for (let i = 0; i < 400; i++) {
      const p = Sq._t.rollPlayer(base, "fw", age);
      const q = { ...p, age: age + 1 };
      sum += Sq._t.strOfRow(q) - p.str;
    }
    return sum / 400;
  };
  const young = at(20), old = at(32);
  console.log(`   스무 살이 한 살 더 먹으면 ${young > 0 ? "+" : ""}${young.toFixed(2)} · 서른둘은 ${old.toFixed(2)}`);
  check(young > 0.3, `어린 선수는 한 해에 자란다 (+${young.toFixed(2)})`);
  check(old < -0.3, `나이 든 선수는 줄어든다 (${old.toFixed(2)})`);
}

// ---------- ⑥ 은퇴와 신인 ----------
console.log("=== ⑥ 은퇴 ===");
{
  const S = fresh(0);
  const size = S.squads[S.group].length;
  const old = S.squads[S.group].find((x) => !x.me);
  old.age = Sq.RETIRE_AGE - 1;
  const goneName = old.name;
  S.proYear = 2; const news = Sq.ageSquads();
  const still = S.squads[S.group].some((x) => x.name === goneName);
  console.log(`   ${goneName}(${Sq.RETIRE_AGE}세) — ${still ? "아직 있음" : "은퇴"} · 명단 ${S.squads[S.group].length}명`);
  check(!still, `서른여섯이면 떠난다 (${goneName})`);
  check(S.squads[S.group].length === size, `팀 크기는 그대로다 (${S.squads[S.group].length}명)`);
  const rookies = S.squads[S.group].filter((x) => !x.me && x.age <= 21);
  check(rookies.length >= 1, `그 자리에 신인이 들어온다 (스물하나 이하 ${rookies.length}명)`);
  check(news.gone.some((g) => g.name === goneName), `결산 소식에 남는다 (${Sq.newsLine()})`);
}

// ---------- ⑦ 부진은 그 시즌만 ----------
console.log("=== ⑦ 📉 부진·🔥 상승세는 그 시즌만 ===");
{
  const S = fresh(0);
  let seen = 0, carried = 0;
  for (let y = 0; y < 12; y++) {
    S.proYear = y + 2;
    const marked = S.squads[S.group].filter((x) => !x.me && (x.form || 0) !== 0).map((x) => x.name);
    Sq.ageSquads();
    seen += marked.length;
    // 다음 시즌에 **같은 부호로 그대로 남아 있으면** 지워지지 않은 거예요
    for (const n of marked) {
      const x = S.squads[S.group].find((y2) => y2.name === n);
      if (x && (x.form || 0) !== 0) carried++;
    }
  }
  console.log(`   12시즌 동안 붙은 상태 ${seen}건 · 다음 시즌에도 상태가 있던 경우 ${carried}건`);
  check(seen > 0, `상태가 실제로 붙는다 (${seen}건)`);
  /* 매 시즌 새로 굴리니 우연히 연달아 붙을 수는 있어요 — 확률이 20%(부진 10% + 상승세 10%)라
   * 붙었던 사람이 다음에도 붙을 기대치가 그쯤이면 "지워지고 다시 굴린" 거예요. */
  check(carried / Math.max(1, seen) < 0.45,
    `지난 시즌 상태가 그대로 남지 않는다 (${Math.round(carried / Math.max(1, seen) * 100)}% — 새로 굴리면 20%쯤이에요)`);
}

// ---------- ⑧ 옛 세이브 ----------
console.log("=== ⑧ 나이가 없는 옛 세이브 ===");
{
  const S = fresh(0);
  // 옛 모양으로 되돌려요 — 나이도 peak도 없던 시절의 줄이에요
  /* ⚠️ 이름으로 찾으면 안 돼요 — 96명이라 **동명이인**이 나옵니다(실제로 나왔고,
   * 남의 줄과 견주는 바람에 거짓 빨간불이 떴어요). 자리 번호로 견줘요. */
  const before = [];
  for (const club of Object.keys(S.squads)) {
    S.squads[club].forEach((x, i) => {
      if (x.me) return;
      delete x.age; delete x.peak; delete x.form;
      before.push({ club, i, name: x.name, str: x.str });
    });
  }
  Sq.ensureSquads();                      // 읽는 쪽이 채워요
  let worst = 0, filled = 0;
  for (const b of before) {
    const x = S.squads[b.club][b.i];
    if (x.age != null) filled++;
    worst = Math.max(worst, Math.abs(x.str - b.str));
  }
  console.log(`   ${filled}/${before.length}명에 나이가 채워졌고, 실력이 어긋난 최대폭 ${worst.toFixed(2)}`);
  check(filled === before.length, "나이가 없는 줄에 전부 채워진다");
  check(worst < 1e-9, "채워 넣어도 실력은 그대로다 — 이어하던 팀이 갑자기 세지거나 약해지지 않아요");
}

// ---------- ⑨ 이적해도 남의 팀은 그대로 ----------
console.log("=== ⑨ 이적 ===");
{
  const S = fresh(0);
  for (let y = 0; y < 4; y++) { S.proYear = y + 2; Sq.ageSquads(); }
  /* ⚠️ 지켜볼 클럽과 옮겨 갈 클럽이 **같으면 안 돼요** — 처음에 둘 다
   * "내 클럽이 아닌 첫 번째"로 골라서 같은 팀이 됐고, 당연히 바뀌었습니다. */
  const to = CLUBS[LG].find((c) => c.name !== S.group);
  const other = Object.keys(S.squads).find((c) => c !== S.group && c !== to.name);
  const snap = S.squads[other].map((x) => `${x.name}/${x.age}/${x.str}`).join(",");
  S.group = to.name; S.clubStr = to.str;
  Sq.ensureSquads();
  const after = S.squads[other].map((x) => `${x.name}/${x.age}/${x.str}`).join(",");
  check(snap === after, `다른 팀 명단이 그대로다 (${other})`);
  const mine = S.squads[S.group].filter((x) => x.me);
  console.log(`   ${to.name}에 내 줄 ${mine.length}개 · 명단 ${S.squads[S.group].length}명`);
  check(mine.length === 1, "새 팀에 내 줄이 하나 있다");
  check(S.squads[S.group].length === Sq.SQUAD_SIZE, `새 팀 크기가 그대로다 (${S.squads[S.group].length})`);
  let elsewhere = 0;
  for (const c of Object.keys(S.squads)) if (c !== S.group) elsewhere += S.squads[c].filter((x) => x.me).length;
  check(elsewhere === 0, "옛 팀에는 내가 안 남아 있다");
}

// ---------- ⑩ 한 시즌에 한 번만 ----------
console.log("=== ⑩ 겹쳐 불러도 ===");
{
  const S = fresh(0);
  const one = S.squads[S.group].find((x) => !x.me);
  const name = one.name, was = one.age;
  S.proYear = 5;
  Sq.ageSquads(); Sq.ageSquads(); Sq.ageSquads();
  const now = (S.squads[S.group].find((x) => x.name === name) || {}).age;
  console.log(`   ${name} ${was}세 → ${now == null ? "은퇴" : now + "세"} (세 번 불렀어요)`);
  check(now == null || now === was + 1, "세 번 불러도 한 살만 먹는다 — 결산에 이르는 길이 여럿이에요");
}

// ---------- ⑪ 변이 검증 ----------
console.log("=== ⑪ 변이 검증 — 은퇴·신인 교체를 빼면 ===");
{
  /* 늙기만 하고 아무도 안 나가면 리그가 말라야 해요. 손으로 재현합니다. */
  const S = fresh(0);
  const rows = [];
  for (const club of Object.keys(S.squads)) for (const x of S.squads[club]) if (!x.me) rows.push({ ...x });
  const before = rows.reduce((a, x) => a + x.str, 0) / rows.length;
  for (let y = 0; y < 20; y++) {
    for (const x of rows) { x.age += 1; x.str = Sq._t.strOfRow(x); }   // 은퇴 없이 나이만
  }
  const after = rows.reduce((a, x) => a + x.str, 0) / rows.length;
  console.log(`   은퇴를 빼고 20시즌 — 리그 평균 ${before.toFixed(1)} → ${after.toFixed(1)}`);
  check(before - after > 3,
    `아무도 안 나가면 리그가 ${(before - after).toFixed(1)}만큼 마른다 — ②가 그걸 잡고 있어요`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
