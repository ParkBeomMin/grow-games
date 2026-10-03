/* ⚽ 더 윙어 II 1막 — 👁️ **보이는 값 = 판정 값** (22번 §4-1 · 24번 §4-1 · 25번 계약 11 · 12 · 26번 §2)
 *
 * ① 에서 받아들인 원칙 「화면에 적힌 숫자가 곧 판정 숫자」를 다섯 자리에서 봅니다 — 화면이 하나를 말하고 판정이 다른 하나를 쓰면 그게 거짓말이에요.
 *   V-1  🎲 도전 확률 — 조각(실력 · 상황) 합 + 50 == 카드의 % == **판정에 쓴 %**(뜰 때 얼린 난수 u로 `u × 100 < %`) · 진짜 화면이 그 %를 그림
 *   V-2  🏋️ 훈련 버튼 「효율 ×…」 == **성장에 곱해진 값** — 그 주의 능력치 증가 = 4.0 × 버튼의 효율(컨디션 **−10 전** 값 · 24번 §2)
 *   V-2c 📈 효율 곡선 = clamp((c − 20) ÷ 60, 0.10, 1.10) — 상한 1.10 · 바닥 컨디션 20(22번 §4-1)
 *   V-3  🫀 컨디션 게이지 `{ zone, mul }` == 엔진 `condMul` — 51은 「보통」 × 1.00(결정 F) · 다섯 구간 이름마다 CSS가 있음 · 화면 글자 = 그 값
 *   V-4  📋 평가서 칸 합 == `total` · 구간 == 문턱표로 다시 매긴 구간(중간 · 최종 둘 다)
 *   V-4b 🔢 **보이는 칸의 합 == 보이는 합계** — 진짜 `scenes.js`가 그린 평가서에서 칸 숫자(한 자리)를 더하면 「합계」와 같다(25번 §8 10-03 결정 ① · 최대 나머지법)
 *   V-4c 📏 **구간 == 보이는 합계와 한 자리 문턱**(69.9 · 60.4 · 51.3) — 그린 도장 「구간 「…」」가 화면의 합계로 매긴 구간과 같다 · 문턱 바로 위 · 0.1 아래 판을 일부러 만들어 넣음
 *   V-5  📝 감독 의견은 **점수 0** — 🤝 신뢰를 −6 · 0 · +6으로 바꿔도 칸 · 합계가 한 톨도 안 움직이고 의견 한 줄만 바뀜
 *   + 변이 다섯(파일 안)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { PAGE_DIR, bootPage, pageMutsOK, wait, mutsOKIn } = require("./_load.js");
const { boot, runAct, tap } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const TRAIN_UP = 4.0;      // 🔒 24번 §2 확정 계수(훈련 한 번 +4.0 × 효율) — 박은 값(소스에서 안 읽음)
const r2 = (v) => Math.round(v * 100) / 100;

const MUT = {
  /* V-1 — 판정에 숨은 손(+15) */
  M_HIDDEN: { "events.js": [[/ok = ev\.u \* 100 < o\.pct;/, "ok = ev.u * 100 < o.pct + 15;"]] },
  /* V-2 — 효율을 −10 **뒤** 컨디션으로(버튼과 어긋남) */
  M_EFFAFTER: { "game.js": [[/const e = effOf\(S\.cond\);/, "const e = effOf(S.cond + TUNE.COND_TRAIN);"]] },
  /* V-2c — 효율 상한을 올림 */
  M_EFFCAP: { "game.js": [[/EFF_MIN: 0\.10, EFF_MAX: 1\.10,/, "EFF_MIN: 0.10, EFF_MAX: 1.25,"]] },
  /* V-3 — 게이지 구간을 엔진 중립에서 떼어 냄(51이 「처짐」이 됨) */
  M_ZONE: { "game.js": [[/\{ lo: 45, zone: "normal", label: "보통" \}/, '{ lo: 52, zone: "normal", label: "보통" }']] },
};
const MUT_S = {
  /* V-4 — 합계에 숨은 가산 */
  M_TOTAL: [[/const total = t10\.reduce\(\(a, b\) => a \+ b, 0\) \/ 10;/, "const total = t10.reduce((a, b) => a + b, 0) / 10 + 0.5;"]],
  /* V-5 — 🤝 신뢰가 합계에 들어감 */
  M_TRUST: [[/const total = t10\.reduce\(\(a, b\) => a \+ b, 0\) \/ 10;/, "const total = t10.reduce((a, b) => a + b, 0) / 10 + (Number(S.trust) || 0) * 0.5;"]],
  /* V-4b — 10-03 전으로: 칸마다 따로 반올림 · 합계는 원래 합의 반올림(칸 합과 0.1 갈릴 수 있음) */
  M_EACH: [[/const t10 = tenths\(\[body, skill, record, stagePt, test\]\);/, "const t10 = [body, skill, record, stagePt, test].map((v) => Math.round(v * 10));"],
    [/const total = t10\.reduce\(\(a, b\) => a \+ b, 0\) \/ 10;/, "const total = Math.round((body + skill + record + stagePt + test) * 10) / 10;"]],
  /* V-4c — 구간을 원래 합(두 자리 · 24번 문턱)으로 */
  M_RAWTIER: [[/const tier = tierOf\(total\);/, 'const tier = ((x) => (x >= 69.93 ? "top" : x >= 60.37 ? "high" : x >= 51.31 ? "mid" : "low"))(body + skill + record + stagePt + test);']],
};
const SSRC = fs.readFileSync(path.join(PAGE_DIR, "sheet.js"), "utf8");
{
  const bad = pageMutsOK(MUT).concat(mutsOKIn(SSRC, MUT_S, "sheet.js"));
  check(bad.length === 0, `0. 변이 정규식이 지금 소스에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
const sheetOf = (src) => new Function("window", `${src}\nreturn window.W2Sheet;`)({});

/* ══════════ V-1 ══════════ */
async function v1(muts, seeds) {
  const out = { tries: 0, bad: [], partsBad: [], shown: [], pcts: [], skills: [] };
  for (const seed of seeds) {
    const env = boot({ seed, pos: ["fw", "wg", "mf", "df"][seed % 4], gender: seed % 2 ? "m" : "f", auto: true, muts, policy: { tryAt: 0 } });
    const r = await runAct(env);
    const S = r.S;
    const EV = env.w.W2Events;
    for (const l of (S.evLog || []).filter((x) => x.k === "try")) {
      out.tries += 1;
      const u = EV.draws(S, l.w).u;
      if (l.ok !== (u * 100 < l.pct)) out.bad.push(`${seed}/${l.w}주 ${l.id}: % ${l.pct} · u ${(u * 100).toFixed(1)} → ${l.ok}`);
    }
    for (const c of env.seen.card) for (const o of c.opts || []) if (o.k === "try") {
      out.pcts.push(o.pct); out.skills.push(o.parts[0].v);
      const sum = 50 + o.parts.reduce((a, p) => a + p.v, 0);
      if (sum !== o.pct) out.partsBad.push(`${c.id}: 50 + ${o.parts.map((p) => p.v).join(" + ")} = ${sum} ≠ ${o.pct}`);
      if (out.shown.length < 3) out.shown.push(JSON.parse(JSON.stringify(c)));
    }
    env.w.close();
  }
  return out;
}

(async () => {
  const SEEDS = [41, 42, 43, 44];
  const a = await v1(null, SEEDS);
  check(a.tries >= 20 && a.bad.length === 0 && a.partsBad.length === 0,
    `V-1. 🎲 도전 ${a.tries}번 — 조각 합 + 50 == 카드의 % · **판정 = 뜰 때 얼린 u로 \`u × 100 < 그 %\`** (어긋남 ${a.bad.length} · 조각 어긋남 ${a.partsBad.length})`
    + (a.bad.length ? `\n     🔴 ${a.bad.slice(0, 3).join(" · ")}` : "") + (a.partsBad.length ? `\n     🔴 ${a.partsBad.slice(0, 3).join(" · ")}` : ""));
  /* V-1c — 표시 %는 28~72 안(실력 ±10 + 상황 ±12 — 10 · 90 바닥 · 천장이 안 닿음 · 24번 §4-3) */
  {
    const lo = Math.min(...a.pcts), hi = Math.max(...a.pcts), sMax = Math.max(...a.skills.map(Math.abs));
    const capHit = a.skills.filter((v) => Math.abs(v) === 10).length;
    check(a.pcts.length > 0 && lo >= 28 && hi <= 72 && sMax <= 10, `V-1c. 📏 표시 % ${lo}~${hi} ⊂ 28~72(바닥 10 · 천장 90이 안 닿음) · 실력 조각 |최대| ${sMax} ≤ 10 (카드 ${a.pcts.length}장 · 상한에 닿은 실력 ${capHit}장)`);
  }
  /* 진짜 화면이 그 %를 그리는가 */
  {
    const W = bootPage({ fastTimers: true });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const bad = [];
    for (const c of a.shown) {
      const p = W.W2Scenes.card(c);
      await wait(4);
      const layer = W.document.getElementById("w2-layer");
      const t = layer.textContent;
      const o = c.opts.find((x) => x.k === "try");
      if (t.indexOf(`${o.pct}%`) < 0) bad.push(`${c.id}: ${o.pct}%가 화면에 없음`);
      const other = [...t.matchAll(/(\d+)%/g)].map((m) => +m[1]).filter((n) => n !== o.pct);
      if (other.length) bad.push(`${c.id}: 다른 % ${other.join(",")}가 그려짐`);
      const btn = [...layer.querySelectorAll("button")].find((b) => /넘긴다|신경 쓰지|무난|듣기만|사양|따라간다|집중|내 방식|가게|말하지|돕는다/.test(b.textContent)) || layer.querySelector("button");
      if (btn) btn.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
      await p;
    }
    W.close();
    check(a.shown.length >= 3 && bad.length === 0, `V-1b. 🖼️ 진짜 \`scenes.js\`가 카드의 %를 그대로 그린다 — 카드 ${a.shown.length}장 (다른 % 숫자 0)` + (bad.length ? `\n     🔴 ${bad.join(" · ")}` : ""));
  }

  /* ══════════ V-2 — 훈련 효율 ══════════ */
  async function v2(muts) {
    const snaps = [];
    const env = boot({ seed: 77, pos: "mf", auto: true, muts, policy: { tryAt: 101, promise: false, flag: false,
      home: (Sx, e) => {
        const D = e.w.document;
        const effs = Object.fromEntries([...D.querySelectorAll(".w2-tbtn")].map((b) => [b.dataset.k, Number((b.querySelector(".w2-tbtn-eff").textContent.match(/×([\d.]+)/) || [])[1])]));
        const gtxt = (D.querySelector(".w2-gauge-text") || {}).textContent || "";
        const zone = (D.querySelector(".w2-gauge") || { dataset: {} }).dataset.zone;
        const keys = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
        const ch = Sx.cond < 50 ? { k: "rest" } : { k: "train", stat: keys[Sx.week % 6] };
        snaps.push({ week: Sx.week, cond: Sx.cond, stats: Object.assign({}, Sx.stats), effs, choice: ch, gtxt, zone });
        return ch;
      } } });
    const r = await runAct(env);
    const S = r.S;
    const E = env.w.WingerEngine;
    const G = env.w.W2Game;
    env.w.close();
    const bad = [], effBad = [], gaugeBad = [];
    let trains = 0, ratios = [];
    for (let i = 0; i < snaps.length; i++) {
      const s0 = snaps[i], s1 = snaps[i + 1] || { stats: S.stats };
      const vals = Object.values(s0.effs);
      if (!(vals.length === 6 && vals.every((v) => v === vals[0]))) effBad.push(`${s0.week}주 버튼마다 효율이 다름 ${vals.join(",")}`);
      const want = G.gauge(s0.cond);
      if (!new RegExp(`경기 ×${want.mul.toFixed(2)}`).test(s0.gtxt) || s0.zone !== want.zone || Math.abs(want.mul - r2(E.condMul(Math.round(s0.cond)))) > 1e-9) gaugeBad.push(`${s0.week}주 「${s0.gtxt}」 zone ${s0.zone} ↔ ${want.zone} ×${want.mul}`);
      if (s0.choice.k !== "train") continue;
      trains += 1;
      const k = s0.choice.stat;
      const got = r2(s1.stats[k] - s0.stats[k]);
      const exp = r2(Math.min(100, r2(s0.stats[k] + TRAIN_UP * s0.effs[k])) - s0.stats[k]);
      if (Math.abs(got - exp) > 1e-9) bad.push(`${s0.week}주 ${k}: +${got} ≠ ${TRAIN_UP} × ${s0.effs[k]} (컨디션 ${s0.cond})`);
      if (s0.effs[k] > 0 && got > 0 && s0.stats[k] + TRAIN_UP * s0.effs[k] < 100) ratios.push(got / s0.effs[k]);
      for (const o of Object.keys(s0.stats)) if (o !== k && Math.abs(s1.stats[o] - s0.stats[o]) > 1e-9) bad.push(`${s0.week}주 ${o}가 훈련 안 했는데 움직임`);
    }
    return { trains, bad, effBad, gaugeBad, ratios, snaps: snaps.length };
  }
  const b = await v2(null);
  check(b.trains >= 15 && b.bad.length === 0 && b.effBad.length === 0, `V-2. 🏋️ 훈련 ${b.trains}주 — 그 주의 능력치 증가 == ${TRAIN_UP} × **버튼에 적힌 효율**(컨디션 −10 전) · 버튼 여섯의 효율이 같음 (어긋남 ${b.bad.length})`
    + (b.bad.length ? `\n     🔴 ${b.bad.slice(0, 3).join(" · ")}` : "") + (b.effBad.length ? `\n     🔴 ${b.effBad.slice(0, 2).join(" · ")}` : ""));
  check(b.gaugeBad.length === 0, `V-3b. 🫀 홈 화면 게이지 ${b.snaps}번 — 글자 「경기 ×…」와 \`data-zone\`이 그 컨디션의 \`gauge()\` · 엔진 \`condMul\`과 같다` + (b.gaugeBad.length ? `\n     🔴 ${b.gaugeBad.slice(0, 3).join(" · ")}` : ""));

  /* ══════════ V-2c — 효율 곡선(22번 §4-1 · 24번 §2) ══════════ */
  async function v2c(muts) {
    const W = bootPage({ fastTimers: true, muts });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const G = W.W2Game;
    const e = [];
    for (let c = 0; c <= 100; c++) e.push(G.effOf(c));
    W.close();
    /* 🔒 박은 값 — 바닥 컨디션 20 · 폭 60 · 효율 0.10~1.10 */
    const want = (c) => r2(Math.min(1.10, Math.max(0.10, (c - 20) / 60)));
    const bad = e.map((v, c) => [c, v]).filter(([c, v]) => Math.abs(v - want(c)) > 1e-9);
    const mono = e.every((v, i) => i === 0 || v >= e[i - 1]);
    return { ok: bad.length === 0 && mono && Math.max(...e) === 1.1 && Math.min(...e) === 0.1, bad, e };
  }
  const c2 = await v2c(null);
  check(c2.ok, `V-2c. 📈 효율 곡선 — 0~100 전부 clamp((c − 20) ÷ 60, 0.10, 1.10) · 줄지 않음 · 상한 ${Math.max(...c2.e)} · 바닥 ${Math.min(...c2.e)} · 51 → ×${c2.e[51]} · 80 → ×${c2.e[80]}` + (c2.bad.length ? `\n     🔴 ${c2.bad.slice(0, 3).map(([c, v]) => `${c}: ${v}`).join(" · ")}` : ""));

  /* ══════════ V-3 — 게이지 표 ══════════ */
  async function v3(muts) {
    const W = bootPage({ fastTimers: true, muts });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const G = W.W2Game, E = W.WingerEngine;
    const bad = [];
    let lastLo = -1;
    for (const z of G.ZONES) { if (!(z.lo > lastLo)) bad.push(`구간 문턱이 오름차순이 아님 ${z.lo}`); lastLo = z.lo; }
    for (let v = 0; v <= 100; v++) {
      const g = G.gauge(v);
      if (Math.abs(g.mul - r2(E.condMul(v))) > 1e-9) bad.push(`${v}: ×${g.mul} ≠ condMul ${E.condMul(v)}`);
      const zz = G.ZONES.filter((z) => v >= z.lo).pop();
      if (g.zone !== zz.zone) bad.push(`${v}: ${g.zone} ≠ 표 ${zz.zone}`);
    }
    const n51 = G.gauge(51);
    W.close();
    /* 🎨 구간 이름 ↔ CSS — 「보통」은 **기본 막대 색**(\`.w2-gauge-bar\`의 \`--zone-normal\` · 결정 F 「51 = 보통 무채색」)이라
     *    따로 \`[data-zone="normal"]\` 규칙이 없어도 됩니다. 나머지 넷은 규칙이 있어야 해요(없으면 그 구간이 「보통」 색으로 떨어짐) */
    const css = fs.readFileSync(path.join(PAGE_DIR, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const baseNormal = /\.w2-gauge-bar\s*\{[^}]*var\(--zone-normal\)/.test(css);
    const noCss = G.ZONES.map((z) => z.zone).filter((z) => !(new RegExp(`data-zone="${z}"`).test(css) || (z === "normal" && baseNormal)));
    return { bad, n51, noCss, ok: bad.length === 0 && n51.zone === "normal" && n51.label === "보통" && n51.mul === 1 && noCss.length === 0 };
  }
  const c = await v3(null);
  check(c.ok, `V-3. 🫀 게이지 = 판정과 같은 표 하나 — 0~100 전부 \`mul\` == r2(condMul) · 구간이 표대로 · **51 = 「${c.n51.label}」 × ${c.n51.mul.toFixed(2)}** · 다섯 구간 이름마다 CSS(\`data-zone\`) ${c.noCss.length ? `🔴 없음 ${c.noCss.join(",")}` : "있음"}`
    + (c.bad.length ? `\n     🔴 ${c.bad.slice(0, 3).join(" · ")}` : ""));

  /* ══════════ V-4 · V-5 ══════════ */
  const SH = sheetOf(SSRC);
  const K6 = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
  const mkS = (trust, i) => ({ pos: ["fw", "wg", "mf", "df"][i % 4], preset: "jiho", gender: "m", trust,
    stats: Object.fromEntries(K6.map((k, j) => [k, 48 + ((i * 7 + j * 11) % 45)])),
    record: { apps: 14, g: i % 5, a: (i * 3) % 7, d: (i * 5) % 30, cs: 2, sN: 20 + i, sSum: (20 + i) * (0.3 + (i % 7) / 10) },
    world: { cup: { done: true, stage: i % 6, name: "푸른잔디배" } }, leagueChamp: i % 9 === 0, test: { tech: i % 7, rating: 5 + (i % 5) }, story: { door: false } });
  function v45(Sh) {
    const bad4 = [], bad5 = [];
    for (let i = 0; i < 60; i++) {
      for (const final of [false, true]) {
        const s = Sh.compute(mkS(0, i), final);
        const sum = r2(s.cols.reduce((a2, x) => a2 + x.v, 0));
        if (Math.abs(sum - s.total) > 1e-9 || s.tier !== Sh.tierOf(s.total)) bad4.push(`#${i}${final ? " 최종" : " 중간"}: 칸 합 ${sum} ↔ total ${s.total} · ${s.tier}`);
      }
      const t = [-6, 0, 6].map((tr) => Sh.compute(mkS(tr, i), true));
      const same = t.every((x) => x.total === t[0].total && JSON.stringify(x.cols.map((q) => q.v)) === JSON.stringify(t[0].cols.map((q) => q.v)));
      const lines = new Set(t.map((x) => x.coach.line)).size;
      if (!same || lines < 2 || t.some((x) => x.coach.score !== 0)) bad5.push(`#${i}: 합계 ${t.map((x) => x.total).join("/")} · 의견 ${t.map((x) => x.coach.line).join("/")}`);
    }
    return { bad4, bad5 };
  }
  const d = v45(SH);
  check(d.bad4.length === 0, `V-4. 📋 평가서 120장(중간 · 최종) — 칸 합 == \`total\` · 구간 == 문턱표 (어긋남 ${d.bad4.length})` + (d.bad4.length ? `\n     🔴 ${d.bad4.slice(0, 3).join(" · ")}` : ""));
  check(d.bad5.length === 0, `V-5. 📝 감독 의견은 **점수 0** — 🤝 −6 · 0 · +6에서 칸 · 합계가 같고 의견 한 줄만 바뀜 (60판 · 어긋남 ${d.bad5.length})` + (d.bad5.length ? `\n     🔴 ${d.bad5.slice(0, 3).join(" · ")}` : ""));
  /* ══════════ V-4b · V-4c — 진짜 화면에 그려진 숫자로 ══════════ */
  const T1 = { top: 699, high: 604, mid: 513 };       // 🔒 25번 §8(10-03) — 한 자리 문턱 69.9 · 60.4 · 51.3을 0.1 단위 정수로 · 박은 값
  const TNAME = { top: "최상", high: "상", mid: "중", low: "하" };
  const tierOfShown = (t10) => (t10 >= T1.top ? "top" : t10 >= T1.high ? "high" : t10 >= T1.mid ? "mid" : "low");
  /* 문턱 바로 위 · 0.1 아래 판 — 속도 하나를 이분 탐색으로 움직여 **화면 합계가 문턱을 막 넘는 자리**를 찾아요.
   * 거기선 원래 합이 반올림 경계(문턱 − 0.05) 바로 위라, 원래 합 · 두 자리 문턱으로 가르면 한 칸 아래로 떨어져요 */
  function edgeFixtures(Sh) {
    const out = [];
    /* 손잡이 둘 — 나머지 다섯 능력치 L(밑바탕)과 골 g(기록 칸) · 속도 sp로 문턱을 막 넘는 자리를 찾아요 */
    const base = (L, g, sp) => ({ pos: "wg", preset: "jiho", gender: "m", trust: 0,
      stats: { shoot: L, pass: L, dribble: L, defense: L, stamina: L, speed: sp },
      record: { apps: 14, g, a: 3, d: 4, cs: 2, sN: 20, sSum: 13.2 }, world: { cup: { done: true, stage: 2, name: "푸른잔디배" } },
      leagueChamp: false, test: { tech: 3, rating: 7 }, story: { door: false } });
    const shown = (L, g, sp) => Math.round(Sh.compute(base(L, g, sp), true).total * 10);
    for (const T of [T1.top, T1.high, T1.mid]) {
      let found = false;
      for (let L = 40; L <= 88 && !found; L += 4) for (let g = 0; g <= 30 && !found; g++) {
        if (!(shown(L, g, 40) < T && shown(L, g, 88) >= T)) continue;
        let lo = 40, hi = 88;
        for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (shown(L, g, mid) >= T) hi = mid; else lo = mid; }
        out.push(base(L, g, hi), base(L, g, lo));
        found = true;
      }
    }
    return out;
  }
  async function v4bc(Sh) {
    const W = bootPage({ fastTimers: true });
    for (let i = 0; i < 400 && !W.document.querySelector("#w2-entry"); i++) await wait(5);
    const layer = W.document.getElementById("w2-layer");
    const fixtures = [];
    for (let i = 0; i < 60; i++) fixtures.push([`#${i}`, mkS(0, i)]);
    const edges = edgeFixtures(Sh);
    edges.forEach((x, i) => fixtures.push([`문턱${i % 2 ? " 0.1 아래" : " 위"}`, x]));
    const sumBad = [], tierBad = [];
    for (const [name, S] of fixtures) {
      for (const final of [true, false]) {
        const sh = Sh.compute(S, final);
        const p = W.W2Scenes.sheet(Object.assign({ title: "📋 스카우트 평가서" }, sh));
        await wait(2);
        const vals = [...layer.querySelectorAll(".w2o-col-v")].map((e) => Math.round(parseFloat(e.textContent) * 10));
        const tot = Math.round(parseFloat((layer.querySelector(".w2o-total-n") || { textContent: "합계 NaN" }).textContent.replace("합계", "")) * 10);
        const stamp = ((layer.querySelector(".w2o-stamp") || {}).textContent || "").replace(/^구간 「|」$/g, "");
        const ok = layer.querySelector(".w2o-ok");
        if (ok) ok.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
        await p;
        if (vals.length !== 5 || vals.reduce((a2, b2) => a2 + b2, 0) !== tot) sumBad.push(`${name}${final ? "" : " 중간"}: 칸 ${vals.map((v) => v / 10).join(" + ")} ≠ 합계 ${tot / 10}`);
        if (stamp !== TNAME[tierOfShown(tot)]) tierBad.push(`${name}${final ? "" : " 중간"}: 합계 ${tot / 10} → 「${TNAME[tierOfShown(tot)]}」인데 도장 「${stamp}」`);
      }
    }
    W.close();
    return { sumBad, tierBad, n: fixtures.length * 2, edges: edges.map((x) => Math.round(Sh.compute(x, true).total * 10) / 10) };
  }
  const e4 = await v4bc(SH);
  check(e4.sumBad.length === 0, `V-4b. 🔢 보이는 칸의 합 == 보이는 합계 — 진짜 \`scenes.js\`가 그린 평가서 ${e4.n}장(픽스처 60 + 문턱 판 ${e4.edges.length} · 최종 · 중간) · 어긋남 ${e4.sumBad.length}`
    + (e4.sumBad.length ? `\n     🔴 ${e4.sumBad.slice(0, 3).join(" · ")}` : ""));
  check(e4.tierBad.length === 0 && e4.edges.length === 6, `V-4c. 📏 구간 == 보이는 합계와 한 자리 문턱 — 도장 「구간 「…」」가 화면 합계로 매긴 구간과 같음 · 문턱 판 합계 ${e4.edges.join(" · ")} · 어긋남 ${e4.tierBad.length}`
    + (e4.tierBad.length ? `\n     🔴 ${e4.tierBad.slice(0, 3).join(" · ")}` : ""));

  /* ══════════ 🧪 변이 ══════════ */
  if (fail === 0) {
    const m1 = await v1(MUT.M_HIDDEN, [41, 42, 43]);
    check(m1.bad.length > 0, `변이-M_HIDDEN(판정에 숨은 +15) → V-1이 빨간불 (어긋남 ${m1.bad.length}/${m1.tries})`);
    const m2 = await v2(MUT.M_EFFAFTER);
    check(m2.bad.length > 0, `변이-M_EFFAFTER(효율을 −10 뒤 컨디션으로) → V-2가 빨간불 (어긋난 주 ${m2.bad.length}/${m2.trains})`);
    const m2c = await v2c(MUT.M_EFFCAP);
    check(!m2c.ok, `변이-M_EFFCAP(효율 상한 1.25) → V-2c가 빨간불`);
    const m3 = await v3(MUT.M_ZONE);
    check(!m3.ok, `변이-M_ZONE(「보통」 문턱을 52로 — 51이 「${m3.n51.label}」) → V-3이 빨간불`);
    check(v45(sheetOf(SSRC.replace(MUT_S.M_TOTAL[0][0], MUT_S.M_TOTAL[0][1]))).bad4.length > 0, `변이-M_TOTAL(합계에 숨은 +0.5) → V-4가 빨간불`);
    check(v45(sheetOf(SSRC.replace(MUT_S.M_TRUST[0][0], MUT_S.M_TRUST[0][1]))).bad5.length > 0, `변이-M_TRUST(🤝 신뢰가 합계에) → V-5가 빨간불`);
    const mEach = await v4bc(sheetOf(MUT_S.M_EACH.reduce((x, [re, rep]) => x.replace(re, rep), SSRC)));
    check(mEach.sumBad.length > 0, `변이-M_EACH(칸마다 따로 반올림 · 합계는 원래 합 — 10-03 전) → V-4b가 빨간불 (어긋남 ${mEach.sumBad.length}/${mEach.n})`);
    const mRaw = await v4bc(sheetOf(SSRC.replace(MUT_S.M_RAWTIER[0][0], MUT_S.M_RAWTIER[0][1])));
    check(mRaw.tierBad.length > 0, `변이-M_RAWTIER(구간을 원래 합 · 두 자리 문턱으로) → V-4c가 빨간불 (어긋남 ${mRaw.tierBad.length} — ${mRaw.tierBad.slice(0, 2).join(" · ")})`);
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
