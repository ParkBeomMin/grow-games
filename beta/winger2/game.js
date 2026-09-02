/* 더 윙어 ⚽ 축구선수 키우기 */
"use strict";

// ---------- 데이터 ----------
// 유스 배경 선택 — 야구의 '지역'·아이돌의 '소속사' 대응
/* 유스 — `home`은 🌟 프로 계약 성공으로 데뷔하는 리그예요.
 * 나라를 고르게 해놓고 리그에는 나라가 없어서, 국적이 debut·growth·spot 수치에만
 * 쓰이고 데뷔하는 순간 사라졌어요. 이제 국적이 어느 리그에서 출발하는지를 정합니다.
 * 성장이 빠른 유스일수록 어려운 리그에서 시작해요 — 위험과 보상을 같은 축에 둡니다.
 * 유스 5개가 리그 5개국과 **1:1로 맞아요.** 예전에는 🇪🇺 유럽·🌍 아프리카가
 * 권역이라 리그(나라)와 어긋났고, 🇬🇧 잉글랜드로 가는 유스는 아예 없었어요.
 *   🇰🇷 0.98 → K리그1(벌점 0)        🇯🇵 1.04 → J1리그(0.85)
 *   🇧🇷 1.08 → 브라질 세리에A(1.1)   🇬🇧 1.12 → 챔피언십(1.6)
 *   🇮🇹 1.18 → 세리에A(2.1)
 * 잉글랜드는 챔피언십에서 시작해요 — 프리미어리그(벌점 2.8)는 데뷔로 너무 가혹해요.
 */
const MARKETS = [
  {
    id: "k", name: "K리그 유스", emoji: "🇰🇷", tier: "국내 명문", home: 1,
    debut: 0.66, growth: 0.98, spot: 1.0,
    desc: "체계적인 국내 유스. 안정적으로 크지만 세계무대는 멀어요",
  },
  {
    id: "jp", name: "J리그 유스", emoji: "🇯🇵", tier: "정교한 시스템", home: 7,
    debut: 0.65, growth: 1.04, spot: 1.03,
    desc: "정교한 패스 축구를 가르쳐요. 전술 이해와 기본기가 빠르게 자라요",
  },
  {
    id: "br", name: "브라질 유스", emoji: "🇧🇷", tier: "삼바 축구", home: 9,
    debut: 0.62, growth: 1.08, spot: 1.05,
    desc: "길거리 축구로 다져진 개인기. 화려하게 성장해요",
  },
  {
    /* ⚠️ id는 "af"예요 — 옛 세이브가 가리키는 값이라 안 바꿔요.
     * 나라별 리그가 생기기 전에는 🌍 아프리카 유망주였습니다. 리그가 나라 단위가
     * 되면서 아프리카 리그가 없어 갈 곳이 없어졌고, 대신 🇬🇧 잉글랜드가 리그는
     * 있는데 유스가 없었어요. 그 자리를 이어받았습니다. */
    id: "af", name: "잉글랜드 아카데미", emoji: "🇬🇧", tier: "프리미어 유스", home: 2,
    debut: 0.60, growth: 1.12, spot: 1.10,
    desc: "피지컬과 속도를 먼저 가르쳐요. 성장이 빠른 대신 경쟁이 거칠어요",
  },
  {
    // id는 "eu"(옛 🇪🇺 유럽 아카데미)예요. 권역이던 것을 나라로 좁혔습니다.
    id: "eu", name: "이탈리아 유스", emoji: "🇮🇹", tier: "칼치오 유스", home: 11,
    debut: 0.57, growth: 1.18, spot: 1.15,
    desc: "전술과 수비 조직을 뼈에 새겨요. 가장 빨리 크지만 데뷔 무대가 가장 험해요",
  },
];

const STAT_DEFS = [
  { key: "shoot", name: "슛", emoji: "⚽", sub: "결정력·마무리" },
  { key: "pass", name: "패스", emoji: "🎯", sub: "시야·연계" },
  { key: "dribble", name: "드리블", emoji: "🏃", sub: "돌파·개인기" },
  { key: "defense", name: "수비", emoji: "🛡️", sub: "태클·위치선정" },
  /* ⚡ 스피드는 **체력에서 떼어낸** 축이에요. 예전에는 체력이 "지구력·스피드"를
   * 겸했는데, 그러면 빠른 선수와 지치지 않는 선수가 같은 값이 됩니다.
   * 이제 체력은 지치는 속도(컨디션 소모)를, 스피드는 순간의 돌파와 따라붙기를 맡아요. */
  { key: "stamina", name: "체력", emoji: "🫀", sub: "지구력·회복" },
  { key: "speed", name: "스피드", emoji: "⚡", sub: "가속·순간 속도" },
];

// 포지션 — 야구의 '포지션' 대응. 주력 능력치가 달라져요
const POS_INFO = {
  fw: { name: "공격수", stat: "shoot" },
  mf: { name: "미드필더", stat: "pass" },
  df: { name: "수비수", stat: "defense" },
  wg: { name: "윙어", stat: "dribble" },
};

/* 리그 사다리 — 축구 커리어의 핵심 서사는 리그를 옮기는 거예요.
 * 축이 셋이고 서로 하는 일이 달라요.
 *
 *  · penalty  — 경기 평점에서 빼요. 위쪽 리그에만 걸어요.
 *  · bar      — 수상 문턱과 라이벌 분포에 곱해요. 경쟁 강도예요.
 *  · prestige — 축(hype)과 명예의 전당 점수에 곱해요. 같은 상의 값어치예요.
 *
 * 난이도를 곱셈이 아니라 평점에서 빼는 게 핵심이에요.
 * perf = clamp((rating - 5) / 4 + 0.6, 0.15, 1.6)이 평점의 비선형 함수라,
 * 평점을 깎으면 약한 선수가 훨씬 크게 무너져요. 강한 선수는 상한 근처라 덜 다칩니다.
 * 곱셈으로 해봤더니 순효과가 균일해서 능력치와 무관하게 올라갈수록 유리했어요.
 *
 * tier가 리그의 순서예요. id는 옛 세이브의 S.league가 가리키는 값이라 절대 안 바꿔요 —
 * 번호를 다시 매기면 진행 중인 캐릭터가 엉뚱한 리그로 갑니다. 새 하부 리그는 새 id를 받아요.
 *
 * 처음엔 prestige만으로 하부 리그를 표현하려 했는데, 그러면 축이 같이 줄어서
 * 하부가 오히려 더 어려워졌어요 (능력치 90에서 K리그3 1% 대 K리그1 14%).
 * 평점 보너스로 메우려 해도 perf의 상한(1.6)에 막혀요.
 * 하부 리그가 쉬운 건 내가 잘해서가 아니라 경쟁자가 약하기 때문이에요 — 그게 bar예요.
 * 그래서 penalty는 위쪽에만 쓰고 하부는 0이에요.
 *
 * 값은 감이 아니라 시뮬레이션으로 잡았어요. 판단 기준은 수상 확률이 아니라
 * '리그MVP 확률 × prestige'(명예의 전당 가치)고, 능력치 70/90/110/130/150에서
 * 최적 리그가 K리그3 → K리그2 → 유로파 → 유로파 → 챔피언스리그로 올라가게 맞췄어요.
 * tests/soccer/ladder-test.js가 그 사다리를 지킵니다.
 *
 * career.js가 아니라 여기 두는 건 career.js가 IIFE라 그 안의 선언이 밖으로 안 새기
 * 때문이에요. 클럽 전력·동료 득점처럼 game.js 쪽에서도 리그를 읽어야 해요. */
/* 리그 — 나라마다 1부·2부를 둬요 (한국만 3부까지).
 *
 * 예전에는 K리그3 → K리그2 → K리그1 → 유로파리그 → 챔피언스리그 다섯 칸이었어요.
 * 유스는 나라별로 고르게 해놓고(🇰🇷🇪🇺🇧🇷🇯🇵🌍) 정작 리그에는 나라가 없어서,
 * 국적이 debut·growth·spot 수치에만 쓰이고 데뷔하는 순간 사라졌습니다.
 *
 * ⚠️ **id는 옛 세이브가 가리키는 값이라 안 바꿔요.** 그래서 기존 다섯 리그는
 * id와 구단 명단을 그대로 두고 **이름만** 나라로 바꿨어요 —
 * 유로파리그 → 🇬🇧 챔피언십, 챔피언스리그 → 🇬🇧 프리미어리그.
 * 진행 중이던 캐릭터는 같은 클럽에서 같은 상대와 계속 뜁니다. 이름만 바뀌어요.
 * 새로 더한 여섯 리그는 새 id(6~11)를 씁니다.
 *
 * tier는 **전역 난이도 순서**예요(1~11). 나라 안 순서가 아니라 사다리 전체의 순서라,
 * 잉글랜드 2부(t9)가 이탈리아 1부(t10)보다 아래에 있는 것도 자연스러워요.
 * 승강제는 나라 안에서만 돌아요 — career.js의 COUNTRY_TIERS를 보세요. */
const LEAGUES = [
  { id: 5,  tier: 1,  country: "kr", name: "K리그3",     short: "K3", flag: "🇰🇷", penalty: 0,    prestige: 0.55, bar: 0.50 },
  { id: 4,  tier: 2,  country: "kr", name: "K리그2",     short: "K2", flag: "🇰🇷", penalty: 0,    prestige: 0.85, bar: 0.75 },
  { id: 1,  tier: 3,  country: "kr", name: "K리그1",     short: "K1", flag: "🇰🇷", penalty: 0,    prestige: 1.00, bar: 1.00 },
  { id: 6,  tier: 4,  country: "jp", name: "J2리그",     short: "J2", flag: "🇯🇵", penalty: 0.35, prestige: 1.08, bar: 1.03 },
  { id: 8,  tier: 5,  country: "br", name: "브라질 세리에B",   short: "브B", flag: "🇧🇷", penalty: 0.6,  prestige: 1.18, bar: 1.06 },
  { id: 7,  tier: 6,  country: "jp", name: "J1리그",     short: "J1", flag: "🇯🇵", penalty: 0.85, prestige: 1.32, bar: 1.08 },
  { id: 9,  tier: 7,  country: "br", name: "브라질 세리에A",   short: "브A", flag: "🇧🇷", penalty: 1.1,  prestige: 1.48, bar: 1.10 },
  { id: 10, tier: 8,  country: "it", name: "세리에B", short: "세B", flag: "🇮🇹", penalty: 1.35, prestige: 1.60, bar: 1.11 },
  { id: 2,  tier: 9,  country: "en", name: "챔피언십", short: "챔십", flag: "🇬🇧", penalty: 1.6,  prestige: 1.75, bar: 1.12 },
  { id: 11, tier: 10, country: "it", name: "세리에A", short: "세A", flag: "🇮🇹", penalty: 2.1,  prestige: 2.05, bar: 1.22 },
  { id: 3,  tier: 11, country: "en", name: "프리미어리그", short: "PL", flag: "🇬🇧", penalty: 2.8,  prestige: 2.40, bar: 1.30 },
];
const BIG_CLUB_LEAGUE = 2;   // 👑 유럽 빅클럽 입단이 데뷔하는 곳 — 🇬🇧 챔피언십

/* 🌍 나라 특색 — 리그를 고를 이유를 **수상 값어치 말고 다른 축**에 둬요.
 *
 * 예전에는 리그의 가치가 prestige 하나뿐이었어요. 그래서 "어느 리그에 머물까"가
 * 곧 "어디서 상을 받아야 명예의 전당 점수가 큰가" 하나로 수렴했고,
 * 실측하니 능력치 62~150 어디에서도 최적은 한국 3부 · 한국 2부 · 잉글랜드 2부 ·
 * 잉글랜드 1부 넷뿐이었습니다 — 나머지 일곱 리그는 거쳐만 가는 계단이었어요.
 *
 * 그렇다고 수상 문턱(bar)으로 잡을 수는 없어요. bar는 문턱과 경쟁자 분포를
 * 동시에 움직여서, 0.07만 올려도 최적이 통째로 하부 리그로 뒤집힙니다(실측).
 * 그런 값에 밸런스를 걸면 리그를 하나 더할 때마다 전부 다시 재야 해요.
 *
 * 그래서 곱셈 하나씩만 겁니다. 서로 다른 축이라 knife-edge가 안 생기고,
 * 유스 국적이 이미 growth·spot을 갖고 있는 것과 같은 결이에요.
 *   train    훈련으로 오르는 양
 *   rest     휴식으로 도는 컨디션
 *   money    경기 수당·계약금
 *   focus    특정 능력치만 더 오르는 자리 (그 나라가 잘 가르치는 것) */
const COUNTRY_TRAIT = {
  kr: { rest: 1.30, desc: "회복이 빨라 훈련을 더 자주 돌릴 수 있어요", tag: "🛌 회복 +30%" },
  jp: { train: 1.15, desc: "정교한 시스템 — 훈련 효율이 높아요", tag: "🎓 훈련 +15%" },
  br: { focus: "dribble", focusMul: 1.45, desc: "길거리 축구의 나라 — 드리블이 유난히 빨리 늘어요", tag: "🏃 드리블 +45%" },
  it: { focus: "defense", focusMul: 1.45, desc: "빗장수비의 나라 — 수비가 유난히 빨리 늘어요", tag: "🛡️ 수비 +45%" },
  en: { money: 1.35, desc: "돈이 도는 리그 — 수당과 계약금이 커요", tag: "💰 수입 +35%" },
};
/* 지금 소속 리그의 나라 특색. 모르는 값이면 아무 효과 없는 빈 객체예요 —
 * 옛 세이브나 깨진 값에서도 곱셈이 1로 떨어집니다. */
function traitOf(st) {
  const c = leagueOf(st).country;
  return COUNTRY_TRAIT[c] || {};
}
const traitMul = (st, key) => {
  const v = traitOf(st)[key];
  return typeof v === "number" && isFinite(v) ? v : 1;
};
// 그 능력치가 이 나라의 '잘 가르치는 것'이면 배수를, 아니면 1을 돌려줘요.
function traitFocusMul(st, statKey) {
  const t = traitOf(st);
  return t.focus === statKey ? (t.focusMul || 1) : 1;
}

/* 옛 세이브에는 S.league가 없어요. 마이그레이션하지 않고 없으면 K리그1로 봐요.
 * 깨진 값도 K리그1로 막아요 — 표의 첫 줄이 이제 K리그3라 LEAGUES[0]으로 막으면
 * 손상된 세이브가 하부 리그로 떨어집니다. */
function leagueOf(st) {
  const id = (st && st.league) || 1;
  return LEAGUES.find((l) => l.id === id) || LEAGUES.find((l) => l.id === 1) || LEAGUES[0];
}

// 경쟁 강도. 옛 세이브·깨진 값에서도 1(= K리그1과 같음)로 막아요.
function barOf(st) {
  const b = leagueOf(st).bar;
  return typeof b === "number" && isFinite(b) ? b : 1;
}

/* 사다리의 맨 아래 리그예요. 📹 세미프로 입단이 여기서 프로를 시작해요.
 * id로 찾지 않아요 — id는 옛 세이브가 가리키는 값이라 순서와 무관해요. 순서는 tier예요. */
function bottomLeague() {
  return LEAGUES.reduce((lo, l) => (l.tier < lo.tier ? l : lo), LEAGUES[0]);
}

/* 클럽 — 전력(str)은 팀 성적에만 작용해요. 개인 수상에는 안 닿습니다.
 * 같은 리그 안에서 전력 좋은 팀으로 가면 팀은 더 이기지만 내 수상 확률은 그대로예요.
 * 이게 리그 이적(개인 커리어)과 명확히 구분되는 지점이에요.
 *
 * 리그 티어는 "내가 어디까지 통하나"를 묻고, 클럽 전력은 "우리 팀이 이기나"를 물어요.
 * 두 축이 겹치면 같은 리그 이적과 상위 리그 이적이 같은 질문이 돼서 선택이 사라져요.
 *
 * 실제 구단명은 쓰지 않아요 — 이 저장소는 상표를 전부 가상 명칭으로 바꿨어요.
 *
 * ⚠️ **구단 이름은 그 리그의 나라를 따라가요.** 나라별 리그가 생기기 전에 지은
 * 이름이라 K리그3에 '하버라이트·머드독스·스톤워커스'가 있었고, 🇬🇧 챔피언십에는
 * '레알 몬테·아틀레티코 델'(스페인·이탈리아풍)이 있었어요. 리그 이름과 구단
 * 이름이 어긋나면 그 리그가 어느 나라인지가 안 읽혀요.
 *
 * 표는 사다리 아래(K리그3)부터 적어요. 키는 리그 id고, id는 옛 세이브가 가리키는 값이라
 * 순서와 무관해요 — 순서는 LEAGUES의 tier예요.
 * 전력은 clubStrOf가 40~95로 막으니 하부 클럽도 40 아래로는 안 내려가요.
 * 그 아래를 적으면 화면에 보이는 전력과 실제로 쓰이는 전력이 어긋나요. */
const CLUBS = {
  5: [
    { name: "한터 FC", str: 45 }, { name: "솔뫼 시티", str: 44 },
    { name: "아라 유나이티드", str: 43 }, { name: "새벌 FC", str: 42 },
    { name: "달구벌 워리어스", str: 41 }, { name: "노들 FC", str: 40 },
  ],
  4: [
    { name: "낙동 FC", str: 51 }, { name: "서라벌 유나이티드", str: 49 },
    { name: "관악 시티", str: 47 }, { name: "영산 FC", str: 45 },
    { name: "두류 워리어스", str: 43 }, { name: "미르내 FC", str: 41 },
  ],
  1: [
    { name: "한강 FC", str: 78 }, { name: "태백 타이거즈", str: 71 },
    { name: "금강 유나이티드", str: 66 }, { name: "백두 시티", str: 62 },
    { name: "청해 FC", str: 57 }, { name: "소백 그린", str: 52 },
  ],
  2: [
    { name: "노스우드 유나이티드", str: 84 }, { name: "스톤브리지 FC", str: 79 },
    { name: "밀턴 시티", str: 74 }, { name: "킹스랜드 FC", str: 70 },
    { name: "오크데일 유나이티드", str: 65 }, { name: "하버셔 FC", str: 61 },
  ],
  3: [
    { name: "로열 알비온", str: 93 }, { name: "킹스포드 유나이티드", str: 90 },
    { name: "브리지포트 FC", str: 87 }, { name: "웨스트게이트", str: 84 },
    { name: "크라운 시티", str: 81 }, { name: "아이언브리지 FC", str: 78 },
  ],
  /* 🇯🇵 일본 2부 (t4) — 한국 1부보다 살짝 위. 실제 구단명은 안 써요, 전부 가상입니다. */
  6: [
    { name: "사쿠라 유나이티드", str: 74 }, { name: "미도리 FC", str: 70 },
    { name: "아오바 윙스", str: 66 }, { name: "하야테 클럽", str: 63 },
    { name: "코가네 SC", str: 60 }, { name: "시오카제 FC", str: 57 },
  ],
  // 🇧🇷 브라질 2부 (t5)
  8: [
    { name: "베르지 FC", str: 75 }, { name: "마르 아줄", str: 71 },
    { name: "세하도 SC", str: 68 }, { name: "아마조나 FC", str: 65 },
    { name: "카에테 유나이티드", str: 62 }, { name: "솔 나센치", str: 59 },
  ],
  // 🇯🇵 일본 1부 (t6)
  7: [
    { name: "텐류 FC", str: 77 }, { name: "스이세이 클럽", str: 73 },
    { name: "아카츠키 FC", str: 70 }, { name: "시라유키 SC", str: 67 },
    { name: "라이진 유나이티드", str: 64 }, { name: "미나토 FC", str: 61 },
  ],
  // 🇧🇷 브라질 1부 (t7)
  9: [
    { name: "도라도 FC", str: 79 }, { name: "코리엔치 SC", str: 75 },
    { name: "삼바 리오", str: 72 }, { name: "아틀란치코", str: 69 },
    { name: "에스트렐라 두 술", str: 66 }, { name: "카파오 FC", str: 63 },
  ],
  // 🇮🇹 이탈리아 2부 (t8)
  10: [
    { name: "스페란차 FC", str: 80 }, { name: "몬테로소 칼초", str: 76 },
    { name: "라바로 SC", str: 73 }, { name: "코스타 도라", str: 70 },
    { name: "벤토 노르드", str: 67 }, { name: "알바트로 FC", str: 64 },
  ],
  // 🇮🇹 이탈리아 1부 (t10) — 잉글랜드 2부보다 위, 잉글랜드 1부보다 아래
  11: [
    { name: "아우렐리아 FC", str: 88 }, { name: "임페리오", str: 84 },
    { name: "세렌티나", str: 80 }, { name: "콜로세오 SC", str: 76 },
    { name: "벨라 코스타", str: 73 }, { name: "티레노 FC", str: 70 },
  ],
};;

// 옛 세이브에는 S.clubStr이 없어요. 마이그레이션하지 않고 없으면 70으로 봐요.
function clubStrOf(st) {
  const v = st && st.clubStr;
  return typeof v === "number" && isFinite(v) ? clamp(v, 40, 95) : 70;
}

/* 🌍 리그 명단 — **승강으로 실제로 오가는 세계**.
 *
 * CLUBS는 '시작 명단'이에요. 예전에는 이게 곧 세계라서, 내가 승격해도 다른 팀은
 * 아무 데도 안 갔어요. 그래서 새 리그 목록에 내 클럽이 없었고, 순위표가 7팀이
 * 되면서 매 라운드 한 팀이 쉬었습니다(경기 수가 26·22·19로 갈렸어요).
 *
 * 제보: "내가 승격하면 다른 한 팀은 강등되었어야지.
 *        경기·팀·선수·기록·점수 이런 건 전부 싱크가 잘 맞아야 해."
 *
 * 그래서 승강이 일어난 리그만 세이브(S.world)에 남겨요. 한 번도 안 건드린
 * 리그는 CLUBS 그대로라 세이브가 커지지 않고, 옛 세이브도 그냥 동작해요.
 * 아래 oppClubs·leagueClubs·순위표·이적 제안·컵 대진이 전부 이걸 봅니다 —
 * 한 곳이라도 CLUBS를 직접 보면 그 화면만 옛 세계를 보여주게 돼요. */
function clubsIn(id, st) {
  const S0 = st || (typeof S !== "undefined" ? S : null);
  const w = S0 && S0.world && S0.world[id];
  return Array.isArray(w) && w.length ? w : (CLUBS[id] || CLUBS[1] || []);
}

// 상대 팀은 같은 리그에서 뽑아요. 내 클럽은 빼고요.
function oppClubs(st) {
  const list = clubsIn(leagueOf(st).id, st);
  const names = list.map((c) => c.name).filter((n) => n !== (st && st.group));
  return names.length ? names : list.map((c) => c.name);
}

/* 이름으로 클럽 전력을 찾아요. 리그 경기의 상대는 이름만 들고 다니는데,
 * 팀 결과가 **전력 대 전력**으로 갈리려면 그 숫자가 필요해요.
 * 세이브의 세계(S.world)를 먼저 봐요 — 승격·강등으로 명단이 바뀌면 CLUBS는 낡아요. */
function clubStrByName(name, st) {
  const S0 = st || (typeof S !== "undefined" ? S : null);
  for (const lg of LEAGUES) {
    const hit = clubsIn(lg.id, S0).find((c) => c && c.name === name);
    if (hit) return hit.str;
  }
  return null;
}

/* 리그의 **모든** 클럽 — 내 클럽까지 넣어요.
 * 경쟁자 명단을 oppClubs로 뽑았더니 우리 팀 선수가 개인 순위에도 평점표에도
 * 한 번도 안 나왔어요. 리그 득점왕 표에 우리 팀 선수가 없는 건 이상하죠.
 * 승격·이적 직후에는 내 클럽이 CLUBS 목록에 없을 수 있어서 따로 넣어 줍니다. */
function leagueClubs(st) {
  const list = clubsIn(leagueOf(st).id, st);
  const names = list.map((c) => c.name);
  const mine = st && st.group;
  if (mine && !names.includes(mine)) names.push(mine);
  return names;
}

/* 선수 이름 — 예전에는 홑이름 12개뿐이라 "도현" 같은 이름만 나왔어요.
 * 성을 붙여 실제 선수 이름처럼 보이게 하고, 유스 시장에 따라 계열을 바꿔요.
 *
 * 명예의 전당에 올라온 이름을 재사용하자는 의견이 있었지만 쓰지 않았어요.
 * 플레이어가 직접 입력한 값이라 실존 인물 이름이 섞일 수 있고, 그러면
 * 실존 구단명을 가상화했던 것(2.7.1·2.8.1·2.10.2)과 같은 문제가 됩니다.
 * 대신 조합 수를 400개 이상으로 늘려 겹칠 일을 줄였어요. */
const KR_SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
                "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const KR_GIVEN = ["도현", "시우", "주원", "하준", "은우", "서준", "민준", "지호", "예준", "선우",
                  "연우", "유준", "시윤", "이준", "건우", "서진", "현우", "우진", "도윤", "지훈"];
// 유럽 쪽은 실존 선수와 겹치지 않게 흔한 이름과 흔한 성을 따로 섞어요
const EU_FIRST = ["리오", "카이", "마테오", "루카", "지안", "니코", "티모", "엔조",
                  "라파", "오스카", "빅토르", "레안", "밀란", "요난", "다니", "파블로"];
const EU_LAST = ["베르너", "포르테", "린드블롬", "카스티요", "모레티", "반더르", "라이너", "델가도",
                 "노바크", "피셔", "코발", "산토", "베르그", "듀몽", "리케르", "말디니"];
const PLAYER_NAMES = KR_GIVEN;          // 옛 코드가 참조할 수 있어 남겨둬요
function randomPlayerName(market) {
  const eu = market && market.id === "eu";
  // 유럽 유스라도 한국 선수가 갈 수 있으니 완전히 가르지는 않아요
  if (eu ? Math.random() < 0.7 : Math.random() < 0.15) return `${pick(EU_FIRST)} ${pick(EU_LAST)}`;
  return `${pick(KR_SUR)}${pick(KR_GIVEN)}`;
}

/* 🥇 개인 순위 경쟁자 — **리그의 모든 선발**이 골·도움·수비·평점을 쌓아요.
 *
 * 예전에는 부문상이 `if (골 >= rand(51,72) * bar)`처럼 **랜덤 문턱**이었어요.
 * 리그에 몇 골을 넣은 선수가 있는지 게임이 아예 몰랐습니다. 그래서 득점 순위표를
 * 화면에만 붙이면 표와 수상이 서로 모르는 사이가 돼요 — 이 게임에서 여러 번
 * 반복된 병입니다(반복 문제 유형 8번).
 *
 * 이제 경쟁자를 실제로 두고, 부문상은 **그 표에서 1위**면 받아요.
 * 화면에 보이는 경쟁이 곧 수상 판정이에요.
 *
 * ⚠️ 그다음에 또 한 번 같은 병이 났어요. 경쟁자를 **시즌 초에 실력 상위 여덟만**
 * 뽑아 두고 그들만 굴렸는데, 그러면 다른 클럽의 아홉 번째 선수는 아무리 잘해도
 * 표에 못 올라옵니다 — 명단 화면에는 있는데 순위표에는 없는 사람이 88명이었어요
 * (제보: "전체 리그 선수들 대상으로 다 해야 해"). 지금은 매 라운드 6팀 선발
 * 66명이 전부 자기 경기를 치르고, 기록은 **명단 한 벌**(S.squads)에만 쌓여요.
 *
 * 경쟁자 생산량은 **그 선수의 실력(pop)**만 따라가요. 리그 수준은 이미 그 안에
 * 들어 있어서, 리그 격을 또 곱하면 같은 축을 두 번 세는 셈이에요(raceLam 주석 참고).
 * 하부 리그에서는 상을 쓸어 담지만 값어치(prestige)가 작고, 상위 리그에서는
 * 득점왕 하나가 어렵습니다 — "쉬운 상 vs 값진 상" 축은 그대로예요. */
const RACE_ROLES = [
  { key: "st", name: "스트라이커", g: 1.00, a: 0.30, d: 0.45 },
  { key: "st2", name: "포처", g: 0.92, a: 0.35, d: 0.40 },
  { key: "wg", name: "윙어", g: 0.72, a: 0.62, d: 0.55 },
  { key: "am", name: "플레이메이커", g: 0.42, a: 0.95, d: 0.75 },
  { key: "mf", name: "중원 사령관", g: 0.35, a: 0.82, d: 1.15 },
  { key: "cb", name: "센터백", g: 0.10, a: 0.20, d: 2.35 },
  { key: "cb2", name: "수비 리더", g: 0.12, a: 0.24, d: 2.10 },
  { key: "ut", name: "만능 자원", g: 0.55, a: 0.55, d: 1.20 },
];
/* 한 경기 기대치. **그 선수의 실력(pop)만** 봐요.
 *
 * ⚠️ 예전에는 리그 격(prestige)도 함께 곱했어요. 그때는 경쟁자를 여덟 명만 두고
 * pop을 rand(52,88)로 **지어냈기 때문**이에요 — 지어낸 실력에는 리그 수준이
 * 안 들어 있으니 격을 따로 실어 줘야 했습니다.
 *
 * 이제 경쟁자가 **리그 명단의 실제 선수 전원**이고 pop이 그 선수의 실력이라,
 * 리그 수준은 이미 그 안에 들어 있어요. 격을 또 곱하면 **같은 축을 두 번 세는
 * 셈**입니다 — 이 저장소가 발롱도르에서 이미 한 번 겪은 자리예요.
 *
 * 실측(스트라이커 한 시즌 38경기 기대 골):
 *   격을 함께 곱하면  K3 14 · K1 22 · PL 44   ← PL에서는 종합 130도 득점왕이 2%
 *   실력만 보면       K3 18 · K1 22 · PL 28   ← 리그가 셀수록 어렵되 닿기는 해요
 *
 * 계수는 실측으로 잡았어요 (능력치 100 공격수 · 38경기 · 리그 전 선발과 겨뤄서). */
