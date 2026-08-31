/* ⚽ 더 윙어 II — 👕 3D 유니폼 뷰어 (`window.W2Char`)
 *
 * 🎯 이 파일이 맡는 것은 **유니폼 한 벌을 세워 보여주는 것 하나**예요.
 *    캐릭터가 아닙니다 — 2026-08-30에 **캐릭터에서 유니폼으로 바꿨어요.**
 *
 *    왜 바꿨나 (범민 님 판단 + 렌더로 확인한 것):
 *      · 캐릭터는 눈만 있어서 **마네킹처럼** 보였어요 — 표정을 넣으면 폴리가 아니라
 *        *"이 얼굴이 내 선수인가"*가 문제가 됩니다. 유니폼은 그 질문이 아예 없어요.
 *      · 👕 등에 **이름과 번호**가 들어갑니다. *"내 선수"*라는 느낌이 얼굴보다 셉니다.
 *      · 머리가 무대 위쪽에서 잘려 보이던 문제가 통째로 사라집니다.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 👕 유니폼의 일생 — **이 파일은 ①②만 합니다. ③의 자리를 열어 둘 뿐이에요**
 * ═══════════════════════════════════════════════════════════════════════
 *   ① 처음         **무지** — 아무것도 안 적힌 유니폼 (이름도 번호도 없을 때)
 *   ② 이름·번호     그 자리에 **새겨집니다** (`set()`으로 실시간 · 한 번 찍히는 연출)
 *   ③ 팀 입단       그 팀의 **색·무늬**로 → 🔴 **이번 범위가 아닙니다**
 *
 * 🔑 ③을 위해 **색을 코드에 박지 않았습니다.** 킷은 **인자로 받습니다**:
 *
 *      W2Char.show(stage, { name, number, foot, kit })
 *      W2Char.set({ name, number, kit })          // 서 있는 유니폼만 갈아입혀요
 *      kit = { body, sleeve, trim, text, pattern }
 *
 *    안 주면 무대의 CSS 변수(`--kit-body` `--kit-sleeve` `--kit-trim` `--kit-text`)를
 *    읽습니다. 그래서 **JS에 절대색이 한 개도 없어요** — 🌏 월드컵 테마가 변수를 갈면
 *    유니폼도 같이 갑니다 (원칙 ⑥ · 아이돌에서 실제로 겪은 사고).
 *    나중에 클럽 색이 생기면 `kit`만 꽂으면 됩니다. 셰이더도 지오메트리도 안 건드려요.
 *
 * ⚠️ `pattern`은 **자리만 열어 뒀습니다** — 지금은 `"solid"`(무지)만 그립니다.
 *    모르는 값이 오면 조용히 무지로 떨어져요. 줄무늬·반반은 클럽 색이 생길 때 함께.
 *    붙일 자리는 `paintKit()` 한 곳입니다 (거기 주석에 적어 뒀어요).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🔴 절대 지킬 것 다섯 — 이걸 어기면 게임이 아니라 **검사와 밸런스가 죽습니다**
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ① **ES module입니다.** `<script type="module">`로만 불러와요.
 *    그래서 `window.W2Char`는 **항상 늦게 생깁니다** — 모든 호출부가
 *    "없는 순간"을 견뎌야 해요. 이건 제약이 아니라 **폴백이 공짜로 생기는 구조**입니다.
 *    jsdom은 module 스크립트를 아예 실행하지 않아서, 검사에서는 이 파일이 **없는 것과
 *    같습니다.** (`tests/winger2/wiring-test.js`가 ⓐ 고전 · ⓑ 모듈 · ⓒ 동적 import
 *    **세 갈래를 각각** 잽니다 — 배선 형태를 바꾸면 거기가 빨간불이에요.)
 *
 * ② **three.js는 처음 필요할 때만 내려받습니다** (동적 `import()`).
 *    `vendor/three.module.min.js`가 691KB(gzip ~167KB)예요. 타이틀 화면과
 *    🏠 유스 36턴이 그 값을 치를 이유가 없습니다. 🧬 조립대에 **처음 들어올 때** 옵니다.
 *
 * ③ **🔥 순간 카드가 도는 동안 렌더하지 않습니다.**
 *    미니게임은 **프레임 위에서 판정**해요. 저사양 폰에서 3D가 같이 돌면 프레임이
 *    떨어지고 → 판정이 나빠지고 → `s` 분포가 내려가고 → 곡선이 **기기 성능에 의존**합니다.
 *    밸런스 사고가 아니라 **밸런스를 잴 수 없게 되는 사고**예요.
 *    → `pause()` / `resume()`가 그래서 공개 API입니다.
 *
 * ④ **실패해도 화면이 멀쩡해야 합니다.** WebGL이 없거나(jsdom·구형 기기),
 *    three.js 내려받기가 실패하거나, 컨텍스트를 잃으면 → **CSS 유니폼으로 조용히**
 *    돌아갑니다. CSS 유니폼은 지우지 않고 무대 안에 **늘 깔려 있어요** — 3D가 그 위를 덮습니다.
 *    🔑 CSS 폴백에도 **이름과 번호가 글자로** 들어갑니다 (`prospect.js` `stageHTML`).
 *
 * ⑤ **주변과 덜 얽힙니다.** 무대는 자기 안에서만 잽니다 — 조립대의 다른 칸이
 *    어디로 옮겨가도(포메이션 그림 등) 이 무대는 그대로 살아야 해요.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🎲 **유니폼은 🎲로 안 바뀝니다** — 이게 결정입니다
 * ═══════════════════════════════════════════════════════════════════════
 *   앞선 캐릭터판은 🎲가 체형을 바꿨어요(배분 다섯 칸이 몸에 실림). 유니폼은 안 그럽니다.
 *
 *   · 🔴 **배분을 유니폼에 실으면 「색·무늬로 능력치를 읽는 화면」이 됩니다.**
 *     그건 🌱 등급 여섯 줄이 하는 말이에요. 두 번 말하면 하나는 반드시 거짓말을 합니다.
 *   · 👕 유니폼은 **안 바뀌는 축**입니다 — 이름·번호가 거기 있으니까요.
 *     조립대가 *"내 선수를 다듬는 자리"*이려면 안 바뀌는 축이 있어야 해요.
 *   · 그럼 🎲는 화면에서 뭘 하나? → **🌱 등급 여섯 줄이 바로 아래**(무대 sticky 바로 밑)에
 *     있고 거기서 값이 바뀝니다. 그 자리를 그러라고 실측해서 올려놨어요(78번 §2).
 *   · 그래도 **손엔 반응해야 합니다** → `nudge()` — 굴린 순간 유니폼이 **한 번 흔들려요.**
 *     아무것도 뜻하지 않는 흔들림이라 **거짓말을 할 수가 없습니다.**
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🦶 주발 — **거울을 지웠습니다** (지난 판에서 가장 위험했던 자리)
 * ═══════════════════════════════════════════════════════════════════════
 *   캐릭터판은 공을 **주발 쪽**에 놓았어요. 캐릭터가 우리를 마주 보니 *캐릭터의 왼발이
 *   화면 오른쪽*이라 거울이 한 번 뒤집혔고, 그걸 세 겹으로 막아야 했습니다.
 *
 *   🔴 **유니폼은 돌아갑니다.** 앞을 보면 착용자의 왼쪽이 화면 오른쪽이고,
 *      뒤를 보면 화면 왼쪽이에요. **안정된 좌우가 없습니다.**
 *      그런 데다 공을 한쪽에 놓으면 **반 바퀴마다 거짓말**이 됩니다.
 *      *"안 보이는 것"*이 아니라 **거짓말을 하는 것** — 이 저장소가 한 번 데인 그 형태예요.
 *
 *   ✅ 그래서 **공은 무대 가운데**에 두고 돌지 않습니다(유니폼만 돌아요).
 *      🦶 주발은 **글자 칩**이 말합니다 — 좌우를 외울 일이 없어요.
 *      렌더 검사가 *"왼발이든 오른발이든 공의 x가 같다"*를 잽니다(A절) —
 *      **좌우로 뜻을 만들지 않았다는 것을 기계가 지킵니다.**
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🎨 유니폼을 코드로 만듭니다 — 외부 모델 파일 0개 · 폰트 파일 0개
 * ═══════════════════════════════════════════════════════════════════════
 *   · `MeshToonMaterial` + 3단 `gradientMap` — 무광 셀셰이딩이 "아기자기"의 실체예요
 *   · 조명 3개 (`Hemisphere` + 앞뒤 `Directional`) · **그림자 없음**
 *     ⚠️ 앞에만 두면 **기본 자세인 등이 통째로 그늘**입니다 — 회색 옷이 돼요(첫 렌더에서 확인).
 *   · 등번호·이름은 **`CanvasTexture`** 입니다 — 2D 캔버스에 페이지 폰트로 그려서
 *     텍스처로 씁니다. **한글이 그대로 들어가요** (폰트 파일을 안 받습니다).
 *   · 폴리 **1,008 tri · 드로우콜 10** — 캐릭터판(1,192 · 18)보다 **둘 다 줄었습니다.**
 *     남는 예산은 **글자 선명도**(1024² 텍스처 + 이방성 필터)와 **천의 흔들림**에 씁니다.
 */

