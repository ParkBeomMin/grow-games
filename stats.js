/* 공용 통계 로그 — Supabase events 테이블에 익명 이벤트 적재
 *
 * 설정 (Supabase 대시보드 → SQL Editor에서 최초 1회):
 *
 *   create table if not exists public.events (
 *     id bigint generated always as identity primary key,
 *     ts timestamptz not null default now(),
 *     game text not null,
 *     player text not null,
 *     event text not null,
 *     data jsonb
 *   );
 *   alter table public.events enable row level security;
 *   create policy "events insert" on public.events for insert with check (true);
 *   create index if not exists events_game_ts on public.events (game, ts desc);
 *
 * anon 키에는 insert 정책만 열어서 외부에서 통계를 읽어갈 수는 없어요.
 * 조회는 대시보드 SQL Editor에서:
 *   -- 일별 방문 기기 수
 *   select date_trunc('day', ts) d, game, count(distinct player)
 *     from events where event = 'visit' group by 1, 2 order by 1 desc;
 *   -- 이벤트별 집계
 *   select game, event, count(*) from events group by 1, 2 order by 3 desc;
 */
"use strict";

window.Stats = (() => {
  const SUPABASE_URL = "https://dlbpvzgwwcgphlhymncx.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsYnB2emd3d2NncGhsaHltbmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODA3MTMsImV4cCI6MjEwMDM1NjcxM30.tyLMO8o_i5OTmKaRudFd5LATDjmjVzL8M2NM_4EoeBc";

  let gameName = "unknown";

  function pid() {
    let id = localStorage.getItem("grow-player-id");
    if (!id) {
      id = "u" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
      localStorage.setItem("grow-player-id", id);
    }
    return id;
  }

  // 실패해도 게임에 영향 없게 완전 fire-and-forget
  function log(event, data) {
    // GA4에도 같은 이벤트 전달 (gtag 스니펫이 있는 페이지에서만)
    try {
      if (typeof window.gtag === "function") window.gtag("event", event, { game: gameName, ...(data || {}) });
    } catch { /* noop */ }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    try {
      fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: "POST",
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify([{ game: gameName, player: pid(), event, data: data || null }]),
      }).catch(() => {});
    } catch { /* noop */ }
  }

  // 게임별 초기화 — 하루 1회만 방문(visit) 기록해 로그 낭비를 막아요
  function init(name) {
    gameName = name;
    const key = "grow-visit-" + name;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key) !== today) {
      localStorage.setItem(key, today);
      log("visit");
    }
  }

  return { init, log };
})();
