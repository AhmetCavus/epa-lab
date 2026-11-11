# Capability Spec — Mission Experience

**Status:** DRAFT — NOT IMPLEMENTATION-AUTHORIZED

## Purpose

Preserve the implemented fixture-based Mission Control experience and define how a verified real OAuth mission returns, restores browser-owned runs, and presents safe observations without changing the generic visual design.

The existing fixture-only UI remains authorized. All runtime scenarios below remain DRAFT until reviewed and explicitly authorized for implementation.

## ADDED Requirements

### Requirement: Fixture catalog and routing

The fixture-only build SHALL retain its existing catalog, preview routes, honest availability, and conceptual ePA experience without backend execution.

#### Scenario: Catalog and routing in fixture mode

- **GIVEN** the fixture-only build at `/missions`
- **WHEN** a visitor activates either preview link with a keyboard
- **THEN** the corresponding `/missions/:missionId/workspace` opens
- **AND** OAuth remains Fixture preview and ePA remains Planned
- **AND** direct URLs, back/forward navigation, and unknown mission recovery remain usable.

#### Scenario: Existing public deployment stays fixture-only

- **GIVEN** the currently authorized static UI deployment
- **WHEN** either mission is opened
- **THEN** no authentication or resource execution is offered or silently attempted
- **AND** the ePA preview creates no operational interactions, results, or telemetry.

### Requirement: Independent learning and fixture selection

Selecting a checkpoint or actor SHALL change learning or inspection context without executing a protocol action, changing authentication, or creating an observed event.

#### Scenario: Selecting learning content

- **GIVEN** either fixture workspace or a runtime workspace
- **WHEN** the visitor selects a checkpoint or actor
- **THEN** its explanation or inspection context is shown
- **AND** learning selection remains separate from run/authentication state and event arrival
- **AND** selecting an actor clears the active interaction as before.

### Requirement: Honest samples and safe inspection

Fixture samples SHALL retain their explanatory provenance, typed safe example fields, and absence of actual observer/timestamp. They SHALL NOT be relabeled or mixed into an observed runtime trace.

#### Scenario: Loading and inspecting fixture samples

- **GIVEN** the OAuth fixture preview initially has an empty timeline
- **WHEN** the visitor explicitly loads and selects a sample
- **THEN** its actors/path and Inspector remain synchronized
- **AND** it is labeled Fixture / Explained or Not observable, with no invented observer or timestamp
- **AND** Replay explanation and Reset view preserve the loaded samples.

#### Scenario: Keeping samples separate from a real run

- **GIVEN** a runtime binding and an available fixture preview
- **WHEN** the visitor uses either experience
- **THEN** its execution kind is explicit
- **AND** loading or replaying samples does not create a real run or append samples to its observed events.

### Requirement: Preserve the Mission Control visual contract

The integrated experience SHALL preserve the existing header, artwork, cards, mission panel, swimlane canvas, Inspector, timeline, and interaction hierarchy. Runtime actions and status SHALL use the established presentation without redesigning the workspace.

#### Scenario: Rendering runtime states in the existing design

- **GIVEN** empty, returning, authenticated, resource-allowed, resource-denied, failed, and signed-out runtime states
- **WHEN** each state is displayed
- **THEN** existing panel hierarchy, dark visual language, artwork, actor grouping, and control emphasis remain recognizable
- **AND** only real contextual actions and status are added
- **AND** existing fixture screens retain their design and behavior.

### Requirement: Responsive accessible interaction

Both preview and runtime experiences SHALL retain keyboard access, visible focus, accessible names, non-color-only state, reduced-motion behavior, readable diagram scrolling, and a structured text alternative.

#### Scenario: Navigating at narrow widths and browser zoom

- **GIVEN** both languages at supported desktop/narrow widths, including 1366, 1024, 390, and 320 CSS pixels
- **WHEN** the visitor navigates panels and the selected actor/path/event at actual 100% and 200% browser zoom
- **THEN** essential text and controls remain reachable without overlap or clipping
- **AND** the Inspector reflows, the diagram scrolls locally, and Fit restores readable 100% map scale.

#### Scenario: Keyboard and reduced-motion operation

- **GIVEN** keyboard navigation or a reduced-motion preference
- **WHEN** the visitor uses mission actions, selection, language switching, and recovery
- **THEN** names, focus, pressed/selected state, and outcome announcements remain accessible
- **AND** no result depends solely on animation or color.

### Requirement: A visitor can select a real available mission

The catalog SHALL offer real execution only for a separately enabled and end-to-end verified runtime binding. A preview or conceptual mission SHALL NOT imply executable availability.

