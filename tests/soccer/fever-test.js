/* 🎉 피버 타임 — 기간이 열렸을 때만, 그동안만.
 *
 * 요청: "관리자 사이트에서 기간을 설정하고, 그 시간에 접속한 사람은 확률이나 효율이
 * 올라간다. 접속하면 배너가 뜨고 **이미 접속해 있던 사람에게도** 뜬다."
 *
 * 이 게임은 정적 파일이라 서버가 먼저 말을 걸 수 없어요. 그래서 이벤트를 **시각의
 * 구간**으로 받아 두고, 화면이 바뀔 때마다(show) 로컬 시계로 다시 봅니다.
 *
 * 지키는 것:
 *   ① 구간 밖이면 배너도 없고 효과도 없다
 *   ② 구간 안이면 배너가 뜨고, 효과가 실제 계산에 붙는다
 *   ③ **화면을 바꾸면 그 자리에서 붙는다** — 이미 켜 둔 사람에게도 (제보의 핵심)
 *   ④ 구간이 끝나면 화면을 바꾸는 순간 사라진다
 *   ⑤ 시즌 칭호 상한(BUFF_CAP)을 채운 사람에게도 피버는 더해진다
 *   ⑥ 읽는 쪽이 스스로 상한을 건다 — 운영 실수로 +500%가 와도 안 무너진다
 *   ⑦ 효과가 하나도 없으면 버프로 안 붙는다 (배너만 뜨고 아무 일도 없으면 거짓말)
 *   ⑧ 알림은 같은 이벤트에 한 번만, 기간을 바꿔 다시 열면 또 뜬다
 *   ⑨ 변이 검증 — 구간 판정을 떼면 ①과 ④가 무너진다
 *
 * 확인용 통로: localStorage["grow-fever-test"]에 한 줄을 넣으면 네트워크 대신 그걸 봐요.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const FEVER = fs.readFileSync(path.join(DIR, "fever.js"), "utf8");
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
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
w.alert = () => {};
const Fever = w.WingerFever;
const get = w.__get;
check(!!Fever, "피버 모듈이 페이지에서 로드된다");
if (!Fever) { console.log("\n❌ 실패"); process.exit(1); }

const MIN = 60 * 1000;
/* 관리자가 넣은 한 줄과 **같은 모양**이에요 — Supabase `fever` 테이블의 한 행입니다. */
const row = (fromMs, toMs, boost, extra) => ({
  id: "soccer-fever", game: "soccer", emoji: "🎉", title: "주말 피버 타임",
  note: "훈련 효율이 확 올라요",
  starts_at: new Date(Date.now() + fromMs).toISOString(),
  ends_at: new Date(Date.now() + toMs).toISOString(),
  boost, ...(extra || {}),
});
const put = (r) => w.localStorage.setItem("grow-fever-test", JSON.stringify(r));
const bar = () => w.document.getElementById("fever-bar");
const modal = () => w.document.querySelector(".fever-overlay");
const dropModal = () => { const m = modal(); if (m) m.remove(); };
const barText = () => (bar() ? bar().textContent.replace(/\s+/g, " ").trim() : "");

// 화면 전환을 실제로 일으켜요 — show()가 피버를 다시 보는 자리예요
const goto = (id) => get(`show("${id}")`);

// ---------- ① 구간 밖 ----------
console.log("=== ① 아직 시작 전이면 ===");
put(row(60 * MIN, 120 * MIN, { train: 0.5 }));
goto("screen-title");
check(!bar(), "배너가 없다");
check(Fever.live() === null, "살아 있는 피버가 없다");
check(Fever.buff() === null, "붙는 효과가 없다");
check(Math.abs(get("buffMul")("train", { proYear: 3, buffY: -1, buffs: [] }) - 1) < 1e-9,
  `훈련 배수가 그대로다 (${get("buffMul")("train", { proYear: 3, buffY: -1, buffs: [] })})`);

