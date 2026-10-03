/* ⚽ 더 윙어 II 1막 — 🌊 **흐름 줄** (`beta/winger2/live.js`의 `FLOW_LINE` · `flowOf` · 킥오프 두 줄)
 *
 * 🔄 **2026-10-02 · inspector — 1막으로 옮겼습니다**(11번 §6-C). 옛 계약 「흐름 줄은 **분에서** 나온다(12분 격자) · 필러는 deck 밖」은
 *    1막 설계가 **뒤집었어요**(12번 §8-1 🔒 「흐름 줄의 주인은 엔진의 중립 장면 — 12분 격자 줄은 안 씀 · 엔진 카드 6~8장이 이미
 *    90분에 퍼져 있어 격자 줄을 더하면 같은 자리에 줄이 두 번」). 그래서 **그 문장은 버리고**, 살아남은 뜻을 1막 계약으로 적습니다:
 *   F-1  흐름 줄 = **엔진의 중립 장면(`filler`)뿐** — 그려진 흐름 줄 수 = 엔진 `filler` 카드 수(격자 줄 0) · 글은 1막 흐름 표에서
 *   F-2  흐름(`a` · `h` · `mid`)은 **카드 번호 · 스코어에서 결정적** — 마지막 카드 전엔 번갈아, 마지막 카드만 스코어를 봄
 *        (🔒 **독립 오라클** — 설계 문장에서 검사가 직접 계산해요. 소스의 `flowOf`를 불러 견주면 자기 자신과의 비교예요)
 *   F-3  🎲 **판정 난수 0** — 흐름 줄을 만드는 데 `Math.random` 0번 · 엔진 굴림 수가 화면 없는 판과 같음
 *   F-4  🗣️ 한 경기에서 **같은 흐름의 줄이 차례로** — 세 줄을 다 쓰기 전엔 같은 말이 두 번 안 뜸(`used`)
 *   F-5  🏁 0′ **두 줄** — 대진(「{상대}와의 90분이 시작됩니다」)과 `{me}` 줄(「{나}가 크게 숨을 들이쉽니다」) · 이름 뒤 조사가 받침을 따름
 *   + 변이 넷
 * 🌍 이 파일이 서 있는 세계: 「흐름 줄의 글은 드라이버(`live.js`)가 엔진 `filler` 카드에 **갈아 끼운다**」. 엔진이 흐름 글을
 *    직접 만들게 되거나 격자 줄이 되살아나면 F-1이 먼저 웁니다.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 */
"use strict";
const { pageMutsOK } = require("./_load.js");
const { liveMatch } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* 🔬 계측(변이 아님) — 엔진 굴림 수를 셉니다. 💥 안 걸리면 죽어요(0건을 「어긋남 없음」으로 읽지 않게) */
const INS = { "engine.js": [[/^  const rnd = \(\) => _rng\(\);$/m,
  "  const rnd = () => { try { window.__rngN = (window.__rngN || 0) + 1; } catch (e) { /* 닫힌 창 */ } return _rng(); };"]] };
