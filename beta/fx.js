/* 축하 연출 — 각성 성공·우승·수상처럼 기뻐할 순간에 쓰는 공용 효과 모듈.
 *
 *   Fx.confetti()                 // 기본 색종이
 *   Fx.confetti({ level: "big" }) // 더 화려하게 (초월·우승·엔딩)
 *   Fx.burst(el, "✨")            // 특정 요소에서 터지는 이모지
 *   Fx.flash("🌠 초월 성공!")      // 화면 중앙 큰 문구
 *
 * · 순수 DOM/CSS라 의존성이 없고, 끝나면 스스로 정리해요.
 * · prefers-reduced-motion 을 켠 사용자에겐 애니메이션을 생략합니다. */
"use strict";

window.Fx = (() => {
  const reduced = () => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  };

  let styled = false;
  function ensureStyle() {
    if (styled) return;
    styled = true;
    const css = document.createElement("style");
    css.textContent = `
      .fx-layer { position: fixed; inset: 0; pointer-events: none; z-index: 90; overflow: hidden; }
      .fx-piece { position: absolute; will-change: transform, opacity; }
      @keyframes fxFall {
        from { transform: translate3d(0,-12vh,0) rotate(0deg); opacity: 1; }
        to   { transform: translate3d(var(--dx,0), 112vh, 0) rotate(var(--rot,540deg)); opacity: .9; }
      }
      @keyframes fxPop {
        0%   { transform: translate(-50%,-50%) scale(.3); opacity: 0; }
        35%  { transform: translate(-50%,-50%) scale(1.12); opacity: 1; }
        75%  { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%,-90%) scale(.96); opacity: 0; }
      }
      @keyframes fxOut {
        from { transform: translate(-50%,-50%) translate(0,0) scale(1); opacity: 1; }
        to   { transform: translate(-50%,-50%) translate(var(--bx,0), var(--by,0)) scale(.4); opacity: 0; }
      }
      .fx-flash {
        position: fixed; left: 50%; top: 42%; z-index: 91; pointer-events: none;
        font-family: "Jua", sans-serif; font-size: 1.9rem; text-align: center; white-space: pre-line;
        color: #fff; text-shadow: 0 0 18px rgba(255,220,120,.9), 0 4px 10px rgba(0,0,0,.6);
        animation: fxPop 1.5s ease-out forwards;
      }
    `;
    document.head.appendChild(css);
  }

  function layer(life) {
    ensureStyle();
    const el = document.createElement("div");
    el.className = "fx-layer";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), life);
    return el;
  }

  const COLORS = ["#ffd166", "#ef6351", "#7fd1e8", "#6ee7a0", "#c9aaff", "#f6efe0"];

  // 색종이가 위에서 쏟아져요
  function confetti(opt) {
    const o = opt || {};
    if (reduced()) return;
    const big = o.level === "big";
    const n = o.count || (big ? 90 : 45);
    const life = big ? 3400 : 2600;
    const box = layer(life);
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "fx-piece";
      const emo = o.emojis && o.emojis.length ? o.emojis[i % o.emojis.length] : null;
      if (emo) {
        p.textContent = emo;
        p.style.fontSize = (14 + Math.random() * 16) + "px";
      } else {
        const w = 6 + Math.random() * 6;
        p.style.width = w + "px";
        p.style.height = (w * (0.5 + Math.random())) + "px";
        p.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
        p.style.borderRadius = Math.random() < 0.35 ? "50%" : "2px";
      }
      p.style.left = Math.random() * 100 + "vw";
      p.style.top = "0";
      p.style.setProperty("--dx", (Math.random() * 40 - 20) + "vw");
      p.style.setProperty("--rot", (Math.random() * 1080 - 540) + "deg");
      const dur = (big ? 1.9 : 1.6) + Math.random() * 1.2;
      p.style.animation = `fxFall ${dur}s cubic-bezier(.25,.6,.5,1) ${Math.random() * 0.5}s forwards`;
      box.appendChild(p);
    }
  }

  // 특정 요소(없으면 화면 중앙)에서 이모지가 사방으로 터져요
  function burst(target, emoji, count) {
    if (reduced()) return;
    const n = count || 12;
    const box = layer(1200);
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    try {
      const r = (typeof target === "string" ? document.querySelector(target) : target);
      if (r && r.getBoundingClientRect) {
        const b = r.getBoundingClientRect();
        if (b.width || b.height) { cx = b.left + b.width / 2; cy = b.top + b.height / 2; }
      }
    } catch { /* 중앙 사용 */ }
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "fx-piece";
      p.textContent = emoji || "✨";
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      p.style.fontSize = (16 + Math.random() * 14) + "px";
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = 70 + Math.random() * 90;
      p.style.setProperty("--bx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--by", Math.sin(ang) * dist + "px");
      p.style.animation = `fxOut ${0.7 + Math.random() * 0.4}s ease-out forwards`;
      box.appendChild(p);
    }
  }

  // 화면 중앙에 큰 문구
  function flash(text) {
    if (reduced() || !text) return;
    ensureStyle();
    const el = document.createElement("div");
    el.className = "fx-flash";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  // 자주 쓰는 조합
  function celebrate(kind, text, target) {
    switch (kind) {
      case "awaken":                                  // 재능 각성 성공
        confetti({ emojis: ["⭐", "✨"], count: 40 });
        burst(target, "⭐", 12); break;
      case "transcend":                               // 초월 각성 성공
        confetti({ level: "big", emojis: ["✨", "🌠", "⭐"] });
        burst(target, "🌠", 16); break;
      case "champion":                                // 우승
        confetti({ level: "big" });
        burst(target, "🏆", 14); break;
      case "award":                                   // 수상(MVP 등)
        confetti({ emojis: ["🎖️", "✨"], count: 50 }); break;
      case "ending":                                  // 엔딩·최종 달성
        confetti({ level: "big", emojis: ["👑", "🎉", "✨"] }); break;
      default:
        confetti();
    }
    if (text) flash(text);
  }

  return { confetti, burst, flash, celebrate };
})();
