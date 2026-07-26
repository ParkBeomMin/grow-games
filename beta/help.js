/* ❓ 공용 도움말 모달 — match.js·fx.js처럼 전역으로 노출해요.
 * base.css의 .av-overlay / .av-modal 스타일을 그대로 재사용해요.
 *
 *   Help.open("⚾ 더 루키 도움말", [
 *     { emoji: "🏋️", title: "훈련과 컨디션", body: "매달 훈련이나 휴식을 골라요.\n컨디션이 낮으면 부상 위험이 커져요." },
 *   ]);
 */
(function () {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const nl = (s) => esc(s).replace(/\n/g, "<br>");

  function open(title, sections) {
    // 이미 열려 있으면 겹쳐 열지 않아요.
    if (document.querySelector(".help-overlay")) return;

    const ov = document.createElement("div");
    ov.className = "av-overlay help-overlay";
    ov.innerHTML = `
      <div class="av-modal help-modal">
        <p class="av-title">${esc(title)}</p>
        <div class="help-body">${(sections || []).map((s) => `
          <section class="help-sec">
            <h4>${esc(s.emoji)} ${esc(s.title)}</h4>
            <p>${nl(s.body)}</p>
          </section>`).join("")}</div>
        <div class="av-actions"><button class="btn btn-ghost help-close">닫기</button></div>
      </div>`;

    const close = () => ov.remove();
    const btn = ov.querySelector(".help-close");
    if (btn) btn.onclick = close;
    // 모달 바깥을 눌러도 닫혀요.
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    document.body.appendChild(ov);
  }

  window.Help = { open };
})();
