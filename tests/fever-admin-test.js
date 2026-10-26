/* 🎉 관리 화면 — 넣은 숫자가 그대로 게임까지 가는가.
 *
 * 제보: "관리화면에서 상승폭 30으로 저장하면 0.3으로 되어버리네."
 *
 * 넣는 쪽(화면 → 저장값)과 빼는 쪽(저장값 → 화면)이 **서로 다른 자**를 쓰고 있었어요.
 * 빼는 쪽만 100을 더 나눠서, 30을 저장하면 0.003이 되고 다시 열면 0.3으로 보였습니다.
 * 이 저장소의 단골 병("표시와 판정이 서로 다른 것을 본다")이 폼에서 난 판이에요.
 *
 * 지키는 것:
 *   ① 30을 넣으면 게임이 받는 값은 0.3이다 (훈련 +30%)
 *   ② 저장한 값을 **다시 열면 30**이다 — 왕복이 제자리로 돌아온다
 *   ③ 단위가 다른 칸(평점은 점, 나머지는 %)도 각자 제 자를 쓴다
 *   ④ 0은 안 보낸다 — 효과가 0인 칸은 아예 빠져요
 *   ⑤ 그 값이 게임 쪽 상한(FEVER_CAP) 안이면 그대로 붙는다
 *   ⑥ 변이 검증 — 두 자를 어긋나게 하면 ②가 무너진다
 *   ⑦ 기록이 남는다 — 새 이벤트는 저장할 때마다 **새 id**, 수정은 **같은 id**,
 *      「지금 끄기」는 지우지 않고 종료만 당긴다(fever_set), 예약 취소만 지운다(fever_clear)
 *   ⑧ 게임은 **안 끝난 줄만 이른 순으로** 받는다 — 예약이 쌓여도 가장 가까운 게 안 잘린다
 *   ⑨ 🔁 반복은 그날그날 한 줄씩 — 요일 규칙 · 횟수 · 같은 길이 · 상한 · 회끼리 겹침
 *   ⑩ 📋 복사는 **새 줄** — 내용·효과는 그대로, 시각은 같은 시각의 가장 가까운 미래, 길이 그대로
 *
 * 실제 페이지를 띄워 **폼에 입력하고 저장 버튼을 눌러**, 서버로 나가는 몸통을 읽어요.
 */
"use strict";
const fs = require("fs");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
const toLocal = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}(${"일월화수목금토"[d.getDay()]}) ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const PAGE = "/workspace/grow-games/beta/stats/index.html";
const SRC = fs.readFileSync(PAGE, "utf8");
const FEVER_JS = fs.readFileSync("/workspace/grow-games/beta/soccer/fever.js", "utf8");

/* 통계 페이지는 집계 뷰 네 개와 hof를 받아 와요. 여기서는 피버 절만 보면 되니
 * 최소한만 돌려주고, **RPC로 나가는 몸통을 붙잡아 둡니다.** */
const sent = [];
let html = SRC.replace("</head>", `<script>
  localStorage.setItem("grow-stats-auth", "${(SRC.match(/const PW_HASH = "([^"]+)"/) || [])[1]}");
  window.__sent = [];
  window.fetch = (url, opt) => {
    const u = String(url);
    if (opt && opt.method === "POST") {
      window.__sent.push({ url: u, body: JSON.parse(opt.body) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(null) });
    }
    // 피버 한 줄은 비워서 돌려줘요 — 처음 여는 화면이에요
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(
      /stats_summary/.test(u) ? [{ game: "soccer", event: "visit", players: 9, total: 9 }] : []) });
  };
  window.confirm = () => true;
  window.scrollTo = () => {};
  window.Element.prototype.scrollIntoView = () => {};
</script></head>`);
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true,
  url: "https://x.test/beta/stats/#soccer" });
const w = dom.window;
const $ = (id) => w.document.getElementById(id);

