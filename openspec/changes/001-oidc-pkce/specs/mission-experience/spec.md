# Capability Spec — Mission Experience

**Status:** DRAFT — review the UX before approval.

## Authorized UI Slice 001 scenarios

These fixture-only scenarios are authorized by the owner's Slice 001 instruction; the real-flow scenarios below remain DRAFT.

## ADDED Requirements

### Requirement: Fixture catalog and routing

The fixture catalog SHALL offer honest availability and working preview navigation without real execution.

#### Scenario: Catalog and routing

**GIVEN** the fixture-only catalog at `/missions`  
**WHEN** a visitor uses either preview link with a keyboard  
**THEN** the corresponding `/missions/:missionId/workspace` opens  
**AND** OAuth is labeled Fixture preview, ePA is labeled Planned, and neither offers real execution  
**AND** a direct workspace URL, browser back/forward and unknown mission route have useful outcomes.

### Requirement: Independent learning and fixture selection

Learning selection SHALL remain independent of event loading and execution in both fixture workspaces.

#### Scenario: Selecting learning content

**GIVEN** either workspace has mission-owned actors and checkpoints  
**WHEN** the visitor selects a checkpoint or actor  
**THEN** the shell shows its explanation without creating events or making network operations  
**AND** the same controls and copy work for both missions without mission-ID branches.

### Requirement: Honest samples and safe inspection

Fixture samples SHALL identify their explanatory provenance and expose only safe example details.

#### Scenario: Loading and inspecting samples

**GIVEN** the OAuth preview initially has an empty timeline  
**WHEN** the visitor explicitly loads fixture samples and selects a sample  
**THEN** its actors are highlighted and its inspector shows fixture provenance, no actual observer or observed timestamp, typed allowlisted example details, and separate interpretation  
**AND** provider-internal behavior is Not observable  
**AND** Replay explanation and Reset view change only selection and preserve loaded samples  
**AND** the ePA preview offers no operational results or simulated telemetry.

### Requirement: Responsive accessible interaction

The fixture UI SHALL support keyboard navigation, visible focus, text alternatives and responsive layout.

#### Scenario: Navigating at different browser widths

**GIVEN** a desktop or narrow browser viewport  
**WHEN** the visitor navigates the catalog, checkpoints, actor map, timeline and inspector  
**THEN** controls have visible focus and accessible names, selection is expressed in text, the actor map has a text alternative, zoom/fit works, and the inspector stacks below the canvas on narrower viewports.

### Requirement: A visitor can select a real available mission

The future real-execution catalog SHALL expose Start only for an actually available mission. This requirement remains DRAFT.

#### Scenario: Selecting an available real mission

**GIVEN** the catalog contains an available OAuth mission and a planned ePA mission  
**WHEN** the visitor opens `/missions`  
**THEN** the catalog displays outcome, topics and actual availability for each mission  
**AND** only the available mission exposes a working Start action  
**AND** keyboard navigation reaches that action.

### Requirement: The workspace is not OAuth-specific

The workspace SHALL render different mission definitions without protocol-specific shell conditionals.

#### Scenario: Rendering different design fixtures

**GIVEN** two design fixtures with different actors, groups, step names and actions  
**WHEN** either fixture is selected  
**THEN** the generic shell renders the appropriate mission content without hard-coded OAuth/ePA conditionals  
**AND** a conceptual fixture cannot trigger a real backend mission.

### Requirement: Evidence is not confused with explanation

The future real-event inspector SHALL separate observations from interpretation and identify actual observers. Real telemetry remains DRAFT.

#### Scenario: Inspecting an observed event

**GIVEN** a mission has observed events and pedagogical explanation  
**WHEN** the learner selects a timeline event  
**THEN** the inspector identifies the actual observer, event status and allowlisted safe evidence  
**AND** mission explanations are visually distinct from observed evidence  
**AND** the UI never claims to observe provider-internal events that were not instrumented.

### Requirement: Browser redirects do not fake a stepped debugger

The future external-login workspace SHALL explain normal browser navigation without fabricating progress. Real login remains DRAFT.

#### Scenario: Leaving for and returning from a provider

**GIVEN** the visitor initiates a browser-based external login  
**WHEN** the browser leaves the workspace for Keycloak  
**THEN** the mission explains the redirect and preserves safe run correlation  
**AND** it does not display fabricated network event progress  
**AND** on return the visitor can inspect genuine recorded events.

### Requirement: States have useful recovery

The future execution workspace SHALL distinguish recovery commands and show safe actual outcomes. Real execution remains DRAFT.

#### Scenario: Recovering from an unsuccessful run

**GIVEN** a cancelled, failed, expired or denied mission run  
**WHEN** the visitor returns to Mission Control  
**THEN** the workspace displays an accurate, non-sensitive outcome and available recovery action  
**AND** `Retry flow`, `Replay explanation`, `Reset view` and `Sign out` never silently substitute for one another.
