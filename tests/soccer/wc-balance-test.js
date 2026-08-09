/* 🌏 월드컵 밸런스 — 실력이 성적을 움직이는가, 유스 국적이 벽이 되지 않는가.
 *
 * 처음 만들었을 때 두 가지가 어긋나 있었다(대회 6,000판 실측).
 *   ① **실력이 성적을 거의 못 움직였다** — 종합 80 → 140에서 우승률 4% → 12%.
 *      같은 구간에서 리그MVP는 3% → 85%다. 내 골은 GOAL_SCALE 때문에 작은데
 *      국가 전력 차가 크게 실려서, 대회가 "어느 나라 유스를 골랐나" 게임이었다.
 *   ② **국가가 벽이었다** — 종합 100에서 🇧🇷 브라질 18% · 🇰🇷 한국 5%로 3.6배.
 *
 * 손잡이 둘로 잡았다 — 국가 전력을 평균 쪽으로 좁히고(NAT_SPREAD),
 * 내 종합을 대표팀 전력에 얹었다(에이스 보정). 이 파일이 그 결과를 지킨다.
 *
 * ⚠️ 이 검사는 산식을 **소스에서 뽑아** 굴린다(값을 옮겨 적지 않는다). 대신 대회
 * 진행(조별 → 4강 → 결승)은 여기서 다시 짠다 — 화면 없이 수만 판을 굴려야 해서다.
 * 그래서 worldcup.js의 진행 규칙이 바뀌면 **여기도 같이 고쳐야 한다.**
 * 진행이 실제로 도는지는 worldcup-test.js가 실제 버튼으로 본다. 둘이 한 짝이다.
 */
"use strict";
/* 🌏 월드컵 밸런스 실측 — 종합·국가별 성적 분포 (밸런스 계획 #3·#4·#5)
 * 산식은 전부 소스에서 뽑아 씁니다 — 값을 여기 옮겨 적으면 소스를 바꿔도 안 따라와요. */
