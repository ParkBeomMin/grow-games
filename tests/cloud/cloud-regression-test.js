/* 최종 전수 리뷰(클라이언트) 회귀 검증.
 *
 * 실제 브라우저처럼 jsdom에서 cloud.js를 로드해, 세이브가 사라지는 경로를 끝까지 돌린다.
 * CLOUD 환경변수로 검사 대상 파일을 바꿀 수 있다 (수정 전 파일로 돌려 실패를 먼저 확인하려고).
 *   CLOUD=/…/cloud-before.js node cloud-regression-test.js
 */
"use strict";
const fs = require("fs");
const SP = __dirname;
const { JSDOM, VirtualConsole } = require(__dirname + "/jsdom.js");
const CLOUD = process.env.CLOUD || "/workspace/grow-games/beta/cloud.js";
const SRC = fs.readFileSync(CLOUD, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const group = (t) => console.log(`\n— ${t}`);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 25));

// ---------- 실제 저장 모양 ----------
// 7종은 SAVE_KEY+"-slots"에 슬롯 맵, unicorn만 평키 하나 (game.js의 save()와 같은 모양)
const blob = (o) => JSON.stringify(o);
const ROOKIE_A = blob({ s1: { name: "박프로", phase: "pro", proYear: 9, savedAt: 5000 } });
const IDOL_A_LONG = blob({ s9: { name: "이연습", phase: "idol-pro", proYear: 7, savedAt: 4000 } });  // A의 몇 달치
const IDOL_B_NEW = blob({ sB: { name: "새연습", phase: "trainee", year: 1, savedAt: 9000 } });        // B의 하루치

