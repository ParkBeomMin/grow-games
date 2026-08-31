/* 🧬 같은 커리어가 명예의 전당에 두 번 서지 않는가.
 *
 * 제보: "명예의 전당에 똑같은 사람이 둘인데 버그인가"
 * 진짜였어요. 원격 표를 열어 보니 두 행이 이렇게 있었습니다:
 *
 *   soccer-w1788108086216  띠띠앵2세  16315   ← 한마디 없음
 *   soccer-w1788108135869  띠띠앵2세  16315   ← "…길을비켜라"
 *
 * **49.6초 차이**에 37칸 중 `id`·`at`·`word`만 달랐어요. 같은 커리어가 두 번
 * 헌액된 겁니다(두 창에서 각각 은퇴했거나, 은퇴 뒤 세이브가 되살아났거나).
 * `id`는 헌액할 때마다 `"w" + Date.now()`로 새로 나서, 화면의 중복 제거가
 * 이걸 잡을 수 없었어요.
 *
 * `hof` 표에는 UPDATE도 DELETE도 열려 있지 않아요 — **이미 올라간 행은 못 지웁니다.**
 * 그래서 두 곳에서 막아요: 올리기 전(enshrine)과 그리기 전(showHof).
 *
 * 지키는 것:
 *   ① 같은 커리어를 두 번 헌액해도 로컬에는 한 장만 남는다
 *   ② 나중에 쓴 한마디가 그 한 장에 붙는다 (새 장이 생기지 않아요)
 *   ③ 이미 원격에 두 행이 있어도 화면에는 한 장으로 접힌다
 *   ④ 접을 때 한마디는 **있는 쪽**을 남긴다 — 한마디 전에 올라간 장이 흔해요
 *   ⑤ 내 기록 표시(me)가 남은 장으로 따라간다
 *   ⑥ 다른 커리어는 안 합친다 (점수가 1점만 달라도 남남이에요)
 *   ⑦ 시각이 멀면 안 합친다 — 며칠 뒤 만든 똑같이 텅 빈 커리어는 다른 헌액이에요
 *   ⑧ 변이 검증 — 지문 대신 id로 접으면 ③이 무너진다
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 굴려요. 값을 옮겨 적지 않습니다.
 */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/soccer/career.js", "utf8");