/* 👕 킷 기본값 — **여기 있는 건 색이 아니라 「CSS 변수 이름」입니다.**
 * 무대(`.w2c-stage`)의 변수를 읽어요. 못 읽으면 마지막 방어선으로 아래 값을 씁니다
 * (jsdom·`getComputedStyle` 실패 같은 자리). 실색은 `style.css`에 있어요. */
const KIT_VAR = { body: "--kit-body", sleeve: "--kit-sleeve", trim: "--kit-trim", text: "--kit-text" };
const KIT_LAST = { body: "#eaf0ff", sleeve: "#eaf0ff", trim: "#1a2547", text: "#141d3c", pattern: "solid" };

/* 📐 **핏은 고정입니다.** 🎲로도 능력치로도 안 바뀌어요 (위 「🎲」 절).
 *    단위 ≈ m. 바닥이 y=0, 유니폼은 그 위에 **떠 있습니다.** */
const FIT = {
  hemY: 0.42, topY: 1.24,       // 몸통 통 — 아랫단 → 어깨선
  rBot: 0.40, rTop: 0.335,      // 가로 반지름 (아래가 넓어요 — 참고 이미지의 실루엣)
  flat: 0.52,                   // 앞뒤 납작함 (z = x × flat). 옷이라 통이 아니라 판에 가까워요
  capY: 0.13,                   // 어깨 덮개 높이 — 높으면 풍선처럼 보여요
  collarR: 0.126,
  sleeveY: 1.13, sleeveX: 0.30, sleeveLen: 0.27, sleeveR: 0.118,
  sleeveTilt: 0.78,             // 아래로 내려올수록 옷처럼 보입니다 (0.95는 날개였어요)
  ballR: 0.135, ballZ: 0.30,
};
/* 🖨️ 등 프린트 판 — **정사각**입니다. 캔버스도 정사각이라 글자가 안 늘어나요.
 *    (직사각으로 두면 캔버스 비율만큼 글자가 늘어붙습니다 — 두 번 고쳤어요) */
const PRINT = { w: 0.53, h: 0.53, y: 0.88, out: 0.008 };
const TAU = Math.PI * 2;
/* 👀 **기본은 등을 보여줍니다.** 이 화면의 사건은 *"내 이름이 새겨졌다"*라서,
 *    앞(깔끔한 면)은 끌어서 돌려야 나옵니다. 그게 보상이에요. */
const REST = Math.PI;

let THREE = null;         // 동적 import 결과 (한 번만)
let loading = null;       // 진행 중인 import 약속
let R = null;             // 살아 있는 무대 한 벌 { renderer, scene, camera, rig, … }
let pending = null;       // three.js를 기다리는 동안의 최신 요청 { stage, spec }
let mounts = 0;           // WebGL 컨텍스트를 몇 번 만들었나 — 🖥️ 렌더 검사가 봅니다
let paused = false;
let disposed = false;

