/* 서버가 알려주는 "이 행을 마지막으로 올린 기기"(mine) 검증.
 *
 * 새 브라우저로 몇 판 하고 타이틀로 돌아왔더니 "두 기기에서 각각 진행됐어요"가
 * **자기 자신과** 떴다. 화면을 떠날 때 나가는 전송(pagehide)은 keepalive라 서버엔
 * 닿는데, 페이지가 사라져서 "올렸다"고 적는 .then이 안 돈다. 다음에 켜면
 * 서버가 더 최신 + 로컬은 '안 올림' → decide()가 conflict라고 말한다.
 *
 * 저장 시각으로는 이걸 다 못 막는다. 올린 뒤 한 판 더 하면 시각이 달라져서
 * "같은 세이브" 지름길이 안 먹는다. 누가 썼는지는 시계와 무관하게 정확하다.
 * 그래서 cloud_meta/cloud_pull이 행마다 mine(불리언)을 실어 보내고,
 * 내가 쓴 행이면 충돌일 수가 없다고 본다.
 *
 * 픽스처는 디스크의 실제 저장 모양으로 만든다 —
 *   7종: <SAVE_KEY>-slots 에 슬롯 맵 { 슬롯id: {…, savedAt} }
 *   unicorn: <SAVE_KEY> 평키 하나에 savedAt
 * savedAt 하나로 갈래가 갈리니 값마다 왜 그 값인지 적어둔다.
 *
 * CLOUD 환경변수로 검사 대상 파일을 바꿀 수 있다 (수정 전 파일로 돌려 실패를 먼저 확인하려고).
 *   CLOUD=/…/cloud-before.js node cloud-writer-test.js
 */
"use strict";
const fs = require("fs");
const { JSDOM, VirtualConsole } = require(__dirname + "/jsdom.js");
const CLOUD = process.env.CLOUD || "/workspace/grow-games/beta/cloud.js";
const SRC = fs.readFileSync(CLOUD, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const group = (t) => console.log(`\n— ${t}`);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 25));

// ---------- 픽스처 (실제 저장 모양) ----------
const blob = (o) => JSON.stringify(o);
/* rookie(7종 대표) — 슬롯 맵.
 *   5000: 이 기기가 pagehide에서 올린 그 세이브
 *   9000: 그걸 올린 **뒤에** 한 판 더 한 세이브 (시각이 달라져 "같은 세이브" 지름길이 못 잡는다)
 *   7000: 다른 기기가 올린 남의 세이브 (5000보다 크고 9000보다 작다 — 방향을 골라 쓸 수 있게)
 *   시각 없음: 아주 옛날 세이브. progressAt()이 0을 돌려줘 견줄 근거가 없어진다. */
const R_5000 = blob({ s1700000000001: { name: "김루키", phase: "hs", year: 1, pos: "batter", region: "seoul", savedAt: 5000 } });
const R_9000 = blob({ s1700000000001: { name: "김루키", phase: "hs", year: 2, pos: "batter", region: "seoul", savedAt: 9000 } });
const R_7000 = blob({ s1700000000077: { name: "남의폰", phase: "pro", proYear: 3, pos: "batter", savedAt: 7000 } });
const R_NOTIME = blob({ s1700000000055: { name: "옛기록", phase: "hs", year: 3, pos: "batter" } });
// unicorn — 평키 하나. progressAt()이 슬롯 맵과 다른 길로 읽으니 저장 모양을 둘 다 본다.
const U_6000 = blob({ company: "코스모", code: 1234, bestRun: 7e10, exits: 2, savedAt: 6000 });
const U_8000 = blob({ company: "코스모", code: 1234, bestRun: 9e10, exits: 3, savedAt: 8000 });

// 서버가 말하는 시각 (기기 시계와 무관한 문자열이다)
const UP = "2026-07-27T09:00:00Z";       // 서버 행이 마지막으로 바뀐 시각
const OLD = "2026-07-27T01:00:00Z";      // 예전에 찍어둔 도장
const PUSHED = "2026-07-27T10:00:00Z";   // 이번에 올려서 새로 받은 시각