function mk(routes, opt) {
  const vc = new VirtualConsole();   // jsdom의 location.reload 미구현 경고를 삼킨다
  const dom = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only", url: "https://x.test/idol/", virtualConsole: vc,
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

(async function () {
  // ============================================================
  group("A) 기존 사용자 업그레이드 경로 — 옛 기기의 세이브가 말없이 덮이면 안 된다 (Critical)");
  {
    /* ① 옛 폰 A에 8종 몇 달치가 쌓여 있다. 루키만 열어 코드를 발급했다.
     *    → 루키만 서버로 올라가고 도장이 찍힌다. 아이돌은 도장이 없다.
     * ② 새 폰 B가 코드를 받는다 (A의 장부는 아무도 손대지 않는다).
     * ③ B에서 아이돌을 새로 시작해 서버에 올린다.
     * ④ A에서 아이돌을 연다 — 여기서 A의 7년차가 B의 1년차로 덮이면 안 된다. */
    const UP_B = "2026-07-27T09:00:00Z";
    let metaCalls = 0;
    const { window, LS, $, calls } = mk({
      // ① 루키를 열 때는 서버가 비어 있다. ③ 이후(= 두 번째 실행)에는 B가 올린 아이돌 행이 있다.
      cloud_meta: () => (metaCalls++ === 0
        ? []
        : [{ game: "beta:rookie", updated: "2026-07-27T03:00:00Z" },
           { game: "beta:idol", updated: UP_B }]),
      cloud_pull: (b) => (b.p_game === "beta:idol"
        ? [{ game: "beta:idol", updated: UP_B, data: { "trainee-save-v1-slots": IDOL_B_NEW } }]
        : []),
      cloud_push: "2026-07-27T03:00:00Z",
    });
    LS.setItem("rookie-save-v1-slots", ROOKIE_A);
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);

    // ① 루키만 올라간 상태를 실제로 만든다 (루키 페이지를 열고 한 번 저장 → push → 도장)
    window.Cloud.init("rookie");
    await tick(40);
    window.Cloud.touch();     // 게임 save() 한 번 = 루키만 서버로 올라간다
    await tick(40);
    check(LS.getItem("grow-cloud-synced-rookie") !== null,
      `열어본 게임만 도장이 찍힌다 (rookie=${LS.getItem("grow-cloud-synced-rookie")})`);
    check(LS.getItem("grow-cloud-synced-idol") === null,
      "열지 않은 게임(아이돌)은 도장이 없다 — 모든 기존 사용자가 이 상태다");

    // ④ A에서 아이돌 페이지를 연다
    window.Cloud.init("idol");
    await tick(60);

    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG,
      "A의 7년차 커리어가 그대로 남아 있다 (묻지 않는 pull이 덮어쓰지 않는다)");
    check(!!$("#cloud-keep") && !!$("#cloud-take"),
      "대신 충돌 화면이 떠서 사람이 고른다 (이 기기 / 다른 기기)");
    const txt = $(".cloud-modal") ? $(".cloud-modal").textContent : "";
    check(/데뷔 7년차/.test(txt), `이 기기 쪽 요약이 A의 기록이다 — "${txt.replace(/\s+/g, " ").slice(0, 90)}"`);
    check(calls.filter((c) => c.fn === "cloud_push" && c.body.p_game === "beta:idol").length === 0,
      "고르기 전에는 아이돌을 올리지도 않는다");
  }
  {
    // 되돌아보기: 사람이 '이 기기 것'을 고르면 A의 기록이 서버로 올라간다
    const UP_B = "2026-07-27T09:00:00Z";
    const { window, LS, $, calls } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP_B }],
      cloud_pull: [{ game: "beta:idol", updated: UP_B, data: { "trainee-save-v1-slots": IDOL_B_NEW } }],
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    window.Cloud.init("idol");
    await tick(60);
    if ($("#cloud-keep")) $("#cloud-keep").click();
    await tick(60);
    const p = calls.find((c) => c.fn === "cloud_push" && c.body.p_game === "beta:idol");
    check(!!p && p.body.p_data["trainee-save-v1-slots"] === IDOL_A_LONG,
      "'이 기기 것 쓰기'를 고르면 A의 기록이 서버로 올라간다");
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG, "로컬은 A의 기록 그대로");
  }

  // ============================================================
  group("B) 새 기기 이어받기는 여전히 조용히 받아온다 (고치다 망가뜨리면 안 되는 쪽)");
  {
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NEW } }],
    });
    // 이 기기엔 아무 기록도 없다 (코드를 넣고 막 연결한 새 폰)
    window.Cloud.init("idol");
    await tick(60);
    check(LS.getItem("trainee-save-v1-slots") === IDOL_B_NEW,
      "로컬에 기록이 없으면 서버 것을 그대로 받아온다");
    check(!$("#cloud-keep"), "아무것도 묻지 않는다 (충돌 화면이 뜨지 않는다)");
    check(LS.getItem("grow-cloud-dirty-idol") === "0" && LS.getItem("grow-cloud-synced-idol") === UP,
      "받아온 뒤 장부가 '서버와 같음'으로 정리된다");
  }
  {
    // 도장이 없고 서버에도 행이 없으면 — 백업이 아예 없는 상태이므로 올려야 한다
    const { window, LS, calls } = mk({ cloud_meta: [], cloud_push: "2026-07-27T09:00:00Z" });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    window.Cloud.init("idol");
    await tick(60);
    const p = calls.find((c) => c.fn === "cloud_push" && c.body.p_game === "beta:idol");
    check(!!p, "서버에 사본이 없는 기록은 페이지를 열 때 백업된다");
    check(LS.getItem("grow-cloud-synced-idol") === "2026-07-27T09:00:00Z", "올린 뒤 도장이 찍힌다");
  }

  // ============================================================
  group("C) 저장소에 못 쓰면 '받았다'고 적지 않는다 (Minor 1)");
  {
    const { window, LS } = mk({});
    const T = window.Cloud._t;
    const proto = Object.getPrototypeOf(LS);
    const oSet = proto.setItem;
    // 슬롯은 써지고 -legacy에서 용량이 차는 '반쪽 저장'을 흉내낸다
    proto.setItem = function (k, v) {
      if (/-legacy$/.test(k)) throw new Error("QuotaExceeded");
      return oSet.call(this, k, v);
    };
    const ok = typeof T.writeKeys === "function"
      ? T.writeKeys("idol", { "trainee-save-v1-slots": IDOL_B_NEW, "trainee-save-v1-legacy": "{}" })
      : "writeKeys 없음";
    check(ok === false, `writeKeys가 실패를 알린다 (한 키라도 못 쓰면 false) — 받은 값: ${JSON.stringify(ok)}`);
    const applied = T.apply("idol", { "trainee-save-v1-slots": IDOL_B_NEW, "trainee-save-v1-legacy": "{}" });
    check(applied === false, "apply도 false를 돌려준다 (반쪽 저장을 성공이라 하지 않는다)");
    proto.setItem = oSet;
  }
  {
    // pullAndApply: 못 썼으면 도장도 dirty=0도 찍으면 안 된다
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS } = mk({
      cloud_pull: [{ game: "beta:idol", updated: UP,
        data: { "trainee-save-v1-slots": IDOL_B_NEW, "trainee-save-v1-legacy": "{}" } }],
    });
    LS.setItem("grow-cloud-dirty-idol", "1");
    const proto = Object.getPrototypeOf(LS);
    const oSet = proto.setItem;
    proto.setItem = function (k, v) {
      if (/^trainee-save-v1/.test(k)) throw new Error("QuotaExceeded");
      return oSet.call(this, k, v);
    };
    window.Cloud._pull("idol");
    await tick(40);
    proto.setItem = oSet;
    check(LS.getItem("grow-cloud-synced-idol") === null,
      `못 받았으면 도장을 찍지 않는다 (synced=${LS.getItem("grow-cloud-synced-idol")})`);
    check(LS.getItem("grow-cloud-dirty-idol") === "1",
      `장부가 그대로라 다음 실행에서 다시 시도한다 (dirty=${LS.getItem("grow-cloud-dirty-idol")})`);
  }
  {
    // 서버 꾸러미가 진짜로 비어 있는 경우는 예전 그대로 — 지우지 말고 이 기기 것을 올린다
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, calls } = mk({
      cloud_pull: [{ game: "beta:idol", updated: UP, data: {} }],
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    window.Cloud._pull("idol");
    await tick(40);
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG, "빈 꾸러미로 지우지 않는다");
    check(calls.some((c) => c.fn === "cloud_push"), "대신 이 기기 것을 올려 서버를 바로잡는다");
  }
  {
    // 충돌 화면에서 '다른 기기 것 쓰기'를 눌렀는데 못 쓴 경우
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NEW } }],
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    LS.setItem("grow-cloud-dirty-idol", "1");
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    window.Cloud.init("idol");
    await tick(60);
    const proto = Object.getPrototypeOf(LS);
    const oSet = proto.setItem;
    proto.setItem = function (k, v) {
      if (/^trainee-save-v1/.test(k)) throw new Error("QuotaExceeded");
      return oSet.call(this, k, v);
    };
    if ($("#cloud-take")) $("#cloud-take").click();
    await tick(20);
    proto.setItem = oSet;
    check(LS.getItem("grow-cloud-synced-idol") === "2026-07-27T01:00:00Z",
      `못 썼으면 도장을 옮기지 않는다 (synced=${LS.getItem("grow-cloud-synced-idol")})`);
    check(LS.getItem("grow-cloud-dirty-idol") === "1", "장부가 남아 다음 실행에서 다시 물어본다");
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG, "이 기기 기록은 그대로다");
  }

  // ============================================================
  group("D) 발급 권유를 건너뛴 사람에게 다시 권한다 (Minor 3)");
  {
    // 결정 화면이 떠 있어 권유를 건너뛴 실행 — 여기서 '권했다' 도장을 찍으면 안 된다
    const { window, LS, $ } = mk({ cloud_meta: [] });
    window.Cloud.init("idol");
    await tick();
    window.Cloud.onConflict("idol");   // awaiting[idol] = true
    window.Cloud.mark();
    await tick(1400);
    check(!$(".cloud-overlay"), "결정 화면 위에 겹쳐 뜨지 않는다 (기존 동작)");
    check(LS.getItem("grow-cloud-asked") !== "1",
      `보여주지 못했으면 '권했다'로 적지 않는다 (asked=${LS.getItem("grow-cloud-asked")})`);
  }
  {
    // 그래서 다음 실행에서는 제대로 뜬다
    const { window, LS, $ } = mk({ cloud_meta: [] });
    LS.setItem("grow-cloud-asked", null === null ? "" : "");   // 비워둔 상태
    LS.removeItem("grow-cloud-asked");
    window.Cloud.init("idol");
    await tick();
    window.Cloud.mark();
    await tick(1400);
    check(!!$(".cloud-overlay") && /기록을 지킬까요/.test($(".cloud-modal").textContent),
      "다음 실행에서는 권유가 뜬다");
    check(LS.getItem("grow-cloud-asked") === "1", "실제로 보여준 뒤에 도장을 찍는다");
  }

  // ============================================================
  group("E) 이미 놀기 시작했으면 묻지 않는 pull이 새로고침을 걸지 않는다 (Minor 5)");
  {
    const UP = "2026-07-27T09:00:00Z";
    let release;
    const slow = new Promise((r) => { release = r; });
    const { window, LS, $ } = mk({
      cloud_meta: () => slow,
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NEW } }],
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");   // 예전에 한 번 맞춰둔 기기
    window.Cloud.init("idol");
    // cloud_meta가 도는 동안 사람이 화면을 만졌다 = 이미 놀고 있다
    window.document.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
    release([{ game: "beta:idol", updated: UP }]);
    await tick(60);
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG,
      "이미 손댄 뒤라면 로컬을 덮어쓰고 새로고침하지 않는다");
    check(LS.getItem("grow-cloud-dirty-idol") === "1",
      `대신 다음 실행에서 사람이 고르도록 장부를 세운다 (dirty=${LS.getItem("grow-cloud-dirty-idol")})`);
    check(window.Cloud._t.decide("idol", UP) === "conflict", "다음 실행 판정이 충돌이다");
    check(!$(".cloud-toast"), "아무 말 없이 조용히 넘어간다 (게임을 방해하지 않는다)");
  }
  {
    // 손대지 않았다면 예전 그대로 받아온다
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NEW } }],
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    window.Cloud.init("idol");
    await tick(60);
    check(LS.getItem("trainee-save-v1-slots") === IDOL_B_NEW,
      "타이틀에 가만히 있었다면 예전대로 받아온다");
  }

  // ============================================================
  group("F) 환생 직후 새로고침 — 혼자 쓰는 기기에 거짓 충돌이 뜨면 안 된다 (Minor 2)");
  {
    const { window, LS } = mk({ cloud_meta: [], cloud_push: "2026-07-27T10:00:00Z" });
    LS.setItem("trainee-save-v1-legacy", JSON.stringify({ pts: 12, gen: 2 }));
    LS.setItem("grow-cloud-dirty-idol", "1");
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    window.Cloud.init("idol");
    await tick();
    check(typeof window.Cloud.settle === "function", "Cloud.settle()이 있다 (새로고침 전에 잠깐 기다리는 창구)");
    window.Cloud.mark();
    await window.Cloud.settle(800);    // 환생 코드가 reload 직전에 하는 일
    check(LS.getItem("grow-cloud-dirty-idol") === "0",
      `전송이 끝난 뒤 새로고침하므로 도장이 찍힌다 (dirty=${LS.getItem("grow-cloud-dirty-idol")})`);
    check(LS.getItem("grow-cloud-synced-idol") === "2026-07-27T10:00:00Z",
      "syncKey가 방금 올린 시각으로 갱신된다");
    check(window.Cloud._t.decide("idol", "2026-07-27T10:00:00Z") === "none",
      "다음 실행에서 충돌 화면이 뜨지 않는다 (혼자 쓰는 기기)");
  }
  {
    // 네트워크가 느려도 게임을 붙잡지 않는다 — 상한에서 반드시 돌아온다
    const { window, LS } = mk({ cloud_meta: [], cloud_push: () => new Promise(() => {}) });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    window.Cloud.init("idol");
    await tick();
    window.Cloud.mark();
    const t0 = Date.now();
    let done = false;
    await Promise.race([window.Cloud.settle(200).then(() => { done = true; }), tick(1200)]);
    check(done, `응답이 안 와도 상한에서 돌아온다 (${Date.now() - t0}ms)`);
  }

  console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("테스트 자체가 터졌어요:", e); process.exit(1); });
