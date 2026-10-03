/* ⚽ 더 윙어 II 1막 — 🚧 **울타리** (결정 1 · 8 · 25번 §8 · 32번 · 26번 §2 · §5)
 *
 *   FE-1  더 윙어 1은 그대로 — `soccer/` · `beta/soccer/`에 커밋 안 된 변경 · 새 파일이 **0개**(git이 없으면 🚧)
 *   FE-2  `beta/winger2/focus.js`(다른 세션의 미커밋 파일 · 결정 8)를 **어디서도 안 부름** — `index.html` 스크립트 · `sw.js` ASSETS ·
 *         코드(주석을 뺀) 어디에도 `focus.js` · `WingerFocus`가 없음
 *   FE-3  공유 등록 지점 — `beta/index.html` 허브 카드 `save: "winger2-save-v2"` · `beta/cloud.js`(SAVE · SUMMARY · 도감 키 · 이름표) ·
 *         `beta/_fixtures.js` winger2 칸마다 세이브가 **읽히는 모양**(v 2 · 1~36주 · 주인공 · 포지션)이고 허브 색인이 그 세이브와 맞음 · `_check.html`이 winger2를 앎
 *   FE-4  🏫 학교 이름(32번 · 25번 §8) — 실재 고교와 같은 옛 이름 10개 + 다른 작품의 이름 2개가 **저장소 코드 전체에서 0건** ·
 *         `SCHOOLS` 길이 38 그대로(이름 뽑기의 난수 소비 불변) · 서로 다름 · 바꾼 이름 12개가 다 있음 · 주인공 학교 「솔빛고」는 목록 밖
 *   + 변이(파일 안 — 검사 함수에 고친 사본을 넣어 빨간불을 봅니다)
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT, BETA, PAGE_DIR } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const read = (p) => fs.readFileSync(p, "utf8");
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1").replace(/<!--[\s\S]*?-->/g, "");

/* ══════════ FE-1 ══════════ */
const fe1 = (porcelain) => porcelain.split("\n").map((l) => l.trim()).filter(Boolean);
{
  let out = null;
  try { out = execFileSync("git", ["status", "--porcelain", "--", "soccer/", "beta/soccer/"], { cwd: ROOT, encoding: "utf8" }); } catch (e) { out = null; }
  if (out == null) console.log("🚧 FE-1. git을 못 불러요(저장소 밖 · git 없음) — 더 윙어 1 불변은 이 환경에서 못 봐요");
  else {
    const ch = fe1(out);
    check(ch.length === 0, `FE-1. 🔒 더 윙어 1 그대로 — \`soccer/\` · \`beta/soccer/\`의 커밋 안 된 변경 · 새 파일 ${ch.length}개` + (ch.length ? `\n     🔴 ${ch.slice(0, 5).join(" · ")}` : ""));
    check(fe1(" M beta/soccer/game.js\n?? soccer/new.js\n").length === 2, `변이 — 바뀐 줄이 있는 git 출력을 넣으면 → FE-1이 빨간불`);
  }
}

