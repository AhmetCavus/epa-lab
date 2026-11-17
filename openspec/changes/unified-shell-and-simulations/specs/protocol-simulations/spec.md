# Protocol Simulations

## Purpose

Let learners interactively explore deterministic synthetic OAuth and conceptual ePA
flows in the existing Mission Control v2, with an unambiguous boundary to real execution.

## ADDED Requirements

### Requirement: Execution selection is explicit and backward compatible

The workspace SHALL distinguish Simulation and Live Demo independently of Explore/Inspect.
It MUST preserve existing mission paths, the fixed clean OAuth callback and `mode`/`panel`
semantics. Legacy `view=fixture` links SHALL open idle simulation without live operations.
Only OAuth in the existing enabled runtime SHALL support Live Demo.

#### Scenario: Open legacy and current destinations

- **WHEN** an OAuth workspace opens through an existing bare or callback URL in the enabled runtime
- **THEN** the existing live workspace/session restoration behavior remains compatible
- **WHEN** `execution=simulation` or legacy `view=fixture` is selected
- **THEN** simulation opens idle, including when an authenticated live browser context exists
- **AND** the ePA legacy workspace opens an idle conceptual simulation without authentication.

#### Scenario: Reject unsupported or conflicting selection

- **WHEN** an execution value is invalid/duplicated, an ePA live mode is requested, or live is requested in a disabled runtime
- **THEN** the UI displays a safe simulation or unavailable state and does not initialize live API access
- **AND** `view=fixture` takes precedence over a conflicting live selection
- **AND** URL parameters or browser storage cannot enable the live runtime.

#### Scenario: Preserve view and panel semantics

- **WHEN** the learner changes Explore/Inspect, Flow/Resources, locale or browser history within an active mode
- **THEN** the execution kind and eligible run/event/progress remain consistent
- **AND** `mode=inspect` still means Inspect rather than simulation/live selection
- **AND** presentation navigation starts no authentication or resource operation.

### Requirement: Simulation performs no authentication or backend work

Simulation MUST operate without login and MUST NOT contact Keycloak, BFF, HAPI or legacy
ePA endpoints, including session/history reads, discovery, token exchange and resource
requests. It MUST NOT create authenticated sessions, generate usable credentials or read
live run/resource data. Loading ordinary local SPA assets is outside simulated execution.

#### Scenario: Run with services unavailable

- **WHEN** all OAuth/provider/FHIR/legacy service paths are monitored and unavailable
- **THEN** both simulations can start, progress, inspect, play, request their simulated result, reset and restart
- **AND** no service request attempt, redirect, popup, embedded login or background session/history poll occurs.

#### Scenario: Simulate in an already authenticated browser

- **GIVEN** the browser retains an authenticated live context or a pending live attempt
- **WHEN** simulation is opened directly or through mode switching, then reloaded or restored from browser history
- **THEN** it neither reads nor changes that context and shows no live run/result/CSRF material
- **AND** synthetic success cannot authorize any BFF or HAPI operation.

### Requirement: Every synthetic outcome has explicit provenance

All simulated events, responses, outcomes and displayed times SHALL be labeled SIMULATED
in the active locale. Conceptual ePA SHALL additionally identify conceptual scope. Synthetic
sequence/virtual elapsed time MUST NOT become observed timestamps, real observers, HAPI
reports, backend run IDs or measured network durations. Simulated and observed histories
MUST remain separate.

#### Scenario: Inspect a simulated message or local check

- **WHEN** a synthetic redirect, token exchange, validation, session or resource event is selected
- **THEN** timeline, Inspector, animation summary and outcome show simulated provenance
- **AND** virtual timing is described as synthetic, with no fabricated observer or server report
- **AND** an actor-local check has no network arrow and conceptual provider internals are not represented as observations.

#### Scenario: Reject an incompatible presentation record

- **WHEN** a simulation record enters a live-only projection or an observed record enters a simulation projection
- **THEN** it is rejected or shown as safely unavailable, never reclassified or merged
- **AND** unknown/unsafe evidence has no raw JSON fallback.

### Requirement: Simulations are deterministic finite and disposable

Each mission SHALL own a small finite simulation with deterministic event order, outcomes,
identities and virtual timing for the same scenario/actions. Only one bounded active
simulation per mounted workspace SHALL be retained in memory. It MUST NOT persist
credentials, simulation/live runs, resource results or session state in browser storage.

