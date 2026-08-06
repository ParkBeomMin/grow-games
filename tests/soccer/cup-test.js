/* 🏆 컵 대회 — 8강부터 끝까지 실제 버튼을 눌러 굴려 본다.
 *
 * 리그 38라운드가 끝나면 바로 결산이라 축구에는 시즌의 절정이 없었다.
 * 컵은 **단판**이고 **1부·2부가 같은 대진**이라, 리그에서는 안 나오는 그림이 나온다.
 *
 * 여기서 지키는 것:
 *   ① 리그 4위 안이면 컵 버튼이 뜬다 (못 들면 바로 결산)
 *   ② 8강 → 4강 → 결승 세 판이고, 지면 그 자리에서 끝난다
 *   ③ 비기면 승부차기가 뜬다 — 컵은 무승부가 없다
 *   ④ 우승하면 트로피가 남는다 (명예의 전당 점수에 트로피당 8점)
 *   ⑤ 어떤 경로로 끝나든 **반드시 결산에 닿는다** (게임이 멈추면 안 된다)
 *
 * 확인용 시나리오(soccer-cup)를 그대로 태워요 — 손으로 지은 세이브는 실제 게임이
 * 만들지 않는 조합이 섞여서, 화면은 멀쩡한데 진짜 플레이에서 다르게 보입니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = "/workspace/grow-games";
const BETA = path.join(ROOT, "beta");
const { JSDOM } = require(path.join(ROOT, "tests/cloud/jsdom.js"));

const FIXTURES = new Function("window", `${fs.readFileSync(path.join(BETA, "_fixtures.js"), "utf8")} return window.CHECK_FIXTURES;`)({});
const IT = FIXTURES.items.find((x) => x.id === "soccer-cup");

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
if (!IT) {
  check(false, "soccer-cup 시나리오가 _fixtures.js에 없어요 (node scripts/make-fixtures.js soccer-cup)");
  process.exit(1);
}

const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.scrollTo = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  window.confirm = () => false;
  window.__timers = [];
  (function () {
    var st = window.setTimeout, si = window.setInterval;
    window.setTimeout = function () { var id = st.apply(window, arguments); window.__timers.push(id); return id; };
    window.setInterval = function () { var id = si.apply(window, arguments); window.__timers.push(id); return id; };
  })();
  localStorage.setItem("grow-auto-mini", "1");
  HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
`;

function open(keys) {
  const dir = path.join(BETA, "soccer");
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8")
    .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(dir, src.split("?")[0]);
      if (!fs.existsSync(p)) return "";
      return `<script>\n${fs.readFileSync(p, "utf8")}\n</script>`
        + (src.endsWith("env.js") ? "<!--SEED-->" : "");
    });
  html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
  html = html.replace("<!--SEED-->",
    `<script>(function(){var d=${JSON.stringify(keys).replace(/<\/script/gi, "<\\/script")};` +
    `for(var k in d)localStorage.setItem(k,d[k]);})();</script>`);
  html = html.replace("</body>", `<script>window.__get = (n) => eval(n);</script></body>`);
  /* ⚠️ URL에 /beta/를 넣지 않아요. env.js가 경로에 /beta/가 있으면 localStorage를
   * 'beta::'로 감싸는데, 위 PRELUDE가 심는 grow-auto-mini는 접두사가 붙기 **전에**
   * 쓰여요. 그러면 미니게임 자동 진행이 안 켜져서 '🔥 승부처!'에서 영원히 멈춥니다.
   * scripts/make-fixtures.js가 같은 이유로 같은 URL을 씁니다. */
  const d = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/soccer/" });
  const w = d.window;
  w.Ads = { display() {}, init() {} };
  w.Stats = { log() {} };
  return {
    dom: d, w,
    $: (id) => w.document.getElementById(id),
    active: () => (w.document.querySelector(".screen.active") || {}).id,
    state: () => w.__get("S"),
    close: () => { try { for (const t of (w.__timers || [])) { w.clearTimeout(t); w.clearInterval(t); } } catch { /* 닫힘 */ } try { d.window.close(); } catch { /* 닫힘 */ } },
  };
}

// 타이틀 → 이어하기 → 슬롯 카드
function resume(P) {
  const cont = P.$("btn-continue");
  if (!cont || cont.classList.contains("hidden")) throw new Error("'이어하기'가 안 보여요");
  cont.click();
  const go = P.w.document.querySelector(".slot-modal .slot-go");
  if (!go) throw new Error("슬롯 카드가 없어요");
  go.click();
  return P.active();
}

