/* 명예의 전당 리그 가중 — 빅클럽에서 받은 상이 국내에서 받은 것보다 값어치를 갖는가.
 *
 * 안 그러면 안전하게 1부에 머문 플레이어가 순위에서 앞선다. 리그 이적이 도박인데
 * 이기고 돌아와도 보상이 없으면 아무도 안 올라간다.
 *
 * 커리어 점수는 함수를 직접 부르지 않는다. 결산 화면의 "🎓 은퇴하기" 버튼을 실제로
 * 눌러 은퇴식 화면까지 가서, DOM에 찍힌 "커리어 점수"를 읽는다. cloud.js 때
 * 스크립트 로드 순서가 틀려 8개 게임 전부에서 기능이 죽었는데도 문자열 매칭
 * 테스트는 47/47 초록이었던 일이 있다.
 *
 * 산식과 상수는 소스에서 뽑아 쓴다 — 값을 옮겨 적으면 원본이 바뀌어도 초록이 뜬다.
 * eval("const x = …")은 쓰지 않는다. 선언이 eval 자기 스코프에 갇혀 밖으로 안 샌다.
 * new Function으로 감싸 return 한다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

// ---------- 페이지 부트스트랩 (tests/soccer/transfer-test.js와 같은 방식) ----------
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
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const get = w.__get, set = w.__set;

const Career = w.WingerCareer;
check(!!Career, "WingerCareer 모듈이 페이지에서 로드된다");
check(typeof Career?._t?.state === "function", "_t.state가 노출된다");
if (!Career || !Career._t || typeof Career._t.state !== "function") { console.log("\n❌ 실패"); process.exit(1); }
const T = Career._t;
const LEAGUES = T.LEAGUES;
const CLUBS = T.CLUBS;
const leagueById = (id) => LEAGUES.find((l) => l.id === id);

// ---------- 소스에서 뽑는 가중 누적 (값을 옮겨 적지 않는다) ----------
/* 수상 가중은 finishYear가 쌓는다. careerScore만 검사하면
 * "daesangW += 1" 같은 가중 제거 변조를 못 잡는다. 그래서 누적 줄 자체를
 * 소스에서 떼어 new Function으로 굴린다. */
const SRC = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
const accSrc = {
  dae: grab(SRC, /S\.career\.daesangW = [^;]+;/),
  bon: grab(SRC, /S\.career\.bonsangW = [^;]+;/),
};
const accMissing = Object.entries(accSrc).filter(([, v]) => !v).map(([k]) => k);
check(accMissing.length === 0,
  accMissing.length ? `career.js에 가중 누적 줄이 없어요: ${accMissing.map((k) => `${k}sangW`).join(", ")}`
    : "daesangW · bonsangW 누적 줄을 career.js 소스에서 뽑았다");

/* 소스에서 뽑은 줄을 그대로 굴려 수상 1회를 쌓는다. 옛 카운터도 함께 올린다.
 * 누적 줄은 리그를 leagueOf(S)로 읽으니 그 자리에 원하는 리그를 물려준다. */
function award(kind, career, lg) {
  if (!accSrc[kind]) throw new Error(`${kind}sangW 누적 줄을 못 찾았어요`);
  const st = { career: JSON.parse(JSON.stringify(career)) };
  new Function("S", "leagueOf", accSrc[kind])(st, () => lg);
  const key = kind === "dae" ? "daesang" : "bonsang";
  st.career[key] = (st.career[key] || 0) + 1;
  return st.career;
}

// ---------- 기준 상태 만들기 ----------
/* 데뷔까지 실제로 눌러서 잘 만들어진 프로 상태를 하나 얻고, 그걸 복제해서 쓴다. */
set("S", get('newState(MARKETS[0], "fw", "테스트")'));
Career.onEnding(true, false);
check(!!$("btn-go-debut"), "엔딩 화면에 '프로 커리어 시작' 버튼이 있다");
$("btn-go-debut").click();
const BASE = JSON.parse(JSON.stringify(T.state()));
check(!!BASE.group && !!BASE.league, `데뷔 상태를 확보했다 (${BASE.group} · ${BASE.league}부)`);

const EMPTY_CAREER = {
  years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0, sales: 0,
  goals: 0, assists: 0, defense: 0, apps: 0, teamW: 0, teamD: 0, teamL: 0,
};
/* 점수의 다른 항(명성·MOM·트로피·초월·주장)을 전부 0으로 눕힌다.
 * 남는 건 시즌 수와 수상뿐이라 가중의 크기를 그대로 잴 수 있다. */
