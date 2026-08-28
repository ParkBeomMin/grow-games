/* ⚽ 더 윙어 II — 엔진을 node에서 그대로 굴리기 위한 공용 로더.
 *
 * 이 게임은 engineer가 엔진을 S·WingerSquad에서 떼어 **cfg로만 받게** 만들었어요
 * (13번 §10-3b). 그래서 이 저장소의 단골 함정 하나가 구조적으로 사라집니다 —
 * "소스에서 뜯어온 조각이 실제 배선과 다르다". **여기서는 진짜 엔진을 부릅니다.**
 *
 * 🔒 지키는 것 셋
 *   ① 직접 eval을 안 씁니다. new Function(...) + return이에요
 *      (직접 eval은 `const`가 eval 스코프에 갇혀 값이 늘 undefined가 됩니다)
 *   ② 문턱은 **검사에 직접 적습니다.** _t.K에서 읽어 오면 상수를 바꿔도
 *      검사가 따라가서 아무것도 안 잡혀요 (13번 §10-3 🚨)
 *   ③ 변이는 **반드시 적용됐는지 확인**합니다. 안 맞는 정규식으로 갈아치우면
 *      "변이했는데 초록불"이 되는데, 그건 변이 검증이 통째로 거짓이 되는 자리예요
 */
"use strict";
const fs = require("fs");
const ENGINE = "/workspace/grow-games/beta/winger2/engine.js";
const SRC = fs.readFileSync(ENGINE, "utf8");

/* muts = [[정규식, 바꿀 문자열], …]. 하나라도 안 걸리면 던집니다. */
function load(muts) {
  let src = SRC;
  for (const [re, rep] of muts || []) {
    const before = src;
    src = src.replace(re, rep);
    if (src === before) throw new Error(`변이가 소스에 안 걸렸어요 — ${re}`);
  }
  const win = {};
  // Math를 감싸서 넘겨요 — 엔진이 _rng 밖에서 Math.random을 부르는지 셉니다
  const counter = { random: 0 };
  const MathShim = Object.create(Math);
  MathShim.random = function () { counter.random += 1; return Math.random(); };
  const E = new Function("window", "Math", `${src}\nreturn window.WingerEngine;`)(win, MathShim);
  E.__mathRandomCalls = counter;
  return E;
}

/* ---------- 명단 픽스처 ----------
 * ⚠️ 실제 디스크의 명단과 **같은 모양**이어야 해요 (career.js engRow):
 *   { name, pos, slot:{g,a,d}, me, stats|null, str, foot }
 * 자리 결(slot)은 정규화 IIFE가 평균 1을 지키니 여기서는 1로 둡니다.
 * 동료 전력은 squad.js의 STR_SPREAD(±14)와 같은 폭으로 흩뿌려요 — 고정 패턴이라 재현됩니다. */
const FORMATION = { fw: 2, wg: 2, mf: 4, df: 3 };
const SPREAD = [-11, 7, -3, 13, -8, 2, 10, -14, 5, -6, 9];
const statsOf = (a) => ({ shoot: a, pass: a, dribble: a, defense: a, stamina: a, speed: a });

function xiOf(pos, ability, mateBase) {
  const base = mateBase == null ? 70 : mateBase;
  const rows = [];
  let i = 0;
  for (const p of ["fw", "wg", "mf", "df"]) {
    for (let j = 0; j < FORMATION[p]; j++) {
      rows.push({ name: `P${i}`, pos: p, slot: { g: 1, a: 1, d: 1 }, me: false,
        str: Math.max(25, Math.min(99, base + SPREAD[i % SPREAD.length])) });
      i += 1;
    }
  }
  const at = rows.findIndex((r) => r.pos === pos);
  rows[at] = { name: "나", pos, slot: { g: 1, a: 1, d: 1 }, me: true, stats: statsOf(ability), foot: 1 };
  return rows;
}

/* n경기를 굴려 집계합니다. 시드를 박으니 결과가 완전히 재현돼요. */
function play(E, pos, ability, opt) {
  const o = opt || {};
  const n = o.n || 1000;
  E._t.seed(o.seed == null ? 7 : o.seed);
  E._t.skill = o.skill == null ? 0.5 : o.skill;
  const acc = { g: 0, a: 0, d: 0, cards: 0, success: 0, tg: 0, og: 0, n, matches: [] };
  for (let i = 0; i < n; i++) {
    const r = E._t.playMatch({
      xi: xiOf(pos, ability, o.mateBase),
      oppName: "상대", teamStr: o.teamStr == null ? 70 : o.teamStr,
      oppStr: o.oppStr == null ? 70 : o.oppStr, condition: o.condition == null ? 80 : o.condition,
    });
    acc.g += r.myGoals; acc.a += r.assists; acc.d += r.defense;
    acc.cards += r.mineCards; acc.success += r.mineSuccess;
    acc.tg += r.teamGoals; acc.og += r.oppGoals;
    if (o.keep) acc.matches.push(r);
  }
  acc.perMatch = { g: acc.g / n, a: acc.a / n, d: acc.d / n, cards: acc.cards / n, og: acc.og / n, tg: acc.tg / n };
  acc.season = { g: acc.perMatch.g * 38, a: acc.perMatch.a * 38, d: acc.perMatch.d * 38 };
  return acc;
}

module.exports = { load, xiOf, statsOf, play, SRC, ENGINE };
