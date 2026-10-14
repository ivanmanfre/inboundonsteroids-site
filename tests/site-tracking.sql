do $$
declare sid uuid:=gen_random_uuid(); eid uuid:=gen_random_uuid(); inv text:='https://api.calendly.com/scheduled_events/test/ invitees/test'; e jsonb; p jsonb; result boolean;
begin
  inv:='https://api.calendly.com/scheduled_events/test/invitees/'||sid;
  e:=jsonb_build_object('id',eid,'visitor_id',gen_random_uuid(),'session_id',sid,'event_type','booking_click','path','/','target','/im-ivanmanfredi/30min','referrer_host','','first_touch','{}'::jsonb,'last_touch','{"utm_source":"linkedin","utm_content":"post42"}'::jsonb,'is_test',true,'is_bot',false);
  perform public.ios_web_ingest_event(e,'sql-test'); perform public.ios_web_ingest_event(e,'sql-test');
  if (select count(*) from public.ios_web_events where id=eid)<>1 then raise exception 'duplicate'; end if;
  p:=jsonb_build_object('uri',inv,'email','test-site@example.com','tracking',jsonb_build_object('utm_content','post42|ios:'||sid),'scheduled_event',jsonb_build_object('uri','https://api.calendly.com/scheduled_events/test','start_time',now()+interval '1 day'));
  if not public.ios_web_record_booking('invitee.created',p) then raise exception 'booking unmatched'; end if;
  perform public.ios_web_record_booking('invitee.created',p);
  if (select count(*) from public.ios_web_bookings where calendly_invitee_uri=inv)<>1 then raise exception 'booking duplicate'; end if;
  if (select original_utm_content from public.ios_web_bookings where calendly_invitee_uri=inv) is distinct from 'post42' then raise exception 'content lost'; end if;
  if not public.ios_web_record_booking('invitee.canceled',jsonb_build_object('uri',inv)) then raise exception 'cancel unmatched'; end if;
  perform public.ios_web_record_booking('invitee.created',p);
  if (select status from public.ios_web_bookings where calendly_invitee_uri=inv) is distinct from 'canceled' then raise exception 'cancel reverted'; end if;
  inv:=inv||'-out-of-order';
  perform public.ios_web_record_booking('invitee.canceled',jsonb_build_object('uri',inv));
  p:=jsonb_set(p,'{uri}',to_jsonb(inv));
  perform public.ios_web_record_booking('invitee.created',p);
  if (select status from public.ios_web_bookings where calendly_invitee_uri=inv) is distinct from 'canceled' then raise exception 'early cancellation lost'; end if;
  if exists(select 1 from public.ios_web_tracking_daily) then raise exception 'test leaked into reporting'; end if;
  if has_function_privilege('anon','public.ios_web_record_booking(text,jsonb)','execute') then raise exception 'public booking rpc'; end if;
  if has_table_privilege('anon','public.ios_web_events','select') then raise exception 'public events'; end if;
end $$;
select 'site tracking SQL tests passed' as result;
