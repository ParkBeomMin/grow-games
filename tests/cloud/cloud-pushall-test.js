/* pushAll() — 코드를 발급하는 순간 8종 전부를 올린다.
 *
 * 실제로 있었던 버그: 평소 전송(push)은 지금 열어둔 게임 하나만 다룬다. 그래서 사용자가
 * 옛 기기에서 코드만 발급하고 바로 새 기기에서 연동하면, 아직 한 번도 안 연 나머지
 * 게임들은 서버에 사본이 없어 연결 화면이 "고를 것도 가져올 것도 없는" 빈 화면으로 떴다.
 * 고친 내용: 코드 발급(#cloud-issue 클릭) 즉시 pushAll()이 로컬에 기록이 있는 게임을
 * 전부(현재 열어둔 게임뿐 아니라) 올린다. 단, 결정 대기 중(awaiting)인 게임은 건너뛴다
 * (5차 리뷰가 세운 "물어볼 게 있다고 정해지는 순간부터 그 게임의 push를 막는다" 규칙과 같다).
 *
 * 픽스처는 반드시 디스크의 실제 저장 모양이어야 한다 — 7종은 <SAVE_KEY>-slots 슬롯 맵,
 * unicorn은 평키(SAVE_KEY) + unicorn-founded.
 *
 * CLOUD 환경변수로 검사 대상 파일을 바꿀 수 있다 (수정 전 파일로 돌려 실패를 먼저 확인하려고).
 *   CLOUD=/…/cloud-before.js node cloud-pushall-test.js
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
  const vc = new VirtualConsole(); // jsdom의 location.reload 미구현 경고 등을 삼킨다
  const dom = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only", url: "https://x.test/rookie/", virtualConsole: vc,
  });
  const { window } = dom;
  window.GROW_ENV = { beta: true };
  window.Match = { cfg: { url: "https://x.test", key: "anon" } };
  window.navigator.clipboard = { writeText: () => Promise.resolve() };
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

const pushesFor = (calls, game) =>
  calls.filter((c) => c.fn === "cloud_push" && c.body.p_game === "beta:" + game);
const allPushes = (calls) => calls.filter((c) => c.fn === "cloud_push");

(async function () {
  // ============================================================
  group("1) pushAll — 코드 발급 즉시 로컬에 기록이 있는 게임 전부를 올린다");
  {
    const { window, calls, LS, $ } = mk({ cloud_meta: [], cloud_issue: "CODE-1234", cloud_push: "2026-07-27T05:00:00Z" });
    const T = window.Cloud._t;

    // 여러 게임에 실제 저장 모양(슬롯 맵)으로 기록을 심는다 — 지금 열어둔 게임은 하나도 없다
    LS.setItem("rookie-save-v1-slots", slotsBlob({
      s1: { name: "김고교", phase: "hs", year: 2, pos: "batter", savedAt: 1000 },
    }));
    LS.setItem("trainee-save-v1-slots", slotsBlob({
      s1: { name: "이연습", phase: "trainee", year: 1, pos: "vocal", savedAt: 500 },
    }));
    LS.setItem("chef-save-v1-slots", slotsBlob({
      s1: { name: "최셰프", phase: "chef-pro", proYear: 4, savedAt: 700 },
    }));
    // unicorn은 슬롯이 아니라 평키 + 창업 흔적 키
    LS.setItem("unicorn-save-v1", JSON.stringify({ company: "코스모", bestRun: 7e10, savedAt: 900 }));
    LS.setItem("unicorn-founded", "1");
    // stock/dev/stream/soccer: 아무것도 없다 — 기록 없는 게임의 대표로 stock을 본다

    // 서버 payload와 견줄 기대값을 픽스처 심은 직후에 떠 둔다 (push 전 상태와 같다)
    const expected = {
      rookie: T.collect("rookie"),
      idol: T.collect("idol"),
      chef: T.collect("chef"),
      unicorn: T.collect("unicorn"),
    };
    check(Object.keys(expected.rookie).length > 0, "전제: rookie collect가 비어있지 않다");

    window.Cloud.openModal();
    $("#cloud-issue").click();
    await tick(60);

    // ---- p_game 별로 정확히 확인한다 (원시 호출 수가 아니라) ----
    ["rookie", "idol", "chef", "unicorn"].forEach((g) => {
      const p = pushesFor(calls, g);
      check(p.length === 1, `${g}는 정확히 1번 push된다 (${p.length}회)`);
      if (p.length === 1) {
        check(JSON.stringify(p[0].body.p_data) === JSON.stringify(expected[g]),
          `${g}의 payload가 자기 게임의 키만 담는다 — ${JSON.stringify(p[0].body.p_data)}`);
      }
    });

    const stockPush = pushesFor(calls, "stock");
    check(stockPush.length === 0, `로컬에 기록이 없는 stock은 push되지 않는다 (${stockPush.length}회)`);
    const devPush = pushesFor(calls, "dev");
    check(devPush.length === 0, `로컬에 기록이 없는 dev도 push되지 않는다 (${devPush.length}회)`);

    check(allPushes(calls).length === 4,
      `기록 있는 4종만 올라간다 — 총 push 횟수 ${allPushes(calls).length}회`);

    // 교차 오염이 없는지 — rookie payload에 idol/chef 키가 섞이지 않는다
    const rookiePush = pushesFor(calls, "rookie")[0];
    if (rookiePush) {
      const keys = Object.keys(rookiePush.body.p_data);
      check(keys.every((k) => k.indexOf("rookie") === 0), `rookie payload 키가 rookie 것뿐이다 — ${JSON.stringify(keys)}`);
    }
  }

  // ============================================================
  group("2) pushAll — 결정 대기 중(awaiting)인 게임은 건너뛴다");
  {
    // rookie는 지금 충돌(다른 기기와 각각 진행됨) 화면이 떠서 사람이 고르는 중이라고 가정한다.
    // onConflict()는 화면을 실제로 띄우면서 awaiting[game]을 세운다 — 다른 테스트가
    // 이 잠금을 확인할 때 쓰는 것과 같은 길이다 (cloud-behavior-test.js 그룹 22).
    const { window, calls, LS, $ } = mk({
      cloud_meta: [],
      cloud_issue: "CODE-5678",
      cloud_push: "2026-07-27T05:00:00Z",
      cloud_pull: [{
        game: "beta:rookie", updated: "2026-07-27T05:00:00Z",
        data: { "rookie-save-v1-slots": slotsBlob({ s2: { name: "다른기기", phase: "hs", year: 3, savedAt: 2000 } }) },
      }],
    });
    LS.setItem("rookie-save-v1-slots", slotsBlob({
      s1: { name: "김고교", phase: "hs", year: 2, pos: "batter", savedAt: 1000 },
    }));
    LS.setItem("trainee-save-v1-slots", slotsBlob({
      s1: { name: "이연습", phase: "trainee", year: 1, pos: "vocal", savedAt: 500 },
    }));

    window.Cloud.onConflict("rookie");
    await tick(30);
    check(!!$("#cloud-keep"), "전제: rookie 충돌(고르는) 화면이 실제로 떠 있다");

    window.Cloud.openModal();
    $("#cloud-issue").click();
    await tick(60);

    check(pushesFor(calls, "rookie").length === 0,
      `고르는 중인 rookie는 pushAll이 올리지 않는다 (${pushesFor(calls, "rookie").length}회)`);
    check(pushesFor(calls, "idol").length === 1,
      `대기 중이 아닌 idol은 평소대로 올라간다 (${pushesFor(calls, "idol").length}회)`);
  }

  console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("테스트 자체가 터졌어요:", e); process.exit(1); });
