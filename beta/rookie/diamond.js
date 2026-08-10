/* ⚾ 더 드래프트 — 경기장 화면 (야구 전용, 다른 게임과 공유하지 않아요)
 *
 * 스코어보드와 중계 피드 사이에 붙는 **야구장 뷰**예요. 외야 잔디·내야 흙·파울라인을
 * 그리고, 주자가 베이스에 서고, 타구가 실제로 날아가요. 더 윙어의 경기장과 같은 결이에요.
 *
 * ⚠️ 이 게임은 타석 단위로 이닝을 굴리지 않아요(경기 성적을 뭉쳐서 냅니다).
 * 그래서 주자를 지어내지 않고 **중계 피드가 말한 것만** 따라가요 — "안타!"가 뜨면
 * 주자가 1루에 서고 공이 외야로 날아가요. 화면의 말과 그림이 늘 일치해요.
 *
 * 모션: transform·opacity만 써요(레이아웃 속성 애니메이션 금지).
 * SVG 도형에는 CSS transform-box를 걸지 않아요 — 좌표계가 싸워서 도형이 날아간 적이 있어요.
 * prefers-reduced-motion이면 공이 순간이동하고 번쩍임을 끕니다.
 */
(function () {
  "use strict";

  // 그라운드 좌표 (viewBox 200×132). 홈은 아래, 2루는 위.
  const P = {
    home: [100, 116], b1: [139, 79], b2: [100, 42], b3: [61, 79],
    mound: [100, 79],
  };
  const BASES = ["b1", "b2", "b3"];
  // 타구가 날아갈 자리 — 사건마다 달라요
  const HIT = {
    homer: [100, 14], triple: [156, 34], double: [52, 36],
    single: [140, 52], infield: [118, 88], catcher: [100, 126], steal: [100, 42],
  };

  function html() {
    return `
      <div class="dia" id="dia">
        <svg class="dia-park" viewBox="0 0 200 132" aria-hidden="true">
          <!-- 외야 잔디 (파울선 안쪽) + 펜스 -->
          <path class="dia-grass" d="M100,116 L26,46 Q100,-2 174,46 Z" />
          <path class="dia-fence" d="M26,46 Q100,-2 174,46" />
          <!-- 내야 흙 -->
          <polygon class="dia-dirt" points="100,124 147,79 100,34 53,79" />
          <!-- 파울라인 (분필) -->
          <path class="dia-chalk" d="M100,116 L26,46 M100,116 L174,46" />
          <!-- 베이스패스 -->
          <path class="dia-path" d="M100,116 L139,79 L100,42 L61,79 Z" />
          <circle class="dia-mound" cx="100" cy="79" r="7" />
          <!-- 베이스 -->
          <polygon class="dia-base" data-b="b2" points="100,36 106,42 100,48 94,42" />
          <polygon class="dia-base" data-b="b3" points="61,73 67,79 61,85 55,79" />
          <polygon class="dia-base" data-b="b1" points="139,73 145,79 139,85 133,79" />
          <polygon class="dia-plate" points="100,122 105,117 105,112 95,112 95,117" />
          <!-- 주자 (켜질 때만 보여요) -->
          <text class="dia-run" data-r="b1" x="139" y="72">🏃</text>
          <text class="dia-run" data-r="b2" x="100" y="35">🏃</text>
          <text class="dia-run" data-r="b3" x="61" y="72">🏃</text>
          <!-- 타구 -->
          <text class="dia-ball" id="dia-ball" x="0" y="0">⚾</text>
        </svg>
        <div class="dia-bar">
          <span class="dia-inn" id="dia-inn">경기 준비</span>
          <span class="dia-outs" id="dia-outs"><b>아웃</b><i></i><i></i><i></i></span>
          <span class="dia-note" id="dia-note">중계를 기다리는 중…</span>
        </div>
      </div>`;
  }

  function make(root) {
    if (!root) return null;
    root.innerHTML = html();
    const box = root.querySelector(".dia");
    const ball = box.querySelector("#dia-ball");
    const on = { b1: false, b2: false, b3: false };
    let outs = 0;

    const paint = () => {
      for (const b of BASES) {
        const base = box.querySelector(`[data-b="${b}"]`);
        const run = box.querySelector(`[data-r="${b}"]`);
        if (base) base.classList.toggle("on", !!on[b]);
        if (run) run.classList.toggle("on", !!on[b]);
      }
      box.querySelectorAll(".dia-outs i").forEach((d, i) => d.classList.toggle("on", i < outs));
    };
    // 타구를 날려요 — transform만 움직여요(좌표 속성을 건드리면 애니메이션이 안 붙어요)
    const fly = (to) => {
      if (!ball || !to) return;
      ball.classList.add("on");
      ball.style.transform = `translate(${to[0]}px, ${to[1]}px)`;
    };
    const rest = () => {
      if (!ball) return;
      ball.classList.remove("on");
      ball.style.transform = `translate(${P.mound[0]}px, ${P.mound[1]}px)`;
    };
    const flash = (cls) => {
      box.classList.remove("dia-score", "dia-out");
      void box.offsetWidth;
      box.classList.add(cls);
    };
    const note = (t) => { const el = box.querySelector("#dia-note"); if (el) el.textContent = t || ""; };
    const setInn = (t) => { const el = box.querySelector("#dia-inn"); if (el && t) el.textContent = t; };

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
    const clearBases = () => { for (const b of BASES) on[b] = false; };

    const api = {
      el: box,
      half(label) { clearBases(); outs = 0; note(""); rest(); paint(); setInn(label); },
      inning(label) { setInn(label); },
      say(text) {
        if (!text) return;
        const t = String(text);
        // 경기가 끝나면 계기판도 끝나요 — 끝난 뒤에도 "9회초"로 남아 있으면 거짓말이에요
        if (/경기 종료|경기 끝|경기가 끝/.test(t)) {
          clearBases(); outs = 0; rest(); paint();
          box.classList.add("dia-done"); setInn("경기 종료"); note("");
          return;
        }
        const inn = t.match(/(\d+)\s*회\s*(초|말)/);
        if (inn) {
          const label = `${inn[1]}회${inn[2]}`;
          const cur = box.querySelector("#dia-inn");
          if (cur && cur.textContent !== label) api.half(label);
        }
        // 주자가 이미 쌓여 있다고 말하는 줄 — 말한 만큼 세워 둬요
        if (/만루/.test(t)) { on.b1 = on.b2 = on.b3 = true; note("만루"); paint(); return; }
        if (/주자가 쌓이|위기!/.test(t)) { on.b1 = on.b2 = true; note("주자 1·2루"); paint(); return; }

        let runs = 0;
        if (/홈런/.test(t)) {
          runs = advance(3, false) + 1; clearBases(); fly(HIT.homer); flash("dia-score"); note("홈런!");
        } else if (/3루타|삼루타/.test(t)) {
          runs = advance(3, false); on.b3 = true; fly(HIT.triple); note("3루타");
        } else if (/2루타|이루타/.test(t)) {
          runs = advance(2, true); fly(HIT.double); note("2루타");
        } else if (/안타|출루|밀어친|적시타/.test(t)) {
          runs = advance(1, true); fly(HIT.single); note("안타");
        } else if (/볼넷|사구|몸에 맞/.test(t)) {
          runs = advance(1, true); fly(HIT.catcher); note("볼넷");
        } else if (/병살/.test(t)) {
          outs = Math.min(3, outs + 2); fly(HIT.infield); flash("dia-out"); note("병살");
        } else if (/삼진/.test(t)) {
          outs = Math.min(3, outs + 1); fly(HIT.catcher); flash("dia-out"); note("삼진");
        } else if (/아웃|땅볼|뜬공|범타|플라이|잡아냈|물러납/.test(t)) {
          outs = Math.min(3, outs + 1); fly(HIT.infield); flash("dia-out"); note("아웃");
        } else if (/도루/.test(t)) {
          runs = advance(1, false); fly(HIT.steal); note("도루");
        } else {
          paint(); return;                       // 모르는 줄은 화면을 안 건드려요
        }
        if (runs > 0) flash("dia-score");
        if (outs >= 3) { clearBases(); outs = 0; note("이닝 종료"); }
        paint();
      },
      reset() { api.half(null); },
    };
    rest();
    paint();
    return api;
  }

  window.RookieDiamond = { make, html };
})();
