/* 공용 스탯 레이더 차트 (캔버스) — Radar.draw(canvas, defs, stats, opts) */
"use strict";

window.Radar = (() => {
  function draw(canvas, defs, stats, opts = {}) {
    /* ⚠️ 2d 컨텍스트를 못 얻는 환경이 있어요(캔버스가 없는 jsdom 등).
     * 여기서 안 막으면 **부르는 쪽 화면이 통째로 안 그려져요** — 준비 화면이
     * 레이더 한 줄 때문에 죽었습니다. 못 그리면 조용히 넘어가요. */
    const ctx = canvas && canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;
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
    /* 라벨 — **캔버스 밖으로 나가면 그냥 잘려요.**
     * 가운데 정렬로 꼭짓점에 얹으면 좌우 끝 라벨의 절반이 밖으로 나갑니다
     * (240 캔버스에서 "🫀 체력 120"이 x=-28부터 시작했어요 · 제보).
     * 가운데에 두려 하되 **가장자리에서는 안쪽으로 밀어** 넣어요. */
    ctx.fillStyle = opts.label || "#f0ead8";
    ctx.font = "12px 'Gowun Dodum', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const PAD = 2;
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, R + 18);
      const d = defs[i];
      const txt = `${d.emoji} ${d.name} ${Math.round(stats[d.key] || 0)}`;
      // measureText가 없는 환경도 있어요 — 없으면 대충 재서 그래도 안쪽으로 밀어요
      const wpx = ((ctx.measureText && ctx.measureText(txt)) || {}).width || txt.length * 9;
      const tx = Math.min(Math.max(x - wpx / 2, PAD), Math.max(PAD, W - wpx - PAD));
      const ty = Math.min(Math.max(y, 8), H - 8);
      ctx.fillText(txt, tx, ty);
    }
  }
  return { draw };
})();
