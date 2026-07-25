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

  // 홀드 — 꾹 눌러 게이지를 채우다가 초록 존에서 손을 떼세요. 끝까지 차면 실패!
  function hold(container, opts, cb) {
    const zone = clampV(opts.zonePct || 25, 8, 45);
    const center = 62 + Math.random() * 16; // 존 위치는 매번 조금씩 달라요
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "꾹 눌러 힘을 모으고, 초록 존에서 떼세요!"}</p>
      <div class="tm-bar">
        <div class="tm-zone"></div>
        <div class="tm-zone-perfect"></div>
        <div class="tm-fill"></div>
      </div>
      <button type="button" class="btn btn-primary tm-btn tm-hold-btn">${opts.button || "꾹 누르기 💪"}</button>`;
    container.appendChild(wrap);
    const zoneEl = wrap.querySelector(".tm-zone");
    const perfEl = wrap.querySelector(".tm-zone-perfect");
    const fill = wrap.querySelector(".tm-fill");
    const btn = wrap.querySelector(".tm-btn");
    const perfW = zone * 0.4;
    zoneEl.style.left = `${center - zone / 2}%`;
    zoneEl.style.width = `${zone}%`;
    perfEl.style.left = `${center - perfW / 2}%`;
    perfEl.style.width = `${perfW}%`;

    let pos = 0, raf = 0, holding = false, done = false, last = 0;
    const idleTimer = setTimeout(() => finish(), 5000); // 안 누르면 자동 miss

    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      pos += dt * 62; // 62%/초 — 풀게이지까지 약 1.6초
      fill.style.width = `${Math.min(pos, 100)}%`;
      if (pos >= 100) { finish(); return; } // 넘치면 miss
      raf = requestAnimationFrame(tick);
    }
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(idleTimer);
      cancelAnimationFrame(raf);
      let res = "miss";
      if (Math.abs(pos - center) <= perfW / 2) res = "perfect";
      else if (Math.abs(pos - center) <= zone / 2) res = "good";
      btn.disabled = true;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 500);
    }
    const start = (e) => {
      if (holding || done) return;
      e.preventDefault();
      holding = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", () => { if (holding) finish(); });
    btn.addEventListener("pointercancel", () => { if (holding) finish(); });
  }

  // 순서 기억 — 잠깐 보여준 순서를 그대로 탭하세요 (실수 1번까지는 good)
  function sequence(container, opts, cb) {
    const icons = opts.icons || ["⚾", "🧢", "🧤", "🏏"];
    const seq = Array.from({ length: 3 }, () => icons[Math.floor(Math.random() * icons.length)]);
    const showMs = clampV(opts.showMs || 1100, 700, 2200);
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "순서를 기억했다가 그대로!"}</p>
      <div class="tm-seq-show">${seq.join(" ")}</div>
      <div class="tm-duel">${icons.map((c, i) => `<button type="button" class="btn btn-ghost tm-btn tm-seq-btn" data-i="${i}" disabled>${c}</button>`).join("")}</div>`;
    container.appendChild(wrap);
    const showEl = wrap.querySelector(".tm-seq-show");
    const btns = wrap.querySelectorAll(".tm-seq-btn");
    let step = 0, mistakes = 0, done = false, timer = null;
    const finish = (res) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 500);
    };
    setTimeout(() => {
      if (done) return;
      showEl.textContent = "❓ ❓ ❓";
      btns.forEach((b) => (b.disabled = false));
      timer = setTimeout(() => finish("miss"), 5000); // 시간 초과
      btns.forEach((b) => {
        b.onclick = () => {
          if (done) return;
          if (icons[+b.dataset.i] === seq[step]) {
            step += 1;
            showEl.textContent = seq.map((s, i) => (i < step ? s : "❓")).join(" ");
            if (step === seq.length) finish(mistakes === 0 ? "perfect" : "good");
          } else {
            mistakes += 1;
            b.classList.add("tm-seq-wrong");
            setTimeout(() => b.classList.remove("tm-seq-wrong"), 300);
            if (mistakes >= 2) finish("miss");
          }
        };
      });
    }, showMs);
  }

  // 반응 속도 — 신호가 켜지는 순간 최대한 빨리! 미리 누르면 실패
  function reaction(container, opts, cb) {
    const perfectMs = opts.perfectMs || 400;
    const goodMs = opts.goodMs || 850;
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "신호가 켜지면 곧바로 누르세요!"}</p>
      <button type="button" class="btn btn-primary tm-btn tm-react-btn tm-react-wait">🚦 기다려…</button>`;
    container.appendChild(wrap);
    const btn = wrap.querySelector(".tm-btn");
    let goAt = 0, done = false, goTimer = null, outTimer = null;
    const finish = (res) => {
      if (done) return;
      done = true;
      clearTimeout(goTimer);
      clearTimeout(outTimer);
      btn.disabled = true;
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 500);
    };
    goTimer = setTimeout(() => {
      goAt = performance.now();
      btn.classList.remove("tm-react-wait");
      btn.classList.add("tm-react-go");
      btn.textContent = opts.button || "지금!! ⚡";
      outTimer = setTimeout(() => finish("miss"), 2000);
    }, 900 + Math.random() * 1700);
    btn.onclick = () => {
      if (done) return;
      if (!goAt) { finish("miss"); return; } // 너무 성급했다!
      const dt = performance.now() - goAt;
      finish(dt <= perfectMs ? "perfect" : dt <= goodMs ? "good" : "miss");
    };
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

  // 조준 탭 — 튀어나오는 타겟을 순서대로 빠르게 탭 (반응·순발력)
  function target(container, opts, cb) {
    const total = clampV(opts.count || 3, 2, 6);
    const life = clampV(opts.lifeMs || 850, 450, 1600);
    const icon = opts.icon || "🎯";
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "튀어나오는 타겟을 빠르게 탭!"}</p>
      <div class="tm-field"></div>`;
    container.appendChild(wrap);
    const field = wrap.querySelector(".tm-field");
    let idx = 0, hits = 0, fast = 0, done = false, curTimer = null, shownAt = 0;
    const need = Math.ceil(total * 0.6);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(curTimer);
      const res = (hits >= total && fast >= need) ? "perfect" : (hits >= need) ? "good" : "miss";
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 450);
    }
    function spawn() {
      if (done) return;
      if (idx >= total) { finish(); return; }
      idx++;
      const t = document.createElement("button");
      t.type = "button";
      t.className = "tm-target";
      t.textContent = icon;
      t.style.left = `${8 + Math.random() * 74}%`;
      t.style.top = `${12 + Math.random() * 62}%`;
      field.appendChild(t);
      shownAt = performance.now();
      t.onclick = () => {
        if (done || t.disabled) return;
        t.disabled = true;
        hits += 1;
        if (performance.now() - shownAt <= life * 0.55) fast += 1;
        t.classList.add("tm-target-hit");
        clearTimeout(curTimer);
        setTimeout(() => t.remove(), 120);
        spawn();
      };
      curTimer = setTimeout(() => {
        t.classList.add("tm-target-miss");
        setTimeout(() => t.remove(), 160);
        spawn();
      }, life);
    }
    spawn();
  }

  // 낙하 캐치 — 떨어지는 물체가 초록 존에 왔을 때 딱 잡으세요 (타이밍)
  function drop(container, opts, cb) {
    const zone = clampV(opts.zonePct || 22, 10, 40);
    const center = 66;
    const icon = opts.icon || "⚽";
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "떨어지는 순간, 초록 존에서 딱 잡으세요!"}</p>
      <div class="tm-drop">
        <div class="tm-drop-band"></div>
        <div class="tm-drop-perfect"></div>
        <div class="tm-drop-icon">${icon}</div>
      </div>
      <button type="button" class="btn btn-primary tm-btn">${opts.button || "잡기! ✋"}</button>`;
    container.appendChild(wrap);
    const band = wrap.querySelector(".tm-drop-band");
    const perf = wrap.querySelector(".tm-drop-perfect");
    const ic = wrap.querySelector(".tm-drop-icon");
    const btn = wrap.querySelector(".tm-btn");
    const perfW = zone * 0.4;
    band.style.top = `${center - zone / 2}%`;
    band.style.height = `${zone}%`;
    perf.style.top = `${center - perfW / 2}%`;
    perf.style.height = `${perfW}%`;
    let pos = 0, raf = 0, done = false, last = performance.now();
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      pos += dt * 52; // 약 1.9초에 바닥
      ic.style.top = `${Math.min(pos, 100)}%`;
      if (pos >= 100) { finish(); return; }
      raf = requestAnimationFrame(tick);
    }
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      btn.disabled = true;
      let res = "miss";
      if (Math.abs(pos - center) <= perfW / 2) res = "perfect";
      else if (Math.abs(pos - center) <= zone / 2) res = "good";
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 450);
    }
    btn.onclick = finish;
    raf = requestAnimationFrame(tick);
  }

  // 다른 그림 찾기 — 여러 개 중 다른 하나를 빠르게 찾아 탭 (집중·판단)
  function odd(container, opts, cb) {
    const rounds = clampV(opts.rounds || 2, 1, 4);
    const sets = opts.sets || [["🟢", "🟩"], ["🔵", "🟦"], ["🟡", "🟨"]];
    const grid = clampV(opts.grid || 9, 4, 12);
    const wrap = document.createElement("div");
    wrap.className = "tm-box";
    wrap.innerHTML = `
      <p class="tm-label">${opts.label || "다른 하나를 빠르게 찾아 탭!"}</p>
      <div class="tm-odd"></div>`;
    container.appendChild(wrap);
    const box = wrap.querySelector(".tm-odd");
    let round = 0, correct = 0, fast = 0, done = false, timer = null, shownAt = 0;
    const need = Math.ceil(rounds * 0.6);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const res = (correct >= rounds && fast >= need) ? "perfect" : (correct >= need) ? "good" : "miss";
      wrap.classList.add(`tm-done-${res}`);
      setTimeout(() => { wrap.remove(); cb(res); }, 450);
    }
    function nextRound() {
      if (done) return;
      if (round >= rounds) { finish(); return; }
      round += 1;
      box.innerHTML = "";
      const pair = sets[Math.floor(Math.random() * sets.length)];
      const base = pair[0], oddIcon = pair[1];
      const oddCell = Math.floor(Math.random() * grid);
      shownAt = performance.now();
      for (let i = 0; i < grid; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tm-odd-cell";
        b.textContent = i === oddCell ? oddIcon : base;
        b.onclick = () => {
          if (done) return;
          if (i === oddCell) {
            correct += 1;
            if (performance.now() - shownAt <= 1500) fast += 1;
            b.classList.add("tm-odd-hit");
            nextRound();
          } else {
            b.classList.add("tm-seq-wrong");
            finish();
          }
        };
        box.appendChild(b);
      }
      clearTimeout(timer);
      timer = setTimeout(() => finish(), 4000);
    }
    nextRound();
  }

  return { play, hold, sequence, reaction, duel, target, drop, odd };
})();
