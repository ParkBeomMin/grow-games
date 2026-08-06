/* 🌍 나라 특색 — 리그를 고를 이유가 수상 값어치 하나로 수렴하지 않는지 본다.
 *
 * 배경: 리그 11개를 만들고 재 보니, 능력치 62~150 **어디에서도** 최적 리그가
 * 한국 3부 · 한국 2부 · 잉글랜드 2부 · 잉글랜드 1부 넷뿐이었다. 리그의 가치가
 * prestige 하나뿐이라 "어디서 상을 받아야 명예의 전당 점수가 큰가"로 수렴한 것이다.
 *
 * 수상 문턱(bar)으로는 못 잡는다 — 실측하니 bar를 0.07 올리는 것만으로 최적이
 * 통째로 하부 리그로 뒤집혔다. 문턱과 경쟁자 분포를 한 값이 같이 움직이기 때문이다.
 * 그래서 **다른 축**에 곱셈 하나씩을 걸었다. 이 검사가 지키는 건 그 축들이
 *   ① 실제로 값을 바꾸고  ② 서로 겹치지 않고  ③ 화면에 근거가 남는가
 * 셋이다.
 *
 * 배수는 소스에서 정규식으로 뽑아 그대로 실행한다. 값을 옮겨 적지 않는다.
 */
"use strict";
const fs = require("fs");
const BASE = "/workspace/grow-games/beta/soccer";
const GAME = fs.readFileSync(`${BASE}/game.js`, "utf8");
const CAREER = fs.readFileSync(`${BASE}/career.js`, "utf8");
const grab = (src, re) => { const m = src.match(re); return m ? m[0] : null; };

const parts = {
  leagues: grab(GAME, /const LEAGUES = \[[\s\S]*?\n\];/),
  trait: grab(GAME, /const COUNTRY_TRAIT = \{[\s\S]*?\n\};/),
  traitOf: grab(GAME, /function traitOf\(st\) \{[\s\S]*?\n\}/),
  traitMul: grab(GAME, /const traitMul = \(st, key\) => \{[\s\S]*?\n\};/),
  focusMul: grab(GAME, /function traitFocusMul\(st, statKey\) \{[\s\S]*?\n\}/),
  gain: grab(CAREER, /const natMul = traitMul\(S, "train"\)[^;]+;/),
  heal: grab(CAREER, /const heal = Math\.round\([^;]+;/),
  pay: grab(CAREER, /pay = Math\.round\(pay \* traitMul\(S, "money"\)\);/),
  risk: grab(CAREER, /const riskText = \(lg\) => \{[\s\S]*?\n  \};/),
};
const missing = Object.entries(parts).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log(`❌ 소스에서 못 찾았어요: ${missing.join(", ")}`); process.exit(1); }

const env = (body) => new Function("st", "statKey", `
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  ${parts.leagues}
  function leagueOf(s) { const id = (s && s.league) || 1; return LEAGUES.find((l) => l.id === id) || LEAGUES[0]; }
  ${parts.trait}
  ${parts.traitOf}
  ${parts.traitMul}
  ${parts.focusMul}
  ${body}`);

const trainMul = env(`return traitMul(st, "train") * traitFocusMul(st, statKey);`);
const restMul = env(`return traitMul(st, "rest");`);
const moneyMul = env(`return traitMul(st, "money");`);
const tagOf = env(`return traitOf(st).tag || "";`);
const LEAGUES = new Function(`${parts.leagues} return LEAGUES;`)();
const TRAIT = new Function(`${parts.trait} return COUNTRY_TRAIT;`)();
const byCountry = (c) => LEAGUES.find((l) => l.country === c);

let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) bad++; };

// ── ① 나라마다 특색이 하나씩 있고, 서로 다른 축이다
const countries = [...new Set(LEAGUES.map((l) => l.country))];
check(countries.every((c) => TRAIT[c]), `나라 ${countries.length}곳 전부에 특색이 있다 (${countries.join(" · ")})`);
/* 🇧🇷·🇮🇹는 둘 다 focus 축이지만 **가르치는 능력치가 다르다** — 그래서 축 이름에
 * 대상 능력치까지 넣어 비교한다. 안 그러면 둘이 겹친 것으로 잘못 잡힌다. */
const axes = countries.map((c) => {
  const t = TRAIT[c];
  return Object.keys(t).filter((k) => k !== "desc" && k !== "tag" && k !== "focus")
    .concat(t.focus ? [`focus:${t.focus}`] : []).sort().join("+");
});
check(new Set(axes).size === axes.length,
  `나라마다 축이 겹치지 않는다 (${countries.map((c, i) => `${c}:${axes[i]}`).join(" · ")})`);
check(countries.every((c) => TRAIT[c].tag && TRAIT[c].desc), "나라마다 화면에 쓸 tag·desc가 있다");

// ── ② 축마다 실제로 값이 달라진다
const KR = { league: byCountry("kr").id }, JP = { league: byCountry("jp").id };
const BR = { league: byCountry("br").id }, IT = { league: byCountry("it").id };
const EN = { league: byCountry("en").id };

