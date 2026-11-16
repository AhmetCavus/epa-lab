# Mission Experience — V2

## Purpose

Help learners understand the current mission outcome and next action through Explore, while developers inspect the same owned run through a separate safe technical view. Preserve functioning authentication, mission boundaries and accessible German/English presentation.

## ADDED Requirements

### Requirement: V2 presentation matches the approved visual references

The OAuth workspace SHALL match the approved navy compositions, component proportions, spacing, navigation, typography and hierarchy. The four target designs SHALL be acceptance references; the baseline SHALL govern theme and identity. Security, protocol and accessibility corrections SHALL be documented without substituting another design language.

#### Scenario: Compare each target with rendered browser evidence

- **GIVEN** these authoritative files and their reference contract:
  - `docs/design/mission-control-v2/00-current-navy-baseline.png`
  - `docs/design/mission-control-v2/01-explore.png`
  - `docs/design/mission-control-v2/02-inspect.png`
  - `docs/design/mission-control-v2/03-animated-flow.png`
  - `docs/design/mission-control-v2/04-resource-explorer.png`
  - `docs/design/mission-control-v2/README.md`
- **WHEN** the implemented Explore, Inspect, Animated Flow and Resource Explorer views are reviewed
- **THEN** actual screenshots are compared at the target images' native desktop dimensions, with explicit findings for layout, proportions, spacing, navigation, type, color and hierarchy
- **AND** every view retains deep navy surfaces, blue/cyan emphasis and Mission Control identity
- **AND** only legitimate dynamic content is masked; material geometry differences remain visible
- **AND** each deviation or unavailable check is recorded rather than hidden in a general visual pass.

#### Scenario: Correct illustrative content while preserving composition

- **WHEN** an image includes invented accounts, event counts, times, token details, raw-response controls or unavailable navigation
- **THEN** the implementation uses real safe metadata or an unavailable label, and links only genuine destinations
- **AND** neither runtime values nor FHIR results are hardcoded from the image
- **AND** no light theme, unrelated visual system or new speculative feature is introduced.

### Requirement: Explore is the default and Inspect is a separate view

The mission SHALL open in Explore and provide explicit Explore/Inspect navigation over the same run. Mode and panel changes SHALL preserve eligible run identity and selected event without executing authentication, logout or protected resource operations. Existing mission and clean callback routes SHALL remain compatible.

#### Scenario: Navigate modes and browser history

- **GIVEN** an owned run with a selected event at `/missions/oauth-oidc/workspace`
- **WHEN** the learner opens Inspect, returns to Explore or uses browser back/forward
- **THEN** the corresponding mode is identifiable and the same run/event remains selected where available
- **AND** a direct `mode=inspect` URL opens Inspect; absent or invalid mode opens Explore
- **AND** execution-request counters do not increase.

#### Scenario: Restore after callback or reload

- **WHEN** the browser returns through the fixed clean callback route or reloads either mode
- **THEN** the UI reads authoritative session and owned events only, enabling the Explorer form immediately when the current session is authenticated
- **AND** no login, token exchange or FHIR read is initiated merely by viewing the workspace
- **AND** no credentials, run state or resource payload are recovered from browser storage.

### Requirement: Explore prioritizes one understandable next action

Explore SHALL show a clear mission title/objective, prominent authentication status, a concise explanation of what happened and at most one dominant execution action. It SHALL replace the giant default sequence canvas and scattered event cards with the compact reference composition; detailed technical evidence SHALL remain secondary.

#### Scenario: Move from anonymous to resource access

- **GIVEN** an anonymous learner
- **WHEN** Explore is displayed
- **THEN** authentication is the dominant action and the external redirect is explained
- **WHEN** a current session is established
- **THEN** the Resource Explorer form is enabled immediately and its explicit Fetch action becomes dominant
- **AND** no preliminary FHIR read, resource-catalog request or authorization eligibility state is required
- **AND** logout and Inspect remain secondary; Start/Retry does not stay visually dominant after success.

