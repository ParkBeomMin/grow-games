/* cloud.js 행동 검증 — 세이브를 망가뜨릴 수 있는 경로(apply/openLink/onConflict)를 실제로 돌린다.
 *
 * 중요: 픽스처는 반드시 "디스크에 실제로 있는 모양"으로 만든다.
 *   - 7개 게임(rookie/idol/stock/dev/chef/stream/soccer): SAVE_KEY + "-slots" 에 슬롯 맵
 *     { 슬롯id: {…게임상태…, savedAt: <ms>} }  ← game.js의 save()/loadSlots()가 쓰는 모양
 *   - unicorn 만: SAVE_KEY 평키에 상태 객체 하나
 * 예전 수동 점검 스크립트처럼 { "rookie-save-v1": ... } 로 만들면 제품이 만들지 않는 모양이라
 * 구현을 다시 확인해줄 뿐 행동을 검증하지 못한다.
 */
"use strict";
const fs = require("fs");
const SP = __dirname;
const { JSDOM, VirtualConsole } = require(__dirname + "/jsdom.js");
const CLOUD = "/workspace/grow-games/beta/cloud.js";
const SRC = fs.readFileSync(CLOUD, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const group = (t) => console.log(`\n— ${t}`);

// ---------- 픽스처 (실제 저장 모양) ----------
// rookie: 슬롯 2개. 최근 저장(savedAt 큼)은 프로 3년차.
const rookieSlots = {
  s1700000000001: { name: "김고교", phase: "hs", year: 2, pos: "batter", region: "seoul", savedAt: 1000 },
  s1700000000002: { name: "박프로", phase: "pro", proYear: 3, team: "한백 코메츠", role: "4번타자", pos: "batter", savedAt: 5000 },
};
// idol: 슬롯 1개
const idolSlots = {
  s1700000000009: { name: "이연습", phase: "trainee", year: 2, pos: "vocal", agency: "a1", savedAt: 3000 },
};
// chef: 슬롯 1개 (이 기기에만 있는 기록)
const chefSlots = {
  s1700000000011: { name: "최셰프", phase: "chef-pro", proYear: 4, group: "미르 다이닝", savedAt: 4000 },
};
// unicorn: 평키 하나
const unicornSave = { company: "코스모", code: 1234, bestRun: 7e10, exits: 2, savedAt: 6000 };

const slotsBlob = (o) => JSON.stringify(o);

function mk(routes) {
  const vc = new VirtualConsole(); // jsdom의 location.reload 미구현 경고 등을 삼킨다
  const dom = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only", url: "https://x.test/rookie/", virtualConsole: vc,
  });
  const { window } = dom;
  window.GROW_ENV = { beta: true };
  window.Match = { cfg: { url: "https://x.test", key: "anon" } };
  const calls = [];
  window.fetch = (url, opt) => {
    const fn = String(url).split("/rpc/")[1];
    const body = JSON.parse(opt.body);
    calls.push({ fn, body });
    const h = routes && routes[fn];
    if (h === undefined) return Promise.reject(new Error("route 없음: " + fn));
    const v = typeof h === "function" ? h(body) : h;
    return Promise.resolve({ ok: true, json: () => Promise.resolve(v) });
  };
  window.eval(SRC);
  return { window, calls, LS: window.localStorage, $: (s) => window.document.querySelector(s) };
}

const tick = (ms) => new Promise((r) => setTimeout(r, ms || 25));

