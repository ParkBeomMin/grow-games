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

  // 연타 — duration 동안 target회 이상 탭
  function mash(container, opts, cb) {
    const target = Math.max(6, opts.target || 15);
    const dur = opts.duration || 3000;
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "연타!"}</p>
      <div class="tm-bar"><div class="tm-mash-fill"></div></div>
      <button type="button" class="btn btn-primary tm-btn tm-mash-btn">${opts.button || "탭! 👊"} <span class="tm-count">0</span>/${target}</button>`;
    container.appendChild(wrap);
    const fill = wrap.querySelector(".tm-mash-fill");
    const cnt = wrap.querySelector(".tm-count");
    let count = 0, done = false;
    wrap.querySelector(".tm-btn").onclick = () => {
      if (done) return;
      count++;
      cnt.textContent = count;
      fill.style.width = `${Math.min(100, (count / target) * 100)}%`;
    };
    setTimeout(() => {
      if (done) return;
      done = true;
      let res = "miss";
      if (count >= Math.round(target * 1.35)) res = "perfect";
      else if (count >= target) res = "good";
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 500);
    }, dur);
  }

  // 수 싸움 — 3택 중 함정을 피하면 성공, 최적 선택이면 퍼펙트. 6초 내 미선택 시 실패
  function duel(container, opts, cb) {
    const choices = opts.choices || ["몸쪽", "가운데", "바깥쪽"];
    const trap = Math.floor(Math.random() * choices.length);
    let best = Math.floor(Math.random() * choices.length);
    if (best === trap) best = (best + 1) % choices.length;
    const hint = Math.random() < (opts.hintChance || 0);
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "수 싸움!"}</p>
      <p class="tm-hint">${hint ? `👀 낌새가 보인다… <b>${choices[trap]}</b>은(는) 함정이야!` : "🫣 아무 낌새도 없다. 감으로 승부!"}</p>
      <div class="tm-duel">${choices.map((c, i) => `<button type="button" class="btn btn-ghost tm-btn tm-duel-btn" data-i="${i}">${c}</button>`).join("")}</div>`;
    container.appendChild(wrap);
    let done = false;
    const finish = (res) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 500);
    };
    const timer = setTimeout(() => finish("miss"), 6000);
    wrap.querySelectorAll(".tm-duel-btn").forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.i;
        finish(i === trap ? "miss" : i === best ? "perfect" : "good");
      };
    });
  }

  return { play, mash, duel };
})();
