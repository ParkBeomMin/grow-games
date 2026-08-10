/* ⚾ 더 드래프트 — 다이아몬드 계기판 (야구 전용, 다른 게임과 공유하지 않아요)
 *
 * 스코어보드와 중계 피드 사이에 붙어요. 주자·아웃카운트를 **한눈에** 보여주는 게 목적이에요 —
 * "만루 2아웃"을 글로 읽는 것과 베이스 세 개가 켜진 걸 보는 건 체감이 달라요.
 *
 * ⚠️ 이 게임은 타석 단위로 이닝을 굴리지 않아요(경기 성적을 뭉쳐서 냅니다).
 * 그래서 주자 상태를 지어내지 않고 **중계 피드가 말한 것만** 따라가요 —
 * "안타!"가 뜨면 주자가 나가고, "삼진"이면 아웃이 올라가요. 화면에 보이는 말과
 * 그림이 늘 일치해요. 피드가 없는 자리에서는 그냥 비어 있어요.
 *
 * 모션: transform·opacity만 써요(레이아웃 속성 애니메이션 금지). 140~220ms.
 * prefers-reduced-motion이면 전환을 끕니다.
 */
(function () {
  "use strict";

  const BASES = ["b1", "b2", "b3"];   // 1루·2루·3루

  /* 내야를 인라인 SVG로 그려요 — 베이스는 실제로 마름모, 홈플레이트는 오각형이라
   * 도형이 정답이에요(아이콘보다 테마·크기 대응이 좋아요). 색은 CSS가 정해요(fill=currentColor 등). */
  function html() {
    return `
      <div class="dia" id="dia">
        <svg class="dia-field" viewBox="0 0 100 100" aria-hidden="true">
          <polygon class="dia-dirt" points="50,82 82,50 50,18 18,50" />
          <path class="dia-chalk" d="M50 82 L82 50 M50 82 L18 50" />
          <polygon class="dia-base" data-b="b2" points="50,11 57,18 50,25 43,18" />
          <polygon class="dia-base" data-b="b3" points="18,43 25,50 18,57 11,50" />
          <polygon class="dia-base" data-b="b1" points="82,43 89,50 82,57 75,50" />
          <polygon class="dia-home" points="50,92 55,87 55,81 45,81 45,87" />
        </svg>
        <div class="dia-info">
          <div class="dia-inn" id="dia-inn">경기 준비</div>
          <div class="dia-outs" id="dia-outs"><b>아웃</b><i></i><i></i><i></i></div>
          <div class="dia-note" id="dia-note">중계를 기다리는 중…</div>
        </div>
      </div>`;
  }

  function make(root) {
    if (!root) return null;
    root.innerHTML = html();
    const box = root.querySelector(".dia");
    const on = { b1: false, b2: false, b3: false };
    let outs = 0;

    const paint = () => {
      for (const b of BASES) {
        const el = box.querySelector(`[data-b="${b}"]`);
        if (el) el.classList.toggle("on", !!on[b]);
      }
      const dots = box.querySelectorAll(".dia-outs i");
      dots.forEach((d, i) => d.classList.toggle("on", i < outs));
    };
    // 득점·홈런처럼 큰 순간에 한 번 번쩍 (끝없이 도는 연출은 두지 않아요)
    const flash = (cls) => {
      box.classList.remove("dia-score", "dia-out");
      void box.offsetWidth;                       // 리플로우로 애니메이션 재시작
      box.classList.add(cls);
    };
    const note = (txt) => {
      const el = box.querySelector("#dia-note");
      if (el) el.textContent = txt || "";
    };

    /* 주자를 n루만큼 밀어요. 넘어간 주자는 득점이에요. batter=true면 타자도 올라타요. */
    function advance(n, batter) {
      let runs = 0;
      for (let i = BASES.length - 1; i >= 0; i--) {
        if (!on[BASES[i]]) continue;
        on[BASES[i]] = false;
        const to = i + n;
        if (to >= BASES.length) runs++; else on[BASES[to]] = true;
      }
      if (batter) { if (n - 1 >= BASES.length) runs++; else on[BASES[n - 1]] = true; }
      return runs;
    }
    function clearBases() { for (const b of BASES) on[b] = false; }

    const api = {
      el: box,
      /* 반이닝이 바뀌면 주자·아웃을 비워요. */
      half(label) {
        clearBases(); outs = 0; note(""); paint();
        const el = box.querySelector("#dia-inn");
        if (el && label) el.textContent = label;
      },
      inning(label) {
        const el = box.querySelector("#dia-inn");
        if (el && label) el.textContent = label;
      },
      /* 중계 한 줄을 읽고 그대로 반영해요 — 없는 상태를 지어내지 않아요. */
      say(text) {
        if (!text) return;
        const t = String(text);
        const inn = t.match(/(\d+)\s*회\s*(초|말)/);
        if (inn) {
          const label = `${inn[1]}회${inn[2]}`;
          const cur = box.querySelector("#dia-inn");
          if (cur && cur.textContent !== label) api.half(label);
        }
        // 경기가 끝나면 계기판도 끝나요 — 끝난 뒤에도 "9회초"로 남아 있으면 거짓말이에요
        if (/경기 종료|경기 끝|경기가 끝/.test(t)) {
          clearBases(); outs = 0; paint();
          box.classList.add("dia-done");
          const el = box.querySelector("#dia-inn");
          if (el) el.textContent = "경기 종료";
          note("");
          return;
        }
        let runs = 0;
        // 위기 등판처럼 "주자가 이미 쌓여 있다"고 말하는 줄 — 말한 만큼 세워 둬요
        if (/만루/.test(t)) { on.b1 = on.b2 = on.b3 = true; note("만루"); paint(); return; }
        if (/주자가 쌓이|주자 만루|위기!/.test(t)) { on.b1 = true; on.b2 = true; note("주자 1·2루"); paint(); return; }
        if (/홈런/.test(t)) {                       // 홈런 — 주자 전원 + 타자 득점
          runs = advance(3, false) + 1; clearBases(); flash("dia-score"); note("홈런!");
        } else if (/3루타|삼루타/.test(t)) {
          runs = advance(3, false); on.b3 = true; note("3루타");
        } else if (/2루타|이루타/.test(t)) {
          runs = advance(2, true); note("2루타");
        } else if (/안타|출루|밀어친|적시타/.test(t)) {
          runs = advance(1, true); note("안타");
        } else if (/볼넷|사구|몸에 맞/.test(t)) {
          runs = advance(1, true); note("볼넷");
        } else if (/병살/.test(t)) {
          outs = Math.min(3, outs + 2); flash("dia-out"); note("병살");
        } else if (/삼진|아웃|땅볼|뜬공|범타|플라이|잡아냈|막았/.test(t)) {
          outs = Math.min(3, outs + 1); flash("dia-out"); note("아웃");
        } else if (/도루/.test(t)) {
          runs = advance(1, false); note("도루");
        }
        if (runs > 0) flash("dia-score");
        if (outs >= 3) { clearBases(); outs = 0; note("이닝 종료"); }
        paint();
      },
      reset() { api.half(null); },
    };
    paint();
    return api;
  }

  window.RookieDiamond = { make, html };
})();
