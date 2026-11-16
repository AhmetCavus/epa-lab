# Design

## Context

**DRAFT; planning only.** See [proposal.md](proposal.md) for motivation. The working authentication and current public deployment are the baseline, not implementation work for this change.

Repository inspection found:

| Existing boundary                                                     | Current behavior / consequence                                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/playground/src/features/mission/ui/Workspace.tsx`               | Mission panel, large actor canvas, Inspector and bottom timeline share one screen. The runtime's Start/Retry stays primary even after authentication.                                            |
| `features/mission/application/useOAuthMission.ts`                     | Restores session/events, aborts superseded work, handles expiry/logout and projects observations. Extend its presentation; preserve lifecycle semantics.                                         |
| `features/mission/data/oauth-contract.ts` and `oauth-presentation.ts` | Strict version-1 discriminated DTOs become neutral protocol-flow events. Session data contains no username, token claims or granted-permission list.                                             |
| `features/protocol-flow`                                              | Owns neutral actor/event rendering and selection. Reuse Timeline/Inspector behavior and public entries; OAuth interpretation stays in the mission adapter.                                       |
| BFF `authorization/standard-login` and `standard-resource`            | Fixed `GET /api/oauth/resource` rejects query/body/caller credentials and returns a validated three-field summary, not FHIR JSON. Logout/history and stale-result checks already exist.          |
| `services/res-server/SECURITY.md`                                     | HAPI independently permits only `GET /fhir/Basic/playground-demo` with trusted JWT, audience `playground-fhir` and scope `demo.fhir.read`. No new HAPI permission is needed.                     |
| Existing tests                                                        | SPA runtime/adapter/architecture/localization/visual suites, BFF standard-browser/resource suites, real Keycloak/ePA integration and HAPI signed-JWT negative tests provide regression coverage. |

`openspec/specs/` has no published capabilities. Earlier unarchived changes contain `mission-experience` and `mission-control-interactions`. Reuse `mission-experience` naming; add only playback and Resource Explorer capability boundaries. V2 explicitly supersedes the OAuth-specific _preserve old panel hierarchy / canvas as primary surface_ clauses, not their security, provenance, ownership, localization or ePA behavior. Reconcile these presentation clauses during later spec synchronization; do not archive or rewrite historical changes now. The newer approved image contract takes precedence over the older exploratory-image caution in `docs/design/visual-system.md`.

## Goals / Non-Goals

**Goals:** match the approved compositions; separate task completion from technical inspection; derive presentation from authoritative session state and recorded evidence; add a narrowly typed synthetic resource experience.

**Non-Goals:** changing authentication, provider policy, token validation, session cookies, ePA/PAR, resource permissions, persisted data or deployment topology. No new application, BFF, server, database, framework, interception layer, automatic OAuth retry, token viewer or extra resource fixture.

## Decisions

### 1. Treat all five inspected images as the visual contract

The [reference README](../../../docs/design/mission-control-v2/README.md) and these exact files are binding. The recorded native sizes also define the desktop comparison captures:

| Reference                                                                                                                                     | Visual acceptance target                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/design/mission-control-v2/00-current-navy-baseline.png](../../../docs/design/mission-control-v2/00-current-navy-baseline.png), 706×1249 | Existing Yappai identity: deep navy page and panel surfaces, subdued blue borders, white primary text, cyan/blue accents, technical secondary typography. Preserve this theme in every state; its long sequence composition is the problem being replaced.                                   |
| [docs/design/mission-control-v2/01-explore.png](../../../docs/design/mission-control-v2/01-explore.png), 1672×941                             | Compact top navigation, roughly 245px mission sidebar, title/objective and three-stage row, broad status/actor card, one prominent action and a secondary Resource Explorer area below. Match spacing, card proportions and emphasis.                                                        |
| [docs/design/mission-control-v2/02-inspect.png](../../../docs/design/mission-control-v2/02-inspect.png), 1585×992                             | Run heading above three columns: compact timeline left, selected-event detail center, contextual metadata right (approximately 26/46/28%). Inspect reclaims the Explore sidebar area; do not add another full mission sidebar beside it.                                                     |
| [docs/design/mission-control-v2/03-animated-flow.png](../../../docs/design/mission-control-v2/03-animated-flow.png), 1672×941                 | Navy mission shell, bounded actor-flow panel, highlighted current actor/path, progress rail, contextual step card, right overview and transport controls. Compress to four real deployed participants; preserve the composition rather than repeating Browser/BFF cards as separate systems. |
| [docs/design/mission-control-v2/04-resource-explorer.png](../../../docs/design/mission-control-v2/04-resource-explorer.png), 1672×941         | Authentication banner, dominant resource card, aligned type/ID/action row, left human-readable result and larger right JSON/overview/metadata pane. Keep the primary cyan action and restrained green success treatment.                                                                     |

Use existing CSS/design assets and a small consistent token set for surfaces, borders, spacing, type and focus; do not import a UI kit or introduce a light theme. Match desktop geometry closely, with about 16–24px content gaps and the references' compact header. Essential prose/controls remain at least 14px, actor labels 13px and secondary metadata 12px. Correct contrast when needed without changing the palette.

Do not copy illustrative usernames, event totals, dates, durations, token lifetimes, claims, payloads or profile URLs. Show only existing safe DTO metadata; otherwise use a localized unavailable label. Screenshot navigation to Learn/Token details/error missions is not permission to build those features: link only genuine destinations or contextual explanations. Preserve the language selector even though the mockups omit it.

**Alternative considered:** cosmetic styling around the old canvas. Rejected because it would retain the wrong hierarchy and would fail the four target compositions.

### 2. Keep navigation and presentation state separate from execution

Retain `/missions/oauth-oidc/workspace`, the fixed clean callback return and `?view=fixture` semantics. Use a non-sensitive `mode=inspect` query for Inspect; absent/`mode=explore` opens Explore. An optional `panel=flow|resources` selects Explore's secondary panel. Invalid presentation values fall back safely. Do not place run IDs, callbacks or credentials in these parameters.

Explore/Inspect links, browser back/forward and panel switches preserve the mounted runtime coordinator, current run and selected event. They never start login, logout, token exchange or resource reads. Callback returns to default Explore and reconstructs from session/owned events. Reload retrieves authoritative session and owned events only. An active current session enables the Explorer form immediately; no catalog, permission preflight or FHIR request is needed. It does not restore a JSON response from storage or re-fetch FHIR automatically. Explicit locale remains the only persisted browser preference.

Mission-owned stage definitions and event-to-stage projection supply the OAuth three-stage story. Shared navigation/layout/renderers accept supplied data; no OAuth names, event-kind branches or fixed three-step assumption enter the generic shell. ePA remains a conceptual preview without these execution controls.

**Alternative considered:** separate applications or nested workspaces with their own session hooks. Rejected to avoid duplicated requests, lost event selection and competing logout state.

### 3. Give Explore one truthful next action

| Authoritative state                  | What Explore communicates                                                                                         | Dominant next action                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Restoring/loading                    | Checking the session; success is unknown. Keep conflicting actions unavailable.                                   | None while pending; announce status.                                  |
| Anonymous/no run                     | Mission objective and the external provider redirect.                                                             | Authenticate.                                                         |
| Navigating / current attempt pending | Browser is leaving or the attempt is pending; no invented provider progress.                                      | None during navigation; cancellation stays secondary where supported. |
| Authenticated                        | Session is active and the Explorer form is enabled; HAPI permission is not yet established.                       | `Ressource abrufen` / `Fetch resource` within Explorer.               |
| Resource denied / not found          | Explain the actual rejection or missing allowed resource; keep the form enabled while the BFF session is current. | Deliberate fetch retry, or reauthenticate when appropriate.           |
| Expired                              | Application authentication has expired; safe owned history may remain.                                            | Authenticate again.                                                   |
| Failed/provider-denied               | Concise known failure and safe recovery; no invented cause.                                                       | Retry as a fresh transaction.                                         |
| Logged out                           | Local session ended; retained viewing history is not authorization and provider SSO may still exist.              | Authenticate again.                                                   |

Stage 1 is Authenticate; stage 2 is Validate tokens / establish session; stage 3 is Access protected resources. The BFF validates the ID Token; HAPI validates the Access Token when the resource is requested. A `session-established` event supports the session stage; `token-validation-succeeded` means the recorded BFF ID-token check, not every token check everywhere. Resource success requires an actual validated resource result. Playback position and checkpoint selection never change these statuses. Missing evidence stays incomplete, even when the authoritative session is active. An older retained authentication must not label a newer failed/pending run successful.

The status card answers what happened, what succeeded and what comes next. Run IDs, detailed event lists and validation fields move to Inspect. Logout, view restoration and Inspect remain secondary, independently usable when trace capacity is exhausted.

### 4. Inspect consumes existing safe evidence without widening it

The left timeline lists ordered owned events with local presentation filters for actor/channel/outcome and keyboard selection. Filtering preserves event IDs/order; a hidden selection is identified or moved explicitly rather than silently showing the wrong detail. Previous/next traverses the displayed ordered set and reports its position. No run-history discovery API is added merely because the mockup shows a Run selector.

The center shows what happened, actual observer, timestamp, outcome and actors/channel, followed by expandable typed safe evidence and a separate explanation. The right column summarizes the current run and already-available safe metadata. Unknown fields/versions fail closed with unavailable/incomplete presentation and no raw JSON fallback. No arbitrary headers, full URLs, callback parameters, identity claims, JWT payloads or token-validity panels are added to event DTOs to fill mockup space.

`observedBy: auth-client` and optional bounded `reportedBy: res-server` remain distinct. A received HAPI response is a BFF observation; HAPI's decision is shown only when its validated report exists. Callback evidence is Browser→BFF, not a direct Keycloak→BFF network request. Provider password/internal PKCE checks remain explained/not observable. Actor-local checks have no transport arrow.

**Alternative considered:** request/response interception and redaction after capture. Rejected: presentation must use the existing allowlisted DTO contract, never capture secrets first.

### 5. Playback is an evidence-indexed presentation controller

Use neutral protocol-flow selection plus a small playback hook with selected event ID, playing/paused state and a cancellable presentation timer. The ordered validated event list is the sole source of observed frames; preserve original sequence rather than sorting timestamps or adding decorative success events. Group AS/IdP roles into one Keycloak deployment while keeping their explanations accurate.

Show four compact participants: Browser, BFF, Keycloak, Resource Server. Arrows follow the selected event's actual channel/source/target. BFF-local validation pulses the BFF without an arrow; explicitly reported HAPI decisions get their reported label. Browser navigation to Keycloak is explained as the BFF's issued redirect; receipt/authentication at Keycloak is not claimed as observed.

Play advances through existing frames; pause stops the timer; previous/next select one frame; replay resets presentation to the first recorded frame. End-of-run pauses. Empty/unsupported traces cannot play; incomplete traces show their gap and do not invent completion. Run replacement, unmount or leaving the playback panel cancels timers. Language changes retain selection and playing/paused intent. Presentation durations are not measured network timings.

Playback starts paused after callback restoration. The SPA is absent during external login, so label it as a reconstruction of recorded evidence. Reduced motion disables moving paths, pulses and auto-advancing animation; manual previous/next/replay provide instant equivalent states. All controls have names, keyboard activation and visible focus. Tests assert that transport controls issue zero execution requests.

**Alternative considered:** animate a predetermined ideal login sequence in real time. Rejected because it invents observations and cannot observe the external provider page.

### 6. Enable Resource Explorer from the current authenticated session

Successful authentication or authoritative session restoration enables the Resource Explorer form immediately. Authentication identifies the owning session; it does not promise HAPI permission. Keep the existing session contract and token handling. Do not add a preliminary FHIR read, permission preflight, token introspection or separate authorization eligibility store. Missing teaching events do not disable a current authenticated form.

For this single-entry version, the mission-owned form has one type option, `Basic`, and an ID initially set to `playground-demo`. These presentation defaults make no security decision. The BFF's finite server allowlist remains exactly `{resourceType: Basic, id: playground-demo, operation: read-demo-basic}` and validates every selected request independently of frontend state. No Patient, Observation, extra ID, arbitrary URL or generic FHIR operation is enabled.

The learner's explicit Fetch is the actual selected resource request: the BFF validates the active owning standard session, bounded type/ID and exact allowlist before contacting its configured fixed HAPI target. HAPI then independently validates the server-held Access Token and resource authorization. Only the actual validated 200 supports a successful resource result; the first fetch and every later fetch use the same authorization path. Opening the form, restoring a session or changing views performs no resource request.

Anonymous, expired, logged-out and ePA-only contexts have no usable standard Explorer and require login. Preserve existing pending-attempt, current-run and ownership guards; retained authentication must not label a newer failed/pending run successful. On BFF session loss, clear data and disable the form. On a HAPI 401/403 or allowed-resource 404, clear any previous success payload and explain that actual outcome; an otherwise current BFF session keeps the form enabled for deliberate retry/recovery. A denial does not create an unlock requirement. Abort/discard responses superseded by logout, expiry or authentication replacement and retain the BFF's asynchronous current-authentication recheck.

**Catalog decision:** omit `GET /api/oauth/resource-catalog`. With one fixed entry and session-derived form availability, it supplies no needed runtime information. Keep the one-entry selector in mission-owned presentation and enforce the independent BFF allowlist per request; add no catalog DTO, route, proxy allowance or eligibility state. The existing session/events reads already support restoration.

**Alternative considered:** a preliminary fixed read plus stored eligibility and a protected catalog read. Rejected because it duplicates the selected read, adds state/routing and still cannot guarantee authorization on the next HAPI request. Additional resources remain a separately reviewed extension.

### 7. Extend the resource contract without breaking existing consumers

| Interface                                                               | Planned contract                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/oauth/resource` with no query                                 | Existing fixed-resource status/body schema and behavior remain unchanged; no Explorer-unlocking side effect.                                                                                                                      |
| `GET /api/oauth/resource?resourceType=Basic&resourceId=playground-demo` | New strict, versioned Explorer result. Require both single scalar selectors and the active owning session; validate the exact pair against the server allowlist, then let HAPI authorize the actual read. No preliminary request. |

