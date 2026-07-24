/* 광고 모듈 — Google H5 Games Ads (Ad Placement API)
 * 스크립트는 유저가 보상형 광고 버튼을 눌렀을 때만 지연 로드해요.
 * (페이지 로드 시 로드하면 애드센스 '자동 광고'가 상단 배너를 끼워넣어 게임을 방해)
 * 광고 미로드/미충전 시엔 보상을 그냥 지급하는 폴백으로 동작해요. */
"use strict";

window.Ads = (() => {
  const ADSENSE_CLIENT = "ca-pub-7426857657290789";
  // 애드센스에서 '디스플레이 광고 단위'를 만들고 슬롯 번호를 넣으면
  // 결산/엔딩 화면 하단에 배너가 표시돼요. 비워두면 아무것도 안 나와요.
  const AD_DISPLAY_SLOT = "8106727861";

  let state = "idle"; // idle | loading | ready | failed
  const queue = [];

  function loadScript() {
    state = "loading";
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.dataset.adFrequencyHint = "30s";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.onload = () => {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
      window.adConfig({ preloadAdBreaks: "on", sound: "off" });
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
    let viewed = false;
    window.adBreak({
      type: "reward",
      name: "gear_reward",
      beforeReward(showAdFn) { showAdFn(); },
      adViewed() { viewed = true; },
      adDismissed() { viewed = false; },
      adBreakDone(info) {
        const st = info && info.breakStatus;
        if (st === "viewed") finish(true, true);        // 끝까지 시청 → 보상
        else if (st === "dismissed") finish(false, true); // 중간에 닫음 → 보상 없음
        else finish(true, false);                        // 광고 미충전 등 → 그냥 지급
      },
    });
  }

  // cb(보상지급여부, 실제광고여부)
  function rewarded(cb) {
    if (!ADSENSE_CLIENT) { cb(true, false); return; }
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

  return { rewarded, display, enabled: () => !!ADSENSE_CLIENT };
})();
