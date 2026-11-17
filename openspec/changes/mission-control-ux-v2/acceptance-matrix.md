# Mission Control V2 acceptance matrix

**Subsequent public release, 2026-11-17:** after the isolated implementation was complete,
the owner explicitly authorized the targeted SPA/BFF deployment. See
[public release verification](public-release-verification.md) for current running state and
actual public checks. Earlier implementation-only scope statements below retain their dated
verification context; this release does not authorize database/provider/policy changes or archiving.

Verified 2026-11-17 on `feat/mission-control-v2`, for isolated implementation only.
All nine areas below have actual evidence. The change remains unarchived and the public
Playground remains on its existing release. There is no production-readiness claim.

| Area | Result | Evidence and limits |
| --- | --- | --- |
| Visual fidelity | Pass with documented necessary differences | [Five native comparisons](visual-comparison.md), [interactive side-by-side/opacity review](evidence/visual-comparison.html), [hash/dimension index](evidence/visual-comparison-index.json). All four current desktop views fit their reference viewports. Actual system typography, safe DTO content, four real deployments and accessible contrast differ explicitly from illustrative mockup details. No masked geometry or pixel-perfect claim. |
| Explore/Inspect navigation | Pass | [177 SPA checks](evidence/06-spa-regression.json), `mission-control`/`mission-inspection` cases: default Explore, direct/fallback URLs, back/forward, keyboard, stable run/selection, filters isolated from playback and zero execution calls. [Real HTTPS journey](evidence/06-final-https-runtime-results.json) confirms mode/filter/locale/transport counters. |
| Session states | Pass | `oauth-experience`/`oauth-runtime`/`mission-resource`: anonymous, restoring, navigating, pending, authenticated, expiry, denied/failed, later failed run with retained auth, signed out, absent/held/failed history. Authoritative current session enables Fetch before teaching history completes. No resource eligibility state. |
| Recorded playback | Pass | Thirteen deterministic playback cases plus actual callback/reload and final HTTPS checks. Only owned validated events; correct Browser→BFF callback and arrowless local checks; missing/failed frames stay honest. Pause/end/replacement/cleanup, reduced motion and keyboard tested. Cadence is presentation, not observed network timing. |
| Resource Explorer | Pass | [79 combined SPA negatives/contracts](evidence/06-negative-spa.json), [462 BFF checks](evidence/06-bff-regression.json), actual HTTPS read. First explicit read sends exactly the two bounded selectors; zero preliminary FHIR/catalog requests. Exact Basic/playground-demo allowlist; legacy no-query contract retained. Safe version-2 actual JSON, copy/tabs/metadata and clearing on logout/expiry/reload/replacement. |
| Independent FHIR denials | Pass | [184 HAPI tests](evidence/05-hapi-gradle.json), [20 real runtime checks](evidence/05-hapi-runtime.json), final real issuer/JWKS/HAPI journey: permitted 200; absent/expired/forged/wrong-purpose/issuer/audience 401; scope/type/ID/search/history/write 403. Fresh unseeded isolated server gives actual allowed-fixture 404. [Actual Nginx 429/recovery/logout](evidence/06-negative-proxy.json). HAPI denial does not become BFF session loss or an eligibility gate. |
| Lifecycle regressions | Pass | SPA and BFF suites cover current ownership, forged DOM/crafted requests, stale/expired cookies, late results, BFCache, CSRF, cancellation, full/failing bounded observation storage and safe retained history. Real HTTPS verifies local logout, old credential rejection, no JavaScript cookies, no protocol browser persistence, safe UI/console/service/proxy logs. |
| DE/EN and accessibility | Pass within recorded verification scope | [DE 28 combinations](evidence/06-accessibility-de.json), [EN 28 combinations](evidence/06-accessibility-en.json): reference and 1366/1024/706/390/320px widths, zero axe violations, no page horizontal overflow, expanded technical evidence, visible keyboard focus, actual keyboard diagram scrolling. [Native DE](evidence/06-native-zoom-de.json)/[EN](evidence/06-native-zoom-en.json) browser Settings readback 1/2, DPR 1/2, no CSS/viewport zoom substitute. Manual screenshot/DOM review, text/control/focus contrast and reduced-motion equivalents pass; no screen-reader product certification claim. |
| OAuth/ePA preservation | Pass | [54 actual provider checks plus final runtime](evidence/06-final-https-results.json): standard Code/S256 and ePA required-PAR/header/browser regression; conceptual ePA and fixtures in the full SPA run. [Preservation](evidence/06-preservation.json): 14 protected files and all six ePA Lab containers unchanged, clean HAPI submodule, no live provider/security/data operations. Six unrelated host containers changed outside this task and are recorded separately. |

## Owner review captures

- [Explore, 1672×941](evidence/06-01-explore.png)
- [Inspect, 1585×992](evidence/06-02-inspect.png)
- [Animated Flow, 1672×941](evidence/06-03-animated-flow.png)
- [Resource Explorer, 1672×941](evidence/06-04-resource-explorer.png)
- [Real HTTPS Explore](evidence/06-final-mission-control-real-explore.png),
  [Inspect](evidence/06-final-mission-control-real-inspect.png),
  [Flow](evidence/06-final-mission-control-real-flow.png),
  [Explorer](evidence/06-final-mission-control-real-resource.png)
- [Mobile Explore](evidence/06-matrix-en-320-explore.png),
  [Flow](evidence/06-matrix-de-320-flow.png),
  [Explorer](evidence/06-matrix-de-320-resources.png),
  [native 200% Inspect](evidence/06-native-de-200-inspect.png)

## Verification commands and boundaries

From `apps/playground`, run `npm run format:check`, then:

```sh
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 \
PLAYGROUND_NATIVE_CHROMIUM=/home/yappai/.cache/ms-playwright/chromium-1194/chrome-linux/chrome \
npm test
```

The existing global setup owns the fixture/private loopback test servers; do not run two
Playwright invocations against their ports simultaneously. Native zoom needs full Chromium;
its test explicitly skips without that executable, so such a run cannot establish zoom acceptance.
This recorded run had zero skips/flakes. From `services/auth-client`, run `npm run typecheck`,
`npm run build` and `npm test` (462 passed).

Actual provider/proxy/resource harnesses are `infrastructure/verify-public-runtime.mjs`,
`verify-mission-control-callback.mjs`, `verify-resource-proxy.mjs` and
`verify-synthetic-resource.mjs`. The HTTPS journey used `PUBLIC_RUNTIME_MISSION_CONTROL=true`,
the reviewed verification-only SPA image and BFF manifest, and the pinned HAPI image in its
result record. That mode rejects `KEYCLOAK_POSTGRES_ENV_FILE`; do not load `.env.live` into
verification. It creates fresh temporary provider/HAPI data, private test CA/loopback routes,
and removes only its owned containers. It never constitutes live/public acceptance.

## Remaining deviations and blockers

No blocker remains for the approved isolated implementation. Necessary visual differences
are itemized in the comparison review: safe evidence replaces illustrated identities/tokens,
actual synthetic JSON replaces invented profiles/payloads, four participants replace repeated
mockup cards, real recorded outcomes replace illustrative totals/status, and contrast/readable
local scrolling take precedence over bright gradients or compressed labels. System fonts/glows
are close to the raster targets and are not claimed pixel-identical.

A public release requires a separate explicit instruction and release review; it is outside
this task. Six unrelated host-container replacements observed during implementation were
neither performed nor reverted by this task. The existing ePA Lab deployment is unchanged.
