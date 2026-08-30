/* 🎉 피버 타임 — 운영자가 기간을 열면 그동안 모두에게 붙는 임시 보너스.
 *
 * 요청: "관리자 사이트에서 기간을 설정하고, 그 시간에 접속한 사람은 확률이나
 * 효율이 올라간다. 접속하면 배너가 뜨고, **이미 접속해 있던 사람에게도** 뜬다."
 *
 * ── 왜 이렇게 만들었나 ──
 *
 * 이 게임은 정적 파일이라 **서버가 먼저 말을 걸 수단이 없어요.** 그래서 서버가
 * 알리는 대신, 이벤트를 **시각의 구간**으로 받아 둡니다. 구간만 알면 그다음은
 * 로컬 시계로 판정할 수 있어서, 화면이 바뀔 때마다(show) 네트워크 없이
 * "지금 피버인가"를 다시 봐요. 이미 켜 둔 화면에서도 다음 화면으로 넘어가는
 * 순간 배너가 뜹니다. 구간 자체는 가끔(REFRESH_MS)만 다시 받아 와요.
 *
 * ── 상한 밖에 둡니다 ──
 *
 * 시즌 칭호에는 종류별 합계 상한(BUFF_CAP)이 있어요. 한 번 앞서간 커리어가
 * 영원히 앞서가는 걸 막는 장치예요. 피버는 **커리어가 쌓은 게 아니라 운영자가
 * 모두에게 준 것**이고 기간이 지나면 사라지니, 그 상한 밖에서 더해요 —
 * 안 그러면 칭호를 많이 단 사람에게는 이벤트가 아무 일도 안 일어납니다.
 * 대신 여기서 **읽는 쪽이 스스로 상한을 겁니다**(FEVER_CAP). 운영 실수로
 * 훈련 +500%가 들어와도 게임이 안 무너져야 해요.
 *
 * ── 저장 ──
 *
 * Supabase `fever` 테이블. 읽기는 누구나, **쓰기는 fever_set RPC 하나로만**
 * 들어가고 그 RPC가 비밀번호를 봐요. 공개 키로 아무나 이벤트를 열 수 없습니다.
 * 마지막으로 받은 구간은 localStorage에 남겨서, 비행기 모드에서도 이미 열린
 * 피버는 계속 붙어요.
 *
 * game.js의 전역(S, $, show)을 쓰지 않아요 — 혼자 굴러갑니다.
 * game.js보다 **먼저** 로드해도 되지만, activeBuffs가 이 모듈을 보므로
 * 순서와 무관하게 window.WingerFever로만 접근해요. */
"use strict";

