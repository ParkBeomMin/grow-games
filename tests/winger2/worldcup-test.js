/* 🌍 ⚽ 더 윙어 II — 대표팀은 **유스를 안 탄다** (W-1 ~ W-4)
 *
 * 🔴 **이 파일이 생기기 전까지 `worldcup.js`를 실행하는 검사가 0종이었습니다.**
 *    engineer가 `myNation()`을 옛 형태(`MARKET_NATION[S.market]`)로 **정확히 되돌렸는데
 *    검사 16종 + `smoke-test` + `check-page-test`가 전부 초록불**이었어요
 *    (`90_engineer_kr-nation.md` §6). `youth-moment-test`가 파일명을 언급하지만
 *    그건 *"유스 순간 카드를 안 부르는지"* 를 보는 **부재 검사**라 로직을 안 돌립니다.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ═════════════════════════════════════════════════════════════════════════
 * (2026-08-31 · designer 87번 「🇰🇷 고정」 판정 · engineer 90번)
 *
 *   · 🇰🇷 **대표팀은 유스와 무관하게 대한민국 고정**입니다. 예전에는 유스 국적
 *     (`S.market`)이 대표팀을 정해서 *"강한 나라는 대회에서 유리한 만큼 들어가기가
 *     어렵다"* 는 고리가 있었는데, 그 고리를 **의도적으로 뺐어요**
 *   · 🚪 그래서 소집 문턱(`callBar`)의 **국가 항은 상수(−3.33)** 입니다.
 *     🔑 **문턱을 실제로 움직이는 건 「세대 흔들림」 하나뿐**이에요 — W-3이 그 하나를 지킵니다
 *   · 🔒 산식(`BAR_NAT_K` · `NAT_SPREAD`)은 **지우지 않고 남겨** 뒀습니다.
 *     되돌릴 자리를 없애지 않으려는 것이라, **값이 아니라 「유스 간 동일」이라는
 *     관계**로 재야 합니다
 *
 * ⚠️ **「유스 국적이 대표팀을 정한다」로 되돌리는 판정이 다시 나오면 W-1·W-2가
 *    통째로 옛 계약이 됩니다.** 그때는 값을 고치지 말고 이 파일을 먼저 여세요.
 * ⚠️ **`BAR_WOBBLE`을 없애자는 판정이 나오면 W-3이 뒤집힙니다** — 그건 "문턱이
 *    영영 고정"이라는 뜻이고, 지금 계약은 그 반대예요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱(국가 코드 "kr" · 유스 5곳 · 대회 해 3·7·11·15)은 여기 박습니다.**
 *      🔴 `NAT_MEAN`·`BAR_NAT_K`를 소스에서 읽어 기대값을 만들면 **상수를 바꿔도
 *      검사가 따라가서 아무것도 안 잡혀요.** W-2는 **값을 비교하지 않고**
 *      「유스 간 완전히 같다」는 **관계**로 잽니다 — 그러면 상수와 무관해집니다
 *   ③ **게임 입구를 통해** — 유스 5곳을 각각 실제 카드로 눌러 커리어를 만듭니다
 *   ④ **자기 자신과 비교하지 않습니다** — `myNation()`의 출력을 정답으로 삼지 않고,
 *      `"kr"`이라는 **박아 둔 값**과 대조해요
 *   ⑤ **변이가 지금 소스에 걸리는지 0번이 먼저** 확인합니다 (안 걸리면 ❌ 한 줄, 죽지 않아요)
 *
 * 🔑 **왜 W-1만으로는 부족한가** — `myNation`만 검사하면 **국적을 밖에서 다시
 *    끌어오는 우회**를 못 잡습니다. `callBar` 안에서 `MARKET_NATION[S.market]`을
 *    직접 집으면 `myNation()`은 여전히 🇰🇷를 답하는데 문턱만 유스별로 갈라져요.
 *    그래서 W-2가 **문턱 자체가 유스 간 완전히 같은지**를 따로 봅니다 (변이 W2로 확인).
 *
 * ⏱️ 약 25초 걸려요.
 */