const grab = (re) => { const m = SRC.match(re); return m ? m[0] : null; };

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const parts = {
  twinMs: grab(/const TWIN_MS = [^;]+;/),
  fp: grab(/const hofFp = \(e\) =>[\s\S]*?\.join\("\|"\);/),
  twin: grab(/const hofTwin = \(list, e\) =>[\s\S]*?\n\s*&& Math\.abs[^;]+;/),
  // 은퇴식에서 헌액을 넣는 그 다섯 줄
  push: grab(/const twin = hofTwin\(hof, entry\);[\s\S]*?saveHof\(hof\);/),
  // 명예의 전당을 그리기 전에 접는 그 자리
  merge: grab(/const list = \[\];\s*\n\s*const seenId[\s\S]*?\n\s*list\.sort\(/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }
console.log(`   ${parts.twinMs}`);

const BASE = `${parts.twinMs}\n${parts.fp}\n${parts.twin}\n`;

/* 실제로 겹쳤던 그 헌액의 모양이에요 (칸 이름은 소스와 같아요). */
const AT = 1788108086216;
const mk = (over) => Object.assign({
  id: "w" + AT, at: AT, game: "soccer", name: "띠띠앵2세", score: 16315,
  seasons: 15, apps: 542, goals: 1731, assists: 216, defense: 542,
  finalOvr: 160, gen: 2, wins: 501, daesang: 20, bonsang: 9,
}, over || {});

// ---------- ①② 올리기 전에 막는가 ----------
console.log("\n=== ①② 두 번 은퇴해도 한 장 ===");
const runPush = new Function("hof", "entry", "saved",
  `${BASE}
   const saveHof = (l) => { saved.list = l; };
   ${parts.push}
   return { hof, entry };`);
{
  const saved = {};
  const hof = [];
  // 첫 은퇴 — 한마디 없이 나갔어요
  runPush(hof, mk(), saved);
  // 49.6초 뒤 두 번째 은퇴 — 같은 커리어인데 id·at이 새로 났어요
  const second = mk({ id: "w" + (AT + 49653), at: AT + 49653, word: "띠띠앵이 돌아왔다 길을비켜라" });
  runPush(hof, second, saved);
  check(hof.length === 1, `두 번 은퇴해도 로컬에 한 장이다 (${hof.length}장)`);
  check(hof[0] && hof[0].word === "띠띠앵이 돌아왔다 길을비켜라",
    `나중에 쓴 한마디가 그 한 장에 붙는다 (${hof[0] && hof[0].word})`);
  check(second.id === "w" + AT && second.at === AT,
    "두 번째 헌액이 첫 장의 id·시각을 물려받는다 — 원격에도 같은 자리로 올라가요");
}
{
  // ⑥ 점수가 1점만 달라도 남남이에요 (같은 이름·같은 순간이어도)
  const saved = {}, hof = [];
  runPush(hof, mk(), saved);
  runPush(hof, mk({ id: "w2", at: AT + 1000, score: 16314 }), saved);
  check(hof.length === 2, `점수가 다르면 안 합친다 (${hof.length}장)`);
}
{
  // ⑦ 시각이 멀면 다른 헌액이에요 — 텅 빈 커리어는 지문이 겹칠 수 있어요
  const saved = {}, hof = [];
  const empty = { id: "w1", at: AT, game: "soccer", name: "무명", score: 0,
    seasons: 0, apps: 0, goals: 0, assists: 0, defense: 0, finalOvr: 40, gen: 1 };
  runPush(hof, Object.assign({}, empty), saved);
  runPush(hof, Object.assign({}, empty, { id: "w2", at: AT + 3 * 86400000 }), saved);
  check(hof.length === 2, `사흘 뒤의 똑같이 텅 빈 커리어는 다른 헌액이다 (${hof.length}장)`);
}

// ---------- ③④⑤ 그리기 전에 접는가 ----------
console.log("\n=== ③④⑤ 원격에 이미 두 행이 있어도 ===");
const runMerge = new Function("remote", "local", "localIds",
  `${BASE}
   ${parts.merge} (a, b) => 0);
   return { list, localIds };`);
{
  /* 원격에 남아 있는 그 두 행이에요 — 지울 수 없어서 화면에서 접는 수밖에 없어요.
   * 한마디 없는 쪽이 점수순에서 먼저 옵니다(둘 다 16315점이니까요). */
  const remote = [
    mk(),
    mk({ id: "w" + (AT + 49653), at: AT + 49653, word: "띠띠앵이 돌아왔다 길을비켜라" }),
    mk({ id: "wOther", at: AT - 90000000, name: "호날두", score: 11576 }),
  ];
  const local = [mk({ id: "w" + (AT + 49653), at: AT + 49653, word: "띠띠앵이 돌아왔다 길을비켜라" })];
  const localIds = new Set(local.map((e) => e.id));
  const out = runMerge(remote, local, localIds);
  const mine = out.list.filter((e) => e.name === "띠띠앵2세");
  check(mine.length === 1, `같은 헌액이 한 장으로 접힌다 (${mine.length}장)`);
  check(mine[0] && mine[0].word === "띠띠앵이 돌아왔다 길을비켜라",
    `접을 때 한마디는 있는 쪽을 남긴다 (${mine[0] && mine[0].word})`);
  check(out.list.length === 2, `다른 사람은 그대로 남는다 (${out.list.length}장)`);
  check(mine[0] && out.localIds.has(mine[0].id),
    "내 기록 표시가 남은 장으로 따라간다 — 남긴 게 원격 장이어도 내 것은 내 것이에요");
}

// ---------- ⑧ 변이 검증 ----------
console.log("\n=== ⑧ 변이 검증 — id로만 접으면 ===");
{
  /* 고치기 전의 그 코드예요. 두 행은 id가 다르니 둘 다 남아요 —
   * 화면 1위와 2위가 같은 선수가 됩니다. */
  const remote = [mk(), mk({ id: "w" + (AT + 49653), at: AT + 49653, word: "한마디" })];
  const seen = new Set();
  const byId = [];
  for (const e of remote) { if (seen.has(e.id)) continue; seen.add(e.id); byId.push(e); }
  check(byId.length === 2, `id로만 접으면 두 장이 그대로 남는다 (${byId.length}장) — ③이 그걸 잡아요`);
  const out = runMerge(remote, [], new Set());
  check(out.list.length === 1, `지문으로 접으면 한 장이다 (${out.list.length}장)`);
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
