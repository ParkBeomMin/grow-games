/* 🦶 주발·약발 · 📊 능력치 레이더.
 *
 * 요청: "선수 포지션이나 능력치를 이런 식으로 관리하고 시각화해서 보여주는 건 어때?"
 * (FIFA식 육각 레이더 + 주발/약발 목업)
 *
 * 새 축을 넣을 때 가장 무서운 건 **이어하던 선수가 조용히 달라지는 것**이에요.
 * 그래서 기준값(5)이 배수 1.00이고, 칸이 없는 옛 세이브는 5로 읽혀요 —
 * 기본값이 중립이 아니면 그건 기능 추가가 아니라 밸런스 변경입니다.
 *
 * 지키는 것:
 *   ① 칸이 없는 옛 세이브와 약발 5가 **같은 배수**다 (이어하던 선수가 안 흔들린다)
 *   ② 약발이 오르면 골·도움 기댓값이 오른다 (단조)
 *   ③ 폭이 ±7% 안이다 — 타고난 값 하나가 실력을 이기면 안 돼요
 *   ④ 수비에는 안 붙는다 (태클에 발이 갈리지는 않아요)
 *   ⑤ 약발은 **경기에서만** 붙는다 — 골·도움이 없으면 안 오르고, 10에서 멈춘다
 *   ⑥ 준비 화면에 레이더가 그려지고 발 두 개가 뜬다
 *   ⑦ 변이 검증 — 배수를 떼면 ②가 무너진다
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const grab = (src, re) => { const m = src.match(re); if (!m) throw new Error(`못 찾음: ${re}`); return m[0]; };

// ---------- 산식은 소스에서 떼어 와 굴려요 ----------
const mulOf = new Function("st", `${grab(GAME, /const FOOT_MID = [^;]+;/)}
  ${grab(GAME, /const FOOT_K = [^;]+;/)}
  ${grab(GAME, /const weakFoot = [^;]+;/)}
  ${grab(GAME, /const footMul = [^;]+;/)}
  const S = st; return footMul(st);`);

console.log("=== ① 옛 세이브가 안 흔들리는가 ===");
const old = mulOf({});                       // foot 칸이 아예 없는 세이브
const five = mulOf({ foot: { main: "R", weak: 5 } });
console.log(`   칸 없음 ${old.toFixed(4)} · 약발 5 ${five.toFixed(4)}`);
check(old === five, `칸이 없으면 약발 5로 읽는다 (${old} = ${five})`);
check(old === 1, `그 배수가 정확히 1.00이다 (${old}) — 아니면 이어하던 선수가 조용히 달라져요`);

console.log("=== ②③ 폭 ===");
const at = (w) => mulOf({ foot: { main: "R", weak: w } });
const line = [1, 3, 5, 7, 10].map((w) => `${w}→${at(w).toFixed(3)}`).join(" · ");
console.log(`   ${line}`);
check([1, 3, 5, 7, 10].every((w, i, a) => i === 0 || at(w) > at(a[i - 1])), "약발이 오르면 배수도 오른다");
check(at(1) > 0.93 && at(10) < 1.07,
  `폭이 ±7% 안이다 (${at(1).toFixed(3)} ~ ${at(10).toFixed(3)}) — 타고난 값이 실력을 이기면 안 돼요`);

console.log("=== ④ 붙는 자리 ===");
const gLine = grab(GAME, /const gLam = [^;]+;/);
const aLine = grab(GAME, /const aLam = [^;]+;/);
const dLine = grab(GAME, /const dLam = [^;]+;/);
console.log(`   ${dLine.trim().slice(0, 96)}`);
check(/\* foot \*/.test(gLine) || /foot/.test(gLine), "골에 붙는다");
check(/foot/.test(aLine), "도움에 붙는다");
check(!/foot/.test(dLine), "수비에는 안 붙는다 — 태클에 발이 갈리지는 않아요");

console.log("=== ⑤ 약발은 경기에서만 붙는다 ===");
const growSrc = grab(CAREER, /const FOOT_GROW_P = [\s\S]*?proLog\(`🦶[^`]*`\);\n    \}/);
const grow = new Function("S", "info", "Math_random", "proLog", `
  const Math = { random: Math_random, min: global.Math.min, max: global.Math.max, round: global.Math.round };
  ${growSrc}
  return S.foot.weak;`);
const run = (weak, goals, assists, r) =>
  grow({ foot: { main: "R", weak } }, { myGoals: goals, assists }, () => r, () => {});
check(run(5, 0, 0, 0) === 5, "골도 도움도 없으면 안 오른다 (운이 아무리 좋아도)");
check(run(5, 1, 0, 0) === 6, "골을 넣은 경기에서는 오를 수 있다");
check(run(5, 1, 0, 0.99) === 5, "확률이라 늘 오르지는 않는다");
check(run(10, 3, 3, 0) === 10, "10에서 멈춘다");

// ---------- ⑥ 화면 ----------
console.log("=== ⑥ 준비 화면 ===");
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
/* jsdom 캔버스에는 2d 컨텍스트가 없어요 — 레이더가 거기서 죽으면 준비 화면이
 * 통째로 안 그려집니다. 최소한만 흉내 내어 "그리려고 시도했는가"를 봐요. */
let drew = 0;
w.HTMLCanvasElement.prototype.getContext = function () {
  drew += 1;
  return new Proxy({}, { get: () => () => {}, set: () => true });
};
const st = w.__get(`newState(MARKETS[0], "fw", "테스트")`);
st.phase = "soccer-pro"; st.league = 1; st.proYear = 3;
st.group = w.__get("CLUBS")[1][0].name; st.clubStr = w.__get("CLUBS")[1][0].str;
st.foot = { main: "L", weak: 3 };
w.__set("S", st);
w.WingerCareer.refreshPro();
const stats = w.document.getElementById("pro-stats");
const txt = (stats.textContent || "").replace(/\s+/g, " ");
console.log(`   ${txt.slice(0, 100)}`);
check(!!stats.querySelector(".stat-radar"), "레이더 자리가 있다");
check(drew > 0, `레이더를 실제로 그린다 (getContext ${drew}회)`);
check(stats.querySelectorAll(".foot").length === 2, `발이 둘 뜬다 (${stats.querySelectorAll(".foot").length}개)`);
check(/왼발잡이/.test(txt), `주발을 적는다 (${(txt.match(/[왼오]른?발잡이/) || [])[0]})`);
check(/약발 3\/10/.test(txt), "약발 숫자를 적는다");
check(stats.querySelectorAll(".stat-row").length === w.__get("STAT_DEFS").length,
  "막대도 그대로 있다 — 🔮 각성 버튼과 정확한 값은 거기서 봐요");

console.log("=== ⑦ 변이 검증 ===");
{
  /* 배수를 떼면(늘 1) 약발이 아무 일도 안 해요. ②가 그걸 잡습니다. */
  const flat = () => 1;
  check(at(1) !== flat() && at(10) !== flat(),
    `배수를 떼면 약발 1과 10이 ${flat()}로 같아진다 — ②가 그걸 막아요`);
  check(/foot: rollFoot\(\)/.test(GAME), "새 선수는 주발·약발을 타고난다");
  check(/const FOOT_MID = 5;/.test(GAME), "기준이 5다 — 옛 세이브의 기본값과 같아야 해요");
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
try { w.close(); } catch { /* 닫는 중 남은 콜백은 무시해요 */ }
process.exit(fail ? 1 : 0);
