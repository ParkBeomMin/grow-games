/* 더 드래프트 ⚾ 야구선수 키우기 */
"use strict";

// ---------- 데이터 ----------
const REGIONS = [
  {
    id: "seoul", name: "서울", emoji: "🏙️",
    school: "한강고", teams: ["한백 코메츠", "태평 팰컨스", "미르 스파크스"],
    win: 0.70, growth: 1.0, spot: 1.1,
    desc: "미디어와 스카우트가 몰리는 수도. 주목받기 좋아요",
  },
  {
    id: "gyeongin", name: "인천·경기", emoji: "🌊",
    school: "서해고", teams: ["해든 앵커스", "다온 나이츠"],
    win: 0.62, growth: 1.05, spot: 1.0,
    desc: "탄탄한 유망주 산실. 성장 환경이 좋아요",
  },
  {
    id: "chungcheong", name: "대전·충청", emoji: "🌰",
    school: "백제고", teams: ["청우 크레인스"],
    win: 0.58, growth: 1.1, spot: 1.05,
    desc: "팀은 약하지만 출전 기회가 많아 크게 성장해요",
  },
  {
    id: "honam", name: "광주·전라", emoji: "🍚",
    school: "빛고을고", teams: ["나래 블레이즈"],
    win: 0.78, growth: 0.92, spot: 0.95,
    desc: "최강 명문. 우승은 쉽지만 주전 경쟁이 치열해요",
  },
  {
    id: "daegu", name: "대구·경북", emoji: "🍎",
    school: "달구벌고", teams: ["한별 썬더스"],
    win: 0.72, growth: 0.97, spot: 1.0,
    desc: "전통의 야구 도시. 밸런스가 좋아요",
  },
  {
    id: "busan", name: "부산·경남", emoji: "⚓",
    school: "오륙도고", teams: ["우주 타이푼스", "대륙 웨이브스"],
    win: 0.74, growth: 0.95, spot: 1.0,
    desc: "구도(球都) 부산. 열광적인 응원 속에 큰 무대 경험",
  },
];

const STAT_DEFS = {
  batter: [
    { key: "contact", name: "타격", emoji: "🏏", sub: "안타 생산" },
    { key: "power", name: "파워", emoji: "💪", sub: "홈런 파워" },
    { key: "run", name: "주루", emoji: "👟", sub: "도루·주루" },
    { key: "defense", name: "수비", emoji: "🧤", sub: "수비 안정감" },
    { key: "stamina", name: "체력", emoji: "🫀", sub: "지구력" },
  ],
  pitcher: [
    { key: "velocity", name: "구속", emoji: "🔥", sub: "빠른 공" },
    { key: "control", name: "제구", emoji: "🎯", sub: "정확한 공" },
    { key: "breaking", name: "변화구", emoji: "🌀", sub: "현란한 공" },
    { key: "defense", name: "수비", emoji: "🧤", sub: "견제·수비" },
    { key: "stamina", name: "체력", emoji: "🫀", sub: "이닝 소화" },
  ],
};

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const GIVEN = ["도윤", "시우", "하준", "은찬", "민재", "태양", "강민", "준서", "지호", "건우", "현빈", "서준"];

const OPPONENTS = ["북일고", "덕수고", "경남고", "유신고", "장충고", "휘문고", "마산용마고", "전주고", "세광고", "강릉고", "경북고", "천안북일고", "충암고", "성남고"];

const TOURNAMENTS = { 6: "황금사자기", 8: "청룡기" };
const ROUNDS = ["16강", "8강", "4강", "결승"];

// ---------- 상태 ----------
const SAVE_KEY = "rookie-save-v1";