const reduceMotion = () => {
  try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  catch (e) { return false; }
};

/* WebGL이 되는지 — **컨텍스트를 실제로 만들어 봅니다.**
 * `window.WebGLRenderingContext`가 있어도 컨텍스트가 안 나오는 기기가 있어요
 * (하드웨어 가속 꺼짐 · 컨텍스트 상한 초과). 있는지 묻지 말고 만들어 보는 게 맞습니다. */
function webglOK() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) return false;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();          // 확인용 컨텍스트는 바로 놓아 줍니다 (상한이 8~16개예요)
    return true;
  } catch (e) { return false; }
}

/* 👕 무대의 CSS 변수에서 킷을 읽어요. **인자로 온 킷이 언제나 우선**입니다 —
 * 나중에 클럽 색이 생기면 여기 손 안 대고 `kit`만 넘기면 돼요. */
function kitOf(el, override) {
  const out = {};
  let cs = null;
  try { cs = getComputedStyle(el); } catch (e) {}
  for (const k in KIT_VAR) {
    let v = override && override[k];
    if (!v && cs) { try { v = (cs.getPropertyValue(KIT_VAR[k]) || "").trim(); } catch (e) {} }
    /* ⚠️ 아직 안 풀린 `var(…)`가 그대로 올 수 있어요 (변수를 못 찾은 경우).
     * three.js에 넘기면 조용히 검정이 됩니다 — 그럼 유니폼이 통째로 까매져요. */
    if (!v || v.indexOf("var(") === 0) v = KIT_LAST[k];
    out[k] = v;
  }
  out.pattern = (override && override.pattern) || KIT_LAST.pattern;
  return out;
}

/* ───────────────────────────────────────────────────────────────
 * 🖨️ 등 프린트 — **2D 캔버스에 그려서 텍스처로 씁니다.**
 *
 * 🔑 폰트 파일을 안 받아요. 페이지가 이미 쓰는 폰트(Jua)를 캔버스가 그대로 씁니다.
 *    **그래서 한글이 됩니다** — 3D 폰트 자산으로 한글을 넣으려면 글리프가 11,172자예요.
 * ⚠️ 웹폰트는 **늦게 옵니다.** 그리고 나서 도착하면 글자가 대체 폰트로 굳어요 —
 *    `document.fonts.ready`에 한 번 더 그립니다.
 * ─────────────────────────────────────────────────────────────── */
function printCanvas() {
  const px = (window.devicePixelRatio || 1) > 1.5 ? 1024 : 512;
  const c = document.createElement("canvas");
  c.width = c.height = px;
  return c;
}

/* 한 줄을 폭 안에 넣어요 — **글자 수가 아니라 실제 폭으로** 재야 합니다.
 * 🇰🇷 한글 세 글자와 라틴 세 글자는 폭이 두 배 가까이 달라요. */
function fitText(ctx, text, maxW, startPx, font) {
  let size = startPx;
  for (let i = 0; i < 30; i++) {
    ctx.font = `${font.weight} ${Math.round(size)}px ${font.family}`;
    const w = ctx.measureText(text).width;
    if (w <= maxW || size <= startPx * 0.42) return { size: Math.round(size), w };
    size *= Math.max(0.72, maxW / w);
  }
  return { size: Math.round(size), w: ctx.measureText(text).width };
}

/* 등판 한 장. **이름도 번호도 없으면 아무것도 안 그립니다 — 그게 「무지」예요.** */
function paintPrint(cv, name, no, color) {
  const S = cv.width;
  const ctx = cv.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S, S);
  const nm = String(name == null ? "" : name).trim();
  const nu = String(no == null ? "" : no).trim();
  const info = { empty: !nm && !nu, name: nm, no: nu, namePx: 0, nameW: 0, nameMax: 0, noPx: 0, noW: 0 };
  if (info.empty) return info;

  const font = { weight: 700, family: '"Jua", "Gowun Dodum", system-ui, sans-serif' };
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  /* 🇰🇷 라틴은 대문자로 (유니폼 관례) · 한글은 그대로. 섞여 있어도 안 깨져요 */
  const shown = /[a-z]/.test(nm) ? nm.toUpperCase() : nm;
  /* 글자 사이를 살짝 벌립니다 — 등판 글씨는 붙으면 뭉쳐 보여요.
   * `letterSpacing`을 모르는 브라우저면 그냥 안 벌어집니다 (기능이 줄 뿐 안 깨져요) */
  try { ctx.letterSpacing = `${Math.round(S * 0.012)}px`; } catch (e) {}

  const maxW = S * 0.86;
  if (shown) {
    const f = fitText(ctx, shown, maxW, S * 0.205, font);
    info.namePx = f.size; info.nameW = Math.round(f.w); info.nameMax = Math.round(maxW);
    ctx.fillText(shown, S / 2, S * 0.16);
  }
  if (nu) {
    const f = fitText(ctx, nu, maxW, S * 0.54, font);
    info.noPx = f.size; info.noW = Math.round(f.w);
    ctx.fillText(nu, S / 2, S * 0.62);
  }
  try { ctx.letterSpacing = "0px"; } catch (e) {}
  return info;
}

/* ───────────────────────────────────────────────────────────────
 * 👕 유니폼을 만듭니다 — **한 번만.** 이후 갈아입히기는 색과 텍스처만 건드려요.
 * ─────────────────────────────────────────────────────────────── */
const rAt = (y) => {
  const t = Math.max(0, Math.min(1, (y - FIT.hemY) / (FIT.topY - FIT.hemY)));
  return FIT.rBot + (FIT.rTop - FIT.rBot) * t;
};

/* 🖨️ 등판 지오메트리 — **몸통의 곡률을 그대로 따라가는 살짝 굽은 판**이에요.
 *
 * 🔴 평평한 판을 대면 가운데가 옷 밖으로 튀어나오고 가장자리는 옷 속에 묻힙니다
 *    (납작한 통이라 등이 완전 평면이 아니에요). 원통 조각으로 만들면 이번엔
 *    **글자가 가장자리에서 늘어납니다**(u가 각도에 비례하니까요).
 * ✅ 그래서 **x는 균등하게 두고 z만 타원을 따라 밀었습니다** —
 *    뒤에서 보면 글자가 **한 점도 안 늘어나고**, 옆에서 보면 옷에 붙어 있어요. */
