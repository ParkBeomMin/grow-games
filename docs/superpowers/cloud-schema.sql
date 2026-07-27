-- 클라우드 세이브 스키마
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cloud_account (
  id      uuid primary key default gen_random_uuid(),
  created timestamptz not null default now()
);

create table if not exists public.cloud_device (
  token_hash text primary key,
  account_id uuid not null references public.cloud_account(id) on delete cascade,
  created    timestamptz not null default now(),
  seen       timestamptz not null default now()
);

create table if not exists public.cloud_save (
  account_id uuid not null references public.cloud_account(id) on delete cascade,
  game       text not null,
  data       jsonb not null,
  updated    timestamptz not null default now(),
  primary key (account_id, game)
);

create table if not exists public.cloud_code (
  code_hash  text primary key,
  account_id uuid not null references public.cloud_account(id) on delete cascade,
  created    timestamptz not null default now()
);

alter table public.cloud_account enable row level security;
alter table public.cloud_device  enable row level security;
alter table public.cloud_save    enable row level security;
alter table public.cloud_code    enable row level security;
-- 정책을 만들지 않는다 → anon은 직접 접근 불가. 아래 함수로만 접근한다.

-- 토큰 해시로 계정을 찾고, 없으면 만든다.
create or replace function public.cloud_account_of(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_acc  uuid;
begin
  if p_token is null or length(p_token) < 16 then
    raise exception '토큰이 올바르지 않아요';
  end if;
  select account_id into v_acc from public.cloud_device where token_hash = v_hash;
  if v_acc is null then
    insert into public.cloud_account default values returning id into v_acc;
    insert into public.cloud_device(token_hash, account_id) values (v_hash, v_acc);
  else
    update public.cloud_device set seen = now() where token_hash = v_hash;
  end if;
  return v_acc;
end;
$$;

create or replace function public.cloud_push(p_token text, p_game text, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_acc uuid := public.cloud_account_of(p_token);
  v_at  timestamptz;
begin
  insert into public.cloud_save(account_id, game, data, updated)
  values (v_acc, p_game, p_data, now())
  on conflict (account_id, game)
  do update set data = excluded.data, updated = now()
  returning updated into v_at;
  return v_at;
end;
$$;

create or replace function public.cloud_meta(p_token text)
returns table(game text, updated timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_acc uuid := public.cloud_account_of(p_token);
begin
  return query
    select s.game, s.updated from public.cloud_save s where s.account_id = v_acc;
end;
$$;

create or replace function public.cloud_pull(p_token text, p_game text default null)
returns table(game text, data jsonb, updated timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_acc uuid := public.cloud_account_of(p_token);
begin
  return query
    select s.game, s.data, s.updated
    from public.cloud_save s
    where s.account_id = v_acc
      and (p_game is null or s.game = p_game);
end;
$$;

-- 코드 발급 — 기존 코드는 무효가 된다. 원문은 여기서 한 번만 나간다.
create or replace function public.cloud_issue(p_token text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_acc  uuid := public.cloud_account_of(p_token);
  v_abc  text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 0 O 1 I L 제외
  v_code text := '';
  i int;
begin
  delete from public.cloud_code where account_id = v_acc;
  for i in 1..24 loop
    v_code := v_code || substr(v_abc, 1 + floor(random() * length(v_abc))::int, 1);
  end loop;
  insert into public.cloud_code(code_hash, account_id)
  values (encode(digest(v_code, 'sha256'), 'hex'), v_acc);
  -- 4자씩 하이픈으로 끊어 돌려준다
  return regexp_replace(v_code, '(.{4})(?=.)', '\1-', 'g');
end;
$$;

-- 코드로 이 기기를 그 계정에 연결한다. 일회용.
create or replace function public.cloud_claim(p_token text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_hash  text := encode(digest(v_clean, 'sha256'), 'hex');
  v_acc   uuid;
  v_dev   text := encode(digest(p_token, 'sha256'), 'hex');
begin
  select account_id into v_acc from public.cloud_code where code_hash = v_hash;
  if v_acc is null then
    return false;
  end if;
  insert into public.cloud_device(token_hash, account_id)
  values (v_dev, v_acc)
  on conflict (token_hash) do update set account_id = excluded.account_id, seen = now();
  delete from public.cloud_code where code_hash = v_hash;
  return true;
end;
$$;

-- 내부 헬퍼는 밖에서 못 부르게 막아요.
-- PUBLIC 부여분까지 회수해야 해요 — 함수는 만들 때 PUBLIC에 EXECUTE가 자동으로 붙거든요.
revoke all on function public.cloud_account_of(text) from public, anon, authenticated;
grant execute on function public.cloud_push(text, text, jsonb)   to anon;
grant execute on function public.cloud_meta(text)                to anon;
grant execute on function public.cloud_pull(text, text)          to anon;
grant execute on function public.cloud_issue(text)               to anon;
grant execute on function public.cloud_claim(text, text)         to anon;

-- ⚠️ 이 파일 이후에 적용한 변경이 있어요. 새 환경에 세울 땐 순서대로 실행하세요:
--   1) cloud-schema.sql        (이 파일)
--   2) cloud-claim-fix.sql     (cloud_claim 반환형을 jsonb로 — 같은 기기 입력 시 코드가 타던 문제)
