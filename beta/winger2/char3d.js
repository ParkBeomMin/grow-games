/* ⚽ 더 윙어 II — 🧍 3D 캐릭터 뷰어 (`window.W2Char`)
 *
 * 🎯 이 파일이 맡는 것은 **선수 한 명을 세워 보여주는 것 하나**예요.
 *    장비·골 세리머니는 이번 범위가 아닙니다 (설계 70번 갈래 D1 → D2 순서).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🔴 절대 지킬 것 넷 — 이걸 어기면 게임이 아니라 **검사와 밸런스가 죽습니다**
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ① **ES module입니다.** `<script type="module">`로만 불러와요.
 *    그래서 `window.W2Char`는 **항상 늦게 생깁니다** — 모든 호출부가
 *    "없는 순간"을 견뎌야 해요. 이건 제약이 아니라 **폴백이 공짜로 생기는 구조**입니다.
 *    jsdom은 module 스크립트를 아예 실행하지 않아서, 검사에서는 이 파일이 **없는 것과
 *    같습니다.** (`tests/winger2/_load.js`의 치환 정규식이 `<script src=`만 잡아요 —
 *    `type="module"`이 먼저 오면 안 걸립니다. 그게 의도입니다.)
 *
 * ② **three.js는 처음 필요할 때만 내려받습니다** (동적 `import()`).
 *    `vendor/three.module.min.js`가 691KB(gzip ~167KB)예요. 타이틀 화면과
 *    🏠 유스 36턴이 그 값을 치를 이유가 없습니다. 🧬 조립대에 **처음 들어올 때** 옵니다.
 *
 * ③ **🔥 순간 카드가 도는 동안 렌더하지 않습니다.**
 *    미니게임은 **프레임 위에서 판정**해요. 저사양 폰에서 3D가 같이 돌면 프레임이
 *    떨어지고 → 판정이 나빠지고 → `s` 분포가 내려가고 → 곡선이 **기기 성능에 의존**합니다.
 *    밸런스 사고가 아니라 **밸런스를 잴 수 없게 되는 사고**예요.
 *    → `pause()` / `resume()`가 그래서 공개 API입니다. 지금은 조립대에만 서 있어서
 *      직접 부딪히진 않지만, 화면을 떠나면 `IntersectionObserver`가 스스로 멈춥니다.
 *
 * ④ **실패해도 화면이 멀쩡해야 합니다.** WebGL이 없거나(jsdom·구형 기기),
 *    three.js 내려받기가 실패하거나, 컨텍스트를 잃으면 → **CSS 실루엣으로 조용히**
 *    돌아갑니다. 실루엣은 지우지 않고 무대 안에 **늘 깔려 있어요** — 3D가 그 위를 덮습니다.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🎨 캐릭터를 코드로 만듭니다 — 외부 모델 파일 0개
 * ═══════════════════════════════════════════════════════════════════════
 *   · `MeshToonMaterial` + 3단 `gradientMap` — 무광 셀셰이딩이 "아기자기"의 실체예요
 *   · 조명 2개 (`Hemisphere` + `Directional`) · **그림자 없음**
 *   · 유니폼 색은 무대의 CSS 변수 `--pc-tone`에서 읽어옵니다 (원칙 ⑥ — 절대색 금지)
 *   · 폴리 ≈ 1,200 tri · 드로우콜 18 — 설계 70번의 「≤ 12」를 **넘깁니다.**
 *     👀 눈 2 · 🧦 양말 2 · 👕 소매 2가 늘었어요. 셋 다 뺄 수 없다고 판단했습니다:
 *     눈이 없으면 마네킹이고, 소매가 없으면 유니폼이 크롭탑으로 읽힙니다(렌더 확인).
 *     파츠가 전부 200 tri 미만이라 폴리 예산은 오히려 줄었어요.
 *   · 머리를 크게 (약 2.3등신) — **귀여움은 비율에서 나옵니다**
 *
 * 🎲 **체형이 배분에서 나옵니다.** 굴리면 몸이 바뀌어요:
 *      🛡️수비+🫀체력 → 몸통·어깨 두께 · ⚡스피드+🏃드리블 → 다리 길이
 *      ⚽슛 → 허벅지 굵기 · 🎯패스 → 팔 길이 · `shapeKey` → 머리 모양·색
 *
 * 📏 **키는 아직 없습니다** (다음 차례) — `spec.height`(0~1) 자리만 뚫어 뒀어요.
 *    안 주면 0.5로 봅니다. 들어오면 `root.scale`과 다리 비율에 함께 실립니다.
 */

