/* 광고 모듈 — Google H5 Games Ads (Ad Placement API)
 * ADSENSE_CLIENT에 애드센스 게시자 ID(ca-pub-…)를 넣으면 활성화돼요.
 * 보상형 광고는 애드센스 계정에서 H5 Games Ads 프로그램 사용 설정이 필요해요.
 * 비어 있거나 광고 로드 실패 시엔 보상을 그냥 지급하는 폴백 모드로 동작해요. */
"use strict";

window.Ads = (() => {
  const ADSENSE_CLIENT = ""; // 예: "ca-pub-1234567890123456"

  let ready = false;
  if (ADSENSE_CLIENT) {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.dataset.adFrequencyHint = "30s";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
    window.adConfig({ preloadAdBreaks: "on", sound: "off" });
    ready = true;
  }

  // 보상형 광고 — cb(보상지급여부, 실제광고여부)
  function rewarded(cb) {
    if (!ready || typeof window.adBreak !== "function") {
      cb(true, false); // 폴백: 광고 없이 지급
      return;
    }
    let viewed = false;
    window.adBreak({
      type: "reward",
      name: "gear_reward",
      beforeReward(showAdFn) { showAdFn(); },
      adViewed() { viewed = true; },
      adDismissed() { viewed = false; },
      adBreakDone() { cb(viewed, true); },
    });
  }

  return { rewarded, enabled: () => ready };
})();
