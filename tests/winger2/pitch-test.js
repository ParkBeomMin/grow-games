/* 🟩 ⚽ 더 윙어 II — **축구판이 카드를 따라가는가** (`beta/winger2/match-scene.js` + `style.css`)
 *
 * 🔴 **이 셋은 렌더가 아니었으면 절대 못 봤을 흠입니다.** director가 폭 4벌 × 모션 2벌로
 *    54개 카드 상태를 실제로 그려서 잡았어요 (140번). 잡은 뒤 고쳤는데 **검사가 0건**이라,
 *    되돌려도 아무도 안 웁니다. 그 자리를 메웁니다.
 *
 *   ① 🧤 **골키퍼가 실점 카드마다 판 밖으로 사라졌습니다**
 *      `gk` x 7% + `push-h` −9% = **−2%** → `overflow:hidden`이 통째로 잘랐어요.
 *      🔴 하필 **키퍼가 가장 필요한 순간에만** 사라지는 그림이었습니다.
 *   ② 🧡 **「나」가 우리 편과 같은 초록이었습니다**
 *      `.w2-dot.me`(0,2,0)가 `.w2-side.home .w2-dot`(0,2,1)에 **먹혔어요.**
 *      🔴 **소스만 읽으면 앰버라고 적혀 있습니다** — 「판정색이 거짓말」의 다섯 번째예요.
 *   ③ ⚽ **판정이 끝났는데 공이 안 움직였습니다**
 *      `closeMoment`에 `setPitch`가 빠져, 화면엔 「실점」이 떴는데 공은 **상대 진영 71%**에.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 *   · 🟩 판은 `mount()`에서 **한 번만** 그려지고, 카드마다 바뀌는 것은
 *     **클래스 둘(`push-a`/`push-h`)과 공의 `transform` 하나**뿐입니다
 *   · 🧍 점의 자리는 **인라인 `left`/`top`(%)**, 팀의 전진·후퇴는 **CSS의 `translateX(%)`**.
 *     🔑 **둘이 한 쌍입니다** — 한쪽만 보면 ①이 안 보여요. 이 파일이 **양쪽을 같이** 엽니다
 *   · ⚽ 공은 `.w2-side` **밖**에 있어 밀림을 안 탑니다 (그래서 공은 밀림을 안 더해요)
 *   · 📦 판이 `overflow: hidden`이라 **밖으로 나간 것은 그냥 사라집니다** — 경고가 없어요
 *
 * 🔴 **판정이 바뀌면 뒤집히는 문장**
 *   · 「점을 판 밖으로 반쯤 걸치게 두자」는 연출 판정이 나오면 **P-1이 옛 계약**입니다
 *   · 🧡 나를 **색이 아니라 다른 것으로** 가르기로 하면 **P-2**가 옛 계약이에요
 *     (그때도 P-2b 「색을 빼도 갈린다」는 그대로 살아야 합니다)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 것
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 `eval` 안 씀 — 표는 `new Function(...)` + `return`으로 뜯습니다
 *   ② **자리·크기·밀림은 소스에서** 뜯고(`산식`), **판 크기와 「안에 들어온다」는
 *      여기 박습니다**(`문턱`). 방향이 반대예요
 *   ③ **게임 입구를 통해** — 표를 베껴 읽지 않고 `W2Scene.mount → openMoment → closeMoment`를
 *      실제로 굴려 그때 화면에 적힌 값을 읽습니다
 *   ④ **CSS는 jsdom의 진짜 캐스케이드**로 잽니다 — 특이도·소스 순서가 그대로 돌아요.
 *      🔑 `var(--x)`는 jsdom이 못 풀어서 **이름마다 다른 색**으로 갈아 넣습니다
 *         (색을 바꾸는 게 아니라 **「어느 변수가 이겼나」**를 읽으려는 치환이에요)
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저**, 그리고 **변이 전에 기준선이 초록불인지** 찍습니다
 *
 * 🚧 **여기서 못 보는 것 — 보고서 §검증 불가입니다**
 *     jsdom에는 레이아웃이 없어서 P-1은 **퍼센트 → 픽셀 산수 모델**이에요. 실제로 잘렸는지는
 *     여전히 **렌더로만** 압니다(director 140번). 이 검사가 지키는 것은
 *     *"자리와 밀림이 서로 어긋나지 않는다"*는 **두 파일 사이의 계약**입니다.
 *     🔴 그리고 **색이 예쁜지·움직임이 자연스러운지·0.75초가 카드 간격과 맞는지**는 못 봅니다.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { pageMutsOK, PAGE_DIR } = require("./_load.js");

/* 💥 크래시는 초록불도 빨간불도 아닙니다 — 종료 코드 2로 갈라 줍니다 */
function die(e) {
  console.log(`\n💥 검사가 죽었어요 — 이건 초록불도 빨간불도 아닙니다 (안 돈 겁니다)`);
  console.log(`   ${e && e.stack ? e.stack : e}`);
  process.exit(2);
}
process.on("uncaughtException", die);
process.on("unhandledRejection", die);

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 * ══════════════════════════════════════════════════════════════
 * 🔑 문턱을 적기 전에 두 줄 (CLAUDE.md 원칙 ⑦):
 *   ① **무엇과 견주나** — 점(원)의 **바깥 테두리**를 판 상자의 경계 `0`과 `W`에 견줍니다.
 *      크기가 아니라 **들어오는가/나가는가**라, 색·모양이 바뀌어도 살아남는 관계예요.
 *   ② **격자의 어느 칸에서 재나** — **가장 좁은 칸 하나**입니다: 판 폭 `280px` · 높이 `76px`.
 *      🔑 넓은 칸은 언제나 더 헐거워요(px 여유가 폭에 비례). 그래서 최악만 재면 충분합니다.
 *      · 폭 280 = 320px 화면에서 카드 안쪽 여백을 넉넉히 뺀 값 (director 실측이 320·360·390·430)
 *      · 높이 76 = `style.css`의 `clamp(76px, 25vw, 104px)` **최솟값**
 * 🔴 **이 둘을 소스에서 읽어 오지 마세요** — clamp를 바꾸면 검사가 따라가서 아무것도 안 잡습니다. */
