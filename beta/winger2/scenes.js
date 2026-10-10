/* 🖼️ ⚽ 더 윙어 II · 1막 — 장면 · 오버레이 · 초상 (director · 25번 계약 10)
 *
 *   window.W2Scenes — engineer가 부릅니다. 오버레이는 전부 #w2-layer에 그리고
 *   **사용자 탭(click)으로만** Promise를 풉니다(pointerdown에서 화면을 갈지 않아요 — ① 교훈).
 *
 *     pick(cards)            → Promise<{ preset, gender }>   👥 카드 여섯 = 외형만(여섯 다 열림 · 기본값 없음 — 38번 계약 15)
 *     intro(ctx)             → Promise<k | undefined>        🎬 도입 — 번호를 잃은 날 · 마지막 한마디를 셋 중 고름(`ctx.choices`)
 *     portrait(slot, o)      → (그림)                         🗓️ 홈 위 ⅓ 초상 — o = { who, mood, bg, name?, week? }
 *     card(card)             → Promise<pickIndex>            🎲 이벤트 · 📖 이야기 · 🤝 사람 · (opts 없으면 [확인] 하나)
 *                                                             v4: `card.choices`(셋~넷 — 47번 §2)가 있으면 그것을, 없으면 `opts`
 *     grade({ k, label, from, to }) → Promise                📊 승급 카드 「⚽ 슈팅 C → C+」
 *     sheet(sheet)           → Promise                       📋 평가서(중간 · 최종)
 *     doors(doors)           → Promise<doorId>               ✉️ 문 — 같은 높이의 두 제안
 *     ending(ending)         → Promise                       🎓 엔딩
 *     film(film)             → Promise<{ rep, word, go }>    🎬 졸업 필름(마지막 장의 🏅 · 🖊️ · 📤)
 *     book(book)             → Promise                       📖 도감
 *     drawCard(canvas, film) → Promise<canvas>  · share(film) → Promise<"share"|"download"|"image"|"fail">   📤 1080×1350
 *     settings()             → Promise                       ⚙️ 설정 레이어(29번 §4 · 38번 계약 14 · 17) — ⚙️ 버튼은 이 파일이 스스로 붙여요
 *
 * ═══ 지키는 것 ═══
 * ① **그리기만 합니다.** 결과 · 확률 · 점수는 받은 값을 그대로 적어요. 다시 계산하지 않습니다
 *    (조각의 합 = pct를 **검산해서 보여 줄 뿐** 고치지 않아요 — 보이는 % = 판정 %).
 * ② **세이브 · 전역 상태를 읽지 않습니다**(계약 9) — 인자로 받은 객체와 `window.Art`(그림 표)만.
 *    설정은 `W2Game.settings`(list · on · set · wipe)로만 — localStorage를 직접 읽거나 쓰지 않아요(38번 계약 14).
 * ③ **사용자 문자열(이름 · 한마디)과 받은 글자는 전부 `textContent`로** 넣습니다 — 이 파일은 innerHTML을
 *    한 번도 안 씁니다(DOM을 직접 지어요). 그림 대체 문구는 `{이름} — {표정}`(Art.alt).
 * ④ **깨진 그림 금지** — 그림이 없거나 못 받으면 초상은 이름 글자로, 배경은 테마 그라데이션으로 물러섭니다.
 * ⑤ 오버레이는 **한 번에 하나** — 동시에 불러도 줄을 서서 차례로 뜹니다(뒤의 것에 손이 안 닿는 일이 없게).
 * ⑥ ♿ 키보드 — 탭이 오버레이 밖으로 새지 않게 둘레를 돌리고, 닫히면 원래 자리로 포커스를 돌려줘요.
 *    prefers-reduced-motion이면 타이핑 · 등장 · 파티클을 끕니다(글자는 그대로).
 * ⑦ 판정 흐름에 닿지 않습니다 — 여기서 쓰는 `Fx`(Math.random)는 경기 밖의 축하에만 불러요. */
"use strict";

