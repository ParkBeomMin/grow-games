/* 🏆 월드컵 수상 — **화면의 1위가 상을 받는가**, 그리고 감독이 아는 말을 하는가.
 *
 * 제보(스크린샷 2장):
 *   ① "월드컵에서 득점 1위인데 아무 수상이 없고" — 순위표는 나(3골)가 1위인데
 *      🥇 골든부츠는 3골인 다른 선수가 가져갔어요.
 *      **표는 `골 → 실력`으로 세우고, 수상은 `골 → 도움`으로 정하고 있었습니다.**
 *      자가 둘이면 화면과 판정이 다른 말을 해요 — 이 저장소의 단골 병이에요.
 *   ② 결산의 감독 한마디에 **"자네 이름과 함께. undefined"** — 🛡️ 골든월을
 *      나중에 만들면서 대사 표에만 안 넣었어요.
 *
 * 지키는 것:
 *   ① 세 부문 모두 **순위표 1위 = 수상자**다 (동률을 일부러 만들어서 본다)
 *   ② 동률 규칙이 실제 대회를 따른다 — 골든부츠는 도움, 골든월은 출전
 *   ③ 동률이 있을 때 그 규칙이 화면에 적힌다 (안 적으면 "왜 쟤가 위지"가 돼요)
 *   ④ 동률이 없으면 그 줄을 안 그린다 — 늘 적으면 잔소리예요
 *   ⑤ **모든 상**에 감독 대사가 있다 — 하나라도 비면 화면에 undefined가 찍혀요
 *   ⑥ 변이 검증 — 수상이 따로 줄을 세우면 ①이 무너진다
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const WCSRC = fs.readFileSync(path.join(DIR, "worldcup.js"), "utf8");

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
const WC = w.WingerWorldCup, Career = w.WingerCareer;
check(!!WC && !!Career, "worldcup.js·career.js가 로드된다");
if (!WC || !Career) { console.log("\n❌ 실패"); process.exit(1); }
const T = WC._t;

/* 대회 한복판 상태를 손으로 세워요 — 동률을 정확히 만들려면 굴려서는 안 됩니다. */
function stage(mine, rival) {
  const st = get('newState(MARKETS[0], "fw", "장선우")');
  st.proYear = 7; st.phase = "soccer-pro"; st.league = 1;
  const nat = WC.myNation().name;
  st.wc = {
    stage: "final", gIdx: 3, g: mine.g, a: mine.a, d: mine.d, apps: 5, ratingSum: 35,
    myGroup: [{ name: nat, me: true, pts: 9, gd: 5, str: 84 }, { name: "🇺🇾 우루과이", pts: 6, gd: 2, str: 82 }],
    others: [{ name: "🇺🇾 우루과이", str: 82 }],
    natOut: [], champ: nat, path: [],
    squads: {
      [nat]: [{ name: "장선우", me: true, pos: "fw", str: 120, g: mine.g, a: mine.a, d: mine.d, apps: 5, rate: 35 }],
      "🇺🇾 우루과이": [{ name: "밀란 베르너", pos: "fw", str: 95, g: rival.g, a: rival.a, d: rival.d, apps: rival.apps || 5, rate: rival.rate != null ? rival.rate : 35 }],
    },
  };
  set("S", st);
  return st;
}
const nameOf = (list, id) => (list.find((x) => x.id === id) || {}).who || "(없음)";

// ---------- ① 표의 1위 = 수상자 ----------
console.log("=== ①② 동률일 때 표와 수상이 같은가 ===");
{
  /* 제보 그대로 — 나 3골 0도움 vs 상대 3골 1도움. 실제 규정대로면 상대가 위예요.
   * 중요한 건 **표와 상이 같은 답을 내는 것**입니다. */
  stage({ g: 3, a: 0, d: 18 }, { g: 3, a: 1, d: 2 });
  const tbl = WC._t.faces("g");
  const aw = T.decideAwards();
  console.log(`   득점표 1위 ${tbl[0].p.name}(${tbl[0].p.g}골 ${tbl[0].p.a}도움) · 🥇 골든부츠 ${nameOf(aw, "boot")}`);
  check(tbl[0].p.name === nameOf(aw, "boot"),
    "🥇 골든부츠 = 득점표 1위 — 여기가 갈려서 '1위인데 상이 없다'가 났어요");
  check(nameOf(aw, "boot") === "밀란 베르너", "골이 같으면 도움이 많은 쪽이 위다 (실제 골든부츠 규정)");

  // 도움까지 같으면 이번엔 내가 위여야 해요 (출전 수가 같으면 실력)
  stage({ g: 3, a: 1, d: 18 }, { g: 3, a: 1, d: 2 });
  const tbl2 = WC._t.faces("g"), aw2 = T.decideAwards();
  console.log(`   골·도움 모두 동률 — 표 1위 ${tbl2[0].p.name} · 골든부츠 ${nameOf(aw2, "boot")}`);
  check(tbl2[0].p.name === nameOf(aw2, "boot"), "그때도 표와 상이 같다");

  // 🛡️ 골든월 — 수비 동률이면 출전이 많은 쪽
  stage({ g: 0, a: 0, d: 10 }, { g: 0, a: 0, d: 10, apps: 3 });
  const dTbl = WC._t.faces("d"), dAw = T.decideAwards();
  console.log(`   수비표 1위 ${dTbl[0].p.name}(${dTbl[0].p.d}회 ${dTbl[0].p.apps}경기) · 🛡️ 골든월 ${nameOf(dAw, "wall")}`);
  check(dTbl[0].p.name === nameOf(dAw, "wall"), "🛡️ 골든월 = 수비표 1위");
  check(nameOf(dAw, "wall") === "장선우", "수비가 같으면 많이 뛴 쪽이 위다");

  // 🏅 골든볼 — 평점 동률이면 생산량
  stage({ g: 1, a: 0, d: 0 }, { g: 4, a: 2, d: 0, rate: 35 });
  const rTbl = WC._t.faces("r"), rAw = T.decideAwards();
  console.log(`   평점표 1위 ${rTbl[0].p.name} · 🏅 골든볼 ${nameOf(rAw, "ball")}`);
  check(rTbl[0].p.name === nameOf(rAw, "ball"), "🏅 골든볼 = 평점표 1위");
  check(nameOf(rAw, "ball") === "밀란 베르너", "평점이 같으면 골·도움이 많은 쪽이 위다");
}

