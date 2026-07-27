/* 연결 직후 화면(openLink) — 스스로 상태를 보고 다르게 말한다.
 *
 * 실제로 있었던 버그(사용자 스크린샷): 두 번째 기기를 연동했더니 제목 "🔗 기기를
 * 연결했어요"와 버튼 "고른 대로 기록 맞추기"만 덩그러니 뜨고 고를 게 하나도 없었다.
 * 화면이 "양쪽 다 없다"/"고를 것 없이 가져오기만 하면 된다"/"진짜 골라야 한다"를
 * 구분하지 않고 늘 같은 문구·버튼을 보여줬기 때문이다.
 *
 * 고친 내용:
 *   - 양쪽 다 기록이 없으면 고르는 버튼 없이 설명만 보여준다.
 *   - 고를 게 없이 가져오기만 하면 되면(한쪽에만 있는 게임들뿐) 버튼이 "기록 가져오기".
 *   - 진짜 고를 게 있으면(양쪽 다 있는 게임이 하나라도 있으면) 버튼이 "고른 대로 기록 맞추기".
 *
 * 픽스처는 반드시 디스크의 실제 저장 모양이어야 한다 — 7종은 <SAVE_KEY>-slots 슬롯 맵,
 * unicorn은 평키(SAVE_KEY) + unicorn-founded.
 *
 * CLOUD 환경변수로 검사 대상 파일을 바꿀 수 있다.
 *   CLOUD=/…/cloud-before.js node cloud-link-screen-test.js
 */
"use strict";
const fs = require("fs");
const { JSDOM, VirtualConsole } = require(__dirname + "/jsdom.js");
const CLOUD = process.env.CLOUD || "/workspace/grow-games/beta/cloud.js";
const SRC = fs.readFileSync(CLOUD, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const group = (t) => console.log(`\n— ${t}`);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 40));

const slotsBlob = (o) => JSON.stringify(o);

function mk(routes) {
  const vc = new VirtualConsole();
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

const snapshot = (LS) => JSON.stringify(Object.keys(LS).sort().map((k) => [k, LS.getItem(k)]));

(async function () {
  // ============================================================
  group("3) 양쪽 다 기록이 없는 연결 화면 — 설명만 뜨고 고르는 버튼이 없다");
  {
    const { window, LS, $ } = mk({ cloud_pull: [] });   // 서버에도 아무 게임 행이 없다
    // 로컬에도 8종 중 어느 것도 심지 않는다 — 완전히 빈 계정
    window.Cloud._t.token();   // 기기 정체성 발급은 세이브 변경이 아니므로 스냅샷 전에 미리 만든다
    const before = snapshot(LS);

    window.Cloud._t.openLink();
    await tick();

    const txt = $(".cloud-modal") && $(".cloud-modal").textContent;
    check(!!txt && /아직 양쪽 어디에도 저장된 기록이 없어요/.test(txt),
      `설명 문구가 뜬다 — "${txt}"`);
    check(!$("#cloud-done"), "고를 것도 가져올 것도 없으니 확인 버튼 자체가 없다");
    check(!$('input[type="radio"]'), "라디오도 없다");

    // 확인할 버튼이 없으니 "클릭 가능한 것"은 닫기뿐이다 — 눌러도 아무것도 쓰지 않는다
    const close = $(".cloud-close");
    check(!!close, "닫기 버튼은 있다");
    if (close) close.click();
    const after = snapshot(LS);
    check(after === before, "화면을 열고 닫아도 저장소에 아무것도 쓰이지 않는다");
  }

  // ============================================================
  group("4) 한쪽에만 있는 기록뿐인 연결 화면 — '기록 가져오기'로만 말한다");
  {
    const UP = "2026-07-27T05:00:00Z";
    // 이 기기: rookie만 있다. 서버(다른 기기): idol만 있다. 겹치는 게임이 하나도 없다.
    const idolRemote = { s9: { name: "박연습", phase: "trainee", year: 1, pos: "dance", savedAt: 300 } };
    const rows = [{ game: "beta:idol", updated: UP, data: { "trainee-save-v1-slots": slotsBlob(idolRemote) } }];
    const { window, LS, $ } = mk({ cloud_pull: rows });
    LS.setItem("rookie-save-v1-slots", slotsBlob({
      s1: { name: "김고교", phase: "hs", year: 2, pos: "batter", savedAt: 1000 },
    }));

    window.Cloud._t.openLink();
    await tick();

    const btn = $("#cloud-done");
    check(!!btn, "확인 버튼이 있다 (가져올 게 있으므로)");
    check(!!btn && btn.textContent.trim() === "기록 가져오기",
      `고를 게 없으니 버튼이 '기록 가져오기'다 — "${btn && btn.textContent}"`);
    check(btn ? btn.textContent.indexOf("고른 대로") === -1 : true,
      "'고른 대로'라는 말은 쓰지 않는다 (고를 게 없으니)");
    check(!$('input[type="radio"]'), "고를 게 없으니 라디오도 없다");

    if (btn) btn.click();
    await tick();

    // 확인하면 다른 기기(idol)의 사본을 실제로 적용한다
    check(LS.getItem("trainee-save-v1-slots") === slotsBlob(idolRemote),
      "다른 기기에만 있던 idol 기록이 이 기기에 적용된다");
    check(LS.getItem("grow-cloud-synced-idol") === UP, "받아온 idol의 syncKey가 서버 시각으로 찍힌다");
    check(LS.getItem("grow-cloud-dirty-idol") === "0", "받아온 idol은 dirty가 아니다");
    // 이 기기에만 있던 rookie는 그대로 남고, 올릴 거리(dirty)로 표시된다
    check(LS.getItem("rookie-save-v1-slots") === slotsBlob({
      s1: { name: "김고교", phase: "hs", year: 2, pos: "batter", savedAt: 1000 },
    }), "이 기기에만 있던 rookie 기록은 그대로 남는다");
    check(LS.getItem("grow-cloud-dirty-rookie") === "1", "이 기기에만 있던 rookie는 올릴 거리로 표시된다");
  }

  // ============================================================
  group("5) 양쪽 다 있는 게임이 하나라도 있는 연결 화면 — '고른 대로 기록 맞추기'와 라디오");
  {
    const UP = "2026-07-27T05:00:00Z";
    const rookieRemote = { s9: { name: "다른기기", phase: "pro", proYear: 1, pos: "batter", savedAt: 2000 } };
    const rookieLocal = { s1: { name: "김고교", phase: "hs", year: 2, pos: "batter", savedAt: 1000 } };
    const rows = [{ game: "beta:rookie", updated: UP, data: { "rookie-save-v1-slots": slotsBlob(rookieRemote) } }];
    const { window, LS, $ } = mk({ cloud_pull: rows });
    LS.setItem("rookie-save-v1-slots", slotsBlob(rookieLocal));

    window.Cloud._t.openLink();
    await tick();

    const btn = $("#cloud-done");
    check(!!btn && btn.textContent.trim() === "고른 대로 기록 맞추기",
      `양쪽 다 있으면 버튼이 '고른 대로 기록 맞추기'다 — "${btn && btn.textContent}"`);
    const mine = $('input[name="pk-rookie"][value="mine"]');
    const theirs = $('input[name="pk-rookie"][value="theirs"]');
    check(!!mine && !!theirs, "고를 게임의 라디오(이 기기/다른 기기)가 둘 다 있다");
    check(!!mine && mine.checked, "기본 선택은 이 기기 것");
  }

  console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("테스트 자체가 터졌어요:", e); process.exit(1); });
