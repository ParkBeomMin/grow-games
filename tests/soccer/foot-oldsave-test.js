/* 🦶 주발이 없던 옛 세이브 — 이어서 하는 사람도 약발이 자라는가.
 *
 * 스피드는 `fillStats`가 채워 줬는데 주발은 안 채웠어요. 읽는 쪽 기본값
 * (오른발·약발 5)만으로도 화면에는 뜨지만, **약발이 자라는 자리가
 * `if (S.foot && ...)`이라 영영 안 자랍니다.** 이어서 하는 사람만 못 크는 거예요.
 *
 * 지키는 것:
 *   ① 주발이 없는 세이브를 이어받으면 주발·약발이 실제로 심긴다
 *   ② 왼발잡이도 나온다 (전부 오른발로 굳지 않아요)
 *   ③ 약발은 타고나는 범위(2~7) 안이다
 *   ④ 이미 있는 주발은 안 건드린다
 *   ⑤ 심긴 뒤에는 경기에서 약발이 자란다
 *   ⑥ 변이 검증 — 채우는 줄을 떼면 ①이 무너진다
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

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
w.Ads = { display() {}, init() {} }; w.Stats = { log() {} };
w.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: () => () => ({ width: 40 }), set: () => true });
};
const get = w.__get, set = w.__set;

// 주발이 없던 세이브를 만들어요 (스피드도 없던 시절 그대로)
function oldSave() {
  const st = get(`newState(MARKETS[0], "mf", "옛사람")`);
  delete st.foot;
  delete st.stats.speed;
  return st;
}

console.log("=== ①②③ 이어받으면 심긴다 ===");
{
  const mains = { R: 0, L: 0 };
  let outOfRange = 0;
  for (let i = 0; i < 400; i++) {
    const st = oldSave();
    set("S", st);
    get("fillStats(S)");
    const f = get("S").foot;
    if (!f) { outOfRange = -1; break; }
    mains[f.main] = (mains[f.main] || 0) + 1;
    if (f.weak < 2 || f.weak > 7) outOfRange += 1;
  }
  check(outOfRange >= 0, "주발이 실제로 심긴다");
  console.log(`   오른발 ${mains.R} · 왼발 ${mains.L} (400명)`);
  check(mains.L > 0 && mains.R > 0, `왼발잡이도 나온다 (왼발 ${mains.L}명)`);
  check(outOfRange === 0, `약발이 타고나는 범위(2~7) 안이다 (벗어난 경우 ${outOfRange})`);
}

console.log("=== ④ 이미 있는 건 안 건드린다 ===");
{
  const st = oldSave();
  st.foot = { main: "L", weak: 3 };
  set("S", st);
  get("fillStats(S)");
  const f = get("S").foot;
  check(f.main === "L" && f.weak === 3, `고른 주발이 그대로다 (${f.main} ${f.weak})`);
}

console.log("=== ⑤ 심긴 뒤에는 자란다 ===");
{
  const st = oldSave();
  set("S", st);
  get("fillStats(S)");
  const before = get("S").foot.weak;
  const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
  const m = SRC.match(/if \(S\.foot && S\.foot\.weak < 10[\s\S]{0,400}?\n\s*\}/);
  check(!!m, "약발이 자라는 자리가 소스에 있다");
  check(!!m && /S\.foot\.weak \+= 1/.test(m[0]),
    `그 자리가 S.foot이 있을 때만 돈다 — 그래서 채워 두는 게 필요해요 (지금 약발 ${before})`);
}

console.log("=== ⑥ 변이 검증 ===");
{
  const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
  const fn = (GAME.match(/function fillStats\(st\) \{[\s\S]*?\n\}/) || [])[0];
  if (!fn) { console.log("❌ fillStats를 못 찾았어요"); process.exit(1); }
  const broken = fn.replace(/if \(!S0\.foot\) S0\.foot = [^;]+;/, "");
  check(broken !== fn, "변이 치환이 됐다");
  const run = new Function("randInt", "STAT_KEYS",
    `${broken} const st = { stats: { shoot: 40, pass: 40, dribble: 40, defense: 40, stamina: 40 } };`
    + ` fillStats(st); return st.foot;`);
  check(run((a) => a, ["shoot", "pass", "dribble", "defense", "stamina", "speed"]) === undefined,
    "변이 검증 — 채우는 줄을 떼면 주발이 안 생긴다 (①이 그걸 잡아요)");
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
