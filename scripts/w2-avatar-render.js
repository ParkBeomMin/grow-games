/* ⚽ 더 윙어 II — 🧍 3D 캐릭터 뷰어 **렌더 검증** (헤드리스 크로미움)
 *
 * 🖥️ jsdom에는 렌더 엔진도 WebGL도 없어서 `tests/winger2/*`는 이 화면을 못 봅니다.
 *    (그건 사고가 아니라 설계예요 — 검사에서 3D가 뜨면 12종이 통째로 죽습니다.)
 *    그래서 **진짜 크로미움으로 띄워서 좌표를 잽니다.**
 *
 * 🔴 이 파일이 있는 이유 — 예전에 🦶 주발 표시의 **색이 판정과 반대쪽**이던 버그를
 *    렌더 없이는 못 봤어요. *"안 보이는 것"*이 아니라 **거짓말을 하고 있던 것**입니다.
 *    캐릭터가 우리를 마주 보고 서면 **캐릭터의 왼발이 화면 오른쪽**이라 거울이 한 번 뒤집혀요.
 *    그 자리를 A절이 잽니다.
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

async function bench(b, { w = 390, rm = false, foot = "R", gl = true, shot = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2,
    reducedMotion: rm ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message)));
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
  const go = async (sel) => { await p.click(sel); await p.waitForTimeout(180); };
  await go("#btn-new");
  /* 🦶 주발을 실제 버튼으로 고릅니다 — 값을 심지 않아요 */
  const footSel = `#screen-name [data-foot="${foot}"], #screen-name input[value="${foot}"]`;
  if (await p.locator(footSel).count()) await go(footSel);
  await go("#btn-name-next");
  await go("#agency-list button");
  await go("#position-list .card[data-pos]");
  await p.waitForTimeout(gl ? 2500 : 800);
  if (shot) { await p.screenshot({ path: `${OUT}/${shot}.png` }); await p.screenshot({ path: `${OUT}/${shot}-full.png`, fullPage: true }); }
  return { p, ctx, errs };
}

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

  /* ── A. 🦶 주발 — 공이 그 발 쪽에 있고, 칩이 공 옆에 붙어 있나 ────────── */
  for (const foot of ["L", "R"]) {
    const { p, ctx, errs } = await bench(b, { foot, shot: `w2-avatar-390-foot${foot}` });
    const shownFoot = await p.textContent(".pb-meta");
    const pr = await p.evaluate(() => window.W2Char && window.W2Char.probe());
    ck(!!pr, `[A/${foot}] 3D가 실제로 섰다`);
    if (pr) {
      const wantSign = foot === "L" ? +1 : -1;
      ck(Math.sign(pr.ball.x - 0.26) === wantSign,
        `[A/${foot}] 공이 주발 쪽 (캐릭터 왼발 = 월드 +X)`, `ball.x=${pr.ball.x} root=0.26`);
      const chip = await p.evaluate(() => {
        const s = document.querySelector(".w2c-stage"), c = document.querySelector(".w2c-foot");
        if (!s || !c) return null;
        const rs = s.getBoundingClientRect(), rc = c.getBoundingClientRect();
        return { pct: +(((rc.x + rc.width / 2 - rs.x) / rs.width) * 100).toFixed(1),
          l: +(((rc.x - rs.x) / rs.width) * 100).toFixed(1), r: +(((rc.right - rs.x) / rs.width) * 100).toFixed(1),
          t: +(((rc.y - rs.y) / rs.height) * 100).toFixed(1), b: +(((rc.bottom - rs.y) / rs.height) * 100).toFixed(1),
          txt: c.textContent.trim() };
      });
      ck(chip && Math.abs(chip.pct - pr.ballPct) <= 20,
        `[A/${foot}] 🦶 칩이 공 옆 (가운데 차이 ≤ 20%p)`, `칩 ${chip && chip.pct}% · 공 ${pr.ballPct}%`);
      /* 🔴 옆에 있는 것과 **덮는 것**은 다릅니다 — 칩이 공을 가리면 주발이 안 보여요.
       * 가로만 보면 「공 아래」 배치를 잡을 수 없어서 **네모 두 개로** 겹침을 봅니다. */
      const bl = pr.ballPct - pr.ballW / 2, br2 = pr.ballPct + pr.ballW / 2;
      const noOv = chip && (chip.r <= bl + 0.5 || chip.l >= br2 - 0.5
        || chip.t >= pr.ballBotPct - 0.5 || chip.b <= pr.ballTopPct + 0.5);
      ck(noOv, `[A/${foot}] 🦶 칩이 ⚽ 공을 안 덮는다`,
        `칩 x${chip && chip.l}~${chip && chip.r} y${chip && chip.t}~${chip && chip.b} · 공 x${bl.toFixed(1)}~${br2.toFixed(1)} y${pr.ballTopPct}~${pr.ballBotPct}`);
      ck(chip && chip.l >= 0 && chip.r <= 100 && chip.b <= 100 && chip.t >= 0,
        `[A/${foot}] 🦶 칩이 무대 안에 들어온다`, `x${chip && chip.l}~${chip && chip.r} y${chip && chip.t}~${chip && chip.b}`);
      ck(chip && chip.txt === (foot === "L" ? "🦶 왼발" : "🦶 오른발") && String(shownFoot).indexOf(foot === "L" ? "왼발" : "오른발") >= 0,
        `[A/${foot}] 칩 글자 = 실제 주발`, `${chip && chip.txt} / ${String(shownFoot).trim()}`);
      ck(pr.foot === foot, `[A/${foot}] 3D가 받은 주발이 화면과 같다`, pr.foot);
    }
    ck(errs.length === 0, `[A/${foot}] 페이지 에러 없음`, errs.join(" | "));
    await ctx.close();
  }

  /* ── B. 🎲 굴리면 몸이 바뀌나 · 컨텍스트를 새로 만들지 않나 ───────────── */
  {
    const { p, ctx } = await bench(b, {});
    const snaps = [];
    for (let i = 0; i < 8; i++) {
      snaps.push(await p.evaluate(() => window.W2Char.probe()));
      await p.click("#btn-prospect-reroll");
      await p.waitForTimeout(220);
    }
    /* 💥 **죽음은 초록불도 빨간불도 아닙니다.** 굴리는 도중 3D가 사라지면 `probe()`가
     * null이에요 — 그걸 그대로 읽으면 파일이 그 자리에서 터지고 「실패 1건」으로만 보입니다.
     * (컨텍스트를 매번 새로 만드는 변이에서 실제로 그랬어요 — 상한에 걸려 3D가 죽습니다.) */
    const dead = snaps.filter((x) => !x).length;
    ck(dead === 0, `[B] 🎲를 굴리는 내내 3D가 살아 있다`, `사라진 판 ${dead}/8`);
    const uniq = new Set(snaps.filter(Boolean).map((s) => `${s.torsoRX}|${s.legLen}`)).size;
    ck(uniq >= 7, `[B] 🎲 8번에 체형이 7가지 이상 달라진다`, `${uniq}/8`);
    const last = await p.evaluate(() => window.W2Char.probe());
    ck(last && last.mounts === 1, `[B] 🎲를 굴려도 WebGL 컨텍스트는 하나`, `mounts=${last && last.mounts}`);
    ck(last && last.calls <= 20 && last.tris <= 1400, `[B] 드로우콜·폴리 예산`,
      last ? `calls=${last.calls} tris=${last.tris}` : "3D가 없어요");
    await ctx.close();
  }

  /* ── C. ♿ prefers-reduced-motion — 정지하되 정보를 안 잃는다 ─────────── */
  {
    const { p, ctx } = await bench(b, { rm: true, shot: "w2-avatar-390-reduce" });
    const pr = await p.evaluate(() => window.W2Char.probe());
    ck(pr && pr.reduce === true, `[C] 3D가 reduced-motion을 인지`);
    const a = await p.evaluate(() => { const r = document.querySelector(".w2c-canvas"); return window.W2Char.probe().top; });
    await p.waitForTimeout(700);
    const rot = await p.evaluate(() => ({ y: 0 }));
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
    await ctx.close();
  }

  /* ── D. 폴백 — WebGL이 없으면 CSS 실루엣이 뜬다 ─────────────────────── */
  {
    const { p, ctx, errs } = await bench(b, { gl: false, shot: "w2-avatar-390-fallback" });
    const r = await p.evaluate(() => {
      const st = document.querySelector(".w2c-stage");
      const si = document.querySelector(".pc-silhouette");
      const b = si && si.getBoundingClientRect();
      return { flat: st.classList.contains("is-flat"), is3d: st.classList.contains("is-3d"),
        canvas: !!st.querySelector("canvas"), silh: b ? { w: +b.width.toFixed(0), h: +b.height.toFixed(0) } : null,
        rows: document.querySelectorAll(".pcg-row").length,
        chip: !!document.querySelector(".w2c-foot") };
    });
    ck(!r.canvas && !r.is3d, `[D] WebGL이 없으면 캔버스를 안 만든다`);
    ck(r.silh && r.silh.w > 100 && r.silh.h > 120, `[D] CSS 실루엣이 무대를 채운다`, JSON.stringify(r.silh));
    ck(r.rows === 6 && r.chip, `[D] 정보(등급 6줄 · 🦶 칩)를 하나도 안 잃는다`);
    ck(errs.length === 0, `[D] 페이지 에러 없음`, errs.join(" | "));
    await ctx.close();
  }

  /* ── E. 폭 격자 — 가로 넘침 · 겹침 · 탭 칸 ──────────────────────────── */
  for (const w of [320, 390]) {
    const { p, ctx } = await bench(b, { w, shot: `w2-avatar-${w}` });
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
        toolsY: +q(".pc-tools").top.toFixed(0), stageY: +stage.top.toFixed(0) };
    });
    ck(r.over <= 0, `[E/${w}] 가로 넘침 없음`, `${r.over}px`);
    ck(r.taps.every((t) => t.h >= 44), `[E/${w}] 탭 칸 ≥ 44px`, JSON.stringify(r.taps.map((t) => t.h)));
    ck(r.nameInStage && !r.nameChipOverlap, `[E/${w}] 이름표가 무대 안 · 🦶 칩과 안 겹침`);
    ck(r.foldGrades <= 844, `[E/${w}] 🧍 무대 + 🌱 등급 여섯 줄이 접히는 선 위`, `등급 끝 ${r.foldGrades}px`);
    /* 위는 무대가 고정, 아래는 🎲가 고정 — 스크롤 중에도 둘이 한 화면에 있어야 합니다 */
    await p.evaluate(() => window.scrollTo(0, 420));
    await p.waitForTimeout(120);
    const s2 = await p.evaluate(() => {
      const st = document.querySelector(".w2c-stage").getBoundingClientRect();
      const tl = document.querySelector(".pc-tools").getBoundingClientRect();
      return { stageTop: +st.top.toFixed(0), stageBot: +st.bottom.toFixed(0), toolsTop: +tl.top.toFixed(0), toolsBot: +tl.bottom.toFixed(0) };
    });
    ck(s2.stageBot > 40 && s2.toolsTop < 844 && s2.stageBot < s2.toolsTop,
      `[E/${w}] 420px 스크롤해도 🧍 무대와 🎲가 함께 보인다`, JSON.stringify(s2));
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
    /* 유스 홈에서 rAF가 3D 때문에 도는지 — 프레임 콜백이 3D를 안 그려야 합니다 */
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

  console.log(fail ? `\n❌ ${fail}건 어긋남` : `\n✅ 전부 통과`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
