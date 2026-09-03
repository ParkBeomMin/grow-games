/* 🦶 주발 · 🗺️ 동네 · 🧒 초1 — ⚽ 더 윙어 II 생성 흐름 앞단 세 화면 (winger2 전용)
 *
 *   WingerIntro.openFoot(cur, done)     🦶 발 두 짝. 탭은 고르기만 하고 [다음]에서 done("L"|"R")
 *   WingerIntro.openOrigin(cur, done)   🗺️ 17개 시·도 지도. [다음]에서 done(originId)
 *   WingerIntro.openChild(cur, done)    🧒 초1 3택. **[다음]이 없어요** — 탭이 곧 done(key)
 *   WingerIntro.nameOf(id) / lineOf(id) 🗂️ 세이브·기록이 읽는 창구 (없으면 "🌍 미상")
 *   WingerIntro.step(screenId)          🔢 "3 / 6" — 화면 순서가 바뀌면 STEPS 한 줄만 고치세요
 *
 * ── 왜 전용 파일인가 ─────────────────────────────────────────
 * `timing.js`·`base.css`·`match.js`는 **8개 게임이 전부 내려받습니다.** 축구 하나만 쓰는
 * 화면을 거기 넣으면 안 쓰는 게임까지 무게를 집니다 — 🏘️ `town.js`와 같은 이유예요.
 *
 * ✅ **🧒 어린 시절이 네 해가 됐습니다** (130번 §2 · 133번 · 범민 님 지시).
 *    흐름은 `이름 → 🦶 주발 → 🗺️ 동네 → 🧸 초1 → 👦 초2 → 🌙 초3 → 🔑 초4 → 🎯 자리
 *    → 🏫 초5 대항전`이에요 — **초4까지는 경기가 없어서** 🎯 자리가 **초4 뒤**로 왔습니다.
 *    (옛 자리는 「초등부 뒤」였고 근거는 *"첫 카드를 한 화면 앞당긴다"*였는데,
 *     경기가 초5로 밀리면서 **그 근거가 죽었어요.**)
 *    이 파일이 아는 것은 `openFoot`·`openOrigin`·`openChild` 셋과 `S.origin`·`S.childPicks`뿐입니다.
 *
 * 🔴 **`openChild`는 「고른 키」만 돌려줍니다.** 그 키가 무엇을 바꾸는지는 `prospect.js`의
 *    **네 표**(`CHILD_FOCUS`·`CHILD_TALENT`·`GROW_TILT_MAP`·굳히기)가 정해요 —
 *    **글과 산식을 한 파일에 두지 않습니다.**
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

  /* 🔢 **선수를 만드는 차례 다섯**입니다. 화면 순서가 바뀌면 여기 한 줄만 고치면 돼요.
   *
   * 🚨 **옛 규칙을 지웁니다 (2026-09-01 · 101번 §1-4).** 여기는 「첫 순간 카드 **앞**에 놓인
   *    결정 수」를 세던 자리라 🎯 자리와 🧬 조립대가 빠져 있었고, 그래서 🗺️ 동네에
   *    **「3 / 3」**이 떴습니다. 뒤에 두 화면이 더 있는데 **끝났다고 약속한 것**이에요 —
   *    원칙 ①의 가장 싼 형태입니다. 범민 님이 *"능력치 고르는 게 없어졌네…?"*라고 하신
   *    가장 유력한 원인이 이 한 줄입니다.
   *
   * ★ 이제 세는 것은 **「선수가 완성되기까지 남은 결정」**이에요 — 첫 카드 뒤에 오는
   *    결정도 셉니다. 🟢 *"3 / 5 뒤에 경기가 나오는 게 어색하지 않나"*는 오히려 맞아요.
   *    **뛰면서 남은 둘이 채워집니다.**
   *
   * 🔒 **화면을 늘리는 자리가 아닙니다.** `STEPS`는 **세는 것**이지 만드는 게 아니에요 —
   *    앞의 셋 뒤에 바로 카드가 옵니다.
   * ⚠️ **탭 수 총량 계약(「≤ 50초」·「탭 5」)은 폐기됐습니다** (설계 130번 §5-1).
   *    총량 계약은 화면을 늘리는 순간 무조건 깨져서 다음 사람에게 *"화면을 못 늘린다"*로
   *    읽힙니다 — 실제로 이번에 그렇게 걸렸어요. 대신 **밀도 계약 넷**으로 다시 씁니다:
   *    첫 탭 ≤ 12초 · 결정 사이 ≤ 15초 · 🔴 **네 화면이 네 개의 다른 표를 봅니다** ·
   *    첫 순간 카드까지 ≤ 90초. 🔑 셋째가 제일 세고, **그것만 기계가 잽니다.**
   *
   * 🧒 어린 시절이 네 해가 되면서 여기가 6 → **9**가 됐어요 (130번 §2-1). */
  const STEPS = ["screen-name", "screen-foot", "screen-origin",
    "screen-child", "screen-child2", "screen-child3", "screen-child4",
    "screen-position", "screen-prospect"];
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
    /* ♿ `aria-pressed`가 **고른 상태를 말해 줍니다.** 이제 탭해도 화면이 안 바뀌니,
     *    이게 없으면 낭독 사용자에게는 **아무 일도 안 일어난 화면**이 돼요
     *    (🗺️ 동네의 `.om-city`와 같은 문법입니다). */
    return `<button type="button" class="foot-card" data-foot="${foot}"`
      + ` aria-pressed="false" aria-label="${nm}잡이로 시작해요">`
      + `<span class="foot-art" aria-hidden="true">`
      + `<i class="foot-shoe">👟</i><i class="foot-ball">⚽</i></span>`
      + `<span class="foot-name">${nm}</span>`
      + `<span class="foot-pick" aria-hidden="true">✓ 이 발</span>`
      + gateHTML(foot)
      + `<span class="foot-gate-cap">판정 창</span>`
      + `</button>`;
  }

  /* 🆕 **탭은 「고르기」까지입니다. 넘기는 건 [다음]이에요** (2026-09-02 · 111번).
   *
   * 🚨 여기 있던 옛 규칙은 *"탭 = 답입니다. 「다음」 버튼을 두지 마세요"*였습니다.
   *    **탭이 2회가 된다는 근거 자체는 지금도 맞아요** — 바뀐 건 사실이 아니라 판단입니다.
   *    🦶 주발은 되돌릴 수 없는 **판정** 결정인데 탭 한 번에 확정되고 320ms 뒤 화면까지
   *    바뀌어서, 잘못 짚은 사람에게 남는 길이 **뒤로**뿐이었어요.
   *    🔒 대신 **첫 순간 카드 앞의 탭이 5 → 6**이 됩니다(93번 §2-2는 여유 0이었어요).
   *       초1 아크를 새로 설계 중이라 **그 검산은 그쪽에서** 다시 잡습니다.
   *
   * 🔴 **320ms 자동 전환이 사라졌습니다.** `prefers-reduced-motion` 갈래도 같이 없어졌어요 —
   *    기다릴 것이 없으니 기다림을 끄는 갈래도 필요 없습니다.
   *
   * 🔑 **들어올 때는 늘 「안 고름」에서 시작합니다.** `cur`은 안 씁니다 —
   *    game.js의 `chosenFoot` 기본값이 `"R"`이라, 그대로 쓰면 **아무것도 안 골랐는데
   *    오른발이 켜진 채 [다음]이 열려** 있어요. *"고르기 전엔 비활성"*이 깨집니다.
   *    ⚠️ 대신 **뒤로 갔다 돌아오면 다시 골라야 해요.** 판정 결정이라 그 편이 맞습니다. */
  function openFoot(cur, done) {
    const box = $("foot-pair");
    if (!box) return;
    const next = $("btn-foot-next");
    box.innerHTML = cardHTML("L") + cardHTML("R");
    const pct = Math.round(footWin() * 100);
    const eff = $("foot-eff");
    if (eff) {
      eff.innerHTML = `<li>🎯 주발 쪽에서 오는 공은 판정 창이 <b>${pct}% 넓어져요</b>.</li>`
        + `<li>🦵 약발 쪽은 <b>${pct}% 좁아요</b>. 반대발은 커리어 중에 붙습니다.</li>`;
    }

    let pick = null;
    function paint() {
      box.classList.toggle("chosen", !!pick);           // 🎨 안 고른 쪽을 흐리게 (style.css)
      box.querySelectorAll(".foot-card").forEach((x) => {
        const on = x.dataset.foot === pick;
        x.classList.toggle("on", on);
        /* 🔴 `.picked`(살짝 떠오르는 연출)는 **한 장에만** 남아야 해요.
         *    add만 하면 두 장을 번갈아 눌렀을 때 **둘 다 떠 있는** 채로 굳습니다. */
        x.classList.toggle("picked", on);
        x.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (next) {
        next.disabled = !pick;
        next.textContent = pick ? `${pick === "L" ? "왼발" : "오른발"}로 갈게요` : "발을 골라 주세요";
      }
    }

    /* ⚠️ `pointerdown`이 아니라 `click`입니다 — 손을 뗄 때 브라우저가 그 지점의 요소로
     *    `click`을 또 보내서 **즉시 두 번 먹는** 사고가 미니게임 준비 화면에서 났어요. */
    box.querySelectorAll(".foot-card").forEach((b) =>
      b.addEventListener("click", () => { pick = b.dataset.foot; paint(); }));
    if (next) next.onclick = () => { if (pick) done(pick); };
    paint();
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

  /* ══════════════════════════════════════════════════════════════════
   * 🧒 **어린 시절 네 해 — 초1·초2·초3·초4** (설계 130번 §2·§3 · 133번 §2 · 화면 131번)
   * ══════════════════════════════════════════════════════════════════
   * 🔒 **네 화면이 같은 컴포넌트를 씁니다** — 섹션마다 `data-yr`과 id만 다르고
   *    마크업·CSS는 하나예요(131번 §5-2). 이 파일은 **글과 탭만** 압니다.
   *
   * 🔑 **네 해가 네 개의 「다른 표」를 봅니다** — 그게 이 개편의 전부이자,
   *    「같은 질문 네 번」과 갈리는 자리입니다:
   *
   *      🧸 초1 뭘 하고 놀았나 → `CHILD_FOCUS`   (모양 · 6칸 배분)   「**먼저** 자라요」
   *      👦 초2 누구와 붙었나  → `CHILD_TALENT`  (가속 · ⭐ 재능)     「**빨리** 늘어요」
   *      🌙 초3 몸이 어땠나    → `GROW_TILT_MAP` (시점 · 나이곡선)    「**~쪽으로 기울어요**」
   *      🔑 초4 뭐가 남았나    → 굳히기          (세기 · 앞 셋 중 하나) 「**한 번 더**」
   *
   *    🔴 **desc의 어미가 네 해 다 다릅니다.** 여기를 같은 말로 맞추면 화면이 다시
   *      「1/3 고르기 네 번」으로 읽혀요.
   *
   * 🔴 **효과를 숫자로 안 적습니다**(원칙 ⑧). 특히 🌙초3은 **「됩니다」가 아니라 「기울어요」**예요 —
   *    스카우트 코멘트가 이미 확신하면 그 타입은 0으로 남습니다. 두 글자가 계약입니다.
   * 🔴 **🆕 천장(`childCap`)이 갈린다는 것도 여기 안 적습니다.** 어린 시절에 알려 주면
   *    **정답이 확정돼요** — 유스 화면에서 처음 보는 게 이 설계의 드러남입니다(133번 §12 ⑤).
   * 🔴 **[다음]이 없습니다** — 탭 하나가 고르기 겸 넘김이에요.
   *
   * ⏳ **고른 뒤 잠깐 머물렀다가 넘어갑니다**(`ECHO_MS`). 🔑 손잡이를 누른 **그 자리에서**
   *    반응이 보여야 하는데, [다음]이 없으면 반응을 볼 시간이 0이 됩니다.
   *    🔴 **초읽기가 아닙니다** — 되돌릴 수 있는 시간이 아니라 「방금 고른 것을 읽는」 시간이에요. */
  const ECHO_MS = 620;   // 🔒 미니게임 결과가 머무는 620ms와 **같은 값**입니다 — 관례를 하나로

  /* 🔒 **키는 세이브(`S.childPicks`)가 가리키는 값이라 안 바꿉니다.**
   * 🔒 `echo`는 **효과가 아니라 그 해의 장면**이에요 — 숫자도 스탯 이름도 안 씁니다.
   * ⚠️ **낱말 계약**(131번 §1-1): `title` 10~14자 · `sub` 13~18자 · `echo` 12~18자.
   *    가로 긴 박스가 두 줄로 접히지 않는 크기예요 — **자수를 다시 만지지 마세요.**
   *    ⚠️ **🧸초1만 계약 밖입니다**(`body` 15자 · `eye` 18자). 계약이 나중에 쓰였고,
   *      131번이 잰 박스 높이(79.91px)는 **이 문장들로** 잰 값이라 줄이면 그 실측이 무효예요.
   *      🔴 초1을 계약에 맞추려고 문구를 줄이지 마세요 — 화면을 다시 재는 게 먼저입니다. */
  const CHILD_PICKS = [
    { key: "ball", emoji: "⚽", title: "하루 종일 공만 찼어요",
      sub: "발에 붙는 감각이 먼저 자라요", echo: "발이 공에 익숙해졌어요." },
    { key: "body", emoji: "🛡️", title: "형들 틈에 껴서 안 밀렸어요",
      sub: "버티는 몸이 먼저 자라요", echo: "부딪혀도 잘 안 넘어지게 됐어요." },
    { key: "eye", emoji: "👀", title: "빈 곳을 먼저 보고 먼저 뛰었어요",
      sub: "보는 눈과 첫 발이 먼저 자라요", echo: "빈 곳이 먼저 눈에 들어와요." },
  ];

  /* 👦 초2 — 🔴 **문구가 `prospect.js`의 `CHILD_TALENT` 짝을 가리킵니다.**
   *    `fin`[슛·스피드] *뛰어가(스피드) 찼어요(슛)* · `run`[패스·체력] *해 질 때까지(체력) 주고받았어요(패스)* ·
   *    `steal`[드리블·수비] *뺏고(수비) 몰고 나갔어요(드리블)*.
   *    🚨 **짝이 갈리면 여기도 같이 갈아야 합니다** — 키는 그대로라 조용히 어긋나요.
   * 🔴 **`run`의 이모지가 🏃가 아니라 🔁입니다.** 🏃는 이제 **남의 스탯(스피드=`fin`)**을
   *    가리켜요 — 화면이 만드는 기대와 메커닉이 어긋나는 자리라 고쳐서 될 일이 아닙니다. */
  const CHILD_PICKS2 = [
    { key: "fin", emoji: "🎯", title: "골문 앞까지 뛰어가 찼어요",
      sub: "차고 튀어나가는 게 빨리 늘어요", echo: "달려들어 차는 게 몸에 뱄어요." },
    { key: "run", emoji: "🔁", title: "해 질 때까지 주고받았어요",
      sub: "주고받고 버티는 게 빨리 늘어요", echo: "숨이 차도 공이 계속 돌아요." },
    { key: "steal", emoji: "🥷", title: "붙으면 뺏고 몰고 나갔어요",
      sub: "뺏고 끌고 나가는 게 빨리 늘어요", echo: "뺏으면 바로 몰고 나가요." },
  ];

  /* 🌙 초3 — 🔒 **「기울어요」를 지키세요. 「됩니다」가 아닙니다.** */
  const CHILD_PICKS3 = [
    { key: "ge", emoji: "🌱", title: "그해에 부쩍 키가 컸어요",
      sub: "일찍 피는 쪽으로 기울어요", echo: "또래보다 한 뼘 앞서 있었어요." },
    { key: "gn", emoji: "🌿", title: "남들 자라는 만큼 자랐어요",
      sub: "오래 고르게 가는 쪽으로 기울어요", echo: "느리지도 빠르지도 않았어요." },
    { key: "gl", emoji: "🌳", title: "반에서 제일 작았어요",
      sub: "늦게 피는 쪽으로 기울어요", echo: "아직 클 게 남아 있었어요." },
  ];

  /* 🔑 초4 — **앞 셋 중 하나를 굳힙니다.**
   * 🔴 **`sub`가 없습니다 — `from`이 가리키는 그 해의 문장을 「그대로」 되씁니다**(133번 §2-4).
   *    베껴 적으면 초2의 짝을 갈아 문구를 고친 날 **화면만 옛말**을 해요.
   *    그게 「굳히기」가 화면에서 읽히는 방식이기도 합니다 — *같은 문장을 한 번 더 본다.* */
  const CHILD_PICKS4 = [
    { key: "h1", emoji: "🧸", title: "그 공놀이를 계속했어요", from: 0, echo: "그 버릇이 끝까지 남았어요." },
    { key: "h2", emoji: "👦", title: "그 친구들과 계속 붙었어요", from: 1, echo: "그 무리에서 계속 컸어요." },
    { key: "h3", emoji: "🌙", title: "몸은 그해 그대로였어요", from: 2, echo: "몸이 가는 대로 두었어요." },
  ];

  /* 🧺 지나온 해의 칩 (`.arc-tally` · 131번 §5-3 · 133번 §2-6).
   * 🔴 **숫자도 스탯 이름도 안 씁니다** — 칩은 「무엇을 골랐나」를 되짚는 자리지
   *    「무엇이 좋은가」를 알려 주는 자리가 아니에요.
   * 🔴 **초4의 칩은 없습니다** — 초4가 마지막 화면이라 보여 줄 다음이 없어요. */
  const CHILD_CHIP = {
    ball: "⚽ 초1 · 공", body: "🛡️ 초1 · 몸", eye: "👀 초1 · 눈",
    fin: "🎯 초2 · 골문", run: "🔁 초2 · 돌리기", steal: "🥷 초2 · 뺏기",
    ge: "🌱 초3 · 일찍", gn: "🌿 초3 · 고르게", gl: "🌳 초3 · 늦게",
  };

  /* 🗂️ 네 해의 화면 한 벌. 🔑 **`story`가 그 해의 「질문」**이고 `title`은 장면이에요.
   * 🔒 초1의 `story`만 비어 있습니다 — 🗺️ 지역 한 줄이 앞에 붙거든요. */
  const CHILD_ARC = [
    { yr: 1, id: "child", grade: "초등학교 1학년 · 여덟 살", picks: CHILD_PICKS },
    { yr: 2, id: "child2", grade: "초등학교 2학년 · 아홉 살", picks: CHILD_PICKS2,
      story: "한 살 더 먹으니 붙는 상대가 달라졌어요." },
    { yr: 3, id: "child3", grade: "초등학교 3학년 · 열 살", picks: CHILD_PICKS3,
      story: "그해엔 몸이 저 혼자 자랐어요." },
    { yr: 4, id: "child4", grade: "초등학교 4학년 · 열한 살", picks: CHILD_PICKS4,
      story: "세 해가 지나고, 남은 게 하나 있었어요." },
  ];

  /* 그 버튼의 설명 줄. 🔑 초4는 **`from`이 가리키는 해에서 실제로 고른 문장**을 되씁니다.
   * 그 해를 아직 안 골랐으면 **줄을 아예 안 그립니다** — 지어내지 않아요
   * (`.card-desc`는 없어도 되게 CSS가 짜여 있습니다 · 131번 §5-2 ③). */
  function childDesc(c, picks) {
    if (c.from == null) return c.sub;
    const src = CHILD_ARC[c.from];
    const got = (src && src.picks || []).find((x) => x.key === picks[c.from]);
    return got ? got.sub : "";
  }

  /* `yr`은 1~4 · `ctx`는 { origin, picks } · `done(key)`로 넘어갑니다.
   * 🔒 **화면 넷이 이 함수 하나를 씁니다.** 복붙본을 만들지 마세요 —
   *    🦶 주발에 [다음]이 붙던 날 `tapFoot`의 사본 셋이 한꺼번에 죽었어요. */
  function openChild(yr, ctx, done) {
    const a = CHILD_ARC.find((x) => x.yr === yr) || CHILD_ARC[0];
    const o = ctx || {};
    const picks = Array.isArray(o.picks) ? o.picks : [];
    const place = $(a.id + "-place"), story = $(a.id + "-story");
    const list = $(a.id + "-list"), echo = $(a.id + "-echo"), tally = $(a.id + "-tally");
    if (!list) { done(picks[yr - 1] || a.picks[0].key); return; }
    const r = byId(o.origin) || null;
    if (place) place.textContent = `📍 ${(r ? r.name : "🌍 미상")} · ${a.grade}`;
    /* 📖 초1만 🗺️ 지역 한 줄이 앞에 붙어요 — 지도의 스토리가 여기로 이사했습니다 */
    if (story) story.textContent = a.story
      || `${r ? r.line : COMMON[0]} 학교가 끝나면 갈 곳은 하나였어요.`;
    if (echo) echo.textContent = "";
    /* 🧺 지나온 해만 — 비어 있으면 CSS가 자리를 안 줍니다(`:empty`) */
    if (tally) {
      tally.innerHTML = picks.slice(0, yr - 1)
        .map((k) => CHILD_CHIP[k]).filter(Boolean)
        .map((t) => `<span class="arc-chip">${esc(t)}</span>`).join("");
    }
    list.innerHTML = a.picks.map((c) => {
      const sub = childDesc(c, picks);
      return `<button type="button" class="card" data-child="${c.key}" aria-pressed="false">`
        + `<span class="card-emoji">${c.emoji}</span>`
        + `<span class="card-title">${esc(c.title)}</span>`
        + (sub ? `<span class="card-desc">${esc(sub)}</span>` : "")
        + `</button>`;
    }).join("");

    /* 🔒 **`click`에서만 화면을 넘깁니다** — `pointerdown`에서 갈아치우면 손 뗄 때
     *    브라우저가 **그 자리의 새 요소**로 `click`을 보내 즉시 두 번 먹힙니다
     *    (미니게임 준비 화면에서 실제로 난 버그예요).
     * 🔒 `gate`는 머무는 620ms 동안 **두 번째 탭을 삼킵니다** — 없으면 다른 갈래를
     *    한 번 더 눌러 «고른 것과 넘어간 것이 다른» 상태가 됩니다. */
    const gate = { shut: false };
    list.querySelectorAll(".card[data-child]").forEach((b) => {
      b.addEventListener("click", () => {
        if (gate.shut) return;
        gate.shut = true;
        const c = a.picks.find((x) => x.key === b.dataset.child) || a.picks[0];
        list.querySelectorAll(".card[data-child]").forEach((o2) => {
          const on = o2 === b;
          o2.classList.toggle("on", on);
          o2.setAttribute("aria-pressed", on ? "true" : "false");
          o2.disabled = !on;
        });
        if (echo) echo.textContent = c.echo;
        setTimeout(() => done(c.key), ECHO_MS);
      });
    });
  }

  return { openFoot, openOrigin, openChild, nameOf, lineOf, step, topOf,
    REGIONS, STEPS, CHILD_PICKS, CHILD_PICKS2, CHILD_PICKS3, CHILD_PICKS4 };
})();
