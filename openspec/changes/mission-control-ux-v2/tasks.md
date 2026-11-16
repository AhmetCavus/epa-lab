# Tasks

**DRAFT — implementation not authorized.** All tasks remain unstarted. This proposal makes no application, environment, image or public deployment changes. Implementation requires a later explicit apply instruction; public release requires a separate explicit release instruction.

The [design](design.md) resolves the implementation approach. Requirements are in [mission-experience](specs/mission-experience/spec.md), [recorded-flow-playback](specs/recorded-flow-playback/spec.md) and [synthetic-resource-explorer](specs/synthetic-resource-explorer/spec.md).

The complete visual acceptance set is:

- [docs/design/mission-control-v2/00-current-navy-baseline.png](../../../docs/design/mission-control-v2/00-current-navy-baseline.png)
- [docs/design/mission-control-v2/01-explore.png](../../../docs/design/mission-control-v2/01-explore.png)
- [docs/design/mission-control-v2/02-inspect.png](../../../docs/design/mission-control-v2/02-inspect.png)
- [docs/design/mission-control-v2/03-animated-flow.png](../../../docs/design/mission-control-v2/03-animated-flow.png)
- [docs/design/mission-control-v2/04-resource-explorer.png](../../../docs/design/mission-control-v2/04-resource-explorer.png)

Use the [reference contract](../../../docs/design/mission-control-v2/README.md) for fidelity and protocol/security corrections. Groups 1–4 can land against the existing bounded resource action; the final Explorer-enabled Explore state lands with group 5. Keep fixtures and current resource consumers compatible throughout.

## 1. Shared layout/design system

- [ ] 1.1 Refine existing navy surface, border, spacing, type, button and focus styles for the compact workspace header/sidebar/panels; verify desktop shell comparison against the baseline and Explore reference, contrast minimums and no light-theme regression.
- [ ] 1.2 Add Explore/Inspect mode and Explore panel navigation to the existing workspace without remounting the runtime coordinator; verify direct URLs, fallback values, back/forward, keyboard focus and unchanged login/resource/logout counters in browser tests.
- [ ] 1.3 Keep new layout pieces capability-oriented and protocol-neutral, retaining catalog/fixture/conceptual ePA routes and the language control; verify existing architecture/route checks and update workspace navigation/visual guidance to distinguish V2 from historical canvas-preservation rules.

## 2. Explore

- [ ] 2.1 Derive the mission-owned three stages, concise state explanation and single dominant action from authoritative session/run/resource state; verify a table of anonymous, restoring/loading, navigating, authenticated, expired, failed/provider-denied and logged-out scenarios, including a failed later attempt with retained authentication.
- [ ] 2.2 Build the Explore title/objective, progress row, prominent status/compact actors and secondary detail area from the approved Explore composition; verify a rendered desktop capture and absence of the giant default sequence/scattered event-card layout.
- [ ] 2.3 Preserve real redirect, clean callback/session/event restoration, cancellation and independent logout while replacing presentation; extend SPA runtime tests for reload/BFCache, missing/incomplete history, trace capacity and stale asynchronous results without altering OAuth calls.
- [ ] 2.4 Add matching DE/EN status, objective, stage and next-action copy plus the state/action UX documentation; verify locale parity, keyboard/announcements, native zoom readability and that stage selection never executes work or invents success.

## 3. Inspect

- [ ] 3.1 Compose the reference's left compact timeline, center selected-event detail and right contextual metadata using existing selection/Timeline/Inspector behavior; verify desktop proportions, actor/channel/outcome filters, previous/next boundaries and synchronized selection after filtering.
- [ ] 3.2 Retain strict version-1 event validation and neutral projection, including BFF observer versus HAPI reporter, Browser→BFF callback and arrowless local checks; verify unsupported/unsafe input has no raw fallback and credential sentinels never appear in details, logs or console.
- [ ] 3.3 Add expandable technical evidence and localized unavailable/empty metadata states with keyboard/focus support; verify DE/EN accessibility and update inspection documentation to distinguish evidence, interpretation and unobservable provider internals without claiming unsupported run-history navigation.

## 4. Animated Flow

