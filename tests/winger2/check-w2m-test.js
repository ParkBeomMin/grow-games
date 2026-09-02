/* 🧪 ⚽ 더 윙어 II — **확인 페이지의 미니게임 목록이 실제 판과 맞는가**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 이 파일이 생긴 이유 — **확인 페이지를 보는 검사가 0곳이었습니다**
 * ─────────────────────────────────────────────────────────────────────────
 * `tests/check-page-test.js`는 `MG_MECHS`(⚾ 야구 · 🎤 아이돌)만 봅니다.
 * ⚽ 윙어의 칸(`W2M_LIST` · `w2mPlay`)은 **한 줄도 안 봅니다** — 실제로 grep 0건이었어요.
 * 그래서 미니게임이 넷 → 하나가 됐는데도 **확인 페이지는 넷을 그대로 내놓고 있고,
 * 검사는 전부 초록불**입니다. 「도달 경로가 조용히 죽음」의 형태예요.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** (2026-09-02 · 116번 · designer 117번 §6)
 * ═════════════════════════════════════════════════════════════════════════
 *   · 판은 **하나**(🥅 골문 6칸)입니다. 🏃 컷인 · 🎯 킬패스 · 🧱 차단은 **형태째** 없어요
 *   · `play()`는 **모르는 `kind`를 ⚽ 결정으로 떨어뜨립니다** — 그래서 옛 항목이
 *     🔴 **에러 없이** 골문 판을 열고, 설명만 딴소리를 합니다(조용히 어긋나요)
 *   · 🧱 `kind: "defend"`는 **화면을 한 조각도 안 그립니다** — 목록에 남아 있으면
 *     🔴 **빈 칸**이 뜹니다(«고장 났나?»로 읽혀요)
 *   · 🔒 `opts.moment`는 **화면을 고르는 데 안 씁니다.** 엔진이 준 이름을 되돌려만 줘요
 *
 * ⚠️ **뒤집히면 이 파일이 옛 계약이 되는 판정**
 *   · *"🥅를 우리 골문으로 돌려 수비용을 만들자"*(117번 §6-4) → 그때 🧱이 목록에
 *     **되돌아옵니다.** 이 파일부터 여세요 — 값을 고치는 게 아니라 **목록을 늘리는** 겁니다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 `eval` 안 씀 — 목록은 `new Function(... return ...)`으로 읽습니다
 *   ② **판 이름을 베껴 적지 않습니다** — `W2Moment.WORDS[kind].title`과 대조해요
 *   ③ **진짜로 열어 봅니다** — `play()`를 부르고 그려진 조각을 셉니다
 *   ④ **변이 검증** — 기준선이 지금 🔴 빨간불이라, 디스크는 안 건드리고
 *      **읽어 온 문자열**에 「고친 목록」과 「망가뜨린 목록」을 각각 넣어
 *      «고치면 초록불이 되는가» · «망가뜨리면 빨간불이 되는가»를 둘 다 찍습니다
 *      (🔑 빨간불인 검사는 남의 변이 신호를 먹어요 — 그래서 자가 검증을 붙였습니다)
 *   ⑤ 🔴 **`beta/`를 안 고칩니다** — 고칠 자리를 출력에 적기만 해요
 *
 * 종료 코드: 0 통과 · 1 빨간불 · 2 💥 죽음
 */
"use strict";
const fs = require("fs");
const { momentDom, pressDom } = require("./_load.js");

const CHECK = "/workspace/grow-games/beta/_check.html";
let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 🔒 **폐기한 낱말** — 화면의 이름이지 축구의 이름이 아닌 것들이에요.
 *    `one-grid-test.js` G-5가 **게임 화면**에서 막는 말인데, 확인 페이지의 설명글은
 *    아무도 안 봐서 그대로 살아 있습니다. 여기서 같은 목록으로 막습니다. */
const BAN = ["갭", "코스 칸", "판정 창", "초록 존", "오프사이드"];

/* 🔎 `_check.html`에서 `W2M_LIST` 배열만 뜯어옵니다 — 소스를 **파싱**하지 문자열 매칭이 아니에요 */
function listFrom(html) {
  const a = html.indexOf("const W2M_LIST = [");
  if (a < 0) throw new Error("`_check.html`에서 `W2M_LIST`를 못 찾았어요 — 구현이 바뀐 겁니다");
  const b = html.indexOf("\n    ];", a);
  if (b < 0) throw new Error("`W2M_LIST`의 끝을 못 찾았어요");
  const src = html.slice(a + "const W2M_LIST = ".length, b + "\n    ]".length);
  /* 🔒 직접 eval 금지 — `new Function` + `return`입니다 */
  return new Function(`return ${src};`)();
}

/* 🎮 목록의 항목 하나를 **확인 페이지가 부르는 그대로** 열어 봅니다.
 * 🔒 `_check.html:993`의 호출을 그대로 옮겼어요 — `{ kind, moment: id, condition, foot }` */
