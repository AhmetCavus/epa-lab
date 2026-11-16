# Synthetic Resource Explorer

## Purpose

Let an authenticated, authorized learner request an explicitly approved fictional FHIR resource through the existing BFF, understand the actual result and inspect a bounded safe JSON representation without expanding resource permissions or exposing OAuth credentials.

## ADDED Requirements

### Requirement: Explorer follows the approved authenticated resource composition

Explorer SHALL match `docs/design/mission-control-v2/04-resource-explorer.png`, with its placement in `01-explore.png` and navy identity from `00-current-navy-baseline.png` in the same directory. It SHALL show a type selector, ID input, primary localized fetch action, loading/result state, human-readable summary, safe FHIR JSON and available technical metadata.

#### Scenario: Review a permitted successful read

- **GIVEN** an active session with confirmed resource access
- **WHEN** Explorer is rendered at 1672×941 and compared to the approved resource image
- **THEN** the authentication banner, resource card, aligned form, left result summary and larger JSON/metadata area match the reference hierarchy and proportions
- **AND** the primary German action is `Ressource abrufen`, with a corresponding English translation
- **AND** the result uses actual validated data rather than the illustrated profile URL, body, latency or byte count.

### Requirement: Explorer requires current authentication and confirmed resource access

Explorer's controls and data SHALL be available only for the current authenticated owning context with confirmed permission for the allowed operation. Login alone SHALL NOT imply authorization. An explicit existing protected read SHALL establish availability only on validated success for the current authentication; the BFF SHALL enforce this independently of frontend state.

#### Scenario: Establish permission through real work

- **GIVEN** an authenticated session without confirmed FHIR access
- **WHEN** the learner explicitly requests the protected-access check from Explore
- **THEN** the existing fixed resource operation performs a real HAPI read with the server-held Access Token
- **AND** only a validated current-session 200 unlocks Explorer and its approved catalog entry
- **AND** the check counts against the real resource budget and records existing resource observations.

#### Scenario: Reject unavailable eligibility

- **GIVEN** anonymous, expired, logged-out, ePA-only or unconfirmed/denied state
- **WHEN** the user navigates directly to the Explorer panel or crafts a selected-resource API request
- **THEN** the form/result is unavailable and the BFF refuses selected work without contacting HAPI
- **AND** the owning active session receives an appropriate permission/recovery explanation, while missing authentication is 401
- **AND** a forged frontend enabled flag or known run ID grants no access.

#### Scenario: Restore eligibility without repeating the read

- **WHEN** an eligible learner reloads the workspace
- **THEN** a protected versioned catalog read can restore current eligibility and approved entries without making a HAPI request
- **AND** stale eligibility from another authentication, pending current attempt, expired context or backend restart does not enable Explorer
- **AND** a prior FHIR response is not reconstructed from browser storage or silently fetched again.

### Requirement: A finite server allowlist controls resource selection

The BFF SHALL expose and accept only a finite approved synthetic resource catalog, initially exactly `Basic/playground-demo` with read permission `demo.fhir.read`. It SHALL validate type and ID against that catalog on every request and reject unapproved pairs before upstream contact. Frontend controls SHALL NOT be the security boundary.

#### Scenario: Fetch the only approved entry

- **WHEN** an eligible learner selects type `Basic`, supplies ID `playground-demo` and activates fetch
- **THEN** the BFF resolves that exact catalog operation and calls only its configured trusted fixed HAPI target
- **AND** no caller-provided origin, arbitrary path or upstream query is used.

#### Scenario: Reject additional types IDs and operations

- **WHEN** an authenticated caller submits `Patient`, `Observation`, another Basic ID, search, history, batch, write or another undeclared operation
- **THEN** the BFF returns a safe 403 for a well-formed unapproved pair, or 400 for malformed input, before any upstream call
- **AND** the catalog offers no enabled entry for those resources.

#### Scenario: Add a resource only through a later reviewed extension

- **WHEN** another type or ID is proposed
- **THEN** it remains unavailable until its synthetic fixture, server allowlist entry, HAPI policy and real positive/negative security tests have separate approval
- **AND** extensibility does not create a generic FHIR proxy or dynamic plugin mechanism.

### Requirement: Selected requests accept only bounded resource selectors

The selected resource request SHALL accept exactly one scalar resource type and ID with bounded canonical syntax. It SHALL reject extra/duplicate/array/object selectors, traversal, encoded path separators, bodies and caller-selected credentials. Catalog and resource responses SHALL retain same-origin/proxy checks, no-store and current ownership protections.

#### Scenario: Reject crafted request shapes and credentials

- **WHEN** a caller adds URL/host/path/token parameters, an Authorization header, a body, duplicate keys, array/object selectors, oversized values or traversal/separator encodings
- **THEN** the BFF rejects the request without following a redirect or contacting an input-selected target
- **AND** neither secrets nor raw diagnostics are reflected in the response, Inspector or routine logs.

#### Scenario: Preserve the existing no-parameter API

- **WHEN** an existing client calls `GET /api/oauth/resource` without selectors
- **THEN** its existing status/body schema and fixed-resource behavior remain compatible
- **AND** the strict session and version-1 event contracts do not acquire unrelated new fields
- **AND** the selected Explorer response and catalog use their own explicitly versioned validated representations.

### Requirement: HAPI independently authenticates and authorizes every read

Every upstream read SHALL retain HAPI's independent trusted JWT, issuer, audience, expiry, purpose, scope and exact-operation checks. BFF session/catalog eligibility SHALL NOT bypass them. The resource server SHALL remain limited to the existing synthetic Basic read; no policy weakening or live data alteration is permitted.

#### Scenario: Verify real token and scope denials

