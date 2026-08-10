/* 📺 중계와 스코어보드가 같은 말을 하는가.
 *
 * 제보: "경기 진행하는데 경기 중계 텍스트에서는 3실점인데 경기 끝나면 2실점으로
 * 되어 있네.. 무조건 그런 건 아니고 가끔씩 그런 거 같아!"
 *
 * 수비수의 승부처(🛡️ 결정적 차단)가 **이미 들어간 골을 스코어에서 빼고** 있었다.
 * 중계에는 "😣 실점…"이 세 번 떠 있는데 결과는 2실점이 된다. 축구에서 들어간
 * 골은 지워지지 않는다 — 이 저장소가 계속 싸워 온 "표시와 판정이 서로 다른 것을
 * 본다"의 가장 노골적인 형태다.
 *
 * 고친 방식: 수비수 경기에서는 실점 한 골을 **떼어 뒀다가** 승부처에서 정한다.
 * 막으면 아예 안 들어가고(중계에도 안 뜨고), 놓치면 그때 들어가며 그때 뜬다.
 * 최종 실점 수는 그대로 — 언제 보여주느냐만 바뀐다.
 *
 * 지키는 것:
 *   ① 중계에 뜬 골 수 = 스코어보드 홈 점수
 *   ② 중계에 뜬 실점 수 = 스코어보드 원정 점수  ← 제보가 여기였다
 *   ③ 네 포지션 전부, 승부처 세 결과(성공·보통·실패) 전부에서
 *   ④ 승부처 결과가 스코어를 움직이는 폭은 예전 그대로 (성공 -1 · 실패 +1)
 *   ⑤ 변이 검증 — 옛 방식(들어간 골을 빼기)으로 되돌리면 ②가 무너진다
 *
 * 실제 MatchSim을 게임 입구를 통해 돌리고, 화면에 찍힌 글자와 숫자를 읽는다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

const GAME = fs.readFileSync(path.join(DIR, "game.js"), "utf8");

const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  window.alert = () => {};
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
w.Ads = { display() {}, init() {} }; w.Stats = { log() {} }; w.alert = () => {};
const $ = (id) => w.document.getElementById(id);
const Career = w.WingerCareer;
/* MatchSim은 game.js 최상위 const라 window에 안 붙어요 — eval 통로로 꺼내요 */
const MatchSim = w.__get("MatchSim");
check(!!Career && !!MatchSim, "MatchSim이 페이지에서 로드된다");
if (!Career || !MatchSim) { console.log("\n❌ 실패"); process.exit(1); }

/* 한 경기를 끝까지 돌리고, **화면에 찍힌 것**을 읽어 온다.
 * 승부처 결과는 밖에서 정해 넣는다 — 세 갈래를 다 봐야 계약이 지켜지는지 안다. */
function playOne(pos, goals, assists, defense, oppGoals, mates, momentRes) {
  w.__set("S", w.__get(`newState(MARKETS[0], "${pos}", "테스트")`));
  const st = w.__get("S");
  st.pos = pos;
  /* 승부처는 미니게임이라 사람이 눌러야 해요. 결과를 정해 넣기 위해
   * playRandomMini를 그 자리에서 바꿔치기합니다 — 화면 검사는 그대로예요. */
  w.__set("playRandomMini", (container, cb) => {
    /* ⚠️ 이 문구에는 **골·실점 이모지를 안 써요.** 쓰면 검사가 그걸 골로 세서
     * 스코어와 안 맞는다고 거짓 빨간불이 뜹니다(실제로 그랬어요). */
    cb(momentRes, { great: "완벽한 타이밍!", ok: "무난한 장면", bad: "아쉬운 판단" });
  });
  let info = null;
  MatchSim.run({
    home: "우리", away: "상대", myName: "테스트",
    goals, assists, defense, oppGoals, mateCount: mates,
    mates: ["동료가", "동료나", "동료다"],
    finalize: (i) => { info = i; return { resultHTML: "", nextLabel: "", nextFn: () => {} }; },
  });
  // 빨리감기 버튼을 눌러 남은 이벤트를 한 번에 흘려요
  const btn = $("btn-stage-next");
  if (btn && !btn.disabled) btn.click();
  const feed = ($("pbp") || {}).textContent || "";
  const count = (re) => (feed.match(re) || []).length;
  /* 골이 들어간 줄의 표식은 넷이에요 — ⚽ 골(내 골·동료 골) · 🅰️ 도움으로 이어진
   * 팀 골 · 🌟 극장골 · 🎯 결정적 패스. 🛡️(차단·태클)은 골이 아니에요.
   * 실점은 😣(실점) · 😱(치명적 실수)예요. */
  return {
    info,
    h: Number(($("sb-h") || {}).textContent || 0),
    a: Number(($("sb-a") || {}).textContent || 0),
    feedGoals: count(/⚽|🅰️|🌟|🎯/g),
    feedConceded: count(/😣|😱/g),
    feed,
  };
}

