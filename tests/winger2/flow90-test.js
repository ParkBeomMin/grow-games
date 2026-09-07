/* ⚽ 더 윙어 II — ⏱️ **90분 흐름 중계 대본이 실제로 그려지는가** (`beta/winger2/town.js`)
 *
 * 계기: 범민 님 — *"축구판 각 선수들이 실제로 경기하는것처럼 움직여야하고
 *      **90분동안 흐름으로 중계**를 해줘야지"* (설계 `144_designer_flow90.md`)
 *      🆕 2026-09-06 — *"30분 60분 하고 끝나는데 더윙어1에서처럼 경기흐름이 보여져야해"*
 *      (설계 `149_designer_density.md` · 구현 `150_engineer_density.md`)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 **이 파일이 생긴 이유** — engineer가 146번 §4-1에서 자기 작업을 **통째로 되돌려**
 *    (`runTo(i)` · `if (last) runTo(null)` · 🏁 킥오프 `draw` 세 배선을 지워서
 *     90분 대본이 **한 줄도 안 그려지는 상태**로) 검사를 돌렸습니다:
 *
 *   | 검사 | 되돌린 뒤 |
 *   |---|---|
 *   | `town-test` (T-1~T-7c · 변이 M-K 포함) | 🟢 초록불 |
 *   | `school-test` | 🟢 초록불 |
 *   | `school-scene-test` (A · B · C 전부) | 🟢 초록불 |
 *   | `town-neutral-test` | 🟢 초록불 |
 *
 *   **90분 대본을 지키는 검사가 0건이었어요.** 이 파일이 그 자리입니다.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 🔒 지키는 것
 *   ① **게임 입구(타이틀)에서 진짜 버튼을 눌러** 학교 아크를 지납니다 — 산식만 떼어
 *      재구성하면 배선이 끊긴 날에도 통과해요(`town-neutral-test`가 그래서 못 봅니다).
 *   ② 셀렉터마다 **「탭 횟수 > 0」**을 단언합니다(F-3) — 아무것도 안 눌러도 타임아웃이
 *      흐름을 끝까지 미는 「자가 복구가 실패를 삼킴」을 막아요.
 *   ③ **산식은 소스에서**(`minAt` · `GRID`·`GRID_NEAR`·`flowMins` · `FLOW_LINE` · `KICK_LINE`
 *      · `KICK2_LINE` · `END_LINE`), **분 목록은 검사에 박고**(설계 149번 §3-6의 계약),
 *      **격자는 관계로**(F-1b) 봅니다.
 *   ④ **꼬리 흐름은 값이 아니라 관계**로 잽니다 — `GOAL_BY`를 뒤집으면 꼬리도 뒤집혀야
 *      해요(F-6). 값을 박으면 시드 하나의 우연을 재게 됩니다.
 *
 * 🌍 **이 파일의 계약이 서 있는 세계** (2026-09-06 · 설계 149번으로 갈렸습니다)
 *   「🏫 한 단계가 **한 경기(90분)**이고, 🔥 순간 카드 `n`장이 `minAt(k, n)`에 놓이며,
 *    🌊 흐름 줄은 **카드 수와 무관하게 12분 격자**에서 넷이 나오고, 🥅 하프타임이 45'에
 *    한 장 서는 세계」입니다.
 *   · 🔴 **144번(`FILL_MIN` = 두 카드의 중점)의 세계가 아닙니다.** 그 식은 필러를 `n`장으로
 *     묶어 🏫 초5에 흐름 줄이 딱 하나였어요 — 되살아나면 F-1·F-1b가 먼저 빨간불입니다.
 *   · **단계가 90분 경기가 아니게 되면**(예: 「전반만 뛴다」) F-2·F-4부터 다시 보세요.
 *   · 🔓 **첫 구간 상한(I-A)은 2026-09-06에 폐기했습니다** — 범민 님이 계약 D를 직접
 *     풀었어요(*"첫 카드까지 걸리는 시간이 느는건 상관없어"*). 🏫 초5의 첫 구간은 이제 **2장**입니다.
 *   · ⏱️ **시계가 흐릅니다**(설계 153번) — 한 누름(🏁 시작)이 단계를 **통째로** 굴려요.
 *     그래서 `arc()`의 누름 루프가 `stageIdle()`로 기다립니다. 🔴 안 기다리면 한 번 누르고 끊겨요.
 *   · **카드 수 n이 단계마다 같아지면** F-5의 «중등이 뒤집혀 있다»는 여전히 성립하지만
 *     (`sIdx`가 가르니까요), `school-scene-test` B-1의 분 집합 자는 눈이 멉니다.
 *   · **필러를 `deck`에 넣기로 판정이 바뀌면** F-7이 곧바로 빨간불입니다 — 그때는
 *     `_load.js`의 `passStage`(굴러간 카드 세기)와 `progHTML`을 **같이** 보세요.
 *
 * ⏱️ 약 3분 걸려요 (아크 25벌 × 약 7초).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, pageMutsOK, townAuto, tapFoot, tapChildArc, pickOrigin, passEarly, seedBoth, PAGE_DIR, stageIdle }
  = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════════════════════════
 * 📐 산식·문구는 **소스에서 뽑습니다** — 값을 베껴 적으면 표가 갈라져요
 * ══════════════════════════════════════════════════════════════ */
const TOWN_SRC = fs.readFileSync(path.join(PAGE_DIR, "town.js"), "utf8");
const grab = (re, wrap) => {
  const m = TOWN_SRC.match(re);
  if (!m) return null;
  /* 🔒 직접 eval을 안 씁니다 — `const`가 eval 스코프에 갇혀 값이 늘 undefined가 돼요. */
  try { return new Function(`return ${wrap ? wrap(m[1]) : m[1]};`)(); } catch (e) { return null; }
};
const FLOW_LINE = grab(/const FLOW_LINE = (\{[\s\S]*?\n  \});/);
/* 🔑 `{opp}`·`{me}` 자리표가 안에 있어 `[^}]*`로는 못 잡습니다 — 한 줄이라 `.*`로 돕니다. */
const KICK_LINE = grab(/const KICK_LINE = (\{.*\});/);
const KICK2_LINE = grab(/const KICK2_LINE = (\{.*\});/);
const END_LINE = (TOWN_SRC.match(/const END_LINE = "([^"]*)";/) || [])[1] || null;
const minAt = grab(/(const minAt = \([^)]*\) => [^;]*);/, (s) => `(() => { ${s}; return minAt; })()`);
/* 🌊 **흐름 줄의 분을 만드는 격자** — 설계 149번 §3-1. 🔴 144번의 `FILL_MIN`(두 카드의 중점)은
 *    **폐기**됐습니다. 이제 흐름 줄 수가 카드 수 `n`에 안 묶여요.
 * 🔒 산식은 **소스에서 통째로** 뜯습니다 — `GRID`를 12에서 바꾸면 F-1(값)이 빨간불이 되고
 *    F-1b(관계)는 따라가야 합니다. 그래야 「값이 틀렸나 / 대본이 바뀌었나」가 갈려요. */
const src1 = (re) => { const m = TOWN_SRC.match(re); return m ? m[0] : null; };
const S_HALF = src1(/const HALF_MIN = \d+;/);
const S_GRID = src1(/const GRID = \d+;/);
const S_NEAR = src1(/const GRID_NEAR = [^;]+;/);
const S_FLOWMINS = src1(/const flowMins = \(cardMins\) => \{[\s\S]*?\n  \};/);
const flowMins = (S_HALF && S_GRID && S_NEAR && S_FLOWMINS)
  ? (() => { try {
      return new Function(`${S_HALF}\n${S_GRID}\n${S_NEAR}\n${S_FLOWMINS}\nreturn flowMins;`)();
    } catch (e) { return null; } })()
  : null;

/* ══════════════════════════════════════════════════════════════
 * 🔒 **문턱·계약은 검사에 박습니다** (설계 144번 §3-5의 완성된 타임라인)
 * ══════════════════════════════════════════════════════════════
 * 🔴 소스에서 읽어 오면 `minAt`을 바꿔도 검사가 따라가서 **아무것도 안 잡혀요.**
 *    산식은 소스에서 뜯어오고, 계약은 박는다 — 방향이 반대입니다.
 *
 * 🔥 순간 카드는 피드에 **두 줄**(무엇이 걸렸나 → 결과)이라 분이 두 번 나옵니다.
 * 🥅 하프타임은 `.w2-min` span이 **없어서**(`match-scene.js`의 half 갈래) 이 목록에 안 들어와요 —
 *    그 자리는 F-2가 따로 봅니다. */
const FEED_MIN = {
  // n=2 · 🏁 0'×2 · 🌊 12 · 🌊 24 · 🔥 30 · 🌊 36 · (🥅 45) · 🔥 60 · 🌊 72 · 🌊 84 · 🔚 90
  // 🆕 2026-09-06 — `head.slice(0, 1)` 폐기로 **24'가 늘었습니다** (설계 153번 §3-4)
  e: [0, 0, 12, 24, 30, 30, 36, 60, 60, 72, 84, 90],
  // n=3 · 🏁 0'×2 · 🌊 12 · 🔥 23 · 🌊 36 · 🔥 45 · (🥅 45) · 🌊 60 · 🔥 68 · 🌊 84 · 🔚 90
  m: [0, 0, 12, 23, 23, 36, 45, 45, 60, 68, 68, 84, 90],
  h: [0, 0, 12, 23, 23, 36, 45, 45, 60, 68, 68, 84, 90],
};
/* 🏁 0' 줄 — **두 줄**입니다 (설계 149번 §3-5). 대진 한 줄 + 🧡 `{me}`가 처음 뜨는 한 줄.
 * 🔒 「≥1」로 재면 둘째 줄을 지워도 통과해요 — **정확히 2**로 박습니다. */