(async function () {
  // ============================================================
  group("1) summarize() — 슬롯 맵을 실제로 읽는다");
  {
    const { window, LS } = mk({});
    const T = window.Cloud._t;

    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    const r = T.summarize("rookie", T.collect("rookie"));
    check(r !== null, `슬롯 저장이 있으면 null이 아니다 (${JSON.stringify(r)})`);
    check(!!r && /프로 3년차/.test(r), `가장 최근 슬롯(savedAt 최대)을 요약한다 — "${r}"`);
    check(!!r && /2/.test(r), `슬롯이 여러 개면 개수를 알려준다 — "${r}"`);

    LS.setItem("trainee-save-v1-slots", slotsBlob(idolSlots));
    const i = T.summarize("idol", T.collect("idol"));
    check(!!i && /연습생 2년차/.test(i), `idol 슬롯 요약 — "${i}"`);
    check(!!i && !/2개|외 /.test(i.replace("2년차", "")), `슬롯 1개면 개수를 붙이지 않는다 — "${i}"`);

    // unicorn 만 평키
    LS.setItem("unicorn-save-v1", JSON.stringify(unicornSave));
    const u = T.summarize("unicorn", T.collect("unicorn"));
    check(!!u && /유니콘/.test(u), `unicorn은 평키를 그대로 읽는다 — "${u}"`);

    // 데카콘(최상위 단계)과 부트스트랩(기본 단계) 이름이 게임과 같아야 한다
    const deca = T.summarize("unicorn", { "unicorn-save-v1": JSON.stringify({ bestRun: 9e12 }) });
    check(deca === "데카콘", `최상위 단계는 데카콘 — "${deca}"`);
    const boot = T.summarize("unicorn", { "unicorn-save-v1": JSON.stringify({ bestRun: 10 }) });
    check(boot === "부트스트랩", `기본 단계는 부트스트랩 — "${boot}"`);

    // 빈 슬롯 맵은 기록 없음
    check(T.summarize("stock", { "investor-save-v1-slots": "{}" }) === null, "빈 슬롯 맵은 null (기록 없음)");
    check(T.summarize("dev", {}) === null, "아무것도 없으면 null");
  }

  // ============================================================
  group("2) apply() — 빈 꾸러미로는 절대 지우지 않는다");
  {
    const { window, LS } = mk({});
    const T = window.Cloud._t;
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    const before = LS.getItem("rookie-save-v1-slots");

    const ok = T.apply("rookie", {});
    check(ok === false, "빈 객체를 넘기면 apply가 false를 돌려준다");
    check(LS.getItem("rookie-save-v1-slots") === before, "빈 객체로 호출해도 기록이 남아 있다");

    check(T.apply("rookie", null) === false, "null도 거부한다");
    check(LS.getItem("rookie-save-v1-slots") === before, "null 호출 뒤에도 기록이 남아 있다");

    const real = T.apply("rookie", { "rookie-save-v1-slots": slotsBlob(idolSlots) });
    check(real === true, "내용이 있으면 apply가 true");
    check(LS.getItem("rookie-save-v1-slots") === slotsBlob(idolSlots), "내용이 있으면 실제로 덮어쓴다");
  }

  // ============================================================
  group("3) push() — 빈 꾸러미는 서버에 올리지 않는다");
  {
    const { window, calls } = mk({ cloud_meta: [], cloud_push: "2026-07-27T00:00:00Z" });
    window.Cloud.init("dev");                 // dev에는 아무 저장도 없다
    await tick();
    window.Cloud.mark();
    await tick();
    const pushes = calls.filter((c) => c.fn === "cloud_push");
    check(pushes.length === 0, `저장이 없는 게임은 push하지 않는다 (푸시 ${pushes.length}회)`);
  }
  {
    const { window, calls, LS } = mk({ cloud_meta: [], cloud_push: "2026-07-27T00:00:00Z" });
    LS.setItem("devgrow-save-v1-slots", slotsBlob({ s1: { phase: "dev-pro", proYear: 1, savedAt: 1 } }));
    window.Cloud.init("dev");
    await tick();
    window.Cloud.mark();
    await tick();
    const pushes = calls.filter((c) => c.fn === "cloud_push");
    check(pushes.length >= 1, "저장이 있으면 push한다 (가드가 과하지 않다)");
  }

  // ============================================================
  group("4) openLink() 기본 선택 — 언제나 '이 기기'");
  const linkRows = (updated) => [
    { game: "beta:rookie", updated, data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } },
  ];
  {
    // 옛 도장이 남아 있고 서버가 그보다 새로워도 기본은 '이 기기'다.
    // 이 화면에 오는 길은 claim 직후뿐이고, 그때 두 시각은 서로 다른 계정 것이라 비교할 수 없다.
    // (도장이 실제로 지워진다는 사실은 그룹 13·16이 제품 경로로 증명한다)
    const { window, LS, $ } = mk({ cloud_pull: linkRows("2026-07-27T05:00:00Z") });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    LS.setItem("grow-cloud-synced-rookie", "2026-07-27T01:00:00Z");
    window.Cloud._t.openLink();
    await tick();
    const theirs = $('input[name="pk-rookie"][value="theirs"]');
    const mine = $('input[name="pk-rookie"][value="mine"]');
    check(!!theirs && !!mine, "양쪽 모두 기록이 있으면 고르는 화면이 뜬다");
    check(!!mine && mine.checked, "서버 시각이 도장보다 새로워도 '이 기기'가 기본");
    check(!!theirs && !theirs.checked, "이때 '다른 기기'는 기본이 아니다");
  }
  {
    // 서버가 더 오래된 경우도 결과는 같다 (기기 시계도, 옛 계정 도장도 기본값을 못 바꾼다)
    const { window, LS, $ } = mk({ cloud_pull: linkRows("2026-07-27T01:00:00Z") });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    LS.setItem("grow-cloud-synced-rookie", "2026-07-27T05:00:00Z");
    window.Cloud._t.openLink();
    await tick();
    const theirs = $('input[name="pk-rookie"][value="theirs"]');
    const mine = $('input[name="pk-rookie"][value="mine"]');
    check(!!mine && mine.checked, "서버 시각이 도장보다 오래돼도 '이 기기'가 기본");
    check(!!theirs && !theirs.checked, "이때 '다른 기기'는 기본이 아니다");
  }
  {
    // 요약이 실제 내용을 보여준다 ("기록 없음"이 아니다)
    const { window, LS, $ } = mk({ cloud_pull: linkRows("2026-07-27T05:00:00Z") });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud._t.openLink();
    await tick();
    const txt = $(".cloud-modal").textContent;
    check(/프로 3년차/.test(txt), "이 기기 기록이 요약돼 보인다 (기록 없음 아님)");
    check(!/기록 없음/.test(txt), "'기록 없음'이 뜨지 않는다");
  }
  {
    // ⚠️ 안내 문구는 게임마다가 아니라 한 번만
    const rows = [
      { game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } },
      { game: "beta:idol", updated: "2026-07-27T05:00:00Z", data: { "trainee-save-v1-slots": slotsBlob(idolSlots) } },
    ];
    const { window, LS, $ } = mk({ cloud_pull: rows });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    LS.setItem("trainee-save-v1-slots", slotsBlob(idolSlots));
    window.Cloud._t.openLink();
    await tick();
    const n = ($(".cloud-modal").innerHTML.match(/양쪽 모두 기록이 있어요/g) || []).length;
    check(n === 1, `'양쪽 모두 기록이 있어요'는 한 번만 나온다 (${n}회)`);
  }

  // ============================================================
  group("5) openLink 확인 버튼 — syncKey/dirty 기록이 정확하다");
  {
    const UP = "2026-07-27T05:00:00Z";
    const rows = [
      { game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } },   // 양쪽 → 다른 기기 선택
      { game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": slotsBlob(idolSlots) } },    // 서버에만
    ];
    const { window, LS, $ } = mk({ cloud_pull: rows, cloud_push: UP });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));   // rookie: 양쪽
    LS.setItem("chef-save-v1-slots", slotsBlob(chefSlots));       // chef: 이 기기에만
    // dev/stock/stream/soccer/unicorn: 어느 쪽에도 없음
    window.Cloud._t.openLink();
    await tick();
    $('input[name="pk-rookie"][value="theirs"]').checked = true;
    $('input[name="pk-rookie"][value="mine"]').checked = false;
    $("#cloud-done").click();
    await tick();

    check(LS.getItem("rookie-save-v1-slots") === slotsBlob(idolSlots), "고른 쪽(다른 기기) 기록이 적용된다");
    check(LS.getItem("grow-cloud-synced-rookie") === UP, `받아온 게임의 syncKey가 서버 시각이다 (${LS.getItem("grow-cloud-synced-rookie")})`);
    check(LS.getItem("grow-cloud-dirty-rookie") === "0", `받아온 게임은 dirty가 아니다 (${LS.getItem("grow-cloud-dirty-rookie")})`);
    check(LS.getItem("grow-cloud-synced-idol") === UP, "서버에만 있던 게임도 syncKey가 남는다");
    check(LS.getItem("grow-cloud-dirty-idol") === "0", "서버에만 있던 게임은 dirty가 아니다");
    check(LS.getItem("grow-cloud-dirty-chef") === "1", "이 기기 것을 지킨 게임만 dirty=1");
    check(LS.getItem("grow-cloud-dirty-stock") !== "1", "한 번도 안 한 게임을 dirty로 만들지 않는다 (stock)");
    check(LS.getItem("grow-cloud-dirty-unicorn") !== "1", "한 번도 안 한 게임을 dirty로 만들지 않는다 (unicorn)");

    // 재실행 시 같은 게임이 또 충돌로 뜨면 안 된다
    check(window.Cloud._t.decide("rookie", UP) === "none", "다시 켜도 rookie가 또 충돌로 뜨지 않는다");
  }
  {
    // '이 기기 것 유지'를 고른 게임도 다시 켤 때 또 충돌로 뜨면 안 된다 (올리기만 하면 된다)
    const UP = "2026-07-27T05:00:00Z";
    const rows = [
      { game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } },
    ];
    const { window, LS, $ } = mk({ cloud_pull: rows, cloud_push: "2026-07-27T09:00:00Z" });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud._t.openLink();
    await tick();
    $('input[name="pk-rookie"][value="mine"]').checked = true;
    $('input[name="pk-rookie"][value="theirs"]').checked = false;
    $("#cloud-done").click();
    await tick();
    check(LS.getItem("rookie-save-v1-slots") === slotsBlob(rookieSlots), "이 기기 것을 고르면 로컬 기록이 그대로다");
    check(LS.getItem("grow-cloud-dirty-rookie") === "1", "이 기기 것을 지켰으니 올릴 거리로 표시된다");
    const act = window.Cloud._t.decide("rookie", UP);
    check(act === "push", `다시 켜면 충돌이 아니라 올리기 (${act})`);
  }

  // ============================================================
  group("6) 취소하면 아무것도 쓰지 않는다");
  {
    const rows = [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }];
    const { window, LS, $ } = mk({ cloud_pull: rows });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud._t.token();   // 기기 토큰 발급은 세이브 변경이 아니므로 스냅샷 전에 미리 만들어 둔다
    const snap = JSON.stringify(Object.keys(LS).sort().map((k) => [k, LS.getItem(k)]));
    window.Cloud._t.openLink();
    await tick();
    $(".cloud-close").click();
    const after = JSON.stringify(Object.keys(LS).sort().map((k) => [k, LS.getItem(k)]));
    check(after === snap, "연결 화면을 닫으면 저장소가 그대로다");
    check(!$(".cloud-modal"), "닫기로 화면이 사라진다");
  }
  {
    const rows = [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }];
    const { window, LS, $ } = mk({ cloud_pull: rows });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud._t.token();   // 위와 같은 이유
    const snap = JSON.stringify(Object.keys(LS).sort().map((k) => [k, LS.getItem(k)]));
    window.Cloud.onConflict("rookie", "2026-07-27T05:00:00Z");
    await tick();
    check(/프로 3년차/.test($(".cloud-modal").textContent), "충돌 화면도 이 기기 기록을 제대로 요약한다");
    check(!/기록 없음/.test($(".cloud-modal").textContent), "충돌 화면에 '기록 없음'이 뜨지 않는다");
    $(".cloud-close").click();
    const after = JSON.stringify(Object.keys(LS).sort().map((k) => [k, LS.getItem(k)]));
    check(after === snap, "충돌 화면을 닫으면 저장소가 그대로다");
  }

  // ============================================================
  group("7) 서버가 빈 꾸러미를 줘도 기록이 지워지지 않는다");
  {
    const { window, LS } = mk({
      cloud_pull: [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: {} }],
      cloud_push: "2026-07-27T06:00:00Z",
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud._pull("rookie");
    await tick();
    check(LS.getItem("rookie-save-v1-slots") === slotsBlob(rookieSlots), "빈 꾸러미를 받아도 로컬 기록이 그대로다");
  }
  {
    // openLink에서도 마찬가지
    const { window, LS, $ } = mk({
      cloud_pull: [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: {} }],
      cloud_push: "2026-07-27T06:00:00Z",
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud._t.openLink();
    await tick();
    const btn = $("#cloud-done");
    if (btn) btn.click();
    await tick();
    check(LS.getItem("rookie-save-v1-slots") === slotsBlob(rookieSlots), "연결 화면에서도 빈 꾸러미가 기록을 지우지 않는다");
  }

  // ============================================================
  group("8) 적용 뒤 언로드에서 옛 상태가 덮어쓰지 못한다");
  {
    const { window, LS } = mk({
      cloud_pull: [{ game: "beta:unicorn", updated: "2026-07-27T05:00:00Z", data: { "unicorn-save-v1": JSON.stringify(unicornSave) } }],
    });
    LS.setItem("unicorn-save-v1", JSON.stringify({ company: "옛것", code: 1, savedAt: 1 }));
    // unicorn/game.js 처럼 beforeunload에서 메모리 상태를 저장하는 게임을 흉내낸다
    window.addEventListener("beforeunload", function () {
      if (window.Cloud && window.Cloud.frozen) return;   // 게임 쪽 가드
      LS.setItem("unicorn-save-v1", JSON.stringify({ company: "옛것", code: 1, savedAt: 1 }));
    });
    window.Cloud._pull("unicorn");
    await tick();
    check(JSON.parse(LS.getItem("unicorn-save-v1")).company === "코스모", "받아온 기록이 적용된다");
    window.dispatchEvent(new window.Event("beforeunload"));
    check(JSON.parse(LS.getItem("unicorn-save-v1")).company === "코스모",
      `언로드 저장이 받아온 기록을 덮어쓰지 않는다 (${LS.getItem("unicorn-save-v1")})`);
  }
  {
    // 가드를 무시하는(옛 버전) 게임이 있어도 cloud 쪽에서 되돌려 쓴다
    const { window, LS } = mk({
      cloud_pull: [{ game: "beta:unicorn", updated: "2026-07-27T05:00:00Z", data: { "unicorn-save-v1": JSON.stringify(unicornSave) } }],
    });
    LS.setItem("unicorn-save-v1", JSON.stringify({ company: "옛것", code: 1, savedAt: 1 }));
    window.addEventListener("beforeunload", function () {
      LS.setItem("unicorn-save-v1", JSON.stringify({ company: "옛것", code: 1, savedAt: 1 }));  // 가드 없음
    });
    window.Cloud._pull("unicorn");
    await tick();
    window.dispatchEvent(new window.Event("beforeunload"));
    check(JSON.parse(LS.getItem("unicorn-save-v1")).company === "코스모",
      `가드 없는 저장이 끼어들어도 최종값은 받아온 기록 (${LS.getItem("unicorn-save-v1")})`);
  }

  // ============================================================
  group("9) 토큰이 없으면 요청을 쏘지 않는다");
  {
    const { window, calls, LS } = mk({ cloud_meta: [], cloud_pull: [], cloud_issue: "X", cloud_claim: { ok: true } });
    const proto = Object.getPrototypeOf(LS);
    const oGet = proto.getItem, oSet = proto.setItem;
    proto.getItem = function () { throw new Error("차단"); };
    proto.setItem = function () { throw new Error("차단"); };

    const before = calls.length;
    window.Cloud.openModal();
    await tick();
    const issue = window.document.querySelector("#cloud-issue");
    if (issue) issue.click();
    const claim = window.document.querySelector("#cloud-claim");
    if (claim) {
      const inp = window.document.querySelector("#cloud-code-input");
      if (inp) inp.value = "AAAA-BBBB";
      claim.click();
    }
    window.Cloud._t.openLink();
    window.Cloud.onConflict("rookie", "2026-07-27T05:00:00Z");
    await tick();
    check(calls.length === before, `토큰이 없으면 openModal/openLink/onConflict가 fetch를 안 부른다 (${calls.length - before}회)`);
    const txt = window.document.body.textContent;
    proto.getItem = oGet; proto.setItem = oSet;
    check(/(쓸 수 없|사용할 수 없|어려워요)/.test(txt), `못 쓴다는 안내가 뜬다 — "${txt.slice(0, 80)}"`);
  }

  // ============================================================
  group("10) 코드 복사 — 제스처 안에서도 복사할 수 있다");
  {
    let copied = null;
    const { window, $ } = mk({ cloud_issue: "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2" });
    window.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
    window.Cloud.openModal();
    $("#cloud-issue").click();
    await tick();
    const copyBtn = $("#cloud-copy");
    check(!!copyBtn, "발급 뒤 복사 버튼이 생긴다 (사용자 제스처 안에서 복사 가능)");
    copied = null;
    if (copyBtn) copyBtn.click();
    await tick();
    check(copied === "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2", `복사 버튼을 누르면 복사된다 (${copied})`);
    check(/길게 눌러|직접 복사/.test($(".cloud-modal").textContent), "복사가 안 될 때 대안을 안내한다");
  }
  {
    // clipboard가 거부해도(iOS) 조용히 넘어가지 않는다
    const { window, $ } = mk({ cloud_issue: "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2" });
    window.navigator.clipboard = { writeText: () => Promise.reject(new Error("NotAllowed")) };
    window.Cloud.openModal();
    $("#cloud-issue").click();
    await tick();
    $("#cloud-copy").click();
    await tick();
    check(!!$(".cloud-toast"), "복사가 거부되면 안내 토스트가 뜬다 (조용히 삼키지 않는다)");
  }

  // ============================================================
  group("11) init() 전에 openModal을 열어도 null 키를 쓰지 않는다");
  {
    const { window, LS, $ } = mk({ cloud_claim: { ok: true }, cloud_pull: [] });
    window.Cloud.openModal();          // init() 없이
    $("#cloud-code-input").value = "AAAA-BBBB-CCCC";
    $("#cloud-claim").click();
    await tick();
    check(LS.getItem("grow-cloud-dirty-null") === null, "grow-cloud-dirty-null 키를 만들지 않는다");
  }

  // ============================================================
  group("12) 슬롯 맵이 없는 로컬 기록도 '이 기기에 있음'으로 친다");
  {
    // 7종의 슬롯 이사는 그 게임 페이지를 열 때만 일어난다. 아직 안 연 사람은
    // 평키·환생유산·대전기록만 갖고 있는데, 이걸 "없음"으로 보면 서버 것이
    // 자동 적용되면서 진짜 기록이 지워진다.
    const UP = "2026-07-27T05:00:00Z";
    const chefFlat = JSON.stringify({ name: "최셰프", phase: "chef-pro", proYear: 8 });
    const stockLegacy = "1200";
    const soccerBattle = JSON.stringify([{ w: 3, l: 1 }]);
    const rows = [
      { game: "beta:chef", updated: UP, data: { "chef-save-v1-slots": slotsBlob(chefSlots) } },
      { game: "beta:stock", updated: UP, data: { "investor-save-v1-slots": slotsBlob({ s1: { phase: "stock-pro", proYear: 7, savedAt: 1 } }) } },
      { game: "beta:soccer", updated: UP, data: { "winger-save-v1-slots": slotsBlob({ s1: { phase: "soccer-pro", proYear: 2, savedAt: 1 } }) } },
    ];
    const { window, LS, $ } = mk({ cloud_pull: rows, cloud_push: UP });
    LS.setItem("chef-save-v1", chefFlat);                 // 평키만 (이사 전)
    LS.setItem("investor-save-v1-legacy", stockLegacy);    // 환생 유산만
    LS.setItem("grow-battle-soccer-v1", soccerBattle);     // 대전 기록만
    window.Cloud._t.openLink();
    await tick();
    const txt = $(".cloud-modal").textContent;

    check(!!$('input[name="pk-chef"]'), "평키만 있어도 고르는 화면이 뜬다 (자동 적용 아님)");
    check(!!$('input[name="pk-stock"]'), "환생 유산만 있어도 고르는 화면이 뜬다");
    check(!!$('input[name="pk-soccer"]'), "대전 기록만 있어도 고르는 화면이 뜬다");
    check(/오너셰프 8년차/.test(txt), "평키 기록이 내용으로 요약된다 (서버 쪽 4년차와 구분됨)");
    // 요약을 못 만드는 기록도 "없음"이라고 하지 않는다. 다만 곁가지 기록(환생 유산·대전 기록)은
    // 진짜 커리어와 똑같이 '기록 있음'으로 뭉뚱그리면 안 된다 — 무엇이 있는지 말해줘야 한다.
    check(/환생|유산/.test(txt), "환생 유산만 있는 기기는 그렇다고 말한다");
    check(/대전/.test(txt), "대전 기록만 있는 기기는 그렇다고 말한다");
    check(!/기록 없음/.test(txt), "진짜 기록을 두고 '기록 없음'이라 하지 않는다");

    // 기본값은 이 기기 (synced 키가 없다 = 한 번도 못 올렸다 = 가장 위험한 기록)
    const chefMine = $('input[name="pk-chef"][value="mine"]');
    check(!!chefMine && chefMine.checked, "한 번도 못 올린 기록은 '이 기기'가 기본");

    const done12 = $("#cloud-done");
    if (done12) done12.click();
    await tick();
    check(LS.getItem("chef-save-v1") === chefFlat, "이 기기를 골랐으면 평키가 그대로 남는다");
    check(LS.getItem("investor-save-v1-legacy") === stockLegacy, "이 기기를 골랐으면 환생 유산이 그대로 남는다");
    check(LS.getItem("grow-battle-soccer-v1") === soccerBattle, "이 기기를 골랐으면 대전 기록이 그대로 남는다");
  }
  {
    // onConflict 화면도 같은 기준이어야 한다
    const { window, LS, $ } = mk({
      cloud_pull: [{ game: "beta:chef", updated: "2026-07-27T05:00:00Z", data: { "chef-save-v1-slots": slotsBlob(chefSlots) } }],
      cloud_push: "2026-07-27T06:00:00Z",
    });
    const chefFlat = JSON.stringify({ name: "최셰프", phase: "chef-pro", proYear: 8 });
    LS.setItem("chef-save-v1", chefFlat);
    window.Cloud.onConflict("chef");
    await tick();
    const ctxt = $(".cloud-modal").textContent;
    check(/오너셰프 8년차/.test(ctxt), "충돌 화면도 평키 기록을 요약한다");
    check(!/기록 없음/.test(ctxt), "충돌 화면에 '기록 없음'이 뜨지 않는다");
    const keep12 = $("#cloud-keep");
    if (keep12) keep12.click();
    await tick();
    check(LS.getItem("chef-save-v1") === chefFlat, "'이 기기 것 쓰기'로 평키가 지켜진다");
  }

  // ============================================================
  group("13) 기본 선택은 제품이 실제로 만드는 상태에서 확인한다");
  {
    const rows = [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }];
    const { window, LS, $ } = mk({ cloud_pull: rows });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    // grow-cloud-synced-rookie 없음 = 이 기기가 한 번도 못 올린 상태 (기능 첫 도입 시 전부 이 상태)
    window.Cloud._t.openLink();
    await tick();
    const m13 = $('input[name="pk-rookie"][value="mine"]'), t13 = $('input[name="pk-rookie"][value="theirs"]');
    check(!!m13 && m13.checked, "한 번도 올린 적 없으면 '이 기기'가 기본");
    check(!!t13 && !t13.checked, "이때 '다른 기기'는 기본이 아니다");
  }
  {
    // 제품이 이 화면을 여는 유일한 길(코드 넣기 → claim)로 실제로 걸어본다.
    // claim 직전에 옛 계정 기준 도장을 심어둬도 orphanLedger()가 지우므로,
    // 스펙 6.2의 "서버가 더 최신이면 다른 기기" 분기는 제품에서 도달할 수 없다.
    const UP = "2026-07-27T05:00:00Z";
    const { window, LS, $ } = mk({
      cloud_claim: { ok: true },
      cloud_meta: [],
      cloud_pull: [{ game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    LS.setItem("grow-cloud-synced-rookie", "2026-07-27T01:00:00Z");   // 옛 계정 기준 도장
    window.Cloud.openModal();
    $("#cloud-code-input").value = "AAAA-BBBB-CCCC";
    $("#cloud-claim").click();
    await tick(40);
    check(LS.getItem("grow-cloud-synced-rookie") === null,
      `claim이 옛 계정 도장을 지운다 = 비교할 대상이 없다 (synced=${LS.getItem("grow-cloud-synced-rookie")})`);
    const m13b = $('input[name="pk-rookie"][value="mine"]'), t13b = $('input[name="pk-rookie"][value="theirs"]');
    check(!!m13b && m13b.checked, "제품이 실제로 여는 화면에서는 '이 기기'가 기본");
    check(!!t13b && !t13b.checked, "이때 '다른 기기'는 기본이 아니다");
  }

  // ============================================================
  group("14) 동기화 표시 (스펙 6.3)");
  {
    // 금방 끝나는 자동 저장은 화면에 아무것도 남기지 않는다
    const { window, LS, $ } = mk({ cloud_meta: [], cloud_push: "2026-07-27T00:00:00Z" });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.mark();
    await tick(120);
    check(!$(".cloud-sync"), "빠른 전송에는 표시가 뜨지 않는다 (자동 저장마다 깜빡이지 않음)");
  }
  {
    // 오래 걸리는 전송은 '동기화중…' → '✓ 저장됨' → 사라짐
    let release;
    const slow = new Promise((r) => { release = r; });
    const { window, LS, $ } = mk({ cloud_meta: [], cloud_push: () => slow.then(() => "2026-07-27T00:00:00Z") });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.mark();
    await tick(600);
    check(!!$(".cloud-sync") && /동기화중/.test($(".cloud-sync").textContent),
      `전송이 길어지면 '☁️ 동기화중…'이 뜬다 — "${$(".cloud-sync") && $(".cloud-sync").textContent}"`);
    release();
    await tick(60);
    check(!!$(".cloud-sync") && /저장됨/.test($(".cloud-sync").textContent),
      `끝나면 '✓ 저장됨'으로 바뀐다 — "${$(".cloud-sync") && $(".cloud-sync").textContent}"`);
    await tick(1700);
    check(!$(".cloud-sync"), "'✓ 저장됨'은 1.5초 뒤 사라진다");
  }
  {
    // 실패는 빨라도 알려준다 (오프라인인 걸 알아야 하니까)
    const { window, LS, $ } = mk({ cloud_meta: [] });   // cloud_push 라우트 없음 → reject
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.mark();
    await tick(80);
    check(!!$(".cloud-sync") && /오프라인/.test($(".cloud-sync").textContent),
      `실패하면 '오프라인'이 뜬다 — "${$(".cloud-sync") && $(".cloud-sync").textContent}"`);
    check(!!$(".cloud-sync") && $(".cloud-sync").getAttribute("role") === "status", "표시는 role=status (읽어주되 진행을 막지 않음)");
    await tick(2200);
    check(!$(".cloud-sync"), "'오프라인'은 2초 뒤 사라진다");
  }
  {
    // CSS 쪽 계약 — 레이아웃을 밀지 않고, 애니메이션을 끌 수 있어야 한다
    const css = fs.readFileSync("/workspace/grow-games/beta/base.css", "utf8");
    const block = (css.split(".cloud-sync")[1] || "").slice(0, 400);
    check(/\.cloud-sync/.test(css), "base.css에 .cloud-sync 규칙이 있다");
    check(/position:\s*fixed/.test(block), "position: fixed — 레이아웃을 밀지 않는다");
    check(/pointer-events:\s*none/.test(block), "pointer-events: none — 입력을 막지 않는다");
    const rm = css.slice(css.indexOf("prefers-reduced-motion", css.indexOf(".cloud-sync")));
    check(/cloud-sync/.test(rm.slice(0, 200)), "prefers-reduced-motion에서 .cloud-sync 애니메이션을 끈다");
  }

  // ============================================================
  group("15) frozen 깃발은 새로고침 없이 살아남지 않는다");
  {
    const { window, LS } = mk({});
    const T = window.Cloud._t;
    LS.setItem("unicorn-save-v1", JSON.stringify({ company: "옛것", savedAt: 1 }));
    T.apply("unicorn", { "unicorn-save-v1": JSON.stringify(unicornSave) });   // 새로고침을 예약하지 않는 호출
    check(window.Cloud.frozen === true, "적용 직후에는 게임 저장을 멈춘다");
    await tick(2300);
    check(window.Cloud.frozen === false, "새로고침이 없으면 깃발이 풀린다 (저장이 영영 멈추지 않는다)");
  }

  // ============================================================
  // 3차 리뷰가 짚은 사각지대 3곳 — claim 뒤 취소/실패 경로, 겹친 전송, 로컬이 빈 충돌
  // ============================================================

  group("16) claim 직후 화면을 버려도 기록이 조용히 지워지지 않는다 (Critical 1)");
  {
    // 시나리오: 기기 B는 한 번도 올린 적 없는 chef 기록을 갖고 있다 (dirty 없음, syncKey 없음).
    // rookie는 옛 계정 기준의 syncKey를 갖고 있다. 코드를 넣어 claim에 성공하면 계정이
    // 통째로 바뀌는데, 그 순간 남아 있는 syncKey는 전부 옛 계정 기준이라 거짓말이 된다.
    // 연결 화면(cloud_pull)이 실패해서 사용자가 확인 버튼을 못 누른 상태를 만든다.
    const chefFlat = JSON.stringify({ name: "최셰프", phase: "chef-pro", proYear: 8 });
    let pulls = 0;
    const { window, LS, $ } = mk({
      cloud_claim: { ok: true },
      cloud_pull: () => { pulls++; return Promise.reject(new Error("네트워크 불안정")); },
      cloud_meta: [],
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("chef-save-v1", chefFlat);                                  // 서버에 올린 적 없는 진짜 기록
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    LS.setItem("grow-cloud-synced-rookie", "2026-07-27T01:00:00Z");        // 옛 계정 기준 도장
    LS.setItem("grow-cloud-synced-chef", "");                              // 없음과 같게 두기 위해 비움
    LS.removeItem("grow-cloud-synced-chef");
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.openModal();
    $("#cloud-code-input").value = "AAAA-BBBB-CCCC";
    $("#cloud-claim").click();
    await tick(40);

    check(pulls >= 1, "claim 성공 뒤 연결 화면을 시도한다");
    check(LS.getItem("grow-cloud-dirty-chef") === "1",
      `기록이 있는 게임은 전부 '결정 필요'로 표시된다 (chef dirty=${LS.getItem("grow-cloud-dirty-chef")})`);
    check(LS.getItem("grow-cloud-synced-chef") === null,
      `옛 계정 기준 도장은 지워진다 (chef synced=${LS.getItem("grow-cloud-synced-chef")})`);
    check(LS.getItem("grow-cloud-synced-rookie") === null,
      `열려 있던 게임의 옛 도장도 지워진다 (rookie synced=${LS.getItem("grow-cloud-synced-rookie")})`);
    check(LS.getItem("grow-cloud-dirty-stock") !== "1",
      "로컬에 기록이 없는 게임은 dirty로 찍지 않는다 (빈 꾸러미가 올라가면 안 됨)");

    // 진짜 확인: 다음에 chef 페이지를 열면 묻지 않는 pull이 아니라 충돌 화면이어야 한다
    const act = window.Cloud._t.decide("chef", "2026-07-27T08:00:00Z");
    check(act === "conflict", `다음 실행 판정이 충돌이다 (지금은 "${act}")`);
  }
  {
    // 닫기로 화면을 버리는 경우도 같다
    const { window, LS, $ } = mk({
      cloud_claim: { ok: true },
      cloud_pull: [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
      cloud_meta: [],
    });
    LS.setItem("chef-save-v1", JSON.stringify({ phase: "chef-pro", proYear: 8 }));
    LS.setItem("grow-cloud-synced-chef", "2026-07-27T01:00:00Z");
    window.Cloud.openModal();
    $("#cloud-code-input").value = "AAAA-BBBB-CCCC";
    $("#cloud-claim").click();
    await tick(40);
    const close = $(".cloud-close");
    if (close) close.click();
    check(window.Cloud._t.decide("chef", "2026-07-27T08:00:00Z") === "conflict",
      "닫기로 버려도 chef는 충돌 화면으로 올라온다");
  }

  // ============================================================
  group("17) 로컬이 비었을 때 충돌 화면이 영원히 반복되지 않는다 (Important 2)");
  {
    // dirty=1 인데 로컬에 아무것도 없는 상태는 실제로 도달한다
    // (연결 화면에서 '다른 기기'로 고른 게임의 서버 꾸러미가 비어 있었던 경우 등)
    const UP = "2026-07-27T05:00:00Z";
    const { window, LS, $ } = mk({
      cloud_pull: [{ game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
      cloud_push: "2026-07-27T06:00:00Z",
    });
    LS.setItem("grow-cloud-dirty-rookie", "1");   // 로컬 키는 하나도 없다
    window.Cloud.onConflict("rookie");
    await tick(40);

    const toast = $(".cloud-toast");
    check(!(toast && /올렸어요/.test(toast.textContent)),
      `올리지 않았는데 올렸다고 하지 않는다 (토스트="${toast && toast.textContent}")`);
    check(LS.getItem("grow-cloud-dirty-rookie") === "0",
      `깃발이 정리된다 (dirty=${LS.getItem("grow-cloud-dirty-rookie")})`);
    check(LS.getItem("grow-cloud-synced-rookie") === UP,
      `서버 시각을 적어둬 판정이 끝난다 (synced=${LS.getItem("grow-cloud-synced-rookie")})`);
    check(window.Cloud._t.decide("rookie", UP) === "none",
      `다음 실행에서 같은 화면이 다시 뜨지 않는다 (지금은 "${window.Cloud._t.decide("rookie", UP)}")`);
    check(LS.getItem("rookie-save-v1-slots") === slotsBlob(idolSlots),
      "잃을 게 없으므로 서버 기록을 받아둔다");
  }
  {
    // 만약 화면을 띄운다면, 있지도 않은 '이 기기 것'을 올리라고 권해서는 안 된다
    const UP = "2026-07-27T05:00:00Z";
    const { window, LS, $ } = mk({
      cloud_pull: [{ game: "beta:rookie", updated: UP, data: {} }],   // 서버도 빈 꾸러미
      cloud_push: "2026-07-27T06:00:00Z",
    });
    LS.setItem("grow-cloud-dirty-rookie", "1");
    window.Cloud.onConflict("rookie");
    await tick(40);
    check(!$("#cloud-keep"), "양쪽 다 없으면 '이 기기 것 쓰기' 버튼을 내주지 않는다");
    check(window.Cloud._t.decide("rookie", UP) === "none",
      `양쪽 다 비어도 판정이 끝난다 (지금은 "${window.Cloud._t.decide("rookie", UP)}")`);
  }

  // ============================================================
  group("18) 전송이 겹쳐도 '동기화중' 알약이 남지 않는다 (Important 3)");
  {
    let n = 0;
    const gates = [];
    const { window, LS, $ } = mk({
      cloud_meta: [],
      cloud_push: () => { const i = n++; return new Promise((r) => { gates[i] = () => r("2026-07-27T00:00:00Z"); }); },
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    // 이미 한 번 올려본 기기로 둔다. 도장이 없으면 init()이 "아직 서버에 사본이 없는
    // 기록"으로 보고 스스로 push를 띄우는데(5.1 dirty), 그러면 아래에서 세는 전송이
    // 하나 밀려 알약 검증이 엉뚱한 요청을 보게 된다. 여기서 보려는 건 겹친 mark()다.
    LS.setItem("grow-cloud-synced-rookie", "2026-07-27T00:00:00Z");
    window.Cloud.init("rookie");
    await tick();

    window.Cloud.mark();          // 첫 전송
    await tick(500);              // 알약이 뜬다
    check(!!$(".cloud-sync") && /동기화중/.test($(".cloud-sync").textContent), "첫 전송이 길어져 알약이 뜬다");

    window.Cloud.mark();          // 두 번째 전송이 겹친다
    await tick(20);
    gates[0]();                   // 첫 전송만 먼저 끝난다
    await tick(40);
    check(!!$(".cloud-sync") && /동기화중/.test($(".cloud-sync").textContent),
      "아직 남은 전송이 있으면 알약이 유지된다");

    gates[1]();                   // 두 번째도 끝난다
    await tick(60);
    check(!!$(".cloud-sync") && /저장됨/.test($(".cloud-sync").textContent),
      `마지막 전송이 끝나면 '✓ 저장됨'으로 바뀐다 — "${$(".cloud-sync") && $(".cloud-sync").textContent}"`);
    await tick(1700);
    check(!$(".cloud-sync"), "겹친 전송 뒤에도 알약이 사라진다 (영원히 남지 않는다)");
  }
  {
    // 응답이 영영 안 오는 요청 — 알약에 천장이 있어야 한다
    const { window, LS, $ } = mk({
      cloud_meta: [],
      cloud_push: () => new Promise(() => {}),   // 절대 안 끝난다
    });
    check(typeof window.Cloud._t.setSyncTiming === "function", "테스트에서 표시 타이밍을 줄일 수 있다");
    if (window.Cloud._t.setSyncTiming) window.Cloud._t.setSyncTiming(100, 500);
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.mark();
    await tick(200);
    check(!!$(".cloud-sync") && /동기화중/.test($(".cloud-sync").textContent), "안 끝나는 전송에도 알약은 뜬다");
    await tick(3000);
    check(!$(".cloud-sync"), "천장 시간이 지나면 알약이 스스로 걷힌다 (요청보다 오래 살지 않는다)");
  }

  // ============================================================
  group("19) 곁가지 기록만 있는 기기는 그렇다고 말해준다 (Important 4)");
  {
    const { window } = mk({});
    const T = window.Cloud._t;
    const legacy = T.describe("rookie", { "rookie-save-v1-legacy": "1200" });
    check(!!legacy && /환생|유산/.test(legacy), `환생 유산만 있으면 그렇게 말한다 — "${legacy}"`);
    check(legacy !== "기록 있음", "'기록 있음'으로 뭉뚱그리지 않는다");

    const battle = T.describe("rookie", { "grow-battle-v1": "[]" });
    check(!!battle && /대전/.test(battle), `대전 기록만 있으면 그렇게 말한다 — "${battle}"`);

    const both = T.describe("rookie", { "rookie-save-v1-legacy": "1200", "grow-battle-v1": "[]" });
    check(!!both && /환생|유산/.test(both) && /대전/.test(both), `둘 다면 둘 다 말한다 — "${both}"`);

    // 진짜 커리어는 그대로 내용으로 요약된다 (라벨만 고치는 것이지 판정은 그대로)
    const real = T.describe("rookie", { "rookie-save-v1-slots": slotsBlob(rookieSlots) });
    check(real === "프로 3년차 · 캐릭터 2명", `진짜 기록은 그대로 요약된다 — "${real}"`);
    check(T.hasData({ "grow-battle-v1": "[]" }) === true, "존재 판정은 그대로 (있는 걸 없다고 하지 않는다)");
  }
  {
    // 화면에서도 구분이 보여야 한다
    const UP = "2026-07-27T05:00:00Z";
    const { window, LS, $ } = mk({
      cloud_pull: [{ game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
    });
    LS.setItem("grow-battle-v1", "[]");
    window.Cloud._t.openLink();
    await tick();
    const txt = $(".cloud-modal").textContent;
    check(/대전/.test(txt), `연결 화면이 '대전 기록뿐'임을 보여준다 — "${txt.replace(/\s+/g, " ").slice(0, 200)}"`);
  }

  // ============================================================
  group("20) 스펙 5.4·6.2의 '2시간 전' 표시");
  {
    const { window, LS, $ } = mk({
      cloud_pull: [{
        game: "beta:rookie",
        updated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        data: { "rookie-save-v1-slots": slotsBlob(idolSlots) },
      }],
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud._t.openLink();
    await tick();
    check(/2시간 전/.test($(".cloud-modal").textContent),
      `연결 화면에 언제 저장됐는지 나온다 — "${$(".cloud-modal").textContent.replace(/\s+/g, " ").slice(0, 220)}"`);
  }
  {
    const { window, LS, $ } = mk({
      cloud_pull: [{
        game: "beta:rookie",
        updated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        data: { "rookie-save-v1-slots": slotsBlob(idolSlots) },
      }],
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud.onConflict("rookie");
    await tick();
    check(/3일 전/.test($(".cloud-modal").textContent),
      `충돌 화면에도 나온다 — "${$(".cloud-modal").textContent.replace(/\s+/g, " ").slice(0, 220)}"`);
  }

  // ============================================================
  group("21) 스펙 6.1 복사 버튼 피드백 · 자잘한 것들");
  {
    const { window, $ } = mk({ cloud_issue: "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2" });
    window.navigator.clipboard = { writeText: () => Promise.resolve() };
    window.Cloud.openModal();
    $("#cloud-issue").click();
    await tick();
    $("#cloud-copy").click();
    await tick();
    check(/복사됨/.test($("#cloud-copy").textContent),
      `버튼 자체가 '복사됨 ✓'으로 바뀐다 — "${$("#cloud-copy").textContent}"`);
    await tick(1700);
    check(/코드 복사/.test($("#cloud-copy").textContent),
      `1.5초 뒤 원래 문구로 돌아온다 — "${$("#cloud-copy").textContent}"`);
  }
  {
    const css = fs.readFileSync("/workspace/grow-games/beta/base.css", "utf8");
    const block = css.slice(css.indexOf(".cloud-toast {"), css.indexOf(".cloud-toast {") + 400);
    check(/pointer-events:\s*none/.test(block), ".cloud-toast도 터치를 먹지 않는다 (같은 자리에 1.8초 떠 있다)");
  }
  {
    // 새로고침이 막힌 환경 — 깃발이 영영 안 풀리면 유니콘 저장이 그 세션 내내 멈춘다.
    // jsdom의 location.reload()는 실제로 이동하지 않는다(재정의도 못 한다). 그래서
    // "새로고침을 시켰는데 페이지가 그대로 살아 있는" 상황을 그대로 재현한다.
    const { window, LS } = mk({
      cloud_pull: [{ game: "beta:unicorn", updated: "2026-07-27T05:00:00Z", data: { "unicorn-save-v1": JSON.stringify(unicornSave) } }],
    });
    LS.setItem("unicorn-save-v1", JSON.stringify({ company: "옛것", savedAt: 1 }));
    window.Cloud._pull("unicorn");
    await tick(60);
    check(window.Cloud.frozen === true, "받아온 직후에는 게임 저장을 멈춘다");
    await tick(3400);
    check(window.Cloud.frozen === false,
      `새로고침이 일어나지 않으면 저장 정지 깃발을 되돌린다 (frozen=${window.Cloud.frozen})`);
  }

  // ============================================================
  // 4차 리뷰
  // ============================================================

  group("22) 고르는 화면이 떠 있는 동안에는 배경 전송이 나가지 않는다 (Critical)");
  // 탭 전환·화면 잠금을 흉내낸다 (init()이 걸어둔 visibilitychange 리스너를 실제로 깨운다)
  const goBackground = (window) => {
    Object.defineProperty(window.document, "visibilityState", { value: "hidden", configurable: true });
    window.document.dispatchEvent(new window.Event("visibilitychange"));
  };
  const pushesFor = (calls, game) =>
    calls.filter((c) => c.fn === "cloud_push" && c.body.p_game === "beta:" + game).length;

  {
    // 연결 화면(claim 직후). 기기 A의 진짜 기록이 서버에 있고, 기기 B가 코드를 넣었다.
    // 화면이 "어느 쪽을 남길까요"를 묻는 동안 폰이 잠기면 B의 기록이 올라가서는 안 된다.
    const UP = "2026-07-27T05:00:00Z";
    const { window, calls, LS, $ } = mk({
      cloud_claim: { ok: true },
      cloud_meta: [],
      cloud_pull: [{ game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    // 이미 한 번 올려본 기기(도장 있음)로 둔다. 도장이 없으면 init()이 곧바로 push를
    // 띄워 lastPush가 서고, 아래 touch()가 2분 간격에 걸려 "안 올라갔다"가 공짜로
    // 참이 돼버린다. claim이 orphanLedger로 이 도장을 지우니 시나리오는 그대로다.
    LS.setItem("grow-cloud-synced-rookie", "2026-07-27T01:00:00Z");
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.openModal();
    $("#cloud-code-input").value = "AAAA-BBBB-CCCC";
    $("#cloud-claim").click();
    await tick(40);
    check(!!$('input[name="pk-rookie"]'), "연결 화면이 떠 있다");

    goBackground(window);          // 탭 전환 → visibilitychange
    window.Cloud.touch();          // 유니콘처럼 쉼 없이 저장하는 게임의 자동 저장
    await tick(40);
    check(pushesFor(calls, "rookie") === 0,
      `고르기 전에는 이 기기 것이 올라가지 않는다 (푸시 ${pushesFor(calls, "rookie")}회)`);

    $('input[name="pk-rookie"][value="mine"]').checked = true;
    $("#cloud-done").click();      // 화면이 결론 났다
    await tick(40);
    window.Cloud.touch();
    await tick(40);
    check(pushesFor(calls, "rookie") >= 1,
      `고르고 나면 그때 올라간다 (푸시 ${pushesFor(calls, "rookie")}회)`);
  }
  {
    // 연결 화면을 그냥 닫아버린 경우 — 장부는 dirty로 남아 다음 실행에서 다시 물어야 한다
    const UP = "2026-07-27T05:00:00Z";
    const { window, calls, LS, $ } = mk({
      cloud_claim: { ok: true },
      cloud_meta: [],
      cloud_pull: [{ game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    // 위와 같은 이유로 "이미 한 번 올려본 기기"에서 시작한다 (init()의 자동 push 배제)
    LS.setItem("grow-cloud-synced-rookie", "2026-07-27T01:00:00Z");
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.openModal();
    $("#cloud-code-input").value = "AAAA-BBBB-CCCC";
    $("#cloud-claim").click();
    await tick(40);
    goBackground(window);
    window.Cloud.touch();
    await tick(40);
    $(".cloud-close").click();     // 버리고 나간다
    await tick(20);
    // 닫은 그 순간이 아니라 **그 다음 자동 저장**이 진짜 위험한 순간이다.
    // dirty=1 · lastPush=0 이라 다음 touch() 한 번이면 전송 조건이 그대로 성립한다.
    window.Cloud.touch();
    goBackground(window);
    await tick(40);
    check(pushesFor(calls, "rookie") === 0,
      `버리고 나간 뒤 자동 저장이 와도 올라가지 않는다 (푸시 ${pushesFor(calls, "rookie")}회)`);
    check(LS.getItem("grow-cloud-dirty-rookie") === "1",
      `장부는 '결정 필요'로 남는다 (dirty=${LS.getItem("grow-cloud-dirty-rookie")})`);
    check(window.Cloud._t.decide("rookie", UP) === "conflict",
      `다음 실행에서 다시 물어본다 (지금은 "${window.Cloud._t.decide("rookie", UP)}")`);
  }
  {
    // 충돌 화면 — 유니콘은 탭 전환 없이도 touch()만으로 전송이 나간다 (쉬지 않고 저장하는 게임)
    const UP = "2026-07-27T05:00:00Z";
    const { window, calls, LS, $ } = mk({
      cloud_meta: [{ game: "beta:unicorn", updated: UP }],
      cloud_pull: [{ game: "beta:unicorn", updated: UP, data: { "unicorn-save-v1": JSON.stringify({ company: "저쪽", bestRun: 6e9, savedAt: 9 }) } }],
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("unicorn-save-v1", JSON.stringify(unicornSave));
    LS.setItem("grow-cloud-dirty-unicorn", "1");
    LS.setItem("grow-cloud-synced-unicorn", "2026-07-27T01:00:00Z");
    window.Cloud.init("unicorn");
    await tick(40);
    check(!!$("#cloud-keep"), "충돌 화면이 뜬다");

    window.Cloud.touch();
    window.Cloud.touch();
    goBackground(window);
    await tick(40);
    check(pushesFor(calls, "unicorn") === 0,
      `고르는 동안 자동 저장이 서버를 건드리지 않는다 (푸시 ${pushesFor(calls, "unicorn")}회)`);

    $("#cloud-keep").click();
    await tick(60);
    check(pushesFor(calls, "unicorn") >= 1,
      `'이 기기 것 쓰기'를 고르면 그때 올라간다 (푸시 ${pushesFor(calls, "unicorn")}회)`);
  }
  {
    // 충돌 화면을 닫아버린 경우 — 역시 아무것도 올라가지 않고 장부가 남는다
    const UP = "2026-07-27T05:00:00Z";
    const { window, calls, LS, $ } = mk({
      cloud_meta: [{ game: "beta:unicorn", updated: UP }],
      cloud_pull: [{ game: "beta:unicorn", updated: UP, data: { "unicorn-save-v1": JSON.stringify({ company: "저쪽", bestRun: 6e9, savedAt: 9 }) } }],
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("unicorn-save-v1", JSON.stringify(unicornSave));
    LS.setItem("grow-cloud-dirty-unicorn", "1");
    LS.setItem("grow-cloud-synced-unicorn", "2026-07-27T01:00:00Z");
    window.Cloud.init("unicorn");
    await tick(40);
    window.Cloud.touch();
    goBackground(window);
    await tick(40);
    $(".cloud-close").click();
    await tick(20);
    // 닫자마자가 아니라 그 뒤로도 계속 막혀 있어야 한다. 유니콘은 쉼 없이 저장하니
    // 닫은 직후의 touch() 한 번이 곧바로 "이 기기 것 쓰기"를 대신 눌러버린다.
    window.Cloud.touch();
    goBackground(window);
    await tick(40);
    check(pushesFor(calls, "unicorn") === 0,
      `충돌 화면을 버린 뒤 자동 저장이 와도 올라가지 않는다 (푸시 ${pushesFor(calls, "unicorn")}회)`);
    check(LS.getItem("grow-cloud-dirty-unicorn") === "1", "장부는 그대로 '결정 필요'");
    check(window.Cloud._t.decide("unicorn", UP) === "conflict", "다음 실행에서 다시 물어본다");
  }

  // ============================================================
  group("23) 4차 리뷰 Minor — 천장·토스트·환생 유산");
  {
    // Minor 1) 천장에 닿아 걷어낸 뒤, 늦게 도착한 옛 응답이 새 전송의 알약을 건드리면 안 된다
    let release, n = 0;
    const slow = new Promise((r) => { release = r; });
    const { window, LS, $ } = mk({
      cloud_meta: [],
      cloud_push: () => (n++ === 0 ? slow.then(() => "2026-07-27T00:00:00Z") : new Promise(() => {})),
    });
    window.Cloud._t.setSyncTiming(50, 300);
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.mark();            // ① 응답이 아주 늦은 전송
    await tick(600);                // 천장에 닿아 '오프라인'으로 걷힌다
    await tick(2100);               // '오프라인'도 사라진다
    check(!$(".cloud-sync"), "천장에 닿으면 알약이 걷힌다");

    window.Cloud.mark();            // ② 새 전송 (아직 안 끝남)
    await tick(150);
    check(!!$(".cloud-sync") && /동기화중/.test($(".cloud-sync").textContent), "새 전송의 알약이 뜬다");
    release();                      // ①의 늦은 응답이 이제야 도착
    await tick(80);
    check(!!$(".cloud-sync") && /동기화중/.test($(".cloud-sync").textContent),
      `걷어낸 옛 응답이 새 전송의 알약을 가로채지 않는다 — "${$(".cloud-sync") && $(".cloud-sync").textContent}"`);
  }
  {
    // Minor 2) '이 기기 것 쓰기'가 실패했는데 올렸다고 말하면 안 된다 (cloud_push 라우트 없음 → reject)
    const { window, LS, $ } = mk({
      cloud_pull: [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    LS.setItem("grow-cloud-dirty-rookie", "1");
    window.Cloud.onConflict("rookie");
    await tick(40);
    $("#cloud-keep").click();
    await tick(80);
    const t = $(".cloud-toast");
    check(!!t && !/올렸어요/.test(t.textContent),
      `못 올렸으면 올렸다고 하지 않는다 — "${t && t.textContent}"`);
    check(LS.getItem("grow-cloud-dirty-rookie") === "1", "실패했으니 올릴 거리로 남는다");
  }
  {
    // 성공했을 때는 올렸다고 말해준다
    const { window, LS, $ } = mk({
      cloud_pull: [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    LS.setItem("grow-cloud-dirty-rookie", "1");
    window.Cloud.onConflict("rookie");
    await tick(40);
    $("#cloud-keep").click();
    await tick(80);
    const t = $(".cloud-toast");
    check(!!t && /올렸어요/.test(t.textContent), `성공하면 올렸다고 말한다 — "${t && t.textContent}"`);
    check(LS.getItem("grow-cloud-dirty-rookie") === "0", "올렸으니 장부가 정리된다");
  }
  {
    // Minor 4) 커리어와 환생 유산이 함께 있으면 요약이 유산도 말해줘야 한다.
    // 게임 통째로 바꾸는 방식(5.3)이라 '다른 기기'를 고르면 유산도 같이 사라지는데,
    // 요약이 커리어만 말하면 사라진다는 걸 아무도 모른다.
    const { window, LS, $ } = mk({
      cloud_pull: [{ game: "beta:rookie", updated: "2026-07-27T05:00:00Z", data: { "rookie-save-v1-slots": slotsBlob(idolSlots) } }],
    });
    const T = window.Cloud._t;
    const both = T.describe("rookie", { "rookie-save-v1-slots": slotsBlob(rookieSlots), "rookie-save-v1-legacy": "1200" });
    check(!!both && /프로 3년차/.test(both) && /환생 유산/.test(both),
      `커리어 + 환생 유산이면 둘 다 말한다 — "${both}"`);
    const only = T.describe("rookie", { "rookie-save-v1-slots": slotsBlob(rookieSlots) });
    check(only === "프로 3년차 · 캐릭터 2명", `유산이 없으면 문구가 늘어나지 않는다 — "${only}"`);

    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    LS.setItem("rookie-save-v1-legacy", "1200");
    T.openLink();
    await tick();
    const txt = $(".cloud-modal").textContent;
    check(/환생 유산/.test(txt), "고르는 화면에서도 유산이 함께 있다는 걸 보여준다");
  }

  // ============================================================
  // 5차 리뷰
  // ============================================================

  group("24) 물어볼 게 있다고 정해진 순간부터 붙잡는다 (5차 Critical 2)");
  {
    // 왕복이 도는 동안(모바일에서는 수백 ms~수 초)에도 게임은 dirty=1 상태다.
    // 그 사이 폰을 잠그거나 자동 저장이 돌면 사용자가 고르기 전에 이 기기 것이 올라간다.
    const UP = "2026-07-27T05:00:00Z";
    let release;
    const slow = new Promise((r) => { release = r; });
    const { window, calls, LS, $ } = mk({
      cloud_meta: [{ game: "beta:unicorn", updated: UP }],
      cloud_pull: () => slow,
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("unicorn-save-v1", JSON.stringify(unicornSave));
    LS.setItem("grow-cloud-dirty-unicorn", "1");
    LS.setItem("grow-cloud-synced-unicorn", "2026-07-27T01:00:00Z");
    window.Cloud.init("unicorn");
    await tick(40);                 // cloud_meta는 왔고, 충돌 pull은 아직 날아가는 중
    check(!$("#cloud-keep"), "아직 화면은 안 떴다 (pull이 왕복 중)");

    window.Cloud.touch();
    goBackground(window);
    await tick(40);
    check(pushesFor(calls, "unicorn") === 0,
      `화면이 뜨기 전이라도 물어볼 게 있으면 올리지 않는다 (푸시 ${pushesFor(calls, "unicorn")}회)`);

    release([{ game: "beta:unicorn", updated: UP,
      data: { "unicorn-save-v1": JSON.stringify({ company: "저쪽", bestRun: 6e9, savedAt: 9 }) } }]);
    await tick(60);
    check(!!$("#cloud-keep"), "왕복이 끝나면 화면이 뜬다");
  }
  {
    // pull이 실패하면 화면조차 못 띄운다 = 물어볼 기회가 없다.
    // orphanLedger()가 같은 상황에서 붙잡아 두는 것과 같은 이유로, 여기서도 놓으면 안 된다.
    const UP = "2026-07-27T05:00:00Z";
    const { window, calls, LS, $ } = mk({
      cloud_meta: [{ game: "beta:unicorn", updated: UP }],
      cloud_pull: () => Promise.reject(new Error("끊김")),
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("unicorn-save-v1", JSON.stringify(unicornSave));
    LS.setItem("grow-cloud-dirty-unicorn", "1");
    LS.setItem("grow-cloud-synced-unicorn", "2026-07-27T01:00:00Z");
    window.Cloud.init("unicorn");
    await tick(60);
    check(!$("#cloud-keep"), "pull이 실패해 화면이 없다");

    window.Cloud.touch();
    goBackground(window);
    await tick(40);
    check(pushesFor(calls, "unicorn") === 0,
      `물어볼 기회가 없었으니 이번 실행 내내 붙잡는다 (푸시 ${pushesFor(calls, "unicorn")}회)`);
    check(LS.getItem("grow-cloud-dirty-unicorn") === "1", "장부는 '결정 필요'로 남는다");
    check(window.Cloud._t.decide("unicorn", UP) === "conflict", "다음 실행에서 다시 물어본다");
  }
  {
    // 붙잡는 건 물어볼 게 있는 게임뿐이다 — 멀쩡한 게임까지 세션 내내 멈추면 안 된다
    const { window, calls, LS } = mk({
      cloud_meta: [],
      cloud_push: "2026-07-27T09:00:00Z",
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieSlots));
    window.Cloud.init("rookie");
    await tick(40);
    window.Cloud.touch();
    await tick(40);
    check(pushesFor(calls, "rookie") >= 1,
      `물어볼 게 없는 게임은 평소대로 올라간다 (푸시 ${pushesFor(calls, "rookie")}회)`);
  }

  // ============================================================
  group("25) 첫 은퇴 후 발급 권유 (Task 6)");
  {
    // 1) 조건이 맞으면 mark() 뒤 지연을 두고 한 번 뜬다. 버튼은 연동 화면으로 이어진다.
    const { window, $ } = mk({ cloud_meta: [] });
    window.Cloud.init("rookie");
    await tick();
    check(!$(".cloud-overlay"), "mark()를 부르기 전에는 아무것도 안 뜬다");
    window.Cloud.mark();
    await tick(400);
    check(!$(".cloud-overlay"), "1.2초가 되기 전에는 아직 안 뜬다 (은퇴 애니메이션 중 안 겹치게)");
    await tick(1000);
    check(!!$(".cloud-overlay"), "1.2초 뒤 발급 권유가 뜬다");
    const modalTxt = $(".cloud-modal") && $(".cloud-modal").textContent;
    check(/기록을 지킬까요/.test(modalTxt || ""), `문구가 기록 지키기 권유다 — "${modalTxt}"`);
    const go = $("#cloud-go");
    check(!!go, "코드 받기 버튼이 있다");
    if (go) go.click();
    await tick();
    check(!!$("#cloud-issue"), "버튼을 누르면 연동 화면(openModal)으로 이어진다");
  }
  {
    // 2) 두 번째 mark()에서는 다시 뜨지 않는다 — 한 번만 권하고 그 뒤로는 조르지 않는다
    const { window, $ } = mk({ cloud_meta: [] });
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.mark();
    await tick(1300);
    check(!!$(".cloud-overlay"), "첫 mark()는 뜬다 (전제 확인)");
    $(".cloud-close").click();
    window.Cloud.mark();
    await tick(1300);
    check(!$(".cloud-overlay"), "두 번째 mark()에서는 다시 뜨지 않는다");
  }
  {
    // 3) 이미 코드를 발급받았으면 뜨지 않는다
    const { window, LS, $ } = mk({ cloud_meta: [] });
    LS.setItem("grow-cloud-issued", "1");
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.mark();
    await tick(1300);
    check(!$(".cloud-overlay"), "코드를 이미 발급받았으면 권유가 뜨지 않는다");
  }
  {
    // 4) 결정 화면(연동·충돌)이 떠 있는 동안에는 겹쳐 뜨지 않는다.
    // onConflict()는 rpc 응답을 기다리기 전에 이미 awaiting[game]을 세워두므로,
    // cloud_pull 라우트가 없어 그 요청이 거부돼도(=catch로 조용히 삼켜져도) 붙잡힌 상태는 그대로다.
    const { window, $ } = mk({ cloud_meta: [] });
    window.Cloud.init("rookie");
    await tick();
    window.Cloud.onConflict("rookie");
    window.Cloud.mark();
    await tick(1300);
    check(!$(".cloud-overlay"), "결정 화면이 떠 있는 동안에는(awaiting) 발급 권유가 겹치지 않는다");
  }
  {
    // 5) 저장소를 못 쓰면(token() null) 절대 뜨지 않는다
    const { window, LS, $ } = mk({ cloud_meta: [] });
    const proto = Object.getPrototypeOf(LS);
    const oGet = proto.getItem, oSet = proto.setItem;
    proto.getItem = function () { throw new Error("차단"); };
    proto.setItem = function () { throw new Error("차단"); };
    window.Cloud.init("rookie");
    window.Cloud.mark();
    await tick(1300);
    check(!$(".cloud-overlay"), "저장소를 못 쓰면(토큰 없음) 발급 권유가 뜨지 않는다");
    proto.getItem = oGet; proto.setItem = oSet;
  }

  console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("테스트 자체가 터졌어요:", e); process.exit(1); });
