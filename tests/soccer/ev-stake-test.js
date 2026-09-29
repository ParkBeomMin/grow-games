/* 💱 판돈이 칩대로 붙는가 · 🤝 감독 신뢰의 크기 · 🔥 유스 배수 (스펙 §3-7 · §3-8 · §3-4 🔥 · §9-A 7 · 8 · §9-B)
 *
 * A. 새는 판돈 0 — 도전의 결과로 **실제로 바뀐 값 == 칩에 적힌 ±W·L**. 적용하면 칩과 다른 값이 되는 판돈(상한·바닥에 걸리는 것)은
 *    무작위 이벤트면 **후보에서 빠져야** 해요(§3-8). 경계에 선 선수를 일부러 만들어 pre·h2 블록을 되풀이해요 —
 *    주 스탯이 상한 바로 밑 · 🤝 ±4 · 돈이 판돈보다 적음 · 명성 800 근처.
 * B. 🤝 — squad.js myLine()(화면이 적는 선발 확률)을 실제 명단 1,000벌(250 × 포지션 넷 · 게임이 굴린 명단)에서 불러요.
 *    격차 = 내 종합 − 그 포지션 마지막 선발 자리 동료 실력(20번 §7과 같은 정의 · 컨디션 80 = 보정 +2 · 폼 0)
 *    ① 격차 0에서 신뢰 +2의 효과가 합격선 +8~20%p 안(20번 §7 합격선 — 실측 +13.7%p)
 *    ② 확실한 칸(보정까지 친 격차 |g| ≥ 12)에서 효과 ≤ 0.5%p
 *    ③ 실제 선발(rollLineup)도 같은 합을 본다 — 격차 0에서 2,000번 굴린 선발 빈도 차이가 합격선 안
 *    ④ 👥 스쿼드 레이어 내역 줄 「🤝 감독 신뢰 ±N」 = S.trustEv + S.clubTrust의 합(둘 다 0이면 줄 없음)
 * C. 🔥 유스 배수 — 확정 → S.buff = true만 · 성공 → true + S.buffX 2.0 · 실패 → false · 훈련이 쓰면 둘 다 지움 · 훈련 실패는 안 씀
 *
 * ⚠️ 스펙 §9-A 8의 「|격차| ≥ 10에서 ±0.5%p 이하」는 **격차에 컨디션 보정을 넣었는지**를 안 적었어요. 선발 판정이
 *    `실력 + U(±5) + 보정`이라, 보정을 뺀 격차 −10은 보정 +2(컨디션 80)에서 실질 −8이고 20번 §7 표도 그 칸에서 +6.2%p예요.
 *    그래서 ②는 **보정까지 친 격차**로 재고(이론값: −10에서 정확히 0.5%p라 그 칸은 뺍니다 — 문턱을 실측값 바로 옆에 두지 않아요),
 *    −10 칸 값은 기록으로 찍어요(보고서 👁️/🚧).
 *
 * 변이
 *   S1 fits의 능력치 상한 거르기를 지운다(스펙 §9-A 7이 적은 변이 — 🎖️ 칭호의 무게) → A 빨간불
 *   S2 fits의 🤝 ±4 거르기를 지운다                                               → A 빨간불
 *   S3 fits의 돈 바닥 거르기를 지운다                                              → A 빨간불
 *   T1 myBonus의 신뢰 합에서 trustEvOf()를 뺀다                                   → B ①③ 빨간불
 *   T2 스쿼드 레이어의 🤝 줄을 지운다                                              → B ④ 빨간불
 *   F1 훈련이 🔥를 쓸 때 S.buffX를 안 지운다                                        → C 빨간불
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 */
"use strict";
const H = require("./_w1.js");
H.guardExit();

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };
const BAND = [8, 20];        // 20번 §7 합격선 — 경계 칸 +8~20%p
const SURE = 0.5;            // 스펙 §9-A 8 — 확실한 칸 ±0.5%p

