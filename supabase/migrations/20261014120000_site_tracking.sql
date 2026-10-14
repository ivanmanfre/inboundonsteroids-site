begin;
create table public.ios_web_events (
  id uuid primary key, client_id text not null default 'ivan' check(client_id='ivan'),
  created_at timestamptz not null default now(), visitor_id uuid not null, session_id uuid not null,
  event_type text not null check(event_type in ('page_view','booking_click','case_click','resource_click')),
  path text not null, target text not null default '', referrer_host text not null default '',
  first_touch jsonb not null, last_touch jsonb not null, is_test boolean not null default false, is_bot boolean not null default false
);
create index ios_web_events_session on public.ios_web_events(session_id,created_at desc);
create index ios_web_events_date on public.ios_web_events(created_at);
create table public.ios_web_bookings (
  calendly_invitee_uri text primary key, client_id text not null default 'ivan' check(client_id='ivan'),
  calendly_event_uri text, session_id uuid not null, click_event_id uuid not null references public.ios_web_events(id),
  status text not null check(status in ('booked','canceled')), booked_at timestamptz not null,
  updated_at timestamptz not null default now(), event_start_time timestamptz, is_test boolean not null,
  campaign jsonb not null, original_utm_content text
);
create table public.ios_web_cancellations (calendly_invitee_uri text primary key, canceled_at timestamptz not null default now());
alter table public.ios_web_cancellations enable row level security;
revoke all on public.ios_web_cancellations from anon,authenticated;
grant all on public.ios_web_cancellations to service_role;
create table public.ios_web_rate_limits(rate_key text primary key, window_at timestamptz not null, hits int not null);
alter table public.ios_web_events enable row level security;
alter table public.ios_web_bookings enable row level security;
alter table public.ios_web_rate_limits enable row level security;
revoke all on public.ios_web_events,public.ios_web_bookings,public.ios_web_rate_limits from anon, authenticated;
grant all on public.ios_web_events,public.ios_web_bookings,public.ios_web_rate_limits to service_role;
create function public.ios_web_ingest_event(p_event jsonb,p_rate_key text) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare n int;
begin
  insert into public.ios_web_rate_limits values(p_rate_key,date_trunc('minute',now()),1)
  on conflict(rate_key) do update set window_at=excluded.window_at,
    hits=case when public.ios_web_rate_limits.window_at=excluded.window_at then public.ios_web_rate_limits.hits+1 else 1 end
  returning hits into n;
  if n>120 then return false; end if;
  insert into public.ios_web_events(id,visitor_id,session_id,event_type,path,target,referrer_host,first_touch,last_touch,is_test,is_bot)
  values((p_event->>'id')::uuid,(p_event->>'visitor_id')::uuid,(p_event->>'session_id')::uuid,p_event->>'event_type',p_event->>'path',p_event->>'target',p_event->>'referrer_host',p_event->'first_touch',p_event->'last_touch',(p_event->>'is_test')::boolean,(p_event->>'is_bot')::boolean)
  on conflict(id) do nothing;
  return true;
end $$;
create function public.ios_web_record_booking(p_event text,p_payload jsonb) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare marker text; sid uuid; click public.ios_web_events; content text; invitee text;
begin
  if p_event not in ('invitee.created','invitee.canceled') then return false; end if;
  invitee := p_payload->>'uri';
  if invitee is null or invitee not like 'https://api.calendly.com/scheduled_events/%/invitees/%' then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(invitee, 0));
  if p_event='invitee.canceled' then
    insert into public.ios_web_cancellations(calendly_invitee_uri) values(invitee) on conflict do nothing;
    update public.ios_web_bookings set status='canceled',updated_at=now() where calendly_invitee_uri=invitee;
    if found then return true; end if;
  end if;
  content := p_payload->'tracking'->>'utm_content';
  marker := substring(content from '(?:^|\|)ios:([a-f0-9-]{36})$');
  if marker is null then return false; end if;
  begin sid:=marker::uuid; exception when invalid_text_representation then return false; end;
  select * into click from public.ios_web_events where session_id=sid and event_type='booking_click' and not is_bot order by created_at desc limit 1;
  if not found then return false; end if;
  insert into public.ios_web_bookings(calendly_invitee_uri,calendly_event_uri,session_id,click_event_id,status,booked_at,event_start_time,is_test,campaign,original_utm_content)
  values(invitee,p_payload->'scheduled_event'->>'uri',sid,click.id,case when p_event='invitee.canceled' or exists(select 1 from public.ios_web_cancellations where calendly_invitee_uri=invitee) then 'canceled' else 'booked' end,
    coalesce((p_payload->>'created_at')::timestamptz,now()),(p_payload->'scheduled_event'->>'start_time')::timestamptz,
    click.is_test or coalesce(p_payload->>'email','') ~* '(@anthropic\.com|@ivanmanfredi\.com|^test|^e2e)',click.last_touch,
    nullif(regexp_replace(content,'(?:\|)?ios:[a-f0-9-]{36}$',''),''))
  on conflict(calendly_invitee_uri) do update set status=case when public.ios_web_bookings.status='canceled' then 'canceled' else excluded.status end,updated_at=now();
  return true;
end $$;
revoke all on function public.ios_web_ingest_event(jsonb,text),public.ios_web_record_booking(text,jsonb) from public,anon,authenticated;
grant execute on function public.ios_web_ingest_event(jsonb,text),public.ios_web_record_booking(text,jsonb) to service_role;
create view public.ios_web_tracking_daily with (security_invoker=true) as
select (created_at at time zone 'Europe/Warsaw')::date as day,path,
 coalesce(nullif(last_touch->>'utm_source',''),nullif(last_touch->>'referrer_host',''),'direct') as source,
 last_touch->>'utm_campaign' as campaign,
 count(*) filter(where event_type='page_view') as page_views,
 count(distinct session_id) filter(where event_type='page_view') as sessions,
 count(*) filter(where event_type='booking_click') as booking_clicks
from public.ios_web_events where not is_test and not is_bot group by 1,2,3,4;
revoke all on public.ios_web_tracking_daily from anon,authenticated;
grant select on public.ios_web_tracking_daily to service_role;
comment on table public.ios_web_events is 'Ivan website activity. Browser IDs are anonymous identifiers. Exclude test and bot traffic in reports.';
create view public.ios_web_booking_daily with (security_invoker=true) as
select (booked_at at time zone 'Europe/Warsaw')::date as day,
 coalesce(nullif(campaign->>'utm_source',''),nullif(campaign->>'referrer_host',''),'direct') as source,
 campaign->>'utm_campaign' as campaign,
 count(*) filter(where status='booked') as bookings,
 count(*) filter(where status='canceled') as canceled_bookings
from public.ios_web_bookings where not is_test group by 1,2,3;
revoke all on public.ios_web_booking_daily from anon,authenticated;
grant select on public.ios_web_booking_daily to service_role;
commit;
