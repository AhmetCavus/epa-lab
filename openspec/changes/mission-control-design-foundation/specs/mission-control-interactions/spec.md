# Mission Control Interactions — Specification Delta

**Status:** IMPLEMENTED — all original and 2026-10-18 frontend refinement requirements have implementation and check evidence in `../../verification.md`. Final owner visual review remains separate; no real protocol execution is authorized.

## Purpose

Provide a reusable Mission Control learning interface that presents mission-defined participants, interactions and explanations with clear selection, readable sequence geometry and honest evidence classifications.

## ADDED Requirements

### Requirement: Selecting a fixture focuses a meaningful protocol path

The workspace SHALL emphasize a selected mission-defined directed interaction and display its channel and provenance.

#### Scenario: Select a directed sample

- **GIVEN** a fixture defines a directed message between source and destination actors
- **WHEN** the learner loads samples and selects that message in the timeline
- **THEN** the canvas highlights its source, destination, and direction
- **AND** its channel is labeled without relying on color alone
- **AND** the inspector shows the same message's meaning and provenance.

### Requirement: Timeline, canvas and inspector stay synchronized

The workspace SHALL maintain a coherent single active selection.

#### Scenario: Switch selected sample

- **GIVEN** a mission has multiple selectable samples
- **WHEN** the learner chooses a different sample with mouse or keyboard
- **THEN** the timeline selection, canvas focus, and inspector describe the same sample
- **AND** the previous item is no longer presented as selected.

### Requirement: Provider-internal steps do not masquerade as network events

The workspace SHALL distinguish unobserved provider-internal checks from communication events.

#### Scenario: Inspect an unobservable PKCE check

- **GIVEN** a sample describes a provider-internal check which the platform did not instrument
- **WHEN** the learner selects it
- **THEN** the logical provider role is highlighted with an internal annotation
- **AND** no fictitious network request, timestamp or internal validation trace is shown
- **AND** the inspector labels the step `Not observable`.

### Requirement: Learning navigation does not imply live execution

The workspace SHALL clearly distinguish fixture learning controls from operations that execute live protocol requests.

#### Scenario: Use the fixture-only controls

- **GIVEN** no live protocol run has occurred
- **WHEN** the learner loads fixtures, selects checkpoints, replays an explanation, or resets the view
- **THEN** the workspace remains labeled as non-live
- **AND** it neither triggers nor implies a real authentication session
- **AND** fixture samples remain visibly distinct from observed events.

### Requirement: The shell is mission-agnostic

Shared Mission Control components SHALL render mission-defined content without protocol-specific conditions.

#### Scenario: Compare OAuth and ePA fixtures

- **GIVEN** OAuth and conceptual ePA fixtures with different actors and steps
- **WHEN** the learner opens each fixture in turn
- **THEN** the same shell renders actors, groupings, interactions, explanations and checkpoints
- **AND** generic shell components do not branch on a specific mission ID or protocol name
- **AND** the conceptual ePA fixture is never labeled a real integration.

### Requirement: Visual hierarchy and readability support learning

The workspace SHALL keep its essential controls, labels, and selected messages readable and operable.

#### Scenario: Use a narrow browser or increased zoom

- **GIVEN** a supported narrow viewport or browser zoom level
- **WHEN** the learner opens the workspace and selects an interaction
- **THEN** the selected state and explanatory content remain perceivable
- **AND** essential controls and evidence are not clipped
- **AND** communication channel semantics are conveyed by more than color alone.

### Requirement: Approved visual references guide implementation

The implementation SHALL remain traceable to the repository's visual design references while preserving functional correctness.

#### Scenario: Compare completed UX with design images

- **GIVEN** `docs/design/assets/catalog-concept.png` and `workspace-concept.png`
- **WHEN** the UI refinement is verified
- **THEN** the key layout, navigation, visual hierarchy and styling are recognizably aligned
- **AND** deliberate departures for usability, security or accessibility are briefly documented.

### Requirement: Catalog and workspace express the reference visual hierarchy

The catalog and workspace SHALL follow the original references' dark navy surfaces, restrained cyan/blue emphasis, technical visual identity and clear hierarchy. Shared spacing, typography and component states SHALL be consistent, with the protocol canvas the workspace's primary visual surface.

