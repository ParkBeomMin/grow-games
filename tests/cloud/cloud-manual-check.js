/* cloud.js 게임별 요약 점검 — 8종의 SUMMARY 필드가 game.js와 맞는지 본다.
 *
 * 픽스처는 반드시 실제 저장 모양이어야 한다.
 *   - 7종: SAVE_KEY + "-slots" → { 슬롯id: {…상태…, savedAt} }   (game.js의 save()가 쓰는 모양)
 *   - unicorn: SAVE_KEY 평키 하나
 * 예전 버전은 7종도 평키로 만들어서, 평키만 읽던 summarize()의 버그를 그대로 통과시켰다.
 */
"use strict";
const fs = require("fs");
const SP = __dirname;
const { JSDOM, VirtualConsole } = require(__dirname + "/jsdom.js");
const SRC = fs.readFileSync("/workspace/grow-games/beta/cloud.js", "utf8");

function mkWindow(fetchImpl) {
  const dom = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only", url: "https://x.test/rookie/", virtualConsole: new VirtualConsole(),
  });
  const { window } = dom;
  window.GROW_ENV = { beta: true };
  window.Match = { cfg: { url: "https://x.test", key: "anon" } };
  window.fetch = fetchImpl || (() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
  window.eval(SRC);
  return window;
}

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const window = mkWindow();
const T = window.Cloud._t;

const SAVE = {
  rookie: "rookie-save-v1", idol: "trainee-save-v1", stock: "investor-save-v1",
  dev: "devgrow-save-v1", chef: "chef-save-v1", stream: "streamer-save-v1",
  soccer: "winger-save-v1", unicorn: "unicorn-save-v1",
};
// 7종은 슬롯 맵으로 감싼다 (실제 저장 모양)
const slotObj = (game, state) => {
  const o = {};
  o[SAVE[game] + "-slots"] = JSON.stringify({ ["s" + (state.savedAt || 1)]: Object.assign({ savedAt: 1 }, state) });
  return o;
};
const flatObj = (game, state) => ({ [SAVE[game]]: JSON.stringify(state) });

// 1) 게임별 필드 — 프로 전환 전/후 두 상태씩
const cases = {
  rookie: [
    [{ phase: "amateur", year: 2 }, "고교 2학년"],
    [{ phase: "pro", proYear: 3 }, "프로 3년차"],
  ],
  idol: [
    [{ phase: "trainee", year: 2 }, "연습생 2년차"],
    [{ phase: "idol-pro", proYear: 4 }, "데뷔 4년차"],
  ],
  stock: [
    [{ phase: "amateur", year: 1 }, "주린이 1년차"],
    [{ phase: "stock-pro", proYear: 2 }, "전업투자자 2년차"],
  ],
  dev: [
    [{ phase: "amateur", year: 3 }, "3년차 개발자"],
    [{ phase: "dev-pro", proYear: 1 }, "현업 개발자 1년차"],
  ],
  chef: [
    [{ phase: "amateur", year: 2 }, "2년차 요리사"],
    [{ phase: "chef-pro", proYear: 5 }, "오너셰프 5년차"],
  ],
  stream: [
    [{ phase: "amateur", year: 1 }, "1년차 스트리머"],
    [{ phase: "stream-pro", proYear: 2 }, "전업 스트리머 2년차"],
  ],
  soccer: [
    [{ phase: "amateur", year: 1 }, "유스 1년차"],
    [{ phase: "soccer-pro", proYear: 6 }, "프로 6시즌"],
  ],
};
Object.keys(cases).forEach((g) => {
  cases[g].forEach(([state, expected]) => {
    const got = T.summarize(g, slotObj(g, state));
    check(got === expected, `${g} summarize(슬롯 맵): "${got}" === "${expected}"`);
  });
});

// unicorn 만 평키 — 단계 이름은 unicorn/game.js의 STAGES가 원본
[
  [{ bestRun: 0, exits: 0 }, "부트스트랩"],
  [{ bestRun: 3e3, exits: 0 }, "프리시드"],
  [{ bestRun: 2e5, exits: 0 }, "시드 투자"],
  [{ bestRun: 7e6, exits: 0 }, "시리즈 A"],
  [{ bestRun: 2e8, exits: 0 }, "시리즈 B"],
  [{ bestRun: 7e9, exits: 0 }, "시리즈 C"],
  [{ bestRun: 7e10, exits: 2 }, "유니콘 · Exit 2회"],
  [{ bestRun: 7e12, exits: 3 }, "데카콘 · Exit 3회"],
].forEach(([state, expected]) => {
  const got = T.summarize("unicorn", flatObj("unicorn", state));
  check(got === expected, `unicorn summarize(평키): "${got}" === "${expected}"`);
});

// 평키만 있는 상태도 진짜 기록이다.
// 7종의 슬롯 이사는 "그 게임 페이지를 열 때" 일어나므로, 아직 안 연 사람의 기록은
// 평키에만 있다. 여기서 null을 주면 그 게임이 "이 기기엔 없음"으로 분류돼 지워진다.
check(T.summarize("rookie", flatObj("rookie", { phase: "pro", proYear: 3 })) === "프로 3년차",
  "7종도 슬롯 맵이 없으면 평키를 읽는다 (이사 전 기록)");
