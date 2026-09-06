/* ⚾ 더 드래프트 — 타격 구역 선택 화면 (야구 전용, 다른 게임과 공유하지 않아요)
 *
 * 설계: docs/superpowers/_workspace/rookie/11_designer_bat-zone.md (Codex gpt-6-astra)
 *
 * 🔑 **새 게임이 아니에요.** 이미 있던 3택(`Timing.duel`의 몸쪽·가운데·바깥쪽)이
 * 글자 버튼 세 개라 "구역을 고르는 중"이라는 게 안 보였어요. 그 화면만 스트라이크 존
 * 모양으로 바꿉니다.
 *
 * 🔒 **추첨도 판정도 타이머도 `timing.js`의 것을 그대로 씁니다.**
 *   · 함정·최적 구역 추첨, 6초 제한, 결과 표시 500ms, 완료 가드 — 전부 원본
 *   · 버튼과 `data-i`를 보존해요. 복제하거나 이벤트를 다시 걸지 않아요
 *   · 난수를 한 톨도 더 쓰지 않아요
 * 그래서 **판정 분포가 변경 전과 정확히 같습니다.** 중립을 평균으로 맞추는 게 아니라
 * 아예 같은 함수를 지나갑니다 — 무작위로 고르면 E[배수] = (1.12+1.00+0.40)/3 = 0.84로
 * 전과 동일해요. 🔴 이걸 1.0으로 "고치면" 기존 대비 19% 상향입니다. 그러지 마세요.
 *
 * 🔒 폐기된 형태(볼카운트)로 돌아가지 않아요 — 날아오는 공도, 스윙 버튼도 없고,
 * "안 누르는 게 수"인 선택지도 없습니다. 정지한 구역을 직접 누르는 게 전부예요.
 */
(function () {
  "use strict";

  const CAPTION = "구역을 한 번 누르면 정해져요 — 빨리 누른다고 유리하지 않아요";
  const SIDE = ["몸쪽", "가운데", "바깥쪽"];

  /* 존을 꾸며요. 구조가 바뀌어 못 찾으면 **꾸미기만 건너뜁니다** —
   * 게임 자체는 timing.js가 그대로 굴리니까 여기서 판을 죽이면 안 돼요. */
  function decorate(box) {
    box.classList.add("rookie-bat-zone");
    const duel = box.querySelector(".tm-duel");
    if (!duel) return false;
    const cells = duel.querySelectorAll(".tm-duel-btn");
    if (!cells.length) return false;
    cells.forEach((b, i) => {
      b.classList.add("bz-cell");
      // 🔒 data-i는 timing.js가 판정에 쓰는 값이라 손대지 않아요. 표시용만 따로 답니다.
      b.dataset.bzSide = SIDE[i] || "";
    });
    const plate = document.createElement("div");
    plate.className = "bz-plate";
    plate.setAttribute("aria-hidden", "true");   // 홈플레이트는 장식이라 읽어주지 않아요
    duel.insertAdjacentElement("afterend", plate);
    const cap = document.createElement("p");
    cap.className = "bz-cap";
    cap.textContent = CAPTION;
    plate.insertAdjacentElement("afterend", cap);
    return true;
  }

  /* timing.js의 duel을 한 번 부르고, 그 자리에서 만들어진 상자를 꾸며요.
   * duel은 상자를 **동기적으로** 붙이니까 호출 직후에 찾을 수 있어요. */
  function play(container, opts, cb) {
    const host = document.createElement("div");
    host.className = "bz-host";
    container.appendChild(host);
    window.Timing.duel(host, opts, (res) => { host.remove(); cb(res); });
    const box = host.querySelector(".tm-box");
    if (box) decorate(box);
    return host;
  }

  window.RookieBatZone = { play, _t: { decorate, CAPTION, SIDE } };
})();