// ---------- 🧬 유산(환생) ----------
// 환생하면 커리어를 마치고 '다음 세대'가 유산을 이어받아요.
// 은퇴(명예의 전당 등록)와 달리 기록은 남기지 않고, 대신 영구 보너스를 넘겨줍니다.
// 보너스는 sqrt로 완만하게 오르고 상한이 있어 폭주하지 않아요.
const LEGACY_KEY = SAVE_KEY + "-legacy";
const LEGACY_TALENT_CAP = 0.25;   // 시작 재능 보너스 상한
function loadLegacy() {
  try { const l = JSON.parse(localStorage.getItem(LEGACY_KEY)); if (l && typeof l.pts === "number") return l; } catch {}
  return { pts: 0, gen: 0 };
}
function saveLegacy(l) { try { localStorage.setItem(LEGACY_KEY, JSON.stringify(l)); } catch {} }
const legacyTalentBonus = (pts) => Math.min(0.03 * Math.sqrt(Math.max(pts, 0)), LEGACY_TALENT_CAP);
const LEGACY_MONEY_CAP = 15000;   // 시작 자금 상한 (대략 한 시즌 수입)
// 재능 보너스와 같은 모양이에요 — √로 완만히 오르고 누적 70쯤에서 함께 포화해요.
const legacyMoneyBonus = (pts) => Math.min(Math.round(1800 * Math.sqrt(Math.max(pts, 0))), LEGACY_MONEY_CAP);
// 은퇴 점수 → 이번 환생으로 얻는 유산 포인트
const legacyGain = (score) => Math.max(1, Math.floor(Math.sqrt(Math.max(score, 0) / 10)));
let S = null; // 게임 상태
let tour = null; // 진행 중인 대회 상태

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const STAT_CAP = 130; // 100 이후는 '한계 돌파' 구간 (성장 효율 절반)
const fmtMoney = (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v)}만`);

/* 🌏 리그 사다리 — KBO에서 시작해 해외로 올라가요. tier가 순서예요.
 * id는 옛 세이브의 S.league가 가리키는 값이라 절대 안 바꿔요 — 번호를 다시 매기면
 * 진행 중인 캐릭터가 엉뚱한 리그로 갑니다. (⚽ 축구에서 id로 순서를 판단해 사고가 났어요.)
 * 축구와 달리 아래로 가는 층은 없어요. KBO가 바닥입니다.
 *
 * 난이도는 상대 수준(oppStr)에 얹어요. 축구는 평가가 순위 기반이라 경기 평점을
 * 깎았지만, 야구는 평가가 타율·홈런·방어율에서 나오니 상대를 세게 하면
 * 그 숫자가 자연히 내려가요. 실제로 벌어지는 일과도 같습니다 —
 * 메이저에서 타율이 떨어지는 건 투수가 좋기 때문이에요.
 * WAR이 내려가면 MVP·골든글러브가 자동으로 어려워지니 문턱(bar)을 따로 두지 않아요.
 *
 * 다만 oppStr 하나로는 투수에게 안 닿아요. 투수의 시즌 실점은 전부 위기 판정에서
 * 나오는데 거기서 oppStr은 '완전히 막을 확률'만 바꾸고 실점 크기는 안 건드리거든요.
 * 그래서 투수 쪽 통로가 하나 더 있어요 — crisisRuns의 lgUp(CRISIS_LEAGUE_K)입니다.
 *
 * 세 값은 감이 아니라 시뮬레이션으로 잡았어요. 판단 기준은 수상 확률이 아니라
 * '수상 확률 × prestige'(명예의 전당 가치)고, 능력치 100·110에서는 KBO가,
 * 130에서는 열도가, 150(초월 구간)에서는 대륙이 최적이 되게 맞췄어요.
 * 타자와 투수가 '같은' prestige를 쓰면서 둘 다 그 순서를 지켜야 해서 여유가 빠듯해요 —
 * prestige를 1.5/2.2에서 1.4/2.3으로 옮긴 것도 그래서예요. 투수가 열도에서 너무
 * 이득이고(능력치 110) 대륙에서 너무 손해라(150), 2층을 낮추고 3층을 올렸어요.
 * oppUp을 더 키우면 hitP의 하한(0.10)에 눌려서 난이도가 더 안 올라가요 —
 * 축구의 평점 천장과 같은 실패라, tests/rookie/league-test.js ⑦이 그 자리를 지킵니다.
 * 투수를 맞추려고 oppUp을 키우지 않은 것도 그래서예요. 투수는 lgUp으로 따로 맞춰요.
 *
 * 실제 리그명은 쓰지 않아요. 이 저장소는 상표를 전부 가상 명칭으로 바꿨어요
 * (KBO만 이미 코드에 있던 이름이라 그대로 둡니다).
 *
 * career.js가 아니라 여기 두는 건 career.js가 IIFE라 그 안의 선언이 밖으로 안 새기
 * 때문이에요. 구단 목록·화면처럼 game.js 쪽에서도 리그를 읽어야 해요. */
/* games — 그 리그의 정규시즌 경기 수예요. 실제와 같은 숫자로 뒀어요.
 * KBO가 144라 옛 세이브(leagueOf가 KBO로 받아주는)는 예전과 한 톨도 안 달라요.
 * 위로 갈수록 경기가 많아 누적(홈런·이닝·WAR)이 더 쌓여요 — 난이도를 일부 상쇄합니다. */
const LEAGUES = [
  { id: 1, tier: 1, name: "KBO",     short: "국내", flag: "🇰🇷", oppUp: 0,    prestige: 1.00, games: 144 },
  { id: 2, tier: 2, name: "열도 리그", short: "열도", flag: "🇯🇵", oppUp: 0.02, prestige: 1.40, games: 143 },
  { id: 3, tier: 3, name: "대륙 리그", short: "대륙", flag: "🗽", oppUp: 0.06, prestige: 2.30, games: 162 },
];

/* 옛 세이브에는 S.league가 없어요. 마이그레이션하지 않고 없으면 KBO로 봐요.
 * 깨진 값도 KBO로 막아요 — oppUp이 0이라 진행 중인 캐릭터의 성적이 안 튑니다. */
function leagueOf(st) {
  const id = (st && st.league) || 1;
  return LEAGUES.find((l) => l.id === id) || LEAGUES.find((l) => l.id === 1) || LEAGUES[0];
}

/* 🌏 리그별 구단 — 전력은 teamStrOf와 같은 눈금이에요(0.49가 한가운데).
 *
 * KBO 구단은 str이 null이에요. 예전처럼 teamStrOf가 0.38~0.60에서 뽑고, 저장본에
 * 남습니다 — 진행 중인 캐릭터의 순위표가 안 튀어야 해서 그 경로를 한 톨도 안 건드려요.
 * 해외 구단만 값을 못 박아요. 리그가 높을수록 평균이 높고, 그게 곧 '위로 갈수록
 * 순위 싸움이 빡빡하다'는 뜻이에요 (다른 팀 승수는 finishProGame이 str로 굴려요).
 *
 * ⚠️ 이 값은 난이도(oppUp)와 다른 통로예요. oppUp은 '내가 상대하는 공'에만 걸리지만,
 * 여기 적힌 전력은 teamWinP(내 팀 보너스)·순위표·가을야구 대진(S.post.str)까지 흘러가요.
 * 그래서 위쪽 끝을 함부로 못 올려요 — gameWinP가 가을야구에서
 * `base - (상대 전력 - 0.49) * 1.8`을 빼는데, 상대가 0.64를 넘으면 웬만한 팀 승률이
 * 30% 밑으로 떨어집니다. ⚽ 축구에서 수비수 팀 승률이 7%가 된 게 정확히 이 자리예요.
 * 상한을 대륙 0.62(드리프트 여유 0.64)로 묶어둔 이유고,
 * tests/rookie/club-test.js ④가 그 자리를 지켜요.
 *
 * 실제 구단명은 쓰지 않아요. 이 저장소는 상표를 전부 가상 명칭으로 바꿨어요
 * (KBO 구단명도 그래서 바꿨습니다). 지역·색·동물 같은 결로 지었어요. */
const LEAGUE_CLUBS = {
  1: REGIONS.flatMap((r) => r.teams).map((name) => ({ name, str: null })),
  2: [
    { name: "아오바 팬서스", str: 0.58 },
    { name: "코가네 라이노스", str: 0.56 },
    { name: "하야테 게일스", str: 0.54 },
    { name: "미도리 오터스", str: 0.53 },
    { name: "시라네 울브스", str: 0.52 },
    { name: "소라이 헤론스", str: 0.51 },
    { name: "아카네 폭스", str: 0.49 },
    { name: "이와쿠라 아이벡스", str: 0.48 },
    { name: "츠키미 루나스", str: 0.46 },
    { name: "하마카제 스톰스", str: 0.44 },
  ],
  3: [
    { name: "레이크사이드 엘크스", str: 0.62 },
    { name: "아이언필드 벌컨스", str: 0.60 },
    { name: "노스쇼어 미티어스", str: 0.59 },
    { name: "하이랜드 볼케이노스", str: 0.57 },
    { name: "웨스트게이트 콘도르스", str: 0.56 },
    { name: "스톤크릭 그리핀스", str: 0.55 },
    { name: "선셋베이 코브라스", str: 0.53 },
    { name: "리버벤드 아이비스", str: 0.52 },
    { name: "골드코스트 퀘이사스", str: 0.51 },
    { name: "파인힐 세이블스", str: 0.48 },
  ],
};

/* 시즌마다 전력이 흔들릴 때(driftTeamStr) 넘지 않는 울타리예요.
 * KBO 값(0.36~0.63)은 예전 그대로고, 해외는 그 리그 목록의 위아래에 0.02씩 여유를 준 값이에요.
 * 리그마다 따로 두지 않으면 드리프트가 전부 KBO 울타리로 끌려와 리그 차이가 녹아 없어져요. */
const LEAGUE_DRIFT = { 1: [0.36, 0.63], 2: [0.42, 0.60], 3: [0.46, 0.64] };

// league는 리그 객체(leagueOf가 준 것)나 id 숫자 둘 다 받아요. 모르는 값이면 KBO예요.
const leagueIdOf = (league) => {
  const id = league && typeof league === "object" ? league.id : league;
  // 숫자만 받아요. "2" 같은 문자열을 통과시키면 leagueOf가 막아둔 깨진 값이 여기로 새요.
  return typeof id === "number" && LEAGUE_CLUBS[id] ? id : 1;
};
// 그 리그의 구단 이름 목록이에요. 옛 세이브(S.league 없음)는 KBO 구단만 받아요.
function teamsOf(league) {
  return LEAGUE_CLUBS[leagueIdOf(league)].map((c) => c.name);
}
function driftBandOf(league) {
  return LEAGUE_DRIFT[leagueIdOf(league)];
}
/* 구단 이름 → 못 박아둔 전력. KBO 구단과 모르는 이름은 undefined라
 * teamStrOf가 예전처럼 직접 뽑아요. */
const CLUB_STR = {};
for (const id of Object.keys(LEAGUE_CLUBS)) {
  for (const c of LEAGUE_CLUBS[id]) if (typeof c.str === "number") CLUB_STR[c.name] = c.str;
}
const clubStrOf = (name) => CLUB_STR[name];

/* 🌏 그 리그 구단 전력의 평균이에요 — LEAGUE_CLUBS에서 그때그때 계산해요(값을 손으로
 * 적지 않아요). oppFor가 상대를 '그 리그 평균 대비'로 읽을 때 기준이 되는 값이에요.
 * 리그가 세다는 효과는 오직 oppUp에서만 오게 하고, 해외 구단 전력이 애초에 높게
 * 박혀 있는 것 자체는 난이도로 새어들지 않게 하려는 거예요.
 *
 * KBO 구단은 str이 전부 null이라 teamStrOf가 0.38~0.60에서 뽑는 그 한가운데(0.49)로
 * 봐요 — 그래서 KBO 보정이 정확히 0이 되고, oppFor가 teamStrOf와 한 톨까지 같아져
 * 진행 중인 캐릭터의 성적이 안 튑니다. 구단을 더하면 평균이 자동으로 따라가요. */
function leagueAvgStr(league) {
  const strs = LEAGUE_CLUBS[leagueIdOf(league)].map((c) => c.str).filter((s) => typeof s === "number");
  return strs.length ? strs.reduce((a, b) => a + b, 0) / strs.length : 0.49;
}

// 시작 능력치 뽑기 — 이름 화면에서 미리 보고 다시 뽑을 수 있어요
function rollStats(pos) {
  const stats = {};
  const talents = {};
  for (const d of STAT_DEFS[pos]) {
    stats[d.key] = randInt(24, 38);
    talents[d.key] = Math.min(rand(0.8, 1.45) + legacyTalentBonus(loadLegacy().pts), TALENT_MAX);
  }
  return { stats, talents };
}

let pendingRoll = null;
function renderRoll() {
  if (!pendingRoll) return;
  const defs = STAT_DEFS[chosenPos];
  window.Radar.draw($("roll-radar"), defs, pendingRoll.stats);
  $("roll-stars").innerHTML = defs
    .map((d) => `${d.emoji} ${d.name} ${"⭐".repeat(talentStars(pendingRoll.talents[d.key]))}`)
    .join(" · ") + `<br/>⭐ = 잠재력 — 별이 많은 능력치일수록 훈련 효율이 높아요`;
}
$("btn-reroll")?.addEventListener("click", () => {
  pendingRoll = rollStats(chosenPos);
  renderRoll();
});

function newState(region, pos, name, roll) {
  const { stats, talents } = roll || rollStats(pos);
  return {
    region: region.id, pos, name,
    year: 1, month: 3,
    stats, talents,
    // 🧬 환생 유산으로 받은 시작 자금이에요. 유산이 없으면 0이에요.
    money: legacyMoneyBonus(loadLegacy().pts),
    gear: {},
    condition: 80,
    scout: 0,
    buff: false, // 다음 훈련 효율 상승
    trophies: [],
    games: 0, // 대회 출전 경기 수
    log: [],
  };
}

const regionOf = () => REGIONS.find((r) => r.id === S.region);
const overall = () => {
  const vals = Object.values(S.stats);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

// ---------- 저장 — 선수 여러 명(슬롯) 지원 ----------
const SLOTS_KEY = SAVE_KEY + "-slots";
let curSlot = null;
// 실존 구단·학교 이름을 가상 이름으로 바꾸면서, 이미 저장된 기록도 함께 옮겨요.
// (안 옮기면 예전에 시작한 사람은 계속 옛 이름이 보여요)
// 실존 구단명(앞의 기업명)을 가상 기업명으로 바꿨어요. 잠깐 지역명을 썼던
// 버전(v2.7.1)도 있어서 두 갈래 모두 새 이름으로 모아줍니다.
const RENAMED = {
  // ① 실존 구단 → 가상 (기업명·마스코트 모두 교체)
  "LG 트윈스": "한백 코메츠", "두산 베어스": "태평 팰컨스", "키움 히어로즈": "미르 스파크스",
  "SSG 랜더스": "해든 앵커스", "KT 위즈": "다온 나이츠",
  "한화 이글스": "청우 크레인스", "KIA 타이거즈": "나래 블레이즈",
  "삼성 라이온즈": "한별 썬더스", "롯데 자이언츠": "우주 타이푼스", "NC 다이노스": "대륙 웨이브스",
  // ② 잠깐 나갔던 지역명 버전 (v2.7.1)
  "서울 코메츠": "한백 코메츠", "남산 팰컨스": "태평 팰컨스", "강남 스파크스": "미르 스파크스",
  "인천 앵커스": "해든 앵커스", "수원 나이츠": "다온 나이츠",
  "금강 크레인스": "청우 크레인스", "무등 블레이즈": "나래 블레이즈",
  "팔공 썬더스": "한별 썬더스", "부산 타이푼스": "우주 타이푼스", "창원 웨이브스": "대륙 웨이브스",
  // ③ 기업명만 바꿨던 버전 (v2.8.1) — 마스코트가 실제 구단과 같아 다시 바꿨어요
  "한백 트윈스": "한백 코메츠", "태평 베어스": "태평 팰컨스", "미르 히어로즈": "미르 스파크스",
  "해든 랜더스": "해든 앵커스", "다온 위즈": "다온 나이츠",
  "청우 이글스": "청우 크레인스", "나래 타이거즈": "나래 블레이즈",
  "한별 라이온즈": "한별 썬더스", "우주 자이언츠": "우주 타이푼스", "대륙 다이노스": "대륙 웨이브스",
  // 실존 고교명 → 가상
  "서울고": "한강고", "인천고": "서해고", "대전고": "백제고",
  "광주제일고": "빛고을고", "대구상원고": "달구벌고", "부산고": "오륙도고",
};
const renamed = (v) => (typeof v === "string" && RENAMED[v]) || v;
function migrateNames(obj) {
  if (!obj || typeof obj !== "object") return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === "string") obj[k] = renamed(v);
    else if (v && typeof v === "object") migrateNames(v);
  }
  return obj;
}
function loadSlots() {
  try { return migrateNames(JSON.parse(localStorage.getItem(SLOTS_KEY)) || {}); } catch { return {}; }
}
function saveSlots(sl) { localStorage.setItem(SLOTS_KEY, JSON.stringify(sl)); }
// 예전 단일 저장 → 슬롯으로 이사
{
  const old = localStorage.getItem(SAVE_KEY);
  if (old) {
    try {
      const sl = loadSlots();
      sl["s" + Date.now()] = JSON.parse(old);
      saveSlots(sl);
    } catch { /* 손상된 저장은 버려요 */ }
    localStorage.removeItem(SAVE_KEY);
  }
}
function save() {
  if (!S) return;
  if (!curSlot) curSlot = "s" + Date.now() + Math.floor(Math.random() * 1e4);
  S.savedAt = Date.now();
  const sl = loadSlots();
  sl[curSlot] = S;
  saveSlots(sl);
  if (window.Cloud) Cloud.touch();
}
function clearSave() {
  if (!curSlot) return;
  const sl = loadSlots();
  delete sl[curSlot];
  saveSlots(sl);
  curSlot = null;
}

// ---------- 화면 전환 ----------
function show(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
  if (!show._silent) history.pushState({ s: id }, "");
}

// ---------- 화면 이동 (뒤로/홈) ----------
const BACK_SAFE = ["screen-title", "screen-region", "screen-position", "screen-name", "screen-hof", "screen-battle"];
window.addEventListener("popstate", (e) => {
  const target = e.state && e.state.s;
  const cur = document.querySelector(".screen.active");
  const curId = cur ? cur.id : "";
  if (target && BACK_SAFE.includes(target) && BACK_SAFE.includes(curId)) {
    show._silent = true;
    show(target);
    show._silent = false;
  } else {
    // 경기/육성 진행 중에는 실수 방지를 위해 뒤로가기를 막아요
    history.pushState({ s: curId }, "");
  }
});

$("btn-back-first")?.addEventListener("click", () => show("screen-title"));
$("btn-back-position")?.addEventListener("click", () => show("screen-region"));
$("btn-back-name")?.addEventListener("click", () => show("screen-position"));
// 홈 = 타이틀로 (진행 상황은 매 턴 자동 저장돼요)
const goHome = () => { if (S) save(); location.reload(); };
$("btn-home-main")?.addEventListener("click", goHome);
$("btn-home-pro")?.addEventListener("click", goHome);


// ---------- 재능 각성 ----------
// 재능 상한. 별 표시는 talentStars()가 이 값을 5성에 맞춰 환산해요.
const TALENT_MAX = 1.8;
// ✨ 초월 각성 — 재능이 MAX에 닿은 뒤의 엔드게임.
// 재능은 1.8로 고정(올리면 훈련↑→단계↑ 되먹임으로 폭주해요). 대신 단계마다
// 그 스탯의 상한이 조금 올라 계속 훈련할 공간이 생기고, 실질 보상은
// 명예의 전당 점수 가산이에요. 성공률이 단계마다 떨어져 자연히 느려집니다.
const TRANS_CAP_STEP = 6;   // 단계당 스탯 상한 증가
const TRANS_P0 = 0.45, TRANS_PDEC = 0.03, TRANS_PMIN = 0.15;
const transLv = (key) => (S.trans && S.trans[key]) || 0;
const transTotal = () => Object.values((S && S.trans) || {}).reduce((a, b) => a + b, 0);
const statCap = (key) => STAT_CAP + transLv(key) * TRANS_CAP_STEP;
const transP = (lv) => Math.max(TRANS_P0 - lv * TRANS_PDEC, TRANS_PMIN);
// 상한에 닿은 능력치는 더 훈련해도 오르지 않아요(턴만 소모).
// 그래서 그 능력치의 행동 버튼은 각성/초월로 바뀝니다.
const atCap = (key) => Math.round(S.stats[key]) >= statCap(key);
const awakenP = (v) => Math.min(0.25 + (v - 100) * 0.015, 0.75);
// 재능은 훈련 속도뿐 아니라 '큰 순간'에도 작용해요 (클러치 보정).
// 스탯에 이미 반영된 걸 또 곱하는 이중 이득이 되지 않게 폭을 좁혔어요:
// 평균 재능(1.3) 기준 ±6%, 초월 단계로 최대 +6%p 추가.
// 재능 상한이 1.8이라 실제로 닿는 범위는 0.94 ~ 1.12배예요 (clamp 바깥쪽은 여유분).
const CLUTCH_SCALE = 0.12;
function clutch(key) {
  const t = (S && S.talents && S.talents[key]) || 1.3;
  return clamp(1 + (t - 1.3) * CLUTCH_SCALE + Math.min(transLv(key) * 0.004, 0.06), 0.9, 1.16);
}
/* 🌏 상위 리그의 '한 방' 계수예요.
 *
 * 리그 난이도를 억제 확률(hold)에만 얹었더니 실점 '크기'가 리그와 무관했어요.
 * 특히 실투(miss) 분기는 randInt(1,3) 고정이라 KBO와 한 톨도 안 달랐고,
 * 그래서 투수가 리그를 거의 못 느꼈어요 — 능력치 100에서 대륙 리그로 가도
 * WAR이 6.4 → 6.2로 0.2밖에 안 내려갔어요(타자는 -1.8). 사다리가 무너지는 자리예요.
 *
 * 억제력(hold)의 여집합에 비례해요. 잘 막는 투수일수록 상위 리그에서도 덜 무너지고,
 * 그 기울기가 곧 사다리예요 — 평평하게 걸면 정상급 투수까지 같이 무너져서
 * '실력이 되면 올라가는 게 이득'이 성립하지 않아요.
 * 9는 감이 아니라 시뮬레이션으로 잡았어요 (tests/rookie/league-test.js ⑩·⑪). */
const CRISIS_LEAGUE_K = 9;
const CRISIS_LEAGUE_CAP = 0.6;   // 리그가 아무리 세도 위기 하나가 한 방 이상 더 커지진 않아요

/* 🔥 위기 실점 — 타자 타석 판정과 같은 뼈대예요.
 * 예전에는 퍼펙트가 실점 0을 확정해서, 위기를 다 막으면 시즌 ERA 0.45가 나왔어요.
 * 이제 제구가 억제 수준을 정하고 판정이 배수로 흔들어요.
 * 선발(game.js)과 구원 등판(career.js)이 같은 식을 씁니다.
 *
 * lgUp은 '리그 난이도만' 떼어낸 값이에요. oppStr에는 팀 전력과 리그 난이도가 섞여
 * 있는데, 그걸로 실점 크기를 키우면 KBO에서 강팀을 만날 때도 실점이 늘어서
 * 이미 맞춰둔 팀 전력 밸런스가 함께 흔들려요. 그래서 호출부가 리그 몫을 따로 넘겨요.
 * 안 넘기면 0(KBO)이라, 리그를 모르는 옛 호출부도 예전 그대로 굴러가요. */
function crisisRuns(res, oppStr, lgUp) {
  const hold = clamp(0.02 + S.stats.control / 300 - ((typeof oppStr === "number" ? oppStr : 0.49) - 0.49) * 0.6,
    0.10, 0.90) * clutch("control");
  let runs;
  if (res === "perfect") runs = Math.random() < hold ? 0 : 1;
  else if (res === "good") runs = Math.random() < hold * 0.35 ? 0 : randInt(1, 2);
  // 실투해도 최소 실점으로 끊을 때가 있어요. 2~3 고정이면 저스탯 자동 진행에서
  // 이 항 하나가 실점을 지배해 첫 시즌 ERA가 7점대로 튑니다.
  else runs = randInt(1, 3);
  /* 이미 무너진 위기가 상위 리그에서는 한 점 더 커져요. 막아낸 위기(0실점)는 그대로예요 —
   * 리그가 세다고 '막았는데 점수가 난다'가 되면 판정이 거짓말이 됩니다.
   * up이 0이면 난수를 아예 안 뽑아요. KBO가 리그 도입 전과 난수 한 톨까지 같아야 해서예요. */
  const up = typeof lgUp === "number" ? lgUp : 0;
  if (runs > 0 && up > 0
    && Math.random() < clamp(up * CRISIS_LEAGUE_K * (1 - hold), 0, CRISIS_LEAGUE_CAP)) runs += 1;
  return runs;
}
function clutchAvg() {
  const ks = Object.keys((S && S.talents) || {});
  return ks.length ? ks.reduce((a, k) => a + clutch(k), 0) / ks.length : 1;
}
function transcendTitle(n) {
  if (n >= 40) return "🔱 신화의 영역";
  if (n >= 25) return "🌌 무아지경";
  if (n >= 12) return "✨ 초월자";
  if (n >= 1) return "🌠 각성 너머";
  return "";
}
/* 🔁 몇 년차에 어느 팀이었나.
 * 시즌 기록에 team을 저장하기 시작한 건 2.21.0부터라, 그 전 기록은
 * 이적 이력(S.moves)에서 역산합니다. 이적이 없으면 늘 지금 팀이에요. */
function teamOfSeason(x) {
  if (x && x.team) return x.team;
  const moves = (S && S.moves) || [];
  if (!moves.length) return (S && S.team) || "";
  let team = moves[0].from;                       // 데뷔 팀
  for (const m of moves) {
    // 오프시즌 이적은 다음 시즌부터, 시즌 중 이적은 그 시즌부터
    if (x.y >= (m.inSeason ? m.y : m.y + 1)) team = m.to;
  }
  return team;
}
// 표가 좁아서 첫 낱말만 써요 ("청우 크레인스" → "청우")
const shortTeam = (name) => (name ? String(name).split(" ")[0] : "-");

const talentStars = (t) => clamp(Math.round(((t - 0.6) / (TALENT_MAX - 0.6)) * 5), 1, 5);
const isTalentMax = (t) => t >= TALENT_MAX - 1e-9;
// 스탯 100 이상(한계 돌파)부터 도전 가능. 깊이 돌파할수록 성공 확률 상승.
// 성공: 재능(⭐) 상승 / 실패: 낮은 확률로 재능 하락 — 어느 쪽이든 스탯은 크게 낮아져 다시 키워야 해요.
// 재능 MAX 이후 — 상한까지 채운 스탯으로 초월에 도전해요.
function transcend(key, d, v, logFn) {
  const cap = statCap(key);
  if (v < cap) {
    alert(
      `✨ ${d.name} 재능은 이미 최대(⭐⭐⭐⭐⭐ MAX)예요!\n\n` +
      `이제부터는 🌠 초월 각성에 도전할 수 있어요.\n` +
      `· 조건: ${d.name} 수치를 상한(${cap})까지 채우기 — 지금 ${v}\n` +
      `· 초월 1단계마다 상한 +${TRANS_CAP_STEP}, 명예의 전당 점수 +25`
    );
    return false;
  }
  const lv = transLv(key);
  const p = transP(lv);
  if (!confirm(
    `🌠 ${d.name} 초월 각성 (현재 ✨${lv})\n\n` +
    `성공 확률 ${Math.round(p * 100)}% — 단계가 오를수록 낮아져요\n` +
    `· 성공: ✨${lv + 1} 달성, 상한 ${cap} → ${cap + TRANS_CAP_STEP}, 명예의 전당 +25점\n` +
    `· 실패: ${d.name} 수치만 초기화 (재능은 이미 MAX라 잃지 않아요)\n\n도전할까요?`
  )) return false;

  S.trans = S.trans || {};
  if (Math.random() < p) {
    S.trans[key] = lv + 1;
    S.stats[key] = randInt(45, 60);
    logFn(`🌠✨ ${d.name} 초월 ${lv + 1}단계 달성!! 상한이 ${statCap(key)}까지 열렸어요`);
    if (window.Fx) Fx.celebrate("transcend", `🌠 초월 ${lv + 1}단계!`, ".awaken-btn");
  } else {
    S.stats[key] = randInt(45, 60);
    logFn(`🌠💦 초월 실패… ${d.name} ${Math.round(S.stats[key])}부터 다시 (✨${lv} 유지)`);
    if (window.Fx) { Fx.burst(".awaken-btn", "💦", 8); Fx.flash(`💦 ${d.name} 초월 실패…`); }
  }
  save();
  return true;
}

function awakenTalent(key, logFn) {
  const defs = Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos];
  const d = defs.find((x) => x.key === key);
  // 화면 표시(반올림)와 동일한 기준 — 99.6도 '100'으로 보이면 각성 가능해야 해요
  const v = Math.round(S.stats[key]);
  if (!d || v < 100) return false;
  // 재능이 상한(TALENT_MAX)이면 각성해도 오르는 게 없어요.
  // 예전엔 '성공'이 뜨면서 스탯만 45~60으로 깎여 순손실이었습니다.
  if (S.talents[key] >= TALENT_MAX - 1e-9) return transcend(key, d, v, logFn);
  const p = awakenP(v);
  const ok = confirm(
    `🔮 ${d.name} 재능 각성 시도!\n\n` +
    `성공 확률 ${Math.round(p * 100)}% (돌파가 깊을수록 올라가요)\n` +
    `· 성공: 재능(⭐)이 영구히 상승 — 훈련 효율이 평균 ${Math.round(0.225 / S.talents[key] * 100)}% 빨라져요\n` +
    `· 실패: 낮은 확률로 재능이 살짝 하락\n` +
    `· 성공하든 실패하든 ${d.name} 수치는 크게 낮아져서 다시 키워야 해요\n\n진행할까요?`
  );
  if (!ok) return false;
  if (Math.random() < p) {
    S.talents[key] = Math.min(S.talents[key] + rand(0.15, 0.3), TALENT_MAX);
    S.stats[key] = randInt(45, 60);
    logFn(`🔮✨ ${d.name} 재능 각성 성공!! 잠재력이 한 단계 피어났어요 (수치 ${Math.round(S.stats[key])}부터 재도전)`);
    if (window.Fx) Fx.celebrate("awaken", `⭐ ${d.name} 각성 성공!`, ".awaken-btn");
  } else if (Math.random() < 0.1) {
    S.talents[key] = Math.max(S.talents[key] - 0.1, 0.8);
    S.stats[key] = randInt(30, 50);
    logFn(`🔮💧 각성 실패… 무리한 시도에 재능까지 살짝 잃었어요 (${Math.round(S.stats[key])})`);
    // 실패에 연출이 없어서 "아무 일도 안 일어났다 = 오류"로 읽혔어요 (플레이어 제보)
    if (window.Fx) { Fx.burst(".awaken-btn", "💧", 10); Fx.flash(`💧 ${d.name} 각성 실패… 재능도 잃었어요`); }
  } else {
    S.stats[key] = randInt(30, 50);
    logFn(`🔮💦 각성 실패… ${d.name} ${Math.round(S.stats[key])}부터 다시 담금질!`);
    if (window.Fx) { Fx.burst(".awaken-btn", "💦", 8); Fx.flash(`💦 ${d.name} 각성 실패…`); }
  }
  save();
  return true;
}


// ---------- 보너스 보상 (공용) — 30분에 1번 ----------
const AD_CD_KEY = "grow-ad-cd";
const AD_CD_MS = 1800000; // 30분
const adCooldownLeft = () =>
  Math.max(0, AD_CD_MS - (Date.now() - (+localStorage.getItem(AD_CD_KEY) || 0)));

// 팝업(모달)로 보너스 지급 연출
function showAdModal(amount, onDone) {
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal ad-modal">
      <p class="av-title">🎁 보너스 타임!</p>
      <div class="ad-modal-body"><div class="ad-emoji">⏳</div>준비 중…</div>
      <div class="av-actions"><button class="btn btn-ghost ad-modal-close" disabled>잠시만요…</button></div>
    </div>`;
  document.body.appendChild(ov);
  const body = ov.querySelector(".ad-modal-body");
  const closeBtn = ov.querySelector(".ad-modal-close");
  const finish = () => { ov.remove(); if (onDone) onDone(); };
  window.Ads.rewarded((ok) => {
    if (ok) {
      S.money = (S.money || 0) + amount;
      localStorage.setItem(AD_CD_KEY, Date.now());
      save();
      if (window.Stats) Stats.log("bonus", { type: "money" });
      body.innerHTML = `<div class="ad-emoji">💰</div><b>+${amount}만</b> 획득!<br/><span class="av-note">다음 보너스는 30분 후에 열려요</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>보상을 받지 못했어요`;
    }
    closeBtn.disabled = false;
    closeBtn.textContent = "확인";
    closeBtn.onclick = finish;
  });
}