const KICK_N = 2;
/* 🕹️ 한 단계의 누름 — 🔒 **2회**(🏁 [경기 시작] + 🔚 [다음 단계]). 그 사이는 ⏱️ 시계가 굴립니다.
 * 🆕 2026-09-06 — 옛 계약은 `카드 수 + 1`이었어요. [다음 판] 버튼 5개가 사라졌습니다. */
const PRESS_N = 2;
/* 🌊 흐름 줄의 수 — 🔒 **격자가 주는 칸을 한 칸도 안 자릅니다** (설계 153번 §3-4).
 * 🆕 2026-09-06 — 149번의 `head.slice(0, 1)`(첫 구간 1장 상한)이 **폐기**되면서
 *    🏫 초5가 4 → **5**가 됐습니다(12·24·36·72·84). 중·고는 원래 첫 구간이 1칸이라 그대로 4예요.
 * 🌍 이 값이 서 있는 세계: 「계약 D(첫 카드 ≤90초)가 **입력이 아닌** 세계」입니다 —
 *    범민 님이 *"첫 카드까지 걸리는 시간이 느는건 상관없어"*로 그 계약을 직접 풀었어요.
 *    🔴 D가 다시 계약이 되면 이 값과 `flowMins`를 **같이** 보세요. */
const FLOW_N = { e: 5, m: 4, h: 4 };
const DECK_N = { e: 2, m: 3, h: 3 };                    // 🔘 진행 띠의 점 = 순간 카드 수
const TOTAL_CARDS = 8;                                  // 🔒 아크 전체 (2 + 3 + 3)
const HALF_AT = 45;                                     // 🥅 축구의 값이지 손잡이가 아니에요
/* 🎲 시드 — **하나로 재지 않습니다.** F-6(꼬리 흐름이 스코어를 탄다)은 스코어가 갈려야
 *    뜻이 있어서, 이기는 판·지는 판·비기는 판이 섞여야 해요. */
const SEEDS = [7, 42, 1201, 5];
/* 🔒 F-6의 바닥 — 꼬리 흐름이 `mid`가 **아닌**(= 승부가 갈린) 단계가 이만큼은 나와야
 *    「뒤집기」를 잴 것이 있습니다. 실측 10 / 12(시드 4벌 × 단계 셋). 실측의 절반에 뒀어요. */
const MIN_DECIDED = 5;

/* ══════════════════════════════════════════════════════════════
 * 🔬 계측 도구 · 🔴 변이
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔬 **계측입니다 — 변이가 아니에요.** `town.js`가 화면으로 내보내는 카드를 그대로 적습니다.
   *    🔑 DOM만으로는 `flow` **필드**가 실렸는지 못 봅니다(문구는 `fillerText`가 따로 고르니까요).
   *       F-9가 그 자리예요 — 「문구는 맞는데 `flow`를 안 실어 보내는」 상태를 잡습니다. */
  "LOG": {
    "town.js": [[/    const draw = \(c, done\) => \{\n      if \(!Scene\) return Promise\.resolve\(\);/,
      '    const draw = (c, done) => {\n      if (!Scene) return Promise.resolve();\n'
      + '      (window.__drawLog = window.__drawLog || []).push({ stage: stage.id, kind: c.kind,'
      + ' min: c.min, flow: c.flow, text: c.text, me: myName, score: (c.score || []).join(":") });']],
    /* 🔬 ⏱️ **`delayOf`가 카드를 받았는가** — I-DEL이 이걸로 봅니다.
     *    🔴 `S.fast` 앞에 심습니다: ⏩ 빨리감기여도 **인자는 그대로 넘어와요**.
     *       뒤에 심으면 이 드라이버(`townAuto`)에서 로그가 통째로 비어 «0건 위반»이 됩니다. */
    "match-scene.js": [[/  function delayOf\(card\) \{\n    if \(S\.fast\) return 90;/,
      '  function delayOf(card) {\n'
      + '    (window.__delayLog = window.__delayLog || []).push(card ? String(card.kind) : "(없음)");\n'
      + '    if (S.fast) return 90;']],
  },
  /* ⓐ 🌊 **흐름 줄을 한 장도 안 그립니다.** 🆕 2026-09-06 — 옛 앵커(`runTo(i)`)는
   *    `runClock()`으로 갈리면서 사라졌어요(설계 153번 E-3·E-4). 지키는 것은 그대로입니다. */
  "M-NOFILL": { "town.js": [[/          await draw\(\{ kind: "filler", min: s\.min, text: fillerText\(stage\.id, fl, used\[fl\]\+\+, myName\),\n            score: \[hg, ag\], flow: fl \}\);/,
    "          ;"]] },
  /* ⓑ 🔚 **90' 종료 휘슬 줄을 안 그립니다.** 🆕 옛 앵커(`if (last) runTo(null)`)도 사라졌어요.
   *    🔒 `finishMatch()`는 그대로 돌아서 버튼이 뜹니다 — 그래야 **「줄 없이 버튼만」**이 잡혀요. */
  "M-NOEND": { "town.js": [[/          await draw\(\{ kind: "end", min: s\.min, text: END_LINE, score: \[hg, ag\] \}\);/,
    "          ;"]] },
  /* ⓒ 🏁 0' 줄을 **[경기 시작]을 누른 뒤**로 옮깁니다.
   *    🔴 「존재한다」로만 재면 이 변이가 안 잡혀요 — F-3이 **누르기 전 상태**에서 잽니다. */
  "M-LATEKICK": { "town.js": [
    /* 🔴 **두 줄을 다 감쌉니다.** 첫 `draw`만 감싸면 변이 뒤에도 「누르기 전 0' 줄」이
     *    **한 장 남아서**, F-3이 「2장 ≠ 1장」으로 물긴 해도 **왜 무는지가 달라집니다**
     *    (engineer 150번 §7-3). 앵커를 넓혀 「0' 줄이 통째로 뒤로 갔다」를 잽니다. */
    [/      draw\(\{ kind: "kick", min: 0, score: \[hg, ag\],\n        text: \(KICK_LINE\[stage\.id\] \|\| KICK_LINE\.m\)\.replace\("\{opp\}", away\) \}\);\n      draw\(\{ kind: "kick", min: 0, score: \[hg, ag\],\n        text: \(KICK2_LINE\[stage\.id\] \|\| KICK2_LINE\.m\)\.replace\("\{me\}", myName\) \}\);/,
      '      const __kick = () => { draw({ kind: "kick", min: 0, score: [hg, ag],\n'
      + '        text: (KICK_LINE[stage.id] || KICK_LINE.m).replace("{opp}", away) });\n'
      + '      draw({ kind: "kick", min: 0, score: [hg, ag],\n'
      + '        text: (KICK2_LINE[stage.id] || KICK2_LINE.m).replace("{me}", myName) }); };'],
    /* 🆕 2026-09-06 — 버튼이 부르는 것이 `playCard()` → **`runClock()`**으로 갈렸습니다 (설계 153번 E-6) */
    [/      btn\.onclick = \(\) => \{ btn\.disabled = true; runClock\(\); \};/,
      "      btn.onclick = () => { btn.disabled = true; __kick(); runClock(); };"]] },
  /* ⓒ' 🏁 **둘째 줄(🧡 `{me}`가 처음 뜨는 자리)만** 지웁니다 — 첫 줄은 그대로 서요.
   *    「0' 줄이 있는가」로 재면 이 변이가 **통째로 안 잡힙니다.** */
  "M-NOKICK2": { "town.js": [
    [/      draw\(\{ kind: "kick", min: 0, score: \[hg, ag\],\n        text: \(KICK2_LINE\[stage\.id\] \|\| KICK2_LINE\.m\)\.replace\("\{me\}", myName\) \}\);/,
      "      ;"]] },
  /* ⓓ 🥅 하프타임을 아예 안 놓습니다 */
  "M-NOHALF": { "town.js": [[/^    script\.splice\(hi, 0, \{ t: "half", min: HALF_MIN \}\);$/m, "    ;"]] },
  /* ⓔ 🥅 하프타임 **자리**를 한 칸 앞으로 (`분 ≤ 45` → `분 < 45`).
   *    🔑 장수는 그대로 1장이라 **「1장인가」로만 재면 안 잡힙니다** — F-2가 앞뒤를 봅니다. */
  "M-HALFPOS": { "town.js": [[/^    while \(hi < script\.length && script\[hi\]\.min <= HALF_MIN\) hi \+= 1;$/m,
    "    while (hi < script.length && script[hi].min < HALF_MIN) hi += 1;"]] },
  /* ⓕ 🔁 단계 번호를 뺍니다 — 중등과 고등의 흐름이 **같아집니다**.
   *    🔴 한 단계만 재면 못 잡아요(중등 하나만 보면 `h → a`로 멀쩡합니다). */
  "M-NOSIDX": { "town.js": [[/\? \(\(j \+ sIdx\) % 2 === 0 \? "a" : "h"\)/, '? ((j) % 2 === 0 ? "a" : "h")']] },
  /* ⓖ 🎯 꼬리 흐름을 상수로 — 스코어를 안 탑니다 */
  "M-TAILCONST": { "town.js": [[/: hg < ag \? "a" : hg > ag \? "h" : "mid"\);/, ': "mid");']] },
  /* ⓗ 🔘 필러가 `deck`으로 샙니다 — 진행 띠의 점과 `state.cards`가 늘어요 */
  "M-DECKLEAK": { "town.js": [[/^    const CARD_MIN = deck\.map\(\(_, k\) => minAt\(k, deck\.length\)\);$/m,
    "    deck.push(deck[0]);\n    const CARD_MIN = deck.map((_, k) => minAt(k, deck.length));"]] },
  /* ⓙ ⏱️ **격자를 12 → 18로.** 18은 90의 약수라 카드 분과 공명해서, n=3의 첫 구간이
   *    **0칸**이 됩니다 — 범민 님이 짚은 *"30분 60분 하고 끝나는데"* 그 구멍이 그대로 남아요. */
  "M-GRID18": { "town.js": [[/const GRID = 12;/, "const GRID = 18;"]] },
  /* ⓚ 🗣️ **고르는 자를 「사용 순번」에서 슬롯 번호로** 되돌립니다 (144번의 그 식).
   *    🔴 흐름 줄이 넷이 되면서 `"a"`가 세 번까지 나는데, `j`로 고르면 같은 말이 두 번 떠요. */
  "M-USEJ": { "town.js": [[/fillerText\(stage\.id, fl, used\[fl\]\+\+, myName\)/,
    "fillerText(stage.id, fl, s.j, myName)"]] },
  /* ⓛ 🗣️ **`used`를 `runTo` 「안」으로** — `runTo`는 카드마다 다시 불려서 매번 0으로 돌아갑니다.
   *    🔴 겉보기 증상이 「같은 말이 두 번」뿐이라 눈으로는 거의 안 보여요 (engineer 150번 I-E). */
  "M-USEDIN": { "town.js": [
    [/    const used = \{ a: 0, h: 0, mid: 0 \};\n/, "    ;\n"],
    [/    async function runClock\(\) \{\n      await queue;/,
      "    async function runClock() {\n      await queue;\n      const used = { a: 0, h: 0, mid: 0 };"]] },
  /* ⓜ 🧡 **`{me}` 치환을 지웁니다** — 화면에 `"{me}가 공을 몰고 앞으로 나가요"`가 **글자 그대로** 떠요.
   *    사람이 보면 1초 만에 아는 버그인데, 149번 개편 직후에는 **아홉 검사 중 한 개도 안 물었습니다.** */
  "M-NOSUB": { "town.js": [[/return t\[useIdx % t\.length\]\.replace\("\{me\}", me\);/,
    "return t[useIdx % t.length];"]] },
  /* ⓝ 🔁 `flowOf`의 둘째 인자를 **`K`(흐름 줄 수) → `deck.length`(카드 수)**로 되돌립니다 (144번).
   *    🏫 초5는 `j < 1`이 되어 **넷 중 셋이 전부 꼬리 취급**을 받아요. */
  "M-FLOWK": { "town.js": [[/const fl = flowOf\(s\.j, K, sIdx, hg, ag\);/,
    "const fl = flowOf(s.j, deck.length, sIdx, hg, ag);"]] },
  /* ⓝ' 🌊 **🔥 결정 카드에 `flow`를 답니다** — 실제 게임엔 없는 그림이 나옵니다.
   *    🔴 `match-scene.js:444`의 `const side = at[2] || (card.flow === "a" ? …)`가 그 자리예요:
   *       🔥 카드의 닫는 줄은 `BALL_LOST[kind]`를 쓰는데 **세 번째 칸이 `""`(falsy)**라
   *       `card.flow`로 **넘어갑니다.** 그래서 판이 밀려요.
   *    🔑 2026-09-06 director가 `_check.html` 픽스처에서 실제로 밟은 갈래입니다. */
  "M-MOMENTFLOW": { "town.js": [[/        score: \[hg, ag\], stakeKey: stakeOf\(J\.kind, hg - ag\) \};/,
    '        score: [hg, ag], flow: "h", stakeKey: stakeOf(J.kind, hg - ag) };']] },
  /* ⓞ ⏱️ **`delayOf`에 카드를 안 넘깁니다** — 갈래 자체가 죽어서 🌊 읽는 줄이 🔥 결정 줄과
   *    **같은 900ms**가 됩니다. 🔴 `delayOf`의 몸통은 그대로라 「소스에서 뜯어 굴리는」
   *    검사로는 안 보여요 — **부르는 자리**를 봐야 합니다. */
  "M-NODELAYCARD": { "match-scene.js": [[/    await wait\(delayOf\(card\)\);/, "    await wait(delayOf());"]] },
  /* 🔩 F-6 전용 — **판정은 그대로 두고 승패만 뒤집습니다.** 꼬리 흐름이 따라 뒤집혀야 해요.
   *    🔒 표를 베껴 적지 않고 소스에서 뜯어 `"us"` ↔ `"them"`만 바꿉니다 (칸이 늘어도 삽니다). */
  "FLIP": { "town.js": [[/const GOAL_BY = \{.*\};/,
    (TOWN_SRC.match(/const GOAL_BY = \{.*\};/) || [""])[0]
      .replace(/"us"/g, "\u0000").replace(/"them"/g, '"us"').replace(/\u0000/g, '"them"')]] },
};
/* 🔬 계측 + 변이를 **파일별로** 합칩니다 — 변이가 `match-scene.js`에도 붙거든요(M-NODELAYCARD).
 *    🔴 `"town.js"`만 합치면 그 변이가 **조용히 안 걸리고** 검사는 초록불입니다. */
