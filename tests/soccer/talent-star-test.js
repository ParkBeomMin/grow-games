/* ⭐ 재능 별 — 각성에 성공하면 별이 반드시 하나 느는가.
 *
 * 이 자리에서 세 번 방향을 바꿨다.
 *   ① 별만 그림 → "별이 4개에서 각성 성공했는데 그대로 4개야"
 *   ② 반칸(✩)으로 쪼갬 → "빈 별은 안 해도 되지 않을까"
 *   ③ 옆에 수치를 붙임 → "별 옆에 숫자는 뭐지??"
 *   ④ 지금 — "숫자는 빼줘 원래처럼 별만 나오게 해주고, 각성 성공했을 때
 *      별 개수가 정상적으로 증가만 하면 문제없어"
 *
 * 뿌리는 표시가 아니라 **장치**였다. 별 한 칸은 0.24인데 각성 상승이
 * rand(0.15, 0.3)이라 한 칸에 못 미치는 날이 흔했다. 눈금을 고쳐 그리는
 * 대신 눈금에 맞게 걸음을 맞춘다 — 각성 성공은 정확히 한 칸이다.
 *
 * 지키는 것:
 *   ① 별 그림에 숫자가 없다
 *   ② 각성 성공은 별을 정확히 하나 올린다 — 시작값이 어디든
 *   ③ 상한에서는 안 넘긴다 (5개에서 6개가 되지 않는다)
 *   ④ 변이 검증 — 상승폭을 옛 rand(0.15, 0.3)으로 되돌리면 ②가 무너진다
 *
 * 산식은 소스에서 정규식으로 뽑아 쓴다. 값을 여기 옮겨 적으면 소스를 바꿔도
 * 검사가 따라오지 않는다.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/soccer";
const SRC = fs.readFileSync(path.join(DIR, "game.js"), "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const grab = (re, what) => {
  const m = SRC.match(re);
  if (!m) { console.log(`❌ 소스에서 못 찾았어요: ${what}`); process.exit(1); }
  return m[0];
};

const parts = [
  grab(/const TALENT_MAX = [^;]+;/, "TALENT_MAX"),
  grab(/const talentStars = [^;]+;/, "talentStars"),
  grab(/const TALENT_STEP = [^;]+;/, "TALENT_STEP"),
  grab(/function talentStarStr\(t\) \{[\s\S]*?\n\}/, "talentStarStr"),
].join("\n");

const C = new Function(`
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  ${parts}
  return { TALENT_MAX, TALENT_STEP, talentStars, talentStarStr };`)();

console.log(`   재능 0.6 ~ ${C.TALENT_MAX} · 별 한 칸 ${C.TALENT_STEP.toFixed(3)}`);

// ---------- ① 별 그림에 숫자가 없다 ----------
const drawn = [0.8, 1.05, 1.2, 1.45, 1.8].map((t) => C.talentStarStr(t));
console.log(`   ${drawn.map((d, i) => `${[0.8, 1.05, 1.2, 1.45, 1.8][i]} → ${d}`).join(" · ")}`);
check(drawn.every((d) => !/\d/.test(d)), "별 그림에 숫자가 없다 — 별만 그려요");
check(drawn.every((d) => /^⭐+$/.test(d)), "별 말고 다른 글자도 없다 (빈 별·괄호·배수 표기)");

// ---------- ② 각성 성공은 별을 정확히 하나 올린다 ----------
/* 각성 상승폭을 소스에서 뽑아요. 여기에 0.24를 적어 두면 소스를 바꿔도
 * 검사가 통과해 버립니다 — 이 저장소에서 여러 번 났던 사고예요. */
const gainSrc = grab(/S\.talents\[key\] = Math\.min\(S\.talents\[key\] \+ [^,]+, TALENT_MAX\);/, "각성 상승폭");
const applyGain = new Function("t", "TALENT_MAX", "TALENT_STEP", "rand", `
  const S = { talents: { k: t } }, key = "k";
  ${gainSrc}
  return S.talents[key];`);