const raceLam = (base, pop) => base * ((pop || 70) / 70) * 1.67 * GOAL_SCALE;

// 평가 경기 종목: 주 스탯 / 보조 스탯 가중치
/* `kind` — ⚔️ 그 경기의 순간 카드가 무엇으로 열리는가 (g 결정 · a 전개 · d 수비).
 * 화면에 이미 "2번째 경기 · 수비 조직"이라고 적혀 있고 점수도 defense로 재요.
 * 거기서 오는 카드가 🧱 차단이어야 화면과 손이 같은 말을 합니다.
 * null이면 **내 포지션이 정해요**(momentKind) — "포지션 자유"가 그 뜻이에요. */
const STAGE_TYPES = [
  { name: "공격 전개", main: "shoot", aux: "dribble", kind: "g" },
  { name: "중원 장악", main: "pass", aux: "stamina", kind: "a" },
  { name: "수비 조직", main: "defense", aux: "stamina", kind: "d" },
  { name: "포지션 자유", main: null, aux: "stamina", kind: null }, // main = 내 포지션 스탯
];

const EVALS = { 6: "상반기 유스 리그", 12: "연말 평가전" };
const SURVIVAL_ROUNDS = ["구단 트라이아웃", "2군 테스트", "1군 콜업", "프로 계약"];

// ---------- 상태 ----------
const SAVE_KEY = "winger2-save-v1";

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
let S = null;
let ev = null; // 진행 중인 대회/프로 도전

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const STAT_CAP = 130;
const fmtMoney = (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v)}만`);

/* 🌱 첫 능력치는 **유망주 카드**가 정해요 (prospect.js · §6-2).
 *
 * 예전에는 여기서 `rollStats(pos)`로 굴리고 화면의 "🎲 능력치 다시 뽑기"를
 * **무제한**으로 눌렀어요(현행 ⚽ 더 윙어 그대로). 그러면 타고난 것이 아무 의미가
 * 없어집니다 — 마음에 들 때까지 누르면 되니까요. 유스5 × 포지션4 × 주발2 = 40조합이
 * 전부 같은 출발선이 된 것도 같은 뿌리예요.
 *
 * 이제 🧬 **조립대에서 한 명을 만듭니다** (2026-08-30 · 3택 폐기). 🎲 다시 뽑기가
 * 돌아왔지만 예전과 형태가 달라요 — **총합이 정확히 194로 고정**이라 굴려도 모양만
 * 바뀌고, ⭐ 잠재력·🧬 성장타입·⭐ 특능·🩹 결함은 **첫 굴림에 잠깁니다.**
 * 무제한이 위험했던 건 횟수가 아니라 **총합이 기댓값이었기 때문**이에요. */
function newState(market, pos, name, roll) {
  const { stats, talents } = roll;
  return {
    market: market.id, pos, name,
    year: 1, month: 1,
    /* 🎂 나이는 조립대가 정해요(만 17세 — 유스 3년을 지나 만 20세에 데뷔합니다).
     * applyCard가 바로 뒤에 덮어써요 — 여기 값은 조립대 없이 만들어지는
     * 경로(검사·픽스처)의 기본값이라 옛 세이브 기본값(START_AGE)과 같이 둡니다. */
    age: WingerProspect.START_AGE,
    stats, talents,
    foot: rollFoot(),          // 🦶 주발·약발 — 타고나고 경기에서 붙어요

    /* 새 선수는 1부에서 시작해요. 소속 클럽은 프로 데뷔(enterCareer) 때 정해지고,
     * 그때까지는 기본 전력 70으로 유스 경기를 치러요. */
    league: 1,
    clubStr: 70,
    // 🧬 환생 유산으로 받은 시작 자금이에요. 유산이 없으면 0이에요.
    money: legacyMoneyBonus(loadLegacy().pts),
    gear: {},
    condition: 80,
    fandom: 0, // 명성·스카우트 주목도
    buff: false,
    trophies: [],
    cup: null,          // 🏆 진행 중인 컵 대회 (없으면 null)
    cupPrep: false,     // 🏆 컵 8강 전 준비 중인가
    cupReady: false,    // 🏆 준비가 끝나 시작 버튼만 남은 상태
    stages: 0, // 출전 경기 수
    youth: { g: 0, a: 0, def: 0 }, // 유스 통산 골·도움·수비
    log: [],
  };
}

const marketOf = () => MARKETS.find((m) => m.id === S.market);
/* 📣 **주목 배수** — 유스의 `spot`에 🏟️ 입단 제안 등급이 **한 겹** 곱해집니다 (85번 §2-2).
 *
 * 🔴 **동네가 닿는 축은 여기 하나뿐이에요.** `growth`·`debut`에는 한 톨도 안 닿습니다:
 *   `growth`는 **36턴 복리**라 조작 3장을 걸면 육성이 아니라 **처벌**이 되고,
 *   `debut`은 유스 선택의 **트레이드오프 축**이라 닿으면 *"못한 사람이 오히려 데뷔가
 *   쉬워지는"* 뒤집힘이 납니다.
 * 🔴 **이 자리를 지키는 검사가 아직 없습니다** (91번 §5). 실측으로는 확인했어요 —
 *    `spotMul`을 0.90 ↔ 1.10으로 흔들어도 24짝 전부에서 `growth`·`debut`과
 *    36턴 훈련 궤적이 **비트 단위로 같습니다.** 검사는 inspector에게 넘겼습니다.
 * ✅ `spot`이 **곱**이라 *"덜 키운 쪽은 +0"*이 산식으로 보장되고(원칙 ⑥),
 *    ⭐ 명성은 누적·무상한이라 `score = fandom + overall()×2`에 **훈련으로 만회할 길**이
 *    이미 들어 있습니다(선형 누적 — 복리와 다릅니다).
 * ⚠️ 새 필드예요. **마이그레이션 없이 읽는 쪽에서 기본값 1**(= 중립)을 줍니다. */
const spotOf = (m) => ((m && m.spot) || 1) * ((S && S.spotMul) || 1);
/* ⚡ 스피드 칸이 없는 옛 세이브는 **그 선수의 평균**으로 읽어요.
 *
 * 평균을 넣으면 종합이 정확히 그대로예요 — (합 + 평균) ÷ 6 = 평균.
 * 0이나 고정값을 넣으면 이어하던 선수의 종합이 그 자리에서 움직이고,
 * 종합은 클래스·부문상·수상·이적을 전부 굴리는 값이라 커리어가 통째로 흔들려요.
 * 새 축을 넣을 때 기본값이 중립이 아니면 그건 기능 추가가 아니라 밸런스 변경입니다. */
function fillStats(st) {
  const S0 = st || S;
  if (!S0 || !S0.stats) return S0;
  const base = STAT_KEYS.filter((k) => k !== "speed");
  if (S0.stats.speed == null) {
    const have = base.filter((k) => S0.stats[k] != null);
    const mean = have.length ? have.reduce((a, k) => a + S0.stats[k], 0) / have.length : 40;
    S0.stats.speed = Math.round(mean * 10) / 10;
  }
  /* 🦶 주발이 없던 세이브 — 여기서 한 번 타고나요.
   * 기본값만 주면(오른발·약발 5) 화면에는 뜨지만 **약발이 영영 안 자라요**
   * (자라는 자리가 `S.foot`이 있을 때만 도니까요). 그건 이어서 하는 사람만
   * 못 크는 것이라, 세이브에 실제로 심어 줍니다. */
  if (!S0.foot) S0.foot = { main: Math.random() < 0.75 ? "R" : "L", weak: randInt(2, 7) };
  /* 🎂 나이 칸이 없던 세이브 — 여기서 **한 번 심어요.**
   *
   * `ageOf`가 `year`·`proYear`에서 되짚어 주긴 하지만, 그건 **읽을 때마다 다시 계산**돼요.
   * 그러면 `birthday()`가 도는 순간이 시즌 카운터를 올린 뒤인지 앞인지에 따라
   * **한 해에 두 살**을 먹습니다(21 → 23). 실제로 그 버그를 냈고 검사가 잡았어요.
   * 한 번 심어 두면 그 뒤로는 `S.age`만 보니 부르는 순서와 무관해집니다.
   * 🦶 주발을 심는 바로 위 줄과 같은 이유예요. */
  if (S0.age == null) S0.age = WingerProspect.ageOf(S0);
  if (S0.talents && S0.talents.speed == null) {
    const have = base.filter((k) => S0.talents[k] != null);
    S0.talents.speed = have.length ? have.reduce((a, k) => a + S0.talents[k], 0) / have.length : 1;
  }
  return S0;
}
/* 🎯 **지금 실력**의 단일 관문 — `S.stats`(정점 기준값)에 나이곡선을 곱한 값이에요.
 *
 * 동료(NPC)는 이미 이렇게 삽니다 — `squad.js`의 `strOfRow`가 `peak × ageCurve(age)`로
 * *지금 실력*을 내요. 여태 **나만 그 자를 안 썼습니다.** 그래서 열여덟도 서른여섯도
 * 능력치표가 곧 실력이었고, 선발 경쟁에서 나만 다른 눈금으로 재고 있었어요.
 *
 * ⚠️ 훈련·각성·장비·상한(`statCap`)은 **`S.stats` 원본**을 봅니다. 올리는 건 정점 기준값,
 *    지금 내는 건 그 값 × 곡선 — 둘을 섞으면 훈련 화면이 자기 숫자를 못 믿게 돼요. */
const overall = () => {
  fillStats(S);
  const now = WingerProspect.nowStats(S);
  const vals = STAT_KEYS.map((k) => now[k]).filter((v) => v != null);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

/* 🎖️ 시즌 칭호 — **지난 시즌에 해낸 일로 받아서, 이번 시즌 경기에만 붙는 효과**예요.
 *
 * 아래 PLAYER_TITLES(클래스)와는 완전히 다른 물건입니다. 클래스는 능력치에서
 * 자동으로 나오는 라벨이라 "받는" 게 아니고, 경기에도 관여하지 않아요.
 * 여기 있는 건 시즌이 끝날 때 성적을 보고 주는 것이고, 다음 시즌 한 해만 갑니다.
 *
 * 효과가 붙는 자리 — 전부 경기 안입니다.
 *   g·a·d  matchContribution의 골·도움·수비 기댓값 (리그·컵 둘 다 이 함수를 씁니다)
 *   rate   ratingOf의 경기 평점
 *   moment autoRes의 승부처 성공 확률
 *   train  훈련 상승폭
 *
 * 여러 개를 동시에 달 수 있어요 — 한 시즌을 지배하면 그만큼 다음 시즌이 편해야죠.
 * 대신 종류별 합계에 상한(BUFF_CAP)을 둡니다. 안 그러면 한 번 앞서간 커리어가
 * 영원히 앞서가요.
 *
 * 시즌이 끝나면 조건을 다시 보고 새로 정해요. 지난 시즌 것은 그냥 사라집니다 —
 * 유지하려면 그 성적을 또 내야 해요. 그게 이 장치의 재미입니다. */
/* 🔥 물오른 폼 문턱 — 시즌 평균 평점.
 * 득점 눈금(GOAL_SCALE)을 넣으면서 평점 분포가 내려왔어요(종합 85 기준 8.1 → 6.8).
 * 7.5로 두면 종합 115쯤 돼야 닿는 상이 됩니다. 실측에 맞춰 7.1로 내렸어요. */
const HOT_FORM_BAR = 7.1;
const SEASON_TITLES = [
  { id: "boot", name: "🥇 골든부츠 위너", need: "득점 1위",
    eff: { g: 0.15 }, desc: "골 +15%" },
  { id: "maker", name: "🎯 리그 최고 도우미", need: "도움 1위",
    eff: { a: 0.15 }, desc: "도움 +15%" },
  /* 🛡️ 판정 기준이 **무실점 경기 수 1위**로 바뀌었어요 (13번 §2-8b (4)).
   * need는 화면 문구일 뿐이지만, 여기가 틀리면 "수비 1위인데 칭호가 없다"로 읽혀요 —
   * 실제 판정은 raceTop("d")이고 그게 무실점을 봅니다. */
  { id: "wall", name: "🛡️ 리그 최고 수비수", need: "무실점 경기 1위",
    eff: { d: 0.15 }, desc: "수비 +15%" },
  { id: "point", name: "📈 공격포인트왕", need: "공격포인트 1위",
    eff: { g: 0.06, a: 0.06 }, desc: "골·도움 +6%" },
  { id: "ruler", name: "👑 리그의 지배자", need: "리그MVP 수상",
    eff: { rate: 0.35 }, desc: "경기 평점 +0.35" },
  { id: "ballon", name: "🏅 발롱도르 위너", need: "발롱도르 수상",
    eff: { g: 0.08, a: 0.08, d: 0.08, rate: 0.25 }, desc: "모든 기여 +8% · 평점 +0.25" },
  /* 🥈 베스트11만 칭호가 없었어요 — 결산에서 받는 상 여덟 개 중 유일하게
   * 빠져 있었습니다(제보). 한 부문 1위가 아니라 **그 시즌 리그 최고의 11인**에
   * 뽑힌 거라, 한 축이 아니라 모든 기여에 조금씩 붙여요. */
  { id: "eleven", name: "🥈 베스트11", need: "베스트11 선정",
    eff: { g: 0.05, a: 0.05, d: 0.05 }, desc: "모든 기여 +5%" },
  { id: "hot", name: "🔥 물오른 폼", need: `시즌 평균 평점 ${HOT_FORM_BAR} 이상`,
    eff: { moment: 0.08 }, desc: "승부처 성공 확률 +8%p" },
  { id: "champ", name: "🏆 챔피언", need: "리그 우승 또는 승격",
    eff: { rate: 0.2, moment: 0.04 }, desc: "평점 +0.2 · 승부처 +4%p" },
  /* 강등에도 하나 붙여요. 최악의 시즌 다음에 아무것도 없으면 그 커리어는 그냥
   * 아래로만 굴러갑니다 — 되돌아올 손잡이가 하나는 있어야 해요. */
  { id: "revenge", name: "🕯️ 설욕의 각오", need: "강등",
    eff: { g: 0.12, a: 0.12 }, desc: "골·도움 +12%" },
  { id: "rookie", name: "🌟 신인왕", need: "신인왕 수상",
    eff: { train: 0.15 }, desc: "훈련 상승폭 +15%" },
  /* 🌏 월드컵 우승 — **신설 칭호 중 가장 셉니다.**
   * 4년에 한 번뿐인 대회의 우승이라, 리그 한 부문 1위(+15%)나 발롱도르(+8%·평점 +0.25)
   * 위에 둡니다. BUFF_CAP이 종류별 합계를 잡아 주니 발롱도르와 겹쳐도 안 터져요.
   * 보상이 **다음 시즌 경기에서 체감되는** 유일한 축이에요 — 상금·명성·점수는
   * 숫자로만 남지만 이건 경기가 달라집니다. */
  { id: "wcwin", name: "🌏 월드컵 위너", need: "월드컵 우승",
    eff: { g: 0.10, a: 0.10, d: 0.10, rate: 0.3 }, desc: "모든 기여 +10% · 평점 +0.3" },
];
const BUFF_CAP = { g: 0.4, a: 0.4, d: 0.4, rate: 0.6, moment: 0.12, train: 0.3 };
/* 수상 이름 → 칭호. 조건을 따로 계산하지 않고 **화면에 뜬 수상 목록을 그대로**
 * 읽어요 — 따로 세면 결산에 뜬 상과 칭호가 어긋납니다. 이 게임에서 여러 번
 * 반복된 병이에요("표시와 판정이 서로 다른 것을 본다"). */
const AWARD_BUFF = {
  "골든부츠": "boot", "플레이메이커": "maker", "철벽상": "wall", "공격포인트왕": "point",
  "리그MVP": "ruler", "발롱도르": "ballon", "신인왕": "rookie", "베스트11": "eleven",
};
const seasonTitleOf = (id) => SEASON_TITLES.find((t) => t.id === id) || null;

/* 🌏 월드컵 소집 기간에만 붙는 임시 버프.
 *
 * ⚠️ **세이브에 안 남고, 끄는 코드도 없어요.** S.wc(진행 중인 대회)가 있을 때만
 * 목록에 끼어들었다가 대회가 끝나(S.wc = null) 저절로 사라집니다 — 해제를 잊을
 * 대상 자체가 없는 구조예요.
 *
 * 별도 배수(WC_TRAIN_MUL 같은 것)를 만들지 않고 **버프 체계 안에** 넣은 이유:
 * 훈련 버프에는 이미 BUFF_CAP.train(+30%) 상한이 있고, 그 상한은 "한 번 앞서간
 * 커리어가 영원히 앞서가는 것"을 막으려고 둔 거예요. 대회 경로만 그걸 비껴가면
 * 상한이 반쪽이 되고, 훈련 효율을 조정할 때 봐야 할 손잡이가 둘로 늘어납니다.
 * 🌟 신인왕(+15%)을 이미 달고 있으면 합이 상한에 걸려 월드컵 몫이 덜 실려요 —
 * 그게 상한이 있는 이유고, 의도된 동작입니다. */
const WC_CAMP_BUFF = {
  id: "wcCamp", name: "🌏 대표팀 훈련장", need: "월드컵 소집 기간",
  eff: { train: 0.3 }, desc: "훈련 상승폭 +30%",
};

/* 이번 시즌에 살아 있는 칭호. buffY가 지금 시즌과 같을 때만 들어요 —
 * 지난 시즌 것이 그대로 남으면 "한 번 잘하면 평생 간다"가 됩니다. */
function activeBuffs(st) {
  const S0 = st || (typeof S !== "undefined" ? S : null);
  if (!S0) return [];
  const out = (Array.isArray(S0.buffs) && S0.buffY === S0.proYear)
    ? S0.buffs.map(seasonTitleOf).filter(Boolean) : [];
  // 🌏 대회 중에만 — 시즌 칭호가 하나도 없어도 이건 붙어야 해서 위 갈래 밖에 둬요
  if (S0.wc) out.push(WC_CAMP_BUFF);
  /* 🎉 피버 타임 — 운영자가 연 기간 동안 모두에게 (fever.js)
   * `typeof window`까지 보는 이유: 이 저장소의 검사는 소스에서 함수를 떼어다
   * **브라우저 밖에서** 굴려요. 그냥 window를 쓰면 activeBuffs를 떼어 쓰는
   * 검사 13종이 ReferenceError로 죽습니다(실제로 한 번 그랬어요). */
  const fv = typeof window !== "undefined" && window.WingerFever && window.WingerFever.buff();
  if (fv) out.push(fv);
  return out;
}
/* 종류별 합계. g·a·d·train은 배수(1 + 합), rate·moment는 그대로 더해요.
 *
 * 🎉 피버 타임만 **상한 밖에서** 더해요. 상한은 "한 번 앞서간 커리어가 영원히
 * 앞서가는 것"을 막는 장치인데, 피버는 커리어가 쌓은 게 아니라 운영자가 모두에게
 * 준 것이고 기간이 지나면 사라져요. 안 그러면 칭호를 많이 단 사람에게는
 * 이벤트가 아무 일도 안 일어납니다 — 잘하는 사람만 이벤트에서 소외돼요.
 * 대신 fever.js가 읽을 때 스스로 상한(FEVER_CAP)을 겁니다. */
function buffSum(kind, st) {
  const list = activeBuffs(st);
  let sum = 0, bonus = 0;
  for (const t of list) {
    const v = t.eff[kind] || 0;
    if (t.id === "fever") bonus += v; else sum += v;
  }
  return Math.min(sum, BUFF_CAP[kind] != null ? BUFF_CAP[kind] : 1) + bonus;
}
/* 🦶 주발과 약발 — 능력치와 다른 축이에요.
 *
 * ⚠️ **자리를 여기 둔 이유**가 있어요. 이 저장소의 검사는 소스에서 산식을 떼어다
 * 브라우저 밖에서 굴리는데, matchContribution을 떼어 오는 검사 스무 개가 전부
 * `HOT_FORM_BAR ~ buffMul` 구간을 함께 떼어 옵니다. 그 구간 안에 두면 검사가
 * 저절로 따라와요 — 밖에 두면 스무 개가 한꺼번에 ReferenceError로 죽습니다
 * (실제로 그랬어요).
 *
 * 능력치 다섯은 훈련으로 올리는 값이지만, 약발은 **타고나고 경기에서 붙어요.**
 * 실제 축구에서 약발은 훈련장에서 몇 주 만에 만들어지는 게 아니라,
 * 그 발로 차야만 하는 상황을 겪으면서 늘어납니다.
 *
 * ⚠️ **기준을 5로 뒀어요.** 옛 세이브에는 이 칸이 없어서 읽는 쪽에서 5를 주는데,
 * 5가 배수 1.00이라 **이어하던 선수의 골이 하나도 안 움직여요.**
 * 새 축을 넣을 때 기본값이 중립이 아니면 그건 밸런스 변경이지 기능 추가가 아니에요.
 *
 * 폭은 ±6%로 좁게 잡았어요. 약발은 있으면 좋은 것이지, 이걸로 커리어가 갈리면
 * 타고난 값 하나가 실력을 이깁니다. */
const FOOT_MID = 5;
const FOOT_K = 0.012;                                  // 한 칸당 1.2%
const weakFoot = (st) => ((st || S).foot && (st || S).foot.weak) || FOOT_MID;
const footMul = (st) => 1 + (weakFoot(st) - FOOT_MID) * FOOT_K;   // 1 → 0.952 · 5 → 1.00 · 10 → 1.06
const mainFoot = (st) => (((st || S).foot && (st || S).foot.main) || "R");
const FOOT_KO = { R: "오른발", L: "왼발" };
/* 주발은 오른발이 흔해요 — 실제 프로 선수의 대략 4분의 3이에요. */
const rollFoot = () => ({ main: Math.random() < 0.75 ? "R" : "L", weak: randInt(2, 7) });

const buffMul = (kind, st) => 1 + buffSum(kind, st);

/* 🏷️ 클래스 — "지금 이 선수가 어느 급인가".
 *
 * 은퇴할 때 붙는 커리어 등급(gradeOfScore)과는 **다른 축**이에요.
 * 등급은 평생 쌓은 업적이라 안 줄어들지만, 칭호는 지금 실력이라 노쇠하면 내려가요.
 * 둘을 한 축으로 묶으면 "전성기가 지났는데도 세계 최고"가 됩니다.
 *
 * ── 눈금 ──
 * 실력 점수는 종합(스탯 평균, 상한 130 + 초월)이에요. 경쟁자는 pop(52~88)으로
 * 굴러서 자가 다른데, 실측으로 맞췄습니다 — "pop 70 경쟁자 8명과 대등해지는
 * 종합"을 리그마다 재면 K리그3 55.7 · K리그1 63.4 · 챔피언십 97.8 ·
 * 프리미어리그 117.5가 나와요. 여기에 직선을 맞춘 게 raceStr입니다(최대 오차 5).
 *
 * ── 문턱을 어디에 뒀나 ──
 * 각 리그의 **중간 선수**가 이렇게 불리도록 잡았어요.
 *   K리그3 52.9 🧢 리그 주전 · K리그1 68.6 💪 리그 정상급
 *   챔피언십 94.8 🏅 국가대표 주전 · 프리미어리그 117.6 🌟 월드클래스
 * 프리미어리그 경쟁자 폭(87~148)이 🎖️국가대표 후보~🐐살아있는 전설에 걸쳐요.
 * 내 쪽에서 👑 세계 최고(130)가 스탯 상한이고, 그 위 둘은 🌠초월까지 가야 닿아요.
 *
 * ── 획득 ──
 * 자동이에요. 훈련·장비·각성으로 종합이 문턱을 넘으면 그 자리에서 올라가고,
 * 노쇠로 내려가면 같이 내려가요. checkTitle(career.js)이 준비 화면을 그릴 때마다
 * 봅니다. 올라간 순간에만 알려주고, 커리어 최고 칭호는 따로 기록해 둬요.
 *
 * ── 효과 ──
 * 경기 수당이 칭호만큼 올라가요(titlePayMul). 능력치에 배수를 거는 대신 **돈**에
 * 건 이유가 있어요 — 골·도움·평점·수상·명성은 이미 전부 종합이 굴리고 있어서,
 * 거기에 또 곱하면 같은 축을 두 번 세는 셈이에요. 경기 수당은 여태 30만원 고정이라
 * 실력과 아무 관계가 없던 자리라서, 여기에 걸어야 새 축이 생깁니다.
 * ("월드클래스가 되면 몸값이 다르다"는 게 실제 축구의 규칙이기도 하고요.) */
const PLAYER_TITLES = [
  [155, "🏆 축구의 신"],
  [142, "🐐 살아있는 전설"],
  [130, "👑 세계 최고"],
  [118, "⭐ 슈퍼스타"],
  [106, "🌟 월드클래스"],
  [92, "🏅 국가대표 주전"],
  [78, "🎖️ 국가대표 후보"],
  [64, "💪 리그 정상급"],
  [52, "🧢 리그 주전"],
  /* 아래 둘은 나이를 안 타는 말로 골랐어요 — 같은 실력이라도 열아홉이면 유망주,
   * 서른셋이면 노장입니다. 칭호는 실력만 보니 스쿼드 안의 자리로 부릅니다. */
  [38, "🔄 로테이션 자원"],
  [0, "🪑 벤치 자원"],
];
/* 낮은 칭호가 0, 가장 높은 칭호가 10이에요. 표는 위에서부터 높은 순이라 뒤집어요 —
 * 수당 배수와 커리어 최고 기록이 이 번호를 씁니다. */
const TITLE_TOP = PLAYER_TITLES.length - 1;
function titleIdx(power) {
  const at = PLAYER_TITLES.findIndex(([bar]) => power >= bar);
  return TITLE_TOP - (at < 0 ? TITLE_TOP : at);
}
const titleAt = (idx) => PLAYER_TITLES[TITLE_TOP - clamp(idx, 0, TITLE_TOP)][1];
const titleOf = (power) => titleAt(titleIdx(power));

/* 💰 칭호 수당 배수 — 🪑 벤치 자원이 ×1.00, 한 단계마다 +0.25씩 붙어 🏆 축구의 신이
 * ×3.50이에요. 아래를 깎지 않고 위만 올려요 — 초반 살림은 그대로 두고 끝까지 간
 * 커리어에만 보상을 얹으려는 거예요.
 * 실측(38경기 · MOM 20회 기준 한 시즌 수당): 🪑 3,140만 → 🌟 월드클래스 7,850만 →
 * 🏆 축구의 신 10,990만. 장비 IV(3만)·V(7.5만)가 그제야 손에 닿는 값이에요. */
const TITLE_PAY_STEP = 0.25;
const titlePayMul = (idx) => 1 + clamp(idx, 0, TITLE_TOP) * TITLE_PAY_STEP;
// 경쟁자의 실력을 내 종합과 같은 자로 옮겨요 (위 실측에 맞춘 직선).
const raceStr = (pop, prestige) => (pop || 70) * (0.48 + 0.5 * (prestige || 1));

// ---------- 저장 — 여러 선수(슬롯) 지원 ----------
const SLOTS_KEY = SAVE_KEY + "-slots";
let curSlot = null;
function loadSlots() {
  try { return JSON.parse(localStorage.getItem(SLOTS_KEY)) || {}; } catch { return {}; }
}
function saveSlots(sl) { localStorage.setItem(SLOTS_KEY, JSON.stringify(sl)); }
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
  /* 🎉 피버 타임 — **화면이 바뀔 때마다** 다시 봐요. 정적 파일이라 서버가 먼저
   * 말을 걸 수 없어서, 이미 켜 둔 화면에서도 다음 화면으로 넘어가는 순간
   * 배너가 뜨게 하는 자리예요. 네트워크는 안 씁니다(구간만 보고 판정해요). */
  if (window.WingerFever) WingerFever.tick();
}

/* 🔙 되돌아가도 아무것도 다시 안 굴러가는 화면만 여기 옵니다.
 * 🦶 주발·🗺️ 동네는 **고르기만** 하는 화면이라 안전해요 —
 * 🏘️ 동네 순간 카드(`screen-town`)는 여전히 빠져 있습니다(뒤로 가기가 곧 재도전이 돼요). */
const BACK_SAFE = ["screen-title", "screen-agency", "screen-position", "screen-prospect", "screen-name", "screen-foot", "screen-origin", "screen-child", "screen-hof", "screen-battle"];
window.addEventListener("popstate", (e) => {
  const target = e.state && e.state.s;
  const cur = document.querySelector(".screen.active");
  const curId = cur ? cur.id : "";
  if (target && BACK_SAFE.includes(target) && BACK_SAFE.includes(curId)) {
    show._silent = true;
    show(target);
    show._silent = false;
  } else {
    history.pushState({ s: curId }, "");
  }
});

/* ⬅️ 흐름은 **이름 → 📍 자리 → 🏘️ 동네 → 🏟️ 제안 → 🧬 조립대**입니다 (85번 「순-B」).
 * 뒤로 가기도 그 순서를 그대로 거슬러 올라가되, 🏘️ 동네만 건너뜁니다 —
 * 🔴 **되돌아가서 다시 굴리는 길이 곧 재도전 버튼**이라서요(설계 §5-3). */
/* 🔴 **🏟️ 제안 → 🎯 자리로 되돌아가는 배선이 없습니다 — 그 경로가 구조적으로 없어서예요.**
 *    「뛴 뒤에는 뛸 때 쓴 값을 못 바꾼다」가 서는 순간, 그 버튼이 보일 수 있는 상태가
 *    **하나도 안 남았습니다**(초등 뒤 = 아직 안 골랐음 · 그 뒤 = 그 자리로 뛴 뒤).
 *    🔒 되돌리기는 **자리 화면 안에서**(`btn-back-position`). ⚠️ 되살리지 마세요. */
$("btn-back-position")?.addEventListener("click", () => show("screen-origin"));
$("btn-back-origin")?.addEventListener("click", () => show("screen-foot"));
/* 🧒 초1에서 뒤로 — 🗺️ 지도로. 🔒 **아직 아무것도 안 굴렸습니다**(굴림은 🧬 조립대에서
 * 한 번뿐이에요). 그래서 이건 재도전 뒷문이 아니라 그냥 되돌리기입니다. */
$("btn-back-child")?.addEventListener("click", () => show("screen-origin"));
$("btn-back-foot")?.addEventListener("click", () => show("screen-name"));
$("btn-back-name")?.addEventListener("click", () => show("screen-title"));
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
const talentStars = (t) => clamp(Math.round(((t - 0.6) / (TALENT_MAX - 0.6)) * 5), 1, 5);
/* ⭐ 한 칸의 값 — 각성 성공은 **정확히 이만큼** 올라요.
 * 한 칸을 통째로 더하면 반올림한 별 개수가 언제나 정확히 1 늘어납니다
 * (시작값이 얼마든, 앞서 실패로 조금 잃었든 상관없어요). */
const TALENT_STEP = (TALENT_MAX - 0.6) / 5;
// 능력치 키 다섯 — 재능 평균처럼 "전부"를 훑을 때 써요
const STAT_KEYS = ["shoot", "pass", "dribble", "defense", "stamina", "speed"];
/* ⭐ 별 그림 — **별만** 그려요.
 *
 * 여기서 세 번 방향을 바꿨어요. 별 다섯 칸으로 재능 0.6~1.8을 나누면 한 칸이
 * 0.24인데 각성 상승이 rand(0.15, 0.3)이라, 성공해도 별이 그대로인 날이
 * 흔했습니다("별이 4개에서 각성 성공했는데 그대로 4개야"). 반칸(✩)으로
 * 쪼개 봤더니 "빈 별은 안 해도 되지 않을까", 수치를 붙였더니 "별 옆에 숫자는
 * 뭐지??"였어요.
 *
 * 결론은 표시가 아니라 **장치**를 고치는 것이었어요 — 각성이 정확히 한 칸씩
 * 오르게 하면 별만 그려도 성공할 때마다 하나씩 늡니다(제보: "숫자는 빼줘
 * 원래처럼 별만 나오게 해주고, 각성 성공했을 때 별 개수가 정상적으로 증가만
 * 하면 문제없어"). 눈금을 고쳐 그리는 대신 눈금에 맞게 걸음을 맞췄어요. */
function talentStarStr(t) {
  return "⭐".repeat(talentStars(t));
}
const isTalentMax = (t) => t >= TALENT_MAX - 1e-9;
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
    `· 실패: ${d.name} 수치만 초기화 (재능은 이미 MAX라 잃지 않아요)` +
    (gearBonus(key) ? `\n· 🛍️ 장비 +${gearBonus(key)}는 그대로 남아요` : "") +
    `\n\n도전할까요?`
  )) return false;

  S.trans = S.trans || {};
  if (Math.random() < p) {
    S.trans[key] = lv + 1;
    S.stats[key] = resetStat(key, 45, 60);
    logFn(`🌠✨ ${d.name} 초월 ${lv + 1}단계 달성!! 상한이 ${statCap(key)}까지 열렸어요`);
    if (window.Fx) Fx.celebrate("transcend", `🌠 초월 ${lv + 1}단계!`, ".awaken-btn");
  } else {
    S.stats[key] = resetStat(key, 45, 60);
    logFn(`🌠💦 초월 실패… ${d.name} ${Math.round(S.stats[key])}부터 다시 (✨${lv} 유지)`);
    if (window.Fx) { Fx.burst(".awaken-btn", "💦", 8); Fx.flash(`💦 ${d.name} 초월 실패…`); }
  }
  save();
  return true;
}

function awakenTalent(key, logFn) {
  const defs = Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos];
  const d = defs.find((x) => x.key === key);
  const v = Math.round(S.stats[key]);
  if (!d || v < 100) return false;
  // 재능이 상한(TALENT_MAX)이면 각성해도 오르는 게 없어요.
  // 예전엔 '성공'이 뜨면서 스탯만 45~60으로 깎여 순손실이었습니다.
  if (S.talents[key] >= TALENT_MAX - 1e-9) return transcend(key, d, v, logFn);
  const p = awakenP(v);
  const ok = confirm(
    `🔮 ${d.name} 재능 각성 시도!\n\n` +
    `성공 확률 ${Math.round(p * 100)}% (돌파가 깊을수록 올라가요)\n` +
    `· 성공: ⭐ 별이 하나 늘어요 — 훈련 효율이 ${Math.round(TALENT_STEP / S.talents[key] * 100)}% 빨라져요\n` +
    `· 실패: 낮은 확률로 재능이 살짝 하락\n` +
    `· 성공하든 실패하든 ${d.name} 수치는 크게 낮아져서 다시 키워야 해요` +
    (gearBonus(key) ? `\n· 🛍️ 장비 +${gearBonus(key)}는 그대로 남아요` : "") +
    `\n\n진행할까요?`
  );
  if (!ok) return false;
  /* 🔮 각성은 엔드게임인데 로그가 없어서 **몇 명이 여기까지 오는지** 몰랐어요.
   * CS에 "각성해도 별이 안 오른다"가 대기 중인데 실제 시도 수를 못 봤습니다.
   * 시도 자체를 남겨요 — 성공률은 확률이지만 "얼마나 시도하나"가 진짜 물음이에요. */
  const awakenOk = Math.random() < p;
  if (window.Stats) Stats.log("awaken", { key, lv: Math.round(S.talents[key] * 100) / 100, ok: awakenOk });
  if (awakenOk) {
    const before = S.talents[key];
    /* 딱 한 칸 — 그래야 별이 반드시 하나 늘어요. 무작위 폭을 두면 성공했는데
     * 별이 그대로인 날이 생기고, 그건 성공을 실패로 읽히게 합니다. */
    S.talents[key] = Math.min(S.talents[key] + TALENT_STEP, TALENT_MAX);
    S.stats[key] = resetStat(key, 45, 60);
    logFn(`🔮✨ ${d.name} 재능 각성 성공!! ${"⭐".repeat(talentStars(before))} → ${"⭐".repeat(talentStars(S.talents[key]))}`
      + ` (수치 ${Math.round(S.stats[key])}부터 재도전)`);
    if (window.Fx) Fx.celebrate("awaken", `⭐ ${d.name} 각성 성공!`, ".awaken-btn");
  } else if (Math.random() < 0.1) {
    S.talents[key] = Math.max(S.talents[key] - 0.1, 0.8);
    S.stats[key] = resetStat(key, 30, 50);
    logFn(`🔮💧 각성 실패… 무리한 시도에 재능까지 살짝 잃었어요 (${Math.round(S.stats[key])})`);
    // 실패에 연출이 없어서 "아무 일도 안 일어났다 = 오류"로 읽혔어요 (플레이어 제보)
    if (window.Fx) { Fx.burst(".awaken-btn", "💧", 10); Fx.flash(`💧 ${d.name} 각성 실패… 재능도 잃었어요`); }
  } else {
    S.stats[key] = resetStat(key, 30, 50);
    logFn(`🔮💦 각성 실패… ${d.name} ${Math.round(S.stats[key])}부터 다시 담금질!`);
    if (window.Fx) { Fx.burst(".awaken-btn", "💦", 8); Fx.flash(`💦 ${d.name} 각성 실패…`); }
  }
  save();
  return true;
}


// ---------- 보너스 보상 (공용) — 30분에 1번 ----------
const AD_CD_KEY = "grow-ad-cd";
const AD_CD_MS = 1800000;
const adCooldownLeft = () =>
  Math.max(0, AD_CD_MS - (Date.now() - (+localStorage.getItem(AD_CD_KEY) || 0)));

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

function showAdTrainModal(rerender) {
  const ov = document.createElement("div");
  ov.className = "av-overlay";
  ov.innerHTML = `
    <div class="av-modal ad-modal">
      <p class="av-title">🎁 무료 특별훈련!</p>
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
      body.innerHTML = `<div class="ad-emoji">${d.emoji}</div><b>${d.name} +${gain.toFixed(1)}</b> 특별훈련 완료!<br/><span class="av-note">턴을 소모하지 않는 보너스 훈련 · 다음은 30분 후</span>`;
    } else {
      body.innerHTML = `<div class="ad-emoji">💧</div>특별훈련에 실패했어요`;
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

// ---------- 장비 상점 ----------
/* 경기 수를 12 → 38로 올리면서 시즌 수입이 약 3배가 됐어요. 값을 그대로 두면
 * 장비를 3분의 1 시간에 다 사서 능력치가 빨리 오르고, 다시 잡은 수상 문턱이
 * 또 어긋납니다. 같은 배로 올려 진행 속도를 지켜요.
 * (경기당 보상은 안 건드려요 — 한 경기의 값어치가 줄면 손맛이 죽어요) */
const GEAR_TIERS = [
  { n: "I", bonus: 3, price: 1600 },
  { n: "II", bonus: 5, price: 4800 },
  { n: "III", bonus: 8, price: 12000 },
  { n: "IV", bonus: 12, price: 30000 },
  { n: "V", bonus: 16, price: 75000 },
];
/* 보유한 장비가 그 능력치에 얹어 주는 총합.
 *
 * ⚠️ 장비는 살 때 S.stats에 한 번 더하고 끝이에요 — 따로 저장되는 '효과 층'이
 * 없습니다. 그런데 각성·초월은 S.stats[key]를 30~60으로 **덮어쓰기** 때문에
 * 장비로 올린 몫이 같이 사라졌어요. S.gear에는 소유 기록이 남아 다시 살 수도
 * 없으니 돈만 날린 셈이었습니다(풀장비 한 칸이면 3+5+8+12+16 = 44 손실).
 * 각성은 반복하는 엔드게임이라 할수록 손해가 쌓였어요.
 *
 * 그래서 덮어쓴 뒤에 이 값을 다시 얹어 줘요. 장비는 산 사람에게 계속 남습니다. */
function gearBonus(key) {
  if (!S || !S.gear) return 0;
  return GEAR_TIERS.reduce((sum, t) => sum + (S.gear[`${key}-${t.n}`] ? t.bonus : 0), 0);
}
/* 각성·초월로 능력치를 되돌릴 때 쓰는 값. 장비 몫을 얹고 상한을 넘지 않게 잘라요. */
/* 🔮각성·🌠초월로 능력치를 되돌릴 때 쓰는 자리예요.
 * 되돌린 시점을 남겨 둬요 — 클래스가 내려간 이유가 노쇠인지 각성인지 화면이
 * 구분해서 말해야 해요(career.js checkTitle). 능력치를 낮추는 유일한 통로라
 * 여기 한 줄이면 됩니다. */
const resetStat = (key, lo, hi) => {
  S.awakenAt = S.stages;
  return clamp(randInt(lo, hi) + gearBonus(key), 0, statCap(key));
};

let shopReturn = "screen-main";
function statDefs() { return Array.isArray(STAT_DEFS) ? STAT_DEFS : STAT_DEFS[S.pos]; }
function openShop(returnTo) {
  shopReturn = returnTo || "screen-main";
  renderShop();
  show("screen-shop");
}
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
          alert("자금이 부족해요! 경기 수당이나 보너스로 모아봐요 💰");
          return;
        }
        /* 상한에 닿아 있으면 지금은 수치가 안 올라요. 예전에는 돈만 빠져나가고
         * 아무 일도 안 일어났습니다 — 각성 뒤에는 얹히니 사는 것 자체는 손해가
         * 아니지만, 모르고 사면 버그로 읽혀요. */
        if (atCap(d.key)) {
          if (!confirm(
            `⚠️ ${d.name}이(가) 이미 상한(${statCap(d.key)})이에요.\n\n` +
            `지금은 수치가 안 올라요. 다만 🔮 각성·🌠 초월로 수치가 내려간 뒤에는\n` +
            `장비 몫이 그대로 얹혀요.\n\n그래도 구매할까요?`
          )) return;
        }
        S.money -= tier.price;
        S.gear = S.gear || {};
  S.trans = S.trans || {};
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
  const left = adCooldownLeft();
  const adRow = $("ad-row");
  if (left > 0) {
    adRow.innerHTML = `<p class="av-note">🎁 다음 보너스까지 약 ${Math.ceil(left / 60000)}분 남았어요</p>`;
  } else {
    adRow.innerHTML = `<button class="btn btn-primary" id="btn-ad">🎁 30분 보너스 +200만 받기</button>`;
    $("btn-ad").onclick = () => showAdModal(200, renderShop);
  }
}