"use strict";
const { bootPage, pageMutsOK, townAuto, passTown, seedBoth } = require("./_load.js");

let fail = 0;
const t0 = Date.now();
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };

/* ══════════════════════════════════════════════════════════════
 * 🔒 정답은 **여기** 있습니다 — 소스에서 안 읽어요
 * ══════════════════════════════════════════════════════════════ */
const MY_CODE = "kr";                 // 🇰🇷 대표팀은 유스와 무관하게 고정
const YOUTH_N = 5;                    // 🏟️ 유스 5곳 (동네를 지나면 5장이 전부 옵니다)
const WC_YEARS = [3, 7, 11, 15];      // 🌏 커리어 안의 대회 해 (4년 주기)

/* ══════════════════════════════════════════════════════════════
 * 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * ══════════════════════════════════════════════════════════════ */
const MUT = {
  /* 🔴 **W1 — 대표팀을 유스 국적으로 되돌립니다.** engineer가 넣었을 때
   *    검사 16종이 **전부 초록불**이었던 그 변이예요. */
  W1_OLD_NATION: { "worldcup.js": [[/const myNation = \(\) => MY_NATION;/,
    "const myNation = () => NATIONS.find((n) => n.c === MARKET_NATION[(S && S.market)]) || MY_NATION;"]] },
  /* 🔴 **W2 — `myNation`은 그대로 🇰🇷를 답하는데 문턱만 몰래 유스를 봅니다.**
   *    W-1은 **초록불로 남습니다** — 이게 "국적을 밖에서 다시 끌어오는 우회"예요. */
  W2_BYPASS: { "worldcup.js": [[/const y = year == null \? \(\(S && S\.proYear\) \|\| 1\) : year;\n    const nat = myNation\(\);/,
    "const y = year == null ? ((S && S.proYear) || 1) : year;\n    const nat = NATIONS.find((n) => n.c === MARKET_NATION[(S && S.market)]) || myNation();"]] },
  /* 🔴 **W3 — 세대 흔들림을 죽입니다.** 🇰🇷 고정 뒤로 문턱을 실제로 움직이는 건
   *    이것 **하나뿐**이라, 이게 죽으면 소집 문턱이 영영 고정입니다. */
  W3_NO_WOBBLE: { "worldcup.js": [[/const BAR_WOBBLE = 2;/, "const BAR_WOBBLE = 0;"]] },
  /* 🔴 **W4 — `myNation`이 세이브를 읽습니다.** 타이틀 화면처럼 `S`가 아직
   *    없는 자리에서 그 자리로 터져요. */
  W4_READS_S: { "worldcup.js": [[/const myNation = \(\) => MY_NATION;/,
    "const myNation = () => (S.market ? MY_NATION : MY_NATION);"]] },
};

{
  const bad = pageMutsOK(MUT);
  const n = Object.values(MUT).reduce((a, byFile) =>
    a + Object.values(byFile).reduce((b, m) => b + m.length, 0), 0);
  check(bad.length === 0,
    `0. 변이 정규식 ${n}개가 지금 beta/winger2/에 전부 걸린다`
    + (bad.length
      ? `\n     🔴 **안 걸린 것 ${bad.length}개 — 그 변이 검사는 지금 "안 도는" 상태입니다** (초록불이 아니에요)`
        + bad.map((b) => `\n       · ${b}`).join("")
      : ""));
}
const mutOK = (name) => pageMutsOK({ [name]: MUT[name] }).length === 0;
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해** 유스 5곳을 각각 눌러 봅니다
 * ══════════════════════════════════════════════════════════════ */
/* 🎲 시드는 `_load.js`의 `seedBoth`가 **갈라서** 겁니다 — 두 난수원(`Math.random` ·
 * `WingerEngine._t`)에 같은 시드를 걸면 앞 1,000개가 **1000/1000 일치**해서 보폭이
 * 맞아 lockstep이 나요 (109번 §4 · `seed-split-test.js`가 지킵니다). */
