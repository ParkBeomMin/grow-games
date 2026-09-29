/* 📖 도감 장부 — 커리어를 넘어 **이 기기에** 쌓이는 기록이에요(세이브 슬롯 밖).
 *
 * 키가 둘이에요.
 *   `winger-save-v1-book`  — 클라우드가 백업해요(beta/cloud.js의 keysOf)
 *   `winger-book-shadow`   — 이 기기에만 남는 그림자예요
 *
 * ⚠️ 클라우드는 꾸러미를 받을 때(writeKeys) **꾸러미에 없는 키를 지워요.** 장부를 모르는 옛 판
 * 기기가 올린 꾸러미를 받으면 이 기기의 장부가 통째로 사라지는데, 그림자는 클라우드가 모르는
 * 키라 살아남아요. 그래서 **읽을 때는 두 키를 합치고, 쓸 때는 둘 다** 써요.
 *
 * 합칠 때 `n`(만난 횟수)은 **큰 쪽**이에요 — 더하면 같은 만남을 두 번 셉니다.
 * `at`(처음 본 시각)은 **작은 쪽**이에요.
 *
 * 모양 { v: 1, ev: { [id]: { n, at } }, end: { ["abroad:learned"]: { n, at } }, ach: { [id]: { n, at } }, pend: [] }
 * `pend`는 ③ 단계(서버 최초 기록) 몫이라 지금은 빈 배열이에요.
 *
 * game.js의 전역(SAVE_KEY)을 쓰므로 game.js 뒤에 로드해야 해요. */
"use strict";

window.WingerBook = (() => {
  const KEY = SAVE_KEY + "-book";
  const SHADOW = "winger-book-shadow";
  const KINDS = ["ev", "end", "ach"];
  /* id는 우리 코드가 짓는 값이에요(`p_gap` · `abroad:learned` · `g100`). 그래도 장부는 클라우드를
   * 타고 **다른 기기에서** 올 수 있어서, 모양이 다른 키는 받지 않아요.
   * ⚠️ 두 겹으로 막아요(검사 ❌-1 — 예전 정규식은 `__proto__`를 통과시켜 Object.prototype에 n·at을 썼어요):
   *   ① 첫 글자는 영숫자 — `__proto__` 같은 밑줄 이름은 여기서 떨어져요(받는 길 · 쓰는 길 둘 다)
   *   ② 칸 사전은 **프로토타입이 없는 객체** — `constructor`·`toString`처럼 정규식을 지나는 이름도
   *      물려받은 값을 「이미 있는 칸」으로 읽지 않아요. 자기 칸만 있어요 */
  const ID_RE = /^[a-z0-9][a-z0-9_:]{0,39}$/i;
  const dict = () => Object.create(null);
  const blank = () => ({ v: 1, ev: dict(), end: dict(), ach: dict(), pend: [] });

  function read(key) {
    try {
      const b = JSON.parse(localStorage.getItem(key));
      return b && typeof b === "object" ? b : null;
    } catch { return null; }
  }
  // 한 칸 { n, at } — 모양이 이상하면 버려요
  function cell(c) {
    if (!c || typeof c !== "object") return null;
    const n = Math.floor(Number(c.n));
    if (!(n >= 1)) return null;
    const at = Number(c.at);
    return { n, at: Number.isFinite(at) && at > 0 ? at : null };
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
        }
      }
    }
    return out;
  }

  /* 한 번 더 만났어요 — n + 1 · 처음이면 지금 시각을 at으로. 두 키에 다 써요. */
  function mark(kind, id) {
    if (!KINDS.includes(kind) || !ID_RE.test(String(id))) return false;
    const b = load();
    const had = b[kind][id];
    b[kind][id] = had
      ? { n: had.n + 1, at: had.at != null ? had.at : Date.now() }
      : { n: 1, at: Date.now() };
    const txt = JSON.stringify(b);
    let ok = true;
    for (const key of [KEY, SHADOW]) {
      try { localStorage.setItem(key, txt); } catch { ok = false; }
    }
    /* 백업 대상(keysOf)이라 표시해 둬요 — 안 하면 다음 pull에 조용히 덮여요(대전 기록과 같은 이유) */
    if (window.Cloud) Cloud.touch();
    return ok;
  }

  return { load, mark, KEY, SHADOW };
})();
