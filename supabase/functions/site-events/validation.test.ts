import { validateEvent } from './validation.ts';
const fixture = () => ({id:crypto.randomUUID(),visitor_id:crypto.randomUUID(),session_id:crypto.randomUUID(),event_type:'page_view',path:'/',target:'',referrer_host:'',first_touch:{},last_touch:{},is_test:false});
Deno.test('valid event and strict path allowlist',()=>{
  if(!validateEvent(fixture())) throw Error('rejected');
  for(const path of ['/shared/customer/','/?email=a@b.com','//evil.com','/case/nope/']) if(validateEvent({...fixture(),path})) throw Error('unsafe path accepted');
});
Deno.test('malformed IDs, unsupported actions and unsafe campaign values rejected',()=>{
  for(const override of [{id:'x'},{event_type:'booking'},{first_touch:{utm_source:'a@b.com'}},{last_touch:{secret:'x'}},{target:'https://evil.com/?email=a@b.com'}]) if(validateEvent({...fixture(),...override})) throw Error('unsafe input accepted');
});
Deno.test('score pages: page_view and booking_click accepted on /score/ and /score/r/ only',()=>{
  for(const path of ['/score/','/score/r/']) for(const [event_type,target] of [['page_view',''],['booking_click','/im-ivanmanfredi/30min']])
    if(!validateEvent({...fixture(),path,event_type,target})) throw Error(`rejected ${event_type} on ${path}`);
  for(const path of ['/score','/score/r','/score/r/?t=abc','/score/x/','/score/r/x/']) if(validateEvent({...fixture(),path})) throw Error(`unsafe path accepted: ${path}`);
});