function stateWith(career, over = {}) {
  const st = JSON.parse(JSON.stringify(BASE));
  st.proYear = 5;
  st.camp = 0; st.activity = null; st.pendingShow = false;
  st.fandom = 0; st.money = 0; st.trophies = []; st.center = false; st.trans = {};
  st.moves = [];
  st.career = Object.assign({}, EMPTY_CAREER, career);
  // 결산 화면은 마지막 시즌이 있어야 뜬다. 안 주면 조용한 한 시즌을 넣어준다.
  st.career.years = (career && career.years && career.years.length) ? career.years : [{
    y: 5, hype: 5, wins: 0, sales: 0, dFan: 0, awards: [],
    goals: 0, assists: 0, defense: 0, apps: 30,
  }];
  return Object.assign(st, over);
}

// 결산 화면을 띄운다 (게임이 이어하기에 쓰는 공개 입구 → 그 뒤는 전부 버튼 클릭)
function openReport(st) {
  set("S", st);
  Career.showActivity();
  if (active() !== "screen-career") throw new Error(`결산 화면이 아니에요 (${active()})`);
}
const retireBtn = () => Array.from(w.document.querySelectorAll("#career-actions .btn"))
  .find((b) => b.textContent.includes("은퇴"));

/* 은퇴 버튼을 실제로 눌러 은퇴식 화면의 커리어 점수를 읽는다. */
let lastConfirm = "";
w.confirm = (msg) => { lastConfirm = String(msg); return true; };
function retireScore(st) {
  openReport(st);
  const btn = retireBtn();
  if (!btn) throw new Error("결산 화면에 은퇴 버튼이 없어요");
  btn.click();
  const txt = $("career-card").textContent.replace(/\s+/g, " ");
  const m = txt.match(/커리어 점수 (-?\d+(?:\.\d+)?)/);
  if (!m) throw new Error(`은퇴식 화면에서 커리어 점수를 못 읽었어요: ${txt.slice(0, 140)}`);
  return Number(m[1]);
}

const P = { 1: leagueById(1).prestige, 2: leagueById(2).prestige, 3: leagueById(3).prestige };
const inLeague = (id) => ({ league: id, group: CLUBS[id][0].name, clubStr: CLUBS[id][0].str });

// ---------- ① 3부 리그MVP 1회가 1부 1회보다 점수가 높다 ----------
let base0 = 0, dae1 = 0, dae3 = 0;
guard("① 리그MVP 가중", () => {
  base0 = retireScore(stateWith({}, inLeague(1)));
  dae1 = retireScore(stateWith(award("dae", EMPTY_CAREER, leagueById(1)), inLeague(1)));
  dae3 = retireScore(stateWith(award("dae", EMPTY_CAREER, leagueById(3)), inLeague(3)));
  console.log(`=== ① 커리어 점수 — 수상 없음 ${base0} · 1부 MVP 1회 ${dae1} · 3부 MVP 1회 ${dae3} ===`);
  check(dae3 > dae1,
    `3부 리그MVP 1회가 1부 1회보다 커리어 점수가 높다 (${dae3} vs ${dae1})`);
});

// ---------- ② 배수가 prestige와 같다 ----------
guard("② 배수 = prestige", () => {
  const c1 = dae1 - base0, c3 = dae3 - base0;
  const want = P[3] / P[1];
  const got = c1 === 0 ? NaN : c3 / c1;
  console.log(`=== ② 기여 — 1부 +${c1} · 3부 +${c3} · 배수 ${Number.isFinite(got) ? got.toFixed(3) : "?"} (기대 ${want.toFixed(3)}) ===`);
  check(c1 > 0, `1부 리그MVP도 점수에 기여한다 (+${c1})`);
  check(Number.isFinite(got) && Math.abs(got - want) < 1e-6,
    `3부 리그MVP 1회의 기여가 1부의 ${want.toFixed(2)}배다 (실측 ${Number.isFinite(got) ? got.toFixed(3) : "?"}배)`);
  /* 2부도 같은 규칙인지 — 3부만 특수 처리한 구현을 걸러낸다.
   * 점수는 Math.round를 거치니 반올림 0.5점까지는 허용한다 (1부 ×1.35 = 67.5 → 68). */
  const dae2 = retireScore(stateWith(award("dae", EMPTY_CAREER, leagueById(2)), inLeague(2)));
  const c2 = dae2 - base0, want2 = c1 * P[2] / P[1];
  check(Math.abs(c2 - want2) <= 0.5,
    `2부도 같은 규칙이다 (기여 +${c2} · prestige ${(P[2] / P[1]).toFixed(2)}배면 +${want2})`);
});