- **GIVEN** real signed-token/JWKS tests exercising the existing HAPI chain
- **WHEN** the exact read is attempted with valid permitted credentials, no credentials, expired/forged/invalid credentials, an ID Token, wrong issuer/audience, or a valid token missing `demo.fhir.read`
- **THEN** permitted access is 200, unsuitable authentication is 401 and authenticated missing permission is 403
- **AND** undeclared operations remain denied independently of the SPA and BFF
- **AND** security acceptance is not based solely on mocked browser responses.

### Requirement: JSON presentation is an explicit validated synthetic projection

The BFF SHALL return only a bounded validated projection of the actual approved FHIR resource for Explorer. The browser SHALL validate its response, render/copy it as escaped data and keep it separate from teaching-event evidence. Raw HTTP bodies, unrestricted headers, patient data and authentication material SHALL NOT be exposed through JSON, errors or fallback views.

#### Scenario: Display actual safe FHIR JSON

- **WHEN** the exact approved read returns a valid Basic matching the allowlist
- **THEN** summary and JSON derive from that same response, containing only approved `resourceType`, `id`, `code` and explicitly validated optional version/time metadata
- **AND** source URLs, narratives, extensions and unapproved data are not passed through
- **AND** copying JSON copies only that safe projection; no raw-response toggle bypasses it.

#### Scenario: Reject malformed unsafe oversized or mismatched responses

- **WHEN** upstream data has the wrong resource identity/type, malformed JSON, wrong media type, unsafe/unapproved content or exceeds the existing 64KiB BFF parsing bound
- **THEN** the result is a safe unavailable/invalid-response failure with no displayed payload
- **AND** test credential sentinels in rejected data/headers are absent from the UI, browser storage, console, events and routine logs
- **AND** the old summary is not wrapped in invented FHIR JSON to imitate the screenshot.

### Requirement: Results explain actual HTTP outcomes and their source

Explorer SHALL distinguish real 200, 401, 403, 404 and 429 outcomes without inventing causes or confusing transport errors with resource decisions. Available status, safe retry information and measured metadata SHALL be shown with their actual scope/source. Unknown metadata and unavailable HAPI reports SHALL remain explicit.

#### Scenario: Explain authentication and permission failures

- **WHEN** the BFF returns 401 for missing/current-session loss
- **THEN** Explorer is cleared and login is offered
- **WHEN** HAPI returns 401 or 403
- **THEN** the UI describes resource authentication/permission rejection and removes current Explorer eligibility without falsely claiming that provider SSO or BFF authentication has ended
- **AND** BFF allowlist rejection is not labeled a HAPI decision.

#### Scenario: Explain an actual authorized not-found response

- **GIVEN** an isolated test HAPI instance missing only the exact approved fixture
- **WHEN** the permitted token requests that approved resource and HAPI returns 404
- **THEN** Explorer explains that the approved resource was not found and displays no success payload
- **AND** no new type/ID is enabled or live fixture deleted to create the scenario
- **AND** event-ownership 404 remains a separate unavailable-history outcome.

#### Scenario: Explain throttling without fabricating events

- **WHEN** the actual proxy/BFF boundary returns 429
- **THEN** the UI shows throttled state, uses only safe bounded Retry-After information when present and requires a deliberate retry after recovery
- **AND** no fake HAPI observation or fabricated response payload is appended
- **AND** independent logout remains available.

#### Scenario: Omit unsupported metadata and retain safe failure recovery

- **WHEN** timings, size or permitted headers are unavailable, or a timeout/network/invalid-response failure occurs
- **THEN** the UI omits or marks unavailable measurements and explains the safe known failure
- **AND** BFF timing is not presented as a provider-internal or end-to-end browser measurement
- **AND** raw upstream error bodies and arbitrary header lists are never rendered.

### Requirement: Ownership expiry logout and rate limits remain effective

Catalog eligibility and resource results SHALL remain tied to the current authentication and owning context, within existing bounds. Expiry, replacement, logout and upstream authentication/permission denial SHALL invalidate eligibility. Superseded responses SHALL be discarded, and existing resource/read/aggregate rate protections SHALL apply without blocking cleanup.

#### Scenario: Discard a late protected response after logout

- **GIVEN** a resource check or selected read is in flight
- **WHEN** local logout or authentication replacement occurs before completion
- **THEN** no late response establishes eligibility or repopulates JSON/status as authenticated
- **AND** the BFF rechecks the original authentication before returning data
- **AND** safe retained history does not restore resource permission.

#### Scenario: Exhaust budgets or event capacity

- **WHEN** repeated resource checks/reads exhaust the resource budget or trace capacity
- **THEN** existing throttling/capacity behavior rejects additional work honestly without an automatic retry loop
- **AND** catalog/viewing reads cannot amplify into HAPI reads
- **AND** session invalidation, cancellation and credential cleanup remain available even if teaching events cannot be stored.

### Requirement: Resource controls remain localized responsive and accessible

Explorer SHALL provide DE/EN labels, keyboard-operable selectors/input/action, visible focus, loading/error announcements and readable result views. At narrow widths and actual 200% browser zoom the form and summary SHALL reflow; only the bounded code viewer may scroll horizontally. Changing presentation SHALL NOT execute a request.

#### Scenario: Operate and translate the resource form

- **WHEN** the learner enters/selects a resource, changes language or result tabs and uses the keyboard
- **THEN** selected type/ID and current result remain stable, labels/announcements translate and a read occurs only through the explicit fetch action
- **AND** loading, success, denial, not-found and throttled states are conveyed without relying on color.

#### Scenario: Use mobile and zoomed result views

- **WHEN** Explorer is used at 390/320 CSS px or native desktop zoom 200% in either language
- **THEN** all controls and the human-readable result remain reachable without page-level horizontal scrolling
- **AND** reduced motion, contrast and focus requirements remain satisfied.
