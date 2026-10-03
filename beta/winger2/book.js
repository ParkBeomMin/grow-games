/* ⚽ 더 윙어 II — 📖 도감 장부(이 기기에 쌓이는 기록 · 세이브 밖)
 *
 * 설계: 12번 §7-7 · §11-3 · 13번 §7-1 · ①의 `book.js` 모양
 *
 * 키가 둘이에요.
 *   `winger2-book`         — 클라우드가 백업해요(`beta/cloud.js`의 `keysOf` 한 줄)
 *   `winger2-book-shadow`  — 이 기기에만 남는 그림자예요
 * ⚠️ 클라우드는 꾸러미를 받을 때(writeKeys) **꾸러미에 없는 키를 지워요.** 장부를 모르는 기기가 올린 꾸러미를
 *    받으면 장부가 통째로 사라지는데, 그림자는 클라우드가 모르는 키라 살아남아요. 그래서 **읽을 때는 두 키를
 *    합치고, 쓸 때는 둘 다** 써요. 합칠 때 `n`은 큰 쪽(더하면 같은 만남을 두 번 셈) · `at`은 작은 쪽.
 *
 * 모양 { v: 1, ev: { [id]: { n, at } }, end: { ["sid:end" | 엔딩 id]: { n, at, g? } }, ach: { [id]: { n, at } },
 *        grad: { ["jiho-m" …]: { n, at } }, pend: [] }
 *   `end`의 엔딩 칸만 `g: ["m", "f"]` — **어느 세계에서 봤나**(13번 §7-1). 이야기 결말은 `sid:end`라 안 겹쳐요.
 *   `grad` — 주인공 × 성별 졸업(업적 `trio` · `six` · 13번 §7-3). */
"use strict";

window.W2Book = (() => {
  const KEY = "winger2-book";
  const SHADOW = "winger2-book-shadow";
  const KINDS = ["ev", "end", "ach", "grad"];
  /* id는 우리 코드가 짓는 값이지만 장부는 클라우드를 타고 **다른 기기에서** 올 수 있어요 — 모양이 다른 키는 안 받아요.
   * ① 첫 글자는 영숫자(`__proto__` 같은 밑줄 이름이 여기서 떨어져요) ② 칸 사전은 **프로토타입 없는 객체** */
  const ID_RE = /^[a-z0-9][a-z0-9_:-]{0,39}$/i;
  const dict = () => Object.create(null);
  const blank = () => ({ v: 1, ev: dict(), end: dict(), ach: dict(), grad: dict(), pend: [] });

  function read(key) {
    try {
      const b = JSON.parse(localStorage.getItem(key));
      return b && typeof b === "object" ? b : null;
    } catch (e) { return null; }
  }
  function cell(c) {
    if (!c || typeof c !== "object") return null;
    const n = Math.floor(Number(c.n));
    if (!(n >= 1)) return null;
    const at = Number(c.at);
    const out = { n, at: Number.isFinite(at) && at > 0 ? at : null };
    if (Array.isArray(c.g)) out.g = c.g.filter((x) => x === "m" || x === "f").filter((x, i, a) => a.indexOf(x) === i);
    return out;
  }
  function load() {
    const out = blank();
    for (const b of [read(KEY), read(SHADOW)]) {
      if (!b) continue;
      for (const k of KINDS) {
        const src = b[k];
        if (!src || typeof src !== "object") continue;
        for (const id of Object.keys(src)) {
          if (!ID_RE.test(id)) continue;
          const c = cell(src[id]);
          if (!c) continue;
          const had = out[k][id];
          if (!had) { out[k][id] = c; continue; }
          had.n = Math.max(had.n, c.n);
          if (c.at != null && (had.at == null || c.at < had.at)) had.at = c.at;
          if (c.g) had.g = (had.g || []).concat(c.g).filter((x, i, a) => a.indexOf(x) === i);
        }
      }
    }
    return out;
  }
  /* 한 번 더 만났어요 — n + 1 · 처음이면 지금 시각 · `g`를 주면 그 세계를 더해요. 두 키에 다 써요. */
  function mark(kind, id, g) {
    if (KINDS.indexOf(kind) < 0 || !ID_RE.test(String(id))) return false;
    const b = load();
    const had = b[kind][id];
    const c = had ? { n: had.n + 1, at: had.at != null ? had.at : Date.now() } : { n: 1, at: Date.now() };
    const gs = (had && had.g) || [];
    if (g === "m" || g === "f") c.g = gs.indexOf(g) < 0 ? gs.concat(g) : gs;
    else if (had && had.g) c.g = had.g;
    b[kind][id] = c;
    const txt = JSON.stringify(b);
    let ok = true;
    for (const key of [KEY, SHADOW]) {
      try { localStorage.setItem(key, txt); } catch (e) { ok = false; }
    }
    /* 백업 대상(keysOf)이라 표시해 둬요 — 안 하면 다음 pull에 조용히 덮여요 */
    if (window.Cloud && window.Cloud.touch) window.Cloud.touch();
    return ok;
  }

  /* 🎓 엔딩 7 — 도감의 엔딩 탭(12번 §7-7). 못 본 엔딩은 이름 대신 **힌트 한 줄**(어느 주인공의 문인지 —
   * 결정 C 「다른 주인공의 문」). 본 엔딩은 **본 세계의 이름으로**(13번 §7-1 — 두 세계를 다 봤으면 남자부 이름). */
  const ENDINGS = [
    { id: "pro1", tier: "top", hint: "평가서 「최상」의 기본 문" },
    { id: "abroad", tier: "top", hint: "하람의 문 — 「최상」에서 바다 건너 온 편지에 답장을 보냈다면" },
    { id: "pro2", tier: "high", hint: "평가서 「상」의 기본 문" },
    { id: "univ", tier: "high", hint: "도윤의 문 — 「상」에서 원서를 써 뒀다면" },
    { id: "trainee", tier: "mid", hint: "평가서 「중」의 기본 문" },
    { id: "semi", tier: "mid", hint: "지호의 문 — 「중」에서 아버지 팀 테스트 날짜를 받아 뒀다면" },
    { id: "leave", tier: "low", hint: "평가서 「하」" },
  ];
  function endings() {
    const B = load();
    const SH = window.W2Sheet;
    return ENDINGS.map((e) => {
      const c = B.end[e.id];
      const g = c && c.g && c.g.length ? (c.g.indexOf("m") >= 0 ? "m" : "f") : "m";
      return { id: e.id, tier: e.tier, n: c ? c.n : 0, g: c && c.g ? c.g.slice() : [],
        emoji: SH ? SH.END_EMO[e.id] : null, name: c && SH ? SH.endName(e.id, g, true) : null, hint: c ? null : e.hint };
    });
  }

  return { load, mark, endings, KEY, SHADOW, ENDINGS };
})();
