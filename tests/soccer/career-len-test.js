/* 🎂 선수 생애 주기 — 커리어 길이와 성장·노쇠 구간이 서로 맞물려 있는가.
 *
 * 제보: "10시즌이 마지막 시즌인데 너무 짧지 않나??"
 * 실제 축구 선수는 열여덟에 데뷔해 서른셋쯤 그만둬요. 15시즌으로 늘렸습니다.
 *
 * 늘릴 때 제일 쉬운 실수가 **시즌 수만 늘리는 것**이에요. 노쇠 시작을 그대로 두면
 * 8년차부터 8시즌이 내리막이라 커리어의 절반이 하강 곡선이 됩니다.
 * 그래서 성장·전성기·노쇠를 같은 비율로 늘렸고, 이 파일이 그 비율을 지켜요.
 *
 * 지키는 것:
 *   ① 마지막 시즌 결산에는 '다음 시즌 시작' 버튼이 없다 (그전 시즌에는 있다)
 *   ② 구간 순서가 성립한다 — 성장 끝 < 노쇠 시작 < 마지막 시즌
 *   ③ 노쇠 구간이 커리어의 절반을 넘지 않는다
 *   ④ 연말 평가 벌점(agePen)은 노쇠 전에는 0이고, 노쇠 뒤로는 시즌마다 커진다
 *   ⑤ 능력치는 성장 구간에서 오르고 노쇠 구간에서 깎인다 — 소스의 그 줄을 굴려서
 *   ⑥ 훈련 효율(yearMod)이 나이를 따라 내려간다
 *   ⑦ 변이 검증 — 노쇠 시작을 옛 값(8)으로 되돌리면 ③이 무너진다
 *
 * 산식은 전부 소스에서 정규식으로 뽑아 new Function으로 굴린다. 직접 eval은 안 쓴다.
 * ①은 결산 화면을 실제로 띄워서 버튼을 센다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");

const parts = {
  careerMax: grab(SRC, /const CAREER_MAX = [^;]+;/),
  growUntil: grab(SRC, /const GROW_UNTIL = [^;]+;/),
  declineFrom: grab(SRC, /const DECLINE_FROM = [^;]+;/),
  agePen: grab(SRC, /const agePen = [^;]+;/),
  yearMod: grab(SRC, /const yearMod = [^;]+;/),
  // 시즌 끝 성장·노쇠 두 줄 — for 루프 안의 본문을 통째로 떼어 와요
  growLine: grab(SRC, /if \(S\.proYear <= GROW_UNTIL\)[\s\S]*?statCap\(d\.key\)\);\n {6}else if[\s\S]*?statCap\(d\.key\)\);/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const C = new Function(`${parts.careerMax}\n${parts.growUntil}\n${parts.declineFrom}
  return { CAREER_MAX, GROW_UNTIL, DECLINE_FROM };`)();
console.log(`=== 구간 — 성장 ~${C.GROW_UNTIL}시즌 · 노쇠 ${C.DECLINE_FROM}시즌~ · 마지막 ${C.CAREER_MAX}시즌 ===`);

// ---------- ② 구간 순서 ----------
guard("② 구간 순서", () => {
  check(C.GROW_UNTIL < C.DECLINE_FROM && C.DECLINE_FROM <= C.CAREER_MAX,
    `성장 끝(${C.GROW_UNTIL}) < 노쇠 시작(${C.DECLINE_FROM}) ≤ 마지막(${C.CAREER_MAX})`);
  check(C.CAREER_MAX >= 12,
    `커리어가 12시즌 이상이다 (${C.CAREER_MAX}) — 실제 선수의 데뷔~은퇴에 가까워요`);
});

// ---------- ③ 노쇠 구간이 절반을 안 넘는다 ----------
guard("③ 노쇠 비중", () => {
  const declineSeasons = C.CAREER_MAX - C.DECLINE_FROM + 1;
  const ratio = declineSeasons / C.CAREER_MAX;
  console.log(`   노쇠 구간 ${declineSeasons}/${C.CAREER_MAX}시즌 (${Math.round(ratio * 100)}%)`);
  check(ratio <= 0.5,
    `내리막이 커리어의 절반을 넘지 않는다 (${declineSeasons}/${C.CAREER_MAX} = ${Math.round(ratio * 100)}%)`);
  check(declineSeasons >= 2, `내리막이 최소 2시즌은 있다 (${declineSeasons}) — 노장의 시간이 없으면 안 돼요`);
});

// ---------- ④ agePen ----------
guard("④ 연말 벌점", () => {
  const penOf = new Function("S", `${parts.declineFrom}\n${parts.agePen}\nreturn agePen;`);
  const before = [];
  for (let y = 1; y < C.DECLINE_FROM; y++) before.push(penOf({ proYear: y }));
  check(before.every((p) => p === 0), `노쇠 전에는 벌점이 0이다 (1~${C.DECLINE_FROM - 1}시즌)`);
  const after = [];
  for (let y = C.DECLINE_FROM; y <= C.CAREER_MAX; y++) after.push(penOf({ proYear: y }));
  console.log(`   ${C.DECLINE_FROM}~${C.CAREER_MAX}시즌 벌점 — ${after.map((p) => p.toFixed(1)).join(" · ")}`);
  check(after[0] > 0, `노쇠가 시작되는 시즌부터 벌점이 붙는다 (+${after[0].toFixed(1)})`);
  check(after.every((p, i) => i === 0 || p > after[i - 1]), "벌점이 시즌마다 커진다");
});

// ---------- ⑤ 능력치 성장·노쇠 ----------
guard("⑤ 능력치 곡선", () => {
  const step = new Function("S", "d", "clamp", "rand", "statCap", `
    ${parts.growUntil}\n${parts.declineFrom}\n${parts.growLine}\n return S.stats[d.key];`);
  const run = (y, n) => {
    let up = 0, down = 0;
    for (let i = 0; i < n; i++) {
      const S = { proYear: y, stats: { shoot: 60 }, talents: { shoot: 1.3 } };
      const v = step(S, { key: "shoot" }, clamp, rand, () => 130);
      if (v > 60) up++; else if (v < 60) down++;
    }
    return { up, down };
  };
  const grow = run(C.GROW_UNTIL, 200);
  const mid = run(Math.floor((C.GROW_UNTIL + C.DECLINE_FROM) / 2), 200);
  const old = run(C.DECLINE_FROM, 200);
  console.log(`   성장기(${C.GROW_UNTIL}) +${grow.up}/-${grow.down} · 전성기 +${mid.up}/-${mid.down} · 노쇠기(${C.DECLINE_FROM}) +${old.up}/-${old.down}`);
  check(grow.up > 150 && grow.down === 0, `성장 구간에서는 능력치가 오른다 (+${grow.up}회 · -${grow.down}회)`);
  check(mid.up === 0 && mid.down === 0, "전성기에는 저절로 오르지도 깎이지도 않는다 — 훈련으로만 움직여요");
  check(old.down === 200 && old.up === 0, `노쇠 구간에서는 능력치가 깎인다 (-${old.down}회)`);
});

// ---------- ⑥ 훈련 효율 ----------
guard("⑥ 훈련 효율", () => {
  const modOf = new Function("S", `${parts.yearMod}\nreturn yearMod;`);
  const vals = [];
  for (let y = 1; y <= C.CAREER_MAX; y++) vals.push(modOf({ proYear: y }));
  console.log(`   1~${C.CAREER_MAX}시즌 훈련 효율 — ${vals.join(" ")}`);
  check(vals.every((v, i) => i === 0 || v <= vals[i - 1]), "훈련 효율이 나이를 거슬러 오르지 않는다");
  check(vals[0] > vals[vals.length - 1],
    `마지막 시즌의 훈련 효율이 첫 시즌보다 낮다 (${vals[0]} → ${vals[vals.length - 1]})`);
  check(new Set(vals).size >= 3, `구간이 최소 셋이다 (${new Set(vals).size}단계)`);
});

// ---------- ⑦ 변이 검증 ----------
guard("⑦ 변이 검증", () => {
  const oldDecline = 8;
  const ratio = (C.CAREER_MAX - oldDecline + 1) / C.CAREER_MAX;
  console.log(`   노쇠 시작을 옛 값 ${oldDecline}로 두면 내리막 ${C.CAREER_MAX - oldDecline + 1}/${C.CAREER_MAX}시즌 (${Math.round(ratio * 100)}%)`);
  check(ratio > 0.5,
    `시즌만 늘리고 노쇠 시작을 안 옮기면 ③이 무너진다 (${Math.round(ratio * 100)}%) — 그래서 함께 옮겼어요`);
});

// ---------- ① 마지막 시즌 결산에는 '다음 시즌' 버튼이 없다 ----------
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
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
const $ = (id) => w.document.getElementById(id);
const Career = w.WingerCareer;
check(!!Career && !!Career._t, "WingerCareer 모듈이 페이지에서 로드된다");
if (!Career || !Career._t) { console.log("\n❌ 실패"); process.exit(1); }

guard("① 마지막 시즌 결산", () => {
  w.__set("S", w.__get('newState(MARKETS[0], "fw", "테스트")'));
  Career.onEnding(true, false);
  $("btn-go-debut").click();
  const BASE = JSON.parse(JSON.stringify(Career._t.state()));

  const openAt = (year) => {
    const st = JSON.parse(JSON.stringify(BASE));
    st.proYear = year;
    st.camp = 0; st.activity = null; st.pendingShow = false;
    st.career.years = [{
      y: year, hype: 5, wins: 0, sales: 0, dFan: 0, awards: [],
      goals: 0, assists: 0, defense: 0, apps: 30, avg: 6.5,
    }];
    w.__set("S", st);
    Career.showActivity();
    const btns = Array.from(w.document.querySelectorAll("#career-actions .btn")).map((b) => b.textContent);
    return { btns, card: $("career-card").textContent.replace(/\s+/g, " ") };
  };

  const beforeLast = openAt(C.CAREER_MAX - 1);
  check(beforeLast.btns.some((t) => t.includes("시즌 시작")),
    `${C.CAREER_MAX - 1}시즌 결산에는 '다음 시즌 시작' 버튼이 있다 (${beforeLast.btns.join(" / ")})`);
  check(beforeLast.btns.some((t) => t.includes("은퇴")), "그 화면에도 은퇴는 언제나 열려 있다");
  check(beforeLast.card.includes("전성기가 지났"),
    `노쇠 구간에서는 몸이 예전 같지 않다고 알려준다 (${beforeLast.card.slice(-70)})`);

  const last = openAt(C.CAREER_MAX);
  check(!last.btns.some((t) => t.includes("시즌 시작")),
    `${C.CAREER_MAX}시즌 결산에는 '다음 시즌 시작' 버튼이 없다 (${last.btns.join(" / ")})`);
  check(last.btns.some((t) => t.includes("은퇴")), "마지막 시즌 결산에는 은퇴만 남는다");
  check(last.card.includes("은퇴"), "마지막 시즌이라는 걸 문구로도 알려준다");

  // 옛 마지막 시즌(10)에서는 아직 다음 시즌이 남아 있어야 해요 — 늘린 게 실제로 먹혔는가
  const old = openAt(10);
  check(C.CAREER_MAX <= 10 || old.btns.some((t) => t.includes("시즌 시작")),
    `옛 마지막 시즌(10)에서는 아직 다음 시즌이 남아 있다 (${old.btns.join(" / ")})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
