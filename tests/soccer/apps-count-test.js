/* 👥 동료 출전 수가 내 출전 수와 어긋나지 않는가.
 *
 * 제보: "김우진은 어떻게 경기수가 20이지.." (12라운드까지 치른 시즌이었어요)
 *
 * 출전 수를 **경기 화면을 열 때**(playShow) 세고 있었어요. 그런데 그 화면은
 * 다시 들어올 수 있습니다 — 앱을 껐다 켜거나 중간에 나갔다 오면 S.pendingShow가
 * 살아 있어서 "경기하러 가기"가 또 떠요. 그때마다 동료 출전 수만 또 올라갑니다.
 * 내 출전 수(act.apps)는 경기가 **끝날 때** 세니까 나만 정확했어요.
 *
 * 같은 것을 두 자리에서 세면 반드시 어긋납니다 — 이 저장소의 단골 병이에요.
 *
 * 지키는 것:
 *   ① 경기를 N번 치르면 우리 팀 선발의 출전 수가 N을 넘지 않는다
 *   ② 경기 화면에 **다시 들어가도** 출전 수가 안 오른다 (제보가 여기였어요)
 *   ③ 그 라운드의 선발은 다시 들어가도 그대로다 (다시 굴리면 명단이 흔들려요)
 *   ④ 변이 검증 — 화면 열 때 세는 옛 방식으로 되돌리면 ②가 무너진다
 *
 * 실제 버튼을 눌러 경기를 치릅니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const FX = (() => {
  const src = fs.readFileSync("/workspace/grow-games/beta/_fixtures.js", "utf8");
  const m = src.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
  return new Function(`return ${m[1]};`)();
})();
/* 시즌을 **막 시작한** 세이브라야 라운드를 실제로 치를 수 있어요.
 * 처음에 soccer-cup을 썼는데 그건 38경기를 다 치른 상태라 바로 결산으로 갔습니다. */
const it = FX.items.find((x) => x.id === "soccer-veteran") || FX.items.find((x) => x.id === "soccer-nation-en");
if (!it) { console.log("❌ 시즌 초 확인용 세이브를 못 찾았어요"); process.exit(1); }
console.log(`   세이브 — ${it.id} (${it.state})`);

const PRE = `window.fetch=()=>Promise.reject(new Error("off"));`
  + `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};`
  + `window.alert=()=>{};window.confirm=()=>false;localStorage.setItem("grow-auto-mini","1");`
  + Object.entries(it.keys).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("");
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRE}</script></head>`)
  .replace("</body>", `<script>window.__get=(n)=>eval(n);</script></body>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} }; w.Stats = { log() {} }; w.alert = () => {}; w.confirm = () => false;
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;

$("btn-continue").click();
const go0 = w.document.querySelector(".slot-modal .slot-go");
if (go0) go0.click();
const S = () => w.__get("S");
check(!!S(), "확인용 세이브를 열었다");
if (!S()) { console.log("\n❌ 실패"); process.exit(1); }

const Squad = w.WingerSquad;
const myApps = () => (S().activity || {}).apps || 0;
/* ⚠️ 기준은 **내 출전 수가 아니라 치러진 라운드 수**예요.
 * 내가 🪑 벤치인 주에도 동료는 뜁니다 — 그래서 동료 출전 수가 내 출전 수보다
 * 많은 건 정상이에요(처음에 내 출전 수로 재다가 거짓 빨간불이 떴습니다). */
const round = () => (S().activity || {}).week || 0;
const mateMax = () => Math.max(0, ...Squad.squadOf(S().group).filter((x) => !x.me).map((x) => x.apps || 0));
const goBtn = () => w.document.querySelector("#pro-actions .go-game");
/* 훈련 버튼은 `data-key`가 붙은 것들이에요(scripts/make-fixtures.js와 같은 방식).
 * 🔮 각성은 confirm으로 물어보는데 여기선 늘 '아니오'라, 누르면 제자리를 맴돌아요. */
const trainBtn = () => Array.from(w.document.querySelectorAll("#pro-actions .action-btn"))
  .filter((b) => !b.disabled && b.dataset.key && !b.classList.contains("awaken-act"))[0];

/* 라운드를 밀어요. **몇 라운드를 쳤는지는 act.week로 셉니다** —
 * 화면 상태로 세려다 한 번에 여러 라운드가 지나가는 걸 못 보고 0으로 셌어요. */
