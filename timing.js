/* 공용 타이밍 미니게임 — 움직이는 마커를 초록 존에서 멈추세요!
 * Timing.play(container, { label, button, zonePct }, (result) => ...)
 * result: "perfect" | "good" | "miss" · 4번 왕복하도록 안 누르면 자동 miss */
"use strict";

window.Timing = (() => {
  const clampV = (v, a, b) => Math.min(b, Math.max(a, v));

  function play(container, opts, cb) {
    const zone = clampV(opts.zonePct || 25, 8, 45);
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "타이밍을 맞춰요!"}</p>
      <div class="tm-bar">
        <div class="tm-zone"></div>
        <div class="tm-zone-perfect"></div>
        <div class="tm-marker"></div>
      </div>
      <button type="button" class="btn btn-primary tm-btn">${opts.button || "지금!"}</button>`;
    container.appendChild(wrap);

    const zoneEl = wrap.querySelector(".tm-zone");
    const perfEl = wrap.querySelector(".tm-zone-perfect");
    const marker = wrap.querySelector(".tm-marker");
    const perfW = zone * 0.4;
    zoneEl.style.left = `${50 - zone / 2}%`;
    zoneEl.style.width = `${zone}%`;
    perfEl.style.left = `${50 - perfW / 2}%`;
    perfEl.style.width = `${perfW}%`;

    let pos = 0, dir = 1, sweeps = 0, raf = 0, done = false;
    let last = performance.now();

    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      pos += dir * dt * 130; // 130%/초
      if (pos >= 100) { pos = 100; dir = -1; sweeps++; }
      if (pos <= 0) { pos = 0; dir = 1; sweeps++; }
      marker.style.left = `${pos}%`;
      if (sweeps >= 4) { finish(); return; } // 시간 초과 → 자동 miss
      raf = requestAnimationFrame(tick);
    }

    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      let res = "miss";
      if (Math.abs(pos - 50) <= perfW / 2) res = "perfect";
      else if (Math.abs(pos - 50) <= zone / 2) res = "good";
      wrap.querySelector(".tm-btn").disabled = true;
      marker.classList.add(`tm-${res}`);
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 500);
    }

    wrap.querySelector(".tm-btn").onclick = finish;
    raf = requestAnimationFrame(tick);
  }

  return { play };
})();
