/* 연동 모달 UI 검증 — 발급/복사/재발급 버튼과 클립보드.
 *
 * 실제로 있었던 버그: 버튼 하나(📋 계정 연동 코드 복사하기)가 "복사"라고 읽히는데
 * 누르면 서버에서 코드를 새로 발급했다(기존 코드는 그 순간 무효화). 사용자가 "복사"인
 * 줄 알고 또 누르면 방금 받은 코드가 조용히 죽었다. 게다가 모달을 닫으면 코드를 다시 볼
 * 방법이 없어서, 적어두기 전에 실수로 닫은 사람은 영구히 코드를 잃었다.
 *
 * 고친 내용:
 *   - 발급한 코드를 grow-cloud-code에 남겨 모달을 다시 열어도 보인다.
 *   - 저장된 코드가 있으면 "📋 코드 복사"(복사 전용)와 "🔄 새 코드 발급(경고 포함)"이 분리된다.
 *   - 저장된 코드가 없으면 최초 버튼은 "복사"라고 말하지 않는다("🔗 연동 코드 발급").
 *   - 다른 기기의 코드를 성공적으로 claim하면(계정이 바뀌므로) 저장된 코드와 발급 플래그를 지운다.
 *   - grow-cloud-code는 keysOf()/collect()에 없어 다른 기기로 동기화되지 않는다.
 *
 * CLOUD 환경변수로 검사 대상 파일을 바꿀 수 있다 (수정 전 파일로 돌려 실패를 먼저 확인하려고).
 *   CLOUD=/…/cloud-before.js node cloud-ui-test.js
 */
"use strict";
const fs = require("fs");
const { JSDOM, VirtualConsole } = require(__dirname + "/jsdom.js");
const CLOUD = process.env.CLOUD || "/workspace/grow-games/beta/cloud.js";
const SRC = fs.readFileSync(CLOUD, "utf8");

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const group = (t) => console.log(`\n— ${t}`);
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 30));

// 게임별 저장 키 — 실제 game.js 상수와 일치해야 픽스처가 디스크 모양과 같다.
const SAVE = {
  rookie: "rookie-save-v1", idol: "trainee-save-v1", stock: "investor-save-v1",
  dev: "devgrow-save-v1", chef: "chef-save-v1", stream: "streamer-save-v1",
  soccer: "winger-save-v1", unicorn: "unicorn-save-v1",
};
const GAMES = Object.keys(SAVE);
const CODE_KEY = "grow-cloud-code";

/* routes: { fn이름: 고정값 | (body)=>값 }. 지정 안 한 fn을 부르면 테스트가 바로 드러나게 reject. */
function mk(routes) {
  const vc = new VirtualConsole();   // jsdom의 location.reload 미구현 경고를 삼킨다
  const dom = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only", url: "https://x.test/rookie/", virtualConsole: vc,
  });
  const { window } = dom;
  window.GROW_ENV = { beta: true };
  window.Match = { cfg: { url: "https://x.test", key: "anon" } };
  let copied = null;
  window.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
  const calls = [];
  window.fetch = (url, opt) => {
    const fn = String(url).split("/rpc/")[1];
    const body = JSON.parse(opt.body);
    calls.push({ fn, body });
    const h = routes && routes[fn];
    if (h === undefined) return Promise.reject(new Error("route 없음: " + fn));
    const v = typeof h === "function" ? h(body) : h;
    return Promise.resolve(v && typeof v.then === "function"
      ? v.then((x) => ({ ok: true, json: () => Promise.resolve(x) }))
      : { ok: true, json: () => Promise.resolve(v) });
  };
  window.eval(SRC);
  return {
    window, calls, LS: window.localStorage,
    $: (s) => window.document.querySelector(s),
    getCopied: () => copied,
  };
}

const issueCalls = (calls) => calls.filter((c) => c.fn === "cloud_issue").length;

