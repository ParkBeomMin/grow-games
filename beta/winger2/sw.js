/* winger2 서비스워커 — 네트워크 우선, 실패 시 캐시 (오프라인 플레이)
 * ⚽ 더 윙어 II 1막 — 옛 II 파일(career · town · squad · prospect · char3d · vendor …)을 걷어내고 새로 지었어요. */
const CACHE = "winger2-v8";   // ⚽ 1막 둘째 묶음(38번) — 접두사 `winger2-`가 activate의 startsWith와 짝이에요
/* 🔒 이 목록은 **자동 생성이 없습니다.** 전용 js를 더하면 여기 손으로 넣으세요 — 빠뜨리면 온라인에선 멀쩡하고
 *    **오프라인에서만** 깨져요. 🔴 `focus.js`는 다른 세션의 미커밋 파일이라 넣지 않아요(결정 8).
 * 🖼️ 그림 162장 — 첫 베타 66장 + 둘째 묶음 54장(도윤 · 하람 남 · 여 · 엄마 · 할머니 · 집 배경 둘 · 엔딩 둘 — 38번 §3) + 판 그림 30장(41번) + 🧱 막을 준비 · 슬라이딩 치비 12장(44번)은
 *    설치 때 한 번 받아 둬요. 그림이 하나라도 404면 설치가 통째로 실패하니 목록 ↔ `art/`를 늘 맞춰요. */
