/* 공용 얼굴 아바타 모듈 — 사진 업로드 → 원형 크롭
 * 모든 처리는 브라우저 안에서만 일어나고, 사진은 게임 저장(localStorage) 외 어디에도 전송되지 않아요. */
"use strict";

window.Avatar = (() => {
  const EDIT = 260; // 편집 캔버스 한 변
  const OUT = 256;  // 저장 해상도

  let data = null;  // 크롭 완료된 정사각 dataURL
  let slotEl = null;

  // ---- 등록 화면 슬롯 (버튼 + 미리보기) ----
  function mount(slotId) {
    slotEl = document.getElementById(slotId);
    if (!slotEl) return;
    slotEl.innerHTML = `
      <div class="av-row">
        <button type="button" class="btn btn-ghost av-btn" id="av-btn">📷 내 얼굴로 플레이 (선택)</button>
        <div class="av-preview hidden" id="av-preview">
          <img id="av-preview-img" alt="아바타 미리보기" />
          <button type="button" class="av-clear" id="av-clear" title="사진 삭제">✖</button>
        </div>
      </div>
      <p class="av-note">사진은 이 브라우저에만 저장되고 어디에도 전송되지 않아요</p>
      <input type="file" id="av-file" accept="image/*" class="hidden" />`;
    document.getElementById("av-btn").onclick = () => document.getElementById("av-file").click();
    document.getElementById("av-clear").onclick = () => { data = null; renderSlot(); };
    document.getElementById("av-file").onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); openEditor(img); };
      img.onerror = () => { URL.revokeObjectURL(url); alert("이미지를 불러오지 못했어요 😢"); };
      img.src = url;
    };
    renderSlot();
  }

  function renderSlot() {
    if (!slotEl) return;
    const prev = document.getElementById("av-preview");
    const btn = document.getElementById("av-btn");
    if (data) {
      document.getElementById("av-preview-img").src = data;
      prev.classList.remove("hidden");
      btn.textContent = "📷 사진 바꾸기";
    } else {
      prev.classList.add("hidden");
      btn.textContent = "📷 내 얼굴로 플레이 (선택)";
    }
  }

  // ---- 크롭 편집기 ----
  function openEditor(img) {
    const old = document.getElementById("av-overlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.className = "av-overlay";
    overlay.id = "av-overlay";
    overlay.innerHTML = `
      <div class="av-modal">
        <p class="av-title">원 안에 얼굴을 맞춰주세요</p>
        <canvas id="av-canvas" width="${EDIT}" height="${EDIT}"></canvas>
        <input type="range" id="av-zoom" min="100" max="300" value="100" aria-label="확대" />
        <div class="av-actions">
          <button type="button" class="btn btn-ghost" id="av-cancel">취소</button>
          <button type="button" class="btn btn-primary" id="av-ok">이 얼굴로 확정</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const canvas = document.getElementById("av-canvas");
    const ctx = canvas.getContext("2d");
    const base = EDIT / Math.min(img.width, img.height); // 짧은 변이 캔버스를 꽉 채우는 배율
    let zoom = 1;
    // 중앙 정렬로 시작
    let ox = (EDIT - img.width * base) / 2;
    let oy = (EDIT - img.height * base) / 2;

    const scale = () => base * zoom;
    function clampOffsets() {
      ox = Math.min(0, Math.max(EDIT - img.width * scale(), ox));
      oy = Math.min(0, Math.max(EDIT - img.height * scale(), oy));
    }

    function draw() {
      clampOffsets();
      ctx.clearRect(0, 0, EDIT, EDIT);
      ctx.drawImage(img, ox, oy, img.width * scale(), img.height * scale());
      // 원형 밖 어둡게
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, EDIT, EDIT);
      ctx.arc(EDIT / 2, EDIT / 2, EDIT / 2 - 2, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fill("evenodd");
      ctx.restore();
      ctx.beginPath();
      ctx.arc(EDIT / 2, EDIT / 2, EDIT / 2 - 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 드래그 이동
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener("pointerdown", (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      ox += e.clientX - lastX;
      oy += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      draw();
    });
    canvas.addEventListener("pointerup", () => { dragging = false; });

    // 줌 (캔버스 중심 기준)
    document.getElementById("av-zoom").oninput = (e) => {
      const nz = e.target.value / 100;
      const c = EDIT / 2;
      ox = c - ((c - ox) / zoom) * nz;
      oy = c - ((c - oy) / zoom) * nz;
      zoom = nz;
      draw();
    };

    document.getElementById("av-cancel").onclick = () => overlay.remove();
    document.getElementById("av-ok").onclick = () => {
      const out = document.createElement("canvas");
      out.width = OUT; out.height = OUT;
      const octx = out.getContext("2d");
      const k = OUT / EDIT;
      octx.drawImage(img, ox * k, oy * k, img.width * scale() * k, img.height * scale() * k);
      data = out.toDataURL("image/jpeg", 0.85);
      overlay.remove();
      renderSlot();
    };

    draw();
  }

  return {
    mount,
    get: () => data,
    set: (d) => { data = d || null; renderSlot(); },
  };
})();
