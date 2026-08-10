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
 *
 * 실제 페이지를 띄워 **폼에 입력하고 저장 버튼을 눌러**, 서버로 나가는 몸통을 읽어요.
 */
"use strict";
const fs = require("fs");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

let fail = 0;
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
  w.eval(`FEVER_ROW = ${JSON.stringify({
    id: "soccer-fever", game: "soccer", emoji: "🎉", title: "테스트", note: null,
    starts_at: body.p_starts, ends_at: body.p_ends, boost: body.p_boost,
  })}; renderPanel();`);
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

  console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
  w.close();
  process.exit(fail ? 1 : 0);
})();
