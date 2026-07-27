/* 7종 career.js의 클라우드 호출 순서 검증.
 *
 * 브라우저 전체를 띄우는 대신, 검사할 함수의 **실제 소스**를 파일에서 잘라내
 * with(스코프) 안에서 그대로 실행한다. 게임 전역(S, save, clamp …)은 여기서 채워주고,
 * 채우지 않은 이름은 아무 일도 안 하는 스텁이 받아준다.
 *
 * 이렇게 하는 이유: "push가 일어났나"만 보면 이번 버그를 절대 못 잡는다.
 * push는 어차피 일어난다 — 문제는 **무엇을** 올렸느냐다. 그래서 mark() 시점에
 * 저장소에 들어 있던 세이브를 그대로 떠서, 함수가 끝난 뒤의 세이브와 비교한다.
 *
 * CAREER 환경변수로 검사 대상 폴더를 바꿀 수 있다 (수정 전 파일로 돌려 실패를 먼저 보려고).
 */
"use strict";
const fs = require("fs");

const B = process.env.CAREER || "/workspace/grow-games/beta";
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const group = (t) => console.log(`\n— ${t}`);

/* 소스에서 최상위(2칸 들여쓰기) 함수 하나를 통째로 잘라낸다.
 * 이 파일들은 들여쓰기가 일정해서, 여는 줄부터 딱 "  }"인 줄까지가 그 함수다. */
function cut(src, header) {
  const lines = src.split("\n");
  const i = lines.findIndex((l) => l === header);
  if (i < 0) throw new Error("함수를 못 찾았어요: " + header);
  for (let j = i + 1; j < lines.length; j++) {
    if (lines[j] === "  }") return lines.slice(i, j + 1).join("\n");
  }
  throw new Error("함수 끝을 못 찾았어요: " + header);
}

/* 게임 전역을 흉내내는 스코프. 모르는 이름은 아무것도 안 하는 함수로 받아준다.
 * (진짜 전역/내장은 globalThis에서 그대로 가져온다) */
