/* ⚽ 더 윙어 II — 경계면 교차 검사 (엔진 ↔ 드라이버 ↔ 화면 ↔ 캐시)
 *
 * 각각은 "올바르게" 구현돼 있는데 **연결 지점에서 계약이 어긋나는** 결함을 봅니다.
 * 한쪽만 열어 보면 절대 안 보이는 종류예요.
 *
 *   A. sw.js의 ASSETS  ↔  beta/winger2/의 실제 파일 · index.html의 <script src>
 *   B. career.js가 부르는 W2Scene API  ↔  match-scene.js가 내보내는 함수
 *   C. engine.js가 내는 stakeKey 8종  ↔  match-scene.js가 문구를 붙이는 표
 *   D. **게임 입구를 통해** 실제 버튼을 눌러 리그 경기를 완주 —
 *      화면에 결과가 남고 다음으로 갈 수 있는가
 *   E. 카드 빈도가 계단이 아닌가 (설계 §2-10 "계단이 축을 2.8배 튀게 한 주범")
 *
 * ⚠️ 문턱은 이 파일에 직접 적었습니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
const { load, xiOf, play } = require("./_load.js");

const DIR = "/workspace/grow-games/beta/winger2";
const BETA = "/workspace/grow-games/beta";
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════ A. sw.js ASSETS ↔ 디스크 · index.html ══════════
 * 오프라인에서만 깨지는 종류라 빨간불이 안 뜹니다. 그래서 여기서 셉니다. */
{
  const SW = fs.readFileSync(path.join(DIR, "sw.js"), "utf8");
  const HTML = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
  const am = SW.match(/const ASSETS = \[([\s\S]*?)\];/);
  const assets = am ? Array.from(am[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]) : [];
  check(assets.length > 0, `sw.js에서 ASSETS를 읽었다 (${assets.length}개)`);

  // ① addAll은 원자적이에요 — 하나라도 404면 설치가 통째로 실패해서 오프라인이 아예 안 됩니다
  const norm = (p0) => path.resolve(DIR, p0.split("?")[0]);
  const missing = assets.filter((a) => a !== "./" && !fs.existsSync(norm(a)));
  check(missing.length === 0, `ASSETS의 모든 항목이 디스크에 있다${missing.length ? ` — 없는 것: ${missing.join(", ")}` : ""}`);

  /* ══════════════════════════════════════════════════════════════════════
   * ② 🔌 **배선 세 갈래를 서로 다른 자로 잽니다** (2026-08-30 개정)
   *
   * 🔴 **이 절은 검사가 틀려서 빨간불이었습니다** — 배선이 아니라 **검사의 모형**이
   *    문제였어요. 옛 정규식은 `<script src="…"></script>` 하나만 봤는데, 지금
   *    index.html에는 **세 갈래**가 있습니다:
   *
   *      ⓐ 고전 스크립트   <script src="game.js"></script>
   *      ⓑ 모듈 스크립트   <script type="module" src="char3d.js"></script>
   *                        (type="module"이라 **jsdom이 실행을 안 해서** 나머지 12종이 안 죽어요)
   *      ⓒ 동적 import     char3d.js 안의 import("./vendor/three.module.min.js")
   *                        (691KB — 🧬 조립대에 **처음 들어올 때**만 내려옵니다)
   *
   *    셋 다 **브라우저가 실제로 받는 파일**이라 ASSETS에 있어야 하고,
   *    셋 다 **없어지면 오프라인에서만/그 기능만** 조용히 깨집니다.
   *
   * ⚠️ **정규식을 넓히기만 하면 안 됩니다.** "아무 문자열이나 잡아서 통과"시키면
   *    진짜 미등록(예: `focus.js`를 <script>로 실으면서 ASSETS에 안 넣기)을 놓쳐요.
   *    그래서 ⓐⓑⓒ를 **따로 모으고**, 세 방향을 **각각** 봅니다:
   *
   *      A-② 앞으로  페이지가 받는 것 → ASSETS에 다 있나   (오프라인에서만 깨짐)
   *      A-③ 뒤로    ASSETS의 스크립트 → 페이지가 다 받나  (그 기능만 조용히 사라짐)
   *      A-④ 디스크  폴더의 .js → 어느 쪽에도 없는 고아가 있나
   *
   *    ⚠️ **셋을 한 검사로 묶지 않습니다.** 성질이 다르고, 특히 A-④에는
   *       **알려진 고아**(focus.js)가 있어서 묶으면 고친 뒤에도 빨간불이 남아요.
   * ══════════════════════════════════════════════════════════════════════ */
  const note = (msg) => console.log(`🚧 ${msg}`);
  const rel = (fromRel, spec) => {
    const dir = path.posix.dirname(fromRel.replace(/^\.\//, ""));
    return path.posix.normalize(path.posix.join(dir === "." ? "" : dir, spec.split("?")[0]));
  };
  const readIn = (r) => {
    const f = path.resolve(DIR, r);
    return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  };
  /* 🔎 세 갈래를 **따로** 모읍니다. 섞으면 어느 배선이 끊겼는지 못 읽어요. */
  function wireScan(HTML0) {
    const classic = [], modules = [], regs = [];
    for (const m of HTML0.matchAll(/<script\b([^>]*?)>/gi)) {
      const at = m[1];
      const src = (at.match(/\bsrc\s*=\s*"([^"]+)"/) || [])[1];
      if (!src || /^(https?:)?\/\//.test(src)) continue;      // 🌐 바깥 도메인은 캐시 대상이 아니에요
      (/\btype\s*=\s*"module"/i.test(at) ? modules : classic).push(src.split("?")[0]);
    }
    // 🔧 인라인 <script>의 서비스워커 등록 — 스크립트 태그가 아니지만 **실제로 받는 파일**이에요
    for (const m of HTML0.matchAll(/serviceWorker\.register\(\s*["']([^"']+)["']/g)) regs.push(m[1]);
    // ⓒ 모듈이 끌어오는 것 — 동적 import()와 정적 from을 **모듈 파일에서만** 찾습니다
    const imports = [], seen = new Set();
    const queue = modules.slice();
    while (queue.length) {
      const f = queue.shift();
      if (seen.has(f)) continue;
      seen.add(f);
      const code = readIn(f);
      if (code == null) continue;
      for (const re of [/\bimport\(\s*["'](\.[^"']+)["']\s*\)/g, /\bfrom\s+["'](\.[^"']+)["']/g]) {
        for (const m of code.matchAll(re)) {
          const t = rel(f, m[1]);
          if (readIn(t) == null) continue;                    // 없는 파일은 A-①이 따로 봐요
          imports.push(t);
          queue.push(t);
        }
      }
    }
    const css = Array.from(HTML0.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)).map((m) => m[1])
      .filter((x) => !/^(https?:)?\/\//.test(x));
    return { classic, modules, imports, regs, css };
  }
  const WIRE = wireScan(HTML);
  check(WIRE.classic.length > 0 && WIRE.modules.length > 0 && WIRE.imports.length > 0,
    `A-②-0. 🔌 세 갈래를 다 읽었다 — 고전 ${WIRE.classic.length} · 모듈 ${WIRE.modules.length} · 동적 import ${WIRE.imports.length}`
    + `\n     모듈: ${WIRE.modules.join(", ") || "(없음)"} · import: ${WIRE.imports.join(", ") || "(없음)"}`
    + (WIRE.modules.length && WIRE.imports.length ? "" :
      `\n     🔴 셋 중 하나가 0이면 **그 갈래를 아예 안 재고 있는 것**입니다 (정규식이 죽었어요)`));

  /* 🌐 네트워크 의존 모듈은 일부러 안 넣어 왔어요 — 오프라인에서 할 일이 없는 파일이에요.
   * ⚠️ env.js는 **여기 들어가면 안 됩니다.** 베타/상용을 판별해 localStorage를
   *    'beta::'로 감싸는 모듈이라, 오프라인에서 빠지면 세이브 접두사가 통째로 틀어져요.
   *    🦄 unicorn/sw.js는 이미 ../env.js를 캐시합니다 — 그게 맞는 상태예요. */
  const NET_ONLY = ["../cloud.js", "../stats.js", "../ads.js"].map(norm);
  const cached = new Set(assets.map(norm));

  /* 🔎 A-②(앞으로) · A-③(뒤로) · A-④(디스크)를 **한 함수로** 재서, 아래 변이 검증이
   *    똑같은 자를 다시 쓸 수 있게 합니다 — 기준선과 변이가 다른 문장을 지키면
   *    둘 다 초록불인 상태가 생겨요. */
  function wireGaps(HTML0, assets0) {
    const w = wireScan(HTML0);
    const cache = new Set(assets0.map(norm));
    const fetched = w.classic.concat(w.modules).concat(w.imports).concat(w.css);
    const fwd = fetched.map(norm)
      .filter((f) => !cache.has(f) && NET_ONLY.indexOf(f) < 0)
      .map((f) => path.relative(DIR, f));
    const got = new Set(fetched.map(norm));
    const back = assets0.map(norm)
      .filter((a) => /\.js$/.test(a) && !got.has(a))
      .map((a) => path.relative(DIR, a));
    return { w, fwd: Array.from(new Set(fwd)), back: Array.from(new Set(back)) };
  }
  const GAP = wireGaps(HTML, assets);

  check(GAP.fwd.length === 0,
    `A-②. 🔌 **페이지가 받는 것이 ASSETS에 다 있다** (고전 + 모듈 + 동적 import + CSS)`
    + (GAP.fwd.length
      ? `\n     🔴 빠진 것: ${GAP.fwd.join(", ")} — **온라인에선 멀쩡하고 오프라인에서만** 깨져요`
        + `\n     addAll은 원자적이 아니라 그냥 안 담깁니다 — 아무도 눈치를 못 채요`
      : ` (${WIRE.classic.length + WIRE.modules.length + WIRE.imports.length + WIRE.css.length}개)`));

  /* 🔴 **반대 방향** — ASSETS에는 있는데 페이지가 안 받는 파일 (2026-08-29 신설)
   *
   * 여태 한 방향(index.html → ASSETS)만 봤습니다. 그래서
   * **`<script src="../winger-moment.js">`를 지워도 전 검사가 초록불**이었어요 —
   * 캐시에는 남아 있고, 온라인·오프라인 다 멀쩡하고, **미니게임만 조용히 사라집니다**
   * (`getMini()`가 null → `career.js`가 자동 판정으로 떨어져요).
   * 플레이어는 오류를 하나도 못 보고 *"왜 안 뜨지?"*만 겪습니다. */
  check(GAP.back.length === 0,
    `A-③. 🔌 **ASSETS의 스크립트를 페이지가 다 받는다**`
    + (GAP.back.length
      ? `\n     🔴 캐시에는 있는데 **페이지가 안 받는 것**: ${GAP.back.join(", ")}`
        + `\n     오류 없이 그 기능만 조용히 사라집니다 — 미니게임이면 자동 판정으로 떨어져요`
      : ` (${assets.filter((a) => /\.js$/.test(a)).length}개)`));

  /* ══════════════════════════════════════════════════════════════════════
   * A-④ 📁 **디스크에 있는데 어디에도 등록 안 된 .js**
   *
   * 🚧 **알려진 미달을 여기 적어 둡니다.** 지금 크기를 상한으로 박고, **더 나빠지면
   *    빨간불**이에요 — 회귀는 잡히고 현상은 기록됩니다.
   * ⚠️ 이걸 위의 A-②/A-③에 묶으면 **고친 뒤에도 빨간불**이라 사람이
   *    "저건 원래 빨간불이야"로 배웁니다. 그래서 따로 세웠어요.
   * ✅ **해소되면 이 검사가 승격을 요구합니다** — 등록되는 순간 ❌로 바뀌어
   *    KNOWN_ORPHANS에서 빼라고 말해요. 양방향이라 고치는 사람이 반드시 이 줄을 봅니다.
   * ══════════════════════════════════════════════════════════════════════ */
  const KNOWN_ORPHANS = ["focus.js"];   // 🚧 아직 어디에도 안 실린 파일 (다른 세션 작업 중)
  {
    const walk = (d, pre) => fs.readdirSync(path.join(DIR, d), { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), pre)
        : (/\.js$/.test(e.name) ? [path.posix.join(d === "." ? "" : d, e.name)] : [])));
    const onDisk = walk(".", "");
    const wired = new Set(WIRE.classic.concat(WIRE.modules).concat(WIRE.imports).concat(WIRE.regs)
      .map(norm).concat(assets.map(norm)));
    const orphans = onDisk.filter((f) => !wired.has(norm("./" + f)));
    const unexpected = orphans.filter((f) => KNOWN_ORPHANS.indexOf(f) < 0);
    const promoted = KNOWN_ORPHANS.filter((f) => fs.existsSync(path.join(DIR, f)) && orphans.indexOf(f) < 0);
    check(unexpected.length === 0,
      `A-④. 📁 폴더의 .js ${onDisk.length}개 중 **새 고아가 없다** (알려진 것: ${KNOWN_ORPHANS.join(", ") || "없음"})`
      + (unexpected.length
        ? `\n     🔴 등록 안 된 파일: ${unexpected.join(", ")}`
          + `\n     index.html에도 sw.js ASSETS에도 없으면 **아무 데서도 안 실립니다** — 오류도 안 나요`
        : ""));
    const stillOrphan = orphans.filter((f) => KNOWN_ORPHANS.indexOf(f) >= 0);
    if (stillOrphan.length) {
      note(`A-④. ${stillOrphan.join(", ")} 는 아직 index.html·sw.js 어디에도 없습니다 — **알려진 미달**이에요`);
      note(`      등록하면 이 줄이 ❌로 바뀌어 "KNOWN_ORPHANS에서 빼세요"라고 말합니다 (승격 알림)`);
    }
    check(promoted.length === 0,
      `A-④b. 📁 KNOWN_ORPHANS가 현실과 맞는다`
      + (promoted.length
        ? `\n     ✅ **${promoted.join(", ")} 가 이제 등록됐어요 — wiring-test.js의 KNOWN_ORPHANS에서 빼세요.**`
          + `\n     (알려진 미달이 해소되면 검사를 합칩니다 — 그러라고 이 줄이 빨간불이에요)`
        : ` (${KNOWN_ORPHANS.length}개)`));
  }

  /* ══════════════════════════════════════════════════════════════════════
   * 🧪 **A-② ③ ④가 진짜로 무언가를 지키는지** — 여기서 바로 되돌려 봅니다.
   *    (소스 파일은 안 건드려요. **읽어 온 문자열**만 바꿔서 같은 함수에 다시 넣습니다)
   * ══════════════════════════════════════════════════════════════════════ */
  {
    const muts = [
      ["M4", "index.html에서 <script type=\"module\" src=\"char3d.js\"> 제거 (3D 배선이 진짜 끊김)",
        () => wireGaps(HTML.replace(/<script type="module" src="char3d\.js"><\/script>/, ""), assets),
        (g) => g.back.indexOf("char3d.js") >= 0 && g.back.some((x) => /three\.module\.min\.js$/.test(x)),
        (g) => `A-③ 빠진 것: ${g.back.join(", ") || "(없음)"}`],
      ["M5", "index.html에 focus.js를 <script>로 싣고 ASSETS에는 안 넣기 (진짜 미등록)",
        () => wireGaps(HTML.replace("<script src=\"game.js\"></script>",
          "<script src=\"focus.js\"></script>\n  <script src=\"game.js\"></script>"), assets),
        (g) => g.fwd.indexOf("focus.js") >= 0,
        (g) => `A-② 빠진 것: ${g.fwd.join(", ") || "(없음)"}`],
      ["M6", "sw.js ASSETS에서 ./vendor/three.module.min.js 빼기 (오프라인에서만 3D가 죽음)",
        () => wireGaps(HTML, assets.filter((a) => !/three\.module\.min\.js$/.test(a))),
        (g) => g.fwd.some((x) => /three\.module\.min\.js$/.test(x)),
        (g) => `A-② 빠진 것: ${g.fwd.join(", ") || "(없음)"}`],
    ];
    for (const [tag, why, run, want, show] of muts) {
      let g = null, err = null;
      try { g = run(); } catch (e) { err = e; }
      check(!!g && want(g),
        `🧪 ${tag}. 변이 — ${why} → 빨간불이 뜬다`
        + (g ? `\n     ${show(g)}` : `\n     💥 변이가 안 걸렸어요: ${err && err.message}`)
        + (g && want(g) ? "" : `\n     🔴 되돌렸는데 안 갈립니다 — **이 검사는 아무것도 안 지키고 있어요**`));
    }
  }

  /* 🔥 미니게임은 **엔진 뒤**에 실려야 합니다 — `setMini`를 스스로 부르거든요 */
  const iEngine = HTML.indexOf('src="engine.js"');
  const iMoment = HTML.indexOf('src="../winger-moment.js"');
  check(iMoment > 0 && iEngine > 0 && iMoment > iEngine,
    `🔥 winger-moment.js가 engine.js **뒤**에 실린다 (스스로 setMini를 불러요)`
    + `${iMoment < 0 ? " — 태그가 아예 없어요" : ""}`);

  // ③ 캐시 이름 — 접두사가 겹치면 activate가 **다른 게임 캐시를 지웁니다**
  const cm = SW.match(/const CACHE = "([^"]+)"/);
  check(!!cm && /^winger2-/.test(cm[1]), `CACHE 이름이 winger2- 접두사다 (${cm ? cm[1] : "못 찾음"})`);
  const other = fs.readFileSync(path.join(BETA, "soccer/sw.js"), "utf8").match(/const CACHE = "([^"]+)"/);
  check(!!cm && !!other && !cm[1].startsWith(other[1].replace(/-v\d+$/, "")) && !other[1].startsWith("winger2-"),
    `현행 ⚽ 더 윙어(${other ? other[1] : "?"})와 캐시 접두사가 안 겹친다`);

  // ④ SAVE_KEY — 기존 winger-save-v1을 재사용하면 옛 세이브를 덮어씁니다
  const G = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
  const sk = G.match(/const SAVE_KEY = "([^"]+)"/);
  check(!!sk && sk[1] === "winger2-save-v1", `SAVE_KEY = winger2-save-v1 (${sk ? sk[1] : "못 찾음"})`);

  /* ⑤ 확인 페이지 — `_check.html`의 GAME_ORDER ↔ `_fixtures.js`의 시나리오
   *
   * 🔇 **조용히 실패하는 자리입니다.** _check.html은
   *      const present = GAME_ORDER.filter((g) => F.items.some((x) => x.game === g));
   *    로 탭을 만들어요. GAME_ORDER에 winger2가 있어도 시나리오가 한 건도 없으면
   *    **탭이 아예 안 그려집니다** — 오류도, 빈 탭도 없이 그냥 없는 것처럼 굴어요.
   *    (반대 방향 — 시나리오는 있는데 GAME_ORDER에 없는 경우 — 도 같은 증상입니다.)
   *
   * 시나리오를 만드는 건 `scripts/make-fixtures.js`이고, 거기에 winger2 생산자가 있어야 해요.
   * 없으면 범민 님의 **실기기 확인 목록에서 ⚽ 더 윙어 II가 통째로 빠집니다.** */
  const CK = fs.readFileSync(path.join(BETA, "_check.html"), "utf8");
  const gm = CK.match(/const GAME_ORDER = \[([^\]]*)\]/);
  const order = gm ? Array.from(gm[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]) : [];
  check(order.indexOf("winger2") >= 0, `_check.html GAME_ORDER에 winger2가 있다 (${order.join(", ")})`);
  const FXS = fs.readFileSync(path.join(BETA, "_fixtures.js"), "utf8");
  const games = new Set(Array.from(FXS.matchAll(/"game":\s*"([a-z0-9]+)"/g)).map((m) => m[1]));
  const MKF = fs.readFileSync("/workspace/grow-games/scripts/make-fixtures.js", "utf8");
  check(games.has("winger2"),
    `_fixtures.js에 winger2 시나리오가 있다 (지금 있는 게임: ${Array.from(games).join(", ") || "없음"})`
    + (games.has("winger2") ? "" :
      `\n     GAME_ORDER에는 winger2가 있는데 시나리오가 0건이면 **탭이 한 장도 안 그려집니다** (오류 없이 조용히요).`
      + `\n     scripts/make-fixtures.js에 winger2 생산자 ${/game:\s*"winger2"/.test(MKF) ? "있음" : "**없음**"} — 거기부터 채워야 해요.`));
}

