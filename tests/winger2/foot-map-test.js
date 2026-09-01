/* 🦶 🗺️ ⚽ 더 윙어 II — **주발 화면이 판정과 같은 쪽인지** · **지역이 산식에 안 닿는지**
 *
 * 🔴 **이 파일이 생기기 전까지 이 자리를 지키는 검사가 0건이었습니다.**
 *    · 🦶 주발이 `#screen-name`의 작은 토글에서 **자기 화면**으로 나갔는데(director 94번),
 *      그 화면이 그리는 판정 창이 **실제 판정과 같은 쪽인지** 보는 검사가 없었어요.
 *      2026-08-29에 정확히 그 자리에서 사고가 났습니다 — **넓다고 색칠된 쪽이 좁은 쪽**이었죠.
 *    · 🗺️ 지역이 세이브(`S.origin`)에 들어갔는데 **어떤 계수에도 안 닿는지**를
 *      지키는 검사가 없었습니다. designer 79번 위험표가 *"고르는데 효과가 없다"*는
 *      압박이 **반드시 온다**고 적어 뒀어요 — 그때 누가 `fit`이나 `spot`에 한 줄 겁니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-09-01 · designer 93번 §3·§4 · director 94번 §2·§3-4·§5-2)
 *
 *   · 🦶 주발은 **자기 화면(`#screen-foot`)**을 가지고, 탭이 곧 답입니다(다음 버튼 없음)
 *   · 🦶 화면의 판정 창 폭 = `winger-moment.js`의 `FOOT_WIN`. **화면이 상수를 따라갑니다**
 *   · 🔑 **오른발잡이면 오른쪽이 넓습니다** — `const right = foot !== "L"`.
 *     화면(intro.js)과 판정(winger-moment.js)이 **같은 모양**으로 씁니다
 *   · 🗺️ 지역은 **텍스트와 기록만** 바꿉니다. `autoP`·`fit`·`spotMul`·`growth`·`debut`
 *     어디에도 안 닿아요 (designer 93번 §0 ② — 「지역은 텍스트만 바꾼다」)
 *   · 🗺️ `S.origin`은 **마이그레이션이 없습니다.** 옛 세이브는 읽는 쪽 기본값(🌍 미상)
 *   · 🏛️ 지역별 기록의 **유일한 출처**는 `career.js`의 헌액 `origin` 한 줄입니다
 *
 * ⚠️ **판정이 바뀌면 뒤집히는 문장들 — 값을 고치기 전에 이 파일을 먼저 여세요**
 *   · 「출신 지역에 보너스를 주자」는 판정이 나오면 **O-2가 통째로 옛 계약**이 됩니다
 *   · 「왼발잡이가 왼쪽이 좁다」처럼 판정 쪽이 바뀌면 **F-2가 옛 계약**이 됩니다
 *     (F-2는 값이 아니라 **화면과 판정이 같은 쪽인가**를 보니, 둘을 같이 바꾸면 그대로 삽니다)
 *
 * ⏳ **곧 죽을 것에는 일부러 검사를 안 걸었습니다** (designer 93번 §10 「버려지는 것」):
 *     `rollOffers`의 절대 점수 밴드 · `CARDS` 3장 배열 ·
 *     `#position-list .card` → `screen-town` 흐름 · `WingerIntro.STEPS`의 "2 / 4".
 *   🏫 학교 3단계가 들어오면 저것들은 사라집니다 — 거기 검사를 걸면 그날 통째로 빨간불이에요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **산식은 소스에서 정규식으로**(`FOOT_WIN`) · **문턱은 여기 박고**(17 · 9 · 8 · 5) ·
 *      **종속값은 관계식으로**(폭의 비 · 좌우가 같은 쪽 · 궤적이 비트 단위로 같다)
 *   ③ **게임 입구를 통해** — 타이틀부터 실제 버튼을 눌러 갑니다
 *      (pointerdown → pointerup → click, 실기기 순서 그대로)
 *   ④ **시드 하나로 안 잽니다** — O-2는 시드 둘의 궤적을 각각 봅니다
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인합니다 (안 걸리면 ❌ 한 줄, 죽지 않아요)
 *      그리고 **변이 검증 전에 기준선이 초록불인지** 먼저 찍습니다 (92번 §2)
 *
 * 🚧 **여기서 못 보는 것** — 보고서 §검증 불가로 넘겼습니다:
 *     발 두 짝이 「한눈에」 다른지 · 지도가 한국으로 보이는지 · 320ms가 적당한지 ·
 *     탭 칸의 실제 px(jsdom에 레이아웃이 없어요) · `body.wc-mode`의 색.
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음(안 돌았음) — `_load.js`가 걸어 줍니다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, PAGE_DIR, passTown } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 문턱 — **전부 여기 박습니다.** 소스에서 읽어 오지 않아요.
 *    (여기를 소스에서 읽으면 목록을 줄여도 검사가 따라가서 아무것도 안 잡힙니다)
 * ══════════════════════════════════════════════════════════════ */
const N_REGIONS = 17;       // 🗺️ 한국 17개 시·도 — 전부 고를 수 있어야 해요
const N_DO = 9;             // 🏞️ 도 9곳 — 지도 폴리곤을 직접 탭
const N_CITY = 8;           // 🏙️ 특별시·광역시 8곳 — 지도엔 핀, 탭은 옆 목록
const N_TIER = 5;           // 🏟️ 제안 등급 다섯 (☆ ~ ⭐⭐⭐⭐)
/* 🌱 O-2가 견주는 궤적 길이. 🔴 **훈련이어야 합니다 — 🛌 휴식은 `m.growth`를 안 탑니다.**
 * 처음엔 휴식 10턴이었는데, 그러면 O-2의 「궤적」 부분이 아무것도 안 지켜요
 * (M3b가 그걸 잡아냈습니다 — spotOf만 보고 통과하고 있었어요).
 * 6턴째에 🏆 평가전이 열려 훈련 버튼이 잠기니 그 앞에서 멈춥니다. */