#### Scenario: Selecting an enabled verified mission

- **GIVEN** the standard OAuth mission has a verified runtime binding in the configured integration environment
- **WHEN** the visitor selects its runnable action
- **THEN** the existing OAuth Workspace opens with accurate runtime status and available actions
- **AND** the ePA mission remains conceptual/Planned.

#### Scenario: Runtime is absent or unavailable

- **GIVEN** no runtime binding is enabled, or a configured backend operation fails
- **WHEN** the catalog/workspace is displayed
- **THEN** preview mode remains honest, or the runtime presents a safe unavailable/recovery state
- **AND** no synthetic success or fabricated event progress is shown.

### Requirement: The workspace is not OAuth-specific

The workspace SHALL accept mission-owned actors, actions, content, and neutral event presentation without protocol-specific shell branches or dependence on a fixed step count.

#### Scenario: Rendering both mission families

- **GIVEN** the executable OAuth mission and conceptual ePA fixture
- **WHEN** either workspace is selected
- **THEN** the same generic layout, selection, canvas, Inspector, and timeline controls render its supplied content
- **AND** the ePA concept cannot invoke the OAuth execution binding
- **AND** AS and IdP remain separate logical roles grouped in one Keycloak deployment where defined.

### Requirement: Browser redirects do not fake a stepped debugger

The runtime Workspace SHALL start login through normal browser navigation and explain leaving for the provider. It SHALL display only outcomes actually observed by the appropriate component.

#### Scenario: Leaving for the provider

- **GIVEN** the standard runtime workspace can start authentication
- **WHEN** the visitor activates Start authentication
- **THEN** the browser navigates to the BFF's login route and follows its provider redirect
- **AND** no password form or provider-step debugger is introduced in Mission Control
- **AND** any pending/returning state describes actual navigation or retrieval rather than fabricated provider progress.

#### Scenario: Front-channel evidence records only what the BFF sees

- **GIVEN** the BFF issues a browser redirect toward Keycloak
- **WHEN** that observation is displayed
- **THEN** it describes the BFF's issued response/instruction and identifies the actual observer
- **AND** it does not claim that Keycloak received the request or performed internal authentication merely because the redirect was issued.

### Requirement: Restore the current run after callback navigation

The fixed OAuth Workspace route SHALL restore minimal session state and the current browser-owned run from the backend after callback or refresh. Restoration SHALL NOT depend on credentials or run state stored in browser storage.

#### Scenario: Returning from a completed callback

- **GIVEN** a successful or correlated failed standard callback
- **WHEN** the browser reaches `/missions/oauth-oidc/workspace`
- **THEN** session/run retrieval restores its actual authentication and safe outcome
- **AND** eligible real events appear in the existing timeline without replaying protocol actions
- **AND** callback secrets are absent from the visible return URL.

#### Scenario: Refreshing an eligible runtime run

- **GIVEN** a valid browser viewing context and unexpired run
- **WHEN** the visitor refreshes the Workspace
- **THEN** the same run/event identities and sequence are restored from the backend
- **AND** no new login, token exchange, or resource request is triggered merely by viewing it.

#### Scenario: Missing, expired, or lost context

- **GIVEN** absent viewing ownership, expired history, a backend restart, or failed session/run retrieval
- **WHEN** the visitor returns or refreshes
- **THEN** the Workspace shows a non-sensitive unavailable/recovery state
- **AND** offers a fresh login where appropriate
- **AND** does not reconstruct observations from fixtures or guess that provider login succeeded.

### Requirement: Serve only browser-owned run evidence

Run/event access SHALL require valid browser viewing ownership independently of authentication. An opaque run ID SHALL NOT authorize access, and invalidated cookies SHALL NOT retain viewing rights.

#### Scenario: Rejecting another browser's run request

- **GIVEN** two separate browsers with independent runs
- **WHEN** one requests the other's `/api/oauth/runs/:runId/events`
- **THEN** no run data or existence-sensitive details are disclosed
- **AND** the legitimate owner's history is unchanged.

#### Scenario: Rejecting a run ID without viewing ownership

- **GIVEN** a known run ID but no valid owning cookie, or an invalidated pre-rotation cookie
- **WHEN** events are requested
- **THEN** no event document is returned
- **AND** knowing the ID does not grant access.

#### Scenario: Viewing safe history after local logout

- **GIVEN** local logout removed authentication and rotated the browser context
- **WHEN** the replacement unauthenticated context views its eligible history
- **THEN** it can inspect the existing safe run under the original lifetime
- **AND** it cannot use the history or run ID to authorize a resource request.

