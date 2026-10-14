"""Apply this additive block to a fresh private download of calendly-webhook.
Never commit the downloaded webhook: existing source contains private runtime URLs.
"""
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
anchor = '  try { body = JSON.parse(raw); } catch { return jr({ error: "invalid_json" }, 400); }\n'
block = '''
  // Website tracking 2026-10-14: authenticated booking/cancellation attribution.
  // Fail-soft, independent of existing calendar and paid-assessment handling.
  if (secret) try {
    const response = await fetch(SUPABASE_URL + "/rest/v1/rpc/ios_web_record_booking", {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_event: body.event, p_payload: body.payload || {} }),
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) console.error("site booking attribution failed", response.status);
  } catch (_) { console.error("site booking attribution unavailable"); }
'''
if 'Website tracking 2026-10-14' in text:
    raise SystemExit('Already patched; refusing a duplicate block.')
if text.count(anchor) != 1:
    raise SystemExit('Anchor changed; inspect the fresh source before applying.')
path.write_text(text.replace(anchor, anchor+block))
print('Applied website tracking block; existing source preserved.')
