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
  /* 저장할 때마다 올리면 낭비라 간격을 두는데, 2분은 너무 길었어요.
   * 경기 한 판이 2분이 안 걸려서, B에서 한 판 하고 바로 A로 넘어가면
   * B가 아직 안 올린 상태였어요. 그러면 A가 옛 기록을 받고 거기서 플레이해
   * 양쪽이 갈라져요. 경기가 끝날 때 save()가 불리니, 간격을 20초로 줄이면
   * 한 판 끝날 때마다 올라가면서 연타에는 낭비하지 않아요. */
  var PUSH_GAP = 20 * 1000;

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

  /* 키를 하나라도 못 쓰면 false를 돌려줘요.
   * 저장 공간이 중간에 차면 슬롯은 써졌는데 -legacy는 못 쓰는 '반쪽 세이브'가 돼요.
   * 그걸 성공이라고 말하면 부르는 쪽이 도장(syncKey)과 dirty=0을 찍어버려서,
   * 이 기기는 받지도 못한 기록과 "같다"고 믿고 다음 전송으로 반대편 기기의
   * 더 새로운 세이브를 덮어써요. 그래서 실패는 반드시 위로 전해요. */
  function writeKeys(game, obj) {
    var ok = true;
    keysOf(game).forEach(function (k) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, k)) localStorage.setItem(k, obj[k]);
        else localStorage.removeItem(k);
      } catch (e) { ok = false; }
    });
    return ok;
  }

  /* 받아온 기록을 로컬에 씁니다. 성공하면 true.
   * 빈 꾸러미는 무조건 거절해요 — 한 번도 안 해본 게임이 dirty로 잘못 표시되면
   * 빈 {}가 서버에 올라가고, 진짜 기록을 가진 반대편 기기가 그걸 받아
   * 게임 하나를 통째로 지워버려요. 지우는 건 되돌릴 수 없으니 여기서 막습니다.
   * 저장소에 못 쓴 경우에도 false예요 — 부르는 쪽은 장부를 건드리지 말고
   * 다음 실행에서 다시 시도해야 해요. */
  function apply(game, obj) {
    if (!obj || typeof obj !== "object" || !Object.keys(obj).length) return false;
    if (!writeKeys(game, obj)) return false;
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
  var FREEZE_GRACE = 2000;   // 이 안에 새로고침이 예약되지 않으면 깃발을 풀어요
  var reloadPlanned = false;
  var freezeWatch = null;

  var RELOAD_GRACE = 2000;   // 새로고침이 진짜 일어났다면 이 안에 페이지가 사라져요

  // 새로고침 예약 — frozen 깃발과 짝이에요. 여기를 거쳐야 깃발이 계속 유지돼요.
  //
  // 다만 "예약했다"가 "일어난다"는 아니에요. reload()가 던지거나(구형 웹뷰·정책 차단),
  // 조용히 무시되면 reloadPlanned가 한 방향 걸쇠로 남아서 freeze()의 감시 타이머가
  // 깃발을 못 풀어요. 그러면 유니콘 save()가 그 세션 내내 멈춰버려요.
  // 그래서 시킨 뒤 잠깐 기다렸다가, 페이지가 아직 살아 있으면 걸쇠를 되돌려요.
  // (언로드 재기록 훅은 그대로 남아 있어서 되돌려도 안전해요)
  function reloadSoon(ms) {
    reloadPlanned = true;
    setTimeout(function () {
      try { location.reload(); } catch (e) {}
      setTimeout(function () {
        reloadPlanned = false;
        if (window.Cloud) window.Cloud.frozen = false;
      }, RELOAD_GRACE);
    }, ms || 0);
  }

  function freeze(game, obj) {
    if (window.Cloud) window.Cloud.frozen = true;
    // 이 깃발은 "곧 새로고침한다"는 전제에서만 안전해요. 새로고침하지 않는 apply()가
    // 나중에 생기면 유니콘 저장이 그 세션 내내 조용히 멈춰버려요. 그래서 잠깐 기다렸다가
    // 새로고침 예약이 없으면 스스로 풀어요. (언로드 재기록은 그대로 남아 있어서 안전해요)
    if (freezeWatch) clearTimeout(freezeWatch);
    freezeWatch = setTimeout(function () {
      freezeWatch = null;
      if (!reloadPlanned && window.Cloud) window.Cloud.frozen = false;
    }, FREEZE_GRACE);
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

  /* 사람이 고르는 중인 게임 — 화면이 결론 날 때까지 서버를 건드리지 않아요. (스펙 5.4
   * "고르기 전에는 어느 쪽도 바꾸지 않는다")
   *
   * 연결 화면·충돌 화면은 "어느 쪽을 남길까요"를 묻고 있어요. 그런데 그 게임을 겨누는
   * 배경 전송이 두 갈래로 이미 걸려 있어요 — init()의 visibilitychange(탭 전환·화면 잠금)와
   * touch()의 2분 주기 전송(방금 claim한 직후라 lastPush=0이니 첫 저장에서 바로 나가요).
   * 유니콘처럼 쉼 없이 저장하는 게임은 탭을 옮기지 않아도 걸려요.
   *
   * 물어보는 중에 전송이 나가면 "이 기기 것 쓰기"를 사용자 대신 눌러버리는 셈이에요.
   * 게다가 그 뒤 '다른 기기'를 고르면 화면이 붙잡고 있던 **전송 이전의** 서버 시각으로
   * 도장을 찍어요. 그러면 양쪽 기기 모두 다음 실행에서 "서버가 더 최신"으로 판정해
   * 묻지 않는 pull을 돌리고, 방금 고른 기록이 배경 전송본으로 되돌아가요.
   * 화면 한 번 안 보여주고 커리어가 사라지는, 되돌릴 수 없는 손실이에요.
   *
   * 그래서 "물어볼 게 있다"고 정해지는 순간부터 그 게임의 push를 막고, 푸는 건
   * **사람이 실제로 고른 순간**뿐이에요. 세우는 곳은 화면이 아니라 판정이에요 —
   * 화면을 띄우려면 왕복이 한 번 더 필요한데, 그 사이에도 게임은 무방비니까요.
   * 취소하거나 왕복이 실패하면 붙잡은 채로 둬요. 장부(dirty)도 그대로라
   * 그 게임의 백업만 이번 실행 동안 쉬고, 다음 실행에서 다시 물어봐요. */
  var awaiting = {};
  function holdDecision(games) { games.forEach(function (g) { awaiting[g] = true; }); }
  function releaseDecision(games) { games.forEach(function (g) { delete awaiting[g]; }); }

  function push(game) {
    if (!game || !SAVE[game]) return Promise.resolve();
    if (awaiting[game]) return Promise.resolve();   // 사람이 고르는 중이에요
    var tok = token();
    if (!tok) return Promise.resolve(); // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    // 빈 꾸러미는 올리지 않아요 — 한 번도 안 해본 게임을 {}로 덮어쓰면
    // 진짜 기록을 가진 다른 기기가 그걸 받아 게임 하나를 통째로 지워요.
    var data = collect(game);
    if (!Object.keys(data).length) return Promise.resolve();
    lastPush = Date.now();
    var gen = syncStart();
    return rpc("cloud_push", { p_token: tok, p_game: tag(game), p_data: data })
      .then(function (at) {
        set(syncKey(game), String(at));
        set(dirtyKey(game), "0");
        syncEnd(true, gen);
        pushShared();
      })
      .catch(function () { syncEnd(false, gen); /* 그 외에는 조용히 넘어가요 */ });
  }

  /* 8종을 한꺼번에 올려요.
   * 평소 전송은 지금 열어둔 게임 하나만 다뤄요. 그래서 코드를 발급하자마자
   * 다른 기기에서 연동하면, 아직 안 올라간 게임들이 "기록 없음"으로 보였어요.
   * 코드를 발급한다는 건 "이제 다른 기기로 옮긴다"는 뜻이니 그때 전부 올려요. */
  function pushAll() {
    var tok = token();
    if (!tok) return Promise.resolve();
    var jobs = GAMES.filter(function (g) {
      return !awaiting[g] && Object.keys(collect(g)).length;
    }).map(function (g) {
      return rpc("cloud_push", { p_token: tok, p_game: tag(g), p_data: collect(g) })
        .then(function (at) { set(syncKey(g), String(at)); set(dirtyKey(g), "0"); })
        .catch(function () {});
    });
    if (!jobs.length) return Promise.resolve();
    lastPush = Date.now();
    var gen = syncStart();
    return Promise.all(jobs).then(function () { syncEnd(true, gen); pushShared(); },
                                  function () { syncEnd(false, gen); });
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

  /* 되돌릴 수 없는 선택(환생) 직후처럼 곧바로 새로고침하는 자리를 위한 짧은 대기.
   * mark()가 띄운 전송의 .then이 돌아야 "올렸음" 도장(syncKey·dirty=0)이 찍혀요.
   * 그걸 안 기다리고 reload하면 keepalive 덕에 POST는 살아남지만 도장은 안 찍혀서,
   * 혼자 쓰는 기기인데도 다음 실행에서 자기 업로드와 자기 세이브를 견주는
   * 충돌 화면이 떠요. 그렇다고 무작정 기다리면 네트워크가 느릴 때 화면이 멈춘 것처럼
   * 보이니 상한을 둬요 — 상한에 걸려도 잃는 건 없고, 그때는 충돌 화면이 한 번 뜰 뿐이에요. */
  var SETTLE_MAX = 1500;
  var lastMark = null;
  function settle(ms) {
    var p = lastMark;
    if (!p || typeof p.then !== "function") return Promise.resolve();
    return new Promise(function (done) {
      var fired = false;
      var fin = function () { if (!fired) { fired = true; done(); } };
      setTimeout(fin, ms || SETTLE_MAX);
      p.then(fin, fin);
    });
  }

  function mark() {
    if (!cur) return Promise.resolve();
    lastMark = push(cur);
    // 첫 은퇴처럼 "잃을 게 생긴" 순간에 한 번만 권해요. 그 뒤로는 조르지 않아요.
    // 저장소를 못 쓰면(token() null) 애초에 기능이 성립하지 않으니 권하지 않아요.
    if (get("grow-cloud-issued") !== "1" && get("grow-cloud-asked") !== "1" && token()) {
      setTimeout(function () {
        // 연동·충돌 화면은 "어느 쪽을 남길까요"를 묻고 있어요. 그 위에 이 권유가 겹쳐 뜨면
        // 사용자가 결정 화면 대신 이 팝업에 답해버릴 수 있어요. 그런 순간엔 건너뛰어요.
        if (awaiting[cur]) return;
        // "권했다"는 도장은 **실제로 보여준 뒤에** 찍어요. 먼저 찍어두면 위 guard에
        // 걸려 건너뛴 사람에게 두 번 다시 권하지 않게 되는데, 이 권유가 영구 손실을
        // 막아주는 유일한 안내예요. 못 보여줬으면 다음 기회에 다시 권해야 해요.
        // (1.2초 안에 mark()가 두 번 오면 타이머도 둘이라 여기서 한 번 더 확인해요)
        if (get("grow-cloud-issued") === "1" || get("grow-cloud-asked") === "1") return;
        set("grow-cloud-asked", "1");
        var ov = shell(
          '<p class="av-title">💾 기록을 지킬까요?</p>' +
          '<p>지금 기록은 이 기기에만 있어요.<br/>' +
          '브라우저 데이터를 지우거나 기기를 바꾸면 사라져요.<br/>' +
          '연동 코드를 하나 받아두면 새 기기에서 그대로 이어받을 수 있어요.</p>' +
          '<button class="btn btn-primary" id="cloud-go">🔗 코드 받기</button>'
        );
        ov.querySelector("#cloud-go").onclick = function () { closeModal(); openModal(); };
      }, 1200);
    }
    return lastMark;
  }

  /* 5.3절 판정 — 기기 시계를 쓰지 않아요.
   * dirty(내가 안 올린 변경이 있나) × 서버가 더 최신인가, 네 갈래예요. */
  function decide(game, serverUpdated) {
    var dirty = get(dirtyKey(game)) === "1";
    var synced = get(syncKey(game));
    /* 도장이 없다 = 이 기기에서 **한 번도 올린 적이 없다**는 뜻이에요.
     * 그런데 로컬에 기록이 있다면, 그 기록은 서버 어디에도 사본이 없어요.
     * 여기서 dirty를 false로 보면 "안 건드림 × 서버가 더 최신" 한 갈래로 떨어져
     * 묻지도 않고 pull이 돌고, 되돌릴 수 없이 사라져요.
     *
     * 실제로 모든 기존 사용자가 이 길 위에 있어요. 옛 기기에서 코드만 발급하면
     * 그 순간 열어둔 게임 하나만 올라가고 나머지 일곱은 도장이 없어요.
     * 새 기기에서 그중 한 게임을 시작하면(= 서버에 행이 생기면), 옛 기기에서
     * 그 게임을 여는 순간 몇 달치 커리어가 하루치로 조용히 덮여요.
     * (claim한 기기 쪽은 orphanLedger()가 이미 이 규칙을 씁니다 — 판정도 같아야 해요.)
     * 스펙 5.1의 dirty 정의 "마지막 전송 이후 로컬 세이브가 바뀌었는지"로 봐도,
     * 한 번도 보낸 적이 없으면 참이에요.
     *
     * 로컬에 기록이 **없으면** 건드리지 않아요 — 새 기기가 코드를 넣고 처음 받아오는
     * 정상 경로(묻지 않는 pull)가 바로 그 경우예요. */
    if (!synced && hasData(collect(game))) dirty = true;
    var remoteNewer = !!serverUpdated && (!synced || Date.parse(serverUpdated) > Date.parse(synced));
    if (dirty && remoteNewer) return "conflict";
    if (dirty) return "push";
    if (remoteNewer) return "pull";
    return "none";
  }

  /* 사람이 이미 놀기 시작했나. cloud_meta 왕복이 느리면(모바일이면 수 초) 응답이
   * 돌아올 때는 이미 캐릭터를 고르고 진행 중일 수 있어요. 그 위에 묻지 않는 pull이
   * 새로고침을 걸면 아직 저장 안 된 진행이 사라져요. */
  var played = false;
  function watchPlay() {
    var on = function () { played = true; };
    ["pointerdown", "touchstart", "keydown"].forEach(function (ev) {
      document.addEventListener(ev, on, { capture: true, passive: true });
    });
  }

  function init(game) {
    cur = game;
    watchPlay();
    /* 화면을 떠날 때 밀어넣어요. iOS 사파리는 탭을 버릴 때 visibilitychange가
     * 안 오는 경우가 있어서 pagehide도 같이 걸어요. push()가 이미 중복을 걸러요. */
    var leave = function () { if (get(dirtyKey(game)) === "1") push(game); };
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") leave();
    });
    window.addEventListener("pagehide", leave);
    // 타이틀 진입 시 서버 상태만 가볍게 확인해요
    var tok = token();
    if (!tok) return; // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    rpc("cloud_meta", { p_token: tok }).then(function (rows) {
      var mine = null;
      (rows || []).forEach(function (r) { if (r.game === tag(game)) mine = r.updated; });
      var act = decide(game, mine);
      if (act === "pull" && played) {
        // 이미 손을 댄 뒤예요. 묻지 않는 pull은 새로고침을 부르니 여기서는 하지 않아요.
        // 로컬에 기록이 있으면 다음 실행에서 사람이 고르도록 장부만 세워두고,
        // 없으면(새 기기가 처음 받아오는 경우) 그냥 다음 실행에 받아요 — 잃을 게 없어요.
        if (hasData(collect(game))) set(dirtyKey(game), "1");
        return;
      }
      if (act === "push") push(game);
      else if (act === "pull") pullAndApply(game);
      else if (act === "conflict") {
        // 물어볼 게 있다는 건 **여기서** 정해져요. 화면을 띄우려면 왕복이 한 번 더 필요한데
        // 그 사이(모바일이면 수 초)에도 dirty=1이라 화면 잠금·자동 저장이 전송을 띄워요.
        // 붙잡는 시점을 화면이 아니라 판정에 맞춰야 그 창이 닫혀요.
        holdDecision([game]);
        window.Cloud.onConflict(game);
      }
    }).catch(function () {});
  }

  function pullAndApply(game) {
    var tok = token();
    if (!tok) return Promise.resolve(); // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    return rpc("cloud_pull", { p_token: tok, p_game: tag(game) }).then(function (rows) {
      if (!rows || !rows.length) return;
      var row = rows[0];
      if (!hasData(row.data)) {
        // 서버 쪽이 빈 꾸러미예요. 지우지 않고, 대신 이 기기 기록을 올려 서버를 바로잡아요.
        // (syncKey는 갱신해둬야 켤 때마다 같은 빈 기록을 다시 받아오지 않아요)
        set(syncKey(game), String(row.updated));
        set(dirtyKey(game), "1");
        push(game);
        return;
      }
      // 받아왔는데 저장소에 못 썼어요(용량 초과 등). 장부는 손대지 않아요 —
      // 여기서 도장을 찍으면 받지도 못한 기록과 "같다"고 믿고, 다음 전송이
      // 반대편 기기의 더 새로운 세이브를 이 반쪽짜리로 덮어써요.
      if (!apply(game, row.data)) return;
      set(syncKey(game), String(row.updated));
      set(dirtyKey(game), "0");
      toast("☁️ 다른 기기 기록을 불러왔어요");
      reloadSoon(900);
    }).catch(function () {});
  }

  function toast(msg) { if (window.Cloud._toast) window.Cloud._toast(msg); }

  /* 6.3절 동기화 표시 — 우측 상단의 작은 알약.
   *   전송 중 ☁️ 동기화중…  / 성공 ✓ 저장됨 (1.5초) / 실패 오프라인 (2초)
   *
   * 처음엔 400ms 안에 끝나는 전송은 감췄어요 — 자동 저장마다 깜빡일까 봐서요.
   * 그런데 대부분의 저장이 그보다 빨라서 표시가 사실상 안 보였어요.
   * 전송 간격이 20초라 깜빡일 일이 없으니 이제 바로 켜고, 끝나면 '저장됨'을 남겨요.
   * 백업이 돌고 있다는 걸 눈으로 확인할 수 있어야 안심하고 기기를 옮길 수 있어요.
   * position:fixed + pointer-events:none 이라 레이아웃을 밀지도, 터치를 막지도 않아요. */
  var SYNC_WAIT = 0;
  var SYNC_MAX = 20000;    // 진행 표시의 천장 — 응답이 영영 안 와도 여기서 걷어요
  var syncTimer = null;    // 진행 표시를 켤 예약
  var syncCap = null;      // 진행 표시를 강제로 걷을 예약
  var syncShown = false;   // 지금 화면에 "동기화중"을 띄웠나
  var syncLive = 0;        // 아직 안 끝난 전송 수 (겹칠 수 있어요)
  var syncBad = false;     // 이번 묶음에 실패가 하나라도 있었나
  var syncGen = 0;         // 천장에 닿아 세어둔 걸 버릴 때마다 올라가는 세대 번호

  function syncPill(text, cls, ms) {
    if (!document.body) return;
    // 토스트가 떠 있으면 같은 자리라 자리를 양보해요 (토스트는 사용자에게 하는 말이라 우선)
    if (document.querySelector(".cloud-toast")) return;
    var el = document.querySelector(".cloud-sync");
    if (!el) {
      el = document.createElement("div");
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.className = "cloud-sync" + (cls ? " " + cls : "");
    el.textContent = text;
    if (el._t) clearTimeout(el._t);
    el._t = ms ? setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, ms) : null;
  }

  /* 전송은 겹쳐요. mark()로 한 번 올리는 사이에 탭이 백그라운드로 가면
   * visibilitychange가 두 번째 push를 띄우죠. 이걸 불리언 하나로 관리하면
   *   ① 두 번째 syncStart()가 첫 번째의 "떠 있음"을 지우고
   *   ② 먼저 끝난 첫 번째가 두 번째의 타이머를 걷어가서
   *   ③ 아무도 알약을 못 치우고 "☁️ 동기화중…"이 세션 내내 남아요.
   * 그래서 켜고 끄는 대신 "몇 개가 살아 있나"를 세고, 마지막 하나가 끝날 때만 말해요.
   * 게다가 응답이 영영 안 오는 요청도 있으니 진행 표시에 천장(SYNC_MAX)을 둬요 —
   * 알약이 자기 요청보다 오래 사는 일은 없어야 해요. */
  function syncClear() {
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
    if (syncCap) { clearTimeout(syncCap); syncCap = null; }
  }

  function syncStart() {
    syncLive++;
    if (syncTimer || syncShown) return syncGen;   // 이미 예약됐거나 떠 있으면 그대로 둬요
    syncTimer = setTimeout(function () {
      syncTimer = null;
      if (!syncLive) return;
      syncShown = true;
      syncPill("☁️ 동기화중…", "", 0);
      syncCap = setTimeout(function () {
        // 천장에 닿았어요 = 이 정도 걸리면 사실상 끊긴 거예요. 솔직하게 알리고 걷어요.
        // 여기서 세대를 넘겨요. 아직 날아다니던 요청이 나중에 응답을 물고 돌아와도
        // 이미 없는 셈 친 전송이라, 그때 syncEnd가 돌면 그 사이 시작된 **새** 전송의
        // 알약을 대신 걷어가거나 엉뚱한 "오프라인"을 띄워요. 옛 세대는 그냥 무시해요.
        syncGen++;
        syncCap = null; syncShown = false; syncLive = 0; syncBad = false;
        syncPill("오프라인", "cloud-sync-off", 2000);
      }, SYNC_MAX);
    }, SYNC_WAIT);
    return syncGen;
  }

  // gen은 syncStart()가 돌려준 세대 번호예요. 안 넘기면(옛 호출·검증용) 그대로 받아줘요.
  function syncEnd(ok, gen) {
    if (gen !== undefined && gen !== syncGen) return;   // 천장에서 이미 걷어낸 전송이에요
    if (syncLive > 0) syncLive--;
    if (!ok) syncBad = true;
    if (syncLive > 0) return;   // 아직 남은 전송이 있어요 — 다 끝나면 한 번만 말해요
    syncClear();
    var bad = syncBad, was = syncShown;
    syncBad = false; syncShown = false;
    if (bad) syncPill("오프라인", "cloud-sync-off", 2000);
    else syncPill("✓ 저장됨", "cloud-sync-ok", 1500);
  }

  var esc = function (s) { return String(s).replace(/[&<>]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };

  function _toast(msg, ms) {
    var old = document.querySelector(".cloud-toast");
    if (old) old.remove();
    var pill = document.querySelector(".cloud-sync");   // 같은 자리를 쓰니 토스트가 우선이에요
    if (pill) { if (pill._t) clearTimeout(pill._t); pill.remove(); }
    var el = document.createElement("div");
    el.className = "cloud-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, ms || 1800);
  }

  /* 화면을 닫는다고 붙잡은 걸 풀지는 않아요 — 푸는 건 오직 사람이 실제로 고른 순간뿐이에요.
   *
   * 닫기 버튼·바깥 탭으로 나가는 건 "안 고르겠다"는 뜻이에요. 그런데 그 순간 장부는
   * 여전히 dirty=1이고 lastPush=0이라, 여기서 풀어주면 **바로 다음 자동 저장 한 번**이
   * '이 기기 것 쓰기'를 사용자 대신 눌러버려요. 그러면 dirty=0 · 새 도장이 찍혀서
   * 질문 자체가 영영 사라지고, 반대편 기기는 다음 실행에서 묻지 않는 pull로
   * 자기 커리어를 그 기록으로 덮어써요. 아무에게도 안 묻고 일어나는 손실이에요.
   *
   * 그래서 취소하면 그 게임의 백업은 이번 실행 내내 쉬어요. localStorage가 항상 주(主)라
   * 잃는 건 없고(5.5), 장부가 dirty로 남아 스펙 5.4의 "다음 실행 때 다시 뜬다"가
   * 비로소 진짜가 돼요. */
  function closeModal() {
    var ov = document.querySelector(".cloud-overlay");
    if (ov) ov.remove();
  }

  /* closeLabel을 주면 아래 버튼 문구를 바꿔요.
   * 연동 직후 화면에서 "닫기"는 되돌려지는 것처럼 읽혀요 — 코드를 넣은 순간
   * 연결은 이미 끝났고, 그 화면에서 정하는 건 어느 기록을 남길지뿐이에요. */
  function shell(inner, closeLabel) {
    closeModal();
    var ov = document.createElement("div");
    ov.className = "av-overlay cloud-overlay";
    // closeLabel이 빈 문자열이면 아래 버튼을 아예 달지 않아요.
    // 고를 게 없는 화면에 갈래를 두 개 두면, 결과가 같은데도 고르라고 하는 셈이에요.
    ov.innerHTML = '<div class="av-modal cloud-modal">' + inner +
      (closeLabel === ""
        ? ""
        : '<div class="av-actions"><button class="btn btn-ghost cloud-close">' +
          esc(closeLabel || "닫기") + '</button></div>') + '</div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeModal(); });
    document.body.appendChild(ov);
    var cb = ov.querySelector(".cloud-close");
    if (cb) cb.onclick = closeModal;
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
  /* 스펙 6.1 — 버튼 자체가 1.5초간 "복사됨 ✓"으로 바뀌어요.
   * 토스트만으로는 방금 누른 손가락 아래에서 아무 일도 안 일어난 것처럼 보여요.
   * (성공 토스트는 뺐어요 — 버튼이 이미 말하고 있고, 토스트는 동기화 알약 자리를
   *  1.8초 빼앗아요. 실패 안내는 "이렇게 하세요"라 토스트로 남겨둬요.) */
  var COPIED_MS = 1500;
  function flashCopied(btn) {
    if (!btn) return;
    if (btn._ct) { clearTimeout(btn._ct); } else { btn._label = btn.textContent; }
    btn.textContent = "복사됨 ✓";
    btn._ct = setTimeout(function () {
      btn._ct = null;
      if (btn._label) btn.textContent = btn._label;
    }, COPIED_MS);
  }
  /* 발급한 코드를 이 기기에 남겨둬요.
   * 서버엔 해시만 두지만, 이 기기는 이미 토큰으로 같은 권한을 갖고 있어서
   * 코드를 여기 두는 걸로 위험이 늘지 않아요. 대신 모달을 닫았다 열어도
   * 코드를 다시 볼 수 있어요 — 예전엔 다시 보려면 새로 발급하는 수밖에 없어서,
   * 적어두기 전에 실수로 닫으면 그대로 잃었어요. */
  var CODE_KEY = "grow-cloud-code";

  function codeBlock(code) {
    return '<code class="cloud-code" id="cloud-code">' + esc(code) + '</code>' +
      '<button class="btn btn-ghost cloud-copy" id="cloud-copy">📋 코드 복사</button>' +
      '<p>이 코드를 다른 기기의 "불러오기"에 붙여넣으세요.<br/>' +
      '기기 여러 대에 몇 번이든 쓸 수 있고, 새 코드를 발급하면 그때 무효가 돼요.<br/>' +
      '복사가 안 되면 위 코드를 길게 눌러 직접 복사하시면 돼요.</p>';
  }
  function wireCopy(ov, code) {
    var b = ov.querySelector("#cloud-copy");
    if (b) b.onclick = function () { copyCode(code, ov, b); };
  }

  function copyCode(code, ov, btn) {
    var ok = function () { flashCopied(btn); };
    var no = function () { selectCode(ov); _toast("코드를 길게 눌러 직접 복사해주세요"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { navigator.clipboard.writeText(code).then(ok, no); return; } catch (e) {}
    }
    no();
  }

  /* cloud_claim이 성공한 직후에 부르는 장부 정리.
   *
   * claim은 이 기기의 토큰을 **상대 계정으로 옮겨 붙여요.** 원래 계정은 설계상 버려져요.
   * 그런데 여태 쌓아둔 grow-cloud-synced-* 는 전부 그 버려진 계정 기준의 시각이에요.
   * 그대로 두면 5.3 판정이 옛 계정의 도장과 새 계정의 행을 비교하게 돼요 — 거짓말이죠.
   *
   * 여기서 정리하지 않으면 연결 화면을 못 끝냈을 때(cloud_pull 실패, 닫기, 바깥 탭)
   * 로컬에만 있던 기록이 다음 실행에서 dirty=false + syncKey 없음/엉뚱함 → "pull"로 떨어져
   * **묻지도 않고** 서버 사본으로 덮여 사라져요. 코드는 1회용이라 화면을 다시 열 수도 없고,
   * 옛 계정은 닿을 수 없어요. 되돌릴 방법이 없는 손실이에요.
   *
   * 그래서 로컬에 기록이 있는 게임은 전부 "사람이 정해야 함"(dirty=1 + 도장 없음)으로
   * 되돌려, 스펙 6.2가 약속한 대로 다음 실행에서 충돌 화면을 반드시 거치게 해요.
   * 기록이 없는 게임은 잃을 게 없으니 dirty로 찍지 않아요 — 찍으면 빈 꾸러미가
   * 올라가서 반대편 기기의 진짜 기록을 지워요. (도장만 지워 두면 pull이 정상 동작해요)
   *
   * 연결 화면의 확인 버튼은 어차피 다루는 게임마다 두 값을 다시 써주니 영향이 없어요. */
  function orphanLedger() {
    GAMES.forEach(function (g) {
      try { localStorage.removeItem(syncKey(g)); } catch (e) {}
      if (hasData(collect(g))) set(dirtyKey(g), "1");
    });
    // 방금 dirty로 세운 게임들은 곧바로 배경 전송의 표적이 돼요(visibilitychange·touch).
    // 연결 화면이 결론 날 때까지 붙잡아 둡니다.
    // cloud_pull이 실패해 화면조차 못 띄운 경우에는 물어볼 기회가 아예 없으니
    // 이번 실행 내내 붙잡아 둬요 — 장부는 dirty로 남아 다음 실행에서 다시 물어봐요.
    holdDecision(GAMES);
  }

  function openModal() {
    var kept = get(CODE_KEY);          // 지난번에 발급한 코드 (있으면 그대로 보여줘요)
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
      (kept
        ? '<div id="cloud-out">' + codeBlock(kept) + '</div>' +
          '<button class="btn btn-ghost" id="cloud-issue">🔄 새 코드 발급 (옛 코드로는 더 못 들어와요)</button>'
        : '<button class="btn btn-primary" id="cloud-issue">🔗 연동 코드 발급</button>' +
          '<div id="cloud-out"></div>') +
      '<hr class="cloud-sep"/>' +
      '<p>다른 기기에서 쓰던 코드가 있나요?</p>' +
      '<div class="cloud-row">' +
        '<input id="cloud-code-input" placeholder="코드를 붙여넣으세요" autocomplete="off"/>' +
        '<button class="btn btn-ghost" id="cloud-claim">불러오기</button>' +
      '</div><div id="cloud-msg"></div>' +
      '<div id="cloud-linked"></div>'
    );
    if (kept) wireCopy(ov, kept);

    /* 이미 연결된 기기라면 코드가 더 필요 없어요.
     * 확인 화면에서 취소하고 다시 하려던 분들이 실패로 오해했어요 —
     * 실은 코드를 넣은 순간 연결은 이미 끝나 있어요.
     * 서버에 내 계정 기록이 있으면 코드 없이 그 화면을 다시 열 수 있게 해줘요. */
    (function () {
      var tok = token();
      if (!tok) return;
      rpc("cloud_meta", { p_token: tok }).then(function (rows) {
        var box = ov.querySelector("#cloud-linked");
        if (!box || !rows || !rows.length) return;

        /* 정할 게 남았을 때만 버튼을 띄워요.
         * 늘 세워두면 아직 결정이 밀려 있는 것처럼 읽혀요 — 실제로는 겹치는 게임이
         * 없으면 각 게임을 열 때 알아서 받아와서 물어볼 게 없어요.
         * 겹침 판정은 meta만으로 돼요 (본문 없이 어느 게임이 서버에 있는지만 알면 되니까요). */
        var both = [];
        (rows || []).forEach(function (r) {
          var g = String(r.game).replace(/^beta:/, "");
          if (SAVE[g] && Object.keys(collect(g)).length) both.push(g);
        });

        box.innerHTML = '<hr class="cloud-sep"/>' +
          '<p>이 기기는 이미 연결돼 있어요. 코드를 다시 넣지 않아도 돼요.</p>' +
          (both.length
            ? '<p>양쪽 모두 기록이 있는 게임이 ' + both.length + '개 있어요. 어느 쪽을 남길지 정해주세요.</p>' +
              '<button class="btn btn-ghost" id="cloud-relink">📂 어느 기록을 남길지 고르기</button>'
            : '<p>겹치는 기록은 없어요. 각 게임을 열면 알아서 맞춰져요.</p>');
        var relink = box.querySelector("#cloud-relink");
        if (relink) relink.onclick = function () { closeModal(); openLink(); };
      }).catch(function () {});
    })();

    ov.querySelector("#cloud-issue").onclick = function () {
      var btn = this;
      var tok = token();
      if (!tok) { ov.querySelector("#cloud-out").innerHTML = '<p>⚠️ 이 브라우저에서는 코드를 발급할 수 없어요.</p>'; return; }
      btn.disabled = true;
      rpc("cloud_issue", { p_token: tok }).then(function (code) {
        set("grow-cloud-issued", "1");
        set(CODE_KEY, code);                     // 다시 열어도 볼 수 있게 이 기기에 남겨둬요
        pushAll();                               // 코드를 받는 순간 8종을 다 올려둬요
        ov.querySelector("#cloud-out").innerHTML = codeBlock(code);
        wireCopy(ov, code);
        btn.disabled = false;
        btn.className = "btn btn-ghost";
        btn.textContent = "🔄 새 코드 발급 (옛 코드로는 더 못 들어와요)";
        // 되는 브라우저(데스크톱·안드로이드)에서는 바로 복사해줘요. iOS에서 막히면
        // 위 복사 버튼이 받아주니, 여기서는 실패해도 화면을 어지럽히지 않아요.
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            navigator.clipboard.writeText(code).then(function () {
              flashCopied(ov.querySelector("#cloud-copy"));
            }, function () {});
          } catch (e) {}
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
      rpc("cloud_claim", { p_token: tok, p_code: v }).then(function (res) {
        /* 서버가 사유를 알려줘요. 예전엔 true/false뿐이라 "이 기기에서 발급한 코드"까지
         * "맞지 않거나 이미 사용됐어요"로 뭉뚱그려 안내했어요. */
        var ok = res === true || (res && res.ok === true);
        if (!ok) {
          var why = res && res.reason;
          msg.innerHTML = why === "same_device"
            ? '<p>이 기기에서 발급한 코드예요. <b>다른 기기</b>의 "불러오기"에 붙여넣어 주세요.<br/>' +
              '코드는 그대로 살아 있어요.</p>'
            : '<p>⚠️ 코드를 찾을 수 없어요.<br/>' +
              '오타가 없는지 확인해주세요. 그 기기에서 <b>새 코드를 발급</b>했다면 ' +
              '옛 코드는 무효예요.<br/>' +
              '이미 연결하셨다면 아래 "어느 기록을 남길지 고르기"를 쓰시면 돼요.</p>';
          return;
        }
        // 계정이 바뀌었으니 내가 갖고 있던 코드는 이제 남의 계정 것이에요
        try { localStorage.removeItem(CODE_KEY); } catch (e) {}
        set("grow-cloud-issued", "0");
        orphanLedger();
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
    rookie: "⚾ 야구", idol: "🎤 아이돌", stock: "📈 주식", dev: "💻 개발자",
    chef: "🍳 요리사", stream: "📺 스트리머", soccer: "⚽ 축구", unicorn: "🦄 유니콘",
  };

  /* 한 줄 요약 — "설명"만 담당해요. "있냐 없냐"는 hasData()가 따로 봅니다.
   *
   * 저장 모양이 게임마다 달라요. 8종 중 7종은 SAVE[게임]+"-slots"에 슬롯 맵을 써요
   *   { 슬롯id: { …게임상태…, savedAt: <ms> }, … }
   * 그런데 이 슬롯 이사는 **그 게임 페이지를 열 때** 한 번 일어나요. 이사 전부터
   * 안 열어본 게임은 아직 평키(SAVE[게임])에만 기록이 있고, 환생 유산(-legacy)이나
   * 대전 기록(grow-battle-*)만 가진 사람도 있어요. 이걸 "없음"으로 말해버리면
   * 그 게임은 "서버에만 있음"으로 분류돼 고를 기회도 없이 지워져요.
   * 그래서 여기서는 어떤 경우에도 "있는 걸 없다고" 하지 않아요.
   *   ① 슬롯 맵의 최신 슬롯 → ② 평키 → ③ 그래도 못 읽으면 "기록 있음"
   * 대표 슬롯은 각 게임 game.js의 slotDesc/showSlotPicker와 같은 규칙 —
   * savedAt이 가장 최근인 슬롯이에요.
   * unicorn만 평키 하나에 상태를 통째로 담아요. */
  /* 캐릭터 세이브는 없고 곁가지 기록만 남은 기기예요.
   * 이걸 그냥 "기록 있음"이라고 하면 진짜 커리어와 글자 그대로 똑같이 보여요.
   * 그러면 기본 선택(이 기기)을 그대로 받아들인 사람이 반대편 기기의 진짜 커리어를
   * 이 껍데기로 덮어쓰고, 그 기기는 다음에 켤 때 묻지 않는 pull로 자기 기록을 지워요.
   * 존재 판정은 그대로 두고(있는 걸 없다고 하면 안 되니까) 무엇이 있는지만 말해줘요. */
  function sideOnly(game, obj) {
    var parts = [];
    if (game === "unicorn") {
      if (obj["unicorn-founded"] != null) parts.push("창업 흔적");
    } else if (obj[SAVE[game] + "-legacy"] != null) {
      parts.push("환생 유산");
    }
    if (BATTLE[game] && obj[BATTLE[game]] != null) parts.push("대전 기록");
    if (!parts.length) return null;
    return parts.join("·") + "만 있어요";
  }

  /* 이 꾸러미가 마지막으로 저장된 시각. 8종 모두 세이브 안에 savedAt을 넣어요.
   * 슬롯 맵이면 가장 최근 슬롯의 값, 평키면 그 값이에요. 못 찾으면 0.
   *
   * 기기 시계라 완벽하진 않아요. 하지만 "어느 쪽이 더 진행됐나"를 알려면
   * 결국 세이브가 스스로 말해주는 시각을 볼 수밖에 없어요. 서버 updated는
   * '언제 올렸나'라서, 오래된 세이브를 방금 올린 기기가 이겨버려요. */
  function progressAt(game, obj) {
    if (!obj) return 0;
    var best = 0;
    var take = function (raw) {
      if (!raw) return;
      try {
        var v = JSON.parse(raw);
        if (!v || typeof v !== "object") return;
        if (typeof v.savedAt === "number") { if (v.savedAt > best) best = v.savedAt; return; }
        Object.keys(v).forEach(function (k) {          // 슬롯 맵
          var st = v[k];
          if (st && typeof st === "object" && typeof st.savedAt === "number" && st.savedAt > best) best = st.savedAt;
        });
      } catch (e) { /* 못 읽으면 판단 근거가 없는 거예요 */ }
    };
    take(obj[SAVE[game] + "-slots"]);
    take(obj[SAVE[game]]);
    return best;
  }

  function summarize(game, obj) {
    if (!obj || typeof obj !== "object" || !Object.keys(obj).length) return null;
    var f = SUMMARY[game];
    var one = function (st) {
      if (!st || typeof st !== "object") return null;
      try { return f ? f(st) : "기록 있음"; } catch (e) { return "기록 있음"; }
    };
    // 평키 — 7종에서는 이사 전 기록, unicorn에서는 유일한 저장 위치예요
    var flat = function () {
      var raw = obj[SAVE[game]];
      if (!raw) return null;
      try { return one(JSON.parse(raw)); } catch (e) { return "기록 있음"; }
    };

    if (game === "unicorn") return flat() || sideOnly(game, obj) || "기록 있음";

    var rawSl = obj[SAVE[game] + "-slots"];
    var sl = null, broken = false;
    if (rawSl) {
      try { sl = JSON.parse(rawSl); } catch (e) { broken = true; }
    }
    if (broken) return flat() || "기록 있음";

    if (sl && typeof sl === "object") {
      var ids = Object.keys(sl);
      var best = null;
      ids.forEach(function (id) {
        var st = sl[id];
        if (!st || typeof st !== "object") return;
        if (best === null || (st.savedAt || 0) > (sl[best].savedAt || 0)) best = id;
      });
      var txt = best === null ? null : one(sl[best]);
      if (txt) {
        // 캐릭터를 여러 명 키우는 사람이 있어요. 대표 한 명만 보이면 "이거 하나뿐인가?"
        // 싶어서 나머지를 날려버릴 수 있으니 몇 개인지 같이 알려줘요.
        if (ids.length > 1) txt += " · 캐릭터 " + ids.length + "명";
        return txt;
      }
      // 슬롯 맵이 비어 있어요 = 게임이 스스로 "캐릭터 없음"이라 적어둔 상태예요.
      // 이건 못 읽은 게 아니라서, 평키에 남은 게 없으면 설명할 내용이 없어요.
      // (그래도 키 자체는 있으니 화면에서는 hasData/describe가 받아줘요)
      return flat() || sideOnly(game, obj);
    }
    // 슬롯 키 자체가 없어요. 평키도 없다면 남은 건 곁가지 기록뿐이에요.
    return flat() || sideOnly(game, obj) || "기록 있음";
  }

  // "있냐 없냐"는 백업 대상과 똑같은 기준으로 봐요.
  // collect()가 담아 올리는 게 있다면, 화면은 절대 "이 기기엔 없음"이라고 말하면 안 돼요.
  function hasData(obj) { return !!obj && typeof obj === "object" && Object.keys(obj).length > 0; }
  // 화면에 쓸 문구. 있는데 설명을 못 만들면 "기록 있음"으로라도 보여줘요.
  function describe(game, obj) {
    if (!hasData(obj)) return null;
    var txt = summarize(game, obj) || sideOnly(game, obj) || "기록 있음";
    /* 커리어와 환생 유산이 한 기기에 같이 있는 경우가 있어요.
     * 한쪽을 고르면 게임이 통째로 바뀌므로(5.3, 섞지 않아요) 유산도 같이 사라지는데,
     * 요약이 커리어만 말하면 사라진다는 걸 아무도 모른 채 고르게 돼요.
     * 동작을 바꾸지는 않고(통째 교체가 의도한 방식이에요) 무엇이 걸려 있는지만 덧붙여요.
     * 곁가지만 있는 기기는 sideOnly가 이미 "환생 유산…"이라고 말하니 겹쳐 쓰지 않아요. */
    var lk = game === "unicorn" ? null : SAVE[game] + "-legacy";
    if (lk && obj[lk] != null && txt.indexOf("환생 유산") === -1) txt += " · 환생 유산도 함께";
    return txt;
  }

  /* 스펙 5.4·6.2의 "(2시간 전)".
   * 여기서만 기기 시계를 써요. 시계가 틀어져 있으면 이 문구만 어긋나고
   * 판정(decide/openLink)은 서버가 찍어준 두 시각만 비교하니 영향이 없어요. */
  function ago(iso) {
    var t = Date.parse(iso);
    if (!t) return "";
    var m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return "방금 전";
    if (m < 60) return m + "분 전";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "시간 전";
    var d = Math.floor(h / 24);
    if (d < 30) return d + "일 전";
    if (d < 365) return Math.floor(d / 30) + "개월 전";
    return Math.floor(d / 365) + "년 전";
  }
  // 화면에 붙일 조각. 읽을 수 없는 시각이면 아무것도 안 붙여요.
  function agoTag(iso) {
    var s = ago(iso);
    return s ? ' <span class="cloud-ago">(' + esc(s) + ')</span>' : "";
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
        var mine = describe(g, collect(g));
        var theirs = remote[g] ? describe(g, remote[g].data) : null;
        if (mine && theirs) {
          // 기본 선택은 **언제나 이 기기**예요.
          //
          // 스펙 6.2는 "서버가 더 최신이면 다른 기기"라고 적었지만, 이 화면에 오는 길은
          // 코드 넣기(claim) 직후 하나뿐이고 그 세 줄 위에서 orphanLedger()가
          // grow-cloud-synced-* 를 전부 지워요. 비교할 도장이 남아 있지 않아요.
          // 설령 남았더라도 그건 claim으로 버려진 **옛 계정** 기준 시각이라,
          // 새 계정의 updated와는 애초에 견줄 수 없는 값이에요.
          // 비교할 수 없는 두 시각을 억지로 재는 대신, 잃으면 되돌릴 수 없는 쪽
          // (아직 서버에 사본이 없는 이 기기)을 기본으로 둡니다.
          pick.push({ g: g, mine: mine, theirs: theirs, when: remote[g].updated });
        } else if (theirs) auto.push({ g: g, from: "다른 기기", txt: theirs, when: remote[g].updated });
        else if (mine) auto.push({ g: g, from: "이 기기", txt: mine, when: null });
      });

      var html = '<p class="av-title">🔗 기기를 연결했어요</p>' +
        (pick.length
          ? '<p class="cloud-note">연결은 이미 끝났어요. 여기서는 <b>어느 기록을 남길지</b>만 정해요.</p>'
          : '<p class="cloud-note">연결은 이미 끝났어요.</p>');
      if (auto.length) {
        // "양쪽을 맞춘다"고 하면 안 돼요. 이 기기에만 있는 기록은 그 게임을 열어야
        // 서버로 올라가서, 지금 당장 반대편 기기에 보이지는 않아요.
        html += '<p>' + (pick.length ? '한쪽에만 있는 기록이에요. ' : '') +
                '다른 기기 것은 지금 가져오고, 이 기기 것은 그 게임을 열 때 서버로 올라가요.</p>';
        auto.forEach(function (a) {
          html += '<div class="cloud-pick">' + esc(LABEL[a.g]) + ' — ' + esc(a.txt) +
                  ' <span class="cloud-ago">(' + a.from + ')</span>' + agoTag(a.when) + '</div>';
        });
      }
      /* 양쪽 다 아무것도 없을 때. 고를 것도 가져올 것도 없는데 예전엔
       * "고른 대로 기록 맞추기"만 덩그러니 떠서, 뭘 하라는 건지 알 수 없었어요. */
      if (!auto.length && !pick.length) {
        var ovEmpty = shell(
          '<p class="av-title">🔗 기기를 연결했어요</p>' +
          '<p>아직 양쪽 어디에도 저장된 기록이 없어요.<br/>' +
          '게임을 한 번 진행하면 자동으로 백업되고, 다른 기기에서도 이어서 할 수 있어요.</p>',
          "확인"
        );
        return ovEmpty;
      }
      if (pick.length) html += '<p>⚠️ 양쪽 모두 기록이 있어요. 어느 쪽을 남길지 골라주세요. 고르지 않은 쪽은 사라져요.</p>';
      pick.forEach(function (p) {
        html += '<div class="cloud-pick"><b>' + esc(LABEL[p.g]) + '</b>' +
          '<label><input type="radio" name="pk-' + p.g + '" value="mine" checked/> 이 기기 — ' + esc(p.mine) + '</label>' +
          '<label><input type="radio" name="pk-' + p.g + '" value="theirs"/> 다른 기기 — ' + esc(p.theirs) +
            agoTag(p.when) + '</label>' +
          '</div>';
      });
      // 고를 게 없으면 "고른 대로"라고 하지 않아요 — 그냥 가져오는 것뿐이에요.
      /* 고를 게 없으면 갈래를 주지 않아요.
       * "나중에 하기"를 눌러도 각 게임을 열 때 어차피 자동으로 받아와서 결과가 같아요.
       * 결과가 같은 두 버튼은 고민만 시켜요. */
      html += '<button class="btn btn-primary" id="cloud-done">' +
        (pick.length ? "고른 대로 기록 맞추기" : "확인") + '</button>';

      var ov = shell(html, pick.length ? "나중에 정하기" : "");
      // 붙잡는 건 orphanLedger()가 claim 직후에 이미 해뒀어요. 여기서는 풀지 않아요 —
      // 아래 확인 버튼(= 사람이 실제로 고른 순간)에서만 풀어줘요.
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
        //
        // 여기 찍는 시각은 위 cloud_pull이 돌려준 값이라, 화면을 보는 동안 다른 기기가
        // 같은 게임을 올렸다면 이미 지난 시각이에요. 그래도 안전한 쪽으로 틀려요 —
        // 서버가 우리 도장보다 새로우니 다음 실행에서 pull이나 충돌 화면으로 이어지고,
        // 어느 쪽도 사용자에게 묻지 않고 기록을 지우지 않아요.
        // (지금 응답의 시각으로 다시 받아오면 그 사이 변경을 조용히 삼키게 돼요)
        var writeFail = false;
        pulled.forEach(function (g) {
          var row = remote[g];
          if (!row || !hasData(row.data)) {
            set(dirtyKey(g), "1");   // 서버가 비어 있었어요 — 지우지 말고 이 기기 것을 올려요
            return;
          }
          if (!apply(g, row.data)) {
            // 저장소에 못 썼어요. 장부를 건드리지 않아요 — orphanLedger()가 세워둔
            // "결정 필요"(dirty=1 · 도장 없음)가 그대로 남아 다음 실행에서 다시 물어봐요.
            writeFail = true;
            return;
          }
          set(syncKey(g), String(row.updated));
          set(dirtyKey(g), "0");
        });
        // 이 기기 것을 남긴 게임만 올릴 거리가 있어요.
        // 한 번도 안 해본 게임까지 dirty로 찍으면 빈 {}가 올라가서
        // 반대편 기기의 진짜 기록이 지워져요. 그래서 여기만 표시해요.
        // 주의: 여기서 실제로 올라가는 건 지금 열려 있는 게임 하나뿐이에요.
        // 나머지는 dirty 표시만 남고, 그 게임 페이지를 열 때 init()이 올려요.
        // 그래서 안내 문구도 "지금 양쪽이 같아진다"고 말하면 안 돼요.
        kept.forEach(function (g) {
          set(dirtyKey(g), "1");
          // 서버 쪽 버전을 "이미 보고 이 기기 것으로 정했다"고 적어둬요.
          // 이걸 빼먹으면 다음에 켤 때 dirty × 서버가-더-최신이 다시 성립해서
          // 방금 고른 게임이 또 충돌 화면으로 올라와요.
          // 위와 같은 이유로 이 시각도 화면을 여는 순간의 값이에요. 그 사이 서버가 움직였다면
          // 충돌 화면이 한 번 더 뜰 뿐, 안전한 쪽으로 틀려요.
          var row = remote[g];
          if (row && row.updated) set(syncKey(g), String(row.updated));
        });

        // 사람이 골랐어요 — 이제 배경 전송을 풀어줘도 사용자 대신 누르는 게 아니에요
        releaseDecision(GAMES);
        closeModal();
        // 못 쓴 게 있으면 "정리했어요"라고 말하면 안 돼요. 장부는 그대로라 다음 실행에서
        // 다시 물어보고, 이 기기 기록은 아직 그대로 있어요.
        _toast(writeFail
          ? "일부는 이 기기에 저장하지 못했어요. 저장 공간을 비우고 다시 시도해주세요"
          : "골라주신 대로 정리했어요");
        reloadSoon(700);
      };
    }).catch(function () { _toast("불러오기에 실패했어요"); });
  }

  /* 충돌 — 같은 게임을 두 기기에서 각각 진행했을 때.
   * 서버 시각은 아래 cloud_pull이 돌려주는 값(rows[0].updated)을 그대로 써요.
   * 부르는 쪽이 알고 있던 시각을 또 받지 않아요 — 안 쓰면서 받으면 헷갈리니까요. */
  function onConflict(game) {
    var mine = describe(game, collect(game));
    var tok = token();
    if (!tok) return; // 기기 정체성이 없으면 클라우드는 조용히 쉬어요
    // 아래 왕복이 돌아오기 전에도 이 게임은 손대지 않아요. init()에서 이미 붙잡았지만
    // 밖에서 직접 부를 수도 있으니(window.Cloud.onConflict) 여기서 한 번 더 세워둬요.
    holdDecision([game]);
    rpc("cloud_pull", { p_token: tok, p_game: tag(game) }).then(function (rows) {
      // 아래 두 갈래(서버 행 없음 · 로컬 없음)는 사람이 고른 게 아니라서 붙잡은 걸 풀지 않아요.
      // 어차피 잃을 게 없어요 — 로컬이 비었으면 push()가 빈 꾸러미를 걸러내고,
      // 서버 행이 없으면 다음 실행에서 그냥 push로 떨어져요.
      if (!rows || !rows.length) return;
      var theirs = describe(game, rows[0].data);

      /* 이 기기에 아무것도 없는데 dirty만 서 있는 경우가 실제로 있어요.
       * (연결 화면에서 '다른 기기'로 고른 게임의 서버 꾸러미가 비어 있었던 경우 등)
       * 이때 충돌 화면을 띄우면 "이 기기 — 기록 없음"을 고르라고 하는 꼴이고,
       * 그 버튼은 push()가 빈 꾸러미를 걸러 아무것도 안 하면서 "올렸어요"라고
       * 거짓말한 뒤 깃발을 그대로 둬요 → 켤 때마다 같은 화면이 영원히 돌아와요.
       * 고를 게 없으면 물을 것도 없어요. 잃을 로컬이 없으니 서버 것을 받고 장부만 맞춰요. */
      if (!mine) {
        if (!hasData(rows[0].data)) {
          // 양쪽 다 비었어요 — 잃을 게 없으니 장부만 맞춰 같은 화면이 반복되지 않게 해요
          set(syncKey(game), String(rows[0].updated));
          set(dirtyKey(game), "0");
          return;
        }
        // 저장소에 못 썼으면 장부를 건드리지 않아요 — 받지도 못한 기록과 "같다"고
        // 적어두면 다음 전송이 반대편 기기의 진짜 기록을 덮어써요.
        if (!apply(game, rows[0].data)) return;
        set(syncKey(game), String(rows[0].updated));
        set(dirtyKey(game), "0");
        toast("☁️ 다른 기기 기록을 불러왔어요");
        reloadSoon(900);
        return;
      }

      /* 어느 쪽이 더 최근에 저장됐는지 알 수 있으면 묻지 않고 최신으로 맞춰요.
       * 기기를 오가며 플레이하면 이 상황이 매번 생기는데, 그때마다 똑같아 보이는
       * 두 줄을 놓고 고르라고 하면 쓸 수가 없어요. 판단이 설 때만 자동으로 하고,
       * 못 가릴 때(시각이 없거나 같을 때)만 아래 화면으로 물어봐요. */
      var mineAt = progressAt(game, collect(game));
      var theirsAt = progressAt(game, rows[0].data);
      /* 단, 이 게임을 한 번도 올린 적 없으면(도장 없음) 절대 자동으로 정하지 않아요.
       * 그건 "두 기기가 같은 줄기를 나눠 가진" 상황이 아니라, 이 기기에만 있는
       * 기록을 처음 만난 상황이에요. 옛 폰에 몇 달치가 남아 있는데 새 폰에서 오늘
       * 조금 한 게 더 최근이라고 덮으면 되돌릴 수 없어요. */
      var everSynced = !!get(syncKey(game));
      if (everSynced && mineAt && theirsAt && mineAt !== theirsAt) {
        if (theirsAt > mineAt) {
          if (!apply(game, rows[0].data)) return;
          set(syncKey(game), String(rows[0].updated));
          set(dirtyKey(game), "0");
          releaseDecision([game]);
          toast("☁️ 더 최근에 진행한 기록으로 맞췄어요");
          reloadSoon(900);
        } else {
          // 이 기기가 더 최근이에요. 올리면 반대편이 다음에 켤 때 받아가요.
          releaseDecision([game]);
          push(game);
          toast("☁️ 이 기기 기록이 더 최근이라 그대로 둬요");
        }
        return;
      }

      var ov = shell(
        '<p class="av-title">⚠️ 두 기기에서 각각 진행됐어요</p>' +
        '<p class="cloud-note">어느 쪽이 더 최근인지 알 수 없어서 여쭤봐요.</p>' +
        '<div class="cloud-pick">이 기기 &nbsp; ' + esc(LABEL[game]) + ' — ' + esc(mine) + '</div>' +
        '<div class="cloud-pick">다른 기기 &nbsp; ' + esc(LABEL[game]) + ' — ' + esc(theirs || "기록 없음") +
          agoTag(rows[0].updated) + '</div>' +
        '<button class="btn btn-primary" id="cloud-keep">이 기기 것 쓰기</button>' +
        '<button class="btn btn-ghost" id="cloud-take">다른 기기 것 쓰기</button>'
      );
      // 아직 안 끝난 일을 끝났다고 말하지 않아요. push()는 실패를 삼키니
      // 성공 여부는 장부(dirty)가 대신 말해줘요. (토스트가 떠 있는 동안은 동기화 알약이
      // 자리를 양보하므로, 실패를 여기서 말해주지 않으면 사용자는 영영 알 수 없어요)
      ov.querySelector("#cloud-keep").onclick = function () {
        closeModal();
        _toast("이 기기 기록을 올리는 중이에요");
        releaseDecision([game]);   // 사람이 골랐어요 — 바로 아래 전송이 나갈 수 있게 풀어줘요
        push(game).then(function () {
          if (get(dirtyKey(game)) === "0") _toast("이 기기 기록을 올렸어요");
          else _toast("지금은 서버에 못 보냈어요. 다음에 다시 시도할게요");
        });
      };
      ov.querySelector("#cloud-take").onclick = function () {
        releaseDecision([game]);   // 사람이 골랐어요
        if (!hasData(rows[0].data)) {
          // 서버가 빈 꾸러미였어요 — 지우지 않고 이 기기 것을 지켜요
          closeModal();
          _toast("다른 기기에 가져올 기록이 없어요");
          return;
        }
        if (!apply(game, rows[0].data)) {
          // 저장소에 못 썼어요. 도장을 찍지 않아 다음 실행에서 다시 물어봐요.
          closeModal();
          _toast("이 기기에 저장하지 못했어요. 저장 공간을 비우고 다시 시도해주세요");
          return;
        }
        set(syncKey(game), String(rows[0].updated));
        set(dirtyKey(game), "0");
        closeModal();
        reloadSoon(400);
      };
    }).catch(function () {});
  }

  window.Cloud = {
    init: init, touch: touch, mark: mark, settle: settle,
    openModal: openModal, onConflict: onConflict,
    _toast: _toast, _pull: pullAndApply,
  };
  window.Cloud._t = {
    token: token, keysOf: keysOf, collect: collect, apply: apply, writeKeys: writeKeys,
    rpc: rpc, tag: tag, decide: decide, summarize: summarize, openLink: openLink,
    hasData: hasData, describe: describe, syncStart: syncStart, syncEnd: syncEnd,
    sideOnly: sideOnly, ago: ago, orphanLedger: orphanLedger,
    // 검증용 — 진행 표시의 대기/천장 시간을 줄여 천장 동작을 몇 초 안에 확인해요
    setSyncTiming: function (wait, max) { SYNC_WAIT = wait; SYNC_MAX = max; },
  };
})();
