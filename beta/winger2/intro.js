/* 🦶 주발 · 🗺️ 동네 — ⚽ 더 윙어 II 생성 흐름 앞단 두 화면 (winger2 전용)
 *
 *   WingerIntro.openFoot(cur, done)     🦶 발 두 짝을 그리고, 탭하면 done("L"|"R")
 *   WingerIntro.openOrigin(cur, done)   🗺️ 17개 시·도 지도. [다음]에서 done(originId)
 *   WingerIntro.nameOf(id) / lineOf(id) 🗂️ 세이브·기록이 읽는 창구 (없으면 "🌍 미상")
 *   WingerIntro.step(screenId)          🔢 "2 / 4" — 화면 순서가 바뀌면 STEPS 한 줄만 고치세요
 *
 * ── 왜 전용 파일인가 ─────────────────────────────────────────
 * `timing.js`·`base.css`·`match.js`는 **8개 게임이 전부 내려받습니다.** 축구 하나만 쓰는
 * 화면을 거기 넣으면 안 쓰는 게임까지 무게를 집니다 — 🏘️ `town.js`와 같은 이유예요.
 *
 * ⚠️ **이 두 화면은 곧 재배치됩니다** (93번 §5 · 🏫 학교 3단계).
 *    초등부에는 포지션이 없어져서 🎯 자리 화면이 카드 뒤로 빠지고, 그때 흐름이
 *    `이름 → 🦶 주발 → 🗺️ 동네 → 🏫 초등부`가 돼요. **그래서 주변과 안 얽히게 짰습니다** —
 *    game.js가 아는 것은 `openFoot`·`openOrigin` 둘과 `S.origin` 한 칸뿐입니다.
 *
 * ══════════════════════════════════════════════════════════════════════
 * 🔒 **지역은 산식에 한 톨도 안 닿습니다 — 텍스트만 바꿉니다** (설계 93번 §4-2)
 * ══════════════════════════════════════════════════════════════════════
 * 지역이 바꾸는 것은 📖 스토리 한 줄과 🏛️ 지역 기록뿐이에요.
 * `autoP`·`fit`·`spotMul`·`growth`·`debut` 어디에도 안 닿습니다.
 *
 * 🔴 *"고르는데 효과가 없다"*는 압박이 **반드시** 옵니다 (79번 위험표에 이미 적혀 있어요).
 *    특히 🇰🇷 K리그 유스를 *"우리 동네 팀"*으로 묶고 싶어질 텐데, **그건 지역을 `fit`에
 *    넣는 것**입니다. 지역은 **정체성 + 기록**이고, 보상은 🏛️ 지역별 명예의 전당이에요.
 */