const merge = (...tables) => {
  const out = {};
  for (const t of tables) for (const [file, muts] of Object.entries(t || {})) {
    out[file] = (out[file] || []).concat(muts);
  }
  return out;
};
const withLog = (name) => merge(MUT.LOG, name ? MUT[name] : null);

/* ══════════════════════════════════════════════════════════════
 * ⏳ 정착 — 🔴 **창이 카드 간격보다 「길어야」 합니다**
 * ══════════════════════════════════════════════════════════════
 * engineer 146번 §4-4가 짚은 자리예요. `school-scene-test`의 `settle()`은 3회 연속
 * 같으면(15ms × 3 ≈ **45ms**) 안정으로 보는데, `delayOf()`는 🤖 자동 진행에서도 **90ms**입니다.
 * **정착 창이 카드 간격보다 짧아서 큐 한가운데서 돌아와요** — 그러면 검사가 「끝났다」고
 * 믿는 시점이 실제 끝보다 앞서고, 🔚 90' 종료 휘슬이 **통째로 사라집니다.**
 *
 * 🧪 여기서 실측했습니다 (아크 1벌 · 진짜 타이머):
 *
 *   | 정착 창 | 🔚 90' 줄 | ⏱️ 필러 | 🥅 하프타임 |
 *   |---|---|---|---|
 *   | `hold 3`  (45ms)  | **0 / 3** | **0장** | **0장** |
 *   | `hold 8`  (120ms) | 3 / 3 | 7장 | 3장 |
 *   | `hold 16` (240ms) | 3 / 3 | 7장 | 3장 |
 *   | `hold 24` (360ms) | 3 / 3 | 7장 | 3장 |
 *
 * 📐 문턱 두 줄:
 *   ① **무엇과 견주는가** — `match-scene.js`의 `delayOf()`가 내는 카드 간격. 🤖 자동 진행 **90ms**
 *      (사람이 볼 때는 350~900ms). 정착 창은 그보다 **길어야** 합니다.
 *   ② **어느 칸에서 재는가** — 🏫 학교 아크 전체(초5·중등·고등), 진짜 타이머, `townAuto` 켬.
 * 🔒 **240ms를 박습니다 — 90ms의 2.7배.** 실패 경계(45~120ms) 바로 옆에 붙이지 않았어요.
 *    소스에서 `delayOf()`를 읽어 오면 그 값을 바꿔도 검사가 따라가서 안 잡힙니다. */
const HOLD = 16;                 // × 15ms = 240ms
const GRACE = 120;               // 큐가 첫 줄을 그릴 틈
async function settle(D) {
  const n = () => D.querySelectorAll("#town-scene .w2-feed > *").length;
  await wait(GRACE);
  let prev = -1, hold = 0;
  /* 🔒 상한 400회 × 15ms = 6초 — 한 단계의 최악 큐(12줄 × 900ms ≈ 10.8초)는 못 담지만
   *    이 드라이버는 `townAuto`(90ms)로 몰아서 최악이 ~1.1초입니다. 사람 속도로 재는
   *    검사를 여기 두면 이 상한부터 다시 보세요. */
  for (let i = 0; i < 400; i++) {
    const c = n();
    hold = c === prev ? hold + 1 : 0;
    if (hold >= HOLD) return c;
    prev = c;
    await wait(15);
  }
  return prev;
}

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 학교 경기에 닿습니다
 * ══════════════════════════════════════════════════════════════ */
