const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const paths = new Set(['/', '/case-studies/', '/case/kyle-hunt/', '/case/rise-dtc/', '/case/lemonade/', '/score/', '/score/r/']);
const touchKeys = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer_host']);
const plain = (v: unknown) => typeof v === 'string' && v.length <= 160 && !/[\u0000-\u001f@]/.test(v);
const touch = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([k,x])=>touchKeys.has(k)&&plain(x));
export function validateEvent(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  const v = input as Record<string, unknown>;
  if (![v.id, v.visitor_id, v.session_id].every(x => typeof x === 'string' && uuid.test(x))) return null;
  if (!paths.has(String(v.path)) || !['page_view','booking_click','case_click','resource_click'].includes(String(v.event_type))) return null;
  if (!touch(v.first_touch) || !touch(v.last_touch) || typeof v.is_test !== 'boolean') return null;
  if (typeof v.referrer_host !== 'string' || !/^[a-z0-9.-]{0,253}$/i.test(v.referrer_host)) return null;
  if (typeof v.target !== 'string' || !/^(|\/im-ivanmanfredi\/30min|\/case\/[a-z-]+\/|resources\.(ivanmanfredi|inboundonsteroids|risedtc)\.com\/[a-z0-9/_-]*)$/.test(v.target)) return null;
  return Object.fromEntries(['id','visitor_id','session_id','event_type','path','target','referrer_host','first_touch','last_touch','is_test'].map(k=>[k,v[k]]));
}
