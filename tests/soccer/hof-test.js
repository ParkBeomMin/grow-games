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

/* ⚠️ 기준점은 **같은 리그에서** 재야 해요. 커리어 점수에는 '가장 높이 오른 리그'
 * 항이 따로 있어서, 1부 기준점으로 3부 점수를 빼면 그 항까지 상 하나의 몫으로
 * 잘못 들어갑니다 (실제로 배수가 2.40이 아니라 6.44로 나왔어요). */
const baseAt = {};
const baseOf = (id) => (baseAt[id] != null ? baseAt[id] : (baseAt[id] = retireScore(stateWith({}, inLeague(id)))));

// ---------- ① 3부 리그MVP 1회가 1부 1회보다 점수가 높다 ----------
let base0 = 0, dae1 = 0, dae3 = 0;
guard("① 리그MVP 가중", () => {
  base0 = baseOf(1);
  dae1 = retireScore(stateWith(award("dae", EMPTY_CAREER, leagueById(1)), inLeague(1)));
  dae3 = retireScore(stateWith(award("dae", EMPTY_CAREER, leagueById(3)), inLeague(3)));
  console.log(`=== ① 커리어 점수 — 수상 없음 1부 ${base0} · 3부 ${baseOf(3)} · 1부 MVP 1회 ${dae1} · 3부 MVP 1회 ${dae3} ===`);
  check(dae3 > dae1,
    `3부 리그MVP 1회가 1부 1회보다 커리어 점수가 높다 (${dae3} vs ${dae1})`);
});

// ---------- ② 배수가 prestige와 같다 ----------
guard("② 배수 = prestige", () => {
  const c1 = dae1 - baseOf(1), c3 = dae3 - baseOf(3);
  const want = P[3] / P[1];
  const got = c1 === 0 ? NaN : c3 / c1;
  console.log(`=== ② 기여 — 1부 +${c1} · 3부 +${c3} · 배수 ${Number.isFinite(got) ? got.toFixed(3) : "?"} (기대 ${want.toFixed(3)}) ===`);
  check(c1 > 0, `1부 리그MVP도 점수에 기여한다 (+${c1})`);
  check(Number.isFinite(got) && Math.abs(got - want) < 1e-6,
    `3부 리그MVP 1회의 기여가 1부의 ${want.toFixed(2)}배다 (실측 ${Number.isFinite(got) ? got.toFixed(3) : "?"}배)`);
  /* 2부도 같은 규칙인지 — 3부만 특수 처리한 구현을 걸러낸다.
   * 점수는 Math.round를 거치니 반올림 0.5점까지는 허용한다 (1부 ×1.35 = 67.5 → 68). */
  const dae2 = retireScore(stateWith(award("dae", EMPTY_CAREER, leagueById(2)), inLeague(2)));
  const c2 = dae2 - baseOf(2), want2 = c1 * P[2] / P[1];
  check(Math.abs(c2 - want2) <= 0.5,
    `2부도 같은 규칙이다 (기여 +${c2} · prestige ${(P[2] / P[1]).toFixed(2)}배면 +${want2})`);
});

// ---------- ③ 베스트11도 같은 방식으로 가중된다 ----------
guard("③ 베스트11 가중", () => {
  const b1 = retireScore(stateWith(award("bon", EMPTY_CAREER, leagueById(1)), inLeague(1)));
  const b3 = retireScore(stateWith(award("bon", EMPTY_CAREER, leagueById(3)), inLeague(3)));
  const c1 = b1 - baseOf(1), c3 = b3 - baseOf(3);
  const got = c1 === 0 ? NaN : c3 / c1;
  console.log(`=== ③ 베스트11 — 1부 +${c1} · 3부 +${c3} · 배수 ${Number.isFinite(got) ? got.toFixed(3) : "?"} ===`);
  check(b3 > b1, `3부 베스트11 1회가 1부 1회보다 점수가 높다 (${b3} vs ${b1})`);
  check(Number.isFinite(got) && Math.abs(got - P[3] / P[1]) < 1e-6,
    `베스트11도 prestige 배수로 가중된다 (실측 ${Number.isFinite(got) ? got.toFixed(3) : "?"}배)`);
  check(c1 > 0 && c1 < dae1 - baseOf(1),
    `베스트11의 기여는 리그MVP보다 작다 (+${c1} vs +${dae1 - baseOf(1)})`);
});

