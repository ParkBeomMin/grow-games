/* 🏛️ 통산 마일스톤 — 커리어가 쌓은 누적 기록의 고비를 넘으면 축하하고 전당 가치에 얹어요.
 *
 * 여기서 못 박는 건 넷이에요.
 *   ① 통산 카운팅이 seasons[]의 raw를 그대로 더한 값이다 (별도 저장·마이그레이션 없음)
 *   ② 고비를 넘는 순간 **딱 한 번** 잡힌다 — 이미 넘은 뒤에는 다시 안 준다, 한 시즌에
 *      둘을 한꺼번에 넘으면 둘 다 잡는다
 *   ③ 문턱이 실제 시즌 생산과 맞다 — 좋은 커리어는 여러 개를 넘되, 전설 구간(3000안타·
 *      5000탈삼진)은 평범한 커리어로는 안 닿는다 (2026-08 실측 기준)
 *   ④ 결산·전당·점수에 실제로 배선돼 있다 (finishSeason·careerScore·seasonReport)
 *
 * 산식은 소스에서 그대로 떼어다 굴려요 — 값을 옮겨 적지 않아요(growth-test와 같은 방식). */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/rookie";
const SRC = fs.readFileSync(`${BASE}/career.js`, "utf8");
const CSS = fs.readFileSync(`${BASE}/style.css`, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };
const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ── 진짜 산식을 소스에서 떼어 와요 (MILESTONES ~ newMilestones, milestoneHTML은 S/DOM이 필요해 제외) ──
const a = SRC.indexOf("const MILESTONES = [");
const b = SRC.indexOf("function milestoneHTML");
check(a > 0 && b > a, "career.js에서 마일스톤 산식을 떼어 왔다");
const M = new Function(SRC.slice(a, b) + "\n return { MILESTONES, careerCounts, MILE_PV, mileScore, newMilestones };")();

// ── ① 구조 · 통산 합산 ─────────────────────────────────────────
guard("구조·합산", () => {
  for (const m of M.MILESTONES) {
    check(["batter", "pitcher"].includes(m.pos), `${m.name} — 시점이 batter/pitcher다 (${m.pos})`);
    const asc = m.marks.every((v, i) => i === 0 || v > m.marks[i - 1]);
    check(asc && m.marks.length >= 3, `${m.name} — 고비가 오름차순으로 3개 이상이다 (${m.marks.join("·")})`);
  }
  // seasons[]의 raw를 그대로 더해요 — 별도 필드가 아니에요
  const seasons = [{ raw: { hits: 150, hr: 20, sb: 30 } }, { raw: { hits: 160, hr: 25, sb: 10 } }];
  const c = M.careerCounts(seasons);
  check(c.hits === 310 && c.hr === 45 && c.sb === 40, `통산이 raw의 합이다 (안타 ${c.hits} · 홈런 ${c.hr} · 도루 ${c.sb})`);
  // 없는/빈 값도 안 터져요 (마이그레이션이 없어요 — 옛 세이브 안전)
  check(M.careerCounts(undefined).hits === 0 && M.careerCounts([{}]).k === 0, "seasons가 없거나 raw가 비어도 0으로 센다");
  check(M.mileScore(undefined) === 0 && M.mileScore({}) === 0, "miles가 없어도 점수가 0이다");
});

// ── ② 고비를 넘는 순간 딱 한 번 ────────────────────────────────
guard("한 번만", () => {
  const at = (v) => ({ hits: v, hr: 0, sb: 0, k: 0, wins: 0, saves: 0 });
  const cross = M.newMilestones(at(990), at(1010), 7);
  check(cross.length === 1 && cross[0].key === "hits" && cross[0].n === 1000 && cross[0].y === 7,
    `990→1010이면 안타 1000을 그 해에 딱 한 번 잡는다 (${cross.map((x) => x.n).join(",") || "없음"})`);
  const already = M.newMilestones(at(1010), at(1200), 8);
  check(already.length === 0, `이미 넘은 뒤에는 다시 안 준다 (1010→1200 · ${already.length}개)`);
  const twice = M.newMilestones(at(990), at(1600), 9).filter((x) => x.key === "hits");
  check(twice.length === 2 && twice[0].n === 1000 && twice[1].n === 1500,
    `한 시즌에 둘을 한꺼번에 넘으면 둘 다 잡는다 (990→1600 · ${twice.map((x) => x.n).join(",")})`);
  // 뒤 고비일수록 전당 가치가 크다
  check(M.MILE_PV.every((v, i) => i === 0 || v > M.MILE_PV[i - 1]), `전당 가치가 뒤 고비일수록 가파르다 (${M.MILE_PV.join("·")})`);
});

