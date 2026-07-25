/* unicorn 서비스워커 — 네트워크 우선, 실패 시 캐시 */
const CACHE = "unicorn-v1";
const ASSETS = ["./", "./index.html", "./style.css", "./game.js", "./manifest.webmanifest", "../base.css", "../env.js"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith("unicorn-")).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); return res; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