// 무료 특훈 — 랜덤 스탯을 훈련하되 턴(월/경기 카운트)을 소모하지 않아요
function showAdTrainModal(rerender) {
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal ad-modal">
      <p class="av-title">🎁 무료 특훈!</p>
      <div class="ad-modal-body"><div class="ad-emoji">⏳</div>준비 중…</div>
      <div class="av-actions"><button type="button" class="btn btn-ghost ad-modal-close" disabled>잠시만요…</button></div>
    </div>`;
  document.body.appendChild(ov);
  const body = ov.querySelector(".ad-modal-body");
  const closeBtn = ov.querySelector(".ad-modal-close");
  window.Ads.rewarded((ok) => {
    if (ok) {
      const pool = statDefs().filter((x) => !atCap(x.key));
      const d = pick(pool.length ? pool : statDefs());
      let gain = rand(2.2, 4.2) * S.talents[d.key];
      if (S.stats[d.key] >= 100) gain *= 0.5;
      gain = Math.round(gain * 10) / 10;
      S.stats[d.key] = clamp(S.stats[d.key] + gain, 0, statCap(d.key));
      localStorage.setItem(AD_CD_KEY, Date.now());
      save();
      if (window.Stats) Stats.log("bonus", { type: "train" });
      body.innerHTML = `<div class="ad-emoji">${d.emoji}</div><b>${d.name} +${gain.toFixed(1)}</b> 특훈 완료!<br/><span class="av-note">턴을 소모하지 않는 보너스 훈련 · 다음은 30분 후</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>특훈에 실패했어요`;
    }
    closeBtn.disabled = false;
    closeBtn.textContent = "확인";
    closeBtn.onclick = () => { ov.remove(); if (rerender) rerender(); };
  });
}

function makeAdSlotButton(rerender) {
  const btn = document.createElement("button");
  btn.className = "action-btn ad-slot";
  const left = adCooldownLeft();
  if (left > 0) {
    btn.disabled = true;
    btn.innerHTML = `<span class="a-emoji">🎁</span>특훈<span class="a-sub">${Math.ceil(left / 60000)}분 후 가능</span>`;
  } else {
    btn.innerHTML = `<span class="a-emoji">🎁</span>특훈<span class="a-sub">30분마다 무료 훈련</span>`;
    btn.onclick = () => showAdTrainModal(rerender);
  }
  return btn;
}

// ---------- 선수 기록 ----------
let recordReturn = "screen-main";
function openRecord(returnTo) {
  recordReturn = returnTo || "screen-main";
  renderRecord();
  show("screen-record");
}
function renderRecord() {
  const r = regionOf();
  const isBat = S.pos === "batter";
  let hs = "고교 대회 출전 기록이 아직 없어요";
  if (S.hsTotals) {
    hs = isBat
      ? `${S.games}경기 · ${S.hsTotals.ab}타수 ${S.hsTotals.hits}안타 (타율 ${(S.hsTotals.hits / Math.max(S.hsTotals.ab, 1)).toFixed(3)}) · ${S.hsTotals.hr}홈런 · ${S.hsTotals.sb}도루`
      : `${S.games}경기 · ${S.hsTotals.ip}이닝 · ${S.hsTotals.k}탈삼진 · 평균자책 ${((S.hsTotals.runs * 9) / Math.max(S.hsTotals.ip, 1)).toFixed(2)}`;
  }
  const trophyLine = S.trophies && S.trophies.length ? `🏆 ${S.trophies.join(", ")}` : "🏆 우승 경력 없음";
  // 진행 중인 프로 시즌 기록
  let curHtml = "";
  if (S.season) {
    const t = S.season.stats;
    const rank = S.season.others.filter((o) => o.w > S.season.teamW).length + 1;
    const line = isBat
      ? `${t.ab}타수 ${t.hits}안타 (타율 ${(t.hits / Math.max(t.ab, 1)).toFixed(3)}) · ${t.hr}홈런 · ${t.sb}도루`
      : `${t.g}등판 ${t.ip}이닝 · ${t.k}탈삼진 · 평균자책 ${((t.er * 9) / Math.max(t.ip, 1)).toFixed(2)}${t.wins ? ` · ${t.wins}승` : ""}${t.saves ? ` · ${t.saves}세이브` : ""}`;
    curHtml = `<br/><b>🔥 진행 중인 시즌</b><br/>G ${S.season.game}/${S.season.total} · ${S.team} ${S.season.teamW}승 ${S.season.teamL}패 (${rank}위)<br/>${line}<br/>`;
  }
  let proHtml = "";
  if (S.career && S.career.seasons.length) {
    // 수상은 이름까지 — "몇 년차에 뭘 탔는지"가 연도별 기록의 핵심이라 🎖️만으론 부족해요
    const AWARD_TAG = { MVP: "MVP", 골든글러브: "GG", 신인왕: "신인왕" };
    const rows = S.career.seasons.map((x, i) => {
      const badges =
        (x.champ ? `<span class="sn-tag champ">🏆우승</span>` : "") +
        (x.awards || []).map((a) => `<span class="sn-tag award">🎖️${AWARD_TAG[a] || a}</span>`).join("");
      const team = teamOfSeason(x);
      const moved = i > 0 && team !== teamOfSeason(S.career.seasons[i - 1]);
      return `<tr>
        <td class="sn-y">${x.y}년차${x.age ? `<span class="sn-age">${x.age}세</span>` : ""}</td>
        <td class="sn-team${moved ? " moved" : ""}" title="${team}">${shortTeam(team)}<span class="sn-role">${x.role ? x.role.replace(" 투수", "").replace(" 타자", "") : "-"}</span></td>
        <td class="sn-line">${x.line}${badges ? `<span class="sn-tags">${badges}</span>` : ""}</td>
        <td class="sn-war">${x.war.toFixed(1)}</td>
      </tr>`;
    }).join("");
    proHtml = `
      <table class="season-table season-career"><thead><tr><th>시즌</th><th>소속</th><th>성적</th><th>WAR</th></tr></thead><tbody>${rows}</tbody></table>
      <div>통산 ${S.career.seasons.length}시즌 · WAR ${S.career.warSum.toFixed(1)} · 🏆 ${S.career.rings} · MVP ${S.career.mvp} · GG ${S.career.gg}${S.career.roy ? " · 신인왕" : ""}</div>`;
  }
  const defs = STAT_DEFS[S.pos];
  const gearList = defs
    .map((d) => {
      const owned = GEAR_TIERS.filter((t) => S.gear && S.gear[`${d.key}-${t.n}`]).length;
      return owned ? `${d.emoji}${"★".repeat(owned)}` : null;
    })
    .filter(Boolean)
    .join(" ");
  $("record-card").innerHTML = `
    <div class="draft-emoji">⚾</div>
    <div class="draft-title">${S.name}</div>
    <div class="draft-team">${S.phase === "pro" ? `${S.team} · ${S.role || ""}` : `${r.school} · ${isBat ? "타자" : "투수"}`} · ${S.phase === "pro" ? `${S.age}세` : `${S.year}학년`}</div>
    <div class="draft-summary">
      <b>🏫 고교 기록</b><br/>${hs}<br/>🔭 주목도 ${Math.round(S.scout)} · ${trophyLine}<br/>
      ${curHtml}
      ${proHtml ? `<br/><b>⚾ 연도별 통산 기록</b>${proHtml}<br/>` : ""}
      ${gearList ? `<br/><b>🛍️ 보유 장비</b> ${gearList}` : ""}
    </div>`;
}
$("btn-record-main")?.addEventListener("click", () => openRecord("screen-main"));
$("btn-record-pro")?.addEventListener("click", () => openRecord("screen-pro"));
$("btn-record-back")?.addEventListener("click", () => show(recordReturn));

// ---------- 장비 상점 ----------
const GEAR_TIERS = [
  { n: "I", bonus: 3, price: 300 },
  { n: "II", bonus: 5, price: 900 },
  { n: "III", bonus: 8, price: 2500 },
  { n: "IV", bonus: 12, price: 7000 },
  { n: "V", bonus: 16, price: 16000 },
];
/* 🩹 컨디션 회복 — 휴식은 턴을 쓰지만 이건 돈으로 대신해요.
   싸게 두면 컨디션 관리가 의미를 잃어서, 프로 한 시즌 수입으로 십수 개 정도만
   살 수 있게 잡았어요. */
const RECOVERY = [
  { emoji: "🥤", name: "이온음료", heal: 25, price: 300 },
  { emoji: "💊", name: "피로회복제", heal: 50, price: 800 },
  { emoji: "💉", name: "영양주사", heal: 100, price: 2000 },
];
let shopReturn = "screen-main";
function openShop(returnTo) {
  shopReturn = returnTo || "screen-main";
  renderShop();
  show("screen-shop");
}
function statDefs() { return Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos]; }
function renderShop() {
  $("shop-money").textContent = `💰 보유 자금 ${fmtMoney(S.money || 0)}`;
  const box = $("shop-list");
  box.innerHTML = "";
  for (const d of statDefs()) {
    const ownedCnt = GEAR_TIERS.filter((t) => S.gear[`${d.key}-${t.n}`]).length;
    const tier = GEAR_TIERS[ownedCnt];
    const div = document.createElement("div");
    div.className = "shop-item" + (tier ? "" : " owned");
    if (tier) {
      div.innerHTML = `
        <span class="si-emoji">${d.emoji}</span>
        <div class="si-info"><div class="si-name">${d.name} 장비 ${tier.n}</div>${d.name} +${tier.bonus} · ${fmtMoney(tier.price)}</div>
        <button class="mini-btn">구매</button>`;
      div.querySelector(".mini-btn").onclick = () => {
        if ((S.money || 0) < tier.price) {
          alert("자금이 부족해요! 수당이나 광고 보상으로 모아봐요 💰");
          return;
        }
        S.money -= tier.price;
        S.gear[`${d.key}-${tier.n}`] = true;
        S.stats[d.key] = clamp(S.stats[d.key] + tier.bonus, 0, statCap(d.key));
        save();
        renderShop();
      };
    } else {
      div.innerHTML = `<span class="si-emoji">${d.emoji}</span><div class="si-info"><div class="si-name">${d.name} 장비 완비!</div>모든 티어 보유 중 ✨</div>`;
    }
    box.appendChild(div);
  }
  // 🩹 컨디션 회복 — 가득이면 한 줄 안내만 보여줘요
  if ((S.condition || 0) >= 100) {
    const d = document.createElement("div");
    d.className = "shop-item owned";
    d.innerHTML = `<span class="si-emoji">🩹</span><div class="si-info"><div class="si-name">컨디션이 가득해요!</div>회복 아이템은 지쳤을 때 다시 들러주세요 ✨</div>`;
    box.appendChild(d);
  } else {
    for (const it of RECOVERY) {
      const d = document.createElement("div");
      d.className = "shop-item";
      const label = it.heal >= 100 ? "컨디션 완전 회복" : `컨디션 +${it.heal}`;
      d.innerHTML = `
        <span class="si-emoji">${it.emoji}</span>
        <div class="si-info"><div class="si-name">${it.name}</div>${label} · ${fmtMoney(it.price)}</div>
        <button class="mini-btn">구매</button>`;
      d.querySelector(".mini-btn").onclick = () => {
        if ((S.money || 0) < it.price) {
          alert("자금이 부족해요! 수당이나 광고 보상으로 모아봐요 💰");
          return;
        }
        S.money -= it.price;
        const before = Math.round(S.condition);
        S.condition = clamp(S.condition + it.heal, 0, 100);
        save();
        renderShop();
        alert(`${it.emoji} ${it.name} 사용!\n\n컨디션 ${before} → ${Math.round(S.condition)}`);
      };
      box.appendChild(d);
    }
  }

  // 🎁 보너스 보상 (30분 쿨다운) — 팝업으로 진행
  const left = adCooldownLeft();
  const adRow = $("ad-row");
  if (left > 0) {
    adRow.innerHTML = `<p class="av-note">🎁 다음 보너스까지 약 ${Math.ceil(left / 60000)}분 남았어요</p>`;
  } else {
    adRow.innerHTML = `<button class="btn btn-primary" id="btn-ad">🎁 30분 보너스 +200만 받기</button>`;
    $("btn-ad").onclick = () => showAdModal(200, renderShop);
  }
}
$("btn-shop-main")?.addEventListener("click", () => openShop("screen-main"));
$("btn-shop-pro")?.addEventListener("click", () => openShop("screen-pro"));
$("btn-shop-back")?.addEventListener("click", () => {
  show(shopReturn);
  if (shopReturn === "screen-main") renderMain();
  else {
    const c = window.Career || window.IdolCareer;
    if (c && c.refreshPro) c.refreshPro();
  }
});

// ---------- 시작 흐름 ----------
let chosenRegion = null;
let chosenPos = null;

function initTitle() {
  if (Object.keys(loadSlots()).length) {
    $("btn-continue").classList.remove("hidden");
    $("btn-continue").onclick = showSlotPicker;
  }
  $("btn-new").onclick = () => {
    renderRegions();
    show("screen-region");
  };
  // 지금까지 등록된 선수 수
  if (window.Match && Match.enabled()) {
    Match.count("rookie").then((n) => {
      if (n) {
        $("title-count").innerHTML = `⚾ 지금까지 <b>${n.toLocaleString()}명</b>의 신인이 그라운드를 밟았어요!`;
        $("title-count").classList.remove("hidden");
      }
    });
  }
}

function resumeSlot(id) {
  const sl = loadSlots();
  if (!sl[id]) return;
  curSlot = id;
  S = sl[id];
  S.money = S.money || 0;
  S.gear = S.gear || {};
  S.trans = S.trans || {};
  if (S.phase === "pro" && window.Career) {
    window.Career.showPro();
  } else {
    renderMain();
    show("screen-main");
  }
}

function slotDesc(st) {
  const posName = st.pos === "batter" ? "타자" : "투수";
  if (st.phase === "pro") return `⚾ ${st.team} · ${st.role || posName} · ${st.proYear || 1}년차`;
  const r = REGIONS.find((x) => x.id === st.region);
  return `🏫 ${r ? r.school : ""} ${st.year}학년 · ${posName}`;
}

// 이어하기 — 어떤 선수로 계속할지 선택
function showSlotPicker() {
  const sl = loadSlots();
  const ids = Object.keys(sl).sort((a, b) => (sl[b].savedAt || 0) - (sl[a].savedAt || 0));
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal slot-modal">
      <p class="av-title">👥 어떤 선수로 이어할까요?</p>
      <div class="slot-list">${ids.map((id) => {
        const st = sl[id];
        const d = st.savedAt ? new Date(st.savedAt) : null;
        return `
          <div class="slot-row">
            <button type="button" class="slot-go" data-id="${id}">
              <span class="slot-avatar slot-emoji">⚾</span>
              <span class="slot-info">
                <b>${st.name}</b>
                <span>${slotDesc(st)}</span>
                ${d ? `<span class="slot-date">${d.getMonth() + 1}/${d.getDate()} 저장</span>` : ""}
              </span>
            </button>
            <button type="button" class="slot-del" data-id="${id}" aria-label="삭제">🗑️</button>
          </div>`;
      }).join("")}</div>
      <div class="av-actions"><button type="button" class="btn btn-ghost slot-close">닫기</button></div>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector(".slot-close").onclick = () => ov.remove();
  ov.querySelectorAll(".slot-go").forEach((b) => {
    b.onclick = () => { ov.remove(); resumeSlot(b.dataset.id); };
  });
  ov.querySelectorAll(".slot-del").forEach((b) => {
    b.onclick = () => {
      const st = sl[b.dataset.id];
      if (!confirm(`${st ? st.name : "이 선수"}의 저장을 삭제할까요? 되돌릴 수 없어요!`)) return;
      const cur = loadSlots();
      delete cur[b.dataset.id];
      saveSlots(cur);
      ov.remove();
      if (Object.keys(cur).length) showSlotPicker();
      else $("btn-continue").classList.add("hidden");
    };
  });
}

function renderRegions() {
  const box = $("region-list");
  box.innerHTML = "";
  const starBar = (v, vals) => { const lo = Math.min(...vals), hi = Math.max(...vals); const n = hi === lo ? 3 : Math.min(5, Math.max(1, 1 + Math.round(((v - lo) / (hi - lo)) * 4))); return "★".repeat(n) + "☆".repeat(5 - n); };
  const WVALS = REGIONS.map((x) => x.win), GVALS = REGIONS.map((x) => x.growth);
  for (const r of REGIONS) {
    const btn = document.createElement("button");
    btn.className = "card";
    btn.innerHTML = `
      <span class="card-emoji">${r.emoji}</span>
      <span class="card-title">${r.name}</span>
      <span class="card-sub">${r.school} · ${r.teams.join(" / ")}</span>
      <span class="card-desc">${r.desc}</span>
      <span class="card-tags">
        <span class="tag">팀 전력 ${starBar(r.win, WVALS)}</span>
        <span class="tag">성장 ${starBar(r.growth, GVALS)}</span>
      </span>`;
    btn.onclick = () => {
      chosenRegion = r;
      $("position-hint").textContent = `${r.school}에 입학했어요! 어떤 선수가 될까요?`;
      show("screen-position");
    };
    box.appendChild(btn);
  }
}

document.querySelectorAll("#position-list .card").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenPos = btn.dataset.pos;
    $("name-hint").textContent = `${chosenRegion.school} ${chosenPos === "batter" ? "타자" : "투수"} 유망주의 이름은?`;
    $("input-name").value = pick(SURNAMES) + pick(GIVEN);
    pendingRoll = rollStats(chosenPos);
    show("screen-name");
    renderRoll();
  });
});

$("btn-random-name").addEventListener("click", () => {
  $("input-name").value = pick(SURNAMES) + pick(GIVEN);
});

$("btn-start").addEventListener("click", () => {
  const name = $("input-name").value.trim() || pick(SURNAMES) + pick(GIVEN);
  curSlot = null; // 새 선수는 새 슬롯에 — 기존 선수 저장은 그대로 남아요
  if (window.Stats) Stats.log("new_player", { pos: chosenPos, region: chosenRegion.name });
  if (window.Match) Match.register("rookie", name);
  S = newState(chosenRegion, chosenPos, name, pendingRoll);
  addLog(`⚾ ${chosenRegion.school} 입학! ${name}의 야구 인생이 시작됐어요.`);
  save();
  renderMain();
  show("screen-main");
});

// ---------- 메인 렌더 ----------
function renderMain() {
  const r = regionOf();
  $("hud-name").textContent = `${S.name} (${S.pos === "batter" ? "타자" : "투수"})`;
  $("hud-school").textContent = `${r.emoji} ${r.school} · 종합 ${Math.round(overall())}`;
  $("hud-turn").textContent = `${S.year}학년 ${S.month}월`;

  $("hud-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
  $("cond-num").textContent = Math.round(S.condition);
  const condBar = $("cond-bar");
  condBar.style.width = `${S.condition}%`;
  condBar.classList.toggle("low", S.condition < 35);

  const scoutPct = clamp((S.scout / 450) * 100, 0, 100);
  $("scout-num").textContent = Math.round(S.scout);
  $("scout-bar").style.width = `${scoutPct}%`;

  // 스탯
  const statsBox = $("stats-box");
  statsBox.innerHTML = "";
  for (const d of STAT_DEFS[S.pos]) {
    const v = Math.round(S.stats[d.key]);
    const tv = S.talents[d.key], tl = transLv(d.key);
    const stars = "⭐".repeat(talentStars(tv)) + (isTalentMax(tv) ? (tl ? ` <span class="tr">✨${tl}</span>` : " MAX") : "");
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-name">${d.emoji} ${d.name}</span>
      <div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>
      <span class="stat-val${v >= statCap(d.key) ? " max" : ""}" title="상한 ${statCap(d.key)}">${v}</span>
      <span class="stat-pot" title="잠재력 — 별이 많을수록 훈련 효율이 높아요">${stars}</span>`;
    if (v >= 100) {
      const aw = document.createElement("button");
      aw.className = "mini-btn awaken-btn" + (v >= statCap(d.key) ? " ready" : "");
      aw.textContent = isTalentMax(tv) ? "🌠 초월" : "🔮 각성";
      aw.onclick = () => { if (awakenTalent(d.key, addLog)) renderMain(); };
      row.appendChild(aw);
    }
    statsBox.appendChild(row);
  }

  // 행동 버튼
  const actBox = $("action-list");
  actBox.innerHTML = "";
  for (const d of STAT_DEFS[S.pos]) {
    const btn = document.createElement("button");
    // 상한에 닿았으면 훈련 대신 각성에 도전해요 (턴 낭비 방지)
    if (atCap(d.key)) {
      const tmax = isTalentMax(S.talents[d.key]);
      const pct = Math.round((tmax ? transP(transLv(d.key)) : awakenP(Math.round(S.stats[d.key]))) * 100);
      btn.dataset.key = d.key;
      btn.className = "action-btn awaken-act";
      btn.innerHTML = `<span class="a-emoji">${tmax ? "🌠" : "🔮"}</span>${d.name} ${tmax ? "초월 각성" : "재능 각성"}<span class="a-sub">상한 ${statCap(d.key)} 도달 · 성공률 ${pct}%</span>`;
      btn.onclick = () => { if (awakenTalent(d.key, addLog)) renderMain(); };
    } else {
      btn.dataset.key = d.key;
      btn.className = "action-btn";
      btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
      btn.onclick = () => doTraining(d);
    }
    actBox.appendChild(btn);
  }
  actBox.appendChild(makeAdSlotButton(renderMain));
  const rest = document.createElement("button");
  rest.className = "action-btn rest";
  rest.dataset.key = "__rest";
  rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 대폭 회복</span>`;
  rest.onclick = doRest;
  actBox.appendChild(rest);

  // 대회 기간 — 훈련 잠그고 출전 버튼만 활성화
  if (S.pendingTour) {
    actBox.querySelectorAll(".action-btn").forEach((b) => (b.disabled = true));
    const go = document.createElement("button");
    go.className = "action-btn rest go-game";
    go.innerHTML = `<span class="a-emoji">🏆</span>${S.pendingTour} 출전!<span class="a-sub">전국대회가 시작돼요</span>`;
    go.onclick = () => {
      const t = S.pendingTour;
      S.pendingTour = null;
      save();
      renderMain(); // 숨겨진 화면에 출전 버튼이 남지 않게 정리
      startTournament(t);
    };
    actBox.appendChild(go);
    $("hud-turn").textContent = `${S.year}학년 ${S.month}월 · 🏆 대회 기간`;
  }

  renderLog();
}

function addLog(msg) {
  S.log.unshift(`[${S.year}학년 ${S.month}월] ${msg}`);
  S.log = S.log.slice(0, 40);
}

function renderLog() {
  const box = $("log-box");
  box.innerHTML = S.log
    .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
    .join("");
}

// ---------- 행동 ----------
// 버튼을 누르면 화면이 통째로 다시 그려져서 눌린 흔적이 남지 않아요.
// 그래서 결과(증감치)를 버튼 위에 띄워 눌린 걸 분명히 보여줍니다.
// 화면이 바뀌었으면(대회·시즌 등) Fx.tap이 알아서 넘어가요.
// 한 번의 행동에 화면이 여러 번 다시 그려져요
// (endMonth → renderMain → advanceMonth → renderMain). 바로 붙이면 다음 렌더가
// 지워버리니, 이번 턴 렌더가 전부 끝난 뒤(다음 태스크)에 붙입니다.
// 그 사이 다른 화면으로 넘어갔으면 버튼이 없어서 Fx.tap이 조용히 넘어가요.
function actFx(key, text, bad) {
  setTimeout(() => {
    if (!window.Fx) return;
    // 같은 key의 버튼이 육성 화면과 프로 화면 양쪽에 있어요.
    // 지금 보이는 화면에서 먼저 찾아야 숨은 버튼에 붙지 않아요.
    const sel = `.action-btn[data-key="${key}"]`;
    const el = document.querySelector(`.screen.active ${sel}`) || document.querySelector(sel);
    Fx.tap(el, text, bad ? "bad" : "good");
  }, 0);
}
function doTraining(def) {
  // 상한에 닿았으면 훈련은 턴만 소모돼요 — 각성으로 돌려줍니다
  if (atCap(def.key)) { if (awakenTalent(def.key, addLog)) renderMain(); return; }
  const r = regionOf();

  // 컨디션이 바닥일 때 무리하면 부상
  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🤕 지친 몸으로 무리하다 ${def.name} 훈련 중 부상! 한 달을 재활로 날렸어요.`);
    actFx(def.key, "🤕 부상", true);
    endMonth();
    return;
  }

  // 훈련 실패 — 컨디션이 낮을수록 위험해요
  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 훈련이 완전히 꼬였어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
    actFx(def.key, "-" + loss.toFixed(1), true);
    maybeEvent();
    endMonth();
    return;
  }

  const condMod = S.condition >= 70 ? 1.15 : S.condition >= 40 ? 1.0 : 0.6;
  const buffMod = S.buff ? 1.5 : 1.0;
  S.buff = false;
  let gain = rand(2.2, 4.2) * S.talents[def.key] * r.growth * condMod * buffMod;
  if (S.stats[def.key] >= 100) gain *= 0.5; // 💥 한계 돌파 구간
  gain = Math.round(gain * 10) / 10;
  S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, statCap(def.key));
  S.condition = clamp(S.condition - randInt(12, 18), 0, 100);
  addLog(`${def.emoji} ${def.name} 훈련 완료! +${gain.toFixed(1)} (${Math.round(S.stats[def.key])})`);
  actFx(def.key, "+" + gain.toFixed(1));

  maybeEvent();
  endMonth();
}