// ---------- ③ 베스트11도 같은 방식으로 가중된다 ----------
guard("③ 베스트11 가중", () => {
  const b1 = retireScore(stateWith(award("bon", EMPTY_CAREER, leagueById(1)), inLeague(1)));
  const b3 = retireScore(stateWith(award("bon", EMPTY_CAREER, leagueById(3)), inLeague(3)));
  const c1 = b1 - base0, c3 = b3 - base0;
  const got = c1 === 0 ? NaN : c3 / c1;
  console.log(`=== ③ 베스트11 — 1부 +${c1} · 3부 +${c3} · 배수 ${Number.isFinite(got) ? got.toFixed(3) : "?"} ===`);
  check(b3 > b1, `3부 베스트11 1회가 1부 1회보다 점수가 높다 (${b3} vs ${b1})`);
  check(Number.isFinite(got) && Math.abs(got - P[3] / P[1]) < 1e-6,
    `베스트11도 prestige 배수로 가중된다 (실측 ${Number.isFinite(got) ? got.toFixed(3) : "?"}배)`);
  check(c1 > 0 && c1 < dae1 - base0,
    `베스트11의 기여는 리그MVP보다 작다 (+${c1} vs +${dae1 - base0})`);
});

// ---------- ④ 옛 세이브 방어 — 가중 필드가 없으면 옛 방식으로 계산하고 던지지 않는다 ----------
guard("④ 옛 세이브 방어", () => {
  const old = Object.assign({}, EMPTY_CAREER, { daesang: 2, bonsang: 3, rookie: 1, wins: 4 });
  delete old.daesangW; delete old.bonsangW;
  check(!("daesangW" in old) && !("bonsangW" in old), "옛 세이브에는 가중 카운터가 아예 없다");
  let oldScore = NaN;
  check((() => { try { oldScore = retireScore(stateWith(old, inLeague(1))); return true; } catch (e) { return false; } })(),
    "가중 카운터가 없는 옛 세이브도 은퇴가 던지지 않는다");
  check(Number.isFinite(oldScore), `옛 세이브 점수가 숫자다 (${oldScore})`);
  // 옛 방식 = 가중 없음 = 1부 기준. 같은 수치를 ×1로 명시한 커리어와 점수가 같아야 한다.
  const asOne = Object.assign({}, old, { daesangW: 2 * P[1], bonsangW: 3 * P[1] });
  const oneScore = retireScore(stateWith(asOne, inLeague(1)));
  console.log(`=== ④ 옛 세이브 ${oldScore} · ×1 명시 ${oneScore} ===`);
  check(oldScore === oneScore,
    `가중 필드가 없으면 1부(×${P[1].toFixed(2)}) 기준으로 계산한다 (${oldScore} vs ${oneScore})`);
  // 옛 세이브가 3부에서 새 상을 받아도 지난 상이 사라지지 않는다
  const seeded = award("dae", old, leagueById(3));
  const seededScore = retireScore(stateWith(seeded, inLeague(3)));
  console.log(`=== ④ 옛 세이브가 3부에서 MVP 1회 추가 → ${seededScore} (이전 ${oldScore}) ===`);
  check(seededScore > oldScore,
    `옛 세이브가 새 상을 받아도 점수가 떨어지지 않는다 (${oldScore} → ${seededScore})`);
});

// ---------- ⑤ 1부만 뛴 커리어는 점수가 변하지 않는다 ----------
guard("⑤ 1부 항등", () => {
  let c = Object.assign({}, EMPTY_CAREER);
  for (let i = 0; i < 3; i++) c = award("dae", c, leagueById(1));
  for (let i = 0; i < 2; i++) c = award("bon", c, leagueById(1));
  check(c.daesang === 3 && c.bonsang === 2, `1부에서 MVP 3회 · 베스트11 2회를 쌓았다 (${c.daesang}·${c.bonsang})`);
  const weighted = retireScore(stateWith(c, inLeague(1)));
  const plain = Object.assign({}, EMPTY_CAREER, { daesang: 3, bonsang: 2 });
  delete plain.daesangW; delete plain.bonsangW;
  const legacy = retireScore(stateWith(plain, inLeague(1)));
  console.log(`=== ⑤ 1부 전용 커리어 — 가중판 ${weighted} · 옛판 ${legacy} ===`);
  check(weighted === legacy,
    `리그를 안 옮긴 1부 커리어는 점수가 그대로다 (${weighted} vs ${legacy})`);
});