const fs=require("fs");
const D="/workspace/grow-games/beta/soccer";
const GAME=fs.readFileSync(D+"/game.js","utf8"), CAR=fs.readFileSync(D+"/career.js","utf8"), WC=fs.readFileSync(D+"/worldcup.js","utf8");
const grab=(s,re,w)=>{const m=s.match(re); if(!m){console.log("❌ 못 찾음:",w);process.exit(1);} return m[0];};
const P={
  goalScale: grab(GAME,/const GOAL_SCALE = [^;]+;/,"GOAL_SCALE"),
  poisson:   grab(GAME,/function poissonish\(lam\) \{[\s\S]*?\n\}/,"poissonish"),
  tmGoals:   grab(GAME,/const TEAMMATE_GOALS = \{[\s\S]*?\};/,"TEAMMATE_GOALS"),
  mate:      grab(GAME,/const MATE_SCALE = [\s\S]*?function teammateGoals\([^)]*\) \{[\s\S]*?\n\}/,"teammateGoals"),
  conc:      grab(GAME,/const CONC_BASE = [\s\S]*?function deriveOppGoals\([^)]*\) \{[\s\S]*?\n\}/,"deriveOppGoals"),
  contrib:   grab(GAME,/function matchContribution\(rating\) \{[\s\S]*?\n\}/,"matchContribution"),

  posInfo:   grab(GAME,/const POS_INFO = \{[\s\S]*?\n\};/,"POS_INFO"),
  statKeys:  grab(GAME,/const STAT_KEYS = \[[^\]]*\];/,"STAT_KEYS"),
  buffFns:   grab(GAME,/const HOT_FORM_BAR = [\s\S]*?const buffMul = [^;]+;/,"buffFns"),
  clutchScale: grab(GAME,/const CLUTCH_SCALE = [^;]+;/,"CLUTCH_SCALE"),
  transLv:   grab(GAME,/const transLv = [^;]+;/,"transLv"),
  clutch:    grab(GAME,/function clutch\(key\) \{[\s\S]*?\n\}/,"clutch"),
  fanCap:    grab(CAR,/const FAN_CAP = [^;]+;/,"FAN_CAP"),
  ratingDiv: grab(CAR,/const RATING_DIV = [^;]+;/,"RATING_DIV"),
  ratingOf:  grab(CAR,/function ratingOf\([^)]*\) \{[\s\S]*?\n {2}\}/,"ratingOf"),
  nations:   grab(WC,/const NATIONS = \[[\s\S]*?\n {2}\];/,"NATIONS"),
  groupN:    grab(WC,/const GROUP_N = [^;]+;/,"GROUP_N"),
  groupG:    grab(WC,/const GROUP_GAMES = [^;]+;/,"GROUP_GAMES"),
  rivals:    grab(WC,/function rollGroupRivals\(info\) \{[\s\S]*?\n {2}\}/,"rollGroupRivals"),
  natG:      grab(WC,/const NAT_G0 = [^;]+;/,"NAT_G0·NAT_GK"),
  scoreW:    grab(WC,/const SCORE_W = \{[^}]*\};/,"SCORE_W"),
  aceW:      grab(WC,/const ACE_W = [^;]+;/,"ACE_W"),
  formation: grab(fs.readFileSync(D+"/squad.js","utf8"),/const FORMATION = \{[^}]*\};/,"FORMATION"),
};
const F=new Function("OVR","POS","NAT_C","seedShuffle","K","ACE",`
  const S = { pos: POS, stats: {}, condition: 75, fandom: 300, talents: {}, trans: {}, buffs: [], buffY: -1, proYear: 7 };
  ${P.statKeys}
  for (const k of STAT_KEYS) { S.stats[k] = OVR; S.talents[k] = 1.1; }
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const clubStrOf=()=>70;
  ${P.goalScale} ${P.poisson} ${P.tmGoals} ${P.mate} ${P.conc}
  ${P.contrib} ${P.posInfo} ${P.clutchScale} ${P.transLv} ${P.clutch}
  ${P.buffFns} ${P.fanCap} ${P.ratingDiv} ${P.ratingOf}
  ${P.nations} ${P.groupN} ${P.groupG} ${P.natG} ${P.scoreW} ${P.aceW} ${P.formation}
  /* 국가 전력을 평균 쪽으로 K만큼 좁혀 봐요 (K=1이면 지금 그대로) */
  const MEAN = NATIONS.reduce((a,n)=>a+n.str,0)/NATIONS.length;
  for (const n of NATIONS) n.str = MEAN + (n.str - MEAN) * K;
  const me = NATIONS.find(n=>n.c===NAT_C);
  /* 🌟 에이스 보정 — 내 종합이 대표팀 전력에 얹혀요. 실제로 에이스 한 명이
   * 팀을 끌어올리는 게 축구고, 이 게임은 "내가 주인공"이에요. */
  const teamStr = me.str + (ACE ? clamp((OVR - 90) / ACE, -6, 8) : 0);

  function match(oppStr){
    const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom, 0);
    const c = matchContribution(rating);
    const mates = teammateGoals(rating, oppStr, teamStr);
    const tg = c.g + mates;
    const og = deriveOppGoals(rating, S.stats.defense, oppStr, c.g + c.a + mates, teamStr);
    return { tg, og, myG: c.g, res: tg>og?"W":tg<og?"L":"D" };
  }
  function tournament(){
    const pool = seedShuffle(NATIONS.filter(n=>n.c!==me.c));
    const myGroup = [{name:me.name,str:me.str,me:true,pts:0,gd:0}]
      .concat(pool.slice(0,GROUP_N-1).map(n=>({name:n.name,str:n.str,pts:0,gd:0})));
    const others = pool.slice(GROUP_N-1,7).map(n=>({name:n.name,str:n.str}));
    let myG=0, apps=0;
    /* 🥇 다른 나라는 **선발 11명**에게 골을 나눠 가져요 — 실제 구현과 같은 눈금이에요.
     * 순위표에 오르는 건 그중 최다 득점자라, 여기서도 최댓값을 봅니다. */
    const slots = [];
    for (const p0 of Object.keys(FORMATION)) for (let i=0;i<FORMATION[p0];i++) slots.push(p0);
    const wOf = (p0) => SCORE_W[p0] || 0.4;

    const nats = myGroup.concat(others).filter(t=>t.name!==me.name)
      .map(t=>{ const sq=slots.map(p0=>({w:wOf(p0), g:0}));
        /* 🌟 나라마다 에이스 한 명 — 실제 구현과 같은 눈금이에요 */
        const ace=sq.filter((_,i)=>slots[i]==="fw")[0]||sq[0]; if(ace) ace.w*=ACE_W;
        return {str:t.str, nat:t.name, out:false, sq}; });
    const rollFaces = () => { for(const n of nats){ if(n.out) continue;
      const G = poissonish(Math.max(0.1, NAT_G0 + (n.str - 74) * NAT_GK) * GOAL_SCALE * 3);
      const tw = n.sq.reduce((a,pl)=>a+pl.w,0);
      for(let i=0;i<G;i++){ let r=Math.random()*tw;
        for(const pl of n.sq){ r-=pl.w; if(r<=0){ pl.g++; break; } } } } };
    const topG = () => Math.max(0, ...nats.map(n=>Math.max(0, ...n.sq.map(pl=>pl.g))));
    for(let g=0; g<GROUP_GAMES; g++){
      const rivals = myGroup.filter(x=>!x.me);
      const opp = rivals[g % rivals.length];
      const r = match(opp.str); apps++; myG += r.myG; rollFaces();
      const meRow = myGroup.find(x=>x.me);
      meRow.pts += r.res==="W"?3:r.res==="D"?1:0;
      meRow.gd  += r.tg - r.og;
      const info = { res:r.res, teamGoals:r.tg, oppGoals:r.og };
      const wc = () => ({ myGroup, opp: opp.name });
      ${P.rivals.replace('function rollGroupRivals(info) {','(function(info){').replace(/\n {2}\}$/,'})(info);')}
    }
    // 조별 종료 — 떨어진 나라의 얼굴은 멈춰요
    {
      const up=new Set();
      myGroup.slice().sort((a,b)=>(b.pts-a.pts)||(b.gd-a.gd)).slice(0,2).forEach(t=>up.add(t.name));
      others.slice().sort((a,b)=>b.str-a.str).slice(0,2).forEach(t=>up.add(t.name));
      for(const n of nats) if(!up.has(n.nat)) n.out = true;
    }
    const boot = () => myG >= topG();
    const rank = myGroup.slice().sort((a,b)=>(b.pts-a.pts)||(b.gd-a.gd)).findIndex(x=>x.me)+1;
    if(rank>2) return {result:"group", myG, apps, boot: boot()};
    const pool2 = others.slice().sort((a,b)=>b.str-a.str);
    const semiOpp = pool2[1]||pool2[0];
    let r = match(semiOpp.str); apps++; myG += r.myG; rollFaces();
    if(r.res==="D") r.res = Math.random()<0.5?"W":"L";
    if(r.res!=="W") return {result:"semi", myG, apps, boot: boot()};
    const finOpp = pool2[0];
    let fm = match(finOpp.str); apps++; myG += fm.myG; rollFaces();
    if(fm.res==="D") fm.res = Math.random()<0.5?"W":"L";
    return {result: fm.res==="W"?"champion":"final", myG, apps, boot: boot()};
  }
  return tournament;
`);
const shuffle=(a)=>{const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

/* 손잡이는 소스에서 읽어요 — 여기 0.35·4를 적어 두면 소스를 바꿔도 안 잡혀요 */
const num = (re, w) => Number(grab(WC, re, w).match(/=\s*([\d.]+)/)[1]);
const K = num(/const NAT_SPREAD = [^;]+;/, "NAT_SPREAD");
const ACE = num(/const ACE_DIV = [^,;]+/, "ACE_DIV");
const N = Number(process.argv[2] || 6000);
console.log(`   국가 전력 압축 ${K} · 에이스 나눗값 ${ACE}`);
const NATS=[["kr","🇰🇷 한국(최약체급)"],["br","🇧🇷 브라질(최강체급)"]];
console.log(`\n=== 대회 ${N.toLocaleString()}판 × 칸 (공격수) ===`);
console.log("국가                    종합 |  우승 |  결승 |  4강 | 조별탈락 | 평균골 | 🥇득점왕");
const win = {};
for (const [c, label] of NATS) {
  win[c] = {};
  for (const ovr of [80, 100, 120, 140]) {
    const run = F(ovr, "fw", c, shuffle, K, ACE);
    const cnt = { champion: 0, final: 0, semi: 0, group: 0 }; let g = 0, boot = 0;
    for (let i = 0; i < N; i++) { const r = run(); cnt[r.result]++; g += r.myG; if (r.boot) boot++; }
    win[c][ovr + "_boot"] = boot / N;
    win[c][ovr] = cnt.champion / N;
    win[c][ovr + "_group"] = cnt.group / N;
    const p = (k) => `${(cnt[k] / N * 100).toFixed(0)}%`.padStart(5);
    console.log(`${label.padEnd(24)}${String(ovr).padStart(4)} | ${p("champion")} | ${p("final")} | ${p("semi")} | ${p("group").padStart(7)} | ${(g / N).toFixed(1)} | ${`${Math.round(boot / N * 100)}%`.padStart(6)}`);
  }
}
const pct = (v) => `${Math.round(v * 100)}%`;

/* ① 실력이 성적을 크게 움직이는가 — 여기가 막히면 훈련할 이유가 없어요 */
for (const [c, label] of NATS) {
  const lo = win[c][80], hi = win[c][140];
  check(hi > lo * 3,
    `${label}: 종합 80 → 140에서 우승률이 3배 넘게 오른다 (${pct(lo)} → ${pct(hi)})`);
  check(win[c][100] < win[c][120] && win[c][120] < win[c][140],
    `${label}: 우승률이 종합 순서대로 오른다 (${pct(win[c][100])} < ${pct(win[c][120])} < ${pct(win[c][140])})`);
}

/* ② 유스 국적이 벽이 아닌가 — 유불리는 되되 사형선고는 아니게 */
for (const ovr of [80, 100, 120, 140]) {
  const a = win.br[ovr], b = win.kr[ovr];
  const ratio = b > 0 ? a / b : 99;
  /* 종합 80은 양쪽 다 우승이 4~8%라 표본 흔들림이 커요(같은 판수로 재도 ±1%p면
   * 비율이 0.4배씩 움직입니다). 거기만 느슨하게 보고, 실제로 사람이 오래 머무는
   * 구간(100 이상)에서 2배 계약을 지킵니다. */
  const bar = ovr <= 80 ? 3.0 : 2.0;
  check(ratio <= bar,
    `종합 ${ovr}: 최강 국가와 최약 국가의 우승률 차가 ${bar}배 이내다 (${ratio.toFixed(1)}배 — ${pct(a)} vs ${pct(b)})`);
}

/* ②-b 🥇 득점왕 — 8명 중 하나라 운만으로는 12.5%예요.
 * 실력이 그 위로 끌어올려야 "대회 득점왕"이 업적이 됩니다. */
for (const [c, label] of NATS) {
  const b0 = win[c]["80_boot"], b1 = win[c]["120_boot"], b2 = win[c]["140_boot"];
  check(b0 < b1 && b1 < b2, `${label}: 득점왕 확률이 종합 순서대로 오른다 (${pct(b0)} < ${pct(b1)} < ${pct(b2)})`);
  check(b0 <= 0.2, `${label}: 종합 80으로는 득점왕이 어렵다 (${pct(b0)}) — 8명 중 하나라 운만으로 12.5%예요`);
  check(b2 >= 0.3, `${label}: 종합 140이면 절반쯤 가져간다 (${pct(b2)}) — 주인공이 최고일 때는 최고여야 해요`);
  check(b2 <= 0.75, `${label}: 그래도 확정은 아니다 (${pct(b2)})`);
}

/* ③ 천장과 바닥 — 승부차기 운이 있어 아무리 세도 확정은 없고,
 *    아무리 약해도 조별에서 늘 죽지는 않아요 */
check(win.br[140] <= 0.7, `아무리 세도 우승이 확정은 아니다 (최강 조합 ${pct(win.br[140])} ≤ 70%)`);
check(win.kr[80] <= 0.12, `종합 80은 우승이 드물다 (${pct(win.kr[80])})`);
check(win.kr[80 + "_group"] < 0.85, `종합 80도 조별을 뚫을 때가 있다 (탈락 ${pct(win.kr["80_group"])})`);

/* ④ 커리어 눈금 — 대회는 커리어당 3~4번뿐이라 한 판 확률만 보면 안 돼요 */
const career = (p) => 1 - Math.pow(1 - p, 4);
for (const [c, label] of NATS) {
  console.log(`   ${label} 커리어(4번) 안에 한 번은 우승할 확률 — `
    + [100, 120, 140].map((o) => `종합 ${o} ${pct(career(win[c][o]))}`).join(" · "));
}
check(career(win.kr[120]) > 0.4,
  `종합 120이면 커리어 4번 안에 한 번은 들 만하다 (${pct(career(win.kr[120]))})`);
check(career(win.kr[80]) < 0.4,
  `종합 80으로는 어렵다 (${pct(career(win.kr[80]))}) — 도달 목표여야 해요`);

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