function doRest() {
  const condBefore = S.condition;
  S.condition = clamp(S.condition + randInt(30, 42), 0, 100);
  S.stats.stamina = clamp(S.stats.stamina + 0.5, 0, statCap("stamina"));
  addLog(`🛌 푹 쉬었어요. 컨디션 회복! (${Math.round(S.condition)})`);
  actFx("__rest", "컨디션 +" + Math.round(S.condition - condBefore));
  maybeEvent();
  endMonth();
}

function maybeEvent() {
  if (Math.random() > 0.3) return;
  const r = regionOf();
  const events = [
    () => {
      const d = pick(STAT_DEFS[S.pos]);
      S.stats[d.key] = clamp(S.stats[d.key] + 3, 0, statCap(d.key));
      addLog(`🧢 감독님의 특별 지도! ${d.name} +3`);
    },
    () => {
      const pts = Math.round(8 * r.spot);
      S.scout += pts;
      addLog(`📸 프로 스카우트가 연습 경기를 지켜봤어요! 주목도 +${pts}`);
    },
    () => {
      S.condition = clamp(S.condition - 20, 0, 100);
      addLog(`🤒 감기 몸살로 며칠 고생했어요. 컨디션 -20`);
    },
    () => {
      S.condition = clamp(S.condition + 12, 0, 100);
      addLog(`🍜 급식에 특식이 나왔어요! 컨디션 +12`);
    },
    () => {
      S.buff = true;
      addLog(`🔥 라이벌의 도발에 불이 붙었어요! 다음 훈련 효율 1.5배`);
    },
    () => {
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, statCap("stamina"));
      addLog(`🏃 아침 러닝 습관이 몸에 붙었어요. 체력 +2`);
    },
    () => {
      S.scout = Math.max(0, S.scout - 10);
      addLog(`📉 슬럼프라는 소문이 돌아요… 스카우트 주목도 -10`);
    },
  ];
  pick(events)();
}

// ---------- 월 진행 ----------
function endMonth() {
  save();
  renderMain();

  // 대회 달이면 출전 버튼을 띄우고 대기 (자동 시작 X)
  const tname = TOURNAMENTS[S.month];
  if (tname) {
    S.pendingTour = tname;
    save();
    renderMain();
    return;
  }
  advanceMonth();
}

function advanceMonth() {
  // 3학년 9월 = 드래프트
  if (S.year === 3 && S.month === 9) {
    showDraft();
    return;
  }
  S.month += 1;
  if (S.month === 13) S.month = 1;
  if (S.month === 3 && S.year < 3) S.year += 1;
  // 학년은 3월에 올라감 (1·2월은 겨울 훈련)
  save();
  renderMain();
}

// ---------- 대회 ----------
function startTournament(name) {
  tour = { name, round: 0, alive: true, totalPts: 0, results: [] };
  $("tour-title").textContent = `🏆 ${name} 전국고교야구대회`;
  $("tour-round").textContent = "";
  $("tour-card").innerHTML = `
    <div class="tour-vs">⚾ ${regionOf().school}, ${name} 출전!</div>
    <div class="tour-line">전국의 강호들과 겨룰 시간이에요.<br/>좋은 활약을 보이면 스카우트 주목도가 크게 올라요.</div>`;
  $("btn-tour-next").textContent = "1차전 시작";
  $("btn-tour-next").onclick = playTourGame;
  show("screen-tournament");
}

function playTourGame() {
  const r = regionOf();
  const roundName = ROUNDS[tour.round];
  const opp = pick(OPPONENTS);

  const p = clamp(
    r.win + (overall() - 50) / 130 + (S.condition - 50) / 700 - tour.round * 0.06,
    0.15, 0.92
  );
  const perf = S.pos === "batter" ? batterLine() : pitcherLine();
  /* 9회 위기를 유저가 직접 막는 연출은 '그 이닝까지 내가 던지고 있을 때'만 성립해요.
   * 예전에는 스태미나가 모자라 5회에 내려간 투수도 9회에 다시 불러올렸는데,
   * 야구 규칙상 교체된 투수는 그 경기에 다시 못 올라옵니다.
   * 이제 8회까지 끌고 간 투수만 9회를 마무리해 완투로 이어져요.
   * 스태미나가 부족하면 중간에 내려가고, 대신 경기 중 랜덤 미니게임으로 참여합니다. */
  const canFinish = S.pos === "batter" || perf.ip >= 8;
  const interactive = canFinish && Math.random() < 0.55;
  const preWin = interactive ? null : Math.random() < p;
  const story = S.pos === "batter"
    ? batterStory(preWin, perf, interactive)
    : pitcherStory(preWin, perf, interactive);

  renderGameSim({
    title: `${roundName} vs ${opp}`,
    oppName: opp,
    homeName: r.school,
    perf, story, interactive, preWin,
    onFinish: (win, bonus) => {
      S.games += 1;
      let pts = perf.pts + (win ? 4 : 1) + tour.round * 3 + (bonus || 0);
      pts = Math.round(pts * r.spot);
      S.scout = Math.max(0, S.scout + pts);
      if (!S.hsTotals) S.hsTotals = S.pos === "batter" ? { ab: 0, hits: 0, hr: 0, sb: 0 } : { ip: 0, k: 0, runs: 0 };
      if (S.pos === "batter") {
        S.hsTotals.ab += perf.ab; S.hsTotals.hits += perf.hits; S.hsTotals.hr += perf.hr; S.hsTotals.sb += perf.sb;
      } else {
        S.hsTotals.ip += perf.ip; S.hsTotals.k += perf.k; S.hsTotals.runs += perf.runs;
      }
      // 고교 3년 총수입이 장비 최하 등급에도 못 미치던 걸 올렸어요 (플레이어 피드백)
      const pay = win ? 120 + tour.round * 50 : 50;
      S.money = (S.money || 0) + pay;
      tour.totalPts += pts;
      S.condition = clamp(S.condition - 6, 0, 100);
      save();
      const extra = `<div class="tour-pts">${pts >= 0 ? `🔭 스카우트 주목도 +${pts}` : `📉 스카우트 주목도 ${pts}`} · 💰 수당 +${pay}만</div>`;
      if (win && tour.round < ROUNDS.length - 1) {
        tour.round += 1;
        return { extra, nextLabel: `${ROUNDS[tour.round]} 진출!`, nextFn: playTourGame };
      }
      tour.alive = false;
      const champion = win && tour.round === ROUNDS.length - 1;
      if (champion) {
        S.trophies.push(`${S.year}학년 ${tour.name} 우승`);
        S.scout += 30;
        S.money = (S.money || 0) + 600;
        tour.totalPts += 30;
      }
      return { extra, nextLabel: champion ? "🏆 우승 세리머니!" : "대회 마치기", nextFn: () => finishTournament(champion, roundName) };
    },
  });
}

// ---------- 경기 시뮬레이션 연출 ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function addRuns(inn, n, lo = 0, hi = 8) {
  for (let i = 0; i < n; i++) inn[randInt(lo, hi)]++;
}