The selected request accepts no extra keys, duplicate/array/object selectors, body, Authorization header or token parameter. Malformed syntax is 400; a well-formed unapproved pair is 403, before HAPI contact. Authenticate before returning resource-selection details to anonymous callers. The configured upstream remains the already-validated fixed origin/path with no forwarded query or redirects. Preserve same-origin cookies, Host/proxy checks, no-store, timeout/size bounds, trace reservation and late-result rejection.

The new 200 representation contains a typed safe FHIR projection of the **actual validated** Basic: `resourceType`, `id`, `code.coding` and `code.text`, plus only explicitly validated optional `meta.versionId`/`meta.lastUpdated`. Drop `meta.source`, extensions, narratives, unapproved fields and authentication-related material. Reject resource/identity mismatch, unsafe unexpected payloads, malformed JSON, wrong media type and responses exceeding the existing 64KiB BFF limit. No passthrough or raw-body fallback. Keep the old three-field summary separate; do not wrap it in fabricated FHIR JSON.

The viewer renders escaped text, with optional copy of that same safe projection. Summary, JSON and allowed technical metadata are views of one result. Only actual available status, validated content type, bounded retry delay and BFF-measured elapsed time are shown; missing values are omitted/unavailable, never screenshot constants. No Set-Cookie, Authorization, callback URL, arbitrary upstream headers or unrestricted OperationOutcome reaches the browser. Clear the result on expiry/logout/ownership loss and discard late responses; do not persist resource data. Inspect receives existing bounded resource observations, not this payload.