function mk(routes, opt) {
  const vc = new VirtualConsole();   // jsdom의 location.reload 미구현 경고를 삼킨다
  const dom = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only", url: "https://x.test/" + ((opt && opt.dir) || "rookie") + "/", virtualConsole: vc,
  });
  const { window } = dom;
  window.GROW_ENV = { beta: true };
  window.Match = { cfg: { url: "https://x.test", key: "anon" } };
  const calls = [];
  window.fetch = (url, o) => {
    const fn = String(url).split("/rpc/")[1];
    const body = JSON.parse(o.body);
    calls.push({ fn, body });
    const h = routes && routes[fn];
    if (h === undefined) return Promise.reject(new Error("route 없음: " + fn));
    const v = typeof h === "function" ? h(body) : h;
    return Promise.resolve(v && typeof v.then === "function"
      ? v.then((x) => ({ ok: true, json: () => Promise.resolve(x) }))
      : { ok: true, json: () => Promise.resolve(v) });
  };
  window.eval(SRC);
  return { window, calls, LS: window.localStorage, $: (s) => window.document.querySelector(s) };
}

const pushesFor = (calls, game) =>
  calls.filter((c) => c.fn === "cloud_push" && c.body.p_game === "beta:" + game);
const modalText = ($) => ($(".cloud-modal") ? $(".cloud-modal").textContent.replace(/\s+/g, " ").trim() : "");
const stalled = () => new Promise(() => {});   // 서버엔 닿았는데 응답이 영영 안 오는 전송
// 슬롯 맵에서 가장 늦은 savedAt (제품 코드를 빌리지 않고 픽스처만 보고 센다)
const newest = (raw) => Object.values(JSON.parse(raw)).reduce((m, s) => Math.max(m, s.savedAt || 0), 0);

