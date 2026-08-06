/* 프로 선수 활동 · 명예의 전당 · 배틀 아레나 — 더 윙어 확장
 * game.js의 전역(S, $, rand, randInt, pick, clamp, shuffle, show, save, clearSave,
 * STAT_DEFS, POS_INFO, overall)을 사용하므로 game.js 뒤에 로드해야 해요. */
"use strict";

window.WingerCareer = (() => {
  const HOF_KEY = "grow-hof-v1";
  const BATTLE_KEY = "grow-battle-soccer-v1";

  /* 경기 평점 — 예전에는 myScore를 10으로 나눠서 능력치 60이면 이미 10.0 만점이었어요.
   * 그 위로는 아무리 키워도 평점도 MOM도 성적도 같아서, 이 게임의 천장이 여기였습니다.
   * 나누는 값을 키우고 팬덤 기여에 상한을 걸어 5.0~10.0으로 펼쳤어요.
   * matchContribution의 perf도 전원 최대치(1.6)로 죽어 있었는데 같이 살아납니다. */
  const FAN_CAP = 12;
  const RATING_DIV = 14;

  /* 경기 평점(1~10). clutch()는 전역 S의 재능·초월을 읽어요.
   * 리그 페널티는 clamp **안쪽**에서 빼요 — 밖에서 빼면 하한 1이 안 지켜져요. */
  function ratingOf(stats, pos, condition, fandom) {
    const myScore =
      (stats[POS_INFO[pos].stat] * 0.32 +
      stats.stamina * 0.22 +
      ((stats.shoot + stats.pass + stats.dribble) / 3) * 0.2) * clutch(POS_INFO[pos].stat) +
      condition / 8 + Math.min((fandom || 0) / 45, FAN_CAP) + rand(-5, 5) + 20;
    const rating = clamp(myScore / RATING_DIV - leagueOf(S).penalty, 1, 10);
    return rating;
  }

  /* 포지션별 축 — 골·도움·수비 성공을 포지션에 맞게 묶어요.
   * 수비수의 골 가중치가 높은 건 세트피스 득점이 실제로 희소하고 가치가 크기 때문이에요.
   * n은 정규화 계수예요. 수비수는 시즌 수비 성공이 68회인데 공격수는 골이 31개라,
   * 그대로 더하면 포지션이 곧 유불리가 됩니다. 시뮬레이션으로 잡은 값이에요. */
  const POS_AXIS = {
    fw: { g: 1.0, a: 0.5, d: 0.15, n: 1.00 },
    wg: { g: 0.8, a: 0.8, d: 0.15, n: 1.05 },
    mf: { g: 0.5, a: 1.0, d: 0.30, n: 0.96 },
    df: { g: 2.0, a: 1.0, d: 0.55, n: 0.72 },
  };
  const AXIS_K = 3.00;
  /* 경기 수를 12 → 38로 올리면서 시즌 축이 3.23배가 됐어요. log가 AXIS_K(3.00)로
   * 곱해지므로 hype가 3.52 올라갑니다 — 그만큼 offset을 올려 수상 문턱
   * (MVP 5.5 · 베스트11 4.5 · 신인왕 3)의 의미를 그대로 지켜요. */
  const AXIS_OFF = 7.71;

  // 시즌 축 점수. 옛 세이브에는 집계 필드가 없을 수 있어서 전부 || 0으로 받아요.
  function posAxis(act, pos) {
    const x = POS_AXIS[pos] || POS_AXIS.fw;
    const a = act || {};
    return ((a.goals || 0) * x.g + (a.assists || 0) * x.a + (a.defense || 0) * x.d) * x.n;
  }

  // 내장 봇 상대 (전부 가상의 선수)
  const GHOSTS = [
    { id: "wg1", name: "레전드 스트라이커 골머신", bp: 690 },
    { id: "wg2", name: "월드클래스 PM 매직풋", bp: 640 },
    { id: "wg3", name: "철벽 수비수 더월", bp: 560 },
    { id: "wg4", name: "득점왕 해트트릭", bp: 470 },
    { id: "wg5", name: "라이벌 윙어 스피드킹", bp: 400 },
    { id: "wg6", name: "베테랑 캡틴 리더", bp: 330 },
    { id: "wg7", name: "괴물 신인 라이징", bp: 260 },
    { id: "wg8", name: "무명 유망주 벤치", bp: 180 },
  ];

  const loadHof = () => JSON.parse(localStorage.getItem(HOF_KEY) || "[]");
  const saveHof = (list) => localStorage.setItem(HOF_KEY, JSON.stringify(list));
  const loadBattle = () => JSON.parse(localStorage.getItem(BATTLE_KEY) || "{}");
  // 대전 기록도 백업 대상(keysOf)이에요. touch()로 표시해두지 않으면 다음 pull에
  // 조용히 덮여 사라져요.
  const saveBattle = (d) => {
    localStorage.setItem(BATTLE_KEY, JSON.stringify(d));
    if (window.Cloud) Cloud.touch();
  };
  const bpOf = (score, ovr) => Math.round(score * 0.4 + ovr * 3);

  // ---------- 엔딩 훅 ----------
  /* opts.keepSave — 🌱 유스 재계약처럼 엔딩 뒤에도 이어갈 길이 남은 경우예요.
   * 여기서 clearSave()를 부르면 '한 시즌 더 뛰기'를 누르기도 전에 기록이 사라져요.
   * 그래도 '기록 남기고 마무리'는 그대로 둬요 — 연장을 안 쓰고 끝낼 수 있어야 해요.
   * (enshrine()이 자기 안에서 clearSave()를 부르니 마무리 경로는 그대로 정리돼요.) */
  function onEnding(canGoPro, captain, opts) {
    const keepSave = !!(opts && opts.keepSave);
    /* opts.weakestClub — 📞 타 구단 스카우트로 올라온 경우예요.
     * 데뷔 클럽을 뽑지 않고 그 리그 최약체 하나로 고정해요. */
    const weakest = !!(opts && opts.weakestClub);
    /* opts.startLeague — 📹 세미프로 입단으로 올라온 경우예요. 사다리 맨 아래에서 시작해요.
     * 어느 엔딩인지는 game.js의 엔딩 분기가 정해서 넘겨줘요. 여기서 다시 판정하지 않아요. */
    const startLeague = opts && opts.startLeague != null ? opts.startLeague : null;
    const actions = document.querySelector("#screen-ending .draft-actions");
    document.getElementById("btn-go-debut")?.remove();
    document.getElementById("btn-idol-retire")?.remove();
    const btn = document.createElement("button");
    if (canGoPro) {
      save();
      btn.id = "btn-go-debut";
      btn.className = "btn btn-primary";
      btn.textContent = "⚽ 프로 커리어 시작!";
      btn.onclick = () => enterCareer(captain, weakest, startLeague);
    } else {
      btn.id = "btn-idol-retire";
      btn.className = "btn btn-ghost";
      btn.textContent = "🏛️ 기록 남기고 마무리";
      btn.onclick = () => enshrine();
      if (keepSave) save();
      else clearSave();
    }
    actions.prepend(btn);
  }

  // ---------- 프로 활동 ----------
  /* 데뷔 클럽은 그 리그의 하위 DEBUT_POOL개에서만 뽑아요.
   * 6개 전부에서 뽑던 시절에는 전력 52~78로 갈려서 첫 시즌 팀 성적이 운이었고,
   * 신인이 우승 후보 클럽에서 시작하는 것도 어색했어요. 올라가는 건 이적으로 해요. */
  const DEBUT_POOL = 3;
  function debutClubs(id) {
    const list = (CLUBS[id] || CLUBS[1]).slice().sort((a, b) => a.str - b.str);
    return list.slice(0, DEBUT_POOL);
  }

  /* 📞 타 구단 스카우트 경로만 쓰는 데뷔 클럽이에요.
   * debutClubs는 전력 오름차순이라 맨 앞이 그 리그 최약체예요. 뽑지 않고 하나로 고정해요 —
   * 프로 무대에 서긴 했지만 출발이 제일 나쁜 자리라는 걸 클럽으로 말해줍니다. */
  function weakestClub(id) {
    return debutClubs(id)[0];
  }

  function enterCareer(captain, weakest, startLeague) {
    S.phase = "soccer-pro";
    /* 데뷔 클럽은 소속 리그(기본 1부)에서 뽑아요. 이름과 전력을 함께 받아 둡니다 —
     * 전력은 동료 득점·실점에만 쓰이고 개인 수상에는 안 닿아요.
     *
     * startLeague를 받으면 거기서 출발해요 — 📹 세미프로 입단이 K리그3을 넘겨줘요.
     * 값은 leagueOf에 태워서 걸러요. 모르는 id가 들어와도 K리그1로 막혀요. */
    S.league = leagueOf(startLeague != null ? { league: startLeague } : S).id;
    const debutClub = weakest ? weakestClub(S.league) : pick(debutClubs(S.league));
    S.group = debutClub.name;
    S.clubStr = debutClub.str;
    S.center = !!captain;
    S.proYear = 0;
    // 데뷔 시즌부터 정착 기간을 세요 (갓 입단해서 첫 시즌에 승격하는 건 이상해요).
    // ⚠️ S.proYear를 0으로 세운 **뒤에** 잡아야 해요 — 앞에 두면 undefined가 들어갑니다.
    S.leagueSince = 0;
    /* daesangW · bonsangW는 리그격을 곱해 쌓는 가중 수상 카운터예요.
     * 옛 카운터(daesang · bonsang)는 화면에 "MVP 3회"처럼 횟수로 보여주는 데 그대로 써요. */
    S.career = { years: [], wins: 0, daesang: 0, bonsang: 0, daesangW: 0, bonsangW: 0, rookie: 0, sales: 0, goals: 0, assists: 0, defense: 0, apps: 0, teamW: 0, teamD: 0, teamL: 0 };
    S.proLog = [];
    if (window.Stats) Stats.log("debut", { group: S.group, center: !!captain });
    startPrep();
  }

  function proLog(msg) {
    S.proLog.unshift(`[${S.proYear}시즌] ${msg}`);
    S.proLog = S.proLog.slice(0, 30);
  }

  function startPrep() {
    S.proYear += 1;
    S.camp = 3;
    S.condition = 80;
    S.activity = null;
    S.pendingShow = false;
    proLog(`⚽ ${S.proYear}시즌 시작! 전반기 리그를 준비해요.`);
    save();
    renderPrep();
    show("screen-pro");
  }

  // ---------- 시즌 활동 (전/후반기 × 리그 6라운드) ----------
  const CB_PER_YEAR = 2;
  /* 한 시즌 38경기 — 실제 K리그1과 같아요. 예전에는 12경기(전반 6 + 후반 6)라
   * 실제의 3분의 1도 안 됐고, 한 경기 운이 시즌을 통째로 흔들었어요.
   * ⚠️ 리그마다 다르게 하지 않고 상수로 둡니다 — tests/soccer의 여러 테스트가
   * 이 상수를 소스에서 읽어 시즌을 굴려요. 함수로 바꾸면 테스트는 12경기로
   * 굴리는데 게임은 38경기로 돌아 기대값이 통째로 어긋납니다. */
  const WEEKS_PER_CB = 19;
  const CB_LABELS = ["전반기", "후반기"];
  const cbLabel = (n) => CB_LABELS[n - 1] || `${n}차`;
  const RIVAL_GROUPS = ["에이스 스트라이커", "월드클래스 MF", "철벽 수비수", "득점왕 후보", "라이벌 윙어", "베테랑 캡틴", "괴물 신인", "국대 주전"];

  function rollRivals() {
    /* 이름은 실제 선수 이름처럼 짓고, 역할은 소속 옆 딱지로 남겨요.
     * 예전에는 "에이스 스트라이커" 같은 역할 딱지가 이름 자리에 있어서
     * 순위표가 선수 명단이 아니라 설명문처럼 보였어요. */
    const clubs = shuffle(oppClubs(S));
    return RIVAL_GROUPS.map((role, i) => ({
      name: randomPlayerName((Math.random() < 0.5 ? null : MARKETS.find((m) => m.id === "eu"))),
      role, pop: rand(52, 88), club: clubs[i % clubs.length],
    }));
  }

  /* 🏆 리그 순위표 — 예전에는 내 팀 성적(teamW/D/L)만 쌓고 다른 팀 기록이 없어서
   * 순위표를 만들 수가 없었어요. 리그의 6팀을 시즌 내내 함께 굴립니다.
   * ⚠️ S.league은 이미 '리그 ID'라 이름이 겹쳐요. 표는 S.table에 둡니다. */
  function initTable() {
    const list = CLUBS[leagueOf(S).id] || CLUBS[1];
    const rows = list.map((c) => ({ name: c.name, str: c.str, w: 0, d: 0, l: 0 }));
    // 승격·이적으로 내 클럽이 목록에 없을 수도 있어요. 없으면 넣어줍니다.
    if (S.group && !rows.some((r) => r.name === S.group)) {
      rows.push({ name: S.group, str: 55, w: 0, d: 0, l: 0 });
    }
    S.table = { y: S.proYear, league: leagueOf(S).id, rows };
  }
  // 프로 단계인가. 값은 "soccer-pro"예요 — 한 곳에서만 적어 두고 여기를 씁니다.
  const isPro = () => S.phase === "soccer-pro";
  const tableReady = () => S.table && S.table.y === S.proYear && S.table.league === leagueOf(S).id;

  /* 한 라운드 결과를 표에 반영해요. 내 경기 결과를 먼저 넣고, 남은 팀들을 짝지어
   * 굴립니다 — 짝을 지어야 승과 패의 총합이 맞아 표가 말이 돼요.
   *
   * 그 라운드에 각 팀이 뭘 했는지를 { 팀이름: "W"|"D"|"L" }로 돌려줘요.
   * 평점 순위표가 이걸 봐서 라이벌 점수에 반영합니다 — 예전에는 순위표와
   * 평점표가 서로를 안 봐서, 라이벌 클럽이 지든 이기든 그 선수 평점이 똑같았어요.
   * 팀이 홀수라 짝이 안 맞으면 한 팀은 그 라운드를 쉬어요(키가 안 담겨요). */
  function recordRound(myOpp, res) {
    if (!tableReady()) initTable();
    const rows = S.table.rows;
    const find = (n) => rows.find((r) => r.name === n);
    const me = find(S.group), op = find(myOpp);
    const out = {};
    if (me && op) {
      if (res === "W") { me.w += 1; op.l += 1; out[S.group] = "W"; out[myOpp] = "L"; }
      else if (res === "L") { me.l += 1; op.w += 1; out[S.group] = "L"; out[myOpp] = "W"; }
      else { me.d += 1; op.d += 1; out[S.group] = "D"; out[myOpp] = "D"; }
    }
    const rest = shuffle(rows.filter((r) => r !== me && r !== op));
    for (let i = 0; i + 1 < rest.length; i += 2) {
      const a = rest[i], b = rest[i + 1];
      if (Math.random() < 0.22) {                                   // 무승부 비율
        a.d += 1; b.d += 1; out[a.name] = "D"; out[b.name] = "D"; continue;
      }
      const pA = clamp(0.5 + (a.str - b.str) / 60, 0.15, 0.85);
      if (Math.random() < pA) { a.w += 1; b.l += 1; out[a.name] = "W"; out[b.name] = "L"; }
      else { b.w += 1; a.l += 1; out[b.name] = "W"; out[a.name] = "L"; }
    }
    return out;
  }

  /* 라이벌 점수에 얹는 그 라운드 클럽 성적.
   *
   * 내 결과 보정(±3)보다 폭이 큰 이유가 있어요. 내 점수에는 골·도움·수비를 재는
   * doneBonus가 이미 들어 있는데, 라이벌에 대해 아는 건 **소속 클럽의 결과뿐**이에요.
   * 그 하나가 그들의 '그날 활약' 전부를 대신하니 무게가 더 실려야 맞아요.
   * 명성(pop 52~88)의 인접 간격이 5 안팎이라, 이 폭이면 순위가 실제로 뒤집혀요.
   *
   * ⚠️ 이걸 **더하기만 하면 안 돼요.** 라이벌 8명 중 최고점의 분포가 넓어져서
   * MOM이 조용히 어려워집니다 — 실측하니 능력치 90에서 77.6% → 63.3%로 떨어졌어요.
   * 그래서 순수 흔들림을 ±8 → ±6으로 **줄여서 그 자리를 결과가 대신하게** 했어요.
   * 흔드는 양은 비슷한데, 흔드는 이유가 랜덤에서 경기 결과로 바뀐 거예요.
   *
   *   기준 (±8, 보정 없음)  MOM 13.4% / 40.9% / 77.6%   (능력치 80 / 85 / 90)
   *   지금 (±6, 보정 1.5~6) MOM 11.1% / 37.0% / 74.5%
   *   명성 5 차이는 결과로 67.6% 뒤집혀요 (예전엔 결과를 아예 안 봤어요)
   *
   * MOM은 수상 판정에 안 쓰여요(수상은 hype 기준). 팬 증가(wins × 3)와
   * 명예의 전당 점수(wins × 6)에만 들어가서, 이 정도 차이는 영향이 작아요. */
  const rivalResAdj = (r) => (r === "W" ? rand(4, 14) : r === "L" ? -rand(4, 14) : r === "D" ? rand(-3, 3) : 0);
  /* 명성을 그대로 점수로 쓰지 않고 평균(70) 쪽으로 당겨요.
   * 라이벌 점수는 명성(52~88)이고 내 점수는 능력치×10 + 그 경기 활약이었어요.
   * 같은 표에 **다른 자로 잰 숫자**를 나란히 놓은 셈이라, 능력치 평점 6.0인
   * 선수는 라이벌 평균(7.06)보다 1.2점 아래에서 시작했습니다. 2골 2도움을 해도
   * 7위가 나온 게 그래서예요.
   * 0.75로 당기면 명성 폭이 36 → 27이 되고, 그 자리를 결과(폭 18)가 채웁니다. */
  const RIVAL_POP_PULL = 0.75;
  const RES_KO = { W: "승", D: "무", L: "패" };

  const tableRows = () => (S.table ? S.table.rows : [])
    .map((r) => ({ ...r, pts: r.w * 3 + r.d, gp: r.w + r.d + r.l }))
    .sort((a, b) => b.pts - a.pts || (b.w - b.l) - (a.w - a.l) || a.name.localeCompare(b.name));

  function tableHTML() {
    const rows = tableRows();
    return `<table class="rank-table"><thead><tr><th>#</th><th>팀</th><th>경기</th><th>승무패</th><th>승점</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.name === S.group ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td><td>${r.gp}</td><td>${r.w}-${r.d}-${r.l}</td><td>${r.pts}</td></tr>`).join("")}</tbody></table>`;
  }
  const myTableRank = () => {
    const rows = tableRows();
    const i = rows.findIndex((r) => r.name === S.group);
    return i < 0 ? rows.length : i + 1;
  };

  /* 진행 중이던 세이브의 라이벌에는 이름·소속이 없어요 — 예전에는 역할 딱지가
   * 이름 자리에 있었고 클럽은 아예 없었습니다. 라이벌은 반기마다 다시 뽑히므로
   * 시즌 도중에는 갱신되지 않아 "소속이 비어 있음"으로 보였어요.
   * 그릴 때 비어 있는 것만 채워 넣습니다(이미 있는 값은 안 건드려요). */
  function fillRivals(act) {
    if (!act || !Array.isArray(act.rivals) || !act.rivals.length) return;
    let changed = false;
    const clubs = shuffle(oppClubs(S));
    act.rivals.forEach((r, i) => {
      if (!r.role && RIVAL_GROUPS.includes(r.name)) { r.role = r.name; r.name = null; changed = true; }
      if (!r.name) { r.name = randomPlayerName((Math.random() < 0.5 ? null : MARKETS.find((m) => m.id === "eu"))); changed = true; }
      if (!r.role) { r.role = RIVAL_GROUPS[i % RIVAL_GROUPS.length]; changed = true; }
      if (!r.club) { r.club = clubs[i % clubs.length]; changed = true; }
    });
    if (changed) save();
  }

  /* 🔺🔻 팀 승강제 — 리그 순위표 1위면 위로, 꼴찌면 아래로 내 팀이 통째로 움직여요.
   *
   * 개인 이적 사다리(PROMOTE_HYPE)와는 **다른 축**이에요.
   * 그건 "내가 좋은 제안을 받아 클럽을 옮기는 것", 이건 "내 클럽이 리그를 오르내리는 것".
   * 둘이 섞이면 사다리가 두 번 작동해서 한 시즌에 두 단계를 뛰어넘어요.
   *
   * 사다리가 **둘**이에요. 국내(K리그3 → K리그2 → K리그1)와 유럽(유로파 → 챔스).
   * 유럽 무대는 실제로는 리그가 아니라 컵 대회지만, 이 게임은 이미 '소속 리그'로
   * 모델링해 놨어요 — 클럽 목록도 순위표도 국내 리그와 똑같이 굴러갑니다.
   * 그래서 승강제만 없으면 유럽에 간 순간 팀 성적이 아무 데도 안 닿았어요.
   *
   * **사다리는 나라마다 하나씩이고 서로 안 이어져요.** 잉글랜드 최하위가 이탈리아로
   * 가지 않아요 — 실제로도 강등은 그 나라 리그 안에서만 일어납니다.
   * 나라를 옮기는 건 오직 이적 사다리(PROMOTE_HYPE)뿐이에요.
   *
   * 각 나라의 맨 위에서 1위면 올라갈 데가 없으니 **리그 우승**이고,
   * 맨 아래에서 꼴찌면 내려갈 데가 없어 아무 일도 안 일어나요.
   *
   * ⚠️ id는 옛 세이브가 가리키는 값이라 순서와 무관해요. 여기 배열의 **순서**가
   * 그 나라 안의 오름차순이에요(아래 → 위). 전역 난이도는 LEAGUES의 tier가 따로 봅니다. */
  const COUNTRY_TIERS = {
    kr: [5, 4, 1],    // 🇰🇷 한국 3부 → 2부 → 1부
    jp: [6, 7],       // 🇯🇵 일본 2부 → 1부
    br: [8, 9],       // 🇧🇷 브라질 2부 → 1부
    it: [10, 11],     // 🇮🇹 이탈리아 2부 → 1부
    en: [2, 3],       // 🇬🇧 챔피언십 → 프리미어리그 (옛 유로파·챔피언스리그 자리)
  };
  const ladderOf = (id) => {
    for (const k of Object.keys(COUNTRY_TIERS)) if (COUNTRY_TIERS[k].includes(id)) return COUNTRY_TIERS[k];
    return null;
  };
  /* 승격 문턱. 순위만 보면 사다리가 죽어요 — 실측하니 내 승률 60%에서 시즌의 91.5%가
   * 1위였습니다. 팀 성적이 사실상 내 성적이라(내 골이 곧 팀 득점) 잘하는 선수는
   * 매 시즌 1위를 해요. 승점 차를 걸어도 75% 승률에서 98.8%라 소용이 없었어요.
   *
   * 그래서 **내 실력과 무관한 축**을 겁니다 — 승격한 리그에는 최소 두 시즌 머물러요.
   * 실제로도 갓 승격한 팀이 곧바로 또 올라가는 일은 드물어요.
   * K리그3에서 K리그1까지 최소 6시즌이 걸려, 개인 이적 사다리(PROMOTE_HYPE)가
   * 여전히 '빠른 길'로 남습니다. 강등에는 안 걸어요 — 위험은 바로 와야 무섭습니다. */
  const PROMO_GAP = 8;                       // 2위와 벌려야 하는 승점 차
  const PROMO_SETTLE = 2;                    // 승격 뒤 머물러야 하는 시즌 수

  function applyPromotion() {
    if (!tableReady()) return null;
    const rows = tableRows();
    if (rows.length < 3) return null;
    const rank = myTableRank();
    const ladder = ladderOf(leagueOf(S).id);
    if (!ladder) return null;                // 사다리에 없는 리그는 그대로 둬요
    const at = ladder.indexOf(leagueOf(S).id);

    /* 정착 기간은 승격·강등 **둘 다**에 걸어요. 승격에만 걸면 데뷔 시즌에 강등당하는데,
     * 갓 입단한 선수의 첫 시즌이 그렇게 끝나는 건 이상하고, 지난 시즌 기록의 리그가
     * 곧바로 어긋나 화면도 헷갈립니다. */
    const settled = S.leagueSince == null || (S.proYear - S.leagueSince) >= PROMO_SETTLE;
    if (!settled) return null;

    /* 사다리 맨 위(K리그1 · 챔피언스리그)에서 1위면 올라갈 데가 없어요.
     * 승격 대신 **리그 우승**이에요. 아무 일도 안 일어나면 1위를 해도 화면에 남는 게 없습니다. */
    if (rank === 1 && at === ladder.length - 1) {
      S.trophies = S.trophies || [];
      const title = `${S.proYear}시즌 ${leagueOf(S).name} 우승`;
      if (!S.trophies.includes(title)) S.trophies.push(title);
      return { kind: "title", from: leagueOf(S).name, to: leagueOf(S).name, rank };
    }

    let to = null, kind = null;
    if (rank === 1 && at < ladder.length - 1) {
      const me = rows[0], second = rows[1];
      if (me.pts - (second ? second.pts : 0) >= PROMO_GAP) { to = ladder[at + 1]; kind = "up"; }
    } else if (rank === rows.length && at > 0) {
      // 사다리 안에서만 내려가요. 맨 아래(K리그3 · 유로파)는 갈 데가 없어요.
      to = ladder[at - 1]; kind = "down";
    }
    if (to == null) return null;

    const from = leagueOf(S).name;
    S.league = to;
    /* 클럽 전력도 함께 움직여요. 승격하면 상위 리그에서는 하위권, 강등되면
     * 하위 리그에서는 상위권이 되는 게 자연스러워요. */
    const list = CLUBS[to] || [];
    if (list.length) {
      const ref = kind === "up" ? list[list.length - 1] : list[0];
      S.clubStr = ref ? ref.str : S.clubStr;
    }
    S.table = null;                          // 새 리그에서 표를 다시 만들어요
    S.leagueSince = S.proYear;               // 이 리그에 들어온 시즌 — 연속 승격을 막아요
    return { kind, from, to: leagueOf(S).name, rank };
  }

  /* ---------- 🥇 개인 순위 (득점·도움·수비) ----------
   *
   * 시즌 내내 같은 8명이 함께 쌓아요. 부문상은 이 표의 1위에게 갑니다 —
   * 화면에 보이는 경쟁이 곧 수상 판정이에요. 예전에는 랜덤 문턱이라
   * 표와 수상이 서로 모르는 사이였습니다. */
  function rollRace() {
    const clubs = shuffle(oppClubs(S));
    return RACE_ROLES.map((r, i) => ({
      name: randomPlayerName(Math.random() < 0.5 ? null : MARKETS.find((m) => m.id === "eu")),
      role: r.name, key: r.key, pop: rand(52, 88),
      club: clubs[i % clubs.length], g: 0, a: 0, d: 0,
    }));
  }

  /* 진행 중이던 세이브에는 경쟁자 명단이 없어요 — 시즌 시작(initActivity)에만
   * 만들어지거든요. 그대로 두면 순위표가 아예 안 뜨고, 시즌이 끝날 때까지
   * 부문상도 못 받아요.
   *
   * 그릴 때 비어 있으면 채워 넣되, **이미 치른 경기 수만큼 미리 굴려 둬요.**
   * 0골에서 시작하면 내가 20골인데 1위가 0골인 표가 나와서 경쟁이 안 됩니다.
   * (라이벌 이름·소속을 나중에 메우는 fillRivals와 같은 방식이에요) */
  function ensureRace() {
    const act = S.activity;
    if (!act || Array.isArray(act.race)) return;
    act.race = rollRace();
    const played = act.apps || 0;
    for (let i = 0; i < played; i++) raceAdvance();
    save();
  }

  // 한 경기치를 경쟁자들에게 쌓아요. 리그 격이 생산량에 실려요.
  function raceAdvance() {
    const race = S.activity && S.activity.race;
    if (!Array.isArray(race)) return;
    const pres = leagueOf(S).prestige;
    for (const r of race) {
      const def = RACE_ROLES.find((x) => x.key === r.key) || RACE_ROLES[0];
      r.g += poissonish(raceLam(def.g, r.pop, pres));
      r.a += poissonish(raceLam(def.a, r.pop, pres));
      r.d += poissonish(raceLam(def.d, r.pop, pres));
    }
  }

  /* 나를 끼워 정렬한 순위. key는 "g"(득점) · "a"(도움) · "d"(수비) · "p"(공격P). */
  function raceRank(key) {
    const act = S.activity;
    const race = (act && act.race) || [];
    const val = (x) => (key === "p" ? (x.g || 0) + (x.a || 0) : x[key] || 0);
    const me = { name: S.name, club: S.group, role: null, me: true,
      g: (act && act.goals) || 0, a: (act && act.assists) || 0, d: (act && act.defense) || 0 };
    return race.concat([me]).map((x) => ({ ...x, v: val(x) }))
      // 동점이면 내 줄을 앞에 둬요 — 실제로도 공동 득점왕은 둘 다 받아요
      .sort((x, y) => y.v - x.v || (x.me ? -1 : 1));
  }
  // 내가 그 부문 1위인가 — 부문상 판정이 이걸 봐요
  const raceTop = (key) => { const r = raceRank(key)[0]; return !!(r && r.me); };

  function raceHTML() {
    const KEYS = [["g", "⚽ 득점"], ["a", "🅰️ 도움"]];
    return KEYS.map(([k, label]) => {
      const rows = raceRank(k).slice(0, 5);
      const myIdx = raceRank(k).findIndex((x) => x.me);
      const line = (r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td>`
        + `<td class="ch-club">${r.club || "-"}${r.role ? `<span class="ch-role">${r.role}</span>` : ""}</td>`
        + `<td>${r.v}</td></tr>`;
      // 5위 밖이면 내 줄을 아래에 붙여요 — 안 보이면 순위표를 볼 이유가 없어요
      const pinned = myIdx >= 5
        ? `<tr class="hof-gap-row"><td colspan="4">⋯</td></tr>` + line(raceRank(k)[myIdx], myIdx)
        : "";
      return `<div class="race-block"><div class="race-title">${label}</div>`
        + `<table class="rank-table season-standings"><thead><tr><th>#</th><th>선수</th><th>소속</th><th>${label.slice(2)}</th></tr></thead>`
        + `<tbody>${rows.map(line).join("")}${pinned}</tbody></table></div>`;
    }).join("");
  }

  function initActivity() {
    initTable();
    S.activity = {
      cb: 1, cbTotal: CB_PER_YEAR,
      week: 0, weekTotal: WEEKS_PER_CB,
      wins: 0, sales: 0, hypeSum: 0, cbHype: 0, cbWins: 0,
      goals: 0, assists: 0, defense: 0, apps: 0, teamW: 0, teamD: 0, teamL: 0,
      opp: pick(oppClubs(S)),
      rivals: rollRivals(),
      // 🥇 득점·도움 경쟁 — 시즌 내내 같은 8명이에요 (라이벌과 다른 명단)
      race: rollRace(),
    };
  }

  function afterPrep() {
    if (S.camp > 0) { renderPrep(); return; }
    /* 🏆 컵 준비가 끝나면 **시작 버튼**을 띄워요. 리그 경기도 준비가 끝나면
     * "경기하러 가기"를 누르는데, 컵만 마지막 훈련을 누르는 순간 그대로 8강으로
     * 넘어갔어요 — 훈련하려던 손이 그대로 경기 시작이 됩니다.
     * 이 갈림이 없으면 리그 경기가 한 판 더 열려요(시즌은 이미 끝났는데도요). */
    if (S.cupPrep) { S.cupReady = true; save(); renderPrep(); show("screen-pro"); return; }
    if (!S.activity) initActivity();
    else if (S.activity.week >= S.activity.weekTotal) {
      S.activity.cb += 1;
      S.activity.week = 0;
      S.activity.cbHype = 0;
      S.activity.cbWins = 0;
      S.activity.rivals = rollRivals();
    }
    S.pendingShow = true;
    save();
    renderPrep();
    show("screen-pro");
  }

  function renderPrep() {
    $("pro-name").textContent = `${S.name} (${POS_INFO[S.pos].name})`;
    // 리그 이름을 함께 보여줘요 — 승격·강등하면 여기가 바뀌는 게 제일 먼저 눈에 띄어야 해요
    $("pro-team").textContent =
      `${leagueOf(S).flag} ${S.group}${S.center ? " · 주장" : ""} · ${leagueOf(S).name}`
      + `${traitOf(S).tag ? ` · ${traitOf(S).tag}` : ""} · ${S.proYear}시즌 · 종합 ${Math.round(overall())}`;
    $("pro-turn").textContent = S.activity
      ? `${cbLabel(S.activity.cb)} · R${S.activity.week}/${S.activity.weekTotal} · MOM ${S.activity.wins}회`
      : `시즌 준비 ${3 - S.camp}/3`;
    $("pro-money").textContent = `💰 ${fmtMoney(S.money || 0)}`;
  $("pro-cond-num").textContent = Math.round(S.condition);
    $("pro-cond-bar").style.width = `${S.condition}%`;

    /* 🏆 리그 순위표 — 시즌 중에만 보여줘요. 접어둬서 훈련 화면이 길어지지 않게 합니다.
     * "리그 경기중인데 리그 팀 순위표를 볼 수가 없네"에서 나왔어요. */
    const tbl = $("pro-table");
    /* 시즌 준비 중에도 보여줘요. 표는 원래 시즌이 시작될 때 만들어져서, 승격 직후
     * 준비 화면에서는 "내가 어느 리그에 왔는지"를 볼 방법이 없었어요.
     * 아직 없으면 새 리그의 표를 미리 만들어 둡니다 (전부 0경기로 시작해요). */
    /* ⚠️ 값은 "soccer-pro"예요 (career.js:127에서 그렇게 넣습니다).
     * 여기서 "pro"와 비교하고 있어서 **이 줄이 한 번도 안 돌았어요** —
     * 2.28.0에 넣은 "시즌 준비 중에도 순위표를 보여준다"가 내내 죽어 있었습니다.
     * 개인 순위를 붙이면서 같은 자리에 걸려 드러났어요. */
    if (isPro() && !tableReady()) { initTable(); save(); }
    if (tableReady()) {
      tbl.hidden = false;
      const rows = tableRows();
      const me = rows.find((r) => r.name === S.group);
      const played = me ? me.w + me.d + me.l : 0;
      $("pro-table-sum").textContent = played
        ? `🏆 ${leagueOf(S).name} ${myTableRank()}위 · ${me.w}승 ${me.d}무 ${me.l}패 · 승점 ${me.pts}`
        : `🏆 ${leagueOf(S).name} — 개막 전 (${tableRows().length}팀)`;
      $("pro-table-body").innerHTML = tableHTML();
    } else {
      tbl.hidden = true;
    }

    /* 🥇 개인 순위 — 시즌 중에만 보여줘요. 득점왕 경쟁이 눈에 보여야
     * "한 골 더"에 이유가 생겨요. 부문상이 이 표 1위한테 갑니다. */
    const race = $("pro-race");
    ensureRace();                     // 옛 세이브에도 명단을 채워요
    if (S.activity && Array.isArray(S.activity.race)) {
      race.hidden = false;
      const g = raceRank("g")[0], mine = raceRank("g").findIndex((x) => x.me) + 1;
      $("pro-race-sum").textContent = `🥇 개인 순위 — 득점 ${mine}위 (${(S.activity.goals || 0)}골)`
        + `${g && !g.me ? ` · 1위 ${g.name} ${g.v}골` : " · 내가 1위!"}`;
      $("pro-race-body").innerHTML = raceHTML();
    } else if (isPro()) {
      /* 🥇 시즌 준비 중에는 S.activity가 아예 없어요 — 시즌이 시작될 때 만들어지거든요.
       * 그대로 두면 준비 화면 내내 개인 순위가 **통째로 사라져** "왜 안 보이지"가 됩니다.
       * 리그 순위표도 같은 이유로 준비 중 표시를 따로 넣었어요(개막 전 6팀).
       * 여기서는 무엇을 겨루게 되는지만 알려 줍니다. */
      race.hidden = false;
      $("pro-race-sum").textContent = "🥇 개인 순위 — 개막 전";
      $("pro-race-body").innerHTML = `<p class="race-title">시즌이 시작되면 리그의 다른 8명과 `
        + `득점·도움을 겨뤄요.<br/>골든부츠·플레이메이커·철벽상·공격포인트왕은 `
        + `<b>이 표에서 1위</b>면 받습니다.</p>`;
    } else {
      race.hidden = true;
    }

    const stats = $("pro-stats");
    stats.innerHTML = "";
    for (const d of STAT_DEFS) {
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
        aw.onclick = () => { if (awakenTalent(d.key, proLog)) renderPrep(); };
        row.appendChild(aw);
      }
      stats.appendChild(row);
    }

    $("pro-camp-title").textContent = S.pendingShow
      ? (S.activity.week === 0
        ? `⚽ ${cbLabel(S.activity.cb)} 리그 준비 완료 — 경기를 시작하세요!`
        : `🔔 킥오프! R${S.activity.week + 1} 경기를 시작하세요`)
      : (S.cupReady
        ? `🏆 ${cupName()} 8강 준비 완료 — 경기를 시작하세요!`
        : S.cupPrep
        // 🏆 컵 준비는 리그와 다른 자리예요 — 뭘 앞두고 훈련하는지 알려줘야 해요
        ? `🏆 ${cupName()} 8강 준비 — 남은 훈련 ${S.camp}회, 끝나면 단판 토너먼트!`
        : S.activity
          ? `시즌 중 — 다음 경기 전 훈련 ${S.camp}회 남음`
          : `시즌 준비 — 남은 훈련 ${S.camp}회, 끝나면 리그 개막!`);
    const box = $("pro-actions");
    box.innerHTML = "";
    for (const d of STAT_DEFS) {
      const btn = document.createElement("button");
      // 상한에 닿으면 훈련해도 오르지 않아요 — 각성/초월로 바꿔줍니다
      if (atCap(d.key)) {
        const tmax = isTalentMax(S.talents[d.key]);
        const pct = Math.round((tmax ? transP(transLv(d.key)) : awakenP(Math.round(S.stats[d.key]))) * 100);
        btn.dataset.key = d.key;
        btn.className = "action-btn awaken-act";
        btn.innerHTML = `<span class="a-emoji">${tmax ? "🌠" : "🔮"}</span>${d.name} ${tmax ? "초월 각성" : "재능 각성"}<span class="a-sub">상한 ${statCap(d.key)} 도달 · 성공률 ${pct}%</span>`;
        btn.onclick = () => { if (awakenTalent(d.key, proLog)) renderPrep(); };
      } else {
        btn.dataset.key = d.key;
        btn.className = "action-btn";
        btn.innerHTML = `<span class="a-emoji">${d.emoji}</span>${d.name} 훈련<span class="a-sub">${d.sub}</span>`;
        btn.onclick = () => prepAction(d);
      }
      box.appendChild(btn);
    }
    box.appendChild(makeAdSlotButton(renderPrep));
    const rest = document.createElement("button");
    rest.className = "action-btn rest";
    rest.dataset.key = "__rest";
    rest.innerHTML = `<span class="a-emoji">🛌</span>휴식 <span class="a-sub">컨디션 회복</span>`;
    rest.onclick = () => prepAction(null);
    box.appendChild(rest);

    /* 🏆 컵 준비가 끝났으면 훈련을 잠그고 시작 버튼만 남겨요.
     * 리그의 "경기하러 가기"와 같은 자리·같은 모양이에요. */
    if (S.cupReady) {
      box.querySelectorAll(".action-btn").forEach((b) => {
        if (!b.classList.contains("ad-slot")) b.disabled = true;
      });
      const cupGo = document.createElement("button");
      cupGo.className = "action-btn rest go-game";
      cupGo.innerHTML = `<span class="a-emoji">🏆</span>${cupName()} 8강 시작`
        + `<span class="a-sub">단판 토너먼트 — 지면 끝이에요</span>`;
      cupGo.onclick = () => { S.cupPrep = false; S.cupReady = false; save(); startCup(); };
      box.appendChild(cupGo);
    }

    if (S.pendingShow) {
      box.querySelectorAll(".action-btn").forEach((b) => {
        if (!b.classList.contains("ad-slot")) b.disabled = true;
      });
      const go = document.createElement("button");
      go.className = "action-btn rest go-game";
      go.innerHTML = S.activity.week === 0
        ? `<span class="a-emoji">⚽</span>${cbLabel(S.activity.cb)} 개막전<span class="a-sub">전술 미팅 → 킥오프</span>`
        : `<span class="a-emoji">🔔</span>리그 경기<span class="a-sub">R${S.activity.week + 1}/${S.activity.weekTotal} 주간 활약 경쟁</span>`;
      go.onclick = playShow;
      box.appendChild(go);
    }

    $("pro-log").innerHTML = (S.proLog || [])
      .map((l, i) => `<div class="${i === 0 ? "new" : ""}">${l}</div>`)
      .join("");
  }

  function prepAction(def) {
    // 상한에 닿았으면 훈련은 턴만 소모돼요 — 각성으로 돌려줍니다
    if (def && atCap(def.key)) { if (awakenTalent(def.key, proLog)) renderPrep(); return; }
    if (def) {
      const yearMod = S.proYear <= 3 ? 1.1 : S.proYear <= 6 ? 1.0 : S.proYear <= 8 ? 0.7 : 0.45;
      const failP = S.condition < 40 ? 0.15 : 0.07;
      if (Math.random() < failP) {
        const loss = Math.round(rand(0.5, 1.5) * 10) / 10;
        S.stats[def.key] = clamp(S.stats[def.key] - loss, 0, statCap(def.key));
        S.condition = clamp(S.condition - randInt(6, 10), 0, 100);
        proLog(`😵 ${def.name} 훈련이 꼬였어요… -${loss.toFixed(1)}`);
      actFx(def.key, "-" + loss.toFixed(1), true);
        S.camp -= 1;
        save();
        afterPrep();
        return;
      }
      const condMod = S.condition >= 70 ? 1.1 : S.condition >= 40 ? 1.0 : 0.6;
      /* 🌍 지금 뛰는 나라가 훈련에 얹혀요 — 🇯🇵는 전반적으로, 🇧🇷·🇮🇹는 잘 가르치는
       * 능력치 하나에만. 어느 리그에 머물지가 수상 값어치만의 문제가 아니게 됩니다. */
      const natMul = traitMul(S, "train") * traitFocusMul(S, def.key);
      let gain = rand(1.8, 3.6) * S.talents[def.key] * yearMod * condMod * natMul;
      if (S.stats[def.key] >= 100) gain *= 0.5;
      gain = Math.round(gain * 10) / 10;
      S.stats[def.key] = clamp(S.stats[def.key] + gain, 0, statCap(def.key));
      S.condition = clamp(S.condition - randInt(10, 16), 0, 100);
      const natTag = natMul > 1.01 ? ` ${leagueOf(S).flag}` : "";
      proLog(`${def.emoji} ${def.name} 훈련 +${gain.toFixed(1)}${natTag} (${Math.round(S.stats[def.key])})`);
      actFx(def.key, "+" + gain.toFixed(1));
    } else {
      const heal = Math.round(randInt(25, 40) * traitMul(S, "rest"));
      S.condition = clamp(S.condition + heal, 0, 100);
      proLog(`🛌 컨디션 회복 +${heal}${traitMul(S, "rest") > 1.01 ? ` ${leagueOf(S).flag}` : ""} (${Math.round(S.condition)})`);
    }
    S.camp -= 1;
    save();
    afterPrep();
  }

  // ---------- 리그 경기 (주 1회, 주간 활약 경쟁) ----------
  /* 평점은 10점 만점이에요.
   * 순위 점수(score)에는 결정적 순간 보정(±8)과 흔들림(±4)이 평점 뒤에 얹혀서
   * 최대 112까지 올라가요. 그건 MOM 순위를 가리는 값이지 평점이 아닌데,
   * 그대로 10으로 나눠 보여줘서 10.7 같은 평점이 찍혔어요.
   * 순서는 원래 점수로 가리고, 보여줄 때만 10점으로 맞춥니다. */
  /* 주간 평점 순위. 상위 5명만 보여주되, 내가 5위 밖이면 내 줄을 아래에 붙여요 —
   * 예전에는 5위 밖이면 내 평점이 아예 안 보여서 "몇 점 받았는지"를 알 수가 없었어요. */
  function chartHTML(rows, top) {
    const N = top || 5;
    const shown = rows.slice(0, N);
    const myIdx = rows.findIndex((r) => r.me);
    /* 소속 옆의 승·무·패는 **그 라운드 그 클럽의 결과**예요. 라이벌 점수가 이걸 보고
     * 오르내리니 근거가 화면에 있어야 해요 — 없으면 순위가 왜 뒤집혔는지 알 수가 없어요.
     * 한 글자 inline이라 줄을 새로 만들지 않아요. */
    const line = (r, i) => `<tr class="${r.me ? "me" : ""}"><td>${i + 1}</td><td>${r.name}</td>`
      + `<td class="ch-club">${r.club || (r.me ? S.group : "-")}`
      + `${r.res ? `<span class="ch-res r-${r.res.toLowerCase()}">${RES_KO[r.res] || ""}</span>` : ""}`
      + `${r.role ? `<span class="ch-role">${r.role}</span>` : ""}</td>`
      + `<td>${clamp(r.score / 10, 1, 10).toFixed(1)}</td></tr>`;
    const pinned = myIdx >= N
      ? `<tr class="hof-gap-row"><td colspan="4">⋯</td></tr>` + line(rows[myIdx], myIdx)
      : "";
    return `<table class="rank-table season-standings"><thead><tr><th>#</th><th>선수</th><th>소속</th><th>평점</th></tr></thead>
      <tbody>${shown.map(line).join("")}${pinned}</tbody></table>`;
  }

  function playShow() {
    const act = S.activity;
    act.opp = pick(oppClubs(S)); // 이번 상대 — 같은 리그에서 내 클럽을 빼고 뽑아요
    $("stage-title").textContent = `⚽ ${S.proYear}시즌 ${cbLabel(act.cb)} — ${S.group}`;
    $("stage-round").textContent = `R${act.week + 1}/${act.weekTotal} 리그 · vs ${act.opp}`;
    show("screen-stage");

    const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom);
    const c = matchContribution(rating);
    const oppGoals = deriveOppGoals(rating, S.stats.defense);
    MatchSim.run({
      home: S.group, away: act.opp, myName: S.name,
      goals: c.g, assists: c.a, defense: c.def, oppGoals, rating,
      finalize: (info) => proMatchFinalize(act, info, rating),
    });
  }

  // 프로 경기 결과 반영 (MOM 평점 순위 + 보상 + 다음 진행)
  function proMatchFinalize(act, info, rating) {
    fillRivals(act);                    // 옛 세이브의 라이벌에 이름·소속을 채워요
    const momAdj = info.momentRes === "perfect" ? 8 : info.momentRes === "miss" ? -8 : 0;
    /* 그 경기에서 실제로 한 일을 평점에 반영해요.
     * 예전에는 rating(스탯·컨디션·명성)과 랜덤만 봐서, 4:2로 이긴 경기에 3골을
     * 넣고도 7위가 나올 수 있었어요 — 골·도움·수비도 승패도 식에 없었거든요.
     *
     * posAxis로 재면 포지션이 자동으로 보정돼요 (수비 3.5회 ≈ 골 1.6개).
     * 기대치(그 평점이면 보통 이만큼)와 견줘서 잘했으면 +, 못했으면 −.
     * 기대치도 평점을 따라 움직여야 실력 좋은 선수가 이중으로 이득 보지 않아요. */
    const perfNow = clamp((rating - 5) / 4 + 0.6, 0.15, 1.6);
    const axisNow = posAxis({ goals: info.myGoals, assists: info.assists, defense: info.defense }, S.pos);
    /* 기대치를 넘은 쪽이 못 넘은 쪽보다 무겁게 실려요(AXIS_UP > AXIS_DOWN).
     * 예전에는 배수가 8 하나라, 2골 2도움을 하고도 평점이 7.6밖에 안 올라
     * "잘한 경기"가 화면에서 티가 안 났어요. 반대로 배수만 올리면 조용한 경기가
     * 지나치게 깎여서(0골 4.73 → 4.07) 평범한 날이 재앙처럼 보입니다.
     *
     * 실측(공격수 능력치 75, 6만 경기):
     *              0골     1골    2골2도움   평점평균
     *   이전(×8)   4.73   5.54    7.57      5.91
     *   지금       4.90   5.60    8.30      6.12   ← 못한 경기는 오히려 덜 가혹해요 */
    const AXIS_UP = 12, AXIS_DOWN = 7;
    const axisGap = axisNow - 2.05 * perfNow;
    const doneBonus = axisGap >= 0 ? axisGap * AXIS_UP : axisGap * AXIS_DOWN;
    const resultBonus = info.res === "W" ? 3 : info.res === "L" ? -3 : 0;
    const myRankScore = rating * 10 + momAdj + doneBonus + resultBonus + rand(-4, 4);
    /* ⚠️ 순위표를 **먼저** 굴려요. 그래야 그 라운드에 각 클럽이 뭘 했는지가 나오고,
     * 라이벌 점수가 그걸 볼 수 있어요. 예전에는 순위 행을 다 만든 뒤에 굴려서
     * 둘이 같은 라운드를 보면서도 서로 모르는 사이였습니다. */
    const roundRes = recordRound(act.opp, info.res);
    ensureRace();    // 옛 세이브면 여기서 먼저 채워요
    raceAdvance();   // 🥇 경쟁자들도 그 라운드 몫을 쌓아요
    const rows = [
      { name: S.name, score: myRankScore, me: true, res: info.res },
      /* club·role도 함께 옮겨요. 예전에는 name과 score만 옮겨서, fillRivals가
       * 소속을 제대로 채워 놔도 이 자리에서 버려졌어요 — 표에는 내 줄만 클럽이
       * 나오고 상위 5명은 전부 "-"로 보였습니다.
       * res는 그 라운드 소속 클럽의 결과예요. 내가 이긴 상대 팀의 라이벌은 같이 떨어져요. */
      ...act.rivals.map((r) => ({
        name: r.name, club: r.club, role: r.role, res: roundRes[r.club] || null,
        score: 70 + (r.pop - 70) * RIVAL_POP_PULL + rand(-6, 6) + rivalResAdj(roundRes[r.club]),
      })),
    ].sort((a, b) => b.score - a.score);
    const rank = rows.findIndex((r) => r.me) + 1;
    const won = rank === 1;
    const hypeDelta = (5 - rank) * 0.35 + (info.momentRes === "perfect" ? 0.5 : info.momentRes === "miss" ? -0.5 : 0);

    act.apps = (act.apps || 0) + 1;
    // 시즌 평균 평점 — 기록 화면에 보여줘요
    act.ratingSum = (act.ratingSum || 0) + clamp(myRankScore / 10, 1, 10);
    act.goals = (act.goals || 0) + info.myGoals;
    act.assists = (act.assists || 0) + info.assists;
    act.defense = (act.defense || 0) + info.defense;
    if (info.res === "W") act.teamW = (act.teamW || 0) + 1;
    else if (info.res === "D") act.teamD = (act.teamD || 0) + 1;
    else act.teamL = (act.teamL || 0) + 1;

    act.week += 1;
    act.hypeSum += hypeDelta;
    act.cbHype += hypeDelta;
    let pay = 30, dFan;
    if (won) {
      act.wins += 1; act.cbWins += 1; S.career.wins += 1;
      pay += 100; dFan = randInt(10, 18);
    } else if (rank <= 3) {
      dFan = randInt(4, 9);
    } else {
      dFan = randInt(-3, 3);
    }
    S.fandom = Math.max(0, (S.fandom || 0) + dFan);
    // 🌍 나라 특색 — 🇬🇧 잉글랜드는 돈이 도는 리그예요 (계약금에도 같은 배수가 붙어요)
    pay = Math.round(pay * traitMul(S, "money"));
    S.money = (S.money || 0) + pay;
    /* ⚡ 실전 성장 — 낮은 확률로 경기에서 뭔가를 깨쳐요.
     * 훈련만으로 크는 게 아니라 경기가 선수를 키운다는 감각을 주려는 거예요.
     * 잘한 경기일수록 확률이 올라가요. 상한에 닿은 능력치는 대상에서 빼요.
     *
     * ⚠️ 예전에는 후보에서 **아무거나** 뽑았어요. 1골 0도움 0수비인 경기에서
     * 수비가 오르니 "경기가 선수를 키운다"가 아니라 그냥 랜덤 보너스로 보였습니다.
     * 이제 그 경기에 실제로 한 일이 무게가 돼요 — 골을 넣었으면 슛, 도움이면 패스,
     * 몸으로 막았으면 수비 쪽으로 기울어요.
     *
     * 바닥 무게(GROW_BASE)를 남겨 두는 이유: 90분을 뛴 이상 아무 일도 없던 칸이
     * 절대 안 오르는 건 과해요. 다만 한 일이 있으면 그쪽이 훨씬 무거워집니다.
     * 체력은 이벤트가 없어서 바닥 무게만 조금 높게 둡니다 — 뛴 것 자체가 근거예요. */
    const GROW_BASE = 0.5;
    const growWeight = {
      shoot: GROW_BASE + info.myGoals * 3,
      pass: GROW_BASE + info.assists * 3,
      // 돌파는 골·도움 장면을 만드는 과정이라 둘 다에서 조금씩 와요
      dribble: GROW_BASE + (info.myGoals + info.assists) * 1.2,
      defense: GROW_BASE + info.defense * 2,
      stamina: 1,
    };
    /* 계기를 문구로도 남겨요. 왜 그게 올랐는지 화면에서 읽혀야 해요 —
     * 지금까지는 "실전에서 수비를 깨쳤어요"만 떠서 근거를 알 수가 없었어요. */
    const GROW_WHY = {
      shoot: info.myGoals > 0 ? "골을 넣은 감각이 남아" : "",
      pass: info.assists > 0 ? "도움 장면의 시야가 붙어" : "",
      dribble: info.myGoals + info.assists > 0 ? "돌파가 통한 게 남아" : "",
      defense: info.defense > 0 ? "몸으로 막아낸 게 남아" : "",
      stamina: "",
    };
    /* 활약이 클수록 확률도 올라가요. 승패도 봅니다 — 이긴 경기에서 더 배워요.
     * posAxis를 쓰면 포지션 보정이 자동으로 붙어 수비수가 손해 보지 않아요. */
    const didAxis = posAxis({ goals: info.myGoals, assists: info.assists, defense: info.defense }, S.pos);
    const growP = clamp(
      0.06
      + (rank <= 3 ? 0.06 : 0)
      + (info.momentRes === "perfect" ? 0.05 : 0)
      + (info.res === "W" ? 0.03 : info.res === "L" ? -0.02 : 0)
      + Math.min(0.05, didAxis * 0.03),
      0.02, 0.25
    );
    if (Math.random() < growP) {
      const pool = STAT_DEFS.filter((d) => !atCap(d.key));
      const total = pool.reduce((sum, d) => sum + growWeight[d.key], 0);
      if (pool.length && total > 0) {
        let roll = Math.random() * total;
        let d = pool[pool.length - 1];
        for (const cand of pool) { roll -= growWeight[cand.key]; if (roll < 0) { d = cand; break; } }
        const gain = Math.round(rand(0.4, 1.4) * S.talents[d.key] * 10) / 10;
        S.stats[d.key] = clamp(S.stats[d.key] + gain, 0, statCap(d.key));
        const why = GROW_WHY[d.key];
        proLog(`⚡ ${why ? why + " " : "실전에서 "}${d.name}을(를) 깨쳤어요! +${gain.toFixed(1)} (${Math.round(S.stats[d.key])})`);
        if (window.Fx) Fx.flash(`⚡ ${d.name} +${gain.toFixed(1)}`);
      }
    }
    S.condition = clamp(S.condition - randInt(3, 6), 0, 100);
    S.pendingShow = false;

    const cbDone = act.week >= act.weekTotal;
    let extraLine = "";
    if (cbDone) {
      const cbSales = Math.max(1, Math.round(S.fandom * 0.05 + act.cbWins * 6 + act.cbHype * 4 + rand(-4, 4)));
      act.sales += cbSales;
      extraLine = `<div class="tour-pts">⚽ ${cbLabel(act.cb)} 종료 — MOM ${act.cbWins}회 · 공격포인트 ${cbSales}P</div>`;
    }
    save();

    const scoreClass = info.res === "W" ? "win" : info.res === "L" ? "lose" : "";
    const resultHTML = `
      <div class="ms-final ${scoreClass}">${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${RES_LABEL[info.res]}</div>
      <div class="tour-vs">${won ? "🏅 MOM!" : `평점 ${rank}위`} <span class="${won ? "win" : ""}">${S.name}</span> · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense}</div>
      ${chartHTML(rows)}
      <div class="tour-pts">💰 경기 수당 +${pay}만 · ${dFan >= 0 ? `⭐ 명성 +${dFan}` : `📉 명성 ${dFan}`}</div>
      ${extraLine}`;

    let nextLabel, nextFn;
    if (!cbDone) {
      nextLabel = `🏋️ 다음 경기 준비 (R${act.week + 1})`;
      nextFn = () => { S.camp = 2; save(); renderPrep(); show("screen-pro"); };
    } else if (act.cb < act.cbTotal) {
      nextLabel = `⚽ ${cbLabel(act.cb + 1)} 준비하기`;
      nextFn = () => { S.camp = 3; save(); renderPrep(); show("screen-pro"); };
    } else if (cupEntry()) {
      /* 🏆 리그가 끝나면 컵이에요. 4위 안에 들어야 나갈 수 있어요 —
       * 그래야 마지막 라운드가 5월의 평범한 경기와 달라집니다.
       *
       * ⚠️ **대회 준비 턴을 줘요.** 예전에는 리그 마지막 경기 결과에서 버튼 하나로
       * 바로 8강이었어요 — 반기가 바뀔 때는 3턴을 주는데 컵에는 0턴이었고,
       * 컨디션도 리그 마지막 경기 직후라 바닥이었습니다. 시즌의 절정인데
       * 준비할 틈이 없었어요. */
      nextLabel = `🏆 ${cupName()} 준비하기`;
      nextFn = () => { S.camp = CUP_CAMP; S.cupPrep = true; save(); renderPrep(); show("screen-pro"); };
    } else {
      nextLabel = "🏁 시즌 결산";
      nextFn = finishYear;
    }
    return { resultHTML, nextLabel, nextFn };
  }

  /* ---------- 🏆 컵 대회 ----------
   *
   * 리그 38라운드가 끝나면 바로 결산이라 시즌에 절정이 없었어요. 야구는 가을야구가
   * 정규시즌 내내 목표가 되어 주는데, 축구는 리그 순위가 곧 끝이었습니다.
   *
   * 리그와 다른 점 둘:
   *  · **1부와 2부가 같은 대진**이에요. 리그에서는 절대 안 만나는 조합이 나와요.
   *  · **단판**이에요. 38경기에서는 묻히는 한 판 운이 여기서는 안 묻혀요.
   *
   * 참가는 **리그 4위 안**이에요. 전 팀이 나가면 리그 순위가 컵에 아무 영향을 안 줘서
   * 시즌 중 긴장이 사라집니다. 못 들면 그냥 결산이에요 — 아쉬움도 같이 남겨요.
   *
   * 승부차기 실행은 cup.js(window.SoccerCup)에 있어요. 여기는 대진과 세이브만 봐요 —
   * 세이브를 만지는 코드는 한곳에 모읍니다. */
  const CUP_SPOTS = 4;                        // 리그마다 몇 위까지 나가나
  const CUP_CAMP = 2;                         // 컵 8강 전에 주는 훈련·휴식 턴
  const cupName = () => (window.SoccerCup ? SoccerCup.nameOf(leagueOf(S).country) : "컵 대회");
  const cupRounds = () => (window.SoccerCup ? SoccerCup.ROUNDS : ["8강", "4강", "결승"]);

  // 컵에 나갈 수 있나 — 리그 표가 있고 내 순위가 CUP_SPOTS 안이어야 해요
  function cupEntry() {
    if (!window.SoccerCup || !tableReady()) return false;
    return myTableRank() <= CUP_SPOTS;
  }

  /* 대진 상대 — 내 나라의 **다른 리그**에서도 데려와요. 같은 리그 팀만 모으면
   * 리그 경기와 상대가 똑같아서 컵이 그냥 3경기 더가 됩니다.
   * 같은 나라 리그가 하나뿐이면(있을 수 있어요) 내 리그에서만 채워요. */
  function cupField() {
    const myLg = leagueOf(S);
    const mates = (CLUBS[myLg.id] || []).filter((c) => c.name !== S.group);
    const others = LEAGUES.filter((l) => l.country === myLg.country && l.id !== myLg.id);
    /* ⚠️ 예전에는 다른 리그 클럽을 **전부 모아 전력 상위 4팀**을 뽑았어요.
     * 그러면 하부에 있을수록 최상위 리그 강팀만 만납니다 — K리그3 소속이면
     * 8강 상대 넷이 전부 K리그1(78·71·66·62)이었어요. 자이언트 킬링이 아니라 벽이고,
     * 반대로 K리그1은 하부 팀만 만나 너무 쉬웠습니다.
     *
     * 이제 **리그마다 골고루** 뽑아요. 실제 FA컵 8강도 1부·2부가 섞이지
     * 한쪽으로 쏠리지 않아요. 자리가 남으면 위 리그부터 한 팀씩 더 채웁니다. */
    const perLeague = Math.max(1, Math.floor(CUP_SPOTS / Math.max(1, others.length)));
    const byLeague = others.map((l) => (CLUBS[l.id] || []).slice()
      .sort((a, b) => b.str - a.str).slice(0, perLeague).map((c) => ({ ...c, lg: l })));
    const up = byLeague.flat();
    // 남는 자리는 위 리그(tier 큰 쪽)부터 다음 순위 팀으로 채워요
    const rest = others.slice().sort((a, b) => b.tier - a.tier)
      .flatMap((l) => (CLUBS[l.id] || []).slice().sort((a, b) => b.str - a.str)
        .slice(perLeague).map((c) => ({ ...c, lg: l })));
    while (up.length < CUP_SPOTS && rest.length) up.push(rest.shift());
    const mine = mates.sort((a, b) => b.str - a.str).slice(0, CUP_SPOTS - 1)
      .map((c) => ({ ...c, lg: myLg }));
    return shuffle(mine.concat(up.slice(0, CUP_SPOTS)));
  }

  function startCup() {
    S.cup = { round: 0, name: cupName(), field: cupField().map((c) => ({ name: c.name, str: c.str, lg: c.lg.short })) };
    save();
    // 신규 기능이라 참가율부터 봐야 해요 — 리그 4위 안이 얼마나 자주 나오나
    if (window.Stats) Stats.log("cup", { act: "enter", y: S.proYear, lg: S.league, name: S.cup.name });
    cupMatch();
  }

  // 이번 라운드 상대 하나를 뽑아요 (뽑힌 팀은 대진에서 빠져요)
  function cupDraw() {
    const f = S.cup.field;
    if (!f.length) return null;
    const i = Math.floor(Math.random() * f.length);
    return f.splice(i, 1)[0];
  }

  function cupMatch() {
    const rounds = cupRounds();
    const opp = cupDraw();
    if (!opp) { cupFinish(false); return; }
    S.cup.opp = opp;
    save();
    $("stage-title").textContent = `🏆 ${S.cup.name} ${rounds[S.cup.round]}`;
    $("stage-round").textContent = `${S.group} vs ${opp.name} (${opp.lg}) · 단판`;
    show("screen-stage");

    const rating = ratingOf(S.stats, S.pos, S.condition, S.fandom);
    const c = matchContribution(rating);
    /* 컵 상대는 그 팀 전력으로 실점을 잡아요. 리그 경기의 deriveOppGoals는
     * 내 리그 평균을 기준으로 삼는데, 컵에서는 2부 팀도 1부 팀도 오니까요. */
    const oppGoals = deriveOppGoals(rating, S.stats.defense) + (opp.str > clubStrOf(S) ? 1 : 0);
    MatchSim.run({
      home: S.group, away: opp.name, myName: S.name,
      goals: c.g, assists: c.a, defense: c.def, oppGoals, rating,
      finalize: (info) => cupFinalize(info, rating),
    });
  }

  /* ⚠️ MatchSim.run의 finalize는 **{resultHTML, nextLabel, nextFn}을 돌려줘야** 해요.
   * 처음엔 여기서 DOM을 직접 그리고 아무것도 안 돌려줬는데, MatchSim이
   * out.resultHTML을 읽다가 그 자리에서 죽어 결과 화면이 통째로 안 나왔습니다.
   * 리그 경기(proMatchFinalize)와 같은 모양을 지켜요. */
  function cupFinalize(info, rating) {
    const rounds = cupRounds();
    const label = rounds[S.cup.round];
    S.condition = clamp(S.condition - randInt(3, 6), 0, 100);
    /* 컵 경기도 시즌 기록에 넣어요 — 안 넣으면 결승까지 가서 넣은 골이
     * 연도별 표에서 사라져요. 평점 평균에도 같이 들어갑니다. */
    const act = S.activity;
    if (act) {
      act.goals = (act.goals || 0) + info.myGoals;
      act.assists = (act.assists || 0) + info.assists;
      act.defense = (act.defense || 0) + info.defense;
      act.apps = (act.apps || 0) + 1;
      act.ratingSum = (act.ratingSum || 0) + clamp(rating, 1, 10);
    }
    save();
    const head = `<div class="ms-final ${info.res === "W" ? "win" : info.res === "L" ? "lose" : ""}">`
      + `${info.home} ${info.teamGoals} : ${info.oppGoals} ${info.away} · ${S.cup.name} ${label}</div>`
      + `<div class="tour-vs"><span>${S.name}</span> · ⚽${info.myGoals} 🅰️${info.assists} 🛡️${info.defense}</div>`;

    // 비기면 승부차기 — 컵은 단판이라 무승부가 없어요
    if (info.res === "D") {
      return {
        resultHTML: head + `<div class="tour-line">비겼어요 — 승부차기로 갑니다</div><div id="pk-box"></div>`,
        nextLabel: "⚽ 승부차기 시작",
        nextFn: () => {
          const btn = $("btn-stage-next");
          if (btn) btn.hidden = true;
          SoccerCup.shootout(document.getElementById("pk-box"), {
            myName: S.group, oppName: S.cup.opp.name,
            shoot: S.stats.shoot, oppStr: S.cup.opp.str,
            onDone: (win) => { if (btn) btn.hidden = false; cupAdvance(win, head, true); },
          });
        },
      };
    }
    return cupNext(info.res === "W", head, false);
  }

  /* 다음 화면을 정해요. 경기 직후에는 MatchSim에 돌려주고(cupFinalize),
   * 승부차기 뒤에는 직접 그려요(cupAdvance) — 같은 계산을 두 군데서 안 하려고 나눴어요. */
  function cupNext(win, head, viaPk) {
    const rounds = cupRounds();
    const label = rounds[S.cup.round];
    const pk = viaPk ? " (승부차기)" : "";
    if (!win) {
      const money = 60 * (S.cup.round + 1);
      S.money = (S.money || 0) + money;
      if (window.Stats) Stats.log("cup", { act: "out", y: S.proYear, round: label, pk: !!viaPk, name: S.cup.name });
      S.cup = null;
      save();
      return {
        resultHTML: head + `<div class="tour-line">💧 ${label}에서 탈락${pk}…</div>`
          + `<div class="tour-pts">💰 대회 수당 +${money}만</div>`,
        nextLabel: "🏁 시즌 결산", nextFn: finishYear,
      };
    }
    S.cup.round += 1;
    if (S.cup.round >= rounds.length) return cupWin(head, pk);
    save();
    return {
      resultHTML: head + `<div class="tour-line">🎉 ${label} 통과${pk}!</div>`,
      nextLabel: `🏆 ${rounds[S.cup.round]} 진출`, nextFn: cupMatch,
    };
  }

  function cupWin(head, pk) {
    const money = 900, fan = randInt(25, 45);
    S.money = (S.money || 0) + money;
    S.fandom = Math.max(0, (S.fandom || 0) + fan);
    S.trophies = S.trophies || [];
    const title = `${S.proYear}시즌 ${S.cup.name} 우승`;
    if (!S.trophies.includes(title)) S.trophies.push(title);
    const name = S.cup.name;
    if (window.Stats) Stats.log("cup", { act: "win", y: S.proYear, pk: !!pk, name });
    S.cup = null;
    save();
    if (window.Fx) Fx.celebrate("champion", `🏆 ${name} 우승!`);
    return {
      resultHTML: (head || "") + `<div class="tour-line">🏆 <b>${name} 우승!!</b>${pk || ""}</div>`
        + `<div class="tour-pts">💰 우승 상금 +${money}만 · ⭐ 명성 +${fan}</div>`,
      nextLabel: "🏁 시즌 결산", nextFn: finishYear,
    };
  }

  // 승부차기가 끝난 뒤 — 직접 그려요 (MatchSim은 이미 끝났어요)
  function cupAdvance(win, head, viaPk) {
    const out = cupNext(win, head, viaPk);
    const box = document.getElementById("stage-result") || $("stage-card");
    box.innerHTML = out.resultHTML;
    const btn = $("btn-stage-next");
    if (btn) { btn.hidden = false; btn.disabled = false; btn.textContent = out.nextLabel; btn.onclick = out.nextFn; }
  }

  // ---------- 시즌 결산 ----------
  function finishYear() {
    const act = S.activity;
    const agePen = S.proYear >= 8 ? (S.proYear - 7) * 0.8 : 0;
    /* 연말 평가는 이제 축이 해요. 예전에는 hypeSum(순위 기반)이라
     * 1위를 하는 순간 천장에 붙어서 능력치를 더 올려도 결과가 같았어요.
     * 축은 골·도움·수비 성공 개수라 상한이 없어요. 후반에 기하급수로 커지니
     * 로그로 잽니다 — 선형이면 10년차에 hype가 수백이 돼요.
     * hypeSum은 경기 화면 순위 연출에 그대로 남아 있어요.
     *
     * 리그격(prestige)을 축에 곱해요 — 같은 성적이라도 위 리그에서 낸 게 값어치가 커요.
     * 평점 페널티가 성적 자체를 깎으니, 이 둘이 맞물려 "실력이 되면 통하고
     * 아니면 못 버틴다"는 도박이 돼요.
     *
     * 아래 hype 줄과 수상 판정 블록은 여러 회귀 테스트가 소스에서 통째로 떼어 굴려요.
     * 그래서 리그를 지역 변수로 묶지 않고 매번 leagueOf(S)로 읽어요 —
     * 묶으면 떼어낸 조각이 밖에서 안 돌아서 테스트가 통째로 죽습니다. */
    const hype = clamp(Math.log(Math.max(1, posAxis(act, S.pos) * leagueOf(S).prestige)) * AXIS_K - AXIS_OFF - agePen, -1.5, 12);
    const wins = act.wins;
    const sales = act.sales;
    const dFan = Math.round(hype * 10 + wins * 3 - (hype < 0 ? 15 : 0));
    S.fandom = Math.max(0, S.fandom + dFan);
    // 수상은 '리그 내 상대 비교' — 가상 경쟁자들의 활약과 겨뤄 최고면 수상해요.
    // (압도적인 시즌은 랜덤에 밀려 상을 놓치지 않아요)
    const awards = [];
    /* 경쟁 강도 — 수상 문턱과 라이벌 분포에 함께 곱해요. K리그1은 1이라 항등이에요.
     * 셋(신인왕·리그MVP·베스트11)이 같은 bar를 써야 상끼리 앞뒤가 맞아요.
     * 하나만 고치면 "베스트11은 못 받는데 MVP는 받는" 역전이 납니다. */
    const bar = barOf(S);
    if (S.proYear === 1 && hype >= 3 * bar) {
      const bestRookie = Math.max(...Array.from({ length: 4 }, () => rand(1.5 * bar, 4.2 * bar)));
      if (hype >= bestRookie) { awards.push("신인왕"); S.career.rookie += 1; }
    }
    const leagueBest = Math.max(...Array.from({ length: 6 }, () => rand(3.5 * bar, 7.8 * bar)));
    if (hype >= 5.5 * bar && hype >= leagueBest) {
      awards.push("리그MVP");
      /* 리그격만큼 가중해서 따로 쌓아요. 빅클럽에서 받은 상이 더 값어치를 갖습니다.
       * 안 그러면 안전하게 1부에 머문 커리어가 명예의 전당에서 앞서요.
       *
       * 가중 카운터가 없던 옛 세이브는 그동안 받은 상을 1부 기준(×1)으로 세고 이어붙여요.
       * 로드할 때 마이그레이션하는 게 아니라, 새 상을 받는 이 순간에만 이어붙입니다 —
       * 0에서 시작하면 새 상 하나 때문에 지난 상이 통째로 사라져요. */
      S.career.daesangW = (S.career.daesangW != null ? S.career.daesangW : S.career.daesang) + leagueOf(S).prestige;
      S.career.daesang += 1;
    }
    /* 베스트11은(는) 리그MVP과(와) 별개로 판정해요.
     * 예전에는 else if라서 리그MVP을(를) 받으면 베스트11을(를) 아예 못 받았어요.
     * 가장 잘한 시즌이 오히려 상을 덜 받는 역전이 났습니다. */
    if (hype >= 4.5 * bar) {
      const posBar = rand(4.2 * bar, 6.2 * bar);
      // 베스트11도 같은 방식으로 리그격만큼 가중해요 (바로 위 리그MVP 주석 참고).
      if (hype >= posBar) { awards.push("베스트11"); S.career.bonsangW = (S.career.bonsangW != null ? S.career.bonsangW : S.career.bonsang) + leagueOf(S).prestige; S.career.bonsang += 1; }
    }
    /* ⚽ 축구 전용 부문상 — 포지션마다 노릴 트로피가 하나씩 생겨요.
     * 문턱은 12경기 시즌의 실측 생산량으로 잡았어요 (능력치 100·평점 6.5 기준):
     *   공격수 골 60.6 · 미드필더 도움 53.8 · 수비수 수비 132.1 · 윙어 공격P 91.8 (38경기)
     * 좋은 시즌이면 닿고 평범하면 안 닿는 자리예요. bar를 곱해 리그 경쟁 강도를 반영해요. */
    /* ⚽ 부문상 — **개인 순위 1위**면 받아요.
     *
     * 예전에는 `if (골 >= rand(51,72) * bar)`처럼 랜덤 문턱이었어요. 리그에 몇 골을
     * 넣은 선수가 있는지 게임이 몰라서, 화면에 뜨는 득점 순위와 수상이 서로 모르는
     * 사이가 됩니다 — 이 게임에서 여러 번 반복된 병이에요.
     * 이제 시즌 내내 보던 그 경쟁의 결과가 그대로 상이 돼요.
     *
     * 리그 격은 경쟁자 생산량(raceLam)에 이미 실려 있어요. 하부 리그에서는
     * 상을 쓸어 담지만 값어치(prestige)가 작고, 상위 리그에서는 하나도 어렵습니다 —
     * bar를 따로 곱하면 같은 축을 두 번 거는 셈이라 여기서는 안 씁니다.
     *
     * 옛 세이브에는 race가 없어요(시즌 중에 갱신됐을 수 있어요). 그때는
     * 부문상을 건너뜁니다 — 없는 경쟁을 이겼다고 할 수는 없어요. */
    if (Array.isArray(act.race) && act.race.length) {
      if (raceTop("g")) awards.push("골든부츠");
      if (raceTop("a")) awards.push("플레이메이커");
      if (raceTop("d")) awards.push("철벽상");
      if (raceTop("p")) awards.push("공격포인트왕");
    }
    /* 🏅 발롱도르 — 리그 최고를 넘어 세계 최고예요.
     * 리그MVP를 받은 시즌 중에서도, 리그격(prestige)을 곱한 값이 문턱을 넘어야 해요.
     * 하부 리그에서 아무리 잘해도 안 되고, 빅클럽에서 압도해야 닿습니다. */
    if (awards.includes("리그MVP") && hype * leagueOf(S).prestige >= rand(9, 13)) {
      awards.push("발롱도르");
      S.career.ballon = (S.career.ballon || 0) + 1;
    }
    /* 🔺🔻 팀 승강제 — 수상까지 끝난 뒤에 판정해요 (수상은 그 시즌 리그 기준이라야 맞아요).
     * ⚠️ applyPromotion이 S.league을 바꿔요. 시즌 기록에는 **치른 리그**를 남겨야
     * 지난 시즌 화면이 새 리그로 바뀌지 않아요 — 이적 표시에서 겪은 것과 같은 함정이에요. */
    const leaguePlayed = S.league;
    const move = applyPromotion();
    if (move && window.Stats) {
      Stats.log("promo", { y: S.proYear, kind: move.kind, from: leaguePlayed, to: S.league });
    }
    if (move) {
      proLog(move.kind === "title" ? `🏆 ${move.from} 우승!! 리그 정상에 섰어요`
        : move.kind === "up" ? `🔺 리그 우승! ${move.from} → ${move.to} 승격!!`
        : `🔻 최하위… ${move.from} → ${move.to} 강등`);
      if (move.kind === "title" && window.Fx) Fx.celebrate("champion", `🏆 ${move.from} 우승!`);
    }
    S.career.sales += sales;
    const gg = act.goals || 0, ga = act.assists || 0, gd = act.defense || 0, apps = act.apps || 0;
    S.career.goals = (S.career.goals || 0) + gg;
    S.career.assists = (S.career.assists || 0) + ga;
    S.career.defense = (S.career.defense || 0) + gd;
    S.career.apps = (S.career.apps || 0) + apps;
    S.career.teamW = (S.career.teamW || 0) + (act.teamW || 0);
    S.career.teamD = (S.career.teamD || 0) + (act.teamD || 0);
    S.career.teamL = (S.career.teamL || 0) + (act.teamL || 0);
    /* 수상은 하나씩 띄워요. 한 번에 합쳐 부르면 연출이 겹쳐서 뭘 받았는지 안 보여요
     * — ⚾ 더 드래프트에서 2.11.2에 같은 문제를 고쳤습니다. */
    if (awards.length && window.Fx) {
      awards.forEach((a, i) => setTimeout(() => Fx.celebrate("award", `🎖️ ${a}!`), i * 1700));
    }
    /* club·league — 그 시즌에 뛴 소속을 결산 시점에 그냥 적어요. 여기 적힌 값이 정본이에요.
     * 이 필드가 생기기 전에 쌓인 옛 항목에는 club이 없어요. 그건 읽는 쪽(fillClubs)이
     * S.moves에서 역산해 메워요 — 세이브는 고치지 않아요(클라우드 동기화와 부딪혀요). */
    // 평균 평점 — 골·도움만으로는 안 드러나는 '꾸준함'을 보여줘요
    const avgRating = apps ? Math.round(((act.ratingSum || 0) / apps) * 10) / 10 : null;
    S.career.years.push({ y: S.proYear, hype: Math.round(hype * 10) / 10, wins, sales, dFan, awards, goals: gg, assists: ga, defense: gd, apps, avg: avgRating, club: S.group, league: leaguePlayed, promo: move ? move.kind : null, promoTo: move ? move.to : null });
    /* 리그·나라·순위를 함께 남겨요. 나라별 리그를 11개 만들어 놓고 **어느 리그에서
     * 몇 시즌을 뛰는지** 데이터가 없었어요 — "새 리그가 실제로 쓰이나"를 물을 수가
     * 없었습니다. 지금은 시뮬레이션으로만 판단하고 있어요. */
    if (window.Stats) Stats.log("year_end", {
      y: S.proYear, wins, sales, goals: gg, assists: ga,
      lg: leaguePlayed, ctry: leagueOf({ league: leaguePlayed }).country,
      rank: tableReady() ? myTableRank() : null, hype: Math.round(hype * 10) / 10,
    });
    for (const d of STAT_DEFS) {
      if (S.proYear <= 3) S.stats[d.key] = clamp(S.stats[d.key] + rand(0, 1) * S.talents[d.key], 0, statCap(d.key));
      else if (S.proYear >= 8) S.stats[d.key] = clamp(S.stats[d.key] - rand(0.6, 1.8), 0, statCap(d.key));
    }
    const income = sales * 3 + wins * 40;
    S.money = (S.money || 0) + income;
    S.activity = null;
    S.pendingShow = false;
    save();
    // 결산이 끝난 뒤에 올려요. save()보다 먼저 부르면 collect()가 **지난 시즌** 상태를
    // 담아 올리고 dirty=0 · 새 도장까지 찍어요. 바로 뒤 save()가 dirty를 다시 세워도
    // 방금 켜진 2분 잠금에 막혀서, 다른 기기는 한 시즌 전 상태를 받게 돼요.
    if (window.Cloud) Cloud.mark();
    yearReport();
  }

  /* 🔁 이적 이력 한 줄. S.moves를 읽는 유일한 곳이에요 — 안 읽으면 옮겨 다닌 커리어가
   * 결산에도 은퇴식에도 안 남아서, 이적이 그냥 숫자만 바꾸는 버튼이 돼요.
   * 리그를 옮긴 이적은 어느 리그로 갔는지도 붙여요. 같은 "A→B"라도 국내 이동과
   * 빅클럽행은 전혀 다른 사건이라서요. */
  function moveLog(st) {
    const mv = (st && st.moves) || [];
    if (!mv.length) return "";
    return mv.map((m) => {
      const to = LEAGUES.find((l) => l.id === m.toLg);
      const tag = (to && m.fromLg !== m.toLg) ? `(${to.name})` : "";
      return `${m.y}시즌 ${m.from}→${m.to}${tag}`;
    }).join(" · ");
  }

  /* 연도별 표의 소속 칸 — ⚾ 더 드래프트(beta/rookie/game.js의 shortTeam)와 같은 방식으로
   * 칸이 좁으니 이름을 줄여요. 다만 이 게임 클럽명은 "FC 노바"·"AC 리베라"처럼 약칭이
   * 앞에 붙기도 해서, 첫 낱말만 자르는 rookie 방식 그대로 쓰면 "FC"만 남아 못 알아봐요.
   * 그래서 FC·AC 토큰은 건너뛰고 의미 있는 낱말을 4자로 잘라요. CLUBS 전체를 확인해서
   * 이 자르기로 같은 리그 안 클럽끼리 겹치지 않는 걸 미리 확인했어요. */
  function shortClub(name) {
    if (!name) return "-";
    const parts = String(name).split(" ").filter((p) => p !== "FC" && p !== "AC");
    return (parts[0] || name).slice(0, 4);
  }

  /* 시즌 y에 뛴 소속을 S.moves에서 역산해요.
   *
   * moveToClub이 **시즌 S.proYear가 끝난 오프시즌**에 { y: S.proYear, from, to, … }를
   * 쌓아요. 축구에는 시즌 중 이적이 없어요(설계에서 뺐어요). 그래서 시즌 y의 소속은
   *   ① move.y < y인 **마지막** 이적의 to (리그는 toLg)
   *   ② 그런 이적이 없으면 **첫 이적의 from** (리그는 fromLg) — y 이후에만 옮겼다는 뜻
   *   ③ S.moves가 비어 있으면 지금 소속(st.group / st.league) — 한 번도 안 옮긴 커리어
   * 예요. 근거가 아무것도 없으면(이적 이력도 없고 group도 없는 깨진 세이브) null을
   * 돌려주고, 그 칸만 '-'로 남아요.
   *
   * 옛 세이브도 이 방식이면 표가 채워져요. club을 결산 때 적기 시작한 건 최근이라,
   * 진행 중인 커리어는 그 전 시즌 기록에 club이 없어서 여섯 줄이 전부 '-'였어요. */
  function clubOfYear(y, st) {
    const mv = ((st && st.moves) || []).filter((m) => m && m.y != null && m.to != null);
    let last = null;
    for (const m of mv) if (m.y < y && (!last || m.y >= last.y)) last = m;
    if (last) return { club: last.to, league: last.toLg };
    let first = null;
    for (const m of mv) if (m.from != null && (!first || m.y < first.y)) first = m;
    if (first) return { club: first.from, league: first.fromLg };
    const g = st && st.group;
    return { club: g != null ? g : null, league: st && st.league };
  }

  /* 표를 그릴 때만 쓰는 사본이에요 — S.career.years를 다시 쓰지 않아요(마이그레이션 아님).
   * club이 적혀 있으면 그게 정본이라 손대지 않고, 빈 항목만 역산으로 메워요. */
  function fillClubs(years, st) {
    return (years || []).map((x) => {
      if (!x || x.club != null) return x;
      const g = clubOfYear(x.y, st);
      if (g.club == null) return x;   // 메울 근거가 없어요 — clubCell이 '-'로 그려요
      return Object.assign({}, x, { club: g.club, league: x.league != null ? x.league : g.league });
    });
  }

  /* 시즌 표의 소속 칸 하나. x.club은 결산 시점에 적힌 값이거나 fillClubs가 역산해 채운
   * 값이에요 — 둘 다 없으면(근거 없는 깨진 세이브) '-'로 그려요(던지지 않아요).
   * 리그가 바뀐 시즌은 리그도 짧게 붙여요(LEAGUES[].short) — 같은 리그 안 이적과
   * 리그를 옮긴 이적은 전혀 다른 사건이라서요. */
  function clubCell(x, prev) {
    if (x.club == null) return `<td>-</td>`;
    const hasPrev = !!prev && prev.club != null;
    const movedClub = hasPrev && prev.club !== x.club;
    const movedLeague = hasPrev && prev.league !== x.league;
    const lg = LEAGUES.find((l) => l.id === x.league);
    const lgTag = movedLeague && lg ? `<span class="yr-lg">${lg.short}</span>` : "";
    return `<td class="yr-club${movedClub ? " moved" : ""}" title="${x.club}">${shortClub(x.club)}${lgTag}</td>`;
  }

  /* 시즌 표의 성적 칸 하나 — ⚾ 더 드래프트(beta/rookie/career.js:1023, 시즌·나이·성적·WAR)와
   * 같은 방식으로 여러 지표를 한 칸에 합쳐요. 폭 28~34px에 이모지 헤더(🅰️도움·🛡️수비)를
   * 얹었더니 실기기에서 헤더가 세로로 쪼개졌어요(도/움, 수/비) — 칼럼을 7개에서 4개로
   * 줄이고 골·도움·수비를 이 칸 하나로 합쳐서 없애요. 출전은 항상 12라 표에서 뺐어요 —
   * 결산 카드 상단 줄(draft-team)과 통산 요약(draft-summary)에 이미 나와 있어서 안 사라져요. */
  function statCell(x) {
    const g = x.goals != null ? x.goals : "-";
    const a = x.assists != null ? x.assists : "-";
    const d = x.defense != null ? x.defense : "-";
    // 평균 평점 — 골·도움만으로는 안 드러나는 꾸준함이 보여요. 옛 기록에는 없어서 "-"로 둡니다.
    return `<td class="yr-stat">${g}골 ${a}도움 ${d}수비</td><td class="yr-avg">${x.avg != null ? x.avg.toFixed(1) : "-"}</td>`;
  }

  /* 그 시즌이 어땠는지 한마디. **리그 안 기준**이에요.
   *
   * inLeague = hype - K·ln(리그 격) — 리그 격이 곱해지기 전의 값이에요.
   * K리그1(격 1.00)에서는 hype와 같아서, 그때 잡아 둔 문턱이 그대로 살아 있어요.
   *   5년차 실측(K리그1): 능력치 50→3.8 · 70→5.3 · 90→6.4 · 110→7.4 · 130→7.9
   *
   * 수상 개수도 봐요. 상을 셋 넘게 받은 시즌이 "아쉽다"고 뜨면 화면이 자기모순이에요. */
  function seasonTitle(y) {
    const lg = leagueOf({ league: y.league || S.league });
    const inLeague = (y.hype || 0) - AXIS_K * Math.log(lg.prestige || 1);
    const awards = (y.awards || []).length;
    if (inLeague >= 7.6 || awards >= 4) return "리그를 지배한 시즌!";
    if (inLeague >= 6.0 || awards >= 2) return "제 몫을 해낸 시즌";
    if (inLeague >= 3.5 || awards >= 1) return "아쉬움이 남는 시즌";
    return "혹독한 시즌…";
  }

  function yearReport() {
    const y = S.career.years[S.career.years.length - 1];
    // 그릴 때만 소속을 메운 사본을 써요 — 세이브(S.career.years)는 그대로 둬요.
    const slice = fillClubs(S.career.years.slice(-8), S);
    const rows = slice.map((x, i) =>
      `<tr><td>${x.y}시즌</td>${clubCell(x, slice[i - 1])}${statCell(x)}<td>${x.awards.length ? "🏆" + x.awards.join(",") : "-"}</td></tr>`
    ).join("");
    const forcedRetire = S.proYear >= 10;
    const cr = S.career;
    $("career-title").textContent = `📊 ${y.y}시즌 결산`;
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚽</div>
      <div class="draft-title">${
        /* ⚠️ 시즌 문구는 **그 리그 안에서 얼마나 잘했나**로 봐요.
         *
         * 예전에는 hype를 그대로 썼는데, hype는 명예의 전당 가치라 리그 격이
         * 곱해져 있어요. 그래서 K리그3에서 "리그를 지배한 시즌"을 보려면 299골이
         * 필요했습니다(프리미어리그는 69골). 실제로 75골 16도움에 신인왕·리그MVP·
         * 베스트11·골든부츠·공격포인트왕 5관왕인데 "아쉬움이 남는 시즌"이 떴어요 —
         * 수상 문턱은 bar로 리그 안 기준인데 문구만 절대 기준이라 생긴 모순이에요.
         *
         * 리그 격을 도로 나눠서(= K·ln(prestige)를 빼서) 리그 안 눈금으로 되돌려요.
         * 문턱은 K리그1(prestige 1.00) 기준이라 그때 값이 그대로 유지됩니다.
         * 수상도 함께 봐요 — 상을 쓸어 담은 시즌이 "아쉽다"고 뜨면 안 돼요. */
        seasonTitle(y)
      }</div>
      <div class="draft-team">${leagueOf({ league: y.league || S.league }).flag} ${y.club || S.group} · ${leagueOf({ league: y.league || S.league }).name} · 전력 ${clubStrOf(S)} · ${y.apps || 0}경기 ⚽${y.goals || 0}골 🅰️${y.assists || 0}도움 🛡️${y.defense || 0} · MOM ${y.wins}회${y.avg != null ? ` · 평균 평점 ${y.avg.toFixed(1)}` : ""}</div>
      ${y.promo ? `<div class="hint">${
        y.promo === "title" ? `🏆 <b>${y.promoTo} 우승!</b> 리그 정상에 섰어요`
        : y.promo === "up" ? `🔺 <b>리그 우승!</b> ${(y.y || 0) + 1}시즌부터 <b>${y.promoTo}</b>에서 뜁니다`
        : `🔻 최하위로 강등… ${(y.y || 0) + 1}시즌부터 <b>${y.promoTo}</b>에서 다시 시작해요`}</div>` : ""}
      ${y.club && y.club !== S.group ? `<div class="hint">🔁 <b>${S.group}</b>로 이적했어요 — ${(y.y || 0) + 1}시즌부터 새 팀에서 뜁니다</div>` : ""}
      <table class="season-table season-soccer"><thead><tr><th>시즌</th><th>소속</th><th>성적</th><th>평점</th><th>수상</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="draft-summary">
        통산 ${cr.years.length}시즌 · 출전 ${cr.apps || 0} · ⚽ ${cr.goals || 0}골 · 🅰️ ${cr.assists || 0}도움 · 🛡️ ${cr.defense || 0} · 🏅 MOM ${cr.wins}회<br/>
        🏆 MVP ${cr.daesang} · 베스트11 ${cr.bonsang}${cr.rookie ? " · 신인왕" : ""} · ⭐ 명성 ${Math.round(S.fandom)}<br/>
        ${forcedRetire ? "슬슬 은퇴를 고민할 나이가 됐어요. 아름다운 마무리를…" : "다음 시즌도 계속 뛸 수 있어요!"}
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    if (!forcedRetire) {
      const next = document.createElement("button");
      next.className = "btn btn-primary";
      next.textContent = `⚽ ${S.proYear + 1}시즌 시작`;
      next.onclick = startPrep;
      act.appendChild(next);
      /* 💼 이적은 오프시즌에만 열려요. 마지막 시즌(강제 은퇴)에는 갈 다음 시즌이
       * 없으니 안 띄우고, 한 오프시즌에 두 번 옮기지도 못하게 막아요. */
      if (canTransfer(S)) {
        const tf = document.createElement("button");
        tf.id = "btn-transfer";
        tf.className = "btn btn-ghost";
        tf.textContent = "💼 이적 제안 보기";
        tf.onclick = renderTransfer;
        act.appendChild(tf);
      }
    }
    const ret = document.createElement("button");
    ret.className = "btn btn-ghost";
    ret.textContent = "🎓 은퇴하기";
    ret.onclick = () => {
      if (!confirm(
        `🎓 여기서 커리어를 마칠까요?\n\n` +
        `· 명예의 전당에 기록이 남아요\n` + retireSummary() +
        `· 등급: ${gradeOfScore(careerScore())}\n\n` +
        `⚠️ 되돌릴 수 없어요.\n\n진행할까요?`
      )) return;
      enshrine();
    };
    act.appendChild(ret);
    if (window.Ads) window.Ads.display($("ad-career"));
    show("screen-career");
  }

  // ---------- 💼 이적 ----------
  /* 오프시즌(시즌 결산)에서만 열려요. 축이 둘인데 서로 겹치지 않아요.
   *
   *  · 같은 리그 이적 — 클럽 전력이 동료 득점·실점에 작용해요. 우승과 팀 성적의 축이에요.
   *  · 상위 리그 이적 — 평점 페널티와 수상 가치가 움직여요. 개인 커리어의 축이에요.
   *
   * 실측으로 갈라진 값이에요. 전력을 50에서 90으로 올리면 팀 승률이 12~29%p 오르는데
   * 리그MVP 확률은 1.3%p 안에서만 움직여요. 리그를 올리면 정반대예요.
   * 그래서 카드에 평점 페널티와 수상 가치를 숫자로 적어요 — 이게 도박의 크기라
   * 감추면 "왜 갑자기 무너졌는지" 모르는 채로 올라가게 돼요. */
  const TRANSFER_MIN_YEAR = 2;               // 같은 리그 이적도 2년차부터 열려요

  /* 승격 문턱 — "그 리그의 제안이 오는 직전 시즌 hype"예요. 키는 리그 id고,
   * 순서는 id가 아니라 tier예요 (id는 옛 세이브가 가리키는 값이라 순서와 무관해요).
   *
   * 5단 전부를 덮어요. 하부 리그에 문턱이 없으면 need가 Infinity가 돼서
   * 📹 세미프로로 시작한 선수가 영원히 K리그3에 갇혀요 — 사다리가 통째로 죽습니다.
   * 맨 아래(K리그3)는 위에서 내려오는 길뿐이라 문턱이 쓰일 자리가 없지만,
   * 표에 빠져 있으면 "빠뜨린 건지 없는 건지"가 안 보여서 0으로 적어 둡니다.
   *
   * 값은 감이 아니라 실측이에요. hype는 리그마다 눈금이 달라요 — 축에 prestige를
   * 곱하니 같은 성적이라도 K리그3(0.55)에서는 K리그1보다 1.8쯤 낮게 나옵니다.
   * 그래서 문턱을 '그 리그에서 그 hype를 중앙값으로 내는 능력치'로 환산해서 잡았어요.
   * (5년차·컨디션 80·명성 900 · 포지션 4종 × 400시즌)
   *
   *   K리그3 → K리그2   2.5 — 능력치 51
   *   K리그2 → K리그1   4.5 — 능력치 61
   *   K리그1 → 유로파    5.5 — 능력치 69
   *   유로파 → 챔피언스  6.5 — 능력치 88 (K리그1 눈금 기준)
   *
   * 능력치로 환산하면 51 → 61 → 69 → 88로 단조 증가해요. 하부에서 위로 가는 게
   * K리그1에서 유로파로 가는 것보다 확실히 쉽다는 뜻이고, tests/soccer/promote-test.js가
   * 이 순서를 지킵니다. 위쪽 둘(5.5·6.5)은 이적 작업에서 잡은 값 그대로예요. */
  /* 리그 11개로 늘면서 칸을 촘촘히 나눴어요. tier 순으로 단조 증가해야 하고,
   * 양 끝(한국 3부 0 · 잉글랜드 1부 6.5)은 예전 값 그대로 둡니다 —
   * 사다리 전체의 길이가 안 변해야 지금까지 잡아 둔 곡선이 안 흔들려요. */
  const PROMOTE_HYPE = { 5: 0, 4: 2.5, 1: 4.5, 6: 5.45, 8: 5.6, 7: 5.75, 9: 5.9, 10: 6.05, 2: 6.2, 11: 6.35, 3: 6.5 };
  const OFFERS_PER_LEAGUE = 2;               // 리그마다 제안 수

  /* 계약금 — 리그 격과 클럽 전력에서 뽑아요. 격은 거듭제곱(FEE_PRESTIGE_POW)으로 실어요.
   * 리그를 올리는 이적이 눈에 띄게 큰 돈이어야 "지금 갈까"가 고민이 돼요.
   * 10만 단위로 끊어 읽기 좋게 합니다.
   *
   * 여기에 세 가지를 겁니다. 안 걸면 이적이 그냥 돈줄이 돼요 —
   * 같은 리그 안에서 A↔B를 오가기만 해도 매 오프시즌 계약금이 들어왔어요.
   *
   *  · 리그를 내려가면 계약금이 크게 줄어요. 몸값이 떨어지는 일이니까요.
   *  · 한 번 떠난 클럽으로 돌아갈 땐 계약금이 없어요. 왕복으로 두 번 받는 길을 막습니다.
   *  · 이적을 거듭할수록 줄어요. 매년 새 클럽으로 갈아타는 무한 급전도 막아야 해요.
   *
   * 이 셋이 다 있어야 막혀요. 돌아가는 이적만 0으로 하면 6개 클럽을 한 바퀴 도는
   * 우회로가 남고, 감가만 걸면 왕복이 여전히 조금씩 벌어요. */
  const DOWNGRADE_FEE = 0.3;   // 리그를 한 단계 내려갈 때마다 곱해요
  /* 낙폭에 상한을 둬요. 리그가 5개에서 11개로 늘면서 tier 차가 최대 10이 됐고,
   * 0.3^10은 0.0000059라 계약금이 통째로 0원이 됩니다("계약금 없음"으로 찍혀요).
   * 한 단계 0.3은 그대로 두되(하향 이적은 확실히 손해여야 해요), 세 단계에서 멈춰요 —
   * 0.3^3 = 0.027이면 이미 충분히 아프고, 그 아래는 0과 구별이 안 돼요. */
  const DOWNGRADE_MAX = 3;
  const LOYALTY_FEE = 0.75;    // 지금까지 한 이적 횟수만큼 거듭제곱으로 곱해요

  /* 리그격을 몇 제곱으로 실을지예요. 원래 세제곱이었는데 제곱으로 낮췄어요.
   *
   * 5단 사다리를 만들며 챔피언스리그의 prestige가 1.80 → 2.40으로 올랐어요.
   * 계약금이 prestige의 세제곱이라 그것만으로 최상위 계약금이 2.37배가 됐습니다.
   * 실측(K리그3 시작 · 사다리 끝까지 오르는 정책 · 12시즌 8판):
   *   · 뛰어서 버는 돈은 12시즌에 1.5억쯤이에요 (K리그1 붙박이 기준).
   *   · 그런데 챔피언스리그 계약금 한 장이 1.4억이 나왔어요 — 버튼 한 번이
   *     커리어 전체를 뛴 것과 맞먹고, 커리어 총수입의 73%가 이적에서 나왔어요.
   *     계약금에 브레이크 셋을 건 이유(이적이 그냥 돈줄이 되면 안 된다)가 무너집니다.
   *
   * 2.40의 제곱(5.76)이 1.80의 세제곱(5.83)과 거의 같아요. 그래서 제곱으로 낮추면
   * K리그1(격 1.00이라 원래 안 변함)과 챔피언스리그가 **둘 다** 예전 크기로 돌아와요.
   * 계수(0.22)를 대신 깎으면 K리그1 이적까지 41%로 쪼그라들어서, 사다리 아래쪽
   * 계약금이 경기 수당 한 판(30만) 수준으로 내려앉습니다.
   * 실측 후: 커리어 총수입 1.22억 · 최대 계약금 7560만. tests/soccer/fee-test.js가 못 박아요. */
  const FEE_BASE = 0.22;         // 클럽 전력의 제곱에 곱해요
  const FEE_PRESTIGE_POW = 2;    // 리그격을 이만큼 거듭제곱해서 실어요

  // 예전에 떠나온 클럽인가요. 이적 기록의 '떠난 곳'으로 봐요.
  const leftBefore = (st, name) => ((st && st.moves) || []).some((m) => m.from === name);

  function transferFee(club, league, st) {
    const state = st || S;
    const moves = (state && state.moves) || [];
    // 한 번 떠난 클럽은 다시 계약금을 주지 않아요. 돌아오는 건 자유지만 공짜예요.
    if (leftBefore(state, club.name)) return 0;
    /* 낙폭은 tier로 봐요. id는 옛 세이브가 가리키는 값이라 순서와 무관해요 —
     * id로 빼면 K리그1(id 1)에서 K리그3(id 5)으로 내려가는 게 drop 0이 돼서
     * 하향 이적인데도 계약금이 한 푼도 안 깎여요. */
    const drop = Math.min(DOWNGRADE_MAX, Math.max(0, leagueOf(state).tier - league.tier));
    /* ⚠️ 나라 특색(🇬🇧 수입 +35%)은 여기 안 겁니다. 계약금은 낙폭·재이적·감가
     * 세 브레이크로 조심스럽게 잡아 둔 자리고, tests/soccer/fee-test.js가
     * "리그격을 정확히 2제곱으로 싣는가"로 폭주를 막고 있어요. 여기에 곱셈을
     * 하나 더 얹으면 그 측정이 2.34제곱으로 읽혀 가드가 흐려집니다.
     * 🇬🇧의 수입 특색은 매 경기 수당에만 붙어요 — 그쪽이 브레이크가 없는 자리예요. */
    const base = club.str * club.str * FEE_BASE * Math.pow(league.prestige, FEE_PRESTIGE_POW);
    return Math.round(
      (base * Math.pow(DOWNGRADE_FEE, drop) * Math.pow(LOYALTY_FEE, moves.length)) / 10
    ) * 10;
  }

  // 계약금이 0이면 "0만"이라고 적지 않아요 — 왜 0인지가 안 보이면 고장으로 읽혀요.
  const feeText = (fee, back) =>
    fee > 0 ? `계약금 ${fmtMoney(fee)}` : `계약금 없음${back ? " (떠났던 클럽)" : ""}`;

  // 직전 시즌 hype. 이번 결산에서 방금 쌓은 값이에요.
  function lastHype(st) {
    const ys = (st && st.career && st.career.years) || [];
    return ys.length ? (ys[ys.length - 1].hype || 0) : 0;
  }
  // 한 오프시즌에 두 번 옮기지는 못해요. 이적 기록의 연차로 봐요.
  const movedThisYear = (st) => ((st && st.moves) || []).some((m) => m.y === st.proYear);
  const canTransfer = (st) => !!st && (st.proYear || 0) >= TRANSFER_MIN_YEAR && !movedThisYear(st);

  /* 갈 수 있는 리그마다 클럽을 OFFERS_PER_LEAGUE개씩 뽑아요.
   * 아래로 내려오는 이적은 언제든 가능해요 — 못 버티고 돌아오는 길을 막으면
   * 도전 자체를 안 하게 돼요. 위로 갈 때만 직전 시즌 hype 문턱을 봐요. */
  function transferOffers(st) {
    const state = st || S;
    if (!canTransfer(state)) return [];
    const cur = leagueOf(state);
    const hype = lastHype(state);
    const list = [];
    for (const lg of LEAGUES) {
      /* 위·아래는 tier로 봐요. id는 옛 세이브가 가리키는 값이라 순서와 무관해요 —
       * id로 비교하면 하부 리그(id 4·5)가 맨 위로 읽혀서 K리그3에서 챔피언스리그 제안이
       * 문턱 없이 쏟아져요. 문턱이 빠진 리그(need == null)는 위로 못 올라가요 —
       * PROMOTE_HYPE는 5단 전부를 덮으니 지금은 걸릴 일이 없지만, 표에서 한 줄이
       * 사라지면 그 리그가 막다른 길이 되는 걸 이 방어선이 조용히 대신 막아 줍니다. */
      const need = PROMOTE_HYPE[lg.id];
      if (lg.tier > cur.tier && hype < (need == null ? Infinity : need)) continue;
      const pool = (CLUBS[lg.id] || []).filter((c) => c.name !== state.group);
      for (const club of shuffle(pool.slice()).slice(0, OFFERS_PER_LEAGUE)) {
        list.push({ club, league: lg, fee: transferFee(club, lg, state), back: leftBefore(state, club.name) });
      }
    }
    return list;
  }

  /* 도박의 크기 — 평점에서 빼는 값과 수상 가치에 곱하는 값이에요.
   *
   * 하부 리그는 페널티가 0이라 숫자만 적으면 "공짜로 갈 수 있는 곳"으로 읽혀요.
   * 실제 대가는 수상 가치(prestige < 1)예요 — 상은 쉽게 받지만 명예의 전당 점수가
   * 작아요. 그래서 위로 가는 카드와 아래로 가는 카드에 각각 한 마디를 붙여 둡니다. */
  const riskText = (lg) => {
    const pen = lg.penalty > 0 ? `평점 -${lg.penalty.toFixed(1)}` : "평점 그대로";
    const note = lg.penalty > 0 ? " · 버티면 값어치가 커요"
      : lg.prestige < 1 ? " · 상은 쉬워도 값어치가 작아요" : "";
    /* 🌍 나라 특색도 카드에 적어요. 안 적으면 "왜 이 리그에 머물지"를 화면에서
     * 알 방법이 없어서, 결국 수상 값어치 하나만 보고 고르게 됩니다. */
    const t = COUNTRY_TRAIT[lg.country];
    const nat = t && t.tag ? ` · ${t.tag}` : "";
    return `${pen} · 수상 가치 ×${lg.prestige.toFixed(2)}${note}${nat}`;
  };

  // 리그는 언제나 tier 순으로 늘어놔요 — 화면이 곧 사다리라야 위아래가 읽혀요.
  const byTier = () => LEAGUES.slice().sort((a, b) => a.tier - b.tier);

  function renderTransfer() {
    const cur = leagueOf(S);
    $("transfer-title").textContent = `💼 이적 제안 — ${S.proYear}시즌 오프시즌`;
    /* 문턱은 '지금보다 위'만 적어요. 5단 전부를 적으면 이미 지나온 리그의 문턱까지
     * 줄줄이 붙어서 정작 다음 칸이 어디인지가 안 보여요. */
    const upper = byTier().filter((l) => l.tier > cur.tier && PROMOTE_HYPE[l.id] != null);
    const gate = upper.map((l) => `${l.name} ${PROMOTE_HYPE[l.id]}`).join(" · ");
    const gateLine = upper.length
      ? `직전 시즌 평가 <b>${lastHype(S).toFixed(1)}</b> — 위 리그 제안은 평가가 이만큼 돼야 와요 (${gate}).`
      : `직전 시즌 평가 <b>${lastHype(S).toFixed(1)}</b> — 여기가 사다리의 꼭대기예요. 더 올라갈 리그는 없어요.`;
    $("transfer-now").innerHTML =
      `지금은 <b>${cur.flag} ${S.group}</b> (${cur.name} · 전력 ${clubStrOf(S)}) 소속이에요.<br/>`
      + `${gateLine}<br/>`
      + `아래 리그로 내려가는 이적은 언제든 할 수 있어요 — 대신 계약금이 크게 줄어요.<br/>`
      + `한 번 떠난 클럽으로 돌아갈 땐 계약금이 없고, 이적을 거듭할수록 계약금이 깎여요.`;
    const box = $("transfer-list");
    box.innerHTML = "";
    const offers = transferOffers(S);
    if (!offers.length) {
      box.innerHTML = `<p class="hint">올해는 들어온 제안이 없어요.</p>`;
    }
    /* 리그 묶음은 tier 순으로 그려요 — 아래 리그도 위 리그와 똑같은 형식이라
     * 사다리 한 칸씩 오르내리는 게 화면에서 그대로 보여야 해요. */
    for (const lg of byTier()) {
      const mine = offers.filter((o) => o.league.id === lg.id);
      if (!mine.length) continue;
      const group = document.createElement("div");
      // 위·아래 표시도 tier로 봐요 — transferOffers와 같은 기준이어야 해요.
      const dir = lg.tier > cur.tier ? "up" : lg.tier < cur.tier ? "down" : "same";
      group.className = `tf-group ${dir}`;
      group.dataset.league = String(lg.id);
      group.dataset.tier = String(lg.tier);
      const head = document.createElement("div");
      head.className = "tf-head";
      const arrow = dir === "up" ? "▲ 위 리그" : dir === "down" ? "▼ 아래 리그" : "지금 리그";
      head.innerHTML = `<span class="tf-lg">${lg.flag} ${lg.name} <small>${arrow}</small></span><span class="tf-risk">${riskText(lg)}</span>`;
      group.appendChild(head);
      for (const o of mine) {
        const card = document.createElement("button");
        card.className = `tf-card ${dir}`;
        card.dataset.club = o.club.name;
        card.dataset.league = String(lg.id);
        card.dataset.tier = String(lg.tier);
        card.dataset.fee = String(o.fee);
        /* 카드마다 리그 이름·페널티·수상 가치를 다시 적어요. 헤더에만 있으면
         * 스크롤하다 카드만 보고 누르는 사람에게는 안 보여요. 리그가 5개로 늘어난 뒤로는
         * "이 카드가 어느 리그 것인지"부터 안 보이는 게 제일 위험해요. */
        card.innerHTML = `
          <span class="tf-top"><span class="tf-name">${o.club.name}</span><span class="tf-str">전력 ${o.club.str}</span></span>
          <span class="tf-sub"><span class="tf-lg">${lg.flag} ${lg.name}</span><span class="tf-fee">${feeText(o.fee, o.back)}</span></span>
          <span class="tf-sub"><span class="tf-risk">${riskText(lg)}</span></span>`;
        card.onclick = () => acceptOffer(o);
        group.appendChild(card);
      }
      box.appendChild(group);
    }
    show("screen-transfer");
  }

  /* 소속을 바꾸고 이적 기록을 남겨요. 리그·전력이 함께 바뀌어야
   * 다음 시즌 상대(oppClubs)와 동료 득점·실점이 새 클럽 기준으로 굴러가요. */
  function moveToClub(club, league, bonus) {
    const from = S.group;
    const prevLeague = S.league || 1;
    const prevBack = leftBefore(S, club.name);   // 기록을 쌓기 전에 봐요
    S.group = club.name;
    S.clubStr = club.str;
    S.league = league.id;
    S.leagueSince = S.proYear;               // 이적으로 리그가 바뀌어도 정착 기간을 새로 세요
    S.money = (S.money || 0) + (bonus || 0);
    if (!Array.isArray(S.moves)) S.moves = [];
    S.moves.push({ y: S.proYear, from, to: club.name, fromLg: prevLeague, toLg: league.id });
    proLog(`💼 ${from} → ${club.name} 이적! (${league.name} · ${feeText(bonus || 0, prevBack)})`);
    if (window.Stats) Stats.log("transfer", { y: S.proYear, from, to: club.name, fromLg: prevLeague, toLg: league.id });
    save();
  }

  function acceptOffer(o) {
    moveToClub(o.club, o.league, o.fee);
    if (window.Fx) Fx.celebrate("award", `💼 ${o.club.name} 이적!`);
    yearReport();   // 결산으로 돌아가요 — 새 소속으로 다시 그려져요
  }

  // ---------- 명예의 전당 ----------
  function gradeOfScore(sc) {
    if (sc >= 850) return "🐐 축구 역사에 남을 레전드";
    if (sc >= 600) return "👑 명예의 전당 헌액";
    if (sc >= 400) return "🌟 월드클래스";
    if (sc >= 220) return "💪 리그 정상급";
    if (sc >= 90) return "🧢 꾸준한 주전";
    return "🌱 짧지만 빛났던 커리어";
  }

  function careerScore() {
    const c = S.career || { seasons: [], mvp: 0, gg: 0, roy: 0, rings: 0, warSum: 0 };
    /* daesangW가 없는 옛 세이브는 가중 없이 계산해요. 마이그레이션하지 않습니다.
     * 1부만 뛴 커리어는 prestige가 1이라 두 경로의 값이 같아요 — 점수가 안 변합니다. */
    const dae = c.daesangW != null ? c.daesangW : (c.daesang || 0);
    const bon = c.bonsangW != null ? c.bonsangW : (c.bonsang || 0);
    // 🏅 발롱도르는 리그MVP 위의 상이라 점수도 그만큼 큽니다
    return Math.round(
      S.fandom * 0.5 + c.wins * 6 + dae * 50 + bon * 15 + c.rookie * 20 + (c.ballon || 0) * 80 +
      (c.years ? c.years.length : 0) * 5 + (S.trophies ? S.trophies.length : 0) * 8 + (S.center ? 30 : 0) +
      transTotal() * 25   // ✨ 초월 단계 보너스
    );
  }

  // ---------- 🧬 환생 ----------
  // 은퇴(명예의 전당 등록)와 달리, 기록은 남기지 않고 유산만 다음 세대에 넘겨요.
  /* 🧬 환생 자격 — 아래 중 하나라도 이루면 열려요.
   * 은퇴는 언제나 가능하니 못 채워도 커리어가 막히지는 않아요.
   * 초월은 시간이 아니라 투자를 요구해서(스탯 상한 + 판정 통과) 1단계로 둬요. */
  const REBIRTH_NEED = { win: 3, top: 3, trans: 1 };
  function rebirthReady() {
    const c = S.career || {};
    return (c.wins || 0) >= REBIRTH_NEED.win
      || (c.daesang || 0) >= REBIRTH_NEED.top
      || transTotal() >= REBIRTH_NEED.trans;
  }
  function rebirthHint() {
    const c = S.career || {};
    return `🏆 우승 ${c.wins || 0}/${REBIRTH_NEED.win} · 🎖️ 대상 ${c.daesang || 0}/${REBIRTH_NEED.top} · 🌠 초월 ${transTotal()}/${REBIRTH_NEED.trans} — 하나만 채우면 열려요`;
  }

  function rebirth(team) {
    if (!rebirthReady()) {
      alert(`🧬 아직 환생할 수 없어요.\n\n${rebirthHint()}\n\n기록을 남기고 끝내려면 '은퇴'를 선택하세요.`);
      return;
    }
    const sc = careerScore();
    const gain = legacyGain(sc);
    const L = loadLegacy();
    const nextPts = L.pts + gain, nextGen = L.gen + 1;
    const before = legacyTalentBonus(L.pts), after = legacyTalentBonus(nextPts);
    if (!confirm(
      `🧬 여기서 커리어를 마치고 다음 세대에 물려줄까요?\n\n` +
      `· 유산 +${gain} (누적 ${nextPts})\n` +
      `· 다음 세대 시작 재능 +${before.toFixed(2)} → +${after.toFixed(2)}\n` +
      `· 시작 자금 ${fmtMoney(legacyMoneyBonus(nextPts))}\n` +
      `· ${nextGen + 1}세로 새로 시작해요\n\n` +
      `⚠️ 명예의 전당에는 남지 않아요. 기록을 남기려면 '은퇴'를 선택하세요.\n\n진행할까요?`
    )) return;
    saveLegacy({ pts: nextPts, gen: nextGen });
    if (window.Stats) Stats.log("rebirth", { gen: nextGen, pts: nextPts, score: sc });
    clearSave();
    if (window.Cloud) Cloud.mark();
    alert(
      `🧬 ${S.name}의 커리어가 막을 내렸어요.\n\n` +
      `유산 ${gain}을 남겨 누적 ${nextPts}이 됐습니다.\n` +
      `이제 ${nextGen + 1}세가 더 높은 재능으로 출발해요!`
    );
    // 전송이 끝나야 '올렸음' 도장이 찍혀요. 안 기다리고 새로고침하면 keepalive 덕에
    // 요청은 살아남아도 도장은 안 찍혀서, 혼자 쓰는 기기인데도 다음 실행에 충돌 화면이
    // 떠요. settle()은 상한이 있어 네트워크가 느려도 오래 붙잡지 않아요.
    if (window.Cloud && window.Cloud.settle) Cloud.settle().then(() => location.reload());
    else location.reload();
  }

  /* 🎓 은퇴 확인창에 넣을 요약. 되돌릴 수 없는 선택이라 뭐가 남는지 보여줘요. */
  function retireSummary() {
    const c = S.career || {};
    const awards = [
      (c.wins || 0) ? `🏆우승 ${c.wins}` : "",
      (c.daesang || 0) ? `🎖️대상 ${c.daesang}` : "",
      (c.bonsang || 0) ? `🏅본상 ${c.bonsang}` : "",
      (c.rookie || 0) ? "🌟신인상" : "",
    ].filter(Boolean).join(" · ");
    const years = (c.years || []).length;
    const moves = moveLog(S);
    return `    ${S.name} · ${years}년차\n`
      + (awards ? `    ${awards}\n` : "    수상 기록 없음\n")
      + (moves ? `    🔁 이적 ${(S.moves || []).length}회 — ${moves}\n` : "");
  }

  function enshrine() {
    const c = S.career || { years: [], wins: 0, daesang: 0, bonsang: 0, rookie: 0 };
    const score = careerScore();
    const moves = moveLog(S);   // S를 비우기 전에 뽑아 둬요
    const entry = {
      id: "w" + Date.now(),
      game: "soccer",
      name: S.name,
      pos: S.pos,
      team: S.group || marketOf().name,
      seasons: c.years ? c.years.length : 0,
      wins: c.wins, daesang: c.daesang, bonsang: c.bonsang, rookie: c.rookie,
      goals: (c.goals || 0) + ((S.youth && S.youth.g) || 0),
      assists: (c.assists || 0) + ((S.youth && S.youth.a) || 0),
      apps: (c.apps || 0) + (S.stages || 0),
      finalOvr: Math.round(overall()),
      trans: transTotal(),
      gen: loadLegacy().gen + 1,
      score,
      grade: gradeOfScore(score) + (transTotal() ? ` · ${transcendTitle(transTotal())}` : ""),
    };
    const hof = loadHof();
    hof.push(entry);
    saveHof(hof);
    if (window.Match) window.Match.submitHof("soccer", entry);
    if (window.Stats) Stats.log("retire", {
      years: entry.seasons, wins: entry.wins, score: entry.score,
      // "어디까지 갔나" 분포를 보려면 마지막 리그와 트로피 수가 있어야 해요
      lg: S.league, ctry: leagueOf(S).country, trophies: (S.trophies || []).length, pos: S.pos,
    });
    clearSave();
    if (window.Cloud) Cloud.mark();

    $("career-title").textContent = "🏛️ 은퇴식";
    $("career-card").innerHTML = `
      <div class="draft-emoji">⚽</div>
      <div class="draft-title">${entry.name}, 그라운드와 작별</div>
      <div class="draft-team">${entry.grade}</div>
      <div>${entry.seasons ? `${entry.team}에서 ${entry.seasons}시즌을 뛰었어요.` : "프로 무대 대신 다른 길을 택했어요."}</div>
      ${moves ? `<div class="hint move-log">🔁 이적 이력 — ${moves}</div>` : ""}
      <div class="draft-summary">
        통산 ${entry.apps}경기 ⚽ ${entry.goals}골 · 🅰️ ${entry.assists}도움<br/>
        🏅 MOM ${entry.wins}회 · 🏆 MVP ${entry.daesang} · 베스트11 ${entry.bonsang}${entry.rookie ? " · 신인왕" : ""}<br/>
        커리어 점수 <b>${entry.score}</b> — 명예의 전당에 영구 기록됐어요
      </div>`;
    const act = $("career-actions");
    act.innerHTML = "";
    const hofBtn = document.createElement("button");
    hofBtn.className = "btn btn-primary";
    hofBtn.textContent = "🏛️ 명예의 전당 보기";
    hofBtn.onclick = showHof;
    act.appendChild(hofBtn);
    S = null;
    const again = document.createElement("button");
    again.className = "btn btn-ghost";
    again.textContent = "🔁 새 선수 키우기";
    again.onclick = () => location.reload();
    act.appendChild(again);
    show("screen-career");
  }

  async function showHof() {
    const box = $("hof-list");
    box.innerHTML = `<p class="hint">불러오는 중…</p>`;
    show("screen-hof");
    if (window.Match) await window.Match.backfillHof();
    const local = loadHof().filter((e) => e.game === "soccer");
    const localIds = new Set(local.map((e) => e.id));
    let list = local, global = false;
    const remote = window.Match ? await window.Match.fetchHof("soccer") : null;
    if (remote && remote.length) {
      global = true;
      const seen = new Set();
      list = [];
      for (const e of [...remote, ...local]) {
        if (!e || seen.has(e.id)) continue;
        seen.add(e.id);
        list.push(e);
      }
    }
    list.sort((a, b) => b.score - a.score);
    hofShown = 20;
    drawHof(list, localIds);
  }

  // 더 보기로 20명씩 늘리고, 내 기록이 목록 밖이면 하단에 고정해서 보여줘요
  let hofShown = 20;
  function drawHof(list, localIds) {
    const box = $("hof-list");
    box.innerHTML = list.length ? "" : `<p class="hint">아직 아무도 없어요. 첫 전설이 되어보세요!</p>`;
    const myIdx = list.findIndex((x) => localIds.has(x.id));
    const view = list.slice(0, hofShown).map((e, i) => ({ e, i }));
    if (myIdx >= hofShown) view.push({ gap: true }, { e: list[myIdx], i: myIdx });
    view.forEach(({ e, i, gap }) => {
      if (gap) { const gp = document.createElement("div"); gp.className = "hof-gap"; gp.textContent = "⋯"; box.appendChild(gp); return; }
      const div = document.createElement("div");
      div.className = "hof-card" + (localIds.has(e.id) ? " me" : "");
      div.innerHTML = `
        <div class="hof-face-emoji">⚽</div>
        <div class="hof-info">
          <div class="hof-name">${i + 1}. ${e.gen > 1 ? `<span class="hof-gen">${e.gen}세</span> ` : ""}${e.name} <span class="hof-grade">${e.grade}</span></div>
          ${e.team} · ${e.seasons}시즌${e.goals != null ? ` · ⚽${e.goals} 🅰️${e.assists || 0}` : ""} · 🏅MOM ${e.wins} · 🏆${e.daesang + e.bonsang} · 점수 ${e.score}
        </div>`;
      box.appendChild(div);
    });
    const left = list.length - Math.min(list.length, hofShown);
    if (left > 0) {
      const more = document.createElement("button");
      more.className = "mini-btn rank-more";
      more.textContent = `▾ 더 보기 (${left}명 남음)`;
      more.onclick = () => { hofShown += 20; drawHof(list, localIds); };
      box.appendChild(more);
    }
  }

  // ---------- 랜덤 매칭 (공용 ../match.js — Supabase 연동) ----------
  const GAME_ID = "soccer";
  const matchEnabled = () => !!(window.Match && window.Match.enabled());
  function submitProfile(f, rating, w, l) {
    if (window.Match) window.Match.submit(GAME_ID, { name: f.name, bp: f.bp, rating, w, l });
  }
  async function fetchRoster() {
    return window.Match ? window.Match.roster(GAME_ID) : null;
  }

  // ---------- 배틀 아레나 (경기 대결) ----------
  const BATTLE_TXT = [
    "전방 압박으로 주도권을 잡아요! 🔥",
    "환상적인 개인기로 수비를 벗겨내요 🏃",
    "날카로운 침투 패스가 이어져요 🎯",
    "골문 앞 혼전, 몸을 사리지 않아요 💪",
    "경기 막판, 극적인 결승골! ⚽",
  ];

  function fighters() {
    const list = [];
    if (S && S.name) {
      const years = S.career && S.career.years ? S.career.years.length : 0;
      list.push({
        id: "cur-" + S.name,
        name: `${S.name} (현역)`,
        bp: Math.round(overall() * 3 + (S.fandom || 0) * 0.15 + years * 8),
      });
    }
    for (const e of loadHof().filter((x) => x.game === "soccer")) {
      list.push({ id: e.id, name: e.name, bp: bpOf(e.score, e.finalOvr) });
    }
    return list;
  }

  let battleReturn = "screen-title";
  function showBattle(returnTo) {
    if (returnTo) battleReturn = returnTo;
    if (!S) {
      const sv = localStorage.getItem(SAVE_KEY);
      if (sv) S = JSON.parse(sv);
    }
    const list = fighters();
    const setup = $("battle-setup");
    if (!list.length) {
      setup.innerHTML = `<p class="hint">대결할 선수가 없어요.<br/>먼저 유망주를 키우면 현역이든 은퇴 후든 언제든 참전할 수 있어요!</p>`;
    } else {
      setup.innerHTML = `
        <div class="battle-row">
          <label>내 선수</label>
          <select id="battle-me">${list.map((f, i) => `<option value="${i}">${f.name} · 경기력 ${f.bp}</option>`).join("")}</select>
          <button class="btn btn-primary" id="btn-fight">🎲 랜덤 매칭 시작</button>
          <p class="av-note">${matchEnabled() ? "🌍 전 세계 플레이어 풀에서 실력이 비슷한 상대를 찾아요" : "🤖 오프라인 모드 — 매칭 서버 연결 전까진 봇과 매칭돼요"}</p>
        </div>`;
      $("btn-fight").onclick = async () => {
        if (battling) return;
        battling = true;
        const btn = $("btn-fight");
        btn.disabled = true;
        btn.textContent = "🔍 상대 찾는 중…";
        try {
          const me = list[+$("battle-me").value];
          const roster = await fetchRoster();
          let opp;
          const pool = (roster || []).filter((r) => !r.mine);
          if (pool.length) {
            pool.sort((a, b) => Math.abs(a.bp - me.bp) - Math.abs(b.bp - me.bp));
            const o = pick(pool.slice(0, 6));
            opp = { id: "r-" + o.id, name: o.name, bp: o.bp, remote: true };
          } else {
            const g = pick(GHOSTS);
            opp = { ...g, name: `${g.name} (봇)` };
          }
          btn.textContent = "⚔️ 배틀 진행 중…";
          fight(me, opp);   // 잠금은 finishFight에서 풀어요
        } catch (e) {
          resetFightBtn();   // 실패해도 다시 시도할 수 있게 잠금은 풀어줘요
          throw e;           // 원인은 삼키지 않고 그대로 드러내요
        }
      };
    }
    // 배틀 도중에 나갔다 다시 들어와도 잠긴 채로 남지 않게 초기화해요.
    clearInterval(battleTimer);
    battling = false;
    $("battle-view").innerHTML = "";
    renderRanking();
    show("screen-battle");
  }

  let battleTimer = null;
  // 매칭 요청부터 결과 표시까지 버튼을 잠가요. 안 잠그면 배틀 연출(약 3초) 중에
  // 다시 눌려서 진행 중이던 배틀이 결과 없이 사라져요.
  let battling = false;
  function resetFightBtn() {
    battling = false;
    const btn = $("btn-fight");
    if (btn) { btn.disabled = false; btn.textContent = "🎲 랜덤 매칭 시작"; }
  }
  function fight(me, opp) {
    const p = clamp(0.5 + (me.bp - opp.bp) / 700, 0.08, 0.92);
    const win = Math.random() < p;
    if (window.Stats) Stats.log("battle", { win, remote: !!opp.remote });
    let a, b;
    if (win) { a = randInt(1, 4); b = randInt(0, Math.max(0, a - 1)); }
    else { b = randInt(1, 4); a = randInt(0, Math.max(0, b - 1)); }

    $("battle-view").innerHTML = `<div class="tour-card"><div class="pbp" id="battle-pbp"></div><div id="battle-result"></div></div>`;
    const feeds = [
      { text: `⚔️ ${me.name} vs ${opp.name} — 매치 킥오프!` },
      ...shuffle([...BATTLE_TXT]).slice(0, 3).map((t) => ({ text: t })),
      { text: `📢 경기 종료 — ${a} : ${b}`, cls: win ? "good" : "bad" },
    ];
    let idx = 0;
    clearInterval(battleTimer);
    battleTimer = setInterval(() => {
      if (idx >= feeds.length) {
        clearInterval(battleTimer);
        finishFight(me, opp, win, a, b);
        return;
      }
      const f = feeds[idx++];
      const div = document.createElement("div");
      if (f.cls) div.className = f.cls;
      div.textContent = f.text;
      $("battle-pbp").appendChild(div);
    }, 550);
  }

  function finishFight(me, opp, win, a, b) {
    const data = loadBattle();
    data.records = data.records || {};
    const rec = (id, name, base, ghost) =>
      data.records[id] || (data.records[id] = { name, rating: base, w: 0, l: 0, ghost });
    const rm = rec(me.id, me.name, 1000, false);
    const ro = rec(opp.id, opp.name, opp.bp ? 900 + Math.round(opp.bp / 4) : 1000, !opp.remote);
    const expected = 1 / (1 + Math.pow(10, (ro.rating - rm.rating) / 400));
    const delta = Math.round(24 * ((win ? 1 : 0) - expected));
    rm.rating += delta;
    ro.rating -= delta;
    if (win) { rm.w++; ro.l++; } else { rm.l++; ro.w++; }
    saveBattle(data);
    submitProfile(me, rm.rating, rm.w, rm.l);
    $("battle-result").innerHTML = `
      <div class="tour-vs">${win ? `${me.name} 승리! 🎉` : `${opp.name} 승리… 💧`} <span class="score-final">${a} : ${b}</span></div>
      <div class="tour-pts">레이팅 ${delta >= 0 ? "+" : ""}${delta} → ${rm.rating}</div>`;
    resetFightBtn();
    renderRanking();
  }

  async function renderRanking() {
    let rows = [];
    let global = false;
    const roster = await fetchRoster();
    if (roster && roster.length) {
      global = true;
      rows = roster.map((p) => ({
        id: p.id,
        name: p.name,
        rating: p.rating || 1000,
        w: p.w || 0,
        l: p.l || 0,
        ghost: !p.mine,
      }));
    } else {
      const data = loadBattle();
      rows = Object.entries(data.records || {}).map(([id, r]) => ({ id, ...r }));
      for (const g of GHOSTS) {
        if (!rows.find((r) => r.id === g.id)) {
          rows.push({ id: g.id, name: `${g.name} (봇)`, rating: 900 + Math.round(g.bp / 4), w: 0, l: 0, ghost: true });
        }
      }
    }
    rows.sort((x, y) => y.rating - x.rating);
    rankShown = 15;
    drawRanking(rows, global);
  }

  // 더 보기로 15명씩 늘리고, 내 순위가 목록 밖이면 하단에 고정해서 보여줘요
  let rankShown = 15;
  function drawRanking(rows, global) {
    const myIdx = rows.findIndex((r) => !r.ghost);
    const row = (r, i) => `<tr class="${r.ghost ? "" : "me"}"><td>${i + 1}</td><td>${r.name}</td><td>${r.w}승 ${r.l}패</td><td>${r.rating}</td></tr>`;
    const shown = rows.slice(0, rankShown).map(row).join("");
    const pinned = myIdx >= rankShown ? `<tr class="hof-gap-row"><td colspan="4">⋯</td></tr>` + row(rows[myIdx], myIdx) : "";
    const left = rows.length - Math.min(rows.length, rankShown);
    $("battle-rank").innerHTML = `
      <h2 class="rank-title">🏅 ${global ? "글로벌" : "로컬"} 배틀 랭킹 <span class="rank-total">${rows.length}명</span></h2>
      <table class="rank-table"><thead><tr><th>#</th><th>선수</th><th>전적</th><th>레이팅</th></tr></thead>
      <tbody>${shown}${pinned}</tbody></table>
      ${left > 0 ? `<button class="mini-btn rank-more" id="btn-rank-more">▾ 더 보기 (${left}명 남음)</button>` : ""}`;
    const mb = $("btn-rank-more");
    if (mb) mb.onclick = () => { rankShown += 15; drawRanking(rows, global); };
  }

  // ---------- 초기화 ----------
  $("btn-hof")?.addEventListener("click", showHof);
  $("btn-battle")?.addEventListener("click", () => showBattle("screen-title"));
  $("btn-battle-main")?.addEventListener("click", () => showBattle("screen-main"));
  $("btn-battle-pro")?.addEventListener("click", () => showBattle("screen-pro"));
  // 💼 남는다 — 아무것도 바꾸지 않고 결산으로 돌아가요
  $("btn-transfer-stay")?.addEventListener("click", () => yearReport());
  $("btn-hof-back")?.addEventListener("click", () => show("screen-title"));
  $("btn-battle-back")?.addEventListener("click", () => show(battleReturn));

  return {
    onEnding,
    refreshPro: renderPrep,
    showHof,
    showBattle,
    showActivity: () => {
      /* 🏆 컵을 치르던 중에 앱을 닫았으면 거기서 이어요. 이 줄이 없으면
       * 남은 라운드가 통째로 사라지고 트로피도 못 받아요 — 컵은 시즌 끝의
       * 세 판이라 중간에 끊기면 그 시즌이 그냥 없어진 것처럼 보입니다. */
      if (S.cup && window.SoccerCup) { cupMatch(); return; }
      if (S.camp > 0 || S.activity || S.pendingShow) { renderPrep(); show("screen-pro"); }
      else if (S.career && S.career.years.length) yearReport();
      else { renderPrep(); show("screen-pro"); }
    },
    transferOffers,
    moveToClub,
    _t: {
      ratingOf, FAN_CAP, RATING_DIV, POS_AXIS, posAxis, AXIS_K, AXIS_OFF,
      LEAGUES, leagueOf, barOf, CLUBS, clubStrOf, debutClubs, DEBUT_POOL, weakestClub,
      cupEntry, cupName, CUP_SPOTS, myTableRank,
      TRANSFER_MIN_YEAR, PROMOTE_HYPE, OFFERS_PER_LEAGUE, transferFee, transferOffers, canTransfer,
      DOWNGRADE_FEE, LOYALTY_FEE, leftBefore, moveLog, careerScore, shortClub, clubCell,
      clubOfYear, fillClubs,
      state: () => S,
    },
  };
})();
