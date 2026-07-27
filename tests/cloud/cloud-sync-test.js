/* 5.3절 4분기 판정 검증 */
"use strict";
const fs = require("fs");
const SP = __dirname;
const { JSDOM } = require(__dirname + "/jsdom.js");
const dom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only", url: "https://x.test/rookie/" });
const { window } = dom;
window.GROW_ENV = { beta: true };
window.Match = { cfg: { url: "https://x.test", key: "anon" } };
window.fetch = () => Promise.reject(new Error("off"));
window.eval(fs.readFileSync("/workspace/grow-games/beta/cloud.js", "utf8"));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const T = window.Cloud._t;
const LS = window.localStorage;

const OLD = "2026-07-27T00:00:00Z", NEW = "2026-07-27T01:00:00Z";
const SLOTS = JSON.stringify({ s1: { name: "박프로", phase: "pro", proYear: 3, savedAt: 5000 } });
// 로컬 세이브의 유무도 판정에 들어간다 (도장이 없을 때 dirty 취급이 갈린다).
// 기본값은 "이 기기에 기록 없음" — 아래에서 필요할 때만 채운다.
const local = (on) => { if (on) LS.setItem("rookie-save-v1-slots", SLOTS); else LS.removeItem("rookie-save-v1-slots"); };
const setup = (dirty, synced, hasLocal) => {
  LS.setItem("grow-cloud-dirty-rookie", dirty ? "1" : "0");
  if (synced) LS.setItem("grow-cloud-synced-rookie", synced); else LS.removeItem("grow-cloud-synced-rookie");
  local(!!hasLocal);
};

setup(false, OLD); check(T.decide("rookie", NEW) === "pull",     "안 건드림 + 서버 최신 → 자동 수신");
setup(false, OLD); check(T.decide("rookie", OLD) === "none",     "안 건드림 + 서버 같음 → 아무것도 안 함");
setup(true,  OLD); check(T.decide("rookie", OLD) === "push",     "건드림 + 서버 같음 → 올림");
setup(true,  OLD); check(T.decide("rookie", NEW) === "conflict", "건드림 + 서버 최신 → 충돌");
setup(true,  null); check(T.decide("rookie", null) === "push",   "서버에 기록 없음 → 올림");
setup(false, null); check(T.decide("rookie", null) === "none",   "양쪽 다 없음 → 아무것도 안 함");

/* 도장이 없는 경우는 로컬에 기록이 있느냐로 갈린다.
 * 없으면 잃을 게 없으니 묻지 않고 받아온다 — 새 기기가 코드를 넣고 처음 이어받는 길이다.
 * 있으면 그 기록은 서버 어디에도 사본이 없다. 여기서 받아버리면 되돌릴 수 없으니 사람이 골라야 한다.
 * (예전에는 둘 다 "pull"이었고, 그게 기존 사용자의 세이브를 말없이 덮어썼다) */
setup(false, null, false); check(T.decide("rookie", NEW) === "pull",
  "도장 없음 + 이 기기엔 기록 없음 + 서버에 있음 → 묻지 않고 수신 (새 기기 이어받기)");
setup(false, null, true);  check(T.decide("rookie", NEW) === "conflict",
  "도장 없음 + 이 기기에 기록 있음 + 서버에 있음 → 충돌 화면 (묻지 않는 덮어쓰기 금지)");
setup(false, null, true);  check(T.decide("rookie", null) === "push",
  "도장 없음 + 이 기기에 기록 있음 + 서버엔 없음 → 올림 (백업이 없는 상태다)");
local(false);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