const PITCH_W = 280;
const PITCH_H = 76;
/* ⚽ 결과가 가리키는 **진영**. 🔒 자리(%)가 아니라 **어느 쪽인가**입니다 —
 *    표의 숫자를 손봐도 「골은 상대 골문 쪽」이라는 문장은 그대로 살아야 해요. */
const SIDE_OF = { goal: "away", assist: "away", shot: "away", save: "home", concede: "home" };
/* 🔥 내 순간으로 실제로 오는 카드 종류 (`town.js`의 `judgeFor`가 내는 셋) */
const MINE_KINDS = ["goal", "assist", "defend"];
/* 판정 결과 — `undefined`는 «발 끝에 안 걸렸어요»(결과가 없는 카드)예요 */
const RESULTS = [undefined, "goal", "assist", "shot", "save", "concede"];
/* 🌫️ 그 밖의 카드 — 판이 얼어붙지 않는지 같이 지나갑니다 */
const OTHER_KINDS = ["filler", "kick", "half", "end"];

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴🧤 **M-GK — 골키퍼를 밀림폭 「안쪽」으로 되돌립니다** (x 10% → 7%).
   *    director가 실제로 본 그 상태예요 — `push-h`가 걸리는 **실점 카드마다** 잘립니다. */
  M_GK: { "match-scene.js": [[/const FORM_H = \[\[10, 50, " gk"\]/, 'const FORM_H = [[7, 50, " gk"]']] },
  /* 🔴🧤 **M-PUSH — 반대쪽에서 같은 사고를 냅니다** (밀림 −7% → −12%).
   *    🔑 자리와 밀림은 **한 쌍**이라 어느 쪽을 건드려도 같은 흠이 나요.
   *       한쪽만 재는 검사는 다른 쪽이 움직인 날 조용히 통과합니다. */
  M_PUSH: { "style.css": [[/\.w2-pitch\.push-h \.w2-side\.home \{ transform: translateX\(-7%\); \}/,
    ".w2-pitch.push-h .w2-side.home { transform: translateX(-12%); }"]] },
  /* 🔴🧡 **M-ME — 겹 이름을 떼어 특이도를 낮춥니다.** 소스에는 여전히 「앰버」라고
   *    적혀 있는데 화면에서는 우리 편과 **같은 초록**이 됩니다. */
  M_ME: { "style.css": [[/\.w2-side\.home \.w2-dot\.me \{/, ".w2-dot.me {"]] },
  /* 🔴⚽ **M-CLOSE — 판정 뒤에 판을 안 갱신합니다.** 화면엔 「실점」이 떴는데
   *    공은 「걸린 자리」에 그대로 서 있어요. */
  M_CLOSE: { "match-scene.js": [[/\n {4}setPitch\(card, "close"\);/, ""]] },
};

{
  const bad = pageMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `P-0. 변이 정규식 ${n}개가 지금 beta/winger2/에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}
const mutOK = (name) => pageMutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🖥️ 진짜 DOM 위의 축구판 — `style.css`를 **실제 스타일시트로** 물립니다
 * ══════════════════════════════════════════════════════════════
 * 🔑 **`var(--x)`를 이름마다 다른 색으로 갈아 넣습니다.** jsdom은 사용자 정의 속성을
 *    못 풀어서 `background: var(--good)`을 통째로 버려요 — 그러면 우리 편도 나도
 *    `transparent`가 되어 **버그가 있어도 없어도 「같은 색」**이 됩니다(환경이 우연히 막아 줌).
 * 🔴 색을 「고르는」 게 아닙니다 — **어느 변수가 캐스케이드에서 이겼나**를 읽는 치환이에요.
 *    그래서 팔레트를 바꿔도 이 검사는 안 흔들립니다. */
function readSrc(file, muts) {
  let s = fs.readFileSync(path.join(PAGE_DIR, file), "utf8");
  for (const [re, rep] of (muts && muts[file]) || []) {
    const before = s;
    s = s.replace(re, rep);
    if (s === before) throw new Error(`변이가 ${file}에 안 걸렸어요 — ${re}`);
  }
  return s;
}
/* 🎨 이름 → 색. 🔒 **결정적**이라 같은 이름은 늘 같은 색이고, 다른 이름은 절대 안 겹칩니다. */
function paint(css) {
  const names = [...new Set([...css.matchAll(/var\(--([a-z0-9-]+)/gi)].map((m) => m[1]))].sort();
  const map = {};
  names.forEach((n, i) => { map[n] = "#" + (0x010101 * (i + 1) * 7 + 0x101010).toString(16).slice(-6); });
  return { css: css.replace(/var\(--([a-z0-9-]+)(?:,[^()]*)?\)/gi, (m, n) => map[n] || "#000001"), map };
}

function scene(muts) {
  const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
  const painted = paint(readSrc("style.css", muts));
  const dom = new JSDOM(
    `<!doctype html><head><style>${painted.css}</style></head><body><div id="host"></div></body>`,
    { runScripts: "outside-only", pretendToBeVisual: true, url: "https://x.test/winger2/" });
  const W = dom.window;
  W.eval(readSrc("match-scene.js", muts));
  const Sc = W.W2Scene;
  if (!Sc || !Sc.mount) throw new Error("W2Scene이 안 실렸어요");
  Sc.mount(W.document.getElementById("host"), { home: "우리 학교", away: "아라 중등부", myName: "나", lite: true });
  Sc.fast();
  /* 🔴 **밀림 표는 「이 창이 물고 있는」 CSS에서 뜯습니다.**
   *    처음엔 `walk()`가 디스크의 원본을 다시 읽었는데, 그러면 `style.css`를 변이해도
   *    검사가 **원본 숫자로** 계산해서 M-PUSH가 아무것도 안 잡았어요 —
   *    「변이했는데 초록불」의 교과서 모양입니다(실제로 이 파일 첫 판에서 났습니다). */
  return { W, D: W.document, Sc, colors: painted.map, push: pushTable(readSrc("style.css", muts)),
    close: () => dom.window.close() };
}

/* 🧍 지금 판에 서 있는 **모든 점**을 읽습니다 — 자리는 인라인, 크기는 **계산된 값**이에요.
 * 🔑 크기를 CSS 파일에서 정규식으로 뽑지 않습니다 — 어느 규칙이 이겼는지는
 *    **캐스케이드가 정하지 소스 순서가 정하지 않아요**(그게 ②의 정체였습니다). */
function dotsOf(h) {
  const out = [];
  for (const el of h.D.querySelectorAll(".w2-pitch .w2-dot")) {
    const st = h.W.getComputedStyle(el);
    const side = el.closest(".w2-side.home") ? "home" : "away";
    out.push({
      el, side,
      me: el.classList.contains("me"), gk: el.classList.contains("gk"),
      x: parseFloat(el.style.left), y: parseFloat(el.style.top),
      w: parseFloat(st.width) || 0, h: parseFloat(st.height) || 0,
      bg: st.backgroundColor, bw: parseFloat(st.borderTopWidth) || 0,
    });
  }
  return out;
}
/* ⚽ 공 — `transform: translate(x%, y%)`에 자리가 **숫자로 적혀 있습니다.** */
function ballOf(h) {
  const el = h.D.querySelector(".w2-ball");
  const m = String(el.style.transform).match(/translate\((-?[\d.]+)%,\s*(-?[\d.]+)%\)/);
  const st = h.W.getComputedStyle(el.querySelector("b"));
  return { x: m ? parseFloat(m[1]) : NaN, y: m ? parseFloat(m[2]) : NaN,
    w: parseFloat(st.width) || 0, h: parseFloat(st.height) || 0 };
}
/* 📐 **밀림은 CSS가 갖고 있습니다** — 여기가 두 파일이 만나는 자리예요.
 *    `.w2-pitch.push-h .w2-side.home { transform: translateX(-7%); }` 네 줄을 그대로 뜯습니다. */
function pushTable(css) {
  const t = {};
  for (const m of css.matchAll(
    /\.w2-pitch\.push-(a|h)\s+\.w2-side\.(home|away)\s*\{\s*transform:\s*translateX\((-?[\d.]+)%\)/g))
    t[`${m[1]}:${m[2]}`] = parseFloat(m[3]);
  return t;
}
const pushOf = (h) => {
  const c = h.D.querySelector(".w2-pitch").classList;
  return c.contains("push-a") ? "a" : c.contains("push-h") ? "h" : null;
};

/* 📦 한 점이 판 안에 **전부** 들어오나. 돌려주는 값은 **가장 얇은 여유(px)** —
 *    음수면 그만큼 잘린 겁니다. 🔒 여유를 숫자로 돌려줘야 «아슬아슬한가»가 보여요. */
function inside(cx, cy, w, hh) {
  /* 🔴 **못 읽은 값은 「밖」으로 셉니다.** `NaN`을 그대로 두면 `NaN < 0`이 거짓이라
   *    자리를 **한 개도 못 읽었을 때 조용히 통과**합니다 — 마크업이 바뀌어 인라인
   *    `left`나 `transform`이 사라지는 날이 정확히 그 날이에요. */
  if (![cx, cy, w, hh].every(Number.isFinite)) return -Infinity;
  const px = cx / 100 * PITCH_W, py = cy / 100 * PITCH_H;
  return Math.min(px - w / 2, PITCH_W - (px + w / 2), py - hh / 2, PITCH_H - (py + hh / 2));
}

/* 🎬 카드 한 벌을 실제로 굴려 **그때그때 판의 상태**를 모읍니다.
 * 🔴 표를 베껴 읽지 않습니다 — `openMoment`/`closeMoment`/`push`를 진짜로 지나요. */
async function walk(h) {
  const T = h.push;                       // 🔒 **이 창의** CSS에서 뜯은 표예요 (위 🔴)
  const shots = [];
  const snap = (label) => {
    const p = pushOf(h);
    const dots = dotsOf(h).map((d) => {
      const shift = p ? (T[`${p}:${d.side}`] || 0) : 0;
      return { ...d, cx: d.x + shift, margin: inside(d.x + shift, d.y, d.w, d.h) };
    });
    const b = ballOf(h);
    shots.push({ label, push: p, dots, ball: { ...b, margin: inside(b.x, b.y, b.w, b.h) } });
    return shots[shots.length - 1];
  };
  const pairs = [];
  for (const kind of MINE_KINDS) {
    for (const result of RESULTS) {
      const card = { min: 23, kind, mine: true, by: "나", score: [0, 0], stakeKey: null };
      await h.Sc.openMoment(card);
      const o = snap(`${kind}/${result || "—"} 열림`);
      card.judge = result === "goal" || result === "assist" ? "perfect" : result ? "ok" : "miss";
      card.result = result;
      card.text = "…";
      await h.Sc.closeMoment(card);
      const c = snap(`${kind}/${result || "—"} 결과`);
      pairs.push({ kind, result, open: o.ball, close: c.ball });
    }
  }
  for (const kind of OTHER_KINDS) {
    for (const result of [undefined, "goal", "concede"]) {
      await h.Sc.push({ min: 40, kind, result, score: [1, 1], text: "…" });
      snap(`${kind}/${result || "—"}`);
    }
  }
  return { shots, pairs, pushTable: T };
}

async function main() {

/* ══════════════════════════════════════════════════════════════
 * P-1. 🧤 **판 밖으로 나가는 점이 없다** — 자리(JS)와 밀림(CSS)이 한 쌍이다
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧤 P-1. 판 밖으로 나가는 점 ──");
{
  const h = scene(null);
  const r = await walk(h);
  /* 🔒 **전제를 먼저 찍습니다** — 판이 `overflow: hidden`이 아니면 「밖으로 나가면 잘린다」가
   *    애초에 성립을 안 해요. 스타일시트가 안 걸린 상태도 여기서 걸립니다. */
  const ov = h.W.getComputedStyle(h.D.querySelector(".w2-pitch")).overflow;
  const nPush = Object.keys(r.pushTable).length;
  check(ov === "hidden" && nPush === 4,
    `P-1-0. 🔒 전제가 서 있다 — 판이 \`overflow: ${ov}\`이고, 밀림 규칙이 **${nPush}줄** 걸렸다`
    + `\n     ${Object.entries(r.pushTable).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}%`).join(" · ")}`
    + (ov === "hidden" && nPush === 4 ? ""
      : `\n     🔴 전제가 안 서면 아래 P-1은 **아무것도 안 지킵니다** — style.css가 안 걸렸는지 보세요`));

  const bad = [];
  let worst = null;
  for (const s of r.shots) {
    for (const d of s.dots) {
      if (d.margin < 0) bad.push(`${s.label}: ${d.side}${d.gk ? " 🧤gk" : d.me ? " 🧡나" : ""} ${d.cx.toFixed(1)}% (${d.margin.toFixed(1)}px)`);
      if (!worst || d.margin < worst.m) worst = { m: d.margin, what: `${d.side}${d.gk ? " 🧤gk" : d.me ? " 🧡나" : ""}`, at: s.label, cx: d.cx };
    }
    if (s.ball.margin < 0) bad.push(`${s.label}: ⚽ 공 ${s.ball.x.toFixed(1)}% (${s.ball.margin.toFixed(1)}px)`);
  }
  const nDots = r.shots.reduce((a, s) => a + s.dots.length + 1, 0);
  check(bad.length === 0,
    `P-1. 🧤 **판 밖으로 나가는 점이 하나도 없다** — 카드 상태 ${r.shots.length}개 · 점 ${nDots}개`
    + `\n     격자: 가장 좁은 칸 하나 (판 ${PITCH_W}×${PITCH_H}px) · 견주는 것: 원의 바깥 테두리 ↔ 판 경계`
    + `\n     가장 아슬아슬한 곳: **${worst.what}** ${worst.cx.toFixed(1)}% — 여유 **${worst.m.toFixed(1)}px** (${worst.at})`
    + (bad.length
      ? `\n     🔴 잘린 점 ${bad.length}개:` + bad.slice(0, 8).map((b) => `\n       · ${b}`).join("")
        + `\n     🔑 \`match-scene.js\`의 \`FORM_H\`/\`FORM_A\`와 \`style.css\`의 \`push-*\`는 **한 쌍**입니다 — 같이 보세요`
      : `\n     🔑 여유가 얇습니다 — 밀림을 키우거나 점을 골라인 쪽으로 옮기면 **먼저 여기가** 터져요`));
  h.close();
}

