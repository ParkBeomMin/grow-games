/* ⚽ 더 윙어 II — 👕 3D 유니폼 뷰어 **렌더 검증** (헤드리스 크로미움)
 *
 * 🖥️ jsdom에는 렌더 엔진도 WebGL도 없어서 `tests/winger2/*`는 이 화면을 못 봅니다.
 *    (그건 사고가 아니라 설계예요 — 검사에서 3D가 뜨면 12종이 통째로 죽습니다.)
 *    그래서 **진짜 크로미움으로 띄워서 좌표를 잽니다.**
 *
 * 🔴 이 파일이 있는 이유 — 예전에 🦶 주발 표시의 **색이 판정과 반대쪽**이던 버그를
 *    렌더 없이는 못 봤어요. *"안 보이는 것"*이 아니라 **거짓말을 하고 있던 것**입니다.
 *
 *    👕 유니폼으로 바꾸면서 그 자리가 **뒤집혔고**(공이 주발 쪽 → 공이 가운데),
 *    2026-08-31에 **공 자체가 사라졌습니다.** 그래서 A절이 재는 것도 세 번째 모양이에요 —
 *    지금은 ***"그 장치가 없다"***(`stray === 0`)를 잽니다. 없는 것을 재는 검사를 남겨 두면
 *    다음 사람이 거기에 공을 되살립니다.
 *
 * 🆕 **H절**이 붙었습니다 — 🏠 유스 홈 · 💼 프로 화면의 **HUD 미니 유니폼**.
 *    H절이 지키는 가장 중요한 한 줄: **HUD에서 WebGL이 돌지 않는다.**
 *    HUD는 늘 떠 있는 자리라, 여기서 3D가 돌면 🔥 순간 카드의 프레임을 갉아먹고
 *    `s` 분포가 내려가서 **곡선이 기기 성능에 의존**합니다.
 *
 * ⚠️ **손맛은 여기서 못 잽니다.** 3D가 뜨는 순간이 덜컥거리는지, 끌어 돌리는 손맛이
 *    어떤지, 폰이 뜨거워지는지는 **실기기 목록**(`beta/_check.html`)으로 넘겼습니다.
 *    기하는 검증했다고 적고, 손맛은 실기기로 넘기세요. 둘을 섞지 마세요.
 *
 * 쓰는 법:
 *   python3 -m http.server 8731 --bind 127.0.0.1 &      # 저장소 루트에서
 *   node scripts/w2-avatar-render.js
 *   → 0 = 통과 · 1 = 어긋남. 스크린샷은 shots/ (gitignore)
 */
const { chromium } = require("/workspace/.tools/node_modules/playwright-core");
const EXE = "/workspace/.tools/browsers/chromium-1148/chrome-linux/chrome";
const OUT = "/workspace/grow-games/shots";
let fail = 0;
const ck = (ok, m, extra) => { console.log(`${ok ? "✅" : "❌"} ${m}${extra != null ? "  " + extra : ""}`); if (!ok) fail++; };

/* 🔴 **WebGL을 「요청」한 횟수를 셉니다 — 「성공」이 아니라 요청입니다.**
 *
 * 🔴 이걸 왜 이렇게 재는지가 중요해요. 처음엔 *"HUD에 3D 캔버스가 없다"*로 쟀는데,
 *    HUD가 `W2Char.show()`를 부르도록 **일부러 망가뜨려도 초록불이었습니다.**
 *    헤드리스 크로미움이 조립대에서 쓴 컨텍스트를 놓은 직후 새 컨텍스트를 안 내줘서,
 *    3D가 그냥 **실패**하고 CSS로 떨어졌거든요 — 즉 검사가 지킨 게 아니라
 *    **환경이 우연히 막아 준 것**이었어요. 실기기에서는 그 컨텍스트가 나옵니다.
 *    (이 저장소가 여덟 번 넘게 겪은 「초록불인데 아무것도 안 지키는 검사」의 아홉 번째 모양)
 *
 * ✅ 그래서 **컨텍스트가 나왔는지가 아니라 달라고 했는지**를 셉니다.
 *    `W2Char.show()`는 무엇보다 먼저 `webglOK()`로 컨텍스트를 만들어 봐요 —
 *    HUD 화면에서 그 숫자가 1이라도 오르면 **누군가 HUD에 3D를 세우려 한 것**입니다.
 *    성공·실패와 무관하게 잡히고, 기기 성능과도 무관합니다. */
const GL_SPY = () => {
  window.__glReq = 0;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t) {
    if (String(t).indexOf("webgl") >= 0) window.__glReq++;
    return orig.apply(this, arguments);
  };
};

/* 🇰🇷 **한글 세 글자**가 등판에 들어가는지가 이번 판의 핵심 질문이에요.
 * 참고 이미지는 알파벳(`APELLIDO`)이고, 우리 이름은 한글입니다. */
const KO3 = "김하늘";
const KO_LONG = "남궁도영훈";     // 다섯 글자 — 줄어들어야 하는 쪽

/* ══════════════════════════════════════════════════════════════════════
 * 🚶 **생성 흐름을 처음부터 걸어갑니다** (2026-09-01 · 93번 §5 · 98번)
 * ══════════════════════════════════════════════════════════════════════
 *   ✏️ 이름 → 🦶 주발 → 🗺️ 동네 → 🏫 초등(2) → 📨 조기 → 🎯 자리
 *                        → 🏫 중등(3) → 📨 조기 → 🏫 고등(3) → 🏟️ 최종 → 🧬 조립대
 *
 * 🔴 **이 경로가 한 번 바뀌면 A~H절이 통째로 죽습니다.** 실제로 그랬어요 —
 *    🏫 학교 아크가 들어오면서 예전 경로(이름 → 🏟️ 제안)가 끊겼고,
 *    `#agency-list button`을 30초 기다리다 전체가 멈추면서 **렌더 도구가 통째로 멈췄습니다.**
 *    🔑 그래서 경로를 **한 군데**(`walk`)로 모았어요. 다음에 흐름이 바뀌면 여기만 고칩니다.
 *
 * 🤖 단계 카드는 **게임이 이미 가진 갈래**(`grow-auto-mini`)로 지납니다 — 중립 조작(s = 0.5).
 *    판정 산식을 우회하는 게 아니고, 검사 드라이버(`tests/winger2/_load.js`)와 같은 문입니다.
 *
 * `stop`으로 **중간에서 멈춥니다**: `town:e` `early:e` `town:m` `early:m` `town:h` `agency` `bench` */
async function walk(p, { foot = "R", name = KO3, origin = "seoul", pos = "wg", stop = "bench" } = {}) {
  const cur = () => p.evaluate(() => (document.querySelector(".screen.active") || {}).id || "");
  const go = async (sel) => { await p.click(sel); await p.waitForTimeout(160); };
  const leave = async (id) => p.waitForFunction((x) => {
    const a = document.querySelector(".screen.active");
    return !a || a.id !== x;
  }, id, { timeout: 8000 });
  await go("#btn-new");
  await p.fill("#input-name", name);
  await go("#btn-name-next");
  /* 🦶 주발 — **320ms 뒤에 넘어갑니다.** 숫자를 박지 않고 「화면이 바뀔 때까지」를 기다려요
   *    (♿ reduce에서는 즉시입니다 — 연출이 진행을 붙잡으면 안 돼요). */
  await go(`#screen-foot .foot-card[data-foot="${foot === "L" ? "L" : "R"}"]`);
  await leave("screen-foot");
  /* 🤖 🏫 카드를 자동으로 — 🗺️ [다음] 앞에 켜야 합니다. 초등 첫 카드는
   *    `openStage`가 불리는 순간 바로 열려서, 그 뒤에 켜면 이미 진짜 미니게임이 떠 있어요. */
  await p.evaluate(() => localStorage.setItem("grow-auto-mini", "1"));
  await go(`#origin-map .om-do[data-id="${origin}"], #origin-cities .om-city[data-id="${origin}"]`);
  await go("#btn-origin-next");
  /* 🏫 지금 서 있는 단계의 카드를 끝까지. 단계가 끝나면 화면이 바뀜서 저절로 멈춰요. */
  const stage = async () => {
    for (let g = 0; g < 12; g++) {
      const st = await p.evaluate(() => {
        const a = document.querySelector(".screen.active");
        const b = document.getElementById("btn-town-next");
        return { id: a && a.id, ok: !!b && !b.disabled && !b.classList.contains("hidden") };
      });
      if (st.id !== "screen-town" || !st.ok) return;
      await go("#btn-town-next");
    }
  };
  /* 📨 조기 제안은 **반드시 「거절」**입니다 — 카드를 누르면 🤝 예비 계약이라
   *    🏟️ 최종에 한 곳만 옵니다(`_load.js`의 `passEarly`와 같은 근거). */
  const early = async () => { await go("#btn-early-next"); };
  if (stop === "town:e") return p;
  await stage();
  if (stop === "early:e") return p;
  await early();
  if (stop === "position") return p;
  await go(`#position-list .card[data-pos="${pos}"]`);
  if (stop === "town:m") return p;
  await stage();
  if (stop === "early:m") return p;
  await early();
  if (stop === "town:h") return p;
  await stage();
  if (stop === "agency") return p;
  await go("#agency-list button");
  return p;
}

