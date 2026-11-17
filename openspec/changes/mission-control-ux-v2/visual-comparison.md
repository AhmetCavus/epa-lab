# Native visual comparison — task 6.1

Captured in Chromium 141 at DPR 1, native viewport scale 1, no CSS zoom. These are
actual rendered branch components with validated synthetic browser fixtures, not a claim
of real provider acceptance. Real component integration is recorded separately. All five
capture tests pass; the seven Inspect behavior cases also pass after the geometry correction.

Open the [interactive comparison](evidence/visual-comparison.html) for native side-by-side
images and adjustable opacity overlays. The [index](evidence/visual-comparison-index.json)
records dimensions and SHA-256 values. Reproduce with `render-visual-comparisons.py`.
Neither references nor captures are resized, masked or retouched in the PNG comparisons.

| Target | Reference → actual findings and corrections | Evidence |
| --- | --- | --- |
| Navy baseline, 706×1249 | Preserved dark navy identity, bright cyan accents, compact bordered panels and supplied language control. This older tall baseline checks identity, not V2 page geometry. Narrow navigation wraps; content continues below the viewport without horizontal overflow. | [pair](evidence/00-current-navy-baseline-comparison.png), [overlay](evidence/00-current-navy-baseline-overlay.png), [full actual page](evidence/06-00-navy-full.png) |
| Explore, 1672×941 | Header 58px, sidebar 246px. Reference hero y≈238/h≈260; actual y237.4/h262. Secondary panel reference y≈516/bottom≈904; actual y517.4/bottom904.1. Corrected heading, spacing, actor proportions and compact inline result. No document scrolling. | [pair](evidence/01-explore-comparison.png), [overlay](evidence/01-explore-overlay.png) |
| Inspect, 1585×992 | Reference panels x≈12/432/1167, y≈188; actual x12/432.7/1166.3, y188.4. Corrected outer columns to equal widths (406.7/719.6/406.7px), compacted timeline/filter header and moved observed badge into explanation card. Center explanation y294 vs reference≈293. Panel bottom970 vs reference≈971. Expanded detail and metadata scroll inside keyboard-accessible panels. | [pair](evidence/02-inspect-comparison.png), [overlay](evidence/02-inspect-overlay.png) |
| Animated Flow, 1672×941 | Same shell and three-stage hierarchy; participant row, path, range, explanation and right overview. Actual panel bottom911.6 vs reference≈920. Actual 4 deployment cards replace the mockup's repeated Browser/BFF cards. Corrected path height, local scrolling and compact transport. No document scrolling. | [pair](evidence/03-animated-flow-comparison.png), [overlay](evidence/03-animated-flow-overlay.png) |
| Resource Explorer, 1672×941 | Reference banner y260 and card y379/bottom≈905; actual y259.4 and y379.4/bottom905.5. CTA 305px, exact two fields, status left/JSON right. Corrected banner, form proportions, syntax color/line numbers and result height. No document scrolling. | [pair](evidence/04-resource-explorer-comparison.png), [overlay](evidence/04-resource-explorer-overlay.png) |

Typography uses the existing system sans-serif stack, 30px/37.5px main titles and
14–16px body text; it cannot reproduce every rasterized glyph or glow in the concept PNGs.
The base is #080e20, panels #111e32, primary text #f3f6ff and cyan #36c8ff. The primary
blue is deliberately darker than the reference's brightest gradient for white-text contrast.
Per-element computed fonts/colors and exact geometry are retained beside each `06-*.png`.

Necessary differences preserve the approved protocol/security contract: no fake user identity,
provider-internal observation, token/claims cards, raw callback/response, invented latency or
FHIR profiles. Callback correctly shows Browser → BFF; BFF remains the observer and an
explicit HAPI report remains separate. Real code/coding JSON is longer than the illustrative
six-line document and scrolls locally. Only existing missions/navigation are offered; no empty
Learn/future-mission features. Local verification identifies itself as a private integration test.
Stage 3 becomes complete only after an actual validated 200, rather than retaining the mockup's
illustrative number. The language selector replaces the illustrative account control.

The comparisons have been visually inspected after correction. Fidelity is close in layout,
spacing, navy palette and hierarchy; the differences above remain visible and are not a
pixel-perfect claim. Narrow/zoomed accessibility acceptance is recorded under task 6.4.
