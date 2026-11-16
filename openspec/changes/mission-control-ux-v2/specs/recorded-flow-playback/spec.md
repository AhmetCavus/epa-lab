# Recorded Flow Playback

## Purpose

Explain a real mission run through compact, accessible actor transitions reconstructed from its recorded evidence, without treating presentation animation as execution or inventing external provider observations.

## ADDED Requirements

### Requirement: Playback matches the compact approved flow composition

Playback SHALL follow `docs/design/mission-control-v2/03-animated-flow.png` within the navy identity of `00-current-navy-baseline.png` in the same directory. It SHALL present Browser, BFF, one grouped Keycloak deployment and Resource Server with one highlighted step, a progress/timeline indicator, contextual explanation and accessible transport controls.

#### Scenario: Compare the rendered flow view

- **WHEN** the playback view is captured at 1672×941 and reviewed beside the approved flow image and navy baseline
- **THEN** actor-card proportions, highlight, bounded flow panel, progress rail, explanatory card, overview and controls closely match the reference composition
- **AND** the four deployed participants are not mislabeled as separate repeated Browser/BFF/AS/IdP servers
- **AND** actual event content replaces illustrative protocol inaccuracies.

### Requirement: Observed playback frames come from existing recorded events

The observed playback sequence SHALL use only the validated owned run's recorded event identities and original sequence. It SHALL NOT create missing events, timestamps or outcomes, reorder by timestamp, or mix fixture explanations into live observations. Presentation timing SHALL be distinguished from measured protocol duration.

#### Scenario: Reconstruct a successful or failed run

- **GIVEN** an ordered validated event document for an owned run
- **WHEN** its playback is opened
- **THEN** each observed frame references an existing event ID and the same sequence, observer, time and outcome
- **AND** a failed run stops at its actual last available observation without completing an ideal success path
- **AND** stage/animation timing does not rewrite evidence or current authentication status.

#### Scenario: Handle empty incomplete expired or unsupported evidence

- **WHEN** events are empty, unavailable, expired, unsupported or marked incomplete
- **THEN** the view provides an explicit empty/unavailable/gap state and cannot play nonexistent frames
- **AND** available valid frames remain honestly labeled where permitted
- **AND** no fixture backfill, fabricated completion or unauthorized history retrieval is used.

### Requirement: Playback controls are presentation-only

Play, pause, previous, next and replay SHALL select or advance existing frames without initiating login, token exchange, FHIR access or logout. End-of-run SHALL pause. Replacing the run or leaving/unmounting playback SHALL cancel pending presentation timers and prevent stale selection updates.

#### Scenario: Operate all controls

- **GIVEN** a valid multi-event run and execution-request counters
- **WHEN** the learner plays, pauses, moves previous/next and replays
- **THEN** only frame/selection/progress changes, pause stops advancement, replay returns to the first available frame and the last frame pauses
- **AND** login/resource/logout counters do not increase and no token operation is initiated.

#### Scenario: Switch run or leave while playing

- **WHEN** another eligible run replaces the current run, evidence disappears or the learner leaves the playback panel
- **THEN** pending timers are cancelled and no late frame from the prior run is selected
- **AND** local sign-out is not reversed by a presentation update.

### Requirement: Actor transitions preserve actual channels and provenance

Playback SHALL draw arrows only for recorded source/target communications, distinguish front/back channel, and represent actor-local observations without transport arrows. The actual observer and any explicit reporter SHALL remain separate; provider-internal explanations SHALL be labeled not observable rather than recorded success.

#### Scenario: Explain a callback and a local token check

- **WHEN** the callback-accepted event is selected
- **THEN** the transition represents Browser→BFF and describes the BFF's accepted callback
- **WHEN** the BFF's ID-token validation is selected
- **THEN** the BFF is highlighted without a fictitious network hop
- **AND** neither frame claims that the SPA observed Keycloak's password or internal PKCE checks.

#### Scenario: Explain redirect and resource response evidence

- **WHEN** the BFF-issued redirect or a received resource response is selected
- **THEN** the redirect is the BFF's observed instruction, not proof of provider receipt
- **AND** the resource response retains BFF observation/time, with a HAPI decision only when its validated report exists
- **AND** a missing report leaves its reason unavailable.

### Requirement: External-login playback is reconstructed after navigation

The UI SHALL explain that real authentication leaves the SPA for Keycloak. After clean callback return, playback SHALL be reconstructed from restored server-owned evidence and start paused. It SHALL NOT claim continuous browser observation of the external login or offer controls that pause or step the actual OAuth transaction.

#### Scenario: Return from Keycloak

- **WHEN** a real top-level login redirects away and returns through the existing callback
- **THEN** session and owned event retrieval reconstruct the explanation for that run
- **AND** the view identifies playback as a reconstruction and remains paused until requested
- **AND** no success comes from a preset timer or replaying the consumed callback.

### Requirement: Playback is keyboard-accessible and respects reduced motion

Transport controls SHALL have accessible names, visible focus, keyboard activation and perceivable selected/progress states. Reduced motion SHALL disable moving transitions, pulses and automatic animation advancement while preserving instant manual step navigation and explanations. Meaning SHALL NOT depend on motion or color alone.

#### Scenario: Use playback without animation

- **GIVEN** `prefers-reduced-motion: reduce`
- **WHEN** the learner opens playback and uses previous, next or replay with the keyboard
- **THEN** each selected step appears immediately with the same explanation, actor identity and text progress
- **AND** decorative motion and timer-driven animation do not occur.

#### Scenario: Preserve selection during localization and reflow

- **WHEN** language changes or the view reflows at narrow widths/native browser zoom
- **THEN** the same run/event and playing/paused intent remain unless reduced motion requires pausing
- **AND** control names and explanation translate, essential controls remain reachable and the page has no unnecessary horizontal scrolling.
