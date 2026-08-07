/* 🔥 1년 특훈 — 프로 도전에 실패한 뒤 한 해를 더 쓰는 자리예요.
 *
 * 예전에는 🌱 유스 재계약이 **3년차를 통째로 다시 뛰게** 했어요. 방금 한 걸
 * 그대로 한 번 더 하는 거라 "떨어졌으니 벌을 받는" 느낌이었고, 무엇을 바꿔야
 * 하는지도 손에 안 잡혔습니다. 그 1년을 여섯 번의 선택으로 바꿨어요.
 *
 * 한 회차마다 **올릴 능력치**와 **방식**을 고릅니다.
 *   💪 노력 — 연타 미니게임. 친 만큼 오르고, 못 쳐도 최소치는 보장해요.
 *   🎲 도박 — 한 방 판정. 🌠 대박 · 성공 · 허탕 · 부상 네 갈래예요.
 *
 * 설계에서 지킨 것 셋:
 *   ① 노력은 손해 보지 않아요. 연타를 못 하는 사람(자동 미니게임 포함)도 최소
 *      상승이 있어야 해요 — 아니면 "실패해서 특훈 받았는데 특훈도 실패"가 되고,
 *      그건 이번에 걷어낸 막다른 길과 같은 병입니다.
 *   ② 도박의 기댓값은 노력과 비슷하게, 분산만 크게. 늘 이득이면 선택이 아니라
 *      정답이 되고, 늘 손해면 아무도 안 고릅니다.
 *   ③ 능력치를 골라서 올려요. 특훈이 "모자란 걸 메우는 1년"이라야 의미가 있어요.
 *
 * game.js의 전역(S, $, rand, randInt, clamp, show, save, STAT_DEFS, statCap,
 * autoMiniOn, addLog)을 쓰므로 game.js 뒤에 로드해야 해요.
 * ⚠️ 연타 미니게임은 여기에만 둡니다. timing.js는 8개 게임이 전부 내려받아요. */
"use strict";