/* ══════════ B·C·D — 페이지를 실제로 띄웁니다 ══════════ */
const FX = (() => {
  const s = fs.readFileSync(path.join(BETA, "_fixtures.js"), "utf8");
  const m = s.match(/window\.CHECK_FIXTURES\s*=\s*(\{[\s\S]*\});\s*$/);
  return m ? new Function(`return ${m[1]};`)() : null;
})();
const item = FX && FX.items.find((x) => x.id === "winger2-match");
if (!item) { console.log("❌ winger2 확인용 세이브를 못 찾았어요 (beta/_fixtures.js)"); process.exit(1); }
/* 🔑 **디스크에 있는 그대로 씁니다.** 예전에는 winger2 픽스처가 없어서 soccer 세이브를
 *    키·phase만 바꿔 빌려 썼는데, 그건 "픽스처가 실제와 다른 모양"이라는 이 저장소의
 *    단골 함정 바로 옆자리예요. 지금은 진짜 winger2 시나리오가 있습니다.
 *    ⚠️ 모양이 맞는지 여기서 한 번 확인하고 넘어갑니다 — 안 맞으면 손으로 고치지 말고
 *       `node scripts/make-fixtures.js`를 다시 돌리세요. */
const keys = item.keys;
const shapeBad = Object.entries(keys)
  .filter(([k, v]) => !/^winger2-save-v1/.test(k) || /"phase":"(?!winger2-)/.test(v))
  .map(([k]) => k);
check(shapeBad.length === 0,
  `winger2 픽스처가 디스크 모양 그대로다 — 키가 winger2-save-v1로 시작하고 phase가 winger2-*`
  + (shapeBad.length ? ` — 어긋난 키: ${shapeBad.join(", ")}` : ` (${Object.keys(keys).join(", ")})`));

const PRE = `window.fetch=()=>Promise.reject(new Error("off"));
/* 🔴 **rAF에 「0」을 넘기면 안 됩니다.** winger-moment.js의 미니게임들은
   dt = (t - last)/1000 으로 움직여요. t가 늘 0이면 dt가 음수 한 번 → 그 뒤로 0이라
   **상대가 제자리에 얼어붙습니다.** 🧱 2단계가 스스로 안 끝나서 pump가 12초를 헛돌고,
   판정도 늘 s = 0이 됐어요. 진짜 시계를 넘깁니다. */
window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(typeof performance!=="undefined"&&performance.now?performance.now():Date.now()),0);window.scrollTo=()=>{};
window.alert=()=>{};window.confirm=()=>false;
(function(){var st=window.setTimeout;window.setTimeout=function(fn,ms){return st(fn,0);};})();
window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message||e.error));});
` + Object.entries(keys).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join("");

let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src.split("?")[0]);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  })
  .replace("</head>", `<script>${PRE}</script></head>`)
  .replace("</body>", `<script>window.__get=(n)=>eval(n);</script></body>`);