const HR_TXT = [
  "담장을 훌쩍 넘기는 큼지막한 홈런! 💥",
  "받아치는 순간 확신하는 타구! 홈런! 💥",
  "좌측 폴대를 살짝 스치는 극적인 홈런! 💥",
];
const HIT_TXT = [
  "좌중간을 가르는 안타! 🏏",
  "유격수 키를 넘기는 안타! 🏏",
  "우전 적시타! 🏏",
  "총알 같은 2루타! ⚡",
];
const OUT_TXT = [
  "아쉬운 헛스윙 삼진 😔",
  "잘 맞았지만 중견수 정면 뜬공",
  "유격수 땅볼로 물러납니다",
  "파울 접전 끝에 범타 처리",
];

// 타자: 개인 성적을 이닝에 배치. interactive면 마지막 타석은 미니게임 몫으로 남겨둠
function batterStory(win, perf, interactive) {
  const ourInn = Array(9).fill(0), oppInn = Array(9).fill(0), contrib = Array(9).fill(0);
  const events = [];
  const outcomes = shuffle([
    ...Array(perf.hr).fill("hr"),
    ...Array(perf.hits - perf.hr).fill("hit"),
    ...Array(perf.ab - perf.hits).fill("out"),
  ]);
  if (interactive) outcomes.pop(); // 마지막 타석은 유저가 직접
  const abInnsAll = [[], [3], [2, 5], [1, 4, 7], [1, 3, 6, 8], [1, 3, 5, 7, 8]];
  const abInns = abInnsAll[outcomes.length] || [1, 3, 6, 8];
  let sbLeft = perf.sb;
  outcomes.forEach((o, i) => {
    const inn = abInns[i];
    if (o === "hr") {
      const runs = randInt(1, 2);
      ourInn[inn - 1] += runs;
      contrib[inn - 1] += runs;
      events.push({ inn, half: "말", text: `${S.name}, ${pick(HR_TXT)}`, cls: "good" });
    } else if (o === "hit") {
      events.push({ inn, half: "말", text: `${S.name}, ${pick(HIT_TXT)}`, cls: "good" });
      if (sbLeft > 0) {
        sbLeft--;
        events.push({ inn, half: "말", text: "이어서 과감한 도루 성공! 👟", cls: "good" });
      }
    } else {
      events.push({ inn, half: "말", text: `${S.name}, ${pick(OUT_TXT)}`, cls: "" });
    }
  });
  perf.baseHits = outcomes.filter((o) => o !== "out").length;
  perf.baseHr = outcomes.filter((o) => o === "hr").length;
  const hrTotal = ourInn.reduce((a, b) => a + b, 0);

  if (interactive) {
    // 9회말 시작 시점에 정확히 1점 뒤진 접전으로 구성
    const ourTotal8 = Math.max(hrTotal, randInt(1, 4));
    addRuns(ourInn, ourTotal8 - hrTotal, 0, 7);
    addRuns(oppInn, ourTotal8 + 1, 0, 8);
    for (let i = 0; i < 9; i++) {
      if (oppInn[i] > 0) events.push({ inn: i + 1, half: "초", text: `상대가 ${oppInn[i]}점을 냈어요 😬`, cls: "bad" });
      if (i < 8) {
        const extra = ourInn[i] - contrib[i];
        if (extra > 0) events.push({ inn: i + 1, half: "말", text: `우리 타선이 ${extra}점을 뽑아냅니다! 🔥`, cls: "good" });
      }
    }
    return { ourInn, oppInn, events, moment: { half: "말" } };
  }

  const targetOur = win
    ? randInt(Math.max(3, hrTotal + 1), Math.max(6, hrTotal + 3))
    : hrTotal + randInt(0, 2);
  const targetOpp = win ? randInt(0, targetOur - 1) : targetOur + randInt(1, 3);
  addRuns(ourInn, targetOur - hrTotal);
  addRuns(oppInn, targetOpp);
  for (let i = 0; i < 9; i++) {
    if (oppInn[i] > 0) events.push({ inn: i + 1, half: "초", text: `상대가 ${oppInn[i]}점을 냈어요 😬`, cls: "bad" });
    const extra = ourInn[i] - contrib[i];
    if (extra > 0) events.push({ inn: i + 1, half: "말", text: `우리 타선이 ${extra}점을 뽑아냅니다! 🔥`, cls: "good" });
  }
  return { ourInn, oppInn, events };
}

// 투수: 내가 던진 이닝에 탈삼진/실점 배치. interactive면 9회초 위기를 유저가 막음
function pitcherStory(win, perf, interactive) {
  const ourInn = Array(9).fill(0), oppInn = Array(9).fill(0);
  const events = [];
  const ip = interactive ? Math.min(perf.ip, 8) : perf.ip;
  const myRuns = Array(ip).fill(0), myKs = Array(ip).fill(0);
  for (let i = 0; i < perf.runs; i++) myRuns[randInt(0, ip - 1)]++;
  for (let i = 0; i < perf.k; i++) myKs[randInt(0, ip - 1)]++;
  for (let i = 0; i < ip; i++) {
    oppInn[i] += myRuns[i];
    if (myRuns[i] > 0) events.push({ inn: i + 1, half: "초", text: `${S.name}, ${myRuns[i]}실점… 흔들립니다 😬`, cls: "bad" });
    else if (myKs[i] >= 2) events.push({ inn: i + 1, half: "초", text: `${S.name}, 탈삼진 ${myKs[i]}개 포함 무실점! 🔥`, cls: "good" });
    else if (Math.random() < 0.35) events.push({ inn: i + 1, half: "초", text: `${S.name}, 삼자범퇴 처리 🧊`, cls: "good" });
  }

  if (interactive) {
    // 선발이 일찍 내려갔다면 불펜이 맡은 이닝에도 실점이 생겨요.
    // 이걸 빼먹으면 6~8회가 늘 0으로 찍혀서, 5회 강판인데도 상대가 9이닝 무득점인
    // '완봉 스코어보드'가 나왔어요.
    if (ip < 8) {
      const bullpen = randInt(0, 1);
      for (let i = 0; i < bullpen; i++) oppInn[randInt(ip, 7)]++;
      for (let i = ip; i < 8; i++) {
        if (oppInn[i] > 0) events.push({ inn: i + 1, half: "초", text: `불펜이 ${oppInn[i]}점을 내줬어요 💦`, cls: "bad" });
      }
    }
    // 9회초 시작 시점에 1점 앞선 리드, 마지막 위기를 유저가 직접 막음
    const oppTotal8 = oppInn.slice(0, 8).reduce((a, b) => a + b, 0);
    addRuns(ourInn, oppTotal8 + 1, 0, 7);
    for (let i = 0; i < 8; i++) {
      if (ourInn[i] > 0) events.push({ inn: i + 1, half: "말", text: `우리 타선이 ${ourInn[i]}점 지원! 🔥`, cls: "good" });
    }
    return { ourInn, oppInn, events, moment: { half: "초" } };
  }

  if (perf.ip < 9) {
    events.push({ inn: perf.ip, half: "초", text: `${perf.ip}이닝을 끝으로 마운드를 내려옵니다 👏`, cls: "" });
    const bullpen = win ? randInt(0, 1) : randInt(1, 2);
    for (let i = 0; i < bullpen; i++) oppInn[randInt(perf.ip, 8)]++;
    for (let i = perf.ip; i < 9; i++) {
      if (oppInn[i] > 0) events.push({ inn: i + 1, half: "초", text: `불펜이 ${oppInn[i]}점을 내줬어요 💦`, cls: "bad" });
    }
  }
  let oppTotal = oppInn.reduce((a, b) => a + b, 0);
  if (!win && oppTotal === 0) {
    oppInn[8]++;
    oppTotal++;
    events.push({ inn: 9, half: "초", text: "9회초 통한의 결승점을 내줬어요 💧", cls: "bad" });
  }
  const targetOur = win ? oppTotal + randInt(1, 4) : Math.max(0, oppTotal - randInt(1, 3));
  addRuns(ourInn, targetOur);
  for (let i = 0; i < 9; i++) {
    if (ourInn[i] > 0) events.push({ inn: i + 1, half: "말", text: `우리 타선이 ${ourInn[i]}점 지원! 🔥`, cls: "good" });
  }
  return { ourInn, oppInn, events };
}

// 미니게임 종류 — 랜덤으로 등장하고, 성공 존은 관련 스탯+컨디션에 비례
const MINI_BAT = [
  { label: "⚾ 공이 온다! 초록 존에서 스윙!", button: "스윙! 🏏", stat: "contact", ok: "통렬한 적시타! 🏏", great: "담장 직격 2타점! 💥", bad: "헛스윙… 기회를 놓쳤어요" },
  { label: "👟 도루 찬스! 스타트 타이밍!", button: "달려! 👟", stat: "run", ok: "도루 성공, 득점으로 연결! 👟", great: "과감한 홈스틸!! ⚡", bad: "견제사… 아까운 주자" },
  { label: "🧤 큰 타구! 다이빙 캐치 타이밍!", button: "점프! 🧤", stat: "defense", ok: "슈퍼캐치로 실점 저지! 🧤", great: "호수비에 이은 더블플레이! 🌟", bad: "글러브를 스치고 빠졌어요…" },
];
const MINI_PIT = [
  { label: "🎯 결정구! 초록 존에서 릴리스!", button: "던진다! 🔥", stat: "control", ok: "루킹 삼진! 위기 탈출 🎯", great: "3구 삼진으로 이닝 종료!! 🧊", bad: "볼넷… 주자가 쌓여요" },
  { label: "🔥 전력투구! 릴리스 포인트!", button: "던진다! ⚡", stat: "velocity", ok: "최고 구속으로 윽박질렀어요! 🔥", great: "라이징 패스트볼에 헛스윙 삼진! ⚡", bad: "공이 몰렸다… 안타 허용" },
  { label: "🧤 강습 타구! 반사신경 타이밍!", button: "캐치! 🧤", stat: "defense", ok: "번개 같은 수비! 🧤", great: "1-2-3 더블플레이 완성! 🌟", bad: "다리 사이로 빠졌어요…" },
];
const miniZone = (stat) => clamp(13 + stat * 0.22 + (S.condition - 50) * 0.08, 10, 40);

// 🤖 미니게임 자동 진행 — 스탯 기반 확률로 즉시 판정
const autoMiniOn = () => localStorage.getItem("grow-auto-mini") === "1";
function autoRes(stat) {
  // 상한을 0.5 → 0.42로 내려 자동이 수동을 따라잡지 못하게 하고,
  // 기울기를 0.003 → 0.004로 올려 자동에서도 스탯이 더 드러나게 했어요.
  const pPerfect = clamp(0.10 + stat * 0.004 + (S.condition - 50) * 0.001, 0.08, 0.42);
  const pMiss = clamp(0.4 - stat * 0.002, 0.08, 0.4);
  const r = Math.random();
  return r < pPerfect ? "perfect" : r < pPerfect + pMiss ? "miss" : "good";
}
{
  const chk = $("auto-mini");
  if (chk) {
    chk.checked = autoMiniOn();
    chk.onchange = () => localStorage.setItem("grow-auto-mini", chk.checked ? "1" : "0");
  }
}

// 홀드/사인/반응/수싸움 결과 텍스트
const HOLD_BAT = { ok: "힘을 모은 풀스윙이 통했어요! 💪", great: "완벽하게 응축된 힘, 폭발적인 장타!! 💥", bad: "힘 조절 실패… 범타" };
const HOLD_PIT = { ok: "힘을 실은 강속구로 범타 처리! 🔥", great: "완벽한 밸런스에서 나온 광속구, 삼진!! ⚡", bad: "힘이 과했다… 제구가 날렸어요" };
const SEQ_BAT = { ok: "사인대로 노려친 안타! 📋", great: "벤치의 작전을 완벽 수행, 통타!! 💥", bad: "사인을 놓쳤다… 어이없는 헛스윙" };
const SEQ_PIT = { ok: "포수 리드대로 범타 유도! 📋", great: "볼배합 완벽 수행, 삼진!! 🧊", bad: "사인 미스… 한가운데 실투" };
const REACT_BAT = { ok: "빠른 스타트로 세이프! ⚡", great: "번개 같은 반응, 한 베이스 더!! 👟", bad: "반응이 늦었다… 아웃" };
const REACT_PIT = { ok: "강습 타구를 낚아챘어요! ⚡", great: "총알 타구를 다이빙 캐치!! 🧤", bad: "손을 스치고 빠졌다… 내야안타" };
const DUEL_BAT = { ok: "노림수 적중! 안타! 🧠", great: "완벽한 수읽기, 통타!! 💥", bad: "유인구에 속았다… 삼진" };
const DUEL_PIT = { ok: "타자의 노림수를 피했어요! 🧠", great: "허를 찌른 결정구, 삼진!! 🎯", bad: "딱 노리던 코스였다… 통타" };

/* ─────────────────────────────────────────────────────────────────────────
 * 🍂 가을야구 전용 미니게임 — 실행은 ../post-stage.js(window.PostStage)에 있어요.
 *
 * 가을야구는 야구의 절정인데 예전에는 5월의 평범한 경기와 판정이 똑같았어요.
 * 이제 **가을야구에서만** 아래 네 메커닉이 나와요. 정규시즌·고교 대회는
 * 예전 8종(timing.js) 그대로예요 — playRandomMini의 첫 줄에서만 갈라져요.
 *
 *   🎯 mind  — 수싸움. 상대와 **동시에** 세 코스 중 하나를 골라요. 같은 코스면
 *              타자가 이겨요. 날아오는 것도 시간 제한도 없어요 — 물음이 "언제"가
 *              아니라 "어디"예요. 상대의 버릇(기색)을 읽고, 내 패턴이 읽히지 않게
 *              해야 해요. 3구를 거쳐 결과가 쌓여요.
 *   🏃 dash  — 홈 승부. 정보가 늦게 오는데 기다리면 물러설 자리를 잃어요
 *   🥵 grind — 버티기. 체력이 바닥나기 전에 얼마나 밀어붙일지 정해요. 밀수록 다음
 *              한 칸이 더 들어요 — 체력을 넘겨 밀면 그 자리에서 지쳐 무너져요
 *   🔥 clash — 힘겨루기. 두 버튼을 **번갈아** 눌러 표식을 밀어내요. 순전히 힘이에요
 *
 * 왜 새로운지는 post-stage.js 머리말에 적어 뒀어요. 요약하면 기존 8종과 투어
 * 3종은 열한 개 모두 '언제 누르나'가 물음인데, 이 넷은 아니에요.
 * 앞의 둘은 판단력만 재서 힘으로 이기는 순간이 없었고, 뒤의 둘이 그 자리예요.
 *
 * 시리즈가 깊을수록 어려워져요(tier) — 와일드카드·준PO 0 / PO 1 / 마지막 시리즈 2.
 * 상대가 버릇을 덜 흘리고 어깨가 강해져요. 판정 규칙은 그대로예요.
 *
 * window.PostStage를 부를 때마다 찾아가요(변수에 캐시하지 않아요) — 테스트가
 * 기록용으로 갈아끼울 수 있어야 하니까요. window.Timing을 쓰던 방식과 같아요. */
const POST_TIER = { wc: 0, semi: 0, po: 1, ks: 2 };
/* 지금 내가 가을야구 경기를 치르는 중인가. career.js의 inPost()와 같은 뜻이지만
 * 여기서도 S만 보고 판단해요 — game.js는 career.js보다 먼저 실행돼요. */
const inPostMini = () => !!(S.post && S.post.myRound && !S.post.eliminated);
const postTier = () => (S.post && POST_TIER[S.post.myRound]) || 0;

// 🎯 수싸움 · 🏃 홈 승부 · 🥵 버티기 · 🔥 힘겨루기 결과 문구 (타자 / 투수)
const MIND_BAT = { ok: "한 번 읽어내 살아 나갔어요! 🎯", great: "코스를 완전히 읽어낸 통타!! 💥", bad: "끝까지 못 읽고 삼진…" };
const MIND_PIT = { ok: "수싸움에서 밀리지 않았어요! 🎯", great: "타자의 노림수를 세 번 다 피했어요!! ⚡", bad: "노림수에 걸려 통타를 맞았어요…" };
const DASH_BAT = { ok: "무리하지 않고 3루에 남았어요 🛑", great: "과감한 홈 쇄도, 헤드퍼스트 세이프!! 🏃💨", bad: "홈에서 아웃… 통한의 주루사" };
const DASH_PIT = { ok: "중계로 끊어 주자를 묶었어요 🛑", great: "완벽한 홈 백업, 홈에서 잡아냈어요!! 🎯", bad: "판단이 늦어 홈을 그대로 내줬어요…" };
const GRIND_BAT = { ok: "끈질기게 버텨 안타로 이었어요! 💪", great: "체력을 끝까지 짜내 담장을 넘겼어요!! 🚀", bad: "얼마 못 밀고 힘이 빠졌어요… 범타" };
const GRIND_PIT = { ok: "위기를 버텨 한 점만 내줬어요! 🫀", great: "남은 체력을 짜내 위기를 틀어막았어요!! 🔥", bad: "체력이 바닥나 와르르 무너졌어요…" };
const CLASH_BAT = { ok: "힘으로 밀어내 안타를 만들었어요! 💪", great: "완전히 눌러 버린 한 방!! 🚀", bad: "구위에 밀렸어요… 헛스윙" };
const CLASH_PIT = { ok: "구위로 버텨 범타로 막았어요! 🔥", great: "정면승부로 윽박질러 삼진!! ⚡", bad: "힘에서 밀려 그대로 맞았어요…" };