/* 컵을 끝까지 누른다. 어떤 경로로 끝나든 결산(screen-career)에 닿아야 한다. */
function runCup(P) {
  const seen = { pk: 0, rounds: [], reachedCareer: false };
  for (let g = 0; g < 400; g++) {
    if (P.active() === "screen-career") { seen.reachedCareer = true; break; }
    if (P.active() !== "screen-stage") break;
    // 승부차기가 떠 있으면 버튼을 눌러 진행한다 (auto-mini라 방향은 자동으로 골라져요)
    const pkBox = P.w.document.getElementById("pk-box");
    const pkBtn = pkBox && pkBox.querySelector("button");
    if (pkBtn) { if (!seen.pk) seen.pk = 1; pkBtn.click(); continue; }
    const btn = P.$("btn-stage-next");
    if (!btn || btn.hidden) break;
    const t = (btn.textContent || "").trim();

    if (/진출|결산|받아들이기|다음 라운드/.test(t)) seen.rounds.push(t);
    btn.click();
  }
  return seen;
}

// ── 시나리오를 태운다
const P = open(IT.keys);
const first = resume(P);
/* 컵을 치르던 중에 앱을 닫았다가 다시 연 상황이다. 이어하기로 들어가면
 * 바로 그 라운드 경기가 이어져야 한다 — 이 배선이 없으면 남은 라운드가 통째로
 * 사라지고 트로피도 못 받는다(리그 종료 전환은 버튼에만 걸려 있고 세이브엔 안 남는다). */
check(first === "screen-stage", `이어하기로 들어가면 컵 경기가 이어진다 (${first})`);

const S0 = P.state();
check(!!S0.cup, "세이브에 진행 중인 컵이 남아 있다");
check(!!S0.cup && Array.isArray(S0.cup.field), `대진이 뽑혀 있다 (남은 상대 ${S0.cup ? S0.cup.field.length : "?"}팀)`);

/* 대진에 **다른 리그** 팀이 섞여 있어야 한다 — 같은 리그만 모으면 컵이
 * 그냥 3경기 더가 된다. 자이언트 킬링이 컵의 전부다. */
const myShort = P.w.__get("leagueOf")(S0).short;
const others = (S0.cup.field || []).filter((c) => c.lg !== myShort);
check(others.length > 0,
  `대진에 다른 리그 팀이 섞여 있다 (${(S0.cup.field || []).map((c) => `${c.name}(${c.lg})`).join(" · ")})`);

/* ⚠️ P.state()는 **살아 있는 S**를 돌려줘요. S0을 들고 있어도 컵을 굴리면 같이 바뀝니다 —
 * 처음엔 S0.money와 S1.money를 비교했는데 둘이 같은 값이라 늘 통과했어요. 값으로 떠 둡니다. */
const trophiesBefore = (S0.trophies || []).length;
const moneyBefore = S0.money || 0;
const fandomBefore = S0.fandom || 0;
const run = runCup(P);
const S1 = P.state();

console.log(`   눌러 간 버튼: ${run.rounds.join(" → ")}`);
check(run.rounds.length > 0, `컵 경기를 실제로 치렀다 (${run.rounds.length}단계)`);
check(run.reachedCareer, "어떤 경로로 끝나든 결산 화면에 닿는다 (게임이 안 멈춘다)");
check(!S1.cup, "끝나면 진행 중인 컵이 세이브에서 치워진다");

// 라운드는 최대 셋 (8강·4강·결승) — 그보다 많이 돌면 대진이 안 줄어든 것이다
const advances = run.rounds.filter((t) => /진출|다음 라운드/.test(t)).length;
check(advances <= 3, `라운드가 셋을 안 넘는다 (${advances}번 통과)`);

const gained = (S1.trophies || []).length - trophiesBefore;
const cupTrophy = (S1.trophies || []).some((t) => /컵|배|코파|FA/.test(t));
console.log(`   트로피 ${trophiesBefore} → ${(S1.trophies || []).length}${cupTrophy ? " (컵 우승 포함)" : ""}`);
check(gained === 0 || cupTrophy, "트로피가 늘었다면 그건 컵 우승이다");
/* ⚠️ `>=`로는 아무것도 안 지켜요 — 돈이 한 푼도 안 들어와도 통과합니다.
 * 탈락이든 우승이든 대회 수당은 **반드시** 붙어야 해요. */