/* ══════════ FE-2 ══════════ */
const W2_HTML = read(path.join(PAGE_DIR, "index.html"));
const SW = read(path.join(PAGE_DIR, "sw.js"));
function codeFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^(node_modules|\.git|art|img|images|fonts)$/.test(e.name)) out.push(...codeFiles(p)); }
    else if (/\.(js|mjs|html|css|json)$/.test(e.name) && !/_fixtures\.js$/.test(e.name)) out.push(p);
  }
  return out;
}
function fe2(html, sw, files) {
  const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  const assets = ((sw.match(/ASSETS\s*=\s*\[([\s\S]*?)\]/) || [])[1] || "");
  const inHtml = scripts.some((s) => /focus\.js/.test(s));
  const inSw = /focus\.js/.test(noComments(assets));
  const refs = files.filter(([p, t]) => !/focus\.js$/.test(p) && /focus\.js|WingerFocus/.test(noComments(t))).map(([p]) => path.relative(ROOT, p));
  return { ok: !inHtml && !inSw && refs.length === 0, inHtml, inSw, refs, scripts: scripts.length };
}
const FILES = codeFiles(BETA).concat(fs.existsSync(path.join(ROOT, "scripts")) ? codeFiles(path.join(ROOT, "scripts")) : []).map((p) => [p, read(p)]);
{
  const r = fe2(W2_HTML, SW, FILES);
  check(r.ok, `FE-2. 🚫 \`focus.js\`(다른 세션의 미커밋 파일)를 아무도 안 부름 — index.html 스크립트 ${r.scripts}개 중 ${r.inHtml ? "🔴 있음" : "없음"} · sw.js ASSETS ${r.inSw ? "🔴 있음" : "없음"} · 코드 참조 ${r.refs.length}곳(파일 ${FILES.length}개 · 주석 뺌)`
    + (r.refs.length ? `\n     🔴 ${r.refs.join(" · ")}` : ""));
  const m1 = fe2(W2_HTML.replace("</body>", '<script src="focus.js"></script></body>'), SW, FILES);
  check(!m1.ok, `변이 — index.html에 \`<script src="focus.js">\`를 넣으면 → FE-2가 빨간불`);
  const m2 = fe2(W2_HTML, SW, FILES.concat([[path.join(PAGE_DIR, "x.js"), "if (window.WingerFocus) window.WingerFocus.open();"]]));
  check(!m2.ok, `변이 — 코드가 \`WingerFocus\`를 부르면 → FE-2가 빨간불`);
}

/* ══════════ FE-3 ══════════ */
const HUB = read(path.join(BETA, "index.html"));
const CLOUD = read(path.join(BETA, "cloud.js"));
const FIX = read(path.join(BETA, "_fixtures.js"));
const CHECK = read(path.join(BETA, "_check.html"));
function fe3(hub, cloud, fix, chk) {
  const bad = [];
  if (!/\{[^{}]*slug:\s*"winger2"[^{}]*save:\s*"winger2-save-v2"[^{}]*\}/.test(hub)) bad.push("허브 카드 save");
  if (!/winger2:\s*"winger2-save-v2"/.test(cloud)) bad.push("cloud SAVE");
  if (!/if \(game === "winger2"\) out\.push\("winger2-book"\)/.test(cloud) || /winger2-book-shadow|"-shadow"\)/.test(noComments(cloud).replace(/\/\/.*$/gm, ""))) bad.push("cloud 도감 키");
  if (!/winger2:\s*function\s*\(s\)/.test(cloud)) bad.push("cloud SUMMARY");
  if (!/winger2:\s*"⚽[^"]*"/.test(cloud)) bad.push("cloud 이름표");
  if (!/winger2/.test(chk)) bad.push("_check.html");
  /* 픽스처 — winger2 칸마다 세이브가 읽히는 모양이고 색인이 그 세이브와 맞음 */
  let FX = null;
  try { const W = {}; new Function("window", fix)(W); FX = W.CHECK_FIXTURES && W.CHECK_FIXTURES.items; } catch (e) { bad.push(`_fixtures.js 못 읽음(${e.message})`); }
  const cells = (Array.isArray(FX) ? FX : []).filter((f) => f && f.game === "winger2");
  if (cells.length < 4) bad.push(`winger2 픽스처 ${cells.length}칸`);
  for (const c of cells) {
    const st = c.storage || c.ls || c.keys || {};
    let sv = null, ix = null;
    try { sv = JSON.parse(st["winger2-save-v2"]); ix = JSON.parse(st["winger2-save-v2-slots"]); } catch (e) { bad.push(`${c.id}: JSON`); continue; }
    const shape = sv && sv.v === 2 && sv.world && sv.stats && sv.preset === "jiho" && ["fw", "wg", "mf", "df"].indexOf(sv.pos) >= 0 && Number.isInteger(sv.week) && sv.week >= 1 && sv.week <= 36;
    if (!shape) bad.push(`${c.id}: 세이브 모양`);
    const label = sv && (sv.act1 ? "졸업" : `1막 ${sv.week}주`);
    if (!ix || !ix.main || ix.main.name !== sv.name || ix.main.label !== label || ix.main.savedAt !== (sv.savedAt || 0)) bad.push(`${c.id}: 색인 ${JSON.stringify(ix && ix.main)} ↔ ${sv && sv.name} · ${label}`);
  }
  return { bad, cells: cells.map((c) => c.id) };
}
{
  const r = fe3(HUB, CLOUD, FIX, CHECK);
  check(r.bad.length === 0, `FE-3. 🔗 공유 등록 지점 — 허브 카드 \`save\` · cloud(SAVE · SUMMARY · 도감 키 · 이름표) · _check.html · 픽스처 ${r.cells.length}칸(${r.cells.join(" · ")})의 세이브 모양 · 색인`
    + (r.bad.length ? `\n     🔴 ${r.bad.slice(0, 5).join(" · ")}` : ""));
  check(fe3(HUB.replace('save: "winger2-save-v2"', 'save: "winger2-save-v1"'), CLOUD, FIX, CHECK).bad.length > 0, `변이 — 허브 카드가 옛 키를 보면 → FE-3이 빨간불`);
  check(fe3(HUB, CLOUD, FIX.replace(/\\"name\\":\\"지호\\"/, '\\"name\\":\\"딴이름\\"'), CHECK).bad.length > 0, `변이 — 픽스처 세이브의 이름만 바뀌면(색인과 어긋남) → FE-3이 빨간불`);
}

