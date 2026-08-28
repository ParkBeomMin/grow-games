/* winger2 서비스워커 — 네트워크 우선, 실패 시 캐시 (오프라인 플레이) */
const CACHE = "winger2-v1";   // ⚽ 더 윙어 II 신설
const ASSETS = ["./", "./index.html", "./style.css", "./game.js", "./cup.js", "./career.js", "./squad.js", "./engine.js", "./match-scene.js", "./fever.js", "./camp.js", "./worldcup.js", "./manifest.webmanifest", "../base.css", "../env.js", "../fx.js", "../radar.js", "../timing.js", "../match.js", "../help.js"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith("winger2-")).map((k) => caches.delete(k))))
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
