/* ⚽ 더 윙어 II 1막 — 🧩 **경계면** — engineer가 만드는 칸 ↔ director가 읽는 칸 (25번 §3 계약 1~13 · §4 · 26번 §2 첫 줄)
 *
 * 각각 「올바르게」 구현돼 있는데 **연결 지점에서 이름 · 모양이 어긋나는** 결함을 봅니다. 한쪽만 열면 안 보여요 — **양쪽을 같이** 엽니다.
 *   K-1  계약 1  카드: 화면(`match-scene.js`)이 읽는 `card.*` ⊆ 엔진 카드의 칸 ∪ 드라이버가 다는 칸(`flow`) — 드라이버의 글 줄(`lineCard`)도 같은 모양
 *   K-2  계약 2  `W2Scene.mount` 칸: 드라이버가 넘기는 이름 = 화면이 읽는 이름 · 게임 안에서 실제로 넘어온 값(치비 경로 · 약속 줄 · 스카우트석)
 *   K-4  계약 4  `WingerLive.play` → info = 엔진 `result()` + `{ rating, promise, saved, boards }` · 약속 줄이 있을 때만 `promise: { ok }`
 *   K-5  계약 5  그림: `Art` 표 = `art/` 파일 66장(빠짐 · 남음 0) · 없는 사람은 `null` · 없는 표정은 `base` · **게임이 실제로 부른 그림이 전부 디스크에 있거나 `null`**(깨진 그림 0)
 *   K-6  계약 6  이벤트 · 이야기 카드의 도전 칸 = `parts: [{ k: "skill", v }, { k: "sit", v, text }]`(정수) — 합 + 50 = pct는 `visible-test`
 *   K-7  계약 7 · 8  평가서 · 엔딩 · 필름 모델을 **진짜 `scenes.js`가 그렸을 때** 칸마다 글자가 나오고 undefined/NaN 0 · 「점수 0」 · 「훈련 N주 · 휴식 M주」 · 「판 N번 · 평균 s̄」
 *   K-9  계약 9  화면 쪽(`scenes.js` · `match-scene.js` · `art.js`)은 세이브 · 전역 상태를 안 읽는다(`localStorage` · `W2Game` 0)
 *   K-10 계약 10 오버레이는 `#w2-layer`에 · **`click`으로만** 풀린다(`pointerdown`으로는 안 풀림 — ① 교훈)
 *   K-13 계약 13 화면 뼈대(`#app > #w2` · `#w2-layer`) · engineer 화면의 `w2-` 요소마다 **옷(CSS 규칙)이 닿는 클래스가 하나 이상**
 *   K-S  §4  `index.html` 스크립트 순서(env.js 맨 위 · game.js 맨 끝 · 그 사이 25번 §4 순서 그대로)
 *   K-W  sw.js `ASSETS` ⊇ 전용 js 전부 + `art/` 66장 · 목록의 파일이 전부 디스크에 · `focus.js`는 없음 · 캐시 이름 `winger2-` 접두사
 *   K-M  `manifest.webmanifest`의 `theme_color` == `<meta name="theme-color">`
 *   + 변이(대부분 **읽어 온 문자열에만** — 디스크는 안 건드려요) — 각각 제 문장이 빨간불
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { PAGE_DIR, BETA, bootPage, pageMutsOK, wait, load } = require("./_load.js");
const { boot, runAct, liveMatch, tap } = require("./_act.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const rd = (f) => fs.readFileSync(path.join(PAGE_DIR, f), "utf8");
/* 🔒 판 그림 키(박은 값 — 표를 읽지 않음) · 41번 §2 27 → reach · spread 4(31번 「reach · spread 배선」) →
 *    v3(44번 · 41번 §9 안 C): 슈터 뒷모습 `m-shooter-{g}-back` 2 더함 · 앞모습 `m-shooter-{g}` · 흐림 다리 `m-leg` 3 퇴역 = **30** */
const M_KEYS = ["m-ball", "m-boot", "m-taeo-stand", "m-seoa-stand"];
for (const g of ["m", "f"]) {
  for (const x of ["ready", "dive-high", "dive-low", "jump", "crouch", "reach", "spread"]) M_KEYS.push(`m-gk-${g}-${x}`);
  for (const x of ["ready", "run", "shoot", "cheer"]) M_KEYS.push(`m-mate-${g}-${x}`);
  M_KEYS.push(`m-def-${g}-tackle`, `m-shooter-${g}-back`);
}
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
const uniq = (a) => [...new Set(a)];

/* ══════════ K-S · K-W · K-M — 파일끼리 ══════════ */
const ORDER = ["../env.js", "../radar.js", "../timing.js", "../match.js", "../cloud.js", "../stats.js", "../fx.js", "../ads.js", "../help.js",
  "engine.js", "../winger-moment.js", "match-scene.js", "art.js", "scenes.js", "live.js", "world.js", "events.js", "story.js",
  "achieve.js", "book.js", "sheet.js", "film.js", "game.js"];   // 🔒 25번 §4를 그대로 박음(소스에서 안 읽음)