const MUTS = {
  S1: { file: "events.js", muts: [[/if \(fx\.stat\) \{ const v = S\.stats\[fx\.stat\.k\] \+ fx\.stat\.v; if \(v > statCap\(fx\.stat\.k\) \|\| v < 0\) return false; \}/, ""]] },
  S2: { file: "events.js", muts: [[/if \(fx\.trust\) \{ const v = trustEv\(\) \+ fx\.trust; if \(v > TRUST_CAP \|\| v < -TRUST_CAP\) return false; \}/, ""]] },
  S3: { file: "events.js", muts: [[/if \(fx\.money && \(S\.money \|\| 0\) \+ fx\.money < 0\) return false;/, ""]] },
  T1: { file: "squad.js", muts: [[/const trust = trustOf\(\) \+ trustEvOf\(\);/, "const trust = trustOf();"]] },
  T2: { file: "squad.js", muts: [[/\+ \(b\.trust \? ` · 🤝 감독 신뢰 \$\{b\.trust > 0 \? "\+" : ""\}\$\{Math\.round\(b\.trust\)\}` : ""\)/, ""]] },
  F1: { file: "game.js", muts: [[/\n  delete S\.buffX;\n/, "\n"]] },
};
const PROBE = [[/const buffMod = S\.buff === true \? \(S\.buffX \|\| 1\.5\) : 1\.0;/, "$& window.__buffMod = buffMod;"]];

const FX = H.fixtures();
const vet = FX.items.find((x) => x.id === "soccer-veteran").keys;
function resume(P) {
  H.tap(P, P.$("btn-continue"));
  const go = P.doc.querySelector(".slot-modal .slot-go");
  if (go) H.tap(P, go);
  const no = P.doc.querySelector(".no-overlay #no-skip");
  if (no) H.tap(P, no);
}

/* ---------- A. 새는 판돈 ---------- */
function stakes(muts, iters, seed) {
  const P = H.boot({ which: "beta", seed, keys: vet, muts });
  resume(P);
  const rnd = H.mulberry32(H.split(seed, H.POL_SALT));
  const base = JSON.stringify(P.S());
  const E = P.w.WingerEvents, Q = P.w.WingerSquad;
  const st = { n: 0, leak: 0, ex: [], seen: {}, edge: 0, err: [] };
  const cap = (k) => P.get(`statCap("${k}")`);
  for (let k = 0; k < iters; k++) {
    const S = JSON.parse(base);
    const main = P.get("POS_INFO")[S.pos].stat;
    S.buffs = ["boot"]; S.buffY = S.proYear;                          // 🎖️ 칭호의 무게가 뜰 수 있게(지난 시즌 득점왕)
    S.trustEv = { y: S.proYear, v: [-4, -2, 0, 2, 4][Math.floor(rnd() * 5)] };
    S.fandom = 800 + Math.floor(rnd() * 3000);
    S.money = [0, 30, 90, 5000][Math.floor(rnd() * 4)];
    S.moves = [{ y: S.proYear - 1, from: "옛 클럽", to: S.group, fromLg: S.league, toLg: S.league, fee: 900 }];   // 💼 수수료가 뜰 수 있게
    S.evSlot = null; S.evSeason = null; S.ev = null;
    if (rnd() < 0.5) { S.activity.cb = 2; S.activity.week = 0; }       // 반은 후반기 첫 화면(h2)
    P.set("S", S);
    S.stats[main] = cap(main) - [0, 1, 2, 3, 6][Math.floor(rnd() * 5)];  // 주 스탯이 상한 바로 밑(상한은 초월 단계에 따라요)
    P.w.WingerCareer.refreshPro();
    const ev = E.pending();
    const ov = P.doc.querySelector(".ev-overlay");
    if (!ev || !ov) continue;
    const i = ev.opts.findIndex((o) => o.k === "try");
    if (i < 0) { const s = ov.querySelector(".ev-opt.k-safe"); if (s) H.tap(P, s); const ok = ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok); continue; }
    const o = ev.opts[i];
    const cur = P.S();
    const before = { trust: Q.trustEvOf(), fame: cur.fandom, money: cur.money, stats: Object.assign({}, cur.stats), weak: cur.foot ? cur.foot.weak : null };
    const win = ev.u * 100 < o.pct;
    H.tap(P, ov.querySelector(`.ev-opt[data-i="${i}"]`));
    const ok = ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok);
    const after = P.S();
    const fx = win ? o.win : o.lose;
    const got = { trust: Q.trustEvOf() - before.trust, fame: after.fandom - before.fame, money: after.money - before.money,
      weak: after.foot && before.weak != null ? after.foot.weak - before.weak : 0 };
    const want = { trust: fx.trust || 0, fame: fx.fame || 0, money: fx.money || 0, weak: fx.weak || 0 };
    let leak = Object.keys(want).some((k) => Math.abs(got[k] - want[k]) > 1e-9);
    if (fx.stat) { const d = after.stats[fx.stat.k] - before.stats[fx.stat.k]; if (Math.abs(d - fx.stat.v) > 1e-9) leak = true; }
    st.n++;
    st.seen[ev.id] = (st.seen[ev.id] || 0) + 1;
    // 판돈 +2가 상한을 **넘는** 자리(딱 상한에 닿는 것은 잘림이 아니에요 — fits는 `> statCap`만 거릅니다)
    if (ev.id === "p_marked" && before.stats[main] + 2 > cap(main) + 1e-9) st.edge++;
    if (leak) { st.leak++; if (st.ex.length < 2) st.ex.push(`${ev.id} ${win ? "성공" : "실패"} 칩 ${JSON.stringify(fx)} · 실제 ${JSON.stringify(got)}${fx.stat ? ` · 능력치 ${(after.stats[fx.stat.k] - before.stats[fx.stat.k]).toFixed(2)}` : ""}`); }
  }
  st.err = P.errors.slice();
  P.close();
  return st;
}

