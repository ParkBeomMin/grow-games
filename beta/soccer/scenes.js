/* 🎬 더 윙어 ① — 선택 이벤트 · 📖 도감 · 🏅 업적 · 🎬 은퇴 필름 · 📤 공유 이미지 · 🔢 등번호 **화면**
 *
 * 이 파일은 **그리기만** 해요. 결과는 로직 모듈(events·story·book·achieve·film)이 만들고,
 * 여기서는 받은 값을 그대로 그립니다 — 다시 계산하지 않아요.
 *   · 오버레이의 「성공 62%」는 S.ev.opts[i].pct 그 필드예요. 판정도 같은 필드를 읽어요
 *   · 누르면 WingerEvents.answer(i) 하나만 불러요. 효과·저장·기록·연출 줄 세우기는 거기서 해요
 *   · 약속형은 % 가 아니라 「최근 10경기 중 N번」(ref) — % 기호를 안 써요
 *
 * 지키는 것
 *   · 남이 올린 글자(명전 이름·한마디·클럽 이름)와 선수 이름은 그리는 자리에서 esc로 씻어요
 *   · 버튼은 진짜 <button>, 화면 교체는 click에서만 — pointerdown에서 화면을 갈면
 *     손을 뗄 때 click이 새로 그린 요소로 가서 두 번 먹혀요
 *   · 모달은 한 번에 하나 — 다른 레이어(📨 초대장 · 🎉 피버 …)가 떠 있으면 닫힐 때까지 기다려요
 *   · 색만으로 가르지 않아요 — 희귀도·성공/실패·고른 것에 글자를 같이 붙여요
 *   · 움직임은 transform·opacity만, prefers-reduced-motion이면 style.css가 꺼요(글자는 그대로)
 *
 * 경계면 계약은 스펙 §6-4 ~ §6-6(`docs/superpowers/specs/2026-09-29-winger-offside-stage1-design.md`)이에요.
 * 로직 모듈이 아직 없거나 반쯤이어도 화면이 죽지 않게, 모듈마다 있을 때만 불러요. */
"use strict";

