/* jsdom을 어디에 설치했든 찾아줘요.
 * 이 저장소는 테스트 러너도 package.json도 없어서, 검증 파일이 스스로 찾아야 해요.
 *   설치:  npm i jsdom --prefix tests/cloud
 *   실행:  node tests/cloud/<파일>.js
 */
"use strict";
const path = require("path");
const CANDIDATES = [
  process.env.GROW_JSDOM,                         // 직접 지정하고 싶을 때
  path.join(__dirname, "node_modules", "jsdom"),  // tests/cloud 안에 설치
  path.join(__dirname, "..", "..", "node_modules", "jsdom"),
  "jsdom",                                        // 전역
];
for (const c of CANDIDATES) {
  if (!c) continue;
  try { module.exports = require(c); break; } catch (e) { /* 다음 후보로 */ }
}
if (!module.exports || !module.exports.JSDOM) {
  console.error("jsdom을 못 찾았어요.  npm i jsdom --prefix tests/cloud  로 설치해주세요.");
  process.exit(2);
}
