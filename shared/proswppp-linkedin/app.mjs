import {ReviewState} from './state.mjs';
import {API_URL,ANON_KEY} from './config.mjs';

const $=s=>document.querySelector(s);
const tabs=[...document.querySelectorAll('[data-tab]')];
const fields=[...document.querySelectorAll('[data-field]')];
const form=$('#review-form');
const dialog=$('#conflict-dialog');
const token=new URLSearchParams(location.hash.slice(1)).get('review')||'';
const validToken=/^[A-Za-z0-9_-]{43}$/.test(token);
const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
const storageKey='proswppp-plan:'+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
let storage;
try {storage=window.sessionStorage;} catch {storage={getItem(){throw Error('Storage unavailable')},setItem(){throw Error('Storage unavailable')},removeItem(){throw Error('Storage unavailable')}};}
let timer,historySignature='',activeTab='process';
$('.skip').addEventListener('click',e=>{e.preventDefault();$('#workspace').focus();$('#workspace').scrollIntoView({block:'start'});});

function selectTab(name,focus=false) {
  activeTab=name;
  for (const tab of tabs) {
    const selected=tab.dataset.tab===name;
    tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
    $('#'+tab.dataset.tab).hidden=!selected;
    if(selected&&focus) tab.focus();
  }
  requestAnimationFrame(sizeMessages);
}
tabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>selectTab(tab.dataset.tab));
  tab.addEventListener('keydown',e=>{
    let n;
    if(['ArrowDown','ArrowRight'].includes(e.key)) n=(i+1)%tabs.length;
    if(['ArrowUp','ArrowLeft'].includes(e.key)) n=(i+tabs.length-1)%tabs.length;
    if(e.key==='Home') n=0;if(e.key==='End') n=tabs.length-1;
    if(n!==undefined){e.preventDefault();selectTab(tabs[n].dataset.tab,true);}
  });
});
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>{
  selectTab(button.dataset.go);$('#workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  $('#'+button.dataset.go).focus({preventScroll:true});
}));

async function rpc(name,payload) {
  const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),12000);
  try {
    const response=await window.fetch(API_URL+name,{method:'POST',headers:{apikey:ANON_KEY,Authorization:'Bearer '+ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal,cache:'no-store',referrerPolicy:'no-referrer'});
    if(!response.ok) throw Error('The shared review is unavailable. Your unsaved edits are kept here. Try saving again.');
    return await response.json();
  } catch(e) {
    if(e.name==='AbortError') throw Error('The connection took too long. Your edits are kept here. Try again.');
    if(e instanceof TypeError) throw Error('No connection to the shared review. Reconnect and try again.');
    throw e;
  } finally {clearTimeout(timeout);}
}

const names={audience_agc:'AGC lead group',audience_lba:'LBA lead group',message1:'First message',message2:'Reminder',message3:'Final reminder',reminder1_days:'First reminder timing',reminder2_days:'Final reminder timing',sender:'Sending account',reply_owner:'Person handling replies',notes:'Feedback'};
function displayValue(field,value) {
  if(typeof value==='boolean') return value?'Included':'Not included';
  if(field.endsWith('_days')) return value+' business days after the first message';
  return value||'(blank)';
}
function node(tag,text,className) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function renderHistory(doc) {
  const history=doc?.history||[];const signature=JSON.stringify(history);
  $('#history-count').textContent=history.length;
  if(signature===historySignature) return;historySignature=signature;
  if(!history.length) return;
  const entries=[...history].reverse().map(event=>{
    const details=node('details',undefined,'history-entry'),summary=node('summary');
    const heading=node('div');heading.append(node('h3',names[event.field]||'Review changed'));
    const when=node('time',new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(event.at)));
    when.dateTime=event.at;heading.append(when);summary.append(heading,node('span',event.editor||'Reviewer','actor'));details.append(summary);
    for(const [label,key] of [['Before','old'],['Saved edit','new']]) {
      const p=node('div',undefined,'change-text');p.append(node('strong',label),node('span',displayValue(event.field,event[key])));details.append(p);
    }
    return details;
  });
  $('#history-list').replaceChildren(...entries);
}
function sizeMessages(){document.querySelectorAll('.message-input').forEach(e=>{if(!e.closest('[hidden]')){e.style.height='auto';e.style.height=e.scrollHeight+2+'px';}});}

