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
 *     **클래스 둘(`push-a`/`push-h`)과 인라인 `transform`들**뿐입니다
 *   · 🧍 **한 점의 자리는 둘의 합입니다**:
 *       ① 점의 인라인 `left`/`top`(%)  — 집 자리 (`FORM_H`/`FORM_A`/`ME_AT`)
 *       ② **점을 감싼 `.w2-slot`의 인라인 `translate(%)`** — 팀 밀림 + 점마다 다른 어긋남
 *          (`match-scene.js`의 `dotShift` — `PUSH`·`LINE`·`PULL`·흔들림이 **다 여기 한 값**으로 나와요)
 *     🕰️ 예전엔 팀 밀림이 `style.css`의 `.w2-side { translateX(±7%/±4%) }`로 **따로** 있었습니다.
 *     🐛 그런데 ⚽ 공은 `.w2-side` **밖**이라 그 밀림을 안 타서, 점을 공 쪽으로 붙이는 산수와
 *        화면이 **7%씩 어긋난 다른 좌표계**였어요 — 320px 렌더에서 **중원이 공 위에 포개졌습니다.**
 *        🔒 그래서 밀림을 `dotShift`로 합쳤고, **CSS에는 미는 규칙이 없습니다.**
 *        ⚠️ 되살리면 두 번 밀려 우리 키퍼가 10 − 7 − 7 = **−4%**로 판 밖에 나갑니다.
 *   · 🏷️ `.push-a`/`.push-h`는 이제 **상태 표시**예요(움직임이 아니라) — 「`card.flow`가 판에
 *     닿았나」를 P-7이 이걸로 읽습니다
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
 *   ② **격자의 어느 칸에서 재나** — **가장 좁은 칸 하나**입니다: 판 폭 `264px` · 높이 `76px`.
 *      🔑 넓은 칸은 언제나 더 헐거워요(px 여유가 폭에 비례). 그래서 최악만 재면 충분합니다.
 *      · 🐛 폭이 예전엔 280이었는데 «카드 안쪽 여백을 넉넉히 뺀 값»이라고만 적혀 있었고,
 *        **실제로는 270px이었습니다** — 검사가 현실보다 **헐겁게** 재고 있었어요.
 *        헤드리스 렌더 실측(145번): 320px 화면 → 판 **270×80** · 390px → 340×97.5.
 *        (`#app`이 `max-width:480px; padding:20px 16px`, `.w2-top`이 `padding:8px` + 1px 테두리)
 *      · 264 = 실측 270에서 6px 더 좁게. 화면이 320보다 좁아질 일은 없지만 **여유를 검사 쪽에** 둡니다
 *      · 높이 76 = `style.css`의 `clamp(76px, 25vw, 104px)` **최솟값** (25vw라 화면 304px 아래에서만 걸려요)
 * 🔴 **이 둘을 소스에서 읽어 오지 마세요** — clamp를 바꾸면 검사가 따라가서 아무것도 안 잡습니다. */
const PITCH_W = 264;
const PITCH_H = 76;
/* ⚽ **겹침을 재는 칸은 다릅니다 — 여기는 「실측 320px 판」(270 × 80)입니다.**
 * 🔴 위 264 × 76은 **잘림**에 여유를 두려고 실측보다 **좁게** 잡은 값이에요. 그런데
 *    **겹침을 좁은 칸에서 재면 없는 병이 보입니다** — 판을 좁히면 점 사이 거리가
 *    인위적으로 줄어드니까요(실제로 264 칸에서는 −0.98px, 실측 270 칸에서는 −0.33px).
 * 🔒 **여유의 방향이 반대라 칸도 반대**입니다: 잘림은 좁게, 겹침은 **실측 그대로**.
 * 📏 헤드리스 렌더 실측(145번 §3): 320px 화면 → 판 **270 × 80** · 390px → 340 × 97.5.
 *    가장 좁은 320px에서 잽니다 — 390px에서는 같은 자리가 +2.98px로 안 겹쳐요. */
const RENDER_W = 270, RENDER_H = 80;
/* ⚽ 결과가 가리키는 **진영**. 🔒 자리(%)가 아니라 **어느 쪽인가**입니다 —
 *    표의 숫자를 손봐도 「골은 상대 골문 쪽」이라는 문장은 그대로 살아야 해요. */
const SIDE_OF = { goal: "away", assist: "away", shot: "away", save: "home", concede: "home" };
/* 🔥 내 순간으로 실제로 오는 카드 종류 (`town.js`의 `judgeFor`가 내는 셋) */
const MINE_KINDS = ["goal", "assist", "defend"];
/* 판정 결과 — `undefined`는 «발 끝에 안 걸렸어요»(결과가 없는 카드)예요 */
const RESULTS = [undefined, "goal", "assist", "shot", "save", "concede"];
/* 🌫️ 그 밖의 카드 — 판이 얼어붙지 않는지 같이 지나갑니다 */
const OTHER_KINDS = ["filler", "kick", "half", "end"];
/* 🌊 흐름 — `town.js`(🏫 학교)가 주는 값이에요.
 * 🔴 `undefined`가 목록에 **있어야** 합니다: 🏟️ 프로 경기(`engine.js`)는 안 주거든요.
 *    빼면 「flow 없이도 도는가」를 한 번도 안 재게 됩니다. */