/* ══════════════════════════════════════════════════════════════
 * P-2. 🧡 **「나」가 우리 편과 다르게 보인다** — 소스가 아니라 **캐스케이드**로
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧡 P-2. 나 · 우리 편 · 상대가 갈리는가 ──");
async function p2(muts) {
  const h = scene(muts);
  const dots = dotsOf(h);
  const me = dots.find((d) => d.me);
  const home = dots.find((d) => d.side === "home" && !d.me);
  const away = dots.find((d) => d.side === "away" && !d.gk);
  const r = { me, home, away };
  h.close();
  return r;
}
{
  const r = await p2(null);
  const CLEAR = "rgba(0, 0, 0, 0)";
  /* 🔒 **전제** — 우리 편 점에 색이 실제로 걸렸나. 스타일시트가 안 물리면 셋 다
   *    투명이라 «다르다»가 거짓으로 참이 됩니다(환경이 우연히 막아 줌). */
  const lit = r.home.bg !== CLEAR && r.me.bg !== CLEAR;
  check(lit,
    `P-2-0. 🔒 전제가 서 있다 — 점에 배경색이 실제로 걸렸다 (우리 편 ${r.home.bg} · 🧡 나 ${r.me.bg})`
    + (lit ? "" : `\n     🔴 색이 안 걸렸어요 — 아래 P-2는 **아무것도 안 지킵니다**`));
  const diff = lit && r.me.bg !== r.home.bg;
  check(diff,
    `P-2. 🧡 **「나」의 색이 우리 편과 다르다** — CSS 특이도로 실제로 이기는가`
    + `\n     🧡 나 ${r.me.bg} · 🟢 우리 편 ${r.home.bg} · ⚪ 상대 ${r.away.bg}`
    + (diff
      ? `\n     🔑 소스에 뭐라 적혀 있는지가 아니라 **캐스케이드가 누구를 골랐는지**를 봅니다 —`
        + ` \`.w2-dot.me\`(0,2,0)는 \`.w2-side.home .w2-dot\`(0,2,1)에 **집니다**`
      : `\n     🔴 나와 우리 편이 **같은 색**입니다 — \`style.css\`의 \`.me\` 규칙에 겹 이름(\`.w2-side.home\`)이 붙어 있는지 보세요`
        + `\n        ⚠️ \`!important\`로 이기지 마세요 — 다음 사람이 못 덮습니다`));
  /* ♿ 색을 통째로 빼도 갈려야 합니다. 🔑 P-2와 **성질이 다른 문장**이라 안 묶었어요 —
   *    묶으면 색이 고쳐진 뒤에도 흑백 문제로 빨간불이 남아 신호를 잃습니다. */
  const mono = r.me.w > r.home.w && r.away.bw > 0 && r.home.bw === 0;
  check(mono,
    `P-2b. ♿ **색을 빼도 셋이 갈린다** — 나는 더 크고(${r.me.w}px > ${r.home.w}px),`
    + ` 상대는 속이 비었어요(테두리 ${r.away.bw}px · 우리 편 ${r.home.bw}px)`
    + (mono ? "" : `\n     🔴 흑백·색약에서 «나»와 «상대»가 우리 편과 안 갈립니다`));
}