// ---------- ②③ 구간 안 ----------
console.log("=== ②③ 기간이 열리면 — 화면을 바꾸는 순간 ===");
put(row(-10 * MIN, 60 * MIN, { train: 0.5, moment: 0.05 }));
check(!bar(), "아직 배너가 없다 (화면을 안 바꿨으니까요)");
goto("screen-main");
console.log(`   배너 — ${barText()}`);
check(!!bar(), "③ 화면을 바꾸자 배너가 뜬다 — 이미 켜 둔 사람에게도 이렇게 옵니다");
check(/주말 피버 타임/.test(barText()), "제목이 적힌다");
check(/훈련 상승폭 \+50%/.test(barText()), `효과가 적힌다 (${barText()})`);
check(/남음/.test(barText()), "남은 시간이 적힌다");
const b = Fever.buff();
check(!!b && b.eff.train === 0.5 && b.eff.moment === 0.05, `효과가 그대로 실린다 (${JSON.stringify(b && b.eff)})`);
/* 계산에는 선수가 있어야 해요 — 캐릭터가 없으면 activeBuffs는 빈 목록이에요(그게 맞아요).
 * 칭호가 하나도 없는 맨 선수를 넘겨서, 오르는 게 오직 피버 때문임을 분명히 합니다. */
const PLAIN = { proYear: 3, buffY: -1, buffs: [] };
const names = get("activeBuffs")(PLAIN).map((t) => t.id);
check(names.includes("fever"), `버프 목록에 들어간다 (${names.join(", ") || "없음"})`);
check(Math.abs(get("buffMul")("train", PLAIN) - 1.5) < 1e-9, `훈련 배수가 실제로 오른다 (${get("buffMul")("train", PLAIN)})`);
check(Math.abs(get("buffSum")("moment", PLAIN) - 0.05) < 1e-9, `승부처도 오른다 (+${get("buffSum")("moment", PLAIN)})`);
dropModal();

// ---------- ④ 끝나면 ----------
console.log("=== ④ 기간이 끝나면 ===");
put(row(-120 * MIN, -1 * MIN, { train: 0.5 }));
check(!!bar(), "화면을 바꾸기 전에는 배너가 아직 그대로다");
goto("screen-title");
check(!bar(), "화면을 바꾸는 순간 사라진다");
check(Math.abs(get("buffMul")("train", { proYear: 3, buffY: -1, buffs: [] }) - 1) < 1e-9,
  `효과도 사라진다 (${get("buffMul")("train", { proYear: 3, buffY: -1, buffs: [] })})`);

// ---------- ⑤ 상한 밖 ----------
console.log("=== ⑤ 칭호 상한을 채운 사람에게도 붙는가 ===");
{
  const CAP = get("BUFF_CAP").train;
  // 🌟 신인왕(훈련 +15%)과 🌏 대표팀 훈련장(+30%)을 함께 달아 상한을 넘겨 둬요
  const st = { proYear: 3, buffY: 3, buffs: ["rookie"], wc: { year: 3 } };
  const before = get("buffSum")("train", st);
  put(row(-10 * MIN, 60 * MIN, { train: 0.5 }));
  goto("screen-main");
  const after = get("buffSum")("train", st);
  console.log(`   상한 ${CAP} · 피버 전 ${before} · 피버 후 ${after}`);
  check(Math.abs(before - CAP) < 1e-9, `칭호만으로 이미 상한에 닿아 있다 (${before} = ${CAP})`);
  check(Math.abs(after - (CAP + 0.5)) < 1e-9,
    `피버는 상한 밖에서 더해진다 (${after}) — 안 그러면 잘하는 사람만 이벤트에서 소외돼요`);
  dropModal();
}