/* ───────────────────────────────────────────────────────────────
 * 상수 — 값의 출처를 적어 둡니다
 * ─────────────────────────────────────────────────────────────── */
const STAT_LO = 18, STAT_HI = 54;   // prospect.js의 한 칸 하한/상한. 여기서 0~1로 정규화해요
const TONE_FALLBACK = "#6fc9ff";    // style.css `--sky`. 변수를 못 읽는 순간의 대비책
const SKIN = [0xf3d0ab, 0xe0ab7d, 0xc08850, 0x8d5a34];
const HAIR = [0x2b2119, 0x5b3a22, 0x161311, 0x7a4b2a, 0x3d2b45, 0x1f3550];

let THREE = null;         // 동적 import 결과 (한 번만)
let loading = null;       // 진행 중인 import 약속
let R = null;             // 살아 있는 무대 한 벌 { renderer, scene, camera, rig, … }
let pending = null;       // three.js를 기다리는 동안의 최신 요청 { stage, spec }
let mounts = 0;          // WebGL 컨텍스트를 몇 번 만들었나 — 🖥️ 렌더 검사가 봅니다
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

/* 무대의 CSS 변수에서 유니폼 색을 읽어요 — **절대색을 박으면 🌏 월드컵 테마에서
 * 그 칸만 다른 게임 색이 됩니다.** 아이돌에서 실제로 겪은 사고입니다. */
function toneOf(el) {
  try {
    const v = getComputedStyle(el).getPropertyValue("--pc-tone").trim();
    return v || TONE_FALLBACK;
  } catch (e) { return TONE_FALLBACK; }
}

/* ───────────────────────────────────────────────────────────────
 * 🧍 리그를 만듭니다 — **한 번만.** 이후 `set()`은 scale·position만 움직여요.
 *    지오메트리를 다시 만들면 🎲를 누를 때마다 할당이 생기고 저사양에서 끊깁니다.
 * ─────────────────────────────────────────────────────────────── */