window.W2Scenes = (() => {
  // ---------- 작은 도구 ----------
  /* 🎞️ 움직임 줄이기 = 기기 설정 **또는** 게임 설정 `still`(29번 §4-1 · 38번 §6 14-a). 설정은 `W2Game.settings`로만 읽어요 */
  const SET = () => { const g = window.W2Game; return g && g.settings && typeof g.settings.on === "function" ? g.settings : null; };
  const setting = (k) => { try { const S = SET(); return !!(S && S.on(k)); } catch { return false; } };
  const reduced = () => {
    try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true; } catch { /* 옛 브라우저 */ }
    return setting("still");
  };
  /* 게임 설정으로 켠 움직임 줄이기는 CSS가 못 보니(@media는 기기만) 뿌리에 표시를 달아요 — style.css의 `html.w2-still` */
  const syncStill = () => document.documentElement.classList.toggle("w2-still", setting("still"));
  const art = () => window.Art || null;
  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function put(parent, ...kids) {
    for (const k of kids) if (k) parent.appendChild(k);
    return parent;
  }
  function btn(cls, text) {
    const b = h("button", cls, text);
    b.type = "button";
    return b;
  }
  const str = (v) => (v == null ? "" : String(v));
  const fin = (v) => v != null && v !== "" && Number.isFinite(+v);
  const n1 = (v) => (Number.isInteger(+v) ? String(+v) : (+v).toFixed(1));
  const sign = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "±0");
  const firstChar = (s) => Array.from(str(s).replace(/\s+/g, ""))[0] || "?";
  /* 조사 — 이름은 플레이어가 바꿔요(12번 §3-2). 받침을 봐야 「가은과」「서아와」가 됩니다 */
  const jong = (w) => { const c = str(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0; };
  const waGwa = (w) => (jong(w) ? "과" : "와");

  const STAT = {
    shoot: ["⚽", "슈팅"], pass: ["🎯", "패스"], dribble: ["🌀", "드리블"],
    defense: ["🛡️", "수비"], stamina: ["🫀", "체력"], speed: ["⚡", "스피드"],
  };
  const STAT_DEFS = Object.keys(STAT).map((key) => ({ key, emoji: STAT[key][0], name: STAT[key][1] }));
  const POS = { fw: "공격수", wg: "윙어", mf: "미드필더", df: "수비수" };
  const TIER = { top: "최상", high: "상", mid: "중", low: "하" };
  const TIER_KEY = { "최상": "top", "상": "high", "중": "mid", "하": "low" };
  const tierKey = (t) => (TIER[t] ? t : TIER_KEY[t] || "");
  const tierName = (t) => TIER[t] || str(t);

  // ---------- 🖼️ 그림 ----------
  /* 🔤 **주인공의 이름은 플레이어가 지은 것**이라 그림 표(`Art.name`)의 기본 이름(「지호」)으로 읽으면 틀립니다.
   *    받은 인자(초상 · 카드 · 도입 · 필름)에 `name`이 오면 주인공 키(`jiho-f` …)별로 기억해 두고,
   *    이름 칸이 없는 모델(🎓 엔딩)에서 씁니다 — 🐛 엔딩 대체 문구가 「지호 — 벅참」으로 읽히던 것(36주 렌더에서 봄).
   * 🔒 세이브 · 전역 상태를 읽는 게 아니에요(계약 9) — 이 파일이 **받은 인자**만 담아요. 새로고침하면 비고,
   *    주간 화면이 매주 `portrait(…, { name })`을 불러 늘 지금 판의 이름으로 채워져요. */
  const heroName = {};
  const isHero = (who) => /^(jiho|doyun|haram)-[mf]$/.test(String(who || ""));
  const remember = (who, name) => { if (isHero(who) && name) heroName[who] = String(name); };
  /* 초상 한 장 — 그림이 있으면 <img>(대체 문구 `{이름} — {표정}`), 없거나 못 받으면 **이름 글자**. */
  function face(who, mood, name) {
    const A = art();
    name = name || (isHero(who) ? heroName[who] : null) || undefined;
    const nm = name || (A && A.name(who)) || "선수";
    const alt = A ? A.alt(who, mood, name) : `${nm} — ${mood || "평온"}`;
    const glyph = () => {
      const g = h("span", "w2-glyph", firstChar(nm));
      g.setAttribute("role", "img");
      g.setAttribute("aria-label", alt);
      return g;
    };
    const src = A && who ? A.src(who, mood) : null;
    if (!src) return glyph();
    const img = h("img", "w2-face");
    img.alt = alt;
    img.decoding = "async";
    img.addEventListener("error", () => {
      const g = glyph();
      img.replaceWith(img.getAttribute("aria-hidden") === "true" ? deco(g) : g);   // 장식이던 자리는 장식 그대로
    }, { once: true });
    img.src = src;
    return img;
  }
  /* 💬 **감정 표시** — 검수 기록(`qa.md`)이 「표정이 전반적으로 옅다 — 다시 뽑기보다 감정 말풍선을
   *    얹는 편이 싸다」고 넘긴 자리예요. 장식이라 낭독에서 빼고(표정은 대체 문구가 말함), 옅은 표정만 받칩니다.
   * 🔴 평온 · 도발 · 인정 · 관심에는 안 얹어요 — 거기에 무언가를 붙이면 없는 감정을 지어내는 거예요. */
  const MARK = {
    smile: "♪", grin: "♪", fire: "🔥", tired: "💦", down: "…", surprise: "!", shock: "!",
    moved: "✨", stern: "💢", frown: "💢", worry: "💧",
  };
  /* 버튼 안의 얼굴은 **장식** — 이름을 글자가 이미 말해서, 대체 문구까지 읽으면 두 번 들려요 */
  function deco(el) {
    if (el.tagName === "IMG") el.alt = "";
    el.setAttribute("aria-hidden", "true");
    el.removeAttribute("role");
    return el;
  }
  function fig(who, mood, name, cls) {
    const f = h("figure", `w2-fig${cls ? ` ${cls}` : ""}`);
    f.appendChild(face(who, mood, name));
    if (MARK[mood]) {
      const m = h("span", `w2-mark m-${mood}`, MARK[mood]);
      m.setAttribute("aria-hidden", "true");
      f.appendChild(m);
    }
    return f;
  }
  function bgImg(id) {
    const A = art();
    const src = A && id ? A.bg(id) : null;
    if (!src) return null;
    const i = h("img", "w2-bgimg");
    i.alt = "";
    i.setAttribute("aria-hidden", "true");
    i.decoding = "async";
    i.addEventListener("error", () => i.remove(), { once: true });
    i.src = src;
    return i;
  }
  function scene(bg, who, mood, name) {
    const s = h("div", "w2o-scene");
    put(s, bgImg(bg), who ? fig(who, mood, name) : null);
    return s;
  }

  // ---------- 🪟 오버레이 껍데기 ----------
  let seq = 0;
  let chain = Promise.resolve();
  /* ⑤ 한 번에 하나 — 앞의 오버레이가 풀려야 다음이 뜹니다 */
  const run = (fn) => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };
  function trap(root) {
    root.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const f = Array.prototype.filter.call(
        root.querySelectorAll("button:not([disabled]), input:not([disabled]), summary, [tabindex='0']"),
        (x) => x.offsetParent !== null || x === document.activeElement);
      if (!f.length) { e.preventDefault(); return; }
      const a = f[0], z = f[f.length - 1];
      if (document.activeElement === root) { e.preventDefault(); (e.shiftKey ? z : a).focus(); return; }
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  }
  function shell(kind) {
    const id = `w2o-t${++seq}`;
    const back = document.activeElement;
    const root = h("div", `w2o w2o-${kind}`);
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", id);
    root.tabIndex = -1;
    const box = h("div", "w2o-box");
    root.appendChild(box);
    trap(root);
    (document.getElementById("w2-layer") || document.body).appendChild(root);
    document.documentElement.classList.add("w2-lock");
    const close = () => {
      root.remove();
      if (!document.querySelector(".w2o")) document.documentElement.classList.remove("w2-lock");
      if (back && back.focus && document.body.contains(back)) { try { back.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
    };
    const focus = () => { try { root.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } };
    return { root, box, id, close, focus };
  }
  function title(tag, cls, text, id) {
    const t = h(tag, cls, text);
    t.id = id;
    return t;
  }

  // ═══════════════════════════════════════════════════════════════
  // 👥 pick — 카드 여섯 = **외형만**(결정 C · 38번 계약 15 · §6 15-a). 성격 줄은 뺐어요 — 말투는 도입의 마지막 한마디에서
  //   골라요(29번 §3-5). 여섯 다 열림 · 기본값 없음. `locked`가 오면 그때만 잠근 그림(읽는 쪽 기본값)
  // ═══════════════════════════════════════════════════════════════
  const HERO = { jiho: { m: "지호", f: "지호" }, doyun: { m: "도윤", f: "도연" }, haram: { m: "하람", f: "하람" } };
  const PICK_DEFAULT = ["jiho", "doyun", "haram"].reduce((a, p) => a.concat([{ preset: p, gender: "m" }, { preset: p, gender: "f" }]), []);
  const WORLD = { m: "남자부", f: "여자부" };
  function pick(cards) {
    return run(() => new Promise((resolve) => {
      const list = Array.isArray(cards) && cards.length ? cards : PICK_DEFAULT;
      const s = shell("pick");
      const head = h("div", "w2o-head");
      put(head, title("h2", "w2o-title", "어떤 모습으로 뛸까요?", s.id),
        h("p", "w2o-sub", "외형만 골라요 — 능력치 · 이름 · 포지션은 다음 화면에서 정해요. 성별을 고르면 그 세계(남자부 · 여자부)가 열려요"));
      const grid = h("div", "w2o-heroes");
      const toast = h("p", "w2o-toast");
      toast.setAttribute("role", "status");
      let done = false;
      list.forEach((c) => {
        const p = HERO[c.preset] || {};
        const g = c.gender === "f" ? "f" : "m";
        const name = c.name || p[g] || "선수";
        const locked = !!c.locked;
        const b = btn(`w2o-hero${locked ? " is-locked" : ""}`);
        if (locked) b.setAttribute("aria-disabled", "true");
        put(b, put(h("span", "w2o-hero-fig"), deco(face(`${c.preset}-${g}`, "base", name)),
          locked ? h("span", "w2o-lock", `🔒 ${c.lockText || "다음 업데이트에서 만나요"}`) : null),
          h("span", "w2o-hero-name", name),
          h("span", `w2o-hero-world w-${g}`, WORLD[g]));
        b.addEventListener("click", () => {
          if (done) return;
          if (locked) { toast.textContent = `🔒 ${name}(${WORLD[g]})는 다음 업데이트에서 만나요`; return; }
          done = true;
          s.close();
          resolve({ preset: c.preset, gender: g });
        });
        grid.appendChild(b);
      });
      put(s.box, head, grid, toast);
      s.focus();
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // 💬 talk — 도입 · 엔딩이 같이 쓰는 「배경 + 반신 + 대사 판」(12번 §9-6 겹치기)
  //   steps: [{ who, mood, name, speaker, text, typed }] · 탭 하나 = 한 줄(타이핑 중이면 줄을 다 보여 줌)
  // ═══════════════════════════════════════════════════════════════
  const TYPE_MS = 45;                       // 40~60ms/자(경기 연출 스킬 §2) — 승부처 줄만 칩니다
  /* 🗣️ 고르는 한마디 — 줄 하나가 `{ choices: [{ k, text, mood, speaker }], prompt }`이면 셋 중 고르게 그리고,
   *    고른 줄을 그 말투의 표정으로 칩니다. 고른 `k`로 풀어요(없으면 undefined — 29번 §3-5 · 38번 §6 15-a) */
  const SAY = { hot: "🔥", calm: "🧊", play: "😄" };
  function talk(kind, steps, o) {
    return run(() => new Promise((resolve) => {
      const s = shell(kind);
      const sc = scene(o.bg);
      const panel = h("div", "w2o-panel w2o-talk");
      const label = title("h2", "w2o-label", o.label || "", s.id);
      const head = o.head || null;
      const speaker = h("p", "w2o-speaker");
      const line = h("p", "w2o-line");
      line.setAttribute("aria-live", "polite");
      const say = h("div", "w2o-say");
      say.setAttribute("role", "group");
      say.hidden = true;
      const next = btn("btn btn-primary w2o-next");
      put(panel, label, head, speaker, line, say, next);
      put(s.box, sc, panel);
      let i = -1, fg = null, key = "", timer = null, full = "", said;
      const stopType = () => {
        if (timer) { clearTimeout(timer); timer = null; }
        line.textContent = full;
        line.classList.remove("is-typing");
      };
      const typeLine = (text, typed) => {
        full = str(text);
        if (!typed || reduced()) { line.textContent = full; return; }
        const chars = Array.from(full);
        let k = 0;
        line.textContent = "";
        line.classList.add("is-typing");
        const tick = () => {
          k += 1;
          line.textContent = chars.slice(0, k).join("");
          if (k >= chars.length) { timer = null; line.classList.remove("is-typing"); return; }
          timer = setTimeout(tick, TYPE_MS);
        };
        timer = setTimeout(tick, TYPE_MS);
      };
      const setFig = (who, mood, name) => {
        const nk = `${who || ""}|${mood || ""}`;
        if (!who || nk === key) return;
        const nf = fig(who, mood, name);
        if (fg) fg.replaceWith(nf); else sc.appendChild(nf);
        fg = nf;
        key = nk;
      };
      const lastLabel = (k) => (k === steps.length - 1 ? (o.last || "▶ 시작") : "다음 ▶");
      const show = (k) => {
        const st = steps[k] || {};
        setFig(st.who, st.mood, st.name);
        if (Array.isArray(st.choices) && st.choices.length) {
          speaker.hidden = true;
          line.textContent = str(st.prompt);
          next.hidden = true;
          say.replaceChildren(...st.choices.map((ch) => {
            const b = btn("w2o-say-opt");
            put(b, h("span", "w2o-say-emo", SAY[ch.k] || "💬"), h("span", "w2o-say-text", `「${str(ch.text)}」`));
            b.addEventListener("click", (e) => { e.stopPropagation(); pickSay(st, ch, k); });
            return b;
          }));
          say.setAttribute("aria-label", str(st.prompt) || "한마디 고르기");
          say.hidden = false;
          const f0 = say.querySelector("button");
          if (f0) { try { f0.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
          return;
        }
        speaker.textContent = str(st.speaker);
        speaker.hidden = !st.speaker;
        next.hidden = false;
        next.textContent = lastLabel(k);
        typeLine(st.text, st.typed);
        if (st.fx && !reduced() && window.Fx) { try { window.Fx.celebrate(st.fx); } catch { /* 장식이에요 */ } }
      };
      const pickSay = (st, ch, k) => {
        if (said !== undefined) return;
        said = ch.k;
        say.hidden = true;
        say.replaceChildren();
        setFig(st.who, ch.mood || st.mood, st.name);            // 반신 표정이 고른 말투를 따라가요(결의 · 평온 · 웃음)
        speaker.textContent = str(ch.speaker || st.name);
        speaker.hidden = !speaker.textContent;
        next.hidden = false;
        next.textContent = lastLabel(k);
        typeLine(ch.text, true);
        try { next.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
      };
      const advance = () => {
        if (!say.hidden) return;                                // 한마디를 고르는 중엔 판을 눌러도 안 넘어가요
        if (timer) { stopType(); return; }
        i += 1;
        if (i >= steps.length) { s.close(); resolve(said); return; }
        show(i);
      };
      next.addEventListener("click", (e) => { e.stopPropagation(); advance(); });
      /* 대사 판 어디를 눌러도 한 줄 — 비주얼 노블의 손버릇. 🔴 click만 씁니다(pointerdown 금지) */
      panel.addEventListener("click", (e) => { if (!e.target.closest("button, a, input")) advance(); });
      advance();
      s.focus();
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎬 intro — 주 1 「3년 달던 등번호가 1학년 신입에게 넘어갔다」(12번 §3-3 · 29번 §3-2 P1 (가) 「우리 집」 한 곳)
  //   ctx = { who, name, bg, place?, lines: [{ mood, text }], choices: [{ k, text, mood, speaker }] } → 고른 k
  //   lines가 없으면(옛 화면 · 확인 페이지) 아래 기본 줄 — 마지막 한마디는 늘 `choices`에서만 와요
  // ═══════════════════════════════════════════════════════════════
  const HOME = { bg: "bg-home-jiho", where: "치킨집 배달 오토바이 뒤" };
  /* 도입의 **플레이 문장만** 포지션 넷으로 갈립니다 — 그림은 안 갈려요(12번 §3-3) */
  const SPOT = { fw: "골문 앞 그 자리", wg: "측면 끝 그 자리", mf: "중원 한가운데 그 자리", df: "최종 수비 라인 그 자리" };
  function intro(ctx) {
    const c = ctx || {};
    const g = c.gender === "f" ? "f" : "m";
    const who = c.who || `${c.preset || "jiho"}-${g}`;
    const name = c.name || (HERO[c.preset] || HERO.jiho)[g];
    remember(who, c.name);
    /* 🔒 신입의 이름은 **세계가 채우는 틀 자리** `{rival}`(13번 §4-4) — 드라이버가 안 주면 두 세계의 기본 이름 */
    const rival = (c.rival && typeof c.rival === "object" ? c.rival.name : c.rival) || (g === "f" ? "차민서" : "차민재");
    const no = fin(c.no) ? `#${Math.round(+c.no)}` : "등번호";
    const steps = Array.isArray(c.lines) && c.lines.length
      ? c.lines.map((l) => (typeof l === "string" ? { who, name, mood: "surprise", text: l } : Object.assign({ who, name, mood: "surprise" }, l)))
      : [
        { who, mood: "surprise", name, text: `3월 1주 · ${c.place || HOME.where}.\n단톡방에 새 시즌 명단 사진이 올라왔다.` },
        { who, mood: "surprise", name, text: `3년 달던 ${no} — 그 옆에 1학년 「${rival}」.` },
        { who, mood: "fire", name, text: `${SPOT[c.pos] || "내 자리"} — 고3, 마지막 한 해가 시작된다.` },
      ];
    const choices = (Array.isArray(c.choices) ? c.choices : []).filter((x) => x && x.k != null && x.text);
    if (choices.length) steps.push({ who, name, mood: steps[steps.length - 1].mood, choices, prompt: `🗣️ ${name}의 한마디는?` });
    return talk("intro", steps, { bg: c.bg || HOME.bg, label: "🎬 번호를 잃은 날", last: "▶ 36주 시작" });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🗓️ portrait — 홈 위 ⅓(계약 13의 `.w2-portrait`). 배경은 학교 운동장 · 계절 색만 CSS로(12번 §5-2)
  //   o = { who, mood, bg?, name?, week? } — week가 오면 봄 · 여름 · 가을 색을 얹어요
  // ═══════════════════════════════════════════════════════════════
  function portrait(slot, o) {
    if (!slot || !slot.appendChild) return;
    const x = o || {};
    const wk = +x.week;
    remember(x.who, x.name);
    slot.classList.add("w2p");
    slot.dataset.season = x.season || (wk >= 1 ? (wk <= 13 ? "spring" : wk <= 24 ? "summer" : "autumn") : "");
    /* 🔴 `replaceChildren`에 조건부 자식을 그대로 넘기면 null이 글자 "null"로 박힙니다 — 걸러서 넘겨요 */
    slot.replaceChildren(...[bgImg(x.bg || "bg-field"), x.who ? fig(x.who, x.mood, x.name, "w2p-fig") : null].filter(Boolean));
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎲 card — 이벤트 · 이야기 장 · 🤝 사람 · 결과(① 스펙 §6-4 모양 + who · mood · bg · parts — 계약 6)
  // ═══════════════════════════════════════════════════════════════
  const KIND = { try: "도전", safe: "확정", deal: "거래", promise: "약속" };
  const PART = { skill: "실력", sit: "상황", base: "기본" };
  /* 칩 — 받은 모양을 그대로: 글자 · 글자 배열 · { emoji, text, good } 배열. 효과 객체를 **해석하지 않습니다**
   *    (판돈의 뜻은 로직이 글자로 줘야 해요 — 여기서 지어내면 화면과 판정이 갈라질 자리가 생깁니다) */
  function chips(v) {
    const arr = v == null ? [] : Array.isArray(v) ? v : [v];
    return arr.map((c) => (typeof c === "string" ? { text: c } : c && typeof c === "object" && (c.text || c.emoji) ? c : null)).filter(Boolean);
  }
  function chipRow(label, v, cls) {
    const list = chips(v);
    if (!list.length) return null;
    const row = h("span", `w2o-fx ${cls || ""}`);
    if (label) row.appendChild(h("span", "w2o-fx-k", label));
    list.forEach((c) => row.appendChild(h("span", `w2o-chip ${c.good === true ? "good" : c.good === false ? "bad" : "neu"}`,
      `${str(c.emoji)}${c.emoji ? " " : ""}${str(c.text)}`)));
    return row;
  }
  /* 🎯 **보이는 % = 판정 %** — 「기본 50 · 실력 +5 · 상황 −6 → 49%」(23번 §2-1).
   *    조각은 정수이고 합 + 50 = pct예요. 합이 안 맞으면(10~90으로 잘림) 그 사실을 **글로** 적습니다 */
  function partsEl(o, card) {
    const ps = (Array.isArray(o.parts) ? o.parts : Array.isArray(card.parts) ? card.parts : []).filter((p) => p && fin(p.v));
    if (!ps.length) return null;
    const hasBase = ps.some((p) => p.k === "base");
    const bits = (hasBase ? [] : ["기본 50"]).concat(ps.map((p) => `${p.label || PART[p.k] || str(p.k)} ${p.k === "base" ? +p.v : sign(+p.v)}`));
    const sum = ps.reduce((a, p) => a + +p.v, hasBase ? 0 : 50);
    const pct = fin(o.pct) ? +o.pct : sum;
    const el = h("span", "w2o-parts", `${bits.join(" · ")} → ${pct}%`);
    if (sum !== pct) el.appendChild(h("span", "w2o-cut", ` (조각 합 ${sum} · 10~90 사이로 잘림)`));
    return el;
  }
  function sitEl(o, card) {
    const ps = Array.isArray(o.parts) ? o.parts : Array.isArray(card.parts) ? card.parts : [];
    const sit = ps.find((p) => p && p.k === "sit" && p.text);
    return sit ? h("span", "w2o-sit", `🎲 그날의 상황 — ${sit.text}`) : null;
  }
  const refText = (r) => (r && r.text ? `📊 ${r.text}` : !r || !fin(r.of) || +r.of <= 0 ? "📊 기록이 아직 없어요" : `📊 최근 ${+r.of}경기 중 ${fin(r.hit) ? +r.hit : 0}번`);
  /* 판돈 칩 — 로직이 글자로 준 `o.chips.win/lose`가 먼저예요. `o.win/lose`는 **효과 객체**(판정용)라
   *    글자가 아니면 안 그립니다(여기서 효과를 해석해 글로 옮기면 화면과 판정이 갈라질 자리가 생겨요) */
  const stakeOf = (o, side) => (o.chips && o.chips[side]) || o[side];
  function optEl(o, i, card) {
    const k = o.k || "safe";
    const b = btn(`w2o-opt k-${k}`);
    b.dataset.i = String(i);
    const head = h("span", "w2o-opt-head");
    if (o.who) head.appendChild(put(h("span", "w2o-opt-face"), deco(face(o.who, o.mood || "base", o.name))));
    if (KIND[k]) head.appendChild(h("span", "w2o-tag", KIND[k]));
    head.appendChild(h("span", "w2o-opt-label", o.label));
    if (k === "try" && fin(o.pct)) {
      const p = h("span", "w2o-pct", "성공 ");
      p.appendChild(h("b", null, `${+o.pct}%`));
      head.appendChild(p);
    }
    b.appendChild(head);
    if (k === "try") {
      put(b, partsEl(o, card), sitEl(o, card), chipRow("그대로 받는 것", o.fx), chipRow("✅ 성공하면", stakeOf(o, "win"), "win"), chipRow("❌ 실패하면", stakeOf(o, "lose"), "lose"));
    } else if (k === "promise") {
      /* 📋 약속형에는 **% 기호를 쓰지 않습니다**(12번 §6-4) — 근거는 사실 「최근 N경기 중 M번」 */
      const cond = o.condText || (typeof o.cond === "string" ? o.cond : o.cond && o.cond.text) || "";
      put(b, cond ? h("span", "w2o-cond", `📋 약속: ${cond}`) : null,
        o.opp ? h("span", "w2o-opp", `🆚 ${o.opp}${waGwa(o.opp)} 만나는 다음 경기에서 정해요`) : null,
        h("span", "w2o-ref", refText(o.ref)),
        chipRow("✅ 지키면", stakeOf(o, "win"), "win"), chipRow("❌ 못 지키면", stakeOf(o, "lose"), "lose"));
    } else {
      const row = chipRow(k === "deal" ? "주고받는 것" : "받는 것", o.fx);
      put(b, row || (KIND[k] ? h("span", "w2o-none", "아무 일 없이 지나가요") : null));
    }
    if (o.note) b.appendChild(h("span", "w2o-note", o.note));
    if (o.disabled) { b.disabled = true; b.classList.add("is-off"); }
    return b;
  }
  /* 🎲 v4 선택지 셋~넷(47번 §2 · 45번 §5) — 버튼마다 2줄 · 52px: 줄 1 = 종류 + 태도 · 줄 2 = 숫자(% · 몫).
   *    확률 조각은 🎲 둘이 함께 쓰는 바탕을 카드에 **한 줄**, 그 바탕에 없는 조각(🎲 작게의 「작게 +5」)은 그 버튼 안에 —
   *    보이는 조각의 합 = 판정 %. 합이 `p`와 다르면(10~90으로 잘림) 글로 적어요. 종류는 **글 + 테두리 무늬**로(색만으로 안 가름) */
  const CKIND = { big: ["🎲", "크게"], small: ["🎲", "작게"], sure: ["🌿", "확정"], talk: ["💬", "이야기"] };
  const FXN = { cond: ["🫀", "컨디션"], trust: ["🤝", "감독 신뢰"], weak: ["🦶", "약발 경험"] };
  const amt = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v)}`;
  const partName = (p) => str(p.name || p.label || PART[p.k] || p.k);
  /* 몫 칩 — 로직이 글자로 준 `chips.win/lose`가 먼저. 안 왔으면 효과 객체 `{ stat|cond|trust|weak|flag, v }`의 **이름과 값만**
   *    옮겨 적어요(값을 셈하지 않음) */
  function fxChips(o, side) {
    if (o.chips && Array.isArray(o.chips[side])) return o.chips[side];
    const list = o[side] == null ? [] : Array.isArray(o[side]) ? o[side] : [o[side]];
    return list.map((f) => {
      if (!f || typeof f !== "object") return null;
      if (f.flag) return { emoji: "🔖", text: "이야기 한 줄", good: true };
      if (f.stat && STAT[f.stat] && fin(f.v)) return { emoji: STAT[f.stat][0], text: `${STAT[f.stat][1]} ${amt(+f.v)}`, good: +f.v > 0 };
      const k = Object.keys(FXN).find((n) => n in f);
      if (!k) return null;
      const v = fin(f.v) ? +f.v : typeof f[k] === "number" ? f[k] : null;   // `{ trust: true, v }` — 값은 `v`(true를 1로 읽지 않게)
      return v == null ? null : { emoji: FXN[k][0], text: `${FXN[k][1]} ${amt(v)}`, good: v > 0 };
    }).filter(Boolean);
  }
  const chipText = (list) => chips(list).map((c) => `${str(c.emoji)}${c.emoji ? " " : ""}${str(c.text)}`).join(" · ");
  const isDice = (o) => o && (o.kind === "big" || o.kind === "small");
  const isOdds = (o) => isDice(o) && fin(o.p);                 // 🎲 % 판정
  const isProm = (o) => isDice(o) && !fin(o.p);                // 📋 약속(`p` null — 다음 경기의 기록이 정함 · % 기호 없음)
  const goodParts = (o) => (Array.isArray(o.parts) ? o.parts : []).filter((p) => p && fin(p.v));
  /* 바탕 조각 줄 — 첫 🎲 크게(없으면 첫 🎲)의 조각 중 「작게」가 아닌 것 · 그날의 상황 글이 있으면 같이 */
  function baseParts(list) {
    const src = list.find((o) => isOdds(o) && o.kind === "big" && goodParts(o).length) || list.find((o) => isOdds(o) && goodParts(o).length);
    if (!src) return { names: [], el: null };
    const ps = goodParts(src).filter((p) => !/작게|small/.test(partName(p)));
    const sum = ps.reduce((a, p) => a + +p.v, 50);
    /* 「→ N%」는 그 합이 **어느 선택지의 %와 같을 때만**(🎲 크게가 없거나 잘렸으면 바탕 조각만) — 카드에 없는 % 숫자 0 */
    const shown = list.some((o) => isOdds(o) && +o.p === sum);
    const box = h("p", "w2o-cparts");
    box.appendChild(h("span", "w2o-parts", `🎲 ${["기본 50"].concat(ps.map((p) => `${partName(p)} ${sign(+p.v)}`)).join(" · ")}${shown ? ` → ${sum}%` : ""}`));
    const sit = goodParts(src).find((p) => p.text);
    if (sit) box.appendChild(h("span", "w2o-sit", ` · ${str(sit.text)}`));
    return { names: ps.map(partName), el: box };
  }
  function choiceEl(o, i, base) {
    const kind = CKIND[o.kind] ? o.kind : "sure";
    const prom = isProm(o);
    const [emo, word] = prom ? ["📋", kind === "small" ? "약속 · 작게" : "약속"] : CKIND[kind];
    const b = btn(`w2o-opt w2o-ch c-${kind}${prom ? " c-prom" : ""}`);
    b.dataset.i = String(i);
    const l1 = h("span", "w2o-ch-l1");
    put(l1, h("span", "w2o-ch-tag", `${emo} ${word}`), h("span", "w2o-opt-label", o.label));
    const l2 = h("span", "w2o-ch-l2");
    let spoken = "";
    if (isDice(o) && fin(o.p)) {
      const ps = goodParts(o);
      const extra = ps.filter((p) => base.names.indexOf(partName(p)) < 0);
      const sum = ps.reduce((a, p) => a + +p.v, 50);
      const pe = h("b", "w2o-ch-p", `${+o.p}%`);
      l2.appendChild(pe);
      const ex = extra.map((p) => `${partName(p)} ${sign(+p.v)}`).join(" · ");
      if (ex) l2.appendChild(h("span", "w2o-ch-ex", `(${ex})`));
      if (ps.length && sum !== +o.p) l2.appendChild(h("span", "w2o-cut", `(조각 합 ${sum} · 10~90 사이로 잘림)`));
      const win = chipText(fxChips(o, "win")), lose = chipText(fxChips(o, "lose"));
      /* 「⚽ 슈팅 +1 / −1」 — 같은 칸이면 이름을 한 번만(45번 §5 · 두 줄에 들어가게) */
      const head = /^(.*\S)\s[+−][\d.]+$/.exec(win), tail = /^(.*\S)\s([+−][\d.]+)$/.exec(lose);
      const both = head && tail && head[1] === tail[1] ? `${win} / ${tail[2]}` : `${win || "—"} / ${lose || "—"}`;
      if (win || lose) l2.appendChild(h("span", "w2o-ch-fx", both));
      spoken = `${word} · 성공 ${+o.p}%${ex ? `(${ex})` : ""} · 성공하면 ${win || "변화 없음"} · 실패하면 ${lose || "변화 없음"}`;
    } else if (prom) {
      /* 📋 약속 — % 기호 0(12번 §6-4) · 근거는 `desc`(「최근 N경기 중 M번 해냈어요」) · 판돈은 지키면 / 못 지키면 */
      const win = chipText(fxChips(o, "win")), lose = chipText(fxChips(o, "lose"));
      const head = /^(.*\S)\s[+−][\d.]+$/.exec(win), tail = /^(.*\S)\s([+−][\d.]+)$/.exec(lose);
      if (win || lose) l2.appendChild(h("span", "w2o-ch-fx", head && tail && head[1] === tail[1] ? `${win} / ${tail[2]}` : `${win || "—"} / ${lose || "—"}`));
      spoken = `${word} · 다음 경기의 기록이 정해요 · 지키면 ${win || "변화 없음"} · 못 지키면 ${lose || "변화 없음"}`;
    } else {
      const got = chipText(fxChips(o, "win"));
      if (!/^확정/.test(str(o.desc))) l2.appendChild(h("b", "w2o-ch-sure", "확정"));   // `desc`가 「확정 · 문」이면 두 번 안 적어요
      if (got) l2.appendChild(h("span", "w2o-ch-fx", got));
      spoken = `${word} · 확정${got ? ` · ${got}` : ""}`;
    }
    /* `desc` — 약속(「최근 N경기 중 M번」) · 확정(「확정 · 문」)은 둘째 줄 앞에. 🎲 %는 꼬리표 · 숫자가 이미 말해서 낭독에만 */
    if (o.desc && !isOdds(o)) l2.insertBefore(h("span", "w2o-ch-desc", `${prom ? "📊 " : ""}${str(o.desc)}`), l2.firstChild);
    put(b, l1, l2, o.note ? h("span", "w2o-note", o.note) : null);
    b.setAttribute("aria-label", `${i + 1}번 — ${str(o.label)} · ${o.desc ? `${str(o.desc)} · ` : ""}${spoken}${o.note ? ` · ${str(o.note)}` : ""}`);
    if (o.disabled) { b.disabled = true; b.classList.add("is-off"); }
    return b;
  }
  function card(c) {
    return run(() => new Promise((resolve) => {
      const x = c || {};
      remember(x.who, x.name);
      const choices = Array.isArray(x.choices) ? x.choices.filter((o) => o && o.label) : [];
      const s = shell(choices.length >= 3 ? "card w2o-many" : "card");
      const panel = h("div", "w2o-panel");
      const opts = Array.isArray(x.opts) ? x.opts : [];
      const result = x.ok === true ? " is-ok" : x.ok === false ? " is-bad" : "";
      panel.className = `w2o-panel${result}`;
      /* 머리 한 줄 — 로직이 안 주면 카드 종류(`kind`)로 붙여요(무슨 장인지가 첫 줄에 보이게) */
      const kicker = x.kicker || (x.kind === "story" && fin(x.ch) ? `📖 이야기 · ${+x.ch}장`
        : x.kind === "story-end" ? "📖 이야기의 끝" : x.kind === "event" ? "🎲 이번 주의 일" : "");
      put(panel,
        kicker ? h("p", "w2o-kicker", kicker) : null,
        title("h2", "w2o-title", x.title || kicker || "이번 주", s.id),
        x.body ? h("p", `w2o-body${choices.length >= 3 ? " w2o-clamp" : ""}`, x.body) : null,
        x.line ? h("p", "w2o-body w2o-line2", x.line) : null,        // 📖 결말 글(story-end)
        chipRow("", x.chips, "w2o-result-fx"));                       // 결과로 받은 것(「⚽ 슈팅 +1」)
      const box = h("div", "w2o-opts");
      let done = false;
      const finish = (i) => {
        if (done) return;
        done = true;
        box.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        s.close();
        resolve(i);
      };
      /* [확인] 하나(`{ k: "ok" }`)는 선택지가 아니라 **닫는 버튼**으로 — 카드처럼 그리면 고를 것이 있는 줄 알아요 */
      const lone = opts.length === 1 && opts[0] && opts[0].k === "ok";
      if (choices.length) {
        const base = baseParts(choices);
        if (base.el) panel.appendChild(base.el);
        box.setAttribute("role", "group");
        box.setAttribute("aria-label", `선택지 ${choices.length}개 — 키보드 1~${choices.length}`);
        choices.forEach((o, i) => box.appendChild(choiceEl(o, i, base)));
        /* ⌨️ 1~N — 카드가 떠 있는 동안만(입력 칸이 없는 레이어라 숫자 키를 빼앗을 곳이 없어요) */
        s.root.addEventListener("keydown", (e) => {
          if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || !/^[1-9]$/.test(e.key)) return;
          const t = box.querySelectorAll("button")[Number(e.key) - 1];
          if (t && !t.disabled) { e.preventDefault(); t.click(); }
        });
      } else if (opts.length && !lone) {
        opts.forEach((o, i) => box.appendChild(optEl(o || {}, i, x)));
      } else {
        const b = btn("btn btn-primary w2o-ok", (lone && opts[0].label) || x.okLabel || "확인");
        b.addEventListener("click", () => finish(0));
        box.appendChild(b);
      }
      /* 👆 선택지는 `click`으로만 풀려요(새 · 옛 모양 같은 한 줄 — pointerdown에서 화면을 갈지 않음 · ① 교훈) */
      if (choices.length || (opts.length && !lone)) {
        box.querySelectorAll("button.w2o-opt").forEach((b) => {
          const i = Number(b.dataset.i);
          b.addEventListener("click", () => finish(i));
        });
      }
      panel.appendChild(box);
      const hasTry = opts.some((o) => o && o.k === "try") || choices.some(isOdds);
      const hasPromise = opts.some((o) => o && o.k === "promise") || choices.some(isProm);
      if (hasTry || hasPromise) {
        const foot = h("p", "w2o-foot");
        if (hasTry) foot.appendChild(h("span", null, "📐 적힌 확률이 그대로 판정이에요 — 숨은 보정은 없어요"));
        if (hasPromise) foot.appendChild(h("span", null, "📋 약속은 확률이 아니라 다음 경기의 기록이 정해요"));
        panel.appendChild(foot);
      }
      put(s.box, scene(x.bg || "bg-field", x.who, x.mood, x.name), panel);
      /* 본문 두 줄 — 넘칠 때만 「…더 보기」(누르면 펼침 · 낭독은 늘 전문) */
      const body = panel.querySelector(".w2o-clamp");
      if (body && body.scrollHeight > body.clientHeight + 1) {
        const more = btn("w2o-more", "…더 보기");
        more.setAttribute("aria-hidden", "true");
        more.tabIndex = -1;
        more.addEventListener("click", () => { body.classList.remove("w2o-clamp"); more.remove(); });
        body.after(more);
      }
      s.focus();
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 grade — 「⚽ 슈팅 C → C+」 승급 카드(경기 연출 스킬 §9 · 12번 §5-2). 연속 수치를 **문턱으로 끊어** 감정으로
  // ═══════════════════════════════════════════════════════════════
  function grade(g) {
    return run(() => new Promise((resolve) => {
      const x = g || {};
      const s = shell("grade");
      const st = STAT[x.k] || ["⭐", ""];
      const label = str(x.label || st[1]);
      const head = label.indexOf(st[0]) >= 0 ? label : `${st[0]} ${label}`.trim();
      const to = str(x.to);
      const top = /^S/.test(to);
      const cardEl = h("div", `w2o-grade-card${top ? " is-s" : ""}`);
      const row = h("p", "w2o-grade-row");
      const toEl = h("b", "w2o-grade-to", to);
      put(row, h("b", "w2o-grade-from", x.from), h("span", "w2o-grade-arr", "→"), toEl);
      const ok = btn("btn btn-primary w2o-ok", "좋아요!");
      put(cardEl, title("h2", "w2o-grade-k", `${head} 승급`, s.id), row,
        h("p", "w2o-grade-sub", top ? "S — 이 칸의 끝에 닿았어요!" : "등급이 한 칸 올랐어요"), ok);
      s.box.appendChild(cardEl);
      let done = false;
      ok.addEventListener("click", () => { if (done) return; done = true; s.close(); resolve(); });
      if (!reduced() && window.Fx) {
        try { if (top) window.Fx.celebrate("awaken", null, toEl); else window.Fx.burst(toEl, "✨", 10); } catch { /* 장식이에요 */ }
      }
      s.focus();
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // 📋 sheet — 평가서(계약 7 · 7′). 중간 평가서는 **그 시점의 사실만**(12번 §6-4 — 11월 예측 · 확률 없음)
  //   { final, cols: [{ k, label, v, max, note, open?, left? }], total, tier, T?, doors?, memo?, coach?, week? }
  //   중간(final: false)은 구간 도장 대신 **11월 문턱 자** — 채운 칸 = 지금 합 · 빗금 = 아직 안 한 칸의 **최대**(36번 §6)
  // ═══════════════════════════════════════════════════════════════
  const COL_EMO = { body: "🏋️", care: "🫀", skill: "🎮", record: "⚽", stage: "🏆", test: "🎯" };   // 🫀 관리 — 옛 🎮 솜씨 자리(44번 7′) · 옛 세이브의 얼린 평가서는 `skill` 그대로라 둘 다 받아요
  /* 📏 11월 문턱 자(36번 §6-2) — 문턱 셋은 **규칙**(✉️ 「이 문은 「상」일 때 열려요」와 같은 종류의 사실) ·
   *    채운 칸 = 지금 합 · 빗금 = 아직 안 한 칸의 **최대**. 🔒 예측 0 — 「보통은 몇 점」 · 「닿을 확률」을 안 적어요.
   *    자의 양끝은 문턱 셋과 지금 합이 다 들어오게 10점 단위로 잡고 글자로 적어요(줄인 자임을 숨기지 않게) */
  function ruler(total, open, T, max) {
    const marks = [["mid", "중"], ["high", "상"], ["top", "최상"]].filter(([k]) => fin(T[k])).map(([k, n]) => [n, +T[k]]);
    if (!marks.length) return null;
    const lo = Math.max(0, Math.floor((Math.min(total, marks[0][1]) - 10) / 10) * 10);
    const hi = Math.min(max > 0 ? max : 100, Math.ceil((Math.max(total + open, marks[marks.length - 1][1]) + 5) / 10) * 10);
    if (!(hi > lo)) return null;
    const at = (v) => ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100;
    const box = h("div", "w2o-ruler");
    const track = h("div", "w2o-ruler-track");
    track.setAttribute("aria-hidden", "true");                 // 같은 말을 아래 글이 해요(보이는 값 = 들리는 값)
    const fillEl = h("i", "w2o-ruler-fill");
    fillEl.style.width = `${at(total).toFixed(2)}%`;
    track.appendChild(fillEl);
    if (open > 0) {
      const hatch = h("b", "w2o-ruler-open");
      hatch.style.left = `${at(total).toFixed(2)}%`;
      hatch.style.width = `${(at(total + open) - at(total)).toFixed(2)}%`;
      track.appendChild(hatch);
    }
    marks.forEach(([n, v]) => {
      const m = h("span", "w2o-ruler-mark");
      m.style.left = `${at(v).toFixed(2)}%`;
      m.appendChild(h("b", null, n));
      track.appendChild(m);
    });
    const ends = put(h("div", "w2o-ruler-ends"), h("span", null, String(lo)), h("span", null, String(hi)));
    ends.setAttribute("aria-hidden", "true");
    put(box, h("p", "w2o-ruler-k", "📏 11월 문턱 자"), track, ends,
      h("p", "w2o-ruler-text", `지금까지 ${n1(total)}점 · 아직 안 한 칸 최대 ${n1(open)}점 · 11월 문턱 — ${marks.map(([n, v]) => `${n} ${n1(v)}`).join(" · ")}`));
    return box;
  }
  /* 칸 이름 — 로직이 이모지를 붙여 주면(「🏋️ 몸」) 그대로, 아니면 여기서 붙여요(두 번 안 붙게) */
  const colLabel = (c) => { const l = str(c.label), e = COL_EMO[c.k]; return e && l.indexOf(e) < 0 ? `${e} ${l}` : l; };
  function sheet(sh) {
    return run(() => new Promise((resolve) => {
      const x = sh || {};
      const mid = x.final != null ? !x.final : x.mid === true || (fin(x.week) && +x.week < 36);
      const tk = mid ? "" : tierKey(x.tier);              // 🔒 중간 평가서엔 구간 이름 0 — 일부 칸으로 매긴 이름은 「지금 나는 하」로 읽혀요
      const s = shell("sheet");
      const panel = h("div", "w2o-panel w2o-sheet-panel");
      put(panel,
        h("p", "w2o-kicker", x.title ? `${x.title}${mid && fin(x.week) ? ` · ${+x.week}주` : ""}` : mid ? `📋 중간 평가서${fin(x.week) ? ` · ${+x.week}주` : ""}` : "📋 스카우트 평가서"),
        title("h2", "w2o-title", mid ? "지금까지 채운 칸이에요" : "문 스카우트의 평가서", s.id));
      const cols = Array.isArray(x.cols) ? x.cols : [];
      const list = h("div", "w2o-cols");
      const ratio = (a, b) => (b ? Math.max(0, Math.min(1, a / b)) : 0);
      let openSum = 0, maxSum = 0;
      cols.forEach((c, i) => {
        const max = fin(c.max) && +c.max > 0 ? +c.max : 0;
        const v = fin(c.v) ? +c.v : 0;
        const open = mid && fin(c.open) && +c.open > 0 ? +c.open : 0;   // 아직 안 한 칸이 줄 수 있는 **최대**(규칙 — 기댓값 아님)
        openSum += open;
        maxSum += max;
        const row = h("div", `w2o-col${open ? " is-open" : ""}`);
        row.style.setProperty("--d", `${i * 180}ms`);
        const bar = h("span", "w2o-bar");
        const fill = h("i");
        fill.style.transform = `scaleX(${ratio(v, max).toFixed(3)})`;
        bar.appendChild(fill);
        if (open && max) {                                         // 빗금 — 0점 막대와 다르게(무늬 + 글 · 색만으로 안 가름)
          const hatch = h("b", "w2o-hatch");
          hatch.style.left = `${(ratio(v, max) * 100).toFixed(2)}%`;
          hatch.style.width = `${(ratio(Math.min(open, max - v), max) * 100).toFixed(2)}%`;
          bar.appendChild(hatch);
        }
        bar.setAttribute("aria-hidden", "true");
        const vt = open ? (v ? `${n1(v)} / ${max} · +${n1(open)} 아직` : `아직 · 최대 ${n1(open)}`) : max ? `${n1(v)} / ${max}` : n1(v);
        put(row, h("span", "w2o-col-k", colLabel(c)), bar, h("span", "w2o-col-v", vt),
          c.note ? h("span", "w2o-col-note", c.note) : null,
          /* 🗓️ 몸 칸 — 11월 공개 테스트까지 남은 훈련 주(사실 · 점수 0 — 38번 계약 7′ · 15번 R21) */
          mid && fin(c.left) ? h("span", "w2o-col-left", +c.left > 0 ? `🗓️ 11월까지 훈련 ${Math.round(+c.left)}주 남음` : "🗓️ 이제 11월 테스트만 남았어요") : null);
        list.appendChild(row);
      });
      if (mid && !openSum && x.open && typeof x.open === "object") openSum = Object.values(x.open).reduce((a, v) => a + (fin(v) ? +v : 0), 0);
      panel.appendChild(list);
      const sum = h("div", `w2o-total t-${tk || "none"}`);
      sum.style.setProperty("--d", `${cols.length * 180 + 150}ms`);
      if (mid) {
        put(sum, fin(x.total) ? h("span", "w2o-total-n", `지금까지 ${n1(x.total)}`) : null,
          openSum ? h("span", "w2o-total-open", `아직 안 한 칸 최대 +${n1(openSum)}`) : null);
      } else {
        put(sum, fin(x.total) ? h("span", "w2o-total-n", `합계 ${n1(x.total)}`) : null,
          tierName(x.tier) ? h("b", "w2o-stamp", `구간 「${tierName(x.tier)}」`) : null);
      }
      panel.appendChild(sum);
      if (mid && x.T && fin(x.total)) {
        const r = ruler(+x.total, openSum, x.T, maxSum);
        if (r) { r.style.setProperty("--d", `${cols.length * 180 + 300}ms`); panel.appendChild(r); }
      }
      /* 📝 감독 의견 — 🤝은 1막 높이에 안 닿는다는 것을 **숨기지 않고** 옆에 적어요(23번 §7) */
      if (x.coach && x.coach.line) {
        const co = h("p", "w2o-coach");
        put(co, h("span", "w2o-coach-k", "📝 감독 의견"), h("span", "w2o-coach-line", `「${x.coach.line}」`), h("span", "w2o-zero", "점수 0"));
        panel.appendChild(co);
      }
      /* ✉️ 이 구간이 여는 제안 — 닫힌 문은 **왜 닫혔는지 지어내지 않고** 닫혔다는 사실만(12번 §6-4) */
      if (Array.isArray(x.doors) && x.doors.length) {
        const dl = h("ul", "w2o-doorinfo");
        dl.appendChild(h("li", "w2o-doorinfo-k", "✉️ 이 구간의 제안"));
        x.doors.forEach((d) => dl.appendChild(h("li", d.open === false ? "" : "is-open", `${d.open === false ? "🔒" : "•"} ${str(d.label)}${d.open === false ? " — 닫힌 문" : ""}`)));
        panel.appendChild(dl);
      }
      const memo = x.memo || (mid ? "11월엔 달라질 수 있어요 — 🏋️ 몸 · 🫀 관리 · ⚽ 기록은 지금까지의 값이고, 빗금은 아직 안 한 칸이 줄 수 있는 최대예요" : "");
      if (memo) panel.appendChild(h("p", "w2o-memo", memo));
      const ok = btn("btn btn-primary w2o-ok", "다음 ▶");
      panel.appendChild(ok);
      let done = false;
      ok.addEventListener("click", () => { if (done) return; done = true; s.close(); resolve(); });
      const good = !mid && (tk === "top" || tk === "high");
      put(s.box, scene(x.bg || "bg-test", "scout", x.scoutMood || (good ? "smile" : "base")), panel);
      s.focus();
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // ✉️ doors — 「제안이 두 장 왔어요」(12번 §6-2). 고르고 → [이 길로] 한 번 더(되돌릴 수 없는 선택이라)
  // ═══════════════════════════════════════════════════════════════
  function doors(list) {
    return run(() => new Promise((resolve) => {
      const arr = (Array.isArray(list) ? list : []).filter((d) => d && d.id != null);
      const s = shell("doors");
      const panel = h("div", "w2o-panel");
      put(panel, h("p", "w2o-kicker", "✉️ 같은 높이의 두 번째 제안"), title("h2", "w2o-title", "제안이 두 장 왔어요", s.id),
        h("p", "w2o-body", "둘 다 평가서가 연 문이에요. 높이는 같고, 길이 달라요."));
      const box = h("div", "w2o-doorlist");   // 🔴 루트가 `w2o-doors`라 같은 이름을 쓰면 루트가 격자가 됩니다
      const go = btn("btn btn-primary w2o-ok", "이 길로 간다");
      go.disabled = true;
      let sel = null, done = false;
      arr.forEach((d) => {
        const b = btn("w2o-door");
        b.setAttribute("aria-pressed", "false");
        const off = d.open === false;
        if (off) { b.disabled = true; b.classList.add("is-off"); }
        put(b, h("span", "w2o-door-env", off ? "🔒" : "✉️"), h("span", "w2o-door-label", d.label),
          d.sub ? h("span", "w2o-door-sub", d.sub) : null);
        b.addEventListener("click", () => {
          if (done || off) return;
          sel = d.id;
          box.querySelectorAll(".w2o-door").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          go.disabled = false;
        });
        box.appendChild(b);
      });
      go.addEventListener("click", () => { if (done || sel == null) return; done = true; s.close(); resolve(sel); });
      put(panel, box, go);
      put(s.box, scene("bg-test"), panel);
      s.focus();
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎓 ending — { id, tier, next, lines, name?, gender?, who?, whoName? }(계약 8). 엔딩 배경 한 장 + 반신(12번 §9-6)
  // ═══════════════════════════════════════════════════════════════
  const END = {
    pro1: { e: "🏟️", m: "우선지명", f: "드래프트 1순위", mood: "smile", fx: "ending" },
    abroad: { e: "🌏", m: "바다 건너 첫 계약", f: "바다 건너 첫 계약", mood: "moved", fx: "ending" },
    pro2: { e: "🏟️", m: "2부의 부름", f: "드래프트의 부름", mood: "smile" },
    univ: { e: "🎓", m: "두 번째 운동장", f: "두 번째 운동장", mood: "moved" },
    trainee: { e: "🌱", m: "번외의 계약", f: "번외의 계약", mood: "smile" },
    semi: { e: "🏭", m: "아버지의 운동장", f: "아버지의 운동장 — 그 공장에 새로 생긴 여자팀", mood: "moved" },
    /* 🎒 벌이 아닌 결말(12번 §6-3) — 앞 장은 아쉬움, 끝 장은 벅참. 가장 낮은 구간이 가장 초라한 화면이면
     *    다시 하기가 아니라 그만두기가 됩니다 */
    leave: { e: "🎒", m: "공을 내려놓은 날", f: "공을 내려놓은 날", mood: "moved", first: "down" },
  };
  function endName(x) {
    const E = END[x.id] || {};
    const g = x.gender === "f" || x.gender === "m" ? x.gender : null;
    return x.name || (g ? E[g] : E.m === E.f ? E.m : "") || "";
  }
  function ending(en) {
    const x = en || {};
    const E = END[x.id] || { e: "🎓", mood: "moved" };
    const lines = (Array.isArray(x.lines) ? x.lines : []).map(str).filter(Boolean);
    const nm = endName(x);
    const head = h("div", "w2o-end-title");
    put(head, h("span", "w2o-end-emo", E.e), h("b", null, nm || "1막의 끝"),
      tierName(x.tier) ? h("span", "w2o-end-tier", `평가서 「${tierName(x.tier)}」`) : null,
      x.wait ? h("span", "w2o-end-next", str(x.wait)) : x.next ? h("span", "w2o-end-next", "🔜 이 선수는 2막을 기다려요") : null);   // `wait`은 완성 줄 — 앞에 아무것도 안 붙여요
    const steps = (lines.length ? lines : ["1막이 끝났어요."]).map((t, i, a) => ({
      who: x.who || null, name: x.whoName, text: t, typed: true,
      mood: E.first && i < a.length - 1 ? E.first : x.mood || E.mood,
      fx: i === 0 && E.fx ? E.fx : null,
    }));
    return talk("ending", steps, { bg: x.bg || `end-${x.id}`, label: `🎓 ${E.e} ${nm || "엔딩"}`, head, last: "🎬 졸업 필름 ▶" });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎬 film — 졸업 필름(12번 §7-6 · 계약 8). **있는 만큼만** 그립니다(「없다」와 「0이었다」를 같은 얼굴로 두지 않음)
  //   모델은 `W2Film.build(S)` 그대로 — { head, ch: [{ k: cover|spring|summer|autumn|body|choice|story|sheet|last, … }], word }
  //   장의 순서는 **로직이 준 순서**예요(여기서 섞지 않음). 모르는 k는 제목 · bg · lines만 그립니다
  // ═══════════════════════════════════════════════════════════════
  const WORD_MAX = 40;
  function chapter(cls, head) {
    const sec = h("section", `w2f-ch ${cls || ""}`);
    if (head) sec.appendChild(h("h3", "w2f-h", head));
    return sec;
  }
  function numsEl(arr) {
    const list = arr.filter(([, v]) => fin(v));
    if (!list.length) return null;
    const dl = h("dl", "w2f-nums");
    list.forEach(([label, v]) => put(dl, put(h("div"), h("dt", null, label), h("dd", null, n1(v)))));
    return dl;
  }
  const endOf = (hd) => (hd && hd.ending && typeof hd.ending === "object" ? hd.ending : { id: hd && hd.ending });
  function filmCover(c, hd) {
    const sec = h("header", "w2f-cover");
    const en = endOf(hd);
    const nm = en.name || endName({ id: en.id, gender: hd.gender });
    const text = h("div", "w2f-cover-text");
    put(text, h("p", "w2f-kick", c.title || "🎬 졸업 필름"),
      h("h2", "w2f-name", hd.name || "선수"),
      h("p", "w2f-meta", [fin(hd.no) ? `#${+hd.no}` : "", hd.posName || POS[hd.pos] || "", hd.school || ""].filter(Boolean).join(" · ")),
      nm ? h("p", "w2f-end", `${(END[en.id] || {}).e || "🎓"} ${nm}`) : null,
      hd.tierName || tierName(hd.tier) ? h("p", "w2f-tier", `평가서 「${hd.tierName || tierName(hd.tier)}」`) : null);
    const who = c.who || hd.who;
    put(sec, bgImg(c.bg || "bg-gate"), who ? fig(who, c.mood || "moved", hd.name, "w2f-fig") : null, text);
    return sec;
  }
  /* 🌸☀️🍂 한 철 — 전적 · ⚽🅰️🧱 · 가장 좋았던 경기 · (여름) 도달 · 승부차기 · (가을) 🕯️ 마지막 경기 */
  function filmSeason(c) {
    const sec = chapter("w2f-season");
    put(sec, put(h("div", "w2f-ch-top"), bgImg(c.bg), h("h3", "w2f-h", c.title || "📅 한 철")));
    if (fin(c.games)) sec.appendChild(h("p", "w2f-line", `${+c.games}경기 · ${+c.w || 0}승 ${+c.d || 0}무 ${+c.l || 0}패`));
    const nums = numsEl([["⚽ 골", c.g], ["🅰️ 도움", c.a], ["🧱 막음", c.def]]);
    if (nums) sec.appendChild(nums);
    if (c.stageName) sec.appendChild(h("p", "w2f-line", `🏆 ${c.stageName}`));
    if (c.pk && fin(c.pk.n)) sec.appendChild(h("p", "w2f-line", `🥅 승부차기 내 킥 ${+c.pk.goal || 0} / ${+c.pk.n}`));
    const b = c.best;
    if (b) {
      sec.appendChild(h("p", "w2f-line w2f-best", `⭐ 가장 좋았던 경기 — ${[b.date, b.opp ? `🆚 ${b.opp}` : "",
        fin(b.gf) && fin(b.ga) ? `${+b.gf} : ${+b.ga}` : "", fin(b.r) ? `평점 ${(+b.r).toFixed(1)}` : ""].filter(Boolean).join(" · ")}`));
    }
    if (c.keeper) sec.appendChild(h("p", "w2f-line", c.keeper));
    (Array.isArray(c.lines) ? c.lines : []).forEach((l) => sec.appendChild(h("p", "w2f-line", l)));
    return sec;
  }
  /* 💪 몸의 기록 — 3월 vs 11월 레이더 두 겹(`radar.js` — 공유 파일, 읽기만) + 같은 숫자를 표로(♿ 낭독은 표를 읽음) */
  /* 캔버스는 CSS 변수를 못 읽어요 — 계산된 값(#rrggbb)에 투명도를 붙여 씁니다(절대색을 JS에 박지 않게) */
  function alpha(col, a) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(col).trim());
    if (!m) return col;
    const x = m[1].length === 3 ? m[1].split("").map((d) => d + d).join("") : m[1];
    return `rgba(${parseInt(x.slice(0, 2), 16)}, ${parseInt(x.slice(2, 4), 16)}, ${parseInt(x.slice(4, 6), 16)}, ${a})`;
  }
  function filmBody(c, after) {
    const ups = (Array.isArray(c.ups) ? c.ups : []).filter((u) => u && u.k);
    const sec = chapter("w2f-body", c.title || "💪 몸의 기록");
    if (ups.length) {
      const from = {}, to = {};
      ups.forEach((u) => { from[u.k] = +u.from || 0; to[u.k] = +u.to || 0; });
      const two = ups.some((u) => fin(u.from));
      const rd = h("div", "w2f-radar");
      const cTo = h("canvas", "w2f-radar-to");
      cTo.width = 260; cTo.height = 240; cTo.setAttribute("aria-hidden", "true");
      rd.appendChild(cTo);
      let cFrom = null;
      if (two) { cFrom = h("canvas", "w2f-radar-from"); cFrom.width = 260; cFrom.height = 240; cFrom.setAttribute("aria-hidden", "true"); rd.appendChild(cFrom); }
      sec.appendChild(rd);
      if (two) sec.appendChild(h("p", "w2f-legend", "◇ 옅은 선 = 3월 · ◆ 채운 면 = 11월"));
      const tb = h("table", "w2f-stats");
      const hr = h("tr");
      put(hr, h("th", null, "능력치"), h("th", null, "3월"), h("th", null, "11월"));
      put(tb, put(h("thead"), hr));
      const body = h("tbody");
      ups.forEach((u) => {
        const tr = h("tr");
        const th = h("th", null, `${str(u.emoji)} ${str(u.label)}`.trim());
        th.scope = "row";
        const cell = (v, g) => h("td", null, fin(v) ? `${Math.round(+v)}${g ? ` ${g}` : ""}` : "—");
        put(tr, th, cell(u.from, u.g0), cell(u.to, u.g1));
        if (u.g0 && u.g1 && u.g0 !== u.g1) tr.classList.add("is-up");
        body.appendChild(tr);
      });
      tb.appendChild(body);
      sec.appendChild(tb);
      const defs = ups.map((u) => ({ key: u.k, emoji: str(u.emoji), name: str(u.label) }));
      after.push(() => {
        if (!window.Radar) return;
        const cs = getComputedStyle(document.documentElement);
        const v = (k, d) => (cs.getPropertyValue(k) || "").trim() || d;
        const acc = v("--accent", "#ff9f45"), dim = v("--dim", "#96a5d2");
        try {
          window.Radar.draw(cTo, defs, to, { max: 100, stroke: acc, fill: alpha(acc, 0.24), label: v("--text", "#e9eeff"), grid: alpha(v("--cream", "#eaf0ff"), 0.14) });
          if (cFrom) window.Radar.draw(cFrom, defs, from, { max: 100, stroke: dim, fill: alpha(dim, 0.1), label: "transparent", grid: "transparent" });
        } catch { /* 그림이 없어도 표가 있어요 */ }
      });
    }
    /* 🔒 두 줄은 23번 §8의 자리 — 테스터가 읽어 알려 주는 숫자(「훈련 N주 · 휴식 M주」 · 「판 N번 · 평균 s̄ 0.00」) */
    (Array.isArray(c.lines) ? c.lines : []).forEach((l) => sec.appendChild(h("p", "w2f-fact", l)));
    return sec;
  }
  function filmChoice(c) {
    const sec = chapter("w2f-pick", c.title || "🧭 선택의 기록");
    let any = false;
    if (c.style && c.style.name) { any = true; put(sec, put(h("p", "w2f-style"), h("b", null, c.style.name), c.style.line ? h("span", null, c.style.line) : null)); }
    const b = c.best;
    if (b && b.name) { any = true; sec.appendChild(h("p", "w2f-fact", `🎯 최고의 한 수 — ${b.name}, 성공 확률 ${fin(b.pct) ? +b.pct : "?"}%였어요${fin(b.w) && +b.w > 0 ? ` (${+b.w}주)` : ""}`)); }
    const l = c.luck;
    if (l && fin(l.n) && +l.n > 0) { any = true; sec.appendChild(h("p", "w2f-fact", `🍀 보인 확률대로면 ${n1(l.exp)}번, 실제로 ${+l.got || 0}번 성공했어요 (도전 ${+l.n}번)`)); }
    if (!any) sec.appendChild(h("p", "w2f-empty", "확률이 걸린 결정이 없었어요"));
    return sec;
  }
  function filmStory(c) {
    const e = (Array.isArray(c.ends) ? c.ends : []).filter((z) => z && z.name);
    if (!e.length) return null;
    const sec = chapter("w2f-ends", c.title || "📖 이야기");
    const ul = h("ul", "w2f-list");
    e.forEach((z) => ul.appendChild(h("li", null, `${str(z.emoji || "📖")} ${z.story ? `${z.story} — ` : ""}「${z.name}」`)));
    sec.appendChild(ul);
    return sec;
  }
  function sheetTable(sh) {
    const cols = Array.isArray(sh.cols) ? sh.cols : [];
    const tb = h("table", "w2f-ptable");
    const body = h("tbody");
    cols.forEach((c) => {
      const tr = h("tr");
      const th = h("th", null, colLabel(c));
      th.scope = "row";
      put(tr, th, h("td", null, fin(c.max) ? `${n1(c.v)} / ${+c.max}` : n1(c.v)));
      body.appendChild(tr);
    });
    tb.appendChild(body);
    if (fin(sh.total)) {
      const tr = h("tr");
      const tn = sh.tierName || tierName(sh.tier);
      const th = h("th", null, `합계${tn ? ` · 「${tn}」` : ""}`);
      th.scope = "row";
      put(tr, th, h("td", null, n1(sh.total)));
      tb.appendChild(put(h("tfoot"), tr));
    }
    return tb;
  }
  function filmSheet(c) {
    if (!Array.isArray(c.cols) || !c.cols.length) return null;
    const sec = chapter("w2f-sheet");
    const d = h("details", "w2f-parts");
    put(d, h("summary", "w2f-h", `${c.title || "📋 평가서"} — 눌러서 펼쳐요`), sheetTable(c));
    sec.appendChild(d);
    return sec;
  }
  const RARE = { "흔함": ["⚪", "r1"], "드묾": ["🔵", "r2"], "귀함": ["🟣", "r3"], "전설": ["🟡", "r4"] };
  function rareTag(t) {
    const r = RARE[t];
    return r ? h("span", `w2-rare ${r[1]}`, `${r[0]} ${t}`) : null;
  }
  const SHARE_MSG = {
    share: "📤 공유 창을 열었어요", download: "⬇️ 이미지를 내려받았어요",
    image: "🖼️ 이미지를 길게 눌러 저장하세요", fail: "이미지를 만들지 못했어요 — 잠시 뒤 다시 눌러 주세요", cancel: "",
  };
  function film(f) {
    return run(() => new Promise((resolve) => {
      const x = f || {};
      const hd = x.head || {};
      remember(hd.who, hd.name);
      const chs = Array.isArray(x.ch) ? x.ch.filter(Boolean) : [];
      const last = chs.find((c) => c.k === "last") || {};
      const s = shell("film");
      const after = [];
      s.box.appendChild(title("h2", "w2o-label", "🎬 졸업 필름", s.id));
      if (!chs.some((c) => c.k === "cover")) s.box.appendChild(filmCover({}, hd));
      chs.forEach((c) => {
        const el = c.k === "cover" ? filmCover(c, hd)
          : c.k === "spring" || c.k === "summer" || c.k === "autumn" ? filmSeason(c)
            : c.k === "body" ? filmBody(c, after)
              : c.k === "choice" ? filmChoice(c)
                : c.k === "story" ? filmStory(c)
                  : c.k === "sheet" ? filmSheet(c)
                    : c.k === "last" ? null
                      : filmSeason(c);                         // 모르는 장 — 제목 · 배경 · lines만
        if (el) s.box.appendChild(el);
      });
      // 🎬 마지막 장 — 엔딩 배경 + 반신 · 🏅 대표 업적 · 🖊️ 한마디 · 📤 공유 · 🔁 새 선수
      const lastSec = chapter("w2f-last");
      const who = last.who || hd.who;
      put(lastSec, put(h("div", "w2f-last-top"), bgImg(last.bg || "bg-gate"),
        who ? fig(who, last.mood || "moved", hd.name, "w2f-fig") : null,
        h("h3", "w2f-h", last.title || "🎬 마지막 장")));
      if (last.line) lastSec.appendChild(h("p", "w2f-next", str(last.line)));   // 이모지까지 든 완성 줄(「🎓 대학 리그에서 2막을 기다려요」)
      if (last.year) lastSec.appendChild(h("p", "w2f-year", str(last.year)));   // 🔖 「그해, …」 한 줄(v4 깃발 — 없으면 null)
      /* 🏅 대표 업적 — 딴 업적 **목록**(이름 · 희귀도)이 와야 고를 수 있어요. 목록이 없으면 이 칸을 안 그립니다
       *    (id만으로는 이름을 모르고, 모르는 것을 지어내 그리지 않아요) */
      const achs = (Array.isArray(x.ach) ? x.ach : Array.isArray(last.ach) ? last.ach : []).filter((a) => a && a.id != null && a.name);
      let rep = last.rep || hd.rep || (achs[0] && achs[0].id) || null;
      if (achs.length) {
        lastSec.appendChild(h("h4", "w2f-h4", "🏅 대표 업적"));
        const group = h("div", "w2f-reps");
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", "대표 업적 고르기");
        achs.forEach((a) => {
          const b = btn("w2f-rep");
          b.setAttribute("aria-pressed", String(a.id === rep));
          put(b, rareTag(a.tier), h("span", "w2f-rep-name", a.name));
          b.addEventListener("click", () => {
            rep = a.id;
            group.querySelectorAll(".w2f-rep").forEach((z) => z.setAttribute("aria-pressed", String(z === b)));
          });
          group.appendChild(b);
        });
        lastSec.appendChild(group);
      }
      const wl = h("label", "w2f-h4", "🖊️ 마지막으로 한마디");
      const input = h("input", "w2f-word");
      input.type = "text";
      input.maxLength = WORD_MAX;
      input.autocomplete = "off";
      input.id = `${s.id}-word`;
      wl.htmlFor = input.id;
      input.placeholder = "예) 마지막 한 해, 후회 없이 뛰었다";
      input.value = str(x.word);
      put(lastSec, wl, input, h("p", "w2f-note", "필름과 공유 이미지에 함께 남아요 · 안 써도 괜찮아요"));
      const acts = h("div", "w2f-acts");
      const shareB = btn("btn btn-ghost", "📤 공유 이미지");
      const newB = btn("btn btn-primary", "🔁 새 선수 키우기");
      const closeB = btn("btn btn-ghost", "닫기");
      const st = h("p", "w2f-share-st");
      st.setAttribute("role", "status");
      put(acts, shareB, newB, closeB);
      put(lastSec, acts, st);
      s.box.appendChild(lastSec);
      const model = () => Object.assign({}, x, { rep, word: input.value.trim() || null, ach: achs });
      shareB.addEventListener("click", () => {
        shareB.disabled = true;
        st.textContent = "🖼️ 이미지를 만드는 중이에요…";
        share(model()).then((how) => { st.textContent = SHARE_MSG[how] || ""; })
          .catch(() => { st.textContent = SHARE_MSG.fail; })
          .then(() => { shareB.disabled = false; });
      });
      let done = false;
      const finish = (go) => {
        if (done) return;
        done = true;
        s.close();
        resolve({ rep, word: input.value.trim() || null, go });
      };
      newB.addEventListener("click", () => finish("new"));
      closeB.addEventListener("click", () => finish("close"));
      after.forEach((fn) => fn());
      s.focus();
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // 📖 book — 도감(12번 §7-7): 🎲 이벤트 · 📖 이야기 · 🎓 엔딩 · 🏅 업적 · 📐 판정 규칙
  //   못 본 칸은 「???」 — 엔딩 칸에는 힌트 한 줄(「다른 주인공의 문」 — 결정 C)
  // ═══════════════════════════════════════════════════════════════
  const TABS = [["ev", "🎲", "이벤트"], ["story", "📖", "이야기"], ["end", "🎓", "엔딩"], ["ach", "🏅", "업적"], ["rules", "📐", "규칙"]];
  const seen = (z) => !!(z && (z.got || z.seen || (fin(z.n) && +z.n > 0)));
  function tally(arr) {
    const a = Array.isArray(arr) ? arr : [];
    return h("p", "w2b-count", `${a.filter(seen).length} / ${a.length}`);
  }
  function bookPane(x, k) {
    const pane = h("div", "w2b-pane");
    const ul = h("ul", "w2b-list");
    if (k === "ev") {
      pane.appendChild(tally(x.ev));
      (x.ev || []).forEach((z) => ul.appendChild(seen(z)
        ? h("li", "is-seen", `${str(z.emoji || "🎲")} ${str(z.name)}${fin(z.n) && +z.n > 1 ? ` ×${+z.n}` : ""}`)
        : h("li", "is-unseen", "❔ ??? — 아직 못 본 장면")));
    } else if (k === "story") {
      (x.story || []).forEach((st) => {
        const li = h("li", "w2b-story");
        li.appendChild(h("b", null, `${str(st.emoji || "📖")} ${str(st.name)}`));
        const ends = h("ul", "w2b-ends");
        (st.ends || []).forEach((e) => ends.appendChild(seen(e) || e.name && e.name !== "???" && !("n" in e)
          ? h("li", "is-seen", `「${str(e.name)}」`) : h("li", "is-unseen", "「???」")));
        li.appendChild(ends);
        ul.appendChild(li);
      });
    } else if (k === "end") {
      pane.appendChild(tally(x.end));
      /* 🎓 졸업 사진 — 주인공 × 성별 여섯 판(업적 `six` · `trio`의 자리) */
      if (Array.isArray(x.grads)) pane.appendChild(h("p", "w2b-sub w2b-grads", `🎓 졸업 사진 ${x.grads.length} / 6${x.grads.length ? ` — ${x.grads.map((w) => { const [p, g] = String(w).split("-"); return `${(HERO[p] || {})[g] || p}(${WORLD[g] || "?"})`; }).join(" · ")}` : ""}`));
      (x.end || []).forEach((e) => {
        const E = END[e.id] || {};
        if (seen(e)) {
          const g = Array.isArray(e.g) ? e.g.map((w) => WORLD[w]).filter(Boolean).join(" · ") : "";
          const li = h("li", "is-seen", `${E.e || str(e.emoji) || "🎓"} ${str(e.name || E.m)}`);
          if (g) li.appendChild(h("span", "w2b-sub", `${g}에서 봤어요`));
          ul.appendChild(li);
        } else {
          const li = h("li", "is-unseen", "🎓 ???");
          if (e.hint) li.appendChild(h("span", "w2b-sub", e.hint));
          ul.appendChild(li);
        }
      });
    } else if (k === "ach") {
      pane.appendChild(tally(x.ach));
      (x.ach || []).forEach((a) => {
        const li = h("li", seen(a) ? "is-seen" : "is-unseen");
        put(li, rareTag(a.tier), h("b", null, str(a.name)), a.cond ? h("span", "w2b-sub", a.cond) : null);
        ul.appendChild(li);
      });
    } else {
      (x.rules || []).forEach((r) => ul.appendChild(h("li", "w2b-rule", r)));
    }
    if (!ul.children.length) pane.appendChild(h("p", "w2b-empty", "아직 적힌 게 없어요"));
    else pane.appendChild(ul);
    return pane;
  }
  function book(b) {
    return run(() => new Promise((resolve) => {
      const y = b || {};
      /* 칸 이름 — `game.js`는 `events · stories · endings`로 넘겨요(짧은 이름 `ev · story · end`도 받아요) */
      const x = Object.assign({}, y, { ev: y.ev || y.events, story: y.story || y.stories, end: y.end || y.endings });
      const s = shell("book");
      const head = h("div", "w2o-head");
      put(head, title("h2", "w2o-title", "📖 도감", s.id), h("p", "w2o-sub", "주인공과 판을 넘어 이 기기에 쌓여요"));
      const tabs = h("div", "w2b-tabs");
      tabs.setAttribute("role", "tablist");
      const pane = h("div", "w2b-panel");
      pane.setAttribute("role", "tabpanel");
      pane.id = `${s.id}-pane`;
      let cur = TABS.some(([k]) => k === x.tab) ? x.tab : "ev";
      const draw = () => {
        tabs.querySelectorAll("[role=tab]").forEach((t) => {
          const on = t.dataset.k === cur;
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          if (on) pane.setAttribute("aria-labelledby", t.id);
        });
        pane.replaceChildren(bookPane(x, cur));
      };
      TABS.forEach(([k, emo, label], i) => {
        /* 📱 다섯 칸을 한 줄에 — 320px에서 가로로 밀리지 않게 그림 위 · 글자 아래 두 줄로 */
        const t = btn("w2b-tab");
        const ico = h("span", "w2b-ico", emo);
        ico.setAttribute("aria-hidden", "true");
        put(t, ico, h("span", null, label));
        t.setAttribute("role", "tab");
        t.setAttribute("aria-controls", pane.id);
        t.id = `${s.id}-tab${i}`;
        t.dataset.k = k;
        t.addEventListener("click", () => { cur = k; draw(); });
        tabs.appendChild(t);
      });
      /* ♿ 탭 목록의 좌우 화살표 — 표준 탭 키보드 */
      tabs.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const i = TABS.findIndex(([k]) => k === cur);
        cur = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
        draw();
        const t = tabs.querySelector(`[data-k="${cur}"]`);
        if (t) t.focus();
      });
      const closeB = btn("btn btn-primary w2o-ok", "닫기");
      let done = false;
      closeB.addEventListener("click", () => { if (done) return; done = true; s.close(); resolve(); });
      put(s.box, head, tabs, pane, closeB);
      draw();
      s.focus();
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // 📤 공유 이미지 — 1080×1350 · 런타임 Canvas 2D(① 스펙 §5-7). 1막은 **반신 한 장**이 들어가요(12번 §7-6)
  //   → 그리기 전에 그림을 기다립니다(상한 1.5초 — 못 받으면 그림 없이)
  // ═══════════════════════════════════════════════════════════════
  const CW = 1080, CH = 1350, PAD = 80;
  const FT = (px) => `${px}px "Jua", "Gowun Dodum", sans-serif`;
  const FB = (px) => `${px}px "Gowun Dodum", sans-serif`;
  function palette() {
    let cs = null;
    try { cs = getComputedStyle(document.documentElement); } catch { /* 없을 때 */ }
    const v = (k, d) => ((cs && cs.getPropertyValue(k)) || "").trim() || d;
    return { bg: v("--bg", "black"), bg2: v("--bg2", "black"), field: v("--field", "black"), line: v("--line", "gray"),
      accent: v("--accent", "orange"), sky: v("--sky", "white"), text: v("--text", "white"), dim: v("--dim", "gray"), cream: v("--cream", "white") };
  }
  function loadImg(src, ms) {
    return new Promise((ok) => {
      if (!src) { ok(null); return; }
      const i = new Image();
      const t = setTimeout(() => ok(null), ms);
      i.onload = () => { clearTimeout(t); ok(i); };
      i.onerror = () => { clearTimeout(t); ok(null); };
      i.src = src;
    });
  }
  function waitFonts(ms) {
    try {
      if (!document.fonts || !document.fonts.load) return Promise.resolve();
      return Promise.race([Promise.all([document.fonts.load(FT(64)), document.fonts.load(FB(32))]), new Promise((r) => setTimeout(r, ms))]);
    } catch { return Promise.resolve(); }
  }
  const graphemes = (s) => {
    try { if (window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(s), (z) => z.segment); } catch { /* 없으면 코드포인트 */ }
    return Array.from(s);
  };
  /* 폭을 재서 자르고 말줄임 — 글자 수가 아니라 폭(이름 · 한마디는 플레이어 글자라 길이를 모릅니다) */
  function clip(ctx, s, maxW) {
    s = str(s);
    if (ctx.measureText(s).width <= maxW) return s;
    const g = graphemes(s);
    let lo = 0, hi = g.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ctx.measureText(`${g.slice(0, mid).join("")}…`).width <= maxW) lo = mid; else hi = mid - 1;
    }
    return `${g.slice(0, lo).join("").trimEnd()}…`;
  }
  function fitText(ctx, s, font, big, small, maxW) {
    for (let px = big; px >= small; px -= 4) { ctx.font = font(px); if (ctx.measureText(s).width <= maxW) return s; }
    ctx.font = font(small);
    return clip(ctx, s, maxW);
  }
  function rr(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hh, r);
    ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  /* 숫자 — 철(봄 · 여름 · 가을) 장의 합. 🔒 **없으면 null**(그리지 않음) — 0으로 채우면 「없다」가 「0이었다」가 돼요 */
  const SEASONS = ["spring", "summer", "autumn"];
  function sumOf(x, k) {
    const ch = (Array.isArray(x.ch) ? x.ch : []).filter((c) => c && SEASONS.indexOf(c.k) >= 0);
    return ch.some((c) => fin(c[k])) ? ch.reduce((a, c) => a + (fin(c[k]) ? +c[k] : 0), 0) : null;
  }
  async function drawCard(canvas, f) {
    const x = f || {};
    const hd = x.head || {};
    if (!canvas) return canvas;
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return canvas;
    const A = art();
    const en = endOf(hd);
    const chs = Array.isArray(x.ch) ? x.ch : [];
    const last = chs.find((c) => c && c.k === "last") || {};
    const [bg, who] = await Promise.all([
      loadImg(A ? A.bg(last.bg || (en.id ? `end-${en.id}` : "bg-gate")) || A.bg("bg-gate") : null, 1500),
      loadImg(A && (last.who || hd.who) ? A.src(last.who || hd.who, last.mood || "moved") : null, 1500),
      waitFonts(1200),
    ]);
    const P = palette();
    const IW = CW - PAD * 2;
    // 배경 — 장면 사진을 위 절반에, 아래로 테마 남색이 덮어요
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, CW, CH);
    if (bg) {
      const s = Math.max(CW / bg.width, (CH * 0.62) / bg.height);
      ctx.drawImage(bg, (CW - bg.width * s) / 2, 0, bg.width * s, bg.height * s);
    }
    /* 🖼️ 반신은 그라데이션 **앞에** 그립니다 — 뒤에 그리면 반신이 글자 판까지 내려와 이름 · 번호 줄이
     *    저지 위에 얹혀 안 읽혔어요(진짜 게임 데이터로 렌더해서 봄). 허리 아래는 남색 판으로 녹아요 */
    if (who) {
      const hh = CH * 0.6, ww = hh * (who.width / who.height);
      ctx.drawImage(who, CW - ww - 10, CH * 0.06, ww, hh);
    }
    const fade = ctx.createLinearGradient(0, CH * 0.36, 0, CH * 0.6);
    fade.addColorStop(0, alpha(P.bg, 0));
    fade.addColorStop(1, P.bg);
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, CW, CH);
    /* 위쪽 그늘 — 로고 줄이 밝은 하늘에 묻히지 않게 */
    const top = ctx.createLinearGradient(0, 0, 0, 240);
    top.addColorStop(0, alpha(P.bg, 0.6));
    top.addColorStop(1, alpha(P.bg, 0));
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, CW, 240);
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 4;
    rr(ctx, 30, 30, CW - 60, CH - 60, 36);
    ctx.stroke();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    /* 로고 줄은 **하늘 그림 위**라 글자에 그림자를 한 겹 — 밝은 하늘에 앰버가 묻혀요(렌더로 봄) */
    ctx.shadowColor = "rgba(0, 0, 0, .6)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = P.accent;
    ctx.font = FT(44);
    ctx.fillText("⚽ 더 윙어 II", PAD, 100);
    ctx.fillStyle = P.cream;
    ctx.font = FB(30);
    ctx.fillText("1막 · 마지막 한 해 — 졸업", PAD, 148);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    // 아래 판 — 이름 · 번호 · 엔딩 · 평가서 · 숫자 · 대표 업적 · 한마디
    /* 📏 세로 예산(1350): 이름 790 · 번호 874 · 엔딩 940 · 평가서 998 · 숫자 1056~1112 · 업적 1192 · 한마디 1246 · 주소 1290
     *    — 처음엔 0.64에서 시작해 한마디가 테두리 밖(1358)으로 나가고 업적 줄이 주소와 겹쳤어요(렌더로 봄) */
    let y = 790;
    ctx.fillStyle = P.text;
    const name = fitText(ctx, str(hd.name || "선수"), FT, 120, 64, IW);
    ctx.fillText(name, PAD, y);
    y += 84;
    ctx.fillStyle = P.sky;
    ctx.font = FB(40);
    ctx.fillText(clip(ctx, [fin(hd.no) ? `#${+hd.no}` : "", hd.posName || POS[hd.pos] || "", hd.school || ""].filter(Boolean).join(" · "), IW), PAD, y);
    const nm = en.name || endName({ id: en.id, gender: hd.gender });
    if (nm) {
      y += 66;
      ctx.fillStyle = P.accent;
      const t = fitText(ctx, `${(END[en.id] || {}).e || "🎓"} ${nm}`, FT, 56, 36, IW);
      ctx.fillText(t, PAD, y);
    }
    const sh = chs.find((c) => c && c.k === "sheet") || {};
    const tn = hd.tierName || sh.tierName || tierName(hd.tier);
    if (tn || fin(sh.total)) {
      y += 58;
      ctx.fillStyle = P.cream;
      ctx.font = FB(36);
      ctx.fillText(clip(ctx, [tn ? `평가서 「${tn}」` : "", fin(sh.total) ? `${n1(sh.total)}점` : ""].filter(Boolean).join(" · "), IW), PAD, y);
    }
    const cells = [["경기", sumOf(x, "games")], ["⚽", sumOf(x, "g")], ["🅰️", sumOf(x, "a")], ["🧱", sumOf(x, "def")]].filter(([, v]) => v != null);
    if (cells.length) {
      y += 84;
      const cw = IW / cells.length;
      cells.forEach(([k, v], i) => {
        ctx.textAlign = "center";
        ctx.fillStyle = P.dim;
        ctx.font = FB(30);
        ctx.fillText(k, PAD + cw * i + cw / 2, y - 26);
        ctx.fillStyle = P.text;
        ctx.font = FT(64);
        ctx.fillText(String(Math.round(v)), PAD + cw * i + cw / 2, y + 30);
      });
      ctx.textAlign = "left";
      y += 64;
    }
    const repA = (Array.isArray(x.ach) ? x.ach : []).find((a) => a && a.id === (x.rep || hd.rep));
    if (repA && repA.name) {
      y += 46;
      ctx.fillStyle = P.accent;
      ctx.font = FT(40);
      ctx.fillText(clip(ctx, `🏅 ${repA.name}`, IW), PAD, y);
    }
    if (x.word) {
      y += 54;
      ctx.fillStyle = P.cream;
      ctx.font = FB(34);
      ctx.fillText(clip(ctx, `🖊️ “${x.word}”`, IW), PAD, y);
    }
    ctx.fillStyle = P.dim;
    ctx.font = FB(26);
    ctx.textAlign = "center";
    try { ctx.fillText((location.host + location.pathname).replace(/\/beta\//, "/").replace(/index\.html$/, ""), CW / 2, CH - 60); } catch { /* 주소 없이 */ }
    return canvas;
  }
  /* 내보내기 — ① 공유 시트 → ② 내려받기 → ③ 이미지 오버레이(길게 눌러 저장). 실패는 삼키지 않고 "fail"로 */
  async function share(f) {
    const canvas = document.createElement("canvas");
    await drawCard(canvas, f);
    let blob = null;
    try { blob = await new Promise((r) => canvas.toBlob(r, "image/png")); } catch { blob = null; }
    const nm = `the-winger2-${str((f && f.head && f.head.name) || "film").replace(/[\\/:*?"<>|\s]+/g, "_")}.png`;
    if (blob && typeof File === "function" && navigator.canShare) {
      try {
        const file = new File([blob], nm, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: "더 윙어 II — 졸업 필름" }); return "share"; } catch (e) { if (e && e.name === "AbortError") return "cancel"; }
        }
      } catch { /* 다음 방법으로 */ }
    }
    if (blob) {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = nm;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return "download";
      } catch { /* 다음 방법으로 */ }
    }
    let dataUrl = null;
    try { dataUrl = canvas.toDataURL("image/png"); } catch { return "fail"; }
    /* 🔴 여기서는 줄(`run`)을 안 탑니다 — 필름 오버레이가 **열린 채로** 부르는 자리라, 줄을 서면
     *    필름이 닫힐 때까지 영영 안 뜹니다(서로를 기다림). 필름 **위에** 한 겹 얹어요 */
    await new Promise((resolve) => {
      const s = shell("shot");
      const img = h("img", "w2o-shot-img");
      img.alt = "졸업 필름 공유 이미지";
      img.src = dataUrl;
      const ok = btn("btn btn-primary w2o-ok", "닫기");
      ok.addEventListener("click", () => { s.close(); resolve(); });
      put(s.box, title("h2", "w2o-title", "🖼️ 이미지를 길게 눌러 저장하세요", s.id), img, ok);
      s.focus();
    });
    return "image";
  }

  // ═══════════════════════════════════════════════════════════════
  // ⚙️ settings — 어디서나 버튼 하나 · 한 화면(29번 §4 · 38번 계약 14 · 17 · §6 14-a)
  //   부르는 것은 넷뿐: `W2Game.settings`(list · on · set · wipe) · `W2Game.help()` · `Cloud.openModal` ·
  //   (베타만) `W2Game.boardStats()`. 🔒 키 이름 · 적용 시점 · 지우기 목록은 engineer 소유 — 여기는 그리기만
  // ═══════════════════════════════════════════════════════════════
  const SHARED_NOTE = "🔗 이 기기의 다른 그로우 게임에도 같이 적용돼요";
  const G = () => window.W2Game || null;
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  /* 🔬 베타 측정(44번 §2-17 · 42번 §5) — 손으로 둔 판만(🤖 빼고) · 이 기기 누적 · 판 종류마다 `{ n, msSum, cells[6] }`만.
   *    판정 0 — 판 시간 · 고른 칸의 쏠림을 보는 칸이에요. **베타가 아니면 칸 0**.
   *    📋 한 줄 글 = 사람이 읽는 요약 + `raw`(boardStats 그대로 — 숫자가 어긋날 자리를 안 만들어요) */
  function betaBox(status) {
    const g = G();
    if (!(window.GROW_ENV && window.GROW_ENV.beta) || !g || typeof g.boardStats !== "function") return null;
    const box = h("section", "w2s-sec w2s-beta");
    let st = null;
    try { st = g.boardStats(); } catch (e) { console.error(e); }
    const t = st && typeof st === "object" ? st : {};
    const B = t.block || {}, Sh = t.shot || {}, C = t.cut || {};
    const n = (v) => (fin(v) ? +v : 0);
    const sec = (ms, cnt) => (n(cnt) ? `${(n(ms) / n(cnt) / 1000).toFixed(2)}초` : "—");
    /* 고른 칸 여섯(1~6번) — 가장 많이 고른 칸은 같은 수면 앞 번호(쏠림이 없으면 「고르게」) */
    const cellsOf = (x) => [0, 1, 2, 3, 4, 5].map((i) => n(Array.isArray(x.cells) ? x.cells[i] : 0));
    const row = (x) => {
      const c = cellsOf(x), top = Math.max(...c);
      const most = !n(x.n) ? "" : c.every((v) => v === top) ? " · 고르게" : ` · 가장 많이 ${c.indexOf(top) + 1}번`;
      return `${n(x.n)}판 · 고름 평균 ${sec(x.msSum, x.n)} · 칸 ${c.join("·")}${most}`;
    };
    const rows = [["🥅 슈팅", row(Sh)], ["🅰️ 컷백", row(C)], ["🧱 막기", row(B)]];
    const dl = h("dl", "w2s-stats");
    rows.forEach(([k, v]) => put(dl, put(h("div"), h("dt", null, k), h("dd", null, v))));
    const line = `더윙어II 베타측정 ${today()} | ${rows.map(([k, v]) => `${k} ${v}`).join(" | ")} | raw ${JSON.stringify({ block: B, shot: Sh, cut: C })}`;
    const out = h("textarea", "w2s-copytext");
    out.readOnly = true;
    out.rows = 4;
    out.value = line;
    out.hidden = true;
    out.setAttribute("aria-label", "베타 측정 한 줄 — 골라 두었어요");
    const copy = btn("w2-btn w2s-copy", "📋 복사");
    copy.addEventListener("click", async () => {
      let ok = false;
      try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(line); ok = true; } } catch { ok = false; }
      if (ok) { status.textContent = "📋 베타 측정을 복사했어요"; return; }
      out.hidden = false;                                          // 클립보드가 막히면 글을 골라 둬요(계약 17)
      try { out.focus({ preventScroll: true }); out.select(); } catch { /* 옛 브라우저 */ }
      status.textContent = "📋 복사가 막혔어요 — 글을 골라 두었어요. 길게 눌러 복사해 주세요";
    });
    put(box, h("h3", "w2s-h", "🔬 베타 측정"),
      h("p", "w2s-desc", "손으로 둔 판만 모아요(🤖 자동 빼고 · 이 기기 누적) — 고르는 시간과 고른 칸(1~6번)만 세요. 결과엔 안 닿아요"),
      dl, copy, out);
    return box;
  }
  function settings() {
    return run(() => new Promise((resolve) => {
      const S = SET();
      const s = shell("settings");
      const panel = h("div", "w2o-panel w2s-panel");
      const closeBtn = btn("w2-btn w2s-close", "닫기");
      const head = put(h("div", "w2s-head"), title("h2", "w2o-title", "⚙️ 설정", s.id), closeBtn);
      const status = h("p", "w2s-status");
      status.setAttribute("role", "status");
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        document.removeEventListener("keydown", onKey, true);
        s.close();
        resolve();
      };
      function onKey(e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(); } }
      /* 칸 — `list()`가 준 순서 · 문구 그대로. 바꾼 뒤엔 `on(k)`을 다시 읽어 실제 값을 그려요(저장이 막힌 기기) */
      const list = h("div", "w2s-sec w2s-list");
      const sws = [];
      let items = [];
      try { items = S && typeof S.list === "function" ? S.list() : []; } catch (e) { console.error(e); }
      (Array.isArray(items) ? items : []).forEach((it, idx) => {
        if (!it || it.k == null || it.applies === false) return;   // `applies: false` — 이 게임엔 닿는 곳이 없는 칸(♿ 판정 넓게 — 44번 §2-14) · 공유 키 값은 안 건드려요
        const id = `w2s-${seq}-${idx}`;
        const row = h("label", `w2s-row${it.locked ? " is-locked" : ""}`);
        row.htmlFor = id;
        const txt = h("span", "w2s-text");
        const desc = h("span", "w2s-desc", str(it.desc));
        desc.id = `${id}-d`;
        put(txt, h("b", "w2s-label", str(it.label)), desc,
          it.applies ? h("span", "w2s-applies", `⏱️ ${str(it.applies)}`) : null,
          it.shared ? h("span", "w2s-shared", SHARED_NOTE) : null,
          it.locked ? h("span", "w2s-locked", "🔒 기기 설정으로 켜져 있어요") : null);
        const sw = h("input", "w2s-switch");
        sw.type = "checkbox";
        sw.id = id;
        sw.setAttribute("role", "switch");
        sw.setAttribute("aria-describedby", desc.id);
        sw.checked = !!it.on;
        sw.disabled = !!it.locked;
        sw.addEventListener("change", () => {
          const want = sw.checked;
          let ok = true;
          try { S.set(it.k, want); } catch (e) { console.error(e); ok = false; }
          let now = want;
          try { now = !!S.on(it.k); } catch { /* 읽지 못하면 고른 값 그대로 */ }
          sw.checked = now;
          status.textContent = ok && now === want
            ? `${str(it.label)} — ${now ? "켰어요" : "껐어요"}${it.applies ? `(${str(it.applies)})` : ""}`
            : `${str(it.label)} — 바꾸지 못했어요(이 기기에 저장할 수 없어요)`;
          if (it.k === "still") syncStill();
        });
        sws.push([it.k, sw]);
        /* 진짜 checkbox가 56×44 누르는 칸을 덮고(투명), 보이는 막대 · 손잡이는 옆 그림이에요(어느 브라우저에서도 같은 모양) */
        const track = h("i", "w2s-track");
        track.setAttribute("aria-hidden", "true");
        put(row, txt, put(h("span", "w2s-sw"), sw, track));
        list.appendChild(row);
      });
      if (!sws.length) list.appendChild(h("p", "w2s-desc", "설정을 불러오지 못했어요 — 새로고침해 주세요"));
      /* 🔗 · 🔐 · ❓ — 연동 모달 · 도움말은 이 레이어를 닫은 뒤 열어요(겹친 오버레이 아래로 숨지 않게) */
      const links = h("div", "w2s-sec w2s-links");
      const link = (text, sub, fn) => {
        const b = btn("w2s-link");
        put(b, h("b", null, text), sub ? h("span", null, sub) : null);
        if (fn) b.addEventListener("click", () => { finish(); try { fn(); } catch (e) { console.error(e); } });
        else { b.disabled = true; b.setAttribute("aria-disabled", "true"); }
        return b;
      };
      if (window.Cloud && typeof window.Cloud.openModal === "function") links.appendChild(link("🔗 기록 연동", "다른 기기로 옮기거나 백업해요", () => window.Cloud.openModal()));
      links.appendChild(link("🔐 로그인", "준비 중이에요(구글 로그인)", null));
      if (G() && typeof G().help === "function") links.appendChild(link("❓ 도움말", "판 · 평가서 · 설정을 한곳에서 봐요", () => G().help()));
      const beta = betaBox(status);
      /* 🗑️ 지우기 — 확인 두 번 · 두 번째 버튼은 **다른 자리**(연타로 지나가지 않게 — 29번 §4-5) */
      let wipe = null;
      if (S && typeof S.wipe === "function") {
        wipe = h("section", "w2s-sec w2s-wipe");
        const first = btn("w2-btn w2s-wipe-go", "🗑️ 이 기기의 더 윙어 II 기록 지우기");
        const ask = h("div", "w2s-ask");
        ask.hidden = true;
        const no = () => { ask.hidden = true; ask.replaceChildren(); first.hidden = false; try { first.focus({ preventScroll: true }); } catch { /* */ } };
        const step = (q, yesText, yesFirst, onYes) => {
          const yes = btn("w2-btn w2s-yes", yesText);
          const back = btn("w2-btn w2s-no", "그만두기");
          yes.addEventListener("click", onYes);
          back.addEventListener("click", no);
          const row = put(h("div", `w2s-ask-row${yesFirst ? " is-flip" : ""}`), ...(yesFirst ? [yes, back] : [back, yes]));
          ask.replaceChildren(h("p", "w2s-q", q), row);
          ask.hidden = false;
          try { back.focus({ preventScroll: true }); } catch { /* */ }
        };
        first.addEventListener("click", () => {
          first.hidden = true;
          step("이 기기의 더 윙어 II 기록(진행 중인 판 · 졸업생 · 졸업 필름 · 도감)을 지울까요?", "지우기", false, () => {
            step("되돌릴 수 없어요. 정말 지울까요?", "정말 지우기", true, () => {
              let gone = null;
              try { gone = S.wipe(); } catch (e) { console.error(e); }
              ask.hidden = true;
              ask.replaceChildren();
              first.hidden = false;
              status.textContent = gone ? "지웠어요 — 🔗 기록 연동에 올려 둔 사본은 남아 있어요" : "지우지 못했어요 — 이 기기에 저장할 수 없는 상태예요";
              sws.forEach(([k, sw]) => { try { sw.checked = !!S.on(k); } catch { /* */ } });
              syncStill();
              const nb = betaBox(status);
              const ob = panel.querySelector(".w2s-beta");
              if (ob && nb) ob.replaceWith(nb);
            });
          });
        });
        put(wipe, first, ask);
      }
      put(panel, head, status, list, links, beta, wipe);
      s.box.appendChild(panel);
      closeBtn.addEventListener("click", finish);
      s.root.addEventListener("click", (e) => { if (e.target === s.root || e.target === s.box) finish(); });   // 바깥 탭
      document.addEventListener("keydown", onKey, true);
      const f0 = list.querySelector("input:not([disabled])") || closeBtn;
      try { f0.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
    }));
  }
  /* ⚙️ 버튼 — 화면 맨 위 오른쪽 · 44px(페이지와 함께 스크롤 — 내린 화면의 버튼을 덮지 않게). 판이 열려 있거나
   *    오버레이가 떠 있으면 숨기고(style.css) 눌러도 안 열어요. 경기 화면은 스코어보드 안 ⚙️(match-scene.js) */
  function gear() {
    if (!document.getElementById("w2") || document.getElementById("w2-gear")) return;
    const b = btn("w2s-gear", "⚙️");
    b.id = "w2-gear";
    b.setAttribute("aria-label", "설정");
    b.addEventListener("click", () => {
      if (document.querySelector(".w2m-ready, .w2m-board, #w2-layer .w2o")) return;
      try { b.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }   // 닫으면 여기로 포커스가 돌아와요(29번 §4-5)
      settings();
    });
    document.body.appendChild(b);
    syncStill();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", gear);
  else gear();

  return { pick, intro, portrait, card, grade, sheet, doors, ending, film, book, drawCard, share, settings };
})();
