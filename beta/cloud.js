/* ☁️ 클라우드 세이브 — 기기 토큰으로 세이브를 서버에 백업하고 여러 기기가 공유해요.
 * 설계: docs/superpowers/specs/2026-07-27-cloud-save-design.md
 *
 * localStorage가 항상 주(主)예요. 서버는 사본이고, 실패하면 조용히 넘어가요.
 * 게임은 Cloud.init(게임) 한 번, 저장할 때 Cloud.touch(), 큰 순간에 Cloud.mark()만 부르면 돼요.
 */
(function () {
  "use strict";

  // 접속 정보는 match.js가 내보내는 걸 씁니다 (키를 두 곳에 두지 않으려고요)
  var CFG = (window.Match && window.Match.cfg) || null;

  var TOKEN_KEY = "grow-cloud-token";
  var PUSH_GAP = 2 * 60 * 1000;   // 2분

  // 게임별 저장 키 (beta/<game>/game.js의 상수와 일치해야 해요)
  var SAVE = {
    rookie: "rookie-save-v1", idol: "trainee-save-v1", stock: "investor-save-v1",
    dev: "devgrow-save-v1", chef: "chef-save-v1", stream: "streamer-save-v1",
    soccer: "winger-save-v1", unicorn: "unicorn-save-v1",
  };
  var BATTLE = {
    rookie: "grow-battle-v1", idol: "grow-battle-idol-v1", stock: "grow-battle-stock-v1",
    dev: "grow-battle-dev-v1", chef: "grow-battle-chef-v1", stream: "grow-battle-stream-v1",
    soccer: "grow-battle-soccer-v1",
  };
  var SHARED_KEY = "grow-hof-v1";   // 8종이 함께 쓰는 명예의 전당
  var SHARED_GAME = "_shared";

  function keysOf(game) {
    var out = [];
    var s = SAVE[game];
    if (!s) return out;
    out.push(s);
    if (game === "unicorn") {
      out.push("unicorn-founded");
    } else {
      out.push(s + "-slots", s + "-legacy");
    }
    if (BATTLE[game]) out.push(BATTLE[game]);
    return out;
  }

  // 128비트 무작위. crypto가 없으면 Math.random으로 떨어져요 (아주 오래된 브라우저)
  // 저장소를 못 읽고 못 쓰면 null을 돌려줘요 — 기기 정체성이 없으면 클라우드는 그냥 쉬어야 해요.
  // "nostorage" 같은 고정값을 주면 서로 다른 기기가 같은 계정으로 겹쳐 써버려요.
  function token() {
    var t = null;
    try { t = localStorage.getItem(TOKEN_KEY); } catch (e) { t = null; }
    if (t) return t;
    var raw = "";
    var gotRandom = false;
    if (window.crypto && window.crypto.getRandomValues) {
      try {
        var a = new Uint8Array(16);
        window.crypto.getRandomValues(a);
        for (var i = 0; i < a.length; i++) raw += ("0" + a[i].toString(16)).slice(-2);
        gotRandom = true;
      } catch (e) { raw = ""; }
    }
    if (!gotRandom) {
      for (var j = 0; j < 4; j++) raw += Math.random().toString(16).slice(2, 10);
    }
    try {
      localStorage.setItem(TOKEN_KEY, raw);
    } catch (e) {
      return null; // 저장이 안 되면 매번 새 토큰이 생기니, 차라리 정체성 없음으로 취급해요
    }
    return raw;
  }

  var isBeta = !!(window.GROW_ENV && window.GROW_ENV.beta);
  var tag = function (game) { return (isBeta ? "beta:" : "") + game; };

  function rpc(fn, body) {
    if (!CFG) return Promise.reject(new Error("Match.cfg 없음"));
    return fetch(CFG.url + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { apikey: CFG.key, Authorization: "Bearer " + CFG.key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).then(function (r) {
      if (!r.ok) throw new Error("rpc " + fn + " " + r.status);
      return r.json();
    });
  }

  function collect(game) {
    var out = {};
    keysOf(game).forEach(function (k) {
      var v = null;
      try { v = localStorage.getItem(k); } catch (e) {}
      if (v !== null) out[k] = v;
    });
    return out;
  }

  function apply(game, obj) {
    keysOf(game).forEach(function (k) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, k)) localStorage.setItem(k, obj[k]);
        else localStorage.removeItem(k);
      } catch (e) {}
    });
  }

  var cur = null;           // 현재 게임 이름
  var lastPush = 0;
  var dirtyKey = function (g) { return "grow-cloud-dirty-" + g; };
  var syncKey = function (g) { return "grow-cloud-synced-" + g; };
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  function push(game) {
    if (!game || !SAVE[game]) return Promise.resolve();
    var tok = token();
    if (!tok) return Promise.resolve(); // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    lastPush = Date.now();
    return rpc("cloud_push", { p_token: tok, p_game: tag(game), p_data: collect(game) })
      .then(function (at) {
        set(syncKey(game), String(at));
        set(dirtyKey(game), "0");
        pushShared();
      })
      .catch(function () { /* 조용히 넘어가요 */ });
  }

  function pushShared() {
    var v = get(SHARED_KEY);
    if (v === null) return;
    var tok = token();
    if (!tok) return; // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    rpc("cloud_push", { p_token: tok, p_game: tag(SHARED_GAME), p_data: { "grow-hof-v1": v } })
      .catch(function () {});
  }

  function touch() {
    if (!cur) return;
    set(dirtyKey(cur), "1");
    if (Date.now() - lastPush > PUSH_GAP) push(cur);
  }

  function mark() { if (cur) push(cur); }

  /* 5.3절 판정 — 기기 시계를 쓰지 않아요.
   * dirty(내가 안 올린 변경이 있나) × 서버가 더 최신인가, 네 갈래예요. */
  function decide(game, serverUpdated) {
    var dirty = get(dirtyKey(game)) === "1";
    var synced = get(syncKey(game));
    var remoteNewer = !!serverUpdated && (!synced || Date.parse(serverUpdated) > Date.parse(synced));
    if (dirty && remoteNewer) return "conflict";
    if (dirty) return "push";
    if (remoteNewer) return "pull";
    return "none";
  }

  function init(game) {
    cur = game;
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && get(dirtyKey(game)) === "1") push(game);
    });
    // 타이틀 진입 시 서버 상태만 가볍게 확인해요
    rpc("cloud_meta", { p_token: token() }).then(function (rows) {
      var mine = null;
      (rows || []).forEach(function (r) { if (r.game === tag(game)) mine = r.updated; });
      var act = decide(game, mine);
      if (act === "push") push(game);
      else if (act === "pull") pullAndApply(game);
      else if (act === "conflict") window.Cloud.onConflict(game, mine);
    }).catch(function () {});
  }

  function pullAndApply(game) {
    return rpc("cloud_pull", { p_token: token(), p_game: tag(game) }).then(function (rows) {
      if (!rows || !rows.length) return;
      apply(game, rows[0].data);
      set(syncKey(game), String(rows[0].updated));
      set(dirtyKey(game), "0");
      toast("☁️ 다른 기기 기록을 불러왔어요");
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function () {});
  }

  // 충돌 화면은 Task 4에서 채워요. 그전까지는 아무것도 안 해요.
  function onConflict() {}
  function toast(msg) { if (window.Cloud._toast) window.Cloud._toast(msg); }

  window.Cloud = { init: init, touch: touch, mark: mark, onConflict: onConflict, _pull: pullAndApply };
  window.Cloud._t = { token: token, keysOf: keysOf, collect: collect, apply: apply, rpc: rpc, tag: tag, decide: decide };
})();
