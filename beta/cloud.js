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
    var tok = token();
    if (!tok) return; // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    rpc("cloud_meta", { p_token: tok }).then(function (rows) {
      var mine = null;
      (rows || []).forEach(function (r) { if (r.game === tag(game)) mine = r.updated; });
      var act = decide(game, mine);
      if (act === "push") push(game);
      else if (act === "pull") pullAndApply(game);
      else if (act === "conflict") window.Cloud.onConflict(game, mine);
    }).catch(function () {});
  }

  function pullAndApply(game) {
    var tok = token();
    if (!tok) return Promise.resolve(); // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    return rpc("cloud_pull", { p_token: tok, p_game: tag(game) }).then(function (rows) {
      if (!rows || !rows.length) return;
      apply(game, rows[0].data);
      set(syncKey(game), String(rows[0].updated));
      set(dirtyKey(game), "0");
      toast("☁️ 다른 기기 기록을 불러왔어요");
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function () {});
  }

  function toast(msg) { if (window.Cloud._toast) window.Cloud._toast(msg); }

  var esc = function (s) { return String(s).replace(/[&<>]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };

  function _toast(msg, ms) {
    var old = document.querySelector(".cloud-toast");
    if (old) old.remove();
    var el = document.createElement("div");
    el.className = "cloud-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, ms || 1800);
  }

  function closeModal() {
    var ov = document.querySelector(".cloud-overlay");
    if (ov) ov.remove();
  }

  function shell(inner) {
    closeModal();
    var ov = document.createElement("div");
    ov.className = "av-overlay cloud-overlay";
    ov.innerHTML = '<div class="av-modal cloud-modal">' + inner +
      '<div class="av-actions"><button class="btn btn-ghost cloud-close">닫기</button></div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeModal(); });
    document.body.appendChild(ov);
    ov.querySelector(".cloud-close").onclick = closeModal;
    return ov;
  }

  function openModal() {
    var issued = get("grow-cloud-issued") === "1";
    var ov = shell(
      '<p class="av-title">🔗 기록 연동</p>' +
      '<p>이 기기의 기록은 자동으로 백업되고 있어요.<br/>' +
      '다른 기기에서도 이어서 하려면 연동 코드를 받아 그 기기에 붙여넣으세요.<br/>' +
      '한 번 연결해두면 8개 게임 기록이 양쪽에서 자동으로 맞춰져요.</p>' +
      '<button class="btn btn-primary" id="cloud-issue">' +
        (issued ? "🔄 새 코드 발급 (지금 코드는 무효가 돼요)" : "📋 계정 연동 코드 복사하기") +
      '</button>' +
      '<div id="cloud-out"></div>' +
      '<hr class="cloud-sep"/>' +
      '<p>다른 기기에서 쓰던 코드가 있나요?</p>' +
      '<div class="cloud-row">' +
        '<input id="cloud-code-input" placeholder="코드를 붙여넣으세요" autocomplete="off"/>' +
        '<button class="btn btn-ghost" id="cloud-claim">불러오기</button>' +
      '</div><div id="cloud-msg"></div>'
    );

    ov.querySelector("#cloud-issue").onclick = function () {
      var btn = this;
      btn.disabled = true;
      rpc("cloud_issue", { p_token: token() }).then(function (code) {
        set("grow-cloud-issued", "1");
        ov.querySelector("#cloud-out").innerHTML =
          '<code class="cloud-code">' + esc(code) + '</code>' +
          '<p>이 코드는 지금만 보여요. 꼭 저장해두세요.</p>';
        btn.disabled = false;
        btn.textContent = "🔄 새 코드 발급 (지금 코드는 무효가 돼요)";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () { _toast("복사됨 ✓"); }).catch(function () {});
        }
      }).catch(function () {
        btn.disabled = false;
        ov.querySelector("#cloud-out").innerHTML = '<p>⚠️ 지금은 발급할 수 없어요. 잠시 뒤 다시 시도해주세요.</p>';
      });
    };

    ov.querySelector("#cloud-claim").onclick = function () {
      var v = ov.querySelector("#cloud-code-input").value.trim();
      var msg = ov.querySelector("#cloud-msg");
      if (!v) { msg.innerHTML = '<p>코드를 입력해주세요.</p>'; return; }
      this.disabled = true;
      rpc("cloud_claim", { p_token: token(), p_code: v }).then(function (ok) {
        if (!ok) { msg.innerHTML = '<p>⚠️ 코드가 맞지 않거나 이미 사용됐어요.</p>'; return; }
        set(dirtyKey(cur), "1");           // 로컬 진행이 있을 수 있으니 충돌 판정을 거치게 해요
        _toast("연결됐어요");
        closeModal();
        openLink();
      }).catch(function () {
        msg.innerHTML = '<p>⚠️ 연결에 실패했어요. 인터넷을 확인해주세요.</p>';
      }).then(function () { var b = ov.querySelector("#cloud-claim"); if (b) b.disabled = false; });
    };
  }

  // 게임별 한 줄 요약 — 세이브 구조만 보고 만드는 순수 함수예요
  // phase/proYear/group 필드는 idol·stock·dev·chef·stream·soccer의 career.js가 프로 전환 때
  // 붙여요 (예: idol/career.js: S.phase="idol-pro", S.proYear=0, S.group=...).
  // rookie는 game.js에서 phase="pro"·team·role을 직접 쓰고, unicorn은 슬롯 구조가 달라
  // bestRun(기업가치 최고치)으로 STAGES 단계를 다시 계산해요.
  var SUMMARY = {
    rookie: function (s) { return s.phase === "pro" ? "프로 " + (s.proYear || 0) + "년차" : "고교 " + (s.year || 1) + "학년"; },
    idol: function (s) { return s.phase === "idol-pro" ? "데뷔 " + (s.proYear || 0) + "년차" : "연습생 " + (s.year || 1) + "년차"; },
    stock: function (s) { return s.phase === "stock-pro" ? "전업투자자 " + (s.proYear || 0) + "년차" : "주린이 " + (s.year || 1) + "년차"; },
    dev: function (s) { return s.phase === "dev-pro" ? "현업 개발자 " + (s.proYear || 0) + "년차" : (s.year || 1) + "년차 개발자"; },
    chef: function (s) { return s.phase === "chef-pro" ? "오너셰프 " + (s.proYear || 0) + "년차" : (s.year || 1) + "년차 요리사"; },
    stream: function (s) { return s.phase === "stream-pro" ? "전업 스트리머 " + (s.proYear || 0) + "년차" : (s.year || 1) + "년차 스트리머"; },
    soccer: function (s) { return s.phase === "soccer-pro" ? "프로 " + (s.proYear || 0) + "시즌" : "유스 " + (s.year || 1) + "년차"; },
    unicorn: function (s) {
      var v = s.bestRun || s.peakVal || 0;
      var name = "창업 준비";
      if (v >= 6e10) name = "유니콘";
      else if (v >= 6e9) name = "시리즈 C";
      else if (v >= 1.8e8) name = "시리즈 B";
      else if (v >= 6e6) name = "시리즈 A";
      else if (v >= 1.8e5) name = "시드 투자";
      else if (v >= 3e3) name = "프리시드";
      return s.exits ? name + " · Exit " + s.exits + "회" : name;
    },
  };
  var LABEL = {
    rookie: "⚾ 더 루키", idol: "🎤 아이돌", stock: "📈 주식", dev: "💻 개발자",
    chef: "🍳 요리사", stream: "📺 스트리머", soccer: "⚽ 축구", unicorn: "🦄 유니콘",
  };

  function summarize(game, obj) {
    try {
      var raw = obj && obj[SAVE[game]];
      if (!raw) return null;
      var s = JSON.parse(raw);
      var f = SUMMARY[game];
      return f ? f(s) : "기록 있음";
    } catch (e) { return "기록 있음"; }
  }

  var GAMES = Object.keys(SAVE);

  /* 연결 직후 화면 — 한쪽에만 있는 게임은 자동으로 합치고,
   * 양쪽 모두 있는 게임만 고르게 해요. */
  function openLink() {
    rpc("cloud_pull", { p_token: token(), p_game: null }).then(function (rows) {
      var remote = {};
      (rows || []).forEach(function (r) {
        var g = String(r.game).replace(/^beta:/, "");
        remote[g] = r;
      });
      var auto = [], pick = [];
      GAMES.forEach(function (g) {
        var mine = summarize(g, collect(g));
        var theirs = remote[g] ? summarize(g, remote[g].data) : null;
        if (mine && theirs) pick.push({ g: g, mine: mine, theirs: theirs });
        else if (theirs) auto.push({ g: g, from: "다른 기기", txt: theirs });
        else if (mine) auto.push({ g: g, from: "이 기기", txt: mine });
      });

      var html = '<p class="av-title">🔗 기기를 연결했어요</p>';
      if (auto.length) {
        html += '<p>자동으로 합쳐진 기록</p>';
        auto.forEach(function (a) {
          html += '<div class="cloud-pick">' + esc(LABEL[a.g]) + ' — ' + esc(a.txt) +
                  ' <span style="color:var(--dim)">(' + a.from + ')</span></div>';
        });
      }
      pick.forEach(function (p) {
        html += '<p>⚠️ 양쪽 모두 기록이 있어요. 골라주세요.</p>' +
          '<div class="cloud-pick"><b>' + esc(LABEL[p.g]) + '</b>' +
          '<label><input type="radio" name="pk-' + p.g + '" value="mine"/> 이 기기 — ' + esc(p.mine) + '</label>' +
          '<label><input type="radio" name="pk-' + p.g + '" value="theirs" checked/> 다른 기기 — ' + esc(p.theirs) + '</label>' +
          '</div>';
      });
      html += '<button class="btn btn-primary" id="cloud-done">연결 완료</button>';

      var ov = shell(html);
      ov.querySelector("#cloud-done").onclick = function () {
        pick.forEach(function (p) {
          var sel = ov.querySelector('input[name="pk-' + p.g + '"]:checked');
          if (sel && sel.value === "theirs") apply(p.g, remote[p.g].data);
        });
        auto.forEach(function (a) {
          if (a.from === "다른 기기") apply(a.g, remote[a.g].data);
        });
        GAMES.forEach(function (g) { set(dirtyKey(g), "1"); });
        closeModal();
        _toast("불러왔어요");
        setTimeout(function () { location.reload(); }, 700);
      };
    }).catch(function () { _toast("불러오기에 실패했어요"); });
  }

  /* 충돌 — 같은 게임을 두 기기에서 각각 진행했을 때 */
  function onConflict(game, updated) {
    var mine = summarize(game, collect(game));
    rpc("cloud_pull", { p_token: token(), p_game: tag(game) }).then(function (rows) {
      if (!rows || !rows.length) return;
      var theirs = summarize(game, rows[0].data);
      var ov = shell(
        '<p class="av-title">⚠️ 두 기기에서 각각 진행됐어요</p>' +
        '<div class="cloud-pick">이 기기 &nbsp; ' + esc(LABEL[game]) + ' — ' + esc(mine || "기록 없음") + '</div>' +
        '<div class="cloud-pick">다른 기기 &nbsp; ' + esc(LABEL[game]) + ' — ' + esc(theirs || "기록 없음") + '</div>' +
        '<button class="btn btn-primary" id="cloud-keep">이 기기 것 쓰기</button>' +
        '<button class="btn btn-ghost" id="cloud-take">다른 기기 것 쓰기</button>'
      );
      ov.querySelector("#cloud-keep").onclick = function () { closeModal(); push(game); _toast("이 기기 기록을 올렸어요"); };
      ov.querySelector("#cloud-take").onclick = function () {
        apply(game, rows[0].data);
        set(syncKey(game), String(rows[0].updated));
        set(dirtyKey(game), "0");
        closeModal();
        setTimeout(function () { location.reload(); }, 400);
      };
    }).catch(function () {});
  }

  window.Cloud = {
    init: init, touch: touch, mark: mark,
    openModal: openModal, onConflict: onConflict,
    _toast: _toast, _pull: pullAndApply,
  };
  window.Cloud._t = {
    token: token, keysOf: keysOf, collect: collect, apply: apply,
    rpc: rpc, tag: tag, decide: decide, summarize: summarize,
  };
})();