(async function () {
  // ============================================================
  group("0) 모달 기본 요소");
  {
    const CODE = "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2";
    const { window, $ } = mk({ cloud_issue: CODE });
    window.Cloud.init("rookie");
    window.Cloud.openModal();
    check(!!$(".cloud-modal"), "모달이 열린다");
    check(!!$("#cloud-issue"), "발급/재발급 버튼이 있다");
    check(!!$("#cloud-code-input"), "코드 입력칸이 있다");
    window.Cloud._toast("테스트");
    check(!!$(".cloud-toast"), "토스트가 뜬다");
    $(".cloud-close").click();
    check(!$(".cloud-modal"), "닫기로 사라진다");
  }

  // ============================================================
  group("1) 발급한 코드는 모달을 다시 열어도 그대로 보인다 — 새 cloud_issue 없이 (사용자의 실제 불만)");
  {
    const CODE = "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2";
    const { window, LS, $, calls, getCopied } = mk({ cloud_issue: CODE });
    window.Cloud.init("rookie");
    window.Cloud.openModal();
    $("#cloud-issue").click();
    await tick(40);

    check($(".cloud-modal").textContent.indexOf(CODE) !== -1, "발급 직후 코드가 화면에 보인다");
    check(LS.getItem(CODE_KEY) === CODE, `발급한 코드가 로컬(${CODE_KEY})에 남는다 (실제: ${LS.getItem(CODE_KEY)})`);
    check(issueCalls(calls) === 1, `여기까지 cloud_issue는 1회만 나갔다 (${issueCalls(calls)}회)`);

    $(".cloud-close").click();
    check(!$(".cloud-modal"), "닫기로 모달이 사라진다");

    window.Cloud.openModal();
    const txt2 = $(".cloud-modal").textContent;
    check(txt2.indexOf(CODE) !== -1, "다시 열면 같은 코드가 그대로 보인다 — 예전엔 여기서 코드를 영영 잃었다");
    check(issueCalls(calls) === 1, `재오픈만으로는 새 cloud_issue가 나가지 않는다 (누적 ${issueCalls(calls)}회)`);

    const copyBtn = $("#cloud-copy");
    check(!!copyBtn, "재오픈 화면에도 복사 버튼이 있다");
    if (copyBtn) {
      copyBtn.click();
      await tick(20);
      check(getCopied() === CODE, `복사 버튼이 실제로 코드를 클립보드에 복사한다 (${getCopied()})`);
      check(issueCalls(calls) === 1, `복사 버튼을 눌러도 cloud_issue는 늘지 않는다 (누적 ${issueCalls(calls)}회)`);
    } else {
      check(false, "복사 버튼이 없어 재오픈 화면에서 복사를 확인할 수 없다");
      check(false, "");
    }
  }

  // ============================================================
  group("2) 버튼 라벨 — 발급 전엔 '복사'로 읽히지 않고, 재발급엔 경고가 붙는다");
  {
    // 저장된 코드가 없는 상태 — 최초 발급 버튼
    const { window, $ } = mk({});
    window.Cloud.openModal();
    const btn = $("#cloud-issue");
    check(!!btn, "저장된 코드가 없을 때도 발급 버튼이 있다");
    check(!!btn && !/복사/.test(btn.textContent),
      `저장된 코드가 없을 때 버튼 문구가 '복사'를 말하지 않는다 — "${btn && btn.textContent}"`);
    check(!!btn && /발급/.test(btn.textContent),
      `버튼이 발급 동작임을 스스로 말한다 — "${btn && btn.textContent}"`);
  }
  {
    // 저장된 코드가 있는 상태 — 복사 버튼과 재발급 버튼이 분리돼 있다
    const CODE = "KEPT-CODE-0000-1111-2222-3333";
    const { LS, window, $ } = mk({});
    LS.setItem(CODE_KEY, CODE);
    window.Cloud.openModal();
    const reissue = $("#cloud-issue");
    check(!!reissue, "저장된 코드가 있어도 재발급 버튼이 있다");
    check(!!reissue && /더 못 들어와요/.test(reissue.textContent),
      `재발급 버튼이 옛 코드가 막힌다는 걸 경고한다 — "${reissue && reissue.textContent}"`);
    check(!!reissue && !/복사/.test(reissue.textContent),
      "재발급 버튼 자체는 '복사'를 말하지 않는다 (복사와 재발급이 분리돼 있다)");
    const copyBtn = $("#cloud-copy");
    check(!!copyBtn && /코드 복사/.test(copyBtn.textContent),
      `복사 전용 버튼이 따로 있다 — "${copyBtn && copyBtn.textContent}"`);
  }

  // ============================================================
  group("3) '코드 복사'는 복사만 하고, 새로 발급하지 않는다");
  {
    const CODE = "COPY-ONLY-CODE-AAAA-BBBB-CCCC";
    const { LS, window, $, calls, getCopied } = mk({ cloud_issue: "SHOULD-NOT-BE-CALLED" });
    LS.setItem(CODE_KEY, CODE);
    window.Cloud.openModal();
    const copyBtn = $("#cloud-copy");
    check(!!copyBtn, "코드가 저장돼 있으면 '코드 복사' 버튼이 존재한다");
    if (copyBtn) {
      copyBtn.click();
      await tick(30);
      check(getCopied() === CODE, `복사 버튼을 누르면 저장된 코드가 클립보드에 복사된다 (${getCopied()})`);
      check(issueCalls(calls) === 0, `복사만으로는 cloud_issue가 나가지 않는다 (${issueCalls(calls)}회)`);
      check(LS.getItem(CODE_KEY) === CODE, "저장된 코드도 그대로다 (교체되지 않는다)");
    } else {
      check(false, "복사 전용 동작을 확인할 수 없다 (복사 버튼 부재)");
      check(false, "");
      check(false, "");
    }
  }

  // ============================================================
  group("4) '새 코드 발급'은 실제로 발급하고, 저장된 코드를 새 코드로 교체한다");
  {
    const OLD = "OLD-CODE-1111-2222-3333-4444";
    const NEW = "NEW-CODE-5555-6666-7777-8888";
    let n = 0;
    const { LS, window, $, calls } = mk({ cloud_issue: () => { n++; return n === 1 ? NEW : "UNEXPECTED"; } });
    LS.setItem(CODE_KEY, OLD);
    window.Cloud.openModal();
    const reissue = $("#cloud-issue");
    check(!!reissue, "재발급 버튼이 있다");
    if (reissue) {
      reissue.click();
      await tick(40);
      check(issueCalls(calls) === 1, `재발급 버튼을 누르면 cloud_issue가 나간다 (${issueCalls(calls)}회)`);
      check(LS.getItem(CODE_KEY) === NEW, `저장된 코드가 새 코드로 교체된다 (실제: ${LS.getItem(CODE_KEY)})`);
      check(LS.getItem("grow-cloud-issued") === "1", "재발급 후에도 발급 플래그는 계속 1이다");
      const txt = $(".cloud-modal").textContent;
      check(txt.indexOf(NEW) !== -1, "화면에도 새 코드가 보인다");
      check(txt.indexOf(OLD) === -1, "옛 코드는 더 이상 화면에 보이지 않는다");
    } else {
      check(false, "재발급 동작을 확인할 수 없다 (버튼 부재)");
      check(false, ""); check(false, ""); check(false, "");
    }
  }

  // ============================================================
  group("5) 성공적인 claim은 저장된 코드를 지운다 — 계정이 바뀌어 옛 코드는 남의 것");
  {
    // cloud_claim은 이제 jsonb({ok:true/false, reason})를 돌려준다. 이 테스트는
    // 일부러 예전 모양(bare true)을 그대로 스텁해 둔다 — 클라이언트가 "res === true"도
    // 여전히 성공으로 받아준다는 약속(하위 호환)을 핀으로 고정하기 위해서다.
    // 다른 모든 테스트는 새 모양 {ok:true}로 스텁한다.
    const CODE = "MINE-CODE-AAAA-BBBB-CCCC-DDDD";
    const { LS, window, $ } = mk({
      cloud_claim: true,
      cloud_pull: [],   // openLink()가 p_game:null로 부른다 — 한쪽에도 기록이 없으니 빈 화면
    });
    LS.setItem(CODE_KEY, CODE);
    LS.setItem("grow-cloud-issued", "1");
    window.Cloud.openModal();
    $("#cloud-code-input").value = "SOME-OTHER-DEVICES-CODE";
    $("#cloud-claim").click();
    await tick(40);   // claim 처리 + orphanLedger + closeModal + openLink 시작
    await tick(40);   // openLink()의 cloud_pull 응답 처리

    check(LS.getItem(CODE_KEY) === null, `claim 성공 후 저장된 코드가 지워진다 (실제: ${LS.getItem(CODE_KEY)})`);
    check(LS.getItem("grow-cloud-issued") === "0", `발급 플래그도 꺼진다 (실제: ${LS.getItem("grow-cloud-issued")})`);

    // claim 뒤에 뜨는 "기기를 연결했어요" 화면을 닫고, 모달을 다시 열어 상태를 확인한다.
    if ($(".cloud-modal")) $(".cloud-close").click();
    window.Cloud.openModal();
    const txt = $(".cloud-modal").textContent;
    check(txt.indexOf(CODE) === -1, "claim 뒤 모달에 옛 코드가 더 이상 보이지 않는다");
    const btn = $("#cloud-issue");
    check(!!btn && /발급/.test(btn.textContent) && !/무효/.test(btn.textContent),
      `claim 뒤에는 재발급이 아니라 최초 발급 버튼으로 보인다 (다른 계정 코드를 보여주지 않는다) — "${btn && btn.textContent}"`);
    check(!$("#cloud-copy"), "보여줄 코드가 없으니 복사 버튼도 없다");
  }

  // ============================================================
  group("6) grow-cloud-code는 어떤 게임의 collect()/keysOf()에도 실려 나가지 않는다 (다른 기기로 동기화 금지)");
  {
    const { LS, window } = mk({});
    const T = window.Cloud._t;
    LS.setItem(CODE_KEY, "SHOULD-NEVER-SYNC-0000-1111-2222");

    // 실제 저장 모양대로 픽스처를 채운다: 7종은 -slots 슬롯 맵 + -legacy, unicorn만 평키.
    GAMES.forEach((g) => {
      if (g === "unicorn") {
        LS.setItem(SAVE[g], JSON.stringify({ bestRun: 7e10, exits: 1 }));
        LS.setItem("unicorn-founded", "1");
      } else {
        LS.setItem(SAVE[g] + "-slots", JSON.stringify({ s1: { phase: "pro", proYear: 1, savedAt: 1 } }));
        LS.setItem(SAVE[g] + "-legacy", "100");
      }
    });

    GAMES.forEach((g) => {
      const collected = T.collect(g);
      check(!Object.prototype.hasOwnProperty.call(collected, CODE_KEY),
        `${g}: collect() 결과에 ${CODE_KEY}가 없다 (실제 키: ${Object.keys(collected).join(", ")})`);
      const keys = T.keysOf(g);
      check(keys.indexOf(CODE_KEY) === -1,
        `${g}: keysOf()가 ${CODE_KEY}를 돌려주지 않는다 (실제: ${keys.join(", ")})`);
    });
  }

  // ============================================================
  group("7) same_device — 이 기기가 발급한 코드를 자기 자신에게 붙여넣은 실제 버그");
  {
    // 실제로 있었던 버그: 코드를 발급한 뒤 (자연스럽게, 테스트 삼아) 같은 기기의
    // 불러오기 칸에 그대로 붙여넣으면 "코드가 맞지 않거나 이미 사용됐어요"가 떴는데,
    // 서버는 같은 계정 분기에서 그 코드를 실제로 지워버렸다 — 시도해 본 것만으로 코드가 죽었다.
    // 고친 서버는 same_device일 때 코드를 지우지 않고 살려둔다. 클라이언트도 그에 맞게
    // 계정 전환 장부정리(orphanLedger)·모달 닫기·연결 화면 열기를 전부 건너뛰어야 한다.
    const CODE = "SELF-CODE-AAAA-BBBB-CCCC-DDDD";
    const { LS, window, $, calls } = mk({
      cloud_claim: { ok: false, reason: "same_device" },
    });
    LS.setItem(CODE_KEY, CODE);
    LS.setItem("grow-cloud-issued", "1");
    LS.setItem("rookie-save-v1-slots", JSON.stringify({ s1: { phase: "pro", proYear: 1, savedAt: 1 } }));
    LS.setItem("grow-cloud-synced-rookie", "2026-07-27T01:00:00Z");   // 진짜 도장 — 지워지면 안 된다

    window.Cloud.openModal();
    $("#cloud-code-input").value = CODE;
    $("#cloud-claim").click();
    await tick(40);

    const msg = $("#cloud-msg");
    check(!!msg && /이 기기에서 발급한 코드/.test(msg.textContent),
      `이 기기가 발급했다는 안내가 뜬다 — "${msg && msg.textContent}"`);
    check(!!msg && /다른\s*기기/.test(msg.textContent), "다른 기기에 붙여넣으라고 안내한다");
    check(!!msg && /코드는 그대로 살아/.test(msg.textContent), "코드가 살아있다고 안내한다");
    check(!!msg && !/맞지 않거나 이미 사용됐어요/.test(msg.textContent),
      "예전의 오해를 부르던 '맞지 않거나 이미 사용됐어요' 문구는 뜨지 않는다 — 이게 버그의 핵심");

    check(LS.getItem(CODE_KEY) === CODE, `same_device에서는 저장된 코드가 지워지지 않는다 (실제: ${LS.getItem(CODE_KEY)})`);
    check(LS.getItem("grow-cloud-issued") === "1", "발급 플래그도 그대로 남는다");
    check(LS.getItem("grow-cloud-synced-rookie") === "2026-07-27T01:00:00Z",
      "same_device는 계정 전환 장부정리(orphanLedger)를 하지 않는다 — 진짜 도장이 지워지지 않는다");
    check(calls.filter((c) => c.fn === "cloud_pull").length === 0,
      "same_device는 연결 화면(cloud_pull)을 열지 않는다");
    check(!!$(".cloud-modal"), "연동 모달이 닫히지 않고 그대로 열려 있다");
    check(!$('input[name="pk-rookie"]'), "고르는 화면(연결 화면) 요소가 나타나지 않는다");
  }

  // ============================================================
  group("8) not_found — 없는 코드는 오타·재발급을 짚어 안내한다");
  {
    const { window, $ } = mk({ cloud_claim: { ok: false, reason: "not_found" } });
    window.Cloud.openModal();
    $("#cloud-code-input").value = "NO-SUCH-CODE-0000";
    $("#cloud-claim").click();
    await tick(40);

    const msg = $("#cloud-msg");
    check(!!msg && /코드를 찾을 수 없어요/.test(msg.textContent),
      `not_found 경고문이 뜬다 — "${msg && msg.textContent}"`);
    check(!!msg && !/한 번 쓰면 사라/.test(msg.textContent),
      "이제 일회용이 아니므로 '한 번 쓰면 사라진다'고 말하지 않는다");
    check(!!msg && !/이 기기에서 발급한 코드/.test(msg.textContent), "same_device 안내와 섞이지 않는다");
  }

  // ============================================================
  group("9) 이미 연결된 기기 — cloud_meta가 기록을 돌려주면 '다시 보기' 섹션이 뜬다");
  {
    // 실제로 있었던 버그: 코드는 한 번 쓰면 사라지는데, claim은 이미 성공해 기기가
    // 연결된 뒤 확인 화면(openLink)을 취소하면, 다시 코드를 넣을 방법이 없었다.
    // cloud_meta가 이 계정에 저장된 기록(rows)이 있다고 알려주면, 코드 없이도
    // 그 화면을 다시 열 수 있는 버튼을 보여준다.
    const { window, $, calls } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: "2026-07-27T00:00:00Z" }],
    });
    window.Cloud.openModal();
    await tick(40);

    check(calls.some((c) => c.fn === "cloud_meta"), "모달을 열면 cloud_meta가 나간다");
    const box = $("#cloud-linked");
    check(!!box && /이미 연결돼 있어요/.test(box.textContent),
      `이미 연결돼 있다는 안내가 뜬다 — "${box && box.textContent}"`);
    const relink = $("#cloud-relink");
    check(!!relink && /어느 기록을 남길지 고르기/.test(relink.textContent),
      `'어느 기록을 남길지 고르기' 버튼이 있다 — "${relink && relink.textContent}"`);
  }

  // ============================================================
  group("10) 아직 연결 안 한 기기 — cloud_meta가 빈 배열이면 섹션 자체가 없다");
  {
    // 한 번도 연결한 적 없는 기기에 "이미 연결돼 있어요"라고 말하면 그게 더 큰 오해다.
    const { window, $ } = mk({ cloud_meta: [] });
    window.Cloud.openModal();
    await tick(40);

    const box = $("#cloud-linked");
    check(!!box && box.innerHTML === "", `기록이 없으면 섹션이 비어 있다 (실제: "${box && box.innerHTML}")`);
    check(!$("#cloud-relink"), "재보기 버튼이 나타나지 않는다");
    check(!/이미 연결돼 있어요/.test(window.document.body.textContent),
      "'이미 연결돼 있어요' 문구 자체가 화면 어디에도 없다");
  }

  // ============================================================
  group("11) '어느 기록을 남길지 고르기'를 누르면 코드 없이 연결 화면이 열리고, cloud_claim은 나가지 않는다");
  {
    const { window, $, calls } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: "2026-07-27T00:00:00Z" }],
      cloud_pull: [],
      cloud_claim: { ok: true },   // 스텁은 해두되, 실제로는 절대 불려선 안 된다
    });
    window.Cloud.openModal();
    await tick(40);
    const relink = $("#cloud-relink");
    check(!!relink, "재보기 버튼이 있다 (전제 확인)");
    if (relink) {
      relink.click();
      await tick(40);
      check(!$(".cloud-modal") || /기기를 연결했어요/.test($(".cloud-modal").textContent),
        `클릭하면 코드 입력 모달이 아니라 연결(merge) 화면이 뜬다 — "${$(".cloud-modal") ? $(".cloud-modal").textContent : "(모달 없음)"}"`);
      check(calls.filter((c) => c.fn === "cloud_pull").length === 1,
        `openLink()의 cloud_pull이 정확히 1회 나간다 (${calls.filter((c) => c.fn === "cloud_pull").length}회)`);
      check(calls.filter((c) => c.fn === "cloud_claim").length === 0,
        `재보기는 코드를 안 쓰니 cloud_claim은 단 한 번도 나가지 않는다 (${calls.filter((c) => c.fn === "cloud_claim").length}회)`);
    } else {
      check(false, ""); check(false, ""); check(false, "");
    }
  }

  // ============================================================
  group("12) not_found 문구는 재발급으로 무효가 된다는 것과, 되돌아갈 버튼을 함께 안내한다");
  {
    const { window, $ } = mk({ cloud_claim: { ok: false, reason: "not_found" } });
    window.Cloud.openModal();
    $("#cloud-code-input").value = "NO-SUCH-CODE-0000";
    $("#cloud-claim").click();
    await tick(40);

    const msg = $("#cloud-msg");
    check(!!msg && /새 코드를 발급/.test(msg.textContent),
      `재발급하면 옛 코드가 무효가 된다는 설명이 덧붙는다 — "${msg && msg.textContent}"`);
    check(!!msg && /어느 기록을 남길지 고르기/.test(msg.textContent),
      `'어느 기록을 남길지 고르기' 버튼을 가리킨다 — "${msg && msg.textContent}"`);
  }

  // ============================================================
  group("13) 저장소를 못 쓰면(token() null) 이 경로에서 cloud_meta조차 나가지 않는다");
  {
    const { window, $, calls, LS } = mk({
      cloud_meta: [{ game: "beta:rookie", updated: "2026-07-27T00:00:00Z" }],
    });
    const proto = Object.getPrototypeOf(LS);
    const oGet = proto.getItem, oSet = proto.setItem;
    proto.getItem = function () { throw new Error("차단"); };
    proto.setItem = function () { throw new Error("차단"); };

    window.Cloud.openModal();
    await tick(40);
    proto.getItem = oGet; proto.setItem = oSet;

    check(calls.filter((c) => c.fn === "cloud_meta").length === 0,
      `저장소를 못 쓰면 이 경로의 cloud_meta도 나가지 않는다 (${calls.filter((c) => c.fn === "cloud_meta").length}회)`);
    check(!$("#cloud-relink"), "재보기 버튼도 당연히 없다");
    check(!/이미 연결돼 있어요/.test(window.document.body.textContent),
      "'이미 연결돼 있어요' 문구가 뜨지 않는다 — 기기 정체성이 없으니 판단할 수 없다");
  }

  // ============================================================
  group("14) cloud_meta 요청이 실패해도 모달은 멀쩡히 쓸 수 있다");
  {
    // cloud_meta 라우트를 일부러 안 두어(mk가 undefined route를 reject) 실패를 흉내낸다.
    const CODE = "ISSUED-AFTER-META-FAIL-0000";
    const { window, $, calls } = mk({
      cloud_issue: CODE,
      cloud_claim: { ok: true },
      cloud_pull: [],
    });
    window.Cloud.openModal();
    await tick(60);   // cloud_meta 실패(reject)가 조용히 가라앉을 시간

    const box = $("#cloud-linked");
    check(!!box && box.innerHTML === "", "cloud_meta가 실패해도 섹션은 비어 있을 뿐, 깨지지 않는다");
    check(!$("#cloud-relink"), "재보기 버튼도 없다 (실패했으니 뭐라 말할 근거가 없다)");

    // 발급이 여전히 동작한다
    $("#cloud-issue").click();
    await tick(40);
    check($(".cloud-modal").textContent.indexOf(CODE) !== -1, "cloud_meta 실패 후에도 코드 발급은 그대로 동작한다");

    // claim도 여전히 동작한다
    $("#cloud-code-input").value = "SOME-CODE";
    $("#cloud-claim").click();
    await tick(60);
    check(calls.filter((c) => c.fn === "cloud_claim").length === 1,
      "cloud_meta 실패 후에도 claim 요청이 정상적으로 나간다");
  }

  // ============================================================
  group("15) 코드는 1회용이 아니다 — 같은 코드를 두 번째 기기가 또 claim해도 성공하고, 장부 정리를 똑같이 한다");
  {
    // 예전엔 cloud_claim 성공 시 서버가 코드 행을 지워, 다음 기기는 not_found를 받았다.
    // 이제는 cloud_issue가 새 코드를 낼 때만 옛 코드가 무효화되고, claim은 코드를 지우지
    // 않는다 — 같은 코드를 기기 B가 쓰고 나서 기기 C가 또 써도 {ok:true}가 온다.
    //
    // 클라이언트는 이 재사용 여부를 스스로 알 방법이 없다 — 서버가 돌려주는 {ok:true}만
    // 본다. 그래서 이 테스트로 확인할 수 있는 것은 "서버가 재사용을 허락했을 때 클라이언트가
    // 올바르게 반응하는가"이지, "서버가 실제로 재사용을 허락하는가"가 아니다(그건 이미 실서버로
    // 확인됨 — 과제 설명 참고). 같은 이유로 이 테스트는 예전(1회용) 클라이언트를 상대로도
    // 그대로 통과한다: 예전 클라이언트도 {ok:true}를 받으면 코드가 새것이든 재사용된 것이든
    // 구분하지 않고 똑같은 성공 처리를 했다. 이건 코드가 실제로 살아있는지(서버 상태)가 아니라
    // 클라이언트의 성공 경로에 "이미 한 번 쓴 코드"를 특별 취급하는 로직이 몰래 들어오지
    // 않았는지를 잡아내는 회귀 고정핀이다.
    const SHARED_CODE = "SHARED-CODE-B4C4-D4E4-F4A4-0000";

    async function deviceClaims(rookieSlotSavedAt) {
      const { LS, window, $, calls } = mk({
        cloud_claim: { ok: true },
        cloud_pull: [],   // openLink()가 p_game:null로 부른다 — 두 기기 다 상대 사본은 없다고 흉내
      });
      // 이 기기(순전히 claim만 하는 쪽)에는 발급한 코드가 없고, 정리 대상이 될 자기 기록만 있다.
      LS.setItem("rookie-save-v1-slots", JSON.stringify({
        s1: { phase: "pro", proYear: 1, savedAt: rookieSlotSavedAt },
      }));
      LS.setItem("grow-cloud-synced-rookie", "2026-07-20T00:00:00Z");   // claim 전의 진짜 도장

      window.Cloud.openModal();
      $("#cloud-code-input").value = SHARED_CODE;
      $("#cloud-claim").click();
      await tick(40);   // claim 처리 + orphanLedger + closeModal + openLink 시작
      await tick(40);   // openLink()의 cloud_pull 응답 처리

      return { LS, window, $, calls };
    }

    const B = await deviceClaims(1000);
    const C = await deviceClaims(2000);

    [{ label: "기기 B(첫 claim)", d: B }, { label: "기기 C(같은 코드로 두 번째 claim)", d: C }].forEach(({ label, d }) => {
      const claimCalls = d.calls.filter((c) => c.fn === "cloud_claim");
      check(claimCalls.length === 1 && claimCalls[0].body.p_code === SHARED_CODE,
        `${label}: cloud_claim이 같은 코드로 정확히 1회 나간다 (실제: ${JSON.stringify(claimCalls.map((c) => c.body.p_code))})`);
      check(d.LS.getItem(CODE_KEY) === null, `${label}: 성공 처리로 저장된 코드(있었다면)가 지워진다`);
      check(d.LS.getItem("grow-cloud-issued") === "0", `${label}: 발급 플래그가 0으로 정리된다`);
      check(d.LS.getItem("grow-cloud-synced-rookie") === null,
        `${label}: orphanLedger가 옛 계정 기준 도장을 지운다 (실제: ${d.LS.getItem("grow-cloud-synced-rookie")})`);
      check(d.LS.getItem("grow-cloud-dirty-rookie") === "1",
        `${label}: 로컬 기록이 있던 게임은 사람이 정하도록 dirty=1로 되돌린다`);
      check(d.calls.filter((c) => c.fn === "cloud_pull").length === 1,
        `${label}: 연결 화면을 위해 cloud_pull이 정확히 1회 나간다`);
      const modalTxt = d.$(".cloud-modal") ? d.$(".cloud-modal").textContent : "";
      check(/기기를 연결했어요/.test(modalTxt), `${label}: 연결 화면이 뜬다 — "${modalTxt}"`);
    });

    // 두 기기의 결과가 서로 다르게 갈리지 않았는지 — 같은 코드, 같은 처리.
    check(B.LS.getItem("grow-cloud-issued") === C.LS.getItem("grow-cloud-issued"),
      "기기 B와 기기 C의 발급 플래그 처리 결과가 같다 (둘 다 같은 코드를 성공 claim했다)");
  }

  console.log(fail ? `\n❌ 실패 ${fail}건` : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("테스트 자체가 터졌어요:", e); process.exit(1); });