#### Scenario: Repeat and reset

- **WHEN** the same scenario/actions run, followed by Reset simulation and restart
- **THEN** the defined sequence and synthetic timing repeat, with a fresh local attempt identity
- **AND** reset clears that simulation's progress/events/result, cancels old timers and returns to idle
- **AND** repeated start/resource clicks cannot create duplicate events, unbounded history or parallel timers.

#### Scenario: Reload or leave a simulation

- **WHEN** the page reloads, the mission changes or simulation is unmounted
- **THEN** its disposable progress resets and scheduled work cannot update a later workspace
- **AND** the next simulation starts idle; no authentication or resource operation is replayed
- **AND** locale change and Explore/Inspect changes within the mounted simulation preserve its state.

### Requirement: Playback and execution actions remain distinguishable

Simulation SHALL support explicit Start, pause, step, replay and reset/restart controls.
Playback selection SHALL remain separate from progression. Selecting recorded events or
Replay MUST NOT create a new attempt or repeat resource work. Live playback and Reset
view MUST remain presentation-only; Retry and secure logout retain their existing meaning.

#### Scenario: Pause step replay and request a resource deliberately

- **WHEN** the learner starts and pauses a simulation
- **THEN** progression stops and one Step advances at most one synthetic protocol transition
- **WHEN** Replay or an earlier event is selected
- **THEN** existing events are inspected without creating duplicates or resetting the result
- **AND** automatic progression stops before protected-resource access, which requires its explicit action.

#### Scenario: Reduced motion and terminal outcomes

- **WHEN** reduced motion is enabled, a failure occurs or the simulated trace ends
- **THEN** automatic movement stops while keyboard step/selection/explanations remain available
- **AND** a paused/unmounted/replaced run cannot resume from a stale timer
- **AND** no autoplay runs merely because a view, panel, locale or mode was selected.

### Requirement: OAuth simulation explains the existing standard flow

OAuth simulation SHALL demonstrate authorization initiation, browser redirect, Authorization
Code with PKCE S256, callback, server-side token exchange, BFF-local validation and simulated
session establishment. It MUST use the existing role/channel model, require no PAR and
represent opaque protocol material only as non-usable explanations or placeholders.

#### Scenario: Complete simulated authorization

- **WHEN** the learner explicitly starts and advances the OAuth simulation
- **THEN** Browser/UI, BFF client, Authorization Server/IdP and Resource Server responsibilities are clear
- **AND** the redirect is illustrated in the workspace without navigating to a provider
- **AND** callback transport is Browser to BFF, token exchange is back-channel and local validation is actor-local
- **AND** the final status says simulated session established, never real authentication or HAPI authorization.

#### Scenario: Explain a simulated PKCE failure

- **WHEN** the learner selects the fixed PKCE-rejection example before starting
- **THEN** a deterministic simulated failure stops before session/resource success
- **AND** its explanation and safe restart are keyboard accessible
- **AND** it makes no claim that a real verifier, cryptographic validation or provider rejection occurred.

### Requirement: Simulated OAuth resource access remains fictional

After simulated session establishment, the OAuth simulation SHALL support an explicit
simulated read of only fictional non-clinical `Basic/playground-demo`. It SHALL reuse the
Explorer presentation with a locally defined safe projection and simulated status/source.
It MUST NOT fetch, seed, cache or borrow a real HAPI response or expand live resource permissions.

#### Scenario: Present a local synthetic result

- **WHEN** a simulated session is established and the learner requests its protected resource
- **THEN** the simulated allowed result and bounded fictional Basic projection appear in the Explorer
- **AND** JSON/overview/metadata identify simulation, omit real response measurements and display only safe fixture data
- **AND** the action makes zero backend requests and establishes no live eligibility.

#### Scenario: Explain simulated permission denial

- **WHEN** the fixed missing-permission example reaches an explicit resource request
- **THEN** the result is a clearly simulated denial with no success payload
- **AND** simulated authentication and resource permission remain distinct
- **AND** live HAPI 401/403 observations are not synthesized or inserted into owned history.

### Requirement: ePA simulation is explicitly conceptual and source bounded

