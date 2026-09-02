/* ⚽ 더 윙어 II — 📊 등급(F~S) · XP 바 · 승급 카드
 *
 * 🔴 **이 파일이 생기기 전까지 이 자리는 무방비였습니다.**
 *    engineer가 원칙 ⑩으로 변이 넷을 실제 소스에 넣고 돌렸는데 **셋이 안 잡혔어요**
 *    (`71_engineer_grade-xp.md` §7):
 *
 *      · 등급 판정을 죽여 **모든 능력치가 영원히 F**  → 검사 10종 전부 초록불
 *      · `W2Grade.tick` 제거 — **승급 카드가 영영 안 뜸** → 전부 초록불
 *      · 유망주 카드 등급의 자를 바꿔 **여섯 칸 전부 F** → 전부 초록불
 *
 *    넷째(`index.html`에서 grade.js 제거)만 `wiring-test`가 잡았는데,
 *    **잡은 이유가 등급이 아니라 `sw.js` 정합성**이었습니다. 같이 지웠으면 넷 다 초록불이에요.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 메우는 넷 (engineer §7의 검사 1~4)
 *   B·C  등급이 **실제로 오른다** — 경계 여섯을 **이 파일에 직접 적어서**
 *   D    승급하면 **카드가 뜬다** (한 턴에 두 칸이 올라도 **한 장에 두 줄**)
 *   E    🧬 조립대의 등급이 **정점 기준값**에서 나온다 (지금 실력이 아니라)
 *   F    XP 바가 **구간 안의 위치**다 — `v/100`이 아니라 **톱니**
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔒 이 파일이 지키는 다섯
 * ─────────────────────────────────────────────────────────────────────────
 *   ① 직접 eval 안 씀 — `bootPage`가 `new Function(...)` + `return`이에요
 *   ② **문턱은 여기 박습니다.** 경계 40/58/74/90/108/128을 `GRADES`에서 읽어 오면
 *      **표를 바꿔도 검사가 따라가서 아무것도 안 잡혀요** (이 저장소가 데인 형태)
 *   ③ **자기 자신과 비교하지 않습니다.** `W2Grade.of()`의 출력을 정답으로 삼으면
 *      등급표를 통째로 갈아도 안 잡혀요. 정답은 **이 파일의 BOUND/LAB**입니다
 *   ④ **게임 입구를 통해** — 새 게임 → ✏️ 이름 → 🏟️ 유스 → 🎯 포지션 → 🧬 조립대 →
 *      입단 → 훈련 버튼. 실기기 순서 그대로(pointerdown → pointerup → click)
 *   ⑤ **시드 하나로 안 잽니다** — 훈련 성장량이 재능·유스·컨디션 배수를 타요
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🌍 **이 검사가 성립하는 세계** — 전제가 바뀌면 여기부터 다시 보세요
 * ─────────────────────────────────────────────────────────────────────────
 *   · 등급은 **7단계**이고 경계는 40/58/74/90/108/128입니다 (설계 §7-3 · 갈래 F)
 *   · 🗑️ **± 세분 19단계는 폐기됐습니다.** 폐기 이유가 **이름이 아니라 형태**예요 —
 *     *"세분하되 폭을 좀 넓히자"도 같은 형태의 부활입니다. 세분 자체가 폐기입니다.
 *     그래서 B-2는 **경계가 정확히 여섯 개**임을 보고, F-3/F-4는 designer 폐기 이유 ②를
 *     그대로 잽니다 — *"폭 5~7에서는 훈련 한 번이 31~84%. 바가 아니라 스위치였다"*
 *   · 등급을 매기는 값은 **정점 기준값(`S.stats` · `card.stats`)**이지
 *     지금 실력(`nowStats`/`cardShown`)이 아닙니다
 *
 *   ⚠️ 세분을 **되살리기로 판정이 바뀌면** B-2 · F-3 · F-4가 먼저 뒤집힙니다.
 *      그때 이 파일을 고치세요 — 값이 아니라 **어느 세계의 문장인지**가 바뀌는 겁니다.
 *
 * ⏱️ 약 15초.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { bootPage, pageMutsOK, PAGE_DIR, townAuto, passTown } = require("./_load.js");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail += 1; };
const info = (msg) => console.log(`ℹ️  ${msg}`);

/* ══════════════════════════════════════════════════════════════
 * 🔒 **정답표는 여기 있습니다** — 소스에서 안 읽어요
 *
 * `GRADES`에서 읽으면 `min: 40`을 `min: 400`으로 바꿔도 검사가 따라갑니다.
 * 산식은 소스에서 뜯고, **문턱은 검사에 박습니다** — 방향이 반대예요.
 * ══════════════════════════════════════════════════════════════ */
const BOUND = [40, 58, 74, 90, 108, 128];
const LAB = ["F", "E", "D", "C", "B", "A", "S"];
const tblRank = (v) => { const n = Math.round(v); let i = 0; while (i < BOUND.length && n >= BOUND[i]) i += 1; return i; };
const tbl = (v) => LAB[tblRank(v)];

/* 🧪 이 파일이 쓰는 변이 전부 — 0번이 먼저 소스와 대조합니다.
 * (안 걸리면 `bootPage`가 던져 파일이 그 자리에서 죽어요. 이 저장소에서 세 번 난 사고입니다.) */
const SUB19 = [["F−", 0], ["F", 14], ["F+", 27], ["E−", 40], ["E", 46], ["E+", 52],
  ["D−", 58], ["D", 64], ["D+", 69], ["C−", 74], ["C", 80], ["C+", 85],
  ["B−", 90], ["B", 96], ["B+", 102], ["A−", 108], ["A", 115], ["A+", 122], ["S", 128]];