function scopeOf(store) {
  const stub = function () { return undefined; };
  return new Proxy(store, {
    has: () => true,
    get(t, k) {
      if (k === Symbol.unscopables) return undefined;
      if (k in t) return t[k];
      if (k in globalThis) return globalThis[k];
      return stub;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function run(srcFn, store) {
  const name = /^  (?:async )?function (\w+)/.exec(srcFn)[1];
  // eslint-disable-next-line no-new-func
  const make = new Function("scope", `with (scope) { ${srcFn}\n return ${name}; }`);
  return make(scopeOf(store));
}

// ---------- 게임별 설정 ----------
const GAMES = [
  { g: "rookie", fn: "  function finishSeason() {", key: "rookie-save-v1" },
  { g: "idol", fn: "  function finishYear() {", key: "trainee-save-v1" },
  { g: "stock", fn: "  function finishYear() {", key: "investor-save-v1" },
  { g: "dev", fn: "  function finishYear() {", key: "devgrow-save-v1" },
  { g: "chef", fn: "  function finishYear() {", key: "chef-save-v1" },
  { g: "stream", fn: "  function finishYear() {", key: "streamer-save-v1" },
  { g: "soccer", fn: "  function finishYear() {", key: "winger-save-v1" },
];
const BATTLE_KEY = {
  rookie: "grow-battle-v1", idol: "grow-battle-idol-v1", stock: "grow-battle-stock-v1",
  dev: "grow-battle-dev-v1", chef: "grow-battle-chef-v1", stream: "grow-battle-stream-v1",
  soccer: "grow-battle-soccer-v1",
};

const STAT_KEYS = ["a", "b", "c"];
const STAT_LIST = STAT_KEYS.map((k) => ({ key: k, name: k }));

function freshState(g) {
  const stats = {}, talents = {};
  STAT_KEYS.forEach((k) => { stats[k] = 50; talents[k] = 1; });
  return {
    name: "테스터", pos: "batter", role: "선발 투수", age: 27, money: 1000,
    proYear: 4, phase: g === "rookie" ? "pro" : g + "-pro",
    stats, talents,
    fandom: 100, camp: 0, pendingShow: true, pendingGame: true,
    career: { seasons: [], years: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0,
      rookie: 0, daesang: 0, bonsang: 0, sales: 0 },
    activity: { hypeSum: 8, wins: 2, sales: 30, cb: 2, cbTotal: 2, week: 8,
      teamW: 20, teamD: 5, teamL: 10, goals: 9, assists: 4, defense: 2, apps: 30 },
    season: { game: 144, total: 144, teamW: 80, teamL: 64,
      stats: { hits: 150, ab: 500, hr: 20, sb: 10, er: 50, ip: 180, k: 160, wins: 12, saves: 0 } },
    post: null,
  };
}

// ============================================================
group("1) 시즌/연말 결산 — mark()가 올리는 건 결산 **이후**의 세이브여야 한다");
for (const { g, fn, key } of GAMES) {
  const src = fs.readFileSync(`${B}/${g}/career.js`, "utf8");
  const S = freshState(g);
  const LS = {};
  let snapshot = null, markCount = 0;

  const store = {
    S,
    save: () => { LS[key] = JSON.stringify(S); },
    clearSave: () => { delete LS[key]; },
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    rand: (a, b) => (a + b) / 2,
    randInt: (a, b) => Math.round((a + b) / 2),
    pick: (a) => a[0],
    statCap: () => 99,
    STAT_DEFS: g === "rookie" ? { batter: STAT_LIST, pitcher: STAT_LIST } : STAT_LIST,
    overall: () => 70,
    fmtMoney: (v) => String(v),
    myRank: () => 3,
    window: {
      Cloud: {
        mark: () => { markCount++; snapshot = LS[key] === undefined ? null : LS[key]; },
        touch: () => {},
      },
      Stats: { log: () => {} },
      Fx: { celebrate: () => {} },
    },
  };
  store.Cloud = store.window.Cloud;
  store.Stats = store.window.Stats;
  store.Fx = store.window.Fx;

  store.save();                       // 결산 직전의 세이브 (= 지난 시즌 상태)
  const before = LS[key];

  let err = null;
  try { run(cut(src, fn), store)(); } catch (e) { err = e; }
  check(!err, `${g}: 결산 함수가 끝까지 돈다${err ? ` (${err.message})` : ""}`);
  if (err) continue;

  check(markCount === 1, `${g}: Cloud.mark()가 정확히 한 번 불린다 (${markCount}회)`);
  check(snapshot !== null && snapshot !== before,
    `${g}: mark() 시점의 세이브가 지난 시즌 것이 아니다`);
  check(snapshot === LS[key],
    `${g}: mark()가 올리는 꾸러미 = 결산이 끝난 최종 세이브`);

  // 무엇이 달라야 하는지 구체적으로 — 결산은 성적을 기록부에 넣고 능력치/나이를 넘긴다
  const snap = snapshot ? JSON.parse(snapshot) : {};
  const list = g === "rookie" ? "seasons" : "years";
  check(((snap.career || {})[list] || []).length === 1,
    `${g}: 올라간 세이브에 이번 결산 기록이 들어 있다 (${((snap.career || {})[list] || []).length}건)`);
  check(snap.money > JSON.parse(before).money,
    `${g}: 이번 시즌 수입이 반영된 뒤의 금액이다 (${JSON.parse(before).money} → ${snap.money})`);
}

// ============================================================
group("2) 대전 기록도 백업 대상이다 — 저장하면 dirty가 서야 한다 (Minor 4)");
for (const { g } of GAMES) {
  const src = fs.readFileSync(`${B}/${g}/career.js`, "utf8");
  const line = src.split("\n").find((l) => /const saveBattle\s*=/.test(l));
  // 여러 줄로 쓰였을 수 있으니 정의부터 세미콜론까지 이어붙인다
  let def = "";
  if (line) {
    const lines = src.split("\n");
    const i = lines.indexOf(line);
    let depth = 0;
    for (let j = i; j < lines.length; j++) {
      def += lines[j] + "\n";
      for (const ch of lines[j]) { if (ch === "{") depth++; else if (ch === "}") depth--; }
      if (depth <= 0 && /;\s*$/.test(lines[j])) break;
    }
  }
  check(!!def, `${g}: saveBattle 정의를 찾았다`);
  if (!def) continue;

  const LS = {};
  let touched = 0;
  const store = {
    BATTLE_KEY: BATTLE_KEY[g],
    localStorage: { setItem: (k, v) => { LS[k] = v; }, getItem: (k) => (k in LS ? LS[k] : null) },
    window: { Cloud: { touch: () => { touched++; }, mark: () => {} } },
  };
  store.Cloud = store.window.Cloud;
  // eslint-disable-next-line no-new-func
  const fnv = new Function("scope", `with (scope) { ${def}\n return saveBattle; }`);
  let err = null;
  try { fnv(scopeOf(store))({ records: { x: { rating: 1024 } } }); } catch (e) { err = e; }
  check(!err, `${g}: saveBattle가 돈다${err ? ` (${err.message})` : ""}`);
  check(LS[BATTLE_KEY[g]] !== undefined, `${g}: 대전 기록이 ${BATTLE_KEY[g]}에 저장된다`);
  check(touched === 1,
    `${g}: 대전 기록을 저장하면 Cloud.touch()로 백업 대상이 된다 (${touched}회)`);
}

// ============================================================
(async function () {
group("3) 환생 — 새로고침 전에 전송이 끝나길 기다린다 (Minor 2)");
for (const { g } of GAMES) {
  const src = fs.readFileSync(`${B}/${g}/career.js`, "utf8");
  const S = freshState(g);
  const order = [];
  let settleResolve = null;
  const store = {
    S,
    confirm: () => true,
    rebirthReady: () => true,   // 환생 조건은 이미 채운 상태로 본다
    rebirthHint: () => "",
    alert: () => { order.push("alert"); },
    save: () => {}, clearSave: () => { order.push("clearSave"); },
    saveLegacy: () => { order.push("saveLegacy"); },
    loadLegacy: () => ({ pts: 3, gen: 1 }),
    legacyGain: () => 5, legacyTalentBonus: () => 0.1, legacyMoneyBonus: () => 1000,
    careerScore: () => 100, fmtMoney: (v) => String(v),
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    location: { reload: () => { order.push("reload"); } },
    window: {
      Cloud: {
        mark: () => { order.push("mark"); },
        settle: () => { order.push("settle"); return new Promise((r) => { settleResolve = r; }); },
      },
      Stats: { log: () => {} },
    },
  };
  store.Cloud = store.window.Cloud;
  store.Stats = store.window.Stats;

  let err = null;
  try { run(cut(src, "  function rebirth(team) {"), store)("팀"); } catch (e) { err = e; }
  check(!err, `${g}: 환생 함수가 돈다${err ? ` (${err.message})` : ""}`);
  if (err) continue;

  check(order.indexOf("mark") > order.indexOf("clearSave"),
    `${g}: mark()는 clearSave() 뒤에 온다 (기존 순서 유지)`);
  check(order.indexOf("settle") >= 0,
    `${g}: 새로고침 전에 Cloud.settle()로 전송을 기다린다 — 실제 순서 [${order.join(" → ")}]`);
  check(order.indexOf("reload") === -1,
    `${g}: 전송이 끝나기 전에는 새로고침하지 않는다 — 실제 순서 [${order.join(" → ")}]`);

  if (settleResolve) settleResolve();
  await new Promise((r) => setTimeout(r, 10));
  check(order.indexOf("reload") > order.indexOf("settle"),
    `${g}: 전송이 끝나면 새로고침한다 — 실제 순서 [${order.join(" → ")}]`);
}

console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("테스트 자체가 터졌어요:", e); process.exit(1); });
