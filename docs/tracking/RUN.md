# Tracking release receipt

Explicit client: ivan. Source instructions: 19bd9d0d3f4ac6132e91038082ef5b5aafedfe8c970143b9b0492703afa8b98a.

2026-10-14: Ivan chose both activity tracking and visitor identification, starting with visits and booking attribution.

Implementation: root runtime gpt-6.1-sol (inline). Independent release reviewer: gpt-6-astra, /root/tracking_release_review. Reviewer requested signature guard, cancellation tombstones and serialization, stable direct marker, middle click handling, case-study hub, actual resource target, canonical paths and session activity. Each addressed with regression checks. Review approval conditional on advisory lock and SQL checks, now under verification.

Checks: Node browser attribution/navigation suite, Deno collector validation suite, collector and downloaded Calendly webhook typechecks, transactional SQL dry-run with duplicate and out-of-order cancellation tests, private table/RPC privileges. No real Calendly invitee created. Live deployment checks recorded separately after release.

New objects use ios_web_* because public.site_events was already owned by another integration. No existing analytics table, n8n workflow or old Calendly business handling modified. Existing webhook receives one additive signature-guarded RPC call, applied by scripts/patch-calendly-site-tracking.py to a fresh private download.

Vendor identification is still awaiting account access. No vendor subscription or identity pixel installed.