### Requirement: Bound run retention and event collections

Run viewing SHALL expire within fifteen minutes without renewal through logout. Run/context collections SHALL remain bounded to 1000 entries each, and each run SHALL contain at most 100 events. These limits SHALL NOT prevent session invalidation, pending-login cancellation, or credential cleanup.

#### Scenario: Expired history cannot be recovered

- **GIVEN** a run has reached its original viewing lifetime
- **WHEN** its events are requested, including after logout
- **THEN** no run document is returned
- **AND** the UI shows safe recovery rather than extending or reconstructing its history.

#### Scenario: Capacity is reached

- **GIVEN** a required collection or per-run event limit is reached
- **WHEN** another ordinary execution action would exceed that limit
- **THEN** that execution action is rejected safely before creating new external work
- **AND** logout, login cancellation, and authentication cleanup remain available independently of trace capacity
- **AND** no event stream is silently truncated and presented as complete
- **AND** the UI does not claim an unperformed protocol action occurred.

#### Scenario: Reflecting logout when its observation cannot be stored

- **GIVEN** an authenticated runtime context with eligible safe history at the trace limit
- **WHEN** authorized local logout succeeds but its event cannot be appended
- **THEN** the Workspace reflects the authoritative unauthenticated session state
- **AND** it cannot use retained history to regain resource access
- **AND** existing history remains non-sensitive, bounded, owned by the replacement unauthenticated context, and subject to its original expiry
- **AND** the unrecorded observation/trace completeness is marked unavailable without inventing an event, timestamp, or sequence.

### Requirement: Use a versioned typed safe event contract

Observed events SHALL use a versioned discriminated contract with stable run/event IDs, per-run sequence, actual observer/time, event kind, actor references, channel, outcome, and operation-specific allowlisted evidence.

#### Scenario: Reading a supported event document

- **GIVEN** a valid schema-version-1 run/event document
- **WHEN** it is projected into Mission Control
- **THEN** each observed event has a stable `eventId`, `runId`, `sequence`, `observedAt`, `observedBy`, `kind`, actor reference(s), `channel`, `outcome`, and typed `evidence`
- **AND** evidence contains only fields allowed for that kind, such as `code`, `S256`, a known operation alias, HTTP status, or stable reason code
- **AND** there is no unrestricted metadata object or HTTP-body dump.

#### Scenario: Keeping observation identity and order stable

- **GIVEN** recorded events with equal or differently formatted timestamps
- **WHEN** the run is read again, refreshed, replayed, or displayed in another locale
- **THEN** event IDs, observer timestamps, and per-run sequence remain unchanged
- **AND** rendering time or teaching-checkpoint position does not replace recorded order.

#### Scenario: Rejecting unsupported or unsafe event data

- **GIVEN** an unsupported version/kind, unknown field, invalid actor/channel association, or unsafe evidence
- **WHEN** the event projection boundary processes it
- **THEN** the unsupported data is rejected with a safe localized outcome
- **AND** no raw JSON or upstream-text fallback is rendered or logged
- **AND** an incomplete/unavailable trace is not presented as complete.

### Requirement: Evidence is not confused with explanation

The Inspector SHALL distinguish BFF-observed evidence, explicitly Resource Server-reported decisions, fixture explanations, and Not observable provider internals. A response outcome SHALL NOT be presented as an observed list of internal checks.

#### Scenario: Inspecting a BFF observation

- **GIVEN** an observed callback, token exchange, or resource response
- **WHEN** the learner selects it
- **THEN** the Inspector shows what happened, actual observer/time, allowlisted evidence, separate explanation, actors/channel, and applicable recovery
- **AND** diagram, timeline, and Inspector selection stay synchronized.

#### Scenario: Showing an explicitly reported Resource Server decision

- **GIVEN** a response from the configured Resource Server with valid bounded decision/reason headers
- **WHEN** its resource-response event is displayed
- **THEN** `observedBy` is `auth-client` with the BFF's response observation time
- **AND** the nested decision is explicitly `reportedBy: res-server`
- **AND** only `allowed`/`denied` and the defined reason codes are accepted
- **AND** no Resource Server timestamp or successful internal-check list is invented.

#### Scenario: Resource Server reason is unavailable

- **GIVEN** absent, unknown, malformed, or conflicting decision-report fields
- **WHEN** the BFF's actual resource response is inspected
- **THEN** the observed HTTP result can still be shown
- **AND** the decision reason is marked unavailable without exposing the raw report or inferring its internal cause.