window.WingerCamp = (() => {
  const CAMP_TURNS = 6;          // 특훈 회차
  const TAP_MS = 3000;           // 연타 제한 시간
  const TAP_TARGET = 40;         // 이만큼 치면 최대치
  const EFFORT_MIN = 2.0;        // 연타를 한 번도 못 쳐도 이만큼은 올라요
  const EFFORT_MAX = 7.0;

  /* 🎲 도박 — 넷 중 하나. 기댓값은
   *   0.10×14 + 0.36×7.5 + 0.39×0.5 + 0.15×(−4) = 3.5
   * 노력(자동 판정 3~5 · 잘 치면 6~7)과 비슷한 자리에 두고 분산만 키웠어요.
   * 대박은 여섯 회차 중 한 번쯤 나와요(1 − 0.9⁶ = 47%). */
  const GAMBLE = [
    { p: 0.10, key: "jack", name: "🌠 대박!", lo: 12, hi: 16, fan: 40,
      txt: "몸이 갑자기 열렸어요. 코치가 눈을 의심합니다." },
    { p: 0.36, key: "good", name: "✅ 성공", lo: 6, hi: 9, fan: 18,
      txt: "무리한 훈련이 통했어요." },
    { p: 0.39, key: "miss", name: "💨 허탕", lo: 0, hi: 1, fan: 0,
      txt: "몸만 축났어요. 얻은 건 거의 없습니다." },
    { p: 0.15, key: "hurt", name: "🤕 부상", lo: -5, hi: -3, fan: -10,
      txt: "무리하다 다쳤어요. 회복하는 데 시간을 썼습니다." },
  ];

  let cur = null;   // { turn, key, log: [] }

  const statDefs = () => STAT_DEFS;
  const nameOf = (key) => (statDefs().find((d) => d.key === key) || {}).name || key;

  /* 능력치를 올려요. 상한을 넘지 않고, 깎일 때도 0 밑으로는 안 내려가요. */
  function bump(key, delta) {
    const before = S.stats[key];
    S.stats[key] = clamp(before + delta, 0, statCap(key));
    return Math.round((S.stats[key] - before) * 10) / 10;
  }

  function start() {
    if (S.campDone || S.youthExt) return;      // 커리어당 한 번
    cur = { turn: 0, key: null, log: [] };
    /* 두 플래그를 같이 세워요. 엔딩 화면의 버튼은 여전히 youthExt로 판단하니,
     * 여기만 세우면 특훈을 마친 뒤에도 버튼이 다시 뜹니다. */
    S.campDone = true;
    S.youthExt = true;
    addLog("🔥 1년 특훈에 들어갔어요.");
    save();
    render();
    show("screen-camp");
  }

  // ---------- 화면 ----------
  function render() {
    const left = CAMP_TURNS - cur.turn;
    $("camp-turn").textContent = `${cur.turn + 1} / ${CAMP_TURNS}회차`;
    $("camp-cond").textContent = `🩹 컨디션 ${Math.round(S.condition)}`;
    $("camp-title").textContent = cur.key
      ? `${nameOf(cur.key)} — 어떻게 훈련할까요?`
      : "이번 회차엔 무엇을 단련할까요?";

    const box = $("camp-actions");
    box.innerHTML = "";
    if (!cur.key) {
      for (const d of statDefs()) {
        const b = document.createElement("button");
        b.className = "btn camp-stat";
        b.dataset.key = d.key;
        b.innerHTML = `<span class="cs-emoji">${d.emoji}</span>${d.name}`
          + `<span class="cs-now">${Math.round(S.stats[d.key])}</span>`;
        b.onclick = () => { cur.key = d.key; render(); };
        box.appendChild(b);
      }
    } else {
      const effort = document.createElement("button");
      effort.id = "btn-camp-effort";
      effort.className = "btn btn-primary camp-way";
      effort.innerHTML = `💪 노력<span class="cw-sub">연타 ${TAP_MS / 1000}초 — 친 만큼 올라요 (최소 +${EFFORT_MIN})</span>`;
      effort.onclick = startTap;
      box.appendChild(effort);

      const gamble = document.createElement("button");
      gamble.id = "btn-camp-gamble";
      gamble.className = "btn btn-ghost camp-way";
      gamble.innerHTML = `🎲 도박<span class="cw-sub">🌠 대박 · ✅ 성공 · 💨 허탕 · 🤕 부상</span>`;
      gamble.onclick = doGamble;
      box.appendChild(gamble);

      const back = document.createElement("button");
      back.className = "btn btn-ghost camp-back";
      back.textContent = "↩ 다른 능력치 고르기";
      back.onclick = () => { cur.key = null; render(); };
      box.appendChild(back);
    }

    $("camp-log").innerHTML = cur.log
      .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`).join("");
    $("camp-left").textContent = left > 0 ? `${left}회 남았어요` : "";
    $("camp-tap").hidden = true;
  }

  // ---------- 💪 노력 — 연타 ----------
  function startTap() {
    /* 🤖 자동 미니게임을 켠 사람에게는 능력치로 대신 굴려줘요.
     * 연타는 손이 빠른 사람이 유리한 장치라, 자동 쪽이 손해만 보면 안 됩니다 —
     * 체력이 좋을수록 잘 치는 것으로 봐서 중간값 언저리를 줍니다. */
    if (typeof autoMiniOn === "function" && autoMiniOn()) {
      const auto = Math.round(TAP_TARGET * clamp(0.45 + (S.stats.stamina || 40) / 260, 0.35, 0.95));
      finishTap(auto);
      return;
    }
    const box = $("camp-tap");
    box.hidden = false;
    const btn = $("camp-tap-btn");
    const bar = $("camp-tap-bar");
    const cnt = $("camp-tap-count");
    let taps = 0, done = false;
    cnt.textContent = "0";
    bar.style.width = "100%";
    btn.disabled = false;
    $("camp-actions").querySelectorAll("button").forEach((b) => { b.disabled = true; });

    const t0 = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, 1 - (Date.now() - t0) / TAP_MS);
      bar.style.width = `${left * 100}%`;
      if (left <= 0) end();
    }, 50);
    /* 실기기는 pointerdown → pointerup → click이 다 와요. 한 번의 탭이 두 번
     * 세어지지 않게 pointerdown만 듣고 click은 막아요. */
    const onTap = (ev) => {
      ev.preventDefault();
      if (done) return;
      taps += 1;
      cnt.textContent = String(taps);
      btn.classList.remove("hit");
      void btn.offsetWidth;
      btn.classList.add("hit");
    };
    const end = () => {
      if (done) return;
      done = true;
      clearInterval(tick);
      btn.removeEventListener("pointerdown", onTap);
      btn.disabled = true;
      finishTap(taps);
    };
    btn.addEventListener("pointerdown", onTap);
    setTimeout(end, TAP_MS + 60);
  }

  function finishTap(taps) {
    const ratio = clamp(taps / TAP_TARGET, 0, 1);
    const gain = Math.round((EFFORT_MIN + (EFFORT_MAX - EFFORT_MIN) * ratio) * 10) / 10;
    const got = bump(cur.key, gain);
    const fan = 10 + Math.round(15 * ratio);
    S.fandom = Math.max(0, (S.fandom || 0) + fan);
    S.condition = clamp(S.condition - randInt(4, 8), 0, 100);
    push(`💪 ${nameOf(cur.key)} 연타 ${taps}회 — +${got.toFixed(1)} · ⭐ 명성 +${fan}`);
    nextTurn();
  }

  // ---------- 🎲 도박 ----------
  function doGamble() {
    const r = Math.random();
    let acc = 0, hit = GAMBLE[GAMBLE.length - 1];
    for (const g of GAMBLE) { acc += g.p; if (r < acc) { hit = g; break; } }
    const delta = Math.round(rand(hit.lo, hit.hi) * 10) / 10;
    const got = bump(cur.key, delta);
    S.fandom = Math.max(0, (S.fandom || 0) + hit.fan);
    S.condition = clamp(S.condition - (hit.key === "hurt" ? randInt(12, 20) : randInt(2, 6)), 0, 100);
    const sign = got >= 0 ? "+" : "";
    push(`🎲 ${hit.name} ${nameOf(cur.key)} ${sign}${got.toFixed(1)}`
      + `${hit.fan ? ` · ⭐ 명성 ${hit.fan > 0 ? "+" : ""}${hit.fan}` : ""} — ${hit.txt}`);
    if (hit.key === "jack" && window.Fx) Fx.celebrate("award", "🌠 대박!");
    nextTurn();
  }

  const push = (line) => { cur.log.unshift(line); };

  function nextTurn() {
    cur.turn += 1;
    cur.key = null;
    save();
    if (cur.turn >= CAMP_TURNS) { finish(); return; }
    render();
  }

  /* 특훈이 끝나면 **곧바로 프로 재도전**으로 보내요.
   * 예전 연장(extendYouth)은 3년차 1월로 되돌려 유스 1년을 통째로 반복했어요.
   * 여기서는 여섯 번의 선택이 그 1년을 대신하니, 남은 건 도전뿐이에요. */
  function finish() {
    const box = $("camp-actions");
    box.innerHTML = "";
    $("camp-title").textContent = "🔥 특훈을 마쳤어요";
    $("camp-turn").textContent = `${CAMP_TURNS} / ${CAMP_TURNS}회차`;
    $("camp-left").textContent = `종합 ${Math.round(overall())} · 이제 다시 도전할 때예요`;
    $("camp-tap").hidden = true;
    const go = document.createElement("button");
    go.id = "btn-camp-done";
    go.className = "btn btn-primary";
    go.textContent = "⚽ 프로 재도전";
    go.onclick = () => {
      cur = null;
      save();
      startSurvival();
    };
    box.appendChild(go);
    $("camp-log").innerHTML = cur.log
      .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`).join("");
  }

  return {
    start,
    CAMP_TURNS, TAP_MS, TAP_TARGET, EFFORT_MIN, EFFORT_MAX, GAMBLE,
    _t: { finishTap, doGamble, state: () => cur },
  };
})();