/* ---------- ③-2 가장 높이 오른 리그 자체가 점수에 실린다 ----------
 * 상·명성·MOM만 세면 **아래 리그일수록 유리**해져요. 실측(10시즌 30회)에서
 * 같은 능력치로 K리그3에 눌러앉은 커리어가 프리미어리그까지 올라간 커리어보다
 * 점수가 높았습니다. 여기가 그 역전을 막는 자리예요. */
guard("③-2 도달 리그", () => {
  console.log(`=== ③-2 수상 없는 커리어 — 1부 ${baseOf(1)} · 2부 ${baseOf(2)} · 3부 ${baseOf(3)} ===`);
  check(baseOf(3) > baseOf(2) && baseOf(2) > baseOf(1),
    `상이 하나도 없어도 위 리그까지 올라간 커리어가 점수가 높다 (${baseOf(1)} < ${baseOf(2)} < ${baseOf(3)})`);
  /* 지금 있는 리그가 아니라 **가장 높이 올랐던 리그**를 봐요 —
   * 프리미어리그에서 뛰다 강등돼 마친 커리어가 하부 리그 붙박이와 같아지면 안 돼요. */
  const fell = stateWith({ years: [
    { y: 4, hype: 5, wins: 0, sales: 0, dFan: 0, awards: [], goals: 0, assists: 0, defense: 0, apps: 30, league: 3 },
    { y: 5, hype: 5, wins: 0, sales: 0, dFan: 0, awards: [], goals: 0, assists: 0, defense: 0, apps: 30, league: 1 },
  ] }, inLeague(1));
  const fellScore = retireScore(fell);
  console.log(`=== ③-2 3부를 밟았다가 1부에서 마친 커리어 ${fellScore} (1부만 ${baseOf(1)}) ===`);
  check(fellScore > baseOf(1),
    `3부를 밟았던 기록이 남아 있으면 1부 붙박이보다 높다 (${fellScore} vs ${baseOf(1)})`);
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
  /* task-1(팀 칼럼): 결산 화면의 '🔁 이적 이력' 한 줄은 표의 소속 칸으로 옮겨갔다.
   * 이 텍스트 줄은 이적 여부와 무관하게 결산에서 완전히 사라져야 한다 — 중복이라서다.
   * (소속 칸 자체의 검사는 tests/soccer/career-column-test.js가 맡는다.) */
  check(!w.document.querySelector("#career-card .move-log"),
    "이적한 적이 있어도 결산에는 이적 이력 줄이 없다 — 표의 소속 칸으로 옮겨갔다");

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

/* ---------- ⑧ 은퇴식의 소속 시즌 ----------
 * 제보(실기기 스크린샷): 5시즌에 옮겨 온 클럽인데 "로열 알비온에서 10시즌을
 * 뛰었어요"라고 적혔다. 통산 시즌을 마지막 클럽 옆에 그대로 붙여 놨던 탓이다.
 * 화면과 이적 기록이 서로 모르는 사이였던 자리다. */
guard("⑧ 은퇴식 소속 시즌", () => {
  const A = CLUBS[1][0], B = CLUBS[2][0];
  const years = [];
  for (let y = 1; y <= 10; y++) years.push({
    y, hype: 5, wins: 0, sales: 0, dFan: 0, awards: [],
    goals: 0, assists: 0, defense: 0, apps: 30,
    club: y <= 5 ? A.name : B.name, league: y <= 5 ? 1 : 2,
  });
  const st = stateWith({ years }, {
    league: 2, group: B.name, clubStr: B.str,
    moves: [{ y: 5, from: A.name, to: B.name, fromLg: 1, toLg: 2 }],
  });
  openReport(st);
  retireBtn().click();
  const card = $("career-card").textContent.replace(/\s+/g, " ");
  console.log(`=== ⑧ 은퇴식 — "${card.slice(0, 130)}" ===`);
  check(/통산 10시즌/.test(card), `통산 시즌이 10으로 찍힌다 (${card.slice(0, 60)})`);
  check(card.includes(`${B.name}에서 5시즌`),
    `마지막 클럽에서 뛴 시즌은 5로 찍힌다 — 통산 10이 아니라 (${B.name})`);
  check(!card.includes(`${B.name}에서 10시즌`),
    "옛 문구(마지막 클럽에서 통산 시즌만큼 뛰었다)가 남아 있지 않다");

  // 한 클럽에서만 뛴 커리어는 '원클럽맨'으로 적어요 — 5시즌/5시즌을 중복해 적지 않아요
  const solo = stateWith({ years: years.map((y) => Object.assign({}, y, { club: A.name, league: 1 })) },
    { league: 1, group: A.name, clubStr: A.str, moves: [] });
  openReport(solo);
  retireBtn().click();
  const soloCard = $("career-card").textContent.replace(/\s+/g, " ");
  console.log(`=== ⑧ 원클럽맨 — "${soloCard.slice(0, 110)}" ===`);
  check(soloCard.includes("원클럽맨"), `이적이 없으면 원클럽맨으로 적는다 (${soloCard.slice(0, 60)})`);
});

/* ---------- ⑨ 은퇴 확인창의 '우승' 표기 ----------
 * career.wins는 MOM 횟수다. 예전에는 확인창이 그걸 "🏆 우승"이라고 적어서,
 * 한 시즌 38경기인 게임에서 "우승 96회"가 떴다. 판정과 표시가 어긋난 자리다. */
guard("⑨ 우승 표기", () => {
  const st = stateWith({ wins: 96 }, Object.assign({ trophies: ["3시즌 K리그1 우승", "4시즌 FA컵 우승"] }, inLeague(1)));
  openReport(st);
  lastConfirm = "";
  retireBtn().click();
  const conf = lastConfirm.replace(/\s+/g, " ");
  console.log(`=== ⑨ 확인창 — "${conf.replace(/\n/g, " ").slice(0, 160)}" ===`);
  check(conf.includes("🏆우승 2"), `우승은 트로피 수(2)로 적는다 (${conf.slice(0, 120)})`);
  check(!conf.includes("🏆우승 96"), "MOM 96회를 우승으로 적지 않는다");
  check(conf.includes("MOM 96"), "MOM은 MOM으로 따로 적는다");
});

/* ---------- ⑩ 등급 12단계 — 확인창과 은퇴식에 점수·다음 등급이 뜬다 ----------
 * 6단계였을 때는 커리어의 절반이 한 이름에 몰렸다. 잘게 나눈 이상 "지금 어디쯤이고
 * 조금만 더 하면 뭐가 되는지"가 화면에 있어야 나눈 값을 한다. */
guard("⑩ 등급 표시", () => {
  const grades = new Set();
  const seen = [];
  // 점수를 넓게 훑어 실제로 몇 가지 등급이 나오는지 본다 (문턱을 옮겨 적지 않는다)
  for (const c of [
    {}, { wins: 30 }, { wins: 90 }, { daesang: 1, daesangW: 1 }, { daesang: 3, daesangW: 3 },
    { daesang: 6, daesangW: 6, bonsang: 6, bonsangW: 6 },
    { daesang: 10, daesangW: 24, bonsang: 12, bonsangW: 28, ballon: 2 },
    { daesang: 14, daesangW: 33, bonsang: 16, bonsangW: 38, ballon: 6, wins: 200 },
  ]) {
    const st = stateWith(Object.assign({}, EMPTY_CAREER, c), inLeague(1));
    st.fandom = (c.wins || 0) * 30;
    openReport(st);
    lastConfirm = "";
    retireBtn().click();
    const m = lastConfirm.replace(/\s+/g, " ").match(/등급: (\S+ [^(]+)\((\d+)점/);
    if (m) { grades.add(m[1].trim()); seen.push(`${m[2]}점 ${m[1].trim()}`); }
  }
  console.log(`   ${seen.join(" · ")}`);
  check(grades.size >= 5,
    `점수를 넓게 훑으면 등급이 여러 가지로 갈린다 (${grades.size}가지) — 6단계였을 땐 한두 개에 몰렸어요`);

  // 확인창에 점수와 다음 등급까지의 거리가 있다
  const st = stateWith(Object.assign({}, EMPTY_CAREER, { daesang: 3, daesangW: 3, wins: 40 }), inLeague(1));
  openReport(st);
  lastConfirm = "";
  retireBtn().click();
  const conf = lastConfirm.replace(/\s+/g, " ");
  const line = (conf.match(/등급:[^⚠]*/) || [""])[0].trim();
  console.log(`=== ⑩ 확인창 등급 줄 — "${line}" ===`);
  check(/\d+점/.test(line), `등급 옆에 커리어 점수가 있다 (${line})`);
  check(/까지 \d+점|최고 등급/.test(line), `다음 등급까지 남은 점수가 있다 (${line})`);

  // 은퇴식에도 남는다
  const card = $("career-card").textContent.replace(/\s+/g, " ");
  check(/커리어 점수 \d+/.test(card), "은퇴식에도 점수가 남는다");
  check(/까지 \d+점이었어요|더 오를 곳이 없는/.test(card),
    `은퇴식에도 다음 등급까지의 거리가 남는다 (${(card.match(/커리어 점수[^명]*/) || [""])[0].slice(0, 70)})`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
w.close();
process.exit(fail ? 1 : 0);
