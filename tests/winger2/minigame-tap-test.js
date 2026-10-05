/* ⚽ 더 윙어 II 1막 v2 — 🎮 판 검사 · **▶️ 두 번 탭 · gate** (39번 §1 — 뜻이 사라졌거나 바뀐 검사를 같은 이름으로 대신함)
 *
 * 옛 뜻: pointerdown → pointerup → click 이중 탭에서 ▶️(준비)의 꼬리가 판 칸을 누르지 않게 `gate`로 막았음.
 * 뜻은 남고 장치만 바뀜: 새 판은 `click`만 받고 판이 뜬 뒤 0.35초(`ARM_MS`) 안의 **손가락** 탭을 버림(31번 v2-1).
 * 옮김(B-8): pointerdown만으로는 안 고름 · 0.1초 손가락 탭 버림 · 0.6초 탭 고름 · 키보드 1~6
 * 절은 `_board.js`(진짜 `winger-moment.js` · 가상 시계)에 있고 이 파일은 B-8을 돌립니다 — 절마다 기준선 초록 → 파일 안 변이 빨강
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
require("./_board.js").runSections(["B-8"], "minigame-tap-test.js");