/* ══════════════════════════════════════════════════════════════
 * P-3. ⚽ **판정이 끝나면 공이 결과 자리로 간다**
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── ⚽ P-3. 판정 뒤에 공이 움직이는가 ──");
async function p3(muts) {
  const h = scene(muts);
  const r = await walk(h);
  h.close();
  return r.pairs;
}
{
  const pairs = await p3(null);
  const stuck = pairs.filter((p) => p.open.x === p.close.x);
  const wrong = pairs.filter((p) => {
    const want = SIDE_OF[p.result];
    if (!want) return false;
    return want === "away" ? !(p.close.x > 50) : !(p.close.x < 50);
  });
  check(stuck.length === 0,
    `P-3. ⚽ **판정이 끝나면 공이 「걸린 자리」를 떠난다** — ${pairs.length}갈래 전부`
    + `\n     ${pairs.slice(0, 6).map((p) => `${p.kind}/${p.result || "—"} ${p.open.x}%→${p.close.x}%`).join(" · ")}`
    + (stuck.length
      ? `\n     🔴 안 움직인 갈래 ${stuck.length}개: ${stuck.map((p) => `${p.kind}/${p.result || "—"} ${p.open.x}%`).join(" · ")}`
        + `\n     🔑 \`push\`·\`openMoment\`·\`closeMoment\` **셋 다** \`setPitch\`를 지나야 합니다`
      : ""));
  check(wrong.length === 0,
    `P-3a. ⚽ **공이 결과와 「같은 편」에 선다** — 골·도움·슛은 상대 진영, 선방·실점은 우리 진영`
    + `\n     ${Object.keys(SIDE_OF).map((k) => {
      const p = pairs.find((q) => q.result === k);
      return `${k} ${p ? p.close.x + "%" : "—"}`;
    }).join(" · ")}`
    + (wrong.length
      ? `\n     🔴 반대편에 선 갈래: ${wrong.map((p) => `${p.kind}/${p.result} ${p.close.x}%`).join(" · ")}`
      : `\n     🔑 **자리(%)가 아니라 진영**을 봅니다 — 표의 숫자를 손봐도 이 문장은 그대로 살아요`));
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — **고치기 전에 빨간불이 뜨는지**
 * ══════════════════════════════════════════════════════════════
 * 🔴 **기준선이 초록불인지 먼저** 봅니다 — 이미 빨간불인 검사는 남의 변이 신호까지 먹어요. */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