const MUT = {
  /* F-1 — 12분 격자 줄을 되살립니다(엔진 카드 앞에 「격자 흐름 줄」 하나씩 더 그림) */
  M_GRID: { "live.js": [[/(if \(!Scene\.clock\(clockMin, gen\)\) return false;[^\n]*\n)/,
    '$1        if (clockMin % 12 === 0) await draw(lineCard(clockMin, "filler", "격자 흐름 줄"));\n']] },
  /* F-2 — 마지막 카드도 스코어를 안 봄(늘 번갈아) */
  M_FLOWSCORE: { "live.js": [[/const flowOf = \(k, n, us, them\) => \(k < n \? \(k % 2 \? "a" : "h"\) : us < them \? "a" : us > them \? "h" : "mid"\);/,
    'const flowOf = (k, n, us, them) => (k % 2 ? "a" : "h");']] },
  /* F-3 — 흐름 줄을 `Math.random`으로 고름 */
  M_RND: { "live.js": [[/card\.text = fill\(t\[used\[fl\]\+\+ % t\.length\], \{ me: myName \}\);/,
    "card.text = fill(t[Math.floor(Math.random() * t.length)], { me: myName });"]] },
  /* F-4 — 쓴 줄을 안 셈(같은 말이 되풀이) */
  M_NOUSED: { "live.js": [[/t\[used\[fl\]\+\+ % t\.length\]/, "t[used[fl] % t.length]"]] },
  /* F-5 — 0′ 둘째 줄(`{me}`)을 뺌 */
  M_KICK2: { "live.js": [[/ {4}draw\(lineCard\(0, "kick", fill\(KICK2_LINE, \{ me: myName \}\)\)\);\n/, ""]] },
};
{
  const insBad = pageMutsOK({ INS });
  if (insBad.length) { console.log(`💥 계측 정규식이 소스에 안 걸립니다 — ${insBad.join(" · ")}`); process.exit(2); }
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식 ${Object.values(MUT).reduce((a, f) => a + Object.values(f).reduce((b, m) => b + m.length, 0), 0)}개가 지금 소스에 전부 걸린다`
    + (bad.length ? `\n     🔴 **안 걸린 것**` + bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const withIns = (m) => {
  const out = { "engine.js": INS["engine.js"].slice() };
  for (const [f, ms] of Object.entries(m || {})) out[f] = (out[f] || []).concat(ms);
  return out;
};

/* 🔎 한 판 — 그려진 줄(화면이 받은 카드)을 엔진 카드와 나란히 */
const SEEDS = [11, 202, 777, 5150, 31337, 4242, 9, 64];   // + 마지막 카드가 흐름 줄인 판(아래 `lastFillerSeeds`)
const POS_OF = (seed) => ["fw", "wg", "mf", "df"][seed % 4];
/* 📖 설계 문장에서 검사가 직접 계산하는 흐름(12번 §8-1 · `live.js` 머리말이 같은 말을 적음): 마지막 카드 전엔 카드 번호로 번갈아
 *    (홀수 a · 짝수 h), 마지막 카드는 그 순간 스코어 — 지면 a(몰아붙임) · 이기면 h(상대가 달려듦) · 같으면 mid */
const oracle = (k, n, us, them) => (k < n ? (k % 2 ? "a" : "h") : us < them ? "a" : us > them ? "h" : "mid");
async function one(seed, muts, name) {
  let mathN = 0;
  const r = await liveMatch({ seed, pos: POS_OF(seed), name: name || "윙어", muts: withIns(muts), hand: () => 0.5,
    onClock: (m, env) => {
      if (env.__mathHooked) return;
      env.__mathHooked = true;
      const raw = env.w.Math.random;
      env.w.Math.random = function () { mathN += 1; return raw.apply(this, arguments); };
    } });
  const engineN = r.w.__rngN || 0;
  const cards = (r.info && r.info.cards) || [];
  const n = cards.reduce((a, c) => Math.max(a, c.n || 0), 0);
  const drawn = r.log.filter((x) => x.t === "push");
  const FLOW = r.w.WingerLive._t.FLOW_LINE;
  r.close();
  const h = await liveMatch({ seed, pos: POS_OF(seed), headless: true, muts: withIns(muts) });
  const engineHeadless = h.w.__rngN || 0;
  h.close();
  return { seed, cards, n, drawn, FLOW, mathN, engineN, engineHeadless, info: r.info };
}
function judge(m) {
  const fillers = m.cards.filter((c) => c.kind === "filler");
  const drawnFill = m.drawn.filter((d) => d.kind === "filler");
  const flows = fillers.map((c) => c.flow);
  const bad1 = [], bad2 = [], bad4 = [];
  /* F-1 — 그려진 흐름 줄 = 엔진 filler · 글이 표에 있음 · filler 아닌 카드엔 flow 없음 */
  if (drawnFill.length !== fillers.length) bad1.push(`그려진 흐름 줄 ${drawnFill.length} ≠ 엔진 filler ${fillers.length}`);
  for (const c of m.cards) {
    if (c.kind !== "filler" && c.flow != null) bad1.push(`${c.min}′ ${c.kind}에 flow`);
    if (c.kind === "filler") {
      const pool = (m.FLOW[c.flow] || []).map((t) => t.replace(/\{me\|[^}]+\}/g, "").replace(/\{me\}/g, ""));
      const bare = String(c.text);
      if (!pool.some((p) => p && bare.indexOf(p.trim().slice(0, 6)) >= 0 || bare === p)) bad1.push(`${c.min}′ 「${c.text}」이 ${c.flow} 표에 없음`);
    }
  }
  /* F-2 — 오라클과 같은 흐름 */
  for (const c of fillers) {
    const want = oracle(c.k, m.n, c.score[0], c.score[1]);
    if (c.flow !== want) bad2.push(`${c.k}/${m.n} ${c.score.join(":")} → ${c.flow}(기대 ${want})`);
  }
  /* F-4 — 같은 흐름 안에서 세 줄을 다 쓰기 전엔 같은 글이 안 되풀이 */
  const seen = {};
  for (const c of fillers) {
    const list = seen[c.flow] || (seen[c.flow] = []);
    const lastN = list.slice(-2);
    if (lastN.indexOf(c.text) >= 0) bad4.push(`${c.flow}: 「${c.text}」가 세 줄 안에서 또`);
    list.push(c.text);
  }
  return { fillers: fillers.length, flows, bad1, bad2, bad4, rnd0: m.mathN === 0, engSame: m.engineN === m.engineHeadless && m.engineN > 0 };
}

/* 🎯 **마지막 카드가 흐름 줄인 판**을 찾아 넣습니다 — F-2의 「마지막 카드만 스코어」 갈래는 그 판에서만 재져요.
 *    시드 몇 개로는 한 번도 안 나와서(실측: 시드 8개에 0장) **「번갈아」만 재고 초록불**이 됩니다(커버리지가 난수에 걸림).
 *    화면 없는 같은 드라이버로 시드를 훑어(빠름) 지면 · 이기면 · 비기면 각 둘까지 골라요. 못 찾으면 🚧(빨간불이 아니라 잴 수 없음). */
async function lastFillerSeeds() {
  const want = { a: [], h: [], mid: [] };
  for (let seed = 1; seed <= 400 && (want.a.length < 2 || want.h.length < 2 || want.mid.length < 2); seed++) {
    const h = await liveMatch({ seed, pos: POS_OF(seed), headless: true });
    const cards = (h.info && h.info.cards) || [];
    const n = cards.reduce((a, c) => Math.max(a, c.n || 0), 0);
    const last = cards.find((c) => c.kind === "filler" && c.k === n && n > 0);
    h.close();
    if (!last) continue;
    const f = oracle(last.k, n, last.score[0], last.score[1]);
    if (want[f].length < 2) want[f].push(seed);
  }
  return want;
}

(async () => {
  const LAST = await lastFillerSeeds();
  for (const f of ["a", "h", "mid"]) for (const sd of LAST[f]) if (SEEDS.indexOf(sd) < 0) SEEDS.push(sd);
  const runs = [];
  for (const seed of SEEDS) runs.push(await one(seed));
  const J = runs.map(judge);
  const nF = J.reduce((a, j) => a + j.fillers, 0);
  const fl = J.flatMap((j) => j.flows);
  console.log(`   🔎 측정 조건 — 시드 ${SEEDS.join("/")} · 포지션 넷을 돌아가며 · 1막 세계 · s 0.5 · 흐름 줄 ${nF}장 (a ${fl.filter((x) => x === "a").length} · h ${fl.filter((x) => x === "h").length} · mid ${fl.filter((x) => x === "mid").length})`);
  check(nF >= 10 && fl.includes("a") && fl.includes("h"), `F-0. 🔎 흐름 줄이 실제로 그려졌다 — ${nF}장 · 흐름 ${[...new Set(fl)].join(" · ")} (0이면 아래 문장이 빈 판 위에서 통과해요)`);
  const okF1 = (js) => js.every((j) => j.bad1.length === 0);
  const okF2 = (js) => js.every((j) => j.bad2.length === 0);
  const okF3 = (js) => js.every((j) => j.rnd0 && j.engSame);
  const okF4 = (js) => js.every((j) => j.bad4.length === 0);
  check(okF1(J), `F-1. 🌊 **흐름 줄 = 엔진의 중립 장면뿐** — 그려진 흐름 줄 수 = 엔진 filler 수 · 글은 1막 흐름 표 · filler 아닌 카드엔 flow 0 (격자 줄 0)`
    + (okF1(J) ? "" : `\n     🔴 ${J.flatMap((j) => j.bad1).slice(0, 5).join(" · ")}`));
  const lastSeen = { a: 0, h: 0, mid: 0 };
  runs.forEach((m) => { const last = m.cards.find((c) => c.kind === "filler" && c.k === m.n); if (last && last.flow) lastSeen[last.flow] += 1; });
  const covered = lastSeen.a > 0 && lastSeen.h > 0 && lastSeen.mid > 0;
  if (!covered) console.log(`🚧 F-2 커버리지 — 마지막 카드가 흐름 줄인 판: 몰아붙임 ${lastSeen.a} · 버팀 ${lastSeen.h} · 팽팽 ${lastSeen.mid} — 하나라도 0이면 그 갈래는 **검증됨이 아닙니다**`);
  check(covered, `F-2a. 🎯 마지막 카드 갈래를 **실제로 쟀다** — 마지막 카드가 흐름 줄인 판: 지는 중 ${lastSeen.a} · 이기는 중 ${lastSeen.h} · 비기는 중 ${lastSeen.mid} (시드를 훑어 골라 넣음 ${JSON.stringify(LAST)})`);
  check(okF2(J), `F-2. 🔁 흐름이 **카드 번호 · 스코어에서 결정적** — 설계 문장으로 직접 계산한 흐름과 ${nF}장 전부 같다`
    + (okF2(J) ? "" : `\n     🔴 ${J.flatMap((j) => j.bad2).slice(0, 5).join(" · ")}`));
  check(okF3(J), `F-3. 🎲 **판정 난수 0** — 경기 내내 \`Math.random\` ${J.filter((j) => !j.rnd0).length ? "🔴 불림" : "0번"} · 엔진 굴림 수가 화면 없는 판과 같다(${runs.map((m) => `${m.engineN}/${m.engineHeadless}`).join(" · ")})`);
  check(okF4(J), `F-4. 🗣️ 한 경기에서 **같은 흐름의 줄이 차례로** — 세 줄을 다 쓰기 전엔 같은 말이 안 되풀이된다`
    + (okF4(J) ? "" : `\n     🔴 ${J.flatMap((j) => j.bad4).slice(0, 4).join(" · ")}`));

  /* F-5 — 0′ 두 줄 · 조사(받침 있는 이름 · 없는 이름) */
  async function kick(muts) {
    const out = [];
    for (const [nm, want] of [["윙어", "윙어가"], ["강민준", "강민준이"]]) {
      const m = await one(11, muts, nm);
      const k0 = m.drawn.filter((d) => d.min === 0);
      const texts = m.cards.filter((c) => c.kind === "kick").map((c) => c.text);
      out.push({ nm, n0: k0.length, first: texts[0] || "", second: (m.drawn.find((d) => d.min === 0 && d.k === 0 && d !== k0[0]) ? "있음" : "없음"),
        ok: k0.length === 2 && /한결고와의 90분이 시작됩니다/.test(texts[0] || "") , want });
    }
    return out;
  }
  {
    const k = await kick(null);
    /* 둘째 줄의 글은 화면에만 가요(엔진 카드가 아님) — 화면이 받은 0′ 줄 수(2)와 첫 줄의 대진 · 조사로 봅니다 */
    const ok = k.every((x) => x.ok);
    check(ok, `F-5. 🏁 0′ **두 줄** — 대진(「한결고와의 90분이 시작됩니다」) + \`{me}\` 줄 · 이름마다 0′ 줄 ${k.map((x) => `${x.nm} ${x.n0}줄`).join(" · ")}`);
  }
  /* 🔤 조사 — `W2World.fill`이 받침에 맞춰 붙이는가(「윙어가」 · 「강민준이」) — 화면 글자를 직접 읽습니다 */
  {
    const r = await liveMatch({ seed: 11, pos: "fw", name: "강민준", hand: () => 0.5 });
    const t = r.host ? r.host.textContent : "";
    const r2 = await liveMatch({ seed: 11, pos: "fw", name: "윙어", hand: () => 0.5 });
    const t2 = r2.host ? r2.host.textContent : "";
    r.close(); r2.close();
    check(/강민준이 크게 숨을 들이쉽니다/.test(t) && /윙어가 크게 숨을 들이쉽니다/.test(t2),
      `F-5b. 🔤 \`{me}\` 줄의 조사가 받침을 따른다 — 「강민준이 …」 ${/강민준이 크게/.test(t) ? "✔" : "🔴"} · 「윙어가 …」 ${/윙어가 크게/.test(t2) ? "✔" : "🔴"}`);
  }

  /* 🧪 변이 */
  if (!(okF1(J) && okF2(J) && okF3(J) && okF4(J))) console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다");
  else {
    const sub = async (muts) => { const out = []; for (const seed of SEEDS) out.push(judge(await one(seed, muts))); return out; };
    check(!okF1(await sub(MUT.M_GRID)), `변이-M_GRID(12분 격자 줄 되살림) → F-1이 빨간불`);
    check(!okF2(await sub(MUT.M_FLOWSCORE)), `변이-M_FLOWSCORE(마지막 카드도 스코어를 안 봄) → F-2가 빨간불`);
    check(!okF3(await sub(MUT.M_RND)), `변이-M_RND(흐름 줄을 Math.random으로) → F-3이 빨간불`);
    check(!okF4(await sub(MUT.M_NOUSED)), `변이-M_NOUSED(쓴 줄을 안 셈) → F-4가 빨간불`);
    const k2 = await kick(MUT.M_KICK2);
    check(!k2.every((x) => x.ok), `변이-M_KICK2(0′ 둘째 줄 뺌) → F-5가 빨간불 (0′ 줄 ${k2.map((x) => x.n0).join("/")})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