/* 🖥️ 상용 경로로 띄웁니다 — /beta/ 경로면 env.js가 localStorage를 beta::로 감싸서
 *    위에서 심은 키를 못 읽어요 (그 자체가 env.js가 하는 일이에요). */
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/winger2/" });
const w = dom.window;
w.Ads = { display() {}, init() {} };
w.Stats = { log() {} };
const $ = (id) => w.document.getElementById(id);
const active = () => (w.document.querySelector(".screen.active") || {}).id;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  /* ── B. 드라이버가 부르는 이름 ↔ 화면이 내보내는 함수 ── */
  {
    const CAREER = fs.readFileSync(path.join(DIR, "career.js"), "utf8");
    const body = (CAREER.match(/function runV2Match\([\s\S]*?\n {2}\}/) || [""])[0];
    const called = Array.from(new Set(Array.from(body.matchAll(/scene\.(\w+)/g)).map((m) => m[1])));
    const api = Object.keys(w.W2Scene || {});
    const gone = called.filter((n) => api.indexOf(n) < 0);
    check(called.length >= 3, `runV2Match가 부르는 화면 API를 읽었다 — ${called.join(", ")}`);
    check(gone.length === 0, `그 이름이 match-scene.js에 다 있다${gone.length ? ` — 없는 것: ${gone.join(", ")}` : ""}`);
    /* ⏩ 빨리감기는 설계 §5-5 항목이에요. 화면은 fast()를 내보내는데 부르는 쪽이 있나요 */
    check(/\bfast\s*\(/.test(CAREER) || /W2Scene\.fast/.test(CAREER),
      "⏩ 빨리감기 — 화면의 fast()를 부르는 곳이 있다 (설계 §5-5)");

    /* ══════════ F. 🔒 미니게임 ↔ 엔진 배선 (2026-08-29 신설) ══════════
     *
     * 🔴 **`judge`를 안 넘겨도 전 검사가 초록불이었습니다.**
     *    안 넘기면 `winger-moment.js`의 폴백(`loneJudge`)으로 떨어지고,
     *    그 폴백은 `s`만 봐요 — `autoP`(그 경기의 전력 + 내 능력치)를 모릅니다.
     *    그러면 **카드 갈래가 자동 갈래와 어긋납니다** — §2-6 개정이 고친 바로 그 자리예요
     *    (🅰️ 전개 도움 4~6배 · 🧱 수비 실점 능력치 150에서 −9.8%).
     *    화면은 멀쩡히 돌고 숫자만 조용히 틀어집니다.
     *
     * 값이 아니라 **배선**을 봅니다 — 다섯 칸이 다 실려 나가는가. */
    const call = CAREER.match(/mini\(slot, \{[\s\S]*?\}, \([^)]*\) => \{[^}]*\}\);/);
    check(!!call, `🔥 career.js가 미니게임을 부르는 자리를 찾았다${call ? "" : " — 정규식을 고치세요"}`);
    if (call) {
      const need = [
        ["judge", /judge:\s*\(s\)\s*=>\s*m\.judgeFor\(s\)/, "🔒 s를 **엔진에** 되돌려 물어요 (§2-6). 없으면 폴백으로 떨어집니다"],
        ["kind", /kind:\s*m\.pendingKind/, "그 카드가 ⚽ 결정인지 🅰️ 전개인지 🧱 수비인지"],
        ["moment", /moment:\s*card\.moment/, "네 판 중 어느 판인지"],
        ["condition", /condition:\s*S\.condition/, "🫀 판정 창에 걸려요"],
        ["foot", /foot:\s*mainFoot\(\)/, "🦶 주발 쪽 코스가 +25%"],
      ];
      const gone = need.filter(([, re]) => !re.test(call[0]));
      check(gone.length === 0,
        `F-1. 🔒 미니게임에 다섯 칸을 다 넘긴다 — ${need.map(([k]) => k).join(" · ")}`
        + (gone.length ? `\n     🔴 빠진 것: ${gone.map(([k, , why]) => `${k} (${why})`).join(" · ")}` : ""));
      check(/\(judge\)\s*=>\s*\{\s*m\.resolve\(judge\)/.test(call[0]),
        `F-2. 🔒 미니게임이 낸 판정을 **엔진에 되돌려** 준다 (m.resolve)`);
    }
    /* 엔진 쪽에 그 창구가 실제로 있나 — 한쪽만 있으면 배선이 끊긴 거예요 */
    const E0 = load();
    const mm = E0.createMatch({ xi: xiOf("fw", 110, 70), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
    check(typeof mm.judgeFor === "function",
      `F-3. 엔진이 judgeFor(s)를 내보낸다 — career.js가 부르는 그 이름`);
    /* s = 0.5가 중립이라는 §2-6의 약속이 이 창구에서도 성립하는가 */
    /* ⚠️ 한 경기에 **내 카드가 하나도 없을 수 있어요** — 장면이 전부 중립이거나
     *    동료가 다 가져가면요. 한 판만 보고 판정하면 열 번에 두어 번 헛빨간불이 뜹니다
     *    (실제로 그랬어요). 나올 때까지 굴립니다. */
    let pend = null, tries = 0;
    for (; tries < 40 && !pend; tries++) {
      const m2 = E0.createMatch({ xi: xiOf("fw", 110, 70), oppName: "상대",
        teamStr: 70, oppStr: 70, condition: 80 });
      while (m2.next()) if (m2.pending) { pend = m2; break; }
    }
    check(!!pend, `F-4. 내 카드를 열었다 (${tries}경기째)`);
    if (pend) {
      const js = [0, 0.25, 0.5, 0.75, 1].map((v) => pend.judgeFor(v));
      check(js.every((j) => ["perfect", "ok", "miss"].indexOf(j) >= 0),
        `F-5. judgeFor(s)가 perfect/ok/miss만 낸다 — s 0→1에서 [${js.join(", ")}]`);
    }
  }

  /* ── C. stakeKey 8종이 화면에서 서로 다른 문구가 된다 ──
   *  엔진이 실제로 내는 키를 모아서, 진짜 화면에 밀어 넣어 봅니다.
   *  표에 없는 키는 조용히 fallback으로 떨어져서 문구가 겹쳐요. */
  {
    const E = load();
    E._t.seed(4321); E._t.skill = 0.5;
    const keysSeen = new Set();
    for (let i = 0; i < 600; i++) {
      const r = E._t.playMatch({ xi: xiOf("mf", 110, 70), oppName: "상대", teamStr: 70, oppStr: 70, condition: 80 });
      for (const c of r.cards) if (c.mine && c.stakeKey) keysSeen.add(`${c.kind}|${c.stakeKey}`);
    }
    check(keysSeen.size >= 8, `엔진이 내는 (카드종류 × stakeKey) 조합 ${keysSeen.size}종을 모았다`);
    const host = w.document.createElement("div");
    w.document.body.appendChild(host);
    const lines = new Map();
    for (const combo of keysSeen) {
      const [kind, key] = combo.split("|");
      w.W2Scene.mount(host, { home: "우리", away: "상대", myName: "나" });
      w.W2Scene.fast();                      // 타이핑을 즉시 표시로 — 글자가 잘려 세면 안 돼요
      w.W2Scene.openMoment({ min: 50, kind, stakeKey: key, score: [1, 1], mine: true });
      await wait(60);
      const el = host.querySelector(".w2-card.mine .w2-body");
      lines.set(combo, el ? el.textContent : "");
      w.W2Scene.destroy();
      host.innerHTML = "";
    }
    const vals = Array.from(lines.values());
    const bad = vals.filter((t) => !t || /undefined|NaN/.test(t));
    check(bad.length === 0, `stakeKey마다 문구가 나온다 (undefined/NaN ${bad.length}건)`);
    // 카드 종류가 같은데 문구가 겹치면 그 키가 표에 없다는 뜻이에요
    let dup = 0;
    for (const kind of ["goal", "assist", "defend"]) {
      const t = Array.from(lines.entries()).filter(([k]) => k.startsWith(kind + "|")).map(([, v]) => v);
      dup += t.length - new Set(t).size;
    }
    check(dup === 0, `같은 카드 종류 안에서 stakeKey마다 문구가 다르다 (겹친 것 ${dup}건 — 표에 없는 키는 조용히 fallback으로 떨어져요)`);
  }

  /* ── D. 게임 입구를 통해 리그 경기를 완주 ── */
  $("btn-continue").click();
  const go0 = w.document.querySelector(".slot-modal .slot-go");
  if (go0) go0.click();
  const S = () => w.__get("S");
  check(!!S(), "확인용 세이브를 열었다");
  check(active() === "screen-pro", `프로 준비 화면에 도달했다 (${active()})`);
  const goBtn = () => w.document.querySelector("#pro-actions .go-game");
  check(!!goBtn(), "⚽ 경기하러 가기 버튼이 있다");

  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click.
   *    pointerdown 하나만 보내던 검사가 24개 케이스를 전부 놓친 전례가 있어요. */
  const press = (el) => {
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = w.PointerEvent || w.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };

  /* 🪑 **선발은 라운드마다 다시 뽑혀요** (`WingerSquad.isStarter()`).
   *    벤치인 주는 `benchShow` 갈래로 빠져서 순간 카드가 **한 장도 안 그려집니다** —
   *    그건 결함이 아니라 설계예요. 그 주는 넘기고 다음 라운드에 다시 눌러요.
   *
   * 🔴 이 되풀이가 **없으면 검사가 뒤집힙니다.** 픽스처를 winger2로 바꾸고 나서
   *    세 번에 한 번씩 빨간불이 떴어요 — 벤치인 주에 걸린 거였습니다.
   *    **그때그때 갈리는 검사는 아무도 안 믿게 됩니다.**
   *    여덟 라운드를 다 벤치로 보내면 그건 그것대로 빨간불이에요(조용히 건너뛰지 않습니다). */
  /* 🔥 **미니게임이 붙은 뒤로는 경기가 손을 기다립니다** (2026-08-29).
   *   예전에는 `getMini()`가 null이라 자동 판정으로 흘렀는데, 이제 내 카드마다
   *   ▶️ 시작 → 판을 누르기까지 화면이 멈춰요. 검사가 그 손 노릇을 합니다.
   *   **자동 진행 토글로 우회하지 않습니다** — 그러면 미니게임이 아예 안 열려도
   *   초록불이라, 지금 메우려는 구멍(①)을 그대로 남겨 두게 돼요.
   *   네 판의 누르는 자리: `.w2m-side`(🏃) · `.w2m-goal`(🥅) · `.w2m-run-btn`(🎯) · `.w2m-dir`(🧱) */
  /* ─────────────────────────────────────────────────────────────────────
   * 🚨 **「자가 복구가 실패를 삼키는」 자리** (2026-09-01 · engineer 106번 §6)
   * ─────────────────────────────────────────────────────────────────────
   * 🧱 차단이 2단 국면이 되면서 `.w2m-blk-go`(2단계 🛡️ 막기)가 생겼는데,
   * 이 목록에 **없었습니다.** 그런데도 검사는 **초록불이었어요** —
   * 2단계는 안 누르면 **~1.7초 뒤 상대가 지나가며 스스로 끝나고**(s = 0),
   * 경기는 그대로 흘러갑니다. 🔴 **2단계를 한 번도 안 누르면서 통과**한 거예요.
   *
   * 🔴 **셀렉터에 더하기만 하면 또 타임아웃이 삼킵니다.** 그래서 두 가지를 같이 합니다:
   *   ① 화면에 **떴는지**(`seen`)와 **눌렀는지**(`tapped`)를 **따로** 셉니다
   *   ② 🔒 **떴는데 한 번도 안 눌린 셀렉터가 있으면 빨간불** — 아래 `SEL_COVER`
   * `seen`은 pump가 아니라 **독립된 훑기**가 셉니다. 그래야 목록에서 빠진 셀렉터가
   * "안 뜬 것"으로 둔갑하지 않아요 — 그게 정확히 이번에 놓쳤던 경로입니다.
   * ───────────────────────────────────────────────────────────────────── */
  const SELS = [".w2m-go", ".w2m-side", ".w2m-run-btn", ".w2m-dir", ".w2m-goal", ".w2m-blk-go"];
  const MOMENT_SEL = SELS.join(", ");

  /* 🔒 **이 목록이 소스와 안 맞으면 검사가 통째로 눈이 멉니다.**
   *    `.w2m-blk-go`가 빠져 있던 게 정확히 그 상태였어요 — 안 눌러도 타임아웃이 끝내 주니까요.
   *    그래서 목록을 소스와 **두 갈래로** 맞춰 봅니다:
   *      ① `onTap(...querySelector("<선택자>"))`로 **직접 적힌** 자리는 전부 SELS에 있어야 한다
   *      ② 🔑 `onTap(` **호출 자리의 개수**가 그대로여야 한다 — 변수로 넘기는 두 자리
   *         (`.w2m-goal` · `.w2m-run-btn`)는 ①로 못 뜯으니, **새 탭 자리가 생기면 여기서 걸립니다**
   *    🚨 개수는 **검사에 박습니다**(소스에서 세어 오면 늘어나도 따라가서 안 잡혀요). */
  const MOM_SRC = fs.readFileSync(path.join(BETA, "winger-moment.js"), "utf8");
  const litSels = Array.from(new Set(
    Array.from(MOM_SRC.matchAll(/onTap\(\s*(?:\w+\.)?querySelector\(\s*[`"'](\.[\w-]+)/g)).map((m) => m[1])));
  const notReg = litSels.filter((x) => SELS.indexOf(x) < 0);
  check(litSels.length > 0 && notReg.length === 0,
    `🔒 소스에 직접 적힌 탭 자리가 전부 SELS에 등록돼 있다 (${litSels.join(" · ") || "**한 개도 못 뜯었어요**"})`
    + (notReg.length ? `\n     🔴 **SELS에 없는 것: ${notReg.join(" · ")}** — 그 자리는 안 눌려도 검사가 통과합니다` : ""));
  const TAP_SITES = 6;                     // 🚨 문턱은 박습니다 (정의 줄 제외한 onTap 호출 자리)
  const nSites = (MOM_SRC.match(/\bonTap\(\s*(?!el, fn, gate)/g) || []).length;
  check(nSites === TAP_SITES,
    `🔒 winger-moment.js의 탭 자리가 ${TAP_SITES}군데 그대로다 (지금 ${nSites}군데)`
    + (nSites === TAP_SITES ? ""
      : `\n     🔴 **탭 자리가 늘거나 줄었어요.** 새 자리가 생겼다면 SELS에 등록하고 이 숫자를 고치세요 —`
        + `\n        등록 안 하면 그 자리는 **안 눌러도 타임아웃·폴백이 흐름을 밀어서 초록불**이 됩니다`));
  const seen = {}, tapped = {};
  for (const s of SELS) { seen[s] = 0; tapped[s] = 0; }
  let momentSeen = 0;
  /* 👁️ 독립 훑기 — pump가 무엇을 누르든 상관없이 "화면에 떴다"만 셉니다 */
  const scanMoment = () => {
    for (const s of SELS) if (w.document.querySelector(s)) seen[s] += 1;
  };
  const pumpMoment = () => {
    const el = w.document.querySelector(MOMENT_SEL);
    if (!el || el.disabled) return false;
    if (el.classList.contains("w2m-go")) momentSeen += 1;
    for (const s of SELS) if (el.matches(s)) { tapped[s] += 1; break; }
    press(el);
    return true;
  };

  /* 🔴 **라운드를 몇 번 굴리나** — 예전에는 *"카드도 그려졌고 미니게임도 한 번 봤으면 끝"*
   *    이었어요. 그런데 🧱 차단(=`defend` 카드)은 **여섯 판에 한 번쯤** 나옵니다 —
   *    실측했더니 한 라운드로 끊으면 `.w2m-blk-go`에 **6번 중 1번**만 닿았어요.
   *    그 상태로 커버리지를 단언하면 **6번 중 5번은 아무것도 안 지키는 초록불**입니다.
   * 🔑 그래서 **2단계 버튼에 닿을 때까지** 더 굴립니다. 못 닿으면 빨간불이 아니라
   *    🚧로 적어요 — 난수 탓에 빨간불이 뜨는 검사는 아무도 안 보게 됩니다. */
  const MAX_ROUNDS = 10;
  const covered = () => momentSeen > 0 && seen[".w2m-blk-go"] > 0;
  let week0 = 0, benched = 0, opened = false, rounds = 0;
  /* 🔥 **미니게임을 한 번도 못 봤으면 라운드를 더 굴립니다.**
   *   한 경기에 내 카드가 하나도 없을 수 있어요(장면이 전부 중립이거나 동료가 다 가져감).
   *   그걸 "미니게임이 안 열렸다"로 읽으면 열 번에 서너 번 헛빨간불이 뜹니다 — 실제로 그랬어요. */
  for (; rounds < MAX_ROUNDS && !(opened && covered()); rounds++) {
    if (!goBtn()) break;
    week0 = S().activity.week;
    press(goBtn());
    for (let i = 0; i < 200 && active() !== "screen-stage"; i++) await wait(10);
    for (let i = 0; i < 1200 && S().activity.week === week0; i++) { scanMoment(); pumpMoment(); await wait(10); }
    if (w.document.querySelectorAll(".w2-card").length >= 6) {
      opened = true;
      if (covered()) break;                   // 카드도 그려졌고 🧱 2단계까지 닿았어요
    } else { benched += 1; }
    /* 🔒 **마지막 라운드에서는 뒷정리를 하지 않습니다.** 여기서 다음 주로 넘겨 버리면
     *    아래의 경기 화면 검사들이 **줄줄이 빨간불**이 돼요 — 원인은 하나인데 신호가 일곱 개면
     *    사람이 "저건 원래 빨간불"로 배웁니다. 커버리지를 못 채워도 **경기 화면은 남겨 둡니다.** */
    if (rounds + 1 >= MAX_ROUNDS) break;
    const nx = $("btn-stage-next");
    if (nx) press(nx);
    for (let i = 0; i < 300 && active() !== "screen-pro"; i++) await wait(10);
    /* 🏋️ **한 주는 훈련 턴을 다 써야 ⚽ 경기 버튼이 열려요.**
     *    `career.js:1564`의 `if (S.pendingShow)`가 그 버튼을 그립니다 —
     *    준비 턴이 남아 있으면 화면에 훈련 버튼만 있어요.
     *    🛌 휴식을 씁니다: 훈련 버튼은 상한에 닿으면 「재능 각성」으로 바뀌어 턴을
     *    다르게 쓰는데, 휴식은 언제나 턴 하나를 그대로 소모해요.
     *    (실측: 두 번 누르면 열립니다. 넉넉히 12번까지 봐요.) */
    for (let t = 0; t < 12 && !goBtn(); t++) {
      const rest = w.document.querySelector('#pro-actions .action-btn[data-key="__rest"]');
      if (!rest) break;
      press(rest);
      for (let i = 0; i < 100 && !goBtn(); i++) await wait(10);
    }
  }
  /* 🔥 미니게임이 **실제로 열렸는가** — 이게 구멍 ①의 증상이 드러나는 자리예요.
   *   스크립트 태그가 빠지면 `getMini()`가 null이라 자동 판정으로 흐르고,
   *   경기는 멀쩡히 끝나면서 **미니게임만 조용히 사라집니다.** */
  check(momentSeen > 0,
    `🔥 순간 카드에서 미니게임이 실제로 열렸다 (▶️ 시작 화면 ${momentSeen}번)`
    + `${momentSeen ? "" : " — getMini()가 null이면 오류 없이 자동 판정으로 흘러요 (index.html의 script 태그를 보세요)"}`);
  /* 🔒 **떴는데 한 번도 안 눌린 셀렉터가 있으면 빨간불.**
   *    타임아웃·기본값·폴백이 흐름을 끝까지 미는 자리라, **도달만 재면 아무것도 안 눌러도 통과**해요. */
  const SEL_COVER = SELS.filter((s) => seen[s] > 0 && tapped[s] === 0);
  check(SEL_COVER.length === 0,
    `🖱️ **화면에 뜬 셀렉터를 전부 눌렀다** — `
    + SELS.map((s) => `${s} ${seen[s] ? `뜸/눌림 ${seen[s]}/${tapped[s]}` : "안 뜸"}`).join(" · ")
    + (SEL_COVER.length
      ? `\n     🔴 **떴는데 한 번도 안 눌린 것: ${SEL_COVER.join(" · ")}**`
        + `\n        이 자리는 안 눌러도 타임아웃·폴백이 흐름을 끝까지 밀어서 **초록불이 됩니다.**`
        + `\n        MOMENT_SEL에 빠졌거나, 눌렀는데 disabled였어요`
      : ""));
  /* 🚧 **안 뜬 종은 「통과」가 아니라 「이번 판에 안 나왔다」입니다.** 조용히 넘기지 않아요 —
   *    포지션·난수에 따라 네 종이 다 나오지는 않습니다. 🧱은 defend 카드에만 붙어요. */
  const NEVER = SELS.filter((s) => seen[s] === 0);
  if (NEVER.length) {
    console.log(`🚧 이번 판에 안 나온 미니게임 자리: ${NEVER.join(" · ")}`
      + ` — **검증됨이 아니라 미도달**입니다 (포지션·난수 탓이에요).`
      + ` 그 자리는 \`minigame-tap-test.js\`·\`block-test.js\`가 따로 지킵니다`);
  }
  check(opened,
    `⚽ 경기하러 가기 → 순간 카드 경기에 도달했다 (🪑 벤치인 주 ${benched}회 건너뜀 · ${rounds + 1}라운드째`
    + `${opened ? "" : ` · 마지막 화면 ${active()} · 버튼 ${goBtn() ? "있음" : "없음"}`})`);
  check(active() === "screen-stage", `경기 화면이 열렸다 (${active()})`);
  check(S().activity.week === week0 + 1, "경기가 끝까지 돌고 라운드가 넘어갔다");

  const feed = w.document.querySelectorAll(".w2-card");
  check(feed.length >= 6, `순간 카드 화면에 카드가 그려졌다 (${feed.length}장)`);
  check(!!w.document.querySelector(".w2-tally"), "🔥 사후 집계 줄이 남았다 (설계 §5-2 — 사전에 약속하지 않고 사후에 셉니다)");
  const stageText = ($("stage-card") || {}).textContent || "";
  check(!/undefined|NaN/.test(stageText), "경기 화면에 undefined/NaN이 없다");

  // 스코어보드가 엔진 결과와 같은가 — 화면이 자체로 세면 여기서 갈립니다
  const board = w.document.querySelector(".w2-score");
  const nums = board ? Array.from(board.querySelectorAll("b")).map((b) => Number(b.textContent)) : [];
  check(nums.length === 2 && nums.every(Number.isFinite), `스코어보드가 숫자 두 개다 (${nums.join(":")})`);

  /* 🔴 경기가 끝난 뒤 — 결과가 남고 **다음으로 갈 수 있어야** 합니다.
   *    proMatchFinalize는 {resultHTML, nextLabel, nextFn}을 **돌려주는** 함수예요
   *    (soccer에서는 MatchSim.run이 그 반환값을 그려 주고 버튼에 물렸습니다). */
  const next = $("btn-stage-next");
  check(!!next && !next.hidden && !next.disabled, "다음 버튼이 보이고 눌린다");
  check(!!(next && (next.onclick || next.__handler)),
    `다음 버튼에 할 일이 물려 있다 (라벨 "${next ? next.textContent : ""}")`);
  const before = active();
  if (next) press(next);
  await wait(80);
  check(active() !== before, `다음 버튼을 누르면 화면이 넘어간다 (누른 뒤 ${active()})`);
  check(/\d+\s*:\s*\d+/.test(stageText) && /평점|MOM/.test(stageText),
    "경기 결과 요약(스코어 · 평점/MOM)이 화면에 남는다");
  check(w.__errs.length === 0, `경기 중 자바스크립트 오류가 없다${w.__errs.length ? ` — ${w.__errs[0]}` : ""}`);

  /* ── E. 카드 빈도가 계단이 아니다 ──
   * 설계 §2-10: 에이스 계단을 폐기한 이유가 **"축이 70→90에서 2.8배 튀는 주범"**이었어요.
   * 능력치 5점 사이에 순간 카드 빈도가 배로 뛰면 그 계단이 그대로 남아 있는 겁니다. */
  {
    const E = load();
    /* 🔴 2026-08-28 문턱 갱신 — 1.60 → **1.35**, 폭도 70~110 → **60~150 · 4포지션**.
     * 옛 값은 🌟 에이스 승자독식 계단(fw 1.94 · df 2.92)이 살아 있던 엔진에서
     * "이 정도면 잡히겠지"로 잡은 값이었어요. 구조를 고치고 다시 재니 최대 1.09입니다.
     * 22번 inspector 항목 21이 **≤1.35**로 못박았고, 지금은 여유가 24%예요.
     * 계단은 위쪽 능력치에서만 나기도 해서 폭을 150까지 넓혔습니다.
     * ⚠️ 이 문턱이 **실제로 계단을 잡는지**는 mutation-test.js 검사 E가 증명합니다
     *    (구조를 되돌리면 1.94 / 2.92로 튀어요). 여기는 불변식, 거기는 그 불변식의 증명입니다. */
    const STEP_MAX = 1.35;          // 문턱 — 5점 사이 인접 비
    for (const pos of ["fw", "wg", "mf", "df"]) {
      const v = [];
      for (let ab = 60; ab <= 150; ab += 5) v.push([ab, play(E, pos, ab, { n: 1200, seed: 31, mateBase: 70 }).perMatch.cards]);
      let mx = 1, at = 0;
      for (let i = 1; i < v.length; i++) { const r = v[i][1] / v[i - 1][1]; if (r > mx) { mx = r; at = v[i][0]; } }
      check(mx <= STEP_MAX,
        `${pos} — 능력치 5점 사이 순간 카드 빈도가 계단이 아니다 (최대 비 ${mx.toFixed(2)} @ 능력치 ${at} · ≤${STEP_MAX})`
        + `\n     ${v.map(([a, c]) => `${a}:${c.toFixed(2)}`).join(" ")}`);
    }
    // 설계 검사 13번 — 전 포지션·전 능력치에서 경기당 0.6회 이상
    const FLOOR = 0.6;
    const low = [];
    for (const pos of ["fw", "wg", "mf", "df"]) {
      for (const ab of [70, 90, 110, 130, 150]) {
        const c = play(E, pos, ab, { n: 1200, seed: 41, mateBase: 70 }).perMatch.cards;
        if (c < FLOOR) low.push(`${pos}${ab}=${c.toFixed(2)}`);
      }
    }
    check(low.length === 0, `카드 빈도 ≥ ${FLOOR}회/경기 (설계 검사 13번)${low.length ? ` — 못 넘긴 칸: ${low.join(" ")}` : ""}`);
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("❌ 검사가 죽었어요 —", e.stack); process.exit(1); });
