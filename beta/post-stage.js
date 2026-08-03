/* 🍂 가을야구 전용 미니게임 2종 — 야구(더 드래프트)만 내려받아요.
 *
 * 왜 timing.js가 아니고 여기냐면: timing.js(8종)는 8개 게임이 전부 내려받아요.
 * 가을야구에서만 쓰는 메커닉을 거기 넣으면 쓰지 않는 7개 게임까지 무게를 져요.
 * 아이돌 월드투어가 tour-stage.js로 같은 길을 먼저 갔고, 이 파일은 그 선례를 따라요.
 * 그래서 timing.js도 tour-stage.js도 한 줄 안 건드렸어요.
 *
 * 인터페이스는 timing.js와 똑같아요 — fn(container, opts, cb)이고 cb(res)의 res는
 * "perfect" | "good" | "miss" 셋뿐이에요. 그래서 game.js의 기존 경로
 * (beginProMoment · beginMidMoment · playRelief)가 아무 변환 없이 그대로 받아요.
 * DOM 구성·이벤트·정리 순서도 timing.js의 관례를 그대로 따라요: .tm-box를
 * container에 붙이고, 끝나면 tm-done-* 를 붙여 잠깐 보여준 뒤 박스를 지우고 cb를 불러요.
 *
 *   PostStage.mind(box, { label, courses, aim, zonePct, tier }, cb)       🎯 수싸움
 *   PostStage.dash(box, { label, goText, stopText, zonePct, tier }, cb)   🏃 홈 승부
 *
 * 🧭 둘 다 **준비 화면**을 먼저 띄워요. 규칙을 읽고 ▶️ 시작을 눌러야 판이 시작돼요 —
 * 자세한 약속은 아래 ready()의 머리말에 적어 뒀어요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🆕 무엇이 새로운가 — 이게 이 파일의 존재 이유예요
 *
 * 기존 8종(timing.js)은 play·hold·sequence·reaction·duel·target·drop·odd이고,
 * 투어 3종(tour-stage.js)은 이동하는 판정 창·두 대상의 교차·연타 유지예요.
 * **열한 개 모두 "언제 누르나"가 물음이에요.** 화면에서 무언가가 움직이고,
 * 그게 어느 자리에 왔을 때 눌러야 해요.
 *
 *  🎯 mind — **시간 축이 아예 없어요.** 움직이는 것도, 흘러가는 것도, 재는 것도
 *     없어요. 상대와 동시에 세 코스 중 하나를 고르고, 같은 코스면 타자가 이겨요.
 *     물음은 "언제"가 아니라 **"어디"** 예요. 화면은 내가 누르기 전까지 한 픽셀도
 *     안 움직이고, 언제 누르든 결과가 똑같아요(테스트가 그걸 못 박아요).
 *     대신 두 가지 정보를 읽어요 — ① 상대의 **버릇**이 기색 막대로 흐릿하게 보이고
 *     (능력치가 높을수록 또렷해요), ② 상대는 **내가 고른 자국**에 적응해요.
 *     같은 칸만 거듭 고르면 그 칸이 말라붙어요. 열한 개 중 어느 것도 이 축이 없어요.
 *
 *  🏃 dash — **정보와 시간을 맞바꿔요.** 열한 개는 전부 화면이 처음부터 전부
 *     보여요(존도, 커서도, 아이콘도). 여기서는 송구가 처음에 안 보이고 시간이
 *     지나야 드러나는데, 그 사이 주자는 계속 나아가서 **되돌아갈 수 있는 자리를
 *     잃어요.** 더 알고 싶으면 물러설 권리를 내놔야 해요. 게다가 버튼이 둘이라
 *     "언제 누르나"가 아니라 "무엇을 고르나"가 물음이에요.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * zonePct는 game.js의 miniZone(stat)이 준 값(10~40)이에요. 능력치와 컨디션이
 * 높으면 커져요. 둘 다 이 값으로 판정을 느슨하게 해요 — 육성이 가을야구에
 * 닿는 자리예요. 어느 능력치를 보는지는 game.js의 POST_MECH가 정해요.
 *
 * tier는 시리즈의 깊이예요 (0 와일드카드·준PO / 1 PO / 2 마지막 시리즈).
 * 뒤로 갈수록 상대의 버릇이 덜 보이고 어깨가 강해져요 — 같은 능력치로도 더 어려워요.
 *
 * 두 메커닉 모두 3~5초에 끝나요(수싸움은 사람이 고르는 속도만큼이에요).
 * 가을야구 한 시리즈가 최대 5경기, 경기마다 미니게임이 여러 번이라 한 판이 길면
 * 그 자체가 버그예요.
 * 실제 소요·난이도·우승 확률은 tests/rookie/post-mech-test.js가 재요.
 */
"use strict";