async function bench(b, { w = 390, rm = false, foot = "R", gl = true, name = KO3, shot = null, stop = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2,
    reducedMotion: rm ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message)));
  await p.addInitScript(GL_SPY);
  if (!gl) await p.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) {
      if (String(t).indexOf("webgl") >= 0) return null;
      return orig.apply(this, arguments);
    };
  });
  await p.goto("http://127.0.0.1:8731/beta/winger2/index.html", { waitUntil: "networkidle" });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: "networkidle" });
  await walk(p, { foot, name, stop: stop || "bench" });
  if (!stop) await p.waitForTimeout(gl ? 2600 : 800);
  if (shot) { await p.screenshot({ path: `${OUT}/${shot}.png` }); await p.screenshot({ path: `${OUT}/${shot}-full.png`, fullPage: true }); }
  return { p, ctx, errs };
}

/* 🏠 유스 홈까지 — **게임 입구를 통해 실제 버튼을 눌러** 갑니다 (값을 심지 않아요) */
async function youthHome(b, { w = 390, rm = false } = {}) {
  const { p, ctx, errs } = await bench(b, { w, rm });
  /* 🧬 조립대는 3D를 **정당하게** 씁니다 — 그 몫을 빼고 재려고 여기서 눈금을 찍어요 */
  const glBefore = await p.evaluate(() => window.__glReq);
  await p.click("#btn-prospect-start");
  await p.waitForTimeout(900);
  return { p, ctx, errs, glBefore };
}

/* 💼 프로 준비 화면까지 — 확인 페이지 픽스처(`winger2-match`) + **이어하기 버튼**.
 * ⚠️ 값을 손으로 짓지 않습니다. `beta/_fixtures.js`는 jsdom에서 실제로 그 상태까지 간 뒤
 *    localStorage를 통째로 뜬 것이라, 여기 뜨는 이름·리그·번호가 **진짜 세이브**예요. */
async function proPrep(b, { w = 390, rm = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2,
    reducedMotion: rm ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message)));
  await p.addInitScript(GL_SPY);
  await p.goto("http://127.0.0.1:8731/beta/winger2/index.html", { waitUntil: "networkidle" });
  await p.addScriptTag({ url: "http://127.0.0.1:8731/beta/_fixtures.js" });
  const ok = await p.evaluate(() => {
    const f = (window.CHECK_FIXTURES.items || []).find((x) => x.id === "winger2-match");
    if (!f) return false;
    localStorage.clear();
    for (const k in f.keys) localStorage.setItem(k, f.keys[k]);
    return true;
  });
  if (!ok) throw new Error("픽스처 winger2-match를 못 찾았어요 — node scripts/make-fixtures.js");
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(300);
  await p.click("#btn-continue");
  await p.waitForTimeout(200);
  /* 💼 프로 화면은 3D를 쓸 일이 아예 없어요 — 여기서 눈금이 0이어야 합니다 */
  const glBefore = await p.evaluate(() => window.__glReq);
  await p.click(".slot-go");
  await p.waitForTimeout(900);
  return { p, ctx, errs, glBefore };
}

