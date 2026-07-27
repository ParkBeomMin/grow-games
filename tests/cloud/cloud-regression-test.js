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
/* 어느 쪽이 더 최근인지 **견줄 근거가 없는** 기록 = savedAt이 아예 없는 옛 세이브.
 * 예전에는 "양쪽 savedAt을 똑같이" 두어 충돌 화면을 띄웠는데, 그건 잘못된 흉내였다.
 * 시각이 같다는 건 같은 세이브라는 뜻이고(자기가 올린 걸 되받은 경우),
 * 이제 cloud.js가 그걸 알아보고 조용히 정리한다 — 물어볼 일이 아니다.
 * 진짜로 못 가리는 경우는 한쪽이라도 savedAt이 없을 때다. progressAt()이 0을 돌려주고
 * 0은 falsy라 자동 판정 조건(mineAt && theirsAt)이 서지 않아 사람에게 묻는다. */
const IDOL_A_NO_TIME = blob({ sA: { name: "이연습", phase: "idol-pro", proYear: 7 } });   // A의 몇 달치, 시각 없음
const IDOL_B_NO_TIME = blob({ sB: { name: "새연습", phase: "trainee", year: 1 } });        // B의 하루치, 시각 없음

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
    // 서버 쪽 세이브에 savedAt이 없어야(= 견줄 근거가 없어야) 자동 판정이 서지 않고 실제로 화면이 뜬다.
    // 이 기기는 4000, 서버는 시각 없음 → progressAt(서버)=0 → 물어보는 갈래.
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NO_TIME } }],
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

  // ============================================================
  /* 두 기기를 번갈아 쓰면 켤 때마다 똑같아 보이는 두 줄을 놓고 고르라는 화면이 떴다.
   * 이제 어느 쪽이 더 최근에 저장됐는지(savedAt) 가릴 수 있으면 묻지 않고 맞춘다.
   * 단, 이 기기가 **한 번도 올린 적 없는** 기록은 절대 자동으로 덮지 않는다. */
  group("G) 어느 쪽이 더 최근인지 알면 묻지 않고 맞춘다");
  {
    // 서버가 더 최근 + 이미 올려본 적 있는 기기 → 묻지 않고 받아온다
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $, calls } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NEW } }],
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);        // savedAt 4000
    LS.setItem("grow-cloud-dirty-idol", "1");
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");   // 올려본 적 있는 기기
    window.Cloud.init("idol");
    await tick(60);
    check(!$("#cloud-keep") && !$("#cloud-take"), "서버가 더 최근이면 화면을 띄우지 않는다");
    check(LS.getItem("trainee-save-v1-slots") === IDOL_B_NEW, "더 최근에 저장된 서버 기록으로 맞춘다");
    check(LS.getItem("grow-cloud-synced-idol") === UP && LS.getItem("grow-cloud-dirty-idol") === "0",
      `장부가 '서버와 같음'으로 정리된다 (synced=${LS.getItem("grow-cloud-synced-idol")}, dirty=${LS.getItem("grow-cloud-dirty-idol")})`);
    const t = $(".cloud-toast");
    check(!!t && /최근/.test(t.textContent), `무슨 일이 일어났는지 말해준다 — "${t && t.textContent}"`);
    check(calls.filter((c) => c.fn === "cloud_push" && c.body.p_game === "beta:idol").length === 0,
      "받아오는 쪽이니 올리지는 않는다");
  }
  {
    // 이 기기가 더 최근 + 이미 올려본 적 있는 기기 → 묻지 않고 올린다 (로컬은 그대로)
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $, calls } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_A_LONG } }],  // savedAt 4000
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_B_NEW);          // savedAt 9000 — 이쪽이 더 최근
    LS.setItem("grow-cloud-dirty-idol", "1");
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    window.Cloud.init("idol");
    await tick(60);
    check(!$("#cloud-keep") && !$("#cloud-take"), "이 기기가 더 최근이어도 화면을 띄우지 않는다");
    check(LS.getItem("trainee-save-v1-slots") === IDOL_B_NEW, "이 기기 기록은 손대지 않는다");
    const p = calls.find((c) => c.fn === "cloud_push" && c.body.p_game === "beta:idol");
    check(!!p && p.body.p_data["trainee-save-v1-slots"] === IDOL_B_NEW, "대신 이 기기 것을 서버로 올린다");
    check(LS.getItem("grow-cloud-synced-idol") === "2026-07-27T10:00:00Z" &&
      LS.getItem("grow-cloud-dirty-idol") === "0",
      `올린 뒤 장부가 정리된다 (synced=${LS.getItem("grow-cloud-synced-idol")}, dirty=${LS.getItem("grow-cloud-dirty-idol")})`);
  }
  {
    /* Critical — 한 번도 올린 적 없는 기록은 '더 최근'이라는 이유로도 덮지 않는다.
     * 옛 폰에 몇 달치가 있는데 새 폰에서 오늘 조금 한 게 더 최근이라고 덮으면 되돌릴 수 없다. */
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $, calls } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NEW } }],  // savedAt 9000
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);         // savedAt 4000 — 서버 쪽이 더 최근
    // 도장 없음 = 이 기기는 이 게임을 한 번도 올린 적이 없다 (기존 사용자가 전부 이 상태다)
    window.Cloud.init("idol");
    await tick(60);
    check(!!$("#cloud-keep") && !!$("#cloud-take"),
      "올린 적 없는 기기에서는 서버가 더 최근이어도 반드시 물어본다");
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG, "고르기 전에는 이 기기 기록이 그대로다");
    check(LS.getItem("grow-cloud-synced-idol") === null, "고르기 전에는 도장도 찍지 않는다");
    check(calls.filter((c) => c.fn === "cloud_push" && c.body.p_game === "beta:idol").length === 0,
      "고르기 전에는 올리지도 않는다");
  }
  {
    // 반대 방향도 같다 — 이 기기가 더 최근이어도, 올린 적이 없으면 묻는다
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_A_LONG } }],  // savedAt 4000
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_B_NEW);          // savedAt 9000 — 이쪽이 더 최근
    window.Cloud.init("idol");
    await tick(60);
    check(!!$("#cloud-keep"), "도장이 없으면 이 기기가 더 최근이어도 물어본다");
  }
  {
    // 양쪽 다 savedAt이 없다 = 견줄 근거가 아예 없다 → 물어보고, 왜 묻는지도 말해준다.
    // 서로 다른 기록인데(A의 몇 달치 vs B의 하루치) 어느 게 나중인지 알 방법이 없는 진짜 애매한 경우다.
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NO_TIME } }],
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_NO_TIME);      // 양쪽 다 savedAt 없음
    LS.setItem("grow-cloud-dirty-idol", "1");
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    window.Cloud.init("idol");
    await tick(60);
    check(!!$("#cloud-keep"), "양쪽 다 저장 시각이 없으면 자동으로 정하지 않고 물어본다");
    const txt = $(".cloud-modal") ? $(".cloud-modal").textContent : "";
    check(/알 수 없어서/.test(txt), `왜 묻는지 화면이 말해준다 — "${txt.replace(/\s+/g, " ").slice(0, 60)}"`);
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_NO_TIME, "고르기 전에는 이 기기 기록이 그대로다");
  }
  {
    /* 반대로 **저장 시각이 똑같으면** 같은 세이브다. 고를 게 없으니 묻지 않는다.
     * 서버 행이 이 기기가 올린 바로 그 꾸러미(IDOL_A_LONG)를 그대로 돌려준다. */
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $, calls } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_A_LONG } }],
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);         // 양쪽 savedAt 4000 — 같은 세이브
    LS.setItem("grow-cloud-dirty-idol", "1");
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    window.Cloud.init("idol");
    await tick(60);
    check(!$("#cloud-keep") && !$("#cloud-take") && !$(".cloud-overlay"),
      "저장 시각이 같으면 화면을 띄우지 않는다 (자기가 올린 걸 두고 고르라고 하지 않는다)");
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG, "기록은 그대로다 (덮지도 지우지도 않는다)");
    check(LS.getItem("grow-cloud-synced-idol") === UP,
      `도장을 서버 시각으로 옮긴다 (synced=${LS.getItem("grow-cloud-synced-idol")})`);
    check(LS.getItem("grow-cloud-dirty-idol") === "0",
      `장부가 '올릴 것 없음'으로 정리된다 (dirty=${LS.getItem("grow-cloud-dirty-idol")})`);
    check(window.Cloud._t.decide("idol", UP) !== "conflict",
      `다음 실행에서 다시 묻지 않는다 — 고리가 끊긴다 (지금은 "${window.Cloud._t.decide("idol", UP)}")`);
    // 붙잡은 걸 풀어야 이번 실행에서도 평소대로 전송이 나간다 (awaiting에 갇히면 안 된다)
    window.Cloud.touch();
    await tick(40);
    check(calls.some((c) => c.fn === "cloud_push" && c.body.p_game === "beta:idol"),
      "결정 잠금이 풀려 이번 실행의 자동 저장이 평소대로 올라간다");
  }
  {
    /* 사용자가 실제로 겪은 길 — 새 브라우저, 기록 없음, 몇 판 하고 타이틀로 돌아왔더니
     * 자기 자신과 충돌 화면이 떴다.
     *
     * ① 게임을 한다 → dirty=1
     * ② 화면을 떠난다(pagehide) → keepalive 전송이 서버엔 닿지만, 페이지가 사라져
     *    "올렸다"고 적는 .then은 영영 안 돈다 (여기서는 응답을 영원히 붙잡아 흉내낸다)
     * ③ 다시 켠다 → 서버 행은 새로 생겼는데 로컬은 도장 없이 dirty=1 → decide()는 conflict
     * ④ 그런데 서버에 있는 건 이 기기가 올린 바로 그 세이브다 → 화면이 뜨면 안 된다 */
    const PLAYED = blob({ sP: { name: "김신입", phase: "trainee", year: 1, savedAt: 7000 } });
    const UP = "2026-07-27T09:00:00Z";

    // ①② 첫 실행 — 떠날 때 전송이 나가고 .then은 안 돈다
    let sent = null;
    const one = mk({
      cloud_meta: [],                                   // 새 브라우저: 서버에 아직 아무 줄도 없다
      cloud_push: (b) => { sent = b.p_data; return new Promise(() => {}); },  // 서버엔 닿았다, 응답만 안 온다
    });
    one.LS.setItem("trainee-save-v1-slots", PLAYED);    // 몇 판 했다
    one.window.Cloud.init("idol");
    await tick(40);
    one.window.Cloud.touch();                           // save() 한 번 = dirty=1
    one.window.dispatchEvent(new one.window.Event("pagehide"));   // 타이틀로 나가며 페이지가 사라진다
    await tick(40);
    check(!!sent && sent["trainee-save-v1-slots"] === PLAYED, "떠나는 길의 전송이 서버에 닿는다");
    check(one.LS.getItem("grow-cloud-synced-idol") === null,
      `.then이 안 돌아 도장이 안 찍힌다 (synced=${one.LS.getItem("grow-cloud-synced-idol")})`);
    check(one.LS.getItem("grow-cloud-dirty-idol") === "1", "장부도 '올릴 거리 있음'인 채로 남는다");

    // ③④ 다시 켠다 — 장부는 ②가 남긴 그대로, 서버에는 ②가 올린 줄이 있다
    /* 여기 응답에는 mine을 **일부러 안 싣는다.** 진짜 서버라면 이 줄을 쓴 게 이 기기라
     * mine:true를 보내고, 그러면 '누가 썼나' 가드가 먼저 잡아 아래 갈래를 안 탄다.
     * 이 블록이 지키는 건 그 다음 안전망(저장 시각이 같으면 같은 세이브)이다.
     * mine을 쓰는 갈래는 cloud-writer-test.js가 따로 본다. */
    const two = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: sent }],   // 서버가 돌려주는 건 내가 올린 그것
      cloud_push: "2026-07-27T10:00:00Z",
    });
    two.LS.setItem("trainee-save-v1-slots", PLAYED);
    two.LS.setItem("grow-cloud-dirty-idol", "1");       // 도장은 없다 (한 번도 못 찍었다)
    check(two.window.Cloud._t.decide("idol", UP) === "conflict",
      "판정은 여전히 충돌이다 (도장 없음 + 서버가 더 최신 — 여기까지는 바뀐 게 없다)");
    two.window.Cloud.init("idol");
    await tick(60);
    check(!two.$(".cloud-overlay"),
      `자기가 올린 기록을 두고 충돌 화면을 띄우지 않는다 — "${two.$(".cloud-modal") ? two.$(".cloud-modal").textContent.replace(/\s+/g, " ").slice(0, 50) : ""}"`);
    check(two.LS.getItem("trainee-save-v1-slots") === PLAYED, "기록은 그대로다");
    check(two.LS.getItem("grow-cloud-synced-idol") === UP && two.LS.getItem("grow-cloud-dirty-idol") === "0",
      `이번엔 장부가 정리된다 (synced=${two.LS.getItem("grow-cloud-synced-idol")}, dirty=${two.LS.getItem("grow-cloud-dirty-idol")})`);
    check(two.window.Cloud._t.decide("idol", UP) === "none", "그래서 다음 실행에서도 조용하다");
  }
  {
    // savedAt이 아예 없는 세이브(아주 옛날 기록)도 가릴 수 없다 → 물어본다
    const UP = "2026-07-27T09:00:00Z";
    const NO_TIME = blob({ sX: { name: "무시각", phase: "trainee", year: 3 } });
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": NO_TIME } }],
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    LS.setItem("grow-cloud-dirty-idol", "1");
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    window.Cloud.init("idol");
    await tick(60);
    check(!!$("#cloud-keep"), "한쪽에 저장 시각이 없으면 물어본다");
    const txt = $(".cloud-modal") ? $(".cloud-modal").textContent : "";
    check(/알 수 없어서/.test(txt), "왜 묻는지 화면이 말해준다");
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG, "이 기기 기록은 그대로다");
  }
  {
    /* 자동으로 받아오다 저장소에 못 쓴 경우 — 도장을 옮기면 받지도 못한 기록과
     * "같다"고 믿고 다음 전송이 반대편의 진짜 기록을 덮는다. 질문도 열린 채로 남아야 한다. */
    const UP = "2026-07-27T09:00:00Z";
    const { window, LS, $ } = mk({
      cloud_meta: [{ game: "beta:idol", updated: UP }],
      cloud_pull: [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": IDOL_B_NEW } }],
      cloud_push: "2026-07-27T10:00:00Z",
    });
    LS.setItem("trainee-save-v1-slots", IDOL_A_LONG);
    LS.setItem("grow-cloud-dirty-idol", "1");
    LS.setItem("grow-cloud-synced-idol", "2026-07-27T01:00:00Z");
    const proto = Object.getPrototypeOf(LS);
    const oSet = proto.setItem;
    proto.setItem = function (k, v) {
      if (/^trainee-save-v1/.test(k)) throw new Error("QuotaExceeded");
      return oSet.call(this, k, v);
    };
    window.Cloud.init("idol");
    await tick(60);
    proto.setItem = oSet;
    check(LS.getItem("grow-cloud-synced-idol") === "2026-07-27T01:00:00Z",
      `못 썼으면 도장을 옮기지 않는다 (synced=${LS.getItem("grow-cloud-synced-idol")})`);
    check(LS.getItem("grow-cloud-dirty-idol") === "1", "장부가 '결정 필요'로 남는다");
    check(LS.getItem("trainee-save-v1-slots") === IDOL_A_LONG, "이 기기 기록은 그대로다");
    check(!$(".cloud-toast"), "받지도 못했으면서 '맞췄어요'라고 하지 않는다");
    check(window.Cloud._t.decide("idol", UP) === "conflict", "다음 실행에서 다시 물어본다");
  }

  console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("테스트 자체가 터졌어요:", e); process.exit(1); });
