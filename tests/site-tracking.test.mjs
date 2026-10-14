import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const source = () => readFileSync(new URL('../assets/site-tracking.js', import.meta.url), 'utf8');
function page(url, storage = new Map(), privacy = false, brokenStorage = false) {
  const events = [], listeners = {};
  const link = { href: 'https://calendly.com/im-ivanmanfredi/30min', textContent: 'Book', closest: () => link };
  const store = { getItem: k => { if(brokenStorage) throw Error(); return storage.get(k)||null; }, setItem: (k,v) => { if(brokenStorage) throw Error(); storage.set(k,v); } };
  const document = { referrer: '', querySelectorAll: () => [link], addEventListener: (k,fn) => listeners[k]=fn };
  vm.runInNewContext(source(), { window: { location: new URL(url) }, location: new URL(url), document, localStorage:store, navigator:{ doNotTrack: privacy?'1':null, sendBeacon:(_u,b)=>{events.push(JSON.parse(b));return true;} }, crypto:webcrypto, URL, URLSearchParams, Date, JSON, fetch:()=>Promise.resolve(), console });
  return { events, link, click:()=>listeners.click?.({target:link}), auxclick:()=>listeners.auxclick?.({target:link,button:1}), storage };
}
test('campaign survives case navigation and all five tags reach Calendly', () => {
  const p = page('https://inboundonsteroids.com/?utm_source=linkedin&utm_medium=social&utm_campaign=launch&utm_term=owners&utm_content=post42');
  const q = page('https://inboundonsteroids.com/case/kyle-hunt/',p.storage); q.click();
  const params = new URL(q.link.href).searchParams;
  assert.equal(params.get('utm_source'),'linkedin'); assert.equal(params.get('utm_term'),'owners');
  assert.match(params.get('utm_content'),/^post42\|ios:[a-f0-9-]{36}$/);
  assert.equal(q.events[0].session_id,p.events[0].session_id);
  assert.equal(q.events[1].event_type,'booking_click');
  assert.equal(q.events[1].path,'/case/kyle-hunt/');
});
test('new campaign updates last touch while retaining first touch', () => {
  const p=page('https://inboundonsteroids.com/?utm_source=linkedin');
  const q=page('https://inboundonsteroids.com/?utm_source=newsletter',p.storage);
  assert.equal(q.events[0].first_touch.utm_source,'linkedin');
  assert.equal(q.events[0].last_touch.utm_source,'newsletter');
});
test('owner visits excluded, DNT does not collect or store identifiers', () => {
  assert.equal(page('https://inboundonsteroids.com/?me=1').events[0].is_test,true);
  const p=page('https://inboundonsteroids.com/?utm_source=linkedin',new Map(),true);
  assert.equal(p.events.length,0); assert.equal(p.storage.size,0);
  assert.equal(new URL(p.link.href).searchParams.get('utm_source'),'linkedin');
  assert.equal(new URL(p.link.href).searchParams.has('utm_content'),false);
});
test('storage denied does not break page and campaign works', () => {
  const p=page('https://inboundonsteroids.com/?utm_source=chatgpt_app&utm_medium=plugin&utm_campaign=linkedin_patterns',new Map(),false,true);
  assert.equal(p.events.length,1); assert.equal(new URL(p.link.href).searchParams.get('utm_campaign'),'linkedin_patterns');
});
test('direct traffic marker stays stable on repeated click and middle click', () => {
  const p=page('https://inboundonsteroids.com/');
  p.click();p.click();p.auxclick();
  const content = new URL(p.link.href).searchParams.get('utm_content');
  assert.match(content,/^ios:[a-f0-9-]{36}$/);
  assert.equal(p.events.filter(e=>e.event_type==='booking_click').length,3);
});
test('canonical index path accepted and shared local storage damage recovers', () => {
  const storage=new Map([['ios_tracking_v1','{"expires":9999999999999}']]);
  const p=page('https://inboundonsteroids.com/case/kyle-hunt/index.html',storage);
  assert.equal(p.events[0].path,'/case/kyle-hunt/');
});
