/* 🏆 나라별 컵 대회 — 대진과 승부차기 미니게임.
 *
 * ── 왜 만들었나 ───────────────────────────────────────────────
 * 축구에는 **시즌의 절정이 없었어요.** 38라운드가 끝나면 바로 결산이었습니다.
 * 야구는 가을야구(대진 + 전용 미니게임 4종)가 정규시즌 내내 목표가 되어 주는데,
 * 축구는 리그 순위가 곧 끝이라 마지막 라운드와 5월의 평범한 경기가 똑같았어요.
 *
 * ── 컵이 리그와 다른 점 ───────────────────────────────────────
 * **1부와 2부가 같은 대진에 들어가요.** 리그에서는 절대 안 만나는 조합이 나옵니다 —
 * 2부 팀이 1부 강팀을 잡는 그림이 컵의 전부예요(자이언트 킬링).
 * 그리고 **단판**이에요. 리그는 38경기라 한 판 운이 묻히지만 여기서는 안 묻혀요.
 *
 * ── 승부차기를 따로 만든 이유 ─────────────────────────────────
 * 기존 미니게임 8종은 전부 '언제 누르나'를 물어요. 승부차기는 '어디로 차나'예요 —
 * 키퍼가 먼저 몸을 트는 걸 보고 **반대쪽**을 골라야 합니다. 축구에서만 가능한
 * 순간이고, 야구 가을야구가 전용 미니게임으로 살아난 것과 같은 자리예요.
 *
 * 실행만 여기 있어요. 대진을 굴리고 트로피를 주는 건 career.js입니다 —
 * 세이브를 만지는 코드는 한곳에 모아 둬야 해요. */
