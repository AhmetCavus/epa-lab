# Mission Control Workspace — UX Design

**Status:** DRAFT FOR REVIEW · **Screen:** `/missions/:missionId/workspace`

## Goal

Localization follows Accepted ADR-0004. The global Deutsch/English control updates all workspace copy and accessible text without resetting the mission, retained checkpoint, loaded samples, inspection selection or map scale. Technical evidence values remain literal; translated annotations preserve fixture/conceptual/not-observable provenance. Longer labels wrap with existing responsive layout and diagram-local scrolling.

**Authorized UI Slice 001:** Both workspaces begin with an empty timeline. OAuth can explicitly load labeled fixture samples; they have no actual observer, timestamps, authentication result or network execution. ePA is a conceptual actor/checkpoint layout with no operational results. Replay explanation navigates loaded samples; Reset view clears selection and restores canvas scale without deleting samples. No Retry flow or Sign out control is exposed because there is no execution or session.

Let learners execute a mission, understand participating actors, select recorded events, and inspect **safe evidence** and explanatory teaching content. Generic UI must function for OAuth **and** a conceptually different ePA fixture.

## Default desktop information hierarchy

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Back to Missions     {Mission title}       {Run/learning status}      Help           │
├─────────────────────┬─────────────────────────────────┬─────────────────────────────┤
│ MISSION PANEL       │ PROTOCOL CANVAS                 │ EVENT INSPECTOR             │
│ Objective           │ Mission-defined actors         │ What happened               │
│ Learning checkpoints│ Request/response links         │ Observed safe evidence      │
│ Contextual action   │ Front vs back channel          │ Explanation                 │
│                     │ Logical roles, grouped systems │ Roles / channel / recovery  │
├─────────────────────┴─────────────────────────────────┴─────────────────────────────┤
│ EVENT TIMELINE (observed events only; order, status, event selection, timestamps)    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

On narrower browser windows, the inspector moves below the canvas; no separate mobile app is planned. Canvas must remain usable via keyboard and a text alternative.

## Generic shell ownership

### Mission Control design foundation

The owner authorized `mission-control-design-foundation` as a frontend-only refinement. Retain vertical swimlanes and the existing panel structure. After samples load, show all defined communication paths lightly, using source/destination anchors and arrowheads. The selected path, its actors, timeline button and inspector share one interaction identity. Actor selection clears the active interaction; learning checkpoint selection changes context without executing or creating events. The retained learning checkpoint is independent of the active inspection selection.

Internal checks use a distinct actor-local annotation with a **Not observable** label and no network arrow. Channel labels come from mission definitions; solid, dashed and annotation styles accompany text in the legend and structured diagram alternative. The conceptual ePA fixture continues to define no operational interactions or telemetry.

Use readable normal text for selected explanations, inspector content and controls. Essential content remains available through panel stacking, an independently scrollable map, and the structured text alternative at narrow widths or increased browser zoom. Fixture loading is synchronous: empty and loaded states are real; asynchronous loading/error and live outcomes are not fabricated.

The 2026-10-18 refinement keeps participant centers, lifelines and arrow endpoints in one scrollable coordinate system. Message labels take their natural wrapped height above a separate arrow/annotation band, preserving explanation order without fixed-height row collisions. Supporting panels are quieter than the canvas, and an active row has a visible Selected badge plus matching actors/path/Inspector. Fit returns to the readable 100% map scale; it stops shrinking essential text and retains horizontal scrolling. Browser page zoom remains independent of map controls. Inspector access and keyboard focus survive panel reflow.

- Routing, title, mission selection, work area, actor and event selection.
- Layout, zoom/fit behavior, visual highlighting and accessibility.
- **Learning progress** (selected checkpoint) vs **run status** (actual auth/API result).
- Event list display, event selection, explanatory panel design, empty/error states.

## Mission-owned content

- Actor identifiers, labels, logical grouping (e.g. Keycloak hosting AS + IdP), role descriptions.
- Learning checkpoints, available actions, explanations, safe evidence definitions.
- Execution adapter behind actions and observable events; BFF integrations are mission-specific.

Do not put OAuth-specific UI copy, `code_verifier` names, or authentication status transitions in generic Workspace components.

## User states / actions

| UI state                      | Presentation                                             | Action                                                  |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| No run                        | Conceptual actor map, timeline empty and labeled         | Start mission-specific action                           |
| Navigating to provider        | Explain redirect before leaving the website              | Browser performs normal redirect; no fake step debugger |
| Returned, pending             | Show only what is actually known                         | Disable conflicting re-entry actions as needed          |
| Authenticated (OAuth example) | Session status and observed event list                   | Fetch synthetic protected resource                      |
| API permitted / denied        | Real result and validated reason when available          | Inspect event / retry when supported                    |
| Failed or cancelled           | Safe error and next recovery option                      | Retry flow creates a **new** transaction                |
| Signed out                    | Local session ended; old run remains inspectable if safe | Start new run                                           |

**Commands must not be conflated:** `Replay explanation` navigates existing recorded events; `Retry flow` creates new network operations; `Reset view` clears UI selection; `Sign out` invalidates the BFF session. Never imply these are synonyms.

## Event inspector: required content order

1. **What happened:** name, timestamp if observed, actual observer.
2. **Safe Evidence:** allowlisted, typed details only. If unavailable, say so plainly.
3. **Why it matters:** educational interpretation, separate from the evidence block.
4. **Actors & channel:** explicit origin/destination; front-channel browser redirect vs backend call.
5. **Failure/recovery** only when applicable.

### Non-negotiable truthfulness

- UI must distinguish **Observed**, **Explained**, and **Not observable** states.
- Do not claim Keycloak’s internal PKCE check was recorded by the BFF. A successful code exchange is an _outcome observed by BFF_, not a provider-internal instrumentation trace.
- The real authorization request leaves the SPA and redirects the browser to Keycloak. No ability to pause/single-step Keycloak is implied.
- No raw password, authorization code, Access/ID/Refresh token, cookie, PKCE verifier, secret or full redirected URL in frontend events or logs.
- AS/IdP may be distinct _logical roles_ inside one **Keycloak** grouping. Do not visually imply two servers are deployed.

## Design validation with two fixtures

The generic Workspace must display both [`fixtures/oauth-oidc.md`](fixtures/oauth-oidc.md) and [`fixtures/epa-concept.md`](fixtures/epa-concept.md) **without changing the shell's hardcoded copy or branching on mission IDs**. The ePA fixture is solely a UX validation tool, not authorization to implement ePA or claim gematik compliance.

## Interactions requiring high-fidelity review

1. Empty canvas versus completed run.
2. Selecting a message highlights its actors and safely populated inspector.
3. Selecting a _learning step_ does not falsely trigger a real network request.
4. Authenticating leaves the app for Keycloak and returns to the same mission run.
5. Error, expired, cancelled, denied, logout and retry states.
6. Keyboard order, focus ring, canvas text alternative, browser zoom and reduced motion.

**Visual reference (embedded):**

![Mission Workspace visual reference](assets/workspace-concept.png)

See [visual-references.md](visual-references.md) for guidance. The illustrative sequence lines are **not** an authoritative protocol trace. “Raw Data” must be renamed **Safe Evidence**.