(async function () {
  // ============================================================
  group("1) 내가 쓴 행 + 올릴 거리 있음 → 묻지 않고, 도장을 찍고, 올린다");
  {
    /* 전송이 걸린 채로 둔다 = 가드가 **스스로** 찍는 도장만 남는다.
     * (전송이 성공하면 push()가 도장을 다시 덮어써서 무엇이 찍었는지 못 가린다) */
    const { window, calls, LS, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: true }],
      // 가드가 무너지면 여기까지 와서 화면이 떠야 한다 — 길을 막아두면 실패가 안 보인다
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: true, data: { "rookie-save-v1-slots": R_5000 } }],
      cloud_push: stalled,
    });
    LS.setItem("rookie-save-v1-slots", R_9000);   // 올린 뒤 한 판 더 했다 (서버 5000 ≠ 로컬 9000)
    LS.setItem("grow-cloud-dirty-rookie", "1");   // 도장은 없다 = 한 번도 못 찍었다
    check(window.Cloud._t.decide("rookie", UP) === "conflict",
      "판정 자체는 여전히 충돌이다 (도장 없음 + 서버가 더 최신 — 여기는 바뀐 게 없다)");
    window.Cloud.init("rookie");
    await tick(60);
    check(!$(".cloud-overlay"), `화면을 띄우지 않는다 — "${modalText($)}"`);
    check(LS.getItem("grow-cloud-synced-rookie") === UP,
      `서버가 말한 시각으로 도장을 찍는다 (synced=${LS.getItem("grow-cloud-synced-rookie")})`);
    const p = pushesFor(calls, "rookie");
    check(p.length === 1 && p[0].body.p_data["rookie-save-v1-slots"] === R_9000,
      `올릴 거리가 있으니 이 기기 것을 올린다 (푸시 ${p.length}회)`);
    check(LS.getItem("rookie-save-v1-slots") === R_9000, "이 기기 기록은 손대지 않는다");
    check(window.Cloud._t.decide("rookie", UP) !== "conflict",
      `다음 판정이 충돌이 아니다 — 고리가 끊긴다 (지금은 "${window.Cloud._t.decide("rookie", UP)}")`);
  }
  {
    // 전송이 성공하면 도장은 새 시각으로 옮겨가고 장부가 정리된다
    const { window, calls, LS, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: true }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: true, data: { "rookie-save-v1-slots": R_5000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_9000);
    LS.setItem("grow-cloud-dirty-rookie", "1");
    window.Cloud.init("rookie");
    await tick(60);
    check(!$(".cloud-overlay"), "화면을 띄우지 않는다");
    check(LS.getItem("grow-cloud-synced-rookie") === PUSHED && LS.getItem("grow-cloud-dirty-rookie") === "0",
      `올린 뒤 장부가 정리된다 (synced=${LS.getItem("grow-cloud-synced-rookie")}, dirty=${LS.getItem("grow-cloud-dirty-rookie")})`);
    check(window.Cloud._t.decide("rookie", PUSHED) === "none", "다음 실행에서는 조용하다");
    // 결정 잠금(awaiting)에 갇히지 않는다 — 이번 실행의 자동 저장이 평소대로 나가야 한다
    window.Cloud.touch();
    window.dispatchEvent(new window.Event("pagehide"));
    await tick(40);
    check(pushesFor(calls, "rookie").length >= 1, "붙잡힌 채로 남지 않는다");
  }
  {
    // 평키(unicorn)도 같다 — 저장 모양이 달라도 판단 근거는 '누가 썼나'라서 영향이 없다
    const { window, LS, calls, $ } = mk({
      cloud_meta: [{ game: "beta:unicorn", updated: UP, mine: true }],
      cloud_pull: [{ game: "beta:unicorn", updated: UP, mine: true, data: { "unicorn-save-v1": U_6000 } }],
      cloud_push: stalled,
    }, { dir: "unicorn" });
    LS.setItem("unicorn-save-v1", U_8000);        // 올린 것(6000)보다 로컬이 더 나아갔다
    LS.setItem("grow-cloud-dirty-unicorn", "1");
    window.Cloud.init("unicorn");
    await tick(60);
    check(!$(".cloud-overlay"), "평키 게임도 화면을 띄우지 않는다");
    check(LS.getItem("unicorn-save-v1") === U_8000, "기록은 그대로다");
    check(LS.getItem("grow-cloud-synced-unicorn") === UP, "도장은 서버 시각으로 찍힌다");
    check(pushesFor(calls, "unicorn").length === 1, "올릴 거리가 있으니 올린다");
  }

  // ============================================================
  group("2) 내가 쓴 행 + 올릴 거리 없음 → 도장만 찍고 아무것도 하지 않는다");
  {
    const { window, calls, LS, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: true }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: true, data: { "rookie-save-v1-slots": R_5000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_5000);       // 서버에 있는 그 세이브 그대로
    LS.setItem("grow-cloud-dirty-rookie", "0");       // 올릴 거리가 없다
    LS.setItem("grow-cloud-synced-rookie", OLD);      // 도장은 옛 시각에 멈춰 있다
    window.Cloud.init("rookie");
    await tick(60);
    check(!$(".cloud-overlay"), "화면을 띄우지 않는다");
    check(pushesFor(calls, "rookie").length === 0,
      `올릴 게 없으면 올리지 않는다 (푸시 ${pushesFor(calls, "rookie").length}회)`);
    check(LS.getItem("grow-cloud-synced-rookie") === UP,
      `도장만 서버 시각으로 옮긴다 (synced=${LS.getItem("grow-cloud-synced-rookie")})`);
    check(!calls.some((c) => c.fn === "cloud_pull"), "받아올 것도 없으니 pull도 하지 않는다");
    check(LS.getItem("rookie-save-v1-slots") === R_5000, "기록은 그대로다");
  }

  // ============================================================
  group("3) 남이 쓴 행 + 저장 시각이 다르다 → 예전대로 최신으로 자동으로 맞춘다");
  {
    // 서버 쪽(7000)이 더 최근 → 받아온다
    const { window, LS, calls, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: false }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: false, data: { "rookie-save-v1-slots": R_7000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_5000);
    LS.setItem("grow-cloud-dirty-rookie", "1");
    LS.setItem("grow-cloud-synced-rookie", OLD);      // 올려본 적 있는 기기다
    window.Cloud.init("rookie");
    await tick(60);
    check(!$("#cloud-keep") && !$("#cloud-take"), "화면을 띄우지 않는다");
    check(LS.getItem("rookie-save-v1-slots") === R_7000, "더 최근에 저장된 서버 기록으로 맞춘다");
    check(LS.getItem("grow-cloud-synced-rookie") === UP && LS.getItem("grow-cloud-dirty-rookie") === "0",
      "장부가 '서버와 같음'으로 정리된다");
    check(pushesFor(calls, "rookie").length === 0, "받아오는 쪽이니 올리지는 않는다");
  }
  {
    // 이 기기(9000)가 더 최근 → 그대로 두고 올린다
    const { window, LS, calls, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: false }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: false, data: { "rookie-save-v1-slots": R_7000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_9000);
    LS.setItem("grow-cloud-dirty-rookie", "1");
    LS.setItem("grow-cloud-synced-rookie", OLD);
    window.Cloud.init("rookie");
    await tick(60);
    check(!$("#cloud-keep") && !$("#cloud-take"), "화면을 띄우지 않는다");
    check(LS.getItem("rookie-save-v1-slots") === R_9000, "이 기기 기록은 손대지 않는다");
    const p = pushesFor(calls, "rookie");
    check(p.length >= 1 && p[0].body.p_data["rookie-save-v1-slots"] === R_9000, "대신 이 기기 것을 올린다");
  }
  {
    /* mine 칸이 아예 없는 응답(옛 서버·마이그레이션 전 행)도 '내가 쓴 게 아님'으로 읽어야 한다.
     * 위 갈래와 한 글자도 다르지 않게 굴러야 기존 검증들의 뜻이 안 바뀐다. */
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": R_7000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_5000);
    LS.setItem("grow-cloud-dirty-rookie", "1");
    LS.setItem("grow-cloud-synced-rookie", OLD);
    window.Cloud.init("rookie");
    await tick(60);
    check(!$("#cloud-keep") && LS.getItem("rookie-save-v1-slots") === R_7000,
      "mine 칸이 없으면 mine:false와 똑같이 군다 (없음 = 내가 쓴 게 아님)");
  }
  {
    /* 보조 갈래도 살아 있어야 한다 — writer를 적기 전에 생긴 행은 서버가 mine:false라고 한다.
     * 그래도 양쪽 저장 시각이 같으면 같은 세이브라 조용히 정리된다. */
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: false }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: false, data: { "rookie-save-v1-slots": R_5000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_5000);      // 양쪽 다 savedAt 5000 = 같은 세이브
    LS.setItem("grow-cloud-dirty-rookie", "1");
    window.Cloud.init("rookie");
    await tick(60);
    check(!$(".cloud-overlay"), "저장 시각이 같으면 mine:false여도 묻지 않는다 (보조 갈래가 그대로 산다)");
    check(LS.getItem("grow-cloud-synced-rookie") === UP && LS.getItem("grow-cloud-dirty-rookie") === "0",
      "장부가 정리된다");
  }

  // ============================================================
  group("4) 남이 쓴 행 + 견줄 근거가 없다 → 그때는 물어본다");
  {
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: false }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: false, data: { "rookie-save-v1-slots": R_NOTIME } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_5000);      // 이쪽만 시각이 있다
    LS.setItem("grow-cloud-dirty-rookie", "1");
    LS.setItem("grow-cloud-synced-rookie", OLD);
    window.Cloud.init("rookie");
    await tick(60);
    check(!!$("#cloud-keep") && !!$("#cloud-take"), "한쪽에 저장 시각이 없으면 사람에게 묻는다");
    check(/알 수 없어서/.test(modalText($)), `왜 묻는지 화면이 말해준다 — "${modalText($).slice(0, 60)}"`);
    check(LS.getItem("rookie-save-v1-slots") === R_5000, "고르기 전에는 기록이 그대로다");
    check(LS.getItem("grow-cloud-synced-rookie") === OLD, "고르기 전에는 도장도 그대로다");
  }

  // ============================================================
  /* 사용자가 실제로 겪은 길을 끝까지 돌린다.
   * ① 새 브라우저로 몇 판 한다 → 떠나며 pagehide 전송이 서버에 닿지만 응답이 안 온다
   * ② 그 뒤로 한 판 더 한다 (여기서 로컬 시각이 올린 것보다 앞선다 — 예전 지름길이 못 잡는 자리)
   * ③ 다시 켠다 → 서버는 mine:true라고 말한다 → 화면이 뜨면 안 된다 */
  group("5) 겪은 길 그대로 — pagehide 전송이 미아가 돼도 자기 자신과 고르라고 하지 않는다");
  {
    // (가) 올린 뒤 한 판 더 한 경우 = 양쪽 저장 시각이 다르다 (예전 패치로는 못 막던 자리)
    let sent = null;
    const one = mk({
      cloud_meta: [],                                          // 새 브라우저: 서버에 아무 줄도 없다
      cloud_push: (b) => { sent = b.p_data; return stalled(); },  // 닿긴 했는데 응답이 안 온다
    });
    one.LS.setItem("rookie-save-v1-slots", R_5000);            // 몇 판 했다
    one.window.Cloud.init("rookie");
    await tick(40);
    one.window.Cloud.touch();                                  // 게임 save()
    one.window.dispatchEvent(new one.window.Event("pagehide")); // 타이틀로 나간다 → keepalive 전송
    await tick(40);
    check(!!sent && sent["rookie-save-v1-slots"] === R_5000, "떠나는 길의 전송이 서버에 닿는다");
    check(one.LS.getItem("grow-cloud-synced-rookie") === null && one.LS.getItem("grow-cloud-dirty-rookie") === "1",
      `.then이 안 돌아 장부가 '안 올림'인 채로 남는다 (synced=${one.LS.getItem("grow-cloud-synced-rookie")}, dirty=${one.LS.getItem("grow-cloud-dirty-rookie")})`);
    // ② 돌아와 한 판 더 한다. 전송 간격(20초) 안이라 이건 서버로 안 나간다 = 로컬만 앞서간다.
    one.LS.setItem("rookie-save-v1-slots", R_9000);
    one.window.Cloud.touch();
    await tick(40);
    check(sent["rookie-save-v1-slots"] === R_5000, "그 한 판은 아직 서버에 안 올라갔다 (서버 5000 · 로컬 9000)");

    // ③ 다시 켠다 — 장부는 ①②가 남긴 그대로, 서버에는 ①이 올린 줄이 있다
    const two = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: true }],   // 그 줄을 쓴 건 이 기기다
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: true, data: sent }],
      cloud_push: PUSHED,
    });
    two.LS.setItem("rookie-save-v1-slots", R_9000);
    two.LS.setItem("grow-cloud-dirty-rookie", "1");
    /* 시각은 제품 내부 함수를 빌리지 않고 픽스처에서 직접 읽는다 —
     * 검사 대상이 무엇이든(수정 전 파일 포함) 이 확인은 서야 하니까. */
    check(newest(sent["rookie-save-v1-slots"]) !== newest(R_9000),
      `양쪽 저장 시각이 다르다 — "같은 세이브" 지름길로는 못 막는 자리다 (${newest(sent["rookie-save-v1-slots"])} vs ${newest(R_9000)})`);
    check(two.window.Cloud._t.decide("rookie", UP) === "conflict", "판정은 여전히 충돌이다");
    two.window.Cloud.init("rookie");
    await tick(60);
    check(!two.$(".cloud-overlay"),
      `자기가 올린 기록을 두고 화면을 띄우지 않는다 — "${modalText(two.$)}"`);
    check(two.LS.getItem("rookie-save-v1-slots") === R_9000,
      "한 판 더 한 기록이 서버의 옛 꾸러미로 되돌아가지 않는다");
    check(two.LS.getItem("grow-cloud-synced-rookie") === PUSHED && two.LS.getItem("grow-cloud-dirty-rookie") === "0",
      `대신 그 한 판을 올리고 장부를 정리한다 (synced=${two.LS.getItem("grow-cloud-synced-rookie")}, dirty=${two.LS.getItem("grow-cloud-dirty-rookie")})`);
    const p = pushesFor(two.calls, "rookie");
    check(p.length >= 1 && p[0].body.p_data["rookie-save-v1-slots"] === R_9000, "올라간 건 앞서간 로컬 기록이다");
    check(two.window.Cloud._t.decide("rookie", PUSHED) === "none", "다음 실행에서도 조용하다");

    /* 대조군 — 같은 상황에서 서버가 mine을 안 알려주면 화면이 뜬다.
     * 화면이 안 뜨는 게 mine 덕이라는 걸 못 박아둔다 (스텁이 길을 막아서가 아니다). */
    const ctl = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, data: sent }],
      cloud_push: PUSHED,
    });
    ctl.LS.setItem("rookie-save-v1-slots", R_9000);
    ctl.LS.setItem("grow-cloud-dirty-rookie", "1");
    ctl.window.Cloud.init("rookie");
    await tick(60);
    check(!!ctl.$("#cloud-keep"), "mine을 모르면(옛 서버) 예전처럼 물어본다 — 조용해진 건 mine 덕이다");
  }
  {
    // (나) 한 판 더 안 한 경우 = 양쪽 저장 시각이 같다. 이쪽도 여전히 조용해야 한다.
    let sent = null;
    const one = mk({
      cloud_meta: [],
      cloud_push: (b) => { sent = b.p_data; return stalled(); },
    });
    one.LS.setItem("rookie-save-v1-slots", R_5000);
    one.window.Cloud.init("rookie");
    await tick(40);
    one.window.Cloud.touch();
    one.window.dispatchEvent(new one.window.Event("pagehide"));
    await tick(40);

    const two = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: true }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: true, data: sent }],
      cloud_push: PUSHED,
    });
    two.LS.setItem("rookie-save-v1-slots", R_5000);     // 그대로다 = 서버와 같은 세이브
    two.LS.setItem("grow-cloud-dirty-rookie", "1");
    two.window.Cloud.init("rookie");
    await tick(60);
    check(!two.$(".cloud-overlay"), `시각이 같은 경우도 화면이 뜨지 않는다 — "${modalText(two.$)}"`);
    check(two.LS.getItem("rookie-save-v1-slots") === R_5000, "기록은 그대로다");
    check(two.window.Cloud._t.decide("rookie", PUSHED) === "none", "다음 실행에서도 조용하다");
  }

  // ============================================================
  group("6) window.Cloud.onConflict를 직접 불러도 같은 가드가 선다");
  {
    /* init()이 이미 걸러주지만, 밖에서 직접 부르는 길(연결 화면 등)이 있다.
     * 여기서는 pull 응답에 실린 mine을 보고 판단해야 한다. */
    const { window, calls, LS, $ } = mk({
      cloud_meta: [],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: true, data: { "rookie-save-v1-slots": R_5000 } }],
      cloud_push: stalled,
    });
    LS.setItem("rookie-save-v1-slots", R_9000);      // 올린 뒤 한 판 더 했다
    LS.setItem("grow-cloud-dirty-rookie", "1");
    window.Cloud.onConflict("rookie");
    await tick(60);
    check(!$(".cloud-overlay"), `직접 불러도 화면을 띄우지 않는다 — "${modalText($)}"`);
    check(LS.getItem("grow-cloud-synced-rookie") === UP,
      `pull이 말한 시각으로 도장을 찍는다 (synced=${LS.getItem("grow-cloud-synced-rookie")})`);
    check(LS.getItem("rookie-save-v1-slots") === R_9000, "기록은 그대로다");
    check(pushesFor(calls, "rookie").length === 1,
      `붙잡은 결정을 풀고 이 기기 것을 올린다 (푸시 ${pushesFor(calls, "rookie").length}회)`);
  }
  {
    // 올릴 거리가 없으면 도장만 찍고 조용히 끝난다
    const { window, calls, LS, $ } = mk({
      cloud_meta: [],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: true, data: { "rookie-save-v1-slots": R_5000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_5000);
    LS.setItem("grow-cloud-dirty-rookie", "0");
    window.Cloud.onConflict("rookie");
    await tick(60);
    check(!$(".cloud-overlay"), "화면을 띄우지 않는다");
    check(pushesFor(calls, "rookie").length === 0, "올릴 게 없으면 올리지도 않는다");
    check(LS.getItem("grow-cloud-synced-rookie") === UP, "도장만 찍는다");
  }

  // ============================================================
  /* 오래 지켜온 약속 — 이 기기가 **한 번도 올린 적 없는** 기록은 절대 말없이 덮지 않는다.
   * mine이 들어왔다고 이 규칙이 흐려지면 옛 폰의 몇 달치가 하루치로 사라진다. */
  group("7) 도장 없는 기기 + 남이 쓴 행 → 한쪽이 명백히 최근이어도 반드시 묻는다");
  {
    // 서버 쪽(7000)이 더 최근
    const { window, LS, calls, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: false }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: false, data: { "rookie-save-v1-slots": R_7000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_5000);      // 도장 없음 = 한 번도 안 올렸다
    window.Cloud.init("rookie");
    await tick(60);
    check(!!$("#cloud-keep") && !!$("#cloud-take"), "서버가 더 최근이어도 물어본다");
    check(LS.getItem("rookie-save-v1-slots") === R_5000, "고르기 전에는 기록이 그대로다");
    check(LS.getItem("grow-cloud-synced-rookie") === null, "고르기 전에는 도장도 안 찍는다");
    check(pushesFor(calls, "rookie").length === 0, "고르기 전에는 올리지도 않는다");
  }
  {
    // 이 기기(9000)가 더 최근인 반대 방향도 같다
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: UP, mine: false }],
      cloud_pull: [{ game: "beta:rookie", updated: UP, mine: false, data: { "rookie-save-v1-slots": R_7000 } }],
      cloud_push: PUSHED,
    });
    LS.setItem("rookie-save-v1-slots", R_9000);
    window.Cloud.init("rookie");
    await tick(60);
    check(!!$("#cloud-keep"), "이 기기가 더 최근이어도 도장이 없으면 물어본다");
  }

  console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("테스트 자체가 터졌어요:", e); process.exit(1); });