const FLOWS = [undefined, "a", "h", "mid"];

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴🧤 **M-GK — 골키퍼를 밀림폭 「안쪽」으로 되돌립니다** (x 10% → 7%).
   *    director가 실제로 본 그 상태예요 — `push-h`가 걸리는 **실점 카드마다** 잘립니다. */
  M_GK: { "match-scene.js": [[/const FORM_H = \[\[10, 50, " gk"\]/, 'const FORM_H = [[7, 50, " gk"]']] },
  /* 🔴🧤 **M-PUSH — 반대쪽에서 같은 사고를 냅니다** (팀 밀림 7 → 12).
   *    🔑 자리(`FORM_H`)와 밀림(`PUSH`)은 **한 쌍**이라 어느 쪽을 건드려도 같은 흠이 나요.
   *       한쪽만 재는 검사는 다른 쪽이 움직인 날 조용히 통과합니다.
   *    🕰️ 예전엔 이 값이 `style.css`에 있었어요 — 지금은 `dotShift`가 다 냅니다(위 🌍). */
  M_PUSH: { "match-scene.js": [[/const PUSH = \{ home: 7, away: 4 \};/, "const PUSH = { home: 12, away: 4 };"]] },
  /* 🔴🧡 **M-ME — 겹 이름을 떼어 특이도를 낮춥니다.** 소스에는 여전히 「앰버」라고
   *    적혀 있는데 화면에서는 우리 편과 **같은 초록**이 됩니다. */
  M_ME: { "style.css": [[/\.w2-side\.home \.w2-dot\.me \{/, ".w2-dot.me {"]] },
  /* 🔴⚽ **M-CLOSE — 판정 뒤에 판을 안 갱신합니다.** 화면엔 「실점」이 떴는데
   *    공은 「걸린 자리」에 그대로 서 있어요. */
  M_CLOSE: { "match-scene.js": [[/\n {4}setPitch\(card, "close"\);/, ""]] },
  /* 🔴🧤 **M-DEV — 골키퍼를 흐름 따라 «양쪽»으로 보냅니다** (지금은 가운데 쪽 한 방향뿐).
   *    ①과 **같은 사고가 새 기구에서** 다시 나는 모양이에요: `push-h`(−7%)에 어긋남 −2%가
   *    겹쳐 우리 키퍼가 x 1%까지 내려가 **실점 카드마다 잘립니다**.
   *    🔑 자리(`FORM_H`)도 밀림(CSS)도 안 건드리는데 터져요 — **셋째 항이 생겼다**는 증거입니다. */
  M_DEV: { "match-scene.js": [[/const out = home \? \(dir > 0 \? GK_OUT : 0\) : \(dir < 0 \? -GK_OUT : 0\);/,
    "const out = home ? dir * GK_OUT : -dir * GK_OUT;"]] },
  /* 🔴🏃 **M-FLAT — 점마다 다른 자리를 없애고 「겹 하나가 통째로 밀리는」 옛 그림으로 되돌립니다.**
   *    🔑 판 밖으로 나가지도, 공이 엉뚱한 데 가지도 않아요 — **P-1도 P-3도 초록불입니다.**
   *       *"대형이 미끄러진다"*는 **P-4가 아니면 아무도 못 봅니다.** */
  /* 🔴🌊 **M-SIDE — `card.flow`가 판에 닿는 줄을 끊습니다.**
   *    town.js가 흐름을 실어 보내도 **판이 한 칸도 안 움직입니다.**
   *    🔑 이 변이가 안 잡히면 **같은 일을 하는 줄이 또 있다**는 뜻이에요 —
   *       `BALL_FLOW`의 세 번째 칸에 밀림을 같이 적으면 그 상태가 됩니다(designer 144번 §5-3). */
  M_SIDE: { "match-scene.js": [[/const side = at\[2\] \|\| \(card\.flow === "a" \? "a" : card\.flow === "h" \? "h" : ""\);/,
    "const side = at[2];"]] },
  M_FLAT: { "match-scene.js": [
    [/return \[push \+ out, clamp\(by - hy, -GK_SPAN, GK_SPAN\) \* GK_TRACK \+ \(fxRnd\(\) \* 2 - 1\) \* GK_JY\];/,
      "return [push, 0];"],
    [/return \[dx, clamp\(hy \+ dy, Y_MIN, Y_MAX\) - hy\];/, "return [push, 0];"]] },
  /* 🔴🧤 **M-GKY — 키퍼가 공을 세로로 너무 쫓아갑니다** (0.25 → 1.2).
   *    골대는 판 높이의 30~70%인데 키퍼가 21~79%까지 나가요 — **골문을 떠난 그림**입니다.
   *    🔑 판 밖으로는 안 나가서 **P-1은 초록불로 남습니다** — P-5가 아니면 아무도 못 봐요. */
  M_GKY: { "match-scene.js": [[/const GK_TRACK = 0\.25, GK_SPAN = 24, GK_JY = 0\.8;/,
    "const GK_TRACK = 1.2, GK_SPAN = 24, GK_JY = 0.8;"]] },
  /* 🔴⚽ **M-STAND — 점이 공 둘레를 안 비웁니다** (`STANDOFF` 8 → 0).
   *    🔑 **똑같은 모양의 흠이 세 번째**예요 (🧤 키퍼 실종 → 🧤 키퍼가 공과 겹침 →
   *       🧡 내가 공 뒤로 숨음). 셋 다 *"가장 필요한 순간에만 안 보인다"*였습니다.
   *    📏 되돌리면 겹치는 상태가 **2 → 171 / 2112**, 최악 **−0.33 → −13.66px**. */
  M_STAND: { "match-scene.js": [[/const STANDOFF = 8;/, "const STANDOFF = 0;"]] },
  /* 🔴🏁 **M-WHISTLE — 킥오프·종료 휘슬을 흐름 줄과 같은 옷으로** 되돌립니다.
   *    *"삐— 경기 종료 휘슬"*이 *"측면에서 두드립니다"*와 구분이 안 됩니다. */
  M_WHISTLE: { "match-scene.js": [[/card\.kind === "kick" \|\| card\.kind === "end" \? "whistle"/,
    'card.kind === "kick" || card.kind === "end" ? "filler"']] },
  /* 🔴⏳ **M-STAG — 출발 시차를 없앱니다.** 열한 개가 동시에 떠나면 그것도 «미끄러지는» 그림이에요.
   *    🔑 🧡 나(13ms)는 따로라 값이 **2종**은 남습니다 — 「0이 아닌가」로 재면 안 잡혀요. */
  M_STAG: { "match-scene.js": [[/style="transition-delay:\$\{\(i % 4\) \* 26\}ms"/,
    'style="transition-delay:0ms"']] },
  /* 🔴🥅 **M-ATTACK — 공을 가진 쪽의 공격수를 골망 옆까지 데려옵니다** (`PULL` ↑ · `RANGE` ↑).
   *    🔑 designer 148번이 **안 하기로 판정한 바로 그 변경**의 모양이에요 —
   *       *"공을 가진 팀의 최전방 한 명은 공 옆에 세운다"*. 하면 P-11이 빨간불입니다. */
  M_ATTACK: { "match-scene.js": [
    [/const PULL = \{ gk: 0, def: 5\.5, mid: 7, fwd: 6\.2, wing: 7\.6 \};/,
      "const PULL = { gk: 0, def: 5.5, mid: 7, fwd: 40, wing: 40 };"],
    [/const RANGE = 46;/, "const RANGE = 200;"]] },
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
  /* ⏱️ **딜레이만 없앱니다** — 자리 계산에는 손을 안 댑니다.
   * 🔑 이 검사는 **시간을 한 번도 안 재요**(위 «못 보는 것»: 0.75초가 카드 간격과 맞는지는
   *    실기기 몫입니다). 그런데 `delayOf()`가 ⏩ 빨리감기에서도 카드당 90ms라,
   *    상태 192개 × 창 여덟 벌이면 **2분을 기다리게** 됩니다.
   * 🔴 자리를 정하는 줄(`setPitch`)은 동기예요 — 여기서 지우는 건 **기다림뿐**입니다. */
  W.setTimeout = (f) => { f(); return 0; };
  W.eval(readSrc("match-scene.js", muts));
  const Sc = W.W2Scene;
  if (!Sc || !Sc.mount) throw new Error("W2Scene이 안 실렸어요");
  Sc.mount(W.document.getElementById("host"), { home: "우리 학교", away: "아라 중등부", myName: "나", lite: true });
  Sc.fast();
  return { W, D: W.document, Sc, colors: painted.map, close: () => dom.window.close() };
}

/* 🧍 지금 판에 서 있는 **모든 점**을 읽습니다 — 자리는 인라인, 크기는 **계산된 값**이에요.
 * 🔑 크기를 CSS 파일에서 정규식으로 뽑지 않습니다 — 어느 규칙이 이겼는지는
 *    **캐스케이드가 정하지 소스 순서가 정하지 않아요**(그게 ②의 정체였습니다). */
function dotsOf(h) {
  const out = [];
  for (const el of h.D.querySelectorAll(".w2-pitch .w2-dot")) {
    const st = h.W.getComputedStyle(el);
    const side = el.closest(".w2-side.home") ? "home" : "away";
    /* 🏃 **③ 겹의 어긋남** — 점마다 다른 자리로 가는 그 값이에요.
     * 🔴 못 읽으면 `NaN`을 그대로 흘립니다 — `inside()`가 「밖」으로 세서 P-1이 빨간불이 돼요.
     *    0으로 메우면 **배선이 끊긴 날 조용히 통과**합니다(도달 경로가 죽는 그 모양). */
    const slot = el.closest(".w2-slot");
    const m = slot && String(slot.style.transform).match(/translate\((-?[\d.]+)%,\s*(-?[\d.]+)%\)/);
    out.push({
      el, side,
      me: el.classList.contains("me"), gk: el.classList.contains("gk"),
      x: parseFloat(el.style.left), y: parseFloat(el.style.top),
      dx: m ? parseFloat(m[1]) : NaN, dy: m ? parseFloat(m[2]) : NaN,
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
/* 🔴 **`style.css`에 `.w2-side`를 미는 규칙이 없어야 합니다** — 있으면 두 번 밀려요(위 🌍).
 *    🔑 「없음」을 세는 검사라 **되살아나는 날 바로 걸립니다.** */
const sidePushRules = (css) => [...css.matchAll(
  /\.w2-side[^{]*\{[^}]*transform\s*:\s*translate/g)].length;
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
  const shots = [];
  const snap = (label) => {
    const p = pushOf(h);
    const dots = dotsOf(h).map((d) => {
      /* ①집 자리 + ②겹의 어긋남(팀 밀림까지 포함) — **둘을 더해야** 그 점의 진짜 자리예요 */
      const cx = d.x + d.dx, cy = d.y + d.dy;
      return { ...d, cx, cy, margin: inside(cx, cy, d.w, d.h) };
    });
    const b = ballOf(h);
    shots.push({ label, push: p, dots, ball: { ...b, margin: inside(b.x, b.y, b.w, b.h) } });
    return shots[shots.length - 1];
  };
  const pairs = [];
  for (const kind of MINE_KINDS) {
    for (const result of RESULTS) {
      for (const flow of FLOWS) {
        const card = { min: 23, kind, mine: true, by: "나", score: [0, 0], stakeKey: null, flow };
        await h.Sc.openMoment(card);
        const o = snap(`${kind}/${result || "—"}/flow=${flow || "—"} 열림`);
        card.judge = result === "goal" || result === "assist" ? "perfect" : result ? "ok" : "miss";
        card.result = result;
        card.text = "…";
        await h.Sc.closeMoment(card);
        const c = snap(`${kind}/${result || "—"}/flow=${flow || "—"} 결과`);
        if (flow === undefined) pairs.push({ kind, result, open: o.ball, close: c.ball });
      }
    }
  }
  for (const kind of OTHER_KINDS) {
    for (const result of [undefined, "goal", "concede"]) {
      for (const flow of FLOWS) {
        await h.Sc.push({ min: 40, kind, result, score: [1, 1], text: "…", flow });
        snap(`${kind}/${result || "—"}/flow=${flow || "—"}`);
      }
    }
  }
  return { shots, pairs };
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
  const nSide = sidePushRules(fs.readFileSync(path.join(PAGE_DIR, "style.css"), "utf8"));
  const moved = r.shots.every((s) => s.dots.every((d) => Number.isFinite(d.dx)));
  const ok0 = ov === "hidden" && nSide === 0 && moved;
  check(ok0,
    `P-1-0. 🔒 전제가 서 있다 — 판이 \`overflow: ${ov}\` · \`.w2-side\`를 미는 CSS **${nSide}줄** ·`
    + ` 점의 인라인 \`transform\`을 ${moved ? "전부" : "**일부 못**"} 읽었다`
    + (ok0 ? "" : ov !== "hidden"
      ? `\n     🔴 판이 안 잘리면 P-1이 **아무것도 안 지킵니다** — style.css가 안 걸렸는지 보세요`
      : nSide
        ? `\n     🔴 \`.w2-side\`를 미는 규칙이 살아났어요 — **두 번 밀립니다**(위 🌍).`
          + ` 밀림은 \`dotShift\`의 \`PUSH\`가 냅니다`
        : `\n     🔴 겹의 \`transform\`을 못 읽었어요 — 배선이 끊겼는지 보세요`));

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
        + `\n     🔑 \`match-scene.js\`의 \`FORM_H\`/\`FORM_A\`(집 자리)와 \`PUSH\`/\`LINE\`/\`PULL\`(움직임)은`
        + ` **한 쌍**입니다 — 같이 보세요`
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
 * 🏃 P-4 ~ P-6. **점이 「대형째로 미끄러지지」 않는가**
 * ══════════════════════════════════════════════════════════════
 * 🕰️ 예전엔 겹 하나가 `translateX(±7%)`로 통째로 밀렸어요. 판 밖으로 나가지도 않고
 *    공도 제자리라 **P-1·P-2·P-3이 전부 초록불**입니다 — 그런데 화면은
 *    *"선수들이 뛴다"*가 아니라 *"대형이 미끄러진다"*였습니다. 그 자리를 메웁니다.
 *
 * 🔑 문턱을 적기 전에 두 줄 (CLAUDE.md 원칙 ⑦):
 *   ① **무엇과 견주나** — 전부 **같은 카드 안 점들끼리의 차이**입니다. 절대 자리가 아니에요.
 *      계수를 손봐도 「가까운 쪽이 더 간다」·「수비가 더 오르내린다」는 그대로 살아야 합니다.
 *   ② **격자의 어느 칸에서 재나** — `MINE_KINDS`×`RESULTS`×`FLOWS` **전부**입니다.
 *      한 칸만 재면 흐름이 없는 카드(🏟️ 프로 경기)에서 얼어붙어도 안 잡혀요.
 * 📏 실측(80벌 × 168 상태): 폭 최소 **5.21** · 중앙 8.21 → 문턱 3.0 (여유 74%)
 *                            가까운−먼 최소 **2.73** · 중앙 4.90 → 문턱 1.0 (여유 173%) */
/* 🔒 **한 팀 안에서** 잽니다. 두 이유예요:
 *   ① 🧤 키퍼는 일부러 라인을 안 타서(P-5), 넣으면 «키퍼 대 나머지» 차이가 늘 잡힙니다
 *   ② 🕰️ **옛 그림이 정확히 「팀별로 한 덩어리」였어요** — `.w2-side.home`이 7%,
 *      `.w2-side.away`가 4%. 두 팀을 섞어 재면 그 3% 차이만으로 **옛 그림도 통과합니다.**
 *      🔴 이걸 놓치면 M-FLAT이 아무것도 안 잡아요 (실제로 첫 판에서 그랬습니다).
 * 📏 실측(80벌 × 168 상태 = 13440): 우리 편 5명 중앙 **4.93%** · 상대 4명 중앙 **5.07%**.
 *    🔑 **중앙값**으로 잽니다 — 최소값(0.07)은 「공이 멀고 흐름이 중원이라 흔들림만 남은」
 *       칸이에요. 드물게 한 덩어리로 보이는 카드는 정상이고, **늘 그러면** 안 되는 겁니다.
 *    문턱 3.0 (여유 64%). 옛 그림은 팀 안에서 폭이 **정확히 0**이라 크게 갈립니다. */
/* 🔬 **2026-09-05 · inspector가 독립적으로 다시 뽑았습니다** (director 145번 §13의 요청).
 *   🔴 예전 값 **3.0%는 「구현을 재서」 나온 값**이었어요 — 「자기 출력을 정답으로 삼는」
 *      자리에 가장 가깝습니다. 그래서 **바깥 기준**에서 다시 뽑습니다:
 *
 *   👁️ 「점 둘이 **다르게 움직였다**」로 읽히려면 **점 하나 크기**만큼은 벌어져야 합니다.
 *      · 점 지름 **9px** (`style.css`의 `.w2-dot { width: 9px }`)
 *      · 판 폭 **264px** (위 `PITCH_W` — 가장 좁은 칸)
 *      · 9 / 264 = **3.41%**  →  🔒 **3.4%**
 *   🔴 **소스에서 읽어 오지 않습니다.** 점이 커지거나 판이 넓어지면 이 값을 **손으로**
 *      다시 뽑으세요 — 읽어 오면 점 크기를 바꿀 때 검사가 따라가서 아무것도 안 잡습니다.
 *
 *   📏 이 자에서 잰 값 (192 상태 · `fxRnd`가 결정적이라 시드 흔들림이 **0**):
 *      우리 편 중앙 **6.35%** (p10 3.15 · 1σ 2.36) · 상대 중앙 **4.73%** (p10 2.19 · 1σ 2.27)
 *      🕰️ M-FLAT(옛 그림)은 **정확히 0.00** — 최소도 중앙도 최대도 전부 0입니다.
 *   🔒 문턱 3.4는 기준선(4.73)과 변이(0.00) **사이**에 있고, 어느 쪽에도 안 붙었어요
 *      (기준선까지 28% · 변이까지 3.4%p). 예전 3.0은 **바깥 기준보다 느슨했습니다.** */
const SPREAD_MED = 3.4;      // 한 팀 안 어긋남 폭의 **중앙값**이 이만큼은 됩니다
const NEARFAR_MIN = 1.0;     // 공이 옮겨 가면 그 근처 점이 이만큼은 따라갑니다
/* 🧤 키퍼가 「제 자리」로 인정되는 칸 — 세로는 🥅 골문(style.css `top/bottom: 30%`),
 * 가로는 자기 진영 앞 1/4. 🔒 소스에서 읽어 오지 않고 **여기 박습니다.** */
const GK_X = 25, GK_Y = [28, 72];
/* 🏃 한 팀(🧤 키퍼 제외) 안에서 어긋남이 얼마나 갈리나 — 카드마다 한 값씩, 오름차순 */
function teamSpread(shots) {
  const out = { home: [], away: [] };
  for (const s of shots) for (const side of ["home", "away"]) {
    const d = s.dots.filter((x) => !x.gk && x.side === side).map((x) => x.dx);
    out[side].push(Math.max(...d) - Math.min(...d));
  }
  for (const side of ["home", "away"]) out[side].sort((a, b) => a - b);
  return out;
}
console.log("\n── 🏃 P-4~6. 점마다 다르게 · 공 쪽으로 · 키퍼는 골문에 ──");
{
  const h = scene(null);
  const r = await walk(h);
  h.close();

  /* 🏃 P-4 — **같은 카드 안에서 점들이 서로 다른 만큼 움직인다.**
   *    겹 하나가 통째로 밀리면 이 값이 **정확히 0**입니다. */
  const sp = teamSpread(r.shots);
  const medOf = (a) => a[a.length >> 1];
  const mh = medOf(sp.home), ma = medOf(sp.away);
  const ok4 = mh >= SPREAD_MED && ma >= SPREAD_MED;
  check(ok4,
    `P-4. 🏃 **한 팀 안에서도 점마다 다른 자리로 간다** — 카드 상태 ${r.shots.length}개`
    + `\n     우리 편 5명: 중앙 **${mh.toFixed(2)}%** (최소 ${sp.home[0].toFixed(2)} · 최대 ${sp.home[sp.home.length - 1].toFixed(2)})`
    + `\n     상대 4명:   중앙 **${ma.toFixed(2)}%** (최소 ${sp.away[0].toFixed(2)} · 최대 ${sp.away[sp.away.length - 1].toFixed(2)}) · 문턱 ${SPREAD_MED}%`
    + (ok4
      ? `\n     🔑 **팀 안에서** 봅니다 — 두 팀을 섞어 재면 옛 그림(우리 7% · 상대 4%)도 통과해요`
      : `\n     🔴 한 팀이 **한 덩어리**로 움직입니다 — 대형이 통째로 미끄러지는 그 그림이에요`));

  /* 🧤 P-5 — **키퍼는 자기 골문 앞을 안 떠난다.**
   * 🔑 문턱 두 줄 (CLAUDE.md 원칙 ⑦):
   *   ① **무엇과 견주나** — 키퍼의 자리를 **골대·진영이라는 판의 지형**에 견줍니다.
   *      · 세로: `style.css`의 🥅 골문이 `top:30%; bottom:30%` → **골대 폭 30~70%**
   *      · 가로: 자기 진영의 **앞 1/4**(우리 ≤25% · 상대 ≥75%) — 그 밖은 「중원까지 나왔다」예요
   *   ② **격자의 어느 칸에서 재나** — `MINE_KINDS`×`RESULTS`×`FLOWS` 전부.
   * 📏 실측: 우리 키퍼 x 3.0~19.0% · y 43.3~56.8% → 세로 여유 13%p · 가로 여유 6%p
   * 🔴 **P-1(잘림)과 성질이 다른 문장이라 안 묶었습니다.** P-1은 「판 안에 있나」,
   *    여기는 「제 자리에 있나」예요 — 판 한가운데로 걸어 나온 키퍼는 P-1이 초록불입니다. */
  const gkBad = [];
  const gkR = { home: { xlo: 99, xhi: 0, ylo: 99, yhi: 0 }, away: { xlo: 99, xhi: 0, ylo: 99, yhi: 0 } };
  for (const s of r.shots) for (const d of s.dots) {
    if (!d.gk) continue;
    const a = gkR[d.side];
    a.xlo = Math.min(a.xlo, d.cx); a.xhi = Math.max(a.xhi, d.cx);
    a.ylo = Math.min(a.ylo, d.cy); a.yhi = Math.max(a.yhi, d.cy);
    const outX = d.side === "home" ? d.cx > GK_X : d.cx < 100 - GK_X;
    if (outX || d.cy < GK_Y[0] || d.cy > GK_Y[1])
      gkBad.push(`${s.label}: ${d.side} 🧤 (${d.cx.toFixed(1)}%, ${d.cy.toFixed(1)}%)`);
  }
  check(gkBad.length === 0,
    `P-5. 🧤 **골키퍼가 자기 골문 앞을 안 떠난다** — 세로 골대 폭 ${GK_Y[0]}~${GK_Y[1]}% ·`
    + ` 가로 자기 진영 앞 1/4`
    + `\n     우리 🧤 x ${gkR.home.xlo.toFixed(1)}~${gkR.home.xhi.toFixed(1)}% (≤${GK_X}) ·`
    + ` y ${gkR.home.ylo.toFixed(1)}~${gkR.home.yhi.toFixed(1)}%`
    + `\n     상대 🧤 x ${gkR.away.xlo.toFixed(1)}~${gkR.away.xhi.toFixed(1)}% (≥${100 - GK_X}) ·`
    + ` y ${gkR.away.ylo.toFixed(1)}~${gkR.away.yhi.toFixed(1)}%`
    + (gkBad.length
      ? `\n     🔴 골문을 떠난 상태 ${gkBad.length}개: ${gkBad.slice(0, 3).join(" · ")}`
      : `\n     🔑 P-1(잘림)과 **다른 문장**이라 안 묶었어요 — 판 한가운데로 걸어 나온 키퍼는 P-1이 초록불입니다`));

  /* ⚽ P-6 — **공이 옮겨 가면 그 근처의 점이 따라갑니다.**
   * 🔑 **같은 진영(`push-a`) 안에서 공만 앞뒤로** 옮겨 견줍니다 — 그래야 라인 항(`dir`)이
   *    상수가 되어 **공에 붙는 힘만** 남아요. 「가까운 점 vs 먼 점」을 **한 카드 안에서**
   *    견주면 라인 항에 오염됩니다(실제로 그렇게 썼다가 −3.21%가 나왔어요:
   *    상대가 우리 골문으로 밀 때는 **그쪽 수비가 라인째로** 더 올라오거든요).
   * 📐 견주는 것: 같은 점의 **평균 어긋남의 차이** — 공이 끝(≥90%)일 때 − 중간(71~86%)일 때.
   *    🎲 흔들림(±1.1%)은 평균이 지웁니다(표본 수십 개 → 표준오차 ≈ 0.15%).
   * 📏 실측(400벌): 공에서 가장 가까운 점 **+5.09** · 가장 먼 점 **−0.77** → 차이 5.86.
   *    문턱 2.0 (여유 190%) */
  const END = 90, MID = [71, 86];
  const bag = {};
  for (const s of r.shots) {
    if (s.push !== "a") continue;
    const at = s.ball.x >= END ? "end" : (s.ball.x >= MID[0] && s.ball.x <= MID[1]) ? "mid" : null;
    if (!at) continue;
    for (const d of s.dots) {
      if (d.side !== "away" || d.gk) continue;
      const k = `${d.x},${d.y}`;
      (bag[k] || (bag[k] = { end: [], mid: [], x: d.x }))[at].push(d.dx);
    }
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const rows = Object.entries(bag)
    .filter(([, v]) => v.end.length && v.mid.length)
    .map(([k, v]) => ({ k, x: v.x, d: mean(v.end) - mean(v.mid), n: Math.min(v.end.length, v.mid.length) }));
  /* 🔒 「가깝다/멀다」를 손으로 적지 않습니다 — **공이 간 자리에서** 뽑아요 */
  const near = rows.length ? rows.reduce((a, b) => (Math.abs(b.x - 97) < Math.abs(a.x - 97) ? b : a)) : null;
  const far = rows.length ? rows.reduce((a, b) => (Math.abs(b.x - 97) > Math.abs(a.x - 97) ? b : a)) : null;
  const gap = near && far ? near.d - far.d : NaN;
  check(rows.length >= 2 && gap >= NEARFAR_MIN,
    `P-6. ⚽ **공이 상대 골문 앞으로 가면 그 근처 점이 따라간다** — 같은 진영에서 공만 옮겨 견줌`
    + (rows.length >= 2
      ? `\n     가까운 점(집 ${near.x}%) **${near.d >= 0 ? "+" : ""}${near.d.toFixed(2)}%** ·`
        + ` 먼 점(집 ${far.x}%) ${far.d >= 0 ? "+" : ""}${far.d.toFixed(2)}% → 차이 **${gap.toFixed(2)}%**`
        + ` (문턱 ${NEARFAR_MIN}% · 표본 ${near.n}·${far.n})`
      : `\n     🔴 잴 점이 **${rows.length}개**예요 — 공이 끝과 중간에 다 안 갔습니다`)
    + (rows.length >= 2 && gap >= NEARFAR_MIN
      ? `\n     🔑 **같은 점의 차이**만 봅니다 — 라인 항이 상수라 «공에 붙는 힘»만 남아요.`
        + ` \`PULL\`·\`RANGE\`를 손봐도 이 문장은 삽니다`
      : `\n     🔴 공이 옮겨 갔는데 점이 **안 따라갑니다** — \`dotShift\`의 공에 붙는 항을 보세요`));
}

/* ══════════════════════════════════════════════════════════════
 * 🌊 P-7. **`card.flow`가 실제로 판에 닿는가** — engineer와의 경계면
 * ══════════════════════════════════════════════════════════════
 * 🔑 `town.js`가 카드에 `flow`를 실어 보냅니다(designer 144번 §5). 화면은 **읽는 쪽**이에요.
 *    결과가 없는 🌫️ 전개 카드에서는 **`flow`말고는 판을 움직일 게 아무것도 없습니다** —
 *    그래서 여기가 두 파일이 만나는 자리이고, 배선이 끊기면 **여기서만** 보입니다.
 * 🔴 그리고 **`flow`가 없으면(🏟️ 프로 경기) 밀림이 안 걸려야** 합니다 — 오늘 그대로예요. */
console.log("\n── 🌊 P-7. flow가 판에 닿는가 ──");
async function p7(muts) {
  const h = scene(muts);
  const got = {};
  for (const flow of FLOWS) {
    await h.Sc.push({ min: 40, kind: "filler", score: [1, 1], text: "…", flow });
    const c = h.D.querySelector(".w2-pitch").classList;
    got[flow || "없음"] = c.contains("push-a") ? "a" : c.contains("push-h") ? "h" : "—";
  }
  h.close();
  return got;
}
{
  const g = await p7(null);
  const ok = g.a === "a" && g.h === "h" && g.mid === "—" && g["없음"] === "—";
  check(ok,
    `P-7. 🌊 **결과 없는 전개 카드가 \`flow\`만으로 판을 민다** —`
    + ` flow=a → **${g.a}** · h → **${g.h}** · mid → ${g.mid} · 없음 → ${g["없음"]}`
    + (ok
      ? `\n     🔑 \`flow\`가 **없을 때 «—»**인 것이 계약의 절반이에요 — 🏟️ 프로 경기가 오늘 그대로 돕니다`
      : `\n     🔴 \`town.js\`가 흐름을 실어 보내도 판이 안 움직이거나, 안 보냈는데 움직입니다`));
}

/* ══════════════════════════════════════════════════════════════
 * ⚽🏁⏳ P-8 ~ P-10 — director 145번 §13이 넘긴 「아직 아무도 안 지키는 자리」
 * ══════════════════════════════════════════════════════════════
 * 🔑 여덟 개 중 **값어치 순으로 셋**을 골랐습니다 (안 고른 다섯과 그 이유는 보고서 147번 §2).
 *   · ④ ⚽ 공과 점이 안 겹치는가 — **같은 모양의 흠이 세 번째**라 가장 급합니다
 *   · ⑤ 🏁 휘슬이 흐름 줄과 다르게 보이는가 — 90분 대본이 들어와 **매 경기 반드시** 뜹니다
 *   · ⑥ ⏳ 출발 시차가 살아 있는가 (+ ③ 점이 다 서는 시간) — 둘이 같은 자리라 묶습니다
 * 🔒 셋 다 **한 벌의 `scene()`·`walk()`**로 잽니다 — 창을 또 띄우면 15초가 더 붙어요. */
console.log("\n── ⚽🏁⏳ P-8~10. 공 겹침 · 휘슬 옷 · 출발 시차 ──");
/* 🚧 **알려진 미달의 상한** (아래 P-8) — 지금 크기를 박고 **더 나빠지면 빨간불**입니다.
 * 🔴 「현재값이 정답」이라고 단언하는 게 아니에요. *"여기까지는 알려진 상태"*입니다.
 * 📏 기준선 겹침 **2 / 2112** · 최악 **−0.33px**   ↔   M-STAND 되돌림 **171 / 2112** · **−13.66px**
 * 🔒 상한은 그 사이 — 개수 **8** · 깊이 **−2.0px**. 어느 쪽에도 안 붙었습니다. */
const OVERLAP_N_CAP = 8;
const OVERLAP_PX_CAP = -2.0;
{
  const h = scene(null);
  const r = await walk(h);

  /* 🧡 **내 순간에는 내 동그라미가 커집니다**(`scale(1.35)`) — 겹침을 재려면 그 배수를
   *    반드시 태워야 해요. 🔒 **산식이라 소스에서 뽑습니다**(문턱이 아니에요). */
  const meScale = (() => {
    const m = readSrc("style.css", null).match(/\.w2-pitch\.mine \.w2-dot\.me[^}]*scale\(([\d.]+)\)/);
    return m ? parseFloat(m[1]) : NaN;
  })();

  /* ⚽ P-8 — **점이 공을 덮지 않는가.** P-1과 **같은 산수**입니다(반지름 합 ↔ 중심 거리).
   * 🔑 문턱 두 줄:
   *   ① **무엇과 견주나** — 두 원의 **반지름 합** ↔ **중심 사이 거리**. 자리(%)가 아니라
   *      «겹치는가»라, 표의 숫자를 손봐도 이 문장은 그대로 삽니다.
   *   ② **어느 칸에서 재나** — 🔴 **실측 320px 판(270 × 80)**. P-1의 264 × 76이 **아닙니다** —
   *      겹침은 칸을 좁히면 **없는 병이 보입니다**(위 `RENDER_W` 주석). */
  const bad = [];
  let worstGap = Infinity, worstAt = "", nDots = 0;
  for (const s of r.shots) for (const d of s.dots) {
    const rd = (d.w / 2) * (d.me ? meScale : 1);
    const dx = (d.cx - s.ball.x) / 100 * RENDER_W, dy = (d.cy - s.ball.y) / 100 * RENDER_H;
    const gap = Math.hypot(dx, dy) - rd - s.ball.w / 2;
    nDots += 1;
    if (!Number.isFinite(gap)) { bad.push(`${s.label}: 값을 못 읽었어요`); continue; }
    if (gap < 0) bad.push(`${s.label}: ${d.side}${d.gk ? " 🧤gk" : d.me ? " 🧡나" : ""} ${gap.toFixed(2)}px`);
    if (gap < worstGap) { worstGap = gap; worstAt = `${d.side}${d.gk ? " 🧤gk" : d.me ? " 🧡나" : ""} · ${s.label}`; }
  }
  const meOK = Number.isFinite(meScale);
  const within = bad.length <= OVERLAP_N_CAP && worstGap >= OVERLAP_PX_CAP;
  if (!meOK) {
    check(false, `P-8. ⚽ 🧡 커지는 배수(\`scale()\`)를 \`style.css\`에서 못 뽑았어요`
      + `\n     🔴 배수 없이 재면 🧡 나의 반지름을 **작게** 봐서 겹침이 조용히 사라집니다`);
  } else if (bad.length === 0) {
    /* 🎉 **양방향입니다** — 미달이 해소되면 여기서 «이제 승격하세요»로 빨간불이 납니다.
     *    (`tests/soccer/curve-test.js`가 쓰는 그 방식이에요. 안 그러면 아무도 파일을 안 열어요.) */
    check(false, `P-8. 🎉 **겹치는 점이 0개가 됐습니다** — 이제 🚧를 지우고 상한을 0으로 내리세요`
      + `\n     최악 여유 ${worstGap.toFixed(2)}px (${worstAt}) · 점 ${nDots}개`
      + `\n     👉 \`OVERLAP_N_CAP\`을 0으로, \`OVERLAP_PX_CAP\`을 0으로 바꾸고 이 갈래를 지우면 됩니다`);
  } else if (!within) {
    check(false, `P-8. ⚽ **점이 공을 덮는 자리가 늘었습니다** — ${bad.length}개 (상한 ${OVERLAP_N_CAP})`
      + ` · 최악 **${worstGap.toFixed(2)}px** (상한 ${OVERLAP_PX_CAP}px)`
      + `\n     🔎 견주는 것: 두 원의 반지름 합 ↔ 중심 거리 · 격자: 실측 320px 판 ${RENDER_W}×${RENDER_H}px · 점 ${nDots}개`
      + bad.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("")
      + `\n     🔑 \`STANDOFF\`(공 둘레를 비우는 칸)와 \`Y_MIN\`/\`Y_MAX\`(세로 가둠)를 **같이** 보세요 —`
      + ` 물러설 자리가 클램프에 잘리면 \`STANDOFF\`가 그만큼 깎입니다`);
  } else {
    console.log(`🚧 P-8. ⚽ 🧡 나와 공이 **${bad.length}개 상태에서 스칩니다** — 최악 ${worstGap.toFixed(2)}px (${worstAt})`);
    console.log(`     🔎 실측 320px 판 ${RENDER_W}×${RENDER_H}px · 점 ${nDots}개 · 상한 ${OVERLAP_N_CAP}개 / ${OVERLAP_PX_CAP}px (넘으면 ❌)`);
    console.log(`     🔑 뿌리: \`Y_MAX\`(82%) 클램프가 물러설 자리를 잘라 \`STANDOFF\`(8칸)가 깎입니다.`);
    console.log(`        390px 판(340×97.5)에서는 같은 자리가 **+2.98px**로 안 겹쳐요 — 가장 좁은 화면만의 일입니다.`);
    console.log(`     👁️ 0.33px는 «숨는다»가 아니라 «닿는다»입니다 — 눈에 보이는지는 실기기 몫이에요.`);
  }

  /* 🏁 P-9 — **휘슬이 흐름 줄과 다르게 보이는가.** P-2와 같은 방식(jsdom 캐스케이드)입니다.
   * 🔑 **색 하나로만 가르지 않습니다** — 흑백·색약에서도 갈려야 해요. 밝기·바탕·글꼴 셋 중
   *    **둘 이상**이 달라야 합니다(director 145번 §12가 «색이 아니라 밝기와 글꼴»로 정한 자리). */
  {
    const wEl = h.D.querySelector(".w2-card.whistle");
    const fEl = h.D.querySelector(".w2-card.filler");
    if (!wEl || !fEl) {
      check(false, `P-9. 🏁 피드에 \`whistle\`(${wEl ? "있음" : "**없음**"})·\`filler\`(${fEl ? "있음" : "**없음**"}) 카드가 안 그려졌어요`
        + `\n     🔴 둘 다 있어야 견줍니다 — \`push\`의 클래스 갈래를 보세요`);
    } else {
      const g = (el) => { const st = h.W.getComputedStyle(el);
        return { color: st.color, bg: st.backgroundColor, font: String(st.fontFamily) }; };
      const w = g(wEl), f = g(fEl);
      const axes = ["color", "bg", "font"].filter((k) => w[k] !== f[k]);
      check(axes.length >= 2,
        `P-9. 🏁 **킥오프·종료 휘슬이 흐름 줄과 다른 옷**을 입는다 — 갈리는 축 **${axes.length}개** (${axes.join(" · ")})`
        + `\n     🏁 whistle: 글자 ${w.color} · 바탕 ${w.bg} · 글꼴 ${w.font.slice(0, 24)}`
        + `\n     🌫️ filler : 글자 ${f.color} · 바탕 ${f.bg} · 글꼴 ${f.font.slice(0, 24)}`
        + (axes.length >= 2
          ? `\n     🔑 **둘 이상**을 봅니다 — 색 하나만 다르면 흑백·색약에서 «삐— 경기 종료»가 흐름 줄과 안 갈려요`
          : `\n     🔴 90분 대본이 들어와 0'과 90'이 **매 경기 반드시** 뜹니다 — 경기가 어디서 시작하고 끝나는지가 안 읽혀요`));
    }
  }

  /* ⏳ P-10 — **출발 시차**(director §13 ⑥)와 **점이 다 서는 시간**(§13 ③).
   * 🔑 둘을 한 문장에 묶지 않습니다 — 시차는 **계약**이고, 시간은 **알려진 미달**이에요. */
  {
    const delays = [...new Set([...h.D.querySelectorAll(".w2-slot")]
      .map((e) => String(e.style.transitionDelay).trim()).filter(Boolean))];
    /* 🔒 문턱 두 줄: ① 서로 다른 **값의 개수**(자리가 아니라 «갈리는가») ② 겹 열한 개 전부.
     *    🔴 「0이 아닌가」로 재면 안 잡혀요 — 🧡 나는 따로 13ms라 **0으로 뭉개도 2종**은 남습니다. */
    const MIN_STAGGER = 3;
    check(delays.length >= MIN_STAGGER,
      `P-10. ⏳ **점들이 서로 다른 시점에 출발한다** — 서로 다른 \`transition-delay\` **${delays.length}종** (문턱 ${MIN_STAGGER}종)`
      + `\n     ${delays.join(" · ")}`
      + (delays.length >= MIN_STAGGER
        ? `\n     🔑 「0이 아닌가」로 재면 안 됩니다 — 🧡 나는 따로 걸려 있어서 **뭉개도 2종은 남아요**`
        : `\n     🔴 열한 개가 거의 동시에 떠납니다 — 그것도 «대형이 미끄러지는» 그림이에요`));

    /* 🚧 §13 ③ — 점이 다 서는 시간 vs 카드 간 딜레이. **산식은 소스에서** 뜯습니다. */
    const css = readSrc("style.css", null);
    const dur = parseFloat((css.match(/\.w2-slot \{[^}]*transition:\s*transform\s+([\d.]+)s/) || [])[1]);
    const maxDelay = Math.max(...delays.map((d) => parseFloat(d) || 0));
    const settleMs = Math.round(dur * 1000) + maxDelay;
    const src = readSrc("match-scene.js", null);
    const dm = src.match(/return d <= 1 \? (\d+) : d === 2 \? (\d+) : (\d+);/);
    const school = dm ? parseInt(dm[1], 10) : NaN;      // 🏫 학교가 늘 쓰는 값 (1점 차 이내)
    const rout = dm ? parseInt(dm[3], 10) : NaN;        // 3점 차 이상
    const okSchool = Number.isFinite(settleMs) && Number.isFinite(school) && settleMs < school;
    check(okSchool,
      `P-10b. ⏱️ **점이 다 서기 전에 다음 카드가 오지 않는다** (🏫 학교가 쓰는 ${school}ms) —`
      + ` 다 서기까지 **${settleMs}ms** (\`.w2-slot\` ${dur}s + 최대 시차 ${maxDelay}ms)`
      + (okSchool ? `\n     🔒 산식은 소스에서 뜯습니다 — \`style.css\`의 \`transition\`과 \`delayOf()\`의 상수를 견줘요`
        : `\n     🔴 흐름이 겹쳐 보입니다 — \`.w2-slot\`의 \`transition\`을 줄이거나 시차를 좁히세요`));
    if (Number.isFinite(rout) && settleMs >= rout) {
      console.log(`🚧 P-10c. ⏱️ **3점 차 이상(${rout}ms)에서는 겹칩니다** — ${settleMs} − ${rout} = ${settleMs - rout}ms 모자라요`);
      console.log(`     🔑 **알려진 상태입니다**(director 145번 §11) — 이미 기운 경기라 «몰아친다»로 읽힐 자리이고,`);
      console.log(`        설계 ②(밀도의 차이가 긴장을 만든다)가 노리는 그림이기도 해요.`);
      console.log(`     👁️ «몰아친다»로 보이는지 «고장»으로 보이는지는 **폰으로만** 압니다 — 실기기 목록 ①입니다.`);
    }
  }

  /* 🥅 P-11 — **골망 옆 두 점은 「지키던 쪽」이다** (designer 148번의 근거를 검사로 굳힙니다)
   * ══════════════════════════════════════════════════════════════
   * 🔴 director 145번 §9-⑤가 *"실점 카드에 상대 선수가 우리 골문 근처에 없습니다"*를
   *    흠으로 올렸는데, designer 148번이 **실측으로 기각**했어요 — 공 옆에 있는 것은
   *    🧤 **우리 키퍼(13px)**와 🛡️ **우리 수비수(25px)**입니다. 그림은 이미
   *    *"우리가 무너졌다"*를 말하고 있어요(`CALL`도 «뚫렸어요»로 **우리를 주어**로 씁니다).
   * 🔑 그리고 ⚽ **골 카드와 정확히 대칭**입니다 — 넣은 사람은 멀고 공 옆엔 **상대 키퍼·수비수**.
   *    그 대칭이 «안 고쳐도 된다»의 **근거 전부**라, 대칭이 깨지면 판정도 다시 봐야 합니다.
   *
   * 🔒 **값이 아니라 관계**로 씁니다 — 「몇 px」이 아니라 **「어느 편인가」**예요.
   *    `PULL`·`RANGE`·`PUSH`의 숫자를 손봐도 이 문장은 그대로 살아야 합니다.
   * 🌍 이 문장이 서 있는 세계: 「점이 **카드를 따라가는 그림**이지 시뮬레이션이 아닌 세계」.
   *    *"공을 가진 팀의 최전방 한 명은 공 옆에 세운다"*는 판정이 나오면 **여기가 옛 계약**이고,
   *    그때는 designer 148번 §3(판단이 바뀔 조건 셋)부터 다시 보세요.
   * ⚠️ **`concede` 쪽은 이 변이로 안 깨집니다** — 🧤 우리 키퍼가 골문에 붙어 있어서
   *    누가 달려와도 가장 가깝거든요. 무는 것은 **⚽ 골 쪽**이고, 대칭 논증의 **짐을 지는 절반**이
   *    거기라 그걸로 충분합니다(보고서 147번 §2에 적어 뒀어요). */
  {
    const WANT = { concede: "home", goal: "away" };
    const bad = [];
    let n = 0;
    for (const s of r.shots) {
      const m = String(s.label).match(/^(\w+)\/(\w+)\/flow=(\S+) 결과$/);
      const want = m && WANT[m[2]];
      if (!want) continue;
      n += 1;
      const near = s.dots
        .map((d) => ({ who: `${d.side}${d.gk ? "🧤" : d.me ? "🧡" : ""}`, side: d.side,
          dist: Math.hypot((d.cx - s.ball.x) / 100 * RENDER_W, (d.cy - s.ball.y) / 100 * RENDER_H) }))
        .sort((a, b) => a.dist - b.dist).slice(0, 2);
      if (!near.every((x) => x.side === want)) bad.push(`${s.label}: ${near.map((x) => `${x.who} ${x.dist.toFixed(0)}px`).join(" + ")} (계약 ${want} 둘)`);
    }
    check(bad.length === 0 && n > 0,
      `P-11. 🥅 **골망 옆 두 점은 「지키던 쪽」이다** — 🥅 골이면 상대 둘, 😣 실점이면 우리 둘 (${n}장)`
      + `\n     🔎 견주는 것: **어느 편인가**(값이 아니라 관계) · 격자: 실측 320px 판 ${RENDER_W}×${RENDER_H}px · \`concede\`·\`goal\` 결과 카드 전부`
      + (n === 0 ? `\n     🔴 잰 카드가 0장이에요 — \`walk()\`의 라벨 모양이 바뀌었는지 보세요 (이 문장은 지금 아무것도 안 지킵니다)`
        : bad.length ? bad.slice(0, 4).map((b) => `\n     🔴 ${b}`).join("")
          + `\n     🔑 **designer 148번이 «안 고침»으로 닫은 근거가 이 대칭입니다** — 깨졌으면 그 판정부터 다시 보세요`
          : `\n     🔑 이게 «실점 카드에 아무도 없다»가 **틀렸다**는 증거예요 — 공 옆엔 🧤 우리 키퍼와 🛡️ 우리 수비수가 섭니다`));
  }
  h.close();
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — **고치기 전에 빨간불이 뜨는지**
 * ══════════════════════════════════════════════════════════════
 * 🔴 **기준선이 초록불인지 먼저** 봅니다 — 이미 빨간불인 검사는 남의 변이 신호까지 먹어요. */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
if (fail > 0) console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);

/* 🧪🧤 M-GK · M-PUSH — **한 쌍의 양쪽**. 둘 다 P-1이 갈려야 합니다. */
for (const [name, label] of [["M_GK", "🧤 골키퍼를 x 10% → 7%로 (director가 본 그 상태)"],
  ["M_PUSH", "🧤 팀 밀림을 7 → 12로 (반대쪽에서 같은 사고)"]]) {
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

/* 🧪🧤 M-DEV — **①의 사고를 새 기구에서 다시 냅니다.** 자리도 밀림도 안 건드리는데 터져야 해요.
 * 🔑 P-1이 **셋째 항(겹의 어긋남)을 실제로 더하고 있는지**가 여기서 드러납니다 —
 *    안 더하면 이 변이가 **아무것도 안 잡습니다**(그게 이 검사가 눈이 먼 상태예요). */
if (!mutOK("M_DEV")) check(false, `🧪 **변이 M-DEV — 🧤 키퍼를 양쪽으로 보냄**${MUT_DEAD}`);
else {
  const h = scene(MUT.M_DEV);
  const r = await walk(h);
  const cut = [];
  for (const s of r.shots) for (const d of s.dots) if (d.gk && d.margin < 0) cut.push(`${s.label}: ${d.side} 🧤 ${d.cx.toFixed(1)}% (${d.margin.toFixed(1)}px)`);
  h.close();
  check(cut.length > 0,
    `🧪🧤 **변이 M-DEV — 🧤 키퍼 어긋남을 «가운데로만» → «양쪽으로»** → P-1이 빨간불`
    + `\n     잘린 상태 ${cut.length}개${cut.length ? " — 예: " + cut.slice(0, 3).join(" · ") : ""}`
    + (cut.length
      ? `\n     ✔ \`FORM_H\`도 \`PUSH\`도 그대로인데 잘립니다 — **P-1이 겹의 어긋남을 실제로 더하고 있다는 증거**`
      : `\n     🔴 키퍼를 골라인 쪽으로 밀었는데 초록불이에요 — **P-1이 겹의 어긋남을 안 읽고 있습니다**`
        + `\n        (\`dotsOf\`가 \`.w2-slot\`의 인라인 \`transform\`을 더하는지 보세요)`));
}

/* 🧪🏃 M-FLAT — 「겹 하나가 통째로 미끄러지던」 옛 그림으로 되돌립니다.
 * 🔑 **P-1·P-3은 초록불로 남아야** 합니다 — 판 밖으로 나가지도, 공이 엉뚱한 데 가지도 않으니까요.
 *    그게 P-4를 따로 둔 값어치예요: 옛 그림은 **기존 검사 전부를 통과했습니다.** */
if (!mutOK("M_FLAT")) check(false, `🧪 **변이 M-FLAT — 🏃 점마다 다른 자리를 없앰**${MUT_DEAD}`);
else {
  const h = scene(MUT.M_FLAT);
  const r = await walk(h);
  h.close();
  const sp2 = teamSpread(r.shots);
  const m2h = sp2.home[sp2.home.length >> 1], m2a = sp2.away[sp2.away.length >> 1];
  const cut = r.shots.reduce((a, s) => a + s.dots.filter((d) => d.margin < 0).length, 0);
  const broke = m2h < SPREAD_MED && m2a < SPREAD_MED;
  check(broke,
    `🧪🏃 **변이 M-FLAT — 팀 안의 모든 점이 \`push\`만큼 «똑같이»** → P-4가 빨간불`
    + `\n     우리 편 중앙 ${m2h.toFixed(2)}% · 상대 중앙 ${m2a.toFixed(2)}% (문턱 ${SPREAD_MED}%)`
    + (broke ? `\n     ✔ **옛 그림 그대로입니다** — 겹 하나가 통째로 7%/4% 미끄러지던 그 상태`
      : `\n     🔴 팀 안을 전부 같은 값으로 만들었는데 여전히 갈려요 —`
        + ` **같은 일을 하는 줄이 또 있습니다**(방어 겹침)`));
  /* ⚽ 그리고 **P-6도 같이 빨간불**이어야 합니다 — 어긋남이 공을 아예 안 보게 됐으니까요.
   * 🔑 P-4(서로 다른가)와 P-6(공을 따라가는가)은 **다른 문장**이라 둘 다 찍습니다. */
  {
    const bag = {};
    for (const s of r.shots) {
      if (s.push !== "a") continue;
      const at = s.ball.x >= 90 ? "end" : (s.ball.x >= 71 && s.ball.x <= 86) ? "mid" : null;
      if (!at) continue;
      for (const d of s.dots) if (d.side === "away" && !d.gk) (bag[`${d.x},${d.y}`] || (bag[`${d.x},${d.y}`] = { end: [], mid: [], x: d.x }))[at].push(d.dx);
    }
    const mn = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const rows = Object.values(bag).filter((v) => v.end.length && v.mid.length).map((v) => ({ x: v.x, d: mn(v.end) - mn(v.mid) }));
    const nr = rows.reduce((a, b) => (Math.abs(b.x - 97) < Math.abs(a.x - 97) ? b : a));
    const fr = rows.reduce((a, b) => (Math.abs(b.x - 97) > Math.abs(a.x - 97) ? b : a));
    const g = nr.d - fr.d;
    check(!(g >= NEARFAR_MIN),
      `🧪⚽ **변이 M-FLAT → P-6(공을 따라간다)도 빨간불** — 차이 ${g.toFixed(2)}% (문턱 ${NEARFAR_MIN}%)`
      + (g >= NEARFAR_MIN
        ? `\n     🔴 공에 붙는 항을 통째로 없앴는데 여전히 따라가요 — **같은 일을 하는 줄이 또 있습니다**`
        : `\n     ✔ 어긋남이 \`dir\` 하나만 보게 되어 공이 어디 있든 같은 자리에 섭니다`));
  }

  /* 🧤 키퍼는 M-FLAT에서도 제자리예요(`role === "gk"`면 0) — **P-1·P-5는 초록불로 남아야** 합니다.
   *    그게 P-4를 따로 둔 값어치입니다: 옛 그림은 **기존 검사를 전부 통과했어요.** */
  const gkOff = r.shots.reduce((a, s) => a + s.dots.filter((d) =>
    d.gk && (d.cy < GK_Y[0] || d.cy > GK_Y[1] || (d.side === "home" ? d.cx > GK_X : d.cx < 100 - GK_X))).length, 0);
  check(cut === 0 && gkOff === 0,
    `🧪 **변이 M-FLAT → P-1(잘림)·P-5(키퍼)는 초록불로 남아야** 한다 — 잘린 점 ${cut}개 · 골문 떠난 키퍼 ${gkOff}개`
    + (cut === 0 && gkOff === 0
      ? `\n     🔑 **옛 그림(겹 하나가 통째로 밀림)은 기존 검사를 전부 통과했습니다.**`
        + ` «미끄러진다»는 잘림도 색도 아니라 **아무도 안 보던 자리**였어요`
      : `\n     🔴 문장이 섞였어요 — M-FLAT이 P-1/P-5까지 갈랐습니다 (변이가 너무 넓습니다)`));
}

/* 🧪🌊 M-SIDE — `card.flow` 줄을 끊습니다. P-7이 갈려야 해요.
 * 🔑 이게 안 잡히면 **밀림을 두 군데서 켜고 있다**는 뜻입니다(방어 겹침). */
if (!mutOK("M_SIDE")) check(false, `🧪 **변이 M-SIDE — 🌊 flow 줄을 끊음**${MUT_DEAD}`);
else {
  const g = await p7(MUT.M_SIDE);
  const dead = g.a === "—" && g.h === "—";
  check(dead,
    `🧪🌊 **변이 M-SIDE — \`side = at[2] || card.flow…\` → \`side = at[2]\`** → P-7이 빨간불`
    + `\n     flow=a → ${g.a} · h → ${g.h}`
    + (dead
      ? `\n     ✔ 흐름을 실어 보내도 판이 한 칸도 안 움직입니다 — 이 줄이 **유일한 배선**이에요`
      : `\n     🔴 줄을 끊었는데 여전히 밀려요 — **같은 일을 하는 줄이 또 있습니다**`
        + ` (\`BALL_FLOW\`의 세 번째 칸에 밀림을 같이 적지 않았는지 보세요)`));
}

/* 🧪🧤 M-GKY — 키퍼가 공을 세로로 너무 쫓아갑니다. P-5가 갈리고 **P-1은 초록불로 남아야** 해요. */
if (!mutOK("M_GKY")) check(false, `🧪 **변이 M-GKY — 🧤 키퍼가 공을 세로로 과하게 쫓음**${MUT_DEAD}`);
else {
  const h = scene(MUT.M_GKY);
  const r = await walk(h);
  h.close();
  let outY = 0, cut = 0;
  for (const s of r.shots) for (const d of s.dots) {
    if (d.gk && (d.cy < GK_Y[0] || d.cy > GK_Y[1])) outY += 1;
    if (d.margin < 0) cut += 1;
  }
  check(outY > 0 && cut === 0,
    `🧪🧤 **변이 M-GKY — \`GK_TRACK\` 0.25 → 1.2** → P-5가 빨간불 · P-1은 초록불`
    + `\n     골대 밖으로 나간 키퍼 **${outY}개** · 잘린 점 ${cut}개`
    + (outY > 0 && cut === 0
      ? `\n     ✔ **판 안에는 있는데 골문에 없습니다** — P-1이 못 보는 자리를 P-5가 봅니다`
      : outY === 0
        ? `\n     🔴 세로로 두 배 넘게 쫓게 했는데 초록불이에요 — P-5가 y를 안 보고 있습니다`
        : `\n     🔴 P-1까지 갈렸어요 — 두 문장이 섞였습니다`));
}

/* 🧪⚽ M-STAND — 점이 공 둘레를 안 비웁니다. **P-8만** 갈려야 합니다.
 * 🔑 「같은 모양의 흠 세 번째」의 자리예요 (🧤 키퍼 실종 → 🧤 키퍼가 공과 겹침 → 🧡 내가 숨음). */
if (!mutOK("M_STAND")) check(false, `🧪 **변이 M-STAND — ⚽ 공 둘레를 안 비움**${MUT_DEAD}`);
else {
  const h = scene(MUT.M_STAND);
  const r = await walk(h);
  const meScale = parseFloat((readSrc("style.css", null)
    .match(/\.w2-pitch\.mine \.w2-dot\.me[^}]*scale\(([\d.]+)\)/) || [0, 1])[1]);
  let over = 0, worst = Infinity, cut = 0;
  for (const s of r.shots) for (const d of s.dots) {
    const rd = (d.w / 2) * (d.me ? meScale : 1);
    const dx = (d.cx - s.ball.x) / 100 * RENDER_W, dy = (d.cy - s.ball.y) / 100 * RENDER_H;
    const gap = Math.hypot(dx, dy) - rd - s.ball.w / 2;
    if (gap < 0) over += 1;
    if (gap < worst) worst = gap;
    if (d.margin < 0) cut += 1;
  }
  h.close();
  const caught = over > OVERLAP_N_CAP || worst < OVERLAP_PX_CAP;
  check(caught && cut === 0,
    `🧪⚽ **변이 M-STAND — \`STANDOFF\` 8 → 0** → P-8이 빨간불 · P-1은 초록불`
    + `\n     겹치는 상태 **${over}개**(상한 ${OVERLAP_N_CAP}) · 최악 **${worst.toFixed(2)}px**(상한 ${OVERLAP_PX_CAP}) · 잘린 점 ${cut}개`
    + (caught && cut === 0
      ? `\n     ✔ **판 안에는 있는데 공을 덮습니다** — P-1이 못 보는 자리를 P-8이 봅니다`
      : cut > 0 ? `\n     🔴 P-1까지 갈렸어요 — 두 문장이 섞였습니다`
        : `\n     🔴 공 둘레를 통째로 없앴는데 상한 안이에요 — P-8이 겹침을 안 보고 있습니다`));
}

/* 🧪🏁 M-WHISTLE — 휘슬을 흐름 줄과 같은 옷으로. **P-9만** 갈려야 합니다. */
if (!mutOK("M_WHISTLE")) check(false, `🧪 **변이 M-WHISTLE — 🏁 휘슬을 흐름 줄과 같은 클래스로**${MUT_DEAD}`);
else {
  const h = scene(MUT.M_WHISTLE);
  await walk(h);
  const wEl = h.D.querySelector(".w2-card.whistle");
  const fEl = h.D.querySelector(".w2-card.filler");
  h.close();
  check(!wEl && !!fEl,
    `🧪🏁 **변이 M-WHISTLE — \`kick\`·\`end\`를 \`filler\` 클래스로** → P-9가 빨간불`
    + `\n     \`whistle\` 카드 ${wEl ? "**남아 있음**" : "0장 ✔"} · \`filler\` 카드 ${fEl ? "있음 ✔" : "**없음**"}`
    + (!wEl && !!fEl
      ? `\n     ✔ P-9가 «둘 다 있어야 견줍니다»로 빨간불을 냅니다 — 옷이 하나로 합쳐진 상태예요`
      : `\n     🔴 변이가 클래스를 못 갈았습니다 — 정규식을 다시 보세요`));
}

/* 🧪⏳ M-STAG — 출발 시차를 없앱니다. **P-10만** 갈려야 합니다.
 * 🔑 🧡 나(13ms)는 따로라 **2종은 남습니다** — 「0이 아닌가」로 재면 안 잡히는 자리예요. */
if (!mutOK("M_STAG")) check(false, `🧪 **변이 M-STAG — ⏳ 출발 시차 제거**${MUT_DEAD}`);
else {
  const h = scene(MUT.M_STAG);
  const delays = [...new Set([...h.D.querySelectorAll(".w2-slot")]
    .map((e) => String(e.style.transitionDelay).trim()).filter(Boolean))];
  h.close();
  check(delays.length < 3,
    `🧪⏳ **변이 M-STAG — \`(i % 4) * 26\` → \`0\`** → P-10이 빨간불`
    + `\n     남은 시차 ${delays.length}종 (${delays.join(" · ")})`
    + (delays.length < 3
      ? `\n     ✔ **0이 안 됩니다 — 2종이 남아요.** 「0이 아닌가」로 재는 검사는 여기서 조용히 통과합니다`
      : `\n     🔴 시차가 그대로예요 — 변이가 마크업을 못 갈았습니다`));
}

/* 🧪🥅 M-ATTACK — designer 148번이 **안 하기로 한 그 변경**의 모양. **P-11만** 갈려야 합니다. */
if (!mutOK("M_ATTACK")) check(false, `🧪 **변이 M-ATTACK — 🥅 공격수를 골망 옆까지**${MUT_DEAD}`);
else {
  const h = scene(MUT.M_ATTACK);
  const r = await walk(h);
  h.close();
  const WANT = { concede: "home", goal: "away" };
  const by = { concede: 0, goal: 0 };
  let n = 0;
  for (const s of r.shots) {
    const m = String(s.label).match(/^(\w+)\/(\w+)\/flow=(\S+) 결과$/);
    const want = m && WANT[m[2]];
    if (!want) continue;
    n += 1;
    const near = s.dots
      .map((d) => ({ side: d.side, dist: Math.hypot((d.cx - s.ball.x) / 100 * RENDER_W, (d.cy - s.ball.y) / 100 * RENDER_H) }))
      .sort((a, b) => a.dist - b.dist).slice(0, 2);
    if (!near.every((x) => x.side === want)) by[m[2]] += 1;
  }
  const caught = by.goal + by.concede > 0;
  check(caught,
    `🧪🥅 **변이 M-ATTACK — \`PULL.fwd/wing\` ↑ · \`RANGE\` 46 → 200** → P-11이 빨간불`
    + `\n     계약이 깨진 카드 **${by.goal + by.concede} / ${n}** (🥅 골 ${by.goal} · 😣 실점 ${by.concede})`
    + (caught
      ? `\n     ✔ 🥅 **골 쪽에서 뭅니다.** 😣 실점 쪽은 🧤 우리 키퍼가 골문에 붙어 있어 누가 달려와도 안 깨져요 —`
        + ` 대칭 논증의 **짐을 지는 절반**이 골 쪽이라 그걸로 섭니다`
      : `\n     🔴 공격수를 골망까지 끌어왔는데 초록불이에요 — P-11이 「어느 편인가」를 안 보고 있습니다`));
}

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 전부 통과");
process.exit(fail ? 1 : 0);
}

main();
