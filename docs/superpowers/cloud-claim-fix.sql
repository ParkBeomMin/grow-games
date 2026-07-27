-- 같은 기기에서 자기 코드를 넣어봤을 때 코드가 타버리던 문제를 고쳐요.
-- 반환형을 jsonb로 바꿔서 "왜 안 됐는지"를 클라이언트가 구분할 수 있게 해요.
drop function if exists public.cloud_claim(text, text);

create function public.cloud_claim(p_token text, p_code text)
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
    -- 이 기기에서 발급한 코드예요. 아무것도 바꾸지 않고, 코드도 살려둬요.
    -- (예전엔 여기서 지워버려서, 한번 넣어본 것만으로 코드가 타버렸어요)
    return jsonb_build_object('ok', false, 'reason', 'same_device');
  end if;

  insert into public.cloud_device(token_hash, account_id)
  values (v_dev, v_acc)
  on conflict (token_hash) do update set account_id = excluded.account_id, seen = now();
  delete from public.cloud_code where code_hash = v_hash;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cloud_claim(text, text) from public;
grant execute on function public.cloud_claim(text, text) to anon;
