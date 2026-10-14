/* Website activity and Calendly attribution. Version 2026-10-14. */
(() => {
  const endpoint = 'https://bjbvqvzbzczjbatgmccb.supabase.co/functions/v1/site-events';
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const query = new URLSearchParams(window.location.search);
  const now = Date.now();
  const privateMode = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  const clean = v => typeof v === 'string' && !v.includes('@') ? v.replace(/(?:^|\|)ios:[a-f0-9-]{36}/g, '').slice(0, 160) : '';
  const campaign = Object.fromEntries(keys.map(k => [k, clean(query.get(k))]).filter(([, v]) => v));
  const read = () => { try { return JSON.parse(localStorage.getItem('ios_tracking_v1')); } catch (_) { return null; } };
  let state = privateMode ? null : read();
  if (!state || !state.expires || state.expires < now || !state.first_touch || !state.last_touch) state = {
    visitor_id: crypto.randomUUID(), first_touch: {}, last_touch: {}, expires: now + 90 * 86400000,
  };
  if (!state.session_id || now - state.active_at > 30 * 60000) state.session_id = crypto.randomUUID();
  let referrer = '';
  try { referrer = new URL(document.referrer).hostname; } catch (_) { /* direct */ }
  const externalReferrer = referrer && !['inboundonsteroids.com', 'www.inboundonsteroids.com'].includes(referrer);
  if (Object.keys(campaign).length) {
    if (!Object.keys(state.first_touch).length) state.first_touch = campaign;
    state.last_touch = campaign;
  } else if (externalReferrer) {
    const touch = { referrer_host: referrer };
    if (!Object.keys(state.first_touch).length) state.first_touch = touch;
    state.last_touch = touch;
  }
  if (!Object.keys(state.first_touch).length) state.first_touch = { referrer_host: 'direct' };
  state.is_test = state.is_test || query.get('me') === '1' || query.get('tracking_test') === '1';
  state.active_at = now;
  if (!privateMode) { try { localStorage.setItem('ios_tracking_v1', JSON.stringify(state)); } catch (_) { /* memory-only */ } }
  const touchSession = () => {
    const active = Date.now();
    if (active - state.active_at > 30 * 60000) state.session_id = crypto.randomUUID();
    state.active_at = active;
    if (!privateMode) { try { localStorage.setItem('ios_tracking_v1', JSON.stringify(state)); } catch (_) {} }
  };
  const selected = privateMode ? campaign : state.last_touch;
  const decorate = link => {
    const url = new URL(link.href, location.href);
    if (url.hostname !== 'calendly.com' || url.pathname !== '/im-ivanmanfredi/30min') return false;
    for (const k of keys) if (selected[k]) url.searchParams.set(k, selected[k]);
    if (!privateMode) {
      const original = clean(url.searchParams.get('utm_content'));
      url.searchParams.set('utm_content', (original ? original + '|' : '') + 'ios:' + state.session_id);
    }
    link.href = url.href;
    return true;
  };
  const emit = (event_type, target = '') => {
    if (privateMode) return;
    const payload = JSON.stringify({ id: crypto.randomUUID(), visitor_id: state.visitor_id,
      session_id: state.session_id, event_type, path: location.pathname.replace(/index\.html$/, ''), target,
      referrer_host: referrer, first_touch: state.first_touch, last_touch: state.last_touch, is_test: !!state.is_test });
    // text/plain avoids a preflight on a navigation beacon; no URL query or visitor PII.
    if (!navigator.sendBeacon || !navigator.sendBeacon(endpoint, payload)) {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload, keepalive: true }).catch(() => {});
    }
  };
  for (const link of document.querySelectorAll('a[href]')) decorate(link);
  emit('page_view');
  const onClick = event => {
    if (event.type === 'auxclick' && event.button !== 1) return;
    touchSession();
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    if (decorate(link)) { emit('booking_click', '/im-ivanmanfredi/30min'); return; }
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname.startsWith('/case/')) emit('case_click', url.pathname);
    else if (url.hostname === 'resources.ivanmanfredi.com' || url.hostname === 'resources.inboundonsteroids.com' || url.hostname === 'resources.risedtc.com') emit('resource_click', url.hostname + url.pathname);
  };
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);
})();