#### Scenario: Provider-internal explanation stays unobservable

- **GIVEN** teaching content about Keycloak password validation, PKCE comparison, or token creation
- **WHEN** it is displayed alongside real observations
- **THEN** it remains Explained / Not observable with no fabricated observer or timestamp
- **AND** an internal annotation has no network arrow and is not counted as an observed event.

#### Scenario: BFF denial is not a Resource Server denial

- **GIVEN** an unauthenticated resource attempt rejected by the BFF without contacting HAPI
- **WHEN** that outcome is displayed
- **THEN** its actual rejecting observer and local/front-channel boundary are identified
- **AND** no Resource Server request, response, or decision is fabricated.

### Requirement: States have useful recovery

The Workspace SHALL distinguish navigation/retrieval pending, authenticated, resource-allowed/denied, failed, cancelled, expired/unavailable, and signed-out outcomes using only safe known information.

#### Scenario: Recovering from failed or cancelled login

- **GIVEN** a safely classified failed, cancelled, or expired login outcome
- **WHEN** the visitor returns to Mission Control
- **THEN** the outcome is explained without provider text, secrets, or guessed root causes
- **AND** Retry flow starts a fresh run/transaction.

#### Scenario: Resource access fails after successful login

- **GIVEN** authentication succeeded but the Resource Server denies the resource or the upstream request fails
- **WHEN** the result is displayed
- **THEN** application authentication and resource outcome remain distinct
- **AND** the UI shows only an actual denial or known transport failure, with an appropriate recovery action.

#### Scenario: Session restoration is pending

- **GIVEN** the Workspace is retrieving session/run state after return
- **WHEN** retrieval has not completed
- **THEN** it shows an accurate restoring state and prevents conflicting execution
- **AND** it does not announce authentication or resource success in advance.

### Requirement: Recovery and learning commands have distinct effects

Retry flow SHALL start new protocol work. Replay explanation SHALL inspect existing evidence. Reset view SHALL change only view/selection. Sign out SHALL perform local application logout.

#### Scenario: Replaying or resetting does not execute

- **GIVEN** loaded fixture samples or eligible real events
- **WHEN** Replay explanation or Reset view is activated
- **THEN** existing event/run identities are preserved
- **AND** no login, exchange, resource call, or logout is triggered
- **AND** Reset view restores readable map scale and clears the intended selections.

#### Scenario: Signing out keeps eligible safe inspection

- **GIVEN** an authenticated runtime workspace
- **WHEN** Sign out completes
- **THEN** it shows the local signed-out state and removes authenticated resource capability
- **AND** eligible browser-owned safe history remains inspectable
- **AND** it does not claim Keycloak-wide SSO logout or immediate bearer-token revocation.

### Requirement: Localize runtime presentation without changing protocol state

German SHALL remain default/fallback and English supported through matching semantic resources. Language changes SHALL preserve mission, run, fixtures, selection, and map state; technical evidence SHALL remain literal.

#### Scenario: Rendering both supported languages

- **GIVEN** no explicit locale choice, an explicit English choice, or unavailable preference storage
- **WHEN** fixture/runtime screens, actions, outcomes, and accessibility text are rendered
- **THEN** German default/fallback and English selection behave as before
- **AND** no raw translation key or provider error text is exposed
- **AND** protocol literals, identifiers, event payload values, and recorded provenance are unchanged.

#### Scenario: Changing language during inspection

- **GIVEN** a selected checkpoint/actor/event, current run, loaded fixture state, and map scale
- **WHEN** the visitor changes language
- **THEN** that state remains intact while visible/accessibility text updates
- **AND** no protocol action is retried or new observed event created
- **AND** only the explicit language preference is persisted under `auth-protocol-playground.locale`.

### Requirement: Keep sensitive data out of the learning surface

The learning UI and its event transport SHALL contain no credentials, transaction secrets, raw identity claims, raw callback URLs, or full HTTP bodies. Mission/session/run credentials SHALL NOT be persisted in browser storage.

#### Scenario: Inspecting runtime and fixture evidence

- **GIVEN** any successful, rejected, denied, expired, or signed-out flow
- **WHEN** the event API, Inspector, timeline, structured alternative, announcements, browser storage, or routine logs are inspected
- **THEN** passwords, codes, state/nonce, PKCE verifiers, tokens, client secrets, cookie values, raw identity claim sets, unsafe callback URLs, and entire HTTP bodies are absent
- **AND** bounded synthetic resource content is not copied into the teaching trace
- **AND** the anti-CSRF value is used only for its intended same-origin request and never rendered as learning evidence.