if (fail > 0) console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);

/* 🧪🧤 M-GK · M-PUSH — **한 쌍의 양쪽**. 둘 다 P-1이 갈려야 합니다. */
for (const [name, label] of [["M_GK", "🧤 골키퍼를 x 10% → 7%로 (director가 본 그 상태)"],
  ["M_PUSH", "🧤 밀림을 −7% → −12%로 (반대쪽에서 같은 사고)"]]) {
  if (!mutOK(name)) { check(false, `🧪 **변이 ${name.replace("_", "-")} — ${label}**${MUT_DEAD}`); continue; }
  const h = scene(MUT[name]);
  const r = await walk(h);
  const cut = [];
  for (const s of r.shots) for (const d of s.dots) if (d.margin < 0) cut.push(`${s.label}: ${d.side}${d.gk ? " 🧤gk" : ""} ${d.cx.toFixed(1)}%`);
  h.close();
  check(cut.length > 0,
    `🧪🧤 **변이 ${name.replace("_", "-")} — ${label}** → P-1이 빨간불`
    + `\n     잘린 상태 ${cut.length}개${cut.length ? " — 예: " + cut.slice(0, 3).join(" · ") : ""}`
    + (cut.length ? `\n     ✔ 실점 카드(\`push-h\`)마다 키퍼가 사라지는 그 그림입니다`
      : `\n     🔴 자리를 밀림 안쪽으로 넣었는데 초록불이에요 — P-1이 아무것도 안 지킵니다`));
}