// ---------- ⑥ 결산 화면에 현재 리그와 클럽(전력)이 표시된다 ----------
guard("⑥ 결산 화면 소속 표시", () => {
  for (const id of [1, 2, 3]) {
    const club = CLUBS[id][1];
    const lg = leagueById(id);
    openReport(stateWith({}, { league: id, group: club.name, clubStr: club.str }));
    const line = w.document.querySelector("#career-card .draft-team");
    const txt = line ? line.textContent.replace(/\s+/g, " ") : "";
    check(!!line, `${lg.name} 결산에 소속 줄(.draft-team)이 있다`);
    check(txt.includes(club.name), `그 줄에 클럽 이름이 있다 (${club.name})`);
    check(txt.includes(lg.name) && txt.includes(lg.flag),
      `그 줄에 리그 이름과 깃발이 있다 (${lg.flag} ${lg.name} · 실제 "${txt.slice(0, 60)}")`);
    check(txt.includes(String(club.str)),
      `그 줄에 클럽 전력이 숫자로 있다 (${club.str})`);
  }
});

// ---------- ⑦ 이적 이력이 은퇴 요약에 나온다 ----------
guard("⑦ 이적 이력 표시", () => {
  const A = CLUBS[1][5], B = CLUBS[1][0], C = CLUBS[2][0];
  const moves = [
    { y: 3, from: A.name, to: B.name, fromLg: 1, toLg: 1 },
    { y: 6, from: B.name, to: C.name, fromLg: 1, toLg: 2 },
  ];
  // 이력이 없으면 문구도 없다 — "항상 찍는다"는 구현을 걸러낸다
  openReport(stateWith({}, inLeague(1)));
  check(!w.document.querySelector("#career-card .move-log"),
    "이적한 적이 없으면 결산에 이적 이력 줄이 없다");

  const st = stateWith({}, Object.assign({ moves }, { league: 2, group: C.name, clubStr: C.str }));
  openReport(st);
  /* 이력 줄만 따로 읽는다. 화면 전체 텍스트로 보면 소속 줄의 리그 이름이 섞여
   * "리그를 같이 보여준다"가 거저 초록이 된다. */
  const repEl = w.document.querySelector("#career-card .move-log");
  const rep = repEl ? repEl.textContent.replace(/\s+/g, " ") : "";
  check(!!repEl, `이적한 적이 있으면 결산에 이적 이력 줄(.move-log)이 나온다 (${rep.slice(0, 60)}…)`);
  check(rep.includes("이적"), "그 줄이 이적 이력임을 밝힌다");
  check(moves.every((m) => rep.includes(`${m.from}→${m.to}`)),
    `결산의 이력에 전소속→새소속이 모두 있다 (${moves.map((m) => `${m.from}→${m.to}`).join(" · ")})`);
  check(moves.every((m) => rep.includes(String(m.y))),
    "결산의 이력에 몇 시즌에 옮겼는지가 있다");
  check(rep.includes(leagueById(2).name),
    `리그가 바뀐 이적은 이력 줄에 리그도 같이 보여준다 (${leagueById(2).name})`);
  check(!rep.includes(leagueById(1).name),
    `같은 리그 안의 이적에는 리그를 안 붙인다 (${leagueById(1).name}이 이력 줄에 없다)`);

  // 은퇴 확인창(되돌릴 수 없는 선택)에도 남는다
  lastConfirm = "";
  const btn = retireBtn();
  check(!!btn, "결산 화면에 은퇴 버튼이 있다");
  btn.click();
  const conf = lastConfirm.replace(/\s+/g, " ");
  check(conf.includes("이적"), `은퇴 확인창에 이적 이력이 있다 (${conf.slice(0, 80)}…)`);
  check(moves.every((m) => conf.includes(`${m.from}→${m.to}`)),
    "은퇴 확인창의 이력에 전소속→새소속이 모두 있다");

  // 은퇴식 화면에도 남는다
  const cardEl = w.document.querySelector("#career-card .move-log");
  const card = cardEl ? cardEl.textContent.replace(/\s+/g, " ") : "";
  check(!!cardEl, `은퇴식 화면에 이적 이력 줄이 있다 (${card.slice(0, 80)}…)`);
  check(card.includes("이적"), "은퇴식의 그 줄이 이적 이력임을 밝힌다");
  check(moves.every((m) => card.includes(`${m.from}→${m.to}`)),
    "은퇴식 화면의 이력에 전소속→새소속이 모두 있다");
  check(card.includes(leagueById(2).name),
    "은퇴식 화면에서도 리그가 바뀐 이적은 리그가 보인다");
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