/* ══════════ FE-4 — 학교 이름 ══════════ */
/* 옛 이름은 글자를 쪼개 둡니다 — 이 파일이 저장소 검색에 걸리지 않게 */
const OLD = [["다", "솜"], ["가", "람"], ["라", "온"], ["도", "담"], ["소", "담"], ["아", "라"], ["마", "루"], ["이", "음"], ["새", "길"], ["해", "밀"], ["새", "봄"], ["은", "하"]].map(([a, b]) => `${a}${b}고`);
const NEW = ["도란고", "미리내고", "꽃샘고", "느티고", "살구고", "높새고", "큰들고", "들샘고", "들녘고", "언덕고", "단비고", "잎새고"];
const WSRC = read(path.join(PAGE_DIR, "world.js"));
function fe4(wsrc, files) {
  const m = wsrc.match(/const SCHOOLS = \[([\s\S]*?)\];/);
  const list = m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  const hits = [];
  for (const [p, t] of files) for (const n of OLD) if (t.indexOf(n) >= 0) hits.push(`${path.relative(ROOT, p)}: ${n}`);
  const our = (wsrc.match(/const OUR_SCHOOL = "([^"]+)"/) || [])[1];
  return { ok: list.length === 38 && new Set(list).size === 38 && NEW.every((n) => list.indexOf(n) >= 0) && OLD.every((n) => list.indexOf(n) < 0) && hits.length === 0 && our === "솔빛고" && list.indexOf(our) < 0,
    n: list.length, hits, our, missingNew: NEW.filter((n) => list.indexOf(n) < 0) };
}
{
  const repo = codeFiles(ROOT).filter((p) => !/[/\\](docs|node_modules|\.git)[/\\]/.test(p) && !/fence-test\.js$/.test(p)).map((p) => [p, read(p)]);
  const r = fe4(WSRC, repo.concat([[path.join(PAGE_DIR, "world.js"), WSRC]]));
  check(r.ok, `FE-4. 🏫 학교 이름 — \`SCHOOLS\` ${r.n}개(서로 다름 · 바꾼 이름 12개 ${r.missingNew.length ? `🔴 빠짐 ${r.missingNew.join(",")}` : "다 있음"}) · 주인공 학교 「${r.our}」 목록 밖 · 옛 이름 12개가 저장소 코드 파일 ${repo.length}개에서 ${r.hits.length}건`
    + (r.hits.length ? `\n     🔴 ${r.hits.slice(0, 5).join(" · ")}` : ""));
  check(!fe4(WSRC.replace('"꽃샘고"', `"${OLD[2]}"`), repo).ok, `변이 — 옛 이름 하나를 되돌리면 → FE-4가 빨간불`);
  check(!fe4(WSRC.replace('"해솔고"]', '"해솔고", "새솔고"]'), repo).ok, `변이 — 목록 길이가 39가 되면(난수 소비가 바뀜) → FE-4가 빨간불`);
}
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