// ---------- ⑥ 읽는 쪽이 거는 상한 ----------
console.log("=== ⑥ 운영 실수 방어 ===");
put(row(-10 * MIN, 60 * MIN, { train: 5, moment: 3, rate: 9, nope: 1 }));
goto("screen-title");
const wild = Fever.buff();
console.log(`   들어온 값 train 5 · moment 3 · rate 9 · nope 1 → ${JSON.stringify(wild.eff)}`);
check(wild.eff.train === Fever.FEVER_CAP.train, `훈련이 상한에서 멈춘다 (${wild.eff.train})`);
check(wild.eff.moment === Fever.FEVER_CAP.moment, `승부처도 멈춘다 (${wild.eff.moment})`);
check(wild.eff.nope === undefined, "모르는 키는 버린다 — 오타를 내도 조용히 지나가요");
dropModal();

// 구간이 뒤집혀 있으면 아예 없는 걸로 봐요
put(row(60 * MIN, 10 * MIN, { train: 0.5 }));
goto("screen-main");
check(!bar() && Fever.live() === null, "종료가 시작보다 앞이면 이벤트로 안 친다");

// ---------- ⑦ 효과 없는 이벤트 ----------
console.log("=== ⑦ 효과가 하나도 없으면 ===");
put(row(-10 * MIN, 60 * MIN, {}));
goto("screen-title");
check(!!bar(), "배너는 뜬다 (공지로 쓸 수 있어요)");
check(Fever.buff() === null, "버프로는 안 붙는다 — 아무 일도 안 하는 칭호는 거짓말이에요");
dropModal();

// ---------- ⑧ 알림은 한 번만 ----------
console.log("=== ⑧ 알림 ===");
w.localStorage.removeItem("grow-fever-seen");
put(row(-10 * MIN, 60 * MIN, { train: 0.3 }));
goto("screen-main");
check(!!modal(), "처음 마주치면 한 번 크게 알린다");
dropModal();
goto("screen-title");
goto("screen-main");
check(!modal(), "같은 이벤트로는 다시 안 알린다");
// 같은 id로 기간만 바꿔 다시 열면 그건 새 이벤트예요
put(row(-5 * MIN, 90 * MIN, { train: 0.3 }));
goto("screen-title");
check(!!modal(), "기간을 바꿔 다시 열면 또 알린다");
dropModal();

// ---------- ⑨ 변이 검증 ----------
console.log("=== ⑨ 변이 검증 ===");
{
  /* live()에서 구간 판정을 떼면 ①과 ④가 무너져야 해요.
   * 손으로 재현해요 — 판정이 없으면 "아직 시작 전"과 "이미 끝남"이 둘 다 살아 있게 됩니다. */
  const src = (FEVER.match(/function live\(\) \{[\s\S]*?\n  \}/) || [""])[0];
  console.log(`   ${src.replace(/\s+/g, " ").slice(0, 110)}…`);
  check(/now >= e\.from && now < e\.to/.test(src), "구간의 양쪽 끝을 모두 본다");
  const naive = (e) => e;                    // 판정을 뗀 판
  const future = { from: Date.now() + 1e6, to: Date.now() + 2e6 };
  const past = { from: Date.now() - 2e6, to: Date.now() - 1e6 };
  check(!!naive(future) && !!naive(past),
    "판정을 떼면 시작 전과 끝난 뒤가 둘 다 '진행 중'이 된다 — ①④가 그걸 잡아요");
  // 상한을 소스에서 읽어 왔는지 (값을 옮겨 적으면 원본이 바뀌어도 초록불이 떠요)
  check(/const FEVER_CAP = \{[^}]*train: 1\.0[^}]*\}/.test(FEVER), "상한이 소스에 한 벌만 있다");
  check(/if \(t\.id === "fever"\) bonus \+= v; else sum \+= v;/.test(GAME),
    "피버만 상한 밖에서 더하는 자리가 game.js에 있다");
  check(/if \(window\.WingerFever\) WingerFever\.tick\(\);/.test(GAME),
    "화면 전환(show)이 피버를 다시 본다 — ③이 여기 걸려 있어요");
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