function kS(html) {
  const got = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  const swAt = html.indexOf('navigator.serviceWorker.register("sw.js")');
  const lastAt = html.lastIndexOf('<script src="game.js"></script>');
  return { ok: JSON.stringify(got) === JSON.stringify(ORDER) && swAt > lastAt && !/type="module"/.test(html), got };
}
function kW(sw, html) {
  const am = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  const assets = am ? [...am[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
  const norm = (p0) => path.resolve(PAGE_DIR, p0.split("?")[0]);
  const missing = assets.filter((a) => a !== "./" && !fs.existsSync(norm(a)));
  const own = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s2) => !s2.startsWith("../") || s2 === "../winger-moment.js");
  const needs = own.concat(["index.html", "style.css", "manifest.webmanifest"]).map((x) => (x.startsWith("../") ? x : `./${x}`));
  const art = fs.readdirSync(path.join(PAGE_DIR, "art")).filter((f) => f.endsWith(".webp")).map((f) => `./art/${f}`);
  const lack = needs.concat(art).filter((x) => assets.indexOf(x) < 0);
  const cache = (sw.match(/const CACHE = "([^"]+)"/) || [])[1] || "";
  const focus = assets.some((a) => /focus\.js/.test(a)) || /focus\.js/.test(html);
  return { ok: assets.length > 0 && missing.length === 0 && lack.length === 0 && !focus && /^winger2-/.test(cache), assets, missing, lack, art: art.length, cache, focus };
}
function kM(man, html) {
  let tc = null; try { tc = JSON.parse(man).theme_color; } catch (e) { tc = null; }
  const meta = (html.match(/<meta name="theme-color" content="([^"]+)"/) || [])[1] || null;
  return { ok: !!tc && tc === meta, tc, meta };
}
{
  const HTML = rd("index.html"), SW = rd("sw.js"), MAN = rd("manifest.webmanifest");
  const s1 = kS(HTML);
  check(s1.ok, `K-S. 📜 \`index.html\` 스크립트 순서가 25번 §4 그대로 — env.js 맨 위 · game.js 맨 끝 · 서비스워커 등록은 그 뒤 · 모듈 스크립트 0 (${s1.got.length}줄)`
    + (s1.ok ? "" : `\n     🔴 실제: ${s1.got.join(" → ")}`));
  const w1 = kW(SW, HTML);
  check(w1.ok, `K-W. 📦 sw.js \`ASSETS\` ${w1.assets.length}개 — 디스크에 없는 것 ${w1.missing.length} · 빠진 전용 파일/그림 ${w1.lack.length} · 그림 ${w1.art}장 · focus.js ${w1.focus ? "🔴 있음" : "없음"} · 캐시 「${w1.cache}」`
    + (w1.missing.length ? `\n     🔴 없는 파일(설치가 통째로 실패해요): ${w1.missing.join(" · ")}` : "") + (w1.lack.length ? `\n     🔴 빠짐(오프라인에서만 깨져요): ${w1.lack.slice(0, 8).join(" · ")}` : ""));
  const m1 = kM(MAN, HTML);
  check(m1.ok, `K-M. 🎨 manifest \`theme_color\` ${m1.tc} == \`<meta name="theme-color">\` ${m1.meta}`);
  /* 🔄 v3(44번 · 31번 v3) — 초상 · 치비 · 배경 126(첫 묶음 66 + 54 + 🧱 「나」 `chibi-guard` 6) + 판 그림 30 = 156 · 판 그림은 키 표와 1:1 · 모두 sw `ASSETS`에 */
  const mFiles = fs.readdirSync(path.join(PAGE_DIR, "art")).filter((f) => /^m-.*\.webp$/.test(f)).map((f) => f.replace(/\.webp$/, "")).sort();
  const mInSw = M_KEYS.filter((k2) => w1.assets.indexOf(`./art/${k2}.webp`) >= 0).length;
  check(w1.art === 156 && JSON.stringify(mFiles) === JSON.stringify([...M_KEYS].sort()) && mInSw === 30,
    `K-W2. 🖼️ \`art/\` 그림이 126 + 판 그림 30 = **156장**(${w1.art}장) · 판 그림 파일 ${mFiles.length}장이 키 30과 1:1 · sw \`ASSETS\`에 ${mInSw}/30`);
  /* 🔄 v2(39번 §2 「그림」) — 옛 사본 0: `.v1.` 이름 · 옛 이름 사본 `doyun-base` · `haram-base`(지금은 `doyun-m-base` …) */
  const stale = (names) => names.filter((f) => /\.v1\./.test(f) || /^(doyun|haram)-base\./.test(f));
  const ART_FILES = require("fs").readdirSync(require("path").join(PAGE_DIR, "art"));
  check(stale(ART_FILES).length === 0, `K-W3. 🧹 \`art/\`에 옛 사본 0 — \`.v1.\` · \`doyun-base\` · \`haram-base\` (${stale(ART_FILES).join(" · ") || "없음"})`);
  check(stale(ART_FILES.concat(["doyun-base.webp", "jiho-m-base.v1.webp"])).length === 2, `변이 — 옛 사본 두 장을 목록에 끼우면 → K-W3이 빨간불`);
  /* 🧪 변이 — 읽어 온 문자열에만 */
  const swapped = HTML.replace('<script src="scenes.js"></script>', "@@").replace('<script src="live.js"></script>', '<script src="scenes.js"></script>').replace("@@", '<script src="live.js"></script>');
  check(swapped !== HTML && !kS(swapped).ok, `변이 — scenes.js · live.js 순서를 바꾸면 → K-S가 빨간불`);
  const swNoArt = SW.replace('"./art/taeo-tears.webp",', "");
  check(swNoArt !== SW && !kW(swNoArt, HTML).ok, `변이 — ASSETS에서 그림 한 장을 빼면 → K-W가 빨간불(오프라인에서만 깨지는 그 자리)`);
  const swFocus = SW.replace('"./game.js",', '"./game.js", "./focus.js",');
  check(swFocus !== SW && !kW(swFocus, HTML).ok, `변이 — ASSETS에 focus.js를 넣으면 → K-W가 빨간불(다른 세션의 미커밋 파일 · 결정 8)`);
  const manM = MAN.replace(/("theme_color":\s*")#0f1830"/, '$1#102040"');
  check(manM !== MAN && !kM(manM, HTML).ok, `변이 — manifest의 \`theme_color\`만 바꾸면 → K-M이 빨간불`);
}

/* ══════════ K-5 — 그림 표 ↔ 파일 · 없는 조합 ══════════ */
/* 🔬 계측 — 표가 「있다」고 아는 열쇠(`HAVE`)를 꺼내는 창 하나만 냅니다(동작은 안 바꿔요). 💥 안 걸리면 죽어요 */
/* 🔄 v2 판 그림(41번 · 31번 「v2 판 그림 배선」) — 돌려주는 칸에 `sprite`가 더해짐 · 판 그림 표(`SPR`)도 꺼냄 */
const ART_INS = [/ {2}return \{ src, chibi, bg, alt, name, sprite \};/, "  return { src, chibi, bg, alt, name, sprite, __HAVE: HAVE, __SPR: SPR };"];
function artOf(srcText) {
  if (!ART_INS[0].test(srcText)) { console.log(`💥 art.js 계측 정규식이 안 걸려요 — ${ART_INS[0]}`); process.exit(2); }
  return new Function("window", `${srcText.replace(ART_INS[0], ART_INS[1])}\nreturn window.Art;`)({});
}
function k5static(A) {
  const files = fs.readdirSync(path.join(PAGE_DIR, "art")).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, ""));
  const claimed = [...A.__HAVE, ...A.__SPR];
  const claimNoFile = claimed.filter((k2) => files.indexOf(k2) < 0);
  const WHO = ["jiho-m", "jiho-f", "doyun-m", "doyun-f", "haram-m", "haram-f", "coach", "minjae", "taeo", "seheon", "minseo", "seoa", "gaeun", "scout", "dad", "mom", "grandma"];
  const MOODS = ["base", "smile", "fire", "tired", "down", "surprise", "moved", "stern", "worry", "smirk", "shock", "grin", "tears", "frown", "respect", "interest"];
  const POSES = ["base", "score", "block", "down", "guard"];   // v3: 🧱 「나」 막을 준비(44번 · 41번 §9)
  const reach = new Set();
  const bad = [];
  for (const w of WHO) {
    for (const m of MOODS) { const p = A.src(w, m); if (p) reach.add(p); if (p && !files.includes(p.replace(/^art\//, "").replace(/\.webp$/, ""))) bad.push(`${w}/${m} → ${p}`); }
    for (const po of POSES) { const p = A.chibi(w, po); if (p) reach.add(p); }
  }
  for (const f of files.filter((f) => /^(bg|end)-/.test(f))) { const p = A.bg(f); if (p) reach.add(p); }
  /* 🎮 판 그림 30장 — 키 표(박은 값)로 `sprite`가 닿는 것 */
  for (const k2 of M_KEYS) { const p = A.sprite(k2); if (p) reach.add(p); if (p && !files.includes(p.replace(/^art\//, "").replace(/\.webp$/, ""))) bad.push(`판 그림 ${k2} → ${p}`); }
  const sprSame = JSON.stringify([...A.__SPR].sort()) === JSON.stringify([...M_KEYS].sort());
  if (!sprSame) bad.push(`판 그림 표 ${A.__SPR.size}칸 ≠ 41번 ${M_KEYS.length}칸`);
  if (A.sprite("m-grass") !== null || A.sprite("m-gk-m-fly") !== null) bad.push("41번에 없는 판 그림 키가 null이 아님");
  const unreached = files.filter((f) => !reach.has(`art/${f}.webp`));
  /* v2(38번 §3 · 계약 16): 도윤 · 하람 남 · 여 · 엄마 · 할머니가 이제 그림을 가짐(첫 묶음엔 null이어야 했음) — 기준 그림이 있어야 */
  const ghosts = ["doyun-m", "doyun-f", "haram-m", "haram-f", "mom", "grandma"].filter((w) => A.src(w, "base") === null);
  const chibiGhost = ["doyun-m", "doyun-f", "haram-m", "haram-f"].filter((w) => A.chibi(w, "base") === null);
  ghosts.push(...chibiGhost.map((w) => `${w} 치비`));
  const fallback = A.src("coach", "tears") === A.src("coach", "base") && A.src("coach", "base") === "art/coach-base.webp";
  const nulls = [A.src(null, "base"), A.src("", "base"), A.src("nobody-x", "base"), A.bg("bg-nowhere"), A.bg(null)].every((x) => x === null);
  bad.push(...claimNoFile.map((k2) => `표의 열쇠 ${k2} → 파일 없음`));
  return { ok: bad.length === 0 && unreached.length === 0 && ghosts.length === 0 && fallback && nulls && claimed.length === files.length, bad, unreached, ghosts, fallback, nulls, files: files.length, claimed: claimed.length };
}
{
  const ART = rd("art.js");
  const k = k5static(artOf(ART));
  check(k.ok, `K-5. 🖼️ \`Art\` 표 ${k.claimed}칸 ↔ \`art/\` ${k.files}장 — 표가 가리키는데 파일 없음 ${k.bad.length} · 파일이 있는데 표가 안 닿음 ${k.unreached.length} · 도윤 · 하람 · 엄마 · 할머니 그림 있음 ${k.ghosts.length ? `🔴 ${k.ghosts.join(",")}` : "✔"} · 없는 표정은 base ${k.fallback ? "✔" : "🔴"} · 빈 값 null ${k.nulls ? "✔" : "🔴"}`
    + (k.bad.length ? `\n     🔴 깨진 그림: ${k.bad.slice(0, 5).join(" · ")}` : "") + (k.unreached.length ? `\n     🔴 안 닿는 파일: ${k.unreached.slice(0, 5).join(" · ")}` : ""));
  const m = ART.replace('taeo: "base grin fire tears"', 'taeo: "base grin fire tears cry"');
  check(m !== ART && !k5static(artOf(m)).ok, `변이 — 표에 없는 파일(「taeo-cry」)을 적으면 → K-5가 빨간불(깨진 그림)`);
  const m2 = ART.replace('taeo: "base grin fire tears"', 'taeo: "base grin fire"');
  check(m2 !== ART && !k5static(artOf(m2)).ok, `변이 — 표에서 표정 하나를 빼면 → K-5가 빨간불(그 파일에 안 닿음)`);
  const m3 = ART.replace('"ready dive-high dive-low jump crouch reach spread"', '"ready dive-high dive-low crouch reach spread"');
  check(m3 !== ART && !k5static(artOf(m3)).ok, `변이 — 판 그림 표에서 키퍼 「jump」를 빼면 → K-5가 빨간불(41번과 1:1이 깨짐)`);
}

/* ══════════ K-1 — 카드 칸 ══════════ */
function k1(sceneSrc, liveSrc) {
  const E = load();
  const xi = require("./_load.js").xiOf("wg", 56, 58);
  E._t.seed(7); E._t.skill = 0.5;
  const r = E._t.playMatch({ xi, oppName: "상대", teamStr: 58, oppStr: 58, condition: 51 });
  const engineKeys = uniq(r.cards.flatMap((c) => Object.keys(c)));
  /* 🔑 `match-scene.js`에는 카드 객체 말고 **DOM 요소 이름도 `card`**인 자리가 있어요(`card.classList`) — 요소의 속성 이름은 뺍니다
   *    (판정: 진짜 jsdom 요소에 그 이름이 있으면 카드 칸이 아님 · 목록을 베껴 적지 않아요) */
  const domEl = (() => { const { JSDOM } = require(path.join(require("./_load.js").ROOT, "tests/cloud/jsdom.js")); return new JSDOM("<!doctype html><div></div>").window.document.querySelector("div"); })();
  const reads = uniq([...code(sceneSrc).matchAll(/\bcard\.(\w+)/g)].map((m) => m[1])).filter((f) => !(f in domEl));
  const DRIVER = ["flow", "auto", "weak"];                   // live.js가 다는 칸 — 흐름 줄 `flow` · 내 순간 카드 `auto`(🤖) · `weak`(🦶 약발 상황 · 36번 §3-3)
  const LEGACY = ["poss", "shots", "rating"];                 // 🚧 화면이 「있으면」 그리는 하프타임 통계 — 1막은 안 만듦(아래 설명)
  const driverSet = uniq([...code(liveSrc).matchAll(/\bcard\.(\w+)\s*=[^=]/g)].map((m) => m[1]));   // 드라이버가 실제로 다는 칸
  const orphan = reads.filter((f) => engineKeys.indexOf(f) < 0 && !(DRIVER.indexOf(f) >= 0 && driverSet.indexOf(f) >= 0) && LEGACY.indexOf(f) < 0);
  const lineKeys = (() => {
    const m = liveSrc.match(/const lineCard = \(min, kind, text\) => \(\{([\s\S]*?)\}\);/);
    if (!m) return null;
    return uniq([...m[1].matchAll(/(\w+)\s*:/g)].map((x) => x[1]).concat([...m[1].matchAll(/(?:^|,)\s*(min|kind|text)\s*(?=,|$)/g)].map((x) => x[1]))).filter((x) => x !== "g" && x !== "a" && x !== "d");
  })();
  const lineMissing = lineKeys ? engineKeys.filter((k2) => lineKeys.indexOf(k2) < 0) : ["(lineCard를 못 찾음)"];
  return { ok: orphan.length === 0 && lineMissing.length === 0, reads, engineKeys, orphan, lineMissing, legacyRead: LEGACY.filter((f) => reads.indexOf(f) >= 0) };
}
{
  const SC = rd("match-scene.js"), LV = rd("live.js");
  const k = k1(SC, LV);
  check(k.ok, `K-1. 🎴 화면이 읽는 카드 칸 ${k.reads.length}개 ⊆ 엔진 카드 칸 ${k.engineKeys.length}개 + 드라이버 \`flow\` — 고아 ${k.orphan.length} · 드라이버 글 줄(\`lineCard\`)에 빠진 칸 ${k.lineMissing.length}`
    + (k.orphan.length ? `\n     🔴 아무도 안 만드는 칸을 화면이 읽어요(조용히 빈칸): ${k.orphan.join(" · ")}` : "")
    + (k.lineMissing.length ? `\n     🔴 글 줄에 빠진 칸: ${k.lineMissing.join(" · ")}` : ""));
  if (k.legacyRead.length) console.log(`🚧 K-1b. 화면이 「있으면」 그리는 하프타임 칸(${k.legacyRead.join(" · ")})을 **1막은 안 만듭니다** — 화면은 없으면 비워 두니(match-scene 주석) 게임엔 해가 없어요.\n     ❌ 다만 확인 페이지 덱(\`_check.html\` W2_DECK)이 이 칸을 채운 하프타임 5장을 보여 줍니다 → 게임에 없는 화면(\`check-page-test\` 🟩 칸 문장이 빨간불로 잡아요)`);
  const m = SC.replace(/card\.stakeKey/g, "card.stake_key");
  check(m !== SC && !k1(m, LV).ok, `변이 — 화면이 \`stakeKey\`를 다른 이름(\`stake_key\`)으로 읽으면 → K-1이 빨간불`);
}

/* ══════════ K-2 — mount 칸(소스 ↔ 소스) ══════════ */
/* 객체 리터럴의 열쇠 — `a: x` · 줄임(`myName`) 둘 다(괄호 안 쉼표는 안 가름) */
function objKeys(body) {
  const out = []; let depth = 0, cur = "";
  for (const ch of body + ",") {
    if ("([{".includes(ch)) depth += 1;
    if (")]}".includes(ch)) depth -= 1;
    if (ch === "," && depth === 0) { const t = cur.trim(); if (t) { const m = t.match(/^(\w+)\s*(?::|$)/); if (m) out.push(m[1]); } cur = ""; continue; }
    cur += ch;
  }
  return uniq(out);
}
function k2(liveSrc, sceneSrc) {
  const lm = liveSrc.match(/Scene\.mount\(sceneEl, \{([\s\S]*?)\}\);/);
  const passed = lm ? objKeys(lm[1]) : [];
  const mm = sceneSrc.match(/function mount\(host, cfg\) \{([\s\S]*?)\n {2}\}/);
  const read = mm ? uniq([...mm[1].matchAll(/\bc\.(\w+)/g)].map((x) => x[1])) : [];
  const A = passed.slice().sort().join(","), B = read.slice().sort().join(",");
  return { ok: passed.length >= 7 && A === B, passed, read };
}
{
  const LV = rd("live.js"), SC = rd("match-scene.js");
  const k = k2(LV, SC);
  check(k.ok, `K-2. 🎬 \`W2Scene.mount\` — 드라이버가 넘기는 칸 = 화면이 읽는 칸 (${k.passed.join(" · ")})`
    + (k.ok ? "" : `\n     🔴 넘김 ${k.passed.join(",")} ↔ 읽음 ${k.read.join(",")}`));
  const m = LV.replace("promiseLine: c.promiseLine || null,", "promise: c.promiseLine || null,");
  check(m !== LV && !k2(m, SC).ok, `변이 — 드라이버가 \`promiseLine\`을 \`promise\`로 넘기면 → K-2가 빨간불(약속 줄이 조용히 안 떠요)`);
}

/* ══════════ K-9 — 화면 쪽은 세이브 · 전역 상태를 안 읽는다(v2: 계약 14 · 17로 좁힌 예외 셋) ══════════ */
/* 🔒 `localStorage` · `sessionStorage` 0 · `W2Game`에서 읽는 이름은 **`settings` · `help` · `boardStats`만**(38번 §6 14-b —
 *    「레이어가 부르는 것은 `W2Game.settings` · `help` · `boardStats`(베타만) · `Cloud.openModal`뿐」). 별칭(`G()`)도 같이 셉니다 */
const K9_OK = ["settings", "help", "boardStats"];
function k9(texts) {
  const out = [];
  for (const [f, t] of Object.entries(texts)) {
    const c = code(t);
    if (/\blocalStorage\b|\bsessionStorage\b/.test(c)) out.push(`${f}: 저장소를 직접 읽음`);
    const names = [...c.matchAll(/\bW2Game\s*(?:&&\s*window\.W2Game)?\.(\w+)/g)].map((m) => m[1])
      .concat([...c.matchAll(/\bG\(\)\.(\w+)/g)].map((m) => m[1]));
    const bad = uniq(names.filter((n) => K9_OK.indexOf(n) < 0));
    if (bad.length) out.push(`${f}: W2Game.${bad.join(" · ")}`);
    /* `const g = G();` 같은 별칭에서 읽는 이름 */
    for (const m of c.matchAll(/const (\w+) = G\(\);/g)) {
      const al = m[1];
      const body = c.slice(m.index, (c.indexOf("\n  }", m.index) + 1 || c.length));   // 별칭이 사는 함수 몸통만(다른 함수의 `g`와 섞이지 않게)
      const bad2 = uniq([...body.matchAll(new RegExp(`\\b${al}\\.(\\w+)`, "g"))].map((x) => x[1]).filter((n) => K9_OK.indexOf(n) < 0));
      if (bad2.length) out.push(`${f}: ${al}.${bad2.join(" · ")}`);
    }
  }
  return out;
}
{
  const T = { "scenes.js": rd("scenes.js"), "match-scene.js": rd("match-scene.js"), "art.js": rd("art.js") };
  const hit = k9(T);
  check(hit.length === 0, `K-9. 🔒 화면 쪽 파일(scenes · match-scene · art)이 세이브를 직접 안 읽고 \`W2Game\`에선 \`settings\` · \`help\` · \`boardStats\`만 부른다(계약 14 · 17 · 38번 §6 14-b)${hit.length ? ` — 🔴 ${hit.join(" · ")}` : ""}`);
  const m = Object.assign({}, T, { "scenes.js": T["scenes.js"].replace("const art = () => window.Art || null;", "const art = () => window.Art || null; const peek = () => localStorage.getItem(\"winger2-save-v2\");") });
  check(k9(m).length > 0, `변이 — scenes.js가 세이브를 엿보면 → K-9가 빨간불`);
  const m2 = Object.assign({}, T, { "scenes.js": T["scenes.js"].replace("const G = () => window.W2Game || null;", "const G = () => window.W2Game || null; const peek2 = () => G().loadSave();") });
  check(m2["scenes.js"] !== T["scenes.js"] && k9(m2).length > 0, `변이 — scenes.js가 \`W2Game.loadSave()\`를 부르면(예외 셋 밖) → K-9가 빨간불`);
}

(async () => {
  /* ══════════ 게임 한 판 — K-2(실제 값) · K-5(실제로 부른 그림) · K-6 · K-13 ══════════ */
  const env = boot({ seed: 909, pos: "df", gender: "f", name: "강민서", hand: (k) => (k === "defend" ? 0.7 : 0.4), policy: { promise: true, tryAt: 45 } });
  const classSets = new Map();
  const r = await runAct(env, { until: () => {
    for (const el of env.w.document.querySelectorAll("#w2 [class]")) {
      if (el.closest(".w2-scene")) continue;                 // 경기 화면 안은 director 몫(`pitch-test`가 봄)
      const cls = [...el.classList].filter((c) => /^w2-/.test(c));
      if (cls.length) classSets.set(cls.slice().sort().join(" "), cls);
    }
    return false;
  } });
  const S = r.S;
  check(r.done, `🔎 측정 조건 — 1막 한 판(여자부 수비수 · 시드 909 · 판 손 🧱 .7 · 그 밖 .4 · 약속 고름) ${r.done ? "졸업까지" : `🔴 멈춤 — ${r.stuck}`} · 경기 화면 ${env.seen.mounts.length}번 · 카드 ${env.seen.card.length}장`);

  /* K-2 실제 값 */
  {
    const Art = env.w.Art;
    const who = `${S.preset}-${S.gender}`;
    const wantChibi = Art.chibi(who, "base");
    const ms = env.seen.mounts;
    const badChibi = ms.filter((c) => c.chibi !== wantChibi);
    const test = ms.filter((c) => c.week === 35);
    const leagueScout = ms.filter((c) => c.week !== 35 && c.scout !== null);
    const testScout = test.every((c) => c.scout === Art.src("scout", "interest")) && test.length === 1;
    const withP = ms.filter((c) => typeof c.promiseLine === "string").length;
    const judged = (S.evLog || []).filter((l) => l.k === "promise" && l.ok !== null && !l.expired).length;
    const posOK = ms.every((c) => c.pos === S.pos);
    check(badChibi.length === 0 && fs.existsSync(path.join(PAGE_DIR, wantChibi)) && leagueScout.length === 0 && testScout && posOK,
      `K-2b. 🎬 게임이 실제로 넘긴 값 — 치비 \`${wantChibi}\`(파일 있음) ${ms.length - badChibi.length}/${ms.length} · 스카우트석은 35주 테스트 경기에만(${test.length}번 · 리그/대회 ${leagueScout.length}번) · \`pos\` 늘 ${S.pos}`);
    check(withP >= 1 && withP === judged, `K-2c. 📋 약속 줄은 **그 약속이 판정될 경기에만** — 약속 줄을 단 경기 ${withP}번 = 판정된 약속 ${judged}개`);
  }
  /* K-5 실제로 부른 그림 */
  {
    const Art = env.w.Art;
    const calls = [];
    for (const c of env.seen.card) { if (c.who) calls.push({ who: c.who, mood: c.mood, bg: c.bg, at: `card:${c.kind}:${c.id || c.title}` }); for (const o of c.opts || []) if (o.who) calls.push({ who: o.who, mood: o.mood || "base", at: "opt" }); }
    for (const p of env.seen.portraits || []) calls.push({ who: p.who, mood: p.mood, bg: p.bg, at: "portrait" });
    for (const e of env.seen.ending) calls.push({ who: e.who, mood: e.mood, bg: e.bg, at: "ending" });
    for (const f of env.seen.film) for (const ch of f.ch || []) calls.push({ who: ch.who, mood: ch.mood, bg: ch.bg, at: `film:${ch.k}` });
    for (const it of env.seen.intro) { calls.push({ who: it.who, mood: "base", bg: it.bg, at: "intro" }); for (const l of it.lines || []) calls.push({ who: it.who, mood: l.mood, at: "intro-line" }); }
    const broken = [];
    for (const c of calls) {
      const p = c.who ? Art.src(c.who, c.mood) : null;
      if (p && !fs.existsSync(path.join(PAGE_DIR, p))) broken.push(`${c.at} ${c.who}/${c.mood} → ${p}`);
      const b = c.bg ? Art.bg(c.bg) : null;
      if (b && !fs.existsSync(path.join(PAGE_DIR, b))) broken.push(`${c.at} bg ${c.bg} → ${b}`);
    }
    const nullWho = uniq(calls.filter((c) => c.who && !Art.src(c.who, c.mood)).map((c) => c.who));
    check(calls.length > 50 && broken.length === 0, `K-5b. 🖼️ 게임이 한 판 동안 부른 그림 ${calls.length}번이 전부 **디스크에 있거나 null**(깨진 그림 0)${nullWho.length ? ` · null로 이름 글자가 대신하는 사람 ${nullWho.join(" · ")}` : ""}`
      + (broken.length ? `\n     🔴 ${broken.slice(0, 5).join(" · ")}` : ""));
  }
  /* K-6 */
  {
    const tries = env.seen.card.flatMap((c) => (c.opts || []).filter((o) => o.k === "try").map((o) => ({ c, o })));
    const bad = tries.filter(({ o }) => !(Array.isArray(o.parts) && o.parts.length === 2 && o.parts[0].k === "skill" && o.parts[1].k === "sit"
      && Number.isInteger(o.parts[0].v) && Number.isInteger(o.parts[1].v) && typeof o.parts[1].text === "string" && o.parts[1].text.length > 0));
    check(tries.length >= 3 && bad.length === 0, `K-6. 🎲 도전 칸 ${tries.length}개가 전부 \`parts: [{ k: "skill", v: 정수 }, { k: "sit", v: 정수, text }]\` 모양`
      + (bad.length ? `\n     🔴 ${bad.slice(0, 3).map(({ c, o }) => `${c.id}: ${JSON.stringify(o.parts)}`).join(" · ")}` : ""));
  }
  /* K-13 뼈대 · 옷 */
  {
    const D = env.w.document;
    const skel = !!D.querySelector("main#app > #w2") && !!D.querySelector("body > #w2-layer");
    const css = fs.readFileSync(path.join(PAGE_DIR, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const has = (c) => new RegExp(`\\.${c.replace(/[-]/g, "\\-")}(?![\\w-])`).test(css);
    /* 🧺 **담는 칸 넷은 일부러 옷이 없어요**(director 31번 §7 ④ — `w2-live` · `w2-live-scene` · `w2-tech-slot` · `w2-pk-board`:
     *    안에 다른 화면 조각이 통째로 들어가는 그릇). 🔒 목록을 **여기 박습니다** — 새 그릇이 생기면 이유와 함께 더하세요 */
    const CONTAINER = ["w2-live", "w2-live-scene", "w2-tech-slot", "w2-pk-board"];
    const naked = [...classSets.values()].filter((cls) => !cls.some(has) && !cls.every((c) => CONTAINER.indexOf(c) >= 0)).map((cls) => cls.join(" "));
    check(skel && classSets.size >= 40 && naked.length === 0, `K-13. 🧱 뼈대 \`main#app > #w2\` · \`#w2-layer\` ${skel ? "✔" : "🔴"} · engineer 화면의 \`w2-\` 클래스 조합 ${classSets.size}종이 전부 **옷이 닿는 클래스를 하나 이상** 가진다`
      + (naked.length ? `\n     🔴 옷이 없는 요소: ${naked.slice(0, 8).join(" | ")} — 이름이 갈렸으면 화면이 기본 모양으로 떨어져요` : ""));
  }
  env.w.close();

  /* ══════════ K-4 — info 모양 ══════════ */
  {
    const a = await liveMatch({ seed: 11, pos: "wg", hand: () => 0.6 });
    const b = await liveMatch({ seed: 11, pos: "wg", hand: () => 0.6, promiseLine: "📋 약속: 그 경기에서 내 순간을 한 번 이상 살린다" });
    const E = load(); E._t.seed(1);
    const resKeys = Object.keys(E._t.playMatch({ xi: require("./_load.js").xiOf("wg", 56, 58), oppName: "x", teamStr: 58, oppStr: 58, condition: 51 }));
    const ia = a.info, ib = b.info;
    const keysOK = (i) => i && resKeys.every((k) => k in i) && ["rating", "promise", "saved", "boards"].every((k) => k in i);
    const boardsOK = (i) => Array.isArray(i.boards) && i.boards.every((x) => ["goal", "assist", "defend"].includes(x.kind) && Number.isFinite(x.s) && ["perfect", "ok", "miss"].includes(x.judge));
    check(keysOK(ia) && keysOK(ib) && boardsOK(ia) && boardsOK(ib) && ia.promise === null && ib.promise && typeof ib.promise.ok === "boolean" && Number.isFinite(ia.rating),
      `K-4. ⚽ \`WingerLive.play\` → info = 엔진 result() ${resKeys.length}칸 + rating · promise · saved · boards — 약속 줄 없으면 promise null · 있으면 { ok: ${ib && ib.promise ? ib.promise.ok : "?"} } · 판 ${ia.boards.length}번`);
    a.close(); b.close();
  }

  /* ══════════ K-7 · K-10 — 진짜 scenes.js로 그려 보기 ══════════ */
  async function sceneRender(muts) {
    const W = bootPage({ fastTimers: true, muts });
    const D = W.document;
    for (let i = 0; i < 400 && !D.querySelector("#w2-entry"); i++) await wait(5);
    return W;
  }
  {
    /* 진짜 모델 — 위 판(S)에서 얼린 평가서 · 엔딩 · 필름을 그대로 */
    const W = await sceneRender(null);
    const D = W.document;
    const layer = D.getElementById("w2-layer");
    const okBtn = () => layer.querySelector(".w2o-ok, .w2o-next");
    const sheetP = W.W2Scenes.sheet(Object.assign({ title: "📋 스카우트 평가서" }, S.sheet));
    await wait(5);
    const sheetText = layer.textContent;
    const colsOK = S.sheet.cols.every((c) => sheetText.indexOf(c.label.replace(/^\S+\s/, "")) >= 0);
    const zero = /점수 0/.test(sheetText) && sheetText.indexOf(S.sheet.coach.line) >= 0;
    const clean = !/undefined|NaN|null/.test(sheetText);
    const b1 = okBtn(); if (b1) tap(W, b1);
    await sheetP;
    const filmP = W.W2Scenes.film(env.seen.film[0]);
    await wait(5);
    const filmText = layer.textContent;
    const weeks = `훈련 ${S.trainWeeks}주(🦶 약발 ${S.weakWeeks || 0}주) · 휴식 ${S.restWeeks}주`;
    /* 🫀 관리 줄 — v3(44번 · 30번 v3): 평가서 관리 칸 글 그대로에 「🫀 」(한 곳에서 나옴 · auto-mark AM-2가 규칙을 봄) */
    const boards = `🫀 ${S.sheet.cols.find((c) => c.k === "care").note}`;
    const filmOK = filmText.indexOf(weeks) >= 0 && filmText.indexOf(boards) >= 0 && !/undefined|NaN/.test(filmText);
    check(colsOK && zero && clean, `K-7. 📋 진짜 평가서 모델을 진짜 \`scenes.js\`가 그림 — 다섯 칸 이름 ✔ · 감독 의견 「${S.sheet.coach.line}」 옆 「점수 0」 ${zero ? "✔" : "🔴"} · undefined/NaN/null ${clean ? "0" : "🔴 있음"}`);
    check(filmOK, `K-8. 🎬 진짜 필름 모델을 그림 — 「${weeks}」 · 「${boards}」 한 줄씩 ${filmOK ? "✔" : "🔴"}`);
    W.close();
    /* 🧪 K-8 변이 — 필름이 평가서 글 대신 따로 적으면 */
    const M8 = { "film.js": [[/sk \? `\$\{sk\.k === "care" \? "🫀" : "🎮"\} \$\{sk\.note\}` : "🫀 평가서 전이에요"\]/, 'sk ? `🫀 경기 날 컨디션 ${skd.avg}` : "🫀 평가서 전이에요"]']] };
    const bad8 = pageMutsOK({ M8 });
    if (bad8.length) check(false, `K-8 변이 정규식이 film.js에 안 걸림 — ${bad8.join(" · ")}`);
    else {
      const Wm = await sceneRender(M8);
      const line = (Wm.W2Film.build(S).ch.find((c) => c.k === "body") || { lines: [] }).lines.join(" | ");
      Wm.close();
      check(line.indexOf(boards) < 0, `변이 — 필름 판 줄이 평가서 글을 안 쓰면 → K-8이 빨간불(「${line}」)`);
    }
  }
  async function clickOnly(muts) {
    const W = await sceneRender(muts);
    const D = W.document;
    let got = null;
    const p = W.W2Scenes.card({ kind: "event", id: "a_night", title: "🦶 불 꺼진 운동장", body: "…", who: "jiho-m", mood: "base", bg: "bg-field",
      opts: [{ k: "safe", label: "넘긴다" }, { k: "try", label: "남는다", pct: 44, parts: [{ k: "skill", v: 0, label: "실력" }, { k: "sit", v: -6, text: "가로등 하나가 나갔어요" }], chips: { win: [], lose: [] } }] });
    p.then((v) => { got = v; });
    await wait(5);
    const root = D.querySelector("#w2-layer .w2o");
    const btns = root ? [...root.querySelectorAll("button")].filter((b) => /남는다/.test(b.textContent)) : [];
    const opt = btns[0];
    if (opt) { opt.dispatchEvent(new W.Event("pointerdown", { bubbles: true, cancelable: true })); opt.dispatchEvent(new W.Event("pointerup", { bubbles: true, cancelable: true })); }
    await wait(5);
    const beforeClick = got;
    if (opt) opt.dispatchEvent(new W.MouseEvent("click", { bubbles: true, cancelable: true }));
    await wait(5);
    W.close();
    return { inLayer: !!root, beforeClick, after: got, opt: !!opt };
  }
  {
    const c = await clickOnly(null);
    const ok = c.inLayer && c.opt && c.beforeClick === null && c.after === 1;
    check(ok, `K-10. 👆 오버레이는 \`#w2-layer\`에 뜨고 **\`click\`으로만** 풀린다 — pointerdown · pointerup 뒤 ${c.beforeClick === null ? "안 풀림" : `🔴 풀림(${c.beforeClick})`} · click 뒤 ${c.after}`);
    const M10 = { "scenes.js": [[/ {10}b\.addEventListener\("click", \(\) => finish\(i\)\);/, '          b.addEventListener("pointerdown", () => finish(i));']] };
    const bad = pageMutsOK({ M10 });
    if (bad.length) check(false, `변이 정규식이 scenes.js에 안 걸려요 — ${bad.join(" · ")}`);
    else { const m = await clickOnly(M10); check(m.beforeClick !== null, `변이 — 선택지가 pointerdown에서 풀리게 하면 → K-10이 빨간불 (손 떼기 전에 ${m.beforeClick})`); }
  }

  /* 🧪 K-13 변이 — 게임 화면의 클래스 이름 하나를 갈아 옷을 잃게(진짜 페이지 · 진짜 한 판의 앞부분) */
  {
    const M13 = { "game.js": [[/const gz = h\("div", "w2-gauge",/, 'const gz = h("div", "w2-gauge-x",']] };
    const bad = pageMutsOK({ M13 });
    if (bad.length) check(false, `변이 정규식이 game.js에 안 걸려요 — ${bad.join(" · ")}`);
    else {
      const e2 = boot({ seed: 909, pos: "df", gender: "f", auto: true, muts: M13 });
      const sets = new Map();
      await runAct(e2, { until: (S2) => {
        for (const el of e2.w.document.querySelectorAll("#w2 [class]")) {
          if (el.closest(".w2-scene")) continue;
          const cls = [...el.classList].filter((c) => /^w2-/.test(c));
          if (cls.length) sets.set(cls.slice().sort().join(" "), cls);
        }
        return S2 && S2.week >= 3;
      } });
      const css = fs.readFileSync(path.join(PAGE_DIR, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const has = (c) => new RegExp(`\\.${c.replace(/[-]/g, "\\-")}(?![\\w-])`).test(css);
      const CONTAINER = ["w2-live", "w2-live-scene", "w2-tech-slot", "w2-pk-board"];
      const naked = [...sets.values()].filter((cls) => !cls.some(has) && !cls.every((c) => CONTAINER.indexOf(c) >= 0));
      check(naked.length > 0, `변이 — 게이지 클래스를 \`w2-gauge-x\`로 바꾸면 → K-13이 빨간불 (옷 없는 요소 ${naked.map((c) => c.join(" ")).join(" | ")})`);
      e2.w.close();
    }
  }
  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`💥 ${e && e.stack ? e.stack : e}`); process.exit(2); });
