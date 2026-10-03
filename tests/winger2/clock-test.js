/* ⚽ 더 윙어 II 1막 — ⏱️ **시계가 0'부터 90'까지 쭉 흐르는가** (`beta/winger2/live.js` — 경기 드라이버 하나)
 *
 * 계기(옛 II): 범민 님 — *"0분부터 90분까지 **쭉 흘러가고** 중계텍스트가 나와야한다구.. 첫 카드까지 걸리는 시간이 느는건 상관없어"*
 * 🔄 **2026-10-02 · inspector — 1막으로 옮겼습니다**(11번 §6-C · 26번 §1). 옛 파일은 🏫 학교 아크(`town.js`)의 시계를 쟀어요.
 *    1막은 그 시계를 **`live.js` 하나**로 옮겼고(12번 §8-1 · 25번 §2) 학교 아크가 없어요. **계약 문장은 그대로, 도달 경로는 새로** —
 *    드라이버 창구 `WingerLive.play(host, cfg)`(계약 4)를 진짜 `index.html`(스크립트 순서 그대로) 위의 진짜 `W2Scene`으로 굴립니다.
 *
 * 🔒 지키는 것 — 전부 **개수 · 관계 · 순서**예요(벽시계 문턱 0개 — 느린 기기에서 우연히 빨간불이 나지 않게)
 *   C-1  시계가 **1′부터 마지막 분(90′ · 추가시간이면 90+n′)까지 한 칸씩** — 보통 · ⏩ 빨리감기 · 🤖 자동 셋 다 같은 틱 수
 *   C-2  시계가 **줄을 추월하지 않는다** — 다음 칸으로 갈 때 그려지던 줄이 다 그려져 있고, 줄은 자기 분이 된 뒤에 그려진다
 *   C-3  **결과가 경기보다 먼저 안 뜬다** — 드라이버가 90′(휘슬) 줄을 다 그린 **뒤에** 풀리고, 🏁 누르기 전엔 시계가 0칸
 *   C-4  **벽시계를 안 잰다** — 진짜 타이머로 돌려도 · 뭉갠 타이머로 돌려도 틱 수열과 결과가 비트 같다
 *   C-5  **화면의 스코어 · 승패가 성적에 안 닿는다**(옛 `school-scene-test`의 한 문장) — 화면 없이 돌린 같은 판과 결과가 비트 같다
 *   C-6  🎬 **세대 가드는 `match-scene.js` 한 곳** — 경기 도중 다음 경기가 깔리면(`mount`) 옛 경기의 시계가 끊기고 드라이버는 `null`
 *   C-7  🛟 **안전망 타임아웃 0**(11번 §7-3 #23) — 휘슬 줄이 끝내 안 그려지면 드라이버는 **안 풀린다**(조용히 결과를 내지 않는다)
 *   + 변이 여덟(파일 안) — 각각 **제 문장이** 빨간불
 *
 * 🌍 이 파일의 계약이 서 있는 세계: 「⏱️ 시계가 `live.js`의 `await` 루프 **하나**로 돌고, ⏩ · 🤖는 **간격만** 0으로 만드는 세계」.
 *    `setInterval`로 되돌리거나 시계를 `match-scene.js` 안으로 옮기면 C-1 · C-2가 먼저 운다 — 그건 정상 신호예요.
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 */
"use strict";
const { pageMutsOK } = require("./_load.js");
const { liveMatch } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* 🧪 변이 — 0번이 먼저 소스와 대조합니다(안 걸리면 「안 돈 것」) */
const MUT = {
  /* C-1 — 시계가 칸을 건너뜁니다(옛 사고 그대로) */
  M_SKIP: { "live.js": [[/ {8}clockMin \+= 1;\n/, "        clockMin = target;\n"]] },
  /* C-1 ⏩ — **빨리감기에서만** 칸을 건너뜁니다(검사가 보는 세계에서만 시계가 사라지는 모양) */
  M_FASTSKIP: { "live.js": [[/ {8}clockMin \+= 1;\n/, "        clockMin = (Scene.isFast && Scene.isFast()) ? target : clockMin + 1;\n"]] },
  /* C-2 — 흐름 줄을 안 기다립니다(시계가 줄을 추월) */
  M_NOWAIT: { "live.js": [[/(card\.text = fill\(t\[used\[fl\]\+\+ % t\.length\], \{ me: myName \}\);\n {10})await draw\(card\);/, "$1draw(card);"]] },
  /* C-3 — 휘슬 줄보다 먼저 끝냅니다(결과가 경기보다 먼저) */
  M_EARLY: { "live.js": [[/ {10}await draw\(card\);\n {10}if \(card\.kind === "end"\) break;/, '          if (card.kind === "end") break;\n          await draw(card);']] },
  /* C-4 — 분을 **벽시계**에서 읽습니다(진짜 타이머에서만 칸이 갈려요) */
  M_WALL: { "live.js": [[/ {8}clockMin \+= 1;\n/, "        clockMin = Math.max(clockMin + 1, Math.round((performance.now() - (window.__w2t0 || (window.__w2t0 = performance.now()))) / 30));\n"]] },
  /* C-5 — 화면이 카드의 결과를 고칩니다(연출이 결과를 만듦) */
  M_SCENEWRITE: { "match-scene.js": [[/ {4}if \(!S \|\| !card\) return;\n {4}const my = S;/,
    '    if (!S || !card) return;\n    if ((card.kind === "goal" || card.kind === "assist") && card.result === "none") card.result = "goal";\n    const my = S;']] },
  /* C-6 — 드라이버가 세대가 갈린 것을 무시하고 계속 돕니다 */
  M_NOGEN: { "live.js": [[/if \(!Scene\.clock\(clockMin, gen\)\) return false;/, "Scene.clock(clockMin, gen);"]] },
  /* C-7 — 안전망 타임아웃을 답니다(휘슬이 안 와도 결과를 냄) */
  M_SAFETY: { "live.js": [[/ {4}return new Promise\(\(resolve, reject\) => \{\n {6}const go = /,
    "    return new Promise((resolve, reject) => {\n      setTimeout(() => resolve(finish(m, c, [])), 3000);\n      const go = "]] },
};
{
  const bad = pageMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식 ${Object.values(MUT).reduce((a, f) => a + Object.values(f).reduce((b, m) => b + m.length, 0), 0)}개가 지금 소스에 전부 걸린다`
    + (bad.length ? `\n     🔴 **안 걸린 것 — 그 변이 검사는 "안 도는" 상태입니다**` + bad.map((b) => `\n       · ${b}`).join("") : ""));
}

/* 🔎 한 판의 기록에서 문장 넷을 읽습니다 — 값이 아니라 **순서와 개수** */
function readMatch(r) {
  const L = r.log;
  const clocks = L.filter((x) => x.t === "clock");
  const ms = clocks.map((x) => x.m);
  const pushes = L.filter((x) => x.t === "push");
  const end = pushes.filter((p) => p.kind === "end").pop();
  const last = end ? end.min : NaN;
  /* C-1 — 1부터 last까지 한 칸씩 · 빠짐 · 겹침 없음 */
  const seqOK = ms.length > 0 && ms.every((m, i) => m === i + 1) && ms[ms.length - 1] === last;
  /* C-2 — ① 시계 한 칸을 넘길 때 그리던 줄이 없다 ② 줄은 그 분이 된 뒤에 그려진다(0′ 킥오프 두 줄은 🏁 앞) */
  let pending = 0, overtake = 0, early = 0, lastClock = 0;
  for (const x of L) {
    if (x.t === "push") { pending += 1; if (x.min > lastClock && x.min !== 0) early += 1; }
    else if (x.t === "pushed") pending -= 1;
    else if (x.t === "clock") { if (pending > 0) overtake += 1; lastClock = x.m; }
  }
  /* C-3 — 🏁 전 시계 0칸 · 휘슬 줄이 다 그려진 뒤에 풀림 · 그 뒤 버튼 줄이 비었음 */
  const go = L.find((x) => x.t === "go");
  const endDone = !!(end && end.done);
  const bar = r.host ? r.host.querySelector(".w2-live-bar") : null;
  const barEmpty = !!bar && !bar.querySelector("button");
  return { ms, last, seqOK, overtake, early, ticksBefore: go ? go.ticksBefore : -1, goPresent: !!(go && go.present), endDone, barEmpty,
    nPush: pushes.length, mine: pushes.filter((p) => p.mine).length };
}
const infoKey = (i) => (i ? JSON.stringify([i.teamGoals, i.oppGoals, i.res, i.myGoals, i.assists, i.defense, i.mineCards, i.mineSuccess, i.oppStops,
  i.decisive, i.rating, i.saved, (i.cards || []).map((c) => [c.k, c.min, c.kind, c.mine, c.result, c.judge, c.score.join(":")])]) : "null");

const SEEDS = [11, 202, 777, 5150, 31337, 4242];
const POS_OF = (seed) => ["fw", "wg", "mf", "df"][seed % 4];
const HAND = (k) => (k === "defend" ? 0.8 : 0.3);
async function sweep(over) {
  const out = [];
  for (const seed of SEEDS) {
    const r = await liveMatch(Object.assign({ seed, pos: POS_OF(seed), hand: HAND }, over || {}));
    out.push(Object.assign({ seed, info: r.info, settled: r.settled }, readMatch(r)));
    r.close();
  }
  return out;
}
const okC1 = (rows) => rows.length > 0 && rows.every((x) => x.settled && x.seqOK);
const okC2 = (rows) => rows.every((x) => x.overtake === 0 && x.early === 0);
const okC3 = (rows) => rows.every((x) => x.goPresent && x.ticksBefore === 0 && x.endDone && x.barEmpty);

(async () => {
  /* ══════════ C-1 · C-2 · C-3 — 보통 · ⏩ · 🤖 ══════════ */
  const base = await sweep();
  const fast = await sweep({ fast: true });
  const auto = await sweep({ auto: true });
  const mineN = base.reduce((a, x) => a + x.mine, 0);
  console.log(`   🔎 측정 조건 — 시드 ${SEEDS.join("/")} · 포지션 네 자리를 돌아가며 · 1막 세계(전력 58 · 상대 58 · 컨디션 51) · 내 판 손 s(🧱 .8 · 그 밖 .3) · 🔥 내 순간 줄 ${mineN}장 · 타이머 뭉갬(시간을 안 재요)`);
  check(mineN > 0, `C-0. 🔎 **내 순간이 실제로 섞였다** — 🔥 줄 ${mineN}장(0이면 판을 여는 갈래의 순서를 안 잰 것)`);
  for (const [tag, rows] of [["보통", base], ["⏩ 빨리감기", fast], ["🤖 자동", auto]]) {
    check(okC1(rows), `C-1. ⏱️ [${tag}] 시계가 1′부터 마지막 분까지 **한 칸씩** 흐른다 — ${rows.map((x) => `${x.ms.length}칸/${x.last}′`).join(" · ")}`
      + (okC1(rows) ? "" : `\n     🔴 ${rows.filter((x) => !x.seqOK).map((x) => `시드 ${x.seed}: ${x.ms.slice(0, 6).join(",")}…${x.ms.slice(-3).join(",")} (마지막 분 ${x.last})`).join(" · ")}`));
  }
  const sameTicks = base.every((x, i) => x.ms.length === fast[i].ms.length && x.ms.length === auto[i].ms.length);
  check(sameTicks, `C-1b. ⏩ · 🤖는 **간격만** 바꾼다 — 세 모드의 틱 수가 판마다 같다`);
  check(okC2(base) && okC2(fast), `C-2. 🎞️ 시계가 줄을 **추월하지 않는다** — 칸을 넘길 때 그리던 줄 0 · 자기 분보다 먼저 그려진 줄 0 (판 ${base.length + fast.length}개 · 줄 ${base.concat(fast).reduce((a, x) => a + x.nPush, 0)}장)`);
  check(okC3(base) && okC3(fast), `C-3. 🏁 **결과가 경기보다 먼저 안 뜬다** — 🏁 전 시계 0칸 · 휘슬 줄을 다 그린 뒤에 풀림 · 그 뒤 버튼 줄이 빔 (판 ${base.length + fast.length}개)`);

  /* ══════════ C-4 — 진짜 타이머 ↔ 뭉갠 타이머 ══════════ */
  {
    const a = await liveMatch({ seed: 202, pos: "mf", hand: HAND, realTimers: true });
    const ra = readMatch(a); a.close();
    const b = await liveMatch({ seed: 202, pos: "mf", hand: HAND });
    const rb = readMatch(b); b.close();
    const same = a.settled && ra.ms.join() === rb.ms.join() && infoKey(a.info) === infoKey(b.info);
    check(same, `C-4. 🕰️ **벽시계를 안 잰다** — 진짜 타이머(경기 1분 = 90ms)와 뭉갠 타이머의 틱 수열 · 결과가 비트 같다 (${ra.ms.length}칸 · ${a.info ? `${a.info.teamGoals}:${a.info.oppGoals}` : "?"})`);
  }

  /* ══════════ C-5 — 화면 ↔ 화면 없이 ══════════ */
  {
    const bad = [];
    for (const seed of SEEDS) {
      const a = await liveMatch({ seed, pos: POS_OF(seed), hand: () => 0.5 });
      const b = await liveMatch({ seed, pos: POS_OF(seed), headless: true });
      if (infoKey(a.info) !== infoKey(b.info)) bad.push(seed);
      a.close(); b.close();
    }
    check(bad.length === 0, `C-5. 📺 **화면의 스코어 · 승패가 성적에 안 닿는다** — 화면 위 한 판과 화면 없는 한 판의 결과가 비트 같다 (시드 ${SEEDS.length}개 · s 0.5)`
      + (bad.length ? `\n     🔴 갈린 시드: ${bad.join(" · ")} — 연출이 카드의 결과를 건드리고 있어요` : ""));
  }

  /* ══════════ C-6 — 세대 가드 ══════════ */
  async function genProbe(muts) {
    let remounted = false, newHost = null;
    const r = await liveMatch({ seed: 5150, pos: "wg", hand: HAND, muts,
      onClock: (m, env) => {
        if (remounted || m !== 30) return;
        remounted = true;
        newHost = env.w.document.createElement("div");
        env.w.document.body.appendChild(newHost);
        env.Sc.mount(newHost, { home: "다음 경기", away: "상대", myName: "윙어" });
      } });
    const stale = r.log.filter((x) => x.t === "clock" && x.m > 30 && x.ok === true).length;
    const leaked = newHost ? newHost.querySelectorAll(".w2-feed .w2-card").length : -1;
    r.close();
    return { info: r.info, settled: r.settled, stale, leaked, remounted };
  }
  const g = await genProbe(null);
  const okG = (x) => x.remounted && x.settled && x.info === null && x.stale === 0 && x.leaked === 0;
  check(okG(g), `C-6. 🎬 **경기 도중 다음 경기가 깔리면 옛 시계가 끊긴다** — 30′에 새 경기를 깜 · 드라이버 ${g.info === null ? "null" : "결과를 냄"} · 옛 세대로 살아남은 칸 ${g.stale} · 새 피드에 섞인 옛 줄 ${g.leaked}`);

  /* ══════════ C-7 — 안전망 타임아웃 0 ══════════ */
  async function hangProbe(muts) {
    let hung = false;
    const r = await liveMatch({ seed: 11, pos: "fw", hand: HAND, muts, cap: 3000,
      onClock: (m, env) => {
        if (hung) return;
        hung = true;
        const raw = env.Sc.push;
        env.Sc.push = (card, gg) => (card.kind === "end" ? new Promise(() => {}) : raw(card, gg));
      } });
    r.close();
    return { settled: r.settled, hung };
  }
  const hp = await hangProbe(null);
  check(hp.hung && !hp.settled, `C-7. 🛟 **안전망 타임아웃이 없다** — 휘슬 줄이 끝내 안 그려지면 드라이버가 **안 풀린다** (뭉갠 타이머로 3,000틱을 기다림 · 풀림 ${hp.settled})`
    + `\n     🔑 타임아웃이 있으면 뭉갠 타이머에서 **곧바로** 풀립니다 — 자가 복구가 실패를 삼키는 자리(11번 §7-3 #23)`);

  /* ══════════ 🧪 변이 ══════════ */
  if (!(okC1(base) && okC2(base) && okC3(base))) console.log("   ⚠️ 기준선이 빨간불이라 변이 검증을 건너뜁니다");
  else {
    const one = async (over) => (await sweep(over)).slice(0, 3);
    check(!okC1(await one({ muts: MUT.M_SKIP })), `변이-M_SKIP(칸 건너뛰기) → C-1이 빨간불`);
    const rf = await sweep({ muts: MUT.M_FASTSKIP, fast: true });
    const rn = await sweep({ muts: MUT.M_FASTSKIP });
    check(!okC1(rf) && okC1(rn), `변이-M_FASTSKIP(⏩에서만 건너뛰기) → C-1[⏩]만 빨간불 · 보통은 초록 (검사가 보는 세계에서만 사라지는 시계)`);
    const r2 = await one({ muts: MUT.M_NOWAIT });
    check(!okC2(r2), `변이-M_NOWAIT(흐름 줄을 안 기다림) → C-2가 빨간불 (추월 ${r2.reduce((a, x) => a + x.overtake, 0)}번)`);
    check(!okC3(await one({ muts: MUT.M_EARLY })), `변이-M_EARLY(휘슬 줄보다 먼저 끝냄) → C-3이 빨간불`);
    {
      const a = await liveMatch({ seed: 202, pos: "mf", hand: HAND, realTimers: true, muts: MUT.M_WALL });
      const ra = readMatch(a); a.close();
      const b = await liveMatch({ seed: 202, pos: "mf", hand: HAND, muts: MUT.M_WALL });
      const rb = readMatch(b); b.close();
      check(ra.ms.join() !== rb.ms.join(), `변이-M_WALL(분을 벽시계에서 읽음) → C-4가 빨간불 (진짜 ${ra.ms.length}칸 ↔ 뭉갬 ${rb.ms.length}칸)`);
    }
    {
      let diff = 0;
      for (const seed of SEEDS.slice(0, 4)) {
        const a = await liveMatch({ seed, pos: POS_OF(seed), hand: () => 0.5, muts: MUT.M_SCENEWRITE });
        const b = await liveMatch({ seed, pos: POS_OF(seed), headless: true });
        if (infoKey(a.info) !== infoKey(b.info)) diff += 1;
        a.close(); b.close();
      }
      check(diff > 0, `변이-M_SCENEWRITE(화면이 카드 결과를 고침) → C-5가 빨간불 (갈린 판 ${diff}/4)`);
    }
    const g2 = await genProbe(MUT.M_NOGEN);
    check(!okG(g2), `변이-M_NOGEN(드라이버가 세대를 무시) → C-6이 빨간불 (드라이버 ${g2.info === null ? "null" : "결과를 냄"} · 살아남은 칸 ${g2.stale})`);
    const h2 = await hangProbe(MUT.M_SAFETY);
    check(h2.settled, `변이-M_SAFETY(안전망 타임아웃) → C-7이 빨간불 (휘슬 없이 풀림 ${h2.settled})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
