/* ⚽ 더 윙어 II — 👕 3D 유니폼 뷰어 **렌더 검증** (헤드리스 크로미움)
 *
 * 🖥️ jsdom에는 렌더 엔진도 WebGL도 없어서 `tests/winger2/*`는 이 화면을 못 봅니다.
 *    (그건 사고가 아니라 설계예요 — 검사에서 3D가 뜨면 12종이 통째로 죽습니다.)
 *    그래서 **진짜 크로미움으로 띄워서 좌표를 잽니다.**
 *
 * 🔴 이 파일이 있는 이유 — 예전에 🦶 주발 표시의 **색이 판정과 반대쪽**이던 버그를
 *    렌더 없이는 못 봤어요. *"안 보이는 것"*이 아니라 **거짓말을 하고 있던 것**입니다.
 *
 *    👕 유니폼으로 바꾸면서 그 자리가 **뒤집혔습니다.** 캐릭터판은 *"공이 주발 쪽인가"*를
 *    쟀는데, 유니폼은 **돌아가서 안정된 좌우가 없어요.** 그래서 이제 A절이 재는 건
 *    ***"좌우로 뜻을 만들지 않았다"*** 입니다 — 왼발판과 오른발판에서 공의 x가 **같아야**
 *    합니다. 검사가 지키는 것이 「올바른 방향」에서 **「방향을 안 쓴다」로 바뀌었어요.**
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

/* 🇰🇷 **한글 세 글자**가 등판에 들어가는지가 이번 판의 핵심 질문이에요.
 * 참고 이미지는 알파벳(`APELLIDO`)이고, 우리 이름은 한글입니다. */
const KO3 = "김하늘";
const KO_LONG = "남궁도영훈";     // 다섯 글자 — 줄어들어야 하는 쪽

async function bench(b, { w = 390, rm = false, foot = "R", gl = true, name = KO3, shot = null } = {}) {
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
  /* 🇰🇷 이름도 **실제 입력칸에 쳐서** 넣습니다 — `S.name`을 심으면 화면을 안 거쳐요 */
  await p.fill("#input-name", name);
  await go("#btn-name-next");
  await go("#agency-list button");
  await go("#position-list .card[data-pos]");
  await p.waitForTimeout(gl ? 2600 : 800);
  if (shot) { await p.screenshot({ path: `${OUT}/${shot}.png` }); await p.screenshot({ path: `${OUT}/${shot}-full.png`, fullPage: true }); }
  return { p, ctx, errs };
}

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

  /* ── A. 🦶 주발 — **좌우로 뜻을 만들지 않았나** ─────────────────────────
   * 🔴 캐릭터판의 A절과 **정반대 방향**을 잽니다. 유니폼은 돌아가서 안정된 좌우가 없어요.
   *    "왼발이면 공이 오른쪽"을 지키면 반 바퀴 뒤에 그게 거짓말이 됩니다. */
  const ballX = {};
  for (const foot of ["L", "R"]) {
    const { p, ctx, errs } = await bench(b, { foot, shot: `w2-jersey-390-foot${foot}` });
    const shownFoot = await p.textContent(".pb-meta");
    const pr = await p.evaluate(() => window.W2Char && window.W2Char.probe());
    ck(!!pr, `[A/${foot}] 👕 유니폼이 실제로 섰다`);
    if (pr) {
      ballX[foot] = pr.ballPct;
      ck(pr.ball.x === 0 && Math.abs(pr.ballPct - 50) <= 6,
        `[A/${foot}] ⚽ 공이 가운데 — 주발을 좌우로 말하지 않는다`, `world.x=${pr.ball.x} 화면 ${pr.ballPct}%`);
      const chip = await p.evaluate(() => {
        const s = document.querySelector(".w2c-stage"), c = document.querySelector(".w2c-foot");
        if (!s || !c) return null;
        const rs = s.getBoundingClientRect(), rc = c.getBoundingClientRect();
        return { pct: +(((rc.x + rc.width / 2 - rs.x) / rs.width) * 100).toFixed(1),
          l: +(((rc.x - rs.x) / rs.width) * 100).toFixed(1), r: +(((rc.right - rs.x) / rs.width) * 100).toFixed(1),
          t: +(((rc.y - rs.y) / rs.height) * 100).toFixed(1), b: +(((rc.bottom - rs.y) / rs.height) * 100).toFixed(1),
          h: +rc.height.toFixed(1), txt: c.textContent.trim() };
      });
      ck(chip && Math.abs(chip.pct - pr.ballPct) <= 20,
        `[A/${foot}] 🦶 칩이 공 옆 (가운데 차이 ≤ 20%p)`, `칩 ${chip && chip.pct}% · 공 ${pr.ballPct}%`);
      /* 🔴 옆에 있는 것과 **덮는 것**은 다릅니다 — 칩이 공을 가리면 주발이 안 보여요. */
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
  /* 🔒 **변이가 잡히는 자리** — 공을 다시 주발 쪽으로 옮기면 여기가 빨간불입니다 */
  ck(ballX.L != null && ballX.L === ballX.R,
    `[A] 🦶 왼발판과 오른발판에서 ⚽ 공의 화면 x가 **같다** (좌우에 뜻이 없음)`, `L ${ballX.L}% · R ${ballX.R}%`);

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

  console.log(fail ? `\n❌ ${fail}건 어긋남` : `\n✅ 전부 통과`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