function playUntil(target) {
  for (let guard = 0; guard < 4000; guard++) {
    if (round() >= target) return true;
    if (active() === "screen-career") return "season";
    if (active() === "screen-stage") {
      const n = $("btn-stage-next");
      const pk = (!n || n.hidden) ? w.document.querySelector("#pk-box button") : null;
      if (pk) { pk.click(); continue; }
      if (!n || n.hidden || n.disabled) return false;
      n.click(); continue;
    }
    /* 광고·각성 같은 레이어가 뜨면 먼저 치워요 — 안 치우면 그 뒤가 통째로 막혀요 */
    const ov = w.document.querySelector(".av-overlay");
    if (ov) { const b = ov.querySelector("button:not([disabled])"); if (b) { b.click(); continue; } ov.remove(); continue; }
    const g = goBtn();
    if (g) { g.click(); continue; }
    const t = trainBtn();
    if (!t) return false;
    t.click();
  }
  return false;
}

console.log("=== ① 경기를 치른 만큼만 센다 ===");
const before = { mine: myApps(), mate: mateMax(), round: round() };
console.log(`   시작 — 라운드 ${before.round} · 내 출전 ${before.mine} · 동료 최대 ${before.mate}`);
playUntil(before.round + 4);
const played = round() - before.round;
console.log(`   ${played}라운드 치른 뒤 — 라운드 ${round()} · 내 출전 ${myApps()} · 동료 최대 ${mateMax()}`);
check(played >= 4, `경기를 실제로 치렀다 (${played}라운드)`);
check(mateMax() <= round(),
  `동료 출전 수가 치러진 라운드 수를 안 넘는다 (동료 ${mateMax()} ≤ 라운드 ${round()})`);
check(myApps() <= round(), `내 출전 수도 라운드 수 안이다 (나 ${myApps()} ≤ ${round()})`);

console.log("=== ①-b 내 줄도 같이 오른다 ===");
/* 제보: "10경기에서 방금 경기 한판 했는데 그대로 10경기네"
 * 출전 수를 세는 자리를 leagueRound 한 곳으로 모으면서, 거기서 나를 건너뛰게 됐어요
 * (내 기록은 S.activity에 쌓이니까요). 그래서 **명단의 내 줄만 얼어붙었습니다.**
 * 명단 줄은 S.activity를 비춰 보여줘야 해요 — 한 벌에서 오면 안 어긋나요. */
const meRow = () => Squad.squadOf(S().group).find((x) => x.me) || {};
console.log(`   내 줄 — ${meRow().apps}경기 ⚽${meRow().g} · S.activity ${myApps()}경기 ⚽${(S().activity || {}).goals}`);
check((meRow().apps || 0) === myApps(),
  `명단의 내 줄이 내 출전 수와 같다 (${meRow().apps} = ${myApps()})`);
check((meRow().g || 0) === ((S().activity || {}).goals || 0),
  `내 골도 같다 (${meRow().g} = ${(S().activity || {}).goals})`);

console.log("=== ①-c 한 클럽에 같은 이름이 없다 ===");
{
  let dup = 0;
  for (const club of Object.keys(Squad.ensureSquads())) {
    const names = Squad.squadOf(club).map((x) => x.name);
    dup += names.length - new Set(names).size;
  }
  check(dup === 0, `한 클럽 안에 동명이인이 없다 (겹친 이름 ${dup})`);
}

console.log("=== ②③ 경기 화면에 다시 들어가도 ===");
// 지금 경기를 끝내고, 다음 라운드의 "경기하러 가기"가 뜰 때까지 밀어요
for (let i = 0; i < 400 && !(active() === "screen-pro" && goBtn()); i++) {
  if (active() === "screen-stage") {
    const n = $("btn-stage-next");
    const pk = (!n || n.hidden) ? w.document.querySelector("#pk-box button") : null;
    if (pk) { pk.click(); continue; }
    if (!n || n.hidden || n.disabled) break;
    n.click(); continue;
  }
  if (active() !== "screen-pro") break;
  const ov = w.document.querySelector(".av-overlay");
  if (ov) { const b = ov.querySelector("button:not([disabled])"); if (b) { b.click(); continue; } ov.remove(); continue; }
  const t = trainBtn(); if (!t) break; t.click();
}
if (active() === "screen-pro" && goBtn()) {
  const mate0 = mateMax();
  goBtn().click();                       // 경기 화면으로 (여기서 그 라운드 선발이 뽑혀요)
  const xi0 = (S().activity.xi || []).join(",");
  w.__get('show("screen-pro")');         // 나갔다가
  w.WingerCareer.refreshPro();
  const again = goBtn();
  check(!!again, "나갔다 오면 '경기하러 가기'가 다시 떠요 (이 자리가 제보의 원인이었어요)");
  if (again) again.click();
  console.log(`   다시 들어간 뒤 — 동료 최대 ${mateMax()} (들어가기 전 ${mate0})`);
  check(mateMax() === mate0, `② 다시 들어가도 출전 수가 안 오른다 (${mate0} → ${mateMax()})`);
  check((S().activity.xi || []).join(",") === xi0, "③ 그 라운드 선발도 그대로다");
} else {
  check(false, `경기 직전 상태에 못 닿았어요 (화면 ${active()})`);
}