Extend strict SPA resource decoders and controller tests together; keep session and version-1 event DTOs unchanged. The selected request uses the existing resource path and GET allowance in public Nginx/private Vite; no new endpoint or proxy allowance is needed. Verify selector forwarding and existing trust/method/path controls, including rejection of the unimplemented resource-catalog path. Apply existing resource/aggregate budgets to each explicit read, preserving independent logout capacity.

### 8. Present statuses with their actual meaning and source

| Result          | Meaning / behavior                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 200             | The selected allowed synthetic resource was returned and validated; show summary and safe JSON.                                                                                                                                            |
| 401 from BFF    | Application authentication is absent/expired/no longer current; clear Explorer and offer login.                                                                                                                                            |
| 401 from HAPI   | HAPI rejected Access Token authentication; do not claim the BFF session or provider SSO was ended. Clear any prior payload and offer appropriate recovery; form availability continues to follow the authoritative BFF session.            |
| 403             | An authenticated request lacks resource permission or requests an unapproved operation; distinguish BFF allowlist rejection from a validated HAPI report. Clear any prior payload; keep the form enabled while the BFF session is current. |
| 404             | The approved resource was not found when an authorized request actually reached HAPI; do not invent missing Patient/other IDs or treat event-ownership 404 as a FHIR result.                                                               |
| 429             | The request was throttled by the known boundary, or source unavailable; honor a safe bounded Retry-After when present, avoid auto-retry loops, leave logout available. A proxy denial is not a recorded HAPI decision.                     |
| 400 / 502 / 504 | Invalid selectors / upstream failure or invalid response / timeout. Show safe localized recovery, not raw diagnostics or fabricated HTTP outcomes.                                                                                         |

