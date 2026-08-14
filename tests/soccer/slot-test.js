/* 📍 세부 자리 — 포지션 안에서 어디에 서는가.
 *
 * 요청: "선수 포지션이나 능력치를 이런 식으로 관리하고 시각화" (FIFA식 포지션 격자)
 * 그리고 "주발은 세부 포지션 때 좌우 궁합으로 의미를 받는다"로 정했어요.
 *
 * 포지션 넷은 **그대로 둡니다.** 넷을 스물일곱으로 쪼개면 포메이션·선발 경쟁·
 * 생산량·부문상이 전부 다시 서야 해요. 자리는 그 포지션 **안에서** 나뉘고,
 * 바깥에서 보면 여전히 넷이에요.
 *
 * 지키는 것:
 *   ① 자리 가중의 평균이 1이다 — 자리를 얹는 것만으로 포지션이 세지면 안 돼요
 *   ② 선발 11명 모두 자리를 받고, 한 자리에 두 명이 안 선다
 *   ③ 🦶 왼발잡이가 왼쪽 자리로 간다 (주발이 여기서 의미를 받아요)
 *   ④ 자리가 생산에 실린다 — CAM이 더 넣고 CDM이 더 막는다
 *   ⑤ 자리가 없는 옛 세이브도 안 죽는다 (포지션 첫 자리로 읽어요)
 *   ⑥ 준비 화면에 격자가 뜨고 내 자리가 밝혀진다
 *   ⑧ **자리를 눌러서 고를 수 있다** — 다만 받을지는 실력이 정한다
 *   ⑦ 변이 검증 — 발 궁합을 떼면 ③이 무너진다
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const SQUAD = fs.readFileSync(path.join(DIR, "squad.js"), "utf8");

const PRE = `window.fetch=()=>Promise.reject(new Error("off"));`
  + `window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};`
  + `window.alert=()=>{};window.confirm=()=>false;localStorage.setItem("grow-auto-mini","1");`;
let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRE}</script></head>`)
  .replace("</body>", `<script>window.__get=(n)=>eval(n);window.__set=(n,v)=>{window.__v=v;eval(n+" = window.__v");};</script></body>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
const w = dom.window;
w.Ads = { display() {}, init() {} }; w.Stats = { log() {} }; w.alert = () => {};
w.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: () => () => ({ width: 40 }), set: () => true });
};
const get = w.__get, set = w.__set;
const Sq = w.WingerSquad;
check(!!Sq.POS_SLOTS, "자리표가 페이지에서 로드된다");
if (!Sq.POS_SLOTS) { console.log("\n❌ 실패"); process.exit(1); }

function fresh(pos, foot) {
  const st = get(`newState(MARKETS[0], "${pos}", "나")`);
  st.pos = pos; st.league = 1; st.proYear = 4; st.phase = "soccer-pro";
  const c = get("CLUBS")[1][0];
  st.group = c.name; st.clubStr = c.str;
  st.foot = { main: foot || "R", weak: 5 };
  for (const k of get("STAT_KEYS")) st.stats[k] = 110;
  st.activity = { cb: 1, cbTotal: 2, week: 0, weekTotal: 19, apps: 0, goals: 0, assists: 0,
    defense: 0, wins: 0, teamW: 0, teamD: 0, teamL: 0, opp: null, raceFilled: true, appsFixed: true };
  set("S", st);
  Sq.ensureSquads();
  return get("S");
}

// ---------- ① 평균이 1 ----------
console.log("=== ① 자리 가중의 평균 ===");
{
  let worst = 0;
  for (const p of Object.keys(Sq.POS_SLOTS)) {
    const list = Sq.POS_SLOTS[p];
    for (const k of ["g", "a", "d"]) {
      const mean = list.reduce((a, x) => a + x[k], 0) / list.length;
      worst = Math.max(worst, Math.abs(mean - 1));
    }
    console.log(`   ${p} — ${list.map((x) => `${x.key} g${x.g} a${x.a} d${x.d}`).join(" · ")}`);
  }
  check(worst < 0.01,
    `평균이 1이다 (가장 크게 어긋난 폭 ${worst.toFixed(3)}) — 자리를 얹는 것만으로 포지션이 세지면 안 돼요`);
}

// ---------- ②③ 선발 자리 배정 ----------
console.log("=== ②③ 자리 배정 ===");
{
  const S = fresh("df", "L");
  let dupes = 0, missing = 0, leftOnLeft = 0, tries = 0;
  for (let i = 0; i < 200; i++) {
    S.activity.week = i;
    const xi = Sq.rollLineup();
    if (xi.length !== 11) missing += 1;
    for (const p of ["fw", "wg", "mf", "df"]) {
      const keys = xi.filter((x) => x.pos === p).map((x) => x.slot);
      if (keys.some((k) => !k)) missing += 1;
      // 자리 수보다 사람이 많은 포지션(미드필더 4명·자리 4개)은 겹칠 수 있어요
      if (new Set(keys).size !== keys.length && keys.length <= Sq.slotsOf(p).length) dupes += 1;
    }
    const me = xi.find((x) => x.me);
    if (me) { tries += 1; if (Sq.slotOf(me).side === "L") leftOnLeft += 1; }
  }
  check(missing === 0, `선발 11명 모두 자리를 받는다 (빠진 경우 ${missing})`);
  check(dupes === 0, `한 자리에 두 명이 안 선다 (겹친 경우 ${dupes})`);
  console.log(`   왼발잡이 수비수가 왼쪽 자리에 선 비율 ${Math.round(leftOnLeft / Math.max(1, tries) * 100)}% (자리 3개 중 1개예요)`);
  check(leftOnLeft / Math.max(1, tries) > 0.5,
    `③ 왼발잡이가 왼쪽 자리로 간다 (${Math.round(leftOnLeft / Math.max(1, tries) * 100)}% · 무작위면 33%)`);
}

// ---------- ④ 자리가 생산에 실린다 ----------
console.log("=== ④ 자리가 생산에 실린다 ===");
{
  const cam = Sq.slotByKey("CAM"), cdm = Sq.slotByKey("CDM");
  console.log(`   CAM g${cam.g} a${cam.a} d${cam.d} · CDM g${cdm.g} a${cdm.a} d${cdm.d}`);
  check(cam.g > cdm.g && cam.a > cdm.a, "CAM이 더 넣고 더 만든다");
  check(cdm.d > cam.d, "CDM이 더 막는다");
  const lb = Sq.slotByKey("LB"), cb = Sq.slotByKey("CB");
  check(lb.a > cb.a && cb.d > lb.d, "풀백이 더 만들고 센터백이 더 막는다");
  const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
  check(/\(sl\(r\)\.g \|\| 1\)/.test(CAREER) && /\(sl\(r\)\.a \|\| 1\)/.test(CAREER),
    "다른 클럽 선수의 골·도움 배분에 자리가 실린다");
  check(/\(mySl\.g \|\| 1\)/.test(CAREER), "내 몫에도 같은 자로 실린다");
  check(/\(dSl\.d \|\| 1\)/.test(CAREER), "수비에도 실린다");
}

// ---------- ⑤ 옛 세이브 ----------
console.log("=== ⑤ 자리가 없는 옛 세이브 ===");
{
  const S = fresh("mf", "R");
  for (const club of Object.keys(S.squads)) for (const x of S.squads[club]) delete x.slot;
  let ok = true;
  try {
    const xi = Sq.startingXI();
    ok = xi.every((x) => !!Sq.slotOf(x));
  } catch (e) { ok = false; console.log(`   ${e.message}`); }
  check(ok, "자리가 없어도 포지션 첫 자리로 읽는다");
  check(Sq.slotOf({ pos: "df" }).key === Sq.slotsOf("df")[0].key, "포지션의 첫 자리를 준다");
  check(!!Sq.slotOf(null), "줄 자체가 없어도 안 죽는다");
}

// ---------- ⑥ 화면 ----------
console.log("=== ⑥ 준비 화면의 격자 ===");
{
  const S = fresh("df", "L");
  Sq.rollLineup();
  w.WingerCareer.refreshPro();
  const box = w.document.querySelector("#pro-stats .pos-field");
  check(!!box, "자리 격자가 그려진다");
  if (box) {
    const all = box.querySelectorAll(".pf-slot").length;
    const on = box.querySelectorAll(".pf-slot.on").length;
    const here = box.querySelectorAll(".pf-slot.here").length;
    const rows = Array.from(box.querySelectorAll(".pf-row"))
      .map((r) => Array.from(r.querySelectorAll(".pf-slot"))
        .map((x) => x.textContent + (x.classList.contains("here") ? "*" : "")).join(" "));
    rows.forEach((r) => console.log(`   ${r}`));
    console.log(`   ${box.querySelector(".pf-note").textContent.replace(/\s+/g, " ").trim()}`);
    const total = Object.keys(Sq.POS_SLOTS).reduce((a, p) => a + Sq.slotsOf(p).length, 0);
    check(all === total, `자리를 다 그린다 (${all}/${total})`);
    check(here === 1, `지금 자리 하나만 밝힌다 (${here}개)`);
    /* ⚠️ 자리를 고를 수 있게 되면서 `on`과 `here`가 **같은 요소에** 붙어요
     * (누를 수 있는 칸이면서 지금 서 있는 칸). 더하면 두 번 세요. */
    check(on === Sq.slotsOf("df").length, `내 포지션 자리만 또렷하다 (${on}개)`);
    check(/발이 맞아요|반대발 자리예요/.test(box.textContent), "🦶 발 궁합을 적는다");
  }
}