const TURNS = 5;
const TRAIN_KEYS = ["shoot", "pass", "dribble", "defense", "stamina"];
const SEEDS = [9, 27];      // 🎲 시드 하나로 안 잽니다
const EPS = 0.005;          // 폭이 toFixed(2)라 반올림 여유만
const FROZEN_NOW = 1756700000000;   // ⏱️ Date.now 고정 — 두 판의 궤적을 비트로 견주려고요

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **M1 — 🦶가 판정 창에 안 닿습니다 (옛 「죽은 스위치」 복원).**
   *    입단 전에 발을 고르게 해놓고 효과가 0이던 2026-08-30 이전 상태예요.
   *    화면(intro.js)은 그대로 좌우를 뒤집어 그리는데 **판정만 늘 오른발**이 됩니다
   *    — 오류도 경고도 안 나요. 화면이 **거짓말**을 하는 그 형태입니다. */
  M1_DEAD_FOOT: { "winger-moment.js": [[/const right = ctx\.foot !== "L";/g, "const right = true;"]] },
  /* 🔴 **M2 — 🦶 화면의 좌우를 판정과 반대로.** 2026-08-29에 실제로 났던 사고
   *    (*"넓다고 색칠된 쪽이 실제로는 좁은 쪽"*)를 그대로 되살립니다.
   *    한쪽만 고치면 또 갈라지는 자리라, 검사가 **둘을 같이** 봐야 해요. */
  M2_FLIP_SCREEN: { "intro.js": [[/const right = foot !== "L";/, 'const right = foot === "L";']] },
  /* 🔴 **M3 — 「출신 보너스」.** designer 79번 위험표가 *"고르는데 효과가 없다"*는
   *    압박이 **반드시 온다**고 적어 둔 그 자리예요. 좋은 뜻으로 한 줄 붙입니다.
   *    🔑 지역이 `spot`에 닿는 순간 「텍스트만 바꾼다」가 깨집니다. */
  M3_ORIGIN_BONUS: { "game.js": [[/const spotOf = \(m\) => \(\(m && m\.spot\) \|\| 1\) \* \(\(S && S\.spotMul\) \|\| 1\);/,
    'const spotOf = (m) => ((m && m.spot) || 1) * ((S && S.spotMul) || 1) * ((S && S.origin === "seoul") ? 1.10 : 1);']] },
  /* 🔴 **M3b — 같은 압박의 다른 축.** 이번엔 `growth`(36턴 복리)에 걸어요.
   *    🔑 M3만 두면 O-2가 「digest에 spotOf를 넣어서 잡힌 것」일 수 있습니다 —
   *    **궤적 자체에도 해상도가 있는지**를 이 변이가 증명합니다. */
  M3B_GROWTH: { "game.js": [[/\* m\.growth \* condMod/,
    '* m.growth * ((S && S.origin === "seoul") ? 1.02 : 1) * condMod']] },
  /* 🔴 **M4 — 화면만 옛말.** 상수(`FOOT_WIN`)를 바꿨는데 🦶 화면이 안 따라갑니다.
   *    두 파일을 같이 건드려야 재현돼요 — intro.js가 지금은 **읽어 오기** 때문입니다.
   *    이 변이가 안 잡히면 「폭을 소스에서 읽어 온다」가 아무것도 안 지키는 거예요. */
  M4_STALE_WIDTH: {
    "winger-moment.js": [[/const FOOT_WIN = 0\.25;/, "const FOOT_WIN = 0.40;"]],
    "intro.js": [[/return K && typeof K\.FOOT_WIN === "number" \? K\.FOOT_WIN : 0\.25;/, "return 0.25;"]],
  },
  /* 🔴 **M5 — 🏟️ 제안 등급 색을 다시 뒤집습니다.** director가 렌더로 잡은 그 상태
   *    (중립 t2가 그 위 t3보다 **밝았어요**). 색상을 섞으면 밝기 순서가 뒤집힙니다. */
  M5_TIER_COLOR: { "style.css": [[/\.card\.offer-t2 \{ border-color: #9a8a52; \}/,
    ".card.offer-t2 { border-color: #6fc9ff; }"]] },
  /* 🔴 **M6 — 헌액에서 `origin`을 뺍니다.** 🏛️ 지역 기록의 **유일한 출처**예요.
   *    빼면 오류 없이 **영원히 「아직 없어요」**가 됩니다 — 조용히 실패하는 자리입니다. */
  M6_NO_HOF_ORIGIN: { "career.js": [[/ {6}origin: \(S\.origin \|\| ""\),\n/, ""]] },
  /* 🔴 **M7 — 🏙️ 광역시 목록을 4곳으로 줄입니다.** 지도에 핀은 그대로 찍혀 있는데
   *    **누를 데가 없어져요.** 화면이 안 깨지니 눈으로는 「없는 지역」처럼 보입니다. */
  M7_SHORT_CITIES: { "intro.js": [[/return REGIONS\.filter\(\(r\) => r\.pin\)\.map\(\(r\) =>/,
    "return REGIONS.filter((r) => r.pin).slice(0, 4).map((r) =>"]] },
};

/* 🔎 `_load.js`의 `pageMutsOK`는 `beta/winger2/` 안만 봅니다 — 여기는 `../winger-moment.js`도
 * 쓰니 경로를 직접 풉니다. **던지지 않고 목록을 돌려줘요**(죽는 것보다 빨간불이 낫습니다). */
function srcPathOf(file) {
  const a = path.join(PAGE_DIR, file);
  return fs.existsSync(a) ? a : path.join(PAGE_DIR, "..", file);
}
function mutsOK(table) {
  const bad = [];
  for (const [name, byFile] of Object.entries(table || {})) {
    for (const [file, muts] of Object.entries(byFile)) {
      const p = srcPathOf(file);
      if (!fs.existsSync(p)) { bad.push(`${name} → ${file}: 파일이 없어요 (${p})`); continue; }
      const src = fs.readFileSync(p, "utf8");
      for (const [re] of muts) {
        if (!src.match(re)) bad.push(`${name} → ${file}: ${re}`);
        else if (src.replace(re, " ") === src) bad.push(`${name} → ${file}(치환 무효): ${re}`);
      }
    }
  }
  return bad;
}
{
  const bad = mutsOK(MUT);
  const n = Object.values(MUT).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 소스에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}
const mutOK = (name) => mutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 📐 **산식은 소스에서 뜯어옵니다** — 값을 베껴 적지 않아요
 * ══════════════════════════════════════════════════════════════
 * 🦶 판정 창 ±%는 `winger-moment.js`가 정합니다. 여기에 0.25를 적어 두면
 * 상수를 바꾼 날 **검사도 화면도 옛말**을 하게 돼요. */
const MSRC0 = fs.readFileSync(srcPathOf("winger-moment.js"), "utf8");
function footWinOf(src) {
  const m = src.match(/const FOOT_WIN = ([0-9.]+);/);
  return m ? parseFloat(m[1]) : null;
}

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 닿습니다
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function boot(o) {
  const opt = o || {};
  const W = bootPage({ keys: opt.keys, muts: opt.muts });
  if (opt.seed != null) {
    W.Math.random = mulberry32(opt.seed);
    if (W.WingerEngine && W.WingerEngine._t) W.WingerEngine._t.seed(opt.seed);
  }
  /* ⏱️ **시계를 멈춥니다** — O-2는 두 판의 궤적을 비트 단위로 견주는데, 세이브에
   * 시각 칸이 하나라도 있으면 그것만으로 갈라져요(고장이 아니라 시계 때문에). */
  W.Date.now = () => FROZEN_NOW;
  /* ☁️ **클라우드 전송만 꺼 둡니다** — 이 검사가 재는 것과 무관한 곁가지인데,
   * ① `fetch`가 즉시 거절되고 그 `.catch`가 창을 닫은 **뒤에** 돌면 `document`가
   *    이미 없어서 검사가 통째로 죽고(💥 종료 2),
   * ② 위에서 시계를 멈춰 놔서 `touch()`의 `Date.now() - lastPush > PUSH_GAP`이
   *    **매 저장마다** 참이 됩니다.
   * 세이브 내용에는 손대지 않아요 — 올리는 일만 안 합니다.
   * 🔑 `fetch`를 **영원히 안 끝나는 약속**으로 둡니다. `bootPage`의 기본값은 즉시
   *    거절인데, 그 거절 처리가 창을 닫은 뒤에 도는 순간 💥가 나요. */
  if (W.Cloud) W.Cloud.touch = () => {};
  W.fetch = () => new Promise(() => {});
  const si = W.setInterval;
  W.setInterval = (fn) => si(fn, 1);
  const D = W.document;
  let taps = 0;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    taps += 1;
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  return { W, D, press, taps: () => taps,
    S: () => W.__get("S"),
    active: () => (D.querySelector(".screen.active") || {}).id,
    close: () => W.close() };
}

/* 🚪 타이틀 → ✏️ 이름 → 🦶 주발 화면 */
function toFoot(h) {
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  return h;
}
/* ⏳ 발을 누르면 ⚽ 공이 굴러들고 **그 뒤에** 넘어갑니다.
 * ⚠️ **320ms를 안 박습니다** — 「화면이 바뀔 때까지」를 기다려요(♿ reduce면 즉시입니다). */
async function tapFoot(h, foot) {
  h.press(h.D.querySelector(`#screen-foot .foot-card[data-foot="${foot}"]`),
    `🦶 ${foot === "L" ? "왼발" : "오른발"}`);
  for (let i = 0; i < 400 && h.active() === "screen-foot"; i++) await wait(3);
  if (h.active() === "screen-foot")
    throw new Error("🦶 발을 눌렀는데 화면이 안 넘어가요 — openFoot의 done 배선을 보세요");
}
/* 🗺️ 지역 하나를 골라 다음으로. 🏞️ 도는 지도 폴리곤 · 🏙️ 광역시는 옆 목록입니다. */
function pickOrigin(h, id) {
  const el = h.D.querySelector(`#origin-map .om-do[data-id="${id}"]`)
    || h.D.querySelector(`#origin-cities .om-city[data-id="${id}"]`);
  h.press(el, `🗺️ ${id}`);
  h.press(h.D.getElementById("btn-origin-next"), "🏘️ 동네 대회로");
}

/* ══════════════════════════════════════════════════════════════════════
 * F. 🦶 **주발 화면이 판정과 같은 쪽인가** — 화면과 판정을 **같이** 엽니다
 * ══════════════════════════════════════════════════════════════════════
 * 🔑 한쪽만 읽으면 절대 안 보이는 결함이에요. 그래서 한 창 안에서
 *    ① 🦶 화면(`intro.js`가 그린 `.fg-lane`)과
 *    ② 💨 컷인 카드(`winger-moment.js`가 그린 `.w2m-gate`)
 *    ③ ⚡ 1:1 카드(`.w2m-half`)
 *    **셋을 다 그려 놓고 같은 쪽을 가리키는지** 봅니다.
 *
 * ⚠️ 소스에서 `const right = ...`를 문자열로 찾지 않습니다 — 그건 배선이 죽어도
 *    통과하는 그 형태예요. **진짜 렌더 결과**를 읽습니다.
 * ══════════════════════════════════════════════════════════════════════ */
const F_NUM = (s) => { const m = String(s == null ? "" : s).match(/([0-9.]+)/); return m ? parseFloat(m[1]) : NaN; };

/* 🦶 화면이 그린 두 칸. 넓은 쪽이 어디이고 무슨 클래스인지 그대로 가져와요. */
function screenLanes(h, foot) {
  const card = h.D.querySelector(`#screen-foot .foot-card[data-foot="${foot}"]`);
  if (!card) return null;
  const lanes = Array.from(card.querySelectorAll(".fg-lane")).map((l) => ({
    side: l.dataset.side,
    w: F_NUM(((l.getAttribute("style") || "").match(/flex:\s*([0-9.]+)/) || [])[1]),
    strong: l.classList.contains("w2m-strong"),
    weak: l.classList.contains("w2m-weak"),
  }));
  if (lanes.length !== 2) return null;
  return lanes[0].side === "left" ? lanes : [lanes[1], lanes[0]];   // 늘 [왼쪽, 오른쪽]
}
/* 💨 컷인 · ⚡ 1:1 카드를 **진짜로 그려서** 강한 쪽을 읽습니다.
 * `W2Moment.play`는 준비 화면부터 띄우니 ▶️ 시작을 실제로 눌러요. */
async function judgeLanes(h, moment, foot) {
  const div = h.D.createElement("div");
  h.D.body.appendChild(div);
  h.W.W2Moment.play(div, { moment, foot, condition: 80, kind: "goal" }, () => {});
  for (let i = 0; i < 200 && !div.querySelector(".w2m-go"); i++) await wait(3);
  const go = div.querySelector(".w2m-go");
  if (!go) { div.remove(); return null; }
  h.press(go, "▶️ 시작");
  for (let i = 0; i < 200 && !div.querySelector(".w2m-gate, .w2m-half"); i++) await wait(3);
  const sel = moment === "cutin" ? ".w2m-gate" : ".w2m-half";
  const out = Array.from(div.querySelectorAll(sel)).map((g) => ({
    left: F_NUM(g.style.left), w: F_NUM(g.style.width),
    strong: g.classList.contains("w2m-strong"),
  }));
  div.remove();
  return out.length === 2 ? out.sort((a, b) => a.left - b.left) : null;   // 늘 [왼쪽, 오른쪽]
}

console.log("── 🦶 F. 주발 화면과 판정이 같은 쪽인가 ──");

async function runF(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  toFoot(h);
  const r = { screen: h.active(), taps: h.taps() };
  /* 🔒 🦶 화면 **직속** 조작 — 발 두 짝 + ← 뒤로. 「다음」이 붙으면 탭이 하나 늘어요 */
  r.own = Array.from(h.D.querySelectorAll("#screen-foot button")).map((b) => b.id || b.className);
  r.cards = Array.from(h.D.querySelectorAll("#screen-foot .foot-card")).map((c) => c.dataset.foot);
  r.lanes = { L: screenLanes(h, "L"), R: screenLanes(h, "R") };
  r.cut = { L: await judgeLanes(h, "cutin", "L"), R: await judgeLanes(h, "cutin", "R") };
  r.one = { L: await judgeLanes(h, "oneone", "L"), R: await judgeLanes(h, "oneone", "R") };
  h.close();
  return r;
}

/* 🔒 술어를 **함수로** 둡니다 — 변이 검사가 기준선과 **같은 자**를 쓰게요.
 * (변이 검사가 다른 문장을 지키면 둘 다 초록불인 상태가 생깁니다) */
const F_PRED = {
  /* F-2. 왼쪽이 강한 쪽 ⟺ 왼발. 화면·컷인·1:1 **셋이 다 같은 말**을 해야 합니다.
   *      🔑 값(1.667)이 아니라 **관계**예요 — 폭이 바뀌어도 이 문장은 삽니다. */
  sameSide: (r) => {
    const L = (a) => !!(a && a[0].strong && !a[1].strong);      // 왼쪽이 강
    const R = (a) => !!(a && !a[0].strong && a[1].strong);      // 오른쪽이 강
    const rows = [
      ["🦶 화면", L(r.lanes.L), R(r.lanes.R)],
      ["💨 컷인", L(r.cut.L), R(r.cut.R)],
      ["⚡ 1:1", L(r.one.L), R(r.one.R)],
    ];
    return { ok: rows.every(([, a, b]) => a && b), rows };
  },
  /* F-3. 🎨 **넓은 칸에 강한 색이 칠해져 있다.** 2026-08-29 사고의 정확한 형태예요 —
   *      한쪽만 고치면 폭과 색이 갈라집니다. 클래스 이름까지 판정 카드와 같은 것을 씁니다. */
  colorMatchesWidth: (r) => ["L", "R"].every((f) => {
    const l = r.lanes[f];
    if (!l) return false;
    const wide = l[0].w > l[1].w ? l[0] : l[1];
    const narrow = l[0].w > l[1].w ? l[1] : l[0];
    return wide.strong && !wide.weak && narrow.weak && !narrow.strong;
  }),
  /* F-1. 📐 폭의 비 = (1+FOOT_WIN)/(1−FOOT_WIN). **FOOT_WIN은 소스에서 뜯어옵니다.** */
  ratio: (r, w) => {
    const want = (1 + w) / (1 - w);
    const got = [];
    for (const f of ["L", "R"]) {
      for (const src of [r.lanes[f], r.cut[f]]) {
        if (src) got.push(Math.max(src[0].w, src[1].w) / Math.min(src[0].w, src[1].w));
      }
    }
    return { ok: got.length === 4 && got.every((v) => Math.abs(v - want) <= EPS * want), want, got };
  },
};

const base = {};
async function F() {
  const r = await runF(null);
  base.F = r;
  const W0 = footWinOf(MSRC0);
  check(r.screen === "screen-foot" && r.cards.join("") === "LR" && !!r.cut.L && !!r.one.L,
    `F-0. 🚪 게임 입구 → ✏️ 이름 다음 → **🦶 주발이 자기 화면**으로 뜬다 (${r.screen} · 카드 ${r.cards.join("/")})`
    + `\n     🔎 측정 조건 — 화면·💨 컷인·⚡ 1:1을 한 창에 다 그렸습니다`
    + ` (컷인 ${r.cut.L ? "✔" : "🔴 못 그림"} · 1:1 ${r.one.L ? "✔" : "🔴 못 그림"})`);
  check(r.own.length === 3 && r.own.filter((x) => /foot-card/.test(x)).length === 2
    && r.own.indexOf("btn-back-foot") >= 0,
    `F-0a. 🔒 🦶 화면의 조작은 **발 두 짝 + ← 뒤로**뿐이다 — 「다음」이 없다(탭이 곧 답)`
    + `\n     화면 직속 버튼: ${r.own.join(" · ")}`
    + (r.own.length === 3 ? "" : `\n     🔴 버튼이 늘었어요 — 「다음」을 붙이면 탭이 2회가 되고 첫 순간 카드가 그만큼 밀립니다`));

  const ra = F_PRED.ratio(r, W0);
  check(W0 != null && ra.ok,
    `F-1. 📐 **판정 창 폭의 비 = (1+FOOT_WIN)/(1−FOOT_WIN) = ${ra.want.toFixed(4)}**`
    + ` — FOOT_WIN ${W0}은 winger-moment.js에서 **뜯어온 값**이에요(안 베꼈습니다)`
    + `\n     🦶 화면 L · 💨 컷인 L · 🦶 화면 R · 💨 컷인 R = ${ra.got.map((v) => v.toFixed(4)).join(" / ") || "(못 쟀어요)"}`
    + (ra.ok ? "" : `\n     🔴 화면이 상수를 안 따라갑니다 — **화면만 옛말**을 하고 있어요`));

  const ss = F_PRED.sameSide(r);
  check(ss.ok,
    `F-2. 🔑 **오른발이면 오른쪽이 넓다 — 화면·💨 컷인·⚡ 1:1 셋이 같은 쪽**을 가리킨다`
    + `\n     ${ss.rows.map(([n, a, b]) => `${a && b ? "🟢" : "🔴"} ${n}(왼발→왼쪽 ${a ? "✔" : "✘"} · 오른발→오른쪽 ${b ? "✔" : "✘"})`).join(" · ")}`
    + (ss.ok ? "" : `\n     🔴 화면이 판정과 **반대**를 가리키면 🦶는 보이는 게 아니라 거짓말입니다 (2026-08-29 사고)`));

  check(F_PRED.colorMatchesWidth(r),
    `F-3. 🎨 **넓은 칸에 강한 색(w2m-strong)이 칠해져 있다** — 판정 카드와 같은 클래스를 씁니다`
    + `\n     ${["L", "R"].map((f) => `${f}: ${(r.lanes[f] || []).map((l) => `${l.side} ${l.w}${l.strong ? "(강)" : l.weak ? "(약)" : "(?)"}`).join(" / ")}`).join("   ")}`);
}

/* ══════════════════════════════════════════════════════════════════════
 * O. 🗺️ **지역은 텍스트만 바꾼다** (designer 93번 §0 ②)
 * ══════════════════════════════════════════════════════════════════════ */
async function runOrigins(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  toFoot(h);
  await tapFoot(h, "R");
  const D = h.D;
  const ids = h.W.WingerIntro.REGIONS.map((x) => x.id);
  const dos = Array.from(D.querySelectorAll("#origin-map .om-do")).map((p) => p.dataset.id);
  const cities = Array.from(D.querySelectorAll("#origin-cities .om-city")).map((b) => b.dataset.id);
  const pins = Array.from(D.querySelectorAll("#origin-map .om-pin")).map((c) => c.dataset.id);
  /* 🖐️ **하나하나 실제로 눌러 봅니다** — 「목록에 있다」가 아니라 「눌러서 골라진다」예요 */
  const unreachable = [], stories = {};
  for (const id of ids) {
    const el = D.querySelector(`#origin-map .om-do[data-id="${id}"]`)
      || D.querySelector(`#origin-cities .om-city[data-id="${id}"]`);
    if (!el) { unreachable.push(id); continue; }
    h.press(el, `🗺️ ${id}`);
    const place = (D.querySelector("#origin-story .om-place") || {}).textContent || "";
    const line = (D.querySelector("#origin-story .om-story") || {}).innerHTML || "";
    const next = D.getElementById("btn-origin-next");
    stories[id] = { place, line };
    if (!place || !next || next.disabled) unreachable.push(id);
  }
  const first = Object.keys(stories).map((k) => stories[k].line.split("<br")[0]);
  const r = { ids, dos, cities, pins, unreachable, stories, lines: new Set(first).size };
  h.close();
  return r;
}
const O_PRED = {
  allPickable: (r) => r.ids.length === N_REGIONS && r.unreachable.length === 0
    && r.dos.length === N_DO && r.cities.length === N_CITY,
};

async function O0() {
  console.log("\n── 🗺️ O. 지역이 계수에 안 닿는가 ──");
  const r = await runOrigins(null);
  base.O = r;
  check(O_PRED.allPickable(r),
    `O-0. 🗺️ **${N_REGIONS}개 시·도를 하나하나 눌러 전부 고를 수 있다**`
    + ` — 🏞️ 도 ${r.dos.length}/${N_DO}(폴리곤) · 🏙️ 광역시 ${r.cities.length}/${N_CITY}(옆 목록)`
    + `\n     지도 핀 ${r.pins.length}개 · 목록 버튼 ${r.cities.length}개 · 데이터 ${r.ids.length}곳`
    + (r.unreachable.length ? `\n     🔴 못 고르는 지역 ${r.unreachable.length}곳: ${r.unreachable.join(", ")}`
      + ` — 지도에 핀만 있고 **누를 데가 없으면** 없는 지역처럼 보입니다` : ""));
  check(r.lines === N_REGIONS,
    `O-0a. 📖 스토리 첫 줄이 **지역마다 다르다** (${r.lines}/${N_REGIONS}종)`
    + `\n     🔎 측정 조건 — 이게 같으면 아래 O-2의 「궤적이 같다」가 **아무것도 안 달라서 통과**가 됩니다`);
}

/* ── O-2. 🔒 **지역이 어떤 계수에도 안 닿는다** ────────────────────────────
 * 🔑 값이 아니라 **관계**로 봅니다 — 같은 시드에서 **지역만** 갈아 끼우고
 *    커리어를 굴려 **비트 단위로 같은지**를 봐요.
 *    (`spotOf`·`marketOf`·`overall`도 digest에 같이 넣습니다 — 어느 축에 걸어도 갈리게)
 * ⚠️ 이 술어는 **O-0a와 짝**이어야 뜻이 있습니다. 둘이 애초에 같은 판이면
 *    "안 닿아서 통과"가 아니라 "아무 일도 안 일어나서 통과"예요. */
async function toMain(h, o) {
  toFoot(h);
  await tapFoot(h, o.foot || "R");
  pickOrigin(h, o.origin);
  const prev = h.W.localStorage.getItem("grow-auto-mini");
  h.W.localStorage.setItem("grow-auto-mini", "1");     // 🤖 중립 조작(s=0.5)으로 학교를 지나갑니다
  h.press(h.D.querySelector(`#position-list .card[data-pos="${o.pos || "wg"}"]`), `📍 ${o.pos || "wg"}`);
  /* 🔴 **여기 있던 town 루프를 `passTown`으로 바꿨습니다** (2026-09-01 · 98번 §6-1 ③).
   *    사본을 갖고 있어서 📨 조기 제안이 생겼을 때 **이 함수만 안 고쳐졌고**, 중등 뒤
   *    조기 화면에서 멈춘 채 `#agency-list button`을 눌러 **승낙**해 버렸어요 —
   *    그러면 🏟️ 최종이 안 와서 `btn-prospect-start`가 없고 **`S`가 null**이 됩니다.
   * 🔒 루프를 두 벌 두지 않습니다 — 드라이버가 갈라지면 한쪽만 고쳐지는 게 이 사고예요. */
  passTown(h.W, h.press);
  h.W.localStorage.setItem("grow-auto-mini", prev == null ? "0" : prev);
  h.press(h.D.querySelector("#agency-list button"), "🏟️ 입단 제안");
  h.press(h.D.getElementById("btn-prospect-start"), "btn-prospect-start");
  return h;
}
async function trace(seed, origin, muts) {
  const h = boot({ seed, muts });
  await toMain(h, { origin, pos: "wg" });
  let turns = 0;
  for (let i = 0; i < TURNS; i++) {
    const b = h.D.querySelector(`.action-btn[data-key="${TRAIN_KEYS[i % TRAIN_KEYS.length]}"]`);
    if (!b || b.disabled) break;
    h.press(b, "🏋️ 훈련");
    turns += 1;
    await wait(2);
  }
  const S = h.S();
  const c = JSON.parse(JSON.stringify(S || {}));
  const gotOrigin = c.origin;
  delete c.origin;                       // 🔒 지역 자신은 빼고 견줍니다 (그건 달라야 정상)
  const m = h.W.__get("marketOf")();
  const dig = JSON.stringify({ S: c, spot: h.W.__get("spotOf")(m), market: m,
    ovr: h.W.__get("overall")() });
  const screen = h.active();
  h.close();
  return { dig, origin: gotOrigin, screen, turns };
}
const O2_PRED = (rows) => rows.every((x) => x.a.dig === x.b.dig);

async function O2(muts) {
  const rows = [];
  for (const seed of SEEDS) {
    /* 🏙️ seoul은 **옆 목록**에서, 🏝️ jeju는 **지도 폴리곤**에서 — 두 경로를 다 밟습니다 */
    rows.push({ seed, a: await trace(seed, "seoul", muts), b: await trace(seed, "jeju", muts) });
  }
  return rows;
}
/* 어디가 갈렸는지 한 줄로 — "안 된다"가 아니라 "무엇과 무엇이 안 맞는다"로 적으려고요 */
function diffHint(a, b) {
  const out = [];
  const walk = (x, y, p) => {
    if (out.length >= 5) return;
    if (x && y && typeof x === "object" && typeof y === "object") {
      const keys = {};
      for (const k of Object.keys(x)) keys[k] = 1;
      for (const k of Object.keys(y)) keys[k] = 1;
      for (const k of Object.keys(keys)) walk(x[k], y[k], p ? `${p}.${k}` : k);
    } else if (JSON.stringify(x) !== JSON.stringify(y)) {
      out.push(`${p}: ${JSON.stringify(x)} ↔ ${JSON.stringify(y)}`);
    }
  };
  walk(JSON.parse(a), JSON.parse(b), "");
  return out.length ? `갈린 칸 — ${out.join(" · ")}` : "(칸 단위로는 못 짚었어요)";
}
async function O2base() {
  const rows = await O2(null);
  base.O2 = rows;
  const differ = rows.filter((x) => x.a.dig !== x.b.dig);
  check(rows.every((x) => x.a.origin === "seoul" && x.b.origin === "jeju"
    && x.a.screen === "screen-main" && x.a.turns === TURNS && x.b.turns === TURNS),
    `O-2z. 🔎 측정 조건 — 두 판이 **실제로 다른 지역**으로 갔고 🏋️ 훈련 ${TURNS}턴을 굴렸다`
    + `\n     ${rows.map((x) => `시드 ${x.seed}: "${x.a.origin}"(${x.a.turns}턴) ↔ "${x.b.origin}"(${x.b.turns}턴) · 화면 ${x.a.screen}`).join(" · ")}`);
  check(O2_PRED(rows),
    `O-2. 🔒 **지역만 갈아 끼운 🏋️ 훈련 ${TURNS}턴 궤적이 비트 단위로 같다** — 지역은 어떤 계수에도 안 닿는다`
    + `\n     (능력치·명성·돈·컨디션·spotOf·유스 계수·종합을 한 덩이로 견줍니다 · 시드 ${SEEDS.join(", ")})`
    + (differ.length
      ? `\n     🔴 갈린 시드 ${differ.map((x) => x.seed).join(", ")} — **「지역은 텍스트만 바꾼다」가 깨졌습니다**`
        + `\n     ${diffHint(differ[0].a.dig, differ[0].b.dig)}`
      : ""));
}

/* ── O-3. 🗺️ 옛 세이브는 **읽는 쪽 기본값**으로 삽니다 (마이그레이션 없음) ── */
const FX = (() => {
  const s = fs.readFileSync(path.join(PAGE_DIR, "..", "_fixtures.js"), "utf8");
  const win = {};
  new Function("window", s)(win);          // 🔒 직접 eval 안 씁니다
  return (win.CHECK_FIXTURES || { items: [] }).items.filter((x) => x.game === "winger2");
})();
function O3() {
  const rows = [];
  for (const it of FX) {
    const h = boot({ keys: it.keys, seed: SEEDS[0] });
    h.press(h.D.getElementById("btn-continue"), "이어하기");
    h.press(h.D.querySelector(".slot-modal .slot-go"), "슬롯 열기");
    const S = h.S();
    const names = h.W.WingerIntro.REGIONS.map((x) => x.name);
    const shown = h.W.WingerIntro.nameOf(S && S.origin);
    rows.push({
      id: it.id, ok: !!S,
      had: S ? S.origin !== undefined : null,
      shown, isReal: names.indexOf(shown) >= 0,
      top: h.W.WingerIntro.topOf(S && S.origin),
      errs: h.W.__errs.length,
    });
    h.close();
  }
  /* 🔒 표시 글자("🌍 미상")를 안 박습니다 — 문구를 다듬어도 계약은 안 바뀌어요.
   *    지키는 문장은 **「진짜 지역 이름이 아니고, 기록에도 안 걸린다」**입니다. */
  const ok = rows.length > 0 && rows.every((r) => r.ok && !r.had && r.shown && !r.isReal
    && r.top == null && r.errs === 0);
  check(ok,
    `O-3. 🗺️ **옛 세이브에 origin 칸이 없어도 그대로 산다** (마이그레이션 없음 · 읽는 쪽 기본값)`
    + `\n     ${rows.map((r) => `${r.id}: 칸 ${r.had ? "🔴있음" : "없음"} · 표시 "${r.shown}"${r.isReal ? " 🔴진짜 지역명" : ""} · 🏛️ 기록 ${r.top ? "🔴걸림" : "안 걸림"} · 오류 ${r.errs}`).join("\n     ")}`);
}

/* ── O-4. 🏛️ 지역 기록의 **유일한 출처**가 살아 있는가 (career.js ↔ intro.js) ──
 * 🔑 경계면입니다 — **쓰는 쪽(career.js 헌액)**과 **읽는 쪽(intro.js topOf)**을 같이 엽니다.
 *    한쪽만 보면 둘 다 「올바르게」 구현돼 있어요. */
async function O4(muts) {
  const h = boot({ seed: SEEDS[0], muts });
  await toMain(h, { origin: "jeju", pos: "wg" });
  /* 🏛️ 헌액은 은퇴식 버튼이 부릅니다(career.js:289) — 거기까지 36턴을 굴리는 대신
   * `_t` 창구로 **그 함수 그대로**를 부릅니다. 산식을 베껴 오는 게 아니라
   * 진짜 `enshrine()`이에요(`_t`는 이 저장소가 검사용으로 열어 둔 자리입니다). */
  h.W.WingerCareer._t.enshrine();
  let list = [];
  try { list = JSON.parse(h.W.localStorage.getItem("grow-hof-v1") || "[]"); } catch (e) { list = []; }
  const mine = list.filter((e) => e && e.game === "winger2");
  const r = {
    n: mine.length, wrote: mine.length ? mine[mine.length - 1].origin : undefined,
    hit: !!h.W.WingerIntro.topOf("jeju"), miss: h.W.WingerIntro.topOf("seoul"),
    errs: h.W.__errs.length,
  };
  h.close();
  return r;
}
const O4_PRED = (r) => r.n > 0 && r.wrote === "jeju" && r.hit && r.miss == null;
async function O4base() {
  const r = await O4(null);
  base.O4 = r;
  check(O4_PRED(r),
    `O-4. 🏛️ **헌액이 origin을 남기고, 지도가 그걸 읽는다** (career.js → grow-hof-v1 → intro.js topOf)`
    + `\n     헌액 ${r.n}건 · 적힌 origin ${JSON.stringify(r.wrote)} · 🏝️ 제주 기록 ${r.hit ? "걸림" : "🔴 안 걸림"}`
    + ` · 🏙️ 서울 기록 ${r.miss == null ? "안 걸림(맞아요)" : "🔴 걸림"} · 오류 ${r.errs}`
    + (O4_PRED(r) ? "" : `\n     🔴 이 한 줄이 빠지면 🏛️ 지역 기록이 **영원히 「아직 없어요」**입니다 — 오류는 안 나요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * T. 🏟️ **제안 등급 색이 등급 순서와 같은 방향인가** (director 94번 §5-2)
 * ══════════════════════════════════════════════════════════════════════
 * 🔴 실제로 **뒤집혀 있었습니다** — 중립 t2가 그 위 t3보다 **밝았어요.**
 *    색상을 섞으면 밝기 순서가 뒤집힙니다(🦶 주발 사고와 같은 형태).
 * 🔑 **실제 판에서는 두세 등급밖에 안 떠서** 다섯을 따로 세워야 보입니다.
 *
 * ⚠️ **한계를 분명히 적습니다** — jsdom에는 렌더 엔진이 없어서 `style.css`의
 *    글자를 읽습니다. 리터럴 hex와 `:root`의 `var()` **한 겹**까지만 풀어요.
 *    누가 `color-mix()`나 계산된 색을 쓰면 이 검사는 **조용히 통과하지 않고**
 *    "못 읽었어요"로 빨간불이 됩니다. 완전히 계산된 색과 `body.wc-mode` 같은
 *    다른 팔레트는 렌더 도구 몫이에요 (`scripts/w2-avatar-render.js` — 지금 없습니다).
 * ══════════════════════════════════════════════════════════════════════ */
function tierColors(css) {
  const rootVars = {};
  const root = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (root) {
    const re = /(--[\w-]+):\s*([^;]+);/g;
    let m;
    while ((m = re.exec(root[1]))) rootVars[m[1]] = m[2].trim();
  }
  const out = [];
  for (let i = 0; i < N_TIER; i++) {
    const m = css.match(new RegExp(`\\.card\\.offer-t${i}\\s*\\{[^}]*?border-color:\\s*([^;}]+)`));
    if (!m) { out.push({ i, raw: null, rgb: null }); continue; }
    let v = m[1].trim();
    const vr = v.match(/^var\((--[\w-]+)\)$/);
    if (vr) v = rootVars[vr[1]] || v;
    const hex = v.match(/^#([0-9a-fA-F]{6})$/);
    out.push({ i, raw: m[1].trim(), resolved: v,
      rgb: hex ? [0, 2, 4].map((k) => parseInt(hex[1].slice(k, k + 2), 16)) : null });
  }
  return out;
}
/* 🔆 두 가지로 잽니다 — 어느 하나만 단조면 계약이 애매한 거예요.
 *    ① 감마 그대로의 가중합 (director 94번 §5-2의 그 값)  ② WCAG 상대휘도(선형화) */
const lumGamma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lumWcag = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const T_PRED = (cols) => {
  if (cols.length !== N_TIER || cols.some((c) => !c.rgb)) return { ok: false, why: "테두리 색을 못 읽었어요 (계산된 색이면 렌더 도구가 봐야 합니다)" };
  const g = cols.map((c) => lumGamma(c.rgb)), w = cols.map((c) => lumWcag(c.rgb));
  const mono = (a) => a.every((v, i) => i === 0 || v > a[i - 1]);
  return { ok: mono(g) && mono(w), g, w, monoG: mono(g), monoW: mono(w) };
};
function T(muts) {
  let css = fs.readFileSync(path.join(PAGE_DIR, "style.css"), "utf8");
  for (const [re, rep] of (muts && muts["style.css"]) || []) css = css.replace(re, rep);
  const cols = tierColors(css);
  return { cols, pred: T_PRED(cols) };
}
function Tbase() {
  console.log("\n── 🏟️ T. 제안 등급 색이 등급과 같은 방향인가 ──");
  const r = T(null);
  base.T = r;
  check(r.pred.ok,
    `T-1. 🎨 **제안 등급 ${N_TIER}개의 테두리 밝기가 단조 증가한다** (등급이 오르면 밝아져요)`
    + `\n     ${r.cols.map((c, i) => `t${i} ${c.resolved || "🔴못 읽음"}${r.pred.g ? ` (${r.pred.g[i].toFixed(1)})` : ""}`).join(" → ")}`
    + (r.pred.ok ? "" : `\n     🔴 ${r.pred.why || `단조 아님 — 감마 ${r.pred.monoG ? "✔" : "✘"} · WCAG ${r.pred.monoW ? "✔" : "✘"}`}`
      + `\n     🔴 **색상을 섞으면 밝기 순서가 뒤집힙니다** — 실제 판엔 두세 등급밖에 안 떠서 눈으로는 안 보여요`));
}

/* ══════════════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — **기준선이 초록불일 때만 뜻이 있습니다** (92번 §2)
 * ══════════════════════════════════════════════════════════════════════ */
async function mutations() {
  console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
  if (fail === 0) console.log("   ✔ 기준선(무변이) 전부 초록불 — 아래 빨간불은 **변이가 만든 것**이 맞습니다.");
  else console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.\n`
    + "      먼저 위 ❌를 없앤 다음 변이 결과를 믿으세요.");

  /* M1 — 🦶가 판정 창에 안 닿음 (옛 죽은 스위치) */
  if (!mutOK("M1_DEAD_FOOT")) check(false, `F-M1. 🧪 변이(🦶 죽은 스위치 복원)${MUT_DEAD}`);
  else {
    const r = await runF(MUT.M1_DEAD_FOOT);
    const ss = F_PRED.sameSide(r);       // 🔒 F-2와 **같은 술어**
    check(!ss.ok,
      "F-M1. 🧪 **변이 — 🦶가 판정 창에 안 닿게(옛 죽은 스위치 복원)** → F-2가 빨간불"
      + `\n     ${ss.rows.map(([n, a, b]) => `${a && b ? "🟢" : "🔴"} ${n}`).join(" · ")}`
      + (ss.ok ? "\n     🔴 되살렸는데 F-2가 **아직 초록불** — 그건 아무것도 안 지키고 있어요" : ""));
    /* 🔑 폭의 비는 그대로 살아 있어야 합니다 — 성질이 다른 것을 한 술어에 묶지 않으려고요 */
    check(F_PRED.ratio(r, footWinOf(MSRC0)).ok,
      "F-M1a. 🔒 그때 **F-1(폭의 비)은 그대로 초록불** — 죽은 스위치는 「쪽」의 문제지 「폭」의 문제가 아니에요");
  }

  /* M2 — 🦶 화면의 좌우를 판정과 반대로 */
  if (!mutOK("M2_FLIP_SCREEN")) check(false, `F-M2. 🧪 변이(화면 좌우 뒤집기)${MUT_DEAD}`);
  else {
    const r = await runF(MUT.M2_FLIP_SCREEN);
    const ss = F_PRED.sameSide(r);
    check(!ss.ok,
      "F-M2. 🧪 **변이 — 🦶 화면의 좌우를 판정과 반대로**(2026-08-29 사고 재현) → F-2가 빨간불"
      + `\n     ${ss.rows.map(([n, a, b]) => `${a && b ? "🟢" : "🔴"} ${n}`).join(" · ")}`
      + (ss.ok ? "\n     🔴 뒤집었는데 F-2가 **아직 초록불** — 그건 아무것도 안 지키고 있어요" : ""));
    check(F_PRED.colorMatchesWidth(r),
      "F-M2a. 🔎 그때도 **F-3(넓은 칸=강한 색)은 초록불**입니다 — 화면 안에서는 앞뒤가 맞으니까요."
      + " 🔑 **판정을 같이 열지 않으면 이 사고는 안 보입니다**");
  }

  /* M3 — 「출신 보너스」 */
  if (!mutOK("M3_ORIGIN_BONUS")) check(false, `O-M3. 🧪 변이(출신 보너스)${MUT_DEAD}`);
  else {
    const rows = await O2(MUT.M3_ORIGIN_BONUS);
    check(!O2_PRED(rows),                // 🔒 O-2와 **같은 술어**
      "O-M3. 🧪 **변이 — 「출신 보너스」로 지역을 spot에 걺** → O-2가 빨간불"
      + `\n     ${rows.map((x) => `시드 ${x.seed}: ${x.a.dig === x.b.dig ? "🔴 같음" : "🟢 갈림"}`).join(" · ")}`
      + (O2_PRED(rows) ? "\n     🔴 계수에 걸었는데 O-2가 **아직 초록불** — 그건 아무것도 안 지키고 있어요" : ""));
  }

  /* M3b — 같은 압박을 `growth` 축에 (궤적 자체의 해상도를 증명) */
  if (!mutOK("M3B_GROWTH")) check(false, `O-M3b. 🧪 변이(출신 보너스 · growth 축)${MUT_DEAD}`);
  else {
    const rows = await O2(MUT.M3B_GROWTH);
    check(!O2_PRED(rows),                // 🔒 O-2와 **같은 술어**
      "O-M3b. 🧪 **변이 — 「출신 보너스」를 growth(36턴 복리)에 걺** → O-2가 빨간불"
      + `\n     ${rows.map((x) => `시드 ${x.seed}: ${x.a.dig === x.b.dig ? "🔴 같음" : "🟢 갈림"}`).join(" · ")}`
      + `\n     🔎 이게 갈려야 O-2가 「digest에 spotOf를 넣어서 잡힌 것」이 아니라 **궤적으로 잡은 것**이 됩니다`
      + (O2_PRED(rows) ? "\n     🔴 복리 축에 걸었는데 O-2가 **아직 초록불** — 궤적이 아무것도 안 지키고 있어요" : ""));
  }

  /* M4 — 화면만 옛말 */
  if (!mutOK("M4_STALE_WIDTH")) check(false, `F-M4. 🧪 변이(화면이 상수를 안 따라감)${MUT_DEAD}`);
  else {
    const r = await runF(MUT.M4_STALE_WIDTH);
    const ra = F_PRED.ratio(r, 0.40);    // 변이가 심은 값 — 화면이 여기를 따라와야 해요
    check(!ra.ok,
      "F-M4. 🧪 **변이 — FOOT_WIN을 0.40으로 바꿨는데 🦶 화면만 0.25로 굳힘** → F-1이 빨간불"
      + `\n     기대 ${ra.want.toFixed(4)} · 잰 값 ${ra.got.map((v) => v.toFixed(4)).join(" / ")}`
      + (ra.ok ? "\n     🔴 화면이 안 따라가는데 F-1이 **아직 초록불** — 그건 아무것도 안 지키고 있어요" : ""));
  }

  /* M5 — 등급 색 뒤집기 */
  if (!mutOK("M5_TIER_COLOR")) check(false, `T-M5. 🧪 변이(등급 색 뒤집기)${MUT_DEAD}`);
  else {
    const r = T(MUT.M5_TIER_COLOR);
    check(!r.pred.ok,
      "T-M5. 🧪 **변이 — 중립 t2를 하늘색으로**(director가 렌더로 잡은 그 상태) → T-1이 빨간불"
      + `\n     ${r.cols.map((c, i) => `t${i} ${r.pred.g ? r.pred.g[i].toFixed(1) : "?"}`).join(" → ")}`
      + (r.pred.ok ? "\n     🔴 뒤집었는데 T-1이 **아직 초록불** — 그건 아무것도 안 지키고 있어요" : ""));
  }

  /* M6 — 헌액에서 origin 제거 */
  if (!mutOK("M6_NO_HOF_ORIGIN")) check(false, `O-M6. 🧪 변이(헌액 origin 제거)${MUT_DEAD}`);
  else {
    const r = await O4(MUT.M6_NO_HOF_ORIGIN);
    check(!O4_PRED(r),
      "O-M6. 🧪 **변이 — 헌액에서 origin 한 줄을 뺌** → O-4가 빨간불 (오류는 하나도 안 나요)"
      + `\n     적힌 origin ${JSON.stringify(r.wrote)} · 🏝️ 제주 기록 ${r.hit ? "🔴 걸림" : "안 걸림"}`
      + (O4_PRED(r) ? "\n     🔴 뺐는데 O-4가 **아직 초록불** — 그건 아무것도 안 지키고 있어요" : ""));
  }

  /* M7 — 광역시 목록 줄이기 */
  if (!mutOK("M7_SHORT_CITIES")) check(false, `O-M7. 🧪 변이(광역시 목록 줄이기)${MUT_DEAD}`);
  else {
    const r = await runOrigins(MUT.M7_SHORT_CITIES);
    check(!O_PRED.allPickable(r),
      "O-M7. 🧪 **변이 — 🏙️ 광역시 목록을 4곳으로**(지도 핀은 그대로) → O-0이 빨간불"
      + `\n     목록 ${r.cities.length}개 · 못 고르는 지역 ${r.unreachable.length}곳`
      + (O_PRED.allPickable(r) ? "\n     🔴 줄였는데 O-0이 **아직 초록불** — 그건 아무것도 안 지키고 있어요" : ""));
  }
}

(async () => {
  await F();
  await O0();
  await O2base();
  O3();
  await O4base();
  Tbase();
  await mutations();
  console.log(`\n${fail ? `❌ ${fail}건 실패` : "✅ 통과"}  (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  process.exit(fail ? 1 : 0);
})();
