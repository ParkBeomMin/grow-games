/* 📢 공지 — 같은 폴더의 notice.json을 한 번 받아, 기간 안의 안 본 공지를 하나씩 띄워요.
 *
 * notice.json 꼴: [{ "id": "2026-11-20-a", "title": "제목", "body": "내용(줄바꿈 \n)", "from": "2026-11-20", "to": "2026-11-30", "link": "https://…(선택)", "linkLabel": "단추 글(선택)" }]
 * - id는 공지마다 새로. 「확인」을 누른 id는 이 기기에서 다시 안 떠요.
 * - from · to는 둘 다 넣지 않아도 돼요(없으면 그쪽 끝은 열려 있음). 날짜는 이 기기의 날짜로 봐요.
 * - 파일이 없거나 깨져 있으면 아무것도 안 띄워요 — 공지 때문에 게임이 멈추면 안 됩니다.
 *
 * 다른 모달(.av-overlay)이 떠 있으면 기다렸다가 다음 화면 전환(game.js의 show)에서 띄워요. */
(function () {
  const SEEN_KEY = "soccer-notice-seen";
  let list = [];

  function seen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch { return []; }
  }
  function markSeen(id) {
    try {
      const s = seen();
      if (!s.includes(id)) s.push(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(s.slice(-50)));
    } catch { /* 사파리 프라이빗 — 이번 세션만 안 띄움 */ }
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function next() {
    const t = today(), s = seen();
    return list.find((n) => !s.includes(n.id) && (!n.from || n.from <= t) && (!n.to || t <= n.to));
  }

  function open(n) {
    const wrap = document.createElement("div");
    wrap.className = "av-overlay";
    const box = document.createElement("div");
    box.className = "av-modal";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "notice-title");
    const title = document.createElement("div");
    title.className = "av-title";
    title.id = "notice-title";
    title.textContent = "📢 " + n.title;
    const body = document.createElement("p");
    body.style.whiteSpace = "pre-line";
    body.style.textAlign = "left";
    body.textContent = n.body || "";
    const acts = document.createElement("div");
    acts.className = "av-actions";
    const ok = document.createElement("button");
    ok.className = "btn btn-primary";
    ok.textContent = "확인";
    ok.style.minHeight = "44px";
    ok.onclick = () => { markSeen(n.id); wrap.remove(); };
    // 🔗 링크 단추(선택) — https 주소만 받아요. 누르면 새 탭으로 열고 이 공지는 본 것으로 칩니다.
    if (typeof n.link === "string" && /^https:\/\//.test(n.link)) {
      const go = document.createElement("a");
      go.className = "btn btn-primary";
      go.href = n.link;
      go.target = "_blank";
      go.rel = "noopener";
      go.textContent = n.linkLabel || "바로 가기";
      go.style.minHeight = "44px";
      go.style.textAlign = "center";
      go.style.textDecoration = "none";
      go.onclick = () => { markSeen(n.id); wrap.remove(); };
      ok.className = "btn btn-ghost";
      ok.textContent = "닫기";
      acts.style.flexDirection = "column"; // 단추 글이 길어도 한 줄로
      acts.appendChild(go);
    }
    acts.appendChild(ok);
    box.append(title, body, acts);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    ok.focus();
  }

  let shown = false; // 한 번 열 때 공지는 하나만: 여러 개가 줄줄이 뜨지 않게(남은 건 다음 방문에)
  function tick() {
    if (shown || document.querySelector(".av-overlay")) return;
    const n = next();
    if (n) { shown = true; open(n); }
  }

  // 📢 타이틀의 더 윙어 2 배너: 누르면 GA 이벤트만 보내고 이동은 링크(새 탭)가 해요
  const promo = document.getElementById("w2-promo");
  if (promo) promo.addEventListener("click", () => {
    try { if (window.gtag) gtag("event", "winger2_banner_click", { place: "title" }); } catch { /* 측정 실패는 무시 */ }
  });

  fetch("notice.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .then((a) => {
      list = (Array.isArray(a) ? a : []).filter((n) => n && typeof n.id === "string" && typeof n.title === "string");
      tick();
    })
    .catch(() => { /* 공지 없음 */ });

  window.WingerNotice = { tick };
})();
