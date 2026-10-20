begin;
create table public.client_plan_reviews (
  id uuid primary key default gen_random_uuid(),
  access_hash text not null unique,
  active boolean not null default true,
  revision integer not null default 0,
  data jsonb not null,
  history jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
alter table public.client_plan_reviews enable row level security;
revoke all on public.client_plan_reviews from anon, authenticated;
grant all on public.client_plan_reviews to service_role;

create function public.client_plan_review_load(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.client_plan_reviews;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    return jsonb_build_object('error','invalid_link');
  end if;
  select * into r from public.client_plan_reviews
    where access_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and active;
  if not found then return jsonb_build_object('error','invalid_link'); end if;
  return jsonb_build_object('data',r.data,'revision',r.revision,'history',r.history,'updated_at',r.updated_at);
end $$;

create function public.client_plan_review_save(p_token text, p_expected_revision integer, p_changes jsonb, p_editor text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.client_plan_reviews;
  merged jsonb;
  k text;
  v jsonb;
  events jsonb := '[]';
  current_state jsonb;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    return jsonb_build_object('error','invalid_link');
  end if;
  select * into r from public.client_plan_reviews
    where access_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and active for update;
  if not found then return jsonb_build_object('error','invalid_link'); end if;
  current_state := jsonb_build_object('data',r.data,'revision',r.revision,'history',r.history,'updated_at',r.updated_at);
  if p_expected_revision is distinct from r.revision then
    return jsonb_build_object('error','conflict','current',current_state);
  end if;
  if jsonb_typeof(p_changes) is distinct from 'object' or octet_length(p_changes::text)>18000 then
    return jsonb_build_object('error','validation','message','These changes could not be saved. Please reload and try again.');
  end if;
  for k,v in select * from jsonb_each(p_changes) loop
    if not k=any(array['audience_agc','audience_lba','message1','message2','message3','reminder1_days','reminder2_days','sender','reply_owner','notes']) then
      return jsonb_build_object('error','validation','field',k,'message','This field cannot be changed.');
    end if;
    if k in ('audience_agc','audience_lba') then
      if jsonb_typeof(v) is distinct from 'boolean' then
        return jsonb_build_object('error','validation','field',k,'message','Choose the lead groups to include.');
      end if;
    elsif k in ('reminder1_days','reminder2_days') then
      if jsonb_typeof(v) is distinct from 'number' or v::text !~ '^([1-9]|[12][0-9]|30)$' then
        return jsonb_build_object('error','validation','field',k,'message','Use a whole number from 1 to 30 business days.');
      end if;
    else
      if jsonb_typeof(v) is distinct from 'string' or length(v#>>'{}')>2000
        or (k in ('sender','reply_owner') and length(v#>>'{}')>120)
        or (k in ('message1','message2','message3') and length(trim(v#>>'{}'))=0) then
        return jsonb_build_object('error','validation','field',k,'message','Enter a message, or shorten this field to fit.');
      end if;
    end if;
  end loop;
  merged := r.data || p_changes;
  if (merged->>'reminder2_days')::int <= (merged->>'reminder1_days')::int then
    return jsonb_build_object('error','validation','field','reminder2_days','message','The final reminder must be later than the first reminder.');
  end if;
  if not ((merged->>'audience_agc')::boolean or (merged->>'audience_lba')::boolean) then
    return jsonb_build_object('error','validation','field','audience_agc','message','Choose at least one lead group.');
  end if;
  for k,v in select * from jsonb_each(p_changes) loop
    if r.data->k is distinct from v then
      events := events || jsonb_build_array(jsonb_build_object('field',k,'old',r.data->k,'new',v,
        'editor',coalesce(nullif(left(trim(p_editor),60),''),'Reviewer'),'at',now(),'revision',r.revision+1));
    end if;
  end loop;
  if jsonb_array_length(events)=0 then return current_state; end if;
  update public.client_plan_reviews set data=merged,revision=revision+1,
    history=history||events,updated_at=now() where id=r.id returning * into r;
  return jsonb_build_object('data',r.data,'revision',r.revision,'history',r.history,'updated_at',r.updated_at);
end $$;

revoke all on function public.client_plan_review_load(text) from public;
revoke all on function public.client_plan_review_save(text,integer,jsonb,text) from public;
grant execute on function public.client_plan_review_load(text) to anon,authenticated;
grant execute on function public.client_plan_review_save(text,integer,jsonb,text) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