async function openEntry(entry) {
  const W = momentDom(null);
  const st = W.setTimeout; W.setTimeout = (fn) => st(fn, 0);
  const host = W.document.getElementById("host");
  let done = 0, s = null;
  W.W2Moment.play(host, { kind: entry.kind, moment: entry.id, condition: 80, foot: "R" },
    (j, d) => { done += 1; s = d ? d.s : null; });
  await wait(6);
  const go = host.querySelector(".w2m-go");
  const readyText = host.textContent || "";
  if (go) { pressDom(W, go); await wait(6); }
  const out = {
    id: entry.id, name: entry.name, kind: entry.kind, desc: entry.desc || "",
    drew: (host.innerHTML || "").length > 0,
    cells: host.querySelectorAll(".w2m-cell").length,
    /* 🔑 **판의 진짜 이름** — 베껴 적지 않고 소스가 내보낸 `WORDS`에서 받습니다 */
    realTitle: (W.W2Moment.WORDS[entry.kind] || {}).title || null,
    text: readyText + " " + (host.textContent || ""),
    done, s,
  };
  try { W.close(); } catch (e) { /* 이미 닫힘 */ }
  return out;
}

/* 📏 목록 하나를 판정합니다 — **셋을 봅니다** */
async function judge(list) {
  const rows = [];
  for (const e of list) rows.push(await openEntry(e));
  return {
    rows,
    /* ① 목록에 있는데 **화면이 안 뜨는** 항목 (🧱 수비가 여기 걸립니다 — 빈 칸이 떠요) */
    blank: rows.filter((r) => !r.drew),
    /* ② 화면은 떴는데 **목록의 이름이 판의 이름과 다른** 항목
     *    🔑 「이름이 같다」가 아니라 「**판이 스스로 말하는 이름**을 목록이 쓴다」예요 —
     *       `WORDS`가 바뀌면 목록도 같이 바뀌어야 합니다. */
    misname: rows.filter((r) => r.drew && r.realTitle
      && r.realTitle.indexOf(r.name) < 0 && r.text.indexOf(r.name) < 0),
    /* ③ 설명글에 **폐기한 낱말**이 남은 항목 */
    banned: rows.flatMap((r) => BAN.filter((b) => r.desc.indexOf(b) >= 0).map((b) => `${r.id}: 「${b}」`)),
  };
}
const okOf = (v) => v.rows.length > 0 && v.blank.length === 0
  && v.misname.length === 0 && v.banned.length === 0;