const MUT = {
  /* 🔴 등급 판정을 죽임 — 무슨 값이 와도 F. engineer가 돌렸을 때 **10종 전부 초록불**이었어요 */
  GRADE_DEAD: { "grade.js": [[/ {4}let i = 0;\n {4}while \(i \+ 1 < GRADES\.length && n >= GRADES\[i \+ 1\]\.min\) i \+= 1;\n {4}return i;/,
    "    return 0;"]] },
  /* 🔴 승급 감지 제거 — 카드가 영영 안 뜸 */
  NO_TICK: { "game.js": [[/ {2}if \(window\.W2Grade\) W2Grade\.tick\(S, STAT_DEFS, POS_INFO\[S\.pos\]\.stat\);/,
    "  /* 🧪 변이: 승급 감지 제거 */"]] },
  /* 🔴 유망주 카드 등급의 자를 **지금 실력**으로 — 열여덟의 곡선이 0.56~0.84라 3장 전부 F */
  CARD_SHOWN: { "prospect.js": [[/const g = W2Grade\.of\(card\.stats\[d\.key\]\);/,
    "const g = W2Grade.of(cardShown(card)[d.key]);"]] },
  /* 🔴 XP 바를 옛 `v/100` 막대로 — 승급해도 안 줄고 계속 올라가기만 합니다 */
  XP_V100: { "grade.js": [[/style="width:\$\{g\.pct\.toFixed\(1\)\}%"/,
    'style="width:${Math.min(100, g.shown).toFixed(1)}%"']] },
  /* 🔴 경계 하나만 옮김 — `GRADES`에서 문턱을 읽어 오는 검사는 이걸 절대 못 잡아요 */
  MIN400: { "grade.js": [[/\{ label: "E", min: 40 \},/, '{ label: "E", min: 400 },']] },
  /* 🔴 **폐기된 ± 세분 19단계를 되살림** — 이름이 아니라 형태입니다.
   *    경계가 여섯이 아니라 열여덟이 되고, 훈련 한 번이 바의 절반을 넘겨요 */
  SUBDIVIDE: { "grade.js": [[/ {2}const GRADES = \[\n(?: {4}\{ label: "[FEDCBAS]", min: \d+ \},[^\n]*\n)+ {2}\];/,
    "  const GRADES = [\n" + SUB19.map(([l, m]) => `    { label: ${JSON.stringify(l)}, min: ${m} },`).join("\n") + "\n  ];"]] },
  /* 🔴 grade.js가 아예 안 실린 것과 같은 상태 (index.html에서 태그를 지운 것과 같아요) */
  GRADE_ABSENT: { "grade.js": [[/^window\.W2Grade = \(\(\) => \{/m, "window.__gradeGone = (() => {"]] },
};

/* ══════════════════════════════════════════════════════════════
 * 🔎 0. 변이 정규식이 지금 소스에 걸리나 — 다른 무엇보다 먼저
 *
 * 정규식이 구현 변경에 죽으면 "실패 1건"으로만 보여서 *안 돈 것*과 *빨간불*이
 * 구분이 안 됩니다. 이 저장소에서 세 번 났어요.
 * ══════════════════════════════════════════════════════════════ */
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

/* 🧪 변이 하나가 **지금 소스에 걸리는지** 그 자리에서 다시 확인합니다.
 * 안 걸리면 `bootPage`가 던져 파일이 💥로 죽어요 — 그러면 *안 돈 것*과 *빨간불*이
 * 구분이 안 됩니다. 여기서는 **죽지 않고 ❌ 한 줄**로 뜨게 합니다. */
const mutRun = (name, fn) => (pageMutsOK({ [name]: MUT[name] }).length ? null : fn());
const MUT_DEAD = `\n     🔴 **이 변이가 지금 소스에 안 걸립니다 — 이 변이 검사는 "안 돈" 상태예요** (초록불이 아닙니다)`;

/* ══════════════════════════════════════════════════════════════
 * 🕹️ 드라이버 — **게임 입구를 통해서만** 화면에 닿습니다
 * ══════════════════════════════════════════════════════════════ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boot(seed, muts) {
  const W = bootPage(muts ? { muts } : undefined);
  /* 🎲 시드를 박아 재현합니다. **한 시드로는 안 재요** — 호출하는 쪽이 여러 개 돌립니다 */
  W.Math.random = mulberry32(seed);
  const D = W.document;
  /* 🖱️ 실기기 이벤트 순서 그대로 — pointerdown → pointerup → click.
   *    하나만 보내던 검사가 24개 케이스를 놓친 전례가 있어요. */
  const press = (el) => {
    if (!el) throw new Error("누를 버튼이 없어요 — 화면이 예상과 달라졌습니다");
    for (const type of ["pointerdown", "pointerup", "click"]) {
      const Ev = W.PointerEvent || W.MouseEvent;
      el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true }));
    }
  };
  const active = () => (D.querySelector(".screen.active") || {}).id;
  return { W, D, press, active, close: () => W.close() };
}

/* 🚪 타이틀 → ✏️ 이름·🦶 주발 → 📍 자리 → 🏘️ 동네 3장 → 🏟️ 입단 제안 → 🧬 조립대
 * ⚠️ 2026-08-31에 **🏘️ 동네가 들어오면서 순서가 바뀌었습니다** (85번 「순-B」) —
 *    유스가 「고르는 화면」에서 「제안받는 화면」이 되어 **자리 뒤로** 갔어요.
 *    `#agency-list`는 동네를 지나야 채워집니다(`showOffers` → `renderMarkets`). */
function toBench(h) {
  h.press(h.D.getElementById("btn-new"));
  h.press(h.D.getElementById("btn-name-next"));
  const back = townAuto(h.W);
  h.press(h.D.querySelector("#position-list .card[data-pos]"));
  passTown(h.W, h.press, back);
  h.press(h.D.querySelector("#agency-list button, .agency-card, [data-market]"));
  return h;
}
/* 🧬 조립대 → 입단 → 🏠 유스 능력치 화면
 * ⚠️ 3택 카드(`.prospect-card`)와 이름 화면의 `btn-start`가 **둘 다 사라졌습니다** —
 *    이제 조립대의 [이 선수로 시작] 한 번이면 끝이에요. */
function toMain(h) {
  h.press(h.D.getElementById("btn-prospect-start"));
  return h;
}

/* 🖥️ 화면이 **찍고 있는 것**만 읽습니다 — W2Grade에 물어보지 않아요 */
function readRows(h) {
  const defs = h.W.__get("STAT_DEFS");
  const out = {};
  Array.from(h.D.querySelectorAll("#stats-box .stat-row")).forEach((r, i) => {
    const d = defs[i];
    if (!d) return;
    const gEl = r.querySelector(".stat-grade");
    const bEl = r.querySelector(".bar-fill.xp");
    out[d.key] = {
      grade: gEl ? gEl.textContent.trim() : null,
      width: bEl ? parseFloat(bEl.style.width) : null,
      val: parseInt(r.querySelector(".stat-val").textContent, 10),
    };
  });
  return out;
}

/* 36턴을 실제 버튼으로 굴립니다.
 * ⚠️ 대회일(`S.pendingStage`)에는 훈련 버튼이 잠겨요. **평가전은 화면만 건너뜁니다** —
 *    `finishEval`은 명성·돈만 만지고 `S.stats`를 안 건드리거든요 (engineer §6).
 *    등급은 `S.stats`에서만 나오니 이 건너뜀이 재는 값을 안 바꿉니다. */