#### Scenario: Loading and failures have honest next actions

- **WHEN** restoration or an execution request is pending
- **THEN** progress describes only known work and conflicting primary actions are unavailable
- **WHEN** a recoverable failure is reported
- **THEN** the UI explains its safe known outcome and offers a deliberate applicable retry
- **AND** no automatic retry or invented successful network step is presented.

### Requirement: Authentication and run states remain distinct

Explore SHALL represent anonymous, loading, authenticated, expired, failed and logged-out states from authoritative data. Retained authentication, current-attempt outcome, resource permission and evidence completeness SHALL remain distinct. A stale asynchronous result SHALL NOT restore ended authentication or cleared resource data.

#### Scenario: Cover all required states

- **GIVEN** independent scenarios for anonymous/no run, restoring/loading, authenticated, expired, failed/provider-denied and logged-out states
- **WHEN** each is rendered
- **THEN** visible status, concise explanation and next-action availability agree with the authoritative state
- **AND** a local logout is not described as provider-wide logout or bearer revocation
- **AND** expired/logged-out users have no usable Resource Explorer even if safe history remains.

#### Scenario: A later attempt fails while an earlier session remains

- **GIVEN** retained authentication and a newer pending or failed attempt
- **WHEN** the current run is displayed
- **THEN** the newer run is not labeled successful merely because the earlier session exists
- **AND** missing or incomplete observations do not fabricate success or undo an authoritative logout.

### Requirement: Three stages explain the OAuth mission truthfully

The OAuth mission SHALL supply Authenticate, Validate tokens / establish session, and Access protected resources stages. Their outcomes SHALL derive from authoritative session/resource results and available evidence, independently of learning selection and playback. The UI SHALL distinguish the BFF's ID-token validation from HAPI's independent Access Token validation.

#### Scenario: Explain actual progress

- **WHEN** a recorded BFF ID-token validation and session establishment are shown
- **THEN** the session stage describes those outcomes without claiming that every token was validated by the browser or provider internals were observed
- **AND** enabling Explorer from the authenticated session does not mark the resource stage successful or imply HAPI permission
- **AND** resource success requires an actual validated allowed resource response.

#### Scenario: Navigate learning without executing

- **WHEN** the learner selects a stage, checkpoint, actor or playback frame
- **THEN** only the explanation/selection changes
- **AND** authentication, authorization, run status and resource execution remain unchanged.

### Requirement: Inspect presents one selected event in three coordinated columns

Inspect SHALL place a compact ordered event timeline on the left, selected-event explanation and expandable safe details in the center, and contextual metadata on the right. It SHALL expose available actor, observer, timestamp, channel and outcome, with filtering and previous/next navigation over the displayed events.

#### Scenario: Select, filter and traverse events

- **GIVEN** a valid owned event document
- **WHEN** the learner filters by actor/channel/outcome, selects an event or uses previous/next
- **THEN** original event identities and sequence are preserved and the central/right views agree with the active event
- **AND** a filtered-out selection is explicitly identified or moved, never silently paired with another event's details
- **AND** filtered position/count comes from the real data, not an illustrated total.

#### Scenario: Explain missing metadata

- **WHEN** a safe DTO lacks a username, claims, duration, token status or other illustrated field
- **THEN** that field is omitted or marked unavailable
- **AND** no new sensitive wire field, raw request/response section or unsupported history selector is introduced to fill the layout.

### Requirement: Inspection preserves evidence provenance and confidentiality

Inspect SHALL render only validated versioned event evidence, distinguish actual observer from explicit resource-server reporter, and label explanations separately. Unsupported or unsafe evidence SHALL fail closed with no raw fallback. Tokens, codes, state/nonce, verifiers, secrets, cookies, sensitive headers and raw callback URLs SHALL NOT appear in learning views or routine logs.

#### Scenario: Distinguish BFF observation from HAPI report

