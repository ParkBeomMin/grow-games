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

  function writeKeys(game, obj) {
    keysOf(game).forEach(function (k) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, k)) localStorage.setItem(k, obj[k]);
        else localStorage.removeItem(k);
      } catch (e) {}
    });
  }

  /* 받아온 기록을 로컬에 씁니다. 성공하면 true.
   * 빈 꾸러미는 무조건 거절해요 — 한 번도 안 해본 게임이 dirty로 잘못 표시되면
   * 빈 {}가 서버에 올라가고, 진짜 기록을 가진 반대편 기기가 그걸 받아
   * 게임 하나를 통째로 지워버려요. 지우는 건 되돌릴 수 없으니 여기서 막습니다. */
  function apply(game, obj) {
    if (!obj || typeof obj !== "object" || !Object.keys(obj).length) return false;
    writeKeys(game, obj);
    freeze(game, obj);
    return true;
  }

  /* reload 경합 막기.
   * unicorn/game.js는 beforeunload에 save()를 걸어둬서, 방금 받아온 기록 위에
   * 아직 메모리에 남아 있는 옛 상태를 덮어써 버려요. 게다가 syncKey는 이미
   * "서버와 같음"으로 바뀐 뒤라 그 손실은 영영 복구되지 않아요.
   * 두 겹으로 막습니다.
   *  ① window.Cloud.frozen — 게임 쪽 save()가 이 깃발을 보면 쉬어요.
   *  ② 언로드 직전에 받아온 값을 한 번 더 써요. 리스너는 게임보다 나중에 등록되니
   *     게임의 save()가 먼저 돌고 우리가 마지막에 덮어써서 최종값이 보장돼요. */
  var pending = [];          // 적용한 기록 — 언로드 직전에 다시 써요
  var pendingHooked = false;
  function freeze(game, obj) {
    if (window.Cloud) window.Cloud.frozen = true;
    pending.push({ g: game, o: obj });
    if (pendingHooked) return;
    pendingHooked = true;
    var redo = function () { pending.forEach(function (p) { writeKeys(p.g, p.o); }); };
    window.addEventListener("beforeunload", redo);
    window.addEventListener("pagehide", redo);
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
    // 빈 꾸러미는 올리지 않아요 — 한 번도 안 해본 게임을 {}로 덮어쓰면
    // 진짜 기록을 가진 다른 기기가 그걸 받아 게임 하나를 통째로 지워요.
    var data = collect(game);
    if (!Object.keys(data).length) return Promise.resolve();
    lastPush = Date.now();
    return rpc("cloud_push", { p_token: tok, p_game: tag(game), p_data: data })
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
      var row = rows[0];
      if (!apply(game, row.data)) {
        // 서버 쪽이 빈 꾸러미예요. 지우지 않고, 대신 이 기기 기록을 올려 서버를 바로잡아요.
        // (syncKey는 갱신해둬야 켤 때마다 같은 빈 기록을 다시 받아오지 않아요)
        set(syncKey(game), String(row.updated));
        set(dirtyKey(game), "1");
        push(game);
        return;
      }
      set(syncKey(game), String(row.updated));
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

  /* 코드 복사.
   * 클립보드 쓰기는 사용자가 누른 그 순간(사용자 활성화) 안에서만 허용돼요.
   * iOS/사파리는 fetch의 .then() 안에서 부르면 거절해요 — 그래서 발급 직후의
   * 자동 복사는 "되면 좋고"일 뿐이고, 진짜 믿을 수 있는 길은 아래 복사 버튼이에요.
   * 그마저 막히면 코드를 선택해두고 직접 복사하라고 알려줘요 (조용히 삼키지 않아요). */
  function selectCode(ov) {
    var el = ov.querySelector("#cloud-code");
    if (!el) return;
    try {
      var r = document.createRange();
      r.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    } catch (e) {}
  }
  function copyCode(code, ov) {
    var ok = function () { _toast("복사됐어요 ✓"); };
    var no = function () { selectCode(ov); _toast("코드를 길게 눌러 직접 복사해주세요"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { navigator.clipboard.writeText(code).then(ok, no); return; } catch (e) {}
    }
    no();
  }

  function openModal() {
    var issued = get("grow-cloud-issued") === "1";
    // 저장소를 못 쓰면 기기 정체성이 없어서 클라우드 자체가 성립하지 않아요.
    // 요청을 쏘는 대신 솔직하게 알려줘요.
    if (!token()) {
      shell('<p class="av-title">☁️ 기록 연동</p>' +
        '<p>이 브라우저에서는 기록 연동을 쓸 수 없어요.<br/>' +
        '시크릿 모드이거나 저장 공간이 막혀 있어요. 일반 창에서 다시 열어주세요.</p>');
      return;
    }
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
      var tok = token();
      if (!tok) { ov.querySelector("#cloud-out").innerHTML = '<p>⚠️ 이 브라우저에서는 코드를 발급할 수 없어요.</p>'; return; }
      btn.disabled = true;
      rpc("cloud_issue", { p_token: tok }).then(function (code) {
        set("grow-cloud-issued", "1");
        ov.querySelector("#cloud-out").innerHTML =
          '<code class="cloud-code" id="cloud-code">' + esc(code) + '</code>' +
          '<button class="btn btn-ghost cloud-copy" id="cloud-copy">📋 코드 복사</button>' +
          '<p>이 코드는 지금만 보여요. 꼭 저장해두세요.<br/>' +
          '복사가 안 되면 위 코드를 길게 눌러 직접 복사하시면 돼요.</p>';
        ov.querySelector("#cloud-copy").onclick = function () { copyCode(code, ov); };
        btn.disabled = false;
        btn.textContent = "🔄 새 코드 발급 (지금 코드는 무효가 돼요)";
        // 되는 브라우저(데스크톱·안드로이드)에서는 바로 복사해줘요. iOS에서 막히면
        // 위 복사 버튼이 받아주니, 여기서는 실패해도 화면을 어지럽히지 않아요.
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try { navigator.clipboard.writeText(code).then(function () { _toast("복사됐어요 ✓"); }, function () {}); } catch (e) {}
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
      var tok = token();
      if (!tok) { msg.innerHTML = '<p>⚠️ 이 브라우저에서는 기록 연동을 쓸 수 없어요.</p>'; return; }
      this.disabled = true;
      rpc("cloud_claim", { p_token: tok, p_code: v }).then(function (ok) {
        if (!ok) { msg.innerHTML = '<p>⚠️ 코드가 맞지 않거나 이미 사용됐어요.</p>'; return; }
        // init() 전에 모달을 열었으면 cur가 없어요. 그때 dirtyKey(null)을 쓰면
        // "grow-cloud-dirty-null"이라는 아무도 안 보는 키가 생겨요.
        if (cur) set(dirtyKey(cur), "1");  // 로컬 진행이 있을 수 있으니 충돌 판정을 거치게 해요
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
      // beta/unicorn/game.js의 STAGES와 같은 표예요 (기준선·이름 모두 그쪽이 원본이에요)
      var STAGES = [
        [0, "부트스트랩"], [3e3, "프리시드"], [1.8e5, "시드 투자"], [6e6, "시리즈 A"],
        [1.8e8, "시리즈 B"], [6e9, "시리즈 C"], [6e10, "유니콘"], [6e12, "데카콘"],
      ];
      var v = s.bestRun || s.peakVal || 0;
      var name = STAGES[0][1];
      STAGES.forEach(function (st) { if (v >= st[0]) name = st[1]; });
      return s.exits ? name + " · Exit " + s.exits + "회" : name;
    },
  };
  var LABEL = {
    rookie: "⚾ 더 루키", idol: "🎤 아이돌", stock: "📈 주식", dev: "💻 개발자",
    chef: "🍳 요리사", stream: "📺 스트리머", soccer: "⚽ 축구", unicorn: "🦄 유니콘",
  };

  /* 한 줄 요약.
   *
   * 저장 모양이 게임마다 달라요. 8종 중 7종은 SAVE[게임]+"-slots"에 슬롯 맵을 써요
   *   { 슬롯id: { …게임상태…, savedAt: <ms> }, … }
   * 평키(SAVE[게임])는 슬롯으로 이사시킨 뒤 지워지는 흔적일 뿐이라, 평키만 보면
   * 7종 전부 "기록 없음"으로 보여요. 진짜 기록을 두고 없다고 말하면 플레이어가
   * 그대로 눌러버리고 세이브가 날아가요.
   * 대표 슬롯은 각 게임 game.js의 slotDesc/showSlotPicker와 같은 규칙 —
   * savedAt이 가장 최근인 슬롯이에요.
   * unicorn만 평키 하나에 상태를 통째로 담아요. */
  function summarize(game, obj) {
    if (!obj) return null;
    var f = SUMMARY[game];
    var one = function (st) {
      if (!st || typeof st !== "object") return null;
      try { return f ? f(st) : "기록 있음"; } catch (e) { return "기록 있음"; }
    };

    if (game === "unicorn") {
      try {
        var raw = obj[SAVE[game]];
        if (!raw) return null;
        return one(JSON.parse(raw));
      } catch (e) { return "기록 있음"; }
    }

    var sl;
    try {
      var rawSl = obj[SAVE[game] + "-slots"];
      if (!rawSl) return null;
      sl = JSON.parse(rawSl);
    } catch (e) { return "기록 있음"; }
    if (!sl || typeof sl !== "object") return null;

    var ids = Object.keys(sl);
    if (!ids.length) return null;
    var best = null;
    ids.forEach(function (id) {
      var st = sl[id];
      if (!st || typeof st !== "object") return;
      if (!best || (st.savedAt || 0) > (sl[best].savedAt || 0)) best = id;
    });
    var txt = one(best === null ? null : sl[best]);
    if (!txt) return null;
    // 캐릭터를 여러 명 키우는 사람이 있어요. 대표 한 명만 보이면 "이거 하나뿐인가?"
    // 싶어서 나머지를 날려버릴 수 있으니 몇 개인지 같이 알려줘요.
    if (ids.length > 1) txt += " · 캐릭터 " + ids.length + "명";
    return txt;
  }

  var GAMES = Object.keys(SAVE);

  /* 연결 직후 화면 — 한쪽에만 있는 게임은 그대로 맞추고,
   * 양쪽 모두 있는 게임만 고르게 해요. (섞지 않아요) */
  function openLink() {
    var tok = token();
    if (!tok) { _toast("이 브라우저에서는 기록 연동을 쓸 수 없어요"); return; }
    rpc("cloud_pull", { p_token: tok, p_game: null }).then(function (rows) {
      var remote = {};
      (rows || []).forEach(function (r) {
        var g = String(r.game).replace(/^beta:/, "");
        remote[g] = r;
      });
      var auto = [], pick = [];
      GAMES.forEach(function (g) {
        var mine = summarize(g, collect(g));
        var theirs = remote[g] ? summarize(g, remote[g].data) : null;
        if (mine && theirs) {
          // 기본값은 이 기기예요. 서버가 확실히 더 최신일 때만 저쪽으로 넘겨요.
          // 기기 시계는 안 봐요 — 서버가 찍어준 두 시각(remote.updated 대 syncKey)만 비교해요.
          var synced = get(syncKey(g));
          var up = remote[g].updated;
          var remoteNewer = !!up && (!synced || Date.parse(up) > Date.parse(synced));
          pick.push({ g: g, mine: mine, theirs: theirs, remoteNewer: remoteNewer });
        } else if (theirs) auto.push({ g: g, from: "다른 기기", txt: theirs });
        else if (mine) auto.push({ g: g, from: "이 기기", txt: mine });
      });

      var html = '<p class="av-title">🔗 기기를 연결했어요</p>';
      if (auto.length) {
        html += '<p>한쪽에만 있는 기록이에요. 양쪽을 이 상태로 맞출게요.</p>';
        auto.forEach(function (a) {
          html += '<div class="cloud-pick">' + esc(LABEL[a.g]) + ' — ' + esc(a.txt) +
                  ' <span style="color:var(--dim)">(' + a.from + ')</span></div>';
        });
      }
      if (pick.length) html += '<p>⚠️ 양쪽 모두 기록이 있어요. 어느 쪽을 남길지 골라주세요. 고르지 않은 쪽은 사라져요.</p>';
      pick.forEach(function (p) {
        var m = p.remoteNewer ? "" : " checked";
        var t = p.remoteNewer ? " checked" : "";
        html += '<div class="cloud-pick"><b>' + esc(LABEL[p.g]) + '</b>' +
          '<label><input type="radio" name="pk-' + p.g + '" value="mine"' + m + '/> 이 기기 — ' + esc(p.mine) + '</label>' +
          '<label><input type="radio" name="pk-' + p.g + '" value="theirs"' + t + '/> 다른 기기 — ' + esc(p.theirs) + '</label>' +
          '</div>';
      });
      html += '<button class="btn btn-primary" id="cloud-done">고른 대로 기록 맞추기</button>';

      var ov = shell(html);
      ov.querySelector("#cloud-done").onclick = function () {
        var pulled = [], kept = [];
        pick.forEach(function (p) {
          var sel = ov.querySelector('input[name="pk-' + p.g + '"]:checked');
          if (sel && sel.value === "theirs") pulled.push(p.g); else kept.push(p.g);
        });
        auto.forEach(function (a) {
          if (a.from === "다른 기기") pulled.push(a.g); else kept.push(a.g);
        });

        // 받아온 게임은 "서버와 같음"으로 적어둬요. 이걸 안 해두면 켤 때마다
        // 방금 해결한 게임이 또 충돌 화면으로 올라와요.
        pulled.forEach(function (g) {
          var row = remote[g];
          if (row && apply(g, row.data)) {
            set(syncKey(g), String(row.updated));
            set(dirtyKey(g), "0");
          } else {
            set(dirtyKey(g), "1");   // 서버가 비어 있었어요 — 지우지 말고 이 기기 것을 올려요
          }
        });
        // 이 기기 것을 남긴 게임만 올릴 거리가 있어요.
        // 한 번도 안 해본 게임까지 dirty로 찍으면 빈 {}가 올라가서
        // 반대편 기기의 진짜 기록이 지워져요. 그래서 여기만 표시해요.
        kept.forEach(function (g) {
          set(dirtyKey(g), "1");
          // 서버 쪽 버전을 "이미 보고 이 기기 것으로 정했다"고 적어둬요.
          // 이걸 빼먹으면 다음에 켤 때 dirty × 서버가-더-최신이 다시 성립해서
          // 방금 고른 게임이 또 충돌 화면으로 올라와요.
          var row = remote[g];
          if (row && row.updated) set(syncKey(g), String(row.updated));
        });

        closeModal();
        _toast("기록을 맞췄어요");
        setTimeout(function () { location.reload(); }, 700);
      };
    }).catch(function () { _toast("불러오기에 실패했어요"); });
  }

  /* 충돌 — 같은 게임을 두 기기에서 각각 진행했을 때 */
  function onConflict(game, updated) {
    var mine = summarize(game, collect(game));
    var tok = token();
    if (!tok) return; // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    rpc("cloud_pull", { p_token: tok, p_game: tag(game) }).then(function (rows) {
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
        if (!apply(game, rows[0].data)) {
          // 서버가 빈 꾸러미였어요 — 지우지 않고 이 기기 것을 지켜요
          closeModal();
          _toast("다른 기기에 가져올 기록이 없어요");
          return;
        }
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
    rpc: rpc, tag: tag, decide: decide, summarize: summarize, openLink: openLink,
  };
})();