ePA simulation SHALL explain existing documented actor responsibilities, authorization
service/IdP roles, PAR, browser/authorization-reference boundaries and conceptual secured
resource access. Every operation/result MUST remain simulated and conceptual. It MUST NOT
claim real TI/VAU connectivity, patient access, verified gematik transactions or conformance.

#### Scenario: Follow a conceptual PAR journey

- **WHEN** the learner starts and advances the ePA simulation
- **THEN** its actors and bounded PAR explanation follow the repository's documented lab/concept model
- **AND** direct server-to-IdP PAR and subsequent user-agent redirect are distinguished
- **AND** requesting a conceptual protected result shows an explanatory synthetic outcome rather than a real ePA/FHIR response
- **AND** Explore, Inspect and playback use the same v2 presentation with ePA-owned explanations.

#### Scenario: Explain a conceptual PAR rejection

- **WHEN** the fixed PAR-rejection example is selected
- **THEN** the conceptual flow stops at that boundary, with no simulated authorized resource success
- **AND** its outcome, explanation and restart remain explicitly simulated, conceptual and accessible
- **AND** no new normative endpoint, insured identity, device/VAU exchange or certification claim is invented.

### Requirement: Mode switching cannot transfer authority or protected results

Switching mode SHALL clear the outgoing presentation's resource payload and isolate
asynchronous work, run IDs, history and controls. It MUST NOT log in, fetch resources or
log out implicitly. Existing live credentials remain server-managed until normal expiry
or explicit secure logout/cancellation. Simulation reset MUST NOT impersonate that cleanup.

#### Scenario: Leave live work for simulation

- **GIVEN** a live resource read or session/history request is in flight
- **WHEN** the learner switches to simulation
- **THEN** late live completions cannot display data, append events or enable simulated controls using live authority
- **AND** simulation starts with no inherited live state and makes no new service request
- **AND** mode selection is not reported as successful logout or server-side cancellation.

#### Scenario: Return to live from a successful simulation

- **WHEN** the learner switches to Live Demo after any simulated success, denial or reset
- **THEN** only the existing live session/owned-history reads may restore real state
- **AND** an anonymous browser remains anonymous until explicit real authentication
- **AND** no synthetic session, result or event is accepted as an authoritative live DTO.

#### Scenario: Preserve explicit logout and cleanup

- **WHEN** real logout/cancellation runs with valid Origin/CSRF, including concurrent requests or exhausted event capacity
- **THEN** existing credential removal, pending-attempt cancellation, context rotation and stale-result rejection remain effective
- **AND** eligible safe live history stays ownership-bound and separate from simulation
- **AND** switching/replaying/resetting a simulation cannot restore old authentication or resource data.

### Requirement: Existing live security and observability remain authoritative

Live Demo SHALL retain the existing Code/S256, server-held tokens, secure cookies, CSRF,
session/owned-event contracts, finite resource allowlist and independent HAPI JWT/permission
checks. Observations and HAPI reports SHALL retain their real provenance. The conceptual
ePA UI MUST NOT change the separate real ePA/PAR implementation or policies.

#### Scenario: Run unchanged real-component regressions in isolation

- **WHEN** the frontend changes are verified against real isolated Keycloak, BFF and HAPI
- **THEN** login, callback, refresh, synthetic read, real event provenance and secure logout retain their existing behavior
- **AND** authentication/permission denials, run ownership, late-result rejection and existing ePA/PAR/browser regressions pass
- **AND** no simulation requirement is met by changing backend/provider policies, live credentials or data.

### Requirement: Simulation content and disclosures stay localized and safe

Simulation SHALL use matching DE/EN labels, explanations, status announcements and accessible
controls. Its banner MUST convey `Simulierter Ablauf – keine echte Authentifizierung`, while
live conveys `Echte Protokollausführung`, with English equivalents. Neither mode SHALL
expose real protocol credentials through events, resource views, browser storage or logs.

#### Scenario: Translate and inspect all surfaces

- **WHEN** DE/EN is switched through simulation Explore/Inspect, playback, results and failure states
- **THEN** progress/selection and literal protocol identifiers remain unchanged and provenance stays visible without relying on color
- **AND** no raw tokens, authorization codes, verifiers, secrets, cookies, callbacks or claim dumps appear
- **AND** copy/display actions expose only the bounded fictional simulation content or validated safe live projection.