function valid(show=false) {
  const a=$('#reminder1_days'),b=$('#reminder2_days');
  b.setCustomValidity(Number.isFinite(a.valueAsNumber)&&Number.isFinite(b.valueAsNumber)&&b.valueAsNumber<=a.valueAsNumber?'The final reminder must be later than the first reminder.':'');
  const agc=$('[data-field=audience_agc]'),lba=$('[data-field=audience_lba]');
  agc.setCustomValidity(!agc.checked&&!lba.checked?'Choose at least one lead group.':'');
  const okay=form.checkValidity();
  if(!okay&&show) {
    const first=form.querySelector('input:invalid,textarea:invalid');
    if(first){selectTab(first.closest('.panel').id);first.focus();first.reportValidity();}
  }
  return okay;
}
function fieldFeedback(el) {
  const id='validation-'+el.dataset.field;
  document.getElementById(id)?.remove();
  el.setAttribute('aria-invalid',String(!el.checkValidity()));
  if(el.checkValidity()){el.removeAttribute('aria-describedby');return;}
  const message=node('p',el.validationMessage,'validation-error');message.id=id;message.setAttribute('role','alert');
  (el.closest('.timing-control')||el.closest('.audience')||el).insertAdjacentElement('afterend',message);
  el.setAttribute('aria-describedby',id);
}
function schedule() {clearTimeout(timer);timer=setTimeout(()=>{if(valid())state.save();},1000);}
function render(state) {
  const blocked=!state.doc||state.status==='invalid'||Boolean(state.conflict);
  for(const el of fields) {
    el.disabled=blocked;
    const v=state.draft[el.dataset.field];
    if(v!==undefined) {
      if(el.type==='checkbox')el.checked=v;
      else if(el.value!==String(v)&&!(el.type==='number'&&Number.isNaN(v)))el.value=v;
    }
  }
  $('#editor').disabled=blocked;
  if(document.activeElement!==$('#editor'))$('#editor').value=state.editor;
  for(const e of document.querySelectorAll('[data-day]'))e.textContent=Number.isFinite(state.draft[e.dataset.day])?state.draft[e.dataset.day]:'?';
  const states={loading:['Loading...','Connecting to the shared review'],saved:['All changes saved','Shared with Ivan'],dirty:['Unsaved changes',state.deviceBackup?'Saving automatically as you edit':'Keep this page open until saved'],saving:['Saving...','Keep this page open'],error:['Not saved','Keep this page open and try again'],conflict:['Compare changes first','Your edits are kept in this tab'],invalid:['Review link needed','Ask Ivan for the full review link']};
  const [title,detail]=states[state.status];$('#save-status').textContent=title;$('#save-detail').textContent=detail;
  $('#save-status').style.color=['error','conflict','invalid'].includes(state.status)?'#9a3b2b':state.status==='saved'?'#25765b':'#587080';
  $('#save-button').disabled=state.status==='loading'||state.status==='saving'||state.status==='invalid'||Boolean(state.conflict)||(state.doc&&!Object.keys(state.changes).length);
  $('#save-button').textContent=state.status==='error'&&!state.doc?'Try again':'Save changes';
  const notice=$('#access-notice');notice.hidden=Boolean(state.doc)&&state.status!=='invalid';
  notice.textContent=state.status==='invalid'?'Open the full review link from Ivan to load and edit this document.':state.status==='error'?'The review could not be loaded. Use Try again below.':'Loading the shared review...';
  $('#save-error').hidden=!state.error;$('#save-error').textContent=state.error||'';
  $('#conflict-banner').hidden=!state.conflict;
  renderHistory(state.doc);sizeMessages();
  if(state.status==='dirty')schedule();else clearTimeout(timer);
}

const state=new ReviewState({read:()=>validToken?rpc('client_plan_review_load',{p_token:token}):Promise.resolve({error:'invalid_link'}),write:(revision,changes,editor)=>rpc('client_plan_review_save',{p_token:token,p_expected_revision:revision,p_changes:changes,p_editor:editor}),storage,storageKey,onChange:render});
try {state.editor=storage.getItem(storageKey+':editor')||'';} catch{}
fields.forEach(el=>{
  el.addEventListener('input',()=>{
    el.setCustomValidity('');el.removeAttribute('aria-invalid');
    document.getElementById('validation-'+el.dataset.field)?.remove();el.removeAttribute('aria-describedby');
    const value=el.type==='checkbox'?el.checked:el.type==='number'?el.valueAsNumber:el.value;
    state.edit(el.dataset.field,value);
  });
  el.addEventListener('blur',()=>{valid();fieldFeedback(el);if(state.status==='dirty'&&valid())schedule();});
});
$('#editor').addEventListener('input',e=>{state.editor=e.target.value;try{storage.setItem(storageKey+':editor',state.editor);}catch{}state.backup();});
$('#save-button').addEventListener('click',()=>{clearTimeout(timer);if(!state.doc)state.load();else if(valid(true))state.save();});
form.addEventListener('submit',e=>{e.preventDefault();if(valid(true))state.save();});
addEventListener('online',()=>{if(state.doc&&Object.keys(state.changes).length&&valid())state.save();else if(!state.doc&&state.status==='error')state.load();});
addEventListener('beforeunload',e=>{if(Object.keys(state.changes).length){e.preventDefault();e.returnValue='';}});
addEventListener('hashchange',()=>location.reload());
$('#review-conflict').addEventListener('click',()=>{
  const rows=Object.entries(state.changes).map(([field,value])=>{
    const wrap=node('div',undefined,'conflict-pair');wrap.append(node('h3',names[field]||field),node('h4','Saved version'),node('pre',displayValue(field,state.conflict.data[field])),node('h4','Your edit'),node('pre',displayValue(field,value)));return wrap;
  });
  $('#conflict-list').replaceChildren(...rows);dialog.showModal();
});
$('#use-saved').addEventListener('click',()=>{dialog.close();state.resolveConflict('saved');});
$('#keep-mine').addEventListener('click',()=>{dialog.close();state.resolveConflict('mine');});
await state.load();
