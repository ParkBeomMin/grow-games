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
          <!-- 외야 잔디 (파울선 안쪽) + 깎은 줄무늬 + 펜스 -->
          <defs>
            <clipPath id="dia-fair"><path d="M100,116 L26,46 Q100,-2 174,46 Z" /></clipPath>
          </defs>
          <path class="dia-grass" d="M100,116 L26,46 Q100,-2 174,46 Z" />
          <g clip-path="url(#dia-fair)">
            <polygon class="dia-mow" points="100,116 50.7,32.6 75.3,24.6" />
            <polygon class="dia-mow" points="100,116 100,22 124.6,24.6" />
            <polygon class="dia-mow" points="100,116 149.3,32.6 174,46" />
          </g>
          <path class="dia-fence" d="M26,46 Q100,-2 174,46" />
          <!-- 파울폴 -->
          <path class="dia-pole" d="M26,46 L26,34 M174,46 L174,34" />
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
    /* 공은 **투수가 던지고 → 타자가 치면 날아가요.** 두 걸음으로 움직여요:
     *   ① 마운드 → 홈플레이트 (투구, 빠르게)   ② 홈 → 타구 지점 (치면)
     * transform만 움직여요(좌표 속성을 건드리면 전환이 안 붙어요). 타이머는 늘 정리해요. */
    let seq = null;
    const slow = () => !(typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const put = (pt, ms) => {
      if (!ball) return;
      ball.style.transition = ms && slow() ? `transform ${ms}ms cubic-bezier(.2,.85,.3,1), opacity .2s ease` : "none";
      ball.style.transform = `translate(${pt[0]}px, ${pt[1]}px)`;
    };
    // 투구부터 시작해서, 맞으면 그 자리로 날려요. to가 없으면 홈(포수)에서 멈춰요.
    const pitch = (to, farMs) => {
      if (!ball) return;
      clearTimeout(seq);
      ball.classList.add("on");
      if (!slow()) { put(to || P.home, 0); return; }     // 모션을 줄인 설정이면 바로 그 자리
      put(P.mound, 0);
      void ball.offsetWidth;                              // 리플로우 — 전환이 붙게
      seq = setTimeout(() => {
        put(P.home, 330);                                 // ⚾ 투구 (던지는 게 보이게 천천히)
        if (!to || (to[0] === P.home[0] && to[1] === P.home[1])) return;
        seq = setTimeout(() => put(to, farMs || 900), 360);  // 🏏 타구 — 맞고 나서 뻗어요
      }, 16);
    };
    const rest = () => {
      if (!ball) return;
      clearTimeout(seq);
      ball.classList.remove("on");
      put(P.mound, 0);
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
      /* 🧾 엔진이 준 타석 기록을 그대로 반영해요 — 글을 파싱하지 않아요(가장 정확한 길).
       * pa = { who, kind, outs, scored[], bases[3] } — sim.js의 playInning이 만든 것. */
      state(pa) {
        if (!pa) return;
        for (let i = 0; i < BASES.length; i++) on[BASES[i]] = !!(pa.bases && pa.bases[i]);
        outs = Math.min(3, pa.outs || 0);
        const K = { homer: "홈런!", triple: "3루타", double: "2루타", single: "안타", walk: "볼넷", out: "아웃" };
        const dest = { homer: HIT.homer, triple: HIT.triple, double: HIT.double, single: HIT.single, out: HIT.infield }[pa.kind];
        const ms = { homer: 1300, triple: 1050, double: 1000, single: 880, out: 620 }[pa.kind];
        pitch(dest || null, ms);
        if (pa.scored && pa.scored.length) { flash("dia-score"); note(`${pa.scored.join("·")} 홈인!`); }
        else { if (pa.kind === "out") flash("dia-out"); note(K[pa.kind] || ""); }
        if (outs >= 3) { clearBases(); note("이닝 종료"); }   // 3아웃이면 주자도 물러나요
        paint();
      },
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

        /* 이닝 요약 줄 — "상대가 2점을 냈어요" 처럼 **한 이닝을 통째로** 말하는 줄이에요.
         * 타석 하나가 아니라서 주자를 세울 수 없지만, 점수가 났다는 건 보여줘야 해요.
         * 주자들이 홈을 밟고 이닝이 닫히는 걸로 그려요. */
        const sum = t.match(/(\d+)\s*(?:점을|실점)/);
        if (sum && /(냈|뽑아|내줬|실점)/.test(t)) {
          const n = sum[1];
          const mine = /우리 타선|뽑아/.test(t);
          clearBases(); outs = 0;
          pitch(HIT.single, 1000); flash("dia-score");
          note(`${mine ? "우리" : "상대"} ${n}점`);
          paint();
          return;
        }
        if (/무실점/.test(t)) { clearBases(); outs = 0; pitch(HIT.catcher); note("무실점"); paint(); return; }

        let runs = 0;
        if (/홈런/.test(t)) {
          runs = advance(3, false) + 1; clearBases(); pitch(HIT.homer, 1300); flash("dia-score"); note("홈런!");
        } else if (/3루타|삼루타/.test(t)) {
          runs = advance(3, false); on.b3 = true; pitch(HIT.triple, 1050); note("3루타");
        } else if (/2루타|이루타/.test(t)) {
          runs = advance(2, true); pitch(HIT.double, 1000); note("2루타");
        } else if (/안타|출루|밀어친|적시타/.test(t)) {
          runs = advance(1, true); pitch(HIT.single, 880); note("안타");
        } else if (/볼넷|사구|몸에 맞/.test(t)) {
          runs = advance(1, true); pitch(null); note("볼넷");
        } else if (/병살/.test(t)) {
          outs = Math.min(3, outs + 2); pitch(HIT.infield, 620); flash("dia-out"); note("병살");
        } else if (/삼진/.test(t)) {
          outs = Math.min(3, outs + 1); pitch(null); flash("dia-out"); note("삼진");
        } else if (/아웃|땅볼|뜬공|범타|플라이|잡아냈|물러납/.test(t)) {
          outs = Math.min(3, outs + 1); pitch(HIT.infield, 620); flash("dia-out"); note("아웃");
        } else if (/도루/.test(t)) {
          runs = advance(1, false); note("도루");
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
