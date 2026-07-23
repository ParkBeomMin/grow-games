/* 공용 랜덤 매칭 모듈 — Supabase 연동
 *
 * 설정 방법:
 *  1) Supabase 대시보드 → SQL Editor에서 아래 스키마 실행 (최초 1회):
 *
 *     create table if not exists public.players (
 *       id text primary key,
 *       game text not null,
 *       name text not null,
 *       bp int not null default 0,
 *       rating int not null default 1000,
 *       w int not null default 0,
 *       l int not null default 0,
 *       updated_at timestamptz not null default now()
 *     );
 *     alter table public.players enable row level security;
 *     create policy "players read" on public.players for select using (true);
 *     create policy "players insert" on public.players for insert with check (true);
 *     create policy "players update" on public.players for update using (true);
 *
 *  2) Settings → API 의 Project URL과 anon public 키를 아래 두 상수에 입력.
 *     (anon 키는 공개용 키라 저장소에 커밋해도 괜찮아요)
 *
 * 키가 비어 있으면 게임은 자동으로 오프라인(봇 매칭) 모드로 동작해요. */
"use strict";

window.Match = (() => {
  const SUPABASE_URL = "";      // 예: https://abcd1234.supabase.co
  const SUPABASE_ANON_KEY = ""; // Settings → API → anon public

  const enabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  const headers = () => ({
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  });

  // 기기(브라우저) 단위 익명 ID
  function playerId() {
    let id = localStorage.getItem("grow-player-id");
    if (!id) {
      id = "u" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
      localStorage.setItem("grow-player-id", id);
    }
    return id;
  }

  // 내 프로필(이름/전투력/전적)을 매칭 풀에 업서트
  async function submit(game, profile) {
    if (!enabled()) return false;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
        method: "POST",
        headers: { ...headers(), Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify([{
          id: `${game}-${playerId()}`,
          game,
          name: String(profile.name).slice(0, 24),
          bp: Math.round(profile.bp) || 0,
          rating: Math.round(profile.rating) || 1000,
          w: profile.w || 0,
          l: profile.l || 0,
          updated_at: new Date().toISOString(),
        }]),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // 해당 게임의 플레이어 풀 (레이팅 내림차순, 최대 200명)
  async function roster(game) {
    if (!enabled()) return null;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/players?game=eq.${game}&select=id,name,bp,rating,w,l&order=rating.desc&limit=200`,
        { headers: headers() }
      );
      if (!res.ok) return null;
      const arr = await res.json();
      const me = `${game}-${playerId()}`;
      return arr.map((p) => ({ ...p, mine: p.id === me }));
    } catch {
      return null;
    }
  }

  return { enabled, playerId, submit, roster };
})();