/* ---------- B. 🤝 ---------- */
function trustCurve(muts, rosters, seed) {
  const P = H.boot({ which: "beta", seed, keys: vet, muts });
  resume(P);
  const Q = P.w.WingerSquad;
  const FORM = Q.FORMATION;
  const S0 = P.S();
  const G = [-16, -14, -13, -12, -11, -10, 0, 2, 7, 10, 13];
  const sum = {}; const cnt = {};
  let lineupDiff = null;
  for (let r = 0; r < rosters; r++) {
    const pos = ["fw", "wg", "mf", "df"][r % 4];
    const S = P.S();
    S.pos = pos; S.condition = 80; S.squadsLeague = null; S.trustEv = null; S.clubTrust = null;
    S.activity.apps = 0; S.activity.ratingSum = 0;                   // 폼 0
    Q.ensureSquads();                                                 // 게임이 명단을 새로 굴려요(게임 난수)
    const line = Q.squadOf(S.group).filter((x) => x.pos === pos);
    const me = line.find((x) => x.me);
    const others = line.filter((x) => !x.me).sort((a, b) => b.str - a.str);
    if (!me || others.length < FORM[pos]) continue;
    const base = others.map((x) => x.str);
    const b = base[FORM[pos] - 1];                                    // 마지막 선발 자리 동료
    for (const g of G) {
      const shift = (me.str - g) - b;
      others.forEach((x, j) => { x.str = base[j] + shift; });
      S.trustEv = null;
      const o0 = Q.myLine().odds;
      S.trustEv = { y: S.proYear, v: 2 };
      const o2 = Q.myLine().odds;
      sum[g] = (sum[g] || 0) + (o2 - o0); cnt[g] = (cnt[g] || 0) + 1;
    }
    others.forEach((x, j) => { x.str = base[j]; });
    if (r === rosters - 1) {
      /* ③ 실제 선발 — 같은 명단 · 격차 0 · 2,000번. rollLineup이 myBonus의 같은 합을 보는지 */
      const shift = me.str - b;
      others.forEach((x, j) => { x.str = base[j] + shift; });
      const freq = (v) => { S.trustEv = v ? { y: S.proYear, v } : null; let hit = 0; for (let t = 0; t < 2000; t++) { S.activity.xiWeek = -1; if (Q.rollLineup().some((x) => x.me)) hit++; } return hit / 2000; };
      lineupDiff = freq(2) - freq(0);
    }
  }
  const curve = {}; for (const g of G) curve[g] = cnt[g] ? (sum[g] / cnt[g]) * 100 : null;
  const out = { curve, n: cnt[0] || 0, lineupDiff, err: P.errors.slice() };
  // ④ 스쿼드 레이어 내역 줄
  const S = P.S();
  const line = (ev, club) => {
    S.trustEv = ev == null ? null : { y: S.proYear, v: ev };
    S.clubTrust = club == null ? null : { y: S.proYear, v: club };
    const o = P.doc.querySelector(".squad-overlay"); if (o) o.remove();
    H.tap(P, P.$("btn-squad-pro"));
    const lay = P.doc.querySelector(".squad-overlay");
    const m = lay && /🤝 감독 신뢰 ([+−-]?\d+)/.exec(lay.textContent);
    return m ? m[1] : null;
  };
  out.layer = { both: line(2, 3), ev: line(-2, null), club: line(null, 3), none: line(null, null) };
  /* 지난 시즌의 🤝는 0으로 읽는다(해제 코드 없음 — 스펙 §3-7 「y가 지금 시즌이 아니면 0」) */
  S.trustEv = { y: S.proYear - 1, v: 4 }; S.clubTrust = null;
  out.stale = { ev: Q.trustEvOf(), bonus: Q.myBonus().trust };
  S.trustEv = null;
  out.err.push(...P.errors.slice(out.err.length));
  P.close();
  return out;
}

