# Tasks

**APPROVED for isolated implementation, 2026-11-16.** The owner explicitly authorized all 26 tasks below in order on `feat/mission-control-v2`. Check each task only after its required verification. Public deployment, production infrastructure changes and archiving remain excluded; any later public release needs its own explicit instruction.

The [design](design.md) resolves the implementation approach. Requirements are in [mission-experience](specs/mission-experience/spec.md), [recorded-flow-playback](specs/recorded-flow-playback/spec.md) and [synthetic-resource-explorer](specs/synthetic-resource-explorer/spec.md).

The complete visual acceptance set is:

- [docs/design/mission-control-v2/00-current-navy-baseline.png](../../../docs/design/mission-control-v2/00-current-navy-baseline.png)
- [docs/design/mission-control-v2/01-explore.png](../../../docs/design/mission-control-v2/01-explore.png)
- [docs/design/mission-control-v2/02-inspect.png](../../../docs/design/mission-control-v2/02-inspect.png)
- [docs/design/mission-control-v2/03-animated-flow.png](../../../docs/design/mission-control-v2/03-animated-flow.png)
- [docs/design/mission-control-v2/04-resource-explorer.png](../../../docs/design/mission-control-v2/04-resource-explorer.png)

Use the [reference contract](../../../docs/design/mission-control-v2/README.md) for fidelity and protocol/security corrections. Groups 1–4 can land against the existing bounded resource action; the final Explorer-enabled Explore state lands with group 5. Keep fixtures and current resource consumers compatible throughout.

## 1. Shared layout/design system

- [x] 1.1 Refine existing navy surface, border, spacing, type, button and focus styles for the compact workspace header/sidebar/panels; verify desktop shell comparison against the baseline and Explore reference, contrast minimums and no light-theme regression.
- [x] 1.2 Add Explore/Inspect mode and Explore panel navigation to the existing workspace without remounting the runtime coordinator; verify direct URLs, fallback values, back/forward, keyboard focus and unchanged login/resource/logout counters in browser tests.
- [x] 1.3 Keep new layout pieces capability-oriented and protocol-neutral, retaining catalog/fixture/conceptual ePA routes and the language control; verify existing architecture/route checks and update workspace navigation/visual guidance to distinguish V2 from historical canvas-preservation rules.

## 2. Explore

- [x] 2.1 Derive the mission-owned three stages, concise state explanation and single dominant action from authoritative session/run/resource state; verify a table of anonymous, restoring/loading, navigating, authenticated, expired, failed/provider-denied and logged-out scenarios, including a failed later attempt with retained authentication. Successful current authentication/restoration immediately enables Explorer and makes its explicit Fetch action dominant without a preliminary resource read or permission-success claim.
- [x] 2.2 Build the Explore title/objective, progress row, prominent status/compact actors and secondary detail area from the approved Explore composition; verify a rendered desktop capture and absence of the giant default sequence/scattered event-card layout.
- [x] 2.3 Preserve real redirect, clean callback/session/event restoration, cancellation and independent logout while replacing presentation; extend SPA runtime tests for reload/BFCache, missing/incomplete history, trace capacity and stale asynchronous results without altering OAuth calls.
- [x] 2.4 Add matching DE/EN status, objective, stage and next-action copy plus the state/action UX documentation; verify locale parity, keyboard/announcements, native zoom readability and that stage selection never executes work or invents success.

## 3. Inspect

- [x] 3.1 Compose the reference's left compact timeline, center selected-event detail and right contextual metadata using existing selection/Timeline/Inspector behavior; verify desktop proportions, actor/channel/outcome filters, previous/next boundaries and synchronized selection after filtering.
- [x] 3.2 Retain strict version-1 event validation and neutral projection, including BFF observer versus HAPI reporter, Browser→BFF callback and arrowless local checks; verify unsupported/unsafe input has no raw fallback and credential sentinels never appear in details, logs or console.
- [x] 3.3 Add expandable technical evidence and localized unavailable/empty metadata states with keyboard/focus support; verify DE/EN accessibility and update inspection documentation to distinguish evidence, interpretation and unobservable provider internals without claiming unsupported run-history navigation.

## 4. Animated Flow

- [x] 4.1 Add a small presentation-only playback coordinator over the selected owned event sequence; verify play/pause/previous/next/replay, end pause, empty/incomplete traces, run replacement and timer cleanup with deterministic tests and zero execution calls.
- [x] 4.2 Render the compact four-participant flow, selected actor/path, timeline/progress, overview and explanatory card against the approved Animated Flow image; verify real source/target/channel mapping, Keycloak role grouping and no network arrow for actor-local checks.
- [x] 4.3 Restore paused playback from recorded evidence after external login rather than simulating continuous observation; verify real callback reconstruction, failed-run stopping, no invented events and no login/resource/logout requests from transport controls.
- [x] 4.4 Implement instant manual reduced-motion equivalents and keyboard-accessible controls with matching DE/EN copy; verify focus, language/selection preservation, narrow/zoomed layouts and update playback documentation with its presentation-only semantics.