#### Scenario: Review the refined catalog

- **GIVEN** the existing two mission previews and both reference PNGs
- **WHEN** the catalog is rendered at desktop and narrow widths
- **THEN** the hero, distinct mission artwork, titles, outcomes, availability and actions establish a clear reading order
- **AND** card content and actions align consistently without repetitive nested bordered boxes
- **AND** current preview navigation and honest Fixture preview / Planned status remain functional
- **AND** decoration neither obscures content nor implies unavailable functionality.

#### Scenario: Review the refined workspace

- **GIVEN** an empty or loaded workspace at a 1366 CSS pixel desktop width
- **WHEN** the learner inspects the layout
- **THEN** the canvas is wider than either side panel and has the strongest interaction emphasis
- **AND** Mission Panel, Canvas and Inspector have aligned panel boundaries, consistent spacing and quieter supporting surfaces
- **AND** the existing navigation, controls and timeline remain available.

### Requirement: Essential typography remains readable

The UI SHALL keep essential text legible without hover-only disclosure or truncation. At default browser settings, prose and controls SHALL be at least 14 CSS px, participant/message labels at least 13px and secondary metadata at least 12px. Map scaling SHALL preserve these displayed minimums; prose line height SHALL be at least 1.4.

#### Scenario: Read long labels and explanations

- **GIVEN** participant/message labels and explanations that wrap onto multiple lines
- **WHEN** the learner opens the catalog or workspace at a supported width
- **THEN** full essential text wraps within its allocated area and remains readable
- **AND** consistent heading, prose and metadata styles distinguish their importance
- **AND** Fit and zoom-out stop before essential diagram text becomes smaller than the minimum, retaining horizontal scrolling as needed.

### Requirement: Participants lifelines and message endpoints align

The sequence diagram SHALL display aligned participants with a corresponding vertical lifeline for each. Directional messages SHALL connect their declared source and target lifelines. Mission-defined deployment groups SHALL preserve separate logical participants without hardcoded protocol actors or message types.

#### Scenario: Follow messages in either direction

- **GIVEN** mission-defined left-to-right and right-to-left communications with uneven participant groups
- **WHEN** their sequence diagram is rendered at map zoom 100%
- **THEN** each lifeline is aligned beneath its participant center
- **AND** each message starts at its source lifeline and its directional arrowhead terminates at its target lifeline, within 2 CSS px of alignment
- **AND** all participants remain aligned with their lifelines while scrolling horizontally.

#### Scenario: Inspect separate roles in one deployment

- **GIVEN** the OAuth fixture's Keycloak Authorization Server and Identity Provider
- **WHEN** the participant header and lifelines are rendered
- **THEN** both logical roles have separate participant positions and lifelines under one Keycloak deployment heading
- **AND** internal checks remain actor-local annotations without an observed HTTP arrow or fabricated cross-service request.

### Requirement: Sequence messages have collision-free vertical space

The diagram SHALL allocate sufficient vertical space for every message label, channel/evidence text and arrow or internal annotation. Labels SHALL never overlap another label, a message arrow or a participant header, including when text wraps, the viewport narrows or browser zoom increases.

#### Scenario: Render wrapped message rows

- **GIVEN** adjacent messages with long multi-line titles and channel/evidence labels
- **WHEN** the diagram is rendered or its text layout changes
- **THEN** row spacing accommodates all text and a separate path/annotation area
- **AND** labels, arrows and participant headers do not overlap or clip essential content
- **AND** selecting a row does not collapse neighboring rows or hide their messages.

### Requirement: Sequence and timeline preserve supplied explanation order

The diagram, timeline and replay SHALL preserve mission-supplied interaction order. Fixture ordering SHALL be labeled explanation order and SHALL NOT imply recorded chronology, observed timestamps or authentication outcomes.

#### Scenario: Select and replay fixture samples

- **GIVEN** loaded fixture communications and a provider-internal explanation in a supplied order
- **WHEN** the learner selects messages across channels and replays the explanation
- **THEN** the diagram and timeline retain the supplied order rather than regrouping by actor, channel or selection
- **AND** the UI continues to identify samples as examples, with no actual observer or observed timestamp.

### Requirement: Responsive layouts preserve usable diagram access