A real HAPI 404 for the exact allowed entry is tested by omitting that fixture in an isolated test server; never delete live data for a negative test. Test proxy/BFF throttling without inventing HAPI rate-limit events. No new resource is admitted to make these scenarios easier.

### 9. Make visual, functional and security acceptance independently reviewable

| Acceptance area            | Required verifiable evidence                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual fidelity            | Actual rendered Explore, Inspect, Flow and Explorer captures at each target's native size, plus navy baseline comparison; side-by-side/overlay review of composition, proportions, spacing, navigation, hierarchy, typography and color. Mask only legitimate runtime text, not geometry. Record each discrepancy and security/accessibility correction; no blanket visual pass. |
| Explore/Inspect navigation | Default Explore, direct Inspect URL, browser history, keyboard mode changes and stable run/event selection; execution-request counters stay unchanged.                                                                                                                                                                                                                           |
| Session states             | Browser scenarios for every state in decision 3, including failed new attempts with retained prior authentication and absent/incomplete history.                                                                                                                                                                                                                                 |
| Playback                   | Deterministic recorded frames, no execution calls, proper channels/local checks, external-redirect reconstruction, empty/gapped traces and reduced-motion/keyboard equivalence.                                                                                                                                                                                                  |
| Explorer                   | Anonymous/expired form requires login; successful authentication/restoration immediately enables it with zero preliminary FHIR/catalog requests. The first fetch is the selected read. Actual denials do not create an eligibility gate; crafted requests cannot bypass session, context or allowlist.                                                                           |
| FHIR denials               | Real signed-token/JWKS/HAPI tests: 200 allowed, 401 absent/expired/invalid/ID Token/wrong issuer/audience, 403 missing scope/unapproved resource; isolated missing fixture 404 and actual boundary 429. No mock-only security acceptance.                                                                                                                                        |
| Lifecycle regressions      | Existing login/callback/session restoration, BFCache, timeout, race/logout cancellation, history ownership, stale cookies, capacity and no browser credential storage.                                                                                                                                                                                                           |
| DE/EN and accessibility    | 1672/1585 target sizes, 1366/1024/390/320 CSS px, actual browser zoom 100%/200%, keyboard/focus/announcements, reduced motion, text 4.5:1 and controls/focus 3:1 contrast, axe plus manual semantics. No page-level horizontal scroll; code may scroll locally.                                                                                                                  |
| OAuth/ePA preservation     | Existing standard Code/S256 and ePA required-PAR/header/browser checks; conceptual ePA and fixture separation; no new provider policy or HAPI privilege/data changes.                                                                                                                                                                                                            |

