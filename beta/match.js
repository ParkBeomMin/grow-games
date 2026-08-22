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
  const SUPABASE_URL = "https://dlbpvzgwwcgphlhymncx.supabase.co";
  // anon public 키 — 공개용 키라 커밋해도 안전해요 (보안은 RLS가 담당)
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsYnB2emd3d2NncGhsaHltbmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODA3MTMsImV4cCI6MjEwMDM1NjcxM30.tyLMO8o_i5OTmKaRudFd5LATDjmjVzL8M2NM_4EoeBc";

  // 베타 환경에서는 원격 기록을 끄고 로컬로만 동작해요(상용 데이터 격리)
  const enabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY) && !(window.GROW_ENV && window.GROW_ENV.beta);
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

  // 첫 캐릭터 생성 시 풀에 등록만 — 이미 있으면 건드리지 않아요 (전적 보호)
  async function register(game, name) {
    if (!enabled()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/players`, {
        method: "POST",
        headers: { ...headers(), Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify([{
          id: `${game}-${playerId()}`,
          game,
          name: String(name).slice(0, 24),
          bp: 0,
          rating: 1000,
          w: 0,
          l: 0,
          updated_at: new Date().toISOString(),
        }]),
      });
    } catch { /* noop */ }
  }

  // 해당 게임의 전체 플레이어 수 (타이틀 화면 표기용)
  async function count(game) {
    if (!enabled()) return null;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/players?game=eq.${game}&select=id&limit=1`,
        { headers: { ...headers(), Prefer: "count=exact" } }
      );
      const cr = res.headers.get("content-range"); // 예: "0-0/42"
      const n = cr && cr.includes("/") ? parseInt(cr.split("/")[1], 10) : NaN;
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
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

  // ---------- 명예의 전당 (전 세계 공유) ----------
  // 은퇴 시 커리어 엔트리를 hof 테이블에 등록 (실패해도 로컬 저장은 유지)
  /* 🛡️ **명예의 전당은 남이 올린 값을 그대로 화면에 그려요** (게임들이 innerHTML로 씁니다).
   *
   * 이름 칸에 태그를 넣어 올리면 그게 **다른 사람 브라우저에서 실행됩니다.**
   * 지어낸 걱정이 아니에요 — `<img src=x onerror=…>`를 이름으로 올린 항목이
   * 명예의 전당 목록의 DOM에 그대로 들어가는 걸 확인했어요. 입력칸의
   * maxlength는 화면의 예의일 뿐, 개발자 도구를 열면 아무 값이나 올라갑니다.
   *
   * 8종이 **같은 표 하나**를 읽으니 여기서 씻습니다. 보내기 전에도, 받아온 뒤에도요 —
   * 받는 쪽이 진짜 방어선이에요(이미 올라가 있는 값이 있으니까요).
   * 태그를 이스케이프하지 않고 **지웁니다.** 이 칸들에 <>&"'`가 뜻을 갖는 경우가
   * 없어서, 지우는 쪽이 그리는 자리마다 이스케이프를 기억하는 것보다 안전해요. */
  const BAD = /[<>&"'`\\]/g;
  const MAX_STR = 120, MAX_KEYS = 80, MAX_ARR = 60, MAX_DEPTH = 4;
  function scrub(v, depth) {
    const d = depth || 0;
    if (typeof v === "string") return v.replace(BAD, "").slice(0, MAX_STR);
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "boolean" || v === null || v === undefined) return v;
    if (d >= MAX_DEPTH) return null;
    if (Array.isArray(v)) return v.slice(0, MAX_ARR).map((x) => scrub(x, d + 1));
    if (typeof v === "object") {
      const out = {};
      let n = 0;
      for (const k of Object.keys(v)) {
        if (++n > MAX_KEYS) break;
        out[String(k).replace(BAD, "").slice(0, 40)] = scrub(v[k], d + 1);
      }
      return out;
    }
    return null;
  }

  async function submitHof(game, entry) {
    if (!enabled()) return false;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/hof`, {
        method: "POST",
        headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{
          id: `${game}-${String(entry.id)}`.replace(BAD, "").slice(0, 64),
          game,
          player: String(entry.name || "").replace(BAD, "").slice(0, 24),
          score: Math.round(entry.score) || 0,
          data: scrub(entry),
        }]),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // 테이블 생성 전에 은퇴한 로컬 기록을 DB로 1회 올려요 (중복은 upsert로 무시)
  async function backfillHof() {
    if (!enabled()) return;
    if (localStorage.getItem("grow-hof-synced") === "1") return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem("grow-hof-v1")) || []; } catch { list = []; }
    if (!list.length) { localStorage.setItem("grow-hof-synced", "1"); return; }
    let allOk = true;
    for (const e of list) {
      if (!e || !e.game || e.id == null) continue;
      const ok = await submitHof(e.game, e);
      if (!ok) allOk = false;
    }
    if (allOk) localStorage.setItem("grow-hof-synced", "1"); // 전부 성공했을 때만 완료 처리
  }

  /* 해당 게임의 전 세계 명예의 전당.
   *
   * ⚠️ **점수순 100명만 가져오면 달별 분류가 죽어요.**
   * 제보: "명예의 전당이 지금 상용에 월별 분류가 사라졌나???"
   * 사라진 게 아니라 **한 달치만 실려 있었어요.** 실측(축구 202명):
   * 7월 15명의 최고 점수가 2995인데 상위 100명의 컷이 3014였습니다 —
   * 19점 차로 7월이 통째로 빠졌고, 달이 하나뿐이라 탭이 안 떴어요.
   * 그리고 그 15명은 **어느 탭으로도 볼 수 없었습니다.**
   *
   * "최근 순으로 한 번 더" 가져와도 안 풀려요 — 7월은 점수도 낮고 최근도 아니라
   * 두 갈래 어디에도 안 걸립니다. 지난달은 **영원히 그렇습니다.**
   * 점수는 오래 쌓일수록 커지니, 이 컷은 시간이 갈수록 지난 달을 밀어내요.
   *
   * 그래서 **달마다 상위를 뽑아 오는 뷰**(hof_month_top · 달별 50명)를 씁니다.
   * 달 탭이 제 일을 하려면 각 달이 목록에 실려 있어야 해요.
   * 역대 상위 100명도 같이 가져와 합쳐요 — 뷰의 달별 컷에 밀린 옛 전설이
   * 전체 탭에서 사라지면 안 되니까요.
   * 뷰가 없는 환경(SQL을 아직 안 돌린 곳)에서는 점수순 하나로 굴러갑니다. */
  const HOF_LIMIT = 100, HOF_MONTH_LIMIT = 600;
  async function fetchHof(game) {
    if (!enabled()) return null;
    const q = async (table, order, limit) => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?game=eq.${game}&select=id,data&order=${order}&limit=${limit}`,
          { headers: headers() }
        );
        return res.ok ? await res.json() : null;
      } catch { return null; }
    };
    const [top, months] = await Promise.all([
      q("hof", "score.desc", HOF_LIMIT),
      q("hof_month_top", "score.desc", HOF_MONTH_LIMIT),
    ]);
    if (!top && !months) return null;
    const byId = new Map();
    for (const r of (top || []).concat(months || [])) {
      if (r && r.data && !byId.has(r.id)) byId.set(r.id, r.data);
    }
    // ⚠️ **받는 쪽이 진짜 방어선이에요** — 씻기 전에 올라간 값이 이미 있으니까요
    return [...byId.values()].map((d) => scrub(d)).filter(Boolean);
  }

  // cloud.js가 같은 접속 정보를 쓰도록 내보내요 (키를 두 곳에 두지 않으려고요)
  return { enabled, playerId, submit, roster, register, count, submitHof, fetchHof, backfillHof, scrub,
           cfg: { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } };
})();