/* 같은 규칙을 타자와 투수가 정반대로 읽어요. 코드는 하나예요 — aim과 문구만 갈아끼워요.
 *   타자(aim: match) — 상대와 **같은 칸**을 고르면 이겨요. 투수의 버릇을 읽고,
 *                      같은 칸만 거듭 노리면 투수가 그 칸을 피해요.
 *   투수(aim: dodge) — 타자와 **다른 칸**을 골라야 이겨요. 타자의 노림수를 읽고,
 *                      같은 칸만 거듭 던지면 타자가 그 칸에서 기다려요.
 * 유불리가 통째로 뒤집히는 자리라, 문구도 '적중 ↔ 읽힘'으로 같이 뒤집어요.
 * 그래야 투수가 "맞혔어요!"를 보는 일이 없어요. */
const POST_MECH = {
  mind: {
    stat: () => (S.pos === "batter" ? S.stats.contact : S.stats.control),
    txt: () => (S.pos === "batter" ? MIND_BAT : MIND_PIT),
    run: (box, tier, cb) => {
      const bat = S.pos === "batter";
      window.PostStage.mind(box, {
        label: bat
          ? "🎯 가을야구의 한 타석! 투수의 버릇을 읽어요 — 같은 코스를 고르면 받아쳐요"
          : "🎯 상대 4번과의 승부! 노림수를 피해요 — 타자와 다른 코스로 던져야 이겨요",
        aim: bat ? "match" : "dodge",
        zonePct: miniZone(bat ? S.stats.contact : S.stats.control),
        tier,
        msg: bat ? null : {
          /* 투수는 '읽히지 않는 것'이 이기는 것이라 hit와 slip의 뜻이 뒤집혀요.
           * 같은 칸 = 타자가 노림수를 맞힌 것 = 나쁜 일이에요. */
          tellCue: "🔎 타자의 노림수 — 진한 칸에서 기다리고 있어요",
          face: "🧢",                 // 타자가 실제로 노린 칸에 찍혀요
          hit: "❗ 노리던 코스였어요 — 딱 걸렸어요",
          slip: "🎯 허를 찔렀어요! 방망이가 헛돌아요",
          win: "⚡ 세 번 다 피했어요 — 삼진!!",
          even: "🔥 한 번 걸렸지만 잘 넘겼어요",
          lose: "❌ 노림수에 걸려 통타를 맞았어요…",
          timeup: "⏱️ 승부 종료",
          scoreLabel: "읽힘",
          tip: "타자가 노리는 칸을 <b>피해요</b> · <b>같은 칸만 거듭 던지면</b> 타자가 거기서 기다려요 · 서두를 필요 없어요",
          /* 🧭 준비 화면도 투수 말로 갈아끼워요. 같은 규칙인데 부호가 반대라,
           * 여기만 타자 말로 남으면 "같은 칸을 고르라"는 설명을 투수가 읽게 돼요.
           * ⚠️ readyPick·readyTell에는 태그를 넣지 마세요 — 설명 칸에 그대로 들어가요. */
          readyTitle: "🎯 수싸움",
          readyLines: [
            "타자와 <b>동시에</b> 코스를 골라요. 세 칸 중 <b>다른 칸</b>으로 던져야 이겨요.",
            "<b>날아오는 공도, 제한 시간도 없어요.</b> 화면은 누르기 전까지 멈춰 있으니 천천히 보고 정하세요.",
            "칸마다 선 <b>기색 막대</b>가 타자의 노림수예요 — 제구가 좋을수록 진짜 노림수에 가깝게 보여요.",
            "내가 던진 자국(●)이 칸에 남아요. <b>같은 칸만 거듭 던지면 타자가 거기서 기다려요.</b>",
            "3구 동안 <b>한 번도 안 읽히면</b> 삼진(완벽), 한 번 읽히면 잘 넘긴 거고, 두 번 읽히면 통타를 맞아요.",
          ],
          readyShort: "타자가 노리는 칸을 피하되, 같은 칸만 거듭 던지면 거기서 기다려요 · 3구 동안 안 읽히면 완벽",
          readyPick: "세 칸 중 하나를 눌러 던져요. 타자와 다른 칸이면 피한 거예요 — 언제 눌러도 결과는 같아요",
          readyTell: "칸 안의 막대는 타자의 노림수, 아래 점(●)은 내가 그 칸에 던진 자국이에요",
        },
      }, cb);
    },
  },
  dash: {
    stat: () => (S.pos === "batter" ? S.stats.run : S.stats.defense),
    txt: () => (S.pos === "batter" ? DASH_BAT : DASH_PIT),
    run: (box, tier, cb) => {
      const bat = S.pos === "batter";
      window.PostStage.dash(box, {
        label: bat
          ? "🏃 2사 후 큰 타구! 3루를 돌까요, 멈출까요?"
          : "🏃 외야로 빠진 타구! 홈에서 승부할까요, 끊을까요?",
        goText: bat ? "홈으로!! 🏃" : "홈 승부! 🎯",
        stopText: bat ? "멈춰! ✋" : "끊어! 🧤",
        zonePct: miniZone(bat ? S.stats.run : S.stats.defense),
        tier,
        msg: bat ? null : {
          safe: "❌ 홈을 내줬어요…",   // 투수는 주자를 막는 쪽이라 뜻이 뒤집혀요
          tagged: "🎉 홈에서 잡았어요!",
          rundown: "❌ 우물쭈물하다 홈을 내줬어요…",
          back: "🛑 끊어서 추가 진루를 막았어요",
          late: "❌ 어정쩡한 중계, 주자가 다 살았어요…",
          going: "🎯 홈으로 뿌려요!!",
          timeup: "⏱️ 판단이 늦었어요…",
          tip: "송구는 🌫️ 뒤에 숨어 있어요 · ✋ 선을 넘으면 <b>끊을 수 없어요</b>",
          /* 🧭 여기도 준비 화면을 투수 말로. 버튼 이름(goText·stopText)은
           * post-stage.js가 화면 버튼에서 그대로 가져가니 여기서 안 적어요. */
          readyTitle: "🏃 홈 승부 — 버튼이 둘이에요",
          readyLines: [
            "위 레인은 <b>우리 송구</b>, 아래 레인은 <b>상대 주자</b>예요. 먼저 🏠에 닿는 쪽이 이겨요.",
            "타구를 쫓는 동안(🌫️)은 송구가 어디쯤인지 안 보여요. 그 사이에도 주자는 <b>계속 홈으로 와요</b>.",
            "아래 두 버튼 중 <b>반드시 하나를 고르세요</b>. 안 고르면 그대로 홈을 내줘요 — 여기서 가장 나쁜 수예요.",
          ],
          readyShort: "🌫️가 걷히기를 기다릴수록 ✋ 선이 가까워져요 · 둘 중 하나는 꼭 고르세요",
          readyGo: "홈으로 뿌려요. 주자보다 송구가 먼저 닿으면 잡고, 늦으면 홈을 내줘요",
          readyStop: "중계로 끊어요. ✋ 선을 넘기 전이면 추가 진루를 막고, 넘었으면 다 살아요",
        },
      }, cb);
    },
  },
  /* 🥵 버티기 — 체력이 바닥나기 전에 얼마나 밀어붙일지 정해요. 밀수록 다음 한 칸이
   * 더 들고(지치니까요), 남은 체력을 넘겨 밀면 그 자리에서 무너져요.
   * 여기도 시점이 통째로 뒤집혀요.
   *   타자(aim: push) — 멀리 밀어야 담장 밖. 목표선이 **높아요**.
   *   투수(aim: hold) — 조금만 버텨도 삼진. 목표선이 낮은 대신 한 번 미는 데 **더 지쳐요**.
   *                     밀리지만 않으면 이겨요.
   * 능력치는 **체력**이에요 — 남은 체력이 곧 얼마나 밀 수 있느냐거든요.
   * 타자·투수 둘 다 stamina를 봐요 (8종에서는 안 쓰이던 능력치예요). */
  grind: {
    stat: () => S.stats.stamina,
    txt: () => (S.pos === "batter" ? GRIND_BAT : GRIND_PIT),
    run: (box, tier, cb) => {
      const bat = S.pos === "batter";
      window.PostStage.grind(box, {
        label: bat
          ? "🥵 승부처의 한 타석! 체력이 다하기 전에 어디까지 밀어붙일까요"
          : "🥵 만루 위기! 남은 체력을 짜내 어디까지 버텨 낼까요",
        aim: bat ? "push" : "hold",
        digText: bat ? "더 밀어붙인다 💪" : "더 버틴다 🫀",
        endText: "여기까지 🏁",
        zonePct: miniZone(S.stats.stamina),
        tier,
        msg: bat ? null : {
          /* 투수는 '버텨 내는 것'이 이기는 것이라 문구와 목표선이 통째로 뒤집혀요. */
          stamLabel: "남은 체력",
          cue: "🥵 버틸수록 다음 한 구가 더 힘겨워요 — 체력을 넘겨 버티면 그대로 무너져요",
          win: "🔥 끝까지 버텨 냈어요! 삼진!!",
          even: "🫀 밀리지 않고 버텨 범타로 막았어요",
          lose: "❌ 얼마 못 버티고 밀렸어요… 통타",
          collapse: "💥 무리하게 버티다 체력이 바닥나 무너졌어요…",
          timeup: "⏱️ 버텨 보지 못한 채 이닝이 끝났어요",
          tip: "🫀로 버티고 🏁로 끊어요 · <b>남은 체력을 넘겨 버티면 무너져요</b> · 서두를 필요 없어요",
          readyTitle: "🥵 버티기",
          readyLines: [
            "체력이 바닥나기 전에 <b>얼마나 버텨 낼지</b> 정해요. 조금만 버텨도 위기를 넘겨요.",
            "<b>날아오는 공도, 제한 시간도 없어요.</b> 화면은 누르기 전까지 멈춰 있으니 천천히 정하세요.",
            "한 번 버틸 때마다 드는 체력이 <b>점점 커져요</b> — 지친 몸이라 다음 한 구가 더 들어요. 버튼에 다음 소모가 −숫자로 적혀 있어요.",
            "남은 체력을 <b>넘겨서 버티면 그 자리에서 무너져요</b>(통타). 무리는 최악의 수예요.",
            "<b>가까운 목표선</b>까지만 버텨 내면 삼진, 그 앞이면 범타로 막아요 — 밀리지만 않으면 이겨요.",
          ],
          readyShort: "체력을 넘기지 않는 선에서 버텨 내면 삼진 · 밀리지만 않으면 이겨요",
          /* ⚠️ readyDig·readyEnd에는 태그를 넣지 마세요 — 설명 칸에 그대로 들어가요. */
          readyDig: "체력을 써서 한 구 더 버텨 내요. 버틸수록 다음 한 구가 더 들어요 — 언제 눌러도 결과는 같아요",
          readyEnd: "지금까지 버틴 만큼으로 끊어요. 넘치게 버텨 무너지기 전에 마무리해요",
        },
      }, cb);
    },
  },
  /* 🔥 힘겨루기 — 두 버튼을 번갈아 눌러 표식을 밀어내요. 순전히 힘이에요.
   *   타자(aim: push) — 밀어붙이는 쪽. 멀리 밀수록 좋아요.
   *   투수(aim: hold) — 버티는 쪽. 타자가 훨씬 세게 밀지만, **밀리지만 않으면** 이겨요.
   * 같은 자리가 타자에겐 범타, 투수에겐 완벽이에요 — 유불리가 통째로 뒤집혀요.
   * 능력치는 타자 **파워**, 투수 **구속**이에요 (가을야구에서 안 쓰이던 자리예요). */
  clash: {
    stat: () => (S.pos === "batter" ? S.stats.power : S.stats.velocity),
    txt: () => (S.pos === "batter" ? CLASH_BAT : CLASH_PIT),
    run: (box, tier, cb) => {
      const bat = S.pos === "batter";
      window.PostStage.clash(box, {
        label: bat
          ? "🔥 정면승부! 힘 대 힘 — 밀어내면 담장을 넘겨요"
          : "🔥 정면승부! 힘 대 힘 — 밀리지만 않으면 이겨요",
        aim: bat ? "push" : "hold",
        aText: bat ? "🦵 하체" : "🦵 축발",
        bText: bat ? "💪 스윙" : "💪 릴리스",
        zonePct: miniZone(bat ? S.stats.power : S.stats.velocity),
        tier,
        msg: bat ? {
          readyA: "하체로 버티고 밀어요. 여기서 힘이 시작돼요 — 먼저 이쪽부터예요",
          readyB: "상체를 돌려 방망이에 힘을 실어요. 하체 다음은 반드시 이쪽이에요",
        } : {
          /* 투수는 버티는 쪽이라 승패의 자리가 통째로 반대예요. */
          blast: "⚡ 완전히 윽박질렀어요, 삼진!!",
          win: "⚡ 구위로 눌렀어요! 삼진!!",
          even: "🔥 밀리지 않고 범타로 막았어요",
          lose: "❌ 힘에서 밀렸어요… 통타를 맞았어요",
          crush: "❌ 그대로 밀려 담장을 넘겼어요…",
          tip: "빛나는 버튼을 <b>번갈아</b> 눌러요 · 같은 쪽을 두 번 누르면 헛심이에요",
          readyTitle: "🔥 힘겨루기 — 번갈아 눌러요",
          readyLines: [
            "가운데 표식을 사이에 두고 타자와 밀고 밀려요. 타자는 <b>가만히 있어도 계속</b> 밀어붙여요.",
            "아래 두 버튼을 <b>번갈아</b> 눌러야 힘이 실려요. 다음에 누를 버튼이 <b>환하게 빛나요</b> — 그것만 보고 계속 누르면 돼요.",
            "같은 쪽을 두 번 누르면 헛심을 써서 <b>되레 밀려요.</b> 맞출 타이밍은 없어요, 순서만 지키면 돼요.",
            "타자보다 훨씬 유리한 선에서 시작해요. <b>먼 선</b>을 지키면 삼진, <b>가까운 선</b>까지 버티면 범타, 밀리면 맞아요.",
          ],
          readyShort: "빛나는 버튼을 번갈아 계속 눌러요 · 밀리지만 않으면 이겨요",
          readyA: "축발로 버텨요. 여기서 힘이 시작돼요 — 먼저 이쪽부터예요",
          readyB: "팔을 채 공에 힘을 실어요. 축발 다음은 반드시 이쪽이에요",
        },
      }, cb);
    },
  },
};

/* 가을야구 미니게임 한 판. playRandomMini와 같은 계약이에요 — cb(res, txt).
 * autoMiniOn() 경로가 없으면 테스트도 확인 페이지도 여기서 막혀요. */
function playPostMini(container, cb) {
  const mech = POST_MECH[pick(["mind", "dash", "grind", "clash"])];
  const txt = mech.txt();
  if (autoMiniOn()) { cb(autoRes(mech.stat()), txt); return; }
  mech.run(container, postTier(), (res) => cb(res, txt));
}

