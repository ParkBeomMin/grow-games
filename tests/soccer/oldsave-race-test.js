/* 🧯 이어하던 세이브를 열면 개인 순위가 제대로 채워지는가.
 *
 * 개인 순위가 "여덟 명"에서 **리그 전 선발**로 바뀌면서, 이미 시즌을 치르던
 * 세이브에는 그 기록이 없다. 읽는 쪽에서 이미 치른 라운드만큼 다시 굴려 메우는데,
 * **그 판정이 틀려 있었다.**
 *
 *   "명단이 비어 있으면 메운다"를 리그 전체로 봤다. 그런데 우리 팀 선발은
 *   markApps로 출전 수가 이미 쌓여 있어서 "비어 있지 않다"가 나온다 —
 *   그래서 다른 클럽 88명이 영원히 0으로 남았다.
 *   실제 세이브에서 **41경기를 치렀는데 기록 있는 사람이 우리 팀 14명뿐**이었다.
 *
 * 이 버그는 검사 51종을 전부 통과한 상태에서 났다. 손으로 확인 페이지 세이브를
 * 열어 보다 잡혔다 — 그래서 그 확인을 여기 검사로 남긴다.
 *
 * 지키는 것:
 *   ① 확인 페이지의 모든 축구 세이브가 열린다 (하네스가 헛돌지 않는다)
 *   ② 경기를 치른 세이브는 **리그 전체**에 기록이 있다 (우리 팀만이 아니라)
 *   ③ 우리 팀 동료의 출전 수가 두 배가 되지 않는다 (메우면서 또 돌리면 그렇게 된다)
 *   ④ 옛 act.race는 정리된다 — 같은 사람의 기록이 두 벌로 남으면 안 된다
 *
 * ⚠️ 세이브를 못 열면 **실패**로 친다. 처음에 슬롯 버튼 선택자를 잘못 써서
 * 22개가 전부 "건너뜀"이 됐는데, 그 상태로 "전부 정상"이 떴다 —
 * 아무것도 안 보고 초록불을 켠 셈이다.
 */
"use strict";
const fs=require("fs"),path=require("path");
const DIR="/workspace/grow-games/beta/soccer";
const {JSDOM}=require("/workspace/grow-games/tests/cloud/jsdom.js");
const FX=(()=>{const src=fs.readFileSync("/workspace/grow-games/beta/_fixtures.js","utf8");
  const m=src.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);return new Function("return "+m[1])();})();
const items=FX.items.filter(x=>x.game==="soccer"&&x.keys&&Object.keys(x.keys).some(k=>/winger-save/.test(k)));
let bad=0;
for(const it of items){
  const PRE=`window.fetch=()=>Promise.reject(new Error("off"));window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(0),0);window.scrollTo=()=>{};window.alert=()=>{};window.confirm=()=>false;`
    +Object.entries(it.keys).map(([k,v])=>`localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("");
  let html=fs.readFileSync(path.join(DIR,"index.html"),"utf8").replace(/<script src="([^"]+)"><\/script>/g,(m,src)=>{const p=path.resolve(DIR,src);return fs.existsSync(p)?`<script>\n${fs.readFileSync(p,"utf8")}\n</script>`:"";});
  html=html.replace("</head>",`<script>${PRE}</script></head>`).replace("</body>",`<script>window.__get=(n)=>eval(n);</script></body>`);
  let w;
  try{
    const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/soccer/"});
    w=dom.window;w.Ads={display(){},init(){}};w.Stats={log(){}};w.alert=()=>{};w.confirm=()=>false;
    const cont=w.document.getElementById("btn-continue");
    if(!cont||cont.classList.contains("hidden")){console.log(`   · ${it.id} — 이어하기 없음(건너뜀)`);w.close();continue;}
    cont.click();
    // 슬롯이 여럿이면 고르는 창이 떠요 — 실제 버튼(.slot-go)을 눌러요
    const go=w.document.querySelector(".slot-modal .slot-go");
    if(go)go.click();
    const S=w.__get("S");
    if(!S){console.log(`❌ ${it.id} — 세이브를 못 열었어요 (하네스 문제일 수 있어요)`);bad++;w.close();continue;}
    const T=w.WingerCareer._t;
    const hadRace=!!(S.activity&&S.activity.race);
    const apps=S.activity?(S.activity.apps||0):-1;
    if(S.activity) T.ensureLeagueRecords();
    const rank=S.activity?T.raceRank("g"):[];
    const stillRace=!!(S.activity&&S.activity.race);
    const withApps=rank.filter(r=>!r.me&&(r.apps||0)>0).length;
    const ok=!S.activity||(rank.length>1&&!stillRace);
    /* ③ 출전 수의 천장은 **치러진 라운드 수**예요.
     * 예전에는 "내 출전 수"를 천장으로 삼았는데, 🪑 벤치(보호 로테이션·선발 경쟁)가
     * 들어오면서 **동료가 나보다 많이 뛰는 게 정상**이 됐어요. 내 출전 수를 자로 쓰면
     * 정상인 세이브가 빨간불이 됩니다. 구현의 repairApps와 같은 자로 재요. */
    const act2=S.activity||{};
    const rounds=((act2.cb||1)-1)*19+(act2.week||0);
    const mates=(S.squads&&S.squads[S.group]||[]).filter(x=>!x.me);
    const overApps=rounds>0?mates.filter(x=>(x.apps||0)>rounds).length:0;
    /* ② **다른 클럽에도** 기록이 있어야 한다. "0명인가"만 보면 안 된다 —
     * 버그가 났을 때 우리 팀 14명은 기록이 있었고, 그래서 0이 아니었다.
     * 리그 전 선발의 대부분이 채워졌는지를 본다. */
    const otherXI=S.squads?Object.keys(S.squads).filter(c=>c!==S.group)
      .reduce((n,c)=>n+w.WingerSquad.startingXIOf(c).length,0):0;
    const otherRec=rank.filter(r=>!r.me&&r.club!==S.group&&(r.apps||0)>0).length;
    const bug=(apps>0&&(otherRec<otherXI*0.8))||overApps>0;
    console.log(`${bug?"❌":ok?"✅":"❌"} ${it.id.padEnd(22)} act ${apps<0?"없음(오프시즌)":apps+"경기"} · 옛 race ${hadRace?"있었음":"없음"} → 표 ${rank.length}줄 · 기록 ${withApps}명 (다른 클럽 ${otherRec}/${otherXI})${overApps?`  ← 동료 ${overApps}명의 출전 수가 치러진 라운드(${rounds})를 넘어요(두 번 셌어요)`:bug?"  ← 다른 클럽에 기록이 거의 없어요":""}`);
    if(bug)bad++;
    if(!ok)bad++;
    w.close();
  }catch(e){console.log(`❌ ${it.id} — ${e.message}`);bad++;if(w)try{w.close()}catch{}}
}
console.log(bad?`\n❌ ${bad}건 실패`:"\n✅ 통과");
process.exit(bad?1:0);