window.WingerIntro = (() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  /* 🔢 생성 화면의 차례. **화면 순서가 바뀌면 여기 한 줄만** 고치면 됩니다.
   * ⚠️ 🎯 자리는 학교 아크가 들어오면 이 목록에서 빠져 카드 뒤로 갑니다(93번 §2). */
  const STEPS = ["screen-name", "screen-foot", "screen-origin", "screen-position"];
  const step = (id) => {
    const i = STEPS.indexOf(id);
    return i < 0 ? "" : `${i + 1} / ${STEPS.length}`;
  };

  /* ══════════════════════════════════════════════════════════════════
   * 🦶 주발
   * ══════════════════════════════════════════════════════════════════
   * 🔑 **판정 창 ±25%는 여기서 만들지 않습니다** — `W2Moment._t.K.FOOT_WIN`에서
   *    읽어 와요. 숫자를 베껴 적으면 상수를 바꾼 날 화면만 옛말을 하게 됩니다.
   *    (그게 「초록불인데 아무것도 안 지키는」 것의 화면판이에요.) */
  const footWin = () => {
    const K = window.W2Moment && W2Moment._t && W2Moment._t.K;
    return K && typeof K.FOOT_WIN === "number" ? K.FOOT_WIN : 0.25;
  };

  /* 🔴 **좌우를 여기서 다시 판단하지 않습니다.** winger-moment.js의 판정 줄과
   *    **글자 그대로 같은 모양**으로 씁니다:
   *
   *      runCutin  : const right = ctx.foot !== "L";
   *                  lanes = [ {x:26, strong:!right}, {x:74, strong:right} ]
   *      runOneone : const right = ctx.foot !== "L";  // 오른쪽 절반이 주발 쪽
   *
   *    → **오른발잡이면 오른쪽 칸이 넓습니다.** 화면도 그래야 해요.
   *
   * ⚠️ 2026-08-29에 정확히 이 자리에서 사고가 났습니다 — 🦶 표시 색이 판정과
   *    **반대쪽**이었어요. 넓다고 색칠된 쪽이 실제로는 좁은 쪽이었습니다.
   *    *"안 보이는 것"*이 아니라 **거짓말을 하고 있던 것**이에요.
   *    한쪽만 고치면 또 갈라지니, 조건을 판정 줄과 같은 모양으로 두세요. */
  function gateHTML(foot) {
    const right = foot !== "L";                       // ← 판정 줄과 같은 모양
    const w = footWin();
    const lanes = [
      { side: "left", strong: !right },               // 왼쪽 칸  (runCutin의 x=26)
      { side: "right", strong: right },               // 오른쪽 칸 (runCutin의 x=74)
    ];
    return `<span class="foot-gate" aria-hidden="true">`
      + lanes.map((l) => `<i class="fg-lane ${l.strong ? "w2m-strong" : "w2m-weak"}"`
        + ` data-side="${l.side}" style="flex:${(1 + (l.strong ? w : -w)).toFixed(2)}">`
        + `${l.strong ? "🦶" : ""}</i>`).join("")
      + `</span>`;
  }

  /* 🦶 발 한 짝. **CSS로 그립니다** — 이미지도 캔버스도 안 씁니다(오프라인 PWA).
   * 기본은 오른발 모양이고, 왼발은 `.foot-art`를 통째로 좌우 반전해요.
   * ⚽ 공은 **고른 쪽 발 앞**에만 붙습니다 — 탭한 순간 `.on`이 붙으면서 굴러들어와요. */
  function cardHTML(foot) {
    const nm = foot === "L" ? "왼발" : "오른발";
    return `<button type="button" class="foot-card" data-foot="${foot}"`
      + ` aria-label="${nm}잡이로 시작해요">`
      + `<span class="foot-art" aria-hidden="true">`
      + `<i class="foot-sock"></i><i class="foot-shoe"></i><i class="foot-ball">⚽</i></span>`
      + `<span class="foot-name">${nm}</span>`
      + gateHTML(foot)
      + `<span class="foot-gate-cap">판정 창</span>`
      + `</button>`;
  }

  /* 탭 = 답입니다. 🔴 **「다음」 버튼을 두지 마세요** — 붙이면 탭이 2회가 되고
   * 첫 순간 카드가 그만큼 밀립니다(93번 §3-3). 되돌리기는 **뒤로**가 맡아요. */
  function openFoot(cur, done) {
    const box = $("foot-pair");
    if (!box) return;
    box.innerHTML = cardHTML("L") + cardHTML("R");
    const pct = Math.round(footWin() * 100);
    const eff = $("foot-eff");
    if (eff) {
      eff.innerHTML = `<li>🎯 주발 쪽에서 오는 공은 판정 창이 <b>${pct}% 넓어져요</b>.</li>`
        + `<li>🦵 약발 쪽은 <b>${pct}% 좁아요</b>. 반대발은 커리어 중에 붙습니다.</li>`;
    }
    box.querySelectorAll(".foot-card").forEach((b) => {
      b.classList.toggle("on", b.dataset.foot === (cur === "L" ? "L" : "R"));
      b.addEventListener("click", () => {
        box.querySelectorAll(".foot-card").forEach((x) => x.classList.toggle("on", x === b));
        b.classList.add("picked");
        /* ♿ 움직임을 줄이는 설정이면 **기다리지 않고 바로** 넘어가요.
         * 연출이 진행을 붙잡으면 그건 연출이 아니라 지연입니다. */
        const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const go = () => done(b.dataset.foot);
        if (calm) go(); else setTimeout(go, 320);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
   * 🗺️ 동네 — 한국 17개 시·도
   * ══════════════════════════════════════════════════════════════════
   * 🔑 **SVG를 직접 그립니다** — 외부 CDN에 기대면 오프라인 PWA가 깨져요.
   *    경위도를 그대로 투영했습니다(y 66.7단위/도 · x는 cos 37.5° = 0.793배).
   *    viewBox는 `10 0 190 380` — 세로 380px에 딱 맞는 비율이에요.
   *
   * 🖐️ **탭 칸이 손가락에 맞아야 합니다.**
   *    🏙️ 광역시 8곳은 지도에서 점 하나 크기(서울 ↔ 인천이 16단위)라 **폴리곤으로는
   *    절대 못 누릅니다.** 그래서 갈랐어요 —
   *      · 🏞️ 도 9곳: 지도 위 폴리곤을 직접 탭 (넓어요)
   *      · 🏙️ 광역시 8곳: 지도에는 **위치를 알리는 핀**만 찍고, 탭은 **옆 목록**에서
   *    핀에 `pointer-events: none`을 걸어 둔 것은 **겹친 히트 영역을 안 만들려고**예요
   *    (세종 ↔ 대전은 10단위 거리라 히트 원을 주면 서로를 먹습니다). */
  const REGIONS = [
    /* 🏞️ 도 9곳 — 지도 폴리곤 */
    { id: "gyeonggi", name: "경기도", ab: "경기", at: [64, 104],
      d: "M43.9,58.7L63.5,42.0L75.6,30.0L79.9,55.4L93.6,79.4L109.5,102.1L90.4,113.4L76.7,119.4L60.8,119.4L50.2,112.7L45.0,99.4L37.0,86.0L30.1,70.0L37.6,59.4Z",
      line: "논이 아파트로 바뀌는 걸 지켜본 동네였어요." },
    { id: "gangwon", name: "강원특별자치도", ab: "강원", at: [134, 76],
      d: "M75.6,30.0L132.8,8.7L142.3,31.3L167.7,76.7L182.5,103.4L185.7,114.1L165.6,112.7L140.2,112.7L131.7,112.7L109.5,102.1L93.6,79.4L79.9,55.4Z",
      line: "겨울이 길고 눈이 무릎까지 오던 동네였어요." },
    { id: "chungbuk", name: "충청북도", ab: "충북", at: [107, 141],
      d: "M109.5,102.1L131.7,112.7L143.3,126.1L125.4,146.1L120.1,163.4L106.3,179.4L90.4,183.4L78.8,163.4L73.5,143.4L90.4,113.4Z",
      line: "산 넘어 또 산, 사과밭이 이어지던 동네였어요." },
    { id: "chungnam", name: "충청남도", ab: "충남", at: [50, 152],
      d: "M60.8,119.4L76.7,119.4L90.4,113.4L73.5,143.4L78.8,163.4L90.4,183.4L71.4,183.4L55.5,179.4L39.7,179.4L34.4,159.4L15.3,139.4L27.0,122.1L48.1,119.4Z",
      line: "썰물이면 갯벌이 끝없이 드러나던 동네였어요." },
    { id: "jeonbuk", name: "전북특별자치도", ab: "전북", at: [69, 203],
      d: "M33.3,199.4L39.7,179.4L55.5,179.4L71.4,183.4L90.4,183.4L104.2,190.1L109.5,206.1L95.7,226.1L79.9,230.1L58.7,230.1L39.7,219.4Z",
      line: "지평선이 보일 만큼 들이 넓은 동네였어요." },
    { id: "jeonnam", name: "전라남도", ab: "전남", at: [60, 252],
      d: "M23.8,226.1L32.3,219.4L39.7,219.4L58.7,230.1L79.9,230.1L95.7,226.1L106.3,236.8L109.5,252.8L101.0,266.1L90.4,276.8L76.7,266.1L58.7,276.8L45.0,294.1L27.0,279.5L18.5,262.1L27.0,243.5Z",
      line: "바닷바람이 세고 앞바다에 섬이 많던 동네였어요." },
    { id: "gyeongbuk", name: "경상북도", ab: "경북", at: [155, 165],
      d: "M131.7,112.7L165.6,112.7L185.7,114.1L190.9,143.4L189.9,170.1L196.2,180.8L187.8,190.1L182.5,203.4L169.8,212.8L150.7,210.1L132.8,206.1L116.9,192.8L113.7,176.8L120.1,163.4L125.4,146.1L143.3,126.1Z",
      line: "강을 따라 오래된 기와가 남아 있던 동네였어요." },
    { id: "gyeongnam", name: "경상남도", ab: "경남", at: [133, 229],
      d: "M109.5,206.1L116.9,192.8L132.8,206.1L150.7,210.1L169.8,212.8L175.1,236.8L161.3,252.8L143.3,266.1L119.0,256.8L109.5,252.8L106.3,236.8L95.7,226.1Z",
      line: "멀리 조선소 크레인이 보이던 동네였어요." },
    { id: "jeju", name: "제주특별자치도", ab: "제주", at: [57, 352], inset: true,
      d: "M17.5,359.5L25.9,346.2L48.1,346.2L57.7,354.2L55.5,366.2L38.6,371.5L23.8,368.9Z",
      line: "돌담 너머로 바람이 그치지 않던 동네였어요." },
    /* 🏙️ 특별시·광역시 8곳 — 지도에는 핀, 탭은 옆 목록
     * (세종 ↔ 대전은 실제 거리가 10단위뿐이라 핀을 서로 조금 벌려 찍었습니다) */
    { id: "seoul", name: "서울특별시", ab: "서울", pin: [59.7, 79.0],
      line: "골목마다 사람이 넘치던 동네였어요." },
    { id: "incheon", name: "인천광역시", ab: "인천", pin: [45.2, 86.3],
      line: "배 고동 소리가 들리던 항구 동네였어요." },
    { id: "sejong", name: "세종특별자치시", ab: "세종", pin: [73.0, 148.0],
      line: "새 아파트 사이에 공터가 많던 동네였어요." },
    { id: "daejeon", name: "대전광역시", ab: "대전", pin: [83.5, 162.5],
      line: "기차역 앞이 늘 북적이던 동네였어요." },
    { id: "gwangju", name: "광주광역시", ab: "광주", pin: [53.1, 239.5],
      line: "어디서든 무등산이 보이던 동네였어요." },
    { id: "daegu", name: "대구광역시", ab: "대구", pin: [145.5, 192.0],
      line: "여름이면 아스팔트가 녹던 동네였어요." },
    { id: "ulsan", name: "울산광역시", ab: "울산", pin: [183.1, 214.2],
      line: "밤에도 공장 불빛이 안 꺼지던 동네였어요." },
    { id: "busan", name: "부산광역시", ab: "부산", pin: [170.6, 238.1],
      line: "바다 냄새가 올라오던 언덕길 동네였어요." },
  ];
  const byId = (id) => REGIONS.find((r) => r.id === id) || null;
  const nameOf = (id) => (byId(id) || {}).name || "🌍 미상";

  /* 📖 스토리 — **화면을 주지 않습니다** (설계 93번 §4-3).
   * 읽기만 하는 화면은 개입 밀도가 0이에요. 지도에서 고른 **그 자리 아래**에 펼칩니다.
   * 🔑 17 × 3줄을 다 쓰면 51줄입니다. **한 줄만 지역별**로 두면 17줄이면 끝나요. */
  const COMMON = [
    "학교 뒤 공터에서 해가 질 때까지 공을 찼어요.",
    "곧 동네 대회가 열려요. 처음으로 사람들 앞에서 뜁니다.",
  ];
  const lineOf = (id) => (byId(id) || {}).line || "";

  /* 🏛️ 이 지역 최고 기록 — 비교할 수 있어야 고른 것이 남습니다 (79번 §2 ③).
   * 명예의 전당(`grow-hof-v1`)은 8종이 공유하는 표라 winger2 항목만 봅니다.
   * ⚠️ `origin` 칸이 없는 **옛 헌액은 그냥 안 걸립니다** — 마이그레이션 안 해요. */
  function topOf(id) {
    let best = null;
    try {
      const list = JSON.parse(localStorage.getItem("grow-hof-v1") || "[]");
      for (const e of list) {
        if (!e || e.game !== "winger2" || e.origin !== id) continue;
        if (!best || (e.score || 0) > (best.score || 0)) best = e;
      }
    } catch (err) { /* 저장소가 막혀 있어도 화면은 떠야 해요 */ }
    return best;
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  /* 🏝️ 제주는 **확대 상자**에 담습니다.
   * 실제 크기로 그리면 탭 칸이 **40 × 25px**이라 손가락에 절대 안 맞아요(≥44px 기준).
   * ×2로 키우면 80 × 51px이 됩니다. 한국 지도의 흔한 관례이기도 하고,
   * 자리도 남해 아래 빈 칸이라 본토를 하나도 안 가립니다.
   *   변환: p → 2p + t.  제주 중심(37.6, 358.9)을 상자 중심(57, 349)으로 보냅니다. */
  const INSET = "translate(-18.2,-368.7) scale(2)";

  function mapSVG() {
    const dos = REGIONS.filter((r) => r.d);
    const cities = REGIONS.filter((r) => r.pin);
    const pathOf = (r) => `<path class="om-do${r.inset ? " om-in" : ""}" d="${r.d}" data-id="${r.id}"`
      + ` vector-effect="non-scaling-stroke"`
      + ` role="button" tabindex="0" aria-pressed="false" aria-label="${esc(r.name)}"></path>`;
    return `<svg viewBox="10 0 190 380" role="group" aria-label="한국 17개 시·도 지도"`
      + ` preserveAspectRatio="xMidYMid meet">`
      + `<rect class="om-inset-box" x="12" y="320" width="90" height="58" rx="7"></rect>`
      + dos.filter((r) => !r.inset).map(pathOf).join("")
      + `<g transform="${INSET}">` + dos.filter((r) => r.inset).map(pathOf).join("") + `</g>`
      + dos.map((r) => `<text class="om-lab" data-id="${r.id}" x="${r.at[0]}" y="${r.at[1]}"`
        + ` text-anchor="middle">${r.ab}</text>`).join("")
      /* 📍 핀은 **위치를 알리는 표시**예요 — 탭은 옆 목록이 받습니다.
       * 히트 영역을 주면 세종 ↔ 대전처럼 붙은 짝이 서로를 먹어요.
       * 🏷️ 이름표는 **고른 순간에만** 뜹니다 — 8개를 늘 띄우면 서울·인천이 겹쳐 못 읽어요.
       *    바탕을 깔지 않고 `paint-order: stroke`로 글자에 테두리를 둘러 지도 위에서 읽힙니다. */
      + cities.map((r) => `<circle class="om-pin" data-id="${r.id}"`
        + ` cx="${r.pin[0]}" cy="${r.pin[1]}" r="4.6"></circle>`).join("")
      + cities.map((r) => `<text class="om-pin-lab" data-id="${r.id}"`
        + ` x="${(r.pin[0] + (r.pin[0] > 115 ? -11 : 11)).toFixed(1)}" y="${(r.pin[1] + 4).toFixed(1)}"`
        + ` text-anchor="${r.pin[0] > 115 ? "end" : "start"}">${r.ab}</text>`).join("")
      + `</svg>`;
  }

  function cityHTML() {
    return REGIONS.filter((r) => r.pin).map((r) =>
      `<button type="button" class="om-city" data-id="${r.id}" aria-pressed="false">`
      + `<i class="om-city-dot"></i><span>${r.ab}</span></button>`).join("");
  }

  function storyHTML(id) {
    const r = byId(id);
    if (!r) {
      /* 🔴 위 힌트와 **같은 말을 두 번 하지 않습니다** — 첫 카드 앞의 읽을거리는
       * 그대로 첫 카드가 밀리는 시간이에요(93번 §2-1). */
      return `<p class="om-empty">지도에서 자란 곳을 골라 주세요.</p>`;
    }
    const t = topOf(id);
    return `<p class="om-place">📍 ${esc(r.name)}</p>`
      + `<p class="om-story">${esc(r.line)}<br/>${esc(COMMON[0])}<br/>${esc(COMMON[1])}</p>`
      + `<div class="om-hof"><span class="om-hof-h">🏛️ 이 지역 최고 기록</span>`
      + (t ? `<span class="om-hof-v">${esc(t.name)} · ${(t.goals || 0)}골 · ${esc(t.grade || "")}</span>`
        : `<span class="om-hof-v dim">아직 없어요 — 첫 번째가 되어 보세요.</span>`)
      + `</div>`;
  }

  function openOrigin(cur, done) {
    const map = $("origin-map"), cities = $("origin-cities"), story = $("origin-story");
    const next = $("btn-origin-next");
    if (!map) return;
    let pick = byId(cur) ? cur : null;
    map.innerHTML = mapSVG();
    cities.innerHTML = cityHTML();

    function paint() {
      map.querySelectorAll(".om-do").forEach((p) => {
        const on = p.dataset.id === pick;
        p.classList.toggle("on", on);
        p.setAttribute("aria-pressed", on ? "true" : "false");
      });
      map.querySelectorAll(".om-pin").forEach((c) => c.classList.toggle("on", c.dataset.id === pick));
      /* 🖍️ 고른 도는 바탕이 앰버로 채워져요 — 글자를 흰색으로 두면 안 읽힙니다 */
      map.querySelectorAll(".om-lab").forEach((t) => t.classList.toggle("on", t.dataset.id === pick));
      map.querySelectorAll(".om-pin-lab").forEach((t) => t.classList.toggle("on", t.dataset.id === pick));
      cities.querySelectorAll(".om-city").forEach((b) => {
        const on = b.dataset.id === pick;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      story.innerHTML = storyHTML(pick);
      if (next) {
        next.disabled = !pick;
        next.textContent = pick ? "🏘️ 동네 대회로" : "지역을 골라 주세요";
      }
    }
    const choose = (id) => { pick = id; paint(); };

    map.querySelectorAll(".om-do").forEach((p) => {
      p.addEventListener("click", () => choose(p.dataset.id));
      /* ⌨️ SVG 도형에는 기본 키보드 조작이 없어요 — 직접 답니다. 접근성은 축약 대상이 아닙니다. */
      p.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(p.dataset.id); }
      });
    });
    cities.querySelectorAll(".om-city").forEach((b) =>
      b.addEventListener("click", () => choose(b.dataset.id)));
    if (next) next.onclick = () => { if (pick) done(pick); };
    paint();
  }

  return { openFoot, openOrigin, nameOf, lineOf, step, topOf, REGIONS, STEPS };
})();
