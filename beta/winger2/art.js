/* 🖼️ ⚽ 더 윙어 II — 그림 배선 (director · 25번 계약 5)
 *
 *   Art.src(who, mood)        → "art/{who}-{mood}.webp" · 없으면 그 인물의 base · 그것도 없으면 null
 *   Art.chibi(who, pose)      → "art/{who}-chibi-{pose}.webp" · 없으면 chibi-base · 없으면 null
 *   Art.bg(id)                → "art/{id}.webp"(bg-* · end-*) · 없으면 null
 *   Art.alt(who, mood, name)  → "{이름} — {표정}" (♿ 대체 문구 — 12번 §9-6)
 *   Art.name(who)             → 기본 이름(주인공은 플레이어가 바꾼 이름을 부르는 쪽이 넘깁니다)
 *
 * 🔒 **파일 이름이 곧 계약 키입니다**(12번 §9-6 · 13번 §6-5 · 38번 계약 16). 아래 표는 `art/`의 120장과
 *    한 글자도 달라선 안 됩니다 — 표에 없는 키는 파일이 있어도 안 부르고(null), 표에 있는데
 *    파일이 없으면 깨진 그림이 됩니다. 그래서 `<img>`를 그리는 쪽은 **`error`에서 이름 글자로
 *    물러섭니다**(scenes.js `face` · match-scene.js 치비 말) — 깨진 그림 금지.
 * 🔒 null은 「그림이 없다」는 뜻이지 오류가 아닙니다 — 표에 없는 표정은 그 인물의 base로, base도 없으면
 *    화면이 이름 글자로 그립니다(둘째 묶음에서 주인공 여섯 · 엄마 · 할머니가 다 들어와 지금은 그런 자리가 없어요).
 * 🔴 성별로 기본값을 두지 않습니다 — 주인공 키는 언제나 `{preset}-{m|f}`(13번 §6-5).
 *    「꼬리표 없는 키 = 남자」가 되면 카드 여섯으로 없앤 기본값이 코드에서 되살아나요. */
"use strict";

window.Art = (() => {
  const DIR = "art/";
  const EXT = ".webp";
  const HERO = "base smile fire tired down surprise moved chibi-base chibi-score chibi-block chibi-down";
  /* 120장 = 첫 묶음 66(지호 남·여 22 · 공통 조연 10 · 두 세계 조연 22 · 배경 12)
   *        + 둘째 묶음 54(도윤 · 하람 남·여 44 · 엄마 · 할머니 6 · 배경 2 · 엔딩 2 — 38번 §3) */
  const MOODS = {
    "jiho-m": HERO, "jiho-f": HERO, "doyun-m": HERO, "doyun-f": HERO, "haram-m": HERO, "haram-f": HERO,
    coach: "base smile stern worry", scout: "base interest smile", dad: "base smile worry",
    mom: "base smile worry", grandma: "base smile worry",
    minjae: "base smirk shock grin", minseo: "base smirk shock grin",
    taeo: "base grin fire tears", seoa: "base grin fire tears",
    seheon: "base frown respect", gaeun: "base frown respect",
  };
  const BGS = "bg-field bg-locker bg-cup bg-test bg-dawn bg-home-jiho bg-home-doyun bg-home-haram bg-gate "
    + "end-pro1 end-pro2 end-trainee end-semi end-leave end-univ end-abroad";
  const HAVE = new Set(BGS.split(" "));
  Object.keys(MOODS).forEach((who) => MOODS[who].split(" ").forEach((m) => HAVE.add(`${who}-${m}`)));

  const NAME = {
    "jiho-m": "지호", "jiho-f": "지호", "doyun-m": "도윤", "doyun-f": "도연", "haram-m": "하람", "haram-f": "하람",
    coach: "강 감독", scout: "문 스카우트", dad: "아버지", mom: "엄마", grandma: "할머니",
    minjae: "차민재", minseo: "차민서", taeo: "김태오", seoa: "김서아", seheon: "류세헌", gaeun: "류가은",
  };
  const MOOD = {
    base: "평온", smile: "웃음", fire: "결의", tired: "지침", down: "아쉬움", surprise: "놀람", moved: "벅참",
    stern: "엄한 얼굴", worry: "걱정", smirk: "도발하는 미소", shock: "당황", grin: "활짝 웃음",
    tears: "눈물", frown: "찌푸림", respect: "인정하는 미소", interest: "관심",
    "chibi-base": "준비 자세", "chibi-score": "환호", "chibi-block": "몸을 던져 막기", "chibi-down": "낙담",
  };

  const path = (k) => (HAVE.has(k) ? DIR + k + EXT : null);
  const ok = (w) => typeof w === "string" && w !== "";

  function src(who, mood) {
    if (!ok(who)) return null;
    return path(`${who}-${mood || "base"}`) || path(`${who}-base`);
  }
  function chibi(who, pose) {
    if (!ok(who)) return null;
    return path(`${who}-chibi-${pose || "base"}`) || path(`${who}-chibi-base`);
  }
  function bg(id) {
    if (!ok(id)) return null;
    return path(id) || path(`bg-${id}`);
  }
  const name = (who) => NAME[who] || "";
  /* 🔒 대체 문구는 **실제로 그려지는 그림**을 말합니다 — 표정이 없어 base로 물러섰으면 「평온」이에요.
   *    (「눈물」이라고 읽어 주는데 화면은 평온한 얼굴이면 그게 거짓말입니다) */
  function alt(who, mood, nm) {
    const m = mood || "base";
    const fall = m.startsWith("chibi-") ? "chibi-base" : "base";
    const shown = HAVE.has(`${who}-${m}`) || !HAVE.has(`${who}-${fall}`) ? m : fall;
    return `${nm || NAME[who] || "선수"} — ${MOOD[shown] || MOOD.base}`;
  }

  return { src, chibi, bg, alt, name };
})();
