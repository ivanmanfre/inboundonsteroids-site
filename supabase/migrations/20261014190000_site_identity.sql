begin;
-- One paid RB2B lookup per visitor IP (keyed by the collector's HMAC of the IP; the raw IP is never stored).
create table public.ios_web_identity_lookups (
  ip_key text primary key, client_id text not null default 'ivan' check(client_id='ivan'),
  visitor_id uuid not null, session_id uuid not null, path text not null,
  claimed_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  status text not null default 'pending' check(status in ('pending','done','error')),
  company jsonb, hems jsonb, top_md5 text, linkedin jsonb, business_profile jsonb,
  credits_used int not null default 0, error text
);
alter table public.ios_web_identity_lookups enable row level security;
revoke all on public.ios_web_identity_lookups from anon, authenticated;
grant all on public.ios_web_identity_lookups to service_role;

create function public.ios_web_claim_identity(p_ip_key text,p_visitor uuid,p_session uuid,p_path text) returns boolean
language sql security definer set search_path=pg_catalog,public as $$
  with ins as (
    insert into public.ios_web_identity_lookups(ip_key,visitor_id,session_id,path) values(p_ip_key,p_visitor,p_session,p_path)
    on conflict(ip_key) do nothing returning 1)
  select exists(select 1 from ins);
$$;

create function public.ios_web_save_identity(p_ip_key text,p_result jsonb) returns void
language sql security definer set search_path=pg_catalog,public as $$
  update public.ios_web_identity_lookups set
    status=case when p_result ? 'error' then 'error' else 'done' end,
    company=p_result->'company', hems=p_result->'hems', top_md5=p_result->>'top_md5',
    linkedin=p_result->'linkedin', business_profile=p_result->'business_profile',
    credits_used=coalesce((p_result->>'credits_used')::int,0), error=p_result->>'error', updated_at=now()
  where ip_key=p_ip_key;
$$;
revoke all on function public.ios_web_claim_identity(text,uuid,uuid,text),public.ios_web_save_identity(text,jsonb) from public,anon,authenticated;
grant execute on function public.ios_web_claim_identity(text,uuid,uuid,text),public.ios_web_save_identity(text,jsonb) to service_role;

-- Each looked-up visitor with what they did on the site.
create view public.ios_web_identities with (security_invoker=true) as
select l.claimed_at, l.status, l.credits_used, l.company, l.linkedin, l.business_profile, l.error,
  l.visitor_id,
  (select count(*) from public.ios_web_events e where e.visitor_id=l.visitor_id and e.event_type='page_view') as page_views,
  (select count(*) from public.ios_web_events e where e.visitor_id=l.visitor_id and e.event_type='booking_click') as booking_clicks,
  (select array_agg(distinct e.path) from public.ios_web_events e where e.visitor_id=l.visitor_id) as paths,
  (select e.first_touch from public.ios_web_events e where e.visitor_id=l.visitor_id order by e.created_at limit 1) as first_touch,
  (select max(e.created_at) from public.ios_web_events e where e.visitor_id=l.visitor_id) as last_seen
from public.ios_web_identity_lookups l;
revoke all on public.ios_web_identities from anon,authenticated;
grant select on public.ios_web_identities to service_role;
commit;