- [ ] 4.1 Add a small presentation-only playback coordinator over the selected owned event sequence; verify play/pause/previous/next/replay, end pause, empty/incomplete traces, run replacement and timer cleanup with deterministic tests and zero execution calls.
- [ ] 4.2 Render the compact four-participant flow, selected actor/path, timeline/progress, overview and explanatory card against the approved Animated Flow image; verify real source/target/channel mapping, Keycloak role grouping and no network arrow for actor-local checks.
- [ ] 4.3 Restore paused playback from recorded evidence after external login rather than simulating continuous observation; verify real callback reconstruction, failed-run stopping, no invented events and no login/resource/logout requests from transport controls.
- [ ] 4.4 Implement instant manual reduced-motion equivalents and keyboard-accessible controls with matching DE/EN copy; verify focus, language/selection preservation, narrow/zoomed layouts and update playback documentation with its presentation-only semantics.

## 5. Resource Explorer

- [ ] 5.1 Define the one-entry server catalog and current-authentication eligibility established only by a validated explicit fixed read; add the protected catalog view in the existing BFF, verifying anonymous/expired/ePA-only/pending/denied cases, no HAPI calls from catalog reads and invalidation on replacement/logout/401/403/restart without relying on teaching-event storage.
- [ ] 5.2 Extend the existing resource route with exactly two bounded scalar selectors while preserving its no-query contract; verify direct crafted requests, unapproved types/IDs, duplicate/extra keys, traversal, bodies and caller credentials are rejected before upstream contact. Prepare only the catalog GET allowance in existing proxy configurations and verify trust/method/path/rate denials without changing live routing.
- [ ] 5.3 Produce and decode a separately versioned safe FHIR response from the actual validated Basic; verify exact identity, optional safe metadata, media type, 64KiB bound, malformed/unsafe payload rejection, secret-sentinel non-disclosure and compatibility of the old summary/session/event schemas.
- [ ] 5.4 Build the authenticated/authorized type selector, ID input and primary `Ressource abrufen` action with loading/result states, summary, escaped JSON/copy and safe metadata; verify the Resource Explorer reference composition, explicit-only requests, current-context gating, late-result discard, result clearing and DE/EN keyboard/mobile behavior.
- [ ] 5.5 Verify independently enforced real HAPI 200/401/403 cases using signed tokens/JWKS and existing real integration machinery, plus the exact allowed fixture missing in an isolated server for 404 and an actual boundary 429 with recovery; assert no Patient/Observation/extra ID, no policy weakening, correct provenance and independent logout under limits.
- [ ] 5.6 Document the explicit permission check, catalog/selected-resource API, safe projection and 200/401/403/404/429 meanings/recovery; verify documented examples against contract tests and confirm future entries require separately approved fixtures, policy and negative tests rather than enabling screenshot examples.

## 6. Integrated UX/security verification

- [ ] 6.1 Capture actual rendered Explore, Inspect, Animated Flow and authorized Resource Explorer at all target native sizes; deliver side-by-side/overlay comparisons against all four target images plus the navy baseline, recording geometry/type/color findings, necessary corrections and limitations without masking layout differences.
- [ ] 6.2 Exercise the complete real login → clean return → session restoration → access check → selected synthetic read → Inspect/playback → local logout journey in the isolated verification environment; verify consistent run identity, actual outcomes, safe history and zero execution from mode/filter/playback/locale changes.
- [ ] 6.3 Run combined negative lifecycle/security scenarios: ownership isolation, expired/stale cookies, invalid selectors, forged frontend eligibility, late results, full/failing event storage, proxy denials and no leaked credential/payload diagnostics; verify HAPI remains an independent boundary and resource data cannot survive logout through UI races.
- [ ] 6.4 Verify both languages across reference sizes and 1366/1024/390/320 CSS px, keyboard/focus, semantics/status announcements, contrast, reduced motion and actual native 100%/200% browser zoom; record axe/manual results and leave unavailable checks explicitly unverified rather than substituting device/viewport scaling.
- [ ] 6.5 Run existing standard Code/S256, ePA header/PAR/browser, conceptual ePA, fixture, architecture/localization and relevant BFF/HAPI suites together with SPA typecheck/build; record regressions separately from deliberate OAuth visual-baseline changes and confirm no provider/security policy or persistent-data change.
- [ ] 6.6 Deliver the nine-area acceptance evidence matrix from the design, update current UX/API documentation while retaining prior reports, and run strict OpenSpec validation; verify all acceptance findings are supported by actual evidence, with public deployment still unchanged pending a separate release instruction.

## Workflow follow-up

- Review the planning artifacts before authorizing implementation; an explicit apply instruction starts implementation, not deployment.
- A later public release must review integrated evidence and use the existing deployment with targeted application recovery; this change includes no immediate deployment, database migration or second public site.
- Reconcile V2 presentation precedence with the earlier unarchived Mission Control requirements during later spec synchronization. Do not archive historical changes or this proposal as part of planning.