/* ---------- C. 🔥 ---------- */
function buffCase(muts, seed) {
  const P = H.boot({ which: "beta", seed, muts: { "game.js": PROBE.concat((muts && muts["game.js"]) || []) } });
  const D = H.makeDriver(P, { pos: "fw", market: 0, name: "불꽃" });
  D.run({ until: () => P.active() === "screen-main", max: 50 });
  const base = JSON.stringify(P.S());
  const res = { safe: null, win: null, lose: null, failKeep: null, err: [] };
  const train = (key) => { const b = Array.from(P.$("action-list").children).find((x) => x.dataset && x.dataset.key === key && !x.disabled); if (b) H.tap(P, b); return !!b; };
  /* 🔥 또래의 골 영상이 뜰 때까지 되풀이 — 뜨면 고른 대로 답하고, 그다음 훈련의 배수를 봐요 */
  const need = { safe: 2, win: 2, lose: 2 };
  for (let k = 0; k < 6000 && Object.values(need).some((n) => n > 0); k++) {
    const S = JSON.parse(base);
    S.month = 2; S.pendingStage = null; S.condition = 90; S.buff = false; delete S.buffX; S.ev = null;
    P.set("S", S); P.w.renderMain();
    train("shoot");
    const ev = P.w.WingerEvents.pending();
    if (!ev || ev.id !== "y_rival") continue;
    const ti = ev.opts.findIndex((o) => o.k === "try"), si = ev.opts.findIndex((o) => o.k === "safe");
    const win = ev.u * 100 < ev.opts[ti].pct;
    const kind = need.safe > 0 ? "safe" : win && need.win > 0 ? "win" : !win && need.lose > 0 ? "lose" : null;
    if (!kind) continue;
    need[kind]--;
    const ov = P.doc.querySelector(".ev-overlay");
    H.tap(P, ov.querySelector(`.ev-opt[data-i="${kind === "safe" ? si : ti}"]`));
    const ok = ov.querySelector(".ev-ok"); if (ok) H.tap(P, ok);
    const a = P.S();
    const set = { buff: a.buff, buffX: a.buffX };
    // 다음 **성공한** 훈련의 배수 — 실패 갈래는 배수를 안 써요(스펙 §3-4)
    let mod, keptOnFail = null;
    for (let t = 0; t < 30 && mod === undefined; t++) {
      if (P.active() !== "screen-main" || P.S().pendingStage) break;
      const pv = P.w.__buffMod, logN = P.S().log.length, b0 = P.S().buff, x0 = P.S().buffX;
      if (P.w.WingerEvents.pending()) { const o2 = P.doc.querySelector(".ev-overlay"); const s2 = o2 && o2.querySelector(".ev-opt.k-safe"); if (s2) H.tap(P, s2); const k2 = o2 && o2.querySelector(".ev-ok"); if (k2) H.tap(P, k2); continue; }
      train("pass");
      if (P.w.__buffMod !== pv || /훈련 완료/.test(P.S().log[0] || "")) mod = P.w.__buffMod;
      else if (/영 안 풀렸어요|잔부상/.test(P.S().log.slice(0, P.S().log.length - logN + 2).join(" "))) keptOnFail = P.S().buff === b0 && P.S().buffX === x0;
    }
    const after = { buff: P.S().buff, buffX: P.S().buffX };
    const r = { set, mod, after, keptOnFail };
    if (!res[kind]) res[kind] = r; else res[kind + "2"] = r;
    if (keptOnFail != null && res.failKeep == null) res.failKeep = keptOnFail;
  }
  /* 🔥 뒤에 **실패한 훈련** — 배수를 안 쓰고 그대로 남아야 해요(컨디션을 낮춰 실패 확률 15%) */
  for (let k = 0; k < 400 && res.failKeep == null; k++) {
    const S = JSON.parse(base);
    S.month = 2; S.pendingStage = null; S.condition = 30; S.buff = true; S.buffX = 2; S.ev = null;
    P.set("S", S); P.w.renderMain();
    train("pass");
    const log0 = P.S().log[0] || "";
    if (/영 안 풀렸어요/.test(log0)) res.failKeep = P.S().buff === true && P.S().buffX === 2;
  }
  res.err = P.errors.slice();
  P.close();
  return res;
}

