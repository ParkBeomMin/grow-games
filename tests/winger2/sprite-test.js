/* ⚽ 더 윙어 II 1막 v2 — 🖼️ **판 그림**(41번 · 31번 「v2 판 그림 배선」) — 그림이 판을 바꾸지 않는가
 *
 *   SG-1  대칭 그림 넷(`m-gk-{m,f}-ready` · `m-mate-{m,f}-ready` — v3에서 슈터 앞모습 · 다리 퇴역)이 **좌우 뒤집기와 거의 같다**
 *         — 잔디색 바탕에 얹어 뒤집은 것과의 RMSE ≤ 1%(손실 압축 잡음 수준 · 실측 0.51~0.55%). 41번 §3: 기울면 그 자체가 「어느 쪽」 단서
 *         (대조: 한쪽으로 뜨는 그림 `m-gk-m-dive-high` · `m-mate-m-run`은 20% 넘음 — 자가 갈림을 보임)
 *   SG-2  그림을 못 받으면 옛 조각으로 물러섬 — 판 셋 각각: `Art`가 없을 때와 그림이 깨졌을 때(`error`) 조각(`.w2m-pc`) 수가 같고
 *         `<img>` · `.has-img`가 0 · 그림이 받아졌을 땐(`load`) `.has-img`가 섬
 *   SG-3  그림은 판정에 0 — 판 셋 × 칸 여섯(같은 시드)에서 `Art` 있음 · 없음의 `judge` · `sBoard` · `s` · 칸 · 정답 칸 · 연출 난수 쓴 수가 비트 같음
 *   + 변이: 대칭 그림 자리에 다이브 그림 · `error` 손잡이 삭제 · 그림을 얹을 때 난수 한 번
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음 · ⏱️ 몇 초
 */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const { PAGE_DIR, momentMutsOK } = require("./_load.js");