/* 👕 HUD 미니 유니폼의 상태를 한 번에 읽어요 */
const hudKit = (p) => p.evaluate(() => {
  const act = document.querySelector(".screen.active");
  const hud = act && act.querySelector(".hud");
  const kit = hud && hud.querySelector(".w2-hudkit");
  const jsy = kit && kit.querySelector(".pc-jersey");
  const no = kit && kit.querySelector(".j-no");
  const acts = hud && hud.querySelector(".hud-acts");
  const rk = kit && kit.getBoundingClientRect();
  const rh = hud && hud.getBoundingClientRect();
  const ra = acts && acts.getBoundingClientRect();
  const cs = jsy && getComputedStyle(jsy);
  const csn = no && getComputedStyle(no);
  const body = kit && kit.querySelector(".j-body");
  return {
    screen: act && act.id,
    has: !!kit, hasJersey: !!jsy,
    label: jsy && jsy.getAttribute("aria-label"),
    no: no && no.textContent.trim(),
    noPx: csn ? Math.round(parseFloat(csn.fontSize) * (cs ? (cs.transform.match(/matrix\(([\d.]+)/) || [0, 1])[1] : 1)) : 0,
    bodyColor: body && getComputedStyle(body).backgroundColor,
    rootKit: getComputedStyle(document.documentElement).getPropertyValue("--kit-body").trim(),
    kitBox: rk ? { w: +rk.width.toFixed(1), h: +rk.height.toFixed(1) } : null,
    hudH: rh ? +rh.height.toFixed(1) : 0,
    actsTop: ra && rh ? +(ra.top - rh.top).toFixed(1) : 0,     // 📱 하단 액션바가 시작하는 자리
    /* 🔴 이 넷이 이 절의 핵심입니다 — HUD에서 WebGL이 돌면 안 됩니다.
     * `glReq`가 **가장 센 자물쇠**예요(위 GL_SPY 주석). 나머지 셋은 그 옆의 보조 자물쇠입니다.
     * `mark`는 **char3d.js가 이 요소에 손댄 흔적**이에요 — `is-3d`/`is-flat`은
     * 그 파일만 붙입니다. 3D가 실패해서 CSS로 떨어져도 흔적은 남아요. */
    glReq: window.__glReq,
    mark: kit ? (kit.classList.contains("is-3d") ? "is-3d" : kit.classList.contains("is-flat") ? "is-flat" : "") : null,
    live: !!(window.W2Char && window.W2Char.live),
    glCanvas: document.querySelectorAll("canvas.w2c-canvas").length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

/* 🖐️ 무대를 끌어 돌립니다 — `spin`은 1px에 0.012rad이라 반 바퀴는 약 262px이에요 */
async function spin(p, px) {
  const r = await p.evaluate(() => {
    const s = document.querySelector(".w2c-stage").getBoundingClientRect();
    return { x: s.x + s.width / 2, y: s.y + s.height / 2 };
  });
  await p.mouse.move(r.x - px / 2, r.y);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(r.x - px / 2 + (px * i) / 6, r.y);
  await p.mouse.up();
  await p.waitForTimeout(220);
}

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

  /* ── A. 🦶 주발 · ⚽ **공을 지운 자리** ─────────────────────────────────
   *
   * 🔴 이 절은 이제 **세 번째 모양**입니다. 무엇을 재는지가 두 번 뒤집혔어요:
   *
   *   ① 캐릭터판   *"공이 **주발 쪽**인가"*            → 방향이 **맞다**를 지킴
   *   ② 유니폼판   *"공이 **어느 쪽도 아닌가**"*        → 방향을 **안 쓴다**를 지킴
   *   ③ 지금       *"공이 **없나**"*                    → 그 장치가 **없다**를 지킴
   *
   *   ②에서 공은 이미 아무 뜻도 없는 장식이었어요(82번 §3). 장식을 지웠으니
   *   검사도 공을 찾으면 안 됩니다 — **없는 것을 재는 검사는 다음 사람이 그걸
   *   되살릴 자리**가 됩니다.
   *
   * 🔒 **되살리면 빨간불이 되게** 만들었습니다. `probe()`가 `ball*` 필드를 아예 안 내고
   *    `stray`(= `shirt` 바깥에 매달린 메시 수)를 냅니다. 이름을 바꿔 공을 되살려도
   *    `stray`가 1이 돼요 — **이름이 아니라 형태로** 막습니다
   *    (이 저장소가 「폐기는 이름이 아니라 형태」로 한 번 데였습니다).
   *
   * ✅ 그리고 ②가 지키던 것은 **칩으로 옮겨서 그대로 지킵니다** —
   *    왼발판과 오른발판에서 🦶 칩의 화면 x가 **같아야** 합니다. */
  const chipX = {};
  for (const foot of ["L", "R"]) {
    const { p, ctx, errs } = await bench(b, { foot, shot: `w2-jersey-390-foot${foot}` });
    const shownFoot = await p.textContent(".pb-meta");
    const pr = await p.evaluate(() => window.W2Char && window.W2Char.probe());
    ck(!!pr, `[A/${foot}] 👕 유니폼이 실제로 섰다`);
    if (pr) {
      /* 🔒 변이가 잡히는 자리 ① — 공(이든 뭐든)을 무대에 다시 매달면 빨간불 */
      ck(pr.stray === 0, `[A/${foot}] ⚽ 무대에 👕 유니폼 말고 아무것도 없다 (공을 지웠어요)`,
        `shirt 바깥 메시 ${pr.stray}개`);
      ck(pr.ball === undefined && pr.ballPct === undefined,
        `[A/${foot}] probe()가 공을 **보고하지도 않는다**`, `ball=${pr.ball} ballPct=${pr.ballPct}`);
      const chip = await p.evaluate(() => {
        const s = document.querySelector(".w2c-stage"), c = document.querySelector(".w2c-foot");
        if (!s || !c) return null;
        const rs = s.getBoundingClientRect(), rc = c.getBoundingClientRect();
        return { pct: +(((rc.x + rc.width / 2 - rs.x) / rs.width) * 100).toFixed(1),
          l: +(((rc.x - rs.x) / rs.width) * 100).toFixed(1), r: +(((rc.right - rs.x) / rs.width) * 100).toFixed(1),
          t: +(((rc.y - rs.y) / rs.height) * 100).toFixed(1), b: +(((rc.bottom - rs.y) / rs.height) * 100).toFixed(1),
          h: +rc.height.toFixed(1), txt: c.textContent.trim() };
      });
      chipX[foot] = chip && chip.pct;
      ck(chip && Math.abs(chip.pct - 50) <= 6,
        `[A/${foot}] 🦶 칩이 무대 가운데 — 주발을 좌우로 말하지 않는다`, `칩 ${chip && chip.pct}%`);
      /* 🔴 공이 사라지면서 유니폼이 1.3배 커졌어요 — **옷자락이 칩 자리까지 내려옵니다.**
       * 예전엔 *"칩이 공을 덮나"*를 쟀는데, 이제 덮일 수 있는 건 **옷**입니다.
       * `PAD_B`(char3d.js)나 `.w2c-foot { bottom }`을 건드리면 여기가 빨간불이에요. */
      const sb = pr.shirtBox;
      const noOv = chip && sb && (chip.t >= sb.b - 0.5 || chip.b <= sb.t + 0.5
        || chip.r <= sb.l + 0.5 || chip.l >= sb.r - 0.5);
      ck(noOv, `[A/${foot}] 🦶 칩이 👕 유니폼을 안 덮는다`,
        `칩 x${chip && chip.l}~${chip && chip.r} y${chip && chip.t}~${chip && chip.b} · 옷 x${sb && sb.l}~${sb && sb.r} y${sb && sb.t}~${sb && sb.b}`);
      ck(chip && chip.l >= 0 && chip.r <= 100 && chip.b <= 100 && chip.t >= 0,
        `[A/${foot}] 🦶 칩이 무대 안에 들어온다`, `x${chip && chip.l}~${chip && chip.r} y${chip && chip.t}~${chip && chip.b}`);
      ck(chip && chip.txt === (foot === "L" ? "🦶 왼발" : "🦶 오른발") && String(shownFoot).indexOf(foot === "L" ? "왼발" : "오른발") >= 0,
        `[A/${foot}] 칩 글자 = 실제 주발`, `${chip && chip.txt} / ${String(shownFoot).trim()}`);
      ck(pr.foot === foot, `[A/${foot}] 3D가 받은 주발이 화면과 같다`, pr.foot);
      /* 👕 유니폼이 무대를 실제로 채우나 — 공 자리를 비워 두던 시절엔 세로 45%였어요.
       * ⚠️ 문턱을 실측 뒤에 적었습니다(예전에 추정치로 적었다가 틀렸어요 · 82번 §11). */
      ck(sb && (sb.b - sb.t) >= 60,
        `[A/${foot}] 👕 유니폼이 무대 세로를 채운다 (공 자리를 되찾았어요)`,
        sb && `세로 ${(sb.b - sb.t).toFixed(1)}%`);
    }
    ck(errs.length === 0, `[A/${foot}] 페이지 에러 없음`, errs.join(" | "));
    await ctx.close();
  }
  /* 🔒 변이가 잡히는 자리 ② — 주발을 다시 **좌우로** 말하기 시작하면 빨간불 */
  ck(chipX.L != null && chipX.L === chipX.R,
    `[A] 🦶 왼발판과 오른발판에서 칩의 화면 x가 **같다** (좌우에 뜻이 없음)`, `L ${chipX.L}% · R ${chipX.R}%`);

  /* ── N. 🖨️ 등판 — 🇰🇷 한글이 새겨지고, 안 잘리고, 카메라를 본다 ──────── */
  {
    const { p, ctx } = await bench(b, { shot: "w2-jersey-390-back" });
    const pr = await p.evaluate(() => window.W2Char.probe());
    ck(pr && pr.print && !pr.print.empty, `[N] 👕 등에 뭔가 새겨졌다 (무지가 아님)`,
      pr && JSON.stringify({ name: pr.print.name, no: pr.print.no }));
    ck(pr && pr.print.name === KO3 && pr.print.no === "7" || pr && pr.print.no === "9",
      `[N] 새겨진 것이 화면의 이름·번호와 같다`, pr && `${pr.print.name} / ${pr.print.no} (화면 ${pr.name} / ${pr.number})`);
    /* 🇰🇷 **세 글자가 자리에 들어가나** — 글자 수가 아니라 **실제 폭**으로 잽니다 */
    ck(pr && pr.print.nameW > 0 && pr.print.nameW <= pr.print.nameMax,
      `[N] 🇰🇷 한글 이름이 등판 폭 안에 들어간다`, pr && `${pr.print.nameW} / ${pr.print.nameMax}px (${pr.print.px}² 캔버스)`);
    ck(pr && pr.print.namePx >= pr.print.px * 0.12,
      `[N] 이름 글자가 줄다 못해 사라지지 않았다`, pr && `${pr.print.namePx}px`);
    ck(pr && pr.print.noPx >= pr.print.px * 0.35,
      `[N] 등번호가 이름보다 크다 (유니폼 관례)`, pr && `이름 ${pr.print.namePx} · 번호 ${pr.print.noPx}px`);
    /* 🔑 **기본 자세가 등**이어야 합니다 — 이 화면의 사건이 *"내 이름이 새겨졌다"*라서요 */
    ck(pr && pr.print.facing >= 0.80, `[N] 쉴 때 등이 카메라를 본다`, pr && `facing=${pr.print.facing}`);
    ck(pr && pr.print.l >= 0 && pr.print.r <= 100 && pr.print.t >= 0 && pr.print.b <= 100,
      `[N] 등판이 무대 밖으로 안 나간다`, pr && `x${pr.print.l}~${pr.print.r} y${pr.print.t}~${pr.print.b}`);
    ck(pr && (pr.print.r - pr.print.l) >= 20, `[N] 등판이 읽을 만큼 크다 (무대 폭의 20% 이상)`,
      pr && `${(pr.print.r - pr.print.l).toFixed(1)}%`);
    /* 🔴 **이름이 두 번 겹쳐 보이던 자리** — 무대 위 이름표가 접히면서 등판 이름을 덮었어요.
     * 글자가 아니라 **사각형 두 개의 교차**로 잽니다. 폭이 줄면 접히니까 320px도 함께 봅니다(E절). */
    const idBox = await p.evaluate(() => {
      const s = document.querySelector(".w2c-stage").getBoundingClientRect();
      const i = document.querySelector(".pc-id").getBoundingClientRect();
      return { l: +(((i.x - s.x) / s.width) * 100).toFixed(1), r: +(((i.right - s.x) / s.width) * 100).toFixed(1),
        t: +(((i.y - s.y) / s.height) * 100).toFixed(1), b: +(((i.bottom - s.y) / s.height) * 100).toFixed(1) };
    });
    ck(pr && (idBox.r <= pr.print.l || idBox.l >= pr.print.r || idBox.b <= pr.print.t || idBox.t >= pr.print.b),
      `[N] 무대 위 이름표가 🖨️ 등판을 안 덮는다`,
      pr && `이름표 x${idBox.l}~${idBox.r} y${idBox.t}~${idBox.b} · 등판 x${pr.print.l}~${pr.print.r} y${pr.print.t}~${pr.print.b}`);

    /* 🇰🇷 긴 이름 — **줄어들되 폭 안에** 들어와야 합니다 */
    /* ⚠️ **문턱을 손으로 적지 않습니다.** "0.185보다 작아야" 같은 값은 시작 크기를
     * 한 번만 손대도 우연히 통과하거나 우연히 실패해요 (실제로 그랬습니다).
     * **세 글자 이름과의 관계**로 잽니다 — 긴 이름은 짧은 이름보다 **작아야** 합니다. */
    const long = await p.evaluate((n) => { window.W2Char.set({ name: n }); return window.W2Char.probe().print; }, KO_LONG);
    ck(long.nameW <= long.nameMax && long.namePx < pr.print.namePx,
      `[N] 🇰🇷 긴 이름은 줄어서 들어간다 (안 잘림)`,
      `${KO_LONG} → ${long.namePx}px · ${long.nameW}/${long.nameMax}px (세 글자는 ${pr.print.namePx}px)`);

    /* 👕 **무지** — 이름·번호가 비면 아무것도 안 새겨집니다 (유니폼의 일생 ①) */
    const blank = await p.evaluate(() => { window.W2Char.set({ name: "", number: "" }); return window.W2Char.probe().print; });
    ck(blank.empty === true && blank.visible === false, `[N] 이름·번호가 비면 **무지 유니폼**`, JSON.stringify({ empty: blank.empty, visible: blank.visible }));
    await p.screenshot({ path: `${OUT}/w2-jersey-390-blank.png` });
    /* 다시 새기면 살아납니다 — ②의 사건 */
    const back = await p.evaluate((n) => { window.W2Char.set({ name: n, number: 10 }); return window.W2Char.probe().print; }, KO3);
    ck(back.empty === false && back.visible === true && back.no === "10",
      `[N] 이름·번호를 다시 넣으면 새겨진다`, `${back.name} ${back.no}`);

    /* 🖐️ 반 바퀴 돌리면 **앞면(깔끔한 면)** — 등판이 카메라를 등집니다 */
    await spin(p, 262);
    const front = await p.evaluate(() => window.W2Char.probe());
    ck(front.print.facing <= -0.5, `[N] 반 바퀴 끌면 앞면이 나온다`, `facing=${front.print.facing}`);
    await p.screenshot({ path: `${OUT}/w2-jersey-390-front.png` });
    await ctx.close();
  }

  /* ── B. 🎲 — **유니폼은 안 바뀌고, 바뀌는 건 🌱 등급 여섯 줄** ─────────
   * 🔴 캐릭터판은 여기서 *"체형이 8가지로 달라지나"*를 쟀어요. 유니폼은 **안 바뀌는 축**이라
   *    그 반대를 잽니다. 그리고 **🎲가 헛돌지 않는다는 것**은 등급 줄에서 확인해요 —
   *    "유니폼이 안 바뀐다"만 재면 🎲가 죽어도 초록불이 됩니다. */
  {
    const { p, ctx } = await bench(b, {});
    const snaps = [], grades = [];
    for (let i = 0; i < 8; i++) {
      snaps.push(await p.evaluate(() => window.W2Char.probe()));
      grades.push(await p.evaluate(() => Array.from(document.querySelectorAll(".pcg-val")).map((e) => e.textContent).join("/")));
      await p.click("#btn-prospect-reroll");
      await p.waitForTimeout(240);
    }
    /* 💥 **죽음은 초록불도 빨간불도 아닙니다.** 굴리는 도중 3D가 사라지면 `probe()`가
     * null이에요 — 그걸 그대로 읽으면 파일이 그 자리에서 터지고 「실패 1건」으로만 보입니다. */
    const dead = snaps.filter((x) => !x).length;
    ck(dead === 0, `[B] 🎲를 굴리는 내내 3D가 살아 있다`, `사라진 판 ${dead}/8`);
    const live = snaps.filter(Boolean);
    const kits = new Set(live.map((s) => `${s.kit.body}|${s.kit.trim}|${s.kit.pattern}`)).size;
    const ids = new Set(live.map((s) => `${s.print.name}|${s.print.no}`)).size;
    ck(kits === 1 && ids === 1, `[B] 🎲 8번에도 👕 유니폼은 **그대로** (킷·이름·번호)`, `킷 ${kits}가지 · 신원 ${ids}가지`);
    ck(new Set(grades).size >= 7, `[B] 그 대신 🌱 등급 여섯 줄이 바뀐다 (🎲가 헛돌지 않음)`, `${new Set(grades).size}/8`);
    const last = await p.evaluate(() => window.W2Char.probe());
    ck(last && last.mounts === 1, `[B] 🎲를 굴려도 WebGL 컨텍스트는 하나`, `mounts=${last && last.mounts}`);
    /* 📦 실측 10 calls · 1,008 tri. 캐릭터판이 18 · 1,192였으니 **둘 다 줄었습니다.**
     * 문턱은 그 사이에 둡니다 — 메시 하나만 더 얹어도 여기가 빨간불이에요. */
    ck(last && last.calls <= 12 && last.tris <= 1100, `[B] 드로우콜·폴리 예산 (캐릭터판 18·1192보다 줄어야)`,
      last ? `calls=${last.calls} tris=${last.tris}` : "3D가 없어요");
    await ctx.close();
  }

  /* ── S. 🔢 등번호 — 고르면 **등판이 바뀌고, 화면은 안 깜빡인다** ────────── */
  {
    const { p, ctx } = await bench(b, {});
    const before = await p.evaluate(() => window.W2Char.probe());
    const nos = await p.evaluate(() => Array.from(document.querySelectorAll(".pc-no")).map((b) => ({
      n: b.dataset.no, on: b.classList.contains("on"), h: +b.getBoundingClientRect().height.toFixed(1) })));
    ck(nos.length >= 2 && nos.filter((x) => x.on).length === 1,
      `[S] 등번호 후보가 여럿이고 하나만 켜져 있다`, JSON.stringify(nos));
    ck(nos.every((x) => x.h >= 44), `[S] 등번호 탭 칸 ≥ 44px`, JSON.stringify(nos.map((x) => x.h)));
    const other = nos.find((x) => !x.on);
    await p.click(`.pc-no[data-no="${other.n}"]`);
    await p.waitForTimeout(200);
    const after = await p.evaluate(() => ({ pr: window.W2Char.probe(),
      on: Array.from(document.querySelectorAll(".pc-no.on")).map((b) => b.dataset.no),
      meta: document.querySelector(".pb-meta").textContent }));
    ck(after.pr.print.no === String(other.n), `[S] 고른 번호가 **등판에** 새겨진다`,
      `${before.print.no} → ${after.pr.print.no}`);
    ck(after.on.length === 1 && after.on[0] === String(other.n), `[S] 버튼 상태가 따라온다`, after.on.join(","));
    /* 🔑 화면을 통째로 다시 그리지 않았어야 합니다 — 컨텍스트가 그대로면 안 그린 거예요 */
    ck(after.pr.mounts === 1, `[S] 번호를 바꿔도 화면을 다시 안 그린다 (mounts 그대로)`, `mounts=${after.pr.mounts}`);
    /* 🧹 세이브에 남는지 — 「이 선수로 시작」을 누른 뒤 `S.shirtNo` */
    await p.click("#btn-prospect-start");
    await p.waitForTimeout(400);
    /* ⚠️ `S`는 고전 스크립트의 최상위 `let`이라 **`window.S`가 아닙니다** (전역 객체에 안 붙어요).
     * `window.S`로 읽으면 배선이 살아 있어도 영영 null이에요 — 실제로 그렇게 한 번 속았습니다. */
    const saved = await p.evaluate(() => (typeof S !== "undefined" && S ? S.shirtNo : null));
    ck(String(saved) === String(other.n), `[S] 고른 번호가 세이브에 남는다 (S.shirtNo)`, `${saved}`);
    await ctx.close();
  }

  /* ── C. ♿ prefers-reduced-motion — 정지하되 정보를 안 잃는다 ─────────── */
  {
    const { p, ctx } = await bench(b, { rm: true, shot: "w2-jersey-390-reduce" });
    const pr = await p.evaluate(() => window.W2Char.probe());
    ck(pr && pr.reduce === true, `[C] 3D가 reduced-motion을 인지`);
    /* 🔑 멈춰도 **등이 정면**이어야 합니다 — 이름·번호는 연출이 아니라 정보예요 */
    ck(pr && pr.print.facing >= 0.90 && pr.print.opacity === 1 && !pr.print.empty,
      `[C] 멈춰도 이름·번호가 정면에서 읽힌다`, pr && `facing=${pr.print.facing} opacity=${pr.print.opacity}`);
    const a = await p.evaluate(() => window.W2Char.probe().spinY);
    await p.waitForTimeout(700);
    const b2 = await p.evaluate(() => window.W2Char.probe().spinY);
    ck(a === b2, `[C] 회전이 멈춰 있다`, `${a} → ${b2}`);
    const rows = await p.evaluate(() => Array.from(document.querySelectorAll(".pcg-row")).map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { h: +r.height.toFixed(1), op: cs.opacity };
    }));
    ck(rows.length === 6 && rows.every((r) => r.h > 10 && Number(r.op) === 1),
      `[C] 등급 여섯 줄이 전부 보인다 (애니메이션에 갇히지 않음)`, JSON.stringify(rows.map((r) => r.op)));
    const vis = await p.evaluate(() => {
      const s = document.querySelector(".w2c-stage");
      return { canvas: !!s.querySelector("canvas"), name: document.querySelector(".pc-name").textContent.trim() };
    });
    ck(vis.canvas && vis.name.length > 1, `[C] 무대와 이름표가 그대로`, vis.name);
    /* 🎲 흔들기도 멈춰 있어야 해요 — `nudge()`는 reduce에서 아무 일도 안 합니다 */
    const before = await p.evaluate(() => window.W2Char.probe().spinY);
    await p.evaluate(() => window.W2Char.nudge());
    await p.waitForTimeout(180);
    const after = await p.evaluate(() => window.W2Char.probe().spinY);
    ck(before === after, `[C] 🎲 흔들기도 reduce에서는 안 움직인다`, `${before} → ${after}`);
    await ctx.close();
  }

  /* ── D. 폴백 — WebGL이 없으면 CSS 유니폼이 뜬다 (이름·번호까지) ───────── */
  {
    const { p, ctx, errs } = await bench(b, { gl: false, shot: "w2-jersey-390-fallback" });
    const r = await p.evaluate(() => {
      const st = document.querySelector(".w2c-stage");
      const j = document.querySelector(".pc-jersey");
      const bx = j && j.getBoundingClientRect();
      const nm = document.querySelector(".j-name"), no = document.querySelector(".j-no");
      const box = (e) => { const b = e.getBoundingClientRect(); return { w: +b.width.toFixed(0), h: +b.height.toFixed(0) }; };
      return { flat: st.classList.contains("is-flat"), is3d: st.classList.contains("is-3d"),
        canvas: !!st.querySelector("canvas"), jersey: bx ? { w: +bx.width.toFixed(0), h: +bx.height.toFixed(0) } : null,
        name: nm && nm.textContent.trim(), no: no && no.textContent.trim(),
        nameBox: nm && box(nm), noBox: no && box(no),
        rows: document.querySelectorAll(".pcg-row").length,
        chip: !!document.querySelector(".w2c-foot") };
    });
    ck(!r.canvas && !r.is3d, `[D] WebGL이 없으면 캔버스를 안 만든다`);
    ck(r.jersey && r.jersey.w > 100 && r.jersey.h > 120, `[D] CSS 유니폼이 무대를 채운다`, JSON.stringify(r.jersey));
    /* 🔑 캐릭터판의 폴백은 실루엣이라 **누구인지 알 수 없었어요.** 이제는 이름이 남습니다 */
    ck(r.name === KO3 && r.no && r.noBox.h > 20,
      `[D] 3D가 없어도 🇰🇷 이름·번호가 글자로 남는다`, `${r.name} ${r.no} (번호 ${r.noBox.h}px)`);
    ck(r.rows === 6 && r.chip, `[D] 정보(등급 6줄 · 🦶 칩)를 하나도 안 잃는다`);
    ck(errs.length === 0, `[D] 페이지 에러 없음`, errs.join(" | "));
    await ctx.close();
  }

  /* ── E. 폭 격자 — 가로 넘침 · 겹침 · 탭 칸 · 접히는 선 ───────────────── */
  for (const w of [320, 390]) {
    const { p, ctx } = await bench(b, { w, shot: `w2-jersey-${w}` });
    const r = await p.evaluate(() => {
      const doc = document.documentElement;
      const q = (s) => document.querySelector(s).getBoundingClientRect();
      const taps = ["#btn-prospect-reroll", "#btn-prospect-compare", "#btn-prospect-start", "#btn-back-prospect"]
        .map((s) => ({ s, h: +q(s).height.toFixed(1), w: +q(s).width.toFixed(1) }));
      const name = q(".pc-id"), stage = q(".w2c-stage");
      const chip = q(".w2c-foot");
      return { over: doc.scrollWidth - doc.clientWidth, taps,
        nameInStage: name.top >= stage.top - 1 && name.bottom <= stage.bottom + 1,
        nameChipOverlap: !(name.right <= chip.left || chip.right <= name.left || name.bottom <= chip.top || chip.bottom <= name.top),
        stageH: +stage.height.toFixed(0), foldGrades: +q(".pc-grades").bottom.toFixed(0),
        shirtBot: +q(".pc-shirt").bottom.toFixed(0),
        toolsY: +q(".pc-tools").top.toFixed(0), stageY: +stage.top.toFixed(0) };
    });
    ck(r.over <= 0, `[E/${w}] 가로 넘침 없음`, `${r.over}px`);
    ck(r.taps.every((t) => t.h >= 44), `[E/${w}] 탭 칸 ≥ 44px`, JSON.stringify(r.taps.map((t) => t.h)));
    ck(r.nameInStage && !r.nameChipOverlap, `[E/${w}] 이름표가 무대 안 · 🦶 칩과 안 겹침`);
    /* 🔴 320px에서 이름표가 두 줄로 접히면서 등판 이름을 덮었어요 — 폭마다 다시 잽니다 */
    const ov = await p.evaluate(() => {
      const pr = window.W2Char && window.W2Char.probe();
      if (!pr) return null;
      const s = document.querySelector(".w2c-stage").getBoundingClientRect();
      const i = document.querySelector(".pc-id").getBoundingClientRect();
      const id = { l: ((i.x - s.x) / s.width) * 100, r: ((i.right - s.x) / s.width) * 100,
        t: ((i.y - s.y) / s.height) * 100, b: ((i.bottom - s.y) / s.height) * 100 };
      return { ok: id.r <= pr.print.l || id.l >= pr.print.r || id.b <= pr.print.t || id.t >= pr.print.b,
        id: `x${id.l.toFixed(1)}~${id.r.toFixed(1)} y${id.t.toFixed(1)}~${id.b.toFixed(1)}`,
        pt: `x${pr.print.l}~${pr.print.r} y${pr.print.t}~${pr.print.b}` };
    });
    ck(ov && ov.ok, `[E/${w}] 무대 위 이름표가 🖨️ 등판을 안 덮는다`, ov && `이름표 ${ov.id} · 등판 ${ov.pt}`);
    /* 🔑 **접히는 선** — 👕 무대 + 🔢 등번호 + 🌱 등급 여섯 줄이 첫 화면 안에 있어야
     * 🎲가 무엇을 바꾸는지가 보입니다 (78번 §2에서 실측으로 잡은 자리예요) */
    ck(r.foldGrades <= 844, `[E/${w}] 👕 무대 + 🔢 등번호 + 🌱 등급 여섯 줄이 접히는 선 위`,
      `등번호 끝 ${r.shirtBot}px · 등급 끝 ${r.foldGrades}px`);
    /* 위는 무대가 고정, 아래는 🎲가 고정 — 스크롤 중에도 둘이 한 화면에 있어야 합니다 */
    await p.evaluate(() => window.scrollTo(0, 420));
    await p.waitForTimeout(120);
    const s2 = await p.evaluate(() => {
      const st = document.querySelector(".w2c-stage").getBoundingClientRect();
      const tl = document.querySelector(".pc-tools").getBoundingClientRect();
      return { stageTop: +st.top.toFixed(0), stageBot: +st.bottom.toFixed(0), toolsTop: +tl.top.toFixed(0), toolsBot: +tl.bottom.toFixed(0) };
    });
    ck(s2.stageBot > 40 && s2.toolsTop < 844 && s2.stageBot < s2.toolsTop,
      `[E/${w}] 420px 스크롤해도 👕 무대와 🎲가 함께 보인다`, JSON.stringify(s2));
    await ctx.close();
  }

  /* ── H. 👕 **HUD 미니 유니폼** ────────────────────────────────────────
   *
   * 🔴 이 절이 지키는 **가장 중요한 한 줄**: HUD에서 **WebGL이 돌지 않는다.**
   *    HUD는 🏠 유스 홈 36턴 내내 떠 있는 자리예요. 여기서 3D가 돌면 🔥 순간 카드의
   *    프레임을 갉아먹고, 미니게임은 **프레임 위에서 판정**합니다 →
   *    `s` 분포가 내려가고 **곡선이 기기 성능에 의존**해요.
   *    밸런스 사고가 아니라 **밸런스를 잴 수 없게 되는 사고**입니다.
   *
   * 🔒 그래서 `live === false` · `canvas.w2c-canvas === 0`을 **화면마다** 잽니다.
   *    한쪽만 재면 안 돼요 — 컨텍스트를 놓고도 캔버스가 남거나, 그 반대일 수 있습니다.
   *
   * 🔑 그리고 **조립대와 같은 옷인지**를 잽니다. 두 벌로 갈라지면 *"내 선수"*가 깨져요.
   *    같은 색 변수(`--kit-body`)를 읽는지 · 같은 마크업(`.pc-jersey`)인지 둘 다 봅니다. */
  {
    for (const [nm, fn] of [["유스", youthHome], ["프로", proPrep]]) {
      for (const w of [320, 390]) {
        const { p, ctx, errs, glBefore } = await fn(b, { w });
        const k = await hudKit(p);
        await p.screenshot({ path: `${OUT}/w2-hudkit-${nm}-${w}.png` });

        ck(k.has && k.hasJersey, `[H/${nm}/${w}] 👕 HUD에 유니폼이 있다`, k.screen);
        /* 🔴🔴 여기가 이 절의 이유입니다 — 그리고 **자물쇠가 셋**인 이유가 있어요.
         * 캔버스만 세면 3D가 실패했을 때 초록불이 됩니다(실제로 그렇게 속았어요 · GL_SPY 주석). */
        ck(k.glReq === glBefore,
          `[H/${nm}/${w}] 🔴 HUD 화면에서 **WebGL을 한 번도 요청하지 않는다**`,
          `요청 ${glBefore} → ${k.glReq}`);
        ck(k.mark === "",
          `[H/${nm}/${w}] 🔴 char3d.js가 HUD 유니폼에 **손댄 흔적이 없다**`, `class 표식 "${k.mark}"`);
        ck(k.live === false && k.glCanvas === 0,
          `[H/${nm}/${w}] HUD에 3D 캔버스가 없다`, `live=${k.live} 3D캔버스=${k.glCanvas}`);
        ck(k.no && /^[0-9]+$/.test(k.no),
          `[H/${nm}/${w}] 🔢 등번호가 글자로 읽힌다`, `"${k.no}"`);
        /* ⚠️ 안 읽히는 글자를 넣으면 정보가 아니라 얼룩입니다 — 10px이 바닥선이에요 */
        ck(k.noPx >= 10, `[H/${nm}/${w}] 🔢 번호가 읽을 만한 크기 (≥10px)`, `${k.noPx}px`);
        ck(!!k.label, `[H/${nm}/${w}] ♿ 스크린리더가 읽을 이름이 붙어 있다`, k.label);
        /* 🔑 **조립대와 같은 옷** — 같은 색 변수를 읽습니다 (팀 색이 생기면 같이 갑니다) */
        ck(!!k.rootKit && k.bodyColor === "rgb(234, 240, 255)",
          `[H/${nm}/${w}] 🎨 조립대와 **같은 --kit-* 를 읽는다**`, `:root --kit-body=${k.rootKit} · 실제 ${k.bodyColor}`);
        ck(k.overflow <= 0 || nm === "프로" && w === 320,
          `[H/${nm}/${w}] 가로 넘침 없음`, `${k.overflow}px${k.overflow > 0 ? " (⚠️ 유니폼 이전부터 있던 것 — 89번 §6)" : ""}`);
        /* 📱 designer 로드맵의 하단 액션바 자리(.hud-acts)를 **안 건드렸는지** */
        ck(k.actsTop > k.kitBox.h,
          `[H/${nm}/${w}] 📱 유니폼이 하단 액션바 자리를 안 뺏는다 (윗줄에 있다)`,
          `유니폼 ${k.kitBox.w}×${k.kitBox.h} · 액션바 시작 ${k.actsTop}px`);
        ck(errs.length === 0, `[H/${nm}/${w}] 페이지 에러 없음`, errs.join(" | "));
        await ctx.close();
      }
    }
  }

  /* ── H3. ♿ `prefers-reduced-motion`에서도 **정보를 안 잃는가** ──────────
   * 👕 HUD 유니폼은 애니메이션이 하나도 없어서 reduce에서도 그대로여야 합니다.
   * 🔑 *"움직임이 없으니 볼 것도 없다"*가 아니에요 — 움직임을 끄는 규칙이 실수로
   *    `display: none`이나 `opacity: 0`을 잡으면 **번호가 통째로 사라집니다.**
   *    (조립대에서 실제로 `animation: none`이 `both`의 시작 상태에 갇힌 적이 있어요) */
  {
    for (const [nm, fn] of [["유스", youthHome], ["프로", proPrep]]) {
      const { p, ctx, glBefore } = await fn(b, { w: 390, rm: true });
      const k = await hudKit(p);
      const vis = await p.evaluate(() => {
        const j = document.querySelector(".screen.active .w2-hudkit .pc-jersey");
        if (!j) return null;
        const cs = getComputedStyle(j), no = j.querySelector(".j-no");
        const cn = no && getComputedStyle(no);
        const r = no && no.getBoundingClientRect();
        return { disp: cs.display, op: cs.opacity, noOp: cn && cn.opacity, noDisp: cn && cn.display,
          noW: r && +r.width.toFixed(1), noH: r && +r.height.toFixed(1) };
      });
      ck(vis && vis.disp !== "none" && vis.op === "1" && vis.noOp === "1" && vis.noDisp !== "none" && vis.noH > 0,
        `[H3/${nm}] ♿ reduce에서도 👕 유니폼과 🔢 번호가 그대로 보인다`, JSON.stringify(vis));
      ck(k.glReq === glBefore, `[H3/${nm}] ♿ reduce에서도 WebGL을 요청하지 않는다`, `요청 ${glBefore} → ${k.glReq}`);
      await p.screenshot({ path: `${OUT}/w2-hudkit-${nm}-390-reduce.png` });
      await ctx.close();
    }
  }

  /* ── H2. 🔥 **순간 카드가 도는 화면** — HUD도 3D도 없어야 합니다 ────────
   * 🔴 designer가 못박은 자리예요: *"순간 카드가 도는 동안 3D를 렌더하지 않습니다."*
   *    유니폼을 HUD에 붙였으니 **그게 경기 화면까지 따라오지 않았는지**를 재야 합니다. */
  {
    const { p, ctx, errs, glBefore } = await proPrep(b, { w: 390 });
    /* ⚽ 경기하러 가기 — 실제 버튼으로 갑니다 */
    await p.click("#pro-actions .go-game");
    await p.waitForTimeout(2400);
    const st = await p.evaluate(() => {
      const act = document.querySelector(".screen.active");
      return {
        screen: act && act.id,
        hudInScreen: !!(act && act.querySelector(".hud")),
        kitInScreen: !!(act && act.querySelector(".w2-hudkit")),
        glReq: window.__glReq,
        live: !!(window.W2Char && window.W2Char.live),
        glCanvas: document.querySelectorAll("canvas.w2c-canvas").length,
        cards: document.querySelectorAll("#stage-card .w2-card, #stage-card > *").length,
      };
    });
    ck(st.screen === "screen-stage", `[H2] ⚽ 경기 화면에 도달`, st.screen);
    ck(st.kitInScreen === false && st.hudInScreen === false,
      `[H2] 🔥 순간 카드가 도는 화면에는 **HUD도 유니폼도 없다**`, JSON.stringify(st));
    ck(st.glReq === glBefore && st.live === false && st.glCanvas === 0,
      `[H2] 🔴 순간 카드가 도는 동안 **WebGL을 요청하지도 않는다**`,
      `요청 ${glBefore} → ${st.glReq} · live=${st.live} 3D캔버스=${st.glCanvas}`);

    /* ⏱️ **프레임을 실제로 셉니다** — "안 돌 것 같다"가 아니라 재서 적습니다.
     * ⚠️ 헤드리스 크로미움의 절대 fps는 실기기와 다릅니다. 그래서 **문턱을 손으로 적지 않고**
     *    조립대(3D가 도는 판)와 **견줍니다** — 경기 화면이 조립대보다 느리면 뭔가 도는 거예요. */
    const fps = await p.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else res(n); };
      requestAnimationFrame(tick);
    }));
    ck(fps >= 45, `[H2] ⏱️ 순간 카드 화면이 프레임을 지킨다`, `${fps} frames/s (헤드리스 기준)`);
    ck(errs.length === 0, `[H2] 페이지 에러 없음`, errs.join(" | "));
    await ctx.close();
  }

  /* ── F. 화면을 떠나면 정말 멈추고 놓는가 ────────────────────────────
   * 🔴 여기가 밸런스와 맞닿은 자리예요. 3D가 뒤에서 계속 돌면 🔥 순간 카드의
   *    프레임을 먹고, 미니게임은 **프레임 위에서 판정**합니다. */
  {
    const { p, ctx } = await bench(b, {});
    ck(await p.evaluate(() => window.W2Char.live), `[F] 조립대에서는 3D가 살아 있다`);
    await p.click("#btn-prospect-start");
    await p.waitForTimeout(400);
    const after = await p.evaluate(() => ({ live: window.W2Char.live, probe: window.W2Char.probe(),
      canvases: document.querySelectorAll("canvas.w2c-canvas").length }));
    ck(!after.live && after.probe === null && after.canvases === 0,
      `[F] 「이 선수로 시작」을 누르면 컨텍스트를 놓는다`, JSON.stringify(after));
    await ctx.close();
  }
  {
    const { p, ctx } = await bench(b, {});
    /* 화면을 떠나면(`show()`가 display:none) IntersectionObserver가 멈춥니다 */
    await p.evaluate(() => { const s = document.getElementById("screen-prospect"); s.classList.remove("active"); s.style.display = "none"; });
    await p.waitForTimeout(500);
    const st = await p.evaluate(() => window.W2Char.probe());
    ck(st && st.paused === true, `[F] 무대가 화면 밖이면 루프가 멈춘다`, JSON.stringify(st && { paused: st.paused }));
    await ctx.close();
  }


  /* ── T. 🏫 학교 3단계 — **무대가 커지는가** ──────────────────────────
   * 🔴 이 절이 있는 이유: 이 아크는 **능력치가 안 자랍니다.** 「1년이 지났다」를
   *    말하는 건 화면뿐이라, 세 단계가 같은 크기면 3단계가 화면에 없는 거예요.
   * ⚠️ **재는 것은 기하입니다** — 「자란 것으로 읽히나」는 못 잽니다(실기기 목록으로).
   *    여기서 잡는 건 *"무대가 실제로는 안 커져 있는데 커졌다고 적는 것"*입니다. */
  for (const w of [390, 320]) for (const rm of [false, true]) {
    const tag = `T/${w}${rm ? "/reduce" : ""}`;
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2,
      reducedMotion: rm ? "reduce" : "no-preference" });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e.message)));
    await p.goto("http://127.0.0.1:8731/beta/winger2/index.html", { waitUntil: "networkidle" });
    await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await p.reload({ waitUntil: "networkidle" });
    const read = () => p.evaluate(() => {
      const scr = document.getElementById("screen-town");
      const pl = document.getElementById("town-place");
      const cs = getComputedStyle(pl);
      const be = getComputedStyle(pl, "::before"), af = getComputedStyle(pl, "::after");
      /* 🖼️ 배경 「층」을 셉니다 — 괄호 안의 콤마는 층 구분이 아니에요 */
      const layers = (v) => { let d = 0, n = 1; for (const c of v) { if (c === "(") d++; else if (c === ")") d--; else if (c === "," && d === 0) n++; } return v === "none" ? 0 : n; };
      const box = pl.getBoundingClientRect();
      const btn = document.getElementById("btn-town-next");
      const bb = btn && !btn.classList.contains("hidden") ? btn.getBoundingClientRect() : null;
      return {
        stage: scr.dataset.stage,
        band: parseFloat(cs.paddingTop),
        sky: parseFloat(be.height), ground: parseFloat(af.height),
        skyLayers: layers(be.backgroundImage), groundLayers: layers(af.backgroundImage),
        title: parseFloat(getComputedStyle(document.getElementById("town-title")).fontSize),
        atDisplay: getComputedStyle(document.querySelector(".town-place-at")).display,
        sepDisplay: getComputedStyle(document.querySelector(".town-sep")).display,
        headText: (document.querySelector(".town-head") || {}).textContent || "",
        placeW: Math.round(box.width),
        over: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        btnH: bb ? Math.round(bb.height) : null,
        dotH: Math.round((document.querySelector(".town-dot") || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height),
      };
    });
    const seen = {};
    for (const st of ["town:e", "town:m", "town:h"]) {
      await walk(p, { stop: st });
      const r = await read();
      seen[r.stage] = r;
      ck(r.over <= 0, `[${tag}/${r.stage}] 가로 넘침 없음`, `${r.over}px`);
      ck(r.dotH >= 24, `[${tag}/${r.stage}] 🔘 진행 칩이 이모지를 담는 크기`, `${r.dotH}px`);
      ck(r.atDisplay === "block" && r.sepDisplay === "none",
        `[${tag}/${r.stage}] 📍 장소는 제 줄에 · 구분자는 안 보임`, `${r.atDisplay} / ${r.sepDisplay}`);
      ck(r.headText.length > 5, `[${tag}/${r.stage}] 머리글이 서 있다`, r.headText);
      /* 🔄 한 판 안에서 세 단계를 다 보려면 다시 걸어야 해요 — 세이브를 비우고 처음부터 */
      await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
      await p.reload({ waitUntil: "networkidle" });
    }
    const [e, m, h] = ["e", "m", "h"].map((k) => seen[k]);
    ck(e.band < m.band && m.band < h.band,
      `[${tag}] 🔴 **무대 띠가 단계마다 커진다**`, `${e.band} → ${m.band} → ${h.band}px`);
    ck(e.sky < m.sky && m.sky < h.sky,
      `[${tag}] 🏟️ 하늘(관중 자리)이 넓어진다`, `${e.sky} → ${m.sky} → ${h.sky}px`);
    ck(e.skyLayers < m.skyLayers && m.skyLayers < h.skyLayers,
      `[${tag}] 🏟️ 무대에 놓인 것이 늘어난다 (배경 층 수)`, `${e.skyLayers} → ${m.skyLayers} → ${h.skyLayers}`);
    ck(e.title <= m.title && m.title < h.title,
      `[${tag}] 🏫 제목도 같이 자란다`, `${e.title} → ${m.title} → ${h.title}px`);
    ck(e.ground === m.ground && m.ground === h.ground,
      `[${tag}] 🌱 바닥 두께는 그대로 (커지는 건 무대지 바닥이 아님)`, `${e.ground}px`);
    ck(errs.length === 0, `[${tag}] 페이지 에러 없음`, errs.join(" | "));
    await ctx.close();
  }

  /* ── T2. 🎨 판정 색 — **다섯을 따로 세워 잽니다** ────────────────────
   * 🔴 실제 화면에는 두세 상태밖에 안 떠서, 그대로는 **뒤집혀 있어도 안 보입니다.**
   *    `.offer-t*`에서 실제로 그랬어요 — 중립 t2가 그 위 t3보다 **밝았습니다**
   *    (색상을 섞으면 밝기 순서가 뒤집힙니다). 그래서 다섯을 한 줄에 세워 재요.
   * 🔴 그리고 `.town-dot`의 기본 상태는 `filter: grayscale(.7) opacity(.5)`라
   *    **계산된 스타일로는 못 봅니다** — 필터는 픽셀에만 있어요. 그래서 찍어서 셉니다.
   *    (크로미움이 자기 스크린샷을 스스로 디코드하게 시킵니다 — 새 의존성 없이) */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto("http://127.0.0.1:8731/beta/winger2/index.html", { waitUntil: "networkidle" });
    /* 📸 찍은 그림을 브라우저가 다시 읽어 평균 색을 냅니다 */
    const avg = async (box) => {
      const buf = await p.screenshot({ clip: box });
      const q = await ctx.newPage();
      const c = await q.evaluate(async (u) => await new Promise((res) => {
        const im = new Image();
        im.onload = () => {
          const cv = document.createElement("canvas");
          cv.width = im.width; cv.height = im.height;
          cv.getContext("2d").drawImage(im, 0, 0);
          const d = cv.getContext("2d").getImageData(0, 0, im.width, im.height).data;
          let r = 0, g = 0, bl = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
          res([Math.round(r / n), Math.round(g / n), Math.round(bl / n)]);
        };
        im.src = u;
      }), "data:image/png;base64," + buf.toString("base64"));
      await q.close();
      return c;
    };
    /* 상대 휘도 (ITU-R BT.601 가중 — 사람 눈이 초록을 가장 밝게 봅니다) */
    const lum = (c) => Math.round((0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) * 10) / 10;
    const rgb = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number);

    for (const wc of [false, true]) {
      const nm = wc ? "🌏대회" : "평상시";
      /* 🏟️ 제안 등급 다섯 — 테두리 색의 밝기가 **단조 증가**여야 합니다 */
      const tiers = await p.evaluate((on) => {
        document.body.classList.toggle("wc-mode", on);
        const old = document.getElementById("__rack"); if (old) old.remove();
        const d = document.createElement("div");
        d.id = "__rack";
        d.style.cssText = "position:fixed;left:0;top:0;z-index:99999;display:flex;gap:6px;background:var(--bg);padding:6px";
        d.innerHTML = [0, 1, 2, 3, 4].map((t) =>
          `<div class="card offer-t${t}" style="width:60px;height:40px"></div>`).join("");
        document.body.appendChild(d);
        return [0, 1, 2, 3, 4].map((t) =>
          getComputedStyle(d.querySelector(`.offer-t${t}`)).borderTopColor);
      }, wc);
      const L = tiers.map((c) => lum(rgb(c)));
      ck(L.every((v, i) => i === 0 || v > L[i - 1]),
        `[T2/${nm}] 🔴 **제안 등급 t0→t4 밝기가 단조 증가**`, L.join(" → "));
      /* 🔘 진행 칩 다섯 — 기본 / now / hit / mid / bad */
      const boxes = await p.evaluate((on) => {
        document.body.classList.toggle("wc-mode", on);
        const old = document.getElementById("__rack2"); if (old) old.remove();
        const d = document.createElement("div");
        d.id = "__rack2";
        d.style.cssText = "position:fixed;left:0;top:120px;z-index:99999;display:flex;gap:10px;background:var(--bg);padding:10px";
        /* 🔒 이모지를 빼고 세웁니다 — 글자가 섞이면 평균이 글자 색을 잽니다.
         *    (이모지가 칩 안에 담기는지는 T절이 실제 화면에서 따로 봐요) */
        d.innerHTML = ["", "now", "hit", "mid", "bad"].map((k) =>
          `<span class="town-dot ${k}"></span>`).join("");
        document.body.appendChild(d);
        return [...d.children].map((el) => {
          const r = el.getBoundingClientRect();
          /* 오른쪽 아래 표식(✓··✕)을 피해 안쪽만 잽니다 */
          return { x: r.x + 6, y: r.y + 6, width: r.width - 14, height: r.height - 14 };
        });
      }, wc);
      const names = ["기본", "now", "hit", "mid", "bad"];
      const cols = [];
      for (const bx of boxes) cols.push(await avg(bx));
      const CL = cols.map(lum);
      console.log(`   [T2/${nm}] 🔘 ${names.map((n, i) => `${n} ${CL[i]}(${cols[i].join(",")})`).join(" · ")}`);
      ck(CL.slice(1).every((v) => v > CL[0]),
        `[T2/${nm}] 🔘 **아직 안 뛴 판이 가장 어둡다** (물러나 있어야 하는 쪽)`, CL.join(" / "));
      const [, , hit, mid, bad] = cols;
      ck(hit[1] > hit[0] && hit[1] > hit[2],
        `[T2/${nm}] ✅ perfect(hit)는 **초록 쪽**`, hit.join(","));
      ck(bad[0] > bad[1] && bad[0] > bad[2],
        `[T2/${nm}] ❌ miss(bad)는 **붉은 쪽**`, bad.join(","));
      ck(mid[0] > mid[2] && mid[1] > mid[2] && mid[0] >= mid[1],
        `[T2/${nm}] 🙂 ok(mid)는 **가운데(앰버)**`, mid.join(","));
      const far = (a, c) => Math.max(Math.abs(a[0] - c[0]), Math.abs(a[1] - c[1]), Math.abs(a[2] - c[2]));
      ck(far(hit, mid) >= 12 && far(mid, bad) >= 12 && far(hit, bad) >= 12,
        `[T2/${nm}] 🎨 셋이 서로 구분된다`, `hit↔mid ${far(hit, mid)} · mid↔bad ${far(mid, bad)} · hit↔bad ${far(hit, bad)}`);
    }
    await ctx.close();
  }

  /* ── O. 📨 제안 화면의 **세 얼굴** ─────────────────────────────────
   *   📨 …이 끝났어요(조기) · 🏟️ 입단 제안(최종) · 🤝 입단 확정(승낙 뒤)
   * 🔴 한 화면이 세 몫을 하면 **「끄는 쪽」을 빼먹는 게 단골 버그**예요. 그래서
   *    얼굴마다 「무엇이 서 있고 무엇이 꺼져 있나」를 통째로 읽습니다. */
  const face = (p) => p.evaluate(() => {
    const $ = (id) => document.getElementById(id);
    const list = $("agency-list"), note = $("agency-note"), cont = $("btn-early-next");
    const vis = (el) => !!el && !el.classList.contains("hidden") && getComputedStyle(el).display !== "none";
    const cards = [...list.querySelectorAll(".card")];
    const cs = cont && getComputedStyle(cont);
    const lb = list.getBoundingClientRect();
    return {
      title: ($("agency-title") || {}).textContent || "",
      titlePx: parseFloat(getComputedStyle($("agency-title")).fontSize),
      n: cards.length,
      early: cards.filter((c) => c.classList.contains("offer-early")).length,
      grade: list.querySelectorAll(".offer-grade").length,
      spot: list.querySelectorAll(".offer-spot").length,
      full: cards.every((c) => Math.round(c.getBoundingClientRect().width) >= Math.round(lb.width) - 1),
      takes: [...list.querySelectorAll(".offer-take")].map((t) => Math.round(t.getBoundingClientRect().height)),
      noteVis: vis(note), noteLines: (note || { children: [] }).children.length,
      contVis: vis(cont), contH: cont ? Math.round(cont.getBoundingClientRect().height) : 0,
      contBg: cs ? cs.backgroundImage !== "none" || cs.backgroundColor !== "rgba(0, 0, 0, 0)" : false,
      contBorder: cs ? cs.borderTopWidth : "",
      emptyBox: list.children.length === 0 ? Math.round(list.getBoundingClientRect().height) : null,
      over: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      /* 🃏 카드가 서로 안 겹치는가 — 2열 격자에 전폭 카드를 섞으면 여기가 깨집니다 */
      overlap: cards.some((a, i) => cards.some((c, j) => {
        if (j <= i) return false;
        const x = a.getBoundingClientRect(), y = c.getBoundingClientRect();
        return x.right > y.left + 1 && y.right > x.left + 1 && x.bottom > y.top + 1 && y.bottom > x.top + 1;
      })),
    };
  });

  for (const w of [390, 320]) for (const rm of [false, true]) {
    const tag = `O/${w}${rm ? "/reduce" : ""}`;
    const ctx = await b.newContext({ viewport: { width: w, height: 844 },
      reducedMotion: rm ? "reduce" : "no-preference" });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e.message)));
    await p.goto("http://127.0.0.1:8731/beta/winger2/index.html", { waitUntil: "networkidle" });
    /* ♻️ 얼굴 하나를 볼 때마다 **처음부터 다시 걸어갑니다** — 세이브를 비우고 새로 고침.
     *    한 판에서 이어 걸으면 앞 얼굴이 만든 상태가 다음 얼굴에 섞여요. */
    const fresh = async () => {
      await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
      await p.reload({ waitUntil: "networkidle" });
    };
    await fresh();

    /* 얼굴 ① 📨 조기 (🏫 초등 뒤) — 🇰🇷 홈이 **항상** 손을 들어서 카드가 최소 한 장입니다 */
    await walk(p, { stop: "early:e" });
    const f1 = await face(p);
    console.log(`   [${tag}] ① ${f1.title} · 카드 ${f1.n}(조기 ${f1.early}) · 안내 ${f1.noteVis}`);
    ck(f1.title.indexOf("📨") === 0, `[${tag}] ① 제목이 📨 얼굴`, f1.title);
    ck(f1.n > 0 && f1.early === f1.n, `[${tag}] ① 카드가 전부 조기 몸`, `${f1.early}/${f1.n}`);
    ck(f1.grade === 0 && f1.spot === 0,
      `[${tag}] 🔴 ① **⭐도 📣 주목 ×도 없다** (조기 등급은 아무 데도 안 쓰여요)`, `⭐${f1.grade} 📣${f1.spot}`);
    ck(f1.full, `[${tag}] ① 조기 카드가 전폭 (2열에 반쪽으로 안 섬)`);
    ck(!f1.overlap, `[${tag}] ① 카드끼리 안 겹침`);
    ck(f1.takes.length === f1.n && f1.takes.every((h) => h >= 44),
      `[${tag}] ① 🤝 예비 계약 탭 칸 ≥ 44px`, f1.takes.join(","));
    ck(f1.noteVis && f1.noteLines === 2, `[${tag}] ① ℹ️ 안내가 두 줄로 선다`, `${f1.noteLines}줄`);
    ck(f1.contVis && f1.contH >= 44, `[${tag}] ① 🙅 거절 탭 칸 ≥ 44px`, `${f1.contH}px`);
    /* 🔑 카드가 있는 판에서 거절 버튼이 **한 칸 내려섰나** — 테두리가 그 표식이에요
     *    (원색 버튼은 테두리가 0px, 내려선 쪽은 2px). 선택자가 죽으면 여기서 잡힙니다. */
    ck(f1.contBorder === "2px",
      `[${tag}] ① 🙅 거절은 **한 칸 내려선 모습** (결정은 카드 안 🤝에 있어요)`, f1.contBorder);
    ck(f1.over <= 0, `[${tag}] ① 가로 넘침 없음`, `${f1.over}px`);

    /* 얼굴 ①′ 📭 0곳 — **건너뛰지 않기로 한 화면**이라 허전하면 「고장」으로 읽힙니다 */
    await fresh();
    await walk(p, { stop: "early:m" });
    const f0 = await face(p);
    console.log(`   [${tag}] ①′ ${f0.title} · 카드 ${f0.n} · 빈 상자 ${f0.emptyBox} · 안내 ${f0.noteVis}`);
    if (f0.n === 0) {
      ck(f0.emptyBox >= 60, `[${tag}] 📭 0곳에 **빈 자리가 그려진다** (화면이 안 무너짐)`, `${f0.emptyBox}px`);
      ck(!f0.noteVis, `[${tag}] 📭 0곳에는 승낙/거절 안내가 꺼져 있다`);
      ck(f0.contVis && f0.contH >= 44, `[${tag}] 📭 유일한 조작이 서 있다`, `${f0.contH}px`);
      ck(f0.contBg && f0.contBorder === "0px",
        `[${tag}] 📭 그 조작은 **원색 그대로** (이 판의 유일한 길)`, f0.contBorder);
    } else {
      ck(true, `[${tag}] 🟡 이 시드에서는 중등 0곳이 안 떴어요 — 카드 ${f0.n}장`, f0.title);
    }

    /* 얼굴 ② 🏟️ 최종 제안 — **5곳이 전부 옵니다.** 여기엔 ⭐도 📣 주목 ×도 **있어야** 해요 */
    await fresh();
    await walk(p, { stop: "agency" });
    const f2 = await face(p);
    console.log(`   [${tag}] ② ${f2.title} · 카드 ${f2.n} · ⭐${f2.grade} 📣${f2.spot}`);
    ck(f2.title.indexOf("🏟") === 0, `[${tag}] ② 제목이 🏟️ 얼굴`, f2.title);
    ck(f2.n === 5 && f2.early === 0, `[${tag}] ② 5곳이 전부, 조기 몸은 하나도 없다`, `${f2.n}장`);
    ck(f2.grade === 5 && f2.spot === 5, `[${tag}] ② 최종에는 ⭐와 📣 주목 ×가 있다`, `⭐${f2.grade} 📣${f2.spot}`);
    ck(!f2.noteVis && !f2.contVis, `[${tag}] 🔴 ② 조기의 안내·거절 버튼이 **꺼져 있다**`,
      `note ${f2.noteVis} · cont ${f2.contVis}`);
    ck(!f2.overlap && f2.over <= 0, `[${tag}] ② 겹침·넘침 없음`, `${f2.over}px`);

    /* 얼굴 ③ 🤝 입단 확정 — 🤝 예비 계약 → 아크 끝 → 🧬 조립대 **취소**의 착지점 */
    await fresh();
    await walk(p, { stop: "early:e" });
    await p.click("#agency-list .offer-take");
    await p.waitForTimeout(160);
    let land = "";
    for (let g = 0; g < 40; g++) {
      land = await p.evaluate(() => (document.querySelector(".screen.active") || {}).id || "");
      if (land === "screen-prospect") break;
      if (land === "screen-town") await p.click("#btn-town-next");
      else if (land === "screen-agency") await p.click("#btn-early-next");
      else if (land === "screen-position") await p.click("#position-list .card[data-pos=\"wg\"]");
      else break;
      await p.waitForTimeout(140);
    }
    ck(land === "screen-prospect",
      `[${tag}] 🤝 승낙 판은 아크가 끝나면 🏟️ 최종을 안 거치고 🧬 조립대로`, land);
    await p.click("#btn-back-prospect");           // 🧬 취소
    await p.waitForTimeout(200);
    const f3 = await face(p);
    console.log(`   [${tag}] ③ ${f3.title} · 카드 ${f3.n} · 폭 ${f3.full}`);
    ck(f3.title.indexOf("🤝") === 0, `[${tag}] ③ 제목이 🤝 얼굴 (「제안」이 아니라 「확정」)`, f3.title);
    ck(f3.n === 1 && f3.early === 0, `[${tag}] ③ 도장을 찍은 그 한 곳만 선다`, `${f3.n}장`);
    ck(f3.full, `[${tag}] 🔴 ③ 그 한 장이 **전폭** (2열 격자에 반쪽으로 서면 잘린 화면으로 읽혀요)`);
    ck(!f3.noteVis && !f3.contVis, `[${tag}] ③ 조기의 안내·거절 버튼이 꺼져 있다`);
    ck(f3.over <= 0, `[${tag}] ③ 가로 넘침 없음`, `${f3.over}px`);
    ck(errs.length === 0, `[${tag}] 페이지 에러 없음`, errs.join(" | "));
    await ctx.close();
  }

  console.log(fail ? `\n❌ ${fail}건 어긋남` : `\n✅ 전부 통과`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
