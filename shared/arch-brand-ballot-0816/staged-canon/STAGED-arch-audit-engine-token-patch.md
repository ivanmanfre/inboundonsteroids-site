# STAGED (not applied): arch-audit-engine → book-legal palette

The madebyarch.com audit pages (whiteout-survival, whiteout-survival-v2, kingshot) are the strongest
ARCH surfaces we ship, but the template bakes in a 7-value navy scale that is NOT in the brand book:
`#02082A #39406B #5E668F #7E86AD #B9C0DC #E9EFFF #F3F5FB`. Davorin's "good eye… colours" complaint
applies to exactly this class of drift. The book allows seven colors, total.

⚠ INTERPLAY: the whiteout-v2 page has an OPEN BALLOT with Ivan (arch-whiteout-v2-boardroom-pass).
This patch is staged only; applying it re-colors a page Ivan may be mid-judging. Apply AFTER that
ballot closes, then rebuild + redeploy the three pages via the engine's normal path.

## services/arch-audit-engine/template/template.html
| Line | Now | Staged | Why |
|---|---|---|---|
| 64 | `.stage{...background:#02082a}` | `background:#000F41` | stage surface = navy field (book p4); noise overlay optional per p5 |
| 134 | `.chan-hot{background:#E9EFFF;...}` | `background:#EDEDED` | highlighted chip on light = light-gray; cobalt outline already book-legal |
| 250 | `.b3{background:#39406B}` | `.b3{background:#F2FF82}` | bar ramp becomes 5 distinct book colors: cobalt, navy, yellow, gray, light-gray |
| 251 | `.b4{background:#7E86AD}` | `.b4{background:#666666}` | " |
| 251 | `.b5{background:#B9C0DC}` | `.b5{background:#EDEDED}` | " |
| 437 | `stroke="#5E668F"` (plot diagonal) | `stroke="#666666"` | secondary stroke on light = gray |

## services/arch-audit-engine/configs/{whiteout-survival,kingshot}.json (brand_tokens)
| Token | Now | Staged | Why |
|---|---|---|---|
| plate | `#F3F5FB` | `#EDEDED` | quiet light surface = light-gray (book p4) |
| sup | `#39406B` | `#666666` | secondary text on light = gray |
| sup2 | `#5E668F` | `#666666` | two invented tones collapse to the one book gray ("very safe") |
| navy/cobalt/lime/white/ink/font | unchanged | unchanged | already book-legal |

## Also
- `build.py:44` BRAND_TOKEN_KEYS unchanged (names stay; values change in configs).
- After apply: rerun gates + reshoot; the brand instrument (this run's `instrument/run.sh`) should be
  added to the engine's gate list so future audits are checked against the book automatically.
- Readability check to run at apply time: `.b3` yellow bar needs a navy value-label (was white on #39406B);
  `.b5` light-gray bar needs navy label. If a label collision appears, swap ramp order to
  cobalt/navy/gray/yellow/light-gray — still all-book.