window.WingerFever = (() => {
  const GAME = "winger2";
  const KEY = "grow-fever-winger2";        // 마지막으로 받아 둔 구간
  const SEEN_KEY = "grow-fever-seen";     // 이미 알린 이벤트 (같은 걸 두 번 안 알려요)
  const TEST_KEY = "grow-fever-test";     // 🧪 확인용 — 이게 있으면 네트워크 대신 이걸 봐요
  const REFRESH_MS = 10 * 60 * 1000;      // 구간을 다시 받아 오는 간격

  /* 붙일 수 있는 자리 — game.js의 버프 효과 키와 같아요.
   * 여기 없는 키는 무시해요. 운영자가 오타를 내도 조용히 지나갑니다. */
  const FEVER_CAP = { g: 0.5, a: 0.5, d: 0.5, rate: 0.6, moment: 0.15, train: 1.0 };
  const EFF_LABEL = {
    g: "골", a: "도움", d: "수비", rate: "경기 평점", moment: "승부처 성공", train: "훈련 상승폭",
  };

  const rd = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장이 꽉 찼으면 넘어가요 */ } };

  /* 서버에서 온 한 줄을 **믿지 않고** 우리 모양으로 다시 세워요.
   * 시각이 안 읽히거나 구간이 뒤집혀 있으면 아예 없는 걸로 봅니다. */
  function normalize(row) {
    if (!row) return null;
    const from = Date.parse(row.starts_at), to = Date.parse(row.ends_at);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
    const eff = {};
    const raw = row.boost || {};
    for (const k of Object.keys(FEVER_CAP)) {
      const v = Number(raw[k]);
      if (Number.isFinite(v) && v > 0) eff[k] = Math.min(v, FEVER_CAP[k]);
    }
    return {
      id: String(row.id || "fever"),
      emoji: String(row.emoji || "🎉").slice(0, 4),
      title: String(row.title || "피버 타임").slice(0, 40),
      note: row.note ? String(row.note).slice(0, 80) : "",
      from, to, eff,
    };
  }

  const cache = () => normalize(rd(TEST_KEY) || (rd(KEY) || {}).row);

  /* 지금 이 순간 살아 있는 피버. 없으면 null이에요. */
  function live() {
    const e = cache();
    if (!e) return null;
    const now = Date.now();
    return now >= e.from && now < e.to ? e : null;
  }

  /* game.js의 activeBuffs가 이걸 목록에 얹어요. 효과가 하나도 없으면 안 붙여요 —
   * 배너만 뜨고 아무 일도 안 일어나는 칭호는 거짓말이에요. */
  function buff() {
    const e = live();
    if (!e || !Object.keys(e.eff).length) return null;
    return { id: "fever", name: `${e.emoji} ${e.title}`, need: "피버 타임", eff: e.eff, desc: effText(e) };
  }

  const effText = (e) => Object.keys(e.eff)
    .map((k) => (k === "rate" ? `${EFF_LABEL[k]} +${e.eff[k].toFixed(2)}`
      : k === "moment" ? `${EFF_LABEL[k]} +${Math.round(e.eff[k] * 100)}%p`
        : `${EFF_LABEL[k]} +${Math.round(e.eff[k] * 100)}%`))
    .join(" · ");

  /* 남은 시간 — "2일 3시간" 같은 큰 단위 둘까지만. 초 단위로 째깍거리면
   * 화면이 바뀔 때마다 값이 달라져서 읽는 데 방해가 돼요. */
  function leftText(to) {
    let s = Math.max(0, Math.floor((to - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60);
    if (d) return `${d}일 ${h}시간 남음`;
    if (h) return `${h}시간 ${m}분 남음`;
    if (m) return `${m}분 남음`;
    return "곧 끝나요";
  }

  // ---------- 화면 ----------

  const BAR_ID = "fever-bar";

  /* 띠 높이를 본문에 알려요(--fever-h).
   *
   * 띠는 position:fixed 라 자리를 차지하지 않고, 본문을 그만큼 내려서 피해요.
   * 그런데 그 높이는 **고정이 아니에요** — 운영자가 넣은 효과가 많으면 문구가
   * 두 줄로 접혀서 띠가 두꺼워지고, 좁은 폰일수록 더 접혀요. 상수로 적어 두면
   * 반드시 어긋납니다: 2.6rem으로 두었더니 효과 한 개짜리 띠에서도 1.8px,
   * 두 줄로 접히면 15.8px가 HUD 위에서 잘렸어요(제보).
   * 그래서 재서 넣어요. 읽는 쪽은 style.css의 body.fever-on 규칙이에요. */
  const setH = () => {
    const bar = document.getElementById(BAR_ID);
    if (bar) document.documentElement.style.setProperty("--fever-h", `${bar.offsetHeight}px`);
  };

  function drawBar() {
    const e = live();
    let bar = document.getElementById(BAR_ID);
    if (!e) {
      if (bar) bar.remove();
      document.body.classList.remove("fever-on");
      document.documentElement.style.removeProperty("--fever-h");
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = BAR_ID;
      bar.className = "fever-bar";
      document.body.appendChild(bar);
      // 화면을 돌리면 접히는 줄 수가 달라져요 — 그때도 따라가야 해요
      if (window.ResizeObserver) new ResizeObserver(setH).observe(bar);
    }
    document.body.classList.add("fever-on");
    bar.innerHTML = `<span class="fv-emoji">${e.emoji}</span>`
      + `<span class="fv-body"><b>${e.title}</b>`
      + `${Object.keys(e.eff).length ? `<span class="fv-eff">${effText(e)}</span>` : ""}</span>`
      + `<span class="fv-left">${leftText(e.to)}</span>`;
    setH();   // ResizeObserver가 없는 브라우저에서도 첫 그림부터 맞아요
  }

  /* 처음 마주친 순간에만 한 번 크게 알려요. 같은 이벤트를 두 번 안 알리려고
   * 이벤트 id와 시작 시각을 함께 기억해요 — 운영자가 같은 id로 기간만 바꿔
   * 다시 열면 그건 **새 이벤트**입니다. */
  function announce(e) {
    const stamp = `${e.id}@${e.from}`;
    if (rd(SEEN_KEY) === stamp) return;
    wr(SEEN_KEY, stamp);
    if (document.querySelector(".fever-overlay")) return;
    const wrap = document.createElement("div");
    wrap.className = "av-overlay fever-overlay";
    wrap.innerHTML = `<div class="av-modal fever-modal">
      <div class="fv-big">${e.emoji}</div>
      <div class="av-title">${e.title}</div>
      ${e.note ? `<p class="fv-note">${e.note}</p>` : ""}
      ${Object.keys(e.eff).length ? `<p class="fv-eff-big">${effText(e)}</p>` : ""}
      <p class="hint">${leftText(e.to)}</p>
      <div class="av-actions"><button class="btn btn-primary" id="btn-fever-ok">좋아요!</button></div>
    </div>`;
    wrap.addEventListener("click", (ev) => { if (ev.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
    document.getElementById("btn-fever-ok").onclick = () => wrap.remove();
  }

  /* 화면이 바뀔 때마다 불러요(game.js의 show). **네트워크를 안 씁니다** —
   * 이미 받아 둔 구간과 지금 시각만 봐요. */
  function tick() {
    const e = live();
    drawBar();
    if (e) announce(e);
  }

  // ---------- 구간 받아 오기 ----------

  /* ⚠️ 베타에서도 읽어요. 다른 원격 기능은 베타에서 꺼 두지만(상용 데이터 격리),
   * 여기는 **읽기 전용**이라 상용에 아무것도 남기지 않고, 무엇보다 이 기능은
   * 베타에서 실제로 켜 봐야 확인이 됩니다. */
  const cfg = () => (window.Match && window.Match.cfg) || null;

  function refresh() {
    if (rd(TEST_KEY)) return Promise.resolve(cache());   // 🧪 확인용이 켜져 있으면 안 물어봐요
    const c = cfg();
    if (!c || !c.url || !c.key) return Promise.resolve(null);
    return fetch(`${c.url}/rest/v1/fever?game=eq.${GAME}&select=*&order=starts_at.desc&limit=5`,
      { headers: { apikey: c.key, Authorization: `Bearer ${c.key}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((arr) => {
        if (!Array.isArray(arr)) return null;
        const now = Date.now();
        /* 지금 살아 있는 것 우선, 없으면 **앞으로 올 것 중 가장 이른 것**.
         * 이미 끝난 건 안 남겨요 — 지난 배너가 되살아나면 안 되니까요. */
        const rows = arr.map(normalize).filter(Boolean);
        const now2 = rows.find((e) => now >= e.from && now < e.to)
          || rows.filter((e) => e.from > now).sort((a, b) => a.from - b.from)[0]
          || null;
        wr(KEY, { at: now, row: now2 ? { id: now2.id, emoji: now2.emoji, title: now2.title,
          note: now2.note, starts_at: new Date(now2.from).toISOString(),
          ends_at: new Date(now2.to).toISOString(), boost: now2.eff } : null });
        tick();
        return now2;
      })
      .catch(() => null);
  }

  const stale = () => {
    const box = rd(KEY);
    return !box || !box.at || Date.now() - box.at > REFRESH_MS;
  };

  function start() {
    refresh();
    setInterval(() => { if (!document.hidden && stale()) refresh(); }, 60 * 1000);
    // 앱으로 돌아왔을 때 — 오래 잠들어 있었으면 그동안 열린 이벤트가 있을 수 있어요
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { tick(); if (stale()) refresh(); } });
    tick();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  return { live, buff, tick, refresh, drawBar, effText, leftText, FEVER_CAP, _t: { normalize } };
})();