function printGeo(T) {
  const g = new T.PlaneGeometry(PRINT.w, PRINT.h, 14, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i) + PRINT.y;
    const rx = rAt(y), rz = rx * FIT.flat;
    const t = Math.max(-1, Math.min(1, x / rx));
    p.setZ(i, rz * Math.sqrt(1 - t * t) + PRINT.out);
  }
  g.translate(0, PRINT.y, 0);
  /* 앞면(+Z)으로 만들어 놓고 통째로 반 바퀴 — 뒤에서 봤을 때 글자가 **안 뒤집힙니다.**
   * (UV가 정점을 따라가서, 캔버스를 좌우로 뒤집을 필요가 없어요) */
  g.rotateY(Math.PI);
  g.computeVertexNormals();
  return g;
}

function buildRig(kit) {
  const T = THREE;

  /* 3단 셀셰이딩 램프. Nearest라 경계가 딱 끊겨요 — 그게 무광 장난감 느낌입니다 */
  const ramp = new T.DataTexture(
    new Uint8Array([158, 158, 158, 255, 214, 214, 214, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
  ramp.minFilter = ramp.magFilter = T.NearestFilter;
  ramp.needsUpdate = true;
  const mat = (c) => new T.MeshToonMaterial({ color: new T.Color(c), gradientMap: ramp });

  const cv = printCanvas();
  const printTex = new T.CanvasTexture(cv);
  printTex.anisotropy = 4;
  const M = {
    body: mat(kit.body), sleeve: mat(kit.sleeve), trim: mat(kit.trim),
    ball: mat("#ffffff"), ballDot: mat(kit.trim),
    /* 🖨️ 프린트는 **옷 위에 얹힌 한 장**이에요. `transparent`라 글자 없는 곳은 옷이 그대로 보입니다.
     * `depthWrite: false` — 판이 옷보다 0.008 앞에 있어서 깊이를 안 써도 안전하고,
     * 반투명이 겹칠 때 생기는 지저분한 경계를 막아요. */
    print: new T.MeshToonMaterial({ map: printTex, gradientMap: ramp, transparent: true, depthWrite: false, opacity: 1 }),
  };
  /* ⚽ 공은 흰색 하나 — 무대의 킷과 무관합니다. 옷 색이 바뀌어도 공은 공이에요.
   * (`--kit-*`가 아니라 여기만 절대색인 이유: 공은 **팀 물건이 아닙니다.**) */

  /* 📐 단위 지오메트리 — `scale`이 곧 반지름/길이가 되게 만듭니다.
   * ⚠️ `CapsuleGeometry(1, 1, …)`는 총 높이가 3이에요. 그걸 반지름으로 착각하면
   *    치수가 세 배가 됩니다(캐릭터판에서 실제로 겪었어요). 그래서 전부 원통·구·판입니다. */
  const tube = new T.CylinderGeometry(FIT.rTop / FIT.rBot, 1, 1, 20, 1, true);   // 아래로 벌어지는 통
  const pipe = new T.CylinderGeometry(1, 1.06, 1, 12, 1, true).translate(0, -0.5, 0);  // 소매 — 위 끝이 원점
  const capG = new T.SphereGeometry(1, 20, 5, 0, TAU, 0, Math.PI * 0.5);         // 어깨 덮개
  const ringG = new T.TorusGeometry(1, 0.24, 5, 14).rotateX(-Math.PI / 2);       // 목·소매 트림
  const sph = new T.SphereGeometry(1, 12, 8);
  const prnG = printGeo(T);

  const root = new T.Group();
  /* 🔑 **유니폼만 돌아갑니다.** 공은 `root`에 매달려 바닥에 그대로 있어요 —
   * 옷이 돌 때 공이 같이 돌면 「주발 쪽」처럼 읽히기 시작합니다(위 🦶 절). */
  const shirt = new T.Group();
  root.add(shirt);

  const body = new T.Mesh(tube, M.body);
  body.material.side = T.DoubleSide;      // 아랫단이 열린 통이라 속이 보입니다 — 옷다워요
  const cap = new T.Mesh(capG, M.body);
  const collar = new T.Mesh(ringG, M.trim);
  const hem = new T.Mesh(tube, M.trim);
  hem.material.side = T.DoubleSide;
  const print = new T.Mesh(prnG, M.print);

  const sleeve = () => {
    const g = new T.Group();
    const m = new T.Mesh(pipe, M.sleeve);
    m.material.side = T.DoubleSide;
    const cuff = new T.Mesh(ringG, M.trim);
    g.add(m, cuff);
    return { g, m, cuff };
  };
  const slL = sleeve(), slR = sleeve();

  shirt.add(body, cap, collar, hem, print, slL.g, slR.g);

  const ball = new T.Mesh(sph, M.ball);
  root.add(ball);

  return { root, shirt, body, cap, collar, hem, print, slL, slR, ball, M, ramp,
    printTex, printCv: cv, printInfo: { empty: true },
    geo: [tube, pipe, capG, ringG, sph, prnG] };
}

/* 📐 치수를 실어요 — **한 번 부르면 끝.** 핏이 고정이라 갈아입힐 때 다시 안 부릅니다 */
function layoutRig(rig) {
  const h = FIT.topY - FIT.hemY;
  rig.body.scale.set(FIT.rBot, h, FIT.rBot * FIT.flat);
  rig.body.position.set(0, FIT.hemY + h / 2, 0);

  rig.cap.scale.set(FIT.rTop, FIT.capY, FIT.rTop * FIT.flat);
  rig.cap.position.set(0, FIT.topY - 0.004, 0);

  /* 목 트림 — 어깨 덮개의 **꼭대기 근처**에 얹습니다. 낮게 두면 돔 속에 묻혀서
   * 아예 안 보였어요 (첫 렌더에서 목이 없는 옷이 됐습니다) */
  rig.collar.scale.set(FIT.collarR, FIT.collarR * 1.1, FIT.collarR * FIT.flat * 1.25);
  rig.collar.position.set(0, FIT.topY + FIT.capY * 0.90, 0);

  /* 아랫단 트림 — 참고 이미지의 검은 밑단. 통을 아주 얇게 눌러 씁니다 */
  rig.hem.scale.set(FIT.rBot * 1.02, 0.072, FIT.rBot * FIT.flat * 1.02);
  rig.hem.position.set(0, FIT.hemY + 0.034, 0);

  for (const [s, sx] of [[rig.slL, -1], [rig.slR, 1]]) {
    s.g.position.set(sx * FIT.sleeveX, FIT.sleeveY, 0);
    s.g.rotation.z = sx * FIT.sleeveTilt;   // 바깥·아래로 — 붙이면 널빤지, 눕히면 날개가 됩니다
    s.m.scale.set(FIT.sleeveR, FIT.sleeveLen, FIT.sleeveR * 0.86);
    /* 👕 소매 끝 트림 — 참고 이미지의 **검은 소매 트림**이 이 자리예요.
     * 얇으면 그늘에 묻혀서 안 보입니다 (첫 렌더에서 통째로 사라졌어요) */
    s.cuff.scale.set(FIT.sleeveR * 1.14, FIT.sleeveR * 1.14, FIT.sleeveR * 1.0);
    s.cuff.position.set(0, -FIT.sleeveLen, 0);
  }

  rig.ball.scale.setScalar(FIT.ballR);
  rig.ball.position.set(0, FIT.ballR, FIT.ballZ);

  /* 카메라가 늘 같은 자리를 보게 — 위쪽 끝을 알려 줍니다 */
  rig.top = FIT.topY + FIT.capY;
  return rig;
}

/* 👕 갈아입히기 — 색과 프린트만. **지오메트리는 안 건드립니다.**
 * 🧩 무늬(줄무늬·반반·V넥)를 붙일 자리가 **여기 한 곳**이에요:
 *    `kit.pattern`에 따라 `M.body.map`에 패턴 `CanvasTexture`를 걸면 됩니다
 *    (몸통 통은 원통 UV라 `wrapS = RepeatWrapping`이면 세로줄이 자연스럽게 돌아갑니다).
 *    ⚠️ 지금은 일부러 안 만듭니다 — 클럽 색 데이터가 아직 없어서, 무늬만 먼저 넣으면
 *       **무늬가 무슨 뜻인지 아무도 모르는 상태**가 됩니다. */
function paintKit(rig, kit) {
  rig.M.body.color.set(kit.body);
  rig.M.sleeve.color.set(kit.sleeve || kit.body);
  rig.M.trim.color.set(kit.trim);
  rig.M.print.color.set("#ffffff");     // 글자색은 캔버스가 칠합니다 — 재질은 안 물들여요
  rig.kit = kit;
}

function paintName(rig, name, no, kit, animate) {
  const before = rig.printInfo.empty;
  rig.printInfo = paintPrint(rig.printCv, name, no, kit.text);
  rig.printTex.needsUpdate = true;
  rig.print.visible = !rig.printInfo.empty;
  /* ✨ **새겨지는 순간** — 무지였다가 글자가 생기면 한 번 찍힙니다.
   * ♿ reduced-motion이면 그냥 켜져요 (정보는 그대로, 움직임만 없습니다) */
  if (animate && before && !rig.printInfo.empty && !reduceMotion()) {
    rig.stampT = performance.now();
    rig.M.print.opacity = 0;
  } else {
    rig.stampT = 0;
    rig.M.print.opacity = 1;
  }
}

/* ───────────────────────────────────────────────────────────────
 * 무대 만들기 · 그리기
 * ─────────────────────────────────────────────────────────────── */
function mount(stage, spec) {
  const T = THREE;
  const kit = kitOf(stage, spec.kit);
  const renderer = new T.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  const cv = renderer.domElement;
  cv.className = "w2c-canvas";
  cv.setAttribute("aria-hidden", "true");
  stage.appendChild(cv);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(26, 1, 0.1, 20);
  /* 💡 **앞뒤로 하나씩.** 처음엔 앞에만 뒀는데 — 기본 자세가 **등**이라
   * 이름과 번호가 있는 면이 통째로 그늘에 들어갔습니다(첫 렌더에서 회색 옷이 됐어요).
   * 돌려도 어느 쪽이든 읽혀야 해서 뒤쪽 광원을 더했습니다. 드로우콜은 안 늘어요. */
  scene.add(new T.HemisphereLight(0xe4eeff, 0x4a5686, 1.05));
  const dir = new T.DirectionalLight(0xfff3e0, 1.05);
  dir.position.set(2.2, 3.4, 2.6);
  scene.add(dir);
  const dirB = new T.DirectionalLight(0xdfe9ff, 0.95);
  dirB.position.set(-1.6, 2.6, -3.0);
  scene.add(dirB);

  const rig = layoutRig(buildRig(kit));
  try { rig.printTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); } catch (e) {}
  scene.add(rig.root);

  mounts += 1;
  R = { renderer, scene, camera, rig, stage, spec: null, spin: 0, drag: null,
    t0: performance.now(), raf: 0, io: null, ro: null, dirty: true, nudgeT: 0 };
  applySpec(spec, true);
  resize();

  /* 🇰🇷 웹폰트(Jua)가 늦게 오면 글자가 대체 폰트로 굳어요 — 도착하면 한 번 더 그립니다 */
  try {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
      if (!R || R.rig !== rig) return;
      paintName(rig, R.spec && R.spec.name, R.spec && R.spec.number, rig.kit, false);
      R.dirty = true;
    });
  } catch (e) {}

  /* 화면 밖이면 루프를 멈춥니다 — 유스 36턴 내내 도는 걸 막는 장치예요. */
  try {
    R.io = new IntersectionObserver((es) => {
      const on = es.some((e) => e.isIntersecting);
      if (on) resume(); else pause();
    }, { threshold: 0.01 });
    R.io.observe(stage);
  } catch (e) { /* 없으면 그냥 계속 돕니다 */ }

  try { R.ro = new ResizeObserver(resize); R.ro.observe(stage); } catch (e) {}
  document.addEventListener("visibilitychange", onVis);
  cv.addEventListener("webglcontextlost", onLost, false);
  bindDrag(cv);
  stage.classList.add("is-3d");
  loop();
}