// ---------- ③④ 동률 규칙이 화면에 적히는가 ----------
console.log("=== ③④ 왜 그 순서인지 화면에 적는가 ===");
{
  /* ⚠️ faceTab은 모듈 안의 값이라 밖에서 못 바꿔요 — **실제 탭 버튼을 눌러서** 바꿉니다.
   * (처음엔 밖에서 넣으려다 늘 ⭐평점 탭을 재고 있었어요. 초록불이었는데 딴 걸 봤습니다.) */
  const box = w.document.createElement("div");
  const pickTab = (k) => {
    box.innerHTML = WC.raceHTML();
    WC.wireFaceTabs(box, () => { box.innerHTML = WC.raceHTML(); });
    const b = box.querySelector(`.race-tab[data-fk="${k}"]`);
    if (b) b.click();
    return box.innerHTML;
  };

  stage({ g: 3, a: 0, d: 1 }, { g: 3, a: 1, d: 1 });
  const tied = pickTab("g");
  console.log(`   ⚽ 득점 탭 — ${(tied.match(/⚖️[^<]*/) || ["(없음)"])[0]}`);
  check(/wc-tie-note/.test(tied) && /도움/.test(tied), "동률이면 무엇으로 갈랐는지 적는다");

  stage({ g: 5, a: 0, d: 1 }, { g: 1, a: 1, d: 1 });
  const alone = pickTab("g");
  check(!/wc-tie-note/.test(alone), "동률이 없으면 그 줄을 안 그린다 — 늘 적으면 잔소리예요");
}

// ---------- ⑤ 감독이 아는 말을 하는가 ----------
console.log("=== ⑤ 감독 한마디에 undefined가 없는가 ===");
{
  const src = (WCSRC.match(/const SAY_AWARD = \{[\s\S]*?\};/) || [""])[0];
  check(!!src, "대사 표를 소스에서 찾았다");
  const SAY = new Function(`${src} return SAY_AWARD;`)();
  /* ⚠️ 대사 표를 손으로 베끼지 않아요 — **decideAwards가 실제로 만드는 상 id**를
   * 뽑아서 그 전부에 대사가 있는지 봅니다. 상을 하나 더 만들면 검사가 따라와요. */
  stage({ g: 9, a: 9, d: 99 }, { g: 0, a: 0, d: 0 });
  const ids = T.decideAwards().map((a) => a.id);
  console.log(`   상 ${ids.join(" · ")} · 대사 ${Object.keys(SAY).join(" · ")}`);
  const missing = ids.filter((id) => !SAY[id]);
  check(missing.length === 0, `모든 상에 대사가 있다 (빠진 것 ${missing.join(",") || "없음"})`);

  // 실제 결산 문구를 뽑아 봐요 — 상마다 한 번씩
  const st = w.__get("S");
  for (const id of ids) {
    st.wcHist = [{ y: 7, result: "champion", g: 3, a: 0, apps: 5, awards: [id], champ: WC.myNation().name }];
    const line = WC.reportLine();
    check(!/undefined/.test(line), `${id} — 결산 문구에 undefined가 없다`);
    if (/undefined/.test(line)) console.log(`      ${line.replace(/<[^>]+>/g, " ").trim()}`);
  }
  // 대사 표에 없는 상이 들어와도 화면이 안 깨져야 해요 (두 번째 방어선)
  st.wcHist = [{ y: 7, result: "champion", g: 3, a: 0, apps: 5, awards: ["새로운상"], champ: WC.myNation().name }];
  check(!/undefined/.test(WC.reportLine()), "대사 표에 없는 상이 와도 undefined가 안 찍힌다");
}

// ---------- ⑥ 변이 검증 ----------
console.log("=== ⑥ 변이 검증 ===");
{
  const body = (WCSRC.match(/function decideAwards\(\) \{[\s\S]*?\n {2}\}/) || [""])[0];
  check(/faces\("g"\)\[0\]/.test(body), "수상이 순위표에서 1위를 데려온다");
  check(!/rows\.slice\(\)\.sort/.test(body), "수상이 따로 줄을 세우지 않는다 — 자가 둘이면 화면과 갈려요");

  /* 옛 방식(수상이 따로 정렬)으로 되돌리면 ①이 실제로 무너지는지 봅니다 */
  stage({ g: 3, a: 0, d: 1 }, { g: 3, a: 1, d: 1 });
  const rows = WC._t.faces();
  const oldBoot = rows.slice().sort((a, b) => (b.p.g || 0) - (a.p.g || 0) || (b.p.a || 0) - (a.p.a || 0))[0];
  const oldTable = rows.slice().sort((a, b) =>
    (b.p.g || 0) - (a.p.g || 0) || (b.p.g || 0) - (a.p.g || 0) || b.p.str - a.p.str)[0];
  console.log(`   옛 방식 — 표 1위 ${oldTable.p.name} · 골든부츠 ${oldBoot.p.name}`);
  check(oldTable.p.name !== oldBoot.p.name,
    "변이 — 옛 두 자로 재면 표 1위와 수상자가 갈린다 (①이 그걸 잡아요)");
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