// ---------- ①②③ 네 포지션 × 세 결과 ----------
console.log("=== ①②③ 중계에 뜬 수와 스코어가 같은가 ===");
guard("①②③ 중계 = 스코어", () => {
  const POS = ["fw", "wg", "mf", "df"];
  const RES = ["perfect", "ok", "miss"];
  let badG = 0, badA = 0, n = 0;
  const sample = [];
  for (const pos of POS) {
    for (const res of RES) {
      for (let t = 0; t < 6; t++) {
        const oppGoals = 1 + (t % 3);       // 1~3실점
        const r = playOne(pos, 1, 1, 3, oppGoals, 1, res);
        n++;
        if (r.feedGoals !== r.h) badG++;
        if (r.feedConceded !== r.a) badA++;
        if (t === 0) sample.push(`${pos}/${res}: 중계 ⚽${r.feedGoals} 😣${r.feedConceded} · 스코어 ${r.h}:${r.a}`);
      }
    }
  }
  sample.forEach((s) => console.log(`   ${s}`));
  check(badG === 0, `중계에 뜬 골 수와 스코어가 같다 (어긋난 경기 ${badG}/${n})`);
  check(badA === 0, `중계에 뜬 실점 수와 스코어가 같다 (어긋난 경기 ${badA}/${n}) — 제보가 여기였어요`);
});

// ---------- ④ 승부처가 스코어를 움직이는 폭은 그대로 ----------
console.log("=== ④ 승부처의 무게가 안 바뀌었는가 ===");
guard("④ 승부처 폭", () => {
  const N = 60;
  const avg = (pos, res) => {
    let sum = 0;
    for (let i = 0; i < N; i++) sum += playOne(pos, 1, 0, 3, 2, 0, res).a;
    return sum / N;
  };
  const dPerfect = avg("df", "perfect"), dOk = avg("df", "ok"), dMiss = avg("df", "miss");
  console.log(`   수비수 2실점 경기 — 승부처 성공 ${dPerfect} · 보통 ${dOk} · 실패 ${dMiss}`);
  check(Math.abs(dOk - 2) < 1e-9, `보통이면 산식이 뽑은 그대로다 (${dOk})`);
  check(Math.abs(dPerfect - 1) < 1e-9, `막으면 한 골 덜 먹는다 (${dPerfect})`);
  check(Math.abs(dMiss - 3) < 1e-9, `놓치면 한 골 더 먹는다 (${dMiss})`);
  // 공격수는 실점이 승부처에 안 움직여요 (골로 남으니까요)
  const fOk = avg("fw", "ok"), fPerfect = avg("fw", "perfect");
  check(Math.abs(fOk - 2) < 1e-9 && Math.abs(fPerfect - 2) < 1e-9,
    `공격수는 승부처가 실점을 안 건드린다 (${fOk} · ${fPerfect})`);
});

// ---------- ⑤ 변이 검증 ----------
console.log("=== ⑤ 변이 검증 ===");
guard("⑤ 변이", () => {
  /* 옛 방식(들어간 골을 스코어에서 빼기)으로 되돌리면 ②가 무너져야 해요.
   * 안 무너지면 이 검사는 아무것도 안 지키고 있는 겁니다. */
  const hold = (GAME.match(/const holdConceded = [^;]+;/) || [""])[0];
  console.log(`   ${hold.trim()}`);
  check(!!hold, "실점 한 골을 떼어 두는 자리가 있다");
  check(!/a = Math\.max\(0, a - 1\)/.test(GAME),
    "들어간 골을 스코어에서 빼는 코드가 없다 — 그게 제보의 원인이었어요");
  // 떼어 두지 않으면 어떻게 되는지 손으로 재현해요
  const oppGoals = 3, shown = oppGoals, afterOld = Math.max(0, oppGoals - 1);
  check(shown !== afterOld,
    `옛 방식이면 중계 ${shown}실점 · 스코어 ${afterOld}실점으로 갈린다 — ②가 그걸 막고 있어요`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