function buildRig(tone) {
  const T = THREE;

  /* 3단 셀셰이딩 램프. Nearest라 경계가 딱 끊겨요 — 그게 무광 장난감 느낌입니다 */
  const ramp = new T.DataTexture(
    new Uint8Array([100, 100, 100, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
  ramp.minFilter = ramp.magFilter = T.NearestFilter;
  ramp.needsUpdate = true;
  const mat = (c) => new T.MeshToonMaterial({ color: c, gradientMap: ramp });

  const M = {
    skin: mat(SKIN[0]), hair: mat(HAIR[0]), kit: mat(new T.Color(tone)),
    shorts: mat(0x232f4c), sock: mat(0xeff4ff), boot: mat(0x141c2e),
    ball: mat(0xffffff), eye: mat(0x201a16),
  };

  /* 📐 **모든 파츠를 「반지름 1」 단위로 만듭니다.**
   *    그래야 `scale`이 곧 **반지름/반길이**가 되어 치수를 머리로 계산할 수 있어요.
   *    ⚠️ `CapsuleGeometry(1, 1, …)`는 **총 높이가 3**입니다 — 이걸 반지름으로 착각하면
   *       몸통이 세 배로 자라요(첫 렌더에서 실제로 머리가 무대 밖으로 나갔습니다).
   *       그래서 몸통도 **구를 눌러 만든 타원체**로 갑니다 — 치수가 정직해요. */
  const cyl = new T.CylinderGeometry(1, 1, 1, 8).translate(0, -0.5, 0);   // 위 끝이 원점 → scale.y = 길이
  const sph = new T.SphereGeometry(1, 12, 8);      // 168 tri — 6개가 쓰여서 여기가 예산의 절반이에요
  const dot = new T.SphereGeometry(1, 6, 4);       // 👀 눈은 3px로 보입니다. 36 tri면 충분해요
  const box = new T.BoxGeometry(1, 1, 1);
  /* 🧒 머리카락 — **윗부분만 덮는 뚜껑**이에요. 구를 통째로 씌우면 헬멧이 되고
   *    얼굴이 사라집니다 (첫 렌더에서 그랬어요). 위 55%만 잘라 옵니다. */
  const capH = new T.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.56);

  const root = new T.Group();
  const body = new T.Group();          // 숨쉬기·흔들림이 여기 걸립니다
  root.add(body);

  const torso = new T.Mesh(sph, M.kit);
  const hips = new T.Mesh(sph, M.shorts);
  const headG = new T.Group();
  const head = new T.Mesh(sph, M.skin);
  const hair = new T.Mesh(capH, M.hair);
  const fringe = new T.Mesh(box, M.hair);      // 앞머리 — 머리 모양을 가르는 조각
  const eyeL = new T.Mesh(dot, M.eye), eyeR = new T.Mesh(dot, M.eye);
  headG.add(head, hair, fringe, eyeL, eyeR);

  /* 👕 **소매가 있어야 유니폼으로 읽힙니다.** 팔을 통째로 살색으로 두면
   *    몸통의 파란 타원이 「크롭탑」처럼 보여요 (렌더에서 실제로 그렇게 나왔습니다). */
  const arm = () => {
    const g = new T.Group();
    const m = new T.Mesh(cyl, M.skin);
    const sleeve = new T.Mesh(cyl, M.kit);
    g.add(m, sleeve);
    return { g, m, sleeve };
  };
  const leg = () => {
    const g = new T.Group();
    const m = new T.Mesh(cyl, M.skin);          // 허벅지·정강이
    const sock = new T.Mesh(cyl, M.sock);       // 🧦 양말 — 다리 아래쪽
    const foot = new T.Mesh(box, M.boot);       // 👟 축구화 (🛍️ 장비 슬롯이 나중에 붙을 자리)
    g.add(m, sock, foot);
    return { g, m, sock, foot };
  };
  const armL = arm(), armR = arm();
  const legL = leg(), legR = leg();

  body.add(torso, hips, headG, armL.g, armR.g, legL.g, legR.g);

  const ball = new T.Mesh(sph, M.ball);
  root.add(ball);

  return { root, body, torso, hips, headG, head, hair, fringe, eyeL, eyeR,
    armL, armR, legL, legR, ball, M, ramp,
    geo: [cyl, sph, dot, box, capH] };
}

/* ───────────────────────────────────────────────────────────────
 * 📊 배분 → 체형. **🎲가 눈에 보이는 자리가 여기입니다.**
 *
 * 🔑 여섯 칸 중 **다섯이 몸에 실립니다.** 한 칸만 쓰면 굴려도 거의 안 변해요 —
 *    총합이 194로 고정이라 한 칸이 오르면 다른 칸이 내려가는데, 그 「내려간 칸」이
 *    몸에 안 실리면 **굴림이 한 방향으로만 보입니다.**
 * ─────────────────────────────────────────────────────────────── */
const nrm = (v) => Math.max(0, Math.min(1, ((Number(v) || STAT_LO) - STAT_LO) / (STAT_HI - STAT_LO)));

function shapeRig(rig, spec) {
  const s = spec.stats || {};
  const bulk = (nrm(s.defense) + nrm(s.stamina)) / 2;   // 🛡️+🫀 → 몸통 두께
  const legN = (nrm(s.speed) + nrm(s.dribble)) / 2;     // ⚡+🏃 → 다리 길이
  const thigh = nrm(s.shoot);                            // ⚽ → 다리 굵기
  const armN = nrm(s.pass);                              // 🎯 → 팔 길이

  /* 📏 키 자리 — 아직 아무도 안 넘겨줘요. 들어오면 여기서부터 실립니다 */
  const H = spec.height == null ? 0.5 : Math.max(0, Math.min(1, Number(spec.height)));
  const grow = 0.94 + 0.12 * H;

  /* 📐 치수 (단위 ≈ m). 발끝이 y=0, 머리끝이 `top` */
  const legLen = (0.52 + 0.20 * legN) * grow;   // 엉덩이 → 발목
  const legR = 0.085 + 0.038 * thigh;
  const hipY = legLen;
  const torsoRY = 0.30 * grow;                   // 몸통 타원체 세로 반지름
  const torsoRX = 0.255 + 0.085 * bulk;          // 가로 반지름 ← 🎲가 가장 크게 바꾸는 값
  const torsoCY = hipY + torsoRY * 0.86;
  const shoulderY = torsoCY + torsoRY * 0.52;
  const headR = 0.385;                           // 🧒 거의 안 변합니다 (아래 설명)
  /* ⚠️ 머리 밑동이 **몸통 안에 파묻히면** 유니폼이 안 보입니다 (첫 렌더에서 0.10만큼 잠겼어요).
   *    머리 바닥(headY − headR)이 몸통 꼭대기(torsoCY + torsoRY)보다 위여야 해요.
   *    `0.74`로는 아직 0.10이 잠겨서 유니폼이 반쪽만 보였습니다 — 두 번 고쳤어요. */
  const headY = torsoCY + torsoRY + headR * 0.95;
  const armLen = 0.40 + 0.10 * armN;

  rig.torso.scale.set(torsoRX, torsoRY, torsoRX * 0.80);
  rig.torso.position.set(0, torsoCY, 0);

  rig.hips.scale.set(torsoRX * 0.92, 0.115, torsoRX * 0.76);
  rig.hips.position.set(0, hipY + 0.03, 0);

  /* 🧒 **머리는 고정입니다.** 귀여움의 기준점이라 여기가 흔들리면 🎲를 굴릴 때마다
   *    「다른 사람」이 돼요 — 내 선수가 아니게 됩니다. 약 2.3등신을 지킵니다. */
  rig.headG.position.set(0, headY, 0);
  rig.head.scale.setScalar(headR);

  const shx = torsoRX * 0.96;
  rig.armL.g.position.set(-shx, shoulderY, 0);
  rig.armR.g.position.set(shx, shoulderY, 0);
  for (const a of [rig.armL, rig.armR]) {
    a.m.scale.set(0.072, armLen, 0.072);
    a.sleeve.scale.set(0.086, armLen * 0.42, 0.086);
  }
  /* 팔을 살짝 벌려요 — 딱 붙이면 널빤지처럼 보입니다 */
  rig.armL.g.rotation.z = 0.10;
  rig.armR.g.rotation.z = -0.10;

  const hipX = torsoRX * 0.52;
  rig.legL.g.position.set(-hipX, hipY + 0.02, 0);
  rig.legR.g.position.set(hipX, hipY + 0.02, 0);
  for (const l of [rig.legL, rig.legR]) {
    l.m.scale.set(legR, legLen, legR);
    l.sock.scale.set(legR * 1.09, legLen * 0.40, legR * 1.09);
    l.sock.position.set(0, -legLen * 0.60, 0);
    l.foot.scale.set(legR * 2.2, 0.085, legR * 3.4);
    l.foot.position.set(0, -legLen - 0.02, legR * 1.2);
  }

  /* 🦶 **주발 — 공이 그 발 옆에 놓입니다.**
   *
   * ⚠️ 여기가 이 파일에서 가장 틀리기 쉬운 자리예요. 캐릭터는 **우리를 마주 보고**
   *    서 있어서 **캐릭터의 왼발은 화면 오른쪽**에 보입니다. 예전에 🦶 주발 표시의
   *    색이 판정과 반대쪽이던 버그가 정확히 이 형태였어요 — *"안 보이는 것"*이 아니라
   *    **거짓말을 하고 있던 것**입니다.
   *
   * 🔒 그래서 세 겹으로 막습니다:
   *    ① 부호를 **여기 한 곳에서만** 정합니다 (`side`)
   *    ② 화면의 `🦶 왼발` 칩을 **공 바로 옆**에 붙입니다 (prospect.js · style.css)
   *    ③ 헤드리스 렌더 검사가 `probe().ball.x`의 부호를 잽니다 (78번 문서)
   */
  const side = spec.foot === "L" ? +1 : -1;   // 캐릭터의 왼발 = 월드(화면) +X
  const ballR = 0.145;
  rig.ball.scale.setScalar(ballR);
  rig.ball.position.set(side * (hipX + legR + ballR + 0.24), ballR, legR * 2.4);

  /* 🎲 `shapeKey`가 머리 모양·머리색·피부색을 가릅니다 — 굴릴 때마다 인상이 달라져요.
   * ⚠️ 이름과 나이는 안 바뀝니다. **바뀌는 것과 안 바뀌는 것의 대비**가 조립대의 교육이에요. */
  const key = String(spec.shapeKey || "shoot");
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  rig.M.skin.color.setHex(SKIN[h % SKIN.length]);
  rig.M.hair.color.setHex(HAIR[(h >> 3) % HAIR.length]);
  const style = (h >> 6) % 3;
  rig.hair.scale.set(headR * 1.045, headR * (style === 2 ? 1.16 : 0.92), headR * 1.045);
  rig.hair.position.set(0, headR * (style === 2 ? -0.08 : 0.02), 0);
  rig.fringe.scale.set(headR * 1.16, headR * (style === 0 ? 0.22 : 0.14), headR * 0.40);
  rig.fringe.position.set(0, headR * 0.60, headR * 0.78);
  rig.fringe.visible = style !== 1;

  /* 👀 눈 두 개 — 얼굴이 없으면 인형이 아니라 마네킹이에요. 납작한 구 두 개면 됩니다 */
  for (const [e, sx] of [[rig.eyeL, -1], [rig.eyeR, 1]]) {
    e.scale.set(headR * 0.105, headR * 0.135, headR * 0.06);
    e.position.set(sx * headR * 0.30, -headR * 0.06, headR * 0.95);
  }

  rig.M.kit.color.set(new THREE.Color(spec.tone || TONE_FALLBACK));

  /* 🖼️ **구도** — 캐릭터를 오른쪽으로 밀어 **왼쪽 아래를 이름표에 내줍니다.**
   *    무대가 가로로 넓어요(390px에서 354×240 · 비 1.48). 가운데 세우면 좌우가 통째로 빕니다.
   *    ⚠️ 이름표를 **아래**에 얹었더니 그늘이 ⚽ 공과 👟 축구화를 통째로 삼켰어요 —
   *       그래서 이름표는 **왼쪽 위**로 갔고, 무대 아래는 공에게 내줍니다. */
  rig.root.position.x = 0.26;

  /* 카메라가 늘 같은 자리를 보게 — 키가 바뀌어도 발이 바닥, 머리가 위쪽에 옵니다 */
  rig.top = headY + headR;
  return rig;
}

/* ───────────────────────────────────────────────────────────────
 * 무대 만들기 · 그리기
 * ─────────────────────────────────────────────────────────────── */
function mount(stage, spec) {
  const T = THREE;
  const tone = toneOf(stage);
  const renderer = new T.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  const cv = renderer.domElement;
  cv.className = "w2c-canvas";
  cv.setAttribute("aria-hidden", "true");
  stage.appendChild(cv);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(26, 1, 0.1, 20);
  scene.add(new T.HemisphereLight(0xdce9ff, 0x2a3560, 1.15));
  const dir = new T.DirectionalLight(0xfff3e0, 1.25);
  dir.position.set(2.2, 3.4, 2.6);
  scene.add(dir);

  const rig = buildRig(tone);
  scene.add(rig.root);

  mounts += 1;
  R = { renderer, scene, camera, rig, stage, spec: null, tone, spin: 0, drag: null, t0: performance.now(), raf: 0, io: null, ro: null, dirty: true };
  applySpec(spec);
  resize();

  /* 화면 밖이면 루프를 멈춥니다 — 유스 36턴 내내 도는 걸 막는 장치예요.
   * `show()`가 화면을 `display:none`으로 감추면 여기서 not-intersecting이 옵니다. */
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

function applySpec(spec) {
  if (!R) return;
  R.spec = spec;
  shapeRig(R.rig, Object.assign({ tone: R.tone }, spec));
  markBall();
  R.dirty = true;
}

/* ⚽ **공이 화면 어디에 있는지를 CSS로 넘겨줍니다.**
 *
 * 🔑 🦶 주발 칩은 *"공 옆"*에 있어야 뜻이 통합니다. 그런데 공의 화면 위치는
 *    카메라 거리 · 무대 비율 · 체형(다리 굵기)에 따라 움직여요 — **CSS가 알 수 없는 값**입니다.
 *    %를 손으로 박으면 무대 높이 하나만 바꿔도 칩이 공을 덮습니다(렌더에서 실제로 났어요).
 *    그래서 **3D가 재서 알려 주고, CSS가 그 옆에 붙입니다.**
 * ⚠️ 폴백(WebGL 없음)에서는 이 변수가 안 생겨요 — 그때는 `.foot-L/.foot-R`의
 *    기본 자리가 그대로 쓰입니다. 그게 폴백이 조용히 동작하는 방식입니다. */
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
    /* 무대 아래에서 잰 공 밑동 — 🦶 칩이 그 아래에 앉습니다 */
    R.stage.style.setProperty("--ball-bot", (((u.y + 1) / 2) * 100).toFixed(2) + "%");
  } catch (err) {}
}

function resize() {
  if (!R) return;
  const w = Math.max(1, R.stage.clientWidth), h = Math.max(1, R.stage.clientHeight);
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h;
  /* 📐 **발이 무대의 80% 지점에 오게** 잡습니다 — 아래 20%는 🦶 주발 칩 자리예요.
   *    (86%로 잡았더니 칩이 무대 아래 테두리에 딱 붙었습니다 — 렌더에서 재고 내렸어요)
   *    무대 높이가 `clamp()`라 기기마다 달라서, 고정 거리로 두면 짧은 폰에서 머리가 잘립니다.
   *    (첫 렌더에서 실제로 머리와 발이 동시에 잘렸어요 — 계산해서 맞춥니다)
   *
   *    보이는 세로 구간 = [-0.20·V, 0.80·V] · V = (머리끝 + 여유) / 0.80 */
  const top = (R.rig.top || 1.9) + 0.14;
  const V = top / 0.80;                               // 보이는 세로 길이(월드 단위)
  const midY = V * 0.30;                              // (0.80 + (-0.20)) / 2 = 0.30
  const dist = (V / 2) / Math.tan((R.camera.fov * Math.PI) / 360);
  R.camera.position.set(0, midY, dist);
  R.camera.lookAt(0, midY, 0);
  R.camera.updateProjectionMatrix();
  markBall();          // 무대 크기가 바뀌면 공의 화면 위치도 바뀝니다
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

/* 컨텍스트를 잃으면 **되살리려 애쓰지 않고 실루엣으로 내려갑니다.**
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
  if (!rm) {
    const t = (performance.now() - R.t0) / 1000;
    /* 🌬️ 숨쉬기 + 아주 느린 좌우 — **transform만** 움직입니다 */
    R.rig.body.position.y = Math.sin(t * 1.6) * 0.012;
    R.rig.body.rotation.z = Math.sin(t * 0.8) * 0.012;
    R.rig.armL.g.rotation.x = Math.sin(t * 1.6) * 0.10;
    R.rig.armR.g.rotation.x = -Math.sin(t * 1.6) * 0.10;
    R.rig.ball.rotation.y = t * 0.6;
    /* 끌지 않는 동안만 스스로 조금 돌아요. 손을 대면 그 각도를 지킵니다 */
    const idle = R.drag && performance.now() - R.drag < 2600 ? 0 : Math.sin(t * 0.42) * 0.34;
    R.rig.root.rotation.y = R.spin + idle;
  } else {
    /* ♿ 정지 포즈 한 장. 회전도 흔들림도 없습니다 — 축약 대상이 아니에요 */
    R.rig.body.position.y = 0;
    R.rig.body.rotation.z = 0;
    R.rig.armL.g.rotation.x = R.rig.armR.g.rotation.x = 0;
    R.rig.root.rotation.y = R.spin - 0.30;
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
  /* 무대 하나에 선수를 세웁니다. 이미 서 있으면 **모양만 갈아입혀요**
   * (WebGL 컨텍스트는 커리어당 1개 — 다시 만들면 상한에 걸립니다). */
  show(stage, spec) {
    if (!stage || !spec) return;
    disposed = false;
    if (R && R.stage === stage) { applySpec(spec); resume(); return; }
    /* 🔑 **무대가 바뀌어도 컨텍스트는 하나입니다 — 캔버스만 옮겨요.**
     * 🎲를 누르면 조립대가 `innerHTML`로 통째로 다시 그려져서 무대 요소가 **매번 새것**이에요.
     * 그때마다 `WebGLRenderer`를 새로 만들면 브라우저 컨텍스트 상한(8~16)에 금방 걸리고,
     * **가장 오래된 캔버스가 검게 죽습니다.** 설계 70번 §6이 못박은 그 자리예요. */
    if (R) { adopt(stage); applySpec(spec); resume(); return; }
    if (!webglOK()) { stage.classList.add("is-flat"); return; }
    if (THREE) { try { mount(stage, spec); } catch (e) { stage.classList.add("is-flat"); } return; }
    /* ⏳ three.js 691KB는 **여기서 처음** 내려옵니다. 그 사이에 🎲를 누르면 무대가
     * 통째로 새로 그려져서 위 `stage`는 이미 버려진 요소예요 — 그래서 **가장 최근 것**을
     * 따로 들고 있다가 도착했을 때 그걸 씁니다. 안 그러면 굴리는 동안 3D가 영영 안 떠요. */
    pending = { stage, spec };
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
  pause,
  resume,
  /* 화면을 완전히 떠날 때. **다음 화면에서 프레임을 먹지 않게** 컨텍스트까지 놓습니다 */
  dispose() { disposed = true; hardDispose(); },
  get live() { return !!R; },
  /* 🖥️ 헤드리스 렌더 검사가 읽는 자리예요 (`78_director_avatar-3d.md`).
   * 게임 로직은 이걸 안 씁니다 — **연출이 결과를 만들면 안 됩니다.** */
  probe() {
    if (!R) return null;
    const b = R.rig.ball.position, l = R.rig.legL.g.position, r = R.rig.legR.g.position;
    /* ⚽ 공을 **화면 좌표(무대 안 %)**로 투영합니다 — 🦶 칩이 정말 공 옆에 붙었는지는
     * 월드 좌표가 아니라 화면에서 재야 알 수 있어요 (카메라·비율이 끼어듭니다). */
    const V3 = THREE.Vector3;
    const bw = R.rig.ball.getWorldPosition(new V3());
    const v = bw.clone().project(R.camera);
    /* 공의 **화면 지름(%)** — 🦶 칩이 공을 덮지 않는지 재려면 위치만으론 부족해요 */
    const e = bw.clone().add(new V3(R.rig.ball.scale.x, 0, 0)).project(R.camera);
    const bt = bw.clone().add(new V3(0, R.rig.ball.scale.x, 0)).project(R.camera);
    const bb = bw.clone().add(new V3(0, -R.rig.ball.scale.x, 0)).project(R.camera);
    return {
      foot: R.spec && R.spec.foot,
      ball: { x: +b.x.toFixed(3), y: +b.y.toFixed(3) },
      ballPct: +(((v.x + 1) / 2) * 100).toFixed(1),   // 무대 왼쪽 0% ~ 오른쪽 100%
      ballW: +(Math.abs(e.x - v.x) * 100).toFixed(1), // 지름을 무대 폭의 %로
      ballTopPct: +(((1 - (bt.y + 1) / 2)) * 100).toFixed(1),   // 무대 위 0% ~ 아래 100%
      ballBotPct: +(((1 - (bb.y + 1) / 2)) * 100).toFixed(1),
      legL: +l.x.toFixed(3), legR: +r.x.toFixed(3),
      top: +(R.rig.top || 0).toFixed(3),
      /* 🔴 **🎲를 굴려도 여기가 1이어야 합니다.** 조립대는 굴릴 때마다 `innerHTML`로
       * 통째로 다시 그려져요 — 그때 컨텍스트를 새로 만들면 상한(8~16)에 걸려
       * **가장 오래된 캔버스가 검게 죽습니다.** 캔버스만 옮겨 답니다(`adopt`). */
      mounts,
      tris: R.renderer.info.render.triangles,
      torsoRX: +R.rig.torso.scale.x.toFixed(4), legLen: +R.rig.legL.m.scale.y.toFixed(4),
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
