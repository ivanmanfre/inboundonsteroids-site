import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReviewState} from '../shared/proswppp-linkedin/state.mjs';
const seed=()=>({revision:0,data:{notes:'',message1:'Hello',sender:''},history:[]});
function setup({doc=seed(),write,storage}={}) {
  let remote=structuredClone(doc);
  const backup=storage??new Map();
  const state=new ReviewState({read:async()=>structuredClone(remote),write:write??(async(revision,changes)=>{
    remote={...remote,revision:revision+1,data:{...remote.data,...changes}};
    return structuredClone(remote);
  }),storage:{getItem:k=>backup.get(k)??null,setItem:(k,v)=>backup.set(k,v),removeItem:k=>backup.delete(k)},storageKey:'review-test'});
  return {state,backup,remote:()=>remote};
}
test('only reports saved after a successful server response and independent reload',async()=>{
  const {state,remote}=setup(); await state.load(); state.edit('notes','Derek edit');
  assert.equal(state.status,'dirty');await state.save();assert.equal(state.status,'saved');
  const second=setup({doc:remote()}).state;await second.load();assert.equal(second.draft.notes,'Derek edit');
});
test('failed writes keep unsaved text and never claim a successful save',async()=>{
  const {state,backup}=setup({write:async()=>{throw Error('HTTP 503')}});await state.load();state.edit('notes','Keep this');await state.save();
  assert.equal(state.status,'error');assert.equal(state.draft.notes,'Keep this');assert.equal(state.doc.revision,0);
  assert.equal(JSON.parse(backup.get('review-test')).draft.notes,'Keep this');
});
test('an edit made during a save survives its older acknowledgment, including reverting to the old value',async()=>{
  let release;const {state}=setup({write:()=>new Promise(r=>release=r)});await state.load();state.edit('notes','First edit');
  const pending=state.save();state.edit('notes','');release({revision:1,data:{notes:'First edit',message1:'Hello',sender:''},history:[]});await pending;
  assert.equal(state.draft.notes,'');assert.equal(state.status,'dirty');assert.equal(state.changes.notes,'');
});
test('recovery merges unrelated server changes and pauses on a same-field conflict',async()=>{
  const a=setup();await a.state.load();a.state.edit('notes','Local');
  const b=setup({storage:a.backup,doc:{...seed(),revision:1,data:{...seed().data,sender:'Derek'}}});await b.state.load();
  assert.equal(b.state.draft.sender,'Derek');assert.equal(b.state.draft.notes,'Local');assert.equal(b.state.status,'dirty');
  const c=setup({storage:a.backup,doc:{...seed(),revision:1,data:{...seed().data,notes:'Remote'}}});await c.state.load();
  assert.equal(c.state.status,'conflict');assert.equal(c.state.draft.notes,'Local');assert.equal(c.state.conflict.data.notes,'Remote');
});
test('stale save exposes the current version and requires an explicit choice',async()=>{
  const current={...seed(),revision:1,data:{...seed().data,notes:'Other person'}};
  const {state}=setup({write:async()=>({error:'conflict',current})});await state.load();state.edit('notes','Mine');await state.save();
  assert.equal(state.status,'conflict');state.resolveConflict('mine');assert.equal(state.doc.revision,1);
  assert.equal(state.draft.notes,'Mine');assert.equal(state.status,'dirty');
  state.conflict=current;state.resolveConflict('saved');assert.equal(state.draft.notes,'Other person');assert.equal(state.status,'saved');
});
test('unavailable device storage does not block online saving or claim local backup',async()=>{
  const {state}=setup();state.storage={getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){throw Error('denied')}};
  await state.load();state.edit('notes','Online only');assert.equal(state.deviceBackup,false);await state.save();assert.equal(state.status,'saved');
});
test('invalid access never enables editing or saving',async()=>{
  const {state}=setup();state.read=async()=>({error:'invalid_link'});await state.load();assert.equal(state.status,'invalid');
  assert.throws(()=>state.edit('notes','no'));assert.equal(state.doc,null);
});
test('reloading an unresolved conflict still requires a choice',async()=>{
  const a=setup();await a.state.load();a.state.edit('notes','Local');
  const remote={...seed(),revision:1,data:{...seed().data,notes:'Remote'}};
  const b=setup({storage:a.backup,doc:remote});await b.state.load();assert.equal(b.state.status,'conflict');
  const c=setup({storage:a.backup,doc:remote});await c.state.load();assert.equal(c.state.status,'conflict');
});
test('access revoked during a save prevents further edits',async()=>{
  const {state}=setup({write:async()=>({error:'invalid_link'})});await state.load();state.edit('notes','Hold');await state.save();
  assert.equal(state.status,'invalid');assert.throws(()=>state.edit('notes','Should not change'));
});