/* 🧪🧡 M-ME — 겹 이름을 떼면 P-2가 갈려야 합니다.
 * 🔑 그리고 **P-2b(크기)는 초록불로 남아야** 해요 — 색만 먹혔지 크기는 안 먹혔거든요.
 *    그게 «소스만 읽으면 앰버라고 적혀 있다»의 정체입니다. */
if (!mutOK("M_ME")) check(false, `🧪 **변이 M-ME — 🧡 겹 이름을 뗌**${MUT_DEAD}`);
else {
  const r = await p2(MUT.M_ME);
  const broke = r.me.bg === r.home.bg;
  const sizeStill = r.me.w > r.home.w;
  check(broke,
    `🧪🧡 **변이 M-ME — \`.w2-side.home .w2-dot.me\` → \`.w2-dot.me\`** → P-2가 빨간불`
    + `\n     🧡 나 ${r.me.bg} · 🟢 우리 편 ${r.home.bg}`
    + (broke ? `\n     ✔ 같은 색이 됐어요 — **소스에는 여전히 앰버라고 적혀 있습니다**`
      : `\n     🔴 특이도를 낮췄는데 초록불이에요 — P-2가 캐스케이드를 안 보고 있습니다`));
  check(sizeStill,
    `🧪 **변이 M-ME → P-2b(크기)는 초록불로 남아야** 한다 — 먹힌 건 배경 한 줄뿐이에요`
    + `\n     🧡 나 ${r.me.w}px · 🟢 우리 편 ${r.home.w}px`
    + (sizeStill ? `\n     🔑 둘을 안 묶은 값어치예요 — 묶었으면 «색이 먹혔다»가 «흑백에서도 안 갈린다»로 읽힙니다`
      : `\n     🔴 크기까지 같이 갈렸어요 — 두 문장이 섞여 있습니다`));
}