const ASSETS = [
  "./", "./index.html", "./style.css", "./engine.js", "./match-scene.js", "./art.js", "./scenes.js",
  "./live.js", "./world.js", "./events.js", "./story.js", "./achieve.js", "./book.js", "./sheet.js",
  "./film.js", "./game.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "../winger-moment.js", "../base.css", "../env.js", "../fx.js", "../radar.js", "../timing.js",
  "../match.js", "../help.js", "./art/bg-cup.webp", "./art/bg-dawn.webp", "./art/bg-field.webp",
  "./art/bg-gate.webp", "./art/bg-home-doyun.webp", "./art/bg-home-haram.webp",
  "./art/bg-home-jiho.webp", "./art/bg-locker.webp", "./art/bg-test.webp", "./art/coach-base.webp",
  "./art/coach-smile.webp", "./art/coach-stern.webp", "./art/coach-worry.webp", "./art/dad-base.webp",
  "./art/dad-smile.webp", "./art/dad-worry.webp", "./art/doyun-f-base.webp",
  "./art/doyun-f-chibi-base.webp", "./art/doyun-f-chibi-block.webp", "./art/doyun-f-chibi-down.webp",
  "./art/doyun-f-chibi-score.webp", "./art/doyun-f-down.webp", "./art/doyun-f-fire.webp",
  "./art/doyun-f-moved.webp", "./art/doyun-f-smile.webp", "./art/doyun-f-surprise.webp",
  "./art/doyun-f-tired.webp", "./art/doyun-m-base.webp", "./art/doyun-m-chibi-base.webp",
  "./art/doyun-m-chibi-block.webp", "./art/doyun-m-chibi-down.webp", "./art/doyun-m-chibi-score.webp",
  "./art/doyun-m-down.webp", "./art/doyun-m-fire.webp", "./art/doyun-m-moved.webp",
  "./art/doyun-m-smile.webp", "./art/doyun-m-surprise.webp", "./art/doyun-m-tired.webp",
  "./art/end-abroad.webp", "./art/end-leave.webp", "./art/end-pro1.webp", "./art/end-pro2.webp",
  "./art/end-semi.webp", "./art/end-trainee.webp", "./art/end-univ.webp", "./art/gaeun-base.webp",
  "./art/gaeun-frown.webp", "./art/gaeun-respect.webp", "./art/grandma-base.webp",
  "./art/grandma-smile.webp", "./art/grandma-worry.webp", "./art/haram-f-base.webp",
  "./art/haram-f-chibi-base.webp", "./art/haram-f-chibi-block.webp", "./art/haram-f-chibi-down.webp",
  "./art/haram-f-chibi-score.webp", "./art/haram-f-down.webp", "./art/haram-f-fire.webp",
  "./art/haram-f-moved.webp", "./art/haram-f-smile.webp", "./art/haram-f-surprise.webp",
  "./art/haram-f-tired.webp", "./art/haram-m-base.webp", "./art/haram-m-chibi-base.webp",
  "./art/haram-m-chibi-block.webp", "./art/haram-m-chibi-down.webp", "./art/haram-m-chibi-score.webp",
  "./art/haram-m-down.webp", "./art/haram-m-fire.webp", "./art/haram-m-moved.webp",
  "./art/haram-m-smile.webp", "./art/haram-m-surprise.webp", "./art/haram-m-tired.webp",
  "./art/jiho-f-base.webp", "./art/jiho-f-chibi-base.webp", "./art/jiho-f-chibi-block.webp",
  "./art/jiho-f-chibi-down.webp", "./art/jiho-f-chibi-score.webp", "./art/jiho-f-down.webp",
  "./art/jiho-f-fire.webp", "./art/jiho-f-moved.webp", "./art/jiho-f-smile.webp",
  "./art/jiho-f-surprise.webp", "./art/jiho-f-tired.webp", "./art/jiho-m-base.webp",
  "./art/jiho-m-chibi-base.webp", "./art/jiho-m-chibi-block.webp", "./art/jiho-m-chibi-down.webp",
  "./art/jiho-m-chibi-score.webp", "./art/jiho-m-down.webp", "./art/jiho-m-fire.webp",
  "./art/jiho-m-moved.webp", "./art/jiho-m-smile.webp", "./art/jiho-m-surprise.webp",
  "./art/jiho-m-tired.webp", "./art/minjae-base.webp", "./art/minjae-grin.webp",
  "./art/minjae-shock.webp", "./art/minjae-smirk.webp", "./art/minseo-base.webp",
  "./art/minseo-grin.webp", "./art/minseo-shock.webp", "./art/minseo-smirk.webp",
  "./art/mom-base.webp", "./art/mom-smile.webp", "./art/mom-worry.webp", "./art/scout-base.webp",
  "./art/scout-interest.webp", "./art/scout-smile.webp", "./art/seheon-base.webp",
  "./art/seheon-frown.webp", "./art/seheon-respect.webp", "./art/seoa-base.webp",
  "./art/seoa-fire.webp", "./art/seoa-grin.webp", "./art/seoa-tears.webp", "./art/taeo-base.webp",
  "./art/taeo-fire.webp", "./art/taeo-grin.webp", "./art/taeo-tears.webp",
  /* 🎮 판 그림 27장(41번 · director가 넣음) */
  "./art/m-ball.webp", "./art/m-boot.webp", "./art/m-def-f-tackle.webp", "./art/m-def-m-tackle.webp", "./art/m-gk-f-crouch.webp", "./art/m-gk-f-dive-high.webp", "./art/m-gk-f-dive-low.webp", "./art/m-gk-f-jump.webp", "./art/jiho-m-chibi-slide.webp", "./art/jiho-f-chibi-slide.webp", "./art/doyun-m-chibi-slide.webp", "./art/doyun-f-chibi-slide.webp", "./art/haram-m-chibi-slide.webp", "./art/haram-f-chibi-slide.webp", "./art/jiho-m-chibi-guard.webp", "./art/jiho-f-chibi-guard.webp", "./art/doyun-m-chibi-guard.webp", "./art/doyun-f-chibi-guard.webp", "./art/haram-m-chibi-guard.webp", "./art/haram-f-chibi-guard.webp", "./art/m-shooter-m-back.webp", "./art/m-shooter-f-back.webp", "./art/m-gk-f-reach.webp", "./art/m-gk-f-spread.webp", "./art/m-gk-f-ready.webp", "./art/m-gk-m-crouch.webp", "./art/m-gk-m-dive-high.webp", "./art/m-gk-m-dive-low.webp", "./art/m-gk-m-jump.webp", "./art/m-gk-m-reach.webp", "./art/m-gk-m-spread.webp", "./art/m-gk-m-ready.webp", "./art/m-mate-f-cheer.webp", "./art/m-mate-f-ready.webp", "./art/m-mate-f-run.webp", "./art/m-mate-f-shoot.webp", "./art/m-mate-m-cheer.webp", "./art/m-mate-m-ready.webp", "./art/m-mate-m-run.webp", "./art/m-mate-m-shoot.webp", "./art/m-seoa-stand.webp", "./art/m-taeo-stand.webp",
];
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