window.WingerScenes = (() => {
  // ---------- 작은 도구 ----------
  const mod = (name) => window[name] || null;
  const byId = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const cur = () => (typeof S !== "undefined" ? S : null);          // game.js의 전역 선수
  const safe = (fn, d) => { try { const v = fn(); return v == null ? d : v; } catch (e) { console.error(e); return d; } };
  const num = (n) => (n != null && Number.isFinite(+n) ? Math.round(+n).toLocaleString("ko-KR") : "");
  const fix1 = (n) => (Number.isFinite(+n) ? (+n).toFixed(1) : "");
  const numOrDec = (n) => (Number.isInteger(+n) ? num(n) : fix1(n));
  // 조각의 부호 — 스펙이 쓰는 대로 진짜 빼기표(−)를 써요
  const sign = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "±0");
  const dateKo = (t) => {
    const d = new Date(+t);
    return t && Number.isFinite(d.getTime()) ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일` : "";
  };
  const activeId = () => { const a = document.querySelector(".screen.active"); return a ? a.id : ""; };
  const lgName = (id) => {
    const l = (typeof LEAGUES !== "undefined" ? LEAGUES : []).find((x) => x.id === id);
    return l ? `${l.flag} ${l.short}` : "";
  };
  const posName = (p) => (typeof POS_INFO !== "undefined" && POS_INFO[p] ? POS_INFO[p].name : p || "");
  /* 조사 — 클럽 이름은 명단에서 와요(「소백 그린」). 받침을 봐야 「그린과」「그린으로」가 돼요.
   * 한글이 아니면(FC 등) 받침 없음으로 읽어요 */
  const jong = (w) => { const c = String(w || "").trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0; };
  const waGwa = (w) => (jong(w) ? "과" : "와");
  const roEuro = (w) => { const j = jong(w); return j && j !== 8 ? "으로" : "로"; };   // ㄹ 받침(8)은 「로」

  // ---------- 이름표 (화면 글자만 — 규칙은 로직 모듈에) ----------
  const CAT = {
    youth: "🌱 유스 시절", slot: "📍 자리와 감독", body: "🦶 몸과 기술",
    voice: "📰 바깥의 목소리", promise: "🏟️ 경기 앞 약속", money: "💼 돈과 계약",
  };
  const CAT_ORDER = ["youth", "slot", "body", "voice", "promise", "money"];
  const KIND = { try: "도전", safe: "확정", deal: "거래", promise: "약속" };
  /* 📋 약속 조건의 우리 말은 **events.js의 condText 한 곳**에서 받아요 — 판정식과 한 줄에 붙어 있어서,
   * 여기 따로 적으면 경기 화면 띠(promiseLine)·「최근 10경기 중 N번」과 말이 어긋날 수 있어요. */
  const condOf = (kind) => { const E = mod("WingerEvents"); return (E && E.condText ? safe(() => E.condText(kind), null) : null) || ""; };
  const TIER = {
    "흔함": { icon: "⚪", cls: "t1", rank: 1 },
    "드묾": { icon: "🔵", cls: "t2", rank: 2 },
    "귀함": { icon: "🟣", cls: "t3", rank: 3 },
    "전설": { icon: "🟡", cls: "t4", rank: 4 },
  };
  const TIER_ORDER = ["전설", "귀함", "드묾", "흔함"];
  const GROUP_EMOJI = { "기록": "⚽", "여정": "🗺️", "수상": "🏆", "대표팀": "🌏", "이야기": "📖", "유산": "🎓" };
  const WC_RES = { champion: "🏆 우승", final: "🥈 준우승", semi: "🎖️ 4강", group: "💧 조별 탈락", none: "— 미발탁" };
  const WC_AW = { boot: "🥇 골든부츠", ball: "🏅 골든볼", wall: "🛡️ 골든월" };
  /* 🧭 성향 이름 — 명전 항목에는 id(`style`)만 실려요. 이름은 achieve.js의 STYLES 한 곳에서 받아요
   * (필름이 없는 기기의 요약 카드만 여기를 써요 — 필름에는 이름이 같이 실려 와요) */
  const styleName = (id) => { const A = mod("WingerAch"); return (id && A && A.STYLES && A.STYLES[id]) || null; };

  const achDef = (id) => { const A = mod("WingerAch"); return A && A.LIST ? A.LIST.find((a) => a.id === id) || null : null; };
  const tierOf = (id) => { const A = mod("WingerAch"); return A && A.tierOf ? safe(() => A.tierOf(id), null) : null; };
  const tierTag = (t) => (TIER[t] ? `<span class="ach-tier" data-tier="${TIER[t].cls}">${TIER[t].icon} ${t}</span>` : "");
  /* 🏅 대표 업적 배지 — 모르는 id면 **그리지 않아요**(스펙 §5-8). 희귀도는 색 테 + 글자 */
  function badgeHTML(id) {
    const def = id ? achDef(id) : null;
    const t = def ? tierOf(id) : null;
    if (!def || !TIER[t]) return "";
    return `<span class="ach-badge" data-tier="${TIER[t].cls}">${tierTag(t)}<span class="ach-name">${esc(def.name)}</span></span>`;
  }
  const storyDef = (sid) => { const St = mod("WingerStory"); return St && St.LIST ? St.LIST.find((s) => s.sid === sid) || null : null; };

  // ---------- 모달 껍데기 — base.css의 .av-overlay/.av-modal을 빌려요 ----------
  /* 다른 레이어가 떠 있나. 모달 둘이 겹치면 뒤의 것에 손이 안 닿아요(스펙 §9-A 9 「모달 동시 둘 0」) */
  const otherModal = (mine) => Array.prototype.some.call(
    document.querySelectorAll(".av-overlay"), (o) => !o.classList.contains(mine));
  /* 그게 닫히면 다시 그려요. 🎉 피버 알림이 먼저 뜬 날, 닫고 나서도 이벤트가 안 보이면
   * 답하지 않은 채 「경기하러 가기」를 누를 수 있어요. 줄 선 함수는 스스로 다시 봅니다. */
  const queued = new Set();
  let watcher = null;
  function later(fn) {
    queued.add(fn);
    if (watcher || typeof MutationObserver !== "function") return;
    watcher = new MutationObserver(() => {
      const fns = Array.from(queued);
      queued.clear();
      watcher.disconnect();
      watcher = null;
      fns.forEach((f) => f());
    });
    watcher.observe(document.body, { childList: true });
  }
  /* 키보드 — 탭이 모달 밖으로 새지 않게 둘레를 돌려요 */
  function trap(modal) {
    modal.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const f = Array.prototype.filter.call(
        modal.querySelectorAll("button:not([disabled]), input:not([disabled]), a[href], summary"),
        (x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      // 막 열린 뒤엔 포커스가 창 자체에 있어요 — 거기서 Shift+Tab을 누르면 뒤 화면으로 새요
      if (document.activeElement === modal) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  function openLayer(cls, html, labelId) {
    const back = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = `av-overlay ${cls}`;
    wrap.innerHTML = html;
    const modal = wrap.firstElementChild;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    if (labelId) modal.setAttribute("aria-labelledby", labelId);
    modal.tabIndex = -1;
    trap(modal);
    document.body.appendChild(wrap);
    wrap._back = back;
    try { modal.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
    return wrap;
  }
  function closeLayer(wrap) {
    if (!wrap) return;
    const back = wrap._back;
    wrap.remove();
    if (back && back.focus && document.body.contains(back)) { try { back.focus({ preventScroll: true }); } catch { /* 없어졌어요 */ } }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎲 선택 이벤트 오버레이 — 스펙 §3-1 · §3-10 · §6-6
  // ═══════════════════════════════════════════════════════════════
  function chipsHTML(fx) {
    const E = mod("WingerEvents");
    const list = fx && E && E.chips ? safe(() => E.chips(fx), []) : [];
    return list.map((c) => `<span class="ev-chip ${c.good === true ? "good" : c.good === false ? "bad" : "neu"}">`
      + `${esc(c.emoji || "")} ${esc(c.text || "")}</span>`).join("");
  }
  function fxRow(label, fx, cls) {
    const chips = chipsHTML(fx);
    return chips ? `<span class="ev-fx ${cls || ""}"><span class="ev-fx-k">${label}</span>${chips}</span>` : "";
  }
  /* 조각 — 받은 값을 그대로 적어요. 첫 조각이 기본값(부호 없이), 나머지는 부호를 붙여요.
   * 합이 pct와 다르면 10~90에서 잘린 거예요(유스만 — 스펙 §3-2). 그때는 잘린 걸 말로 적어요.
   * 「확률은 적힌 조각을 더한 값」이라고 판정 규칙 쪽에 적었으니, 안 맞으면 까닭이 보여야 해요. */
  function partsText(o) {
    const ps = Array.isArray(o.parts) ? o.parts : [];
    if (!ps.length) return "";
    const txt = ps.map((p, i) => {
      const v = +p.v;
      const head = i === 0 ? `${esc(p.label)} ${esc(p.v)}` : `${esc(p.label)} ${sign(v)}`;
      const cond = p.usual != null && p.now != null ? ` (평소 ${num(p.usual)} · 오늘 ${num(p.now)})` : "";
      return head + cond;
    }).join(" · ");
    const sum = ps.reduce((a, p) => a + (+p.v || 0), 0);
    const cut = Number.isFinite(o.pct) && sum !== o.pct
      ? ` <span class="ev-cut">— 조각 합 ${sum} · 10~90 사이로 잘려 ${o.pct}%</span>` : "";   // 숫자 뒤 조사(은/는)를 피해요
    return txt + cut;
  }
  const refText = (r) => (!r || !r.of ? "기록이 아직 없어요" : `최근 ${num(r.of)}경기 중 ${num(r.hit)}번`);
  function optHTML(o, i) {
    const k = o.k;
    let head = `<span class="ev-opt-head"><span class="ev-tag">${KIND[k] || ""}</span>`
      + `<span class="ev-opt-label">${esc(o.label)}</span>`;
    let body = "";
    if (k === "try") {
      if (Number.isFinite(o.pct)) head += `<span class="ev-pct">성공 <b>${o.pct}%</b></span>`;
      const pt = partsText(o);
      if (pt) body += `<span class="ev-parts">${pt}</span>`;
      body += fxRow("그대로 받는 것", o.fx) + fxRow("✅ 성공하면", o.win, "win") + fxRow("❌ 실패하면", o.lose, "lose");
    } else if (k === "promise") {
      const kind = o.cond && o.cond.kind;
      body += `<span class="ev-cond">📋 약속: ${esc(condOf(kind))}</span>`;
      if (o.opp) body += `<span class="ev-opp">🆚 ${esc(o.opp)}${waGwa(o.opp)} 만나는 다음 출전 경기에서 정해요</span>`;
      body += `<span class="ev-ref">📊 지난 기록 — ${refText(o.ref)}</span>`;
      body += fxRow("✅ 지키면", o.win, "win") + fxRow("❌ 못 지키면", o.lose, "lose");
    } else {
      body += fxRow(k === "deal" ? "주고받는 것" : "받는 것", o.fx)
        || `<span class="ev-none">아무 일 없이 지나가요</span>`;
    }
    head += "</span>";
    return `<button type="button" class="ev-opt k-${esc(k)}" data-i="${i}">${head}${body}</button>`;
  }
  function kickerOf(ev) {
    if (ev.sid) {
      const s = storyDef(ev.sid);
      const St = mod("WingerStory");
      const o = St && St.open ? (safe(() => St.open(), []) || []).find((x) => x.sid === ev.sid) : null;
      return `📖 ${s ? `${s.emoji} ${s.name}` : "이야기"} ${ev.ch || 1}/${(o && o.of) || 2}`;
    }
    const E = mod("WingerEvents");
    const d = E && E.LIST ? E.LIST.find((x) => x.id === ev.id) : null;
    return d ? CAT[d.cat] || "" : "";
  }
  const evKey = (ev) => [ev.id, ev.sid || "", ev.ch || "", JSON.stringify(ev.at || "")].join("|");

  function eventOverlay() {
    const E = mod("WingerEvents");
    const ev = E && E.pending ? safe(() => E.pending(), null) : null;
    const open = document.querySelector(".ev-overlay");
    if (!ev) {
      /* 답한 뒤엔 answer()가 밑 화면을 다시 그리고, 그게 여기를 또 불러요 — 그때 pending은 null이에요.
       * **결과 창은 두고**, 답하기 전에 이벤트가 사라진 경우(운영판 정리)만 묻는 창을 치워요. */
      if (open && open.dataset.state === "ask") closeLayer(open);
      return;
    }
    const key = evKey(ev);
    if (open) {
      if (open.dataset.state === "done" || open.dataset.key === key) return;   // 같은 걸 다시 그리지 않아요(포커스 유지)
      closeLayer(open);
    }
    if (otherModal("ev-overlay")) { later(eventOverlay); return; }

    const opts = Array.isArray(ev.opts) ? ev.opts : [];
    const kicker = kickerOf(ev);
    const hasTry = opts.some((o) => o.k === "try");
    const hasPromise = opts.some((o) => o.k === "promise");
    const foot = [hasTry ? "📐 적힌 확률이 그대로 판정이에요 — 숨은 보정은 없어요" : "",
      hasPromise ? "📋 약속은 확률이 아니라 다음 출전 경기가 정해요" : ""].filter(Boolean).join("<br/>");
    const wrap = openLayer("ev-overlay", `<div class="av-modal ev-modal">
      ${kicker ? `<div class="ev-kicker">${esc(kicker)}</div>` : ""}
      <h3 class="av-title ev-title" id="ev-title">${esc(ev.title)}</h3>
      ${ev.body ? `<p class="ev-body">${esc(ev.body).replace(/\n/g, "<br/>")}</p>` : ""}
      <div class="ev-opts">${opts.map(optHTML).join("")}</div>
      ${foot ? `<p class="ev-foot">${foot}</p>` : ""}
    </div>`, "ev-title");
    wrap.dataset.key = key;
    wrap.dataset.state = "ask";
    let busy = false;
    const btns = () => wrap.querySelectorAll(".ev-opt");
    btns().forEach((b) => b.addEventListener("click", () => {
      if (busy) return;                 // 두 번 눌러도 한 번만 — answer()는 되돌릴 수 없어요
      busy = true;
      btns().forEach((x) => { x.disabled = true; });
      const i = +b.dataset.i;
      let res;
      try {
        res = E.answer(i);
      } catch (e) {
        console.error(e);
        busy = false;
        btns().forEach((x) => { x.disabled = false; });
        const f = wrap.querySelector(".ev-foot") || wrap.querySelector(".ev-opts");
        if (f) f.insertAdjacentHTML("afterend", `<p class="ev-err" role="alert">처리하지 못했어요 — 다시 눌러 주세요</p>`);
        return;
      }
      showResult(wrap, opts[i], res || {});
    }));
  }

  function showResult(wrap, opt, res) {
    wrap.dataset.state = "done";
    const k = opt ? opt.k : "";
    const v = res.ok === true ? ["ok", k === "promise" ? "✅ 약속을 지켰어요" : "✅ 성공"]
      : res.ok === false ? ["fail", k === "promise" ? "❌ 약속을 못 지켰어요" : "❌ 실패"]
      : k === "promise" ? ["wait", "📋 약속했어요"]
      : ["none", "✔️ 골랐어요"];
    const chosen = opt
      ? `고른 것 — ${esc(opt.label)}${k === "try" && Number.isFinite(opt.pct) ? ` (성공 ${opt.pct}%)` : ""}` : "";
    const box = wrap.querySelector(".ev-opts");
    const foot = wrap.querySelector(".ev-foot");
    if (foot) foot.remove();
    wrap.querySelectorAll(".ev-err").forEach((x) => x.remove());
    const chips = chipsHTML(res.applied);
    box.outerHTML = `<div class="ev-result" tabindex="-1">
        ${chosen ? `<p class="ev-chosen">${chosen}</p>` : ""}
        <p class="ev-verdict ${v[0]}">${v[1]}</p>
        ${res.line ? `<p class="ev-line">${esc(res.line)}</p>` : ""}
        ${chips ? `<div class="ev-fx">${chips}</div>` : ""}
      </div>
      <div class="av-actions"><button type="button" class="btn btn-primary ev-ok">확인</button></div>`;
    const r = wrap.querySelector(".ev-result");
    try { r.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
    wrap.querySelector(".ev-ok").addEventListener("click", () => {
      closeLayer(wrap);
      eventOverlay();                   // 그사이 다른 이벤트가 걸렸으면 이어서 보여요
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔢 등번호 — 스펙 §5-9. 추천 셋 · 🎲 · 직접 입력(1~99) · 건너뛰면 추천 첫 번호
  // ═══════════════════════════════════════════════════════════════
  const validNo = (n) => Number.isInteger(n) && n >= 1 && n <= 99;
  function numberPicker() {
    if (document.querySelector(".no-overlay")) return;
    if (otherModal("no-overlay")) { later(numberPicker); return; }
    const C = mod("WingerCareer");
    const st = cur();
    const sug = (C && C.noSuggest && st ? safe(() => C.noSuggest(st.pos), []) : []).filter(validNo);
    let pickN = sug.length ? sug[0] : null;
    const wrap = openLayer("no-overlay", `<div class="av-modal no-modal">
      <div class="no-kicker">프로 계약서의 마지막 칸</div>
      <h3 class="av-title" id="no-title">🔢 등번호를 골라요</h3>
      <p class="no-sub">커리어 내내 달고 뛰어요 — 이적해도 그대로예요</p>
      <div class="no-shirt" aria-hidden="true"><i class="no-sl l"></i><i class="no-sl r"></i><span class="no-num">${pickN || "?"}</span></div>
      <p class="no-now" role="status">고른 번호 <b>${pickN ? `${pickN}번` : "없음"}</b></p>
      <div class="no-sug" role="group" aria-label="${esc(posName(st && st.pos))} 추천 번호">
        ${sug.map((n) => `<button type="button" class="no-pick" data-n="${n}" aria-pressed="${n === pickN}">${n}</button>`).join("")}
        <button type="button" class="no-pick no-dice" aria-label="무작위 번호 뽑기">🎲</button>
      </div>
      <label class="no-own" for="no-input">직접 적기
        <input id="no-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="1~99" autocomplete="off" />
      </label>
      <p class="no-err" role="alert"></p>
      <div class="av-actions no-acts">
        <button type="button" class="btn btn-ghost" id="no-skip">건너뛰기</button>
        <button type="button" class="btn btn-primary" id="no-ok">이 번호로</button>
      </div>
      <p class="no-note">${sug.length ? `건너뛰면 추천 첫 번호(${sug[0]}번)를 달아요` : "건너뛰면 다음 시즌 준비 때 다시 물어요"}</p>
    </div>`, "no-title");
    const numEl = wrap.querySelector(".no-num");
    const nowEl = wrap.querySelector(".no-now b");
    const err = wrap.querySelector(".no-err");
    const input = wrap.querySelector("#no-input");
    const setPick = (n, from) => {
      pickN = n;
      numEl.textContent = n || "?";
      nowEl.textContent = n ? `${n}번` : "없음";
      numEl.classList.remove("flip");
      void numEl.offsetWidth;           // 같은 애니메이션을 다시 돌리려면 한 번 끊어야 해요
      if (n) numEl.classList.add("flip");
      wrap.querySelectorAll(".no-pick[data-n]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.n === n)));
      if (from !== "input") input.value = "";        // 직접 적기 칸은 적은 번호만 담아요
      err.textContent = "";
    };
    wrap.querySelectorAll(".no-pick[data-n]").forEach((b) => b.addEventListener("click", () => setPick(+b.dataset.n, "sug")));
    wrap.querySelector(".no-dice").addEventListener("click", () => setPick(1 + Math.floor(Math.random() * 99), "dice"));
    input.addEventListener("input", () => {
      const v = input.value.trim();
      if (!v) { err.textContent = ""; return; }      // 비우면 고른 번호 그대로예요
      const n = /^\d{1,2}$/.test(v) ? +v : NaN;
      if (validNo(n)) setPick(n, "input");
      else err.textContent = "1~99 사이 정수만 달 수 있어요";
    });
    const commit = (n) => {
      if (!validNo(n)) { err.textContent = "1~99 사이 정수만 달 수 있어요"; return; }
      const ok = C && C.setNo ? safe(() => C.setNo(n), false) : false;
      if (!ok) { err.textContent = "이 번호는 달 수 없어요 — 다른 번호를 골라 주세요"; return; }
      closeLayer(wrap);
      if (window.Fx && Fx.flash) Fx.flash(`#${n}`);
      // 준비 화면 이름 줄의 #번호를 새로 그려요(보이는 화면일 때만)
      if (C.refreshPro && activeId() === "screen-pro") C.refreshPro();
    };
    wrap.querySelector("#no-ok").addEventListener("click", () => {
      const v = input.value.trim();
      commit(v ? (/^\d{1,2}$/.test(v) ? +v : NaN) : pickN);
    });
    wrap.querySelector("#no-skip").addEventListener("click", () => {
      if (sug.length) commit(sug[0]);
      else closeLayer(wrap);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 📖 도감 — 스펙 §3-9. 입구 둘: 타이틀 「📖 도감」(openBook) · 📊 기록 탭(bookTab)
  // ═══════════════════════════════════════════════════════════════
  const BOOK_TABS = [["ev", "🎲 이벤트"], ["story", "📖 이야기"], ["ach", "🏅 업적"], ["rules", "📐 판정 규칙"]];
  const missing = () => `<p class="bk-empty">아직 불러오지 못했어요 — 잠시 뒤 다시 열어 주세요</p>`;
  const bookData = () => { const B = mod("WingerBook"); return (B && B.load ? safe(() => B.load(), null) : null) || {}; };
  function progHTML(label, n, of) {
    const pct = of ? Math.round((n / of) * 100) : 0;
    return `<div class="bk-prog"><div class="bk-prog-t">${label} <b>${num(n)}</b> / ${num(of)}</div>`
      + `<div class="bk-bar" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${of}" aria-valuenow="${n}"><i style="width:${pct}%"></i></div></div>`;
  }
  function bookEvHTML() {
    const E = mod("WingerEvents");
    if (!E || !Array.isArray(E.LIST)) return missing();
    const seen = bookData().ev || {};
    const met = (id) => !!(seen[id] && seen[id].n > 0);
    const cats = CAT_ORDER.concat(Array.from(new Set(E.LIST.map((e) => e.cat))).filter((c) => !CAT_ORDER.includes(c)));
    const got = E.LIST.filter((e) => met(e.id)).length;
    return progHTML("만난 이벤트", got, E.LIST.length) + cats.map((c) => {
      const l = E.LIST.filter((e) => e.cat === c);
      if (!l.length) return "";
      return `<section class="bk-group"><h4 class="bk-h">${esc(CAT[c] || c)}<span class="bk-count">${l.filter((e) => met(e.id)).length}/${l.length}</span></h4>
        <ul class="bk-list">${l.map((e) => {
          const s = seen[e.id];
          return met(e.id)
            ? `<li class="bk-item seen"><span class="bk-emo" aria-hidden="true">${esc(e.emoji)}</span><span class="bk-name">${esc(e.name)}</span>`
              + `<span class="bk-meta">${num(s.n)}번 만났어요${s.at ? ` · 처음 ${dateKo(s.at)}` : ""}</span></li>`
            : `<li class="bk-item unseen"><span class="bk-emo" aria-hidden="true">❔</span><span class="bk-name">?</span>`
              + `<span class="bk-meta">아직 못 만났어요</span></li>`;
        }).join("")}</ul></section>`;
    }).join("");
  }
  function bookStoryHTML() {
    const St = mod("WingerStory");
    if (!St || !Array.isArray(St.LIST)) return missing();
    const open = cur() && St.open ? safe(() => St.open(), []) : [];
    const head = open.length
      ? `<p class="bk-open">진행 중 — ${open.map((o) => `${esc((storyDef(o.sid) || {}).emoji || "📖")} ${esc(o.name)} `
        + (o.ch ? `${num(o.ch)}/${num(o.of || 2)}장` : "첫 장을 기다려요")).join(" · ")}</p>` : "";
    return head + St.LIST.map((s) => {
      const ends = (St.ends ? safe(() => St.ends(s.sid), null) : null)
        || (s.ends || []).map((x) => ({ id: x.id, name: null, n: 0 }));
      const got = ends.filter((x) => x.name != null).length;
      return `<section class="bk-group"><h4 class="bk-h">${esc(s.emoji)} ${esc(s.name)}<span class="bk-count">결말 ${got}/${ends.length}</span></h4>
        <ul class="bk-list">${ends.map((x) => (x.name != null
          ? `<li class="bk-item seen"><span class="bk-emo" aria-hidden="true">🎞️</span><span class="bk-name">「${esc(x.name)}」</span><span class="bk-meta">${num(x.n)}번 닿았어요</span></li>`
          : `<li class="bk-item unseen"><span class="bk-emo" aria-hidden="true">❔</span><span class="bk-name">?</span><span class="bk-meta">아직 못 본 결말</span></li>`)).join("")}</ul>
        ${ends.length > got ? `<p class="bk-left">남은 결말 ${ends.length - got}개</p>` : ""}</section>`;
    }).join("");
  }
  /* 🏅 업적 목록 — 도감(이 기기 전체 · book.ach)과 기록 탭(이번 커리어 · S.ach)이 같이 써요 */
  function achListHTML(mode) {
    const A = mod("WingerAch");
    if (!A || !Array.isArray(A.LIST)) return missing();
    const st = cur();
    const book = mode === "book" ? bookData().ach || {} : {};
    const mine = mode === "career" ? (st && st.ach) || {} : {};
    const has = (id) => (mode === "book" ? !!(book[id] && book[id].n > 0) : !!mine[id]);
    const rep = mode === "career" && st && A.repOf ? safe(() => A.repOf(st), null) : null;
    const tierIs = (a) => tierOf(a.id) || a.tier;
    const all = A.LIST;
    const tiers = TIER_ORDER.map((t) => {
      const l = all.filter((a) => tierIs(a) === t);
      return l.length ? `${TIER[t].icon} ${t} ${l.filter((a) => has(a.id)).length}/${l.length}` : "";
    }).filter(Boolean).join(" · ");
    const groups = Array.from(new Set(all.map((a) => a.group)));
    const row = (a) => {
      const got = has(a.id);
      const t = tierIs(a);
      const m = mine[a.id] || {};
      const meta = !got ? "" : mode === "book" ? (book[a.id].at ? `처음 ${dateKo(book[a.id].at)}` : "")
        : m.late ? "지난 기록으로 채웠어요" : m.y ? `${m.y}시즌` : "";
      const inner = `<span class="ach-top">${tierTag(t)}<span class="ach-name">${esc(a.name)}</span>`
        + `${got ? `<span class="ach-got">✔ 땄어요</span>` : `<span class="ach-no">아직</span>`}</span>`
        + `<span class="ach-cond">${esc(a.cond)}</span>${meta ? `<span class="ach-meta">${esc(meta)}</span>` : ""}`;
      if (mode === "career" && got) {
        const on = rep === a.id;
        return `<li><button type="button" class="ach-row got${on ? " rep" : ""}" data-id="${esc(a.id)}" aria-pressed="${on}">`
          + `${inner}<span class="ach-pick">${on ? "🏅 지금 대표 업적" : "눌러서 대표로 정하기"}</span></button></li>`;
      }
      return `<li class="ach-row${got ? " got" : ""}">${inner}</li>`;
    };
    const head = progHTML(mode === "book" ? "이 기기에서 딴 업적" : "이번 커리어에서 딴 업적", all.filter((a) => has(a.id)).length, all.length)
      + (tiers ? `<p class="bk-tiers">${tiers}</p>` : "");
    /* 기록 탭(이번 커리어)의 일은 **대표 고르기**예요 — 딴 것을 드문 것부터 위에 모으고,
     * 못 딴 것은 접어 둬요. 55줄을 다 펴면 고를 수 있는 줄이 스크롤 밑으로 묻혀요 */
    if (mode === "career") {
      const rank = (a) => (TIER[tierIs(a)] || {}).rank || 0;
      const got = all.filter((a) => has(a.id)).sort((a, b) => rank(b) - rank(a) || ((mine[b.id] || {}).y || 0) - ((mine[a.id] || {}).y || 0));
      const left = all.filter((a) => !has(a.id));
      return head
        + (got.length ? `<h4 class="ach-sec-h">🏅 딴 업적 — 눌러서 대표로</h4><ul class="bk-list">${got.map(row).join("")}</ul>` : "")
        + (left.length ? `<details class="bk-group bk-fold"><summary class="bk-h">🔒 아직 못 딴 업적<span class="bk-count">${left.length}개</span></summary>`
          + groups.map((g) => {
            const l = left.filter((a) => a.group === g);
            return l.length ? `<h5 class="ach-sub-h">${GROUP_EMOJI[g] || "🏅"} ${esc(g)}</h5><ul class="bk-list">${l.map(row).join("")}</ul>` : "";
          }).join("") + `</details>` : "");
    }
    return head + groups.map((g) => {
        const l = all.filter((a) => a.group === g);
        const n = l.filter((a) => has(a.id)).length;
        return `<details class="bk-group bk-fold"${n ? " open" : ""}>
          <summary class="bk-h">${GROUP_EMOJI[g] || "🏅"} ${esc(g)}<span class="bk-count">${n}/${l.length}</span></summary>
          <ul class="bk-list">${l.map(row).join("")}</ul></details>`;
      }).join("");
  }
  function rulesHTML() {
    const E = mod("WingerEvents");
    const rules = E && E.rules ? safe(() => E.rules(), []) : [];
    if (!rules.length) return missing();
    // 글자를 먼저 씻고, 그다음에 **굵게**만 살려요 — 순서가 바뀌면 태그가 새요
    return `<ul class="bk-rules">${rules.map((r) => `<li>${esc(String(r).replace(/^\s*·\s*/, "")).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</li>`).join("")}</ul>`;
  }
  const PANEL = { ev: bookEvHTML, story: bookStoryHTML, ach: () => achListHTML("book"), rules: rulesHTML };
  function renderBook(el, tab) {
    if (!el) return;
    if (!PANEL[tab]) tab = "ev";
    const pfx = el.id || "bk";
    el.innerHTML = `<div class="bk">
      <div class="bk-tabs" role="tablist" aria-label="도감">${BOOK_TABS.map(([k, name]) =>
        `<button type="button" role="tab" class="bk-tab${k === tab ? " on" : ""}" id="${pfx}-t-${k}" data-tab="${k}"`
        + ` aria-selected="${k === tab}" aria-controls="${pfx}-p">${name}</button>`).join("")}</div>
      <div class="bk-panel" role="tabpanel" id="${pfx}-p" aria-labelledby="${pfx}-t-${tab}">${PANEL[tab]()}</div>
    </div>`;
    el.querySelectorAll(".bk-tab").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.tab;
      renderBook(el, k);
      const nb = el.querySelector(`.bk-tab[data-tab="${k}"]`);
      if (nb) try { nb.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
    }));
  }
  let bookBack = "screen-title";
  function openBook(tab) {
    const a = activeId();
    if (a && a !== "screen-book") bookBack = a;
    renderBook(byId("book-body"), tab || "ev");
    show("screen-book");
  }
  const bookTab = (el, tab) => renderBook(el, tab || "ev");

  // ═══════════════════════════════════════════════════════════════
  // 🏅 업적 탭(📊 기록 — 진행 중 커리어). 딴 업적을 누르면 대표로(setRep)
  // ═══════════════════════════════════════════════════════════════
  function achTab(el) {
    if (!el) return;
    const A = mod("WingerAch");
    const st = cur();
    const rep = A && A.repOf && st ? safe(() => A.repOf(st), null) : null;
    el.innerHTML = `<div class="bk">
      <div class="ach-head">
        <div class="ach-head-t">🏅 대표 업적</div>
        <div class="ach-head-b">${badgeHTML(rep) || `<span class="ach-none">아직 딴 업적이 없어요</span>`}</div>
        <p class="ach-note">딴 업적을 누르면 대표로 정해요 — 명예의 전당 카드와 공유 이미지에 실려요.<br/>효과는 없어요 · 🎖️ 시즌 칭호와 다른 물건이에요</p>
        <p class="ach-msg" role="status"></p>
      </div>
      ${achListHTML("career")}
    </div>`;
    el.querySelectorAll("button.ach-row").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.id;
      const ok = A && A.setRep ? safe(() => A.setRep(id), false) : false;
      if (!ok) { el.querySelector(".ach-msg").textContent = "지금은 대표 업적을 바꿀 수 없어요"; return; }
      /* 📊 기록 머리 줄(engineer)에도 대표 업적이 있어요 — 기록 화면이면 통째로 다시 그려요 */
      if (typeof renderRecord === "function" && activeId() === "screen-record") renderRecord();
      else achTab(el);
      const nb = Array.prototype.find.call(el.querySelectorAll("button.ach-row"), (x) => x.dataset.id === id);
      if (nb) try { nb.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // 🎬 은퇴 필름 — 스펙 §5-6. 세로 스크롤, 장마다 한 블록. **있는 만큼만** 그려요
  // (빈 칸을 0으로 채우지 않아요 — 「기록이 없다」와 「0이었다」가 같은 얼굴이면 안 돼요)
  // ═══════════════════════════════════════════════════════════════
  const chapter = (title, inner, cls) => `<section class="film-ch${cls ? ` ${cls}` : ""}"><h3 class="film-h">${title}</h3>${inner}</section>`;
  function coverHTML(f) {
    const h = f.head || {};
    const meta = [posName(h.pos), h.age ? `${num(h.age)}세 은퇴` : "", h.club ? `마지막 클럽 ${h.club}` : ""].filter(Boolean);
    return `<header class="film-ch film-cover">
      <div class="film-kicker">🎬 은퇴 필름${h.gen > 1 ? ` · 🧬 ${num(h.gen)}세` : ""}</div>
      ${h.no ? `<div class="film-no"><span class="sr">등번호 </span>#${esc(h.no)}</div>` : ""}
      <h2 class="film-name">${esc(h.name)}</h2>
      ${meta.length ? `<p class="film-meta">${meta.map(esc).join(" · ")}</p>` : ""}
      ${badgeHTML(h.rep) ? `<div class="film-rep">${badgeHTML(h.rep)}</div>` : ""}
      ${h.grade ? `<p class="film-grade">${esc(h.grade)}</p>` : ""}
      ${h.score != null ? `<div class="film-score"><span class="film-score-k">커리어 점수</span><b>${num(h.score)}</b></div>` : ""}
    </header>`;
  }
  /* 같은 글자가 여러 번이면 「리그MVP ×3」으로 묶어요(표시만 — 세는 건 모델이 준 목록 그대로) */
  const countList = (l) => {
    const m = new Map();
    l.forEach((x) => m.set(x, (m.get(x) || 0) + 1));
    return Array.from(m.entries());
  };
  function clubHTML(c) {
    const yrs = c.y0 === c.y1 ? `${c.y0}시즌` : `${c.y0}~${c.y1}시즌`;
    const n = Number.isFinite(c.y1 - c.y0) ? c.y1 - c.y0 + 1 : 0;
    const path = (Array.isArray(c.lgs) ? c.lgs : []).map(lgName).filter(Boolean).join(" → ");
    const cells = [["경기", c.apps], ["⚽ 골", c.g], ["🅰️ 도움", c.a], ["🛡️ 수비", c.d]].filter(([, v]) => v != null);
    const tro = Array.isArray(c.tro) ? c.tro : [];
    const aw = countList(Array.isArray(c.aw) ? c.aw : []);
    return `<article class="film-card">
      <div class="film-card-h"><b class="film-club">${esc(c.club || "소속 기록 이전")}</b>${c.back ? `<span class="film-tag">🔁 친정 복귀</span>` : ""}</div>
      <p class="film-sub">${esc(yrs)}${n > 1 ? ` · ${n}시즌` : ""}${path ? ` · ${esc(path)}` : ""}</p>
      ${cells.length ? `<dl class="film-nums">${cells.map(([k, v]) => `<div><dt>${k}</dt><dd>${num(v)}</dd></div>`).join("")}</dl>` : ""}
      ${tro.length ? `<ul class="film-list">${tro.map((t) => `<li>🏆 ${esc(t)}</li>`).join("")}</ul>` : ""}
      ${aw.length ? `<p class="film-aw">🎖️ ${aw.map(([t, k]) => esc(t) + (k > 1 ? ` ×${k}` : "")).join(" · ")}</p>` : ""}
    </article>`;
  }
  function moveHTML(mv, a, b) {
    const m = mv.find((x) => x.y === a.y1 && (!b.club || x.to === b.club))
      || mv.find((x) => b.club && x.to === b.club && x.y >= a.y0 && x.y <= b.y0);
    if (!m) return `<div class="film-move" aria-hidden="true">⋯</div>`;
    const money = typeof fmtMoney === "function" ? fmtMoney : num;
    const fee = m.fee == null ? "" : m.fee > 0 ? ` (계약금 ${money(m.fee)})` : " (계약금 없이)";
    return `<p class="film-move">💼 ${esc(m.y)}시즌 뒤, ${esc(m.to)}${roEuro(m.to)}${esc(fee)}</p>`;
  }
  function clubsHTML(f) {
    const ch = Array.isArray(f.ch) ? f.ch : [];
    if (!ch.length) return "";
    const mv = Array.isArray(f.moves) ? f.moves : [];
    const out = [];
    ch.forEach((c, i) => { if (i) out.push(moveHTML(mv, ch[i - 1], c)); out.push(clubHTML(c)); });
    return chapter(`🏟️ 뛴 클럽 <span class="film-count">${ch.filter((c) => c.club).length}곳</span>`, out.join(""), "film-clubs");
  }
  function natHTML(f) {
    const wc = f.nat && Array.isArray(f.nat.wc) ? f.nat.wc.slice().sort((a, b) => a.y - b.y) : [];
    if (!wc.length) return "";
    return chapter("🌏 대표팀", `<ul class="film-list">${wc.map((w) => {
      const stay = w.stay || w.r === "stay";
      const res = stay ? "🙅 소집 고사 — 클럽에 남았어요" : WC_RES[w.r] || w.r || "";
      const played = !stay && w.r !== "none";
      const line = played ? [w.apps != null ? `${num(w.apps)}경기` : "", w.g != null ? `⚽ ${num(w.g)}` : "",
        w.a != null ? `🅰️ ${num(w.a)}` : ""].filter(Boolean).join(" · ") : "";
      const aw = (Array.isArray(w.aw) ? w.aw : []).map((x) => WC_AW[x] || x).join(" · ");
      return `<li class="film-wc"><b>${esc(w.y)}시즌 월드컵</b> ${esc(res)}`
        + `${line ? `<span class="film-sub">${esc(line)}</span>` : ""}${aw ? `<span class="film-aw">${esc(aw)}</span>` : ""}</li>`;
    }).join("")}</ul>`);
  }
  function honHTML(f) {
    const hon = Array.isArray(f.hon) ? f.hon.slice().sort((a, b) => a.y - b.y) : [];
    /* 개인상 합계 — 필름 모델에 아직 칸이 없어요(계약 추가 필요: `awards: [{ label, n }]`). 오면 그려요 */
    const aw = Array.isArray(f.awards) ? f.awards.filter((x) => x && x.n > 0) : [];
    const inner = (hon.length
      ? `<ol class="film-list film-shelf">${hon.map((h) => `<li><span class="film-y">${esc(h.y)}시즌</span> ${esc(h.t)}</li>`).join("")}</ol>`
      : `<p class="film-empty">들어 올린 트로피는 없었어요</p>`)
      + (aw.length ? `<p class="film-aw">${aw.map((x) => `${esc(x.label)} ${num(x.n)}`).join(" · ")}</p>` : "");
    return chapter(`🏆 트로피 진열장${hon.length ? ` <span class="film-count">${hon.length}개</span>` : ""}`, inner);
  }
  function bodyHTML(f) {
    const b = f.body;
    if (!b || !b.to) return "";
    const two = !!b.from;
    const defs = typeof STAT_DEFS !== "undefined" ? STAT_DEFS : [];
    const rows = defs.map((d) => `<tr><th scope="row">${d.emoji} ${d.name}</th>`
      + `${two ? `<td>${num(b.from[d.key])}</td>` : ""}<td>${num(b.to[d.key])}</td></tr>`).join("");
    const facts = [
      b.best != null && typeof titleAt === "function" ? `🏷️ 최고 클래스 ${titleAt(b.best)}` : "",
      b.max != null ? `💪 최고 종합 ${num(b.max)}` : "",
      b.trans ? `🌠 초월 ${num(b.trans)}단계` : "",
      Array.isArray(b.weak) && b.weak.length === 2 ? `🦶 약발 ${num(b.weak[0])} → ${num(b.weak[1])}` : "",
    ].filter(Boolean);
    return chapter("💪 몸의 기록", `
      <div class="film-radar">
        <canvas class="film-radar-to" width="240" height="240" aria-hidden="true"></canvas>
        ${two ? `<canvas class="film-radar-from" width="240" height="240" aria-hidden="true"></canvas>` : ""}
      </div>
      ${two ? `<p class="film-legend"><span class="lg-from">◇ 옅은 선 = 입단 때</span> · <span class="lg-to">◆ 채운 면 = 은퇴 때</span></p>` : ""}
      <table class="film-stats"><thead><tr><th scope="col">능력치</th>${two ? `<th scope="col">입단 때</th>` : ""}<th scope="col">은퇴 때</th></tr></thead>
        <tbody>${rows}</tbody></table>
      ${facts.length ? `<ul class="film-facts">${facts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`, "film-body");
  }
  function pickHTML(f) {
    const p = f.pick;
    if (!p) return "";
    const out = [];
    if (p.style && p.style.name) {
      out.push(`<div class="film-style"><b>${esc(p.style.name)}</b>${p.style.line ? `<span>${esc(p.style.line)}</span>` : ""}</div>`);
    }
    if (p.best) {
      out.push(`<p class="film-best">🎯 최고의 한 수 — ${esc(p.best.name)}, 성공 확률 ${esc(p.best.pct)}%였어요${p.best.y ? ` (${esc(p.best.y)}시즌)` : ""}</p>`);
    } else if (p.bright) {
      /* 🌟 가장 빛난 시즌 — 최고의 한 수가 없을 때만 그 자리에(스펙 §5-4 · 옛 세이브는 늘 이쪽).
       * 시즌 평가(hype)는 고르는 잣대라 안 적어요. 숫자는 **있는 것만**(null은 「기록 없음」이지 0이 아니에요) */
      const b = p.bright;
      const nums = [["⚽", b.g, "골"], ["🅰️", b.a, "도움"], ["🛡️", b.d, "수비"]].filter(([, v]) => v != null)
        .map(([e, v, k]) => `${e} ${num(v)}${k}`);
      const sub = [lgName(b.lg)].concat(nums).filter(Boolean).join(" · ");
      const aw = Array.isArray(b.aw) ? b.aw.filter(Boolean) : [];
      out.push(`<div class="film-bright"><p class="film-best">🌟 가장 빛난 시즌 — ${esc(b.y)}시즌${b.club ? ` · ${esc(b.club)}` : ""}</p>`
        + `${sub ? `<p class="film-sub">${esc(sub)}</p>` : ""}${aw.length ? `<p class="film-aw">🎖️ ${aw.map(esc).join(" · ")}</p>` : ""}</div>`);
    }
    if (p.luck) {
      out.push(`<p class="film-luck">🍀 보인 확률대로면 ${fix1(p.luck.exp)}번, 실제로 ${num(p.luck.got)}번 성공했어요${p.luck.n ? ` (도전 ${num(p.luck.n)}번)` : ""}</p>`);
    }
    return out.length ? chapter("🧭 선택의 기록", out.join("")) : "";
  }
  function endsHTML(f) {
    const e = Array.isArray(f.ends) ? f.ends : [];
    if (!e.length) return "";
    return chapter("📖 이야기", `<ul class="film-list">${e.map((x) =>
      `<li>${esc((storyDef(x.sid) || {}).emoji || "📖")} 「${esc(x.name)}」 <span class="film-y">${esc(x.y)}시즌</span></li>`).join("")}</ul>`);
  }
  function partsHTML(f) {
    const p = Array.isArray(f.parts) ? f.parts : [];
    if (!p.length) return "";
    const score = (f.head || {}).score;
    return `<section class="film-ch"><details class="film-parts">
      <summary class="film-h">🧮 점수의 내역 <span class="film-count">${num(score)}점 — 눌러서 펼쳐요</span></summary>
      <table class="film-ptable"><tbody>${p.map((x) => `<tr><th scope="row">${esc(x.label)}`
        + `${x.n != null ? ` <span class="film-n">×${esc(numOrDec(x.n))}</span>` : ""}</th><td>${esc(numOrDec(x.v))}점</td></tr>`).join("")}</tbody>
        <tfoot><tr><th scope="row">커리어 점수</th><td>${num(score)}점</td></tr></tfoot></table>
    </details></section>`;
  }
  const rankOfAch = (id) => (TIER[tierOf(id)] || {}).rank || 0;
  function lastHTML(f, opt) {
    const h = f.head || {};
    const C = mod("WingerCareer");
    const max = (C && C._t && C._t.WORD_MAX) || 60;
    const acts = opt.final
      ? `<button type="button" class="btn btn-ghost" data-act="share">📤 공유 이미지</button>
         <button type="button" class="btn btn-ghost" data-act="hof">🏛️ 명예의 전당</button>
         <button type="button" class="btn btn-primary" data-act="new">🔁 새 선수 키우기</button>`
      : `<button type="button" class="btn btn-ghost" data-act="share">📤 공유 이미지</button>
         <button type="button" class="btn btn-primary" data-act="back">← 돌아가기</button>`;
    /* 명전에서 다시 연 필름(!final) · 이미 올라간 항목의 은퇴(sent — 쌍둥이 헌액)는 **처음부터 잠근 채**.
     * 고르는 줄·한마디 칸을 아예 안 그려요 — 눌러 보고 나서야 「못 바꿔요」를 듣지 않게 */
    if (!opt.final || opt.sent) {
      return chapter("🎬 마지막 장", `${badgeHTML(h.rep) ? `<div class="rep-now">${badgeHTML(h.rep)}</div>` : ""}
        ${f.word ? `<p class="hofd-word">🖊️ “${esc(f.word)}”</p>` : ""}
        ${opt.final ? `<p class="film-note film-sent">🔒 이 기록은 이미 명예의 전당에 올라가 있어요 — 대표 업적과 한마디는 바꿀 수 없어요</p>` : ""}
        <div class="film-acts">${acts}</div><p class="film-share-st" role="status"></p>`, "film-last");
    }
    // 모르는 id는 고르는 줄에도 안 그려요. 드문 것부터, 같으면 늦은 시즌부터
    const achs = (Array.isArray(f.ach) ? f.ach : []).filter((a) => a && badgeHTML(a.id))
      .sort((a, b) => rankOfAch(b.id) - rankOfAch(a.id) || (b.y || 0) - (a.y || 0));
    const sel = achs.some((a) => a.id === h.rep) ? h.rep : achs.length ? achs[0].id : null;
    const pickBox = achs.length
      ? `<div class="rep-now" aria-live="polite">${badgeHTML(sel)}</div>
         <details class="rep-more"><summary>다른 업적으로 바꾸기 (${achs.length}개)</summary>
           <div class="rep-list" role="group" aria-label="대표 업적 고르기">${achs.map((a) =>
             `<button type="button" class="rep-opt" data-id="${esc(a.id)}" aria-pressed="${a.id === sel}">`
             + `${tierTag(tierOf(a.id))}<span class="ach-name">${esc((achDef(a.id) || {}).name)}</span>`
             + `${a.y ? `<span class="film-y">${esc(a.y)}시즌</span>` : ""}</button>`).join("")}</div>
         </details>`
      : `<p class="film-empty">이번 커리어에서 딴 업적이 없어요 — 대표 업적 없이 올라가요</p>`;
    return chapter("🎬 마지막 장 — 남길 것", `
      <div class="film-leave">
        <h4 class="film-h4">🏅 대표 업적</h4>
        ${pickBox}
        <label class="film-h4" for="hof-word">🖊️ 마지막으로 한마디</label>
        <p class="film-note">명예의 전당 카드에 함께 남아요 · 안 써도 괜찮아요</p>
        <input id="hof-word" class="film-word" type="text" maxlength="${max}" placeholder="예) 후회 없이 뛰었습니다" autocomplete="off" />
        <button type="button" class="btn btn-primary" id="btn-hof-word">🏛️ 이대로 남기기</button>
        <p class="hof-word-done" id="hof-word-done" role="status"></p>
        <p class="film-note">한 번 남기면 대표 업적과 한마디는 바꿀 수 없어요. 안 남기고 떠나면 가장 드문 업적이 대표로 올라가요.</p>
      </div>
      <div class="film-acts">${acts}</div>
      <p class="film-share-st" role="status"></p>`, "film-last");
  }
  const SHARE_MSG = {
    share: "📤 공유 창을 열었어요",
    download: "⬇️ 이미지를 내려받았어요",
    image: "🖼️ 이미지를 길게 눌러 저장하세요",
    fail: "이미지를 만들지 못했어요 — 잠시 뒤 다시 눌러 주세요",
    cancel: "",
  };
  let filmBack = "screen-hof";
  function openFilm(film, opt) {
    opt = opt || {};
    const box = byId("film-body");
    if (!box || !film) return;
    const a = activeId();
    if (a && a !== "screen-film") filmBack = a;
    // 명예의 전당 카드에서 왔으면 카드 레이어를 닫아요 — 필름 위에 떠 있으면 안 보여요
    document.querySelectorAll(".hof-overlay").forEach((o) => o.remove());
    box.innerHTML = coverHTML(film) + clubsHTML(film) + natHTML(film) + honHTML(film) + bodyHTML(film)
      + pickHTML(film) + endsHTML(film) + partsHTML(film) + lastHTML(film, opt);
    show("screen-film");
    drawFilmRadar(box, film);
    bindFilm(box, film, opt);
  }
  function drawFilmRadar(box, f) {
    const b = f.body;
    if (!b || !b.to || !window.Radar || typeof STAT_DEFS === "undefined") return;
    const P = palette();
    const vals = Object.values(b.to).concat(Object.values(b.from || {})).map(Number).filter(Number.isFinite);
    const max = Math.max(130, ...vals);
    const to = box.querySelector(".film-radar-to");
    const from = box.querySelector(".film-radar-from");
    if (to) Radar.draw(to, STAT_DEFS, b.to, { max, stroke: P.accent, fill: alpha(P.accent, 0.24), label: P.text, grid: alpha(P.text, 0.14) });
    // 입단 때는 윤곽만 — 격자와 글자는 은퇴 때 판이 그려요(둘 다 그리면 숫자가 겹쳐요)
    if (from && b.from) Radar.draw(from, STAT_DEFS, b.from, { max, stroke: P.dim, fill: alpha(P.dim, 0.1), label: "transparent", grid: "transparent" });
  }
  function bindFilm(box, film, opt) {
    const C = mod("WingerCareer");
    const firstAch = box.querySelector(".rep-opt[aria-pressed='true']");
    let rep = firstAch ? firstAch.dataset.id : (film.head && film.head.rep) || null;
    let word = film.word || null;
    let locked = !opt.final || !!opt.sent;
    const model = () => Object.assign({}, film, { head: Object.assign({}, film.head, { rep }), word });
    const st = box.querySelector(".film-share-st");

    box.querySelectorAll(".rep-opt").forEach((b) => b.addEventListener("click", () => {
      if (locked) return;
      rep = b.dataset.id;
      box.querySelectorAll(".rep-opt").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const now = box.querySelector(".rep-now");
      if (now) now.innerHTML = badgeHTML(rep);
      prepare(model());
    }));

    /* 필름 안에서만 찾아요 — 옛 은퇴식 한마디 칸이 같은 id로 남아 있으면 문서 앞쪽의 그걸 잡아요 */
    const btn = box.querySelector("#btn-hof-word");
    const input = box.querySelector("#hof-word");
    const done = box.querySelector("#hof-word-done");
    if (opt.final && btn && input) {
      btn.addEventListener("click", () => {
        if (locked) return;
        const clean = C && C._t && C._t.cleanWord ? C._t.cleanWord : (v) => String(v == null ? "" : v).trim();
        const w = clean(input.value) || null;
        btn.disabled = true;
        input.disabled = true;              // 두 번 못 올려요 — hof 표는 덮어쓸 수 없어요
        Promise.resolve().then(() => C.leave(opt.entryId, { rep, word: w })).then((ok) => {
          locked = true;
          box.querySelectorAll(".rep-opt").forEach((x) => { x.disabled = true; });
          if (ok) {
            word = w;
            if (w) input.value = w;
            done.textContent = w ? `“${w}” — 카드에 남겼어요` : "대표 업적을 카드에 남겼어요";
            prepare(model());
          } else {
            done.textContent = "이미 명예의 전당에 올라가 있어요 — 대표 업적과 한마디는 바꿀 수 없어요";
          }
        }).catch((e) => {
          console.error(e);
          btn.disabled = false;
          input.disabled = false;
          done.textContent = "남기지 못했어요 — 잠시 뒤 다시 눌러 주세요";
        });
      });
    }

    box.querySelectorAll(".film-acts [data-act]").forEach((b) => b.addEventListener("click", () => {
      const act = b.dataset.act;
      if (act === "share") {
        b.disabled = true;
        share(model()).then((how) => { if (st) st.textContent = SHARE_MSG[how] || ""; })
          .catch(() => { if (st) st.textContent = SHARE_MSG.fail; })
          .then(() => { b.disabled = false; });
      } else if (act === "hof") {
        if (C && C.showHof) C.showHof();        // 안 올린 항목은 showHof가 올려요
      } else if (act === "new") {
        /* 한마디를 안 쓰고 바로 나가는 사람이 많아요 — 기본값으로 올려 보내고 새로 시작해요(옛 은퇴식과 같아요) */
        const flush = C && C._t && C._t.flushHof;
        b.disabled = true;
        Promise.resolve(flush ? flush() : null).catch(() => {}).then(() => location.reload());
      } else if (act === "back") {
        show(filmBack);
      }
    }));
    prepare(model());                            // 공유 이미지를 미리 구워 둬요(누를 때 기다림 없이)
  }

  // ═══════════════════════════════════════════════════════════════
  // 📤 공유 이미지 — 1080×1350, 자산 0장(런타임 Canvas 2D). 스펙 §5-7
  // ═══════════════════════════════════════════════════════════════
  const CW = 1080, CH = 1350, PAD = 80;
  const FT = (px) => `${px}px "Jua", "Gowun Dodum", sans-serif`;
  const FB = (px) => `${px}px "Gowun Dodum", sans-serif`;
  /* 색은 테마 변수에서 읽어요 — 캔버스는 CSS 변수를 못 보니 계산된 값을 꺼내요 */
  function palette() {
    let cs = null;
    try { cs = getComputedStyle(document.body); } catch { /* 없을 때 */ }
    const v = (k, d) => ((cs && cs.getPropertyValue(k)) || "").trim() || d;
    return {
      bg: v("--bg", "black"), bg2: v("--bg2", "black"), field: v("--field", "black"), line: v("--line", "gray"),
      accent: v("--accent", "white"), sky: v("--sky", "white"), text: v("--text", "white"), dim: v("--dim", "gray"),
      cream: v("--cream", "white"), t1: v("--r1", "gray"), t2: v("--r2", "white"), t3: v("--r3", "white"), t4: v("--r4", "white"),
    };
  }
  function alpha(c, a) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).trim());
    if (!m) return c;
    const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
    return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
  }
  /* 글자 단위 — 국기(🇰🇷)·합성 이모지를 반으로 자르면 깨진 글자가 나와요 */
  function graphemes(s) {
    try {
      if (window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(s), (x) => x.segment);
    } catch { /* 없으면 코드포인트로 */ }
    return Array.from(s);
  }
  /* 폭을 재서 자르고 말줄임 — 글자 수가 아니라 폭이에요(스펙 §5-7) */
  function clip(ctx, s, maxW) {
    s = String(s == null ? "" : s);
    if (ctx.measureText(s).width <= maxW) return s;
    const g = graphemes(s);
    let lo = 0, hi = g.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ctx.measureText(g.slice(0, mid).join("") + "…").width <= maxW) lo = mid; else hi = mid - 1;
    }
    return g.slice(0, lo).join("").trimEnd() + "…";
  }
  /* 크게 쓰다가 안 들어가면 줄이고, 그래도 넘치면 말줄임 */
  function fit(ctx, s, font, big, small, maxW) {
    for (let px = big; px >= small; px -= 4) {
      ctx.font = font(px);
      if (ctx.measureText(s).width <= maxW) return s;
    }
    ctx.font = font(small);
    return clip(ctx, s, maxW);
  }
  /* 폭으로 줄바꿈 — 띄어쓰기에서 먼저 끊고, 한 낱말이 한 줄보다 길면 글자로. 넘치면 마지막 줄 말줄임 */
  function wrapLines(ctx, s, maxW, maxLines) {
    const lines = [];
    let line = "";
    for (const w of String(s).split(/(\s+)/)) {
      if (!w) continue;
      if (ctx.measureText(line + w).width <= maxW) { line += w; continue; }
      if (line.trim()) { lines.push(line.trim()); line = ""; }
      if (/^\s+$/.test(w)) continue;
      let part = "";
      for (const g of graphemes(w)) {
        if (part && ctx.measureText(part + g).width > maxW) { lines.push(part); part = g; } else part += g;
      }
      line = part;
    }
    if (line.trim()) lines.push(line.trim());
    if (lines.length <= maxLines) return lines;
    const keep = lines.slice(0, maxLines - 1);
    keep.push(clip(ctx, lines.slice(maxLines - 1).join(" "), maxW));
    return keep;
  }
  /* 🌍 여정 — 다 안 들어가면 첫 리그와 끝의 몇 칸만 남기고 가운데를 「…」로 */
  function pathFit(ctx, items, maxW) {
    const line = (l) => `🌍 ${l.join(" → ")}`;
    if (ctx.measureText(line(items)).width <= maxW) return line(items);
    for (let k = items.length - 2; k >= 1; k--) {
      const s2 = line([items[0], "…"].concat(items.slice(-k)));
      if (ctx.measureText(s2).width <= maxW) return s2;
    }
    return clip(ctx, line([items[0], "…", items[items.length - 1]]), maxW);
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  /* 필름(`head`가 있는 것)이든 명전 항목(요약 카드)이든 같은 모양으로 맞춰요 */
  function cardModel(src) {
    if (!src || typeof src !== "object") return null;
    if (src.head) {
      const h = src.head;
      const ch = Array.isArray(src.ch) ? src.ch : [];
      const sum = (k) => (ch.some((c) => c[k] != null) ? ch.reduce((a, c) => a + (+c[k] || 0), 0) : null);
      const lgs = [];
      ch.forEach((c) => (Array.isArray(c.lgs) ? c.lgs : []).forEach((id) => { if (lgs[lgs.length - 1] !== id) lgs.push(id); }));
      const hon = Array.isArray(src.hon) ? src.hon : [];
      const aw = Array.isArray(src.awards) ? src.awards.filter((x) => x && x.n > 0).map((x) => [x.label, x.n]) : [];
      const pick = src.pick || {};
      return {
        name: h.name, no: h.no, pos: h.pos, grade: h.grade, score: h.score, flag: h.flag || null,
        path: lgs.map(lgName).filter(Boolean),
        seasons: ch.length ? Math.max(...ch.map((c) => +c.y1 || 0)) : null,
        apps: sum("apps"), g: sum("g"), a: sum("a"), d: sum("d"),
        aw: [["🏆 우승", hon.length]].concat(aw),
        rep: h.rep || null, style: pick.style ? pick.style.name : null,
        best: pick.best || null, bright: pick.best ? null : pick.bright || null, word: src.word || null,
      };
    }
    return {
      name: src.name, no: src.no, pos: src.pos, grade: src.grade, score: src.score, flag: null,
      path: String(src.leagues || "").split(" → ").filter(Boolean), seasons: src.seasons, apps: src.apps, g: src.goals, a: src.assists, d: src.defense,
      aw: [["🏆 우승", src.trophies], ["🏅 발롱도르", src.ballon], ["🎖️ 리그MVP", src.daesang], ["🌏 월드컵 우승", src.wcWin]]
        .filter(([, n]) => n > 0),
      rep: src.rep || null, style: styleName(src.style), best: src.best || null, word: src.word || null,
    };
  }
  const siteText = () => {
    try { return (location.host + location.pathname).replace(/\/beta\//, "/").replace(/index\.html$/, ""); } catch { return ""; }
  };
  function drawCard(canvas, src) {
    const m = cardModel(src);
    if (!canvas || !m) return canvas;
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return canvas;
    const P = palette();
    const IW = CW - PAD * 2;
    // 배경 — 그라운드 줄무늬 위에 카드 한 장
    const bg = ctx.createLinearGradient(0, 0, 0, CH);
    bg.addColorStop(0, P.field);
    bg.addColorStop(1, P.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = alpha(P.text, 0.025);
    for (let x = 0; x < CW; x += 180) ctx.fillRect(x, 0, 90, CH);
    ctx.strokeStyle = P.line;
    ctx.lineWidth = 4;
    rr(ctx, 30, 30, CW - 60, CH - 60, 36);
    ctx.stroke();
    ctx.textBaseline = "middle";
    // 로고 줄
    ctx.textAlign = "left";
    ctx.fillStyle = P.accent;
    ctx.font = FT(46);
    ctx.fillText("⚽ 더 윙어", PAD, 104);
    ctx.textAlign = "right";
    ctx.fillStyle = P.dim;
    ctx.font = FB(30);
    ctx.fillText("축구선수 키우기 · 은퇴 카드", CW - PAD, 106);
    ctx.textAlign = "center";

    // 가운데 줄들 — 있는 것만 쌓고, 남는 자리는 줄 사이에 고르게 나눠요
    const rows = [];
    const text = (s, font, color, h) => rows.push({ h, draw: (y) => { ctx.font = font; ctx.fillStyle = color; ctx.fillText(s, CW / 2, y + h / 2); } });
    if (m.grade) { const s = fit(ctx, m.grade, FT, 44, 30, IW); const f = ctx.font; text(s, f, P.cream, 60); }
    { const s = fit(ctx, m.name || "", FT, 128, 64, IW); const f = ctx.font; text(s, f, P.text, 138); }
    const sub = [m.no ? `#${m.no}` : "", posName(m.pos), m.flag ? `${m.flag} 유스` : ""].filter(Boolean).join(" · ");
    if (sub) { ctx.font = FB(40); text(clip(ctx, sub, IW), FB(40), P.sky, 56); }
    if (m.score != null) {
      rows.push({ h: 172, draw: (y) => {
        ctx.fillStyle = P.dim; ctx.font = FB(32); ctx.fillText("커리어 점수", CW / 2, y + 22);
        ctx.fillStyle = P.accent; ctx.font = FT(120); ctx.fillText(num(m.score), CW / 2, y + 112);
      } });
    }
    if (m.path.length) { ctx.font = FB(36); text(pathFit(ctx, m.path, IW), FB(36), P.text, 54); }
    const cells = [["시즌", m.seasons], ["경기", m.apps], ["⚽ 골", m.g],
      m.pos === "df" ? ["🛡️ 수비", m.d] : ["🅰️ 도움", m.a]].filter(([, v]) => v != null);
    if (cells.length) {
      rows.push({ h: 168, draw: (y) => {
        const gap = 20;
        const w = (IW - gap * (cells.length - 1)) / cells.length;
        cells.forEach(([k, v], i) => {
          const x = PAD + i * (w + gap);
          ctx.fillStyle = alpha(P.bg, 0.55);
          rr(ctx, x, y, w, 168, 24);
          ctx.fill();
          ctx.fillStyle = P.text; ctx.font = FT(64); ctx.fillText(clip(ctx, num(v), w - 16), x + w / 2, y + 70);
          ctx.fillStyle = P.dim; ctx.font = FB(30); ctx.fillText(clip(ctx, k, w - 16), x + w / 2, y + 132);
        });
      } });
    }
    /* 수상 — 이름표를 붙인 채 **앞에서부터 들어가는 만큼만**(필름의 awards는 격 순서예요).
     * 이모지만 남기면 갈 수가 없어요 — 🏆가 우승도 리그MVP도, 🏅가 발롱도르도 MOM도 돼요(실제 필름으로 봄) */
    const awl = (m.aw || []).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${num(n)}`);
    if (awl.length) {
      ctx.font = FB(36);
      const fitAw = [];
      for (const x of awl) { if (ctx.measureText(fitAw.concat(x).join(" · ")).width > IW) break; fitAw.push(x); }
      text(fitAw.length ? fitAw.join(" · ") : clip(ctx, awl[0], IW), FB(36), P.cream, 54);
    }
    const def = m.rep ? achDef(m.rep) : null;
    const tier = def ? tierOf(m.rep) : null;
    if (def && TIER[tier]) {
      rows.push({ h: 96, draw: (y) => {
        const col = P[TIER[tier].cls];
        ctx.font = FT(40);
        const label = clip(ctx, `${TIER[tier].icon} ${tier} · ${def.name}`, IW - 80);
        const w = Math.min(IW, ctx.measureText(label).width + 80);
        const x = (CW - w) / 2;
        ctx.fillStyle = alpha(P.bg, 0.6);
        rr(ctx, x, y + 6, w, 84, 42);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = P.text;
        ctx.fillText(label, CW / 2, y + 48);
      } });
    }
    if (m.style) { ctx.font = FB(36); text(clip(ctx, m.style, IW), FB(36), P.text, 54); }
    if (m.best && m.best.name) {
      ctx.font = FB(32);
      text(clip(ctx, `🎯 최고의 한 수 — ${m.best.name}, 성공 확률 ${m.best.pct}%`, IW), FB(32), P.sky, 50);
    } else if (m.bright) {
      /* 🌟 가장 빛난 시즌 — 한 줄에 「9시즌 ○○」를 먼저, 들어가면 주 기록 하나 · 수상 하나를 더해요
       * (수비수는 수비, 미드필더는 도움, 나머지는 골 — 위 숫자 네 칸과 같은 결) */
      const b = m.bright;
      const mainK = m.pos === "df" ? ["d", "수비 "] : m.pos === "mf" ? ["a", "도움 "] : ["g", ""];
      const mainV = b[mainK[0]];
      const tail = [mainV != null ? (mainK[0] === "g" ? `${num(mainV)}골` : `${mainK[1]}${num(mainV)}`) : "",
        Array.isArray(b.aw) && b.aw.length ? b.aw[0] : ""].filter(Boolean);
      ctx.font = FB(32);
      let line = `🌟 가장 빛난 시즌 — ${b.y}시즌${b.club ? ` ${b.club}` : ""}`;
      for (const t of tail) { if (ctx.measureText(`${line} · ${t}`).width <= IW) line += ` · ${t}`; else break; }
      text(clip(ctx, line, IW), FB(32), P.sky, 50);
    }
    if (m.word) {
      ctx.font = FB(34);
      const ls = wrapLines(ctx, `🖊️ “${m.word}”`, IW, 2);
      rows.push({ h: ls.length * 48, draw: (y) => {
        ctx.font = FB(34); ctx.fillStyle = P.cream;
        ls.forEach((l, i) => ctx.fillText(l, CW / 2, y + 24 + i * 48));
      } });
    }
    const top = 160, bottom = CH - 110;
    const used = rows.reduce((a, r) => a + r.h, 0);
    const gap = Math.max(10, Math.min(46, (bottom - top - used) / (rows.length + 1)));
    let y = top + Math.max(0, (bottom - top - used - gap * (rows.length - 1)) / 2);
    rows.forEach((r) => { r.draw(y); y += r.h + gap; });
    // 하단 주소
    ctx.fillStyle = P.dim;
    ctx.font = FB(28);
    ctx.fillText(clip(ctx, siteText(), IW), CW / 2, CH - 70);
    return canvas;
  }

  /* 글꼴 — Google Fonts는 한글을 unicode-range 조각으로 나눠 줘요. 글자 없이 load하면 **첫 조각만** 받아서
   * 캔버스에 「축」「잔」 같은 글자가 시스템 글꼴로 섞여 나왔어요(헤드리스 실측). 그릴 글자를 같이 넘겨요 */
  const CARD_TXT = "더 윙어 축구선수 키우기 · 은퇴 카드 커리어 점수 시즌 경기 골 도움 수비 유스 최고의 한 수 성공 확률 전설 귀함 드묾 흔함 0123456789#,…→";
  function fontsReady(m) {
    const F = document.fonts;
    if (!F || !F.load) return Promise.resolve();
    const def = m && m.rep ? achDef(m.rep) : null;
    const txt = CARD_TXT + (m ? JSON.stringify(m) : "") + (def ? def.name : "") + (m ? posName(m.pos) : "");
    const load = Promise.all([F.load(FT(64), txt), F.load(FB(32), txt)]).catch(() => {});
    return Promise.race([load, new Promise((r) => setTimeout(r, 1500))]);   // 못 받으면 시스템 글꼴로
  }
  const toBlob = (c) => new Promise((res) => {
    const t = setTimeout(() => res(null), 4000);
    try {
      if (!c.toBlob) { clearTimeout(t); res(null); return; }
      c.toBlob((b) => { clearTimeout(t); res(b || null); }, "image/png");
    } catch { clearTimeout(t); res(null); }
  });
  const fileName = (m) => `the-winger-${String(m.name || "card").replace(/[^\w가-힣-]+/g, "_").slice(0, 24)}.png`;
  /* 미리 굽기 — iOS 사파리는 기다린 뒤의 navigator.share를 사용자 제스처로 안 쳐 줄 수 있어요.
   * 누르기 전에 구워 두면 누르는 순간 바로 공유 시트를 엽니다 */
  const baked = new Map();
  function prepare(src) {
    const m = cardModel(src);
    if (!m) return Promise.resolve(null);
    const key = JSON.stringify(m);
    const had = baked.get(key);
    if (had) return had.p;
    const rec = { done: false, v: null };
    rec.p = fontsReady(m).then(() => {
      const c = document.createElement("canvas");
      drawCard(c, src);
      return toBlob(c).then((blob) => { rec.v = { canvas: c, blob, name: fileName(m) }; rec.done = true; return rec.v; });
    }).catch(() => null);
    baked.set(key, rec);
    if (baked.size > 4) baked.delete(baked.keys().next().value);
    return rec.p;
  }
  const inApp = () => /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|; wv\)/i.test(navigator.userAgent || "");
  /* 내보내기 — ① 공유 시트 ② <a download> PNG ③ 이미지 창(길게 눌러 저장)
   * 인앱 브라우저(카카오톡 등)는 ②가 페이지를 blob 주소로 넘겨 버릴 수 있어 ③으로 바로 가요 */
  function share(src) {
    const m = cardModel(src);
    if (!m) return Promise.resolve("fail");
    const rec = baked.get(JSON.stringify(m));
    if (rec && rec.done) return deliver(rec.v, m);          // 구워 둔 게 있으면 기다림 없이
    return prepare(src).then((v) => deliver(v, m));
  }
  function deliver(v, m) {
    if (!v || (!v.blob && !v.canvas)) return Promise.resolve("fail");
    let file = null;
    try { if (v.blob && typeof File === "function") file = new File([v.blob], v.name, { type: "image/png" }); } catch { /* 옛 브라우저 */ }
    let can = false;
    try { can = !!(file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })); } catch { can = false; }
    if (can) {
      return navigator.share({ files: [file], title: "더 윙어", text: `${m.name} — ${m.grade || "은퇴 카드"}` })
        .then(() => "share")
        .catch((e) => (e && e.name === "AbortError" ? "cancel" : showImage(v, m)));
    }
    if (v.blob && !inApp() && "download" in document.createElement("a")) {
      const url = URL.createObjectURL(v.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = v.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return Promise.resolve("download");
    }
    return Promise.resolve(showImage(v, m));
  }
  function showImage(v, m) {
    let url = "";
    try { url = v.blob ? URL.createObjectURL(v.blob) : v.canvas.toDataURL("image/png"); } catch { url = ""; }
    if (!url) return "fail";
    const canCopy = !!(v.blob && navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem === "function");
    const wrap = openLayer("share-overlay", `<div class="av-modal share-modal">
      <h3 class="av-title" id="share-title">📤 공유 이미지</h3>
      <img class="share-img" src="${esc(url)}" alt="${esc(m.name)}의 은퇴 카드" />
      <p class="share-hint">이미지를 길게 눌러 저장하거나 공유하세요</p>
      <div class="av-actions share-acts">
        ${canCopy ? `<button type="button" class="btn btn-ghost share-copy">📋 이미지 복사</button>` : ""}
        <button type="button" class="btn btn-primary share-close">닫기</button>
      </div>
      <p class="share-st" role="status"></p>
    </div>`, "share-title");
    const close = () => { closeLayer(wrap); if (v.blob) setTimeout(() => URL.revokeObjectURL(url), 1000); };
    wrap.querySelector(".share-close").addEventListener("click", close);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    const cp = wrap.querySelector(".share-copy");
    if (cp) {
      cp.addEventListener("click", () => {
        const out = wrap.querySelector(".share-st");
        navigator.clipboard.write([new ClipboardItem({ "image/png": v.blob })])
          .then(() => { out.textContent = "📋 복사했어요 — 대화창에 붙여 넣으면 돼요"; })
          .catch(() => { out.textContent = "복사가 막혀 있어요 — 이미지를 길게 눌러 저장해 주세요"; });
      });
    }
    return "image";
  }

  // ---------- 🎬 WingerFilm에 붙이기 — film.js가 먼저 로드돼요(스펙 §6-5) ----------
  try {
    const F = window.WingerFilm || (window.WingerFilm = {});
    F.drawCard = drawCard;
    F.share = share;
    /* 미리 굽기 — 명전 카드가 열릴 때 불러 두면, 📤를 누르는 순간 기다림 없이 공유 시트가 떠요(iOS 사파리 제스처).
     * 결과는 모델이 같으면 재사용해요(share가 같은 열쇠로 찾아요) */
    F.prepare = prepare;
  } catch (e) { console.error("WingerFilm에 공유 이미지를 못 붙였어요", e); }

  // ---------- 타이틀 「📖 도감」 · 도감 돌아가기 ----------
  const bb = byId("btn-book");
  if (bb) bb.addEventListener("click", () => openBook("ev"));
  const bk = byId("btn-book-back");
  if (bk) bk.addEventListener("click", () => show(bookBack));

  return {
    eventOverlay, numberPicker, openBook, bookTab, achTab, openFilm,
    /* 계약 밖 — 쓰면 좋은 것: 대표 업적 배지 HTML(모르는 id는 ""). 명전 카드·📊 기록 머리 줄이 같은 모양을 쓰게 */
    badge: badgeHTML,
  };
})();
