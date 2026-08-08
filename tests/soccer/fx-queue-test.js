/* 🎬 연출이 겹치지 않고 줄을 서는가.
 *
 * 제보: "이적했을 때 이펙트가 몇 개가 겹쳐 보였어. 스탯 오른 거랑 겹친 건가"
 * 맞았다. 이적 한 번에 두 연출이 **같은 순간에** 터졌다 —
 *   💼 이적 축하(acceptOffer)와 🎒 적응으로 배운 능력치(moveToClub).
 * 게다가 결산 직후에 이적하면 아직 도는 중인 🏆우승·🎖️수상 줄과도 부딪혔다.
 * (결산 안쪽은 이미 줄을 서 있었는데, 이적이 그 줄 **밖에서** 터진 게 원인이다.)
 *
 * 지키는 것:
 *   ① 연출을 부르는 자리가 전부 한 통로(queueFx)를 지난다 — 직접 Fx를 안 부른다
 *   ② 한 번에 여럿을 넣으면 시간차를 두고 하나씩 나온다
 *   ③ 앞선 줄이 아직 도는 중이면 그 뒤에 이어 붙는다 (이적이 수상과 안 겹친다)
 *   ④ Fx가 없는 환경(로드 실패)에서도 안 던진다
 *   ⑤ 변이 검증 — 큐를 없애고 즉시 부르면 ②③이 무너진다
 *
 * 산식은 소스에서 정규식으로 뽑아 그대로 굴린다. 직접 eval은 안 쓴다.
 */
"use strict";
const fs = require("fs");
const SRC = fs.readFileSync("/workspace/grow-games/beta/soccer/career.js", "utf8");
const grab = (re) => { const m = SRC.match(re); return m ? m[0] : null; };

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const guard = (label, fn) => { try { fn(); } catch (e) { check(false, `${label} — ${e.message}`); } };

const parts = {
  gap: grab(/const FX_GAP = [^;]+;/),
  queue: grab(/let fxFreeAt = 0;\n {2}function queueFx\(list\) \{[\s\S]*?\n {2}\}/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }
const GAP = new Function(`${parts.gap} return FX_GAP;`)();

/* 가짜 시계와 가짜 Fx로 큐를 굴린다. setTimeout을 직접 잡아 예약 시각을 기록한다. */
function makeRunner(src) {
  const fired = [];
  let now = 1000000;
  const timers = [];
  const fake = {
    setTimeout: (fn, ms) => { timers.push({ at: now + ms, fn }); return timers.length; },
    Date: { now: () => now },
    Fx: {
      celebrate: (kind, text) => fired.push({ at: now, kind, text }),
      flash: (text) => fired.push({ at: now, kind: "flash", text }),
    },
  };
  const q = new Function("window", "setTimeout", "Date", "Fx", `${parts.gap}\n${src} return queueFx;`)(
    { Fx: fake.Fx }, fake.setTimeout, fake.Date, fake.Fx);
  return {
    fired,
    queue: (list) => q(list),
    advance: (ms) => {
      now += ms;
      for (const t of timers.slice().sort((a, b) => a.at - b.at)) {
        if (!t.done && t.at <= now) { t.done = true; const save = now; now = t.at; t.fn(); now = save; }
      }
    },
    at: () => now,
  };
}

// ---------- ① 직접 호출이 남아 있지 않다 ----------
guard("① 한 통로", () => {
  /* queueFx 안쪽(정의부)에서만 Fx를 직접 불러야 해요. 그 밖에 남아 있으면
   * 그 자리는 줄을 안 서고 즉시 터집니다 — 이번 제보가 정확히 그거였어요. */
  const outside = SRC.replace(parts.queue, "");
  const direct = [...outside.matchAll(/Fx\.(celebrate|flash|burst|confetti)\(/g)].map((m) => m[0]);
  check(direct.length === 0,
    `career.js에서 Fx를 직접 부르는 자리가 없다 (남은 것: ${direct.join(", ") || "없음"})`);
  const calls = (SRC.match(/queueFx\(/g) || []).length - 1;   // 정의부 제외
  check(calls >= 5, `연출 자리들이 큐를 지난다 (${calls}곳)`);
});

// ---------- ②③ 줄 세우기 ----------
guard("②③ 줄 세우기", () => {
  const R = makeRunner(parts.queue);
  R.queue([["champion", "🏆 우승!"], ["award", "🎖️ MVP!"], ["award", "🎖️ 베스트11!"]]);
  R.advance(GAP * 4);
  console.log(`   한 번에 3개 — 나온 시각 ${R.fired.map((f) => f.at - 1000000).join("ms · ")}ms`);
  check(R.fired.length === 3, `셋 다 나온다 (${R.fired.length}개)`);
  const gaps = R.fired.slice(1).map((f, i) => f.at - R.fired[i].at);
  check(gaps.every((g) => g >= GAP), `사이가 ${GAP}ms 이상 벌어진다 (${gaps.join("·")}ms)`);

  // 앞선 줄이 도는 중에 이적 연출을 넣으면 그 뒤로 붙어야 해요
  const R2 = makeRunner(parts.queue);
  R2.queue([["champion", "🏆 우승!"], ["award", "🎖️ MVP!"]]);
  R2.advance(200);                                   // 결산 직후, 아직 도는 중
  R2.queue([["award", "💼 이적!"], ["flash", "🎒 적응 +3"]]);
  R2.advance(GAP * 6);
  const texts = R2.fired.map((f) => f.text);
  console.log(`   결산 직후 이적 — ${R2.fired.map((f) => `${f.text}(${f.at - 1000000}ms)`).join(" · ")}`);
  check(R2.fired.length === 4, `넷 다 나온다 (${R2.fired.length}개)`);
  const g2 = R2.fired.slice(1).map((f, i) => f.at - R2.fired[i].at);
  check(g2.every((g) => g >= GAP),
    `이적 연출이 수상 연출 뒤로 붙는다 (사이 ${g2.join("·")}ms)`);
  check(texts.indexOf("💼 이적!") > texts.indexOf("🎖️ MVP!"),
    "먼저 예약된 수상이 이적보다 앞에 나온다");
});

// ---------- ④ Fx가 없어도 안 던진다 ----------
guard("④ Fx 없음", () => {
  const q = new Function("window", "setTimeout", "Date", `${parts.gap}\n${parts.queue} return queueFx;`)(
    {}, () => 0, { now: () => 0 });
  let threw = false;
  try { q([["award", "🎖️"]]); q(null); q([]); } catch { threw = true; }
  check(!threw, "Fx가 로드 안 된 환경에서도 안 던진다");
});

// ---------- ⑤ 변이 검증 ----------
guard("⑤ 변이 검증", () => {
  // 큐를 없애고 그 자리에서 바로 부르는 옛 방식
  const naive = `let fxFreeAt = 0;
  function queueFx(list) {
    if (!window.Fx || !list || !list.length) return;
    for (const [kind, text] of list) {
      if (kind === "flash") Fx.flash(text); else Fx.celebrate(kind, text);
    }
  }`;
  const R = makeRunner(naive);
  R.queue([["champion", "🏆"], ["award", "🎖️"]]);
  R.advance(200);
  R.queue([["award", "💼"], ["flash", "🎒"]]);
  R.advance(GAP * 4);
  const same = R.fired.filter((f, i) => i > 0 && f.at === R.fired[i - 1].at).length;
  console.log(`   즉시 호출이면 같은 순간에 겹친 연출 ${same}개`);
  check(same >= 2,
    `큐가 없으면 연출이 같은 순간에 겹친다 (${same}개) — 제보의 그 화면이에요`);
});

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