async function arc(seed, muts) {
  const W = bootPage({ muts });
  seedBoth(W, seed);
  const D = W.document;
  let taps = 0;
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what})`);
    /* 🖱️ 실기기 순서 그대로 — pointerdown → pointerup → click 셋 다 */
    for (const t of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true }));
    }
    taps += 1;
  };
  /* 피드의 줄을 **순서 그대로** 읽습니다 — [클래스, 분(없으면 null), 본문] */
  const feed = () => Array.from(D.querySelectorAll("#town-scene .w2-feed > *")).map((n) => {
    const m = n.querySelector(".w2-min");
    const b = n.querySelector(".w2-body");
    return { cls: String(n.className), min: m ? parseInt(String(m.textContent).replace(/\D/g, ""), 10) : null,
      text: String((b || n).textContent) };
  });
  const cur = () => (D.querySelector(".screen.active") || {}).id;
  const stages = {};

  async function stage(id) {
    await settle(D);
    /* 🏁 **누르기 「전」** — 0' 대진 줄이 이미 큐를 지나 피드에 서 있어야 합니다.
     *    🔴 「존재한다」로만 재면 `btn.onclick` 안으로 옮긴 변이가 안 잡혀요. */
    const before = { presses: 0, feed: feed(), dots: D.querySelectorAll("#town-prog .town-dot").length };
    let presses = 0;
    /* 🔒 **루프 조건 「앞」에도, 누름 「뒤」에도 정착을 기다립니다** (설계 153번 I-3).
     * 🔴 시계가 async라 누른 직후엔 버튼이 언제나 `disabled`예요 — 안 기다리면
     *    **한 번 누르고 break**라 단계가 영영 안 끝납니다(「도달 경로가 조용히 죽음」). */
    await stageIdle(D);
    for (let g = 0; g < 16; g++) {
      if (cur() !== "screen-town") break;
      const b = D.getElementById("btn-town-next");
      if (!b || b.disabled || b.classList.contains("hidden")) break;
      press(b, `🏫 ${id} 진행`);
      presses += 1;
      await stageIdle(D);
    }
    await settle(D);
    stages[id] = { before, presses, feed: feed(),
      dots: D.querySelectorAll("#town-prog .town-dot").length };
  }

  press(D.getElementById("btn-new"), "btn-new");
  press(D.getElementById("btn-name-next"), "btn-name-next");
  await tapFoot(W, press, "R");
  const back = townAuto(W);
  pickOrigin(W, press, "seoul");
  await tapChildArc(W, press, ["ball", "fin", "gn", "h1"]);
  press(D.querySelector('#position-list .card[data-pos="wg"]'), "🎯 wg");
  await stage("e");
  passEarly(W, press);
  await stage("m");
  passEarly(W, press);
  await stage("h");
  if (back) back();
  const T = W.WingerTown;
  const draws = (W.__drawLog || []).slice();
  /* 🧡 선수 이름은 **화면이 쓴 그 값**을 계측에서 받아 옵니다 — 검사에 박으면
   *    이름 기본값이 바뀌는 날 «치환이 됐다»가 조용히 눈이 멀어요. */
  const me = (draws.find((d) => d.me) || {}).me || null;
  const out = { seed, stages, taps, me, cards: T.cards(), dev: T.deviation(),
    draws, delays: (W.__delayLog || []).slice() };
  W.close();
  return out;
}

/* 🗣️ 그려진 흐름 줄 → `{ flow, idx, subbed }` 되짚기. 🔒 `FLOW_LINE`은 **소스에서 뽑은** 표예요.
 * 🧡 표의 줄에는 `{me}`가 들어 있고 화면에는 **이름이 박혀** 있어서 **완전일치가 아닙니다** —
 *    그래서 ① 치환한 꼴로 먼저 맞춰 보고 ② 안 맞으면 **원문 그대로**와 맞춰 봅니다.
 *    🔴 ②에서 맞는다는 것은 **치환이 안 됐다**는 뜻이에요(`subbed: false`) — 그 자리가 I-C입니다.
 *    ②를 안 두고 「원문에 없으면 남의 문구」로 흘리면 `{me}` 줄이 **판별 대상에서 통째로 빠집니다**
 *    (engineer 150번 §4-② — `school-scene-test`가 실제로 그 상태였습니다). */
function resolveLine(stageId, text, me) {
  const tab = FLOW_LINE[stageId];
  if (!tab) return null;
  for (const fl of ["a", "h", "mid"]) {
    const t = tab[fl] || [];
    for (let k = 0; k < t.length; k++) {
      if (t[k].replace("{me}", me) === text) return { flow: fl, idx: k, subbed: true, raw: t[k] };
      if (t[k] === text) return { flow: fl, idx: k, subbed: false, raw: t[k] };
    }
  }
  return null;
}
/* 그 단계가 그린 🌊 흐름 줄을 순서대로 — `{ min, text, flow, idx, subbed }` */
const fillersOf = (r, id) => r.stages[id].feed
  .filter((x) => x.cls.indexOf("filler") >= 0 && x.min != null)
  .map((x) => Object.assign({ min: x.min, text: x.text, flow: null, idx: null, subbed: null },
    resolveLine(id, x.text, r.me) || {}));
/* 🔁 **꼬리가 아닌** 흐름 줄 — 꼬리는 `j === K - 1`이라 **격자의 마지막 눈금**에 섭니다.
 * 🔴 144번의 「마지막 순간 카드보다 앞」은 **더는 안 통합니다** — 이제 흐름 줄 넷 중 둘(🏫 초5의
 *    72'·84')이 마지막 카드 「뒤」예요.
 * 🔴 **그려진 것 중 마지막 한 장**으로도 재면 안 됩니다 — 🔚 꼬리 배선을 끄는 변이(M-NOEND)에서
 *    멀쩡한 선두 하나가 꼬리로 오해돼 **F-5가 남의 변이 신호까지 먹습니다.**
 * 🔒 그래서 꼬리의 분을 **소스 격자에서** 뜯어 옵니다 (관계). */
const tailMinOf = (id) => {
  const n = DECK_N[id];
  const F = flowMins(Array.from({ length: n }, (_, k) => minAt(k, n)));
  return F.length ? F[F.length - 1] : 90;
};
const leadFillersOf = (r, id) => fillersOf(r, id).filter((x) => x.min < tailMinOf(id));
const minsOf = (r, id) => r.stages[id].feed.filter((x) => x.min != null).map((x) => x.min);
const IDS = ["e", "m", "h"];

(async () => {
  /* ══════════ 0. 산식과 변이 정규식이 지금 소스에 걸리는가 ══════════ */
  {
    const got = { FLOW_LINE: !!FLOW_LINE, KICK_LINE: !!KICK_LINE, KICK2_LINE: !!KICK2_LINE,
      END_LINE: !!END_LINE, minAt: typeof minAt === "function",
      flowMins: typeof flowMins === "function" };
    const okAll = Object.values(got).every(Boolean);
    check(okAll, `0-1. 📐 \`town.js\`에서 산식·문구를 뽑았다 — ${Object.entries(got).map(([k, v]) => `${k} ${v ? "✔" : "🔴"}`).join(" · ")}`
      + (okAll ? `\n     END_LINE "${END_LINE}" · KICK_LINE ${JSON.stringify(KICK_LINE)}`
        : `\n     🔴 정규식이 안 걸려요 — 아래는 전부 "안 도는" 상태입니다`));
    /* 🔴🔴 **계측(LOG) 정규식이 안 걸리면 💥(종료 코드 2)로 죽습니다 — 빨간불이 아니에요.**
     *    `window.__drawLog`가 빈 배열이 되면 F-9가 «0건 위반»으로 **공짜 초록불**입니다.
     *    🔒 0건을 「어긋남 없음」으로 읽지 않습니다 — 계측이 죽으면 검사가 죽어야 해요. */
    const insBad = pageMutsOK({ LOG: MUT.LOG });
    if (insBad.length) {
      console.log(`\n💥 **계측 정규식이 \`town.js\`에 안 걸립니다 — 이건 초록불도 빨간불도 아닙니다**`);
      insBad.forEach((b) => console.log(`   · ${b}`));
      console.log(`   🔑 \`draw()\`가 갈렸어요. 계측을 못 심으면 F-9가 **빈 배열을 보고 초록불**이 납니다.`);
      process.exit(2);
    }
    const bad = pageMutsOK(MUT);
    const n = Object.values(MUT).reduce((a, t) => a + Object.values(t).reduce((b, m) => b + m.length, 0), 0);
    check(bad.length === 0, `0-2. 🔴 계측·변이 정규식 ${n}개가 지금 \`beta/winger2/town.js\`에 전부 걸린다`
      + (bad.length ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 검사는 "안 도는" 상태예요**`
        + bad.map((b) => `\n       · ${b}`).join("") : ""));
    if (!okAll || bad.length) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
  }

  const base = {};
  for (const s of SEEDS) base[s] = await arc(s, withLog(null));

  /* ══════════ ⓐ F-1. ⏱️ 단계마다 분이 계약대로 놓인다 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const got = minsOf(base[s], id);
      if (got.join(",") !== FEED_MIN[id].join(",")) bad.push(`시드${s}/${id}: ${got.join("·")} ≠ 계약 ${FEED_MIN[id].join("·")}`);
    }
    check(bad.length === 0,
      `F-1. ⏱️ **90분 대본이 그려진다** — 단계마다 피드의 분이 설계 149번 §3-6과 한 칸도 안 어긋난다`
      + `\n     🔎 계약(검사에 박음) — e ${FEED_MIN.e.join("·")} · m/h ${FEED_MIN.m.join("·")}`
      + `\n     🔑 🔥 순간 카드는 두 줄(무엇이 걸렸나 → 결과)이라 분이 두 번 나옵니다. 🥅 하프타임은 \`.w2-min\`이 없어 여기 안 들어와요`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));

    /* 🔒 **종속값은 관계로.** 위 계약은 「지금 `minAt`」의 값이라, 산식이 정당하게 바뀌면
     *    F-1은 빨간불이 되는 게 맞습니다. 그때 **어디를 봐야 하는지**를 이 줄이 알려 줘요:
     *    필러 분 `F[j]`는 언제나 「카드 j와 다음 카드(없으면 90') 사이의 한가운데」입니다. */
    const rel = [];
    for (const id of IDS) {
      const n = DECK_N[id];
      const M = Array.from({ length: n }, (_, k) => minAt(k, n));
      const want = flowMins(M);
      const got = fillersOf(base[SEEDS[0]], id).map((x) => x.min);
      if (got.join(",") !== want.join(",")) rel.push(`${id}: 화면 ${got.join("·")} ≠ 소스 격자 ${want.join("·")}`);
      if (want.length !== FLOW_N[id]) rel.push(`${id}: 소스 격자가 흐름 줄 ${want.length}장 (계약 ${FLOW_N[id]}장)`);
      if (want.indexOf(HALF_AT) >= 0) rel.push(`${id}: 격자가 ${HALF_AT}'을 내줬어요 — 🥅 하프타임과 겹칩니다`);
    }
    check(rel.length === 0,
      `F-1b. 🔗 **흐름 줄의 분이 소스의 격자와 일치**한다 — \`minAt\`·\`GRID\`·\`GRID_NEAR\`·\`flowMins\`를 \`town.js\`에서 뜯어 대조`
      + `\n     🔒 그리고 흐름 줄이 **${IDS.map((id) => `${id} ${FLOW_N[id]}`).join(" · ")}장** — 🆕 \`head.slice(0, 1)\` 폐기로 🏫 초5에 24'가 늘었습니다`
      + `\n     🌍 F-1은 「지금 \`minAt\`·\`GRID\`」의 **값**이고, 이 줄은 구조가 바뀌어도 사는 **관계**예요 — 둘이 같이 빨간불이면 산식이 바뀐 겁니다`
      + (rel.length ? rel.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓑ F-2. 🥅 하프타임이 45'에 정확히 한 장 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const f = base[s].stages[id].feed;
      const at = f.map((x, i) => (x.cls.indexOf("w2-half") >= 0 ? i : -1)).filter((i) => i >= 0);
      if (at.length !== 1) { bad.push(`시드${s}/${id}: 🥅 하프타임 ${at.length}장 (계약 1장)`); continue; }
      const before = f.slice(0, at[0]).filter((x) => x.min != null).map((x) => x.min);
      const after = f.slice(at[0] + 1).filter((x) => x.min != null).map((x) => x.min);
      if (before.some((v) => v > HALF_AT)) bad.push(`시드${s}/${id}: 🥅 앞에 ${HALF_AT}' 넘는 줄 (${before.join("·")})`);
      if (after.some((v) => v <= HALF_AT)) bad.push(`시드${s}/${id}: 🥅 뒤에 ${HALF_AT}' 이하 줄 (${after.join("·")})`);
    }
    check(bad.length === 0,
      `F-2. 🥅 **하프타임이 단계마다 정확히 1장**이고, 앞은 전부 ≤ ${HALF_AT}' · 뒤는 전부 > ${HALF_AT}'`
      + `\n     🔑 **「1장인가」로만 재면 안 됩니다** — 자리를 한 칸 옮겨도 장수는 그대로 1장이에요 (변이 M-HALFPOS)`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓒ F-3. 🏁 0' 줄이 [경기 시작]을 **누르기 전**에 이미 있다 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const b4 = base[s].stages[id].before.feed;
      const want = String(KICK_LINE[id] || KICK_LINE.m).replace(/\{opp\}/, "");
      const kick = b4.filter((x) => x.min === 0);
      if (kick.length !== KICK_N) { bad.push(`시드${s}/${id}: 누르기 전 \`0'\` 줄 ${kick.length}장 (계약 ${KICK_N}장)`); continue; }
      /* 🔒 **그 단계의 대진 줄인가** — `{opp}`를 뺀 꼬리로 봅니다(상대 이름은 난수예요) */
      if (kick[0].text.indexOf(want) < 0) bad.push(`시드${s}/${id}: \`0'\` 첫 줄이 그 단계의 대진 줄이 아니에요 — "${kick[0].text}"`);
      /* 🧡 **둘째 줄이 `{me}`를 화면에 처음 올리는 자리**입니다 (설계 149번 §3-5).
       *    🔒 그 단계의 `KICK2_LINE`에서 이름을 박은 꼴과 **완전일치**로 봅니다 — 「이름이 들었나」로만
       *       재면 단계가 섞여도 통과해요. */
      const me = base[s].me;
      const want2 = String(KICK2_LINE[id] || KICK2_LINE.m).replace("{me}", me);
      if (kick[1].text !== want2) bad.push(`시드${s}/${id}: \`0'\` 둘째 줄 "${kick[1].text}" ≠ \`KICK2_LINE.${id}\` "${want2}"`);
      if (base[s].stages[id].before.presses !== 0) bad.push(`시드${s}/${id}: 🔴 재기 전에 이미 눌렀어요`);
    }
    /* 🔒 **셀렉터마다 「탭 횟수 > 0」** — 아무것도 안 눌렀는데 타임아웃이 흐름을 끝까지
     *    미는 「자가 복구가 실패를 삼킴」을 막습니다. 계약은 **카드 수 + 1**(🏁 시작 한 번). */
    /* 🆕 2026-09-06 — **누름이 2회로 고정**입니다 (설계 153번 §4-1 · `town-test` C-5와 같은 계약).
     *    [다음 판] 버튼 5개가 사라져서 한 누름(🏁 시작)이 단계를 **통째로** 굴려요.
     *    🔴 옛 계약(`카드 수 + 1`)을 되살리면 [다음 판]이 돌아왔다는 뜻입니다. */
    const taps = [];
    for (const s of SEEDS) for (const id of IDS) {
      const got = base[s].stages[id].presses;
      if (got !== PRESS_N) taps.push(`시드${s}/${id}: 누름 ${got} ≠ ${PRESS_N} (🏁 시작 + 🔚 다음 단계)`);
    }
    check(bad.length === 0 && taps.length === 0,
      `F-3. 🏁 **\`0'\` 두 줄(대진 + 🧡 나)이 [경기 시작]을 누르기 「전」에 이미 큐를 지났다** (계약 D — 큐와 탭이 \`max()\`로 겹치는 자리)`
      + `\n     🔎 측정 조건 — 단계에 들어서서 **한 번도 안 누른 상태**에서 잽니다. 「존재한다」로만 재면 \`btn.onclick\` 안으로 옮겨도 통과해요`
      + `\n     🔒 그 단계의 누름 = **${PRESS_N}회** (🏁 시작 + 🔚 다음 단계) — ${IDS.map((id) => `${id} ${base[SEEDS[0]].stages[id].presses}`).join(" · ")}`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : "")
      + (taps.length ? taps.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓓ F-4. 🔚 90' 종료 휘슬이 **마지막 줄** ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) for (const id of IDS) {
      const f = base[s].stages[id].feed;
      const last = f[f.length - 1];
      if (!last) { bad.push(`시드${s}/${id}: 피드가 비었어요`); continue; }
      if (last.min !== 90) bad.push(`시드${s}/${id}: 마지막 줄이 ${last.min}' ("${last.text}")`);
      else if (last.text !== END_LINE) bad.push(`시드${s}/${id}: 90' 문구가 "${last.text}" ≠ \`END_LINE\``);
    }
    check(bad.length === 0,
      `F-4. 🔚 **\`90'\` 종료 휘슬이 마지막 카드 뒤에 온다** — 문구는 \`town.js\`의 \`END_LINE\`("${END_LINE}")`
      + `\n     ⏳ 정착 창 ${HOLD * 15}ms — \`delayOf()\`의 자동 진행 ${90}ms의 ${((HOLD * 15) / 90).toFixed(1)}배 (45ms면 큐 한가운데서 돌아와 이 줄이 통째로 사라집니다)`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓔ F-5. 🔁 흐름이 교대하고, 중등과 고등이 **서로 뒤집혀** 있다 ══════════
   * 🔴 **한 단계만 재면 안 됩니다** — `(j + sIdx) % 2`를 `j % 2`로 바꿔도 중등 하나만
   *    보면 `h → a`로 멀쩡해요. 두 단계를 **나란히** 놓아야 보입니다. */
  {
    const bad = [];
    const leadOf = (r, id) => leadFillersOf(r, id).map((x) => x.flow);
    for (const s of SEEDS) {
      const L = {};
      for (const id of IDS) {
        const lead = leadOf(base[s], id);
        L[id] = lead;
        /* 🔒 **잴 것이 있는가** — 선두가 두 장 미만이면 「교대」라는 말 자체가 뜻이 없습니다.
         *    (개수 자체는 F-1이 봅니다. 여기서는 «비었는데 공짜 초록불»만 막아요.) */
        if (lead.length < 2) { bad.push(`시드${s}/${id}: 선두 흐름 줄 ${lead.length}장 — 교대를 잴 것이 없어요`); continue; }
        for (let k = 0; k < lead.length; k++) {
          if (lead[k] !== "a" && lead[k] !== "h") { bad.push(`시드${s}/${id}: 선두에 \`${lead[k]}\`가 있어요 (꼬리 흐름이 앞으로 샜는지 보세요) — ${lead.join("→")}`); break; }
          if (k && lead[k] === lead[k - 1]) { bad.push(`시드${s}/${id}: 흐름이 안 교대해요 — ${lead.join("→")}`); break; }
        }
      }
      /* 🔴 **한 단계만 재면 안 됩니다** — `(j + sIdx) % 2`를 `j % 2`로 바꿔도 한 경기만 보면 멀쩡해요.
       *    🔒 초5(sIdx 0)와 고등(sIdx 2)은 **둘 다 짝수라 같은 순서가 맞습니다** — 문구 표가 갈라서
       *       같은 줄이 안 나와요(설계 149번 §3-3). 그래서 뒤집힘은 **중등 ↔ 나머지**로 봅니다. */
      for (const id of ["e", "h"]) {
        if (!L.m || !L[id] || L.m.length < 2 || L[id].length < 2) continue;
        const n = Math.min(L.m.length, L[id].length);
        const same = L.m.slice(0, n).filter((v, k) => v === L[id][k]).length;
        if (same > 0) bad.push(`시드${s}: 🔴 중등과 ${id === "e" ? "초5" : "고등"}의 흐름이 ${same}자리에서 **같습니다** (m ${L.m.join("→")} · ${id} ${L[id].join("→")}) — \`sIdx\`가 안 걸려요`);
      }
    }
    check(bad.length === 0,
      `F-5. 🔁 **선두 흐름 줄이 \`a\`↔\`h\`로 교대**하고, **중등이 초5·고등과 서로 뒤집혀** 있다`
      + `\n     🔎 측정 조건 — 문구를 \`town.js\`의 \`FLOW_LINE\`으로 되짚어 흐름을 읽습니다 (표를 베껴 적지 않아요)`
      + `\n     시드${SEEDS[0]}: 초5 ${leadOf(base[SEEDS[0]], "e").join("→")} · 중등 ${leadOf(base[SEEDS[0]], "m").join("→")} · 고등 ${leadOf(base[SEEDS[0]], "h").join("→")}`
      + `\n     🌍 초5(sIdx 0)와 고등(sIdx 2)이 **같은 순서인 것은 설계대로**예요 — 문구 표가 단계마다 갈라서 같은 줄이 안 나옵니다`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* 🔓 **I-A(첫 순간 카드 앞의 유료 흐름 줄 1장)는 2026-09-06에 폐기했습니다.**
   * 🌍 그 문장이 서 있던 세계: 「계약 D(첫 카드 ≤90초)의 추정 여유가 ~1.4초인 세계」.
   *    범민 님이 *"첫 카드까지 걸리는 시간이 느는건 상관없어"*로 **그 계약을 직접 풀었고**,
   *    설계 153번 §3-4가 `flowMins`의 `head.slice(0, 1)`을 지웠습니다.
   * 🔴 **되살리지 마세요** — 지금 🏫 초5의 첫 구간은 **2장**(12'·24')이 맞습니다.
   *    D가 다시 계약이 되면 그때 `flowMins`와 `FLOW_N`을 **같이** 되돌리세요. */

  /* ══════════ ⓔ'' I-B. 🗣️ 문구를 고르는 자가 **「그 흐름의 사용 순번」**이다 ══════════
   * 🔴 144번은 `t[j % t.length]`였습니다 — 흐름 줄이 넷이 되면서 `"a"`가 j=0·j=2·꼬리까지
   *    **세 번**까지 나는데, `j`로 고르면 j=0과 j=2가 **같은 줄**을 받아요.
   * 🔒 **관계로 잽니다** — 검사가 「몇 번째 줄이 떠야 하는가」를 세면서 갑니다(사용 순번).
   *    값을 베껴 적지 않아요. 🔒 `used`가 `runTo` 「안」으로 들어가도 여기서 잡힙니다
   *    (카드마다 0으로 돌아가면 순번이 어긋나요 — engineer 150번의 I-E). */
  {
    const bad = [], dup = [];
    for (const s of SEEDS) for (const id of IDS) {
      const use = { a: 0, h: 0, mid: 0 };
      const seen = new Map();
      for (const f of fillersOf(base[s], id)) {
        if (f.flow == null) continue;                     // 🔒 「표에 없는 문구」는 F-8이 봅니다
        const want = use[f.flow]++ % (FLOW_LINE[id][f.flow] || []).length;
        if (f.idx !== want) bad.push(`시드${s}/${id} ${f.min}' \`${f.flow}\`: ${f.idx}번 줄 (사용 순번대로면 ${want}번) — "${f.text}"`);
        if (seen.has(f.text)) dup.push(`시드${s}/${id}: "${f.text}"가 ${seen.get(f.text)}'과 ${f.min}'에 **두 번**`);
        seen.set(f.text, f.min);
      }
    }
    check(bad.length === 0,
      `I-B. 🗣️ **문구를 고르는 자가 「그 흐름이 이 경기에서 몇 번째로 쓰였나」**다 — 슬롯 번호 \`j\`가 아니에요`
      + `\n     🔒 검사가 사용 순번을 **따로 세면서** 갑니다 (관계) — \`used\`가 \`runTo\` 안으로 들어가도 여기서 어긋나요`
      + (bad.length ? bad.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : ""));
    check(dup.length === 0,
      `I-B2. 🗣️ **한 경기에서 같은 흐름 문구가 두 번 안 뜬다** — 같은 말이 두 번 뜨면 그 순간 「경기」가 아니라 「목록」입니다`
      + `\n     🔑 I-B(순번 관계)가 **언제나** 무는 자리이고, 이 줄은 **결과**를 봅니다 — 스코어에 따라 겹치는 판이 안 나올 수도 있어서요`
      + (dup.length ? dup.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓔ''' I-C. 🧡 `{me}` 자리표가 **실제로 치환됐다** ══════════
   * 🔴 치환을 지우면 화면에 `"{me}가 공을 몰고 앞으로 나가요"`가 **글자 그대로** 뜹니다.
   *    사람이 보면 1초 만에 아는 버그인데, 149번 개편 직후 **아홉 검사 중 한 개도 안 물었어요.** */
  {
    const raw = [], cover = [];
    for (const s of SEEDS) for (const id of IDS) {
      for (const x of base[s].stages[id].feed) {
        if (/\{me\}|\{opp\}/.test(x.text)) raw.push(`시드${s}/${id} ${x.min}': "${x.text}"`);
      }
      for (const f of fillersOf(base[s], id)) if (f.raw && f.raw.indexOf("{me}") >= 0) cover.push(f);
    }
    /* 🔒 **커버리지를 같이 적습니다** — `{me}`가 든 줄이 한 판도 안 그려졌으면 이 문장은
     *    「아무것도 안 지키면서 초록불」이에요. 아크 전체(시드 4 × 단계 3) 기준으로 봅니다. */
    const enough = cover.length >= SEEDS.length * IDS.length;
    check(raw.length === 0 && enough,
      `I-C. 🧡 **\`{me}\`·\`{opp}\` 자리표가 화면에 글자 그대로 안 뜬다** — 치환은 \`land()\`와 같은 방식이에요`
      + `\n     🔎 측정 조건 — 🧡 \`{me}\`가 든 흐름 줄이 실제로 그려진 횟수 **${cover.length}장** (바닥 ${SEEDS.length * IDS.length}장 · 단계마다 한 장꼴)`
      + (raw.length ? raw.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : "")
      + (enough ? "" : `\n     🔴 \`{me}\` 줄이 ${cover.length}장뿐이라 이 문장이 **아무것도 안 지키고 있을 수** 있어요 — 흐름 배정을 먼저 보세요`));
  }

  /* ══════════ ⓔ'''' I-DEL. ⏱️ 🌊 읽는 줄이 `delayOf`에 **카드를 넘긴다** ══════════
   * 🔴 `delayOf()`로 되돌리면 갈래 자체가 죽어 흐름 줄이 🔥 결정 줄과 **같은 900ms**가 됩니다.
   *    🔒 `delayOf`의 **몸통**은 그대로라, 소스에서 뜯어 굴리는 검사로는 안 보여요 —
   *       **부르는 자리**를 계측해야 합니다.
   * 🌍 이 문장이 서 있는 세계: 「🌊 읽는 줄과 🔥 결정 줄의 딜레이가 갈리는 세계」(149번 §4-1).
   *    ⏱️ **값**(620 vs 900)의 계약은 여기가 아니라 `pitch-test` P-10b가 봅니다. */
  {
    const bad = [];
    for (const s of SEEDS) {
      const want = {}, got = {};
      for (const d of base[s].draws) if (["filler", "kick", "end", "half"].includes(d.kind)) want[d.kind] = (want[d.kind] || 0) + 1;
      for (const k of base[s].delays) if (["filler", "kick", "end", "half"].includes(k)) got[k] = (got[k] || 0) + 1;
      for (const k of ["filler", "kick", "end", "half"]) {
        if ((got[k] || 0) !== (want[k] || 0)) bad.push(`시드${s}: \`${k}\` — 그린 ${want[k] || 0}장 중 \`delayOf\`가 받은 것 ${got[k] || 0}장`);
      }
    }
    check(bad.length === 0,
      `I-DEL. ⏱️ **\`push()\`가 \`delayOf\`에 카드를 넘긴다** — 🌊 읽는 줄과 🔥 결정 줄을 가르는 그 갈래`
      + `\n     🔑 \`delayOf\`의 몸통은 그대로라 **소스만 굴려서는 안 보입니다** — \`S.fast\` 「앞」에 계측을 심어 인자를 셌어요`
      + `\n     시드${SEEDS[0]}: ${["filler", "kick", "end", "half"].map((k) => `${k} ${base[SEEDS[0]].delays.filter((x) => x === k).length}`).join(" · ")}`
      + (bad.length ? bad.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓕ F-6. 🎯 꼬리 흐름이 **스코어를 탄다** — 값이 아니라 관계 ══════════
   * 🔒 「지는 판이면 `a`」를 값으로 박으면 시드 하나의 우연을 재게 됩니다.
   *    `GOAL_BY`를 뒤집으면 **꼬리 흐름도 반대로 뒤집혀야** 한다 — 그게 관계예요.
   * 🌍 이 문장이 서 있는 세계: 「꼬리 필러가 **그 단계의 최종 스코어만** 읽는 세계」입니다.
   *    꼬리가 스코어 말고 다른 것(예: 편차 `d`)을 읽기로 바뀌면 여기부터 다시 보세요. */
  {
    const flip = {};
    for (const s of SEEDS) flip[s] = await arc(s, withLog("FLIP"));
    const OPP = { a: "h", h: "a", mid: "mid" };
    const bad = [], pairs = [];
    let decided = 0;
    for (const s of SEEDS) for (const id of IDS) {
      const b = fillersOf(base[s], id).slice(-1)[0];
      const f = fillersOf(flip[s], id).slice(-1)[0];
      if (!b || !f) { bad.push(`시드${s}/${id}: 꼬리 필러를 못 찾았어요`); continue; }
      pairs.push(`${s}/${id} ${b.flow}→${f.flow}`);
      if (b.flow !== "mid") decided += 1;
      if (OPP[b.flow] !== f.flow) bad.push(`시드${s}/${id}: 꼬리 ${b.flow} → 뒤집으면 ${f.flow} (계약 ${OPP[b.flow]})`);
    }
    /* 🔑 **「아무 일도 안 일어났다」를 통과로 세지 않습니다** — 전부 무승부면 `mid → mid`라
     *    상수로 바꿔도 통과해요. 승부가 갈린 단계가 충분히 나왔는지 같이 봅니다. */
    const enough = decided >= MIN_DECIDED;
    check(bad.length === 0 && enough,
      `F-6. 🎯 **꼬리 필러의 흐름이 그 단계의 스코어를 탄다** — \`GOAL_BY\`를 뒤집으면 꼬리도 뒤집힌다`
      + `\n     🔎 측정 조건 — 승부가 갈린 단계 **${decided} / ${SEEDS.length * IDS.length}** (바닥 ${MIN_DECIDED}). 비긴 판은 \`mid → mid\`라 **잴 것이 없어서** 세지 않습니다`
      + `\n     ${pairs.join(" · ")}`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : "")
      + (enough ? "" : `\n     🔴 승부가 갈린 단계가 ${decided}벌뿐이라 이 문장이 "원래 같은 값"을 재고 있을 수 있어요 — **시드를 늘리세요**`));
  }

  /* ══════════ ⓖ F-7. 🔘 필러가 `deck`에 안 샌다 ══════════ */
  {
    const bad = [];
    for (const s of SEEDS) {
      for (const id of IDS) {
        const got = base[s].stages[id].dots;
        if (got !== DECK_N[id]) bad.push(`시드${s}/${id}: 진행 띠 점 ${got} ≠ ${DECK_N[id]}`);
      }
      if (base[s].cards !== TOTAL_CARDS) bad.push(`시드${s}: \`state.cards\` ${base[s].cards} ≠ ${TOTAL_CARDS}`);
    }
    check(bad.length === 0,
      `F-7. 🔘 **필러가 \`deck\`에 안 샌다** — 진행 띠의 점이 ${IDS.map((id) => DECK_N[id]).join("·")} 그대로이고 \`state.cards\`가 ${TOTAL_CARDS}`
      + `\n     🌍 필러를 \`deck\`에 넣기로 판정이 바뀌면 이 줄이 먼저 빨간불입니다 — 그때 \`_load.js\`의 \`passStage\`와 \`progHTML\`을 **같이** 보세요`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
  }

  /* ══════════ ⓗ F-8·F-9. 🗣️ 문구가 그 단계의 것이고, `flow` **필드**가 실린다 ══════════ */
  {
    const bad = [], noFlow = [];
    for (const s of SEEDS) for (const id of IDS) {
      for (const f of fillersOf(base[s], id)) {
        if (f.flow == null) bad.push(`시드${s}/${id} ${f.min}': 문구가 \`FLOW_LINE.${id}\`에 없어요 — "${f.text}"`);
      }
      /* 🔬 계측 로그 — 화면으로 나간 필러 카드에 `flow` 필드가 실렸는가.
       *    🔴 DOM만 보면 못 잡습니다: 문구는 `fillerText`가 따로 고르니 `flow: fl`을
       *       빼도 글자는 그대로예요. 그런데 그러면 🟩 판이 안 밀립니다(pitch-test P-7). */
      for (const d of base[s].draws.filter((x) => x.stage === id && x.kind === "filler")) {
        if (d.flow !== "a" && d.flow !== "h" && d.flow !== "mid")
          noFlow.push(`시드${s}/${id} ${d.min}': flow=${JSON.stringify(d.flow)}`);
      }
    }
    check(bad.length === 0,
      `F-8. 🗣️ **필러 문구가 그 단계의 \`FLOW_LINE\`에서 나온다** — 무대가 커지면 중계의 목소리도 자랍니다`
      + `\n     🔑 이 줄은 🎬 **세대 누수의 보조 자**이기도 해요 — 초등의 필러가 중등 피드에 뜨면 문구가 \`FLOW_LINE.m\`에 없습니다`
      + (bad.length ? bad.map((b) => `\n     🔴 ${b}`).join("") : ""));
    check(noFlow.length === 0,
      `F-9. 🌊 **필러 카드가 \`flow\`를 실어 화면에 간다** — \`town.js\`의 \`draw()\`를 계측해서 봅니다`
      + `\n     🔑 DOM만 보면 못 잡아요: \`flow: fl\`을 빼도 **문구는 그대로**입니다. 그런데 그러면 🟩 판이 안 밀려요 (\`pitch-test\` P-7과 한 쌍)`
      + (noFlow.length ? noFlow.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : ""));

    /* ══════════ 🌊 F-9b. 🔥 결정·괄호 줄에는 `flow`가 **안** 실린다 ══════════
     * 🔴 **F-9와 한 쌍입니다** — 필러엔 「있다」, 나머지엔 「없다」. 한쪽만 재면 절반이 빕니다.
     * 🔴 **`match-scene.js:444`와의 두 파일 계약이에요:**
     *      const side = at[2] || (card.flow === "a" ? "a" : card.flow === "h" ? "h" : "");
     *    🔥 결정 카드의 닫는 줄은 `BALL_LOST[card.kind]`를 쓰는데 그 **세 번째 칸이 `""`(falsy)**라
     *    `card.flow`로 **그냥 넘어갑니다.** 🔥 카드에 `flow`가 붙는 순간 🟩 판이 밀려요 —
     *    실제 게임엔 없는 그림입니다.
     * 🔒 지금 이걸 막는 것은 **`town.js`가 `flow`를 `filler` 한 자리에만 단다**는 사실 하나뿐이에요.
     *    그 한 자리가 유일한 방어라 여기서 지킵니다.
     * 🌍 이 문장이 서 있는 세계: 「`BALL_LOST`의 세 번째 칸이 밀림을 안 적는 세계」(director 145번).
     *    거기에 밀림을 적기로 판정이 바뀌면 **같은 답을 내는 줄이 둘**이 되고(방어 겹침),
     *    그때는 이 줄과 `pitch-test` P-7을 **같이** 다시 보세요.
     * 🔑 2026-09-06 — director가 `_check.html`의 `school` 덱에서 실제로 밟았습니다. */
    const stray = [];
    for (const s of SEEDS) for (const d of base[s].draws) {
      if (d.kind !== "filler" && d.flow != null) stray.push(`시드${s}/${d.stage} ${d.min}' \`${d.kind}\`: flow=${JSON.stringify(d.flow)}`);
    }
    const kinds = [...new Set(base[SEEDS[0]].draws.filter((d) => d.kind !== "filler").map((d) => d.kind))];
    /* 🔒 **잴 것이 있는가** — 필러 말고 다른 종류가 실제로 그려졌는지 같이 찍습니다.
     *    안 그러면 「비교할 카드가 0장」인 판에서 공짜 초록불이에요. */
    const covered = kinds.length >= 3;
    check(stray.length === 0 && covered,
      `F-9b. 🌊 **🔥 결정·🏁 괄호 줄에는 \`flow\`가 「안」 실린다** — F-9와 한 쌍이에요 (필러엔 있다 / 나머지엔 없다)`
      + `\n     🔑 \`match-scene.js\`의 \`const side = at[2] || (card.flow === …)\`에서 **\`BALL_LOST\`의 셋째 칸이 \`""\`(falsy)**라 \`card.flow\`로 넘어갑니다 — 붙는 순간 🟩 판이 밀려요`
      + `\n     🔎 측정 조건 — 필러가 아닌 종류 **${kinds.length}가지**(${kinds.join(" · ")})가 실제로 그려졌습니다`
      + (stray.length ? stray.slice(0, 6).map((b) => `\n     🔴 ${b}`).join("") : "")
      + (covered ? "" : `\n     🔴 필러 말고 다른 카드가 ${kinds.length}가지뿐이라 이 문장이 **잴 것이 없습니다**`));
  }

  /* ══════════════════════════════════════════════════════════════
   * 🔴 변이 검증 — **무엇을 망가뜨리면 어느 문장이 빨간불인가**
   * ══════════════════════════════════════════════════════════════
   * 🔒 「빨간불이 뜬다」로 끝내지 않고 **어느 문장이** 뜨는지 봅니다.
   *    변이 하나가 전부를 무너뜨리면 어느 계약이 무엇을 지키는지 알 수 없어요. */
  {
    const SEED = SEEDS[0];
    /* 각 변이가 무엇을 깨야 하는가 — `probe`가 재는 문장들의 이름 */
    const probe = async (name) => {
      const r = await arc(SEED, withLog(name));
      const f1 = IDS.every((id) => minsOf(r, id).join(",") === FEED_MIN[id].join(","));
      const f2 = IDS.every((id) => {
        const f = r.stages[id].feed;
        const at = f.map((x, i) => (x.cls.indexOf("w2-half") >= 0 ? i : -1)).filter((i) => i >= 0);
        if (at.length !== 1) return false;
        return !f.slice(0, at[0]).some((x) => x.min != null && x.min > HALF_AT)
          && !f.slice(at[0] + 1).some((x) => x.min != null && x.min <= HALF_AT);
      });
      const f3 = IDS.every((id) => {
        const k = r.stages[id].before.feed.filter((x) => x.min === 0);
        return k.length === KICK_N
          && k[1].text === String(KICK2_LINE[id] || KICK2_LINE.m).replace("{me}", r.me);
      });
      const f4 = IDS.every((id) => {
        const last = r.stages[id].feed.slice(-1)[0];
        return !!last && last.min === 90 && last.text === END_LINE;
      });
      const alt = (id) => {
        const L = leadFillersOf(r, id).map((x) => x.flow);
        if (L.length < 2) return false;
        return L.every((v, k) => (v === "a" || v === "h") && (!k || v !== L[k - 1]));
      };
      const f5 = IDS.every(alt) && ["e", "h"].every((id) => {
        const M = leadFillersOf(r, "m").map((x) => x.flow), X = leadFillersOf(r, id).map((x) => x.flow);
        const n = Math.min(M.length, X.length);
        return n >= 2 && M.slice(0, n).every((v, k) => v !== X[k]);
      });
      const f1b = IDS.every((id) => {
        const n = DECK_N[id];
        const M = Array.from({ length: n }, (_, k) => minAt(k, n));
        const want = flowMins(M);
        return fillersOf(r, id).map((x) => x.min).join(",") === want.join(",")
          && want.length === FLOW_N[id] && want.indexOf(HALF_AT) < 0;
      });
      const f7 = IDS.every((id) => r.stages[id].dots === DECK_N[id]) && r.cards === TOTAL_CARDS;
      const f9 = r.draws.filter((x) => x.kind === "filler")
        .every((d) => d.flow === "a" || d.flow === "h" || d.flow === "mid");
      const f9b = r.draws.every((d) => d.kind === "filler" || d.flow == null);
      const iB = IDS.every((id) => {
        const use = { a: 0, h: 0, mid: 0 };
        return fillersOf(r, id).every((f) => f.flow == null
          || f.idx === use[f.flow]++ % (FLOW_LINE[id][f.flow] || []).length);
      });
      const iC = IDS.every((id) => !r.stages[id].feed.some((x) => /\{me\}|\{opp\}/.test(x.text)));
      const iDel = (() => {
        const want = {}, got = {};
        for (const d of r.draws) if (["filler", "kick", "end", "half"].includes(d.kind)) want[d.kind] = (want[d.kind] || 0) + 1;
        for (const k of r.delays) if (["filler", "kick", "end", "half"].includes(k)) got[k] = (got[k] || 0) + 1;
        return ["filler", "kick", "end", "half"].every((k) => (got[k] || 0) === (want[k] || 0));
      })();
      return { "F-1": f1, "F-1b": f1b, "F-2": f2, "F-3": f3, "F-4": f4, "F-5": f5, "F-7": f7,
        "F-9": f9, "F-9b": f9b, "I-B": iB, "I-C": iC, "I-DEL": iDel };
    };
    /* `red` = **반드시** 빨간불이어야 하는 문장 · `also` = **딸려 오는 것이 정상**인 문장.
     * 🔴 `also`를 빈칸으로 두는 것이 기본입니다 — 여기에 이름을 적을 때는 **왜 딸려 오는지**를
     *    옆에 적으세요. 안 적으면 다음 사람이 「원래 저 검사는 같이 빨간불이야」로 배웁니다.
     * 🔒 `red`도 `also`도 아닌 문장이 빨간불이면 **그건 계약 위반**이에요 — 성질이 다른 것이
     *    한 검사에 묶여 있다는 뜻이라, 고친 뒤에도 빨간불이 남아 신호를 잃습니다. */
    const WANT = {
      /* 🆕 2026-09-06 — 변이의 모양이 갈렸습니다 (`runTo` → `runClock`).
       *    이제 M-NOFILL은 **🌊 흐름 줄만** 끕니다 — 🥅 하프타임은 그대로라 F-2가 안 뭅니다.
       *    F-1b(격자 대조)와 F-5(교대)가 딸려 오는 게 정상이에요: 흐름 줄이 **0장**이라
       *    격자와 대조할 것도, 교대를 잴 것도 없어집니다. */
      "M-NOFILL": { red: ["F-1", "F-1b"], also: ["F-5"] },
      /* 🆕 이제 M-NOEND는 **🔚 90' 줄만** 끕니다 — 꼬리 흐름 줄은 그대로라 F-1b가 안 뭅니다.
       *    🔒 `finishMatch()`는 돌아서 버튼이 뜨니, **「줄 없이 버튼만」**이 잡히는 자리예요. */
      "M-NOEND": { red: ["F-1", "F-4"], also: [] },
      "M-LATEKICK": { red: ["F-3"], also: [] },        // 🏁 0'이 누른 「뒤」로
      "M-NOHALF": { red: ["F-2"], also: [] },          // 🥅 0장
      "M-HALFPOS": { red: ["F-2"], also: [] },         // 🥅 자리가 한 칸 앞 (장수는 그대로 1장)
      "M-NOSIDX": { red: ["F-5"], also: [] },          // 중등과 고등이 같아짐
      /* 🔑 `deck`이 한 장 늘면 `minAt`이 통째로 옮겨져서 필러 **슬롯 번호**도 같이 밀립니다 —
       *    그래서 F-5(흐름 교대)가 딸려 옵니다. 「필러가 deck에 새면 대본 전체가 흔들린다」가
       *    사실이라 이건 정상 신호예요. F-7이 그 뿌리를 가리킵니다. */
      "M-DECKLEAK": { red: ["F-1", "F-7"], also: ["F-1b"] },
      /* 🔑 🏁 **둘째 줄만** 지웁니다 — 「0' 줄이 있는가」로 재면 통째로 안 잡혀요 */
      /* 🔑 F-1(분 목록)이 딸려 오는 것이 정상입니다 — 🏁 `0'` 두 줄이 **그 목록에 들어 있어서**
       *    한 장이 사라지면 목록이 통째로 어긋나요. F-3이 「무엇이 사라졌는지」를 가리킵니다. */
      "M-NOKICK2": { red: ["F-3"], also: ["F-1"] },
      /* 🔑 ⏱️ 격자 18은 90의 약수라 n=3의 첫 구간이 **0칸** — 범민 님이 짚은 그 구멍입니다.
       *    🏫 초5는 [18,72] 두 장, 중·고는 [36,54] 두 장이라 F-1b(4장)도 같이 물어요. */
      "M-GRID18": { red: ["F-1", "F-1b"], also: ["F-5", "I-B", "I-C"] },
      /* 🔑 🗣️ 고르는 자를 슬롯 번호로 — I-B(순번 관계)가 **언제나** 뭅니다.
       *    I-B2(중복)는 스코어에 따라 겹치는 판이 안 나올 수도 있어서 `also`예요. */
      "M-USEJ": { red: ["I-B"], also: [] },
      /* 🔑 🗣️ `used`가 `runTo` 안으로 — 카드마다 0으로 돌아가 순번이 어긋납니다 (engineer I-E) */
      "M-USEDIN": { red: ["I-B"], also: [] },
      /* 🧡 화면에 `{me}`가 글자 그대로 — 🔒 I-B는 **원문과도 맞춰 보므로** 안 무는 게 맞습니다
       *    (그래야 「문구 자」와 「치환 자」가 갈려요). */
      "M-NOSUB": { red: ["I-C"], also: [] },
      /* 🔑 🔁 `flowOf`의 둘째 인자를 카드 수로 — 🏫 초5는 넷 중 셋이 꼬리가 되어 교대가 깨집니다 */
      "M-FLOWK": { red: ["F-5"], also: [] },
      /* 🔑 ⏱️ 부르는 자리에서 카드를 안 넘김 — 🌊 읽는 줄이 🔥 결정 줄과 같은 속도가 됩니다 */
      "M-NODELAYCARD": { red: ["I-DEL"], also: [] },
      /* 🔑 🌊 🔥 카드에 `flow`를 달면 `BALL_LOST`의 `""`를 뚫고 🟩 판이 밀립니다 */
      "M-MOMENTFLOW": { red: ["F-9b"], also: [] },
    };
    for (const [name, w] of Object.entries(WANT)) {
      const got = await probe(name);
      const red = Object.keys(got).filter((k) => !got[k]);
      const miss = w.red.filter((k) => !red.includes(k));
      const extra = red.filter((k) => !w.red.includes(k) && !w.also.includes(k));
      const ok = miss.length === 0 && extra.length === 0;
      check(ok, `변이-${name} → **${w.red.join(" · ")}**이 빨간불`
        + (w.also.length ? ` (딸려 오는 것이 정상: ${w.also.join(" · ")})` : "")
        + `\n     실제로 빨간불: ${red.length ? red.join(" · ") : "🔴 없음 — 이 변이가 아무 데도 안 걸립니다"}`
        + (miss.length ? `\n     🔴 **안 잡힌 것: ${miss.join(" · ")}** — 그 문장은 지금 아무것도 안 지킵니다` : "")
        + (extra.length ? `\n     🔴 **뜻밖에 같이 무너진 것: ${extra.join(" · ")}** — 성질이 다른 것이 한 문장에 묶였는지 보세요`
          + ` (딸려 오는 게 맞으면 \`also\`에 **이유와 함께** 적으세요)` : ""));
    }
    /* 🎯 M-TAILCONST는 **관계**를 깨는 변이라 base 하나로는 안 보입니다 — FLIP과 짝지어야 해요 */
    {
      const b = await arc(SEED, withLog("M-TAILCONST"));
      const f = await arc(SEED, merge(MUT.LOG, MUT["M-TAILCONST"], MUT.FLIP));
      const OPP = { a: "h", h: "a", mid: "mid" };
      const kept = IDS.filter((id) => {
        const x = fillersOf(b, id).slice(-1)[0], y = fillersOf(f, id).slice(-1)[0];
        return x && y && OPP[x.flow] === y.flow;
      });
      /* 🔒 꼬리를 상수로 바꾸면 **뒤집어도 안 뒤집힙니다** — 세 단계 전부 어긋나야 합니다.
       *    (상수가 `mid`라 `mid → mid`는 관계상 「뒤집힘」과 구분이 안 돼요. 그래서
       *     ① base의 꼬리가 전부 상수 하나인가 ② 승부가 갈린 단계가 있는가를 같이 봅니다.) */
      const tails = IDS.map((id) => (fillersOf(b, id).slice(-1)[0] || {}).flow);
      const allSame = tails.every((t) => t === tails[0]);
      check(allSame && kept.length === IDS.length,
        `변이-M-TAILCONST → **F-6이 빨간불**이어야 한다 — 꼬리 흐름 ${tails.join(" · ")} (전부 같은 값 ${allSame ? "✔" : "🔴"})`
        + `\n     🔑 base 하나로는 안 보입니다 — 상수도 「어떤 값」이라 F-1~F-5·F-7은 전부 초록불이에요. **FLIP과 짝지어야** 보입니다`
        + (allSame && kept.length === IDS.length ? "" :
          `\n     🔴 뒤집어도 안 뒤집히는 단계가 ${IDS.length - kept.length}개뿐이에요 — 변이가 덜 걸렸는지 보세요`));
    }
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})();
