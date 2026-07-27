-- 세이브 행에 "마지막으로 올린 기기"를 남겨요.
--
-- 자기가 올린 기록을 상대로 충돌 화면이 뜨는 문제가 있었어요. 화면을 떠날 때 보내는
-- 전송(pagehide, keepalive)은 서버엔 닿는데 '올렸다'고 적는 코드가 못 돌아서,
-- 다음에 켜면 서버가 더 최신인데 로컬은 '안 올림' 상태로 남아요.
-- 저장 시각으로는 이걸 못 가려요 — 같은 세이브면 시각이 같아 판단이 안 서고,
-- 올린 뒤 한 판 더 했으면 시각이 달라져 '다른 기기'처럼 보여요.
-- 누가 썼는지는 시계와 무관하게 정확해요.
alter table public.cloud_save add column if not exists writer text;

create or replace function public.cloud_push(p_token text, p_game text, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_acc uuid;
  v_at  timestamptz;
  v_bare text := regexp_replace(coalesce(p_game, ''), '^beta:', '');
begin
  if v_bare not in ('rookie','idol','stock','dev','chef','stream','soccer','unicorn','_shared') then
    raise exception '알 수 없는 게임이에요';
  end if;
  if length(p_data::text) > 512000 then
    raise exception '세이브가 너무 커요';
  end if;
  v_acc := public.cloud_account_of(p_token);
  insert into public.cloud_save(account_id, game, data, updated, writer)
  values (v_acc, p_game, p_data, now(), encode(digest(p_token, 'sha256'), 'hex'))
  on conflict (account_id, game)
  do update set data = excluded.data, updated = now(), writer = excluded.writer
  returning updated into v_at;
  return v_at;
end;
$$;

-- mine = 이 행을 마지막으로 올린 게 당신인가. 클라이언트는 해시를 계산할 필요가 없어요.
-- 반환 컬럼이 늘어나 replace로는 안 돼요.
drop function if exists public.cloud_meta(text);
create function public.cloud_meta(p_token text)
returns table(game text, updated timestamptz, mine boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_acc uuid := public.cloud_account_of(p_token);
  v_dev text := encode(digest(p_token, 'sha256'), 'hex');
begin
  return query
    select s.game, s.updated, (s.writer is not null and s.writer = v_dev)
    from public.cloud_save s where s.account_id = v_acc;
end;
$$;

drop function if exists public.cloud_pull(text, text);
create function public.cloud_pull(p_token text, p_game text default null)
returns table(game text, data jsonb, updated timestamptz, mine boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_acc uuid := public.cloud_account_of(p_token);
  v_dev text := encode(digest(p_token, 'sha256'), 'hex');
begin
  return query
    select s.game, s.data, s.updated, (s.writer is not null and s.writer = v_dev)
    from public.cloud_save s
    where s.account_id = v_acc and (p_game is null or s.game = p_game);
end;
$$;

revoke all on function public.cloud_meta(text) from public;
revoke all on function public.cloud_pull(text, text) from public;
grant execute on function public.cloud_meta(text) to anon;
grant execute on function public.cloud_pull(text, text) to anon;