window.SoccerCup = (() => {
  "use strict";

  /* 나라마다 실제 컵 이름. LEAGUES의 country 값을 그대로 열쇠로 써요.
   * 모르는 나라면 nameOf가 일반명으로 떨어져서 화면이 안 깨져요. */
  const CUPS = {
    kr: "코리아컵",
    jp: "천황배",
    br: "코파 두 브라질",
    it: "코파 이탈리아",
    en: "FA컵",
  };
  const nameOf = (country) => CUPS[country] || "컵 대회";

  // 8강 → 4강 → 결승. 라운드 이름은 화면과 트로피에 그대로 쓰여요.
  const ROUNDS = ["8강", "4강", "결승"];

  const KICKS = 5;                    // 정규 키커 수
  /* 내가 차는 순번(1~5). 나머지 넷은 동료가 차요.
   *
   * ⚠️ 예전에는 **다섯 번을 전부 내가 찼어요.** "1번 (나) · 2번 (나) · 3번 (나)"가
   * 줄줄이 뜨는 게 화면에 그대로 보였습니다(제보). 축구에서 한 선수가 승부차기를
   * 연달아 차는 일은 없어요.
   *
   * 4번인 이유: 너무 앞이면 압박이 없고, 5번이면 조기 종료로 내 차례가 아예
   * 안 오는 판이 생겨요(승부가 갈리면 남은 키커를 안 세웁니다).
   * 4번은 거의 항상 차면서 늦은 순번의 부담이 있어요.
   * 서든데스는 전부 나예요 — 정규 키커를 다 쓴 뒤엔 에이스가 나섭니다. */
  const MY_KICK = 4;
  const SIDES = [
    { key: "L", label: "왼쪽", arrow: "⬅️" },
    { key: "C", label: "가운데", arrow: "⬆️" },
    { key: "R", label: "오른쪽", arrow: "➡️" },
  ];

  /* 키퍼와 같은 쪽을 골라도 뚫을 확률. 슛 능력치가 높을수록 커져요.
   * 0으로 두면 "읽히면 무조건 실패"라 실력이 낄 자리가 없어져요 —
   * 반대로 너무 높으면 방향을 고르는 의미가 사라집니다. */
  const powerThrough = (shoot) => Math.min(0.42, 0.06 + (shoot || 40) / 320);
  /* 반대쪽을 골랐는데도 빗나갈 확률. 슛이 낮으면 혼자 헛발질을 해요.
   * 이게 없으면 능력치와 무관하게 "반대만 고르면 100%"가 됩니다. */
  const missWide = (shoot) => Math.max(0.03, 0.22 - (shoot || 40) / 500);

  const el = (tag, cls, html) => {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  };
  const auto = () => localStorage.getItem("grow-auto-mini") === "1";
  const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
  // 자동이면 곧바로, 아니면 한 박자 쉬고 — 화면에서는 차례가 넘어가는 게 보여야 해요
  const next = (fn) => { if (auto()) fn(); else setTimeout(fn, 420); };

  /* 판정 없이 확률만 굴리는 킥. 팀 전력(0~100)이 높을수록 잘 넣어요.
   * 상대 키커와 **우리 동료 키커**가 같은 식을 써요 — 화면에는 결과만 나옵니다. */
  const oppScores = (str) => Math.random() < Math.min(0.9, 0.55 + (str || 60) / 400);

  /* 동료 키커 이름. career.js가 같은 클럽 선수 명단을 넘겨줘요.
   * 모자라면 번호로 채웁니다 — 옛 세이브나 명단이 빈 경우예요. */
  const mateName = (mates, n) => (mates && mates[n % mates.length]) || `${n + 1}번 키커`;

  /* 승부차기 한 판.
   *
   * box     — 그릴 자리 (career.js가 넘겨요)
   * cfg.shoot   내 슛 능력치 (뚫는 확률·빗나갈 확률에 씁니다)
   * cfg.oppStr  상대 팀 전력 (상대 키커 성공률)
   * cfg.myName / cfg.oppName  화면 표시용
   * cfg.onDone(win, log)  끝나면 부릅니다. win은 내가 이겼는지예요.
   *
   * 규칙은 실제 승부차기와 같아요 — 5키커를 번갈아 차고, 남은 키커로 뒤집을 수
   * 없으면 그 자리에서 끝내요(조기 종료). 5-5면 서든데스로 한 명씩 더 찹니다. */
  function shootout(box, cfg) {
    const shoot = cfg.shoot || 40;
    const oppStr = cfg.oppStr || 60;
    const myStr = cfg.myStr || 60;                 // 동료 키커 성공률
    const mates = Array.isArray(cfg.mates) ? cfg.mates.filter(Boolean) : [];
    let me = 0, opp = 0, turn = 0;        // turn: 0,1,2… 내 차례가 먼저
    const lines = [];

    box.innerHTML = "";
    const head = el("div", "pk-head",
      `⚽ 승부차기 — <b>${cfg.myName || "우리"}</b> vs ${cfg.oppName || "상대"}`);
    const score = el("div", "pk-score");
    const board = el("div", "pk-board");
    const hint = el("div", "pk-hint");
    const btns = el("div", "pk-btns");
    box.append(head, score, board, hint, btns);

    const draw = () => {
      score.innerHTML = `<b class="${me > opp ? "win" : ""}">${me}</b> : <b class="${opp > me ? "win" : ""}">${opp}</b>`;
      board.innerHTML = lines.map((l) => `<div class="pk-line ${l.ok ? "ok" : "no"}">${l.txt}</div>`).join("");
      board.scrollTop = board.scrollHeight;
    };

    /* 남은 키커로 못 뒤집으면 끝이에요. 5키커를 다 차게 하면
     * 이미 끝난 승부를 두 번 더 보게 됩니다 — 실제 승부차기도 여기서 멈춰요. */
    const decided = () => {
      const shot = Math.floor(turn / 2);                 // 내가 찬 수
      const oppShot = Math.floor((turn + 1) / 2);        // 상대가 찬 수
      if (shot < KICKS || oppShot < KICKS) {
        const myLeft = Math.max(0, KICKS - shot), oppLeft = Math.max(0, KICKS - oppShot);
        if (me > opp + oppLeft) return true;
        if (opp > me + myLeft) return true;
        return false;
      }
      return me !== opp;                                  // 5-5면 서든데스로 이어져요
    };

    const finish = () => {
      btns.innerHTML = "";
      hint.textContent = me > opp ? "🎉 승부차기 승리!" : "💧 승부차기 패배…";
      const go = el("button", "btn btn-primary", me > opp ? "다음 라운드로" : "결과 받아들이기");
      go.onclick = () => cfg.onDone(me > opp, lines);
      btns.appendChild(go);
    };

    // 상대 차례 — 판정 없이 확률만 굴려요
    const oppTurn = () => {
      const n = Math.floor((turn + 1) / 2) + 1;
      const ok = oppScores(oppStr);
      if (ok) opp += 1;
      lines.push({ ok: !ok, txt: `${ok ? "😖" : "🧤"} 상대 ${n}번 키커 — ${ok ? "골" : "막았다!"}` });
      turn += 1;
      draw();
      if (decided()) { finish(); return; }
      /* 자동 진행일 때는 타이머를 안 써요 — setTimeout(…, 0)이라도 이벤트 루프가
       * 돌아야 이어져서, 검사·시나리오 생성기의 동기 루프에서 그대로 멈춰요. */
      next(myTurn);
    };

    // 우리 차례 — 내 순번이면 방향을 고르고, 동료 차례면 확률만 굴려요
    const myTurn = () => {
      const n = Math.floor(turn / 2) + 1;
      const sudden = n > KICKS;
      // 정규 5명 중 내 순번(MY_KICK)만 내가 차요. 서든데스는 전부 나예요.
      if (!sudden && n !== MY_KICK) { mateTurn(n); return; }
      const lean = pick(SIDES);
      hint.innerHTML = `${sudden ? "🔥 서든데스 · " : `${n}번 키커 — `}<b>내 차례!</b> 키퍼가 <b>${lean.arrow} ${lean.label}</b>으로 몸을 틀었어요`;
      btns.innerHTML = "";

      const kick = (side) => {
        btns.innerHTML = "";
        let ok, why;
        if (side.key === lean.key) {
          ok = Math.random() < powerThrough(shoot);
          why = ok ? "읽혔지만 힘으로 뚫었다!!" : "읽혔다… 선방";
        } else {
          ok = Math.random() >= missWide(shoot);
          why = ok ? "반대쪽! 골!!" : "반대쪽인데 빗나갔어요…";
        }
        if (ok) me += 1;
        lines.push({ ok, txt: `${ok ? "⚽" : "❌"} ${sudden ? "서든데스 " : ""}${n}번 (나) ${side.arrow} — ${why}` });
        turn += 1;
        draw();
        if (decided()) { finish(); return; }
        next(oppTurn);
      };

      if (auto()) { kick(pick(SIDES)); return; }
      for (const s of SIDES) {
        const b = el("button", "btn pk-side", `${s.arrow} ${s.label}`);
        b.onclick = () => kick(s);
        btns.appendChild(b);
      }
    };

    // 동료 차례 — 판정 없이 확률만. 화면에는 이름과 결과만 나와요
    function mateTurn(n) {
      const who = mateName(mates, n - 1);
      const ok = oppScores(myStr);
      if (ok) me += 1;
      lines.push({ ok, txt: `${ok ? "⚽" : "❌"} ${n}번 ${who} — ${ok ? "골!" : "실축…"}` });
      turn += 1;
      draw();
      if (decided()) { finish(); return; }
      next(oppTurn);
    }

    draw();
    myTurn();
  }

  return { CUPS, nameOf, ROUNDS, KICKS, MY_KICK, shootout, powerThrough, missWide, oppScores, mateName };
})();