const rand = (a, b) => a + Math.random() * (b - a);

/* 시작값은 **실제로 나올 수 있는 범위**에서 골라요. 처음 받는 재능은
 * rand(0.8, 1.45)이고, 각성 실패로 깎여도 바닥(0.8) 아래로는 안 내려가요.
 * 두 값 다 소스에서 뽑습니다 — 여기 적어 두면 소스가 바뀌어도 안 잡혀요. */
const FLOOR = Number(grab(/Math\.max\(S\.talents\[key\] - [\d.]+, [\d.]+\)/, "재능 바닥")
  .match(/,\s*([\d.]+)\)$/)[1]);
console.log(`   재능 바닥 ${FLOOR} — 이 아래로는 안 내려가요`);

let same = 0, jumped = 0, ok = 0, tried = 0;
for (let i = 0; i < 4000; i++) {
  const t = FLOOR + Math.random() * (C.TALENT_MAX - FLOOR);
  const before = C.talentStars(t);
  if (before >= 5) continue;                    // 이미 꽉 찬 별은 ③에서 봐요
  tried++;
  const after = C.talentStars(applyGain(t, C.TALENT_MAX, C.TALENT_STEP, rand));
  if (after === before) same++;
  else if (after > before + 1) jumped++;
  else if (after === before + 1) ok++;
}
console.log(`   각성 성공 ${tried}번 — 별 +1 ${ok} · 그대로 ${same} · 두 칸 이상 ${jumped}`);
check(same === 0, `성공했는데 별이 그대로인 경우가 없다 (${same}번) — 제보가 바로 이거였어요`);
check(FLOOR > 0.6 + C.TALENT_STEP / 2,
  `재능 바닥(${FLOOR})이 첫 별 눈금 위에 있다 — 아래쪽 clamp에 한 칸이 먹히면 안 돼요`);
check(jumped === 0, `한 번에 두 칸 이상 뛰지 않는다 (${jumped}번)`);
check(ok === tried, `성공은 언제나 별 +1이다 (${ok}/${tried})`);

// ---------- ③ 상한에서는 안 넘긴다 ----------
const top = applyGain(C.TALENT_MAX - 0.01, C.TALENT_MAX, C.TALENT_STEP, rand);
check(top <= C.TALENT_MAX + 1e-9, `상한을 안 넘긴다 (${top.toFixed(3)} ≤ ${C.TALENT_MAX})`);
check(C.talentStars(top) === 5, `상한에서는 별이 다섯이다 (${C.talentStars(top)})`);

// ---------- ④ 변이 검증 ----------
/* 옛 산식으로 되돌리면 ②가 무너져야 해요. 안 무너지면 이 검사는 아무것도
 * 안 지키고 있는 겁니다. */
const oldGain = (t) => Math.min(t + rand(0.15, 0.3), C.TALENT_MAX);
let oldSame = 0, oldTried = 0;
for (let i = 0; i < 4000; i++) {
  const t = FLOOR + Math.random() * (C.TALENT_MAX - FLOOR);
  const before = C.talentStars(t);
  if (before >= 5) continue;
  oldTried++;
  if (C.talentStars(oldGain(t)) === before) oldSame++;
}
console.log(`   옛 산식 rand(0.15, 0.3)이면 — 성공했는데 별 그대로 ${oldSame}/${oldTried}회 (${Math.round(oldSame / oldTried * 100)}%)`);
check(oldSame > oldTried * 0.04,
  `옛 산식으로 되돌리면 '성공했는데 그대로'가 실제로 나온다 (${oldSame}번) — ②가 그걸 막고 있어요`);

// ---------- ⑤ 배선 ----------
check(/talentStarStr\(/.test(fs.readFileSync(path.join(DIR, "career.js"), "utf8")),
  "준비 화면이 이 함수로 별을 그린다");
check(!/tal-num/.test(SRC + fs.readFileSync(path.join(DIR, "style.css"), "utf8")),
  "숫자를 붙이던 자리(tal-num)가 소스와 스타일에서 사라졌다");

console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