## 5. Resource Explorer

- [x] 5.1 Define the exact server allowlist and mission-owned single-entry form for Basic/playground-demo. Derive form availability directly from current owning standard authentication; verify immediate enablement after login/restoration, unavailable anonymous/expired/logged-out/ePA-only states and existing pending/current-run guards. Require zero preliminary FHIR/catalog requests and no eligibility store/DTO/endpoint; keep session validity distinct from HAPI's per-fetch decision and independent of teaching-event retention.
- [x] 5.2 Extend the existing resource route with exactly two bounded scalar selectors while preserving its no-query contract; validate the owning session, type, ID and exact allowlist on every fetch. Verify direct crafted requests, unapproved types/IDs, duplicate/extra keys, traversal, bodies and caller credentials are rejected before upstream contact. Reuse existing proxy path/GET allowances and verify selector forwarding plus trust/method/path/rate denials, with no resource-catalog route or live routing change.
- [x] 5.3 Produce and decode a separately versioned safe FHIR response from the actual validated Basic; verify exact identity, optional safe metadata, media type, 64KiB bound, malformed/unsafe payload rejection, secret-sentinel non-disclosure and compatibility of the old summary/session/event schemas.
- [x] 5.4 Build the session-enabled type selector, ID input and primary `Ressource abrufen` action with loading/result states, summary, escaped JSON/copy and safe metadata; verify immediate availability after successful current authentication, the Resource Explorer reference composition, explicit-only selected fetches, current-context guards, late-result discard, result clearing and DE/EN keyboard/mobile behavior. Explain actual 401/403/404 outcomes without disabling an otherwise current authenticated form through a separate permission gate.
- [x] 5.5 Verify independently enforced real HAPI 200/401/403 cases using signed tokens/JWKS and existing real integration machinery, plus the exact allowed fixture missing in an isolated server for 404 and an actual boundary 429 with recovery; assert no Patient/Observation/extra ID, no policy weakening, correct provenance and independent logout under limits.
- [x] 5.6 Document session-enabled form availability, the compatible selected-resource extension on the existing route, absence of preliminary reads/catalog/eligibility state, safe projection and 200/401/403/404/429 meanings/recovery. Distinguish BFF session/allowlist rejection from HAPI JWT/authorization rejection and allowed-resource not-found; verify examples against contract tests and keep future entries subject to separately approved fixtures, policy and negative tests.

## 6. Integrated UX/security verification

- [x] 6.1 Capture actual rendered Explore, Inspect, Animated Flow and authorized Resource Explorer at all target native sizes; deliver side-by-side/overlay comparisons against all four target images plus the navy baseline, recording geometry/type/color findings, necessary corrections and limitations without masking layout differences.
- [x] 6.2 Exercise the complete real login → clean return → session restoration with Explorer immediately enabled → explicit selected synthetic read → Inspect/playback → local logout journey in the isolated verification environment; verify no preliminary FHIR/catalog request, consistent run identity, actual outcomes, safe history and zero execution from mode/filter/playback/locale changes.
- [x] 6.3 Run combined negative lifecycle/security scenarios: ownership isolation, expired/stale cookies, invalid selectors, forged frontend enabled state, late results, full/failing event storage, proxy denials and no leaked credential/payload diagnostics; verify HAPI remains an independent boundary, a HAPI denial is not mistaken for BFF session loss or an eligibility gate, and resource data cannot survive logout through UI races.
- [x] 6.4 Verify both languages across reference sizes and 1366/1024/390/320 CSS px, keyboard/focus, semantics/status announcements, contrast, reduced motion and actual native 100%/200% browser zoom; record axe/manual results and leave unavailable checks explicitly unverified rather than substituting device/viewport scaling.
- [x] 6.5 Run existing standard Code/S256, ePA header/PAR/browser, conceptual ePA, fixture, architecture/localization and relevant BFF/HAPI suites together with SPA typecheck/build; record regressions separately from deliberate OAuth visual-baseline changes and confirm no provider/security policy or persistent-data change.
- [x] 6.6 Deliver the nine-area acceptance evidence matrix from the design, update current UX/API documentation while retaining prior reports, and run strict OpenSpec validation; verify all acceptance findings are supported by actual evidence, with public deployment still unchanged pending a separate release instruction.

## Workflow follow-up

- Review the planning artifacts before authorizing implementation; an explicit apply instruction starts implementation, not deployment.
- A later public release must review integrated evidence and use the existing deployment with targeted application recovery; this change includes no immediate deployment, database migration or second public site.
- Reconcile V2 presentation precedence with the earlier unarchived Mission Control requirements during later spec synchronization. Do not archive historical changes or this proposal as part of planning.
