/* cloud.js 검증 — jsdom에서 실제 브라우저처럼 로드해 돌린다. */
"use strict";
const fs = require("fs");
const SP = __dirname;
const { JSDOM } = require(__dirname + "/jsdom.js");

const dom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only", url: "https://x.test/rookie/" });
const { window } = dom;
window.GROW_ENV = { beta: true };
window.Match = { cfg: { url: "https://x.test", key: "anon" } };
const calls = [];
window.fetch = (url, opt) => {
  calls.push({ url, body: JSON.parse(opt.body) });
  return Promise.resolve({ ok: true, json: () => Promise.resolve("2026-07-27T00:00:00Z") });
};
window.eval(fs.readFileSync("/workspace/grow-games/beta/cloud.js", "utf8"));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const T = window.Cloud._t;
window.Cloud.init("rookie");

// 토큰
const a = T.token(), b = T.token();
check(a === b, "토큰은 한 번 만들면 유지된다");
check(a.length >= 32, `토큰이 128비트 이상 (${a.length}자)`);

// 게임별 키
const keys = T.keysOf("rookie");
check(keys.includes("rookie-save-v1"), "루키 세이브 키 포함");
check(keys.includes("rookie-save-v1-slots"), "슬롯 키 포함");
check(keys.includes("rookie-save-v1-legacy"), "유산 키 포함");
check(!keys.includes("grow-hof-v1"), "명예의 전당은 게임 키에 안 들어간다 (_shared로 분리)");
check(!keys.includes("grow-player-id"), "기기 설정은 동기화하지 않는다");
check(T.keysOf("unicorn").includes("unicorn-founded"), "유니콘 전용 키 포함");

// 수집·복원 왕복
window.localStorage.setItem("rookie-save-v1", JSON.stringify({ n: 1 }));
const got = T.collect("rookie");
check(got["rookie-save-v1"] === JSON.stringify({ n: 1 }), "collect가 값을 담는다");
window.localStorage.removeItem("rookie-save-v1");
T.apply("rookie", got);
check(window.localStorage.getItem("rookie-save-v1") === JSON.stringify({ n: 1 }), "apply가 되돌려 쓴다");

// localStorage 인스턴스에 직접 대입하면 jsdom의 Storage 특수 동작(문자열 키를 저장 항목으로 취급) 때문에
// 실제 메서드가 안 바뀐다. 프로토타입을 바꿔야 window.eval로 실행된 cloud.js에서도 보인다.
const lsProto = Object.getPrototypeOf(window.localStorage);
const origGet = lsProto.getItem;
const origSet = lsProto.setItem;

// 저장소가 완전히 막혔을 때 (Finding 1) — getItem이 던지면 "nostorage" 같은 고정값을 주면 안 된다
{
  lsProto.getItem = function () { throw new Error("차단됨"); };
  lsProto.setItem = function () { throw new Error("차단됨"); };

  const t1 = T.token();
  check(t1 === null, "getItem이 던지면 토큰은 null (고정 문자열 아님)");
  check(t1 !== "nostorage", "고정 문자열 'nostorage'를 돌려주지 않는다");

  const before = calls.length;
  window.Cloud.mark();
  check(calls.length === before, "저장소가 막히면 push는 fetch를 부르지 않는다");

  lsProto.getItem = origGet;
  lsProto.setItem = origSet;
}

// 저장소가 완전히 막혔을 때 init()·_pull()도 fetch를 부르면 안 된다 (Task 3 리뷰 Minor 보강)
{
  lsProto.getItem = function () { throw new Error("차단됨"); };
  lsProto.setItem = function () { throw new Error("차단됨"); };

  const before = calls.length;
  window.Cloud.init("rookie");
  window.Cloud._pull("rookie");
  check(calls.length === before, "저장소가 막히면 init()과 _pull()도 fetch를 부르지 않는다");

  lsProto.getItem = origGet;
  lsProto.setItem = origSet;
}

// getItem은 null을 주지만 setItem이 던질 때 (Finding 2) — 매번 새 토큰을 만들어 다른 계정으로 밀어넣으면 안 된다
{
  lsProto.getItem = function () { return null; };
  lsProto.setItem = function () { throw new Error("쓰기 실패"); };

  const t1 = T.token();
  const t2 = T.token();
  check(t1 === null && t2 === null, "저장이 안 되면 두 번 연속 호출해도 null (임시 정체성을 만들지 않는다)");

  const before = calls.length;
  window.Cloud.mark();
  window.Cloud.mark();
  check(calls.length === before, "정체성을 저장할 수 없으면 push를 반복 호출해도 fetch가 없다 (다른 계정으로 밀어넣지 않는다)");

  lsProto.getItem = origGet;
  lsProto.setItem = origSet;
}

// getRandomValues가 잠긴 브라우저 컨텍스트에서 던질 때 (Task 2 리뷰 보강) — token()이 절대 던지면 안 된다
{
  window.localStorage.removeItem("grow-cloud-token");
  const origGRV = window.crypto.getRandomValues;
  window.crypto.getRandomValues = function () { throw new Error("잠김"); };

  let threw = false;
  let t = null;
  try { t = T.token(); } catch (e) { threw = true; }
  check(!threw, "getRandomValues가 던져도 token()은 던지지 않는다");
  check(typeof t === "string" && t.length >= 32, `Math.random 경로로 대체된다 (${t && t.length}자)`);

  window.crypto.getRandomValues = origGRV;
  window.localStorage.removeItem("grow-cloud-token");
  T.token(); // 이후 테스트를 위해 정상 토큰을 다시 만들어 둔다
}

// 베타 접두어
window.Cloud.mark();
setTimeout(() => {
  const push = calls.find((c) => /cloud_push/.test(c.url));
  check(!!push, "mark()가 push를 부른다");
  check(push && push.body.p_game === "beta:rookie", `베타는 game에 접두어 (${push && push.body.p_game})`);
  console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
}, 50);
