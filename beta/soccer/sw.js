/* soccer 서비스워커 — 네트워크 우선, 실패 시 캐시 (오프라인 플레이) */
const CACHE = "soccer-v22";  // 📍 자리를 눌러서 골라요  // ⚡ 스피드 · 🫀 체력이 소모를 줄여요 · 🛡️ 명전 수비  // 📍 세부 자리  // 🏆 내 몫도 팀 스코어에서  // 🏆 팀 성적과 개인 기록 통합  // 📊 능력치 레이더 · 🦶 주발과 약발  // 🛌 벤치 컨디션 회복  // 🐛 명단의 내 줄이 안 오르던 것  // 🐛 출전 수 두 번 세던 것 · 우승 화면 다음 상대  // 🥇 개막 전 개인 순위  // 🧯 이어하던 세이브 개인 순위 메우기   // 🥇 리그 전 선발 개인 순위   // 🛡️ 대회 수비 부문   // 📈 동료 성장·노쇠   // 🎉 fever.js 추가   // 🏛️ 명예의 전당 달 탭·헌액 카드   // 🌏 worldcup.js   // 👥 squad.js·🔥 camp.js + 항상 재검증
const ASSETS = ["./", "./index.html", "./style.css", "./game.js", "./cup.js", "./career.js", "./squad.js", "./fever.js", "./camp.js", "./worldcup.js", "./manifest.webmanifest", "../base.css", "../radar.js", "../timing.js", "../match.js", "../help.js"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith("soccer-")).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    /* cache: "no-cache" — **매번 서버에 물어봅니다**(바뀐 게 없으면 304라 싸요).
     * 이게 없으면 네트워크 우선이어도 브라우저 HTTP 캐시가 먼저 답해요.
     * GitHub Pages가 max-age=600을 주니 방금 고친 파일이 10분간 옛것으로 옵니다 —
     * "고쳤는데 그대로인데?"가 여기서 나와요. 베타는 하루에도 몇 번씩 바뀝니다. */
    fetch(e.request, { cache: "no-cache" })
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