console.log("=== ⑤ 이미 부풀어 있는 기록을 바로잡는가 ===");
/* 제보 화면: 26라운드 시즌인데 동료가 47경기. 2.50.0 전에는 우리 팀 출전 수를
 * 두 곳에서 세서 최대 두 배가 됐어요. 그 시즌을 이어서 하는 사람은 시즌이 끝날
 * 때까지 그 숫자를 봅니다 — 읽는 쪽에서 한 번 깎아요. */
{
  const act = S().activity;
  const rounds = ((act.cb || 1) - 1) * 19 + (act.week || 0);
  const mate = Squad.squadOf(S().group).find((x) => !x.me);
  mate.apps = rounds + 21;                 // 부풀어 있던 상태를 그대로 재현해요
  act.appsFixed = false;                   // 아직 안 바로잡은 세이브
  w.WingerCareer._t.ensureLeagueRecords();
  console.log(`   ${mate.name} ${rounds + 21}경기 → ${mate.apps}경기 (이번 시즌 ${rounds}라운드)`);
  check(mate.apps === rounds, `치러진 라운드 수로 깎인다 (${mate.apps} = ${rounds})`);
  check(act.appsFixed === true, "한 번만 돌게 도장을 찍는다");
  // 골·도움은 안 건드려요 — 그쪽은 두 번 안 셌어요
  const g0 = mate.g;
  act.appsFixed = false; mate.apps = rounds + 5;
  w.WingerCareer._t.ensureLeagueRecords();
  check(mate.g === g0, "골은 안 건드린다 — 출전 수만 두 곳에서 셌어요");
}

console.log("=== ④ 변이 검증 ===");
check(/if \(act\.xiWeek !== act\.week\) WingerSquad\.rollLineup\(\);/.test(CAREER),
  "그 라운드에 아직 안 굴렸을 때만 굴린다");
/* 출전 수를 세는 자리는 **한 곳뿐**이어야 해요. leagueRound가 리그 전 선발을
 * 한 바퀴 돌면서 셉니다 — markApps를 또 부르면 우리 팀만 두 배가 돼요. */
const roundSrc = (CAREER.match(/function leagueRound\([^)]*\) \{[\s\S]*?\n  \}/) || [""])[0];
check(/p\.apps = \(p\.apps \|\| 0\) \+ 1;/.test(roundSrc), "출전 수를 leagueRound가 센다");
check(!/WingerSquad\.markApps\(\)/.test(CAREER),
  "다른 곳에서는 안 센다 — 두 자리에서 세면 우리 팀만 두 배가 돼요");
/* 그리고 우리 팀은 **실제로 뛴 11명**을 봐야 해요 — 실력 순 선발을 쓰면
 * 화면(중계)에 뜬 사람과 기록이 쌓이는 사람이 달라집니다. */
const SQ = require("fs").readFileSync("/workspace/grow-games/beta/soccer/squad.js", "utf8");
check(/const line = \(S && club === S\.group\) \? matchXI\(\) : startingXIOf\(club\);/.test(SQ),
  "우리 팀은 그 경기에 실제로 뛴 11명으로 센다");
const playShow = (CAREER.match(/function playShow\(\) \{[\s\S]*?\n  \}/) || [""])[0];
check(!/WingerSquad\.markApps\(\)/.test(playShow),
  "④ 화면을 여는 자리에서는 안 센다 — 옛 방식이면 다시 들어갈 때마다 올라가요");

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
try { w.close(); } catch { /* 닫는 중 남은 콜백은 무시해요 */ }
process.exit(fail ? 1 : 0);