/* ── ③ 문턱이 실제 시즌 생산과 맞는가 (2026-08 실측: 진짜 게임 한 시즌 자동판정) ──
 * 타자 능력치100 안타148·홈런23·도루39 / 140 안타191·홈런45·도루67
 * 선발 능력치100 탈삼진302·다승8 / 140 탈삼진403·다승12
 * 이 값이 크게 바뀌면(타격/투구 모델을 뜯으면) 여기서 다시 재야 해요. */
guard("문턱 보정", () => {
  const career = (raw, yrs, pos) => {
    const seasons = [];
    let prev = { hits: 0, hr: 0, sb: 0, k: 0, wins: 0, saves: 0 }; const got = [];
    for (let y = 1; y <= yrs; y++) { seasons.push({ raw }); const now = M.careerCounts(seasons); got.push(...M.newMilestones(prev, now, y)); prev = now; }
    return { got, counts: M.careerCounts(seasons) };
  };
  const midBat = career({ hits: 148, hr: 23, sb: 39 }, 14, "batter");
  const eliteBat = career({ hits: 191, hr: 45, sb: 67 }, 16, "batter");
  const midPit = career({ k: 302, wins: 8 }, 14, "pitcher");
  const elitePit = career({ k: 403, wins: 12 }, 16, "pitcher");
  console.log(`   타자 보통 14시즌 → ${midBat.counts.hits}안타 ${midBat.counts.hr}홈런 · 마일스톤 ${midBat.got.length}개`);
  console.log(`   타자 엘리트 16시즌 → ${eliteBat.counts.hits}안타 ${eliteBat.counts.hr}홈런 ${eliteBat.counts.sb}도루 · ${eliteBat.got.length}개`);
  console.log(`   선발 보통 14시즌 → ${midPit.counts.k}탈삼진 ${midPit.counts.wins}승 · ${midPit.got.length}개`);
  console.log(`   선발 엘리트 16시즌 → ${elitePit.counts.k}탈삼진 ${elitePit.counts.wins}승 · ${elitePit.got.length}개`);
  // 좋은 커리어는 여러 개를 넘어요 (목표의 척추가 생겨요)
  check(midBat.got.length >= 6, `타자 보통도 통산 고비를 여럿 넘는다 (${midBat.got.length}개)`);
  check(midPit.got.length >= 4, `선발 보통도 통산 고비를 여럿 넘는다 (${midPit.got.length}개)`);
  check(eliteBat.got.length >= 10 && elitePit.got.length >= 7, `엘리트는 더 많이 넘는다 (타자 ${eliteBat.got.length} · 투수 ${elitePit.got.length})`);
  // 전설 구간은 평범한 커리어로는 안 닿아요 (문턱을 낮추면 여기가 빨간불이에요)
  const reached = (r, n) => r.got.some((g) => g.n === n);
  check(!reached(midBat, 3000) && !reached(midPit, 5000), "전설 구간(3000안타·5000탈삼진)은 보통 커리어로는 안 닿는다");
  // 대신 엘리트 장수 커리어는 닿아요 (문턱을 너무 올리면 여기가 빨간불이에요)
  check(reached(eliteBat, 3000) && reached(elitePit, 5000), "엘리트 장수 커리어는 전설 구간에 닿는다");
});

