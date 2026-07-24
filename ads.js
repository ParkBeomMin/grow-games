/* 광고 모듈 — Google AdSense
 * - 보상형(H5 Games Ads)은 트래픽이 늘 때까지 비활성화 (H5_ADS = false)
 *   → 보상 버튼은 광고 없이 그냥 지급되고, 호출부의 쿨다운(30분)으로 제한돼요.
 * - 디스플레이 배너: 결산 화면(display) + 하단 띠 배너(anchor)
 * - 배너가 채워지지 않으면(미충전/차단) 자리 차지 없이 자동으로 숨겨져요. */
"use strict";

window.Ads = (() => {
  const ADSENSE_CLIENT = "ca-pub-7426857657290789";
  const AD_DISPLAY_SLOT = "8106727861"; // 결산 화면 사각형
  const AD_ANCHOR_SLOT = "5820310026"; // 하단 띠 배너
  const H5_ADS = false; // 보상형 광고 — 트래픽 늘면 true로

  let state = "idle"; // idle | loading | ready | failed
  const queue = [];

  function loadScript() {
    state = "loading";
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    if (H5_ADS) s.dataset.adFrequencyHint = "30s";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.onload = () => {
      window.adsbygoogle = window.adsbygoogle || [];
      if (H5_ADS) {
        window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
        window.adConfig({ preloadAdBreaks: "on", sound: "off" });
      }
      state = "ready";
      flush();
      flushDisplays();
    };
    s.onerror = () => {
      state = "failed";
      flush();
    };
    document.head.appendChild(s);
  }

  function flush() {
    while (queue.length) runRewarded(queue.shift());
  }

  function runRewarded(cb) {
    if (state !== "ready" || typeof window.adBreak !== "function") {
      cb(true, false); // 광고 불가 → 그냥 지급
      return;
    }
    let finished = false;
    const finish = (reward, real) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cb(reward, real);
    };
    // 광고 응답이 아예 없을 때를 대비한 안전장치
    const timer = setTimeout(() => finish(true, false), 10000);
    window.adBreak({
      type: "reward",
      name: "gear_reward",
      beforeReward(showAdFn) { showAdFn(); },
      adViewed() {},
      adDismissed() {},
      adBreakDone(info) {
        const st = info && info.breakStatus;
        if (st === "viewed") finish(true, true);        // 끝까지 시청 → 보상
        else if (st === "dismissed") finish(false, true); // 중간에 닫음 → 보상 없음
        else finish(true, false);                        // 광고 미충전 등 → 그냥 지급
      },
    });
  }

  // cb(보상지급여부, 실제광고여부) — H5 비활성 시 즉시 지급
  function rewarded(cb) {
    if (!H5_ADS || !ADSENSE_CLIENT) { cb(true, false); return; }
    if (state === "ready" || state === "failed") { runRewarded(cb); return; }
    queue.push(cb);
    if (state === "idle") loadScript();
  }

  // 디스플레이 배너 (결산/엔딩 등 콘텐츠 화면 하단 전용)
  const displayQueue = [];
  function flushDisplays() {
    while (displayQueue.length) {
      const el = displayQueue.shift();
      el.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${AD_DISPLAY_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* noop */ }
    }
  }
  function display(el) {
    if (!ADSENSE_CLIENT || !AD_DISPLAY_SLOT || !el || el.dataset.adDone) return;
    el.dataset.adDone = "1";
    displayQueue.push(el);
    if (state === "ready") flushDisplays();
    else if (state === "idle") loadScript();
  }

  // 하단 띠 배너 — 콘텐츠 맨 아래 일반 배치
  // (position:fixed로 화면에 고정하면 애드센스 정책 단속 스크립트가
  //  스크롤 시 광고를 접어버려요. 화면 고정형은 자동 광고의 '앵커'만 공식 지원)
  function anchor() {
    if (!ADSENSE_CLIENT || !AD_ANCHOR_SLOT || document.getElementById("ad-anchor")) return;
    const app = document.getElementById("app");
    if (!app) return;
    const bar = document.createElement("div");
    bar.id = "ad-anchor";
    bar.className = "ad-anchor";
    bar.innerHTML = `
      <ins class="adsbygoogle" style="display:block;width:100%;height:60px"
        data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${AD_ANCHOR_SLOT}"></ins>`;
    app.appendChild(bar);
    const ins = bar.querySelector("ins");
    // 미충전이면 빈 칸이 남지 않게 치워요
    new MutationObserver(() => {
      if (ins.dataset.adStatus === "unfilled") bar.remove();
    }).observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    const push = () => { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* noop */ } };
    if (state === "ready") push();
    else {
      if (state === "idle") loadScript();
      const wait = setInterval(() => {
        if (state === "ready") { clearInterval(wait); push(); }
        else if (state === "failed") { clearInterval(wait); bar.remove(); }
      }, 300);
    }
  }

  // 게임 로드를 방해하지 않게 잠깐 뒤에 하단 배너 준비
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(anchor, 1200));
  } else {
    setTimeout(anchor, 1200);
  }

  return { rewarded, display, anchor, enabled: () => !!ADSENSE_CLIENT };
})();