console.log(`   훈련 배수 — 🇰🇷 ${trainMul(KR, "pass").toFixed(2)} · 🇯🇵 ${trainMul(JP, "pass").toFixed(2)}`
  + ` · 🇧🇷 드리블 ${trainMul(BR, "dribble").toFixed(2)} · 🇮🇹 수비 ${trainMul(IT, "defense").toFixed(2)}`);
check(trainMul(JP, "pass") > 1.05, `🇯🇵는 어느 능력치든 훈련이 잘 된다 (${trainMul(JP, "pass").toFixed(2)}배)`);
check(trainMul(BR, "dribble") > 1.2 && Math.abs(trainMul(BR, "pass") - 1) < 1e-9,
  `🇧🇷는 드리블만 빨리 는다 (드리블 ${trainMul(BR, "dribble").toFixed(2)}배 · 패스 ${trainMul(BR, "pass").toFixed(2)}배)`);
check(trainMul(IT, "defense") > 1.2 && Math.abs(trainMul(IT, "dribble") - 1) < 1e-9,
  `🇮🇹는 수비만 빨리 는다 (수비 ${trainMul(IT, "defense").toFixed(2)}배 · 드리블 ${trainMul(IT, "dribble").toFixed(2)}배)`);
check(restMul(KR) > 1.1 && Math.abs(restMul(EN) - 1) < 1e-9,
  `🇰🇷만 회복이 빠르다 (🇰🇷 ${restMul(KR).toFixed(2)}배 · 🏴 ${restMul(EN).toFixed(2)}배)`);
check(moneyMul(EN) > 1.2 && Math.abs(moneyMul(KR) - 1) < 1e-9,
  `🏴만 수입이 크다 (🏴 ${moneyMul(EN).toFixed(2)}배 · 🇰🇷 ${moneyMul(KR).toFixed(2)}배)`);

/* ③ 같은 나라의 1부·2부는 특색이 같다 — 특색은 리그가 아니라 나라의 것이다.
 * 이게 깨지면 "이탈리아 2부에서 수비를 올리고 1부로" 같은 계획이 성립하지 않는다. */
for (const c of countries) {
  const inC = LEAGUES.filter((l) => l.country === c);
  const tags = inC.map((l) => tagOf({ league: l.id }));
  check(new Set(tags).size === 1, `${c}의 리그 ${inC.length}개가 같은 특색이다 (${tags.join(" · ")})`);
}

// ── ④ 배수가 실제 계산에 물려 있다 (배선이 끊기면 위 검사는 전부 헛돈다)
check(/traitMul\(S, "train"\)/.test(parts.gain) && /traitFocusMul\(S, def\.key\)/.test(parts.gain),
  "훈련 계산이 나라 배수를 곱한다");
check(/traitMul\(S, "rest"\)/.test(parts.heal), "휴식 회복이 나라 배수를 곱한다");
check(/traitMul\(S, "money"\)/.test(parts.pay), "경기 수당이 나라 배수를 곱한다");
/* 계약금에는 일부러 안 건다. 낙폭·재이적·감가 세 브레이크가 걸린 자리라
 * 곱셈을 하나 더 얹으면 fee-test의 "리그격을 2제곱으로 싣는가" 측정이
 * 2.34제곱으로 읽혀 폭주 가드가 흐려진다. 그게 유지되는지도 여기서 지킨다. */
const feeBase = grab(CAREER, /const base = club\.str \* club\.str \* FEE_BASE[^;]+;/);
check(!!feeBase && !/COUNTRY_TRAIT|natFee/.test(feeBase),
  `계약금에는 나라 배수를 안 건다 — 폭주 가드를 흐리지 않으려고 (${feeBase ? "확인" : "식을 못 찾음"})`);

// ── ⑤ 화면에 근거가 남는다 — 안 보이면 결국 수상 값어치만 보고 고르게 된다
check(/COUNTRY_TRAIT\[lg\.country\]/.test(parts.risk) && /t\.tag/.test(parts.risk),
  "이적 카드에 나라 특색이 적힌다");
check(/traitOf\(S\)\.tag/.test(CAREER), "준비 화면 소속 줄에도 나라 특색이 뜬다");

/* ── 변이 검증 — 특색을 전부 비우면 ②가 무너져야 한다.
 * 안 잡히면 위의 초록불은 아무것도 안 지키고 있는 것이다. */
const brokenTrait = parts.trait.replace(/\{[\s\S]*\}/, "{}");
if (brokenTrait === parts.trait) { console.log("❌ 변이 치환이 안 됐어요"); process.exit(1); }
const brokenTrain = new Function("st", "statKey", `
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  ${parts.leagues}
  function leagueOf(s) { const id = (s && s.league) || 1; return LEAGUES.find((l) => l.id === id) || LEAGUES[0]; }
  ${brokenTrait}
  ${parts.traitOf}
  ${parts.traitMul}
  ${parts.focusMul}
  return traitMul(st, "train") * traitFocusMul(st, statKey);`);
check(Math.abs(brokenTrain(BR, "dribble") - 1) < 1e-9,
  `변이 검증 — 특색을 비우면 🇧🇷 드리블 배수가 ${brokenTrain(BR, "dribble").toFixed(2)}로 떨어진다`);

console.log(bad ? `\n❌ ${bad}개 실패` : "\n✅ 통과");
process.exit(bad ? 1 : 0);
