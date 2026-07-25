/* 환경 감지 + 베타 격리
 * - /beta/ 경로에서 실행되면 '베타'로 인식해요.
 * - 베타에서는 localStorage를 'beta::' 네임스페이스로 격리하고(저장·로컬 명전·PWA·방문 기록 등),
 *   Supabase/GA 원격 기록은 match.js·stats.js가 GROW_ENV.beta를 보고 끄기 때문에
 *   상용 명예의 전당·통계를 오염시키지 않아요.
 * - 이 스크립트는 다른 스크립트보다 먼저 로드해야 해요(게임 스크립트가 localStorage를 읽기 전).
 */
(function () {
  "use strict";
  var isBeta = location.pathname.indexOf("/beta/") !== -1;
  window.GROW_ENV = { beta: isBeta };
  if (!isBeta) return;

  // ---- localStorage 격리 (베타 전용 네임스페이스) ----
  try {
    var real = window.localStorage;
    var P = "beta::";
    var betaKeys = function () {
      return Object.keys(real).filter(function (k) { return k.indexOf(P) === 0; });
    };
    var wrap = {
      getItem: function (k) { return real.getItem(P + k); },
      setItem: function (k, v) { return real.setItem(P + k, v); },
      removeItem: function (k) { return real.removeItem(P + k); },
      clear: function () { betaKeys().forEach(function (k) { real.removeItem(k); }); },
      key: function (i) { var ks = betaKeys(); return ks[i] ? ks[i].slice(P.length) : null; },
    };
    Object.defineProperty(wrap, "length", { get: function () { return betaKeys().length; } });
    Object.defineProperty(window, "localStorage", { value: wrap, configurable: true });
  } catch (e) { /* 격리 실패해도 게임은 동작 */ }

  // ---- 베타 배지 ----
  function badge() {
    if (document.getElementById("beta-badge")) return;
    var el = document.createElement("div");
    el.id = "beta-badge";
    el.textContent = "🧪 BETA";
    el.style.cssText =
      "position:fixed;left:8px;bottom:8px;z-index:99999;background:#ff5c8a;color:#fff;" +
      "font:700 11px/1 system-ui,sans-serif;letter-spacing:.5px;padding:6px 10px;border-radius:99px;" +
      "box-shadow:0 2px 8px rgba(0,0,0,.45);pointer-events:none;";
    document.body.appendChild(el);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", badge);
  } else {
    badge();
  }
})();