const { boardEnv } = require("./_board.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
/* 🔄 v3(44번 · J9 · 41번 §9): 🧱 앞모습 슈터 `m-shooter-{m,f}` · 흐림 다리 `m-leg`는 디딤발 단서와 함께 퇴역 · 파일도 지움 → 대칭 넷만 남음.
 *    새 준비 그림(「나」 `chibi-guard` 6 · `m-shooter-{g}-back` 2)은 「대칭 처리(반을 뒤집어 붙임)」를 안 한 그림이라 픽셀 자가 맞지 않아요
 *    (머리 · 꽁지 · 주름 비대칭으로 RMSE 5~17% — 자세는 정면 · 두 팔 같은 높이). 자세 대칭은 👁️ 눈으로(40번 v3 절) */
const SYM = ["m-gk-m-ready", "m-gk-f-ready", "m-mate-m-ready", "m-mate-f-ready"];
const ASYM = ["m-gk-m-dive-high", "m-mate-m-run"];
const RMSE_MAX = 0.01;
const ART = path.join(PAGE_DIR, "art");
const ART_JS = fs.readFileSync(path.join(PAGE_DIR, "art.js"), "utf8");
const MUT = {
  NOERR: [[/img\.addEventListener\("error", \(\) => \{ img\.remove\(\); m\.img = null; m\.pc\.classList\.remove\("has-img"\); \}\);/, ""]],
  RND: [[/function skin\(m, key, flip, onload\) \{\n(\s+)const url = sprite\(key\);/, "function skin(m, key, flip, onload) {\n$1const url = sprite(key); if (url) Math.random();"]],
};
{
  const bad = momentMutsOK(MUT);
  check(bad.length === 0, `0. 변이 정규식이 지금 winger-moment.js에 전부 걸린다` + (bad.length ? bad.map((b) => `\n       · ${b}`).join("") : ""));
}
/* SG-1 — ImageMagick(webp 읽기) */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "w2spr-"));
function flipRmse(file) {
  const a = path.join(tmp, "a.png"), b = path.join(tmp, "b.png");
  execFileSync("convert", [file, "-background", "#2f6b3a", "-alpha", "remove", "-alpha", "off", a]);
  execFileSync("convert", [a, "-flop", b]);
  let out = "";
  try { out = execFileSync("compare", ["-metric", "RMSE", a, b, "null:"], { stdio: ["ignore", "pipe", "pipe"] }).toString(); }
  catch (e) { out = String(e.stderr || e.stdout || ""); }               // compare는 다르면 종료 코드 1 — 값은 stderr
  const m = out.match(/\(([\d.e-]+)\)/);
  return m ? Number(m[1]) : NaN;
}
const sg1 = (files) => files.map(([k, f]) => ({ k, r: flipRmse(f) }));
{
  const r = sg1(SYM.map((k) => [k, path.join(ART, `${k}.webp`)]));
  const c = sg1(ASYM.map((k) => [k, path.join(ART, `${k}.webp`)]));
  check(r.every((x) => x.r <= RMSE_MAX) && c.every((x) => x.r > 10 * RMSE_MAX),
    `SG-1. 🪞 대칭 그림 넷의 뒤집기 RMSE ${r.map((x) => `${x.k.replace(/^m-/, "")} ${(x.r * 100).toFixed(2)}%`).join(" · ")} (≤ 1%) · 대조 ${c.map((x) => `${x.k.replace(/^m-/, "")} ${(x.r * 100).toFixed(1)}%`).join(" · ")}`);
}
/* SG-2 · SG-3 — 진짜 판 */
const KINDS = ["goal", "assist", "defend"];
function env(muts, art) {
  const E = boardEnv(muts);
  if (art) E.W.eval(ART_JS);
  return E;
}
function sg2(muts) {
  const bad = [];
  for (const kind of KINDS) for (const seen of kind === "defend" ? ["clear", "dim"] : [null]) {
    const seed = seen === "dim" ? 11 : 12;
    const A = env(muts, false); A.W.W2Moment._t.seed(seed);
    const a = A.open(kind);
    const noArt = a.host.querySelectorAll(".w2m-pc").length;
    const B = env(muts, true); B.W.W2Moment._t.seed(seed);
    const b = B.open(kind);
    const imgs = [...b.host.querySelectorAll("img.w2m-img")];
    if (!imgs.length) bad.push(`${kind}: 그림이 안 얹힘`);
    /* 받아짐 → has-img 섬 */
    imgs.forEach((im) => im.dispatchEvent(new B.W.Event("load")));
    const on = b.host.querySelectorAll(".has-img").length;
    if (on !== imgs.length) bad.push(`${kind}: load 뒤 has-img ${on}/${imgs.length}`);
    /* 깨짐 → 옛 조각 */
    imgs.forEach((im) => im.dispatchEvent(new B.W.Event("error")));
    const left = b.host.querySelectorAll("img.w2m-img").length, hasImg = b.host.querySelectorAll(".has-img").length;
    const pcs = b.host.querySelectorAll(".w2m-pc").length;
    if (left || hasImg || pcs !== noArt) bad.push(`${kind}: 깨진 뒤 img ${left} · has-img ${hasImg} · 조각 ${pcs}/${noArt}`);
  }
  return bad;
}
function sg3(muts) {
  const bad = [];
  for (const kind of KINDS) for (let c = 0; c < 6; c++) {
    const row = [];
    for (const art of [false, true]) {
      const E = env(muts, art);
      E.W.W2Moment._t.seed(300 + c);
      const r0 = E.randomCalls;
      const b = E.open(kind, { sit: { weak: false, step: 0, foot: 1, cond: 1 } });
      b.pick(c, 600);
      const r = b.finish();
      row.push(JSON.stringify(r ? [r.j, r.d.sBoard, r.d.s, r.d.cell, r.d.target, E.randomCalls - r0] : null));
    }
    if (row[0] !== row[1]) bad.push(`${kind}#${c} ${row[0]} ↔ ${row[1]}`);
  }
  return bad;
}
const b2 = sg2(null);
check(b2.length === 0, `SG-2. 🧩 그림을 못 받으면 옛 조각 — 판 셋(🧱은 시드 둘)에서 깨진 그림 뒤 \`<img>\` · \`.has-img\` 0 · 조각 수 = 그림 없는 판 · 받아지면 \`.has-img\`` + (b2.length ? `\n     🔴 ${b2.slice(0, 3).join(" · ")}` : ""));
const b3 = sg3(null);
check(b3.length === 0, `SG-3. ⚖️ 그림은 판정에 0 — 판 셋 × 칸 여섯에서 그림 있음 · 없음의 판정 · sBoard · s · 칸 · 정답 · 난수 쓴 수 비트 같음` + (b3.length ? `\n     🔴 ${b3.slice(0, 3).join(" · ")}` : ""));
if (fail === 0) {
  const m1 = sg1([["m-gk-m-ready(← dive-high)", path.join(ART, "m-gk-m-dive-high.webp")]]);
  check(m1[0].r > RMSE_MAX, `변이-SWAP(대칭 그림 자리에 다이브 그림) → SG-1이 빨간불 (${(m1[0].r * 100).toFixed(1)}%)`);
  check(sg2(MUT.NOERR).length > 0, "변이-NOERR(그림 `error` 손잡이 삭제 — 깨진 그림이 남음) → SG-2가 빨간불");
  check(sg3(MUT.RND).length > 0, "변이-RND(그림을 얹을 때 난수 한 번) → SG-3이 빨간불");
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