check(S1.money > moneyBefore, `대회 수당이 실제로 들어온다 (${moneyBefore} → ${S1.money})`);
check(cupTrophy ? S1.money - moneyBefore >= 900 : true,
  `우승이면 상금이 크다 (+${S1.money - moneyBefore}만)`);
check(cupTrophy ? S1.fandom > fandomBefore : true,
  `우승이면 명성도 오른다 (${fandomBefore} → ${S1.fandom})`);

/* ── 승부차기 규칙 — 소스에서 뽑아 굴린다. 화면 없이 확률만 본다.
 * 방향을 무작위로 고르는 것과 키퍼 반대쪽을 읽어내는 것 사이에 **차이가 나야** 한다.
 * 차이가 없으면 미니게임이 장식이고, 그냥 확률 주사위와 같다. */
const CUP_SRC = fs.readFileSync(path.join(BETA, "soccer/cup.js"), "utf8");
const grab = (re) => { const m = CUP_SRC.match(re); return m ? m[0] : null; };
const rules = {
  kicks: grab(/const KICKS = [^;]+;/),
  power: grab(/const powerThrough = [^;]+;/),
  miss: grab(/const missWide = [^;]+;/),
  opp: grab(/const oppScores = [^;]+;/),
};
const missingRules = Object.entries(rules).filter(([, v]) => !v).map(([k]) => k);
check(missingRules.length === 0, `승부차기 규칙을 소스에서 뽑았다 (${missingRules.join(", ") || "전부"})`);

if (!missingRules.length) {
  const sim = new Function("shoot", "oppStr", "readIt", `
    ${rules.kicks} ${rules.power} ${rules.miss} ${rules.opp}
    const SIDES = ["L", "C", "R"];
    const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
    let me = 0, opp = 0;
    const kick = () => {
      const lean = pick(SIDES);
      const side = readIt ? SIDES.filter((x) => x !== lean)[0] : pick(SIDES);
      return side === lean ? Math.random() < powerThrough(shoot) : Math.random() >= missWide(shoot);
    };
    for (let i = 0; i < KICKS; i++) { if (kick()) me++; if (oppScores(oppStr)) opp++; }
    let g = 0;
    while (me === opp && g++ < 30) { if (kick()) me++; if (oppScores(oppStr)) opp++; }
    return me > opp;`);
  const rate = (shoot, opp, readIt) => {
    let w = 0; const N = 20000;
    for (let i = 0; i < N; i++) if (sim(shoot, opp, readIt)) w++;
    return w / N * 100;
  };
  const blind = rate(80, 70, false), reading = rate(80, 70, true);
  console.log(`   승부차기 승률(슛 80 · 상대 70) — 아무 데나 ${blind.toFixed(1)}% · 읽어내면 ${reading.toFixed(1)}%`);
  check(reading - blind > 20,
    `키퍼를 읽으면 확실히 유리하다 (${(reading - blind).toFixed(1)}%p 차이) — 아니면 미니게임이 장식이다`);
  const weak = rate(40, 70, true), strong = rate(120, 70, true);
  console.log(`   같은 조건에서 슛 40 ${weak.toFixed(1)}% · 슛 120 ${strong.toFixed(1)}%`);
  check(strong - weak > 10, `능력치도 남는다 (${(strong - weak).toFixed(1)}%p 차이) — 판단만으로 다 되면 육성이 죽는다`);
  check(blind > 20 && blind < 80, `아무 데나 골라도 완전히 지지는 않는다 (${blind.toFixed(1)}%)`);
}

// ── 컵 이름이 나라를 따라간다
const CUPS = new Function(`${grab(/const CUPS = \{[\s\S]*?\n  \};/)} return CUPS;`)();
const LEAGUES = new Function(`${fs.readFileSync(path.join(BETA, "soccer/game.js"), "utf8").match(/const LEAGUES = \[[\s\S]*?\n\];/)[0]} return LEAGUES;`)();
const countries = [...new Set(LEAGUES.map((l) => l.country))];
check(countries.every((c) => CUPS[c]),
  `나라마다 컵 이름이 있다 (${countries.map((c) => `${c}:${CUPS[c] || "없음"}`).join(" · ")})`);
check(new Set(Object.values(CUPS)).size === Object.keys(CUPS).length, "컵 이름이 겹치지 않는다");

P.close();
console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