async function main() {
  console.log("── 🖥️ W. 확인 페이지의 ⚽ 미니게임 칸 — 목록이 실제 판과 맞는가 ──");
  const html = fs.readFileSync(CHECK, "utf8");
  const list = listFrom(html);

  /* ══════ W-0. 목록을 실제로 뜯어왔는가 (빈 목록 위에서 조용히 통과하지 못하게) ══════ */
  check(Array.isArray(list) && list.length > 0
    && list.every((e) => e.id && e.kind && e.name),
    `W-0. 🚪 \`_check.html\`에서 \`W2M_LIST\`를 뜯었다 — ${list.length}종`
    + `\n     🔎 측정 조건 — 이게 빨간불이면 아래 문장들은 **빈 목록 위에서 조용히 통과**합니다`
    + `\n     ${list.map((e) => `${e.emoji || ""}${e.id}(${e.kind})`).join(" · ")}`);

  /* ══════ W-1. 목록의 모든 항목이 실제로 판을 열고, 이름이 맞는가 ══════ */
  const v = await judge(list);
  check(okOf(v),
    `W-1. 🎮 **목록의 ${list.length}종이 전부 판을 열고, 판이 스스로 말하는 이름을 쓴다**`
    + `\n     🔎 측정 조건 — \`_check.html\`이 부르는 그대로 \`play(box, { kind, moment: id, … })\`를`
    + ` 부르고 그려진 조각을 셉니다. 이름은 \`W2Moment.WORDS[kind].title\`과 대조해요(베껴 적지 않았습니다)`
    + `\n     ${v.rows.map((r) => `${r.id}: ${r.drew ? `칸 ${r.cells} · 판 이름 「${r.realTitle}」` : "🔴 **화면 0조각**"}`).join("\n     ")}`
    + (okOf(v) ? "" :
      (v.blank.length ? `\n     🔴 **빈 칸이 뜹니다** — ${v.blank.map((r) => `${r.id}(kind ${r.kind})`).join(" · ")}`
        + `\n        🧱 수비는 판이 없습니다(117번 §6 c안). 목록에 남아 있으면 확인 페이지에서`
        + ` **아무것도 안 그려진 칸 + 「조작 성공도 s 0.500」**만 뜹니다 — «고장 났나?»로 읽혀요` : "")
      + (v.misname.length ? `\n     🔴 **화면과 이름이 어긋납니다** — ${v.misname.map((r) => `${r.id}: 목록 「${r.name}」 vs 판 「${r.realTitle}」`).join(" · ")}`
        + `\n        🔑 \`play()\`가 **모르는 kind를 ⚽ 결정으로 떨어뜨려서** 에러 없이 골문 판이 뜹니다.`
        + ` 그래서 **아무도 안 죽고 설명만 딴소리**를 해요` : "")
      + (v.banned.length ? `\n     🔴 **폐기한 낱말이 설명에 남았습니다** — ${v.banned.join(" · ")}` : "")));

  /* ══════════════════════════════════════════════════════════════════════
   * 🧪 자가 검증 — **기준선이 빨간불일 때 변이 검증이 성립하지 않아서** 붙였습니다
   * ══════════════════════════════════════════════════════════════════════
   * 🔑 빨간불인 검사는 **남의 변이 신호까지 먹습니다.** 그래서 「변이를 걸면 빨간불」이
   *    아니라 **「고치면 초록불이 되는가」**를 먼저 찍어요 — 그게 이 문장이 정말로
   *    무언가를 보고 있다는 증거이고, 동시에 **고칠 목록을 그대로 보여 줍니다.**
   * 🔒 디스크는 안 건드립니다 — **읽어 온 값에만** 넣습니다. */
  {
    /* ✅ 고친 목록 — 🥅 하나. 🧱 수비는 판이 없어서 여기 없는 게 맞습니다 */
    const FIXED = [
      { id: "oneone", emoji: "🥅", name: "일대일 슈팅", kind: "goal",
        desc: "🧤 키퍼가 미끄러진 반대쪽 — 가장 밝은 칸으로 차요", foot: true },
      { id: "cutback", emoji: "⚡", name: "컷백 연결", kind: "assist",
        desc: "🧤 키퍼가 비운 쪽으로 굴려 주면 동료가 밀어 넣어요", foot: true },
    ];
    const good = await judge(FIXED);
    check(okOf(good),
      `W-2. 🧪 **고친 목록을 넣으면 초록불이 된다** (${FIXED.length}종 · 디스크는 안 건드렸습니다)`
      + `\n     🔑 이게 초록불이라야 W-1의 빨간불이 «검사가 이상해서»가 아니라 «목록이 틀려서»입니다`
      + `\n     ✍️ **\`beta/_check.html\`의 \`W2M_LIST\`를 이 두 줄로 바꾸면 됩니다:**`
      + `\n     ${FIXED.map((e) => `{ id: "${e.id}", emoji: "${e.emoji}", name: "${e.name}", kind: "${e.kind}", desc: "${e.desc}", foot: ${e.foot} },`).join("\n     ")}`
      + (okOf(good) ? "" : `\n     🔴 고친 목록도 통과를 못 합니다 — **검사 쪽을 먼저 보세요**`
        + `\n     🔴 빈 칸 ${good.blank.map((r) => r.id).join(",") || "없음"} · 이름 어긋남 ${good.misname.map((r) => r.id).join(",") || "없음"} · 폐기 낱말 ${good.banned.join(",") || "없음"}`));

    /* 🔴 망가뜨린 목록 셋 — **하나씩** 따로 겁니다(묶으면 어느 문장이 잡았는지 못 가려요) */
    const BREAK = [
      ["🧱 없는 판을 목록에 넣기", [{ id: "block", emoji: "🧱", name: "차단", kind: "defend", desc: "읽기", foot: false }]],
      ["🗣️ 판 이름과 다른 이름을 쓰기", [{ id: "oneone", emoji: "🏃", name: "컷인 돌파", kind: "goal", desc: "빈 곳으로 차요", foot: true }]],
      ["🚫 폐기한 낱말을 설명에 쓰기", [{ id: "oneone", emoji: "🥅", name: "일대일 슈팅", kind: "goal", desc: "갭이 코스 칸에 왔을 때", foot: true }]],
    ];
    for (const [why, lst] of BREAK) {
      const bad = await judge(lst);
      check(!okOf(bad), `W-2변이. 🧪 **${why}** → 빨간불`
        + (okOf(bad) ? `\n     🔴 **안 잡혔습니다 — W-1은 아무것도 안 지키고 있어요.** 검사를 고치세요` : ""));
    }
  }

  if (fail) {
    console.log(`\n📮 **engineer / director께** — \`beta/_check.html:803\`의 \`W2M_LIST\`입니다.`);
    console.log(`   🔴 저는 \`beta/\`를 안 고쳤습니다. W-2가 **넣을 두 줄을 그대로** 찍어 뒀어요.`);
    console.log(`   🔑 \`tests/check-page-test.js\`는 \`MG_MECHS\`(⚾🎤)만 봅니다 — ⚽ 칸을 보는 검사가`);
    console.log(`      **여기 말고는 없습니다.** 확인 페이지의 ⚽ 칸이 지금까지 아무 검사도 안 받았어요.`);
  }
  console.log(`\n${fail ? `❌ 빨간불 ${fail}건` : "✅ 전부 통과"} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.log("\n💥 검사가 죽었어요 — 이건 초록불도 빨간불도 아닙니다 (안 돈 겁니다)");
  console.log(`   ${e && e.stack ? e.stack : e}`);
  process.exit(2);
});