/* 캔버스를 새 무대로 옮겨 답니다 — 관찰자도 같이 옮겨요 */
function adopt(stage) {
  if (!R) return;
  R.stage = stage;
  stage.appendChild(R.renderer.domElement);
  stage.classList.add("is-3d");
  try { R.io && R.io.disconnect(); R.io && R.io.observe(stage); } catch (e) {}
  try { R.ro && R.ro.disconnect(); R.ro && R.ro.observe(stage); } catch (e) {}
  resize();
}

function applySpec(spec, first) {
  if (!R) return;
  const prev = R.spec || {};
  R.spec = Object.assign({}, prev, spec);
  const kit = kitOf(R.stage, R.spec.kit);
  paintKit(R.rig, kit);
  const changed = first || prev.name !== R.spec.name || String(prev.number) !== String(R.spec.number);
  if (changed) paintName(R.rig, R.spec.name, R.spec.number, kit, !first);
  markBall();
  R.dirty = true;
}

/* ⚽ **공이 화면 어디에 있는지를 CSS로 넘겨줍니다.**
 *
 * 🔑 🦶 주발 칩이 공 아래에 앉아요. 공의 화면 위치는 카메라 거리·무대 비율에 따라
 *    움직이는데 **CSS는 그걸 모릅니다.** %를 손으로 박으면 무대 높이 하나만 바꿔도
 *    칩이 공을 덮어요 (캐릭터판에서 실제로 났습니다).
 * ⚠️ 폴백(WebGL 없음)에서는 이 변수가 안 생겨요 — 그때는 CSS 기본 자리가 쓰입니다. */
