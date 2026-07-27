"use strict";
const fs = require("fs");
const SP = __dirname;
const { JSDOM } = require(__dirname + "/jsdom.js");
const dom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only", url: "https://x.test/rookie/" });
const { window } = dom;
window.GROW_ENV = { beta: true };
window.Match = { cfg: { url: "https://x.test", key: "anon" } };
let copied = null;
window.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
window.fetch = (url) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(/cloud_issue/.test(url) ? "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2" : []),
});
window.eval(fs.readFileSync("/workspace/grow-games/beta/cloud.js", "utf8"));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const $ = (s) => window.document.querySelector(s);

window.Cloud.init("rookie");
window.Cloud.openModal();
check(!!$(".cloud-modal"), "모달이 열린다");
check(!!$("#cloud-issue"), "코드 발급 버튼이 있다");
check(!!$("#cloud-code-input"), "코드 입력칸이 있다");

$("#cloud-issue").click();
setTimeout(() => {
  check(copied === "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2", `클립보드에 복사됨 (${copied})`);
  check(/ABCD-EFGH/.test($(".cloud-modal").textContent), "코드가 화면에도 보인다");

  window.Cloud._toast("테스트");
  check(!!$(".cloud-toast"), "토스트가 뜬다");

  $(".cloud-close").click();
  check(!$(".cloud-modal"), "닫기로 사라진다");

  console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
}, 30);