- **GIVEN** a resource response observed by `auth-client`
- **WHEN** it is inspected
- **THEN** the observer/time remain the BFF's and a HAPI decision is attributed only to an available validated `res-server` report
- **AND** absent/conflicting reports have no invented reason or internal check list
- **AND** a BFF-local rejection is not presented as a HAPI denial.

#### Scenario: Preserve front-channel and actor-local semantics

- **WHEN** a callback or token-validation event is selected
- **THEN** callback transport is Browser→BFF and BFF-local validation has no network arrow
- **AND** Keycloak password/PKCE internals remain explained/not observable, with no invented observer, timestamp or success event.

#### Scenario: Reject unsupported or unsafe documents

- **WHEN** an event document has an unsupported version/kind, unsafe fields, invalid ownership or inconsistent identities
- **THEN** the UI shows safe unavailable/incomplete information without rendering the rejected document
- **AND** no raw JSON, token decode or generic network interception fallback exists.

### Requirement: Mission isolation and working lifecycle remain compatible

The redesign SHALL preserve existing Code/S256 login, session recovery, ownership, logout/cancellation, bounded history and ePA/PAR behavior. Shared components SHALL accept mission-owned presentation without OAuth-specific shell branches. Fixtures and conceptual ePA SHALL remain visibly separate from live execution.

#### Scenario: Preserve authentication and history regressions

- **WHEN** login/callback/reload/BFCache, expiry, local logout, late completion and exhausted trace capacity are exercised
- **THEN** clean callback return, server-held tokens, context rotation and cleanup retain their current security behavior
- **AND** another browser or a run ID alone cannot inspect the run
- **AND** owned post-logout history remains bounded and cannot authorize resources.

#### Scenario: Preserve fixtures and ePA

- **WHEN** the OAuth fixture view or conceptual ePA route is opened
- **THEN** their preview/concept status is explicit and no OAuth resource/login operation is silently offered or performed
- **AND** illustrative events never merge into live history
- **AND** real standard Code/S256 and existing ePA required-PAR/browser checks continue to pass without provider-policy changes.

### Requirement: German-first localization survives presentation changes

All new user-facing text and accessible names SHALL have matching German/English resources. German SHALL remain the default/fallback. Switching language SHALL translate presentation without changing mission/run/event identity, filters, playback position, selector values or session state; protocol literals SHALL remain unchanged.

#### Scenario: Switch languages through the workflow

- **WHEN** a learner changes DE/EN in Explore, Inspect, playback or Resource Explorer
- **THEN** the active screen/selection/result stays intact, document language and accessible names update, and no execution request occurs
- **AND** missing keys fail the localization checks; only explicit locale preference is stored.

### Requirement: Responsive and accessible controls preserve the experience

All views SHALL support keyboard operation, visible focus, semantic status, reduced motion, WCAG 2.2 AA contrast and native 100%/200% zoom. Essential content SHALL reflow at 390/320 CSS px without page-level horizontal scrolling; bounded technical code can scroll locally. Accessibility SHALL NOT depend on animation or color alone.

#### Scenario: Verify desktop mobile and native zoom

- **WHEN** all four views are tested in both languages at their reference dimensions and 1366/1024/390/320 CSS px, including actual desktop page zoom 100% and 200%
- **THEN** actions, navigation, selected event and summaries remain readable and reachable without clipped controls or page overflow
- **AND** Inspect stacks timeline/detail/metadata and the resource form reflows accessibly
- **AND** normal text contrast is at least 4.5:1, essential controls/focus at least 3:1, and targets at least 24×24 CSS px.

#### Scenario: Keyboard announcements and verification honesty

- **WHEN** keyboard/reduced-motion users navigate modes, expandable evidence, resource states and recovery
- **THEN** names, focus, selection and concise loading/result announcements remain perceivable, with equivalent static explanations
- **AND** automated accessibility and manual semantics/focus evidence are recorded
- **AND** unavailable native zoom testing remains explicitly unverified rather than substituted with viewport/device scaling.