(async () => {
  // 페이지가 뷰를 다 받아 그릴 때까지 기다려요
  for (let i = 0; i < 60 && !$("fv-save"); i++) await new Promise((r) => setTimeout(r, 20));
  check(!!$("fv-save"), "⚽ 더 윙어 탭에 피버 타임 폼이 그려진다");
  if (!$("fv-save")) { console.log("\n❌ 실패"); process.exit(1); }

  const EFFS = new Function(`${(SRC.match(/const FEVER_EFFS = \[[\s\S]*?\n    \];/) || [""])[0]} return FEVER_EFFS;`)();
  console.log(`   칸 — ${EFFS.map(([k, l, u]) => `${l}(${u})`).join(" · ")}`);

  /* 폼을 채우고 저장 버튼을 눌러요. 사람이 하는 것과 같은 순서예요. */
  async function save(vals) {
    w.__sent.length = 0;
    $("fv-pw").value = "아무비번";           // 서버 쪽 판정은 여기서 안 봐요(fetch를 가로챕니다)
    $("fv-title").value = "테스트";
    $("fv-24").click();                      // 시작·종료를 채워요
    for (const [k] of EFFS) $(`fv-e-${k}`).value = vals[k] != null ? vals[k] : 0;
    $("fv-save").click();
    for (let i = 0; i < 60 && !w.__sent.length; i++) await new Promise((r) => setTimeout(r, 10));
    const call = w.__sent.find((x) => /rpc\/fever_set/.test(x.url));
    return call ? call.body : null;
  }

  // ---------- ①③④ 넣는 쪽 ----------
  console.log("=== ①③④ 30을 넣으면 서버로 무엇이 가나 ===");
  const body = await save({ train: 30, moment: 5, rate: 0.4, g: 0 });
  check(!!body, "저장 버튼이 fever_set을 부른다");
  console.log(`   보낸 boost — ${JSON.stringify(body.p_boost)}`);
  check(body.p_boost.train === 0.3,
    `훈련 상승폭 30 → 0.3이 나간다 (${body.p_boost.train}) — 제보가 여기였어요`);
  check(body.p_boost.moment === 0.05, `승부처 5%p → 0.05 (${body.p_boost.moment})`);
  check(body.p_boost.rate === 0.4, `③ 평점은 점 단위라 0.4가 그대로 (${body.p_boost.rate})`);
  check(body.p_boost.g === undefined, "④ 0인 칸은 아예 안 보낸다");

  // ---------- ② 왕복 ----------
  console.log("=== ② 저장한 걸 다시 열면 ===");
  /* 서버가 방금 저장한 그 줄을 돌려주는 상황을 만들어요 — 화면을 다시 그립니다. */
  w.__get_reload = null;
  w.eval(`FEVER_ROWS = [${JSON.stringify({
    id: body.p_id, game: "soccer", emoji: "🎉", title: "테스트", note: null,
    starts_at: body.p_starts, ends_at: body.p_ends, boost: body.p_boost,
  })}]; FEVER_EDIT = null; renderPanel();`);
  w.document.querySelector(".fv-edit").click();         // 목록에서 「수정」을 눌러 폼에 불러와요
  const back = {};
  for (const [k] of EFFS) back[k] = Number($(`fv-e-${k}`).value);
  console.log(`   다시 읽은 값 — ${EFFS.map(([k, l]) => `${l} ${back[k]}`).join(" · ")}`);
  check(back.train === 30, `훈련 상승폭이 30으로 돌아온다 (${back.train}) — 0.3이면 자가 어긋난 거예요`);
  check(back.moment === 5, `승부처가 5로 돌아온다 (${back.moment})`);
  check(back.rate === 0.4, `평점이 0.4로 돌아온다 (${back.rate})`);

  // ---------- ⑤ 게임 쪽 상한 안인가 ----------
  console.log("=== ⑤ 게임이 이 값을 그대로 받나 ===");
  const CAP = new Function(`${(FEVER_JS.match(/const FEVER_CAP = \{[^}]*\};/) || [""])[0]} return FEVER_CAP;`)();
  console.log(`   게임 쪽 상한 — ${JSON.stringify(CAP)}`);
  const over = Object.keys(body.p_boost).filter((k) => body.p_boost[k] > CAP[k]);
  check(over.length === 0,
    `보낸 값이 전부 상한 안이라 그대로 붙는다 (넘은 칸: ${over.join(", ") || "없음"})`);
  // 상한을 넘겨 보내면 게임이 잘라요 — 그 계약은 tests/soccer/fever-test.js가 봅니다
  const big = await save({ train: 500 });
  check(big.p_boost.train === 5, `관리 화면은 큰 값도 그대로 보낸다 (${big.p_boost.train}) — 자르는 건 게임 쪽 몫이에요`);

  // ---------- ⑥ 변이 검증 ----------
  console.log("=== ⑥ 변이 검증 ===");
  {
    /* 두 자를 어긋나게 하면 ②가 무너져야 해요. 손으로 재현합니다. */
    const toField = new Function(`${(SRC.match(/const toField = [^;]+;/) || [""])[0]} return toField;`)();
    const toBoost = new Function(`${(SRC.match(/const toBoost = [^;]+;/) || [""])[0]} return toBoost;`)();
    check(!!toField && !!toBoost, "넣는 자와 빼는 자가 각각 한 곳에만 있다");
    check(toField(toBoost(30, 100), 100) === 30, `왕복이 제자리다 (30 → ${toBoost(30, 100)} → ${toField(toBoost(30, 100), 100)})`);
    const badBoost = (v, mul) => Number(v) / (mul * 100);        // 예전 판 (제보의 원인)
    console.log(`   옛 판으로 하면 30 → ${badBoost(30, 100)} → ${toField(badBoost(30, 100), 100)}`);
    check(toField(badBoost(30, 100), 100) !== 30,
      `옛 판이면 30이 ${toField(badBoost(30, 100), 100)}로 돌아온다 — ②가 그걸 잡아요`);
    check(!/\/ \(mul \* 100\)/.test(SRC), "소스에 옛 나눗셈이 안 남아 있다");
  }

  // ---------- ⑦ 기록이 남는다 ----------
  console.log("=== ⑦ 새 이벤트 · 수정 · 끄기 · 예약 취소 ===");
  {
    const now = Date.now(), iso = (t) => new Date(t).toISOString();
    const row = (id, from, to) => ({ id, game: "soccer", emoji: "🎉", title: id, note: null,
      starts_at: iso(from), ends_at: iso(to), boost: { train: 1 } });
    const H = 3600e3;
    w.eval(`FEVER_ROWS = ${JSON.stringify([
      row("soon1", now + 48 * H, now + 50 * H), row("live1", now - H, now + H), row("past1", now - 9 * H, now - 8 * H),
    ])}; FEVER_EDIT = null; renderPanel();`);
    const q = (sel) => [...w.document.querySelectorAll(sel)].map((b) => b.dataset.id);
    check(w.document.querySelectorAll(".fv-list tr").length === 3, "목록에 지난 것까지 세 줄이 다 보인다");
    check(JSON.stringify(q(".fv-stop")) === '["live1"]', `「지금 끄기」는 진행 중인 줄에만 (${q(".fv-stop")})`);
    check(JSON.stringify(q(".fv-del")) === '["soon1"]', `「예약 취소」는 예약 줄에만 (${q(".fv-del")})`);

    // 새 이벤트 두 번 → id 둘이 달라야 해요. 예전엔 같은 id를 덮어써서 기록이 사라졌어요
    const a = await save({ train: 10 });
    await new Promise((r) => setTimeout(r, 5));
    w.eval("FEVER_EDIT = null; renderPanel();");
    const b = await save({ train: 10 });
    check(!!a && !!b && a.p_id !== b.p_id, `새 이벤트는 저장마다 새 id (${a && a.p_id} · ${b && b.p_id})`);
    check(a.p_id !== "soccer-fever" && /^soccer-/.test(a.p_id), `옛 고정 id를 안 쓴다 (${a.p_id})`);

    // 수정은 같은 id
    w.eval(`FEVER_ROWS = ${JSON.stringify([row("soon1", now + 48 * H, now + 50 * H)])}; FEVER_EDIT = null; renderPanel();`);
    w.document.querySelector('.fv-edit[data-id="soon1"]').click();
    w.__sent.length = 0;
    $("fv-pw").value = "아무비번";
    $("fv-save").click();
    for (let i = 0; i < 60 && !w.__sent.length; i++) await new Promise((r) => setTimeout(r, 10));
    const ed = (w.__sent.find((x) => /rpc\/fever_set/.test(x.url)) || {}).body;
    check(!!ed && ed.p_id === "soon1", `수정하면 같은 id로 저장 (${ed && ed.p_id})`);

    // 지금 끄기 — fever_set으로 종료만 당기고, fever_clear는 안 불러요
    w.eval(`FEVER_ROWS = ${JSON.stringify([row("live1", now - H, now + H)])}; FEVER_EDIT = null; renderPanel();`);
    w.__sent.length = 0;
    $("fv-pw").value = "아무비번";
    w.document.querySelector(".fv-stop").click();
    for (let i = 0; i < 60 && !w.__sent.length; i++) await new Promise((r) => setTimeout(r, 10));
    const st = (w.__sent.find((x) => /rpc\/fever_set/.test(x.url)) || {}).body;
    check(!w.__sent.some((x) => /fever_clear/.test(x.url)), "「지금 끄기」는 줄을 지우지 않는다 (fever_clear 0번)");
    check(!!st && st.p_id === "live1" && Math.abs(Date.parse(st.p_ends) - Date.now()) < 60e3
      && st.p_starts === iso(now - H) && st.p_boost.train === 1,
      `「지금 끄기」는 종료만 지금으로 당긴다 (종료 ${st && st.p_ends})`);

    // 예약 취소 — 이것만 지워요
    w.eval(`FEVER_ROWS = ${JSON.stringify([row("soon1", now + 48 * H, now + 50 * H)])}; FEVER_EDIT = null; renderPanel();`);
    w.__sent.length = 0;
    $("fv-pw").value = "아무비번";
    w.document.querySelector(".fv-del").click();
    for (let i = 0; i < 60 && !w.__sent.length; i++) await new Promise((r) => setTimeout(r, 10));
    const del = (w.__sent.find((x) => /rpc\/fever_clear/.test(x.url)) || {}).body;
    check(!!del && del.p_id === "soon1", `예약 취소는 그 줄만 지운다 (${del && del.p_id})`);
  }

  // ---------- ⑨ 반복 ----------
  console.log("=== ⑨ 🔁 반복 예약 ===");
  {
    /* 폼에서 반복을 고르고 저장을 눌러, 나가는 fever_set을 **전부** 붙잡아요.
     * 첫 회는 2026-10-17(토) 13:00 ~ 14:00 — 평일 규칙이면 월요일부터 세야 해요. */
    const rep = async (rule, n, from = "2026-10-17T13:00", to = "2026-10-17T14:00") => {
      w.eval("FEVER_ROWS = []; FEVER_EDIT = null; renderPanel();");
      w.__sent.length = 0;
      $("fv-pw").value = "아무비번";
      $("fv-from").value = from; $("fv-to").value = to;
      $("fv-rep").value = rule; $("fv-n").value = n;
      $("fv-save").click();
      let last = -1;
      for (let i = 0; i < 100 && w.__sent.length !== last; i++) {   // 더 안 늘어날 때까지 — 한 회씩 차례로 나가요
        last = w.__sent.length;
        await new Promise((r) => setTimeout(r, 30));
      }
      return w.__sent.filter((x) => /rpc\/fever_set/.test(x.url)).map((x) => x.body);
    };
    const day = (b) => new Date(b.p_starts).getDay();
    const hm = (b) => { const d = new Date(b.p_starts); return d.getHours() * 60 + d.getMinutes(); };

    const wd = await rep("weekday", 5);
    console.log(`   평일 5회 — ${wd.map((b) => toLocal(b.p_starts)).join(" · ")}`);
    check(wd.length === 5, `평일 5회면 다섯 줄이 나간다 (${wd.length})`);
    check(wd.every((b) => day(b) >= 1 && day(b) <= 5), "전부 평일이다 — 토요일 첫 회는 건너뛴다");
    check(wd.length && day(wd[0]) === 1, "토요일에서 시작하면 월요일부터 센다");
    check(new Set(wd.map((b) => b.p_id)).size === 5, "줄마다 id가 다르다");
    check(wd.every((b) => Date.parse(b.p_ends) - Date.parse(b.p_starts) === 3600e3 && hm(b) === 13 * 60),
      "모든 회가 13:00 · 1시간 그대로다");

    const wk = await rep("weekly", 3);
    check(wk.length === 3 && wk.every((b) => day(b) === 6)
      && Date.parse(wk[2].p_starts) - Date.parse(wk[0].p_starts) === 14 * 864e5,
      `매주 3회 — 같은 요일 · 7일 간격 (${wk.map((b) => toLocal(b.p_starts)).join(" · ")})`);

    const we = await rep("weekend", 4);
    check(we.length === 4 && we.every((b) => day(b) === 0 || day(b) === 6), `주말 4회 — 토·일만 (${we.length})`);

    const one = await rep("none", 7);
    check(one.length === 1, `반복 안 함이면 몇 번을 넣어도 한 줄 (${one.length})`);

    const tooMany = await rep("daily", 31);
    check(tooMany.length === 0, `상한(30)을 넘으면 아무것도 안 보낸다 (${tooMany.length})`);
    check(/1~30/.test($("fv-msg").textContent), `이유를 알려 준다 (${$("fv-msg").textContent})`);

    const lap = await rep("daily", 3, "2026-10-17T13:00", "2026-10-18T14:00");
    check(lap.length === 0, `매일인데 하루보다 길면 아무것도 안 보낸다 (${lap.length})`);

    // 수정 중에는 반복 칸이 없어요 — 한 줄을 고치는 거라서요
    w.eval(`FEVER_ROWS = [{ id: "e1", title: "e1", starts_at: "2026-10-20T04:00:00Z", ends_at: "2026-10-20T05:00:00Z", boost: {} }]; FEVER_EDIT = "e1"; renderPanel();`);
    check(!$("fv-rep"), "수정 중에는 🔁 반복 칸이 안 보인다");
  }

  // ---------- ⑩ 복사 ----------
  console.log("=== ⑩ 📋 복사 ===");
  {
    /* 지난 이벤트(9일 전 · 1시간 30분)를 복사해 저장해요. 시각은 **검사를 돌리는 지금**을 기준으로
     * 두 가지를 다 만들어요 — 오늘 그 시각이 ⓐ 이미 지났으면 내일, ⓑ 아직이면 오늘이어야 해요.
     * 고정 시각(07:30)으로 재면 돌리는 시간대에 따라 한쪽만 재서, 「내일로 미는」 줄을 지워도 초록불이었어요. */
    const copyOnce = async (offsetMin) => {
      const t = new Date(Date.now() + offsetMin * 60e3); t.setSeconds(0, 0);
      const past = new Date(t); past.setDate(past.getDate() - 9);
      const src = { id: "old1", game: "soccer", emoji: "🐦", title: "일찍 일어나는 새", note: "아침 한 판",
        starts_at: past.toISOString(), ends_at: new Date(past.getTime() + 90 * 60e3).toISOString(),
        boost: { train: 0.5, rate: 0.3 } };
      w.eval(`FEVER_ROWS = [${JSON.stringify(src)}]; FEVER_EDIT = null; FEVER_COPY = null; renderPanel();`);
      $("fv-pw").value = "아무비번";
      w.document.querySelector('.fv-copy[data-id="old1"]').click();
      const kept = $("fv-pw").value === "아무비번", rep = !!$("fv-rep");
      w.__sent.length = 0;
      $("fv-save").click();
      for (let i = 0; i < 60 && !w.__sent.length; i++) await new Promise((r) => setTimeout(r, 10));
      return { src, t, kept, rep, c: (w.__sent.find((x) => /rpc\/fever_set/.test(x.url)) || {}).body };
    };
    const sameHM = (a, b) => a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes();
    const dayDiff = (a, b) => Math.round((new Date(a).setHours(0, 0, 0, 0) - new Date(b).setHours(0, 0, 0, 0)) / 864e5);

    // ⓐ 오늘 그 시각이 2시간 전 → 내일
    const A = await copyOnce(-120);
    check(A.kept, "복사를 눌러도 넣어 둔 비번이 그대로다");
    check(A.rep, "복사한 폼에서도 🔁 반복을 고를 수 있다");
    check(!!A.c, "복사한 폼의 저장이 fever_set을 부른다");
    if (A.c) {
      const f = new Date(A.c.p_starts);
      console.log(`   ⓐ 지난 시각 — ${toLocal(A.c.p_starts)} ~ ${toLocal(A.c.p_ends)} · ${A.c.p_emoji} ${A.c.p_title} · ${JSON.stringify(A.c.p_boost)}`);
      check(A.c.p_id !== "old1", `원본을 덮지 않고 새 id로 저장한다 (${A.c.p_id})`);
      check(A.c.p_title === A.src.title && A.c.p_emoji === A.src.emoji && A.c.p_note === A.src.note, "제목·이모지·설명이 그대로다");
      check(A.c.p_boost.train === 0.5 && A.c.p_boost.rate === 0.3 && Object.keys(A.c.p_boost).length === 2, "효과가 그대로다");
      check(sameHM(f, A.t), `시작 시각이 원본과 같은 시·분이다 (${toLocal(A.c.p_starts)})`);
      check(f.getTime() > Date.now(), "복사본은 미래 시각이다 — 저장하자마자 지난 이벤트가 되지 않는다");
      check(Date.parse(A.c.p_ends) - f.getTime() === 90 * 60e3, "길이가 1시간 30분 그대로다");
    }
    /* 날짜를 가르는 판정은 **지금을 고정해서** 재요. 「지금 ± 2시간」은 자정 근처에서 날짜를 넘어가,
     * 검사를 돌리는 시각에 따라 내일로 미는 줄을 지워도 초록불이었어요(변이 M9가 안 잡힘). */
    const when = (src, nowStr) => w.eval(`feverCopyWhen(${JSON.stringify(src)}, ${new Date(nowStr).getTime()})`)
      .map((d) => new Date(d.getTime()));
    const src0 = { starts_at: new Date("2026-10-01T07:30").toISOString(), ends_at: new Date("2026-10-01T09:00").toISOString() };
    const src1 = { starts_at: new Date("2026-10-01T13:00").toISOString(), ends_at: new Date("2026-10-01T14:15").toISOString() };
    const src2 = { starts_at: new Date("2026-10-01T23:30").toISOString(), ends_at: new Date("2026-10-02T01:00").toISOString() };
    const [a0] = when(src0, "2026-10-26T10:00"), [a1] = when(src1, "2026-10-26T10:00"), [a2, b2] = when(src2, "2026-10-26T23:45");
    const [a3] = when(src0, "2026-10-26T07:30");
    console.log(`   지금 10:00 → 07:30 원본은 ${toLocal(a0)} · 13:00 원본은 ${toLocal(a1)} · 지금 23:45 → 23:30 원본은 ${toLocal(a2)} ~ ${toLocal(b2)}`);
    check(dayDiff(a0, new Date("2026-10-26T10:00")) === 1 && sameHM(a0, new Date("2026-10-01T07:30")),
      "오늘 그 시각이 지났으면 내일로 민다 (지금 10:00 · 원본 07:30 → 내일 07:30)");
    check(dayDiff(a1, new Date("2026-10-26T10:00")) === 0, "오늘 그 시각이 아직이면 오늘 그대로다 (원본 13:00 → 오늘 13:00)");
    check(dayDiff(a2, new Date("2026-10-26T23:45")) === 1 && b2 - a2 === 90 * 60e3,
      "자정을 넘는 이벤트도 내일로 밀고 길이가 그대로다");
    check(dayDiff(a3, new Date("2026-10-26T07:30")) === 1, "바로 그 시각이면 지난 걸로 보고 내일로 민다");
  }

  // ---------- ⑧ 게임이 받는 줄 ----------
  console.log("=== ⑧ 게임은 무엇을 받아 가나 ===");
  {
    /* 실제 refresh()를 돌려 나가는 주소를 붙잡아요. 예약 여섯 + 진행 중 하나를 서버처럼
     * 그 주소의 조건대로 걸러 돌려주고, 진행 중인 게 붙는지 봐요. */
    const now = Date.now(), H = 3600e3, iso = (t) => new Date(t).toISOString();
    const all = [{ id: "live", starts_at: iso(now - H), ends_at: iso(now + H), boost: { train: 1 } }];
    for (let i = 1; i <= 6; i++) all.push({ id: `soon${i}`, starts_at: iso(now + i * 24 * H), ends_at: iso(now + i * 24 * H + H), boost: { train: 1 } });
    all.push({ id: "old", starts_at: iso(now - 50 * H), ends_at: iso(now - 49 * H), boost: { train: 1 } });
    const g = new JSDOM(`<body></body>`, { runScripts: "outside-only", url: "https://x.test/soccer/" }).window;
    let asked = "";
    g.Match = { cfg: { url: "https://db.test", key: "k" } };
    g.fetch = (url) => {
      asked = decodeURIComponent(String(url));
      const p = new URL(String(url)).searchParams;
      let rows = all.slice();
      const gt = (p.get("ends_at") || "").replace(/^gt\./, "");
      if (gt) rows = rows.filter((r) => Date.parse(r.ends_at) > Date.parse(gt));
      const [col, dir] = (p.get("order") || "starts_at.asc").split(".");
      rows.sort((x, y) => (Date.parse(x[col]) - Date.parse(y[col])) * (dir === "desc" ? -1 : 1));
      rows = rows.slice(0, Number(p.get("limit") || 1e9));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(rows) });
    };
    g.eval(FEVER_JS);
    const got = await g.WingerFever.refresh();
    console.log(`   보낸 조건 — ${asked.replace(/^.*\?/, "")}`);
    check(!!got && got.id === "live", `예약이 여섯 개여도 진행 중인 이벤트가 붙는다 (${got && got.id})`);
    g.close();
  }

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  w.close();
  process.exit(fail ? 1 : 0);
})();