function markBall() {
  if (!R) return;
  try {
    const V3 = THREE.Vector3;
    const w = R.rig.ball.getWorldPosition(new V3());
    const c = w.clone().project(R.camera);
    const e = w.clone().add(new V3(R.rig.ball.scale.x, 0, 0)).project(R.camera);
    const u = w.clone().add(new V3(0, -R.rig.ball.scale.x, 0)).project(R.camera);
    R.stage.style.setProperty("--ball-x", (((c.x + 1) / 2) * 100).toFixed(2) + "%");
    R.stage.style.setProperty("--ball-w", (Math.abs(e.x - c.x) * 100).toFixed(2) + "%");
    R.stage.style.setProperty("--ball-bot", (((u.y + 1) / 2) * 100).toFixed(2) + "%");
  } catch (err) {}
}

function resize() {
  if (!R) return;
  const w = Math.max(1, R.stage.clientWidth), h = Math.max(1, R.stage.clientHeight);
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h;
  /* 📐 **바닥이 무대의 80% 지점에 오게** 잡습니다 — 아래 20%는 ⚽ 공과 🦶 칩 자리예요.
   *    무대 높이가 `clamp()`라 기기마다 달라서, 고정 거리로 두면 짧은 폰에서 어깨가 잘립니다.
   *    보이는 세로 구간 = [-0.20·V, 0.80·V] · V = (위쪽 끝 + 여유) / 0.80 */
  const top = (R.rig.top || 1.5) + 0.12;
  const V = top / 0.80;
  const midY = V * 0.30;                              // (0.80 + (-0.20)) / 2 = 0.30
  const dist = (V / 2) / Math.tan((R.camera.fov * Math.PI) / 360);
  R.camera.position.set(0, midY, dist);
  R.camera.lookAt(0, midY, 0);
  R.camera.updateProjectionMatrix();
  markBall();
  R.dirty = true;
}