(async () => {
  console.log("=== 0. 변이 · 관측 줄 등록 ===");
  const miss = H.mutMisses(Object.assign({}, MUTS, { probe: { file: "game.js", muts: PROBE } }));
  check(miss.length === 0, `변이·관측 정규식이 소스에 걸린다${miss.length ? ` — 안 걸림: ${miss.join(" · ")}` : ""}`);

  console.log("=== A. 새는 판돈 0 — 경계에 선 선수로 pre·h2 블록 되풀이 ===");
  const A = stakes(null, 1600, 1234);
  console.log(`   측정 조건: 되풀이 1,600번 · 도전 ${A.n}번 · 뜬 것 ${Object.entries(A.seen).map(([k, v]) => `${k} ${v}`).join(" · ")} · 시드 1234`);
  check(A.n >= 200 && Object.keys(A.seen).length >= 3, `🔒 도전을 충분히 눌렀다 (도전 ${A.n} · 종류 ${Object.keys(A.seen).length})`);
  check(A.leak === 0, `실제로 바뀐 값 == 칩의 ±W·L — 샌 판돈 ${A.leak}/${A.n}${A.ex.length ? ` — ${A.ex[0]}` : ""}`);
  check(A.edge === 0, `주 스탯이 상한까지 2가 안 남았을 때 🎖️ 칭호의 무게가 뜨지 않는다 (뜬 판 ${A.edge})`);
  check(A.err.length === 0, `A 페이지 안 예외 0${A.err.length ? ` — ${A.err[0].slice(0, 200)}` : ""}`);

  console.log("=== B. 🤝 감독 신뢰 — 명단 1,000벌 · myLine() ===");
  const B = trustCurve(null, 1000, 2025);
  const fmt = (v) => (v == null ? "-" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}`);
  console.log(`   측정 조건: 게임이 굴린 명단 ${B.n}벌(포지션 넷 번갈아) · 컨디션 80(보정 +2) · 폼 0 · 격차별 Δ(신뢰 +2 − 0)%p:`);
  console.log(`   ${Object.entries(B.curve).map(([g, v]) => `격차 ${g}: ${fmt(v)}`).join(" · ")}`);
  check(B.n >= 950, `🔒 명단을 1,000벌 가까이 썼다 (${B.n})`);
  check(B.curve[0] >= BAND[0] && B.curve[0] <= BAND[1], `① 격차 0 — 신뢰 +2가 선발 확률을 ${fmt(B.curve[0])}%p (합격선 +${BAND[0]}~${BAND[1]}%p · 20번 §7 실측 +13.7)`);
  /* 보정 +2까지 친 격차가 |12| 이상인 칸 — 이론값 0(U(±5) 둘의 차는 ±10을 못 넘고 신뢰 +2를 더해도 12 안쪽).
   * 보정 친 −11(원래 −13)은 이론 0.25%p · 실측 0.47%p로 문턱 0.5에 너무 붙어 있어서 뺐어요(문턱과 실측 사이 여유 — grow-inspector) */
  const sure = [-16, -14, 10, 13].map((g) => [g, B.curve[g]]);    // 보정 친 격차: −14 · −12 · +12 · +15
  check(sure.every(([, v]) => Math.abs(v) <= SURE), `② 확실한 칸(보정 친 격차 |g| ≥ 12) — 효과 ≤ ${SURE}%p (${sure.map(([g, v]) => `${g}: ${fmt(v)}`).join(" · ")})`);
  console.log(`   🚧 기록 — 격차 −10(보정 친 −8) ${fmt(B.curve[-10])}%p · −11 ${fmt(B.curve[-11])} · −12 ${fmt(B.curve[-12])} · −13 ${fmt(B.curve[-13])}: 스펙 「|격차| ≥ 10 → ±0.5%p」는 보정을 뺀 격차로는 성립하지 않아요(20번 §7 표 −10 칸 +6.2)`);
  check(B.lineupDiff != null && B.lineupDiff * 100 >= BAND[0] && B.lineupDiff * 100 <= BAND[1], `③ 실제 선발(rollLineup 2,000번)도 같은 합 — 격차 0에서 +${(B.lineupDiff * 100).toFixed(1)}%p`);
  check(B.layer.both === "+5" && (B.layer.ev === "−2" || B.layer.ev === "-2"), `④ 👥 내역 줄 — 이벤트 +2 · 월드컵 +3 → 「+5」(${B.layer.both}) · 이벤트 −2만 → 「${B.layer.ev}」`);
  check(B.layer.club === "+3" && B.layer.none === null, `④ 월드컵만 +3 → 「${B.layer.club}」 · 둘 다 0 → 줄 없음(${B.layer.none})`);
  check(B.stale.ev === 0 && B.stale.bonus === 0, `지난 시즌 🤝(+4)는 0으로 읽는다 (trustEvOf ${B.stale.ev} · myBonus.trust ${B.stale.bonus})`);
  check(B.err.length === 0, `B 페이지 안 예외 0${B.err.length ? ` — ${B.err[0].slice(0, 200)}` : ""}`);

  console.log("=== C. 🔥 유스 배수 ===");
  const C = buffCase(null, 77);
  const show = (r) => (r ? `세움 buff ${r.set.buff}·buffX ${r.set.buffX} → 배수 ${r.mod} → 쓴 뒤 buff ${r.after.buff}·buffX ${r.after.buffX}` : "안 나옴");
  check(!!C.safe && C.safe.set.buff === true && C.safe.set.buffX === undefined && C.safe.mod === 1.5 && C.safe.after.buff === false && C.safe.after.buffX === undefined, `확정 — ${show(C.safe)}`);
  check(!!C.win && C.win.set.buff === true && C.win.set.buffX === 2 && C.win.mod === 2 && C.win.after.buff === false && C.win.after.buffX === undefined, `도전 성공 — ${show(C.win)}`);
  check(!!C.lose && C.lose.set.buff === false && C.lose.set.buffX === undefined && C.lose.mod === 1 && C.lose.after.buffX === undefined, `도전 실패 — ${show(C.lose)}`);
  check(C.failKeep === true, `훈련이 실패하면 🔥를 안 쓴다(buff·buffX 그대로) (${C.failKeep})`);
  check(C.err.length === 0, `C 페이지 안 예외 0${C.err.length ? ` — ${C.err[0].slice(0, 200)}` : ""}`);

  console.log("=== 변이 검증 ===");
  if (miss.length) check(false, "변이가 소스에 안 걸려 못 돌렸어요(0번)");
  else {
    for (const k of ["S1", "S2", "S3"]) {
      const r = stakes({ [MUTS[k].file]: MUTS[k].muts }, 900, 1234);
      check(r.leak > 0, `${k} ${k === "S1" ? "능력치 상한" : k === "S2" ? "🤝 ±4" : "돈 바닥"} 거르기를 지우면 → A 빨간불 (샌 판돈 ${r.leak}/${r.n}${r.ex.length ? ` — ${r.ex[0]}` : ""})`);
    }
    const t1 = trustCurve({ "squad.js": MUTS.T1.muts }, 40, 2025);
    check(!(t1.curve[0] >= BAND[0]) && !(t1.lineupDiff * 100 >= BAND[0]), `T1 myBonus에서 이벤트 신뢰를 빼면 → B ①③ 빨간불 (격차 0 Δ ${fmt(t1.curve[0])}%p · 실제 선발 ${(t1.lineupDiff * 100).toFixed(1)}%p)`);
    const t2 = trustCurve({ "squad.js": MUTS.T2.muts }, 4, 2025);
    check(t2.layer.both !== "+5", `T2 🤝 내역 줄을 지우면 → B ④ 빨간불 (${t2.layer.both})`);
    const f1 = buffCase({ "game.js": MUTS.F1.muts }, 77);
    const f1bad = !(f1.win && f1.win.after.buffX === undefined) || !(f1.safe && f1.safe.mod === 1.5 && f1.safe.after.buffX === undefined);
    check(f1bad, `F1 훈련이 buffX를 안 지우면 → C 빨간불 (도전 성공 뒤 buffX ${f1.win && f1.win.after.buffX})`);
  }
  console.log(bad ? `\n❌ ${bad}건 실패` : "\n✅ 통과");
  process.exit(bad ? 1 : 0);
})().catch(H.die);