Use existing Playwright/axe, TypeScript, architecture/localization checks, BFF suites and HAPI integration machinery. Do not claim viewport/device scaling as native browser zoom. If actual zoom or another required check cannot run, record it explicitly as unverified; do not close acceptance with a substitute. Deterministic fixtures can stabilize visual tests but must stay isolated from runtime data and be labeled as test evidence.

## Risks / Trade-offs

- Competing reference navigation and unsafe illustrative fields → keep composition, document semantic corrections and expose only implemented destinations/safe DTO fields.
- Incomplete observations or history expiry → mark gaps, preserve authoritative session state, never backfill an ideal flow or make cleanup depend on event storage.
- A resource response arrives after logout or a new login → tie each result to the exact server authentication and abort/discard superseded UI work.
- An enabled form is mistaken for granted FHIR permission → distinguish current authentication from the latest actual read result and enforce BFF allowlist/HAPI authorization on every fetch; add no catalog endpoint or eligibility cache.
- FHIR JSON could widen disclosure → a separate strict synthetic projection, bounded parsing, escaped viewer and negative payload tests; no policy or data expansion.
- Narrow layouts and 200% zoom differ from the desktop mockups → stack Inspect timeline/detail/metadata, collapse mission navigation accessibly and retain local code scrolling; maintain equivalent controls and readable type.

## Migration Plan

This step writes planning artifacts only. All implementation tasks remain unchecked, and the running public Playground remains unchanged.

After explicit implementation approval, deliver the six task groups on the feature branch with isolated verification. Keep existing route/callback behavior and no-query resource/session/event contracts compatible; no data or session migration is required. Update the UX/reference interpretation documents with the implemented states without rewriting historical acceptance records.

Public release is a later explicit instruction after the integrated evidence is reviewed. Build and pin verified application images only then, retaining the existing resource route/proxy boundaries and leaving provider configuration and persistent data intact. Retain the currently verified application image/configuration privately for targeted recovery. Rollback restores those application images/configuration with no catalog route to remove; it requires no provider replacement, database reset, volume deletion or second public site.