check(T.summarize("rookie", {}) === null, "저장 데이터 없으면 null");
// 슬롯도 평키도 못 읽지만 키는 있다 → 없다고 말하지 않는다.
// 다만 무엇이 있는지도 같이 말한다 (곁가지 기록을 진짜 커리어처럼 보이게 하면
// 사용자가 잘못 골라 반대편 기기의 진짜 기록을 껍데기로 덮어쓴다)
check(/환생|유산/.test(T.summarize("rookie", { "rookie-save-v1-legacy": "1200" }) || ""),
  "환생 유산만 있으면 '환생 유산'이라고 말한다");
check(/대전/.test(T.summarize("rookie", { "grow-battle-v1": "[]" }) || ""),
  "대전 기록만 있으면 '대전 기록'이라고 말한다");

// 2) claim → openLink 흐름 (실제 저장 모양으로)
const rookieLocal = { "rookie-save-v1-slots": JSON.stringify({ s1: { phase: "amateur", year: 2, savedAt: 100 } }) };
const rookieRemote = { "rookie-save-v1-slots": JSON.stringify({ s9: { phase: "pro", proYear: 2, savedAt: 900 } }) };
const idolRemote = { "trainee-save-v1-slots": JSON.stringify({ s5: { phase: "trainee", year: 1, savedAt: 500 } }) };

const w2 = mkWindow((url) => {
  if (/cloud_claim/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve(true) });
  if (/cloud_pull/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([
    { game: "beta:idol", data: idolRemote, updated: "2026-07-27T00:00:00Z" },
    { game: "beta:rookie", data: rookieRemote, updated: "2026-07-27T00:00:00Z" },
  ]) });
  return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
});
const $ = (s) => w2.document.querySelector(s);
w2.Cloud.init("rookie");
w2.localStorage.setItem("rookie-save-v1-slots", rookieLocal["rookie-save-v1-slots"]);
w2.Cloud.openModal();
$("#cloud-code-input").value = "SOME-CODE";
$("#cloud-claim").click();

setTimeout(() => {
  check(!!$(".cloud-modal"), "claim 성공 후 연결 화면이 뜬다");
  const txt = $(".cloud-modal") ? $(".cloud-modal").textContent : "";
  check(/양쪽 모두 기록이 있어요/.test(txt), "루키는 양쪽 다 있어 고르는 화면");
  check(/고교 2학년/.test(txt) && /프로 2년차/.test(txt), "양쪽 요약이 실제 내용으로 보인다");
  check(/한쪽에만 있는 기록/.test(txt), "아이돌은 다른 기기에만 있어 그대로 맞춘다 (안내가 미래형)");
  check(!/합쳐진/.test(txt), "'합쳐진'(섞는다는 뜻) 표현을 쓰지 않는다");
  const done = $("#cloud-done");
  check(!!done, "확인 버튼이 있다");
  check(done && /맞추기|불러오기|적용/.test(done.textContent), `버튼이 하는 일을 말한다 — "${done && done.textContent}"`);
  done.click();
  setTimeout(() => {
    check(w2.localStorage.getItem("trainee-save-v1-slots") === idolRemote["trainee-save-v1-slots"], "다른 기기에만 있던 idol이 적용됨");
    check(w2.localStorage.getItem("grow-cloud-dirty-idol") === "0", "받아온 idol은 dirty가 아니다");
    check(w2.localStorage.getItem("grow-cloud-dirty-stock") !== "1", "안 해본 게임은 dirty로 찍지 않는다");
    check(!$(".cloud-modal"), "확인 뒤 모달이 닫힌다");

    // 3) onConflict — 슬롯 맵 양쪽 요약
    const w3 = mkWindow((url) => {
      if (/cloud_pull/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([
        { game: "beta:rookie", data: { "rookie-save-v1-slots": JSON.stringify({ s9: { phase: "pro", proYear: 9, savedAt: 9 } }) }, updated: "2026-07-27T05:00:00Z" },
      ]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    w3.localStorage.setItem("rookie-save-v1-slots", JSON.stringify({ s3: { phase: "pro", proYear: 3, savedAt: 3 } }));
    w3.Cloud.onConflict("rookie", "2026-07-27T05:00:00Z");
    setTimeout(() => {
      const c = w3.document.querySelector(".cloud-modal");
      const ctxt = c ? c.textContent : "";
      check(/두 기기에서 각각 진행됐어요/.test(ctxt), "충돌 화면이 뜬다");
      check(/프로 3년차/.test(ctxt) && /프로 9년차/.test(ctxt), "양쪽 요약이 다 보인다");
      check(!/기록 없음/.test(ctxt), "진짜 기록을 두고 '기록 없음'이라 하지 않는다");
      console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
      process.exit(fail ? 1 : 0);
    }, 30);
  }, 30);
}, 30);
