begin;
insert into public.client_plan_reviews(access_hash, data) values (
 encode(sha256(convert_to(repeat('t',43),'UTF8')),'hex'),
 '{"audience_agc":true,"audience_lba":true,"message1":"First message","message2":"Reminder","message3":"Last reminder","reminder1_days":3,"reminder2_days":7,"sender":"","reply_owner":"","notes":""}'
);
set local role anon;
do $$
declare got jsonb; denied boolean := false;
begin
  got := public.client_plan_review_load(repeat('x',43));
  assert got->>'error'='invalid_link','Unknown capability must not read a review';
  got := public.client_plan_review_save(repeat('x',43),0,'{"notes":"intrusion"}','Test');
  assert got->>'error'='invalid_link','Unknown capability must not write a review';
  got := public.client_plan_review_load(repeat('t',43));
  assert got->>'revision'='0' and got->'data'->>'message1'='First message','Load must return saved state';
  got := public.client_plan_review_save(repeat('t',43),0,'{"notes":"Saved from another device"}','Derek');
  assert got->>'revision'='1','Save must advance revision';
  assert got->'history'->0->>'old'='' and got->'history'->0->>'new'='Saved from another device','History must persist before and after';
  got := public.client_plan_review_save(repeat('t',43),0,'{"notes":"stale overwrite"}','Ivan');
  assert got->>'error'='conflict' and got->'current'->'data'->>'notes'='Saved from another device','Stale write must return current state without overwrite';
  got := public.client_plan_review_save(repeat('t',43),1,'{"admin":true}','Test');
  assert got->>'error'='validation','Unknown fields must be rejected';
  got := public.client_plan_review_save(repeat('t',43),1,'{"reminder2_days":2}','Test');
  assert got->>'error'='validation' and got->>'field'='reminder2_days','Reminder order must be enforced';
  got := public.client_plan_review_save(repeat('t',43),1,'{"message1":"   "}','Test');
  assert got->>'error'='validation','Empty copy must be rejected';
  got := public.client_plan_review_save(repeat('t',43),1,'{"audience_agc":false,"audience_lba":false}','Test');
  assert got->>'error'='validation','At least one audience must remain';
  got := public.client_plan_review_save(repeat('t',43),1,'{"notes":"Saved from another device"}','Derek');
  assert got->>'revision'='1' and jsonb_array_length(got->'history')=1,'Unchanged saves must not create events';
  got := public.client_plan_review_save(repeat('t',43),1,'{"reminder1_days":5,"reminder2_days":10}','Test');
  assert got->>'revision'='2' and got->'data'->>'reminder2_days'='10','A complete timing patch must persist';
  got := public.client_plan_review_load(repeat('t',43));
  assert got->>'revision'='2' and got->'data'->>'notes'='Saved from another device','Independent read must retain prior fields';
  begin
    perform data from public.client_plan_reviews;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied,'Anonymous direct table reads must be denied';
end $$;
rollback;