// 승부처 미니게임 — 타이밍/홀드/사인 암기/반응 속도/수싸움 5종 랜덤
function playRandomMini(container, cb) {
  // 🍂 가을야구에서는 전용 메커닉 4종만 나와요. 정규시즌은 아래 8종 그대로예요.
  if (inPostMini()) { playPostMini(container, cb); return; }
  const isBat = S.pos === "batter";
  const mech = pick(["bar", "hold", "seq", "react", "duel", "target", "drop", "odd"]);
  if (mech === "bar") {
    const type = pick(isBat ? MINI_BAT : MINI_PIT);
    if (autoMiniOn()) { cb(autoRes(S.stats[type.stat]), type); return; }
    window.Timing.play(container, {
      label: type.label,
      button: type.button,
      zonePct: miniZone(S.stats[type.stat]),
    }, (res) => cb(res, type));
  } else if (mech === "hold") {
    const stat = isBat ? S.stats.power : S.stats.velocity;
    if (autoMiniOn()) { cb(autoRes(stat), isBat ? HOLD_BAT : HOLD_PIT); return; }
    window.Timing.hold(container, {
      label: isBat ? "💪 꾹 눌러 힘을 모으고, 초록 존에서 풀스윙!" : "🔥 꾹 눌러 어깨를 달구고, 초록 존에서 릴리스!",
      button: isBat ? "꾹 누르기 🏏" : "꾹 누르기 ⚾",
      zonePct: miniZone(stat),
    }, (res) => cb(res, isBat ? HOLD_BAT : HOLD_PIT));
  } else if (mech === "seq") {
    const stat = isBat ? S.stats.contact : S.stats.control;
    if (autoMiniOn()) { cb(autoRes(stat), isBat ? SEQ_BAT : SEQ_PIT); return; }
    window.Timing.sequence(container, {
      label: isBat ? "📋 벤치 사인! 순서를 기억했다가 그대로!" : "📋 포수 사인! 볼배합을 기억했다가 그대로!",
      icons: ["⚾", "🧢", "🧤", "🏏"],
      showMs: 900 + stat * 6 + (S.condition - 50) * 3,
    }, (res) => cb(res, isBat ? SEQ_BAT : SEQ_PIT));
  } else if (mech === "react") {
    const stat = isBat ? S.stats.run : S.stats.defense;
    if (autoMiniOn()) { cb(autoRes(stat), isBat ? REACT_BAT : REACT_PIT); return; }
    window.Timing.reaction(container, {
      label: isBat ? "👟 견제가 온다! 신호가 켜지면 곧바로 귀루!" : "🧤 강습 타구! 신호가 켜지면 곧바로 캐치!",
      button: isBat ? "귀루!! ⚡" : "캐치!! 🧤",
      perfectMs: 300 + stat * 1.5,
      goodMs: 700 + stat * 2.5,
    }, (res) => cb(res, isBat ? REACT_BAT : REACT_PIT));
  } else if (mech === "target") {
    const stat = isBat ? S.stats.run : S.stats.defense;
    if (autoMiniOn()) { cb(autoRes(stat), isBat ? REACT_BAT : REACT_PIT); return; }
    window.Timing.target(container, {
      label: isBat ? "⚡ 빠른 배팅! 튀어나오는 공을 놓치지 말고 탭!" : "🧤 타구 처리! 튀어나오는 타구를 빠르게 잡아 탭!",
      icon: isBat ? "⚾" : "🧤", count: 3, lifeMs: 800 + Math.min(stat, 130) * 3,
    }, (res) => cb(res, isBat ? REACT_BAT : REACT_PIT));
  } else if (mech === "drop") {
    const type = pick(isBat ? MINI_BAT : MINI_PIT);
    if (autoMiniOn()) { cb(autoRes(S.stats[type.stat]), type); return; }
    window.Timing.drop(container, {
      label: isBat ? "⚾ 낙구 배팅! 떨어지는 공을 초록 존에서 딱 받아쳐!" : "🧤 포구! 떨어지는 공을 글러브 존에서 딱 잡아!",
      icon: "⚾", zonePct: miniZone(S.stats[type.stat]),
    }, (res) => cb(res, type));
  } else if (mech === "odd") {
    const stat = isBat ? S.stats.contact : S.stats.control;
    if (autoMiniOn()) { cb(autoRes(stat), isBat ? DUEL_BAT : DUEL_PIT); return; }
    window.Timing.odd(container, {
      label: "👀 빠른 눈! 다른 하나를 순식간에 찾아 탭!",
      rounds: 2, sets: [["⚾", "🥎"], ["🧢", "⛑️"], ["🧤", "🥊"]],
    }, (res) => cb(res, isBat ? DUEL_BAT : DUEL_PIT));
  } else {
    const stat = isBat ? S.stats.contact : S.stats.control;
    if (autoMiniOn()) { cb(autoRes(stat), isBat ? DUEL_BAT : DUEL_PIT); return; }
    window.Timing.duel(container, {
      /* 🏷️ 예전 이름은 "수 싸움"이었어요. 가을야구 전용으로 🎯 수싸움이 새로 생기면서
       * 이름이 겹쳤어요 — 5월에 본 것과 10월에 보는 것이 같은 게임처럼 읽히면
       * 가을야구를 특별하게 만든 뜻이 사라져요. 여기(timing.js의 duel)는 힌트 한 줄을
       * 보고 한 번 찍는 3택이라 '결정구 읽기'가 실제로 하는 일에 더 가까워요.
       * timing.js는 한 줄도 안 건드렸어요 — 화면에 뜨는 이름은 이 label이 정해요. */
      label: isBat ? "🧠 결정구 읽기! 투수가 노리는 코스를 찍어라" : "🧠 결정구 읽기! 타자가 노리는 코스를 피해 던져라",
      choices: ["몸쪽", "가운데", "바깥쪽"],
      hintChance: clamp((stat - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, (res) => cb(res, isBat ? DUEL_BAT : DUEL_PIT));
  }
}

let simTimer = null;
// 범용 경기 시뮬레이터 — 고교 대회와 프로 리그가 함께 사용
// cfg: { title, oppName, homeName, perf, story, interactive, preWin, onFinish(win,bonus)→{extra,nextLabel,nextFn} }
function renderGameSim(cfg) {
  const { oppName: opp, perf, story, interactive, preWin } = cfg;
  // 상대 팀 전력. career.js가 teamStrOf(상대)를 넘겨줘요.
  // 고교 대회처럼 안 넘기는 경로는 리그 평균(0.49)으로 봅니다.
  const oppStr = () => (typeof cfg.oppStr === "number" ? cfg.oppStr : 0.49);
  /* 🌏 oppStr에 섞여 있는 리그 난이도 몫만 따로 받아요. 실점 '크기'에는 팀 전력이
   * 아니라 이것만 걸려야 하거든요 (crisisRuns의 lgUp 설명 참고).
   * 고교 대회처럼 안 넘기는 경로는 0 — KBO와 같아요. */
  const lgUp = () => (typeof cfg.lgUp === "number" ? cfg.lgUp : 0);
  $("tour-round").textContent = cfg.title;
  const heads = Array.from({ length: 9 }, (_, i) => `<th>${i + 1}</th>`).join("");
  const cells = (side) => Array.from({ length: 9 }, (_, i) => `<td id="sb-${side}-${i}"></td>`).join("");
  $("tour-card").innerHTML = `
    <div class="sb-wrap">
    <table class="scoreboard">
      <thead><tr id="sb-head"><th></th>${heads}<th>R</th></tr></thead>
      <tbody>
        <tr id="sb-row-opp"><th>${opp.slice(0, 4)}</th>${cells("opp")}<td class="sb-r" id="sb-r-opp">0</td></tr>
        <tr id="sb-row-our"><th>${cfg.homeName.slice(0, 4)}</th>${cells("our")}<td class="sb-r" id="sb-r-our">0</td></tr>
      </tbody>
    </table>
    </div>
    <div class="pbp" id="pbp"></div>
    <div id="game-moment"></div>
    <div id="game-result"></div>`;

  const evFor = (inn, half) => story.events.filter((e) => e.inn === inn && e.half === half);
  // 경기 중 랜덤 미니게임 — 2~7회 중 한 이닝에 등장 (프로 지정 모먼트가 있으면 생략)
  const isBat = S.pos === "batter";
  const proAb = story.proAb || null;
  const proCrisis = story.proCrisis || null;
  /* 스태미나가 모자라 9회 위기가 없는 투수 경기는 등장 확률을 올려요.
   * 안 그러면 초반 투수는 경기 내내 구경만 하게 돼요. */
  const midChance = (!interactive && !isBat) ? 0.7 : 0.35;
  const midInn = (!proAb && !proCrisis && Math.random() < midChance) ? randInt(2, 7) : -1;
  const midHalf = isBat ? "말" : "초";
  const steps = [{ feeds: [{ text: `⚾ ${cfg.title} — 플레이볼!` }] }];
  for (let i = 0; i < 9; i++) {
    if (interactive && story.moment.half === "초" && i === 8) { steps.push({ moment: true }); break; }
    if (proCrisis && proCrisis.includes(i + 1)) steps.push({ proMoment: "crisis", inn: i });
    else if (midInn === i + 1 && midHalf === "초") steps.push({ midMoment: true, inn: i });
    else steps.push({ cell: ["opp", i, story.oppInn[i]], feeds: evFor(i + 1, "초").map((e) => ({ text: `${i + 1}회초 · ${e.text}`, cls: e.cls })) });
    if (interactive && story.moment.half === "말" && i === 8) { steps.push({ moment: true }); break; }
    const bottom9 = i === 8; // 9회말 — 홈팀(우리)이 앞서 있으면 진행하지 않아요
    if (proAb && proAb.includes(i + 1)) steps.push({ proMoment: "ab", inn: i, bottom9 });
    else if (midInn === i + 1 && midHalf === "말") steps.push({ midMoment: true, inn: i, bottom9 });
    else steps.push({ cell: ["our", i, story.ourInn[i]], feeds: evFor(i + 1, "말").map((e) => ({ text: `${i + 1}회말 · ${e.text}`, cls: e.cls })), bottom9 });
  }
  // (비인터랙티브 경기의 '경기 종료' 문구는 미니게임 결과가 반영된
  //  실제 최종 스코어로 endOfSteps에서 출력해요)

  const totals = { opp: 0, our: 0 };
  let idx = 0, finished = false, momentOn = false;

  function applyStep(s) {
    if (s.cell) {
      const [side, i, v] = s.cell;
      $(`sb-${side}-${i}`).textContent = v;
      totals[side] += v;
      $(`sb-r-${side}`).textContent = totals[side];
    }
    for (const f of s.feeds || []) {
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("pbp").appendChild(div);
    }
    const pbp = $("pbp");
    pbp.scrollTop = pbp.scrollHeight;
  }

  // 프로: 내 타석 / 투수 위기 — 매번 미니게임 (자동 모드면 즉시 판정)
  function beginProMoment(st) {
    momentOn = true;
    clearInterval(simTimer);
    const i = st.inn;
    const btn = $("btn-tour-next");
    const resume = () => {
      momentOn = false;
      btn.disabled = false;
      btn.textContent = "⏩ 빨리 감기";
      simTimer = setInterval(tick, 550);
    };
    if (st.proMoment === "ab") {
      applyStep({ feeds: [{ text: `🧢 ${i + 1}회말, ${S.name}의 타석!`, cls: "good" }] });
      const doRes = (res) => {
        let txt, cls = "good", runs = 0;
        /* 예전에는 퍼펙트가 확정 안타였어요. 그래서 미니게임 실력이 곧 타율이 돼
         * 타율 .95에 시즌 400홈런이 나왔고, WAR이 상한 12에 눌려 변별력을 잃었어요.
         * 이제 스탯이 수준을 정하고 판정은 배수로 흔들어요 — 잘 맞아도 야수 정면일 수 있어요.
         * 상대 팀 전력이 섞여서 강팀을 만나면 어려워집니다. */
        const hitP = clamp(0.16 + S.stats.contact / 800 - (oppStr() - 0.49) * 0.55, 0.10, 0.46)
          * clutch("contact");
        const mult = res === "perfect" ? 1.12 : res === "good" ? 1.0 : 0.40;
        if (Math.random() < clamp(hitP * mult, 0, 0.95)) {
          perf.hits += 1;
          if (Math.random() < clamp(S.stats.power / 600, 0.03, 0.30)) {
            perf.hr += 1; runs = randInt(1, 2);
            txt = `${S.name}, 큼지막한 홈런!! 💥`;
          } else if (res === "perfect") {
            runs = 1;
            txt = `${S.name}, 총알 같은 2루타! ⚡ (1타점)`;
          } else {
            runs = Math.random() < 0.4 ? 1 : 0;
            txt = `${S.name}, 안타! 🏏${runs ? " (1타점)" : ""}`;
          }
          if (Math.random() < S.stats.run / 400 * clutch("run")) { perf.sb += 1; txt += " 이어서 도루! 👟"; }
        } else if (res === "miss") {
          cls = "";
          txt = `${S.name}, ${pick(OUT_TXT)}`;
        } else {
          cls = "";
          txt = `${S.name}, 잘 맞았지만 야수 정면… 아쉬운 타구`;
        }
        story.ourInn[i] += runs;
        applyStep({ cell: ["our", i, story.ourInn[i]], feeds: [{ text: `${i + 1}회말 · ${txt}`, cls }] });
        resume();
      };
      if (autoMiniOn()) { doRes(autoRes(S.stats.contact)); return; }
      btn.disabled = true;
      btn.textContent = "🧢 내 타석!";
      playRandomMini($("game-moment"), doRes);
    } else {
      applyStep({ feeds: [{ text: `🔥 ${i + 1}회초, 주자가 쌓이며 위기!`, cls: "bad" }] });
      const doRes = (res) => {
        const runs = crisisRuns(res, oppStr(), lgUp());
        let txt, cls;
        if (runs === 0) {
          if (res === "perfect") { perf.k += 2; txt = "연속 탈삼진으로 위기 탈출!! 🧊"; }
          else txt = "범타 처리로 위기 탈출! 🧤";
          cls = "good";
        } else if (runs === 1) {
          txt = res === "perfect" ? "잘 던졌지만 빗맞은 안타… 1실점" : "1실점으로 최소 실점 방어";
          cls = "";
        } else {
          txt = `통한의 적시타… ${runs}실점 💧`;
          cls = "bad";
        }
        story.oppInn[i] += runs;
        perf.runs = (perf.runs || 0) + runs;
        applyStep({ cell: ["opp", i, story.oppInn[i]], feeds: [{ text: `${i + 1}회초 · ${txt}`, cls }] });
        resume();
      };
      if (autoMiniOn()) { doRes(autoRes(S.stats.control)); return; }
      btn.disabled = true;
      btn.textContent = "🔥 위기!";
      playRandomMini($("game-moment"), doRes);
    }
  }

  function beginMidMoment(step) {
    momentOn = true;
    clearInterval(simTimer);
    const i = step.inn;
    applyStep({ feeds: [{ text: `⚡ ${i + 1}회, 경기의 승부처가 찾아왔어요!`, cls: "good" }] });
    const btn = $("btn-tour-next");
    btn.disabled = true;
    btn.textContent = "⚡ 승부처!";
    playRandomMini($("game-moment"), (res, type) => {
      const half = isBat ? "말" : "초";
      let delta;
      if (res === "perfect") {
        delta = isBat ? 2 : 0;
        story.ourInn[i] += isBat ? 2 : 0;
        if (!isBat) story.oppInn[i] = 0;
        applyStep({ cell: [isBat ? "our" : "opp", i, isBat ? story.ourInn[i] : 0], feeds: [{ text: `${i + 1}회${half} · ${type.great}`, cls: "good" }] });
        perf.pts += 8;
      } else if (res === "good") {
        if (isBat) story.ourInn[i] += 1;
        applyStep({ cell: [isBat ? "our" : "opp", i, isBat ? story.ourInn[i] : story.oppInn[i]], feeds: [{ text: `${i + 1}회${half} · ${type.ok}`, cls: "good" }] });
        perf.pts += 4;
      } else {
        if (!isBat) story.oppInn[i] += 1;
        applyStep({ cell: [isBat ? "our" : "opp", i, isBat ? story.ourInn[i] : story.oppInn[i]], feeds: [{ text: `${i + 1}회${half} · ${type.bad}`, cls: "bad" }] });
      }
      // 미드 미니게임이 스코어를 바꿨으니 비접전 경기의 승패도 최종 스코어로 재판정
      momentOn = false;
      btn.disabled = false;
      btn.textContent = "⏩ 빨리 감기";
      simTimer = setInterval(tick, 550);
    });
  }

  // 특정 이닝 칸에 점수를 더해요. R가 이닝 합과 어긋나지 않게 칸에도 반영합니다.
  function bumpCell(side, i, n) {
    const el = $(`sb-${side}-${i}`);
    el.textContent = (+(el.textContent || 0)) + n;
    totals[side] += n;
    $(`sb-r-${side}`).textContent = totals[side];
  }

  /* 연장 이닝 칸을 새로 붙여요.
   * 예전에는 연장 득점을 R에만 더해서 "이닝 합 3인데 R은 4"처럼 보였어요. */
  let lastInn = 8;                            // 현재 마지막 이닝의 0-based 인덱스
  function addExtraInning(side, n) {
    lastInn += 1;
    const innNo = lastInn + 1;
    const head = $("sb-head");
    const th = document.createElement("th");
    th.textContent = innNo;
    head.insertBefore(th, head.lastElementChild);
    for (const s of ["opp", "our"]) {
      const row = $(`sb-row-${s}`);
      const td = document.createElement("td");
      td.id = `sb-${s}-${lastInn}`;
      td.textContent = s === side ? n : 0;
      row.insertBefore(td, row.lastElementChild);
    }
    totals[side] += n;
    $(`sb-r-${side}`).textContent = totals[side];
  }

  /* 마지막 승부가 극적이려면 점수판도 그 상황이어야 해요.
   * 이닝 점수는 무작위로 흩뿌려서, 그냥 두면 "1점 차 역전 찬스"인데 3점 앞서 있기도 했어요.
   * 8회 칸에 점수를 얹어 '타자는 1점 뒤 / 투수는 1점 앞'으로 맞춰둡니다.
   * 이렇게 해두면 이후 분기(끝내기·동점·삼진)가 저절로 점수와 맞아떨어져요. */
  function stageClutch() {
    const want = isBat ? -1 : 1;              // 우리 - 상대
    const cur = totals.our - totals.opp;
    if (cur === want) return;
    if (cur < want) bumpCell("our", 7, want - cur);
    else bumpCell("opp", 7, cur - want);
  }

  function beginMoment() {
    momentOn = true;
    clearInterval(simTimer);
    stageClutch();
    applyStep({ feeds: [{ text: isBat
      ? `⚡ 9회말 2아웃, 1점 차 역전 찬스! ${S.name}의 타석!`
      : `⚡ 9회초 1점 차 리드, 2아웃 만루 위기! ${S.name}의 결정구!`, cls: "good" }] });
    const btn = $("btn-tour-next");
    btn.disabled = true;
    btn.textContent = "⚡ 운명의 순간!";
    const stat = isBat ? S.stats.contact : S.stats.control;
    if (autoMiniOn()) { resolveMoment(autoRes(stat)); return; }
    window.Timing.play($("game-moment"), {
      label: isBat ? "⚾ 공이 온다! 초록 존에서 스윙!" : "🎯 결정구! 초록 존에서 릴리스!",
      button: isBat ? "스윙! 🏏" : "던진다! 🔥",
      zonePct: miniZone(stat),
    }, resolveMoment);
  }

  /* 미니게임 결과와 스코어보드를 맞춰줘요.
   * 이닝별 점수는 무작위로 흩뿌리기 때문에 마지막 타석이 늘 동점 상황인 건 아니에요.
   * 그래서 승패만 먼저 정하면 "5:4로 이겼는데 패배" 같은 모순이 생겨요.
   * 승패는 유저가 미니게임으로 따낸 결과이니 그대로 두고, 점수를 거기에 맞춥니다. */
  function reconcileScore(win) {
    const need = win ? totals.opp + 1 - totals.our : totals.our + 1 - totals.opp;
    if (need <= 0) return;                    // 이미 결과와 점수가 맞아요
    bumpCell(win ? "our" : "opp", lastInn, need);
  }

  function resolveMoment(res) {
    const flipWin = () => Math.random() < clamp(0.5 + (overall() - 50) / 250, 0.3, 0.7);
    let win;
    if (isBat) {
      if (res === "perfect") {
        win = true;
        applyStep({ cell: ["our", 8, 2], feeds: [{ text: `9회말 · ${S.name}, 끝내기 투런 홈런!!! 💥🎉`, cls: "good" }] });
        perf.baseHits += 1; perf.baseHr += 1;
        perf.highlight = "💥 운명의 타석에서 터진 끝내기 홈런! 전국구 스타 탄생!";
      } else if (res === "good") {
        win = flipWin();
        applyStep({ cell: ["our", 8, 1], feeds: [{ text: `9회말 · ${S.name}, 극적인 동점 적시타! ⚡`, cls: "good" }] });
        addExtraInning(win ? "our" : "opp", 1);
        applyStep({ feeds: [{ text: win ? "🔥 연장 10회, 끝내기 승리!" : "💧 연장 접전 끝에 아쉬운 역전패…", cls: win ? "good" : "bad" }] });
        perf.baseHits += 1;
        perf.highlight = win ? "⚡ 동점 적시타로 경기를 살려냈어요!" : "⚡ 동점 적시타에도 아쉬운 연장 패배…";
      } else {
        win = false;
        applyStep({ cell: ["our", 8, 0], feeds: [{ text: `9회말 · ${S.name}, 헛스윙 삼진… 경기 종료 💧`, cls: "bad" }] });
        perf.highlight = "😢 운명의 타석에서 방망이가 헛돌았어요…";
      }
      perf.hits = perf.baseHits;
      perf.hr = perf.baseHr;
      perf.pts = perf.hits * 7 + perf.hr * 16 + perf.sb * 4 + Math.round(S.stats.defense / 25) + (perf.hits === 0 ? -9 : 0);
      perf.line = `${S.name}: ${perf.ab}타수 ${perf.hits}안타${perf.hr ? ` ${perf.hr}홈런` : ""}${perf.sb ? ` ${perf.sb}도루` : ""}`;
    } else {
      if (res === "perfect") {
        win = true;
        applyStep({ cell: ["opp", 8, 0], feeds: [{ text: `9회초 · ${S.name}, 마지막 타자를 삼진으로!! 경기 끝! 🧊🎉`, cls: "good" }] });
        perf.highlight = "🧊 만루 위기에서 삼진 마무리! 강심장 에이스!";
      } else if (res === "good") {
        win = flipWin();
        applyStep({ cell: ["opp", 8, 1], feeds: [{ text: "9회초 · 1실점으로 동점을 허용했지만 추가 실점은 막았어요", cls: "" }] });
        addExtraInning(win ? "our" : "opp", 1);
        applyStep({ feeds: [{ text: win ? "🔥 연장 10회말, 우리 타선의 끝내기!" : "💧 연장 접전 끝에 아쉬운 패배…", cls: win ? "good" : "bad" }] });
        perf.runs += 1;
      } else {
        win = false;
        applyStep({ cell: ["opp", 8, 2], feeds: [{ text: "9회초 · 통한의 역전 2타점 안타를 맞았어요… 💧", cls: "bad" }] });
        perf.highlight = "😵 마지막 순간 결정구가 가운데로 몰렸어요…";
        perf.runs += 2;
      }
      if (!perf.highlight || res === "good") {
        perf.highlight = win ? "🔥 위기를 버텨 승리를 지켜냈어요!" : perf.highlight;
      }
      perf.ip = Math.min(perf.ip + 1, 9); // 방금 9회를 직접 막았으니 이닝에 반영해요
      perf.pts = Math.max(perf.ip * 2 + perf.k * 2.5 - perf.runs * 2.5, -12);
      perf.line = `${S.name}: ${perf.ip}이닝 ${perf.k}탈삼진 ${perf.runs}실점`;
    }
    reconcileScore(win);
    applyStep({ feeds: [{ text: `📢 경기 종료 — ${cfg.homeName} ${totals.our} : ${totals.opp} ${opp}`, cls: win ? "good" : "bad" }] });
    showResult(win, res === "perfect" ? 6 : 0);
  }

  function showResult(win, bonus) {
    if (finished) return;
    finished = true;
    clearInterval(simTimer);
    const out = cfg.onFinish(win, bonus) || {};
    const btn = $("btn-tour-next");
    btn.disabled = false;
    $("game-result").innerHTML = `
      <div class="tour-vs">${cfg.homeName} <span class="${win ? "win" : "lose"}">${win ? "승리! 🎉" : "패배… 😢"}</span></div>
      <div class="tour-line">${perf.line}</div>
      ${perf.highlight ? `<div class="tour-line tour-highlight">${perf.highlight}</div>` : ""}
      ${out.extra || ""}`;
    btn.textContent = out.nextLabel || "계속";
    btn.onclick = out.nextFn || (() => {});
  }

  function endOfSteps() {
    if (interactive) return;
    // 미니게임이 점수를 바꿨을 수 있으니 최종 스코어 기준으로 승패 판정
    const win = totals.our > totals.opp ? true : totals.our < totals.opp ? false : preWin;
    if (totals.our === totals.opp) {
      addExtraInning(win ? "our" : "opp", 1);
      applyStep({ feeds: [{ text: win ? "🔥 연장 끝에 승리!" : "💧 연장 끝에 석패…", cls: win ? "good" : "bad" }] });
    }
    applyStep({ feeds: [{ text: `📢 경기 종료 — ${cfg.homeName} ${totals.our} : ${totals.opp} ${opp}`, cls: win ? "good" : "bad" }] });
    showResult(win, 0);
  }
  // 9회초까지 홈팀(우리)이 앞서 있으면 9회말은 진행하지 않아요 (실제 야구 규칙)
  function skipBottom9IfLeading(st) {
    if (!st.bottom9 || interactive || totals.our <= totals.opp) return false;
    if (st.proMoment === "ab" && perf.ab) perf.ab -= 1; // 하지 않은 타석은 기록에서 제외
    applyStep({ feeds: [{ text: "🏁 9회초까지 앞서고 있어 9회말은 진행하지 않습니다! (홈팀 리드)", cls: "good" }] });
    endOfSteps();
    return true;
  }
  function tick() {
    if (idx >= steps.length) { endOfSteps(); return; }
    const st = steps[idx++];
    if (skipBottom9IfLeading(st)) return;
    if (st.moment) { beginMoment(); return; }
    if (st.midMoment) { beginMidMoment(st); return; }
    if (st.proMoment) { beginProMoment(st); return; }
    applyStep(st);
  }
  simTimer = setInterval(tick, 550);
  $("btn-tour-next").textContent = "⏩ 빨리 감기";
  $("btn-tour-next").disabled = false;
  $("btn-tour-next").onclick = () => {
    if (momentOn || finished) return;
    clearInterval(simTimer);
    while (idx < steps.length) {
      const st = steps[idx++];
      if (skipBottom9IfLeading(st)) return;
      if (st.moment) { beginMoment(); return; }
      if (st.midMoment) { beginMidMoment(st); return; }
      if (st.proMoment) { beginProMoment(st); return; }
      applyStep(st);
    }
    endOfSteps();
  };
}

function finishTournament(champion, lastRound) {
  if (champion) {
    addLog(`🏆 ${tour.name} 우승!! 전국이 ${S.name}을(를) 주목해요. (주목도 +${tour.totalPts})`);
  } else {
    addLog(`🏟️ ${tour.name} ${lastRound}에서 마무리. (주목도 +${tour.totalPts})`);
  }
  tour = null;
  show("screen-main");
  advanceMonth();
}

function batterLine() {
  const ab = randInt(3, 5);
  let hits = 0, hr = 0, sb = 0;
  for (let i = 0; i < ab; i++) {
    if (Math.random() < 0.04 + S.stats.contact / 150) {
      hits++;
      if (Math.random() < S.stats.power / 260) hr++;
    }
  }
  if (hits > 0 && Math.random() < S.stats.run / 250) sb++;
  const pts = hits * 7 + hr * 16 + sb * 4 + Math.round(S.stats.defense / 25) + (hits === 0 ? -9 : 0);
  const line = `${S.name}: ${ab}타수 ${hits}안타${hr ? ` ${hr}홈런` : ""}${sb ? ` ${sb}도루` : ""}`;
  let highlight = "";
  if (hr) highlight = "💥 담장을 넘기는 큼지막한 홈런! 관중석이 술렁여요.";
  else if (hits >= 3) highlight = "🔥 멀티히트를 넘어 맹타! 타격감이 뜨거워요.";
  else if (hits === 0 && Math.random() < 0.5) highlight = "😶 오늘은 방망이가 침묵했어요…";
  return { pts, line, highlight, ab, hits, hr, sb };
}

function pitcherLine() {
  const ip = clamp(3 + Math.floor(S.stats.stamina / 22) + randInt(-1, 1), 2, 8);
  const kRate = (S.stats.velocity + S.stats.breaking) / 2;
  const k = clamp(Math.round(ip * (0.4 + kRate / 90) + randInt(-1, 1)), 0, ip * 3);
  const runs = clamp(Math.round(ip * (0.9 - S.stats.control / 130) + randInt(-1, 1)), 0, 9);
  const pts = Math.max(ip * 2 + k * 2.5 - runs * 2.5, -12);
  const line = `${S.name}: ${ip}이닝 ${k}탈삼진 ${runs}실점`;
  let highlight = "";
  if (runs === 0 && ip >= 5) highlight = "🧊 압도적인 무실점 호투! 스카우트들이 수첩을 꺼내요.";
  else if (k >= ip * 1.5) highlight = "🔥 탈삼진 쇼! 상대 타자들이 방망이를 헛돌려요.";
  else if (runs >= 5) highlight = "😵 난타당한 하루… 다음을 기약해요.";
  return { pts, line, highlight, ip, k, runs };
}

// ---------- 드래프트 ----------
function showDraft() {
  const r = regionOf();
  const score = S.scout + overall() * 2;
  const team = pick(r.teams);

  let emoji, title, teamLine, msg;
  if (score >= 620) {
    emoji = "👑"; title = "1라운드 전체 상위 지명!";
    teamLine = `${team} 1라운드 지명`;
    msg = "전국이 주목한 최대어! 계약금이 역대급이라는 소문이 돌아요.";
  } else if (score >= 520) {
    emoji = "🌟"; title = "1라운드 지명!";
    teamLine = `${team} 1라운드 지명`;
    msg = "연고 구단이 1라운드에서 호명! 홈 팬들의 환호가 쏟아져요.";
  } else if (score >= 410) {
    emoji = "🎉"; title = "상위 라운드 지명!";
    teamLine = `${team} 2~4라운드 지명`;
    msg = "당당히 프로 유니폼을 입어요. 1군 데뷔가 머지않았어요.";
  } else if (score >= 330) {
    emoji = "🧢"; title = "중·하위 라운드 지명";
    teamLine = `${team} 5~10라운드 지명`;
    msg = "프로의 문을 통과! 여기서부터가 진짜 시작이에요.";
  } else if (score >= 270) {
    emoji = "🌱"; title = "육성선수 계약";
    teamLine = `${team} 육성선수 입단`;
    msg = "정식 지명은 아니지만 기회는 있어요. 흙 속의 진주가 되어봐요.";
  } else {
    emoji = "🎓"; title = "지명 소식이 없었어요…";
    teamLine = "대학 진학 후 재도전";
    msg = "아쉽지만 야구 인생은 길어요. 4년 뒤 대졸 드래프트를 노려봐요!";
  }

  if (window.Stats) Stats.log("draft", { title, score: Math.round(score) });

  const statLines = STAT_DEFS[S.pos]
    .map((d) => `${d.emoji} ${d.name} ${Math.round(S.stats[d.key])}`)
    .join(" · ");
  const trophyLine = S.trophies.length
    ? `🏆 ${S.trophies.join(", ")}`
    : "🏆 우승 경력 없음";

  $("draft-card").innerHTML = `
    <div class="draft-emoji">${emoji}</div>
    <div class="draft-title">${title}</div>
    <div class="draft-team">${teamLine}</div>
    <div>${msg}</div>
    <div class="draft-summary">
      ${regionOf().emoji} ${r.school} · ${S.pos === "batter" ? "타자" : "투수"} ${S.name}<br/>
      ${statLines}<br/>
      🔭 최종 주목도 ${Math.round(S.scout)} · 대회 ${S.games}경기 출전<br/>
      ${trophyLine}
    </div>`;

  $("btn-share").onclick = () => {
    const text = `⚾ 더 드래프트 결과\n${r.school} ${S.name} — ${title}\n${teamLine}\n주목도 ${Math.round(S.scout)} / ${trophyLine}`;
    navigator.clipboard?.writeText(text).then(
      () => ($("btn-share").textContent = "✅ 복사 완료!"),
      () => ($("btn-share").textContent = "복사 실패 😢")
    );
  };
  $("btn-restart").onclick = () => {
    clearSave();
    location.reload();
  };

  if (window.Career) window.Career.onDraft(score, team);
  else clearSave();
  show("screen-draft");
}

// ---------- ❓ 도움말 ----------
const HELP_SECTIONS = [
  { emoji: "🏋️", title: "훈련과 컨디션", body:
    "매달 훈련이나 휴식을 골라요. 훈련은 능력치를 올리고 컨디션을 깎아요.\n" +
    "컨디션이 낮은 채로 계속 훈련하면 부상 위험이 커져요. 무리하지 말고 쉬어 가세요.\n" +
    "급할 땐 🛍️상점의 회복 아이템으로 컨디션을 채울 수 있어요. 휴식과 달리 턴을 쓰지 않아요." },
  { emoji: "⭐", title: "재능과 각성", body:
    "능력치 옆의 별은 두 가지에 영향을 줘요.\n" +
    "① 훈련 효율 — 별이 많을수록 같은 훈련으로 더 많이 올라요.\n" +
    "② 승부처 보정 — 능력치가 같아도 별이 높으면 결정적인 순간에 조금 더 잘해요\n" +
    "   (최저 ×0.94 ~ 최고 ×1.12). 능력치에 이미 반영된 걸 또 곱하지 않게 폭을 좁게 뒀어요.\n" +
    "능력치 100을 넘으면 '한계 돌파' 구간이라 훈련 효율이 절반이 되고, 그때부터 🔮각성으로\n" +
    "재능을 올릴 수 있어요. 상한(130)까지 채우면 훈련 대신 각성만 남아요.\n" +
    "재능이 최대가 되면 🌠초월로 상한 자체를 6씩 올려요 — 성공할수록 어려워지지만\n" +
    "명예의 전당 점수가 크게 붙어요." },
  { emoji: "🏆", title: "대회와 드래프트", body:
    "고교 3년 동안 대회가 6번 열려요(6월 황금사자기 · 8월 청룡기).\n" +
    "성적이 스카우트 주목도를 올려요. 3학년이 끝나면 주목도와 종합 능력치를 함께 봐서\n" +
    "드래프트 지명이 갈려요 — 대회 성적만큼 평소 훈련도 중요해요.\n" +
    "지명되면 프로 무대로, 아니면 고교에서 커리어가 끝나요." },
  { emoji: "🎓", title: "은퇴와 환생", body:
    "둘 다 커리어를 마치지만 남기는 게 달라요.\n" +
    "🎓은퇴는 🏛️명예의 전당에 기록을 남겨요. 전 세계 플레이어와 순위를 겨뤄요.\n" +
    "🧬환생은 기록 대신 유산을 남겨, 다음 캐릭터가 더 높은 재능과 시작 자금으로 출발해요.\n" +
    "환생은 🏆우승 3회 · 🎖️MVP 3회 · 🌠초월 1단계 중 하나를 이뤄야 열려요." },
  { emoji: "💰", title: "돈 벌기와 쓰기", body:
    "고교 때는 대회 수당이, 프로에서는 경기 수당과 시즌 연봉이 들어와요.\n" +
    "🛍️상점에서 장비를 사면 능력치가 바로 올라요. 등급은 순서대로만 살 수 있어요.\n" +
    "같은 상점에서 컨디션 회복 아이템도 팔아요 — 🥤300만 · 💊800만 · 💉2,000만.\n" +
    "30분마다 🎁특훈으로 무료 훈련을 한 번 받을 수 있어요." },
  { emoji: "💾", title: "기록 보관", body:
    "기록은 이 기기의 브라우저에 저장되고, 서버에도 자동 백업돼요.\n" +
    "기기를 바꾸거나 브라우저 데이터를 지우면 이 기기의 기록은 사라져요.\n" +
    "타이틀 화면의 🔗 기록 연동에서 코드를 복사해 두면 새 기기에서 그대로 이어받을 수 있어요." },
];

function openHelp() {
  if (window.Help) window.Help.open("⚾ 더 드래프트 도움말", HELP_SECTIONS);
}
$("btn-help-main")?.addEventListener("click", openHelp);
$("btn-help-pro")?.addEventListener("click", openHelp);

// ---------- 시작 ----------
initTitle();
if (window.Stats) Stats.init("rookie");

/* ☁️ 클라우드 세이브 연결 — 타이틀 진입 시 서버와 맞춰요 */
if (window.Cloud) {
  Cloud.init("rookie");
  $("btn-cloud")?.addEventListener("click", () => Cloud.openModal());
}