/* 🖐️ 좌우로 끌면 돌아갑니다. `touch-action: pan-y`라 **세로 스크롤은 그대로**예요 */
function bindDrag(cv) {
  let x0 = null, s0 = 0;
  cv.addEventListener("pointerdown", (e) => { x0 = e.clientX; s0 = R ? R.spin : 0; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
  cv.addEventListener("pointermove", (e) => {
    if (x0 == null || !R) return;
    R.spin = s0 + (e.clientX - x0) * 0.012;
    R.drag = performance.now();
    R.dirty = true;
    if (paused) frame();          // 멈춰 있어도 끄는 손엔 반응해야죠
  });
  const up = () => { x0 = null; };
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
}

function onVis() { if (document.hidden) pause(); else resume(); }

/* 컨텍스트를 잃으면 **되살리려 애쓰지 않고 CSS 유니폼으로 내려갑니다.**
 * 게임 진행이 3D에 의존하면 안 돼요 — 여긴 그림일 뿐입니다. */
function onLost(e) {
  try { e.preventDefault(); } catch (err) {}
  fallback();
}

function fallback() {
  if (!R) return;
  const stage = R.stage;
  try { R.renderer.domElement.remove(); } catch (e) {}
  hardDispose();
  stage.classList.remove("is-3d");
  stage.classList.add("is-flat");
}

function frame() {
  if (!R) return;
  const rm = reduceMotion();
  const rig = R.rig;
  const now = performance.now();
  if (!rm) {
    const t = (now - R.t0) / 1000;
    /* 🌬️ 천의 느낌 — **전부 transform입니다.** 옷걸이에 걸린 옷처럼 아주 조금씩 흔들려요.
     *    (`left`/`top`/`box-shadow`를 움직이면 저사양에서 레이아웃·페인트를 다시 돕니다) */
    rig.shirt.position.y = Math.sin(t * 1.25) * 0.014;
    rig.shirt.rotation.z = Math.sin(t * 0.90) * 0.036;
    rig.shirt.rotation.x = Math.sin(t * 0.62) * 0.022;
    /* 부풀었다 가라앉는 숨 — 통의 가로만 1.2% 움직입니다 */
    const bl = 1 + Math.sin(t * 0.70) * 0.012;
    rig.body.scale.x = FIT.rBot * bl;
    rig.body.scale.z = FIT.rBot * FIT.flat * bl;
    rig.slL.g.rotation.x = Math.sin(t * 0.9) * 0.085;
    rig.slR.g.rotation.x = -Math.sin(t * 0.9 + 0.6) * 0.085;
    rig.ball.rotation.y = t * 0.5;
    /* 🎲 **굴린 손에 대한 대답** — 감쇠 진동 한 번. 아무것도 뜻하지 않아요 */
    let kick = 0;
    if (R.nudgeT) {
      const k = (now - R.nudgeT) / 620;
      if (k >= 1) R.nudgeT = 0;
      else kick = Math.sin(k * Math.PI * 3.2) * (1 - k) * 0.26;
    }
    /* 끌지 않는 동안만 스스로 조금 돌아요 — **등이 계속 읽히는 폭**입니다(±0.16rad).
     * 손을 대면 그 각도를 지킵니다. */
    const idle = R.drag && now - R.drag < 2600 ? 0 : Math.sin(t * 0.40) * 0.16;
    rig.shirt.rotation.y = REST + R.spin + idle + kick;
    /* ✨ 이름이 새겨지는 순간 — 0.42초 동안 한 번 찍힙니다 */
    if (rig.stampT) {
      const k = (now - rig.stampT) / 420;
      if (k >= 1) { rig.stampT = 0; rig.M.print.opacity = 1; }
      else rig.M.print.opacity = k;
    }
  } else {
    /* ♿ 정지 포즈 한 장. 회전도 흔들림도 없습니다 — 축약 대상이 아니에요.
     *    **등이 정면**입니다 — 이름과 번호가 정보라서, 멈춰도 그건 읽혀야 합니다. */
    rig.shirt.position.y = 0;
    rig.shirt.rotation.z = rig.shirt.rotation.x = 0;
    rig.slL.g.rotation.x = rig.slR.g.rotation.x = 0;
    rig.body.scale.x = FIT.rBot;
    rig.body.scale.z = FIT.rBot * FIT.flat;
    rig.shirt.rotation.y = REST + R.spin;
    rig.M.print.opacity = 1;
    rig.stampT = 0;
  }
  R.renderer.render(R.scene, R.camera);
  R.dirty = false;
}

function loop() {
  if (!R || paused) return;
  R.raf = requestAnimationFrame(loop);
  /* ♿ reduced-motion이면 **바뀐 게 있을 때만** 그립니다 (정지 화면이라 그릴 게 없어요) */
  if (reduceMotion() && !R.dirty) return;
  frame();
}

function pause() {
  paused = true;
  if (R && R.raf) { cancelAnimationFrame(R.raf); R.raf = 0; }
}

function resume() {
  if (!R || disposed) return;
  if (!paused) return;
  paused = false;
  R.t0 = performance.now() - 1000;   // 갑자기 처음 자세로 튀지 않게
  loop();
}

function hardDispose() {
  if (!R) return;
  pause();
  try { R.io && R.io.disconnect(); } catch (e) {}
  try { R.ro && R.ro.disconnect(); } catch (e) {}
  document.removeEventListener("visibilitychange", onVis);
  try {
    for (const g of R.rig.geo) g.dispose();
    for (const k in R.rig.M) R.rig.M[k].dispose();
    R.rig.ramp.dispose();
    R.rig.printTex.dispose();
    R.renderer.dispose();
    /* 컨텍스트를 **명시적으로** 놓아 줍니다. 브라우저 상한(8~16)에 걸리면
     * 가장 오래된 캔버스가 검게 죽어요 — dispose()만으로는 즉시 안 돌려줍니다. */
    const gl = R.renderer.getContext && R.renderer.getContext();
    const lose = gl && gl.getExtension && gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    R.renderer.domElement.remove();
  } catch (e) {}
  R = null;
}

/* ───────────────────────────────────────────────────────────────
 * 공개 API — **호출부는 이게 없어도 굴러가야 합니다**
 * ─────────────────────────────────────────────────────────────── */
const W2Char = {
  /* 무대 하나에 유니폼을 세웁니다. 이미 서 있으면 **갈아입히기만** 해요
   * (WebGL 컨텍스트는 커리어당 1개 — 다시 만들면 상한에 걸립니다).
   * spec = { name, number, foot, kit } — 전부 없어도 됩니다(그럼 무지 유니폼). */
  show(stage, spec) {
    if (!stage) return;
    const sp = spec || {};
    disposed = false;
    if (R && R.stage === stage) { applySpec(sp); resume(); return; }
    /* 🔑 **무대가 바뀌어도 컨텍스트는 하나입니다 — 캔버스만 옮겨요.**
     * 🎲를 누르면 조립대가 `innerHTML`로 통째로 다시 그려져서 무대 요소가 **매번 새것**이에요.
     * 그때마다 `WebGLRenderer`를 새로 만들면 브라우저 컨텍스트 상한(8~16)에 금방 걸리고,
     * **가장 오래된 캔버스가 검게 죽습니다.** */
    if (R) { adopt(stage); applySpec(sp); resume(); return; }
    if (!webglOK()) { stage.classList.add("is-flat"); return; }
    if (THREE) { try { mount(stage, sp); } catch (e) { stage.classList.add("is-flat"); } return; }
    /* ⏳ three.js 691KB는 **여기서 처음** 내려옵니다. 그 사이에 🎲를 누르면 무대가
     * 통째로 새로 그려져서 위 `stage`는 이미 버려진 요소예요 — 그래서 **가장 최근 것**을
     * 따로 들고 있다가 도착했을 때 그걸 씁니다. */
    pending = { stage, spec: sp };
    if (!loading) {
      loading = import("./vendor/three.module.min.js")
        .then((m) => { THREE = m; })
        .catch(() => { THREE = null; });
    }
    loading.then(() => {
      const p = pending;
      pending = null;
      if (!p) return;
      const live = document.body.contains(p.stage) ? p.stage : document.getElementById(p.stage.id);
      if (!live) return;                               // 그새 화면을 떠났으면 안 세웁니다
      if (!THREE) { live.classList.add("is-flat"); return; }
      try { mount(live, p.spec); } catch (e) { live.classList.add("is-flat"); }
    });
  },

  /* 👕 **서 있는 유니폼만 갈아입혀요** — 이름을 치는 동안 실시간으로 부르는 자리입니다.
   * 무대가 아직 없으면 아무 일도 안 해요 (`show`를 먼저 부르세요).
   * 🔑 이름이 **없다가 생기면** 한 번 찍히는 연출이 붙습니다 — 그게 ②의 사건이에요. */
  set(spec) { if (R && spec) applySpec(spec); },

  /* 🎲 굴린 손에 대한 대답 — 한 번 흔들립니다. **아무것도 뜻하지 않아요.** */
  nudge() {
    if (!R || reduceMotion()) return;
    R.nudgeT = performance.now();
    R.dirty = true;
    if (paused) frame();
  },

  pause,
  resume,
  /* 화면을 완전히 떠날 때. **다음 화면에서 프레임을 먹지 않게** 컨텍스트까지 놓습니다 */
  dispose() { disposed = true; hardDispose(); },
  get live() { return !!R; },

  /* 🖥️ 헤드리스 렌더 검사가 읽는 자리예요 (`82_director_jersey-3d.md`).
   * 게임 로직은 이걸 안 씁니다 — **연출이 결과를 만들면 안 됩니다.** */
  probe() {
    if (!R) return null;
    const V3 = THREE.Vector3;
    const rig = R.rig;
    const bw = rig.ball.getWorldPosition(new V3());
    const v = bw.clone().project(R.camera);
    const e = bw.clone().add(new V3(rig.ball.scale.x, 0, 0)).project(R.camera);
    const bt = bw.clone().add(new V3(0, rig.ball.scale.x, 0)).project(R.camera);
    const bb = bw.clone().add(new V3(0, -rig.ball.scale.x, 0)).project(R.camera);
    /* 🖨️ 등판이 **화면 어디에 얼마나** 나오는지 — 실제 지오메트리의 상자 여덟 귀퉁이를
     * 투영해서 잽니다. "글자를 그렸다"가 아니라 **"카메라 쪽을 보고 있고 무대 안에
     * 들어온다"**를 재는 자리예요.
     * ⚠️ 귀퉁이를 손으로 적으면 안 됩니다 — 등판은 곡률을 태워 만들었고(`printGeo`)
     *    반 바퀴 돌려 놨어요. 손으로 적은 좌표는 **그 두 가지를 모릅니다.** */
    const bb0 = rig.print.geometry.boundingBox
      || (rig.print.geometry.computeBoundingBox(), rig.print.geometry.boundingBox);
    const xs = [], ys = [];
    for (let i = 0; i < 8; i++) {
      const p = new V3(i & 1 ? bb0.max.x : bb0.min.x, i & 2 ? bb0.max.y : bb0.min.y, i & 4 ? bb0.max.z : bb0.min.z);
      rig.print.localToWorld(p).project(R.camera);
      xs.push(((p.x + 1) / 2) * 100); ys.push(((1 - (p.y + 1) / 2)) * 100);
    }
    /* 등판의 바깥 방향 = **로컬 −Z** (앞면으로 만들고 `rotateY(π)`를 태웠으니까요) */
    const nrm2 = new V3(0, 0, -1).applyQuaternion(rig.print.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const toCam = R.camera.position.clone().sub(rig.print.getWorldPosition(new V3())).normalize();
    const kit = rig.kit || {};
    return {
      foot: R.spec && R.spec.foot,
      name: R.spec && R.spec.name, number: R.spec && R.spec.number,
      kit: { body: kit.body, sleeve: kit.sleeve, trim: kit.trim, text: kit.text, pattern: kit.pattern },
      /* 🖨️ 프린트 — `empty`가 true면 **무지**입니다 (①의 상태) */
      print: Object.assign({}, rig.printInfo, {
        visible: rig.print.visible, opacity: +rig.M.print.opacity.toFixed(2),
        px: rig.printCv.width,
        l: +Math.min.apply(null, xs).toFixed(1), r: +Math.max.apply(null, xs).toFixed(1),
        t: +Math.min.apply(null, ys).toFixed(1), b: +Math.max.apply(null, ys).toFixed(1),
        facing: +nrm2.dot(toCam).toFixed(3),   // 1 = 등이 카메라 정면
      }),
      /* ⚽ 공은 **가운데**예요. 좌우로 주발을 말하지 않습니다 — A절이 이걸 잽니다 */
      ball: { x: +rig.ball.position.x.toFixed(3), y: +rig.ball.position.y.toFixed(3) },
      ballPct: +(((v.x + 1) / 2) * 100).toFixed(1),
      ballW: +(Math.abs(e.x - v.x) * 100).toFixed(1),
      ballTopPct: +(((1 - (bt.y + 1) / 2)) * 100).toFixed(1),
      ballBotPct: +(((1 - (bb.y + 1) / 2)) * 100).toFixed(1),
      top: +(rig.top || 0).toFixed(3),
      spinY: +rig.shirt.rotation.y.toFixed(3),
      /* 🔴 **🎲를 굴려도 여기가 1이어야 합니다.** 조립대는 굴릴 때마다 `innerHTML`로
       * 통째로 다시 그려져요 — 그때 컨텍스트를 새로 만들면 상한(8~16)에 걸려
       * **가장 오래된 캔버스가 검게 죽습니다.** 캔버스만 옮겨 답니다(`adopt`). */
      mounts,
      tris: R.renderer.info.render.triangles,
      calls: R.renderer.info.render.calls,
      reduce: reduceMotion(), paused,
    };
  },
};

window.W2Char = W2Char;
/* 🧬 조립대가 이미 그려진 뒤에 이 파일이 도착할 수 있어요 (module = 항상 늦습니다).
 * 그때 다시 칠하라고 알려 줍니다 — prospect.js가 이 이벤트를 듣고 있어요. */
try { window.dispatchEvent(new Event("w2char-ready")); } catch (e) {}

export default W2Char;