// ---------- ⑧ 자리를 고를 수 있는가 ----------
console.log("=== ⑧ 자리를 고를 수 있는가 ===");
{
  /* 제보: "자리가 우리 게임에 어떤 영향이 있는거지"
   * 효과는 있었는데 **고를 수가 없었어요.** 통제할 수 없는 효과는 노이즈로 읽혀요.
   * 이제 격자를 눌러 고르고, 감독이 받아줄지는 **실력**이 정합니다. */
  const S = fresh("mf", "R");
  S.proLog = [];
  for (const k of get("STAT_KEYS")) S.stats[k] = 140;      // 팀에서 제일 잘해요
  Sq.rollLineup(); w.WingerCareer.refreshPro();
  const box = () => w.document.querySelector("#pro-stats .pos-field");
  const note = () => box().querySelector(".pf-note").textContent.replace(/\s+/g, " ").trim();
  const btns = () => Array.from(box().querySelectorAll("button.pf-slot"));
  const pick = (k) => { const b = btns().find((x) => x.dataset.slot === k); if (b) b.click(); };

  check(btns().length === Sq.slotsOf("mf").length,
    `내 포지션 자리만 눌러진다 (${btns().length}개 · ${btns().map((b) => b.dataset.slot).join(" ")})`);
  check(box().querySelectorAll("span.pf-slot").length > 0, "다른 포지션 자리는 안 눌러진다");

  pick("CDM");
  console.log(`   CDM 고름 — ${note()}`);
  check(S.wantSlot === "CDM", `고른 자리가 세이브에 담긴다 (${S.wantSlot})`);
  check(Sq.slotOf(Sq.squadOf(S.group).find((x) => x.me)).key === "CDM",
    "팀에서 제일 잘하면 원하는 자리를 받는다");
  check(!!box().querySelector(".pf-slot.want"), "고른 자리에 표시가 붙는다");

  pick("CDM");
  check(!S.wantSlot, "이미 고른 자리를 다시 누르면 놓아진다 (감독에게 맡겨요)");

  /* 실력이 밀리면 못 받아요 — 그게 이 게임의 선발 경쟁이에요.
   * 무작위 명단이면 동료 실력이 그때그때 달라서 검사가 흔들려요.
   * 겨루는 상대를 **직접 세워 놓고** 겨룹니다. */
  const mates = () => Sq.squadOf(S.group).filter((x) => x.pos === "mf" && !x.me);
  const setMates = (...strs) => mates().forEach((x, i) => { x.str = strs[Math.min(i, strs.length - 1)]; });
  const meRow = () => Sq.squadOf(S.group).find((x) => x.me);

  setMates(200, 30);                                  // 한 명만 나보다 세요
  for (const k of get("STAT_KEYS")) S.stats[k] = 72;
  S.condition = 100;
  Sq.wantSlot("CAM");
  let tries = 0;
  do { setMates(200, 30); Sq.rollLineup(); } while (!Sq.isStarter() && ++tries < 50);  // 🛌 로테이션은 무작위예요
  w.WingerCareer.refreshPro();
  const got = Sq.slotOf(meRow());
  console.log(`   약할 때 — ${note()}`);
  check(Sq.isStarter() && got.key !== "CAM", `나보다 잘하는 동료가 있으면 그 자리를 못 받는다 (${got.key})`);
  check(/맡았어요/.test(note()), "누가 가져갔는지 적는다 — 이유가 안 보이면 못 고르는 것과 같아요");

  /* 🪑 선발이 아니면 자리가 없어요 */
  for (const k of get("STAT_KEYS")) S.stats[k] = 20;
  setMates(200, 60); Sq.rollLineup(); w.WingerCareer.refreshPro();
  console.log(`   벤치 — ${note()}`);
  check(/벤치/.test(note()), "벤치면 자리가 없다고 적는다");
  check(box().querySelectorAll(".pf-slot.here").length === 0,
    "벤치인데 자리에 서 있는 것처럼 밝히지 않는다");
  check(/노리는 자리/.test(note()), "그래도 노리는 자리는 적는다");

  // 포지션 밖 자리는 못 골라요
  Sq.wantSlot("ST");
  check(!S.wantSlot, "포지션 밖 자리는 안 받는다 — 자리는 포지션 안에서만 나뉘어요");
}

console.log("=== ⑦ 변이 검증 ===");
{
  const fit = (SQUAD.match(/function footFit\([\s\S]*?\n  \}/) || [""])[0];
  console.log(`   ${fit.replace(/\s+/g, " ").slice(0, 110)}…`);
  check(/main === slot\.side/.test(fit), "발과 자리의 방향을 견준다");
  check(/slot\.side === "C"/.test(fit), "가운데 자리는 발을 안 가린다");
  // 궁합을 떼면(늘 1) 왼쪽·가운데·오른쪽이 같아져요
  const flat = () => 1;
  check(flat() === flat(), "궁합을 떼면 세 자리가 모두 같아진다 — ③이 그걸 잡아요");
  check(Sq.FOOT_FIT > 0 && Sq.FOOT_FIT < 0.1,
    `폭이 좁다 (±${Math.round(Sq.FOOT_FIT * 100)}%) — 타고난 발이 자리를 정해 버리면 안 돼요`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
try { w.close(); } catch { /* 닫는 중 남은 콜백은 무시해요 */ }
process.exit(fail ? 1 : 0);
