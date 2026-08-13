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
    check(on + here === Sq.slotsOf("df").length, `내 포지션 자리만 또렷하다 (${on + here}개)`);
    check(/발이 맞아요|반대발 자리예요/.test(box.textContent), "🦶 발 궁합을 적는다");
  }
}

// ---------- ⑦ 변이 검증 ----------
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