window.PostStage = (() => {
  const clampV = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const zoneOf = (opts) => clampV((opts && opts.zonePct) || 22, 10, 40);
  const tierOf = (opts) => clampV(Math.round((opts && opts.tier) || 0), 0, 2);

  /* 판정을 보여주고 치우는 시간. timing.js의 450~500ms와 같은 감각이에요. */
  const OUTRO = 450;

  function makeBox(container, label, inner) {
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `<p class="tm-label">${label}</p>${inner}`;
    container.appendChild(wrap);
    return wrap;
  }

  /* 📱 모바일 탭 — pointerdown이 click보다 빠르고 스크롤·더블탭 확대에 안 밀려요.
   * 실기기에서는 pointerdown 뒤에 click이 한 번 더 오는데, 둘 다 세면 한 번 누른
   * 게 두 번이 돼요. 그래서 pointerdown 직후에 오는 click만 버려요. 시간으로
   * 가르면 포인터가 없는 환경(jsdom·구형 브라우저)의 키보드 입력도 같이 살아요.
   * tour-stage.js가 같은 이유로 같은 모양을 갖고 있어요.
   *
   * ⚠️ TAP_ECHO만으로는 **같은 요소 안의 중복**밖에 못 막아요. 요소가 바뀌면
   * 무력해요 — ▶️ 시작을 누른 pointerdown이 준비 화면을 지우고 그 자리에 게임
   * 버튼을 그리면, 손을 뗄 때 오는 click은 **방금 생긴 게임 버튼**에게 가요.
   * 그 버튼의 lastPointer는 초기값이라 방어에 안 걸리고, 한 번 댄 손가락이
   * '시작'과 '첫 행동' 두 번으로 먹혀요. 그래서 gate가 따로 필요해요. */
  const TAP_ECHO = 700;

  /* 🚪 제스처 문 — **시작한 손가락이 끝나기 전에는 게임이 입력을 안 받아요.**
   *
   * 한 판마다 새로 만들어요. 모듈 전역에 두면 앞 판의 상태가 다음 판으로 새고,
   * 시계를 갈아끼우는 테스트에서는 판마다 시각이 되감겨서 시간으로 가를 수도
   * 없어요. 판마다 새 물건이면 그런 자리가 아예 없어요.
   *
   *   shut=true  → 시작이 pointerdown이었어요. 뒤따라올 click 한 번은 그 제스처의
   *                꼬리니까 삼켜요(그리고 문을 열어요 — 딱 한 번만 삼켜요).
   *   pointerdown → 새로 짚은 손가락이에요. 무조건 문을 열어요.
   *
   * click으로 시작한 경우(포인터 이벤트가 없는 환경·키보드)에는 뒤따라올 것이
   * 없으니 문을 잠그지 않아요. 잠그면 그 환경의 첫 입력이 통째로 사라져요. */
  const newGate = () => ({ shut: false });

  function onTap(el, fn, gate) {
    let lastPointer = -TAP_ECHO;
    el.addEventListener("pointerdown", (e) => {
      lastPointer = Date.now();
      if (gate) gate.shut = false;          // 여기서부터가 이 판의 입력이에요
      if (e && e.cancelable) e.preventDefault();
      fn(true);
    });
    el.addEventListener("click", () => {
      if (Date.now() - lastPointer < TAP_ECHO) return;   // 같은 요소 안의 메아리
      if (gate && gate.shut) { gate.shut = false; return; }   // 시작 제스처의 꼬리예요
      fn(false);
    });
  }

  /* ================================================================
   * 🧭 준비 화면 — 규칙을 읽고 나서, 눌러야 시작해요
   *
   * 왜 필요하냐면: 여기 두 메커닉은 이기는 조건이 여러 구에 걸쳐 있고(수싸움)
   * 버튼이 둘이라(홈 승부) 한 줄짜리 .tm-label로는 첫 판을 통째로 날려요.
   * "너무 빨리 지나가서 뭐 하라는 건지 모르겠다"는 말이 정확히 그 뜻이에요.
   *
   * ✋ 약속이 하나 더 있어요 — **시작한 손가락으로는 게임을 못 건드려요.**
   * ▶️ 시작은 pointerdown에서 곧바로 처리해요(누르자마자 화면이 바뀌어야 하니까요).
   * 대신 그 손가락을 뗄 때 오는 click은 새로 그려진 게임 버튼으로 새어 들어가는데,
   * 그건 gate가 삼켜요. 게임이 실제로 움직이는 건 **새로 짚은 손가락**부터예요.
   *
   * ⏱️ 이 화면의 약속 하나가 전부예요 — **누르기 전에는 아무것도 안 돌아요.**
   * requestAnimationFrame도 setTimeout도 performance.now()도 준비 화면 위에서는
   * 한 번도 불리지 않아요. 진짜 메커닉은 runMind·runDash 안에 통째로 들어 있고,
   * ready()가 그 함수를 붙잡고 있다가 ▶️ 시작을 눌렀을 때 비로소 놓아 줘요.
   * 그래서 판정도 난이도도 한 줄 안 바뀌어요 — 사람이 잡는 건 '시작 시각'뿐이에요.
   *
   * 📖 매번 세 줄을 다 읽으면 성가셔요. 가을야구 한 시리즈에 미니게임이 여러 번
   * 나오니까요. 그래서 메커닉마다 본 횟수를 세어 처음 FULL_SHOWS번만 전문을 펴고,
   * 그 뒤에는 한 줄로 줄여요. **준비 화면 자체는 늘 떠요** — 줄어드는 건 설명의
   * 길이지 시작 버튼이 아니에요. 시작 시점을 플레이어가 잡는 게 이 화면의 목적이라,
   * 그 부분만은 익숙해져도 그대로예요.
   *
   * 🔑 세는 값은 새 열쇠(READY_KEY) 하나에만 담아요. 옛 저장은 한 칸도 안 건드려요 —
   * 마이그레이션이 없고, 값이 없으면 그냥 0이에요(= 처음 보는 사람).
   * 열쇠 안은 메커닉 이름별 횟수라, 야구와 아이돌이 같은 열쇠를 나눠 써도
   * 이름이 겹치지 않아 서로를 덮지 않아요.
   * ================================================================ */
  const READY_KEY = "grow-mech-ready";
  const FULL_SHOWS = 3;          // 처음 이만큼은 전문, 그 뒤로는 한 줄

  const readSeen = () => {
    try {
      const o = JSON.parse(localStorage.getItem(READY_KEY) || "{}");
      return (o && typeof o === "object") ? o : {};
    } catch (e) { return {}; }   // 사생활 보호 모드처럼 못 읽는 자리도 있어요
  };
  /* 이번이 '보기 전 기준' 몇 번째인지 돌려줘요 — 0이면 난생처음 보는 거예요. */
  const bumpSeen = (key) => {
    const seen = readSeen();
    const n = Number(seen[key]) || 0;
    seen[key] = n + 1;
    try { localStorage.setItem(READY_KEY, JSON.stringify(seen)); } catch (e) { /* 못 써도 넘어가요 */ }
    return n;
  };

  /* info = { key, title, lines: [3줄], short: "한 줄", keys: [{ name, desc }] }
   * keys는 **버튼이 각각 무엇인지**예요. 버튼이 둘인 홈 승부에서는 이게 없으면
   * 준비 화면을 띄운 뜻이 없어요. 수싸움은 세 칸이 같은 역할이라, 대신 '칸이
   * 무엇을 말해 주는지'(기색 막대·내 자국)를 그 자리에 적어 둬요. */
  function ready(container, info, start) {
    const full = bumpSeen(info.key) < FULL_SHOWS;
    const body = full
      ? `<ul class="mg-ready-lines">${info.lines.map((t) => `<li>${t}</li>`).join("")}</ul>`
      : `<p class="mg-ready-short">${info.short}</p>`;
    const keys = (info.keys || [])
      .map((k) => `<span class="mg-ready-key"><b>${k.name}</b><span>${k.desc}</span></span>`).join("");
    const wrap = document.createElement("div");
    wrap.className = "tm-box mg-ready";
    wrap.innerHTML = `<p class="tm-label">${info.title}</p>${body}`
      + (keys ? `<div class="mg-ready-keys">${keys}</div>` : "")
      + `<button type="button" class="btn btn-primary tm-btn mg-go">▶️ 시작</button>`;
    container.appendChild(wrap);
    /* 이 판의 문. 시작이 pointerdown이면 잠근 채로 게임에 넘겨요 —
     * 손을 뗄 때 오는 click 한 번이 게임 버튼으로 새거든요. */
    const gate = newGate();
    let went = false;
    onTap(wrap.querySelector(".mg-go"), (viaPointer) => {
      if (went) return;          // pointerdown과 click이 겹쳐도 한 번만 시작해요
      went = true;
      gate.shut = !!viaPointer;
      wrap.remove();             // 준비 화면을 치우고 나서 본 게임 상자를 붙여요
      start(gate);
    });
  }

  /* ================================================================
   * 🎯 수싸움 — 상대와 동시에 코스를 골라요
   *
   * 세 칸(몸쪽·가운데·바깥쪽)이 나란히 있어요. 나도 하나를 고르고 상대도 하나를
   * 골라요. **같은 칸이면 타자가 이기고, 다른 칸이면 투수가 이겨요.** 그게 전부예요.
   *
   * ⏱️ **시간 축이 아예 없어요.** 날아오는 것도, 흘러가는 막대도, 재는 숫자도
   * 없어요. 내가 누르기 전까지 화면은 한 픽셀도 안 움직이고(프레임 루프를 아예
   * 안 돌려요), 1초에 누르든 8초에 누르든 결과가 똑같아요. 이건 취향이 아니라
   * 이 메커닉의 존재 이유예요 — 앞서 있던 🧊 볼카운트 승부는 "안 누르는 게 수"인
   * 판단 게임인데 화면이 타이밍 게임처럼 생겨서, 셋 다 고쳐도 끝내 "언제 누르지?"가
   * 안 없어졌어요. 그래서 **기대를 만들 물건 자체를 화면에서 들어냈어요.**
   * 유일한 타이머는 판정을 보여주는 사이(reveal)와, 탭을 통째로 놓친 기기를 위한
   * 안전망(capPer · 구마다 15초)뿐이에요. 둘 다 사람의 선택을 재촉하지 않아요.
   *
   * 🔎 그럼 찍기냐 — 아니에요. 읽을 것이 둘이에요.
   *
   *   ① **버릇(tell)** — 상대에게는 즐겨 쓰는 코스가 하나 있어요. 그게 칸마다
   *      '기색' 막대로 흐릿하게 비쳐요. 능력치가 높을수록 이 막대가 상대의 진짜
   *      성향에 가까워지고(read), 낮으면 흔들려서 거의 못 믿어요.
   *   ② **적응** — 상대는 **내가 고른 자국**을 봐요. 칸마다 내가 몇 번 골랐는지
   *      점(●)으로 남고, 타자 시점이면 상대가 그 칸을 **피하고**(match), 투수
   *      시점이면 타자가 그 칸을 **노려요**(dodge). 같은 칸만 거듭 고르면 말라붙어요.
   *
   * 두 정보가 서로를 보완해요. 눈이 좋으면 ①만으로 충분하고, 눈이 나빠도 ②는
   * 공짜로 알 수 있어요 — "내가 두 번 간 자리는 이제 아니다"는 능력치가 필요 없거든요.
   * 그래서 능력치가 낮아도 완전히 캄캄하지는 않고, 높으면 확실히 유리해요.
   *
   * 🔁 3구를 거쳐 쌓여요. 앞 구의 선택이 뒤 구의 판을 바꾸니까(적응) 한 구씩
   * 따로 노는 게 아니에요.
   *   타자(match) — 3구 중 2번 이상 맞히면 perfect, 1번이면 good, 0번이면 miss
   *   투수(dodge) — 한 번도 안 읽히면 perfect, 한 번 읽히면 good, 두 번이면 miss
   * 이미 결과가 정해지면 남은 구를 안 던져요(mindSettled) — 판이 짧아져요.
   *
   * ⚖️ 그냥 찍는 사람의 성적이 곧 바닥이에요. 세 칸이라 한 구 적중률이 1/3이고,
   * 타자면 perfect 26%·miss 30%, 투수면 그 거울이에요. 읽는 사람은 여기서 위로
   * 올라가요. 아무것도 안 고르면 안전망이 미스로 끊어요 — 🏃 홈 승부와 같아요.
   *
   * 🎚 능력치(zonePct)는 **버릇이 얼마나 또렷하게 보이는지** 한 곳에 들어가요.
   * 판정 규칙(같은 칸이면 이긴다)은 사람마다 다르면 거짓말이 되니까 안 건드려요.
   *   zone 10 → read 0.30 (기색이 거의 안 맞아요) · zone 40 → read 0.72
   * tier가 깊어지면 read가 깎여요 — 큰 경기의 상대일수록 버릇을 안 흘려요.
   * ================================================================ */
  const MIND = {
    rounds: 3,
    /* 상대의 버릇 — 즐겨 쓰는 칸 하나에 실리는 가중치예요. 5.2면 첫 구에 그 칸이
     * 나올 확률이 5.2/7.2 ≈ 72%예요. 이 값이 곧 "완벽하게 읽는 사람의 천장"이라,
     * 1에 가까우면 읽을 것이 사라지고 너무 크면 기색만 따라가는 게임이 돼요.
     * 그래도 천장이 72%인 건 첫 구뿐이에요 — 그 칸을 고르는 순간 adapt가 깎아요. */
    habit: 5.2,
    /* 내가 그 칸을 고른 횟수마다 상대가 기우는 배수. match면 그만큼 **피하고**,
     * dodge면 그만큼 **노려요.** 이게 "같은 곳만 고르면 불리해진다"의 전부예요.
     * 여기를 세게 걸면(2 이상) "안 겹치게만 고르면 된다"가 정답이 돼서 읽기가
     * 무의미해져요 — 실제로 2.1로 두었더니 능력치를 올려도 성적이 안 움직였어요. */
    adapt: 1.45,
    /* 기색이 진짜 성향에 얼마나 가까운가 — **능력치가 사는 단 한 곳이에요.**
     * zone 30 이하 → 0.02 (아예 안 보여요) · zone 40 → 0.68 (tier 0)
     *
     * ⚠️ 폭(30~40)을 넓히지 마세요. 이 메커닉은 가을야구에서만 나오고, 거기 오는
     * 선수는 miniZone(stat)이 30~40이에요. 10~40으로 펴면 실제로 쓰이는 구간에서는
     * 기색이 거의 안 갈려요 — 실제로 그렇게 뒀더니 능력치가 배수를 0.04밖에 못
     * 벌렸고(들어낸 🧊 볼카운트는 0.10이었어요), 우승 확률도 능력치를 안 따라갔어요.
     * 능력치가 실제로 오가는 구간에 폭을 얹어야 육성이 닿아요.
     * ⚠️ 위도 0.75 넘게 올리지 마세요. read가 0.7쯤이면 가장 진한 칸이 **거의 항상**
     * 진짜 성향의 1등이라, 그 위로는 올려도 성적이 안 변해요 — 능력치가 죽는 자리예요. */
    readFrom: 30, readTo: 40, readLo: 0.02, readHi: 0.68, readTier: -0.16,
    /* 못 읽는 만큼 기색이 흔들리는 폭이에요. read가 1이면 흔들림이 0이 돼요. */
    noise: 1.45,
    /* 한 구의 결과를 보여주고 다음 구로 넘어가는 시간. 사람을 재촉하는 시계가
     * 아니라 **읽을 틈**이에요 — 이 사이에는 입력을 아예 안 받아요.
     * 한 판이 3구라 여기가 곧 판 길이의 절반이에요. 늘리면 경기가 늘어져요. */
    reveal: 520,
    /* 🛟 안전망이에요. 화면에는 아무 표시도 안 해요 — 보이는 순간 제한 시간이
     * 되거든요. **구마다 새로 걸어요.** 한 판에 한 번만 걸면 앞 구에서 오래 고민한
     * 사람이 뒤 구에서 손도 못 대고 잘려요. 사람이 한 구를 고르는 데 1~3초라,
     * 15초는 "탭을 통째로 놓쳤다" 말고는 닿을 수 없는 자리예요.
     * 여기 닿으면 남은 구를 다 진 것으로 쳐요 — 손을 놓으면 나빠져야 하니까요. */
    capPer: 15000,
  };
  const MIND_COURSES = ["몸쪽", "가운데", "바깥쪽"];
  const mindRead = (zone, tier) => clampV(
    MIND.readLo
      + (clampV(zone, MIND.readFrom, MIND.readTo) - MIND.readFrom) / (MIND.readTo - MIND.readFrom)
        * (MIND.readHi - MIND.readLo)
      + tier * MIND.readTier,
    0.02, 0.95);
  /* 적중 수 → 판정. dodge(투수)는 뜻이 뒤집혀요 — 읽힌 횟수가 곧 적중 수예요. */
  const mindGrade = (hits, dodge) => (dodge
    ? (hits <= 0 ? "perfect" : hits === 1 ? "good" : "miss")
    : (hits >= 2 ? "perfect" : hits === 1 ? "good" : "miss"));
  /* 남은 구를 다 이겨도(=다 져도) 등급이 안 바뀌면 더 던질 이유가 없어요.
   * 문턱을 여기 베껴 적지 않고 mindGrade를 두 번 불러서 물어봐요 — 문턱을 고쳐도
   * 이 함수는 저절로 맞아요. */
  const mindSettled = (hits, round, dodge) =>
    mindGrade(hits, dodge) === mindGrade(hits + (MIND.rounds - round), dodge);

  /* 문구는 통째로 갈아끼울 수 있어요. 투수는 같은 규칙을 정반대로 읽어야 말이
   * 되거든요 — 투수가 "맞혔어요!"를 보면 안 돼요. ready*로 시작하는 것들은 준비
   * 화면 몫이에요. 같은 묶음에 둬야 투수 문구를 갈아끼울 때 준비 화면만 타자
   * 말로 남는 일이 안 생겨요. */
  const MIND_MSG = {
    tellCue: "🔎 상대의 기색 — 진한 칸이 그 투수의 버릇이에요",
    face: "⚾",                 // 상대가 실제로 고른 칸에 찍히는 표식
    hit: "🎯 노림수 적중! 같은 코스였어요",
    slip: "🌀 빗나갔어요 — 다른 코스였어요",
    win: "💥 완전히 읽었어요, 통타!",
    even: "🏏 한 번 맞혀 살아 나갔어요",
    lose: "❌ 끝까지 못 읽었어요… 삼진",
    timeup: "⏱️ 승부 종료",
    scoreLabel: "적중",
    roundLabel: "구",
    tip: "기색이 진한 칸이 유력해요 · <b>같은 칸만 거듭 고르면</b> 상대가 피해요 · 서두를 필요 없어요",
    readyTitle: "🎯 수싸움",
    readyLines: [
      "상대와 <b>동시에</b> 코스를 골라요. 세 칸 중 <b>같은 칸</b>을 고르면 맞힌 거예요.",
      "<b>날아오는 공도, 제한 시간도 없어요.</b> 화면은 누르기 전까지 멈춰 있으니 천천히 보고 정하세요.",
      "칸마다 선 <b>기색 막대</b>가 상대의 버릇이에요 — 선구안이 좋을수록 진짜 성향에 가깝게 보여요.",
      "내가 고른 자국(●)이 칸에 남아요. <b>같은 칸만 거듭 고르면 상대가 그 칸을 피해요.</b>",
      "3구 중 <b>2번 이상</b> 맞히면 통타(완벽), 1번이면 살아 나가고, 한 번도 못 맞히면 삼진이에요.",
    ],
    readyShort: "기색이 진한 칸을 노리되, 같은 칸만 거듭 고르면 상대가 피해요 · 3구 중 2번 맞히면 완벽",
    /* ⚠️ 이 두 줄에는 태그를 넣지 마세요. 준비 화면의 설명 칸에 그대로 들어가요 */
    readyPick: "세 칸 중 하나를 눌러요. 상대와 같은 칸이면 맞힌 거예요 — 언제 눌러도 결과는 같아요",
    readyTell: "칸 안의 막대는 상대의 버릇, 아래 점(●)은 내가 그 칸을 고른 자국이에요",
  };
  const mindMsg = (opts) => Object.assign({}, MIND_MSG, (opts && opts.msg) || {});

  /* 준비 화면에 무엇을 띄울지. 세 칸은 역할이 같아서 버튼마다 적을 것이 없어요 —
   * 대신 '무엇을 누르는지'와 '칸이 무엇을 말해 주는지'를 한 칸씩 적어요. */
  function mindReady(opts) {
    const msg = mindMsg(opts);
    const names = (opts && opts.courses) || MIND_COURSES;
    return {
      key: "mind",
      title: msg.readyTitle,
      lines: msg.readyLines,
      short: msg.readyShort,
      keys: [
        { name: names.join(" · "), desc: msg.readyPick },
        { name: "기색 막대 · ●", desc: msg.readyTell },
      ],
    };
  }

  /* 🎯 한 판. **여기서도 시계는 사람을 안 재촉해요** — 걸리는 타이머는 판정을
   * 보여주는 사이(reveal)와 안전망(cap)뿐이고, requestAnimationFrame은 한 번도
   * 안 불러요. 준비 화면의 ▶️ 시작을 누른 뒤에만 불려요. */
  function runMind(container, opts, cb, gate) {
    const zone = zoneOf(opts), tier = tierOf(opts);
    const read = mindRead(zone, tier);
    const dodge = (opts && opts.aim) === "dodge";
    const names = (opts && opts.courses) || MIND_COURSES;
    const msg = mindMsg(opts);
    /* 이 상대의 버릇이에요. 한 판 내내 안 바뀌어요 — 세 구 안에 읽어 내라는 게
     * 이 메커닉의 숙제라, 매 구 바뀌면 읽을 것이 사라져요. */
    const habit = Math.floor(Math.random() * names.length);
    const mine = names.map(() => 0);       // 칸마다 내가 고른 횟수 (= 상대가 보는 자국)

    const wrap = makeBox(container, opts.label || "🎯 수싸움! 상대와 같은 코스를 고르면 이겨요", `
      <p class="pm-head"><span class="pm-round"></span><span class="pm-score"></span></p>
      <p class="pm-cue">${msg.tellCue}</p>
      <div class="pm-board">${names.map((n, i) => `
        <button type="button" class="btn btn-ghost tm-btn pm-col" data-i="${i}">
          <span class="pm-face">❔</span>
          <span class="pm-gauge"><i></i></span>
          <span class="pm-sign">〰️</span>
          <span class="pm-name">${n}</span>
          <span class="pm-mine">·</span>
        </button>`).join("")}</div>
      <p class="ps-mark">&nbsp;</p>
      <p class="tm-legend-tip">${msg.tip}</p>`);

    const cols = Array.prototype.slice.call(wrap.querySelectorAll(".pm-col"));
    const markEl = wrap.querySelector(".ps-mark");
    const roundEl = wrap.querySelector(".pm-round");
    const scoreEl = wrap.querySelector(".pm-score");

    let round = 0, hits = 0, truth = -1;
    let done = false, busy = true, nextTimer = 0, guard = 0;

    /* 상대가 이번 구에 각 칸을 고를 진짜 확률이에요. 버릇에 가중치를 얹고,
     * 내 자국만큼 기울여요 — match면 피하고(나눔) dodge면 노려요(곱함). */
    function odds() {
      const w = names.map((n, i) =>
        (i === habit ? MIND.habit : 1) * Math.pow(MIND.adapt, dodge ? mine[i] : -mine[i]));
      const sum = w.reduce((a, b) => a + b, 0);
      return w.map((v) => v / sum);
    }
    /* 화면에 뜨는 기색. 진짜 확률(q)을 read만큼만 남기고 나머지는 평평하게 뭉갠 뒤,
     * 못 읽는 만큼 흔들어요. read가 1이면 q 그대로, 0이면 순전한 잡음이에요. */
    function tellOf(q) {
      const flat = 1 / names.length;
      const raw = q.map((v) => {
        const blur = v * read + flat * (1 - read);
        return Math.max(0.02, blur * (1 + (1 - read) * (Math.random() * 2 - 1) * MIND.noise));
      });
      const sum = raw.reduce((a, b) => a + b, 0);
      return raw.map((v) => v / sum);
    }
    const drawFrom = (q) => {
      let r = Math.random();
      for (let i = 0; i < q.length; i++) { r -= q[i]; if (r <= 0) return i; }
      return q.length - 1;
    };
    const dots = (n, max) => "●".repeat(n) + "○".repeat(Math.max(0, max - n));

    function paintHead() {
      roundEl.textContent = `${round}${msg.roundLabel} / ${MIND.rounds}${msg.roundLabel}`;
      scoreEl.textContent = `${msg.scoreLabel} ${dots(hits, MIND.rounds)}`;
    }

    function newRound() {
      round += 1;
      const q = odds();
      truth = drawFrom(q);
      const tell = tellOf(q);
      const top = Math.max.apply(null, tell);
      const order = tell.slice().sort((a, b) => b - a);
      cols.forEach((col, i) => {
        col.classList.remove("pm-chosen", "pm-truth");
        col.disabled = false;
        col.querySelector(".pm-gauge i").style.height = `${(tell[i] / top * 100).toFixed(0)}%`;
        col.querySelector(".pm-sign").textContent =
          tell[i] === order[0] ? "🔥" : tell[i] === order[order.length - 1] ? "💤" : "〰️";
        col.querySelector(".pm-mine").textContent = mine[i] ? "●".repeat(mine[i]) : "·";
        col.querySelector(".pm-face").textContent = "❔";
      });
      wrap.classList.remove("pm-same", "pm-diff");
      markEl.innerHTML = "&nbsp;";
      paintHead();
      armGuard();                       // 🛟 구마다 안전망을 새로 걸어요
      busy = false;                     // 여기서부터 사람의 차례예요 (시계는 안 돌아요)
    }

    // note는 화면에 남길 한 줄이에요 — 바깥의 msg와 이름이 겹치지 않게 따로 불러요
    function finish(res, note) {
      if (done) return;
      done = true;
      busy = true;
      clearTimeout(guard);
      clearTimeout(nextTimer);
      cols.forEach((c) => { c.disabled = true; });
      markEl.textContent = note;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, OUTRO);
    }
    /* 🛟 안전망 — 남은 구를 다 진 것으로 쳐요. 타자면 적중이 안 늘고, 투수면
     * 남은 구를 다 읽힌 셈이라 그만큼 늘어요. 어느 쪽이든 손을 놓으면 나빠져요.
     * 구마다 다시 걸어요(newRound). 화면에는 아무 표시도 안 해요. */
    function armGuard() {
      clearTimeout(guard);
      guard = setTimeout(() => {
        const left = MIND.rounds - round + 1;
        finish(mindGrade(dodge ? hits + left : hits, dodge), msg.timeup);
      }, MIND.capPer);
    }

    function choose(i) {
      if (done || busy) return;
      busy = true;                      // 판정을 보여주는 동안은 입력을 안 받아요
      clearTimeout(guard);              // 골랐으니 이 구의 안전망은 내려요
      mine[i] += 1;
      const same = i === truth;
      if (same) hits += 1;
      cols.forEach((c) => { c.disabled = true; });
      cols[i].classList.add("pm-chosen");
      cols[truth].classList.add("pm-truth");
      cols[truth].querySelector(".pm-face").textContent = msg.face;
      cols[i].querySelector(".pm-mine").textContent = "●".repeat(mine[i]);
      wrap.classList.add(same ? "pm-same" : "pm-diff");
      markEl.textContent = same ? msg.hit : msg.slip;
      paintHead();
      const over = mindSettled(hits, round, dodge) || round >= MIND.rounds;
      nextTimer = setTimeout(() => {
        if (!over) { newRound(); return; }
        const g = mindGrade(hits, dodge);
        finish(g, g === "perfect" ? msg.win : g === "good" ? msg.even : msg.lose);
      }, MIND.reveal);
    }

    cols.forEach((col, i) => onTap(col, () => choose(i), gate));
    newRound();
  }

  /* 바깥에서 부르는 건 이쪽이에요 — 준비 화면부터예요.
   * gate는 준비 화면이 만들어 넘겨줘요 (시작한 손가락을 게임에서 떼어 놓는 문). */
  function mind(container, opts, cb) {
    ready(container, mindReady(opts), (gate) => runMind(container, opts || {}, cb, gate));
  }

  /* ================================================================
   * 🏃 홈 승부 — 정보와 시간을 맞바꿔요
   *
   * 3루 주자가 홈으로 향해요. 위쪽은 송구, 아래쪽은 주자예요. 둘 다 오른쪽 끝
   * (🏠 홈)을 향하고, 먼저 닿는 쪽이 이겨요.
   *
   * 그런데 **송구는 처음에 안 보여요.** 타구가 어디로 갔는지, 누가 잡았는지
   * 아직 모르는 거예요(🌫). 주자가 어느 지점을 지나야 그제야 송구가 드러나요.
   *
   * 버튼이 둘이에요 — [돌진] 과 [멈춰].
   *   돌진 → 전력으로 홈까지 달려요. 송구보다 먼저 닿으면 득점(perfect),
   *          늦으면 태그아웃(miss). 한 번 가면 못 돌아와요.
   *   멈춰 → 3루로 돌아가요. **귀루 한계선(✋) 안이면** 안전(good),
   *          넘었으면 협살에 걸려요(miss).
   *
   * ⚖️ 여기서 나오는 것: 판단을 미루는 동안 주자는 **머뭇거리며(78% 속도)**
   * 계속 나아가요. 그래서 늦게 결정할수록 ① 돌진해도 홈에 늦게 닿고
   * ② 귀루 한계선을 넘어 물러설 권리 자체를 잃어요. 정보를 더 갖는 값을
   * 자리로 치르는 거예요. 아무것도 안 고르면 협살로 죽어요 — 이 판에서
   * 가장 나쁜 수는 틀린 선택이 아니라 **고르지 않는 것**이에요.
   *
   * 🎚 능력치(zonePct)는 세 곳에 들어가요.
   *   ① 주자가 빨라져요 (홈까지 걸리는 시간 ↓) — 돌진이 실제로 통해요
   *   ② 귀루 한계선이 뒤로 밀려요 — 더 오래 보고도 물러설 수 있어요
   *   ③ 송구가 일찍 드러나요 — 판단할 시간이 길어져요
   * 송구가 오는 시간(throwBase)만은 능력치와 무관한 절대 시간이에요.
   * 주자 시간에 비례시켜 두면 발이 빨라도 성공률이 그대로여서, 주력을 올린
   * 보람이 사라져요.
   * ================================================================ */
  const DASH = {
    /* 3루에서 홈까지 전력으로 달리는 시간(ms). zone 10 → 3060 · zone 40 → 2640 */
    runBase: 3200, runPer: -14,
    hesit: 0.78,          // 아직 안 정했을 때의 속도 배수 — 머뭇거려요
    /* 송구가 홈에 닿는 시간(ms). 주자 시간과 무관한 절대 시간이에요.
     * 2429~3643ms(tier 0)라 발이 느리면 아슬아슬하고 빠르면 넉넉해요. */
    throwBase: 2760, throwLo: 0.88, throwHi: 1.32, throwTier: -0.035,
    /* 귀루 한계선(주자 위치 %). zone 10 → 40.2 · zone 40 → 58.8 */
    backBase: 34, backPer: 0.62, backTier: -1.0,
    /* 송구가 드러나기 시작하는 자리 — **한계선의 몇 할 지점인가**로 잡아요.
     * 그래야 "보고 나서 물러설 수 있는 폭"이 능력치를 따라 같이 넓어져요.
     *   zone 10 tier 0 → 한계선의 80% 지점 (생각할 틈 ≈ 0.31초)
     *   zone 40 tier 0 → 62% 지점            (≈ 0.86초)
     * ⚠️ 예전에는 드러나는 자리와 한계선을 따로 잡았어요. 그러면 어느 능력치에서나
     * 폭이 넉넉해서 **멈추기가 늘 안전한 수**가 됐고, dash의 배수가 능력치와 거의
     * 무관하게 1.00에 붙어 버렸어요(실측 1.000 → 1.018). 물러설 틈이 능력치라야
     * 발이 느린 선수가 실제로 도박을 하게 돼요. 반대로 tier가 이 둘을 양쪽에서
     * 조이게 뒀더니 마지막 시리즈의 저능력치 선수가 99% 아웃이 났어요 —
     * tier는 송구 쪽을 세게 걸고 여기는 살살 건드려요. */
    revealFrac: 0.86, revealFracPer: -0.006, revealFracTier: 0.04,
    /* 프레임이 끊긴 기기를 위한 안전망이에요. 정상 경로에서는 주자가 홈에
     * 닿거나 송구가 먼저 닿아서 tick이 끝내요 (미결정이어도 4초 안). */
    cap: 6000,
  };
  const dashRun = (zone) => DASH.runBase + clampV(zone, 10, 40) * DASH.runPer;
  const dashThrow = (tier) => DASH.throwBase * (1 + tier * DASH.throwTier);
  const dashBack = (zone, tier) =>
    clampV(DASH.backBase + clampV(zone, 10, 40) * DASH.backPer + tier * DASH.backTier, 12, 92);
  const dashReveal = (zone, tier) => dashBack(zone, tier) *
    clampV(DASH.revealFrac + clampV(zone, 10, 40) * DASH.revealFracPer + tier * DASH.revealFracTier, 0.35, 0.95);

  /* mind와 같은 이유로 문구를 통째로 갈아끼울 수 있어요 — 투수는 주자가 아니라
   * 중계·백업 자리에서 같은 판단을 해요. */
  const DASH_MSG = {
    safe: "🎉 홈 세이프! 득점이에요",
    tagged: "❌ 홈에서 태그아웃…",
    rundown: "❌ 3루와 홈 사이에서 협살…",
    back: "🛑 3루에 안전하게 돌아왔어요",
    late: "❌ 어정쩡하게 걸려 협살…",
    going: "🏃 홈으로!!",
    timeup: "⏱️ 주루 판단 실패…",
    tip: "송구는 🌫️ 뒤에 숨어 있어요 · ✋ 선을 넘으면 <b>더는 못 돌아가요</b>",
    readyTitle: "🏃 홈 승부 — 버튼이 둘이에요",
    readyLines: [
      "위 레인은 <b>송구</b>, 아래 레인은 <b>주자</b>예요. 먼저 🏠에 닿는 쪽이 이겨요.",
      "송구는 처음엔 🌫️에 덮여 안 보이다가, 주자가 어느 지점을 지나면 드러나요. 그 사이에도 주자는 <b>계속 나아가요</b>.",
      "아래 두 버튼 중 <b>반드시 하나를 고르세요</b>. 안 고르면 협살로 죽어요 — 여기서 가장 나쁜 수예요.",
    ],
    readyShort: "🌫️가 걷히기를 기다릴수록 ✋ 선이 가까워져요 · 둘 중 하나는 꼭 고르세요",
    readyGo: "홈까지 전력으로 달려요. 송구보다 먼저 닿으면 득점, 늦으면 태그아웃이에요",
    readyStop: "3루로 돌아가요. ✋ 선을 넘기 전이면 안전하고, 넘었으면 협살이에요",
  };
  const dashMsg = (opts) => Object.assign({}, DASH_MSG, (opts && opts.msg) || {});

  /* 🏃 준비 화면 — **버튼이 둘이라 각각 무엇인지 적는 게 이 화면의 본론이에요.** */
  function dashReady(opts) {
    const msg = dashMsg(opts);
    return {
      key: "dash",
      title: msg.readyTitle,
      lines: msg.readyLines,
      short: msg.readyShort,
      keys: [
        { name: (opts && opts.goText) || "돌진! 🏃", desc: msg.readyGo },
        { name: (opts && opts.stopText) || "멈춰! ✋", desc: msg.readyStop },
      ],
    };
  }

  /* 🏃 한 판. runMind와 같아요 — 준비 화면을 누른 뒤에만 불려요.
   * 다만 여기는 진짜로 시간이 흘러요(주자와 송구가 움직여요) — 수싸움과 갈리는 자리예요. */
  function runDash(container, opts, cb, gate) {
    const zone = zoneOf(opts), tier = tierOf(opts);
    const runMs = dashRun(zone);
    const revealAt = dashReveal(zone, tier);
    const backAt = dashBack(zone, tier);
    const throwMs = dashThrow(tier) * rand(DASH.throwLo, DASH.throwHi);
    const msg = dashMsg(opts);
    /* 🌫️ 안개는 레인을 통째로 덮어요. 예전에는 🌫️ 한 개를 오른쪽 끝(홈)에 세워
     * 뒀는데, 그러면 "송구가 이미 홈에 닿았다"로 읽혀서 다들 겁을 먹고 멈췄어요.
     * 모른다는 건 '어딘가에 있다'가 아니라 '레인 전체가 안 보인다'예요. */
    const wrap = makeBox(container, opts.label || "🏃 홈 승부! 갈까요, 멈출까요?", `
      <div class="ps-field">
        <div class="ps-lane ps-lane-throw">
          <span class="ps-fog">🌫️ 타구를 쫓는 중…</span>
          <span class="ps-throw">🌫️</span><span class="ps-home">🏠</span>
        </div>
        <div class="ps-lane ps-lane-run"><span class="ps-back"></span><span class="ps-runner">🏃</span><span class="ps-home">🏠</span></div>
      </div>
      <p class="ps-mark">&nbsp;</p>
      <p class="tm-legend-tip">${msg.tip}</p>
      <div class="tm-duel ps-pick">
        <button type="button" class="btn btn-primary tm-btn ps-go">${(opts && opts.goText) || "돌진! 🏃"}</button>
        <button type="button" class="btn btn-ghost tm-btn ps-stop">${(opts && opts.stopText) || "멈춰! ✋"}</button>
      </div>`);

    const throwEl = wrap.querySelector(".ps-throw");
    const runEl = wrap.querySelector(".ps-runner");
    const backEl = wrap.querySelector(".ps-back");
    const markEl = wrap.querySelector(".ps-mark");
    const goBtn = wrap.querySelector(".ps-go");
    const stopBtn = wrap.querySelector(".ps-stop");
    backEl.style.left = `${backAt}%`;
    backEl.textContent = "✋";

    let p = 0, elapsed = 0, decided = false, done = false, raf = 0;
    let shown = false;

    function paint() {
      runEl.style.left = `${clampV(p, 0, 100)}%`;
      wrap.classList.toggle("ps-past-back", p > backAt);
      if (!shown && p >= revealAt) {
        shown = true;
        throwEl.textContent = "⚾";
        wrap.classList.add("ps-seen");
      }
      // 송구는 드러나기 전까지 자리도 알 수 없어요 (🌫️는 오른쪽 끝에 머물러요)
      throwEl.style.left = shown ? `${clampV(elapsed / throwMs * 100, 0, 100)}%` : "100%";
    }
    paint();

    // note를 msg와 다르게 부르는 이유는 mind의 finish와 같아요
    function finish(res, note) {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(guard);
      goBtn.disabled = true;
      stopBtn.disabled = true;
      markEl.textContent = note;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, OUTRO);
    }
    const guard = setTimeout(() => finish("miss", msg.timeup), DASH.cap);

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(now - last, 50);
      last = now;
      elapsed += dt;
      p += (dt / runMs) * 100 * (decided ? 1 : DASH.hesit);
      paint();
      if (p >= 100) {                         // 주자가 홈에 닿았어요
        finish(elapsed < throwMs ? "perfect" : "miss", elapsed < throwMs ? msg.safe : msg.tagged);
        return;
      }
      if (elapsed >= throwMs) {               // 송구가 먼저 닿았어요
        finish("miss", decided ? msg.tagged : msg.rundown);
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    onTap(goBtn, () => {
      if (done || decided) return;
      decided = true;
      wrap.classList.add("ps-dashing");
      goBtn.classList.add("ps-picked");
      stopBtn.disabled = true;
      markEl.textContent = msg.going;
    }, gate);
    onTap(stopBtn, () => {
      if (done || decided) return;
      finish(p <= backAt ? "good" : "miss", p <= backAt ? msg.back : msg.late);
    }, gate);
    raf = requestAnimationFrame(tick);
  }

  /* 바깥에서 부르는 건 이쪽이에요 — 준비 화면부터예요. */
  function dash(container, opts, cb) {
    ready(container, dashReady(opts), (gate) => runDash(container, opts || {}, cb, gate));
  }

  return {
    mind, dash,
    /* 테스트가 판정 산식을 그대로 굴려 볼 수 있게 열어 둬요 — 난이도를 손으로
     * 베껴 두면 여기를 고칠 때 테스트만 옛 숫자로 남아요.
     * 준비 화면 쪽도 같은 이유로 열어 둬요 (횟수 문턱을 테스트가 베껴 적지 않게요). */
    _t: {
      MIND, DASH, MIND_MSG, DASH_MSG, MIND_COURSES,
      mindRead, mindGrade, mindSettled,
      dashRun, dashThrow, dashReveal, dashBack,
      READY_KEY, FULL_SHOWS, readSeen, mindReady, dashReady,
    },
  };
})();