The UI SHALL reflow supporting panels while retaining access to the canvas, Inspector, timeline and essential controls at narrow widths and actual 200% browser zoom. The diagram SHALL scroll horizontally when required instead of compressing text below readable minimums; the surrounding page SHALL NOT require horizontal scrolling.

#### Scenario: Navigate a narrow or zoomed workspace

- **GIVEN** a 320 or 390 CSS pixel narrow viewport, or a desktop browser at actual 200% page zoom
- **WHEN** the learner loads samples, scrolls the diagram and selects a communication or internal annotation
- **THEN** content and controls remain reachable without overlap or clipping
- **AND** the learner can reach all participants and selected paths through diagram-local scrolling
- **AND** the Inspector, fixture/evidence labels and structured text alternative remain available
- **AND** map Fit or Reset view does not undo or compensate for the browser's page zoom.

### Requirement: Interaction feedback is synchronized and accessible

The UI SHALL distinguish hover, keyboard focus, selection and disabled states. Event selection SHALL synchronize involved actors, path, timeline and Inspector, including channel, educational explanation and evidence classification. Channels and selection SHALL use text or shape in addition to color; existing keyboard and reduced-motion behavior SHALL be preserved.

#### Scenario: Select through the diagram and timeline

- **GIVEN** loaded fixture samples and a prior active selection
- **WHEN** the learner selects another message through either surface with pointer or keyboard
- **THEN** only that interaction is active, its involved actors/path are obvious and the Inspector shows its matching explanation, channel and evidence
- **AND** front-channel, back-channel and internal treatments remain distinguishable without color
- **AND** internal samples remain Not observable, conceptual examples never become Observed, and fixture controls never initiate authentication.

#### Scenario: Use keyboard and accessible presentation

- **GIVEN** keyboard navigation or reduced motion is enabled
- **WHEN** the learner traverses catalog links, actors, messages, timeline and controls
- **THEN** native actions, meaningful accessible names and current/pressed states remain available with visible, unobscured focus
- **AND** essential pointer targets are at least 24 by 24 CSS px
- **AND** ordinary text has at least 4.5:1 contrast and essential controls/focus indicators at least 3:1 contrast against adjacent surfaces
- **AND** decorative artwork is excluded from the accessibility tree and reduced motion is respected.

### Requirement: Visual acceptance uses rendered browser evidence

Verification SHALL compare actual rendered screenshots with both reference PNGs and retain prior verification history. It SHALL record visual findings, screenshot paths, browser/version, dimensions, actual zoom settings, build/test/validation results and limitations. Viewport resizing, device scaling and map zoom SHALL NOT be reported as actual browser zoom verification.

#### Scenario: Review the refinement evidence

- **GIVEN** the original verification report and the completed refinement
- **WHEN** visual acceptance is assessed
- **THEN** screenshots cover Catalog, empty Workspace, loaded samples, selected communication, internal annotation, conceptual ePA and narrow layouts
- **AND** composition, typography, surfaces, spacing/alignment, correct endpoints, label collisions and selected-state emphasis each have a recorded comparison result against the reference direction
- **AND** before/after captures are provided where feasible, with missing baseline captures and deliberate departures explicitly documented
- **AND** existing functional/accessibility checks, focused rendering checks and strict OpenSpec validation have recorded results; failures remain visible rather than being hidden by a general visual pass.

#### Scenario: Verify actual desktop browser zoom

- **GIVEN** a supported desktop browser with the same window at page zoom 100% and 200%
- **WHEN** Catalog and both workspaces are captured, including loaded and selected communication/internal samples where defined
- **THEN** the recorded zoom setting and screenshots demonstrate accessible text, aligned panels, usable focus and no overlapping or clipped essential content
- **AND** horizontal scrolling is confined to the diagram when necessary.

#### Scenario: Actual browser zoom cannot be exercised

- **GIVEN** actual browser page zoom testing is unavailable
- **WHEN** the refinement verification report is written
- **THEN** actual 100%/200% zoom remains explicitly Not verified with an outstanding manual walkthrough and the limitation's reason
- **AND** existing warning W1 is not closed using viewport or device-scale tests
- **AND** the report does not claim complete actual-zoom verification or erase prior evidence.