function boot(muts, seed) {
  const W = bootPage({ muts });
  seedBoth(W, seed == null ? 5 : seed);
  const D = W.document;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click */
  const press = (el, what) => {
    if (!el) throw new Error(`누를 버튼이 없어요 (${what}) — 화면이 예상과 달라졌습니다`);
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  return { W, D, press, WC: () => W.WingerWorldCup, S: () => W.__get("S"), close: () => W.close() };
}

/* 🏟️ 유스 i번째 카드를 눌러 커리어를 만듭니다 (타이틀 → 이름 → 자리 → 🏘️ 동네 → 제안 → 조립대). */
function careerAt(i, muts) {
  const h = boot(muts, 5);
  h.press(h.D.getElementById("btn-new"), "btn-new");
  h.press(h.D.getElementById("btn-name-next"), "btn-name-next");
  const back = townAuto(h.W);            // ⚠️ 📍 자리를 누르기 **전**에 켜야 해요
  h.press(h.D.querySelector('#position-list .card[data-pos="wg"]'), "📍 wg");
  passTown(h.W, h.press, back);
  const cards = Array.from(h.D.querySelectorAll("#agency-list button"));
  if (!cards[i]) { h.close(); throw new Error(`🏟️ 제안 카드가 ${cards.length}장뿐이에요 (${i + 1}번째를 눌러야 합니다)`); }
  h.press(cards[i], `🏟️ 유스 #${i}`);
  h.press(h.D.getElementById("btn-prospect-start"), "🧬 이 선수로 시작");
  const S = h.S(), WC = h.WC();
  const row = {
    idx: i, market: S && S.market,
    nation: WC && WC.myNation() ? WC.myNation().c : "(myNation 없음)",
    nationName: WC && WC.myNation() ? WC.myNation().name : "",
    bars: WC_YEARS.map((y) => WC.callBar(y)),
  };
  h.close();
  return row;
}
const scan = (muts) => Array.from({ length: YOUTH_N }, (_, i) => careerAt(i, muts));

/* ══════════════════════════════════════════════════════════════
 * W-1 · W-2. 🇰🇷 대표팀도 소집 문턱도 **유스를 안 탄다**
 * ══════════════════════════════════════════════════════════════ */
console.log("── 🇰🇷 W-1·W-2. 대표팀은 유스를 안 탄다 ──");
const R = scan(null);

/* 📊 측정 조건을 검사가 스스로 찍습니다 — 유스가 실제로 5곳 다 달라야
 *    W-1이 "다 같아서 통과"가 아니게 됩니다. */
{
  const mk = new Set(R.map((r) => r.market));
  check(mk.size === YOUTH_N,
    `W-0. 📊 유스 ${YOUTH_N}곳을 **각각 눌러** 서로 다른 커리어 ${mk.size}개를 만들었다`
    + `\n     ${R.map((r) => `#${r.idx}:${r.market}`).join(" · ")}`
    + (mk.size === YOUTH_N ? "" : `\n     🔴 유스가 ${mk.size}종뿐이에요 — W-1이 "다 같아서 통과"가 됩니다`));
}
{
  const bad = R.filter((r) => r.nation !== MY_CODE);
  check(bad.length === 0,
    `W-1. 🇰🇷 유스 ${YOUTH_N}곳 **전부**에서 대표팀이 "${MY_CODE}"다 (${R[0].nationName})`
    + `\n     ${R.map((r) => `${r.market}→${r.nation}`).join(" · ")}`
    + (bad.length ? `\n     🔴 유스 국적이 대표팀을 정하고 있어요: ${bad.map((r) => `${r.market}→${r.nation}`).join(", ")}` : ""));
}
{
  /* 🔑 **값이 아니라 관계로.** 문턱이 얼마인지는 안 봅니다 — 유스 간 **완전히 같은지**만 봐요.
   *    그래야 `BAR_NAT_K`·`NAT_MEAN`을 누가 바꿔도 이 검사가 계속 유효합니다. */
  const first = R[0].bars.join("/");
  const diff = R.filter((r) => r.bars.join("/") !== first);
  check(diff.length === 0,
    `W-2. 🚪 소집 문턱 \`callBar\`가 유스 ${YOUTH_N}곳에서 **완전히 같다** (${WC_YEARS.length}개 대회 해 전부)`
    + `\n     ${R.map((r) => `${r.market}:[${r.bars.join(",")}]`).join(" · ")}`
    + (diff.length
      ? `\n     🔴 유스마다 문턱이 달라요 — \`myNation\`이 🇰🇷를 답해도 **국적을 밖에서 다시 끌어오는 우회**가 있습니다`
      : `\n     🔑 값을 안 보고 「같은가」만 봅니다 — 상수를 바꿔도 이 계약은 그대로예요`));
}

/* ══════════════════════════════════════════════════════════════
 * W-3. 🎲 **세대 흔들림은 살아 있다** · W-4. 💾 `myNation`은 세이브를 안 읽는다
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🎲 W-3·W-4. 흔들림과 세이브 무의존 ──");
function noSave(muts) {
  const h = boot(muts, 5);
  const S = h.S();
  const out = { sIsNull: S == null };
  try {
    const WC = h.WC();
    out.nation = WC.myNation() ? WC.myNation().c : "(없음)";
    out.bars = WC_YEARS.map((y) => WC.callBar(y));
  } catch (e) {
    out.threw = String(e.message).slice(0, 80);
  }
  h.close();
  return out;
}
{
  const bars = R[0].bars;
  const uniq = new Set(bars);
  check(uniq.size > 1,
    `W-3. 🎲 대회 해 ${WC_YEARS.join("·")}시즌의 문턱이 **전부 같지는 않다** (세대 흔들림이 살아 있어요)`
    + `\n     ${WC_YEARS.map((y, i) => `${y}시즌:${bars[i]}`).join(" · ")} → 서로 다른 값 ${uniq.size}종`
    + (uniq.size > 1 ? `\n     🔑 🇰🇷 고정 뒤로 문턱을 실제로 움직이는 건 **이것 하나뿐**이에요` : ""));
}
{
  const n = noSave(null);
  check(n.sIsNull && !n.threw && n.nation === MY_CODE,
    `W-4. 💾 세이브가 **없는 자리(타이틀 화면)**에서도 \`myNation\`·\`callBar\`가 그대로 돈다`
    + `\n     S = ${n.sIsNull ? "null" : "(있음)"} · 대표팀 ${n.nation} · 문턱 [${(n.bars || []).join(",")}]`
    + (n.threw ? `\n     🔴 던졌어요 — ${n.threw}` : "")
    + (n.sIsNull ? "" : `\n     🔴 타이틀에서 S가 이미 있어요 — 이 검사가 아무것도 안 지킵니다`));
}

/* ══════════════════════════════════════════════════════════════
 * 🧪 변이 검증 — 고치기 전에 **빨간불이 뜨는지** 반드시 확인합니다
 *
 * 🔴 **기준선이 초록불인 걸 위에서 먼저 확인했습니다.** 이미 빨간불인 검사는
 *    남의 변이 신호까지 통째로 먹어요 (`91_engineer_hometown.md` §5).
 * ══════════════════════════════════════════════════════════════ */
console.log("\n── 🧪 변이 검증 (고치기 전에 빨간불이 뜨는지) ──");
if (fail) console.log(`   ⚠️ **기준선이 이미 ${fail}건 빨간불입니다** — 아래 변이 판정은 그 신호를 먹을 수 있어요.`);
else console.log(`   ✔ 기준선(무변이) 전부 초록불 — 아래 빨간불은 **변이가 만든 것**이 맞습니다.`);

/* 🧪 W1 — 유스 국적으로 되돌리기. W-1과 W-2가 **둘 다** 갈려야 합니다. */
if (!mutOK("W1_OLD_NATION")) check(false, `🧪 **변이 W1 — 대표팀을 유스 국적으로 되돌림**${MUT_DEAD}`);
else {
  const M = scan(MUT.W1_OLD_NATION);
  const off = M.filter((r) => r.nation !== MY_CODE);
  const bars = new Set(M.map((r) => r.bars.join("/")));
  check(off.length > 0 && bars.size > 1,
    `🧪 **변이 W1 — \`myNation\`을 \`MARKET_NATION[S.market]\`으로 되돌림** → W-1·W-2가 빨간불`
    + `\n     ${M.map((r) => `${r.market}→${r.nation}[${r.bars.join(",")}]`).join(" · ")}`
    + `\n     ${off.length ? `✔ 🇰🇷가 아닌 유스 ${off.length}곳 (W-1)` : "🔴 W-1이 아직 초록불"}`
    + ` · ${bars.size > 1 ? `✔ 문턱이 ${bars.size}갈래 (W-2)` : "🔴 W-2가 아직 초록불"}`);
}

/* 🧪 W2 — 우회. **W-1은 초록불로 남고 W-2만** 갈려야 합니다. */
if (!mutOK("W2_BYPASS")) check(false, `🧪 **변이 W2 — 문턱만 몰래 유스를 봄**${MUT_DEAD}`);
else {
  const M = scan(MUT.W2_BYPASS);
  const stillKr = M.every((r) => r.nation === MY_CODE);
  const bars = new Set(M.map((r) => r.bars.join("/")));
  check(stillKr && bars.size > 1,
    `🧪 **변이 W2 — \`myNation\`은 🇰🇷인데 \`callBar\`만 유스를 봄** → **W-2만** 빨간불`
    + `\n     ${M.map((r) => `${r.market}→${r.nation}[${r.bars.join(",")}]`).join(" · ")}`
    + `\n     ${stillKr ? "✔ W-1은 그대로 초록불" : "🔴 W-1까지 갈렸어요 — 우회 변이가 아니게 됐습니다"}`
    + ` · ${bars.size > 1 ? `✔ 문턱이 ${bars.size}갈래라 W-2가 잡습니다` : "🔴 **W-2가 우회를 못 잡아요** — W-1만으로는 이 자리가 비어 있습니다"}`);
}

/* 🧪 W3 — 세대 흔들림 죽이기. W-3이 갈려야 합니다. */
if (!mutOK("W3_NO_WOBBLE")) check(false, `🧪 **변이 W3 — 세대 흔들림을 0으로**${MUT_DEAD}`);
else {
  const n = noSave(MUT.W3_NO_WOBBLE);
  const uniq = new Set(n.bars || []);
  check(uniq.size === 1,
    `🧪 **변이 W3 — \`BAR_WOBBLE\`을 0으로** → W-3이 빨간불 (문턱 [${(n.bars || []).join(",")}] · 값 ${uniq.size}종)`
    + (uniq.size === 1 ? `\n     ✔ 대회 해 ${WC_YEARS.length}번이 전부 같은 값 — 문턱이 영영 고정입니다` : `\n     🔴 흔들림을 껐는데 아직 값이 갈려요 — W-3이 다른 걸 재고 있습니다`));
}

/* 🧪 W4 — `myNation`이 세이브를 읽게. W-4가 갈려야 합니다. */
if (!mutOK("W4_READS_S")) check(false, `🧪 **변이 W4 — \`myNation\`이 \`S\`를 읽게**${MUT_DEAD}`);
else {
  const n = noSave(MUT.W4_READS_S);
  check(!!n.threw || n.nation !== MY_CODE,
    `🧪 **변이 W4 — \`myNation\`이 \`S\`를 읽음** → W-4가 빨간불`
    + `\n     ${n.threw ? `✔ 타이틀에서 그 자리로 던졌어요 — ${n.threw}` : `🔴 아직 멀쩡히 ${n.nation}을 답해요 — W-4가 아무것도 안 지킵니다`}`);
}

/* ---------- 마무리 ---------- */
console.log(`\n⏱ ${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`\n❌ ${fail}건 실패`); process.exit(1); }
console.log("\n✅ 통과");
process.exit(0);
