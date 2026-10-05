/* ⚽ 더 윙어 II 1막 v2 — 🎮 판 검사 · **판 계약(옛 계약 3)** (39번 §1 — 뜻이 사라졌거나 바뀐 검사를 같은 이름으로 대신함)
 *
 * 옛 뜻: 옛 판의 창 산식(`ONE_WIN` · `winMul` · `condOf` · `sOne`)과 열기 모양(`condition` · `moment`)을 지켰음.
 * 사라진 까닭: 38번 §2 3′로 판 열기 모양이 바뀌고(`sit` · `odds` · `judge`) 창 산식이 퇴역(36번 §9-3).
 * 대신: 계약 3′ 모양 그대로(B-7) · 연출 난수 따로(B-9 — `Math.random` 0 · 판 전용 `fx` · 결과와 무관)
 * 절은 `_board.js`(진짜 `winger-moment.js` · 가상 시계)에 있고 이 파일은 B-7, B-9을 돌립니다 — 절마다 기준선 초록 → 파일 안 변이 빨강
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
require("./_board.js").runSections(["B-7", "B-9"], "moment-test.js");
