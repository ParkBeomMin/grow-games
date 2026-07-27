-- 연동 코드를 재사용 가능하게 바꿔요.
-- 예전엔 한 번 쓰면 사라져서, 기기를 셋째·넷째 붙이려면 매번 새로 발급해야 했어요.
-- 이제 '새로 발급'할 때까지 계속 유효해요 — 재발급이 유일한 무효화 수단이에요.
create or replace function public.cloud_claim(p_token text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_hash  text;
  v_acc   uuid;
  v_dev   text;
  v_cur   uuid;
begin
  if p_token is null or length(p_token) < 16 then
    return jsonb_build_object('ok', false, 'reason', 'bad_token');
  end if;
  v_hash := encode(digest(v_clean, 'sha256'), 'hex');
  v_dev  := encode(digest(p_token, 'sha256'), 'hex');

  select account_id into v_acc from public.cloud_code where code_hash = v_hash;
  if v_acc is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select account_id into v_cur from public.cloud_device where token_hash = v_dev;
  if v_cur = v_acc then
    -- 이 기기에서 발급한(또는 이미 이 계정인) 코드예요. 바꿀 게 없어요.
    return jsonb_build_object('ok', false, 'reason', 'same_device');
  end if;

  insert into public.cloud_device(token_hash, account_id)
  values (v_dev, v_acc)
  on conflict (token_hash) do update set account_id = excluded.account_id, seen = now();
  -- 코드를 지우지 않아요. 새로 발급할 때 cloud_issue가 지워줘요.
  return jsonb_build_object('ok', true);
end;
$$;