/* 🧪⚽ M-CLOSE — `closeMoment`의 `setPitch`를 뺍니다. P-3이 갈려야 합니다. */
if (!mutOK("M_CLOSE")) check(false, `🧪 **변이 M-CLOSE — 판정 뒤에 판을 안 갱신**${MUT_DEAD}`);
else {
  const pairs = await p3(MUT.M_CLOSE);
  const stuck = pairs.filter((p) => p.open.x === p.close.x);
  check(stuck.length === pairs.length,
    `🧪⚽ **변이 M-CLOSE — \`closeMoment\`에서 \`setPitch\`를 뺌** → P-3이 빨간불`
    + `\n     안 움직인 갈래 **${stuck.length}/${pairs.length}**`
    + `\n     예: ${pairs.slice(0, 4).map((p) => `${p.kind}/${p.result || "—"} ${p.open.x}%→${p.close.x}%`).join(" · ")}`
    + (stuck.length === pairs.length
      ? `\n     ✔ 화면엔 「실점」이 떴는데 공은 상대 진영에 서 있는 그 상태입니다`
      : `\n     🔴 줄을 뺐는데 ${pairs.length - stuck.length}갈래가 여전히 움직여요 —`
        + ` **같은 일을 하는 줄이 또 있습니다**(방어 겹침 · 그 줄은 단독으로는 증상이 0장이에요)`));
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
}

main();