// ── ④ 결산·점수·화면에 실제로 배선돼 있다 ──────────────────────
guard("배선", () => {
  const finSeg = SRC.slice(SRC.indexOf("function finishSeason"), SRC.indexOf("function moveFrom") > 0 ? SRC.indexOf("const moveFrom") : SRC.length);
  check(/const mileBefore = careerCounts\(S\.career\.seasons\);/.test(finSeg) && /newMilestones\(mileBefore,/.test(finSeg),
    "결산이 이번 시즌 전후 통산을 비교해 새 고비를 잡는다");
  check(/S\.career\.miles = \(S\.career\.miles \|\| \[\]\)\.concat\(gotMiles\)/.test(finSeg),
    "넘은 고비를 S.career.miles에 이어 담는다 (옛 세이브 안전)");
  check(/대기록 — \$\{def\.name\} \$\{nm\.n\} 돌파!/.test(finSeg), "결산 연출에 '대기록 … 돌파!' 축하가 뜬다");
  check(/mileScore\(c\)/.test(SRC.slice(SRC.indexOf("function careerScore"), SRC.indexOf("function careerScore") + 400)),
    "명예의 전당 점수(careerScore)에 마일스톤이 얹힌다");
  check(/\$\{milestoneHTML\(\)\}/.test(SRC), "결산 화면(seasonReport)에 통산 기록 블록이 그려진다");
  // CSS가 절대색을 안 쓰고 테마 변수를 쓴다 (새로 들어간 .mile-*)
  const mileCss = CSS.split("\n").filter((l) => /^\.mile-/.test(l.trim())).join("\n");
  const hex = mileCss.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  check(mileCss.length > 100 && hex.length === 0 && /var\(--/.test(mileCss), `🏛️ 통산 기록 CSS가 테마 변수만 쓴다 (절대색 ${hex.join(",") || "없음"})`);
});

// ── ⑤ 한 경기 대기록 (feats) — 드물어야 특별하다 ────────────────
guard("한 경기 대기록", () => {
  const fa = SRC.indexOf("const FEATS = {");
  const featBlock = SRC.slice(fa, SRC.indexOf("\n  }", SRC.indexOf("function rollFeats")) + 4);
  const FEATS = new Function(SRC.slice(fa, SRC.indexOf("const MILE_PV")) + "\n return FEATS;")();
  for (const t in FEATS) check(["batter", "pitcher"].includes(FEATS[t].pos) && FEATS[t].pv > 0, `${FEATS[t].name} — 시점·전당 가치가 있다`);
  check(FEATS.perfect.pv > FEATS.nohit.pv, "퍼펙트게임이 노히터보다 전당 가치가 크다");

  const clampF = (v, a, b) => Math.min(b, Math.max(a, v));
  const mkRoll = (S, seed) => {
    const M = Object.assign(Object.create(Math), { random: mulberry32(seed) });
    return new Function("S", "clamp", "proLog", "window", "Math", featBlock + "\n return rollFeats;")(S, clampF, () => {}, {}, M);
  };
  const HI = { velocity: 140, control: 140, breaking: 140, contact: 140, power: 140, run: 140, defense: 140, stamina: 140 };
  const pit = (role) => ({ pos: "pitcher", role: role || "선발 투수", stats: { ...HI }, career: { feats: [] }, proYear: 5 });
  const bat = () => ({ pos: "batter", role: "4번 타자", stats: { ...HI }, career: { feats: [] }, proYear: 5 });

  // 게이팅 — 노히터는 완봉(무실점) 선발 등판에만
  let S = pit(); let roll = mkRoll(S, 1);
  for (let i = 0; i < 300; i++) roll({ ip: 7, k: 10, runs: 1 }, true);       // 실점 있음
  check(S.career.feats.length === 0, "노히터는 실점이 있으면 안 터진다 (실점 경기 300판)");
  S = pit(); roll = mkRoll(S, 2);
  for (let i = 0; i < 300; i++) roll({ ip: 7, k: 10, runs: 0 }, true);       // 완봉
  check(S.career.feats.length > 0 && S.career.feats.every((f) => f.t === "nohit" || f.t === "perfect"),
    `완봉 선발이면 노히터/퍼펙트가 터진다 (${S.career.feats.length}/300판)`);
  S = pit("마무리 투수"); roll = mkRoll(S, 3);
  for (let i = 0; i < 300; i++) roll({ ip: 1, k: 2, runs: 0 }, true);
  check(S.career.feats.length === 0, "선발이 아니면 노히터가 안 터진다 (마무리 300판)");
  // 타자 — 3홈런은 멀티홈런 쇼, 저활약은 대기록 없음
  S = bat(); roll = mkRoll(S, 4);
  check(roll({ ab: 5, hits: 4, hr: 3 }, true) !== null && S.career.feats[0].t === "multihr", "한 경기 3홈런이면 멀티홈런 쇼가 남는다");
  S = bat(); roll = mkRoll(S, 5);
  for (let i = 0; i < 300; i++) roll({ ab: 4, hits: 1, hr: 0 }, true);
  check(S.career.feats.length === 0, "안타 하나짜리 경기로는 대기록이 안 나온다");

  // 빈도 실측 — 커리어당 드물게, 능력치를 따라 늘되 과하지 않게
  const pois = (rnd, lam) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; };
  const careerFeats = (pos, stat, seed) => {
    const keys = pos === "pitcher" ? ["velocity", "control", "breaking"] : ["contact", "power", "run"];
    const st = {}; for (const k of ["velocity", "control", "breaking", "contact", "power", "run", "defense", "stamina"]) st[k] = stat;
    const S2 = { pos, role: pos === "pitcher" ? "선발 투수" : "4번 타자", stats: st, career: { feats: [] }, proYear: 1 };
    const rnd = mulberry32(seed);
    const r = mkRoll(S2, seed + 7);
    const era = stat >= 130 ? 2.8 : stat >= 100 ? 3.4 : 4.2;
    for (let y = 1; y <= 14; y++) {
      S2.proYear = y;
      if (pos === "pitcher") for (let g = 0; g < 29; g++) { const ip = 5 + Math.floor(rnd() * 4); r({ ip, k: 8, runs: pois(rnd, era * ip / 9) }, true); }
      else for (let g = 0; g < 144; g++) {
        const ab = 4; let hits = 0, hr = 0; const ph = clampF(0.24 + (stat - 90) / 100 * 0.10, 0.15, 0.42);
        for (let i = 0; i < ab; i++) if (rnd() < ph) { hits++; if (rnd() < clampF(0.10 + (stat - 90) / 100 * 0.12, 0.05, 0.32)) hr++; }
        r({ ab, hits, hr, sb: 0 }, true);
      }
    }
    return S2.career.feats.length;
  };
  for (const pos of ["pitcher", "batter"]) {
    const avg = (stat) => { let s = 0; for (let i = 0; i < 200; i++) s += careerFeats(pos, stat, 2000 + i); return s / 200; };
    const lo = avg(95), hi = avg(145);
    console.log(`   ${pos === "pitcher" ? "투수" : "타자"} 14시즌 대기록 | 능력치95 ${lo.toFixed(2)}개 · 145 ${hi.toFixed(2)}개`);
    check(hi > lo + 0.5, `${pos} — 능력치가 높을수록 대기록이 는다 (${lo.toFixed(2)} → ${hi.toFixed(2)})`);
    check(hi <= 5, `${pos} — 엘리트도 커리어당 5개 미만이다 (${hi.toFixed(2)}) — 흔하면 특별하지 않아요`);
    check(lo < 1, `${pos} — 평범한 능력치는 커리어에 한 번 볼까 말까다 (${lo.toFixed(2)})`);
  }

  // 배선 — 정규시즌·가을야구 결과가 rollFeats를 부르고, 통산 기록 블록이 대기록을 그린다
  const proSeg = SRC.slice(SRC.indexOf("function finishProGame"), SRC.indexOf("function finishPostGame"));
  const postSeg = SRC.slice(SRC.indexOf("function finishPostGame"), SRC.indexOf("function playFeeds"));
  check(/rollFeats\(perf, win\)/.test(proSeg) && /rollFeats\(perf, win\)/.test(postSeg), "정규시즌·가을야구 종료가 rollFeats를 부른다");
  check(/mile-feats/.test(SRC) && /통산 대기록/.test(SRC), "통산 기록 블록에 대기록 줄(🎇 통산 대기록)이 그려진다");
});

console.log(fail ? `\n❌ ${fail}개 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