// ---------- 커리어 기록 ----------
let recordReturn = "screen-main";
/* 📊 기록 화면의 탭 — 커리어와 🌏 월드컵을 갈라요.
 *
 * 제보: "기록에서 월드컵 출전 기록도 볼 수 있으면 좋겠어. 탭으로 추가해서
 * 보게 하면 될 듯." 맞아요 — 한 카드에 다 밀어 넣으면 스크롤만 길어져요.
 * 월드컵은 4년에 한 번이라 커리어 기록과 성격도 다릅니다. */
let recordTab = "career";
function openRecord(returnTo) {
  recordReturn = returnTo || "screen-main";
  recordTab = "career";
  renderRecord();
  show("screen-record");
}
function renderRecordTabs() {
  const box = $("record-tabs");
  if (!box) return;
  /* 월드컵을 한 번도 안 겪었으면 탭 줄 자체를 감춰요 — 빈 탭은 "여기 뭔가 있나"만
   * 남기고 아무것도 안 알려줘요. 미발탁 기록("none")도 겪은 것으로 봐요. */
  const has = Array.isArray(S.wcHist) && S.wcHist.length;
  box.hidden = !has;
  if (!has) { recordTab = "career"; return; }
  const tabs = [["career", "⚽ 커리어"], ["wc", "🌏 월드컵"]];
  box.innerHTML = tabs.map(([id, name]) =>
    `<button class="rec-tab${recordTab === id ? " on" : ""}" data-tab="${id}">${name}</button>`).join("");
  box.querySelectorAll(".rec-tab").forEach((b) => {
    b.onclick = () => { recordTab = b.dataset.tab; renderRecord(); };
  });
}
/* 🌏 월드컵 기록 — 대회마다 한 줄. 미발탁도 남겨요("TV로 봤어요"가 기록이에요). */
function wcRecordHTML() {
  const list = (S.wcHist || []).slice().sort((a, b) => a.y - b.y);
  const LAB = { champion: "🏆 우승", final: "🥈 준우승", semi: "🎖️ 4강", group: "💧 조별 탈락", none: "— 미발탁" };
  const c = S.career || {};
  const played = list.filter((h) => h.result !== "none");
  const rows = list.map((h) => {
    const aw = (h.awards || []).map((id) => (id === "boot" ? "🥇" : "🏅")).join("");
    return `<tr class="${h.result === "champion" ? "me" : ""}"><td>${h.y}</td>`
      + `<td>${LAB[h.result] || h.result}${aw ? ` <b>${aw}</b>` : ""}</td>`
      + `<td>${h.result === "none" ? "-" : `${h.apps}경기`}</td>`
      + `<td>${h.result === "none" ? "-" : `⚽${h.g} 🅰️${h.a}`}</td>`
      + `<td class="wc-rec-champ">${h.champ || "-"}</td></tr>`;
  }).join("");
  const sum = played.length
    ? `출전 ${played.length}회 · ⚽ ${played.reduce((a, h) => a + h.g, 0)}골`
      + ` · 🅰️ ${played.reduce((a, h) => a + h.a, 0)}도움`
      + `${c.wcWin ? ` · 🏆 우승 ${c.wcWin}` : ""}`
      + `${c.wcBall ? ` · 🏅 골든볼 ${c.wcBall}` : ""}`
      + `${c.wcBoot ? ` · 🥇 골든부츠 ${c.wcBoot}` : ""}`
      + `${c.wcWall ? ` · 🛡️ 골든월 ${c.wcWall}` : ""}`
    : "아직 대표팀에 뽑힌 적이 없어요";
  const nat = (window.WingerWorldCup && WingerWorldCup.myNation)
    ? WingerWorldCup.myNation().name : "";
  return `<div class="draft-emoji">🌏</div>
    <div class="draft-title">${nat} 대표팀</div>
    <div class="draft-team">${sum}</div>
    <div class="draft-summary">
      <table class="rank-table season-standings wc-hist"><thead>
        <tr><th>시즌</th><th>성적</th><th>출전</th><th>기록</th><th>우승국</th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="wc-rec-note">월드컵은 <b>4년에 한 번</b>이에요 — 3·7·11·15시즌에 열려요.<br/>
        이 기록은 리그와 따로 쌓여요.</div>
    </div>`;
}
function renderRecord() {
  renderRecordTabs();
  if (recordTab === "wc") { $("record-card").innerHTML = wcRecordHTML(); return; }
  const m = marketOf();
  const trophyLine = S.trophies && S.trophies.length ? `🏆 ${S.trophies.join(", ")}` : "🏆 대회 1위 경력 없음";
  const y = S.youth || { g: 0, a: 0, def: 0 };
  let curHtml = "";
  if (S.activity) {
    const act = S.activity;
    const rec = act.teamW != null ? ` · ${act.teamW}승 ${act.teamD}무 ${act.teamL}패` : "";
    curHtml = `<br/><b>🔥 진행 중인 시즌</b><br/>${["전반기", "후반기"][act.cb - 1] || act.cb + "차"} · ${act.week}/${act.weekTotal}R 소화${rec}<br/>⚽ 골 ${act.goals || 0} · 🅰️ 도움 ${act.assists || 0} · 🛡️ 수비 ${act.defense || 0} · 🏅 MOM ${act.wins}회<br/>`;
  }
  let proHtml = "";
  if (S.career && S.career.years && S.career.years.length) {
    /* 시즌마다 소속과 리그가 달라요. 여기엔 그게 아예 안 적혀 있어서
     * "3시즌 103골"이 어느 리그에서 낸 기록인지 알 수가 없었어요(제보).
     *
     * 칸을 새로 만들지는 않아요 — 수상 칸이 이미 다섯 줄까지 늘어나서
     * 폭이 남아 있지 않습니다(결산 표를 7칸 → 4칸으로 줄인 것과 같은 이유).
     * 시즌 칸 아래에 작은 글씨로 두 줄 붙여요.
     *
     * 소속은 career.js가 채워요 — 이 필드가 생기기 전 시즌에는 club이 없어서
     * S.moves에서 역산합니다(fillClubs). career.js는 이 파일 뒤에 로드되지만
     * openRecord는 버튼을 눌러야 도니까 그때는 이미 올라와 있어요. */
    const CT = (window.WingerCareer && window.WingerCareer._t) || {};
    const yrs = CT.fillClubs ? CT.fillClubs(S.career.years, S) : S.career.years;
    const shortOf = CT.shortClub || ((n) => (n ? String(n).slice(0, 4) : "-"));
    const lgShort = (id) => {
      const l = (CT.LEAGUES || LEAGUES).find((x) => x.id === id);
      return l ? `${l.flag} ${l.short}` : "";
    };
    const seasonCell = (x) => {
      const club = x.club ? `<span class="rec-club" title="${x.club}">${shortOf(x.club)}</span>` : "";
      const lg = x.league != null ? lgShort(x.league) : "";
      const rank = x.rank ? `${x.rank}위` : "";
      const sub = [lg, rank].filter(Boolean).join(" ");
      return `${x.y}시즌${club}${sub ? `<span class="rec-lg">${sub}</span>` : ""}`;
    };
    const rows = yrs.map((x) =>
      /* 골·도움·수비를 한 칸에 합쳐요. 칸마다 나누면 폰 폭에서 헤더가
       * 세로로 쪼개져요 (⚽골 · 🅰️도움 · 🛡️수비가 28~34px 칸에 안 들어가요).
       * 결산 화면(career.js)이 같은 이유로 이미 합쳤어요. */
      `<tr><td class="rec-season">${seasonCell(x)}</td><td class="yr-stat">${[
        x.goals != null ? `${x.goals}골` : null,
        x.assists != null ? `${x.assists}도움` : null,
        x.defense != null ? `${x.defense}수비` : null,
      ].filter(Boolean).join(" ") || "-"}</td><td class="yr-avg">${x.avg != null ? x.avg.toFixed(1) : "-"}</td><td>${x.awards && x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    const cr = S.career;
    proHtml = `
      <table class="season-table season-record"><thead><tr><th>시즌</th><th>성적</th><th>평점</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div>통산 ${cr.years.length}시즌 · 출전 ${cr.apps || 0}경기${(() => {
        const ys = cr.years.filter((y) => y.avg != null);
        return ys.length ? ` · 평균 평점 ${(ys.reduce((a, y) => a + y.avg, 0) / ys.length).toFixed(1)}` : "";
      })()} · ⚽ ${cr.goals || 0}골 · 🅰️ ${cr.assists || 0}도움 · 🛡️ 수비 ${cr.defense || 0} · 🏅 MOM ${cr.wins}회<br/>🏆 MVP ${cr.daesang} · 베스트11 ${cr.bonsang}${cr.rookie ? " · 신인왕" : ""}</div>`;
  }
  const gearList = STAT_DEFS
    .map((d) => {
      const owned = GEAR_TIERS.filter((t) => S.gear && S.gear[`${d.key}-${t.n}`]).length;
      return owned ? `${d.emoji}${"★".repeat(owned)}` : null;
    })
    .filter(Boolean)
    .join(" ");
  $("record-card").innerHTML = `
    <div class="draft-emoji">⚽</div>
    <div class="draft-title">${S.name}</div>
    <div class="draft-team">${S.phase === "winger2-pro" ? `${S.group}${S.center ? " · 주장" : ""} · ${S.proYear}시즌` : `${m.emoji} ${m.name} 유망주 ${S.year}년차`} · ${POS_INFO[S.pos].name}</div>
    <div class="draft-summary">
      <b>🌱 유스 기록</b><br/>출전 ${S.stages || 0}경기 · ⚽ ${y.g}골 · 🅰️ ${y.a}도움 · 🛡️ 수비 ${y.def}<br/>⭐ 명성 ${Math.round(S.fandom)}<br/>${trophyLine}<br/>
      ${curHtml}
      ${proHtml ? `<br/><b>⚽ 프로 기록</b>${proHtml}<br/>` : ""}
      ${gearList ? `<br/><b>🛍️ 보유 장비</b> ${gearList}` : ""}
    </div>`;
}
$("btn-record-main")?.addEventListener("click", () => openRecord("screen-main"));
$("btn-record-pro")?.addEventListener("click", () => openRecord("screen-pro"));
$("btn-record-back")?.addEventListener("click", () => show(recordReturn));

$("btn-shop-main")?.addEventListener("click", () => openShop("screen-main"));
$("btn-shop-pro")?.addEventListener("click", () => openShop("screen-pro"));
$("btn-shop-back")?.addEventListener("click", () => {
  show(shopReturn);
  if (shopReturn === "screen-main") renderMain();
  else {
    const c = window.WingerCareer;
    if (c && c.refreshPro) c.refreshPro();
  }
});

// ---------- 시작 흐름 ----------
let chosenMarket = null;
let chosenPos = null;

function initTitle() {
  if (Object.keys(loadSlots()).length) {
    $("btn-continue").classList.remove("hidden");
    $("btn-continue").onclick = showSlotPicker;
  }
  $("btn-new").onclick = () => {
    /* 🧒 빈 칸으로 시작하면 아무도 안 씁니다 — 하나 채워 두고 고쳐 쓰게 해요.
     * 이미 친 이름이 있으면(뒤로 갔다 온 경우) 안 덮어씁니다. */
    if (!$("input-name").value.trim()) $("input-name").value = randomPlayerName(null);
    /* 🏘️ 동네를 **새로 굴립니다.** 한 커리어를 끝내고 새 게임을 시작할 때
     * 지난 판의 점수와 제안이 남아 있으면 동네가 통째로 건너뛰어져요. */
    if (window.WingerTown) WingerTown.reset();
    chosenOffer = null;
    show("screen-name");
    stampStep("screen-name");
  };
  if (window.Match && Match.enabled()) {
    Match.count("winger2").then((n) => {
      if (n) {
        $("title-count").innerHTML = `⚽ 지금까지 <b>${n.toLocaleString()}명</b>의 유망주가 그라운드를 밟았어요!`;
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
  fillStats(S);          // ⚡ 스피드 칸이 없는 옛 세이브를 여기서 채워요 (종합은 그대로예요)
  if (S.phase === "winger2-pro" && window.WingerCareer) {
    window.WingerCareer.showActivity();
  } else {
    renderMain();
    show("screen-main");
  }
}

function slotDesc(st) {
  const posName = POS_INFO[st.pos] ? POS_INFO[st.pos].name : "";
  if (st.phase === "winger2-pro") return `⚽ ${st.group || "프로팀"} · ${st.proYear || 1}시즌${st.center ? " · 주장" : ""}`;
  const m = MARKETS.find((x) => x.id === st.market);
  return `${m ? m.emoji + " " + m.name : ""} 유망주 ${st.year}년차 · ${posName}`;
}

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
              <span class="slot-avatar slot-emoji">⚽</span>
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

/* 🏟️ **입단 제안** — 🏘️ 동네 세 판을 보고 유스 5곳이 각자 손을 듭니다 (85번 §4-2).
 *
 * 🔴 **5곳이 전부 옵니다. `id`·`debut`·`growth`·`spot`·`desc`는 전부 불변이에요.**
 *    바뀌는 건 카드에 붙는 **제안 등급 한 줄**뿐입니다. 목록을 줄이면 축이 뒤집혀요
 *    (못한 사람이 데뷔가 가장 쉬운 🇰🇷만 받게 됩니다 — 85번 §3-2).
 *
 * 🔑 **`📣 주목 ×1.15 → ×1.21`을 숫자로 적습니다** (원칙 ③ — 효과가 있으면 손잡이도).
 *    조작했는데 결과가 화면에 안 보이면 동네가 **컷신처럼 읽힙니다.** */
function renderMarkets() {
  const box = $("agency-list");
  box.innerHTML = "";
  /* 🏟️ 최종 모드로 화면을 되돌립니다 — 📨 조기 제안이 켜 둔 것을 끕니다.
   * 🔴 **한 화면이 두 몫을 하면 「끄는 쪽」을 빼먹는 게 단골 버그**라 여기서 한 번에 꺼요. */
  const title = $("agency-title"), note = $("agency-note"), cont = $("btn-early-next");
  if (note) { note.classList.add("hidden"); note.innerHTML = ""; }
  if (cont) { cont.classList.add("hidden"); cont.onclick = null; }
  /* 🤝 **예비 계약을 했으면 그 한 곳만** 섭니다 (설계 93번 §6-2 — *"다른 팀은 못 봅니다"*).
   * 🔒 그래도 목록을 도는 줄은 `MARKETS` 그대로예요 — **「5곳 전부」가 기본**이고
   *    예비 계약은 **내가 이미 고른 결과**입니다. 둘을 헷갈리면 축이 뒤집혀요.
   *
   * 🔑 **그때는 「제안」이 아니라 「입단 확정」입니다** (designer 93번 §19 추가 ⑥).
   *    고를 게 없는 화면에 *"🏟️ 입단 제안"*이라고 적으면 **아무도 안 고른 제안 화면**으로
   *    읽혀요. 그리고 이 화면이 🧬 **조립대 취소의 착지점**이자 `S.signedAt`가
   *    **처음 눈에 보이는 자리**입니다 — 승낙이 📣 주목에서 +0.166%p밖에 안 움직이니,
   *    그 결정이 화면에 안 남으면 **정말로 0.166%p짜리 결정**이 됩니다(79번 「기록이 효과」). */
  const signed = window.WingerTown ? WingerTown.signed() : null;
  if (title) title.textContent = signed ? "🤝 입단 확정" : "🏟️ 입단 제안";
  const starBar = (v, vals) => { const lo = Math.min(...vals), hi = Math.max(...vals); const n = hi === lo ? 3 : Math.min(5, Math.max(1, 1 + Math.round(((v - lo) / (hi - lo)) * 4))); return "★".repeat(n) + "☆".repeat(5 - n); };
  const GVALS = MARKETS.map((x) => x.growth), DVALS = MARKETS.map((x) => x.debut);
  const hint = $("agency-hint");
  /* 📏 **편차를 숫자로 적습니다** (원칙 ③ — 효과가 있으면 손잡이도 보여야 해요).
   * 🔑 등급을 정하는 것은 점수가 아니라 `d = 점수 − 뛴 카드 수`입니다.
   *    점수만 적으면 *"8점인데 왜 보통이지"*가 되고, 그게 곧 밴드를 난이도로 오해하는 자리예요. */
  if (hint && window.WingerTown && WingerTown.cards() > 0) {
    const n = WingerTown.cards(), d = WingerTown.deviation();
    hint.innerHTML = `초·중·고 ${n}판, 스카우트가 지켜봤어요 — <b>${WingerTown.score()}점</b>`
      + ` <span class="agency-dev">(기준 ${n}점 · 편차 ${d > 0 ? "+" : ""}${d})</span>`
      + (signed ? `<br/>🤝 <b>${SIGN_STAGE[signed.stage] || "일찍"}</b> 때 먼저 도장을 찍은 곳으로 갑니다.`
        + `<br/>여기를 눌러 몸을 만들어요.`
        : `<br/>유스에 따라 성장 환경과 프로 진출 난이도가 달라져요.`);
  }
  for (const m of MARKETS) {
    if (signed && m.id !== signed.market) continue;
    /* 🎲 **유스마다 따로 굴러온 등급**이에요 (원칙 ⑧ — 재미의 절반은 「모른다」에서).
     * 동네 성적은 **기댓값**만 올립니다. 5곳이 한꺼번에 굴러 다 같아지면
     * *"잘했으면 다 좋음"* 이 되어 선택이 사라져요. */
    const off = window.WingerTown ? WingerTown.offerFor(m.id) : null;
    const btn = document.createElement("button");
    btn.className = "card" + (off ? ` offer-t${off.tier}` : "");
    btn.innerHTML = `
      <span class="card-emoji">${m.emoji}</span>
      <span class="card-title">${m.name}</span>
      <span class="card-sub">${m.tier}</span>
      ${off ? `<span class="offer-grade">${off.star} ${off.label}</span>` : ""}
      ${off ? `<span class="offer-word">"${off.word}"</span>` : ""}
      <span class="card-desc">${m.desc}</span>
      <span class="card-tags">
        <span class="tag">성장 ${starBar(m.growth, GVALS)}</span>
        <span class="tag">안정성 ${starBar(m.debut, DVALS)}</span>
        ${off ? `<span class="tag offer-spot">📣 주목 ×${m.spot.toFixed(2)} → ×${(m.spot * off.mul).toFixed(2)}</span>` : ""}
      </span>`;
    btn.onclick = () => {
      chosenMarket = m;
      chosenOffer = off;
      openBench();
    };
    box.appendChild(btn);
  }
}

/* 🖼️ 생성 흐름 — **🧒 초1이 🗺️ 지도와 첫 카드 사이에 들어왔습니다** (설계 117번 §2).
 *
 *   ✏️ 이름 → 🦶 주발 → 🗺️ 동네 → 🧒 초1 → 🏫 초등부(2장) → 📨 조기 제안 → 🎯 자리
 *                     → 🏫 중등부(3장) → 📨 조기 제안 → 🏫 고등부(3장) → 🏟️ 제안 → 🧬 조립대
 *
 * 🔴 **초2·초3은 없습니다** (실측 119번 §2) — `spread()`가 `focus`를 `indexOf`로 봐서
 *    `⚽×1`과 `⚽×3`이 **완전히 같은 stats**입니다. 같은 걸 또 고르면 값이 정확히 0이라
 *    화면만 늘고 축은 안 늘어요. 🔒 **되살리려면 「같은 걸 두 번 고르면 달라지는」 구조가 먼저**입니다.
 *
 * 🤝 **예비 계약을 하면 🏟️ 최종 제안이 안 오고 곧장 🧬 조립대**입니다 — 남은 대항전은
 *    그대로 다 뛰고요(§6-2). 🔴 승낙이 카드를 건너뛰게 하면 그게 「콘텐츠 건너뛰기 버튼」이에요.
 *
 * 🔑 **왜 🎯 자리가 초등부 「뒤」인가** — *"어릴 땐 다 같이 공만 쫓아다녔어요."*
 *    그리고 이게 **첫 순간 카드를 한 화면 앞당깁니다**(자리 화면이 카드 뒤로 빠져서요).
 *    새 기준은 「첫 순간 카드 앞의 결정이 3을 안 넘는다」 — ✏️ 이름 · 🦶 주발 · 🗺️ 동네 = **3**.
 *
 * 🔑 **그런데 `MINI[kind][pos]`는 여전히 `pos`를 요구합니다**(engine.js · 🔒 안 고칩니다).
 *    초등부는 `town.js`가 `mf` 칸(각 종류의 대표 하나 = 3종)을 읽어 넘어갑니다 —
 *    「초등은 미드필더」가 아니라 **`cutin`이 아직 안 열렸다**는 뜻이에요.
 *    학교 아크의 몸은 전원 `evenStats()`라 포지션이 판정값을 안 바꿉니다.
 *
 * 🧒 이름·🦶 주발은 **맨 앞 화면**에서 이미 정했어요 — 이름이 붙은 몸을 굴려야
 * *"내 선수의 몸"*이 됩니다. 조립대는 그 이름을 머리글에 그대로 답니다. */
let chosenName = "";
let chosenFoot = "R";
/* 🗺️ 자란 곳. 🔒 **산식에 안 닿습니다** — 📖 스토리와 🏛️ 지역 기록만 바꿔요.
 * 빈 값이면 🌍 미상으로 삽니다(지도를 안 거치고 온 옛 경로도 그대로 돌아요). */
let chosenOrigin = "";
/* 🧒 초1에 고른 것 — `["ball"|"body"|"eye"]`. **배열입니다.**
 * 🔑 설계가 초2·초3을 열어 둔 자리라(117번 §9-1) 칸 모양을 바꾸지 않으려고 배열로 둡니다 —
 *    나중에 해가 늘어도 **세이브 스키마가 안 바뀝니다.**
 * 🔒 읽는 쪽 기본값은 `[]`이고, 빈 배열이면 `CHILD_FOCUS` 기여가 **정확히 0**이에요. */
let chosenChild = [];
let chosenOffer = null;      // 🏟️ 그 유스가 내민 제안 { tier, mul, star, label, word }
let chosenCard = null;
let chosenTalents = null;
let usedRerolls = 0;

function openBench() {
  stampStep("screen-prospect");        // 🔢 6 / 6 — 여기가 선수를 만드는 마지막 차례예요
  WingerProspect.open(chosenMarket, chosenPos,
    { name: chosenName, foot: chosenFoot, child: chosenChild },
    (build, talents, rerolls) => {
      chosenCard = build;
      chosenTalents = talents;
      usedRerolls = rerolls;
      startCareer();
    },
    /* 🔴 `show("screen-agency")`를 직접 부르지 않습니다 — 그러면 「← 자리 다시 고르기」를
     * 감추는 판단(위 `showOffers`)을 건너뛰어 **되돌리기 뒷문이 조립대 쪽에** 생겨요. */
    showOffers);
}

/* 📨 예비 계약을 한 시점을 사람 말로. 🔒 `id`(`"e"`/`"m"`)는 세이브(`S.signedAt`)가
 * 가리키는 값이라 안 바꿔요. **글자만** 여기서 바뀝니다.
 * 🔒 그리고 이 표는 **🏛️ 명예의 전당이 남의 브라우저에서 그릴 때의 화이트리스트**이기도
 *    합니다 — 클라우드에서 온 `signedAt`을 그대로 그리지 않고 **이 표에 있는 것만** 그려요
 *    (`career.js`의 헌액 카드). 표에 없으면 줄 자체가 안 그려집니다. */
const SIGN_STAGE = { e: "초등부", m: "중등부" };

/* 📨 **조기 제안 화면** — 그 단계가 끝나고 손을 든 유스를 보여줍니다 (설계 93번 §6·§7).
 *
 * 🔑 **「얼마나 잘했나」가 아니라 「무엇을 잘했나(fit)」가 누가 오는지를 정합니다.**
 *    목록이 갈리는 건 여기까지고 🏟️ **최종은 언제나 5곳**이에요 — *"못하면 선택 자체를
 *    잃는다"*가 안 생깁니다(85번 §3-1). 갈리는 건 **언제 손을 드는가**뿐입니다.
 *
 * 🔴 **등급(⭐)도 `📣 주목 ×`도 여기서는 안 적습니다.** 조기 제안의 등급은
 *    **최종에 안 쓰입니다** — 승낙하면 최종 편차로 다시 굴고(§6-3), 거절하면 그냥 사라져요.
 *    여기서 ⭐⭐⭐⭐를 보여주면 끝에 ⭐⭐가 나왔을 때 **거짓말이 됩니다.**
 *    그 자리는 **그 유스가 하는 말**이 대신해요(등급이 높을수록 색이 진해집니다).
 *
 * 🔴 **거절은 재도전이 아닙니다** — 이미 굴린 카드는 그대로 남고, 되돌아가는 게 아니라
 *    **앞으로** 갑니다. 그래서 [거절]은 「다시 굴리기」가 아니라 「다음 판으로」예요.
 *    🔒 그리고 거절은 **판 단위**입니다 — 팀별로 거절하게 만들면 「제안을 쌓아 두는 상태」가
 *    생기고, 좋은 걸 쥐고 더 좋은 걸 노리는 게 **정확히 재도전**이에요 (designer 93번 §18).
 *
 * 🔴 **제안이 0곳이어도 이 화면을 건너뛰지 마세요** (designer 93번 §18 수정 ②).
 *    ① **0곳이 있어야 「손을 들었다」가 사건**입니다. 매번 오면 그건 제안이 아니라
 *       화면 전환이고, 그게 범민 님 요청(*"각각 원하는 팀이"*)의 핵심이에요
 *    ② 🔑 **건너뛰면 그 단계를 뛴 결과가 화면에서 통째로 사라집니다** — 원칙 ③ 정면입니다.
 *       그래서 0곳일 때도 **점수와 편차를 그대로 적습니다**(`기준 5점 · 편차 −1`)
 *    ⏱️ 탭이 하나 늘지만 **카드와 카드 사이**라 첫 순간 카드를 1초도 안 밉니다. */
function renderEarly(stageId) {
  const box = $("agency-list");
  box.innerHTML = "";
  const T = window.WingerTown;
  const E = T.earlyOffers(stageId);
  const st = (T.STAGES || []).find((s) => s.id === stageId) || { title: "🏫 대항전" };
  const n = T.cards(), d = T.deviation();
  const title = $("agency-title");
  if (title) title.textContent = `📨 ${st.title.replace(/^🏫\s*/, "")}이 끝났어요`;
  const hint = $("agency-hint");
  if (hint) {
    /* 🟡 **초등을 만점으로 마친 판** — 아무도 안 왔어도 그 사실은 남습니다.
     * 🔑 🇬🇧이 중등부터 보게 되면서 「네 곳이 손을 들었다」의 순간이 사라졌어요
     *    (designer 93번 §18 수정 ①). **그 자리를 말로 갚는 줄**입니다. */
    const wow = stageId === "e" && d === n && n > 0;
    hint.innerHTML = (wow ? "공터에서 그런 애는 처음 본다는 얘기가 돌았어요."
      : E.list.length ? "벤치 끝에서 누가 보고 있었어요."
        : "이번엔 아무도 손을 들지 않았어요.")
      + `<br/>🏫 ${n} / ${T.TOTAL_CARDS}판 — <b>${T.score()}점</b>`
      + ` <span class="agency-dev">(기준 ${n}점 · 편차 ${d > 0 ? "+" : ""}${d})</span>`;
  }
  for (const m of MARKETS) {
    const off = E.offers[m.id];
    if (!off) continue;                       // 🎯 손을 안 든 유스는 아예 안 그립니다
    const card = document.createElement("div");
    card.className = "card offer-early";
    card.innerHTML = `
      <span class="card-emoji">${m.emoji}</span>
      <span class="card-title">${m.name}</span>
      <span class="card-sub">${m.tier}</span>
      <span class="offer-word">"${off.word}"</span>
      <span class="card-desc">${m.desc}</span>`;
    const take = document.createElement("button");
    take.className = "btn btn-primary offer-take";
    take.dataset.id = m.id;
    take.textContent = "🤝 예비 계약";
    /* 🔴 `click`에서 화면을 바꿉니다 — `pointerdown`에서 갈아치우면 손을 뗄 때
     *    그 자리의 새 요소로 `click`이 한 번 더 가서 **두 번 먹혀요.** */
    take.onclick = () => decideEarly(stageId, m.id);
    card.appendChild(take);
    box.appendChild(card);
  }
  /* ℹ️ 손잡이의 효과를 **그 자리에서 말로** (원칙 ③). 숫자는 안 씁니다 —
   *    최종 편차가 아직 안 정해져서 지금은 어떤 숫자도 거짓말이에요. */
  const note = $("agency-note");
  if (note) {
    note.classList.toggle("hidden", E.list.length === 0);
    note.innerHTML = E.list.length ? `
      <p class="offer-note-line"><b>🤝 예비 계약을 하면</b> — 고등학교까지 여기서 뛰고,
        그 팀이 <b>가장 세게</b> 불러요. 대신 <b>다른 팀은 못 봐요.</b></p>
      <p class="offer-note-line"><b>🙅 거절하면</b> — 고등부가 끝나고 <b>5곳 전부</b> 와요.
        등급은 그때 다시 정해져요.</p>` : "";
  }
  const cont = $("btn-early-next");
  if (cont) {
    cont.textContent = E.list.length ? "🙅 거절하고 계속 뛸래요" : "🏫 계속 뛸래요";
    cont.classList.remove("hidden");
    cont.onclick = () => decideEarly(stageId, null);
  }
}

/* 🏟️ 제안 화면으로 — **최종(인자 없음)과 📨 조기(단계 id)가 같은 자리에 섭니다.**
 *
 * 🔑 **제안 화면에 서는 길은 전부 이 함수를 지납니다.** 조기든 최종이든 조립대에서
 *    돌아오는 길이든요 — 「무엇을 감출까」를 **한 군데에서** 다시 정하기 위해서예요.
 *    🔴 `show("screen-agency")`를 직접 부르는 길을 만들지 마세요. 그게 뒷문의 자리입니다.
 *
 * 🔴 **되돌리기 버튼이 없습니다 — 감춘 게 아니라 그 경로가 구조적으로 없어서예요**
 *    (designer 93번 §19 · 옛 96번 ⓑ의 「감춤」을 대체합니다).
 *    🎯 자리는 **「출력」이 아니라 「굴림에 들어간 입력」**입니다 —
 *    `MINI[kind][pos]`(어느 미니게임이 뜨나)와 `blendOf`(조작 폭)가 그 값으로 이미 굴렀어요.
 *    🔑 **출력만 잠그고 입력을 열어 두면, 같은 판을 다시 굴리지 않고도 판을 바꿀 수 있습니다** —
 *    *"차단이 쉬우니 df로 뛰고 커리어는 fw로"*가 **탭 두 번**이면 됩니다. **재도전보다 나빠요.**
 *    🔒 그 판정이 선 순간 이 화면에서 자리로 갈 수 있는 상태가 **하나도 안 남았습니다.**
 *       되돌리기는 **자리 화면 안에서**(`btn-back-position`). ⚠️ 되살리지 마세요.
 *
 * 🔑 조작적 정의 — **"뛴 뒤에는 「뛸 때 쓴 값」을 못 바꿉니다.
 *    굴림을 막는 것만으로는 부족합니다."** */
function showOffers(stage) {
  /* ⚠️ **아무 값이나 참으로 받으면 안 됩니다.** 🧬 조립대의 취소가 이 함수를 콜백으로
   *    넘기는데, `prospect.js`가 `onBack(e)`로 **클릭 이벤트를 실어 보냅니다** —
   *    그대로 믿으면 조립대에서 돌아올 때 📨 조기 제안 화면이 떠요. 단계 id 둘만 봅니다. */
  const early = (stage === "e" || stage === "m") ? stage : null;
  if (early && window.WingerTown) renderEarly(early); else renderMarkets();
  show("screen-agency");
}

/* 🏫 **학교 대항전 한 단계**를 엽니다 — 끝나면 `after()`로 갑니다 (설계 93번 §5).
 *
 *   🗺️ 동네 → 🏫 초등부(2) → 🎯 자리 → 🏫 중등부(3) → 🏫 고등부(3) → 🏟️ 제안
 *
 * 🔴 **한 번 구른 단계는 다시 안 굴러요 — 이건 재도전 경로가 아닙니다.** 여기에 다시
 *    굴리는 길을 열면 그 순간 **학교가 「최고가 나올 때까지 돌리는 화면」**이 되고,
 *    설계가 금지한 재도전 버튼을 뒷문으로 만드는 셈이에요.
 *
 * 🔑 **아래 `playedStage` 한 줄이 그 「유일한」 가드입니다.** 예전엔 가드가 셋이었어요
 *    (여기 · `town.js`의 `openStage` · 자리 핸들러의 `played()`). 🔴 **겹치면 하나를 빼도
 *    증상이 0장**이라, 「재도전 뒷문」을 지키는 검사가 **통째로 아무것도 못 지킵니다**
 *    (inspector ⑤ — 변이가 안 잡혀서 드러났습니다). 나머지 둘을 지웠어요.
 * 🔒 **가드를 다시 늘리지 마세요.** 새 호출자가 생기면 이 함수를 지나게 하세요. */
function goSchool(id, after) {
  if (!window.WingerTown) { after(); return; }   // 스크립트가 안 왔으면 조용히 넘어가요
  if (WingerTown.playedStage(id)) { after(); return; }
  show("screen-town");
  /* 🏟️ `name`은 **경기 중계 줄에만** 씁니다 (*"⚽ 골!! ○○, 그물을 흔듭니다!"*).
   * 🔒 판정에도 편차 `d`에도 안 닿아요 — 화면이 그릴 때 이스케이프됩니다(`W2Scene.esc`). */
  WingerTown.openStage(id, { pos: chosenPos, foot: chosenFoot, origin: chosenOrigin, name: chosenName }, after);
}
/* 🔴 초등부에는 `chosenPos`가 아직 없습니다 — **그게 맞아요.**
 *    *"어릴 땐 다 같이 공만 쫓아다녔어요."* town.js가 미니게임 대표 3종으로 돕니다.
 *    🔴 그리고 **초등 결과가 🎯 자리를 「추천」하면 안 됩니다** (70번 §8 (a) —
 *       *"조작 실력은 선수의 것이 아니다"*). 점수는 자리 화면에 한 글자도 안 넘깁니다. */
/* 📨 **조기 제안 한 판** — 그 단계가 끝나면 손을 든 유스를 보여주고, 정하면 `after()`.
 *
 * 🔴 **한 번 정한 판은 다시 안 물어요.** 되돌아와서 다시 물으면, 뒤 판 결과를 보고
 *    앞 판의 결정을 바꾸는 길이 열립니다 — *"이미 나온 걸 버리고 앞으로"*가 아니라
 *    **「이미 나온 걸 다시 고르기」**가 되고, 그건 거절이 아니라 재도전이에요(§6-1 ②).
 * 🔴 **예비 계약을 했으면 다음 판은 아예 안 옵니다** — *"다른 팀은 못 봅니다"*를
 *    화면에 적어 놓고 갈아탈 길을 열어 두면 그 문장이 거짓말이 됩니다.
 * 🔒 두 가드는 **서로 다른 것을 봅니다**(이 판을 정했나 / 이미 계약했나) — 겹치지 않아요.
 *    ⚠️ 가드를 여기 더 늘리지 마세요. 겹치면 하나를 빼도 증상이 0장이라
 *       검사가 통째로 아무것도 못 지킵니다(96번 ⓔ에서 실제로 났던 일입니다). */
let earlyAfter = null;
function goEarly(id, after) {
  if (!window.WingerTown) { after(); return; }   // 스크립트가 안 왔으면 조용히 넘어가요
  if (WingerTown.decidedEarly(id)) { after(); return; }
  if (WingerTown.signed()) { after(); return; }
  earlyAfter = after;
  showOffers(id);
}
/* 📨 승낙(`marketId`) 또는 거절(`null`). **판정은 `WingerTown`이 합니다** —
 * 화면은 무엇을 눌렀는지만 넘겨요(안 온 유스의 id는 거기서 막힙니다). */
function decideEarly(id, marketId) {
  if (window.WingerTown) WingerTown.decideEarly(id, marketId || null);
  const after = earlyAfter;
  earlyAfter = null;
  /* ♻️ **뒤로 가기로 이미 정한 화면에 다시 들어와 누른 자리** — `screen-agency`는
   *    `BACK_SAFE`라 🎯 자리에서 브라우저 뒤로 가기로 이 화면에 다시 설 수 있어요.
   *    🔒 판정은 `WingerTown.decideEarly`가 이미 막았습니다(한 번만) — 여기서는
   *    **앞으로 보내기만** 합니다. 아무것도 안 하면 *"눌러도 안 되는 버튼"*이 돼요. */
  (after || (id === "e" ? goPosition : goHigh))();
}

function goElementary() { goSchool("e", () => goEarly("e", goPosition)); }
function goMiddle() { goSchool("m", () => goEarly("m", goHigh)); }
function goHigh() { goSchool("h", finishArc); }

/* 🏁 아크가 끝난 자리.
 * 🤝 **예비 계약을 했으면 🏟️ 최종 제안 화면이 안 옵니다 — 그 팀으로 갑니다** (설계 93번 §6-2).
 *    🔴 그래도 **남은 대항전은 다 뛴 뒤**예요. 승낙이 카드를 건너뛰게 하면 그게 정확히
 *       *"콘텐츠를 건너뛰는 버튼"*이고, 최적 플레이가 «초등에서 무조건 승낙»이 됩니다. */
function finishArc() {
  const signed = window.WingerTown ? WingerTown.signed() : null;
  const m = signed ? MARKETS.find((x) => x.id === signed.market) : null;
  if (!m) { showOffers(); return; }
  chosenMarket = m;
  chosenOffer = WingerTown.offerFor(m.id);
  openBench();
}

/* 📍 자리를 고르면 🏫 중등부로 갑니다.
 * ⚠️ 예전에 여기 있던 `if (WingerTown.played()) { showOffers(); return; }`는
 *    **한 번도 안 걸리는 죽은 줄**이었습니다 — `goMiddle` → `goHigh`가 각자
 *    `playedStage`로 넘어가 어차피 제안 화면에 서거든요. 지웠습니다(inspector ⑤). */
document.querySelectorAll("#position-list .card").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenPos = btn.dataset.pos;
    if (!window.WingerTown) { showOffers(); return; }   // 스크립트가 안 왔으면 조용히 넘어가요
    goMiddle();
  });
});

/* 🦶 주발 · 🗺️ 동네 — **각자 자기 화면**입니다 (설계 93번 §3·§4).
 *
 * 🔑 game.js가 아는 것은 `openFoot`·`openOrigin` 둘과 `chosenFoot`·`chosenOrigin`
 *    두 칸뿐이에요. 화면 안쪽(발 그림 · 지도 SVG · 📖 스토리)은 전부 `intro.js` 몫입니다.
 *    ✅ 재배치가 끝났습니다 — 🗺️ 동네 다음이 **🧒 초1**, 그다음이 🏫 초등부이고 🎯 자리는 카드 뒤예요.
 *
 * 🔢 차례 표시(`1 / 6`)는 `WingerIntro.STEPS`가 정합니다 — 순서가 바뀌면 거기 한 줄만요.
 *    🚨 **옛 규칙이 지워졌습니다 (2026-09-01 · 101번 §1-4).** 예전엔 이 목록이
 *    「첫 순간 카드 **앞**의 차례」라 🎯 자리·🧬 조립대가 빠져 있었고, 그래서 🗺️ 동네가
 *    **「3 / 3」**이라며 *"생성이 끝났다"*고 거짓말을 했어요. 이제 여섯 화면 전부 셉니다 —
 *    🧒 초1이 **4 / 6**, 🎯 자리가 **5 / 6**, 🧬 조립대가 **6 / 6**예요.
 *    화면마다 `stampStep`을 부릅니다. */
function stampStep(id) {
  const el = $("step-" + id.replace("screen-", ""));
  if (el && window.WingerIntro) el.textContent = WingerIntro.step(id);
}
function goFoot() {
  show("screen-foot");
  stampStep("screen-foot");
  if (!window.WingerIntro) { goOrigin(); return; }   // 스크립트가 안 왔으면 조용히 넘어가요
  WingerIntro.openFoot(chosenFoot, (f) => { chosenFoot = f; goOrigin(); });
}
function goOrigin() {
  show("screen-origin");
  stampStep("screen-origin");
  if (!window.WingerIntro) { goChild(); return; }
  WingerIntro.openOrigin(chosenOrigin, (id) => { chosenOrigin = id; goChild(); });
}
/* 🧒 **초1** — 🗺️ 지도와 🏫 초등부 카드 **사이**입니다 (설계 117번 §2).
 * 🔑 game.js가 아는 것은 `openChild` 하나와 `chosenChild` 한 칸뿐이에요 —
 *    무엇이 바뀌는지는 `prospect.js`의 `CHILD_FOCUS`가 정합니다.
 * 🔴 **초2·초3은 없습니다** (실측 119번 §2) — `spread()`가 `focus`를 `indexOf`로 봐서
 *    같은 걸 또 고르면 값이 **정확히 0**이라, 화면만 늘고 축은 안 늘어요. */
function goChild() {
  show("screen-child");
  stampStep("screen-child");
  if (!window.WingerIntro || !WingerIntro.openChild) { goElementary(); return; }
  WingerIntro.openChild({ origin: chosenOrigin, key: chosenChild[0] }, (key) => {
    chosenChild = key ? [key] : [];
    goElementary();
  });
}
function goPosition() {
  show("screen-position");
  stampStep("screen-position");
}

/* 🎲 랜덤 이름 — 유스를 아직 안 골랐으니 지역 편향 없이 뽑아요(15%가 유럽 이름).
 * 유스에 맞춘 이름은 3택 카드가 하던 일인데, 카드가 사라져 그 자리가 없어졌습니다. */
$("btn-random-name").addEventListener("click", () => {
  $("input-name").value = randomPlayerName(null);
});

$("btn-name-next").addEventListener("click", () => {
  chosenName = $("input-name").value.trim() || randomPlayerName(null);
  $("input-name").value = chosenName;
  /* 🔴 **초등부 결과를 여기에 넣지 마세요.** 점수도, 잘한 종류도, 추천도 안 됩니다
   *    (70번 §8 (a) — *"조작 실력은 선수의 것이 아니다"*). 순서만 바뀐 것이지 추천은 없어요. */
  $("position-hint").textContent = `${chosenName}, 중학교에 갑니다. 이제 어느 자리에서 뛸까요?`;
  goFoot();
});

/* 🚀 입단 — **조립대의 [이 선수로 시작]**이 부릅니다 (예전 이름 화면의 「입단하기」 자리) */
function startCareer() {
  // 조립대를 안 거치고 여기 닿는 길은 없어야 하지만, 없으면 그 자리에서 되돌려요
  if (!chosenCard || !chosenTalents) { openBench(); return; }
  const name = chosenName || randomPlayerName(chosenMarket);
  curSlot = null;
  /* ⚠️ 이름 말고 **id**를 함께 남겨요. 예전에는 표시 이름만 남겨서, 선택지 이름을
   * 바꾸는 순간 통계에서 같은 항목이 옛 이름·새 이름으로 쪼개졌어요 —
   * 축구 유스를 나라에 맞추자 배경 분포가 9줄로 갈라졌습니다.
   * id는 세이브가 가리키는 값이라 안 바뀌어요. 이름은 사람이 읽으라고 같이 둡니다. */
  if (window.Stats) Stats.log("new_player", { pos: chosenPos, agency: chosenMarket.name, mk: chosenMarket.id });
  if (window.Match) Match.register("winger2", name);
  S = newState(chosenMarket, chosenPos, name, { stats: chosenCard.stats, talents: chosenTalents });
  // 🌱 나이·성장타입·특능·결함·리롤 사용 수를 심어요 (효과는 특능 엔진에서 §11-7)
  WingerProspect.applyCard(S, chosenCard, usedRerolls);
  S.foot.main = chosenFoot;          // 🦶 고른 주발 (약발 숫자는 타고난 그대로예요)
  /* 🗺️ 자란 곳. ⚠️ **마이그레이션은 안 합니다** — 옛 세이브는 읽는 쪽에서 🌍 미상이에요.
   * 🔒 여기서 갈라지는 것은 📖 텍스트와 🏛️ 지역 기록뿐입니다. */
  S.origin = chosenOrigin || "";
  /* 🧒 초1에 고른 것. ⚠️ **마이그레이션은 안 합니다** — 칸이 없는 옛 세이브는 읽는 쪽에서
   * `[]`이고, 빈 배열이면 기여가 **정확히 0**이라 개편 전과 똑같이 굽니다.
   * 🔒 굴림은 이미 끝났으니 여기 남는 값은 **기록·화면용**이에요 (산식에 다시 안 들어갑니다). */
  S.childPicks = chosenChild.slice();
  /* 🏫 학교 점수와 **뛴 카드 수**, 📣 그 제안이 준 주목 배수를 심어요.
   * 🔑 **두 칸은 반드시 짝으로 갑니다** — 등급을 정하는 건 점수가 아니라
   *    `d = townScore − schoolN`이라서요. 점수만 남기면 카드 수가 바뀐 날
   *    **옛 세이브가 조용히 내려갑니다**(3 − 8 = −5 → ×0.90).
   * ⚠️ **마이그레이션은 안 합니다** — 옛 세이브는 읽는 쪽 기본값(3점 · 3장 → d = 0 · ×1)으로 삽니다. */
  const off = chosenOffer || (window.WingerTown ? WingerTown.offerFor(chosenMarket.id) : null);
  S.townScore = window.WingerTown ? WingerTown.score() : 3;
  S.schoolN = window.WingerTown ? WingerTown.cards() : 3;
  S.spotMul = (off && off.mul) || 1;
  /* 🤝 **예비 계약을 한 시점** — `"e"`/`"m"`, 안 했으면 `null`. 기록·서사용이에요.
   * 🔴 **등급에는 한 톨도 안 닿습니다** — 등급은 이미 위 `off`(최종 편차로 굴린 값)가
   *    정했어요. 이 칸을 보고 배수를 더하면 그 순간 «일찍 승낙이 항상 이득»이 됩니다.
   * ⚠️ **마이그레이션 없음** — 옛 세이브는 읽는 쪽에서 `null`(= 조기 계약 없음)입니다. */
  const sg = window.WingerTown ? WingerTown.signed() : null;
  S.signedAt = sg ? sg.stage : null;
  const dev = window.WingerTown ? WingerTown.deviationOf(S) : 0;
  addLog(`⚽ ${chosenMarket.name} ${off ? off.label : "입단"}! ${name}의 축구 인생이 시작됐어요.`
    + (S.signedAt ? ` 🤝 ${SIGN_STAGE[S.signedAt] || "일찍"}에서 도장을 먼저 찍었어요.` : "")
    + ` (🏫 학교 ${S.townScore}점/${S.schoolN}판 · 편차 ${dev > 0 ? "+" : ""}${dev}`
    + ` · 📣 주목 ×${(S.spotMul).toFixed(2)})`);
  save();
  renderMain();
  show("screen-main");
}

// ---------- 메인 렌더 ----------
function renderMain() {
  const m = marketOf();
  $("hud-name").textContent = `${S.name} (${POS_INFO[S.pos].name})`;
  $("hud-school").textContent = `${m.emoji} ${m.name} · 종합 ${Math.round(overall())}`;
  /* 👕 미니 유니폼 — 🧬 조립대에서 등에 이름을 새긴 그 옷이 HUD에도 섭니다.
   * 🔴 **CSS입니다. WebGL이 아니에요** — HUD에서 3D가 돌면 🔥 순간 카드의 프레임을
   *    갉아먹고 곡선이 기기 성능에 의존합니다(`style.css`의 `.w2-hudkit` 주석).
   * ⚠️ 연출이 게임을 멈추면 안 돼요 — 없으면 그냥 안 그립니다. */
  try { if (window.WingerProspect) WingerProspect.paintJersey($("hud-kit"), S); } catch (e) {}
  $("hud-turn").textContent = `${S.year}년차 ${S.month}월`;

  $("hud-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
  $("cond-num").textContent = Math.round(S.condition);
  const condBar = $("cond-bar");
  condBar.style.width = `${S.condition}%`;
  condBar.classList.toggle("low", S.condition < 35);

  const pct = clamp((S.fandom / 450) * 100, 0, 100);
  $("scout-num").textContent = Math.round(S.fandom);
  $("scout-bar").style.width = `${pct}%`;

  const statsBox = $("stats-box");
  statsBox.innerHTML = "";
  for (const d of STAT_DEFS) {
    const v = Math.round(S.stats[d.key]);
    const tv = S.talents[d.key], tl = transLv(d.key);
    const stars = talentStarStr(tv) + (isTalentMax(tv) ? (tl ? ` <span class="tr">✨${tl}</span>` : " MAX") : "");
    const row = document.createElement("div");
    row.className = "stat-row" + (window.W2Grade ? " graded" : "");
    /* 📊 등급이 주인공, 숫자는 작게 병기해요 (설계 갈래 F2).
     * 바는 `v/100`이 아니라 **지금 등급 구간 안에서의 위치**를 그려요 —
     * 47.3이 50.1이 되는 건 100칸짜리 바에선 안 보입니다.
     * ⚠️ grade.js가 안 떠도 화면은 밀리지 않아요 — 예전 막대로 돌아갑니다. */
    const gradeHTML = window.W2Grade ? W2Grade.partHTML(S.stats[d.key])
      : `<div class="bar"><div class="bar-fill stat${v > 100 ? " over" : ""}" style="width:${Math.min(v, 100)}%"></div></div>`;
    row.innerHTML = `
      <span class="stat-name">${d.emoji} ${d.name}</span>
      ${gradeHTML}
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
  /* 🎉 승급 감지 — **화면을 그리는 자리에 답니다.**
   * 능력치가 오르는 통로가 훈련·휴식·랜덤 이벤트·평가전·각성으로 다섯인데,
   * 다섯 곳에 손을 대면 하나를 빠뜨려요. 화면은 어느 통로로 올랐든 다시 그려집니다.
   * (옛 세이브는 `S.gradeSnap`이 없어서 첫 그리기에 조용히 채우기만 해요) */
  if (window.W2Grade) W2Grade.tick(S, STAT_DEFS, POS_INFO[S.pos].stat);

  const actBox = $("action-list");
  actBox.innerHTML = "";
  for (const d of STAT_DEFS) {
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

  // 대회일 — 훈련 잠그고 출전 버튼만 (🎁 특훈은 턴 미소모라 허용)
  if (S.pendingStage) {
    actBox.querySelectorAll(".action-btn").forEach((b) => {
      if (!b.classList.contains("ad-slot")) b.disabled = true;
    });
    const ps = S.pendingStage;
    const go = document.createElement("button");
    go.className = "action-btn rest go-game";
    go.innerHTML = ps.kind === "survival"
      ? `<span class="a-emoji">🔥</span>프로 도전 시작!<span class="a-sub">3년의 훈련이 여기서 판가름나요</span>`
      : `<span class="a-emoji">🏆</span>${ps.name} 출전!<span class="a-sub">유스 대회 준비 완료</span>`;
    go.onclick = () => {
      const kind = ps.kind, name = ps.name;
      S.pendingStage = null;
      save();
      renderMain();
      if (kind === "survival") startSurvival();
      else startEval(name);
    };
    actBox.appendChild(go);
  }

  renderLog();
}

function addLog(msg) {
  S.log.unshift(`[${S.year}년차 ${S.month}월] ${msg}`);
  S.log = S.log.slice(0, 40);
}

function renderLog() {
  $("log-box").innerHTML = S.log
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
  const m = marketOf();

  if (S.condition < 25 && Math.random() < 0.4) {
    S.condition = clamp(S.condition + 20, 0, 100);
    addLog(`🤕 지친 몸으로 무리하다 ${def.name} 훈련 중 잔부상. 한 달을 회복으로 날렸어요.`);
    actFx(def.key, "🤕 부상", true);
    endMonth();
    return;
  }

  const failP = S.condition < 40 ? 0.15 : 0.07;
  if (Math.random() < failP) {
    const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
    S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
    S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
    addLog(`😵 ${def.name} 훈련이 영 안 풀렸어요… -${loss.toFixed(1)} (${Math.round(S.stats[def.key])})`);
    actFx(def.key, "-" + loss.toFixed(1), true);
    maybeEvent();
    endMonth();
    return;
  }

  const condMod = S.condition >= 70 ? 1.15 : S.condition >= 40 ? 1.0 : 0.6;
  const buffMod = S.buff ? 1.5 : 1.0;
  S.buff = false;
  /* 🗑️ 성장타입 훈련 배수(×1.18 / ×0.86)는 **폐기됐어요** (§7-1 ①) —
   * 정점 나이가 이미 훈련 효율의 창을 옮기니 같은 축을 두 번 세는 계수였습니다.
   * 유스는 프로의 나이 계단(`trainMul`)도 안 걸어요 — 원래 없던 자리라 그대로 둡니다. */
  let gain = rand(2.2, 4.2) * S.talents[def.key] * m.growth * condMod * buffMod;
  if (S.stats[def.key] >= 100) gain *= 0.5;
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
  const m = marketOf();
  const events = [
    () => {
      const d = pick(STAT_DEFS);
      S.stats[d.key] = clamp(S.stats[d.key] + 3, 0, statCap(d.key));
      addLog(`🧑‍🏫 감독님의 특별 개인지도! ${d.name} +3`);
    },
    () => {
      const pts = Math.round(8 * spotOf(m));
      S.fandom += pts;
      addLog(`📱 연습 경기 하이라이트가 화제! 명성 +${pts}`);
    },
    () => {
      S.condition = clamp(S.condition - 20, 0, 100);
      addLog(`🤕 가벼운 근육 뭉침으로 며칠 쉬었어요. 컨디션 -20`);
    },
    () => {
      S.condition = clamp(S.condition + 12, 0, 100);
      addLog(`🥗 영양사가 짜준 식단으로 몸이 가벼워요! 컨디션 +12`);
    },
    () => {
      S.buff = true;
      addLog(`🔥 라이벌의 활약에 승부욕이 불타올라요! 다음 훈련 효율 1.5배`);
    },
    () => {
      S.stats.stamina = clamp(S.stats.stamina + 2, 0, statCap("stamina"));
      addLog(`🏃 새벽 러닝이 몸에 붙었어요. 체력 +2`);
    },
    () => {
      S.fandom = Math.max(0, S.fandom - 10);
      addLog(`📉 경기 실수 장면이 짤로 돌아요… 명성 -10`);
    },
  ];
  pick(events)();
}

// ---------- 월 진행 ----------
function endMonth() {
  if (S.year === 3 && S.month === 12) {
    S.pendingStage = { kind: "survival" };
  } else if (EVALS[S.month]) {
    S.pendingStage = { kind: "eval", name: EVALS[S.month] };
  }
  save();
  renderMain();
  if (S.pendingStage) return;
  advanceMonth();
}

function advanceMonth() {
  S.month += 1;
  if (S.month === 13) {
    S.month = 1;
    /* 🎂 나이는 프로에서만 흐르는 게 아니에요 — 유스에서 보낸 해도 나이를 먹습니다.
     * ⚠️ **`S.year`를 올리기 전에** 부릅니다. 뒤에 두면 나이 칸이 없는 옛 세이브가
     *    되짚기(`year`에서 계산) + 한 살로 **두 살**을 먹어요. */
    WingerProspect.birthday(S);
    S.year += 1;
  }
  save();
  renderMain();
}

// ---------- 경기 공통 ----------
function stageScore(type) {
  const mainKey = type.main || POS_INFO[S.pos].stat;
  // 🎂 유스 경기도 **지금 실력**으로 뜁니다 — 열일곱과 열아홉이 같을 수는 없어요
  const st = WingerProspect.nowStats(S);
  const score =
    st[mainKey] * 0.55 +
    st[type.aux] * 0.2 +
    st.stamina * 0.1 +
    S.condition / 8 +
    rand(-9, 9);
  return { mainKey, score };
}

const GRADE_ORDER = ["D", "C", "B", "A", "S"];
/* 유스 라운드 통과 판정에 얹는 그 경기 성적. playSurvivalRound가 써요.
 * 등급은 능력치와 상관이 커서 이것만으로는 "오늘 어땠나"가 안 남아요 —
 * 승패(±0.06)와 활약(최대 +0.08)을 함께 봅니다. */
const GRADE_PASS = { S: 0.10, A: 0.05, B: 0, C: -0.10, D: -0.26 };
const DONE_PASS_CAP = 0.08;
const GRADE_INFO = {
  S: { pts: 30, txt: "🌟 완벽한 경기! 그라운드를 완전히 지배했어요." },
  A: { pts: 22, txt: "🔥 인상적인 활약! 관중석이 들썩였어요." },
  B: { pts: 15, txt: "🙂 무난한 경기. 제 몫을 해냈어요." },
  C: { pts: 9, txt: "😬 아쉬운 장면이 몇 번 있었어요." },
  /* ⚠️ D 문구에 "전반에 교체"라고 적혀 있었어요. 그런데 이 등급은 90분을 다 뛰고
   * 78분 승부처 미니게임까지 치른 뒤에 나옵니다 — 중계는 종료 휘슬을 불었는데
   * 문구만 전반에 나갔다고 하는, 화면끼리 어긋나는 자리였어요(제보).
   * 등급 문구는 **경기 시간표를 건드리지 않는 말**로 둡니다. */
  D: { pts: -5, txt: "😢 부진한 경기… 감독의 표정이 굳었어요." },
};
const makeGrade = (g) => ({ g, ...GRADE_INFO[g] });

function gradeOf(score) {
  if (score >= 76) return makeGrade("S");
  if (score >= 64) return makeGrade("A");
  if (score >= 52) return makeGrade("B");
  if (score >= 40) return makeGrade("C");
  return makeGrade("D");
}

// ---------- 경기 스탯(골·도움·수비) & 스코어 산출 ----------
// 간이 포아송 샘플러 — 골/도움 수 같은 이산 이벤트에 자연스러운 분포를 줘요
function poissonish(lam) {
  let n = 0, L = Math.exp(-Math.max(0, lam)), p = 1;
  do { p *= Math.random(); n++; } while (p > L && n < 12);
  return n - 1;
}
// rating(평점 0~10대) → 이번 경기 골·도움·수비 (포지션별 가중)
/* ⚽ 득점 눈금 — 이 게임의 한 경기가 몇 골짜리인가.
 *
 * 1.0이던 시절에는 종합 85 선수가 경기당 2.2골(시즌 83골)을 넣었어요. 그러면
 * 팀 스코어를 전력으로 갈라놓는 순간 4:3 같은 판이 됩니다 — 내 골이 곧 팀 골이라
 * 실점도 그만큼 커져야 승패가 나에게서 떨어지거든요. "점수가 너무 잘 난다"는
 * 제보가 그 자리예요.
 *
 * 그래서 **생산량 전체를 같은 배수로** 줄였어요. 나·경쟁자·동료·실점이 한 자로
 * 움직이니 개인 순위 경쟁과 부문상은 그대로예요. 시즌 축(posAxis→hype)은
 * 로그라서 AXIS_OFF 한 값으로 상쇄되고, 경기 평점은 RATE를 다시 잡았습니다.
 *
 * 이 상수를 건드리면 AXIS_OFF와 RATE도 같이 다시 잡아야 해요 —
 * tests/soccer/goal-scale-test.js가 그 짝을 지킵니다. */
const GOAL_SCALE = 0.33;

function matchContribution(rating) {
  const perf = clamp((rating - 5) / 4 + 0.6, 0.15, 1.6);
  // 🎂 **지금 실력**으로 뛰어요 (`S.stats`는 정점 기준값이에요 — prospect.js `nowStats`)
  const st = WingerProspect.nowStats(S);
  /* 윙어는 돌파로 기회를 만들어요. 골·도움 판정에 드리블이 함께 작용합니다.
   * 예전에는 드리블이 어디에도 안 들어가서, 윙어만 자기 주 스탯에 투자할수록
   * 성적이 나빠졌어요 (도달 가능 범위에서 재보니 85% → 32%). */
  const isWg = S.pos === "wg";
  const gStat = isWg ? st.shoot * 0.6 + st.dribble * 0.4 : st.shoot;
  const aStat = isWg ? st.pass * 0.6 + st.dribble * 0.4 : st.pass;
  /* 축마다 자기 스탯이 주인공이지만, 종합도 조금 섞어요(AXIS_MIX).
   * 한 칸만 200이고 나머지가 40인 선수는 그 한 장면 말고는 경기에 관여를 못 해요.
   * 이 항이 없으면 "골 넣는 기계"가 도움·수비까지 평범 이상으로 하게 됩니다. */
  const AXIS_MIX = 0.2;
  const allStat = STAT_KEYS.reduce((a, k) => a + st[k], 0) / STAT_KEYS.length;
  const mix = (v) => v * (1 - AXIS_MIX) + allStat * AXIS_MIX;
  /* ⚡ 스피드는 **돌파와 따라붙기**에 조금 섞여요 — 마무리(슛)나 시야(패스)를
   * 대신하지는 않아요. 폭이 크면 스피드 하나만 올리는 게 정답이 됩니다. */
  const SPD_MIX = 0.2;
  const spd = st.speed;   // nowStats가 없는 칸을 나머지 평균으로 채워 줘요 (§9-2 규칙 6)
  const withSpd = (v) => v * (1 - SPD_MIX) + spd * SPD_MIX;
  const shootF = mix(withSpd(gStat)) / 100;
  const passF = mix(aStat) / 100;
  const defF = mix(withSpd(st.defense)) / 100;
  const G = { fw: 1.05, wg: 0.75, mf: 0.5, df: 0.14 };
  const A = { mf: 0.95, wg: 0.85, fw: 0.55, df: 0.28 };
  const D = { df: 2.3, mf: 1.2, wg: 0.5, fw: 0.45 };
  /* 🎖️ 시즌 칭호가 여기서 경기에 들어와요 — 리그도 컵도 이 함수를 통해 골·도움·
   * 수비를 뽑으니, 한 자리에 얹으면 모든 경기에 같은 규칙으로 붙습니다. */
  /* ⭐ 재능도 **그 축이 쓰는 능력치의 별**을 달고 가요. 슛 별을 올리면 골이 늘고,
   * 패스 별을 올리면 도움이 늘어요. 예전에는 주 스탯의 별 하나만 평점에 붙어서,
   * 나머지 넷의 별은 훈련 효율 말고는 경기에 아무 영향이 없었습니다. */
  const gTal = isWg ? (clutch("shoot") * 0.6 + clutch("dribble") * 0.4) : clutch("shoot");
  const aTal = isWg ? (clutch("pass") * 0.6 + clutch("dribble") * 0.4) : clutch("pass");
  /* 🦶 약발은 **골과 도움에만** 붙어요 — 반대발로 차야 하는 상황에서 갈리는 거니까요.
   * 수비에는 안 붙입니다(태클에 발이 갈리지는 않아요). 기준 5가 배수 1.00이에요. */
  const foot = footMul();
  const gLam = (G[S.pos] ?? 0.4) * perf * (0.55 + shootF) * gTal * buffMul("g") * foot * GOAL_SCALE;
  const aLam = (A[S.pos] ?? 0.4) * perf * (0.55 + passF) * aTal * buffMul("a") * foot * GOAL_SCALE;
  const dLam = (D[S.pos] ?? 0.6) * perf * (0.55 + defF) * clutch("defense") * buffMul("d") * GOAL_SCALE;
  return { g: poissonish(gLam), a: poissonish(aLam), def: poissonish(dLam) };
}
/* 동료 득점 — 예전에는 팀 득점이 내 골 + 내 도움뿐이라 동료가 넣는 골이 없었어요.
 * 수비수는 골·도움 기댓값이 낮아서 팀이 득점을 못 했고, 능력치 70에서
 * 팀 승률이 7%였습니다 (같은 조건 공격수 51%).
 * 내 포지션이 공격에서 멀수록 동료가 더 넣어요. 값은 시뮬레이션으로 잡았어요.
 * 이 골은 act.goals에 안 들어가요 — 내 골이 아니니까요. 수상 축은 그대로입니다. */
const TEAMMATE_GOALS = { fw: 0.35, wg: 0.5, mf: 0.8, df: 2.2 };

/* 동료가 넣는 골 — **우리 전력 대 상대 전력**이 정해요.
 *
 * 예전에는 내 경기 평점이 이걸 거의 다 정했어요(0.6 + (평점-5)×0.14). 그래서
 * 내가 못한 날은 동료도 같이 못 넣었고, 팀 결과가 통째로 나에게 묶였습니다.
 * 실측: 클럽 전력을 45에서 95로 바꿔도 팀 승률이 10%p밖에 안 움직였는데,
 * 내 종합을 45에서 125로 바꾸면 78%p가 움직였어요 — 팀이 사실상 나였습니다.
 *
 * 지금은 전력 차가 주인공이고 내 경기력은 거들기만 해요(±0.3 상한). */
const MATE_SCALE = 1.7;    // 동료 골 전체 크기
const MATE_EDGE = 3.0;     // 전력 차가 동료 골에 실리는 정도
const MATE_FORM = 0.05;    // 내 경기력이 거드는 정도 — 작게 둡니다
const MATE_FLOOR = 0.15;   // 아무리 전력이 뒤져도 동료가 아예 못 넣지는 않아요
/* myStr — **우리 전력**을 밖에서 넘길 수 있어요. 안 넘기면 소속 클럽이에요(기존 동작).
 * 🌏 월드컵은 클럽이 아니라 국가로 뛰니 이 인자가 필요합니다. 산식을 worldcup.js에
 * 베끼지 않는 이유예요 — 베끼면 다음에 GOAL_SCALE을 만질 때 한쪽만 옛 눈금으로 남아요. */
function teammateGoals(rating, oppStr, myStr) {
  /* 상대를 모르면 **우리 전력과 같다**고 봐요(대등한 경기). 예전에는 리그 평균 70을
   * 기본값으로 뒀는데, 그러면 K리그3(전력 45) 팀은 상대를 모를 때마다 전력 70과
   * 붙는 셈이라 승률이 18%까지 떨어졌어요 — 자기 리그에서 뛰는데도요. */
  const us = myStr == null ? clubStrOf(S) : myStr;
  const edge = (us - (oppStr == null ? us : oppStr)) / 100;
  const form = clamp((rating - 6.5) * MATE_FORM, -0.3, 0.3);
  /* 바닥을 0이 아니라 0.15로 둬요. 전력이 50이나 뒤지면 1 + edge×2.2가 음수가 돼서
   * 동료 골 기댓값이 **정확히 0**이 됩니다 — 최약체 팀은 나 말고 아무도 못 넣는
   * 팀이 되고, 그건 팀이 아니에요. */
  const base = (TEAMMATE_GOALS[S.pos] ?? 0.6) * MATE_SCALE * GOAL_SCALE
    * Math.max(MATE_FLOOR, 1 + edge * MATE_EDGE + form);
  return poissonish(base);
}

/* 실점 — **이 경기가 얼마나 골이 오가는 판인가 × 전력 균형**이에요.
 *
 * 우리 골(teamGoals)을 섞는 게 핵심입니다. 한 경기에 3~4골을 넣는 선수가
 * 주인공인 게임이라, 실점을 낮은 값에 묶어 두면 내 골 수가 곧 승패가 돼요.
 * 내가 4골 넣는 급이면 상대도 그만큼 넣는 판이라야 "혼자 잘해도 팀은 진다"가
 * 성립합니다. 실측: 공격P 2개 이상 올린 경기에서 팀이 지는 비율 0% → 41%.
 *
 * 내 평점과 수비 능력치도 실점을 줄이지만 계수가 작아요 — 예전에는 이 둘이
 * 실점을 통째로 정했습니다(2.4 - (평점-5)×0.28 - 수비/100×1.4). */
const CONC_BASE = 0.8;     // 전력이 같아도 오가는 기본 골
const CONC_MIX = 0.75;     // 우리 골이 실점에 되비치는 정도 — 이 값이 승패를 나에게서 떼어내요
const CONC_EDGE = 3.4;     // 전력 차가 실점에 실리는 정도 — 여기가 클수록 클럽이 승패를 정해요
const CONC_FORM = 0.05;    // 내 평점이 실점을 줄이는 정도
const CONC_DEF = 400;      // 내 수비 능력치가 실점을 줄이는 정도 (나누는 값이라 클수록 약해요)
const CONC_CAP = 5;        // 한 경기 실점 상한 — 8:5 같은 스코어가 나오지 않게
function deriveOppGoals(rating, defStat, oppStr, teamGoals, myStr) {
  const us = myStr == null ? clubStrOf(S) : myStr;                                // 🌏 월드컵은 국가 전력을 넘겨요
  const edge = ((oppStr == null ? us : oppStr) - us) / 100;                        // 모르면 대등한 경기
  const balance = Math.max(0.15, (1 + edge * CONC_EDGE)
    * (1 - (rating - 6.5) * CONC_FORM - ((defStat || 40) - 60) / CONC_DEF));
  const lam = (CONC_BASE * GOAL_SCALE + Math.max(0, teamGoals || 0) * CONC_MIX) * balance;
  return Math.min(CONC_CAP, poissonish(Math.max(0, lam)));
}

const RES_LABEL = { W: "승리 🎉", D: "무승부 🤝", L: "패배 💧" };
// 골/도움/수비 이벤트를 분(') 마커와 함께 FM식 피드 라인으로
function matchEventFeeds(c, oppName, tf, ta) {
  const mins = [];
  for (let i = 0; i < c.g; i++) mins.push({ min: randInt(3, 90), text: `⚽ 골!! ${S.name} 득점`, cls: "good" });
  for (let i = 0; i < c.a; i++) mins.push({ min: randInt(3, 90), text: `🅰️ 도움! ${S.name}의 결정적 패스`, cls: "good" });
  if (S.pos === "df" && c.def >= 3 && ta === 0) mins.push({ min: randInt(60, 90), text: `🛡️ 완벽한 클린시트! 뒷문을 걸어 잠갔어요`, cls: "good" });
  else if (c.def >= 2) mins.push({ min: randInt(20, 85), text: `🛡️ 결정적 태클·차단 ${c.def}회로 위기를 막아요`, cls: "" });
  const oppGoals = Math.max(0, ta);
  for (let i = 0; i < Math.min(oppGoals, 2); i++) mins.push({ min: randInt(3, 90), text: `😣 ${oppName} 실점…`, cls: "bad" });
  mins.sort((x, y) => x.min - y.min);
  return mins.map((e) => ({ text: `${e.min}' ${e.text}`, cls: e.cls }));
}

// ---------- 경기 연출 ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MOMENTS = {
  shoot: {
    good: ["날카로운 침투 후 마무리! ⚽", "골키퍼 타이밍을 뺏는 슛! ✨", "환상적인 감아차기가 골망을 흔들어요 🎯"],
    bad: ["결정적 찬스에서 살짝 빗맞았어요 😬", "슈팅 각도가 아쉬웠어요 💦"],
  },
  pass: {
    good: ["전방을 꿰뚫는 스루패스! 🎯", "한 번의 터치로 흐름을 바꿔요 ✨", "정확한 크로스가 득점 기회로! 🔥"],
    bad: ["패스가 살짝 길었어요 😬", "연결이 한 박자 늦었어요 💦"],
  },
  defense: {
    good: ["완벽한 태클로 위기를 끊어요! 🛡️", "상대 에이스를 완전히 지웠어요 ✨", "몸을 던진 블로킹! 🔥"],
    bad: ["뒷공간을 살짝 내줬어요 😬", "커버 타이밍이 늦었어요 💦"],
  },
  dribble: {
    good: ["현란한 개인기로 수비를 벗겨내요! 🏃", "폭발적인 스피드로 측면을 돌파! ⚡", "환상적인 드리블에 관중이 열광해요 🔥"],
    bad: ["무리한 드리블이 끊겼어요 😬", "볼 컨트롤이 살짝 흔들렸어요 💦"],
  },
};

// 경기 승부처 미니게임 — 슛/파워/패스연계/반응/드리블 5종 랜덤
const SOCCER_BAR = { ok: "✨ 침착하게 마무리했어요", great: "💫 완벽한 타이밍, 골망을 흔드는 슛!!", bad: "😱 급하게 차다 골대를 벗어났어요" };
const SOCCER_HOLD = { ok: "⚽ 알맞은 파워로 정확한 슛!", great: "💥 완벽하게 실은 강슛, 골키퍼도 손 못 써!!", bad: "😵 힘이 과해 크로스바를 넘겼어요" };
const SOCCER_SEQ = { ok: "🎯 패스 연계를 정확히 이어갔어요", great: "🌟 원터치 연계로 수비를 완전히 무너뜨렸다!!", bad: "🙈 연계 타이밍이 어긋났어요" };
const SOCCER_REACT = { ok: "🛡️ 결정적 순간에 바로 반응했어요", great: "⚡ 번개 같은 반응으로 실점을 막았다!!", bad: "😵 한 박자 늦어 뒷공간을 내줬어요" };
const SOCCER_DUEL = { ok: "🧠 수비수의 무게중심을 뺏었어요", great: "🎯 완벽한 페인트로 제쳐냈다!!", bad: "🙈 수비수에게 공을 뺏겼어요" };
const miniZone = (stat) => clamp(13 + stat * 0.22 + (S.condition - 50) * 0.08, 10, 40);

const autoMiniOn = () => localStorage.getItem("grow-auto-mini") === "1";
function autoRes(stat) {
  /* 🔥 물오른 폼·🏆 챔피언이 승부처 성공률을 밀어 올려요.
   * ⚠️ 칭호는 **상한(0.5)을 씌운 뒤에** 더해요. 안쪽에 넣으면 칭호가 없을 때도
   * 상한이 0.5에서 0.62로 올라가서, 능력치 130짜리 선수의 승부처 확률이
   * 0.50 → 0.54로 조용히 바뀝니다 (실제로 ladder-test가 그걸 잡았어요). */
  const base = clamp(0.12 + stat * 0.003 + (S.condition - 50) * 0.001, 0.08, 0.5);
  const pPerfect = clamp(base + buffSum("moment"), 0.08, 0.62);
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

/* 🔥 승부처 미니게임 — **포지션마다 오는 장면이 달라요.**
 *
 * 예전에는 여덟 개를 포지션과 무관하게 뽑았어요. 수비수한테 "🎯 슛 찬스!
 * 초록 존에서 슈팅!"이 뜨고, 성공하면 극장골이 됐습니다(제보).
 * 장치(Timing)는 그대로 재사용하되 **어떤 장면인지와 어느 능력치로 겨루는지**를
 * 포지션에 맞춰요 — 수비수는 커트·1:1 수비·위험 감지·걷어내기가 옵니다. */
const MINI_POOL = {
  fw: ["bar", "hold", "drop", "target"],      // 마무리 계열
  wg: ["duel", "odd", "bar", "target"],       // 돌파·침투
  mf: ["seq", "odd", "duel", "target"],       // 연계·탈압박
  df: ["react", "duel", "odd", "hold"],       // 커트·1:1 수비·위험 감지·걷어내기
};
/* 장면 문구와 결과 대사. df는 같은 장치라도 수비 장면이라 따로 적어요.
 * stat — 그 장면에서 겨루는 능력치예요(수비수의 1:1은 드리블이 아니라 수비). */
const MINI_SPEC = {
  bar: {
    stat: "pos", label: "🎯 슛 찬스! 초록 존에서 슈팅!", button: "슛! ⚽",
    txt: { ok: "✨ 침착하게 마무리했어요", great: "💫 완벽한 타이밍, 골망을 흔드는 슛!!", bad: "😱 급하게 차다 골대를 벗어났어요" },
  },
  hold: {
    stat: "stamina", label: "💪 강슛 장전! 꾹 눌러 파워를 모으고 초록 존에서 슛!", button: "슛! ⚽",
    txt: { ok: "⚽ 알맞은 파워로 정확한 슛!", great: "💥 완벽하게 실은 강슛, 골키퍼도 손 못 써!!", bad: "😵 힘이 과해 크로스바를 넘겼어요" },
    df: {
      stat: "defense", label: "🧹 걷어내기! 꾹 눌러 힘을 모으고 초록 존에서 클리어!", button: "클리어! 🧹",
      txt: { ok: "🧹 안전하게 걷어냈어요", great: "💨 완벽한 클리어, 위험지역을 통째로 비웠다!!", bad: "😵 어설픈 클리어가 상대에게 갔어요" },
    },
  },
  seq: {
    stat: "pass", label: "🎯 패스 연계! 순서를 기억했다가 그대로!",
    txt: { ok: "🎯 패스 연계를 정확히 이어갔어요", great: "🌟 원터치 연계로 수비를 완전히 무너뜨렸다!!", bad: "🙈 연계 타이밍이 어긋났어요" },
  },
  react: {
    stat: "defense", label: "🛡️ 결정적 순간! 신호가 켜지면 즉시 반응!", button: "커트!! 🛡️",
    txt: { ok: "🛡️ 결정적 순간에 바로 반응했어요", great: "⚡ 번개 같은 반응으로 실점을 막았다!!", bad: "😵 한 박자 늦어 뒷공간을 내줬어요" },
  },
  target: {
    stat: "pos", label: "🎯 슛 찬스 러시! 튀어나오는 기회를 놓치지 말고 탭!", icon: "⚽",
    txt: { ok: "✨ 침착하게 마무리했어요", great: "💫 완벽한 타이밍, 골망을 흔드는 슛!!", bad: "😱 급하게 차다 골대를 벗어났어요" },
    mf: {
      stat: "pass", label: "🎯 전진 패스 길! 열리는 공간을 놓치지 말고 탭!", icon: "🎯",
      txt: { ok: "🎯 정확한 전진 패스", great: "🌟 한 번에 수비를 가르는 침투 패스!!", bad: "🙈 패스 길을 놓쳤어요" },
    },
  },
  drop: {
    stat: "pos", label: "⚽ 트래핑! 떨어지는 공을 초록 존에서 딱 잡아 슛!", icon: "⚽",
    txt: { ok: "✨ 침착하게 마무리했어요", great: "💫 완벽한 트래핑에서 이어진 슛!!", bad: "😱 트래핑이 길어 기회를 놓쳤어요" },
  },
  odd: {
    stat: "dribble", label: "👀 수비 빈틈 포착! 다른 하나를 빠르게 찾아 탭!",
    txt: { ok: "🧠 빈틈을 찾아냈어요", great: "🎯 완벽하게 파고들어 수비를 벗겨냈다!!", bad: "🙈 빈틈을 못 찾고 막혔어요" },
    df: {
      stat: "defense", label: "👀 위험 감지! 다른 하나를 빠르게 찾아 탭!",
      txt: { ok: "🧠 위험을 미리 읽었어요", great: "🎯 완벽하게 읽어내 공격을 통째로 지웠다!!", bad: "🙈 한 박자 늦어 침투를 허용했어요" },
    },
  },
  duel: {
    stat: "dribble", label: "🧠 1:1 드리블! 수비수를 어디로 제칠까?", choices: ["왼쪽", "가운데", "오른쪽"],
    txt: { ok: "🧠 수비수의 무게중심을 뺏었어요", great: "🎯 완벽한 페인트로 제쳐냈다!!", bad: "🙈 수비수에게 공을 뺏겼어요" },
    mf: {
      stat: "dribble", label: "🧠 탈압박! 어느 쪽으로 빠져나갈까?", choices: ["왼쪽", "가운데", "오른쪽"],
      txt: { ok: "🧠 압박을 벗어났어요", great: "🎯 완벽한 턴으로 압박을 통째로 벗겨냈다!!", bad: "🙈 압박에 걸려 공을 뺏겼어요" },
    },
    df: {
      stat: "defense", label: "🛡️ 1:1 수비! 상대를 어느 쪽으로 몰까?", choices: ["왼쪽", "가운데", "오른쪽"],
      txt: { ok: "🛡️ 방향을 잘 좁혔어요", great: "🎯 완벽하게 몰아붙여 공을 뺏어냈다!!", bad: "🙈 방향을 잘못 읽어 제쳐졌어요" },
    },
  },
};
/* 포지션 변형이 있으면 그걸, 없으면 기본을 써요. stat "pos"는 내 포지션 주 스탯이에요. */
function miniSpec(mech) {
  const base = MINI_SPEC[mech] || MINI_SPEC.bar;
  const spec = Object.assign({}, base, base[S.pos] || {});
  const key = spec.stat === "pos" ? POS_INFO[S.pos].stat : spec.stat;
  return { spec, val: S.stats[key] || 40 };
}

function playRandomMini(container, cb) {
  const mech = pick(MINI_POOL[S.pos] || MINI_POOL.fw);
  const { spec, val } = miniSpec(mech);
  const T = spec.txt;
  if (autoMiniOn()) { cb(autoRes(val), T); return; }
  const done = (res) => cb(res, T);
  if (mech === "bar") {
    window.Timing.play(container, { label: spec.label, button: spec.button, zonePct: miniZone(val) }, done);
  } else if (mech === "hold") {
    window.Timing.hold(container, { label: spec.label, button: spec.button, zonePct: miniZone(val) }, done);
  } else if (mech === "seq") {
    window.Timing.sequence(container, {
      label: spec.label, icons: ["⚽", "🎯", "🏃", "🥅"],
      showMs: 900 + val * 6 + (S.condition - 50) * 3,
    }, done);
  } else if (mech === "react") {
    window.Timing.reaction(container, {
      label: spec.label, button: spec.button,
      perfectMs: 300 + val * 1.5, goodMs: 700 + val * 2.5,
    }, done);
  } else if (mech === "target") {
    window.Timing.target(container, {
      label: spec.label, icon: spec.icon, count: 3, lifeMs: 800 + Math.min(val, 130) * 3,
    }, done);
  } else if (mech === "drop") {
    window.Timing.drop(container, { label: spec.label, icon: spec.icon, zonePct: miniZone(val) }, done);
  } else if (mech === "odd") {
    window.Timing.odd(container, {
      label: spec.label, rounds: 2, sets: [["🧍", "🏃"], ["🥅", "⚽"], ["🟩", "🟢"]],
    }, done);
  } else {
    window.Timing.duel(container, {
      label: spec.label, choices: spec.choices,
      hintChance: clamp((val - 40) / 80 + (S.condition - 50) / 400, 0, 0.9),
    }, done);
  }
}

/* 🔥 승부처 성공이 무엇으로 남는가 — **기본은 포지션이 정해요.**
 *   g 극장골 · a 결정적 패스(도움) · d 실점 차단
 * 실제 축구에서도 수비수의 결정적 장면은 골이 아니라 차단이에요.
 *
 * ⚠️ 2026-08-30부터 **유일한 답이 아닙니다.** ⚔️ 유스 평가전은 그 경기의 성격
 * (`STAGE_TYPES.kind` — "수비 조직"이면 d)이 정해서 `MatchSim.run`에 넘겨요.
 * 그래서 **읽을 땐 `momentKind()`가 아니라 그 경기의 `mKind`를 보세요.** */
const MOMENT_KIND = { fw: "g", wg: "g", mf: "a", df: "d" };
const momentKind = () => MOMENT_KIND[S && S.pos] || "g";
const MOMENT_FEED = {
  g: (me) => `🌟 극장골!! ${me}, 결정적인 한 방을 꽂아요!`,
  a: (me) => `🎯 결정적인 패스!! ${me}의 침투 패스가 골로 이어집니다!`,
  d: (me, opp) => `🛡️ 결정적인 차단!! ${me}이(가) ${opp}의 마지막 공격을 지워냅니다!`,
};

/* ---------- ⚔️ 유스 평가전의 순간 카드 (v2) ----------
 *
 * 유스 3년은 36턴 훈련 + 평가전 15경기인데 **내가 개입하는 순간이 0회**였어요.
 * 평가전의 승부처가 v1의 `timing.js` 8종이라, 입단 전에 고르게 해놓은 🦶 주발과
 * ♿ 판정 확대가 유스 내내 **효과가 0인 죽은 스위치**였습니다 — 고르게 해놓고
 * 효과가 없는 칸(원칙 ③)이 이미 화면에 있었던 거예요. 둘 다 `winger-moment.js`만
 * 읽는데 그건 프로 경기(`runV2Match`)에서만 불렸습니다.
 *
 * 첫 평가전이 **1년차 6월 — 36턴 중 6턴째, 약 2~3분**이에요. 그 자리를 v2의
 * 순간 카드 4종(💨 컷인 · ⚡ 1:1 · ✨ 킬패스 · 🧱 차단)으로 바꿉니다.
 *
 * 🔒 **판정 산식은 프로와 한 글자도 다르지 않습니다.**
 *
 *     P(사건 | 카드) = clamp( autoP + 2*half(a)*(s − 0.5), 0, 1 )
 *
 * 조작 성공도 `s`를 내는 것도(W2Moment), 그걸 확률로 옮기는 것도
 * (`WingerEngine.judgeAtP`) 전부 기존 코드 그대로예요. 유스가 새로 주는 것은
 * **중심 `autoP` 하나뿐**입니다.
 *
 * ── 🔴 유스의 autoP는 **또래 기준선에 대한 내 실력**입니다 (2026-08-31 개정) ──
 *
 * 🗑️ **폐기: 상수 중심.** 처음에는 중심을 상수로 뒀어요 — *"등급은 `stageScore`가 이미
 * 능력치로 정하니 중심에 또 얹으면 이중 계상"*이라는 이유였습니다. 그런데 그러면
 * **능력치가 들어가는 자리가 `half(a)` 하나뿐**이 되고, `half`는 40→120에서 0.17→0.20밖에
 * 안 움직여요. 게다가 `blendOf`의 바닥 40이 유스를 통째로 눌러서(아래 참고) 실측한 값이
 * **36턴 내내 40.0 → 40.8**이었습니다. 결과는 이랬어요:
 *
 *     s = 0.5 에서 성공률이 **정의상 모든 능력치에 대해 같음** · s = 1.0 에서도 +3%p
 *     → *"36턴을 훈련해도 평가전이 안 나아진다"* (83번 §9)
 *
 * 🔴 **폐기된 건 「상수」라는 형태입니다.** 이름을 바꿔 상수를 되살리지 마세요.
 * 그리고 클램프·성장 곡선은 **손잡이가 아니에요** — 둘 다 지워도 +3%p입니다(83번 §9-2).
 *
 * ★ **축은 `autoP`입니다.** 프로가 `createMatch`에서 전력·능력치로 중심을 뽑는 것과
 * 같은 자리예요. 다만 **프로 산식(`pFinish`/`pConcede`)을 그대로 가져오지는 않습니다** —
 * 그건 여전히 성립하지 않아요:
 *   ① `sc(a)`는 **프로 기준(능력치 70)**으로 재는 값입니다. 상대가 또래 유망주인 판에
 *      17세를 그 자로 재면 *"프로 무대에 던져진 아이"*가 돼요
 *   ② `defW = 1 − atkW`라 **공격에 맞추면 수비가 죽습니다** — 유스에는 클럽 전력이 없어
 *      atkW를 정할 근거 자체가 없어요
 *
 * 그래서 **유스 전용 기준점을 두고, 거기서 능력치만큼 움직입니다** (83번 §9-3):
 *
 *     autoP = YOUTH_CARD_P[kind] × clamp( overall() ÷ 기준선, 0.60, 1.40 )
 *       기준선 = `PEER_REF[무대]` — 🏘️ 동네 · 🏆 평가전 · 🔥 프로 도전이 **한 표의 세 점**입니다
 *
 * 그 무대의 기준선에서 **정확히 `YOUTH_CARD_P`가 나옵니다** — 그래서 유스 3년의 **명성과
 * 프로 도전 통과율이 개정 전 그대로**예요(원칙 ④). 잘 키운 유스만 위로, 안 키운 유스만
 * 아래로 갈라집니다.
 *
 * ── 🔴 왜 `blendOf`(포지션 혼합)가 아니라 `overall()`(6칸 평균)인가 ──
 * 둘 다 *지금 실력*이지만 재는 것이 다릅니다.
 *   `blendOf` 주 스탯에 0.60을 실어요 — **"맞는 칸에 몰빵했나"**를 봅니다
 *   `overall()` 6칸 평균 — **"얼마나 훈련했나"**를 봅니다
 *
 * ★ **① 결정적인 이유 — `blendOf` 자 위에서는 「중립화 상수」가 존재할 수가 없습니다.**
 *   실측: 36턴 뒤 `blendOf`가 보는 값이 고루 훈련 **31.0** vs 주 스탯 몰빵 **45.5**(1.5배).
 *   기준선을 31.0으로 잡든 45.5로 잡든 **그 선택이 곧 정책 난이도**예요 —
 *   어느 쪽도 "아무도 세지거나 약해지지 않는 점"이 아닙니다.
 *   🔴 이건 「훈련 상승폭」에서 데인 것보다 **한 단계 나쁜 형태**입니다. 그때는 중립화
 *   상수에 **손잡이 이름**을 붙인 게 문제였지만, 여기서는 **중립화할 점 자체가 없어요.**
 *   `overall()`은 훈련 총량이라 정책이 바뀌어도 안 움직입니다(**28.7 ↔ 28.9**) —
 *   그래서 이 자 위에서만 중립점이 하나로 정해집니다.
 *
 *   🟡 **② 보조 — 이중 계상.** 몰빵은 `stageScore`도 봅니다(`main × 0.55 + aux × 0.2`).
 *   ⚠️ 다만 **완전히 같은 축은 아니에요** — `stageScore`의 `main`은 **그 경기의 성격**
 *   (`STAGE_TYPES`)이고 `blendOf`의 가중은 **내 포지션**(`BLEND[pos]`)입니다.
 *   15경기에 경기 성격 4종이 돌아 **평균적으로 겹칠 뿐**이라, 이건 근거를 거드는 정도예요.
 *   🔴 ①과 ②를 나란히 두지 마세요 — 다음 사람이 약한 ②를 반증하고 자를 되돌립니다.
 *
 *   ✅ **③ 그리고 이게 성장 루프의 문장이기도 합니다 — 유스는 총량, 프로는 특화.**
 *   자가 무대마다 다른 건 결함이 아니라 *"어릴 땐 뭐든 많이 해라, 프로에선 무기를 갈아라"*
 *   를 구조가 말하는 거예요.
 *
 * ⚠️ **`overall()`이 몰빵에 「반대 압력」을 거는 게 아닙니다 — 중립일 뿐이에요**(28.7 ↔ 28.9).
 *    `blendOf`가 몰빵을 **한 경기에 두 번 보상**해서 중립이 이기는 겁니다.
 *    🔴 몰빵에 대한 반대 압력을 여기서 만들지 마세요 — 그 자리는 **훈련 3택**입니다.
 *
 * 🔒 `blendOf`는 그대로 남습니다 — **폭**(`half(a)`)이 그 값을 씁니다. 프로와 같은 자예요.
 *    (유스에서는 바닥 40에 눌려 사실상 0.17 고정입니다. 이번에 살아난 건 **중심**이에요.)
 *
 * ⚠️ **`miniZone(stat)`은 유스에서 폐기됩니다.** 능력치가 판정 창을 넓히는 건
 * `autoP`가 능력치를 안 타던 옛 구조의 값이에요 — 표가 아니라 **그 표를 잰 모델이**
 * 다릅니다(설계 §4-5). 판정 창에 걸리는 건 🦶 주발(±25%)·🫀 컨디션·♿ 확대뿐이에요. */
const YOUTH_CARD_KIND = { g: "goal", a: "assist", d: "defend" };
/* 🎚️ **기준선(`PEER_REF`)에 선 유망주가 받는 중심 확률.** balancer의 손잡이는 이 둘이에요 —
 * 여기를 움직이면 평가전 곡선이 통째로 따라옵니다.
 *
 * 값의 근거: 엔진 `outcome` 표에서 ⚽🅰️는 `miss = (1−p)/2`라 **p = ⅓에서 perfect = miss**,
 * 🧱은 이분(읽기 게임)이라 **p = 0.5**입니다. 즉 또래 평균에게는 **등급 ±1칸의 기댓값이
 * 정확히 0**이에요 — 새 축을 얹는 것만으로 유스가 세지거나 약해지지 않습니다(원칙 ④). */
const YOUTH_CARD_P = { goal: 1 / 3, assist: 1 / 3, defend: 0.5 };
/* ══════════════════════════════════════════════════════════════════════
 * 📏 **또래 기준선 표 — 「중립화 상수」입니다. 트레이드오프 손잡이가 아니에요.**
 * ══════════════════════════════════════════════════════════════════════
 *
 * ── 무엇을 하나 ──
 * 유스 카드의 중심이 **내 실력(`overall()`) ÷ 그 무대의 기준선**으로 정해집니다.
 * 기준선에서 중심이 정확히 `YOUTH_CARD_P`가 되고, 그 무대의 **명성·통과율이 개정 전 그대로**예요.
 * **난이도를 정하는 값이 아니라, 새 축을 얹으면서 곡선을 안 움직이려고 두는 값입니다.**
 *
 * ── 🔴 **한 표입니다. 칸 하나만 다시 재지 마세요.** ──
 * 세 칸은 독립된 세 상수가 아니라 **「36턴 성장 분포」라는 한 함수의 세 점**이에요.
 * 훈련 산식이 움직이면 **세 칸이 같이** 움직입니다. 한 칸만 다시 재면 나머지가 옛 분포에
 * 남아 조용히 어긋나요 — 실제로 🔥 프로 도전 칸이 없던 동안 **통과율이 +46%**였습니다.
 * 🔑 `NPC_SPOT` 사고의 **반대 방향**입니다. 그때는 한 벌을 하나로 **줄여서** 곡선이 무너졌고,
 *    여기서는 한 벌을 여럿으로 **흩어서** 같은 사고가 납니다. **표로 묶어 둡니다.**
 *
 * ── 🎭 왜 무대마다 다른가 ──
 * 견주는 또래가 다릅니다. 🏘️ 동네와 🏆 평가전은 **같은 나이의 또래**, 🔥 프로 도전은
 * **3년을 다 채운 유망주들**이에요. `overall()` 평균이 평가전 15경기는 **28.6**인데
 * 프로 도전 시점은 **36.5**입니다 — 자 하나로 둘을 재면 위쪽 무대가 통째로 쉬워져요.
 *
 * ── 🔴 이 값을 만지려는 사람에게 ──
 * *"유스가 너무 쉬우니 기준선을 올리자"* 가 정확히 하면 안 되는 일이에요.
 * **세기는 `YOUTH_CARD_P`가 맡습니다.** 프로 도전 통과 난이도는 `GRADE_PASS`·
 * `DONE_PASS_CAP`·기본값 `0.51` 쪽이고요. 둘 다 세기를 정하면 서로 얽혀서
 * 어느 쪽을 만져도 다른 쪽이 깨집니다 — 「훈련 상승폭」에서 데인 자리와 같은 형태예요.
 *
 * ── ⚠️ 「그 무대 또래의 평균 실력」이 아닙니다. 평균보다 **위**예요 ──
 * 🏆 평가전 15경기의 `overall()` 평균은 **28.3**인데 기준선은 **32.0**입니다.
 * 평균에 맞추면 유스가 통째로 세져요 (실측: 명성 **+21%** · 프로 도전 통과율 **+31%**).
 * 🔑 원인은 **등급 D의 바닥**입니다 — `renderStageSim`의 `Math.max(0, gi − 1)`.
 * 유스 등급의 60%가 D라서 ±1칸이 **위로만 열려 있어요.** 중심에 능력치를 실으면
 * 위로 새는 몫이 커집니다. **🔴 D 바닥은 프로 도전에도 똑같이 있습니다** —
 * 그래서 세 칸 **전부** 평균이 아니라 **A/B 브래킷**으로 잡았어요(84번 §3-3).
 *
 * ── 🔗 종속값입니다 — 다음 넷 중 하나가 바뀌면 **표 전체를 다시 돌리세요** ──
 *   ① 훈련 산식 · 나이 곡선 · `POOL 194` · 유스 성장 배수 (36턴 분포)
 *   ② `gradeOf`의 문턱 / `GRADE_INFO`의 pts (등급 분포와 D 바닥의 무게)
 *   ③ `renderStageSim`의 등급 ±1칸 매핑
 *   ④ `YOUTH_CARD_P`
 *   측정: 게임 입구 → 36턴 → 평가전 15경기 + 프로 도전 4라운드.
 *         **공통 난수(CRN)로 짝지어** 300벌 — 안 짝지으면 시드마다 답이 달라집니다(84번 §3-3b)
 *
 * ── 📐 `YOUTH_SPAN`(비율 clamp)의 폭 ──
 * 중심이 0이나 1에 닿으면 조작 폭(`±2·half(a)`, 최대 ±0.20)이 잘려서 **조작이 무의미해집니다.**
 * 엔진이 *"clamp에 걸리는 칸이 생기면 중심을 옮기지 말고 half를 줄이라"*고 적어 둔 자리라
 * (engine.js §2-6), 애초에 안 닿게 **비율 쪽을 자릅니다.**
 *   🧱 0.5 × 1.40 = 0.70 → +half 0.20 = 0.90 · 0.5 × 0.60 = 0.30 → −half = 0.10  ✅ 안 걸림
 * 🔴 **비율이 clamp에 「붙어 사는」 상태가 되면 안 됩니다.** 창이 움직여 다들 한쪽 끝에
 *    몰리면 **축이 통째로 죽어요** — 성공률 값만 보면 정상으로 보이는 자리입니다.
 *    실측(🇰🇷 · wg · 고루 훈련 · 60벌 · 카드 오는 횟수만큼):
 *      🏆 평가전   아래 접촉 7.7% · 위 0.0% · 중앙값 비율 0.885
 *      🔥 프로 도전 아래 접촉 0.0% · 위 0.0% · 중앙값 비율 0.996
 *    아래 접촉은 **거의 전부 1년차**예요 — 설계된 바닥이 일하고 있는 겁니다.
 *    ⚠️ 훈련 산식이 초반을 낮추면 **이 칸이 먼저 움직입니다.** 84번 §6-3의 N-4가 지켜요.
 *    ⚠️ **백분위(25~75% 같은)로 재지 마세요** — 백분위는 등급 D 바닥 같은 분포 모양에
 *       흔들려서 재려던 것과 다른 걸 잽니다(84번 §3-1c). */
const PEER_REF = {
  /* ══════════════════════════════════════════════════════════════════
   * 🏘️ 동네 — 🔗 **종속값입니다. 숫자가 아니에요** (2026-09-01 · designer 101번 §4)
   * ══════════════════════════════════════════════════════════════════
   *
   * 🏫 학교에서 엔진이 보는 몸은 **여덟 판 내내 전원이 `evenStats()`**입니다
   * (`town.js`의 `evenBody`). 그래서 이 칸은 **그 몸의 `overall()`과 정확히 같아야** 해요.
   * 같아야 비율이 **1.000**이고, 그래야 ⚽🅰️의 중심이 정확히 ⅓ · 🧱이 정확히 ½이라
   * **카드 한 장의 기대 점수가 딱 1**입니다 — §5-3의 편차 밴드 대칭이
   * 「거의」가 아니라 **정확히** 성립하는 조건이에요.
   *
   * ── 🚨 고치기 전에는 「거의」였습니다 ──
   * `32.0`은 ⚔️ 평가전에서 가져온 값이라 `evenStats()`의 평균(**32.333…**)과 어긋났고,
   * 비율 **1.0104** → `autoP`가 ⅓·½가 아니라 **0.3368 · 0.5052** → **카드 평균이 1.005~1.010**.
   * 장마다 +0.0075점씩 위로 새서 `E[d]`가 **N에 비례해** 커졌습니다:
   *     N=2 **+0.019%** · N=5 **+0.057%** · N=8 **+0.094%**  ← 카드가 늘수록 커집니다
   * 🔑 `tests/winger2/town-neutral-test.js`의 S-3e가 **이 불일치를 이미 적어 뒀는데**
   *    *"±0.5% 안이니 통과"*라 아무도 원인을 안 물었어요.
   *    ⚠️ **문턱을 통과한 편향에도 원인이 있습니다.**
   *
   * ── 🔒 「동네 전용 세기 상수」를 되살린 게 아닙니다 ──
   * 87번이 폐기한 것은 **「동네만 따로 난이도를 정하는 값」이라는 형태**예요.
   * 이건 **아무것도 안 정합니다** — `evenStats()`가 정하는 값을 **따라갈** 뿐이에요.
   * 🔴 그러니 여기에 **숫자를 적지 마세요.** 숫자를 적는 순간 그게 손잡이가 되고,
   *    `POOL`이 바뀐 날 조용히 다시 어긋납니다.
   * 🔴 그리고 이 칸을 **난이도 손잡이로 만지지 마세요** — 세기는 `YOUTH_CARD_P`가 맡습니다.
   *
   * ⚠️ `prospect.js`는 이 파일 **뒤에** 실려서 로드 시점에는 `WingerProspect`가 없어요.
   *    그래서 상수가 아니라 **읽을 때 계산하는 칸**입니다. 없으면 0을 돌려주고,
   *    `youthAutoP`가 그때 `PEER_REF.eval`로 떨어집니다(그 경우엔 `x`도 0이라 결과는 `base`예요). */
  get town() {
    const P = window.WingerProspect;
    if (!P || typeof P.evenStats !== "function") return 0;
    const st = P.evenStats();
    const ks = Object.keys(st);
    return ks.length ? ks.reduce((a, k) => a + st[k], 0) / ks.length : 0;
  },
  eval: 32.0,        // 🏆 유스 평가전 (1·2년차 6·12월 · 3년차 6월 — 15경기)
  survival: 36.5,    // 🔥 프로 도전 (3년차 12월 · 4라운드)
};
const YOUTH_SPAN = [0.60, 1.40];

/* ⚔️ 이 유망주의 카드 중심. `x`는 **지금 실력의 종합**(`overall()`)이에요.
 * ⚠️ 값이 이상하면(세이브가 깨졌거나 스탯이 통째로 비었을 때) **기준선 값**으로
 *    떨어집니다 — 평가전이 그 자리에서 멈추면 안 돼요. */
function youthAutoP(kind, x, ref) {
  const base = YOUTH_CARD_P[kind] != null ? YOUTH_CARD_P[kind] : YOUTH_CARD_P.goal;
  const r = ref > 0 ? ref : PEER_REF.eval;
  if (!(x > 0)) return base;
  return base * clamp(x / r, YOUTH_SPAN[0], YOUTH_SPAN[1]);
}
/* 결과 대사 — MatchSim이 { ok, great, bad }를 그대로 중계에 씁니다.
 *
 * 🔴 **카드 종류(g/a/d)로 뽑습니다 — moment 이름이 아니에요.**
 *    미니게임이 🥅 골문 6칸 하나로 줄면서 `MINI` 표의 `cutin`·`killpass`가 **화면에 안 뜹니다.**
 *    그런데 표를 moment로 두면 윙어의 결정 카드가 *"완벽한 컷인!"*이라고 중계하면서
 *    화면은 골문 격자를 보여 줘요 — **화면과 말이 어긋나는 자리**입니다.
 *    🔒 `MINI`(engine.js)는 한 줄도 안 건드렸어요. 바뀐 건 **대사를 무엇으로 고르느냐**뿐입니다.
 * 🧱 수비는 판을 안 열지만(117번 §6) **중계 한 줄은 그대로 나갑니다** — 그게 c안의 화면이에요.
 *    판정에 `ok`가 없어도 칸은 채워 둡니다 — 비워 두면 표가 바뀐 날 `undefined`를 뱉어요. */
const YOUTH_CARD_TXT = {
  goal: { ok: "⚡ 키퍼와 맞섰지만 각이 조금 좁았어요", great: "⚡ 1:1을 완벽하게 넘겼다! 골망이 흔들려요!!", bad: "😵 1:1에서 서두르다 키퍼에 막혔어요" },
  assist: { ok: "🅰️ 연결은 갔지만 한 박자 늦었어요", great: "✨ 키퍼가 비운 쪽으로 완벽한 컷백!!", bad: "🙈 패스 길이 막혀 끊겼어요" },
  defend: { ok: "🛡️ 몸을 걸쳐 슛을 흘려냈어요", great: "🛡️ 코스를 지워 냈다! 위기를 넘깁니다!!", bad: "😵 코스가 열려 그대로 내줬어요" },
};

/* 평가전 한 경기의 순간 카드를 엽니다. `cb(판정, 대사)` — MatchSim의 계약 그대로예요.
 *   kindKey — g/a/d. 그 경기의 성격(STAGE_TYPES.kind)이나 내 포지션이 정해요.
 * ⚠️ 엔진이나 미니게임이 아직 안 실렸으면 **v1 승부처로 조용히 떨어집니다** —
 *    스크립트 하나가 안 왔다고 평가전이 통째로 멈추면 안 돼요. */
function playYouthMoment(container, cb, kindKey) {
  const E = window.WingerEngine, M = window.W2Moment;
  if (!E || !E.judgeAtP || !M || !M.play) { playRandomMini(container, cb); return; }
  const kind = YOUTH_CARD_KIND[kindKey] || "goal";
  const pool = ((E.MINI || {})[kind] || {})[S.pos] || ["oneone"];
  const moment = pick(pool);
  const T = YOUTH_CARD_TXT[kind] || YOUTH_CARD_TXT.goal;
  /* 능력치는 프로와 **같은 자로** 잽니다 — 포지션별 혼합(BLEND)이라, 미드필더가
   * 패스를 올리면 그만큼 흔들 수 있는 폭이 넓어져요.
   *
   * 🔴 **자를 두 번 댑니다. 자리가 다릅니다.**
   *   `ability`(= blendOf) → 조작이 흔드는 **폭** `half(a)`. 프로와 같은 값이라 그대로 둬요
   *   `overall()`          → 카드의 **중심**. 왜 여기만 다른 자인지는 PEER_REF 위 주석에 */
  const ability = E.blendOf({ pos: S.pos, stats: WingerProspect.nowStats(S) });
  /* 🎭 무대마다 견주는 또래가 달라서 기준선도 다릅니다 (`PEER_REF` 주석).
   * `ev`는 지금 진행 중인 대회예요. 없거나 모르는 값이면 🏆 평가전 기준으로 둡니다. */
  const autoP = youthAutoP(kind, overall(), ev && ev.kind === "survival" ? PEER_REF.survival : PEER_REF.eval);
  const judge = (s) => E.judgeAtP(kind, autoP, ability, s);
  /* 🧱 **수비는 판을 안 엽니다** (117번 §6 · c안) — 🤖 자동 진행과 **같은 갈래**로 흘려요.
   * `cardP(autoP, a, 0.5) = autoP`라 결과가 자동 갈래와 정의상 같고, 중계 한 줄은 그대로 나갑니다.
   *
   * 🔴 **`kind === "defend"`라고 여기 따로 적지 않습니다.** 그러면 판단이 둘이 되어
   *    한쪽을 지워도 증상이 0장이 되고, **검사가 통째로 아무것도 못 지킵니다**
   *    (CLAUDE.md 「방어가 겹침」). 🔑 주인은 `W2Moment.opens(kind)` **하나**예요.
   * ⚠️ 그리고 이 물음은 **상자를 비우기 전에** 와야 합니다 — 뒤로 가면 `play()`가
   *    화면을 안 그리고 돌아왔을 때 **아무것도 안 하는 빈 유스 상자**가 남아요. */
  if (autoMiniOn() || (M.opens && !M.opens(kind))) { cb(judge(0.5), T); return; }
  if (container) {
    container.innerHTML = "";           // 앞 카드의 잔해 위에 쌓이지 않게
    container.classList.add("w2m-youth");   // 🎨 유스 맥락 — 연출은 director가 이어받아요
  }
  M.play(container, {
    kind, moment, condition: S.condition,
    foot: mainFoot(),                   // 🦶 주발 쪽 코스가 판정 창 +25%예요 (여기서 살아나요)
    judge,
  }, (res) => cb(res, T));
}

// ---------- 경기 시뮬레이션 뷰 (스코어보드 + 미니 필드 + 중계) ----------
// 유스/프로 경기 공통. #stage-card 안에 렌더하고 #btn-stage-next를 재사용해요.
const MatchSim = (() => {
  let timer = null;
  function run(cfg) {
    const { home, away, myName, goals, assists, defense, oppGoals } = cfg;
    clearInterval(timer);
    /* 🔥 이 경기의 승부처가 **무엇으로 열리고 무엇으로 남는가.**
     *
     * 기본은 예전 그대로예요 — 포지션이 정하고(momentKind), v1 승부처 8종이 열립니다.
     * ⚔️ 유스 평가전만 둘 다 넘겨서 v2 순간 카드로 갈아 끼워요(playEvalStage).
     * 🏆 컵·🌍 월드컵은 아무것도 안 넘기니 **한 줄도 안 달라집니다.**
     *
     * ⚠️ mKind는 여기서 **한 번만** 정해요. 경기 도중에 다시 부르면 떼어 둔 실점
     * (holdConceded)을 정할 때와 결과를 붙일 때가 서로 다른 답을 볼 수 있어요. */
    const mKind = cfg.momentKind || momentKind();
    const playMoment = cfg.playMoment
      ? (el, done) => cfg.playMoment(el, done, mKind)
      : playRandomMini;
    $("stage-card").innerHTML = `
      <div class="msim">
        <div class="scoreboard">
          <span class="sb-team home">${home}</span>
          <span class="sb-score"><b id="sb-h">0</b><i>:</i><b id="sb-a">0</b></span>
          <span class="sb-team away">${away}</span>
        </div>
        <div class="sb-clock">⏱ <span id="sb-min">0</span>'</div>
        <div class="pitch">
          <span class="pitch-mid"></span>
          <span class="net left">🥅</span><span class="net right">🥅</span>
          <span class="ball" id="ball">⚽</span>
        </div>
        <div class="pbp" id="pbp"></div>
        <div id="stage-moment"></div>
        <div id="stage-result"></div>
      </div>`;
    let h = 0, a = 0;
    const setScore = () => { $("sb-h").textContent = h; $("sb-a").textContent = a; };
    const setMin = (m) => { const el = $("sb-min"); if (el) el.textContent = m; };
    const moveBall = (side) => {
      const b = $("ball"); if (!b) return;
      b.style.left = (side === "atk" ? 82 : side === "def" ? 18 : 50) + "%";
      b.style.top = (26 + Math.random() * 46) + "%";
    };
    const flash = (side) => {
      const p = document.querySelector(".msim .pitch"); if (!p) return;
      p.classList.remove("goal-h", "goal-a"); void p.offsetWidth;
      p.classList.add(side === "atk" ? "goal-h" : "goal-a");
    };
    const feed = (text, cls) => {
      const d = document.createElement("div");
      if (cls) d.className = cls;
      d.textContent = text;
      $("pbp").appendChild(d);
      $("pbp").scrollTop = $("pbp").scrollHeight;
    };

    // 골·실점·기타 이벤트를 분(') 순으로 배치
    const evs = [];
    const rmin = () => randInt(6, 82);
    for (let i = 0; i < goals; i++) evs.push({ min: rmin(), side: "atk", h: 1, cls: "good", text: `⚽ 골!! ${myName} 득점!` });
    for (let i = 0; i < assists; i++) evs.push({ min: rmin(), side: "atk", h: 1, cls: "good", text: `🅰️ ${myName}의 도움! 팀 추가골` });
    /* 동료 골이에요. 평점을 안 넘겨준 호출부(유스 등)에서는 0이 되도록 막아뒀어요.
     *
     * ⚠️ 예전에는 "⚽ 동료의 골!"이라고만 떴어요. 이름이 없으니 그 골이 개인
     * 순위 어디에도 안 남았고, **경기에서 팀원이 두 골 넣는 걸 봤는데 득점 순위에
     * 그 선수가 없는** 일이 생겼습니다(제보). 이제 우리 팀 선수 이름으로 넣고,
     * 누가 넣었는지 mateGoals로 돌려줘서 career.js가 시즌 기록에 올려요. */
    const mateNames = Array.isArray(cfg.mates) ? cfg.mates.filter(Boolean) : [];
    /* 동료 골 수는 **부르는 쪽에서 넘겨줘요.** 실점(deriveOppGoals)이 우리 팀 골을
     * 봐야 하는데, 여기서 굴리면 부르는 쪽은 그 값을 모른 채 실점을 정하게 돼요.
     * 안 넘어오면 예전처럼 여기서 굴립니다(유스 경기 같은 옛 호출부). */
    const mates = cfg.mateCount != null ? cfg.mateCount
      : (cfg.rating != null ? teammateGoals(cfg.rating, cfg.oppStr) : 0);
    const mateGoals = [];
    for (let i = 0; i < mates; i++) {
      const who = mateNames.length ? mateNames[randInt(0, mateNames.length - 1)] : null;
      if (who) mateGoals.push(who);
      evs.push({ min: rmin(), side: "atk", h: 1, cls: "good",
        text: who ? `⚽ ${who}의 골! 팀이 추가점을 뽑아냅니다` : `⚽ 동료의 골! 팀이 추가점을 뽑아냅니다` });
    }
    /* 🛡️ 수비수의 승부처는 **실점을 막는 것**이에요. 그런데 예전에는 이미 들어간
     * 골을 스코어에서 빼는 방식이었어요 — 중계에는 "😣 실점…"이 세 번 떠 있는데
     * 결과는 2실점이 됩니다(제보: "중계 텍스트에서는 3실점인데 경기 끝나면
     * 2실점으로 되어 있네"). 축구에서 들어간 골은 지워지지 않아요.
     *
     * 그래서 **한 골을 떼어 뒀다가** 승부처에서 정해요.
     *   막으면  → 그 골은 아예 안 들어가요 (중계에도 안 떠요)
     *   놓치면  → 그때 들어가고 중계에도 그때 떠요
     * 최종 실점 수는 예전과 똑같아요 — 언제 보여주느냐만 바뀝니다. */
    const holdConceded = mKind === "d" && oppGoals > 0 ? 1 : 0;
    for (let i = 0; i < oppGoals - holdConceded; i++) evs.push({ min: rmin(), side: "def", a: 1, cls: "bad", text: `😣 ${away}에 실점…` });
    if (defense >= 2) evs.push({ min: rmin(), side: "def", text: `🛡️ ${myName}, 결정적 태클로 위기를 끊어요!` });
    evs.push({ min: rmin(), side: "mid", text: pick(["중원 싸움이 뜨거워요", "빠른 템포로 오가는 공방", "관중석이 들썩입니다", "양 팀 압박이 매섭습니다"]) });
    evs.sort((x, y) => x.min - y.min);
    const momentMin = Math.min(88, Math.max(78, (evs.length ? evs[evs.length - 1].min : 60) + 4));

    let i = 0, momentDone = false, finished = false;
    const btn = $("btn-stage-next");

    const applyEvent = (e) => {
      setMin(e.min); moveBall(e.side);
      if (e.h) { h += 1; setScore(); flash("atk"); }
      if (e.a) { a += 1; setScore(); flash("def"); }
      feed(e.text, e.cls);
    };
    const step = () => {
      if (i >= evs.length) { clearInterval(timer); moment(); return; }
      applyEvent(evs[i++]);
    };

    function moment() {
      if (momentDone) return;
      momentDone = true;
      clearInterval(timer);
      setMin(momentMin); moveBall("atk");
      feed("🔥 결정적인 순간이 찾아와요…!", "good");
      btn.disabled = true;
      btn.textContent = "🔥 승부처!";
      playMoment($("stage-moment"), (res, mtype) => {
        // 떼어 둔 실점을 지금 넣어요 (막았으면 안 넣어요 — 지우는 게 아니라 안 들어가는 거예요)
        const letIn = () => {
          if (!holdConceded) return;
          a += 1; setScore(); flash("def");
          feed(`😣 ${away}에 실점…`, "bad");
        };
        if (res === "perfect") {
          /* 🔥 승부처 성공이 **무엇으로 남는지는 이 경기의 mKind가 정해요** —
           * 기본은 포지션(극장골·결정적 패스·실점 차단)이고, ⚔️ 유스 평가전만
           * 그 경기의 성격이 정합니다. 경기 시작할 때 한 번 정해 둔 값이에요. */
          const kind = mKind;
          if (kind !== "d") { h += 1; setScore(); flash("atk"); }
          feed(mtype.great, "good");
          feed(MOMENT_FEED[kind](myName, away), "good");
        } else if (res === "miss") {
          letIn();
          a += 1; setScore(); flash("def");
          feed(mtype.bad, "bad");
          feed(`😱 치명적인 실수… ${away}에 한 점을 내줍니다`, "bad");
        } else {
          letIn();
          feed(mtype.ok);
        }
        setMin(90);
        feed("삐— 경기 종료 휘슬! 🔔");
        finish(res);
      });
    }

    function finish(momentRes) {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      const res = h > a ? "W" : h < a ? "L" : "D";
      /* ⚠️ 승부처 성공이 붙는 자리(골/도움/차단)가 경기마다 달라요 — `mKind`가 정합니다.
       *
       * 예전에는 포지션과 무관하게 **내 골 +1**이었어요. 그런데 ⚽ 득점 눈금
       * (GOAL_SCALE 0.33)이 들어가면서 산식이 뽑는 골이 확 줄어, 이 한 골이
       * 득점의 대부분을 차지하게 됐습니다 — 실측: 극장골이 차지하는 비중이
       * 공격수 68% · 미드필더 81% · **수비수 95%**.
       * 제보로 확인된 화면: 슛 36 · 수비 95인 수비수가 6경기 6골로 득점 2위.
       * 중계도 "번개 같은 반응으로 실점을 막았다"고 해놓고 바로 다음 줄에
       * "극장골!!"이라 적어, 화면 안에서 스스로 모순이었어요. */
      const info = {
        home, away,
        myGoals: goals + (momentRes === "perfect" && mKind === "g" ? 1 : 0),
        assists: assists + (momentRes === "perfect" && mKind === "a" ? 1 : 0),
        defense: defense + (momentRes === "perfect" && mKind === "d" ? 1 : 0),
        teamGoals: h, oppGoals: a, res, momentRes,
        mateGoals,     // 이 경기에서 골을 넣은 우리 팀 선수 이름 (개인 순위에 올라가요)
      };
      const out = cfg.finalize(info);
      $("stage-result").innerHTML = out.resultHTML;
      btn.disabled = false;
      btn.textContent = out.nextLabel;
      btn.onclick = out.nextFn;
    }

    setScore(); setMin(0); moveBall("mid");
    feed(`🏟️ ${home} vs ${away} — 킥오프!`);
    btn.textContent = "⏩ 빨리감기";
    btn.disabled = false;
    btn.onclick = () => {
      if (momentDone || finished) return;
      clearInterval(timer);
      while (i < evs.length) applyEvent(evs[i++]);
      moment();
    };
    timer = setInterval(step, 780);
  }
  return { run };
})();

// 유스 경기(평가전/트라이아웃) — MatchSim로 시뮬레이션
const YOUTH_OPP_STR = 52;   // 유스 평가전 상대 전력 (기본 70보다 낮게 — 우리가 주최 측이에요)
/* stageKind — ⚔️ 순간 카드를 무엇으로 열까요 (g/a/d).
 *
 * 🏆 평가전은 **그 경기의 성격**이 정해요(`STAGE_TYPES.kind`) — 화면에 "수비 조직"이라
 * 적혀 있고 점수도 defense로 재는데 손에 오는 게 슛이면 화면이 스스로 어긋납니다.
 * 덕분에 포지션과 무관하게 **4종이 전부** 유스에 나와요.
 *
 * 🔥 프로 도전(트라이아웃~계약)은 **안 넘겨서 내 포지션이 정합니다.** 거기는
 * "내 자리로 평가받는 자리"이기도 하고, 무엇보다 라운드 판정의 활약 항(doneP)이
 * 골 0.04 · 도움 0.03 · 수비 0.015로 **무게가 다릅니다** — 여기서 카드 종류를 흔들면
 * 통과율이 조용히 움직여요(원칙: 다른 축의 손잡이로 고치지 않기). */
function renderStageSim(type, grade, onFinal, stageKind) {
  const gradeRating = { S: 8.4, A: 7.2, B: 6.1, C: 4.9, D: 3.7 }[grade.g] || 6;
  const rating = clamp(gradeRating + rand(-0.5, 0.5), 1, 10);
  const c = matchContribution(rating);
  /* 유스 경기는 클럽 전력이라는 개념이 없어요.
   *
   * ⚠️ 상대를 안 넘기면 "대등한 경기"가 되는데, 그러면 유스 승률이 92%에서 44%로
   * 떨어져요. 유스 라운드 판정에 승패가 ±0.06으로 들어가 있어서 통과율이 통째로
   * 내려갑니다(실측: 브라질·수비수 프로 진입 45% → 38%).
   * 유스 평가전은 **우리가 주최 측이고 상대는 초청팀**이라, 조금 유리한 판으로
   * 잡아요. 예전 산식(내 평점만 보던 시절)의 승률에 맞춘 값이에요. */
  const mates = teammateGoals(rating, YOUTH_OPP_STR);
  const oppGoals = deriveOppGoals(rating, WingerProspect.nowStats(S).defense, YOUTH_OPP_STR, c.g + c.a + mates);
  MatchSim.run({
    home: "우리 유스",
    away: pick(oppClubs(S)),
    myName: S.name,
    goals: c.g, assists: c.a, defense: c.def, oppGoals, rating, mateCount: mates,
    /* ⚔️ 유스의 승부처는 v2 순간 카드예요 — 여기서 🦶 주발과 ♿ 판정 확대가 살아납니다. */
    momentKind: stageKind || momentKind(),
    playMoment: playYouthMoment,
    finalize: (info) => {
      let gi = GRADE_ORDER.indexOf(grade.g);
      if (info.momentRes === "perfect") gi = Math.min(4, gi + 1);
      else if (info.momentRes === "miss") gi = Math.max(0, gi - 1);
      return onFinal(makeGrade(GRADE_ORDER[gi]), info);
    },
  });
}

// ---------- 유스 대회 ----------
function startEval(name) {
  ev = { kind: "eval", name, idx: 0, totalPts: 0, scores: [] };
  $("stage-title").textContent = `🏆 ${S.year}년차 ${name}`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">⚽ 전 유망주가 지켜보는 평가전!</div>
    <div class="tour-line">세 번의 경기에 나서요.<br/>좋은 활약이면 명성과 스카우트 주목이 올라요.</div>`;
  $("btn-stage-next").textContent = "첫 경기 출전";
  $("btn-stage-next").onclick = playEvalStage;
  show("screen-stage");
}

function playEvalStage() {
  const m = marketOf();
  const type = ev.idx === 2 ? STAGE_TYPES[3] : STAGE_TYPES[pick([0, 1, 2])];
  const { score } = stageScore(type);
  const grade = gradeOf(score);
  S.condition = clamp(S.condition - 5, 0, 100);
  ev.idx += 1;
  $("stage-round").textContent = `${ev.idx}번째 경기 · ${type.name}`;
  /* ⚔️ 카드 종류는 **그 경기의 성격**이 정해요 — "포지션 자유"(kind: null)면 내 포지션이요. */
  renderStageSim(type, grade, (fg, info) => {
    const pts = Math.round(fg.pts * spotOf(m));
    const pay = { S: 60, A: 40, B: 25, C: 10, D: 0 }[fg.g] || 0;
    S.money = (S.money || 0) + pay;
    S.fandom = Math.max(0, S.fandom + pts);
    S.stages += 1;
    S.youth = S.youth || { g: 0, a: 0, def: 0 };
    S.youth.g += info.myGoals; S.youth.a += info.assists; S.youth.def += info.defense;
    /* ⚔️ 유스에서 받은 순간 카드 수 — 옛 세이브엔 없는 칸이라 **읽는 쪽에서 기본값**을 줘요.
     * 마이그레이션은 안 합니다. 서사·통계용이고 어떤 산식에도 안 들어갑니다. */
    S.youthCards = (S.youthCards || 0) + 1;
    ev.totalPts += pts;
    ev.scores.push(score + (fg.pts - grade.pts) * 0.6);
    save();
    const scoreClass = info.res === "W" ? "win" : info.res === "L" ? "lose" : "";
    const resultHTML = `
      <div class="ms-final ${scoreClass}">${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${RES_LABEL[info.res]}</div>
      <div class="tour-vs">경기 평점 <span class="${fg.g === "S" || fg.g === "A" ? "win" : fg.g === "D" ? "lose" : ""}">${fg.g}</span> · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense}</div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-pts">${pts >= 0 ? `⭐ 명성 +${pts}` : `📉 명성 ${pts}`}${pay ? ` · 💰 수당 +${pay}만` : ""}</div>`;
    return ev.idx < 3
      ? { resultHTML, nextLabel: "다음 경기", nextFn: playEvalStage }
      : { resultHTML, nextLabel: "종합 순위 발표", nextFn: finishEval };
  }, type.kind);
}

function finishEval() {
  const avg = ev.scores.reduce((x, y) => x + y, 0) / ev.scores.length;
  const rank = clamp(Math.round(28 - avg / 2.8 + rand(-2, 2)), 1, 24);
  let bonus = 0;
  if (rank === 1) {
    bonus = 25;
    S.trophies.push(`${S.year}년차 ${ev.name} 1위`);
  } else if (rank <= 3) bonus = 15;
  else if (rank <= 10) bonus = 8;
  S.fandom += bonus;
  $("stage-round").textContent = "종합 순위";
  $("stage-card").innerHTML = `
    <div class="tour-vs">유망주 24명 중 <span class="${rank <= 3 ? "win" : rank >= 18 ? "lose" : ""}">${rank}위</span></div>
    <div class="tour-line">${
      rank === 1 ? "🏆 전체 1위! 스카우트 명단 맨 위에 이름이 올랐어요." :
      rank <= 3 ? "🌟 최상위권! 여러 구단이 지켜보고 있어요." :
      rank <= 10 ? "🙂 중상위권. 꾸준함이 무기예요." :
      rank <= 17 ? "😐 중하위권… 다음 대회까지 더 달려야 해요." :
      "😨 하위권. 감독 면담이 잡혔어요. 분발해야 해요!"
    }</div>
    ${bonus ? `<div class="tour-pts">🏅 순위 보너스 명성 +${bonus}</div>` : ""}
    <div class="tour-pts">이번 대회 명성 합계 +${ev.totalPts + bonus}</div>`;
  $("btn-stage-next").textContent = "훈련장으로 돌아가기";
  $("btn-stage-next").onclick = () => {
    addLog(`🏆 ${ev.name} ${rank}위! (명성 +${ev.totalPts + bonus})`);
    ev = null;
    show("screen-main");
    advanceMonth();
  };
}

// ---------- 프로 도전 ----------
function startSurvival() {
  ev = { kind: "survival", round: 0, eliminated: false };
  $("stage-title").textContent = `⚽ 프로 도전 <드림>`;
  $("stage-round").textContent = "";
  $("stage-card").innerHTML = `
    <div class="tour-vs">🔥 트라이아웃부터 프로 계약까지</div>
    <div class="tour-line">3년의 훈련이 오늘을 위해 있었어요.<br/>단계를 통과하면 프로 계약서에 사인합니다.</div>`;
  $("btn-stage-next").textContent = "트라이아웃 시작";
  $("btn-stage-next").onclick = playSurvivalRound;
  show("screen-stage");
}

function playSurvivalRound() {
  const m = marketOf();
  const roundName = SURVIVAL_ROUNDS[ev.round];
  const type = pick(STAGE_TYPES);
  const { score } = stageScore(type);
  const grade = gradeOf(score);
  S.condition = clamp(S.condition - 5, 0, 100);
  $("stage-round").textContent = `${roundName} · ${type.name}`;
  renderStageSim(type, grade, (fg, info) => {
    const pts = Math.round(fg.pts * spotOf(m)) + ev.round * 4;
    S.money = (S.money || 0) + 30 + ev.round * 20;
    S.fandom = Math.max(0, S.fandom + pts);
    S.stages += 1;
    const momentBonus = fg.pts > grade.pts ? 0.06 : fg.pts < grade.pts ? -0.06 : 0;
    /* ⚠️ **그 경기가 판정에 들어가야 해요.**
     *
     * 예전에는 능력치·유스 국적·명성·컨디션·라운드만 봤어요. 골도 도움도 승패도
     * 경기 평점도 식에 없어서, 0:3으로 지고 평점 D에 무공에도 '통과!'가 떴습니다.
     * 경기와 닿은 건 결정적 순간 미니게임(±0.06)뿐이었어요 —
     * 2.26.0에서 고친 프로 경기 평점과 **같은 계열**입니다(결과가 원인을 안 봄).
     *
     * 셋을 넣어요. 등급은 능력치와 상관이 크니 승패·활약을 함께 넣어야
     * "오늘 어땠나"가 남아요. 기본값을 0.40 → 0.30으로 내려 전체 통과율을 맞춥니다.
     *
     * 실측 (4라운드 전부 통과 · 4만 회):
     *   종합    40   50   60   70   80   90
     *   이전     6%  13%  25%  44%  66%  74%
     *   지금     1%   5%  21%  48%  70%  75%   ← 상위는 그대로, 하위만 엄격
     *   평점 D인데 통과   52% → 18%
     *   0골 패배인데 통과 55% → 27% */
    const gradeP = GRADE_PASS[fg.g] || 0;
    const resultP = info.res === "W" ? 0.06 : info.res === "L" ? -0.06 : 0;
    /* 활약은 상한을 둬요 — 한 경기 대박이 라운드를 통째로 건너뛰게 하면 안 돼요.
     *
     * ⚠️ 계수를 GOAL_SCALE로 나눠요. 이 항은 **골·도움·수비 개수에 비례**하는데,
     * 득점 눈금을 0.33배로 줄이면서 여기를 같이 안 옮겨 활약 가점이 반토막
     * (실측 평균 0.064 → 0.035)이 났어요. AXIS_OFF·POS_AXIS·PROMOTE_HYPE는
     * 같이 옮겼는데 유스는 다른 파일·다른 함수라 재보정 목록에서 새어 나갔습니다.
     * 나눠 두면 다음에 눈금을 또 건드려도 저절로 따라와요. */
    const doneP = Math.min(DONE_PASS_CAP,
      (info.myGoals * 0.04 + info.assists * 0.03 + info.defense * 0.015) / GOAL_SCALE);
    /* 판정에 들어간 조각을 그대로 남겨요 — 화면에 근거를 적으려면 이게 필요해요.
     *
     * 5:3으로 이기고 평점 A에 4골 1도움인데 탈락한 제보가 있었어요. 확률 판정이라
     * 일어날 수 있는 일인데(그 경기는 75%였어요), **왜 떨어졌는지 화면에 아무것도
     * 없어서** 버그로 읽혔습니다. 확률과 그걸 만든 조각을 같이 보여줘요.
     *
     * ⚠️ 계산 결과는 예전과 **한 톨도 안 달라요.** 유스 배경 항을 기준선(0.21 =
     * 평균 debut 0.6 × 0.35)에서 뺀 만큼만 상수로 옮겼어요 — 0.30 + 0.21 = 0.51. */
    const factors = [
      { label: "이 경기", v: gradeP + resultP + doneP + momentBonus, tip: "평점·승패·골·도움" },
      { label: "능력치", v: (overall() - 50) / 90, tip: `종합 ${Math.round(overall())}` },
      { label: "유스 배경", v: m.debut * 0.35 - 0.21, tip: m.name },
      { label: "명성", v: S.fandom / 1500, tip: `${Math.round(S.fandom)}` },
      { label: "컨디션", v: (S.condition - 50) / 900, tip: `${Math.round(S.condition)}` },
      { label: "라운드", v: -ev.round * 0.05, tip: `${ev.round + 1}번째` },
    ];
    const p = clamp(0.51 + factors.reduce((a, f) => a + f.v, 0), 0.12, 0.93);
    const pass = Math.random() < p;
    /* 어느 라운드가 벽인지 보려고 남겨요. 통과율을 크게 바꿨는데(2.33.1)
     * 4라운드 중 어디서 떨어지는지 데이터가 없어서 실측 검증이 안 됐어요. */
    if (window.Stats) {
      Stats.log("youth_round", {
        round: ev.round, name: roundName, pass, grade: fg.g, res: info.res,
        p: Math.round(p * 100), ovr: Math.round(overall()),
      });
    }
    S.youth = S.youth || { g: 0, a: 0, def: 0 };
    S.youth.g += info.myGoals; S.youth.a += info.assists; S.youth.def += info.defense;
    S.youthCards = (S.youthCards || 0) + 1;   // ⚔️ 프로 도전의 순간 카드도 같이 세요
    save();
    const scoreClass = info.res === "W" ? "win" : info.res === "L" ? "lose" : "";
    /* 🗣️ 왜 통과했는지·왜 떨어졌는지를 **감독의 말**로 적어요.
     *
     * 확률 판정이라 잘하고도 떨어질 수 있는데, 화면에 아무 근거가 없으면 그게
     * 버그로 읽혀요 — 실제로 5:3 승리에 평점 A, 4골 1도움으로 탈락한 제보가
     * 왔습니다(그 경기는 75%였어요).
     *
     * 여섯 조각 중 **가장 크게 민 것 / 가장 크게 깎은 것** 하나씩만 말에 담아요.
     * 다 늘어놓으면 대사가 아니라 명세서가 됩니다.
     * 떨어졌을 때는 확률이 높았는지 낮았는지로 말이 갈려요 —
     * 높았는데 떨어졌으면 "운이 없었다", 낮았으면 뭐가 모자랐는지 짚어 줘요. */
    const pp = Math.round(p * 100);
    const sorted = factors.filter((f) => Math.abs(f.v) >= 0.01).sort((a, b) => b.v - a.v);
    const best = sorted[0], worst = sorted[sorted.length - 1];

    /* 감독이 한마디 하는 걸로 적어요.
     *
     * 처음엔 "통과 확률 75% — 이 경기가 +19%p로…"처럼 수치로 적었는데, 그건
     * 판정식을 그대로 읽어 주는 것이지 **감독이 선수를 보는 말**이 아니에요.
     * 확률은 '얼마나 아슬아슬했나'로, 조각은 '무엇이 눈에 들었나/걸렸나'로 옮깁니다.
     *
     * 조각마다 밀어줄 때와 깎을 때의 말이 달라요 — "기본기가 탄탄하더군"과
     * "기본기가 아직 모자라"는 같은 축이지만 하는 말이 반대예요. */
    const PUSH = {
      "이 경기": "오늘 그라운드에서 보여준 게 컸어",
      "능력치": "기본기가 탄탄하더군",
      "유스 배경": "좋은 데서 배웠더군",
      "명성": "자네 이름이 이미 들리더군",
      "컨디션": "몸이 잘 올라와 있었어",
      "라운드": "여기까지 올라온 것부터가 실력이지",
    };
    const CUT = {
      "이 경기": "오늘 경기가 아쉬웠네",
      "능력치": "기본기가 아직 모자라",
      "유스 배경": "어디서 배웠는지가 눈에 덜 띄더군",
      "명성": "자네 이름을 아는 사람이 없어",
      "컨디션": "몸이 덜 올라왔더군",
      "라운드": "위로 올라올수록 보는 눈이 높아지거든",
    };
    // 선수가 지금부터 바꿀 수 있는 축 (유스 배경·라운드는 이제 와서 못 바꿔요)
    const FIXABLE = { "이 경기": 1, "능력치": 1, "명성": 1, "컨디션": 1 };
    const push = best && best.v > 0 ? PUSH[best.label] : null;
    const cut = worst && worst.v < 0 ? CUT[worst.label] : null;

    let line;
    if (pass) {
      if (pp >= 78) line = `자네는 처음부터 눈에 들어왔네.${push ? ` ${push}.` : ""} 다음 단계로 가지.`;
      else if (pp >= 55) line = `고민이 없진 않았네.${push ? ` 그래도 ${push}.` : ""} 한번 더 보고 싶군.`;
      else line = `솔직히 반신반의했네.${push ? ` ${push}.` : ""} 오늘은 자네 운도 따랐어 — 다음엔 실력으로 보여주게.`;
    } else if (pp >= 70) {
      line = `자네가 못해서가 아니야.${push ? ` ${push}.` : ""} 오늘은 자리가 없었을 뿐이네. 운이 없었어.`;
    } else if (pp >= 45) {
      /* "거기만 조금 더 됐어도"는 **선수가 바꿀 수 있는 것**에만 붙여요.
       * 라운드·유스 배경은 이제 와서 어쩔 수 없는 자리라, 거기에 붙이면
       * 감독이 못 할 일을 시키는 말이 됩니다. */
      const fixable = worst && FIXABLE[worst.label];
      line = cut
        ? `종이 한 장 차이였네. ${cut}.${fixable ? " 거기만 조금 더 됐어도." : " 위는 원래 좁아."}`
        : "종이 한 장 차이였네.";
    } else {
      line = `아직이야.${cut ? ` ${cut}.` : ""} 다시 오게.`;
    }
    const why = `🗣️ 감독 — “${line}”`;
    const resultHTML = `
      <div class="ms-final ${scoreClass}">${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${RES_LABEL[info.res]}</div>
      <div class="tour-vs">경기 평점 ${fg.g} · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense} — <span class="${pass ? "win" : "lose"}">${pass ? "통과! 🎉" : "탈락… 💧"}</span></div>
      <div class="tour-line">${fg.txt}</div>
      <div class="tour-line pass-why">${why}</div>
      <div class="tour-pts">${pts >= 0 ? `⭐ 명성 +${pts}` : `📉 명성 ${pts}`}</div>`;
    if (pass && ev.round < SURVIVAL_ROUNDS.length - 1) {
      ev.round += 1;
      return { resultHTML, nextLabel: `${SURVIVAL_ROUNDS[ev.round]} 도전!`, nextFn: playSurvivalRound };
    }
    ev.eliminated = !pass;
    const capturedRound = ev.round;
    return {
      resultHTML,
      nextLabel: pass ? "🌟 최종 결과 보기" : "결과 받아들이기",
      nextFn: () => showEnding(pass, capturedRound),
    };
  });
}

// ---------- 엔딩 ----------
/* 유스 엔딩 문턱 — score = 명성 + 종합 × 2.
 *
 * ⚠️ 예전 값(📹 330 · 📞 420)은 **실제 분포 한가운데에 놓인 절벽**이었어요.
 * 유스를 마친 선수의 실측 score가 320~350이라(명성 210~270 · 종합 50 언저리),
 * 명성이 조금만 모자라면 그대로 🎒 은퇴로 떨어졌습니다 — 🇰🇷 K리그 유스는
 * spot이 1.0으로 가장 낮아 프로 진입이 20%까지 내려갔어요.
 * 문턱을 분포 아래로 내려 "밑바닥에서라도 프로를 시작한다"를 기본값으로 둡니다. */
const SEMI_SCORE = 260;    // 📹 세미프로 입단
const SCOUT_SCORE = 360;   // 📞 타 구단 스카우트
function showEnding(survivedFinal, lastRound) {
  const m = marketOf();
  const score = S.fandom + overall() * 2;

  /* 🌱 유스 재계약은 "연장 계약"이라는 말 그대로 한 시즌을 더 줘요.
   * 커리어당 한 번뿐이라 이미 쓴 뒤에는 버튼 없이 끝맺음으로 읽히게 문구도 바꿔요. */
  /* 📞 타 구단 스카우트는 프로로 이어져요. 조건(lastRound === 2 && score >= 420)을
   * 호출부에서 다시 계산하면 엔딩 분기와 어긋날 수 있으니 여기서 플래그만 세워 넘겨요.
   * 📹 세미프로 입단(semiPro)도 같은 방식이에요 — 사다리 맨 아래에서 프로가 시작돼요. */
  let emoji, title, teamLine, msg, canExtend = false, scoutPro = false, semiPro = false, bigClub = false;
  let callupWeak = false;   // 💜 1군 콜업 대기 — 그 리그 최약체에서 출발해요
  const bottom = bottomLeague();
  // 유스 국적이 정하는 데뷔 리그. 모르는 값이면 한국 1부로 막아요.
  const homeLeague = leagueOf({ league: (m && m.home) || 1 });
  /* 👑는 이름 그대로 유럽에서 시작해요. 유스 최상위 엔딩인데 K리그1에서 출발하면
   * 🌟 프로 계약 성공과 첫 시즌이 똑같아서 "빅클럽"이 말뿐이었어요.
   * 실측(유스 직후 능력치 85 · 이적 없음 · 첫 시즌): 유로파 팀 승률 50% · hype 6.63으로
   * K리그1(78% · 6.17)보다 팀은 덜 이기지만 개인 평가는 오히려 높아요.
   * 평점 -1.6을 감당할 수 있는 능력치라서, 도전이 되되 무너지지는 않아요. */
  /* 👑가 데뷔하는 리그는 못 박아요. 예전에는 "기본 리그 바로 한 칸 위"로 찾았는데,
   * 리그가 5개에서 11개로 늘면서 그 한 칸이 🇯🇵 일본 2부(벌점 0.35)가 됐어요 —
   * 빅클럽 엔딩인데 난이도가 1/5로 떨어집니다. id로 고정합니다(id는 안 바뀌어요).
   * 유스 국적과 무관해요 — 유럽 빅클럽은 어느 나라 유망주든 데려갑니다. */
  const europa = LEAGUES.find((l) => l.id === BIG_CLUB_LEAGUE) || leagueOf({});
  if (survivedFinal && score >= 520) {
    emoji = "👑"; title = "유럽 빅클럽 입단!";
    teamLine = `${m.name} 출신 — ${europa.name} 직행`;
    bigClub = true;
    msg = `역대급 유망주! 세계적인 명문 구단이 러브콜을 보냈어요. `
      + `${europa.name}에서 곧바로 프로가 시작돼요 — 평점 -${europa.penalty.toFixed(1)}을 안고 뛰는 무대예요.`;
  } else if (survivedFinal) {
    emoji = "🌟"; title = "프로 계약 성공!";
    // 데뷔 리그는 유스 국적이 정해요 (MARKETS[].home)
    teamLine = `${homeLeague.flag} ${homeLeague.name} 1군 계약 확정`;
    msg = `프로 데뷔 성공! 3년의 땀이 드디어 결실을 맺었어요. ${homeLeague.name}에서 시작해요`
      + `${homeLeague.penalty > 0 ? ` — 평점 -${homeLeague.penalty.toFixed(2)}을 안고 뛰는 무대예요.` : "."}`;
  } else if (lastRound === 3) {
    emoji = "💜"; title = "1군 콜업 대기";
    /* ⚠️ 예전에는 🌟 프로 계약 성공과 **기계적으로 완전히 같았어요** — 같은 리그의
     * 아무 클럽에서 시작했습니다. 화면만 "2군 계약"이라 적혀 있었죠(제보).
     * 콜업을 기다리는 처지니 그 리그 **최약체**에서 출발해요. 팀 성적이 내 활약에서
     * 갈라진 뒤로는 이 차이가 승률로 실제로 체감됩니다(전력 45 vs 95 → 승률 44%p 차). */
    callupWeak = true;
    teamLine = `${homeLeague.flag} ${homeLeague.name} 최하위권 2군 계약`;
    msg = `아쉽게 1군 계약은 놓쳤지만, 구단이 곧 콜업을 약속했어요. `
      + `${homeLeague.name} 최하위권 팀이라 출발은 불리하지만, 여기서 프로 커리어가 시작돼요.`;
  } else if (lastRound === 2 && score >= SCOUT_SCORE) {
    emoji = "📞"; title = "타 구단 스카우트!";
    teamLine = "K리그 최하위권 클럽 입단";
    scoutPro = true;
    msg = "테스트를 지켜본 다른 구단에서 러브콜이 왔어요. K리그 최하위권 팀이라 출발은 불리하지만, 여기서 프로 커리어가 시작돼요.";
  } else if (lastRound >= 1 && !S.youthExt) {
    /* 🌱 유스 재계약은 **연장이 남아 있을 때만** 써요.
     *
     * 예전에는 연장을 이미 쓴 뒤에도 여기로 빠져서 "구단과의 이야기가 모두
     * 끝났어요"로 커리어가 통째로 끝났습니다. 유스 4년을 보내고 프로 무대를
     * 한 번도 못 밟는 자리였어요 — 실측으로 이 엔딩이 가장 흔했습니다(38%).
     * 연장을 다 쓴 뒤에는 아래 📹 세미프로로 흘러요. 밑바닥이라도 프로예요. */
    emoji = "🌱"; title = "유스 재계약";
    teamLine = "유스팀 연장 계약";
    canExtend = true;
    msg = "이번엔 여기까지. 하지만 구단은 아직 당신을 믿고 있어요 — 한 시즌을 더 뛸 수 있어요.";
  } else if (score >= SEMI_SCORE) {
    emoji = "📹"; title = "세미프로 입단";
    teamLine = `${bottom.name} 입단 — 사다리 맨 아래`;
    semiPro = true;
    msg = `프로 1군 계약에는 닿지 못했지만 ${bottom.name} 구단이 자리를 내줬어요. `
      + "사다리의 가장 아래, 제일 낮은 자리에서 프로 커리어가 시작돼요 — 여기서부터 올라가면 돼요.";
  } else {
    emoji = "🎒"; title = "축구화를 잠시 벗다";
    teamLine = "평범한 일상으로 복귀";
    /* 🔥 여기에도 특훈을 열어요. 프로로 못 간 엔딩 중 **가장 아픈 자리**인데
     * 예전에는 아무 손잡이도 없이 끝났습니다 — 그게 이탈 지점이에요.
     * 특훈을 아직 안 썼으면 한 해를 더 쓸 수 있고, 그래서 세이브도 안 지웁니다. */
    canExtend = !S.youthExt;
    msg = canExtend
      ? "1군 계약에는 닿지 못했어요. 하지만 아직 한 해가 남아 있어요 — 특훈으로 다시 도전할 수 있습니다."
      : "꿈은 이루지 못했지만 3년의 땀은 사라지지 않아요. 공은 둥그니까!";
  }

  const statLines = STAT_DEFS
    .map((d) => `${d.emoji} ${d.name} ${Math.round(S.stats[d.key])}`)
    .join(" · ");
  const trophyLine = S.trophies.length
    ? `🏆 ${S.trophies.join(", ")}`
    : "🏆 대회 1위 경력 없음";

  $("ending-card").innerHTML = `
    <div class="draft-emoji">${emoji}</div>
    <div class="draft-title">${title}</div>
    <div class="draft-team">${teamLine}</div>
    <div>${msg}</div>
    <div class="draft-summary">
      ${m.emoji} ${m.name} · ${POS_INFO[S.pos].name} ${S.name}<br/>
      ${statLines}<br/>
      ⭐ 최종 명성 ${Math.round(S.fandom)} · 출전 ${S.stages}경기<br/>
      ⚽ ${(S.youth || {}).g || 0}골 · 🅰️ ${(S.youth || {}).a || 0}도움 · 🛡️ 수비 ${(S.youth || {}).def || 0}<br/>
      ${trophyLine}
    </div>`;

  $("btn-share").onclick = () => {
    const text = `⚽ 더 윙어 결과\n${m.name} ${S.name} — ${title}\n${teamLine}\n명성 ${Math.round(S.fandom)} / ${trophyLine}`;
    navigator.clipboard?.writeText(text).then(
      () => ($("btn-share").textContent = "✅ 복사 완료!"),
      () => ($("btn-share").textContent = "복사 실패 😢")
    );
  };
  $("btn-restart").onclick = () => {
    clearSave();
    location.reload();
  };

  if (window.Stats) Stats.log("ending", { title, score: Math.round(score) });

  /* keepSave를 넘기면 career.js가 clearSave()를 건너뛰어요.
   * 안 넘기면 "한 시즌 더 뛰기"를 누르기도 전에 세이브가 날아가요.
   * weakestClub은 📞 스카우트 경로 표시예요 — 프로는 프로인데 1부 최약체에서 출발해요.
   * startLeague는 시작 리그예요 — 📹 세미프로는 사다리 맨 아래(K리그3),
   * 👑 유럽 빅클럽 입단은 유로파리그에서 출발해요. 나머지는 기본(K리그1)이에요.
   * 전부 엔딩 분기가 세운 플래그를 그대로 넘겨요. 조건을 여기서 다시 계산하지 않아요. */
  if (window.WingerCareer) {
    window.WingerCareer.onEnding(
      survivedFinal || lastRound === 3 || scoutPro || semiPro,
      bigClub,
      {
        keepSave: canExtend, weakestClub: scoutPro || callupWeak,
        /* 📹 세미프로는 사다리 맨 아래, 👑는 잉글랜드 2부, 그 밖에는 유스 국적의 리그예요.
         * 📞 타 구단 스카우트도 같은 리그의 최약체로 가요. */
        startLeague: semiPro ? bottom.id : bigClub ? europa.id : homeLeague.id,
      }
    );
  } else if (!canExtend) {
    clearSave();
  }
  renderYouthExtButton(canExtend);
  show("screen-ending");
}

/* 🌱 한 시즌 더 뛰기 — 엔딩 화면 맨 앞에 붙여요.
 * 연장을 안 쓰고 "🏛️ 기록 남기고 마무리"로 끝낼 수도 있어야 해서 다른 버튼은 그대로 둬요. */
function renderYouthExtButton(canExtend) {
  document.getElementById("btn-youth-ext")?.remove();
  if (!canExtend) return;
  const actions = document.querySelector("#screen-ending .draft-actions");
  if (!actions) return;
  const btn = document.createElement("button");
  btn.id = "btn-youth-ext";
  btn.className = "btn btn-primary";
  btn.textContent = "🔥 1년 특훈 시작";
  /* 🔥 특훈이 옛 "한 시즌 더 뛰기"를 대신해요. 예전에는 3년차를 통째로 다시
   * 뛰게 했는데, 방금 한 걸 그대로 반복하는 거라 지루하고 무엇을 바꿔야 하는지도
   * 손에 안 잡혔어요. 지금은 여섯 번의 선택(노력/도박)으로 그 1년을 씁니다.
   * camp.js가 없는 옛 캐시라면 예전 연장으로 물러나요 — 버튼이 죽지 않게. */
  btn.onclick = () => (window.WingerCamp ? WingerCamp.start() : extendYouth());
  actions.prepend(btn);
}

/* 능력치·명성·유스 기록은 그대로 두고 3년차 1월로만 되돌려요.
 * S.youthExt를 세워서 커리어당 한 번만 쓸 수 있게 막아요. */
/* 옛 연장 경로 — camp.js를 못 읽은 경우의 대비책으로만 남겨 둬요. */
function extendYouth() {
  if (S.youthExt) return;
  S.youthExt = true;
  S.year = 3;
  S.month = 1;
  S.pendingStage = null;
  ev = null;
  addLog("🌱 유스팀과 연장 계약! 3년차를 한 번 더 뛰어요.");
  save();
  renderMain();
  show("screen-main");
}

// ---------- ❓ 도움말 ----------
const HELP_SECTIONS = [
  { emoji: "🏋️", title: "훈련과 컨디션", body:
    "매달 훈련이나 휴식을 골라요. 훈련은 능력치를 올리고 컨디션을 깎아요.\n" +
    "컨디션이 낮은 채로 계속 훈련하면 탈이 나요. 무리하지 말고 쉬어 가세요." },
  { emoji: "⭐", title: "재능과 각성", body:
    "능력치 옆의 별은 두 가지에 영향을 줘요.\n" +
    "① 훈련 효율 — 별이 많을수록 같은 훈련으로 더 많이 올라요.\n" +
    "② 승부처 보정 — 능력치가 같아도 별이 높으면 결정적인 순간에 조금 더 잘해요\n" +
    "   (최저 ×0.94 ~ 최고 ×1.12). 능력치에 이미 반영된 걸 또 곱하지 않게 폭을 좁게 뒀어요.\n" +
    "능력치 100을 넘으면 '한계 돌파' 구간이라 훈련 효율이 절반이 되고, 그때부터 🔮각성으로\n" +
    "재능을 올릴 수 있어요. 상한(130)까지 채우면 훈련 대신 각성만 남아요.\n" +
    "재능이 최대가 되면 🌠초월로 상한 자체를 6씩 올려요 — 성공할수록 어려워지지만\n" +
    "명예의 전당 점수가 크게 붙어요." },
  { emoji: "⚽", title: "경기와 프로 계약", body:
    "유스 3년 동안 경기에 나서며 실력과 주목도를 쌓아요.\n" +
    "3년이 끝나면 그동안의 성과로 프로 계약이 갈려요.\n" +
    "계약하면 리그 커리어를 이어가고, 아니면 유스에서 커리어가 끝나요.\n" +
    "🌱유스 재계약으로 끝났다면 딱 한 번, 능력치를 그대로 안고 3년차를 다시 뛸 수 있어요." },
  { emoji: "🎖️", title: "시즌 칭호", body:
    "지난 시즌에 해낸 일로 받아서, 이번 시즌 경기에만 붙는 효과예요.\n" +
    "시즌이 끝나면 다시 정해져요 — 유지하려면 그 성적을 또 내야 해요.\n" +
    "\n" +
    "🥇골든부츠 위너(득점 1위) 골 +15%\n" +
    "🎯리그 최고 도우미(도움 1위) 도움 +15%\n" +
    "🛡️리그 최고 수비수(수비 1위) 수비 +15%\n" +
    "📈공격포인트왕(공격P 1위) 골·도움 +6%\n" +
    "👑리그의 지배자(리그MVP) 경기 평점 +0.35\n" +
    "🏅발롱도르 위너(발롱도르) 모든 기여 +8% · 평점 +0.25\n" +
    "🥈베스트11(베스트11 선정) 모든 기여 +5%\n" +
    "🔥물오른 폼(시즌 평균 평점 7.5 이상) 승부처 성공 +8%p\n" +
    "🏆챔피언(리그 우승·승격) 평점 +0.2 · 승부처 +4%p\n" +
    "🕯️설욕의 각오(강등) 골·도움 +12%\n" +
    "🌟신인왕(신인왕) 훈련 상승폭 +15%\n" +
    "\n" +
    "여러 개를 동시에 달 수 있어요. 다만 종류별 합계에 상한이 있어요\n" +
    "(골·도움·수비 각 +40% · 평점 +0.6 · 승부처 +12%p · 훈련 +30%).\n" +
    "시즌 결산에서 다음 시즌 칭호를 알려주고, 준비/시즌 화면 위에 늘 떠 있어요." },
  { emoji: "🏷️", title: "선수 클래스", body:
    "시즌 칭호와 달리 이건 **받는 게 아니라 지금 실력에서 자동으로 나오는 이름**이에요.\n" +
    "경기에는 관여하지 않아요. 11단계가 있어요.\n" +
    "🪑벤치 자원 → 🔄로테이션 자원 → 🧢리그 주전 → 💪리그 정상급 →\n" +
    "🎖️국가대표 후보 → 🏅국가대표 주전 → 🌟월드클래스 → ⭐슈퍼스타 →\n" +
    "👑세계 최고 → 🐐살아있는 전설 → 🏆축구의 신\n" +
    "\n" +
    "획득 — 따로 조건을 채우는 게 아니라 종합(능력치 평균)이 문턱을 넘으면 바로 올라가요.\n" +
    "훈련·장비·🔮각성 무엇으로 올려도 됩니다. 반대로 노쇠하면 내려가요.\n" +
    "👑세계 최고(130)가 능력치 상한이고, 그 위 둘은 🌠초월로 상한을 올려야 닿아요.\n" +
    "\n" +
    "효과 — 경기 수당이 한 단계마다 +25%씩 붙어요 (🪑 ×1.00 … 🏆 ×3.50).\n" +
    "클래스에 능력치 배수를 걸지 않은 건, 골·평점·수상·명성이 이미 전부 종합으로\n" +
    "굴러가서 거기에 또 곱하면 같은 걸 두 번 세기 때문이에요. 경기에 직접 붙는 효과는\n" +
    "🎖️시즌 칭호가 맡아요 — 그건 성적으로 받아 오는 거라 축이 겹치지 않아요.\n" +
    "올라선 순간 명성도 한 번 크게 붙어요.\n" +
    "\n" +
    "🥇개인 순위표에는 다른 팀 선수들의 칭호도 함께 나와요. 리그가 높을수록 위 칭호가\n" +
    "많이 보여요 — 프리미어리그의 중간 선수가 🌟월드클래스쯤 됩니다.\n" +
    "은퇴하면 커리어에서 가장 높이 올랐던 칭호가 기록으로 남아요." },
  { emoji: "🎓", title: "은퇴와 커리어 등급", body:
    "커리어를 마치면 🏛️명예의 전당에 기록이 남아요.\n" +
    "결산 화면에서 언제든 은퇴할 수 있고, 확인창에서 남을 기록과 등급을 미리 보여줘요.\n" +
    "\n" +
    "커리어 점수로 12단계 등급이 매겨져요 (아래로 갈수록 위):\n" +
    "🌱짧지만 빛났던 커리어 → 🔄스쿼드의 한 자리 → 🧢꾸준했던 주전 → 🎽팀의 기둥 →\n" +
    "💪리그를 대표한 선수 → 🏅리그의 상징 → 🌟한 시대를 풍미한 선수 →\n" +
    "⭐모두가 아는 이름 → 👑세계가 인정한 선수 → 🏆시대를 지배한 선수 →\n" +
    "🐐축구 역사에 남을 레전드 → 🌍축구사를 다시 쓴 선수\n" +
    "\n" +
    "점수는 업적이 중심이에요. 🏅발롱도르 · 🏆리그MVP · 🎖️베스트11 · 우승은\n" +
    "리그 격을 곱해서 세요 — 프리미어리그에서 받은 상이 더 값이 나가요.\n" +
    "**가장 높이 올라갔던 리그** 자체에도 점수가 붙어요. 명성과 MOM도 세지만\n" +
    "비중이 작아요 — 약한 리그에서 쓸어 담는 값이라 그것만으로 위에 갈 수는 없어요.\n" +
    "\n" +
    "은퇴 확인창에 지금 점수와 **다음 등급까지 남은 점수**가 같이 떠요.\n" +
    "한 시즌 더 뛰면 올라갈지 여기서 판단할 수 있어요." },
  { emoji: "💰", title: "돈 벌기와 쓰기", body:
    "활동 수당과 정산으로 돈이 들어와요.\n" +
    "🛍️상점에서 장비를 사면 능력치가 바로 올라요. 등급은 순서대로만 살 수 있어요.\n" +
    "30분마다 🎁특훈으로 무료 훈련을 한 번 받을 수 있어요." },
  { emoji: "💾", title: "기록 보관", body:
    "기록은 이 기기의 브라우저에 저장되고, 서버에도 자동 백업돼요.\n" +
    "기기를 바꾸거나 브라우저 데이터를 지우면 이 기기의 기록은 사라져요.\n" +
    "타이틀 화면의 🔗 기록 연동에서 코드를 복사해 두면 새 기기에서 그대로 이어받을 수 있어요." },
];

function openHelp() {
  if (window.Help) window.Help.open("⚽ 더 윙어 II 도움말", HELP_SECTIONS);
}
$("btn-help-main")?.addEventListener("click", openHelp);
$("btn-help-pro")?.addEventListener("click", openHelp);

// ---------- 시작 ----------
initTitle();
if (window.Stats) Stats.init("winger2");

/* ☁️ 클라우드 세이브 연결 — 타이틀 진입 시 서버와 맞춰요 */
if (window.Cloud) {
  Cloud.init("winger2");
  $("btn-cloud")?.addEventListener("click", () => Cloud.openModal());
}
