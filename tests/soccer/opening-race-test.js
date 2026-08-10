/* 🥇 개막 전 개인 순위 화면 — 설명 대신 표를 보여주는가.
 *
 * 제보 ① "「시즌이 시작되면 리그의 다른 8명과…」 이 문구는 아직 있네"
 * 제보 ② "이런 문구 굳이 없어도 될 듯"
 *
 * 개인 순위가 리그 명단을 읽게 되면서 개막 전에도 표를 그릴 수 있게 됐어요.
 * 설명 문단 대신 **누구와 겨루는지** 보여줍니다.
 *
 * 지키는 것:
 *   ① 설명 문단(.race-title)을 안 그린다
 *   ② 표가 실제로 그려진다 (개인 순위가 통째로 사라지지 않는다)
 *   ③ 요약줄이 순위를 말하지 않는다 — 시작도 안 했는데 "1위"는 거짓말이에요
 *   ④ 👑이 안 붙는다 (0골 1위는 1위가 아니에요)
 *   ⑤ 실력 순으로 세운다 — 기록 순이면 전부 0이라 내가 1위로 뜬다
 *   ⑥ "리그 선발 N명"은 지금 선발을 센다
 *
 * ⚠️ "아무도 기록이 없으면 개막 전"으로 판정하면 안 돼요. 결산을 안 거치고
 * 넘어온 옛 세이브에는 지난 시즌 기록이 남아 있어서(실측: 69명 중 12명)
 * 그 판정이 거짓이 됩니다 — **시즌이 진행 중인가(S.activity)**를 직접 봐요.
 * 실제로 그것 때문에 이 화면에 지난 시즌 득점왕이 👑을 달고 떠 있었어요.
 */
"use strict";
const fs=require("fs"),path=require("path");
const DIR="/workspace/grow-games/beta/soccer";
const {JSDOM}=require("/workspace/grow-games/tests/cloud/jsdom.js");
const FX=(()=>{const src=fs.readFileSync("/workspace/grow-games/beta/_fixtures.js","utf8");
  const m=src.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);return new Function("return "+m[1])();})();
const it=FX.items.find(x=>x.id==="soccer-aging");   // 결산 → 다음 시즌 시작 전 = 개막 전
const PRE=`window.fetch=()=>Promise.reject(new Error("off"));window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};window.alert=()=>{};window.confirm=()=>false;`
  +Object.entries(it.keys).map(([k,v])=>`localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("");
let html=fs.readFileSync(path.join(DIR,"index.html"),"utf8").replace(/<script src="([^"]+)"><\/script>/g,(m,src)=>{const p=path.resolve(DIR,src);return fs.existsSync(p)?`<script>\n${fs.readFileSync(p,"utf8")}\n</script>`:"";});
html=html.replace("</head>",`<script>${PRE}</script></head>`).replace("</body>",`<script>window.__get=(n)=>eval(n);</script></body>`);
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/soccer/"});
const w=dom.window;w.Ads={display(){},init(){}};w.Stats={log(){}};w.alert=()=>{};w.confirm=()=>false;
const $=(id)=>w.document.getElementById(id);
$("btn-continue").click();
const go=w.document.querySelector(".slot-modal .slot-go"); if(go) go.click();
// 결산 → 다음 시즌 시작
const next=Array.from(w.document.querySelectorAll("#career-actions .btn")).find(b=>/시즌 시작|컴백 준비/.test(b.textContent));
if(next) next.click();
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const active = (w.document.querySelector(".screen.active")||{}).id;
check(active === "screen-pro", `준비 화면에 닿았다 (${active})`);
const sum = ($("pro-race-sum")||{}).textContent || "";
console.log(`   요약줄 — ${sum}`);
check(/개막 전/.test(sum) && !/위 \(/.test(sum), `③ 요약줄이 순위를 말하지 않는다 (${sum})`);
check(/리그 선발 \d+명/.test(sum), "⑥ 리그 선발 수가 적힌다");
const n = Number((sum.match(/리그 선발 (\d+)명/)||[])[1]||0);
const xi = w.WingerSquad.leagueXI().length - 1;
check(n === xi, `그 수가 지금 선발과 같다 (${n} = ${xi})`);
const body=($("pro-race-body")||{}).innerHTML||"";
check(!/race-title/.test(body), "① 설명 문단을 안 그린다");
const rows=Array.from(w.document.querySelectorAll("#pro-race-body tbody tr"));
check(rows.length >= 3, `② 표가 그려진다 (${rows.length}줄)`);
rows.slice(0,4).forEach(r=>console.log("   "+r.textContent.replace(/\s+/g," ").trim()));
const note = (w.document.querySelector("#pro-race-body .race-note")||{}).textContent || "";
check(/실력 순/.test(note), `⑤ 실력 순이라고 적는다 (${note})`);
const crowns = (body.match(/<td class="rc-v">👑/g)||[]).length;
check(crowns === 0, `④ 👑이 안 붙는다 (${crowns}개)`);
/* ⑤ 실력 순 — 표의 실력이 내림차순인가. 이름 옆 클래스가 아니라 순위 계산을 본다. */
const rk = w.WingerCareer._t.raceRank("g");
const pops = rk.slice(0, 8).map((x) => x.pop || 0);
check(pops.every((v, i2) => i2 === 0 || v <= pops[i2 - 1] + 1e-9),
  `⑤ 실력 내림차순으로 세운다 (${pops.map((v) => Math.round(v)).join(" ≥ ")})`);
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
try{w.close()}catch(e){}
process.exit(fail ? 1 : 0);
