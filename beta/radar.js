/* 공용 스탯 레이더 차트 (캔버스) — Radar.draw(canvas, defs, stats, opts) */
"use strict";

window.Radar = (() => {
  function draw(canvas, defs, stats, opts = {}) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 36;
    const n = defs.length;
    const max = opts.max || 60;
    ctx.clearRect(0, 0, W, H);
    const pt = (i, r) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    // 그리드
    ctx.strokeStyle = opts.grid || "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    for (let g = 1; g <= 3; g++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const [x, y] = pt(i % n, (R * g) / 3);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const [x, y] = pt(i, R);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // 값 폴리곤
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const d = defs[i % n];
      const v = Math.min((stats[d.key] || 0) / max, 1);
      const [x, y] = pt(i % n, R * Math.max(v, 0.06));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.fillStyle = opts.fill || "rgba(127, 209, 232, 0.32)";
    ctx.strokeStyle = opts.stroke || "#7fd1e8";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    // 라벨
    ctx.fillStyle = opts.label || "#f0ead8";
    ctx.font = "12px 'Gowun Dodum', sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, R + 20);
      const d = defs[i];
      ctx.fillText(`${d.emoji} ${d.name} ${Math.round(stats[d.key] || 0)}`, x, y + 4);
    }
  }
  return { draw };
})();