function career(h, style, turns) {
  const defs = h.W.__get("STAT_DEFS");
  const S = h.W.__get("S");
  const main = h.W.__get("POS_INFO")[S.pos].stat;
  const acc = { main, fills: [], ups: [], downs: [], mismatch: [], samples: 0, turns: 0,
    cardless: 0, extraCards: 0, cardsSeen: 0, labelChanges: 0 };
  for (let t = 0; t < (turns || 36); t++) {
    if (S.pendingStage) {
      S.pendingStage = null;
      h.W.__get("advanceMonth")();
      h.W.__get("renderMain")();
    }
    const key = style === "main" ? main : defs[t % defs.length].key;
    const btn = h.D.querySelector(`#action-list .action-btn[data-key="${key}"]`);
    if (!btn || btn.disabled) break;
    const before = readRows(h);
    const cardsBefore = h.D.querySelectorAll(".grade-up-card").length;
    h.press(btn);
    acc.turns += 1;
    if (h.active() !== "screen-main") break;
    const after = readRows(h);
    const newCards = Array.from(h.D.querySelectorAll(".grade-up-card")).slice(cardsBefore);
    let upsThisTurn = 0;
    for (const d of defs) {
      const a = after[d.key], b = before[d.key];
      if (!a || !b) continue;
      acc.samples += 1;
      /* 🔒 화면의 글자 ↔ **같은 줄 숫자에 이 파일의 표를 대 본 글자** */
      if (a.grade !== tbl(a.val)) acc.mismatch.push(`${d.key} ${a.val} → 화면 "${a.grade}" · 표 "${tbl(a.val)}"`);
      if (a.grade !== b.grade) acc.labelChanges += 1;
      if (a.grade === b.grade) {
        if (a.val > b.val && a.width != null && b.width != null) acc.fills.push(a.width - b.width);
        continue;
      }
      const rec = { key: d.key, main: d.key === main, from: b.grade, to: a.grade,
        vb: b.val, va: a.val, wb: b.width, wa: a.width, cards: newCards.length };
      if (LAB.indexOf(a.grade) > LAB.indexOf(b.grade)) { acc.ups.push(rec); upsThisTurn += 1; }
      else acc.downs.push(rec);
    }
    acc.cardsSeen += newCards.length;
    if (upsThisTurn > 0) {
      if (newCards.length === 0) acc.cardless += 1;
      if (newCards.length > 1) acc.extraCards += 1;
      const last = newCards[newCards.length - 1];
      if (last) {
        acc.ups[acc.ups.length - 1].rows = last.querySelectorAll(".gu-row").length;
        acc.ups[acc.ups.length - 1].hasMain = last.classList.contains("has-main");
        acc.ups[acc.ups.length - 1].cardFrom = Array.from(last.querySelectorAll(".gu-from")).map((x) => x.textContent);
        acc.ups[acc.ups.length - 1].cardTo = Array.from(last.querySelectorAll(".gu-to")).map((x) => x.textContent);
        acc.ups[acc.ups.length - 1].mainRows = last.querySelectorAll(".gu-row.gu-main").length;
      }
    }
  }
  return acc;
}

const SEEDS = [11, 23, 37, 51, 73];
function careers(style, muts, seeds, turns) {
  const all = { fills: [], ups: [], downs: [], mismatch: [], samples: 0, turns: 0,
    cardless: 0, extraCards: 0, cardsSeen: 0, labelChanges: 0, runs: 0, maxRank: 0,
    upsPerRun: [], changesPerRun: [] };
  for (const s of (seeds || SEEDS)) {
    const h = toMain(toBench(boot(s, muts)));
    const r = career(h, style, turns);
    all.fills = all.fills.concat(r.fills);
    all.ups = all.ups.concat(r.ups);
    all.downs = all.downs.concat(r.downs);
    all.mismatch = all.mismatch.concat(r.mismatch);
    all.samples += r.samples; all.turns += r.turns;
    all.cardless += r.cardless; all.extraCards += r.extraCards;
    all.cardsSeen += r.cardsSeen; all.labelChanges += r.labelChanges;
    all.runs += 1;
    all.upsPerRun.push(r.ups.filter((u) => u.main).length);
    all.changesPerRun.push(r.labelChanges);
    const rows = readRows(h);
    all.maxRank = Math.max(all.maxRank, ...Object.values(rows).map((x) => LAB.indexOf(x.grade)));
    h.close();
  }
  return all;
}
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const qtl = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

/* ══════════════════════════════════════════════════════════════
 * A. 🔌 등록 정합성 — grade.js가 **페이지에도 캐시에도** 올라와 있나
 *
 * 🔇 조용히 실패하는 자리예요. `sw.js` ASSETS에 빠지면 **오프라인에서만** 깨지고,
 *    `index.html`에서 빠지면 오류 하나 없이 **등급·XP·승급이 통째로 사라집니다.**
 * ══════════════════════════════════════════════════════════════ */
{
  const HTML = fs.readFileSync(path.join(PAGE_DIR, "index.html"), "utf8");
  const SW = fs.readFileSync(path.join(PAGE_DIR, "sw.js"), "utf8");
  const srcs = Array.from(HTML.matchAll(/<script src="([^"]+)"><\/script>/g)).map((m) => m[1]);
  const at = (f) => srcs.indexOf(f);
  check(at("grade.js") >= 0, `A-1. 🔌 index.html이 **grade.js를 받는다** (없으면 등급이 화면에서 통째로 사라져요)`);
  /* game.js·career.js·prospect.js가 그릴 때 `window.W2Grade`를 봅니다 — 뒤에 실리면 못 봐요 */
  const after = ["game.js", "career.js", "prospect.js"].filter((f) => at(f) >= 0 && at(f) < at("grade.js"));
  check(at("grade.js") >= 0 && after.length === 0,
    `A-2. 🔌 grade.js가 **game.js · career.js · prospect.js보다 앞**에 실린다`
    + (after.length ? ` — 뒤에 있는 것: ${after.join(", ")} (그리는 순간 window.W2Grade가 없어요)` : ""));
  const am = SW.match(/const ASSETS = \[([\s\S]*?)\];/);
  const assets = am ? Array.from(am[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]) : [];
  check(assets.indexOf("./grade.js") >= 0,
    `A-3. 🔌 sw.js ASSETS에 **./grade.js**가 있다 (빠지면 온라인은 멀쩡하고 **오프라인에서만** 깨져요)`);

  /* ℹ️ 다른 세션이 만드는 중인 파일 — 아직 어디에도 등록 전이라 **여기서는 안 셉니다.**
   *    (등록되면 wiring-test A가 양방향으로 잡아요) */
  for (const f of ["focus.js", "vendor"]) {
    if (fs.existsSync(path.join(PAGE_DIR, f)) && at(f) < 0) {
      info(`${f} 는 index.html·sw.js에 아직 없습니다 — **다른 세션 작업 중**이라 이 검사에서 뺐어요`);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
 * B. 📊 검사 1 — 등급표가 **7단계**, 경계가 **정확히 40/58/74/90/108/128**
 *
 * 🔒 정답은 위의 `BOUND`/`LAB`입니다. `W2Grade.GRADES`를 안 읽어요 —
 *    읽으면 `min: 40`을 `min: 400`으로 바꿔도 검사가 따라갑니다.
 * 🗑️ B-2가 **± 세분 19단계 부활을 형태로** 잡습니다. 이름을 뭐라 붙이든
 *    경계가 여섯이 아니면 빨간불이에요.
 * ══════════════════════════════════════════════════════════════ */
{
  const h = boot(1);
  const G = h.W.W2Grade;
  check(!!G && h.W.__errs.length === 0,
    `B-0. 📊 페이지가 오류 없이 뜨고 **window.W2Grade가 있다**`
    + (G ? "" : " — grade.js가 안 실렸거나 전역을 안 만듭니다")
    + (h.W.__errs.length ? ` — ${h.W.__errs[0]}` : ""));

  if (G) {
    /* B-1. 0~200 전 구간에서 화면이 쓰는 그 함수가 이 파일의 표와 **한 칸도 안 어긋난다** */
    const bad = [];
    for (let v = 0; v <= 200; v++) if (G.label(v) !== tbl(v)) bad.push(`${v}: "${G.label(v)}" ≠ "${tbl(v)}"`);
    check(bad.length === 0,
      `B-1. 📊 0~200 **201개 값 전부**가 이 파일의 경계표와 같다`
      + (bad.length ? `\n     🔴 어긋난 값 ${bad.length}개 — 예: ${bad.slice(0, 4).join(" · ")}` : ` (${LAB.join(" ")})`));

    /* B-2. 🗑️ **경계가 정확히 여섯 개** — 세분을 형태로 잡는 자리 */
    const sw = [];
    for (let v = 1; v <= 200; v++) if (G.label(v) !== G.label(v - 1)) sw.push(v);
    check(sw.length === BOUND.length && sw.every((v, i) => v === BOUND[i]),
      `B-2. 🗑️ 등급이 바뀌는 지점이 **정확히 여섯**이고 [${BOUND.join(" ")}]이다 — 실제 [${sw.join(" ")}]`
      + (sw.length === BOUND.length ? "" :
        `\n     🔴 **± 세분 19단계는 폐기됐습니다** — 이름이 아니라 **형태**가 폐기예요.`
        + `\n        "세분하되 폭을 좀 넓히자"도 같은 형태의 부활입니다 (grade.js 주석 · designer 갈래 F)`));

    /* B-3. 등급 이름이 일곱 개, 그 순서 그대로 */
    const labs = [];
    for (let v = 0; v <= 200; v++) { const l = G.label(v); if (labs[labs.length - 1] !== l) labs.push(l); }
    check(labs.length === LAB.length && labs.every((l, i) => l === LAB[i]),
      `B-3. 📊 등급 이름이 **${LAB.join(" → ")}** 일곱 개다 — 실제 [${labs.join(" ")}]`);

    /* B-4. 경계 **바로 아래/위**가 서로 다른 등급 (오프바이원 — `>=`를 `>`로 바꾸면 여기가 먼저 웁니다) */
    const off = BOUND.filter((b) => G.label(b - 1) === G.label(b) || G.label(b) !== LAB[BOUND.indexOf(b) + 1]);
    check(off.length === 0,
      `B-4. 📊 경계값이 **그 등급의 첫 칸**이다 — ${BOUND.map((b) => `${b - 1}=${G.label(b - 1)}/${b}=${G.label(b)}`).join(" · ")}`);

    /* B-5. 등급을 매기는 자가 **화면에 찍히는 정수**와 같다 (소수로 재면 39.6이 F, 화면은 40) */
    check(G.label(39.6) === G.label(40) && G.label(39.4) === G.label(39),
      `B-5. 📊 **화면에 찍히는 정수(Math.round)**로 매긴다 — 39.6 → ${G.label(39.6)} · 39.4 → ${G.label(39.4)}`);
  }
  h.close();
}

/* 🧪 B 변이 — 넷 다 빨간불이 떠야 합니다 */
function tableProbe(muts) {
  const h = boot(1, muts);
  const G = h.W.W2Grade;
  if (!G) { h.close(); return { absent: true, bad: 201, sw: [] }; }
  let bad = 0;
  for (let v = 0; v <= 200; v++) if (G.label(v) !== tbl(v)) bad += 1;
  const sw = [];
  for (let v = 1; v <= 200; v++) if (G.label(v) !== G.label(v - 1)) sw.push(v);
  h.close();
  return { absent: false, bad, sw };
}
{
  const dead = mutRun("GRADE_DEAD", () => tableProbe(MUT.GRADE_DEAD));
  check(!!dead && dead.bad > 0,
    `B-변이1. 등급 판정을 죽이면(전부 F) → 빨간불`
    + (dead ? ` (어긋난 값 ${dead.bad}/201 · 경계 ${dead.sw.length}개)` : MUT_DEAD));
  const m400 = mutRun("MIN400", () => tableProbe(MUT.MIN400));
  check(!!m400 && m400.bad > 0,
    `B-변이2. 경계 하나만 40 → 400으로 옮기면 → 빨간불`
    + (m400 ? ` (어긋난 값 ${m400.bad}/201)` : MUT_DEAD));
  const sub = mutRun("SUBDIVIDE", () => tableProbe(MUT.SUBDIVIDE));
  check(!!sub && sub.sw.length !== BOUND.length,
    `B-변이3. 🗑️ **± 세분 19단계를 되살리면** → 빨간불`
    + (sub ? ` (경계가 ${sub.sw.length}개 · 여섯이어야 해요)` : MUT_DEAD));
  const gone = mutRun("GRADE_ABSENT", () => tableProbe(MUT.GRADE_ABSENT));
  check(!!gone && gone.absent,
    `B-변이4. grade.js가 안 실린 것과 같은 상태면 → 빨간불`
    + (gone ? ` (window.W2Grade 없음)` : MUT_DEAD));
}

/* ══════════════════════════════════════════════════════════════
 * C. 🏋️ 검사 1(계속) — **게임 입구를 통해** 등급이 실제로 오른다
 *
 * 새 게임 → 에이전시 → 포지션 → 유망주 → 이름 → 입단 → 주 스탯 훈련 36턴 × 5시드.
 * 화면이 찍는 글자를 **같은 줄의 숫자**에 이 파일의 표를 대 봐서 검사합니다.
 * ══════════════════════════════════════════════════════════════ */
const MAIN = careers("main");
{
  check(MAIN.turns >= 5 * 25 && MAIN.samples > 0,
    `C-0. 🏋️ 5시드 × 36턴을 실제 버튼으로 굴렸다 (${MAIN.turns}턴 · 표본 ${MAIN.samples}칸)`);

  check(MAIN.mismatch.length === 0,
    `C-1. 🏋️ 화면의 등급 글자가 **같은 줄의 숫자**와 늘 맞는다 — ${MAIN.samples}칸 전부`
    + (MAIN.mismatch.length ? `\n     🔴 어긋난 것 ${MAIN.mismatch.length}건 — 예: ${MAIN.mismatch.slice(0, 3).join(" · ")}` : ""));

  /* 🔒 「주 스탯 승급 3~6회」는 designer 목표 「가」(실측 3.42)입니다.
   *    문턱은 **실측 옆에 붙이지 않고** 밴드로 잡았어요 —
   *    아래는 죽은 판정(0회), 위는 세분 부활(19단계 실측 10.25회)을 가릅니다. */
  const perRun = avg(MAIN.upsPerRun);
  const mainUps = MAIN.ups.filter((u) => u.main).length;
  check(perRun >= 2.0 && perRun <= 7.0,
    `C-2. 🏋️ 주 스탯 승급이 커리어당 **2.0~7.0회** — 실측 ${perRun.toFixed(2)}회 (판별 ${MAIN.upsPerRun.join("/")} · 총 ${mainUps}회)`
    + `\n     👉 designer 목표 「가」는 3~6회(실측 3.42)예요. 아래(0회)는 등급 판정이 죽은 것,`
    + `\n        위는 구간이 촘촘해진 것입니다. 🗑️ 세분 부활은 B-2(경계 개수)·F-3(바 폭)이 정면으로 잡아요`);

  /* 승급은 **한 칸씩 순서대로** — 건너뛰면 표가 어긋난 겁니다 */
  const skip = MAIN.ups.filter((u) => LAB.indexOf(u.to) - LAB.indexOf(u.from) !== 1);
  check(MAIN.ups.length > 0 && skip.length === 0,
    `C-3. 🏋️ 승급이 **한 칸씩 순서대로** 오른다 (${MAIN.ups.length}건)`
    + (skip.length ? ` — 건너뛴 것 ${skip.length}건: ${skip.slice(0, 2).map((u) => `${u.from}→${u.to}`).join(" · ")}` : ""));

  check(MAIN.maxRank >= LAB.indexOf("D"),
    `C-4. 🏋️ 3년을 한 칸에 쏟으면 **D 이상**에 닿는다 — 최고 도달 ${LAB[MAIN.maxRank]}`);
}

/* 🧪 C 변이 — 등급 판정을 죽이면 */
{
  const m = mutRun("GRADE_DEAD", () => careers("main", MUT.GRADE_DEAD, [11, 23]));
  check(!!m && m.mismatch.length > 0 && avg(m.upsPerRun) < 2.0,
    `C-변이. 등급 판정을 죽이면 → 빨간불`
    + (m ? ` (숫자와 어긋난 칸 ${m.mismatch.length}건 · 주 스탯 승급 ${avg(m.upsPerRun).toFixed(2)}회)` : MUT_DEAD));
}

/* ══════════════════════════════════════════════════════════════
 * D. 🎉 검사 2 — 승급하면 **카드가 뜬다**
 *
 * 카드가 안 떠도 아무 오류가 없어요. `W2Grade.tick` 한 줄을 지운 변이가
 * engineer 손에서 **검사 10종 전부 초록불**이었습니다.
 * ══════════════════════════════════════════════════════════════ */
{
  check(MAIN.ups.length > 0 && MAIN.cardless === 0,
    `D-1. 🎉 등급이 오른 턴마다 `
    + `**.grade-up-card가 뜬다** — 승급 ${MAIN.ups.length}건 중 카드 없는 턴 ${MAIN.cardless}건`);

  /* 카드에 적힌 from/to가 **바뀌기 전/후의 실제 화면 등급**과 같다 */
  const wrong = MAIN.ups.filter((u) => u.cardFrom && (u.cardFrom.indexOf(u.from) < 0 || u.cardTo.indexOf(u.to) < 0));
  check(wrong.length === 0,
    `D-2. 🎉 카드의 .gu-from / .gu-to가 **바뀌기 전/후의 화면 등급**과 같다 (${MAIN.ups.length}건)`
    + (wrong.length ? `\n     🔴 어긋난 것 ${wrong.length}건 — 예: 화면 ${wrong[0].from}→${wrong[0].to} · 카드 ${wrong[0].cardFrom}→${wrong[0].cardTo}` : ""));

  /* 주 스탯 승급이면 .gu-main + .has-main — 무게를 나누는 자리예요 */
  const noMain = MAIN.ups.filter((u) => u.main && u.rows != null && (!u.hasMain || u.mainRows < 1));
  check(MAIN.ups.filter((u) => u.main).length > 0 && noMain.length === 0,
    `D-3. 🎉 주 스탯 승급이면 카드에 **.has-main**, 그 줄에 **.gu-main** (${MAIN.ups.filter((u) => u.main).length}건)`
    + (noMain.length ? ` — 안 붙은 것 ${noMain.length}건` : ""));

  /* 🔑 D-4. 한 턴에 두 칸이 올라도 **카드 한 장에 두 줄**.
   * 2.6초짜리를 쌓으면 손이 5.2초 멈춰요 — 그게 이 구조의 이유입니다.
   * ⚠️ 두 칸이 같은 턴에 오르는 건 자연 플레이에선 드물어서, **화면을 그리기 직전에**
   *    두 칸을 다음 문턱까지 밀어 올리고 **휴식 버튼을 실제로 눌러** 렌더를 일으킵니다.
   *    (승급 감지는 화면 그리는 자리에 달려 있으니 경로는 그대로예요) */
  const h = toMain(toBench(boot(101)));
  const S = h.W.__get("S");
  const defs = h.W.__get("STAT_DEFS");
  const main = h.W.__get("POS_INFO")[S.pos].stat;
  /* 🛌 휴식은 stamina를 +0.5 올려요 — 그 칸은 고르지 않습니다 */
  const picks = defs.map((d) => d.key).filter((k) => k !== "stamina" && k !== main).slice(0, 2);
  const before = readRows(h);
  for (const k of picks) S.stats[k] = BOUND[tblRank(S.stats[k])];   // 다음 문턱 바로 위로
  const cardsBefore = h.D.querySelectorAll(".grade-up-card").length;
  h.press(h.D.querySelector('#action-list .action-btn[data-key="__rest"]'));
  const newCards = Array.from(h.D.querySelectorAll(".grade-up-card")).slice(cardsBefore);
  const after = readRows(h);
  const risen = picks.filter((k) => after[k].grade !== before[k].grade);
  check(risen.length === 2 && newCards.length === 1 && newCards[0].querySelectorAll(".gu-row").length >= 2,
    `D-4. 🎉 한 턴에 두 칸이 올라도 **카드 한 장 · 줄 두 개** — 오른 칸 ${risen.length} · 카드 ${newCards.length}장 ·`
    + ` 줄 ${newCards[0] ? newCards[0].querySelectorAll(".gu-row").length : 0}개`
    + `\n     👉 2.6초짜리를 쌓으면 손이 5.2초 멈춰요. 카드를 칸마다 한 장씩 띄우면 여기가 웁니다`);
  check(MAIN.extraCards === 0,
    `D-5. 🎉 36턴 커리어에서도 **한 턴에 카드는 한 장**이다 (두 장 이상 뜬 턴 ${MAIN.extraCards}건)`);
  h.close();
}

/* 🧪 D 변이 — 승급 감지 한 줄 제거 */
{
  const m = mutRun("NO_TICK", () => careers("main", MUT.NO_TICK, [11, 23]));
  check(!!m && m.ups.length > 0 && m.cardsSeen === 0 && m.cardless > 0,
    `D-변이. W2Grade.tick 한 줄을 지우면 → 빨간불`
    + (m ? ` (등급은 ${m.ups.length}번 올랐는데 **카드가 ${m.cardsSeen}장** · 카드 없는 승급 턴 ${m.cardless}건)` : MUT_DEAD));
}

/* ══════════════════════════════════════════════════════════════
 * E. 🌱 검사 3 — 🧬 조립대의 등급이 **정점 기준값**에서 나온다
 *
 * 지금 실력(`cardShown`)으로 매기면 열일곱의 곡선이 0.56~0.84라 18~54가 10~45로
 * 눌려서 **여섯 칸이 전부 F**가 됩니다 — 그러면 🎲를 눌러도 뭐가 달라졌는지 못 봐요.
 *
 * 🔒 여기서도 `W2Grade.of()`를 정답으로 안 씁니다. 조립대가 들고 있는 `build.stats`에
 *    **이 파일의 표**를 대 봐요. 두 값이 어긋나면 그린 자가 바뀐 겁니다.
 *
 * 🌍 **2026-08-30에 세계가 바뀐 자리입니다.** 옛 E-2는
 *    *"**세 장이** 전부 같은 글자로 깔리는 판이 40% 미만"*이었는데, 3택이 폐기돼서
 *    **선수가 하나**예요. 그래서 *"**여섯 칸이** 전부 같은 글자"*로 다시 겨눴습니다 —
 *    **잡으려던 것은 그대로**입니다(지금 실력으로 매기면 전부 F로 깔린다).
 *    ⚠️ 문턱도 다시 쟀어요: 기준선 27.7% · 변이(cardShown) 95.8% → **60%**는 그 사이입니다
 *
 * ═════════════════════════════════════════════════════════════════════════
 * 🚨 **2026-09-02 — 이 절의 표본이 「되풀이」였습니다** (도달 경로가 조용히 죽음)
 * ═════════════════════════════════════════════════════════════════════════
 * `drawProbe`는 판마다 **↩️ 뒤로 → 🎯 자리 다시 고르기**로 새 선수를 뽑는다고 적어 뒀는데,
 * 흐름이 바뀌면서 **그 길이 더는 다시 굴리지 않습니다.** 실측 — 같은 창에서 6판을 떠 보면
 * `build.stats`가 **여섯 번 다 똑같아요**:
 *
 *     시드 8 : 37.0/31.0/27.0/25.0/48.0/26.0 · 합 194.0 · 글자 FFFFEF   (6판 전부 동일)
 *     시드 15: 31.0/36.0/34.0/31.0/33.0/29.0 · 합 194.0 · 글자 FFFFFF   (6판 전부 동일)
 *
 * 🔑 즉 *"120판"*은 **시드 3개를 40번씩 센 것**이었습니다. 시드별 「전부 같은 글자」 비율이
 *    **0% 아니면 100%**로만 나왔어요(24시드 실측) — 판이 갈리질 않으니까요.
 *    → E-2의 66.7%는 **3판 중 2판**입니다. 밴드가 나빠진 게 아니라 **표본이 셋**이었어요.
 *
 * 🔴 **그래서 「🧱을 학교 덱에서 뺐기 때문」이 아닙니다.** 짝지어 재 봤습니다 —
 *    🧱을 `PLAYABLE`에 되돌려도 **66.7% 그대로**였고, `deal()`의 **난수 소비만** 옛 모양으로
 *    되돌리면(종류는 2종 그대로) **33.3%**로 돌아왔어요. 옛 `deal()`은 `n === CARDS.length`일 때
 *    `Math.random()`을 **한 번도 안 썼습니다** — 새 `deal()`은 늘 씁니다.
 *    🔑 **난수 열이 밀린 것**이지 분포가 바뀐 게 아니에요. 시드를 12개로 늘리면 옛/새의
 *       대소가 **뒤집힙니다**(16.7% ↔ 41.7%). 잡음입니다.
 *
 * 🔴 **정정 (2026-09-02 · engineer 120번 §3-3) — 이건 `beta/`의 결함이 아니었습니다.**
 *    저는 처음에 *"↩️ 뒤로가 선수를 다시 안 굴린다"*로 짚었는데, engineer가 **실기기 경로**를
 *    그대로 걸어 보니 잘 돕니다: `btn-back-prospect` → `showOffers()` → 🏟️ 유스 카드 →
 *    `openBench()` → `WingerProspect.open()`이고, `open()`은 `rollTalents`·`rollBuild`를
 *    **매번 새로** 부릅니다 — **6/6 서로 다른 배분 · 6/6 서로 다른 잠재력.**
 * 🔴 **죽어 있던 것은 검사의 옛 길뿐입니다.** 옛 `drawProbe`는 뒤로 간 뒤
 *    **`[data-pos]`(🎯 자리 카드)**를 눌렀는데, 그 핸들러는 `goMiddle()`이라
 *    **`showOffers()`로 흘러가 조립대를 다시 안 엽니다.** 굴림이 안 일어나니 같은 게 맞아요.
 *    🔑 그리고 **사람은 그 버튼을 누를 수 없습니다** — 그때 `#position-list`는 감춰진 화면이에요.
 *    「도달 경로가 조용히 죽음」의 정확한 모양입니다: **디스크에 결과가 있으니 다들 통과**했어요.
 *
 * ✅ **고친 것: 🎲 재굴림 버튼(`#btn-prospect-reroll`)을 실제로 누릅니다.**
 *    그러면 판마다 배분이 진짜로 갈려요 — 실측 **240판 = 서로 다른 배분 240벌**:
 *
 *      | | 전부 같은 글자 | 표와 어긋난 칸 |
 *      |---|---|---|
 *      | 무변이            | **36.7%** (시드별 23~47%) | 0 |
 *      | 🧪 변이 CARD_SHOWN | **95.0%** (시드별 83~100%) | 145 |
 *
 *    🔑 **문턱 60%는 그대로 씁니다** — 두 값 사이에 여유 있게 서 있어요(아래 23%p · 위 35%p).
 *       문턱이 틀렸던 게 아니라 **표본이 없던 것**입니다.
 * ══════════════════════════════════════════════════════════════ */
function drawProbe(muts, seeds, per) {
  const KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
  /* 🔒 `builds`는 **표본이 진짜 갈리는지**를 세는 자리예요 — 판 수만 세면
   *    「같은 판을 40번 센 것」과 「40판을 센 것」이 구분이 안 됩니다 (2026-09-02에 그랬어요). */
  const out = { draws: 0, allSame: 0, mismatch: [], noStrip: 0, builds: new Set(), noRoll: 0 };
  for (const s of (seeds || [11, 23, 37])) {
    const h = toBench(boot(s, muts));
    /* 🎲 **재굴림 버튼** — 없으면 표본이 되풀이가 되므로 여기서 던집니다.
     *    (조용히 넘어가면 «판 240벌»이라고 적힌 초록불이 실은 3벌이 됩니다) */
    const roll = h.D.getElementById("btn-prospect-reroll");
    if (!roll) throw new Error("🎲 재굴림 버튼(#btn-prospect-reroll)이 없어요 — 표본이 되풀이가 됩니다");
    for (let i = 0; i < (per || 40); i++) {
      /* 🧬 선수가 **한 명**이에요 — `.prospect-card` 3장도 `state().cards`도 없습니다 */
      const build = h.W.WingerProspect._t.state().build;
      const letters = Array.from(h.D.querySelectorAll("#prospect-body .pc-grades .stat-grade"))
        .map((x) => x.textContent.trim());
      out.draws += 1;
      out.builds.add(KEYS.map((k) => build.stats[k].toFixed(2)).join("/"));
      if (letters.length !== KEYS.length) { out.noStrip += 1; }
      else {
        const want = KEYS.map((k) => tbl(build.stats[k]));
        letters.forEach((g, gi) => {
          if (g !== want[gi]) out.mismatch.push(`${KEYS[gi]} ${build.stats[KEYS[gi]].toFixed(1)} → 화면 "${g}" · 표 "${want[gi]}"`);
        });
        if (new Set(letters).size === 1) out.allSame += 1;
      }
      /* 🎲 **배분을 다시 굴립니다.**
       * 🔴 옛 길(↩️ 뒤로 → **🎯 자리 카드** 다시 누르기)로 되돌리지 마세요 — 그 핸들러는
       *    `goMiddle()`이라 조립대를 **다시 안 엽니다.** 같은 창에서 여섯 번을 떠도
       *    `build.stats`가 여섯 번 다 같았어요. 게다가 **사람은 그 버튼을 못 누릅니다**
       *    (그때 `#position-list`는 감춰진 화면이에요).
       * 🔑 **`beta/`는 멀쩡합니다** — 실기기 경로(↩️ 뒤로 → 🏟️ 유스 카드)는 6/6 다르게 굴려요.
       *    죽어 있던 건 **검사의 길**뿐입니다(§E 머리말의 정정). */
      h.press(roll);
    }
    h.close();
  }
  return out;
}
const DRAW = drawProbe();
{
  /* 🔒 **표본이 진짜 갈렸는가** — 이게 빨간불이면 아래 E-1·E-2는 **같은 판을 여러 번 센 것**입니다.
   *    2026-09-02에 정확히 그 상태였어요: 120판이 실은 3판이었습니다(§E 머리말). */
  const distinct = DRAW.builds.size;
  check(DRAW.draws >= 100 && DRAW.noStrip === 0 && distinct >= DRAW.draws * 0.9,
    `E-0. 🌱 🧬 조립대를 **${DRAW.draws}판** 실제로 열었고 판마다 등급 여섯 줄이 있다 (없는 판 ${DRAW.noStrip})`
    + `\n     🔎 측정 조건 — **서로 다른 배분 ${distinct}벌 / ${DRAW.draws}판** (바닥 ${Math.ceil(DRAW.draws * 0.9)}벌)`
    + `\n     🔑 판 수만 세면 「같은 판을 40번 센 것」과 「40판을 센 것」이 **구분이 안 됩니다** —`
    + ` 🎲 재굴림이 죽은 날 120판이 실은 **3판**이었어요`
    + (distinct >= DRAW.draws * 0.9 ? "" :
      `\n     🔴 배분이 ${distinct}벌뿐입니다 — 🎲 재굴림 경로가 죽었어요. E-1·E-2는 지금 **되풀이 표본** 위에 서 있습니다`));
  check(DRAW.mismatch.length === 0,
    `E-1. 🌱 조립대에 그린 등급이 **정점 기준값(build.stats)**과 맞는다 — ${DRAW.draws}판 × 6칸`
    + (DRAW.mismatch.length
      ? `\n     🔴 어긋난 것 ${DRAW.mismatch.length}칸 — 예: ${DRAW.mismatch.slice(0, 3).join(" · ")}`
        + `\n     👉 지금 실력(cardShown)으로 매기면 열일곱의 곡선에 눌려 여섯 칸이 전부 F로 깔립니다`
      : ""));
  /* 🔒 문턱은 여기 박습니다. 실측(36.7%) 옆에 붙이지 않고 **기준선과 변이(95.0%) 사이**에 둬요 */
  const ALL_SAME_MAX = 60;
  const rate = (DRAW.allSame / DRAW.draws) * 100;
  check(rate < ALL_SAME_MAX,
    `E-2. 🌱 **여섯 칸이 전부 같은 한 글자로 깔리는 판이 ${ALL_SAME_MAX}% 미만** — 실측 ${rate.toFixed(1)}% (${DRAW.allSame}/${DRAW.draws} · 서로 다른 배분 ${DRAW.builds.size}벌)`
    + `\n     👉 전부 같으면 등급으로는 🎲의 결과를 못 읽어요. 지금 실력으로 매기면 95%가 됩니다`
    + `\n     🔎 문턱 60%는 **무변이 36.7% ↔ 변이 95.0%** 사이예요 (아래 23%p · 위 35%p)`
    + (rate < ALL_SAME_MAX ? "" :
      `\n     🔴 먼저 **E-0의 「서로 다른 배분」**을 보세요 — 되풀이 표본이면 이 값은 몇 판의 우연입니다`));
}

/* 🧪 E 변이 — 카드 등급의 자를 지금 실력으로 */
{
  /* 🔒 **기준선과 같은 시드·같은 판 수**로 겁니다 — 짝지어 봐야 «변이가 옮긴 폭»을 말할 수 있어요.
   * 🔴 옛 술어는 `rate >= 60`(절대값)이었습니다. 기준선이 60% 위로 올라간 날
   *    **변이가 아무 일도 안 해도 통과**하는 자리였어요 — 그래서 **차이**로 바꿨습니다. */
  const m = mutRun("CARD_SHOWN", () => drawProbe(MUT.CARD_SHOWN));
  const rate = m ? (m.allSame / m.draws) * 100 : NaN;
  const base = (DRAW.allSame / DRAW.draws) * 100;
  const MUT_GAIN = 30;                    // 🔒 문턱은 여기 박습니다 (실측 격차 58.3%p)
  const ok = !!m && m.mismatch.length > 0 && rate >= base + MUT_GAIN;
  check(ok,
    `E-변이. 조립대 등급을 **지금 실력**으로 매기면 → 빨간불`
    + (m
      ? ` (정점 기준값과 어긋난 칸 **${m.mismatch.length}** · 전부 같은 판 무변이 ${base.toFixed(1)}% → 변이 **${rate.toFixed(1)}%**)`
        + `\n     🔎 측정 조건 — 기준선과 **같은 시드·같은 판 수**로 짝지었습니다 (계약: 어긋난 칸 > 0 **그리고** 격차 ≥ ${MUT_GAIN}%p)`
        + (ok ? "" : `\n     🔴 변이가 기준선을 못 밀었어요 — E-0의 「서로 다른 배분」부터 보세요`)
      : MUT_DEAD));
}

/* ══════════════════════════════════════════════════════════════
 * F. 📶 검사 4 — XP 바가 **구간 안의 위치**다 (`v/100`이 아니라)
 *
 * 🔒 `W2Grade.of()`의 `pct`를 정답으로 삼으면 **자기 자신과 비교**가 됩니다.
 *    그래서 값이 아니라 **관계 둘**을 봅니다:
 *      ① 승급한 훈련은 바가 **줄어든다** (톱니) — `v/100`이면 계속 올라가기만 해요
 *      ② 한 훈련이 채우는 폭이 **절반을 안 넘는다** — 🗑️ 19단계 복귀 신호입니다
 *
 * 🌍 ②는 **7단계 세계의 문장**이에요. designer 폐기 이유 ②가 그대로 검사입니다:
 *    *"폭 5~7에서는 훈련 한 번이 31~84%. 진행이 보이는 게 아니라 뜁니다. 바가 아니라
 *    스위치였습니다."* 세분을 되살리기로 판정이 바뀌면 여기가 먼저 뒤집힙니다.
 * ══════════════════════════════════════════════════════════════ */
const EVEN = careers("even");
{
  const ups = MAIN.ups.concat(EVEN.ups).filter((u) => u.wb != null && u.wa != null && u.to !== "S");
  const noDrop = ups.filter((u) => !(u.wa < u.wb));
  check(ups.length >= 10 && noDrop.length === 0,
    `F-1. 📶 **승급한 훈련은 바가 줄어든다** — ${ups.length}건 전부 (톱니)`
    + (noDrop.length
      ? `\n     🔴 안 줄어든 것 ${noDrop.length}건 — 예: ${noDrop[0].from}→${noDrop[0].to} ${noDrop[0].wb}% → ${noDrop[0].wa}%`
        + `\n     👉 v/100 막대면 승급해도 안 줄고 계속 올라가기만 합니다`
      : ups.length
        ? ` (예: ${ups[0].from}→${ups[0].to} ${ups[0].wb}% → ${ups[0].wa}%)`
        : `\n     🔴 **승급이 한 건도 안 났습니다** — 관계를 잴 표본이 없어요 (등급 판정이 죽었는지 보세요)`));

  /* 등급이 그대로면 바는 **차오르기만** 합니다 — 톱니의 나머지 반쪽 */
  const fills = MAIN.fills.concat(EVEN.fills);
  const back = fills.filter((f) => f < 0);
  check(fills.length >= 50 && back.length === 0,
    `F-2. 📶 등급이 그대로면 바는 **차오르기만** 한다 — ${fills.length}회 중 거꾸로 간 것 ${back.length}회`);

  /* 🔒 문턱 둘 다 이 파일에 박았습니다. 실측(중앙 7~13%p) 옆에 붙이지 않고
   *    **기준선과 19단계(≈53%p) 사이**에 뒀어요 — 계수가 한 번 움직였다고 안 웁니다 */
  const m = med(fills), p95 = qtl(fills, 0.95);
  /* 🔒 문턱 30%p — **기준선(11.1)과 변이(40.0) 사이**에 뒀습니다. 한쪽에 붙이면
   *    고장이 아니라 우연으로 빨간불이 나요 (`fatigue` 문턱이 여유 0.4%까지 좁아졌던 그 자리). */
  check(m < 30,
    `F-3. 📶 훈련 한 번이 채우는 폭의 **중앙값이 30%p 미만** — 실측 ${m.toFixed(1)}%p (n=${fills.length})`
    + `\n     👉 🗑️ ± 세분으로 되돌리면 40%p대가 됩니다 (designer는 31~84%로 봤어요). 세분 복귀 신호예요`);
  check(p95 < 50,
    `F-4. 📶 **한 훈련이 바의 절반 이상을 채우지 않는다** — 95분위 ${p95.toFixed(1)}%p (최대 ${Math.max(...fills).toFixed(1)}%p)`
    + `\n     👉 designer 폐기 이유 ②: *"한 번에 31~84%면 바가 아니라 스위치"*`);
  check(m > 3,
    `F-5. 📶 바가 **얼어붙지 않았다** — 중앙값 ${m.toFixed(1)}%p (> 3%p)`);
}

/* 🧪 F 변이 — 옛 v/100 막대로 되돌림 */
{
  const mm = mutRun("XP_V100", () => careers("main", MUT.XP_V100, [11, 23]));
  const ups = mm ? mm.ups.filter((u) => u.wb != null && u.wa != null && u.to !== "S") : [];
  const noDrop = ups.filter((u) => !(u.wa < u.wb));
  check(!!mm && ups.length > 0 && noDrop.length > 0,
    `F-변이1. XP 바를 **옛 v/100 막대**로 되돌리면 → 빨간불`
    + (mm ? ` (승급 ${ups.length}건 중 **안 줄어든 것 ${noDrop.length}건** — 예: ${noDrop[0] ? `${noDrop[0].wb}% → ${noDrop[0].wa}%` : ""})` : MUT_DEAD));
}
{
  const ms = mutRun("SUBDIVIDE", () => careers("main", MUT.SUBDIVIDE, [11, 23]));
  const f = ms ? ms.fills : [];
  check(!!ms && f.length > 0 && med(f) >= 30,
    `F-변이2. 🗑️ **± 세분 19단계를 되살리면** → 빨간불`
    + (ms ? ` (훈련 한 번이 중앙 ${med(f).toFixed(1)}%p를 채웁니다 — 바가 아니라 스위치예요)` : MUT_DEAD));
  /* 🗑️ 세분은 **등급이 갈리는 횟수**를 통째로 늘립니다 — 사건이 흔해지면 사건이 아니게 돼요.
   * (C-2의 밴드는 이걸 못 잡습니다. ± 라벨이 이 파일의 LAB에 없어서 승급/강등 분류가 무너지거든요 —
   *  그래서 세분 부활은 B-2·F-3이 정면으로 잡고, 여기서는 그 크기만 기록합니다.) */
  check(!!ms && avg(ms.changesPerRun) > avg(MAIN.changesPerRun) * 1.8,
    `F-변이3. 🗑️ 세분을 되살리면 등급이 갈리는 횟수가 뜁니다`
    + (ms ? ` — 커리어당 ${avg(MAIN.changesPerRun).toFixed(1)}회 → ${avg(ms.changesPerRun).toFixed(1)}회 (사건이 흔해지면 사건이 아니게 돼요)` : MUT_DEAD));
}

console.log(`\n${fail ? "❌" : "✅"} 등급/XP/승급 카드 — 빨간불 ${fail}건`);
process.exit(fail ? 1 : 0);
